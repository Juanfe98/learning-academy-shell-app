# ESPN Signup / Purchase / Checkout Flow in `commerce-base`

**Repo:** `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web`
**Scope:** the ESPN (`@solo/commerce-espn`) signup → checkout → success path, as implemented in
`packages/cgi/commerce-base/src` and wired by `apps/commerce/espn`.
**Date:** 2026-08-25
**Labels:** every claim is tagged `CONFIRMED` (read directly in code/tests/config) or
`INFERRED` (reasoned from adjacent code; not directly asserted anywhere).

> Context files read first: `CLAUDE.md`, `packages/cgi/AGENTS.md`, `apps/commerce/AGENTS.md`.
> There is **no** `AGENTS.md` under `packages/cgi/commerce-base/src/signup/` — the signup domain is
> undocumented at the context-file level, which is why this digest exists.

---

## 0. TL;DR — the ESPN flow in one paragraph

ESPN's plan-card page is **not** in this repo. The plan selector for ESPN resolves to an external
ESPN URL (`espn_plan_selector` / `plan_select` → `https://sandbox.espn.com/watch/offers` in the QA
fixture), and `/commerce/plans` is **hard-disabled for ESPN** (`enableCommerceUnifiedPlans: false`).
The ESPN paywall hands off to CUP by deep-linking straight to
`/commerce/billing?offerId=…&campaignId=…` (or `?offers=…`), optionally via
`/identity/login` → `/identity/loading`. `/commerce/billing` is "the ledger": it POSTs
(v2) or GETs (v1) a Flex `subscriptionPreview` screen, renders a server-driven template with a
payment form, and on submit runs `PUT execution/v2/subscription/signup`. On success it logs
`SIGNUP_SUCCESS` and follows the Flex `navigate` action `signup-success` to `/commerce/success`.
An optional `/commerce/add-ons` step (NFL+ Premium) sits between plan selection and billing, gated
by a WeaponX experiment flag plus a Sparrow route flag.

---

## 1. Vocabulary

| Term | Meaning | Evidence |
|---|---|---|
| **CUP / CUP V2** | Commerce Unified Platform — the Next.js commerce apps + `@solo/commerce-base` | `apps/commerce/AGENTS.md` |
| **Flex** | The server-driven-UI BFF (`growth-life-client-api`). Returns *screens* (templates) and executes *executions*. | `packages/cgi/commerce-base/src/common/services/flex/` |
| **Screen** | `dataInterface.getFlexScreen({key, version, queryParams, requestBody})` — a server-rendered template payload | `signup/pages/billing-page.tsx:322-348` |
| **Execution** | `dataInterface.flexExecution({key, version, requestBody})` — a state-changing call (purchase) | `signup/queries/use-flex-billing-execution.tsx:426-441` |
| **Ledger** | The billing page (`/commerce/billing`). "V2 ledger" = post-FTC-2025 template that shows upcoming charges. | `signup/pages/billing-page.tsx:122-141` |
| **Roadblock** | Flex response `templateId === 'subscription-preview-roadblock'` — user can't buy this offer (usually already subscribed) | `signup/pages/billing-page.tsx:64-76` |
| **Sparrow** | Remote config (per-tenant merged JSON). Source of `feature-flags.general.*` and `paths.paths.commerce.*`. | `common/lib/sparrow/load-sparrow-config.ts` |
| **WeaponX / Mystique** | Second flag system (`wpnx-*`), available to Disney+ and ESPN only; Hulu uses Sparrow instead | `common/hooks/use-is-v2-ledger-enabled.tsx:13-19` |
| **License plate** | Device-code activation/attribution (`getLicensePlateOptions()`), carries `deviceProfile`, `commerceAttribution`, `licensePlateFlow` | `signup/queries/use-flex-billing-execution.tsx:213` |
| **`offerContext`** | V2 shape: `[{offerId, campaignId}, …]`. V1 shape: flat `offerId` + `campaignId`. | `signup/lib/get-offer-context.ts`, `common/lib/offers-param.ts` |
| **Unified vs legacy offers param** | `?offers=<encoded pairs>` (unified) vs `?offerId[]=&campaignId[]=` (legacy), switched by `enableOffersParamConversion` | `common/lib/offers-param.ts:174-219` |
| **`stepperV2`** | Flex-sent marker on the billing template that turns the stepper on | `signup/billing/billing-content/billing-content.tsx:468,682` |
| **SUF** | Sign Up Funnel (in-funnel signup). `hasPostSufAddonExperience` = add-ons offered after SUF. | `signup/add-ons/pages/add-ons-page.tsx:56-62` |
| **RPM** | Roku Payment Method — ESPN Roku direct billing | `payments/payment-forms/models/billing-payment.types.ts:110` |
| **Bookworm** | ESPN device-attribution family (`salesdevice`, `espnbkwrmppv` screens) | `common/lib/use-commerce-query-params.ts:128` |

---

## 2. Entry points into the ESPN commerce flow

### 2.1 The ESPN plan-card page lives outside this repo — CONFIRMED

`packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:469-504`

```ts
espn_account_details: '/commerce/account',
espn_plan_selector: 'https://sandbox.espn.com/watch/offers',
espn_plan_switch: '/commerce/change-subscription',
espn_plan_switch_ledger: '/commerce/change-subscription/confirm',
espn_signup_preview: '/commerce/billing',
…
onboarding: 'https://sandbox.espn.com/watch/',
home: 'https://sandbox.espn.com/watch/',
welcome_back: 'https://sandbox.espn.com/watch/',
plan_select: 'https://sandbox.espn.com/watch/offers',
root_domain: 'https://stage.web.plus.espn.com',
```

Consequences (all CONFIRMED):
- Any Flex `navigate` to `plan-selector` / `plan-selector-standalone` / `welcome-back` / `home-page` /
  `onboarding` leaves CUP entirely for ESPN.
- `/commerce/plans` is 404 for ESPN: `enableCommerceUnifiedPlans: false`
  (`…espn-workspace.ts:20`) and the page is flag-gated
  (`apps/commerce/espn/pages/commerce/plans/index.page.tsx:26-29` +
  `packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts:80-84` returns `{ notFound: true }`).
- `/commerce/welcome-back` is likewise disabled (`enableCommerceUnifiedWelcomeBack: false`, line 28).
- `productConfigMap.espn.url = 'https://plus.espn.com'`
  (`common/lib/build-get-server-side-props.ts:165-169`) — production ESPN origin.

### 2.2 Query-param contract — CONFIRMED

The single source of truth is `packages/cgi/commerce-base/src/common/lib/use-commerce-query-params.ts`
(561 lines, one giant destructure + type-narrowing block + a flat return object).

| Group | Params | Notes / line |
|---|---|---|
| **Offer identity** | `offerId`, `campaignId`, `offers`, `offerId[]`, `campaignId[]` | resolved via `resolveOfferQueryParams` (`:185-188`), memoized to keep array identity stable |
| **Merch / cadence** | `pref`, `package`, `duration`, `alternateOffers`, `changeOffers`, `suppressAlternateOffers`, `default` (Plan Select grouping) | `:64-171` |
| **Entitlement / product** | `entitlementId`, `product`, `productType`, `offerType`, `subscriptionId`, `resourceId`, `filters` | `:112-133` |
| **ESPN-specific attribution** | `salesdevice` ("ESPN bookworm device attribution"), `navmethod` ("ESPN navmethod") | `:128-129` |
| **Redirect targets** | `successURL` ("E+ Paywall redirects"), `redirectURL`, `next`, `landingUrl` / `landingURL` | `:92-120` |
| **Activation** | `activateUser`, `provider`, `providerId`, `providerLoginUrl`, `isEspnInternalActivation`, `token`, `maintainActivation`, `maintainAuthFlow` | `:99-106` |
| **Promo / legacy** | `legacyCampaignCode`, `legacyVoucherCode`, `legacySku`, `redemptionCode` | `:107-111`, `:177-181` |
| **Partner** | `referringPartner` (e.g. `wbd_max_suf`), `crossSellingPartner`, `salesPlatform` | `:125-138` |
| **Success page forwarding** | `addOnOfferIds`, `addOnOfferIdsRemoved` (sourced from the Flex execution `navigate` payload) | `:136-137` |
| **APM callbacks** | `authCode`, `apmStatus`, `paymentType` | `:142-145` |
| **Analytics** | `hitsFlowName`, `experience`, `sourceFlow` | `:72,117,86` |
| **Mobile preload** | `destination`, `isInWebView` | `:139-140` |
| **Dev-only / mocking** | `__screen`, `__region`, `__requestID`, `__useFlexMock`, `fastpass` | `:165-172`, gated at `:422-464` |

Validation rules (CONFIRMED):
- Params are keyed **case-sensitively** by the destructure, **except** `redemptionCode`, which is
  found case-insensitively and sanitized:
  ```ts
  // common/lib/use-commerce-query-params.ts:177-181
  // Partners may send URLs with a redemptionCode query param that does not match our casing.
  const redemptionCode = sanitizeRedemptionCode(
    findQueryParam(otherParams, 'redemptionCode')
  );
  ```
- Everything else is only *type-narrowed*: `if (typeof x !== 'string') x = undefined;`. There is **no
  format validation** (no UUID checks on `offerId`/`campaignId`).
- Boolean-ish params require the literal string `'true'`: `suppressAlternateOffers`,
  `isEspnInternalActivation`, `maintainAuthFlow`, `maintainActivation`, `emailVerified`, `reverify`,
  `isInWebView`, `fromUnified`, `__useFlexMock`. (`:292,326,334,338,386,306,402,236,449`)
- SheerID quirk: `pref === '${pref}'` is coerced to `undefined` (`:302-304`).
- Dev params are additionally gated on mocking mode / `isDebugToolingEnabled` (`:422-464`), so they
  can't be abused in production.
- **`?cid=` is NOT in the contract** — INFERRED consequence: a `cid` param falls into `otherParams`
  and is never read by commerce-base, but *is* forwarded verbatim wherever `{...router.query}` is
  spread into the next hop (e.g. `flex-billing-execution.ts:172`, `handle-billing-navigate.ts:109`),
  so it survives the funnel as an opaque marketing tag. See Open Questions.

Redirect-target hardening (CONFIRMED):
- `redirectURL` on `/identity/loading` must **exactly match the tenant root domain**:
  ```ts
  // identity/loading/lib/loading-server-utils.ts:14-30
  const domain = commerceAppConfig.paths.paths.commerce.root_domain;
  …
  const isAllowedESPNDomain = domain && validatedRedirectURL.origin === domain;
  if (!isAllowedESPNDomain) {
    delete context.query['redirectURL'];
    throw new Error(`Only URLs from the domain ${domain} are permitted.`);
  }
  ```
