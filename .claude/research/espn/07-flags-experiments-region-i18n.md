# ESPN Configuration Systems — Flags, Experiments, Region/Globalization, i18n, Offers

Research digest for `cgi-web` (`/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web`).
All paths are repo-relative unless absolute. Labels: **CONFIRMED** = read directly in code/config in this
repo; **INFERRED** = reasonable deduction from what is in the repo but not stated outright.

---

## 0. Executive summary (the 12 things that matter most)

1. **There are two independent flag systems**, and confusing them is the #1 trap.
   - *WeaponX / Mystique flags* — `wpnx-*` string keys, delivered by the BamTech browser SDK at
     bootstrap, read via `useMystiqueFeatureFlags()`. Used for experiments + rollouts.
   - *Sparrow commerce config flags* — camelCase keys under `feature-flags.general` (global) and
     `countries.<REGION>.<COUNTRY>.featureFlags` (per-country), read via `useCommerceFeatureFlag()` /
     `useCommerceRegionFeatureFlags()` / `commerceAppConfig`. Used for route enablement + market gating.
2. **ESPN commerce is US-only (plus 7 US territories).** The Sparrow ESPN workspace has exactly one
   business region (`NA`) with `AS, GU, MH, MP, PR, UM, US, VI` — every territory has
   `parentCountry: 'US'`. No `CA`, no EMEA/APAC/LATAM. **CONFIRMED**
3. **`regionExperience` and `getExperimentTreatment` do not exist in this repo.** Those are Flex
   (`growth-life-client-api`) concepts. cgi-web's equivalents are the country `group` field
   (`"North America" | "EMEA" | "APAC" | "LATAM" | "Marvel"`) and the `BusinessRegion` enum
   (`NA | EMEA | APAC | LATAM`). **CONFIRMED (absence verified by grep)**
4. **ESPN uses WeaponX, Hulu uses Spearmint.** Explicitly documented in the copy-override hook.
5. **Territory flag inheritance is real and one-level-deep**: territory flags are a deep-cloned copy of
   the parent country's flags with territory keys layered on top (`getRegionCommerceFlags`).
6. **`treatment undefined` is the default-path trap**: WeaponX experiment hooks compare a *string*
   variant against an expected treatment id. If the flag is absent (`undefined`), every comparison is
   false, so the user silently gets control. Nothing throws.
7. **ESPN-named WeaponX flags in the repo are few** (5 by name), because most ESPN behaviour rides on
   shared commerce flags plus the ESPN Sparrow workspace.
8. **Dictionary/i18n is Cypher-backed** with a `dictionaryTenant` of `'espn'`, six namespaces, and
   `unified-commerce` as the default namespace. Missing keys emit
   `MISSING_CYPHER_KEY_IN_DICTIONARY` to Datadog RUM, not an exception.
9. **ESPN supports only `en` and `es-419`** in `supportedLangsMap`. RTL machinery exists
   (`languageDirectionAtom`) but is dead weight for ESPN. **CONFIRMED / INFERRED**
10. **Prices are server-driven.** Flex returns `price: FlexRichTextModel` — cgi-web renders it, never
    computes it. Only legacy `rewardsProducts` in the (now-unused-by-CUP) remote config carry numbers.
11. **Sparrow configs are cached 5 minutes in-process** (`LRU`, `max: 40`, `ttl: 300_000`), keyed on
    the *backend service* (env variant), not on the tenant.
12. **An ESPN build needs exactly two Vault secrets**: `REMOTE_CONFIG_S3_ACCESS_KEY` and
    `DAPI_SENSITIVE_SECRETS_API_KEY`, from Vault service `espnplus-commerce`.

---

## 1. Feature flags

### 1.1 The Mystique / WeaponX flag hook

`packages/cgi/commerce-base/src/common/hooks/use-mystique-feature-flags.ts:18-60`

```ts
/**
 * Hook for returning WeaponX - Mystique Feature Flags from the SDK.
 *
 * SDK pulls this data from internally cached values acquired during bootstrap/session initialization.
 * There is no network call to fetch these feature flags.
 *
 * If the SDK is disabled, an empty object is returned.
 */
export function useMystiqueFeatureFlags() {
  const { sdkSession, isEnabled: isSDKEnabled, isReady } = useSDKSession();

  return useQuery({
    queryKey: ['getFeatureFlags'],
    queryFn: async () => {
      if (isSDKEnabled && sdkSession) {
        return sdkSession.getFeatureFlags();
      }
      // TODO: WEB-16682 return actual data
      return {
        'wpnx-web-commerce-gift-card': true,
        ...
```

Key semantics (**CONFIRMED**):

- Flags come from the **SDK's bootstrap cache** — **no network call**. So a flag change requires a new
  session/bootstrap, not a refetch.
- The react-query key is the bare string `['getFeatureFlags']` — a single global cache entry, no
  region/tenant in the key.
- `enabled: isReady` — the query does not run until the SDK session is ready. Before that, `data` is
  `undefined` and every flag reads as falsy.
- `useErrorBoundary: false` + `meta.errorMessage` — failures degrade silently and are logged as
  `Owners.CORE`.
- **When the SDK is disabled the hook returns a hardcoded literal object** (line 40-52). This is the
  Hulu path. Note the comment on line 50-51: *"hardcoded true here because Hulu is US-only and does not
  use the SDK or WeaponX"*. ESPN **does** use the SDK, so ESPN gets real WeaponX values.

The flag value type is deliberately wide (`use-mystique-feature-flags.ts:8-16`):

```ts
export type FeatureFlags = {
  [key: string]:
    | boolean | string | number
    | Array<string> | Array<number>
    | Record<string, string | number | boolean>;
};
```

So a `wpnx-*` flag can be a boolean toggle, a *string variant id* (experiments), or a nested object
(copy overrides — see §2.5).

### 1.2 The Sparrow commerce-config flag hooks

Three layers, innermost first.

**`getRegionCommerceFlags`** — territory inheritance
(`packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-region-feature-flags.tsx:23-60`):

```ts
const parentCountry = commerceAppConfigCountries[region]?.parentCountry;
const isTerritory = parentCountry !== undefined;

// If not a territory OR if not inheriting from parent, return country-specific flags.
if (!isTerritory || !shouldInheritFromParent) {
  return commerceAppConfigCountries[region]?.featureFlags ?? {};
}

const territoryFlagsCopy: Record<string, unknown> = JSON.parse(
  JSON.stringify(commerceAppConfigCountries[parentCountry]?.featureFlags ?? {})
);
const territoryCommerceFlags = commerceAppConfigCountries[region]?.featureFlags;
if (territoryCommerceFlags) {
  for (const key of Object.keys(territoryCommerceFlags)) {
    territoryFlagsCopy[key] = territoryCommerceFlags[key as ...];
  }
}
return territoryFlagsCopy;
```

Territory inheritance rules (**CONFIRMED**):

| Aspect | Behaviour |
|---|---|
| Trigger | A country entry having a `parentCountry` key makes it a "territory" |
| Merge | Shallow key-level override of the parent's flags (deep-cloned first via `JSON.parse(JSON.stringify(...))`) |
| Depth | One level only — no grandparent chain |
| Opt out | `shouldInheritFromParent: false` returns only the territory's own flags |
| Default | `shouldInheritFromParent = true` |

For ESPN this means: `PR` (Puerto Rico) inherits everything `US` has and overrides only what it
declares. Since `PR` declares `showIdentityUnifiedLicensePlateFlow: false` but no
`licensePlateFlowNavigation`, it inherits the US license-plate nav map.

**`useCommerceRegionFeatureFlags`** — region resolution + a region-drift alarm
(`use-commerce-region-feature-flags.tsx:70-107`):

```ts
const commerceAppConfig = useAtomValue(commerceAppConfigAtom);
// TODO WEB-7298: Handle when the region is changed to no longer match the server-side value.
const atomRegion = useAtomValue(regionAtom);
...
if (lastObservedLocation && lastObservedLocation !== atomRegion) {
  datadogRum.addError(new Error('USE_COMMERCE_FEATURE_FLAG – REGION_CHANGED'), {
    owner: Owners.CORE,
    message: 'The region value changed during the render cycle of useCommerceFeatureFlag, ...',
```

So a region change mid-render is a known, *reported but unhandled* hazard (WEB-7298). **CONFIRMED**

**`useCommerceFeatureFlag`** — the read API
(`packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-feature-flag.tsx:14-33`):

```ts
export function useCommerceFeatureFlag<T = unknown>({
  featureName, fallbackValue, region, shouldInheritFromParent = true,
}: { featureName: string; fallbackValue: T; region?: RegionSubtag; shouldInheritFromParent?: boolean }) {
  const commerceRegionFeatureFlags = useCommerceRegionFeatureFlags(region, shouldInheritFromParent);
  const flagValue = commerceRegionFeatureFlags[featureName] as T;
  return flagValue ?? fallbackValue;
}
```

Note `??` — only `null`/`undefined` fall back, so an explicit `false` in config wins over a `true`
fallback. **CONFIRMED**

**`LocalizedFeatureFlag`** — the render-gate component
(`packages/cgi/commerce-base/src/common/components/localized/feature-flag/feature-flag.tsx:3-41`):

```tsx
/**
 * Renders a child component when the commerce feature flag is of the expected value.
 * Feature flag values are pulled in from commerceAppConfig.countries[businessRegion][Territory or Country].feature-flags.
 *
 * The territory values will use the parent country's values, but can override if specified for the territory.
 * Set flag values in disneyplus-remote-app-config like this example: ...
 */
export function LocalizedFeatureFlag({ children, featureName, filter }) {
  const currentFlagValue = useCommerceFeatureFlag<unknown>({ featureName, fallbackValue: null });
  if (!filter && currentFlagValue) return <>{children}</>;
  if (filter?.(currentFlagValue)) return <>{children}</>;
  return null;
}
```

- `fallbackValue: null` — hard-coded. `LocalizedFeatureFlag` is **fail-closed**.
- `filter` lets you gate on a non-boolean value (e.g. array membership).
- Note the doc-comment still points at `disneyplus-remote-app-config`; the actual source for commerce
  is now Sparrow (see §5). **INFERRED (stale comment)**

### 1.3 The commerce app-config shape

`packages/cgi/commerce-utils/src/app-config/models/app-config.ts:9-12`:

```ts
export type CommerceAppConfig = FeatureConfigurationScope &
  FeatureFlagsScope & CountriesScope & PathsScope;
```

Four Sparrow *scopes*. The relevant ones:

| Scope | Key | Contains | File |
|---|---|---|---|
| `feature-flags` | `feature-flags.general` | ~120 global camelCase booleans (route enablement, kill switches) | `models/feature-flags-scope.ts:10-131` |
| `feature-configuration` | `.general`, `.analytics`, `.dictionary`, `.oneTrust`, `.sdk` | tenant identity, dictionary tenant/versions, OneTrust ids, SDK client ids | `models/feature-configuration-scope.ts:212-226` |
| `countries` | `countries.{NA\|EMEA\|APAC\|LATAM}.<CC>` | per-country `featureFlags`, `footer`, `parentCountry` | `models/countries-scope.ts:241-254` |
| `paths` | `paths.paths.*` | tenant URLs | ESPN fixture `…/espn/sparrow-commerce-espn-workspace.ts:453-529` |

`getAppConfigCountries` flattens the four business regions into one lookup, **NA last so NA wins on
key collision** (`packages/cgi/commerce-utils/src/app-config/utils/get-app-config-countries.ts:3-10`):

```ts
return {
  ...commerceAppConfig.countries.APAC,
  ...commerceAppConfig.countries.EMEA,
  ...commerceAppConfig.countries.LATAM,
  ...commerceAppConfig.countries.NA,
};
```

Per-country flag surface actually consumed by CUP
(`packages/cgi/commerce-utils/src/app-config/models/countries-scope.ts:189-224`) —
*"These are the fields CUP currently uses from the Country object in the Commerce Config."*:
`adsTierEnabled`, `cmpEnableBrowserLang`, `enableCMP`, `enableGlobalFooter`,
`enableOneIdLegalFooterLinks`, `licensePlateFlowNavigation`, `licensePlateSignUpURL`,
`promotionalOffers`, `requiresActiveReview`, `requiresForcedSubscriberAgreement`, `sellsBundle`,
`sellsComboPlusBundle`, `showCommerceTiara`, `showCommerceUnifiedSubscriberAgreementCheckbox`,
`showIdentityUnifiedLicensePlateFlow`, `specialOfferEnabled`, `specialOfferProduct`.

### 1.4 Route enablement (the ESPN-visible use of Sparrow flags)

`packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts:65-86`:

```ts
export function isRouteEnabled({ featureFlagName }: { featureFlagName: RouteEnablingFeatureFlags }) {
  return function _isRouteEnabled(commerceAppConfig) {
    const { 'feature-flags': { general: featureConfig } } = commerceAppConfig;
    const isFlaggedRouteEnabled = featureConfig[featureFlagName as ...];
    if (isFlaggedRouteEnabled) return {};
    return { notFound: true };
  };
}
```

44 flag names are allowlisted in `RouteEnablingFeatureFlagsList` (lines 5-49). A disabled route
returns Next.js `notFound: true` → 404. Wired per ESPN page, e.g.
`apps/commerce/espn/pages/commerce/plans/index.page.tsx:26-29`:

```ts
export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedPlans' }),
  getLayoutConfigProp,
]);
```

**Gotcha (CONFIRMED)**: in the checked-in ESPN Sparrow fixture, `enableCommerceUnifiedPlans: false`
and `enableCommerceUnifiedPurchase: false`
(`packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:20-21`).
So `/commerce/plans` 404s under the default QA fixture. Local dev / tests that hit that route must
override the flag.

### 1.5 ESPN-relevant flag inventory

#### WeaponX (`wpnx-*`) flags with ESPN in the name — **CONFIRMED**

