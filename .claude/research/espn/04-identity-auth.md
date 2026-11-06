# ESPN Identity, Auth, Session & Account Linking — cgi-web

Digest of the ESPN identity/auth slice in `cgi-web` (working tree at `607747d290`, main).
Claims are **CONFIRMED** (read in code here) or **INFERRED**. Paths are repo-relative.

---

## H2 · TL;DR — the ten load-bearing facts

| # | Fact | Label |
|---|------|-------|
| 1 | No ESPN identity package. ESPN reuses `commerce-base/src/identity/*` + `@solo/identity-auth`; `@solo/identity-hulu` is the only brand-specific one. | CONFIRMED |
| 2 | ESPN authenticates via **OneID v4** (`OneID.js`, clientId `ESPN-ONESITE.WEB`) — **not** MyDisney/Identity v5. | CONFIRMED |
| 3 | `useHydrateIdentitySDKConfig()` — the only switch for Identity v5 — is called **only in Disney+ layouts**, never ESPN. | CONFIRMED |
| 4 | ESPN Sparrow fixture: `identitySDK: null`, `oneId: {...}`. Disney+: the inverse. | CONFIRMED |
| 5 | Auth is a two-token dance: OneID `id_token` → GraphQL `exchangeIDTokenForAccessToken` → BAM SDK session. `OneIdWrapper` reconciles. | CONFIRMED |
| 6 | Cross-domain SSO uses the **shared OneID responder page** `https://www.espn.com/disneyid/responder/v4/index.html`, not app cookies. | CONFIRMED / INFERRED |
| 7 | `isAuthenticated` = `sdkSession.isAuthorized('bamIdentity')`. **All session reads are client-side**; no SSR session read. | CONFIRMED |
| 8 | XState drives the *in-house* ("EDNA") screens, which ESPN reaches only when `enableIdentityOneIdAuthentication` is false. | CONFIRMED |
| 9 | **No TVE / MVPD / Adobe Pass / TV-provider auth in this repo.** Only playback fixtures + dictionary copy linking to `support.espn.com`. | CONFIRMED |
| 10 | Reauth / step-up (`launchReauth`) is v5-only ⇒ effectively Disney+-only; ESPN always gets the password `ActionGrantModal` fallback. | CONFIRMED / INFERRED |

---

## H2 · 1. Identity packages — shared vs brand-specific

### H3 · Inventory (CONFIRMED)

```
packages/identity-auth/      @solo/identity-auth   — shared identity UI + flows (all brands)
packages/identity-hulu/      @solo/identity-hulu   — Hulu-only "unified" flows
packages/mydisney-ui/        @solo/mydisney-ui 3.4.1
packages/cgi/sdk-session/    @solo/sdk-session     — BAM + Identity SDK session bootstrap
packages/cgi/commerce-base/  pages + src/common/{oneid,identity-sdk}
packages/cgi/data-interface-{disney,espn,hulu}
packages/profiles/, profiles-ui/
```

**No `identity-espn`, and no ESPN subtree inside `identity-auth`.** A repo-wide
`grep -i espn` over `packages/identity-auth/src` + `packages/identity-hulu/src`
returns 18 files — all fixtures, tests, or brand-name copy (e.g.
`identity-auth/src/common/components/learn-more/learn-more.tsx`,
`identity-auth/src/packages/dictionary/data/local-fallback.ts`). No ESPN config
module, no ESPN feature module. CONFIRMED.

### H3 · Where ESPN's identity code actually lives

| Concern | Path |
|---|---|
| Route shells (thin re-exports) | `apps/commerce/espn/pages/identity/**` |
| Page implementations | `packages/cgi/commerce-base/src/identity/**` |
| OneID integration | `packages/cgi/commerce-base/src/common/oneid/**` |
| Identity v5 integration | `packages/cgi/commerce-base/src/common/identity-sdk/**` |
| Session bootstrap | `packages/cgi/sdk-session/src/**` |
| In-house login/signup UI + XState machines | `packages/identity-auth/src/**` |
| ESPN GraphQL/session adapter | `packages/cgi/data-interface-espn/src/identity/**` |
| ESPN **marketing** OneID (separate copy!) | `apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/**` |

### H3 · `identity-auth` shape (CONFIRMED)

```
src/common/components/   enter-email, enter-password, enter-passcode, passwordless,
                         create-password, missing-info, blocked, license-plate,
                         auth-checks, verify-email-magic-link, modals…
src/common/services/IPSE/hooks/   the GraphQL layer — 24 hooks (see §3)
src/common/libs/         license-plate-helpers.ts, set-app-gate-cookie.ts, profile-helpers.ts
src/features/login/      login.tsx + state-machine/login-machine.ts
src/features/create-account/      + create-account-machine/
src/features/license-plate/       + state-machines/{login,create-account}-flow-machine.ts
src/features/update-credentials/, education-modal/
src/packages/            dictionary/, remote-config/, text/, text-with-variables/
```

Runtime deps are deliberately thin (`packages/identity-auth/package.json`):
`@solo/{commerce-utils,instrumentation,lang-locale,mydisney-ui,sdk-session}`,
`es-cookie`, `react-string-replace`, `usehooks-ts`. `@disney-identity/sdk-web` is
**not** a dep of `identity-auth` — only of `sdk-session` and `commerce-base`.

`identity-hulu` is structurally different (page-per-screen under `src/pages/`,
`unified-login` / `unified-create-account` / `unified-update-credential`) and is
**not** used by ESPN. CONFIRMED.

---

## H2 · 2. MyDisney / OneID / Identity v5 — which SDK, how configured

### H3 · Three SDKs in play

| SDK | Package / script | Version | Used by |
|---|---|---|---|
| BAM Client SDK ("Bamtech") | `@js-client-sdk/sdk` browser ES5 bundle | `35.3.17` (catalog `default`) | **all brands incl. ESPN** |
| Identity Web SDK v5 ("MyDisney") | `@disney-identity/sdk-web` | `^5.1.29-hf.0` (catalog `default`) | Disney+ only today |
| OneID v4 | remote `.../v4/OneID.js` from `cdn.registerdisney.go.com` | v4 (URL-pinned) | **ESPN** (+ Hulu myDisney modal) |

Catalog lives in `pnpm-workspace.yaml`. Complete `@disney-identity/sdk-web` import
sites (CONFIRMED): `sdk-session/src/identity-sdk-atom.ts:1` (type),
`sdk-session/src/sdk-atoms.ts:2` (value),
`commerce-base/src/common/identity-sdk/sdk-script.tsx:1` (value, legacy),
`.../identity-sdk-atom.ts:2` (type), `.../use-identity-sdk-reauth-handler.ts:2` (type),
plus 3 tests.

### H3 · ESPN BAM session config (CONFIRMED)

`packages/cgi/sdk-session/src/constants.ts`:

```ts
export const SDK_PARTNER_ID = { disneyPlus: 'disney-svod-3d9324fc', espn: 'espn-a9b93989' } as const;
export const SDK_ENVIRONMENT_OVERRIDE_COOKIE = 'dss_sdk_config_env';
```

Sparrow `feature-configuration.sdk`
(`commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:117-127`):
`clientId: 'espn-a9b93989'`, `clientApiKey: 'test-sdk-key'`, `environment: 'qa'`,
`application: { name: 'espnplus', id: 'com.espn.plus.web.unified.commerce', version: '2.0.0' }`.
Hydrated at `commerce-base/src/common/layouts/__internal__/hydrate-base-atoms.tsx:73-74`
(`useHydrateBamSDKConfigAtom` + `useHydrateActivitySessionIdAtom(getActivitySessionId())`).

### H3 · ESPN OneID config (CONFIRMED)

`sparrow-commerce-espn-workspace.ts:170-175` — note the null/non-null pairing:

```ts
identitySDK: null,
oneId: {
  clientId: 'ESPN-ONESITE.WEB',
  closeUrl: 'https://plus.espn.com',
  scriptUrl: 'https://stg.cdn.registerdisney.go.com/v4/OneID.js',
},
```

Disney+ is the inverse (`__fixtures__/disneyPlus/sparrow-commerce-disneyplus-workspace.ts:3154-3168`):
`identitySDK: { environment: 'qa', scriptUrl: 'https://cdn-qa.disneyaccount.com/v5/sdk.js',
clientId: 'DTCI-DISNEYPLUS.WEB', enabled: false, rolloutPercentage: 0, featureFlows:
{ activations, licensePlate, redemption, giftCards: false, standard: true } }`, `oneId: null`.
Types at `commerce-utils/src/app-config/models/feature-configuration-scope.ts:82-101`.

Instance creation — `commerce-base/src/common/oneid/oneid-script.tsx:73-97`:

```ts
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
await oneIdInstance?.init();
```

Language mapping (`:20-52`): OneID `en-US|es-ES|es-LA` ⇄ app `en|es-419`.
Gate (`commerce-base/src/common/oneid/oneid.tsx:12-16`):
`isOneIdEnabledAppAtom = selectAtom(commerceAppConfigAtom, (c) =>
c['feature-flags'].general.enableIdentityOneIdAuthentication)`. ESPN sets it `true`
(`sparrow…espn…:41`). `<OneId />` renders from
`apps/commerce/espn/src/common/layouts/page-layout.tsx:164` and
`apps/commerce/espn/src/layout/espn-layout.tsx:134`, always *inside* the app layout
("DO NOT RENDER ANY SDK DEPENDENCIES ABOVE THE APPLICATION LAYOUT", `page-layout.tsx:147`).