- `successURL` / `redirectURL` used by the **success page** CTAs go through an allowlist:
  ```ts
  // packages/cgi/commerce-utils/src/url-helpers.ts:53-63
  const ALLOWED_REDIRECT_DOMAINS = ['espn.com','disneyplus.com','disney.com','hulu.com','huluqa.com'];
  const ALLOWED_REDIRECT_PROTOCOLS = ['sportscenter:']; // ESPN app deeplink
  ```
  Used at `account/success/components/subscription-success-content/subscription-success-content.tsx:110-114`
  and `transactional/activation/pages/callback-page.tsx:225`.
- In-app `redirectURL` from `useNavigationRedirect` must be a **relative** path on the
  `INTERNAL_ROUTES` allowlist; anything that parses as a URL is rejected and logged as tampering
  (`common/hooks/use-navigation-redirect.tsx:100-131`).

### 2.3 Server-side entry pipeline — CONFIRMED

1. **Middleware** — `apps/commerce/espn/middleware.page.tsx:11-37`: `geoNext(request)` extracts
   `lang`/`locale`, rewrites the path to strip the language segment, and appends `language` / `locale`
   response headers. Matcher `'/((?!api|healthcheck).*)'`.
2. **ESPN `buildGetServerSideProps` wrapper** —
   `apps/commerce/espn/src/common/build-get-server-side-props/build-get-server-side-props.ts:23-67`.
   Only file allowed to import the base version (`eslint-disable no-restricted-imports`). It injects
   `SSRNormalizedCommerceEspnDictionary` (dictionary optimization) and post-processes for footer
   preview (`?previewFooter=true` / `?footerPreview=true` → `getFooterLayout({ tenant: 'espn', … })`).
3. **Base `buildGetServerSideProps`** —
   `packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts:363-595`:
   loads Sparrow config, resolves language from the middleware headers, fetches the dictionary
   (optionally key-filtered), builds the initial Glimpse config, reads region from
   `x-aka-user-geo` / `dss-physical-country` headers (`:137-152`), honors a
   `?dss_sdk_config_env=qa|preprod|prod` cookie override when debug tooling is on (`:314-333`), and
   **runs the page's composition functions with a plain `reduce`** — so a later function's `props`
   silently overwrite an earlier one's, and `notFound` / `redirect` from any of them survives
   (`:455-465`, `:584-587`).

---

## 3. Screen-by-screen walk

### 3.1 Table

| # | Screen | Route | Page file (ESPN wrapper) | Route flag / guard | Data call | Next step |
|---|---|---|---|---|---|---|
| 1 | Login | `/identity/login`, `/identity/login/[slug]` | `apps/commerce/espn/pages/identity/login/index.page.tsx` (19 lines) | none (layout only) | Identity SDK / OneID | `/identity/loading` |
| 2 | Loading (router) | `/identity/loading` | `apps/commerce/espn/pages/identity/loading/index.page.tsx` | `redirectUserToRedirectURL` SSR guard | `useSessionInfo()` + `useMeQuery()` | 12 ordered redirect handlers |
| 3 | Review & Accept | `/identity/review-and-accept` | `apps/commerce/espn/pages/identity/review-and-accept/index.page.tsx` | none (layout only) | marketing prefs | back into flow |
| 4 | Subscriber Agreement | `/identity/subscriber-agreement` | (page not in ESPN app tree) | — | `useLegalDocuments()` | billing |
| 5 | Plan select | **external** `https://plus.espn.com/watch/offers` | n/a | `enableCommerceUnifiedPlans: false` ⇒ `/commerce/plans` = 404 | n/a | `/commerce/add-ons` or `/commerce/billing` |
| 6 | Cadence | `/commerce/cadence` | `apps/commerce/espn/pages/commerce/cadence/index.page.tsx` | `enableSignUpFlowCadenceRoute` (ESPN `true`) | `getFlexScreen({key:'landingCadence',v1,{package,__screen}})` | Flex `navigate` |
| 7 | Add-ons | `/commerce/add-ons` | `apps/commerce/espn/pages/commerce/add-ons/index.page.tsx` | `enableSignUpFlowAddOnsRoute` (ESPN `true`) + `LoginRequired` | `getFlexScreen({key:'addonSelector',v1, body:{pref,offerContext,entitlementId}})` | `/commerce/billing` with multi-offer params |
| 8 | **Billing (ledger)** | `/commerce/billing` | `apps/commerce/espn/pages/commerce/billing/index.page.tsx` | **no route flag**; `OneIdWrapper` + `LoginRequired` + `useBillingRedirects` | v2: `POST screens/v2/subscription/preview` / v1: `GET screens/v1/subscription/preview` | `signupExecution*` → success, or `navigate → review-subscription` |
| 9 | Review subscription | `/commerce/review-subscription` | `apps/commerce/espn/pages/commerce/review-subscription/index.page.tsx` | none | reuses `paymentInformationReview` atom | execution → success |
| 10 | Payment processing (APM return) | `/commerce/payment-processing` | `apps/commerce/espn/pages/commerce/payment-processing/index.page.tsx` | none | APM status polling | success / billing |
| 11 | 3DS challenge return | `/commerce/challenge/success` | `apps/commerce/espn/pages/commerce/challenge/success.page.tsx` (10 lines) | none | — | resume execution |
| 12 | **Success** | `/commerce/success` | `apps/commerce/espn/pages/commerce/success/index.page.tsx` | `getSubscriptionSuccessServerSideProps` (layout only) + `LoginRequired` | `GET screens/v1/subscription/success` | ESPN watch / `successURL` / `sportscenter://` |
| 13 | Redeem by code | `/commerce/redeem` | `apps/commerce/espn/pages/commerce/redeem/index.page.tsx` | `enableCommerceUnifiedRedemption` (ESPN `true`) | eligibility + redeem | billing or switch |
| 14 | Activate (3PP / internal) | `/commerce/activate`, `/activate/[provider]`, `/activate/callback`, `/activate/success` | `apps/commerce/espn/pages/commerce/activate/*` | `enableCommerceUnifiedActivationRoute`, `enableEspnInternalActivation` | `GET …/landing/incoming-activation` | provider login → callback → success |
| 15 | Unlock (upsell interstitial) | `/commerce/unlock` | `apps/commerce/espn/pages/commerce/unlock/index.page.tsx` | `enableCommerceTiara` (**not set in ESPN fixture ⇒ 404**) | — | — |
| 16 | Purchase (PPV) | `/commerce/purchase`\* | `signup/purchase/pages/purchase-page.tsx` | `enableCommerceUnifiedPurchase: false` for ESPN | — | — |

\* There is no `pages/commerce/purchase/*` in the ESPN app tree — CONFIRMED, the page component
exists in commerce-base but ESPN does not mount it.

### 3.2 Per-screen detail

#### `/identity/login` (and `/identity/login/[slug]`)

Thin re-export, **no route flag**, header/footer suppressed:

```tsx
// apps/commerce/espn/pages/identity/login/index.page.tsx:1-19
export { LoginWrapper as default } from '@solo/commerce-base/src/identity/login';
…
visualLayout: { footer: { show: false }, header: { type: 'none' } }
…
export const getServerSideProps = buildGetServerSideProps([getLayoutConfigProp]);
```

`enableIdentityOneIdAuthentication: true` for ESPN (`…espn-workspace.ts:41`) — CONFIRMED, so ESPN
runs OneID-based login (`identity/login/pages/oneid-login-page.tsx`).

Toodles debug overlay treats `/identity/login` as an "onboarding path" **only for ESPN**:

```tsx
// common/context/toodles/toodles.tsx:210-217
? window.location.pathname?.includes(route({ internal: '/identity/sign-up/enter-email' })) ||
  (partnerName === 'espn' &&
    window.location.pathname?.includes(route({ internal: '/identity/login' })))
```

#### `/identity/loading` — the flow router

```tsx
// apps/commerce/espn/pages/identity/loading/index.page.tsx:18-21
export const getServerSideProps = buildGetServerSideProps([
  redirectUserToRedirectURL,   // SSR: honor+validate ?redirectURL, else fall through
  getLayoutConfigProp,
]);
```

The page renders `null` and delegates entirely to a hook:

```tsx
// identity/loading/pages/loading-page.tsx:21-32
export const LoadingPage: CommercePageComponent = () => {
  useStartVital(IDENTITY_TO_PROFILES_LOADING_VITAL, true);
  useNavigationRedirect();
  return null;
};
LoadingPage.isLoginRequired = true;
LoadingPage.onboardingLanguageRequired = true;
```

**Redirect handler priority (CONFIRMED)** — `common/hooks/use-navigation-redirect.tsx:78-92`:

```ts
export const orderedNavigationRedirectHandlers = [
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
];
```

The handlers that matter for ESPN signup (`common/redirect/handlers.ts`):

| Handler | Condition | Destination |
|---|---|---|
| `addOnsExperimentRedirectHandler` (`:32-42`) | `isAddOnsRouteEnabled && queryParams.pref` | `/commerce/add-ons` |
| `referrerRedirectHandler` (`:261-281`) | localStorage referrer set by `authRedirect` | back to the page that bounced you |
| `entitledUserRedirectHandler` (`:152-187`) | `isNewUser \|\| (existing-from-signup && entitled)` | `/commerce/billing` |
| `licensePlateFlowRedirectHandler` (`:193-217`) | `licensePlateOptions.licensePlateFlow` matches a slug | see `dynamic-url-map.ts` |
| `skipWelcomeBackExperimentHandler` (`:48-59`) | experiment on and no `pref` | `/commerce/plans` (⇒ external for ESPN) |
| `defaultRedirectHandler` (`:65-70`) | fallback | `welcome-back` (⇒ external ESPN watch page) |

ESPN behaviour is asserted by a dedicated jest suite:
`identity/loading/pages/loading-page.espn.test.tsx:107-133` — an entitled ESPN user with no referrer
is sent to `redirectToExternalApp({ path: sparrow…commerce.onboarding })`, i.e. **out of CUP to
`espn.com/watch`**, and `router.replace` is *not* called. CONFIRMED.

The `dynamic-url-map.ts` slugs are the "deeplink" contract for `/identity/begin/<slug>` and license
plate flows. ESPN owns three of them:

```ts
// identity/loading/lib/dynamic-url-map.ts:28-72
espn: { path: route({ internal: '/commerce/change-subscription' }), inApp: true,
        // queryParams: { entitlementId: 'espn_plus_sub:base' },   ← disabled, WEB-36774
},
sports: { path: '/commerce/change-subscription/confirm',
          queryParams: { entitlementId: 'disney_plus_sub:espn_premium', sourceFlow: 'upsell' } },
unlimited: { path: '/commerce/change-subscription/confirm',
             queryParams: { entitlementId: 'espn:flagship', sourceFlow: 'upsell' } },
```

