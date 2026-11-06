# Hulu-Specific Research Dossier — `cgi-web` Monorepo

Scope: everything Hulu-specific across 10 investigation areas. Every claim is anchored to a `path:line` (or a directory-listing path for structural facts). Anything unverified is marked **ASSUMPTION**. See `00-INDEX-AND-CORRECTIONS.md` for corrections — notably the client-side Spearmint infrastructure this dossier originally missed (§5 here is superseded on that point).

---

## 1. Monorepo Map

- `README.md:3` — "This repository contains all the packages and applications that together form the future of Hulu, Disney+, and ESPN on web."
- `README.md:77,83` — supported products `disney`, `espn`, `hulu`; commerce apps via `pnpm build:commerce:[product]` / `pnpm dev:commerce:[product]`.
- `CLAUDE.md:7,9` — multi-tenant monorepo of Commerce, Growth, Identity (CGI) web flows; Next.js (Pages Router) 15.5.19, React 18.3.1, TypeScript, pnpm, Turbo.
- `CLAUDE.md:79-82` — `/apps/commerce/` = checkout/billing/subscriptions; `/apps/marketing-unified/` = marketing/landing pages (NEXUS platform).
- `pnpm-workspace.yaml:1-27` — workspaces `packages/**`, `apps/**`, `documentation`, `.github/scripts`; catalog pins `next: '15.5.19'` default vs `catalog:growth` `next: '^13.5.9'` (`:107,218`) — commerce and marketing-unified run **different Next.js majors**.
- `turbo.json:5-7` — remote cache `turborepo-cache-legacy.us-east-1.bamgrid.net`.

### Apps
| App | Purpose |
|---|---|
| `apps/commerce/hulu` (`@solo/commerce-hulu`) | **Hulu** checkout/billing/account (CUP V2) — `package.json:2-6` |
| `apps/commerce/disneyPlus` / `apps/commerce/espn` | Disney+/ESPN equivalents |
| `apps/marketing-unified/hulu` | Hulu marketing/landing pages (NEXUS, CMS-driven, Cannonball data fetch) |
| `apps/marketing-unified/disneyplus` / `espn` / `appsupport` | Siblings |

### Packages (one-line each)
| Package | Purpose |
|---|---|
| `packages/cgi/commerce-base` | Shared CUP V2 commerce UI/hooks/logic for all three brand apps — `packages/cgi/AGENTS.md:26` |
| `packages/cgi/data-interface-hulu` | Hulu-specific API/data abstraction incl. Flex client — `packages/cgi/AGENTS.md:29` |
| `packages/cgi/data-interface-disney` / `data-interface-espn` | Same for D+/ESPN |
| `packages/cgi/cgi-design-components` | Brand-agnostic design-system components |
| `packages/cgi/cgi-design-tokens` | Per-brand CSS tokens (`hulu.css`/`hulu-dark.css`) — `packages/cgi/AGENTS.md:97` |
| `packages/cgi/sdk-session` | BAM SDK session/access-token management |
| `packages/cgi/footer`, `profiles-rules`, `profiles-tests` | Shared footer, profile rules/test utils |
| `packages/identity-auth` | Multi-brand identity/auth feature modules |
| `packages/identity-hulu` | **Hulu-specific** identity flows ("web-login-ui", IDM/Edna-backed) — `packages/identity-hulu/README.md:1-24` |
| `packages/instrumentation` | Analytics: HITS, Adobe, Tealium, Glimpse, Zenapse |
| `packages/dictionary` | i18n/localization (Cypher) |
| `packages/remote-config` | Remote configuration (Sparrow) |
| `packages/privacy-consent` | Privacy/consent (OneTrust-adjacent) |
| `packages/mydisney-ui` | Shared MyDisney UI kit (Hulu app depends on it too) |
| `packages/traffic-director-dev` | Local-dev wrapper to run stage-web Traffic Director in Docker — `README.md:1-8` |
| `packages/observe`, `test-utils`, `playwright-utils`, config packages | Tooling |

---

## 2. Hulu App Structure