| Flag | Where | What it does |
|---|---|---|
| `wpnx-enable-legacy-analytics-espn` | `packages/cgi/commerce-base/src/common/hooks/use-is-espn-legacy-analytics-enabled.tsx:16` | Billing page only: use legacy `adobeAnalyticsTrack()` instead of CoreAnalytics `analytics.track()`, **ESPN only** |
| `wpnx-web-identity-enable-begin-espn-route` | `packages/cgi/commerce-base/src/identity/loading/lib/is-dynamic-url-slug-enabled.ts:14` (`espn: '…'`) | Enables the dynamic `/identity/begin/<slug>` route for the ESPN slug |
| `wpnx-web-identity-magicLink-espnActivations` | `packages/cgi/commerce-base/src/identity/magic-link/pages/magic-link-page.tsx:204` | Magic-link → ESPN activation handoff |
| `wpnx-ESPN-Banner-Payment-Retry` | `packages/cgi/commerce-base/src/common/oneid/__fixtures__/exchangeIdTokenForAccessTokenSuccess.json:53`; `apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/shared/mocks/exchange-id-token-for-access-token.json:53` | **Fixture-only in cgi-web.** Appears in the SDK `experiments` array with `variantId: "control"`. No consuming code in this repo → live experiment owned elsewhere, or already retired. |
| `wpnx-disney-nav-espn` | `packages/identity-auth/src/common/services/IPSE/hooks/__fixtures__/login-with-magic-link/*.json:836` | Fixture-only in cgi-web |

#### Shared WeaponX flags that affect ESPN (ESPN uses the SDK, so all of these can apply) — **CONFIRMED that the flags exist and are read; INFERRED that ESPN is in scope per-flag**

| Flag | Consumer | Notes |
|---|---|---|
| `wpnx-web-tab-flagship` | `use-is-flagship-enabled.tsx:12` | Doc-comment: *"checking the status of the WeaponX flag for **Disney+ and ESPN**"* — Flagship = ESPN Unlimited |
| `wpnx-add-on-step` | `use-is-in-flagship-addon-suf-experiment.tsx:17` | Add-on step in Sign Up Flow; treatment id `'add-on-step'`; excludes license-plate users |
| `wpnx-use-privacy-consent-package` | `apps/commerce/espn/src/common/layouts/utils/render-consent.tsx:70`, `apps/commerce/espn/src/layout/espn-layout.tsx:51` | Chooses `@solo/privacy-consent` vs legacy `<OneTrust>` |
| `wpnx-one-click-reconnect` | `use-one-click-reconnect-experiment.ts:3` | 4 variants incl. control |
| `wpnx-next-best-offer-us` | `use-nbo-image-carousel-experiment.ts:3` | US-scoped by name |
| `wpnx-is-delta-bundle` / `wpnx-is-delta-standalone` | `use-is-in-delta-bundle-experiment.tsx:3`, `use-is-in-delta-standalone-experiment.tsx` | Read from **session experiments**, not flags (see §2.2) |
| `wpnx-great-copy*` (prefix) | `use-copy-override-experiment.tsx:11` | Object-valued copy-override flags |
| `wpnx-identity-consent-sync` | `use-consent-config.tsx:54` | `?.enabled === true` — object-valued |
| `wpnx-student-verification` | hardcoded `true` in the SDK-disabled branch, `use-mystique-feature-flags.ts:51` | Country-gates student verification |
| `wpnx-web-identity-account-home-header-dd` | `use-mystique-feature-flags.ts:47` | Comment warns: *"careful, this affects not just account home, but every page that uses SiteNavLinks"* |
| `wpnx-web-commerce-unblocking`, `wpnx-web-commerce-gift-card`, `wpnx-web-commerce-membership-pause`, `wpnx-web-identity-useLoggedInDataInterface` | `use-mystique-feature-flags.ts:41-52` | Also part of the SDK-disabled fallback literal |

Full de-duplicated inventory of `wpnx-*` flags referenced from `packages/cgi/commerce-base/src` +
`apps/commerce` (non-test, non-fixture) is 101 names. Highest-cardinality names across the whole repo
(incl. tests/fixtures): `wpnx-web-profiles-setup-primary-profile` (72),
`wpnx-use-privacy-consent-package` (47), `wpnx-web-identity-account-home-header-dd` (35),
`wpnx-web-profiles-loading-redirects` (33), `wpnx-useWebAdBlockerDetectionEnabled` (33). **CONFIRMED**

#### ESPN Sparrow `feature-flags.general` values (checked-in QA fixture) — **CONFIRMED**

`packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:6-56`

| Flag | ESPN QA value | Notable |
|---|---|---|
| `enableEspnInternalActivation` | `true` | **ESPN-only flag.** Doc: *"Enables the ESPN Internal Activation flow (query-param-driven redirect to an external provider login and back to the activation callback)."* (`models/feature-flags-scope.ts:61-63`) |
| `enableCommerceUnifiedPlans` | `false` | `/commerce/plans` 404s |
| `enableCommerceUnifiedPurchase` | `false` | |
| `enableCommerceUnifiedWelcomeBack` | `false` | |
| `enableCommerceUnifiedSignupFlow` | `true` | |
| `enableCommerceUnifiedStudentRoute` | `true` | ESPN student verification |
| `enableSignUpFlowAddOnsRoute` | `true` | Add-ons (PPV / MLB.tv) |
| `enableSignUpFlowCadenceRoute` | `true` | Monthly/annual |
| `enableFlexPoweredActivationLandingPage` | `true` | |
| `enableDictionaryDraftState` / `enableDictionaryOptimization` | `true` / `true` | |
| `enableOffersParamConversion` | `true` | |
| `enableGiftCard` | `false` | but per-country `enableGiftCardForCountry: true` in the legacy remote config |
| `enableIdentityUnifiedLicensePlateFlow` | `false` | |
| `enableTenantSpecificHeader` | `false` | |

### 1.6 The `wpnx-` naming convention

**CONFIRMED (observed) / INFERRED (rationale)**

- `wpnx` = **W**ea**p**o**nX**, Disney's experimentation/flag platform. The prefix is the platform
  namespace, not part of the flag semantics.
- Observed sub-conventions, in rough order of prevalence:
  - `wpnx-web-<domain>-<feature>` — the most disciplined form.
    `<domain>` ∈ `commerce | identity | profiles | payret | merch | adyen | eu | tab | milestone`.
    Examples: `wpnx-web-commerce-regulated-cancel`, `wpnx-web-identity-profile-transfer`,
    `wpnx-web-profiles-select-profile`, `wpnx-web-payret-ravelin`.
  - `wpnx-<TICKET-ID>-<slug>` — ticket-anchored experiments:
    `wpnx-2022-Q3-RET-276-Update-Payment-Clicks`, `wpnx-commerce-WEB-4561-arielCancelSave`,
    `wpnx-WPNX-3786-original-version`.
  - `wpnx-<PROGRAM>-<slug>` — program-anchored: `wpnx-GREAT-D`, `wpnx-great-copy`,
    `wpnx-GREAT-Account-Switch-LedgerV2`, `wpnx-GREAT-Tax-Fields-on-PayPal-Form.`
  - `wpnx-<TENANT>-<slug>` — tenant-anchored: `wpnx-ESPN-Banner-Payment-Retry`,
    `wpnx-enable-legacy-analytics-espn`, `wpnx-disney-nav-espn`.
  - Ad-hoc / short-lived: `wpnx-my-feature-flag`, `wpnx-anmeen-flag-1`, `wpnx-bbd-test-featureflag`,
    `wpnx-jaro-prod-test`.
- **Casing is not normalized** — `wpnx-web-eu-withdrawal` vs `wpnx-GREAT-D` vs
  `wpnx-useWebPlaybackExperienceOverrides` vs `wpnx-webMainApp-Nielsen`. Lookups are exact-match
  string keys against the SDK object, so casing must match the WeaponX console exactly.
- Two real hazards visible in the repo: a trailing period
  (`wpnx-GREAT-Tax-Fields-on-PayPal-Form.`, `wpnx-pre-select-plan-select.`) and a double prefix
  (`wpnx-wpnx-web-commerce-br-mp-typing`). Both are legitimate flag names that must be typed exactly.

---

## 2. Experiments (WeaponX)

There is **no** central experiment registry, framework, or `getExperimentTreatment` helper in this
repo. Experiments are hand-rolled hooks in
`packages/cgi/commerce-base/src/common/hooks/experiments/` (owner `@cgi-client/xd`, per
`packages/cgi/AGENTS.md:64`). **CONFIRMED**

### 2.1 Canonical hook shape — flag-based (the dominant pattern)

`packages/cgi/commerce-base/src/common/hooks/experiments/use-one-click-reconnect-experiment.ts`
(the best-documented example):

```ts
import { useMystiqueFeatureFlags } from '../use-mystique-feature-flags';

export const FEATURE_ID = 'wpnx-one-click-reconnect';

export enum OneClickReconnectVariant {
  CONTROL = 'control',
  ALL_LAPSED_SUBS = 'one-click-reconnect-all-lapsed-subs',
  LAPSED_BUNDLE_ONLY = 'one-click-reconnect-lapsed-bundle-only',
  ALL_LAPSED_SUBS_BASE_TEMPLATE = 'one-click-reconnect-all-lapsed-subs-base-template',
}

/**
 * ... TODO: GCIEX-12842 - Clean up/Productionalize One Click Reconnect.
 */
export function useOneClickReconnectExperiment() {
  const { data } = useMystiqueFeatureFlags();
  const variant = data?.[FEATURE_ID] as OneClickReconnectVariant | undefined;

  return {
    isOneClickReconnectOptimized:
      variant === OneClickReconnectVariant.ALL_LAPSED_SUBS ||
      variant === OneClickReconnectVariant.LAPSED_BUNDLE_ONLY,
    isBaseTemplateTreatment:
      variant === OneClickReconnectVariant.ALL_LAPSED_SUBS_BASE_TEMPLATE,
  };
}
```

The invariant parts:

1. `export const FEATURE_ID = 'wpnx-…'` — the flag/experiment id, exported so tests and callers share it.
2. Variants as an `enum` (or inline string literals in older hooks).
3. Read from `useMystiqueFeatureFlags().data?.[FEATURE_ID]`, cast to `Variant | undefined`.
4. Return **derived booleans**, not the raw variant — so callers can't accidentally string-compare.
5. A `TODO: <TICKET> - Clean up/Productionalize <name>` comment. This is the repo's only lifecycle
   tracking mechanism.

### 2.2 Second shape — session-assignment-based

`packages/cgi/commerce-base/src/common/hooks/experiments/use-is-in-delta-bundle-experiment.tsx:3-25`:

```ts
export const FEATURE_ID = 'wpnx-is-delta-bundle';
export const VARIANT_ID = 'enabled';

export function useIsInDeltaBundleExperiment({ enabled }: { enabled?: boolean } = {}): boolean {
  const { data, isSuccess } = useSessionInfo({ enabled });
  let deltaBundleExperiment;
  const experiments = data?.experiments;
  if (isSuccess && experiments) {
    deltaBundleExperiment = Array.isArray(experiments)
      ? experiments.find((exp) => exp.featureId === FEATURE_ID)
      : experiments?.[FEATURE_ID];
  }
  return deltaBundleExperiment?.variantId === VARIANT_ID;
}
```

Here the source is `sessionInfo.experiments`, **not** the flags object — an array-or-map union that
must be handled both ways. The real payload shape
(`packages/cgi/commerce-base/src/common/oneid/__fixtures__/exchangeIdTokenForAccessTokenSuccess.json:46-58`):

```json
"experiments": [
  { "featureId": "wpnx-WebCommerce-PPV-MonthlyOffer", "variantId": "control", "version": 1 },
  { "featureId": "wpnx-ESPN-Banner-Payment-Retry",    "variantId": "control", "version": 1 },
  { "featureId": "wpnx-jaro-prod-test",               "variantId": "jaro_variant", "version": 1 }
]
```

→ **`featureId` + `variantId` + `version`** is the assignment record. **CONFIRMED**

The ESPN data interface normalizes it
(`packages/cgi/data-interface-espn/src/experimentation/helpers/get-experiment-assignments.ts:1-21`):

```ts
export const getExperimentAssignments = async (sdkSession: SDKSession) => {
  const sessionInfo = await sdkSession.getSessionInfo();
  const experiments = sessionInfo?.experiments;
  let experimentAssignments: Record<string, Experiment> | undefined = undefined;
  if (experiments) {
    if (Array.isArray(experiments)) {
      experimentAssignments = {};
      for (const experiment of experiments) {
        experimentAssignments[experiment.featureId] = experiment;
      }
    } else { experimentAssignments = experiments; }
  }
  return experimentAssignments;
};
```

Exposed as `getExperimentAssignments` on the data interface
(`packages/cgi/data-interface-espn/src/experimentation/experimentation-data-interface.ts:4-10`).

### 2.3 WeaponX vs Spearmint — the tenant split

`packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx:81-96`:

```ts
/**
 * Combines copy override mappings from both WeaponX (Disney+/ESPN) and
 * Spearmint (Hulu) experimentation systems.
 *
 * For Hulu: WeaponX overrides will be empty (SDK disabled), Spearmint overrides active.
 * For Disney+/ESPN: Spearmint overrides will be empty (no cookie), WeaponX overrides active.
 */
export function useExperimentalCopyOverrides(): CopyOverrideMapping {
  const weaponXOverrides = useWeaponXCopyOverrides();
  const spearmintOverrides = useSpearmintCopyOverrides();
  return useMemo(() => ({ ...weaponXOverrides, ...spearmintOverrides }), [...]);
}
```

**ESPN → WeaponX. Hulu → Spearmint. Disney+ → WeaponX.** **CONFIRMED**

Spearmint's generic hook is `useSpearmintExperiment`
(`packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-experiment.ts:27-83`), which
takes `{ experimentCtx: { featureId, defaultState }, observabilityCtx, processVariant }` and calls
`dataInterface.getExperimentAssignments()`. It is more structured than the WeaponX hooks — it sets a
Datadog global context property per experiment (lines 52-58):

```ts
datadogRum.setGlobalContextProperty(featureId, {
  experimentFeatureID: featureId, owner, sourceComponent, treatment: variant,
});
```

Note the word **`treatment`** appears in this Datadog payload — that's the observability field name,
not a code API. **CONFIRMED**

