# 09 — Flex BFF (`growth-life-client-api`) and ESPN: server-driven UI + the cgi-web contract

> **Access statement.** Both repos were **readable**. `growth-life-client-api` (PRIMARY) exists at
> `/Users/juanfelipe.montana/Documents/disney/repositories/growth-life-client-api` with a full `src/` tree,
> `AGENTS.md` (symlinked as `CLAUDE.md` and `.cursorrules`), `README.md`, `EXPERIMENTATION.md`, `TESTING.md`.
> `cgi-web` (SECONDARY) was researched for the consumer side only.
>
> **What I could NOT access** (labelled INFERRED or UNKNOWN throughout):
> - `growth-life-client-templates` — the **separate repo** that holds the real production EJS templates
>   (deployed to S3 / Site Config). Only the *local fixtures* of those templates exist inside Flex under
>   `src/__fixtures__/templates/`. Every template snippet in this doc is a fixture, not the deployed artifact.
> - Site Config / Highball config service, Cypher dictionary contents, LaunchDarkly flag values, WeaponX
>   experiment allocations, GLO (Growth Life Orchestrator) itself.
> - `client-sdk-configs` (the BamTech SDK bootstrap service) — its ESPN endpoint map is only visible in
>   cgi-web via checked-in **fixtures**.

**Path shorthand used below** (both are absolute roots):

| Shorthand | Absolute root |
|---|---|
| `FLEX/` | `/Users/juanfelipe.montana/Documents/disney/repositories/growth-life-client-api/` |
| `WEB/`  | `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web/` |

---

## §0. The one-paragraph answer, and the single most important finding

**Flex is a template-driven Koa BFF.** It fetches business data from backends (GLO, IPSE, Offers, Cypher,
Site Config, WeaponX…), converts backend `GLO*` types into domain `Flex*` types, builds *UI element objects*
(buttons, text, images) plus *analytics payloads* (`metricsData`, `adobeData`), then injects those objects into
a JSON template rendered with EJS, and returns the filled JSON. The client (cgi-web, or an OTT app) renders
that JSON. Nothing about layout copy or CTA wiring is decided in the client.

**THE FINDING THAT CHANGES HOW YOU DEBUG (CONFIRMED):**
The three ESPN-branded screens *inside* Flex — `FLEX/src/routes/screens/v1/espn/*` — are **NOT the screens
cgi-web renders**. They are device/OTT screens (`/paywall`, `/device-account-management`, `/device-ledger`)
consumed by ESPN native apps (Roku, tvOS, mobile). cgi-web's ESPN commerce app consumes the **shared,
partner-agnostic** Flex screens (`/screens/v*/subscription/preview`, `/screens/v*/account/account-details`,
`/screens/v1/landing/plans`, …) and gets ESPN-specific output purely because the request carries
`x-bamtech-partner: espn`.

So: **"grep `espn` in Flex" is the wrong first move for a cgi-web ESPN bug.** The right first move is
"find the shared screen service and grep for `isPartnerESPN` / `partner === 'espn'` inside it."
There are ~70 such comparisons (`FLEX/src` non-test) and they live in the *shared* services.

Corroborating evidence for the split:
- ESPN device routes are all `POST` under `/espn` and require device headers:
  `FLEX/src/routes/screens/v1/espn/index.ts:10` (`espn.prefix('/espn')`), `:12-14` mounts paywall,
  accountManagement, ledger.
- cgi-web's ESPN Playwright specs assert against **shared** paths, never `/espn/*`:
  `WEB/apps/commerce/espn/playwright/tests/flows/billing-ledger-version.spec.ts:11,17,26`
  (`/screens/v2/subscription/preview`, `/screens/v1/subscription/preview`) and
  `WEB/apps/commerce/espn/playwright/tests/flows/change-subscription-confirm.spec.ts:28-36`
  (`/screens/v2/account/plan-switch-ledger`).
- The real ESPN *web* paywall is not in cgi-web at all: remote config points
  `path.commerce.plan_select` at `https://sandbox.espn.com/watch/offers`
  (`WEB/packages/remote-config/src/testing-utils/espn/qa.json`); cgi-web reaches it via a
  `navigateWithTenant` → `espn_plan_selector` mapping
  (`WEB/packages/cgi/commerce-base/src/common/lib/use-handle-flex-navigation-with-tenant.ts:81-87`).

---

## §1. What `growth-life-client-api` is, in one page

**Self-description** — `FLEX/AGENTS.md:7`:

> Template-driven Koa API serving UI screens and action executions for Disney+, Hulu, and ESPN+. Fetches
> business data, injects into JSON templates via EJS, returns processed UI + analytics JSON to frontend
> clients. Templates live in separate repo `growth-life-client-templates` (deployed to S3).

**Request lifecycle** — `FLEX/AGENTS.md:41-45`:

```
Request → Route (Joi validation) → flexContextRouteHandler → Service → Response
                                                              ├── backends/ (GLO, IPSE, Offers, Cypher...)
                                                              ├── domain/common/ (GLO→Flex conversion)
                                                              ├── elements/v1/types/ (UI builders)
                                                              └── domain/metricsData/ (analytics builders)
```

Expanded, with the real files:

| Stage | Where | Notes |
|---|---|---|
| 1. Listen | `FLEX/src/server.ts:22,28` | `getServerPort() \|\| config.serverPort` → **3200** (`FLEX/src/config/defaults.ts:89`) |
| 2. Middleware | `FLEX/src/middlewares/` | `requestHeaders.ts`, `regionConfigurationHandler.ts`, `deviceContextHandler.ts` (1326 lines), `sessionAccessHandler.ts`, `experimentation.ts`, `flexContext.ts` |
| 3. FlexContext | `FLEX/src/middlewares/flexContext.ts:41-51` | packs `standardHeaders`, `regionConfig`, `device`, `sessionAccess`, `isAuthenticated`, `experimentation`, `storeFrontCountry` into `ctx.state.flexContext` |
| 4. Router mount | `FLEX/src/routes/screens/index.ts:7-10` → `v1/index.ts:13-22` / `v2/index.ts:8-12` | `/screens` → `/v1` \| `/v2` → `/{domain}` |
| 5. Validation | `FLEX/src/routes/screens/common.ts:67-90` | `flexRouteMiddleware({ validate, handler })` — Joi on header/query/body; V1 GET screens use `flexContextRouteHandler` (`:30-41`) |
| 6. Service | `FLEX/src/domain/screen/{domain}/{screen}/{screen}Service.ts` | `Promise.all` fan-out; build elements; `fillTemplate()` |
| 7. Template fetch | `FLEX/src/domain/template/templateService.ts:153-190` (`getTemplate`) | Site Config namespaced `flex-${screenType}` (`:97`), device override, fallback config, then hard-coded fallback JSON (`:41-54`) |
| 8. Template fill | `FLEX/src/domain/template/templateService.ts:201-216` (`fillTemplate`) | EJS render → `{ data, metadata }` |
| 9. Response validation | `FLEX/src/lib/validator/` + generated schemas | `npm run build:typeguards`, `npm run build:swagger` |

**Two type systems** (`FLEX/AGENTS.md:48`): raw `GLO*` types in
`FLEX/src/backends/growthLifeOrchestrator/models/` convert to domain `Flex*` types in
`FLEX/src/domain/models/` via wrappers in `FLEX/src/domain/common/`. A bug in "the price is wrong" is
almost always in the conversion layer or in GLO, not in the template.

### 1a. The "platform" migration — Flex is currently TWO engines

**CONFIRMED, and this is a trap.** `FLEX/AGENTS.md:28`:

> Some screens are being migrated from `src/domain/screen/` (legacy) to `src/platform/` (platform) and
> **both implementations are live behind a feature flag**.

- Registry: `FLEX/src/platform/migrationConfig.ts:1-7` defines `MigrationStatus = 'migrating' | 'qa' | 'deprecated'`.
- **ESPN paywall is `migrating`** — `FLEX/src/platform/migrationConfig.ts:314-318`:
  ```ts
  paywall: createScreenConfig({
    screen: 'paywall',
    domain: 'espn',
    status: 'migrating',
  }),
  ```
- The ESPN v1 paywall route runs *both* engines and diffs them when a validation flag is on —
  `FLEX/src/routes/screens/v1/espn/paywall.ts:89-150`: `getEnablePlatformMigration(flexContext,'paywallAssembly')`
  chooses `buildGatewayScreen({ pipelineName:'paywallPipeline', assemblyName:'paywallAssembly', … })` (platform)
  vs `buildPaywallScreen(…)` (legacy); when `enablePlatformMigrationValidation` is also on, both run under
  `Promise.all` and `validateResponses(control, platform, keysToIgnore, 'paywallAssembly', requestId)`
  logs the delta while **the platform response is served** (`:147`).
- The ESPN v2 paywall route is platform-only — `FLEX/src/routes/screens/v2/espn/paywall.ts:76-88`
  (`assemblyName: 'paywallV2Assembly'`).

> **Debugging consequence:** for a `migrating` screen you must determine *which engine served the request*
> before you read any code. Legacy lives in `FLEX/src/domain/screen/…`; platform lives in
> `FLEX/src/platform/presentation/screen/assemblies/…` +
> `FLEX/src/platform/core/orchestration/orchestrator/functionRegistry/…`.

---

## §2. ESPN inside Flex — what is actually ESPN-only

### 2a. How the ESPN brand/partner is identified in a request

**CONFIRMED.** A single Edge-supplied header: `x-bamtech-partner`.

- Header key enum — `FLEX/src/middlewares/models/StandardHeaders.ts:81`: `partner = 'x-bamtech-partner'`.
- Typed field — `FLEX/src/middlewares/models/StandardHeaders.ts:33`: `partner?: Partner; // 'x-bamtech-partner'`.
- The allowed values — `FLEX/src/domain/screen/common/types.ts:46-50`:
  ```ts
  export type Partner =
    | Exclude<FlexAgreementSourcePartner, 'launchpad'>
    | 'unknown';
  export type KnownPartners = Exclude<Partner, 'unknown'>;
  ```
  concretely `disney | hulu | espn | star | unknown` per the exhaustive records at
  `FLEX/src/domain/screen/common/types.ts:150-156` (`PARTNERS`), `:25-31` (`BRAND_LOGOS`),
  `:158-164` (`PARTNER_TO_BRAND_LOGO_MAP`).