Each is independently flag-gated:
`identity/loading/lib/is-dynamic-url-slug-enabled.ts:10-16` maps
`espn → 'wpnx-web-identity-enable-begin-espn-route'`,
`sports → 'wpnx-web-identity-enable-begin-sports-route'`,
`unlimited → 'wpnx-web-identity-enable-begin-unlmt-route'`. CONFIRMED.

#### `/commerce/add-ons`

Wrapper (`apps/commerce/espn/pages/commerce/add-ons/index.page.tsx`):
- Injects the ESPN checkbox icon set and the ESPN global footer (`:26-33`).
- `LoginRequired authRedirectTarget={route({internal:'/identity/sign-up'})}` (`:59-61`) — note ESPN
  bounces unauthenticated users to **sign-up**, not login.
- `PageErrorBoundary owner={Owners.MMA}` (`:72`).
- ESPN-only CSS background images from `secure.espncdn.com/watchespn/images/espnplus/paywalls/*`
  (`:37-41`).
- `getServerSideProps = buildGetServerSideProps([isRouteEnabled({ featureFlagName: 'enableSignUpFlowAddOnsRoute' })])`
  (`:86-90`) — **no page props**, everything is client-fetched.

Base page (`signup/add-ons/pages/add-ons-page.tsx`):

```tsx
// :108-129
const addonsRequestBody = {
  pref,
  offerContext: offerId && campaignId ? [{ offerId, campaignId }] : undefined,
  entitlementId,
};
const { data, isLoading, isSuccess } = useQuery({
  queryKey: ['flexApi.getScreen.addons'],
  queryFn: () => dataInterface.getFlexScreen<AddOnSelectorTemplateContent>({
    key: 'addonSelector', version: 'v1',
    queryParams: { __screen }, requestBody: addonsRequestBody,
  }), … });
```

Note (CONFIRMED gotcha): the `queryKey` is the constant `['flexApi.getScreen.addons']` — it does
**not** include `offerId`/`campaignId`/`pref`, so changing the entry offer within a session can serve
a stale cached add-ons screen.

#### `/commerce/billing` — the ledger

Wrapper (`apps/commerce/espn/pages/commerce/billing/index.page.tsx`):

```tsx
// :87-93
export const getServerSideProps = buildGetServerSideProps<BillingPageProps>([
  (commerceAppConfig) =>
    getBillingPageProps({ commerceAppConfig, shouldIdleRedirect: true }),
]);
```

- `shouldIdleRedirect: true` for ESPN **and** Disney+ (`apps/commerce/disneyPlus/pages/commerce/billing/index.page.tsx:71`)
  but `false` for Hulu (`apps/commerce/hulu/pages/commerce/billing/index.page.tsx:88`). It mounts
  `<IdleTimeRedirect>` (`signup/billing/billing-content/billing-content.tsx:658-663`). CONFIRMED.
- ESPN's billing page has **no** `BillingPage.maintenance` block, unlike Disney+ and Hulu
  (which both set `flag: 'enableSignUpMaintenance'`). CONFIRMED.
- `getBillingPageProps` only returns `layoutConfig`, `sca` (Strong Customer Authentication config from
  Sparrow) and `shouldIdleRedirect` (`signup/pages/billing-page-props.ts:22-39`). No offer data is
  resolved server-side.

**V1 vs V2 ledger selection** (`common/hooks/use-is-v2-ledger-enabled.tsx:23-46`):

```ts
const isWeaponXFlagEnabled = Boolean(weaponXData?.['wpnx-web-commerce-ftc-regulation-updates']);
const isAppConfigFlagEnabled = Boolean(
  commerceAppConfig['feature-flags'].general['enableCommerceUnifiedFtcRegulationUpdates']);
return { isEnabled: isWeaponXFlagEnabled || isAppConfigFlagEnabled || temporaryOverrideForStorybook, isSuccess };
```

The ESPN Sparrow fixture does **not** set `enableCommerceUnifiedFtcRegulationUpdates` (Hulu does, at
`hulu/sparrow-commerce-hulu-workspace.ts:203`). For ESPN it is driven by the WeaponX flag / a
location-derived header, which is why the ESPN Playwright specs have to force it:

```ts
// apps/commerce/espn/playwright/tests/flows/signup.spec.ts:199-208
// The enableCommerceUnifiedFtcRegulationUpdates flag is necessary to add to
// see the flex v2 responses, despite not being in ESPN Sparrow.
// … in a non-mocked scenario, WeaponX adds a header based on the user's location …
```

Screen request shapes (`signup/pages/billing-page.tsx:292-315`):
- **V1**: `{ key: 'subscriptionPreview', version: 'v1', queryParams: flexParams, headers: generateFlexHeaders({salesPlatform}) }` (GET)
- **V2**: `{ key: 'subscriptionPreviewSecondary', version: 'v2', method: 'POST', requestBody: {…flexParams, landingUrl?}, queryParams: {__requestID, __screen} }`

`flexParams` (`:264-290`) carries `offerContext` (V2) *or* flat `offerId`+`campaignId` (V1), plus
`duration`, `entitlementId`, `errorCode`, `alternateOffers`, `changeOffers`, `pref`\*, `legacy*`
codes, gift-card fields (`cardType`, `cardValue`, `currency`, `zipcode`, `redemptionAmount`),
`redemptionCode`, `package`\*, `suppressUpgradeRedirect`, `suppressAlternateOffers`.
\* `pref` and `package` are **omitted** when V2 + `offerContext` are both present (`:271-283`).

`suppressUpgradeRedirect` is read from `sessionStorage` to break an AOU redirect loop:

```tsx
// signup/pages/billing-page.tsx:168-173
// Read the suppress-redirect signal set by the upgrade interstitial.
// Without this, the preview endpoint redirects AOU-eligible users back
// to the upgrade page, creating a redirect loop.
const suppressUpgradeRedirect =
  sessionStorage.getItem(suppressUpgradeRedirectStorageKey) === 'true' || undefined;
```

Three terminal render branches (`:531-613`):
1. `isFlexRedirect(data)` → `handleFlexNavigation(...data.content.action.data)` + loader (`:539-563`).
2. `isRoadblock(data)` → `<BillingRoadblock model successURL>` (`:565-577`).
3. billing template → `<BillingContent>` (with an experiment-only "upgrade offer" twin, GREAT-684).

Guards that show a loader instead of content: `isLoading || isRedirecting` (`:531`),
`currentTemplate === undefined` (`:581`), `shouldRenderUpgradeLoader` (`:595`),
`isPendingRedirect` from `useBillingRedirects` (`:599`).

#### `/commerce/success`

```tsx
// apps/commerce/espn/pages/commerce/success/index.page.tsx:77-79
export const getServerSideProps = buildGetServerSideProps([
  getSubscriptionSuccessServerSideProps,   // layout only: footer hidden, siteHeader
]);
```

Flow type is derived purely from query params:

```ts
// account/success/lib/success-screen-input.ts:56-58
// Non-preload flows
if (entitlementId || successURL) {
  return 'UPSELL_FLOW';
}
```

and the file comments the ESPN case explicitly:

```ts
// account/success/lib/success-screen-input.ts:8-9
/** If there is a successURL query parameter it means the user came from an upsell page and we
    should redirect them to it. Upsell flow type is currently only relevant to an ESPN use case. */
```

"Success" therefore means: (a) `SIGNUP_SUCCESS` logged, (b) session/cohort React-Query caches
invalidated so entitlements refresh, (c) the Flex success screen rendered, (d) CTA sends the user
back to ESPN — either `successURL`, the `sportscenter://` app deeplink, or the config
`incoming_activation_success` / `home` (`https://sandbox.espn.com/watch/`). CONFIRMED.
There is **no license-plate / device-activation step inside the signup path**; device activation is a
separate flow under `/commerce/activate/*`. INFERRED (no signup→activation handoff found).

---

## 4. Stepper / flow-control logic

### 4.1 There is no `use-calculate-stepper` — it is `useCategoryStepper`

CONFIRMED: `common/hooks/use-category-stepper.ts` (114 lines). Static category → step maps, not
dynamic counting.

```ts
// common/hooks/use-category-stepper.ts:23-47
const CATEGORIES_DEFAULT = {
  plans: STEP_1, cadence: STEP_1,
  'subscriber-agreement': STEP_2, billing: STEP_2, 'review-subscription': STEP_2,
};
const CATEGORIES_SUBSCRIBER_AGREEMENT_FIRST = {
  'subscriber-agreement': STEP_1, plans: STEP_1, cadence: STEP_1,
  billing: STEP_2, 'review-subscription': STEP_2,
};
```

Selection: `isInForcedSubscriberAgreementRegion || requiresActiveReview` (region-scoped Sparrow
feature flags, `:84-97`). Total is `undefined` unless `legalDocuments` resolved (`:110-113`), and the
hook explicitly does *not* control visibility:

```ts
// common/hooks/use-category-stepper.ts:73-75
// This hook only determines WHAT step to show, not WHETHER the stepper renders. Visibility is
// controlled separately by Flex (`stepperV2` marker) and the `legalDocuments` auth gate.
```

Rendering: `signup/billing/billing-content/billing-content.tsx:682-684`
`{stepperV2 && <Stepper stepper={stepper} className={stepperClass} />}`.

**ESPN divergence (INFERRED, high confidence):** ESPN is US-only at the platform level
(`payments/payment-forms/components/payments-container/payments-container.tsx:797-798`), so
`requiresForcedSubscriberAgreement` is false and the default map applies. Because
`/commerce/plans` is disabled for ESPN, step 1 of the ESPN funnel is served by
`plus.espn.com/watch/offers` — the stepper the user sees on `/commerce/billing` reads "2 of 2" with
no in-CUP step 1. `/commerce/add-ons` is **absent from both category maps**, so `useCategoryStepper`
returns `{ current: '0', total: undefined }` there (`:106-108`).

### 4.2 `useBillingRedirects` — the billing identity gate

```ts
// signup/lib/use-billing-redirects.ts:10-36
export function useBillingRedirects() {
  const { isLoading: isLoadingDOBRedirect, shouldRedirectToDOB } = useDOBRedirect();
  const { isLoading: isLoadingReviewAndAcceptRedirect, shouldRedirectToReviewAndAccept } =
    useReviewAndAcceptRedirect();
  const { isLoading: isLoadingSubscriberAgreementReviewRedirect,
          shouldRedirectSubscriberAgreementReview } = useSubscriberAgreementReviewRedirect();
  const isPendingRedirect = /* OR of all six */;
  return { isPendingRedirect };
}
```

Evaluated in sequence DOB → Review&Accept → SubscriberAgreement, consumed at
`signup/pages/billing-page.tsx:412` and short-circuited to `<PageLoader/>` at `:599-601`.
The `isPendingRedirect` check sits **after** the roadblock and redirect branches, so a roadblock is
shown even if an identity redirect is pending. CONFIRMED (ordering is explicit in the file).

