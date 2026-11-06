import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const huluDomainDiagram = String.raw`flowchart TD
  R["src/routes/screens/v1/hulu/index.ts<br/>prefix '/hulu'"] --> R1["GET /screens/v1/hulu/account-home<br/>accountHome.ts"]
  R --> R2["GET /screens/v1/hulu/plan-switch<br/>planSwitch.ts"]
  R1 --> S1["buildAccountHomeScreen()<br/>domain/screen/hulu/accountHomeService.ts<br/>(3759 lines — Hulu-only)"]
  R2 --> S2["buildPlanSwitchScreen()<br/>domain/screen/account/planSwitch/planSwitchServiceV2<br/>(SHARED service — hulu path is legacy URL namespace)"]
  S1 --> H1["hulu/constants.ts<br/>allowed agreement source types"]
  S1 --> H2["accountHomeMetricsDataBuilder.ts"]
  S2 --> H3["hulu/account/planSwitch/planSwitchSortService.ts<br/>hulu add-on priority order"]
  S2 --> H4["hulu/account/planSwitch/<br/>planSwitchOfferCardTermsModalBuilder.ts<br/>(574 lines of T&C modal logic)"]`;

const partnerMergeDiagram = String.raw`flowchart TD
  A["Screen config JSON<br/>(template configuration data)"] --> B["getScreenDataWithPartner()"]
  B --> C["merge({}, screenConfig.default,<br/>screenConfig[standardHeaders.partner ?? 'unknown'],<br/>additionalConfig)"]
  C --> D["partner === 'hulu' →<br/>hulu overlay merged over default"]
  C --> E["partner missing →<br/>'unknown' key (usually empty) —<br/>hulu overlays silently vanish"]`;

