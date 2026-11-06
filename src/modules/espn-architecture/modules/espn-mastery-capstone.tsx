import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fullStackMap = String.raw`flowchart TD
  subgraph L1["Layer 1 Browser"]
    B1["www.espn.com<br/>contextualization takeover"]
    B2["plus.espn.com<br/>sales pages"]
    B3["secure.web.plus.espn.com<br/>checkout"]
  end
  subgraph L2["Layer 2 Edge and CDN"]
    E1["Akamai geo<br/>x-aka-user-geo and dss-physical-country"]
    E2["Disney Edge<br/>stamps x-bamtech-partner espn<br/>plus account, session and weaponx headers"]
  end
  subgraph L3["Layer 3 Next.js app shells in cgi-web"]
    A1["apps/marketing-unified/espn<br/>one catch-all page serving 29 CMS routes"]
    A2["apps/commerce/espn<br/>79 thin page stubs, 42 flag-gated"]
  end
  subgraph L4["Layer 4 Server render pipelines"]
    S1["marketing get-server-side-props<br/>447 lines, four exits"]
    S2["buildGetServerSideProps<br/>shared ordered pipeline plus ESPN wrapper"]
  end
  subgraph L5["Layer 5 Shared packages"]
    P1["commerce-base<br/>all checkout behaviour"]
    P2["stitch and growth-components<br/>CMS renderer and planCard"]
    P3["cgi-design-tokens<br/>espn preset and theme"]
    P4["identity-auth and sdk-session"]
    P5["data-interface-espn<br/>908 source lines, zero fetch"]
    P6["instrumentation, observe, remote-config, dictionary"]
  end
  subgraph L6["Layer 6 Client runtime"]
    C1["Jotai atoms, React Query, XState"]
    C2["BamTech Browser SDK<br/>resolves symbolic keys to URLs"]
    C3["OneID v4 script"]
  end
  subgraph L7["Layer 7 Backends and config planes"]
    F1["Flex BFF growth-life-client-api<br/>screens and executions"]
    F2["growth-life-client-templates<br/>served via Site Config"]
    F3["Cannonball CDN JSON<br/>and Spaceball GraphQL"]
    F4["Cypher dictionary<br/>tenant espn"]
    F5["Sparrow remote config"]
    F6["WeaponX assignments"]
    F7["OneID and IPSE"]
    F8["GLO offers and the Genie catalogue"]
  end
  subgraph L8["Layer 8 Telemetry"]
    O1["Datadog RUM espn-nexus"]
    O2["Datadog RUM web-solo-commerce-espn"]
    O3["Adobe Analytics and Launch"]
  end
  B1 -->|"Browse Plans"| B2
  B2 -->|"pref query param"| B3
  B2 --> E1
  B3 --> E1
  E1 --> E2
  E2 --> A1
  E2 --> A2
  A1 --> S1
  A2 --> S2
  S1 --> P2
  S1 --> F3
  S2 --> P1
  S2 --> F5
  S2 --> F4
  P3 --> A1
  P3 --> A2
  P1 --> C1
  P2 --> C1
  C1 --> P4
  P4 --> C3
  C1 --> C2
  C2 --> P5
  P5 --> F1
  C3 --> F7
  F1 --> F2
  F1 --> F4
  F1 --> F6
  F1 --> F8
  A1 --> O1
  A1 --> O3
  P6 --> O2
  P6 --> O3`;

const academyMap = String.raw`flowchart LR
  subgraph PATH1["Path 1 Foundations"]
    M1["three-domains-of-espn-web"]
    M2["espn-products-plans-and-entitlements"]
    M3["espn-repos-and-ownership-map"]
  end
  subgraph PATH2["Path 2 Sales layer"]
    M4["espn-marketing-app-anatomy"]
    M5["nexus-data-fetching-cannonball-spaceball"]
    M6["plan-cards-and-the-handoff"]
  end
  subgraph PATH3["Path 3 Checkout layer"]
    M7["espn-commerce-app-anatomy"]
    M8["espn-data-interface-and-sdk"]
    M9["flex-server-driven-ui-for-espn"]
    M10["espn-identity-and-auth"]
    M11["espn-checkout-flow-screen-by-screen"]
    M12["espn-vs-dplus-vs-hulu-divergences"]
  end
  subgraph PATH4["Path 4 Config and content"]
    M13["flags-and-experiments-for-espn"]
    M14["region-i18n-and-copy-for-espn"]
    M15["espn-brand-theming-and-ui"]
  end
  subgraph PATH5["Path 5 Operate and master"]
    M16["espn-observability-and-analytics"]
    M17["espn-local-dev-testing-and-ci"]
    M18["espn-mastery-capstone<br/>synthesis, not new teaching"]
    M16 --> M17 --> M18
  end
  PATH1 -->|"gives you the vocabulary<br/>and the ownership map"| PATH2
  PATH2 -->|"ends at one URL<br/>with a pref param"| PATH3
  PATH3 -->|"raises the question<br/>who set this value"| PATH4
  PATH4 -->|"raises the question<br/>how would I have seen this"| PATH5`;

const purchaseTrace = String.raw`sequenceDiagram
  autonumber
  participant U as User browser
  participant ESPN as ESPN content site
  participant NEX as Nexus marketing app
  participant EDGE as Disney Edge
  participant CUP as CUP commerce app
  participant SDK as BamTech Browser SDK
  participant FLEX as Flex BFF
  participant UP as GLO and Cypher and WeaponX
  U->>ESPN: taps Subscribe next to a live game
  ESPN-->>U: contextualization takeover, three exits
  U->>NEX: chooses Browse Plans, lands on a CMS route
  NEX->>NEX: middleware injects language, region, physical-location
  NEX->>UP: Cannonball manifest then snapshot, or one Spaceball query
  NEX-->>U: planCard rendered with CMS fallback price values
  U->>EDGE: clicks the CTA to secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited
  EDGE->>CUP: request plus x-bamtech-partner espn and session headers
  CUP->>UP: Sparrow config, then Cypher dictionary, inside the SSP pipeline
  CUP-->>U: route gate passes, LoginRequired bounces an anonymous user
  U->>CUP: OneID v4 flow, id token exchanged for an access token
  CUP->>CUP: identity/loading runs 12 ordered handlers, first match wins
  CUP-->>U: add-ons only if the route flag is on and pref is present
  U->>CUP: arrives at the ledger
  CUP->>SDK: getFlexScreen with key subscriptionPreviewSecondary version v2
  SDK->>FLEX: POST screens v2, URL resolved from the bootstrap config
  FLEX->>UP: offers from GLO, copy keys from Cypher, treatment from WeaponX
  FLEX-->>SDK: filled template plus metadata.configurationId
  SDK-->>CUP: FlexResponse
  CUP-->>U: ledger renders from models and element components
  U->>CUP: submits Agree and Subscribe
  CUP->>SDK: flexExecution key subscriptionSignup version v2
  SDK->>FLEX: PUT execution v2 subscription signup
  FLEX->>UP: charge and create the subscription
  FLEX-->>CUP: success payload with a navigate action
  CUP->>CUP: SIGNUP_SUCCESS to RUM and to unsampled logs
  CUP-->>U: success screen, then handoff back to an ESPN watch surface
  Note over CUP,UP: charged is not entitled is not activated is not playable`;

const triageTree = String.raw`flowchart TD
  START["A report arrives"] --> Q1{"Which domain is the URL on"}
  Q1 -->|"www.espn.com"| OUT["ESPN org repo<br/>not cgi-web, not Flex"]
  Q1 -->|"plus.espn.com"| MKT{"Does the page render at all"}
  Q1 -->|"secure.web.plus.espn.com"| CUP{"Does the route return 404"}
  MKT -->|"the 500 page"| MKT1["Deliberate throw in the GSSP pipeline<br/>config or CMS fetch failed"]
  MKT -->|"404"| MKT2["Path missing from the Cannonball manifest<br/>or the locale is not published"]
  MKT -->|"renders but wrong"| MKT3{"Wrong what"}
  MKT3 -->|"price"| MKT4["CMS offer-token fallback fields<br/>token replacement is still stubbed"]
  MKT3 -->|"link target"| MKT5["CMS authored href<br/>build-link passes it through verbatim"]
  MKT3 -->|"a component is missing"| MKT6["zod fail-soft, look for stitchWarn"]
  CUP -->|"yes"| CUP1["Does the page file exist, then read the<br/>isRouteEnabled flag for that environment"]
  CUP -->|"no"| CAP["Capture the raw Flex JSON"]
  CAP --> Q2{"Is the wrong value present in the JSON"}
  Q2 -->|"present and wrong"| BACK["Flex, GLO, Cypher, WeaponX or the template repo<br/>read metadata.configurationId first"]
  Q2 -->|"correct in JSON, wrong on screen"| FRONT["cgi-web render layer<br/>rounding, modal filter, style allowlist, copy override"]
  Q2 -->|"absent from the JSON"| ABSENT["Flex never built it<br/>or the template has no slot for it"]
  BACK --> ENGINE{"Is the screen migrating"}
  ENGINE -->|"yes"| BOTH["Repeat for both engines<br/>a fix in one is a silent no-op in the other"]
  ENGINE -->|"no"| DONE["Assign to the owning system"]`;

