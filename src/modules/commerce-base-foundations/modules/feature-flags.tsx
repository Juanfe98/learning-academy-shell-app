import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoFlagsDiagram = String.raw`flowchart TD
  subgraph mystique["Mystique flags (dynamic)"]
    SDK["SDK session<br/>getFeatureFlags()"]
    MYS["useMystiqueFeatureFlags()"]
  end
  subgraph commerce["Commerce config flags (static)"]
    CFG["commerceAppConfig<br/>countries[region].featureFlags"]
    CFF["useCommerceFeatureFlag()"]
  end
  SDK --> MYS
  CFG --> CFF
  MYS --> A["dynamic gating, experiments"]
  CFF --> B["region-scoped static config"]`;

const inheritanceDiagram = String.raw`flowchart TD
  READ["useCommerceRegionFeatureFlags(region)"]
  READ --> ISTERR{"is region a<br/>territory?"}
  ISTERR -->|"no"| OWN["return region's own featureFlags"]
  ISTERR -->|"yes + inherit"| CLONE["deep-clone parentCountry.featureFlags"]
  CLONE --> OVERLAY["overlay territory overrides"]
  OVERLAY --> RESULT["merged flags"]`;

const gateDiagram = String.raw`flowchart LR
  LFF["<LocalizedFeatureFlag featureName filter>"]
  LFF --> VAL["useCommerceFeatureFlag(featureName)"]
  VAL --> HASFILTER{"filter provided?"}
  HASFILTER -->|"no"| TRUTHY{"value truthy?"}
  HASFILTER -->|"yes"| FILT{"filter(value) truthy?"}
  TRUTHY -->|"yes"| SHOW["render children"]
  TRUTHY -->|"no"| HIDE["render null"]
  FILT -->|"yes"| SHOW
  FILT -->|"no"| HIDE`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "two-kinds", title: "Two Kinds of Flags", level: 2 },
  { id: "mystique", title: "Mystique Flags", level: 2 },
  { id: "atoms", title: "The Flag Atom and Typed Keys", level: 2 },
  { id: "commerce-flags", title: "Commerce Config Flags", level: 2 },
  { id: "inheritance", title: "Territory Inheritance", level: 3 },
  { id: "localized-component", title: "The LocalizedFeatureFlag Gate", level: 2 },
  { id: "choosing", title: "Choosing the Right Flag Mechanism", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Region-Gate a New Banner", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function FeatureFlags() {
  return (
    <div className="article-content">
      <p>
        &quot;Feature flag&quot; means two different things in this codebase, and using the wrong one
        produces bugs that are maddening to trace. This module untangles them: the{" "}
        <strong>Mystique</strong> flags (dynamic, SDK-driven, the substrate for experiments) and the{" "}
        <strong>commerce config</strong> flags (static, per-region, driven by remote app config). The
        experiments module goes deep on the WeaponX side; here we focus on the plumbing shared by
        both and the region-scoped config system with its territory-inheritance rule.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        You will constantly ask &quot;is this feature on for this user?&quot; The answer depends
        entirely on <em>which flag system</em> owns the feature. A Mystique flag can differ per user
        and change without a deploy; a commerce config flag is the same for everyone in a region
        until the remote config changes. Knowing which you&apos;re dealing with tells you where to
        look, how to test it, and whether &quot;it works on my machine&quot; is even meaningful.
      </p>

      <h2 id="two-kinds">Two Kinds of Flags</h2>
      <MermaidDiagram
        chart={twoFlagsDiagram}
        title="Mystique vs commerce config flags"
        caption="Mystique flags are dynamic and per-user (from the SDK session); commerce config flags are static per-region (from the app config). Different source, different lifecycle, different read hook."
        minHeight={360}
      />
      <ArticleTable
        caption="The two flag systems at a glance."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Mystique flags</th>
              <th>Commerce config flags</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Source</td>
              <td>SDK session (<code>getFeatureFlags()</code>)</td>
              <td><code>commerceAppConfig</code> countries map</td>
            </tr>
            <tr>
              <td>Granularity</td>
              <td>Per user / per experiment assignment</td>
              <td>Per region / territory</td>
            </tr>
            <tr>
              <td>Changes without deploy?</td>
              <td>Yes (remote assignment)</td>
              <td>Yes (remote config), but same for all in region</td>
            </tr>
            <tr>
              <td>Read via</td>
              <td><code>useMystiqueFeatureFlags()</code></td>
              <td><code>useCommerceFeatureFlag()</code></td>
            </tr>
            <tr>
              <td>Typical use</td>
              <td>Experiments, dynamic rollout</td>
              <td>Region availability, static config</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="mystique">Mystique Flags</h2>
      <p>
        The Mystique read hook is <code>common/hooks/use-mystique-feature-flags.ts</code>. It wraps
        react-query around <code>sdkSession.getFeatureFlags()</code> — and importantly there is{" "}
        <strong>no network call</strong>; the SDK serves values cached at bootstrap. When the SDK is
        disabled (Hulu is US-only and doesn&apos;t use WeaponX), a hardcoded fallback object is
        returned instead.
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
      return { 'wpnx-web-commerce-gift-card': true /* ...hardcoded fallback... */ };
    },
    enabled: isReady,
    meta: { errorMessage: 'Failed to retrieve SDK feature flags.', owner: Owners.CORE },
    useErrorBoundary: false,
  });
}`}
      />
      <p>
        Two teaching points. First, <code>useErrorBoundary: false</code> — a flag fetch failure must
        never blow up the page; the UI should degrade to defaults. Second, all keys are prefixed{" "}
        <code>wpnx-</code> and the value type is broad, so any consumer narrows it (a boolean, a
        treatment string, or an object — see the experiments module).
      </p>

      <h2 id="atoms">The Flag Atom and Typed Keys</h2>
      <p>
        There is also a Jotai atom for flags, <code>common/atoms/feature-flag.ts</code>, which types
        the known keys literally — splitting commerce flags from Mystique flags and pinning the
        allowed values:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/atoms/feature-flag.ts"
        code={`export const featureFlagsAtom = atom<IdentityFeatureFlags | undefined>(
  // eslint-disable-next-line unicorn/no-useless-undefined
  undefined,
);

