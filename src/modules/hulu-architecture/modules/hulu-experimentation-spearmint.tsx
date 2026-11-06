import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const transportDiagram = String.raw`flowchart TD
  SP["Spearmint platform (Hulu)<br/>spearmint.prod.hulu.com"] -->|"assigns user"| CK["_hulu_assignments cookie<br/>base64 of {v1:[{e,t,n:'featureId--variantId'}]}"]
  CK --> CL["CLIENT PATH (cgi-web)<br/>parse-spearmint-experiments.ts reads cookie<br/>→ dataInterface.getExperimentAssignments()"]
  CK -->|"cookie rides fetch<br/>credentials:'include'"| ED["Hulu Edge"]
  ED -->|"x-bamtech-spearmint-assignments header<br/>[ASSUMPTION: Edge translates cookie→header]"| FX["SERVER PATH (Flex)<br/>experimentation middleware"]
  FX --> N["mapSpearmintExperiments()<br/>normalize → WeaponX shape<br/>{experiments:{featureId:{variant_id,version}}}"]
  N --> GT["getExperimentTreatment({flexContext, featureId})<br/>SAME api for wpnx- and sprmnt- experiments"]
  CL --> HK["useSpearmintExperiment /<br/>useSpearmintCopyOverrides hooks<br/>+ Datadog RUM tagging"]`;

const middlewareDiagram = String.raw`flowchart TD
  A["Incoming request headers"] --> B{"x-bamtech-weaponx-assignments<br/>present?"}
  B -->|yes| C["decodeClientHeader()<br/>→ WeaponXExperiment"]
  B -->|no| D{"x-bamtech-spearmint-assignments<br/>present?"}
  D -->|yes| E["decodeSpearmintAssignments()<br/>+ mapSpearmintExperiments()"]
  D -->|no| F["undefined — no assignments"]
  C --> G["flexContext.experimentation"]
  E --> G
  F --> G
  G --> H["getExperimentTreatment()<br/>returns variant_id | undefined"]
  I["Optional: enable-weaponx-direct-api<br/>server-side Assignments API +<br/>enable-weaponx-shadow-comparison logging"] -.-> G`;