### 4.3 Other flow-control hooks on billing

| Hook | File | Effect |
|---|---|---|
| `useCYOSRedirect` | `signup/lib/use-cyos-redirect.ts:14-37` | If a CYOS promo offer page is loaded without matching license-plate attribution → `handleFlexNavigation({location:'welcome-back'})` (external for ESPN) |
| `useIsCYOSOfferPage` | `signup/lib/use-is-cyos-offer-page.ts:9-46` | Matches current `offerId`/`campaignId`/`productType` against the `accountSharingCyos` promo URL in Sparrow |
| `usePrefetchPages` | `signup/pages/billing-page.tsx:207-217` | Prefetches `/commerce/review-subscription` |
| `useHydrateSCAConfig` | `:150` | Seeds 3DS config from SSR props |
| `useRavelinInitialization` | `:152-166` | Fraud device-ID; flag `RAVELIN_FEATURE_FLAG` via WeaponX for D+/ESPN, Sparrow `enableRavelin` for Hulu (`common/ravelin/hooks/use-ravelin-initialization.ts:24-29`) |
| `IdleTimeRedirect` | `billing-content.tsx:658-663` | ESPN + D+ only (`shouldIdleRedirect`) |

### 4.4 Cross-tenant navigation

`common/lib/use-handle-flex-navigation-with-tenant.ts:80-106` maps Flex `navigateWithTenant` actions
onto Sparrow path keys per tenant. ESPN entry:

```ts
espn: {
  account: 'espn_account_details',
  planSwitch: 'espn_plan_switch',
  planSwitchLedger: 'espn_plan_switch_ledger',
  signupPreview: 'espn_signup_preview',
  planSelector: 'espn_plan_selector',
},
```

Note ESPN has **no** `upsellInterstitial` key (Disney does) — a `navigateWithTenant` to
`upsell-interstitial` with `tenant: 'espn'` resolves `pathKey` to `undefined`. INFERRED bug risk.
Valid tenants are `['disney','espn','hulu']` (`common/services/flex/models/actions.types.ts:116`);
unknown tenant → `UNRECOGNIZED_FLEX_TENANT` error boundary (`:178-192`).

Same-tenant navigation: `common/lib/use-handle-flex-navigation.ts` — 50+ `location` keys. The ones
that terminate the signup flow:

```ts
// common/lib/use-handle-flex-navigation.ts:389-396
'signup-success': ({ query }) => {
  router.push({ pathname: route({ internal: '/commerce/success' }), query });
},
```

---

## 5. ESPN-specific branch inventory in `commerce-base`

Counts from `grep -ri espn packages/cgi/commerce-base/src --include=*.ts --include=*.tsx`,
excluding `*.test.*`, `__fixtures__`, `__browser-mocks__`, `__server-mocks__`, `/test/`, `*.stories.*`:
**366 matches across 84 files.** CONFIRMED.

### 5.1 Kind legend

- **CONFIG** — brand divergence driven by Sparrow / WeaponX / data-interface (the good pattern)
- **HARDCODED** — a literal `'espn'` / `partnerName === 'espn'` comparison in shared code
- **TYPE** — ESPN-shaped analytics/model type, cast at the call site
- **ASSET** — brand image / icon / theme token
- **DOC** — comment only, no behavioural branch

### 5.2 Inventory

| File:line | Kind | What it does | Why |
|---|---|---|---|
| `common/lib/build-get-server-side-props.ts:55-59` | CONFIG | `MetadataAppName.espn = 'ESPN'` | OG/meta app name |
| `common/lib/build-get-server-side-props.ts:165-169` | CONFIG | `productConfigMap.espn = { appName:'ESPN', partner:'espn', url:'https://plus.espn.com' }` | Glimpse partner + canonical origin |
| `common/lib/build-get-server-side-props.ts:207-228` | ASSET | `metadataByProduct.espn` (share image, `@ESPN` handle, 1296×729 PNG OG) | ESPN OG image is PNG/other dims vs Disney/Hulu JPEG 1200×630 |
| `common/metadata/components/metadata.tsx:33-46` | ASSET | ESPN favicon/manifest/apple-touch-icon set | brand chrome |
| `common/lib/use-commerce-query-params.ts:104` | HARDCODED | `isEspnInternalActivation` param, coerced to `undefined` unless `'true'` (`:326-328`) | ESPN Internal Activation entry signal |
| `common/lib/use-commerce-query-params.ts:128` | HARDCODED | `salesdevice` — "ESPN bookworm device attribution" | ESPN device attribution |
| `common/lib/use-commerce-query-params.ts:129` | HARDCODED | `navmethod` — "ESPN navmethod" | ESPN nav attribution |
| `common/lib/use-commerce-query-params.ts:96-97` | DOC/HARDCODED | `successURL` labelled "E+ Paywall redirects" | ESPN paywall round trip |
| `common/lib/use-handle-flex-navigation-with-tenant.ts:80-87` | CONFIG | `tenantRouteMap.espn` → 5 Sparrow path keys | cross-tenant navigation |
| `common/lib/use-handle-flex-navigation-with-tenant.ts:66-68` | DOC | "ESPN commerce -> ESPN paywall" | intent |
| `common/services/flex/models/actions.types.ts:116` | CONFIG | `tenants = ['disney','espn','hulu']` | tenant allowlist |
| `common/services/flex/models/offer.types.ts:155` | CONFIG | `'ESPN_STANDALONE'` offer type | Flex offer taxonomy |
| `common/services/flex/models/index.ts:5` | TYPE | re-exports `EspnAdobeAnalyticsMetricsDataModel` | ESPN Adobe payload shape |
| `common/hooks/use-is-v2-ledger-enabled.tsx:13-19,30-38` | CONFIG | WeaponX flag for D+/ESPN, Sparrow flag for Hulu | ledger V1/V2 |
| `common/hooks/use-is-flagship-enabled.tsx:3-12` | CONFIG | `wpnx-tab-flagship` — "WeaponX flag for Disney+ and ESPN" | ESPN Flagship (Unlimited) requirements |
| `common/hooks/use-is-espn-legacy-analytics-enabled.tsx:9-21` | HARDCODED | `wpnx-enable-legacy-analytics-espn` — "used on the billing page … for ESPN only" | ESPN keeps legacy `adobeAnalyticsTrack()` instead of CoreAnalytics |
| `common/hooks/use-has-one-trust-consent.ts:19` | HARDCODED | targeting group is `'4'` for D+ but `'C0004'` for ESPN/Hulu | OneTrust group id differs per brand |
| `common/hooks/use-hide-email-and-logout.ts:2,85-90` | HARDCODED | imports `IdentityDataInterface` from `@solo/data-interface-espn`; removes `isLoggedInQuery` + active-profile keys "inside of ESPN, we have specific quirks" | ESPN logout cache quirks |
| `common/hooks/use-native-bridge-code.ts:81-86` | DOC | example entitlement `'espn:flagship'` | native app bridge |
| `common/hooks/use-navigation-redirect.tsx:209-218` | HARDCODED | `TODO (EFACCTMGMT-420): Remove hardcoded logic for marketing onboarding in ESPN tenant` — force-sets `marketingPreferences.eligibleForOnboarding/isOnboarded = true` when `hardcodedQueries` contains `orchestrationApi.query.me.reviewAndAccept` | ESPN's `me` query doesn't return marketing prefs |
| `common/hooks/experiments/use-copy-override-experiment.tsx:82-86` | CONFIG | WeaponX overrides for D+/ESPN, Spearmint for Hulu | experiment copy |
| `common/ravelin/hooks/use-ravelin-initialization.ts:24-29` | CONFIG | mystique flag for "tenants with weapon-x access like Disney+ and ESPN" | fraud device-ID |
| `common/context/toodles/toodles.tsx:59` | CONFIG | app name `'espnplus-commerce'` for Mariner branch API | debug tooling |
| `common/context/toodles/toodles.tsx:210-217` | HARDCODED | `partnerName === 'espn'` ⇒ `/identity/login` counts as an onboarding path | ESPN entry is login, not sign-up/enter-email |
| `common/context/toodles/toodles.tsx:288-290` | HARDCODED | `['hulu','espn']` are on Mariner (`WCS-2865`) | deploy target |
| `common/icons/addon-checkbox-icon.tsx:13-16,102-103,118-120,146-148,179-181,210-215,248-252` | ASSET | `AppTenants.espn` icon variants; ESPN uses `stroke-current`, D+/Hulu `fill-current` | "temporary solution until we can support brand-specific icons in design tokens" (WEB-25328) |
| `common/components/flex/offer/offer-list.tsx:44,309-317` | TYPE | casts Flex `metricsData` to `Partial<EspnAdobeAnalyticsMetricsDataModel>` and tracks `event_name`/`event_detail` | ESPN Adobe schema |
| `common/components/flex/banner/banner.tsx:57,356-364,394-402` | TYPE | same ESPN Adobe cast in two banner action handlers | ESPN Adobe schema |
| `common/components/cart-sticky-footer/cart-footer-action-provider.tsx:7,91-99` | TYPE | same ESPN Adobe cast on the cart CTA | add-ons CTA analytics |
| `common/components/cart-sticky-footer/utils/use-get-cart-footer-items.ts:32-35` | DOC/CONFIG | `shouldOmitBasePlan` — "notably MLB purchase flow, users may already have an existing ESPN Unlimited base plan" | MLB add-on pricing |
| `common/components/site-header/components/site-nav-dropdown.tsx:22-26` | DOC | header dropdown hook "will break if used by Hulu or ESPN" | D+ only |
| `common/components/input/styled-text-input.tsx:30-33` | DOC | reads Stitches CSS vars so D+/Hulu/ESPN theming works | theming |
| `common/styles/themes/espn.ts` (133 refs) | ASSET | full ESPN Stitches theme token set | brand theme |
| `common/styles/themes/index.ts`, `themes/base.ts`, `styles.types.ts`, `stitches.config.ts` | ASSET | theme registration | brand theme |
| `common/dictionary/data/espn/index.ts:1-4` | CONFIG | ESPN fallback + Storybook dictionaries | i18n |
| `common/footer/config/remote-config-links.ts:58-61` | CONFIG | `espnPlusForBusiness` footer link | ESPN footer |
| `common/i18n/hooks/use-set-language-preference.ts:15-16` | HARDCODED | `?locale=` "supports language preference coming from ESPN.com and cannonball driven pages (e.g. PPV)" | ESPN.com handoff |
| `common/i18n/language-redirect/lib/get-app-language-from-language-preference.ts:15-19` | HARDCODED | maps ESPN LangPref → unified AppLanguage; "moved from McDuck (Legacy E+ commerce app)" | legacy ESPN language values |
| `signup/pages/billing-page.tsx` | — | **no ESPN branch** — divergence is entirely via Sparrow + WeaponX | good pattern |
| `signup/billing/billing-merchandising-section/billing-merchandising-section.tsx:22,200-208` | TYPE | ESPN Adobe cast on offer-toggle interaction | ESPN Adobe schema |
| `signup/queries/use-flex-billing-execution.tsx:300-301` | HARDCODED | `standardizeDeviceProfile(rawDeviceProfile)` — "fixes a legacy bug from when the ESPN and Disney apps were not the same app. See GCIEX-8055" | device-profile normalization |
| `signup/queries/use-flex-billing-checkout-execution.tsx:85-86` | HARDCODED | same `standardizeDeviceProfile` fix on the APM checkout path | same |
| `signup/student/hooks/use-student-brand.ts:16-23` | CONFIG | ESPN student branding (`espn-red-logo.svg`, `themeName:'espn'`) | student discount |
| `signup/student/hooks/use-student-discount-forced-login.ts:62` | DOC | "observed on ESPN as infinite spinner" | bug note |
| `signup/student/student-redirect-config.tsx:11` | CONFIG | "D+/ESPN: internal route (`/identity/sign-up`) with `redirectURL`" vs Hulu external | student entry |
| `signup/add-ons/*` | — | **no ESPN branch**; brand icon injected by the app wrapper | good pattern |
| `account/success/components/subscription-success-content/subscription-success-content.tsx:23,90-98` | TYPE | `isEspnMetricsData()` type guard — "Fields eventName and eventDetail are required for this page for ESPN" | ESPN Adobe schema |
| `…/subscription-success-content.tsx:435-449` | TYPE | ESPN branch of the `outgoing-activation` CTA analytics | ESPN Adobe schema |
| `…/subscription-success-content.tsx:146-153` | DOC/HARDCODED | "redirectUrl is used by Hulk upsell on D+ / successUrl is used by ESPN upsells" | ESPN upsell round trip |
| `account/success/components/subscription-success-content/add-on-activation-element.tsx:30,73-90` | TYPE | reuses `isEspnMetricsData` for add-on activation widget | ESPN Adobe schema |
| `account/success/lib/success-screen-input.ts:8-9,56-58` | HARDCODED | `successURL` ⇒ `UPSELL_FLOW`; "currently only relevant to an ESPN use case" | ESPN upsell success screen |
| `account/success/pages/create-subscription-success-page.tsx:317-322` | HARDCODED | `enableCoreAnalyticsForSubscriptionSuccessPage` "will only be true for Hulu … to avoid creating duplicate page impressions on ESPN" | ESPN double-tracking guard |
| `account/change-subscription/lib/get-addon-lock-text.ts:26` | DOC | example "ESPN Unlimited add-on with ESPN Bundle" | eligibility copy |
| `account/change-subscription/lib/use-check-better-offers.ts:10` | DOC | example "Duo Basic + ESPN+ addon = Trio Basic" | better-offer detection |
| `payments/payment-forms/components/payments-container/payments-container.tsx:797-801` | HARDCODED | `partnerName === 'disney' \|\| partnerName === 'espn'` ⇒ card-number field first (GREAT-1076); comment notes ESPN is "US-only at the platform level" | productionalized default |
| `payments/payment-forms/components/change-payment-forms-container/change-payment-forms-container.tsx:88-95` | HARDCODED | `partnerName === 'espn' \|\| isInCardNumberFieldFirstExperiment` | ESPN productionalized, D+ still experiment (GREAT-842) |
| `payments/payment-forms/models/billing-payment.types.ts:110` | CONFIG | `'ROKU_PAY'` — "RPM (Roku Payment Method) — ESPN Roku direct billing" | ESPN Roku |
| `payments/change-payment/hooks/use-change-payment-navigation.ts:78` | HARDCODED | forwards `entitlement` "back to ESPN paywall" | paywall round trip |
| `payments/change-payment/lib/utils.ts:75`, `side-effects/use-flex-change-payment-execution.ts:175` | HARDCODED | "Used only for ESPN MLB flow" | MLB |
| `payments/change-payment/pages/change-payment-page.tsx:115` | HARDCODED | "walletCTA is only defined for ESPN. For Disney it will be omited." | ESPN wallet |
| `payments/wallet/components/{wallet-intro-card,wallet-info,select-cards,add-card,rejection-confirmation}` | TYPE | ESPN Adobe casts throughout the wallet modal | ESPN wallet is ESPN-only |
| `identity/loading/lib/dynamic-url-map.ts:9,28-34,56,71` | CONFIG | `espn`, `sports`, `unlimited` slugs + `espn:flagship` / `disney_plus_sub:espn_premium` entitlements | deeplink slugs |
| `identity/loading/lib/is-dynamic-url-slug-enabled.ts:14` | CONFIG | `espn → 'wpnx-web-identity-enable-begin-espn-route'` | per-slug kill switch |
| `identity/loading/lib/loading-server-utils.ts:24-30` | HARDCODED | variable named `isAllowedESPNDomain` but the check is generic (`origin === root_domain`) | misleading name, tenant-agnostic behaviour |
| `identity/magic-link/pages/magic-link-page.tsx:203-204,410,580` | CONFIG | `wpnx-web-identity-magicLink-espnActivations` gates an ESPN activation branch in magic link | ESPN activations |
| `identity/queries/use-account-onboarding-status.ts:18-19,50` | CONFIG | "For ESPN, the data interface returns a no-op response (activeProfile: null)" ⇒ always `false` | ESPN has no profiles onboarding |
| `transactional/activation/hooks/use-espn-internal-activation-params.ts` (whole file, 63 lines) | CONFIG+HARDCODED | ESPN Internal Activation param facade behind `enableEspnInternalActivation` | see §7.4 |
| `transactional/activation/pages/activation-page.tsx:57-89,186-188,248-282` | HARDCODED | ESPN internal-activation redirect to external provider login instead of logout→CUP login | ESPN 3PP |
| `transactional/activation/pages/transitory-activation-success-page.tsx`, `activation-success-page.tsx`, `callback-page.tsx`, `utils/generate-activation-url.ts`, `utils/activation-funnel/*` | HARDCODED | forward `isEspnInternalActivation` / `successURL` / `providerId` through the provider round trip | ESPN 3PP |
| `transactional/redemption/components/redemption-by-code-content.tsx:85,90` | DOC | WEB-18752 / WEB-20234 ESPN redemption Adobe + refactor TODOs | ESPN redemption |
| `retention/*` (`cancel-subscription-templates.tsx`, `cancel-success-template.tsx`, `survey.tsx`, `restart-subscription-modal.tsx`, `retention-modal.tsx`) | TYPE | ESPN Adobe casts | ESPN cancel analytics |
| `profiles/common/components/avatar/avatar.tsx`, `atoms/avatar-fallback-style` | ASSET | ESPN letter-avatar fallback | ESPN has no avatars |
| `profiles/queries/use-cancel-extra-member-invite.ts:*` | DOC | ESPN note | — |

