import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const landscapeDiagram = String.raw`flowchart LR
  subgraph READ["Readable — you can grep these"]
    R1["cgi-web monorepo<br/>apps + packages"]
    R2["growth-life-client-api<br/>the Flex BFF"]
    R3["growth-life-client-templates<br/>separate repo · screen templates"]
  end
  subgraph OPAQUE["Opaque — runtime services, no source in your editor"]
    O1["Edge gateway<br/>api.edge.bamgrid.com"]
    O2["client-sdk-configs<br/>SDK bootstrap"]
    O3["Sparrow · Site Config<br/>remote config"]
    O4["Cypher<br/>dictionary · every visible string"]
    O5["WeaponX · LaunchDarkly<br/>experiments + flags"]
    O6["Cannonball · Spaceball<br/>CMS · org espnplus"]
    O7["GLO · IPSE · Offers<br/>prices and entitlements"]
    O8["Vault<br/>secrets"]
  end
  E1["ESPN content site repo<br/>www.espn.com · different org"]
  E1 -.->|"hands the user over"| R1
  R1 --> O2 --> O1 --> R2
  R1 --> O3
  R1 --> O5
  R1 --> O6
  R1 --> O8
  R2 --> R3
  R2 --> O4
  R2 --> O7
  classDef readable fill:#14351f,stroke:#22c55e,color:#e6f7ec
  classDef opaque fill:#3a1f14,stroke:#f59e0b,color:#fdf0e2
  classDef foreign fill:#1c1c2a,stroke:#5a5a78,color:#d8d8e6
  class R1,R2,R3 readable
  class O1,O2,O3,O4,O5,O6,O7,O8 opaque
  class E1 foreign`;

const layerStackDiagram = String.raw`flowchart TD
  U["Browser — desktop or mobile web"]
  U --> C1["www.espn.com<br/>content site + contextualization takeover<br/><b>ESPN engineering org · repo outside cgi-web</b>"]
  U --> M1["plus.espn.com<br/>apps/marketing-unified/espn<br/><b>Nexus · web-growth</b>"]
  U --> K1["secure.web.plus.espn.com<br/>apps/commerce/espn<br/><b>CUP · gci-experiences-platform</b>"]
  C1 -->|"Browse Plans"| M1
  M1 -->|"plan chosen"| K1
  M1 --> CMSPKG["packages/marketing/growth-cms-api<br/>Cannonball manifest · Spaceball GraphQL"]
  CMSPKG --> CMS["Cannonball · Spaceball CMS<br/>org espnplus"]
  CMSPKG --> STITCH["packages/marketing/stitch<br/>CMS document to React"]
  K1 --> CB["packages/cgi/commerce-base<br/>shared screens · signup · payments · identity · account"]
  CB --> DI["packages/cgi/data-interface-espn<br/>brand API surface"]
  DI --> SDK["BamTech Browser SDK<br/>packages/cgi/sdk-session · client id espn-a9b93989"]
  SDK --> BOOT["client-sdk-configs<br/>resolves symbolic key to URL"]
  SDK --> SPARROW["Sparrow remote config<br/>packages/remote-config · paths, flags, tenant ids"]
  SDK --> EDGE["Edge gateway<br/>qa-espn.api.edge.bamgrid.com<br/>injects x-bamtech-partner espn, account, session, WeaponX"]
  EDGE --> FLEX["Flex BFF — growth-life-client-api<br/>SHARED partner-agnostic screen services"]
  FLEX --> TPL["growth-life-client-templates<br/>EJS/JSON templates served via Site Config"]
  FLEX --> CY["Cypher dictionary<br/>every string on the screen"]
  FLEX --> BE["GLO · IPSE · Offers<br/>plans, prices, entitlements"]
  FLEX --> JSON["Filled screen JSON<br/>layout + copy + CTA wiring already decided"]
  JSON -.->|"React only renders this"| CB
  classDef app fill:#1e2340,stroke:#6366f1,color:#ececff
  classDef pkg fill:#16283a,stroke:#38bdf8,color:#e6f4ff
  classDef svc fill:#3a1f14,stroke:#f59e0b,color:#fdf0e2
  classDef foreign fill:#1c1c2a,stroke:#5a5a78,color:#d8d8e6
  class M1,K1,FLEX,JSON app
  class CMSPKG,STITCH,CB,DI,SDK,SPARROW pkg
  class BOOT,EDGE,CMS,CY,BE,TPL svc
  class C1 foreign`;

const packageTopologyDiagram = String.raw`flowchart TD
  subgraph APPS["apps/ — three sibling commerce apps, one marketing app"]
    A1["commerce/espn"]
    A2["commerce/disneyPlus"]
    A3["commerce/hulu"]
    A4["marketing-unified/espn"]
  end
  A1 --> CB["packages/cgi/commerce-base<br/>the shared commerce library"]
  A2 --> CB
  A3 --> CB
  CB --> DIE["cgi/data-interface-espn"]
  CB --> DID["cgi/data-interface-disney"]
  CB --> DIH["cgi/data-interface-hulu"]
  A1 --> DIE
  A4 --> DIE
  CB --> SDKS["cgi/sdk-session<br/>BAM + Identity SDK bootstrap"]
  A4 --> SDKS
  CB --> SHARED["dictionary · remote-config<br/>instrumentation · observe<br/>identity-auth · privacy-consent<br/>cgi-design-components + tokens"]
  A4 --> SHARED
  A4 --> MK["packages/marketing/<br/>growth-cms-api · growth-components<br/>growth-utils · growth-dx<br/>media-api · plans-pricing-api"]
  MK --> STI["marketing/stitch"]
  A4 --> FTR["cgi/footer"]
  A1 --> FTR
  MUI["marketing/ui/core + ui/disneyplus<br/>Disney+ scoped — ESPN consumes neither"]
  MK -.-> MUI
  classDef app fill:#1e2340,stroke:#6366f1,color:#ececff
  classDef core fill:#16283a,stroke:#38bdf8,color:#e6f4ff
  classDef notespn fill:#2a1c28,stroke:#5a5a78,color:#d8d8e6
  class A1,A2,A3,A4 app
  class CB,DIE,DID,DIH,SDKS,SHARED,MK,STI,FTR core
  class MUI notespn`;