- The canonical predicate — `FLEX/src/domain/common/util.ts:213-215`:
  ```ts
  export function isPartnerESPN(flexContext: FlexContext): boolean {
    return flexContext.standardHeaders.partner === PARTNERS.espn;
  }
  ```
- **Gotcha:** several call sites do their own case-insensitive comparison instead of using the helper —
  e.g. `FLEX/src/platform/core/orchestration/orchestrator/functionRegistry/addOnSelectorFunctionRegistry.ts:323,340`
  (`standardHeaders.partner?.toLocaleLowerCase() === 'espn'`),
  `FLEX/src/domain/screen/subscription/addOnSelector/addOnSelectorService.ts:741`, and
  `FLEX/src/domain/metricsData/adobeDataService.ts:134` (`flexContext.standardHeaders.partner?.toLowerCase()`).
  `isPartnerESPN` is **case-sensitive**; the others are not. If a client ever sends `ESPN`, behavior diverges.

There is **no `ESPN_ENV`-style env var**. Environment is `HULU_ENV` (`local` | `ci` | deployed) and only
swaps *backends*, never brand: `FLEX/README.md:19-20`.

`x-bamtech-partner` is set by **Edge**, derived from the SDK client id in the access token — on the cgi-web
side that client id is `espn-a9b93989` (`WEB/packages/cgi/sdk-session/src/constants.ts:1-4`). cgi-web never
sends `partner` itself.

### 2b. ESPN-only source files (complete inventory)

```
FLEX/src/routes/screens/v1/espn/     index.ts (prefix '/espn'), paywall.ts, deviceAccountManagement.ts,
                                     deviceLedger.ts, openapi.yaml (tags: ESPN)
FLEX/src/routes/screens/v2/espn/     index.ts, paywall.ts, openapi.yaml
FLEX/src/domain/screen/espn/paywall/           paywallService.ts (2868 lines — the big one),
                                               paywallMetricsDataBuilder.ts (81), constants.ts (17),
                                               experiments/paywallService.ts (75 — strikethrough-price exp)
FLEX/src/domain/screen/espn/accountManagement/ accountManagementService.ts (1861),
                                               accountManagementMetricsDataBuilder.ts (83), constants.ts (19)
FLEX/src/domain/screen/espn/ledger/            ledgerService.ts (1379),
                                               ledgerMetricsDataBuilder.ts (32), constants.ts (17)
FLEX/src/domain/common/espn/espnModelBuilder.ts   (188 — toESPNCard, toESPNLedgerPlan, toESPNSubscriptionItem)
FLEX/src/domain/models/screens/v1/espn/           {paywall,ledger,accountManagement}{Data,Template}.ts +
                                                  common.ts (ESPNCard, LedgerPlan, SubscriptionItem)
FLEX/src/domain/models/screens/v2/espn/paywallV2Data.ts
FLEX/src/__helpers__/espnScreenCyphers.ts         (BASE_SCREEN_CYPHER)
```

Platform-engine counterparts (shared files, ESPN branches inside):
`FLEX/src/platform/presentation/screen/assemblies/paywallAssembly.ts`,
`.../assemblies/paywall/sharedHelpers.ts`,
`.../core/orchestration/orchestrator/functionRegistry/offersFunctionRegistry.ts`.

### 2c. ESPN-only config values

- **`espnCUP`** — the ESPN Commerce Unified Platform web host that device screens deep-link out to:
  - `FLEX/src/config/defaults.ts:43` (type), `:199` → `https://stage.web.plus.espn.com/`
  - `FLEX/src/config/production.ts:218` → `https://secure.web.plus.espn.com/`
  - consumed at `FLEX/src/domain/screen/espn/paywall/paywallService.ts:615,697,2524`,
    `FLEX/src/platform/presentation/screen/assemblies/paywallAssembly.ts:573,647,879`,
    `FLEX/src/platform/presentation/screen/assemblies/account-details/utils.ts:864` (`${espnCUP}identity/login`),
    `FLEX/src/domain/screen/account/accountDetails/accountDetailsService.ts:1736`.
  > This is the **bridge**: an OTT/device ESPN screen redirects the user to the cgi-web-ish ESPN web
  > property. Follow `espnCUP` to trace "device sent me to a web page and the web page is wrong".
- `FLEX/src/lib/constants.ts:407` — `MOCK_FLEX_CYPHER_ESPN_DICTIONARY = 'espn-dictionary'` (mock only).
- `FLEX/src/lib/constants.ts:714-717` — `ESPN_UNLIMITED_PRODUCT_ID`, used to relabel "ESPN Select" as
  "ESPN Unlimited" in Live TV bundles.
- `FLEX/src/domain/models/ScreenType.ts:37-39` — `'espn-paywall' | 'espn-account-management' | 'espn-ledger'`.

### 2d. ESPN-relevant feature flags (LaunchDarkly, project `growthLifeClientAPI`)

All in `FLEX/src/lib/featureFlags/constants.ts` (key union first, then the flag object; getters in
`FLEX/src/lib/featureFlags/featureFlags.ts`):

| Flag key | Line | Purpose |
|---|---|---|
| `enable-espn-bookworm` | `:51`, `:755-756` | ESPN "bookworm" (Google Play/IAP) experience |
| `espn-bookworm-signup-success` | `:80`, `:1037-1038` | bookworm success screen |
| `enable-already-have-espn-linkout` | `:157`, `:1860-1861` | "Already have ESPN+" linkout on upsell |
| `enable-mlb-on-espn-presentation` | `:174`, `:1985-1986` | MLB.tv-on-ESPN presentation; also gates cancel-all (`FLEX/src/domain/execution/subscription/cancel/cancelSubscriptionService.ts:173,260`) |
| `enable-swap-live-tv-espn-select-for-unlimited` | `:215`, `:2391-2392` | product-name swap |
| `disable-espn-paywall-mlb-flagship-offer-query` | `:236` | suppresses an offers query on the ESPN paywall |
| Explore Plans CTA on ESPN Account Management | `:1713` | — |
| Roku RPM on ESPN paywall | `:2597-2598` | direct billing instead of IAP on Roku |

Convention worth copying: each flag's JSDoc carries `Expected expiration date`, `Expected final state`,
`Cleanup ticket`, and a LaunchDarkly deep link (`FLEX/AGENTS.md:173-185`).

### 2e. ESPN Adobe analytics (partner-specific, and it leaks into shared screens)

`FLEX/src/domain/metricsData/adobeDataService.ts`: `:30-68` `buildESPNAdobeAnalyticsData(...)` hardcodes
`tenant: 'espn'`, `section: 'espnplus'`, `campaignId: 'ESPN_Purchase_CMPGN'`,
`products: getESPNProductsString(flexOffer?.offerId)`. `:120-137` `espnOnlyBuildESPNAdobeAnalyticsData(...)`
is the **shared-screen** entry point — reads `partner?.toLowerCase()`, returns `undefined` for non-ESPN.
`:177-179` is the interaction variant.

Shared services that fork on ESPN for analytics only:
`FLEX/src/domain/screen/subscription/success/successMetricsDataBuilder.ts:167,402`;
`…/subscription/preview/previewMetricsDataBuilder.ts:388,539`;
`…/subscription/addOnSelector/addonSelectorMetricsDataBuilder.ts:44`;
`…/landing/incoming-activation/incomingActivationMetricsDataBuilder.ts:23`;
`…/landing/redeem/redeemPromoCodeMetricsDataBuilder.ts:25`.
ESPN-only device paywall analytics: `FLEX/src/domain/screen/espn/paywall/paywallMetricsDataBuilder.ts:16-33`
(`buildPaywallAdobeData`) and `:45-81` (`buildESPNRedirectAdobeData`, which maps
`resume-subscription`/`open-iap-store` to Adobe action strings for mobile).

### 2f. ESPN branches inside SHARED screens — where cgi-web ESPN bugs actually live

**This is the list to grep when a cgi-web ESPN screen is wrong.** (~70 hits total; representative:)

*Legacy engine, under `FLEX/src/domain/screen/`*
- `subscription/preview/previewService.ts:2454, 2622, 2763` — `else if (partner === 'espn')`. This is the **billing/ledger** screen cgi-web calls as `subscriptionPreview`; start here for ESPN checkout bugs.
- `subscription/addOnSelector/addOnSelectorService.ts:375, 459, 494, 741, 940, 958, 987` — ESPN gets different badge styles (`badge4` vs `tagPrimary`), text styles (`headline-large` vs `label-medium`), banner, and background image.
- `subscription/success/successService.ts:567, 1239, 4361`; `subscription/restartLedger/restartLedgerService.ts:869` (ESPN-only `adobeData`).

*Platform engine, under `FLEX/src/platform/`*
- `presentation/screen/assemblies/`: `planSwitchLedgerAssembly.ts:532, 673, 7569` · `common/bannerBuilders.ts:911, 1241, 1369, 1523, 1759, 1843` · `successAssembly.ts:863, 2510` · `subscriptionDetailsAssembly.ts:349` · `change-payment/bannerBuilders.ts:102` · `addOnSelectorAssembly.ts:231, 271, 357, 375, 381` + `addOnSelectorAssemblyBuilders.ts:148, 333, 348`
- `core/orchestration/orchestrator/functionRegistry/`: `offersFunctionRegistry.ts:1934` (**plan ordering** differs for ESPN) · `subscriptionsFunctionRegistry.ts:1406`

---

## §3. The template system

### 3a. Anatomy of a template