### 5.3 Reading of the inventory

- The **signup/checkout core is genuinely brand-agnostic**: `signup/pages/billing-page.tsx`,
  `signup/add-ons/pages/add-ons-page.tsx`, `signup/cadence/pages/cadence-page.tsx`,
  `signup/queries/use-flex-billing-execution.tsx` and the billing action handlers contain **zero**
  `if (espn)` branches. Divergence arrives through (a) Sparrow flags/paths, (b) WeaponX flags,
  (c) the ESPN page wrapper in `apps/commerce/espn/pages/**`, (d) `@solo/data-interface-espn`.
  CONFIRMED.
- The real hardcoded ESPN branches cluster in four places: **payment form field order**
  (`partnerName === 'espn'`), **Adobe analytics payload shape** (`EspnAdobeAnalyticsMetricsDataModel`
  / `isEspnMetricsData`), **activation** (`isEspnInternalActivation`), and **`/identity/loading`
  marketing-prefs hack** (EFACCTMGMT-420).
- The Adobe-type casts are the single largest category (≈15 sites). They are unguarded `as` casts on
  Flex data at Disney+/Hulu call sites too — a latent correctness issue, not an ESPN-only one.

---

## 6. Purchase execution

### 6.1 Submit path

```
Flex CTA (Agree & Subscribe)
  → FlexActionsProvider onAction  (billing-content.tsx:664)
  → handleLedgerSubmitAction      (signup/billing/billing-action-handlers/handle-ledger-submission.ts:154)
      wrapWithRecaptchaExecution  (:195-206, actionName 'signupPayment')
      react-hook-form handleSubmit (:219)
      RUM 'FLEX_INTERACTION'       (:235-242)
      switch (action.actionKey)    (:259)
         'navigate'                        → handleBillingPageSubmitNavigateAction  → /commerce/review-subscription
         'signupExecution' | 'signupExecutionV2'
           | 'signupExecutionPaypal' | 'signupExecutionPaypalV2'
           | 'signupExecutionMercadoPago' → [templatized? executePaymentSteps : handleBillingPageSignupExecution]
         'signupExecutionApm'              → [templatized? executePaymentSteps : handleBillingPageSignupExecutionApm]
         'validate3dsExecution'            → handleBillingPageValidate3DSExecution
         'validationFailure'               → handleBillingPage3DSValidationFailure
         default                           → UNRECOGNIZED_FLEX_ACTION_KEY error banner
```

The ESPN Playwright happy path exercises the `signupExecutionV2` branch end-to-end
(`apps/commerce/espn/playwright/tests/flows/signup.spec.ts:239-252`). CONFIRMED.

### 6.2 `handleBillingPageSignupExecution`

```ts
// signup/billing/billing-action-handlers/handle-billing-signup-execution.ts:52-72
analytics.track('user_interaction', {
  ...action.adobeData, linkType: 'o',
  actionSpecifier: 'signup', elementSpecifier: 'agree_and_subscribe_cta',
  interactionType: 'click', targetDisplayName: 'Agree & Subscribe',
  event_name: 'billing_submit',
});
// The ref preparedPaymentMethodId gets populated during the '3DSValidateExecutionStep' …
// If 3DS2 credit card transaction fails and the user switches to another payment method,
// preparedPaymentMethodId may still be populated, but we DO NOT want to use it.
const mappedPreparedPaymentMethodId =
  action.actionKey === 'signupExecution' ? preparedPaymentMethodId.current : undefined;
```

### 6.3 `useFlexBillingExecution` — the actual purchase

`signup/queries/use-flex-billing-execution.tsx:153-724`. React Query mutation,
`mutationKey: 'subscriptionSignup'`.

Request:

```ts
// :426-431
const options: FlexExecutionOptions = {
  key: 'subscriptionSignup', version: 'v2',
  requestBody, headers: generateFlexHeaders({ salesPlatform }),
};
```

Wire endpoint (from the ESPN MSW handler): `PUT https://qa-espn.api.edge.bamgrid.com/execution/v2/subscription/signup`
(`apps/commerce/espn/playwright/tests/flows/signup.spec.ts:77-78`). CONFIRMED.

