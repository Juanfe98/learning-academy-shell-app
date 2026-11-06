# Hulu-Specific Implementation Dossier — growth-life-client-api

Scope: exhaustive, code-verified catalogue of every Hulu-specific mechanism in the repo. All facts carry `path:line`. Anything not directly observed in code is explicitly tagged `ASSUMPTION`.

---

## 1. Partner/Brand Detection

### Mechanism
The API is brand-agnostic at the transport layer — it learns which brand (Disney/Hulu/ESPN/Star) a request belongs to entirely from the **`x-bamtech-partner`** header, which Edge (BAMTech's edge/session layer) sets before the request ever reaches this service.

- Header key constant: `partner = 'x-bamtech-partner'` — `src/middlewares/models/StandardHeaders.ts:81` (enum `StandardHeaderKeys`)
- Field on the parsed header bag: `partner?: Partner; // 'x-bamtech-partner'` — `src/middlewares/models/StandardHeaders.ts:33`
- A second constant definition of the same header string exists in the GLO-facing constants file: `DEVICE_PARTNER_HEADER_KEY = 'x-bamtech-partner'` (`src/lib/constants.ts:41`) and `IDENTITY_PARTNER_HEADER_KEY = 'x-bamtech-partner'` (`src/lib/constants.ts`, near identity headers) — used when re-sending the partner value onward to GLO/Identity.
- Example real-world value shown in the header-shape comment block: `"x-bamtech-partner": "disney"` — `src/middlewares/models/StandardHeaders.ts:200`.

### `Partner` type / enum
`Partner` is not a TS `enum`, it's a derived union type:

```ts
// src/domain/screen/common/types.ts:46-50
export type Partner =
  | Exclude<FlexAgreementSourcePartner, 'launchpad'>
  | 'unknown';

export type KnownPartners = Exclude<Partner, 'unknown'>;
```

`FlexAgreementSourcePartner` (imported from `!domain/models/flexAgreementDetails`) is the source enum; `'launchpad'` is stripped out because it's not used in Flex. Runtime membership is `'disney' | 'hulu' | 'espn' | 'star' | 'unknown'`, confirmed by the parallel lookup maps:

```ts
// src/domain/screen/common/types.ts:150-156
export const PARTNERS: Readonly<Record<Partner, Partner>> = {
  disney: 'disney',
  hulu: 'hulu',
  espn: 'espn',
  star: 'star',
  unknown: 'unknown',
};
```

### Where partner is read into `FlexContext`
`FlexContext` (`src/middlewares/models/FlexContext.ts:7-15`) carries `standardHeaders: StandardHeaders`, and `standardHeaders.partner` is the canonical read path everywhere in the app. There is no separate "brand detection" step/middleware that maps host or client-id → brand; the app trusts the Edge-supplied header directly (`flexRouteMiddleware`/`flexContextRouteHandler` populate `FlexContext` from the raw request headers — see `src/routes/CLAUDE.md`).

### Central helper functions (the actual detection API used throughout the codebase)
```ts
// src/domain/common/util.ts:201-223 (isPartnerHulu at :205 — VERIFIED)
export function isPartnerHulu(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === 'hulu';
}
export function isPartnerESPN(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === PARTNERS.espn;
}
export function isPartnerDisney(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === 'disney';
}
```
Documented as the standard pattern in `src/domain/CLAUDE.md` ("Partner/Region branching" section): `import { isPartnerHulu, isPartnerDisney } from '!domain/common/util';`.

`isPartnerHulu` alone is called at **~140 call sites** across `src/domain/screen/**`, `src/domain/execution/**`, `src/domain/metricsData/**`, `src/elements/v1/types/metricsData/**`, and the entire `src/platform/presentation/screen/assemblies/**` migration layer (verified via repo-wide grep for `isPartnerHulu(`).

There's also a raw-header variant used inside the offers conversion pipeline where `FlexContext` isn't yet built:
```ts
// src/domain/common/offers/offerConversion.ts:144
export function isPartnerHuluStandardHeaders(standardHeaders: StandardHeaders): boolean
```
used at `src/domain/common/offers/offerConversion.ts:2443`.

### Hulu-only headers (distinct from `x-bamtech-partner`)
Hulu tenant sends an additional device-capabilities header not shared by other brands:
```ts
// src/middlewares/models/StandardHeaders.ts:141-164
export enum HuluHeaderKeys {
  huluDeviceCapabilities = 'x-hulu-device-capabilities',
}
export interface HuluHeaders {
  huluDeviceCapabilities?: string; // x-hulu-device-capabilities
}
```
Documented in OpenAPI at `src/openapi/components/parameters/hulu-headers.yaml:1-10`.

There is also a legacy identity-linkage header specific to Hulu subscriber migration:
`disneyIdentityHuluLegacyDeviceId?: string; // 'x-disney-identity-hulu-legacy-device-id'` — `src/middlewares/models/StandardHeaders.ts:58`, backed by constant `GLO_LEGACY_DEVICE_ID_HEADER_KEY = 'x-disney-identity-hulu-legacy-device-id'` (`src/lib/constants.ts`, "Legacy device-id used for retrieving device information. To be deprecated when there is shared device context between brands.").

### Environment naming quirk (worth flagging for onboarding)
The whole app's environment-selection env var is literally called `HULU_ENV` (not a generic `APP_ENV`) — a historical artifact of the codebase's Hulu origins, still governing `isLocal()`, `isProduction()`, `isStaging()`, etc. for **all** brands:
```ts
// src/lib/environment.ts:2,28-34
let huluEnvironment = process.env.HULU_ENV;
export const getHuluEnvironment = (): string =>
  huluEnvironment || Environments.Local.toString();
```
`src/lib/CLAUDE.md` confirms: *"`environment.ts` — `isLocal()`, `isProduction()`, `isBehindVpn()`. Uses `NODE_ENV` + `HULU_ENV`"*.

---

## 2. Hulu-Specific Screens & Services

### Dedicated `domain/screen/hulu/` domain
Per `src/domain/CLAUDE.md`, `hulu/` is one of the named screen domains alongside `account/`, `subscription/`, `espn/`, `onetrust/`, `landing/`, `message/`. Files:

- `src/domain/screen/hulu/constants.ts` — Account Home screen config (`ACCOUNT_HOME_SCREEN_TYPE`, `DEFAULT_ACCOUNT_HOME_TEMPLATE_CONFIGURATION`, allowed agreement-source-type lists)
- `src/domain/screen/hulu/accountHomeService.ts` (3759 lines) — **Hulu-only Account Home screen** service (`buildAccountHomeScreen`, `buildSubscriptionActionsItems`, `buildSubscriptionDetailsItemsEM`, `buildSubscriptionDetailsAccountItems`, `agreementSortForHulu`)
- `src/domain/screen/hulu/accountHomeMetricsDataBuilder.ts` — `buildGenericAccountHomeInteraction()` (`:12-29`)
- `src/domain/screen/hulu/account/planSwitch/planSwitchSortService.ts` (202 lines) — Hulu-only switch-plan/add-on sort comparators, including a hardcoded Hulu upsell priority list:
```ts
// src/domain/screen/hulu/account/planSwitch/planSwitchSortService.ts:23-37
const huluPrioritizedAddonsPackageIds: string[] = [
  'espn_standalone', 'max_ads', 'max_no_ads', 'cinemax', 'showtime', 'starz',
  'sports', 'entertainment', 'espanol', 'unlimited_screens',
];
```
- `src/domain/screen/hulu/account/planSwitch/planSwitchOfferCardTermsModalBuilder.ts` (574 lines) — builds T&Cs modal content for switch-plan offer cards (Hulu-specific legal copy variants: `legalConsentLedgerHuluRecurring`, etc.)

### Routes — Hulu-only endpoints (v1 only, no v2 hulu routes exist)
```ts
// src/routes/screens/v1/hulu/index.ts
const hulu = koaRouter();
hulu.prefix('/hulu');
hulu.use(accountHome.middleware());   // GET /screens/v1/hulu/account-home
hulu.use(planSwitch.middleware());    // GET /screens/v1/hulu/plan-switch
```
- `GET /screens/v1/hulu/account-home` — `src/routes/screens/v1/hulu/accountHome.ts:10-34`, requires headers `accountId`, `partner`, `locationCountryCode`, `requestId`, calls `buildAccountHomeScreen()` from the hulu domain service.
- `GET /screens/v1/hulu/plan-switch` — `src/routes/screens/v1/hulu/planSwitch.ts:13-57`. Note: despite living under `/hulu`, this route actually delegates to the **shared** `buildPlanSwitchScreen()` from `!domain/screen/account/planSwitch/planSwitchServiceV2` (`:6,48`) — the "hulu" route path is a legacy URL namespace, the business logic is unified/partner-branched internally, not a separate implementation.
- OpenAPI: `src/routes/screens/v1/hulu/openapi.yaml` (tags: `Hulu`), `src/openapi/components/parameters/hulu-headers.yaml`.

### Screens with dense Hulu branching (not Hulu-exclusive, but heavily partner-conditioned)
Ranked by hulu-mention density in non-test source (counts = case-insensitive `hulu` occurrences per file):

| File | Hits | Role |
|---|---|---|
| `src/domain/screen/account/accountDetails/accountDetailsService.ts` | 107 | Shared Account Details screen — Hulu vs Disney branching for MyServices, partner CTA copy, subscription sort |
| `src/domain/screen/subscription/success/successService.ts` | 59 | Post-signup Success screen — Hulu redirect targets, "mlp-welcome" vs "welcome-back" |
| `src/domain/screen/account/planSwitch/ledgerService.ts` | 42 | Plan-switch ledger (confirm-changes) — Hulu billing/legal branches |
| `src/domain/screen/hulu/accountHomeService.ts` | 48 | Hulu-only Account Home |
| `src/domain/screen/subscription/ips/ipsService.ts` | 28 | In-Product Signup (upsell) — Hulu upsell header artwork |
| `src/domain/screen/account/planSwitch/planSwitchServiceV2.ts` | 23 | Plan switch V2 |
| `src/domain/screen/account/cancel/cancelLandingService.ts` | 23 | Cancel flow landing |
| `src/domain/screen/subscription/preview/previewService.ts` | 21 | Sign-up-flow preview/ledger |
| `src/domain/screen/hulu/account/planSwitch/planSwitchOfferCardTermsModalBuilder.ts` | 21 | Hulu plan-switch modal |
| `src/domain/screen/landing/planSelector/planSelectorService.ts` | 14 | SUF plan selector |
| `src/domain/screen/landing/deviceOutOfHousehold/deviceOutOfHouesholdInterstitialService.ts` | 16 | Device-out-of-household (OOH) interstitial — HITS analytics gated to Hulu only |

The **platform-migration mirror** of the same screens (`src/platform/presentation/screen/assemblies/*.ts`) is equally saturated: `successAssembly.ts` (65), `planSelectorAssembly.ts` (48), `planSwitchLedgerAssembly.ts` (38), `accountDetailsAssembly.ts` (15), `account-details/utils.ts` (41), `success/utils.ts` (70) — meaning every Hulu branch present in the legacy domain service has (or is being given) a matching branch in the platform-rewrite assembly.

### Representative "one hulu branch" example (welcome-back vs mlp-welcome redirect)
```ts
// src/domain/screen/subscription/success/successService.ts:1856
location: isPartnerHulu(flexContext) ? 'mlp-welcome' : 'welcome-back',
```
Same branch mirrored in the platform layer: `src/platform/presentation/screen/assemblies/successAssembly.ts:391,1369`.

### Cancel flow
`isPartnerHulu` gates cancel-landing copy/promo eligibility (`src/domain/screen/account/cancel/cancelLandingOptionsBuilder.ts:398,433`), cancel-success CTA style/back-to-account visibility (`src/domain/screen/account/cancel/cancelSuccessService.ts:651,1103`), and there's a dedicated Hulu-only Spearmint experiment gating the change-payment cancel-anytime legal footer (`SwitchBilling` — see §6).

### Account Home / MyServices partner logic
```ts
// src/domain/screen/account/accountDetails/accountDetailsService.ts:4071-4073
export const setValidPartner = (partner?: Partner): KnownPartners => {
  return partner && partner !== 'unknown' ? partner : 'disney';
};
```
`MyServicesPartner` type (`src/domain/screen/account/accountDetails/constants.ts:67`) enumerates cross-tenant partner logos, importing `HULU_PRODUCT_IDS` from `src/domain/screen/common/types.ts:202-205`.

---

## 3. Hulu Bundle / One-Hulu / SKU Handling

**No literal `oneHulu` / `one-hulu` / `ONE_HULU` identifier exists in application source** — repo-wide case-insensitive grep found zero hits outside two unrelated device-out-of-household experiment variant strings (`aggressive-passive-tone-hulu`, etc. in `src/__fixtures__/templates/configuration/flex-device-out-of-household/device-out-of-household.json:37-50`). **ASSUMPTION**: "One Hulu" is product/marketing shorthand for the unified ACP (Account Consolidation Program) Hulu subscription model — reflected in code as the `enable-legacy-hulu-subscription-details` flag and the "ACP subs migration" comments below, not as a named constant.

### Hulu product/SKU constants
```ts
// src/domain/screen/common/types.ts:166-171 (BaseProductIdKeys)
'HULU_ADS' | 'HULU_NO_ADS' | ...

// src/domain/screen/common/types.ts:202-205
export const HULU_PRODUCT_IDS = Object.freeze({
  HULU_ADS: '121a6942-a712-3943-963a-13b20daa6abe',
  HULU_NO_ADS: '7c26cac5-a6d5-3739-875c-444c7d71250c',
});
```
Extra-member variants and cross-referenced GLO source comments:
```ts
// src/domain/models/ledgerProductIds.ts:65-67, 110-112
HULU_ADS: '121a6942-a712-3943-963a-13b20daa6abe',
HULU_NO_ADS: '7c26cac5-a6d5-3739-875c-444c7d71250c',
HULU_EXTRA_MEMBER_ADS: '01e75d0f-67f5-3633-99ee-fd5cb96bdacb',
HULU_EXTRA_MEMBER_NO_ADS: '1298019d-7ae9-39ce-a94e-37b528eb7e23',
```

### Hulu offer types
`src/domain/models/offerType.ts`:
- `'HULU_STANDALONE'`, `'HULU_LIVETV_STANDALONE'` (deprecated, superseded by) `'HULU_LIVETV'` (`offerType.ts:42-44`)
- `'HYBRID_BUNDLE'` comment: *"Hulu Basic, Disney Premium, E+ (no tier)"* (`offerType.ts:37`)
- Bundle-tier comment block documenting Hulu-product composition of each bundle tier (`offerType.ts:76-79`), referencing Hulu's own Eligibility-Service and packageCohorts.json GitHub sources (`offerType.ts:73,109-110` — `github.prod.hulu.com/PEPC/...`)
- `hulu_basic` / `hulu_premium` / `hulu_basic_with_live_tv` / `hulu_premium_with_live_tv` package-cohort keys mapped to `HULU_STANDALONE` offerType (`offerType.ts:126-129, 349-383`)
- `hulu_no_ads_component` add-on with `addOn: ['hulu']` (`offerType.ts:679-688`)

### Legacy vs D2C ("ACP") Hulu subscription detection
```ts
// src/domain/common/util.ts:245-267
export function isLegacyHuluSubscription(agreement): boolean {
  const { type, partner } = agreement.source;
  return type === 'HULU' && partner.toLowerCase() === 'hulu';
}
export function isLegacyHulu3PSubscription(agreement): boolean {
  const { provider } = agreement.source;
  return isLegacyHuluSubscription(agreement) && provider.toLowerCase() !== 'hulu';
}
```
Gated behind feature flag `enable-legacy-hulu-subscription-details` (§5) which extends the allowed agreement-source types Account Home will render for legacy (non-ACP/non-DIRECT) Hulu subs:
```ts
// src/domain/screen/hulu/constants.ts:27-29
// Allow legacy Hulu subscriptions on ACP Account Home due to ACP subs migration
export const ACCOUNT_HOME_ALLOWED_AGREEMENT_SOURCE_TYPES_V2: FlexAgreementSourceType[] =
  ['DIRECT', 'OPS', 'CST', 'HULU'];
```
`isEntitledHuluSubscription()` (`accountHomeService.ts:226-234`) checks `subscription.offer?.labels?.includes('hulu')`.
`agreementSortForHulu` prioritizes agreements where `source.partner === 'hulu'` (`accountHomeService.ts:968-982`).

---

## 4. HITS / Hulu-Owned Analytics

The codebase uses **HITS** — a legacy Hulu-owned analytics event schema (doc links point at `minerva-legacy.prod.hulu.com`) — as one of several parallel metrics systems (alongside Glimpse/Adobe/Tealium, per `src/domain/CLAUDE.md`).

### HITS flow-name / screen-name enums
```ts
// src/elements/v1/types/metricsData/hitsData.ts:72-79 (VERIFIED)
export enum FLOW_NAMES {
  SUF_WEB_DEFAULT = 'suf_web_default',
  SUF_WEB_HI_SUF = 'suf_web_hisuf',
  SUF_WEB_REDEEM = 'suf_web_redeem',
  SWITCH = 'account_unified_plan_switch',
  HI_SWITCH = 'hi_switch',
  EXTRA_MEMBER_UPSELL = 'extra_member_upsell',
}
```
Doc references confirming HITS origin: `@see https://minerva-legacy.prod.hulu.com/hits/subscription_start/details` (`hitsData.ts:157`), `.../account_manage_addons_flow_start/details` (`hitsData.ts:213`), etc.

`SCREEN_NAMES` enum includes explicit Hulu-eligibility screen names: `HuluEligible = 'SUF - Hulu Eligible'`, `HuluIneligible = 'SUF - Hulu Ineligible'` (`hitsData.ts:39-40`).

### Where HITS `FLOW_NAMES.SUF_WEB_HI_SUF` / `HI_SWITCH` are consumed
- `src/domain/execution/commerce/redirectService.ts:116` (`hitsFlowName: FLOW_NAMES.HI_SWITCH`) and `:142` (`FLOW_NAMES.SUF_WEB_HI_SUF`) — commerce redirect action builder
- `src/domain/screen/landing/verifySegment/verifySegmentMetricsDataBuilder.ts:93,98,102`
- `src/domain/screen/subscription/preview/previewMetricsDataBuilder.ts:581,591,605,646,683`
- `src/domain/screen/common/verifySegment.ts:110,116,121,191,218`
- `src/domain/screen/account/planSwitch/ledgerMetricsDataBuilder.ts:810`
- `src/platform/presentation/screen/assemblies/planSwitchLedgerAssembly.ts:7633`

### Hulu-gated HITS builder — Device Out of Household
```ts
// src/domain/metricsData/deviceOutOfHousehold/deviceOutOfHouseholdHitsDataBuilder.ts:1-27
import { isPartnerHulu } from '!domain/common/util';
export function buildOutOfHouseholdHitsPageImpression(
  flexContext: FlexContext,
  experienceId?: FlexExperienceId
): HitsPageImpression | undefined {
  if (!experienceId || !isPartnerHulu(flexContext)) {
    return undefined;
  }
  // ...builds app:ooh:soft_block / app:ooh:hard_block / etc.
}
```
Every function in this file short-circuits to `undefined` for non-Hulu partners — **HITS is emitted for Hulu traffic only** on this screen (`:25,85,110,155,175,195`).

### Tealium — also Hulu-gated
```ts
// src/elements/v1/types/metricsData/tealiumData.ts:1,40
import { isPartnerHulu } from '!domain/common/util';
return isPartnerHulu(flexContext) ? tealiumData : undefined;
```
Consumed with `isPartnerHulu(flexContext) ? tealiumData : ...` conditionals in `previewService.ts:1208`, `ledgerService.ts:5821`, `planSwitchLedgerAssembly.ts:7326`.

### Other HITS builders
`buildHitsPageImpression`, `buildHitsUserInteraction` (`src/domain/metricsData/hitsDataService.ts`) are the generic constructors used across `hulu/accountHomeService.ts:28,612`, `redirectService.ts:7,23-26`, etc. `successMetricsDataBuilder.ts:498,519` also branches HITS `contentType`/emission on `isPartnerHulu`.

**Note on `suf_web_one_hulu`**: not found anywhere in this repo (verified via grep). Client-side only — see cgi-web dossier + corrections file.

---

## 5. Feature Flags Mentioning Hulu

Source: `src/lib/featureFlags/constants.ts`. Flags whose **key** contains `hulu`:

| Const name | Key | Default | Line | Description (from JSDoc) |
|---|---|---|---|---|
| `enableHuluAccountExtraMemberSection` | `enable-hulu-account-extra-member-section` | `false` | `constants.ts:1354-1357` | Enabling Hulu Account Extra Member Section. Expected final state: true. |
| `enableHuluEventsSection` | `enable-hulu-events-section` | `false` | `constants.ts:1581-1584` | Enabling Hulu Events Section on Account Home. Expected final state: true. |
| `enableBundleHuluActivationBypass` | `enable-bundle-hulu-activation-bypass` | `false` | `constants.ts:2790-2793` | *"When enabled, Disney trio bundle subscribers (redemption without payment / fixed-term) are linked to hulu.com instead of the activation page."* Expected final state: true. |
| `enableDeltaTransactHuluUpsell` | `enable-delta-transact-hulu-upsell` | `false` | `constants.ts:2878-2881` | Enabling Delta Transact cross-tenant banners (Hulu upsell variant). Expected final state: true. |
| `enableBundleHuluLoginOnSuccess` | `enable-bundle-hulu-login-on-success` | `false` | `constants.ts:2914-2917` | *"Redirect Hulu link on the signup success screen to Hulu login for ACP bundle subscribers (Duo, Trio, Flagship, Max). With the subs migration, Hulu is auto-activated and no longer requires /commerce/activate/hulu."* Expected final state: true. |
| `enableLegacyHuluSubscriptionDetails` | `enable-legacy-hulu-subscription-details` | `false` | `constants.ts:2936-2939` | *"Enable displaying legacy Hulu non-D2C subscriptions on Account Home."* Expected final state: true. |

None of the six carry an explicit "Expected expiration date" or "Cleanup ticket" JSDoc line — these read as longer-lived/operational rather than experiment-cleanup flags. All 6 are LaunchDarkly-backed (`https://app.launchdarkly.com/projects/growthLifeClientAPI/flags/<key>`).

Other flags whose JSDoc prose mentions Hulu without "hulu" in the key: comments at `constants.ts:1216-1218` ("Hulu Activation Success"), `2117,2128,2180` ("Expected final state: true (for Hulu and ESPN)" / "(for Hulu ONLY)").

---

## 6. Experiments (WeaponX + Spearmint) for Hulu

### Two parallel experimentation systems, unified at the middleware layer
Flex reads experiment assignments from **two different upstream systems**:

1. **WeaponX** (Disney's platform) — feature IDs prefixed `wpnx-`, dashboards at `weaponx.disneystreaming.com` / `weaponx.twdcgrid.net`. ~49 `wpnx-` experiment consts in `registry.ts`.
2. **Spearmint** (Hulu's legacy experimentation platform) — feature IDs prefixed `sprmnt-`, dashboards at `spearmint.prod.hulu.com` / `spearmint.staging.hulu.com`. 5 `sprmnt-` consts (all VERIFIED):
   - `AddonCohortRetention = 'sprmnt-GREAT-post-suf-addon'` (`registry.ts:432`)
   - `SwitchBilling = 'sprmnt-GREAT-switch-billing'` (`registry.ts:441`) — *"Hulu ACP Billing Cancel Anytime Copy experiment"*
   - `PlanSelectCardOrder = 'sprmnt-GREAT-plan-select-card-order'` (`registry.ts:479`)
   - `DuoUpsellStandaloneBilling = 'sprmnt-GREAT-duo-upsell-billing'` (`registry.ts:489`) — *"Hulu standalone → Duo upsell card"*
   - `CancelSaveHeader = 'sprmnt-GREAT-cancel-save-header'` (`registry.ts:721`, cleanup TODO GCIEX-10029)

The client sends whichever platform's assignments it has via two different headers, and the middleware normalizes both into one internal shape:

```ts
// src/middlewares/experimentation.ts:76-100 (VERIFIED)
function resolveClientExperiment(headers: StandardHeaders): WeaponXExperiment | undefined {
  if (headers.weaponxAssignmentsBase64) {
    try { return decodeClientHeader(headers.weaponxAssignmentsBase64); }
    catch { logger.warn('Unable to parse WeaponX assignments from client header'); return undefined; }
  }
  if (headers.spearmintAssignmentsBase64) {
    try { return mapSpearmintExperiments(decodeSpearmintAssignments(headers.spearmintAssignmentsBase64)); }
    catch { logger.warn('Unable to parse Spearmint assignments from client header'); return undefined; }
  }
  return undefined;
}
```
Headers: `spearmintAssignments = 'x-bamtech-spearmint-assignments'`, `weaponxAssignments = 'x-bamtech-weaponx-assignments'` (`StandardHeaders.ts:122-123`). WeaponX is preferred; Spearmint is the fallback.

Spearmint's wire format (`{e, t, n}` — experiment id, treatment id, `"featureId--variantId"` name) is mapped into the same `{variant_id, version}` shape WeaponX uses, so downstream code (`getExperimentTreatment`) never needs to know which platform an experiment came from:
```ts
// src/lib/experiments/treatment.ts:18-73 (VERIFIED)
export type SpearmintExperimentEntry = { e: number; t: number; n: string };
export type SpearmintAssignments = { [version: string]: SpearmintExperimentEntry[] };
export function decodeSpearmintAssignments(base64String: string): SpearmintAssignments {
  // base64 decode + trim-after-last-} workaround for intermittent trailing garbage
}
export function mapSpearmintExperiments(experiments: SpearmintAssignments): WeaponXExperiment {
  const mapped: WeaponXExperiment = { experiments: {} };
  Object.values(experiments).forEach((v) => v.forEach((entry) => {
    const [featureId, variantId] = entry.n.split('--');
    mapped.experiments[featureId] = { variant_id: variantId, version: entry.e };
  }));
  return mapped;
}
```
The middleware also supports a newer **direct WeaponX Assignments API** path (flag `enable-weaponx-direct-api`) and a **shadow-comparison** mode (`enable-weaponx-shadow-comparison`) that logs divergence between the API result and whichever client header was sent — `src/middlewares/experimentation.ts:240-316`.

### Detection pattern (uniform regardless of WeaponX/Spearmint origin)
```ts
// src/lib/experiments/treatment.ts:122-143
export const getExperimentTreatment = <T extends FeatureID>({ flexContext, featureId }) => {
  const treatment = getExperimentVariantId({ flexContext, featureId });
  if (!treatment) return undefined;
  if (!isValidVariant(treatment, featureId)) { logger.warn(...); return treatment as Variants<T>; }
  return treatment;
};
```

### Hulu-relevant experiment keys and consuming screens

| Const | Feature ID | Treatments | Consumed by | Purpose |
|---|---|---|---|---|
| `HuludaysBackground` | `wpnx-ips-huludays-background` | `['control','treatment']` (`variants.ts:171`) | IPS (device upsell) screen | Seasonal ("Huludays") background image treatment on IPS |
| `SwitchBilling` | `sprmnt-GREAT-switch-billing` | `['control','cancel-anytime']` (`variants.ts:341`) | change-payment screen | Hulu ACP "cancel-anytime" legal footer notice (`src/domain/screen/account/changePayment/experiments/buildLegalFooterNotice.ts`) |
| `PlanSelectCardOrder` | `sprmnt-GREAT-plan-select-card-order` | `['control','duo-first','duo-first-hulu-last','no-hulu']` (`variants.ts:370-375`) | Plan Selector (SUF) | Whether/where Hulu-branded plan cards appear in plan-select |
| `DuoUpsellStandaloneBilling` | `sprmnt-GREAT-duo-upsell-billing` | `['control','brand-focused','content-focused']` (`variants.ts:383+`) | Billing/ledger | Hulu-standalone → Duo upsell card copy variant (both treatments show card, differ in copy) |
| `AddonCohortRetention` | `sprmnt-GREAT-post-suf-addon` | `['control','bypass']` (`variants.ts:333`) | Post-SUF add-on flow | — |
| `CancelSaveHeader` | `sprmnt-GREAT-cancel-save-header` | `['control','loyalty','urgency',...]` (`variants.ts:542+`) | Cancel-flow save screen | Cleanup ticket GCIEX-10029 |
| `PreSelectedPlanCarouselUS` | `wpnx-great-preselect-plan-carousel-usa` | `['control','ascending_disney_hulu_preselected']` | Plan selector | Pre-selects a "Disney+Hulu" bundle card |

`registry.ts:812` maps `[HuludaysBackground]: HuludaysBackgroundTreatments` into the `featureIdToTreatments` compile-time validation map.

### FeatureSet pattern usage for Hulu experiments
See `src/domain/models/featureSet.ts` entries `EnableHuluEventsSubSection` (`featureSet.ts:690-692`) and `EnableMyServicesHuluNavigate` (`featureSet.ts:567-568`).

---

## 7. Templates — how Hulu variants get selected

Two distinct mechanisms; **neither is a dedicated "Hulu template" system**:

### (a) Experiment-driven template selection (`getTemplateConfiguration`)
Per `EXPERIMENTATION.md:44-51` and `src/domain/screen/common/configuration.ts:36`: a screen's config JSON declares `experimentFeatureIds: [...]`, and `templates`/`templatesV2` map `variant_id` → `{templateId, dataSetId, dataKey}`. Generic across all partners — Hulu experiments use the same mechanism.

### (b) Partner-keyed data merge (`getScreenDataWithPartner`)
```ts
// src/domain/screen/common/configuration.ts:235-262
export async function getScreenDataWithPartner<T extends object>({ data, dataKey, standardHeaders, validator }) {
  const screenConfig: any = data[DEFAULT_TEMPLATE_CONFIGURATION_DATA];
  ...
  const screenData: T = merge(
    {},
    screenConfig.default,
    screenConfig[standardHeaders.partner ?? 'unknown'],   // <-- 'hulu' | 'disney' | 'espn' | 'star' | 'unknown'
    additionalConfig
  );
  ...
}
```
A screen's static config JSON can carry a top-level `hulu` key (sibling to `default`, `disney`, `espn`, `star`) merged over `default` when `standardHeaders.partner === 'hulu'`. Used by `accountHomeService.ts` (`setAccountBreakdownSection`, `:699-721`) and `accountDetailsService.ts` (`MyServicesCyphersByPartner`).

---

## 8. Cypher Dictionaries Used by Hulu Screens

Hulu screens use the **same shared dictionaries** as every other partner — no Hulu-only dictionary namespace. From `src/lib/constants.ts`:

```ts
export const FLEX_CYPHER_DICTIONARY = 'unified-commerce';
export const FLEX_CYPHER_ONBOARDING_DICTIONARY = 'unified-commerce-onboarding';
export const OFFERS_CYPHER_DICTIONARY = 'unified-offers';
export const CYPHER_PAYWALL_DICTIONARY = 'paywall';
export const FLEX_CYPHER_LEGACY_IDENTITY_DICTIONARY = 'identity';
export const FLEX_CYPHER_LEGACY_APPLICATION_DICTIONARY = 'application';
export const FLEX_CYPHER_LEGACY_COMMERCE_DICTIONARY = 'commerce';
export const FLEX_ACCESSIBILITY_CYPHER_DICTIONARY = 'accessibility';
```
`hulu/accountHomeService.ts` imports `FLEX_CYPHER_DICTIONARY`, `FLEX_CYPHER_LEGACY_IDENTITY_DICTIONARY`, `OFFERS_CYPHER_DICTIONARY` (`:188-191`).

Brand differentiation happens **within** `unified-commerce` via per-partner copy-key naming — confirmed by fixture `src/__fixtures__/backends/cypher/cypher-getDictionaries-hulu.ts:1-9` (still `resourceKey: 'unified-commerce'`, populated with Hulu-flavored copy: `'404_btn_backnav': 'Hulu Home'`, `account_alert_comcast`, `account_copy_bundle_max_raptor_espn`).

Hulu-specific Cypher **keys** in `src/domain/models/cypher/cypherKeys.ts`:
```ts
// :481-482
legalConsentLedgerHuluRecurring: 'ledger_hulu_consent',
legalConsentLedgerHuluRecurringMixed: 'ledger_hulu_consent_mixed',
// :1354, 1577-1578
HULU: 'gift_card_hulu_image_accessible',
paymentRipcutHulu: { key: 'gift_card_hulu_image', ... },
// :2081-2082, 2103-2109, 2180
pendingCancelRestartLegalHulu: 'ledger_hulu_restart_legal',
huluEMPendingCancelBaseSub / huluEMPendingSwitchUpgrade / huluEMPendingSwitchDowngrade / huluEMPendingSwitchForfeiture
btnConfirmRestartSubHulu: 'ledger_hulu_consent_agree_cta',
```

Hulu-specific notification pipeline dictionaries:
```ts
// src/platform/core/orchestration/screens/huluUnlimitedPriceIncreasePipeline.ts:16-27
const HULU_UNLIMITED_PRICE_INCREASE_CYPHER_DICTIONARIES: CypherResource[] = [
  { resourceKey: FLEX_CYPHER_DICTIONARY, version: '0.0' },
  { resourceKey: OFFERS_CYPHER_DICTIONARY, version: '0.0' },
];
```
— same shared dictionaries, scoped by `screenName: 'message-hulu-unlimited-price-increase'` for cache-key isolation.

---

## 9. Region Config — Hulu Restrictions

**No partner-aware logic exists in the region-config layer.** `src/middlewares/RegionConfigurationCreator.ts` / `regionConfigurationHandler.ts`: zero `hulu` matches. `RegionConfiguration` is a pure country→`{countryCode, regionExperience, isStarRegion}` lookup (`REGION_EXPERIENCE_MAP`, `RegionExperience = 'DEFAULT'|'LATAM'|'EMEA'|'APAC'`) derived solely from `x-bamtech-location-country-code`.

**ASSUMPTION**: Hulu is operationally US-only, but this is not enforced as a region-config gate in this repo; any US-only restriction is enforced upstream at Edge or implicitly via GLO responses. No code path combining `isPartnerHulu()` with `regionConfig.countryCode !== 'US'` to block a request was found.

---

## 10. Platform Migration — Hulu-Relevant Screens

`src/platform/migrationConfig.ts` (`migrationRegistry`): every entry is `status: 'migrating'` except `membershipPause` (`'deprecated'`, `:450-467`). Hulu-relevant:

- **`planSwitchV2`** (`:155-176`) — legacy files explicitly include the Hulu-domain files
  `planSwitchSortService.ts` and `planSwitchOfferCardTermsModalBuilder.ts`; platform mirror
  `src/platform/presentation/screen/assemblies/planSwitchV2Assembly.ts`.
- **`message`** (`:106-132`) — inline config whose `platform` list includes
  `src/platform/core/orchestration/screens/huluUnlimitedPriceIncreasePipeline.ts` (Hulu Unlimited Price
  Increase notification experience, a sub-experience of the platform `message` screen).
- **`accountDetails`**, **`billingHistory`**, **`planSwitchLedger`**, **`success`** — heavy Hulu branching in
  both legacy service and platform assembly. `src/platform/migration-tracking/planSelectorAssembly-parity.json`
  has 257 hulu hits — the densest hulu-mentioning file in the repo (parity fixture for legacy-vs-platform
  plan-selector outputs in Hulu scenarios).

There is **no** `hulu`/`account-home` entry in `migrationRegistry` — Hulu Account Home is not currently in the migration tracker. **ASSUMPTION**: not yet slated for platform migration.

---

## 11. Backends Serving Hulu Data

### GLO (`growthLifeOrchestrator`) — primary offers/agreements backend
Every GLO request forwards the resolved `standardHeaders.partner` to GLO as the `brand` header:
```ts
// src/lib/constants.ts
export const GLO_BRAND_HEADER_KEY = 'brand';
export const DEVICE_PARTNER_HEADER_KEY = 'x-bamtech-partner';
```
`retrieveOffersV2()` sends it upper-cased:
```ts
// src/backends/growthLifeOrchestrator/GrowthLifeOrchestratorClient.ts:2825,2848-2861
const headers = {
  ...standardHeaders.edgeHeadersRaw,
  [GLO_BRAND_HEADER_KEY]: standardHeaders.partner!.toUpperCase(),
  [GLO_DEVICE_APP_RUNTIME_HEADER_KEY]: standardHeaders.deviceAppRuntime!,
  ...
  [GLO_LEGACY_DEVICE_ID_HEADER_KEY]: standardHeaders.disneyIdentityHuluLegacyDeviceId!,
};
```
`brand`/`x-bamtech-partner` appear as outbound headers on 50+ call sites (`standardHeaders.partner!.toUpperCase()` ~35 times, lowercase ~8 times, "Braavos specifically requires this lowercase" comment at :4621/:4666/:4710).

Hulu-only request-shaping branch (BBD Live-TV zipcode lookups):
```ts
// GrowthLifeOrchestratorClient.ts:1698-1701
if (standardHeaders.partner === 'hulu' && 'defaultZipcodeFromIpAddress' in switchSubmissionRequestData) {
  data.defaultZipcodeFromIpAddress = switchSubmissionRequestData.defaultZipcodeFromIpAddress;
}
```
Cancel-all body branches: `cancelBody = { partner: standardHeaders.partner! };` when no `agreementId` (`:1954-1955`).

GLO/Plasma base URLs point at Hulu's own infrastructure:
```
// src/config/defaults.ts:94,114 / src/config/production.ts:155
baseURL: process.env.GLO_BASE_URL || 'http://glo.staging.hulu.com'
baseURL: `http://plasma.ava.staging.hulu.com` / `http://plasma.ava.prod.hulu.com`
```
Also `GLO_TENANTS_HEADER_KEY = 'x-tenants'` (`src/lib/constants.ts:23`, comma separated uppercase tenants e.g. `'HULU,ESPN'`), sent by `GrowthLifeOrchestratorClient.ts:1214`.

### IPSE
Hulu-only device-id substitution:
```ts
// src/backends/ipse/IPSEClient.ts:442-450
const deviceIdHeaderKey =
  flexContext.standardHeaders.partner === 'hulu'
    ? GLO_LEGACY_DEVICE_ID_HEADER_KEY
    : GLO_DEVICE_ID_HEADER_KEY;
const deviceId =
  flexContext.standardHeaders.partner === 'hulu'
    ? flexContext.standardHeaders.disneyIdentityHuluLegacyDeviceId
    : flexContext.standardHeaders.deviceId;
```
GraphQL fragment `... on HuluAccountAttributes { email }` (`src/backends/ipse/Constants.ts:16-18`).

### Legato (watch-history/topGenre)
Hulu-specific header: `x-linked-hulu-profile-id` — `src/backends/legatoClient/LegatoClient.ts:69,77,99-101`.

### Template configuration backend
Cache keys namespaced by Hulu environment: `getTemplateConfig:${getHuluEnvironment()}:...`
(`src/backends/templateConfiguration/LocalCachedTemplateConfigClient.ts:33-34,49-50`).

### Redirect / activation links
`huluUrl`/`secureHuluUrl` → `https://www.hulu.com` / `https://secure.hulu.com` in prod
(`src/config/production.ts:168-169,220`), `huluqa.com` in default/staging (`src/config/defaults.ts:134-135,201`).

---

## 12. Routes Inventory — Hulu-Relevant Endpoints

### Hulu-namespaced routes (v1 only)
| Method | Path | File |
|---|---|---|
| GET | `/screens/v1/hulu/account-home` | `src/routes/screens/v1/hulu/accountHome.ts` |
| GET | `/screens/v1/hulu/plan-switch` | `src/routes/screens/v1/hulu/planSwitch.ts` |

No `v2/hulu/*` routes exist.

### Shared SUF routes with Hulu branching
- `GET /screens/v1/subscription/preview` — `src/routes/screens/v1/subscription/preview.ts:11,456` (`const isHulu = isPartnerHulu(flexContext);`)
- `POST /screens/v2/subscription/preview` + `GET .../previewOld` — 10 `isPartnerHulu` sites in `previewService.ts`
- Plan selector — `src/domain/screen/landing/planSelector/planSelectorService.ts`
- Redeem promo code — `redeemPromoCodeService.ts:47` (`showBackButtonOnPromoCodeRedemption: isPartnerHulu(flexContext)`)
- Email capture — `emailCaptureService.ts` / `emailCaptureMetricsDataBuilder.ts`

### Account/cancel/plan-switch/payment routes with Hulu branches
- `GET /screens/v2/account/planSwitchLedger` — `src/routes/screens/v2/account/planSwitchLedger.ts`
- Cancel flow — `cancelLandingService`, `cancelSwitchService`, `cancelFlowService`, `cancelSuccessService`, `cancelPauseService`, `cancelLandingOptionsBuilder`
- `POST /execution/v1/payments/changePayment` → `changePaymentService.ts`
- `POST /execution/v3/subscription/switch` → `switchSubmissionService.ts:80,136`
- `POST /execution/v1/account/deviceOutOfHousehold/update` → `updateService.ts:171`
- Device-out-of-household screen family (`deviceOutOfHousehold*`, `deviceOutOfHouseholdInterstitial`) — Hulu-only HITS
- `GET /screens/v1/subscription/deviceSwitchBillingCadence` / `deviceSelectBillingCadence`
- `POST /execution/v1/orders`
- `GET /screens/v1/subscription/activationSuccess` — Hulu-login-on-success redirect (flag `enableBundleHuluLoginOnSuccess`)

---

## Summary Assessment for Onboarding

Hulu is not a bolt-on feature — it is one of the **four first-class partners** (`disney | hulu | espn | star`, plus `unknown`) that the entire domain layer branches on via `flexContext.standardHeaders.partner`, set from the Edge-supplied `x-bamtech-partner` header. There is exactly one dedicated Hulu-only domain (`src/domain/screen/hulu/`, Account Home + Hulu plan-switch sort/modal logic) and two dedicated Hulu-only routes; everything else — cancel, plan switch, success, preview, plan selector, device-out-of-household, account details, billing history — is a **shared implementation with pervasive `isPartnerHulu()` conditionals** (~140 call sites in legacy `domain/`, mirrored in the in-progress `platform/presentation/screen/assemblies/` rewrite). Hulu also uniquely carries: its own legacy analytics system (HITS, gated exclusively to Hulu on several screens), its own legacy experimentation platform (Spearmint, `sprmnt-` prefix, normalized into the WeaponX shape at the middleware), its own legacy device/identity header (`x-disney-identity-hulu-legacy-device-id`), and its own tenant-specific header (`x-hulu-device-capabilities`). The repo's env-var naming (`HULU_ENV`) and GLO's infra hostnames (`*.hulu.com`) are historical footprints of the platform's Hulu origins that now govern all four brands.