A template is a **JSON document whose leaf values are EJS expressions**. Flex fetches it, renders it with the
service's `templateData`, and returns the result. Real ESPN paywall fixture —
`FLEX/src/__fixtures__/templates/flex-espn-paywall/espn-paywall/default.json` (whole file, 21 lines):

```json
{
  "data": {
    "content": {
      "header": "<%- JSON.stringify(data.header ?? null) %>",
      "subheader": "<%- JSON.stringify(data.subheader ?? null) %>",
      "plans": "<%- JSON.stringify(data.plans ?? null) %>",
      "loginCTA": "<%- JSON.stringify(data.loginCTA ?? null) %>",
      "redirect": "<%- JSON.stringify(data.redirect ?? null) %>",
      "metadata": "<%- JSON.stringify(data.metadata ?? null) %>",
      "footer": "<%- JSON.stringify(data.footer ?? null) %>",
      "footerActions": "<%- JSON.stringify(data.footerActions ?? null) %>"
    },
    "initialFocus": "",
    "metricsData": {},
    "screenType": "espn-paywall",
    "templateId": "espn-paywall"
  },
  "metadata": { "configurationId": "espn-paywall:espn-paywall:default::1700589390784" }
}
```

The V1 template is essentially a **slot list**: it declares which named sections exist and in what order the
client should find them. All content comes from the service. The `configurationId` is
`namespace:configType:configName::timestamp` — it is the thing to look for in a response when you need to prove
which template version was served.

Compare the ESPN **ledger** (`FLEX/src/__fixtures__/templates/flex-espn-ledger/espn-ledger/default.json`) —
slots `logo, header, description, disclaimers, plans, secondaryCTA` — and ESPN **account management**
(`FLEX/src/__fixtures__/templates/flex-espn-account-management/espn-account-management/default.json`) —
slots `header, subheader, subscriptions, events, plans, banners, interactions, additionalServices`.
Note `initialFocus` in all three: that field only makes sense for D-pad/remote navigation, which is more
evidence these are OTT screens.

### 3b. How an ESPN template differs from a Disney+ one

**INFERRED (structurally CONFIRMED, semantically inferred).** Mechanically, they don't differ at all — same
EJS-in-JSON convention, same `getTemplate`/`fillTemplate` path. What differs is:

1. **Namespace/`templateId`.** `getTemplate` builds the Site Config request as
   `namespace: \`flex-${screenType}\`` — `FLEX/src/domain/template/templateService.ts:97`. So ESPN's own
   screens resolve to `flex-espn-paywall` / `flex-espn-ledger` / `flex-espn-account-management`, i.e. a
   **separate Site Config namespace** from `flex-subscription-preview` etc. That is why the fixture folder
   names are `flex-espn-*`.
2. **Slot vocabulary.** ESPN device screens have `initialFocus`, `events`, `additionalServices`,
   `footerActions` — concepts absent from Disney+ web screens.
3. **For the shared screens cgi-web uses, the template is the SAME for all three brands.** ESPN differentiation
   happens entirely in *service code* (§2f) and in the *Cypher dictionary* (different copy behind the same key,
   resolved per tenant — `FLEX/src/backends/cypher/CypherClient.ts:66-71` sends `{ dictionary, platform,
   preferredLanguage, tenant }`).
4. **Device-specific overrides exist orthogonally to brand.** `fetchTemplateForDevice`
   (`FLEX/src/domain/template/templateService.ts:87-131`) fetches with and without `deviceName` and prefers the
   more specific one; `deviceName` = `device.deviceIdentifier` (`FLEX/…/espn/paywall/paywallService.ts:2860`).

### 3c. Two rendering engines: `fillTemplate` vs `fillPlatformTemplate`

- **Legacy** — `FLEX/src/domain/template/templateService.ts:201-216`:
  ```ts
  export const fillTemplate = <T extends ProcessedTemplate = ProcessedTemplate>({
    template, templateData,
  }: { template: Template; templateData: TemplateData }): T => {
    const filledTemplate = fillEjsData({ jsonObject: template, data: templateData });
    return { data: filledTemplate.data, metadata: filledTemplate.metadata } as T;
  };
  ```
  Backed by `FLEX/src/lib/ejs`.
- **Platform** — `FLEX/src/domain/template/templateService.ts:227-242` (`fillPlatformTemplate`), backed by
  `FLEX/src/platform/core/utils/ejsRendering.ts`, which adds **component composition helpers**:
  `compose` (`:124`), `composeList` (`:158`), `mapCompose` (`:196`), `hydrate` (`:102`),
  `hydrateVariables` (`:113`).
  Platform templates reference reusable JSON components from `FLEX/src/platformComponents/` (≈100 files:
  `banner.json`, `badge.json`, `advancedOfferCard.json`, `espnPlanCardV2.json`, …).
  Real ESPN v2 platform template —
  `FLEX/src/__fixtures__/templates/flex-espn-paywall/espn-paywall-v2-platform/default.json:1-17`:
  ```json
  "header":        "<%- compose(data.components.header?.path, data.components.header?.data) %>",
  "options":       "<%- compose(data.components.options?.path, data.components.options?.data) %>",
  "footerActions": "<%- mapCompose(data.components.footerActions) %>",
  "metadata":      "<%- hydrate(data.metadata) %>"
  ```
  and the composed component it pulls in — `FLEX/src/platformComponents/paywallBody.json:1-3`:
  ```json
  { "plans": "<%- composeList('espnPlanCardV2.json', data.plans) %>" }
  ```
  So V2/platform moves layout knowledge **into** the template repo (composable components) while V1 keeps
  layout in the service. This matters when you ask "can this be fixed without a Flex deploy?" — for platform
  screens, more often yes (template repo PR); for V1, usually no.

### 3d. Cypher keys and localization

Flex never returns literal user-facing English. It returns a **Cypher key + dictionary name**, and the client
resolves it against a downloaded dictionary.

- Builder — `FLEX/AGENTS.md:123`: `toCopy({ text, dictionary, variables? })`.
- Required pattern for new screens — `FLEX/AGENTS.md:34`: *"Use Pattern 1 (key + dictionary object) for new
  screens, not flat key strings."*
- ESPN's key table — `FLEX/src/__helpers__/espnScreenCyphers.ts:8-46`. Every key uses the
  `'unified-commerce'` dictionary:
  ```ts
  function cypher(key: string): FlexCypherData {
    return { key, dictionary: 'unified-commerce' };
  }
  export const BASE_SCREEN_CYPHER: ESPNAccountManagementScreenCypher = {
    header: cypher('account_details_header'),
    subheaderBookworm: cypher('account_details_header_description_bookworm'),
    logoCircleEspn: cypher('logo_circle_espn_plus'),
    logoCircleMlb: cypher('logo_circle_mlb_tv'),
    btnExplorePlansEntitledUrl: cypher('entitled_web_destination_url_flagship'),
    // …
  };
  ```
  Note `btnExplorePlansEntitledUrl` — **URLs are also Cypher keys**, so a wrong destination can be a
  dictionary problem, not a code problem.
- Dynamic values are `variables`, not baked strings — `FLEX/AGENTS.md:124`:
  `toCurrencyVariable(amount, currency)`, `toDateVariable(isoDate, format)`, `toCypherVariable(key, dictionary)`,
  `toStringVariable`, `toNumberVariable`, `toLinkToVariable`, `toTriggerModalVariable`, `toTimeVariable`.
- Cypher request shape — `FLEX/src/backends/cypher/CypherClient.ts:66-71`:
  `{ dictionary: CypherResource[]; platform: CypherPlatform; preferredLanguage: string; tenant: string }`.
  `CypherPlatform` (`:50-64`) enumerates `ios, tvos, roku, androidtv, xbox, …` — again device-shaped.
  If a requested dictionary isn't returned, Flex logs a warning and continues (`:250-252`) — **silent partial
  copy loss**.

### 3e. The screen contract types

Every screen has a TypeScript type that mirrors the template JSON exactly
(`FLEX/AGENTS.md:150`, step 2): `FLEX/src/domain/models/screens/v1/espn/paywallData.ts`,
`ledgerData.ts`, `accountManagementData.ts`, plus `…Template.ts` variants and
`FLEX/src/domain/models/screens/v2/espn/paywallV2Data.ts`.
These are compiled into runtime typeguards and JSON schemas:
- `npm run build:typeguards` — **mandatory after any type change** (`FLEX/AGENTS.md:17,33`); output in
  `FLEX/src/lib/validator/typeguards/`.
- `npm run build:swagger` — regenerates `FLEX/src/lib/validator/schemas/screens/*.json` and bundles
  `openapi.json`; the ESPN response schemas are referenced from
  `FLEX/src/routes/screens/v1/espn/openapi.yaml:45`
  (`espnV1DeviceAccountManagementApiResponse.json`).
- `FLEX/flexContractsConfig.json:1-57` pins a *separate* set of client-facing contracts
  (ips, reacquisition, giftCard, planSwitchLedger, planSwitch, roku/paypal payment,
  deviceAccountDetails) with `additionalProperties: false` — i.e. strict, breaking-change-sensitive contracts.
  **No ESPN screen is in that list**, which suggests ESPN screens are not yet under strict contract lock.

---

## §4. Screens vs executions for ESPN

### 4a. ESPN screen inventory (screens Flex owns under `/espn`)

| Method + path | Route file | Service | Screen type / template |
|---|---|---|---|
| `POST /screens/v1/espn/paywall` | `FLEX/src/routes/screens/v1/espn/paywall.ts:23` | `buildPaywallScreen` (`FLEX/src/domain/screen/espn/paywall/paywallService.ts:2845`) **or** platform `paywallAssembly` | `espn-paywall` (`FLEX/src/domain/screen/espn/paywall/constants.ts:5-12`) |
| `POST /screens/v2/espn/paywall` | `FLEX/src/routes/screens/v2/espn/paywall.ts:12` | platform only, `paywallV2Assembly` (`:78`) | `espn-paywall` / `espn-paywall-v2-platform` |
| `POST /screens/v1/espn/device-account-management` | `FLEX/src/routes/screens/v1/espn/deviceAccountManagement.ts:17` | `buildAccountManagementScreen` | `espn-account-management` (`…/accountManagement/constants.ts:5-13`) |
| `POST /screens/v1/espn/device-ledger` | `FLEX/src/routes/screens/v1/espn/deviceLedger.ts:19` | `buildLedgerScreen` | `espn-ledger` (`…/ledger/constants.ts:5-12`) |

