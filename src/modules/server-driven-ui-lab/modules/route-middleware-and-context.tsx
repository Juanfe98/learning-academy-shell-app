import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const entryDiagram = String.raw`flowchart TD
  REQ["HTTP request"] --> ERRMW["error middleware<br/>try / catch → statusFor()"]
  ERRMW --> ROUTER["@koa/router"]
  ROUTER --> ROUTE["accountDetail.ts<br/>Joi validate query"]
  ROUTE -->|"invalid"| B400["400 INVALID_REQUEST"]
  ROUTE -->|"valid"| CTXH["ledgerContextRouteHandler"]

  CTXH --> PARSE["parseStandardHeaders(ctx.headers)"]
  PARSE --> CTXOBJ["LedgerContext<br/>standardHeaders · regionConfig · featureSet"]
  CTXOBJ --> SVC["buildAccountDetailsScreen"]
  SVC --> BODY["ctx.body = Screen"]

  SVC -.->|"throws"| ERRMW

  style ROUTE fill:#7c3aed,color:#fff
  style CTXOBJ fill:#0f766e,color:#fff`;

const contextDiagram = String.raw`flowchart LR
  subgraph raw["Raw HTTP — messy, framework-shaped"]
    H["ctx.headers<br/>string | string[] | undefined"]
  end

  subgraph parse["middlewares/models/"]
    P["parseStandardHeaders<br/>validates, defaults, logs"]
  end

  subgraph ctx["LedgerContext — clean, typed, request-scoped"]
    C["standardHeaders.surface: Surface<br/>regionConfig: { locale, currency }<br/>featureSet: Record&lt;string, boolean&gt;"]
  end

  subgraph svc["Services"]
    S["never touch ctx.headers<br/>testable by calling a function"]
  end

  H --> P --> C --> S

  N["Same shape as the Raw* → Domain* boundary,<br/>applied to the transport layer."]
  P -.-> N

  style P fill:#b45309,color:#fff
  style C fill:#0f766e,color:#fff`;

const routeCode = `/**
 * Query parameters this screen accepts.
 *
 * \`.unknown(true)\` because clients append their own tracking params and a route should not
 * fail a request over a parameter it does not care about. Flex applies the same rule to header
 * and query objects.
 */
const querySchema = Joi.object({
  accountId: Joi.string().required(),
}).unknown(true);

export function registerAccountDetailRoute(router: Router): void {
  router.get(
    '/screens/v1/account/detail',
    ledgerContextRouteHandler(async (ctx, ledgerContext) => {
      const { error, value } = querySchema.validate(ctx.query);

      if (error) {
        ctx.status = 400;
        ctx.body = { error: 'INVALID_REQUEST', message: error.message };
        return;
      }

      ctx.body = await buildAccountDetailsScreen({
        accountId: (value as { accountId: string }).accountId,
        ledgerContext,
      });
    })
  );
}`;

const headersCode = `export const StandardHeaderKeys = {
  /** Which client is calling. Decides which template is served (002). */
  surface: 'x-client-surface',
} as const;

const DEFAULT_SURFACE: Surface = 'web';

export function parseStandardHeaders(
  headers: Record<string, string | string[] | undefined>
): StandardHeaders {
  const raw = headers[StandardHeaderKeys.surface];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === undefined) {
    return { surface: DEFAULT_SURFACE };
  }

  if (!SURFACES.includes(value as Surface)) {
    // TODO(008): route through the real telemetry sink once one exists.
    console.warn(
      \`[headers] unrecognised \${StandardHeaderKeys.surface} "\${value}", \` +
        \`falling back to "\${DEFAULT_SURFACE}"\`
    );
    return { surface: DEFAULT_SURFACE };
  }

  return { surface: value as Surface };
}`;