**Framework:** Next.js Pages Router (`.page.tsx` convention, `_app.page.tsx`/`_document.page.tsx`). `next: '15.5.19'` (catalog default).

**Entry/config:**
- `apps/commerce/hulu/next.config.js:18` — `const productName = 'hulu';`
- `apps/commerce/hulu/package.json:34` — `"dev:start": "... PORT=5030 PRODUCT=hulu next dev"` (note: PRODUCT set inline, not via dotenv)
- `apps/commerce/hulu/package.json:33` — ssl proxy → local dev domain `https://local.huluqa.com:5003` (proxy 5003 → next dev 5030)

**Key dirs:** `pages/`, `src/account/`, `src/identity/`, `src/layout/` (`hulu-layout.tsx`), `src/common/`, `playwright/`.

**Page routes** (`apps/commerce/hulu/pages/**`):

SUF/signup: `commerce/plans`, `commerce/billing`, `commerce/purchase`, `commerce/success`, `commerce/cadence`, `identity/sign-up`, `identity/start`, `identity/verify`, `identity/magic`. **No `commerce/welcome-back` route for Hulu** (present for D+/ESPN — verified via find).

Account: `commerce/account`, `manage-email-notifications`, `set-change-home`, `update-personal-info`, `commerce/billing-history`, `commerce/charges`, `commerce/change-payment`, `commerce/change-subscription/{index,confirm,setup,success}`, `identity/manage-devices`, `identity/delete/[slug]`.

Cancel/retention: `commerce/cancel/[slug]`, `commerce/cancel/success`, `commerce/pause`, `pause/success`, `commerce/restart-subscription/{confirm,success}`.

Other: `commerce/redeem`, `commerce/gift/*`, `commerce/student/{index,loading}`, `commerce/unlock`, `commerce/activate/*` (incl. `spotify/` partner integration + `[provider]`), `commerce/extra-member/*`, `profiles/transfer/*`, `profiles/consume-transfer`, `profiles/adhoc-transfer/max-profiles`, `profiles/extra-member/accept/transfer/[slug]`.

---

## 3. Flex Integration — Request → Screen JSON → Render

**Flex client:** `packages/cgi/data-interface-hulu/src/flex/flex-data-interface.ts`.

```typescript
// flex-data-interface.ts:168-214
getFlexScreen: async <T>(flexScreenOptions: FlexScreenOptions) => {
  const { key, version, queryParams, headers, requestBody, method = 'GET' } = flexScreenOptions;
  if (!isFlexScreenKeyMapped(key)) {
    throw new Error(`The Flex screen key, ${key}, must first be mapped to a path in the data interface.`);
  }
  const searchParameters = queryString.stringify(queryParams as Record<string, unknown>);
  const endpoint = getEndpoint({ edgeBaseUrl, version, flexKeysToUrls: flexScreenKeysToUrls, key, type: 'screens', flexOptions: flexScreenOptions });
  const response = await fetch(`${endpoint}${searchParameters ? `?${searchParameters}` : ''}`, {
    body: JSON.stringify(requestBody),
    headers: {
      'x-bamsdk-platform': getCachedPlatformHeader(userAgent),
      ...headers,
      ...(method === 'POST' && { 'content-type': 'application/json' }),
    },
    method,
    credentials: 'include',
  });
  ...
```

- Screen key→URL map: `flex-data-interface.ts:8-38` — e.g. `landingPlans: 'landing/plans'`, `cancelFlow: 'account/cancel'`, `changePayment: 'account/change-payment'`, `accountDetails: 'hulu/account-home'`.
- Execution key→URL map: `flex-data-interface.ts:48-72` — e.g. `subscriptionSignup: 'subscription/signup'`, `subscriptionCancel: 'subscription/cancel'`.
- URL: `${edgeBaseUrl}/screens/${version}/${flexKeysToUrls[key]}` (`:126`). Mocks confirm `/screens/v1/...` (`commerce-base/src/retention/cancel/__browser-mocks__/requests.ts:64`).
- `credentials: 'include'` (`:212,285`) — Hulu auth cookies (`_hulu_at`/`_hulu_session`) ride automatically on every Flex call; no manual bearer token.
- Response envelope `{ data: {...} }` → `data as T` (`:219-232`); errors via `handleFlexError`/`isFlexError` (`src/flex/exceptions.ts`).

