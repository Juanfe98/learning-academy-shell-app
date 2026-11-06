import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const trackersDiagram = String.raw`flowchart TD
  L["hulu-layout.tsx (commerce app)"] --> A["useHitsAnalyticsTracker<br/>appComponentName: 'hulu-acp'"]
  L --> T["useTealiumTracker<br/>app: 'hulu-acp'"]
  L --> AD["adobeAnalyticsTracker"]
  A --> CORE["useCoreAnalytics([adobe, hits, tealium])"]
  T --> CORE
  AD --> CORE
  CORE --> AN["<Analytics trackers={coreAnalytics}>"]
  AN -->|"hasOneTrustConsent"| S1["AdobeAnalytics script"]
  AN -->|"hasOneTrustConsent"| S2["Tealium script (tealiumUrl)"]
  AN --> S3["HITS — no script tag needed<br/>(@hulu/site-metrics library)"]
  S3 --> V["events POST → vortex.hulu.com<br/>schemas validated in Minerva"]`;

const serverGateDiagram = String.raw`flowchart TD
  F["Flex builds metricsData for a screen"] --> Q{"isPartnerHulu(flexContext)?"}
  Q -->|yes| H["HITS payloads built<br/>(hitsDataService builders)"]
  Q -->|yes| TL["Tealium payloads built<br/>(tealiumData.ts:40)"]
  Q -->|no| U["undefined — no HITS/Tealium<br/>for disney/espn on gated screens"]
  H --> R["screen JSON → client fires via trackers"]
  TL --> R`;

