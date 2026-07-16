import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const routeLayerDiagram = String.raw`flowchart TD
  REQ["Incoming HTTP request"]
  REQ --> MW["Router matches path"]
  MW --> VAL{"Joi validate<br/>header / query / params / body"}
  VAL -->|fails| ERR["400 with error details"]
  VAL -->|passes| CHAIN["handler chain<br/>(preprocess → context → screen)"]
  CHAIN --> FCH["flexRouteMiddleware OR<br/>flexContextRouteHandler<br/>passes FlexContext"]
  FCH --> SVC["buildXScreen({ flexContext, params })"]
  SVC --> BODY["ctx.body = result"]

  NOTE["Routes do validation + delegation ONLY.<br/>No business logic here."]
  CHAIN -.-> NOTE`;

const v1v2Diagram = String.raw`flowchart LR
  subgraph v1["V1 (majority)"]
    G["GET + query params"]
    GJ["Joi header/query<br/>.unknown()"]
  end
  subgraph v2["V2 (selective)"]
    P["POST + JSON body"]
    F["base64 filters<br/>getFlexResourceFilters()"]
    D["Datadog flow tags<br/>createDatadogTagMiddleware()"]
  end
  G --> SVC["Service"]
  P --> SVC
  F --> SVC
  D --> SVC
  SVC --> RESP["UI + analytics JSON"]`;

