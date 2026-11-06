import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestLifecycleDiagram = String.raw`sequenceDiagram
  autonumber
  participant BR as Browser
  participant WEB as cgi-web React page
  participant SDK as BamTech browser SDK
  participant EDGE as Edge
  participant FLEX as Flex Koa BFF
  participant TPL as Site Config templates
  BR->>WEB: open /commerce/billing
  WEB->>SDK: getFlexScreen key=subscriptionPreviewSecondary version=v2
  SDK->>SDK: resolve the symbolic key to a URL from client-sdk-configs
  SDK->>EDGE: POST /screens/v2/subscription/preview with Bearer token
  EDGE->>EDGE: stamp x-bamtech-partner espn from the SDK client id in the token
  EDGE->>FLEX: forward with all x-bamtech headers injected
  FLEX->>FLEX: flexContext packs headers device session experiments
  FLEX->>FLEX: fan out to GLO Offers Cypher under Promise.all
  FLEX->>FLEX: build UI element objects plus metricsData and adobeData
  FLEX->>TPL: getTemplate namespace flex-subscription-preview
  TPL-->>FLEX: JSON document whose leaf values are EJS expressions
  FLEX->>FLEX: fillTemplate renders EJS with templateData
  FLEX-->>SDK: filled JSON plus metadata.configurationId
  SDK-->>WEB: FlexResponse
  WEB->>WEB: map elements to React components and resolve cypher keys
  WEB-->>BR: rendered ledger page`;

const twoEngineDiagram = String.raw`flowchart TD
  R["POST /screens/v1/espn/paywall"] --> F{"getEnablePlatformMigration<br/>flexContext, 'paywallAssembly'"}
  F -->|"false"| L["LEGACY engine<br/>buildPaywallScreen<br/>src/domain/screen/espn/paywall/"]
  F -->|"true"| V{"getEnablePlatformMigrationValidation"}
  V -->|"false"| P1["PLATFORM only<br/>buildGatewayScreen<br/>paywallPipeline + paywallAssembly"]
  V -->|"true"| PA["await Promise.all"]
  PA --> P2["platformResponsePromise"]
  PA --> C2["controlResponsePromise (legacy)"]
  P2 --> DIFF["validateResponses<br/>control, platform, keysToIgnore, requestId"]
  C2 --> DIFF
  DIFF --> LOG["logs the delta ONLY"]
  P2 --> SERVE["ctx.body = platformResponse"]
  P1 --> SERVE
  L --> SERVE2["ctx.body = legacy response"]
  LOG -.->|"never alters what is served"| SERVE`;

const experimentResolutionDiagram = String.raw`flowchart TD
  REQ["x-bamtech-weaponx-assignments (base64)"] --> CTX["experimentation middleware decodes<br/>onto flexContext.experimentation"]
  CTX --> CFG["TemplateConfigClient.getConfig<br/>configuration/flex-espn-paywall/espn-paywall.json"]
  CFG --> IDS["experimentFeatureIds<br/>FOUR ESPN featureIds on this one screen"]
  IDS --> LOOP["forEach featureId, call getVariant(experiment, featureId)"]
  LOOP --> M1{"variant assigned for this featureId?"}
  M1 -->|"no"| SKIP["contributes no template override"]
  M1 -->|"yes"| MAP["templates[variantId] gives<br/>templateId + dataSetId + dataKey"]
  MAP --> FIRST{"experimentTemplateConfigurationForScreen<br/>already set?"}
  FIRST -->|"no, this is the FIRST match"| WIN["this config wins the screen"]
  FIRST -->|"yes"| DROP["SILENTLY DROPPED<br/>only pushed to experimentVariantsActive"]
  DROP --> WARN["logger.warn '[experiments] Too many featureId<br/>and variantId matches'"]
  WIN --> DK["dataKey selects a static blob in config.data<br/>e.g. linearSort.sortPlanCards.sortOrder"]
  DK --> RESP["fillTemplate, then metadata.configurationId<br/>is your receipt for which one served"]`;

const triageDiagram = String.raw`flowchart TD
  S["Symptom on an ESPN cgi-web screen"] --> CAP["STEP 1 capture the raw Flex JSON<br/>devtools Network, or curl with the same headers"]
  CAP --> ID["STEP 2 read data.metadata.configurationId"]
  ID --> Q1{"Where is the wrong value?"}
  Q1 -->|"absent from the JSON"| Q3{"Does the template declare a slot for it?"}
  Q1 -->|"present and wrong in the JSON"| Q2{"Wrong by rounding, or wrong by amount?"}
  Q1 -->|"correct in JSON, wrong on screen"| WEB2["cgi-web owns it<br/>copy override, style allowlist,<br/>modal filter, nav map, analytics"]
  Q2 -->|"rounding or cents"| WEB1["cgi-web applyLegalRounding"]
  Q2 -->|"amount, order, copy key, styling"| FLEX1["Flex SHARED service, or GLO / Cypher / template config"]
  Q3 -->|"slot exists, value is null"| FLEX2["Flex service never built that element"]
  Q3 -->|"no slot at all"| TPL1["Template repo or Site Config<br/>500 TemplateNotFound lives here too"]
  FLEX1 --> GREP["grep isPartnerESPN in the SHARED service<br/>NOT in src/domain/screen/espn/"]
  FLEX2 --> GREP
  GREP --> MIG{"Is the screen 'migrating' in migrationConfig.ts?"}
  MIG -->|"yes"| BOTH["Repeat for BOTH engines<br/>and read the validateResponses diff logs"]
  MIG -->|"no"| ONE["Single engine, fix it there"]`;

const clientTransformDiagram = String.raw`flowchart LR
  R["Flex JSON response"] --> M["Map into typed models<br/>commerce-base/src/common/services/flex/models/"]
  M --> T1["Copy resolution<br/>cypher key + dictionary resolved locally"]
  T1 --> X1["Copy-override experiment REWRITES<br/>the cypher key at render time"]
  M --> T2["Price formatting<br/>applyLegalRounding rounds UP<br/>when the locale format omits cents"]
  M --> T3["filterModalListItems DELETES Flex list items<br/>whose cypher resolves falsy, mutating in place"]
  M --> T4["Style allowlist<br/>getKind falls through to 'link'<br/>for unknown style values"]
  M --> T5["Action dispatch<br/>navigateWithTenant map<br/>unknown location THROWS"]
  X1 --> DOM["Rendered DOM"]
  T2 --> DOM
  T3 --> DOM
  T4 --> DOM
  T5 --> DOM`;

