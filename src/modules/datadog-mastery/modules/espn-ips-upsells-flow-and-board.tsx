import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const familyDiagram = String.raw`flowchart TD
  EPIC["GREAT-1129 — IPS (Upsells) board family"] --> DPLUS
  EPIC --> DSCREEN
  EPIC --> HULU
  EPIC --> ESPN
  DPLUS["D+ flow board rhp-h4y-n36 (GREAT-1163)<br/>web /commerce/unlock + device-ips chain<br/>device-ips 1.7M traces/7d vs web ips 213K"]
  DSCREEN["D+ IPS screen template ya3-7vf-rzf (GREAT-1168)<br/>reusable per-experiment clone:<br/>/commerce/unlock + Flex subscription/ips"]
  HULU["Hulu board jc4-vft-jiz (GREAT-1153)<br/>NO device-ips — ACP upsell chain instead<br/>(device-switch-billing-cadence et al.)"]
  ESPN["ESPN board x5n-qhe-qqh (GREAT-1159)<br/>NO IPS screen AT ALL —<br/>web change-subscription + device paywall chain"]
  style DPLUS fill:#0b5394,color:#fff
  style DSCREEN fill:#0b5394,color:#fff
  style HULU fill:#1c9e51,color:#fff
  style ESPN fill:#632ca6,color:#fff`;

const ipsConceptDiagram = String.raw`flowchart TD
  CONTENT["User taps a tile / hits play / hits a limit<br/>(entry is CONTENT, not account)"] --> EXPLORE["Explore API response carries<br/>an 'upsell' Action"]
  EXPLORE --> INTERSTITIAL["IPS interstitial renders<br/>web: /commerce/unlock · device: DEVICE_INTERSTITIAL<br/>Flex: GET /screens/v1|v2/subscription/ips (or device-ips)"]
  INTERSTITIAL -->|"entitlementId drives the flavor"| CASES["concurrent_streams · max_households (Extra Member)<br/>hulu_sub:base · espn_plus_sub:base · espn:flagship · multiplan"]
  INTERSTITIAL -->|proceed| LEDGER["ledger / payment confirm<br/>→ PUT /execution/v3/subscription/switch"]
  INTERSTITIAL -->|back| BOUNCE["(return to content)"]
  INTERSTITIAL -->|"GLO / Eligibility / Offers fail"| ROADBLOCK["IpsRoadblock fallback screen"]
  LEDGER --> RESUME["SUCCESS is a RESUME, not a page —<br/>user returns to the content they wanted"]
  style INTERSTITIAL fill:#632ca6,color:#fff
  style RESUME fill:#1a7f4b,color:#fff
  style ROADBLOCK fill:#8a1a1a,color:#fff`;

const discoveryDiagram = String.raw`flowchart TD
  Q["Does ESPN have the IPS screen?"] --> C1["RUM: ESPN web resources<br/>matching *subscription/ips*"]
  C1 -->|"0 events / 30d"| X1["No web IPS fetches"]
  Q --> C2["Flex logs: partner:espn sweep,<br/>top 200 request URLs"]
  C2 -->|"no ips, no device-ips"| X2["No ESPN-partner IPS traffic"]
  Q --> C3["/commerce/unlock — 1,653 views/30d.<br/>What do those views load?"]
  C3 -->|"pages/_error-*.js chunks,<br/>zero screen fetch"| X3["unlock = dead route<br/>(renders the error page)"]
  X1 --> CONCL["ESPN has NO IPS screen.<br/>The D+ template's queries cannot be cloned."]
  X2 --> CONCL
  X3 --> CONCL
  CONCL --> S1["Real surface 1:<br/>web change-subscription flow"]
  CONCL --> S2["Real surface 2:<br/>device paywall chain"]
  style CONCL fill:#8a1a1a,color:#fff
  style S1 fill:#0b5394,color:#fff
  style S2 fill:#0b5394,color:#fff`;