**Render pipeline** (`packages/cgi/commerce-base/src/signup/pages/plans-page.tsx`):

```tsx
// plans-page.tsx:233-248
const { data, isLoading } = useQuery({
  queryKey: ['flexApi.getScreen.planSelector'],
  queryFn: () =>
    dataInterface.getFlexScreen<FlexPlansPageContentModel>({
      key: 'landingPlans',
      version: 'v1',
      queryParams,
      headers: generateFlexHeaders({ salesPlatform }),
    }),
  meta: { errorMessage: ERROR_MESSAGES.PLANS.QUERY_FAILED, errorOwner: Owners.MMA },
  select,
  useErrorBoundary: true,
});
```

React Query → `dataInterface.getFlexScreen` (atom-hydrated via `dataInterfaceAtom`, per-brand hydration in `apps/commerce/hulu/src/layout/hydrate-data-interface.tsx:39-51` via `buildHuluDataInterface`) → `isFlexRedirect(data)` check (`commerce-base/src/common/lib/flex/is-flex-redirect.ts`, used at `plans-page.tsx:264,377`) → render `<PlansContent model={data.content} .../>` (`:441-453`).

**Element rendering components** (`packages/cgi/commerce-base/src/common/components/flex/`):
- `interaction-element/interaction-element.tsx:139-176` — Flex Interaction nodes → `FlexInteractionField` buttons; `type === 'cypher'` → `<TextWithVariables dict={{dictionary, text}} variables={variables} />`.
- `text/text.tsx:45-81` — `FlexText`, base building block; `convertCopyToTextProps(copy)` resolves cypher/dictionary text.
- Note: repo names are `FlexInteraction`/`ControlledFlexInteraction`/`FlexInteractionField` and `FlexText` — no literal `LocalizedTextElement` component exists client-side.
- Other Flex element model types: `commerce-base/src/common/services/flex/models/` — `banner.types.ts`, `badge.types.ts`, `offer.types.ts`, `roadblock.types.ts`, `modal.types.ts`, `interaction-list-element.types.ts`, `image-element.types.ts`, `total-due.types.ts`, `charges-section.types.ts`.

---

## 4. SUF (Signup Flow) for Hulu — End to End

Route sequence (verified via page files):
1. `pages/commerce/plans/index.page.tsx` → `PlansPage` (`commerce-base/src/signup/pages/plans-page.tsx`), Flex key `landingPlans` (`:236-238`).
2. `pages/commerce/billing/index.page.tsx:17` → `BillingPage` from `@solo/commerce-base/src/signup/pages`.
3. `pages/commerce/purchase/index.page.tsx:17` → `PurchasePage` from `@solo/commerce-base/src/signup/purchase`.
4. `pages/commerce/success/index.page.tsx:2` → `CreateSubscriptionSuccessPage` from `@solo/commerce-base/src/account/success/pages`.

Account creation: `pages/identity/sign-up/index.page.tsx` → `SignUpPage` renders `UnifiedCreateAccount` from `@solo/identity-hulu`:

```tsx
// apps/commerce/hulu/src/identity/sign-up/pages/sign-up-page.tsx:58-81
const createAccountConfig: UnifiedCreateAccountProps['config'] = {
  baseRoute: '/identity/sign-up',
  client: { partner: 'hulu', subpartner: 'web' },
  env: 'dev',
  onCreateAccountSuccess,
  router: identityRouter,
  selectedPlan: { identifier: '', subscription: { promotion: { programId: 0 } } },
  updateUserEmail: () => {},
};
return <UnifiedCreateAccount config={createAccountConfig} />;
```
Comment at `:9-13`: *"This page will not be multi-tenant and is used specifically in the unified Hulu application. The page will be mostly powered by the Edna Create Account feature component from the `@solo/identity-hulu` package."*

