import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const contextBuildDiagram = String.raw`flowchart TD
  HDR["standardHeaders (parsed x-bamtech-*)"]
  HDR --> RC["regionConfigurationHandler<br/>→ RegionConfiguration"]
  HDR --> DC["deviceContextHandler<br/>→ DeviceContext + capabilities"]
  HDR --> SA["sessionAccessHandler<br/>→ SessionAccess + isAuthenticated"]
  HDR --> EXP["experimentation<br/>→ WeaponXExperiment"]
  RC --> FX["flexContext"]
  DC --> FX
  SA --> FX
  EXP --> FX`;

const regionMapDiagram = String.raw`flowchart LR
  CC["locationCountryCode"] --> MAP["REGION_EXPERIENCE_MAP[cc]"]
  MAP -->|found| RC["RegionConfiguration<br/>{ countryCode, regionExperience, isStarRegion }"]
  MAP -->|not found| UNK["UNKNOWN → DEFAULT experience"]
  RC --> USE["services branch on regionExperience:<br/>DEFAULT | LATAM | EMEA | APAC"]`;

const eligibilityDiagram = String.raw`flowchart TD
  IN["FlexContext + offers/agreement"]
  IN --> RULES["eligibilityRules<br/>(isUSUser, country checks…)"]
  RULES --> FLAG["+ LaunchDarkly flag<br/>(getIsGiftCardEligibleByCountry)"]
  FLAG --> SVC["flexEligibilityService<br/>getFlexEligibility / checkFlexGiftCardElibility"]
  SVC --> OUT["eligible? → show/hide UI"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Context Is Where Business Rules Start", level: 2 },
  { id: "building", title: "How the Sub-Objects Get Built", level: 2 },
  { id: "region", title: "RegionConfiguration & the Experience Map", level: 2 },
  { id: "region-use", title: "Why regionExperience Drives So Much", level: 3 },
  { id: "device-session", title: "DeviceContext & SessionAccess", level: 2 },
  { id: "eligibility", title: "The Eligibility Domain", level: 2 },
  { id: "eligibility-rules", title: "Rules + Flags + Service", level: 3 },
  { id: "redirects", title: "Redirects & Proxy", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Gate a Feature by Region", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ContextRegionAndEligibility() {
  return (
    <div className="article-content">
      <p>
        Module 2 introduced <code>FlexContext</code> as &quot;the request world&quot; and listed its
        fields. But <code>regionConfig</code>, <code>device</code>, and <code>sessionAccess</code>{" "}
        aren&apos;t just data — they&apos;re the <em>inputs to most business rules</em> in the service.
        Which offer is eligible, which experience a region gets, whether a screen is authenticated,
        whether a gift card can be redeemed — all keyed off these. This module goes below the surface
        of those sub-objects and into the eligibility domain that consumes them.
      </p>

      <h2 id="why">Context Is Where Business Rules Start</h2>
      <p>
        A screen service&apos;s &quot;business decisions&quot; step (step 2 of the five-step shape)
        almost always branches on context: <code>if (regionConfig.regionExperience === 'LATAM')</code>,{" "}
        <code>if (isAuthenticated)</code>, <code>if (device supports X)</code>. So understanding how
        these are built — and their exact shapes — is what lets you write correct region- and
        auth-aware logic instead of guessing.
      </p>

      <h2 id="building">How the Sub-Objects Get Built</h2>
      <p>
        Recall the middleware chain from module 2: after <code>requestHeaders</code> parses the raw
        headers into <code>standardHeaders</code>, a series of dedicated handlers each build one
        sub-object onto <code>ctx.state</code>, and <code>flexContext</code> composes them.
      </p>
      <MermaidDiagram
        chart={contextBuildDiagram}
        title="Each handler builds one piece of FlexContext"
        caption="regionConfigurationHandler, deviceContextHandler, sessionAccessHandler, and experimentation each derive one sub-object from the parsed headers; flexContext composes them."
        minHeight={400}
      />

      <h2 id="region">RegionConfiguration &amp; the Experience Map</h2>
      <p>
        <code>RegionConfiguration</code> is small but load-bearing. It&apos;s derived purely from the
        request&apos;s country code via a static map — <code>createRegionConfiguration</code> looks up{" "}
        <code>REGION_EXPERIENCE_MAP[locationCountryCode]</code>, falling back to <code>UNKNOWN</code>.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/middlewares/models/RegionConfiguration.ts"
        code={`export type RegionExperience = 'DEFAULT' | 'LATAM' | 'EMEA' | 'APAC';

