import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const inversionDiagram = String.raw`flowchart LR
  subgraph shared["commerce-base — shared, brand-agnostic"]
    C1["React page or hook"] --> C2["useAtomValue(dataInterfaceAtom)"]
  end
  subgraph brand["data-interface-espn — 908 src LoC"]
    B1["buildDataInterface({ sdkSession, queryClient, observability })"]
  end
  subgraph sdk["@js-client-sdk/sdk — BamTech Browser SDK"]
    S1["flexApi · orchestrationApi · commerceApi<br/>walletApi · purchaseApi · subscriptionApi"]
    S2["bootstrap config: key to URL, headers, timeouts"]
  end
  E["Edge gateway: qa-espn.api.edge.bamgrid.com"]
  B1 -->|"injected at hydration"| C2
  C2 -->|"calls the contract"| B1
  B1 -->|"one-line delegation"| S1
  S2 -.->|"resolves symbolic key"| S1
  S1 --> E
  C1 -. "never imports networking" .-> sdk`;

const slicesDiagram = String.raw`flowchart TD
  SDKS["sdkSession + queryClient + observability"] --> F["flex · 19 LoC · 2 methods"]
  SDKS --> I["identity · 152 LoC + 16 files · ~25 methods"]
  SDKS --> P["payment · 51 LoC · 4 methods"]
  SDKS --> A["activations · 25 LoC · 1 method"]
  SDKS --> X["experimentation · 31 LoC · 1 method"]
  F --> OBJ["one flat object typed DATA_INTERFACE"]
  I --> OBJ
  P --> OBJ
  A --> OBJ
  X --> OBJ
  OBJ --> ATOM["dataInterfaceAtom (Jotai)"] --> CB["every commerce-base consumer"]`;

const callSequence = String.raw`sequenceDiagram
  autonumber
  participant H as commerce-base hook
  participant DI as data interface
  participant SDK as Browser SDK
  participant CFG as bootstrap config
  participant EDGE as Edge / Flex
  H->>DI: getFlexScreen({ key, version, queryParams })
  DI->>SDK: sdkSession.flexApi.getScreen(options)
  SDK->>CFG: look up key in services.flex.client.endpoints
  CFG-->>SDK: href, method, headers, timeout 15s
  SDK->>SDK: substitute version and accessToken
  SDK->>EDGE: GET /screens/v1/landing/plans
  EDGE-->>SDK: content, templateId, metricsData
  SDK-->>DI: resolved promise
  DI-->>H: FlexResponse (soft errors resolved, hard errors thrown)
  Note over H: cached as flexApi.getScreen.landingPlans`;

const proxyDiagram = String.raw`flowchart TD
  START["dataInterface.someOperation()"] --> Q1{"one of the 32 own<br/>DATA_INTERFACE members?"}
  Q1 -->|yes| REAL["real impl, static stub,<br/>or explicit throw"]
  Q1 -->|no| Q2{"one of the 6 orchestration<br/>ops ESPN really supplies?"}
  Q2 -->|yes| GQL["setupQueryFunction to<br/>orchestrationApi.query"]
  Q2 -->|no| Q3{"reached via the Proxy<br/>or via the spread copy?"}
  Q3 -->|"Proxy (direct read)"| NI["notImplemented()<br/>Error: Not implemented"]
  Q3 -->|"spread copy (what ships)"| TE["undefined<br/>TypeError: not a function"]
  style TE fill:#3a1010,stroke:#ef4444
  style NI fill:#1d2a17,stroke:#22c55e`;