// The IdentityFeatureFlags type pins mystique keys and their allowed values, e.g.:
//   'wpnx-web-identity-edna-activations'?: boolean;
//   'wpnx-web-identity-email-confirmation'?: 'default' | 'modal' | 'OTP';`}
      />
      <p>
        Note the runtime path for Mystique experiment flags is the react-query hook (
        <code>useMystiqueFeatureFlags()</code>), which reads the SDK cache — not this atom. The atom
        exists for typed identity flags and default values; don&apos;t assume writing it changes what
        experiments read.
      </p>

      <h2 id="commerce-flags">Commerce Config Flags</h2>
      <p>
        Commerce config flags come from <code>commerceAppConfig</code> — the per-brand config loaded
        server-side (from Sparrow remote config) and hydrated into an atom. Flags live under a
        per-country map. You read one with <code>useCommerceFeatureFlag&lt;T&gt;</code> (
        <code>common/components/localized/feature-flag/hooks/use-commerce-feature-flag.tsx</code>), a
        thin selector that returns <code>flagValue ?? fallbackValue</code> for the current (or a
        passed) region.
      </p>

      <h3 id="inheritance">Territory Inheritance</h3>
      <p>
        The subtle part: <strong>a territory inherits its parent country&apos;s flags, then applies
        its own overrides.</strong> From{" "}
        <code>use-commerce-region-feature-flags.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="use-commerce-region-feature-flags.tsx"
        code={`const parentCountry = commerceAppConfigCountries[region]?.parentCountry;
const isTerritory = parentCountry !== undefined;
if (!isTerritory || !shouldInheritFromParent) {
  return commerceAppConfigCountries[region]?.featureFlags ?? {};
}
// Deep-clone the parent's flags, then overlay territory-specific overrides
const territoryFlagsCopy = JSON.parse(
  JSON.stringify(commerceAppConfigCountries[parentCountry]?.featureFlags ?? {}),
);
// ... apply territory overrides ...`}
      />
      <MermaidDiagram
        chart={inheritanceDiagram}
        title="Territory flag inheritance"
        caption="A territory starts from a deep clone of its parent country's flags, then overlays its own overrides. This is why a flag can be 'on' in a territory purely because its parent has it on."
        minHeight={340}
      />
      <p>
        This is a common source of &quot;why is this on here?&quot; confusion: a territory can have a
        flag enabled without a config entry of its own, purely by inheriting the parent. The hook
        also fires a Datadog error if <code>regionAtom</code> changes mid-render, because a
        mid-render region flip would produce inconsistent flag reads.
      </p>

      <h2 id="localized-component">The LocalizedFeatureFlag Gate</h2>
      <p>
        The declarative way to region-gate UI is the <code>&lt;LocalizedFeatureFlag&gt;</code>{" "}
        component (note: <strong>not</strong> <code>FeatureFlag</code>). It reads a commerce config
        flag and renders children only if the flag is truthy — or if an optional{" "}
        <code>filter(value)</code> passes:
      </p>
      <CodeBlock
        lang="tsx"
        filename="common/components/localized/feature-flag/feature-flag.tsx"
        code={`export function LocalizedFeatureFlag({ children, featureName, filter }) {
  const currentFlagValue = useCommerceFeatureFlag<unknown>({ featureName, fallbackValue: null });
  if (!filter && currentFlagValue) return <>{children}</>;
  if (filter?.(currentFlagValue)) return <>{children}</>;
  return null;
}`}
      />
      <MermaidDiagram
        chart={gateDiagram}
        title="LocalizedFeatureFlag decision"
        caption="With no filter, truthy value → render. With a filter, filter(value) decides — useful for non-boolean config flags. This component reads commerce/region config flags, never wpnx-* experiments."
        minHeight={320}
      />

      <h2 id="choosing">Choosing the Right Flag Mechanism</h2>
      <ArticleTable
        caption="A decision guide for gating a feature."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>You want to…</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Run an A/B experiment with per-user assignment</td>
              <td>A hook in <code>common/hooks/experiments/</code> over <code>useMystiqueFeatureFlags()</code></td>
            </tr>
            <tr>
              <td>Enable a feature for specific regions/territories</td>
              <td><code>useCommerceFeatureFlag()</code> or <code>&lt;LocalizedFeatureFlag&gt;</code></td>
            </tr>
            <tr>
              <td>Dynamically roll out without a deploy, per user</td>
              <td>Mystique flag</td>
            </tr>
            <tr>
              <td>Static availability that&apos;s the same for everyone in a market</td>
              <td>Commerce config flag</td>
            </tr>
            <tr>
              <td>Gate JSX declaratively by a region config flag</td>
              <td><code>&lt;LocalizedFeatureFlag featureName filter&gt;</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do feature flags work in commerce-base?'"
        intro="Lead with the two systems, then the sources, then the territory-inheritance gotcha."
        steps={[
          "There are two flag systems: Mystique (dynamic, per-user, from the SDK session, wpnx-* keys, the substrate for experiments) and commerce config (static, per-region, from commerceAppConfig).",
          "Mystique flags are read via useMystiqueFeatureFlags() — react-query over the SDK cache, no network call, useErrorBoundary:false so failures degrade to defaults; Hulu uses hardcoded fallbacks.",
          "Commerce config flags are read via useCommerceFeatureFlag() / <LocalizedFeatureFlag>, keyed by region in the app config.",
          "Explain territory inheritance: a territory deep-clones its parent country's flags then overlays overrides — so a flag can be on without its own entry.",
          "Close with the gate component: LocalizedFeatureFlag renders children on a truthy config flag or a passing filter, and reads config flags, not experiments.",
        ]}
      />

      <h2 id="challenge">Challenge: Region-Gate a New Banner</h2>
      <InterviewChallenge
        title="Show a promotional banner only in Brazil and its territories"
        scenario={
          <>
            Product wants a promo banner shown only to users in Brazil (and any BR territories), with
            the ability to turn it off remotely without a deploy, the same for every user in the
            market. Decide which flag mechanism to use and how you&apos;d implement the gate.
          </>
        }
        tasks={[
          "Choose between a Mystique flag and a commerce config flag, and justify it against the requirements.",
          "Explain how territory inheritance affects whether BR territories automatically get the banner.",
          "Show how you'd gate the banner JSX declaratively.",
          "Describe how you'd test it for a BR user vs a US user given the SDK-off = US fallback.",
        ]}
        pitfalls={[
          "Reaching for a wpnx-* experiment flag when the requirement is static region availability, not an A/B test.",
          "Assuming a BR territory needs its own config entry when it may inherit from BR.",
          "Testing only with the SDK disabled, where everything looks like the US.",
        ]}
        signal="A strong answer picks a commerce config flag (static, per-region, remotely toggleable), gates with <LocalizedFeatureFlag>, notes that BR territories inherit BR's flag unless overridden, and tests by seeding the region/config in the provider wrapper rather than relying on the SDK-off US default."
      />
      <SolutionReveal difficulty="easy">
        <p>
          This is <strong>static region availability</strong>, the same for everyone in the market —
          not a per-user A/B test — so it&apos;s a <strong>commerce config flag</strong>, not a
          Mystique/<code>wpnx-*</code> flag. Add the flag to the BR entry in the per-country config;
          BR territories will inherit it automatically via <code>useCommerceRegionFeatureFlags</code>{" "}
          unless a territory overrides it.
        </p>
        <p>
          Gate the banner declaratively:
        </p>
        <CodeBlock
          lang="tsx"
          filename="usage"
          code={`<LocalizedFeatureFlag featureName="brPromoBanner">
  <PromoBanner />
</LocalizedFeatureFlag>`}
        />
        <p>
          Test it by seeding <code>region</code> and the config flag through the provider wrapper (
          <code>generateProviderWrapper({"{ region: 'BR', sparrowConfig: ... }"})</code>) rather than
          relying on the SDK — remember SDK-disabled defaults everything to the US, so a naive test
          would never exercise the BR path.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two flag systems.</strong> Mystique (dynamic, per-user, experiments) vs commerce
          config (static, per-region).
        </li>
        <li>
          <strong>Mystique = SDK cache.</strong> <code>useMystiqueFeatureFlags()</code> — no network
          call, degrades to defaults, Hulu hardcodes fallbacks.
        </li>
        <li>
          <strong>Config flags are region-keyed.</strong> Read via{" "}
          <code>useCommerceFeatureFlag()</code> / <code>&lt;LocalizedFeatureFlag&gt;</code>.
        </li>
        <li>
          <strong>Territories inherit.</strong> A territory clones its parent country&apos;s flags,
          then overlays overrides.
        </li>
        <li>
          <strong>LocalizedFeatureFlag gates config, not experiments.</strong> Truthy value or a
          passing <code>filter</code> renders children.
        </li>
      </ul>
    </div>
  );
}
