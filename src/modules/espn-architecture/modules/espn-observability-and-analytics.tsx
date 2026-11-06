import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const vendorMapDiagram = String.raw`flowchart LR
  subgraph SHARED["solo/instrumentation - one shared library, six provider modules"]
    P1["adobe-analytics"]
    P2["adobe-launch"]
    P3["glimpse"]
    P4["hits"]
    P5["tealium"]
    P6["zenapse"]
  end
  E["ESPN<br/>commerce and marketing"] ==>|"authors events"| P1
  E ==>|"authors events"| P2
  E -.->|"MOUNTS the provider tree<br/>authors ZERO events"| P3
  D["Disney Plus"] ==>|"authors events"| P3
  H["Hulu"] ==>|"authors events"| P4
  H ==>|"authors events"| P5
  P6 -.->|"nobody in ESPN"| Z["unused by ESPN"]`;

const adobeEventDiagram = String.raw`flowchart TD
  T["analytics.track event, data - CoreAnalytics facade"] --> H{"AdobeAnalyticsTracker handler map"}
  H -->|"page_impression"| A1["adobeTrack"]
  H -->|"cancellation_flow_start"| A1
  H -->|"user_interaction"| A2["adobeTrackLink"]
  H -->|"container_view"| X["NO ADOBE HANDLER<br/>container view is Glimpse taxonomy"]
  A1 --> M1["getCombinedPayload<br/>commonData then partialPayload<br/>contextData shallow-merged separately"]
  A2 --> M2["getCombinedPayload<br/>linkName defaults to metricsData.eventName"]
  M1 --> S1["window.s.t payload<br/>Adobe page view"]
  M2 --> S2["window.s.tl linkObject, linkType, linkName, payload<br/>Adobe link track"]
  S1 --> R["RUM action FIRE_ADOBE_PAGE_IMPRESSION_EVENT<br/>emitted only when window.s really existed"]
  A1 -.->|"window.s missing"| Q["queue plus Datadog warn<br/>Adobe Analytics tried to fire before the script was loaded"]
  X --> F["Ticket must be re-specified in Adobe vocabulary<br/>before it can be built for ESPN"]`;

const rumTopologyDiagram = String.raw`flowchart TD
  subgraph MKT["plus.espn.com - ESPN marketing on NEXUS"]
    M1["_app.page.tsx calls initDatadogRum"] --> M2["RAW datadogRum.init<br/>bypasses solo/observe<br/>datadogLogs.init never runs"]
    M2 --> M3["service espn-nexus<br/>applicationId fa8304bf...<br/>env is raw DD_ENV"]
    M2 --> M4["window.datadogRum exported<br/>so solo/footer can emit actions"]
  end
  subgraph CUP["secure.web.plus.espn.com - ESPN commerce on CUP"]
    C1["_app.page.tsx calls initDatadog at module scope"] --> C2["solo/observe init<br/>RUM plus browser logs plus log index tags"]
    C2 --> C3["service web-solo-commerce-espn<br/>applicationId 1ac57431...<br/>env collapsed to prod or non-prod"]
  end
  U["One human, one purchase journey"] --> M1
  U --> C1
  M3 -.->|"different app id, no shared session,<br/>no shared global context"| C3
  C3 --> BREAK["Sales to checkout funnel is NOT one query<br/>two RUM applications, two unlinked sessions"]`;

const coverageMapDiagram = String.raw`flowchart TD
  subgraph OBS["OBSERVED"]
    O1["Browser RUM views, actions, errors<br/>both surfaces, 10 percent of prod sessions"]
    O2["Browser logs at 100 percent<br/>commerce only, routed to the commerce index"]
    O3["Server APM spans through dd-trace<br/>espnplus-commerce and espnplus-nexus"]
    O4["Session Replay<br/>commerce masks all text, marketing masks inputs only"]
    O5["Adobe Analytics page views and link tracks<br/>gated on targeted-advertising consent"]
  end
  subgraph DARK["DARK"]
    D1["getServerSideProps and API routes<br/>RUM init returns early when not a browser"]
    D2["ESPN marketing browser logs<br/>no team tag, no log-index routing"]
    D3["view.name outside /commerce /identity /profiles<br/>fragments across locales"]
    D4["RUM to APM correlation on ESPN-owned hosts<br/>allowedTracingUrls covers only bamgrid and edge-api.hulu"]
    D5["Experiment variant on marketing RUM<br/>no global context is set at all"]
    D6["ESPN footer and legal-link drift<br/>every scheduled audit is Disney Plus scoped"]
    D7["Pre-consent analytics-derived RUM actions"]
  end
  ROOT["ESPN web surfaces"] --> OBS
  ROOT --> DARK`;

const purchaseSequenceDiagram = String.raw`sequenceDiagram
  autonumber
  participant U as User on billing page
  participant B as handleLedgerSubmission
  participant F as Flex execution API
  participant SE as flex-billing-execution side effect
  participant AD as Adobe AppMeasurement window.s
  participant RUM as Datadog RUM
  participant LOG as Datadog browser logs
  U->>B: clicks Agree and Subscribe
  B->>RUM: addAction FLEX_INTERACTION
  B->>AD: analytics.track user_interaction with event_name billing_submit
  B->>F: PUT execution v2 subscription signup
  F-->>SE: success payload
  SE->>RUM: addAction SIGNUP_SUCCESS, owner TAP, actionCode SIGNUP_SUCCESS
  SE->>LOG: logger.info SIGNUP_SUCCESS with the same context
  Note over RUM,LOG: RUM keeps 10 percent of prod sessions.<br/>Browser logs keep 100 percent.<br/>The LOG is the countable purchase signal.
  SE->>U: navigate to /commerce/success
  U->>AD: purchase-success analytics fire on the NEXT page`;

const triageDiagram = String.raw`flowchart TD
  S["Report says ESPN purchases dropped this morning"] --> L1["Step 1 - Datadog LOGS not RUM<br/>service web-solo-commerce-espn<br/>message SIGNUP_SUCCESS<br/>logs are unsampled so the count is real"]
  L1 -->|"count flat"| N["Purchases did not drop.<br/>Suspect the reporting source - Adobe report suite,<br/>consent gate, or an ad-blocked AppMeasurement script"]
  L1 -->|"count down"| E1["Step 2 - same index, facet errorCode<br/>INVALID_CARD, MISSING_ORDER_ID_FLEX_BILLING_EXECUTION,<br/>UNRECOGNIZED_FLEX_ACTION_KEY, NETWORK_ERROR"]
  E1 --> R1["Step 3 - RUM errors<br/>service web-solo-commerce-espn and env prod<br/>facet by context.owner and context.sourceComponent"]
  R1 --> A2["Step 4 - APM service espnplus-commerce<br/>Flex execution latency and 5xx rate"]
  A2 --> V["Step 5 - pivot on version, the lowercased 8-char git sha,<br/>to bracket the bad deploy"]
  V --> W["Step 6 - if only the Adobe numbers moved, read<br/>wpnx-enable-legacy-analytics-espn in WeaponX"]
  W --> CANT["Cannot answer with current instrumentation<br/>sales-to-checkout drop-off, marketing variant split,<br/>SSR-side failures, and the 90 percent unsampled sessions"]`;

const frustrationChainDiagram = String.raw`flowchart TD
  G1["GATE 1 - trackUserInteractions must be true<br/>it defaults to false, and when it is off RUM records<br/>no automatic actions, so no frustration signal can exist"]
  G2["GATE 2 - every action needs a READABLE name<br/>either a data-dd-action-name attribute<br/>or a usable DOM text fallback"]
  G3["GATE 3 - a dimension to slice frustration by<br/>global context such as experiment variant or cohort"]
  OUT["What an ESPN engineer can actually query today"]
  G1 -->|"PASS on BOTH<br/>commerce observe.ts line 60<br/>marketing datadog-rum.ts line 30"| G2
  G2 -->|"DEGRADED on BOTH<br/>actionNameAttribute unset repo-wide<br/>zero data-dd-action-name in any ESPN surface"| G3
  G3 -->|"commerce PASS via context.experiments<br/>marketing FAIL - no global context at all"| OUT
  OUT --> Y1["YES - frustration counts and rates,<br/>per session and per view, on both apps"]
  OUT --> Y2["YES - WHICH VIEW frustrates users<br/>billing and add-ons are the rows that matter"]
  OUT --> N1["DEGRADED - WHICH ELEMENT frustrates them<br/>names fall back to DOM heuristics"]
  OUT --> N2["NO - marketing frustration split by variant"]
  OUT --> N3["CAVEAT - 10 percent prod session sample,<br/>so rare frustration needs a long window"]`;