Request body (`:358-424`):

| Field | Source |
|---|---|
| `offers` | `getOfferData(payload)` → `offers \|\| [{campaignId, offerId}]` — **Flex's action payload, not the URL** |
| `paymentMethodId` + `paymentMethod{type,paymentMethodId,isTemplatized}` | `usePreparePaymentMethod()` (Braintree/PMID tokenization) |
| `redemptionCode` | from the Flex payload |
| `salesPlatform` | `standardizeDeviceProfile(licensePlate.deviceProfile)` (GCIEX-8055 ESPN/Disney fix) |
| `commerceContext` | `getCommerceAttribution({ commerceAttributionFromLicensePlate })` |
| `salesMetadata` | only when `enableMarketingMetadataParam` (ACP-3990) |
| `scaId` | from `action.data.scaId` (3DS) |
| `recaptchaToken` | reCAPTCHA v3 |
| `ravelinDeviceId` | Ravelin fraud device |
| `hasPostSufAddonExperience` | from the Flex payload |
| `zipcode` | Live-TV zip from the payment form |
| `installmentOptions` | GREAT-572 BR experiment |
| `userConsents.mlb` + `swid` | **ESPN MLB consent checkbox**, SWID from OneID (`:375-382`) |
| `giftCardRedemptionInfo` | when a gift card balance is applied (`:415-424`) |
| `internalRedirects` | iDEAL / Klarna / MercadoPago APM return URLs (`:384-412`) |

Guard: `if (!offerId || !campaignId) throw new Error('Signup execution action data payload contains no offers')` (`:284-290`).

### 6.4 Success → `/commerce/success`

`signup/side-effects/flex-billing-execution.ts:54-226`.

```ts
// :116-142
datadogRum.addAction('SIGNUP_SUCCESS', {
  owner: Owners.TAP, actionCode: 'SIGNUP_SUCCESS', actionKey: action.actionKey,
  actionData: { ...action.data, salesPlatform, offerId, executionSource,
                sessionStorageDeviceProfile: lpo.deviceProfile, isMagicLinkFlow },
  commerceAttribution,
});
// We log in addition to adding the RUM action because logs are not sampled.
datadogLogs.logger.info('SIGNUP_SUCCESS', { … });
```

Then:
1. `setShouldFirePurchaseSuccessAnalytics(true)` — arms purchase analytics for the *next* page (`:147`).
2. Invalidate `['flexApi.execute.subscriberCohort', ['getSessionInfo', true]]` (refetchActive false) —
   so session/entitlements refresh (`:148-151`).
3. Invalidate `['dataInterface.flexExecution.cohorts']` (refetchActive true) — the comment names the
   redeem→change-subscription ACP case (`:153-159`).
4. If `isTemplatizedSequencingEnabled` → **return early**, success action deferred
   (`TODO WEB-36813`, `:161-165`).
5. `switch (action.actionKey)`:
   - `'navigate'` → merge `router.query` + Flex-authoritative offer params + `addOnOfferIds`,
     `experience`, `salesPlatform`, `decodeURIComponent(successURL)` → `handleFlexNavigation({ location: 'signup-success' | 'plan-switch' })` (`:167-200`).
   - `'paymentRedirectAction'` → `window.location.assign(action.data.payload.url)` (APM 3rd-party) (`:205-215`).
   - `'apmCheckoutExecution'` → no-op here (`:220-224`).

Post-success mutation `onSuccess` (`use-flex-billing-execution.tsx:678-715`):
- fires `analytics.track('subscription_end', …)` only when `metricsData.outcome === 'new_subscription'`
  and RUM `HITS_SUBSCRIPTION_END_NEW_SUBSCRIPTION`.
- `pollForActivatedSubscription(homeServiceUrl)` + `refreshCookies(refreshCookiesUrl)` only when
  `enablePollingForUserSubscriptions` **and** both URLs exist. The ESPN Sparrow fixture defines
  **neither `home_service` nor `refresh_cookies`** (`…espn-workspace.ts:455-505`), so this block is a
  no-op for ESPN. CONFIRMED (the comment says "This only happens on Hulu").

Analytics also fires `analytics.track('signup_complete', …)` for `signupExecutionV2` /
`signupExecutionPaypalV2` only (`:603-613`).

### 6.5 3DS / regulatory

- `validate3dsExecution` → `preparePaymentMethod()` then `onSCAValidate3DSExecution({ cardBin | cardNumber, paymentMethodId })`
  (`signup/billing/billing-action-handlers/handle-billing-3ds-validation.ts:19-54`).
- `validationFailure` → `onSCAValidationFailure({ status, reason })` → `onBillingExecutionError` (`:60-84`).
- SCA config comes from SSR (`buildSCAFeatureProps(commerceAppConfig)`), hydrated by `useHydrateSCAConfig`.
- Worldpay Cardinal endpoints for ESPN: `worldpay_ddc`, `worldpay_challenge`, `worldpay_origin`
  (`…espn-workspace.ts:491-495`) — plus the `/commerce/challenge/success` page.
- FTC 2025 "regulatory" changes = the V2 ledger (upcoming charges) —
  flag `wpnx-web-commerce-ftc-regulation-updates` / `enableCommerceUnifiedFtcRegulationUpdates`.
- reCAPTCHA v3 is loaded on billing only if Sparrow supplies a site key
  (`signup/pages/billing-page.tsx:606-608`).

---

## 7. Add-ons

### 7.1 What ESPN add-ons exist

CONFIRMED from fixtures + tests:

| Add-on / product | Evidence |
|---|---|
| **NFL+ Premium** — the add-on in the ESPN add-ons fixture; dictionary keys `uo_*_package_nfl_premium`, offerId `386dc959-54cf-4236-955d-9cc52240fa3c` | `signup/__fixtures__/espn/add-ons-page.ts:61-300`; `apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts:25-28` |
| **MLB** (with a consent checkbox → `userConsents.mlb` + `swid`) | `signup/__fixtures__/espn/billing-page-espn-with-mlb.json`, `billing-page-with-mlb-opt-in.json`; `use-flex-billing-execution.tsx:375-382` |
| **PPV** (bookworm/PPV screens `espnppv`, `espnmlb`, `espnbkwrmppv`, `espnbkwrmespnppv`) | `signup/__fixtures__/espn/billing-page-standalone-ppv.json`, `billing-page-bundle-ppv.json`; `account/success/__browser-mocks__/screen.ts:13-16` |
| **ESPN Unlimited / Flagship / Select** (base tiers, reached via `espn:flagship` entitlement or the `unlimited` slug) | `identity/loading/lib/dynamic-url-map.ts:71`; `signup/__fixtures__/espn/billing-page-flagship-standalone.json`; `signup.spec.ts:251` asserts "Welcome to ESPN Select" |
| **Disney+ ESPN premium tile** (`disney_plus_sub:espn_premium`) — cross-tenant, on the D+ side | `identity/loading/lib/dynamic-url-map.ts:56` |

### 7.2 How the page is populated

1. `POST addonSelector` v1 with `{ pref, offerContext, entitlementId }` (`add-ons-page.tsx:108-129`).
2. `filterModalListItems(...)` flattens `content.addOns` into per-offer rows and localizes them
   (`:91-106`).
3. `content.cartFooter?.initialState` is the **preselected base plan** (`:183`).
4. `processOffersForAddOnsPage({ addOns, cartInitialState })` → `{ currentOffers, offerStateForEligibility }`
   (`signup/add-ons/components/lib/process-offers-for-add-ons-page.ts`), written to the *shared*
   change-subscription atoms `initialOffersAtom` / `offerStateForEligibilityAtom` (`:198-205`).
5. `updateAddonStateForEligibility({ writableOfferState: draft, shouldSkipBaseSelectionCheck: true })`
   locks conflicting add-ons — "Add-ons may still conflict with each other even if they don't
   conflict with the basePlan" (`:206-220`).
6. `setIsOffersInitialized(true)` gates rendering; until then a `PageLoader` shows (`:231-238`).
7. Skip vs Review CTA: `useShouldRenderSkipCTA()` returns `false` as soon as one add-on is
   `state === 'selected' && isCurrentOffer === false`
   (`signup/add-ons/components/lib/use-should-render-skip-cta.ts:11-23`); actual visibility also
   requires Flex to send `skipButton`.

Note (CONFIRMED architectural coupling): the add-ons **signup** page reuses the
**change-subscription v2** atoms, lib and models
(`../../../account/change-subscription/…` imports at `add-ons-page.tsx:6-19`). Owned by MMA
(`Owners.MMA` error boundary) but crosses into MMA's change-subscription code.

### 7.3 How selections reach the purchase

- The cart CTA is handled by `common/components/cart-sticky-footer/cart-footer-action-provider.tsx`,
  which navigates to `/commerce/billing` carrying **all** selected offers.
- Format is switched by `enableOffersParamConversion` (ESPN Sparrow: `true`,
  `…espn-workspace.ts:47`):
  - OFF → legacy `?offerId=<base>&offerId=<addon>&campaignId=…&campaignId=…`
  - ON → unified `?offers=<encoded pairs>`
  Both are asserted in `apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts:105-165`.
- On billing, `resolveOfferQueryParams` gives precedence to `offers=` over `offerId[]` over
  `offerId` (`common/lib/offers-param.ts:174-219`), producing `multipleOfferAndCampaignIds`, which
  `getOfferContext` turns into the V2 `offerContext` array (`signup/pages/billing-page.tsx:258-265`).
- At execution time the **Flex action payload wins**: `getOfferData(payload)` supplies `offers`, and
  the URL is only a fallback (`use-flex-billing-execution.tsx:279-290, 358-360`). Skip path asserts
  only the base offer reaches billing (`addon-multi-offer.spec.ts:188-200`).
- Add-on ids come *back* on the success hop as `addOnOfferIds` / `addOnOfferIdsRemoved`
  (`flex-billing-execution.ts:169,192`; documented at `use-commerce-query-params.ts:136-137`).

---

## 8. Error & edge paths