**ASSUMPTION:** exact position of `/identity/sign-up` inside the live SUF ordering not verified from route wiring alone (`onCreateAccountSuccess` routes to `/commerce/account`, `:51-56`).

**`hitsFlowName` wiring:**
```typescript
// packages/instrumentation/src/hits/types/account.ts:229-240
export type HitsSubscriptionFlowName =
  | 'suf_web_sash_only'
  | 'suf_web_noah_only'
  | 'suf_web_curiosity'
  | 'suf_web_hisuf'
  | 'suf_web_default'
  | 'suf_web_plan_builder'
  | 'suf_web_one_hulu'
  | 'suf_web_live_only'
  | 'suf_web_redeem'
  | 'suf_web_svod'
  | 'hi_switch';
```
- Sourced from URL query param: `commerce-base/src/common/lib/use-commerce-query-params.ts:72` (`hitsFlowName, // tracks the hits flow for signup`).
- Fallback: `use-billing-hits-payloads.ts:15,41-57` — `DEFAULT_FLOW_NAME = 'suf_web_default'`; `getFlowName(flowName?) => flowName ?? DEFAULT`.
- Same for plans: `use-plans-hits-payloads.ts:20-22`.
- Consumed in `plans-page.tsx:253-281` firing `page_impression`, `subscription_start`, `subscription_plan_select`/`subscription_step_start` via `analytics.track(...)`.
- HITS screen names: `account.ts:242-248` (`'SUF - Plan Builder'`, `'SUF - Plan Select'`, `'SUF- Account Info'`, `'SUF - Billing Info'`, ...); `use-billing-hits-payloads.ts:16` sets `SCREEN_NAME = 'SUF - Billing Info'`.
- **ASSUMPTION:** literal `hitsFlowName=suf_web_one_hulu` never appears in-repo; injected by out-of-repo entry links.

---

## 5. Experimentation — WeaponX / Mystique (see corrections file for Spearmint client-side!)

**Mystique flags hook:** `packages/cgi/commerce-base/src/common/hooks/use-mystique-feature-flags.ts:18-53`:

```typescript
export function useMystiqueFeatureFlags() {
  const { sdkSession, isEnabled: isSDKEnabled, isReady } = useSDKSession();
  return useQuery({
    queryKey: ['getFeatureFlags'],
    queryFn: async () => {
      if (isSDKEnabled && sdkSession) {
        return sdkSession.getFeatureFlags();
      }
      // Set flags here as you would for prod and override when developing locally or deploying a branch to staging
      return {
        'wpnx-web-commerce-gift-card': true,
        'wpnx-web-commerce-membership-pause': true,
        'wpnx-web-commerce-unblocking': true,
        'wpnx-web-identity-account-home-header-dd': HEADER_VARIANT.Logout,
        'wpnx-web-identity-useLoggedInDataInterface': true,
        // Country-gates the student verification flow; hardcoded true here because Hulu is US-only and does not use the SDK or WeaponX
        'wpnx-student-verification': true,
      };
    },
    enabled: isReady,
    ...
```
Comment at `:50`: **"Hulu is US-only and does not use the SDK or WeaponX"**. Hulu layout never wires `isSDKEnabled` (zero matches in `apps/commerce/hulu/src`), unlike `apps/commerce/disneyPlus/src/layout/hydrate-data-interface.tsx:54,64,130,143`. **ASSUMPTION:** runtime consequence (sdkSession undefined → static fallback branch) inferred from comment + absent hydration.

**Consumption example** — `use-is-in-skip-welcome-back-experiment.tsx:1-15`:
```tsx
import { useMystiqueFeatureFlags } from '../use-mystique-feature-flags';
// TODO WEB-24082: Cleanup or productionalize.
export function useIsInSkipWelcomeBackExperiment() {
  const { data } = useMystiqueFeatureFlags();
  return data?.['wpnx-skip-wb-landing-page'] === 'treatment-skip-wb-landing-page';
}
```
(Disney+/ESPN-scoped in practice — Hulu has no welcome-back route.)

