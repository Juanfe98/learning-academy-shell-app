import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bootDiagram = String.raw`flowchart TD
  START["src/server.ts<br/>process entrypoint"]
  START --> APP["src/app.ts<br/>build the Koa app"]
  APP --> SM["sourceMapSupport.install()"]
  SM --> CORS["cors()"]
  CORS --> LOG["koa2-winston logger"]
  LOG --> CACHE["cacheControl({ noCache: true })"]
  CACHE --> MIRROR["MirroringCache.init()<br/>(fail-open)"]
  MIRROR --> ROUTES["routes(server)<br/>business middleware + routers"]
  ROUTES --> HEAP["log V8 heap stats<br/>(best effort)"]
  HEAP --> SWAGGER{"isBehindVpn()?"}
  SWAGGER -->|yes| SW["mount /swagger + schema mw"]
  SWAGGER -->|no| DONE["export default server"]
  SW --> DONE`;

const requestPipelineDiagram = String.raw`sequenceDiagram
  participant C as Client
  participant K as Koa middleware chain
  participant RQ as requestHeaders
  participant MID as context middlewares
  participant FX as flexContext middleware
  participant R as Route validation
  participant H as Flex route adapter
  participant S as Service

  C->>K: HTTP request + Disney headers
  K->>K: app middleware: cors, logger, cacheControl
  K->>K: routes() starts with errorHandler + healthCheck
  K->>RQ: parse x-bamtech/x-bamsdk headers
  RQ->>RQ: ctx.state.standardHeaders = { ... }
  RQ->>MID: regionConfiguration + experimentation + requestLogger + sessionAccess + deviceContext
  MID->>MID: set ctx.state.regionConfig, experimentation, sessionAccess, device
  MID->>FX: compose FlexContext
  FX->>FX: ctx.state.flexContext = { standardHeaders, regionConfig, device, sessionAccess, ... }
  FX->>R: match route
  R->>R: validate header/query/params/body (Joi)
  alt validation fails
    R-->>C: errorHandler maps to error response
  else valid
    R->>H: handler(ctx)
    H->>H: read ctx.state.flexContext
    H->>S: buildXScreen({ flexContext, params })
    S-->>H: processed { data, metadata } template or execution result
    H-->>C: ctx.body = result
  end`;