| Path | Mechanism | Evidence |
|---|---|---|
| **Already subscribed** | Flex returns `templateId: 'subscription-preview-roadblock'` → `<BillingRoadblock>` with a "See eligible plans" CTA. Adobe pageName `ESPN Plus D2C - Roadblock`. | `signup/pages/billing-page.tsx:64-76,565-577`; `apps/commerce/espn/playwright/tests/flows/signup.spec.ts:255-316` |
| **Free-trial ineligible / offer expired** | Flex 200 + `errorData.action.data.body.errorCode === 'FLX-0226'` + a replacement `offerContext`. Logs `ELIGIBILITY_OFFER_SWITCH` (unsampled warn, GCIEX-8438 MLB double-billing probe) and re-navigates to billing with `errorCode` + new offers. | `use-flex-billing-execution.tsx:135-148,456-498` |
| **Payment decline / invalid card** | Flex 200 + `errorData.errorBoundary` → `submissionErrorDataAtom` = `INVALID_CARD` + the Flex error copy, then `throw`. `onBillingExecutionError` scrolls to top, re-enables the CTA, RUM + unsampled log. | `use-flex-billing-execution.tsx:446-509`; `signup/side-effects/flex-billing-execution.ts:235-249` |
| **Generic order submission failure** | `ORDER_SUBMISSION_ERROR` in the atom + `<ErrorBanner dictionaryKey="formerror_notifyuser_payment">` | `use-flex-billing-execution.tsx:511-519`; `billing-content.tsx:665-672` |
| **Form validation failure** | react-hook-form error handler: `setIsActionable(true)`, `setSubmitError(true)`, hides the PayPal processing overlay | `handle-ledger-submission.ts:534-543` |
| **No payment method selected** | `setHasBillingAccordionError(true)` and abort before any network call | `handle-ledger-submission.ts:249-257` |
| **Unrecognized Flex action / location / tenant** | `UNRECOGNIZED_FLEX_ACTION_KEY`, `UNRECOGNIZED_FLEX_NAVIGATE_LOCATION`, `UNRECOGNIZED_FLEX_TENANT`, `UNRECOGNIZED_FLEX_TENANT_NAVIGATE_LOCATION` → RUM error + error boundary | `handle-ledger-submission.ts:510-529`; `handle-billing-navigate.ts:198-209`; `use-handle-flex-navigation-with-tenant.ts:178-211` |
| **Screen load failure** | `BILLING - SUBSCRIPTION_PREVIEW_LOAD` RUM error, then rethrow into `useErrorBoundary: true` | `signup/pages/billing-page.tsx:336-347,382-386` |
| **Session loss mid-flow** | `LoginRequired` awaits `dataInterface.isLoggedIn()`; `false` → `authRedirect()` stores the current globalized pathname as the **referrer** in localStorage and redirects to `/identity/sign-up` (ESPN wrappers). After login, `referrerRedirectHandler` returns the user to that exact page with query params proxied. | `identity/logged-in-check/components/login-required.tsx:52-75`; `common/lib/auth-redirect.ts:37-70`; `common/redirect/handlers.ts:261-281` |
| **Missing DOB / marketing prefs / SA review** | `useBillingRedirects` → `PageLoader` while the identity redirect resolves | `signup/lib/use-billing-redirects.ts` |
| **Idle on billing** | `<IdleTimeRedirect timeout={billingPageIdleTimeout}>` — mounted for ESPN and D+, not Hulu | `billing-content.tsx:658-663` |
| **Back button** | `/identity/loading` redirects use `router.replace` (no history entry) so back never returns to the loader (`use-navigation-redirect.tsx:279-292`). `redirectFromConfig` is called with `saveHistory: false` for loading redirects and `saveHistory: true` only for `plan-selector-standalone` (`use-handle-flex-navigation-with-tenant.ts:137-145`). ESPN back-out from billing goes to `plus.espn.com`, not an in-CUP plans page. | as cited |
| **AOU redirect loop** | `suppressUpgradeRedirect` sessionStorage flag — see §3.2 snippet | `signup/pages/billing-page.tsx:168-173` |
| **Missing `orderId` on success** | `MISSING_ORDER_ID_FLEX_BILLING_EXECUTION` RUM error, suppressed for APM action keys | `flex-billing-execution.ts:97-112` |
| **CYOS offer without attribution** | `CYOS_OFFER_NO_LICENSE_PLATE_REDIRECT` → `welcome-back` (external for ESPN) | `signup/lib/use-cyos-redirect.ts:19-37` |

### 7.4 ESPN Internal Activation (a distinct entry, adjacent to signup)

Whole-file facade, worth quoting because it is the clearest ESPN-specific contract in the repo:

```ts
// transactional/activation/hooks/use-espn-internal-activation-params.ts:37-62
export function useEspnInternalActivationParams() {
  const { isEspnInternalActivation, providerId, providerLoginUrl, successURL } =
    useCommerceQueryParams();
  const isEnabled = Boolean(
    commerceAppConfig['feature-flags'].general.enableEspnInternalActivation);
  if (!isEnabled) {
    return { isEspnInternalActivation: undefined, isEspnInternalActivationFlow: false,
             providerLoginUrl: undefined, successURL: undefined };
  }
  return { isEspnInternalActivation,
    isEspnInternalActivationFlow: Boolean(isEspnInternalActivation && providerId && successURL),
    providerLoginUrl, successURL };
}
```

Its docblock (`:6-35`) states the design rules: the flow is *entirely* query-param driven and so
user-controlled; all consumers must read through this hook so it can be killed via Sparrow without a
deploy; `providerLoginUrl` deliberately excluded from the flow signal because it only exists on the
landing URL; `entitlementId` deliberately **not** gated because Disney+ internal activations and
license-plate redemption also use it. CONFIRMED.

Entry URL shape (from the spec):
`/commerce/activate?providerId=<id>&providerLoginUrl=<enc>&successURL=<enc>&entitlementId=<enc>&isEspnInternalActivation=true`
(`apps/commerce/espn/playwright/tests/flows/espn-internal-activation.spec.ts:208-215`).
Callback: the provider appends `providerId` + `token` and returns to `/commerce/activate/callback`
(`:257-284`), which forwards `providerId`, `entitlementId`, `successURL`,
`isEspnInternalActivation=true` to `/commerce/activate/success`. Without `providerLoginUrl` the CTA
falls back to `/identity/login` (`:128-134`).

---

## 9. Tests that document the flow (best ground truth)

### 9.1 ESPN Playwright specs — `apps/commerce/espn/playwright/`

| Spec | Covers | Notable |
|---|---|---|
| `tests/flows/signup.spec.ts` (317 ln) | **The** ESPN happy path (`TAPSignup1`) and the roadblock case (`TAPSignup2`) | Defines the ESPN Flex base URL `https://qa-espn.api.edge.bamgrid.com` (`:32`); handlers for `screens/v2/subscription/preview`, `execution/v2/subscription/signup`, `screens/v1/subscription/success`; forces `enableCommerceUnifiedFtcRegulationUpdates` (`:203-208`); asserts Adobe `ESPN Plus D2C - Paywall` (`:234-237`) and `Welcome to ESPN Select` on `/commerce/success` (`:248-251`) |
| `tests/flows/addon-multi-offer.spec.ts` (236 ln) | Add-ons → billing multi-offer propagation, legacy vs unified format, skip path, single-offer regression | Real ESPN offer ids (`:25-28`); `validateMultiOfferUrl` helper |
| `tests/signup/plans-multi-offer.spec.ts` (194 ln) | Plan with bundled add-ons → billing (`TAPPlansMultiOffer*`) | |
| `tests/signup/billing.spec.ts` (56 ln) | **`describe.skip`** — flaky, GCIEX-984. Only surviving assertions are ESPN copy checks. | Effectively no coverage here |
| `tests/flows/billing-ledger-version.spec.ts` (120 ln) | V1 vs V2 ledger selection | |
| `tests/flows/espn-internal-activation.spec.ts` (452 ln) | ESPN Internal Activation, all 4 hops + error cases | `MMAInternalActivation1` |
| `tests/flows/incoming-activation.spec.ts` (497 ln) | 3PP incoming activation (`MMAActivation2/5`) | |
| `tests/flows/redemption-by-code.spec.ts` | Redemption without/with payment, PayPal, roadblock (`TAPRedemptionByCode1-4`) | |
| `tests/flows/multi-offer-plan-switch.spec.ts`, `change-subscription-confirm.spec.ts`, `change-subscription-explicit-consent-modal.spec.ts` | Plan switch to ESPN Unlimited + NFL+ | `TAPPlanSwitchV2*` |
| `tests/account/identity-signup.spec.ts`, `identity-login.spec.ts` | Login/signup entry | `accessAuthSignup*`, `accessAuthLogin*` |
| `support/happy-paths.ts` (399 ln) | **The canonical catalogue of ESPN happy paths with owning team** — read this first | e.g. `TAPSignup1: 'Users in the US can successfully purchase an ESPN+ subscription with a credit card'` (`:167-172`) |
| `support/pom/commerce/billing.tsx` (83 ln) | Billing POM: card name/number/CVV/expiry/zip + city option + terms checkbox + `data-testid="cta-button"` | `fillPaymentForm()` defaults `4111 1111 1111 1111`, zip `94601` |
| `support/pom/commerce/add-ons.tsx` (77 ln) | Add-ons POM: `addon-checkbox-*` testids, "Review changes" / "Skip" CTAs, `gotoWithOffer()` | |
| `support/pom/base/base.tsx` | `BasePage` with `goto(transformPath)` and `verifyOnPageRoute()` | |

### 9.2 Jest suites with ESPN assertions/fixtures (commerce-base)

Signup / checkout core:
- `signup/pages/billing-page.test.tsx` (mocks `useBillingRedirects` at `:170-177`)
- `signup/billing/billing-content/billing-content.test.tsx`
- `signup/billing/billing-merchandising-section/billing-merchandising-section.test.tsx`
- `signup/billing/billing-roadblock/billing-roadblock.test.tsx`
- `signup/billing/billing-description-with-merchandising/add-on-item-billing.test.tsx`
- `signup/add-ons/pages/add-ons-page.test.tsx`
- `signup/queries/use-flex-billing-execution.test.tsx`
- `signup/total-due/total-due.test.tsx`
- `signup/lib/produce-with-metadata.test.ts`
- `signup/plans/plans-scrollable-offers/use-plans-scrollable-offers.test.tsx`
- `signup/student/hooks/use-student-brand.test.tsx`, `use-student-discount-forced-login.test.tsx`

Success:
- `account/success/pages/create-subscription-success-page.test.tsx`
- `account/success/components/subscription-success-content/subscription-success-content.test.tsx`
- `account/success/components/subscription-success-content/add-on-activation-element.test.tsx`
- `account/success/lib/success-screen-input.test.ts`

Entry / routing:
- **`identity/loading/pages/loading-page.espn.test.tsx`** — the only `.espn.` jest file; asserts ESPN
  entitled-user redirect to the external onboarding URL
- `identity/loading/lib/loading-server-utils.test.ts` (redirectURL allowlist)
- `common/redirect/handlers.test.ts` (handler priority)
- `common/lib/use-handle-flex-navigation.test.tsx`, `use-handle-flex-navigation-with-tenant.test.tsx`
- `common/lib/build-get-server-side-props.server.test.ts`
- `identity/login/pages/login-wrapper-page.test.tsx`, `oneid-login-page.test.tsx`