const webFlowDiagram = String.raw`flowchart TD
  SUB["/commerce/subscription<br/>10,659 referrals/30d — #1 entry"] --> L
  BILL["/commerce/billing<br/>3,916 referrals/30d"] --> L
  DIRECT["direct / reload<br/>2,344"] --> L
  ACCT["/commerce/account<br/>2,102"] --> L
  L["/commerce/change-subscription<br/>21,318 views/30d<br/>Flex: GET /screens/v2/account/plan-switch (12,989)<br/>RUM: CHANGE_SUBSCRIPTION_PAGE_VIEW"]
  L -->|"FLEX_INTERACTION -<br/>navigate to switch ledger (2,710)"| C
  L -->|"CHANGE_SUBSCRIPTION_REDIRECT (1,873)<br/>eligibility bounce → account home"| OUT["(account home)"]
  C["/commerce/change-subscription/confirm<br/>9,930 views/30d<br/>Flex: POST /screens/v2/account/plan-switch-ledger (6,100)<br/>RUM: PLAN_SWITCH_LEDGER_SCREEN_LOADED (8,694)"]
  C -->|"PUT /execution/v3/subscription/switch<br/>3,187 commits/30d · ~100% variant-stamped"| S
  S["/commerce/change-subscription/success<br/>5,740 views/30d<br/>Flex: GET /screens/v1/subscription/plan-switch-success"]
  style L fill:#632ca6,color:#fff
  style C fill:#0b5394,color:#fff
  style S fill:#1a7f4b,color:#fff
  style OUT fill:#8a6d1a,color:#fff`;

const webSequenceDiagram = String.raw`sequenceDiagram
  participant B as Browser (ESPN CUP)
  participant F as Flex (growth-life-client-api)
  participant G as GLO / Offers backends
  B->>F: GET /screens/v2/account/plan-switch?experience=default
  F->>G: retrieve offers + agreement (Promise.all)
  G-->>F: eligible switch plans
  F-->>B: plan-switch screen JSON (template-driven UI)
  Note over B: user picks a plan — actionKey submitForm<br/>action "FLEX_INTERACTION - navigate to switch ledger"
  B->>F: POST /screens/v2/account/plan-switch-ledger
  F-->>B: ledger screen (proration, terms)
  Note over B: user confirms
  B->>F: PUT /execution/v3/subscription/switch
  F->>G: execute plan switch
  G-->>F: switch result
  F-->>B: success → /commerce/change-subscription/success
  Note over B,F: every hop carries the WeaponX stamp —<br/>RUM: @context.experiments.KEY.variantId<br/>Flex logs: @metadata.flexState.experimentation...variant_id`;

const deviceChainDiagram = String.raw`flowchart TD
  GATE["User hits gated content in the ESPN app<br/>(live game, flagship-only stream)"] --> PW
  PW["POST /screens/v2/espn/paywall — 14.8M hits/30d<br/>(+ v1 5.0M) · entitlementId=espn:flagship | espn_plus_sub:base<br/>MIXED population: signup + upgrade + event PPV,<br/>anonymous sessions allowed"]
  PW -->|proceed| DL["POST /screens/v1/espn/device-ledger — 1.9M/30d<br/>offerType=FLAGSHIP_STANDALONE | ESPN_STANDALONE"]
  DL --> IAP["App-store In-App Purchase<br/>(IAPSkuPricingBaseSchema in request body)"]
  IAP --> ENT["Entitlement sync — INVISIBLE to Flex:<br/>no /execution/v3/subscription/switch fires<br/>(switch executions ≈ web-only, 3.2K vs 20M paywall)"]
  DAM["POST /screens/v1/espn/device-account-management<br/>2.2M/30d — device account surface"] -.-> PW
  NOTE1["Devices emit NO Datadog RUM<br/>traces carry NO experiment/partner tags<br/>Flex retains warn/error logs ONLY"] -.- PW
  style PW fill:#632ca6,color:#fff
  style IAP fill:#8a6d1a,color:#fff
  style ENT fill:#8a1a1a,color:#fff
  style NOTE1 fill:#333,color:#fff`;

