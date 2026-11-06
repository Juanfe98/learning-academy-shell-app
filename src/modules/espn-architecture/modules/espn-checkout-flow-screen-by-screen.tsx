import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const naiveVsRealDiagram = String.raw`flowchart LR
  subgraph NAIVE["The mental model everybody arrives with"]
    N1["/commerce/plans<br/>404 for ESPN"]
    N2["/identity/login"]
    N3["/commerce/add-ons"]
    N4["/commerce/billing"]
    N5["/commerce/success"]
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
  end
  subgraph REAL["What ESPN actually does"]
    R1["plus.espn.com/watch/offers<br/>plan cards on Nexus, outside cgi-web"]
    R4["/identity/login"]
    R5["/identity/loading<br/>12 ordered redirect handlers"]
    R6["/commerce/add-ons<br/>experiment only"]
    R2["/commerce/billing<br/>the ledger"]
    R3["/commerce/success"]
    R1 -->|"deep link with pref or offers"| R2
    R1 -.->|"only when not authenticated"| R4
    R4 --> R5
    R5 -->|"entitledUserRedirectHandler"| R2
    R5 -.->|"wpnx-add-on-step AND pref"| R6
    R6 --> R2
    R2 --> R3
  end`;

const entryContractsDiagram = String.raw`flowchart LR
  M["Marketing plan card - CMS authored href<br/>secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited"]
  P["ESPN paywall deep link<br/>/commerce/billing with offerId plus campaignId"]
  U["Unified offers param<br/>/commerce/billing?offers=encoded pairs"]
  A["/commerce/add-ons cart CTA<br/>all selected offers"]
  L["/identity/login?redirectURL=<br/>then /identity/loading"]
  RD["/commerce/redeem and /commerce/activate"]
  B["/commerce/billing<br/>POST or GET subscription preview"]
  S["/commerce/success"]
  M --> B
  P --> B
  U --> B
  A --> B
  L --> B
  RD --> B
  B --> S`;

const loadingRouterDiagram = String.raw`flowchart TD
  START["/identity/loading loads<br/>page renders null"] --> SSR{"SSR redirectUserToRedirectURL<br/>is redirectURL present?"}
  SSR -->|"yes and origin equals root_domain"| OUT1["302 to that URL"]
  SSR -->|"present but foreign origin"| OUT2["delete the param and throw<br/>Only URLs from the domain are permitted"]
  SSR -->|"absent"| HOOK["client useNavigationRedirect<br/>loop orderedNavigationRedirectHandlers"]
  HOOK --> H1{"oAuthRedirectHandler"}
  H1 -->|"no"| H2{"marketingPreferencesRedirectHandler"}
  H2 -->|"no"| H3{"subscriberAgreementRedirectHandler"}
  H3 -->|"no"| H4{"consumeAndTransfer / ednaRedemption / ednaActivation"}
  H4 -->|"no"| H5{"licensePlateFlowRedirectHandler"}
  H5 -->|"no"| H6{"addOnsExperimentRedirectHandler<br/>wpnx-add-on-step equals add-on-step<br/>AND no offDeviceGrant<br/>AND queryParams.pref"}
  H6 -->|"yes"| ADDONS["/commerce/add-ons"]
  H6 -->|"no"| H7{"referrerRedirectHandler<br/>localStorage referrer from authRedirect"}
  H7 -->|"yes"| BACK["back to the page that bounced you"]
  H7 -->|"no"| H8{"entitledUserRedirectHandler<br/>isNewUser OR from-signup and entitled"}
  H8 -->|"yes"| BILL["/commerce/billing"]
  H8 -->|"entitled only"| ONB["pathKey onboarding<br/>espn.com/watch"]
  H8 -->|"no"| H9{"skipWelcomeBackExperimentHandler<br/>experiment on AND no pref"}
  H9 -->|"yes"| PLANS["pathKey plan_select<br/>espn.com/watch/offers"]
  H9 -->|"no"| H10["defaultRedirectHandler<br/>pathKey welcome_back<br/>espn.com/watch"]`;

const preBillingDiagram = String.raw`flowchart TD
  ENTER["/commerce/billing mounts"] --> GATE{"LoginRequired<br/>dataInterface.isLoggedIn"}
  GATE -->|"false"| SU["authRedirect stores referrer<br/>then /identity/sign-up<br/>NOT /identity/login"]
  GATE -->|"true"| UBR["useBillingRedirects<br/>three sub-hooks in order"]
  UBR --> D1{"useDOBRedirect<br/>date of birth missing?"}
  D1 -->|"yes"| DOB["identity DOB collection"]
  D1 -->|"no"| D2{"useReviewAndAcceptRedirect<br/>marketing prefs onboarding due?"}
  D2 -->|"yes"| RA["/identity/review-and-accept"]
  D2 -->|"no"| D3{"useSubscriberAgreementReviewRedirect<br/>SA review required?"}
  D3 -->|"yes"| SA["/identity/subscriber-agreement"]
  D3 -->|"no"| FETCH["fetch the subscription preview screen"]
  UBR -.->|"isPendingRedirect true"| LOADER["PageLoader - checked AFTER<br/>the flex-redirect and roadblock branches"]
  FETCH --> BRANCH{"Flex response shape"}
  BRANCH -->|"isFlexRedirect"| NAV["handleFlexNavigation"]
  BRANCH -->|"subscription-preview-roadblock"| RB["BillingRoadblock<br/>See eligible plans"]
  BRANCH -->|"billing template"| CONTENT["BillingContent<br/>payment form plus Agree and Subscribe"]`;

const purchaseSequenceDiagram = String.raw`sequenceDiagram
  autonumber
  participant B as Browser
  participant CUP as CUP billing page
  participant PM as Payment tokenizer
  participant FX as Flex BFF
  participant DD as Datadog
  B->>CUP: click Agree and Subscribe - a Flex CTA action
  CUP->>CUP: handleLedgerSubmitAction wraps recaptcha signupPayment
  CUP->>CUP: react-hook-form handleSubmit validates the form
  CUP->>DD: RUM FLEX_INTERACTION
  CUP->>CUP: getOfferData on action.data.payload - not router.query
  CUP->>PM: usePreparePaymentMethod tokenize the card
  PM-->>CUP: paymentMethodId plus isTemplatized
  CUP->>FX: PUT execution/v2/subscription/signup
  FX-->>CUP: 200 with actionKey navigate and location signup-success
  CUP->>DD: RUM SIGNUP_SUCCESS plus unsampled logger.info
  CUP->>CUP: invalidate subscriberCohort and getSessionInfo caches
  CUP->>B: router.push /commerce/success with merged query
  B->>FX: GET screens/v1/subscription/success
  FX-->>B: success template with the ESPN watch CTA`;

const offerSwitchDiagram = String.raw`stateDiagram-v2
  [*] --> Ledger
  Ledger : billing ledger rendered for offer A
  Submit : PUT execution v2 subscription signup
  Judge : Flex re-evaluates eligibility server side
  Swap : 200 with errorCode FLX-0226 plus replacement offerContext
  Logged : unsampled warn ELIGIBILITY_OFFER_SWITCH
  Success : navigate to signup-success
  Ledger --> Submit
  Submit --> Judge
  Judge --> Success : eligible
  Judge --> Swap : free trial already consumed
  Swap --> Logged
  Logged --> Ledger : handleFlexNavigation with errorCode and new offers
  Success --> [*]`;