### H3 · Identity v5 init — and why ESPN never reaches it

Atoms (`packages/cgi/sdk-session/src/identity-sdk-atom.ts:6-17`): `IdentitySDKConfig
= { clientId; language; environment }` where `Environment = 'local'|'dev'|'qa'|
'preprod'|'prod'|'localUI'`; plus `identitySDKConfigAtom`, `sdkInstanceAtom`,
`sdkStatusAtom` (`'pending'|'ready'|'error'`), `sdkErrorAtom`.

Init — `packages/cgi/sdk-session/src/sdk-atoms.ts:194-227`:

```ts
const instance = await IdentityWebSDK.getPromise(
  {
    clientId: identitySDKConfig.clientId,
    language: mapToIdentitySDKLanguage(identitySDKConfig.language) ?? FALLBACK_IDENTITY_LANGUAGE,
    environment: identitySDKConfig.environment,
    redirectUri: `${window.location.origin}/identity/login/passkey`,
    postLogoutRedirectUri: `${window.location.origin}/`,
    autoRedirect: false,
  },
  sessionProvider          // the BAM SDKSession's sessionProvider
);
```

Redirect URIs derive from `window.location.origin` ⇒ on ESPN they resolve to
`https://secure.web.plus.espn.com/identity/login/passkey`. INFERRED (computed at
runtime, never hardcoded).

Config population — `commerce-base/src/common/identity-sdk/use-hydrate-identity-sdk-config.ts:41-67`:

```ts
const identityConfig: IdentitySDKConfig | null =
  sparrowConfig && isIdentitySDKEnabledApp && isInRollout
    ? { clientId: sparrowConfig.clientId, language,
        environment: resolveSDKEnvironment(sparrowConfig.environment) as IdentitySDKConfig['environment'] }
    : null;
useHydrateAtoms([[identitySDKConfigAtom, identityConfig]]);
```

**Complete call-site list of `useHydrateIdentitySDKConfig()` (CONFIRMED):**
`apps/commerce/disneyPlus/src/layout/disney-layout.tsx:127`,
`apps/commerce/disneyPlus/src/common/layouts/legacy-application-layout.tsx:107`,
`apps/marketing-unified/disneyplus/pages/_app.tsx:59`.

ESPN's two layouts do **not** call it ⇒ `identitySDKConfigAtom` stays `null` ⇒
`sdk-atoms.ts:301-311` skips: `tracker.skipped('identity_sdk_initialized', { reason:
identitySDKConfig ? 'no_language' : 'no_config' })`. On ESPN commerce
`sdkInstanceAtom` is never set, `sdkStatusAtom` stays `'pending'`, and every v5 path
(reauth, passkey callback, v5 action-grant exchange) is unreachable. CONFIRMED (code
path) / INFERRED (production, prod Sparrow being out of repo).

The hook also emits a rich diagnostic (`:87-113`) `log({ key: 'IDENTITY_SDK_CONFIG_GATE' })`
capturing every gate input: `identity_sdk_enabled_app`, `has_identity_sdk_config_object`,
`identity_sdk_enabled_override` (sessionStorage `dss_identity_sdk_enabled`),
`identity_sdk_environment_override` (cookie `dss_sdk_config_env`),
`identity_sdk_rollout_percent`, `identity_sdk_is_user_in_rollout`,
`identity_sdk_global_present`/`_instance_present`/`_instance_initialized`, `region`, `pathname`.

### H3 · Two competing v5 init paths (a real trap)

Two modules export identically-named `sdkInstanceAtom` / `sdkStatusAtom` / `sdkErrorAtom`:

| | File | Notes |
|---|---|---|
| **Current** | `packages/cgi/sdk-session/src/identity-sdk-atom.ts` | initialized in `sdk-atoms.ts` `onMount`; receives the BAM `sessionProvider` |
| **Legacy** | `commerce-base/src/common/identity-sdk/identity-sdk-atom.ts:159-161` + `sdk-script.tsx` | separate `<SDKScript />`; **hardcodes `language: 'en-US'`** (`sdk-script.tsx:52`); gated on Mystique flags only; `createIdentityInstanceAtom` marked `@deprecated` |

`<SDKScript />` is rendered by **no** ESPN or Disney+ layout in the current tree
(grep finds only `ApplePaySDKScript` and test mocks). `use-identity-sdk.tsx` reads the
**sdk-session** atoms; `sdk-script.tsx` writes the **commerce-base** ones. CONFIRMED.

---

## H2 · 3. The login flow for ESPN

### H3 · ESPN route inventory (`apps/commerce/espn/pages/identity/`) — CONFIRMED

| Route | Re-exports | gSSP guards |
|---|---|---|
| `/identity/login`, `/login/[slug]` | `LoginWrapper` | layout only |
| `/identity/loading` | `LoadingPage` | `redirectUserToRedirectURL` |
| `/identity/logout` | `LogoutPage` | layout `onboarding` header |
| `/identity/sign-up`, `/sign-up/[slug]` | `SignUpPage` | `redirectUserToLogin` + flag `enableIdentityCreateAccountRoute` |
| `/identity/start` | `LicensePlateStartPage` | flag `enableIdentityUnifiedLicensePlateFlow` |
| `/identity/begin`, `/begin/[...slug]` | `LicensePlateBeginPage` | same flag |
| `/identity/update-credentials` | `UpdateCredentialsPage` | flag `enableUpdateCredentialsRoute` |
| `/identity/{magic,verify,review-and-accept,subscriber-agreement,oauth-review-terms,nielsen}` | commerce-base / profiles equivalents | — |

**Present on Disney+, absent on ESPN:** `login/passkey.page.tsx`, `manage-devices`,
`delete/[slug]`. Shells are ~19-line re-exports plus a layout-config gSSP composed by
`buildGetServerSideProps` (`apps/commerce/espn/pages/identity/login/index.page.tsx:1-19`).

> **Gotcha (INFERRED):** the v5 `redirectUri` is `${origin}/identity/login/passkey`.
> ESPN has no `passkey.page.tsx`, so that URL falls through to `login/[slug].page.tsx`
> → `LoginWrapper`, **not** an OIDC-callback handler.

### H3 · The three-way branch in `LoginWrapper`

`commerce-base/src/identity/login/pages/login-wrapper-page.tsx:23-149`:

```
LoginWrapper
├─ shouldLaunchIdentitySDK → identitySDK.launchIdentityFlow()   (v5 offsite, login.disney.com)
├─ isOneIdEnabledApp       → <OneIdLogin />                      ← ESPN today
└─ else                    → <EdnaLoginPage />                   (in-house XState screens)
```

```ts
const isMystiqueLoginEnabled = mystiqueFlags?.['wpnx-web-identity-v5-sdk-login-enabled'] === true;
const shouldLaunchIdentitySDK = useLaunchIdentityFlow(
  commerceAppConfig?.['feature-configuration']?.general?.identitySDK,
  isMystiqueLoginEnabled, isIdentitySDKEnabledApp
);
...
if (isOneIdEnabledApp) return <OneIdLogin />;
return <EdnaLoginPage />;
```

Before handing to v5 it stashes the query string (`:91-103`):
`sessionStorage.setItem('passkey_return_params', window.location.search)` then
`window.history.replaceState(window.history.state, '', window.location.pathname)`.
Already-authenticated users are pushed to `/identity/loading` **except** on
`/identity/login/missing-info` and `/identity/login/account-blocked`, which must
render in-app despite being authenticated (`:63-80`).

### H3 · Flow gating — `useLaunchIdentityFlow`

`commerce-base/src/common/hooks/use-detect-product-flow.ts`. Two layers: app-level
`enabled` + per-flow `featureFlows`. Detection patterns (`:145-164`):

```ts
const FLOW_PATTERNS: Record<ProductFlowType, FlowPattern> = {
  activations: { queryParams: ['providerId', 'token'], referrerPatterns: [/\/activate/] },
  redemption:  { queryParams: ['redemptionCode'],      referrerPatterns: [/\/redeem/] },
  licensePlate:{ referrerPatterns: [/\/identity\/start/, /\/identity\/begin/] },
  giftCards:   { referrerPatterns: [/\/commerce\/gift/], referrerQueryParams: ['redirectURL'] },
  standard: {},
};
```

Precedence (`:225-290`): `isActivationFlow` (localStorage `dss-external-activation`)
→ `licensePlateOptions.offDeviceGrant` → query params → jotai referrer → browser
referrer → `'standard'`. Gate result (`:344`): `if (!isIdentitySDKEnabledApp ||
!sparrowConfig?.featureFlows?.[flowType]) → false`. Reasons enumerated at `:82-95`
(e.g. `sparrow-flow-gate-closed-licensePlate`).

Rollout bucketing (`packages/cgi/sdk-session/src/interop-rollout.ts:11-40`): a
**stable per-browser percentile 0–999** in localStorage
(`dss_identity_interop_percentile`) compared against Sparrow `rolloutPercentage`,
tagging RUM via `setGlobalContextProperty('identity_interop_enabled', …)`.