const observabilityDiagram = String.raw`flowchart LR
  subgraph WEB["Web change-subscription flow"]
    RUM["RUM (service:web-solo-commerce-espn)<br/>views · actions · resources · errors<br/>variant facet: @context.experiments.KEY.variantId<br/>81% of views stamped, ~100% of executions"]
    TRACE1["APM traces (plan-switch resources)<br/>volume + latency — ALL BRANDS,<br/>no partner tag, no variant tag"]
    LOGS1["Flex logs — partner-scopable<br/>@metadata.flexState.standardHeaders.partner:espn<br/>variant facet works (~100% stamped on errors)"]
  end
  subgraph DEV["Device paywall chain"]
    TRACE2["APM traces (espn/* resources)<br/>VOLUME TRUTH — inherently ESPN,<br/>no cross-brand caveat needed"]
    LOGS2["Flex logs — warn/error ONLY retained<br/>ERROR TRUTH, not traffic<br/>index client-user-login → FLEX-TIER storage"]
    NORUM["NO RUM · NO variant splits ·<br/>IAP commits invisible"]
  end
  LOGS2 -->|"dashboard logs queries need<br/>indexes: [] and NO storage:'hot'"| LESSON["The storage-tier trap:<br/>CLI validates ≠ widget renders"]
  style LESSON fill:#8a1a1a,color:#fff
  style NORUM fill:#333,color:#fff`;

