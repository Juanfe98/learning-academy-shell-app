import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart TD
  REQ["GET /screens/v1/account/detail?accountId=acc-001<br/>x-client-surface: tui"]

  subgraph outer["Outer pipeline"]
    ERR["server.ts — error middleware<br/>maps domain errors → status"]
    ROUTE["routes/screens/v1/account/accountDetail.ts<br/>Joi validation ONLY"]
    CTX["middlewares/ledgerContext.ts<br/>assembles + injects LedgerContext"]
  end

  subgraph service["services/accountDetailsService.ts"]
    PAR["Promise.all — 3 independent I/O"]
    CONV["Raw* → Domain* conversion"]
    SLOTS["buildSlots — all six, no surface arg"]
    FILL["fillTemplate"]
  end

  RES["Screen JSON"]

  REQ --> ERR --> ROUTE --> CTX --> PAR
  PAR --> CONV --> SLOTS --> FILL --> RES

  style ROUTE fill:#7c3aed,color:#fff
  style SLOTS fill:#0f766e,color:#fff
  style CONV fill:#b45309,color:#fff`;

const parallelDiagram = String.raw`sequenceDiagram
  participant S as accountDetailsService
  participant L as ledgerClient
  participant T as templateService

  Note over S: await Promise.all([...])
  par three independent operations
    S->>L: getAccount('acc-001')
    and
    S->>L: getTransactions('acc-001')
    and
    S->>T: loadTemplate('account-detail', 'tui')
  end
  L-->>S: RawAccount
  L-->>S: RawTransaction[]
  T-->>S: Template
  Note over S: one round of latency, not three`;

const serviceCode = `export async function buildAccountDetailsScreen(args: {
  accountId: DomainAccount['id'];
  ledgerContext: LedgerContext;
}): Promise<Screen> {
  const { accountId, ledgerContext } = args;
  const { surface } = ledgerContext.standardHeaders;

  // Independent work always runs in parallel.
  const [account, transactions, template] = await Promise.all([
    getAccount(accountId),
    getTransactions(accountId),
    loadTemplate(SCREEN_NAME, surface),
  ]);

  const domainAccount = toDomainAccount(account);
  const domainTransactions = transactions.map((transaction) =>
    toDomainTransaction(transaction)
  );

  const slots = buildSlots(domainAccount, domainTransactions, ledgerContext.regionConfig);

  return {
    screen: SCREEN_NAME,
    templateId: template.templateId,
    content: fillTemplate(template, slots),
    analytics: { screenName: SCREEN_NAME, surface },
  };
}`;

const statusCode = `function statusFor(error: unknown): number {
  if (error instanceof AccountNotFoundError) return 404;
  if (error instanceof TemplateNotFoundError) return 404;
  if (error instanceof LedgerConversionError) return 502; // the backend sent something invalid
  return 500;
}`;

const treeCode = `packages/sdui-server/src/
├── index.ts                          entrypoint, listen on :3999
├── server.ts                         Koa app, error → status mapping
├── middlewares/
│   ├── ledgerContext.ts              ledgerContextRouteHandler
│   └── models/
│       ├── StandardHeaders.ts        parses x-client-surface
│       └── LedgerContext.ts          LedgerContext, RegionConfig
├── routes/screens/v1/account/
│   └── accountDetail.ts              Joi schema + registration
├── services/
│   └── accountDetailsService.ts      orchestration + buildSlots
├── backends/ledger/
│   ├── models/raw.ts                 RawAccount, RawTransaction
│   └── ledgerClient.ts               fake backend, hardcoded fixtures
├── domain/
│   ├── models/                       Money, DomainAccount, DomainTransaction
│   ├── common/
│   │   ├── ledger/                   toDomainAccount, toDomainTransaction
│   │   └── localization/             formatMoney
│   └── template/
│       ├── types.ts                  SlotMarker, isSlotMarker
│       ├── templateService.ts        loadTemplate
│       └── fillTemplate.ts           fillTemplate
└── elements/v1/
    ├── types/index.ts                Copy, tokens, Text/Row/List elements
    ├── types/builders.ts             toCopy, toTextElement, ...
    └── screen.ts                     Screen, SlotContent, Surface`;