### H3 · The ESPN path: `OneIdLogin`

`commerce-base/src/identity/login/pages/oneid-login-page.tsx` renders only
`<PageLoader />`; all work is in effects:

```
1. useQuery ['oneId.getLoggedInStatus'] → oneId.getLoggedInStatus()
2. if false → oneId.on('login', …) then                                       (:123-148)
     await oneId.launchIdentityFlow(authData.email, {
       optionalConfigs: { displayOptions: { hideCloseButtonEverywhere: true } } })
3. on 'login' → exchangeIdTokenForAccessToken({ idToken: data.token.id_token })
     onSuccess → store swid on oneIdAtom, clear authData.email
4. when (isSDKSessionReady && oneIdLoggedIn && isLoggedIn && guestLanguage && profileId)
     → updateProfileAppLanguage GraphQL mutation                              (:164-213)
5. onSuccess → invalidate activeProfile queries, then
     startRedirect(...)  if flag wpnx-web-identity-remove-loading-page
     else push('/identity/loading')                                           (:197-210)
```

Close button is force-hidden with a documented reason (`:138-141`): "a timing issue
between the close event firing also from internal events. We cannot distinguish
between it firing from user manually closing or if the login action fired…".

### H3 · The in-house ("EDNA") path — XState `login-machine`

Reachable on ESPN only when `enableIdentityOneIdAuthentication` is false (which the
ESPN Playwright suite does deliberately — §9). Mounted by
`commerce-base/src/identity/login/pages/login-page.tsx:90-94`
(`<IdentityClientInterface><Login config={config} /></IdentityClientInterface>`).

`packages/identity-auth/src/features/login/state-machine/login-machine.ts:42-51`:

```ts
SCREENS = {
  ACCOUNT_BLOCKED: 'account-blocked', CHANGE_PASSWORD: 'change-password',
  ENTER_EMAIL: 'enter-email',        ENTER_PASSCODE: 'enter-passcode',
  ENTER_PASSWORD: 'enter-password',  MISSING_INFO: 'missing-info',
  RATE_LIMITED: 'rate-limited',      PASSWORDLESS_LOGIN: 'passwordless',
}
```

State graph (transcribed from `:240-528`):

```
start ──always(isValidRoute slug)──▶ enterPasscode | enterEmail | enterPassword
                                     | changePassword | missingInfo | passwordlessLogin

enterEmail        NEXT ▶ enterPassword | OTP_LOGIN ▶ enterPasscode
                  PASSWORDLESS_LOGIN ▶ passwordlessLogin | RESET ▶ start
                  SAVE_EMAIL_AND_ENTRYPOINT (action only)
                  OPEN_EMAIL_CONFIRMATION_DIALOG / OPEN_EMAIL_ERROR_REDUCTION_DIALOG ▶ .opened
enterPassword     NEXT_WITH_MISSING_INFO_CHECK ▶ done [isComplete] | missingInfo
                  OTP_LOGIN ▶ enterPasscode | ENTER_EMAIL ▶ enterEmail
                  INELIGIBLE ▶ accountBlocked | RESET ▶ enterEmail
enterPasscode     NEXT_WITH_MISSING_INFO_CHECK ▶ done | missingInfo
                  CHANGE_PASSWORD ▶ changePassword | OTP_RATE_LIMIT ▶ rateLimited
                  CANCEL ▶ enterEmail | INELIGIBLE ▶ accountBlocked
passwordlessLogin OTP_LOGIN ▶ enterPasscode | OTP_RATE_LIMIT ▶ rateLimited
                  CANCEL ▶ enterPassword | ENTER_EMAIL / RESET ▶ enterEmail
                  INELIGIBLE ▶ accountBlocked
changePassword    NEXT_WITH_MISSING_INFO_CHECK ▶ done | missingInfo
                  REAUTHENTICATE ▶ enterPassword | CANCEL ▶ enterEmail
                  INELIGIBLE ▶ accountBlocked
missingInfo       NEXT ▶ done | RESET ▶ start | INELIGIBLE ▶ accountBlocked
                  (+ logoutModalStates OPEN/CLOSE)
rateLimited       CANCEL ▶ enterEmail
accountBlocked    (final)
done              entry: ['redirect']  (final)
```

Guard (`:561-566`): `isComplete = !isDOBCollectionRequired(personalInfoFlow)`.
Terminal redirect (`:532-549`): if `redirectFn` (i.e. `startRedirect` from
`use-navigation-redirect`, wired when `wpnx-web-identity-remove-loading-page` is on)
call it, else `router.push({ pathname: routes.loading, query: extractQueryParams(router.query) })`.

Passwordless is flag-driven (`identity-auth/src/features/login/login.tsx:132-139`):
`wpnx-web-identity-use-passwordless-login` ∈ `'opt-out-link' | 'opt-out-button'`.
Sibling machines: `features/create-account/create-account-machine/create-account-machine.ts`,
`features/license-plate/state-machines/{login,create-account}-flow-machine.ts` (each
with a `.typegen.ts`).

### H3 · IPSE — the identity GraphQL layer (CONFIRMED)

`packages/identity-auth/src/common/services/IPSE/hooks/` — 24 hooks, all on
`useSDKMutation` / `useSDKQuery` from `@solo/sdk-session`:

```
use-check-email  use-login  use-login-with-action-grant  use-login-with-magic-link
use-request-otp  use-authenticate-with-otp  use-authenticate-with-reasons  use-register
use-update-password  use-update-email  use-is-logged-in  use-me-query
use-collect-personal-info  use-fetch-password-rules-anonymous
use-fetch-anon-legal-documents  use-fetch-me-legal-documents  use-account-consent-token
use-request-magic-link-email  use-switch-profile  use-redeem-off-device-grant
use-fetch-license-plate-device-grant  use-fetch-request-connected-device-details
use-create-marketing-preferences  use-onboard-marketing-preferences
```

Step-up-by-password (`use-authenticate-with-reasons.ts:11-24`):
`mutation authenticate($input: AuthenticateInput!) { authenticate(authenticate: $input)
{ actionGrant } }` — "This is NOT used to login a user. An actionGrant object is
returned from this hook, which can be used to perform modifications to an account".

Edge states are gated by `AuthChecks`
(`identity-auth/src/common/components/auth-checks/auth-checks.tsx:46-86`) against slug
lists in `common/constants/routes.ts:17-26`:
`AUTHENTICATED_SLUGS = ['missing-info','verify-email']`,
`UNAUTHENTICATED_SLUGS = ['enter-email','create-password','enter-password','passwordless-login']`.

---

## H2 · 4. Session lifecycle

### H3 · Bootstrap sequence (`packages/cgi/sdk-session/src/sdk-atoms.ts`)

`sdkPrimitiveAtom` wraps `sdkSessionAtom` and drives everything from Jotai `onMount`
— there is no explicit provider (documented `:490-506`).

```
onMount (client only)
 ├─ guard: activitySessionIdAtom hydrated, else hard error          :569-585
 ├─ getAdditionalBootstrapConfigurationOptions()                    :129-192
 │    · Microsoft-Store PWA detection (document.referrer + sessionStorage 'pwaWindowsApp')
 │    · env override from cookie dss_sdk_config_env (resolveSDKEnvironment)
 │    · configHostOverride when LOCAL_EDGE_SERVER=enabled
 ├─ new SDK.Services.Configuration.BootstrapConfiguration({...sdkConfig, ...additional})
 ├─ SDK.SdkSession.createSdkSession({ bootstrapConfiguration, eventEdgeClientSettings,
 │                                    deviceAttributeProvider, activitySessionId })  :277-282
 ├─ [v5 only] initializeIdentitySDK(...) → tokenProvider             :301-313
 ├─ initializeWithState(localStorage)  OR  initialize()              :319-382
 ├─ registerCorrelationID(newSession)                                :384
 ├─ backPopulateSessionInfo()                                        :387-476
 └─ newSession.on(SDK.Events.SessionInfoChanged, …)                   :478-485
```

### H3 · Token storage

**localStorage**, keyed by `clientId` + `environment` (`sdk-atoms.ts:293-296`):
`__bam_sdk_access--${clientId}_${environment}`, `__bam_sdk_device_grant--…`,
`__bam_sdk_session_info--…`, `__bam_sdk_feature_flags--…`. For ESPN:
`__bam_sdk_access--espn-a9b93989_qa` etc. INFERRED (mechanical substitution).

**Warm start:** when `initializationStateAtom` is true and access + deviceGrant +
sessionInfo are all present, boot via `SDK.InitializationState.deserialize(...)` +
`initializeWithState(...)` — "Bypassing extra service calls" (`:356-358`). Failure
falls back to a cold `initialize()` tagging `init_path: 'with_state_fallback'`; absent
data tags `'with_state_no_data'` and emits `skipped` (not `failed`) so the Errors
dashboard isn't flooded (`:368-373`).

**Interop back-population** (`:387-476`) — when v5 owns the token, BAM keys are
rewritten so a user hopping v5 → non-v5 keeps their session:

```ts
const token = identitySdk.tokenProvider.getProviderTokenWithoutRefresh();
const accessPayload = JSON.stringify({
  context: { token: token.accessToken, tokenType: token.tokenType,
             accessTokenType: token.accessTokenType, expiresIn: token.expiresIn,
             issuedAt: token.createdAt * 1000, region: token.region,
             refreshToken: token.refreshToken ?? '' },
  contextState: { modes: [] },
});
localStorage.setItem(sessionAccessKey, accessPayload);
```

Runs at init and on every `SessionInfoChanged`. Not exercised on ESPN (no v5
tokenProvider). CONFIRMED.

### H3 · Refresh & expiry

Refresh is **owned by the SDKs**, not cgi-web. CONFIRMED:
`packages/identity-auth/AGENTS.md` — "**Don't manage tokens directly** — use
`@solo/sdk-session`"; `apps/commerce/AGENTS.md` — "Use access tokens from the session
SDK (`getAccessToken()`)". The only refresh artifacts in-repo are MSW fixtures
(`sdk-session/src/__fixtures__/refresh-token-{account,device}.json`) and
`buildRefreshTokenHandler()`. `useExchangeAccessTokenForActionGrant` reads the live
token via `sdkSession?.getSessionToken()` rather than caching it.

`authDataAtom` has its **own** 10-minute expiry, independent of the session
(`commerce-base/src/identity/auth-data/atoms.ts:29-74`): `isValid` requires `email`
and `+new Date(expires) > Date.now()`; every write sets
`expires: new Date(Date.now() + 10 * 60 * 1000)`. `actionGrantAtom` is a hand-rolled
sessionStorage atom under key `'action-grant'` (`:5-27`) — deliberately not
`atomWithStorage` because it is a bare string and cannot be initialized server-side.

### H3 · `isAuthenticated` derivation

Three layers, all client-side (CONFIRMED): the BAM primitive
`sdkSession.isAuthorized('bamIdentity')`; the ESPN data interface
(`data-interface-espn/src/identity/identity-data-interface.ts:76`
→ `isLoggedIn: () => sdkSession?.isAuthorized('bamIdentity')`); and the React Query
wrapper `commerce-base/src/identity/logged-in-check/queries/use-is-logged-in.tsx:31-49`:

```ts
const useDataInterface = mystiqueFlags?.['wpnx-web-identity-useLoggedInDataInterface'] === true;
queryFn: async () => {
  if (useDataInterface) return await dataInterface.isLoggedIn();
  if (isSDKEnabled && sdkSession) return sdkSession.isAuthorized('bamIdentity');
  return true;      // ← SDK disabled ⇒ treated as logged in
},
enabled: isMystiqueResolved && isReady,
useErrorBoundary: true,
```

v5 readiness adds a liveness probe (`use-identity-sdk.tsx:22-23`):
`status === 'ready' && !!instance && instance?.telemetry !== undefined`.

### H3 · SSR vs client

**All session reads are client-side.** CONFIRMED — the ESPN identity routes' gSSP does
only layout config, feature-flag route gating (`isRouteEnabled`) and redirect-URL
validation; no cookie/session read. `ESPNDeviceAttributeProvider`'s constructor throws
on the server (`espn-device-attribute-provider.ts:19-23`), and v5 redirect URIs are
built inside `onMount` because "Building them during render/hydration would throw
during SSR" (`sdk-atoms.ts:202-205`). Server-side gating is instead redirect handlers
in gSSP (`redirectUserToLogin`, `redirectUserToRedirectURL`) plus client guards
(`LoginRequired`, `OneIdWrapper`, `AuthChecks`).

### H3 · Session loss mid-checkout

1. **`OneIdWrapper` reconciliation** (§5) — BAM-in / OneID-out ⇒ log BAM out, bounce
   to `/identity/login` with `redirectTargetQuery` preserved.
2. **`LoginRequired`** (`logged-in-check/components/login-required.tsx:52-75`) —
   re-checks `dataInterface.isLoggedIn()` on mount, `authRedirect()`s when false,
   renders `null` until resolved (no flash of protected content).

`useSDKQuery`/`useSDKMutation` hard-fail rather than degrade
(`sdk-hooks.ts:104-119, 170-188`): they `throw new Error('The SDK is disabled. This
query is dependent on an SDKSession…')` and add `{ retry: false, useErrorBoundary: true }`.
`SDKSessionErrorHandler` (`sdk-atoms.ts:63-73`, consumed `sdk-hooks.ts:38-45`) lets an
app substitute its own handler for the default error-boundary throw.

**Open question:** no in-repo code resumes a half-finished checkout after session loss.
Observed behavior is "bounce to login → `/identity/loading` → wherever the redirect
handlers send you", with `redirectURL` the only carrier. INFERRED.

---

## H2 · 5. Cross-domain hand-off `plus.espn.com` → `secure.web.plus.espn.com`

### H3 · Domains (QA Sparrow fixture, `sparrow…espn…:469-504, 201-207`)

```ts
login:                '/identity/login',
login_with_redirect:  'https://stage.web.plus.espn.com/identity/login?redirectUrl=',
account:              'https://stage.web.plus.espn.com/account',
unified_account:      '/commerce/account',
onboarding:           'https://sandbox.espn.com/watch/',
welcome_back:         'https://sandbox.espn.com/watch/',
plan_select:          'https://sandbox.espn.com/watch/offers',
root_domain:          'https://stage.web.plus.espn.com',
urlParamHostAllowlist: ['sandbox.espn.com', 'espnsb.com', 'espnqa.com', 'qa.espn.com', 'espn.com'],
```

`secure.web.plus.espn.com` (prod) appears **only in tests** here
(`playwright/tests/flows/espn-internal-activation.spec.ts:102`,
`src/layout/espn-layout.test.tsx:1060,1088`). The real value is Sparrow-supplied at
runtime; the repo ships only the stage fixture. CONFIRMED.

### H3 · Three independent carriers

**(a) OneID shared responder page — the actual SSO mechanism.** Both ESPN marketing and
ESPN commerce init OneID with the same
`responderPage: 'https://www.espn.com/disneyid/responder/v4/index.html'`
(`commerce-base/src/common/oneid/oneid-script.tsx:78` and
`apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/oneid-script.tsx:31`
— identical comment on both). OneID storage lives behind that `espn.com` iframe, so
`getLoggedInStatus()` is true on any `*.espn.com` host once the guest has
authenticated anywhere. CONFIRMED (config) / INFERRED (that this is the SSO mechanism
— SDK internals are external).

**(b) `espn_aid` cookie — device identity, not auth.**
`packages/cgi/sdk-session/src/espn-device-attribute-provider.ts:14-58`:

```ts
export class ESPNDeviceAttributeProvider extends SDK.Device.BrowserDeviceAttributeProvider {
  constructor() {
    if (!isBrowser()) throw new Error('getDeviceAttributes was invoked on the server, …');
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
}
```

Registered in `apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx:85-95`,
`apps/commerce/espn/src/layout/espn-layout.tsx:88-94`, and
`apps/marketing-unified/espn/src/shared/layout/application-layout/hydrate-base-atoms.tsx:39`.
Domain `espn.com` ⇒ shared across `plus.espn.com` and `secure.web.plus.espn.com`. The
only cgi-web-authored cross-domain cookie for ESPN. CONFIRMED.