export type RegionConfiguration = {
  countryCode: string | undefined;
  regionExperience: RegionExperience;
  isStarRegion: boolean;
};

export const REGION_EXPERIENCE_MAP: Readonly<Record<string, RegionConfiguration>> = {
  UNKNOWN: { countryCode: undefined, regionExperience: 'DEFAULT', isStarRegion: false },
  US: { countryCode: 'US', regionExperience: 'DEFAULT', isStarRegion: false },
  CA: { countryCode: 'CA', regionExperience: 'EMEA', isStarRegion: false },
  AU: { countryCode: 'AU', regionExperience: 'EMEA', isStarRegion: false },
  NZ: { countryCode: 'NZ', regionExperience: 'EMEA', isStarRegion: false },
  GB: { countryCode: 'GB', regionExperience: 'EMEA', isStarRegion: false },
  // ...many more countries
};`}
      />
      <CodeBlock
        lang="typescript"
        filename="src/middlewares/RegionConfigurationCreator.ts"
        code={`export function createRegionConfiguration(
  standardHeaders: StandardHeaders
): RegionConfiguration {
  return (
    REGION_EXPERIENCE_MAP[standardHeaders?.locationCountryCode ?? ''] ??
    REGION_EXPERIENCE_MAP.UNKNOWN
  );
}`}
      />

      <h3 id="region-use">Why regionExperience Drives So Much</h3>
      <p>
        Notice something surprising in the map: <strong>AU and NZ map to <code>EMEA</code></strong>,
        not <code>APAC</code>. <code>regionExperience</code> is a <em>business grouping</em>, not a
        geographic one — it clusters countries that should get the same commerce experience. That is
        exactly why so much service logic branches on <code>regionExperience</code> rather than raw
        country: a rule written for &quot;EMEA&quot; automatically covers CA, AU, NZ, GB, and the
        European countries. Miss this and you&apos;ll write a country-by-country check that&apos;s
        both verbose and wrong when a new country joins a region. <code>isStarRegion</code> is a
        second axis for Star-branded markets.
      </p>

      <h2 id="device-session">DeviceContext &amp; SessionAccess</h2>
      <p>
        The other two sub-objects gate device- and auth-specific behavior.
      </p>
      <ArticleTable
        caption="The remaining FlexContext sub-objects and what they gate."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Sub-object</th><th>Built by</th><th>Gates</th></tr>
          </thead>
          <tbody>
            <tr><td><code>DeviceContext</code> / <code>DeviceCapabilities</code></td><td><code>deviceContextHandler</code> using <code>DeviceContext.ts</code> and the device-capabilities parser</td><td>Device family/platform-specific UI &amp; capability checks</td></tr>
            <tr><td><code>SessionAccess</code> + <code>isAuthenticated</code></td><td><code>sessionAccessHandler</code></td><td>Authenticated vs unauthenticated screen variants</td></tr>
            <tr><td><code>experimentation</code></td><td><code>experimentation</code> middleware</td><td>Experiment treatments (module 13)</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The <code>isAuthenticated</code> flag is the reason screens like cancel have both authenticated
        and <em>unauthenticated</em> variants (you saw <code>unauthenticatedCancelService</code> in the
        cancel folder). Branch on it rather than re-deriving auth from raw headers.
      </p>

      <h2 id="eligibility">The Eligibility Domain</h2>
      <p>
        <code>src/domain/eligibility/</code> is where context turns into &quot;can this user do/see
        this?&quot; decisions. It combines context, backend data, and feature flags into eligibility
        answers that screens use to show or hide functionality (gift cards are the prominent example).
      </p>
      <MermaidDiagram
        chart={eligibilityDiagram}
        title="Eligibility = context + data + flags"
        caption="Pure rules (eligibilityRules) combine with a LaunchDarkly flag and backend data in flexEligibilityService to answer 'is this eligible?'."
        minHeight={400}
      />

      <h3 id="eligibility-rules">Rules + Flags + Service</h3>
      <p>
        The domain separates <strong>pure rules</strong> from the <strong>orchestrating
        service</strong>. <code>eligibilityRules.ts</code> holds predicates like{" "}
        <code>isUSUser(...)</code> (country-code checks against <code>USRegionCodes</code>) and{" "}
        <code>isUserCountryEligibleForGiftCard(...)</code> which also consults a LaunchDarkly flag.{" "}
        <code>flexEligibilityService.ts</code> exposes the higher-level{" "}
        <code>getFlexEligibility()</code> and the existing gift-card helper{" "}
        <code>checkFlexGiftCardElibility()</code> (note the historical misspelling in the function
        name).
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/domain/eligibility/eligibilityRules.ts (excerpt)"
        code={`export function isUSUser({ allow, locationCountryCode, eligibleCountries }: {
  allow: boolean;
  locationCountryCode?: string;
  eligibleCountries?: string[];
}): boolean {
  const hasUSLocationCode =
    locationCountryCode && USRegionCodes.includes(locationCountryCode);
  return allow && /* ...country logic... */;
}