### 2.4 Every ESPN experiment reference in the repo, by name

| Name | Kind | Cite | Status |
|---|---|---|---|
| `wpnx-ESPN-Banner-Payment-Retry` | Session assignment | `packages/cgi/commerce-base/src/common/oneid/__fixtures__/exchangeIdTokenForAccessTokenSuccess.json:53`; `apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/shared/mocks/exchange-id-token-for-access-token.json:53` | **Fixture only** — no consuming code in cgi-web |
| `wpnx-WebCommerce-PPV-MonthlyOffer` | Session assignment | same fixture, line 49 | Fixture only; PPV is ESPN-specific merch |
| `wpnx-WebCommerce-PPV-ABC-UFC298-16717` | Session assignment | same fixture, line 69 | Fixture only; UFC PPV = ESPN |
| `wpnx-add-on-step` | Flag experiment | `use-is-in-flagship-addon-suf-experiment.tsx:17`; PW handlers `packages/cgi/commerce-base/src/test/playwright-utils/mystique-feature-flag-handler.ts:19-27` | Live. Treatment `'add-on-step'` vs `'control'`. Flagship = ESPN Unlimited |
| `wpnx-web-tab-flagship` | Flag | `use-is-flagship-enabled.tsx:12` | Live, explicitly "Disney+ and ESPN" |
| `wpnx-enable-legacy-analytics-espn` | Flag | `use-is-espn-legacy-analytics-enabled.tsx:16` | Live, ESPN-only, billing page |
| `wpnx-next-best-offer-us` | Flag experiment | `use-nbo-image-carousel-experiment.ts:3` | Live; `TODO: GCIEX-1209` cleanup |
| `wpnx-one-click-reconnect` | Flag experiment | `use-one-click-reconnect-experiment.ts:3` | Live; `TODO: GCIEX-12842` cleanup |
| `wpnx-web-identity-magicLink-espnActivations` | Flag | `packages/cgi/commerce-base/src/identity/magic-link/pages/magic-link-page.tsx:204` | Live |
| `wpnx-web-identity-enable-begin-espn-route` | Flag | `packages/cgi/commerce-base/src/identity/loading/lib/is-dynamic-url-slug-enabled.ts:14` | Live |
| `enableEspnInternalActivation` | **Sparrow** flag (not WeaponX) | `packages/cgi/commerce-utils/src/app-config/models/feature-flags-scope.ts:63`; ESPN fixture line 32; `apps/commerce/espn/playwright/tests/flows/espn-internal-activation.spec.ts` | **Productionalized as a Sparrow config flag** — the end-state of the lifecycle (see §2.6) |

No `wpnx-ESPN-*` flag other than `wpnx-ESPN-Banner-Payment-Retry` exists anywhere in the repo.
**CONFIRMED**

### 2.5 Copy-override experiments (a distinct, object-valued flag family)

`packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx:11-79`:

```ts
export const FEATURE_FLAG_ID_PREFIX = 'wpnx-great-copy';

/**
 * All feature flags with the id prefix 'wpnx-great-copy' will return an object
 * as the flag value. These objects will contain a boolean 'hasOverrides'.
 * If 'hasOverrides' is false, this is the control treatment for the experiment.
 * If 'hasOverrides', then it will also contain a key/value pairs where the key is
 * an original cypher key, and the value is the experimental cypher key replacement.
 * ...
 */
```

Mechanics (**CONFIRMED**):

- Iterates **every** flag, matching by *prefix*, so multiple concurrent copy experiments merge.
- Duplicate-key collision detection: if two copy flags override the same cypher key, the *later*
  flag is dropped and a Datadog error is raised — `'EXP COPY OVERRIDE – DUPLICATE EXPERIMENTAL KEY'`
  with `owner: Owners.XD` and *"The flag ${featureId} was ignored."* (lines 47-57).
- Active experiment ids are published to Datadog as
  `datadogRum.setGlobalContextProperty('copy_override_experiments', […])` (lines 68-73).
- Consumed transparently inside `useDictionary` — see §4.2.

### 2.6 Lifecycle: initialize → run → productionalize → clean up

There is **no lifecycle document in the repo**. The lifecycle is reconstructed from consistent code
patterns. **INFERRED (from CONFIRMED evidence)**

**Initialize.** Create the flag in the WeaponX console. Add a hook under
`packages/cgi/commerce-base/src/common/hooks/experiments/` exporting `FEATURE_ID` and a variant enum.
Add a `TODO: <TICKET> - Clean up/Productionalize <name>` comment. Add MSW handlers so both arms are
testable — the pattern is
`packages/cgi/commerce-base/src/test/playwright-utils/mystique-feature-flag-handler.ts:13-27`:

```ts
export function createMystiqueFeatureFlagHandler(flags: FeatureFlags): RequestHandler {
  return http.get('*/mystique/feature-flags*', () => HttpResponse.json(flags));
}
export const enableFlagshipAddonSufExperimentHandler =
  createMystiqueFeatureFlagHandler({ 'wpnx-add-on-step': 'add-on-step' });
export const disableFlagshipAddonSufExperimentHandler =
  createMystiqueFeatureFlagHandler({ 'wpnx-add-on-step': 'control' });
```

For Jest, `packages/cgi/commerce-base/src/test/setup/jest.mock-mystique-feature-flags.ts` mocks the
whole hook with a fixed flag map (note its own `// TODO: remove this whole setup file after WEB-18271`).

**Run.** Flag values arrive via the SDK bootstrap. Assignment is done by WeaponX, not by client code —
there is zero bucketing/hashing logic in cgi-web. Observability is per-experiment Datadog context
(`use-spearmint-experiment.ts:52-58`, `use-copy-override-experiment.tsx:68-73`).

**Productionalize.** Concretely means: *stop asking WeaponX, start asking the business config.* The
`wpnx-*` conditional is deleted and replaced by either
(a) a **Sparrow `feature-flags.general` flag** (`enableEspnInternalActivation` is the exemplar:
it lives in `feature-flags-scope.ts:61-63`, is `true` in the ESPN fixture, and gates real code at
`packages/cgi/commerce-base/src/transactional/activation/pages/activation-page.tsx:57`), or
(b) a **per-country `countries.<CC>.featureFlags`** entry when the winner should only apply to some
markets, or
(c) **unconditional code**, when the winner is global.

There is a **`partnerName` rule** worth flagging: the WeaponX/session `partnerName` value is
`'disney'` even in ESPN-context fixtures for the *identity/orchestration* payloads
(`packages/remote-config/src/testing-utils/espn/qa.json:2004` → `"partnerName": "disney"`;
`apps/marketing-unified/espn/src/mocks/apis/orchestration-register-device.json:17,72` →
`"disney"`), while the *marketing* ESPN OneID mock uses `"partnerName": "espn"`
(`apps/marketing-unified/espn/src/shared/layout/page-layout/oneid/shared/mocks/exchange-id-token-for-access-token.json:87`).
Separately, the **Sparrow analytics scope** carries `partner: 'espn'` for ESPN
(ESPN fixture line 154) and `partner: 'disney'` for Disney+
(`packages/remote-config/src/testing-utils/disney-plus/qa.json` → `remoteAppConfig.partner: "disney"`).
So **`partnerName` (session/device) and `partner` (analytics config) are different fields with
different values** and cannot be used interchangeably to identify the tenant. Prefer
`feature-configuration.general.name` (`'Disney+' | 'ESPN' | 'Hulu'`,
`models/feature-configuration-scope.ts:72`) or `feature-configuration.analytics.partner` for
tenant-conditional business rules. **CONFIRMED (values) / INFERRED (guidance)**

**Clean up.** Delete the hook + its `FEATURE_ID`/enum, delete the MSW handlers, delete the `TODO`,
delete the flag from the WeaponX console. Cleanup tickets currently outstanding in-repo (searchable
by `TODO`): `GCIEX-12842` (One Click Reconnect), `GCIEX-1209` (NBO US Mobile carousel),
`GREAT-541` (Flagship Add-on step in SUF), `WEB-24082` (Skip Welcome Back — both flags),
`GREAT-572` (`installmentOptions` on `FlexFeatureStackOfferModel`),
`GREAT-684` (`featuresHeader` on `FlexFeatureOfferModel`),
`GCIEX-12743` (`useStandardPriceStyle` on `FlexCompactOffer`),
`WEB-29819` (`wpnx-web-commerce-unblocking`),
`WEB-37421` (`wpnx-web-identity-useLoggedInDataInterface`).
**Cleanup is not just hook deletion — experiment-shaped *fields* leak into the Flex offer models** and
have their own cleanup tickets. **CONFIRMED**

### 2.7 The "treatment undefined" trap

**CONFIRMED by code shape across every hook.**

Every WeaponX experiment hook does `data?.[FEATURE_ID]` and compares the result against an expected
treatment string. `data` is `undefined` in at least four distinct situations:

1. The react-query hasn't run yet — `enabled: isReady` gates on SDK readiness
   (`use-mystique-feature-flags.ts:54`).
2. The SDK is disabled — the hook returns the hardcoded literal, which contains **only 6 keys**
   (lines 40-52). Every other flag is `undefined`.
3. The flag exists in WeaponX but the user is not enrolled — WeaponX omits the key entirely.
4. `sdkSession.getFeatureFlags()` threw — `useErrorBoundary: false`, so `data` stays `undefined`.

In all four cases `variant === 'some-treatment'` is `false`, so the caller silently renders **control**.
Consequences:

- **You cannot distinguish "control arm" from "no data yet" from "SDK broken."** A hook returning
  `false` is ambiguous. `useOneClickReconnectExperiment` returns *two* booleans that can both be
  `false` for three different reasons.
- **First-render flash.** Because the hook is a react-query with `enabled: isReady`, the first render
  is always control. Any experiment that changes above-the-fold layout will flash control → treatment.
- **Loose comparisons hide typos.** `useIsInTurkeyComparisonChartExperiment` does
  `Boolean(data?.['wpnx-In-Funnel-Comp-Chart-Descending-Turkey'])`
  (`use-is-in-turkey-comparison-chart-experiment.ts:11`) — a typo'd key and a genuine `false`
  are indistinguishable, and a *string* variant like `'control'` would evaluate **truthy**.
- **Mitigation used in the repo**: return derived, named booleans rather than the variant, and where
  a real default matters, use the Spearmint pattern's explicit `defaultState`
  (`use-spearmint-experiment.ts:28,74` — `setExperimentState(defaultState)` in the catch).

---

## 3. Region & globalization

### 3.1 The region atoms

`packages/cgi/commerce-base/src/common/i18n/geo/atoms/geo.ts`

Four *physical* region inputs, one derived physical atom, one home-location atom, one final `regionAtom`.

| Atom | Line | Source | Exported? |
|---|---|---|---|
| `cdnPhysicalRegionAtom` | 15 | *"set automatically by the CDN (Akamai)"* | `@private` |
| `headerOverridePhysicalRegionAtom` | 23 | *"set with the `dss-physical-country` header"* | `@private` |
| `sdkPhysicalLocationAtom` | 32 | *"set by an upstream service (location-service) and accessed via the SDK"* | yes |
| `physicalRegionAtom` | 41 | derived; *"the only physical region atom that should be exported and used"* | yes |
| `sdkHomeLocationAtom` | 58 | *"derived from a manual override, the purchase location, and the registration location"* | yes |
| `sdkPortabilityLocationAtom` | 64 | *"determines portability eligibility for EU users … traveling to other EU countries"* | yes |
| `regionAtom` | 81 | derived; the primary API | yes |

`physicalRegionAtom` precedence (lines 41-52):

```ts
export const physicalRegionAtom = atom((get) => {
  const headerPhysicalRegion = get(headerOverridePhysicalRegionAtom);
  const sdkPhysicalRegion = get(sdkPhysicalLocationAtom);
  const cdnPhysicalRegion = get(cdnPhysicalRegionAtom);
  return headerPhysicalRegion || sdkPhysicalRegion || cdnPhysicalRegion || defaultRegion;
});
```

`regionAtom` (lines 69-86), doc-comment verbatim:

```
 * The priority of regions/locations returned for regionAtom is:
 *   1. SDK Home Location
 *   2. Header Override Physical Region
 *   3. SDK Physical Location
 *   4. CDN Physical Region
 *   5. Default Region
 * See more info about region values in this wiki: https://confluence.disney.com/display/WEBENG/Region+values.
```

```ts
export const regionAtom = atom((get) => {
  const homeRegion = get(sdkHomeLocationAtom);
  const physicalRegion = get(physicalRegionAtom);
  return homeRegion || physicalRegion;
});
```

**Default region is `'US'`** — `packages/cgi/commerce-base/src/common/i18n/geo/constants.ts:3`:

```ts
export const defaultRegion = 'US' as RegionSubtag;
```

Hydration from SSR: `useHydrateGeo({ regionFromCDN, regionFromUserOverride, languageDirection })`
(`geo.ts:104-135`) — note it hydrates only the CDN and header-override atoms plus direction; the SDK
atoms are filled client-side once the session resolves. **CONFIRMED**

`RegionSubtag` is the full IANA subtag registry (`geo/models/regions.ts:6-311`) — ~280 codes including
numeric macro-regions (`'419'` = Latin America, `'150'` = Europe). It is *not* a launched-markets list;
it is a validation type.

### 3.2 Business regions — the LATAM/EMEA/APAC/NA grouping

Two parallel representations. **CONFIRMED**

**(a) `BusinessRegion` enum** — the Sparrow *countries* scope key
(`packages/cgi/commerce-utils/src/app-config/models/countries-scope.ts:231-239`):

```ts
export const BusinessRegion = { NA: 'NA', EMEA: 'EMEA', APAC: 'APAC', LATAM: 'LATAM' } as const;
```

Country membership is a compile-time union per region (same file):
`NACountryCodes` lines 2-11 — `AS | CA | GU | MH | MP | PR | UM | US | VI`;
`EMEACountryCodes` lines 12-110 (~99 codes);
`APACCountryCodes` lines 111-128 — `AU | CC | CK | CX | HK | ID | JP | KR | MY | NF | NU | NZ | PH | SG | TH | TK | TW`;
`LATAMCountryCodes` lines 129-161 (~31 codes).
Header comment line 1: *"The currently supported countries in Sparrow"*.