export const toc: TocItem[] = [
  { id: "the-path", title: "The Path a Request Travels", level: 2 },
  { id: "tree", title: "Where Everything Lives", level: 2 },
  { id: "layers", title: "Layer Responsibilities", level: 2 },
  { id: "absent", title: "What Is Deliberately Absent From Each Layer", level: 3 },
  { id: "parallel", title: "Parallel Fetching", level: 2 },
  { id: "service-read", title: "The Orchestration, Read Line by Line", level: 2 },
  { id: "errors", title: "Errors Are Mapped, Not Collapsed", level: 2 },
  { id: "flex-shape", title: "The Same Shape in Flex", level: 2 },
  { id: "challenge", title: "Challenge: Place the Change", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RequestLifecycle() {
  return (
    <div className="article-content">
      <p>
        This is the module to internalise before any other. Everything else in the academy is a
        close-up of one box in the diagram below, and the reason the architecture is worth copying
        is that each box has exactly one job and is forbidden from doing the others.
      </p>

      <h2 id="the-path">The Path a Request Travels</h2>
      <MermaidDiagram
        chart={pipelineDiagram}
        title="One request, end to end"
        caption="Outer pipeline on top, service internals below. Only the service touches backends; only the template stage decides what a given surface receives."
      />
      <p>
        Read it once as prose: a request arrives, the error middleware wraps everything, the route
        validates the query and does nothing else, the context handler assembles a request-scoped{" "}
        <code>LedgerContext</code> and injects it, the service fetches in parallel, converts backend
        shapes into domain shapes, builds every element the screen can offer, loads the template for
        the requesting surface, fills it, and returns.
      </p>

      <h2 id="tree">Where Everything Lives</h2>
      <CodeBlock code={treeCode} lang="text" filename="packages/sdui-server/src" />
      <p>
        Four of those directory names — <code>middlewares/models/StandardHeaders.ts</code>,{" "}
        <code>routes/screens/v1/&lt;domain&gt;/&lt;screen&gt;.ts</code>, <code>domain/common/</code>,{" "}
        <code>elements/v1/</code> — are lifted directly from <code>growth-life-client-api</code>.
        That is the point: the shape should be recognisable on sight.
      </p>

      <h2 id="layers">Layer Responsibilities</h2>
      <ArticleTable caption="One job per layer. Violations are the thing to catch in review.">
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Owns</th>
              <th>Must never</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>middleware</code>
              </td>
              <td>Parsing standard headers, telemetry, error → status mapping</td>
              <td>Know about any specific screen</td>
            </tr>
            <tr>
              <td>
                <code>route</code>
              </td>
              <td>Request shape validation; registering the path</td>
              <td>Contain business logic of any kind</td>
            </tr>
            <tr>
              <td>
                <code>contextRouteHandler</code>
              </td>
              <td>
                Assembling <code>LedgerContext</code> and injecting it
              </td>
              <td>Fetch data or make decisions</td>
            </tr>
            <tr>
              <td>
                <code>service</code>
              </td>
              <td>Orchestration, business rules, parallel fetching, slot construction</td>
              <td>Touch raw HTTP, or reference template file paths directly</td>
            </tr>
            <tr>
              <td>
                <code>conversion</code>
              </td>
              <td>
                Translating <code>Raw*</code> into <code>Domain*</code>
              </td>
              <td>
                Leak a <code>Raw*</code> type past its own boundary
              </td>
            </tr>
            <tr>
              <td>
                <code>templates</code>
              </td>
              <td>Layout, ordering, which slots exist</td>
              <td>Import server code, or contain business rules</td>
            </tr>
            <tr>
              <td>
                <code>client registry</code>
              </td>
              <td>Mapping element type → component; degrading unknown types</td>
              <td>Decide copy, ordering, or which actions exist</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="absent">What Is Deliberately Absent From Each Layer</h3>
      <p>
        The <em>Must never</em> column is worth more than the <em>Owns</em> column. Anyone can put
        code in a folder; the architecture only holds if things stay out of the wrong ones. The
        single rule that keeps server-driven UI honest:
      </p>
      <blockquote>
        If a client change is required to alter what a screen <em>says</em> or <em>offers</em>, the
        boundary has leaked. Client changes should only ever be needed to change how an element{" "}
        <em>looks</em>, or to teach the client a genuinely new element type.
      </blockquote>

      <h2 id="parallel">Parallel Fetching</h2>
      <p>
        Three independent I/O operations happen at the top of the service, and all three are awaited
        together:
      </p>
      <MermaidDiagram
        chart={parallelDiagram}
        title="Three independent operations, one round of latency"
        caption="The template load sits in the same Promise.all as the backend calls — it is I/O like any other."
      />
      <p>
        Everything resolves instantly today because the backend is hardcoded fixtures and the template
        is a local file. The habit is the point. Sequential <code>await</code>s here become a latency
        bug the moment any of the three becomes a real network call, and by then the code reads as
        normal and nobody notices.
      </p>
      <p>
        This is carried over verbatim from Flex&rsquo;s own rules: <em>always use{" "}
        <code>Promise.all</code> for independent async calls in services; never sequential awaits for
        independent data.</em>
      </p>

      <h2 id="service-read">The Orchestration, Read Line by Line</h2>
      <CodeBlock
        code={serviceCode}
        lang="typescript"
        filename="packages/sdui-server/src/services/accountDetailsService.ts"
      />
      <p>Six things worth noticing, in order:</p>
      <ol>
        <li>
          <strong>It takes <code>ledgerContext</code>, not a bare surface.</strong> That mirrors Flex
          passing <code>flexContext</code> into services, and it is what lets{" "}
          <code>regionConfig</code> reach money formatting without threading another parameter
          through.
        </li>
        <li>
          <strong>
            <code>surface</code> is destructured once, at the top, and used exactly once
          </strong>{" "}
          — in <code>loadTemplate</code>. Nowhere else in the function.
        </li>
        <li>
          <strong>The three fetches are independent</strong>, so they are parallel. The template does
          not depend on the account.
        </li>
        <li>
          <strong>Conversion happens immediately</strong> after fetching. From that line onward, no{" "}
          <code>Raw*</code> value exists in scope.
        </li>
        <li>
          <strong>
            <code>buildSlots</code> receives no surface
          </strong>{" "}
          — only domain data and region config. This is the constraint most likely to erode over time
          and the one to defend hardest in review.
        </li>
        <li>
          <strong>
            <code>analytics</code> is server-authored
          </strong>
          . The client reports it back; it does not invent it.
        </li>
      </ol>

      <h2 id="errors">Errors Are Mapped, Not Collapsed</h2>
      <CodeBlock code={statusCode} lang="typescript" filename="packages/sdui-server/src/server.ts" />
      <p>
        <code>502</code> for a conversion failure, not <code>500</code>. A malformed backend row means
        the <em>backend</em> is wrong, not this service. Collapsing every failure into a blanket 500
        is how an on-call engineer loses an hour working out whose problem it is.
      </p>
      <p>
        Verified behaviour, over curl:
      </p>
      <ArticleTable caption="Observed responses">
        <table>
          <thead>
            <tr>
              <th>Request</th>
              <th>Status</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>?accountId=acc-001</code>, surface <code>web</code>
              </td>
              <td>200</td>
              <td>5 slots, web template</td>
            </tr>
            <tr>
              <td>
                <code>?accountId=acc-001</code>, surface <code>tui</code>
              </td>
              <td>200</td>
              <td>4 slots, tui template</td>
            </tr>
            <tr>
              <td>
                <code>?accountId=nope</code>
              </td>
              <td>404</td>
              <td>
                <code>AccountNotFoundError</code>
              </td>
            </tr>
            <tr>
              <td>no <code>accountId</code></td>
              <td>400</td>
              <td>Joi rejected the query</td>
            </tr>
            <tr>
              <td>
                surface <code>roku</code>
              </td>
              <td>200</td>
              <td>Falls back to web, logs a warning — a debatable choice, covered later</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="flex-shape">The Same Shape in Flex</h2>
      <p>
        Every box maps onto something in <code>growth-life-client-api</code>:
      </p>
      <ArticleTable caption="Layer-for-layer correspondence">
        <table>
          <thead>
            <tr>
              <th>This project</th>
              <th>Flex</th>
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
            </tr>
            <tr>
              <td>
                <code>LedgerContext</code>
              </td>
              <td>
                <code>FlexContext</code> — standardHeaders, regionConfig, featureSet, experiments
              </td>
            </tr>
            <tr>
              <td>
                <code>x-client-surface</code>
              </td>
              <td>
                <code>x-bamtech-partner</code>, set by BAMTech Edge and trusted directly
              </td>
            </tr>
            <tr>
              <td>
                <code>ledgerClient</code>
              </td>
              <td>GLO, Offers, IPSE, Cypher, Site Config, WeaponX</td>
            </tr>
            <tr>
              <td>
                <code>Raw*</code> → <code>Domain*</code>
              </td>
              <td>
                <code>GLO*</code> → <code>Flex*</code> via <code>domain/common/</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>fillTemplate</code>
              </td>
              <td>
                <code>fillEjsData</code> in <code>src/lib/ejs.ts</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>routes/screens/v1/account/</code>
              </td>
              <td>
                <code>routes/screens/v1/&lt;domain&gt;/&lt;screen&gt;.ts</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewChallenge
        title="Place the change"
        scenario={
          <>
            Four change requests land in the same sprint. For each one, name the layer that changes
            and — just as importantly — the layers that must <em>not</em>.
          </>
        }
        tasks={[
          "The 'Available balance' caption should read 'Available now' on web only.",
          "Transactions should be hidden entirely for accounts whose balance is negative.",
          "The backend starts returning balances as integers instead of numeric strings.",
          "A new client — a mobile app — starts calling the same endpoint.",
        ]}
        pitfalls={[
          "Putting the copy change in the client. Copy is server-owned; a client release for a wording tweak means the boundary leaked.",
          "Putting the conditional hide in the template. Templates are inert data with no expressions — conditionals live in the service.",
          "Assuming the backend type change ripples upward. If it does, the conversion boundary failed at its one job.",
        ]}
        signal="Strong answers name both the layer that changes and the blast radius that is contained — and can point at what enforces the containment."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Copy change, web only.</strong> Service builds the slot; it is already surface-
          agnostic, so the wording is the same for everyone. If web genuinely needs different copy,
          the honest move is a separate slot the web template references. No client change either
          way.
        </p>
        <p>
          <strong>2. Hide transactions when negative.</strong> Service only — that is a business
          rule. <code>buildSlots</code> returns <code>undefined</code> for the{" "}
          <code>transactions</code> slot, and <code>fillTemplate</code> omits the key. Templates
          cannot express this; they have no expressions by design.
        </p>
        <p>
          <strong>3. Backend type change.</strong> <code>backends/ledger/models/raw.ts</code> and{" "}
          <code>domain/common/ledger/</code>. Nothing else. That containment is the entire purpose of
          the boundary, and an ESLint rule enforces it rather than trusting convention.
        </p>
        <p>
          <strong>4. New mobile client.</strong> Add <code>mobile</code> to <code>SURFACES</code> and
          write <code>account-detail/mobile.json</code>. Services do not change — they already build
          every slot. That is the payoff for <code>buildSlots</code> taking no surface argument.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The pipeline is middleware → route → context handler → service → conversion → slot building
          → template resolution → fill. Each layer has one job.
        </li>
        <li>
          The &ldquo;must never&rdquo; column matters more than the &ldquo;owns&rdquo; column.
          Architecture holds by what stays out, not what goes in.
        </li>
        <li>
          Independent I/O is always parallel, including the template load. The habit is the point,
          not today&rsquo;s latency.
        </li>
        <li>
          <code>surface</code> is read once and used once — in <code>loadTemplate</code>. Everywhere
          else it is deliberately unavailable.
        </li>
        <li>
          Domain errors map to distinct status codes so failures name their owner.
        </li>
      </ul>
    </div>
  );
}