export const toc: TocItem[] = [
  { id: "job", title: "The Route Layer's One Job", level: 2 },
  { id: "anatomy", title: "Anatomy of a V1 Route", level: 2 },
  { id: "joi", title: "Joi Validation & Why .unknown()", level: 3 },
  { id: "handler-chain", title: "The Handler Chain", level: 3 },
  { id: "v2", title: "V2 Routes: POST, Filters, Datadog", level: 2 },
  { id: "v2-connect", title: "How V2 Connects to Services", level: 3 },
  { id: "diagram", title: "V1 vs V2 at a Glance", level: 2 },
  { id: "openapi", title: "OpenAPI & the build:swagger Contract", level: 2 },
  { id: "register", title: "Registering a Route", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Route Correctly", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RoutesAndValidation() {
  return (
    <div className="article-content">
      <p>
        The route layer is deliberately the thinnest layer in the service. Its entire mandate is:
        validate the request and hand off to a service. If you ever find yourself reaching for a
        backend client or a business rule inside a route file, you are in the wrong place. This
        module shows you exactly what belongs in <code>src/routes/</code>, the V1 vs V2 split, and
        the OpenAPI contract that ties routes to generated schemas.
      </p>

      <h2 id="job">The Route Layer&apos;s One Job</h2>
      <p>
        <code>CLAUDE.md</code> states it flatly: <em>&quot;Validation here, business logic does NOT
        belong here.&quot;</em> A route validates headers/query/params/body with Joi, then delegates
        to a <code>buildXScreen()</code> service function, passing it <code>FlexContext</code> and the
        request params. That&apos;s it.
      </p>
      <MermaidDiagram
        chart={routeLayerDiagram}
        title="The route layer: validate, then delegate"
        caption="Every screen route follows this shape. The moment logic branches on business rules, it belongs in a service, not the route."
        minHeight={440}
      />

      <h2 id="anatomy">Anatomy of a V1 Route</h2>
      <p>
        V1 is the majority of screens — usually a <code>GET</code> with query params. The route
        docs still show the older <code>koa-joi-router</code> + <code>flexContextRouteHandler</code>
        pattern, while many touched routes have moved to <code>koa-router</code> +{" "}
        <code>flexRouteMiddleware</code>. You will see both in the repo; the architectural rule is
        the same: validate, receive <code>FlexContext</code>, delegate.
      </p>
      <CodeBlock
        lang="typescript"
        filename="modern V1 route shape"
        code={`import Joi from 'joi';
import Router from 'koa-router';
import { flexRouteMiddleware } from '!routes/screens/common';

const myRoute = new Router();
myRoute.get(
  '/my-screen',
  flexRouteMiddleware({
    validate: {
      header: Joi.object({
        [StandardHeaderKeys.accountId]: Joi.string().required(),
      }).unknown(), // allow extra Disney headers
      query: Joi.object({ offerId: Joi.string() }).unknown(),
    },
    handler: async (ctx, flexContext) => {
      ctx.body = await buildMyScreen({ flexContext, params: ctx.query });
    },
  })
);`}
      />

      <h3 id="joi">Joi Validation &amp; Why .unknown()</h3>
      <p>
        Every request carries dozens of <code>x-bamtech-*</code> headers. Your route only cares about
        a handful. Calling <code>.unknown()</code> on the header/query object tells Joi &quot;these
        are the fields I require; tolerate everything else.&quot; Without it, the many legitimate
        Disney headers would fail validation. Joi also expresses conditional requirements — a real
        example makes <code>identityId</code> required only for registered sessions:
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/routes/screens/v1/commerce/eligiblePlans.ts (excerpt)"
        code={`header: Joi.object({
  [StandardHeaderKeys.accountId]: Joi.string(),
  [StandardHeaderKeys.identityId]: Joi.when(StandardHeaderKeys.sessionType, {
    is: Joi.string().valid('REGISTERED'),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  [StandardHeaderKeys.partner]: Joi.string().required(),
  [StandardHeaderKeys.locationCountryCode]: Joi.string().required(),
}).unknown(),
body: Joi.object({
  entitlementId: Joi.string(),
  offerContext: Joi.array().items(
    Joi.object({
      offerId: Joi.string().required(),
      campaignId: Joi.string().required(),
    })
  ),
}),
type: 'json',`}
      />
      <p>
        Note this &quot;v1&quot; screen actually uses <code>POST</code> with a body — screen version and
        HTTP verb are independent. The rule is: if you accept a body through the shared validation
        helpers, you must set <code>type: 'json'</code> and validate it. Also remember that
        <code>requestHeaders.ts</code> pre-parses JSON bodies for <code>/execution/*</code> routes,
        while <code>flexRouteMiddleware</code> parses screen bodies only when upstream middleware has
        not already set <code>ctx.request.body</code>.
      </p>

      <h3 id="handler-chain">The Handler Chain</h3>
      <p>
        In <code>koa-joi-router</code> routes, <code>handler</code> is an array, run in order. This
        lets a route stack preprocessing before the screen handler — for example params validation, a
        Datadog tagger, then the actual screen builder. In newer <code>koa-router</code> routes using
        <code>flexRouteMiddleware</code>, the same idea is usually expressed inside one middleware
        callback. Either way, the last step sets <code>ctx.body</code>.
      </p>

      <h2 id="v2">V2 Routes: POST, Filters, Datadog</h2>
      <p>
        V2 is <em>not</em> a rewrite. Only selective screens have a V2 route, added when V1&apos;s
        GET+query shape no longer fits. The three things V2 introduces:
      </p>
      <ArticleTable
        caption="What V2 adds over V1, and when each applies."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>V2 feature</th>
              <th>Why</th>
              <th>Mechanism</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>POST with JSON body</td>
              <td>Complex input (e.g. an <code>offerContext</code> array) too big for query params</td>
              <td><code>type: 'json'</code> + a body schema (e.g. preview)</td>
            </tr>
            <tr>
              <td>Encoded resource filters</td>
              <td>Structured filter params instead of a flat <code>entitlementId</code></td>
              <td>base64 <code>filters</code> query → <code>getFlexResourceFilters()</code></td>
            </tr>
            <tr>
              <td>Datadog flow tagging</td>
              <td>Observability per flow (preview, planSwitch…)</td>
              <td><code>createDatadogTagMiddleware(() =&gt; (&#123; flow &#125;))</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <CodeBlock
        lang="typescript"
        filename="a V2 POST route (shape)"
        code={`myRoute.route({
  method: 'post',
  path: '/my-screen',
  validate: {
    header: Joi.object({ /* ... */ }).unknown(),
    body: MyV2BodySchema,   // often reuses a v1 schema, destructured + extended
    type: 'json',
  },
  handler: [
    paramsValidationHandler({ bodyParams: true }),
    createDatadogTagMiddleware(() => ({ flow: TAG_FLOW_SUF })),
    screenHandler({ version: 'v2', bodyParams: true }),
  ],
});`}
      />

      <h3 id="v2-connect">How V2 Connects to Services</h3>
      <p>
        There is no single rule — <code>CLAUDE.md</code> documents three ways a V2 route reaches a
        service, and knowing which one a screen uses saves real debugging time:
      </p>
      <ArticleTable
        caption="The three ways a V2 route connects to service code."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>How</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Version parameter</td>
              <td>Same service accepts <code>version: 'v2'</code> to branch</td>
              <td>ips, billingHistory, planSwitchLedger, deviceReacquisition</td>
            </tr>
            <tr>
              <td>Separate v2 service</td>
              <td>A dedicated <code>xServiceV2.ts</code> with its own template config</td>
              <td>planSwitch (<code>planSwitchServiceV2.ts</code>)</td>
            </tr>
            <tr>
              <td>Same service, no version</td>
              <td>Calls the identical v1 function, no version param</td>
              <td>accountDetails, preview</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="diagram">V1 vs V2 at a Glance</h2>
      <MermaidDiagram
        chart={v1v2Diagram}
        title="V1 and V2 both feed the same service layer"
        caption="V2 is a richer front door for selective screens — the service layer underneath is largely shared."
        minHeight={360}
      />

      <h2 id="openapi">OpenAPI &amp; the build:swagger Contract</h2>
      <p>
        Every route must be described in a colocated <code>openapi.yaml</code> (one per domain
        folder). The response schema is not hand-written — it&apos;s <em>generated</em> from your
        TypeScript contract type into <code>src/lib/validator/schemas/</code> and referenced by{" "}
        <code>$ref</code>. After changing a route&apos;s spec you must run{" "}
        <code>npm run build:swagger</code>, which regenerates schemas and bundles{" "}
        <code>openapi.json</code>. CI&apos;s <code>openapi-check</code> fails if you forget.
      </p>
      <CodeBlock
        lang="yaml"
        filename="openapi.yaml (excerpt)"
        code={`- $ref: ../../../../openapi/components/parameters/bamtech-headers.yaml#/BamtechAccountId