wpnx keys seen: `wpnx-web-commerce-gift-card`, `wpnx-web-commerce-membership-pause`, `wpnx-web-commerce-unblocking`, `wpnx-web-identity-account-home-header-dd`, `wpnx-web-identity-useLoggedInDataInterface`, `wpnx-student-verification`, `wpnx-web-commerce-grid-on-plans-page` (`plans-page.tsx:153`), `wpnx-web-profiles-unentitled-account-access` (`welcome-back-page.tsx:130`).

**No LaunchDarkly anywhere in cgi-web** (repo-wide grep zero matches). QA overrides: commerce debug tooling `hydrate-base-atoms.tsx:19-20,82` (`getIsDebugToolingEnabled`); marketing `get-feature-flag-with-query-override.ts:82` (QSP overrides blocked in prod unless debug tooling or Playwright).

**Headers to Flex:** `generateFlexHeaders` (`commerce-base/src/common/constants/subscription-sources.ts:43-60`) sends `X-Bamtech-Sales-Platform` when salesPlatform/license-plate deviceProfile present. No experiment-bucket header set by cgi-web client code (see corrections: `x-bamtech-spearmint-assignments` presumed Edge-injected from `_hulu_assignments` cookie).

---

## 6. Feature Flags — `useCommerceFeatureFlag`

`packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-feature-flag.tsx:14-33`:

```tsx
export function useCommerceFeatureFlag<T = unknown>({
  featureName, fallbackValue, region, shouldInheritFromParent = true,
}: { featureName: string; fallbackValue: T; region?: RegionSubtag; shouldInheritFromParent?: boolean; }) {
  const commerceRegionFeatureFlags = useCommerceRegionFeatureFlags(region, shouldInheritFromParent);
  const flagValue = commerceRegionFeatureFlags[featureName] as T;
  return flagValue ?? fallbackValue;
}
```

Region inheritance (`use-commerce-region-feature-flags.tsx:23-40`): territories inherit from `parentCountry` unless `shouldInheritFromParent === false`; territory-specific keys override parent copies. Data source: `commerceAppConfigAtom` (`@solo/commerce-utils`) — server-provided app config (Sparrow) keyed by region, each with `featureFlags` map + optional `parentCountry`.

Hulu-relevant callers: `use-show-commerce-unified-subscriber-agreement-checkbox.ts`, `use-is-subscriber-agreement-review-required.ts`, `use-license-plate-region-scope.ts`, `manage-nielsen-item.tsx`, `delete-account-modal.tsx` — cross-brand commerce-base hooks consumed by Hulu like siblings.

---

## 7. Analytics — HITS / Tealium / Adobe

**Hulu commerce uses all three simultaneously** — `apps/commerce/hulu/src/layout/hulu-layout.tsx:91-136`:

```tsx
const hitsTracker = useHitsAnalyticsTracker({ appComponentName: 'hulu-acp', glimpseInteractionId });
const tealiumTracker = useTealiumTracker({ app: 'hulu-acp', client_type: 'web', device_category: isMobileDevice() ? 'mobile' : 'desktop' });
const coreAnalytics = useCoreAnalytics([adobeAnalyticsTracker, hitsTracker, tealiumTracker]);
...
<Analytics trackers={coreAnalytics}>
  {hasOneTrustConsent && (<AdobeAnalytics adobeAnalyticsConfig={commerceAppConfig['feature-configuration'].analytics.adobe} tracker={adobeAnalyticsTracker} />)}
  {hasOneTrustConsent && (<Tealium tracker={tealiumTracker} tealiumUrl={commerceAppConfig['feature-configuration'].analytics.tealium.url} />)}
  {/* HITS loads via @hulu/site-metrics library and no Next <Script/> is required. */}
</Analytics>
```
- HITS = Hulu's native analytics; `packages/instrumentation/src/hits/README.md:12-16`: schemas defined/validated in Minerva, built on site-metrics (`github.prod.hulu.com/Instrumentation/site-metrics`); events post to `vortex.hulu.com` (`:177,183`).
- Marketing-unified Hulu app wires **Tealium + HITS only** (no Adobe): `apps/marketing-unified/hulu/src/shared/layout/application-layout/load-analytics.tsx:34-44`, gated on `useHasPrivacyConsent()`.
- Consent: commerce uses `useHasOneTrustConsent()` (`hulu-layout.tsx:12,111`); OneTrust docs `confluence.disney.com/display/DDQGC/OneTrust` (`:109-110`).
- Flex `metricsData` firing: `GlimpsePageView` wraps content reading `screenData.content.metricsData` (`welcome-back-page.tsx:382`); Adobe Launch data read off Flex payload (`welcome-back-page.tsx:202-221`).
- HITS↔Glimpse field mapping documented `hits/README.md:158-173` (`pageName`→`curr_page_type`, `elementId`→`element_specifier`).

