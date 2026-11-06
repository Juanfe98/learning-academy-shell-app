import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoSystemsDiagram = String.raw`flowchart LR
  subgraph WX["WeaponX / Mystique — experiments and rollouts"]
    direction TB
    W1["WeaponX console<br/>key: wpnx-add-on-step"] --> W2["BamTech browser SDK<br/>bootstrap / session init"] --> W3["SDK in-memory cache<br/>no network call on read"]
    W3 --> W4["useMystiqueFeatureFlags<br/>react-query, enabled on isReady"] --> W5["Consumer: experiment hook<br/>compares a variant string"]
  end
  subgraph SP["Sparrow commerce config — routes and markets"]
    direction TB
    S1["Sparrow workspace commerce-espn"] --> S2["S3 JSON, Referer header carries the key"] --> S3["loadSparrowConfig<br/>LRU max 40, TTL 5 min<br/>key = backendService"]
    S3 --> S4["getServerSideProps prop commerceAppConfig"] --> S5["commerceAppConfigAtom<br/>hydrated once per page load"]
    S5 --> S6["useCommerceFeatureFlag<br/>or feature-flags.general"] --> S7["Consumer: isRouteEnabled,<br/>LocalizedFeatureFlag, notFound"]
  end
  W5 --- N1["Tell: wpnx- prefix, kebab or mixed case"]
  S7 --- N2["Tell: camelCase, almost always enable-prefixed"]`;

const routeGateDiagram = String.raw`flowchart LR
  A["GET /commerce/plans on ESPN"] --> B["buildGetServerSideProps<br/>composition chain"]
  B --> C["isRouteEnabled with featureFlagName<br/>enableCommerceUnifiedPlans"]
  C --> D{"feature-flags.general<br/>value truthy?"}
  D -->|"true"| E["return empty object,<br/>pipeline continues to the page"]
  D -->|"falsy or key missing"| F["return notFound true"]
  F --> G["Next.js renders 404.<br/>No log. No error. No clue."]
  G --> H["First diagnostic question:<br/>is the flag camelCase?<br/>A wpnx- key can never gate a route."]`;

const undefinedTreatmentDiagram = String.raw`flowchart TD
  A["Experiment hook reads data of FEATURE_ID"] --> B{"Is data defined for this key?"}
  B -->|"No, path 1: SDK session not ready.<br/>Query is gated on enabled: isReady"| U["variant is undefined"]
  B -->|"No, path 2: SDK disabled.<br/>Hook returns a literal with only 6 keys"| U
  B -->|"No, path 3: user not enrolled.<br/>WeaponX omits the key entirely"| U
  B -->|"No, path 4: getFeatureFlags threw.<br/>useErrorBoundary false, degrades silently"| U
  B -->|"Yes"| V["variant is a string:<br/>control or add-on-step"]
  U --> C["Every strict equality comparison is false"]
  V --> D{"variant equals the expected treatment?"}
  D -->|"Yes"| T["Treatment renders"]
  D -->|"No, variant is control"| C
  C --> R["Renders CONTROL.<br/>Indistinguishable from a real control assignment."]`;

const flexResolutionDiagram = String.raw`flowchart TD
  A["cgi-web calls getFlexScreen<br/>for the ESPN paywall"] --> B["Flex decodes header<br/>x-bamtech-weaponx-assignments<br/>onto flexContext.experimentation"]
  B --> C["TemplateConfigClient.getConfig<br/>espn-paywall.json"] --> D["Read experimentFeatureIds:<br/>4 ESPN featureIds on ONE screen"]
  D --> E1["1. wpnx-great-ESPN-Plan-Order-via-ESPN-Entry"] --> F{"getVariant per featureId.<br/>First one that maps to a<br/>templates entry latches."}
  D --> E2["2. wpnx-ESPN-Plan-Select-Linear-Plan-Order"] --> F
  D --> E3["3. wpnx-ESPN-Generic-Entry-Plan-Order"] --> F
  D --> E4["4. wpnx-ESPN-Entry-Plan-Order"] --> F
  F -->|"match"| G["templates of variant gives<br/>templateId, dataSetId, dataKey"] --> I["dataKey selects one of the<br/>7 data blocks, e.g. linearSort<br/>sortPlanCards sortOrder"]
  F -->|"no match"| H["templates.control gives dataKey default"] --> I
  I --> J["fillTemplate emits a JSON screen.<br/>cgi-web renders it verbatim."]
  F -.->|"SILENTLY DROPPED: logger.warn only,<br/>Too many featureId and variantId matches"| K["The other 3 featureIds are ignored"]`;

const lifecycleDiagram = String.raw`stateDiagram-v2
  [*] --> Initialize
  Initialize --> Running : flag created in WeaponX, hook plus MSW handlers added
  Running --> Decide : enough exposure to read out
  Decide --> Productionalize : treatment wins
  Decide --> Cleanup : control wins
  Productionalize --> Cleanup : the wpnx conditional becomes a business rule
  Cleanup --> [*] : hook, enum, handlers, TODO and console flag deleted
  note right of Productionalize
    WeaponX allocates users, cgi-web only reads the allocation.
    Three legal end states: a Sparrow feature-flags.general flag,
    a per-country featureFlags entry, or unconditional code.
  end note`;

