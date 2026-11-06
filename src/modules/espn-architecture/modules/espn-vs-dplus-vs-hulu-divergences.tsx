import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const mechanismsDiagram = String.raw`flowchart TD
  Q["A brand needs to behave differently"] --> M1
  M1["1 · Config table keyed by brand<br/><b>PREFERRED</b> — pure data, in code"] --> M2["2 · Remote config value per brand<br/>Sparrow workspace"]
  M2 --> M3["3 · Feature flag / route gate<br/>isRouteEnabled returns notFound"]
  M3 --> M4["4 · Brand-conditional provider<br/>chosen in the app shell, not the library"]
  M4 --> M5["5 · Hardcoded conditional<br/><b>LAST RESORT</b> — must be justified"]
  M1 -.-> D1["productConfigMap · metadataByProduct<br/>tenantRouteMap · themes/espn.ts"]
  M2 -.-> D2["workspace commerce-espn<br/>paths · supportedLangsMap · countries"]
  M3 -.-> D3["enableCommerceUnifiedPlans false<br/>wpnx-enable-legacy-analytics-espn"]
  M4 -.-> D4["HydrateESPNDeviceAttributeProvider<br/>data-interface-espn · GlobalFooter"]
  M5 -.-> D5["partnerName equals espn<br/>3 sites in all of commerce-base"]`;

const decisionTreeDiagram = String.raw`flowchart TD
  S["New brand-specific behaviour requested"] --> Q1{"Is the difference a VALUE?<br/>a URL, string, image, number, token"}
  Q1 -->|Yes| A1["Add a key to the config table<br/>or to each brand Sparrow workspace"]
  Q1 -->|No| Q2{"Is it whether a whole route or<br/>feature exists for that brand?"}
  Q2 -->|Yes| A2["Feature flag + isRouteEnabled<br/>404 by data, no code branch"]
  Q2 -->|No| Q3{"Is it a different implementation<br/>of the same interface?"}
  Q3 -->|Yes| A3["Swap the implementation in the app shell<br/>provider or data-interface operation"]
  Q3 -->|No| Q4{"Is the difference presentational,<br/>regulatory, or vendor-shaped?"}
  Q4 -->|"No — it is behavioural"| A4["STOP. Model it as config.<br/>A behavioural if-espn is a design smell"]
  Q4 -->|"Yes — genuinely unavoidable"| Q5{"Can the condition be named as a<br/>CAPABILITY instead of a brand?"}
  Q5 -->|Yes| A5["Branch on the capability flag,<br/>not on the brand literal"]
  Q5 -->|No| A6["Hardcode it — then pick the right namespace,<br/>cite the ticket, test all three brands"]`;

const namespacesDiagram = String.raw`flowchart LR
  E1["process.env.PRODUCT<br/>apps/commerce/espn/.env"] --> N1["<b>ProductName</b><br/>disneyPlus · hulu · espn"]
  E2["BAMTech session<br/>useSessionInfo data partnerName"] --> N2["<b>partner / partnerName</b><br/>disney · hulu · espn"]
  E3["Hardcoded once in the app shell"] --> N3["<b>tenant</b><br/>disney · hulu · espn"]
  E4["_document.page.tsx createTheme"] --> N4["<b>ThemeName</b><br/>base · disneyPlus · hulu · espn"]
  N1 --> C1["Sparrow workspace name · Glimpse appName<br/>SEO metadata · MSW mock selection"]
  N2 --> C2["Payment field order · Toodles<br/>cancel redirect · sibling-site detection"]
  N3 --> C3["@solo/footer · Flex navigateWithTenant<br/>Datadog error context"]
  N4 --> C4["Stitches theme tokens<br/>student branding · icon variants"]
  N1 -.->|"disneyPlus is NOT disney"| N2`;

const identityDivergenceDiagram = String.raw`flowchart TD
  SH["@solo/commerce-base<br/>use-identity-sdk-reauth-handler.ts<br/><b>SHARED</b> — compiled into every brand"]
  SH --> U1["use-header-dropdown line 60"]
  SH --> U2["use-action-grant-guard line 40"]
  SH --> U3["restrict-profile-creation-item line 59"]
  U1 --> QQ{"Is identitySDKConfigAtom hydrated?"}
  U2 --> QQ
  U3 --> QQ
  QQ -->|"Disney+ — disney-layout.tsx line 127 calls the hydrate hook"| OK["sdkStatus becomes ready<br/>launchReauth opens the v5 iframe"]
  QQ -->|"ESPN — zero call sites, Sparrow sets identitySDK to null"| DEAD["sdkStatus stays pending<br/>handler throws IdentitySDK not ready"]
  EA["ESPN authenticates with OneID v4 instead<br/>clientId ESPN-ONESITE.WEB"] -.-> DEAD
  DEAD --> LESSON["<b>Code is PRESENT and REACHABLE</b><br/>but the precondition is never satisfied<br/>grep finds it · ESPN can never reach it"]`;

const topologyDiagram = String.raw`flowchart TD
  SD["apps/commerce/disneyPlus<br/>106 page files"] --> LIB
  SH["apps/commerce/hulu<br/>63 page files"] --> LIB
  SE["apps/commerce/espn<br/>79 page files"] --> LIB
  LIB["<b>@solo/commerce-base</b><br/>brand-agnostic shared library<br/>366 espn mentions · only 4 brand branches"]
  LIB --> CFG["Config tables in code<br/>productConfigMap · themes · tenantRouteMap"]
  LIB --> SPW["Sparrow remote config<br/>one workspace per brand"]
  LIB --> FLX["Flex BFF<br/>brand from x-bamtech-partner header"]
  SE -.->|"PRODUCT=espn selects the workspace"| SPW`;