// Combines a country rule WITH a LaunchDarkly flag:
export async function isUserCountryEligibleForGiftCard({
  allow, flexContext, locationCountryCode, eligibleCountries,
}): Promise<boolean> {
  // getIsGiftCardEligibleByCountry(flexContext) → LaunchDarkly,
  // falling back to isUSUser(...)
}`}
      />
      <p>
        This is the same layering principle from module 7: pure predicates are testable in isolation;
        the service orchestrates them with async flag lookups. Eligibility is just context + data +
        flags, composed in the domain layer — never inline in a screen service.
      </p>

      <h2 id="redirects">Redirects &amp; Proxy</h2>
      <p>
        Two adjacent context-driven behaviors round this out. The <code>redirectHandler</code>{" "}
        middleware lets a route send the client elsewhere based on state — you saw it in the device-
        reacquisition route, which contemplates redirecting an already-entitled user to home. And{" "}
        <code>src/routes/proxy/</code> simply forwards certain requests (e.g. orders) rather than
        rendering a screen. Both are decisions made from context before any screen is built.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does region/auth/eligibility drive behavior here?'"
        intro="Show that context sub-objects are business-rule inputs, and that regionExperience is a business grouping."
        steps={[
          "Explain that regionConfig/device/sessionAccess are built by dedicated handlers from standardHeaders and composed into FlexContext.",
          "Describe RegionConfiguration: derived from country via REGION_EXPERIENCE_MAP into a regionExperience (DEFAULT/LATAM/EMEA/APAC) + isStarRegion.",
          "Stress that regionExperience is a business grouping, not geography (AU/NZ → EMEA), so services branch on it, not raw country.",
          "Cover isAuthenticated gating authenticated vs unauthenticated screen variants, and device capabilities gating device-specific UI.",
          "Describe eligibility as pure rules (eligibilityRules) + LaunchDarkly flags composed in flexEligibilityService — context + data + flags, in the domain layer.",
        ]}
      />

      <h2 id="challenge">Challenge: Gate a Feature by Region</h2>
      <InterviewChallenge
        title="Show a promo only in EMEA, authenticated users, where eligible"
        scenario={
          <>
            Product wants a promo banner shown only to <em>authenticated</em> users in the{" "}
            <em>EMEA</em> experience who are <em>eligible</em> per an existing eligibility rule. A
            colleague writes <code>if (countryCode === 'GB' || countryCode === 'DE') ...</code> and
            reads auth from a raw header. Critique it and give the correct, context-driven version.
          </>
        }
        tasks={[
          "Fix the region check to use regionExperience instead of enumerating countries, and explain why.",
          "Fix the auth check to use FlexContext instead of a raw header.",
          "Show how the eligibility decision is obtained (rules/service, possibly async) and combined.",
          "State where this combined decision belongs and how it reaches the UI builder (hint: FeatureSet).",
        ]}
        pitfalls={[
          "Enumerating countries instead of branching on regionExperience (breaks when a country joins EMEA).",
          "Re-deriving auth from raw headers instead of flexContext.isAuthenticated.",
          "Inlining eligibility logic instead of using the eligibility domain.",
          "Computing the gate inside a builder instead of resolving once and passing via FeatureSet.",
        ]}
        signal="A strong answer branches on regionExperience === 'EMEA', uses flexContext.isAuthenticated, calls the eligibility service, combines them once, and threads the boolean through FeatureSet."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          lang="typescript"
          code={`const { regionConfig, isAuthenticated } = flexContext;