export const toc: TocItem[] = [
  { id: "the-correction", title: "The Correction: The Flow Is Not What You Think", level: 2 },
  { id: "entry-contracts", title: "Entry Contracts: Every Way Into CUP", level: 2 },
  { id: "param-vocabulary", title: "The Query-Param Vocabulary", level: 3 },
  { id: "validation-truth", title: "What Validation Actually Happens", level: 3 },
  { id: "screen-by-screen", title: "Screen by Screen, in Execution Order", level: 2 },
  { id: "identity-loading", title: "/identity/loading Is the Real Traffic Controller", level: 2 },
  { id: "handler-chain", title: "The Ordered Handler Chain", level: 3 },
  { id: "why-espn-leaves-cup", title: "Why ESPN Redirects Leave CUP Entirely", level: 3 },
  { id: "add-ons", title: "/commerce/add-ons", level: 2 },
  { id: "billing-ledger", title: "/commerce/billing — The Ledger", level: 2 },
  { id: "ledger-v1-v2", title: "V1 vs V2 Ledger, and the Flag That Is Not There", level: 3 },
  { id: "pre-billing-redirects", title: "The Pre-Billing Redirect Chain", level: 3 },
  { id: "the-stepper", title: "The Stepper: useCategoryStepper", level: 3 },
  { id: "purchase-execution", title: "Purchase Execution: One PUT, One Source of Truth", level: 2 },
  { id: "success-side-effects", title: "Success and Its Side Effects", level: 2 },
  { id: "offer-switch", title: "The Eligibility Offer-Switch Loop (FLX-0226)", level: 3 },
  { id: "edge-paths", title: "Edge Paths and ESPN No-Ops", level: 2 },
  { id: "ground-truth", title: "Ground Truth: The Playwright Catalogue", level: 2 },
  { id: "debugging-playbook", title: "Debugging a Broken ESPN Purchase", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnCheckoutFlowScreenByScreen() {
  return (
    <div className="article-content">
      <p>You are going to be asked to debug a broken ESPN purchase, and the first thing that will mislead you is your own mental model of the flow. Almost everyone arrives believing: plan page, then login, then add-ons, then billing, then success. For ESPN that model is wrong at three of the five hops. This module walks the real path in execution order, names the file that owns each hop, and tells you which layer to blame when it breaks.</p>

      <h2 id="the-correction">The Correction: The Flow Is Not What You Think</h2>
      <p>Three facts break the naive model, and all three are <strong>configuration, not code</strong>:</p>
      <ul>
        <li><strong><code>/commerce/plans</code> is hard-disabled for ESPN.</strong> The ESPN Sparrow workspace sets <code>enableCommerceUnifiedPlans: false</code> (<code>packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:20</code>) and the page is wrapped in <code>isRouteEnabled</code>, which returns <code>{"{ notFound: true }"}</code> (<code>common/lib/is-route-enabled.ts:80-84</code>). The route is a 404 — do not go looking for a plans bug in the ESPN app.</li>
        <li><strong>The plan selector points out of the repo.</strong> Sparrow maps <code>espn_plan_selector</code> and <code>plan_select</code> to <code>https://sandbox.espn.com/watch/offers</code> in the QA fixture (<code>…espn-workspace.ts:469-504</code>). Any Flex <code>navigate</code> to <code>plan-selector</code>, <code>welcome-back</code>, <code>home-page</code> or <code>onboarding</code> leaves CUP for an ESPN-owned surface.</li>
        <li><strong>The paywall deep-links straight to the ledger.</strong> The normal ESPN entry is <code>/commerce/billing</code> with offer identity already in the URL. Login and add-ons are <em>conditional detours</em>, not required steps.</li>
      </ul>
      <MermaidDiagram
        chart={naiveVsRealDiagram}
        title="Naive Model vs the Real ESPN Path"
        caption="In the real path the only mandatory in-CUP screens are billing and success — everything else is conditional or external."
        minHeight={550}
      />
      <p>The lesson generalises: in a multi-tenant commerce platform the <strong>flow is a configuration artifact</strong>. The same React tree produces a five-screen funnel for one brand and a two-screen funnel for another. Reason about ESPN from the code alone and you will confidently describe a flow no ESPN user ever sees.</p>

      <h2 id="entry-contracts">Entry Contracts: Every Way Into CUP</h2>
      <p>There is no single hand-off contract. There are several, all real, all converging on <code>/commerce/billing</code>. This is genuinely confusing because two accurate sources describe two different URL shapes — and neither is wrong.</p>
      <MermaidDiagram
        chart={entryContractsDiagram}
        title="Multiple Entry Contracts, One Destination"
        caption="Every documented ESPN entry lands on the ledger. The parameters differ; the destination does not."
        minHeight={400}
      />
      <p><strong>Contract A — the marketing plan card.</strong> The plan-card page lives on Nexus, and its CTA is a plain <code>href</code> authored in the CMS. These are the real values extracted from the ESPN CMS fixtures:</p>
      <CodeBlock
        code={`https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=espn_select
https://secure.web.plus.espn.com/commerce/billing?pref=espn_nfl_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=disney_hulu_espn_nfl_bundle
https://secure.web.plus.espn.com/identity/login?redirectURL=https://plus.espn.com/`} lang="text" filename="cms-authored-hrefs.txt" />
      <p>Nothing in the marketing code constructs those. <code>buildLink</code> (<code>packages/marketing/stitch/src/builders/build-link.ts:11-95</code>) passes <code>href</code> through verbatim — no param merge, no <code>pref</code> computation. The contract is a <strong>string typed by a content author</strong>, which is exactly why a typo in a <code>pref</code> value is a plausible production incident.</p>
      <p><strong>Contract B — the ESPN paywall deep-link.</strong> The paywall sends explicit offer identity: <code>/commerce/billing?offerId=&amp;campaignId=</code>, or the unified form <code>/commerce/billing?offers=&lt;encoded pairs&gt;</code>. On billing, <code>resolveOfferQueryParams</code> gives precedence to <code>offers=</code>, then repeated <code>offerId[]</code>, then a single <code>offerId</code> (<code>common/lib/offers-param.ts:174-219</code>).</p>
      <p>Both contracts are live at the same time. <code>pref</code> is a <em>package preference</em> that Flex resolves into an offer server-side; <code>offerId</code>/<code>campaignId</code> is an <em>explicit offer identity</em>. And <code>pref</code> carries a second, unrelated job: on <code>/identity/loading</code> its mere presence is one of the two conditions that route a user into the add-ons experiment. One param, two semantics, two owners.</p>

      <h3 id="param-vocabulary">The Query-Param Vocabulary</h3>
      <p>One file owns all of it: <code>packages/cgi/commerce-base/src/common/lib/use-commerce-query-params.ts</code> — 561 lines, one giant destructure, a type-narrowing block, and a flat return object. If a param is not in that file, commerce-base does not read it.</p>
      <ArticleTable caption="The params that matter for an ESPN purchase, who sends them, and what consumes them." minWidth={980}>
        <table>
          <thead>
            <tr><th>Param</th><th>Sent by</th><th>What it does</th><th>Line</th></tr>
          </thead>
          <tbody>
            <tr><td><code>pref</code></td><td>Marketing plan card (CMS href)</td><td>Preferred package id (<code>espn_unlimited</code>, …). Sent in the Flex preview body <em>unless</em> V2 + <code>offerContext</code> are both present. Also gates the add-ons redirect handler.</td><td><code>:64-171</code></td></tr>
            <tr><td><code>offerId</code> / <code>campaignId</code></td><td>ESPN paywall</td><td>Explicit offer identity. A legacy repeated-array form is also accepted.</td><td><code>:185-188</code></td></tr>
            <tr><td><code>offers</code></td><td>Paywall / add-ons cart</td><td>Unified encoded offer pairs. Highest precedence in <code>resolveOfferQueryParams</code>.</td><td><code>offers-param.ts:174-219</code></td></tr>
            <tr><td><code>successURL</code></td><td>ESPN paywall (labelled &quot;E+ Paywall redirects&quot;)</td><td>Post-purchase return target. Its presence flips the success screen into <code>UPSELL_FLOW</code>. Domain-allowlisted.</td><td><code>:92-120</code></td></tr>
            <tr><td><code>redirectURL</code></td><td>Marketing login links</td><td>Post-login return. On <code>/identity/loading</code> the origin must <em>exactly</em> equal the tenant <code>root_domain</code>.</td><td><code>loading-server-utils.ts:14-30</code></td></tr>
            <tr><td><code>salesdevice</code>, <code>navmethod</code></td><td>ESPN (bookworm attribution)</td><td>ESPN-only device and navigation attribution tags.</td><td><code>:128-129</code></td></tr>
            <tr><td><code>entitlementId</code></td><td>Deep-links, license-plate slugs</td><td>Product target, e.g. <code>espn:flagship</code>. Also flips the success screen to <code>UPSELL_FLOW</code>.</td><td><code>:112-133</code></td></tr>
            <tr><td><code>addOnOfferIds</code>, <code>addOnOfferIdsRemoved</code></td><td>Flex execution <code>navigate</code> payload</td><td>Forwarded <em>onto</em> the success page — they come back from the server, they are not user input.</td><td><code>:136-137</code></td></tr>
            <tr><td><code>redemptionCode</code></td><td>Partners</td><td>The only case-<em>insensitive</em> lookup, and the only param that is sanitized.</td><td><code>:177-181</code></td></tr>
            <tr><td><code>isEspnInternalActivation</code></td><td>ESPN internal activation entry</td><td>Must be the literal string <code>&apos;true&apos;</code>; the whole flow is gated behind <code>enableEspnInternalActivation</code>.</td><td><code>:104, :326-328</code></td></tr>
            <tr><td><code>cid</code></td><td>Marketing campaigns</td><td><strong>Not in the contract at all.</strong> Never read by commerce-base. Survives only because <code>{"{...router.query}"}</code> is spread into the next hop.</td><td><code>flex-billing-execution.ts:172</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="validation-truth">What Validation Actually Happens</h3>
      <p>Be honest with yourself here, because it changes how you triage a bad-offer report. The &quot;validation&quot; in <code>useCommerceQueryParams</code> is <strong>type narrowing only</strong>:</p>
      <CodeBlock
        code={`// common/lib/use-commerce-query-params.ts — the shape of every check
if (typeof offerId !== 'string') {
  offerId = undefined;
}

// Boolean-ish params require the literal string 'true': suppressAlternateOffers,
// isEspnInternalActivation, maintainAuthFlow, maintainActivation, emailVerified,
// reverify, isInWebView, fromUnified, __useFlexMock.

// SheerID quirk (:302-304): an unrendered template literal is coerced away.
if (pref === '\${pref}') {
  pref = undefined;
}`} lang="typescript" filename="use-commerce-query-params.ts" />
      <p>There is <strong>no format validation</strong> — no UUID check on <code>offerId</code> or <code>campaignId</code>, no allowlist on <code>pref</code>. A malformed offer id reaches Flex and fails there, so <em>a &quot;bad offer&quot; error is almost always a Flex verdict, not a client-side rejection</em>. The exceptions are redirect targets: <code>redirectURL</code> on <code>/identity/loading</code> must match <code>root_domain</code> exactly, and success-page CTAs go through an allowlist of <code>espn.com</code>, <code>disneyplus.com</code>, <code>disney.com</code>, <code>hulu.com</code>, <code>huluqa.com</code> plus the <code>sportscenter:</code> app scheme (<code>packages/cgi/commerce-utils/src/url-helpers.ts:53-63</code>).</p>

      <h2 id="screen-by-screen">Screen by Screen, in Execution Order</h2>
      <ArticleTable caption="The ESPN purchase path. The guard column is what decides whether you ever see the screen." minWidth={1120}>
        <table>
          <thead>
            <tr><th>Screen</th><th>Route</th><th>Owning file</th><th>Guards</th><th>Next step</th></tr>
          </thead>
          <tbody>
            <tr><td>Plan cards</td><td><em>external</em> <code>plus.espn.com/watch/offers</code></td><td>Nexus marketing app (not cgi-web)</td><td><code>enableCommerceUnifiedPlans: false</code> makes the CUP equivalent a 404</td><td><code>/commerce/billing</code></td></tr>
            <tr><td>Login</td><td><code>/identity/login</code></td><td><code>apps/commerce/espn/pages/identity/login/index.page.tsx</code> (19 lines)</td><td>No route flag. <code>enableIdentityOneIdAuthentication: true</code> → OneID login page</td><td><code>/identity/loading</code></td></tr>
            <tr><td>Loading (router)</td><td><code>/identity/loading</code></td><td><code>identity/loading/pages/loading-page.tsx</code> + <code>common/hooks/use-navigation-redirect.tsx</code></td><td>SSR <code>redirectUserToRedirectURL</code>; <code>isLoginRequired</code></td><td>One of 12 handler destinations</td></tr>
            <tr><td>Add-ons</td><td><code>/commerce/add-ons</code></td><td><code>signup/add-ons/pages/add-ons-page.tsx</code></td><td><code>enableSignUpFlowAddOnsRoute</code> (route) + <code>LoginRequired</code></td><td><code>/commerce/billing</code> with multi-offer params</td></tr>
            <tr><td><strong>Billing (ledger)</strong></td><td><code>/commerce/billing</code></td><td><code>signup/pages/billing-page.tsx</code></td><td><strong>No route flag.</strong> <code>OneIdWrapper</code> + <code>LoginRequired</code> + <code>useBillingRedirects</code></td><td>Execution → success, or navigate → review</td></tr>
            <tr><td>Review subscription</td><td><code>/commerce/review-subscription</code></td><td>ESPN wrapper + the shared review page</td><td>None; reuses the payment-review atom</td><td>Execution → success</td></tr>
            <tr><td>Payment processing</td><td><code>/commerce/payment-processing</code></td><td>ESPN wrapper</td><td>None; APM (alternative payment method) return landing</td><td>Success or back to billing</td></tr>
            <tr><td>3DS challenge return</td><td><code>/commerce/challenge/success</code></td><td><code>challenge/success.page.tsx</code> (10 lines)</td><td>None</td><td>Resume execution</td></tr>
            <tr><td><strong>Success</strong></td><td><code>/commerce/success</code></td><td><code>account/success/pages/create-subscription-success-page.tsx</code></td><td><code>getSubscriptionSuccessServerSideProps</code> (layout only) + <code>LoginRequired</code></td><td>ESPN watch, <code>successURL</code>, or <code>sportscenter://</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="identity-loading">/identity/loading Is the Real Traffic Controller</h2>
      <p>This is the heart of the module. The page itself is almost empty — it renders <code>null</code> and delegates every decision to one hook:</p>
      <CodeBlock
        code={`// identity/loading/pages/loading-page.tsx:21-32
export const LoadingPage: CommercePageComponent = () => {
  useStartVital(IDENTITY_TO_PROFILES_LOADING_VITAL, true);
  useNavigationRedirect();
  return null;
};
LoadingPage.isLoginRequired = true;
LoadingPage.onboardingLanguageRequired = true;`} lang="tsx" filename="loading-page.tsx" />
      <p>Before the hook runs, an SSR composition function gets first refusal: <code>redirectUserToRedirectURL</code>. It honours <code>?redirectURL</code> only when the origin exactly equals the tenant&apos;s configured root domain; otherwise it deletes the param and throws. The variable is named <code>isAllowedESPNDomain</code> but the logic is tenant-agnostic — the same code protects Disney+ and Hulu.</p>
      <MermaidDiagram
        chart={loadingRouterDiagram}
        title="/identity/loading Redirect Decision Chain"
        caption="Handlers run top to bottom and the first one that returns a destination wins — the order is the whole contract."
        minHeight={550}
      />

      <h3 id="handler-chain">The Ordered Handler Chain</h3>
      <p>The array <em>is</em> the spec, and its own comment says so: keep it in priority order, because array position determines precedence.</p>
      <CodeBlock
        code={`// common/hooks/use-navigation-redirect.tsx:78-92
export const orderedNavigationRedirectHandlers: Array<NavigationRedirectHandler> =
  [
    oAuthRedirectHandler,
    marketingPreferencesRedirectHandler,
    subscriberAgreementRedirectHandler,
    consumeAndTransferRedirectHandler,
    ednaRedemptionByCodeRedirectHandler,
    ednaActivationRedirectHandler,
    licensePlateFlowRedirectHandler,
    addOnsExperimentRedirectHandler,
    referrerRedirectHandler,
    entitledUserRedirectHandler,
    skipWelcomeBackExperimentHandler,
    defaultRedirectHandler,
  ];`} lang="typescript" filename="use-navigation-redirect.tsx" />
      <ArticleTable caption="Handler priority for an ESPN signup. Positions 8 and 10 are the two you will debug most." minWidth={1020}>
        <table>
          <thead>
            <tr><th>#</th><th>Handler</th><th>Condition</th><th>ESPN destination</th></tr>
          </thead>
          <tbody>
            <tr><td>1–3</td><td><code>oAuth</code>, <code>marketingPreferences</code>, <code>subscriberAgreement</code></td><td>OAuth flow / prefs onboarding due / SA required</td><td><code>/identity/oauth-review-terms</code>, <code>/identity/review-and-accept</code>, <code>/identity/subscriber-agreement</code></td></tr>
            <tr><td>4–6</td><td><code>consumeAndTransfer</code>, <code>ednaRedemption</code>, <code>ednaActivation</code></td><td>Profile transfer, <code>redemptionCode</code>, legacy activation params</td><td><code>/commerce/redeem</code>, <code>/commerce/activate</code>, …</td></tr>
            <tr><td>7</td><td><code>licensePlateFlowRedirectHandler</code></td><td><code>licensePlateOptions.licensePlateFlow</code> matches a slug</td><td><code>dynamic-url-map.ts</code>: ESPN owns <code>espn</code>, <code>sports</code>, <code>unlimited</code></td></tr>
            <tr><td><strong>8</strong></td><td><code>addOnsExperimentRedirectHandler</code></td><td><strong>Both</strong>: <code>wpnx-add-on-step === &apos;add-on-step&apos;</code> with no <code>offDeviceGrant</code>, <strong>and</strong> <code>queryParams.pref</code> present</td><td><code>/commerce/add-ons</code></td></tr>
            <tr><td>9</td><td><code>referrerRedirectHandler</code></td><td>localStorage referrer written by <code>authRedirect</code></td><td>Back to the page that bounced you</td></tr>
            <tr><td><strong>10</strong></td><td><code>entitledUserRedirectHandler</code></td><td><code>isNewUser</code> OR (entry point <code>Register</code> and already entitled)</td><td><code>/commerce/billing</code> — the handler that starts a purchase</td></tr>
            <tr><td>11</td><td><code>skipWelcomeBackExperimentHandler</code></td><td>Experiment on <strong>and no</strong> <code>pref</code></td><td><code>plan_select</code> → <code>espn.com/watch/offers</code></td></tr>
            <tr><td>12</td><td><code>defaultRedirectHandler</code></td><td>Unconditional fallback</td><td><code>welcome_back</code> → <code>espn.com/watch/</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Look closely at handler 8. Its parameter is called <code>isAddOnsRouteEnabled</code>, which reads exactly like the Sparrow route flag <code>enableSignUpFlowAddOnsRoute</code>. It is not that flag:</p>
      <CodeBlock
        code={`// common/redirect/handlers.ts:31-42
// TODO GREAT-541: Cleanup / Move to Production Flagship Add-on step in SUF experiment
export const addOnsExperimentRedirectHandler: NavigationRedirectHandler = ({
  isAddOnsRouteEnabled,
  queryParams,
}) => {
  if (isAddOnsRouteEnabled && queryParams?.pref) {
    return {
      destination: IDENTITY_ROUTES['add-ons'],
      handler: 'entitledUserRedirectHandler', // <-- mislabelled, see below
    };
  }
};

// common/hooks/use-navigation-redirect.tsx:206
const isAddOnsRouteEnabled = useIsInFlagshipAddonSUFExperiment();

// common/hooks/experiments/use-is-in-flagship-addon-suf-experiment.tsx:17
return data?.['wpnx-add-on-step'] === 'add-on-step' && !isLicensePlateUser;
// common/hooks/use-navigation-redirect.tsx:368-379 — where 'handler' is consumed
datadogRum.addAction('[navigation] Redirect handler success', {
  destination: handlerResult.destination,
  handler: handlerResult.handler,   // reports entitledUserRedirectHandler
  meta: handlerResult.meta,
});`} lang="typescript" filename="handlers.ts" />
      <p>Two consequences to carry into an incident. First, the add-ons detour requires a <strong>WeaponX experiment bucket</strong> and a <code>pref</code> param; the Sparrow route flag only decides whether the page 404s once you arrive. Second, the returned <code>handler</code> string is copy-pasted from the wrong handler and that string is what reaches Datadog — so a RUM search for &quot;why did this user go to add-ons?&quot; will answer <code>entitledUserRedirectHandler</code>. Trust the <code>destination</code> field, not the <code>handler</code> field.</p>

      <h3 id="why-espn-leaves-cup">Why ESPN Redirects Leave CUP Entirely</h3>
      <p>Handlers 11 and 12 target routes that <em>look</em> internal. The mechanism that ejects them is one optional field on the route record:</p>
      <CodeBlock
        code={`// common/constants/routes/models.ts:359-368
'welcome-back': {
  key: 'welcome_back',                                 // Sparrow path key
  path: route({ internal: '/commerce/welcome-back' }),
  inApp: true,
},
'plan-select': {
  key: 'plan_select',
  path: route({ internal: '/commerce/plans' }),
  inApp: true,
},

// common/hooks/use-navigation-redirect.tsx:257-280 — key is checked BEFORE inApp
if (key !== undefined) {
  return redirectFromConfig({ pathKey: key, query, saveHistory: false });
} else if (inApp) {
  return await router.replace({ pathname: formatI18nHref(lang, path), query });
}`} lang="typescript" filename="models.ts" />
      <p>Because <code>key</code> wins, the route resolves through Sparrow — and ESPN&apos;s Sparrow maps <code>welcome_back</code> and <code>plan_select</code> to <code>espn.com/watch/</code> and <code>espn.com/watch/offers</code>. The <em>default</em> branch of the login router therefore <strong>ejects the user from the commerce app</strong>, and <code>inApp: true</code> is effectively a lie whenever <code>key</code> is set. This is asserted by the only <code>.espn.</code> jest file in commerce-base: <code>identity/loading/pages/loading-page.espn.test.tsx:107-133</code> proves an entitled ESPN user with no referrer gets <code>redirectToExternalApp</code> and that <code>router.replace</code> is never called. Note also <code>saveHistory: false</code> plus <code>router.replace</code> — the loader never enters the history stack, so the back button cannot return a user to it.</p>

      <h2 id="add-ons">/commerce/add-ons</h2>
      <p>Per the ESPN fixtures and specs, the ESPN add-on surface covers <strong>NFL+ Premium</strong> (offer id <code>386dc959-54cf-4236-955d-9cc52240fa3c</code>, <code>signup/__fixtures__/espn/add-ons-page.ts:61-300</code>), <strong>MLB</strong> (which adds a consent checkbox that becomes <code>userConsents.mlb</code> plus the OneID <code>swid</code> in the execution body), <strong>PPV / bookworm</strong> screens, and the <strong>ESPN Unlimited / Flagship / Select</strong> base tiers reached via <code>espn:flagship</code> or the <code>unlimited</code> slug.</p>
      <CodeBlock
        code={`// signup/add-ons/pages/add-ons-page.tsx:108-129
const addonsRequestBody = {
  pref,
  offerContext: offerId && campaignId ? [{ offerId, campaignId }] : undefined,
  entitlementId,
};

const { data, isLoading, isSuccess } = useQuery({
  // TRAP: the key has no offer inputs, so changing the entry offer
  // in-session can serve a stale add-ons screen straight from cache.
  queryKey: ['flexApi.getScreen.addons'],
  queryFn: () =>
    dataInterface.getFlexScreen<AddOnSelectorTemplateContent>({
      key: 'addonSelector',
      version: 'v1',
      queryParams: { __screen },
      requestBody: addonsRequestBody,
    }),
});`} lang="tsx" filename="add-ons-page.tsx" />
      <p>Selections become the next URL through the cart footer (<code>common/components/cart-sticky-footer/cart-footer-action-provider.tsx</code>), which navigates to <code>/commerce/billing</code> carrying <em>all</em> selected offers. The serialisation format is switched by one Sparrow flag, <code>enableOffersParamConversion</code> (ESPN: <code>true</code>, <code>…espn-workspace.ts:47</code>):</p>
      <CodeBlock
        code={`# enableOffersParamConversion = false  (legacy array form)
/commerce/billing?offerId=<base>&offerId=<addon>&campaignId=<c1>&campaignId=<c2>

# enableOffersParamConversion = true   (unified form, the ESPN default)
/commerce/billing?offers=<encoded offerId:campaignId pairs>`} lang="text" filename="offers-param-formats.txt" />
      <p>Both shapes are asserted end-to-end in <code>apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts:105-165</code>, and the skip path asserts that only the base offer reaches billing (<code>:188-200</code>). Two structural notes: the signup add-ons page <strong>imports change-subscription v2 atoms and lib</strong> (<code>add-ons-page.tsx:6-19</code>), so refactoring those atoms breaks signup; and unauthenticated users here bounce to <code>/identity/sign-up</code>, not login.</p>

      <h2 id="billing-ledger">/commerce/billing — The Ledger</h2>
      <p>&quot;Ledger&quot; is product vocabulary for this page and it shows up in tickets and flag names. It is rendered by <code>signup/pages/billing-page.tsx</code>, which contains <strong>zero ESPN branches</strong> — every ESPN divergence arrives via Sparrow, WeaponX, the ESPN page wrapper, and <code>@solo/data-interface-espn</code>. The wrapper contributes almost nothing but a flag:</p>
      <CodeBlock
        code={`// apps/commerce/espn/pages/commerce/billing/index.page.tsx:87-93
export const getServerSideProps = buildGetServerSideProps<BillingPageProps>([
  (commerceAppConfig) =>
    getBillingPageProps({ commerceAppConfig, shouldIdleRedirect: true }),
]);`} lang="tsx" filename="index.page.tsx" />
      <p><code>getBillingPageProps</code> returns only <code>layoutConfig</code>, the SCA (3DS) config and <code>shouldIdleRedirect</code> (<code>signup/pages/billing-page-props.ts:22-39</code>). <strong>No offer data is resolved server-side</strong> — the offer is resolved by the client fetch, which is why an offer bug is never visible in the SSR payload.</p>

      <h3 id="ledger-v1-v2">V1 vs V2 Ledger, and the Flag That Is Not There</h3>
      <ArticleTable caption="Two completely different Flex contracts hiding behind the same route." minWidth={900}>
        <table>
          <thead>
            <tr><th>Aspect</th><th>V1 ledger</th><th>V2 ledger (FTC 2025)</th></tr>
          </thead>
          <tbody>
            <tr><td>Screen key</td><td><code>subscriptionPreview</code></td><td><code>subscriptionPreviewSecondary</code></td></tr>
            <tr><td>HTTP</td><td><code>GET screens/v1/subscription/preview</code></td><td><code>POST screens/v2/subscription/preview</code></td></tr>
            <tr><td>Offer shape</td><td>Flat <code>offerId</code> + <code>campaignId</code> in query params</td><td><code>offerContext: [{"{ offerId, campaignId }"}]</code> in the body</td></tr>
            <tr><td><code>pref</code> / <code>package</code></td><td>Sent</td><td><strong>Omitted</strong> when <code>offerContext</code> is present (<code>billing-page.tsx:271-283</code>)</td></tr>
            <tr><td>Turned on by</td><td>Default / fallback</td><td><code>wpnx-web-commerce-ftc-regulation-updates</code> <em>or</em> <code>enableCommerceUnifiedFtcRegulationUpdates</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Here is the operational trap. <code>enableCommerceUnifiedFtcRegulationUpdates</code> is <strong>absent from the ESPN Sparrow workspace</strong> (Hulu sets it at <code>hulu/sparrow-commerce-hulu-workspace.ts:203</code>). For ESPN the V2 ledger arrives from <strong>WeaponX</strong>, via a location-derived header. Which means: in any mocked or local environment ESPN silently falls back to the V1 GET endpoint. Every ESPN Playwright spec has to inject the flag by hand:</p>
      <CodeBlock
        code={`// apps/commerce/espn/playwright/tests/flows/signup.spec.ts:199-208
// The enableCommerceUnifiedFtcRegulationUpdates flag is necessary to add to
// see the flex v2 responses, despite not being in ESPN Sparrow.
// ... in a non-mocked scenario, WeaponX adds a header based on the
// user's location ...`} lang="typescript" filename="signup.spec.ts" />
      <p>If your local ESPN ledger looks nothing like production, check this first. The symptom is an unhandled request against the V2 route while the app quietly GETs V1.</p>

      <h3 id="pre-billing-redirects">The Pre-Billing Redirect Chain</h3>
      <p>Before the ledger renders, three identity gates run in sequence, bundled into one hook:</p>
      <CodeBlock
        code={`// signup/lib/use-billing-redirects.ts:10-36
export function useBillingRedirects() {
  const { isLoading: isLoadingDOBRedirect, shouldRedirectToDOB } =
    useDOBRedirect();
  const { isLoading: isLoadingReviewAndAcceptRedirect, shouldRedirectToReviewAndAccept } =
    useReviewAndAcceptRedirect();
  const { isLoading: isLoadingSubscriberAgreementReviewRedirect, shouldRedirectSubscriberAgreementReview } =
    useSubscriberAgreementReviewRedirect();
  const isPendingRedirect = /* OR of all six values */;
  return { isPendingRedirect };
}`} lang="typescript" filename="use-billing-redirects.ts" />
      <MermaidDiagram
        chart={preBillingDiagram}
        title="Pre-Billing Guard and Redirect Chain"
        caption="isPendingRedirect is checked after the flex-redirect and roadblock branches — a roadblock still renders while an identity redirect is pending."
        minHeight={550}
      />
      <p>Ordering matters and is explicit in the file: <code>isPendingRedirect</code> is consumed at <code>billing-page.tsx:412</code> but only short-circuits to a <code>PageLoader</code> at <code>:599-601</code> — <em>after</em> the Flex-redirect branch (<code>:539-563</code>) and the roadblock branch (<code>:565-577</code>). So &quot;already subscribed&quot; beats &quot;you still owe us a date of birth&quot;.</p>

      <h3 id="the-stepper">The Stepper: useCategoryStepper</h3>
      <p>There is no <code>use-calculate-stepper</code>. The hook is <code>common/hooks/use-category-stepper.ts</code> (114 lines) and it is not a counter — it is two <strong>static maps</strong>:</p>
      <CodeBlock
        code={`// common/hooks/use-category-stepper.ts:23-47
const CATEGORIES_DEFAULT = {
  plans: STEP_1, cadence: STEP_1,
  'subscriber-agreement': STEP_2, billing: STEP_2, 'review-subscription': STEP_2,
};
const CATEGORIES_SUBSCRIBER_AGREEMENT_FIRST = {
  'subscriber-agreement': STEP_1, plans: STEP_1, cadence: STEP_1,
  billing: STEP_2, 'review-subscription': STEP_2,
};

// :106-113
if (!category) {
  return { current: '0', total: undefined };
}
return {
  current: category.step.toString(),
  total: legalDocuments ? category.total.toString() : undefined,
};`} lang="typescript" filename="use-category-stepper.ts" />
      <p>Three things fall out of this for ESPN:</p>
      <ul>
        <li><code>/commerce/add-ons</code> is in <strong>neither map</strong>, so the hook returns <code>{"{ current: '0', total: undefined }"}</code> there.</li>
        <li>Step 1 of the ESPN funnel is <code>plus.espn.com/watch/offers</code>, which the stepper cannot see. A user reaches billing and reads &quot;2 of 2&quot; without ever having seen an in-CUP step 1.</li>
        <li>The hook explicitly does <strong>not</strong> control visibility — its own comment says so. Rendering is gated by a marker Flex sends on the template: <code>{"{stepperV2 && <Stepper …/>}"}</code> (<code>billing-content.tsx:682-684</code>). Whether ESPN&apos;s Flex ever sends <code>stepperV2</code> in production is an <strong>open question</strong>; nothing in cgi-web answers it.</li>
      </ul>

      <h2 id="purchase-execution">Purchase Execution: One PUT, One Source of Truth</h2>
      <p>Submitting the ledger is a single HTTP call made by a single hook. The chain from click to wire: <code>FlexActionsProvider onAction</code> → <code>handleLedgerSubmitAction</code> (<code>signup/billing/billing-action-handlers/handle-ledger-submission.ts:154</code>) → reCAPTCHA wrap (<code>actionName: &apos;signupPayment&apos;</code>) → react-hook-form <code>handleSubmit</code> → RUM <code>FLEX_INTERACTION</code> → a <code>switch</code> on <code>action.actionKey</code> → <code>useFlexBillingExecution</code>.</p>
      <MermaidDiagram
        chart={purchaseSequenceDiagram}
        title="Purchase Round-Trip: Browser → CUP → Flex → Success Side Effects"
        caption="Step 5 is the architectural point of this module: the offer comes from the Flex action payload, not from the URL."
        minHeight={550}
      />
      <CodeBlock
        code={`// signup/queries/use-flex-billing-execution.tsx:277-290
const { payload, scaId } = action.data;
const { offerId, campaignId, offers, redemptionCode } = getOfferData(payload);

if (!offerId || !campaignId) {
  observabilityContext.owner = Owners.TAP;
  throw new Error('Signup execution action data payload contains no offers');
}

// :426-431 — the wire call, mutationKey 'subscriptionSignup'
const options: FlexExecutionOptions = {
  key: 'subscriptionSignup',
  version: 'v2',
  requestBody,
  headers: generateFlexHeaders({ salesPlatform }),
};
// PUT https://qa-espn.api.edge.bamgrid.com/execution/v2/subscription/signup`} lang="typescript" filename="use-flex-billing-execution.tsx" />
      <p><strong>The offer the user is charged for comes from Flex&apos;s action payload, not from the URL.</strong> <code>getOfferData(payload)</code> reads the CTA&apos;s own data, and the success side-effect repeats the rule in a comment: <code>&quot;Flex execution response is the source of truth for offer data, not router.query&quot;</code> (<code>signup/side-effects/flex-billing-execution.ts:174</code>).</p>
      <p>The debugging consequence is direct and counter-intuitive: if a user reports being charged for the wrong plan, <em>inspecting the URL will mislead you</em>. The URL is an input that Flex may override. You need the rendered template&apos;s action payload (or the Flex preview response) to know what the CTA was actually wired to charge. Two body fields are worth memorising because they are named confusingly: <code>salesPlatform</code> in the body is <code>standardizeDeviceProfile(licensePlate.deviceProfile)</code> — a GCIEX-8055 fix from the era when ESPN and Disney were different apps — while the <code>?salesPlatform</code> query param goes into <em>headers</em> via <code>generateFlexHeaders</code>. Two different values, one name.</p>

      <h2 id="success-side-effects">Success and Its Side Effects</h2>
      <p>Success is not just a navigation. <code>signup/side-effects/flex-billing-execution.ts:54-226</code> does five things, in order:</p>
      <CodeBlock
        code={`// :116-142
datadogRum.addAction('SIGNUP_SUCCESS', {
  owner: Owners.TAP,
  actionCode: 'SIGNUP_SUCCESS',
  actionKey: action.actionKey,
  actionData: { ...action.data, salesPlatform, offerId, executionSource,
                sessionStorageDeviceProfile: lpo.deviceProfile, isMagicLinkFlow },
  commerceAttribution,
});
// We log in addition to adding the RUM action because logs are not sampled.
datadogLogs.logger.info('SIGNUP_SUCCESS', { /* same payload */ });`} lang="typescript" filename="flex-billing-execution.ts" />
      <ol>
        <li><strong>Observability.</strong> A RUM action <em>and</em> an unsampled Datadog log, both named <code>SIGNUP_SUCCESS</code>. The duplication is deliberate — RUM is sampled, logs are not. When asked &quot;did this purchase succeed?&quot;, query the log.</li>
        <li><code>setShouldFirePurchaseSuccessAnalytics(true)</code> — arms purchase analytics for the <em>next</em> page render.</li>
        <li><strong>Cache invalidation.</strong> <code>[&apos;flexApi.execute.subscriberCohort&apos;, [&apos;getSessionInfo&apos;, true]]</code> (refetch inactive) and <code>[&apos;dataInterface.flexExecution.cohorts&apos;]</code> (refetch active), so entitlements and cohorts reflect the new subscription.</li>
        <li>If templatized sequencing is enabled it <strong>returns early</strong> and the success action is deferred (<code>TODO WEB-36813</code>).</li>
        <li><strong>The navigate hop.</strong> It merges <code>router.query</code> with the Flex-authoritative offer params plus <code>addOnOfferIds</code>, <code>experience</code>, <code>salesPlatform</code> and a decoded <code>successURL</code>, then calls <code>handleFlexNavigation({"{ location: 'signup-success' }"})</code>, which resolves to <code>router.push(&apos;/commerce/success&apos;)</code> (<code>common/lib/use-handle-flex-navigation.ts:389-396</code>).</li>
      </ol>
      <p>Two analytics quirks: <code>signup_complete</code> fires only for the V2 action keys, and <code>subscription_end</code> only when <code>metricsData.outcome === &apos;new_subscription&apos;</code>. The success page derives its flow type purely from query params — a <code>successURL</code> or <code>entitlementId</code> means <code>UPSELL_FLOW</code>, a branch whose own comment says it is &quot;currently only relevant to an ESPN use case&quot; (<code>account/success/lib/success-screen-input.ts:8-9,56-58</code>).</p>

      <h3 id="offer-switch">The Eligibility Offer-Switch Loop (FLX-0226)</h3>
      <p>This is the path that surprises people most: a <code>200 OK</code> that is really a redirect back to the ledger with a <em>different offer than the one the user chose</em>.</p>
      <MermaidDiagram
        chart={offerSwitchDiagram}
        title="Eligibility Offer Switch — the 200 That Is Really a Loop"
        caption="Flex re-evaluates eligibility at execution time; when the requested free trial is already consumed it hands back a replacement offer instead of failing."
        minHeight={400}
      />
      <CodeBlock
        code={`// use-flex-billing-execution.tsx:135-148
function isFreeTrialIneligibilityError(data) {
  return (
    data.errorData?.action?.data?.body?.offerContext &&
    data.errorData?.action?.data?.body?.errorCode === 'FLX-0226'
  );
}
// :456-498
if (isFreeTrialIneligibilityError(data)) {
  // TODO: GCIEX-8438 - Remove after MLB double-billing investigation concludes
  datadogLogs.logger.warn('ELIGIBILITY_OFFER_SWITCH', {
    owner: Owners.TAP,
    originalOfferId: offerId,
    originalCampaignId: campaignId,
    newOfferContext: data.errorData.action.data.body.offerContext,
    errorCode: data.errorData.action.data.body.errorCode,
    navigateLocation: data.errorData.action.data.location,
  });

  if (data.errorData.action.actionKey === 'navigate') {
    const selectedOfferQueryParams = convertSelectedOffersToQueryParams(
      data.errorData.action.data.body.offerContext, enableOffersParamConversion,
      'flex-billing-execution-error-navigate');
    handleFlexNavigation({
      location: data.errorData.action.data.location,
      query: { errorCode: 'FLX-0226', ...selectedOfferQueryParams },
    });
  }
  return data; // returned only to keep the type; the navigation overrides it
}`} lang="typescript" filename="use-flex-billing-execution.tsx" />
      <p>Why does this exist? Eligibility is a server-side truth that can change between rendering the ledger and submitting it — most commonly the user has already consumed the free trial the offer promises. Rather than hard-fail, Flex returns the replacement offer inline and CUP re-enters the ledger with it. The <code>ELIGIBILITY_OFFER_SWITCH</code> warn is <strong>unsampled on purpose</strong>: it was added as a probe for a suspected MLB double-billing bug, where a single occurrence is evidence. If you are investigating a &quot;the price changed while I was checking out&quot; report, that log is your first query.</p>

      <h2 id="edge-paths">Edge Paths and ESPN No-Ops</h2>
      <ul>
        <li><strong>Unauthenticated mid-flow.</strong> <code>LoginRequired</code> awaits <code>dataInterface.isLoggedIn()</code>; on <code>false</code>, <code>authRedirect()</code> stores the current globalized pathname as a localStorage <em>referrer</em> and redirects. All three ESPN commerce wrappers (billing, add-ons, success) pass <code>authRedirectTarget = /identity/sign-up</code> — <strong>not login</strong>. After auth, <code>referrerRedirectHandler</code> (position 9) returns the user to that exact page.</li>
        <li><strong>Idle redirect.</strong> <code>shouldIdleRedirect: true</code> for ESPN and Disney+, <code>false</code> for Hulu. It mounts <code>{"<IdleTimeRedirect>"}</code> (<code>billing-content.tsx:658-663</code>), so an idle ESPN user is navigated away from a half-filled payment form.</li>
        <li><strong>No-op helpers.</strong> <code>pollForActivatedSubscription</code> and <code>refreshCookies</code> run only when <code>enablePollingForUserSubscriptions</code> is on <em>and both URLs exist</em>. ESPN&apos;s Sparrow paths define <strong>neither</strong> <code>home_service</code> nor <code>refresh_cookies</code>, so the whole block is dead for ESPN — the code comment even says &quot;This only happens on Hulu&quot;.</li>
        <li><strong>No maintenance switch.</strong> Disney+ and Hulu both set <code>BillingPage.maintenance = {"{ flag: 'enableSignUpMaintenance' }"}</code>. ESPN does not — you cannot dark the ESPN ledger with that flag.</li>
        <li><strong>Roadblock.</strong> Already-subscribed users get Flex <code>templateId: &apos;subscription-preview-roadblock&apos;</code> → <code>{"<BillingRoadblock>"}</code> with a &quot;See eligible plans&quot; CTA and Adobe page name <code>ESPN Plus D2C - Roadblock</code>.</li>
        <li><strong>Routes that exist in code but 404 for ESPN:</strong> <code>/commerce/plans</code>, <code>/commerce/welcome-back</code>, and <code>/commerce/unlock</code> (<code>enableCommerceTiara</code> is absent from the fixture). Add <code>enableCommerceUnifiedPurchase: false</code> with no <code>pages/commerce/purchase/*</code> in the ESPN tree — so where ESPN PPV purchase actually happens is an <strong>open question</strong> (likely legacy Cannonball).</li>
        <li><strong>A silent gap.</strong> <code>tenantRouteMap.espn</code> has no <code>upsellInterstitial</code> key (Disney does), so a Flex <code>navigateWithTenant</code> to <code>upsell-interstitial</code> with <code>tenant: &apos;espn&apos;</code> resolves <code>pathKey</code> to <code>undefined</code> and misbehaves <em>without</em> hitting the <code>UNRECOGNIZED_*</code> error boundaries. Inferred, not asserted anywhere.</li>
      </ul>

      <h2 id="ground-truth">Ground Truth: The Playwright Catalogue</h2>
      <p>When a digest and the code disagree, the tie-breaker is the team-owned, executable description of the flows: <code>apps/commerce/espn/playwright/support/happy-paths.ts</code> (399 lines) — a catalogue of every ESPN happy path with its owning team and a one-line behavioural statement. Read it before you read any spec:</p>
      <CodeBlock
        code={`# The canonical catalogue (read first)
apps/commerce/espn/playwright/support/happy-paths.ts:167          TAPSignup1

# The real ESPN billing coverage
apps/commerce/espn/playwright/tests/flows/signup.spec.ts             (317 lines)
apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts  (236 lines)
apps/commerce/espn/playwright/tests/flows/billing-ledger-version.spec.ts

# HONEST COVERAGE GAP -- skipped, do not count it
apps/commerce/espn/playwright/tests/signup/billing.spec.ts:18-19
  // TODO: GCIEX-984 - Unskip and fix flaky test suite
  test.describe.skip('The Billing Page', () => {

# Commands
pnpm test:commerce:playwright:espn
pnpm test:commerce:jest:espn
pnpm lint:type-check:commerce:espn`} lang="bash" filename="espn-ground-truth.sh" />
      <p><code>tests/signup/billing.spec.ts</code> is the trap here: it is named exactly what you would grep for, and it is <code>test.describe.skip</code> behind <code>GCIEX-984</code>. Treating it as coverage is how a billing regression ships. The page-object models (<code>support/pom/commerce/billing.tsx</code>, <code>add-ons.tsx</code>) are also the fastest documentation of the real form fields — card <code>4111 1111 1111 1111</code>, zip <code>94601</code>, CTA <code>data-testid=&quot;cta-button&quot;</code>.</p>

      <h2 id="debugging-playbook">Debugging a Broken ESPN Purchase</h2>
      <InterviewPlaybook
        title="How to answer: a user was charged for the wrong plan — which layer is at fault?"
        intro="A weak answer starts with the URL. A strong answer starts by naming which layer owns the offer, then works outward to the layers that can override it."
        steps={[
          "Open by naming ownership: the charged offer comes from the Flex action payload on the rendered ledger template, read by getOfferData(payload) in use-flex-billing-execution.tsx:279. The URL is an input, not the decision.",
          "Split the layers explicitly: (1) the entry contract — pref from a CMS-authored marketing href vs offerId/campaignId from the ESPN paywall; (2) CUP param resolution — resolveOfferQueryParams precedence, offers= beats offerId[] beats offerId; (3) the Flex preview response, which resolves the offer; (4) the Flex execution verdict, which can still substitute one.",
          "Name the failure that looks like a client bug but is not: an unsampled ELIGIBILITY_OFFER_SWITCH warn with FLX-0226 means Flex replaced the offer between preview and execution. The price the user saw was real; the price charged was a server decision.",
          "Name the failure that looks like a Flex bug but is not: the add-ons React Query key is the constant ['flexApi.getScreen.addons'], so a second entry offer in the same session renders a stale add-ons screen and therefore a stale cart.",
          "State the evidence you would pull, in order: the unsampled SIGNUP_SUCCESS log (RUM is sampled, logs are not), then ELIGIBILITY_OFFER_SWITCH, then the Flex preview request/response pair, and only then the URL.",
          "Close on the production implication: because nothing validates offer id format client-side, a malformed or mistyped identifier is always diagnosed by Flex, so a CUP-side fix is usually the wrong fix.",
        ]}
      />
      <InterviewChallenge
        title="Production: ESPN users land on the ledger and see the wrong price"
        scenario={
          <>
            It is 9am. Support reports that since yesterday some ESPN users who click <strong>ESPN Unlimited</strong> on <code>plus.espn.com</code> arrive at <code>/commerce/billing</code> and see the price for <strong>ESPN Select</strong>. Others see the correct price. Nobody has been charged incorrectly yet. Yesterday brought three changes: a marketing content release, a WeaponX flag change to <code>wpnx-add-on-step</code>, and a cgi-web deploy touching <code>signup/add-ons/</code>. You own cgi-web — not Flex, not the CMS.
          </>
        }
        tasks={[
          "Name the three candidate entry contracts that could produce a wrong-offer ledger, and the single file that decides which one wins.",
          "Explain how you would tell, from telemetry alone, whether the wrong offer entered from the URL or was chosen by Flex.",
          "Explain why 'some users, not all' is a strong hint about which of the three changes is responsible.",
          "Decide whether this is a cgi-web bug, and justify the escalation target with a specific file or flag.",
          "Say what you would add so the next occurrence is diagnosable in one query.",
        ]}
        pitfalls={[
          "Reading the URL and concluding the offer is correct — the ledger renders whatever Flex resolved, and the CTA payload can differ from the URL.",
          "Blaming the cgi-web add-ons deploy because it is the only code change you own. Add-ons is only reachable when wpnx-add-on-step is bucketed AND pref is present.",
          "Reproducing locally, seeing a V1 GET preview, and concluding the V2 ledger is broken — enableCommerceUnifiedFtcRegulationUpdates is not in ESPN Sparrow, so local always falls back.",
          "Searching tests/signup/billing.spec.ts for the regression. It is test.describe.skip behind GCIEX-984.",
          "Assuming pref is validated. There is no allowlist; a mistyped package id in a CMS href reaches Flex verbatim.",
        ]}
        signal="A strong candidate separates the entry contract, the param resolver, and the Flex verdict into three independently testable layers, uses unsampled logs rather than sampled RUM as primary evidence, and escalates with a named file or flag instead of a hunch."
      />
      <SolutionReveal difficulty="hard">
        <p><strong>1. The three contracts and the decider.</strong> <code>?pref=&lt;package_id&gt;</code> from the CMS-authored plan-card href; <code>?offerId=&amp;campaignId=</code> from the ESPN paywall; and <code>?offers=&lt;encoded pairs&gt;</code> from the unified format or the add-ons cart. Precedence is decided in one place — <code>resolveOfferQueryParams</code> in <code>common/lib/offers-param.ts:174-219</code>: <code>offers=</code> beats repeated <code>offerId[]</code> beats a single <code>offerId</code>. Critically, when the V2 ledger is on and <code>offerContext</code> is present, <code>pref</code> and <code>package</code> are <em>dropped from the request body</em> (<code>billing-page.tsx:271-283</code>). So a URL carrying both a <code>pref</code> and an offer pair never sends the <code>pref</code> at all — a very plausible source of &quot;the plan I clicked is not the plan I see&quot;.</p>
        <p><strong>2. Telemetry that discriminates URL from Flex.</strong> Pull the ledger&apos;s Flex preview request/response pair and compare the resolved offer against what was asked for. Two ready-made signals exist: the unsampled <code>ELIGIBILITY_OFFER_SWITCH</code> warn (which only fires on <code>FLX-0226</code> at <em>execution</em> time, so its absence rules the switch out for a <em>preview</em>-time discrepancy), and the <code>BILLING - SUBSCRIPTION_PREVIEW_LOAD</code> RUM error for screen failures. If the request carried the right <code>offerContext</code> and the response came back with a different offer, it is a Flex resolution issue. If the request itself carried the wrong identity, it is an entry-contract issue and the fix lives in the CMS or the paywall.</p>
        <p><strong>3. Why &quot;some users&quot; matters.</strong> Partial impact is the signature of a <em>bucketed</em> or <em>per-link</em> cause, not a deploy. A cgi-web deploy affects everyone on the route equally. A WeaponX <code>wpnx-add-on-step</code> change affects only the experiment cohort — and only users whose URL also carries <code>pref</code>, because <code>addOnsExperimentRedirectHandler</code> requires <em>both</em>. A CMS release affects only users who clicked the specific plan card that was edited. &quot;Some ESPN Unlimited clickers&quot; points hardest at a single edited plan-card href.</p>
        <p><strong>4. Verdict and escalation.</strong> Most likely not a cgi-web bug. <code>signup/pages/billing-page.tsx</code> has zero ESPN branches, and the add-ons deploy cannot affect users who never reach add-ons. Escalate to the marketing/CMS owner with the exact <code>pref</code> value from an affected URL, and to Flex with the preview request/response pair. Cite <code>packages/marketing/stitch/src/builders/build-link.ts:11-95</code> as proof that no code constructs the href — it is authored content, so a content diff is the fastest confirmation. Keep one cgi-web suspicion open: if affected users came through add-ons, the constant React Query key <code>[&apos;flexApi.getScreen.addons&apos;]</code> can serve a stale cart for a second offer in the same session.</p>
        <p><strong>5. What to add.</strong> One unsampled log at ledger render recording the resolved <code>offerContext</code>, the raw entry params (including <code>pref</code>), which branch of <code>resolveOfferQueryParams</code> won, and whether V1 or V2 was used. That single line collapses steps 1–3 into one query. Worth fixing while you are in there: the <code>handler</code> string returned by <code>addOnsExperimentRedirectHandler</code> is hardcoded to <code>&apos;entitledUserRedirectHandler&apos;</code>, so the <code>[navigation] Redirect handler success</code> RUM action currently lies about why a user went to add-ons.</p>
      </SolutionReveal>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ol>
        <li><strong>Do not fix a <code>/commerce/plans</code> bug for ESPN.</strong> It is a 404 — <code>enableCommerceUnifiedPlans: false</code>.</li>
        <li><strong>The default login-router branch leaves CUP.</strong> <code>defaultRedirectHandler</code> targets <code>welcome-back</code>, whose Sparrow <code>key</code> resolves to <code>espn.com/watch/</code>. <code>inApp: true</code> is a lie when <code>key</code> is set.</li>
        <li><strong>Unauthenticated ESPN users go to sign-up, not login.</strong> All three ESPN commerce wrappers set <code>authRedirectTarget = /identity/sign-up</code>.</li>
        <li><strong>The V2 ledger flag is not in ESPN Sparrow.</strong> It comes from WeaponX, so locally and in tests you must inject <code>enableCommerceUnifiedFtcRegulationUpdates</code> or you silently test V1.</li>
        <li><strong><code>tests/signup/billing.spec.ts</code> is skipped</strong> (<code>GCIEX-984</code>). Real coverage lives in <code>tests/flows/signup.spec.ts</code>.</li>
        <li><strong>The add-ons React Query key has no offer inputs</strong> — stale-screen risk within a session.</li>
        <li><strong><code>/commerce/add-ons</code> has no stepper category</strong> — <code>useCategoryStepper</code> returns <code>current: &apos;0&apos;</code>.</li>
        <li><strong>Flex&apos;s payload, not the URL, decides the charge.</strong> Debugging a wrong-offer purchase from the address bar wastes the morning.</li>
        <li><strong><code>isAddOnsRouteEnabled</code> is a WeaponX experiment, not the route flag</strong> — and the handler reports the wrong name to Datadog.</li>
        <li><strong>Two things are called <code>salesPlatform</code>.</strong> The body field is the standardized device profile; the query param goes into headers.</li>
        <li><strong>Query params are type-narrowed, not validated.</strong> No UUID checks, no <code>pref</code> allowlist. Unknown params like <code>?cid=</code> survive only by <code>{"{...router.query}"}</code> spreading — stop spreading and marketing attribution disappears silently.</li>
        <li><strong><code>buildGetServerSideProps</code> merges by naive <code>reduce</code>.</strong> Two composition functions returning <code>props</code> clobber each other, and only the last <code>redirect</code>/<code>notFound</code> survives. Order is load-bearing.</li>
        <li><strong>The signup add-ons page imports change-subscription v2 internals.</strong> Refactor those atoms and you break signup.</li>
        <li><strong>Roadblock outranks identity redirects.</strong> <code>isPendingRedirect</code> is checked after the roadblock branch.</li>
        <li><strong>ESPN analytics parity is intentionally absent.</strong> Legacy Adobe on billing behind <code>wpnx-enable-legacy-analytics-espn</code>, and CoreAnalytics deliberately suppressed on the success page to avoid duplicate ESPN page impressions.</li>
      </ol>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>The real ESPN path is <strong>external plan cards → the ledger → success</strong>. <code>/commerce/plans</code> is a 404 for ESPN, and login and add-ons are conditional detours rather than steps.</li>
        <li>Several entry contracts converge on <code>/commerce/billing</code>: <code>?pref=&lt;package_id&gt;</code> from CMS-authored marketing hrefs, and <code>?offerId=&amp;campaignId=</code> or <code>?offers=</code> from the paywall and the add-ons cart. All are real; <code>resolveOfferQueryParams</code> decides precedence.</li>
        <li><code>/identity/loading</code> is the traffic controller: 12 ordered handlers, first match wins. <code>entitledUserRedirectHandler</code> starts purchases, <code>addOnsExperimentRedirectHandler</code> needs a WeaponX bucket <em>and</em> a <code>pref</code> param, and the fallbacks resolve through Sparrow to eject the user to <code>espn.com</code>.</li>
        <li>The ledger is one route with two Flex contracts. ESPN&apos;s V2 flag lives in WeaponX, not Sparrow, so every local run and every Playwright spec has to inject it.</li>
        <li>Purchase is one <code>PUT execution/v2/subscription/signup</code>, and the offer comes from <strong>Flex&apos;s action payload, not the URL</strong> — the single most useful fact when triaging a wrong-charge report.</li>
        <li>Ground truth is <code>playwright/support/happy-paths.ts</code>; <code>tests/signup/billing.spec.ts</code> is skipped under <code>GCIEX-984</code> and must not be mistaken for coverage.</li>
      </ul>
    </div>
  );
}