### 4b. Guards / preconditions per ESPN screen (from the Joi schemas)

**Paywall** — `FLEX/src/routes/screens/v1/espn/paywall.ts:27-74`:
- **Required headers:** `x-bamtech-device-app-runtime`, `-device-family`, `-device-profile`, `-partner`,
  `-location-country-code`, `-session-access`, plus `x-request-id`, `x-bamsdk-platform`.
  **Optional:** `x-bamtech-account-id`, `x-bamtech-is-test`.
- **Conditional:** `x-bamtech-identity-id` is required **iff** `x-bamtech-session-type === 'REGISTERED'`
  (`:32-39`) — i.e. the paywall is explicitly reachable by guests.
- **Query is an exclusive alternative** (`:49-62`): exactly one of `{entitlementId}`, `{label}`,
  `{offerPackage}`, each optionally with `offerType`. Sending two → 400.
- **Body:** `IAPSkuPricingBaseSchema` + optional `context.paywallType ∈ {'event','generic'}`, or `{}`.
  This is how the native app hands Flex the **App Store / Play Store prices** it read off the device — Flex
  cannot know IAP prices. See `mapIapSkuInfoToFlexOffers` (imported at `paywallService.ts:15`).
- Not a guard but notable: `includeMVPDCard: false` is hardcoded (`:124,153` — *"removed from designs for now"*).

**Device ledger** — `FLEX/src/routes/screens/v1/espn/deviceLedger.ts:23-59`: shared
`commonJoiHeaders({ required: [...] })`; query is a 4-way alternative:
`{offerType+tier(+entitlementId,offerPackage)}` | `{offerId+campaignId(+…)}` |
`{offerPackage + flow:'rokuTwoStep'}` | `{entitlementId + flow:'rokuTwoStep'}`.
`flow: 'rokuTwoStep'` is a real Roku-specific purchase path.

**Device account management** — `FLEX/src/routes/screens/v1/espn/deviceAccountManagement.ts:32-34,47-48`:
only query param is `displayMode`, coerced defensively — `ctx.query.displayMode === 'light' ? 'light' : 'dark'`
(so **anything unrecognized silently becomes dark mode**).

**Dev-only escape hatch:** `FLEX/src/routes/screens/v1/espn/index.ts:15-17` mounts `!routes/dev` under
`/espn` only `if (isBehindVpn())`.

### 4c. Action executions — and the ESPN answer

**CONFIRMED: there are NO ESPN-namespaced executions.** `FLEX/src/routes/execution/` has
`v1|v2|v3` × `{account, commerce, notifications, offers, onetrust, orders, payments, segment, subscription,
wallet}` — no `espn` directory (see `FLEX/src/routes/execution/**/index.ts` listing). Executions are
partner-agnostic; ESPN reaches them with `x-bamtech-partner: espn`.

The only ESPN-aware execution logic found:
`FLEX/src/domain/execution/subscription/cancel/cancelSubscriptionService.ts:173, 260, 270-273` —
`enableMLBOnESPNPresentation` changes the `cancelAll` behavior when no `subscriptionId` is supplied.

**And this is doctrine, not accident** — `FLEX/EXPERIMENTATION.md:17`:

> **Scope:** Experiments apply only to screen presentation/configuration (`src/domain/screen/`). No experiments
> exist in execution flows (`src/domain/execution/`).

Executions cgi-web ESPN actually invokes (from `WEB/` Playwright + code):
`PUT /execution/v1/subscription/subscriber-cohorts`, `PUT /execution/v2/subscription/switch`,
`/execution/v2/subscription/signup`, plus the payment executions
(`/execution/v{1,2}/payments/{creditCard,apm,paypal,giftCard,klarna,ideal,mercadoPago,roku,comcast}`).

**Payments note:** there is a whole parallel proxy tree —
`FLEX/src/routes/proxy/order/update/payment/updatePayment.ts` / `updatePaymentV2.ts`,
`FLEX/src/routes/proxy/order/update/cancel.ts`,
`FLEX/src/routes/proxy/orders/transactionDetails/…` — with its own error handler
(`FLEX/src/middlewares/proxyErrorHandler.ts`). Proxy routes pass through rather than build screens.

---

## §5. Experiments in Flex, and the ESPN ones

### 5a. The three-file pattern

`FLEX/EXPERIMENTATION.md:11-15`:

1. `FLEX/src/lib/experiments/variants.ts` — treatment arrays: `export const MyTreatments = ['control','variant-a'] as const;`
2. `FLEX/src/lib/experiments/registry.ts` — the `featureId` constant + JSDoc (dev name, WeaponX prod/staging links, product owner) + the `featureId → variants` map.
3. `FLEX/src/lib/experiments/treatment.ts` — `getExperimentTreatment({ flexContext, featureId })`.

`getExperimentTreatment` — `FLEX/src/lib/experiments/treatment.ts:122-143`:

```ts
export const getExperimentTreatment = <T extends FeatureID>({
  flexContext, featureId,
}: { flexContext: FlexContext; featureId: T }): Variants<T> | undefined => {
  const treatment = getExperimentVariantId({ flexContext, featureId });
  if (!treatment) return undefined;                       // ← unassigned users
  if (!isValidVariant(treatment, featureId)) {
    logger.warn(`Experiment Treatment variant: (${treatment}) for feature ID: ${featureId} did not match…`);
    return treatment as Variants<T>;                       // ← still returns it!
  }
  return treatment;
};
```

Two gotchas in nine lines: (a) `undefined` for unassigned users, so *"detection helpers must handle this"*
(`FLEX/EXPERIMENTATION.md:15`); (b) an **unknown** variant is logged but still returned, so a typo in
WeaponX propagates rather than failing closed.

**Where assignments come from:** the request. `x-bamtech-weaponx-assignments` (base64) —
`FLEX/src/middlewares/models/StandardHeaders.ts:49,123` — or `x-bamtech-spearmint-assignments`
(`:48,122`), which is decoded and normalized into WeaponX shape by
`decodeSpearmintAssignments` (`FLEX/src/lib/experiments/treatment.ts:35-52`, including a
`lastIndexOf('}')` trim workaround for corrupted base64) and
`mapSpearmintExperiments` (`:59-73`). Assignment lands on `flexContext.experimentation`
(`FLEX/src/middlewares/flexContext.ts:27,47`) via `FLEX/src/middlewares/experimentation.ts`.
**Flex does not allocate users to experiments — it only reads the allocation.**

### 5b. The FeatureSet pattern

`FLEX/EXPERIMENTATION.md:136`: *"Resolve the experiment treatment once and store as a boolean in FeatureSet.
The main service populates these flags, then passes `featureSet` to all builders."*

Concretely, `FLEX/src/domain/models/featureSet.ts:1861-1878`:

```ts
export interface PaywallFeatureSet
  extends IncludeMVPDCard, isIap, IsWebDevice, SignupOrSwitchFeature,
          TwoStepFlow, IsTierSelectionMode, SuperPaywallMode, HideESPNSelectPlan {}

export interface ESPNLedgerFeatureSet extends isIap {}

export interface ESPNAccountManagementFeatureSet
  extends SignupOrSwitchFeature, BookwormSubheaderFeature, ExplorePlansCTAFeature,
          AccountActivationCTAFeature, ScreenDisplayMode {}
```

So a screen's *entire* conditional surface is one flat boolean bag, composed from single-field interfaces.
`build:typeguards` must be re-run whenever it changes (`FLEX/EXPERIMENTATION.md:194`).

### 5c. Template config vs service code — the decision rule

`FLEX/EXPERIMENTATION.md:198-208` (verbatim, abridged):

> **Template config handles:** swapping static Cypher keys, different template layouts, static data overlays.
> **Service code is required when:** runtime data dependencies (offer prices, subscription state, entitlements);
> Cypher variables with dynamic values; region/country gating; conditional UI based on business data;
> programmatic element building; multi-experiment interactions.
> Most experiments need both.

### 5d. How a template config encodes an experiment — the real ESPN paywall config

`FLEX/src/__fixtures__/templates/configuration/flex-espn-paywall/espn-paywall.json` — **four ESPN experiments
share one screen config**, and each treatment maps to a different `dataKey`:

```json
{
  "experimentFeatureIds": [
    "wpnx-great-ESPN-Plan-Order-via-ESPN-Entry",
    "wpnx-ESPN-Plan-Select-Linear-Plan-Order",
    "wpnx-ESPN-Generic-Entry-Plan-Order",
    "wpnx-ESPN-Entry-Plan-Order"
  ],
  "templates": {
    "control":                       { "templateId": "espn-paywall", "dataSetId": "default", "dataKey": "default" },
    "plan_cards_mixed":              { "…": "…", "dataKey": "mixedSort" },
    "modified-plan-order":           { "…": "…", "dataKey": "linearSort" },
    "ascending-price-order":         { "…": "…", "dataKey": "ascendingPriceOrder" },
    "descending-price-order":        { "…": "…", "dataKey": "descendingPriceOrder" },
    "ascending-price-order-espn-entry": { "…": "…", "dataKey": "ascendingPriceOrderEspn" },
    "mixed-price-order-espn-entry":  { "…": "…", "dataKey": "mixedPriceOrderEspn" }
  },
  "data": {
    "linearSort": { "sortPlanCards": {
      "default":        { "sortOrder": [] },
      "espn:flagship":  { "sortOrder": ["FLAGSHIP_STANDALONE","FLAGSHIP_BUNDLE","FOX_BUNDLE"] } } },
    "ascendingPriceOrder": { "sortPlanCards": {
      "generic": { "sortOrder": ["ESPN_STANDALONE","DISNEY_3P_BUNDLE","FLAGSHIP_STANDALONE","FLAGSHIP_BUNDLE"] } } }
    /* … mixedSort, descendingPriceOrder, ascendingPriceOrderEspn, mixedPriceOrderEspn … */
  }
}
```