const triageDiagram = String.raw`flowchart TD
  S["Symptom on an ESPN screen"] --> Q1{"Which domain is<br/>the user on?"}
  Q1 -->|"www.espn.com"| OUT["ESPN engineering org<br/>not a cgi-web bug — hand it over"]
  Q1 -->|"plus.espn.com"| Q2{"Is the wrong thing<br/>CMS content?"}
  Q1 -->|"secure.web.plus.espn.com"| Q3{"What kind of<br/>wrongness?"}
  Q2 -->|"copy, image, module order"| CMSL["Cannonball · Spaceball CMS<br/>check the manifest, then the cache"]
  Q2 -->|"renders wrong or crashes"| MKT["apps/marketing-unified/espn<br/>+ marketing/stitch · web-growth"]
  Q3 -->|"a string is wrong or shows a raw key"| CYL["Cypher dictionary<br/>NOT React code"]
  Q3 -->|"right key, wrong words"| EXP["cgi-web copy-override experiment<br/>common/hooks/experiments · xd"]
  Q3 -->|"price off by cents or rounding"| RND["cgi-web apply-legal-rounding.ts<br/>gci-experiences-platform"]
  Q3 -->|"price off by amount"| GLOL["Flex conversion then GLO<br/>outside cgi-web"]
  Q3 -->|"a whole section or plan is missing"| FLEXL["Flex screen service<br/>template slot filled with null"]
  Q3 -->|"plans in the wrong order"| TPLL["Flex template config sortPlanCards<br/>or isPartnerESPN branch"]
  Q3 -->|"was right after a template merge, stale now"| CACHE["Site Config cache<br/>5-10 min per region"]
  Q3 -->|"layout, focus, validation, client state"| REACT["cgi-web React layer<br/>route to the feature team via CODEOWNERS"]
  classDef web fill:#1e2340,stroke:#6366f1,color:#ececff
  classDef back fill:#3a1f14,stroke:#f59e0b,color:#fdf0e2
  classDef foreign fill:#1c1c2a,stroke:#5a5a78,color:#d8d8e6
  class MKT,RND,EXP,REACT web
  class CYL,GLOL,FLEXL,TPLL,CACHE,CMSL back
  class OUT foreign`;