export const toc: TocItem[] = [
  { id: "entrypoint", title: "From Process to App", level: 2 },
  { id: "app-ts", title: "app.ts: Assembling the Koa Server", level: 2 },
  { id: "middleware-order", title: "Middleware Order Is Behavior", level: 3 },
  { id: "flexcontext", title: "FlexContext: The Injected Request World", level: 2 },
  { id: "flexcontext-shape", title: "The Shape of FlexContext", level: 3 },
  { id: "standard-headers", title: "Standard Headers: The Raw Input", level: 2 },
  { id: "route-handler", title: "flexContextRouteHandler & the Route Contract", level: 2 },
  { id: "pipeline", title: "The Full Request Pipeline", level: 2 },
  { id: "why-state", title: "Why Context Lives on ctx.state", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Trace a Request", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ServerAndRequestLifecycle() {
  return (
    <div className="article-content">
      <p>
        Every screen and execution in this service rides the same rails: a Koa middleware chain that
        turns a raw HTTP request full of Disney headers into a rich, typed <code>FlexContext</code>{" "}
        object, which is then handed to a validated route handler and finally to a service. If you
        understand this pipeline once, you understand how <em>every</em> endpoint gets its inputs —
        and you stop guessing where <code>flexContext.regionConfig</code> or the experiment
        assignments came from. This module walks the path from process boot to <code>ctx.body</code>.
      </p>

      <h2 id="entrypoint">From Process to App</h2>
      <p>
        There are two files at the root of the runtime: <code>src/server.ts</code> starts the
        process and begins listening; <code>src/app.ts</code> builds and configures the Koa
        application. Keeping &quot;how we listen&quot; separate from &quot;how we handle requests&quot;
        means tests can import the fully-wired <code>app</code> without binding a port.
      </p>
      <MermaidDiagram
        chart={bootDiagram}
        title="Boot sequence: server.ts → app.ts"
        caption="app.ts wires middleware in order, mounts routes, and conditionally exposes Swagger only when behind the VPN."
        minHeight={460}
      />

      <h2 id="app-ts">app.ts: Assembling the Koa Server</h2>
      <p>
        The real <code>app.ts</code> is refreshingly linear. It constructs a <code>Koa</code>{" "}
        instance and registers middleware in a deliberate order, then mounts the routers.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/app.ts (excerpt)"
        code={`const server = new Koa();

server.use(
  cors({
    credentials: true,
    origin(ctx) {
      return ctx.get('Origin') || '*';
    },
  })
);

const logger = getLogger('root', { level: config.logLevel });
server.use(defaultKoaLogger({ logger }));

// Cache control defaults — responses are no-cache unless a route opts in.
server.use(cacheControl({ noCache: true }));

// Dedicated mirroring Redis connection. Fail-open: a boot-time throw here
// must never take down the container, so it's wrapped in try/catch.
try {
  MirroringCache.init();
} catch (error) {
  logger.error('[mirroring] init failed; continuing without mirroring', error);
}

// Mount every router.
routes(server);`}
      />
      <p>
        Two design decisions worth internalizing. First, <strong>cache control defaults to
        no-cache</strong> globally; a route must deliberately opt into caching. Second,{" "}
        <strong>mirroring init is fail-open</strong> — it runs at boot, outside any request-scoped
        error handler, so it&apos;s defensively wrapped. This is the codebase&apos;s general posture:
        infrastructure concerns must never crash request handling.
      </p>

      <h3 id="middleware-order">Middleware Order Is Behavior</h3>
      <p>
        Koa middleware runs top-to-bottom on the way in and bottom-to-top on the way out (the
        &quot;onion&quot; model). Order is not cosmetic — it is behavior. There are two important
        registration levels: <code>app.ts</code> installs app-wide concerns (CORS, access logging,
        cache-control, mirroring init, then <code>routes(server)</code>), and{" "}
        <code>src/routes/index.ts</code> installs business middleware. Inside <code>routes()</code>,
        the error handler is first so it wraps everything below it; health checks short-circuit before
        flag/experiment work; <code>requestHeaders</code> must run before region/experiment/session
        middleware; and <code>flexContextHandler</code> must run before any route reads
        <code>ctx.state.flexContext</code>. Swagger is mounted after routes and only when{" "}
        <code>isBehindVpn()</code>, so internal docs never leak publicly.
      </p>

      <h2 id="flexcontext">FlexContext: The Injected Request World</h2>
      <p>
        <code>FlexContext</code> is the single most important object in this service. It is the
        typed, pre-digested view of everything the request tells us about <em>who</em> is asking,{" "}
        <em>from where</em>, <em>on what device</em>, and <em>in which experiments</em>. A dedicated
        middleware (<code>src/middlewares/flexContext.ts</code>) builds it from the raw headers and
        stashes it on <code>ctx.state.flexContext</code>. More precisely, earlier middlewares set{" "}
        <code>ctx.state.standardHeaders</code>, <code>regionConfig</code>,{" "}
        <code>experimentation</code>, <code>sessionAccess</code>, and <code>device</code>; then{" "}
        <code>flexContext.ts</code> composes those fields into the final object. Every service
        receives it.
      </p>

      <h3 id="flexcontext-shape">The Shape of FlexContext</h3>
      <CodeBlock
        lang="typescript"
        filename="src/middlewares/models/FlexContext.ts"
        code={`export type FlexContext = {
  standardHeaders: StandardHeaders;      // parsed Disney unified headers
  regionConfig: RegionConfiguration;     // region/experience rules
  device: DeviceContext;                 // device family/platform capabilities
  sessionAccess: SessionAccess;          // session/auth info
  isAuthenticated: boolean;              // convenience flag
  experimentation?: WeaponXExperiment;   // experiment assignments
  storeFrontCountry?: string;            // resolved storefront country
};`}
      />
      <ArticleTable
        caption="What each FlexContext field gives you and why a service reaches for it."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>What it carries</th>
              <th>Typical use in a service</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>standardHeaders</code></td>
              <td>Parsed Disney headers (accountId, partner, location…)</td>
              <td>Passed to backend clients like GLO for the fetch.</td>
            </tr>
            <tr>
              <td><code>regionConfig</code></td>
              <td>Region + experience configuration</td>
              <td>Decide region-specific copy, pricing, eligibility.</td>
            </tr>
            <tr>
              <td><code>device</code></td>
              <td>Device family/platform/capabilities</td>
              <td>Tailor UI capabilities per device.</td>
            </tr>
            <tr>
              <td><code>sessionAccess</code> / <code>isAuthenticated</code></td>
              <td>Session and auth state</td>
              <td>Branch authenticated vs unauthenticated screens.</td>
            </tr>
            <tr>
              <td><code>experimentation</code></td>
              <td>WeaponX experiment assignments</td>
              <td>Select a treatment / variant of a screen.</td>
            </tr>
            <tr>
              <td><code>storeFrontCountry</code></td>
              <td>Resolved storefront country</td>
              <td>Currency, tax, and offer scoping.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="standard-headers">Standard Headers: The Raw Input</h2>
      <p>
        <code>FlexContext</code> is built from <strong>Disney Unified Headers</strong>, defined by
        the Edge API and modeled in <code>src/middlewares/models/StandardHeaders.ts</code>. These{" "}
        <code>x-bamtech-*</code> / <code>x-bamsdk-*</code> headers are the ground truth of a request.
        You rarely read them raw in a service — you read the parsed <code>standardHeaders</code> off{" "}
        <code>FlexContext</code> — but knowing they exist explains where every field originates.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/middlewares/models/StandardHeaders.ts (excerpt)"
        code={`export interface StandardHeaders {
  accountId?: string;               // 'x-bamtech-account-id'
  accountIsTest: boolean;           // 'x-bamtech-is-test'
  partner?: Partner;                // 'x-bamtech-partner'  (disney/hulu/espn)
  locationCountryCode?: string;     // 'x-bamtech-location-country-code'
  devicePlatform?: string;          // 'x-bamtech-device-platform'
  identityId?: string;              // 'x-bamtech-identity-id'
  weaponxAssignmentsBase64?: string;// 'x-bamtech-weaponx-assignments'
  experimentation?: WeaponXExperiment;
  // ...many more
}`}
      />
      <p>
        Note <code>weaponxAssignmentsBase64</code>: experiment assignments arrive base64-encoded in a
        header. That is the seam we&apos;ll pull on in the experimentation module — for now, notice
        that experiment state is <em>request-scoped input</em>, not something the service invents.
      </p>

      <h2 id="route-handler">flexContextRouteHandler &amp; the Route Contract</h2>
      <p>
        Routes should not implement business logic or manually reconstruct request context. Older
        routes commonly use <code>flexContextRouteHandler</code>, while newer/converted screen routes
        often use <code>flexRouteMiddleware</code>. Both adapters read the already-built context off{" "}
        <code>ctx.state</code> and pass it as a clean argument to the handler;{" "}
        <code>flexRouteMiddleware</code> additionally centralizes Joi validation for Koa Router
        routes.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/routes/screens/common.ts"
        code={`export function flexContextRouteHandler<TBody = unknown>(
  routeHandler: (
    ctx: TypedContext<TBody>,
    flexContext: FlexContext,
    next?: Next
  ) => Promise<void>
): Handler {
  return async (ctx: Context, next: Next) => {
    const { flexContext }: { flexContext: FlexContext } = ctx.state;
    await routeHandler(ctx as TypedContext<TBody>, flexContext, next);
  };
}`}
      />
      <p>
        A typical v1 screen route therefore reads almost declaratively: validate the headers/query
        with Joi, then delegate to a service, handing it <code>flexContext</code> and route inputs.
      </p>
      <CodeBlock
        lang="typescript"
        filename="a v1 screen route (shape)"
        code={`myRoute.get(
  '/my-screen',
  flexRouteMiddleware({
    validate: {
      header: Joi.object({
        [StandardHeaderKeys.accountId]: Joi.string().required(),
      }).unknown(), // tolerate the many other Disney headers
      query: Joi.object({ subscriptionId: Joi.string().required() }).unknown(),
    },
    handler: async (ctx, flexContext) => {
      ctx.body = await buildMyScreen({ flexContext, params: ctx.query });
    },
  })
);`}
      />
      <p>
        Two conventions to lock in: header/query schemas use <code>.unknown()</code> because dozens
        of Disney headers ride along and you only validate the ones you require; and{" "}
        <strong>business logic never lives in the route</strong> — the route validates and delegates,
        nothing more.
      </p>

      <h2 id="pipeline">The Full Request Pipeline</h2>
      <MermaidDiagram
        chart={requestPipelineDiagram}
        title="Request lifecycle: headers → FlexContext → validated route → service → body"
        caption="FlexContext is built once, early, and read everywhere. Joi validation gates the handler; the service does the real work."
        minHeight={520}
      />

      <h3 id="why-state">Why Context Lives on ctx.state</h3>
      <p>
        Koa&apos;s <code>ctx.state</code> is the officially-sanctioned per-request namespace for
        passing data between middleware and handlers. Building <code>FlexContext</code> once in
        middleware and reading it via <code>flexContextRouteHandler</code> means (a) parsing happens
        exactly once per request, (b) every handler gets an identically-shaped, typed object, and (c)
        tests can inject a <code>DEFAULT_MOCK_FLEX_CONTEXT</code> without going through header
        parsing. It is dependency injection, Koa-style.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does a request get its context in this service?'"
        intro="The interviewer wants to hear the onion model and the single-parse principle, not a folder tour."
        steps={[
          "Start with the two-level middleware chain: app.ts does CORS/logging/cacheControl/routes; routes/index.ts starts with errorHandler and then business middleware.",
          "Explain that requestHeaders parses raw x-bamtech/x-bamsdk headers into ctx.state.standardHeaders, then region/experimentation/session/device middleware enrich ctx.state.",
          "Describe flexContextHandler as the composer that builds ctx.state.flexContext once, and flexRouteMiddleware/flexContextRouteHandler as adapters that pass it to route handlers.",
          "Note that routes only do Joi validation (with .unknown() on header/query) and delegate; business logic lives in services.",
          "Close with testability: because context is injected, tests use a DEFAULT_MOCK_FLEX_CONTEXT instead of faking headers.",
        ]}
      />

      <h2 id="challenge">Challenge: Trace a Request</h2>
      <InterviewChallenge
        title="A header shows up empty in a service — debug it"
        scenario={
          <>
            A teammate reports that inside a screen service,{" "}
            <code>flexContext.experimentation</code> is <code>undefined</code> even though the client
            swears it sent the WeaponX assignments header. Using the pipeline from this module,
            explain where you&apos;d look and in what order.
          </>
        }
        tasks={[
          "List the stages the header passes through before it becomes flexContext.experimentation.",
          "Explain how you'd confirm the raw header actually arrived (and why Joi .unknown() means a missing header won't 400).",
          "Identify which middleware is responsible for populating experimentation on FlexContext.",
          "Describe how you'd reproduce it deterministically in a test using an injected FlexContext.",
        ]}
        pitfalls={[
          "Assuming a missing header causes a 400 — .unknown() lets it pass silently.",
          "Looking in the route or service first instead of the FlexContext-building middleware.",
          "Forgetting the header is base64-encoded and must be decoded to populate experimentation.",
        ]}
        signal="A strong answer walks header → middleware parse → ctx.state → handler, and knows validation won't catch an optional missing header."
      />
      <SolutionReveal difficulty="medium">
        <p>
          The header travels: raw <code>x-bamtech-weaponx-assignments</code> →{" "}
          <code>StandardHeaders.weaponxAssignmentsBase64</code> → the FlexContext middleware decodes
          it and sets <code>experimentation</code> on <code>FlexContext</code> → the handler reads{" "}
          <code>flexContext.experimentation</code>. Since experiment headers are optional and route
          schemas use <code>.unknown()</code>, a missing or malformed header does <em>not</em>{" "}
          produce a 400 — it just yields <code>undefined</code>, which is exactly the symptom.
        </p>
        <p>
          So look, in order: (1) confirm the raw header reached the pod (logs / a quick echo), (2)
          inspect the FlexContext middleware&apos;s decode step — a bad base64 payload can fail to
          populate <code>experimentation</code>, (3) only then look at the service. To reproduce
          deterministically, don&apos;t fake headers — construct a <code>FlexContext</code> from{" "}
          <code>DEFAULT_MOCK_FLEX_CONTEXT</code> with <code>experimentation</code> set (and one case
          with it omitted) and assert the service branches correctly.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong><code>server.ts</code> listens; <code>app.ts</code> assembles.</strong> Splitting
          them lets tests import a fully-wired app with no open port.
        </li>
        <li>
          <strong>Middleware order is behavior.</strong> <code>app.ts</code> handles CORS/logging/cache-control
          before mounting <code>routes()</code>; <code>routes/index.ts</code> starts with the error
          handler and health check, then parses/enriches request state before mounting routers.
        </li>
        <li>
          <strong><code>FlexContext</code> is the request world:</strong> standardHeaders,
          regionConfig, device, sessionAccess, isAuthenticated, experimentation, storeFrontCountry —
          built once, read everywhere.
        </li>
        <li>
          <strong>Raw <code>x-bamtech-*</code> headers</strong> are the ground truth;{" "}
          <code>StandardHeaders</code> is their typed parse.
        </li>
        <li>
          <strong><code>flexRouteMiddleware</code> / <code>flexContextRouteHandler</code></strong> pull
          context off <code>ctx.state</code> and pass it to handlers; routes only validate (Joi{" "}
          <code>.unknown()</code>) and delegate.
        </li>
        <li>
          <strong>Injected context = testable.</strong> Use{" "}
          <code>DEFAULT_MOCK_FLEX_CONTEXT</code> instead of faking headers.
        </li>
      </ul>
    </div>
  );
}