Read the inner keys carefully: `default` / `generic` / `event` / `espn:flagship` are **entry-point**
sub-selectors — the same treatment sorts plans differently depending on which entry the user came from
(`paywallType: 'event' | 'generic'`, from the request body — `FLEX/src/routes/screens/v1/espn/paywall.ts:67`).

**Resolution mechanism** — `FLEX/src/domain/screen/common/configuration.ts:36-96`:
fetch config via `TemplateConfigClient.getConfig(...)` (`:49`), read `experimentFeatureIds` (`:55`, with a
back-compat warn for the singular `experimentFeatureId` at `:57-63`), then for each featureId look up the
user's variant and map it through `templatesV2[variant][version]` or `templates[variant]` (`:77-83`).
Wired into ESPN paywall at `FLEX/src/domain/screen/espn/paywall/paywallService.ts:2810-2835`
(`getPaywallTemplateConfiguration`), then `:2857-2861` adds `screenType` + `deviceName`.

**HARD LIMIT (`FLEX/EXPERIMENTATION.md:279`):**

> When multiple `experimentFeatureIds` resolve for the same screen, `getTemplateConfiguration()` logs a warning
> and uses the **first match** … **Multiple experiments relying on template config changes simultaneously is
> not supported** — only one experiment's template variant will be applied.

Given the ESPN paywall config lists **four** featureIds, any overlap in allocation means three of them are
silently ignored at the template layer. This is a live footgun on the ESPN paywall specifically.

V1 vs V2 config shape: `templates` for v1-only screens, `templatesV2` (variant → `{v1,v2}`) when the screen has
both — `FLEX/EXPERIMENTATION.md:377-400`.

### 5e. ESPN experiment inventory (from the registry)

| Feature ID (WeaponX) | Registry line | Variants line | Notes |
|---|---|---|---|
| `wpnx-great-ESPN-Plan-Order-via-ESPN-Entry` | `FLEX/src/lib/experiments/registry.ts:178-179` | `variants.ts:93` | in paywall template config |
| `wpnx-great-Deemphasize-ESPN-Select` | `registry.ts:206` | `variants.ts:119-121` (`deemphasize_espn_select`) | platform helper `FLEX/src/platform/presentation/screen/assemblies/paywall/sharedHelpers.ts:126` |
| `wpnx-ESPN-Plan-Select-Strikethrough-Price` | `registry.ts:242-243` | `variants.ts:145` | **has dedicated service code** (below) |
| `wpnx-ESPN-Plan-Select-Linear-Plan-Order` | `registry.ts:342-343` | `variants.ts:248` | in paywall template config |
| `wpnx-ESPN-Generic-Entry-Plan-Order` | `registry.ts:622` | `variants.ts:455` | in paywall template config |
| `wpnx-ESPN-Entry-Plan-Order` | `registry.ts:631` | `variants.ts:464-467` | in paywall template config |

Registry map wiring: `registry.ts:803, 806, 810, 820, 852, 853`.

The **one ESPN experiment with real service code** —
`FLEX/src/domain/screen/espn/paywall/experiments/paywallService.ts:60-75`:

```ts
export function isESPNStrikethroughPriceExperimentEnabled(
  offer: FlexOffer, flexContext: FlexContext
): boolean {
  //  Only show strikethrough price for Non-PPV Flagship bundle.
  const hasNonPpvFlagshipBundle =
    !offer.hasPPV && offer.flexOfferType === 'FLAGSHIP_BUNDLE';
  const hasExperimentAssignment =
    getExperimentTreatment({ flexContext, featureId: ESPNStrikethroughPrice })
      === 'strikethrough-promo-price';
  return hasNonPpvFlagshipBundle && hasExperimentAssignment;
}
```

Textbook shape: **eligibility (business data) AND treatment (experiment)**. Both must hold. `// TODO GREAT-749:
Clean up or productionalize.` at `:24` and `:55` shows the cleanup-comment convention from
`FLEX/EXPERIMENTATION.md:54`.

Platform-engine experiment call sites relevant to ESPN paywall:
`FLEX/src/platform/presentation/screen/assemblies/paywallAssembly.ts:1335` (strikethrough) and
`FLEX/src/platform/presentation/screen/assemblies/paywall/sharedHelpers.ts:126` (deemphasize-select).

---

## §6. The cgi-web ↔ Flex contract (consumer side)

### 6a. The client boundary is three lines of delegation

Contract type — `WEB/packages/developer-experience/types/src/index.d.ts:582` and `:586-588`:
`getFlexScreen<T>(opts: FlexScreenOptions): Promise<FlexResponse<T>>` and
`flexExecution<T>(opts: FlexExecutionOptions): Promise<FlexExecutionResponse<T>>`.
Supporting types at `WEB/packages/developer-experience/types/src/types/bam-browser-sdk.d.ts:153-201`;
`flexApi: FlexAPI` hangs off `SDKSession` at `:377`.

ESPN implementation — `WEB/packages/cgi/data-interface-espn/src/flex/flex-data-interface.ts:8-19`:

```ts
export const getFlexDataInterface = (
  sdkSession: SDKSession
): Pick<DATA_INTERFACE, 'getFlexScreen' | 'flexExecution'> => ({
  getFlexScreen: <T>(o: FlexScreenOptions) => sdkSession.flexApi.getScreen<FlexResponse<T>>(o),
  flexExecution: <T>(o: FlexExecutionOptions) => sdkSession.flexApi.execute<T>(o),
});
```

Byte-identical for Disney+ (`WEB/packages/cgi/data-interface-disney/src/flex/flex-data-interface.ts:8-19`).
**Hulu is the outlier** — a hand-rolled `fetch` with its own key→path table, its own version override, and its
own error mapping (`WEB/packages/cgi/data-interface-hulu/src/flex/flex-data-interface.ts:8-38, 48-72, 76-78,
108-153, 160-318`). If you learn the ESPN/Disney path, do not assume it for Hulu.

Composition: `WEB/packages/cgi/data-interface-espn/src/data-interface.ts:16-34` →
`WEB/apps/commerce/espn/src/layout/hydrate-data-interface.tsx:29-35, 88-94` → Jotai `dataInterfaceAtom`
(`WEB/packages/cgi/commerce-base/src/common/data-interface/atoms.ts`).

**Two call paths coexist** (both can carry a bug):
1. `dataInterfaceAtom` → `getFlexScreen`, usually via
   `WEB/packages/cgi/commerce-base/src/common/hooks/use-get-page-data.ts:58-91`
   (react-query wrapper; query key `flexApi.getScreen.<key>` at `:82`; dev `href` override at `:66-76`).
2. `useSDKQuery` / `useSDKMutation` calling `sdkSession.flexApi.*` **directly**, bypassing the data interface —
   `WEB/packages/cgi/sdk-session/src/sdk-hooks.ts:78, 151`. Used by ESPN cohorts
   (`WEB/apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts:55-68`) and account details
   (`WEB/packages/cgi/commerce-base/src/account/account-details/pages/account-details-page.tsx:104-119`).

### 6b. Request shape — and the surprise

**cgi-web does not know Flex's URL.** It sends a symbolic `key` (+ `version`, `queryParams`, `requestBody`,
`headers`, `method`); the BamTech SDK resolves `key` → URL from the `client-sdk-configs` bootstrap. The ESPN
map (107 endpoints) is visible only in the checked-in fixture:
`WEB/packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json` →
`services.flex.client.baseUrl = "https://qa-espn.api.edge.bamgrid.com"`, endpoints shaped
`/screens/{version}/…` and `/execution/{version}/…`.

- SDK `commonHeaders` (same fixture): `X-Application-Version`, `X-BAMSDK-Client-ID: espn-a9b93989`,
  `X-BAMSDK-Platform`, `X-BAMSDK-Version` (client id matches `WEB/packages/cgi/sdk-session/src/constants.ts:1-4`).
  Per-endpoint: `Accept`/`Content-Type: application/json; charset=utf-8`, `Authorization: Bearer {accessToken}`.
- **The only header cgi-web itself adds:**
  `WEB/packages/cgi/commerce-base/src/common/constants/subscription-sources.ts:43-61` —
  `generateFlexHeaders({ salesPlatform })` → `{ 'X-Bamtech-Sales-Platform': salesPlatform }`, `undefined` when
  empty (Flex reads it at `FLEX/src/middlewares/models/StandardHeaders.ts:54,132`). Query sanitizer at `:68-82`.
  One-offs: `x-account-owner-{account,identity}-id` at
  `WEB/…/account/extra-member/pages/extra-member-accept-page/extra-member-accept-page.tsx:68-69`.
- **`x-bamtech-partner`, `-account-id`, `-identity-id`, `-session-*`, `-weaponx-assignments` are ALL injected by
  Edge/the SDK from the access token — cgi-web never sets them.** That is why "partner is wrong" is never a
  cgi-web bug. `templateConfiguration` is likewise **never** sent: Flex derives it from Site Config +
  experiments (§5d), so a client cannot request a specific template.

Richest example — the ESPN billing/ledger page, `WEB/packages/cgi/commerce-base/src/signup/pages/billing-page.tsx`:
param type `:88-114`, assembly `:264-290`, V1 options (`key:'subscriptionPreview'`, GET, `queryParams`) `:293-299`,
V2 options (`key:'subscriptionPreviewSecondary'`, `version:'v2'`, POST, `requestBody`) `:302-315`.
`__screen`, `__requestID`, `__region` (`:286, 311-312`) are **dev-only fixture selectors**, not Flex params.

### 6c. Response → React

There is **no single generic element renderer**. The architecture is: one typed model + one React component
per Flex element type + per-page action dispatch.