> **APAC/EMEA gotcha (CONFIRMED)**: `AU` and `NZ` are in **APAC** in this type. Prior research in
> another repo concluded AU/NZ are handled as EMEA on the Flex side. Both can be true — they are
> different systems. Do not port the assumption across repos.

Region lookup (`packages/cgi/commerce-utils/src/app-config/utils/get-business-region.ts:8-26`):

```ts
export function getBusinessRegionFromPhysicalRegion(
  physicalRegion: string, commerceAppConfig: CommerceAppConfig
): BusinessRegion | undefined {
  const countries = commerceAppConfig.countries;
  for (const businessRegion of Object.values(BusinessRegion)) {
    const businessRegionCountries = countries[businessRegion];
    if (businessRegionCountries && physicalRegion in businessRegionCountries) return businessRegion;
  }
  return; // If config is not available or region is not found, return undefined.
}
```

Note this is driven by the **config's actual contents**, not the type — so for ESPN, whose config only
has `NA`, any non-NA country returns `undefined`.

**(b) `group` string** — in the legacy remote-app-config country entries.
Distinct values observed: `"APAC" | "EMEA" | "North America" | "LATAM" | "Marvel"`
(computed from `packages/remote-config/src/testing-utils/disney-plus/qa.json`). ESPN's only value is
`"North America"` (from `packages/remote-config/src/testing-utils/espn/qa.json`). `group` is carried
through `getSlimCountries` (`packages/remote-config/src/server-utils/get-slim-remote-config.ts:103-113`).
A related `featureConfig.adobeLaunchRegion` uses the same vocabulary:
`'North America' | 'EMEA' | 'APAC' | 'LATAM'` (`countries-scope.ts:190-192`). **CONFIRMED**

**Region-based defaults with per-country override — the canonical pattern**
(`packages/cgi/commerce-utils/src/app-config/utils/is-global-footer-enabled.ts:20-57`):

```ts
/**
 * Business regions where the global footer is launched and ON by default.
 * Individual countries can opt in or out regardless of their region via the
 * per-country `enableGlobalFooter` flag ...
 * Phase 2 (EMEA rollout — GCIEX-9845): add 'EMEA' here and set
 * enableGlobalFooter: false on the per-country config for the excluded markets (DE, FR).
 */
export const GLOBAL_FOOTER_REGIONS = new Set<BusinessRegion>(['NA']);

export function isGlobalFooterEnabled(commerceAppConfig, physicalRegion: string): boolean {
  const countryOverride = (getAppConfigCountries(commerceAppConfig) as ...)[physicalRegion]
    ?.featureFlags?.enableGlobalFooter;
  // A defined per-country flag (true or false) overrides the region default.
  if (countryOverride !== undefined) return countryOverride;
  const businessRegion = getBusinessRegionFromPhysicalRegion(physicalRegion, commerceAppConfig);
  return businessRegion ? GLOBAL_FOOTER_REGIONS.has(businessRegion) : false;
}
```

Resolution order: **explicit per-country value → business-region default → false**. Copy this pattern
for any new region-scoped rollout.

### 3.3 Which markets does ESPN operate in? — **CONFIRMED: US + 7 US territories**

Two independent configs agree.

**Proof 1 — the Sparrow commerce workspace (authoritative for CUP).**
`packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts`:

- Line 226-452: `countries: { NA: { … } }` — **`NA` is the only business region key present.**
- Country entries inside `NA`, at lines 228 / 252 / 276 / 301 / 325 / 339 / 364 / 427:
  `AS, GU, MH, MP, PR, UM, US, VI` — exactly 8.
- Every non-US entry carries `parentCountry: 'US'` (e.g. line 250, 274, 299).
- No `CA` entry, even though `CA` is a valid `NACountryCodes` member.

`US` (lines 364-426) is the only entry with `adsTierEnabled: true` (line 367) and
`sellsBundle: true` (line 407) and a full `licensePlateFlowNavigation` map (lines 369-406).

**Proof 2 — the legacy remote-app-config archive.**
`packages/remote-config/src/testing-utils/espn/qa.json` — `countries` keys are
`AS, GU, MH, MP, PR, UM, US, VI` (+ a `timeStamp` sibling). Every non-US has `parentCountry: "US"`.
`countries.US.group === "North America"`, `isEU: false`, `hasLaunched: true`,
`lang: "en-GB"`, `regionLanguages: ["en-GB"]`. `remoteAppConfig.partner === "espn"`,
`remoteAppConfig.dictionaryTenant === "espn"`.

For scale contrast, the same file for Disney+ has **244** country keys; Hulu has the **same 8** as ESPN.

Territory names: `AS` American Samoa, `GU` Guam, `MH` Marshall Islands, `MP` Northern Mariana Islands,
`PR` Puerto Rico, `UM` US Minor Outlying Islands, `VI` US Virgin Islands.

**Conclusion: ESPN commerce in cgi-web is US-only.** Any EMEA/APAC/LATAM code path is dead for ESPN.

### 3.4 Currency, locale, RTL

**Currency** — resolved from the Globalization Service, not from config
(`packages/cgi/commerce-base/src/common/services/globalization/hooks/use-currency-symbol.tsx:16-51`):

```ts
export function getCurrencySymbol(currencyCode, globalizationData, region): string {
  const symbolFromCurrencyCode = globalizationData.codesToSymbol.find(
    (item) => item.currencyCode === currencyCode)?.symbol;
  if (symbolFromCurrencyCode) return symbolFromCurrencyCode;
  const symbolFromRegion = globalizationData.regionToSymbol.find(
    (item) => item.region === region)?.symbol;
  if (symbolFromRegion) return symbolFromRegion;
  return '$';
}
```

Three-step fallback: currency code → region → literal `'$'`. `useCurrencySymbol` reads
`regionAtom` and returns `undefined` while globalization data loads (lines 42-51).
`globalizationServiceVersion` is `'1.x.x'` for ESPN (ESPN fixture line 158); fixtures exist for
v1.5 / v1.6 / v1.8 (`common/services/globalization/__fixtures__/`).

**Locale** — `useIntlLocale` composes `language-region`
(`packages/cgi/commerce-base/src/common/i18n/intl-locales/hooks/use-intl-locale.tsx:19-67`):

```ts
const [profileLang, profileLocale] = profileLanguage?.split('-') || [];
const fallbackLang = useAtomValue(serverProvidedLanguageAtom);
const fallbackLocale = useAtomValue(regionAtom);
const language = profileLang || fallbackLang;
const locale  = profileLocale || fallbackLocale;
...
const canonicalLocales = Intl.getCanonicalLocales(`${language}-${locale}`);
```

Precedence: **active-profile preferred language → server-provided language + `regionAtom`**. On an
`'Incorrect locale information provided'` error it falls back to `${defaultLang}-${defaultRegion}`
(line 46), i.e. effectively `en-US` for ESPN. Unknown errors rethrow. `@formatjs` polyfills are lazily
loaded and `isLocaleReady` gates render (lines 50-66).

**ESPN's supported languages** — ESPN fixture lines 160-169:

```ts
supportedLangsMap: {
  en:       { dict: 'en',      hreflang: 'en' },
  'es-419': { dict: 'es-419',  hreflang: 'es' },
} as SupportedLangsMap,
```

Confirmed by the type doc-comment (`models/feature-configuration-scope.ts:77-80`):
*"Currently, only Hulu and ESPN are on Sparrow, and only supports the `en` language for both, and
`es-419` for ESPN from the `SupportedLangsMap`."* **CONFIRMED**

> Interesting inconsistency: the legacy remote config lists `countries.US.lang: "en-GB"` for ESPN
> while Sparrow's `supportedLangsMap` has `en`. **Open question** — see §10.

**RTL** — two atoms, `'ltr'` default (`geo.ts:88-99`):

```ts
export const languageDirectionAtom = atom<'ltr' | 'rtl'>('ltr');
export const serverProvidedLanguageDirectionAtom = atom<'ltr' | 'rtl'>('ltr');
```

Set from SSR via `useHydrateGeo` (`geo.ts:126-132`) and updated client-side by
`language-redirect/components/language-redirect.tsx:34-36` off
`queries/use-language-direction-query.ts` (Globalization Service). Only two runtime consumers of
`languageDirectionAtom` exist (`profiles/common/components/localized-date-input/localized-date-input.tsx:72`
and its story). Styling convention is logical CSS properties (`ms-*`, `pe-*`, `start-*`) rather than
runtime direction checks, per `packages/cgi/AGENTS.md:146`.
**For ESPN (en + es-419, both LTR) the RTL path is never exercised.** **CONFIRMED (config) / INFERRED (never exercised)**

---

## 4. Dictionary / i18n (Cypher)

### 4.1 Namespaces and tenant

Namespaces (`packages/dictionary/src/models/dictionary.ts:4-20`):

```ts
/**
 * These dictionary names are used in a map to support an
 * "Edit in Cypher" link when debugging the dictionary on CUP.
 * If a dictionary name changes or a new dictionary is added,
 * please notify the Web Commerce platform team.
 */
export type DictionaryNames =
  | 'identity' | 'pcon' | 'unified-commerce' | 'unified-offers'
  | 'unified-commerce-onboarding' | 'application' | 'accessibility'
  | 'ratings' | 'seo';
```

ESPN loads six (`apps/commerce/espn/.env:6`):

```
REMOTE_DICTIONARIES_TO_LOAD=accessibility,identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding
```

Matching `dictionaryVersions` keys are enforced by the type
(`packages/cgi/commerce-utils/src/app-config/models/feature-configuration-scope.ts:200-210`) and set
for ESPN in Sparrow (ESPN fixture lines 59-69):

```ts
dictionary: {
  dictionaryTenant: 'espn',
  dictionaryVersions: {
    accessibility: '0.0', identity: '0.0', pcon: '0.0',
    'unified-commerce': '0.0', 'unified-commerce-onboarding': '0.0', 'unified-offers': '0.0',
  },
},
```

`DictionaryTenant = 'disney' | 'espn' | 'hulu'` (`packages/dictionary/src/models/dictionary.ts:51`).

### 4.2 `useDictionary` — resolution order and the missing-key signal

`packages/cgi/commerce-base/src/common/dictionary/context/use-dictionary.ts:27-59`:

```ts
export function useDictionary() {
  const config = useGetDefaultDictionaryConfig();
  const getDictionaryCallback = useDictionaryInternal(config);
  const featureCopy = useExperimentalCopyOverrides();

  return (key: string, { dictionary = 'unified-commerce' }: { dictionary?: DictionaryNames } = {}) => {
    const copyKey = featureCopy[key] || key;
    let dictionaryValue = getDictionaryCallback(copyKey, { dictionary });

    // The experimental key may live in a different namespace than this caller uses.
    // Fall back to the original key so we show control copy instead of blank text.
    if (!dictionaryValue && copyKey !== key) {
      dictionaryValue = getDictionaryCallback(key, { dictionary });
    }

    if (!dictionaryValue) {
      datadogRum.addError(new Error('MISSING_CYPHER_KEY_IN_DICTIONARY'), {
        owner: Owners.CORE,
        errorCode: ERROR_CODES.MISSING_CYPHER_KEY_IN_DICTIONARY,
        message: ERROR_MESSAGES.CYPHER_KEY_NOT_FOUND_IN_DICTIONARY,
        source: '/common/dictionary/context/use-dictionary',
        key: copyKey, dictionary: dictionary,
      });
    }
    return dictionaryValue;
  };
}
```

**Resolution order (CONFIRMED):**
1. Default namespace is `'unified-commerce'`.
2. Experimental copy override: `featureCopy[key]` swaps the key (per §2.5).
3. If the experimental key misses, retry the **original** key in the same namespace — so a copy
   experiment can never blank out copy.
4. Still empty → `MISSING_CYPHER_KEY_IN_DICTIONARY` to Datadog RUM. **The hook returns the empty
   string; it does not throw.**

`ERROR_CODES.MISSING_CYPHER_KEY_IN_DICTIONARY` is defined at
`packages/cgi/commerce-base/src/common/constants/observability.ts:47`.

The inner lookup (`packages/dictionary/src/lib/callback.ts:29-46`):

```ts
return function getDictionaryValue(key, { dictionary = 'unified-commerce' } = {}): string {
  if (!dictionaries) return '';
  // If the key is not in Cypher or in the fallback, the text will be wrapped with a symbol ⚠️
  // We only want to show this indicator if we are on a staging environment
  const fallbackTextToShow = debuggingOptions?.shouldShowDictionaryKey ? `⚠️${key}⚠️` : '';
  return debuggingOptions?.isDictionaryDebugEnabled
    ? key
    : dictionaries[dictionary]?.[key] ?? fallbackTextToShow;
};
```

Three behaviours: normal, `isDictionaryDebugEnabled` (return the key itself — Toodles debug), and
`shouldShowDictionaryKey` (staging-only `⚠️key⚠️` marker). **CONFIRMED**

### 4.3 How the ESPN dictionary is fetched

`packages/dictionary/src/lib/utils.ts:52-89` — `buildDictionariesQueryURL`:

```ts
const variables: DictionaryVariablesObject = {
  dictionary: remoteDictionariesToLoad.map((resourceKey) => ({
    resourceKey, version: dictionaryConfig.dictionaryVersions[resourceKey],
  })),
  platform,                                  // 'web'
  preferredLanguage,
  homeLocation, location, portabilityLocation,
  tenant: dictionaryConfig.dictionaryTenant, // 'espn'
  pinnedPlatformName, pinnedPlatformVersion,
};
const queryURL = new URL(dictionaryConfig.dictionaryURL);
queryURL.searchParams.append('variables', JSON.stringify(variables));
```

So **tenant isolation happens server-side in the Dictionary API**: ESPN sends `tenant: 'espn'` and gets
ESPN copy. There is no client-side per-brand key merging. **CONFIRMED**