export const toc: TocItem[] = [
  { id: "the-hulu-domain", title: "The hulu/ Screen Domain", level: 2 },
  { id: "account-home", title: "Account Home: The Hulu-Only Screen", level: 2 },
  { id: "plan-switch-namespace", title: "The plan-switch Namespace Trick", level: 2 },
  { id: "partner-keyed-merge", title: "Partner-Keyed Template Data Merge", level: 2 },
  { id: "hulu-cypher-keys", title: "Hulu Cypher Keys (Same Dictionaries)", level: 2 },
  { id: "price-increase-pipeline", title: "The Hulu Price-Increase Pipeline", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Route the Change", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluScreensInFlex() {
  return (
    <div className="article-content">
      <p>
        Flex has exactly one Hulu-only screen domain and two Hulu-namespaced
        routes — a surprisingly small dedicated surface for such an important
        brand. The trick is that &quot;Hulu-only&quot; and
        &quot;Hulu-namespaced&quot; are different things: one of the two{" "}
        <code>/hulu/</code> routes delegates to a <em>shared</em> service.
        This module covers the dedicated surface; the next covers the far
        larger shared-screen branching.
      </p>

      <h2 id="the-hulu-domain">The hulu/ Screen Domain</h2>
      <MermaidDiagram
        chart={huluDomainDiagram}
        title="Everything Under src/domain/screen/hulu/"
        caption="Two routes, one truly Hulu-only service (Account Home), and two Hulu-specific helpers consumed by the shared plan-switch service."
        minHeight={520}
      />
      <CodeBlock
        code={`// src/routes/screens/v1/hulu/index.ts
const hulu = koaRouter();
hulu.prefix('/hulu');
hulu.use(accountHome.middleware());   // GET /screens/v1/hulu/account-home
hulu.use(planSwitch.middleware());    // GET /screens/v1/hulu/plan-switch`}
        lang="typescript"
        filename="src/routes/screens/v1/hulu/index.ts"
      />
      <p>
        Facts worth pinning: the account-home route
        (<code>accountHome.ts:10-34</code>) requires{" "}
        <code>accountId</code>, <code>partner</code>,{" "}
        <code>locationCountryCode</code>, and <code>requestId</code> headers;
        OpenAPI lives at <code>src/routes/screens/v1/hulu/openapi.yaml</code>{" "}
        with Hulu headers in{" "}
        <code>src/openapi/components/parameters/hulu-headers.yaml</code>; and{" "}
        <strong>no v2 hulu routes exist</strong> — the Hulu namespace is
        v1-only.
      </p>

      <h2 id="account-home">Account Home: The Hulu-Only Screen</h2>
      <p>
        <code>src/domain/screen/hulu/accountHomeService.ts</code> (3759 lines)
        is the one screen service that exists <em>only</em> for Hulu — the
        account hub rendered at <code>/commerce/account</code> on hulu.com
        (remember the frontend map: <code>accountDetails →
        hulu/account-home</code>). Its notable internals:
      </p>
      <ul>
        <li>
          <code>buildAccountHomeScreen()</code> — the orchestrator; plus
          section builders <code>buildSubscriptionActionsItems</code>,{" "}
          <code>buildSubscriptionDetailsItemsEM</code> (Extra Member),{" "}
          <code>buildSubscriptionDetailsAccountItems</code>.
        </li>
        <li>
          <code>agreementSortForHulu</code> (<code>:968-982</code>) —
          Hulu-sourced agreements first.
        </li>
        <li>
          <code>isEntitledHuluSubscription</code> (<code>:226-234</code>) —
          offer-label check.
        </li>
        <li>
          Source-type gating from <code>hulu/constants.ts</code> — the
          ACP-migration widening to{" "}
          <code>[&apos;DIRECT&apos;,&apos;OPS&apos;,&apos;CST&apos;,&apos;HULU&apos;]</code>{" "}
          behind <code>enable-legacy-hulu-subscription-details</code>.
        </li>
        <li>
          Flag-gated sections: Hulu Events
          (<code>enable-hulu-events-section</code>, FeatureSet interface{" "}
          <code>EnableHuluEventsSubSection</code> at{" "}
          <code>featureSet.ts:690-692</code>) and Extra Member
          (<code>enable-hulu-account-extra-member-section</code>).
        </li>
        <li>
          Dictionaries: the standard shared set —{" "}
          <code>FLEX_CYPHER_DICTIONARY</code> (unified-commerce),{" "}
          <code>OFFERS_CYPHER_DICTIONARY</code>,{" "}
          <code>FLEX_CYPHER_LEGACY_IDENTITY_DICTIONARY</code>{" "}
          (<code>accountHomeService.ts:188-191</code>).
        </li>
      </ul>
      <p>
        One more structural fact: Account Home has{" "}
        <strong>no entry in <code>migrationConfig.ts</code></strong> — it is
        not currently slated for the platform migration.{" "}
        <em>[ASSUMPTION: deliberate vs not-yet-added is unverifiable from the
        registry alone.]</em>
      </p>

      <h2 id="plan-switch-namespace">The plan-switch Namespace Trick</h2>
      <CodeBlock
        code={`// src/routes/screens/v1/hulu/planSwitch.ts:6,48 (paraphrased wiring)
import { buildPlanSwitchScreen } from '!domain/screen/account/planSwitch/planSwitchServiceV2';
// ...
ctx.body = await buildPlanSwitchScreen({ flexContext, /* ... */ });`}
        lang="typescript"
        filename="src/routes/screens/v1/hulu/planSwitch.ts"
      />
      <p>
        <code>GET /screens/v1/hulu/plan-switch</code> looks Hulu-only but
        delegates to the <strong>shared</strong>{" "}
        <code>planSwitchServiceV2</code> — the <code>/hulu</code> prefix is a{" "}
        <em>legacy URL namespace</em>, kept for client compatibility. The
        Hulu-specific logic lives in helpers the shared service consumes:
      </p>
      <ul>
        <li>
          <code>planSwitchSortService.ts</code> — Hulu add-on merchandising
          order (<code>huluPrioritizedAddonsPackageIds</code>) and switch-plan
          sort comparators.
        </li>
        <li>
          <code>planSwitchOfferCardTermsModalBuilder.ts</code> (574 lines) —
          T&amp;Cs modal content for switch-plan offer cards, wielding
          Hulu-specific legal cypher keys like{" "}
          <code>legalConsentLedgerHuluRecurring</code>.
        </li>
      </ul>
      <p>
        Lesson for code review: <strong>route namespace ≠ implementation
        ownership</strong> in Flex. Always follow the import to the service
        before assuming a screen is brand-exclusive.
      </p>

      <h2 id="partner-keyed-merge">Partner-Keyed Template Data Merge</h2>
      <MermaidDiagram
        chart={partnerMergeDiagram}
        title="getScreenDataWithPartner: Config Overlays by Brand"
        caption="A screen's config JSON can carry hulu/disney/espn/star keys next to default; the partner's overlay is lodash-merged over default at request time."
        minHeight={380}
      />
      <CodeBlock
        code={`// src/domain/screen/common/configuration.ts:235-262 (excerpt)
export async function getScreenDataWithPartner<T extends object>({
  data, dataKey, standardHeaders, validator,
}) {
  const screenConfig: any = data[DEFAULT_TEMPLATE_CONFIGURATION_DATA];
  // ...
  const screenData: T = merge(
    {},
    screenConfig.default,
    screenConfig[standardHeaders.partner ?? 'unknown'],  // 'hulu' overlay
    additionalConfig
  );
  // ...
}`}
        lang="typescript"
        filename="configuration.ts"
      />
      <p>
        This is the second of Flex&apos;s two template-variation mechanisms —
        and the Hulu-relevant one. (The first, experiment-driven{" "}
        <code>templates</code>/<code>templatesV2</code> selection in{" "}
        <code>getTemplateConfiguration()</code>, is partner-agnostic.) Account
        Home uses the merge for its account-breakdown section
        (<code>setAccountBreakdownSection</code>,{" "}
        <code>accountHomeService.ts:699-721</code>, reading{" "}
        <code>accountManagement[setValidPartner(partner)]?.accountDetails</code>),
        and Account Details uses it for{" "}
        <code>MyServicesCyphersByPartner</code>. Remember the trap from the
        partner module: no partner header → <code>unknown</code> key → all
        Hulu overlays silently skipped.
      </p>

      <h2 id="hulu-cypher-keys">Hulu Cypher Keys (Same Dictionaries)</h2>
      <p>
        There is <strong>no Hulu-only dictionary</strong> — Hulu screens read
        the same <code>unified-commerce</code>/<code>unified-offers</code>{" "}
        dictionaries as everyone else, and brand flavor lives in{" "}
        <em>key naming</em>. A sampler from{" "}
        <code>src/domain/models/cypher/cypherKeys.ts</code>:
      </p>
      <CodeBlock
        code={`// cypherKeys.ts:481-482 — ledger legal consent
legalConsentLedgerHuluRecurring: 'ledger_hulu_consent',
legalConsentLedgerHuluRecurringMixed: 'ledger_hulu_consent_mixed',

// :2081-2109, 2180 — restart & Extra Member pending states
pendingCancelRestartLegalHulu: 'ledger_hulu_restart_legal',
btnConfirmRestartSubHulu: 'ledger_hulu_consent_agree_cta',
// huluEMPendingCancelBaseSub / huluEMPendingSwitchUpgrade /
// huluEMPendingSwitchDowngrade / huluEMPendingSwitchForfeiture

// :1354, 1577-1578 — gift card imagery
HULU: 'gift_card_hulu_image_accessible',
paymentRipcutHulu: { key: 'gift_card_hulu_image', /* ... */ },`}
        lang="typescript"
        filename="cypherKeys.ts (Hulu sampler)"
      />
      <p>
        The test fixture proves the model:{" "}
        <code>cypher-getDictionaries-hulu.ts</code> is still keyed{" "}
        <code>resourceKey: &apos;unified-commerce&apos;</code> — just populated
        with Hulu-flavored values (<code>&apos;404_btn_backnav&apos;:
        &apos;Hulu Home&apos;</code>, <code>account_alert_comcast</code>...).
        Copy changes for Hulu are therefore dictionary-content changes plus
        possibly key selection in builders — never a new dictionary.
      </p>

      <h2 id="price-increase-pipeline">The Hulu Price-Increase Pipeline</h2>
      <p>
        One platform-side curiosity worth knowing:{" "}
        <code>src/platform/core/orchestration/screens/huluUnlimitedPriceIncreasePipeline.ts</code>{" "}
        — a Hulu-specific notification experience (screen name{" "}
        <code>message-hulu-unlimited-price-increase</code>) routed through the
        generic platform <code>message</code> screen&apos;s orchestration (its
        file is listed inside the <code>message</code> entry of{" "}
        <code>migrationConfig.ts:106-132</code>). It fetches the same shared
        dictionaries, scoped by screen name for cache isolation. Pattern to
        remember: <strong>Hulu-specific experiences can ride generic screens</strong>{" "}
        — grep the pipeline/orchestration layer before concluding a Hulu
        surface has no server code.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"What does Flex have that is actually Hulu-only?"`}
        intro={
          <>
            This question filters people who grepped from people who read. The
            honest inventory is small and precise.
          </>
        }
        steps={[
          "Give the exact inventory: one screen domain (src/domain/screen/hulu/ — Account Home service, metrics builder, plan-switch sort + terms-modal helpers) and two v1 routes (/screens/v1/hulu/account-home, /screens/v1/hulu/plan-switch). No v2 hulu routes.",
          "Immediately add the namespace caveat: the hulu/plan-switch route delegates to the shared planSwitchServiceV2 — the /hulu prefix is a legacy URL namespace, not an implementation boundary.",
          "Explain where Hulu template variation lives: the partner-keyed data merge (getScreenDataWithPartner) that lodash-merges a config's hulu overlay over default — distinct from experiment-driven template selection.",
          "Cover copy: no Hulu dictionary exists; Hulu-ness is in cypher key naming (ledger_hulu_consent, hulu EM pending keys) inside shared dictionaries.",
          "Finish with the two edge facts that signal depth: Account Home is absent from the migration registry, and Hulu's price-increase notification rides the generic message screen as a platform pipeline.",
        ]}
      />

      <h2 id="challenge">Challenge: Route the Change</h2>
      <InterviewChallenge
        title="Three Hulu account-surface changes"
        scenario={
          <>
            Product asks for: (a) reorder Hulu&apos;s add-on cards on plan
            switch so <code>starz</code> outranks <code>showtime</code>; (b)
            change the legal consent text under the Hulu plan-switch confirm
            button; (c) show a new &quot;Hulu Events&quot; row on Account Home
            for all users.
          </>
        }
        tasks={[
          "Name the exact file (and function/constant where applicable) each change touches.",
          "For (b), explain the split between key selection and copy content, and which one needs a templates-repo/dictionary change.",
          "For (c), explain what must happen in LaunchDarkly vs in code, given the current implementation.",
          "State which of the three changes risks affecting Disney+ users, and why the others cannot.",
        ]}
        pitfalls={[
          "Editing planSwitchServiceV2 for the sort change instead of the Hulu sort helper it consumes.",
          "Rewriting English copy in TypeScript — the text lives in the Cypher dictionary; code only selects keys.",
          "Shipping (c) as a code change when the section already exists behind enable-hulu-events-section.",
          "Assuming anything under /hulu routes is isolated — the plan-switch service is shared.",
        ]}
        signal="A strong answer distinguishes route namespace from service ownership and flags (c) as a flag flip, not a feature build."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a)</strong>{" "}
          <code>src/domain/screen/hulu/account/planSwitch/planSwitchSortService.ts:23-37</code>{" "}
          — reorder <code>huluPrioritizedAddonsPackageIds</code> (move{" "}
          <code>&apos;starz&apos;</code> before{" "}
          <code>&apos;showtime&apos;</code>). Hulu-only helper → no Disney+
          risk.
        </p>
        <p>
          <strong>(b)</strong> Two possible layers:{" "}
          <code>planSwitchOfferCardTermsModalBuilder.ts</code> /
          ledger builders select keys like{" "}
          <code>legalConsentLedgerHuluRecurring →
          &apos;ledger_hulu_consent&apos;</code>; the actual sentences live in
          the <code>unified-commerce</code> dictionary (Cypher). New wording,
          same meaning → dictionary content change. Different key/logic →
          code change in the builder. Since the shared ledger service consumes
          these, verify the key selection is inside a{" "}
          <code>isPartnerHulu</code> branch before editing.
        </p>
        <p>
          <strong>(c)</strong> The section exists behind{" "}
          <code>enable-hulu-events-section</code>{" "}
          (<code>featureFlags/constants.ts:1581-1584</code>, FeatureSet{" "}
          <code>EnableHuluEventsSubSection</code>). &quot;Show for all&quot; =
          turn the LaunchDarkly flag on (and eventually productionalize:
          remove the flag + make the section unconditional). No new feature
          code.
        </p>
        <p>
          <strong>Disney+ risk:</strong> only (b) — it touches builders
          consumed by the shared plan-switch/ledger path. (a) is in a Hulu-only
          helper; (c) is a Hulu-only flag and Account Home is a Hulu-only
          screen.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Dedicated Hulu surface in Flex = one domain
          (<code>screen/hulu/</code>) + two v1 routes; Account Home
          (3759 lines) is the only truly Hulu-only screen service.
        </li>
        <li>
          <code>/screens/v1/hulu/plan-switch</code> delegates to the shared
          plan-switch service — route namespace ≠ ownership; Hulu logic lives
          in the sort + terms-modal helpers.
        </li>
        <li>
          Hulu template variation = partner-keyed config merge
          (<code>getScreenDataWithPartner</code>); missing partner header makes
          Hulu overlays vanish silently.
        </li>
        <li>
          No Hulu dictionary — Hulu copy is key-naming inside{" "}
          <code>unified-commerce</code>/<code>unified-offers</code>{" "}
          (<code>ledger_hulu_consent</code>, EM pending keys, gift-card
          imagery).
        </li>
        <li>
          Hulu experiences can ride generic screens — the Unlimited
          price-increase pipeline inside the platform <code>message</code>{" "}
          screen is the canonical example.
        </li>
        <li>
          Account Home is not in the migration registry — platform-migration
          duties do not (yet) apply to it.
        </li>
      </ul>
    </div>
  );
}