- **Models** — `WEB/packages/cgi/commerce-base/src/common/services/flex/models/` (28 files, barrel
  `index.ts:1-37`). Key: `interaction-element.types.ts:28-41` (`FlexInteractionModel` carries `metricsData`,
  `adobeData`, `action`, `copy`), `text-element.types.ts:84-94` + style enum `:10-80`, `actions.types.ts`
  (~30 `actionKey` values: `navigate`, `navigateWithTenant`, `linkTo`, `linkToCypher`, `submitForm`,
  `changeTemplate`, `triggerRichModal`, `switchplan`, `cancelSubscription`, `refresh`, …).
- **Components (1:1 with models)** — `WEB/packages/cgi/commerce-base/src/common/components/flex/`
  (barrel `index.ts:1-20`); `interaction-element/interaction-element.tsx:104-243`, style→button-kind
  `getKind` at `:64-93`, style→`data-testid` at `:44-62`.
- **Copy resolution (the real text renderer)** —
  `WEB/…/common/components/text-with-variables/text-with-variables.tsx:452-466, 1018-1024`;
  plain-string variant `WEB/…/common/lib/flex/get-flex-copy.tsx:195-234`.
- **Action dispatch** — `WEB/…/common/components/flex/actions-provider/actions-provider.tsx`
  (contract in `actions-provider/README.md:1-88`); each page supplies its own `onAction` switching on
  `action.actionKey`. Cross-tenant nav map at
  `WEB/…/common/lib/use-handle-flex-navigation-with-tenant.ts:80-106, 163-259`.
- **Redirect detection** — `WEB/…/common/lib/flex/is-flex-redirect.ts:24-31` (`templateId === 'redirect'`) —
  pairs with Flex's `buildRedirectTemplate` (`FLEX/src/middlewares/redirectHandler.ts`, used at
  `FLEX/src/domain/screen/espn/paywall/paywallService.ts:2458, 2472, 2544`).
- **`metricsData`** — envelope-level (`bam-browser-sdk.d.ts:188`) + per-element. Canonical consumption at
  `WEB/…/account/billing-history/pages/billing-history-page.tsx:82-119` (`<AnalyticsPageView>` /
  `<AnalyticsContainerView>`); enrichment `WEB/packages/instrumentation/src/glimpse/lib/get-enriched-metrics-data.ts:19-45`;
  docs `WEB/packages/instrumentation/src/README.md:132-176`. Adobe branch fired imperatively at
  `WEB/…/account/account-details/pages/account-details-page.tsx:120-135`.

### 6d. ESPN routes in cgi-web → Flex screen keys

| ESPN route file (`WEB/apps/commerce/espn/pages/commerce/…`) | commerce-base page | Flex key(s) |
|---|---|---|
| `plans/index.page.tsx:6` (flag-gated `:27`) | `signup/pages` `PlansPage` | `landingPlans` (`signup/pages/plans-page.tsx:237`) |
| `billing/index.page.tsx:16,87-93` | `BillingPage` | `subscriptionPreview` / `subscriptionPreviewSecondary` (`signup/pages/billing-page.tsx:294,303`) |
| `cadence/index.page.tsx` | `signup/cadence` | `landingCadence` (`cadence-page.tsx:29`) |
| `account/index.page.tsx:1` | `account/account-details` | `accountDetails` **v2** (`account-details-page.tsx:108-114`) |
| `billing-history/index.page.tsx:1` | `account/billing-history` | `billingHistory` v1/v2 (`:51-56`) |
| `change-subscription/index.page.tsx` | `account/change-subscription` | `planSwitch` (`:332`) |
| `change-subscription/confirm.page.tsx:1` | `…ConfirmPage` | `planSwitchLedger` / `…Secondary` (`:176-228`) |
| `change-subscription/success.page.tsx` | — | `planSwitchSuccess` (`:90`) |
| `subscription/index.page.tsx:5` | `account/subscription-details` | `subscriptionDetails` (`:67`) |
| `cancel/landing.page.tsx:31` | `retention/cancel` | `cancelSubscription`, `cancelSuccess` |
| `redeem/index.page.tsx:6` | `transactional/redemption` | `redeemPromoCode` (`:60`) |
| `unlock/index.page.tsx:6` | `account/unlock` | `ips` (`unlock-page.tsx:96-102`) |
| `activate/index.page.tsx:1` | `transactional/activation/pages` | `incomingActivation` (`activation-page.tsx:193,237`) |

ESPN-only cgi-web Flex code:
- `WEB/apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts:51-126` —
  `flexApi.execute({ key:'subscriberCohort', version:'v1', … })`; maps
  `cohorts[].type === 'wholesale_user' | 'wholesale_mvpd_user'` → Adobe
  `isWholesaleUser` / `isMVPDWholesaleUser` / `wholesaleUserProvider`.
  Driver: `WEB/apps/commerce/espn/src/hooks/use-fetch-espn-adobe-common-data.tsx:25-60`, wired at
  `WEB/apps/commerce/espn/src/layout/espn-layout.tsx:36-41`.
  **Duplicated (drift risk)** in the ESPN marketing app:
  `WEB/apps/marketing-unified/espn/src/views/landing-page/use-adobe-analytics-common-data/use-flex-adobe-analytics-subscriber-cohorts.tsx:38-47`
  (no `queryParams`, no headers).
- `WEB/packages/cgi/sdk-session/src/espn-device-attribute-provider.ts:14-58` — pushes the `espn_aid` cookie as
  `osDeviceIds` type `espnAnonymousSessionId`; wired at `espn-layout.tsx:20-22`.
- `WEB/packages/cgi/commerce-base/src/common/hooks/use-is-espn-legacy-analytics-enabled.tsx:9-23` — flag
  `wpnx-enable-legacy-analytics-espn` forks analytics on the ESPN billing page.
