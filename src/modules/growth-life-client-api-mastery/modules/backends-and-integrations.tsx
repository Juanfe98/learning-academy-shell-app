import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fanOutDiagram = String.raw`flowchart TD
  SVC["Screen service"]
  SVC -->|Promise.all| PARALLEL{{"parallel fan-out"}}
  PARALLEL --> GLO["GLO client<br/>offers, agreements,<br/>executions"]
  PARALLEL --> IPSE["IPSE client"]
  PARALLEL --> OFF["Offers Service"]
  PARALLEL --> CYP["Cypher<br/>(localization)"]
  PARALLEL --> TPL["Template config"]
  GLO --> JOIN["all resolved"]
  IPSE --> JOIN
  OFF --> JOIN
  CYP --> JOIN
  TPL --> JOIN
  JOIN --> BUILD["build sections + fill template"]`;

const cachingDiagram = String.raw`flowchart LR
  CALLER["Caller"] --> CACHED["CachedXClient"]
  CACHED --> HIT{"in cache?"}
  HIT -->|yes| RET["return cached"]
  HIT -->|no| RAW["XClient<br/>(real HTTP)"]
  RAW --> STORE["store in cache"]
  STORE --> RET`;

export const toc: TocItem[] = [
  { id: "role", title: "What the Backends Layer Is", level: 2 },
  { id: "roster", title: "The Backend Roster", level: 2 },
  { id: "glo", title: "GLO: The Orchestrator", level: 2 },
  { id: "client-shape", title: "The Client + Cached Client Pattern", level: 2 },
  { id: "parallel", title: "Parallel Fetching Is Non-Negotiable", level: 2 },
  { id: "errors", title: "Errors and Resilience", level: 3 },
  { id: "boundary", title: "The Backend/Domain Boundary", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Backend Fetch", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function BackendsAndIntegrations() {
  return (
    <div className="article-content">
      <p>
        A BFF is only as useful as the systems it fans out to. <code>src/backends/</code> is the
        layer that owns every outbound integration — the HTTP clients, their request/response
        models, their error types, and their caching. It is also the layer with the strictest
        performance rule in the whole repo: independent calls run in parallel, always. This module
        maps the backend roster, shows the client pattern, and drills the parallel-fetch discipline
        that separates fast screens from slow ones.
      </p>

      <h2 id="role">What the Backends Layer Is</h2>
      <p>
        Each integration gets its own folder under <code>src/backends/</code>, typically containing
        a client class plus service-specific models and errors where that integration needs them.
        Some folders are simple wrappers; others have cached decorators, rich model trees, and custom
        error types. The important boundary is consistent: backend clients speak raw backend shapes;
        they do <em>not</em> know about Flex domain types. Conversion happens one layer up, in{" "}
        <code>domain/common/</code> — the boundary from the type-systems module.
      </p>

      <h2 id="roster">The Backend Roster</h2>
      <p>
        There are ~15 integrations. You won&apos;t touch all of them, but you should recognize each
        and what it&apos;s for.
      </p>
      <ArticleTable
        caption="The backend integrations in src/backends/ and what each provides."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Backend</th>
              <th>Provides</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>growthLifeOrchestrator</code> (GLO)</td><td>The primary orchestrator: offers, agreement details, and most executions</td></tr>
            <tr><td><code>GLOGraphqlService</code></td><td>GraphQL surface of GLO for richer offer/agreement queries</td></tr>
            <tr><td><code>ipse</code></td><td>IPSE — plan/subscription eligibility &amp; entitlement info</td></tr>
            <tr><td><code>offersService</code></td><td>Offer catalog / pricing data</td></tr>
            <tr><td><code>cypher</code></td><td>Localization dictionaries (copy resolution)</td></tr>
            <tr><td><code>plasmaClient</code></td><td>Plasma entities / commerce data</td></tr>
            <tr><td><code>IdentityProviderService</code></td><td>Identity / account resolution</td></tr>
            <tr><td><code>weaponX</code></td><td>Experiment assignments &amp; treatments</td></tr>
            <tr><td><code>oneTrustClient</code></td><td>Consent / privacy (OneTrust)</td></tr>
            <tr><td><code>legatoClient</code></td><td>Legato integration</td></tr>
            <tr><td><code>exploreAPI</code></td><td>Content / explore data</td></tr>
            <tr><td><code>dynamoDbClient</code></td><td>DynamoDB persistence</td></tr>
            <tr><td><code>siteConfig</code> / <code>s3siteConfig</code></td><td>Site &amp; region configuration (S3-cached)</td></tr>
            <tr><td><code>templateConfiguration</code></td><td>Which template + version a screen resolves to</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="glo">GLO: The Orchestrator</h2>
      <p>
        <code>GrowthLifeOrchestratorClient</code> is the backend you&apos;ll interact with most. It
        is a large client exposing dozens of methods — a quick scan of the class shows the range: the
        two you&apos;ll see constantly are <code>retrieveOffersV2()</code> and{" "}
        <code>agreementDetails()</code> (the ones the offer/agreement wrappers call), plus a long
        list of <em>execution</em> methods for state changes.
      </p>
      <ArticleTable
        caption="A sample of GrowthLifeOrchestratorClient methods — read vs execute."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Read (feed screens)</th>
              <th>Execute (state-changing)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>retrieveOffersV2()</code></td><td><code>cancelSubscriptionExecution()</code></td></tr>
            <tr><td><code>agreementDetails()</code></td><td><code>switchSubmissionExecution()</code></td></tr>
            <tr><td><code>signupPreview()</code></td><td><code>consentExecution()</code></td></tr>
            <tr><td><code>viewInvoices()</code></td><td><code>redeemGiftCard()</code></td></tr>
            <tr><td><code>extraMemberSlotInfo()</code></td><td><code>zipcodeExecution()</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Notice the naming convention: methods ending in <code>Execution</code> mutate state — they
        back the <em>executions</em> request family from module 1. Read methods feed screens. This is
        the same screens-vs-executions split, now visible at the client level.
      </p>

      <h2 id="client-shape">The Client + Cached Client Pattern</h2>
      <p>
        Several high-traffic/read-heavy integrations ship two clients: the raw <code>XClient</code>
        (does the HTTP) and a <code>CachedXClient</code> (wraps it with caching). You can see the
        pair repeated for <code>GrowthLifeOrchestratorClient</code> /{" "}
        <code>CachedGrowthLifeOrchestratorClient</code>, <code>CypherClient</code> /{" "}
        <code>CachedCypherClient</code>, <code>OffersServiceClient</code> /{" "}
        <code>CachedOffersServiceClient</code>, <code>SiteConfigClient</code> /{" "}
        <code>CachedSiteConfigClient</code>, and template configuration clients. Not every backend
        has a cached variant; use the exported client from that backend&apos;s <code>index.ts</code>.
      </p>
      <MermaidDiagram
        chart={cachingDiagram}
        title="The Cached-client wrapper"
        caption="Caching is a decorator around the raw client. Callers use the cached client; cache misses fall through to the real HTTP client."
        minHeight={320}
      />
      <p>
        This matters for testing and imports: callers normally import the backend&apos;s exported client
        instance from its folder, while tests mock the <em>client method</em> (e.g.{" "}
        <code>GrowthLifeOrchestratorClient.retrieveOffersV2</code>), not the conversion wrapper. The
        client edge is the seam; everything above it should run for real.
      </p>

      <h2 id="parallel">Parallel Fetching Is Non-Negotiable</h2>
      <p>
        This is the single most enforced performance rule in the repo:{" "}
        <strong>independent async calls in a service MUST use <code>Promise.all</code></strong> —
        never a sequence of <code>await</code>s. A screen typically needs offers, agreement details,
        a template, and a couple of flags; fetching them sequentially multiplies latency for no
        reason.
      </p>
      <MermaidDiagram
        chart={fanOutDiagram}
        title="Fan-out with Promise.all"
        caption="All independent fetches launch at once and the service proceeds when the slowest resolves — not the sum of them."
        minHeight={420}
      />
      <CodeBlock
        lang="typescript"
        filename="right vs wrong"
        code={`// ✅ RIGHT — parallel fan-out
const [offers, agreement, template, flag] = await Promise.all([
  getOffers({ standardHeaders, retrieveOffersRequest, flexContext }),
  getAgreementDetails({ standardHeaders, agreementDetailsRequestData }),
  getTemplate({ templateConfiguration }),
  getEnableSomething(flexContext),
]);

// ❌ WRONG — sequential awaits: latency = sum of all four
const offers = await getOffers(/* ... */);
const agreement = await getAgreementDetails(/* ... */);
const template = await getTemplate(/* ... */);
const flag = await getEnableSomething(flexContext);`}
      />
      <p>
        You even saw this <em>inside</em> a conversion wrapper: <code>getOffers()</code> resolves its
        four conversion-time flags with a nested <code>Promise.all</code>. Parallelism is expected at
        every level where calls are independent.
      </p>

      <h3 id="errors">Errors and Resilience</h3>
      <p>
        Backend errors are normalized before they reach clients. Integrations that need custom
        mapping define service-specific errors, while shared infrastructure errors live under{" "}
        <code>src/backends/errors/</code>. The top-level route middleware includes a global{" "}
        <code>errorHandler</code>, and execution/proxy paths have their own response builders. Be
        careful with the word &quot;resilience&quot;: not every backend failure can be safely hidden. Some
        calls are mandatory and should fail the request with a mapped error; others, such as template
        fetch failures with a hardcoded fallback, can degrade gracefully. The service owner decides
        whether fallback behavior is correct for the business flow.
      </p>

      <h2 id="boundary">The Backend/Domain Boundary</h2>
      <p>
        Keep the mental line crisp: <strong>backends return raw backend shapes (often{" "}
        <code>GLO*</code> for GLO); services want <code>Flex*</code> shapes; conversion in{" "}
        <code>domain/common/</code> bridges them.</strong>{" "}
        A service should almost never import a backend client directly for reads — it calls a wrapper
        like <code>getOffers()</code> or <code>getAgreementDetails()</code> that already returns Flex
        types. Reaching past the wrapper to the raw client is a smell that leaks GLO shapes upward.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does this service talk to its backends?'"
        intro="Show the client pattern, the parallelism rule, and the boundary — not just a list of services."
        steps={[
          "Describe the layer: one folder per backend with a client and, where needed, service-specific models, cached decorators, and error mapping.",
          "Name GLO as the primary orchestrator with read methods (retrieveOffersV2, agreementDetails) and *Execution methods for state changes.",
          "Explain the raw XClient / CachedXClient pair for high-traffic integrations and why tests mock the client method, not the wrapper.",
          "State the hard rule: independent fetches use Promise.all; sequential awaits are a defect because latency becomes the sum.",
          "Close with the boundary: clients return raw backend shapes, conversion in domain/common yields Flex*, services consume Flex*."
        ]}
      />

      <h2 id="challenge">Challenge: Add a Backend Fetch</h2>
      <InterviewChallenge
        title="A screen now needs invoice data too"
        scenario={
          <>
            An existing screen already fetches offers and agreement details in a{" "}
            <code>Promise.all</code>. Product wants it to also show the latest invoice, which comes
            from a GLO read. A teammate&apos;s draft adds{" "}
            <code>const invoices = await getInvoices(...)</code> on the line <em>after</em> the
            existing <code>Promise.all</code>. Critique it and give the correct version.
          </>
        }
        tasks={[
          "Explain the performance defect in adding a separate await after the existing Promise.all.",
          "Show the corrected code folding the invoice fetch into the existing Promise.all.",
          "State whether the service should call the GLO client directly or a domain wrapper, and why.",
          "Describe how you'd test it: what you mock and what runs for real.",
        ]}
        pitfalls={[
          "Leaving the extra fetch as a trailing await, serializing it after the others.",
          "Importing the GLO client into the service instead of using a getX wrapper.",
          "Mocking the wrapper instead of the GLO client method, skipping conversion.",
        ]}
        signal="A strong answer folds the fetch into Promise.all, uses a domain wrapper returning Flex types, and mocks the GLO client method."
      />
      <SolutionReveal difficulty="medium">
        <p>
          The trailing <code>await</code> serializes the invoice call <em>after</em> the other three
          resolve, so total latency becomes (slowest of the first three) + invoices, instead of the
          slowest of all four. Fold it in:
        </p>
        <CodeBlock
          lang="typescript"
          code={`const [offers, agreement, invoices] = await Promise.all([
  getOffers({ standardHeaders, retrieveOffersRequest, flexContext }),
  getAgreementDetails({ standardHeaders, agreementDetailsRequestData }),
  getInvoices({ standardHeaders /* ...returns Flex types */ }),
]);`}
        />
        <p>
          Use a domain wrapper (<code>getInvoices</code>-style) that returns Flex types, not the raw
          GLO client — keeping GLO shapes out of the service. For the test, mock the underlying GLO
          client method (e.g. <code>GrowthLifeOrchestratorClient.viewInvoices</code>) with a factory,
          and let the wrapper&apos;s conversion run for real so a mapping bug fails loudly.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>One folder per backend</strong> under <code>src/backends/</code>: client plus raw
          models/cached decorators/errors where needed. GLO is the primary integration.
        </li>
        <li>
          <strong>GLO methods split read vs execute.</strong>{" "}
          <code>retrieveOffersV2</code>/<code>agreementDetails</code> feed screens;{" "}
          <code>*Execution</code> methods change state.
        </li>
        <li>
          <strong>Raw + Cached client pair.</strong> Mock the client method in tests, not the
          conversion wrapper.
        </li>
        <li>
          <strong><code>Promise.all</code> for all independent fetches</strong> — sequential awaits
          are a latency defect, at every level.
        </li>
        <li>
          <strong>Clients return raw backend shapes; services consume <code>Flex*</code>.</strong>{" "}
          Go through <code>domain/common</code> wrappers for converted read data, not raw clients.
        </li>
      </ul>
    </div>
  );
}