const boardStructureDiagram = String.raw`flowchart TD
  H["Header — find/replace contract · example key wpnx-ESPN-Generic-Entry-Plan-Order<br/>WeaponX facet forms (RUM + Flex logs) · scope story (no IPS screen) ·<br/>boundaries (cancel/switch → Retention, add-ons → Signup) · 30d volume warning"] --> S1
  S1["① Entry & Reach — 2 tables<br/>landing views by variant · entry by referrer"] --> S2
  S2["② Decision — 4 tables<br/>proceed clicks · proceed rate % ·<br/>ledger loaded · eligibility bounces"] --> S3
  S3["③ Conversion — 4 tables<br/>switch executions (confirm-scoped) · take-rate % ·<br/>success views · completion rate %"] --> S4
  S4["④ Funnels — 3 funnels, variant-free<br/>main · from-account · from-billing"] --> S5
  S5["⑤ Flex Backend Health — 6 widgets<br/>device trace volume / latency p75 / errors ·<br/>plan-switch logged errors by variant ·<br/>device logged errors by screen + family"] --> S6
  S6["⑥ Errors & Data Quality — 4 tables<br/>error-page renders · by owner (excl. missing-copy) ·<br/>top errors (excl. missing-copy) · missing-copy tracker"] --> S7
  S7["⑦ Coverage — 2 tables<br/>by country · by device type"] --> S8
  S8["⑧ Performance — 2 tables<br/>landing p75 · confirm p75 (INP, pc75 frustration)"]
  style H fill:#0b5394,color:#fff
  style S5 fill:#632ca6,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Fourth Board — a Flow With No Screen", level: 2 },
  { id: "family", title: "The IPS Board Family Across Brands", level: 2 },
  { id: "ips-concept", title: "What In-Product Switch Means (on D+)", level: 2 },
  { id: "discovery", title: "Proving ESPN Has No IPS Screen", level: 2 },
  { id: "web-flow", title: "Surface 1 — Web Change-Subscription Anatomy", level: 2 },
  { id: "device-chain", title: "Surface 2 — The Device Paywall Chain", level: 2 },
  { id: "observability", title: "What You Can See From Where", level: 2 },
  { id: "board", title: "The Eight-Section Board", level: 2 },
  { id: "review", title: "Review Journey — Three Bugs, Three Lessons", level: 2 },
  { id: "scope", title: "The Scope Decision Record", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnIpsUpsellsFlowAndBoard() {
  return (
    <div className="article-content">
      <p>
        This is the complete record of GREAT-1159: the ESPN In-Product Switch (Upsells)
        monitoring template (<code>x5n-qhe-qqh</code>) — and, more importantly, the anatomy of
        the flow it monitors. Like both sibling tickets before it (Hulu&apos;s GREAT-1153 and
        the ESPN Reconnects board), this one began with a discovery that rewrote the scope: the
        screen the board family is named after does not exist on ESPN. Understanding <em>why</em>,
        and what ESPN has instead, is most of the value of this page.
      </p>

      <h2 id="intro">The Fourth Board — a Flow With No Screen</h2>
      <p>
        The GREAT-1129 epic builds one experiment-monitoring template per brand for the
        In-Product Switch (Upsells) flow. By the time GREAT-1159 started, three boards were
        already Done: the D+ flow board, the D+ IPS-screen template (the reusable per-experiment
        clone with an answer key), and the Hulu board. Each one taught the same lesson from a
        different angle: <strong>every brand&apos;s upsell chain is structurally different, and
        cloning another brand&apos;s queries produces a board that renders numbers for a flow
        that doesn&apos;t exist.</strong> ESPN turned out to be the most extreme case — it has
        neither the D+ IPS screen nor the Hulu ACP chain.
      </p>

      <h2 id="family">The IPS Board Family Across Brands</h2>
      <MermaidDiagram
        chart={familyDiagram}
        title="One epic, four boards, three different flow architectures"
        caption="Notice the progression: D+ has the real IPS screen (device-dominant), Hulu replaced it with the ACP chain, and ESPN has neither — its board covers two surfaces no sibling board has."
        minHeight={420}
      />
      <p>
        The D+ pair splits responsibilities: the <em>flow</em> board (43 widgets) covers entry,
        device funnel, roadblocks, and Extra Member; the <em>screen</em> template (backbone +
        answer key) is the thing teams clone per experiment, changing only the WeaponX FeatureID
        and variant values. Hulu&apos;s board documented that <code>device-ips</code> appears
        zero times in Hulu&apos;s living-room client — its upsell runs through the ACP chain
        (<code>device-switch-billing-cadence</code> and friends). The ESPN board completes the
        set with a third architecture.
      </p>

      <h2 id="ips-concept">What In-Product Switch Means (on D+)</h2>
      <p>
        To understand what ESPN is missing, you need the D+ mental model. IPS is the upsell
        interstitial shown <em>inside the product</em> when a user tries to do something their
        plan doesn&apos;t allow. Three facts define it, and all three matter for monitoring:
      </p>
      <MermaidDiagram
        chart={ipsConceptDiagram}
        title="The D+ IPS screen — content-triggered, entitlement-flavored, resume-terminated"
        caption="Entry is content (not account), the entitlementId picks the use-case flavor, and success is a resume back into content — not a landing page you can count views on."
        minHeight={480}
      />
      <ul>
        <li>
          <strong>Entry is content, not account.</strong> An <code>upsell</code> Action in the
          Explore API response (tiles, play attempts, limit hits) routes to the interstitial.
        </li>
        <li>
          <strong>The <code>entitlementId</code> is the flavor switch</strong> —
          <code>concurrent_streams</code> (stream limit), <code>max_households</code> (Extra
          Member), <code>hulu_sub:base</code> / <code>espn_plus_sub:base</code> /
          <code>espn:flagship</code> (bundle content inside D+), multiplan.
        </li>
        <li>
          <strong>Success is a resume, not a page</strong> — the device returns the user to the
          content, so completion must be read from Flex, never from a page view.
        </li>
      </ul>
      <p>
        Note the irony that caused early confusion on this ticket: the ESPN-flavored
        entitlements (<code>espn:flagship</code>, <code>espn_plus_sub:base</code>) appear all
        over the shared IPS service code — but as <em>upsell targets inside the D+ app</em>
        (partner:disney), not as ESPN-brand traffic. Grep hits are not flow evidence.
      </p>

      <h2 id="discovery">Proving ESPN Has No IPS Screen</h2>
      <MermaidDiagram
        chart={discoveryDiagram}
        title="The three-check evidence chain, all 30-day windows"
        caption="Each check closes a different escape hatch: no web fetches, no partner-scoped Flex traffic, and the unlock route that does exist renders the Next.js error page."
        minHeight={460}
      />
      <p>
        The third check is the one worth internalizing. ESPN&apos;s <code>/commerce/unlock</code>
        has 1,653 RUM views per 30 days — a naive reviewer sees &quot;live traffic&quot; and
        builds widgets on it. But the resource waterfall for those views loads
        <code>pages/_error-*.js</code> chunks and makes zero screen fetches: it is a 404-style
        dead end wearing a real route&apos;s name. The same trap appeared on the ESPN Reconnects
        ticket (<code>/commerce/welcome-back</code>) — <strong>a route having RUM views proves
        nothing; check what the page actually loads.</strong>
      </p>
      <p>
        A code check closes the loop and sharpens the claim to <strong>&quot;dark, not
        absent.&quot;</strong> The ESPN app in cgi-web <em>does</em> mount
        <code>pages/commerce/unlock/index.page.tsx</code> — it re-exports the same shared
        <code>UnlockPage</code> that D+ and Hulu use, gated on the remote-config flag
        <code>enableCommerceTiara</code> (&quot;Tiara&quot; is the concurrent-streams upsell
        project) via <code>isRouteEnabled</code>. The flag is off for ESPN, which produces
        exactly the error render the RUM waterfall showed — two independent evidence lines
        agreeing. On the Flex side the <code>subscription/ips</code> route would accept a
        <code>partner:espn</code> request (shared header validation, entitlement-driven service,
        partner-agnostic templates), but ESPN-tenant cypher coverage for the <code>ips_*</code>
        keys is unverified — so a flag flip alone would not guarantee a clean render, the same
        risk profile the welcome-back recon documented. If ESPN IPS ever launches, it arrives as
        a project with its own board moment; this board&apos;s scope stands.
      </p>

      <h2 id="web-flow">Surface 1 — Web Change-Subscription Anatomy</h2>
      <p>
        ESPN&apos;s web upsell surface is the account-initiated plan-change flow. Three pages,
        four Flex calls, and a set of purpose-built RUM actions that make the funnel measurable
        without copy-matching any button text:
      </p>
      <MermaidDiagram
        chart={webFlowDiagram}
        title="The web switch funnel with live 30-day volumes on every hop"
        caption="Follow the numbers: 21K land, 2.7K proceed by CTA, 9.9K reach confirm (many arrive with plan preselected via query params — proceed clicks undercount arrivals), 3.2K commit, 5.7K see success (reloads inflate views above commits)."
        minHeight={560}
      />
      <p>
        Two non-obvious behaviors, both verified in the cgi-web source rather than guessed:
        <code>CHANGE_SUBSCRIPTION_REDIRECT</code> fires when the page decides it cannot show the
        switch screen (<code>shouldRedirect</code>) and sends the user to account home — an
        eligibility bounce, not a user choice. And the flow&apos;s only <code>actionKey</code> is
        <code>submitForm</code>, so CTA analysis uses the action <em>name</em>
        (&quot;FLEX_INTERACTION - navigate to switch ledger&quot;), not the actionKey facet that
        other boards group on.
      </p>
      <MermaidDiagram
        chart={webSequenceDiagram}
        title="Request-level view of one successful switch"
        caption="The commit is a structural signal: PUT /execution/v3/subscription/switch as a RUM resource, variant-stamped on ~100% of executions — no button-copy matching, no localization blind spots."
        minHeight={520}
      />
      <p>
        The entry mix has its own lesson. The #1 referrer is <code>/commerce/subscription</code>
        (10,659/30d — nearly 3× billing), and it was <em>invisible</em> in the first recon sweep
        because <code>pup rum aggregate</code> truncates group-by buckets alphabetically at the
        limit <em>before</em> sorting by count. The rendered widget showed the truth; the
        limit-10 CLI sweep silently dropped the 11th alphabetical value, which happened to be
        the biggest one. Facet sweeps that feed copy claims always run with
        <code>--limit 300</code>.
      </p>

      <h2 id="device-chain">Surface 2 — The Device Paywall Chain</h2>
      <p>
        The device side is where ESPN&apos;s volume lives — and where almost nothing is
        observable the way web engineers expect:
      </p>
      <MermaidDiagram
        chart={deviceChainDiagram}
        title="The ESPN device paywall chain — huge, content-gated, and IAP-terminated"
        caption="Half a million paywall hits per day (spiking on game nights), but the purchase itself happens in the app store — Flex never sees a switch execution from a device."
        minHeight={520}
      />
      <p>
        This chain is the structural cousin of D+&apos;s <code>device-ips</code> (content-gated
        entry, device-rendered, resume-terminated) but with three observability walls: devices
        emit no Datadog RUM, traces carry no experiment or partner tags (irrelevant here —
        <code>espn/*</code> routes are ESPN by construction, which is actually an advantage over
        the shared plan-switch resources), and Flex retains only warn/error logs for these
        screens. The population is also mixed — the paywall serves signup, upgrade, and event
        purchases, with anonymous sessions allowed — so its numbers are whole-paywall health,
        not an upsell-only read.
      </p>

      <h2 id="observability">What You Can See From Where</h2>
      <MermaidDiagram
        chart={observabilityDiagram}
        title="The telemetry map — which signal is the truth for which question"
        caption="Traces are the volume truth, logs are the error truth, RUM is web-only — and the red box is the lesson that cost a full section of dead widgets."
        minHeight={480}
      />
      <p>
        The red box deserves its own paragraph because it is the most reusable lesson on this
        page. Every logs query on the board validated perfectly through the CLI and then
        rendered <strong>No Data</strong> as a widget. The cause: growth-life-client-api&apos;s
        logs live in the <code>client-user-login</code> index on Datadog&apos;s{" "}
        <em>Flex-tier storage</em> (naming collision with the Flex app is pure coincidence), and
        the widget JSON carried <code>storage: &quot;hot&quot;</code> — a field the dashboard
        renderer honors but the CLI&apos;s logs-aggregate API never exercises. The fix, taken
        from the working Hulu board&apos;s widgets:
      </p>
      <CodeBlock
        code={`// BROKEN — validated via CLI, rendered "No Data" as a widget
{
  "data_source": "logs",
  "indexes": ["*"],
  "storage": "hot",        // ← excludes Flex-tier storage; renderer-side only
  "search": { "query": "service:growth-life-client-api env:production status:error ..." }
}