export const toc: TocItem[] = [
  { id: "the-core-thesis", title: "The Core Thesis: Data, Not Code", level: 2 },
  { id: "proof-in-the-hot-path", title: "Proof: The Hot Path Has No Brand Branches", level: 2 },
  { id: "five-mechanisms", title: "The Five Mechanisms of Divergence", level: 2 },
  { id: "mechanism-config-table", title: "1. Config Table Keyed by Brand", level: 3 },
  { id: "mechanism-remote-config", title: "2. Remote Config per Brand", level: 3 },
  { id: "mechanism-flags-routes", title: "3. Feature Flags and Route Gating", level: 3 },
  { id: "mechanism-providers", title: "4. Brand-Conditional Providers", level: 3 },
  { id: "mechanism-hardcoded", title: "5. Hardcoded Conditionals", level: 3 },
  { id: "code-present-never-invoked", title: "The Sixth Shape: Code Present, Never Invoked", level: 2 },
  { id: "wrong-vs-right", title: "Wrong vs Right: Refactoring a Brand Conditional", level: 2 },
  { id: "where-branches-cluster", title: "Where Hardcoded Branches Legitimately Cluster", level: 2 },
  { id: "theming-by-build", title: "Theming Diverges by Build, Not Runtime", level: 2 },
  { id: "four-namespaces", title: "The Four Brand Namespaces Trap", level: 2 },
  { id: "product-default-hazard", title: "The PRODUCT Default Hazard", level: 2 },
  { id: "divergence-inventory", title: "Behavioural Divergence Inventory", level: 2 },
  { id: "topology", title: "Shared Library, Three Shells", level: 2 },
  { id: "decision-procedure", title: "How to Add a Brand Difference Safely", level: 2 },
  { id: "testing-obligation", title: "The Testing Obligation and PR Review", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Idle Warning Modal", level: 2 },
  { id: "gotchas", title: "Gotchas and Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnVsDplusVsHuluDivergences() {
  return (
    <div className="article-content">
      <p>You are about to add an ESPN-specific behaviour to a shared library, and the fastest way to do it is a one-line <code>if (partnerName === &apos;espn&apos;)</code>. That line will be approved, it will ship, and it will work. It will also be the reason somebody spends a Friday afternoon eighteen months from now figuring out why Disney+ silently took the ESPN branch. This module is not about forbidding that line — three of them live in production today and are correct. It is about the <strong>judgment</strong> to know which kind you are writing.</p>

      <h2 id="the-core-thesis">The Core Thesis: Data, Not Code</h2>
      <p>A healthy multi-tenant codebase pushes brand differences into <strong>data</strong> — config tables, remote-config values, feature flags, fixtures, theme tokens — and keeps the <strong>code</strong> brand-agnostic. The test is simple: if adding a fourth brand means editing shared library files, the divergence is in the wrong place. If it means adding a row to a table and standing up a new remote-config workspace, it is in the right place.</p>
      <p><code>packages/cgi/commerce-base</code> mostly achieves this, and the numbers are worth internalising. A fresh grep of production code under <code>packages/cgi/commerce-base/src</code> — excluding tests, fixtures, MSW mocks and stories — finds <strong>366 mentions of &quot;espn&quot; across 84 files</strong>, but only <strong>26 brand-literal equality comparisons across 10 files</strong>, and of those only <strong>three compare against <code>&apos;espn&apos;</code></strong> (plus one array-membership check). Roughly 1 in 90 ESPN mentions is actually a branch. Everything else is a table entry, a type, a theme token, an asset URL, or a comment.</p>
      <CodeBlock
        code={`# Run this yourself. The exclusions matter: .next/ and build*/ hold minified
# copies of commerce-base with every brand literal inlined.
EXCL='\\.test\\.|__fixtures__|__browser-mocks__|__server-mocks__|/test/|\\.stories\\.'

grep -rn -E "=== ?'(espn|hulu|disney|disneyPlus)'" \\
  packages/cgi/commerce-base/src --include='*.ts' --include='*.tsx' | grep -vE "$EXCL"
# -> 26 matches / 10 files, of which 3 are === 'espn'

grep -rni "espn" packages/cgi/commerce-base/src \\
  --include='*.ts' --include='*.tsx' | grep -vE "$EXCL" | wc -l
# -> 366`}
        lang="bash"
        filename="count-brand-branches.sh"
      />
      <p>That ratio carries a second lesson which the rest of this module keeps returning to: <strong>a grep tells you a symbol is present, not that a brand uses it.</strong> Glimpse is a good example — Glimpse code is compiled into ESPN commerce as inherited plumbing from shared <code>commerce-base</code> layouts, but ESPN authors <em>zero</em> Glimpse events; its real analytics stack is Adobe Analytics plus Adobe Launch. Presence, reachability, and actual use are three different questions, and only the third one answers &quot;does this brand depend on it&quot;.</p>

      <h2 id="proof-in-the-hot-path">Proof: The Hot Path Has No Brand Branches</h2>
      <p>The claim is not aspirational. Two of the busiest code paths in the repo contain zero brand conditionals:</p>
      <ul>
        <li>
          <strong>The shared <code>getServerSideProps</code> pipeline.</strong> <code>packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts</code> runs on every request for all three brands. It reads <code>process.env.PRODUCT</code> once, then does nothing but <em>lookups</em>: <code>productConfigMap[productName].url</code>, <code>metadataByProduct[productName]</code>, and a workspace name derived by lowercasing the product name.
        </li>
        <li>
          <strong>The signup core.</strong> <code>signup/pages/billing-page.tsx</code>, <code>signup/add-ons/pages/add-ons-page.tsx</code> and <code>signup/queries/use-flex-billing-execution.tsx</code> drive the entire checkout for three brands with no <code>if (espn)</code> anywhere. Every ESPN difference on the ledger arrives through Sparrow flags, WeaponX flags, the ESPN page wrapper, or <code>@solo/data-interface-espn</code>.
        </li>
      </ul>
      <p>That is the standard to hold new code to. When a diff adds a brand conditional to either of those files, the default answer is no — not because branches are evil, but because those files have already proven the difference can be expressed as data.</p>

      <h2 id="five-mechanisms">The Five Mechanisms of Divergence</h2>
      <p>There are exactly five places a brand difference can live in this codebase, and they form a preference order. Reach for the top of the list first, and descend only when the mechanism above genuinely cannot express it.</p>
      <MermaidDiagram
        chart={mechanismsDiagram}
        title="The Five Mechanisms, Ranked from Preferred to Last Resort"
        caption="Notice the shape: the top three keep brand identity in data, the fourth keeps it in wiring, and only the fifth puts it in shared code."
        minHeight={550}
      />
      <ArticleTable caption="Each mechanism, what it costs you, and the failure mode you get when you pick the wrong one." minWidth={980}>
        <table>
          <thead>
            <tr><th>Mechanism</th><th>Where the brand value lives</th><th>Cost / tradeoff</th><th>Failure mode when misused</th></tr>
          </thead>
          <tbody>
            <tr><td>Config table keyed by brand</td><td>A typed record in shared code, one entry per brand</td><td>Changing a value needs a deploy; the table must stay exhaustive</td><td>Adding a brand without a row — caught at build time only if the record is keyed by the union type</td></tr>
            <tr><td>Remote config (Sparrow)</td><td>S3 JSON, one workspace per brand, fetched per request</td><td>Not in the repo, so not reviewable in a PR; fixtures drift from production</td><td>You test against a fixture value production does not have — the ESPN V2 ledger flag exactly</td></tr>
            <tr><td>Feature flag / route gate</td><td>Sparrow <code>feature-flags.general</code> or WeaponX <code>wpnx-*</code></td><td>Two independent flag systems, different owners and defaults</td><td>A flag off makes a page a silent 404 — newcomers report it as &quot;the page is broken&quot;</td></tr>
            <tr><td>Brand-conditional provider</td><td>The app shell (<code>apps/commerce/espn/src/layout</code>)</td><td>Duplicated layout trees per brand that drift apart</td><td>You fix a bug in one brand&apos;s layout and leave the other two — see the two <code>LoadAnalytics</code> copies</td></tr>
            <tr><td>Hardcoded conditional</td><td>An <code>if</code> in shared library code</td><td>Every future brand edits this file; invisible to config owners</td><td>Silent wrong-brand behaviour, and an ESPN-only test that passes while Disney+ breaks</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="mechanism-config-table">1. Config Table Keyed by Brand</h3>
      <p>The preferred mechanism, and the one the SSP pipeline is built on. The load-bearing detail is the type: the record is keyed by <code>[key in ProductName]</code>, so TypeScript refuses to compile if a brand is missing. That turns &quot;we forgot ESPN&quot; from a runtime surprise into a build error.</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts
export const productConfigMap: {
  [key in ProductName]: Pick<GlimpseV2StartupClientPayloadEnrichmentsModel, 'appName' | 'partner'> & { url: string };
} = {
  disneyPlus: { appName: 'Disney+', partner: 'disney', url: 'https://www.disneyplus.com' },
  espn:       { appName: 'ESPN',    partner: 'espn',   url: 'https://plus.espn.com' },
  hulu:       { appName: 'Hulu',    partner: 'hulu',   url: 'https://www.hulu.com' },
};

// Consumption is a lookup, not a branch:
const productName = process.env.PRODUCT as ProductName;
const productUrlOrigin = productConfigMap[productName].url;
const productMetaData  = metadataByProduct[productName];`}
        lang="typescript"
        filename="build-get-server-side-props.ts"
      />
      <p>Others in this family: <code>metadataByProduct</code> (ESPN&apos;s share image is a 1296×729 PNG while both siblings use 1200×630 JPEGs), <code>tenantRouteMap</code> in <code>common/lib/use-handle-flex-navigation-with-tenant.ts</code>, <code>common/styles/themes/espn.ts</code> for Stitches tokens, and <code>common/dictionary/data/espn/index.ts</code> for fallback copy.</p>

      <h3 id="mechanism-remote-config">2. Remote Config per Brand</h3>
      <p>Sparrow is the brand-config source of truth at runtime. Each brand owns an S3 workspace — <code>commerce-disneyplus</code>, <code>commerce-hulu</code>, <code>commerce-espn</code> — and the shared library never names one:</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts
const sparrowMergedConfig = await getSparrowMergedConfig<CommerceAppConfig>({
  ...sparrowRequestConfig,
  variant: backendService,
  // Commerce workspace names are always lowercase.
  // 'disneyPlus' -> 'commerce-disneyplus'; for espn/hulu the lowercase is a no-op.
  workspace: \`commerce-\${productName.toLowerCase()}\`,
});`}
        lang="typescript"
        filename="load-sparrow-config.ts"
      />
      <p>What lands in <code>commerceAppConfig</code> is where most real divergence lives: <code>paths</code> (ESPN&apos;s <code>plan_select</code> is an external ESPN URL, not an in-CUP route), <code>feature-configuration.dictionary.dictionaryTenant</code>, <code>supportedLangsMap</code> (ESPN supports exactly <code>en</code> and <code>es-419</code> while the Disney+ workspace carries dozens of locales), and the <code>countries</code> scope — ESPN and Hulu each ship 8 country keys, the US plus 7 territories, while Disney+ has 244.</p>
      <p>The tradeoff is real: Sparrow values are <em>not in the repo</em>. The fixtures under <code>common/lib/sparrow/__fixtures__/espn/</code> are illustrative test baselines, not production truth. Treat any flag default you read there as a hypothesis.</p>

      <h3 id="mechanism-flags-routes">3. Feature Flags and Route Gating</h3>
      <p>The cleanest way to say &quot;this feature does not exist for that brand&quot; is to let the route 404 by data. That is what <code>isRouteEnabled</code> does — it is a composition function, so the gate is declared in the page wrapper and nothing in the shared page component knows a brand was involved:</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts
export function isRouteEnabled({ featureFlagName }: { featureFlagName: RouteEnablingFeatureFlags }): CompositionFunction {
  return function _isRouteEnabled(commerceAppConfig) {
    const { 'feature-flags': { general: featureConfig } } = commerceAppConfig;
    if (featureConfig[featureFlagName as keyof FeatureFlagsScope['feature-flags']['general']]) return {};
    return { notFound: true };   // Next renders a 404
  };
}

// apps/commerce/espn/pages/commerce/welcome-back/index.page.tsx
export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedWelcomeBack' }),
  getLayoutConfigProp,
]);`}
        lang="typescript"
        filename="is-route-enabled.ts"
      />
      <p>42 of ESPN&apos;s 79 page files carry a gate like this. Two flag systems feed them, and knowing which is which saves hours. <strong>Sparrow</strong> flags are camelCase keys under <code>feature-flags.general</code> and drive route enablement and market gating. <strong>WeaponX / Mystique</strong> flags are <code>wpnx-*</code> strings delivered by the BamTech browser SDK and drive experiments and rollouts. Disney+ and ESPN have WeaponX; Hulu uses Spearmint instead. So &quot;where is this flag&quot; has a brand-dependent answer, which is itself a divergence you must reason about.</p>

      <h3 id="mechanism-providers">4. Brand-Conditional Providers</h3>
      <p>Some differences are not values but <em>implementations</em>. The mechanism for those is to choose the implementation once, in the app shell, and hand a brand-agnostic interface to the library:</p>
      <CodeBlock
        code={`// apps/commerce/espn/src/layout/espn-layout.tsx (shape, abbreviated)
<BrowserMocks>
  <HydrateAvatarFallbackStyle avatarFallbackStyle="letter" />  {/* shared component, ESPN value */}
  <HydrateESPNDeviceAttributeProvider>                         {/* ESPN-only provider */}
    <HydrateDataInterface dictionary={dictionary}>             {/* @solo/data-interface-espn */}
      <LoadAnalytics />
      <LanguageRedirect>{children}</LanguageRedirect>
    </HydrateDataInterface>
  </HydrateESPNDeviceAttributeProvider>
</BrowserMocks>`}
        lang="tsx"
        filename="espn-layout.tsx"
      />
      <p>The most instructive version of this mechanism is <code>@solo/data-interface-espn</code>. ESPN has no profiles onboarding and no Orchestration-API marketing preferences, so rather than teaching shared code about that, the ESPN data interface returns <strong>fake-but-valid envelopes</strong> that keep the brand-agnostic flows from ever needing a branch:</p>
      <CodeBlock
        code={`// packages/cgi/data-interface-espn/src/identity/operations/get-account-onboarding-status.ts
/** ESPN does not support content onboarding via the Orchestration API,
 *  so we return a no-op response indicating no onboarding is required. */
export function getAccountOnboardingStatus() {
  return Promise.resolve(accountOnboardingStatusResult); // { activeProfile: null, profiles: [] }
}

// .../get-marketing-preferences.ts
/** We hard-code ESPN users' marketing preferences to ensure that they are
 *  not taken through our review-and-accept page. */
export function getMarketingPreferences() {
  return Promise.resolve(marketingPreferences); // eligibleForOnboarding + isOnboarded: true
}`}
        lang="typescript"
        filename="data-interface-espn no-op operations"
      />
      <p>This is genuinely elegant: the divergence is real and behavioural, but it is expressed as a <em>different implementation of the same interface</em> rather than a conditional in the caller. The cost is discoverability — a newcomer debugging why ESPN skips review-and-accept will not find the answer in <code>commerce-base</code> at all.</p>

      <h3 id="mechanism-hardcoded">5. Hardcoded Conditionals</h3>
      <p>The escape hatch. Three exist for ESPN in all of <code>commerce-base</code>. Read a good one and a bad one side by side:</p>
      <CodeBlock
        code={`// GOOD -- payments/payment-forms/components/payments-container/payments-container.tsx:797-801
// Card-number-first is the productionalized default for Disney+ (all regions)
// and ESPN (US-only at the platform level). GREAT-1076.
const partnerName = sessionInfoQuery.data?.partnerName;
const shouldShowCardNumberFieldFirst = partnerName === 'disney' || partnerName === 'espn';

// BAD -- common/hooks/use-navigation-redirect.tsx:208
// TODO (EFACCTMGMT-420): Remove hardcoded logic for marketing onboarding in ESPN tenant
if (rawMeQueryResponse && hardcodedQueries.includes('orchestrationApi.query.me.reviewAndAccept')) {
  // mutates the React Query cache object in place, not a copy
  rawMeQueryResponse.me.identity.flows.marketingPreferences.eligibleForOnboarding = true;
  rawMeQueryResponse.me.identity.flows.marketingPreferences.isOnboarded = true;
}`}
        lang="typescript"
        filename="good-and-bad-hardcoded-branches.ts"
      />
      <p>The first is defensible: field ordering is <strong>presentational</strong>, the branch names the productionalized state of a specific experiment, and it cites the ticket. Its sibling in <code>change-payment-forms-container.tsx</code> hardcodes ESPN but keeps Disney+ behind an experiment hook until GREAT-842 productionalizes — so the branch documents a <em>rollout state</em>, not a brand truth, and it carries a removal ticket.</p>
      <p>The second is not defensible, and its own comment says so. It is <strong>behavioural</strong> (it changes which pages a user visits), it mutates shared cache state, and the correct home for it was the ESPN data interface — which, note, is exactly where the same fact is <em>already</em> expressed properly by <code>getMarketingPreferences</code>. Two mechanisms encoding one truth is how you get contradictory behaviour.</p>

      <h2 id="code-present-never-invoked">The Sixth Shape: Code Present, Never Invoked</h2>
      <p>There is a variant of the fifth mechanism that deserves its own name, because it is invisible to every technique in this module so far. Sometimes a brand difference is expressed not by a branch and not by a config value, but by the fact that <strong>nobody ever calls the code</strong>. The shared code is compiled in, it is reachable through components the brand renders, and it still can never run — because a precondition is never satisfied.</p>
      <p>The authentication stack is the canonical case. ESPN authenticates through the <strong>OneID v4 script</strong>; Disney+ authenticates through the <strong>Identity v5 SDK</strong> (<code>@disney-identity/sdk-web</code>). Two things combine to produce that split, and neither is an <code>if</code>:</p>
      <CodeBlock
        code={`// 1) CONFIG -- the ESPN Sparrow workspace turns the v5 SDK off and names OneID instead.
// packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/
//   sparrow-commerce-espn-workspace.ts:170-172
identitySDK: null,
oneId: {
  clientId: 'ESPN-ONESITE.WEB',
  scriptUrl: 'https://stg.cdn.registerdisney.go.com/v4/OneID.js',
},

// ...whereas the Disney+ workspace fixture at :3154-3157 supplies the whole v5 block:
identitySDK: {
  environment: 'qa',
  scriptUrl: 'https://cdn-qa.disneyaccount.com/v5/sdk.js',
  clientId: 'DTCI-DISNEYPLUS.WEB',
  // ...enabled, rolloutPercentage, featureFlows
},`}
        lang="typescript"
        filename="identity-config-divergence.ts"
      />
      <CodeBlock
        code={`# 2) CALL SITE -- the shared v5 hydration hook is only *called* by Disney+ layouts.
grep -rn "useHydrateIdentitySDKConfig" apps/commerce/*/src --include='*.tsx' | grep -v '\\.test\\.'

apps/commerce/disneyPlus/src/layout/disney-layout.tsx:7               (import)
apps/commerce/disneyPlus/src/layout/disney-layout.tsx:127             useHydrateIdentitySDKConfig()
apps/commerce/disneyPlus/src/common/layouts/legacy-application-layout.tsx:107  useHydrateIdentitySDKConfig()
# apps/commerce/espn  -> ZERO matches
# apps/commerce/hulu  -> ZERO matches

# Yet the reauth handler that DEPENDS on that hydration is shared, and is imported
# by three commerce-base components that ESPN absolutely does render:
grep -rn "useIdentitySDKReauthHandler" packages/cgi/commerce-base/src | grep -v '\\.test\\.'

common/components/site-header/hooks/use-header-dropdown.tsx:60
profiles/common/components/action-grant-guard/use-action-grant-guard.ts:40
account/account-details/components/identity/restrict-profile-creation-item.tsx:59`}
        lang="bash"
        filename="identity-call-site-grep.sh"
      />
      <MermaidDiagram
        chart={identityDivergenceDiagram}
        title="Code Present, Never Invoked: the Identity v5 Reauth Path on ESPN"
        caption="ESPN renders the components that call the shared reauth handler, but no ESPN layout ever hydrates the SDK config, so the handler can only ever throw."
        minHeight={550}
      />
      <p>Trace the consequence. On ESPN, <code>use-identity-sdk-reauth-handler.ts</code> is present, is imported by components ESPN renders, and its very first guard is <code>if (sdkStatus !== &apos;ready&apos; || !sdkInstance) throw &apos;IdentitySDK not ready&apos;</code>. Because no ESPN layout calls <code>useHydrateIdentitySDKConfig</code> and Sparrow sets <code>identitySDK: null</code>, that guard is the only branch the handler can ever take on ESPN. The v5 reauth and passkey flows are physically shipped in the ESPN bundle and functionally unreachable.</p>
      <ArticleTable caption="The auth stack per brand: divergence by config plus call site, with no brand conditional anywhere." minWidth={1000}>
        <table>
          <thead>
            <tr><th>Aspect</th><th>Disney+</th><th>Hulu</th><th>ESPN</th></tr>
          </thead>
          <tbody>
            <tr><td>Auth client</td><td>Identity v5 SDK (<code>@disney-identity/sdk-web</code>)</td><td>Separate Hulu identity stack (<code>packages/identity-hulu</code>)</td><td>OneID v4 script</td></tr>
            <tr><td>Sparrow <code>identitySDK</code></td><td>Full block: environment, scriptUrl, clientId, rollout</td><td>Not applicable</td><td><code>null</code></td></tr>
            <tr><td>Client id</td><td><code>DTCI-DISNEYPLUS.WEB</code></td><td>Hulu-managed</td><td><code>ESPN-ONESITE.WEB</code></td></tr>
            <tr><td><code>useHydrateIdentitySDKConfig</code> call sites</td><td>2 (<code>disney-layout.tsx:127</code>, <code>legacy-application-layout.tsx:107</code>)</td><td>0</td><td><strong>0</strong></td></tr>
            <tr><td>v5 reauth / passkey</td><td>Live</td><td>Not applicable</td><td>Shipped in the bundle, unreachable — throws <code>IdentitySDK not ready</code></td></tr>
            <tr><td>Mechanism</td><td>—</td><td>—</td><td><strong>Config + call site</strong>, zero brand conditionals</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Why this shape matters for your judgment: it is the <em>cleanest</em> way to diverge (nothing in the shared library knows a brand exists) and simultaneously the <em>hardest to audit</em>. A grep for <code>launchReauth</code> in the ESPN app finds shared code and tells you nothing. To answer &quot;does ESPN use v5 reauth&quot; you have to check three things — is the config populated, is the hydration hook called, and is the consuming component rendered. Add this to your review checklist: when a diff makes shared behaviour conditional on hydrated state, ask which brands actually hydrate it.</p>

      <h2 id="wrong-vs-right">Wrong vs Right: Refactoring a Brand Conditional</h2>
      <p>The requirement: after a successful signup, each brand sends the user to a different destination.</p>
      <CodeBlock
        code={`// WRONG -- a brand conditional in shared library code.
// packages/cgi/commerce-base/src/account/success/lib/post-signup-destination.ts

export function usePostSignupDestination(): string {
  const partnerName = useSessionInfo().data?.partnerName;

  if (partnerName === 'espn') { return 'https://plus.espn.com/watch/'; }
  if (partnerName === 'hulu') { return 'https://www.hulu.com/hub/home'; }
  return 'https://www.disneyplus.com/home';   // <-- silent fallback
}`}
        lang="typescript"
        filename="post-signup-destination.WRONG.ts"
      />
      <p>Four defects, in increasing order of how long they take to find:</p>
      <ul>
        <li><strong>Hardcoded production URLs.</strong> There is no way to point this at a QA or staging host, so nobody can test it end to end.</li>
        <li>
          <strong>Wrong namespace.</strong> <code>partnerName</code> is <em>session-derived</em>, not app-derived. An ESPN-app request can legitimately observe <code>partnerName === &apos;disney&apos;</code> — a Disney+ subscriber managing an ESPN-linked account. Asking &quot;who is this user&quot; and getting back &quot;which app am I&quot; is a category error.
        </li>
        <li><strong>A fourth brand edits shared code.</strong> Every new tenant means a PR into <code>commerce-base</code> and a re-review by the platform team.</li>
        <li>
          <strong>The silent fallback is the real bug.</strong> Any brand that is not ESPN or Hulu — including an unknown one, or a request where the session has not resolved — goes to Disney+. An ESPN-only test passes perfectly while Disney+ is the one brand the default was never verified for.
        </li>
      </ul>
      <CodeBlock
        code={`// RIGHT -- the same difference, expressed as data.
// commerce-base reads a path KEY; each brand's Sparrow workspace supplies the
// VALUE, per environment, with no code deploy.

export function usePostSignupDestination(): string | undefined {
  const commerceAppConfig = useAtomValue(commerceAppConfigAtom);

  // 'onboarding' is defined once per brand under paths.paths.commerce:
  //   espn       -> the ESPN watch app for that environment
  //   hulu       -> the Hulu hub
  //   disneyPlus -> the D+ home page
  return commerceAppConfig.paths.paths.commerce.onboarding;
}

// No brand literal. No fallback that guesses. A missing key surfaces as
// undefined at the call site -- a visible, testable absence rather than a
// confident redirect to the wrong brand.`}
        lang="typescript"
        filename="post-signup-destination.RIGHT.ts"
      />
      <p>This is not a hypothetical refactor — it is how the real code already works. ESPN&apos;s entitled-user redirect in <code>identity/loading</code> resolves through <code>commerceAppConfig.paths.paths.commerce.onboarding</code>, and the jest suite <code>identity/loading/pages/loading-page.espn.test.tsx</code> asserts it by mocking the config value, not by mocking a brand.</p>

      <h2 id="where-branches-cluster">Where Hardcoded Branches Legitimately Cluster</h2>
      <p>Dogma is not the lesson. The correct brand conditionals cluster in four recognisable places:</p>
      <ul>
        <li><strong>Payment field ordering.</strong> Card-number-first vs name-first is presentational and tied to a per-brand rollout state. <code>payments-container.tsx</code>, <code>change-payment-forms-container.tsx</code>.</li>
        <li>
          <strong>Analytics payload shaping.</strong> Around fifteen sites cast Flex <code>metricsData</code> to <code>EspnAdobeAnalyticsMetricsDataModel</code> or guard with <code>isEspnMetricsData()</code>, because ESPN&apos;s Adobe schema requires <code>event_name</code>/<code>event_detail</code> fields the others do not send. This is <em>vendor-shaped</em> divergence — an external contract imposes it.
        </li>
        <li>
          <strong>Consent vendor group ids.</strong> <code>common/hooks/use-has-one-trust-consent.ts:18-19</code> documents it in the docblock: group <code>&apos;4&apos;</code> is the targeting-and-advertising signal for Disney+, but <code>&apos;C0004&apos;</code> for ESPN and Hulu. Nobody chose that asymmetry — OneTrust did. Regulatory and vendor-shaped divergence is the category where a literal is usually the honest answer.
        </li>
        <li>
          <strong>Activation.</strong> ESPN Internal Activation is an entry point only ESPN has, and it is done well: <code>transactional/activation/hooks/use-espn-internal-activation-params.ts</code> is a facade behind a Sparrow flag, so the whole flow can be killed without a deploy and every consumer reads through one hook.
        </li>
        <li>
          <strong>Targeted account-mutation fixes tied to tickets.</strong> <code>standardizeDeviceProfile()</code> fixes a legacy bug from when ESPN and Disney were separate apps (GCIEX-8055). It is scoped, named after the defect rather than the brand, and carries a ticket.
        </li>
      </ul>
      <p>The judgment call reduces to one question: <strong>is the difference presentational, regulatory, or vendor-shaped — or is it behavioural?</strong> The first three are often genuinely unavoidable in code because somebody else owns the shape. Behavioural differences — which pages a user sees, which requests fire, what happens on success — almost always belong in config, because they are exactly what product wants to change without a deploy. A useful secondary test: can you name the condition after the <em>capability</em> instead of the brand? <code>shouldShowCardNumberFieldFirst</code> is fine. <code>isEspn</code> is not — it tells a future reader nothing about why.</p>

      <h2 id="theming-by-build">Theming Diverges by Build, Not Runtime</h2>
      <p>Theming looks like it should be the cleanest mechanism of all — swap a token set, done. In practice it is the one where brand leaks hide, because the divergence happens at <strong>build time</strong> and therefore never appears in any runtime conditional you could grep for.</p>
      <p>There is no app-wide <code>ThemeProvider</code> and no runtime theme switch in production. Each app is a <strong>single-tenant build</strong>: ESPN&apos;s <code>_document</code> computes its theme class once at module scope and stamps it on <code>&lt;body&gt;</code>, and the Tailwind config bakes literal colour values in at compile time.</p>
      <CodeBlock
        code={`// apps/commerce/espn/pages/_document.page.tsx:3,17,61
import { espn as espnTheme } from '@solo/commerce-base/src/common/styles/themes';

// Computed at MODULE scope, not in React -- avoids a flash of unstyled content (WEB-2277)
const defaultClassName = createTheme(espnTheme.theme).className;
// ...
<body className={defaultClassName}>`}
        lang="tsx"
        filename="_document.page.tsx"
      />
      <p>The token pipeline makes ESPN the odd brand out in a way that is easy to miss. <code>packages/cgi/cgi-design-tokens/scripts/build.ts</code> declares five theme configurations, and the emitted CSS selector is derived from an optional <code>dataTheme</code> field — <strong>ESPN is the only entry without one</strong>:</p>
      <CodeBlock
        code={`// packages/cgi/cgi-design-tokens/scripts/build.ts:41-70
const tokenSets: Array<ThemeConfiguration> = [
  { themeName: 'disney',       sourceFiles: [...], dataTheme: 'dark'  },
  { themeName: 'disney-light', sourceFiles: [...], dataTheme: 'light' },
  { themeName: 'hulu',         sourceFiles: [...], dataTheme: 'light' },
  { themeName: 'hulu-dark',    sourceFiles: [...], dataTheme: 'dark'  },
  { themeName: 'espn',         sourceFiles: [...] },              // <-- no dataTheme
];

// ...which drives the emitted selector:
selector: dataTheme ? \`.\${themeName}, [data-theme="\${dataTheme}"]\` : \`.\${themeName}\`

// Emitted result:
//   dist/disney.css -> .disney, [data-theme="dark"]  {
//   dist/hulu.css   -> .hulu,   [data-theme="light"] {
//   dist/espn.css   -> .espn {                          <-- no data-theme alias, no light theme`}
        lang="typescript"
        filename="cgi-design-tokens/scripts/build.ts"
      />
      <p>Two consequences. ESPN has <strong>no light theme at all</strong> — Disney+ and Hulu each ship a light and a dark token set, ESPN ships one. And any shared component that styles itself off <code>[data-theme=&quot;dark&quot;]</code> rather than the brand class will silently no-op on ESPN, because that selector is never emitted for ESPN. That is a divergence with no code, no flag, and no config value — it lives in a missing object property.</p>
      <p>Build-time theming is also where genuine <strong>brand leaks</strong> survive review, because a leaked asset path is still valid CSS. Two live examples, both verified in the current tree:</p>
      <CodeBlock
        code={`// LEAK 1 -- ESPN's own Tailwind config points two utilities at Disney+ assets.
// apps/commerce/espn/tailwind.config.cjs:1486,1490
'.bg-content-icon': {
  backgroundImage:
    'url("https://static-assets.bamgrid.com/product/disneyplus/images/content-icon.<hash>.svg")',
},
'.bg-pause-icon': {
  backgroundImage:
    'url("https://static-assets.bamgrid.com/product/disneyplus/images/pause-icon.<hash>.svg")',
},
// The other 11 asset utilities in the same file correctly use product/espn/.
// Nothing fails, nothing warns -- an ESPN user just sees a Disney+ icon.

// LEAK 2 -- four shared components hardcode the Disney+ theme, including the
// wallet modal, which is ESPN-ONLY ("walletCTA is only defined for ESPN.
// For Disney it will be omited." -- change-payment-page.tsx:115).
payments/wallet/.../wallet-modal-container.tsx:141   <ThemeProvider themeName="disneyPlus">
identity/magic-link/components/magic-link-switch-account.tsx:91   themeName="disneyPlus"
identity/review-and-accept/components/logout-modal.tsx:40         themeName="disneyPlus"
signup/student/student-loading-content.tsx:264                    themeName="disneyPlus"`}
        lang="typescript"
        filename="brand-leaks.ts"
      />
      <p>Leak 2 is the more interesting one for your judgment, because it is <em>deliberate</em>. The comment above the wallet line reads: &quot;Here themeName is hardcoded and it was a conscious decision by design to follow that for all products&quot;. So a documented design decision produces an ESPN-only surface rendered in Disney+ theme tokens. Is that a bug or a choice? Reasonable engineers disagree — and that is precisely why the rule is to make the decision explicit and cite it, rather than to ban literals. What you must not accept in review is the same line <em>without</em> that comment.</p>

      <h2 id="four-namespaces">The Four Brand Namespaces Trap</h2>
      <p>This is the trap that most reliably ships a bug. There is no single brand enum in this codebase. There are four primary namespaces plus several secondary ones, they have different <em>sources</em>, and their string values do not agree.</p>
      <MermaidDiagram
        chart={namespacesDiagram}
        title="Four Brand Namespaces: Source on the Left, Consumers on the Right"
        caption="The dotted edge is the whole trap: ProductName says disneyPlus where partner says disney."
        minHeight={550}
      />
      <ArticleTable caption="The same brand, spelled up to seven different ways. ESPN's spellings all coincide; Disney+'s do not." minWidth={1020}>
        <table>
          <thead>
            <tr><th>Namespace</th><th>Disney+</th><th>Hulu</th><th>ESPN</th><th>Source of truth</th><th>Use it for</th></tr>
          </thead>
          <tbody>
            <tr><td><code>ProductName</code> / <code>PRODUCT</code></td><td><code>disneyPlus</code></td><td><code>hulu</code></td><td><code>espn</code></td><td><code>packages/developer-experience/types/src/index.d.ts:155</code></td><td>&quot;Which app am I?&quot; — server config, Sparrow workspace, mocks</td></tr>
            <tr><td><code>partner</code> / <code>partnerName</code></td><td><code>disney</code></td><td><code>hulu</code></td><td><code>espn</code></td><td>Glimpse config + BAMTech session (<code>useSessionInfo</code>)</td><td>&quot;Whose account is this?&quot; — never as a stand-in for the app</td></tr>
            <tr><td><code>tenant</code></td><td><code>disney</code></td><td><code>hulu</code></td><td><code>espn</code></td><td><code>common/services/flex/models/actions.types.ts:116</code></td><td>Footer (<code>@solo/footer</code>), Flex <code>navigateWithTenant</code>, Datadog</td></tr>
            <tr><td><code>ThemeName</code></td><td><code>disneyPlus</code></td><td><code>hulu</code></td><td><code>espn</code></td><td><code>common/styles/stitches.config.ts:69</code> (plus <code>base</code>)</td><td>Stitches theme tokens, student branding, icon variants</td></tr>
            <tr><td>Design-token theme name</td><td><code>disney</code> / <code>disney-light</code></td><td><code>hulu</code> / <code>hulu-dark</code></td><td><code>espn</code> only</td><td><code>cgi-design-tokens/scripts/build.ts:41-70</code></td><td>Emitted CSS class and <code>[data-theme]</code> alias</td></tr>
            <tr><td><code>MetadataAppName</code></td><td><code>disney</code></td><td><code>hulu</code></td><td><code>espn</code></td><td><code>build-get-server-side-props.ts:55-59</code></td><td>SEO / Open Graph app name only</td></tr>
            <tr><td><code>DictionaryTenant</code></td><td><code>disney</code></td><td><code>hulu</code></td><td><code>espn</code></td><td><code>packages/dictionary/src/models/dictionary.ts:51</code></td><td>Cypher copy requests — tenant isolation happens server-side</td></tr>
            <tr><td>Sparrow workspace</td><td><code>commerce-disneyplus</code></td><td><code>commerce-hulu</code></td><td><code>commerce-espn</code></td><td><code>load-sparrow-config.ts</code> — lowercased <code>ProductName</code></td><td>Remote config fetch; never hand-write the string</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Read down the ESPN column: every value is <code>espn</code>. Read down the Disney+ column: <code>disneyPlus</code>, <code>disney</code>, <code>disney</code>, <code>disneyPlus</code>, <code>disney</code>, <code>disney</code>, <code>disney</code>, <code>commerce-disneyplus</code>. That asymmetry is the entire hazard: <strong>an ESPN-only test can pass while Disney+ breaks</strong>, because ESPN is the one brand for which crossing namespaces is invisible.</p>
      <p>Rule of thumb: use <strong><code>ProductName</code> when the question is &quot;which app is serving this request&quot;</strong> (server-side, config, mocks); <strong><code>partnerName</code> only when the question is genuinely about the user&apos;s account</strong>; <strong><code>tenant</code> when talking to the footer or Flex</strong>; <strong><code>ThemeName</code> only for styling</strong>. If you find yourself converting between two of them, that conversion belongs in a named helper with a test, not inline.</p>

      <h2 id="product-default-hazard">The PRODUCT Default Hazard</h2>
      <p><code>PRODUCT</code> is the primary tenant switch, set in a committed <code>.env</code> file — <code>apps/commerce/espn/.env:20</code> contains <code>PRODUCT=espn</code>. Two places in shared code silently default it:</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/next.config.js:19
const productName = process.env.PRODUCT ?? 'disneyPlus';

// packages/cgi/commerce-base/src/common/lib/get-product-name-for-mocks.ts:19-21
// "Finally, if none of the previous values are available we default to 'disneyPlus'."
return (process.env.PRODUCT ?? publicRuntimeConfig?.productNameForMocks ?? 'disneyPlus') as ProductName;

// The one place that behaves correctly -- it throws:
//   build-get-server-side-props.ts:293-299  getInitialGlimpseConfig()`}
        lang="typescript"
        filename="product-default-hazard.ts"
      />
      <p>A missing <code>PRODUCT</code> in an ESPN context therefore does not fail. You get Disney+ mocks, Disney+ config defaults, and a plausible page that is quietly the wrong brand. ESPN and Disney+ both depend on dotenv loading for <code>PRODUCT</code>, whereas Hulu sets it inline in its dev script (<code>PRODUCT=hulu next dev</code>) — so any tooling path that bypasses dotenv loses the ESPN tenant and gains Disney+ without saying so. As the testing section shows, one such path is a script you probably run every day.</p>
      <p>State the principle plainly: <strong>a silent brand fallback is strictly worse than a crash.</strong> A crash costs one engineer ten minutes. A silent fallback produces a working-looking page, passing tests, and a bug report three weeks later that says &quot;prices are wrong on ESPN&quot;. When you add a brand-keyed lookup, prefer throwing on an unknown key to defaulting to a brand.</p>

      <h2 id="divergence-inventory">Behavioural Divergence Inventory</h2>
      <p>The reference table. Every row is a real difference between the three brands, paired with the mechanism that expresses it — because the mechanism tells you where to go to change it.</p>
      <ArticleTable caption="Concrete divergences and the mechanism each one uses. The mechanism column is the actionable part." minWidth={1120}>
        <table>
          <thead>
            <tr><th>Difference</th><th>Disney+</th><th>Hulu</th><th>ESPN</th><th>Mechanism</th></tr>
          </thead>
          <tbody>
            <tr><td>Page files in <code>pages/</code></td><td>106</td><td>63</td><td>79</td><td>File presence in the app shell (build-time)</td></tr>
            <tr><td><code>/commerce/plans</code></td><td>In-CUP plan selector</td><td>In-CUP plan selector</td><td><strong>404</strong> — paywall lives on <code>plus.espn.com/watch/offers</code></td><td>Sparrow flag <code>enableCommerceUnifiedPlans</code> + <code>isRouteEnabled</code></td></tr>
            <tr><td><code>/commerce/welcome-back</code></td><td>In CUP</td><td>Not mounted</td><td>Flag off; resolves out to <code>espn.com/watch/</code></td><td>Sparrow flag + Sparrow <code>paths.welcome_back</code></td></tr>
            <tr><td><strong>Auth client</strong></td><td>Identity v5 SDK</td><td>Separate Hulu identity stack</td><td>OneID v4 script; <code>identitySDK: null</code></td><td><strong>Config + call site</strong> — no conditional anywhere</td></tr>
            <tr><td><strong>v5 reauth / passkey</strong></td><td>Live</td><td>Not applicable</td><td>Shipped but unreachable — throws <code>IdentitySDK not ready</code></td><td><strong>Code present, never invoked</strong></td></tr>
            <tr><td>Unauthenticated bounce target</td><td><code>/identity/login</code></td><td>Separate Hulu identity stack</td><td><code>/identity/sign-up</code></td><td>App-shell prop <code>authRedirectTarget</code> on <code>LoginRequired</code></td></tr>
            <tr><td>Idle redirect on the ledger</td><td>Yes</td><td>No</td><td>Yes</td><td>App-shell arg <code>shouldIdleRedirect</code> into <code>getBillingPageProps</code></td></tr>
            <tr><td>Billing maintenance switch</td><td><code>enableSignUpMaintenance</code></td><td><code>enableSignUpMaintenance</code></td><td>None — no <code>maintenance</code> block</td><td>Static page property declared in the shell</td></tr>
            <tr><td>V2 ledger (FTC 2025) flag source</td><td>WeaponX</td><td>Sparrow <code>enableCommerceUnifiedFtcRegulationUpdates</code></td><td>WeaponX only — absent from ESPN Sparrow</td><td>Two different flag systems, one feature</td></tr>
            <tr><td>Experiment platform</td><td>WeaponX</td><td>Spearmint</td><td>WeaponX</td><td>Per-brand experiment vendor</td></tr>
            <tr><td><strong>Analytics vendor</strong></td><td><strong>Glimpse</strong> (28 refs)</td><td><strong>HITS + Tealium</strong> (18 + 9 refs)</td><td><strong>Adobe Analytics + Adobe Launch</strong> (9 + 6); Glimpse present but 0 ESPN-authored events; 0 HITS, 0 Tealium files</td><td>Per-brand provider opt-in from <code>@solo/instrumentation</code></td></tr>
            <tr><td>Analytics on the ledger specifically</td><td>CoreAnalytics</td><td>CoreAnalytics</td><td>Legacy Adobe behind <code>wpnx-enable-legacy-analytics-espn</code></td><td>WeaponX flag + ESPN-shaped Adobe payload casts</td></tr>
            <tr><td>Supported locales</td><td>Dozens</td><td>Several</td><td>Exactly 2: <code>en</code>, <code>es-419</code></td><td>Sparrow <code>supportedLangsMap</code></td></tr>
            <tr><td>Markets</td><td>244 country keys</td><td>8 (US + 7 territories)</td><td>8, all <code>parentCountry: US</code></td><td>Sparrow <code>countries</code> scope</td></tr>
            <tr><td><strong>Light theme</strong></td><td>Yes (<code>disney-light</code>)</td><td>Yes (<code>hulu</code> is light, <code>hulu-dark</code> dark)</td><td><strong>None</strong> — only entry with no <code>dataTheme</code>, so no <code>[data-theme]</code> alias emitted</td><td>Missing property in the token build config</td></tr>
            <tr><td>Profiles onboarding status</td><td>Real Orchestration API</td><td>Real Orchestration API</td><td>No-op stub: <code>activeProfile: null</code></td><td>Data-interface implementation swap</td></tr>
            <tr><td>Marketing preferences</td><td>Real query</td><td>Real query</td><td>Hardcoded <code>isOnboarded: true</code> — skips review-and-accept</td><td>Data-interface swap <em>and</em> a duplicate hardcoded hack</td></tr>
            <tr><td>Card-number field first</td><td>Productionalized (<code>=== &apos;disney&apos;</code>)</td><td>No</td><td>Productionalized (<code>=== &apos;espn&apos;</code>)</td><td><strong>Hardcoded conditional</strong> — GREAT-1076 / GREAT-842</td></tr>
            <tr><td>OneTrust consent targeting group</td><td><code>&apos;4&apos;</code></td><td><code>&apos;C0004&apos;</code></td><td><code>&apos;C0004&apos;</code></td><td><strong>Hardcoded conditional</strong> — vendor-shaped, <code>use-has-one-trust-consent.ts:18-19</code></td></tr>
            <tr><td>Footer region / environment</td><td>Config-driven</td><td>Config-driven</td><td>Hardcoded <code>region=&quot;us&quot;</code> and <code>cannonballEnvironment=&quot;production&quot;</code></td><td>Hardcoded in the app shell — non-US ESPN needs code</td></tr>
            <tr><td>Jest fixture brand</td><td>The default</td><td>Set per test</td><td><code>coverage:jest</code> sets <code>PRODUCT=espn</code>; <code>test:jest</code> does <strong>not</strong></td><td>Test harness default — see the testing section</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="topology">Shared Library, Three Shells</h2>
      <p>Step back and the topology explains why the mechanisms rank the way they do. Commerce is <strong>not</strong> one tenant-parameterized app; it is three sibling Next.js apps over one shared library. Each shell owns its own <code>next.config.js</code>, <code>pages/</code>, <code>_document</code>, middleware, Dockerfile and Jenkins job — and each page file is typically a 20-to-30-line re-export stub.</p>
      <MermaidDiagram
        chart={topologyDiagram}
        title="Three Thin Shells Over One Brand-Agnostic Library"
        caption="Brand wiring belongs in the shells; brand values belong in the tables and workspaces below the library."
        minHeight={400}
      />
      <p>This is what makes the preference order practical rather than moralistic. The shells already exist as a legitimate home for brand-specific wiring, so &quot;move it out of the library&quot; is almost never a request to invent an abstraction — it is a request to move three lines up one level. ESPN&apos;s own <code>buildGetServerSideProps</code> wrapper at <code>apps/commerce/espn/src/common/build-get-server-side-props/</code> is the canonical example: it holds the two genuinely ESPN-only SSP behaviours — the generated SSR dictionary-key allowlist and footer-preview injection — and carries a comment declaring itself the only file permitted to import the base version.</p>
      <p>It also explains the &quot;code present, never invoked&quot; shape. Because the library is compiled into all three shells but <em>wired</em> by each shell independently, the set of code a brand ships is always larger than the set of code a brand runs. That gap is where divergence hides from grep.</p>

      <h2 id="decision-procedure">How to Add a Brand Difference Safely</h2>
      <p>Walk this tree before you write the code, not after you have written it and are looking for permission.</p>
      <MermaidDiagram
        chart={decisionTreeDiagram}
        title="Where Should This Brand Difference Live?"
        caption="The two rhombi that matter most are the last two: presentational-or-behavioural, and can-you-name-it-as-a-capability."
        minHeight={550}
      />
      <ol>
        <li><strong>State the difference as a sentence with no brand name in it.</strong> &quot;The post-signup destination varies&quot; is a config key. &quot;ESPN goes to the watch app&quot; is a branch waiting to happen.</li>
        <li><strong>Check whether the difference already exists somewhere.</strong> The marketing-preferences case is encoded twice — correctly in the data interface and again as a cache mutation. Duplicating a divergence is worse than either mechanism alone.</li>
        <li><strong>Pick the highest mechanism that can express it</strong> using the tree above.</li>
        <li><strong>If you land on a hardcoded conditional, pay the four tolls:</strong> name the variable after the capability, choose the namespace deliberately, cite the ticket in a comment, and add a removal plan if it encodes a rollout state.</li>
        <li><strong>If the difference is &quot;this brand never reaches this code&quot;, write that down.</strong> A gap in wiring is invisible; a comment naming which brands hydrate the precondition is the only durable record.</li>
        <li><strong>Write the test for the brands you are not changing</strong> before the one you are.</li>
      </ol>

      <h2 id="testing-obligation">The Testing Obligation and PR Review</h2>
      <p>The obligation is asymmetric and counter-intuitive: <strong>when you add an ESPN behaviour, the tests that matter most are the Disney+ and Hulu tests.</strong> ESPN is the brand whose namespaces coincide, so an ESPN-only test exercises the one path where every namespace mistake is invisible.</p>
      <p>Worse, there is a trap in the test harness itself that can make you believe you tested ESPN when you did not. The shared render helper defaults to Disney+ fixtures, and ESPN&apos;s own <code>test:jest</code> script does not set <code>PRODUCT</code>:</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/test/testing-library.tsx:384
// renderWithProviders resolves its merged commerce config like this:
getMergedConfigFixtureForProduct('disneyPlus');   // <-- the default is Disney+

// apps/commerce/espn/package.json
"coverage:jest": "echo \\"check unit coverage...\\" && PRODUCT=espn jest --coverage",   // :21  sets it
"test:jest":     "jest",                                                              // :43  does NOT`}
        lang="typescript"
        filename="test-fixture-hazard.ts"
      />
      <p>Read that carefully, because the consequence is severe: <code>pnpm -F @solo/commerce-espn test:jest</code> runs the ESPN app&apos;s test suite against <strong>Disney+ merged-config fixtures</strong>. A developer can add an ESPN behaviour, run the ESPN test file, watch it pass, and have exercised Disney+ config the whole time. Combined with the <code>PRODUCT ?? &apos;disneyPlus&apos;</code> default from the previous section, this is the same failure mode twice — silent brand substitution at the exact moment you thought you were verifying a brand. Prefer the <code>coverage:jest</code> entry point, or set <code>PRODUCT=espn</code> explicitly.</p>
      <CodeBlock
        code={`# Minimum bar for a change that touches shared commerce-base code:
# run the OTHER two brands, not just yours -- and use the scripts that set PRODUCT.
pnpm test:commerce:jest:espn      # -> turbo coverage:jest, which sets PRODUCT=espn
pnpm test:commerce:jest:disney
pnpm test:commerce:jest:hulu

# If you must run a single file, set the brand yourself:
PRODUCT=espn pnpm -F @solo/commerce-espn test:jest -- path/to/file.test.tsx

pnpm lint:type-check:commerce:espn          # each shell has its own tsconfig
pnpm test:commerce:playwright:headless:espn # if the change is on a funnel page

# commerce-base enforces 100% jest coverage thresholds, so a new brand branch
# WILL fail CI until both arms are covered. That is a feature: it forces you to
# write the Disney+ case you were about to skip.`}
        lang="bash"
        filename="cross-brand-validation.sh"
      />
      <p>Questions to ask on any PR that adds a brand difference:</p>
      <ul>
        <li>Which of the five mechanisms is this, and was a higher one available?</li>
        <li>Which namespace does the condition read, and is that the right question — app identity or account identity?</li>
        <li>What happens for the brands not named? Is there a fallback, and is that fallback a <em>brand</em> (bad) or an absence (fine)?</li>
        <li>Is the difference presentational, regulatory, or vendor-shaped? If it is behavioural, why is it not config?</li>
        <li>If the behaviour depends on hydrated state, which brands actually hydrate it — and is that written down anywhere?</li>
        <li>Does the diff include a test for a brand other than the one in the ticket title, run through a script that sets <code>PRODUCT</code>?</li>
        <li>If this encodes a rollout state, where is the cleanup ticket?</li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how do you support three brands in one codebase without if-statements everywhere?"
        intro="Weak answers describe a theme system. Strong answers name a preference order of mechanisms and cite numbers proving the codebase actually follows it."
        steps={[
          "Open with the thesis in one sentence: brand differences live in data, code stays brand-agnostic — and the test is whether adding a fourth brand requires editing shared files.",
          "Name the mechanisms as a ranked list: brand-keyed config table, per-brand remote config, feature flags and route gating, provider or implementation swap in the app shell, and hardcoded conditional as the last resort.",
          "Give evidence, not opinion: the shared getServerSideProps pipeline and the entire signup core run three brands with zero brand conditionals; 366 brand mentions in the shared library resolve to only a handful of actual branches.",
          "Name the structural enabler: three thin app shells over one library, so brand wiring has a legitimate home one level up — you rarely need a new abstraction, just a move.",
          "Close with the failure mode you actively defend against: a silent brand fallback. Defaulting to 'disneyPlus' on a missing PRODUCT yields a plausible wrong-brand page instead of a crash.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: when is a hardcoded brand conditional acceptable?"
        intro="The trap is answering 'never' — that signals dogma. The signal an interviewer wants is a repeatable test that separates the correct branches from the lazy ones."
        steps={[
          "Give the test first: presentational, regulatory or vendor-shaped differences are often unavoidable in code because an external party owns the shape. Behavioural differences belong in config, because product wants to change them without a deploy.",
          "Give a real good example: card-number-first field ordering, productionalized per brand, named after the capability and citing its ticket. Or OneTrust consent groups, where the vendor picked '4' for one brand and 'C0004' for the others.",
          "Give a real bad example: mutating the cached me-query response in place to force ESPN's marketing-preference flags — behavioural, duplicated, and its own TODO admits it should not exist.",
          "Add the secondary test: if you cannot rename the condition after a capability instead of a brand, you have not understood the difference yet.",
          "Close with the toll any accepted branch pays: the right namespace, a capability-named variable, a ticket reference, and a test for the brands it does not name.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: how would you audit whether a brand actually uses a shared subsystem?"
        intro="This separates engineers who grep from engineers who reason about reachability. The expected wrong answer is 'search for the import'."
        steps={[
          "State the trap up front: presence, reachability, and use are three different questions, and a grep only answers the first. Shared libraries compile into every brand's bundle.",
          "Give the concrete case: the Identity v5 reauth handler is shared and imported by three components ESPN renders, yet no ESPN layout calls the hydration hook and ESPN's Sparrow config sets identitySDK to null — so the handler can only ever throw 'IdentitySDK not ready'.",
          "Give the second case, which cuts the other way: Glimpse code runs in ESPN commerce as inherited layout plumbing, but ESPN authors zero Glimpse events — the symbol is present and even executing, and still not the brand's analytics stack.",
          "Name the three checks you would actually run: is the config populated for this brand, is the initialisation or hydration hook called in this brand's shell, and is the consuming component on a route this brand mounts.",
          "Close with the review implication: when a diff makes shared behaviour depend on hydrated state, require a comment naming which brands hydrate it — wiring gaps leave no other trace.",
        ]}
      />

      <h2 id="challenge">Challenge: The Idle Warning Modal</h2>
      <InterviewChallenge
        title="Add a brand-specific idle warning to the shared ledger"
        scenario={
          <>
            Product wants this on <code>/commerce/billing</code>: ESPN shows a 90-second warning modal before the existing idle redirect fires; Disney+ keeps its current silent redirect with no modal; Hulu has no idle behaviour at all and must not gain one. Today the difference is one argument — the ESPN and Disney+ page wrappers pass <code>shouldIdleRedirect: true</code> into <code>getBillingPageProps</code> and Hulu passes <code>false</code> — and <code>billing-content.tsx</code> mounts <code>IdleTimeRedirect</code> off that prop. A teammate has opened a PR adding <code>const showWarning = partnerName === &apos;espn&apos;;</code> inside <code>IdleTimeRedirect</code> in the shared library.
          </>
        }
        tasks={[
          "Decide which of the five mechanisms this belongs in, and justify why the one above it in the ranking cannot express it.",
          "Explain concretely what breaks for Disney+ and Hulu under the teammate's approach, including the case where the session has not resolved yet.",
          "Name the namespace error in the teammate's line, and say whether brand identity is even the right question here.",
          "Design the prop or config shape you would ship instead, and say who owns changing the 90-second value later.",
          "State the testing obligation: which brands' test suites must change in this PR, what each one asserts, and which script you would run so the fixtures are actually ESPN's.",
        ]}
        pitfalls={[
          "Answering 'never hardcode' without engaging with the three ESPN hardcoded branches that legitimately exist in production today.",
          "Reaching for a Sparrow boolean flag when the difference carries a duration — a boolean-shaped answer to a number-shaped question.",
          "Assuming partnerName tells you which app is running. An ESPN-app request can legitimately observe partnerName === 'disney'.",
          "Testing only ESPN, which is the one brand where every namespace mistake is invisible.",
          "Running pnpm -F @solo/commerce-espn test:jest and believing you tested ESPN — that script does not set PRODUCT, so the fixtures are Disney+.",
          "Putting the warning inside IdleTimeRedirect at all, when that component's job is 'redirect on idle' and the divergence is presentation around it.",
        ]}
        signal="A strong candidate refuses the branch-or-no-branch framing and reframes: the difference is presentational, so code is a fine home — but it is parameterised by a duration and a boolean, so it belongs as props threaded from the app shell, exactly like shouldIdleRedirect already is. They spot that Hulu passes false and is unaffected either way, but that Disney+ passing true means the teammate's default silently decides Disney+ behaviour. They extend the seam that already exists rather than inventing one, and they catch that the obvious local test command runs with the wrong brand's fixtures."
      />
      <SolutionReveal difficulty="hard">
        <p><strong>Mechanism 4, not 5.</strong> The difference is presentational (a modal), so code is a defensible home — but the shared component must not know the brand. The right extension point already exists: <code>getBillingPageProps</code> takes <code>shouldIdleRedirect</code> from the app shell. Extend that seam.</p>
        <CodeBlock
          code={`// apps/commerce/espn/pages/commerce/billing/index.page.tsx
export const getServerSideProps = buildGetServerSideProps<BillingPageProps>([
  (commerceAppConfig) =>
    getBillingPageProps({
      commerceAppConfig,
      shouldIdleRedirect: true,
      idleWarningSeconds: 90,   // NEW: presentational, brand-agnostic, per-shell
    }),
]);
// disneyPlus -> shouldIdleRedirect: true  (no idleWarningSeconds)
// hulu       -> shouldIdleRedirect: false

// packages/cgi/commerce-base/src/signup/billing/billing-content/billing-content.tsx
{shouldIdleRedirect && (
  <IdleTimeRedirect timeout={billingPageIdleTimeout} warningSeconds={idleWarningSeconds} />
)}
// absent warningSeconds -> no modal. No brand literal anywhere in the library.`}
          lang="tsx"
          filename="solution-idle-warning.tsx"
        />
        <p><strong>Why mechanism 3 does not fit.</strong> A Sparrow boolean gates <em>whether</em> the modal exists, but the requirement carries a duration, and product will ask for 60 seconds next quarter. If the number must be changeable without a deploy, the right shape is a Sparrow <em>value</em> under <code>feature-configuration</code>, read by the shell and passed down — still not a brand branch in the library.</p>
        <p><strong>What breaks under the teammate&apos;s version.</strong> First, <code>partnerName</code> comes from <code>useSessionInfo()</code> and is undefined on first render, so the modal flickers or never mounts depending on query timing — a race, not a brand rule. Second, a Disney+ subscriber managing an ESPN-linked account presents <code>partnerName === &apos;disney&apos;</code> in the ESPN app, so the feature silently disappears for real ESPN traffic. Third, the condition is invisible to whoever owns the Disney+ ledger: nothing in the Disney+ shell hints that a shared component now behaves differently per brand.</p>
        <p><strong>Namespace error.</strong> The question being asked is &quot;which app is serving this page&quot;, which is <code>ProductName</code> territory — and even that is wrong here, because the correct answer is not to ask about brand at all. The presence or absence of a prop is the condition.</p>
        <p><strong>Testing obligation.</strong> Three suites. <code>billing-content.test.tsx</code> gains two cases: warning prop present renders the modal, absent renders the bare redirect. The Disney+ billing page test asserts <code>idleWarningSeconds</code> is <em>not</em> passed, so a future refactor cannot silently opt Disney+ in. The Hulu test keeps asserting <code>shouldIdleRedirect: false</code> so no idle machinery mounts at all. Run them through <code>pnpm test:commerce:jest:espn</code> (which routes to <code>coverage:jest</code> and therefore sets <code>PRODUCT=espn</code>) rather than the app-local <code>test:jest</code>, which would silently load Disney+ fixtures. commerce-base&apos;s 100% coverage threshold makes the two-arm test non-optional.</p>
      </SolutionReveal>

      <h2 id="gotchas">Gotchas and Traps</h2>
      <ul>
        <li>
          <strong>Build output poisons brand greps.</strong> <code>apps/commerce/espn/.next/</code>, <code>build/</code> and <code>build-test/</code> contain minified copies of <code>commerce-base</code> with every brand literal inlined, including base64 source maps. Always exclude <code>.next</code>, <code>build</code>, <code>build-test</code> and <code>node_modules</code>, or your &quot;count the ESPN branches&quot; number will be off by an order of magnitude.
        </li>
        <li>
          <strong>A grep proves presence, not use.</strong> Glimpse executes inside ESPN commerce as inherited layout plumbing with zero ESPN-authored events, while the Identity v5 reauth handler is present and reachable yet can only throw. To answer &quot;does this brand use X&quot; you need three checks: config populated, initialisation called in that shell, consuming component mounted.
        </li>
        <li>
          <strong>Never validate a brand check against ESPN alone.</strong> ESPN is <code>espn</code> in all four namespaces; Disney+ is <code>disneyPlus</code> in two and <code>disney</code> in the others. Your ESPN test is the one test that cannot catch a namespace bug.
        </li>
        <li>
          <strong><code>pnpm -F @solo/commerce-espn test:jest</code> runs with Disney+ fixtures.</strong> That script does not set <code>PRODUCT</code>, and <code>renderWithProviders</code> defaults to <code>getMergedConfigFixtureForProduct(&apos;disneyPlus&apos;)</code>. Use <code>coverage:jest</code> or prefix <code>PRODUCT=espn</code>. This is the single easiest way to believe you tested ESPN and not have.
        </li>
        <li>
          <strong><code>partnerName</code> is not &quot;which app am I&quot;.</strong> It is session-derived. Using it as an app-identity check is the most common brand bug in this repo.
        </li>
        <li>
          <strong>ESPN has no light theme.</strong> ESPN is the only entry in <code>cgi-design-tokens/scripts/build.ts</code> without a <code>dataTheme</code>, so <code>dist/espn.css</code> emits <code>.espn</code> with no <code>[data-theme]</code> alias. Any shared style keyed on <code>[data-theme=&quot;dark&quot;]</code> silently does nothing on ESPN.
        </li>
        <li>
          <strong>Brand leaks survive review because they are still valid CSS.</strong> <code>apps/commerce/espn/tailwind.config.cjs:1486,1490</code> points two utilities at <code>product/disneyplus/</code> assets while the other eleven correctly use <code>product/espn/</code>. Separately, four shared components hardcode <code>themeName=&quot;disneyPlus&quot;</code> — including the ESPN-only wallet modal. Nothing warns; a user just sees the wrong brand.
        </li>
        <li>
          <strong>Sparrow fixtures are not production.</strong> Flag defaults in <code>__fixtures__/espn/sparrow-commerce-espn-workspace.ts</code> are test baselines; real values live in S3. The ESPN V2 ledger flag is the canonical burn — absent from ESPN Sparrow entirely, arriving from WeaponX, so every ESPN Playwright spec has to inject it manually.
        </li>
        <li>
          <strong>Duplicated brand seams drift.</strong> <code>espn-layout.tsx</code> and <code>legacy-application-layout.tsx</code> each define their own private <code>LoadAnalytics</code> with <em>different</em> consent logic. Fixing a consent bug in one leaves the other. There is a TODO on it, which is not the same as a fix.
        </li>
        <li>
          <strong>A brand name in an identifier is not evidence of a brand branch.</strong> <code>isAllowedESPNDomain</code> in <code>identity/loading/lib/loading-server-utils.ts</code> compares against the tenant&apos;s own <code>root_domain</code> — the same code runs for all three brands. The converse also holds: real branches sometimes hide behind neutral names.
        </li>
        <li>
          <strong>Missing table entries fail silently.</strong> <code>tenantRouteMap.espn</code> has no <code>upsellInterstitial</code> key, so a Flex <code>navigateWithTenant</code> to that location resolves to <code>undefined</code> and misbehaves quietly instead of hitting the <code>UNRECOGNIZED_FLEX_TENANT</code> error boundary. Exhaustive keying is what makes config tables safe; partial keying hands you the silent-fallback problem right back.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Push brand differences into data and keep shared code brand-agnostic — the test is whether a fourth brand requires editing shared files. Five mechanisms in preference order: brand-keyed config table, per-brand remote config, feature flag or route gate, provider or implementation swap in the app shell, hardcoded conditional last. The SSP pipeline and the whole signup core prove the top of the list works — 366 ESPN mentions in <code>commerce-base</code>, only 3 <code>=== &apos;espn&apos;</code> comparisons.
        </li>
        <li>
          There is a sixth shape with no conditional at all: <strong>code present, never invoked</strong>. ESPN ships the Identity v5 reauth and passkey code and can never reach it, because no ESPN layout hydrates the SDK config and Sparrow sets <code>identitySDK: null</code>. Presence, reachability and use are three different questions — a grep answers only the first.
        </li>
        <li>
          Judgment beats dogma: presentational, regulatory and vendor-shaped differences can legitimately live in code (payment field order, Adobe payload shape, OneTrust group <code>&apos;4&apos;</code> vs <code>&apos;C0004&apos;</code>); behavioural differences almost always belong in config. If you cannot name the condition after a capability instead of a brand, you have not understood it yet.
        </li>
        <li>
          Four brand namespaces — <code>ProductName</code>, <code>partner</code>/<code>partnerName</code>, <code>tenant</code>, <code>ThemeName</code> — and ESPN is <code>espn</code> in all of them while Disney+ is not. Theming adds a fifth spelling and diverges at <em>build</em> time, which is why brand leaks like ESPN utilities pointing at Disney+ assets never show up in a runtime grep.
        </li>
        <li>
          A silent brand fallback is worse than a crash, and this repo has two: <code>PRODUCT ?? &apos;disneyPlus&apos;</code> in shared config, and <code>renderWithProviders</code> defaulting to Disney+ fixtures while ESPN&apos;s <code>test:jest</code> never sets <code>PRODUCT</code>. Throw on unknown brand keys, and run the script that sets the brand.
        </li>
        <li>
          When you add a brand behaviour, the tests that matter most are for the brands you did not touch — plus the right namespace, a capability-named variable, a ticket reference, and a cleanup plan if it encodes a rollout state.
        </li>
      </ul>
    </div>
  );
}