export const toc: TocItem[] = [
  { id: "adobe-not-glimpse", title: "The Headline: ESPN Is Adobe, Not Glimpse", level: 2 },
  { id: "code-presence-is-not-usage", title: "Code Presence Is Not Feature Usage", level: 2 },
  { id: "adobe-event-model", title: "The Adobe Event Model", level: 2 },
  { id: "legacy-analytics-hatch", title: "The ESPN-Only Legacy-Analytics Escape Hatch", level: 2 },
  { id: "two-rum-applications", title: "RUM: Two Disconnected Applications", level: 2 },
  { id: "environment-tag-trap", title: "The Environment-Tag Trap", level: 2 },
  { id: "sampling-and-the-unsampled-event", title: "Sampling, and the One Unsampled Event", level: 2 },
  { id: "four-names-problem", title: "The Four-Names Problem", level: 2 },
  { id: "blind-spots", title: "Blind Spots: The Coverage Map", level: 2 },
  {
    id: "frustration-signals",
    title: "Frustration Signals: Collected, Barely Named",
    level: 2,
  },
  { id: "logging-and-error-taxonomy", title: "Logging and the Error Taxonomy", level: 2 },
  { id: "monitors-slos-synthetics", title: "Monitors, SLOs & Synthetics Live Elsewhere", level: 2 },
  { id: "observability-defects", title: "Two Real Observability Defects", level: 2 },
  { id: "triage-recipe", title: "Recipe: Did ESPN Purchases Drop?", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnObservabilityAndAnalytics() {
  return (
    <div className="article-content">
      <p>
        Observability is the one area where being <em>slightly</em> wrong is
        worse than knowing nothing. A wrong service name returns an empty graph
        rather than an error. A wrong environment filter returns zero rows that
        look exactly like an outage. A RUM action can name the wrong reason a
        user landed on a screen, and you will chase the wrong hypothesis for an
        hour. This module is the map of what ESPN actually emits, under which
        identifiers, at what sample rate — and, just as importantly, the
        complete list of questions ESPN&apos;s current instrumentation
        <strong> cannot</strong> answer.
      </p>
      <p>
        Everything here is read from{" "}
        <code>/Users/…/cgi-web</code> at <code>main</code>. CI, test tagging and
        Playwright assertions are a sibling module&apos;s territory; this one
        stops at what production emits and how you read it.
      </p>

      <h2 id="adobe-not-glimpse">The Headline: ESPN Is Adobe, Not Glimpse</h2>
      <p>
        Three brands share one instrumentation package and each opts into a
        different vendor stack. Get this wrong and every analytics conversation
        you have about ESPN is conducted in the wrong vocabulary:
      </p>
      <ul>
        <li>
          <strong>ESPN → Adobe.</strong> Adobe Analytics plus Adobe Launch. This
          matches the historical ESPN.com Adobe estate.
        </li>
        <li>
          <strong>Hulu → Tealium + HITS.</strong>
        </li>
        <li>
          <strong>Disney+ → Glimpse.</strong> Disney&apos;s internal event
          system, with the page-view → container-view → interaction taxonomy.
        </li>
      </ul>
      <p>
        The shared library exports all six providers and each app subscribes to
        a subset:
      </p>
      <CodeBlock
        code={`// platform specific analytics
export * from './adobe-launch';
export * from './adobe-analytics';
export * from './glimpse';
export * from './hits';
export * from './tealium';
export * from './zenapse';`}
        lang="typescript"
        filename="packages/instrumentation/src/index.ts"
      />
      <MermaidDiagram
        chart={vendorMapDiagram}
        title="One Shared Library, Three Different Vendor Stacks"
        caption="Notice the dashed ESPN-to-Glimpse arrow: ESPN mounts the Glimpse provider tree but authors no Glimpse events. That distinction is the whole lesson."
        minHeight={400}
      />

      <h2 id="code-presence-is-not-usage">Code Presence Is Not Feature Usage</h2>
      <p>
        Here is the trap that makes people confidently wrong. If you grep{" "}
        <code>Glimpse</code> under <code>apps/commerce/espn</code>, you get
        hits. Six of them. A reasonable engineer concludes &quot;ESPN uses
        Glimpse&quot; and writes a ticket in Glimpse vocabulary. Every one of
        those hits is <strong>inherited plumbing</strong>:
      </p>
      <CodeBlock
        code={`apps/commerce/espn/pages/_app.page.tsx:62
    passes initialGlimpseConfiguration through to the legacy layout

apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx:23,103,117,132,153
    types and forwards GlimpseV2StartupClientPayloadEnrichmentsModel

apps/commerce/espn/src/test/setup/jest.mock-instrumentation.tsx:62-80
    jest mocks for GlimpsePageView / GlimpseContainerView / GlimpseEventComponent`}
        lang="text"
        filename="espn-glimpse-hits.txt"
      />
      <p>
        ESPN commerce <em>hosts</em> the Glimpse provider tree because it reuses{" "}
        <code>commerce-base</code> layouts. It fires no ESPN-authored Glimpse
        event. The general rule, and it applies to every provider in a
        multi-tenant library:
      </p>
      <blockquote>
        <p>
          In a shared multi-tenant library, <strong>code presence is not
          feature usage</strong>. A grep proves that a module is reachable, not
          that your tenant emits through it. The authority is the call sites
          that pass tenant-specific data plus the tenant&apos;s remote-config
          enablement list — never the import graph.
        </p>
      </blockquote>
      <p>
        There is one genuine loose end worth stating honestly. Whether Glimpse
        actually <em>transmits</em> for ESPN depends on the remote-config{" "}
        <code>enabledAnalyticsTooling</code> list, and the gate fails open:
      </p>
      <CodeBlock
        code={`export const isGlimpseEnabledAtom = atom(
  (get) => {
    let glimpseConfigEnabled = true;

    try {
      const enabledAnalyticsTooling = get(enabledAnalyticsToolingAtom);

      if (enabledAnalyticsTooling === undefined) {
        throw new Error(
          'enabledAnalyticsToolingAtom should be hydrated before attempting to verify enabled analytics tools'
        );
      }

      glimpseConfigEnabled = enabledAnalyticsTooling.includes('glimpse');
    } catch {
      datadogLogs.logger.warn('Glimpse config value not found');
    }`}
        lang="tsx"
        filename="packages/instrumentation/src/glimpse/atoms/is-glimpse-enabled-atom.tsx"
      />
      <p>
        The <code>catch</code> leaves <code>glimpseConfigEnabled = true</code>{" "}
        and only warns. If the atom is not hydrated, Glimpse is treated as{" "}
        <strong>enabled</strong>. So the correct answer to &quot;is there ESPN
        traffic in Glimpse?&quot; is: no ESPN-authored events exist, the
        provider is mounted, and the enablement gate fails open — resolve it by
        reading <code>enabledAnalyticsTooling</code> for the <code>espn</code>{" "}
        tenant and by searching logs for{" "}
        <code>Glimpse config value not found</code>.
      </p>

      <h2 id="adobe-event-model">The Adobe Event Model</h2>
      <p>
        The Adobe tracker is deliberately small. <code>ID = ADOBE_ANALYTICS</code>{" "}
        and exactly <strong>three</strong> event handlers, mapping onto two
        Adobe primitives on the <code>window.s</code> global:
      </p>
      <ArticleTable
        caption="The complete Adobe event surface. Anything not in this table does not exist for ESPN."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Event key</th>
              <th>Adobe primitive</th>
              <th>Builder</th>
              <th>Side effects</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>page_impression</code>
              </td>
              <td>
                <code>window.s.t(payload)</code> — page view
              </td>
              <td>
                <code>adobeTrack</code>
              </td>
              <td>
                Emits RUM action{" "}
                <code>FIRE_ADOBE_PAGE_IMPRESSION_EVENT</code>, guarded by the
                same condition as the track itself
              </td>
            </tr>
            <tr>
              <td>
                <code>user_interaction</code>
              </td>
              <td>
                <code>window.s.tl(...)</code> — click / link
              </td>
              <td>
                <code>adobeTrackLink</code>
              </td>
              <td>
                Defaults <code>linkType</code> to <code>o</code> and{" "}
                <code>linkName</code> to{" "}
                <code>metricsData.eventName</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>cancellation_flow_start</code>
              </td>
              <td>
                <code>window.s.t(payload)</code> — page view
              </td>
              <td>
                <code>adobeTrack</code>
              </td>
              <td>None</td>
            </tr>
            <tr>
              <td>
                <code>container_view</code>
              </td>
              <td>
                <strong>does not exist</strong>
              </td>
              <td>—</td>
              <td>
                Container view is Glimpse&apos;s taxonomy. There is no Adobe
                equivalent.
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        That last row is not a gap to be filled — it is a vocabulary mismatch.
        When a ticket says &quot;fire a container view when the plan module
        scrolls into view on ESPN,&quot; the ticket is written in Glimpse
        vocabulary and must be <strong>translated</strong> first: on ESPN it
        becomes a <code>user_interaction</code> with an{" "}
        <code>elementSpecifier</code> / <code>moduleLocation</code> in{" "}
        <code>contextData</code>, or a second <code>page_impression</code>.
        Getting this translation done before implementation is the difference
        between a one-day change and a week of analyst confusion.
      </p>
      <MermaidDiagram
        chart={adobeEventDiagram}
        title="Adobe Event Model: Handler Map to window.s"
        caption="Three handlers, two Adobe primitives, one payload merge. The container-view branch dead-ends because that concept belongs to a different vendor."
        minHeight={550}
      />
      <p>
        <strong>Payload merging</strong> is one function, and it is worth
        memorising because it explains every &quot;my context field vanished&quot;
        report. Top-level keys are last-write-wins;{" "}
        <code>contextData</code> is merged one level deep <em>separately</em>,
        so a partial payload can add context fields without wiping the tenant
        common data:
      </p>
      <CodeBlock
        code={`export function getCombinedPayload<C = {}>(
  commonData: CommonData<C>,
  partialPayload: PartialTrackPayload<C>
): TrackPayload<C> {
  return {
    ...commonData,
    ...partialPayload,
    contextData: {
      ...commonData.contextData,
      ...partialPayload.contextData,
    } as ContextDataPageVariable<C>,
  };
}`}
        lang="typescript"
        filename="packages/instrumentation/src/adobe-analytics/lib/get-combined-payload.ts"
      />
      <p>
        ESPN supplies its own tenant common data, and it re-applies its defaults
        as the <em>base</em> on every write, so a caller cannot accidentally
        drop <code>tenant: espn</code>:
      </p>
      <CodeBlock
        code={`// Default ESPN contextData fields; override/add more tenant-specific props here.
const DEFAULT_ESPN_CONTEXT: Partial<ESPNContextData> = { tenant: 'espn' };

// useESPNAdobeCommonData()      -> read, merging DEFAULT_ESPN_CONTEXT underneath
// useSetESPNAdobeCommonData()   -> write, re-applying DEFAULT_ESPN_CONTEXT as the base`}
        lang="typescript"
        filename="apps/commerce/espn/src/hooks/use-set-espn-adobe-common-data.ts"
      />
      <p>
        Two operational behaviours round this out. If <code>window.s</code> is
        absent the event is <strong>queued</strong> and a Datadog warn fires —{" "}
        <code>
          Adobe Analytics tried to fire before the script was loaded.
        </code>{" "}
        — draining later via <code>flushQueue()</code>. If the S3-hosted
        AppMeasurement / VisitorAPI scripts fail to load at all,{" "}
        <code>disableAdobeAnalytics()</code> runs and{" "}
        <code>Adobe Analytics script failed to load.</code> is logged as an
        error. Ad blockers trip that second one, so expect a permanent
        background rate; a <em>spike</em> is the signal, not the presence.
      </p>

      <h2 id="legacy-analytics-hatch">
        The ESPN-Only Legacy-Analytics Escape Hatch
      </h2>
      <p>
        There is exactly one ESPN-specific analytics bypass in shared commerce
        code, and if ESPN billing-page numbers look wrong it is the first thing
        you check:
      </p>
      <CodeBlock
        code={`/**
 * A hook that is currently only used on the billing page
 * To enable legacy adobeAnalyticsTrack() instead of CoreAnalytics analytics.track() for ESPN only.
 */
export function useIsESPNLegacyAnalyticsEnabled(): {
  const { data: weaponXData, isSuccess } = useMystiqueFeatureFlags();

  const isWeaponXFlagEnabled = Boolean(
    weaponXData?.['wpnx-enable-legacy-analytics-espn']
  );`}
        lang="tsx"
        filename="packages/cgi/commerce-base/src/common/hooks/use-is-espn-legacy-analytics-enabled.tsx"
      />
      <p>
        Flag key <code>wpnx-enable-legacy-analytics-espn</code>, scope: the
        billing page only. Flipped on, ESPN billing calls the legacy{" "}
        <code>adobeAnalyticsTrack()</code> directly instead of routing through
        the CoreAnalytics facade.
      </p>
      <p>
        <strong>Why such a hatch exists at all</strong> is the interesting part.
        Billing is the highest-stakes page in the product — analytics there feed
        revenue reporting that finance reconciles. When a shared abstraction
        (CoreAnalytics) is rolled out across three tenants, the tenant with the
        most brittle downstream report suite needs a way to be reverted{" "}
        <em>without</em> a deploy and <em>without</em> reverting the other two
        tenants. A flag scoped to one tenant and one page is the smallest
        possible blast radius for that revert. The cost is that you now have two
        analytics code paths on the most important page, and a dashboard can
        silently change shape when someone toggles a flag you did not know
        existed.
      </p>

      <h2 id="two-rum-applications">RUM: Two Disconnected Applications</h2>
      <p>
        This is the single most consequential fact in the module. ESPN commerce
        and ESPN marketing are <strong>two separate Datadog RUM
        applications</strong>, initialised by two entirely different code paths.
        Commerce goes through the shared <code>@solo/observe</code> wrapper;
        marketing calls <code>datadogRum.init</code> raw.
      </p>
      <ArticleTable
        caption="The two ESPN RUM applications. Memorise the service names; everything else you can look up."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>ESPN commerce</th>
              <th>ESPN marketing / NEXUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                RUM <code>service</code>
              </td>
              <td>
                <code>web-solo-commerce-espn</code>
              </td>
              <td>
                <code>espn-nexus</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>applicationId</code>
              </td>
              <td>
                <code>1ac57431-a76e-4a27-a79e-cb2bcccd4ba4</code>
              </td>
              <td>
                <code>fa8304bf-a2f2-47b4-a4e1-04628af2cb71</code>
              </td>
            </tr>
            <tr>
              <td>Init entry point</td>
              <td>
                <code>apps/commerce/espn/pages/_app.page.tsx</code> —{" "}
                <code>initDatadog()</code> at module scope
              </td>
              <td>
                <code>
                  apps/marketing-unified/espn/src/libs/datadog-rum.ts
                </code>{" "}
                — <code>initDatadogRum()</code>
              </td>
            </tr>
            <tr>
              <td>Wrapper</td>
              <td>
                <code>@solo/observe</code>
              </td>
              <td>none — raw <code>datadogRum.init</code></td>
            </tr>
            <tr>
              <td>
                <code>env</code> value space
              </td>
              <td>
                <code>prod</code> | <code>non-prod</code> only
              </td>
              <td>
                raw <code>DD_ENV</code>: <code>local</code>, <code>stage</code>,{" "}
                <code>production</code>, <code>partner</code>
              </td>
            </tr>
            <tr>
              <td>Browser logs</td>
              <td>
                <code>datadogLogs.init</code> at 100%, tagged{" "}
                <code>team: commerce</code> +{" "}
                <code>twdc.datadog_log_index</code>
              </td>
              <td>
                <strong>none</strong> — no logs init, no team index
              </td>
            </tr>
            <tr>
              <td>Prod session sample rate</td>
              <td>10%</td>
              <td>10% — 100% on local and stage</td>
            </tr>
            <tr>
              <td>
                <code>defaultPrivacyLevel</code>
              </td>
              <td>
                <code>mask</code> — all text masked in replays
              </td>
              <td>
                <code>mask-user-input</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>allowedTracingUrls</code>
              </td>
              <td>
                <code>*.bamgrid.com</code> excluding <code>/wallet</code>, plus{" "}
                <code>edge-api.hulu*.com</code>
              </td>
              <td>
                <code>*.bamgrid.com</code> only
              </td>
            </tr>
            <tr>
              <td>Global context</td>
              <td>
                <code>experiments</code>, <code>homeLocation</code>,{" "}
                <code>physicalLocation</code>, <code>urlLocale</code>,{" "}
                <code>dss_branch</code> in non-prod
              </td>
              <td>
                <strong>none at all</strong>
              </td>
            </tr>
            <tr>
              <td>
                <code>setUser</code>
              </td>
              <td>
                <code>accountId</code>, <code>deviceId</code>,{" "}
                <code>dssFilter</code>
              </td>
              <td>never called</td>
            </tr>
            <tr>
              <td>
                <code>beforeSend</code>
              </td>
              <td>
                <code>setViewName</code> — normalises{" "}
                <code>@view.name</code>
              </td>
              <td>
                overwrites <code>@view.referrer</code> from a{" "}
                <code>preserveReferrer</code> localStorage key
              </td>
            </tr>
            <tr>
              <td>Notable extra</td>
              <td>
                RUM Explorer deep link committed in a docblock in{" "}
                <code>datadog.tsx</code>
              </td>
              <td>
                exports <code>window.datadogRum</code> so{" "}
                <code>@solo/footer</code> can emit{" "}
                <code>FOOTER_RENDER_SUCCESS</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={rumTopologyDiagram}
        title="Two RUM Applications, One User Journey"
        caption="The dashed arrow is the whole problem: nothing links the marketing session to the commerce session, so the sales-to-checkout hop is invisible to RUM."
        minHeight={550}
      />
      <p>
        <strong>The consequence, stated plainly:</strong> a single user going
        from a plan card on <code>plus.espn.com</code> to billing on{" "}
        <code>secure.web.plus.espn.com</code> produces <em>two unlinked RUM
        sessions in two different RUM applications</em>. There is no shared
        session id, no shared user id (marketing never calls{" "}
        <code>setUser</code>), and no shared global context. &quot;What
        percentage of users who saw the plan cards reached billing?&quot; is not
        a RUM query you can write today. Answering it requires either a
        cross-application join on some correlation key you would have to add
        first, or a different data source entirely — Adobe, which <em>does</em>{" "}
        span both surfaces because both use it.
      </p>
      <p>Here is the commerce init, the most load-bearing block in the repo:</p>
      <CodeBlock
        code={`export function init(initConfig: InitConfig): void {
  const { branch, env, version } = initConfig;
  const branchName = branch ?? 'unknown';
  const isNonProd = env === 'non-prod';
  const isLocalNonProd = isNonProd && version === 'local';
  const sharedConfig = {
    clientToken: initConfig.clientToken,
    env,
    service: initConfig.service,
    site: 'datadoghq.com',
    version,
  };

  datadogRum.init({
    defaultPrivacyLevel: 'mask',
    sessionReplaySampleRate: isLocalNonProd ? 100 : 10,
    sessionSampleRate: isNonProd ? 100 : 10,
    traceSampleRate: isNonProd ? 100 : 10,
    trackUserInteractions: true,
    trackLongTasks: true,
    trackResources: true,
    ...initConfig.options.rumConfig,
    ...sharedConfig,
  });

  // Store the DSS Branch Name into the global context
  // However, we'll only do this for Non-Production environments
  if (isNonProd) {
    datadogRum.setGlobalContextProperty('dss_branch', branchName);
  }

  datadogRum.startSessionReplayRecording();

  datadogLogs.init({
    sessionSampleRate: 100,
    ...initConfig.options.logsConfig,
    ...sharedConfig,
  });

  // Route browser logs to the correct team index in Datadog.
  datadogLogs.setGlobalContextProperty('team', initConfig.logIndex);
  datadogLogs.setGlobalContextProperty(
    'twdc.datadog_log_index',
    initConfig.logIndex
  );
}`}
        lang="typescript"
        filename="packages/observe/src/observe.ts"
      />
      <p>
        Note that <code>sharedConfig</code> is spread <strong>last</strong> in
        both inits. A caller cannot override <code>service</code>,{" "}
        <code>env</code>, <code>version</code>, <code>clientToken</code> or{" "}
        <code>site</code> through <code>options</code>. That is intentional
        hardening: identifiers are not negotiable per call site.
      </p>

      <h2 id="environment-tag-trap">The Environment-Tag Trap</h2>
      <p>
        This is the defect that most often produces the sentence &quot;there is
        no data.&quot; Commerce collapses environment into a binary; marketing
        passes the raw value through:
      </p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/next.config.js:63-65
    datadogRUMEnv: process.env.DATADOG_RUM_ENV === 'prod' ? 'prod' : 'non-prod',
    datadogRUMBuildId: gitCommit,
    datadogServiceName: \`web-solo-commerce-\${productName}\`,

// apps/commerce/espn/next.config.js:21,121-123  — hardcodes the product name
const espnProductName = 'espn';
    datadogRUMEnv: process.env.DATADOG_RUM_ENV === 'prod' ? 'prod' : 'non-prod',
    datadogRUMBuildId: gitCommit,
    datadogServiceName: \`web-solo-commerce-\${espnProductName}\`,

// apps/marketing-unified/espn/next.config.js:52-54  — raw DD_ENV
    datadogRUMEnv: process.env.DD_ENV || 'local',
    datadogRUMBuildId: gitCommit,
    datadogServiceName: 'espn-nexus',`}
        lang="javascript"
        filename="next.config.js"
      />
      <p>
        Stage, QA and CI all report <code>non-prod</code> on commerce. So the
        most natural filter an engineer types —
      </p>
      <CodeBlock
        code={`# WRONG for ESPN commerce - matches nothing, ever
@service:web-solo-commerce-espn @env:stage

# RIGHT for ESPN commerce
@service:web-solo-commerce-espn @env:prod
@service:web-solo-commerce-espn @env:non-prod

# RIGHT for ESPN marketing - note it is "production", not "prod"
@service:espn-nexus @env:production
@service:espn-nexus @env:stage

# Narrow a non-prod commerce branch deploy (commerce only - marketing has no dss_branch)
@service:web-solo-commerce-espn @context.dss_branch:my-branch`}
        lang="text"
        filename="datadog-env-filters.txt"
      />
      <p>
        Two words differ across the two surfaces — <code>prod</code> versus{" "}
        <code>production</code> — and one value space is missing entirely. An
        empty graph is the failure mode. Always confirm you get{" "}
        <em>any</em> rows with service alone before adding filters.
      </p>

      <h2 id="sampling-and-the-unsampled-event">
        Sampling, and the One Unsampled Event
      </h2>
      <p>
        Two sample rates coexist in the same browser, and confusing them makes
        every count wrong by an order of magnitude:
      </p>
      <ul>
        <li>
          <strong>RUM sessions: 10% in prod</strong> on both ESPN surfaces
          (100% in non-prod / local). Session <em>replay</em> is 10% too, and
          only 100% when <em>local</em> non-prod.
        </li>
        <li>
          <strong>Browser logs: 100%</strong> on commerce. Marketing does not
          initialise browser logs at all.
        </li>
      </ul>
      <p>
        So in prod, on commerce, <strong>logs are the higher-fidelity signal
        than RUM</strong> — the opposite of most people&apos;s intuition. Any
        count you take from RUM in prod must be multiplied by roughly ten to
        become a population estimate, and that multiplication is only valid for
        rates and ratios, never for &quot;did this specific user hit this?&quot;
        Sampling is per <em>session</em>, not per event, so a sampled-out
        session is entirely absent — you never see a partial journey.
      </p>
      <p>
        Which is why the purchase-success signal deliberately bypasses sampling.
        The code says so in a comment:
      </p>
      <CodeBlock
        code={`datadogRum.addAction('SIGNUP_SUCCESS', {
  owner: Owners.TAP,
  actionCode: 'SIGNUP_SUCCESS',
  actionKey: action.actionKey,
  actionData: {
    ...action.data,
    salesPlatform,
    offerId,
    executionSource,
    sessionStorageDeviceProfile: lpo.deviceProfile,
    isMagicLinkFlow,
  },
  commerceAttribution,
});

// We log in addition to adding the RUM action because logs are not sampled.
// This gives us an accurate view of how many times we get a successful call to Flex.
datadogLogs.logger.info('SIGNUP_SUCCESS', {
  actionKey: action.actionKey,
  ...action.data,
  salesPlatform,
  offerId,
  executionSource,
  commerceAttribution,
  sessionStorageDeviceProfile: lpo.deviceProfile,
  isMagicLinkFlow,
});`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/signup/side-effects/flex-billing-execution.ts"
      />
      <p>
        <strong>Why you would deliberately double-emit.</strong> A purchase is
        not a UX metric, it is a <em>count that someone reconciles against
        money</em>. A 10%-sampled count cannot be reconciled: it is off by
        sampling noise, and the noise is not uniform across cohorts because
        sampling is per-session. The RUM action is kept because it lives inside
        the session and gives you the surrounding waterfall, replay and errors
        when you are debugging one user. The unsampled log is what you graph,
        alert on, and hand to finance. That is the general pattern: <strong>RUM
        for narrative, unsampled logs for counts.</strong>
      </p>
      <MermaidDiagram
        chart={purchaseSequenceDiagram}
        title="One ESPN Purchase, Three Telemetry Systems"
        caption="Follow the two SIGNUP_SUCCESS emissions. Only the log survives sampling, which is why it is the countable purchase signal."
        minHeight={550}
      />
      <p>
        One more nuance visible in that sequence: purchase-success{" "}
        <em>analytics</em> do not fire on the billing page. The side effect calls{" "}
        <code>setShouldFirePurchaseSuccessAnalytics(true)</code> to arm them for
        the <em>next</em> page. If a user closes the tab during the navigation,
        the purchase exists in the log and in Flex but never appears in Adobe.
        That is a real, structural reason for Adobe and Datadog purchase counts
        to disagree slightly, and it is the first thing to say when someone asks
        why the numbers do not match.
      </p>

      <h2 id="four-names-problem">The Four-Names Problem</h2>
      <p>
        Each ESPN app carries a <em>different</em> identifier in each tool. This
        is not a bug to fix, it is a daily translation skill: you know which
        signal you want, and you must look up the name that signal uses.
      </p>
      <ArticleTable
        caption="Translate a service name between tools. Querying the wrong one returns an empty graph, not an error."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Tool / signal</th>
              <th>ESPN commerce</th>
              <th>ESPN marketing</th>
              <th>Where it is set</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Browser RUM</td>
              <td>
                <code>web-solo-commerce-espn</code>
              </td>
              <td>
                <code>espn-nexus</code>
              </td>
              <td>
                <code>next.config.js</code> →{" "}
                <code>datadogServiceName</code>
              </td>
            </tr>
            <tr>
              <td>Server APM &amp; server logs</td>
              <td>
                <code>espnplus-commerce</code>
              </td>
              <td>
                <code>espnplus-nexus</code>
              </td>
              <td>
                <code>DD_SERVICE</code> in{" "}
                <code>apps/commerce/espn/.env</code> / deploy env
              </td>
            </tr>
            <tr>
              <td>
                Deploy system —{" "}
                <code>DATADOG_APP_NAME</code>
              </td>
              <td>
                <code>web-solo-commerce-espn</code>
              </td>
              <td>
                <code>espn-plus-non-sub-browse</code>
              </td>
              <td>
                <code>ci/espnplus/commerce</code>,{" "}
                <code>ci/espnplus/nexus</code>
              </td>
            </tr>
            <tr>
              <td>CI Test Visibility</td>
              <td>
                <code>cup_commerce/apps/espn</code>,{" "}
                <code>cup_commerce/espn</code>
              </td>
              <td>
                <code>espnplus-nexus</code>,{" "}
                <code>bix-caleen/apps/espn</code>
              </td>
              <td>test-upload scripts and workflow inputs</td>
            </tr>
            <tr>
              <td>
                Debug-panel log link —{" "}
                <em>the fifth name</em>
              </td>
              <td>
                <code>observe.info()</code> surfaces the live values
              </td>
              <td>
                Toodles queries{" "}
                <code>service:espnplus-nexus</code>
              </td>
              <td>
                <code>toodles.tsx</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The practical drill, and it takes ten seconds once you internalise it:
      </p>
      <CodeBlock
        code={`# 1. Decide the SIGNAL first, then look up the name.
#    "Is the browser erroring?"        -> RUM          -> web-solo-commerce-espn
#    "Is the Node server erroring?"    -> APM / logs   -> espnplus-commerce
#    "Did the deploy go out?"          -> deploy/CD    -> espnplus-commerce app, web-solo-commerce-espn DD app name
#    "Did the test suite regress?"     -> CI Vis       -> cup_commerce/apps/espn

# 2. Marketing is a DIFFERENT app with a DIFFERENT name in every one of those rows.
#    RUM espn-nexus  vs  APM espnplus-nexus  vs  deploy espn-plus-non-sub-browse

# 3. Sanity check before you trust an empty result:
@service:web-solo-commerce-espn                      # any rows at all?
@service:web-solo-commerce-espn @env:prod            # then narrow`}
        lang="text"
        filename="espn-service-names.txt"
      />

      <h2 id="blind-spots">Blind Spots: The Coverage Map</h2>
      <p>
        Knowing where you are blind is the core competency. An incident where
        you believe you have coverage and do not is strictly worse than an
        incident where you know you must reproduce locally. Here is the complete
        map.
      </p>
      <MermaidDiagram
        chart={coverageMapDiagram}
        title="ESPN Observability Coverage Map"
        caption="Read the DARK column as a to-do list of things you must reason about from code, not from a dashboard."
        minHeight={550}
      />
      <ArticleTable
        caption="Every known ESPN observability gap, the tool that should cover it, and what is actually missing."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>Surface</th>
              <th>Observed by</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Server-side rendering —{" "}
                <code>getServerSideProps</code>, API routes
              </td>
              <td>Server APM + server logs only</td>
              <td>
                <strong>Never reaches RUM.</strong>{" "}
                <code>init()</code> returns early on{" "}
                <code>!isBrowser()</code>. An SSR failure is invisible in the
                RUM Explorer.
              </td>
            </tr>
            <tr>
              <td>ESPN marketing browser logs</td>
              <td>nothing</td>
              <td>
                No <code>datadogLogs.init</code>, therefore no{" "}
                <code>team</code> / <code>twdc.datadog_log_index</code> tag and
                no team-index routing. Marketing browser logs are not where you
                expect commerce logs to be.
              </td>
            </tr>
            <tr>
              <td>
                <code>@view.name</code> normalisation
              </td>
              <td>
                RUM <code>beforeSend</code> → <code>setViewName</code>
              </td>
              <td>
                Only rewrites paths containing <code>/commerce</code>,{" "}
                <code>/identity</code> or <code>/profiles</code>. Every other
                ESPN commerce route keeps the raw pathname and{" "}
                <strong>fragments across locales</strong>.
              </td>
            </tr>
            <tr>
              <td>RUM ↔ APM correlation</td>
              <td>
                <code>allowedTracingUrls</code>
              </td>
              <td>
                Allowlist covers <code>*.bamgrid.com</code> and{" "}
                <code>edge-api.hulu*.com</code>.{" "}
                <strong>ESPN-owned hosts are excluded</strong>, so those calls
                carry no trace headers and the browser-to-backend hop breaks.
              </td>
            </tr>
            <tr>
              <td>Experiment variant on ESPN marketing</td>
              <td>nothing</td>
              <td>
                Marketing sets <strong>no global context at all</strong> — no{" "}
                <code>setGlobalContextProperty</code>, no{" "}
                <code>setUser</code>. You cannot slice marketing RUM views or
                Core Web Vitals by variant. That capability must be added before
                it can be promised.
              </td>
            </tr>
            <tr>
              <td>90% of prod sessions</td>
              <td>
                partially — logs at 100% on commerce
              </td>
              <td>
                <code>sessionSampleRate: 10</code> in prod on both surfaces. A
                specific user&apos;s session is a coin flip you lose nine times
                out of ten.
              </td>
            </tr>
            <tr>
              <td>Session Replay usefulness on commerce</td>
              <td>Replay at 10%</td>
              <td>
                <code>defaultPrivacyLevel: mask</code> masks all text. Visual
                bug triage from commerce replays is far harder than from
                marketing replays.
              </td>
            </tr>
            <tr>
              <td>
                <code>@view.referrer</code> on marketing
              </td>
              <td>RUM</td>
              <td>
                Synthetic — overwritten in <code>beforeSend</code> from a{" "}
                <code>preserveReferrer</code> localStorage key. Do not treat it
                as the browser referrer.
              </td>
            </tr>
            <tr>
              <td>Pre-consent activity</td>
              <td>RUM itself is not consent-gated</td>
              <td>
                Adobe is gated on targeted-advertising consent, so
                analytics-derived RUM actions such as{" "}
                <code>FIRE_ADOBE_PAGE_IMPRESSION_EVENT</code> never fire before
                consent.
              </td>
            </tr>
            <tr>
              <td>Ad-blocked RUM intake</td>
              <td>nothing</td>
              <td>
                <code>browser-intake-datadoghq.com</code> is commonly blocked.
                Blocked sessions are silently absent, not errored.
              </td>
            </tr>
            <tr>
              <td>Adobe Launch data-layer population</td>
              <td>no unit tests</td>
              <td>
                <code>adobe-launch.tsx</code> is marked{" "}
                <code>istanbul ignore file</code>, so the data layer that feeds
                all ESPN Adobe reporting is excluded from the coverage gate.
                Region is also hardcoded to US.
              </td>
            </tr>
            <tr>
              <td>ESPN footer / legal-link drift</td>
              <td>nothing</td>
              <td>
                All four scheduled Datadog audit crons are Disney+ or Stitch
                scoped. <strong>No scheduled audit covers ESPN.</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="frustration-signals">
        Frustration Signals: Collected, Barely Named
      </h2>
      <p>
        RUM derives three <strong>frustration signals</strong> from user
        interactions: a <strong>rage click</strong> (the same element clicked
        repeatedly inside a one-second window — someone hammering an
        unresponsive button), a <strong>dead click</strong> (a click that
        produces no visible reaction), and an <strong>error click</strong> (a
        click immediately followed by a JS error). On a checkout funnel these are
        the highest-value UX telemetry available, because they catch the two
        failures that a latency dashboard and an error rate both miss: the button
        that does nothing, and the button that looks inert but is actually
        working slowly.
      </p>
      <p>
        &quot;Derived automatically&quot; is where people get this wrong, so
        state the prerequisite chain explicitly — each gate must pass before the
        next one matters:
      </p>
      <ol>
        <li>
          <strong>Interaction tracking must be on.</strong>{" "}
          <code>trackUserInteractions</code> defaults to <code>false</code> in{" "}
          <code>@datadog/browser-rum</code>. Off means RUM collects no automatic
          actions at all, so there is nothing for a frustration signal to attach
          to — not a sparse dataset, an <em>empty</em> one.
        </li>
        <li>
          <strong>Actions must carry readable names</strong>, or the signal is
          unactionable: <code>Click on div</code> tells you a user rage-clicked
          something, somewhere.
        </li>
        <li>
          <strong>There must be a dimension to slice by</strong> to attribute
          frustration to a release, variant or cohort.
        </li>
      </ol>
      <p>
        Gate 1 <strong>passes on both ESPN surfaces</strong>, and on commerce it
        is not even possible to break:
      </p>
      <CodeBlock
        code={`// GATE 1 - PASS on both ESPN surfaces.

// ESPN commerce, inherited from the shared wrapper.
// packages/observe/src/observe.ts:60
    trackUserInteractions: true,

// And no consumer can switch it off: packages/observe/src/types.ts:5-8 narrows
// what a caller may pass through options.rumConfig to exactly three keys.
type RumConfig = Pick<
  RumInitConfiguration,
  'allowedTracingUrls' | 'applicationId' | 'beforeSend'
>;

// ESPN marketing, raw init - set independently, same value.
// apps/marketing-unified/espn/src/libs/datadog-rum.ts:30
    trackUserInteractions: true,

// GATE 2 - DEGRADED on both. Measured repo-wide, excluding node_modules:
//   actionNameAttribute  -> ZERO hits anywhere in the monorepo
//   data-dd-action-name  -> 34 hits, ALL under packages/cgi/commerce-base/src;
//                           ZERO under apps/commerce/espn, ZERO under
//                           apps/marketing-unified, ZERO under packages/cgi/footer

// NOT a gap: trackFrustrations is absent and should be. The catalog pins
// @datadog/browser-rum ~5.35.1 (pnpm-workspace.yaml:62); the option was removed
// in v4 and frustration collection is implied by trackUserInteractions.`}
        lang="typescript"
        filename="espn-frustration-prerequisites.ts"
      />
      <p>
        So the honest headline is the opposite of what a blind-spot audit
        expects: <strong>ESPN does have frustration data on both applications
        today.</strong> What it lacks is <em>names</em>. Of the 34{" "}
        <code>data-dd-action-name</code> attributes in the monorepo, 32 sit under{" "}
        <code>commerce-base/src/profiles/</code>; the other two are in{" "}
        <code>order-submission-interaction.tsx:105</code> and{" "}
        <code>change-payment-forms-container.tsx:153</code>. Whether either
        renders on an ESPN commerce route is <strong>undetermined</strong> —{" "}
        <code>apps/commerce/espn</code> imports neither directly, and a name grep
        cannot settle it; that needs a render trace. Everything else falls back
        to the SDK&apos;s DOM heuristics.
      </p>
      <MermaidDiagram
        chart={frustrationChainDiagram}
        title="The ESPN Frustration-Visibility Path"
        caption="Gate 1 passes on both apps, which is the good news. Gate 2 is where ESPN loses actionability, and Gate 3 is where marketing drops out entirely."
        minHeight={550}
      />
      <ArticleTable
        caption="The three signals against what ESPN can actually see. Collection is on everywhere; naming is the weak link, and slicing dies on marketing."
        minWidth={1040}
      >
        <table>
          <thead>
            <tr>
              <th>Signal / prerequisite</th>
              <th>What it means</th>
              <th>ESPN commerce</th>
              <th>ESPN marketing</th>
              <th>First check</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Rage click</strong>
              </td>
              <td>Same element clicked repeatedly in ~1s</td>
              <td>
                Yes — <code>observe.ts:60</code>
              </td>
              <td>
                Yes — <code>datadog-rum.ts:30</code>
              </td>
              <td>
                Facet <code>@view.name</code>; read the billing row first
              </td>
            </tr>
            <tr>
              <td>
                <strong>Dead click</strong>
              </td>
              <td>Click with no visible reaction — the classic dead CTA</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>Noisiest of the three; confirm on a replay before filing</td>
            </tr>
            <tr>
              <td>
                <strong>Error click</strong>
              </td>
              <td>Click immediately followed by a JS error</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>
                Route it via <code>@context.owner</code> on the paired error
              </td>
            </tr>
            <tr>
              <td>
                Gate 2 — readable name (<code>actionNameAttribute</code>)
              </td>
              <td>
                Turns <code>Click on div</code> into a ticketable name
              </td>
              <td>
                <strong>No</strong> — unset; zero attributes in{" "}
                <code>apps/commerce/espn</code>
              </td>
              <td>
                <strong>No</strong> — unset; zero in{" "}
                <code>apps/marketing-unified</code>
              </td>
              <td>
                Read real <code>@action.target.name</code> values before
                promising element-level analysis
              </td>
            </tr>
            <tr>
              <td>Gate 3 — slice by variant</td>
              <td>Attribute frustration to an experiment or release</td>
              <td>
                Yes — <code>@context.experiments</code>,{" "}
                <code>datadog.tsx:125</code>
              </td>
              <td>
                <strong>No</strong> — no global context at all
              </td>
              <td>On marketing, stop at &quot;frustration exists&quot;</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Sampling decides whether you can even see it.</strong> Both apps
        keep 10% of prod sessions —{" "}
        <code>sessionSampleRate: isNonProd ? 100 : 10</code> at{" "}
        <code>packages/observe/src/observe.ts:58</code>, and{" "}
        <code>sampleRate</code> resolving to 10 outside <code>local</code>/
        <code>stage</code> at{" "}
        <code>apps/marketing-unified/espn/src/libs/datadog-rum.ts:15</code>{" "}
        (applied to sessions and replay alike at <code>:24</code>–
        <code>:25</code>). Frustration on a checkout funnel is a minority of a
        minority, so at 10% a cluster affecting 1% of billing sessions is a
        handful of events per day: directionally readable over a week, useless
        over an hour. Two consequences — never alert on a raw frustration{" "}
        <em>count</em>, only on a rate over sessions; and accept that a specific
        user&apos;s frustration is unrecorded nine times in ten. Replay does not
        rescue you on commerce, where{" "}
        <code>defaultPrivacyLevel: mask</code> (<code>observe.ts:56</code>) masks
        all text. Whether that privacy level also masks the <em>computed action
        name</em> is <strong>not determinable from the repo</strong> — it is SDK
        behaviour, so verify it in the RUM Explorer rather than assuming.
      </p>
      <p>
        <strong>Why the checkout funnel is where this pays off.</strong> The{" "}
        <strong>ledger / billing screen</strong> is the last irreversible step: a
        dead click on <em>Agree and Subscribe</em> is a lost purchase that
        produces no error, no <code>SIGNUP_SUCCESS</code> log and no Adobe event
        — invisible to every other signal in this module, and a frustration
        signal is the only telemetry that would catch it. It is also the one page
        with a second analytics code path behind{" "}
        <code>wpnx-enable-legacy-analytics-espn</code>, so frustration data is a
        vendor-independent check on it. The <strong>add-ons screen</strong> is
        the other: a real step in ESPN&apos;s checkout whose RUM redirect reason
        is already mislabelled. Mis-attributed <em>and</em> unnamed at the action
        level makes it the least observable screen in the revenue path.
      </p>
      <CodeBlock
        code={`# PROVE THE DATA EXISTS FIRST - always, before adding filters.
@service:web-solo-commerce-espn @type:session @session.frustration.count:>0

# 1. Frustrated sessions, ESPN commerce prod. Trend this as a RATE over
#    all sessions, never as a raw count - 10 percent sampling in prod.
@service:web-solo-commerce-espn @env:prod @type:session @session.frustration.count:>0

# 2. WHICH SCREEN. Facet by @view.name and read the billing and add-ons rows.
#    Remember @view.name is only normalised on /commerce /identity /profiles.
@service:web-solo-commerce-espn @env:prod @type:view @view.frustration.count:>0

# 3. Rage clicks only, commerce. Add @context.experiments or @version to
#    attribute a regression to a variant or a deploy.
@service:web-solo-commerce-espn @env:prod @type:action @action.frustration.type:rage_click

# 4. ESPN marketing - note the env spelling is "production", not "prod",
#    and there is NO variant dimension to add here.
@service:espn-nexus @env:production @type:action @action.frustration.type:dead_click

# Valid @action.frustration.type values: rage_click, dead_click, error_click.
# NEVER write @env:stage against web-solo-commerce-espn - it matches nothing.`}
        lang="text"
        filename="espn-frustration-queries.txt"
      />
      <p>
        <strong>The finding, for the blind-spot inventory above.</strong>{" "}
        <em>Confirmed gap:</em> <code>actionNameAttribute</code> is unset
        monorepo-wide and no ESPN-rendered element carries a{" "}
        <code>data-dd-action-name</code>, so ESPN&apos;s frustration data is
        present but weakly actionable — you can prove users are struggling and
        localise it to a view, not reliably to a control. <em>Confirmed gap:</em>{" "}
        marketing frustration cannot be sliced by variant — the same root cause
        as the existing no-global-context row, with a second consequence.{" "}
        <em>Undetermined, and worth saying so rather than guessing:</em> whether
        the two non-profiles components reach an ESPN route, and whether
        commerce&apos;s <code>mask</code> level suppresses computed action names.
      </p>
      <p>
        The remediation is cheap, which is the strongest argument for it. No init
        change is required — the SDK reads <code>data-dd-action-name</code> by
        default, so the fix is a naming convention on the elements that matter:
      </p>
      <CodeBlock
        code={`<!-- Gate 2 remediation. Convention: "<screen>: <intent>", stable, no PII,
     no interpolated ids - the name is a facet value and a monitor contract,
     exactly like a RUM action name. Ship the funnel first, not the whole app. -->
<button data-dd-action-name="billing: agree and subscribe">…</button>
<button data-dd-action-name="billing: edit payment method">…</button>
<button data-dd-action-name="add-ons: continue">…</button>
<button data-dd-action-name="add-ons: skip">…</button>

<!-- Only if a different attribute is preferred repo-wide does the init change,
     and on commerce it CANNOT be passed through options.rumConfig - it would
     have to be added to packages/observe/src/observe.ts and to the RumConfig
     Pick in packages/observe/src/types.ts:5-8. Prefer the default attribute. -->`}
        lang="html"
        filename="espn-action-name-convention.html"
      />

      <h2 id="logging-and-error-taxonomy">Logging and the Error Taxonomy</h2>
      <p>
        Server-side logging goes through <code>@solo/logger</code>, which is{" "}
        <strong>not in this monorepo</strong> — it comes from the pnpm catalog.
        The signature is pino-style: object first, message second.
      </p>
      <CodeBlock
        code={`const logger = getLogger('_app.page');

logger.info({ url: appContext.ctx.req?.url }, 'Page Requested');`}
        lang="typescript"
        filename="apps/commerce/espn/pages/_app.page.tsx"
      />
      <p>
        On ESPN marketing there is a layer of indirection you must know about,
        because it silently attaches trace ids to every log — and it can silently
        stop:
      </p>
      <CodeBlock
        code={`import { tracer } from 'dd-trace';
import { getLogger as realGetLogger } from 'real-@solo/logger';

// This file will be included whenever you try to import '@solo/logger'. This
// will enable all logging, even logging in dependencies, to have datadog info
// injected. This will associate these logs with traces.
tracer.init();

// ... later, when wrapping each log method:
      realLogger[key] = function (...logArgs: any[]) {
        const modifiedArgs = logArgs.map((arg) => {
          if (typeof arg === 'object') {
            const activeScope = tracer.scope().active();

            return {
              ...arg,
              dd: {
                ...arg?.dd,
                env: process.env.DD_ENV,
                service: process.env.DD_SERVICE,
                span_id: activeScope?.context().toSpanId(),
                trace_id: activeScope?.context().toTraceId(),
                version: process.env.DD_VERSION,
              },
            };
          }

          return arg;
        });`}
        lang="typescript"
        filename="apps/marketing-unified/espn/src/libs/logger-with-datadog.ts"
      />
      <p>
        A webpack alias maps <code>@solo/logger</code> to that file and the real
        package to <code>real-@solo/logger</code>. The fragile part: it decides
        which properties are log methods by checking{" "}
        <code>potentialLogFunction.name === &apos;LOG&apos;</code>. A rename
        inside <code>@solo/logger</code> would <strong>silently</strong> stop
        trace injection — no error, no warning, just logs that no longer
        correlate to spans. The file is also{" "}
        <code>istanbul ignore file</code>, so no test would catch it. If ESPN
        marketing logs stop showing up next to their traces, this line is the
        first suspect.
      </p>
      <p>
        The error taxonomy itself lives in one 464-line file:{" "}
        <code>
          packages/cgi/commerce-base/src/common/constants/observability.ts
        </code>
        . Its shape:
      </p>
      <ul>
        <li>
          <code>Owners</code> — re-exported from <code>@solo/observe</code>{" "}
          (with a TODO to remove the re-export). Eight teams:{" "}
          <code>commerce-core</code>, <code>commerce-platform</code>,{" "}
          <code>merchandising-management-and-activation</code>,{" "}
          <code>transactional-and-payments</code>,{" "}
          <code>account-and-retention</code>, <code>identity</code>,{" "}
          <code>profiles</code>, <code>xd</code>. This is what becomes{" "}
          <code>@context.owner</code> on a RUM error.
        </li>
        <li>
          <code>Actions</code> (in <code>@solo/observe</code>) — four coarse
          categories: <code>FLEX_INTERACTION</code>, <code>PAGE_VIEW</code>,{" "}
          <code>REDIRECT</code>, <code>3RD_PARTY_LIBRARY</code>.
        </li>
        <li>
          <code>ACTION_CODES</code> — <strong>12</strong> members, the named
          non-error things worth counting (<code>TOKENIZE_PAYMENT_SUCCESS</code>
          , the <code>OFFERS_*</code> family, the{" "}
          <code>IN_PRODUCT_SWITCH_REDIRECT</code> pair).
        </li>
        <li>
          <code>ERROR_CODES</code> — <strong>73</strong> members, clustered into
          families: <code>MISSING_*</code> (~22),{" "}
          <code>NOT_FOUND_*</code> (7), <code>UNRECOGNIZED_*</code> (7),{" "}
          <code>SK_AGE_VERIFICATION_*</code> (10),{" "}
          <code>DSS_DATA_LAYER_*</code> (3), <code>OFFER*</code> (5), plus
          singletons like <code>BLOCKED_REDIRECT_TARGET</code> and{" "}
          <code>UNSUPPORTED_TYPE_FROM_FLEX</code>.
        </li>
        <li>
          <code>ERROR_MESSAGES</code> — a nested, <em>page-scoped</em> map of
          human copy keyed by page (<code>BILLING</code>,{" "}
          <code>CHANGE_PAYMENT</code>, <code>CREATE_CHECKOUT</code>,{" "}
          <code>ROADBLOCK</code>, …).
        </li>
      </ul>
      <p>
        <strong>A representative diagnostic-context improvement.</strong>{" "}
        <code>INVALID_GLIMPSE_METRICS_DATA</code> is not in{" "}
        <code>ERROR_CODES</code> at all — it is a literal{" "}
        <code>errorCode</code> field on nine{" "}
        <code>datadogLogs.logger.error</code> sites in the Glimpse tracker. A
        recent change added the context that makes it actionable:
      </p>
      <CodeBlock
        code={`datadogLogs.logger.error(
  'GLIMPSE METRICS DATA – INVALID INTERACTION/INPUT VIEW METRICS DATA',
  {
    errorCode: 'INVALID_GLIMPSE_METRICS_DATA',
    source: 'glimpse-analytics-tracker:user_interaction',
    eventUrn,
    analyticsPageViewUUID,
    glimpseContainerUUID,
    pageKey: validPageView?.payload.pageKey,
    pageName: validPageView?.payload.pageName,
    pageEventUrn: validPageView?.eventUrn,
    containerEventUrn: validContainerView?.eventUrn,
  }
);`}
        lang="typescript"
        filename="packages/instrumentation/src/glimpse/tracker/glimpse-analytics-tracker.ts"
      />
      <p>
        Before that change the log told you an event was invalid; it did not tell
        you <em>which</em> of nine call sites produced it or which page the user
        was on. Adding <code>source</code> turned it into a facetable field, so
        one query plus a facet localises the bug without a repro. The same
        handler also demonstrates <strong>severity tiering</strong>: a hard{" "}
        <code>error</code> when <code>eventUrn</code> /{" "}
        <code>analyticsPageViewUUID</code> are missing, versus a{" "}
        <code>warn</code>-and-drop when container or page metrics are merely
        invalid. Note the irony that reinforces the opening lesson: this
        carefully-instrumented error code is a <em>Disney+/Hulu</em> signal, not
        an ESPN one.
      </p>
      <p>
        <strong>The convention for adding a new error code well.</strong> Five
        things, and the fifth is the one people skip:
      </p>
      <CodeBlock
        code={`// 1. Add the code to the enum, in its family, SCREAMING_SNAKE, name === value.
export enum ERROR_CODES {
  // ...
  MISSING_ESPN_WALLET_CTA = 'MISSING_ESPN_WALLET_CTA',
}

// 2. Add page-scoped human copy in ERROR_MESSAGES under the owning page key.

// 3. Always attach an owner - this is what routes the alert to a team facet.
datadogRum.addError(error, {
  owner: Owners.TAP,
  errorCode: ERROR_CODES.MISSING_ESPN_WALLET_CTA,

  // 4. Attach the diagnostic context that lets you localise WITHOUT a repro:
  //    a 'source' discriminator when the same code fires from several sites,
  //    the ids you would otherwise have to guess, and the decision inputs.
  source: 'change-payment-page:wallet-cta',
  path: router.pathname,
  partnerName,
  hasWalletCta: Boolean(walletCTA),
});

// 5. Put NOTHING identifying in there. No emails, names, tokens, card data.
//    Opaque ids only. accountId / deviceId via setUser is the existing, sanctioned
//    exception - do not extend that pattern.`}
        lang="typescript"
        filename="adding-an-error-code.ts"
      />
      <p>
        Error <em>routing</em> comes from the boundaries.{" "}
        <code>PageErrorBoundary</code> requires an{" "}
        <code>owner: Owners</code> prop and reports{" "}
        <code>sourceComponent: PageErrorBoundary</code> plus{" "}
        <code>path</code>; <code>ApplicationErrorBoundary</code> has{" "}
        <strong>no owner</strong>, so app-level crashes land unattributed. When
        an ESPN error has no <code>@context.owner</code>, that is usually why.
      </p>

      <h2 id="monitors-slos-synthetics">
        Monitors, SLOs &amp; Synthetics Live Elsewhere
      </h2>
      <p>
        State this plainly because it changes how you plan work:{" "}
        <strong>no monitor definitions, no SLO definitions and no Synthetics
        configs exist in this repository.</strong> An exhaustive search for
        Datadog monitor / SLO / synthetics URLs and{" "}
        <code>monitor_id</code> turns up only a committed RUM Explorer deep
        link, the Toodles logs links, documentation links, and{" "}
        <code>site: datadoghq.com</code> config values.
      </p>
      <p>
        Monitors are <em>referenced</em> but never <em>defined</em> here — a
        comment in the marketing RUM init says the{" "}
        <code>window.datadogRum</code> handoff is &quot;what powers the footer
        runtime monitors,&quot; and the security docs mention a Datadog monitor
        watching for scanner-finding regressions. They live in a separate
        observability configuration repository (named in{" "}
        <code>packages/observe/src/types.ts</code> as the source of the log-index
        mapping) and/or are UI-managed.
      </p>
      <p>
        <strong>What that means for a code change that needs alerting.</strong>{" "}
        Your PR is only half the work:
      </p>
      <ol>
        <li>
          Emit the signal from this repo — a named RUM action or, for anything
          you intend to <em>count</em>, an unsampled log with a stable message
          and an <code>errorCode</code> / <code>actionCode</code>.
        </li>
        <li>
          Treat the emitted names as a <strong>public contract</strong>. A
          monitor in another repo greps for that exact string. Renaming{" "}
          <code>SIGNUP_SUCCESS</code> in a &quot;harmless tidy-up&quot; silently
          breaks an alert you cannot see from here.
        </li>
        <li>
          Open the corresponding change in the observability-config repo, or ask
          the owning team to, and reference it from your PR. Never assume a
          monitor exists because a metric does.
        </li>
        <li>
          To enumerate what monitors actually exist for{" "}
          <code>web-solo-commerce-espn</code> and <code>espn-nexus</code>, query
          the Datadog API — the repo cannot tell you.
        </li>
      </ol>
      <p>
        The one place in the codebase with genuinely monitor-grade named events
        is the footer package: <code>FOOTER_RENDER_SUCCESS</code> and{" "}
        <code>FOOTER_FALLBACK_RENDER</code>, with{" "}
        <code>used_fallback</code>, <code>error_kind</code> and{" "}
        <code>footer_package_version</code> attributes, every emission guarded
        by a <code>typeof datadogRum?.addAction === &apos;function&apos;</code>{" "}
        check because the footer resolves RUM from <code>window</code>. Read it
        as the reference example of designing an event for an alert rather than
        for a debugging session — including its explicit warning not to conflate
        a fallback render with an error.
      </p>

      <h2 id="observability-defects">Two Real Observability Defects</h2>
      <p>
        Instrumentation is code, and code has bugs. The difference is that a bug
        in instrumentation does not crash — it <em>lies</em>, confidently, and
        you act on it. Both of these are live in the repo today.
      </p>
      <h3>Defect 1 — RUM reports the wrong redirect reason</h3>
      <p>
        After login, <code>useNavigationRedirect</code> walks an ordered list of
        redirect handlers and emits a RUM action naming the winner, so you can
        answer &quot;why did this user land here?&quot; from RUM:
      </p>
      <CodeBlock
        code={`for (const handler of orderedNavigationRedirectHandlers) {
  const handlerResult = handler(handlerParams);

  if (handlerResult?.destination) {
    datadogRum.addAction('[navigation] Redirect handler success', {
      owner: Owners.IDENTITY,
      destination: handlerResult.destination,
      handler: handlerResult.handler,
      meta: handlerResult.meta,
    });

    return handlerResult.destination;
  }
}`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/common/hooks/use-navigation-redirect.tsx"
      />
      <p>
        Notice that <code>handler</code> is <strong>self-reported</strong> — each
        handler returns its own name as a string literal. One of them returns the
        wrong one:
      </p>
      <CodeBlock
        code={`// TODO GREAT-541: Cleanup / Move to Production Flagship Add-on step in SUF experiment
export const addOnsExperimentRedirectHandler: NavigationRedirectHandler = ({
  isAddOnsRouteEnabled,
  queryParams,
}) => {
  if (isAddOnsRouteEnabled && queryParams?.pref) {
    return {
      destination: IDENTITY_ROUTES['add-ons'],
      handler: 'entitledUserRedirectHandler',   // <-- WRONG: this is addOnsExperimentRedirectHandler
    };
  }
};`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/common/redirect/handlers.ts"
      />
      <p>
        Every other handler in the file reports its own name correctly. This one
        reports <code>entitledUserRedirectHandler</code>. The user-visible
        behaviour is fine — they land on <code>/commerce/add-ons</code>, which is
        correct. But RUM now says the <em>reason</em> was entitlement, not the
        add-ons experiment. On ESPN, where add-ons is a real step in the
        checkout, that means: an add-ons-experiment traffic count taken from RUM
        is under-reported and folded into an unrelated bucket; and an engineer
        debugging &quot;why is this ESPN user on add-ons?&quot; is pointed at the
        entitlement handler and will read the wrong code path. Note the ordering
        detail that makes it plausible —{" "}
        <code>addOnsExperimentRedirectHandler</code> runs <em>before</em>{" "}
        <code>entitledUserRedirectHandler</code>, so the mislabel is invisible
        from destination alone.
      </p>
      <h3>Defect 2 — the vendor / plumbing confusion</h3>
      <p>
        The second defect is not in code, it is in inference — and it is more
        expensive. The chain is: grep <code>Glimpse</code> in ESPN commerce →
        find hits → conclude ESPN uses Glimpse → write a ticket asking for a{" "}
        <code>container_view</code> event → discover mid-sprint that no Adobe
        container-view handler exists → re-specify the requirement → the analyst
        who asked for it was talking about a report that does not exist for
        ESPN&apos;s report suite either.
      </p>
      <p>
        <strong>How to sanity-check observability itself</strong> — the general
        skill both defects teach:
      </p>
      <ul>
        <li>
          <strong>Never trust a self-reported label.</strong> If a field is a
          string literal written by hand next to the thing it names, it can
          drift. Cross-check the label against an independent field:{" "}
          <code>destination</code> here, or <code>view.url</code> generally.
        </li>
        <li>
          <strong>Verify the emitter, not the dashboard.</strong> Before you
          believe a number, find the line of code that emits it and read its
          guard. <code>FIRE_ADOBE_PAGE_IMPRESSION_EVENT</code> is a good example
          of an emitter written <em>defensively</em> — it deliberately mirrors{" "}
          <code>adobeTrack</code>&apos;s <code>window.s</code> guard so it cannot
          produce a false positive.
        </li>
        <li>
          <strong>Prove a signal exists before you rely on it in an
          incident.</strong> Locally, RUM initialises at 100% sampling with{" "}
          <code>version: local</code>. Turn on{" "}
          <code>localStorage.enableAnalyticsDebugger = &apos;1&apos;</code> for
          tracker console output, and use the Toodles debug panel to read the
          live <code>applicationId</code> / <code>sessionId</code> /{" "}
          <code>service</code> rather than assuming them.
        </li>
        <li>
          <strong>Two sources disagreeing is information.</strong> Adobe and the
          unsampled log disagreeing on purchase counts has at least three
          structural explanations here — consent gating, the deferred
          purchase-success analytics, and ad-blocked AppMeasurement. Enumerate
          the structural causes before hypothesising a regression.
        </li>
      </ul>

      <h2 id="triage-recipe">Recipe: Did ESPN Purchases Drop?</h2>
      <p>
        The page you are on call for. Someone says &quot;ESPN purchases look
        down this morning.&quot; This is the exact sequence, in order, with the
        identifiers you need:
      </p>
      <MermaidDiagram
        chart={triageDiagram}
        title="ESPN Purchase-Drop Triage"
        caption="Start in logs, not RUM: the purchase signal is unsampled there. The bottom node is the honest list of what you cannot answer."
        minHeight={550}
      />
      <CodeBlock
        code={`# STEP 1 - is it real? Logs, because they are unsampled.
service:web-solo-commerce-espn SIGNUP_SUCCESS
# graph as count, compare to the same window yesterday and last week.
# Flat here means purchases did NOT drop - the REPORT dropped. Jump to step 6.

# STEP 2 - if the count is down, look for a cause in the same index.
service:web-solo-commerce-espn @errorCode:*
# then facet @errorCode and look for movement in:
#   INVALID_CARD, MISSING_ORDER_ID_FLEX_BILLING_EXECUTION,
#   UNRECOGNIZED_FLEX_ACTION_KEY, UNRECOGNIZED_FLEX_NAVIGATE_LOCATION, NETWORK_ERROR

# STEP 3 - RUM errors, for the browser-side narrative and team routing.
@service:web-solo-commerce-espn @env:prod @type:error
@service:web-solo-commerce-espn @env:prod @type:error @context.owner:transactional-and-payments
@service:web-solo-commerce-espn @env:prod @type:error @context.sourceComponent:(ApplicationErrorBoundary OR PageErrorBoundary)
# Remember: @env:stage NEVER matches here. prod or non-prod only.

# STEP 4 - server side. Different service name.
service:espnplus-commerce
# Flex execution latency and 5xx on the subscription signup route.
# Healthcheck traces are deliberately down-sampled to 10 percent, so ignore them.

# STEP 5 - bracket the deploy. version is the lowercased 8-char git sha.
@service:web-solo-commerce-espn @env:prod @version:<sha>
# Compare error rate across the two versions either side of the deploy time.

# STEP 6 - if only the ADOBE numbers moved and the log count is flat:
#   a. check the WeaponX flag wpnx-enable-legacy-analytics-espn (billing page only)
#   b. check the log 'Adobe Analytics script failed to load.'   (ad blockers / CDN)
#   c. check the warn 'Adobe Analytics tried to fire before the script was loaded.'
#   d. remember purchase-success analytics fire on the NEXT page, so a slow
#      navigation loses them while the purchase itself succeeded.`}
        lang="text"
        filename="espn-purchase-drop-triage.txt"
      />
      <p>
        <strong>What this recipe cannot answer, and you must say so out
        loud:</strong>
      </p>
      <ul>
        <li>
          <strong>Where in the funnel the drop started.</strong> If fewer people
          reached billing at all, the cause may be on{" "}
          <code>plus.espn.com</code> — a different RUM application, a different
          service name, no shared session. You cannot follow one user across the
          hop.
        </li>
        <li>
          <strong>Whether an experiment variant caused it on marketing.</strong>{" "}
          ESPN marketing sets no RUM global context, so there is no variant
          dimension to slice by.
        </li>
        <li>
          <strong>Whether the failure is server-side.</strong> RUM never sees
          SSR. You must switch to APM and server logs, under a different service
          name, and you lose the browser context when you do.
        </li>
        <li>
          <strong>Anything about the 90% of sampled-out prod sessions</strong>{" "}
          — rates yes, individual journeys no.
        </li>
        <li>
          <strong>Whether a call to an ESPN-owned API is the culprit.</strong>{" "}
          Those requests carry no trace headers, so the RUM resource does not
          link to a backend trace.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: which analytics system does ESPN web use?"
        intro="A weak answer names a vendor. A strong answer names the vendor, then immediately explains why the obvious grep gives the wrong answer — that is the part that shows you have actually worked in a multi-tenant codebase."
        steps={[
          "Answer directly: ESPN is Adobe Analytics plus Adobe Launch. Hulu is Tealium plus HITS. Disney+ is Glimpse. All three come from one shared instrumentation package that exports six providers.",
          "Immediately raise the trap: grepping Glimpse under the ESPN commerce app returns hits, but they are inherited plumbing — a config prop passed to a shared layout, some type forwarding, and jest mocks. Zero ESPN-authored Glimpse events.",
          "Generalise the lesson: in a shared multi-tenant library, code presence is not feature usage. Authority is the tenant's call sites plus its remote-config enablement list, never the import graph.",
          "Name the consequence for delivery: a request for a container-view event cannot be built for ESPN as written, because container view is Glimpse taxonomy and the Adobe tracker has only page_impression, user_interaction and cancellation_flow_start. The request needs translating before estimating.",
          "Close with the honest caveat: the Glimpse enablement gate fails open, so 'ESPN emits nothing to Glimpse' should be verified against enabledAnalyticsTooling for the espn tenant rather than assumed.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: build me an ESPN purchase-funnel dashboard"
        intro="The interviewer is testing whether you know the limits of the instrumentation. Confidently promising a cross-domain funnel is the failing answer; scoping it correctly and naming the prerequisite work is the passing one."
        steps={[
          "Split the request by surface first: plus.espn.com is RUM application espn-nexus, secure.web.plus.espn.com is web-solo-commerce-espn. Two applications, two app ids, two init paths.",
          "State the hard limit: the sales-to-checkout hop cannot be joined in RUM today — no shared session, no shared user, marketing sets no global context and never calls setUser. Offer Adobe as the cross-surface source, since both surfaces use it.",
          "Get the sampling right in the numbers: purchases must come from the unsampled SIGNUP_SUCCESS browser log, not from the RUM action, or the count is a 10-percent sample and cannot be reconciled.",
          "Get the env tags right: prod or non-prod for commerce, production or stage for marketing. Show that you know an empty widget is the failure mode, not an error.",
          "Name the prerequisite work explicitly: add setGlobalContextProperty for variant on marketing, add a correlation key across the domain hop, and extend allowedTracingUrls to ESPN-owned hosts if RUM-to-APM correlation matters. Then say where the monitors and SLOs will live — a separate config repo, not this one.",
        ]}
      />

      <InterviewChallenge
        title="The dashboard that shows zero"
        scenario={
          <>
            An analyst pings you at 08:40. Their ESPN checkout dashboard shows
            zero for the last two hours. Their widget query is{" "}
            <code>
              @service:web-solo-commerce-espn @env:stage @type:action
              @action.name:container_view
            </code>
            . Separately, a product manager says ESPN purchases are down 40%
            versus yesterday, based on an Adobe report. Marketing traffic to{" "}
            <code>plus.espn.com</code> looks normal in their own dashboard.
            Nothing has deployed since Friday. You are on call.
          </>
        }
        tasks={[
          "Find every reason the analyst's query returns zero, and say which are defects in the query versus defects in the instrumentation.",
          "Design the smallest sequence of queries that decides whether purchases actually dropped, naming the exact service name and index for each step.",
          "Explain why the analyst's dashboard being broken and the PM's 40% claim could be two completely independent facts.",
          "List the parts of this incident you cannot resolve with current instrumentation, and what you would add to close each gap.",
          "Decide what you would put in the incident timeline about confidence levels, given the 10 percent prod session sample rate.",
        ]}
        pitfalls={[
          "Assuming zero rows means an outage. On this codebase an empty result is far more often a wrong identifier than a real absence.",
          "Starting in the RUM Explorer. RUM samples 10 percent of prod sessions; the countable purchase signal is an unsampled browser log.",
          "Trusting 'nothing deployed since Friday'. A WeaponX flag flip changes the ESPN billing analytics code path with no deploy at all.",
          "Treating marketing traffic looking normal as evidence the funnel is intact — you cannot follow a user across the domain hop, so the two dashboards are not comparable.",
          "Reporting the RUM redirect-handler name as ground truth for why users reached a screen.",
        ]}
        signal="A strong candidate fixes three separate identifier errors in one query, moves the purchase count to unsampled logs unprompted, separates 'the report is broken' from 'the product is broken', and finishes with an explicit list of unanswerable questions rather than a guess."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Why the analyst&apos;s query returns zero — three
          independent faults.</strong>
        </p>
        <ol>
          <li>
            <code>@env:stage</code> can never match ESPN commerce. Commerce
            collapses environment to <code>prod</code> or{" "}
            <code>non-prod</code>. Stage, QA and CI all report{" "}
            <code>non-prod</code>. This alone guarantees zero rows forever —
            it is an instrumentation-semantics trap, not a typo.
          </li>
          <li>
            <code>@action.name:container_view</code> can never match anything on
            ESPN. Container view is Glimpse taxonomy; the Adobe tracker has no
            such handler. The analyst is describing a Disney+ event. This is a
            vocabulary defect that needs translating, not fixing.
          </li>
          <li>
            Even with both corrected, a <em>checkout</em> dashboard filtered to
            RUM actions in prod sees 10% of sessions. Fine for rates, wrong for
            counts.
          </li>
        </ol>
        <p>
          <strong>Minimum decisive sequence.</strong> First,{" "}
          <code>service:web-solo-commerce-espn SIGNUP_SUCCESS</code> in
          Datadog <em>logs</em>, graphed as a count against yesterday and last
          week. Logs are unsampled, so this is the only number that can settle
          the 40% claim. If it is flat, purchases did not drop and the
          investigation moves entirely to the reporting path. If it is down,
          facet <code>@errorCode</code> in the same index, then move to{" "}
          <code>@service:web-solo-commerce-espn @env:prod @type:error</code> in
          RUM faceted by <code>@context.owner</code> and{" "}
          <code>@context.sourceComponent</code>, then to APM under{" "}
          <code>espnplus-commerce</code> for Flex latency and 5xx, then pivot on{" "}
          <code>@version</code> to bracket a release.
        </p>
        <p>
          <strong>Why the two reports are probably independent.</strong> The
          analyst&apos;s widget was never able to return data, so it tells you
          nothing about today. The PM&apos;s number comes from Adobe, which has
          its own failure modes that do not touch the purchase itself: the
          targeted-advertising consent gate, an ad-blocked or failed
          AppMeasurement load, the{" "}
          <code>wpnx-enable-legacy-analytics-espn</code> flag rerouting the
          billing page&apos;s analytics with no deploy, and the fact that
          purchase-success analytics are armed on the billing page but fire on
          the <em>next</em> page — so a slow navigation loses the Adobe event
          while the purchase succeeded. Any of those produces &quot;Adobe down
          40%, log count flat.&quot;
        </p>
        <p>
          <strong>Unanswerable with today&apos;s instrumentation.</strong>{" "}
          Whether fewer users <em>arrived</em> at checkout from marketing — two
          unlinked RUM applications, no shared session, no correlation key.
          Whether a marketing experiment variant is responsible — marketing sets
          no global context at all. Whether an SSR failure is dropping users —
          RUM never initialises outside the browser. Whether an ESPN-owned API
          is slow — those hosts are outside{" "}
          <code>allowedTracingUrls</code>, so no trace correlation. Closing
          those needs, respectively: a correlation key across the domain hop;{" "}
          <code>setGlobalContextProperty</code> for variant on marketing;
          reliance on APM plus server logs for SSR with the service-name
          translation understood; and an allowlist extension.
        </p>
        <p>
          <strong>Confidence language for the timeline.</strong> Say
          &quot;purchase counts from unsampled browser logs: high
          confidence.&quot; Say &quot;error-rate distribution from RUM: 10% prod
          session sample, directionally reliable, not a census.&quot; Say
          &quot;no statement possible about individual affected users outside
          the sample.&quot; Writing the confidence level next to each number is
          what stops the next person over-reading your graph.
        </p>
      </SolutionReveal>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>
            <code>@env:stage</code> never matches ESPN commerce RUM.
          </strong>{" "}
          Commerce env is binary <code>prod</code> / <code>non-prod</code>;
          marketing passes raw <code>DD_ENV</code> where prod is spelled{" "}
          <code>production</code>. Different words on the two surfaces.
        </li>
        <li>
          <strong>Four-plus service names per brand.</strong> Querying the wrong
          one returns an empty graph, not an error. Decide the signal first, then
          look up the name.
        </li>
        <li>
          <strong>A grep for a provider proves nothing.</strong> ESPN commerce
          hosts the Glimpse tree with zero ESPN-authored events. Check call
          sites and remote config, not imports.
        </li>
        <li>
          <strong>
            <code>isGlimpseEnabledAtom</code> fails open.
          </strong>{" "}
          Un-hydrated config means Glimpse is treated as enabled, with only a
          warn log to tell you.
        </li>
        <li>
          <strong>RUM counts in prod are a 10% sample.</strong> Use the
          unsampled <code>SIGNUP_SUCCESS</code> log for anything you graph or
          reconcile. Sampling is per session, so absent sessions are wholly
          absent.
        </li>
        <li>
          <strong>Renaming an emitted event name breaks invisible monitors.</strong>{" "}
          Monitor and SLO definitions live outside this repo, so nothing in CI
          will catch it.
        </li>
        <li>
          <strong>
            <code>@view.name</code> is only normalised on{" "}
            <code>/commerce</code>, <code>/identity</code>,{" "}
            <code>/profiles</code>.
          </strong>{" "}
          Other ESPN routes fragment across locales; group by{" "}
          <code>@view.url_path</code> carefully.
        </li>
        <li>
          <strong>ESPN marketing browser logs are not team-indexed.</strong> No{" "}
          <code>datadogLogs.init</code>, so no <code>team</code> tag and no
          index routing. Do not look for them where commerce logs live.
        </li>
        <li>
          <strong>
            <code>@view.referrer</code> on marketing is synthetic
          </strong>{" "}
          — read from a <code>preserveReferrer</code> localStorage key in{" "}
          <code>beforeSend</code>.
        </li>
        <li>
          <strong>
            The RUM redirect-handler name can be wrong.
          </strong>{" "}
          <code>addOnsExperimentRedirectHandler</code> self-reports as{" "}
          <code>entitledUserRedirectHandler</code>. Cross-check against{" "}
          <code>destination</code>.
        </li>
        <li>
          <strong>
            Trace injection on ESPN marketing hangs on a function name.
          </strong>{" "}
          <code>logger-with-datadog.ts</code> detects log methods via{" "}
          <code>fn.name === &apos;LOG&apos;</code>, and the file is excluded
          from coverage.
        </li>
        <li>
          <strong>
            RUM-to-APM correlation breaks on ESPN-owned hosts.
          </strong>{" "}
          <code>allowedTracingUrls</code> covers only bamgrid and{" "}
          <code>edge-api.hulu*.com</code>.
        </li>
        <li>
          <strong>Commerce session replays mask all text.</strong>{" "}
          <code>defaultPrivacyLevel: mask</code> — do not plan a visual-bug
          investigation around commerce replays.
        </li>
        <li>
          <strong>
            <code>ApplicationErrorBoundary</code> reports no owner.
          </strong>{" "}
          App-level crashes arrive unattributed; only{" "}
          <code>PageErrorBoundary</code> carries{" "}
          <code>owner</code>.
        </li>
        <li>
          <strong>
            A background rate of{" "}
            <code>Adobe Analytics script failed to load.</code> is normal.
          </strong>{" "}
          Ad blockers cause it. Alert on the derivative, not the presence.
        </li>
        <li>
          <strong>No scheduled Datadog audit covers ESPN.</strong> All four
          footer / compliance / schema crons are Disney+ or Stitch scoped.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          ESPN&apos;s analytics vendor is <strong>Adobe</strong> — Analytics
          plus Launch. Disney+ is Glimpse, Hulu is Tealium plus HITS. Glimpse
          code in ESPN commerce is inherited plumbing with zero ESPN-authored
          events: in a shared multi-tenant library,{" "}
          <strong>code presence is not feature usage</strong>.
        </li>
        <li>
          The Adobe surface is three handlers over two primitives —{" "}
          <code>page_impression</code> and <code>cancellation_flow_start</code>{" "}
          to <code>window.s.t</code>, <code>user_interaction</code> to{" "}
          <code>window.s.tl</code> — merged by{" "}
          <code>getCombinedPayload</code>. There is no{" "}
          <code>container_view</code>, so Glimpse-worded requests must be
          translated before they can be built.
        </li>
        <li>
          ESPN commerce and ESPN marketing are two separate RUM applications —{" "}
          <code>web-solo-commerce-espn</code> / <code>1ac57431…</code> via{" "}
          <code>@solo/observe</code>, and <code>espn-nexus</code> /{" "}
          <code>fa8304bf…</code> raw. One journey produces two unlinked
          sessions, so the sales-to-checkout funnel is not a query you can write.
        </li>
        <li>
          Identifiers are the whole game: commerce env is only{" "}
          <code>prod</code> / <code>non-prod</code> so{" "}
          <code>@env:stage</code> matches nothing, and each app carries
          different names across RUM, APM, deploy and CI. An empty graph is
          almost always a wrong name, not an outage.
        </li>
        <li>
          Prod RUM keeps 10% of sessions while commerce browser logs keep 100% —
          so <strong>RUM is for narrative, unsampled logs are for counts</strong>
          , which is exactly why <code>SIGNUP_SUCCESS</code> is emitted twice.
        </li>
        <li>
          Know your dark surfaces cold: SSR never reaches RUM, marketing logs
          are not team-indexed, <code>@view.name</code> normalisation is
          path-prefixed, tracing allowlists exclude ESPN-owned hosts, marketing
          sets no global context so variant slicing is impossible — and
          monitors, SLOs and synthetics live in a different repository entirely.
        </li>
      </ul>
    </div>
  );
}