// Region: branch on the business grouping, not a country list.
const inEmea = regionConfig.regionExperience === 'EMEA';

// Eligibility: use the domain service (may be async — resolve in Promise.all).
const [eligible] = await Promise.all([
  checkFlexGiftCardElibility(flexContext),
]);

// Combine ONCE, store in FeatureSet, pass to builders.
const featureSet: MyScreenFeatureSet = {
  showPromoBanner: inEmea && isAuthenticated && eligible,
};

const banner = featureSet.showPromoBanner ? buildPromoBanner(flexContext) : undefined;`}
        />
        <p>
          The country-list check is both verbose and fragile: the moment a new country is added to
          EMEA in <code>REGION_EXPERIENCE_MAP</code>, the enumerated check silently excludes it.
          Branching on <code>regionConfig.regionExperience === 'EMEA'</code> automatically covers every
          EMEA country. Auth comes from <code>flexContext.isAuthenticated</code> — already derived by{" "}
          <code>sessionAccessHandler</code> — not a re-read of a raw header. Eligibility comes from the
          eligibility domain (often async, so fold it into the service&apos;s <code>Promise.all</code>).
          Combine the three into one boolean, store it in the screen&apos;s FeatureSet, and let the
          builder branch on the flag — the same resolve-once-pass-everywhere pattern from experiments.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Context sub-objects are business-rule inputs</strong>, not just data — most service
          decisions branch on region/auth/device.
        </li>
        <li>
          <strong><code>RegionConfiguration</code></strong> maps country →{" "}
          <code>regionExperience</code> (DEFAULT/LATAM/EMEA/APAC) + <code>isStarRegion</code> via{" "}
          <code>REGION_EXPERIENCE_MAP</code>.
        </li>
        <li>
          <strong><code>regionExperience</code> is a business grouping, not geography</strong>{" "}
          (AU/NZ → EMEA) — branch on it, never enumerate countries.
        </li>
        <li>
          <strong><code>isAuthenticated</code></strong> drives authenticated vs unauthenticated
          screen variants; device capabilities gate device-specific UI.
        </li>
        <li>
          <strong>Eligibility = context + data + flags</strong>, composed in{" "}
          <code>domain/eligibility</code> (pure <code>eligibilityRules</code> +{" "}
          <code>flexEligibilityService</code>), never inline. Some existing APIs preserve historical
          naming typos, like <code>checkFlexGiftCardElibility</code>.
        </li>
        <li>
          <strong>Redirects and proxy</strong> are context-driven decisions made before a screen is
          built.
        </li>
      </ul>
    </div>
  );
}