export const toc: TocItem[] = [
  { id: "three-at-once", title: "Three Analytics Systems at Once", level: 2 },
  { id: "hits-primer", title: "HITS: Hulu's Native Analytics", level: 2 },
  { id: "server-side-gating", title: "Server-Side Gating in Flex", level: 2 },
  { id: "flow-names-two-lists", title: "Flow Names: Two Lists, Two Owners", level: 2 },
  { id: "consent-and-marketing", title: "Consent Gating & the Marketing App", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Missing Events", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluAnalyticsHitsTealiumAdobe() {
  return (
    <div className="article-content">
      <p>
        Hulu web commerce runs <strong>three analytics systems
        simultaneously</strong> — HITS (Hulu-native), Tealium, and Adobe —
        where sibling brands leant on Glimpse/Adobe. Two architectural facts
        follow: the client wires all three into one tracker array, and Flex{" "}
        <em>gates whole payload families by partner</em>, so some telemetry
        exists only for Hulu traffic. Debugging &quot;missing events&quot;
        without knowing both facts is guesswork.
      </p>

      <h2 id="three-at-once">Three Analytics Systems at Once</h2>
      <MermaidDiagram
        chart={trackersDiagram}
        title="hulu-layout.tsx Analytics Wiring"
        caption="One array, three trackers, all labelled hulu-acp. Adobe and Tealium scripts load only after OneTrust consent; HITS needs no script tag at all."
        minHeight={520}
      />
      <CodeBlock
        code={`// apps/commerce/hulu/src/layout/hulu-layout.tsx:91-136 (excerpt)
const hitsTracker = useHitsAnalyticsTracker({
  appComponentName: 'hulu-acp',
  glimpseInteractionId,
});
const tealiumTracker = useTealiumTracker({
  app: 'hulu-acp',
  client_type: 'web',
  device_category: isMobileDevice() ? 'mobile' : 'desktop',
});
const coreAnalytics = useCoreAnalytics([
  adobeAnalyticsTracker,
  hitsTracker,
  tealiumTracker,
]);
// ...
<Analytics trackers={coreAnalytics}>
  {hasOneTrustConsent && (
    <AdobeAnalytics adobeAnalyticsConfig={commerceAppConfig['feature-configuration'].analytics.adobe} tracker={adobeAnalyticsTracker} />
  )}
  {hasOneTrustConsent && (
    <Tealium tracker={tealiumTracker} tealiumUrl={commerceAppConfig['feature-configuration'].analytics.tealium.url} />
  )}
  {/* HITS loads via @hulu/site-metrics library and no Next <Script/> is required. */}
</Analytics>`}
        lang="tsx"
        filename="hulu-layout.tsx"
      />
      <p>
        Memorize <code>hulu-acp</code>: it is the app identifier stamped on
        HITS and Tealium events from the commerce app — your first filter in
        any analytics tool.
      </p>

      <h2 id="hits-primer">HITS: Hulu&apos;s Native Analytics</h2>
      <p>
        From <code>packages/instrumentation/src/hits/README.md</code>:{" "}
        <em>&quot;HITS is an analytics platform used primarily within Hulu.
        Its schemas are defined and validated within Minerva... built
        leveraging the site-metrics library&quot;</em>{" "}
        (<code>github.prod.hulu.com/Instrumentation/site-metrics</code>);
        events post to <code>vortex.hulu.com</code>. Practical consequences:
      </p>
      <ul>
        <li>
          <strong>Schemas live in Minerva</strong>, not in either repo — a new
          HITS event needs a Minerva schema, not just client code. Flex&apos;s
          HITS types even link Minerva pages in JSDoc
          (<code>@see https://minerva-legacy.prod.hulu.com/hits/subscription_start/details</code>,{" "}
          <code>hitsData.ts:157</code>).
        </li>
        <li>
          <strong>Field vocabulary differs from Glimpse</strong> — the README
          documents the mapping (<code>pageName → curr_page_type</code>,{" "}
          <code>elementId → element_specifier</code>,{" "}
          <code>hits/README.md:158-173</code>).
        </li>
        <li>
          SUF events fired by the client: <code>page_impression</code>,{" "}
          <code>subscription_start</code>,{" "}
          <code>subscription_plan_select</code>,{" "}
          <code>subscription_step_start</code>{" "}
          (<code>plans-page.tsx:253-281</code>), with screen names like{" "}
          <code>&apos;SUF - Billing Info&apos;</code>{" "}
          (<code>use-billing-hits-payloads.ts:16</code>).
        </li>
      </ul>

      <h2 id="server-side-gating">Server-Side Gating in Flex</h2>
      <MermaidDiagram
        chart={serverGateDiagram}
        title="Partner-Gated Telemetry in Flex"
        caption="On several screens, HITS and Tealium payloads are built ONLY when the partner is Hulu — for other brands the builders return undefined and the events simply do not exist."
        minHeight={420}
      />
      <CodeBlock
        code={`// Flex — src/domain/metricsData/deviceOutOfHousehold/deviceOutOfHouseholdHitsDataBuilder.ts:1-27
import { isPartnerHulu } from '!domain/common/util';

export function buildOutOfHouseholdHitsPageImpression(
  flexContext: FlexContext,
  experienceId?: FlexExperienceId
): HitsPageImpression | undefined {
  if (!experienceId || !isPartnerHulu(flexContext)) {
    return undefined;                       // <-- non-Hulu: no HITS at all
  }
  // ...builds app:ooh:soft_block / app:ooh:hard_block / ...
}

// Flex — src/elements/v1/types/metricsData/tealiumData.ts:40
return isPartnerHulu(flexContext) ? tealiumData : undefined;`}
        lang="typescript"
        filename="Hulu-only telemetry builders (Flex)"
      />
      <p>
        Every function in the OOH HITS builder file short-circuits for
        non-Hulu partners (<code>:25,85,110,155,175,195</code>), and the
        Tealium gate is consumed with the same conditional in{" "}
        <code>previewService.ts:1208</code>,{" "}
        <code>ledgerService.ts:5821</code>, and the platform mirror{" "}
        <code>planSwitchLedgerAssembly.ts:7326</code>. Generic HITS
        constructors (<code>buildHitsPageImpression</code>,{" "}
        <code>buildHitsUserInteraction</code> in{" "}
        <code>hitsDataService.ts</code>) serve Hulu Account Home and the
        commerce redirect actions; the success screen branches HITS content
        types on partner too
        (<code>successMetricsDataBuilder.ts:498,519</code>).
      </p>

      <h2 id="flow-names-two-lists">Flow Names: Two Lists, Two Owners</h2>
      <ArticleTable caption="The two flow-name vocabularies. They overlap but are not equal — always ask which side emitted an event.">
        <table>
          <thead>
            <tr>
              <th>Side</th>
              <th>Definition</th>
              <th>Values</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>cgi-web (client)</td>
              <td>
                <code>HitsSubscriptionFlowName</code> union,{" "}
                <code>instrumentation/src/hits/types/account.ts:229-240</code>;
                value arrives via <code>?hitsFlowName=</code> URL param
              </td>
              <td>
                <code>suf_web_default · suf_web_hisuf · suf_web_one_hulu ·
                suf_web_plan_builder · suf_web_live_only · suf_web_redeem ·
                suf_web_svod · suf_web_sash_only · suf_web_noah_only ·
                suf_web_curiosity · hi_switch</code>
              </td>
            </tr>
            <tr>
              <td>Flex (server)</td>
              <td>
                <code>FLOW_NAMES</code> enum,{" "}
                <code>src/elements/v1/types/metricsData/hitsData.ts:72-79</code>;
                stamped into server-built metricsData
              </td>
              <td>
                <code>suf_web_default · suf_web_hisuf · suf_web_redeem ·
                account_unified_plan_switch · hi_switch ·
                extra_member_upsell</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note <code>suf_web_one_hulu</code> exists <em>only</em> on the client
        side, and Flex&apos;s <code>SCREEN_NAMES</code> carries
        Hulu-eligibility entries the client list lacks
        (<code>HuluEligible = &apos;SUF - Hulu Eligible&apos;</code>,{" "}
        <code>hitsData.ts:39-40</code>). Server-set flow names appear in the
        commerce redirect action
        (<code>redirectService.ts:116,142</code> — <code>hi_switch</code>,{" "}
        <code>suf_web_hisuf</code>) and the preview/ledger metrics builders.
      </p>

      <h2 id="consent-and-marketing">Consent Gating &amp; the Marketing App</h2>
      <ul>
        <li>
          <strong>Commerce app:</strong> Adobe + Tealium load only after{" "}
          <code>useHasOneTrustConsent()</code> (OneTrust; docs at{" "}
          <code>confluence.disney.com/display/DDQGC/OneTrust</code> per the
          code comment). HITS is not behind the consent conditional in the
          layout snippet — it loads via the site-metrics library.{" "}
          <em>[Observation from the wiring; whether HITS applies consent
          internally is not verified here.]</em>
        </li>
        <li>
          <strong>Marketing app:</strong>{" "}
          <code>apps/marketing-unified/hulu/.../load-analytics.tsx:34-44</code>{" "}
          wires <strong>Tealium + HITS only</strong> (no Adobe), gated on{" "}
          <code>useHasPrivacyConsent()</code> from{" "}
          <code>packages/privacy-consent</code> — a different consent
          mechanism than the commerce app&apos;s OneTrust component.
        </li>
        <li>
          <strong>Flex-driven firing:</strong> rendered screens carry{" "}
          <code>metricsData</code>; the client fires it via{" "}
          <code>GlimpsePageView metricsData={`{screenData.content.metricsData}`}</code>{" "}
          and reads Adobe payloads straight off the Flex response
          (<code>welcome-back-page.tsx:382, 202-221</code> as the reference
          implementation).
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How is Hulu instrumented?"`}
        intro={
          <>
            Strong answers name all three systems, the server-side partner
            gates, and the two flow-name vocabularies — that combination is
            rare and screams hands-on experience.
          </>
        }
        steps={[
          "Open with the triple stack: HITS (Hulu-native, Minerva schemas, vortex.hulu.com) + Tealium + Adobe, wired as one tracker array in hulu-layout.tsx under the app id hulu-acp.",
          "Explain HITS's special status: schema registry lives in Minerva outside both repos; field vocabulary differs from Glimpse with a documented mapping; no script tag needed.",
          "Describe server-side gating: Flex builds HITS/Tealium payloads only for isPartnerHulu on several screens (device-out-of-household HITS is Hulu-exclusive; Tealium returns undefined for other brands).",
          "Distinguish the two flow-name lists: the client union (URL-param-driven, includes suf_web_one_hulu) vs Flex's FLOW_NAMES enum (server-stamped, includes account_unified_plan_switch) — events must be attributed to a side before debugging.",
          "Close with consent: Adobe/Tealium load behind OneTrust in commerce, behind privacy-consent in marketing; and the marketing app skips Adobe entirely.",
        ]}
      />

      <h2 id="challenge">Challenge: The Missing Events</h2>
      <InterviewChallenge
        title="Two dashboards, two absences"
        scenario={
          <>
            Report 1: &quot;Device-out-of-household HITS events show zero
            volume for Disney+ — but the screen is clearly serving Disney+
            traffic. Broken tracking?&quot; Report 2: &quot;Tealium events
            from the Hulu plan-switch ledger stopped after yesterday&apos;s
            Flex deploy; HITS from the same screen is fine.&quot;
          </>
        }
        tasks={[
          "Resolve report 1 with a one-line explanation and the code reference that settles it.",
          "For report 2, lay out the triage path: which layer (client tracker, Flex builder, consent, partner gate) do you check first and why?",
          "Explain why HITS surviving while Tealium died narrows the fault dramatically.",
          "Name the single most likely class of regression in the Flex deploy, given the gating pattern.",
        ]}
        pitfalls={[
          "Treating report 1 as an incident — Disney+ OOH HITS has never existed by design.",
          "Starting report 2 at the Tealium script/consent layer when HITS from the same page proves the page and trackers are alive.",
          "Forgetting Tealium payloads are built server-side in Flex and gated on isPartnerHulu.",
          "Not checking the platform assembly mirror if the ledger screen is on the platform engine.",
        ]}
        signal="A strong answer cites the undefined-returning builders for report 1 and reasons by elimination to a Flex-side payload regression for report 2."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Report 1:</strong> not a bug. Every OOH HITS builder
          short-circuits to <code>undefined</code> unless{" "}
          <code>isPartnerHulu(flexContext)</code>{" "}
          (<code>deviceOutOfHouseholdHitsDataBuilder.ts:25</code> et al.).
          Disney+ OOH HITS volume is zero <em>by design</em> — the dashboard
          should not have a Disney+ panel for it.
        </p>
        <p>
          <strong>Report 2 triage:</strong> HITS from the same screen is
          flowing → page renders, trackers fire, consent granted. Client layer
          exonerated. Next stop: Flex&apos;s ledger response — does{" "}
          <code>metricsData</code> still contain the Tealium payload? Check{" "}
          <code>ledgerService.ts:5821</code>&apos;s{" "}
          <code>isPartnerHulu ? tealiumData : ...</code> line and its inputs,
          and — since the ledger is a migrating screen — the platform mirror{" "}
          <code>planSwitchLedgerAssembly.ts:7326</code>.
        </p>
        <p>
          <strong>Most likely regression class:</strong> the deploy touched
          the shared ledger path and either (a) altered the partner-gated
          Tealium branch on one engine only (the change-both trap), or (b)
          changed the condition feeding it. Diff yesterday&apos;s deploy for
          the ledger service + assembly, comparing the Tealium branch in both.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu commerce fires HITS + Tealium + Adobe simultaneously under app
          id <code>hulu-acp</code>; the marketing app fires Tealium + HITS
          only.
        </li>
        <li>
          HITS is Hulu-native: Minerva schemas, vortex.hulu.com ingestion,
          site-metrics library, own field vocabulary with a documented
          Glimpse mapping.
        </li>
        <li>
          Flex partner-gates telemetry: OOH HITS is Hulu-exclusive; Tealium
          payloads return <code>undefined</code> for non-Hulu — absence of
          events for other brands can be by design.
        </li>
        <li>
          Two flow-name vocabularies (client union with{" "}
          <code>suf_web_one_hulu</code> vs Flex enum) — attribute events to a
          side before debugging.
        </li>
        <li>
          Consent gates differ: OneTrust in commerce, privacy-consent in
          marketing; Adobe/Tealium scripts wait for consent.
        </li>
        <li>
          &quot;HITS alive, Tealium dead&quot; on one screen = look at
          Flex&apos;s payload builders (both engines), not the client.
        </li>
      </ul>
    </div>
  );
}