export const toc: TocItem[] = [
  { id: "why-a-map-first", title: "Why a Map Before an Editor", level: 2 },
  { id: "the-repo-landscape", title: "The Repo Landscape", level: 2 },
  { id: "the-opaque-edges", title: "The Opaque Edges of the Map", level: 2 },
  { id: "inside-cgi-web", title: "Inside cgi-web: Apps vs Packages", level: 2 },
  { id: "package-topology", title: "The Package Topology", level: 2 },
  { id: "teams-and-codeowners", title: "Teams & CODEOWNERS", level: 2 },
  { id: "the-layer-stack", title: "The Layer Stack for One ESPN Request", level: 2 },
  { id: "where-screens-are-decided", title: "Where Each Screen's Behaviour Is Decided", level: 2 },
  { id: "the-triage-procedure", title: "The Triage Procedure", level: 2 },
  { id: "vocabulary-map", title: "The Vocabulary Map", level: 2 },
  { id: "conventions-that-bite", title: "Conventions That Bite Newcomers", level: 2 },
  { id: "onboarding-yourself", title: "Onboarding Yourself Into an Unfamiliar Area", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Route Four Tickets", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnReposAndOwnershipMap() {
  return (
    <div className="article-content">
      <p>
        The foundation module, <strong>Three Domains of ESPN Web</strong>, gave you the map of <em>websites</em>: content, sales, checkout. This
        module gives you the map underneath it — <strong>repos, packages, teams, and platforms</strong>. The two are not the same shape. One website
        can be assembled from three repos and five services; one repo serves three brands. The goal here is narrow and high-value: after reading
        this, you should be able to take an ESPN symptom or a Jira ticket and name <strong>the repo, the package, and the owning team</strong> before you open an editor.
      </p>

      <h2 id="why-a-map-first">Why a Map Before an Editor</h2>
      <p>
        The expensive failure mode on ESPN work is not writing bad code — it is writing correct code in the wrong layer. A striking share of ESPN
        &quot;frontend&quot; bugs are not frontend bugs at all: the copy, the prices, the plan ordering, and even <strong>whether a section appears
        on the page</strong> are decided by a backend-for-frontend and a content service, and merely <em>rendered</em> by React. If your first
        instinct is to grep the commerce app, you will spend a day proving a negative.
      </p>
      <p>
        So this module is deliberately map-shaped. Breadth, precision, traceable claims — and one diagram (the layer stack) that every later module in this academy plugs into.
      </p>

      <h2 id="the-repo-landscape">The Repo Landscape</h2>
      <p>There are three repositories in play, and a fourth that belongs to a different engineering organisation entirely.</p>
      <ul>
        <li>
          <strong>cgi-web</strong> — the monorepo. Commerce, Growth and Identity web flows for Disney+, Hulu and ESPN. Next.js Pages Router, React,
          TypeScript, pnpm, Turbo. Both the ESPN marketing app and the ESPN checkout app live here.
        </li>
        <li>
          <strong>growth-life-client-api</strong> (repo outside cgi-web, universally called <strong>Flex</strong> or <strong>GLCA</strong>) — the
          server-driven-UI BFF. It fetches from upstream backends, injects the results into a JSON template, and returns filled screen JSON. Layout, copy and CTA wiring are decided here, not in the client.
        </li>
        <li>
          <strong>growth-life-client-templates</strong> (repo outside cgi-web) — the separate repository holding the real production templates,
          deployed as artefacts via Site Config rather than shipped with Flex. Flex carries only <em>local fixtures</em> of those templates under{" "}
          <code>src/__fixtures__/templates/</code>, so a template you read inside Flex is a fixture and may not match what is deployed.
        </li>
        <li>
          <strong>The ESPN content site repo</strong> — owned by ESPN&apos;s own engineering organisation, not part of this monorepo and not reviewed
          by any team in cgi-web&apos;s CODEOWNERS. The contextualization takeover on <code>www.espn.com</code> lives here.
        </li>
      </ul>

      <h2 id="the-opaque-edges">The Opaque Edges of the Map</h2>
      <p>
        Knowing which parts of the system you <em>cannot</em> read is as valuable as knowing the parts you can. Every system below changes ESPN
        behaviour at runtime and has no source in your editor. If a bug traces to one of them, the fix is a config or content change, not a pull request.
      </p>
      <MermaidDiagram
        chart={landscapeDiagram}
        title="Repo &amp; System Landscape — Readable vs Opaque"
        caption="Green = source you can grep. Amber = runtime services you can only observe through fixtures, logs and dashboards."
        minHeight={550}
      />
      <p>
        The consequence: for the opaque boxes, the repo gives you a <strong>checked-in fixture</strong> as your best available documentation. Two are
        worth bookmarking on day one — the SDK endpoint inventory at{" "}
        <code>packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json</code> and the ESPN remote config at{" "}
        <code>packages/remote-config/src/testing-utils/espn/qa.json</code>. Neither is authoritative for production, but both tell you the shape of what production returns.
      </p>

      <h2 id="inside-cgi-web">Inside cgi-web: Apps vs Packages</h2>
      <p>
        The monorepo splits cleanly in two. <code>apps/</code> holds deployable Next.js applications — thin, brand-specific, mostly configuration.{" "}
        <code>packages/</code> holds the shared libraries where almost all behaviour actually lives. Rule of thumb: if a change is visible on only one
        brand it probably belongs in <code>apps/</code> or a <code>data-interface-*</code> package; if it is visible on all three it belongs in{" "}
        <code>commerce-base</code>.
      </p>
      <ArticleTable caption="The navigation table: where things live in cgi-web and when you would open each area." minWidth={980}>
        <table>
          <thead>
            <tr><th>Area</th><th>Path</th><th>What lives there</th><th>When you&apos;d open it</th></tr>
          </thead>
          <tbody>
            <tr><td>ESPN checkout app</td><td><code>apps/commerce/espn</code></td><td><code>@solo/commerce-espn</code>. Pages Router shell, <code>middleware.page.tsx</code>, <code>next.config.js</code>, Playwright specs, generated dictionary keys. Its <code>src/</code> is only <code>common · hooks · layout · queries · test · types</code>.</td><td>Routing, middleware, env, brand config, ESPN Playwright specs</td></tr>
            <tr><td>Sibling commerce apps</td><td><code>apps/commerce/disneyPlus</code>, <code>apps/commerce/hulu</code></td><td>The same shape, per brand. Note the capital P in <code>disneyPlus</code> — commerce uses it, marketing does not.</td><td>Checking whether a behaviour is ESPN-specific or shared across brands</td></tr>
            <tr><td>Marketing app (Nexus)</td><td><code>apps/marketing-unified/espn</code></td><td><code>@solo/marketing-unified-espn</code>. Landing pages, catch-all CMS routes, Tailwind config. Siblings: <code>disneyplus</code>, <code>hulu</code>, <code>appsupport</code>.</td><td>Anything on <code>plus.espn.com</code> — landing pages, plan card page</td></tr>
            <tr><td>Shared commerce library</td><td><code>packages/cgi/commerce-base</code></td><td><code>@solo/commerce-base</code>. Every real screen: <code>signup/</code>, <code>payments/</code>, <code>identity/</code>, <code>account/</code>, <code>retention/</code>, <code>profiles/</code>, <code>transactional/</code>, plus <code>common/</code>.</td><td>Almost every commerce bug. Start here, not in the app.</td></tr>
            <tr><td>Brand data interfaces</td><td><code>packages/cgi/data-interface-espn</code> (and <code>-disney</code>, <code>-hulu</code>)</td><td>The per-brand API surface — operations, helpers, fixtures, <code>activations/</code>, <code>identity/</code>.</td><td>A backend call is missing, malformed, or brand-divergent</td></tr>
            <tr><td>SDK session</td><td><code>packages/cgi/sdk-session</code></td><td><code>@solo/sdk-session</code> — BamTech Browser SDK + Identity SDK bootstrap, ESPN client id <code>espn-a9b93989</code>, and the endpoint fixtures.</td><td>Session, token, endpoint-resolution or SDK-version problems</td></tr>
            <tr><td>Identity &amp; consent</td><td><code>packages/identity-auth</code>, <code>identity-hulu</code>, <code>mydisney-ui</code>, <code>privacy-consent</code></td><td>MyDisney login/signup UI, Hulu-specific identity, OneTrust consent.</td><td>Login, reauth, consent banners, account linking</td></tr>
            <tr><td>Copy / i18n</td><td><code>packages/dictionary</code></td><td>The Cypher dictionary client plus per-brand fallbacks at <code>src/data/espn/</code>.</td><td>A string is missing, English-fallbacking, or shows a raw placeholder</td></tr>
            <tr><td>Remote config</td><td><code>packages/remote-config</code></td><td>The Sparrow client. Resolves paths, flags, tenant identity and SDK client ids per tenant and environment.</td><td>A URL, flag or tenant id differs between environments</td></tr>
            <tr><td>Observability</td><td><code>packages/instrumentation</code>, <code>packages/observe</code>, <code>packages/analytics</code></td><td>Glimpse metrics emission, Adobe Analytics, Datadog RUM plumbing.</td><td>An event is missing from a dashboard, or you need a log site</td></tr>
            <tr><td>Marketing packages</td><td><code>packages/marketing/*</code></td><td><code>stitch</code> (CMS to React), <code>growth-cms-api</code> (Cannonball + Spaceball), <code>growth-components</code>, <code>growth-utils</code>, <code>growth-dx</code>, <code>media-api</code>, <code>plans-pricing-api</code>, <code>growth-search</code>, <code>styles</code>.</td><td>Anything rendered from CMS content</td></tr>
            <tr><td>Marketing UI</td><td><code>packages/marketing/ui/core</code>, <code>ui/disneyplus</code></td><td>Brand UI component libraries. There is <strong>no <code>ui/espn</code></strong> — and <code>apps/marketing-unified/espn</code> depends on neither package.</td><td>Disney+ marketing UI work only</td></tr>
            <tr><td>Design system</td><td><code>packages/cgi/cgi-design-components</code>, <code>cgi-design-tokens</code>, <code>cgi/footer</code></td><td>Shared primitives, tokens, and the cross-brand footer.</td><td>Visual primitives shared by commerce and marketing</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="package-topology">The Package Topology</h2>
      <p>
        The edges below are read from real <code>package.json</code> dependencies, not inferred. Two are worth pausing on:{" "}
        <code>apps/commerce/espn</code> depends on <strong>both</strong> <code>@solo/data-interface-espn</code> and{" "}
        <code>@solo/data-interface-disney</code>, and the ESPN marketing app also depends on <code>@solo/data-interface-espn</code> and{" "}
        <code>@solo/sdk-session</code>. The marketing/commerce split is a deployment boundary, not a dependency wall.
      </p>
      <MermaidDiagram
        chart={packageTopologyDiagram}
        title="cgi-web Internal Package Topology"
        caption="Three sibling commerce apps all funnel into one shared library; the marketing app runs a parallel stack that shares the cross-cutting packages."
        minHeight={550}
      />
      <CodeBlock
        code={`cgi-web/
├── apps/commerce/            disneyPlus/  hulu/
│   └── espn/                 @solo/commerce-espn            <- ESPN checkout
├── apps/marketing-unified/   appsupport/  disneyplus/  hulu/
│   └── espn/                 @solo/marketing-unified-espn   <- ESPN sales
└── packages/
    ├── cgi/commerce-base/          the shared commerce library
    ├── cgi/data-interface-espn/    the ESPN brand API surface
    ├── cgi/data-interface-disney/  data-interface-hulu/
    ├── cgi/sdk-session/            BAM + Identity SDK bootstrap
    ├── cgi/commerce-utils/  cgi/footer/  cgi-design-components/ + -tokens/
    ├── cgi/profiles-rules/  cgi/profiles-tests/
    ├── marketing/stitch/           CMS document -> React
    ├── marketing/growth-cms-api/   Cannonball + Spaceball
    ├── marketing/growth-components/ growth-utils/ growth-dx/ growth-bff/
    ├── marketing/media-api/ plans-pricing-api/ growth-search/ core/ styles/
    ├── marketing/ui/core/  marketing/ui/disneyplus/   (there is no ui/espn)
    ├── dictionary/          Cypher client + per-brand fallbacks
    ├── remote-config/       Sparrow client
    ├── instrumentation/     observe/         analytics/
    ├── identity-auth/       identity-hulu/   mydisney-ui/
    ├── privacy-consent/     profiles/        profiles-ui/
    └── playwright-utils/    test-utils/      traffic-director-dev/`}
        lang="text"
        filename="cgi-web layout (abridged)"
      />

      <h2 id="teams-and-codeowners">Teams &amp; CODEOWNERS</h2>
      <p>
        The single most useful sentence to internalise: <strong>ownership in cgi-web is organised by feature area, not by brand</strong>. There is no
        ESPN team in <code>.github/CODEOWNERS</code>. If you change the ESPN billing page you get reviewed by the payments team that owns billing for
        all three brands. That is why a &quot;small ESPN change&quot; can pull in reviewers who have never worked on ESPN — and why you must think in feature areas when you scope work.
      </p>
      <ArticleTable caption="Change X, and this is who reviews it. Aliases are taken verbatim from .github/CODEOWNERS." minWidth={980}>
        <table>
          <thead>
            <tr><th>Team alias</th><th>Owns (representative paths)</th><th>ESPN relevance</th></tr>
          </thead>
          <tbody>
            <tr><td><code>@cgi-client/gci-experiences-platform</code></td><td>App shells and configs (<code>apps/commerce/*/pages/api</code>, <code>_app.page.tsx</code>, <code>middleware.page.tsx</code>, <code>next.config.js</code>, Dockerfiles), <code>commerce-base/src/common/**</code>, <code>cgi/sdk-session</code>, <code>cgi/commerce-utils</code>, <code>cgi/cgi-design-*</code>, <code>packages/dictionary</code>, <code>remote-config</code>, <code>instrumentation</code>, <code>observe</code>, <code>analytics</code>, <code>.github/workflows/*</code></td><td><strong>Very high.</strong> Owns the plumbing every ESPN screen sits on, plus SDK, config and copy infrastructure.</td></tr>
            <tr><td><code>@cgi-client/mma</code></td><td><code>commerce-base/src/signup/plans</code>, <code>signup/add-ons</code>, <code>signup/upgrade</code>, <code>signup/welcome-back</code>, <code>signup/cadence</code>, <code>signup/plan-toggle</code>, <code>common/components/flex/offer/</code>, <code>account/billing-history</code>, <code>account/charges</code>, <code>account/subscription-details</code>, <code>account/change-subscription</code>, <code>data-interface-espn/src/activations/</code></td><td><strong>Very high.</strong> Plans, add-ons and the Flex offer components are the heart of the ESPN purchase flow.</td></tr>
            <tr><td><code>@cgi-client/tap</code></td><td><code>commerce-base/src/payments/</code>, <code>src/transactional/</code>, <code>signup/billing*</code>, <code>signup/review-subscription</code>, <code>signup/total-due</code>, <code>signup/terms-conditions</code>, <code>signup/student</code>, <code>account/success</code></td><td><strong>Very high.</strong> Owns the ledger (billing) page and the success page.</td></tr>
            <tr><td><code>@cgi-client/web-growth</code></td><td><code>apps/marketing-unified/</code>, <code>packages/marketing/</code>, <code>packages/cgi/footer/</code>, <code>.github/workflows/growth-*</code></td><td><strong>Very high.</strong> Everything on <code>plus.espn.com</code>.</td></tr>
            <tr><td><code>@cgi-client/auth-access</code></td><td><code>packages/identity-auth/</code>, <code>identity-hulu/</code>, <code>mydisney-ui/</code>, <code>privacy-consent/</code>, most of <code>commerce-base/src/identity/*</code>, <code>common/one-trust</code>, <code>common/oneid</code>, <code>data-interface-espn/src/identity/operations</code></td><td><strong>High.</strong> The MyDisney login step in the ESPN flow.</td></tr>
            <tr><td><code>@cgi-client/xd</code></td><td><code>commerce-base/src/common/components/experiments</code>, <code>common/hooks/experiments</code></td><td><strong>High.</strong> ESPN ships behind <code>wpnx-*</code> flags; copy overrides live here.</td></tr>
            <tr><td><code>@cgi-client/gciex-art</code></td><td><code>commerce-base/src/retention/</code></td><td>Moderate — cancel and save flows.</td></tr>
            <tr><td><code>@cgi-client/profiles</code></td><td><code>packages/profiles/</code>, <code>profiles-ui/</code>, <code>cgi/profiles-rules</code>, <code>cgi/profiles-tests</code>, <code>commerce-base/src/profiles/</code>, <code>identity/license-plate</code>, <code>identity/profile</code></td><td>Lower for the purchase flow; ESPN&apos;s only listed path is <code>data-interface-espn/src/identity/operations/get-account-onboarding-status*</code>.</td></tr>
            <tr><td><em>deliberately unowned</em></td><td><code>packages/dictionary/src/data/*/fallback-manual.ts</code></td><td>CODEOWNERS lists these with <strong>no owner</strong> — the file comment says they are &quot;owned by all teams&quot;. Any team may edit ESPN copy fallbacks without a gatekeeper.</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Where ownership is genuinely unclear.</strong> Three honest gaps. First, the Flex BFF and the templates repo have no owner listed in
        cgi-web at all — they are a different repo with a different team (Flex), so ask rather than guess. Second, the ESPN content site owner is
        &quot;ESPN engineering&quot; as an organisation, not a named reviewable alias. Third, the root <code>CLAUDE.md</code> names teams (NCore, MLP,
        NSB) that have no corresponding path rules in <code>CODEOWNERS</code>, and calls the Growth alias <code>@cgi-client/growth</code> while{" "}
        <code>CODEOWNERS</code> uses <code>@cgi-client/web-growth</code>. When the doc and the file disagree, the file GitHub actually enforces wins.
      </p>

      <h2 id="the-layer-stack">The Layer Stack for One ESPN Request</h2>
      <p>
        This is the centrepiece. Trace one ESPN user from a browser tab to the service that decides what they see. Every later module in this
        academy plugs into a box below, so memorise the order rather than the detail.
      </p>
      <MermaidDiagram
        chart={layerStackDiagram}
        title="End-to-End Layer Stack for an ESPN Web Request"
        caption="Notice the dotted return arrow: Flex sends back filled screen JSON and React renders it. Layout, copy and CTA wiring were already decided upstream."
        minHeight={550}
      />
      <p>Three mechanics in that diagram are the highest-leverage things a newcomer can learn:</p>
      <ul>
        <li>
          <strong>cgi-web does not know Flex&apos;s URL.</strong> It sends a symbolic <code>key</code> and the BamTech SDK resolves it to a URL using
          the <code>client-sdk-configs</code> bootstrap. So &quot;which host did we call?&quot; is answered by the SDK fixture, not by a hardcoded string.
        </li>
        <li>
          <strong>Edge injects the brand.</strong> <code>x-bamtech-partner</code>, account and identity ids, session headers and WeaponX assignments
          are added by Edge in transit — not by cgi-web. cgi-web itself adds essentially one header, <code>X-Bamtech-Sales-Platform</code>.
        </li>
        <li>
          <strong>ESPN-ness is a request property, not a code path.</strong> cgi-web&apos;s ESPN app consumes the <em>shared, partner-agnostic</em>{" "}
          Flex screens; it becomes ESPN because the request carries <code>x-bamtech-partner: espn</code>.
        </li>
      </ul>

      <h2 id="where-screens-are-decided">Where Each Screen&apos;s Behaviour Is Decided</h2>
      <ArticleTable caption="Screen or surface, mapped to the repo that decides it, the team that reviews it, and the bug class it produces." minWidth={1020}>
        <table>
          <thead>
            <tr><th>Screen / surface</th><th>Owning repo &amp; path</th><th>Owning team</th><th>Typical bug class</th></tr>
          </thead>
          <tbody>
            <tr><td>Contextualization takeover</td><td>ESPN content site repo (outside cgi-web)</td><td>ESPN engineering org</td><td>Wrong entry route, missing CTA, TVE vs activation mix-up</td></tr>
            <tr><td>Landing pages (<code>/soccer</code>, <code>/mlbtv</code>, <code>/nflbundle</code>)</td><td>cgi-web <code>apps/marketing-unified/espn</code> + <code>packages/marketing/growth-cms-api</code></td><td><code>@cgi-client/web-growth</code></td><td>Missing CMS module, stale CMS cache, broken link building</td></tr>
            <tr><td>Plan card page / paywall</td><td>Flex shared screen services (<code>growth-life-client-api</code>) + <code>growth-life-client-templates</code></td><td>Flex team (outside cgi-web); <code>@cgi-client/mma</code> for the cgi-web offer components</td><td>Wrong plan order, plan missing, wrong price, wrong badge</td></tr>
            <tr><td>Login (MyDisney)</td><td>cgi-web <code>commerce-base/src/identity/login</code>, <code>packages/identity-auth</code></td><td><code>@cgi-client/auth-access</code></td><td>Redirect loops, session loss, action-grant failures</td></tr>
            <tr><td>Add-ons step</td><td>cgi-web <code>commerce-base/src/signup/add-ons</code></td><td><code>@cgi-client/mma</code></td><td>Step skipped or shown wrongly, offer eligibility</td></tr>
            <tr><td>Billing page (&quot;ledger&quot;)</td><td>cgi-web <code>commerce-base/src/signup/billing*</code>, <code>src/payments/</code></td><td><code>@cgi-client/tap</code></td><td>Payment form layout, totals, rounding, declined states</td></tr>
            <tr><td>Success page</td><td>cgi-web <code>commerce-base/src/account/success</code></td><td><code>@cgi-client/tap</code></td><td>Polling for an activated subscription times out</td></tr>
            <tr><td>Account / subscription details</td><td>cgi-web <code>commerce-base/src/account/subscription-details</code></td><td><code>@cgi-client/mma</code></td><td>Wrong entitlement copy, missing upcoming charge</td></tr>
            <tr><td>Cancel / retention</td><td>cgi-web <code>commerce-base/src/retention/</code></td><td><code>@cgi-client/gciex-art</code></td><td>Save-offer not shown, cancel redirect wrong</td></tr>
            <tr><td>Any string on any screen</td><td>Cypher (no repo) + dictionary fallbacks in cgi-web</td><td>Infrastructure: <code>@cgi-client/gci-experiences-platform</code>; fallback files unowned</td><td>Missing key, English fallback, literal placeholder rendered</td></tr>
            <tr><td>Any experiment gate</td><td>WeaponX (no repo) + <code>commerce-base/src/common/hooks/experiments</code></td><td><code>@cgi-client/xd</code></td><td>Flag not allocated, variant leaked, copy override applied</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="the-triage-procedure">The Triage Procedure</h2>
      <p>Ask these in order. The point is to spend five minutes narrowing to a layer rather than four hours narrowing to a file.</p>
      <MermaidDiagram
        chart={triageDiagram}
        title="Symptom to Layer — Triage Decision Tree"
        caption="Amber outcomes are not code changes at all. Roughly half the branches leave cgi-web entirely."
        minHeight={550}
      />
      <p>Two heuristics do most of the work, and both are counter-intuitive enough that people relearn them the hard way:</p>
      <ul>
        <li>
          <strong>Copy, price and element-presence bugs usually are not React bugs.</strong> Because Flex fills a template and returns JSON, a missing
          section on an ESPN screen most often means a template slot was filled with <code>null</code> by a Flex service. A wrong string most often
          means a Cypher dictionary key. Both look exactly like a rendering bug in the browser.
        </li>
        <li>
          <strong>Grepping a brand name in the BFF is the wrong first move.</strong> Flex does contain ESPN-named routes under{" "}
          <code>src/routes/screens/v1/espn/</code>, but those are the device / OTT screens consumed by Roku, tvOS and native apps — not the screens
          cgi-web renders. Web goes through the shared services. The right move is to open the <em>shared</em> screen service and grep the partner
          predicate: <code>isPartnerESPN</code> or <code>partner === &apos;espn&apos;</code>. There are on the order of seventy such comparisons, and they all live in shared code.
        </li>
      </ul>
      <CodeBlock
        code={`# WRONG first move for a cgi-web ESPN screen bug:
#   these are device/OTT routes (Roku, tvOS), not the web screens
rg --files growth-life-client-api/src/routes/screens/v1/espn

# RIGHT first move: find the partner predicate inside the SHARED services
rg -n "isPartnerESPN|partner === 'espn'" growth-life-client-api/src --glob '!**/*.test.*'

# Confirm which shared screen the web app actually calls
rg -n "screens/v[0-9]+/" cgi-web/apps/commerce/espn/playwright

# Confirm the endpoint the SDK will resolve for ESPN
rg -n "services.flex" \\
  cgi-web/packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json`}
        lang="bash"
        filename="triage-first-moves.sh"
      />

      <h2 id="vocabulary-map">The Vocabulary Map</h2>
      <p>You will hear all of these in your first week, usually without definition. One line each, plus the layer it belongs to.</p>
      <CodeBlock
        code={`CUP         commerce app   Commerce Unified Platform — what apps/commerce/* deploys as (ESPN: secure.web.plus.espn.com).
Nexus       marketing app  Disney streaming's marketing-page platform — apps/marketing-unified/* (ESPN: plus.espn.com).
Flex / GLCA BFF            growth-life-client-api — decides layout, copy and CTA wiring; returns filled screen JSON.
Sparrow     config         Remote-config service behind @solo/remote-config: paths, flags, tenant + SDK client ids, per env.
Cypher      content        The dictionary service every visible string resolves through; a miss logs
                           MISSING_CYPHER_KEY_IN_DICTIONARY rather than throwing.
WeaponX     experiments    Experiment / feature-flag platform behind wpnx-* flags; assignments arrive as
                           Edge-injected headers and SDK flags.
Glimpse     observability  The streaming analytics pipeline @solo/instrumentation emits into.
ledger      screen name    Product vocabulary for the billing / upcoming-charges page.
Edge        gateway        *.api.edge.bamgrid.com — the BamTech gateway that injects x-bamtech-partner,
                           account, identity, session and WeaponX headers.
Stitch      marketing UI   @solo/stitch — converts CMS documents into React via Model -> Builder -> Component -> Registry.
Cannonball  CMS (legacy)   The manifest-based CMS read path, org espnplus.
Spaceball   CMS (target)   The GraphQL CMS read path replacing Cannonball.
Fuzzbucket  CI/CD          Jenkins-driven ephemeral staging envs keyed by branch name (ESPN: espnplus-commerce).
Mariner     CI/CD          How Fuzzbucket/Jenkins deploys to AWS (DEPLOY_WITH_MARINER, MARINER_AWS_ACCOUNT).
GLO         backend        Growth Life Orchestrator — a Flex upstream offer source, alongside IPSE and Offers.`}
        lang="text"
        filename="espn-vocabulary.txt"
      />

      <h2 id="conventions-that-bite">Conventions That Bite Newcomers</h2>
      <ul>
        <li><strong>pnpm only.</strong> Enforced by a preinstall hook. npm or yarn will fail, not warn.</li>
        <li>
          <strong>Node is pinned exactly.</strong> <code>engines.node</code> is <code>22.14.0</code> and <code>engines.pnpm</code> is{" "}
          <code>10.16.0</code>, with a matching Volta pin. A different minor version produces install failures that look like dependency bugs.
        </li>
        <li>
          <strong>Branch names must not exceed 27 characters, and must not contain slashes.</strong> This is not style — Jenkins encodes the branch
          name into the Fuzzbucket environment job name, and longer names break the pipeline. A CI failure you cannot explain is often a branch name.
        </li>
        <li>
          <strong>Workspace protocol and version catalogs.</strong> Internal packages are referenced as <code>workspace:*</code> /{" "}
          <code>workspace:^</code> / <code>workspace:~</code>. Third-party versions come from catalogs in <code>pnpm-workspace.yaml</code> —{" "}
          <code>default</code> plus per-team overrides <code>commerce</code>, <code>growth</code> and <code>identity</code>. Bumping a dependency for
          your team means editing the catalog, not just one <code>package.json</code>.
        </li>
        <li>
          <strong>Progressive <code>AGENTS.md</code> context.</strong> Each directory carries an <code>AGENTS.md</code> with local architecture
          notes, cross-linked to its parent and siblings; the root uses <code>CLAUDE.md</code>. Read the local one before changing anything in a directory.
        </li>
        <li>
          <strong>But: docs drift, and code wins — this came up repeatedly in research.</strong> Concrete examples:{" "}
          <code>apps/commerce/AGENTS.md</code> documents the ESPN dev URL as <code>local.espn.com</code>, while the real one is{" "}
          <code>local.plus.espn.com:5040</code>; the same file&apos;s generic per-brand <code>src/</code> tree does not match ESPN&apos;s actual{" "}
          <code>src/</code>; and the root <code>CLAUDE.md</code> uses a Growth team alias that <code>CODEOWNERS</code> does not. Treat{" "}
          <code>AGENTS.md</code> as a fast orientation layer, then verify against the file you are about to change.
        </li>
      </ul>
      <CodeBlock
        code={`# Verify the branch-name rule before you push (27 chars, no slashes)
git rev-parse --abbrev-ref HEAD | awk '{ print length($0), $0 }'

# Run the ESPN apps locally
pnpm dev:commerce:espn            # the secure checkout app
pnpm dev:marketing-unified:espn   # the plus.espn.com marketing app

# Targeted validation is the norm; full suites are CI's job
pnpm turbo test --filter=@solo/commerce-base
pnpm lint:type-check:commerce:espn`}
        lang="bash"
        filename="local-conventions.sh"
      />

      <h2 id="onboarding-yourself">Onboarding Yourself Into an Unfamiliar Area</h2>
      <p>This procedure is reusable for any directory in the monorepo and takes about twenty minutes.</p>
      <CodeBlock
        code={`1. Read the local AGENTS.md, and its parent. Note claims to verify later.
2. Read package.json: the @solo/* dependency list tells you the real boundaries faster than any prose.
3. Grep CODEOWNERS for the directory path — that is who reviews you, and who to ask. Last match wins.
4. Find the fixtures. __fixtures__/ and testing-utils/ are the only readable description of the
   opaque services this area talks to.
5. Find the tests, especially Playwright specs. They assert real paths and real screen contracts,
   so they document the runtime contract.
6. Grep the partner predicate (partnerName, isPartnerESPN, process.env.PRODUCT) to see where brand
   divergence actually lives.
7. Only now open the component you were sent to change.`}
        lang="text"
        filename="onboarding-procedure.txt"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: &quot;Walk me through what happens when an ESPN user loads the plan selection screen.&quot;"
        intro="A weak answer describes React components. A strong answer names layers and boundaries in order, and identifies which layer decides what."
        steps={[
          "Open with the domain: this is plus.espn.com or the commerce app, not www.espn.com — three different repos serve one brand.",
          "Name the client layer: the app in apps/ is thin; the screen lives in packages/cgi/commerce-base and the API surface in packages/cgi/data-interface-espn.",
          "Name the resolution step: cgi-web sends a symbolic key, and the BamTech Browser SDK resolves it to a URL from the client-sdk-configs bootstrap — the app has no hardcoded host.",
          "Name the gateway: Edge injects x-bamtech-partner: espn plus account, session and WeaponX headers. ESPN-ness is a request property, not a code branch in the client.",
          "Name the decider: Flex (growth-life-client-api) calls GLO, IPSE and Offers, resolves copy through Cypher, fills a template from growth-life-client-templates, and returns screen JSON.",
          "Close with the production implication: because layout and copy are decided server-side, a missing element or wrong string is usually a Flex, template or Cypher problem — so you inspect the response before you touch React.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: &quot;You are handed an ESPN bug. What do you do in the first ten minutes?&quot;"
        intro="Interviewers are testing whether you triage by layer or thrash by grep. Show a procedure, and show that you know where the boundaries are."
        steps={[
          "Establish the domain from the URL: www.espn.com is a different engineering org; plus.espn.com is Nexus; secure.web.plus.espn.com is CUP.",
          "Classify the symptom: string wrongness, price wrongness, element presence, or interaction. The first three usually point outside the React app.",
          "Inspect the actual Flex screen response before reading code — it tells you immediately whether the client received the thing that is missing.",
          "If it did not, go to the shared Flex screen service and grep the partner predicate; never start with the espn-named routes, which are OTT device screens.",
          "If it did, map the path to CODEOWNERS to find the owning feature team, remembering ownership is by feature area, not by brand.",
          "Say the thing that shows seniority: check whether an experiment flag or a stale Site Config cache explains it before you write a fix.",
        ]}
      />

      <h2 id="challenge">Challenge: Route Four Tickets</h2>
      <InterviewChallenge
        title="Triage four ESPN tickets without opening an editor"
        scenario={
          <>
            You have just joined the ESPN effort. Four tickets land in your queue on the same morning. For each one, name the{" "}
            <strong>layer</strong>, the <strong>repo</strong>, and — where it is inside cgi-web — the <strong>owning team alias</strong>. (a) On{" "}
            <code>secure.web.plus.espn.com</code>, the billing page shows <code>subscription.total.label</code> as literal text instead of a
            sentence. (b) On the ESPN plan card page, the annual plan appears above the monthly plan, but only in one market. (c) On{" "}
            <code>plus.espn.com/soccer</code>, a promotional module marketing published an hour ago is not visible. (d) On the ESPN checkout, the
            total is correct but displays as <code>$10.9</code> instead of <code>$10.99</code>.
          </>
        }
        tasks={[
          "For each ticket, name the layer from the end-to-end stack diagram, then the repo, then the owning team where one exists in CODEOWNERS.",
          "For ticket (b), explain why grepping 'espn' in the Flex repo is the wrong first move, and state the grep you would run instead.",
          "For ticket (c), name two distinct explanations that do not involve any code change, and say how you would distinguish them.",
          "Identify which of the four is most likely to be misfiled to the wrong team, and explain what about cgi-web's ownership model causes that.",
        ]}
        pitfalls={[
          "Assuming a visible-text bug is a React bug. Copy resolves through Cypher, and a raw key on screen is the signature of a dictionary miss, not a rendering fault.",
          "Assuming plan ordering is client-side. Order is decided by Flex template configuration and partner-predicate branches in shared services.",
          "Looking for an ESPN team in CODEOWNERS. There is none — ownership is by feature area, so you must map the path, not the brand.",
          "Reading Flex's src/__fixtures__/templates as production truth. The deployed templates live in growth-life-client-templates and reach runtime via Site Config.",
          "Forgetting the cache. A correct content or template change can be invisible for 5-10 minutes per region.",
        ]}
        signal="A strong candidate answers in layers before repos, and in repos before files. They spontaneously separate 'not a code change' outcomes from 'a code change, by this team' outcomes, and they name the partner-predicate pattern rather than searching for brand-named directories."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a) Literal <code>subscription.total.label</code> on the billing page.</strong> Layer: content. Repo: none — this is Cypher, the
          dictionary service. A raw key rendered as text is the canonical signature of a missing dictionary entry; the client logs it rather than
          throwing. If you must touch cgi-web, the fallback lives in <code>packages/dictionary/src/data/espn/</code>, which <code>CODEOWNERS</code>{" "}
          deliberately leaves unowned. Only if the key itself is wrong does this become a Flex change (the service emits the cypher key), or a cgi-web
          change if a <code>wpnx-*</code> copy-override experiment is rewriting keys — that hook is owned by <code>@cgi-client/xd</code>.
        </p>
        <p>
          <strong>(b) Annual above monthly in one market.</strong> Layer: BFF plus templates. Repo: <code>growth-life-client-api</code> and{" "}
          <code>growth-life-client-templates</code> — outside cgi-web, so no cgi-web team alias applies. Plan ordering comes from template
          configuration (a <code>sortPlanCards</code>-style setting) or from a partner-predicate branch in the shared offers logic. Grepping{" "}
          <code>espn</code> in Flex leads you to <code>src/routes/screens/v1/espn/</code>, which are the Roku / tvOS device screens the web app never
          calls. The correct search is <code>rg -n &quot;isPartnerESPN|partner === &apos;espn&apos;&quot;</code> inside the shared screen and offers
          services. The single-market scoping is also a strong hint to check a WeaponX allocation before anything else.
        </p>
        <p>
          <strong>(c) New promotional module invisible on <code>/soccer</code>.</strong> Layer: CMS / content. Two non-code explanations: the CMS read
          path is serving cached content (Cannonball or Spaceball caching, and prod Spaceball is cached), or the module was published to a path or
          environment the app is not reading. Distinguish them by querying the CMS read path directly for that path: present in the CMS but absent in
          the page means cache; absent in both means publishing. Only if the module is in the response and still not rendered does this become a
          cgi-web bug, in <code>apps/marketing-unified/espn</code> or <code>packages/marketing/stitch</code> — a missing registry entry — owned by <code>@cgi-client/web-growth</code>.
        </p>
        <p>
          <strong>(d) <code>$10.9</code> instead of <code>$10.99</code>.</strong> Layer: client formatting. Repo: cgi-web. This is the one ticket that
          really is a frontend bug: the amount is right and only the presentation is wrong, which points at currency formatting and the legal-rounding
          helper in <code>commerce-base/src/common/lib/</code>, owned by <code>@cgi-client/gci-experiences-platform</code>. Contrast with a price that
          is wrong <em>by amount</em>, which is a Flex conversion or GLO problem — the distinction between &quot;wrong by cents or rounding&quot; and
          &quot;wrong by amount&quot; is exactly the line between the client and the backend.
        </p>
        <p>
          <strong>Most likely to be misfiled: (a).</strong> It presents as broken UI text on the billing page, so it gets sent to the payments team
          that owns <code>signup/billing*</code>. In reality it is a dictionary entry with no owning team at all. That is the direct consequence of
          cgi-web organising ownership by feature area rather than by layer or brand: the path that renders a symptom and the layer that causes it frequently have different owners.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Three repos matter: <strong>cgi-web</strong> (the monorepo), <strong>growth-life-client-api</strong> (the Flex BFF that decides screens),
          and <strong>growth-life-client-templates</strong> (the deployed templates) — plus ESPN&apos;s own content-site repo in a different org.
        </li>
        <li>
          Half the system is not a repo you can read: Edge, <code>client-sdk-configs</code>, Sparrow, Cypher, WeaponX, Cannonball/Spaceball,
          GLO/IPSE/Offers, Vault. For those, checked-in fixtures are your documentation and the fix is config or content, not a PR.
        </li>
        <li>
          In cgi-web, <code>apps/</code> is thin and <code>packages/cgi/commerce-base</code> is where commerce behaviour actually lives — three sibling commerce apps and one marketing app all funnel into shared packages.
        </li>
        <li>
          <strong>Ownership is by feature area, not by brand.</strong> There is no ESPN team in <code>.github/CODEOWNERS</code>; the ESPN billing
          page is reviewed by <code>@cgi-client/tap</code>, plans by <code>@cgi-client/mma</code>, <code>plus.espn.com</code> by <code>@cgi-client/web-growth</code>.
        </li>
        <li>
          ESPN-ness is a <em>request property</em>: cgi-web calls shared, partner-agnostic Flex screens and Edge injects{" "}
          <code>x-bamtech-partner: espn</code>. So grepping a brand name in the BFF is the wrong first move — grep the partner predicate inside the shared services instead.
        </li>
        <li>
          Triage by layer before file: copy, price and element-presence bugs usually belong to the backend or content layer, and{" "}
          <code>AGENTS.md</code> claims drift from reality often enough that code always wins.
        </li>
      </ul>
    </div>
  );
}