- `WEB/packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts:155` — `'ESPN_STANDALONE'`
  (same token as the Flex template config `sortOrder` arrays in §5d — that's the shared vocabulary).

---

## §7. Local development

### 7a. Run Flex locally

`FLEX/README.md:11-20`: (1) Node per `FLEX/.nvmrc`, `npm install`. (2) `npm run local-setup` — Vault secrets;
requires FlexDevs Dodgeball group + a `.env` from `FLEX/.env.example`
(`VAULT_ADDR=https://secrets.staging.hulu.com`, `VAULT_NAMESPACE`, `VAULT_ROLE`, `VAULT_TOKEN`) —
`FLEX/README.md:60-71`; **without Vault access the app errors out** (`:57-58`). (3) `npm run dev` = real remote
backends; **`npm run local`** = `HULU_ENV=local`, so template configuration, site config, and S3 site config all
read from local fixture files and Datadog tracing is off — **this is how you test template changes before
merging the `growth-life-client-templates` PR.** (4) Cache: `npm run clear-cache:development`
(`FLEX/README.md:27-31`) or `redli` (`:33-40`); staging site config otherwise takes 5-10 min per region.

**Port: 3200** — `FLEX/src/config/defaults.ts:89` (`serverPort: 3200`), used at `FLEX/src/server.ts:22,28`
(a donki `BIND_PATH` via `getServerPort()` takes precedence).

### 7b. Point cgi-web at local Flex — Traffic Director + Edge docker

**CONFIRMED, and the two ports line up exactly.** `WEB/packages/traffic-director-dev/setup-edge.sh` is the
whole mechanism:

- `:13-14` rewrite `qa-disney.api.edge.bamgrid.com` / **`qa-espn.api.edge.bamgrid.com`** → `local.*` in the
  Edge container's nginx confs (all 4 regions).
- `:15` `sed -i 's/growth-life-client-api-qa.us-east-1.bamgrid.net/host.docker.internal/'`
  — **the literal cgi-web → local-Flex upstream swap.**
- `:16` `sed -i '/host.docker.internal/{n; s/80/3200/}'` — **port 3200**, matching
  `FLEX/src/config/defaults.ts:89`.
- `:17-22` add local TLS listeners; `:25` restart the container.

Supporting pieces:
- `WEB/packages/traffic-director-dev/docker-compose-edge.yml:4-17` — `edge` image
  `apiservices.docker.artifactory.global.bamgrid.net/edge:b4adb0e`, `ENV=qa`, `REGION=us-east-1`, `9000:443`.
  Scripts: `WEB/package.json:81-84` (**`start:traffic-director-local-edge`**),
  `WEB/packages/traffic-director-dev/package.json:6-9`. Docs + artifactory `Bad Credentials` fix:
  `WEB/packages/traffic-director-dev/README.md:1-49`; root pointer `WEB/README.md:69-71`.
- **Detection is by Docker inspection, not env var:** `WEB/apps/commerce/espn/package.json:39` (`local-setup`)
  sets `WITH_TRAFFIC_DIRECTOR` / `WITH_EDGE_SERVER` from `docker ps -f name=…`;
  `WEB/apps/commerce/espn/next.config.js:14-17,128` → `publicRuntimeConfig.isUsingLocalEdgeServer`; read by
  `WEB/packages/cgi/sdk-session/src/lib/common-utils.ts:36-47`.
- **The key redirect:** `WEB/packages/cgi/sdk-session/src/sdk-atoms.ts:186-189` sets
  `configHostOverride = 'https://local.client-sdk-configs.bamgrid.com/bam-sdk'`, which makes the SDK resolve
  Flex base URLs to `local.qa-espn.api.edge.bamgrid.com`. Certs for those hosts: `WEB/scripts/var/settings.sh:3`.

### 7c. MSW instead of Flex

- `WEB/apps/commerce/espn/package.json:30` — `dev:integration` = `NEXT_PUBLIC_API_MOCKING=enabled`; gate at
  `WEB/packages/cgi/commerce-utils/src/environment.ts:34-38,47-50,52-56`. ESPN wiring:
  `WEB/apps/commerce/espn/src/test/components/espn-browser-mocks.tsx:13-27`, mounted at
  `WEB/apps/commerce/espn/src/layout/espn-layout.tsx:118-138`.
- **ESPN Flex-override recipe (inline in the file):**
  `WEB/apps/commerce/espn/browser-mocks/browser-handlers.ts:12-25` —
  `rest.get(\`${flexBaseURL}/screens/v2/account/account-details\`, …)`. `flexBaseURL` comes from the
  checked-in SDK config fixture (`WEB/packages/cgi/commerce-base/src/common/context/__fixtures__/sdk-config.ts:30-38,77`).
- `__screen` is the fixture selector inside handlers, surfaced in the Toodles dev panel
  (`WEB/packages/cgi/commerce-base/src/__browser-mocks__/__screens/__screens-store.ts:13-20`).
  Playwright per-brand base URL guidance: `WEB/docs/testing/playwright/README.md:424-464`.

### 7d. DEAD KNOBS — do not trust these

- **`dev:local-flex` does NOT point at local Flex.** `WEB/apps/commerce/espn/package.json:31` sets
  `NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled` and `WEB/apps/commerce/espn/turbo.json:5` declares it, but
  **nothing in the repo reads that variable**. Today it behaves identically to `dev:integration` (pure MSW).
- `LOCAL_EDGE_SERVER=disabled` (`WEB/apps/commerce/espn/.env:10`) is unread; the stale doc comment is at
  `WEB/packages/cgi/sdk-session/src/lib/common-utils.ts:34`. The real signal is `WITH_EDGE_SERVER`.
- There is **no** `FLEX_API_URL` / `GROWTH_LIFE_*` env var in cgi-web, and no Flex host key in
  `WEB/apps/commerce/espn/.env.local.example`.

---

## §8. Debugging playbook — symptom → owner

Read this table with §0 in mind: for a **cgi-web ESPN screen**, "Flex" means the *shared* service, not
`FLEX/src/domain/screen/espn/`.

| # | Symptom | Most likely owner | First place to look | Second |
|---|---|---|---|---|
| 1 | Wrong / English-fallback / literal-`{placeholder}` copy | **Cypher dictionary** (not code) | `WEB/packages/cgi/commerce-base/src/common/lib/flex/get-flex-copy.tsx:195-234` (`:166,180` log unresolved) | Flex key emitted by `toCopy` in the service; `FLEX/src/__helpers__/espnScreenCyphers.ts` |
| 2 | Copy is wrong *and* the key looks right | **cgi-web experiment override** | `WEB/…/common/hooks/experiments/use-copy-override-experiment.tsx:26-75` (any `wpnx-great-copy*` flag rewrites Flex cypher keys at render) | `use-spearmint-copy-overrides.ts:59-70` (`{key}__exp__{exp}__{variant}`) |
| 3 | Price is wrong by rounding / cents | **cgi-web** | `WEB/packages/cgi/commerce-base/src/common/lib/apply-legal-rounding.ts:8-19` (rounds **up** when locale omits cents) | `…/common/lib/use-currency-format.ts:11-56` |
| 4 | Price is wrong by amount | **Flex conversion → GLO** | `FLEX/src/domain/common/` (GLO→Flex), `FLEX/src/domain/common/flexMoney.ts` | GLO (`retrieveOffersV2`) — outside both repos |
| 5 | Wrong plan **order** on ESPN | **Flex template config or experiment** | `FLEX/src/__fixtures__/templates/configuration/flex-espn-paywall/espn-paywall.json` `sortPlanCards` | `FLEX/…/functionRegistry/offersFunctionRegistry.ts:1934` (`isPartnerESPN`) |
| 6 | Whole section missing from the screen | **Flex service** (template slot filled with `null`) | the `templateData.data` object, e.g. `FLEX/src/domain/screen/espn/paywall/paywallService.ts:2774-2792` | the template's slot list (fixture in `FLEX/src/__fixtures__/templates/…`, real one in `growth-life-client-templates`) |
| 7 | Bullet / list item missing inside a modal | **cgi-web**, near-certainly | `WEB/…/account/change-subscription/lib/filter-modal-list-items.ts:57-95` — **deletes** Flex items whose cypher key resolves falsy locally, mutating in place | callers: `plans-page.tsx:197-222,246`; `change-subscription-page.tsx:313-317,346` |
| 8 | Button renders as a plain link / wrong style | **cgi-web allowlist** | `WEB/…/flex/interaction-element/interaction-element.tsx:64-93` (`getKind` falls through to `'link'`) | `…/models/interaction-element.types.ts:12-23`, `text-element.types.ts:10-80` |
| 9 | Wrong experiment treatment applied | **WeaponX allocation first**, then Flex | `x-bamtech-weaponx-assignments` on the request → `FLEX/src/lib/experiments/treatment.ts:122-143`; look for the `did not match any of the expected values` warn | `FLEX/src/lib/experiments/registry.ts` (is the variant registered?) |
| 10 | Experiment treatment assigned but **template** unchanged | **Flex template-config collision** | `FLEX/src/domain/screen/common/configuration.ts:66-96` — first matching featureId wins; look for the `[experiments]` warn | `FLEX/EXPERIMENTATION.md:279` (documented limitation); ESPN paywall lists **4** featureIds |
| 11 | Treatment right on Flex, wrong on screen | **cgi-web client-side treatment hooks** | `WEB/packages/cgi/commerce-base/src/common/hooks/experiments/` (20+ hooks) | `plans-page.tsx:176-180` (experiment value injected into the *request*) |
| 12 | Wrong Flex **version** (v1 vs v2 payload) | **cgi-web** | `WEB/…/common/hooks/use-is-v2-ledger-enabled.tsx:23-47` (`wpnx-web-commerce-ftc-regulation-updates` OR remote-config OR Storybook override) | `billing-page.tsx:332-334`; Hulu-only override `data-interface-hulu/…:76-78` |
| 13 | 400 from Flex | **cgi-web request** | route's Joi block, e.g. `FLEX/src/routes/screens/v1/espn/paywall.ts:27-74` — note the exclusive query alternatives `:49-62` | `FLEX/src/routes/screens/common.ts:72-90` |
| 14 | 500 `TemplateNotFound` / `MalformedTemplateError` | **template repo / Site Config** | `FLEX/src/domain/template/templateService.ts:187-189`, `:63-74` | fallback path `:41-54`, `:167-183` |
| 15 | Screen renders but stale after a template merge | **Site Config cache** | `FLEX/README.md:22-40` — 5-10 min per region; `npm run clear-cache:development` | |
| 16 | Behavior differs between two identical-looking requests | **platform migration** | `FLEX/src/platform/migrationConfig.ts` (is the screen `migrating`?) | `FLEX/src/routes/screens/v1/espn/paywall.ts:89-150`; check the `validateResponses` diff logs |
| 17 | Missing / duplicated ESPN analytics event | **cgi-web**, usually | `WEB/packages/instrumentation/src/glimpse/lib/get-enriched-metrics-data.ts:19-45`; two emit paths behind `enableConversionToAnalyticsTrackUserInteraction` (`use-handle-flex-navigation-with-tenant.ts:236-247`); ESPN legacy fork `use-is-espn-legacy-analytics-enabled.tsx:9-23` | Flex builders: `FLEX/src/domain/metricsData/adobeDataService.ts:120-137` (returns `undefined` for non-ESPN) |
| 18 | ESPN screen shows Disney+ styling | **Flex partner branch missing** | grep `isPartnerESPN` in the *shared* service/assembly (§2f) | `FLEX/src/domain/common/util.ts:213-215` is **case-sensitive** — verify the header value |
| 19 | Wrong destination on a CTA | **could be either** — check the payload | if the action is `navigateWithTenant`, cgi-web owns the map: `use-handle-flex-navigation-with-tenant.ts:80-151` (unknown location **throws**); `get-path-from-flex-navigate-action.ts:18-33` supports only `home-page`/`welcome-back` | if the href came from a cypher key (`entitled_web_destination_url_flagship`), it's the dictionary; if from `espnCUP`, it's `FLEX/src/config/{defaults,production}.ts` |
| 20 | ESPN device screen sends user to a broken web page | **Flex redirect + the ESPN web property** | `FLEX/src/domain/screen/espn/paywall/paywallService.ts:2491-2544` (`buildPaywallRedirectTemplate`), `:615,697,2524` (`espnCUP`) | `FLEX/src/config/production.ts:218` |
| 21 | "The ESPN paywall is broken" (web) | **Not cgi-web, not `FLEX/src/…/espn/`** | remote config `path.commerce.plan_select = https://sandbox.espn.com/watch/offers` (`WEB/packages/remote-config/src/testing-utils/espn/qa.json`) | `use-handle-flex-navigation-with-tenant.ts:81-87` |
| 22 | IAP price wrong on an ESPN device screen | **the native client** | the price arrives in the request body (`IAPSkuPricingBaseSchema`, `FLEX/src/routes/screens/v1/espn/paywall.ts:65`) | `mapIapSkuInfoToFlexOffers` (imported `paywallService.ts:15`) |
| 23 | Local dev: cgi-web not hitting my local Flex | **setup, not code** | is `edge` container up + `setup-edge.sh` run? (`WEB/packages/traffic-director-dev/setup-edge.sh:15-16`) is Flex on 3200? | `dev:local-flex` is a **no-op** (§7d) — use `start:traffic-director-local-edge` |
| 24 | Response has an extra/missing field vs the type | **regen step skipped** | `npm run build:typeguards` (`FLEX/AGENTS.md:17,33`) | `npm run build:swagger`; CI checks `typeguards-check`, `openapi-check`, `template-link-check` (`FLEX/AGENTS.md:211`) |

### Quick triage heuristic

1. **Capture the raw Flex JSON** (devtools Network, or curl with the same headers). This single step decides
   ownership for ~80% of bugs.
2. Is the wrong value **present and wrong** in the JSON? → Flex (or GLO / Site Config / Cypher / WeaponX).
3. Is it **correct in the JSON but wrong on screen**? → cgi-web (rows 2, 3, 7, 8, 11, 17, 19).
4. Is the field **absent** from the JSON? → Flex service didn't build it (row 6) or the template has no slot
   for it (row 14) — check `data.metadata.configurationId` to identify the exact template version served.
5. If the screen is `migrating`, repeat 2-4 for **both** engines (row 16).

---

## §9. Vocabulary

| Term | Meaning |
|---|---|
| **Flex** | `growth-life-client-api`. Koa BFF for Disney+/Hulu/ESPN commerce+growth screens. |
| **Screen** | `GET`/`POST` under `/screens/v{1,2}/…` returning filled-template JSON. Read-only. |
| **Execution** | `POST`/`PUT` under `/execution/v{1,2,3}/…` performing an action (signup, switch, cancel, payment). No experiments allowed (`FLEX/EXPERIMENTATION.md:17`). |
| **Proxy** | `FLEX/src/routes/proxy/…` — pass-through to upstream, own error handler. |
| **FlexContext** | Per-request bag (`FLEX/src/middlewares/flexContext.ts:41-49`). |
| **StandardHeaders** | The Disney unified `x-bamtech-*` / `x-bamsdk-*` set, defined by Edge (`FLEX/src/middlewares/models/StandardHeaders.ts:8-139`). |
| **Partner** | `disney \| hulu \| espn \| star \| unknown`, from `x-bamtech-partner` (`FLEX/src/domain/screen/common/types.ts:46-50, 150-156`). |
| **Template** | JSON whose leaves are EJS expressions; lives in `growth-life-client-templates`, served via Site Config, namespaced `flex-${screenType}`. |
| **TemplateConfiguration** | `{ screenType, templateId, dataSetId, dataKey, deviceName?, useHighballTemplate? }`. |
| **`dataKey`** | Selects a static data blob inside the config's `data` object — the main lever a template-config experiment pulls. |
| **`configurationId`** | `namespace:configType:configName::timestamp`, returned in `metadata` — your receipt for which template served the response. |
| **Cypher / Dictionary** | Disney's localization service; Flex returns `{ key, dictionary }` (e.g. `unified-commerce`, `unified-offers`) and the client resolves it. |
| **GLO** | Growth Life Orchestrator — upstream owning offers, agreements, subscriptions. `GLO*` types → `Flex*` types. |
| **WeaponX / Spearmint** | Experiment platforms. Assignments arrive base64 in `x-bamtech-weaponx-assignments` / `x-bamtech-spearmint-assignments` (normalized at `FLEX/src/lib/experiments/treatment.ts:35-73`). |
| **FeatureID / treatment** | `wpnx-*` experiment name registered in `FLEX/src/lib/experiments/registry.ts`; treatment = the arm (`control`, `strikethrough-promo-price`, …). |
| **FeatureSet** | Flat boolean bag per screen, composed from single-field interfaces (`FLEX/src/domain/models/featureSet.ts`). |
| **Element builder** | `toInteractionElement`, `toLocalizedTextElement`, `toRichTextElement`, `toImageElement`, `toCopy`, `to*Variable` (`FLEX/AGENTS.md:120-124`). |
| **metricsData / adobeData** | Analytics payloads Flex embeds; consumed by Glimpse and Adobe respectively. |
| **Platform / legacy** | The two live Flex engines. Platform = `FLEX/src/platform/` (pipelines + assemblies + function registries + composable `platformComponents/`). Legacy = `FLEX/src/domain/screen/`. |
| **Assembly / pipeline** | Platform units: pipeline fetches+orchestrates, assembly builds presentation. `buildGatewayScreen({ pipelineName, assemblyName, … })`. |
| **Highball** | Alternate template channel (`useHighballTemplate`) — `FLEX/src/backends/s3siteHighballConfig`. |
| **CUP** | Commerce Unified Platform — the web commerce property (`espnCUP`, `disneyPlusCUP`). |
| **Bookworm** | Internal name for the Google Play / IAP-mediated ESPN flow. |
| **Traffic Director / Edge docker** | cgi-web local-dev proxy stack that rewrites the QA Edge upstream to `host.docker.internal:3200`. |

---

## §10. Gotchas

1. **`FLEX/src/domain/screen/espn/` is not what cgi-web renders.** (§0) Highest-value fact in this document.
2. **`isPartnerESPN` is case-sensitive; several ad-hoc comparisons are not.** `FLEX/src/domain/common/util.ts:214` vs `FLEX/…/addOnSelectorFunctionRegistry.ts:323`, `FLEX/src/domain/metricsData/adobeDataService.ts:134`.
3. **Only ONE template-config experiment can apply per screen.** `FLEX/src/domain/screen/common/configuration.ts:66-96` + `FLEX/EXPERIMENTATION.md:279`. The ESPN paywall config lists **four** featureIds.
4. **An invalid experiment variant is warned-about but still returned.** `FLEX/src/lib/experiments/treatment.ts:135-139`.
5. **`getExperimentTreatment` returns `undefined` for unassigned users** — every detection helper must handle it (`FLEX/EXPERIMENTATION.md:15`).
6. **Two live engines for `migrating` screens.** ESPN paywall is one (`FLEX/src/platform/migrationConfig.ts:314-318`); a fix in one engine silently does nothing in the other (`FLEX/AGENTS.md:28`).
7. **cgi-web mutates Flex responses in `select`.** `WEB/…/lib/filter-modal-list-items.ts:57-95` deletes Flex-provided items whose local cypher resolves falsy — in place (`:43`).
8. **cgi-web rounds prices up.** `WEB/…/apply-legal-rounding.ts:8-19`. A displayed price can legitimately differ from Flex's amount.
9. **cgi-web rewrites Flex cypher keys at render time** for any `wpnx-great-copy*` flag (`WEB/…/use-copy-override-experiment.tsx:26-75`) and via a second, dictionary-key-convention system (`use-spearmint-copy-overrides.ts:59-70`).
10. **Unknown Flex `style` values degrade silently** to `'link'` (`WEB/…/interaction-element.tsx:64-93`). Note `'paypalButton'` is handled there but is not in `flexInteractionStyleValues`.
11. **Unknown `navigateWithTenant` location THROWS** in cgi-web (`use-handle-flex-navigation-with-tenant.ts:178-211`); `get-path-from-flex-navigate-action.ts:18-33` supports only `home-page`/`welcome-back` and otherwise silently falls back.
12. **`dev:local-flex` is a lie** (§7d) — `NEXT_PUBLIC_FLEX_LOCAL_SERVICE` has no consumer. Use `start:traffic-director-local-edge`.
13. **`displayMode` on ESPN device account management coerces anything unrecognized to `'dark'`** (`FLEX/src/routes/screens/v1/espn/deviceAccountManagement.ts:47-48`).
14. **ESPN paywall query params are mutually exclusive** — `entitlementId` XOR `label` XOR `offerPackage` (`FLEX/src/routes/screens/v1/espn/paywall.ts:49-62`).
15. **Missing Cypher dictionaries fail soft** — warn + continue (`FLEX/src/backends/cypher/CypherClient.ts:250-252`), so partial copy loss is silent.
16. **Site Config caches 5-10 min *per region*** (`FLEX/README.md:24-25`).
17. **Forgetting `npm run build:typeguards` / `build:swagger` breaks CI** (`FLEX/AGENTS.md:86, 211`).
18. **`addOn` not `addon`** — ESLint `id-denylist` error (`FLEX/AGENTS.md:26`).
19. **`!` alias imports only; `../` parent imports are ESLint errors** (`FLEX/AGENTS.md:24`).
20. **The ESPN cohorts hook is duplicated** across `WEB/apps/commerce/espn` and `WEB/apps/marketing-unified/espn` with different args — a real drift risk.
21. **cgi-web never sends `partner`, `accountId`, or `templateConfiguration`.** Those come from Edge/token/Site Config. "Partner is wrong" is never a cgi-web bug.
22. **No ESPN screen is in `flexContractsConfig.json`**, so ESPN screens lack the strict `additionalProperties: false` contract lock the other screens have.

---

## §11. Open questions

1. **Who consumes `/screens/v1/espn/*`?** Strongly inferred to be ESPN native/OTT apps (Roku `rokuTwoStep`, `initialFocus`, `cib` Roku customer token, IAP body, `x-bamtech-device-family`). Not verified — the client repos were out of scope. **Verify before assuming a change there is safe for web.**
2. **Which templates are actually deployed?** Every template snippet here is a `src/__fixtures__` copy; the authoritative artifacts live in `growth-life-client-templates` (S3). UNVERIFIED whether the fixtures are in sync with production.
3. **Which engine serves the ESPN paywall in prod today?** Depends on the LaunchDarkly value of the `enable-platform-migration` family for `paywallAssembly`. Not readable from either repo.
4. **Are all four ESPN paywall `experimentFeatureIds` simultaneously allocated?** If yes, three are silently dropped at the template layer (§10.3). Needs a WeaponX check.
5. **`x-bamtech-partner` case in practice.** Always lowercase `espn`? The codebase hedges both ways (§10.2). Needs a captured production request.
6. **How is the ESPN web paywall at `sandbox.espn.com/watch/offers` built, and is `espnCUP` (`https://secure.web.plus.espn.com/`) the cgi-web ESPN deployment or a separate property?** Both outside the two repos; resolving them closes the loop on §0.
7. **Why are `data-interface-espn` and `data-interface-disney` byte-identical?** UNKNOWN whether that's intentional convergence or pending divergence.
8. **Is the ESPN omission from `flexContractsConfig.json` deliberate or a gap?** Adding ESPN screens there would make ESPN response changes CI-breaking (§10.22).
9. **Datadog tagging coverage.** `createDatadogTagMiddleware()` is applied to "some routes" (`FLEX/AGENTS.md:118`). UNVERIFIED whether ESPN routes are tagged — this determines how traceable an ESPN incident is.
10. **`x-hulu-device-capabilities` / `HuluHeaders`** (`FLEX/src/middlewares/models/StandardHeaders.ts:141-164`) has no ESPN analogue. UNKNOWN whether ESPN needs one.