`pinnedPlatformName` / `Version` come from env (`apps/commerce/espn/.env:16-17`):
`PINNED_PLATFORM_NAME=web-cup`, `PINNED_PLATFORM_VERSION=1.0`.

**Draft state** (`packages/dictionary/src/queries/client.ts:19-44`):

```ts
/**
 * Determines whether a dictionary request should use draft-state (the authenticated internal
 * endpoint). This requires three things together: the environment enables draft state via
 * Remote Config (`enableDictionaryDraftState`), the client opts in (`enableDraftStateClient`),
 * and the sensitive-secrets API key is available. The internal endpoint 401s without the
 * `dapi-sensitive-keys-secret` header, so when the key is missing (e.g. prod-cluster
 * deployments, which intentionally don't carry it) we fall back to the public endpoint.
 */
```

Three-way AND. ESPN's Sparrow fixture sets `enableDictionaryDraftState: true` (line 30), so ESPN draft
state is live in QA when the key is present. Headers (`client.ts:14-17`):
`x-request-yp-id` (`YELLOW_PAGES_ID=6616b21135f3fecb74145117` for ESPN commerce,
`apps/commerce/espn/.env:11`) and `dapi-sensitive-keys-secret`.

ESPN dictionary URLs (ESPN fixture lines 514-518):
`https://qa-espn.api.edge.bamgrid.com/dictionary/v1/dictionaries` and `…/dictionaries-internal`.

### 4.4 ESPN copy overrides and real ESPN keys

Per-brand fallback bundles live at `packages/dictionary/src/data/{espn,hulu,disney-plus}/`.
`packages/dictionary/src/data/espn/fallback-manual.ts:3-8`:

```ts
/**
 * This fallback object is where you can manually specify a new fallback dictionary key.
 * These values will be overwritten by the fetched data from cypher once the key appears
 * in the remote dictionary.
 */
export const fallbackManual: NormalizedDictionary = { … };
```

Structure (297 lines): `identity` (line 9), `pcon: {}` (line 12), `unified-commerce` (line 13),
`unified-commerce-onboarding` (line 102), `unified-offers` (line 255).

**Real ESPN key examples (CONFIRMED, `packages/dictionary/src/data/espn/fallback-manual.ts`):**

| Key | Value | Line |
|---|---|---|
| `logo_alttext` | `'ESPN Logo'` | 21 |
| `uo_namelong_package_flagship` | `'ESPN Unlimited'` | 43, 272 |
| `uo_namelong_package_espn` | `'ESPN+'` | 273 |
| `uo_espn_ppv` | `'ESPN+ & PPV ###'` | 276 |
| `uo_espn_3p_premium` | `'ESPN+ Premium Bundle'` | 277 |
| `uo_espn_3p` | `'ESPN+ Bundle'` | 278 |
| `logo_navigation_home_alt_text` | `'Navigate to ESPN+ Homepage'` | 150 |
| `success_espn_mlb_title` | `'WELCOME TO ESPN+ WITH MLB.TV'` | 197 |
| `success_espn_ppv_title` | `"SUCCESS! YOU'VE PURCHASED ESPN+ & PPV NAME"` | 203 |
| `success_espn_nfl_bundle_title` | `"You're all set!"` | 246 |
| `espn_fox_one_bundle_roadblock_fox_link` | `'https://subs.fox.com/manage'` | 245 |
| `standalone_espn_logo_accessibility` | `'ESPN+'` | 209 |
| `billing_ppv_bundle_annual_title_copy` | `'ESPN+ Annual with PPV 321'` | 288 |
| `billing_mlb_bundle_annual_title_copy` | `'ESPN+ Annual & MLB.tv Season Pass'` | 290 |
| `account_addons_mlb_title` | `'MLB.tv Season Pass'` | 38 |
| `account_switch_ledger_upsell_subheader` | `'For more information on other plans that include ESPN+, visit our Help Center'` | 20 |

Note the same `unified-commerce` key names (`logo_alttext`, `change_subscription_success_*`) appear in
all three tenants' fallback files with different values — **that is how brand copy override works**:
same key, different tenant in the Cypher query. **CONFIRMED**

The `uo_` prefix is the `unified-offers` namespace convention. Cross-brand corroboration from Disney+
(`packages/dictionary/src/data/disney-plus/fallback-prebuild.json:4444`):

> *"ESPN Select includes ESPN+ only; ESPN Unlimited includes all ESPN networks and services,
> including ESPN+."*

`Raptor` appears as a codename in ESPN copy (`fallback-manual.ts:25, 27, 36`) —
`change_subscription_success_standalone_header: 'Welcome to Raptor'`. Corroborated by
`FlexOfferType` having `RAPTOR_STANDALONE` / `RAPTOR_BUNDLE` and the ESPN path
`activate.raptor_us: 'https://stage.venu.com/bundle/activate?partner=disney&token='`
(ESPN fixture line 522-523) — **`Raptor` ≈ Venu**. **CONFIRMED (mapping) / INFERRED (product identity)**

`MISSING_CYPHER_KEY_IN_DICTIONARY` + dictionary optimization interaction: the ESPN layout has a
dedicated guard, `apps/commerce/espn/src/layout/hydrate-data-interface.tsx:118,141,169` —
*"to prevent MISSING_CYPHER_KEY_IN_DICTIONARY errors caused by server-side dictionary optimization"* /
*"…when server optimization is enabled"* / *"…on dictionary load completion"*. ESPN has
`enableDictionaryOptimization: true` (ESPN fixture line 31), so this guard is live for ESPN.
There is a dedicated E2E test: `apps/commerce/espn/playwright/tests/common/dictionary-optimization.spec.ts`.
**CONFIRMED**

---

## 5. Remote config (`packages/remote-config`)

### 5.1 What it is

`packages/remote-config/readme.md:21`:

> *"`remote-config` is an isomorphic package that hosts utility functions and Jotai atoms for fetching
> data from the Remote Config service."*

Three export groups: `server-utils/`, `browser-utils/`, `testing-utils/`. 100% coverage required
(`readme.md:49`).

**Two config systems live in this one package.**

| System | Shape | Fetch | Status |
|---|---|---|---|
| **Sparrow** (current) | workspace → scope → config → version → variant | `server-utils/sparrow/` | Live for all commerce tenants |
| **Legacy remote-app-config** | one giant `config.json` per product/env | `server-utils/get-slim-remote-config.ts` | *"Note: This is no longer used by CUP. All commerce tenants now use Sparrow."* (`get-slim-remote-config.ts:123`) |

That comment is the single most important fact about this package. **CONFIRMED**

### 5.2 Sparrow fetch mechanics

URL template from env (`apps/commerce/espn/.env:18-19`):

```
SPARROW_CONFIG_URL=https://fed-configs.s3.amazonaws.com/sparrow/[[WORKSPACE]]/[[SCOPE]]/[[CONFIG]]/[[VERSION]]/[[VARIANT]].json
SPARROW_VERSION=latest
```

`buildSparrowURL` (`packages/remote-config/src/server-utils/sparrow/utils/build-sparrow-URL.ts:4-43`)
validates every field is non-empty, with one carve-out:

```ts
// We allow for version to be `null` since merged configs in Sparrow don't have a concept of "version"
// And accordingly, it's not part of the merged config request URL schema
if (key === 'version' && value === null) return;
```

Auth is via the `Referer` header carrying the S3 access key
(`packages/remote-config/src/server-utils/sparrow/utils/get-sparrow-config.ts:34-38`):

```ts
const response = await fetch(configRequestURL, { headers: { Referer: s3AccessKey } });
```

Field docs (`packages/remote-config/src/server-utils/sparrow/models.ts:2-23`):
`awsRegion`, `config` (*"An example being `sdk`, which lives under the `feature-configuration` Scope"*),
`scope` (*"An example being `feature-configuration`, which lives in the `commerce-hulu` Workspace"*),
`sparrowUrlSchema`, `variant` (*"Typically, an environment like Staging/Production/QA/Release Candidate"*),
`version`, `workspace`.

### 5.3 How ESPN resolves its workspace + caching

`packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts`:

```ts
const FIVE_MINUTES_IN_MS = 300_000;

/** In-memory cache to store the Sparrow Scope Configurations.
 * It is exported solely for testing purposes. */
export const sparrowCache = new LRU<string, CommerceAppConfig>({
  max: 40, ttl: FIVE_MINUTES_IN_MS, ttlResolution: 1000,
});
```

```ts
const sparrowMergedConfig = await getSparrowMergedConfig<CommerceAppConfig>({
  ...sparrowRequestConfig,
  variant: backendService,
  workspace: `commerce-${productName.toLowerCase()}`, // Commerce workspace names are always lowercase
});
```

**ESPN's workspace is therefore `commerce-espn`** and its merged config name is `combined_config`
(`packages/cgi/commerce-base/src/common/lib/sparrow/__server-mocks__/handlers.ts:78-81`). Confirmed by
the Hulu Playwright URL assertion pattern
`'*/sparrow/commerce-hulu/merged/combined_config/qa/combined_config.json'`
(`apps/commerce/hulu/playwright/tests/flows/incoming-activation.spec.ts:47`). **CONFIRMED**

Refresh / caching semantics (`load-sparrow-config.ts:37-155`) — **CONFIRMED**:

- **Cache key is `backendService`, not `productName`.** Each Next.js server process serves one tenant,
  so this is safe in practice, but it means the same key would collide across tenants in a shared
  process. Max 40 entries, 5-minute TTL.
- `shouldCacheConfig` is a caller flag — cache can be bypassed per request.
- `backendService` = the config **variant** (env), resolved from
  `getRemoteConfigBackendService(context.query, context.req, defaultBackendService)` — i.e. the
  `dss_backend_services` query param or request header. This is how you point a local/staging session
  at a different config variant.
- Failing to determine `backendService` **throws** (lines 116-124), logged as
  `[loadSparrowConfig] Unable to determine or retrieve the dss_backend_services value`.
- A fetch failure **throws** `Failed to retrieve the merged config for Commerce-Base ${productName}`
  (line 150-152). Note the doc-comment on line 80 claims *"If any errors are encountered while
  retrieving from Sparrow, the unmodified Remote Config object will be returned"* — **the comment is
  stale; the code throws.** Worth flagging as an inconsistency.
- The S3 access key is redacted in logs: `` `obfuscated but is ${…? 'present' : 'not present'}` ``
  (lines 144-146).
- Datadog tracing: span `@solo/commerce-base.load-sparrow-config.loadSparrowConfig` with a
  `cacheHit` tag (lines 22-26, 53-55, 69-71).
- Env variants ESPN can load (`apps/commerce/espn/.env:4-5`):
  `REMOTE_CONFIGS_TO_LOAD=prod,beta,preview,qa,qa-local,beta-local,preview-local,prod-local`,
  `REMOTE_CONFIG_DEFAULT=qa`.

### 5.4 Client-side hydration

Both configs follow the same primitive-atom + derived-atom + `useHydrateAtoms` pattern, and both
**throw if read before hydration**:

`packages/remote-config/src/browser-utils/remote-config.ts:30-40`:
```ts
export const remoteConfigAtom = atom<RemoteConfig>((get) => {
  const remoteConfig = get(remoteConfigPrimitiveAtom);
  if (!remoteConfig) throw new Error('A RemoteConfig must be provided before using the remoteConfigAtom');
  return remoteConfig;
});
```

`packages/cgi/commerce-utils/src/app-config/atoms/app-config-atom.ts:34-44`:
```ts
export const commerceAppConfigAtom = atom<CommerceAppConfig>((get) => {
  const commerceAppConfig = get(commerceAppConfigPrimitiveAtom);
  if (!commerceAppConfig) throw new Error('An app config must be provided before using the commerceAppConfigAtom');
  return commerceAppConfig;
});
```

There is **no client-side polling or revalidation** — config is fetched in `getServerSideProps` and
hydrated once per page load. Effective client refresh cadence = navigation. **CONFIRMED**

### 5.5 Testing utilities