export const toc: TocItem[] = [
  { id: "the-one-page-map", title: "The One-Page Map", level: 2 },
  { id: "who-owns-each-layer", title: "Who Owns Each Layer", level: 3 },
  { id: "the-academy-map", title: "How the Academy Itself Is Built", level: 2 },
  { id: "one-purchase-end-to-end", title: "One Purchase, End to End", level: 2 },
  { id: "the-sequence", title: "The Sequence", level: 3 },
  { id: "hop-by-hop", title: "Hop by Hop, With Failure Modes", level: 3 },
  { id: "the-url-is-the-contract", title: "The URL Is the Whole Contract", level: 3 },
  { id: "master-triage", title: "The Master Triage Table", level: 2 },
  { id: "triage-heuristic", title: "The Ordered Triage Heuristic", level: 3 },
  { id: "triage-decision-tree", title: "The Decision Tree", level: 3 },
  { id: "triage-commands", title: "Commands That Answer Question One", level: 3 },
  { id: "triage-table", title: "Symptom to Owner", level: 3 },
  { id: "defect-register", title: "The Defect & Doc-Drift Register", level: 2 },
  { id: "pre-pr-checklist", title: "Pre-PR Checklist for ESPN Work", level: 2 },
  { id: "five-minute-narrative", title: "The 5-Minute Architecture Narrative", level: 2 },
  { id: "capstone-challenge", title: "Capstone Challenge: A Multi-Layer Incident", level: 2 },
  { id: "self-assessment", title: "Self-Assessment", level: 2 },
  { id: "edges-of-the-map", title: "The Edges of the Map", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnMasteryCapstone() {
  return (
    <div className="article-content">
      <p>
        Seventeen modules taught you the parts. This one exists to make them one
        thing. Nothing here is new material: every fact below was established in
        a sibling module or in the research behind it, and where two sources
        disagreed the corrections register wins and the module says so. What is
        new is the <em>shape</em> — one diagram of the whole stack, one purchase
        traced without skipping a hop, one triage table instead of nine, and one
        honest list of what this academy could not determine.
      </p>
      <p>
        Read it once end to end. After that, treat it as four artifacts you come
        back to: <strong>the map</strong> when you are lost,{" "}
        <strong>the trace</strong> when you need to know where a value came from,{" "}
        <strong>the triage table</strong> when a report lands, and{" "}
        <strong>the register</strong> when you have a spare afternoon and want to
        fix something real.
      </p>

      <h2 id="the-one-page-map">The One-Page Map</h2>
      <p>
        Eight layers between a user tapping Subscribe and a subscription
        existing. Two of those layers are Next.js apps you can open in an editor.
        One is a BFF in a second repo. Four are systems you cannot read at all —
        Edge, Sparrow, Cypher, WeaponX, GLO, Site Config — for which the
        checked-in fixtures are your only documentation. That ratio is the single
        most important structural fact about working on ESPN.
      </p>
      <MermaidDiagram
        chart={fullStackMap}
        title="ESPN Web, Browser to Backend, In One Diagram"
        caption="Notice how few boxes are cgi-web. Layers 3 through 6 are the repo; layers 2, 7 and most of 8 are configuration and services you influence but do not compile."
        minHeight={550}
      />

      <h3 id="who-owns-each-layer">Who Owns Each Layer</h3>
      <p>
        <strong>Layer 1, the browser and the three domains.</strong> Three
        websites under one brand: the content site owned by ESPN&apos;s own
        engineering org, the sales site on Nexus, the checkout on CUP. Covered in{" "}
        <em>The Three Domains of ESPN Web</em>, which is also the module that
        gives you the vocabulary for routing a bug before reading any code.
      </p>
      <p>
        <strong>Layer 2, Edge and CDN.</strong> Akamai resolves physical
        location; Disney Edge stamps <code>x-bamtech-partner: espn</code> along
        with account, session and WeaponX assignment headers. cgi-web never sets
        any of them, which is why &quot;the partner is wrong&quot; is never a
        cgi-web bug. Covered in <em>Flex &amp; Server-Driven UI for ESPN</em> and{" "}
        <em>Repos, Packages &amp; the Ownership Map</em>.
      </p>
      <p>
        <strong>Layer 3, the app shells.</strong>{" "}
        <code>apps/marketing-unified/espn</code> is one seven-line optional
        catch-all page serving 29 CMS routes —{" "}
        <em>ESPN Marketing App Anatomy</em>.{" "}
        <code>apps/commerce/espn</code> is 79 page stubs of roughly 20 to 30 lines
        each, 42 of them flag-gated — <em>ESPN Commerce App Anatomy</em>.
      </p>
      <p>
        <strong>Layer 4, the server pipelines.</strong> Marketing has a 447-line
        ordered pipeline with four exits, one of which is a deliberate{" "}
        <code>throw</code> that renders <code>/500</code> —{" "}
        <em>ESPN Marketing App Anatomy</em>. Commerce has the shared{" "}
        <code>buildGetServerSideProps</code> with zero{" "}
        <code>product === &apos;espn&apos;</code> branches, wrapped by an ESPN
        layer that adds exactly two behaviours — <em>ESPN Commerce App Anatomy</em>{" "}
        and <em>ESPN vs Disney+ vs Hulu</em>.
      </p>
      <p>
        <strong>Layer 5, the shared packages.</strong>{" "}
        <code>commerce-base</code> holds essentially all checkout behaviour;{" "}
        <code>stitch</code> plus <code>growth-components</code> render CMS content
        including the <code>planCard</code> ESPN does not override;{" "}
        <code>cgi-design-tokens</code> supplies the ESPN preset and theme;{" "}
        <code>data-interface-espn</code> is a 908-line adapter with zero{" "}
        <code>fetch</code> calls. Covered by <em>Plan Cards &amp; The Hand-Off</em>,{" "}
        <em>ESPN Brand, Theming &amp; UI Components</em> and{" "}
        <em>ESPN&apos;s Data Interface &amp; the Browser SDK</em>.
      </p>
      <p>
        <strong>Layer 6, the client runtime.</strong> Jotai for global state,
        React Query for server state, XState for the in-house login machine; the
        BamTech Browser SDK resolves symbolic endpoint keys to URLs; the OneID v4
        script authenticates. <em>ESPN Identity &amp; Auth</em> and{" "}
        <em>ESPN&apos;s Data Interface &amp; the Browser SDK</em>.
      </p>
      <p>
        <strong>Layer 7, backends and config planes.</strong> Flex decides what
        every commerce screen contains, filling templates that live in a third
        repo and are served through Site Config; Cannonball and Spaceball serve
        marketing content; Cypher holds every string; Sparrow holds per-brand
        config and route flags; WeaponX holds experiment assignments; GLO and the
        Genie catalogue hold offers and prices. Covered by{" "}
        <em>Flex &amp; Server-Driven UI for ESPN</em>,{" "}
        <em>Nexus Data Fetching</em>, <em>Region, Localization &amp; Copy for ESPN</em>{" "}
        and <em>Flags &amp; Experiments for ESPN</em>.
      </p>
      <p>
        <strong>Layer 8, telemetry.</strong> Two disconnected Datadog RUM
        applications — <code>espn-nexus</code> and{" "}
        <code>web-solo-commerce-espn</code> — plus Adobe Analytics and Launch as
        the actual analytics vendor. <em>ESPN Observability &amp; Analytics</em>.
        And <em>ESPN Local Dev, Testing &amp; CI</em> tells you which of these
        layers a CI check actually exercises, which is fewer than you would hope.
      </p>

      <h2 id="the-academy-map">How the Academy Itself Is Built</h2>
      <p>
        Worth one diagram, because the ordering was not arbitrary and because
        when a gap shows up in the self-assessment below you want to know which
        path to re-enter.
      </p>
      <MermaidDiagram
        chart={academyMap}
        title="Five Paths, Eighteen Modules"
        caption="Each path answers a question the previous one raises. Path 2 ends at a URL; Path 3 opens with what receives it."
        minHeight={480}
      />

      <h2 id="one-purchase-end-to-end">One Purchase, End to End</h2>
      <p>
        This is the spine of the module. One real ESPN Unlimited purchase, from
        the takeover on the content site to an entitlement, naming at every hop
        the domain, the repo, the owning team, the key file and the specific way
        that hop breaks. If you can narrate this from memory you can debug almost
        anything in the system.
      </p>

      <h3 id="the-sequence">The Sequence</h3>
      <MermaidDiagram
        chart={purchaseTrace}
        title="One ESPN Purchase, Every Hop"
        caption="Two details to notice: the price the user first sees and the price they are charged come from different systems, and the offer sent to the purchase endpoint comes from the Flex action payload, not from the URL."
        minHeight={520}
      />

      <h3 id="hop-by-hop">Hop by Hop, With Failure Modes</h3>
      <ArticleTable
        caption="The same trace as a table. The rightmost column is the reason this table is worth more than the diagram."
        minWidth={1080}
      >
        <table>
          <thead>
            <tr>
              <th>Hop</th>
              <th>Domain</th>
              <th>Repo or system</th>
              <th>Owning team</th>
              <th>Key file</th>
              <th>What goes wrong here</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Contextualization takeover</td>
              <td>
                <code>www.espn.com</code>
              </td>
              <td>ESPN org repo, different GitHub org</td>
              <td>ESPN engineering</td>
              <td>Nothing in cgi-web</td>
              <td>
                Stale promo copy, wrong exits. It is a takeover with no URL, so
                &quot;send me the link&quot; is a useless question.
              </td>
            </tr>
            <tr>
              <td>2. Sales page render</td>
              <td>
                <code>plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>apps/marketing-unified/espn</code>
              </td>
              <td>
                <code>@cgi-client/web-growth</code>
              </td>
              <td>
                <code>src/pages/[[...path]].page.tsx</code>,{" "}
                <code>get-server-side-props.ts</code>
              </td>
              <td>
                404 when the path is absent from the Cannonball manifest or the
                locale is unpublished; a deliberate <code>throw</code> renders{" "}
                <code>/500</code> on config or CMS failure.
              </td>
            </tr>
            <tr>
              <td>3. Plan card and its price</td>
              <td>
                <code>plus.espn.com</code>
              </td>
              <td>
                CMS content plus{" "}
                <code>packages/marketing/plans-pricing-api</code>
              </td>
              <td>Growth, and the content authors</td>
              <td>
                <code>src/tokens.ts</code>, registry key{" "}
                <code>planCard</code>
              </td>
              <td>
                Prices are offer tokens that <strong>always</strong> resolve to
                the CMS <code>fallback_*</code> fields today, because token
                replacement is stubbed behind a TODO. A stale fallback is a
                content bug, not a rendering bug.
              </td>
            </tr>
            <tr>
              <td>4. The hand-off URL</td>
              <td>Crosses the boundary</td>
              <td>CMS-authored href</td>
              <td>Content authors</td>
              <td>
                <code>packages/marketing/stitch/src/builders/build-link.ts</code>
              </td>
              <td>
                <code>build-link</code> passes <code>href</code> through
                verbatim, so a wrong <code>pref</code> cannot be validated,
                tested or fixed in this repo. No campaign or attribution params
                are forwarded — a known product gap.
              </td>
            </tr>
            <tr>
              <td>5. Edge</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>Disney Edge, not a repo you can read</td>
              <td>Platform</td>
              <td>Not applicable</td>
              <td>
                A wrong <code>x-bamtech-partner</code> makes every downstream
                screen render as another brand. Never a cgi-web bug.
              </td>
            </tr>
            <tr>
              <td>6. Route gate</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>apps/commerce/espn</code> plus Sparrow
              </td>
              <td>Feature-area team, per route</td>
              <td>
                <code>pages/commerce/billing/index.page.tsx</code>,{" "}
                <code>is-route-enabled.ts</code>
              </td>
              <td>
                A falsy Sparrow flag returns{" "}
                <code>{"{ notFound: true }"}</code> with no log and no error.
                Your first 404 is usually correct behaviour.
              </td>
            </tr>
            <tr>
              <td>7. SSP pipeline</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                <code>@cgi-client/gci-experiences-platform</code>
              </td>
              <td>
                <code>common/lib/build-get-server-side-props.ts</code>
              </td>
              <td>
                Composition-function props are spread last and can silently
                overwrite <code>commerceAppConfig</code> or{" "}
                <code>dictionary</code>. The gate does not short-circuit, so
                Sparrow and the dictionary are still fetched before a 404.
              </td>
            </tr>
            <tr>
              <td>8. Login</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>commerce-base/src/identity</code>
              </td>
              <td>
                <code>@cgi-client/auth-access</code>
              </td>
              <td>
                <code>login-wrapper-page.tsx</code>,{" "}
                <code>oneid-login-page.tsx</code>
              </td>
              <td>
                ESPN takes the OneID v4 branch, not Identity v5. Three
                inconsistent <code>redirectURL</code> validators exist; pick the
                strictest that does the job.
              </td>
            </tr>
            <tr>
              <td>
                9. <code>/identity/loading</code>
              </td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>Auth &amp; Access plus the flow owners</td>
              <td>
                <code>common/hooks/use-navigation-redirect.tsx</code>,{" "}
                <code>common/redirect/handlers.ts</code>
              </td>
              <td>
                Twelve ordered handlers, first match wins. The fallbacks resolve
                through Sparrow and eject the user out of CUP to an ESPN watch
                surface, which reads as a broken checkout if you do not know it.
              </td>
            </tr>
            <tr>
              <td>
                10. <code>/commerce/add-ons</code>
              </td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>commerce-base/src/signup</code>
              </td>
              <td>
                <code>@cgi-client/mma</code>
              </td>
              <td>
                <code>handlers.ts</code>{" "}
                <code>addOnsExperimentRedirectHandler</code>
              </td>
              <td>
                Needs the route flag <em>and</em> a <code>pref</code> param.
                Missing either one skips the step silently. This handler also
                mislabels itself in RUM — see the register below.
              </td>
            </tr>
            <tr>
              <td>11. The ledger</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>
                cgi-web <code>commerce-base/src/signup</code>
              </td>
              <td>
                <code>@cgi-client/tap</code>
              </td>
              <td>
                <code>signup/pages/billing-page.tsx</code>
              </td>
              <td>
                One route, two Flex contracts:{" "}
                <code>subscriptionPreview</code> v1 GET versus{" "}
                <code>subscriptionPreviewSecondary</code> v2 POST. ESPN&apos;s V2
                flag lives in WeaponX, not Sparrow, so every local run and every
                spec has to inject it.
              </td>
            </tr>
            <tr>
              <td>12. Flex screen resolution</td>
              <td>Server side</td>
              <td>
                <code>growth-life-client-api</code>
              </td>
              <td>Flex / Growth</td>
              <td>
                shared screen services, <code>isPartnerESPN</code>,{" "}
                <code>screen/common/configuration.ts</code>
              </td>
              <td>
                Only the first featureId whose variant maps to a{" "}
                <code>templates</code> entry applies a template config, and the
                ESPN paywall config lists four featureIds against seven
                variants. Overlapping allocations drop silently.
              </td>
            </tr>
            <tr>
              <td>13. Template and copy</td>
              <td>Server side</td>
              <td>
                <code>growth-life-client-templates</code> via Site Config, plus
                Cypher
              </td>
              <td>Templates owners, localization</td>
              <td>
                <code>metadata.configurationId</code> is your receipt
              </td>
              <td>
                Site Config caches 5 to 10 minutes per region; a missing Cypher
                key fails soft to the empty string and logs{" "}
                <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code>.
              </td>
            </tr>
            <tr>
              <td>14. Purchase execution</td>
              <td>
                <code>secure.web.plus.espn.com</code>
              </td>
              <td>cgi-web plus Flex plus GLO</td>
              <td>
                <code>@cgi-client/tap</code>
              </td>
              <td>
                <code>signup/queries/use-flex-billing-execution.tsx</code>
              </td>
              <td>
                One{" "}
                <code>PUT execution/v2/subscription/signup</code>. The{" "}
                <code>offers</code> field comes from the Flex action payload,
                not the URL — the single most useful fact when triaging a
                wrong-charge report. Missing ids throw before the request.
              </td>
            </tr>
            <tr>
              <td>15. Success and entitlement</td>
              <td>
                <code>secure.web.plus.espn.com</code> then ESPN surfaces
              </td>
              <td>cgi-web, then GLO and partner activation</td>
              <td>TAP, then platform</td>
              <td>
                <code>signup/side-effects/flex-billing-execution.ts</code>
              </td>
              <td>
                <code>SIGNUP_SUCCESS</code> is emitted to RUM{" "}
                <em>and</em> to unsampled logs deliberately. Charged, entitled,
                activated and playable are four different states; only the first
                is visible from this repo.
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="the-url-is-the-contract">The URL Is the Whole Contract</h3>
      <p>
        Between the sales layer and the checkout layer there is no session, no
        cart and no shared client state. There is a URL. Memorising its
        vocabulary saves more debugging time than any other single fact in this
        academy, because the entry parameters determine what the checkout asks
        for and therefore what it charges.
      </p>
      <CodeBlock
        code={`# The authored hand-off hrefs, taken from the ESPN CMS fixtures
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=espn_select
https://secure.web.plus.espn.com/commerce/billing?pref=espn_nfl_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=disney_hulu_espn_nfl_bundle
https://secure.web.plus.espn.com/identity/login?redirectURL=https://plus.espn.com/

Param vocabulary
  pref          preferred package id, matches offer_token.package_id
  offerId       + campaignId    from the paywall; offer identity is TWO fields
  offers        id:campaign,id:campaign   the newer combined add-on form
  redirectURL   post-login return target, validated three different ways
  entitlement   an ESPN Watch deep-link filter, NOT a commerce param

What pref does after the hop
  preserved across login and sign-up
  carried in the Flex action payload at content.action.data.query.pref
  re-attached to SheerID program and referer URLs in the student flow`}
        lang="text"
        filename="espn-handoff-contract.txt"
      />

      <h2 id="master-triage">The Master Triage Table</h2>
      <p>
        Every module in this academy ended with some version of a symptom-to-owner
        table. This is the consolidation. Use the heuristic first — it decides
        ownership for most reports before you open a file — then the tree, then
        the table.
      </p>

      <h3 id="triage-heuristic">The Ordered Triage Heuristic</h3>
      <ol>
        <li>
          <strong>Translate the report into a domain.</strong> Reporters speak
          product vocabulary. &quot;The ESPN signup page is broken&quot; can mean
          three different websites owned by three different organisations. Ask
          for the full URL including query parameters, and if there is no URL you
          are probably looking at the takeover, which is not yours.
        </li>
        <li>
          <strong>Establish the surface, then capture the payload.</strong> On
          the checkout surface, capture the raw Flex JSON from devtools. This one
          step decides ownership for the large majority of bugs. On the marketing
          surface, capture the CMS snapshot or the Spaceball response.
        </li>
        <li>
          <strong>Ask where the wrong value lives.</strong> Present and wrong in
          the payload means a backend or content system. Correct in the payload
          but wrong on screen means cgi-web. Absent from the payload means the
          service never built it or the template has no slot for it.
        </li>
        <li>
          <strong>Read the receipt before reading code.</strong>{" "}
          <code>metadata.configurationId</code> tells you exactly which template
          version served the response and kills the stale-cache and
          wrong-data-set hypotheses instantly.
        </li>
        <li>
          <strong>Check whether the screen is migrating.</strong> If it is, two
          engines are running under one request and a fix in the wrong one is a
          silent no-op that the response validator will later report as a
          regression.
        </li>
        <li>
          <strong>Only then reach for flags and experiments.</strong> And when
          you do, resolve them for the <em>environment in question</em> — every
          flag value quoted anywhere in this academy came from a QA or test
          fixture, never from production.
        </li>
      </ol>

      <h3 id="triage-decision-tree">The Decision Tree</h3>
      <MermaidDiagram
        chart={triageTree}
        title="Triage Decision Tree"
        caption="The tree encodes the heuristic. The most common error is skipping straight to the code without the payload capture in the middle."
        minHeight={620}
      />

      <h3 id="triage-commands">Commands That Answer Question One</h3>
      <CodeBlock
        code={`# Which app am I even looking at? Trust package.json, never the prose.
grep -n '"dev' apps/commerce/espn/package.json apps/marketing-unified/espn/package.json

# Run ESPN commerce with mocks, then open the URL the scripts actually serve
pnpm dev:commerce:integration:espn      # https://local.plus.espn.com:5004
pnpm dev:marketing-unified:espn         # https://local.plus.espn.com:5040

# Is this route flag-gated, and by which flag?
grep -rn "isRouteEnabled" apps/commerce/espn/pages/commerce/plans/

# What does the ESPN Sparrow baseline actually say? Fixture, not production.
grep -n "enableCommerceUnified" \\
  packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts

# Which Flex endpoints exist for ESPN? The checked-in config IS the API doc.
grep -c '"href"' packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json

# Never grep brand strings without excluding build output
grep -rn "espn" packages/cgi/commerce-base/src --exclude-dir=.next --exclude-dir=build

# Prove a brand branch is real rather than a name that merely contains a brand
grep -rn "=== 'espn'" packages/cgi/commerce-base/src`}
        lang="bash"
        filename="triage-crib.sh"
      />

      <h3 id="triage-table">Symptom to Owner</h3>
      <ArticleTable
        caption="Twenty-eight symptoms, consolidated from every module in this academy. The last column routes you back to the module that explains the mechanism."
        minWidth={1120}
      >
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>Most likely layer</th>
              <th>Repo or system</th>
              <th>First thing to check</th>
              <th>Module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wrong or English-fallback copy on a checkout screen</td>
              <td>Content, not code</td>
              <td>Cypher, reached through Flex</td>
              <td>
                Capture the Flex JSON, read the cypher key it sent, then look for{" "}
                <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> in RUM
              </td>
              <td>Region, Localization &amp; Copy for ESPN</td>
            </tr>
            <tr>
              <td>Copy is wrong but the key looks correct</td>
              <td>cgi-web render-time rewrite</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                Any <code>wpnx-great-copy*</code> flag rewrites Cypher keys at
                render; the tell is <code>copy_override_experiments</code> in RUM
              </td>
              <td>Flags &amp; Experiments for ESPN</td>
            </tr>
            <tr>
              <td>Wrong price by amount on a checkout screen</td>
              <td>Backend</td>
              <td>Flex, then GLO</td>
              <td>
                Is the amount already wrong in the Flex JSON? If yes it is not a
                cgi-web bug
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>Price off by cents, or rounding looks odd</td>
              <td>cgi-web</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                <code>apply-legal-rounding.ts</code> rounds <strong>up</strong>{" "}
                so the shown price is never below the charged price
              </td>
              <td>Region, Localization &amp; Copy for ESPN</td>
            </tr>
            <tr>
              <td>Wrong price on a marketing plan card</td>
              <td>CMS content</td>
              <td>cgi-web marketing plus the CMS</td>
              <td>
                Offer tokens always resolve to the <code>fallback_*</code> fields
                today; read the authored content entry
              </td>
              <td>Plan Cards &amp; The Hand-Off</td>
            </tr>
            <tr>
              <td>A whole section is missing from a checkout screen</td>
              <td>Flex service or template slot</td>
              <td>Flex, plus the templates repo</td>
              <td>
                Is the field absent from the JSON? Then read{" "}
                <code>metadata.configurationId</code>
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>A bullet or row is missing inside a modal</td>
              <td>cgi-web, near-certainly</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                <code>filter-modal-list-items.ts</code> deletes Flex-provided
                items whose cypher key resolves falsy, mutating in place
              </td>
              <td>Region, Localization &amp; Copy for ESPN</td>
            </tr>
            <tr>
              <td>A button renders as a plain link</td>
              <td>cgi-web style allowlist</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                <code>interaction-element.tsx</code> falls through to{" "}
                <code>link</code> for unknown Flex style values, silently
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>Wrong experiment treatment applied</td>
              <td>Allocation first, then Flex</td>
              <td>WeaponX, then Flex</td>
              <td>
                Decode <code>x-bamtech-weaponx-assignments</code>, then check the
                variant is registered
              </td>
              <td>Flags &amp; Experiments for ESPN</td>
            </tr>
            <tr>
              <td>Treatment assigned but the template did not change</td>
              <td>Flex template-config collision</td>
              <td>Flex</td>
              <td>
                Only the first featureId whose variant maps to a{" "}
                <code>templates</code> entry wins; ESPN paywall lists four
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>Everyone appears to be in control</td>
              <td>cgi-web hook</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                Four causes render identically: query not ready, SDK disabled,
                user unenrolled, SDK threw. Never{" "}
                <code>Boolean(variant)</code>
              </td>
              <td>Flags &amp; Experiments for ESPN</td>
            </tr>
            <tr>
              <td>404 on an ESPN commerce route</td>
              <td>Route gate</td>
              <td>cgi-web plus Sparrow</td>
              <td>
                Does the page file exist, then read the{" "}
                <code>isRouteEnabled</code> flag for that environment
              </td>
              <td>ESPN Commerce App Anatomy</td>
            </tr>
            <tr>
              <td>
                <code>/commerce/plans</code> is a 404
              </td>
              <td>Intended behaviour</td>
              <td>Sparrow</td>
              <td>
                <code>enableCommerceUnifiedPlans</code> is off for ESPN; the plan
                selector redirects out to ESPN-owned surfaces. Nothing to fix
              </td>
              <td>ESPN Checkout Flow, Screen by Screen</td>
            </tr>
            <tr>
              <td>404 on a marketing route</td>
              <td>Content path or locale</td>
              <td>Cannonball manifest, or Spaceball</td>
              <td>
                Is the path in the manifest, and is that locale published? The
                manifest exists to answer exactly this before content is fetched
              </td>
              <td>Nexus Data Fetching</td>
            </tr>
            <tr>
              <td>A marketing page renders the 500 page</td>
              <td>Deliberate throw</td>
              <td>
                cgi-web <code>apps/marketing-unified/espn</code>
              </td>
              <td>
                Config or CMS fetch failed and the pipeline throws by design. Do
                not swallow it
              </td>
              <td>ESPN Marketing App Anatomy</td>
            </tr>
            <tr>
              <td>A component silently vanished from a marketing page</td>
              <td>Fail-soft content validation</td>
              <td>cgi-web marketing plus the CMS</td>
              <td>
                A zod failure logs <code>stitchWarn</code> and keeps rendering;
                the bug looks like a missing component, not an error
              </td>
              <td>Nexus Data Fetching</td>
            </tr>
            <tr>
              <td>User logged out mid-flow</td>
              <td>Session reconciliation</td>
              <td>
                cgi-web <code>commerce-base/src/identity</code>
              </td>
              <td>
                <code>OneIdWrapper</code> logs a BAM-in / OneID-out user out{" "}
                <em>on purpose</em>; <code>LoginRequired</code> re-checks on mount
              </td>
              <td>ESPN Identity &amp; Auth</td>
            </tr>
            <tr>
              <td>Reauth or step-up does not work on ESPN</td>
              <td>Capability unreachable, not broken</td>
              <td>
                cgi-web <code>commerce-base</code> plus Sparrow
              </td>
              <td>
                ESPN ships <code>identitySDK: null</code> and never hydrates the
                config, so the handler fails at its readiness check and ESPN
                always gets the password modal
              </td>
              <td>ESPN Identity &amp; Auth</td>
            </tr>
            <tr>
              <td>Wrong theme, wrong font weight, or a Disney+ icon on ESPN</td>
              <td>Build-time theming</td>
              <td>
                <code>cgi-design-tokens</code>, the Tailwind presets, and the app
                configs
              </td>
              <td>
                Which app and which plugin; then grep for hardcoded{" "}
                <code>themeName=&quot;disneyPlus&quot;</code> and for{" "}
                <code>product/disneyplus/</code> asset paths
              </td>
              <td>ESPN Brand, Theming &amp; UI Components</td>
            </tr>
            <tr>
              <td>An ESPN screen arrives styled as another brand</td>
              <td>Flex partner predicate</td>
              <td>Flex</td>
              <td>
                Grep <code>isPartnerESPN</code> in the <em>shared</em> service,
                not <code>espn</code> in Flex; the predicate is case-sensitive
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>No RUM data for ESPN</td>
              <td>Wrong identifier, not an outage</td>
              <td>Datadog</td>
              <td>
                Four different service names exist; commerce env is only{" "}
                <code>prod</code> or <code>non-prod</code>; prod RUM keeps 10 per
                cent of sessions
              </td>
              <td>ESPN Observability &amp; Analytics</td>
            </tr>
            <tr>
              <td>A funnel from marketing to checkout returns nothing</td>
              <td>Two disconnected RUM applications</td>
              <td>Datadog</td>
              <td>
                <code>espn-nexus</code> and{" "}
                <code>web-solo-commerce-espn</code> produce two unlinked
                sessions. That funnel is not a query you can write
              </td>
              <td>ESPN Observability &amp; Analytics</td>
            </tr>
            <tr>
              <td>No ESPN commerce Playwright metrics in Datadog</td>
              <td>Stale CI filter</td>
              <td>
                <code>.github/workflows/metrics.yml</code>
              </td>
              <td>
                The <code>workflow_run</code> name list predates the sharded
                rename and matches exactly
              </td>
              <td>ESPN Local Dev, Testing &amp; CI</td>
            </tr>
            <tr>
              <td>Purchase fails at submit</td>
              <td>Payment prep or execution</td>
              <td>cgi-web plus Flex plus GLO</td>
              <td>
                Unsampled logs for the error code first, then confirm the{" "}
                <code>offers</code> in the request came from the Flex action
                payload
              </td>
              <td>ESPN Checkout Flow, Screen by Screen</td>
            </tr>
            <tr>
              <td>Add-ons step never appears</td>
              <td>Handler condition</td>
              <td>
                cgi-web <code>commerce-base</code>
              </td>
              <td>
                The handler needs the route flag <em>and</em> a{" "}
                <code>pref</code> param. RUM will also blame the wrong handler
                here
              </td>
              <td>ESPN Checkout Flow, Screen by Screen</td>
            </tr>
            <tr>
              <td>Plan card links to the wrong plan</td>
              <td>CMS content</td>
              <td>The CMS</td>
              <td>
                A wrong <code>pref</code> is authored content; this repo cannot
                validate, test or fix it in code
              </td>
              <td>Plan Cards &amp; The Hand-Off</td>
            </tr>
            <tr>
              <td>CI is red on an ESPN PR</td>
              <td>Identify the gate before reading logs</td>
              <td>GitHub Actions</td>
              <td>
                Which check: lint, type-check, the 100 per cent jest coverage
                gate, or the sharded commerce Playwright run. Jenkins only builds
                and deploys
              </td>
              <td>ESPN Local Dev, Testing &amp; CI</td>
            </tr>
            <tr>
              <td>Jest is green but you tested the wrong brand</td>
              <td>Two independent defaults to Disney+</td>
              <td>cgi-web scripts and test setup</td>
              <td>
                The process needs <code>PRODUCT=espn</code> and the provider
                wrapper needs the ESPN Sparrow fixture. Use the root
                brand-specific script
              </td>
              <td>ESPN Local Dev, Testing &amp; CI</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="defect-register">The Defect &amp; Doc-Drift Register</h2>
      <p>
        Researching this academy surfaced real defects and real documentation
        errors. Collecting them here serves two purposes: it is a backlog of
        small, high-value tickets, and it is a demonstration of the failure
        shapes this codebase produces — permissive fallbacks, silent brand
        defaults, self-reported labels, and prose that has drifted from the
        scripts. The confidence column is deliberately honest. Some of these are
        read straight out of source; others are mechanisms that are certainly
        real but have not been observed failing in production.
      </p>
      <ArticleTable
        caption="Twenty-two findings. Read the confidence column before you write a ticket claiming a user-visible bug."
        minWidth={1140}
      >
        <table>
          <thead>
            <tr>
              <th>Finding</th>
              <th>Type</th>
              <th>Location</th>
              <th>Confidence</th>
              <th>Suggested action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>addOnsExperimentRedirectHandler</code> returns{" "}
                <code>handler: &apos;entitledUserRedirectHandler&apos;</code>,
                feeding the wrong name into the RUM redirect action
              </td>
              <td>Defect</td>
              <td>
                <code>commerce-base/src/common/redirect/handlers.ts</code>, read
                at <code>use-navigation-redirect.tsx</code>
              </td>
              <td>
                Confirmed in source. Found independently twice. Behaviour is
                correct; only the label is wrong
              </td>
              <td>
                One-line fix. Note the historical RUM caveat in any add-ons
                traffic analysis, since past data is mislabelled
              </td>
            </tr>
            <tr>
              <td>
                ESPN display font weights ship invalid CSS —{" "}
                <code>font-weight: Cond Heavy</code>
              </td>
              <td>Defect</td>
              <td>
                Built <code>cgi-design-tokens</code> ESPN stylesheet, root cause
                a missing <code>condheavy</code> key in the Figma weight map
              </td>
              <td>
                Confirmed in built output and root-caused. Commerce ships it
                broken; marketing masks it with a utility class
              </td>
              <td>
                Add the map entry, then screenshot-diff commerce — the fix
                applies a weight currently ignored, so blast radius is unverified
              </td>
            </tr>
            <tr>
              <td>
                Four hardcoded <code>themeName=&quot;disneyPlus&quot;</code>{" "}
                sites, including the <strong>ESPN-only</strong> wallet modal
              </td>
              <td>Defect, arguably a choice</td>
              <td>
                wallet modal container, magic-link switch-account, logout modal,
                student loading content
              </td>
              <td>
                Confirmed in source. An adjacent comment calls it a conscious
                design decision, which makes it debatable rather than clear-cut
              </td>
              <td>
                Get the decision on record with a ticket reference, or fix it. In
                review, reject the same literal without that comment
              </td>
            </tr>
            <tr>
              <td>
                The <code>notImplemented</code> proxy is lost on spread, so a
                missing orchestration op throws a{" "}
                <code>TypeError</code> instead of a readable error
              </td>
              <td>Latent hazard</td>
              <td>
                <code>data-interface-espn</code>{" "}
                <code>identity-data-interface.ts</code> spread site
              </td>
              <td>
                Confirmed in source and reproduced in Node semantics. Not yet
                observed in a running app
              </td>
              <td>
                Probe one unimplemented op to confirm, then stop spreading the
                proxy or re-wrap after the spread
              </td>
            </tr>
            <tr>
              <td>
                <code>pnpm -F @solo/commerce-espn test:jest</code> runs with
                Disney+ fixtures
              </td>
              <td>Defect</td>
              <td>
                <code>apps/commerce/espn/package.json</code> —{" "}
                <code>PRODUCT=espn</code> is only on the coverage and Playwright
                scripts
              </td>
              <td>
                Confirmed. This is the one on this list most likely to have
                already cost someone a day
              </td>
              <td>
                Add <code>PRODUCT=espn</code> to <code>test:jest</code>, and
                prefer the root brand-specific script meanwhile
              </td>
            </tr>
            <tr>
              <td>
                <code>test:marketing-unified:playwright:headless:espn</code> is
                broken
              </td>
              <td>Defect</td>
              <td>
                Root <code>package.json</code> targets a script the marketing
                ESPN package never defines
              </td>
              <td>Confirmed</td>
              <td>
                Define the missing script or delete the root alias. Use the
                package&apos;s own Playwright scripts today
              </td>
            </tr>
            <tr>
              <td>
                <code>metrics.yml</code> emits no ESPN commerce Playwright
                metrics
              </td>
              <td>Defect</td>
              <td>
                <code>.github/workflows/metrics.yml</code>{" "}
                <code>workflow_run</code> name list
              </td>
              <td>
                Confirmed. Names are matched exactly and predate the sharded
                rename
              </td>
              <td>Update the name list. Small, concrete, high leverage</td>
            </tr>
            <tr>
              <td>
                No ESPN jest file carries a product tag, so ESPN unit results are
                not sliceable in CI visibility
              </td>
              <td>Defect, gap</td>
              <td>ESPN commerce jest specs</td>
              <td>Confirmed by exhaustive grep</td>
              <td>
                Add the tag, and enable the CODEOWNERS fallback so results also
                carry an owner
              </td>
            </tr>
            <tr>
              <td>
                A Playwright spec is tagged <code>@tap espn</code> — the second
                tag is missing its marker, and the whole file is skipped
              </td>
              <td>Defect, gap</td>
              <td>ESPN commerce billing spec</td>
              <td>Confirmed. Two independent problems in two lines</td>
              <td>
                Fix the tag; then either unskip under its ticket or delete the
                file so it stops reading as coverage
              </td>
            </tr>
            <tr>
              <td>
                The natural RUM environment filter never matches ESPN commerce
              </td>
              <td>Latent hazard</td>
              <td>
                Commerce collapses env to <code>prod</code> or{" "}
                <code>non-prod</code>; marketing passes the raw value through
              </td>
              <td>Confirmed. Returns an empty graph, not an error</td>
              <td>
                Either pass the real environment through, or document the two
                vocabularies where people write queries
              </td>
            </tr>
            <tr>
              <td>
                Two ESPN Tailwind utilities point at Disney+ asset paths, and one
                rule is missing its leading dot so it matches nothing
              </td>
              <td>Defect</td>
              <td>
                <code>apps/commerce/espn/tailwind.config.cjs</code>
              </td>
              <td>
                Confirmed. The other eleven asset utilities correctly use the
                ESPN path
              </td>
              <td>
                Repoint the assets, fix or delete the dead rule, and add a test
                asserting ESPN utilities use ESPN assets
              </td>
            </tr>
            <tr>
              <td>
                <code>isPartnerESPN</code> is case-sensitive while several call
                sites lowercase the header first
              </td>
              <td>Latent hazard</td>
              <td>Flex shared utility versus two ad-hoc comparison sites</td>
              <td>
                Inconsistency confirmed in source. Whether a client ever sends a
                different case is unverified
              </td>
              <td>
                Normalise in one place and delete the ad-hoc comparisons. Capture
                a production request to settle the case question
              </td>
            </tr>
            <tr>
              <td>
                Multiple experiment featureIds on one screen: all but one are
                silently dropped
              </td>
              <td>Latent hazard</td>
              <td>
                Flex <code>screen/common/configuration.ts</code>; the ESPN
                paywall config lists four ids against seven variants
              </td>
              <td>
                Mechanism confirmed in source and in the Flex docs. Whether all
                four are simultaneously allocated is unknown
              </td>
              <td>
                Check live allocations before adding a fifth. The experiment
                platform will still report correct enrolment while variants are
                dropped
              </td>
            </tr>
            <tr>
              <td>
                Breakpoints are a mutable module singleton that defaults to
                Disney+ and resets to Disney+, not to the current tenant
              </td>
              <td>Latent hazard</td>
              <td>
                <code>growth-components</code> breakpoints config
              </td>
              <td>
                Confirmed. Every failure path is silent — you get Disney+ pixel
                values and wrong image widths with no error
              </td>
              <td>
                Reset to the configured tenant, and configure the tenant in test
                setup
              </td>
            </tr>
            <tr>
              <td>
                The class-merge helper builds its class groups from Disney tokens
                for all brands
              </td>
              <td>Latent hazard</td>
              <td>
                <code>cgi-design-components</code> style utils
              </td>
              <td>
                Confirmed. Parity holds today across all three brands, so it is
                currently harmless
              </td>
              <td>
                Add a parity test. It is load-bearing and untested: one
                ESPN-only token makes class conflicts source-order dependent
              </td>
            </tr>
            <tr>
              <td>
                <code>data-interface-espn</code> declares an entry point file
                that does not exist
              </td>
              <td>Defect</td>
              <td>
                <code>packages/cgi/data-interface-espn/package.json</code>
              </td>
              <td>
                Confirmed. It works only because every consumer deep-imports
              </td>
              <td>
                Point it at a real file or remove the fields. Cheap fix, prevents
                a confusing future failure
              </td>
            </tr>
            <tr>
              <td>
                Two <code>LoadAnalytics</code> implementations with different
                consent logic
              </td>
              <td>Latent hazard</td>
              <td>The ESPN layout and the legacy application layout</td>
              <td>Confirmed, with a TODO already on it</td>
              <td>
                Consolidate. A TODO is not a fix, and a consent bug fixed in one
                layout survives in the other
              </td>
            </tr>
            <tr>
              <td>
                Marketing offer-token prices always resolve to the CMS{" "}
                <code>fallback_*</code> values
              </td>
              <td>Latent hazard, known TODO</td>
              <td>
                <code>packages/marketing/plans-pricing-api</code> token
                replacement
              </td>
              <td>
                Confirmed in source: the token builder is called with an empty
                offer behind a TODO, and the offers client has no ESPN brand
              </td>
              <td>
                Until it is wired, treat the CMS fallback as the live price and
                say so in any pricing conversation
              </td>
            </tr>
            <tr>
              <td>
                <code>apps/commerce/AGENTS.md</code>: stale ESPN{" "}
                <code>src/</code> tree, wrong local hostname, wrong package name
              </td>
              <td>Doc-drift</td>
              <td>
                <code>apps/commerce/AGENTS.md</code>
              </td>
              <td>Confirmed against the directory and the scripts</td>
              <td>
                Correct all three. The hostname one costs newcomers the most
                time
              </td>
            </tr>
            <tr>
              <td>
                ESPN marketing README: wrong host and ports, lists analytics
                vendors that do not exist in the code, and carries a stale brand
                red hex
              </td>
              <td>Doc-drift</td>
              <td>
                <code>apps/marketing-unified/espn/README.md</code>
              </td>
              <td>
                Confirmed. The README also contradicts itself on the local domain
                within one file
              </td>
              <td>
                Correct the ports, delete the vendor claims, and replace the hex
                with the real blue token reference
              </td>
            </tr>
            <tr>
              <td>
                Root <code>CLAUDE.md</code> names a Growth team alias that
                CODEOWNERS does not use
              </td>
              <td>Doc-drift</td>
              <td>
                Root <code>CLAUDE.md</code> versus{" "}
                <code>.github/CODEOWNERS</code>
              </td>
              <td>Confirmed. CODEOWNERS is what GitHub enforces</td>
              <td>Align the doc to CODEOWNERS, not the reverse</td>
            </tr>
            <tr>
              <td>
                A Sparrow loader doc-comment claims errors return the config
                unmodified; the code throws
              </td>
              <td>Doc-drift</td>
              <td>The Sparrow config loader</td>
              <td>Confirmed by reading the function</td>
              <td>
                Fix the comment. A wrong comment about failure behaviour is worse
                than no comment
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="pre-pr-checklist">Pre-PR Checklist for ESPN Work</h2>
      <p>
        Drawn from the divergence, testing and CI modules. Paste it into the PR
        description and delete the lines that do not apply — the deletions are
        themselves useful review signal.
      </p>
      <CodeBlock
        code={`ESPN PRE-PR CHECKLIST

BRAND CORRECTNESS
[ ] If I added a brand difference, I used the highest mechanism that works:
    config table > remote config > feature flag or route gate > provider swap > hardcoded conditional
[ ] My condition is named after a CAPABILITY, not a brand
[ ] I used the right namespace: ProductName vs partner/partnerName vs tenant vs ThemeName
    (ESPN is "espn" in all of them; Disney+ is NOT, so an ESPN-only test proves nothing)
[ ] I did not use partnerName as "which app am I" - it is session-derived
[ ] If this encodes a rollout state, the PR names the cleanup ticket
[ ] Tests exist for the brands I did NOT touch

CONFIG AND FLAGS
[ ] I know whether my flag is WeaponX (wpnx- prefix, SDK bootstrap cache) or
    Sparrow (camelCase, read in getServerSideProps) - and I read it with the matching hook
[ ] I did not Boolean() an experiment variant; "control" is truthy
[ ] I handled an undefined treatment explicitly
[ ] Any flag value I quoted came from the environment in question, not from a fixture

SERVER-DRIVEN UI
[ ] I captured the raw Flex JSON before assuming the bug is in cgi-web
[ ] I read metadata.configurationId to identify the template that served it
[ ] If the screen is migrating, I checked BOTH engines
[ ] I did not add a second experimentFeatureId to a screen without checking allocations

TESTING
[ ] PRODUCT=espn is set for the run (or I used the root brand-specific script)
[ ] The provider wrapper got the ESPN Sparrow fixture, not the default
[ ] The ESPN V2 ledger flag is injected where the flow needs it
[ ] Anything doing network I/O renders inside the browser-mocks provider
[ ] New specs carry the product and owner tags
[ ] I did not raise Playwright workers - shards exist because MSW is a singleton

VALIDATION LADDER, smallest first
[ ] type-check
[ ] targeted jest with PRODUCT=espn
[ ] the ESPN jest coverage gate (100%, includes next.config.js)
[ ] lint
[ ] build
[ ] ESPN Playwright (the hard merge gate)
[ ] scraap scan on the app directory I touched

BEFORE PUSHING
[ ] Branch name is 27 characters or fewer, with no slash
[ ] No secrets; fixtures use placeholder values
[ ] I checked docs I relied on against the scripts - AGENTS.md and READMEs drift
[ ] Diff touches no dependency, lockfile, CI, or generated file I did not intend`}
        lang="text"
        filename="espn-pre-pr-checklist.txt"
      />

      <h2 id="five-minute-narrative">The 5-Minute Architecture Narrative</h2>
      <p>
        The most common way this knowledge gets used is not debugging — it is
        explaining. A new teammate asks how ESPN works; an interviewer asks you
        to describe a system you know well. Both want the same thing: a narrative
        with a spine, not an inventory of technologies.
      </p>
      <InterviewPlaybook
        title="How to explain ESPN&apos;s architecture in five minutes"
        intro={
          <>
            The weak version lists frameworks. The strong version starts from{" "}
            <em>organisational</em> boundaries, then follows one user through
            them, then names one thing that surprised you. Aim for five minutes
            with no diagram, and be ready to expand any single sentence into ten
            minutes if asked.
          </>
        }
        steps={[
          "Open with the punchline: what users call the ESPN site is three websites under one brand - a content site owned by ESPN's own engineering org, a sales site on a shared marketing platform, and a checkout on a commerce platform shared with Disney+ and Hulu.",
          "Name the boundary that matters most: the entire contract between sales and checkout is one URL carrying a preferred package id. No session, no cart, no shared client state. That single fact explains a whole class of bugs.",
          "Describe the checkout as server-driven: a backend-for-frontend returns a filled template describing what the screen contains, and the web app renders it with typed models and one component per element type. So most wrong-copy, wrong-price and missing-element bugs are not frontend bugs.",
          "Explain how three brands share one codebase: divergence is expressed in data, not code. There are hundreds of ESPN references in the shared commerce library but only a handful of literal brand comparisons. Everything else is a config table, a remote-config value, a feature flag, or a provider swap in a thin app shell.",
          "Say what is deliberately not in the repo: identity is an external script and SDK, copy is an external localization service, prices come from an upstream offers system, config and experiment allocations are remote, and the screen templates live in a third repository. Half the system is configuration you influence but do not compile.",
          "Name one concrete surprise to prove you have actually worked in it - for example that ESPN's brand token is blue and the red only lives inside the logo asset, or that the plan-selection route is deliberately disabled for ESPN so the flow enters checkout from ESPN-owned surfaces.",
          "Close on the practical payoff: this map is a routing tool. Given a symptom you can name the layer, the repo, the owning team and the first thing to check - and you are comfortable saying 'that one is not ours' with a specific owner named.",
        ]}
      />
      <p>
        The second question this topic reliably generates is the senior one:{" "}
        <em>what would you fix first?</em> It is a judgment question, and the
        register above is the answer sheet.
      </p>
      <InterviewPlaybook
        title="How to answer: what would you improve first in this codebase?"
        intro={
          <>
            The weak answer is a rewrite. The strong answer picks something small
            with an outsized correctness payoff, and can explain why the failure
            was invisible in the first place.
          </>
        }
        steps={[
          "Lead with a class of defect, not a file: this codebase's characteristic failure is the silent brand default - a permissive fallback that produces valid-looking output instead of an error.",
          "Give the cheapest concrete example: a test script that omits the brand environment variable, so it passes while exercising another brand's fixtures. One word of diff, and it removes an entire category of false confidence.",
          "Give the highest-leverage observability example: a stale CI workflow-name filter that silently emits no ESPN end-to-end metrics. Nothing is broken, so nothing alerts - the data simply never existed.",
          "Show you can distinguish a defect from a decision: four components hardcode another brand's theme, and one of them is an ESPN-exclusive surface - but an adjacent comment claims it is deliberate. The fix there is to get the decision on record, not to unilaterally change it.",
          "Name the structural fix, not just the instances: throw on unknown brand keys instead of defaulting, and add a parity test for the assumption that all brands expose the same token groups.",
          "Close with sequencing and risk: ship the one-line and config fixes first because they are reversible and verifiable, then the ones whose blast radius is unverified - such as a font-weight fix that applies a weight the browser is currently ignoring.",
        ]}
      />

      <h2 id="capstone-challenge">Capstone Challenge: A Multi-Layer Incident</h2>
      <InterviewChallenge
        title="Monday morning, five symptoms, one incident channel"
        scenario={
          <>
            An ESPN NFL bundle promotion launched Friday. On Monday five things
            land in the same channel within twenty minutes, and someone has
            already declared it &quot;the ESPN checkout is down&quot;.
            <br />
            <br />
            <strong>(1)</strong> Purchase conversion on the ledger is reported
            down sharply week over week, but RUM shows no drop in page views for
            that route.
            <br />
            <strong>(2)</strong> Support has tickets saying the plan card
            advertised one monthly price and the ledger showed a higher one.
            <br />
            <strong>(3)</strong> A second group of users on a Spanish locale
            report the ledger headline rendering in English.
            <br />
            <strong>(4)</strong> QA says &quot;nothing is deployed&quot; because
            their Datadog dashboard for the commerce app, filtered to the staging
            environment, is completely empty.
            <br />
            <strong>(5)</strong> The PR that was supposed to add the
            promotion&apos;s add-on step merged green on Friday, and the add-on
            step is not appearing for anyone.
          </>
        }
        tasks={[
          "Order the five symptoms by which you resolve first, and justify the ordering by cost of being wrong rather than by ease.",
          "For symptom 2, state exactly what you capture, and what each possible outcome of that capture proves about ownership.",
          "For symptom 1, explain why the RUM funnel cannot answer the conversion question, and name the data source that can.",
          "Explain symptom 4 without assuming an outage, naming the specific mechanism.",
          "Explain how symptom 5 can be true - a green CI run and an unshipped step - naming at least two independent mechanisms.",
          "Name which symptom is least likely to be a cgi-web bug at all, and who owns it.",
          "State the one experiment-platform check you must do before concluding the promotion experiment is live and working.",
          "Write the one-paragraph incident update you would post, distinguishing what you know from what you are still checking.",
        ]}
        pitfalls={[
          "Treating the price mismatch as a frontend rounding bug before capturing the Flex payload - rounding exists in cgi-web, so the hypothesis is plausible and that is exactly why it is a trap.",
          "Reading the empty staging dashboard as evidence of a deploy problem.",
          "Trusting the merged PR's green checks as evidence the ESPN behaviour was tested.",
          "Assuming the Spanish copy gap is a missing dictionary key without checking whether a copy-override experiment rewrote the key at render time.",
          "Concluding the experiment is live because the experiment platform reports correct enrolment - enrolment and template application are different questions.",
          "Declaring a single root cause. At least three independent layers are involved here.",
        ]}
        signal="A strong answer separates the five symptoms into distinct layers immediately, refuses to guess before the payload capture, explains the empty dashboard and the green CI run as expected behaviour of known mechanisms rather than as mysteries, and names an owner outside cgi-web without hedging."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Ordering.</strong> Resolve <strong>(2)</strong> first: a price
          mismatch is the only symptom where being wrong costs money and trust,
          and it is the one where a capture gives a definitive answer in minutes.
          Then <strong>(5)</strong>, because an unshipped step means the
          promotion is not actually running and every conversion number is
          measuring the wrong thing. Then <strong>(3)</strong>, a real
          user-visible defect but bounded. Then <strong>(1)</strong>, which is
          a measurement question, not an incident. Last{" "}
          <strong>(4)</strong>, which is not a problem at all.
        </p>
        <p>
          <strong>(2) The price mismatch — what to capture.</strong> Capture two
          things: the plan card&apos;s authored CMS content, and the raw Flex JSON
          for the ledger request. Three outcomes, three owners. If the CMS{" "}
          <code>fallback_*</code> value is stale, this is a content bug — the
          marketing offer token always resolves to the fallback today, so a stale
          fallback ships as an advertised price. If the CMS value is right and
          the Flex payload already carries the higher amount, ownership is the
          backend: Flex and the upstream offers system. If the Flex payload
          carries the correct amount and the screen shows a higher one, it is
          cgi-web — and the specific suspect is legal rounding, which rounds{" "}
          <em>up</em> so the shown price is never below the charged price. A
          fourth possibility worth ruling out: the ledger&apos;s offer comes from
          the Flex action payload, not from the URL, so a{" "}
          <code>pref</code> that resolves to a different offer produces a
          legitimately different price with no bug anywhere.
        </p>
        <p>
          <strong>(1) Why RUM cannot answer the conversion question.</strong>{" "}
          Two reasons, both structural. First, ESPN marketing and ESPN commerce
          are two separate RUM applications producing two unlinked sessions, so
          a sales-to-checkout funnel is not a query you can write. Second,
          production RUM keeps only a fraction of sessions while commerce browser
          logs are unsampled — which is precisely why the signup success event is
          deliberately emitted to both. For a count, use the unsampled logs. RUM
          is for narrative; logs are for numbers.
        </p>
        <p>
          <strong>(4) The empty dashboard.</strong> Not an outage. The commerce
          app collapses its environment tag to a binary production or
          non-production value, so a filter for a named staging environment
          matches nothing and returns an empty graph rather than an error. There
          is a second, compounding version of the same trap: ESPN carries
          different service names across RUM, APM, deploys and CI, so the wrong
          name also returns emptiness. Before anyone says &quot;nothing is
          deployed&quot;, verify the identifier.
        </p>
        <p>
          <strong>(5) Green CI, unshipped step.</strong> At least three
          mechanisms. First, the ESPN jest script can run without the brand
          environment variable, so a suite can pass entirely against another
          brand&apos;s fixtures — green, and irrelevant. Second, the add-ons step
          is not a step, it is a redirect handler that requires both a route flag{" "}
          <em>and</em> a <code>pref</code> parameter; the code can be perfect and
          the step still never fire because the flag is off in that environment
          or the entry URL lacks the param. Third, the relevant Playwright file
          for this area is skipped under a ticket, so the end-to-end coverage a
          reviewer might assume exists does not. And separately, ESPN
          Playwright metrics are not being emitted at all because of a stale CI
          workflow-name filter, so nobody would have noticed a coverage cliff.
        </p>
        <p>
          <strong>(3) The English headline on a Spanish locale.</strong> Two
          candidate causes and they are distinguishable. A missing dictionary key
          fails soft to the empty string and logs a missing-key event with the
          key and namespace — so check for that log first. If it is absent, the
          likelier cause is that the copy on screen does not correspond to the
          key the backend sent: any copy-override experiment flag rewrites the
          Cypher key at render time, and neither the Flex payload nor the
          dictionary entry reveals it. The tells are the override field in RUM
          and the raw flag map.
        </p>
        <p>
          <strong>Least likely to be ours.</strong> Symptom 4, which is a query
          construction problem owned by whoever wrote the dashboard. If instead
          the reported price problem had turned out to be a stale authored value,
          that would sit with the content authors — and neither the marketing app
          nor the commerce app can validate it in code, which is worth saying
          out loud rather than absorbing.
        </p>
        <p>
          <strong>The experiment-platform check.</strong> Enrolment is not
          application. Verify that the variant assigned to the user maps to an
          entry in the template configuration&apos;s templates object, because
          only the first featureId whose variant maps to such an entry applies a
          template config — and the ESPN paywall configuration lists four
          featureIds against seven variants. Overlapping allocations silently
          drop all but one while the experiment platform continues to report
          correct enrolment.
        </p>
        <p>
          <strong>The incident update.</strong> &quot;Five reports, at least
          three unrelated causes; not a single outage. Confirmed: the staging
          dashboard is empty because of an environment-tag mismatch, not a deploy
          problem — no action needed. In progress: capturing the ledger payload
          and the authored CMS content for the price mismatch, which will assign
          ownership to content, backend, or us within the hour. Suspected: the
          add-on step is gated on both a route flag and an entry parameter, so
          the promotion may never have been live; verifying flag state and the
          entry URLs now. Also verifying whether the Spanish headline is a
          missing dictionary key or a copy-override rewriting the key at render.
          Conversion numbers are on hold until the add-on question is settled,
          and will come from unsampled logs rather than RUM because the two RUM
          applications cannot be joined.&quot;
        </p>
      </SolutionReveal>

      <h2 id="self-assessment">Self-Assessment</h2>
      <p>
        Fifteen questions. If you can answer one confidently, that module has
        landed. If you cannot, the last column tells you exactly where to go —
        that is the whole point of annotating them.
      </p>
      <ArticleTable
        caption="Answer each one out loud. Gaps route back to a specific module rather than to a vague feeling of not knowing enough."
        minWidth={1060}
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Question you should now be able to answer</th>
              <th>What a complete answer names</th>
              <th>Module that covers it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                Why does one ESPN purchase touch three websites, and who owns
                each?
              </td>
              <td>
                Content, sales and checkout domains; ESPN&apos;s own engineering
                org, Nexus, and CUP; the takeover as the true start with three
                exits
              </td>
              <td>The Three Domains of ESPN Web</td>
            </tr>
            <tr>
              <td>2</td>
              <td>
                What is the difference between a package, an offer and a plan —
                and what exactly crosses the sales-to-checkout boundary?
              </td>
              <td>
                Package has no price; offer identity is <code>offerId</code>{" "}
                <em>and</em> <code>campaignId</code>; plan is product-speak; the
                boundary is one URL with a <code>pref</code> package id and no
                shared state
              </td>
              <td>
                ESPN Products, Plans &amp; Entitlements; Plan Cards &amp; The
                Hand-Off
              </td>
            </tr>
            <tr>
              <td>3</td>
              <td>
                Which repos matter, and which half of the system is not a repo at
                all?
              </td>
              <td>
                cgi-web, the Flex BFF, the templates repo, plus ESPN&apos;s own
                content repo; Edge, Sparrow, Cypher, WeaponX, Cannonball and
                Spaceball, GLO and the catalogue are config and services
              </td>
              <td>Repos, Packages &amp; the Ownership Map</td>
            </tr>
            <tr>
              <td>4</td>
              <td>
                How does one catch-all page serve 29 routes, and what does the
                content manifest answer before any content is fetched?
              </td>
              <td>
                CMS registry mapping content type to model to builder to renderer;
                path existence, locale availability and redirect detection, all
                before the body
              </td>
              <td>
                ESPN Marketing App Anatomy; Nexus Data Fetching
              </td>
            </tr>
            <tr>
              <td>5</td>
              <td>
                Where does the price on a marketing plan card actually come from
                today?
              </td>
              <td>
                Server-side offer-token substitution that currently always
                resolves to the CMS fallback fields, because the live path is
                stubbed behind a TODO
              </td>
              <td>Plan Cards &amp; The Hand-Off</td>
            </tr>
            <tr>
              <td>6</td>
              <td>Why is an ESPN commerce page file only 20 to 30 lines?</td>
              <td>
                Thin-shell pattern: re-export a shared page and compose server-side
                props; behaviour lives in the shared library, so most ESPN fixes
                ship to all three brands
              </td>
              <td>ESPN Commerce App Anatomy</td>
            </tr>
            <tr>
              <td>7</td>
              <td>
                How does the ESPN data interface reach a backend without building
                a URL?
              </td>
              <td>
                Dependency inversion through one injected interface; symbolic
                endpoint keys resolved by the SDK from a bootstrap config; the
                checked-in config is the API documentation
              </td>
              <td>ESPN&apos;s Data Interface &amp; the Browser SDK</td>
            </tr>
            <tr>
              <td>8</td>
              <td>
                Who decides what the ESPN ledger contains, and what is your
                receipt for which template served it?
              </td>
              <td>
                Shared Flex screens selected by the partner predicate, filled from
                templates in a third repo; the configuration id in the response
                metadata
              </td>
              <td>Flex &amp; Server-Driven UI for ESPN</td>
            </tr>
            <tr>
              <td>9</td>
              <td>
                Which identity client does ESPN use, and what does that make
                unreachable?
              </td>
              <td>
                The OneID v4 script, not the Disney+-only Identity v5 SDK; every
                v5 capability including reauth is unreachable with zero errors
                logged, so ESPN always gets the password fallback
              </td>
              <td>ESPN Identity &amp; Auth</td>
            </tr>
            <tr>
              <td>10</td>
              <td>
                What is the real ESPN checkout path, and why is the plan-selection
                route a 404?
              </td>
              <td>
                External plan cards, then the ledger, then success; login and
                add-ons are conditional detours; the plans route is hard-disabled
                for ESPN by design
              </td>
              <td>ESPN Checkout Flow, Screen by Screen</td>
            </tr>
            <tr>
              <td>11</td>
              <td>
                How is brand divergence expressed here, and how do you add one
                safely?
              </td>
              <td>
                Data, not code — hundreds of ESPN references against a handful of
                literal brand comparisons; five mechanisms in preference order;
                the test is whether a fourth brand would require editing shared
                files
              </td>
              <td>ESPN vs Disney+ vs Hulu</td>
            </tr>
            <tr>
              <td>12</td>
              <td>
                How do you tell the two flag systems apart, and why does it
                matter?
              </td>
              <td>
                Prefixed names come from the experiment platform via the SDK
                bootstrap cache; camelCase names come from remote config in
                server-side props. Reading from the wrong one fails silently
              </td>
              <td>Flags &amp; Experiments for ESPN</td>
            </tr>
            <tr>
              <td>13</td>
              <td>
                How many markets does ESPN commerce serve, and where does a
                wrong-copy bug actually live?
              </td>
              <td>
                One business region and eight territories, all inheriting from the
                US; copy is an external dictionary isolated by a tenant field,
                failing soft to the empty string — and it can be rewritten at
                render time by an override flag
              </td>
              <td>Region, Localization &amp; Copy for ESPN</td>
            </tr>
            <tr>
              <td>14</td>
              <td>
                Where does ESPN&apos;s brand identity live, and what colour is it?
              </td>
              <td>
                Generated design tokens plus a Tailwind preset resolved at build
                time, no runtime theme switch; the brand token is a blue, and the
                red survives only inside the logo asset and one stale README line
              </td>
              <td>ESPN Brand, Theming &amp; UI Components</td>
            </tr>
            <tr>
              <td>15</td>
              <td>
                Which analytics vendor does ESPN use, why can a Datadog graph be
                empty without an outage, and what actually gates your merge?
              </td>
              <td>
                Adobe, with the other brand&apos;s analytics code present as
                inherited plumbing; wrong identifier, binary environment tag,
                sampling, or two unlinked RUM apps; GitHub Actions runs the
                testing while the deploy system only builds
              </td>
              <td>
                ESPN Observability &amp; Analytics; ESPN Local Dev, Testing &amp;
                CI
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="edges-of-the-map">The Edges of the Map</h2>
      <p>
        Every map has edges, and pretending otherwise is how people lose days.
        These are the things this academy could <em>not</em> determine from the
        two repositories it could read. They are not gaps in your understanding —
        they are properties of the system. Treat this list as{" "}
        <strong>known unknowns you should not waste a day rediscovering</strong>.
      </p>
      <ul>
        <li>
          <strong>The deployed templates.</strong> Every template excerpt in this
          academy came from checked-in fixtures. The authoritative artifacts live
          in a separate templates repository and are served through Site Config.
          Whether the fixtures match production is unverified. If a screen&apos;s
          structure is in question, read the configuration id from a live
          response rather than reasoning from a fixture.
        </li>
        <li>
          <strong>Cypher dictionary contents.</strong> The academy can tell you
          how copy is fetched, isolated per tenant, keyed, overridden and failed
          soft. It cannot tell you what any key resolves to in any locale. That
          requires the dictionary service.
        </li>
        <li>
          <strong>Production flag, experiment and remote-config values.</strong>{" "}
          Every value quoted anywhere in these eighteen modules came from a QA or
          test fixture. Real values live in remote storage and in the experiment
          and flag platforms. Dead configuration is normal here: several ESPN
          experiment ids exist only in fixtures with no consumer. Always resolve
          for the environment in question before asserting a flag is live.
        </li>
        <li>
          <strong>Which Flex engine serves the ESPN paywall in production.</strong>{" "}
          The screen is mid-migration and two engines can run under one request.
          Which one is authoritative depends on a flag value readable from
          neither repository.
        </li>
        <li>
          <strong>Whether all the paywall experiment featureIds are
          simultaneously allocated.</strong> If they are, all but one are being
          dropped at the template layer while enrolment still reports correctly.
          This needs an experiment-platform check.
        </li>
        <li>
          <strong>Bundle contents.</strong> The repo holds bundle package ids.
          What is actually inside each bundle is documented nowhere in either
          repository.
        </li>
        <li>
          <strong>Monitors, SLOs, synthetics and dashboards.</strong> None are
          defined in cgi-web. They live in a separate observability-configuration
          repository. Exactly one RUM explorer link is committed anywhere, and no
          dashboard identifiers.
        </li>
        <li>
          <strong>Whether ESPN traffic reaches the other brand&apos;s analytics
          pipeline.</strong> ESPN authors no events for it, but the provider tree
          is mounted and the enablement atom fails open. Resolving it requires the
          ESPN tenant&apos;s analytics-tooling config plus a log query.
        </li>
        <li>
          <strong>Who consumes the ESPN-namespaced Flex screens.</strong> Strongly
          inferred to be ESPN native and OTT clients, based on device-family
          headers and in-app purchase request bodies. The client repositories were
          out of scope, so verify before assuming a change there is safe for web.
        </li>
        <li>
          <strong>Product terms with no code attestation.</strong> Several words
          you will hear in meetings —{" "}
          <em>paywall</em>, <em>contextualization</em>, <em>TVE</em>, and{" "}
          <em>plan</em> as a type — have no or almost no presence in the code.
          They are real product concepts; they are just not things you can grep.
          Translate them before you go looking.
        </li>
      </ul>
      <p>
        The general skill this list teaches is worth more than the list itself:
        in a system where half the behaviour is configuration you cannot compile,
        the honest answer to many questions is &quot;that value is not in either
        repo, here is which system owns it and how to read it.&quot; Being able
        to say that quickly and specifically is what senior looks like here.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Eight layers, and only about three of them are code you
          compile.</strong> Browser, Edge, two Next.js shells, two server
          pipelines, shared packages, client runtime, backends and config planes,
          telemetry. Layers 3 to 6 are cgi-web; layers 2, 7 and most of 8 are
          configuration and services. Knowing that ratio is the difference
          between debugging and guessing.
        </li>
        <li>
          <strong>The whole sales-to-checkout contract is one URL.</strong> A
          preferred package id in a query parameter, no session and no cart — and
          the offer actually charged comes from the server-driven action payload,
          not from that URL. Those two sentences resolve most wrong-price and
          wrong-charge reports.
        </li>
        <li>
          <strong>Triage by layer before file, and capture the payload before
          reading code.</strong> Translate the report into a domain, capture the
          raw backend response, then ask whether the wrong value is present and
          wrong, correct but misrendered, or absent. Read the configuration id
          before forming any template hypothesis.
        </li>
        <li>
          <strong>The characteristic defect here is the silent fallback.</strong>{" "}
          A brand environment variable that defaults to another brand, a font
          weight that emits the raw string, a route flag that 404s with no log, a
          treatment that renders as control for four different reasons. Nothing
          throws, so nothing gets noticed. Prefer failing loudly on unknown keys.
        </li>
        <li>
          <strong>Documentation drifts; scripts and code do not.</strong> Three
          checked-in documents in this monorepo give the wrong ESPN hostname, one
          names analytics vendors that do not exist in the code, and one names a
          team alias CODEOWNERS does not use. When prose and{" "}
          <code>package.json</code> disagree, <code>package.json</code> wins.
        </li>
        <li>
          <strong>Know your edges and say them out loud.</strong> Deployed
          templates, dictionary contents, production flag and experiment
          allocations, bundle contents, and every monitor and SLO live outside
          these repositories. Naming the owning system quickly is more valuable
          than guessing confidently.
        </li>
      </ul>
    </div>
  );
}