export const toc: TocItem[] = [
  { id: "the-headline-trap", title: "Start With the Trap", level: 2 },
  { id: "what-server-driven-ui-means", title: "What Server-Driven UI Means Here", level: 2 },
  { id: "request-lifecycle", title: "The Request Lifecycle, End to End", level: 2 },
  { id: "partner-predicate", title: "The Partner Predicate", level: 2 },
  { id: "two-engines", title: "Two Engines Running at Once", level: 2 },
  { id: "templates-and-configuration-id", title: "Templates and the configurationId Receipt", level: 2 },
  { id: "experiments-in-flex", title: "Experiments in Flex", level: 2 },
  { id: "executions", title: "Executions: Why ESPN Has None", level: 2 },
  { id: "request-contract", title: "The Request Contract: Who Sets What", level: 2 },
  { id: "what-cgi-web-owns", title: "What cgi-web Still Owns", level: 2 },
  { id: "local-development", title: "Local Development", level: 2 },
  { id: "debugging-playbook", title: "Debugging Playbook", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "edges-of-the-map", title: "Edges of the Map", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function FlexServerDrivenUiForEspn() {
  return (
    <div className="article-content">
      <p>You have been handed a ticket that says &quot;the ESPN paywall shows the wrong price.&quot; You have two repositories, an Edge layer you do not control, a template repository you cannot see, and an experiment platform that decides which template a given user gets. If you start by opening cgi-web and reading React components, you will spend a day and find nothing. This module gives you the map and, more importantly, the <strong>order of operations</strong>.</p>

      <h2 id="the-headline-trap">Start With the Trap</h2>
      <p>Flex (<code>growth-life-client-api</code>) has ESPN-branded routes. There are exactly three, all under <code>growth-life-client-api: src/routes/screens/v1/espn/</code> plus a v2 paywall: <code>/paywall</code>, <code>/device-account-management</code>, <code>/device-ledger</code>. Every instinct says: ESPN bug, ESPN directory. That instinct is wrong.</p>
      <p>Those routes are <strong>OTT and device screens</strong>. Their Joi schemas require <code>x-bamtech-device-family</code> and <code>x-bamtech-device-profile</code>; the templates carry an <code>initialFocus</code> field, which only makes sense for D-pad remote navigation; the device ledger supports a <code>flow: &apos;rokuTwoStep&apos;</code> query; the paywall accepts App Store and Play Store prices in the <em>request body</em>, because Flex cannot read prices off a device. They are consumed by ESPN native apps.</p>
      <p>The ESPN web commerce app in cgi-web consumes the <strong>shared, partner-agnostic</strong> screens — <code>/screens/v2/subscription/preview</code>, <code>/screens/v2/account/account-details</code>, <code>/screens/v1/landing/plans</code> — and gets ESPN-shaped output for one reason only: the request carries <code>x-bamtech-partner: espn</code>, stamped by Edge. Confirm it from the consumer side: cgi-web&apos;s ESPN Playwright specs assert against shared paths and never touch <code>/espn/*</code> (<code>cgi-web: apps/commerce/espn/playwright/tests/flows/billing-ledger-version.spec.ts</code>).</p>
      <p><strong>The reusable heuristic:</strong> for a cgi-web ESPN screen bug, do not grep <code>espn</code> in Flex. Find the <em>shared</em> service that builds that screen, then grep <code>isPartnerESPN</code> inside it. There are roughly seventy such comparisons across non-test Flex source, and they live in shared services and assemblies — not in the ESPN directory. Generalise it: <em>in a multi-tenant BFF, brand behaviour lives at predicate call sites in shared code, not in brand-named folders.</em></p>

      <h2 id="what-server-driven-ui-means">What Server-Driven UI Means Here</h2>
      <p>Flex is a template-driven Koa backend-for-frontend. It fetches business data from upstreams (GLO for offers and subscriptions, Offers, Cypher for localization, Site Config for templates, WeaponX for experiment assignments), converts raw <code>GLO*</code> types into domain <code>Flex*</code> types, builds <strong>UI element objects</strong> (buttons, text, images) plus analytics payloads, injects them into a JSON template rendered with EJS, and returns the filled JSON.</p>
      <p>cgi-web renders that JSON. It does not decide layout order, CTA wiring, which plans appear, what a button says, or what a price is. State the consequence bluntly, because it reorders your whole debugging instinct: <strong>most &quot;wrong copy / wrong price / missing element&quot; bugs on an ESPN commerce screen are not cgi-web bugs.</strong></p>
      <p>Flex also never returns literal user-facing English. It returns a <strong>cypher key plus a dictionary name</strong>, and the client resolves it against a downloaded dictionary. ESPN&apos;s keys all target the <code>unified-commerce</code> dictionary. Note that URLs are cypher keys too:</p>
      <CodeBlock
        code={`const cypher = (key: string): FlexCypherData => ({ key, dictionary: 'unified-commerce' });

export const BASE_SCREEN_CYPHER: ESPNAccountManagementScreenCypher = {
  header: cypher('account_details_header'),
  logoCircleEspn: cypher('logo_circle_espn_plus'),
  // A destination URL is ALSO a cypher key — a wrong link can be a
  // dictionary problem, not a code problem.
  btnExplorePlansEntitledUrl: cypher('entitled_web_destination_url_flagship'),
};`}
        lang="typescript"
        filename="espnScreenCyphers.ts"
      />
      <p>That is <code>growth-life-client-api: src/__helpers__/espnScreenCyphers.ts</code>. Dynamic values are passed as <code>variables</code> (<code>toCurrencyVariable</code>, <code>toDateVariable</code>, <code>toLinkToVariable</code>) rather than baked into strings — which is exactly why a price can be correct in the payload and wrong on screen.</p>
      <p><strong>Why is this worth its debugging cost?</strong> Because the alternative is worse. Disney+, Hulu, and ESPN share one commerce codebase and one set of native apps across Roku, tvOS, mobile, and web. Server-driven UI means a copy change, a plan-order experiment, or a new promo banner ships once, from one place, to every client simultaneously — no app-store review, no client release train, no per-platform drift. The price you pay is that ownership of any given pixel is no longer obvious from the repository you are standing in. This module is the compensating control for that price.</p>

      <h2 id="request-lifecycle">The Request Lifecycle, End to End</h2>
      <p>Read this once carefully. Two steps are the ones people get wrong: step 3, where the SDK — not cgi-web — resolves the URL, and step 5, where <strong>Edge</strong> — not cgi-web — stamps the partner.</p>
      <MermaidDiagram chart={requestLifecycleDiagram} title="Browser to Flex and Back: Where Each Decision Is Made"
        caption="cgi-web sends a symbolic key, not a URL, and never sends the partner. Edge derives the partner from the SDK client id inside the access token."
        minHeight={550} />
      <p>On the cgi-web side the boundary is three lines of delegation. For ESPN (and, byte-for-byte, for Disney+):</p>
      <CodeBlock
        code={`export const getFlexDataInterface = (
  sdkSession: SDKSession
): Pick<DATA_INTERFACE, 'getFlexScreen' | 'flexExecution'> => ({
  getFlexScreen: <T,>(o: FlexScreenOptions) => sdkSession.flexApi.getScreen<FlexResponse<T>>(o),
  flexExecution: <T,>(o: FlexExecutionOptions) => sdkSession.flexApi.execute<T>(o),
});`}
        lang="typescript"
        filename="flex-data-interface.ts"
      />
      <p>That is <code>cgi-web: packages/cgi/data-interface-espn/src/flex/flex-data-interface.ts</code>. Hulu is the outlier — a hand-rolled <code>fetch</code> with its own key-to-path table and its own error mapping. Do not generalise the ESPN/Disney+ path to Hulu.</p>

      <h2 id="partner-predicate">The Partner Predicate</h2>
      <p>The partner is a single Edge-supplied header, <code>x-bamtech-partner</code>, typed as <code>disney | hulu | espn | star | unknown</code>. Flex has one canonical predicate for it — and several call sites that ignore the predicate and roll their own comparison:</p>
      <CodeBlock
        code={`// growth-life-client-api: src/domain/common/util.ts — canonical, and CASE-SENSITIVE
export function isPartnerESPN(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === PARTNERS.espn;
}

// ...and the call sites that are case-INSENSITIVE instead:
// src/platform/core/orchestration/orchestrator/functionRegistry/addOnSelectorFunctionRegistry.ts:323
isPartnerESPN: standardHeaders.partner?.toLocaleLowerCase() === 'espn',
// src/domain/screen/subscription/addOnSelector/addOnSelectorService.ts:741
const isPartnerESPN = partner?.toLocaleLowerCase() === 'espn';
// src/domain/metricsData/adobeDataService.ts:134
flexContext.standardHeaders.partner?.toLowerCase()`}
        lang="typescript"
        filename="partner-predicate.ts"
      />
      <p>This is a <strong>genuine latent divergence</strong>, not a style nit. If any client, any Edge region, or any future integration ever sends <code>ESPN</code>, the add-on selector and the Adobe analytics builder will treat the request as ESPN while <code>isPartnerESPN</code> will not. You get a half-branded screen whose two halves disagree in a way no single file explains.</p>
      <p>Why is case-sensitivity in a cross-system enum a design smell? Because the enum crosses a trust boundary. The producer (Edge, deriving the value from a token claim) and the consumers (a hundred call sites in a BFF, plus every native client) are versioned and deployed independently. An enum that only works when every producer agrees on casing has no single enforcement point — it is a convention pretending to be a type. The fix is normalisation at the boundary: coerce the header once in header-parsing middleware, then make the predicate the only permitted reader. Instead the codebase hedges both ways, so the casing question is unresolved everywhere at once.</p>
      <p>Practical move: when an ESPN screen renders with Disney+ styling, do not immediately hunt for a missing branch. First capture the actual header value from a real request.</p>

      <h2 id="two-engines">Two Engines Running at Once</h2>
      <p>Flex is mid-migration. Some screens exist twice: a <strong>legacy</strong> implementation under <code>growth-life-client-api: src/domain/screen/</code> and a <strong>platform</strong> implementation under <code>growth-life-client-api: src/platform/</code> (pipelines, assemblies, function registries). For a <code>migrating</code> screen the route can run <em>both</em> engines under <code>Promise.all</code>, diff the two responses with a validator, log the delta — and serve the platform response regardless:</p>
      <CodeBlock
        code={`// growth-life-client-api: src/platform/migrationConfig.ts — the registry
paywall: createScreenConfig({ screen: 'paywall', domain: 'espn', status: 'migrating' }),

// growth-life-client-api: src/routes/screens/v1/espn/paywall.ts — the two-engine route
const enablePlatformMigration = await getEnablePlatformMigration(flexContext, 'paywallAssembly');

if (enablePlatformMigration) {
  const platformResponsePromise = buildGatewayScreen({
    pipelineName: 'paywallPipeline',
    assemblyName: 'paywallAssembly',
    flexContext,
    requestContext: { entitlementId, label, offerPackage, offerType, iapSKUPricingInfo },
  });

  if (enablePlatformMigrationValidation) {
    const controlResponsePromise = buildPaywallScreen({ /* legacy engine */ });
    const [platformResponse, controlResponse] = await Promise.all([
      platformResponsePromise,
      controlResponsePromise,
    ]);
    validateResponses(
      controlResponse,
      platformResponse,
      platformMigrationValidationKeysToIgnore,
      'paywallAssembly',
      flexContext.standardHeaders.requestId
    );
    ctx.body = platformResponse; // <-- the diff is advisory only
  } else {
    ctx.body = await platformResponsePromise;
  }
}`}
        lang="typescript"
        filename="paywall.ts"
      />
      <MermaidDiagram chart={twoEngineDiagram} title="The Two-Engine Topology and Its Response-Diffing Validator"
        caption="The validator is observability, not a gate — it logs the delta while the platform response is served. Two flags decide the shape of any given request."
        minHeight={400} />
      <p><strong>The migration-safety value is real.</strong> Running both engines on live traffic and diffing the outputs is how you de-risk rewriting a 2,868-line service: you get production-shaped evidence of every divergence before you cut over, without exposing users to the new path until you choose to.</p>
      <p><strong>The trap is equally real:</strong> fix one engine and your change can silently do nothing. If the flag routes traffic to platform and you patched <code>src/domain/screen/espn/paywall/paywallService.ts</code>, your deploy is a no-op for every user — and the validator will now report a <em>new</em> delta that looks like a regression. So for any <code>migrating</code> screen the first question is never &quot;where is the bug&quot;; it is <strong>which engine served this request</strong>. The v2 ESPN paywall route sidesteps the question entirely: it is platform-only, <code>paywallV2Assembly</code>.</p>

      <h2 id="templates-and-configuration-id">Templates and the configurationId Receipt</h2>
      <p>A Flex template is a <strong>JSON document whose leaf values are EJS expressions</strong>. Flex fetches it from Site Config under the namespace <code>flex-&#123;screenType&#125;</code> — that request is literally <code>&#123; namespace: `flex-$&#123;screenType&#125;`, configType: templateId, configName: dataSetId &#125;</code> in <code>growth-life-client-api: src/domain/template/templateService.ts</code> — renders it with the service&apos;s <code>templateData</code>, and returns the result. Here is the entire real ESPN v1 paywall fixture:</p>
      <CodeBlock
        code={`{
  "data": {
    "content": {
      "header": "<%- JSON.stringify(data.header ?? null) %>",
      "subheader": "<%- JSON.stringify(data.subheader ?? null) %>",
      "plans": "<%- JSON.stringify(data.plans ?? null) %>",
      "loginCTA": "<%- JSON.stringify(data.loginCTA ?? null) %>",
      "redirect": "<%- JSON.stringify(data.redirect ?? null) %>",
      "footer": "<%- JSON.stringify(data.footer ?? null) %>",
      "footerActions": "<%- JSON.stringify(data.footerActions ?? null) %>"
    },
    "initialFocus": "",
    "screenType": "espn-paywall",
    "templateId": "espn-paywall"
  },
  "metadata": { "configurationId": "espn-paywall:espn-paywall:default::1700589390784" }
}`}
        lang="json"
        filename="default.json"
      />
      <p>Read what that actually is: a <strong>slot list</strong>. It declares which named sections exist and in what order the client should look for them. All content comes from the service, so on V1 screens layout knowledge lives in service code. Because ESPN&apos;s own screens have their own <code>screenType</code>, they resolve to their own Site Config namespaces (<code>flex-espn-paywall</code>, <code>flex-espn-ledger</code>) — while the shared screens cgi-web uses have the <em>same template for all three brands</em>, with ESPN differentiation happening purely in service code and in the dictionary.</p>
      <p>The platform engine changes the template&apos;s job. Its renderer adds <strong>composition helpers</strong> — <code>compose</code>, <code>composeList</code>, <code>mapCompose</code>, <code>hydrate</code>, <code>hydrateVariables</code>, <code>composeDeep</code> — that pull reusable JSON components out of <code>growth-life-client-api: src/platformComponents/</code> (roughly a hundred files: <code>banner.json</code>, <code>badge.json</code>, <code>espnPlanCardV2.json</code>):</p>
      <CodeBlock
        code={`// __fixtures__/templates/flex-espn-paywall/espn-paywall-v2-platform/default.json
{
  "data": {
    "content": {
      "header":        "<%- compose(data.components.header?.path, data.components.header?.data) %>",
      "body":          "<%- compose(data.components.body?.path, data.components.body?.data) %>",
      "footerActions": "<%- mapCompose(data.components.footerActions) %>",
      "metadata":      "<%- hydrate(data.metadata) %>"
    },
    "templateId": "espn-paywall-v2-platform"
  },
  "metadata": { "configurationId": "espn-paywall:espn-paywall-v2-platform:default::1700589390784" }
}

// ...and the component that template composes in — src/platformComponents/paywallBody.json
{ "plans": "<%- composeList('espnPlanCardV2.json', data.plans) %>" }`}
        lang="json"
        filename="espn-paywall-v2-platform.json"
      />
      <p>The practical consequence matters more than the syntax. Platform screens move layout knowledge <em>into</em> the template repository, so the answer to &quot;can this be fixed without a Flex deploy?&quot; is <strong>often yes</strong> — a pull request in <code>growth-life-client-templates</code>, no service release. For V1 screens, usually no. That one question changes your time-to-fix from days to hours, so ask it early.</p>
      <p><strong>Now the single most useful debugging artifact in this entire system.</strong> Every response carries a <code>configurationId</code> in <code>metadata</code>, shaped <code>namespace:configType:configName::timestamp</code>. It is your <em>receipt</em> for exactly which template version served that response:</p>
      <CodeBlock
        code={`espn-paywall : espn-paywall : default :: 1700589390784
    |              |               |            |
 namespace      configType     configName    timestamp
 (flex-espn-     (templateId)   (dataSetId)   (version stamp — proves whether a
  paywall)                                     merged template change reached you)`}
        lang="text"
        filename="configuration-id.txt"
      />
      <p>Read it before you read code. It tells you which template, <em>which experiment data set</em>, and whether the template you merged an hour ago is actually the one in play — Site Config caches for five to ten minutes <em>per region</em>, so &quot;my template change did nothing&quot; is frequently just a stale cache.</p>

      <h2 id="experiments-in-flex">Experiments in Flex</h2>
      <p>Flex does not <em>allocate</em> users to experiments. It only <em>reads</em> the allocation, which arrives base64-encoded in <code>x-bamtech-weaponx-assignments</code> (or the Spearmint equivalent, normalised into WeaponX shape) and lands on <code>flexContext.experimentation</code>. The read path is nine lines and contains two gotchas:</p>
      <CodeBlock
        code={`// growth-life-client-api: src/lib/experiments/treatment.ts
export const getExperimentTreatment = <T extends FeatureID>({
  flexContext,
  featureId,
}: { flexContext: FlexContext; featureId: T }): Variants<T> | undefined => {
  const treatment = getExperimentVariantId({ flexContext, featureId });

  // GOTCHA 1: undefined for unassigned users. Every detection helper must handle it.
  if (!treatment) return undefined;

  if (!isValidVariant(treatment, featureId)) {
    logger.warn(\`Experiment Treatment variant: (\${treatment}) for feature ID: \${featureId} did not match any of the expected values\`);
    // GOTCHA 2: an unknown variant is warned about, then RETURNED ANYWAY.
    return treatment as Variants<T>;
  }

  return treatment;
};`}
        lang="typescript"
        filename="treatment.ts"
      />
      <p>Gotcha 1 means a detection helper that treats <code>undefined</code> as anything other than &quot;not in the experiment&quot; will misbehave for the majority of traffic. Gotcha 2 means a typo in WeaponX <strong>propagates instead of failing closed</strong> — search the logs for <code>did not match any of the expected values</code> before you assume the code is wrong. The recommended shape combines business eligibility with treatment, and the one ESPN experiment with dedicated service code is textbook:</p>
      <CodeBlock
        code={`// growth-life-client-api: src/domain/screen/espn/paywall/experiments/paywallService.ts
// TODO GREAT-749: Clean up or productionalize.
export function isESPNStrikethroughPriceExperimentEnabled(offer: FlexOffer, flexContext: FlexContext): boolean {
  const hasNonPpvFlagshipBundle = !offer.hasPPV && offer.flexOfferType === 'FLAGSHIP_BUNDLE';
  const hasExperimentAssignment =
    getExperimentTreatment({ flexContext, featureId: ESPNStrikethroughPrice }) === 'strikethrough-promo-price';

  return hasNonPpvFlagshipBundle && hasExperimentAssignment; // eligibility AND treatment
}`}
        lang="typescript"
        filename="experiments-paywallService.ts"
      />
      <h3>The first-match-only rule, and the live ESPN hazard</h3>
      <p>Most experiments do not need service code at all. They are encoded in the screen&apos;s <strong>template configuration</strong>: a list of <code>experimentFeatureIds</code>, a map from variant name to <code>&#123; templateId, dataSetId, dataKey &#125;</code>, and a <code>data</code> object of static blobs that <code>dataKey</code> selects. Here is the real ESPN paywall config, abridged:</p>
      <CodeBlock
        code={`{
  "experimentFeatureIds": [
    "wpnx-great-ESPN-Plan-Order-via-ESPN-Entry",
    "wpnx-ESPN-Plan-Select-Linear-Plan-Order",
    "wpnx-ESPN-Generic-Entry-Plan-Order",
    "wpnx-ESPN-Entry-Plan-Order"
  ],
  "templates": {
    "control":               { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "default" },
    "modified-plan-order":   { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "linearSort" },
    "ascending-price-order": { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "ascendingPriceOrder" }
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
        "generic": { "sortOrder": ["ESPN_STANDALONE", "DISNEY_3P_BUNDLE", "FLAGSHIP_STANDALONE"] }
      }
    }
  }
}`}
        lang="json"
        filename="espn-paywall.json"
      />
      <p>Read the inner keys: <code>default</code>, <code>generic</code>, <code>espn:flagship</code> are <strong>entry-point sub-selectors</strong>. The same treatment sorts plans differently depending on which entry the user arrived through (<code>paywallType</code> comes from the request body). One variant, several outcomes. And now the hazard — the resolver iterates <code>experimentFeatureIds</code>, and <strong>only the first featureId that resolves to a template config is applied</strong>. The others are collected purely so a warning can be logged:</p>
      <CodeBlock
        code={`// growth-life-client-api: src/domain/screen/common/configuration.ts
templateConfiguration.experimentFeatureIds?.forEach((featureId) => {
  const variant = getVariant(experiment, featureId);
  if (variant) {
    const templateConfig = templateConfiguration.templatesV2
      ? templateConfiguration.templatesV2[variant.variant_id]?.[version]
      : templateConfiguration.templates[variant.variant_id];

    if (!experimentTemplateConfigurationForScreen) {
      experimentTemplateConfigurationForScreen = templateConfig; // FIRST match wins, forever
    }
    if (templateConfig) {
      experimentVariantsActive.push({ featureId, variantId: variant.variant_id });
    }
  }
});

// If multiple experiments/variants are active, we only apply the first experiment
// listed in the experimentFeatureIds config array
if (experimentVariantsActive.length > 1) {
  logger.warn('[experiments] Too many featureId & variantId matches is found running on this page.', {});
}`}
        lang="typescript"
        filename="configuration.ts"
      />
      <MermaidDiagram chart={experimentResolutionDiagram} title="featureId to Variant to dataKey — Including the Silent Drop"
        caption="Four featureIds are configured on the ESPN paywall. If a user is allocated to two at once, three template variants are discarded and only a warning marks it."
        minHeight={550} />
      <p>The ESPN paywall config lists <strong>four</strong> featureIds. Any overlap in WeaponX allocation means up to three are silently ignored at the template layer. The experiment platform will happily report the user as enrolled and exposed; the screen will show a different variant&apos;s layout; and your only in-band signal is an <code>[experiments]</code> warning in Flex logs. This is documented as a hard limitation — multiple simultaneous template-config experiments on one screen are <em>not supported</em> — but the config that violates it is checked in and live. That is the subtlest production hazard in this whole module: symptom &quot;treatment assigned but template unchanged,&quot; owner &quot;template-config collision,&quot; and nothing in either repo looks broken.</p>

      <h2 id="executions">Executions: Why ESPN Has None</h2>
      <p>Screens are read-only <code>GET</code>/<code>POST</code> calls under <code>/screens/v&#123;1,2&#125;/</code> that return filled-template JSON. <strong>Executions</strong> are state-changing calls under <code>/execution/v&#123;1,2,3&#125;/</code> — signup, plan switch, cancel, payment.</p>
      <p>There are <strong>no ESPN-namespaced executions</strong>, and this is deliberate rather than accidental. The execution tree is <code>v1 | v2 | v3</code> crossed with <code>account, commerce, notifications, offers, onetrust, orders, payments, segment, subscription, wallet</code> — there is no <code>espn</code> directory. Executions are partner-agnostic; ESPN reaches them with <code>x-bamtech-partner: espn</code> like everyone else. Flex&apos;s own experimentation doctrine backs this up: experiments apply only to screen presentation and configuration, and <em>no</em> experiments exist in execution flows.</p>
      <p>That is a sound boundary. Presentation is where you want variance — different layouts, copy, and plan order per brand and per experiment. A purchase is where you want exactly one code path, because variance there means money moving differently for different users. So when cgi-web submits an ESPN purchase it calls the shared execution: <code>PUT /execution/v2/subscription/signup</code> with <code>key: &apos;subscriptionSignup&apos;, version: &apos;v2&apos;</code> from <code>cgi-web: packages/cgi/commerce-base/src/signup/queries/use-flex-billing-execution.tsx</code>. One important detail: the <code>offers</code> in that request body come from <strong>Flex&apos;s own action payload</strong>, not from the URL — the server-driven CTA carries the authoritative offer identity forward into the purchase. The only ESPN-aware execution logic found anywhere is a flag, <code>enable-mlb-on-espn-presentation</code>, altering <code>cancelAll</code> behaviour in <code>growth-life-client-api: src/domain/execution/subscription/cancel/cancelSubscriptionService.ts</code>.</p>

      <h2 id="request-contract">The Request Contract: Who Sets What</h2>
      <p>Correct the natural assumption right now: <strong>cgi-web does not know Flex&apos;s URL, and it does not send the partner.</strong> It sends a symbolic <code>key</code> plus <code>version</code>, <code>queryParams</code>, <code>requestBody</code>, <code>headers</code>, <code>method</code>. The BamTech SDK resolves the key to a URL from the <code>client-sdk-configs</code> bootstrap, and Edge injects identity and partner from the access token.</p>
      <ArticleTable caption="Who populates each field of a Flex request. Anything in the bottom half is not a cgi-web bug." minWidth={900}>
        <table>
          <thead><tr><th>Field</th><th>Set by</th><th>Evidence / note</th></tr></thead>
          <tbody>
            <tr><td><code>key</code>, <code>version</code>, <code>method</code></td><td>cgi-web</td><td>e.g. <code>subscriptionPreviewSecondary</code> + <code>v2</code> + POST, from <code>signup/pages/billing-page.tsx</code></td></tr>
            <tr><td><code>queryParams</code> / <code>requestBody</code></td><td>cgi-web</td><td><code>offerContext</code> (v2) or flat <code>offerId</code> + <code>campaignId</code> (v1), plus duration, entitlementId, gift-card fields</td></tr>
            <tr><td><code>X-Bamtech-Sales-Platform</code></td><td>cgi-web — the only header it adds</td><td><code>generateFlexHeaders(&#123; salesPlatform &#125;)</code> in <code>common/constants/subscription-sources.ts</code>; returns <code>undefined</code> when empty</td></tr>
            <tr><td><code>x-account-owner-&#123;account,identity&#125;-id</code></td><td>cgi-web (one-off)</td><td>extra-member accept page only</td></tr>
            <tr><td><code>Authorization: Bearer</code>, <code>X-BAMSDK-*</code></td><td>BamTech SDK</td><td>ESPN client id is <code>espn-a9b93989</code> (<code>cgi-web: packages/cgi/sdk-session/src/constants.ts</code>)</td></tr>
            <tr><td><code>x-bamtech-partner</code></td><td><strong>Edge</strong></td><td>derived from the SDK client id in the token — this is why &quot;partner is wrong&quot; is never a cgi-web bug</td></tr>
            <tr><td><code>x-bamtech-account-id</code>, <code>-identity-id</code>, <code>-session-*</code></td><td><strong>Edge</strong></td><td>from the access token, never client-controlled</td></tr>
            <tr><td><code>x-bamtech-weaponx-assignments</code></td><td><strong>Edge</strong></td><td>base64 allocation; Flex reads it, never computes it</td></tr>
            <tr><td><code>templateConfiguration</code></td><td><strong>Nobody in the client</strong></td><td>Flex derives it from Site Config plus experiments — a client cannot request a specific template</td></tr>
            <tr><td><code>__screen</code>, <code>__requestID</code>, <code>__region</code></td><td>cgi-web, dev only</td><td>local fixture selectors surfaced in the Toodles dev panel — not Flex parameters</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <CodeBlock
        code={`# What actually reaches Flex on an ESPN ledger request (abridged)
POST /screens/v2/subscription/preview

# --- from the SDK ---
Authorization: Bearer <accessToken>
X-BAMSDK-Client-ID: espn-a9b93989
X-BAMSDK-Platform: macosx-chrome

# --- stamped by Edge, from the token ---
x-bamtech-partner: espn
x-bamtech-account-id: ...
x-bamtech-identity-id: ...
x-bamtech-session-type: REGISTERED
x-bamtech-location-country-code: US
x-bamtech-weaponx-assignments: <base64>

# --- the ONLY header cgi-web itself adds ---
X-Bamtech-Sales-Platform: <salesPlatform>`}
        lang="text"
        filename="espn-flex-request-headers.txt"
      />

      <h2 id="what-cgi-web-owns">What cgi-web Still Owns</h2>
      <p>This section prevents the opposite error. Server-driven UI does not mean the client is a dumb renderer, and three cgi-web transformations routinely get blamed on Flex.</p>
      <MermaidDiagram chart={clientTransformDiagram} title="What cgi-web Does to a Flex Response Before You See It"
        caption="Five transformations sit between the JSON on the wire and the pixels on screen. Each one can make a correct Flex response render incorrectly."
        minHeight={400} />
      <p><strong>1. Price rounding.</strong> cgi-web rounds <em>up</em> when the locale format omits cents, so a displayed price can legitimately differ from the amount Flex sent:</p>
      <CodeBlock
        code={`// cgi-web: packages/cgi/commerce-base/src/common/lib/apply-legal-rounding.ts
export function applyLegalRounding(
  wholeNumbers: string, fractions: string, format: string, amount: number
): string {
  if (amount < 0) return wholeNumbers;
  const shouldRoundUp = !format.includes('\${p}') && parseInt(fractions, 10) > 0;
  return shouldRoundUp ? String(parseInt(wholeNumbers, 10) + 1) : wholeNumbers;
}`}
        lang="typescript"
        filename="apply-legal-rounding.ts"
      />
      <p><strong>2. Dropping modal items whose copy resolves empty.</strong> <code>cgi-web: packages/cgi/commerce-base/src/account/change-subscription/lib/filter-modal-list-items.ts</code> walks the modal content Flex sent and <em>deletes</em> any single-entry list item whose cypher key resolves falsy against the local dictionary — <strong>mutating the arrays in place</strong>. So &quot;a bullet is missing from the plan-details modal&quot; is near-certainly a cgi-web dictionary miss, not a Flex omission. The Flex payload will contain the bullet; the DOM will not.</p>
      <p><strong>3. Render-time cypher-key rewriting.</strong> For copy-override experiments, cgi-web scans all feature flags with the experimental-copy prefix, builds a map of cypher key to replacement key, and swaps keys <em>at render time</em> (<code>cgi-web: packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx</code>). A second system does the same through a <code>&#123;key&#125;__exp__&#123;exp&#125;__&#123;variant&#125;</code> naming convention. Consequence: the payload can carry the right key and the screen can still show different words. Duplicate override keys across flags raise a Datadog error and the later flag is ignored.</p>
      <p>Two more, worth knowing because they fail silently: unknown Flex <code>style</code> values <strong>degrade to a plain link</strong> — <code>getKind</code> in <code>cgi-web: .../common/components/flex/interaction-element/interaction-element.tsx</code> falls through, so a new button style shipped from Flex renders as text until cgi-web adds it to the allowlist. And an unknown <code>navigateWithTenant</code> location <strong>throws</strong> in cgi-web, because cross-tenant navigation is a client-owned map — a new destination is a coordinated change, not a Flex-only one.</p>
      <ArticleTable caption="Responsibility split. Use this to decide which repository to open first." minWidth={900}>
        <table>
          <thead><tr><th>Concern</th><th>Owner</th><th>Where it lives</th></tr></thead>
          <tbody>
            <tr><td>Which elements exist, and in what order</td><td>Flex service + template</td><td><code>growth-life-client-api: src/domain/screen/</code> or <code>src/platform/presentation/screen/assemblies/</code></td></tr>
            <tr><td>Which cypher key a label uses</td><td>Flex service (<code>toCopy</code>)</td><td><code>growth-life-client-api: src/domain/screen/**</code></td></tr>
            <tr><td>What that key resolves to as text</td><td>Cypher dictionary (neither repo)</td><td>Disney localization service, resolved per tenant</td></tr>
            <tr><td>The numeric price amount</td><td>GLO, then Flex conversion</td><td><code>growth-life-client-api: src/domain/common/flexMoney.ts</code></td></tr>
            <tr><td>How that amount is formatted and rounded</td><td>cgi-web</td><td><code>cgi-web: .../common/lib/apply-legal-rounding.ts</code> and <code>use-currency-format.ts</code></td></tr>
            <tr><td>Plan ordering on ESPN</td><td>Flex template config or function registry</td><td><code>growth-life-client-api: .../functionRegistry/offersFunctionRegistry.ts</code></td></tr>
            <tr><td>Which React component renders an element</td><td>cgi-web</td><td><code>cgi-web: .../common/components/flex/</code> — 1:1 with models, no generic renderer</td></tr>
            <tr><td>What a CTA actually does</td><td>Split — Flex sends the action, cgi-web dispatches it</td><td><code>actions-provider.tsx</code> plus a per-page <code>onAction</code> switch on <code>action.actionKey</code></td></tr>
            <tr><td>Which Flex version (v1 vs v2 payload) is requested</td><td>cgi-web</td><td><code>cgi-web: .../common/hooks/use-is-v2-ledger-enabled.tsx</code> — WeaponX flag OR remote config</td></tr>
            <tr><td>Analytics emission</td><td>Flex builds the payload, cgi-web fires it</td><td><code>metricsData</code> / <code>adobeData</code> in the response; Glimpse + Adobe on the client</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="local-development">Local Development</h2>
      <p>Flex listens on <strong>port 3200</strong> (<code>growth-life-client-api: src/config/defaults.ts</code>, <code>serverPort: 3200</code>). Running it needs Vault access — without it the app errors out. Two run modes matter: <code>npm run dev</code> hits real remote backends, while <code>npm run local</code> sets <code>HULU_ENV=local</code> so template configuration and Site Config read from local fixture files. That second mode is how you test a template change <em>before</em> merging the <code>growth-life-client-templates</code> pull request.</p>
      <p>Pointing cgi-web at that local Flex is not an environment variable. It is a Docker plus nginx rewrite performed by <code>cgi-web: packages/traffic-director-dev/setup-edge.sh</code> against a running Edge container:</p>
      <CodeBlock
        code={`# Rewrite the QA Edge hostnames to their local equivalents (all 4 regions)
docker exec -it edge parallel -k "sed -i 's/qa-espn.api.edge.bamgrid.com/local.qa-espn.api.edge.bamgrid.com/' \\
  etc/nginx/configs/qa/{}/nginx.conf" ::: eu-west-1 eu-central-1 us-east-1 us-west-2

# THE actual cgi-web -> local-Flex upstream swap
docker exec -it edge parallel -k "sed -i 's/growth-life-client-api-qa.us-east-1.bamgrid.net/host.docker.internal/' \\
  etc/nginx/configs/qa/{}/nginx.conf" ::: eu-west-1 eu-central-1 us-east-1 us-west-2

# ...and repoint the upstream port from 80 to 3200 (matches Flex's serverPort)
docker exec -it edge parallel -k "sed -i '/host.docker.internal/{n; s/80/3200/}' \\
  etc/nginx/configs/qa/{}/nginx.conf" ::: eu-west-1 eu-central-1 us-east-1 us-west-2

docker restart edge`}
        lang="bash"
        filename="setup-edge.sh"
      />
      <p>Start it with <code>pnpm start:traffic-director-local-edge</code>. Detection on the cgi-web side is by <em>Docker inspection</em>, not by an env var: the ESPN app&apos;s <code>local-setup</code> script sets <code>WITH_TRAFFIC_DIRECTOR</code> and <code>WITH_EDGE_SERVER</code> from <code>docker ps</code>, which becomes <code>publicRuntimeConfig.isUsingLocalEdgeServer</code>, which makes the SDK resolve its config host to <code>local.client-sdk-configs.bamgrid.com</code> and therefore its Flex base URL to <code>local.qa-espn.api.edge.bamgrid.com</code>.</p>
      <p><strong>The honest warning.</strong> There is an advertised local-Flex knob that does nothing. <code>pnpm dev:local-flex</code> sets <code>NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled</code>, and <code>cgi-web: apps/commerce/espn/turbo.json</code> even declares it as a tracked env var — but <strong>no source file in the repository reads it</strong>. Today the script behaves identically to <code>dev:integration</code>: pure MSW mocking. Likewise <code>LOCAL_EDGE_SERVER=disabled</code> in the ESPN <code>.env</code> is unread, and there is no <code>FLEX_API_URL</code> anywhere. If you want local Flex, it is the Edge container or nothing.</p>
      <p>The third option is to skip Flex entirely: <code>dev:integration</code> turns on MSW, and ESPN&apos;s handlers intercept Flex screen URLs directly (<code>cgi-web: apps/commerce/espn/browser-mocks/browser-handlers.ts</code>). Fixture selection happens through the <code>__screen</code> parameter, surfaced in the Toodles dev panel.</p>

      <h2 id="debugging-playbook">Debugging Playbook</h2>
      <p>Read every row with the headline trap in mind: for a cgi-web ESPN screen, &quot;Flex&quot; means the <em>shared</em> service, not <code>growth-life-client-api: src/domain/screen/espn/</code>.</p>
      <ArticleTable caption="Symptom to owning layer — the most instructive rows. Start at the owner column, not at the code." minWidth={980}>
        <table>
          <thead><tr><th>Symptom</th><th>Most likely owner</th><th>First place to look</th></tr></thead>
          <tbody>
            <tr><td>Wrong copy, English fallback, or a literal <code>&#123;placeholder&#125;</code></td><td>Cypher dictionary — not code</td><td><code>cgi-web: .../common/lib/flex/get-flex-copy.tsx</code> logs unresolved keys; then the key emitted by <code>toCopy</code></td></tr>
            <tr><td>Copy is wrong but the key looks right</td><td>cgi-web copy-override experiment</td><td><code>cgi-web: .../experiments/use-copy-override-experiment.tsx</code> rewrites cypher keys at render</td></tr>
            <tr><td>Price wrong by rounding or cents</td><td>cgi-web</td><td><code>cgi-web: .../common/lib/apply-legal-rounding.ts</code> — rounds up when the locale omits cents</td></tr>
            <tr><td>Price wrong by amount</td><td>Flex conversion, then GLO</td><td><code>growth-life-client-api: src/domain/common/flexMoney.ts</code>, then GLO — outside both repos</td></tr>
            <tr><td>Wrong plan order on ESPN</td><td>Flex template config or experiment</td><td><code>configuration/flex-espn-paywall/espn-paywall.json</code> <code>sortPlanCards</code>; then <code>offersFunctionRegistry.ts</code></td></tr>
            <tr><td>A whole section is missing from the screen</td><td>Flex service (slot filled with <code>null</code>)</td><td>the service&apos;s <code>templateData.data</code> object; then the template&apos;s slot list</td></tr>
            <tr><td>A bullet is missing inside a modal</td><td>cgi-web, near-certainly</td><td><code>cgi-web: .../lib/filter-modal-list-items.ts</code> deletes items whose cypher resolves falsy</td></tr>
            <tr><td>A button renders as a plain link</td><td>cgi-web style allowlist</td><td><code>getKind</code> in <code>.../flex/interaction-element/interaction-element.tsx</code></td></tr>
            <tr><td>Wrong experiment treatment applied</td><td>WeaponX allocation first, then Flex</td><td>the assignments header, then the <code>did not match any of the expected values</code> warning</td></tr>
            <tr><td>Treatment assigned but the <strong>template</strong> is unchanged</td><td>Flex template-config collision</td><td><code>growth-life-client-api: src/domain/screen/common/configuration.ts</code> — first featureId wins; ESPN paywall lists four</td></tr>
            <tr><td>Two identical-looking requests behave differently</td><td>Platform migration</td><td><code>growth-life-client-api: src/platform/migrationConfig.ts</code> — is the screen <code>migrating</code>? read the <code>validateResponses</code> diffs</td></tr>
            <tr><td>ESPN screen shows Disney+ styling</td><td>Missing Flex partner branch</td><td>grep <code>isPartnerESPN</code> in the <em>shared</em> service; verify the header casing</td></tr>
            <tr><td>Screen is stale after a template merge</td><td>Site Config cache</td><td>5–10 minutes per region; compare <code>configurationId</code> timestamps</td></tr>
            <tr><td>Local dev is not hitting my local Flex</td><td>Setup, not code</td><td>is the <code>edge</code> container up and <code>setup-edge.sh</code> run? is Flex on 3200? <code>dev:local-flex</code> is a no-op</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram chart={triageDiagram} title="Which Layer Owns This Bug — Ordered Triage"
        caption="Every branch starts from the captured JSON. Deciding ownership before reading code is what keeps this from being a two-day investigation."
        minHeight={550} />
      <p>The ordered heuristic, in words, because you will use it more than the diagram:</p>
      <ol>
        <li><strong>Capture the raw Flex JSON.</strong> Devtools Network, or <code>curl</code> with the same headers. This one step decides ownership for roughly 80% of bugs.</li>
        <li><strong>Read <code>data.metadata.configurationId</code>.</strong> It names the template, the data set, and the version stamp — free, instant, and it kills the stale-cache and wrong-data-set hypotheses outright.</li>
        <li><strong>Present and wrong in the JSON?</strong> Flex, or an upstream of Flex: GLO, Site Config, Cypher, WeaponX.</li>
        <li><strong>Correct in the JSON but wrong on screen?</strong> cgi-web — one of the five transformations above.</li>
        <li><strong>Absent from the JSON?</strong> Either the Flex service never built it (slot present, value <code>null</code>) or the template has no slot for it at all.</li>
        <li><strong>If the screen is <code>migrating</code>, repeat steps 3–5 for both engines.</strong> Otherwise you may fix code that is not running.</li>
      </ol>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: what is server-driven UI, and what does it cost you?"
        intro="A weak answer describes the mechanism. A strong answer names the tradeoff and the operational control that makes the tradeoff survivable."
        steps={[
          "Open with the contract, not the tech: the backend returns a description of the screen — elements, copy keys, prices, actions, analytics payloads — and the client renders it. The client owns no layout decisions.",
          "Name the payoff concretely: one copy change or plan-order experiment ships to web, Roku, tvOS, and mobile at once, with no app-store review and no client release train.",
          "Name the cost honestly: ownership of any given pixel is no longer inferable from the repo you are in, and a client-side transformation can make a correct payload render wrong.",
          "Name the compensating control: a per-response identifier that proves which server-side configuration produced it — here, metadata.configurationId. Without something like that, server-driven UI is undebuggable at scale.",
          "Close with the boundary you would keep: presentation is server-driven, state-changing executions are not. Variance in layout is a feature; variance in a purchase path is an incident.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: you run two implementations of one endpoint behind a flag. Good idea?"
        intro="Interviewers want both halves. Praising it or condemning it are equally shallow."
        steps={[
          "Say what it buys: dual execution under Promise.all plus a response diff gives production-shaped evidence of every divergence before cutover, on real traffic, without user exposure.",
          "Name the cost you accept knowingly: doubled upstream load and latency bounded by the slower engine, for as long as validation is on. That is a deliberate, temporary bill.",
          "Name the real trap: the diff is advisory. It logs, it does not gate. A fix applied to the engine that is not being served is a silent no-op — and the validator then reports your fix as a fresh regression.",
          "State the discipline that makes it safe: a migration registry recording each screen's status, and a rule that nobody touches a migrating screen without first determining which engine served the request in question.",
          "Close on the exit condition — dual-running is a migration state with a deadline, not an architecture. Without a cleanup owner it becomes two codebases forever.",
        ]}
      />
      <InterviewChallenge
        title="Challenge: &quot;The ESPN paywall shows the wrong price&quot;"
        scenario={
          <>
            A support escalation says the ESPN paywall shows <strong>$11.99</strong> where marketing expected <strong>$10.99</strong>, for &quot;some users.&quot; You have cgi-web, <code>growth-life-client-api</code>, an Edge layer you do not control, a <code>growth-life-client-templates</code> repository you have no access to, and WeaponX allocations you cannot read from either repo. A colleague has already opened a pull request against <code>growth-life-client-api: src/domain/screen/espn/paywall/paywallService.ts</code> adding a price override, and wants your review.
          </>
        }
        tasks={[
          "Say why the colleague's pull request is probably targeting the wrong file — and give the two independent reasons, not one.",
          "Write the ordered sequence of evidence you would collect before reading any service code, and state what each artifact rules in or out.",
          "Explain how you would distinguish a genuinely wrong amount from a correctly-transformed amount, naming the specific cgi-web function involved.",
          "Explain how 'some users' could be produced by the experiment layer alone, with no code defect anywhere.",
          "State which of your conclusions you cannot verify from the two repositories, and what you would ask whom.",
        ]}
        pitfalls={[
          "Grepping 'espn' in Flex and landing in the OTT device paywall.",
          "Assuming cgi-web sends the partner, and hunting for a client-side brand bug.",
          "Treating the displayed price as the payload price — cgi-web rounds up when the locale format omits cents.",
          "Fixing one engine on a 'migrating' screen and declaring victory.",
          "Concluding 'no bug' because the experiment platform reports the user as correctly enrolled.",
        ]}
        signal="Ownership is decided from captured evidence before any code is read; configurationId is reached for early and by name; the candidate separates 'wrong amount' from 'wrong formatting' from 'wrong template variant'; and the unverifiable parts are stated as questions for named owners rather than guessed at."
      />
      <SolutionReveal difficulty="hard">
        <p><strong>1. Why the pull request is wrong — two independent reasons.</strong> First, the wrong <em>screen</em>: <code>src/domain/screen/espn/paywall/</code> serves <code>POST /screens/v1/espn/paywall</code>, an OTT/device screen consumed by ESPN native apps. The web paywall is not that screen; for the plan-select surface specifically, cgi-web remote config points at an ESPN-hosted URL entirely outside cgi-web. Second, the wrong <em>engine</em>: the ESPN paywall is <code>migrating</code>, so even for a genuine device-paywall fix the legacy file may not be the code path in production — <code>paywallAssembly</code> under <code>src/platform/</code> may be. And hard-coding a price override in a BFF treats a symptom whose source is GLO or an experiment.</p>
        <p><strong>2. Ordered evidence.</strong> (a) Capture the raw Flex JSON for an affected user — this alone splits Flex-side from cgi-web-side. (b) Read <code>data.metadata.configurationId</code>: it names namespace, <code>templateId</code>, <code>dataSetId</code>, and a version stamp, telling you which template variant served and whether it is stale. (c) Read <code>screenType</code> and <code>templateId</code> in the response to confirm which screen you are even looking at. (d) Capture the request headers, especially <code>x-bamtech-partner</code> (and its casing) and <code>x-bamtech-weaponx-assignments</code>. (e) In Flex logs for that <code>x-request-id</code>, look for the <code>[experiments] Too many featureId &amp; variantId matches</code> warning and any <code>validateResponses</code> delta.</p>
        <p><strong>3. Wrong amount vs wrong formatting.</strong> Compare the numeric amount in the JSON against $10.99. If the JSON says 10.99 and the screen says 11, that is <code>applyLegalRounding</code> in <code>cgi-web: packages/cgi/commerce-base/src/common/lib/apply-legal-rounding.ts</code>, which adds one to the whole-number part whenever the locale format omits cents and the fractional part is non-zero. If the JSON itself says 11.99, the amount is wrong upstream: the GLO-to-Flex conversion layer, or GLO&apos;s offer data — outside both repositories.</p>
        <p><strong>4. &quot;Some users&quot; with no code defect.</strong> The ESPN paywall template config lists four <code>experimentFeatureIds</code>. A user allocated to two of them at once gets <em>only the first matching featureId&apos;s</em> template config applied; the rest are discarded with a warning. Since each variant maps to a different <code>dataKey</code>, and those data blobs change plan ordering and presentation, a subset of users can see a different plan and price arrangement than either experiment&apos;s owner expects — while both experiments report correct enrolment. Separately, an unknown or misspelled variant in WeaponX is logged and <em>still returned</em>, so a typo propagates rather than failing closed.</p>
        <p><strong>5. What cannot be verified from the two repos.</strong> Which engine actually served production (a LaunchDarkly value); whether all four featureIds are simultaneously allocated (a WeaponX question); whether the deployed template matches the checked-in fixture (the templates repo); what a cypher key resolves to in each locale (the dictionary). Those are questions for the Flex owners, the experiment owner named in the registry JSDoc, and the templates repo owner — not things to infer. Say so explicitly rather than presenting a guess as a finding.</p>
      </SolutionReveal>

      <h2 id="edges-of-the-map">Edges of the Map</h2>
      <p>A map that does not show its own borders is dangerous. Four things sit outside both repositories, and every one of them can be the cause of a bug you are staring at:</p>
      <ul>
        <li><strong>The <code>growth-life-client-templates</code> repository.</strong> The real production templates are deployed to S3 and served via Site Config. Every template snippet in this module is a <code>src/__fixtures__/templates/</code> copy inside Flex. Whether those fixtures are in sync with production is <strong>unverified</strong>.</li>
        <li><strong>Cypher dictionary contents.</strong> You can see which key Flex emits. You cannot see what that key resolves to per tenant and locale. And missing dictionaries fail soft — Flex warns and continues — so partial copy loss is silent.</li>
        <li><strong>Flag and experiment values.</strong> LaunchDarkly flag states and WeaponX allocations are not readable from either repo. Which engine serves the ESPN paywall in production, and whether all four paywall featureIds are simultaneously allocated, are both open questions.</li>
        <li><strong>GLO and the client-sdk-configs bootstrap.</strong> The upstream owning offers, agreements, and subscriptions, and the service mapping symbolic keys to URLs. The ESPN endpoint map is visible in cgi-web only through a checked-in test fixture.</li>
      </ul>
      <p>One more honest gap: the consumers of <code>/screens/v1/espn/*</code> are <em>strongly inferred</em> to be ESPN native/OTT apps — the device headers, <code>initialFocus</code>, <code>rokuTwoStep</code>, and in-app-purchase prices in the request body all point that way — but the client repositories were not read. Verify before assuming a change there is safe for web.</p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>The <code>espn/*</code> routes in Flex are OTT/device screens. cgi-web consumes <em>shared</em> screens and gets ESPN output only because Edge stamps <code>x-bamtech-partner: espn</code> — so the correct first move is to grep <code>isPartnerESPN</code> in the shared service, never <code>espn</code> in Flex.</li>
        <li>Flex returns screen descriptions and cgi-web renders them, so most wrong-copy, wrong-price, and missing-element bugs are not cgi-web bugs — but price rounding, modal-item deletion when a cypher resolves empty, and render-time cypher-key rewriting are.</li>
        <li><code>metadata.configurationId</code> (<code>namespace:configType:configName::timestamp</code>) is your receipt for which template served a response. Read it before you read code; it kills the stale-cache and wrong-data-set hypotheses instantly.</li>
        <li>Migrating screens run legacy and platform engines under <code>Promise.all</code> with an advisory response diff. Determine which engine served the request first, or your fix can be a silent no-op that the validator then reports as a regression.</li>
        <li>Only the <strong>first</strong> matching <code>experimentFeatureId</code> applies a template config, and the ESPN paywall lists four — so overlapping allocations silently drop variants while the experiment platform still reports correct enrolment.</li>
        <li>cgi-web never sends the partner, account id, or <code>templateConfiguration</code>; locally, use the Edge docker plus <code>setup-edge.sh</code> rewrite to port 3200, because <code>dev:local-flex</code> sets an env var nothing reads.</li>
      </ul>
    </div>
  );
}