export const toc: TocItem[] = [
  { id: "dependency-inversion", title: "The Dependency-Inversion Pattern", level: 2 },
  { id: "the-cost", title: "The Cost: One Wide Duck-Typed Contract", level: 3 },
  { id: "how-small-it-is", title: "How Small It Actually Is", level: 2 },
  { id: "flex-layer", title: "The 19-Line Flex Layer", level: 2 },
  { id: "mid-migration", title: "A Codebase Mid-Migration", level: 3 },
  { id: "endpoint-inventory", title: "Where the Endpoint Inventory Lives", level: 2 },
  { id: "headers", title: "Headers and the Identity of a Request", level: 2 },
  { id: "lying", title: "Contract Satisfaction by Lying", level: 2 },
  { id: "proxy-shim", title: "The notImplemented Proxy Shim", level: 2 },
  { id: "device-provider", title: "ESPN's One Unique Session Component", level: 2 },
  { id: "errors", title: "Error Normalisation and React Query", level: 2 },
  { id: "no-codegen", title: "No Codegen, and the Vocabulary", level: 2 },
  { id: "mocking", title: "Mocking and Running It Locally", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Backend Call", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnDataInterfaceAndSdk() {
  return (
    <div className="article-content">
      <p>
        If you are asked to add a backend call to ESPN commerce, the first question is not &quot;what URL do I hit&quot; — it is <strong>which layer do I touch</strong>. ESPN commerce contains no <code>fetch</code>, no axios, no URL construction and no GraphQL codegen. Every call goes through one brand package whose only job is to <em>adapt</em> a shared contract onto the BamTech Browser SDK. Internalise that and your questions collapse to three: does the SDK already know this endpoint, does the shared contract already declare this method, and is the ESPN implementation real or a polite lie?
      </p>

      <h2 id="dependency-inversion">The Dependency-Inversion Pattern</h2>
      <p>
        <code>packages/cgi/commerce-base</code> holds shared commerce UI for Disney+, Hulu and ESPN. It must never import a brand&apos;s networking — that would make the shared layer depend on all three brands. So the dependency is inverted: each brand package exports exactly one symbol and the app injects it at boot. <code>packages/cgi/data-interface-espn/src/index.ts</code> is literally one line re-exporting <code>buildDataInterface</code>, which is synchronous, does no I/O, and flat-spreads five slices into one object. Each slice <code>Pick&lt;&gt;</code>s a disjoint set of contract keys — that is how the type system enforces the partition. Later spreads win on collision; nothing prevents one.
      </p>
      <CodeBlock
        code={`export function buildDataInterface({ sdkSession, queryClient, observability }: {
  sdkSession: SDKSession;
  queryClient: QueryClient;
  observability: Observability;
}) {
  const dataInterface: DATA_INTERFACE = {
    ...getFlexDataInterface(sdkSession),
    ...getIdentityDataInterface({ sdkSession, queryClient, observability }),
    ...getPaymentDataInterface(sdkSession),
    ...getActivationsDataInterface(sdkSession),
    ...getExperimentationDataInterface(sdkSession),
  };
  return dataInterface;
}`}
        lang="typescript"
        filename="packages/cgi/data-interface-espn/src/data-interface.ts"
      />
      <p>
        Injection runs through Jotai. In <code>commerce-base/src/common/data-interface/atoms.ts</code> a private atom holds <code>DATA_INTERFACE | null</code> and the exported <code>dataInterfaceAtom</code> is a derived read-only atom that <em>throws</em> <code>&quot;The data interface must be hydrated before usage.&quot;</code> while null — so a component reading it outside the hydration subtree fails loudly instead of silently no-op&apos;ing. ESPN&apos;s chain is short: <code>pages/_app.page.tsx</code> mounts the providers, <code>src/layout/espn-layout.tsx</code> hydrates the device-attribute provider, and <code>src/layout/hydrate-data-interface.tsx</code> calls <code>buildDataInterface</code> then <code>useHydrateDataInterface</code>. <code>SDKSession</code>, <code>FlexScreenOptions</code> and <code>FlexResponse</code> are <strong>ambient globals</strong> from <code>packages/developer-experience/types/src/types/bam-browser-sdk.d.ts</code>, which is why the package imports no types for them and ships exactly one runtime dependency (<code>es-cookie</code>, used only by the logout storage purge).
      </p>
      <MermaidDiagram
        chart={inversionDiagram}
        title="Dependency Inversion: commerce-base ← injected brand interface ← SDK ← Edge"
        caption="The dashed arrow is the point of the design: shared code never reaches the SDK. Only the brand package knows it exists."
        minHeight={400}
      />
      <MermaidDiagram
        chart={slicesDiagram}
        title="Five Slices Composing Into One Flat Object"
        caption="No namespacing: getFlexScreen and updatePaymentMethod sit side by side on the same object."
        minHeight={550}
      />

      <h3 id="the-cost">The Cost: One Wide Duck-Typed Contract</h3>
      <p>
        The price is visible in the type. <code>DATA_INTERFACE</code> in <code>packages/developer-experience/types/src/index.d.ts</code> is one flat intersection: <strong>32 own members</strong> plus <strong>68 members</strong> of <code>OrchestrationOperations</code> — roughly <strong>100 methods every brand must satisfy</strong>. No abstract base, no hierarchy, no per-brand narrowing; each brand independently satisfies the whole structural type. That is duck typing enforced only by TypeScript, which is why <code>packages/cgi/AGENTS.md</code> carries a hand-written &quot;data interfaces must stay in sync&quot; warning — nothing structural forces it. It is also why ESPN, a brand with no profiles product, must still produce <em>something</em> for <code>switchProfile</code> and sixty-odd siblings. Everything strange below follows from that one decision.
      </p>

      <h2 id="how-small-it-is">How Small It Actually Is</h2>
      <ArticleTable
        caption="Brand comparison — the size gap is a platform-generation gap, not a feature gap."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Brand package</th>
              <th>Src files</th>
              <th>Src LoC</th>
              <th>Flex layer</th>
              <th>Transport</th>
              <th>Platform</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>data-interface-espn</code></td><td>31</td><td>908</td><td><strong>19 lines</strong></td><td>BamTech SDK</td><td>CUP → ACP</td>
            </tr>
            <tr>
              <td><code>data-interface-disney</code></td><td>111</td><td>5,041</td><td>19 lines (byte-identical)</td><td>BamTech SDK</td><td>CUP → ACP</td>
            </tr>
            <tr>
              <td><code>data-interface-hulu</code></td><td>60</td><td>3,533</td><td><strong>318 lines</strong></td><td>raw <code>fetch</code>, 9 base URLs</td><td>ACP</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Measured on <code>main</code>, ESPN is <strong>908 non-test source lines across 31 files</strong> — not a client, an adapter. The Disney+ ↔ ESPN gap is almost entirely <code>identity/profiles/</code> and <code>identity/operations/</code> — directories that exist for Disney+ and simply do not exist for ESPN. Functionally, <strong>ESPN is Disney+ minus profiles</strong>. The Hulu gap is different in kind, and that is the interesting one.
      </p>

      <h2 id="flex-layer">The 19-Line Flex Layer</h2>
      <p>
        Flex is the server-driven-UI service behind Edge. A sibling module in this academy covers Flex itself — templates, screen contracts, experiments, the BFF — in depth; here we care only about the client boundary, and the client boundary is 19 lines:
      </p>
      <CodeBlock
        code={`export const getFlexDataInterface = (
  sdkSession: SDKSession
): Pick<DATA_INTERFACE, 'getFlexScreen' | 'flexExecution'> => {
  return {
    getFlexScreen: <T>(flexScreenOptions: FlexScreenOptions) => {
      return sdkSession.flexApi.getScreen<FlexResponse<T>>(flexScreenOptions);
    },
    flexExecution: <T>(flexExecutionOptions: FlexExecutionOptions) => {
      return sdkSession.flexApi.execute<T>(flexExecutionOptions);
    },
  };
};`}
        lang="typescript"
        filename="packages/cgi/data-interface-espn/src/flex/flex-data-interface.ts"
      />

      <h3 id="mid-migration">A Codebase Mid-Migration</h3>
      <p>
        That is the whole file — two methods, two delegations, zero logic — and <code>packages/cgi/data-interface-disney/src/flex/flex-data-interface.ts</code> is <strong>byte-for-byte identical</strong>. Hulu&apos;s equivalent is <strong>318 lines</strong> and a different animal: an <strong>in-repo key→URL map</strong> (<code>flexScreenKeysToUrls</code>, <code>flexExecutionKeysToUrls</code>), type guards, a per-key <code>versionOverride</code>, a hand-rolled query-string builder, its own platform header and its own error mapping (<code>handleFlexError</code>, <code>isFlexError</code>). It builds URLs from an injected <code>edgeBaseUrl</code>, so Hulu&apos;s <code>buildDataInterface</code> takes <strong>eleven</strong> parameters against ESPN&apos;s three. The load-bearing comment sits inside Hulu&apos;s map: <em>&quot;ACP Flex endpoints deviate from CUP in some instances and require a version override. These overrides can be safely removed once D+/ESPN are fully migrated to ACP.&quot;</em> That sentence explains the entire size difference. <strong>Hulu is on ACP; Disney+ and ESPN are on CUP, migrating to ACP.</strong> ESPN&apos;s thin pass-through is the <em>old</em> pattern; Hulu&apos;s explicit map is the <em>new</em> one. You are not looking at three inconsistent implementations — you are looking at one codebase caught halfway through a platform migration, and file size is the migration&apos;s fingerprint. The same signal appears in the docblock of <code>commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx</code>, which says the handler can move once ESPN reaches ACP. The tradeoff is real: adding a Flex screen for Hulu is a code change with a guard rail — an unmapped key throws <em>&quot;The Flex screen key … must first be mapped to a path in the data interface.&quot;</em> Adding one for ESPN requires <strong>no repo change at all</strong> and gets <strong>no repo-side validation whatsoever</strong>.
      </p>

      <h2 id="endpoint-inventory">Where the Endpoint Inventory Lives</h2>
      <p>
        If the SDK resolves keys to URLs, where is the table? Not in source. It is fetched at runtime from <code>client-sdk-configs.bamgrid.com/bam-sdk/v7.0/espn-a9b93989/browser/…/&lt;env&gt;.json</code>. The repo keeps a <strong>checked-in snapshot</strong> for tests, and because mocked runs are served from exactly that snapshot, <strong>the fixture is the authoritative endpoint inventory</strong>:
      </p>
      <CodeBlock
        code={`{
  "commonHeaders": {
    "X-BAMSDK-Client-ID": "espn-a9b93989",
    "X-BAMSDK-Platform": "{SDKPlatform}",
    "X-BAMSDK-Version": "{SDKVersion}",
    "X-Application-Version": "{applicationVersion}"
  },
  "commonValues": { "platformId": "browser" },
  "services": { "flex": { "client": {
    "baseUrl": "https://qa-espn.api.edge.bamgrid.com",
    "endpoints": {
      "incomingActivation": {
        "href": "https://qa-espn.api.edge.bamgrid.com/screens/{version}/landing/incoming-activation",
        "method": "GET",
        "headers": { "Accept": "application/json; charset=utf-8",
                     "Authorization": "Bearer {accessToken}",
                     "Content-Type": "application/json; charset=utf-8" },
        "templated": true, "timeout": 15, "ttl": 0
      }
    }
  } } }
}`}
        lang="json"
        filename="macosx-chrome-qa.json"
      />
      <p>
        Counted from that file: <strong>106 Flex endpoints for ESPN vs 119 for Disney+</strong>, and <strong>270 endpoints across 31 services</strong> in total. Every Flex endpoint has the same shape — <code>timeout: 15</code>, <code>ttl: 0</code>, <code>templated: true</code>, bearer auth. Screens are <code>/screens/{"{version}"}/…</code> returning <code>FlexResponse</code>; executions are <code>/execution/{"{version}"}/…</code> returning <code>FlexExecutionResponse</code> with <code>success</code>/<code>successData</code>/<code>errorData</code>. There is a service-level delta too: Disney+ has <code>config</code> and <code>consent</code> services ESPN lacks; ESPN has none Disney+ lacks.
      </p>
      <ArticleTable
        caption="Endpoint delta: exactly one ESPN-only key, fourteen Disney+-only. Diffing the two fixtures is the fastest product-capability audit in the repo."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Direction</th>
              <th>Key(s)</th>
              <th>What it tells you</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ESPN-only</strong></td>
              <td><code>incomingActivation</code></td>
              <td><code>GET /screens/{"{version}"}/landing/incoming-activation</code> — third-party-to-ESPN token redemption. The only key ESPN has and Disney+ does not.</td>
            </tr>
            <tr>
              <td>Disney+-only</td>
              <td><code>comcastPaymentMethod</code>, <code>comcastSufConsentTemplate</code>, <code>comcastSwitchConsentTemplate</code></td>
              <td>ESPN has no Comcast/MVPD payment-method templates.</td>
            </tr>
            <tr>
              <td>Disney+-only</td>
              <td><code>unauthenticatedCancel</code>, <code>unauthenticatedCancelSuccess</code>, <code>cancelSubscriptionUnauthenticated</code>, <code>verifySegment</code>, <code>verifySegmentExecution</code>, <code>landingUpgrade</code>, <code>landingCadence</code>, <code>optimizeSubscription</code>, <code>apmCheckout</code>, <code>enrollPaymentMethod</code>, <code>deviceRestartLedger</code></td>
              <td>No logged-out cancel flow, no segment verification, no upgrade or cadence landing, and several payment/restart screens absent.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <code>activationSuccess</code> is absent from <em>both</em> configs, which is exactly why <code>use-activation-success-page-data.ts</code> reaches for the <code>key: &apos;unknown&apos;</code> + <code>configOverride</code> escape hatch. The lesson generalises well beyond this repo: <strong>when the client is config-driven, the config file is the API documentation.</strong> Read the fixture before you read the code.
      </p>

      <h2 id="headers">Headers and the Identity of a Request</h2>
      <p>Newcomers reliably guess wrong here, so learn the four layers explicitly:</p>
      <CodeBlock
        code={`# 1. SDK commonHeaders — injected by the Browser SDK on every request
X-Application-Version: {applicationVersion}    X-BAMSDK-Platform: {SDKPlatform}
X-BAMSDK-Client-ID:    espn-a9b93989          X-BAMSDK-Version:  {SDKVersion}

# 2. Per-endpoint headers — from the endpoint entry in the bootstrap config
Accept:        application/json; charset=utf-8
Content-Type:  application/json; charset=utf-8
Authorization: Bearer {accessToken}        <-- the SDK, never the app

# 3. The ONE header cgi-web adds itself, and only when a value resolved
X-Bamtech-Sales-Platform: <salesPlatform>

# 4. Injected by Edge from the access token — cgi-web NEVER sets these
x-bamtech-partner: espn   (+ -account-id, -identity-id, -session-*, -weaponx-assignments)

# NOT sent as headers at all:
#   region  -> the session token (token.region)   device -> the SDK device grant
#   partner -> the SDK client id espn-a9b93989             (espn_aid osDeviceId)`}
        lang="text"
        filename="flex-request-headers.txt"
      />
      <p>
        The one app-level header has exactly one helper — <code>generateFlexHeaders({"{ salesPlatform }"})</code> in <code>commerce-base/src/common/constants/subscription-sources.ts</code> — which deliberately returns <code>undefined</code> rather than an empty object, so no header is sent instead of an empty value. Its value comes from <code>useSalesPlatform()</code>: the <code>salesPlatform</code> query param falling back to the License Plate <code>deviceProfile</code>; Flex reads it to drive eligibility and content requirements. Two corrections that save hours. <strong>Region, partner and device are not request inputs on this path</strong> — they are implicit in the token, the client id and the device grant, so &quot;Flex thinks I am the wrong partner&quot; is structurally never a cgi-web bug. And <strong><code>templateId</code> is a response field, not a request field</strong>: <code>FlexResponse&lt;T&gt;</code> carries <code>content</code>, <code>screenType</code>, <code>templateId</code>, <code>initialFocus</code>, <code>metricsData</code>. You never ask for a template; Flex picks one from site config plus experiments and tells you which it chose.
      </p>
      <MermaidDiagram
        chart={callSequence}
        title="A Flex Screen Fetch From Hook to Cache"
        caption="Notice how much happens inside the SDK — URL resolution, header injection, token substitution, timeout. The data interface contributes one line."
        minHeight={550}
      />

      <h2 id="lying">Contract Satisfaction by Lying</h2>
      <p>
        Here is the dominant ESPN pattern and the module&apos;s best teaching moment. Rather than gate every shared component on tenant, the ESPN data layer <strong>returns convincing hard-coded response envelopes</strong> for capabilities ESPN does not have. The comments are honest about it:
      </p>
      <CodeBlock
        code={`const personalInfoResult: GetPersonalInfoResult = {
  data: { me: { identity: { flows: { personalInfo: {
    eligibleForCollection: 'NotEligible', requiresCollection: [],
  } } } } },
};

/**
 * We hard-code ESPN users' personal info since ESPN personal
 * info collection is handled by OneID and not the Orchestration API.
 */
export function getPersonalInfo() {
  return Promise.resolve(personalInfoResult);
}`}
        lang="typescript"
        filename="packages/cgi/data-interface-espn/src/identity/operations/personal-info.ts"
      />
      <ArticleTable
        caption="The stubbed surface and the honest reason for each stub. Every one resolves successfully — none signals at runtime that it is fabricated."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>What it returns</th>
              <th>Why it is stubbed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>getPersonalInfo</code></td>
              <td><code>eligibleForCollection: &apos;NotEligible&apos;</code>, <code>requiresCollection: []</code></td>
              <td>ESPN personal-info collection is handled by <strong>OneID</strong>, a different identity system, not Orchestration.</td>
            </tr>
            <tr>
              <td><code>getMarketingPreferences</code></td>
              <td><code>eligibleForOnboarding: true</code>, <code>isOnboarded: true</code></td>
              <td>Hard-coded so ESPN users are never routed through the review-and-accept page.</td>
            </tr>
            <tr>
              <td><code>getAccountOnboardingStatus</code></td>
              <td><code>{"{ activeProfile: null, profiles: [] }"}</code> + a fully shaped <code>extensions</code> block</td>
              <td>ESPN does not support content onboarding via Orchestration, so it returns a no-op &quot;nothing required&quot;.</td>
            </tr>
            <tr>
              <td><code>getUserDetails</code></td>
              <td><code>{"{ me: { account: { attributes: { email: '' } } } }"}</code></td>
              <td>Placeholder pending <code>ACP-701</code> (move ESPN and Disney+ to <code>meQuery</code>).</td>
            </tr>
            <tr>
              <td><code>getDefaultProfileData</code></td>
              <td>one fake profile, <code>id: &apos;default_profile&apos;</code>, <code>isPinProtected: false</code></td>
              <td>ESPN has no profiles product; profile-aware shared code would crash on an empty response. <code>selfServiceDeleteWithActionGrant</code> is the same idea: <code>Promise.resolve({"{}"})</code>, marked <em>&quot;used only on D+&quot;</em>.</td>
            </tr>
            <tr>
              <td><code>logout</code></td>
              <td><code>sdkSession.reset()</code> → <code>invalidateQueries([&apos;isLoggedInQuery&apos;, true])</code> → <code>cleanBrowserStorage()</code></td>
              <td>The comment says it plainly: <em>&quot;the logout graph call does not exist on ESPN+&quot;</em>. Logout is an SDK session reset, not a network call.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Why this is defensible.</strong> The alternative is tenant branching inside shared components — dozens of <code>if (tenant === &apos;espn&apos;)</code> checks across <code>commerce-base</code>, each one a place where a Disney+ change silently breaks ESPN. Pushing divergence into one brand package keeps the shared layer branch-free and keeps the knowledge in a single reviewable file. <strong>What it costs:</strong> silent divergence. These methods return a plausible but fabricated answer with <em>no runtime signal that it is fake</em>. <code>getUserDetails</code> returns <code>email: &apos;&apos;</code> — an empty string, not <code>null</code> — so falsy checks pass and truthy checks silently fail. And unit tests over them prove nothing: they assert that a constant equals itself, so coverage here is actively misleading. Ten methods also <em>throw</em> outright, in two deliberately different registers: <code>Not implemented</code> (never will be — <code>avatarCollections</code>, <code>avatarSet</code>, both Nielsen methods, <code>profileViewData</code>, <code>redirectRulesQuery</code>, <code>getIdentityDetails</code>, <code>profilesRedirectRulesData</code>) versus <code>Implementation not yet created for tenant</code> (planned — the two license-plate methods). <code>getIdentityConsent</code> is the one hybrid: a real <code>createConsentToken</code> mutation when logged in, a synthesised <code>{"{ consent: { id: sessionInfo.device.id, idType: 'DeviceId' } }"}</code> when logged out.
      </p>

      <h2 id="proxy-shim">The notImplemented Proxy Shim</h2>
      <p>
        For the 68 <code>OrchestrationOperations</code> members ESPN supplies <strong>six</strong> real entries — <code>acceptExtraMemberInvite</code>, <code>checkExtraMemberEligibility</code>, <code>extraMemberInfoQuery</code>, <code>redeemExtraMemberInvite</code>, <code>validateActionGrant</code> and the static <code>getDefaultProfileData</code> — and covers the rest with a <code>Proxy</code> whose intent is friendly: any other operation resolves at property-access time to a thrower with a clear message.
      </p>
      <CodeBlock
        code={`async function notImplemented() {
  throw new Error('Not implemented');
}

/** Unimplemented methods throw a standardized notImplemented error. */
export function buildOperations<T extends Record<string, unknown>>(impl: Partial<T>): T {
  return new Proxy(impl as T, {
    get(target, property: string | symbol) {
      const value = target[property as keyof T];
      if (!value) { return notImplemented; }
      return value;
    },
  });
}`}
        lang="typescript"
        filename="packages/cgi/data-interface-espn/src/identity/operations/get-orchestration-operations.ts"
      />
      <p>
        <strong>The hazard: the intent does not survive the spread.</strong> <code>identity-data-interface.ts:150</code> ends with <code>...getOrchestrationOperations(queryFunction)</code>. Object spread enumerates the proxy <em>target&apos;s</em> own enumerable keys — the Proxy installs only a <code>get</code> trap, no <code>ownKeys</code> trap — so the spread copies exactly the six real keys into a plain object and leaves the fallback behind. Reproduced directly:
      </p>
      <CodeBlock
        code={`$ node -e '
function notImplemented(){ throw new Error("Not implemented"); }
const p = new Proxy({a:1,b:2}, { get(t,k){ const v=t[k]; return v ? v : notImplemented; } });
const spread = {...p};
console.log("keys", Object.keys(spread), "| spread.zzz is", typeof spread.zzz);
try { p.zzz(); } catch (e) { console.log("p.zzz()      ->", e.constructor.name, e.message); }
try { spread.zzz(); } catch (e) { console.log("spread.zzz() ->", e.constructor.name, e.message); }
'
keys [ 'a', 'b' ] | spread.zzz is undefined
p.zzz()      -> Error Not implemented
spread.zzz() -> TypeError spread.zzz is not a function`}
        lang="bash"
        filename="verify-proxy-spread.sh"
      />
      <p>
        <strong>Verification status:</strong> the spread at line 150 is confirmed in source and the JavaScript semantics are confirmed empirically above. What I did <em>not</em> do is observe a failing ESPN page in a browser — so treat &quot;<code>dataInterface.switchProfile</code> throws a <code>TypeError</code>, not <code>Not implemented</code>&quot; as strongly supported rather than field-observed. If it holds, <code>buildOperations</code> provides <em>no runtime value at all</em> on ESPN and a five-line test would settle it permanently. Good probe: <code>cancelInvite</code>, declared on ESPN&apos;s <code>Pick&lt;&gt;</code> union yet absent from the object literal. A related consequence: because the shim is a <code>Proxy</code>, feature detection never works either — <code>Object.keys(dataInterface)</code> and <code>&apos;switchProfile&apos; in dataInterface</code> do not enumerate the missing operations, so never write capability checks against this object.
      </p>
      <MermaidDiagram
        chart={proxyDiagram}
        title="Orchestration Operation Resolution Path"
        caption="The red terminal is the one that actually ships: the friendly error is designed for, but the spread copy is what commerce-base receives."
        minHeight={550}
      />

      <h2 id="device-provider">ESPN&apos;s One Unique Session Component</h2>
      <p>
        Session and token plumbing live in <code>@solo/sdk-session</code>, shared by ESPN and Disney+ (Hulu does not use it). ESPN contributes exactly one bespoke piece — a good study in what a pragmatic workaround looks like when it is documented honestly:
      </p>
      <CodeBlock
        code={`export class ESPNDeviceAttributeProvider extends SDK.Device
  .BrowserDeviceAttributeProvider {
  private espn_aid?: string;

  constructor() {
    if (!isBrowser()) { throw new Error('getDeviceAttributes was invoked on the server, ...'); }
    super();
    const COOKIE_MAX_AGE = 31_536_000; // 1 year in seconds
    this.espn_aid = getCookie('espn_aid')?.value;
    if (!this.espn_aid) {
      this.espn_aid = uuidv4();
      setCookie({ cookieName: 'espn_aid', cookieValue: this.espn_aid,
                  maxAgeSeconds: COOKIE_MAX_AGE, domain: 'espn.com' });
    }
  }

  getDeviceAttributes(): DeviceAttributes {
    const deviceAttributes = super.getDeviceAttributes();
    deviceAttributes.osDeviceIds.push({
      identifier: this.espn_aid,
      // this enum needs to be updated in the SDK to support espnAnonymousSessionId
      // but this should still work by hacking in this string.
      type: 'espnAnonymousSessionId' as OsDeviceIdType,
    });
    return deviceAttributes;
  }
}`}
        lang="typescript"
        filename="packages/cgi/sdk-session/src/espn-device-attribute-provider.ts"
      />
      <p>
        It mints a one-year anonymous id cookie scoped to <code>domain: &apos;espn.com&apos;</code> so the id survives across ESPN properties, then pushes it into the SDK&apos;s device attributes under a type the SDK&apos;s <code>OsDeviceIdType</code> enum does not officially have. Note what makes this an acceptable hack rather than a landmine: the cast is one line, it carries a comment stating exactly what is wrong and what the real fix is (update the SDK enum), and it is confined to a single 59-line class. Hold yourself to that standard when you must do the same. The rest of session state is namespaced per client id and environment — <code>__bam_sdk_access--espn-a9b93989_qa</code>, <code>__bam_sdk_device_grant--espn-a9b93989_qa</code>, <code>__bam_sdk_session_info--espn-a9b93989_qa</code> — which is how test helpers fake a logged-in session. Token refresh is entirely the SDK&apos;s job; there is no manual refresh loop in cgi-web.
      </p>

      <h2 id="errors">Error Normalisation and React Query</h2>
      <p>
        The only error-handling logic in the whole ESPN data interface is 48 lines, and its decision is unusual: <strong>structured SDK errors are resolved, not thrown.</strong>
      </p>
      <CodeBlock
        code={`try {
  data = await sdkSession.orchestrationApi.query<T['data']>(options);
} catch (error_) {
  const error = error_ as { reasons?: SDKErrorReason[] };

  // If the reasons array is missing or empty, rethrow the error.
  if (!Array.isArray(error?.reasons) || error.reasons.length === 0) throw error;
  for (const reason of error.reasons) {
    if (!reason.code) throw error; // no code on *any* reason -> rethrow
    errors.push({ message: reason.description,
                  extensions: { code: reason.code }, path: [], locations: [] });
  }
  return { data, errors } as T; // response hydrated with errors
}
return { data, errors } as T;   // success response`}
        lang="typescript"
        filename="packages/cgi/data-interface-espn/src/identity/operations/setup-query-function.ts"
      />
      <p>
        Callers therefore face two failure modes. <strong>Soft</strong>: an SDK error whose <code>reasons[]</code> all carry a <code>code</code> becomes a GraphQL-shaped <code>errors</code> array on a <em>resolved</em> promise. <strong>Hard</strong>: anything else rethrows and propagates to React Query and the error boundary. Two sharp edges: one reason lacking a <code>code</code> rethrows the <em>entire</em> multi-reason error, and <code>path</code>/<code>locations</code> are always fabricated as <code>[]</code>, so GraphQL error-position tooling is useless here. There is no retry, backoff or timeout in the data interface at all — timeouts come from the SDK endpoint config. Above it, the Flex read path is wrapped by <code>commerce-base/src/common/hooks/use-get-page-data.ts</code>, whose key convention is <code>[`flexApi.getScreen.&lt;key&gt;`, queryParams]</code> and which exposes the dev <code>href</code> override by flipping the key to <code>&apos;unknown&apos;</code> and supplying a <code>configOverride</code>. Alongside it sit the <code>@solo/sdk-session</code> hooks (<code>useSDKQuery</code>, <code>useSDKMutation</code>), where query gating is <strong>three-way</strong> — <code>enabled: isBrowser() &amp;&amp; enabled &amp;&amp; isReady</code> — and when the SDK is disabled the hook sets <code>retry: false, useErrorBoundary: true</code> and throws from the <code>queryFn</code> with the offending key embedded, because per the code comment the team wants the failure &quot;immediately, and to the error boundary (loudly)&quot; rather than after three silent retries. Conventions when you add a query: array-first string-literal keys (<code>[&apos;flexApi.getScreen.landingPlans&apos;, params]</code>, <code>[&apos;isLoggedInQuery&apos;, true]</code>), <code>useErrorBoundary: true</code> for anything the page cannot render without, and always <strong>owner metadata</strong> — <code>meta: {"{ owner: Owners.TAP, errorMessage: ERROR_MESSAGES.X }"}</code> — which is what routes a Datadog RUM error to the right team. There is no centralised key factory; keys are ad hoc per callsite.
      </p>

      <h2 id="no-codegen">No Codegen, and the Vocabulary</h2>
      <p>
        No <code>.graphql</code> files, no fragments, no graphql-codegen config, no generated schema anywhere in the ESPN path. Every operation is a hand-written template literal in its own file with a hand-written result type in <code>@solo/types</code>. The convention is worth copying exactly — the operation name is a <code>const</code> interpolated in <strong>two places</strong>, into the query string and into <code>operationName</code>, so the two can never drift. <code>get-subscriptions.ts</code> is the model: <code>const operationName = &apos;getSubscriptions&apos;</code>, that constant interpolated into the exported <code>getSubscriptionsQuery</code> template literal, and the same constant handed to the query function as <code>operationName</code>. Note its asymmetric envelope handling: success collapses to a bare <code>subscriptions</code> array (or <code>[]</code>), failure preserves <code>{"{ data: null, errors, extensions }"}</code> — callers must handle both shapes. The consequence of no codegen is that <strong>nothing validates ESPN&apos;s queries against the real ESPN Orchestration schema at build time</strong>; the repo&apos;s only substitute is the mock tripwire below. The single generated file in the ESPN app is not GraphQL at all — it is <code>apps/commerce/espn/src/commerce-espn-dict-keys.generated.ts</code>, localisation keys produced by the <code>prebuild</code> script <code>pnpm --filter @solo/dictionary extract-ssr-keys &quot;$PWD&quot; commerce-espn</code>. <strong>Subscriber cohorts</strong> are ESPN-only vocabulary. The Flex execution <code>subscriberCohort</code> (<code>PUT /execution/v1/subscription/subscriber-cohorts</code>) returns <code>cohorts[]</code> of <code>{"{ type, provider?, affiliateId? }"}</code>, and <code>apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts</code> derives Adobe context: <code>wholesale_user</code> → <code>isWholesaleUser: &apos;Yes&apos;</code> (acquired through a wholesale/bulk partner deal rather than direct-to-consumer); <code>wholesale_mvpd_user</code> → <code>isMVPDWholesaleUser: &apos;Yes&apos;</code> (wholesale via an <strong>MVPD</strong> — cable, satellite, vMVPD); <code>wholesaleUserProvider</code> → de-duplicated comma-joined provider names, defaulting to the literal <code>&apos;no provider&apos;</code>. The derived booleans are stringly typed (<code>&apos;Yes&apos; | &apos;No&apos;</code>) because they feed Adobe; the type is <code>ESPNContextData</code> in <code>types/adobe.ts</code> and the Hulu and Disney+ equivalents carry no cohort fields at all. <code>affiliateId</code> is parsed and then never used. Finally, <strong>&quot;ledger&quot;</strong> here does not mean an accounting ledger — it means <em>a Flex screen that itemises a price change</em>: <code>planSwitchLedger</code>, <code>planSwitchLedgerSecondary</code>, <code>restartLedger</code>. Separately <code>consentLedger</code> (<code>/screens/{"{version}"}/account/consent-ledger</code>) is an audit trail of consent decisions, and <code>deviceRestartLedger</code> exists for Disney+ but not ESPN. Two honest negative results so you do not hunt for them: <strong>&quot;TVE&quot;</strong> (TV Everywhere) appears <em>nowhere</em> in ESPN commerce source — MVPD is the closest concept in code — and <strong>&quot;ESPN Unlimited&quot;</strong> appears nowhere as a product name either; the closest artefact is an <code>unlimited</code> dynamic URL slug gated by the Sparrow flag <code>wpnx-web-identity-enable-begin-unlmt-route</code>. If a product conversation uses a term, do not assume the code shares it.
      </p>

      <h2 id="mocking">Mocking and Running It Locally</h2>
      <p>
        The ESPN mock layer covers less than you expect. <code>apps/commerce/espn/server-mocks/server-handlers.ts</code> is two spreads — dictionary handlers plus Sparrow config, SSR only. The <strong>SDK bootstrap config</strong> is mocked up in <code>commerce-base/src/common/context/__browser-mocks__/handlers.ts</code>, served from the checked-in <code>packages/cgi/sdk-session/src/__fixtures__/espn/*.json</code> snapshots — precisely why the fixture is authoritative. The only ESPN-app-local browser mock is the subscriber-cohorts handler, and it demonstrates a repo-wide convention: <code>__screen</code> as a <strong>mock-scenario selector</strong> (<code>&apos;empty&apos;</code>, <code>&apos;mvpd-wholesaler&apos;</code>, <code>&apos;multiple-wholesalers&apos;</code>), read from <code>useCommerceQueryParams()</code> and forwarded to Flex, where it is a dev-only fixture selector rather than a real Flex parameter — as are its siblings <code>__requestID</code> and <code>__region</code>.
      </p>
      <CodeBlock
        code={`# plain dev — real backends, no mocking
pnpm dev:commerce:espn

# integration mode — NEXT_PUBLIC_API_MOCKING=enabled, MSW on. This is the one you want.
# local host name is local.plus.espn.com (SSL proxy :5004 -> next dev :5040)
pnpm dev:commerce:integration:espn

# HALF-BROKEN: sets NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled, but nothing reads it. The
# consuming code was deleted in June 2025; the var survives only in the app's turbo.json
# and this script, so in practice it only enables MSW.
pnpm --filter @solo/commerce-espn dev:local-flex

# targeted checks
pnpm test:data-interface-espn:coverage && pnpm lint:type-check:data-interface-espn`}
        lang="bash"
        filename="espn-data-layer-commands.sh"
      />
      <p>
        The one real safety net against rendering a Disney+-only graph query on ESPN is an MSW tripwire in <code>commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx</code>: <code>graphql.query(/(isProfileCreationProtectedQuery|activeProfileAvatarQuery)/, …)</code> answers 500 with <em>&quot;The graph fields being requested are not available in production Orchestration&quot;</em>. That is a <strong>hand-maintained regex denylist with exactly two entries</strong>, and the file&apos;s own docblock tells you to extend it with <code>|</code> as the delimiter. Any Disney+-only query <em>not</em> in that regex returns 200 in mocked runs and fails in production, so if you introduce a query ESPN Orchestration cannot serve, extending this regex is part of the work.
      </p>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>The package manifest points at a file extension that does not exist.</strong> <code>packages/cgi/data-interface-espn/package.json</code> declares <code>&quot;main&quot;</code> and <code>&quot;types&quot;</code> as <code>src/index.tsx</code>, but the file on disk is <code>src/index.ts</code>. It still works because <em>nothing resolves through <code>main</code></em> — every consumer deep-imports <code>@solo/data-interface-espn/src/data-interface</code>. The first person to write <code>import {"{ buildDataInterface }"} from &apos;@solo/data-interface-espn&apos;</code> gets an unresolvable module and no clue why.
        </li>
        <li>
          <strong>Two hydration paths.</strong> <code>src/layout/espn-layout.tsx</code> (CUP V2) and <code>src/common/layouts/legacy-application-layout.tsx</code> (CUP V1) both hydrate the device provider and the data interface — and <code>hydrate-data-interface.tsx</code> itself has two variants behind a <code>GCIEX-4196</code> flag, one of which additionally gates children on <code>useDictionaryQuery()</code> success to avoid <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code>. A change to one is easy to miss in the other. Separately, remember that <strong>spreading the Proxy defeats the Proxy</strong>: unimplemented orchestration ops are <code>undefined</code> rather than throwers, and invisible to <code>Object.keys</code> and <code>in</code>.
        </li>
        <li>
          <strong><code>use-flex-subscriber-cohorts.ts</code> bypasses the data interface</strong> — it calls <code>sdkSession.flexApi.execute</code> directly via <code>useSDKMutation</code>, so it is invisible to anything mocking or instrumenting <code>dataInterfaceAtom</code>. The same query is <em>duplicated</em> in the ESPN marketing app with different options: real drift risk.
        </li>
        <li>
          <strong><code>redeemActivationToken</code>&apos;s <code>as Promise&lt;…&gt;</code> cast is unchecked.</strong> The SDK declares <code>redeemToken</code> as returning <code>RedeemTokenAPIResult</code>; ESPN asserts a different shape, so an SDK change goes unnoticed. Its default type param also differs per brand — ESPN callers get a non-nullable response type where Hulu callers must null-check.
        </li>
        <li>
          <strong>The checked-in SDK config can silently drift</strong> from the live remote config: mocked runs use the fixture, production uses the fetch. The <code>/upgrade-js-sdk</code> flow is what refreshes the fixtures. And <strong>100% unit-test coverage is enforced</strong> on these packages, so adding a branch without a test fails CI.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: &quot;How does shared commerce code stay independent of three different backends?&quot;"
        intro="A weak answer names the pattern (dependency inversion) and stops. A strong answer names the pattern, shows the seam, then volunteers the cost — because the cost is where the engineering judgment lives."
        steps={[
          "Name the seam concretely: one contract type owned by the shared layer, one build function exported per brand, injected at boot through a provider or atom. Shared code depends on the type, never on a brand package.",
          "Show what the brand package is allowed to be: for ESPN an adapter over a vendor SDK — 908 source lines, zero fetch calls, zero URL construction. Size is evidence the abstraction is holding.",
          "Volunteer the cost unprompted: the contract is one flat structural type of ~100 methods with no compiler-enforced base, so every brand satisfies the union of everyone's needs. Duck typing plus a hand-written 'keep these in sync' warning is the whole enforcement mechanism.",
          "Describe how a brand satisfies methods it cannot implement — real impl, explicit throw, hard-coded envelope, or a Proxy fallback — and say which you would accept in review and why.",
          "Then take the harder position: defend returning fabricated envelopes (it keeps shared UI branch-free, and 'ESPN personal info lives in OneID' is a true statement about ESPN) while naming the price — a stub resolves with no runtime signal it is synthetic, getUserDetails returns email: '' so falsy checks pass, and tests over constants assert that constants equal themselves.",
          "Close on the production implication and the mitigation you would add: a tripwire for capabilities the backend cannot serve, or an observability tag so a fabricated value is traceable.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Backend Call</h2>
      <InterviewChallenge
        title="Wire up a new ESPN screen and a new account query"
        scenario={
          <>
            Product wants an ESPN-only screen at <code>/screens/v1/account/wholesale-summary</code> rendered by Flex, plus a small piece of account data only the Orchestration graph can provide. You own the cgi-web side. Meanwhile a teammate has opened one PR adding a <code>fetch</code> inside a <code>commerce-base</code> component &quot;because it was faster&quot;, and another calling <code>dataInterface.getProfileSetupDetails()</code> to read a field the type happens to expose.
          </>
        }
        tasks={[
          "Decide which layer each half touches, and say what code you do NOT write for the Flex screen — including who adds the endpoint and where its definition ends up living.",
          "For the graph query, list every file you create or edit in packages/cgi/data-interface-espn, and state the operation-name convention that keeps the query string and operationName from drifting.",
          "Explain what happens at runtime when the second PR calls dataInterface.getProfileSetupDetails() on ESPN, and why the error message is not the one its author expects.",
          "Reject the fetch-in-commerce-base PR with a specific architectural reason, not a style objection.",
          "Name the two safety nets you must touch so this work cannot pass mocked tests and fail in production, plus the one enforcement gate that fails your PR if you skip it.",
        ]}
        pitfalls={[
          "Adding a key→URL map to the ESPN data interface. That is Hulu's pattern; ESPN resolves keys from the remote SDK config and has no in-repo map.",
          "Setting Authorization, x-bamtech-partner, region or device headers yourself — the SDK and Edge inject all of those, and region and partner are implicit in the token and client id.",
          "Sending a templateId to request a specific template. templateId is a RESPONSE field; Flex chooses the template from site config plus experiments.",
          "Assuming an unimplemented orchestration operation throws a friendly 'Not implemented' error — the spread over the Proxy leaves the fallback behind.",
          "Trusting Object.keys(dataInterface) or an `in` check for feature detection; the Proxy does not enumerate.",
          "Skipping the espnOrchestrationErrorHandler regex, so a graph field ESPN cannot serve returns 200 in every mocked run.",
        ]}
        signal="A strong candidate separates 'the SDK config owns this' from 'the repo owns this' immediately, writes the smallest possible brand-package change, and treats the two-entry hand-maintained regex and the 100% coverage gate as part of the definition of done rather than someone else's problem."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>1. Which layer.</strong> The Flex screen needs <em>no data-interface change at all</em>. <code>getFlexScreen</code> already exists and takes a symbolic <code>key</code>; the SDK team adds <code>wholesaleSummary</code> to the ESPN bootstrap config, and it becomes visible in the repo only when someone refreshes <code>packages/cgi/sdk-session/src/__fixtures__/espn/*.json</code> — which you must do or mocked runs 404. Your work is a React Query hook (follow <code>use-get-page-data.ts</code>, key <code>[&apos;flexApi.getScreen.wholesaleSummary&apos;, params]</code>) plus page wiring. If the endpoint is not live yet, the sanctioned stopgap is <code>key: &apos;unknown&apos;</code> with a <code>configOverride</code> appending the path, with a ticket reference in the comment — exactly as <code>use-activation-success-page-data.ts</code> does.
        </p>
        <p>
          <strong>2. The graph query.</strong> Four edits. (a) New <code>identity/operations/get-wholesale-summary.ts</code> using the convention: <code>const operationName = &apos;getWholesaleSummary&apos;</code> interpolated into the exported template-literal query <em>and</em> passed as <code>operationName</code> — one constant, two uses, no drift. (b) Export it from <code>identity/operations/index.ts</code>. (c) Add the method to the <code>Pick&lt;&gt;</code> union and the returned object in <code>identity-data-interface.ts</code>, passing the <code>queryFunction</code> from <code>setupQueryFunction</code>. (d) Declare the method and result type in <code>types/src/index.d.ts</code> — and at that moment <strong>Disney+ and Hulu must also satisfy it</strong>, because <code>DATA_INTERFACE</code> is one flat type. That cross-brand tax is the real design decision in this ticket.
        </p>
        <p>
          <strong>3. The <code>getProfileSetupDetails</code> call.</strong> TypeScript accepts it because ESPN&apos;s identity <code>Pick&lt;&gt;</code> includes <code>OrchestrationOperationNames</code>. At runtime it is <code>undefined</code>: <code>getOrchestrationOperations</code> returns a <code>Proxy</code> whose <code>get</code> trap supplies <code>notImplemented</code>, but <code>identity-data-interface.ts:150</code> spreads it and spread enumerates only the target&apos;s six own keys. So the author expects <code>Error: Not implemented</code> and gets <code>TypeError: … is not a function</code> — a worse error, at a callsite giving no hint the capability was never implemented for this tenant.
        </p>
        <p>
          <strong>4. Rejecting the <code>fetch</code> PR.</strong> Not style — architecture. A <code>fetch</code> in <code>commerce-base</code> inverts the dependency the package exists to protect: it hard-codes one brand&apos;s transport into code all three brands compile. Concretely it loses everything the SDK gives free — per-environment endpoint resolution, <code>Authorization</code> injection and token refresh, the 15-second timeout, common headers, correlation-id registration — and it is invisible to the mock layer, which keys off the SDK config base URLs. It also cannot be swapped when ESPN migrates to ACP. The correct home is a brand data-interface method, or <code>getFlexScreen</code> if Flex can serve it.
        </p>
        <p>
          <strong>5. Safety nets and the gate.</strong> (a) Refresh the ESPN SDK config fixtures so mocked runs resolve the new key, and add an MSW handler under <code>apps/commerce/espn/src/queries/browser_mocks/</code> using <code>__screen</code> for scenario selection. (b) If any graph field you touch is unavailable in ESPN Orchestration, add the query name to the regex in <code>espn-orchestration-error-handler.tsx</code> — the only mechanism catching a Disney+-shaped query rendered on ESPN, maintained by hand. The gate: <strong>100% unit-test coverage</strong>, so every branch you add — including the error branch of your new operation — needs a test or CI fails. Bonus credit: attach <code>meta: {"{ owner, errorMessage }"}</code> so failures route to the right team in Datadog.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          One export per brand (<code>buildDataInterface</code>) injected through <code>dataInterfaceAtom</code> keeps <code>commerce-base</code> free of brand networking — at the cost of one flat duck-typed contract of ~100 methods (32 own + 68 orchestration) with no compiler-enforced base.
        </li>
        <li>
          ESPN&apos;s package is an <strong>adapter, not a client</strong>: 908 non-test source lines, 31 files, zero <code>fetch</code>, zero URL construction, zero codegen. Its Flex layer is 19 lines; Hulu&apos;s is 318 with an in-repo key→URL map, because Hulu is on ACP while ESPN and Disney+ are still on CUP.
        </li>
        <li>
          The endpoint inventory lives in a checked-in SDK config snapshot (106 ESPN Flex endpoints, 270 across 31 services) — when the client is config-driven, <strong>the config file is the API documentation</strong>. The SDK injects <code>Authorization</code>; the app adds exactly one header (<code>X-Bamtech-Sales-Platform</code>); region, partner and device are implicit in the token, client id and device grant; and <code>templateId</code> is a response field.
        </li>
        <li>
          Several methods return hard-coded envelopes (personal info → OneID, no content onboarding, logout = <code>sdkSession.reset()</code>). Defensible, because it keeps shared code branch-free — but it buys silent divergence and tests that assert a constant equals itself.
        </li>
        <li>
          The <code>notImplemented</code> <code>Proxy</code> covers 62 of 68 orchestration ops in intent, but the spread at <code>identity-data-interface.ts:150</code> copies only the six real keys, so the friendly error becomes a <code>TypeError</code> — verified in source and in JS semantics, not yet field-observed.
        </li>
        <li>
          Know the workarounds by name: the <code>espnAnonymousSessionId</code> enum cast in <code>ESPNDeviceAttributeProvider</code>, the two-entry Orchestration tripwire regex, the dead <code>NEXT_PUBLIC_FLEX_LOCAL_SERVICE</code> knob, and a <code>package.json</code> <code>main</code> pointing at a <code>.tsx</code> file that does not exist and works only because everyone deep-imports.
        </li>
      </ul>
    </div>
  );
}