const contextCode = `export type RegionConfig = {
  locale: string;
  currency: string;
};

/**
 * Request-scoped context, assembled once and passed to every service.
 *
 * Mirrors Flex's \`FlexContext\`: standard headers, region config, and a feature set. Services
 * read from this rather than from raw HTTP, which is what keeps them testable without a server.
 */
export type LedgerContext = {
  standardHeaders: StandardHeaders;
  regionConfig: RegionConfig;
  featureSet: Record<string, boolean>;
};

export function ledgerContextRouteHandler(
  handler: (ctx: Context, ledgerContext: LedgerContext) => Promise<void>
): Middleware {
  return async (ctx) => {
    const ledgerContext: LedgerContext = {
      standardHeaders: parseStandardHeaders(ctx.headers),
      regionConfig: DEFAULT_REGION,
      featureSet: {},
    };

    await handler(ctx, ledgerContext);
  };
}`;

const errorCode = `function statusFor(error: unknown): number {
  if (error instanceof AccountNotFoundError) return 404;
  if (error instanceof TemplateNotFoundError) return 404;
  if (error instanceof LedgerConversionError) return 502; // the backend sent something invalid
  return 500;
}

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = statusFor(error);
    ctx.body = {
      error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
    // TODO(008): route through the real telemetry sink once one exists.
    console.error('[server]', error);
  }
});`;

const verified = `web             → account-detail:web:default   5 slots   200
tui             → account-detail:tui:default   4 slots   200
no header       → account-detail:web:default   5 slots   200
?accountId=nope → AccountNotFoundError                   404
no accountId    → INVALID_REQUEST (Joi message)          400
surface: roku   → account-detail:web:default   5 slots   200  ← plus a log warning`;