**(c) `ag` "app gate" cookie — a signal, not a credential.**
`packages/identity-auth/src/common/libs/set-app-gate-cookie.ts:10-50`: domain is the
last two hostname labels (`.espn.com` on ESPN); value is
`window.btoa(JSON.stringify({ isLoggedIn }))` set only when
`isLoggedIn && isSubscriber`, otherwise removed at **both** domain and host-only
scopes ("`ag` can exist at both the shared-domain and host-only scopes, and a
domain-scoped delete cannot match a host-only cookie"). Read by the legacy Main App
entry router (external repo `github.twdcgrid.net/site-dominguez/solo`). Called only
from the Disney+ passkey page today (`.../passkey.page.tsx:219`). CONFIRMED.

### H3 · `redirectURL` contract — three params, three validators (a real footgun)

| Param | Where | Validation | Semantics |
|---|---|---|---|
| `redirectURL` (gSSP `/identity/loading`) | `commerce-base/src/identity/loading/lib/loading-server-utils.ts:10-42` | must parse as URL **and** `origin === paths.commerce.root_domain` | server 302 to absolute URL |
| `redirectURL` (client) | `commerce-base/src/common/hooks/use-navigation-redirect.tsx:100-131, 249-256` | must **fail** `new URL()` (be relative) **and** prefix-match `INTERNAL_ROUTES` | in-app `router.replace` |
| arbitrary URL params | `commerce-base/src/common/lib/get-external-url-param-redirect-props/get-external-url-param-redirect-props.ts:16-65` | `url.host` ∈ `urlParamHostAllowlist` | external redirect |

Server side (note the ESPN-named variable in shared code):

```ts
const domain = commerceAppConfig.paths.paths.commerce.root_domain;
try {
  const validatedRedirectURL = new URL(redirectURL);
  const isAllowedESPNDomain = domain && validatedRedirectURL.origin === domain;
  if (!isAllowedESPNDomain) {
    delete context.query['redirectURL'];
    throw new Error(`Only URLs from the domain ${domain} are permitted.`);
  }
  return { redirect: { destination: validatedRedirectURL.href, permanent: false } };
} catch {
  return { props: {} };   // invalid / absent → silently no redirect
}
```

Client side, `isValidRedirect` is deliberately inverted (`:100-127`): a successful
`new URL(redirectURL)` is treated as tampering, logged via
`datadogRum.addError('[navigation] Potential Redirect URL tampering …',
{ errorCode: 'IDENTITY_NAVIGATION' })`, and returns `false`; only relative values
prefix-matching `INTERNAL_ROUTES` pass.

### H3 · Hop mechanics

`commerce-base/src/common/lib/auth-redirect.ts:22-72` — `authRedirect`: stores the
globalized pathname as referrer (unless on `/identity/logout`); in local dev
(`origin.includes('local')`) uses `router.replace`; otherwise
`window.location.replace(`${redirectTargetDomain || origin}${route}${queryString}`)`
with the current page's entire `window.location.search` proxied forward.
`commerce-utils/src/redirect-to-external-app.ts:26-50` builds `path + ?query`,
prefixes `/{lang}` when language ≠ `en` and path is relative, then
`window.location.assign|replace`.

`useNavigationRedirect.navigateTo` (`use-navigation-redirect.tsx:229-323`) picks:
valid `redirectURL` → `router.replace`; Sparrow `key` → `redirectFromConfig`;
`inApp` → `router.replace`; else `redirectToExternalApp` with `slug` stripped (`:304-306`).
Post-login destination is an ordered handler chain (`:78-92`):

```ts
[oAuthRedirectHandler, marketingPreferencesRedirectHandler,
 subscriberAgreementRedirectHandler, consumeAndTransferRedirectHandler,
 ednaRedemptionByCodeRedirectHandler, ednaActivationRedirectHandler,
 licensePlateFlowRedirectHandler, addOnsExperimentRedirectHandler,
 referrerRedirectHandler, entitledUserRedirectHandler,
 skipWelcomeBackExperimentHandler, defaultRedirectHandler]
```

One hardcoded ESPN carve-out (`:208-221`) — when `hardcodedQueries` includes
`'orchestrationApi.query.me.reviewAndAccept'` (true for ESPN, `sparrow…espn…:199`),
`me.identity.flows.marketingPreferences.{eligibleForOnboarding,isOnboarded}` are
forced `true` in place, tagged `TODO (EFACCTMGMT-420)`.

ESPN loading-page behavior is pinned by
`commerce-base/src/identity/loading/pages/loading-page.espn.test.tsx`: entitled →
`paths.commerce.onboarding` via `redirectToExternalApp` (query params forwarded);
unentitled → `paths.commerce.welcome_back`; `router.replace` never called ⇒ ESPN
always does a full-page external hop. CONFIRMED.

### H3 · `OneIdWrapper` — the reconciler that makes the hop safe

`commerce-base/src/common/oneid/oneid-wrapper.tsx:28-33`:

```
Check if we're logged in with OneID and Bamtech SDK.
 - If you're logged into both systems, we will render the children for you.
 - If we're logged into OneID, we reauthenticate with the Bamtech SDK.
 - If we're only logged into Bamtech, we log the user out (by going to /identity/logout).
 - If you're not logged into either, we will push the user to the login page (/identity/login).
```

It also handles an **email mismatch** between the BAM account and the OneID guest
(`:130-148`) by logging BAM out and re-exchanging the `id_token`. Query params survive
via `redirectTargetQuery` (`:42-46`, "so they are preserved after the user logs in
(e.g. `redirectURL`)"). Token exchange
(`common/oneid/hooks/use-exchange-id-token-for-access-token.tsx:4-53`) runs
`mutation exchangeIDTokenForAccessToken(...) { account { id } }` then invalidates
`['isLoggedInQuery', true]` and `['oneId.getLoggedInStatus']`.

Applied per-page on ESPN's authenticated routes (`pages/commerce/{success,billing,
billing-history,add-ons,student,activate/callback,activate/success,
restart-subscription/*}`) plus layout-level at
`apps/commerce/espn/src/common/layouts/page-layout.tsx:172`. CONFIRMED.

### H3 · Logout

`commerce-base/src/identity/logout/pages/logout-page.tsx:91-112` — serialized, OneID
first:

```ts
if (isOneIdEnabledApp === false) {
  logoutSDK({ redirectURL, shouldDisableRedirect }).then(maintainData);
} else {
  if (!oneId) return;                       // race guard
  logoutOneID({ oneId }, { onSuccess: () =>
    logoutSDK({ redirectURL, shouldDisableRedirect }).then(maintainData) });
}
```

`maintainAuthFlow` / `maintainActivation` query params carry the email and the
external-activation payload across logout (`:67-89`). ESPN's BAM logout is a local
reset, not a graph call (`data-interface-espn/src/identity/identity-data-interface.ts:90-99`):
"Utilize the `sdkSession.reset()` method as the logout graph call does not exist on
ESPN+", followed by `invalidateQueries(['isLoggedInQuery', true])` and
`cleanBrowserStorage()`.

`data-interface-espn/src/identity/helpers/clean-browser-storage.ts` — an explicit allowlist:

```
localStorage:   auth-data, commerce.isRestartingSubscription, dss-isPortable,
                dss-external-activation, dss-profile-selected-at, externalRedirectObject,
                isLoggedIn, languagePreference, referrer, subscriptionObject
sessionStorage: action-grant, action-grant-exp, correlationId, hasPaymentExpiringPrompted,
                hasSoftPaymentFailPrompted, is-sa-review-complete, lpo
cookie:         ag   (domain = last two hostname labels ⇒ .espn.com)
```

It does **not** clear `__bam_sdk_*` (that's `sdkSession.reset()`), `espn_aid`
(intentional — device id) or `dss_identity_interop_percentile` (intentional — rollout
stability).

---

## H2 · 6. TV provider / TVE / MVPD / device activation

### H3 · NOT in this repo (CONFIRMED)

A strict word-boundary sweep for `\bTVE\b`, `\bMVPD\b`, `tv[ _-]?provider`,
`adobe[ _-]?pass`, `entitlement[ _-]?service` across `packages/`, `apps/`, `docs/`
yields **zero implementation hits**. Only:

1. **BAM SDK playback-config fixtures** (endpoint templates, never called here):
   `sdk-session/src/__fixtures__/espn/macosx-chrome-{qa,preprod}.json:2850,2887` →
   `…/v7/playback-rights/program-boundary/tve`, `…/v7/playback/tve/{scenario}`;
   duplicated at `commerce-base/src/common/context/__fixtures__/espn/…:2861,2898`.
2. **Dictionary copy linking out** — `packages/dictionary/src/data/espn/fallback-prebuild.json:2243`
   `"contextualization_cta_2_unauth_roku_flagship": "Sign in with TV provider"`, and
   `:2248-2254` `contextualization_edtc_provider{1..10}_faq_url` →
   `support.espn.com/…-How-do-I-activate-my-ESPN-Unlimited-plan-through-my-Pay-TV-Provider`.

⇒ **Pay-TV / MVPD authentication lives outside cgi-web** (ESPN Web / Adobe Pass / the
ESPN apps). cgi-web shows a CTA and FAQ links only. CONFIRMED.

### H3 · IS here — two different things both called "activation"

**(a) License plate (off-device / connected-device sign-in).** CONFIRMED.

Routes `/identity/start` (create account) and `/identity/begin` (login), both gated on
`enableIdentityUnifiedLicensePlateFlow`
(`apps/commerce/espn/pages/identity/{start,begin}/index.page.tsx:20-24`).
Implementation: `commerce-base/src/identity/license-plate/{login,create-account,unified-create-account}/pages/`;
UI `identity-auth/src/common/components/license-plate/`; machines
`identity-auth/src/features/license-plate/state-machines/`.

State carrier is a sessionStorage blob under `'lpo'`
(`identity-auth/src/common/libs/license-plate-helpers.ts:63-88`):

```ts
export type LicensePlateOptions = {
  actionGrant?: string;
  activationData?: { providerId?: string; token?: string };
  commerceAttribution?: LicensePlateCommerceAttributionParsedModel;
  deviceProfile: string | undefined;
  offDeviceGrant: string | undefined;
  redemptionFlow?: 'Register' | 'Login' | 'PlanSwitch' | 'IncomingActivation';
  connectedDeviceID?: string;
  connectedDeviceOSDeviceIDs?: [{ type: string; identifier: string }];
  clientIP?: string[]; licensePlateFlow?: string; licensePlateCode?: string;
};
export const LICENSE_PLATE_OPTIONS = 'lpo';
export const LICENSE_PLATE_CODE_LENGTH = 8;
```

Two-step orchestration exchange (`:379-393`): `obs.fetch('code_exchange',
'orchestration.licensePlateExchange', () => fetchDeviceGrant({ licensePlateCode }))`
then `obs.fetch('device_metadata', 'orchestration.getDeviceMetadata', () =>
fetchDeviceDetails({ offDeviceGrant }))`. Device profiles observed (`:143-151`):
`xbox` (`xbox.advertising.id`), `desktop` (`windows.advertising.id`), `vizio`
(`unknown`), `samsung` (`tizen.advertising.id`), plus `TV`→`amazon` when
runtime/brand matches `/amazon/i` (`:293-314`). Glimpse urn:
`urn:dss:event:fed:purchase:license-plate-attribution` (`:170`). Companion keys:
`iflpf` (is-from-license-plate-flow), `rgar` (redeem-grant-after-redirect).

**ESPN has no license-plate Playwright specs** — only Disney+
(`playwright/tests/identity/license-plate-flow-{begin,start}.spec.ts`) and Hulu
(`playwright/tests/flows/license-plate.spec.ts`). CONFIRMED.

**(b) Partner activation / account linking.** CONFIRMED.

ESPN pages: `apps/commerce/espn/pages/commerce/activate/{index,[provider],callback,success,error}.page.tsx`
over `commerce-base/src/transactional/activation/**` (models
`outgoing-activation-page.ts`, `select-provider-page.ts`, `spotify-landing-page.ts`,
`spotify-partner-confirm-page.ts`; dirs `activation-success/`, `spotify-activation/`).
Outbound partner link-account URLs from Sparrow (`sparrow…espn…:517-527`):

```ts
activate: {
  hulu:      'https://signup.huluqa.com/bundles/activate?token=',
  raptor_us: 'https://stage.venu.com/bundle/activate?partner=disney&token=',
  foxone_us: 'https://stage-subs.fox.com/bundle/activate?partner=disney&token=',
  mlb_us:    'https://qa-gcp.mlb.com/commerce/link-account/espn/provider?token=',
  nfl_us:    'https://staging-id.nfl.com/account/sign-in?partnership=disney&token=',
},
```

Inbound target `incoming_activation_success: 'https://sandbox.espn.com/watch/'` (`:481`).
Detected via `queryParams: ['providerId','token']` / referrer `/activate` / localStorage
`dss-external-activation`.

Load-bearing comment on the callback page
(`apps/commerce/espn/pages/commerce/activate/callback.page.tsx:32-37`):

```
{/* ESPN authenticates via OneID (on ESPN Web or the CUP login page); the
Bamtech SDK only becomes authorized after OneIdWrapper exchanges the OneID
id_token for an SDK access token. Without it, users returning from the
external provider login on an Internal Activation hit LoginRequired's
SDK-only check and bounce to /login. */}
<OneIdWrapper isLoginRequired>
  <LoginRequired authRedirectTarget={route({ external: '/login' })}>
```

E2E: `playwright/tests/flows/{espn-internal-activation,incoming-activation}.spec.ts`,
POM `support/pom/commerce/incoming-activation.tsx`.

### H3 · Repo-boundary summary

| Capability | In cgi-web? | Where instead |
|---|---|---|
| ESPN OneID login lightbox | orchestration only | OneID SDK (`registerdisney.go.com`) |
| Pay-TV / MVPD / TVE sign-in | **No** | ESPN Web / Adobe Pass |
| Playback entitlement checks | **No** | `espn.playback.edge.bamgrid.com` |
| License-plate grant exchange | UI + hooks | Orchestration GraphQL (`bamgrid.com`) |
| Partner activation redemption | UI + callbacks | Flex API + partner sites |
| Server-driven commerce screens | consumer only | `growth-life-client-api` (Flex) |
| Main App entry routing / `ag` reader | **No** | `github.twdcgrid.net/site-dominguez/solo` |
| Sparrow prod values (client ids, prod domains) | **No** (QA fixtures only) | Sparrow remote config |

---

## H2 · 7. Restrict-profile-creation, reauth & step-up

### H3 · The reauth handler (Identity v5 only)

`commerce-base/src/common/identity-sdk/use-identity-sdk-reauth-handler.ts` — ten
documented steps:

```
1  emit IDENTITY_V5_SDK_REAUTH_INVOKED (RUM action, reauthFlow: 'idv5')
2  if (sdkStatus !== 'ready' || !sdkInstance) throw 'IdentitySDK not ready'
3  sdkInstance.on('error', errorHandler)
4  const reauthResult = await sdkInstance.launchReauth()        ← iframe
5  if (!reauthResult) throw 'User cancelled reauth'             ← SDK resolves undefined on cancel
6  (SDK session now holds fresh tokens — no manual extraction)
7  exchangeToken() → exchangeAccessTokenForActionGrant
8  setActionGrant(actionGrant)  → sessionStorage 'action-grant'
9  queryClient.invalidateQueries(['orchestrationApi.query.me'])
10 emit IDENTITY_V5_SDK_REAUTH_SUCCESS
   catch → addError('IDENTITY V5 SDK – LAUNCH REAUTH ERROR')
         + IDENTITY_V5_SDK_REAUTH_FELL_BACK_TO_DEFAULT_FLOW → { success: false, error }
```

Return type: `{ success: true; actionGrant: string } | { success: false; error: Error }`.
Exchange (`.../use-exchange-access-token-for-action-grant.tsx:4-37`):
`mutation exchangeAccessTokenForActionGrant($input: …) { … { actionGrant } }` with
`accessToken = await sdkSession?.getSessionToken()` — "Exchange a V5/OP user access
token for an action grant (JWT) that can be used as an authentication method for other
`*WithActionGrant` mutations."

### H3 · Restrict profile creation — the canonical step-up consumer

`commerce-base/src/account/account-details/components/identity/restrict-profile-creation-item.tsx:59-107`:

```ts
const handleReauth = useIdentitySDKReauthHandler();
const isSDKReauthEnabled =
  isSuccess && featureFlags?.['wpnx-web-identity-v5-sdk-launchReauth-enabled'] === true;
...
if (isSDKReauthEnabled) {
  const result = await handleReauth({ reasons: [AuthenticateReasons.UPDATE_PROTECT_PROFILE_CREATION] });
  if (result.success) { await onSuccess(result.actionGrant); return; }
  if (result.error.message === 'User cancelled reauth') return;   // silent
  // SDK error (not ready, etc.) - fall through to show modal fallback
}
setIsModalOpen(true);   // ← password ActionGrantModal fallback
```

Fallback is `<ActionGrantModal kind={ActionGrantModalKind.Password} reasons={[…]} />`
(`:189-199`), driven by `useAuthenticateWithReasons` (email + password → `actionGrant`).

**For ESPN:** `sdkStatusAtom` never leaves `'pending'` (§2) ⇒ reauth fails at step 2
with `'IdentitySDK not ready'` ⇒ ESPN always gets the password modal. CONFIRMED (code)
/ INFERRED (production).

Related ESPN artifacts: `commerce-base/src/account/account-details/__fixtures__/espn/unentitled.ts`
references `restrictProfileCreation`; queries at
`commerce-base/src/identity/profile/queries/use-{is-profile-creation-protected-query,update-profile-creation-protected-mutation}.tsx`;
ESPN Sparrow `hardcodedQueries` includes
`'orchestrationApi.isProfileCreationProtectedQuery'` (`sparrow…espn…:196`). Other
shared reauth touchpoints (Disney+-leaning):
`commerce-base/src/profiles/sk-age-verification/flows/sk-age-verification-machine.ts`,
`.../profiles/common/hooks/use-restrict-verify-page-traffic.ts`,
`commerce-base/src/account/purchase-protection/hooks/use-purchase-protection-otp.ts`.

---

## H2 · 8. Security

### H3 · What `docs/security/AGENTS.md` says that touches identity (CONFIRMED)

- **SCRAAP** is the scanner (dependency CVEs, Semgrep, secret detection, GH-Actions/Docker hardening). Dashboard `https://scraap-reviews-app-prod.prod.hulu.com`. Local: `scraap view`, `scraap scan <dir>` — **never** `scraap scan .` (`:41`).
- **Secrets → Vault**, three injection points (`:22-26`): (1) deployed — Vault via `entrypoint.sh` reading `/shared/config/application-vault.properties`, each app mapped to a Vault service (Commerce Disney+ → `dominguez-commerce`, Marketing Hulu → `hulu-nexus`); (2) local — `scripts/setup configure secrets` writes `.env.local` from Vault JSON exports (`scripts/lib/configure/secrets.sh`); (3) CI — GH Actions secrets as step-level `env:`.
- Committed `.env*` must use a commented-out key or `test-placeholder`; fixtures use `test-placeholder` or structured fake UUIDs (`:28`).
- Two custom ESLint rules in `packages/developer-experience/eslint-config/eslint-config-base/scraap-plugin.js` (`:79-86`): **`no-password-identifiers`** and **`no-secret-identifiers`** — they exist because GitGuardian `ggshield` API access could not be obtained (GCIEX-7385).
- `nosemgrep` is a last resort; line-scoped with a pinned rule id (`:61-75`).

From `apps/commerce/AGENTS.md` (Security Conventions): use `getAccessToken()` from
`@solo/sdk-session`, never hand-roll tokens; keep PII (emails, account ids, card data)
out of logs/analytics/error reporting.

### H3 · How identity config is actually supplied

| Value | Channel |
|---|---|
| OneID `clientId`/`scriptUrl`/`closeUrl` | **Sparrow** → `feature-configuration.general.oneId` |
| Identity v5 `clientId`/`environment`/`rolloutPercentage`/`featureFlows` | **Sparrow** → `…general.identitySDK` |
| BAM `clientId`/`clientApiKey`/`environment` | **Sparrow** → `…sdk` |
| Domains / paths (`root_domain`, `login_with_redirect`, `activate.*`) | **Sparrow** → `paths.paths.commerce` |
| Per-user rollout flags (`wpnx-web-identity-*`) | **Mystique** feature flags |
| `dapiSensitiveSecretsApiKey`, Datadog, mocking mode | `.env.local` / `publicRuntimeConfig` |

⇒ **No identity client id or secret is committed as an env var.** The QA values in the
Sparrow fixture are test data — `clientApiKey: 'test-sdk-key'` (`:119`),
`ravelin.publishableKey: 'test-ravelin-publishable-key'` (`:209`) — the repo follows
its own `test-placeholder` convention. CONFIRMED.

### H3 · Security-relevant details

1. **Redirect validation is inconsistent by design** (§5); both paths log tampering
   with `errorCode: 'IDENTITY_NAVIGATION'`.
2. **`ag` cookie is base64, not signed** — a UX gate for the legacy Main App, not an
   authorization decision. INFERRED.
3. **Action grants live in sessionStorage** (`'action-grant'`) and are cleared by
   `cleanBrowserStorage`.
4. **Blocked-account handling** — `apps/commerce/disneyPlus/pages/identity/login/passkey.page.tsx:248-256`
   documents that MINOR / GLOBAL_BLOCK / ONEIDDISABLED accounts fail the OIDC `/token`
   exchange with `invalid_grant` "Invalid account" while the SDK still resolves
   `ready`, so the page must detect the stuck state explicitly. `LoginWrapper:63-77`
   short-circuits `/identity/login/{missing-info,account-blocked}`.
5. **OAuth error scrubbing** — `passkey.page.tsx:61-98` intercepts `?error=` in gSSP
   and 302s to `/?auth_error=…` before the SDK can auto-process the callback.
6. **Env-override cookies/sessionStorage are honored unconditionally**:
   `dss_sdk_config_env`, `dss_identity_sdk_enabled`, `dss_sdk_debug_mode`,
   `dss_backend_services`. `common-utils.ts:116-128` warns that `preprod` + non-prod
   Sparrow ⇒ CORS/401. **Open question:** are these stripped at the edge in prod?

---

## H2 · 9. Testing — how identity is faked

### H3 · Playwright fake Identity SDK (best file in this area)

`apps/commerce/disneyPlus/playwright/support/utils/mock-identity-sdk.ts` (211 lines).
Disney+-only today; the technique is brand-agnostic. Outcomes (`:18-23`):
`'cancel' | 'error' | 'notReady' | 'sdkErrorEvent' | 'success'`, each mapped to a
documented branch of `useIdentitySDKReauthHandler` (`:3-17`).

Why the real SDK is undrivable (`:92-97`):

```
The real `launchReauth()` is not drivable in E2E: it requires a genuine OIDC
refresh token, a live `getGuest({ forceRefresh: true })` fetch, and a
cross-origin `postMessage` handshake with `login-qa.disney.com` behind an
internal timer. Every existing test that tried to launch the real SDK is
skipped (see `identity-login-flow-gating.spec.ts`).
```

The seam — a `window` getter/setter trap installed before any module evaluates (`:196-209`):

```ts
Object.defineProperty(window, 'IdentityWebSDK', {
  configurable: true,
  get: () => sdkClass,
  set: (incoming: FakeIdentitySDKStatic) => {
    sdkClass = incoming;
    // Mutating the statics on the incoming class object is what makes this
    // work: `window.IdentityWebSDK` and the value `sdk-atoms.ts` imports are
    // the same object reference, so patching here also patches the module
    // import that production actually calls.
    incoming.getPromise = () => Promise.resolve(resolvedInstance);
    incoming.get = () => resolvedInstance;
  },
});
```

Three design notes worth internalizing: `notReady` resolves `null` rather than
throwing, because `initializeIdentitySDK` re-throws and would reject the whole session
bootstrap (`:187-192`); `tokenProvider: null` keeps the BAM session on its normal
already-mocked path (`:179-183`); `getLaunchReauthCallCount(page)` reads
`window.__playwrightLaunchReauthCallCount` so absence-assertions become meaningful —
"asserting this is `0` after the legacy modal appears distinguishes 'the SDK path was
never taken' from 'the SDK was tried and fell back'" (`:71-74`).

Companion `.../setup-identity-sdk-reauth.ts`; consumer
`playwright/tests/account/identity-reauth-restrict-profile.spec.ts`.

### H3 · Dev/E2E fake OneID (the ESPN-relevant one)

Swapped in by `commerce-base/src/common/oneid/oneid.tsx:24-28`:

```ts
const shouldLoadDevScript = getIsServerMockingEnabled() || getIsPlaywrightMockingEnabled();
if (isOneIdEnabledApp) return shouldLoadDevScript ? <DevOneIdSDKScript /> : <OneIdSDKScript />;
```

`commerce-base/src/common/oneid/dev/dev-oneid-script.tsx:11-41` hydrates `oneIdAtom`
directly with a stub whose `init/launchIdentityFlow/launchProfile/logout` resolve,
`getGuest()` returns `{ profile: { email: 'test@disneystreaming.com',
languagePreference: 'en-US', swid: '{test-string}' }, token: { id_token: '123' } }`,
and `getLoggedInStatus()` resolves `true` — i.e. **logged in by default**.

### H3 · MSW session handlers

`packages/cgi/sdk-session/src/tests/handlers.ts` — per-tenant BAM config interception
keyed on `SDK_PARTNER_ID`, intercepting
`https://client-sdk-configs.bamgrid.com/bam-sdk/v7.0/${partnerId}/browser/v35.3/…`:

```ts
export const espnGraphHandlers: GraphQLHandler[] = [
  buildExchangeDeviceGrantHandler({ 'wpnx-web-commerce-ftc-regulation-updates': true }),
  buildRefreshTokenHandler({ 'wpnx-web-commerce-ftc-regulation-updates': true }),
  buildRegisterDeviceHandler({ 'wpnx-web-commerce-ftc-regulation-updates': true }),
  buildActiveSessionHandler(),
];
```

Fixtures: `sdk-session/src/__fixtures__/espn/macosx-chrome-{qa,preprod}.json`,
`active-session.json`, `exchange-device-grant.json`,
`refresh-token-{account,device}.json`, `register-device.json`.

### H3 · Full index of identity test doubles

| Purpose | Path |
|---|---|
| Fake Identity v5 SDK (Playwright) | `apps/commerce/disneyPlus/playwright/support/utils/mock-identity-sdk.ts` |
| Reauth setup helper | `apps/commerce/disneyPlus/playwright/support/utils/setup-identity-sdk-reauth.ts` |
| Fake OneID (dev/Playwright/Cypress) | `packages/cgi/commerce-base/src/common/oneid/dev/dev-oneid-script.tsx` |
| BAM config + graph MSW handlers | `packages/cgi/sdk-session/src/tests/{handlers.ts,handler-builders.ts}` |
| Hydrated query-client wrapper | `packages/cgi/sdk-session/src/tests/hydrated-query-client-wrapper.tsx` |
| ESPN Sparrow fixture | `packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts` |
| Sparrow flag override for Playwright | `packages/cgi/commerce-base/src/test/playwright-utils/sparrow-config-handler.ts` |
| IPSE browser mocks / fixtures | `packages/identity-auth/src/common/services/IPSE/hooks/{__browser-mocks__,__fixtures__}/**` |
| Legacy Cypress mocks still used by Playwright | `packages/identity-auth/cypress/__browser-mocks__/{check-email,login}.ts` |
| ESPN app browser mocks | `apps/commerce/espn/src/test/components/{browser-mocks,espn-browser-mocks}.tsx` |
| ESPN orchestration error handler | `packages/cgi/commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx` |
| ESPN-specific loading-page unit test | `packages/cgi/commerce-base/src/identity/loading/pages/loading-page.espn.test.tsx` |
| ESPN identity E2E | `apps/commerce/espn/playwright/tests/account/{identity-login,identity-signup}.spec.ts` |
| ESPN activation E2E | `apps/commerce/espn/playwright/tests/flows/{espn-internal-activation,incoming-activation}.spec.ts` |
| ESPN identity POMs | `apps/commerce/espn/playwright/support/pom/identity/{enter-email,enter-password,sign-up/create-password}.tsx` |

### H3 · The ESPN E2E trick worth copying

`apps/commerce/espn/playwright/tests/account/identity-login.spec.ts:11-42` — ESPN can
only be E2E-tested on the in-house screens, so the spec flips OneID off at the mock
Sparrow layer:

```ts
/**
 * ESPN's Sparrow config enables OneID (`enableIdentityOneIdAuthentication: true`),
 * which renders the external OneID lightbox instead of the in-house
 * ("EDNA") email/password screens. That external flow cannot be completed
 * in-harness, so we override the flag to `false` to exercise the shared
 * commerce-base/identity-auth login screens end-to-end, mirroring the Disney+
 * `accessAuthLogin1` happy path.
 */
await setupSparrowFeatureFlags({ mockNodeServer, product: 'espn',
  featureFlags: { enableIdentityOneIdAuthentication: false } });
network.use(checkEmailLogin, loginSuccessHandler,
            fetchPasswordRulesAnonymousSuccessResponseHandler);
```

⇒ **ESPN's real production login path (OneID lightbox) has no E2E coverage in this
repo.** CONFIRMED.

---

## H2 · Vocabulary

| Term | Meaning |
|---|---|
| **OneID** | Disney's legacy web identity SDK (v4, `registerdisney.go.com`), lightbox UI. ESPN's active auth. API: `getLoggedInStatus()`, `getGuest()`, `launchIdentityFlow()`, `launchProfile()`, `logout()`, `on('login'\|'init')`. |
| **MyDisney / Identity v5** | `@disney-identity/sdk-web`, OIDC-based successor; offsite redirect to `login.disney.com`. API: `getPromise()`, `launchIdentityFlow()`, `launchReauth()`, `tokenProvider`. Disney+ only here. |
| **EDNA** | The in-house in-app login/signup screens from `@solo/identity-auth` (`EdnaLoginPage`). Legacy naming; cf. `ednaActivationRedirectHandler`. |
| **BAM / Bamtech / Client SDK** | `@js-client-sdk/sdk` — platform session SDK: `SdkSession.createSdkSession`, `isAuthorized('bamIdentity')`, `getSessionToken()`, `orchestrationApi.query()`, `reset()`. |
| **Sparrow** | Disney's remote-config service; surfaces as `commerceAppConfigAtom` with `feature-flags`, `feature-configuration`, `paths`. Variant chosen by `dss_backend_services`. |
| **Mystique** | Feature-flag / experiment service; flags read via `useMystiqueFeatureFlags()`, named `wpnx-web-*`. |
| **IPSE** | The identity GraphQL surface wrapped by `identity-auth/src/common/services/IPSE/hooks/*`. |
| **Orchestration API** | The BAM GraphQL gateway (`…api.edge.bamgrid.com/graph/v1/device/graphql`). |
| **Action grant** | Short-lived JWT proving fresh auth, required by `*WithActionGrant` mutations. From `authenticate` (password/OTP) or `exchangeAccessTokenForActionGrant` (v5). sessionStorage `'action-grant'`. |
| **License plate** | Off-device sign-in: 8-char code from a TV/console entered on web → off-device grant → device details. State in sessionStorage `'lpo'`. |
| **Off-device grant** | Grant returned by `orchestration.licensePlateExchange`, later redeemed to authorize the connected device. |
| **`lpo` / `iflpf` / `rgar`** | sessionStorage keys: license-plate options / is-from-license-plate-flow / redeem-grant-after-redirect. |
| **`ag` cookie** | "App gate" — base64 `{isLoggedIn}`, scoped to the registrable domain, read by the legacy Main App entry router. |
| **`espn_aid`** | ESPN anonymous device id (UUID v4), cookie on `espn.com`, 1-year max-age, injected as `osDeviceIds[].type = 'espnAnonymousSessionId'`. |
| **`swid`** | OneID's stable guest identifier (`{GUID}` form), surfaced on `oneIdAtom.swid`. |
| **Toodles** | Internal debug overlay; `suppressToodles` layout flag, `dss_logout_url` localStorage key. |
| **Glimpse** | Disney's analytics event pipeline; identity emits `urn:dss:event:fed:*` urns and an `activitySessionId` correlation id. |
| **Flex** | `growth-life-client-api` — the server-driven-UI BFF cgi-web commerce consumes (`flex-api-*` fixtures). Separate repo. |
| **Passkey page** | `/identity/login/passkey`, the Identity v5 OIDC `redirectUri` callback. Disney+ only. |
| **Interop rollout** | `dss_identity_interop_percentile` (0–999, localStorage) bucketing that gates v5-vs-legacy per browser. |

---

## H2 · Gotchas

1. **Two `sdkInstanceAtom`s** — `@solo/sdk-session/src/identity-sdk-atom.ts` (live) vs
   `commerce-base/src/common/identity-sdk/identity-sdk-atom.ts:159-161` (legacy, written
   only by the unmounted `<SDKScript />`). Wrong import ⇒ permanently `null`.
2. **ESPN never hydrates `identitySDKConfigAtom`** — any v5 feature is dead code on
   ESPN until an ESPN layout calls `useHydrateIdentitySDKConfig()` *and* Sparrow ships
   a non-null `identitySDK`.
3. **`IdentityWebSDK.getPromise` is singleton-memoized — first call wins**
   (`sdk-atoms.ts:298-300`): initializing too early with a missing language "locks the
   SDK to the en-US fallback." The legacy `sdk-script.tsx` hardcodes `'en-US'`.
4. **`redirectUri` targets `/identity/login/passkey`, which ESPN lacks** — resolves to
   `login/[slug]` → `LoginWrapper`.
5. **`isValidRedirect` (client) rejects anything that parses as a URL** — passing an
   absolute `redirectURL` both fails and fires a Datadog tampering error.
6. **Server-side `redirectURL` needs an exact `origin === root_domain` match**, and
   swallows every failure into `{ props: {} }` — a typo silently means "no redirect".
7. **`authDataAtom` expires in 10 minutes**, independent of the session — long pauses
   in multi-step signup silently drop the prefilled email.
8. **`useSDKQuery`/`useSDKMutation` throw when the SDK is disabled** — gate the hook,
   not the render.
9. **`useIsLoggedIn` returns `true` when the SDK is disabled** (`:48`) — not a security
   boundary in that mode.
10. **OneID's close button is force-suppressed on login** because close and login
    events are indistinguishable — don't "fix" without solving the ambiguity.
11. **`OneIdWrapper` will log a user out** — BAM-in + OneID-out ⇒ `logoutSDK` then
    bounce; likewise on account/OneID **email mismatch**.
12. **ESPN logout is `sdkSession.reset()`, not a graph mutation** — "the logout graph
    call does not exist on ESPN+".
13. **`cleanBrowserStorage` is an explicit allowlist** — new identity storage keys must
    be added or they leak across logout.
14. **The `ag` cookie must be deleted at two scopes** (shared-domain + host-only).
15. **ESPN's hardcoded marketing-onboarding override** mutates the `me` response in
    place (`use-navigation-redirect.tsx:208-221`, `TODO EFACCTMGMT-420`).
16. **`enableIdentityOneIdAuthentication` also forces `/identity/sign-up` →
    `/identity/login`** (`login/lib/server-utils.ts:17-43`, `slug` stripped) — so ESPN
    effectively has no in-app signup route while OneID is on.
17. **`dss_sdk_config_env=preprod` requires `dss_backend_services=prod`** or CORS/401.
18. **`ESPNDeviceAttributeProvider` throws on the server** — always wrap in
    `isBrowser() ? new ESPNDeviceAttributeProvider() : undefined`.
19. **Its `osDeviceIds` type is a string cast** (`'espnAnonymousSessionId' as OsDeviceIdType`,
    with a "needs to be updated in the SDK" comment) — a BAM SDK bump could break it.
20. **ESPN's real login path has no E2E coverage** — the one ESPN login spec turns
    OneID *off*.
21. **ESPN has two application layouts** (`src/layout/espn-layout.tsx` and
    `src/common/layouts/legacy-application-layout.tsx`), each independently hydrating
    the device-attribute provider and rendering `<OneId />`. Change both.
22. **`activitySessionIdAtom` must be hydrated before the session mounts** or bootstrap
    fails hard (`sdk-atoms.ts:569-585`).

---

## H2 · Open questions

1. **Is Identity v5 planned for ESPN?** Plumbing is brand-agnostic and the ESPN Sparrow
   fixture has an `identitySDK: null` slot, but nothing in-repo names a target and no
   ESPN passkey page exists. Ask `@cgi-client/auth-access`.
2. **What is the production ESPN OneID clientId / scriptUrl?** Only stage values are in
   repo (`ESPN-ONESITE.WEB`, `stg.cdn.registerdisney.go.com`).
3. **Is `secure.web.plus.espn.com` the prod `root_domain`?** Strongly implied by the
   stage fixture and test constants; prod Sparrow is out of repo.
4. **How does the OneID responder page persist SSO state?** Third-party cookie?
   Partitioned storage? The comment only explains *why* it is shared — relevant to
   third-party-cookie deprecation.
5. **Are `dss_*` override cookies/sessionStorage stripped at the edge in prod?** Read
   unconditionally here; not determinable from this repo.
6. **Mid-checkout session-loss recovery** — is there a product requirement beyond
   "bounce to login and re-enter via `/identity/loading`"? No resume logic found.
7. **What consumes `feature-configuration.general.convergence.authZ`**
   (`DTCI-CONVERGENCE.APP.B2B-STAGE`, `stg.authorization.go.com`, Disney+ fixture
   `:3169-3175`) and is there an ESPN analogue? Absent from ESPN's fixture.
8. **Where is the ESPN license-plate flow exercised?** Routes and flag exist for ESPN;
   no ESPN test coverage and no ESPN POM.
9. **Is the legacy `sdk-script.tsx` / `createIdentityInstanceAtom` path dead?**
   `@deprecated` and unrendered, but still exported and imported by tests. Safe to
   delete? Ask the owning team.
10. **Which Vault service backs ESPN commerce?** `docs/security/AGENTS.md:24` names
    `dominguez-commerce` and `hulu-nexus` as examples only.