---

## 8. Auth / Identity for Hulu

**Hulu uses its own native token/session system — NOT OneID or BAM SDK tokens** for the commerce app's Flex calls.

```typescript
// apps/commerce/hulu/src/identity/auth/use-ensure-hulu-auth-token.ts:8-46
export const HULU_AT_COOKIE = '_hulu_at';
export const HULU_SESSION_COOKIE = '_hulu_session';

export function useEnsureHuluAuthToken(huluBaseUrl: string) {
  const [isComplete, setIsComplete] = useState(false);
  useEffect(() => {
    const generateAnonymousTokenIfRequired = async () => {
      try {
        if (!getCookie(HULU_AT_COOKIE) && !getCookie(HULU_SESSION_COOKIE)) {
          await generateAnonymousToken(huluBaseUrl);
          datadogRum.addAction('ANONYMOUS_HULU_AUTH_TOKEN_SET', { owner: Owners.IDENTITY, huluAuthorizationToken: getCookie(HULU_AT_COOKIE) });
        }
      } catch (error) { ... } finally { setIsComplete(true); }
    };
    generateAnonymousTokenIfRequired();
  }, [huluBaseUrl]);
  return { isComplete };
}
```
- `generate-anonymous-token.ts`: *"Generates an anonymous token required by Hulu Edge for upstream calls... fallback when a regular session token is not available"* — hits `${huluBaseUrl}/api/v1/identity/generate_anonymous_token` with `credentials: 'include'`.
- Gated at layout: `hulu-layout.tsx:140-150,220-222` — `EnsureHuluAuthToken` blocks render (`{hasHuluAuthToken && children}`) until anonymous-token step completes.
- Login/create-account UI: `@solo/identity-hulu` ("web-login-ui"), mirrors **IDM's `LoginModal` v2 contract** (`packages/identity-hulu/README.md:24`, link `github.prod.hulu.com/SiteSecurity/login-modal`). Sign-up wiring: `sign-up-page.tsx:3-5`, `client: { partner: 'hulu', subpartner: 'web' }`.
- Hulu app does **not** use `@solo/sdk-session`'s BAM SDK session — only low-level `getCookie` imports (`get-temporary-csrf-value.ts:4`, `p-edit-required.tsx:1`).
- **ASSUMPTION:** "IDM"/"Edna" = Hulu's internal identity-management service names, based on repo usage only.

---

## 9. Branding, Legacy Handling, Welcome-Back Status

**Theming/design tokens:**
- Sources: `packages/cgi/cgi-design-tokens/src/tokens/brands/hulu.ts`, `.../colors/hulu.ts`, `huluDark.ts`; compiled `dist/hulu.css`, `hulu-dark.css`, `hulu.json`, `hulu.js`.
- Component-library themes: `cgi-design-components/src/themes/hulu.ts`, `hulu-dark.ts`.
- commerce-base theme: `commerce-base/src/common/styles/themes/hulu.ts:1,13,27,29` (`huluTokens.colors.brandBright`).
- Each brand = **separate Next.js app**; "partner switch" at app/deployment level. `next.config.js:18` hardcodes `productName = 'hulu'`.

