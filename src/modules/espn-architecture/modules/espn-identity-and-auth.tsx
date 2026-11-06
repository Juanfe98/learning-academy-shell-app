import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const identityLandscapeDiagram = String.raw`flowchart TD
  BRAND["MyDisney<br/>the account brand a guest reads on the button"] --> SYS["Disney central identity platform<br/>internally called OneID"]
  SYS --> C1["OneID v4 script<br/>cdn.registerdisney.go.com/v4/OneID.js<br/>in-page lightbox, version pinned in the URL"]
  SYS --> C2["Identity Web SDK v5<br/>@disney-identity/sdk-web<br/>OIDC, offsite redirect to login.disney.com"]
  C1 --> E["ESPN commerce<br/>clientId ESPN-ONESITE.WEB"]
  C1 --> H["Hulu myDisney modal"]
  C2 --> D["Disney+ commerce and marketing<br/>clientId DTCI-DISNEYPLUS.WEB"]
  E --> BAM["BAM client SDK session<br/>@js-client-sdk/sdk 35.3.17<br/>every brand terminates here"]
  H --> BAM
  D --> BAM`;

const deadEndDiagram = String.raw`flowchart TD
  CFG["Config leg: ESPN Sparrow ships<br/>feature-configuration.general.identitySDK = null"] --> ATOM
  SITE["Call-site leg: neither ESPN layout calls<br/>useHydrateIdentitySDKConfig()"] --> ATOM
  ATOM["identitySDKConfigAtom stays null"] --> SKIP["sdk-atoms.ts onMount takes the else branch<br/>tracker.skipped identity_sdk_initialized<br/>reason no_config"]
  SKIP --> STATE["sdkInstanceAtom never set<br/>sdkStatusAtom stays pending forever<br/>tokenProvider resolves null"]
  STATE --> F1["launchReauth unreachable<br/>handler throws IdentitySDK not ready"]
  STATE --> F2["offsite v5 login never launched"]
  STATE --> F3["passkey OIDC callback never processed"]
  STATE --> F4["no v5 to BAM interop back-population"]
  F1 --> FALL["password ActionGrantModal fallback, every single time"]`;

const loginBranchDiagram = String.raw`flowchart TD
  ENTRY["/identity/login and /identity/login/:slug<br/>19-line ESPN shells re-export LoginWrapper"] --> WRAP["LoginWrapper<br/>commerce-base/src/identity/login/pages/login-wrapper-page.tsx"]
  WRAP --> AUTHED{"useIsLoggedIn already true"}
  AUTHED -->|"yes, unless on missing-info or account-blocked"| LOAD["router.push to /identity/loading"]
  AUTHED -->|"no"| GATE1{"shouldLaunchIdentitySDK<br/>from useLaunchIdentityFlow"}
  GATE1 -->|"true"| V5["identitySDK.launchIdentityFlow<br/>offsite v5 flow, Disney+ only in practice"]
  GATE1 -->|"false"| GATE2{"isOneIdEnabledApp<br/>enableIdentityOneIdAuthentication"}
  GATE2 -->|"true, ESPN today"| ONEID["OneIdLogin<br/>OneID v4 lightbox over a PageLoader"]
  GATE2 -->|"false"| EDNA["EdnaLoginPage<br/>in-house XState screens"]`;

const loginMachineDiagram = String.raw`stateDiagram-v2
  [*] --> start
  start : always guard, routes by isValidRoute slug
  start --> enterEmail : no slug match
  start --> enterPassword : slug enter-password
  start --> enterPasscode : slug enter-passcode
  start --> passwordless : slug passwordless
  start --> missingInfo : slug missing-info or change-password
  enterEmail --> enterPassword : NEXT
  enterEmail --> enterPasscode : OTP_LOGIN
  enterEmail --> passwordless : PASSWORDLESS_LOGIN
  enterPassword --> done : NEXT_WITH_MISSING_INFO_CHECK and isComplete
  enterPassword --> missingInfo : NEXT_WITH_MISSING_INFO_CHECK and DOB required
  enterPassword --> enterPasscode : OTP_LOGIN
  enterPassword --> accountBlocked : INELIGIBLE
  enterPasscode --> done : NEXT_WITH_MISSING_INFO_CHECK
  enterPasscode --> rateLimited : OTP_RATE_LIMIT
  enterPasscode --> enterEmail : CANCEL
  passwordless --> enterPasscode : OTP_LOGIN
  passwordless --> rateLimited : OTP_RATE_LIMIT
  passwordless --> enterPassword : CANCEL
  missingInfo --> done : NEXT
  missingInfo --> accountBlocked : INELIGIBLE
  rateLimited --> enterEmail : CANCEL
  done : entry action redirect - startRedirect or push the loading route
  done --> [*]
  accountBlocked --> [*]`;

const ssoSequenceDiagram = String.raw`sequenceDiagram
  autonumber
  participant G as Guest browser
  participant CONTENT as www.espn.com
  participant SALES as plus.espn.com - Nexus
  participant CUP as secure.web.plus.espn.com - CUP
  participant RESP as OneID responder iframe on espn.com
  participant BAM as BAM orchestration
  G->>CONTENT: contextualization takeover, pick MyDisney login
  CONTENT->>RESP: OneID.get with the shared responderPage
  Note over RESP: OneID storage lives behind this espn.com iframe
  G->>SALES: browse plans
  SALES->>RESP: OneID.get with the same responderPage
  RESP-->>SALES: getLoggedInStatus true
  G->>CUP: full-page hop into checkout
  CUP->>RESP: OneID.get with the same responderPage again
  RESP-->>CUP: getLoggedInStatus true plus getGuest id_token
  CUP->>BAM: exchangeIDTokenForAccessToken with that id_token
  BAM-->>CUP: session now isAuthorized for bamIdentity
  CUP->>CUP: espn_aid cookie on espn.com feeds osDeviceIds
  CUP->>CUP: ag cookie written on the registrable domain when subscriber`;

const reconcilerDiagram = String.raw`flowchart TD
  START["OneIdWrapper mounts on an authenticated ESPN route"] --> Q1{"OneID logged in"}
  Q1 -->|"yes"| Q2{"BAM session authorized"}
  Q1 -->|"no"| Q3{"BAM session authorized"}
  Q2 -->|"yes"| Q4{"BAM account email equals OneID guest email"}
  Q4 -->|"yes"| OK["render children, checkout continues"]
  Q4 -->|"no"| FIX["log BAM out, re-exchange the OneID id_token"]
  Q2 -->|"no"| EX["exchangeIDTokenForAccessToken<br/>reauthenticate BAM from OneID"]
  Q3 -->|"yes"| OUT["push /identity/logout<br/>the user is logged out on purpose"]
  Q3 -->|"no"| LOGIN["push /identity/login<br/>redirectTargetQuery preserved"]`;