export const toc: TocItem[] = [
  { id: "two-platforms", title: "Two Platforms, One API", level: 2 },
  { id: "the-transport-chain", title: "The Transport Chain", level: 2 },
  { id: "flex-middleware", title: "Flex Middleware: Normalize & Prefer", level: 2 },
  { id: "active-experiments", title: "The Active Hulu Experiment Inventory", level: 2 },
  { id: "client-side-hooks", title: "Client-Side Spearmint Hooks", level: 2 },
  { id: "copy-overrides", title: "Copy-Override Experiments", level: 2 },
  { id: "why-no-weaponx", title: "Why WeaponX/Mystique Is Inert for Hulu", level: 2 },
  { id: "see-an-example", title: "How to See a Real Example", level: 2 },
  { id: "testing", title: "Testing Hulu Experiments", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Ship a Hulu Experiment", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluExperimentationSpearmint() {
  return (
    <div className="article-content">
      <p>
        This is the module the rest of the academy has been building toward.
        Hulu A/B tests run on <strong>Spearmint</strong> — Hulu&apos;s own
        experimentation platform — while Disney+ and ESPN run on WeaponX. The
        engineering achievement is that{" "}
        <em>almost no code needs to know that</em>: Spearmint assignments are
        normalized into WeaponX&apos;s shape at two boundaries (Flex middleware
        server-side, the data-interface client-side), so one detection API
        serves both platforms. Master the transport chain and the inventory
        below and you can implement, debug, and QA any Hulu experiment.
      </p>

      <h2 id="two-platforms">Two Platforms, One API</h2>
      <ArticleTable caption="The two experimentation platforms as they exist in code. The feature-ID prefix tells you everything.">
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>WeaponX (Disney)</th>
              <th>Spearmint (Hulu)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Feature-ID prefix</td>
              <td><code>wpnx-</code> (~49 consts in registry)</td>
              <td><code>sprmnt-</code> (5 consts, all Hulu)</td>
            </tr>
            <tr>
              <td>Dashboard</td>
              <td>
                <code>weaponx.disneystreaming.com</code> /{" "}
                <code>weaponx.twdcgrid.net</code>
              </td>
              <td>
                <code>spearmint.prod.hulu.com</code> /{" "}
                <code>spearmint.staging.hulu.com</code>
              </td>
            </tr>
            <tr>
              <td>Client transport</td>
              <td>
                BAM SDK bootstrap → <code>x-bamtech-weaponx-assignments</code>{" "}
                header
              </td>
              <td>
                <code>_hulu_assignments</code> cookie →{" "}
                <code>x-bamtech-spearmint-assignments</code> header
              </td>
            </tr>
            <tr>
              <td>Wire format</td>
              <td>
                base64 <code>{`{experiments:{id:{variant_id,version}}}`}</code>
              </td>
              <td>
                base64{" "}
                <code>{`{v1:[{e,t,n:'featureId--variantId'}]}`}</code>
              </td>
            </tr>
            <tr>
              <td>Detection API (Flex)</td>
              <td colSpan={2}>
                <strong>Identical:</strong>{" "}
                <code>getExperimentTreatment({`{flexContext, featureId}`})</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="the-transport-chain">The Transport Chain</h2>
      <MermaidDiagram
        chart={transportDiagram}
        title="Spearmint Assignment: Cookie → Two Consumers"
        caption="One cookie feeds both worlds: parsed directly by the client for hooks/RUM tagging, and (working theory) translated by Edge into the header Flex consumes. The Edge translation is the one tagged assumption in this chain."
        minHeight={560}
      />
      <p>
        The cookie parser on the client side — note it uses the{" "}
        <em>same</em> <code>--</code> split and the same trailing-garbage
        brace-trim workaround as Flex&apos;s decoder, which is the strongest
        evidence the header carries the cookie payload:
      </p>
      <CodeBlock
        code={`// cgi-web — packages/cgi/data-interface-hulu/src/experimentation/helpers/parse-spearmint-experiments.ts
const HULU_ASSIGNMENTS_COOKIE = '_hulu_assignments';

export function extractSpearmintExperiments(): Record<string, string> | undefined {
  const experiments: Record<string, string> = {};
  if (typeof window === 'undefined') return;
  const huluAssignmentsCookie = getCookie(HULU_ASSIGNMENTS_COOKIE);
  if (!huluAssignmentsCookie) return;

  const decodedHuluAssignmentsString = atob(huluAssignmentsCookie);
  const closingBraceIndex = decodedHuluAssignmentsString.lastIndexOf('}');
  const trimmedHuluAssignmentsString = decodedHuluAssignmentsString.slice(0, closingBraceIndex + 1);

  const { v1: spearmintExperiments } = JSON.parse(trimmedHuluAssignmentsString);
  for (const experiment of spearmintExperiments) {
    const { name, variant } = parseExperimentNameAndVariant(experiment.n); // split on '--'
    experiments[name] = variant;
  }
  return experiments;
}`}
        lang="typescript"
        filename="parse-spearmint-experiments.ts (cgi-web)"
      />

      <h2 id="flex-middleware">Flex Middleware: Normalize &amp; Prefer</h2>
      <MermaidDiagram
        chart={middlewareDiagram}
        title="resolveClientExperiment: WeaponX Preferred, Spearmint Fallback"
        caption="Order matters: if a request somehow carries both headers, WeaponX wins. For Hulu traffic only the Spearmint header exists, so the fallback IS the Hulu path."
        minHeight={520}
      />
      <CodeBlock
        code={`// growth-life-client-api — src/middlewares/experimentation.ts:76-100
function resolveClientExperiment(headers: StandardHeaders): WeaponXExperiment | undefined {
  if (headers.weaponxAssignmentsBase64) {
    try { return decodeClientHeader(headers.weaponxAssignmentsBase64); }
    catch { logger.warn('Unable to parse WeaponX assignments from client header'); return undefined; }
  }
  if (headers.spearmintAssignmentsBase64) {
    try {
      return mapSpearmintExperiments(decodeSpearmintAssignments(headers.spearmintAssignmentsBase64));
    } catch { logger.warn('Unable to parse Spearmint assignments from client header'); return undefined; }
  }
  return undefined;
}

// src/lib/experiments/treatment.ts:59-73 — the normalizer
export function mapSpearmintExperiments(experiments: SpearmintAssignments): WeaponXExperiment {
  const mapped: WeaponXExperiment = { experiments: {} };
  Object.values(experiments).forEach((v) => {
    v.forEach((entry) => {
      const [featureId, variantId] = entry.n.split('--');
      mapped.experiments[featureId] = { variant_id: variantId, version: entry.e };
    });
  });
  return mapped;
}`}
        lang="typescript"
        filename="Flex middleware + normalizer"
      />
      <p>
        Downstream, everything is platform-blind:{" "}
        <code>getExperimentTreatment({`{ flexContext, featureId }`})</code>{" "}
        returns the <code>variant_id</code> or <code>undefined</code> when
        unassigned (the <strong>undefined trap</strong>: detection helpers
        must treat <code>undefined</code> as control, never as an error).
        Invalid variants log a warning but are still returned{" "}
        (<code>treatment.ts:135-140</code>). Two evolution flags exist in the
        middleware (<code>experimentation.ts:240-316</code>):{" "}
        <code>enable-weaponx-direct-api</code> (server-side Assignments API
        instead of trusting client headers) and{" "}
        <code>enable-weaponx-shadow-comparison</code> (logs divergence between
        API and header results — including against Spearmint headers).
      </p>

      <h2 id="active-experiments">The Active Hulu Experiment Inventory</h2>
      <p>
        As of this research (2026-08-27), the registry carries{" "}
        <strong>five Spearmint experiments</strong> — all named{" "}
        <code>sprmnt-GREAT-*</code> (GREAT = the Growth team&apos;s Jira
        project) — plus Hulu-relevant WeaponX entries. Registry entries carry
        JSDoc with dev owner, dashboard links, and product owner; presence in
        the registry means &quot;wired in code&quot; —{" "}
        <em>live ramp status is only knowable from the Spearmint/WeaponX
        dashboards</em>.
      </p>
      <ArticleTable
        caption="Hulu experiment inventory (verified in registry.ts + variants.ts). Treatments listed exactly as coded."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Const (registry.ts)</th>
              <th>Feature ID</th>
              <th>Treatments</th>
              <th>Surface</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>PlanSelectCardOrder</code> (:479)
              </td>
              <td><code>sprmnt-GREAT-plan-select-card-order</code></td>
              <td>
                <code>control · duo-first · duo-first-hulu-last · no-hulu</code>
              </td>
              <td>SUF plan selector — where/whether Hulu cards appear</td>
            </tr>
            <tr>
              <td>
                <code>SwitchBilling</code> (:441)
              </td>
              <td><code>sprmnt-GREAT-switch-billing</code></td>
              <td><code>control · cancel-anytime</code></td>
              <td>
                Change-payment screen — Hulu ACP &quot;cancel anytime&quot;
                legal footer
                (<code>changePayment/experiments/buildLegalFooterNotice.ts</code>)
              </td>
            </tr>
            <tr>
              <td>
                <code>DuoUpsellStandaloneBilling</code> (:489)
              </td>
              <td><code>sprmnt-GREAT-duo-upsell-billing</code></td>
              <td>
                <code>control · brand-focused · content-focused</code>
              </td>
              <td>
                Billing/ledger — Hulu-standalone → Duo upsell card (both
                treatments show the card; copy differs)
              </td>
            </tr>
            <tr>
              <td>
                <code>AddonCohortRetention</code> (:432)
              </td>
              <td><code>sprmnt-GREAT-post-suf-addon</code></td>
              <td><code>control · bypass</code></td>
              <td>Post-SUF add-on flow</td>
            </tr>
            <tr>
              <td>
                <code>CancelSaveHeader</code> (:721)
              </td>
              <td><code>sprmnt-GREAT-cancel-save-header</code></td>
              <td>
                <code>control · loyalty · urgency · ...</code> (cleanup TODO
                GCIEX-10029)
              </td>
              <td>Cancel-flow save screen header</td>
            </tr>
            <tr>
              <td>
                <code>HuludaysBackground</code> (:271)
              </td>
              <td><code>wpnx-ips-huludays-background</code></td>
              <td><code>control · treatment</code></td>
              <td>
                IPS device-upsell — seasonal &quot;Huludays&quot; artwork
                (WeaponX because IPS is device-side, not hulu.com web)
              </td>
            </tr>
            <tr>
              <td>
                <code>PreSelectedPlanCarouselUS</code>
              </td>
              <td><code>wpnx-great-preselect-plan-carousel-usa</code></td>
              <td>
                <code>control · ascending_disney_hulu_preselected</code>
              </td>
              <td>Plan selector — preselect a Disney+Hulu bundle card</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="client-side-hooks">Client-Side Spearmint Hooks</h2>
      <p>
        Some Hulu experiments never touch Flex — they resolve entirely in the
        browser from the cookie, through the data interface:
      </p>
      <CodeBlock
        code={`// cgi-web — packages/cgi/data-interface-hulu/src/experimentation/experimentation-data-interface.ts
export const getExperimentationDataInterface = (): Pick<DATA_INTERFACE, 'getExperimentAssignments'> => ({
  getExperimentAssignments: () => Promise.resolve(extractSpearmintExperiments()),
});

// packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-experiment.ts (core)
export function useSpearmintExperiment<T>({ experimentCtx, observabilityCtx, processVariant }) {
  const dataInterface = useAtomValue(dataInterfaceAtom);
  const [experimentState, setExperimentState] = useState(experimentCtx.defaultState);
  useEffect(() => {
    const fetchExperiments = async () => {
      const spearmintExperiments = await dataInterface.getExperimentAssignments();
      const variant = spearmintExperiments?.[experimentCtx.featureId];
      if (spearmintExperiments && variant !== undefined) {
        setExperimentState(processVariant(variant));
        datadogRum.setGlobalContextProperty(experimentCtx.featureId, {
          experimentFeatureID: experimentCtx.featureId,
          owner: observabilityCtx.owner,
          sourceComponent: observabilityCtx.sourceComponent,
          treatment: variant,
        });
      }
    };
    fetchExperiments();
  }, [dataInterface]);
  return experimentState;
}`}
        lang="typescript"
        filename="client-side Spearmint resolution"
      />
      <p>
        Note the observability side effect: every resolved assignment is
        written into <strong>Datadog RUM global context</strong> keyed by
        feature ID — this is what makes RUM dashboards segmentable by
        treatment (the same mechanism the team&apos;s experiment-monitoring
        dashboards rely on). Fetch failures emit{" "}
        <code>EXP SPEARMINT FETCH ERROR</code> RUM errors. Additional
        consumers: <code>datadog.tsx</code> (RUM context extraction) and{" "}
        <code>profiles-loading-redirects/hooks/use-experiment-assignments-query.tsx</code>.
      </p>

      <h2 id="copy-overrides">Copy-Override Experiments</h2>
      <p>
        The cleverest Spearmint mechanism needs no per-experiment code at all.
        Convention: a dictionary ships override keys named{" "}
        <code>{`{originalKey}__exp__{experimentName}__{variantId}`}</code>; the
        hook scans the loaded dictionary, matches the user&apos;s non-control
        assignments (prefix <code>sprmnt-great-copy-</code>), and builds a
        key→key override map:
      </p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-copy-overrides.ts:11-13
export const SPEARMINT_COPY_EXPERIMENT_PREFIX = 'sprmnt-great-copy-';
export const EXP_KEY_DELIMITER = '__exp__';
const CONTROL_VARIANT = 'control';

// use-copy-override-experiment.tsx:83-94 — merging both worlds
/**
 * ...WeaponX and Spearmint (Hulu) experimentation systems.
 * For Hulu: WeaponX overrides will be empty (SDK disabled), Spearmint overrides active.
 * For Disney+/ESPN: Spearmint overrides will be empty (no cookie), WeaponX overrides active.
 */
const spearmintOverrides = useSpearmintCopyOverrides();
return useMemo(
  () => ({ ...weaponXOverrides, ...spearmintOverrides }),
  [weaponXOverrides, spearmintOverrides]
);`}
        lang="typescript"
        filename="copy-override experiments"
      />
      <p>
        Guardrails worth knowing: assignments are cached module-level per
        data-interface identity (retry on transient failure via cache reset),
        and duplicate overrides of the same cypher key by two experiments emit
        the <code>SPEARMINT_COPY_OVERRIDE_DUPLICATE</code> observability error.
      </p>

      <h2 id="why-no-weaponx">Why WeaponX/Mystique Is Inert for Hulu</h2>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/hooks/use-mystique-feature-flags.ts:18-53 (excerpt)
export function useMystiqueFeatureFlags() {
  const { sdkSession, isEnabled: isSDKEnabled, isReady } = useSDKSession();
  return useQuery({
    queryFn: async () => {
      if (isSDKEnabled && sdkSession) {
        return sdkSession.getFeatureFlags();
      }
      // Set flags here as you would for prod and override when developing locally...
      return {
        'wpnx-web-commerce-gift-card': true,
        'wpnx-web-commerce-membership-pause': true,
        'wpnx-web-commerce-unblocking': true,
        'wpnx-web-identity-account-home-header-dd': HEADER_VARIANT.Logout,
        'wpnx-web-identity-useLoggedInDataInterface': true,
        // Country-gates the student verification flow; hardcoded true here because
        // Hulu is US-only and does not use the SDK or WeaponX
        'wpnx-student-verification': true,
      };
    },
    enabled: isReady,
  });
}`}
        lang="typescript"
        filename="use-mystique-feature-flags.ts"
      />
      <p>
        The causal chain: Hulu&apos;s layout never boots the BAM SDK (no{" "}
        <code>isSDKEnabled</code> wiring anywhere in{" "}
        <code>apps/commerce/hulu/src</code>) → <code>sdkSession</code> is
        absent → the hook returns the <strong>hardcoded fallback object</strong>.
        For Hulu, those <code>wpnx-</code> values are effectively compile-time
        constants, not experiments.{" "}
        <em>[ASSUMPTION: the runtime consequence is inferred from the code
        comment plus the absent hydration — no explicit{" "}
        <code>if (brand === hulu)</code> exists.]</em> Corollary: a WeaponX
        experiment can never reach Hulu web users through Mystique — if a
        ticket wants a Hulu web split, it is Spearmint or nothing.
      </p>

      <h2 id="see-an-example">How to See a Real Example</h2>
      <p>Concrete places to look, in order of usefulness:</p>
      <ul>
        <li>
          <strong>Registry + variants:</strong>{" "}
          <code>src/lib/experiments/registry.ts:432-489,721</code> and{" "}
          <code>variants.ts:333-375,383,542</code> in Flex — each entry&apos;s
          JSDoc links the Spearmint dashboard (prod + staging) and names the
          product owner.
        </li>
        <li>
          <strong>A full consumption chain:</strong>{" "}
          <code>SwitchBilling</code> → detection in{" "}
          <code>src/domain/screen/account/changePayment/experiments/buildLegalFooterNotice.ts</code>{" "}
          → the <code>cancel-anytime</code> variant exposes the legal footer
          via template-config dataKey{" "}
          <code>cancelAnytimeLegalFooterNoticeCopy</code> (per the variants.ts
          JSDoc).
        </li>
        <li>
          <strong>Force it locally:</strong> hand-craft the header (next
          module has the full curl recipe):
        </li>
      </ul>
      <CodeBlock
        code={`# Build a Spearmint assignments header for local Flex testing
PAYLOAD='{"v1":[{"e":1,"t":2,"n":"sprmnt-GREAT-plan-select-card-order--duo-first"}]}'
B64=$(printf '%s' "$PAYLOAD" | base64)

curl 'http://localhost:3200/screens/v1/landing/plans' \\
  -H "x-bamtech-partner: hulu" \\
  -H "x-bamtech-location-country-code: US" \\
  -H "x-bamtech-spearmint-assignments: $B64" \\
  # ... other required headers`}
        lang="bash"
        filename="force a Spearmint variant locally"
      />
      <p>
        This works because the middleware decodes whatever the header carries —
        the format is exactly the <code>{`{v1:[{e,t,n}]}`}</code> wire shape
        from <code>treatment.ts:18-26</code>.
      </p>

      <h2 id="testing">Testing Hulu Experiments</h2>
      <p>
        Identical to WeaponX experiments — that is the payoff of
        normalization. Per <code>EXPERIMENTATION.md</code>: never hardcode
        feature/variant strings; import from registry/variants and
        destructure:
      </p>
      <CodeBlock
        code={`import { PlanSelectCardOrder } from '!lib/experiments';
import { PlanSelectCardOrderTreatments } from '!lib/experiments/variants';

const [, DUO_FIRST, DUO_FIRST_HULU_LAST, NO_HULU] = PlanSelectCardOrderTreatments;

it('orders duo first when in duo-first treatment', async () => {
  const flexContext = createMockFlexContext({
    experimentation: {
      experiments: {
        [PlanSelectCardOrder]: { variant_id: DUO_FIRST, version: 1 },
      },
    },
  });
  // ... assert card order in the built screen
});`}
        lang="typescript"
        filename="service-level experiment test (Flex)"
      />
      <p>
        Note <code>createMockFlexContext({`{ experimentation }`})</code> takes
        the <em>normalized</em> WeaponX shape — you never mock Spearmint wire
        format in service tests. Unit tests for detection helpers mock{" "}
        <code>getExperimentTreatment</code> via{" "}
        <code>jest.mock(&apos;!lib/experiments&apos;)</code>. For lifecycle
        work (initialize/cleanup/productionalize), <code>EXPERIMENTATION.md</code>{" "}
        in the Flex repo is the canonical playbook — including the
        template-config variant mechanism (<code>experimentFeatureIds</code>,{" "}
        <code>templates</code>/<code>templatesV2</code> keyed by variant_id)
        and the first-match-wins limitation when multiple experiments share a
        screen.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How does A/B testing work for Hulu?"`}
        intro={
          <>
            The strong answer is the transport chain plus the normalization
            insight — and it never confuses Spearmint with LaunchDarkly-style
            flags.
          </>
        }
        steps={[
          "Name the platform: Hulu experiments run on Spearmint (sprmnt- prefix, spearmint.prod.hulu.com), not WeaponX — because Hulu never boots the BAM SDK, Mystique flags degrade to hardcoded fallbacks.",
          "Walk the transport: Spearmint assigns → _hulu_assignments cookie (base64 {v1:[{e,t,n:'featureId--variantId'}]}) → client parses it for hooks/RUM tagging, and the same payload reaches Flex as x-bamtech-spearmint-assignments.",
          "Deliver the punchline: Flex middleware normalizes Spearmint into WeaponX's {experiments:{id:{variant_id,version}}} shape, so getExperimentTreatment works identically for both platforms — WeaponX header preferred, Spearmint fallback.",
          "Prove currency: name real experiments — plan-select-card-order (duo-first/no-hulu variants), switch-billing cancel-anytime footer, duo-upsell-billing copy variants, cancel-save-header.",
          "Show the client-only lane: useSpearmintExperiment resolves from the cookie without Flex, tags Datadog RUM per feature ID, and copy experiments use the {key}__exp__{experiment}__{variant} dictionary convention with zero per-experiment code.",
          "Close with QA: assignments are just headers/cookies, so you can force any variant locally by base64-encoding the wire payload.",
        ]}
      />

      <h2 id="challenge">Challenge: Ship a Hulu Experiment</h2>
      <InterviewChallenge
        title="Design the wiring for a new cancel-flow experiment"
        scenario={
          <>
            Product wants a 3-arm Hulu experiment on the cancel landing
            screen: <code>control</code>, a variant with a{" "}
            <strong>discount-offer banner</strong> (needs the user&apos;s
            current price from their agreement), and a variant that only{" "}
            <strong>swaps the headline copy</strong>. It must be invisible to
            Disney+/ESPN, and analysts need treatment segmentation in both
            HITS-adjacent dashboards and Datadog RUM.
          </>
        }
        tasks={[
          "Choose the platform and justify it in one sentence.",
          "Specify the Flex-side wiring: registry, variants, and where each arm's logic lives (template config vs service code) — and why they differ.",
          "Explain how RUM treatment segmentation gets populated for this experiment.",
          "Describe your local QA plan for all three arms without waiting for Spearmint staging assignments.",
        ]}
        pitfalls={[
          "Choosing WeaponX — it cannot reach Hulu web users (SDK never boots).",
          "Putting the price-dependent banner in template config — runtime data (agreement price, currency variables) requires service code per EXPERIMENTATION.md.",
          "Forgetting the undefined treatment case — unassigned users must get control behavior, not an error.",
          "Testing by mocking getOffers/wrappers instead of the GLO client, or hardcoding variant strings in tests.",
        ]}
        signal="A strong answer splits the arms correctly across template-config vs service code and can QA all arms with hand-built headers."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Platform:</strong> Spearmint — the only system that assigns
          Hulu web users; register{" "}
          <code>sprmnt-GREAT-cancel-discount-banner</code> in{" "}
          <code>registry.ts</code> with JSDoc (dev, dashboard links prod+
          staging, product owner) and{" "}
          <code>[&apos;control&apos;,&apos;discount-banner&apos;,&apos;headline-copy&apos;]
          as const</code> in <code>variants.ts</code>.
        </p>
        <p>
          <strong>Arm placement:</strong> headline-copy arm = template config
          (static cypher-key swap via <code>experimentFeatureIds</code> +
          variant entry in <code>templates</code>, dataKey overlay) —
          template config handles static copy. Discount-banner arm = service
          code in{" "}
          <code>domain/screen/account/cancel/experiments/</code>: a detection
          helper (<code>getExperimentTreatment === &apos;discount-banner&apos;</code>,
          undefined-safe) plus a builder using{" "}
          <code>toCurrencyVariable(agreement price)</code> — runtime data
          cannot live in config. Resolve once into the screen&apos;s
          FeatureSet boolean; pass to section + metrics builders. TODO-tag
          every touchpoint with the cleanup ticket.
        </p>
        <p>
          <strong>RUM segmentation:</strong> server-side arms are stamped into
          metricsData by the metricsDataBuilder (per EXPERIMENTATION.md);
          client-side, if any banner logic renders via the Spearmint hooks,{" "}
          <code>useSpearmintExperiment</code> tags{" "}
          <code>datadogRum.setGlobalContextProperty(featureId, ...)</code>{" "}
          automatically — dashboards segment on that property.
        </p>
        <p>
          <strong>Local QA:</strong> base64 the wire payload per arm
          (<code>{`{"v1":[{"e":1,"t":N,"n":"sprmnt-GREAT-cancel-discount-banner--<variant>"}]}`}</code>)
          and curl the cancel screen with{" "}
          <code>x-bamtech-partner: hulu</code> +{" "}
          <code>x-bamtech-spearmint-assignments</code>; assert the banner /
          headline / control differences in the JSON. Service tests inject the
          normalized shape via{" "}
          <code>createMockFlexContext({`{ experimentation }`})</code> with
          destructured variant constants.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu = Spearmint (<code>sprmnt-</code>); D+/ESPN = WeaponX
          (<code>wpnx-</code>); one detection API because Flex middleware
          normalizes Spearmint into WeaponX&apos;s shape (WeaponX header
          preferred, Spearmint fallback).
        </li>
        <li>
          Transport: <code>_hulu_assignments</code> cookie, base64{" "}
          <code>{`{v1:[{e,t,n:'featureId--variantId'}]}`}</code>; client
          parses it directly; Flex receives it as{" "}
          <code>x-bamtech-spearmint-assignments</code>{" "}
          <em>[Edge translation = tagged assumption]</em>.
        </li>
        <li>
          Five live <code>sprmnt-GREAT-*</code> experiments: plan-select card
          order, switch-billing cancel-anytime, duo-upsell billing copy,
          post-SUF addon bypass, cancel-save header.
        </li>
        <li>
          Client-only lane: <code>useSpearmintExperiment</code> (+ RUM
          tagging) and the{" "}
          <code>{`{key}__exp__{experiment}__{variant}`}</code> copy-override
          convention — zero per-experiment code for copy tests.
        </li>
        <li>
          Mystique/WeaponX is inert for Hulu (SDK never boots → hardcoded
          fallback flags); a Hulu web split is Spearmint or nothing.
        </li>
        <li>
          QA lever: assignments are just base64 payloads — force any variant
          with a hand-built header; test with normalized shapes and
          destructured variant constants, never hardcoded strings.
        </li>
      </ul>
    </div>
  );
}
