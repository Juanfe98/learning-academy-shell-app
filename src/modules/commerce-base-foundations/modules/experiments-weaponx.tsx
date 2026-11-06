import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoSystemsDiagram = String.raw`flowchart TD
  subgraph wx["WeaponX / Mystique (experiments)"]
    MYS["useMystiqueFeatureFlags()<br/>keys: wpnx-*"]
  end
  subgraph cfg["Commerce config (static region config)"]
    REG["useCommerceFeatureFlag()<br/>per-country config"]
  end
  MYS --> EXP["common/hooks/experiments/*"]
  EXP --> UI1["experiment UI variants"]
  REG --> LFF["LocalizedFeatureFlag"]
  LFF --> UI2["region-gated UI"]`;

const hookShapeDiagram = String.raw`flowchart LR
  FLAGS["useMystiqueFeatureFlags()"]
  FLAGS --> READ["data?.[FEATURE_ID]"]
  READ --> CMP{"compare to<br/>treatment value"}
  CMP -->|"=== 'card-number-first'"| T["return true / treatment"]
  CMP -->|"else"| C["return false / control"]`;

const lifecycleDiagram = String.raw`stateDiagram-v2
  [*] --> Create
  Create --> Wire : add hook + FEATURE_ID
  Wire --> Test : gate UI, record treatment to Datadog
  Test --> Decide : read results
  Decide --> Productionalize : treatment wins
  Decide --> Rollback : treatment loses
  Productionalize --> [*] : replace flag with business rule, delete key + hook
  Rollback --> [*] : remove branch, revert to control types`;