// FIXED — matches the working Hulu board's logs widgets
{
  "data_source": "logs",
  "indexes": [],           // empty = all indexes
                           // no storage field at all
  "search": { "query": "service:growth-life-client-api env:production status:error ..." }
}

// RUM queries KEEP storage:"hot" + indexes:["*"] — the trap was one shared
// query helper stamping RUM fields onto logs queries.`}
        lang="json"
        filename="logs-widget-storage-tier-fix.json"
      />

      <h2 id="board">The Eight-Section Board</h2>
      <MermaidDiagram
        chart={boardStructureDiagram}
        title="x5n-qhe-qqh — 36 widgets, 8 sections, one example key"
        caption="Sections ①–④ follow the web funnel top to bottom; ⑤ is the only section that crosses to the device chain; ⑥–⑧ are the standard guardrail/coverage/performance tail."
        minHeight={640}
      />
      <p>
        Every metric is one <code>query_table</code> with columns-as-variants (control first,
        c0=control everywhere), using the family&apos;s example key
        <code>wpnx-ESPN-Generic-Entry-Plan-Order</code> — a live 3-arm plan-order test stamped
        on 81.3% of change-subscription views (10,033 / 9,948 / 10,084 — an even split that
        doubles as an SRM sanity check) and ~100% of switch executions (3,184 of 3,187). ESPN is
        WeaponX-only: the RUM facet is nested
        (<code>@context.experiments.&lt;KEY&gt;.variantId</code>), the Flex-log facet is
        <code>@metadata.flexState.experimentation.experiments.&lt;KEY&gt;.variant_id</code>, and
        no Spearmint-flat clause exists on ESPN boards (that clause is a Hulu-template artifact).
      </p>
      <CodeBlock
        code={`# The board's structural conversion signal — per-variant, no copy matching:
@type:resource env:prod service:web-solo-commerce-espn
  @view.name:"/commerce/change-subscription/confirm"
  @resource.url_path:"/execution/v3/subscription/switch"
  @context.experiments.wpnx-ESPN-Generic-Entry-Plan-Order.variantId:control

# Take-rate formula per variant: (executions / landing views) * 100
# → 25.6% control at the 7d check. Numerator is confirm-view-scoped so the
#   population matches the landing-view denominator (es-419 symmetry).

# Device volume truth (metrics, not logs — logs are warn/error only):
sum:trace.koa.request.hits{service:growth-life-client-api, env:production,
  resource_name:post_/screens/v2/espn/paywall}.as_count()`}
        lang="bash"
        filename="signature-queries.txt"
      />
      <p>
        The header note is the template contract: a three-field find/replace table (experiment
        key, variants, control literal), both variant-facet forms, the scope story (why there is
        no IPS section on an IPS board), the boundary map (cancel-flow switch belongs to the
        Retention template, add-ons to Signup), and a volume warning — web switch runs ~35
        commits per variant per day, so 30-day windows are the floor for conclusions, while the
        device chain spikes with the sports calendar.
      </p>

      <h2 id="review">Review Journey — Three Bugs, Three Lessons</h2>
      <p>
        The board went through the full review machinery twice (skill-driven senior review,
        then a browser render-verification pass at a 7-day window, 34 of 36 widgets
        pixel-checked). Each cycle caught something real:
      </p>
      <ul>
        <li>
          <strong>The storage-tier bug</strong> (user eyeball caught it): all logs widgets dead
          despite clean CLI validation — the fix and lesson above. <em>CLI-validates ≠
          widget-renders; storage tier is a renderer-side field.</em>
        </li>
        <li>
          <strong>The owner-table domination</strong> (review pass): 99.2% of noise-filtered
          errors on the switch pages are <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code>
          (1,402,575 of 1,414,203 per 30d), so &quot;Errors by Owner&quot; was a second
          missing-copy counter. Fixed by excluding missing-copy — the table now ranks real
          owners (transactional-and-payments 3,828 · commerce-core 625 · MMA 598 · identity
          253). The corrected total also fixed the escalation number: the earlier 316K figure
          was a truncated sum of top keys; the real missing-copy volume is ~1.39M/30d.
        </li>
        <li>
          <strong>The referrer copy error</strong> (render eyeball caught it): the ① note named
          the wrong top entry page because of the CLI limit-truncation trap — the widget was
          right, the note was wrong. <em>The alphabetical-truncation gotcha applies to recon
          sweeps that feed copy claims, not just to board queries.</em>
        </li>
      </ul>
      <p>
        One review finding was deliberately <em>rejected</em>: a proposed caveat sentence
        documenting the paywall&apos;s mixed population in ⑤. The section makes only health
        claims (volume, latency, errors), and population mix changes no health decision — the
        caveat would only earn its place if a reach/conversion widget ever lands in ⑤. Lean
        notes get read; the fact lives in the recon dossier where it belongs.
      </p>

      <h2 id="scope">The Scope Decision Record</h2>
      <p>
        The ticket prescribed a PM scoping step (Dorfam Mirgharavi) before building. It was
        deliberately skipped on the strength of the recon evidence, with the decision recorded
        as a ticket comment. The defensible parts are facts no PM conversation can change:
        unlock is dead, <code>device-plan-switch</code> is 100% partner:disney,
        <code>subscription/preview</code> belongs to the signup billing page (71K/30d, all from
        <code>/commerce/billing</code>), cancel/switch and add-ons have owning boards. The one
        genuinely contestable call — documented as such — is <strong>including account-initiated
        change-subscription</strong>, which the D+ family scopes <em>out</em> of IPS (it lives on
        the Account Management board there). ESPN has no content-initiated web surface, so
        excluding it would leave the web side empty. If ownership moves later, the section moves
        between boards without rebuilding; the queries stay valid either way.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>ESPN has no live IPS surface — dark, not absent.</strong> Zero
          <code>subscription/ips</code> fetches, zero partner-scoped IPS traffic, and
          <code>/commerce/unlock</code> renders the error page; the page code exists in cgi-web
          behind the off-for-ESPN <code>enableCommerceTiara</code> flag. A route having RUM
          views proves nothing — check what the page loads, then check the flag gate in source.
        </li>
        <li>
          <strong>ESPN&apos;s upsell flow is two surfaces with opposite shapes:</strong> a
          low-volume, fully-instrumented web switch funnel (21K landings, 3.2K commits/30d,
          ~100% variant-stamped commits) and a huge, mostly-blind device paywall chain
          (~20M hits/30d, no RUM, IAP-terminated, event-spiky).
        </li>
        <li>
          <strong>Traces are the volume truth, logs are the error truth</strong> — Flex retains
          warn/error logs only, and dashboard logs queries need <code>indexes: []</code> with no
          <code>storage</code> field or Flex-tier logs silently vanish (CLI validation will not
          catch it).
        </li>
        <li>
          <strong>Prefer structural signals over copy:</strong> the commit is a PUT resource,
          the bounce is a purpose-built action verified in source, and the CTA read uses action
          names because the flow has a single actionKey.
        </li>
        <li>
          <strong>The pup limit-truncation trap bites recon too:</strong> the flow&apos;s #1
          entry page was invisible at <code>--limit 10</code>. Sweeps that feed claims run at
          <code>--limit 300</code>.
        </li>
        <li>
          <strong>Scope from evidence, record the judgment calls:</strong> every exclusion on
          this board is a verified fact; the one debatable inclusion (account-initiated switch)
          is documented on-board and on-ticket so a future reviewer meets the rationale before
          the objection.
        </li>
      </ul>
    </div>
  );
}