'400':
  $ref: ../../../../openapi/components/responses/errors.yaml#/BadRequest
schema:
  $ref: ../../../../lib/validator/schemas/screens/myScreenApiResponse.json`}
      />

      <h3 id="register">Registering a Route</h3>
      <p>
        A route only goes live once its router is mounted on the parent:{" "}
        <code>subscription.use('/my-screen', myScreen.middleware())</code>. Miss this and the
        endpoint returns 404 no matter how correct the handler is.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What belongs in the route layer here?'"
        intro="The interviewer is checking that you keep business logic out of routes and understand the validation/OpenAPI contract."
        steps={[
          "State the mandate: routes validate (Joi) and delegate to a service; no business logic, no backend calls.",
          "Explain .unknown() on header/query: many Disney headers ride along; you only require the ones you use.",
          "Describe the handler chain/adapters: flexContextRouteHandler or flexRouteMiddleware reads the already-built ctx.state.flexContext and passes it to the route handler.",
          "Contrast V1 (GET+query, majority) with V2 (POST body, base64 filters via getFlexResourceFilters, Datadog tagging) — selective.",
          "Close with the OpenAPI/build:swagger contract and the register-on-parent step, both enforced by CI or a 404.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Route Correctly</h2>
      <InterviewChallenge
        title="Wire up a new /gift-status screen"
        scenario={
          <>
            You&apos;re adding a new read-only screen, <code>/gift-status</code>, that needs the
            account id and a <code>giftId</code> query param, and returns a gift-status UI. Describe
            every step to make it live and correct, and name what fails if you skip each one.
          </>
        }
        tasks={[
          "Write the Joi validation: which header is required, how giftId is validated, and why .unknown() is on the objects.",
          "Show the handler using flexContextRouteHandler delegating to a service — and state what must NOT appear in the route.",
          "Explain the registration step on the parent router and the symptom if it's missing.",
          "List the OpenAPI + build step needed and which CI check enforces it.",
        ]}
        pitfalls={[
          "Fetching gift data inside the route instead of a service.",
          "Omitting .unknown() so real Disney headers 400 the request.",
          "Forgetting to mount the router (404) or to run build:swagger (openapi-check fails).",
        ]}
        signal="A strong answer keeps the route to Joi + delegation, mounts it on the parent, adds the openapi.yaml entry, and runs build:swagger."
      />
      <SolutionReveal difficulty="easy">
        <CodeBlock
          lang="typescript"
          code={`const giftStatus = koaRouter();
giftStatus.route({
  method: 'get',
  path: '/gift-status',
  validate: {
    header: Joi.object({
      [StandardHeaderKeys.accountId]: Joi.string().required(),
    }).unknown(),
    query: Joi.object({ giftId: Joi.string().required() }).unknown(),
  },
  handler: [
    flexContextRouteHandler(async (ctx, flexContext) => {
      ctx.body = await buildGiftStatus({ flexContext, params: ctx.query });
    }),
  ],
});
// Mount it — without this the endpoint 404s:
subscription.use('/gift-status', giftStatus.middleware());`}
        />
        <p>
          The route contains zero business logic — <code>buildGiftStatus</code> (a service) does the
          fetching and building. <code>.unknown()</code> lets the real Disney headers through. Add
          the endpoint to the nearest <code>openapi.yaml</code>, referencing the generated response
          schema, then run <code>npm run build:swagger</code> — otherwise <code>openapi-check</code>{" "}
          fails in CI. Skip the <code>subscription.use(...)</code> mount and every request 404s.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Routes validate and delegate — nothing else.</strong> Business logic and backend
          calls live in services.
        </li>
        <li>
          <strong>Joi with <code>.unknown()</code></strong> on header/query objects; conditional
          requirements via <code>Joi.when()</code>; bodies need <code>type: 'json'</code>.
        </li>
        <li>
          <strong>Handlers are thin adapters</strong> — either ordered <code>koa-joi-router</code>
          chains or <code>flexRouteMiddleware</code> callbacks — that pass <code>FlexContext</code> to
          service code.
        </li>
        <li>
          <strong>V2 is selective:</strong> POST bodies, base64 filters via{" "}
          <code>getFlexResourceFilters()</code>, Datadog flow tags — connecting to services three
          different ways.
        </li>
        <li>
          <strong>OpenAPI is a contract.</strong> Describe routes in <code>openapi.yaml</code>,{" "}
          <code>$ref</code> generated schemas, run <code>build:swagger</code> (CI enforces).
        </li>
        <li>
          <strong>Mount on the parent router</strong> or the endpoint 404s.
        </li>
      </ul>
    </div>
  );
}