**Legacy hulu.com handling:**
- `use-commerce-query-params.ts:81-82` — `// legacy hulu account home params` guards `sethome` query param.
- `redirect-to-legacy.ts:22-35` — `redirectToLegacy({ path, preferredURLLanguage, queryParams, saveHistory })` bounces users to legacy (non-CUP) URLs; e.g. `plans-page.tsx:223-230` unsupported-location → `/welcome/unavailable`.
- `commerce-utils/src/url-helpers.ts:56-61` — `ALLOWED_REDIRECT_DOMAINS = ['espn.com', 'disneyplus.com', 'disney.com', 'hulu.com', 'huluqa.com']`.

**Welcome-back — verified absent for Hulu:**
```
find apps/commerce/hulu/pages -iname "*welcome*"       → (no results)
find apps/commerce/disneyPlus/pages -iname "*welcome*" → pages/commerce/welcome-back
find apps/commerce/espn/pages -iname "*welcome*"       → pages/commerce/welcome-back
```
Shared `WelcomeBackPage` still exists brand-agnostic in commerce-base (`signup/pages/welcome-back-page.tsx`, renders Flex `subscriptionReacquisition` screen, `:179`), but no Hulu route file. **ASSUMPTION:** "redirects to standard SUF" behavior not found as redirect rule; git history shows no deleted hulu welcome-back page file.

**Spotify partner integration:** `pages/commerce/activate/spotify/{index,connect,partner-confirm}.page.tsx` + `activate/[provider].page.tsx`.

---

## 10. Environments / Deployment

- Local: proxy `local.huluqa.com:5003` → next dev `:5030` (`package.json:33-34`). Root README gives D+ example (`local.disneyplus.com:5001/commerce/plans`); Hulu equivalent inferred `https://local.huluqa.com:5003/commerce/plans` (**ASSUMPTION**: not stated verbatim). HITS README cites `local.hulu.com:5003` (`hits/README.md:182`) — domain discrepancy vs `local.huluqa.com`, unresolved (**ASSUMPTION**: doc staleness or dual-domain).
- Secrets: `apps/commerce/hulu/.env.local.example:1-9` — Vault service `hulu-commerce`, namespace `5ccc787ab3926400ede31b05`, env `staging`; `DAPI_SENSITIVE_SECRETS_API_KEY`, `REMOTE_CONFIG_S3_ACCESS_KEY` via `pnpm -w run setup configure secrets`.
- Prod headers/build: `next.config.js:22-39` (CSP frame-ancestors 'self', HSTS, X-Frame-Options DENY); `:60-66` assetPrefix `STATIC_ROOT_URL` in prod, `/commerce/` under traffic director; `:74-82` build output dir logic.
- Traffic Director: `packages/traffic-director-dev/README.md:1-8` — stage-web traffic director in Docker locally; root `README.md:69-71`.
- CI/CD: Jenkins deploys (`fed.jenkins.us-east-1.bamgrid.net`), GH Actions PR checks, Turbo remote cache (`CLAUDE.md:227-231`, `README.md:64-66`). Datadog CI test path `cup_commerce/apps/hulu` (`package.json:16`).
- Security: Vault + SCRAAP scanner (`scraap-reviews-app-prod.prod.hulu.com`) — `CLAUDE.md:233-242`.

---

## Compiled ASSUMPTIONS
1. `traffic-director-dev` ≡ "traffic-director-local" naming.
2. `/identity/sign-up` position within live SUF ordering unverified.
3. Hulu `sdkSession` inert at runtime — inferred from comment + absent hydration.
4. `wpnx-skip-wb-landing-page` presumed D+/ESPN-scoped.
5. `hitsFlowName=suf_web_one_hulu` injected by out-of-repo links.
6. Hulu welcome-back "redirects to standard SUF" not found as code; only route absence verified.
7. Local Hulu URL `https://local.huluqa.com:5003/commerce/plans` inferred from proxy config.
8. `local.hulu.com` vs `local.huluqa.com` discrepancy unresolved.
9. "IDM"/"Edna" identity-service naming from in-repo references only.