export const toc: TocItem[] = [
  { id: "entry", title: "The Entry Points", level: 2 },
  { id: "route", title: "The Route Does One Thing", level: 2 },
  { id: "unknown-true", title: "Why .unknown(true)", level: 3 },
  { id: "headers", title: "Standard Headers", level: 2 },
  { id: "coercion", title: "The Silent-Coercion Question", level: 3 },
  { id: "context", title: "LedgerContext and the Handler That Injects It", level: 2 },
  { id: "middleware-vs-hof", title: "Middleware, and the Thing That Is Not Middleware", level: 2 },
  { id: "what-is-middleware", title: "What Koa Middleware Actually Is", level: 3 },
  { id: "not-middleware", title: "ledgerContextRouteHandler Is Not Middleware", level: 3 },
  { id: "ctx-state", title: "The Conventional Alternative, and Its Hole", level: 3 },
  { id: "call-chain", title: "The Full Call Chain", level: 3 },
  { id: "why-context", title: "Why This Layer Exists At All", level: 3 },
  { id: "errors", title: "Error Mapping", level: 2 },
  { id: "verified", title: "Verified Behaviour", level: 2 },
  { id: "flex", title: "The Same Entry Layer in Flex", level: 2 },
  { id: "challenge", title: "Challenge: Harden the Entry Layer", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RouteMiddlewareAndContext() {
  return (
    <div className="article-content">
      <p>
        The outermost layer of the server, and the one with the strictest rules about what it may not
        do. Its entire job is to turn an HTTP request into a clean, typed object and hand it to a
        service that knows nothing about HTTP.
      </p>

      <h2 id="entry">The Entry Points</h2>
      <MermaidDiagram
        chart={entryDiagram}
        title="From request to service call"
        caption="Error handling wraps everything; the route validates and nothing else; the context handler assembles state."
      />

      <h2 id="route">The Route Does One Thing</h2>
      <CodeBlock
        code={routeCode}
        lang="typescript"
        filename="packages/sdui-server/src/routes/screens/v1/account/accountDetail.ts"
      />
      <p>
        Validation and registration. That is the whole file. Notice what is <em>absent</em>: no
        fetching, no business rules, no knowledge of templates or surfaces, no error handling beyond
        the validation failure it owns.
      </p>
      <p>
        The path shape — <code>routes/screens/v1/&lt;domain&gt;/&lt;screen&gt;.ts</code> — is lifted
        directly from Flex, including the <code>v1</code> segment. Flex has a <code>v2</code> for
        selected screens (POST bodies, base64-encoded filter params, Datadog tagging middleware), so
        the version segment is load-bearing there rather than decorative.
      </p>

      <h3 id="unknown-true">Why .unknown(true)</h3>
      <p>
        Clients append their own query parameters — <code>utm_source</code>, session identifiers,
        cache-busters. A route that rejected the request because of a parameter it does not care about
        would be brittle for no benefit.
      </p>
      <p>
        Flex applies the same rule, and its own repo guidance says so explicitly: <em>use Joi with{" "}
        <code>.unknown()</code> on header and query objects</em>. It is a small thing that prevents a
        recurring class of support ticket.
      </p>

      <h2 id="headers">Standard Headers</h2>
      <CodeBlock
        code={headersCode}
        lang="typescript"
        filename="packages/sdui-server/src/middlewares/models/StandardHeaders.ts"
      />
      <p>
        This is the direct analogue of Flex learning its brand from <code>x-bamtech-partner</code>.
        The important architectural property is the same: <strong>the header is set upstream and
        trusted directly.</strong> There is no host-to-surface mapping, no detection step, no
        inference. In Flex&rsquo;s case BAMTech Edge sets the header before the request reaches the
        service at all.
      </p>
      <p>
        Note the <code>Array.isArray</code> handling. Node types headers as{" "}
        <code>string | string[] | undefined</code> because a header can legitimately appear twice.
        Ignoring that is a small correctness bug most code carries silently.
      </p>

      <h3 id="coercion">The Silent-Coercion Question</h3>
      <p>
        An unrecognised surface falls back to <code>web</code> and logs. That choice is deliberate,
        and it is deliberately uncomfortable.
      </p>
      <p>
        It mirrors a real Flex behaviour flagged in the ESPN research register as a{" "}
        <em>suspected defect</em>:
      </p>
      <blockquote>
        <code>displayMode</code> on ESPN device account management coerces anything unrecognised to{" "}
        <code>&apos;dark&apos;</code>.
      </blockquote>
      <p>
        Silent coercion means a client asking for something the server does not understand gets a
        plausible-looking wrong answer, with no signal. The only thing making it defensible here is
        the warning line — and even that is currently a <code>console.warn</code> nobody watches,
        which is exactly what open decision 008 exists to fix.
      </p>
      <p>
        Whether it should be a <code>400</code> instead is a genuinely open question. The argument for
        the fallback is robustness: an unknown surface still gets a working screen. The argument
        against is that it hides an integration bug behind a screen that looks fine.
      </p>

      <h2 id="context">LedgerContext and the Handler That Injects It</h2>
      <CodeBlock
        code={contextCode}
        lang="typescript"
        filename="packages/sdui-server/src/middlewares/"
      />
      <MermaidDiagram
        chart={contextDiagram}
        title="The transport boundary"
        caption="Structurally the same move as Raw* → Domain*, applied to HTTP instead of a backend."
      />

      <h2 id="middleware-vs-hof">Middleware, and the Thing That Is Not Middleware</h2>
      <p>
        Reading the route file raises a fair question:{" "}
        <em>
          why is the whole handler passed <strong>into</strong> something? Does that mean the
          middleware is the thing calling the service?
        </em>
      </p>
      <p>
        Mechanically, yes — the call chain runs wrapper → handler → service. But the framing hides
        what is actually going on, and untangling it makes both this codebase and Flex&rsquo;s route
        files considerably easier to read.
      </p>

      <h3 id="what-is-middleware">What Koa Middleware Actually Is</h3>
      <p>
        A Koa middleware is <code>async (ctx, next) =&gt; {"{ ... }"}</code>. It runs, optionally
        calls <code>await next()</code> to hand control downstream, and can do more work as control
        comes back — the &ldquo;onion&rdquo; model.
      </p>
      <p>
        There is a genuine one in this codebase, the error handler:
      </p>
      <CodeBlock
        code={`app.use(async (ctx, next) => {
  try {
    await next();          // ← everything downstream runs here
  } catch (error) {        // ← and control comes back on the way out
    ctx.status = statusFor(error);
    ctx.body = { error: error.name, message: error.message };
  }
});`}
        lang="typescript"
        filename="packages/sdui-server/src/server.ts — real middleware"
      />
      <p>
        That is middleware doing what middleware is for: wrapping everything after it. It is how a{" "}
        <code>throw</code> deep inside a converter becomes a 502.
      </p>

      <h3 id="not-middleware">ledgerContextRouteHandler Is Not Middleware</h3>
      <p>Look at the signature rather than the usage:</p>
      <CodeBlock
        code={`export function ledgerContextRouteHandler(
  handler: (ctx: Context, ledgerContext: LedgerContext) => Promise<void>
): Middleware`}
        lang="typescript"
      />
      <p>
        It <strong>takes a function and returns a middleware</strong>. It is not a middleware itself
        — it is a factory that builds one. A higher-order function, or a decorator.
      </p>
      <p>The middleware it produces is the small arrow inside:</p>
      <CodeBlock
        code={`return async (ctx) => {
  const ledgerContext: LedgerContext = { ...assembled here... };
  await handler(ctx, ledgerContext);   // ← call the function we were given
};`}
        lang="typescript"
      />
      <p>
        Notice there is no <code>next</code>. It is the <em>end</em> of the chain, not a link in it.
      </p>

      <h3 id="ctx-state">The Conventional Alternative, and Its Hole</h3>
      <p>
        The obvious way to do this is plain middleware writing onto <code>ctx.state</code>:
      </p>
      <CodeBlock
        code={`// The conventional approach
app.use(async (ctx, next) => {
  ctx.state.ledgerContext = buildContext(ctx);
  await next();
});

router.get('/screens/v1/account/detail', async (ctx) => {
  const ledgerContext = ctx.state.ledgerContext;   // ← what type is this?
  ...
});`}
        lang="typescript"
        filename="not what this project does"
      />
      <p>
        It works, and it has a hole. <code>ctx.state</code> is effectively untyped, so{" "}
        <code>ledgerContext</code> there is <code>any</code>. Nothing tells you it exists, nothing
        verifies the middleware actually ran, and if a route is ever registered on a router that
        skipped it, the value is <code>undefined</code> — discovered at runtime, in production, as a
        confusing null.
      </p>
      <p>Now compare the wrapper version:</p>
      <CodeBlock
        code={`ledgerContextRouteHandler(async (ctx, ledgerContext) => {
  // ledgerContext is LedgerContext. Fully typed. Guaranteed present.
})`}
        lang="typescript"
      />
      <p>
        <strong>You cannot write this handler without receiving a <code>LedgerContext</code>.</strong>{" "}
        It is a parameter; the compiler hands it to you. There is no way to register this route and
        accidentally not have it.
      </p>
      <p>
        That is the entire trade: it converts a <em>runtime convention</em> — &ldquo;remember to
        register the context middleware first&rdquo; — into a <em>compile-time guarantee</em>. With
        one screen that hardly matters. With a hundred screen services, as Flex has, a rule that must
        be remembered is a rule that will eventually be forgotten. A parameter cannot be.
      </p>

      <h3 id="call-chain">The Full Call Chain</h3>
      <CodeBlock
        code={`HTTP request
  → error middleware          real Koa middleware, calls next()
    → router                  matches the path
      → returned middleware   ← what ledgerContextRouteHandler produced
          assembles LedgerContext
          calls your handler with (ctx, ledgerContext)
            → your handler    validates the query, calls the service
              → service       builds the screen
        ctx.body = screen
  ← error middleware catches anything thrown on the way back`}
        lang="text"
      />
      <p>
        Two different things wrap the handler, and they are not the same kind of thing: one is real
        middleware doing onion work, the other is a factory that injected an argument.
      </p>
      <p>
        On &ldquo;the middleware executes the service&rdquo; — the closest analogy is{" "}
        <code>array.map(fn)</code>. Does <code>map</code> execute your transformation? Mechanically,
        yes. But <code>map</code> does not know or care what <code>fn</code> does; its job is
        &ldquo;call this once per item with the right argument.&rdquo; Identically here: the
        wrapper&rsquo;s job is &ldquo;call this with a <code>LedgerContext</code>.&rdquo; It has no
        idea the handler builds a screen — hand it a handler that returns the current time and it
        behaves the same.
      </p>
      <p>
        The pattern has a name: <strong>dependency injection</strong>. The handler declares what it
        needs; something else supplies it.
      </p>
      <p>
        Flex uses exactly this shape, which is why its route files look the way they do:
      </p>
      <CodeBlock
        code={`flexContextRouteHandler(async (ctx, flexContext) => {
  ctx.body = await buildMyScreen({ flexContext, params: ctx.query });
});`}
        lang="typescript"
        filename="growth-life-client-api — the same pattern"
      />

      <h3 id="why-context">Why This Layer Exists At All</h3>
      <p>
        It would be simpler to pass <code>ctx</code> straight into the service. Three reasons not to:
      </p>
      <ol>
        <li>
          <strong>Testability.</strong> A service that takes <code>LedgerContext</code> is tested by
          calling a function with a plain object. A service that takes Koa&rsquo;s <code>ctx</code>{" "}
          needs a mock request, a mock response, and a framework in the test.
        </li>
        <li>
          <strong>One place to assemble cross-cutting state.</strong> Region config, feature flags,
          experiment assignments, tenant — all resolved once per request instead of each service
          reaching for headers independently and disagreeing.
        </li>
        <li>
          <strong>It is the same boundary idea, one layer up.</strong> Raw HTTP is messy and
          framework-shaped; <code>LedgerContext</code> is clean and yours. Swap Koa for Fastify and
          this file changes while every service does not.
        </li>
      </ol>
      <p>
        <code>featureSet</code> is an empty object today. It is present because Flex&rsquo;s{" "}
        <code>FlexContext</code> carries one, and having the field from the start means adding flags
        later is filling in a blank rather than threading a new parameter through every service.
      </p>

      <h2 id="errors">Error Mapping</h2>
      <CodeBlock code={errorCode} lang="typescript" filename="packages/sdui-server/src/server.ts" />
      <ArticleTable caption="Why each status">
        <table>
          <thead>
            <tr>
              <th>Error</th>
              <th>Status</th>
              <th>Whose fault</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>AccountNotFoundError</code>
              </td>
              <td>404</td>
              <td>The caller asked for something that does not exist</td>
            </tr>
            <tr>
              <td>
                <code>TemplateNotFoundError</code>
              </td>
              <td>404</td>
              <td>
                Arguably ours — a screen has no template for that surface. Debatable; 500 is
                defensible
              </td>
            </tr>
            <tr>
              <td>
                <code>LedgerConversionError</code>
              </td>
              <td>
                <strong>502</strong>
              </td>
              <td>
                The <em>backend</em> sent something invalid. Not the caller&rsquo;s fault and not a
                bug in this service
              </td>
            </tr>
            <tr>
              <td>anything else</td>
              <td>500</td>
              <td>Unknown — genuinely ours until proven otherwise</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        That 502 is the row worth defending. Collapsing everything into a blanket 500 is how an
        on-call engineer loses an hour establishing whose problem it is. A status code is the cheapest
        possible piece of triage information, and it costs three lines to get right.
      </p>

      <h2 id="verified">Verified Behaviour</h2>
      <CodeBlock code={verified} lang="text" filename="curl against localhost:3999" />
      <p>
        The third row is the default-surface path; the last is the silent-coercion path with its
        warning. Both are design decisions visible from outside the process, which is the useful test
        of whether a decision was actually implemented.
      </p>

      <h2 id="flex">The Same Entry Layer in Flex</h2>
      <ArticleTable caption="Entry-layer correspondence">
        <table>
          <thead>
            <tr>
              <th>This project</th>
              <th>Flex</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>ledgerContextRouteHandler</code>
              </td>
              <td>
                <code>flexContextRouteHandler</code>
              </td>
              <td>Same job, same position in the stack</td>
            </tr>
            <tr>
              <td>
                <code>LedgerContext</code>
              </td>
              <td>
                <code>FlexContext</code>
              </td>
              <td>Flex also carries experiment data and a richer featureSet</td>
            </tr>
            <tr>
              <td>
                <code>StandardHeaderKeys</code>
              </td>
              <td>
                <code>StandardHeaderKeys</code>
              </td>
              <td>Same name, same idea</td>
            </tr>
            <tr>
              <td>
                <code>x-client-surface</code>
              </td>
              <td>
                <code>x-bamtech-partner</code>
              </td>
              <td>Trusted from upstream in both cases</td>
            </tr>
            <tr>
              <td>
                <code>routes/screens/v1/account/detail</code>
              </td>
              <td>
                <code>routes/screens/v1/&lt;domain&gt;/&lt;screen&gt;.ts</code>
              </td>
              <td>Flex has a real v2 with POST bodies and encoded filters</td>
            </tr>
            <tr>
              <td>Joi with <code>.unknown(true)</code></td>
              <td>Joi with <code>.unknown()</code></td>
              <td>Same rule, stated in Flex&rsquo;s own guidance</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewChallenge
        title="Harden the entry layer"
        scenario={
          <>
            The service is going to be called by a mobile client next quarter. Review the entry layer
            for the problems that will surface then but are invisible today with two well-behaved
            callers.
          </>
        }
        tasks={[
          "Decide whether an unrecognised x-client-surface should keep falling back to web, or 400. Argue both sides before choosing.",
          "The default surface is 'web' when no header is sent. Say why that is convenient now and dangerous later.",
          "Identify what is missing from the entry layer that a real multi-client service would need.",
          "Explain why featureSet exists in LedgerContext despite being empty.",
        ]}
        pitfalls={[
          "Treating the fallback as obviously correct because it is what Flex does — the research register flags Flex's version as a suspected defect.",
          "Forgetting that a default surface means a misconfigured client gets a plausible wrong screen instead of an error.",
          "Listing generic API hardening (rate limits, auth) without connecting it to this architecture's specific failure modes.",
        ]}
        signal="A strong answer notices that fallback-plus-log is only defensible while someone is reading the log — which makes decision 008 a prerequisite, not a nice-to-have."
      />

      <SolutionReveal difficulty="hard">
        <p>
          <strong>Fallback or 400?</strong> For: an unknown surface still gets a working screen, and
          a typo in a header should not take a client down. Against: it hides an integration bug
          behind a screen that looks fine, and the client team may never discover they are receiving
          the wrong layout.
        </p>
        <p>
          The deciding factor is <em>who finds out</em>. Fallback-plus-log is defensible only while
          the log reaches someone. Today it is a <code>console.warn</code> in a terminal — so the
          honest position is that the fallback is currently indefensible, and either 008 lands or the
          behaviour becomes a 400. That dependency is the real answer.
        </p>
        <p>
          <strong>Defaulting to web:</strong> convenient for <code>curl</code> and browser testing.
          Dangerous later because a mobile client that forgets the header gets a <em>web</em> screen —
          slots it may not render, missing slots it expects — and every symptom points at the client.
          Requiring the header explicitly would turn a mystery into a 400 on the first request.
        </p>
        <p>
          <strong>Missing:</strong> a client <em>version</em> alongside the surface, which is what
          open decision 003 needs; request ids for correlating a client report with a server log; and
          a real telemetry sink. Notably not auth — this is a single-user app by design.
        </p>
        <p>
          <strong>featureSet:</strong> it mirrors <code>FlexContext</code>, and having the field from
          the start means the first feature flag is filling in a blank rather than threading a new
          parameter through every service signature. Cheap now, expensive to retrofit.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The route validates and registers. Business logic in a route is the clearest possible sign
          the layering has failed.
        </li>
        <li>
          <code>.unknown(true)</code> on query and header schemas — clients append parameters you do
          not own.
        </li>
        <li>
          The surface header is trusted from upstream, exactly as Flex trusts{" "}
          <code>x-bamtech-partner</code>.
        </li>
        <li>
          <code>LedgerContext</code> is the transport-layer equivalent of the{" "}
          <code>Raw*</code>→<code>Domain*</code> boundary: services never touch framework objects.
        </li>
        <li>
          Silent coercion of an unknown surface is only defensible while someone reads the log — which
          makes the telemetry decision a prerequisite rather than a nicety.
        </li>
        <li>
          Map domain errors to distinct statuses. 502 for a bad backend payload is cheap triage
          information.
        </li>
      </ul>
    </div>
  );
}