Activation:
- `transactional/activation/hooks/use-espn-internal-activation-params.test.tsx`
- `transactional/activation/pages/{activation-page,callback-page,activation-success-page,transitory-activation-success-page,select-provider-page}.test.tsx`
- `transactional/activation/utils/generate-activation-url.test.ts`,
  `utils/activation-funnel/{derive-activation-id,internal-activation-id}.test.ts`

Payments:
- `payments/payment-forms/components/payments-container/payments-container.test.tsx`
- `payments/payment-forms/components/change-payment-forms-container/change-payment-forms-container.test.tsx`
- `payments/wallet/components/**` (5 files — ESPN wallet)

ESPN app:
- `apps/commerce/espn/src/layout/espn-layout.test.tsx`
- `apps/commerce/espn/src/hooks/use-fetch-espn-adobe-common-data.test.tsx`, `use-set-espn-adobe-common-data.test.tsx`
- `apps/commerce/espn/src/commerce-espn-dict-keys.generated.test.ts`
- `apps/commerce/espn/src/common/build-get-server-side-props/build-get-server-side-props.test.ts`

Fixtures (the fastest way to see ESPN's real screen payloads):
- `signup/__fixtures__/espn/` — 13 files: `billing-page-standalone.json`, `…-standalone-v2.json`,
  `…-flagship-standalone.json`, `…-bundle.json`, `…-bundle-ppv.json`, `…-standalone-ppv.json`,
  `…-standalone-ppv-ftc.json`, `…-espn-with-mlb.json`, `…-with-mlb-opt-in.json`,
  `…-standalone-existing-payment.json`, `billing-roadblock.json`,
  `billing-roadblock-redirect-to-foxone.json`, `add-ons-page.ts`
- `account/success/__fixtures__/espn/` — `espn-standalone-success-page.json`,
  `espn-standalone-success-page-redirect.json`, `mlb-standalone-success-page.json`
- `common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts` (531 ln) — the ESPN config
  contract in one file
- `signup/add-ons/__browser-mocks__/handlers.ts:45-47` — `espnAddOnSelectorResponseHandler`

Commands (from `apps/commerce/AGENTS.md`):
`pnpm test:commerce:jest:espn`, `pnpm test:commerce:playwright:espn`,
`pnpm lint:type-check:commerce:espn`.

---

## 10. Gotchas & Traps

1. **`/commerce/plans` does not exist for ESPN.** `enableCommerceUnifiedPlans: false`. Any Flex
   `navigate → plan-selector` sends the user to `plus.espn.com/watch/offers`. Do not "fix" a plans
   page bug in the ESPN app — it is a 404. CONFIRMED.
2. **`/commerce/welcome-back` is also off for ESPN**, and `defaultRedirectHandler` targets
   `welcome-back` — for ESPN this resolves via Sparrow `welcome_back` to `espn.com/watch/`.
   The "default" branch of the login router therefore leaves CUP. CONFIRMED.
3. **ESPN unauthenticated bounce goes to `/identity/sign-up`, not `/identity/login`.** All three ESPN
   commerce wrappers (`billing`, `add-ons`, `success`) pass
   `authRedirectTarget={route({internal:'/identity/sign-up'})}`. CONFIRMED.
4. **The V2 ledger flag is not in ESPN Sparrow.** It arrives from WeaponX (location-derived header).
   Every ESPN Playwright spec has to inject
   `enableCommerceUnifiedFtcRegulationUpdates = true` or the page silently falls back to the V1 GET
   endpoint and the test fails with an unhandled request (`signup.spec.ts:275-283`). CONFIRMED.
5. **`billing.spec.ts` is `describe.skip`** (GCIEX-984). Do not treat it as coverage. The real ESPN
   billing coverage is `tests/flows/signup.spec.ts`. CONFIRMED.
6. **Add-ons React Query key is constant** — `['flexApi.getScreen.addons']` with no offer inputs
   (`add-ons-page.tsx:122`). Changing entry offers in-session can serve a stale screen. CONFIRMED.
7. **`/commerce/add-ons` has no stepper category** — `useCategoryStepper` returns `current: '0'`.
   CONFIRMED.
8. **Flex's execution payload, not the URL, is the source of truth for offers.** `getOfferData(payload)`
   at `use-flex-billing-execution.tsx:279` and the "Flex execution response is the source of truth for
   offer data, not router.query" comment at `flex-billing-execution.ts:174`. Debugging a wrong-offer
   purchase by inspecting the URL will mislead you. CONFIRMED.
9. **Composition functions merge by naive `reduce`.** `buildGetServerSideProps` spreads each
   function's return over the previous (`build-get-server-side-props.ts:459-465`), so two functions
   returning `props` will clobber each other, and only the *last* `redirect`/`notFound` survives
   the spread. Order matters. CONFIRMED.
10. **`isAllowedESPNDomain` is a misnomer.** `loading-server-utils.ts:24` compares against the
    tenant's own `root_domain`; the same code runs for Disney+ and Hulu. CONFIRMED.
11. **EFACCTMGMT-420 hack mutates the `me` query response in place** to force
    `marketingPreferences.eligibleForOnboarding/isOnboarded = true` for ESPN
    (`use-navigation-redirect.tsx:208-221`). It mutates `rawMeQueryResponse` (the React Query cache
    object), not a copy. CONFIRMED — removing it will change ESPN's Review&Accept behaviour.
12. **`tenantRouteMap.espn` has no `upsellInterstitial`.** A `navigateWithTenant` to
    `upsell-interstitial` with `tenant: 'espn'` yields `pathKey === undefined` and will silently
    misbehave rather than hit the `UNRECOGNIZED_*` error paths. INFERRED
    (`use-handle-flex-navigation-with-tenant.ts:80-106,146-150`).
13. **`pollForActivatedSubscription` / `refreshCookies` never run for ESPN** — no `home_service` /
    `refresh_cookies` in the ESPN Sparrow paths. CONFIRMED.
14. **`shouldIdleRedirect` differs per brand**: ESPN + D+ `true`, Hulu `false`. An idle user on the
    ESPN ledger gets redirected away. CONFIRMED.
15. **ESPN billing has no maintenance flag.** D+ and Hulu both set
    `BillingPage.maintenance = { flag: 'enableSignUpMaintenance' }`; ESPN does not. CONFIRMED.
16. **`enableCommerceTiara` is absent from the ESPN Sparrow fixture** → `/commerce/unlock` is a 404
    for ESPN even though the page file exists. CONFIRMED.
17. **The signup add-ons page imports change-subscription internals.** Cross-team coupling
    (MMA add-ons ↔ MMA change-subscription v2 atoms/lib/models). Refactoring change-subscription v2
    atoms breaks the signup add-ons page. CONFIRMED.
18. **ESPN uses legacy Adobe analytics on billing behind `wpnx-enable-legacy-analytics-espn`**, and
    the success page deliberately suppresses CoreAnalytics for ESPN to avoid duplicate page
    impressions (`create-subscription-success-page.tsx:317-322`). Analytics parity between brands is
    intentionally *not* the same. CONFIRMED.
19. **`salesPlatform` sent to Flex is `standardizeDeviceProfile(deviceProfile)`, not the
    `salesPlatform` query param** (`use-flex-billing-execution.tsx:365`, `TODO GCIEX-3511`). The
    query param goes into headers via `generateFlexHeaders`. Two different values, both called
    "sales platform". CONFIRMED.
20. **`?cid=` and other unknown params survive by accident**, not by design — they ride along in the
    `{...router.query}` spreads. Any refactor that stops spreading `router.query` will silently drop
    marketing attribution. INFERRED.

---

## 11. Open questions

1. **`?cid=` contract.** No reference anywhere in `commerce-base`. Is it consumed by Adobe Launch /
   Tealium client-side (outside `useCommerceQueryParams`), or by Flex from the referrer? Needs a
   check in `packages/instrumentation` and on the Flex side.
2. **Production `espn_plan_selector` / `plan_select` values.** The fixture shows
   `https://sandbox.espn.com/watch/offers`; the production Sparrow workspace is not in the repo.
   Confirm the prod host is `plus.espn.com/watch/offers` (the `productConfigMap` origin is
   `https://plus.espn.com`).
3. **Which ESPN offers actually route through `/commerce/cadence`?** `enableSignUpFlowCadenceRoute: true`
   for ESPN, but no ESPN cadence fixture or spec exists. Is the cadence step live for ESPN or dark-launched?
4. **`enableSignUpFlowAddOnsRoute: true` + `wpnx-add-on-step` experiment.** The route is enabled in
   ESPN Sparrow but entry via `/identity/loading` requires the WeaponX experiment *and* a `pref`
   query param (`handlers.ts:36`). What is the non-experiment entry path to `/commerce/add-ons` for
   ESPN — is the ESPN paywall linking directly?
5. **`enableCommerceUnifiedPurchase: false` for ESPN** and no `pages/commerce/purchase/*` in the ESPN
   app. Where does ESPN PPV purchase actually happen (the `espnppv` / `espnbkwrmppv` success screens
   exist)? Likely legacy/Cannonball — needs confirmation.
6. **Is `/identity/subscriber-agreement` mounted for ESPN?** It appears in `IDENTITY_ROUTES` and in
   the stepper category maps, and `useBillingRedirects` can redirect there, but there is no
   `apps/commerce/espn/pages/identity/subscriber-agreement/*`. If ESPN (US-only) never requires it,
   the SA redirect is dead code for ESPN — but `useSubscriberAgreementReviewRedirect` still runs.
7. **`requiresActiveReview` / `requiresForcedSubscriberAgreement` for ESPN regions.** Both are
   region-scoped Sparrow flags; the ESPN fixture's `parentCountry: 'US'` suggests both are false, but
   the region-scoped section was not inspected.
8. **Templatized APM sequencing on ESPN.** `enableCommerceUnifiedTokenizationSignup: false` in the
   ESPN fixture, and the success action is explicitly deferred with `TODO WEB-36813`. Is any ESPN
   payment method on the templatized path today (Apple Pay? RPM?), and if so what handles the
   success navigation?
9. **`enableFlexPoweredActivationSuccessScreen: false` for ESPN** while
   `enableFlexPoweredActivationLandingPage: true`. Which activation success screen does ESPN render,
   and does the internal-activation success interstitial depend on this?
10. **`ROKU_PAY` / RPM in the signup funnel.** RPM appears in plan-switch (`TAPPlanSwitchRokuPay`) and
    change-payment, but is it reachable from `/commerce/billing` signup? No signup fixture shows it.
11. **`landingUrl` vs `landingURL`.** Both are read (`use-commerce-query-params.ts:118-122`,
    `ACP-4190` deprecation TODO) but only `landingUrl` is forwarded into the V2 billing request body
    (`billing-page.tsx:307`). Is that intentional, or does the ESPN paywall send the deprecated casing?
12. **Glimpse `stepperV2` marker.** It comes from Flex. Does ESPN's Flex ever send it, i.e. does the
    ESPN ledger show a stepper at all in production?