const productionalizeDiagram = String.raw`flowchart TD
  START["Experiment won"]
  START --> REPLACE["Replace useMystiqueFeatureFlags() read<br/>with deterministic rule"]
  REPLACE --> RULE["e.g. partnerName === 'disney' || 'espn'<br/>(from useSessionInfo)"]
  RULE --> DELKEY["Delete wpnx-* key in WeaponX"]
  DELKEY --> DELHOOK["Remove hook + FEATURE_ID constant"]
  DELHOOK --> FIX["Update fixtures + tests"]
  FIX --> CLOSE["Close cleanup ticket (GREAT-*/GCIEX-*/WEB-*)"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "two-systems", title: "Two Flag Systems — Don't Confuse Them", level: 2 },
  { id: "source", title: "The Single Source: useMystiqueFeatureFlags", level: 2 },
  { id: "hook-shape", title: "The Experiment Hook Shape", level: 2 },
  { id: "boolean", title: "Boolean vs Treatment-String vs Object", level: 3 },
  { id: "other-engines", title: "Two Other Engines: Session & Spearmint", level: 2 },
  { id: "copy-override", title: "The Copy-Override Engine", level: 2 },
  { id: "components", title: "Experiment Components", level: 2 },
  { id: "lifecycle", title: "The Experiment Lifecycle", level: 2 },
  { id: "productionalize", title: "Productionalization: Flag → Business Rule", level: 2 },
  { id: "hybrid", title: "The Mid-Migration Hybrid State", level: 3 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Productionalize an Experiment", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ExperimentsWeaponX() {
  return (
    <div className="article-content">
      <p>
        Experiments are the beating heart of commerce work. A huge share of the tickets you&apos;ll
        touch are not &quot;build a new feature&quot; — they&apos;re &quot;this experiment won, make
        it the default and delete the flag,&quot; or &quot;wire up an A/B test for this new price
        treatment.&quot; This module teaches the WeaponX experiment system end to end: how flags are
        fetched, the standard hook shape, the three value flavors, the two alternative engines, and —
        most importantly — the <strong>productionalization pattern</strong> that turns a winning
        experiment into permanent code.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Two things make experiments error-prone. First, there are <strong>two different flag
        systems</strong> in the repo that look alike but do completely different jobs. Second, a
        given experiment usually exists in <em>one of several lifecycle states</em> at any moment —
        active, half-productionalized, or awaiting cleanup — and reading the wrong state leads to
        shipping the wrong behavior. Master both and experiment tickets become mechanical.
      </p>

      <h2 id="two-systems">Two Flag Systems — Don&apos;t Confuse Them</h2>
      <p>
        This is the single most important distinction in the module:
      </p>
      <MermaidDiagram
        chart={twoSystemsDiagram}
        title="WeaponX experiments vs commerce config flags"
        caption="WeaponX (wpnx-*) flags are A/B experiments read through experiment hooks. Commerce config flags are static per-region config read through LocalizedFeatureFlag. Same word 'flag', different systems."
        minHeight={360}
      />
      <ArticleTable
        caption="The two flag systems side by side."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>WeaponX / Mystique</th>
              <th>Commerce (localized) config</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Purpose</td>
              <td>A/B experiments</td>
              <td>Static per-region configuration</td>
            </tr>
            <tr>
              <td>Key convention</td>
              <td><code>wpnx-*</code></td>
              <td>Region config keys (no <code>wpnx-</code>)</td>
            </tr>
            <tr>
              <td>Source</td>
              <td>SDK session (cached at bootstrap)</td>
              <td><code>commerceAppConfig</code> per-country map</td>
            </tr>
            <tr>
              <td>Read via</td>
              <td><code>useMystiqueFeatureFlags()</code> + experiment hook</td>
              <td><code>useCommerceFeatureFlag()</code> / <code>&lt;LocalizedFeatureFlag&gt;</code></td>
            </tr>
            <tr>
              <td>Lives in</td>
              <td><code>common/hooks/experiments/</code></td>
              <td><code>common/components/localized/feature-flag/</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Trap:</strong> the render-gate component is named{" "}
        <code>LocalizedFeatureFlag</code> (not <code>FeatureFlag</code>), and it reads{" "}
        <em>commerce/region config</em> flags — not <code>wpnx-*</code> experiments. Experiments are
        always consumed through the hooks in <code>common/hooks/experiments/</code>, never through
        that component.
      </p>

      <h2 id="source">The Single Source: useMystiqueFeatureFlags</h2>
      <p>
        Every WeaponX experiment reads from one hook,{" "}
        <code>common/hooks/use-mystique-feature-flags.ts</code>. It wraps react-query around the SDK
        session — and note there is <strong>no network call</strong>; the SDK returns values cached
        during bootstrap.
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/hooks/use-mystique-feature-flags.ts"
        code={`export function useMystiqueFeatureFlags() {
  const { sdkSession, isEnabled: isSDKEnabled, isReady } = useSDKSession();

  return useQuery({
    queryKey: ['getFeatureFlags'],
    queryFn: async () => {
      if (isSDKEnabled && sdkSession) {
        return sdkSession.getFeatureFlags();
      }
      // TODO: WEB-16682 return actual data ... (hardcoded fallback for non-SDK tenants)
      return {
        'wpnx-web-commerce-gift-card': true,
        // ...
      };
    },
    enabled: isReady,
    meta: { errorMessage: 'Failed to retrieve SDK feature flags.', owner: Owners.CORE },
    useErrorBoundary: false,
  });
}`}
      />
      <p>
        Two consequences for teaching. (1) <strong>Hulu is US-only and does not use WeaponX</strong>,
        so when the SDK is disabled a hardcoded object of flags is returned. (2) The flag value type
        is deliberately broad (<code>boolean | string | number | Array | Record</code>), which is why
        every experiment hook has to <em>narrow</em> the value itself.
      </p>

      <h2 id="hook-shape">The Experiment Hook Shape</h2>
      <p>
        The standard shape across <code>common/hooks/experiments/</code>: export a{" "}
        <code>FEATURE_ID</code> constant (and often a variant enum), call{" "}
        <code>useMystiqueFeatureFlags()</code>, read <code>data?.[FEATURE_ID]</code>, and compare
        against a treatment value. Here is the ticket-relevant card-number-first hook in full (
        <code>common/hooks/experiments/use-is-in-card-number-field-first-experiment.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-is-in-card-number-field-first-experiment.ts"
        code={`export const CARD_NUMBER_FIRST_SWITCH_FEATURE_ID = 'wpnx-card-number-first-switch';