`packages/remote-config/src/testing-utils/{espn,hulu,disney-plus}/qa.json` — full archived legacy
configs (ESPN's is ~2050 lines). `remote-config-fixture.ts` + `getMockHandlerForConfig` /
`getMockHandlerForMergedConfig` provide MSW handlers. The ESPN app wires a single handler
(`apps/commerce/espn/server-mocks/sparrow-handlers.ts:1-7`):

```ts
const sparrowMergedConfigHandler = getSparrowMergedConfigHandler({ productName: 'espn' });
export const sparrowHandlers = [sparrowMergedConfigHandler];
```

which resolves to the ESPN fixture via a `switch` on product
(`packages/cgi/commerce-base/src/common/lib/sparrow/__server-mocks__/handlers.ts:19-32`).

---

## 6. Offers, plans, SKUs, and bundles

### 6.1 Vocabulary

| Term | Meaning in this codebase | Cite |
|---|---|---|
| **offer** | The purchasable unit. Identified by `offerId` (+ `campaignId`). Rendered from a Flex server-driven model. | `packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts:198,212` |
| **offerId / campaignId** | The two-part offer identity used in every purchase action | `offer.types.ts:41-45,108-117` |
| **offerType** | Product taxonomy — see `FlexOfferType` below | `offer.types.ts:146-163` |
| **package** | A plan/tier name string, used by cadence selection and copy keys (`uo_namelong_package_flagship`) | `offer.types.ts:70,100`; `packages/dictionary/src/data/espn/fallback-manual.ts:272-273` |
| **productType / frequency** | Billing cadence: `MONTHLY \| ANNUAL \| SEASONAL \| MULTI_ANNUAL \| ONE_TIME` | `offer.types.ts:57-62` |
| **sku / skuList** | Legacy identifier, only in the legacy remote-app-config `defaultProduct`/`rewardsProducts`/`specialOfferProduct` and the license-plate helper | `packages/cgi/commerce-utils/src/app-config/models/countries-scope.ts:216-220`; `packages/identity-auth/src/common/components/license-plate/utils.ts:76` |
| **campaignCode / voucherCode** | Legacy remote-config purchase params alongside `skuList` | `packages/remote-config/src/testing-utils/espn/qa.json` → `countries.US.commerce.defaultProduct` |
| **bundle** | Multi-service offer — see `FlexOfferType` `*_BUNDLE` members | `offer.types.ts:147-163` |
| **flagship** | Codename for **ESPN Unlimited** (all ESPN networks) | `use-is-flagship-enabled.tsx:5`; `fallback-manual.ts:43` |
| **Raptor** | Codename appearing in ESPN copy; maps to Venu (`activate.raptor_us` → `stage.venu.com`) | `fallback-manual.ts:25`; ESPN fixture line 522 |
| **PPV** | Pay-per-view (UFC) one-time add-on | `fallback-manual.ts:203-208,276` |
| **add-on** | `ADD_ON_STANDALONE` offers: PPV, MLB.tv | `offer.types.ts:159`; `fallback-manual.ts:37-40` |
| **cadence** | Monthly-vs-annual selection step | `apps/commerce/espn/pages/commerce/cadence/index.page.tsx`; `enableSignUpFlowCadenceRoute` |

### 6.2 `FlexOfferType` — the product taxonomy

`packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts:146-163`:

```ts
type FlexOfferType =
  | 'DISNEY_3P_BUNDLE' | 'DISNEY_STANDALONE' | 'HYBRID_BUNDLE' | 'DISNEY_2P_BUNDLE'
  | 'COMBO_BUNDLE' | 'MEGA_BUNDLE' | 'STAR_STANDALONE' | 'HULU_STANDALONE'
  | 'ESPN_STANDALONE' | 'RAPTOR_STANDALONE' | 'RAPTOR_BUNDLE' | 'MAX_BUNDLE'
  | 'ADD_ON_STANDALONE' | 'PPV_STANDALONE' | 'MLB_STANDALONE' | 'UNKNOWN'
  | 'EXTRA_MEMBER';
```

ESPN-relevant members: `ESPN_STANDALONE`, `PPV_STANDALONE`, `MLB_STANDALONE`, `ADD_ON_STANDALONE`,
`RAPTOR_STANDALONE`, `RAPTOR_BUNDLE`, `DISNEY_3P_BUNDLE` (the D+/Hulu/ESPN trio), `EXTRA_MEMBER`.
**CONFIRMED**

Cadence enum, with an explicit pointer to the Flex source of truth (`offer.types.ts:55-62`):

```ts
// Corresponds with Flex Team Enum.
// https://github.prod.hulu.com/FlexTeam/growth-life-client-api/blob/…/src/backends/growthLifeOrchestrator/models/GLOOffers.ts#L3
type GLOOfferProductType = 'MONTHLY' | 'ANNUAL' | 'SEASONAL' | 'MULTI_ANNUAL' | 'ONE_TIME';
```

**GLO = Growth Life Orchestrator.** The purchasable-plan taxonomy is owned by Flex, mirrored here.
**CONFIRMED**

### 6.3 The data model for a purchasable plan

Three offer view-models, all server-driven (`offer.types.ts`).

**`FlexFeatureOfferModel`** (lines 210-246) — the plan card:

```ts
export type FlexFeatureOfferModel = {
  type: 'featureOffer';
  offerId: string;
  offerType?: FlexOfferType;
  style: 'default' | 'retention' | 'retentionCompact';
  badge?: FlexBadgeModel;
  logo?: FlexImageModel;
  title: FlexTextModel;
  subtitle?: FlexTextModel;
  description?: FlexRichTextModel;
  list?: FlexListModel;
  price?: FlexRichTextModel;
  priceDetails?: FlexRichTextModel;
  startingAt?: FlexTextModel;
  detailsModal?: …;
  secondaryDescription?: FlexRichTextModel;
  interactions: FlexInteractionListModel<
    | FlexSelectSignupActionModel | FlexSwitchPlanActionModel | FlexNavigateActionModel
    | FlexOfferContextSignupActionModel | FlexSelectPlanSelectCadenceActionModel
    | FlexTriggerRichModalActionModel<…>>;
  featuresHeader?: FlexTextModel; // TODO GREAT-684 Cleanup for … Always On Upgrade … experiment
  features?: FlexListModel;
  metricsData: GlimpseV2MetricsDataModel<GlimpseV2ContainerViewPayloadModel>;
  termsApply?: FlexRichTextModel;
  legal?: FlexRichTextModel;
  adobeData?: FlexAdobeDataModel;
};
```

**`FlexFeatureStackOfferModel`** (lines 185-208) — the ledger/confirm variant, adds `banner`,
`changePlan`, `downsell`, `eyebrow`, `zipCodeConfirmation`, and
`installmentOptions?` (`// TODO: GREAT-572 Cleanup for GREAT | D+ | BR | Web | Annual Subscription in Monthly Installments experiment`).

**`FlexCompactOffer`** (lines 167-183) — the welcome-back/carousel variant, with
`useStandardPriceStyle?` (`// TODO GCIEX-12743: Cleanup L4L Merchandise on Welcome Back experiment.`).

**Where prices come from — CONFIRMED:**

`price` is `FlexRichTextModel` and `priceDetails` is `FlexRichTextModel`. **cgi-web never computes or
formats a plan price.** Flex/GLO resolves eligibility, promo, tax messaging, and currency and returns
rendered rich text. cgi-web renders it. The corollary: a price bug is a Flex bug unless it is a
rendering/localization bug.

The two exceptions, both legacy:
- Hardcoded numbers in the legacy remote-app-config, e.g.
  `packages/remote-config/src/testing-utils/espn/qa.json` →
  `countries.US.commerce.rewardsProducts.FT.oneYear.price: 69.99` with
  `skuList: ['1999199999999910111999000_disney']` and
  `voucherCode: 'DISNEY_REW_US_1Y7D_VOCHR'`. This path is *"no longer used by CUP."*
- Illustrative prices baked into dictionary copy, e.g.
  `packages/dictionary/src/data/espn/fallback-manual.ts:281,283,287` —
  `'ESPN+ Annual ($109.99 recurring) + PPV 321 Discounted Price $24.99'`. These are **fallback
  placeholders**, overwritten by Cypher.

Client-side currency formatting is `useCurrencySymbol` + `useGlobalizationFormatting` (§3.4) and the
`<Currency>` / `<Date>` / `<Time>` localized components
(`packages/cgi/commerce-base/src/common/components/localized/`).

**Purchase actions** carry the offer identity (`offer.types.ts:93-117`):

```ts
export type FlexSelectSignupActionModel = {
  actionKey: 'selectPlanSignup';
  adobeData?: FlexAdobeDataModel;
  data: { offerId: string; campaignId: string; productType?: string };
  metricsData: GlimpseV2MetricsDataModel<GlimpseV2InteractionPayloadModel>;
};

export type FlexSelectPlanSelectCadenceActionModel = {
  actionKey: 'selectPlanSelectCadence';
  // L4L offers ship the offer identity alongside `package` so the cadence page
  // (and `convertToOffersParam`) can build the `offers`/`offerId`+`campaignId` query …
  data: { package: string; offerId?: string; campaignId?: string; productType?: string };
  …
};
```

Plan *switch* uses `FlexSwitchParamsModel = { offerId; campaignId; subscriptionId }`
(lines 41-45) — subscription id is the third coordinate for a switch.

`SignUpFlowMetaDataModel` (lines 64-71) is the analytics/handoff envelope:
`{ offerType: 'DISNEY_3P_BUNDLE' | 'DISNEY_2P_BUNDLE' | unknown; hasAds: boolean; frequency: GLOOfferProductType; campaignId; offerId; package? }`.

Experiment-only offer variants (owner `@cgi-client/xd`) live in
`packages/cgi/commerce-base/src/common/services/experiments/models/offers.types.ts` —
`ExperimentTableOfferModel` (lines 24-49) adds `compChartFeature1..5` for comparison-chart tests, and
`ExperimentFeatureOfferRadioButtonModel` (line 51) is `FlexFeatureOfferModel & { action }`.

### 6.4 ESPN-specific product surface

- **`nflbundle` / NFL bundle** — 45 `nfl_bundle` + 17 `NFLBundle` + 6 `nflBundle` occurrences.
  Real fixture/mock files: `packages/cgi/commerce-base/src/account/change-subscription/__fixtures__/flex-api-get-change-subscription-success-page.ts`,
  `.../account/success/__fixtures__/flex-api-get-success-page.ts`,
  `.../account/change-subscription/__browser-mocks__/{handlers,screens}.ts`,
  `apps/marketing-unified/espn/src/mocks/apis/cnbl-lps-manifest.json`.
  Dictionary keys: `success_espn_nfl_bundle_title`, `success_espn_nfl_bundle_subcopy`
  (*"Start watching ESPN in your browser below or activate NFL+ Premium now!"*),
  `success_espn_nfl_bundle_launch_espn_cta`, `account_switch_success_espn_nfl_header`
  (`packages/dictionary/src/data/espn/fallback-manual.ts:98-99,246-253`).
  Activation path: `activate.nfl_us: 'https://staging-id.nfl.com/account/sign-in?partnership=disney&token='`
  (ESPN fixture line 526-527). **CONFIRMED**
- **`ESPN Unlimited` / `ESPN Select`** — product tier names. 875 occurrences of `"ESPN Unlimited"`
  repo-wide. `ESPN Select` appears only in **Disney+** dictionary copy and a Playwright doc example
  (`docs/testing/playwright/README.md:634`) — **there is no `ESPN Select` code identifier**; the
  code-level name is `flagship` (= Unlimited) vs `package_espn` (= ESPN+). **CONFIRMED**
- **Partner bundles/activations** for ESPN (ESPN fixture `paths.paths.activate`, lines 519-528):
  `hulu`, `raptor_us` (Venu), `foxone_us` (`stage-subs.fox.com`), `mlb_us` (`qa-gcp.mlb.com`),
  `nfl_us`. `espn_fox_one_bundle_roadblock_fox_link` in the dictionary
  (`fallback-manual.ts:245`).
- **Plan/switch destinations** (ESPN fixture lines 470-476):
  `espn_plan_selector: 'https://sandbox.espn.com/watch/offers'` (external!),
  `espn_plan_switch: '/commerce/change-subscription'`,
  `espn_plan_switch_ledger: '/commerce/change-subscription/confirm'`,
  `espn_signup_preview: '/commerce/billing'`,
  `espn_account_details: '/commerce/account'`.
  ESPN's **plan selector is off-app** (`sandbox.espn.com/watch/offers`) — consistent with
  `enableCommerceUnifiedPlans: false`. **CONFIRMED**
- **ESPN commerce payment/purchase config** (legacy remote config,
  `packages/remote-config/src/testing-utils/espn/qa.json` → `countries.US.commerce`):
  `paymentMethods: ['CREDIT','PAYPAL']`, `cardOptions: ['DISNEYVISA','VISA','ECMC','DISCOVER','AMEX']`,
  `adsTierEnabled: true`, `sellsBundle: true`, `minimumAgeToSubscribe: 18`,
  `oneStepCancelBillingStates: ['CA','CO','CT']`, `requiresAnnualOptInStates: ['VT']`,
  `restartEligibleEnabled: true`, `devicesThatSellBundle` / `devicesThatSell2PBundle` device maps.
  Note the US-state arrays — **US regulatory rules are config, not code.** **CONFIRMED**
- **ESPN commerce billing config** (Sparrow, ESPN fixture lines 176-211):
  `giftCardNumberMinLength: 16`, `giftCardNumberMask: 'numeric'`, `max_order_status_tries: 50`,
  `order_status_timeout: 2000`, `postal_code_countries: ['CA','US']`,
  `cypherVariableErrorPathsToCrash: ['/commerce/billing', '/commerce/change-subscription/confirm']`,
  `enabledAnalyticsTooling: ['adobeAnalytics','adobeLaunch']` (**no `glimpse`** for ESPN),
  `urlParamHostAllowlist: ['sandbox.espn.com','espnsb.com','espnqa.com','qa.espn.com','espn.com']`.
- **ESPN commerce routes present** (`apps/commerce/espn/pages/commerce/`): `account`, `activate/*`,
  `add-ons`, `billing`, `billing-history`, `cadence`, `cancel/*`, `challenge/success`,
  `change-payment`, `change-subscription/*`, `extra-member/*`, `gift/*`, `pause/*`,
  `payment-processing`, `plans`, `portability`, `redeem`, `restart-subscription/*`,
  `review-subscription`, `student/*`, `subscription`, `success`, `unlock`, `welcome-back`.
  ESPN E2E specs: `flows/{espn-internal-activation,incoming-activation,signup,addon-multi-offer,multi-offer-plan-switch,redemption-by-code,cancel-subscription,change-subscription-confirm,change-subscription-explicit-consent-modal,billing-ledger-version}.spec.ts`,
  `signup/{billing,plans-multi-offer}.spec.ts`, `common/{404,dictionary-optimization}.spec.ts`,
  `account/{account-management,billing-history,identity-login,identity-signup}.spec.ts`,
  `payments/change-payment.spec.ts`.

---

## 7. Privacy / consent for ESPN

### 7.1 The package

`packages/privacy-consent/AGENTS.md:13-15`:

> *"`@solo/privacy-consent` provides OneTrust consent management integration for TWDC React apps. It
> handles script injection, consent preference checking, modal display, and consent receipt creation."*
> Owner: `@cgi-client/auth-access`.

Exports: `PrivacyConsent` component; hooks `useHasPrivacyConsent`,
`useManagePrivacyConsentPreferences`, `useGetIABType`, `useOnConsentChanged`, `useOptanonWrapper`,
`useIsConsentGroupActive`; types `PrivacyConsentConfig`, `ConsentIdentity`, `EnabledConsentGroups`.

### 7.2 ESPN wiring — two implementations behind one flag

`apps/commerce/espn/src/common/layouts/utils/render-consent.tsx:61-79`:

```tsx
export function RenderConsent({ commerceAppConfig, children }) {
  const { data: featureFlags } = useMystiqueFeatureFlags();
  const isPrivacyConsentPackageEnabled = featureFlags?.['wpnx-use-privacy-consent-package'];
  return isPrivacyConsentPackageEnabled ? (
    <PrivacyConsentWrapper commerceAppConfig={commerceAppConfig}>{children}</PrivacyConsentWrapper>
  ) : (
    <OneTrust>{children}</OneTrust>
  );
}
```

Also read at `apps/commerce/espn/src/layout/espn-layout.tsx:51`. **`wpnx-use-privacy-consent-package`
is the migration flag** from the legacy in-app `<OneTrust>` to the shared package. It is the
2nd-most-referenced flag in the repo (47 occurrences) — mid-migration. **CONFIRMED**

Downstream consumers of the same flag: `use-is-analytics-enabled.ts:19`,
`use-has-one-trust-consent.ts:36`, `common/footer/components/footer.tsx:206`, and it is typed on
`IdentityFeatureFlags.mystiqueFlags` (`packages/cgi/commerce-base/src/common/atoms/feature-flag.ts:17`).

### 7.3 Region gate: `enableCMP`

`packages/cgi/commerce-base/src/common/one-trust/hooks/use-is-onetrust-enabled.tsx:17-33`:

```ts
export function useIsOneTrustEnabled() {
  const physicalLocation = useAtomValue(physicalRegionAtom);
  const countriesConfig = useAtomValue(remoteAppConfigCountriesAtom);
  const isOneTrustEnabledForRegion =
    countriesConfig?.[physicalLocation as CommerceAppConfigRegion]?.featureFlags?.enableCMP || false;
  const commerceAppConfig = useAtomValue(commerceAppConfigAtom);
  const isOneTrustDisabled = commerceAppConfig['feature-flags'].general.disableOneTrust;
  return Boolean(!isOneTrustDisabled && isOneTrustEnabledForRegion);
}
```

- Uses **`physicalRegionAtom`, not `regionAtom`** — consent follows where the user physically is,
  not their home market. Correct and deliberate.
- Two-key AND: global kill switch `disableOneTrust` × per-country `enableCMP`.
- **ESPN has `enableCMP: true` on all 8 countries** (ESPN Sparrow fixture lines 230, 254, 278, 366, …)
  and `disableOneTrust: false` (line 9). **So OneTrust is on for every ESPN market.** **CONFIRMED**

### 7.4 ESPN OneTrust configuration

ESPN Sparrow fixture lines 70-116:

- `script.stubSDK: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js'`,
  `script.guuid: 'e962d8c8-d4a3-459a-a6f4-d9c01dbac777'` (ESPN's OneTrust domain id).
- `api.url` and `unifiedConsentApi.url` both
  `https://disney-portal.my.onetrust.com/request/v1/consentreceipts` — **but different purpose UUIDs**,
  which is how the two receipt APIs are distinguished.
- `consentGroups`: `necessary: 'C0001'`, `performanceAndAnalytics: 'C0002'`, `functional: 'C0003'`,
  `targetedAdvertising: 'C0004'`, `socialMedia: 'C0005'`.
- `categoryPurposes` maps `C0001/C0002/C0004` → purpose UUIDs — note **C0003 and C0005 have no purpose
  mapping**, so functional and social-media consent are not receipted for ESPN.
- Tokens are `test-onetrust-jwt-placeholder` in the fixture (real values from Vault).

### 7.5 Consent identity sync

`packages/cgi/commerce-base/src/common/one-trust/hooks/use-consent-config.tsx:52-55`:

```ts
const { data: mystiqueFlags } = useMystiqueFeatureFlags();
const useIdentityId =
  mystiqueFlags?.['wpnx-identity-consent-sync']?.enabled === true ||
  commerceAppConfig['feature-flags'].general.enableIdentityConsentSync;
```

**A dual-source flag read** — WeaponX OR Sparrow, with the WeaponX flag being *object-valued*
(`?.enabled === true`). This is the productionalization transition captured mid-flight: the Sparrow
flag is the eventual home, the WeaponX flag the rollout lever. ESPN's Sparrow value is
`enableIdentityConsentSync: false` (ESPN fixture line 37), so ESPN depends on the WeaponX flag today.
Also gated: `unifiedConsentApi` presence drives `isUnifiedConsentApiEnabled` (lines 27-28) — and
ESPN's config **does** define `unifiedConsentApi`, so unified consent is on for ESPN. **CONFIRMED**

`isReady` is a three-way AND of resolved session, auth, and identity queries (lines 57-59) — consent
config is only safe to read once all three settle.

Other consent flags in the ESPN-relevant set: `wpnx-onetrust-is-unauth-anonymous`,
`wpnx-disable-authenticated-consent-receipts`, `wpnx-enable-always-reload-on-consent-change`,
`wpnx-web-identity-ot-consent-applied`, `wpnx-web-identity-skipPrivacyConsent`.

---

## 8. Env vars and secrets for an ESPN build

### 8.1 `apps/commerce/espn/.env` (committed, non-secret) — **CONFIRMED, all 20 lines**

| Var | Value | Purpose |
|---|---|---|
| `PRODUCT` | `espn` | Drives `workspace: commerce-${PRODUCT}` and fixture selection |
| `SPARROW_CONFIG_URL` | `https://fed-configs.s3.amazonaws.com/sparrow/[[WORKSPACE]]/[[SCOPE]]/[[CONFIG]]/[[VERSION]]/[[VARIANT]].json` | Sparrow URL template |
| `SPARROW_VERSION` | `latest` | |
| `REMOTE_CONFIG_URL` | `https://fed-configs-[[AWS_REGION]].s3.[[AWS_REGION]].amazonaws.com/[[PRODUCT]]/[[remoteConfigName]]/[[REMOTE_CONFIG_VERSION]]/remote-app-config/config.json` | Legacy remote config |
| `REMOTE_CONFIG_VERSION` | `1.0` | |
| `REMOTE_CONFIGS_TO_LOAD` | `prod,beta,preview,qa,qa-local,beta-local,preview-local,prod-local` | Allowed config variants |
| `REMOTE_CONFIG_DEFAULT` | `qa` | Default variant |
| `REMOTE_DICTIONARIES_TO_LOAD` | `accessibility,identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding` | Dictionary namespaces |
| `AWS_REGION` | `us-east-1` | |
| `PINNED_PLATFORM_NAME` / `_VERSION` | `web-cup` / `1.0` | Dictionary platform pinning |
| `YELLOW_PAGES_ID` | `6616b21135f3fecb74145117` | `x-request-yp-id` header |
| `NEXT_PUBLIC_API_MOCKING` | `disabled` | MSW toggle |
| `LOCAL_EDGE_SERVER` | `disabled` | |
| `DD_SERVICE` | `espnplus-commerce` | Datadog service |
| `DATADOG_RUM_ENV` | `non-prod` | |
| `DD_TAGS` | `jest:test` | |
| `DD_TRACE_SAMPLING_RULES` | `[{"service":"espnplus-commerce","resource":"/api/healthcheck","sample_rate":0.1}]` | |
| `CONTAINER_NAME` | `espnplus_commerce_datadog_agent_local` | |
| `NEXT_TELEMETRY_DISABLED` | `1` | |

Other env files: `.env.development` → `NODE_TLS_REJECT_UNAUTHORIZED=0` (local SSL proxy);
`.env.test` → both secrets set to `test-placeholder`.

### 8.2 Vault-backed secrets — exactly two

`apps/commerce/espn/.env.local.example` (verbatim):

```
# Secrets for local development — copy this file to .env.local and fill in values.
#
# Option A: Run `./scripts/setup configure secrets` to auto-populate from Vault.
# Option B: Copy values manually from the Vault UI.
#
# Vault service: espnplus-commerce
# Vault namespace: 60c7e031310ce5f580d4db16
# Vault environment: staging

DAPI_SENSITIVE_SECRETS_API_KEY=
REMOTE_CONFIG_S3_ACCESS_KEY=
```

| Secret | Consumed by |
|---|---|
| `REMOTE_CONFIG_S3_ACCESS_KEY` | Sparrow `Referer` header (`get-sparrow-config.ts:36`) |
| `DAPI_SENSITIVE_SECRETS_API_KEY` | Dictionary `dapi-sensitive-keys-secret` header for draft state (`packages/dictionary/src/queries/client.ts:16,106-109`) |

**Vault coordinates: service `espnplus-commerce`, namespace `60c7e031310ce5f580d4db16`, env `staging`.**
ESPN commerce shares the namespace with Disney+ commerce (`dominguez-commerce`) and ESPN marketing
(`espnplus-nexus`); Hulu uses a different namespace. **CONFIRMED**

### 8.3 `scripts/setup configure secrets`

`scripts/lib/configure/secrets.sh:3-13`:

```bash
VAULT_ENV="staging"

# Per-app Vault configuration: "app_dir|service|namespace"
VAULT_APP_CONFIGS=(
	"apps/commerce/disneyPlus|dominguez-commerce|60c7e031310ce5f580d4db16"
	"apps/commerce/hulu|hulu-commerce|5ccc787ab3926400ede31b05"
	"apps/commerce/espn|espnplus-commerce|60c7e031310ce5f580d4db16"
	"apps/marketing-unified/disneyplus|bix-caleen|60c7e031310ce5f580d4db16"
	"apps/marketing-unified/hulu|hulu-nexus|5ccc787ab3926400ede31b05"
	"apps/marketing-unified/espn|espnplus-nexus|60c7e031310ce5f580d4db16"
)
```

Mechanics (lines 15-76): requires the `devx` CLI (`./scripts/setup install devx`), runs
`devx locksmith login -s <service> -n <namespace> -e staging` (browser SSO) then
`devx locksmith export … -p secret -f json`, then **derives keys from the export JSON** —
*"Read all keys from the Vault export JSON — no hardcoded key list needed"* (line 47) — and
upserts each into `<app_dir>/.env.local` (update-in-place if present, append otherwise).

### 8.4 `check-commerce-secrets`

`scripts/lib/check-commerce-secrets.sh` — a preflight registered in the root and per-app `package.json`:

```bash
REQUIRED_KEYS=("REMOTE_CONFIG_S3_ACCESS_KEY" "DAPI_SENSITIVE_SECRETS_API_KEY")
APP_DIR="${INIT_CWD:-$PWD}"
case "$APP_DIR" in
  */apps/commerce/*) ;;
  *) exit 0 ;;
esac
ENV_LOCAL="$APP_DIR/.env.local"
… 
echo "ERROR: missing secrets in .env.local, local dev will not work."
echo "Missing: ${missing_keys[*]}"
echo "These keys have moved from .env to Vault."
read -r -p "Fetch from Vault now? (opens browser for SSO) [Y/n]: " response
…  (cd "$REPO_ROOT" && pnpm run setup configure secrets)
```

Scoped to `apps/commerce/*` only; interactive with a Vault-fetch offer; exits non-zero if declined.
**CONFIRMED**

---

## 9. Gotchas

Ordered by likelihood of biting you.

1. **Two flag systems, similar-sounding names.** `useMystiqueFeatureFlags()` (WeaponX `wpnx-*`,
   from the SDK) vs `useCommerceFeatureFlag()` (Sparrow camelCase, from config) vs
   `commerceAppConfig['feature-flags'].general.*` (Sparrow global). A flag not taking effect is
   usually a flag read from the wrong system. **CONFIRMED**

2. **Shared-flag traps — one flag gating multiple things.** **CONFIRMED**
   - `wpnx-web-identity-account-home-header-dd` — in-code warning:
     *"careful, this affects not just account home, but every page that uses SiteNavLinks"*
     (`use-mystique-feature-flags.ts:46`).
   - `wpnx-great-copy*` is a **prefix**, so every matching flag merges into one override map; two flags
     touching the same cypher key silently drops the second and logs
     `'EXP COPY OVERRIDE – DUPLICATE EXPERIMENTAL KEY'` (`use-copy-override-experiment.tsx:47-57`).
   - `wpnx-skip-wb-landing-page` and `wpnx-skip-wb-landing-page-emea` are **two flags with the same
     treatment id** `'treatment-skip-wb-landing-page'`
     (`use-is-in-skip-welcome-back-experiment.tsx:13,27-29`) — easy to wire the wrong one.
   - `wpnx-add-on-step` has both a hook and two exported MSW handlers; the same flag gates a
     Flagship (ESPN Unlimited) experiment *and* excludes license-plate users
     (`use-is-in-flagship-addon-suf-experiment.tsx:13-17`).
   - `wpnx-use-privacy-consent-package` gates consent rendering **and** analytics enablement **and**
     footer behaviour in 6+ files.
   - **Before cleaning up any flag, grep for every reference** — the same key is often read in
     several unrelated features and in a different tenant's app directory.

3. **Region vs language confusion.** **CONFIRMED**
   - `regionAtom` (home-first) vs `physicalRegionAtom` (physical-only) are **not** interchangeable.
     Consent (`use-is-onetrust-enabled.tsx:18`, `use-consent-config.tsx:24`) uses **physical**;
     commerce flags (`use-commerce-region-feature-flags.tsx:77`) use **`regionAtom`**. Swapping them
     changes who sees what.
   - `RegionSubtag` (~280 IANA codes incl. `'419'`, `'150'`) ≠ `CommerceAppConfigRegion`
     (launched Sparrow countries). `regionAtom` is typed `RegionSubtag` and is **cast** to
     `CommerceAppConfigRegion` at `use-commerce-region-feature-flags.tsx:104` — an unchecked cast, so
     an unlaunched region silently yields `{}` flags.
   - `AppLanguage` includes region-ish tags (`'es-419'`, `'pt-BR'`, `'en-GB'`). ESPN's `es-419`
     is a **language**, not a market — ESPN is still US-only.
   - `useIntlLocale` builds `${language}-${locale}` where `locale` is `regionAtom`
     (`use-intl-locale.tsx:26,29,34`) — a language/region mismatch surfaces as an
     `Intl.getCanonicalLocales` throw silently swallowed into `en-US`.
   - `hreflang` ≠ `dict` in `supportedLangsMap` — ESPN maps `'es-419' → { dict: 'es-419', hreflang: 'es' }`.

4. **Flag defaults differ per environment and per tenant.** **CONFIRMED**
   - The SDK-disabled fallback in `useMystiqueFeatureFlags` (`use-mystique-feature-flags.ts:40-52`)
     is a hardcoded literal with only 6 keys, with the in-code instruction:
     *"Set flags here as you would for prod and override when developing locally or deploying a branch
     to staging."* Local behaviour can diverge from prod for any flag not in that literal.
   - Jest replaces the whole hook with a different 6-key literal
     (`jest.mock-mystique-feature-flags.ts:11-23`) — notably
     `'wpnx-web-identity-account-home-header-dd': HEADER_VARIANT.Dropdown` in Jest vs
     `HEADER_VARIANT.Logout` in the runtime fallback. **The same flag has different defaults in
     Jest and in local dev.**
   - Sparrow variant = `backendService` = the `dss_backend_services` query/header value. Same code,
     different flags per variant. Committed fixtures are the **`qa`** variant only.
   - The checked-in ESPN fixture has `enableCommerceUnifiedPlans: false` /
     `enableCommerceUnifiedPurchase: false` / `enableCommerceUnifiedWelcomeBack: false` — those
     routes 404 locally by default.
   - `useCommerceFeatureFlag` uses `??`, so an explicit `false` in config beats a `true` fallback;
     `LocalizedFeatureFlag` hardcodes `fallbackValue: null` (fail-closed).

5. **`treatment undefined` → silent control.** See §2.7. `data` is `undefined` in four distinct
   situations, all indistinguishable from a control assignment.

6. **First-render flash.** `useMystiqueFeatureFlags` is a react-query gated on `isReady`; every
   experiment renders control on the first pass. **INFERRED**

7. **Region change mid-render is known-broken.** `USE_COMMERCE_FEATURE_FLAG – REGION_CHANGED` is
   *reported* to Datadog, not handled — `// TODO WEB-7298`
   (`use-commerce-region-feature-flags.tsx:76, 82-100`). **CONFIRMED**

8. **Reading config atoms before hydration throws.** Both `commerceAppConfigAtom` and
   `remoteConfigAtom` throw on unhydrated read. Any component reading them must be inside the
   hydrated tree. **CONFIRMED**

9. **`getAppConfigCountries` spreads NA last** — an overlapping country code in a non-NA region is
   silently shadowed by NA. Harmless for ESPN (NA only), a real hazard for Disney+. **CONFIRMED**

10. **Territory inheritance is one level, and `false` overrides `true`.** A territory that declares a
    flag as `false` opts out even though the parent enabled it. And territories do *not* inherit keys
    they don't override from anything except the immediate `parentCountry`. **CONFIRMED**

11. **Stale doc-comments.**
    - `feature-flag.tsx:8-9` points at `disneyplus-remote-app-config` for setting commerce flags —
      commerce is on Sparrow now.
    - `load-sparrow-config.ts:80` claims errors return the unmodified config; the code **throws**
      (lines 150-152).
    - `get-slim-remote-config.ts:123` is the authoritative note: *"This is no longer used by CUP."*
    Don't trust a comment over the code in this area. **CONFIRMED**

12. **`partnerName` ≠ `partner` ≠ tenant.** `partnerName` is `'disney'` in ESPN orchestration/device
    payloads; the analytics `partner` is `'espn'`. Use
    `feature-configuration.general.name` (`'Disney+' | 'ESPN' | 'Hulu'`) or
    `analytics.partner` for tenant branching. **CONFIRMED**

13. **ESPN has no Glimpse.** `enabledAnalyticsTooling: ['adobeAnalytics','adobeLaunch']`
    (ESPN fixture line 191) — even though `analytics.glimpse.appName: 'ESPN'` is configured
    (line 148-150). Glimpse `metricsData` on Flex offer models is populated but not consumed for ESPN.
    Plus `wpnx-enable-legacy-analytics-espn` swaps the billing page to legacy Adobe tracking.
    Three overlapping analytics switches. **CONFIRMED (config) / INFERRED (not consumed)**

14. **Cypher variable errors crash two ESPN pages by design.**
    `cypherVariableErrorPathsToCrash: ['/commerce/billing', '/commerce/change-subscription/confirm']`
    (ESPN fixture lines 187-190) — a missing cypher *variable* on those two paths is a hard crash,
    not a silent empty string. **CONFIRMED**

15. **Dictionary optimization + missing keys.** `enableDictionaryOptimization: true` for ESPN means
    server-side key pruning; `apps/commerce/espn/src/layout/hydrate-data-interface.tsx:118,141,169`
    exists solely to avoid `MISSING_CYPHER_KEY_IN_DICTIONARY` false positives from it. Changing
    hydration order there will resurface those errors. **CONFIRMED**

16. **Sparrow cache key omits the tenant.** `sparrowCache.get(backendService)`
    (`load-sparrow-config.ts:50`) — safe today (one tenant per process) but a latent cross-tenant
    bleed if that ever changes. **CONFIRMED (code) / INFERRED (risk)**

17. **Cleanup scope is wider than the hook.** Experiment-shaped optional fields live on shared Flex
    models with their own tickets (`installmentOptions`/GREAT-572, `featuresHeader`/GREAT-684,
    `useStandardPriceStyle`/GCIEX-12743). Deleting a hook without these leaves dead model fields.
    **CONFIRMED**

18. **ESPN's plan selector is external.** `espn_plan_selector: 'https://sandbox.espn.com/watch/offers'`
    — plan selection is not a cgi-web page for ESPN in this config. Don't assume `/commerce/plans` is
    the live entry point. **CONFIRMED**

---

## 10. Open questions

1. **`wpnx-ESPN-Banner-Payment-Retry` has no consumer in cgi-web** — only fixtures. Is it live and
   owned by another repo (marketing-unified/espn? Flex?), or a retired assignment still present in the
   captured SDK fixture?
2. **`enableCommerceUnifiedPlans: false` for ESPN in the QA fixture.** Is that the true prod value
   (ESPN plan selection genuinely lives on `sandbox.espn.com/watch/offers`) or just a stale fixture?
   Requires reading the live `commerce-espn` Sparrow `prod` variant.
3. **`countries.US.lang: "en-GB"`** in the legacy ESPN remote config vs `supportedLangsMap: { en, es-419 }`
   in Sparrow. Which wins at runtime, and is `en-GB` for a US market intentional?
4. **`es-419` for a US-only ESPN.** Confirmed as a supported dictionary language, but which ESPN
   surfaces actually serve it, and how is it selected (profile language? URL? Accept-Language)?
5. **`Raptor` = Venu?** Strongly implied (`activate.raptor_us` → `stage.venu.com`, plus
   `RAPTOR_STANDALONE`/`RAPTOR_BUNDLE`). Needs a definitive product mapping — the dictionary copy is
   clearly placeholder (`'Welcome to Raptor'`).
6. **`ESPN Select` has no code identifier.** Confirmed present only in Disney+ copy. Is `package_espn`
   (`'ESPN+'`) the same thing as ESPN Select, or is Select a distinct SKU with no cgi-web presence?
7. **`wpnx-identity-consent-sync`'s object shape.** Only `?.enabled` is read. What else is on it, and
   is it the general convention for object-valued flags?
8. **Does ESPN ever exercise `getExperimentAssignments`?** ESPN has a full
   `data-interface-espn/src/experimentation/` implementation, but the only consumer found is
   `useSpearmintExperiment` — which the copy-override doc says is the *Hulu* path. Is ESPN's
   experimentation data interface dead code, or used somewhere not found by name?
9. **`Marvel` as a country `group`** in the Disney+ config. A market grouping, a content vertical, or
   a config artifact? Not present for ESPN.
10. **AU/NZ region classification divergence.** `countries-scope.ts` puts them in APAC; prior Flex-side
    research put them in EMEA. Which is authoritative for which decision surface?
11. **`enableEspnInternalActivation` provenance.** It is the clearest example of a productionalized
    flag, but was there a preceding `wpnx-*` flag? Git history would confirm the lifecycle claim.
12. **Where are ESPN's dictionary keys authored?** Cypher is the runtime source, but the fallback
    bundles (`packages/dictionary/src/data/espn/fallback-manual.ts` vs Disney+'s
    `fallback-prebuild.json`) differ in generation strategy — ESPN has no `fallback-prebuild.json`.
    Is ESPN's prebuild extraction not wired up?

---

## Appendix A — File map

| Concern | Path |
|---|---|
| WeaponX flag hook | `packages/cgi/commerce-base/src/common/hooks/use-mystique-feature-flags.ts` |
| Sparrow flag read | `packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-feature-flag.tsx` |
| Territory inheritance | `packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-region-feature-flags.tsx` |
| Flag render gate | `packages/cgi/commerce-base/src/common/components/localized/feature-flag/feature-flag.tsx` |
| Route gating | `packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts` |
| Experiment hooks | `packages/cgi/commerce-base/src/common/hooks/experiments/` |
| Experiment components | `packages/cgi/commerce-base/src/common/components/experiments/` |
| Copy overrides | `packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx` |
| Spearmint (Hulu) | `packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-experiment.ts` |
| ESPN experiment assignments | `packages/cgi/data-interface-espn/src/experimentation/` |
| Region atoms | `packages/cgi/commerce-base/src/common/i18n/geo/atoms/geo.ts` |
| Region subtags / default | `packages/cgi/commerce-base/src/common/i18n/geo/models/regions.ts`, `.../geo/constants.ts` |
| Business regions & country types | `packages/cgi/commerce-utils/src/app-config/models/countries-scope.ts` |
| Region→business-region lookup | `packages/cgi/commerce-utils/src/app-config/utils/get-business-region.ts` |
| Region-default + override pattern | `packages/cgi/commerce-utils/src/app-config/utils/is-global-footer-enabled.ts` |
| Sparrow scope types | `packages/cgi/commerce-utils/src/app-config/models/{feature-flags-scope,feature-configuration-scope,app-config}.ts` |
| App-config atoms | `packages/cgi/commerce-utils/src/app-config/atoms/app-config-atom.ts` |
| Sparrow fetch | `packages/remote-config/src/server-utils/sparrow/` |
| Sparrow load + cache | `packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts` |
| **ESPN Sparrow workspace fixture** | `packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts` |
| **ESPN legacy remote config archive** | `packages/remote-config/src/testing-utils/espn/qa.json` |
| Legacy slim config (unused by CUP) | `packages/remote-config/src/server-utils/get-slim-remote-config.ts` |
| Remote-config client atoms | `packages/remote-config/src/browser-utils/remote-config.ts` |
| Dictionary hook (CUP wrapper) | `packages/cgi/commerce-base/src/common/dictionary/context/use-dictionary.ts` |
| Dictionary lookup | `packages/dictionary/src/lib/callback.ts` |
| Dictionary query URL / tenant | `packages/dictionary/src/lib/utils.ts`, `packages/dictionary/src/queries/client.ts` |
| Dictionary types / namespaces | `packages/dictionary/src/models/dictionary.ts` |
| **ESPN dictionary fallbacks** | `packages/dictionary/src/data/espn/fallback-manual.ts` |
| Globalization / currency | `packages/cgi/commerce-base/src/common/services/globalization/` |
| Locale | `packages/cgi/commerce-base/src/common/i18n/intl-locales/hooks/use-intl-locale.tsx` |
| Language + RTL | `packages/cgi/commerce-base/src/common/i18n/language-redirect/` |
| Flex offer models | `packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts` |
| Experiment offer models | `packages/cgi/commerce-base/src/common/services/experiments/models/offers.types.ts` |
| Flex offer components | `packages/cgi/commerce-base/src/common/components/flex/offer/` |
| Privacy consent package | `packages/privacy-consent/` (+ `AGENTS.md`) |
| ESPN consent switch | `apps/commerce/espn/src/common/layouts/utils/render-consent.tsx` |
| OneTrust region gate | `packages/cgi/commerce-base/src/common/one-trust/hooks/use-is-onetrust-enabled.tsx` |
| Consent config | `packages/cgi/commerce-base/src/common/one-trust/hooks/use-consent-config.tsx` |
| ESPN env | `apps/commerce/espn/.env`, `.env.local.example`, `.env.development`, `.env.test` |
| Secrets tooling | `scripts/lib/configure/secrets.sh`, `scripts/lib/check-commerce-secrets.sh` |
| ESPN pages | `apps/commerce/espn/pages/commerce/`, `apps/commerce/espn/pages/identity/` |
| ESPN E2E | `apps/commerce/espn/playwright/tests/` |
| Flag test helpers | `packages/cgi/commerce-base/src/test/playwright-utils/mystique-feature-flag-handler.ts`, `packages/cgi/commerce-base/src/test/setup/jest.mock-mystique-feature-flags.ts` |

## Appendix B — Things asked about that do not exist in this repo

Verified absent by repo-wide grep (excluding `node_modules`, `.next`). **CONFIRMED**

| Asked-about symbol | Status | Closest cgi-web equivalent |
|---|---|---|
| `regionExperience` | **0 hits** | Country `group` (`"North America" \| "EMEA" \| "APAC" \| "LATAM" \| "Marvel"`) and `BusinessRegion` (`NA \| EMEA \| APAC \| LATAM`) |
| `getExperimentTreatment` | **0 hits** | Per-experiment hooks reading `useMystiqueFeatureFlags().data?.[FEATURE_ID]`, or `useSpearmintExperiment({ processVariant })` |
| `wpnx-ESPN-*` (other than Banner-Payment-Retry) | **0 hits** | `wpnx-enable-legacy-analytics-espn`, `wpnx-web-identity-*-espn*`, `wpnx-disney-nav-espn` |
| `ESPN Select` as a code identifier | **0 hits** (copy only, and only in Disney+ dictionaries) | `flagship` (= ESPN Unlimited), `package_espn` (= ESPN+) |
| `nflbundle` (one word, lowercase) | 1 hit; the real forms are `nfl_bundle` (45), `NFLBundle` (17), `nflBundle` (6) | fixtures in `account/success/__fixtures__`, `account/change-subscription/__fixtures__` |

The `regionExperience` / `getExperimentTreatment` naming is from **Flex
(`growth-life-client-api`)**, the server-driven-UI BFF that cgi-web consumes. If those are the target
of investigation, they must be researched in that repo, not this one.