export const toc: TocItem[] = [
  { id: "two-flag-systems", title: "Two Flag Systems, Not One", level: 2 },
  { id: "telling-them-apart", title: "Telling Them Apart at a Glance", level: 3 },
  { id: "sparrow-remote-config", title: "Sparrow Remote Config", level: 2 },
  { id: "route-gating", title: "Route Gating: Flags That Make 404s", level: 2 },
  { id: "territory-inheritance", title: "Territory Flag Inheritance", level: 2 },
  { id: "experiments-cgi-web", title: "Experiments on the cgi-web Side", level: 2 },
  { id: "treatment-undefined", title: "The Treatment-Undefined Trap", level: 3 },
  { id: "experiments-flex", title: "Experiments on the Flex Side", level: 2 },
  { id: "platform-per-brand", title: "Which Platform Per Brand", level: 2 },
  { id: "productionalization", title: "Productionalization: The Full Lifecycle", level: 2 },
  { id: "partner-name", title: "The partnerName Subtlety", level: 2 },
  { id: "espn-inventory", title: "The ESPN Flag & Experiment Inventory", level: 2 },
  { id: "secrets", title: "Secrets an ESPN Build Needs", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "gotchas", title: "Gotchas & Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function FlagsAndExperimentsForEspn() {
  return (
    <div className="article-content">
      <p>
        You will be asked to launch an ESPN experiment, read it out, then clean it up. Every step has a
        specific way to go wrong, and none of them throw. ESPN commerce has{" "}
        <strong>two independent flag systems</strong> that look alike, plus a{" "}
        <strong>third experiment mechanism that lives in a different repository</strong>. Reading a flag
        from the wrong system is the most common mistake here — it does not error, it silently never
        takes effect.
      </p>

      <h2 id="two-flag-systems">Two Flag Systems, Not One</h2>
      <p>
        System one is <strong>WeaponX</strong> (internally <em>Mystique</em>), Disney&apos;s
        experimentation and rollout platform. Keys are prefixed <code>wpnx-</code> and arrive with the
        BamTech browser SDK at session bootstrap, read via{" "}
        <code>packages/cgi/commerce-base/src/common/hooks/use-mystique-feature-flags.ts</code>:
      </p>
      <CodeBlock
        code={`/** SDK pulls this data from internally cached values acquired during bootstrap/session
 *  initialization. There is no network call to fetch these feature flags. */
export function useMystiqueFeatureFlags() {
  const { sdkSession, isEnabled: isSDKEnabled, isReady } = useSDKSession();
  return useQuery({
    queryKey: ['getFeatureFlags'],
    queryFn: async () => {
      if (isSDKEnabled && sdkSession) return sdkSession.getFeatureFlags();
      // Set flags here as you would for prod and override when developing locally.
      return {                                 // <- SIX keys total. Everything else is undefined.
        'wpnx-web-commerce-gift-card': true,
        'wpnx-web-commerce-membership-pause': true,
        'wpnx-web-commerce-unblocking': true,
        // careful, this affects not just account home, but every page that uses SiteNavLinks
        'wpnx-web-identity-account-home-header-dd': HEADER_VARIANT.Logout,
        'wpnx-web-identity-useLoggedInDataInterface': true,
        // hardcoded true here because Hulu is US-only and does not use the SDK or WeaponX
        'wpnx-student-verification': true,
      };
    },
    enabled: isReady,
    meta: { errorMessage: 'Failed to retrieve SDK feature flags.', owner: Owners.CORE },
    useErrorBoundary: false,
  });
}`}
        lang="typescript"
        filename="use-mystique-feature-flags.ts"
      />
      <p>
        Three consequences. <strong>No network call means no refetch</strong> — a flag change needs a new
        session bootstrap, not a query invalidation. The query key is the bare string{" "}
        <code>getFeatureFlags</code>, so there is one global cache entry with no region or tenant in it.
        And <code>enabled: isReady</code> plus <code>useErrorBoundary: false</code> mean the data is{" "}
        <code>undefined</code> before the SDK settles and <em>stays</em> <code>undefined</code> if the
        call fails. The value type is deliberately wide: a <code>wpnx-*</code> flag can be a boolean, a
        variant string, a number, an array, or a nested object.
      </p>
      <p>
        System two is <strong>Sparrow</strong>, the commerce remote-config service. Keys are camelCase,
        global under <code>feature-flags.general</code> or per-country under{" "}
        <code>countries.&lt;REGION&gt;.&lt;COUNTRY&gt;.featureFlags</code>. They arrive as a server prop
        from <code>getServerSideProps</code>, never from the SDK, through a different hook (
        <code>.../localized/feature-flag/hooks/use-commerce-feature-flag.tsx</code>):
      </p>
      <CodeBlock
        code={`export function useCommerceFeatureFlag<T = unknown>({
  featureName, fallbackValue, region, shouldInheritFromParent = true,
}: { featureName: string; fallbackValue: T; region?: RegionSubtag; shouldInheritFromParent?: boolean }) {
  const commerceRegionFeatureFlags = useCommerceRegionFeatureFlags(region, shouldInheritFromParent);
  return (commerceRegionFeatureFlags[featureName] as T) ?? fallbackValue;  // explicit false wins
}`}
        lang="tsx"
        filename="use-commerce-feature-flag.tsx"
      />
      <p>
        Because of that <code>??</code>, an explicit <code>false</code> in config beats a{" "}
        <code>true</code> fallback. The render gate <code>LocalizedFeatureFlag</code> (
        <code>.../localized/feature-flag/feature-flag.tsx</code>) hardcodes{" "}
        <code>fallbackValue: null</code>, making it <strong>fail-closed</strong>.
      </p>
      <MermaidDiagram
        chart={twoSystemsDiagram}
        title="Two Flag Systems, End to End"
        caption="The two systems share no plumbing: different origin, cache, hook, consumer, and naming convention."
        minHeight={550}
      />

      <h3 id="telling-them-apart">Telling Them Apart at a Glance</h3>
      <p>
        The rule: <strong>prefix <code>wpnx-</code> means SDK; camelCase means config.</strong> Keep this
        card next to you the first few weeks — a flag that &quot;does nothing&quot; is almost always a
        flag read from, or set in, the wrong system:
      </p>
      <CodeBlock
        code={`wpnx-enable-legacy-analytics-espn -> WeaponX. useMystiqueFeatureFlags(). Flip in the WeaponX console.
wpnx-add-on-step                  -> WeaponX. Value is a VARIANT STRING, not a boolean.
wpnx-great-copy-*                 -> WeaponX. Value is an OBJECT of cypher key overrides. Prefix-matched.
wpnx-identity-consent-sync        -> WeaponX. Object-valued: read ?.enabled === true, never Boolean(...).
enableEspnInternalActivation      -> Sparrow. feature-flags.general. Flip in the Sparrow workspace.
enableCommerceUnifiedPlans        -> Sparrow. feature-flags.general. Gates a route -> silent 404.
enableCMP                         -> Sparrow. countries.NA.<CC>.featureFlags. Per-country, inheritable.

Casing is NOT normalized in WeaponX, and lookups are exact-match string keys against the SDK object.
All of these are real, live keys and must be typed character for character:
  wpnx-web-eu-withdrawal                  wpnx-GREAT-D
  wpnx-useWebPlaybackExperienceOverrides   wpnx-webMainApp-Nielsen
  wpnx-GREAT-Tax-Fields-on-PayPal-Form.   <- the trailing period is part of the name
  wpnx-wpnx-web-commerce-br-mp-typing     <- the doubled prefix is part of the name`}
        lang="text"
        filename="flag-system-cheatsheet.txt"
      />
      <ArticleTable caption="The comparison to hold in your head before touching either system." minWidth={980}>
        <table>
          <thead><tr><th>Dimension</th><th>WeaponX / Mystique</th><th>Sparrow commerce config</th></tr></thead>
          <tbody>
            <tr><td>Naming</td><td><code>wpnx-*</code>, kebab or mixed case, exact match</td><td>camelCase, almost always <code>enable*</code></td></tr>
            <tr><td>Read API</td><td><code>useMystiqueFeatureFlags().data?.[KEY]</code></td><td><code>useCommerceFeatureFlag()</code>, <code>commerceAppConfig[&apos;feature-flags&apos;].general</code></td></tr>
            <tr><td>Transport &amp; refresh</td><td>SDK bootstrap cache, no network call; change needs a new session</td><td>S3 JSON in <code>getServerSideProps</code>; 5-min server LRU, client refresh = navigation</td></tr>
            <tr><td>Value types</td><td><code>boolean | string | number | array | object</code></td><td>Mostly <code>boolean</code>, some objects and string arrays</td></tr>
            <tr><td>Missing value</td><td><code>undefined</code>; comparisons quietly go false</td><td><code>??</code> fallback; <code>LocalizedFeatureFlag</code> fails closed</td></tr>
            <tr><td>Market scoping</td><td>None in the key — WeaponX targets the audience</td><td>First class: per-country flags with territory inheritance</td></tr>
            <tr><td>Job &amp; typical failure</td><td>Experiments and rollouts &rarr; silent control render</td><td>Route gates and kill switches &rarr; silent 404</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="sparrow-remote-config">Sparrow Remote Config</h2>
      <p>
        A Sparrow <strong>workspace</strong> is the per-tenant config container, organised as scope &rarr;
        config &rarr; version &rarr; variant. ESPN commerce has four scopes: <code>feature-flags</code>,{" "}
        <code>feature-configuration</code>, <code>countries</code>, <code>paths</code>. The workspace name
        is <strong>derived from the product name</strong>, not configured (
        <code>packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts</code>):
      </p>
      <CodeBlock
        code={`export const sparrowCache = new LRU<string, CommerceAppConfig>({ max: 40, ttl: 300_000 /* 5 min */ });

const sparrowMergedConfig = await getSparrowMergedConfig<CommerceAppConfig>({
  ...sparrowRequestConfig,
  variant: backendService,                            // the ENV — and also the cache key
  workspace: \`commerce-\${productName.toLowerCase()}\`, // Commerce workspace names are always lowercase
});`}
        lang="typescript"
        filename="load-sparrow-config.ts"
      />
      <p>
        ESPN resolves to <strong><code>commerce-espn</code></strong>, merged document{" "}
        <code>combined_config</code>. The <code>.toLowerCase()</code> exists for Disney+ (
        <code>disneyPlus</code> &rarr; <code>commerce-disneyplus</code>); for ESPN it is a no-op. The{" "}
        <code>variant</code> is the <strong>backend service</strong> — the environment, from{" "}
        <code>dss_backend_services</code> (query param, cookie or header), defaulting to <code>qa</code>{" "}
        per <code>apps/commerce/espn/.env</code>. Failing to resolve it <em>throws</em>.
      </p>
      <p>
        Now reason about the cache key: it is{" "}
        <strong><code>backendService</code> alone — the tenant is not in it</strong>. Safe today only
        because each Next.js process serves one tenant, so <code>PRODUCT=espn</code> is a process-level
        constant. If anything ever co-hosts two tenants in one process — a shared preview server, a
        harness that flips <code>process.env.PRODUCT</code> — <code>qa</code> resolves to whichever
        tenant warmed the cache first, for up to five minutes. Treat one-tenant-per-process as a
        load-bearing invariant, not an accident.
      </p>
      <p>
        <strong>Honest caveat about every flag value quoted in this module.</strong> ESPN values readable
        in the repo come from{" "}
        <code>packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts</code>{" "}
        — the checked-in <strong>QA test fixture</strong>. Real values are fetched from Sparrow S3 per
        request and differ per variant. Never cite the fixture as production without reading the live{" "}
        <code>prod</code> variant.
      </p>

      <h2 id="route-gating">Route Gating: Flags That Make 404s</h2>
      <p>
        The ESPN-visible use of Sparrow flags, and the most confusing newcomer experience in the repo. A
        composition function reads one allowlisted flag and, when falsy, returns Next.js{" "}
        <code>notFound</code> — no error, no log, byte-identical to a route that does not exist (
        <code>packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts</code>):
      </p>
      <CodeBlock
        code={`export function isRouteEnabled({ featureFlagName }: { featureFlagName: RouteEnablingFeatureFlags }): CompositionFunction {
  return function _isRouteEnabled(commerceAppConfig) {
    const { 'feature-flags': { general: featureConfig } } = commerceAppConfig;
    if (featureConfig[featureFlagName as keyof typeof featureConfig]) return {};
    return { notFound: true };            // <- Next.js renders a 404
  };
}
// apps/commerce/espn/pages/commerce/plans/index.page.tsx
export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedPlans' }), getLayoutConfigProp,
]);`}
        lang="typescript"
        filename="is-route-enabled.ts"
      />
      <MermaidDiagram
        chart={routeGateDiagram}
        title="Flag to 404 Path"
        caption="Nothing is emitted on the falsy branch — which is why the newcomer sees a bare 404 and assumes the page was never built."
        minHeight={400}
      />
      <p>
        Roughly <strong>42 of the 79 ESPN pages are flag-gated</strong> against{" "}
        <code>RouteEnablingFeatureFlagsList</code> (~45 names). In the ESPN fixture{" "}
        <code>enableCommerceUnifiedPlans</code>, <code>enableCommerceUnifiedPurchase</code> and{" "}
        <code>enableCommerceUnifiedWelcomeBack</code> are all <code>false</code>, so{" "}
        <code>/commerce/plans</code> 404s out of the box locally — not a bug, since in that config
        ESPN&apos;s plan selector is off-app at <code>sandbox.espn.com/watch/offers</code>. When someone
        reports a 404, work this recipe:
      </p>
      <CodeBlock
        code={`# 1. Does the page file even exist? A missing file is also a 404.
ls apps/commerce/espn/pages/commerce/plans/
# 2. Is there a gate, and which flag?  3. What does the checked-in QA fixture say for it?
grep -n "isRouteEnabled" apps/commerce/espn/pages/commerce/plans/index.page.tsx
grep -n "enableCommerceUnifiedPlans" packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts
# 4. Which Sparrow variant is this session loading? Append ?dss_backend_services=prod and compare.
# 5. Confirm the flag is camelCase — a wpnx-* key can NEVER gate a route. isRouteEnabled only reads feature-flags.general.`}
        lang="bash"
        filename="diagnose-404.sh"
      />

      <h2 id="territory-inheritance">Territory Flag Inheritance</h2>
      <p>
        Per-country Sparrow flags support exactly <strong>one level</strong> of inheritance. A country is
        a <strong>territory</strong> if and only if it declares a <code>parentCountry</code>.
        ESPN&apos;s workspace has one business region, <code>NA</code>, with <code>US</code> plus seven US
        territories (<code>AS GU MH MP PR UM VI</code>), each carrying{" "}
        <code>parentCountry: &apos;US&apos;</code>.
      </p>
      <CodeBlock
        code={`const parentCountry = commerceAppConfigCountries[region]?.parentCountry;
const isTerritory = parentCountry !== undefined;

// If not a territory OR if not inheriting from parent, return country-specific flags.
if (!isTerritory || !shouldInheritFromParent) return commerceAppConfigCountries[region]?.featureFlags ?? {};

const territoryFlagsCopy: Record<string, unknown> = JSON.parse(   // deep clone of the PARENT
  JSON.stringify(commerceAppConfigCountries[parentCountry]?.featureFlags ?? {})
);
// Territory inherits parent flags, with territory overrides layered on top, key by key.
const territoryCommerceFlags = commerceAppConfigCountries[region]?.featureFlags;
for (const key of Object.keys(territoryCommerceFlags ?? {})) {
  territoryFlagsCopy[key] = territoryCommerceFlags[key as keyof CountryObject['featureFlags']];
}
return territoryFlagsCopy;`}
        lang="tsx"
        filename="use-commerce-region-feature-flags.tsx"
      />
      <p>
        Four properties. It <strong>deep-clones the parent first</strong>, so mutating the result cannot
        corrupt the parent config. The merge is a <strong>key-level override</strong>, not a deep merge —
        a territory declaring an object-valued flag replaces the parent&apos;s object wholesale. Depth is{" "}
        <strong>one level</strong>, no grandparent chain. And <code>shouldInheritFromParent: false</code>{" "}
        is the <strong>opt-out</strong>, returning only the territory&apos;s own keys. Concretely,{" "}
        <code>MP</code> and <code>PR</code> declare{" "}
        <code>showIdentityUnifiedLicensePlateFlow: false</code> but no{" "}
        <code>licensePlateFlowNavigation</code>, so they opt out of that flow while inheriting the US nav
        map — a territory <code>false</code> beats a parent <code>true</code>. Broader region and locale
        mechanics belong to the sibling region/i18n module in this academy.
      </p>

      <h2 id="experiments-cgi-web">Experiments on the cgi-web Side</h2>
      <p>
        There is <strong>no experiment framework in cgi-web</strong> — no registry, no bucketing, no{" "}
        <code>getExperimentTreatment</code>. Experiments are hand-rolled hooks in{" "}
        <code>packages/cgi/commerce-base/src/common/hooks/experiments/</code>, owned by{" "}
        <code>@cgi-client/xd</code>:
      </p>
      <CodeBlock
        code={`export const FEATURE_ID = 'wpnx-one-click-reconnect';

export enum OneClickReconnectVariant {
  CONTROL = 'control',
  ALL_LAPSED_SUBS = 'one-click-reconnect-all-lapsed-subs',
  LAPSED_BUNDLE_ONLY = 'one-click-reconnect-lapsed-bundle-only',
  ALL_LAPSED_SUBS_BASE_TEMPLATE = 'one-click-reconnect-all-lapsed-subs-base-template',
}

/** TODO: GCIEX-12842 - Clean up/Productionalize One Click Reconnect. */
export function useOneClickReconnectExperiment() {
  const { data } = useMystiqueFeatureFlags();
  const variant = data?.[FEATURE_ID] as OneClickReconnectVariant | undefined;
  return {
    isOneClickReconnectOptimized:
      variant === OneClickReconnectVariant.ALL_LAPSED_SUBS || variant === OneClickReconnectVariant.LAPSED_BUNDLE_ONLY,
    isBaseTemplateTreatment: variant === OneClickReconnectVariant.ALL_LAPSED_SUBS_BASE_TEMPLATE,
  };
}`}
        lang="typescript"
        filename="use-one-click-reconnect-experiment.ts"
      />
      <p>
        Five invariants: an exported <code>FEATURE_ID</code> shared by tests and callers; variants as an{" "}
        <code>enum</code>; a read of <code>data?.[FEATURE_ID]</code> cast to{" "}
        <code>Variant | undefined</code>; a return of <strong>derived named booleans</strong> rather than
        the raw variant, so callers cannot string-compare wrong; and a{" "}
        <code>TODO: &lt;TICKET&gt; - Clean up/Productionalize</code> comment — this repo&apos;s{" "}
        <em>only</em> lifecycle tracking mechanism. A rarer shape reads{" "}
        <code>sessionInfo.experiments</code> instead:{" "}
        <code>{"{ featureId, variantId, version }"}</code> records arriving as an{" "}
        <em>array or a map</em>, normalised in{" "}
        <code>packages/cgi/data-interface-espn/src/experimentation/helpers/get-experiment-assignments.ts</code>.
      </p>

      <h3 id="treatment-undefined">The Treatment-Undefined Trap</h3>
      <p>
        Every WeaponX hook compares a <em>string</em> variant against an expected treatment id.{" "}
        <strong>Four distinct situations</strong> make that string <code>undefined</code>, and all four
        render as control, indistinguishably: (1) the query has not run, because{" "}
        <code>enabled: isReady</code> gates on SDK readiness; (2) the SDK is disabled, so the hook returns
        that hardcoded literal of only six keys — the Hulu production path and the local-dev path; (3) the
        user is not enrolled, and WeaponX omits the key rather than sending <code>control</code>; (4) the
        SDK call threw, and <code>useErrorBoundary: false</code> logs it as <code>Owners.CORE</code>{" "}
        leaving <code>data</code> undefined.
      </p>
      <MermaidDiagram
        chart={undefinedTreatmentDiagram}
        title="Four Paths to an Undefined Treatment"
        caption="Five arrows reach the CONTROL box: four are failures and one is a real assignment. Nothing in the return value tells them apart."
        minHeight={550}
      />
      <p>
        So a hook returning <code>false</code> is ambiguous —{" "}
        <code>useOneClickReconnectExperiment</code> returns two booleans that can both be{" "}
        <code>false</code> for at least three reasons. And because the query is gated on{" "}
        <code>isReady</code>, every experiment renders <strong>control on the first pass</strong>, so
        anything changing above-the-fold layout visibly flashes control &rarr; treatment. Now the real
        anti-pattern living in the repo today:
      </p>
      <CodeBlock
        code={`// REAL CODE: use-is-in-turkey-comparison-chart-experiment.ts — the anti-pattern
export function useIsInTurkeyComparisonChartExperiment() {
  const { data } = useMystiqueFeatureFlags();
  return Boolean(data?.['wpnx-In-Funnel-Comp-Chart-Descending-Turkey']);
}
//   flag absent          -> Boolean(undefined) === false  (looks like control — correct by luck)
//   flag key typo'd      -> Boolean(undefined) === false  (silently control forever, no signal)
//   flag value 'control' -> Boolean('control')  === TRUE  (control users get the TREATMENT)
// Any non-empty variant string is truthy, so with explicit string variants — the normal WeaponX
// convention — the control arm is enrolled into the treatment and the read-out is garbage.

// The correct shape, from use-is-in-flagship-addon-suf-experiment.tsx:
export function useIsInFlagshipAddonSUFExperiment() {
  const { offDeviceGrant } = getLicensePlateOptions();
  const isLicensePlateUser = Boolean(offDeviceGrant);
  const { data } = useMystiqueFeatureFlags();
  // strict equality against a NAMED treatment id, AND an eligibility rule
  return data?.['wpnx-add-on-step'] === 'add-on-step' && !isLicensePlateUser;
}`}
        lang="typescript"
        filename="treatment-undefined-antipattern.ts"
      />
      <p>
        Mitigations used here: strict equality against a named treatment id; derived booleans rather than
        the variant; treatment combined with an explicit <strong>eligibility</strong> rule as above; and
        where a real default matters, the Spearmint pattern&apos;s explicit <code>defaultState</code> (
        <code>use-spearmint-experiment.ts</code>), which sets a known state in its <code>catch</code>.
      </p>

      <h2 id="experiments-flex">Experiments on the Flex Side</h2>
      <p>
        Experiments exist on <strong>both sides of the boundary</strong> — the fact most people get wrong.
        cgi-web reads WeaponX flags from the SDK bootstrap cache and branches in React.{" "}
        <strong>Flex</strong>, the server-driven-UI BFF in the <code>growth-life-client-api</code> repo,
        resolves treatments <em>server-side</em> from a request header and swaps template{" "}
        <strong><code>dataKey</code>s</strong>, so cgi-web receives a different JSON screen and renders it
        verbatim, unaware an experiment happened. <code>getExperimentTreatment</code> and{" "}
        <code>regionExperience</code> <strong>do not exist in cgi-web</strong> — zero hits by repo-wide
        grep. If a ticket names them, the work is in Flex.
      </p>
      <CodeBlock
        code={`// Flex repo: growth-life-client-api — src/lib/experiments/treatment.ts
export const getExperimentTreatment = <T extends FeatureID>({ flexContext, featureId }): Variants<T> | undefined => {
  const treatment = getExperimentVariantId({ flexContext, featureId });
  if (!treatment) return undefined;                     // <- unassigned users
  if (!isValidVariant(treatment, featureId)) {
    logger.warn(\`Experiment Treatment variant: (\${treatment}) for feature ID: \${featureId} did not match…\`);
    return treatment as Variants<T>;                    // <- an UNKNOWN variant is still returned
  }
  return treatment;
};
// Assignments arrive on the REQUEST, base64: x-bamtech-weaponx-assignments (Disney+ / ESPN) or
// x-bamtech-spearmint-assignments (Hulu). Flex does NOT allocate users — it only reads the allocation.`}
        lang="typescript"
        filename="treatment.ts"
      />
      <p>
        Two gotchas in nine lines, mirroring the cgi-web trap: <code>undefined</code> for unassigned
        users, so detection helpers must handle it; and an <em>unknown</em> variant is logged but{" "}
        <strong>still returned</strong>, so a console typo propagates into the screen rather than failing
        closed. The template-config layer holds the harder rule. The real ESPN paywall config —{" "}
        <code>src/__fixtures__/templates/configuration/flex-espn-paywall/espn-paywall.json</code> in the
        Flex repo — lists <strong>four</strong> ESPN featureIds against <strong>seven</strong> template
        variants and seven data blocks. Abridged to the four ids, all seven variants, and two of the seven
        data blocks:
      </p>
      <CodeBlock
        code={`{
  "experimentFeatureIds": [
    "wpnx-great-ESPN-Plan-Order-via-ESPN-Entry",
    "wpnx-ESPN-Plan-Select-Linear-Plan-Order",
    "wpnx-ESPN-Generic-Entry-Plan-Order",
    "wpnx-ESPN-Entry-Plan-Order"
  ],
  "templates": {
    "control":                          { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "default" },
    "plan_cards_mixed":                 { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "mixedSort" },
    "modified-plan-order":              { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "linearSort" },
    "ascending-price-order":            { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "ascendingPriceOrder" },
    "descending-price-order":           { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "descendingPriceOrder" },
    "ascending-price-order-espn-entry":  { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "ascendingPriceOrderEspn" },
    "mixed-price-order-espn-entry":     { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "mixedPriceOrderEspn" }
  },
  "data": {
    "linearSort": {
      "sortPlanCards": {
        "default":       { "sortOrder": [] },
        "espn:flagship": { "sortOrder": ["FLAGSHIP_STANDALONE", "FLAGSHIP_BUNDLE", "FOX_BUNDLE"] }
      }
    },
    "ascendingPriceOrder": {
      "sortPlanCards": {
        "default": { "sortOrder": [] },
        "generic": { "sortOrder": ["ESPN_STANDALONE", "DISNEY_3P_BUNDLE", "FLAGSHIP_STANDALONE", "FLAGSHIP_BUNDLE"] }
      }
    }
  }
}`}
        lang="json"
        filename="espn-paywall.json"
      />
      <p>
        Read the inner keys carefully: <code>default</code>, <code>generic</code> and{" "}
        <code>espn:flagship</code> are <strong>entry-point sub-selectors</strong>, so the same treatment
        sorts plan cards differently depending on which entry the user arrived from. That is why the
        config is verbose: seven variants times several entry points is a lot of surface for one screen.
      </p>
      <MermaidDiagram
        chart={flexResolutionDiagram}
        title="Flex Server-Side Resolution and the First-Match Drop"
        caption="The dashed arrow is the footgun: four featureIds are declared, at most one is honoured, and the rest vanish with only a warning."
        minHeight={550}
      />
      <p>
        The resolution loop is <code>getTemplateConfiguration()</code> in{" "}
        <code>src/domain/screen/common/configuration.ts</code> (Flex repo, <code>:36-100</code>). It
        fetches via <code>TemplateConfigClient.getConfig</code>, reads{" "}
        <code>experimentFeatureIds</code>, back-fills the deprecated singular{" "}
        <code>experimentFeatureId</code> with a warning, then iterates the array calling{" "}
        <code>getVariant(experiment, featureId)</code> per id. The first-match behaviour is a
        one-line latch, and it is worth reading precisely:
      </p>
      <CodeBlock
        code={`templateConfiguration.experimentFeatureIds?.forEach((featureId) => {
  const variant = getVariant(experiment, featureId);
  if (variant) {
    let templateConfig: TemplateConfigurationForScreen | undefined;
    if (templateConfiguration.templatesV2) {
      templateConfig = templateConfiguration.templatesV2[variant.variant_id]?.[version];
    } else {
      templateConfig = templateConfiguration.templates[variant.variant_id];
    }
    if (!experimentTemplateConfigurationForScreen) {      // <- THE LATCH. First writer wins.
      experimentTemplateConfigurationForScreen = templateConfig;
    }
    if (templateConfig) {
      experimentVariantsActive.push({ featureId, variantId: variant.variant_id });
    }
  }
});
// If multiple experiments/variants are active, we only apply the first experiment listed in the experimentFeatureIds config array
if (experimentVariantsActive.length > 1) {
  logger.warn('[experiments] Too many featureId & variantId matches is found running on this page.', { /* … */ });
}`}
        lang="typescript"
        filename="configuration.ts"
      />
      <p>
        Two subtleties fall out of that latch. First, because it assigns <code>templateConfig</code>{" "}
        even when that value is <code>undefined</code>, the latch stays open — so the winner is
        effectively <strong>the first featureId whose variant maps to an entry in{" "}
        <code>templates</code></strong>, not merely the first featureId with any assignment. Second, the
        only signal that experiments two through four were dropped is a{" "}
        <code>logger.warn</code>; the response is a perfectly valid screen, so nothing downstream can
        tell. The rule is stated outright in the Flex repo&apos;s{" "}
        <code>EXPERIMENTATION.md</code> (<code>:279</code>):{" "}
        <em>&quot;When multiple experimentFeatureIds resolve for the same screen,
        getTemplateConfiguration() logs a warning and uses the first match (first featureId in the array
        with an active variant wins). Multiple experiments relying on template config changes
        simultaneously is not supported — only one experiment&apos;s template variant will be
        applied.&quot;</em> Its prescribed workaround: keep one experiment in template config and move the
        others&apos; template-level logic into service code, with a comment explaining why.
      </p>
      <p>
        Note also the <code>templatesV2[variant][version]</code> branch: screens that exist in both v1 and
        v2 key their templates by version, and picking the wrong <code>version</code> argument silently
        yields <code>undefined</code> — another way to land on control. Flex&apos;s own decision rule for
        where experiment logic belongs: <strong>template config</strong> handles static cypher-key swaps,
        layout changes and data overlays, while <strong>service code</strong> is required for runtime data
        dependencies, region gating, and multi-experiment interactions.
      </p>

      <h2 id="platform-per-brand">Which Platform Per Brand</h2>
      <p>
        <strong>ESPN &rarr; WeaponX. Disney+ &rarr; WeaponX. Hulu &rarr; Spearmint.</strong> The code
        comment that says so is in{" "}
        <code>packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx</code>:
      </p>
      <CodeBlock
        code={`/**
 * Combines copy override mappings from both WeaponX (Disney+/ESPN) and
 * Spearmint (Hulu) experimentation systems.
 *
 * For Hulu: WeaponX overrides will be empty (SDK disabled), Spearmint overrides active.
 * For Disney+/ESPN: Spearmint overrides will be empty (no cookie), WeaponX overrides active.
 */
export function useExperimentalCopyOverrides(): CopyOverrideMapping {
  const weaponXOverrides = useWeaponXCopyOverrides();
  const spearmintOverrides = useSpearmintCopyOverrides();
  return useMemo(() => ({ ...weaponXOverrides, ...spearmintOverrides }), [/* … */]);
}`}
        lang="tsx"
        filename="use-copy-override-experiment.tsx"
      />
      <p>
        The enforcing mechanism is that Hulu runs with the SDK disabled — which is also why{" "}
        <code>useMystiqueFeatureFlags</code> carries{" "}
        <em>&quot;hardcoded true here because Hulu is US-only and does not use the SDK or
        WeaponX.&quot;</em> ESPN <em>does</em> use the SDK, so ESPN gets real WeaponX values and never the
        fallback literal in production. Practical consequence: a copy experiment written only against the
        Spearmint hook is invisible on ESPN, and vice versa.
      </p>

      <h2 id="productionalization">Productionalization: The Full Lifecycle</h2>
      <MermaidDiagram
        chart={lifecycleDiagram}
        title="Experiment Lifecycle: Initialize to Cleanup"
        caption="Productionalize is not optional polish — it is the step that converts a temporary allocation into a permanent business rule."
        minHeight={400}
      />
      <p>
        <strong>Initialize:</strong> create the flag in the WeaponX console, add a hook exporting{" "}
        <code>FEATURE_ID</code> and a variant enum, add the <code>TODO</code> cleanup comment, and add MSW
        handlers for both arms —{" "}
        <code>createMystiqueFeatureFlagHandler({"{ 'wpnx-add-on-step': 'add-on-step' }"})</code> with a{" "}
        <code>&apos;control&apos;</code> twin in{" "}
        <code>packages/cgi/commerce-base/src/test/playwright-utils/mystique-feature-flag-handler.ts</code>.{" "}
        <strong>Run:</strong> values arrive via SDK bootstrap, WeaponX allocates, and observability is
        per-experiment Datadog context —{" "}
        <code>datadogRum.setGlobalContextProperty(featureId, {"{ treatment: variant }"})</code>. Note{" "}
        <em>treatment</em> there is an observability field name, not a code API.
      </p>
      <p>
        <strong>Productionalize</strong> means exactly one thing:{" "}
        <strong>stop asking WeaponX, start asking the business config</strong>. The <code>wpnx-*</code>{" "}
        conditional is deleted and replaced by a Sparrow <code>feature-flags.general</code> flag, a
        per-country <code>countries.&lt;CC&gt;.featureFlags</code> entry when the winner is
        market-scoped, or unconditional code when it is global. The clearest ESPN exemplar of that end
        state is <code>enableEspnInternalActivation</code>:
      </p>
      <CodeBlock
        code={`// packages/cgi/commerce-utils/src/app-config/models/feature-flags-scope.ts
  /** Enables the ESPN Internal Activation flow (query-param-driven redirect to
   * an external provider login and back to the activation callback). */
  enableEspnInternalActivation?: boolean;

// packages/cgi/commerce-base/src/transactional/activation/pages/activation-page.tsx
  /** Gated behind the \`enableEspnInternalActivation\` feature flag — the flow signal is \`false\`
   * and the params are \`undefined\` when the flag is off, so the page falls back to the
   * standard incoming activation behavior. */
  const { isEspnInternalActivation, providerLoginUrl } = useEspnInternalActivation();`}
        lang="typescript"
        filename="enable-espn-internal-activation.ts"
      />
      <p>
        A typed field on the Sparrow scope, <code>true</code> in the ESPN fixture, gating real production
        code, with its own E2E spec at{" "}
        <code>apps/commerce/espn/playwright/tests/flows/espn-internal-activation.spec.ts</code>. No{" "}
        <code>wpnx-</code> prefix anywhere — that absence <em>is</em> the graduation. Between decision and
        graduation you will find the <strong>dual read</strong>,{" "}
        <em>WeaponX-flag OR Sparrow-flag</em>:
      </p>
      <CodeBlock
        code={`const { data: mystiqueFlags } = useMystiqueFeatureFlags();
const useIdentityId =
  mystiqueFlags?.['wpnx-identity-consent-sync']?.enabled === true ||
  commerceAppConfig['feature-flags'].general.enableIdentityConsentSync;`}
        lang="tsx"
        filename="use-consent-config.tsx"
      />
      <p>
        The <strong>Sparrow flag is the eventual home</strong> — declarative, per-environment, reviewable
        in config. The <strong>WeaponX flag is the rollout lever</strong> — audience-targeted, flippable
        without a config deploy. It is <em>object-valued</em> (<code>?.enabled === true</code>), so{" "}
        <code>Boolean(...)</code> on it would be truthy for <em>any</em> object including{" "}
        <code>{"{ enabled: false }"}</code>. ESPN&apos;s fixture has{" "}
        <code>enableIdentityConsentSync: false</code>, so ESPN depends on the WeaponX side today.{" "}
        <strong>Remove the dual read once the Sparrow flag is <code>true</code> in every variant you care
        about</strong> — before that the OR is load-bearing; after that it is a second source of truth
        that will drift.
      </p>
      <p>
        <strong>Clean up:</strong> delete the hook, its <code>FEATURE_ID</code> and enum, the MSW and
        Playwright handlers, the Jest mock entry, the <code>TODO</code>, and the console flag. Then go
        further — <strong>experiment-shaped optional fields leak into shared Flex offer models</strong>{" "}
        with their own tickets: <code>installmentOptions</code> (GREAT-572),{" "}
        <code>featuresHeader</code> (GREAT-684), <code>useStandardPriceStyle</code> (GCIEX-12743) in{" "}
        <code>packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts</code>. Deleting
        only the hook leaves dead model fields behind.
      </p>

      <h2 id="partner-name">The partnerName Subtlety</h2>
      <p>
        Do not branch tenant logic on <code>partnerName</code>. It is{" "}
        <strong><code>&apos;disney&apos;</code> even in ESPN context</strong> for identity and
        orchestration payloads (<code>packages/remote-config/src/testing-utils/espn/qa.json</code>,{" "}
        <code>apps/marketing-unified/espn/src/mocks/apis/orchestration-register-device.json</code>),
        while the marketing ESPN OneID mock uses <code>&apos;espn&apos;</code> and the Sparrow{" "}
        <em>analytics</em> scope carries a different field, <code>partner: &apos;espn&apos;</code> —
        different fields, different values, not interchangeable.{" "}
        <strong>Prefer <code>commerceAppConfig[&apos;feature-configuration&apos;].general.name</code></strong>{" "}
        (<code>&apos;ESPN&apos; | &apos;Disney+&apos; | &apos;Hulu&apos;</code>) for tenant-conditional
        business rules, or <code>feature-configuration.analytics.partner</code> when the decision is
        analytics-scoped. Brand namespaces and the other tenant switches are covered in depth by the
        sibling brand-divergence module in this academy.
      </p>

      <h2 id="espn-inventory">The ESPN Flag &amp; Experiment Inventory</h2>
      <p>
        There are few ESPN-named flags, because most ESPN behaviour rides on shared commerce flags plus
        the ESPN Sparrow workspace. The <strong>has-consumer</strong> column is the lesson: several ESPN
        experiment ids exist only inside captured SDK fixtures, with no code reading them.
      </p>
      <ArticleTable caption="Every ESPN-named flag or experiment id found in cgi-web, and whether any code actually reads it." minWidth={1040}>
        <table>
          <thead><tr><th>Flag / feature id</th><th>System</th><th>Consumer</th><th>Has consumer?</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><code>wpnx-enable-legacy-analytics-espn</code></td><td>WeaponX</td><td><code>use-is-espn-legacy-analytics-enabled.tsx</code></td><td>Yes</td><td>Billing page only: legacy <code>adobeAnalyticsTrack()</code> instead of CoreAnalytics. ESPN only.</td></tr>
            <tr><td><code>wpnx-web-identity-enable-begin-espn-route</code></td><td>WeaponX</td><td><code>identity/loading/lib/is-dynamic-url-slug-enabled.ts</code></td><td>Yes</td><td>Enables the dynamic <code>/identity/begin/&lt;slug&gt;</code> route for the ESPN slug.</td></tr>
            <tr><td><code>wpnx-web-identity-magicLink-espnActivations</code></td><td>WeaponX</td><td><code>identity/magic-link/pages/magic-link-page.tsx</code></td><td>Yes</td><td>Magic-link to ESPN activation handoff.</td></tr>
            <tr><td><code>wpnx-add-on-step</code></td><td>WeaponX experiment</td><td><code>use-is-in-flagship-addon-suf-experiment.tsx</code></td><td>Yes</td><td>Treatment <code>add-on-step</code> vs <code>control</code>. Flagship = ESPN Unlimited. Excludes license-plate users.</td></tr>
            <tr><td><code>wpnx-web-tab-flagship</code></td><td>WeaponX</td><td><code>use-is-flagship-enabled.tsx</code></td><td>Yes</td><td>Doc-comment says explicitly <em>Disney+ and ESPN</em>. Gates ESPN Unlimited.</td></tr>
            <tr><td><code>enableEspnInternalActivation</code></td><td><strong>Sparrow</strong></td><td><code>feature-flags-scope.ts</code> + <code>activation-page.tsx</code></td><td>Yes</td><td>The productionalized exemplar. <code>true</code> in the ESPN fixture; has its own E2E spec.</td></tr>
            <tr><td><code>enableCommerceUnifiedPlans</code></td><td><strong>Sparrow</strong></td><td><code>pages/commerce/plans/index.page.tsx</code></td><td>Yes</td><td>Route gate. <code>false</code> in the ESPN fixture, so <code>/commerce/plans</code> 404s locally.</td></tr>
            <tr><td><code>wpnx-ESPN-Banner-Payment-Retry</code></td><td>WeaponX session assignment</td><td>OneID + marketing fixtures only</td><td><strong>No</strong></td><td>Dead configuration in cgi-web — owned by another repo, or already retired.</td></tr>
            <tr><td><code>wpnx-WebCommerce-PPV-MonthlyOffer</code></td><td>WeaponX session assignment</td><td>Same OneID fixture</td><td><strong>No</strong></td><td>PPV is ESPN-specific merchandising, but nothing in cgi-web reads the id.</td></tr>
            <tr><td><code>wpnx-WebCommerce-PPV-ABC-UFC298-16717</code></td><td>WeaponX session assignment</td><td>Same OneID fixture</td><td><strong>No</strong></td><td>A UFC pay-per-view assignment frozen into a captured fixture.</td></tr>
            <tr><td><code>wpnx-disney-nav-espn</code></td><td>WeaponX</td><td><code>packages/identity-auth</code> magic-link fixtures</td><td><strong>No</strong></td><td>Fixture-only. Do not assume a flag is live because it appears in a JSON payload.</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        No <code>wpnx-ESPN-*</code> flag other than <code>wpnx-ESPN-Banner-Payment-Retry</code> exists
        anywhere in cgi-web — yet the Flex registry (<code>src/lib/experiments/registry.ts</code>) holds
        six ESPN experiment ids. That asymmetry is the two-sided picture in one number:{" "}
        <strong>ESPN&apos;s experiment surface is mostly on the Flex side</strong>.
      </p>

      <h2 id="secrets">Secrets an ESPN Build Needs</h2>
      <p>
        Exactly two, both from Vault (service <code>espnplus-commerce</code>, namespace{" "}
        <code>60c7e031310ce5f580d4db16</code>, env <code>staging</code>), populated by{" "}
        <code>./scripts/setup configure secrets</code> into <code>apps/commerce/espn/.env.local</code> — a
        preflight in <code>scripts/lib/check-commerce-secrets.sh</code> blocks the app if they are
        missing. <code>.env.test</code> sets both to <code>test-placeholder</code>.
      </p>
      <CodeBlock
        code={`REMOTE_CONFIG_S3_ACCESS_KEY=    # sent as the Referer header when fetching Sparrow config from S3. An
                                # unusual auth pattern, and the usual cause of "all my flags are empty locally".
DAPI_SENSITIVE_SECRETS_API_KEY= # becomes the dapi-sensitive-keys-secret header for dictionary draft state.`}
        lang="bash"
        filename=".env.local.example"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how are flags and experiments managed here, and how would you clean one up?"
        intro="A weak answer names one system and says 'delete the if statement'. A strong answer refuses the premise — there is no single flag system — and distinguishes productionalizing from deleting."
        steps={[
          "Open with the boundary: two independent systems. WeaponX wpnx-* flags from the SDK bootstrap cache with no network call, and Sparrow camelCase config flags fetched server-side in getServerSideProps.",
          "Give the at-a-glance rule: wpnx- prefix means SDK and useMystiqueFeatureFlags; camelCase means config and useCommerceFeatureFlag. Say plainly that confusing them is the most common mistake, and the symptom is a flag that silently never takes effect.",
          "Add the third mechanism to prove you know the boundary: Flex resolves treatments server-side from x-bamtech-weaponx-assignments and swaps template dataKeys, honouring only the first featureId whose variant maps to a templates entry — so a screen can change with no cgi-web code involved.",
          "Name the four undefined paths and why they are indistinguishable from control, then say you never Boolean-coerce a variant because Boolean('control') is true.",
          "For cleanup, separate the outcomes: control wins means delete; treatment wins means productionalize into a Sparrow feature-flags.general flag, a per-country featureFlags entry, or unconditional code. Cite enableEspnInternalActivation as the graduated exemplar and the WeaponX-OR-Sparrow dual read as a deliberate, temporary state.",
          "Close on blast radius: grep every reference first — one flag often gates several unrelated features, and experiment-shaped fields leak into shared Flex offer models with their own cleanup tickets.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: the ESPN add-on step experiment reads out as 100% control"
        scenario={
          <>
            You launched the Flagship add-on step experiment on ESPN using <code>wpnx-add-on-step</code>,
            allocated 50/50 in the WeaponX console, and shipped a hook written as{" "}
            <code>return Boolean(data?.[&apos;wpnx-add-on-step&apos;]) &amp;&amp; isEligible;</code>. A
            week later analytics shows near-zero users in the control arm, product reports the add-on step
            &quot;flickers on page load,&quot; and a QA engineer running locally with the SDK disabled
            insists the experiment does nothing at all. Meanwhile a second team says their ESPN paywall
            plan-order experiment, configured entirely in Flex template config, also &quot;never showed
            up.&quot;
          </>
        }
        tasks={[
          "Explain the near-zero control arm from the Boolean(...) coercion alone, given that WeaponX sends explicit variant strings.",
          "Diagnose the flicker, and name the single line of useMystiqueFeatureFlags that causes it.",
          "Explain why the QA engineer with the SDK disabled sees nothing, and why that is expected rather than a bug.",
          "Write the corrected hook, matching the shape used by useIsInFlagshipAddonSUFExperiment.",
          "For the second team's Flex-side experiment, name the rule that most likely swallowed it and where you would confirm.",
        ]}
        pitfalls={[
          "Blaming WeaponX allocation. The allocation is fine; the client-side comparison is broken.",
          "Treating 'flag absent' and 'control arm' as the same state — four distinct situations produce undefined and all render control.",
          "Assuming a wpnx-* key could gate a route or be set in Sparrow. isRouteEnabled only reads feature-flags.general.",
          "Fixing the hook and stopping there, leaving the flicker and the Flex-side drop unexplained.",
          "Hunting for getExperimentTreatment in cgi-web. It does not exist there.",
        ]}
        signal="A strong candidate says 'Boolean of the string control is true' within the first minute, separates the four undefined paths, then moves the second team's problem across the repo boundary into Flex without being prompted."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1.</strong> WeaponX sends a variant <em>string</em>; control users receive{" "}
          <code>&apos;control&apos;</code> and <code>Boolean(&apos;control&apos;)</code> is{" "}
          <code>true</code>, so every allocated user — both arms — took the treatment path. Exactly the
          anti-pattern living today in <code>use-is-in-turkey-comparison-chart-experiment.ts</code>.{" "}
          <strong>2.</strong> The flicker is <code>enabled: isReady</code>: a react-query gated on SDK
          session readiness, so <code>data</code> is <code>undefined</code> on first render and every
          experiment renders control before the session settles. <strong>3.</strong> SDK-disabled is path
          two of four — the hook returns a hardcoded literal of six keys, <code>wpnx-add-on-step</code> is
          not among them, so the treatment never renders. That is the Hulu production path and the
          local-dev path; ESPN in production does use the SDK.
        </p>
        <CodeBlock
          code={`// 4. Corrected: strict equality against a named treatment id, plus eligibility.
export const FEATURE_ID = 'wpnx-add-on-step';
export enum AddOnStepVariant { CONTROL = 'control', ADD_ON_STEP = 'add-on-step' }

// TODO GREAT-541: Cleanup / Move to Production Flagship Add-on step in SUF experiment
export function useAddOnStepExperiment() {
  const { offDeviceGrant } = getLicensePlateOptions();
  const isLicensePlateUser = Boolean(offDeviceGrant);
  const { data, isSuccess } = useMystiqueFeatureFlags();
  const variant = data?.[FEATURE_ID] as AddOnStepVariant | undefined;
  return {
    isInAddOnStepTreatment: variant === AddOnStepVariant.ADD_ON_STEP && !isLicensePlateUser,
    isResolved: isSuccess,   // lets callers suppress the first-render control flash
  };
}`}
          lang="typescript"
          filename="use-add-on-step-experiment.ts"
        />
        <p>
          <strong>5.</strong> The Flex-side experiment hit the first-match rule: the ESPN paywall template
          config declares four <code>experimentFeatureIds</code> on one screen, and{" "}
          <code>getTemplateConfiguration()</code> latches onto the <strong>first</strong> whose variant
          maps to a <code>templates</code> entry, logs{" "}
          <code>&apos;[experiments] Too many featureId &amp; variantId matches...&apos;</code>, and drops
          the rest. Confirm in the Flex repo (<code>growth-life-client-api</code>) via{" "}
          <code>src/__fixtures__/templates/configuration/flex-espn-paywall/espn-paywall.json</code> for
          the featureId order and <code>src/domain/screen/common/configuration.ts</code> for the
          resolution loop, then grep the service logs for that warning. Also check the{" "}
          <code>version</code> argument if the screen has <code>templatesV2</code> — a wrong version key
          yields <code>undefined</code> and looks identical. The fix: move one experiment into service
          code, or serialise the launches.
        </p>
      </SolutionReveal>

      <h2 id="gotchas">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>Shared flags gate more than you think.</strong>{" "}
          <code>wpnx-web-identity-account-home-header-dd</code> warns in code:{" "}
          <em>&quot;careful, this affects not just account home, but every page that uses
          SiteNavLinks.&quot;</em> <code>wpnx-use-privacy-consent-package</code> gates consent rendering{" "}
          <em>and</em> analytics enablement <em>and</em> footer behaviour across six-plus files, and{" "}
          <code>wpnx-add-on-step</code> gates both a Flagship experiment and a license-plate exclusion.
          Grep every reference before touching a flag, including other tenants&apos; app directories.
        </li>
        <li>
          <strong>Two flags can share one treatment id.</strong>{" "}
          <code>wpnx-skip-wb-landing-page</code> and <code>wpnx-skip-wb-landing-page-emea</code> both
          compare against <code>&apos;treatment-skip-wb-landing-page&apos;</code>, so wiring the wrong one
          still looks plausible. Similarly every <code>wpnx-great-copy</code>-prefixed flag merges into
          one override map, and two experiments touching the same cypher key silently drop the second with{" "}
          <code>EXP COPY OVERRIDE – DUPLICATE EXPERIMENTAL KEY</code>.
        </li>
        <li>
          <strong>One screen, several experiments, one winner.</strong> The Flex first-match latch means a
          template-config experiment can be fully configured, correctly allocated, and still never render
          — because a sibling featureId earlier in <code>experimentFeatureIds</code> also resolved. Check
          the array order before you debug your own config.
        </li>
        <li>
          <strong>Defaults differ by environment and by test runner.</strong> The SDK-disabled literal
          sets <code>wpnx-web-identity-account-home-header-dd</code> to{" "}
          <code>HEADER_VARIANT.Logout</code>, while{" "}
          <code>packages/cgi/commerce-base/src/test/setup/jest.mock-mystique-feature-flags.ts</code> sets
          it to <code>HEADER_VARIANT.Dropdown</code> — three defaults across Jest, local dev and prod.
          Sparrow adds an axis: committed fixtures are the <code>qa</code> variant only.
        </li>
        <li>
          <strong>Stale doc-comments contradict the code.</strong> <code>feature-flag.tsx</code> still
          says to set commerce flags in <code>disneyplus-remote-app-config</code>, but commerce moved to
          Sparrow. <code>load-sparrow-config.ts</code> claims errors return the unmodified config — the
          code <strong>throws</strong>. And <code>get-slim-remote-config.ts</code> carries the
          authoritative note <em>&quot;This is no longer used by CUP.&quot;</em> Trust the code over the
          comment here.
        </li>
        <li>
          <strong>Region hazards.</strong> A region change mid-render raises{" "}
          <code>USE_COMMERCE_FEATURE_FLAG – REGION_CHANGED</code> to Datadog and is{" "}
          <em>reported, not handled</em> (<code>TODO WEB-7298</code>). <code>regionAtom</code> is typed as
          an IANA <code>RegionSubtag</code> but <em>cast</em> to <code>CommerceAppConfigRegion</code>{" "}
          unchecked, so a region absent from the workspace yields <code>{"{}"}</code> flags rather than an
          error. Both config atoms also <strong>throw if read before hydration</strong>.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Two independent flag systems, and telling them apart is the whole game: <code>wpnx-*</code>{" "}
          means WeaponX via <code>useMystiqueFeatureFlags()</code> from the SDK bootstrap cache with no
          network call; camelCase means Sparrow config via <code>useCommerceFeatureFlag()</code> in{" "}
          <code>getServerSideProps</code>. Reading from the wrong system fails silently.
        </li>
        <li>
          Experiments exist on both sides of the cgi-web/Flex boundary. cgi-web branches in React on a
          variant string; Flex resolves treatments server-side from{" "}
          <code>x-bamtech-weaponx-assignments</code> and swaps template <code>dataKey</code>s, honouring
          only the first featureId whose variant maps to a <code>templates</code> entry.{" "}
          <code>getExperimentTreatment</code> and <code>regionExperience</code> are Flex-only concepts.
        </li>
        <li>
          Four distinct situations produce an <code>undefined</code> treatment — query not ready, SDK
          disabled, user unenrolled, SDK call threw — and all four render as control indistinguishably.
          Never <code>Boolean(...)</code> a variant: <code>Boolean(&apos;control&apos;)</code> is{" "}
          <code>true</code>.
        </li>
        <li>
          Sparrow flags turn pages into 404s via <code>isRouteEnabled</code> &rarr; <code>notFound</code>,
          with no log and no error. Around 42 of 79 ESPN pages are gated this way, and the checked-in
          fixture 404s <code>/commerce/plans</code> by default.
        </li>
        <li>
          Productionalizing converts the flag into a business rule — a Sparrow{" "}
          <code>feature-flags.general</code> entry, a per-country flag, or unconditional code.{" "}
          <code>enableEspnInternalActivation</code> is the graduated ESPN exemplar, and a{" "}
          <em>WeaponX OR Sparrow</em> dual read is the deliberate mid-transition state to remove once the
          config flag is true everywhere.
        </li>
        <li>
          Quoted flag values come from the <code>qa</code> test fixture, not production; the Sparrow LRU
          is keyed on the environment rather than the tenant; and several ESPN experiment ids exist only
          in fixtures with no consumer. Dead configuration is normal here — verify before assuming a flag
          is live.
        </li>
      </ul>
    </div>
  );
}
