import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const productWorldDiagram = String.raw`flowchart TD
  subgraph SKUs["Hulu product ids (uuids, frozen constants)"]
    P1["HULU_ADS<br/>121a6942-..."]
    P2["HULU_NO_ADS<br/>7c26cac5-..."]
    P3["HULU_EXTRA_MEMBER_ADS<br/>01e75d0f-..."]
    P4["HULU_EXTRA_MEMBER_NO_ADS<br/>1298019d-..."]
  end
  subgraph OT["FlexOfferType (offerType.ts)"]
    O1["HULU_STANDALONE"]
    O2["HULU_LIVETV<br/>(supersedes HULU_LIVETV_STANDALONE)"]
    O3["HYBRID_BUNDLE<br/>'Hulu Basic, Disney Premium, E+'"]
  end
  subgraph PC["Package cohorts (from Hulu PEPC sources)"]
    C1["hulu_basic / hulu_premium"]
    C2["hulu_basic_with_live_tv /<br/>hulu_premium_with_live_tv"]
    C3["hulu_no_ads_component<br/>addOn: ['hulu']"]
  end
  C1 --> O1
  C2 --> O1
  SKUs --> OT`;

const legacySplitDiagram = String.raw`flowchart TD
  A["FlexAgreement.source"] --> B{"type === 'HULU' &&<br/>partner === 'hulu'?"}
  B -->|yes| C["Legacy Hulu subscription<br/>(Hulu-native billing)"]
  B -->|no| D["Unified / D2C subscription<br/>(source DIRECT · OPS · CST)"]
  C --> E{"provider !== 'hulu'?"}
  E -->|yes| F["Legacy Hulu 3P<br/>(third-party billed)"]
  E -->|no| G["Legacy Hulu 1P"]
  D --> H["Always renderable on Account Home"]
  C --> I{"enable-legacy-hulu-subscription-details<br/>flag ON?"}
  I -->|yes| J["Rendered — source types widened to<br/>['DIRECT','OPS','CST','HULU']"]
  I -->|no| K["Filtered out — legacy sub invisible"]`;