export enum CardInputOrderExperimentVariant {
  CARD_NUMBER_FIRST = 'card-number-first',
  CONTROL = 'name-on-card-first',
}

function isCardNumberFirstVariant(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.toLowerCase() === CardInputOrderExperimentVariant.CARD_NUMBER_FIRST
  );
}

export function useIsInCardNumberFieldFirstExperiment(): boolean {
  const { data: weaponXflags } = useMystiqueFeatureFlags();
  return isCardNumberFirstVariant(weaponXflags?.[CARD_NUMBER_FIRST_SWITCH_FEATURE_ID]);
}`}
      />
      <MermaidDiagram
        chart={hookShapeDiagram}
        title="A single experiment hook"
        caption="Fetch all flags → read this experiment's key → compare to a treatment value → return a narrowed boolean or treatment. The narrowing is the hook's job because the raw value type is broad."
        minHeight={280}
      />
      <p>
        The minimal shape is even smaller — the comparison-chart-descending hook is just a read with
        a default (<code>use-is-in-web-funnel-comparison-chart-desc-experiment.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-is-in-web-funnel-comparison-chart-desc-experiment.ts"
        code={`export function useIsInWebInFunnelComparisonChartDescendingExperiment() {
  const { data } = useMystiqueFeatureFlags();
  return data?.['wpnx-In-Funnel-Comp-Chart-Descending'] ?? false;
}`}
      />

      <h3 id="boolean">Boolean vs Treatment-String vs Object</h3>
      <p>
        Flag values come in three flavors, and the hook&apos;s return type follows:
      </p>
      <ArticleTable
        caption="The three experiment value flavors."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Flavor</th>
              <th>Example key</th>
              <th>Hook returns</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Boolean</td>
              <td><code>wpnx-In-Funnel-Comp-Chart-Descending</code></td>
              <td><code>boolean</code></td>
            </tr>
            <tr>
              <td>Treatment string</td>
              <td><code>wpnx-skip-wb-landing-page === &apos;treatment-skip-wb-landing-page&apos;</code></td>
              <td><code>boolean</code> (via <code>===</code>) or the raw treatment</td>
            </tr>
            <tr>
              <td>Named variant enum</td>
              <td><code>wpnx-2024Q3-LATAM-Tiara-Launch</code> → <code>&apos;cards&apos; | &apos;chart&apos;</code></td>
              <td>the variant value or a derived object</td>
            </tr>
            <tr>
              <td>Object</td>
              <td><code>wpnx-great-copy-*</code> → <code>{"{ hasOverrides, ... }"}</code></td>
              <td>a merged mapping</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The welcome-back skip test shows the treatment-string flavor with a per-market split, and the
        <code>// TODO WEB-24082: Cleanup or productionalize.</code> header comment that marks an
        experiment as pending decision:
      </p>
      <CodeBlock
        lang="tsx"
        filename="use-is-in-skip-welcome-back-experiment.tsx"
        code={`// TODO WEB-24082: Cleanup or productionalize.
export function useIsInSkipWelcomeBackExperiment() {
  const { data } = useMystiqueFeatureFlags();
  return data?.['wpnx-skip-wb-landing-page'] === 'treatment-skip-wb-landing-page';
}

// TODO WEB-24082: Cleanup or productionalize.
export function useIsInSkipWelcomeBackEMEAExperiment() {
  const { data } = useMystiqueFeatureFlags();
  return data?.['wpnx-skip-wb-landing-page-emea'] === 'treatment-skip-wb-landing-page';
}`}
      />

      <h2 id="other-engines">Two Other Engines: Session &amp; Spearmint</h2>
      <p>
        Not every experiment reads Mystique flags. There are two other engines:
      </p>
      <ul>
        <li>
          <strong>Session experiments.</strong> The Delta bundle/standalone hooks read from{" "}
          <code>useSessionInfo()</code> (<code>data.experiments</code>, matched by{" "}
          <code>featureId</code>/<code>variantId</code>), not Mystique. e.g.{" "}
          <code>FEATURE_ID = &apos;wpnx-is-delta-bundle&apos;</code>,{" "}
          <code>VARIANT_ID = &apos;enabled&apos;</code>.
        </li>
        <li>
          <strong>Spearmint — the generic engine.</strong>{" "}
          <code>useSpearmintExperiment&lt;T&gt;({"{ experimentCtx, observabilityCtx, processVariant }"})</code>{" "}
          calls <code>dataInterface.getExperimentAssignments()</code> asynchronously, applies a
          caller-supplied <code>processVariant</code>, and writes the treatment to Datadog global
          context.
        </li>
      </ul>
      <CodeBlock
        lang="typescript"
        filename="common/hooks/experiments/use-spearmint-experiment.ts (shape)"
        code={`// On success, the treatment is recorded to Datadog global context:
datadogRum.setGlobalContextProperty(featureId, {
  treatment,
  owner,
  sourceComponent,
});
// On error, falls back to defaultState and logs SPEARMINT_FETCH_ERROR.`}
      />
      <p>
        Recording the treatment to Datadog global context is how experiment exposure is tied to
        downstream metrics — it&apos;s the analytics side of every experiment, not just Spearmint&apos;s.
      </p>

      <h2 id="copy-override">The Copy-Override Engine</h2>
      <p>
        Remember from the dictionary module that <code>useDictionary()</code> can transparently swap a
        cypher key. That swap comes from <code>useExperimentalCopyOverrides()</code> (
        <code>common/hooks/experiments/use-copy-override-experiment.tsx</code>). It loops over{" "}
        <em>all</em> flags, picks any whose id starts with <code>wpnx-great-copy</code> and has{" "}
        <code>hasOverrides: true</code>, and merges their key→replacement maps into one object. This
        is how marketing copy gets A/B tested <strong>without code changes</strong> — the experiment
        remaps a key, and every call site that looks it up renders the variant copy. Duplicate keys
        across two override flags are detected, logged to Datadog (<code>Owners.XD</code>,{" "}
        <code>COPY_OVERRIDE_DUPLICATE</code>), and the offending flag is ignored.
      </p>

      <h2 id="components">Experiment Components</h2>
      <p>
        The UI variants live in <code>common/components/experiments/</code>. They are plain
        presentational components; a hook decides whether to mount them. Two patterns appear:
      </p>
      <ul>
        <li>
          <strong>Component reads the hook itself.</strong>{" "}
          <code>table-offer/table-offer.tsx</code> (<code>TableOffer</code>) calls{" "}
          <code>useIsInLatamEmailCaptureComparisonChartExperiment()</code> and{" "}
          <code>useIsInTurkeyComparisonChartExperiment()</code> directly, then feeds those booleans
          into <code>updateToComparisonChartOffers(...)</code>. Its default sort is descending price,
          with a comment: &quot;All comparison chart experiments should run with descending price as
          default.&quot;
        </li>
        <li>
          <strong>Flag passed as a prop.</strong> <code>offer-card-carousel/offer-card-carousel.tsx</code>{" "}
          receives <code>isGridFeatureFlagEnabled</code> as a prop, then computes{" "}
          <code>shouldUseGridLayout = isGridFeatureFlagEnabled &amp;&amp; browserSupportsSubgrid</code>.
        </li>
      </ul>

      <h2 id="lifecycle">The Experiment Lifecycle</h2>
      <MermaidDiagram
        chart={lifecycleDiagram}
        title="Experiment lifecycle"
        caption="Create → Wire → Test → Decide → (Productionalize | Rollback). The TODO comment on a hook tells you it's still in Test, awaiting the Decide step."
        minHeight={420}
      />
      <ol>
        <li>
          <strong>Create.</strong> Define a <code>wpnx-*</code> flag in WeaponX. Add a hook in{" "}
          <code>common/hooks/experiments/</code> exporting a <code>FEATURE_ID</code> + variant enum,
          wrapping <code>useMystiqueFeatureFlags()</code>. Tag it{" "}
          <code>// TODO &lt;TICKET&gt;: Cleanup or productionalize</code>.
        </li>
        <li>
          <strong>Wire / Test.</strong> Consume the hook to gate the variant UI. Treatment assignment
          is recorded to Datadog RUM. Non-SDK tenants (Hulu) get hardcoded fallback values.
        </li>
        <li>
          <strong>Decide → Productionalize.</strong> If the treatment wins, replace the flag read
          with a deterministic rule, delete the WeaponX key, remove the hook + constants + fixtures,
          and close the cleanup ticket.
        </li>
        <li>
          <strong>Or Roll Back.</strong> Remove the treatment branch and revert experimental types to
          the control types.
        </li>
      </ol>

      <h2 id="productionalize">Productionalization: Flag → Business Rule</h2>
      <p>
        The canonical worked example is <strong>card-number-first (GREAT-1076 / GREAT-842)</strong>.
        When an experiment wins, its flag read is replaced by a <em>deterministic business rule</em>.
        From <code>payments/payment-forms/components/payments-container/payments-container.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="payments-container.tsx (productionalized)"
        code={`const sessionInfoQuery = useSessionInfo();
// Card-number-first is the productionalized default for Disney+ (all regions)
// and ESPN (US-only at the platform level). GREAT-1076.
const partnerName = sessionInfoQuery.data?.partnerName;
const shouldShowCardNumberFieldFirst =
  partnerName === 'disney' || partnerName === 'espn';`}
      />
      <MermaidDiagram
        chart={productionalizeDiagram}
        title="Productionalizing a winning experiment"
        caption="The flag read becomes a business rule; then the key, hook, constant, and fixtures are removed and the cleanup ticket closes. Skipping the cleanup steps leaves dead flags and confusing hybrid code."
        minHeight={440}
      />

      <h3 id="hybrid">The Mid-Migration Hybrid State</h3>
      <p>
        Real productionalization is rarely atomic. The change-payment container currently captures a{" "}
        <strong>hybrid state</strong>: ESPN is productionalized (business rule) while Disney still
        runs the flag until a follow-up ticket. From{" "}
        <code>change-payment-forms-container.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="change-payment-forms-container.tsx (hybrid)"
        code={`// ESPN: card-number-first is the productionalized default (GREAT-1076).
const partnerName = useSessionInfo().data?.partnerName;
// Disney still renders card-number-first via the switch experiment until
// GREAT-842 productionalizes it. TODO: GREAT-842 - remove the hook then.
const isInCardNumberFieldFirstExperiment = useIsInCardNumberFieldFirstExperiment();
const shouldShowCardNumberFieldFirst =
  partnerName === 'espn' || isInCardNumberFieldFirstExperiment;`}
      />
      <p>
        Reading this correctly is a real skill: the same feature is <em>productionalized in one flow,
        experimental in another, and for one partner but not the other</em>. When you pick up a
        cleanup ticket, grep for the <code>FEATURE_ID</code> constant and the flag key across the repo
        (source, fixtures, tests) — the hybrid state means there is usually more than one call site.
      </p>
      <p>
        Ticket-ID conventions in cleanup comments: <code>GREAT-*</code> for signup/payments/
        comparison-chart, <code>GCIEX-*</code> for retention/offers, <code>WEB-*</code> for
        cross-cutting.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do experiments work in commerce-base?'"
        intro="Lead with the two-systems distinction, then the hook shape, then the productionalization lifecycle."
        steps={[
          "Distinguish the two flag systems: WeaponX wpnx-* experiments (via useMystiqueFeatureFlags + experiment hooks) vs static commerce/region config (via LocalizedFeatureFlag).",
          "Describe the hook shape: export FEATURE_ID, read data?.[FEATURE_ID] from useMystiqueFeatureFlags, narrow to a boolean/treatment. Note the SDK returns cached values (no network call) and Hulu falls back to hardcoded flags.",
          "Mention the alternative engines: session experiments (useSessionInfo) and the generic Spearmint engine, plus the copy-override engine that A/B tests copy with no code change.",
          "Explain the lifecycle: create (with a TODO ticket) → wire/test (record treatment to Datadog) → decide → productionalize or roll back.",
          "Close with productionalization: replace the flag read with a deterministic business rule (e.g. partnerName-based), delete the key + hook + fixtures, close the ticket — and recognize the hybrid mid-migration state where one flow/partner is done and another isn't.",
        ]}
      />

      <h2 id="challenge">Challenge: Productionalize an Experiment</h2>
      <InterviewChallenge
        title="Make a winning experiment the permanent default"
        scenario={
          <>
            You&apos;re assigned a ticket: the <code>wpnx-billing-payment-input-top</code> experiment
            (showing the payment form at the top of billing) won for all partners and should become
            the permanent default. Walk through exactly what you&apos;d change, in what order, and how
            you&apos;d avoid leaving the codebase in a broken or half-migrated state.
          </>
        }
        tasks={[
          "Identify every place the experiment is read (hook, FEATURE_ID constant, call sites) and how you'd find them.",
          "Decide what the deterministic rule should be if the winner applies to ALL partners/regions (hint: it may be no condition at all).",
          "List the cleanup steps beyond the code change (WeaponX key, hook, constants, fixtures, tests).",
          "Explain how you'd verify 100% test coverage still holds after removing the experiment branch.",
        ]}
        pitfalls={[
          "Changing one call site but leaving the hook and other consumers pointing at the dead flag.",
          "Forgetting fixtures/tests that assert the old experimental behavior — they'll fail or drop coverage.",
          "Leaving the wpnx-* key live in WeaponX so the flag lingers as dead config.",
        ]}
        signal="A strong answer greps for the FEATURE_ID + flag key across source/fixtures/tests, replaces reads with the appropriate rule (unconditional if the winner is universal), removes the hook/constant/key, updates fixtures and tests, and confirms coverage with a targeted jest run before opening the PR."
      />
      <SolutionReveal difficulty="medium">
        <p>
          First, locate everything: grep for the <code>FEATURE_ID</code> constant, the raw flag key{" "}
          <code>wpnx-billing-payment-input-top</code>, and the hook name across{" "}
          <code>src/</code> (source, <code>__fixtures__</code>, <code>*.test.tsx</code>). Expect more
          than one call site.
        </p>
        <p>
          Because the winner applies to all partners, the &quot;deterministic rule&quot; is{" "}
          <strong>no condition</strong>: the payment-top layout becomes unconditional, and the{" "}
          <code>shouldShow...</code> branch is deleted rather than replaced with a partner check.
          Then complete the cleanup: remove the hook file + <code>FEATURE_ID</code> constant, delete
          the key in WeaponX, and update fixtures/tests that assert the old control behavior (some
          tests will be deleted, not just edited — this is expected, not scope creep).
        </p>
        <p>
          Finally, run a targeted <code>jest</code> on the affected files with{" "}
          <code>--coverage</code>; because 100% coverage is enforced, any now-unreachable branch you
          missed will surface as an uncovered line. Only open the PR once coverage is green.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two flag systems.</strong> WeaponX <code>wpnx-*</code> experiments (hooks) vs
          static commerce/region config (<code>LocalizedFeatureFlag</code>). Never confuse them.
        </li>
        <li>
          <strong>One experiment source.</strong> <code>useMystiqueFeatureFlags()</code> — SDK-cached,
          no network call; Hulu falls back to hardcoded flags.
        </li>
        <li>
          <strong>Standard hook shape.</strong> <code>FEATURE_ID</code> + read{" "}
          <code>data?.[FEATURE_ID]</code> + narrow to boolean/treatment/variant.
        </li>
        <li>
          <strong>Three other mechanisms.</strong> Session experiments, the generic Spearmint engine,
          and the copy-override engine (A/B copy without code).
        </li>
        <li>
          <strong>Productionalize = flag → business rule.</strong> Replace the read (often{" "}
          <code>partnerName</code>-based), delete key + hook + fixtures, close the ticket.
        </li>
        <li>
          <strong>Watch the hybrid state.</strong> A feature can be productionalized in one flow/
          partner and still experimental in another. Grep the <code>FEATURE_ID</code> everywhere.
        </li>
      </ul>
    </div>
  );
}