export const toc: TocItem[] = [
  { id: "two-clients-one-system", title: "The Headline: Two Clients, One Identity System", level: 2 },
  { id: "mydisney-oneid-identity-v5", title: "MyDisney vs OneID vs Identity v5", level: 3 },
  { id: "three-sdks", title: "The Three SDKs", level: 2 },
  { id: "config-proof", title: "The Config Proof", level: 2 },
  { id: "v5-never-initialises", title: "Why Identity v5 Never Initialises on ESPN", level: 2 },
  { id: "package-boundaries", title: "Package Boundaries: No ESPN Identity Package", level: 2 },
  { id: "login-entry-point", title: "The Login Entry Point: A Three-Way Branch", level: 2 },
  { id: "oneid-login-page", title: "Inside OneIdLogin", level: 3 },
  { id: "login-state-machine", title: "The In-House Login State Machine", level: 2 },
  { id: "session-mechanics", title: "Session Mechanics: Tokens, Refresh, isAuthenticated", level: 2 },
  { id: "is-authenticated-hazard", title: "The isAuthenticated Hazard", level: 3 },
  { id: "cross-domain-sso", title: "Cross-Domain SSO Across the ESPN Domains", level: 2 },
  { id: "redirect-url-validation", title: "The redirectURL Validation Mess", level: 2 },
  { id: "oneid-bam-reconciler", title: "The OneID and BAM Reconciler", level: 2 },
  { id: "reauth-step-up", title: "Reauth and Step-Up on ESPN", level: 2 },
  { id: "not-in-this-repo", title: "Repo Boundaries: What Is Not Here", level: 2 },
  { id: "testing-identity", title: "Testing Identity", level: 2 },
  { id: "secrets-and-config", title: "Secrets and Config", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Logged Out Mid-Checkout", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnIdentityAndAuth() {
  return (
    <div className="article-content">
      <p>Two tickets will land on your desk in your first month on ESPN commerce: &quot;ESPN users get logged out mid-checkout&quot; and &quot;why doesn&apos;t reauth work on ESPN?&quot; Both have the same root shape, and neither is a bug in the identity code. They are consequences of <strong>which identity client ESPN is configured to use</strong>, and of the fact that the other client&apos;s code sits right there in the shared library and never runs. This module gives you that model precisely enough to answer both without opening a debugger.</p>

      <h2 id="two-clients-one-system">The Headline: Two Clients, One Identity System</h2>
      <p>ESPN and Disney+ do <em>not</em> have different identity systems. They have <strong>different client SDKs pointed at the same identity platform</strong>. Every guest signs in with the same account; the code that draws the sign-in UI, holds the tokens, and hands them to the commerce session is completely different per brand.</p>
      <p>The evidence is at the seam where both clients converge: whichever one runs, the end state is a <strong>BAM client SDK session</strong> that answers <code>isAuthorized(&apos;bamIdentity&apos;)</code>. Identity v5 gets there by handing the BAM session a <code>tokenProvider</code> (<code>packages/cgi/sdk-session/src/sdk-atoms.ts</code>). OneID gets there by producing an <code>id_token</code> that cgi-web trades for a BAM access token through <code>exchangeIDTokenForAccessToken</code> (<code>packages/cgi/commerce-base/src/common/oneid/hooks/use-exchange-id-token-for-access-token.tsx</code>). Same destination, two roads.</p>

      <h3 id="mydisney-oneid-identity-v5">MyDisney vs OneID vs Identity v5</h3>
      <p>The foundation module says the contextualization takeover offers &quot;Log in with MyDisney.&quot; That is correct <em>product</em> language and you should keep saying it to product people. It is also the single biggest source of engineering confusion on ESPN, so hold three separate nouns in your head:</p>
      <ul>
        <li><strong>MyDisney</strong> — the <em>brand</em> of the account. What the guest reads on the button. Not a package, not a hostname, not a codepath.</li>
        <li><strong>OneID</strong> — the <em>identity system</em> those accounts live in, served from <code>registerdisney.go.com</code>. ESPN&apos;s active client is its v4 browser script.</li>
        <li><strong>Identity v5</strong> — <code>@disney-identity/sdk-web</code>, a newer OIDC <em>client</em> for the same accounts, redirecting offsite to <code>login.disney.com</code>. In this repo it is wired for Disney+ only.</li>
      </ul>
      <p>So when a PM says &quot;ESPN uses MyDisney login,&quot; the accurate engineering translation is: <em>ESPN authenticates MyDisney accounts through the OneID v4 script, not through the Identity v5 SDK.</em> Say the first sentence in a product meeting and the second in a design review and you are right in both rooms.</p>
      <MermaidDiagram chart={identityLandscapeDiagram} minHeight={550}
        title="The ESPN Identity Landscape"
        caption="One account brand, one identity platform, three SDKs — and every path terminates in the same BAM session." />

      <h2 id="three-sdks">The Three SDKs</h2>
      <p>Three distinct SDKs are in play in cgi-web, and mixing them up is the fastest way to write dead code. Only one of the three is universal.</p>
      <ArticleTable caption="Which brand loads which identity SDK, for what, and where its version is pinned." minWidth={900}>
        <table>
          <thead>
            <tr><th>SDK</th><th>Package or script</th><th>Version pinned in</th><th>Used by</th><th>Role</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>BAM client SDK</strong></td><td><code>@js-client-sdk/sdk</code></td><td><code>pnpm-workspace.yaml</code> catalog <code>default</code>, <code>35.3.17</code></td><td>All brands, including ESPN</td><td>Commerce session, orchestration GraphQL, token storage, <code>isAuthorized</code></td></tr>
            <tr><td><strong>Identity Web SDK v5</strong></td><td><code>@disney-identity/sdk-web</code></td><td>catalog <code>default</code>, <code>^5.1.29-hf.0</code></td><td>Disney+ only today</td><td>OIDC login, passkeys, <code>launchReauth</code> step-up, <code>tokenProvider</code></td></tr>
            <tr><td><strong>OneID v4</strong></td><td>Remote script, no npm package</td><td>URL-pinned in Sparrow: <code>.../v4/OneID.js</code></td><td>ESPN, plus the Hulu myDisney modal</td><td>Lightbox login, <code>getGuest</code>, <code>swid</code>, <code>id_token</code> to exchange</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>The complete list of <code>@disney-identity/sdk-web</code> import sites is short and worth memorising: <code>packages/cgi/sdk-session/src/identity-sdk-atom.ts</code> (type only), <code>packages/cgi/sdk-session/src/sdk-atoms.ts</code> (the only value import that runs), <code>packages/cgi/commerce-base/src/common/identity-sdk/sdk-script.tsx</code> (legacy, unmounted), and the reauth handler&apos;s type import. It is <strong>not</strong> a dependency of <code>@solo/identity-auth</code> at all.</p>

      <h2 id="config-proof">The Config Proof</h2>
      <p>You do not have to take any of this on faith. The two brands&apos; Sparrow fixtures are exact mirror images of each other in the same two fields.</p>
      <CodeBlock lang="typescript" filename="sparrow-identity-fixtures.ts"
        code={`// __fixtures__/espn/sparrow-commerce-espn-workspace.ts
'feature-flags':         { general: { enableIdentityOneIdAuthentication: true } },   // :41  -> OneID ON
'feature-configuration': { general: {
  identitySDK: null,                                                                 // :170 -> v5 OFF
  oneId: {
    clientId: 'ESPN-ONESITE.WEB',
    closeUrl: 'https://plus.espn.com',
    scriptUrl: 'https://stg.cdn.registerdisney.go.com/v4/OneID.js',
  },
} },

// __fixtures__/disneyPlus/sparrow-commerce-disneyplus-workspace.ts:3154-3168 — the exact inverse
identitySDK: { environment: 'qa', scriptUrl: 'https://cdn-qa.disneyaccount.com/v5/sdk.js',
  clientId: 'DTCI-DISNEYPLUS.WEB', enabled: false, rolloutPercentage: 0,
  featureFlows: { activations, licensePlate, redemption, giftCards: false, standard: true } },
oneId: null,`} />
      <p>These are QA fixtures — real values come from Sparrow at runtime and are not in the repo. But the <em>shape</em> is the contract: one brand fills <code>identitySDK</code> and nulls <code>oneId</code>, the other does the opposite. Types live at <code>packages/cgi/commerce-utils/src/app-config/models/feature-configuration-scope.ts</code>.</p>

      <h2 id="v5-never-initialises">Why Identity v5 Never Initialises on ESPN</h2>
      <p>This is the worked example to carry into every other config-driven question in this repo: <strong>feature availability is decided by config <em>plus</em> call-site, not by whether the code exists</strong>. Every line of Identity v5 plumbing lives in <code>packages/cgi/sdk-session</code> and <code>packages/cgi/commerce-base</code>, is fully brand-agnostic, and ESPN imports the same modules Disney+ does. It still never runs.</p>
      <p>The switch is one hook, <code>useHydrateIdentitySDKConfig()</code> in <code>commerce-base/src/common/identity-sdk/use-hydrate-identity-sdk-config.ts</code>. It writes <code>identitySDKConfigAtom</code> with a <code>clientId</code>, <code>language</code> and resolved <code>environment</code> only when the Sparrow block exists <em>and</em> <code>isIdentitySDKEnabledApp</code> <em>and</em> the browser is in the rollout bucket — otherwise it writes <code>null</code>. Now grep for callers across the whole monorepo:</p>
      <CodeBlock lang="text" filename="hydrate-identity-sdk-call-sites.txt"
        code={`apps/commerce/disneyPlus/src/layout/disney-layout.tsx:127
apps/commerce/disneyPlus/src/common/layouts/legacy-application-layout.tsx:107
apps/marketing-unified/disneyplus/pages/_app.tsx:59        (via a local wrapper hook)

# ESPN's two layouts:
#   apps/commerce/espn/src/layout/espn-layout.tsx
#   apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx
# -> neither appears. They render <OneId /> instead.`} />
      <p>So <code>identitySDKConfigAtom</code> is <code>null</code> on ESPN for two independent reasons at once — Sparrow ships <code>identitySDK: null</code> <em>and</em> no ESPN layout calls the hydration hook. Downstream, the session bootstrap quietly declines to initialise:</p>
      <CodeBlock lang="typescript" filename="sdk-atoms.ts"
        code={`// packages/cgi/sdk-session/src/sdk-atoms.ts:298-313
// Defer SDK init until identitySDKConfig has a language. IdentityWebSDK.getPromise
// is singleton-memoized — the first call wins, so initializing too early with a
// missing language locks the SDK to the en-US fallback.
if (identitySDKConfig?.language) {
  identitySdk = await initializeIdentitySDK(identitySDKConfig, newSession, tracker);
} else {
  tracker.skipped('identity_sdk_initialized', { reason: identitySDKConfig ? 'no_language' : 'no_config' });
}

const tokenProvider = identitySdk?.tokenProvider ?? null;`} />
      <p>Note that this is <code>skipped</code>, not <code>failed</code> — a deliberate choice so the Errors dashboard is not flooded by every ESPN page view. Which also means <strong>nothing is broken and nothing alarms</strong>. The atoms simply stay at their initial values (<code>packages/cgi/sdk-session/src/identity-sdk-atom.ts</code>): <code>sdkInstanceAtom = null</code>, <code>sdkStatusAtom = &apos;pending&apos;</code>.</p>
      <MermaidDiagram chart={deadEndDiagram} minHeight={550}
        title="The v5-Never-Initialises Consequence Chain"
        caption="Two independent gates converge on one null atom, and four capabilities become unreachable without a single error being logged." />
      <p>The diagnostic to reach for first is already built. The hydration hook emits <code>log(&#123; key: &apos;IDENTITY_SDK_CONFIG_GATE&apos; &#125;)</code> carrying every gate input: <code>identity_sdk_enabled_app</code>, <code>has_identity_sdk_config_object</code>, <code>identity_sdk_rollout_percent</code>, <code>identity_sdk_is_user_in_rollout</code>, <code>identity_sdk_global_present</code>, plus <code>region</code> and <code>pathname</code>. On ESPN you will never see it, because the hook is never called — and <em>that</em> absence is itself the answer.</p>

      <h2 id="package-boundaries">Package Boundaries: No ESPN Identity Package</h2>
      <p>A very common wrong assumption, especially from anyone who has seen the brand-specific data-interface packages: <strong>there is no <code>identity-espn</code> package, and no ESPN subtree inside <code>packages/identity-auth</code></strong>. The one brand-specific identity package that exists is <code>@solo/identity-hulu</code> (<code>packages/identity-hulu</code>) — Hulu&apos;s &quot;unified&quot; page-per-screen flows — and <strong>ESPN does not use it</strong>. ESPN reuses the shared identity feature code:</p>
      <CodeBlock lang="text" filename="espn-identity-code-map.txt"
        code={`Route shells (19-line re-exports)  apps/commerce/espn/pages/identity/**
Page implementations              packages/cgi/commerce-base/src/identity/**
OneID integration                 packages/cgi/commerce-base/src/common/oneid/**
Identity v5 integration           packages/cgi/commerce-base/src/common/identity-sdk/**
Session bootstrap                 packages/cgi/sdk-session/src/**
In-house login UI + XState        packages/identity-auth/src/**
ESPN session/GraphQL adapter      packages/cgi/data-interface-espn/src/identity/**
ESPN marketing OneID (2nd copy!)  apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/**`} />
      <p>A repo-wide <code>grep -i espn</code> over <code>packages/identity-auth/src</code> and <code>packages/identity-hulu/src</code> returns fixtures, tests and brand-name copy only — no ESPN config module and no ESPN feature module. Two consequences: any change in <code>identity-auth</code> affects all three brands, and the last line of that map matters — ESPN marketing keeps its <em>own</em> OneID bootstrap, so &quot;fix the OneID init&quot; is potentially two edits in two apps.</p>

      <h2 id="login-entry-point">The Login Entry Point: A Three-Way Branch</h2>
      <p>Everything funnels through <code>packages/cgi/commerce-base/src/identity/login/pages/login-wrapper-page.tsx</code>, which ends in a three-way branch. Knowing which leg your brand takes is the prerequisite for reading any login bug report.</p>
      <MermaidDiagram chart={loginBranchDiagram} minHeight={550}
        title="LoginWrapper: How the Login UI Is Chosen"
        caption="ESPN always takes the middle leg — and the leg it takes is decided entirely by remote config, not by the URL." />
      <CodeBlock lang="tsx" filename="login-wrapper-page.tsx"
        code={`// login-wrapper-page.tsx (tail of the component)
const isMystiqueLoginEnabled = mystiqueFlags?.['wpnx-web-identity-v5-sdk-login-enabled'] === true;

const shouldLaunchIdentitySDK = useLaunchIdentityFlow(
  commerceAppConfig?.['feature-configuration']?.general?.identitySDK,
  isMystiqueLoginEnabled,
  isIdentitySDKEnabledApp
);

if (isLoggedInLoading || featureFlagLoading || (shouldLaunchIdentitySDK && ...)) return <PageLoader />;
if (isOneIdEnabledApp) return <OneIdLogin />;   // <- ESPN
return <EdnaLoginPage />;                       // <- in-house XState screens`} />
      <p>Follow the first argument: on ESPN it is <code>identitySDK</code>, which is <code>null</code>. <code>useLaunchIdentityFlow</code> (<code>commerce-base/src/common/hooks/use-detect-product-flow.ts</code>) gates on <code>isIdentitySDKEnabledApp</code> <em>and</em> a per-flow entry in <code>sparrowConfig.featureFlows</code>. With a null config there is no <code>featureFlows</code> map to satisfy, so the gate closes and returns <code>false</code> with an enumerated reason such as <code>sparrow-flow-gate-closed-licensePlate</code>. The flow types it detects — <code>activations</code>, <code>redemption</code>, <code>licensePlate</code>, <code>giftCards</code>, <code>standard</code> — come from query params, then a Jotai referrer, then the browser referrer.</p>
      <p>Two behaviours worth knowing. Already-authenticated users are pushed to <code>/identity/loading</code> — <em>except</em> on <code>/identity/login/missing-info</code> and <code>/identity/login/account-blocked</code>, which must render in-app despite the user being authenticated. And before handing off to v5 the wrapper stashes the query string in <code>sessionStorage</code> under <code>passkey_return_params</code> and rewrites the URL with <code>history.replaceState</code>, so the callback page can forward the params onward.</p>

      <h3 id="oneid-login-page">Inside OneIdLogin</h3>
      <p><code>oneid-login-page.tsx</code> renders nothing but a <code>&lt;PageLoader /&gt;</code>; all the work is effects, in this order. Query <code>oneId.getLoggedInStatus()</code>. If false, subscribe to <code>oneId.on(&apos;login&apos;)</code> and call <code>launchIdentityFlow</code> with the lightbox close button forcibly hidden. On <code>login</code>, exchange <code>data.token.id_token</code> for a BAM access token and store the <code>swid</code> on <code>oneIdAtom</code>. Once session, OneID, login state, language and profile id are all present, run the <code>updateProfileAppLanguage</code> mutation, then redirect — via <code>startRedirect</code> when <code>wpnx-web-identity-remove-loading-page</code> is on, otherwise by pushing <code>/identity/loading</code>.</p>
      <p>The hidden close button has a documented reason worth respecting: close and login events are indistinguishable, because the close event also fires from internal events. Do not &quot;fix&quot; that without solving the ambiguity first.</p>

      <h2 id="login-state-machine">The In-House Login State Machine</h2>
      <p>The in-house screens — historically called <strong>EDNA</strong> — are an XState machine in <code>packages/identity-auth/src/features/login/state-machine/login-machine.ts</code>. Read this graph carefully but keep the audience in mind: <strong>ESPN only reaches these screens when <code>enableIdentityOneIdAuthentication</code> is false</strong>, which in practice means the Playwright suite. Disney+ and Hulu are the real consumers.</p>
      <MermaidDiagram chart={loginMachineDiagram} minHeight={550}
        title="login-machine: Screens, OTP Path, Rate Limiting and the Terminal Redirect"
        caption="Note the two absorbing states: accountBlocked is a dead end, and done exists only to fire the redirect action." />
      <p>Details the diagram cannot carry. The screen ids are a flat <code>SCREENS</code> map: <code>account-blocked</code>, <code>change-password</code>, <code>enter-email</code>, <code>enter-passcode</code>, <code>enter-password</code>, <code>missing-info</code>, <code>rate-limited</code>, <code>passwordless</code>. The passwordless/OTP leg is flag-driven — <code>wpnx-web-identity-use-passwordless-login</code> resolves to <code>&apos;opt-out-link&apos;</code> or <code>&apos;opt-out-button&apos;</code>. Rate limiting is a real state, entered on <code>OTP_RATE_LIMIT</code>, whose only exit is <code>CANCEL</code> back to <code>enterEmail</code>. Nearly every screen also accepts <code>INELIGIBLE</code> into the final <code>accountBlocked</code> state, and <code>changePassword</code> can bounce back to <code>enterPassword</code> on <code>REAUTHENTICATE</code>.</p>
      <p>The completion guard is one line — <code>isComplete = !isDOBCollectionRequired(personalInfoFlow)</code> — and it is the fork between finishing and being routed into <code>missingInfo</code>. The terminal <code>done</code> state has a single <code>entry: [&apos;redirect&apos;]</code> action which prefers <code>startRedirect</code> from <code>use-navigation-redirect</code> and otherwise pushes the loading route with query params forwarded. Sibling machines exist for create-account and for both license-plate flows, each with a generated <code>.typegen.ts</code>.</p>
      <p>Behind the screens sits <strong>IPSE</strong>: 24 GraphQL hooks in <code>packages/identity-auth/src/common/services/IPSE/hooks/</code>, all built on <code>useSDKMutation</code> / <code>useSDKQuery</code> from <code>@solo/sdk-session</code>. Edge states are enforced by <code>AuthChecks</code> against slug allowlists — <code>AUTHENTICATED_SLUGS</code> is <code>missing-info</code> and <code>verify-email</code>; <code>UNAUTHENTICATED_SLUGS</code> is the four pre-login screens.</p>

      <h2 id="session-mechanics">Session Mechanics: Tokens, Refresh, isAuthenticated</h2>
      <p>The session is a Jotai atom with an <code>onMount</code>, not a provider — documented as such in <code>sdk-atoms.ts</code>. Bootstrap guards that <code>activitySessionIdAtom</code> is hydrated (hard error if not), assembles a <code>BootstrapConfiguration</code>, creates the SDK session with the ESPN device-attribute provider, optionally initialises v5, then either warm-starts from <code>localStorage</code> via <code>initializeWithState</code> or performs a cold <code>initialize()</code>.</p>
      <p>Tokens live in <strong>localStorage</strong>, keyed by client id and environment: <code>__bam_sdk_access--$&#123;clientId&#125;_$&#123;environment&#125;</code>, plus <code>__bam_sdk_device_grant--</code>, <code>__bam_sdk_session_info--</code> and <code>__bam_sdk_feature_flags--</code> siblings (<code>sdk-atoms.ts:293-296</code>). ESPN&apos;s client id is <code>espn-a9b93989</code> (<code>SDK_PARTNER_ID.espn</code> in <code>packages/cgi/sdk-session/src/constants.ts</code>), so in the QA environment those keys resolve to exactly this — paste it into DevTools and you are looking at the session:</p>
      <CodeBlock lang="text" filename="espn-localstorage-keys.txt"
        code={`__bam_sdk_access--espn-a9b93989_qa
__bam_sdk_device_grant--espn-a9b93989_qa
__bam_sdk_session_info--espn-a9b93989_qa
__bam_sdk_feature_flags--espn-a9b93989_qa`} />
      <p><strong>Refresh is not cgi-web&apos;s job.</strong> It is owned by the SDKs. <code>packages/identity-auth/AGENTS.md</code> says &quot;Don&apos;t manage tokens directly — use <code>@solo/sdk-session</code>&quot;, and <code>apps/commerce/AGENTS.md</code> says to take access tokens from <code>getAccessToken()</code>. The only refresh artefacts in the repo are MSW fixtures (<code>refresh-token-account.json</code>, <code>refresh-token-device.json</code>) and <code>buildRefreshTokenHandler()</code>. If you find yourself writing refresh logic, stop.</p>
      <p>Two side-channel expiries are easy to miss. <code>authDataAtom</code> (<code>commerce-base/src/identity/auth-data/atoms.ts</code>) has its own 10-minute TTL, independent of the session — a long pause in multi-step signup silently drops the prefilled email. And <code>actionGrantAtom</code> is a hand-rolled sessionStorage atom under the bare key <code>action-grant</code>, deliberately not <code>atomWithStorage</code> because the value is a bare string that cannot be initialised server-side.</p>

      <h3 id="is-authenticated-hazard">The isAuthenticated Hazard</h3>
      <p>There is one primitive and two wrappers, and <strong>all three are client-side</strong>. The primitive is <code>sdkSession.isAuthorized(&apos;bamIdentity&apos;)</code>. The ESPN data interface wraps it as <code>isLoggedIn</code> (<code>packages/cgi/data-interface-espn/src/identity/identity-data-interface.ts</code>). The React Query wrapper is where the hazard lives:</p>
      <CodeBlock lang="tsx" filename="use-is-logged-in.tsx"
        code={`// commerce-base/src/identity/logged-in-check/queries/use-is-logged-in.tsx
queryFn: async () => {
  if (useDataInterface) return await dataInterface.isLoggedIn();
  // TODO WEB-37421: Remove this logic once Data Interface implementation is stable
  if (isSDKEnabled && sdkSession) return sdkSession.isAuthorized('bamIdentity');
  return true;              // <- SDK disabled is treated as LOGGED IN
},
enabled: isMystiqueResolved && isReady,
useErrorBoundary: true,`} />
      <p>Read that last branch carefully. When the SDK is disabled this helper <strong>returns true</strong>. That is a deliberate convenience for SDK-less rendering modes, and it means <code>useIsLoggedIn</code> is <em>not</em> a security boundary in that mode — it is a UI hint. Real authorization is enforced by the services behind orchestration, not by this hook. If you are writing a gate that must not open for an anonymous user, gate on the session; and remember that <code>useSDKQuery</code> / <code>useSDKMutation</code> deliberately <em>throw</em> when the SDK is disabled rather than degrading, so gate the hook, not the render.</p>
      <p>There is also no SSR session read anywhere in the ESPN identity routes. Their <code>getServerSideProps</code> does layout config, feature-flag route gating and redirect-URL validation only. <code>ESPNDeviceAttributeProvider</code>&apos;s constructor throws on the server on purpose, and the v5 redirect URIs are built inside <code>onMount</code> because building them during render would throw during SSR. Server-side protection is therefore redirect handlers in gSSP plus client guards: <code>LoginRequired</code>, <code>OneIdWrapper</code>, <code>AuthChecks</code>.</p>

      <h2 id="cross-domain-sso">Cross-Domain SSO Across the ESPN Domains</h2>
      <p>A guest authenticates somewhere on <code>espn.com</code> and arrives at <code>secure.web.plus.espn.com</code> still logged in. The mechanism is not an app cookie. It is a <strong>shared OneID responder page</strong>, and the comment in the code explains why:</p>
      <CodeBlock lang="tsx" filename="oneid-script.tsx"
        code={`// commerce-base/src/common/oneid/oneid-script.tsx:73-97
const config = {
  clientId: oneIdSDKConfig.clientId,
  // Note: due to a domain and size constraint, we must share the responder code with ESPN Web.
  // If host our own responder, it can risk mismatching values and creating too much data.
  responderPage: 'https://www.espn.com/disneyid/responder/v4/index.html',
  debug: { disableFocusLock: true },
  langPref,
};

const oneIdInstance = window.OneID?.get(config);
oneIdInstance?.on('init', (data) => {
  setOneIdAtomValue({ ...oneIdAtomValue, oneId: oneIdInstance, swid: data.guest?.profile?.swid });
});
await oneIdInstance?.init();`} />
      <p>The identical <code>responderPage</code> value appears in ESPN marketing too (<code>apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/oneid-script.tsx:31</code>), with the same comment. Because OneID&apos;s storage lives behind that <code>espn.com</code> iframe, <code>getLoggedInStatus()</code> answers true on any <code>*.espn.com</code> host once the guest has authenticated anywhere. The SDK internals are external to this repo, so treat &quot;how exactly it persists&quot; as an open question — a genuinely relevant one under third-party-cookie deprecation.</p>
      <MermaidDiagram chart={ssoSequenceDiagram} minHeight={550}
        title="Session Establishment Across the Three ESPN Domains"
        caption="Three different apps, one responder origin — and the BAM session is only minted on the last hop, inside checkout." />
      <p>Two cookies ride along, and neither is the credential. The first is <strong>device identity</strong>:</p>
      <CodeBlock lang="typescript" filename="espn-device-attribute-provider.ts"
        code={`// packages/cgi/sdk-session/src/espn-device-attribute-provider.ts
export class ESPNDeviceAttributeProvider extends SDK.Device.BrowserDeviceAttributeProvider {
  constructor() {
    if (!isBrowser()) throw new Error('getDeviceAttributes was invoked on the server, ...');
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
    // this enum needs to be updated in the SDK to support espnAnonymousSessionId
    deviceAttributes.osDeviceIds.push({ identifier: this.espn_aid,
      type: 'espnAnonymousSessionId' as OsDeviceIdType });
    return deviceAttributes;
  }
}`} />
      <p><code>espn_aid</code> is scoped to the <code>espn.com</code> apex domain, so it is shared across <code>plus.espn.com</code> and <code>secure.web.plus.espn.com</code>. It is the <strong>only cross-domain cookie cgi-web itself writes for ESPN</strong>, and it identifies a <em>device</em>, not a session. Note the string cast on the enum — a BAM SDK bump could break it. It is registered in both ESPN commerce layouts and in ESPN marketing&apos;s <code>hydrate-base-atoms.tsx</code>.</p>
      <p>The second is the <strong>app-gate</strong> cookie, <code>ag</code> (<code>packages/identity-auth/src/common/libs/set-app-gate-cookie.ts</code>). Its domain is the last two hostname labels (<code>.espn.com</code> on ESPN); its value is <code>window.btoa(JSON.stringify(&#123; isLoggedIn &#125;))</code>, written only when the guest is both logged in <em>and</em> a subscriber, and otherwise removed at <strong>both</strong> the domain and host-only scopes, because &quot;a domain-scoped delete cannot match a host-only cookie.&quot; It is base64, not signed, and it is read by the legacy Main App entry router in a different repo (<code>github.twdcgrid.net/site-dominguez/solo</code>). Treat it as a UX gate that decides whether Main App bounces you to login — never as an authorization decision. In the current tree it is written only from the Disney+ passkey page.</p>

      <h2 id="redirect-url-validation">The redirectURL Validation Mess</h2>
      <p>Open-redirect validation is the security-sensitive part of this module, so be precise about the stakes. A post-login redirect target is attacker-influenceable input: if a freshly-authenticated user can be sent to an arbitrary origin, that origin gets whatever the URL carries plus a very convincing phishing surface. The correct defence is boring and singular: <strong>one allowlist-based validator, applied everywhere</strong>. cgi-web has three, with mutually inconsistent rules.</p>
      <ArticleTable caption="Three validators for redirect targets — same concept, three different definitions of valid." minWidth={960}>
        <table>
          <thead>
            <tr><th>Validator</th><th>File</th><th>Rule</th><th>Effect</th><th>Failure behaviour</th></tr>
          </thead>
          <tbody>
            <tr><td><code>redirectURL</code> server (gSSP)</td><td><code>identity/loading/lib/loading-server-utils.ts</code></td><td>Must parse as a URL <strong>and</strong> <code>origin === paths.commerce.root_domain</code> exactly</td><td>Server 302 to the absolute URL</td><td>Swallowed into <code>&#123; props: &#123;&#125; &#125;</code> — silently no redirect</td></tr>
            <tr><td><code>redirectURL</code> client</td><td><code>common/hooks/use-navigation-redirect.tsx</code></td><td>Must <strong>fail</strong> <code>new URL()</code> (be relative) <strong>and</strong> prefix-match <code>INTERNAL_ROUTES</code></td><td>In-app <code>router.replace</code></td><td>Returns false and logs a Datadog error with <code>errorCode: &apos;IDENTITY_NAVIGATION&apos;</code></td></tr>
            <tr><td>Arbitrary URL params</td><td><code>common/lib/get-external-url-param-redirect-props/</code></td><td><code>url.host</code> must be in Sparrow <code>urlParamHostAllowlist</code> (case-insensitive)</td><td>External redirect off-app</td><td>Returns <code>&#123; isUrl, isAllowed: false &#125;</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <CodeBlock lang="typescript" filename="redirect-validators.ts"
        code={`// A: identity/loading/lib/loading-server-utils.ts — absolute, exact-origin
const domain = commerceAppConfig.paths.paths.commerce.root_domain;
try {
  const validatedRedirectURL = new URL(redirectURL);
  const isAllowedESPNDomain = domain && validatedRedirectURL.origin === domain;
  if (!isAllowedESPNDomain) {
    delete context.query['redirectURL'];
    throw new Error(\`Only URLs from the domain \${domain} are permitted.\`);
  }
  return { redirect: { destination: validatedRedirectURL.href, permanent: false } };
} catch {
  return { props: {} };   // invalid, wrong domain, or absent -> no redirect at all
}

// B: common/hooks/use-navigation-redirect.tsx — inverted: parsing successfully IS failure
const isValidRedirect = (redirectURL: string) => {
  try {
    // A redirect URL is considered invalid if it evaluates to a real URL in any possible way
    new URL(redirectURL);
    datadogRum.addError(errorText, errorEvent);
    return false;
  } catch (error) { error; }

  const isOnAllowList = INTERNAL_ROUTES.some((r) => redirectURL.startsWith(r));
  if (!isOnAllowList) datadogRum.addError(errorText, errorEvent);
  return isOnAllowList;
};`} />
      <p>Validator B is the one people misread. It requires the value <strong>to fail URL parsing</strong> — a successful <code>new URL()</code> is treated as tampering, logged, and rejected. It is a defensible &quot;relative paths only&quot; rule expressed backwards, and it is the <em>strictest</em> of the three.</p>
      <p>Why the inconsistency is a real risk and not merely untidy. First, <strong>it defeats transferable reasoning</strong>: an engineer who has read one validator assumes the others agree, and the one thing you must never do is copy the loosest rule — the host allowlist, which by design permits genuinely external hosts — onto a post-login path that should only ever go in-app. Second, <strong>the server validator fails into silence</strong>: every error becomes &quot;no redirect&quot;, so a mistyped or misconfigured <code>root_domain</code> presents as a product bug rather than a config bug and can sit unnoticed. Third, the same query-param name means different things on different paths, so &quot;the redirect works in QA but not prod&quot; is usually a Sparrow <code>root_domain</code> mismatch, not code. If you touch this area, the review question is always: <em>which</em> of the three validators is on this path, and is it the strictest one that can do the job?</p>
      <p>One more trap: the server validator names its boolean <code>isAllowedESPNDomain</code>, but the code is entirely tenant-agnostic — it compares against whatever <code>root_domain</code> the current tenant&apos;s Sparrow config supplies (<code>https://stage.web.plus.espn.com</code> in the ESPN QA fixture). Do not conclude from the name that this is ESPN-specific logic.</p>

      <h2 id="oneid-bam-reconciler">The OneID and BAM Reconciler</h2>
      <p>ESPN&apos;s two-token architecture needs something to keep OneID state and BAM state agreeing, and that something is <code>OneIdWrapper</code> (<code>commerce-base/src/common/oneid/oneid-wrapper.tsx</code>). Its header comment is the whole design:</p>
      <CodeBlock lang="text" filename="oneid-wrapper-contract.txt"
        code={`Check if we're logged in with OneID and Bamtech SDK.
 - If you're logged into both systems, we will render the children for you.
 - If we're logged into OneID, we reauthenticate with the Bamtech SDK.
 - If we're only logged into Bamtech, we log the user out (by going to /identity/logout).
 - If you're not logged into either, we will push the user to the login page (/identity/login).`} />
      <p>Read the third bullet again, because it is the answer to a whole class of confusing bug reports: <strong>a state mismatch logs the user out on purpose</strong>. BAM-authorized but OneID-not-logged-in triggers a deliberate logout. So does an <strong>email mismatch</strong> between the BAM account and the OneID guest — BAM is logged out and the <code>id_token</code> re-exchanged. Users experience both as &quot;it randomly logged me out&quot;, and neither is random.</p>
      <MermaidDiagram chart={reconcilerDiagram} minHeight={550}
        title="OneIdWrapper Reconciliation Outcomes"
        caption="Only one of the five outcomes renders your page — and two of them look to the user like an unexplained logout." />
      <p>Query params survive the bounce via <code>redirectTargetQuery</code>, explicitly so that values like <code>redirectURL</code> are preserved after re-login. The wrapper is applied per-page on ESPN&apos;s authenticated routes (<code>success</code>, <code>billing</code>, <code>billing-history</code>, <code>add-ons</code>, <code>student</code>, the <code>activate</code> callbacks, restart-subscription) and at layout level in <code>apps/commerce/espn/src/common/layouts/page-layout.tsx</code>.</p>
      <p>The second, quieter cause of mid-flow logout is <code>LoginRequired</code>, which re-checks <code>dataInterface.isLoggedIn()</code> on mount and calls <code>authRedirect()</code> when false, rendering <code>null</code> until resolved so protected content never flashes. ESPN logout itself is unusual: it is <code>sdkSession.reset()</code>, not a graph mutation, because — per the code comment — &quot;the logout graph call does not exist on ESPN+&quot;. It is followed by <code>cleanBrowserStorage()</code>, an <strong>explicit allowlist</strong> of localStorage, sessionStorage and cookie keys. Any new identity storage key you add must be registered there or it leaks across logout; it intentionally does not clear <code>espn_aid</code> (device id) or <code>dss_identity_interop_percentile</code> (rollout stability).</p>

      <h2 id="reauth-step-up">Reauth and Step-Up on ESPN</h2>
      <p>Sensitive account mutations need a fresh proof of identity — an <strong>action grant</strong>, a short-lived JWT accepted by the <code>*WithActionGrant</code> mutations. There are two ways to get one, and ESPN can only use the older one.</p>
      <CodeBlock lang="text" filename="reauth-handler-steps.txt"
        code={`// commerce-base/src/common/identity-sdk/use-identity-sdk-reauth-handler.ts
1  emit IDENTITY_V5_SDK_REAUTH_INVOKED
2  if (sdkStatus !== 'ready' || !sdkInstance) throw new Error('IdentitySDK not ready');
3  sdkInstance.on('error', errorHandler)
4  const reauthResult = await sdkInstance.launchReauth();      // iframe
5  if (!reauthResult) throw 'User cancelled reauth';           // SDK resolves undefined on cancel
6  // SDK session now holds fresh tokens - no manual extraction
7  exchangeToken() -> exchangeAccessTokenForActionGrant
8  setActionGrant(actionGrant)  -> sessionStorage 'action-grant'
9  queryClient.invalidateQueries(['orchestrationApi.query.me'])
10 emit IDENTITY_V5_SDK_REAUTH_SUCCESS
   catch -> IDENTITY_V5_SDK_REAUTH_FELL_BACK_TO_DEFAULT_FLOW -> { success: false, error }`} />
      <p>Step 2 is where ESPN stops: <code>sdkStatusAtom</code> never leaves <code>&apos;pending&apos;</code>, so the handler throws before it ever calls <code>launchReauth</code>. The canonical consumer shows what happens next:</p>
      <CodeBlock lang="tsx" filename="restrict-profile-creation-item.tsx"
        code={`// account/account-details/components/identity/restrict-profile-creation-item.tsx
if (isSDKReauthEnabled) {
  const result = await handleReauth({ reasons: [AuthenticateReasons.UPDATE_PROTECT_PROFILE_CREATION] });
  if (result.success) { await onSuccess(result.actionGrant); return; }
  if (result.error.message === 'User cancelled reauth') return;   // silent
  // SDK error (not ready, etc.) - fall through to show modal fallback
}

setIsModalOpen(true);   // password ActionGrantModal fallback`} />
      <p><strong>UX consequence:</strong> on Disney+ a step-up is a lightweight iframe that may not even ask for a password; on ESPN it is always the password modal driven by <code>useAuthenticateWithReasons</code>. Same component, different-feeling product, entirely because of config. <strong>Engineering consequence:</strong> if you build a new step-up-requiring feature and only test on Disney+, you have only tested the branch ESPN cannot take. Write the fallback path first — on ESPN it is the <em>only</em> path.</p>

      <h2 id="not-in-this-repo">Repo Boundaries: What Is Not Here</h2>
      <p>This section exists to save you several days. The foundation module lists &quot;Sign in with TV provider&quot; as one of the three exits from the contextualization takeover. <strong>None of that authentication is in cgi-web.</strong> A strict word-boundary sweep for <code>TVE</code>, <code>MVPD</code>, <code>tv-provider</code>, <code>adobe-pass</code> and <code>entitlement-service</code> across <code>packages/</code>, <code>apps/</code> and <code>docs/</code> returns <strong>zero implementation hits</strong>. What it does return is two harmless things: BAM SDK playback-config fixtures containing <code>tve</code> endpoint templates this repo never calls, and dictionary copy — including <code>contextualization_cta_2_unauth_roku_flagship</code>, whose value is literally <code>&quot;Sign in with TV provider&quot;</code>, plus FAQ URLs pointing at <code>support.espn.com</code>. Pay-TV / MVPD authentication lives in ESPN Web and Adobe Pass, outside this repository. cgi-web renders a CTA and links out. Do not go looking.</p>
      <p>What <em>is</em> here are two different things both colloquially called &quot;activation&quot;. <strong>License plate</strong> is off-device sign-in: a code shown on a TV or console, entered on web. Routes <code>/identity/start</code> (create account) and <code>/identity/begin</code> (login) exist for ESPN behind <code>enableIdentityUnifiedLicensePlateFlow</code>, and the whole flow&apos;s state rides in one sessionStorage blob:</p>
      <CodeBlock lang="typescript" filename="license-plate-helpers.ts"
        code={`// packages/identity-auth/src/common/libs/license-plate-helpers.ts
export const LICENSE_PLATE_OPTIONS = 'lpo';   // sessionStorage key holding the whole flow state
export const LICENSE_PLATE_CODE_LENGTH = 8;   // code length validated on entry

export type LicensePlateOptions = {
  actionGrant?: string;
  activationData?: { providerId?: string; token?: string };
  deviceProfile: string | undefined;
  offDeviceGrant: string | undefined;
  redemptionFlow?: 'Register' | 'Login' | 'PlanSwitch' | 'IncomingActivation';
  connectedDeviceID?: string;
  licensePlateCode?: string;
};`} />
      <p>Companion sessionStorage keys are <code>iflpf</code> (is-from-license-plate-flow) and <code>rgar</code> (redeem-grant-after-redirect). <strong>Partner activation</strong> is the other thing: account linking, with ESPN pages under <code>apps/commerce/espn/pages/commerce/activate/</code> over <code>commerce-base/src/transactional/activation/**</code>, and outbound partner targets supplied by Sparrow — <code>hulu</code>, <code>raptor_us</code>, <code>foxone_us</code>, <code>mlb_us</code>, <code>nfl_us</code>. The callback page carries a load-bearing comment: ESPN authenticates via OneID, so the BAM SDK only becomes authorized after <code>OneIdWrapper</code> exchanges the <code>id_token</code>; without it, users returning from the external provider hit <code>LoginRequired</code>&apos;s SDK-only check and bounce to login.</p>
      <ArticleTable caption="Where each identity capability actually lives — check this before starting a search." minWidth={880}>
        <table>
          <thead>
            <tr><th>Capability</th><th>In cgi-web?</th><th>Where the rest lives</th></tr>
          </thead>
          <tbody>
            <tr><td>ESPN OneID login lightbox</td><td>Orchestration only</td><td>OneID SDK served from <code>registerdisney.go.com</code></td></tr>
            <tr><td>Pay-TV / MVPD / TVE sign-in</td><td><strong>No</strong></td><td>ESPN Web / Adobe Pass</td></tr>
            <tr><td>Playback entitlement checks</td><td><strong>No</strong></td><td><code>espn.playback.edge.bamgrid.com</code></td></tr>
            <tr><td>License-plate grant exchange</td><td>UI + hooks</td><td>Orchestration GraphQL (<code>bamgrid.com</code>)</td></tr>
            <tr><td>Partner activation redemption</td><td>UI + callbacks</td><td>Flex API + partner sites</td></tr>
            <tr><td>Main App entry routing / <code>ag</code> reader</td><td><strong>No</strong></td><td><code>github.twdcgrid.net/site-dominguez/solo</code></td></tr>
            <tr><td>Production client ids and prod domains</td><td><strong>No</strong> — QA fixtures only</td><td>Sparrow remote config</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="testing-identity">Testing Identity</h2>
      <p>The test doubles in this area are the best learning material in the repo, because each one documents <em>why</em> the real thing is undrivable. The star is <code>apps/commerce/disneyPlus/playwright/support/utils/mock-identity-sdk.ts</code>. The real <code>launchReauth()</code> cannot be driven in E2E: it needs a genuine OIDC refresh token, a live <code>getGuest(&#123; forceRefresh: true &#125;)</code> fetch, and a cross-origin <code>postMessage</code> handshake with a login host behind an internal timer. Every test that tried to launch the real SDK is skipped. So instead of mocking <em>around</em> the SDK, the fake patches the SDK&apos;s own statics:</p>
      <CodeBlock lang="typescript" filename="mock-identity-sdk.ts"
        code={`Object.defineProperty(window, 'IdentityWebSDK', {
  configurable: true,
  get: () => sdkClass,
  set: (incoming: FakeIdentitySDKStatic) => {
    sdkClass = incoming;
    // Mutating the statics on the incoming class object is what makes this
    // work: \`window.IdentityWebSDK\` and the value \`sdk-atoms.ts\` imports are
    // the same object reference, so patching here also patches the module
    // import that production actually calls.
    incoming.getPromise = () => Promise.resolve(resolvedInstance);
    incoming.get = () => resolvedInstance;
  },
});`} />
      <p>Internalise the technique: because the module import and the window global are the <strong>same object reference</strong>, patching the statics means <em>production code paths run unchanged</em> — no branch, no test-only fork. The five outcomes it can produce (<code>cancel</code>, <code>error</code>, <code>notReady</code>, <code>sdkErrorEvent</code>, <code>success</code>) map one-to-one onto documented branches of the reauth handler. Two subtleties worth copying: <code>notReady</code> resolves <code>null</code> rather than throwing, because <code>initializeIdentitySDK</code> re-throws and would reject the entire session bootstrap; and <code>getLaunchReauthCallCount(page)</code> exists so that asserting <strong>zero</strong> calls after the legacy modal appears distinguishes &quot;the SDK path was never taken&quot; from &quot;the SDK was tried and fell back&quot;.</p>
      <p>The ESPN-relevant double is the fake OneID script, swapped in by <code>commerce-base/src/common/oneid/oneid.tsx</code> whenever server or Playwright mocking is enabled (<code>shouldLoadDevScript ? &lt;DevOneIdSDKScript /&gt; : &lt;OneIdSDKScript /&gt;</code>). It hydrates <code>oneIdAtom</code> directly with a stub whose <code>init</code>, <code>launchIdentityFlow</code>, <code>launchProfile</code> and <code>logout</code> all resolve, whose <code>getGuest()</code> returns a fixed <code>test@disneystreaming.com</code> profile with <code>id_token: &apos;123&apos;</code>, and — the detail that surprises people — whose <code>getLoggedInStatus()</code> resolves <code>true</code>, so <strong>local and Playwright runs are logged in by default</strong>.</p>
      <p>Session plumbing is mocked per tenant by MSW. <code>packages/cgi/sdk-session/src/tests/handlers.ts</code> intercepts the BAM config fetch keyed on <code>SDK_PARTNER_ID</code>, and <code>espnGraphHandlers</code> composes <code>buildExchangeDeviceGrantHandler</code>, <code>buildRefreshTokenHandler</code>, <code>buildRegisterDeviceHandler</code> and <code>buildActiveSessionHandler</code> over ESPN fixtures (<code>__fixtures__/espn/macosx-chrome-qa.json</code> and its preprod sibling).</p>
      <p>Now the honest coverage gap. <strong>ESPN&apos;s real production login path has no E2E coverage in this repo.</strong> The one ESPN login spec turns OneID <em>off</em> in order to test something else:</p>
      <CodeBlock lang="typescript" filename="identity-login.spec.ts"
        code={`/**
 * ESPN's Sparrow config enables OneID (\`enableIdentityOneIdAuthentication: true\`),
 * which renders the external OneID lightbox instead of the in-house
 * ("EDNA") email/password screens. That external flow cannot be completed
 * in-harness, so we override the flag to \`false\` to exercise the shared
 * commerce-base/identity-auth login screens end-to-end, mirroring the Disney+
 * \`accessAuthLogin1\` happy path.
 */
await setupSparrowFeatureFlags({
  mockNodeServer, product: 'espn',
  featureFlags: { enableIdentityOneIdAuthentication: false },
});`} />
      <p>That is a reasonable engineering decision, honestly documented — but the consequence is that a green ESPN identity suite tells you the <em>EDNA</em> screens work, not that ESPN login works. There are also no ESPN license-plate specs and no ESPN license-plate page objects, despite the routes and the flag existing.</p>

      <h2 id="secrets-and-config">Secrets and Config</h2>
      <p><strong>No identity client id or secret is committed as an environment variable.</strong> Client ids arrive through remote config; only infrastructure-ish values live in <code>.env.local</code>.</p>
      <ArticleTable caption="Which channel supplies which identity value — the answer to 'where do I change the client id?'" minWidth={820}>
        <table>
          <thead>
            <tr><th>Value</th><th>Channel</th><th>Path</th></tr>
          </thead>
          <tbody>
            <tr><td>OneID <code>clientId</code>, <code>scriptUrl</code>, <code>closeUrl</code></td><td>Sparrow</td><td><code>feature-configuration.general.oneId</code></td></tr>
            <tr><td>Identity v5 <code>clientId</code>, <code>environment</code>, <code>rolloutPercentage</code>, <code>featureFlows</code></td><td>Sparrow</td><td><code>feature-configuration.general.identitySDK</code></td></tr>
            <tr><td>BAM <code>clientId</code>, <code>clientApiKey</code>, <code>environment</code></td><td>Sparrow</td><td><code>feature-configuration.sdk</code></td></tr>
            <tr><td>Domains and paths (<code>root_domain</code>, <code>login_with_redirect</code>, <code>activate.*</code>)</td><td>Sparrow</td><td><code>paths.paths.commerce</code></td></tr>
            <tr><td>Per-user rollout flags (<code>wpnx-web-identity-*</code>)</td><td>Mystique</td><td><code>useMystiqueFeatureFlags()</code></td></tr>
            <tr><td>Datadog keys, mocking mode, sensitive API keys</td><td>Vault → <code>.env.local</code> / <code>publicRuntimeConfig</code></td><td><code>scripts/setup configure secrets</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Secrets flow through <strong>Vault</strong> in all three environments: deployed apps read Vault via <code>entrypoint.sh</code>; locally <code>scripts/setup configure secrets</code> writes <code>.env.local</code> from a Vault export; CI injects GitHub Actions secrets as step-level <code>env:</code>. Committed fixtures must use <code>test-placeholder</code> or structured fake values — which is exactly why ESPN&apos;s Sparrow fixture carries <code>clientApiKey: &apos;test-sdk-key&apos;</code>. Two custom ESLint rules, <code>no-password-identifiers</code> and <code>no-secret-identifiers</code>, enforce the naming side of this. See <code>docs/security/AGENTS.md</code> for SCRAAP usage.</p>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li><strong>Two identically-named SDK-instance atoms.</strong> The live one is <code>packages/cgi/sdk-session/src/identity-sdk-atom.ts</code>, written by <code>sdk-atoms.ts</code> <code>onMount</code>. The legacy one is <code>commerce-base/src/common/identity-sdk/identity-sdk-atom.ts</code>, written only by <code>&lt;SDKScript /&gt;</code> — which no ESPN or Disney+ layout renders in the current tree, and whose <code>createIdentityInstanceAtom</code> is marked <code>@deprecated</code>. Import the wrong <code>sdkInstanceAtom</code> and it is permanently <code>null</code>, with no error.</li>
        <li><strong>The passkey redirect URI points at a route ESPN lacks.</strong> v5 builds <code>redirectUri</code> as the current origin plus <code>/identity/login/passkey</code>. ESPN has no <code>passkey.page.tsx</code>, so that path falls through to <code>login/[slug].page.tsx</code> and renders <code>LoginWrapper</code> — not an OIDC callback handler. Moot today because v5 never initialises on ESPN; a live landmine the moment someone flips the config.</li>
        <li><strong><code>IdentityWebSDK.getPromise</code> is singleton-memoized.</strong> First call wins. Initialising before the language resolves locks the SDK to the <code>en-US</code> fallback — and the legacy <code>sdk-script.tsx</code> hardcodes <code>&apos;en-US&apos;</code>.</li>
        <li><strong>ESPN has two application layouts.</strong> <code>src/layout/espn-layout.tsx</code> and <code>src/common/layouts/legacy-application-layout.tsx</code> each independently hydrate the device-attribute provider and render <code>&lt;OneId /&gt;</code>. Change both, always. And keep SDK dependencies inside the app layout — there is a shouty comment saying so in <code>page-layout.tsx</code>.</li>
        <li><strong><code>enableIdentityOneIdAuthentication</code> also kills the signup route.</strong> It forces <code>/identity/sign-up</code> to <code>/identity/login</code> with the slug stripped, so ESPN effectively has no in-app signup route while OneID is on.</li>
        <li><strong><code>activitySessionIdAtom</code> must be hydrated before the session mounts</strong> or bootstrap fails hard, not gracefully.</li>
        <li><strong><code>dss_sdk_config_env=preprod</code> needs <code>dss_backend_services=prod</code></strong> or you get CORS and 401s. These override cookies and sessionStorage keys are honoured unconditionally by client code; whether the edge strips them in production is not determinable from this repo.</li>
        <li><strong>ESPN forces a marketing-onboarding override in place.</strong> <code>use-navigation-redirect.tsx</code> mutates the <code>me</code> response to force <code>eligibleForOnboarding</code> and <code>isOnboarded</code> true when ESPN&apos;s <code>hardcodedQueries</code> includes the review-and-accept query, tagged with a TODO. Redirect behaviour you cannot explain from the API response may be coming from here.</li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: why does reauth work on Disney+ but not on ESPN?"
        intro="A weak answer says 'ESPN uses a different login'. A strong answer names the config field, the missing call-site, and the exact line the failure surfaces on."
        steps={[
          "Open with the model: same identity platform, different client SDKs. Disney+ runs Identity v5; ESPN runs the OneID v4 script.",
          "Name the config proof: ESPN's Sparrow feature-configuration ships identitySDK: null while Disney+ ships a populated block and oneId: null.",
          "Name the call-site proof: useHydrateIdentitySDKConfig() is called only in the two Disney+ commerce layouts and the Disney+ marketing _app — never in ESPN's two layouts.",
          "Follow the chain: identitySDKConfigAtom stays null, so sdk-atoms.ts records tracker.skipped('identity_sdk_initialized', { reason: 'no_config' }) and sdkStatusAtom never leaves 'pending'.",
          "Land the consequence: the reauth handler throws 'IdentitySDK not ready' at step 2, so restrict-profile-creation falls through to the password ActionGrantModal every time on ESPN.",
          "Close with the generalisation: availability is config plus call-site, not code presence — and because it is logged as skipped rather than failed, nothing alarms.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: ESPN users report being logged out mid-checkout"
        intro="The signal an interviewer wants is that you know logout can be intentional here, and that you can name which component decided."
        steps={[
          "State the two-token model first: OneID holds the guest session, BAM holds the commerce session, and they can disagree.",
          "Name OneIdWrapper as the reconciler and quote its contract: BAM-in plus OneID-out means log the user out via /identity/logout, on purpose.",
          "Add the second trigger: an email mismatch between the BAM account and the OneID guest also forces a BAM logout and an id_token re-exchange.",
          "Name the quieter cause: LoginRequired re-checks dataInterface.isLoggedIn() on mount and calls authRedirect() when false.",
          "Rule out red herrings: refresh is SDK-owned and only mocked in-repo, so it is not a cgi-web bug; but authDataAtom expires in 10 minutes independently and can drop a prefilled email.",
          "Finish with the recovery boundary: nothing in the repo resumes a half-finished checkout — the only carrier across the bounce is redirectURL via redirectTargetQuery.",
        ]}
      />

      <h2 id="challenge">Challenge: Logged Out Mid-Checkout</h2>
      <InterviewChallenge
        title="Diagnose an ESPN mid-checkout session loss and design the fix"
        scenario={
          <>
            Support escalates a cluster of ESPN reports: guests reach the billing page on <code>secure.web.plus.espn.com</code>, sit for a few minutes, submit, and land back on <code>/identity/login</code> with an empty form. Datadog shows no 401s from orchestration and no <code>IDENTITY_V5_SDK_REAUTH</code> actions at all. One engineer insists it is token refresh; another wants to add a <code>redirectURL</code> to every internal link so users return to billing. You own the ticket.
          </>
        }
        tasks={[
          "Enumerate every in-repo mechanism that can send an authenticated ESPN user to /identity/login, and name the file that owns each one.",
          "Explain why the absence of IDENTITY_V5_SDK_REAUTH actions is expected on ESPN and therefore tells you nothing about this bug.",
          "Decide whether token refresh is a plausible cause, and justify it from repo evidence rather than intuition.",
          "Given the guest returns to a login page with an empty email field, explain what expired and where.",
          "Evaluate the second engineer's proposal: which of the three redirectURL validators applies to an in-app link, and would their plan work?",
          "State what you would add to make the next occurrence self-diagnosing, without weakening any auth check.",
        ]}
        pitfalls={[
          "Assuming logout is a bug: OneIdWrapper logs users out deliberately on a BAM-in / OneID-out mismatch.",
          "Blaming refresh: it is owned by the BAM and identity SDKs and appears in-repo only as MSW fixtures and buildRefreshTokenHandler.",
          "Reading useIsLoggedIn as authoritative: it returns true when the SDK is disabled.",
          "Passing an absolute URL as an in-app redirectURL: the client validator treats anything that parses as a URL as tampering and logs it.",
          "Testing the fix only on Disney+, whose login path is a different SDK entirely.",
        ]}
        signal="Separates candidates who reason from the two-token model and the config-driven branch from those who pattern-match 'logged out' to 'token expiry'."
      />
      <SolutionReveal difficulty="hard">
        <p><strong>1. The bounce sources.</strong> Three, all client-side. <code>OneIdWrapper</code> (<code>commerce-base/src/common/oneid/oneid-wrapper.tsx</code>) pushes <code>/identity/logout</code> when BAM is authorized and OneID is not, and also on a BAM/OneID email mismatch; it pushes <code>/identity/login</code> when neither is logged in. <code>LoginRequired</code> (<code>identity/logged-in-check/components/login-required.tsx</code>) re-checks <code>dataInterface.isLoggedIn()</code> on mount and calls <code>authRedirect()</code>. <code>AuthChecks</code> in <code>identity-auth</code> enforces the authenticated and unauthenticated slug allowlists.</p>
        <p><strong>2. Why the missing reauth telemetry is noise.</strong> Reauth is v5-only, and v5 never initialises on ESPN — Sparrow ships <code>identitySDK: null</code> and no ESPN layout calls <code>useHydrateIdentitySDKConfig()</code>, so <code>sdkStatusAtom</code> stays <code>&apos;pending&apos;</code>. <code>IDENTITY_V5_SDK_REAUTH_*</code> actions can never fire on ESPN. Their absence is the steady state, not a clue.</p>
        <p><strong>3. Refresh is out.</strong> cgi-web does not implement refresh. <code>packages/identity-auth/AGENTS.md</code> forbids managing tokens directly, and the only refresh artefacts are MSW fixtures plus <code>buildRefreshTokenHandler()</code>. A refresh failure would also surface as orchestration 401s, which the dashboard rules out. The far likelier trigger is a OneID-side state change during the idle window leaving BAM-in / OneID-out — precisely the mismatch <code>OneIdWrapper</code> resolves by logging the user out.</p>
        <p><strong>4. The empty email field.</strong> That is <code>authDataAtom</code>, whose <code>isValid</code> requires an email <em>and</em> an <code>expires</code> timestamp still in the future, with every write setting a fresh 10-minute window (<code>commerce-base/src/identity/auth-data/atoms.ts</code>). A few-minute pause on billing is exactly long enough. It is independent of the session, which is why it can expire while the user still looks logged in.</p>
        <p><strong>5. The redirectURL proposal.</strong> An in-app link goes through <code>useNavigationRedirect</code>&apos;s <code>isValidRedirect</code>, which requires the value to <em>fail</em> <code>new URL()</code> and to prefix-match <code>INTERNAL_ROUTES</code>. So a relative <code>/commerce/billing</code> passes and an absolute <code>https://secure.web.plus.espn.com/commerce/billing</code> is rejected and logged as tampering. Their plan can be made to work only with relative paths on allowlisted prefixes — and it still does not fix the bug, because returning to billing restores neither the auth-data email nor the reconciled session. Do not reach for the host-allowlist validator here; it is the loosest of the three and belongs to external redirects only.</p>
        <p><strong>6. Making it self-diagnosing.</strong> Emit a structured RUM action from <code>OneIdWrapper</code> naming which of its four branches it took, including the OneID and BAM booleans and whether the trigger was an email mismatch, with <code>owner: Owners.IDENTITY</code> to match repo convention. Emit a second event when <code>authDataAtom</code> is read and found expired. Neither changes a single authorization decision — they only make an intentional logout distinguishable from an accidental one in a dashboard, which is the whole gap here.</p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>MyDisney is the account <em>brand</em>, OneID is the identity <em>system</em>, and Identity v5 (<code>@disney-identity/sdk-web</code>) is a Disney+-only <em>client</em> for it — ESPN authenticates the same accounts through the OneID v4 script.</li>
        <li>Feature availability is config plus call-site, not code presence: ESPN ships <code>identitySDK: null</code> and never calls <code>useHydrateIdentitySDKConfig()</code>, so <code>sdkStatusAtom</code> stays <code>pending</code> and every v5 capability is unreachable with zero errors logged.</li>
        <li>There is no ESPN identity package — <code>@solo/identity-hulu</code> is the only brand-specific one and ESPN does not use it; ESPN reuses <code>commerce-base/src/identity</code> plus <code>@solo/identity-auth</code>.</li>
        <li>Sessions are BAM-owned, client-side, and stored in localStorage under <code>__bam_sdk_access--espn-a9b93989_qa</code> and siblings; refresh belongs to the SDKs, and <code>useIsLoggedIn</code> returns <code>true</code> when the SDK is disabled, so it is a UI hint rather than a security boundary.</li>
        <li>Cross-domain SSO rides the shared OneID responder page on <code>espn.com</code>; <code>espn_aid</code> is an apex-domain device id and <code>ag</code> is an unsigned UX gate — and a OneID/BAM mismatch in <code>OneIdWrapper</code> logs the user out on purpose.</li>
        <li>Three inconsistent <code>redirectURL</code> validators exist (exact origin, must-be-relative, host allowlist); always pick the strictest one that does the job — and remember no TV-provider / MVPD / Adobe Pass authentication lives in this repo at all, only license plate and partner activation.</li>
      </ul>
    </div>
  );
}