export const toc: TocItem[] = [
  { id: "three-vocabularies", title: "Three Vocabularies for One Catalog", level: 2 },
  { id: "hulu-skus", title: "Hulu SKUs: The Frozen UUIDs", level: 2 },
  { id: "offer-types", title: "Hulu Offer Types & Bundles", level: 2 },
  { id: "legacy-vs-acp", title: "Legacy vs ACP: The Subscriber Split", level: 2 },
  { id: "entitlement-helpers", title: "Entitlement & Sorting Helpers", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Invisible Subscription", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluProductsPlansAndSkus() {
  return (
    <div className="article-content">
      <p>
        Before you can debug a Hulu screen you have to speak its product
        language — and Hulu&apos;s is the most layered of the three brands,
        because its catalog predates Disney unification. The code juggles{" "}
        <strong>three vocabularies at once</strong>: raw product UUIDs, Flex
        offer types, and Hulu-native package cohorts. On top of that sits the
        single most consequential business fact about Hulu: the subscriber base
        is split between <em>legacy Hulu-billed</em> and{" "}
        <em>unified (ACP/D2C)</em> accounts, and code paths fork on that split.
      </p>

      <h2 id="three-vocabularies">Three Vocabularies for One Catalog</h2>
      <MermaidDiagram
        chart={productWorldDiagram}
        title="Hulu's Three Product Vocabularies"
        caption="UUIDs identify concrete products; FlexOfferType classifies offers for business logic; package cohorts are Hulu-native names inherited from Hulu's own eligibility service."
        minHeight={520}
      />
      <ArticleTable caption="When each vocabulary shows up. Knowing which one a ticket speaks tells you which file to open.">
        <table>
          <thead>
            <tr>
              <th>Vocabulary</th>
              <th>Lives in</th>
              <th>Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Product UUIDs (<code>HULU_ADS</code>...)</td>
              <td>
                <code>src/domain/screen/common/types.ts:202-205</code>,{" "}
                <code>src/domain/models/ledgerProductIds.ts</code>
              </td>
              <td>
                Matching concrete products in agreements/ledgers (e.g. &quot;is
                this line item the Hulu no-ads product?&quot;)
              </td>
            </tr>
            <tr>
              <td>
                <code>FlexOfferType</code> (<code>HULU_STANDALONE</code>...)
              </td>
              <td><code>src/domain/models/offerType.ts</code></td>
              <td>
                Business-logic classification of offers (pricing display,
                eligibility, card building)
              </td>
            </tr>
            <tr>
              <td>
                Package cohorts (<code>hulu_basic</code>,{" "}
                <code>hulu_premium_with_live_tv</code>...)
              </td>
              <td>
                <code>offerType.ts:126-129, 349-383</code> — mapped to offer
                types
              </td>
              <td>
                Hulu-native names from Hulu&apos;s Eligibility-Service /
                packageCohorts.json (comments cite{" "}
                <code>github.prod.hulu.com/PEPC/...</code>)
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="hulu-skus">Hulu SKUs: The Frozen UUIDs</h2>
      <CodeBlock
        code={`// src/domain/screen/common/types.ts:202-205
export const HULU_PRODUCT_IDS = Object.freeze({
  HULU_ADS: '121a6942-a712-3943-963a-13b20daa6abe',
  HULU_NO_ADS: '7c26cac5-a6d5-3739-875c-444c7d71250c',
});

// src/domain/models/ledgerProductIds.ts:65-67, 110-112 (extra members)
HULU_EXTRA_MEMBER_ADS: '01e75d0f-67f5-3633-99ee-fd5cb96bdacb',
HULU_EXTRA_MEMBER_NO_ADS: '1298019d-7ae9-39ce-a94e-37b528eb7e23',`}
        lang="typescript"
        filename="Hulu product UUID constants"
      />
      <p>
        Two practical notes. First, the ledger file cross-references the types
        file in comments (<code>// HULU_PRODUCT_IDS (types.ts:202-205)</code>)
        — the duplication is deliberate and both must stay in sync. Second,
        &quot;Extra Member&quot; (EM) is a real Hulu product line with its own
        UUIDs, its own Account Home section (flag{" "}
        <code>enable-hulu-account-extra-member-section</code>), its own cypher
        keys (<code>huluEMPendingSwitchUpgrade</code>,{" "}
        <code>huluEMPendingSwitchForfeiture</code>...), and its own HITS flow (
        <code>EXTRA_MEMBER_UPSELL = &apos;extra_member_upsell&apos;</code>).
      </p>

      <h2 id="offer-types">Hulu Offer Types &amp; Bundles</h2>
      <p>
        <code>src/domain/models/offerType.ts</code> is the Rosetta stone.
        Hulu-relevant entries:
      </p>
      <ul>
        <li>
          <code>&apos;HULU_STANDALONE&apos;</code> — plain Hulu SVOD offers;
          the four package cohorts (<code>hulu_basic</code>,{" "}
          <code>hulu_premium</code>, <code>hulu_basic_with_live_tv</code>,{" "}
          <code>hulu_premium_with_live_tv</code>) all map here
          (<code>offerType.ts:126-129, 349-383</code>).
        </li>
        <li>
          <code>&apos;HULU_LIVETV&apos;</code> — supersedes the deprecated{" "}
          <code>&apos;HULU_LIVETV_STANDALONE&apos;</code>{" "}
          (<code>offerType.ts:42-44</code>). Live TV also drags in
          Hulu-specific machinery elsewhere: the GLO switch call forwards{" "}
          <code>defaultZipcodeFromIpAddress</code> only for Hulu (BBD Live-TV
          zipcode lookups).
        </li>
        <li>
          <code>&apos;HYBRID_BUNDLE&apos;</code> — the comment reads{" "}
          <em>&quot;Hulu Basic, Disney Premium, E+ (no tier)&quot;</em>{" "}
          (<code>offerType.ts:37</code>); a bundle-tier comment block
          (<code>:76-79</code>) documents which Hulu product sits inside each
          bundle tier.
        </li>
        <li>
          <code>hulu_no_ads_component</code> — an add-on component with{" "}
          <code>addOn: [&apos;hulu&apos;]</code>{" "}
          (<code>offerType.ts:679-688</code>): the &quot;remove ads from the
          Hulu part of your bundle&quot; product.
        </li>
      </ul>
      <p>
        On the plan-switch side, Hulu has a hardcoded add-on merchandising
        order — worth knowing because product will ask you to change it one
        day:
      </p>
      <CodeBlock
        code={`// src/domain/screen/hulu/account/planSwitch/planSwitchSortService.ts:23-37
const huluPrioritizedAddonsPackageIds: string[] = [
  'espn_standalone', 'max_ads', 'max_no_ads', 'cinemax', 'showtime', 'starz',
  'sports', 'entertainment', 'espanol', 'unlimited_screens',
];`}
        lang="typescript"
        filename="planSwitchSortService.ts"
      />

      <h2 id="legacy-vs-acp">Legacy vs ACP: The Subscriber Split</h2>
      <MermaidDiagram
        chart={legacySplitDiagram}
        title="How a Hulu Agreement Is Classified"
        caption="The agreement's source triple (type, partner, provider) decides everything — and legacy subs are only visible on Account Home when the LaunchDarkly flag widens the allowed source types."
        minHeight={560}
      />
      <CodeBlock
        code={`// src/domain/common/util.ts:245-267
export function isLegacyHuluSubscription(agreement): boolean {
  const { type, partner } = agreement.source;
  return type === 'HULU' && partner.toLowerCase() === 'hulu';
}

export function isLegacyHulu3PSubscription(agreement): boolean {
  const { provider } = agreement.source;
  return isLegacyHuluSubscription(agreement) && provider.toLowerCase() !== 'hulu';
}

// src/domain/screen/hulu/constants.ts:27-29
// Allow legacy Hulu subscriptions on ACP Account Home due to ACP subs migration
export const ACCOUNT_HOME_ALLOWED_AGREEMENT_SOURCE_TYPES_V2: FlexAgreementSourceType[] =
  ['DIRECT', 'OPS', 'CST', 'HULU'];`}
        lang="typescript"
        filename="legacy-Hulu detection + Account Home gating"
      />
      <p>
        Read the flag JSDoc for <code>enable-legacy-hulu-subscription-details</code>{" "}
        (<code>featureFlags/constants.ts:2936-2939</code>):{" "}
        <em>&quot;Enable displaying legacy Hulu non-D2C subscriptions on
        Account Home.&quot;</em> Off by default. This is the canonical example
        of the ACP migration&apos;s code shape: legacy data exists, unified
        surfaces must learn to show it, and a flag stages the rollout. Two
        sibling flags complete the picture:{" "}
        <code>enable-bundle-hulu-activation-bypass</code> (trio-bundle
        redemption subscribers link straight to hulu.com instead of the
        activation page) and <code>enable-bundle-hulu-login-on-success</code>{" "}
        (post-signup Hulu link goes to Hulu login because ACP auto-activates
        Hulu — <em>&quot;no longer requires /commerce/activate/hulu&quot;</em>).
      </p>

      <h2 id="entitlement-helpers">Entitlement &amp; Sorting Helpers</h2>
      <p>
        Two more helpers you will meet in Account Home code:
      </p>
      <ul>
        <li>
          <code>isEntitledHuluSubscription()</code>{" "}
          (<code>accountHomeService.ts:226-234</code>) — checks{" "}
          <code>subscription.offer?.labels?.includes(&apos;hulu&apos;)</code>.
          Note the mechanism: <strong>offer labels</strong>, not product UUIDs.
          A subscription is &quot;Hulu-entitled&quot; if its offer carries the{" "}
          <code>hulu</code> label.
        </li>
        <li>
          <code>agreementSortForHulu()</code>{" "}
          (<code>accountHomeService.ts:968-982</code>) — sorts agreements so
          those with <code>source.partner === &apos;hulu&apos;</code> come
          first. On a mixed account (Disney bundle + legacy Hulu), the
          Hulu-sourced agreement wins the top slot of Hulu&apos;s Account Home.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"What is Hulu actually selling, and how does the code model it?"`}
        intro={
          <>
            Strong answers separate the <em>catalog</em> (products/offers) from
            the <em>population</em> (legacy vs unified subscribers) — most
            candidates conflate them.
          </>
        }
        steps={[
          "Name the three vocabularies: frozen product UUIDs (HULU_ADS/HULU_NO_ADS + extra-member variants), FlexOfferType classifications (HULU_STANDALONE, HULU_LIVETV, HYBRID_BUNDLE), and Hulu-native package cohorts mapped into them.",
          "Show catalog fluency: bundles embed Hulu products (HYBRID_BUNDLE = 'Hulu Basic, Disney Premium, E+'), and hulu_no_ads_component is an add-on that upgrades the Hulu slice of a bundle.",
          "Pivot to the population: subscribers split into legacy Hulu-billed (agreement source type HULU + partner hulu) and unified ACP/D2C — isLegacyHuluSubscription() is the precise check, with a 3P variant for third-party billing.",
          "Explain the rollout shape: Account Home renders legacy subs only when enable-legacy-hulu-subscription-details widens allowed source types to include HULU.",
          "Close with entitlement nuance: 'Hulu-entitled' is decided by offer labels, not product ids — and Hulu's Account Home sorts Hulu-sourced agreements first.",
        ]}
      />

      <h2 id="challenge">Challenge: The Invisible Subscription</h2>
      <InterviewChallenge
        title="Where did my subscription go?"
        scenario={
          <>
            A CS escalation: a long-time Hulu customer (billed by Hulu since
            2017, never migrated) logs into the new unified account page and
            sees <em>no subscription at all</em>. Meanwhile a different user
            with a Disney trio bundle complains their &quot;Hulu&quot; shows a
            confusing activation step after signup even though Hulu now
            auto-activates.
          </>
        }
        tasks={[
          "For user 1: trace exactly which check filters their subscription out of Account Home, naming files and the data condition.",
          "For user 1: name the flag that fixes it and the constant that changes meaning when it is on.",
          "For user 2: name the flag governing their experience and describe its intended end state.",
          "State which of these behaviors you could verify locally and how (headers, data shape).",
        ]}
        pitfalls={[
          "Blaming GLO for not returning the agreement — it returns it; Flex filters it.",
          "Treating 'legacy Hulu' as an account attribute — it is an agreement-source condition.",
          "Confusing the activation-bypass flag (redemption bundles → hulu.com) with the login-on-success flag (success-screen link → Hulu login).",
          "Forgetting both behaviors are flag-gated, so prod behavior depends on LaunchDarkly state, not code defaults.",
        ]}
        signal="A strong answer walks the agreement.source triple through the allowed-source-types filter and lands on the flag — without hand-waving."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>User 1:</strong> their agreement has{" "}
          <code>source.type === &apos;HULU&apos;</code> and{" "}
          <code>source.partner === &apos;hulu&apos;</code> —{" "}
          <code>isLegacyHuluSubscription()</code> is true
          (<code>util.ts:245</code>). Hulu Account Home only renders agreements
          whose source type is in its allowed list; the widened list{" "}
          <code>ACCOUNT_HOME_ALLOWED_AGREEMENT_SOURCE_TYPES_V2 =
          [&apos;DIRECT&apos;,&apos;OPS&apos;,&apos;CST&apos;,&apos;HULU&apos;]</code>{" "}
          (<code>hulu/constants.ts:27-29</code>) only applies when{" "}
          <code>enable-legacy-hulu-subscription-details</code> is on. Flag off
          → <code>&apos;HULU&apos;</code> source excluded → empty screen.
        </p>
        <p>
          <strong>User 2:</strong>{" "}
          <code>enable-bundle-hulu-login-on-success</code>{" "}
          (<code>constants.ts:2914-2917</code>): with ACP, Hulu auto-activates,
          so the success screen&apos;s Hulu link should go to Hulu{" "}
          <em>login</em> rather than <code>/commerce/activate/hulu</code>.
          Expected final state: true. Off → user still sees the redundant
          activation step.
        </p>
        <p>
          <strong>Local verification:</strong> run Flex locally, curl the
          account-home screen with <code>x-bamtech-partner: hulu</code>, and
          mock GLO agreement data (factory{" "}
          <code>buildFlexAgreementDetails</code>/<code>buildAgreement</code>)
          with <code>source: {`{ type: 'HULU', partner: 'hulu', provider: 'hulu' }`}</code>;
          flip the flag with{" "}
          <code>jest.mocked(getEnableLegacyHuluSubscriptionDetails).mockResolvedValue(true)</code>{" "}
          in tests or a local flag override.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Three vocabularies: product UUIDs (frozen constants, duplicated
          deliberately in types + ledger files), <code>FlexOfferType</code>{" "}
          (HULU_STANDALONE / HULU_LIVETV / HYBRID_BUNDLE), and Hulu-native
          package cohorts sourced from Hulu&apos;s PEPC repos.
        </li>
        <li>
          Extra Member is a full product line: own UUIDs, own flag, own cypher
          keys, own HITS flow.
        </li>
        <li>
          The subscriber base splits legacy vs ACP;{" "}
          <code>isLegacyHuluSubscription()</code> = source{" "}
          <code>type HULU + partner hulu</code>, with a 3P variant on
          provider.
        </li>
        <li>
          Legacy subs appear on Account Home only when{" "}
          <code>enable-legacy-hulu-subscription-details</code> widens allowed
          source types to include <code>HULU</code>.
        </li>
        <li>
          ACP consequences are flag-shaped: activation bypass for redemption
          bundles, Hulu-login-on-success replacing the activation step.
        </li>
        <li>
          Entitlement is label-based (<code>offer.labels includes
          &apos;hulu&apos;</code>), and Hulu Account Home sorts Hulu-sourced
          agreements first.
        </li>
      </ul>
    </div>
  );
}
