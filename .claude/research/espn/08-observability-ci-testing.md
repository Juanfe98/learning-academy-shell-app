# 08 — ESPN Observability, Analytics, CI/CD & Testing

> Repo: `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web` @ `main` (607747d290)
> Scope: how ESPN commerce (`apps/commerce/espn`, `@solo/commerce-espn`) and ESPN marketing/NEXUS
> (`apps/marketing-unified/espn`, `@solo/marketing-unified-espn`) are instrumented, built, tested and shipped.
> Every claim is labelled **CONFIRMED** (read from the file at the cited line) or **INFERRED** (deduced; verify before relying on it).
> All paths are absolute-from-repo-root unless prefixed with `/Users/`.

---

## 0. TL;DR — the ten things that matter

| # | Fact | Label | Cite |
|---|---|---|---|
| 1 | **ESPN does NOT use Glimpse for its own analytics.** ESPN's tracker stack is **Adobe Analytics + Adobe Launch**. Glimpse in ESPN commerce is inherited plumbing from `commerce-base` layouts, not ESPN-authored events. | CONFIRMED | §1.1 |
| 2 | Two different RUM services: ESPN commerce = **`web-solo-commerce-espn`**, ESPN marketing = **`espn-nexus`**. They are initialised by two completely separate code paths. | CONFIRMED | `packages/cgi/commerce-base/next.config.js:65`, `apps/marketing-unified/espn/next.config.js:54` |
| 3 | Two different RUM **applicationIds** → two different RUM applications in Datadog. Commerce `1ac57431-…`, marketing `fa8304bf-…`. You cannot query both in one RUM view without a multi-app query. | CONFIRMED | `packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:90`, `apps/marketing-unified/espn/src/libs/datadog-rum.ts:18` |
| 4 | Prod session sampling is **10%** on both surfaces. Non-prod/local is 100%. | CONFIRMED | `packages/observe/src/observe.ts:57-59`, `apps/marketing-unified/espn/src/libs/datadog-rum.ts:15` |
| 5 | ESPN commerce Playwright is a **hard merge gate** (`run-pr-checks-espn / status-check`). ESPN **marketing** Playwright is **not** a gate. | CONFIRMED | `.github/mergify.yml:12`, `.github/workflows/growth-pr-checks-espn.yml:12` |
| 6 | ESPN commerce Playwright coverage threshold is **10%** — the lowest of the three tenants (Hulu 18, D+ 35). | CONFIRMED | `.github/workflows/commerce-pr-checks-espn-sharded.yml:18` |
| 7 | **`metrics.yml` emits no ESPN commerce Playwright metrics** — its `workflow_run` name list is stale (pre-"(Sharded)" rename). | CONFIRMED | `.github/workflows/metrics.yml:10-13` vs `commerce-pr-checks-espn-sharded.yml:1` |
| 8 | **Zero ESPN jest test files carry the `@espn` tag** → all ESPN unit tests land in Datadog CI Visibility with no `test.product=espn`. | CONFIRMED | §6.3 |
| 9 | `PRODUCT=espn` is **missing** from `test:jest`/`test:watch`, so local unit runs silently use **Disney+ fixtures**. | CONFIRMED | `apps/commerce/espn/package.json:43,50` |
| 10 | 27-char branch limit is enforced client-side only, by a git hook, because **Jenkins/Fuzzbucket cannot deploy longer names**. | CONFIRMED | `git-hooks/post-checkout:31-32` |

---

## 1. Analytics / metrics stack

### 1.1 Which provider does which brand use? (CONFIRMED)

`@solo/instrumentation` ships **six** provider modules — Adobe Analytics, Adobe Launch, Glimpse, HITS, Tealium, Zenapse — and each app opts in to a subset.

```
packages/instrumentation/src/index.ts:13-19
    13	// platform specific analytics
    14	export * from './adobe-launch';
    15	export * from './adobe-analytics';
    16	export * from './glimpse';
    17	export * from './hits';
    18	export * from './tealium';
    19	export * from './zenapse';
```

Counting files that reference each provider per app (excluding `.next/`, `node_modules`):

| App | Glimpse | Tealium | AdobeAnalytics | AdobeLaunch | HITS | Zenapse |
|---|---|---|---|---|---|---|
| `apps/commerce/espn` | 6 (inherited) | 1 | **9** | **6** | 0 | 0 |
| `apps/commerce/hulu` | 13 | 9 | 8 | 1 | **18** | 0 |
| `apps/commerce/disneyPlus` | **28** | 0 | 11 | 8 | 1 | 0 |
| `apps/marketing-unified/espn` | 2 (test mocks) | 0 | **22** | **10** | 0 | 0 |
| `apps/marketing-unified/hulu` | 1 | **18** | 0 | 0 | **12** | 0 |
| `apps/marketing-unified/disneyplus` | **170** | 1 | 41 | 29 | 2 | 3 |

**Read this table as:** ESPN = Adobe. Hulu = Tealium + HITS. Disney+ = Glimpse. This matches the historical ESPN.com Adobe Analytics estate.

**Nuance on Glimpse in ESPN commerce (CONFIRMED):** the 6 hits are *not* ESPN events. They are:
- `apps/commerce/espn/pages/_app.page.tsx:62` — passing `initialGlimpseConfiguration` through to the legacy layout
- `apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx:23,103,117,132,153` — typing/forwarding `GlimpseV2StartupClientPayloadEnrichmentsModel`
- `apps/commerce/espn/src/test/setup/jest.mock-instrumentation.tsx:62-80` — jest mocks for `GlimpsePageView` / `GlimpseContainerView` / `GlimpseEventComponent`

i.e. ESPN commerce **hosts** the Glimpse provider tree because it reuses `commerce-base` layouts, but fires no ESPN-specific Glimpse events. **INFERRED:** whether Glimpse actually transmits for ESPN depends on the remote-config `enabledAnalyticsTooling` list (see §1.5) — verify in Sparrow/remote-config for the `espn` tenant before assuming ESPN traffic is absent from Glimpse.

### 1.2 ESPN marketing — the analytics loader (CONFIRMED)

`apps/marketing-unified/espn/src/shared/layout/application-layout/load-analytics.tsx` is the whole ESPN NEXUS analytics surface. Two trackers only, both gated on **targeted-advertising consent**:

```tsx
apps/marketing-unified/espn/src/shared/layout/application-layout/load-analytics.tsx:28-57
    28	  const hasPrivacyConsent = useHasPrivacyConsent();
    29	  const hasTrackingConsent =
    30	    hasPrivacyConsent.isReady &&
    31	    hasPrivacyConsent.enabledConsentGroups.targetedAdvertising;
    32	
    33	  const adobeAnalyticsTracker = useAdobeAnalyticsTracker();
    34	  const coreAnalytics = useCoreAnalytics([adobeAnalyticsTracker]);
    ...
    43	  return (
    44	    <Analytics trackers={coreAnalytics}>
    45	      {hasTrackingConsent ? (
    46	        <>
    47	          <AdobeAnalytics
    48	            tracker={adobeAnalyticsTracker}
    49	            adobeAnalyticsConfig={config.remoteAppConfig.analytics.adobe}
    50	          />
    51	          <AdobeLaunch
    52	            region={region}
    53	            pageName={pageName}
    54	            adobeLaunchScriptUrl={config.appConfig.adobeLaunchScriptUrl}
    55	          />
    56	        </>
    57	      ) : null}
```

Note `useCoreAnalytics([adobeAnalyticsTracker])` — a **single-element** tracker array. Disney+ passes several.

Supporting files:
- `apps/marketing-unified/espn/src/shared/layout/application-layout/load-analytics/analytics.tsx:14` — `useHydrateCoreAnalytics(trackers)`, nothing else.
- `apps/marketing-unified/espn/src/shared/layout/application-layout/load-analytics/adobe-launch.tsx:27-44` — pushes the Adobe Launch data layer. **Region is hardcoded to US**: `countryCode: 'us'`, `countrycodeRegion: 'North America'` (`:30-31`). ESPN+ is US-only, so this is intentional, but it is a landmine if ESPN ever internationalises.
- `apps/marketing-unified/espn/src/shared/layout/application-layout/load-analytics/adobe-launch.tsx:1` — `/* istanbul ignore file */`, i.e. **excluded from the 100% coverage gate**.

### 1.3 The Adobe Analytics tracker + builder functions (CONFIRMED)

`packages/instrumentation/src/adobe-analytics/adobe-analytics-tracker.ts` is the class. `ID = 'ADOBE_ANALYTICS'` (`:33`).

**Three event handlers only** (`:126-161`):

| Event key | Adobe primitive | Builder | Line |
|---|---|---|---|
| `page_impression` | `window.s.t(payload)` (page view) | `adobeTrack` | `:127-145` |
| `user_interaction` | `window.s.tl(linkObject, linkType, linkName, payload)` (click/link) | `adobeTrackLink` | `:146-156` |
| `cancellation_flow_start` | `window.s.t(payload)` | `adobeTrack` | `:157-160` |

There is **no `container_view` event for Adobe** — container views are a Glimpse concept only (§1.4).

The two private builders:

```ts
packages/instrumentation/src/adobe-analytics/adobe-analytics-tracker.ts:54-84
    54	  private adobeTrack = (
    55	    data: Events[keyof AdobeEvents],
    57	    partialPayload: Partial<PartialTrackPayload> = {}
    58	  ) => {
    62	    if (data.adobeAnalytics && window.s) {
    63	      const { pageName, products, events, ...contextData } =
    64	        data.adobeAnalytics.metricsData;
    66	      const partialPayloadWithAdobeData = {
    67	        pageName,
    68	        events,
    69	        products,
    70	        contextData: {
    71	          ...contextData,
    72	          timestamp: new Date().toISOString(),
    73	        },
    74	        ...partialPayload,
    75	      };
    77	      const payload = getCombinedPayload(
    78	        this.commonData,
    79	        partialPayloadWithAdobeData
    80	      );
    82	      window.s.t(payload);
    83	    }
    84	  };
```

`adobeTrackLink` (`:87-121`) is the same shape but calls `window.s.tl(...)` at `:119`, defaulting `linkName` to `data.adobeAnalytics.metricsData.eventName` when the caller supplies none (`:116-117`).

The final payload merge — the one function to know:

```ts
packages/instrumentation/src/adobe-analytics/lib/get-combined-payload.ts:9-21
     9	export function getCombinedPayload<C = {}>(
    10	  commonData: CommonData<C>,
    11	  partialPayload: PartialTrackPayload<C>
    12	): TrackPayload<C> {
    13	  return {
    14	    ...commonData,
    15	    ...partialPayload,
    16	    contextData: {
    17	      ...commonData.contextData,
    18	      ...partialPayload.contextData,
    19	    } as ContextDataPageVariable<C>,
    20	  };
    21	}
```

**Queueing + observability behaviour (CONFIRMED):**
- If `window.s` is absent the event is queued and a **Datadog warn log** is emitted: `packages/instrumentation/src/adobe-analytics/adobe-analytics-tracker.ts:205-207` — `'Adobe Analytics tried to fire before the script was loaded.'`
- On a successful `page_impression` a **RUM action `FIRE_ADOBE_PAGE_IMPRESSION_EVENT`** is emitted, deliberately mirroring `adobeTrack`'s guard so it isn't a false positive (`:133-144`).
- `flushQueue()` (`:172-184`) drains on script load; `updateCommonData()` (`:186-188`) swaps common data without recreating the tracker.
- Debug console output is gated on `localStorage.enableAnalyticsDebugger === '1'` (`:44`).

### 1.4 Event schema (CONFIRMED)

**Adobe payload shape** — `packages/instrumentation/src/adobe-analytics/models.ts`:
- `ContextDataSetByConsumer` (`:5-60`) — ~55 optional fields the caller may set (`dssAccountId`, `swid`, `offerId`, `subscriptionState`, `login_status`, `event_name`, `moduleLocation`, `ctaButtonCopy`, …).
- `ContextDataSetByPackage` (`:62-95`) — filled by the package: `adobeRsid`, `adobeRsidName`, `partner`, `site`, `webAppName` (remote-config); `browserType`/`osName`/`deviceType`/`useragent` (dss-device); `connectionType` (window); `adobeSdkVersion`/`mid`/`visitortype` (Adobe window objects); `timestamp`; hardcoded `platform: 'Web'`, `platformType: 'Web'`.
- Adobe page variables are narrowly typed: `EventsPageVariable = null | 'purchase' | 'scCheckout'` (`:111`), `TrackLinkType = 'o' | 'd' | 'e'` (`:147`), `VisitorIDConfigVariable = 'D=s_vi'` (`:99`).
- `AdobeAnalyticsConfig` (`:167-180`) — `rsid`, `rsidname`, `server`, `secureServer`, `visitorNamespace`, `audienceManagerServer`, `disableThirdPartyCookies`, `site`, `webAppName`, `crossDomains`.

**Glimpse payload shape (for contrast)** — `packages/instrumentation/src/events/index.ts:2-8` imports `GlimpseV2PageViewPayloadModel`, `GlimpseV2ContainerViewPayloadModel`, `GlimpseV2InteractionPayloadModel`, `GlimpseV2InputPayloadModel` from `@solo/types`. This is the page-view / container-view / interaction triad the brief asked about — it is **Glimpse's** taxonomy, not Adobe's.

**Glimpse builder functions** (relevant only if ESPN ever adopts Glimpse):

| Function | File:line |
|---|---|
| `useFirePageView` | `packages/instrumentation/src/glimpse/hooks/use-fire-page-view.ts:52` |
| `useEnrichPageViewAndTrackEvent` | `packages/instrumentation/src/glimpse/hooks/use-enrich-page-view-and-track-event.ts:33` |
| `useEnrichContainerViewAndTrackEvent` | `packages/instrumentation/src/glimpse/hooks/use-enrich-container-view-and-track-event.ts:39` |
| `useFireContainerViewFromCurrentPageView` | `packages/instrumentation/src/glimpse/hooks/use-fire-container-view-from-current-page-view.ts:36` |
| `useFireConsentChangedEvent` | `packages/instrumentation/src/glimpse/hooks/use-fire-consent-changed-event.ts:21` |
| `useFireFedPurchaseEvent` | `packages/instrumentation/src/glimpse/hooks/use-fire-fed-purchase-event.ts:21` |
| `getEnrichedMetricsData` | `packages/instrumentation/src/glimpse/lib/get-enriched-metrics-data.ts:18` |
| `getContainerViewMetricsWithOptionsApplied` | `packages/instrumentation/src/glimpse/lib/get-container-view-metrics-with-options-applied.ts:16` |
| `getFireEventCallback` | `packages/instrumentation/src/glimpse/lib/get-fire-event-callback.ts:35` |
| `isValidMetricsData` | `packages/instrumentation/src/glimpse/lib/is-valid-metrics-data.ts:3` |
| `sanitizeMetricsData` | `packages/instrumentation/src/glimpse/lib/sanitize-metrics-data.ts:13` |
| `getActivitySessionId` | `packages/instrumentation/src/glimpse/lib/get-activity-session-id.ts:17` |

Glimpse schema validation ("SHIELD") lives in the marketing Stitch package, **not** instrumentation:
`packages/marketing/stitch/src/builders/shared/metrics/{shield-validator,glimpse-event-schemas,event-definitions,get-metrics-data,glimpse-pixel-manifest-adapter}.ts`.

### 1.5 Provider enablement is remote-config driven (CONFIRMED)

```tsx
packages/instrumentation/src/glimpse/atoms/is-glimpse-enabled-atom.tsx:7-28
     7	export const isGlimpseEnabledAtom = atom(
     8	  (get) => {
     9	    let glimpseConfigEnabled = true;
    11	    try {
    12	      const enabledAnalyticsTooling = get(enabledAnalyticsToolingAtom);
    14	      if (enabledAnalyticsTooling === undefined) {
    15	        throw new Error(
    16	          'enabledAnalyticsToolingAtom should be hydrated before attempting to verify enabled analytics tools'
    17	        );
    18	      }
    20	      glimpseConfigEnabled = enabledAnalyticsTooling.includes('glimpse');
    21	    } catch {
    22	      datadogLogs.logger.warn('Glimpse config value not found');
    23	    }
```

**Trap:** the `catch` leaves `glimpseConfigEnabled = true` (fail-open) and only warns. If `enabledAnalyticsToolingAtom` is not hydrated, Glimpse is treated as **enabled**. Search Datadog logs for `Glimpse config value not found` to detect this.

### 1.6 ESPN commerce Adobe wiring (CONFIRMED)

ESPN commerce has its own tenant-scoped common-data hooks:

```ts
apps/commerce/espn/src/hooks/use-set-espn-adobe-common-data.ts:10-11
    10	// Default ESPN contextData fields; override/add more tenant‑specific props here.
    11	const DEFAULT_ESPN_CONTEXT: Partial<ESPNContextData> = { tenant: 'espn' };
```

- `useESPNAdobeCommonData()` (`:26-36`) — read, merging `DEFAULT_ESPN_CONTEXT` under the atom value.
- `useSetESPNAdobeCommonData()` (`:41-59`) — write, re-applying `DEFAULT_ESPN_CONTEXT` as the base on every update.
- Companion fetch hook: `apps/commerce/espn/src/hooks/use-fetch-espn-adobe-common-data.tsx`.
- `ESPNContextData` is imported from `@solo/types/src` (`:6`) — **INFERRED:** it is not defined under `packages/types/src` by that exact name (grep returned nothing), so it is either re-exported or defined via an alias; trace before extending.

**Legacy-analytics escape hatch (CONFIRMED)** — an ESPN-only WeaponX flag that bypasses CoreAnalytics:

```tsx
packages/cgi/commerce-base/src/common/hooks/use-is-espn-legacy-analytics-enabled.tsx:3-22
     3	/**
     4	 * A hook that is currently only used on the billing page
     5	 * To enable legacy adobeAnalyticsTrack() instead of CoreAnalytics analytics.track() for ESPN only.
     6	 */
     9	export function useIsESPNLegacyAnalyticsEnabled(): {
    13	  const { data: weaponXData, isSuccess } = useMystiqueFeatureFlags();
    15	  const isWeaponXFlagEnabled = Boolean(
    16	    weaponXData?.['wpnx-enable-legacy-analytics-espn']
    17	  );
```

Flag key: **`wpnx-enable-legacy-analytics-espn`**. Scope: billing page only. If ESPN billing analytics look wrong, check this flag first.

### 1.7 Adobe script delivery (CONFIRMED)

Two S3-hosted scripts, content-hashed, loaded in sequence (VisitorAPI → AppMeasurement):

```ts
packages/instrumentation/src/adobe-analytics/components/adobe-analytics.tsx:17-20
    17	const staticAssetsURL = 'https://static-assets.bamgrid.com/analytics/adobe';
    19	export const visitorAPIScriptURL = `${staticAssetsURL}/VisitorAPI.22048b062c272e1158b17ae0df0f0df2.js`;
    20	export const appMeasurementScriptURL = `${staticAssetsURL}/AppMeasurement.0f4ccdf2e0242119ff6f22c7a64ab0ff.js`;
```

Two behaviours worth knowing:
- **PII guard:** `window.s.ActivityMap.regionExclusions = 'BODY'` — set at `:73`, with the comment "prevents issue where ActivityMap's forced link tracking will fire and send DOM contents to adobe resulting in private user data being tracked" (`:69-72`).
- **Script-load failure disables Adobe and logs to Datadog:** `disableAdobeAnalytics()` + `datadogLogs.logger.error('Adobe Analytics script failed to load.', {}, error)` (`:77-84`). Ad-blockers will trip this — expect a background rate of this log.

---

## 2. Datadog RUM

### 2.1 Two initialisation paths (CONFIRMED)

| Surface | Init entry | Wrapper | Service | applicationId |
|---|---|---|---|---|
| ESPN **commerce** | `apps/commerce/espn/pages/_app.page.tsx:18` (`initDatadog()`, module scope) | `@solo/observe` | `web-solo-commerce-espn` | `1ac57431-a76e-4a27-a79e-cb2bcccd4ba4` |
| ESPN **marketing** | `apps/marketing-unified/espn/src/libs/datadog-rum.ts:8` (`initDatadogRum()`) | none — raw `datadogRum.init` | `espn-nexus` | `fa8304bf-a2f2-47b4-a4e1-04628af2cb71` |

Service-name derivation:

```js
packages/cgi/commerce-base/next.config.js:63-65
    63	    datadogRUMEnv: process.env.DATADOG_RUM_ENV === 'prod' ? 'prod' : 'non-prod',
    64	    datadogRUMBuildId: gitCommit,
    65	    datadogServiceName: `web-solo-commerce-${productName}`,
```

ESPN commerce overrides the base config with a **hardcoded** product name (it does not read `process.env.PRODUCT`):

```js
apps/commerce/espn/next.config.js:21,121-123
    21	const espnProductName = 'espn';
   121	    datadogRUMEnv: process.env.DATADOG_RUM_ENV === 'prod' ? 'prod' : 'non-prod',
   122	    datadogRUMBuildId: gitCommit,
   123	    datadogServiceName: `web-solo-commerce-${espnProductName}`,
```

```js
apps/marketing-unified/espn/next.config.js:52-54
    52	    datadogRUMEnv: process.env.DD_ENV || 'local',
    53	    datadogRUMBuildId: gitCommit,
    54	    datadogServiceName: 'espn-nexus',
```

**Env-tag semantics differ (CONFIRMED, and it is a real trap):**
- Commerce `env` is a **binary**: `'prod'` or `'non-prod'` (`commerce-base/next.config.js:63`). Stage, QA and CI all report `non-prod`.
- Marketing `env` is the **raw `DD_ENV`** (`'local'`, `'stage'`, `'production'`, `'partner'`) — asserted in `apps/marketing-unified/espn/next.config.test.js:164-177`.

So `@env:stage` filters ESPN marketing but **never** matches ESPN commerce.

`version` = first 8 chars of `GIT_COMMIT`, `'LOCAL'` when unset (`commerce-base/next.config.js:18`, `apps/commerce/espn/next.config.js:18`), lowercased before being handed to Datadog (`datadog.tsx:83`).

### 2.2 `@solo/observe` — the commerce RUM wrapper (CONFIRMED)

`packages/observe/package.json:2` — `@solo/observe`, "Observation library using DataDog", author "Newton". `@datadog/browser-rum` and `@datadog/browser-logs` are **peerDependencies** (`:66-71`).

Public API — `packages/observe/src/index.ts:1-6`:
```ts
     1	export { error, info, init, log, setUser, startVital, stopVital } from './observe';
     2	export { useStartVital } from './hooks/use-start-vital';
     3	export { useStopVital } from './hooks/use-stop-vital';
     4	export { useStallDetection } from './hooks/use-stall-detection';
     5	export { Owners, Actions } from './constants';
     6	export type { InitConfig, DatadogLogIndex, Context, DebugInfo, User } from './types';
```

Primitive mapping (`packages/observe/src/observe.ts`):
| `@solo/observe` | Datadog call | Line |
|---|---|---|
| `log({ key, ...rest })` | `datadogRum.addAction(key ?? 'UNKNOWN', rest)` | `:14` |
| `error({ owner, error, key, ...rest })` | `datadogRum.addError(err ?? key ?? 'UNKNOWN', rest)` | `:30` |
| `startVital(name)` | `datadogRum.startDurationVital(name)` | `:18` |
| `stopVital(name)` | `datadogRum.stopDurationVital(name)` | `:22` |
| `setUser(user)` | `datadogRum.setUser(user)` | `:34` |
| `info()` | `getInternalContext()` + `getInitConfiguration()` | `:93-113` |

The init function — **the single most load-bearing block in this doc**:

```ts
packages/observe/src/observe.ts:42-88
    42	export function init(initConfig: InitConfig): void {
    43	  const { branch, env, version } = initConfig;
    44	  const branchName = branch ?? 'unknown';
    45	  const isNonProd = env === 'non-prod';
    46	  const isLocalNonProd = isNonProd && version === 'local';
    47	  const sharedConfig = {
    48	    clientToken: initConfig.clientToken,
    49	    env,
    50	    service: initConfig.service,
    51	    site: 'datadoghq.com',
    52	    version,
    53	  };
    54	
    55	  datadogRum.init({
    56	    defaultPrivacyLevel: 'mask',
    57	    sessionReplaySampleRate: isLocalNonProd ? 100 : 10,
    58	    sessionSampleRate: isNonProd ? 100 : 10,
    59	    traceSampleRate: isNonProd ? 100 : 10,
    60	    trackUserInteractions: true,
    61	    trackLongTasks: true,
    62	    trackResources: true,
    63	    ...initConfig.options.rumConfig,
    64	    ...sharedConfig,
    65	  });
    66	
    67	  // Store the DSS Branch Name into the global context
    68	  // However, we'll only do this for Non-Production environments
    69	  if (isNonProd) {
    70	    datadogRum.setGlobalContextProperty('dss_branch', branchName);
    71	  }
    72	
    73	  datadogRum.startSessionReplayRecording();
    74	
    75	  datadogLogs.init({
    76	    sessionSampleRate: 100,
    77	    ...initConfig.options.logsConfig,
    78	    ...sharedConfig,
    79	  });
    80	
    81	  // Route browser logs to the correct team index in Datadog.
    82	  // These tags match the index filters in observe-datadog-config.
    83	  datadogLogs.setGlobalContextProperty('team', initConfig.logIndex);
    84	  datadogLogs.setGlobalContextProperty(
    85	    'twdc.datadog_log_index',
    86	    initConfig.logIndex
    87	  );
    88	}
```

Points worth flagging:
- `sharedConfig` is spread **last** (`:64`, `:78`), so a caller cannot override `service`/`env`/`version`/`clientToken`/`site` via `options`.
- `defaultPrivacyLevel: 'mask'` on commerce (strictest) vs `'mask-user-input'` on marketing — **commerce session replays show far less** than marketing ones.
- Browser **logs** sample at **100%** (`:76`) while RUM samples at 10% in prod. Logs are the higher-fidelity signal in prod.
- `sessionReplaySampleRate` is 100 only when *local* non-prod (`:46,57`); deployed stage gets 10% replay but 100% sessions.

### 2.3 Commerce RUM config (CONFIRMED)

```tsx
packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:77-102
    77	  observe.init({
    78	    branch: getCookie('dss_branch')?.toString() ?? 'main',
    79	    clientToken: 'pubd89d36935635e6cf3a5a624024282233',
    80	    env: datadogRUMEnv,
    81	    logIndex: 'commerce',
    82	    service: datadogServiceName.toLowerCase(),
    83	    version: datadogRUMBuildId.toLowerCase(),
    84	    options: {
    85	      rumConfig: {
    86	        allowedTracingUrls: [
    87	          /https:\/\/.*\.bamgrid\.com(?!\/$|\/wallet).+$/,
    88	          /https:\/\/edge-api\.hulu.*\.com/,
    89	        ],
    90	        applicationId: '1ac57431-a76e-4a27-a79e-cb2bcccd4ba4',
    91	        beforeSend: (event) => {
    92	          setViewName(event);
    93	
    94	          return true;
    95	        },
    96	      },
    97	      logsConfig: {
    98	        beforeSend: undefined,
    99	        forwardErrorsToLogs: true,
   100	      },
   101	    },
   102	  });
```

- Server-side guard: `if (!isBrowser()) return;` (`:67-69`) — RUM never initialises during SSR.
- `logIndex: 'commerce'` → routes browser logs to the commerce Datadog index. The only legal values are `'commerce' | 'identity'` (`packages/observe/src/types.ts:23`), mapped from `https://github.twdcgrid.net/Observability/observe-datadog-config/tree/main/projects/uds/prod/logs_configs` (`types.ts:21`).
- **Distributed tracing is Disney-domain-scoped:** `allowedTracingUrls` matches `*.bamgrid.com` (excluding `/wallet`) and `edge-api.hulu*.com`. **ESPN's own API hosts are not in this list** — see §2.6.
- The RUM Explorer link for commerce is committed in a docblock: `datadog.tsx:61` → `https://disneystreaming.datadoghq.com/rum/explorer?query=%40application.id%3A1ac57431-a76e-4a27-a79e-cb2bcccd4ba4%20%40type%3Asession`.

**View-name normalisation** — the reason `@view.name` is locale-stripped:

```tsx
packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:25-55
    25	export function setViewName(event: RumEvent) {
    26	  const { pathname } = new URL(event.view.url);
    27	
    28	  const subRoutes = ['/commerce', '/identity', '/profiles'];
    29	  const foundSubRoute = subRoutes.find((subRoute) =>
    30	    pathname.includes(subRoute)
    31	  );
    32	
    33	  if (foundSubRoute) {
    34	    const cdiIndex = pathname.indexOf(foundSubRoute);
    43	    if (cdiIndex > 0) {
    44	      const viewName = pathname.slice(cdiIndex);
    45	
    46	      event.view.name = viewName;
    47	    }
    49	    // Set the locale to the string in the URL before the subRoute and remove leading backslash.
    50	    const locale = pathname
    51	      .slice(pathname.indexOf('/'), cdiIndex)
    52	      .replace('/', '');
    53	
    54	    datadogRum.setGlobalContextProperty('urlLocale', locale);
    55	  }
```

**Consequence:** `@view.name` is only rewritten for paths containing `/commerce`, `/identity` or `/profiles`. Any other ESPN commerce route keeps Datadog's raw-pathname default and will fragment across locales. `@view.url_path` retains the full path with locale (`:41`).

### 2.4 Marketing RUM config (CONFIRMED)

```ts
apps/marketing-unified/espn/src/libs/datadog-rum.ts:13-49
    13	  const isLocalEnv = datadogRUMEnv === 'local';
    14	  const isStageEnv = datadogRUMEnv === 'stage';
    15	  const sampleRate = isLocalEnv || isStageEnv ? 100 : 10;
    16	
    17	  datadogRum.init({
    18	    applicationId: 'fa8304bf-a2f2-47b4-a4e1-04628af2cb71',
    19	    clientToken: 'pubcf2ff01c4d2c286181373b9b51798187',
    20	    site: 'datadoghq.com',
    21	    service: 'espn-nexus',
    22	    env: datadogRUMEnv,
    23	    version: datadogRUMBuildId,
    24	    sessionSampleRate: sampleRate,
    25	    sessionReplaySampleRate: sampleRate,
    26	    traceSampleRate: sampleRate,
    27	    defaultPrivacyLevel: 'mask-user-input',
    28	    trackResources: true,
    29	    trackLongTasks: true,
    30	    trackUserInteractions: true,
    31	    allowedTracingUrls: [/https:\/\/.*\.bamgrid\.com.+$/],
    32	    beforeSend: (event) => {
    33	      const savedReferrer = localStorage.getItem('preserveReferrer');
    34	
    35	      event.view.referrer =
    36	        savedReferrer === null ? document.referrer : savedReferrer;
    37	
    38	      return true;
    39	    },
    40	  });
    41	  datadogRum.startSessionReplayRecording();
    ...
    49	  window.datadogRum = datadogRum;
```

Differences from commerce, all CONFIRMED:
- Bypasses `@solo/observe` entirely → **no `datadogLogs.init()`**, so **no `team` / `twdc.datadog_log_index` tags** and **no browser-log index routing** for ESPN marketing.
- **No `dss_branch` global context property.**
- `beforeSend` overwrites `@view.referrer` from a `preserveReferrer` localStorage key (`:33-36`) — attribution on ESPN NEXUS is synthetic; do not treat `@view.referrer` as the raw browser referrer.
- **Exports RUM onto `window`** so the footer package can emit events (`:43-49`). This is the documented handoff for footer monitors.

### 2.5 Global context & user attributes (facets)

`SetDatadogUserContext` (commerce only) — `packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:110-170`.

| Attribute | Datadog facet | Set via | Surface | Cite | Label |
|---|---|---|---|---|---|
| `service` | `@service` | init | both (`web-solo-commerce-espn` / `espn-nexus`) | `datadog.tsx:82`, `datadog-rum.ts:21` | CONFIRMED |
| `env` | `@env` | init | both (`prod\|non-prod` vs `local\|stage\|production\|partner`) | `commerce-base/next.config.js:63`, `apps/marketing-unified/espn/next.config.js:52` | CONFIRMED |
| `version` | `@version` | init | both (8-char git SHA, lowercased on commerce) | `datadog.tsx:83`, `datadog-rum.ts:23` | CONFIRMED |
| `application.id` | `@application.id` | init | both (differs per surface) | `datadog.tsx:90`, `datadog-rum.ts:18` | CONFIRMED |
| `accountId` | `@usr.accountId` | `datadogRum.setUser` | commerce only | `datadog.tsx:138-142` | CONFIRMED |
| `deviceId` | `@usr.deviceId` | `datadogRum.setUser` | commerce only | `datadog.tsx:138-142` | CONFIRMED |
| `dssFilter` | `@usr.dssFilter` | `datadogRum.setUser`, from `dss_filter` cookie | commerce only | `datadog.tsx:134,141` | CONFIRMED |
| `experiments` | `@context.experiments` | `setGlobalContextProperty` | commerce only | `datadog.tsx:125` | CONFIRMED |
| `homeLocation` | `@context.homeLocation` | `setGlobalContextProperty` (SDK home country) | commerce only | `datadog.tsx:159` | CONFIRMED |
| `physicalLocation` | `@context.physicalLocation` | `setGlobalContextProperty` (location-service) | commerce only | `datadog.tsx:165` | CONFIRMED |
| `urlLocale` | `@context.urlLocale` | `setGlobalContextProperty` in `beforeSend` | commerce only, and only on `/commerce\|/identity\|/profiles` paths | `datadog.tsx:54` | CONFIRMED |
| `dss_branch` | `@context.dss_branch` | `setGlobalContextProperty`, **non-prod only** | commerce only | `observe.ts:69-71` | CONFIRMED |
| `team` | `@team` (logs) | `datadogLogs.setGlobalContextProperty` | commerce only (`'commerce'`) | `observe.ts:83` | CONFIRMED |
| `twdc.datadog_log_index` | log index routing | `datadogLogs.setGlobalContextProperty` | commerce only (`'commerce'`) | `observe.ts:84-87` | CONFIRMED |
| `view.name` | `@view.name` | `beforeSend` → `setViewName` | commerce only, partial | `datadog.tsx:46` | CONFIRMED |
| `view.referrer` | `@view.referrer` | `beforeSend`, from `preserveReferrer` | marketing only | `datadog-rum.ts:35-36` | CONFIRMED |

Location semantics are documented in-code and worth quoting because they are easy to confuse with `@geo.country`:

```tsx
packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:146-153
   146	  /**
   147	   * SDK-resolved location context, distinct from the IP-derived `@geo.country`.
   148	   *
   149	   * - `homeLocation`: the user's home location, derived from a manual override,
   150	   *   the purchase location, and the registration location.
   151	   * - `physicalLocation`: the user's physical location, set by an upstream
   152	   *   service (location-service).
   153	   */
```

**Practical ESPN RUM queries (INFERRED — constructed from the confirmed attributes above):**
```
# ESPN commerce, prod
@service:web-solo-commerce-espn @env:prod

# ESPN marketing/NEXUS, prod
@service:espn-nexus @env:production

# ESPN commerce errors from an error boundary
@service:web-solo-commerce-espn @type:error @context.sourceComponent:(ApplicationErrorBoundary OR PageErrorBoundary)

# ESPN commerce, one team's errors
@service:web-solo-commerce-espn @type:error @context.owner:transactional-and-payments

# ESPN commerce, a branch deploy (non-prod only)
@service:web-solo-commerce-espn @context.dss_branch:<branch>
```

### 2.6 What RUM does NOT cover (blind spots)

| Blind spot | Detail | Cite | Label |
|---|---|---|---|
| **Server-side rendering** | `init()` returns early when `!isBrowser()`. Nothing in `getServerSideProps` / API routes reaches RUM. | `datadog.tsx:67-69` | CONFIRMED |
| **90% of prod sessions** | `sessionSampleRate: 10` in prod on both surfaces. | `observe.ts:58`, `datadog-rum.ts:15` | CONFIRMED |
| **Pre-consent activity** | Analytics (Adobe) are gated on `targetedAdvertising` consent; RUM itself is not, but the analytics-derived RUM actions (e.g. `FIRE_ADOBE_PAGE_IMPRESSION_EVENT`) never fire pre-consent. | `load-analytics.tsx:28-31`; `adobe-analytics-tracker.ts:136-144` | CONFIRMED |
| **ESPN marketing browser logs are unindexed by team** | Marketing skips `datadogLogs.init()`, so no `team` / `twdc.datadog_log_index` tag. | `datadog-rum.ts` (no logs init) vs `observe.ts:75-87` | CONFIRMED |
| **ESPN marketing has no `dss_branch`** | Branch-deploy RUM correlation works for commerce only. | `observe.ts:69-71` | CONFIRMED |
| **Distributed tracing on non-bamgrid hosts** | `allowedTracingUrls` covers `*.bamgrid.com` (+ `edge-api.hulu*.com` on commerce). Calls to ESPN-owned hosts get **no** trace headers → RUM↔APM correlation breaks. | `datadog.tsx:86-89`, `datadog-rum.ts:31` | CONFIRMED |
| **`@view.name` on non-CDI routes** | `setViewName` only rewrites paths containing `/commerce`, `/identity`, `/profiles`. | `datadog.tsx:28-33` | CONFIRMED |
| **Session Replay masking** | Commerce is `'mask'` (all text masked). Debugging visual bugs from replays is much harder on commerce than marketing. | `observe.ts:56` | CONFIRMED |
| **`istanbul ignore file` on `adobe-launch.tsx`** | Excluded from coverage; regressions in Adobe Launch data-layer population are not caught by unit tests. | `load-analytics/adobe-launch.tsx:1` | CONFIRMED |
| **Ad-blocked RUM intake** | `browser-intake-datadoghq.com` is commonly blocked; blocked sessions are silently absent. | `packages/playwright-utils/src/analytics/rum.expect.ts:30` (shows the intake host) | INFERRED |

---

## 3. Logging & server-side observability

### 3.1 `@solo/logger` is external (CONFIRMED)

There is **no `packages/logger`** in this monorepo. `@solo/logger` is consumed from the pnpm catalog:

```
packages/cgi/commerce-base/package.json:58     "@solo/logger": "catalog:default",
packages/cgi/footer/package.json:236           "@solo/logger": "catalog:default",
packages/marketing/growth-utils/package.json:31 "@solo/logger": "catalog:default"
```

Usage pattern (from `packages/instrumentation/AGENTS.md`, "Logging"):
```ts
import { getLogger } from '@solo/logger';
const logger = getLogger('my-namespace');
logger.info('message');
logger.error('error', { context });
```

ESPN commerce example:
```tsx
apps/commerce/espn/pages/_app.page.tsx:106-108
   106	  const logger = getLogger('_app.page');
   108	  logger.info({ url: appContext.ctx.req?.url }, 'Page Requested');
```

Note the **pino-style signature** — object first, message second.

### 3.2 The per-app Datadog logger alias (CONFIRMED)

`packages/instrumentation/AGENTS.md` warns: *"Logger alias is per-app — `@solo/logger` resolves differently in each app's webpack config."* ESPN marketing's alias target:

```ts
apps/marketing-unified/espn/src/libs/logger-with-datadog.ts:1-22, 37-58
     1	/* istanbul ignore file */
     4	import { tracer } from 'dd-trace';
     6	import { getLogger as realGetLogger } from 'real-@solo/logger';
     8	// This file will be included whenever you try to import `@solo/logger`. This
     9	// will enable all logging, even logging in dependencies, to have datadog info
    10	// injected. This will associate these logs with traces.
    14	tracer.init();
    ...
    37	      realLogger[key] = function (...logArgs: any[]) {
    38	        const modifiedArgs = logArgs.map((arg) => {
    39	          if (typeof arg === 'object') {
    40	            const activeScope = tracer.scope().active();
    42	            return {
    43	              ...arg,
    44	              dd: {
    45	                ...arg?.dd,
    46	                env: process.env.DD_ENV,
    47	                service: process.env.DD_SERVICE,
    48	                span_id: activeScope?.context().toSpanId(),
    49	                trace_id: activeScope?.context().toTraceId(),
    50	                version: process.env.DD_VERSION,
    51	              },
    52	            };
    53	          }
    55	          return arg;
    56	        });
```

Mechanics: the webpack alias maps `@solo/logger` → this file and the original → `real-@solo/logger`. It detects log methods by `potentialLogFunction.name === 'LOG'` (`:31`) — a fragile contract; a rename inside `@solo/logger` would silently stop trace injection. Registered at `apps/marketing-unified/espn/next.config.js:76`. It is `istanbul ignore file` (`:1`), so untested.

### 3.3 Server-side APM (CONFIRMED)

- `dd-trace` is preloaded via `NODE_OPTIONS`: `apps/commerce/espn/package.json:42` (`start`), `apps/marketing-unified/espn/package.json:20` (`start`) — both `--require dd-trace/init`.
- ESPN commerce committed env defaults:
```
apps/commerce/espn/.env:9   DATADOG_RUM_ENV=non-prod
apps/commerce/espn/.env:13  DD_SERVICE=espnplus-commerce
apps/commerce/espn/.env:14  DD_TAGS=jest:test
apps/commerce/espn/.env:15  DD_TRACE_SAMPLING_RULES='[{"service": "espnplus-commerce", "resource":"/api/healthcheck", "sample_rate": 0.1}]'
```
  Healthcheck traces are down-sampled to 10% so they don't dominate APM.
- ESPN marketing has **no committed `DD_*`** in `.env*` — everything comes from the deploy env / Vault.
- Local agent: `datadog/docker-compose.local.yml:8-17` (`DD_SITE: 'datadoghq.com'`, `DD_ENV: 'local'`, `DD_SERVICE`, `DD_VERSION`), started via `pnpm -F @solo/commerce-espn datadog-agent:start` (`apps/commerce/espn/package.json:27-28`). Docs at `datadog/README.md:31-47,70-73`.
- `DD_SERVICE` naming is inconsistent across the ESPN commerce lifecycle: `espnplus-commerce` (`.env:13`) / `cup_commerce_espn` (`package.json:41`, profile script) / `web-solo-commerce-espn` (RUM + `ci/espnplus/commerce:29`) / `cup_commerce/apps/espn` (CI test-visibility service).

### 3.4 Error taxonomy (CONFIRMED)

`packages/cgi/commerce-base/src/common/constants/observability.ts` — 464 lines, three exports:

- `Owners` — **re-exported** from `@solo/observe` (`:8`), with `// TODO WEB-33133: Update all instances of Owners to reference the observe package and remove this export.` (`:4`). Canonical enum:
```ts
packages/observe/src/constants.ts:5-14
     5	export enum Owners {
     6	  CORE = 'commerce-core',
     7	  PLATFORM = 'commerce-platform',
     8	  MMA = 'merchandising-management-and-activation',
     9	  TAP = 'transactional-and-payments',
    10	  ART = 'account-and-retention',
    11	  IDENTITY = 'identity',
    12	  PROFILES = 'profiles',
    13	  XD = 'xd',
    14	}
```
- `Actions` (observe) — `FLEX_INTERACTION`, `PAGE_VIEW`, `REDIRECT`, `3RD_PARTY_LIBRARY` (`packages/observe/src/constants.ts:19-24`).
- `ACTION_CODES` — 13 members (`observability.ts:10-23`): `FLEX_INTERACTION`, `PAGE_VIEW`, `REDIRECT`, `NOTIFICATION_DISMISSED`, `TOKENIZE_PAYMENT_SUCCESS`, `HITS_SUBSCRIPTION_END_NEW_SUBSCRIPTION`, `OFFERS_PARAM_CONVERTED`, `OFFERS_PARAM_ALREADY_EXISTS`, `OFFERS_MULTI_OFFER_CONVERSION`, `OFFERS_PARAM_PASSTHROUGH_LEGACY`, `IN_PRODUCT_SWITCH_REDIRECT`, `IN_PRODUCT_SWITCH_REDIRECT_DUE_TO_MISSING_QUERY_STRING_PARAMETERS`.
- `ERROR_CODES` — **73 members** (`observability.ts:25-99`). Families: `MISSING_*` (~22), `NOT_FOUND_*` (7), `UNRECOGNIZED_*` (7), `SK_AGE_VERIFICATION_*` (10), `DSS_DATA_LAYER_*` (3), `OFFER*` (5), plus singletons (`ACTIVATION_ERROR`, `BLOCKED_REDIRECT_TARGET`, `NETWORK_ERROR`, `EXECUTION_ERROR`, `UNSUPPORTED_TYPE_FROM_FLEX`, …).
- `ERROR_MESSAGES` — a nested, page-scoped human-message map starting `observability.ts:101` (`ACTIVATION_SUCCESS`, `ANALYTICS`, `ADDONS`, `BILLING`, `CADENCE`, `CHANGE_PAYMENT`, `CHANGE_SUBSCRIPTION`, `CHANGE_SUBSCRIPTION_CONFIRM`, `CREATE_CHECKOUT`, `GIFT_CARD_REVIEW`, `FORM_INTERACTIONS_LIST`, `INCOMING_ACTIVATION`, `ROADBLOCK`, …).

**`INVALID_GLIMPSE_METRICS_DATA` (CONFIRMED)** — the code named in the brief. It is *not* in `ERROR_CODES`; it is a literal `errorCode` field on `datadogLogs.logger.error` calls inside the Glimpse tracker. Nine production sites:

| File | Lines |
|---|---|
| `packages/instrumentation/src/glimpse/tracker/glimpse-analytics-tracker.ts` | 82, 178, 211, 268 |
| `packages/instrumentation/src/glimpse/hooks/use-enrich-container-view-and-track-event.ts` | 105 |
| `packages/instrumentation/src/glimpse/hooks/use-enrich-page-view-and-track-event.ts` | (see tests at 201, 241) |
| `packages/instrumentation/src/glimpse/hooks/use-fire-page-view.ts` | (see tests at 336, 356) |
| `packages/instrumentation/src/glimpse/components/glimpse-providers.tsx` | (see tests at 1164, 1181, 1203, 1221) |

Payload shape, and the diagnostic context added by commit 5e79fa7198 ("Add diagnostic context to INVALID_GLIMPSE_METRICS_DATA log sites"):

```ts
packages/instrumentation/src/glimpse/tracker/glimpse-analytics-tracker.ts:79-92
    79	          datadogLogs.logger.error(
    80	            'GLIMPSE METRICS DATA – INVALID INTERACTION/INPUT VIEW METRICS DATA',
    81	            {
    82	              errorCode: 'INVALID_GLIMPSE_METRICS_DATA',
    83	              source: 'glimpse-analytics-tracker:user_interaction',
    84	              eventUrn,
    85	              analyticsPageViewUUID,
    86	              glimpseContainerUUID,
    87	              pageKey: validPageView?.payload.pageKey,
    88	              pageName: validPageView?.payload.pageName,
    89	              pageEventUrn: validPageView?.eventUrn,
    90	              containerEventUrn: validContainerView?.eventUrn,
    91	            }
    92	          );
```

Two severity tiers in the same handler: a **hard `error`** when `eventUrn`/`analyticsPageViewUUID` are missing (`:79-94`) vs **`warn` + drop** when container/page metrics are invalid (`:99-113`). Query `@errorCode:INVALID_GLIMPSE_METRICS_DATA` and facet on `@source` to localise. **INFERRED:** since ESPN fires no Glimpse events, this code is a Disney+/Hulu signal — but confirm against `enabledAnalyticsTooling` for `espn` (§1.5).

Other Datadog log sites worth knowing:
- `'Adobe Analytics tried to fire before the script was loaded.'` — warn, `adobe-analytics-tracker.ts:205-207`
- `'Adobe Analytics script failed to load.'` — error, `adobe-analytics/components/adobe-analytics.tsx:79-83`
- `'Glimpse config value not found'` — warn, `glimpse/atoms/is-glimpse-enabled-atom.tsx:22`

RUM action keys (from `observe.log({ key })`): `FIRE_ADOBE_PAGE_IMPRESSION_EVENT`, `FIRE_GLIMPSE_PAGE_IMPRESSION_EVENT`, `FIRE_HITS_PAGE_IMPRESSION_EVENT`, `FIRE_TEALIUM_PAGE_IMPRESSION_EVENT`, `IDENTITY_SDK_CONFIG_GATE`, `ESPN_TEMP_REDEEM_REDEMPTION_CODE_TITLE`, `ESPN_TEMP_REDEEM_REDEMPTION_CODE_TITLE_NO_SUBSCRIPTION`. Identity adds `REDEEM_OFF_DEVICE_GRANT_CHECK` / `..._SUCCESS` (`packages/identity-auth/src/features/license-plate/process-auth-flow-success.ts:71,95`) and `GCIX_DISTRIBUTED_LOG` (`packages/identity-auth/src/common/libs/fetch-observer.ts:129`).

### 3.5 Debug tooling — Toodles (CONFIRMED)

ESPN marketing exposes a per-branch Datadog logs deep link:
```
apps/marketing-unified/espn/src/shared/layout/application-layout/toodles.tsx:26-30
    26	    `kube_app_name:${branchName.toLowerCase()}`,
    27	    'service:espnplus-nexus',
    30	  const url = new URL('https://disneystreaming.datadoghq.com/logs');
```
**Note the third naming variant:** Toodles queries `service:espnplus-nexus` for **server** logs, while RUM uses `service:espn-nexus`. Both are correct for their own signal — don't cross them.

Commerce equivalent: `getDatadogRUMDebugInfo()` → `observe.info()` (`datadog.tsx:175-177`), rendered in `packages/cgi/commerce-base/src/common/context/toodles/toodles.tsx:598`. Gated on `isDebugToolingEnabled` (`apps/commerce/espn/next.config.js:126-127` — true when `ENABLE_DEBUG_TOOLING === 'true'` or non-prod).

---

## 4. Error tracking & alerting

### 4.1 Error boundaries (CONFIRMED)

Two boundaries in `commerce-base`, both `react-error-boundary` + `datadogRum.addError`.

**Application-level** (whole app, generic fallback):
```tsx
packages/cgi/commerce-base/src/common/components/application-error-boundary/application-error-boundary.tsx:50-66
    50	  return (
    51	    <ErrorBoundary
    52	      FallbackComponent={FallbackComponent}
    53	      onError={(error, info) => {
    54	        // Include the error in the context
    55	        // so that metadata included in extensions of the base Error class
    56	        // is sent to DataDog
    57	        datadogRum.addError(error, {
    58	          error,
    59	          info,
    60	          sourceComponent: 'ApplicationErrorBoundary',
    61	        });
    62	      }}
    63	    >
```

**Page-level** (per-page, owner-attributed):
```tsx
packages/cgi/commerce-base/src/common/components/page-error-boundary/page-error-boundary.tsx:88-107
    88	  function handleError(error: Error, info: { componentStack: string }) {
    93	    let additionalContext;
    95	    if (getAdditionalContext) {
    96	      additionalContext = getAdditionalContext();
    97	    }
    99	    datadogRum.addError(error, {
   100	      error,
   101	      info,
   102	      owner,
   103	      additionalContext,
   104	      path: router.pathname,
   105	      sourceComponent: 'PageErrorBoundary',
   106	    });
   107	  }
```

`PageErrorBoundary` requires `owner: Owners` (`:75`) — this is the mechanism that routes an ESPN page error to the right team facet (`@context.owner`). `ApplicationErrorBoundary` has **no owner**, so app-level crashes are unattributed.

Fallback copy is dictionary-driven with hardcoded English defaults: `error_page_cta` → `'Go To Homepage'`, `error_page_text` → `'Please try again later.'`, `error_page_title` → `'Sorry, an unexpected error has occurred.'` (`application-error-boundary.tsx:26-36`). `PageDefaultErrorFallback` resolves the same keys via `useDictionary()` (`page-error-boundary.tsx:35-47`).

There are also narrow boundaries: `text-with-variables-error-boundary/text-with-variables-error-boundary.tsx`.

### 4.2 Footer observability — the one place with named monitor-grade events (CONFIRMED)

`packages/cgi/footer/src/footer/use-footer-observability.ts`:

| Constant | Value | Line |
|---|---|---|
| `DEFAULT_SERVICE` | `'@solo/footer'` | `:45` |
| `SUCCESS_EVENT_NAME` | `'FOOTER_RENDER_SUCCESS'` | `:48` |
| `FALLBACK_RENDER_EVENT` | `'FOOTER_FALLBACK_RENDER'` | `:49` |

Attributes: `used_fallback` (`:198` false / `:237`,`:271` true), `error_kind` (`:238`), `footer_package_version` (`:149`, from `FOOTER_PACKAGE_VERSION`), `service` (`:134`). Emission is **defensive** — every call is guarded by `typeof datadogRum?.addAction === 'function'` (`:202`, `:245`, `:274`), because the footer resolves RUM from `window.datadogRum` rather than a prop. That handoff is exactly what `apps/marketing-unified/espn/src/libs/datadog-rum.ts:43-49` sets up, and its comment names the driving monitors:

```ts
apps/marketing-unified/espn/src/libs/datadog-rum.ts:43-49
    43	  // Expose the RUM client globally so the @solo/footer package's observability
    44	  // hook can emit RUM events (FOOTER_RENDER_SUCCESS, footer errors with
    45	  // error_kind/used_fallback context). The footer resolves its RUM client from
    46	  // window.datadogRum when one isn't passed as a prop; the footer props are
    47	  // built server-side (get-footer-props.ts) and cannot carry the client, so
    48	  // this global handoff is what powers the footer runtime monitors.
```

The code also warns against conflating fallback-render with error (`:228` — "`used_fallback:true`, so conflating the two would make an ad-blocked …").

### 4.3 Scheduled audit → Datadog jobs (CONFIRMED, **Disney+ only**)

Four cron workflows push metrics to Datadog via `DD_API_KEY`, all report-only:

| Workflow | Schedule | Scope |
|---|---|---|
| `.github/workflows/footer-legal-links-audit.yml` (`:10`) | `0 13 * * *` | D+ MCT legal-links audit |
| `.github/workflows/footer-config-links-audit.yml` (`:11`) | `10 13 * * *` | D+ footer config-link reconcile |
| `.github/workflows/footer-compliance-reconcile.yml` (`:20`) | `20 13 * * *` | D+ footer legal-node drift |
| `.github/workflows/glimpse-shield-validation.yml` (`:24`) | `0 13 * * *` | Glimpse schema drift (Stitch) |

`DD_SITE` defaults in code: `packages/cgi/footer/scripts/_shared/datadog.ts:14` — `process.env['DD_SITE'] || 'datadoghq.com'`.

**None of these cover ESPN.** ESPN footer/legal/compliance drift has no scheduled Datadog audit.

### 4.4 Monitors, SLOs, synthetics — the honest answer

**CONFIRMED:** no monitor definitions, SLO definitions, or Synthetics configs are stored in this repo. Exhaustive grep for `datadoghq.com/{dashboard,monitors,slo,synthetics}` URLs, `monitor_id`, and `Synthetics` returns only:
- the commerce RUM Explorer link (`datadog.tsx:61`),
- the Toodles logs links (`apps/marketing-unified/espn/.../toodles.tsx:30`, hulu equivalent),
- doc links to `docs.datadoghq.com`,
- `site: 'datadoghq.com'` config values.

Monitors are **referenced but not defined**: the footer comment "what powers the footer runtime monitors" (`datadog-rum.ts:48`) and `docs/security/AGENTS.md:91` — *"A **Datadog monitor** watches for SCRAAP finding regressions on `main` (GCIEX-9679)."*

**INFERRED:** monitors/SLOs/dashboards live in the external `Observability/observe-datadog-config` repo (named at `packages/observe/src/types.ts:21`) and/or are UI-managed. To enumerate them, query the Datadog API (e.g. the `pup` CLI) rather than this repo.

### 4.5 Playwright RUM assertions (CONFIRMED)

`packages/playwright-utils/src/analytics/rum.expect.ts` lets E2E tests assert RUM emission by intercepting intake:

```ts
packages/playwright-utils/src/analytics/rum.expect.ts:27-36
    27	const parseRumBatchEvents = (requests: Request[]): RumEvent[] => {
    28	  const batchRequests = requests.filter(
    29	    (req) =>
    30	      req.url().includes('browser-intake-datadoghq.com') &&
    31	      req.method() === 'POST'
    32	  );
    34	  const lines = batchRequests.flatMap(
    35	    (req) => req.postData()?.split('\n') ?? []
    36	  );
```

Exports: `expectRumActionToHaveFired({ actionName, context }, requests)` (`:128-133`) and `expectRumErrorToHaveFired({ errorMessage, context }, requests)` (`:143-148`). Both wrap `.toPass({ timeout: 10_000 })` (`:117`) because RUM batches asynchronously. Only `type: 'action'` and `type: 'error'` are parsed (`:42`); views/resources/long-tasks are ignored. Context matching is a **shallow subset** match (`:58-67`).

Siblings: `adobe.expect.ts`, `glimpse.expect.ts`, `hits.expect.ts`, `tealium.expect.ts` in the same directory. Adobe helpers relevant to ESPN: `expectAdobeToHaveFired` (`:13`), `expectAdobeNotToFire` (`:54`), `expectAdobeAudienceManagerFired` (`:93`) — the docblocks use an ESPN example page name, `'ESPN Plus D2C - Paywall'` (`:51`, `:90`).

---

## 5. CI/CD

### 5.1 Workflow inventory — 38 files (CONFIRMED)

`[E-C]` = affects ESPN commerce, `[E-M]` = affects ESPN marketing.

| File | `name:` | Trigger | Purpose |
|---|---|---|---|
| `apps-lint-and-test.yml` | `apps` | `pull_request` (all paths), `push:[main]`; concurrency + cancel (`:12-14`) | Matrix lint + type-check + jest coverage, 6 apps. **[E-C]** `:30-33`, **[E-M]** `:38-41` |
| `branch-cleanup.yml` | `Branch Cleanup` | `workflow_dispatch`, `0 14 * * 1-5` | Deletes branches >36 days; protects `main,trunk,prod,smoke,partner-activation,canary,trunk-clone,rainyday-` (`:15-16`) |
| `changesets-publish.yml` | `Publish to NPM and Nexus` | `workflow_dispatch`; fails off `main` (`:18-22`) | Manual recovery publish |
| `changesets-release.yml` | `Changesets - Release` | `push:[main]` | Version + release, 30 min timeout (`:15`) |
| `changesets-snapshot.yml` | `Changesets - Snapshot …` | `pull_request` + `Snapshot` label (`:12`) | Snapshot publish |
| `ci.yml` | `CI` | `push:[main]`, `pull_request:[opened,synchronize,reopened,ready_for_review]` | SonarQube coverage matrix. **[E-C]** `:44-46`, **[E-M]** `:56-59` |
| `commerce-base-lint-and-test.yml` | `pkgs/commerce-base` | `pull_request`, `push:[main]` | commerce-base checks + `commerce-base-status-check` gate (`:85`) |
| `commerce-base-tests.yml` | `Commerce Base Tests` | `workflow_call` | 4-shard jest (`:21-22`) |
| `commerce-bundle-analysis.yml` | `Commerce Bundle Analysis` | `pull_request` + label | Bundle diff vs main. **[E-C]** `:23-24`, `:73-74` |
| `commerce-code-coverage.yml` | `Commerce Code Coverage` | `pull_request` + label | Happy-path/pages coverage comment. **[E-C]** `:22-23`, `:58-59`, `:139-140` |
| `commerce-playwright-tests-sharded.yml` | `Commerce Playwright Tests (Sharded)` | `workflow_call(tenant, folder, shard_count, coverage_threshold)` | **The ESPN commerce E2E engine** |
| `commerce-pr-checks-disney-plus-sharded.yml` | `… Disney+ (Sharded)` | `pull_request:[opened,synchronize]` | 4 shards, threshold 35 |
| **`commerce-pr-checks-espn-sharded.yml`** | `Commerce PR Checks - ESPN (Sharded)` | `pull_request:[opened,synchronize]` | **[E-C]** 2 shards, threshold 10 |
| `commerce-pr-checks-hulu-sharded.yml` | `… Hulu (Sharded)` | `pull_request:[opened,synchronize]` | 2 shards, threshold 18 |
| `create-release-branch.yml` | `Create Release Branch and PR` | `workflow_dispatch` + `0 7 * * 3,5` | Cuts `release-<date>` |
| `decorate-pr.yml` | `PR Decorator` | `pull_request:[opened]` | Posts `.github/pr_decoration.md` (ESPN+ stage/Jenkins links) |
| `flake-check.yml` | `Flake Check` | `0 13-21 * * 1-5`, `workflow_dispatch(branch)` | Hourly re-run of sharded PW, `coverage_threshold: 0`. **[E-C]** `:28-30` |
| `footer-compliance-reconcile.yml` | `Footer Compliance Reconcile` | `20 13 * * *` | D+ only |
| `footer-config-links-audit.yml` | `Footer Config Links Audit` | `10 13 * * *` | D+ only |
| `footer-legal-links-audit.yml` | `Footer Legal Links Audit` | `0 13 * * *` | D+ only |
| `footer-playwright.yml` | `footer-playwright` | `pull_request` paths `packages/cgi/footer/**` | Footer e2e |
| `glimpse-shield-validation.yml` | `glimpse-shield-validation` | paths `packages/marketing/stitch/**`, `0 13 * * *` | SHIELD schema drift; **deliberately not a required check** (`:14-16`) |
| `growth-pr-checks-base.yml` | `Growth PR Checks - Base` | `workflow_call(tenant, folder)` | Reusable, single-job marketing PW |
| `growth-pr-checks-disney-plus.yml` | `… Disney+` | `pull_request` | disney/disneyplus |
| **`growth-pr-checks-espn.yml`** | `Growth PR Checks - ESPN` | `pull_request:[opened,synchronize]` | **[E-M]** espn/espn (`:15-16`) |
| `growth-pr-checks-hulu.yml` | `… Hulu` | `pull_request` | hulu/hulu |
| `growth-pr-notification.yml` | `Growth Team PR Notification` | `pull_request:[review_requested,ready_for_review]` | Teams notify, 5-min debounce (`:29`) |
| `heal-flaky-tests.yml` | `Heal Flaky Tests` | `pull_request:branches:[main]`, no paths filter (`:3-9`) | Claude agent heals flaky tests, opens child PR |
| `jest-stress-test.yml` | `Jest Stress Test` | `pull_request:[labeled]` + `Stress Test Jest` (`:17`) | 20× repeat changed jest tests |
| `label-reactor.yml` | `Label Reactor` | `pull_request:[labeled]` + `Auto-Deploy` (`:7`) | **Triggers the Jenkins/Fuzzbucket build** (`:28-33`) |
| `labeler.yml` | `Pull Request Labeler` | `pull_request_target` | Applies `.github/labeler.yml` |
| `links.yaml` | `Helpful Links Comment` | `pull_request:[opened]` | Posts `ci/templates/helpful-links.md` |
| `metrics.yml` | `CGI Web GHA Metrics` | `workflow_run:[completed]` over a name list (`:3-37`) | GHA run metrics → Datadog |
| `packages-lint-and-test.yml` | `pkgs` | `pull_request`, `push:[main]` | Package matrix + `check-all-packages-status` gate (`:176`) |
| `playwright-stress-test.yml` | `Playwright Stress Test` | `pull_request:[labeled]` + `Stress Test Playwright` (`:9`) | 15× repeat changed specs. **[E-C]** `:19-20` |
| `purge-reports.yml` | `Purge Playwright Reports` | `workflow_dispatch(branch_name)` | Deletes gh-pages report dirs |
| `sonarqube-summary.yml` | `SonarQube Summary` | `pull_request` | Waits on `CI,pkgs/commerce-base` (`:12`), posts gates. **[E]** `cgi-client:commerce-espn` (`:118`), `cgi-client:nexus-espn` (`:121`) |
| `sync-figma-to-tokens.yml` | `Sync Figma variables to tokens` | `workflow_dispatch` | Figma → tokens PR |

**Only three workflows use `on.pull_request.paths`** (`footer-playwright.yml:5-7`, `glimpse-shield-validation.yml:20-23`, and itself). **Every ESPN check runs on every PR regardless of touched files** — CONFIRMED, and the main driver of PR latency.

### 5.2 ESPN commerce PR check (CONFIRMED)

The wrapper is 19 lines:
```yaml
.github/workflows/commerce-pr-checks-espn-sharded.yml:11-19
    11	jobs:
    12	  run-pr-checks-espn:
    13	    uses: ./.github/workflows/commerce-playwright-tests-sharded.yml
    14	    with:
    15	      tenant: espn
    16	      folder: espn
    17	      shard_count: 2
    18	      coverage_threshold: 10
    19	    secrets: inherit
```
Concurrency `${{ github.workflow }}-${{ PR# || ref }}`, cancel-in-progress (`:7-9`).

The engine (`commerce-playwright-tests-sharded.yml`, 321 lines) has 4 jobs: `build` (`:36`) → `playwright` (`:89`) → `merge-report` (`:184`) → `status-check` (`:309`).

- Runners `amd-large` (build/pw/merge) / `amd-standard` (status-check); container `artifactory.global.twdcgrid.net/hulu-docker/node:22.14.0-bookworm` (`:44,93,192`).
- **No `timeout-minutes` on any job** — falls back to the 360-min org default.
- Shard matrix is computed, not literal:
```yaml
.github/workflows/commerce-playwright-tests-sharded.yml:51-57, 94-97
    51	      - name: Compute shard matrix
    56	          SHARD_COUNT: ${{ inputs.shard_count }}
    57	        run: echo "shards=[$(seq 1 "$SHARD_COUNT" | paste -sd, -)]" >> "$GITHUB_OUTPUT"
    94	    strategy:
    95	      fail-fast: false
    96	      matrix:
    97	        shard: ${{ fromJSON(needs.build.outputs.shards) }}
```
- Build: `pnpm turbo build --filter=@solo/commerce-"$TENANT" --token="1" --team="commerce"` (`:68`). ESPN output is `build-test` (not `.next`), tarred as artifact `next-build-espn`, 1-day retention, `if-no-files-found: error` (`:70-85`).
- Shards rebuild deps only: `--filter="@solo/commerce-$TENANT^..."` (`:110`).
- Tests bypass Turbo deliberately:
```yaml
.github/workflows/commerce-playwright-tests-sharded.yml:164-169
   164	          # Call playwright directly (not via Turbo): a Turbo cache hit would
   165	          # replay logs without regenerating the blob and break the merge.
   166	          run: |
   167	            cd "apps/commerce/$FOLDER"
   168	            pnpm clean:coverage:playwright
   169	            pnpm exec playwright test --shard="$SHARD"/"$SHARD_TOTAL"
```
  Wrapped in `cgi-client/actions/run-tests-with-datadog@v1`, service `cup_commerce/espn` (`:160`), tags `tenant:espn,shard:N` (`:162`).
- Missing-shard guard fails the run if a blob is dropped (`:209-223`).
- Coverage gate, skipped when threshold is 0 (flake-check):
```yaml
.github/workflows/commerce-playwright-tests-sharded.yml:246-258
   246	      - name: Run coverage on happy paths
   247	        if: ${{ inputs.coverage_threshold > 0 }}
   253	          pnpm run coverage:playwright:happy-paths
   254	          json_output=$(pnpm --silent run coverage:playwright:happy-paths -- --output-json)
   255	          percentage=$(echo "$json_output" | jq -r '.totalCoveragePercentage')
   258	          if [ "$percentage_int" -lt "$threshold" ]; then
```
- Why shards and not workers: *"each its own runner -> `next start` -> MSW singleton, hence sharding rather than more `workers`"* (`:3-5`).

### 5.3 ESPN marketing PR check (CONFIRMED)

```yaml
.github/workflows/growth-pr-checks-espn.yml:11-17
    11	jobs:
    12	  run-pr-checks:
    13	    uses: ./.github/workflows/growth-pr-checks-base.yml
    14	    with:
    15	      tenant: espn
    16	      folder: espn
    17	    secrets: inherit
```

Base (`growth-pr-checks-base.yml`, 149 lines): **single job, no sharding, no matrix, no timeout** (`:25-29`), `amd-large`, node 22.14.0-bookworm. Routes `folder` through `sanitize-input` (`:38-42`) before shelling. Two-stage build:
```yaml
.github/workflows/growth-pr-checks-base.yml:67-70
    67	          pnpm turbo build --filter=@solo/marketing-unified-"$INPUT_FOLDER"^... --token="1" --team="growth"
    68	          # Build the app with inline env vars (required for Next.js to bundle them)
    69	          cd "apps/marketing-unified/$INPUT_FOLDER"
    70	          NEXT_PUBLIC_API_MOCKING=playwright GIT_COMMIT="$COMMIT_SHA" pnpm build
```
Tests: `pnpm turbo test:playwright --filter=@solo/marketing-unified-"$INPUT_FOLDER" --token='1' --team='growth'` (`:86`), Datadog service **`bix-caleen/apps/espn`** (`:82`) — the Disney+ NEXUS prefix, inconsistent with `espnplus-nexus` used at `apps-lint-and-test.yml:40`. Coverage is commented out pending WEB-36858 (`:88-93`); gh-pages upload disabled (`:120-128`).

### 5.4 Lint / type-check / jest in CI (CONFIRMED)

`apps-lint-and-test.yml` — `amd-standard-new`, container `hulu-docker/node:22.14.0-bullseye` (`:21`), `fail-fast: false` (`:23`), **no timeout**. Three turbo commands per app:
```yaml
.github/workflows/apps-lint-and-test.yml:69,75,87
    69	        run: pnpm turbo ${PACKAGE_NAME}#lint ${TURBO_CACHE_ARGS}
    75	        run: pnpm turbo ${PACKAGE_NAME}#lint:type-check ${TURBO_CACHE_ARGS}
    87	          run: pnpm turbo ${PACKAGE_NAME}#coverage:jest ${TURBO_CACHE_ARGS}
```
ESPN matrix rows: commerce `@solo/commerce-espn` / DD service `cup_commerce/apps/espn` (`:30-32`); nexus `@solo/marketing-unified-espn` / `espnplus-nexus` (`:38-40`).

`ci.yml` — 2 jobs (`setup` → `sonarqube`), container `fed.docker…node:22.14.0-bullseye` (`:32`), **`timeout-minutes: 60`** (`:33`). ESPN entries:
```yaml
.github/workflows/ci.yml:44-47, 56-59
    44	          - name: commerce-espn
    45	            path: apps/commerce/espn
    46	            project-key: cgi-client:commerce-espn
    47	            command: pnpm turbo coverage:jest:ci --filter=@solo/commerce-espn --token="1" --team="commerce"
    56	          - name: nexus-espn
    57	            path: apps/marketing-unified/espn
    58	            project-key: cgi-client:nexus-espn
    59	            command: pnpm turbo test --filter=@solo/marketing-unified-espn
```
**Asymmetry (CONFIRMED):** `nexus-disneyplus` uses `test:coverage` (`:55`); `nexus-espn` and `nexus-hulu` use bare `test` (`:59`, `:63`) **and pass no `--token`/`--team`**, so ESPN nexus gets **no Turbo remote cache** here. The coverage upload step is `continue-on-error: true` (`:84`).

### 5.5 Composite actions — 7 (CONFIRMED)

| Action (`.github/composite-actions/shared/…`) | What it does |
|---|---|
| `build-turbo-cache-args/action.yml` | Emits `--token=1 --team=<team>`, or **empty on `main`** to skip remote caching (`:20-23`) |
| `install-dependencies/action.yml` | `pnpm/action-setup@v4.3.0` (`:7`) → `setup-node@v4` with `node-version-file: 'package.json'` + pnpm cache (`:12-16`) → `pnpm install --ignore-scripts` (`:20`). **No `--frozen-lockfile`** |
| `is-runnable-pr/action.yml` | `true` for non-drafts and `mergify-draft-*`; prefix must match `.github/mergify.yml` `queue_branch_prefix` (`:5`) |
| `is-trunk-to-main-pr/action.yml` | `true` iff `head==trunk && base==main` (`:16-20`) |
| `sanitize-input/action.yml` | `sed 's/[^a-zA-Z0-9._\/-]//g'` (`:21`) — the SCRAAP-mandated anti-injection helper |
| `setup-local-ssl/action.yml` | mkcert cert for `local.plus.espn.com` (`:27`) + `/etc/hosts` entry (`:36`). **Dead code — referenced by no workflow** |
| `upload-junit-to-datadog/action.yml` | `pnpm dlx @datadog/datadog-ci@3.20.0 junit upload --env ci` (`:37`), `DD_SUBDOMAIN: 'disneystreaming'` (`:31-34`), `continue-on-error: true` (`:29`). Superseded by `cgi-client/actions/run-tests-with-datadog@v1` |

### 5.6 Turbo remote caching (CONFIRMED)

- Endpoint is committed in plain text:
```json
turbo.json:3-7
     3	  "globalEnv": ["NODE_ENV"],
     4	  "envMode": "loose",
     5	  "remoteCache": {
     6	    "apiUrl": "https://turborepo-cache-legacy.us-east-1.bamgrid.net"
     7	  }
```
- **No `TURBO_TOKEN` / `TURBO_API` secret exists in the repo.** Auth is a **literal dummy token `--token="1"`** at every call site (`build-turbo-cache-args/action.yml:23`, `commerce-playwright-tests-sharded.yml:68,110`, `growth-pr-checks-base.yml:67,86`, `ci.yml:42,46,50,66,69`, `commerce-code-coverage.yml:97`, `playwright-stress-test.yml:109`, `ci/espnplus/commerce:21`). **INFERRED:** the cache is network/ACL-gated rather than token-gated.
- Two enablement styles coexist: inline flags (sharded/growth/ci) and the composite (`apps-lint-and-test.yml:59-63`, `commerce-base-*`, `packages-lint-and-test.yml:99-103`, `jest-stress-test.yml:66-71`). **Only the composite disables caching on `main`.**
- Teams: `commerce`, `growth`, `identity`, `profiles-rules`.
- `.turbo` is gitignored (`.gitignore:37`); no `actions/cache` step for it — caching is purely remote.
- ESPN per-app configs: `apps/commerce/espn/turbo.json:2-7` (build env `PRODUCT`, `NEXT_PUBLIC_FLEX_LOCAL_SERVICE`; outputs `build/**`, `build-test/**`); `apps/marketing-unified/espn/turbo.json:2-7` (outputs `build/**`).

### 5.7 Jenkins / Fuzzbucket — what actually deploys ESPN (CONFIRMED)

There is **no `Jenkinsfile`, no `jenkins/` dir, no `*.groovy`**. Pipelines are extensionless Groovy under `ci/`.

- `ci/README.md:1-4` — *"Continuous integration & deployment for this repository is provided by Fuzzbucket."*
- `ci/monorepough` — parent pipeline (`@Library('tbd-pipeline-ugh-old-jenkins')`, `:3`; `FB_PIPELINE_TYPE: 'monoRepoPipeline'`, `:105`). ESPN children:
```groovy
ci/monorepough:25-33
    25	Map espnPlusNexus = [
    26	    job: "fzb-espnplus-nexus/${encodedBranchName}",
    27	    brand: "ESPN"
    28	]
    30	Map espnPlusCommerce = [
    31	    job: "fzb-espnplus-commerce/${encodedBranchName}",
    32	    brand: "ESPN"
    33	]
```
  Both in `publicProjects` (`:78-79`) → run on every branch (`:136-147`). Slashes double-encoded to `%252F` (`:10-12`).

**`ci/espnplus/commerce`** — key values:
| Key | Value | Line |
|---|---|---|
| `APPLICATION_NAME` | `espnplus-commerce` | `:11` |
| `DATADOG_APP_NAME` | `web-solo-commerce-espn` | `:29` |
| `CMD_BUILD` | `turbo build --filter=@solo/commerce-espn --token="1" --team="commerce"` | `:21` |
| `CMD_PRUNE` | `pnpm --filter commerce-espn --prod deploy ./target` | `:25` |
| `CMD_LINT` / `CMD_TEST` / `CMD_TEST_INTEGRATION` / `CMD_SONAR` | all `echo … run in GHA` / `echo skipping sonar` | `:24,26,27,23` |
| `HULU_APP_HELM_CHART_VERSION` | `0.36.0` | `:16` |
| `AUTOMATED_TESTS_JOB` | `site-dominguez-twdcgrid/espnplus-app-tests/main` | `:18` |
| `STATIC_ENDPOINT` | `espnplus-static.bamgrid.com` | `:38` |
| `CUSTOM_NODE_VERSION` | `22.14.0` | `:28` |
| `DEPLOY_WITH_MARINER` / `DEPLOY_WITH_JANUS` | `true` / `false` | `:12`, `:42` |

Branch → env matrix (`:46-90`): default **stage** on `cp1-nonprod-main`/`env-stage.yaml` us-east-1; `canary-(a|b|c)` → prod cluster/`env-canary.yaml`, no auto-deploy (`:51-57`); `main` → `env-main.yaml`, auto-deploy, us-east-1 + us-west-2 (`:58-62`); `partner-activation` → `env-partner.yaml` (`:63-68`); `release-*`/`hotfix-*` → `env-release-candidate.yaml` (`:69-75`); `trunk-clone` → same, auto-deploy (`:76-82`); **`trunk` → `env-prod.yaml` with `AUTO_DEPLOY=false`, i.e. production is a manual push** (`:83-89`). After `main` deploy it clones `main` → `partner-activation` (`:95-106`).

**`ci/espnplus/nexus`**: `APPLICATION_NAME: 'espnplus-nexus'` (`:11`), `DATADOG_APP_NAME: 'espn-plus-non-sub-browse'` (`:32`), `DATADOG_TRACE_TEST: true` (`:18`), `CMD_BUILD: 'turbo build --filter=@solo/marketing-unified-espn'` (`:22` — **no cache args**), `POST_DEPLOY_JENKINS_JOB: 'fzb-post-deploy-test'` (`:36`), `STATIC_ROOT_URL: 'https://espnplus-static.bamgrid.com/us-east-1/espn/marketing-unified'` (`:43`), `PR_OWNER_TEAMS_FAILURE_ALERT_DISABLE: true` (`:34`). Cypress tests commented out (`:29-30`).

**GHA → Jenkins bridge:** adding the `Auto-Deploy` label POSTs to `https://fed-jenkins.us-east-1.dpegrid.net/job/fzb-cgi-web-monorepo/job/$HEAD_REF/buildWithParameters` with `secrets.FUZZBUCKET_BAMGRID_JENKINS_API_USERNAME_PASSWORD`; `$HEAD_REF` is sanitized first (`.github/workflows/label-reactor.yml:23-33`).

**Four Datadog service names for ESPN — memorise this table:**
| Signal | ESPN commerce | ESPN marketing |
|---|---|---|
| Browser RUM | `web-solo-commerce-espn` | `espn-nexus` |
| Server APM / logs | `espnplus-commerce` | `espnplus-nexus` |
| Jenkins `DATADOG_APP_NAME` | `web-solo-commerce-espn` | `espn-plus-non-sub-browse` |
| CI Test Visibility | `cup_commerce/apps/espn`, `cup_commerce/espn` | `espnplus-nexus`, `bix-caleen/apps/espn` |

### 5.8 Docker (CONFIRMED)

| Dockerfile | Base | `USER` |
|---|---|---|
| `apps/commerce/espn/Dockerfile` | `fed.docker.artifactory.global.bamgrid.net/node:22.14.0` (`:1`) | `USER node` (`:11`) after `COPY` (`:5`), before `CMD ["./entrypoint.sh"]` (`:12`); `EXPOSE 3000` (`:2`); `WORKDIR /usr/src/app/apps/commerce/espn` (`:10`) |
| `apps/marketing-unified/espn/Dockerfile` | same (`:1`) | `USER node` (`:8`), `CMD ["./entrypoint.sh"]` (`:9`); `WORKDIR /usr/src/app/marketing-unified/espn` (`:7`) |
| 4 other app Dockerfiles | node:22.14.0 | `USER node` |
| 4 Storybook Dockerfiles | nginx:1.19.4 | `USER nginx` (`:15`) |
| `packages/identity-hulu/Dockerfile` | `node:16.14.0-slim` ×2 (`:16,37`) — **stale Node 16** | `USER nodejs` (`:50`) |
| `datadog/Dockerfile` | `fed.docker…/datadog/agent:latest` (`:1`) | **none** (agent needs root) |

ESPN specifics: **no `apps/commerce/espn/.storybook/Dockerfile`** (D+ and Hulu both have one). Both ESPN Dockerfiles are 3-line shallow — no multi-stage; the prune to `./target` happens in Fuzzbucket (`ci/espnplus/commerce:25,32`). Compose files: `datadog/docker-compose.local.yml`, `packages/traffic-director-dev/docker-compose-edge.yml:5-6` (`edge:b4adb0e`). **No compose file builds an ESPN app.**

Vault at container boot:
- `apps/commerce/espn/entrypoint.sh:3-11` — reads `/shared/config/application-vault.properties`, exports each line, `npm start`; logs `"Vault secrets not detected."` if absent.
- `apps/marketing-unified/espn/entrypoint.sh:3-11` — same shape.

### 5.9 The 27-character branch-name rule (CONFIRMED)

Enforced **client-side only**, as a hard `exit 1` in the `post-checkout` git hook (`core.hooksPath` = `./git-hooks`):

```sh
git-hooks/post-checkout:28-36
    28	if [[ $checkout_type = "branch" ]]; then
    29	    branch_name=$(git rev-parse --abbrev-ref HEAD ${new_head})
    30	    branch_name_length=${#branch_name}
    31	    if [[ $branch_name_length -gt 27 ]]; then
    32	        warn "Warning: Branch name (${branch_name}) contains more than 27 characters, Jenkins will be unable to deploy it." && exit 1
    33	    elif [ "${branch_name#*/*}" != "$branch_name" ]; then
    34	        warn "Warning: Branch name (${branch_name}) contains a '/' character, Jenkins will be unable to deploy it." && exit 1
    35	    fi
    36	fi
```

**Reason, stated in-code:** *"Jenkins will be unable to deploy it."* The slash rule (`:33-34`) is the same cause — `ci/monorepough:10-12` has to double-encode slashes to `%252F` for Jenkins job paths.

Documented at `CLAUDE.md:223` ("Jenkins/Fuzzbucket limitation") and `.claude/skills/cup-pr/SKILL.md:18`. Respected (not enforced) in CI at `.github/workflows/sync-figma-to-tokens.yml:102-104`.

**Gaps:** no server-side/GHA enforcement, no commitlint, no husky (leftover `.git/hooks/husky.sh` is inert since `core.hooksPath` points at `./git-hooks`). Mergify queue branches (`mergify-draft-…`) and heal branches (`flakyfix-pr<N>`) can exceed 27 chars but never deploy.

### 5.10 Required checks (CONFIRMED)

```yaml
.github/mergify.yml:7-17
     7	  ci_gates: &ci_gates
    10	    - check-success=Fuzzbucket CGI Web Monorepo Job
    11	    - check-success=run-pr-checks-disneyplus / status-check
    12	    - check-success=run-pr-checks-espn / status-check
    13	    - check-success=run-pr-checks-hulu / status-check
    14	    - check-success=check-all-packages-status
    15	    - check-success=check-all-apps-status
    16	    - check-success=commerce-base-status-check
    17	    - check-success=sonarqube-summary
```

ESPN mapping:
- **`run-pr-checks-espn / status-check`** ← `commerce-pr-checks-espn-sharded.yml:12` + `commerce-playwright-tests-sharded.yml:309`. **ESPN commerce Playwright is a hard gate.**
- `check-all-apps-status` ← `apps-lint-and-test.yml:89` — covers ESPN commerce lint/typecheck/jest **and** ESPN nexus.
- `sonarqube-summary` ← gates on `cgi-client:commerce-espn` (`:118`) and `cgi-client:nexus-espn` (`:121`).
- `Fuzzbucket CGI Web Monorepo Job` ← `ci/monorepough`, incl. both ESPN jobs.
- **NOT gated:** `Growth PR Checks - ESPN` (its job id is `run-pr-checks`, absent from `ci_gates`), `glimpse-shield-validation` (explicitly excluded), coverage, bundle analysis, both stress tests, heal-flaky-tests.

Queues: `default` (batch 5, 60-min checks timeout, needs `Auto-deploy` then `Merge Queue` labels, `:35-46`), `dev_queue` (batch 2, `:48-59`), `changeset_queue` (batch 1, **skips `ci_gates`** by design, `:61-72`), `trunk` (`:74-80`). All `merge_method: squash`.

**CODEOWNERS:** `.github/CODEOWNERS` has **no ESPN-path-specific entries**. Coverage is via `/apps/marketing-unified/ @cgi-client/web-growth` (`:296`) and wildcards `/apps/commerce/*/…` → `@cgi-client/gci-experiences-platform` (`:19,27-28,113,119,121,125`). ESPN data-interface splits: activations → `@cgi-client/mma` (`:179`); identity → `@cgi-client/auth-access` (`:249-253`); onboarding-status → `@cgi-client/profiles` (`:274`).

---

## 6. Testing infrastructure

### 6.1 Jest (CONFIRMED)

**There is no root jest config and no `projects` key anywhere.** Every app/package owns a standalone config.

| Config | Env | Transform | Notable |
|---|---|---|---|
| `apps/commerce/espn/jest.config.js` (107 lines) | `jest-fixed-jsdom` (`:86-89`) | `babel-jest` + `next/babel` (`:80-84`, because *"next/jest code coverage numbers are incorrect"*) | `globalSetup` sets `TZ=America/Los_Angeles` (`:40`; `src/test/setup/jest.global-setup.ts:10`); 10 `setupFilesAfterEach` (`:68-79`); `testPathIgnorePatterns: ['/node_modules/','/playwright/']` (`:66`); `testTimeout: 10_000` (`:103`); jest-junit → `test/unit/results.xml` (`:90-99`) |
| `packages/cgi/commerce-base/jest.config.js` | `jest-fixed-jsdom` | `babel-jest` | **Shard-aware threshold** (`:11`, `:30-41`); 20 `setupFilesAfterEach` (`:66-87`); **no `pathsToModuleNameMapper`** despite deleting `paths['*']` (`:9`); **no `testPathIgnorePatterns`** |
| `packages/cgi/data-interface-espn/jest.config.js` (27 lines) | `jest-fixed-jsdom` (`:26`) | none | Thinnest of the three data-interfaces: no `moduleNameMapper`, no reporters, no MSW, no `globalSetup`; `jest: "^28.0.1"` not `catalog:default` (`package.json:43`) |
| `apps/marketing-unified/espn/jest.config.js` (160 lines) | `jest-fixed-jsdom` (`:145`) | **Next SWC** `next/dist/build/swc/jest-transformer.js` (`:154-157`) | JSON5 tsconfig parse (`:8-10`); strips `@types` from `paths` because *"Including anything with `@types` … can cause Jest to crash"* (`:16-57`); `collectCoverage: true` always (`:60-65`); `coverageProvider: 'babel'` (`:106`) |

Datadog mocks are wired in `moduleNameMapper`, not a manual mock:
```js
apps/commerce/espn/jest.config.js:51-59  (paraphrased shape)
  '^@datadog/browser-rum$'  -> '@solo/observe/jest/datadog-mocks'
  '^@datadog/browser-logs$' -> '@solo/observe/jest/datadog-mocks'
  '^@solo/commerce-base/node_modules/@datadog/browser-rum$' -> same
```
Also `^uuid$` → `uuid` (`:49`) and `^dss-device$` → `require.resolve('dss-device')` for pnpm-hoisting safety (`:62`).

**`@solo/logger` is NOT aliased in any jest config** — `grep "logger" --include="jest.config*"` returns zero. It is handled by a manual `__mocks__/@solo/logger.js` (ESPN marketing has one) and per-test `jest.mock('@solo/logger', …)` (`apps/marketing-unified/espn/src/views/landing-page/get-server-side-props.test.ts:62`, `get-page-data.test.ts:31`, `get-localization-redirect.test.ts:8`, `get-redirect-result.test.ts:9`). **Trap:** unlike disneyplus (`apps/marketing-unified/disneyplus/src/test/jest.setup.ts:5`), ESPN's `jest.setup.ts` never wires up its own `__mocks__/@solo/logger.js` (`apps/marketing-unified/espn/src/test/jest.setup.ts:1-22`).

### 6.2 Coverage (CONFIRMED)

All four ESPN-relevant configs enforce 100/100/100/100:
```js
apps/commerce/espn/jest.config.js:30-38
    30	  // For coverage report files, enforce 100% coverage
    31	  coverageThreshold: {
    32	    global: {
    33	      branches: 100,
    34	      functions: 100,
    35	      lines: 100,
    36	      statements: 100,
    37	    },
    38	  },
```
Same at `packages/cgi/data-interface-espn/jest.config.js:9-16` and `apps/marketing-unified/espn/jest.config.js:146-153`.

commerce-base drops the threshold when sharded:
```js
packages/cgi/commerce-base/jest.config.js:30-41
    30	  coverageDirectory: 'coverage/jest',
    31	  // For coverage report files, enforce 100% coverage
    32	  coverageThreshold: isSharded
    33	    ? undefined
    34	    : { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
```
(`isSharded` = `process.argv.some((arg) => arg.startsWith('--shard'))`, `:11`.)

Policy: *"We require **100% code coverage** on our `/src` directories"* — `docs/testing/jest/README.md:7-8`, restated `:64`, with the `istanbul ignore` escape hatch at `:72` (*"ALWAYS confirm with the engineer before adding"*). A ratchet tracks that hatch: both `apps/commerce/espn` and `packages/cgi/data-interface-espn` are in `scripts/utils/check-istanbul-ignore-counts.js:37,50` (`pnpm check-istanbul-ignore-counts`, root `package.json:31`).

Below-100 exceptions repo-wide: `packages/privacy-consent` (branches 99), `packages/marketing/growth-cms-api` (functions 96), `packages/marketing/plans-pricing-api` (branches 95, lines/statements 97).

Turbo tasks: `coverage:jest` (`turbo.json:17-19`), `coverage:jest:ci` (`:20-23`, outputs `coverage/**`), `coverage:report:jest` (`:24-27`), `test:playwright` (`:84-93`, `cache: false`).

### 6.3 Datadog test tagging (CONFIRMED)

`@solo/test-utils` provides two independent routes into Datadog CI Visibility.

**Route 1 — APM/native.** `packages/test-utils/src/jest/datadog-tag-reporter/setup.ts` monkey-patches Jest globals: `wrapDescribeFunction` maintains a describe stack (`:104-115`); `wrapTestFunction` builds an ordered titles array (test = order 0, immediate parent = 1, …) at `:147-152`, calls `parseTestTags` (`:155`), then lazily `require('dd-trace')` and `testSpan.setTag(tag.type, tag.description)` (`:195-205`). The lazy load is deliberate: *"Local `jest` / `test:watch` runs don't load `-r dd-trace/ci/init`, so `scope` isn't a function"* (`:188-194`). Globals are reassigned with `Object.assign` to preserve `.skip/.only/.todo/.each` (`:293-306`).

**Route 2 — JUnit XML.** `packages/test-utils/src/jest/junit-reporter/create-datadog-tag-parser-func.ts:42-75` emits `properties['dd_tags[' + type + ']'] = description` (`:71`), with the note *"Datadog will pick up any JUnit property with the `dd_tags[key]` format"* (`:70`). Pre-baked default at `default-datadog-tag-parser.ts:11-14`.

Tag mapping:
```ts
packages/test-utils/src/tag-parsers/types.ts:63-67
    63	export const tagTypeLookup = {
    64	  owner: 'test.owner',
    65	  product: 'test.product',
    66	  env: 'test.env',
    67	} as const satisfies Record<TagType, string>;
```
`TAG_REGEX = /@\S+/g` (`:5`). Parsing rules: **lowest order wins per tag type** (test-level beats parent describe) — `parse-test-tags.ts:78-80,103-105`; unmatched `@key:value` becomes `test.<key>` (`:89-106`).

The ESPN product parser (`@espn` → `test.product=espn`): `packages/test-utils/src/tag-parsers/gci-parsers.ts:25-30`. Team parsers at `:38-129` (`@identity`, `@platform`, `@tap`, `@art`, `@growth`, `@xd`, `@profiles`, `@great`, `@mlp`, `@nsb`, `@obi`, `@gide`, `@mma`, `@subg`, `@cgi-identity`).

**Only ESPN marketing opts into the CODEOWNERS owner fallback:**
```js
apps/marketing-unified/espn/jest.config.js:127-135
   127	  globals: {
   128	    datadogTagReporterConfig: {
   129	      codeownersFallback: true,
   130	      // @cgi-client/web-growth (the renamed NEXUS handle) -> `growth` owner value
   131	      codeownersOwnerMap: { '@cgi-client/web-growth': 'growth' },
   132	    },
   133	  },
```
CODEOWNERS resolution: `packages/test-utils/src/tag-parsers/codeowners-owner.ts:26-46` — searches `.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS`; reverses entries so **last matching rule wins** per spec.

**Gap (CONFIRMED):** only **18** files repo-wide carry `@espn`, and **10** `test.describe` blocks — all but one in ESPN commerce *playwright* (`change-payment.spec.ts:80`, `plans-multi-offer.spec.ts:115`, `identity-signup.spec.ts:33`, `identity-login.spec.ts:21`, `addon-multi-offer.spec.ts:67`, `cancel-subscription.spec.ts:213`, `multi-offer-plan-switch.spec.ts:181`, `change-subscription-confirm.spec.ts:154`, `billing-ledger-version.spec.ts:43`, plus `packages/cgi/commerce-base/src/account/change-subscription/components/v2/change-subscription-confirm-content/change-subscription-confirm-content.test.tsx:328`). **Zero ESPN jest files carry `@espn`** → ESPN unit tests are untaggable in Datadog by product. ESPN commerce also doesn't enable the CODEOWNERS fallback → they also carry no `test.owner`.

CI upload script: `scripts/utils/run-tests-upload-datadog.sh` — `DD_SERVICE=$1` (`:9`), `JEST_JUNIT_OUTPUT_DIR="junit-results"` (`:12`), `DD_SUBDOMAIN="disneystreaming"` (`:16`), `DD_TAGS="test.bundle:jest,test.module:jest,test.framework:jest"` (`:17`), `npx @datadog/datadog-ci junit upload --env ci` (`:33`), deletes XML (`:43`), re-exits with the captured test code (`:46`). ESPN invocations: `cup_commerce/apps/espn` (`apps/commerce/espn/package.json:22`), `cup_commerce/data-interface-espn` (`packages/cgi/data-interface-espn/package.json:18`).

### 6.4 Provider wrappers — how to make a test "be ESPN" (CONFIRMED)

Definitions: `packages/cgi/commerce-base/src/test/testing-library.tsx:621` (`renderWithProviders`), `:372` (`generateProviderWrapper`), `:603` (`generateDataInterfaceProviderWrapper`), `:640` (`renderWithDataInterfaceAsync`), `:337` (`getSparrowConfigFixture`).

**There is no `PRODUCT` enum.** The product is the string-literal union `ProductName` = `'disneyPlus' | 'espn' | 'hulu'` from `@solo/types` (enumerated at `packages/cgi/commerce-base/.storybook/preview-utils.tsx:95`). `NEXT_PUBLIC_PRODUCT_NAME` does not exist in this repo.

**`renderWithProviders` defaults to Disney+** — `getMergedConfigFixtureForProduct('disneyPlus')` when no `sparrowConfig` is passed (`testing-library.tsx:382-384`). So the ESPN pattern is the explicit wrapper:

```tsx
apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.test.tsx:69-74
    69	    render(<ExampleComponent />, {
    70	      wrapper: generateProviderWrapper({
    71	        sparrowConfig: getSparrowConfigFixture('espn'),
    72	        isSDKEnabled: true,
    73	      }),
    74	    });
```
Same at `:100-105`, `:131-136`; also `apps/commerce/espn/src/common/layouts/page-layout.test.tsx:11`, `legacy-application-layout.test.tsx:25`, `src/layout/espn-layout.test.tsx:19`, `src/common/layouts/utils/render-consent.test.tsx:3`. Documented at `docs/testing/jest/README.md:425`.

**No ESPN commerce test calls `renderWithProviders`** — grep returns zero. ESPN uses raw `render` + explicit `wrapper`.

Process-wide mechanism (drives fixtures):
```ts
packages/cgi/commerce-base/src/common/lib/get-product-name-for-mocks.ts:18-22
    18	export const getProductNameForMocks = () => {
    19	  return (process.env.PRODUCT ||
    20	    getConfig()?.publicRuntimeConfig?.productNameForMocks ||
    21	    'disneyPlus') as ProductName;
    22	};
```
Three-tier cascade: server env → Next `publicRuntimeConfig` → `'disneyPlus'`. Populated at `apps/commerce/espn/next.config.js:129`.

**Trap (CONFIRMED):** `PRODUCT=espn` is set by `coverage:jest` (`apps/commerce/espn/package.json:21`) and by playwright (`playwright.config.ts:107`; `package.json:45,48`) — but **NOT** by `test:jest` (`:43`) or `test:watch` (`:50`). `pnpm -F @solo/commerce-espn test:jest` silently uses Disney+ fixtures.

### 6.5 Playwright (CONFIRMED)

**ESPN commerce** — `apps/commerce/espn/playwright.config.ts`:

| Setting | Value | Line |
|---|---|---|
| `baseURL` | `http://localhost:5040` | `:13` |
| HTTPS variant | commented — `https://local.plus.espn.com:5004`, *"TODO - WEB-30985 - Re-Enable HTTPS when SSL resolution in CI is resolved"* | `:11-12` |
| `testDir` | `./playwright/tests` | `:21` |
| `expect.timeout` / `timeout` | `10_000` / `30_000` | `:23`, `:33` |
| `fullyParallel` | `true` | `:25` |
| `retries` / `maxFailures` / `workers` | `CI?2:0` / `CI?5:undefined` / `CI?1:undefined` | `:29`, `:31`, `:35` |
| reporters (CI) | `github`, `junit`, `json→results.json`, **`blob`** | `:38-43` |
| `trace` / `video` | both `retain-on-failure` | `:51-52` |
| projects | single `chromium`, `testIgnore: /.*\.mobile\.spec\.ts/` | `:60-64` |
| firefox/webkit/mobile/edge | **all commented out** | `:66-95` |
| `webServer.command` | CI `PORT=5040 next start`; local `next build && PORT=5040 next start` | `:100-102` |
| `webServer.env` | `NEXT_PUBLIC_API_MOCKING: 'playwright'`, `GIT_COMMIT`, `PRODUCT: 'espn'` | `:103-108` |
| `webServer.url` | `${baseURL}/commerce/billing-history` | `:109` |
| `globalSetup`/`Teardown` | `./playwright/global-setup.ts` / `global-teardown.ts` | `:117-118` |

`globalSetup` logs *"Welcome to ESPN Playwright Test Environment!"* and calls `playwrightServerMockingAPI.start()` (`playwright/global-setup.ts:12-13`); teardown `.stop()` (`global-teardown.ts:10`).

**ESPN marketing** — `apps/marketing-unified/espn/playwright.config.ts`: `baseURL http://localhost:3000` (`:5`); `expect.timeout 60_000` (`:17`); `timeout 120_000` (`:26`); **`fullyParallel` not set**; reporters `github, junit, json, html` — **no `blob`**, so it cannot participate in shard/merge (`:29-34`); `webServer.env` includes `SPARROW_SCOPE_NAME: 'ESPN_NEXUS'`, `SPARROW_WORKSPACE: 'Growth'`, `SPARROW_S3_ACCESS_KEY` defaulting to `'test-placeholder'` (`:92-108`); `webServer.url` = `${baseURL}/healthcheck` (`:109`); no global setup/teardown; sets `process.env.AWS_REGION = 'us-east-1'` at module top level (`:8`).
**Port mismatch:** config uses 3000 while the dev script is `next dev -p 4040` (`package.json:13`).

**`@solo/playwright-utils`** — `packages/playwright-utils/src/index.ts:1-13` exports `./lib`, `./analytics`, `./fixtures`, `./datadog/create-datadog-tag-parser`, `./stub-sheerid-cdn`.
- Fixtures barrel (`src/fixtures/index.ts:1-3`): `createMockNodeServerFixture`, `createCollectionFixture`, `createTealiumInterceptorFixture`.
- `createMockNodeServerFixture` (`src/fixtures/create-mock-node-server-fixture.ts:31-67`) exposes `{_start,_stop,_reset,use}` and **auto-resets the MSW node server after every test** (`:64`).
- Three CLI bins (`package.json:8-12`): `playwright-utils-aggregate-visited-routes`, `playwright-utils-happy-path-output`, `playwright-utils-js-css-coverage-report`.
- **No auth/session fixture is exported** — auth lives per-app.
- `src/lib.ts:2` is a stub returning `'Hello from @solo/playwright-utils'`.

**ESPN commerce test object** — `apps/commerce/espn/playwright/support/fixtures.ts`:
- `network: createNetworkFixture({ onUnhandledRequest, initialHandlers: [...espnBrowserHandlers, ...playwrightGlobalClientHandlers] })` from `@msw/playwright` (`:61-67`)
- `pom` with 9 commerce + 4 identity POMs, `profiles: {}` empty (`:68-87`, typed `:36-58`)
- `mergeTests(extendedTest, mockNodeServerFixture, collectionFixture, datadogTagParser)` (`:104-109`)
- `createDatadogTagParser({ tagParsers: defaultGCIParsers, allowFreeTagParsing: true })` (`:95-98`)
- **Import bug:** `from '/../../browser-mocks/browser-handlers'` — leading slash (`:15`)

**ESPN marketing test object** — `apps/marketing-unified/espn/playwright/support/fixtures.ts:58` = `mergeTests(coverageFixture, datadogTagParser)`. It **does not use `@solo/playwright-utils`' `createCollectionFixture`**; it hand-rolls JS/CSS coverage with PID-suffixed temp files (`:14-51`), flushed in `test.afterAll` (`:61-81`). Auth: `apps/marketing-unified/espn/playwright/helpers.ts:9-12`, `ESPN_SDK_KEY_PREFIX = 'espn-a9b93989_prod'`.

ESPN auth in commerce = `setupAuthorization({ page })` via `page.addInitScript` populating localStorage with device grant + access tokens (`docs/testing/playwright/README.md:506-521`); logged-out = skip it (`:541`). Hulu differs (`setupAuthCookies`, `:523-535`).

### 6.6 MSW (CONFIRMED)

**The toggle is `NEXT_PUBLIC_API_MOCKING`, not `NEXT_PUBLIC_MOCKS`** (zero occurrences of the latter). Predicates in `packages/cgi/commerce-utils/src/environment.ts`: `isBrowserMockingEnabled` ← `=== 'enabled'` (`:34-36`); `'playwright'` mode (`:48`); `'enabled' || 'cypress'` (`:53-54`). Values in use: `'enabled'` (integration dev), `'playwright'` (E2E), `'cypress'` (legacy).

Worker scripts are checked in: `apps/commerce/espn/public/mockServiceWorker.js`, `apps/marketing-unified/espn/public/mockServiceWorker.js`. Declared via `"msw": { "workerDirectory": ["public"] }` (`apps/commerce/espn/package.json:142-146`) and `"./public"` (`apps/marketing-unified/espn/package.json:119-121`).

`pnpm run setup configure msw` → `scripts/lib/configure/msw.sh:4-37`: iterates `$MSW_DIRECTORIES`, warns+skips when `node_modules/msw` is absent (`:13-16`), runs `pnpm exec msw init` (`:28`), with `--no-save` special cases for `packages/identity-hulu` (`:24`) and `packages/cgi/commerce-base` (`:26`) because *"MSW 2.x prompts to save the worker dir… Command substitution hides that prompt, so setup appears to hang"* (`:19-22`). Both ESPN apps are listed at `scripts/var/settings.sh:7,10`.

**ESPN commerce client mocks:** `src/test/components/browser-mocks.tsx:9` (`shouldLoadBrowserMocks = isBrowserMockingEnabled`) → `next/dynamic` import of `./espn-browser-mocks` only when enabled (`:16-22`). `espn-browser-mocks.tsx:16-18` composes `[...espnBrowserHandlers, ...browserHandlers]` with `// TODO WEB-31113: Only load tenant-specific browser handlers and remove integrationModeHandlers` (`:22`). Handler files: `apps/commerce/espn/browser-mocks/browser-handlers.ts`, `src/queries/browser_mocks/{handlers,index}.ts`, `src/test/playwright/global-client-handlers.ts`. Runtime control: `pages/api/msw/{start,stop,reset,use}.api.ts`. Babel cache invalidated on the flag (`babel.config.js:7`); node-side gate at `instrumentation-node.ts:18`. Next config strips the wrong msw alias per build target (`next.config.js:213-232`) and marks msw a `serverExternalPackage` (`:98`).

**ESPN commerce jest MSW:** `src/test/setup/jest.setup-msw.ts` imports **19** handler bundles from `@solo/commerce-base/src/**/__browser-mocks__/**` plus `@solo/sdk-session` (`httpHandlers` + `espnGraphHandlers`, `:22-25`), `@solo/instrumentation` analytics handlers (`:21`), and local query handlers (`:30`); `setupServer(...)` spreads all at `:32-52`. Also: `configure({ asyncUtilTimeout: 5000 })` because *"the SDK making additional network requests internally upon initialization"* (`:54-56`); react-query error logger silenced (`:61-63`); `crypto.getRandomValues` polyfill *"needed for the SDK session internals"* (`:65-70`); `beforeEach` does `mockIsLoggedInTrue()` + `queryClient.clear()` (`:73-79`); `afterEach(server.resetHandlers())` (`:84-86`).

**ESPN marketing mocks:** handlers under `src/mocks/handlers/` (`cannonball/{footer,index,landing-pages,redirect}.ts`, `dictionary.ts`, `orchestration.ts`, `remote-config.ts`, `spaceball.ts`, `utils.ts`); fixtures under `src/mocks/apis/` (16 files incl. `sparrow-espn-nexus-config.ts`, `spaceball-landing-home-snapshot.json`). Browser worker `src/mocks/browser.ts:5`; node server `src/mocks/server.ts:7` with an `events.on('request:unhandled')` logger (`:10-15`); isomorphic bootstrap `src/mocks/index.ts` skipping `NEXT_PHASE === 'phase-production-build'` (`:8-11`).
**Gate is playwright-only:**
```tsx
apps/marketing-unified/espn/src/pages/_app.page.tsx:25-26
    25	if (process.env.NEXT_PUBLIC_API_MOCKING === 'playwright') {
    26	  require('../mocks/index');
```
i.e. `'enabled'` does nothing for ESPN marketing. Jest side: one `mockServer` for both browser+server handlers, *"Since we aren't actually testing in a browser…"* (`src/test/jest.setup-msw.ts:4-13`), `onUnhandledRequest: 'warn'`. `.env.test:8` sets `NEXT_PUBLIC_API_MOCKING=playwright`.

### 6.7 Exact ESPN test/build/dev commands (CONFIRMED)

```bash
# ---------- ESPN commerce: jest ----------
pnpm test:commerce:jest:espn            # root:92  -> turbo coverage:jest --filter=@solo/commerce-espn
                                        #             -> "PRODUCT=espn jest --coverage"      (app:21)
pnpm test:commerce:jest:report:espn     # root:95  -> open coverage/jest/lcov-report/index.html (app:26)
pnpm -F @solo/commerce-espn test:jest           # app:43  -> "jest"   ⚠️ NO PRODUCT=espn
pnpm -F @solo/commerce-espn test:watch          # app:50  -> "jest --watch"  ⚠️ NO PRODUCT=espn
pnpm -F @solo/commerce-espn test:jest:instrument# app:44  -> dd-trace/ci/init + test:jest
pnpm -F @solo/commerce-espn coverage:jest:ci    # app:22  -> run-tests-upload-datadog.sh cup_commerce/apps/espn

# ---------- ESPN commerce: playwright ----------
pnpm test:commerce:playwright:espn            # root:98  -> "PRODUCT=espn playwright test --ui"  (app:45)
pnpm test:commerce:playwright:headless:espn    # root:100 -> "PRODUCT=espn playwright test"       (app:48)
pnpm -F @solo/commerce-espn test:playwright:install  # app:49 -> pnpm exec playwright install
cd apps/commerce/espn && pnpm exec playwright test --shard=1/2   # reproduce CI (workflow:169)
pnpm -F @solo/commerce-espn test:playwright:coverage:js-css      # app:46
pnpm -F @solo/commerce-espn test:playwright:coverage:pages       # app:47
pnpm -F @solo/commerce-espn coverage:playwright:happy-paths      # app:23  (the CI gate metric)

# ---------- ESPN marketing: jest ----------
pnpm -F @solo/marketing-unified-espn test           # mkt:21 -> "jest --coverage"
pnpm -F @solo/marketing-unified-espn coverage:jest  # mkt:22 -> what CI runs (apps-lint-and-test.yml:87)
pnpm -F @solo/marketing-unified-espn test:watch     # mkt:27
pnpm -F @solo/marketing-unified-espn test -- <file> # README:94

# ---------- ESPN marketing: playwright ----------
pnpm test:marketing-unified:playwright:espn          # root:115 -> "playwright test" (mkt:23, HEADLESS)
pnpm -F @solo/marketing-unified-espn test:playwright:ui       # mkt:26 <- the real headed cmd
pnpm -F @solo/marketing-unified-espn test:playwright:install  # mkt:25
# ⚠️ BROKEN: root:117 test:marketing-unified:playwright:headless:espn targets a
#            `test:playwright:headless` script marketing ESPN does not define (mkt:23-26).

# ---------- ESPN data-interface ----------
pnpm test:data-interface-espn:coverage        # root:105 -> "jest --coverage" (di:17)
pnpm -F data-interface-espn test              # di:16
pnpm -F data-interface-espn test:coverage:ci  # di:18 -> run-tests-upload-datadog.sh cup_commerce/data-interface-espn

# ---------- lint / typecheck / build ----------
pnpm lint:commerce:espn                   # root:55 -> eslint --max-warnings=111 + stylelint (app:35)
pnpm lint:data-interface-espn             # root:59 -> eslint --max-warnings=0 (di:12)
pnpm -F @solo/marketing-unified-espn lint # mkt:15 -> eslint --max-warnings 0
pnpm lint:type-check:commerce:espn        # root:67 -> tsc -p tsconfig.json --noEmit (app:38)
pnpm lint:type-check:data-interface-espn  # root:70
pnpm -F @solo/marketing-unified-espn lint:type-check  # mkt:18 -> tsc --noEmit
pnpm build:commerce:espn                  # root:15 -> "pnpm prebuild && next build" (app:17)
pnpm build:marketing-unified:espn         # root:22 -> "pnpm next build" (mkt:7)
```

---

## 7. Local verification recipes

### 7.1 First-time setup (CONFIRMED)

```bash
./scripts/setup                          # install + configure (scripts/setup:108-111)
pnpm install                             # behind GlobalProtect VPN (README.md:36-40)
pnpm run setup configure msw             # README.md:45
pnpm -w run setup configure secrets      # README.md:51 — NOT in the default chain (configure.sh:65-67)
pnpm run setup configure playwright      # README.md:57
```

`scripts/setup:35-42` advertises: Homebrew, Node 22.14.0, pnpm 10, Turborepo, Docker Desktop, mkcert + certs, `/etc/hosts` update. `_configure` subcommands: `certs`, `hostfile`, `msw`, `playwright`, `secrets` (`scripts/lib/configure.sh:28-33`); default chain is certs → hostfile → msw → playwright (`:75-78`). Certs land in `${PROJECT_HOME}/apps/.certs` (`:46`), matching `-c ../../.certs` in both ESPN proxy scripts.

ESPN hostnames provisioned (`scripts/var/settings.sh:3`, `CERTIFICATE_DOMAINS`): **`local.plus.espn.com`**, `localhost.espn.com`, `local.qa-espn.api.edge.bamgrid.com`. `update_hostfile` appends `127.0.0.1 <domain>` via sudo (`scripts/lib/configure/hostfile.sh:10-17`).

Vault mapping: `scripts/lib/configure/secrets.sh:9` → `apps/commerce/espn|espnplus-commerce|60c7e031310ce5f580d4db16`; `:12` → `apps/marketing-unified/espn|espnplus-nexus|60c7e031310ce5f580d4db16`. Uses DevX CLI `devx locksmith` with browser SSO, writing `.env.local` (`scripts/README.md:50`).

### 7.2 Run ESPN locally (CONFIRMED)

```bash
# ESPN commerce, real backends (gated on Vault secrets)
pnpm dev:commerce:espn
#  app:29 dev = "pnpm -w check-commerce-secrets && pnpm prebuild && npm run dev:start"
#  app:33 dev:start = concurrently( dev:proxy, "PORT=5040 next dev" )
#  app:32 dev:proxy = wait-on http://local.plus.espn.com:5040/healthcheck, then wcs ssl-proxy -c ../../.certs -p 5004
#  -> https://local.plus.espn.com:5004/commerce/billing-history

# ESPN commerce, MSW mocks on (no Vault needed for mocked calls)
pnpm dev:commerce:integration:espn
#  app:30 -> "NEXT_PUBLIC_API_MOCKING=enabled npm run dev:start"

# ESPN commerce against a LOCAL Flex
pnpm -F @solo/commerce-espn dev:local-flex
#  app:31 -> adds NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled

# ESPN marketing / NEXUS
pnpm dev:marketing-unified:espn
#  mkt:12 dev = "turbo dev:server proxy"
#  mkt:13 dev:server = "next dev -p 4040 | pnpm run format-logs"
#  mkt:19 proxy = wait-on http://local.plus.espn.com:4040/healthcheck, ssl-proxy -p 5040
#  -> https://local.plus.espn.com:5040   (README.md:28-29)
# NOTE: marketing ESPN has NO dev:integration script.

# Local Datadog agent (so dd-trace has somewhere to send spans)
pnpm -F @solo/commerce-espn datadog-agent:start   # app:27
pnpm -F @solo/commerce-espn datadog-agent:stop    # app:28
```

**Port map (CONFIRMED):**
| Purpose | Port | Cite |
|---|---|---|
| commerce ESPN Next dev | 5040 | `apps/commerce/espn/package.json:33` |
| commerce ESPN SSL proxy | 5004 | `apps/commerce/espn/package.json:32` |
| commerce ESPN PW baseURL/webServer | 5040 (HTTP) | `playwright.config.ts:13,101-102` |
| marketing ESPN Next dev | 4040 | `apps/marketing-unified/espn/package.json:13` |
| marketing ESPN SSL proxy | 5040 | `apps/marketing-unified/espn/package.json:19` |
| marketing ESPN PW baseURL/webServer | 3000 | `playwright.config.ts:5,90-91` |

### 7.3 Pointing at QA / local Flex (CONFIRMED)

- **Local Flex:** `NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled` — surfaced as `pnpm -F @solo/commerce-espn dev:local-flex` (`apps/commerce/espn/package.json:31`) and declared as a build env in `apps/commerce/espn/turbo.json:2-7`.
- **Traffic Director + Edge:** `packages/traffic-director-dev/docker-compose-edge.yml:5-6` runs `apiservices.docker.artifactory.global.bamgrid.net/edge:b4adb0e` as `container_name: edge`. Toggled by `WITH_TRAFFIC_DIRECTOR=true` (changes `assetPrefix` to `/commerce/`, `apps/commerce/espn/next.config.js:14-15,70-72`) and `WITH_EDGE_SERVER=true` (`:16-17`, surfaced as `isUsingLocalEdgeServer` in `publicRuntimeConfig`, `:128`).
- **ESPN QA Flex base URL** used by Playwright docs: `ESPN_FLEX_BASE_URL = 'https://qa-espn.api.edge.bamgrid.com'` (`docs/testing/playwright/README.md:452`). The matching cert domain `local.qa-espn.api.edge.bamgrid.com` is provisioned by setup (`scripts/var/settings.sh:3`).

### 7.4 Verifying observability locally

**INFERRED** (constructed; not documented as a recipe anywhere):
1. RUM will initialise with `env: 'non-prod'` (commerce) / `'local'` (marketing) and `version: 'local'`/`'LOCAL'`, so commerce gets **100% session + 100% replay** sampling locally (`observe.ts:46,57-58`).
2. `localStorage.enableAnalyticsDebugger = '1'` turns on tracker console output (`adobe-analytics-tracker.ts:44`, `glimpse-analytics-tracker.ts:45`).
3. Debug tooling (Toodles) is on by default locally — `isDebugToolingEnabled` is `!isProd` (`apps/commerce/espn/next.config.js:126-127`). Use it to read the live RUM `applicationId`/`sessionId`/`service` (`observe.info()`).
4. To assert RUM emission deterministically, prefer the Playwright helpers (`expectRumActionToHaveFired`) over eyeballing the network tab.

---

## 8. Security scanning (SCRAAP) as it affects ESPN

All CONFIRMED from `docs/security/AGENTS.md` and `.github/AGENTS.md`.

**What it is:** Disney's security review platform, four finding families — dependency CVEs, Semgrep source findings, secret detection, infra hardening (GHA/Docker). Dashboard `https://scraap-reviews-app-prod.prod.hulu.com` (Profile → REVIEWS) (`docs/security/AGENTS.md:16`). Full playbook is external: `https://pages.github.twdcgrid.net/cgi-client/gciex-platform-docs/docs/security/scraap-remediation.md` (`:18`).

**CLI (read-only static analysis, needs v0.13.0+ / Java 21):**
```bash
scraap view              # existing findings for repo/branch
scraap view --branch     # current git branch
scraap scan <dir>        # scan a directory
scraap scan --sarif      # SARIF for tooling/CI
```
> ⚠️ *"Don't scan the whole monorepo. A full-repo scan (`scraap scan .`) is slow and prone to timeouts and failures."* (`:41`) — for ESPN work, scan `apps/commerce/espn` or `apps/marketing-unified/espn` specifically.

**Secrets → Vault, three injection points** (`:22-28`): deployed = Vault via `entrypoint.sh` reading `/shared/config/application-vault.properties`; local = `scripts/setup configure secrets` writing `.env.local`; CI = GitHub Actions secrets as step-level `env:`. In committed `.env`/`.env.example` use a commented key or **`test-placeholder`** — which is exactly what `apps/marketing-unified/espn/playwright.config.ts` does for `SPARROW_S3_ACCESS_KEY` (`:92-108`).

**Dependency CVEs, lightest fix first** (`:47-59`): direct → bump in owning `package.json`, centralise in the pnpm catalog (`pnpm-workspace.yaml`); transitive → **scoped `pnpm.overrides`** in root `package.json` with a semver selector (`"fast-xml-parser@<4.5.5": "4.5.5"`); unused → remove. Do **not** blanket-override high-risk majors (next, axios, vite, webpack, react-router, lodash, Storybook, uuid).

**`nosemgrep` is a last resort** (`:63-75`) — escalate only as far as needed: rename/remove → replace fixture values → codify as an ESLint rule → line-scoped `nosemgrep` with a pinned rule id and a why-it's-safe comment. Never a blanket `// nosemgrep`.

**Two custom ESLint rules** in `packages/developer-experience/eslint-config/eslint-config-base/scraap-plugin.js` (`:79-84`): `no-password-identifiers` and `no-secret-identifiers`. **They only reach flat-config packages** via `eslint-config-nsx`; legacy `.eslintrc.*` packages are uncovered. **INFERRED:** ESPN marketing uses `eslint-config-nsx` (its own next config says *"We lint separately with the shared esling-config-nsx package"*, `apps/commerce/espn/next.config.js:90-91`) — so ESPN is likely covered; verify per package.

**ESPN-specific instrumentation risks** (from `packages/instrumentation/AGENTS.md`, "Security Conventions"):
- Never put secrets/tokens/PII (emails, account IDs) into `logger.*`, Adobe/Glimpse/Tealium payloads, or **Datadog RUM context**.
- ⚠️ This is live tension with `datadog.tsx:138-142`, which deliberately sends `accountId`/`deviceId` via `setUser`. Those are opaque IDs, not PII — but do not extend that pattern with emails or names.
- A `token`/`apiKey`-named field holding a real value will be flagged; source from env or rename.

**CI hardening** (`.github/AGENTS.md`):
- `yaml.github-actions.security.run-shell-injection` — never interpolate `${{ ... }}` inside `run:`. Move to a step-level `env:` and reference `"$VAR"`. For `with:`-bound values, route through `.github/composite-actions/shared/sanitize-input/action.yml`. Safe contexts needing no change: `if:`, non-`run` `with:`, `name:`, `uses:`, `working-directory:`, `concurrency`.
- `security.missing-user` — Dockerfiles need a non-root `USER` **after** `COPY`, **before** `CMD`. Both ESPN Dockerfiles comply (`USER node` at `:11` / `:8`).

**Monitoring:** *"A **Datadog monitor** watches for SCRAAP finding regressions on `main` (GCIEX-9679)."* (`docs/security/AGENTS.md:91`) — defined outside this repo.

---

## 9. Gotchas — ranked

### 9.1 Will bite you today

| # | Gotcha | Cite | Label |
|---|---|---|---|
| 1 | **`pnpm -F @solo/commerce-espn test:jest` uses Disney+ fixtures.** `PRODUCT=espn` is only on `coverage:jest` and the playwright scripts. Use `pnpm test:commerce:jest:espn`. | `apps/commerce/espn/package.json:21,43,50` | CONFIRMED |
| 2 | **`test:marketing-unified:playwright:headless:espn` is broken** — targets a `test:playwright:headless` script marketing ESPN doesn't define. Use `test:playwright:ui` (headed) or `test:playwright` (headless). | root `package.json:117` vs `apps/marketing-unified/espn/package.json:23-26` | CONFIRMED |
| 3 | **`@env:stage` never matches ESPN commerce RUM.** Commerce env is binary `prod`/`non-prod`; marketing passes raw `DD_ENV`. | `packages/cgi/commerce-base/next.config.js:63` vs `apps/marketing-unified/espn/next.config.js:52` | CONFIRMED |
| 4 | **Four different Datadog service names for ESPN** across RUM / APM / Jenkins / CI Visibility. Querying the wrong one returns an empty graph, not an error. | §5.7 table | CONFIRMED |
| 5 | **`metrics.yml` sends no ESPN commerce Playwright metrics** — `workflow_run` name list predates the "(Sharded)" rename and matches on exact `name:`. | `.github/workflows/metrics.yml:10-13` | CONFIRMED |
| 6 | **ESPN marketing MSW only activates on `'playwright'`**, not `'enabled'`, and there is no `dev:integration` script. | `apps/marketing-unified/espn/src/pages/_app.page.tsx:25-26` | CONFIRMED |
| 7 | **`playwright-stress-test.yml` Turbo team is a broken literal** — `--team='"$TENANT"-commerce'` sends the string `"$TENANT"-commerce`, unexpanded and unmatched. | `.github/workflows/playwright-stress-test.yml:109` | CONFIRMED |

### 9.2 Silent observability gaps

| # | Gotcha | Cite | Label |
|---|---|---|---|
| 8 | **Zero ESPN jest tests carry `@espn`** → no `test.product=espn` in Datadog CI Visibility. And ESPN commerce doesn't enable the CODEOWNERS fallback → also no `test.owner`. | §6.3 | CONFIRMED |
| 9 | **`billing.spec.ts:25` is tagged `@tap espn`** — the `@` is missing on `espn`, so `/@espn$/` never matches. It also sits inside a `test.describe.skip`. | `apps/commerce/espn/playwright/tests/signup/billing.spec.ts:19,25` | CONFIRMED |
| 10 | **ESPN marketing emits no team-indexed browser logs** — it bypasses `@solo/observe`, so `datadogLogs.init()` never runs and no `team` / `twdc.datadog_log_index` tag is set. | `apps/marketing-unified/espn/src/libs/datadog-rum.ts` vs `packages/observe/src/observe.ts:75-87` | CONFIRMED |
| 11 | **`@view.name` only normalises `/commerce`, `/identity`, `/profiles` paths.** Other ESPN commerce routes fragment across locales in RUM. | `packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx:28-33` | CONFIRMED |
| 12 | **`@view.referrer` on ESPN marketing is synthetic** — read from a `preserveReferrer` localStorage key, not the browser referrer. | `apps/marketing-unified/espn/src/libs/datadog-rum.ts:33-36` | CONFIRMED |
| 13 | **`isGlimpseEnabledAtom` fails open.** If the atom isn't hydrated it warns and treats Glimpse as **enabled**. | `packages/instrumentation/src/glimpse/atoms/is-glimpse-enabled-atom.tsx:14-23` | CONFIRMED |
| 14 | **RUM↔APM correlation breaks on non-bamgrid hosts.** `allowedTracingUrls` doesn't include ESPN-owned domains. | `datadog.tsx:86-89`, `datadog-rum.ts:31` | CONFIRMED |
| 15 | **`adobe-launch.tsx` is `istanbul ignore file`** — the data-layer population that feeds all ESPN Adobe reporting is untested. Same for `logger-with-datadog.ts`. | `.../load-analytics/adobe-launch.tsx:1`, `src/libs/logger-with-datadog.ts:1` | CONFIRMED |
| 16 | **ESPN marketing Adobe Launch hardcodes US region** (`countryCode: 'us'`, `countrycodeRegion: 'North America'`). | `.../load-analytics/adobe-launch.tsx:30-31` | CONFIRMED |
| 17 | **`logger-with-datadog` detects log methods by `fn.name === 'LOG'`.** A rename inside `@solo/logger` silently kills trace injection. | `apps/marketing-unified/espn/src/libs/logger-with-datadog.ts:31` | CONFIRMED |
| 18 | **No scheduled Datadog audit covers ESPN** — all four footer/compliance/shield crons are Disney+ or Stitch scoped. | §4.3 | CONFIRMED |

### 9.3 Flakiness & mock/worker traps

| # | Gotcha | Cite | Label |
|---|---|---|---|
| 19 | **ESPN commerce Playwright runs `workers: 1` and shards instead**, because `next start` holds a single MSW singleton per runner. Do not raise `workers`. | `apps/commerce/espn/playwright.config.ts:35`; `commerce-playwright-tests-sharded.yml:3-5` | CONFIRMED |
| 20 | **Turbo must be bypassed for the shard run** — a cache hit replays logs without regenerating the blob and breaks `merge-reports`. | `commerce-playwright-tests-sharded.yml:164-169` | CONFIRMED |
| 21 | **ESPN marketing PW config has no `blob` reporter** → it cannot ever be sharded/merged. | `apps/marketing-unified/espn/playwright.config.ts:29-34` | CONFIRMED |
| 22 | **`jest.fail-on-console.ts` silences four noise classes**, including React Query v3 "not wrapped in act" (GCIEX-11152) and `ReactDOMTestUtils.act` (GCIEX-10291) — so **genuine act warnings in ESPN tests are invisible**. | `apps/commerce/espn/src/test/setup/jest.fail-on-console.ts:11-16,22-28,34-45,51-61` | CONFIRMED |
| 23 | **`asyncUtilTimeout` is raised to 5000ms globally** in ESPN commerce jest to accommodate SDK init network calls — this masks slow-render regressions. | `apps/commerce/espn/src/test/setup/jest.setup-msw.ts:54-56` | CONFIRMED |
| 24 | **HTTPS is disabled in both ESPN Playwright configs** pending WEB-30985; both set `ignoreHTTPSErrors: true`. Local HTTPS-only bugs won't reproduce in CI. | `apps/commerce/espn/playwright.config.ts:11-13`; `apps/marketing-unified/espn/playwright.config.ts:3-5` | CONFIRMED |
| 25 | **Malformed import in ESPN commerce PW fixtures** — `from '/../../browser-mocks/browser-handlers'` (leading slash). | `apps/commerce/espn/playwright/support/fixtures.ts:15` | CONFIRMED |
| 26 | **ESPN commerce browser mocks still load ALL tenants' handlers** (`[...espnBrowserHandlers, ...browserHandlers]`) — `TODO WEB-31113`. Cross-tenant handler collisions are possible. | `apps/commerce/espn/src/test/components/espn-browser-mocks.tsx:16-22` | CONFIRMED |
| 27 | **`install-dependencies` composite omits `--frozen-lockfile`** — CI can silently drift from `pnpm-lock.yaml`. (`footer-playwright.yml:35` does use it.) | `.github/composite-actions/shared/install-dependencies/action.yml:20` | CONFIRMED |
| 28 | **Cert-freshness check is a broken pipe** — greps for `local.qa-disney.api.edge.bamgrid.com` piped into a grep for `local.plus.espn.com`; can't match both. Stale ESPN certs may go undetected. | `scripts/lib/configure/certificates.sh:12` | CONFIRMED |
| 29 | **Marketing ESPN README contradicts itself** on the local domain — `local.plus.espn.com` at `:29` vs *"`local.espn.com` for local development"* at `:136`. `package.json:19` says `local.plus.espn.com`. | `apps/marketing-unified/espn/README.md:29,136` | CONFIRMED |

### 9.4 ESPN test-coverage deficit (CONFIRMED)

| Package | jest files | playwright specs |
|---|---|---|
| `apps/commerce/espn` | **20** (≈15 real, 5 are MSW infra) | **19** |
| `apps/commerce/hulu` | 59 | 21 |
| `apps/commerce/disneyPlus` | 60 | 88 |
| `apps/marketing-unified/espn` | **70** | **4** |
| `apps/marketing-unified/hulu` | 71 | 9 |
| `apps/marketing-unified/disneyplus` | 305 | 28 |
| `packages/cgi/data-interface-espn` | **12** | 0 |
| `packages/cgi/data-interface-hulu` | 21 | 0 |
| `packages/cgi/data-interface-disney` | 32 | 0 |
| `packages/cgi/commerce-base` | 1326 | 0 |

The 100% threshold makes this less alarming than it looks — but it means **ESPN's absolute surface under test is small**, and the ESPN commerce Playwright coverage gate is only **10%** (`commerce-pr-checks-espn-sharded.yml:18`).

Skipped tests in ESPN — all 6, complete list:
```
apps/commerce/espn/playwright/tests/signup/billing.spec.ts:19          test.describe.skip('The Billing Page', …)   <- WHOLE FILE OFF
apps/commerce/espn/playwright/tests/signup/billing.spec.ts:25          test.skip('@tap espn should render the page without an error banner ', …)
apps/commerce/espn/playwright/tests/flows/incoming-activation.spec.ts:258  test.skip(
apps/commerce/espn/playwright/tests/flows/incoming-activation.spec.ts:315  test.skip(
apps/marketing-unified/espn/playwright/tests/pages/olp-sp.spec.ts:91      test.skip(
apps/marketing-unified/espn/playwright/tests/pages/olp-sp.spec.ts:109     test.skip(
```
No `test.fixme`, `xit`, or `xdescribe` anywhere in ESPN. **No skipped ESPN jest tests.**

Missing relative to peers: no Storybook for ESPN commerce (Hulu has `storybook:commerce-hulu`, root `package.json:86`); no `dev:integration` for ESPN marketing; `data-interface-espn` jest config is the thinnest of the three; ESPN commerce lint debt ratchet is `--max-warnings=111` (Hulu 228, D+ 369) while both marketing apps are at 0.

---

## 10. Vocabulary

| Term | Meaning |
|---|---|
| **CUP** | Commerce Unified Platform — `packages/cgi/commerce-base` + the three commerce apps. Appears in Datadog service names (`cup_commerce/apps/espn`) and PR labels. |
| **NEXUS** | The marketing-unified platform (`apps/marketing-unified/*`). ESPN's RUM service is `espn-nexus`; its Jenkins app is `espnplus-nexus`. |
| **Fuzzbucket** | Disney's Jenkins-based CI/CD orchestrator. Owns build+deploy; GHA owns lint/test/sonar. Source of the 27-char branch limit. |
| **Mariner / Janus / Spinnaker** | Deploy mechanisms selected per pipeline (`DEPLOY_WITH_MARINER: true`, `DEPLOY_WITH_JANUS: false`, `DEPLOY_SPINNAKER_TRIGGER` in `ci/espnplus/commerce`). |
| **Glimpse / GlimpseV2** | Disney's internal event-tracking system. Taxonomy: page view → container view → interaction/input. Disney+-centric; ESPN does not author Glimpse events. |
| **SHIELD** | Glimpse schema-drift validation living in `packages/marketing/stitch/src/builders/shared/metrics/shield-validator.ts`, run by `glimpse-shield-validation.yml`. |
| **HITS** | A Disney tracking system used by Hulu (commerce + marketing). Not used by ESPN. |
| **Tealium** | Tag manager used by Hulu. Not used by ESPN. |
| **Adobe Launch** | Adobe's tag manager. Populates a data layer (`updateAdobeLaunchData`) consumed by Adobe rules. **ESPN's primary tag manager.** |
| **AppMeasurement / VisitorAPI** | The two Adobe Analytics browser scripts, S3-hosted content-hashed at `static-assets.bamgrid.com/analytics/adobe`. `window.s` = AppMeasurement; `window.visitor` = VisitorAPI. |
| **`window.s.t()` / `window.s.tl()`** | Adobe page-view track / link track. The two primitives behind `page_impression` and `user_interaction`. |
| **`rsid` / `rsidname`** | Adobe report-suite ID and display name, sourced from remote config. |
| **CoreAnalytics** | `@solo/core-analytics` — the tracker-agnostic facade. `useCoreAnalytics([...trackers])` → `.track(event, data)` fans out. |
| **`@solo/observe`** | The commerce-side Datadog wrapper (RUM + browser logs). ESPN marketing bypasses it. |
| **`Owners`** | Team enum used as the `owner` on RUM errors and `test.owner` tags. Canonical in `packages/observe/src/constants.ts`. |
| **`logIndex`** | `'commerce' \| 'identity'` — routes browser logs to a team Datadog index via `team` + `twdc.datadog_log_index` tags. |
| **`dss_branch` / `dss_filter`** | Cookies. `dss_branch` becomes RUM global context (non-prod only); `dss_filter` becomes `@usr.dssFilter`. |
| **Toodles** | The in-app debug panel. Surfaces RUM `applicationId`/`sessionId`/`service` and a per-branch Datadog logs deep link. Gated on `isDebugToolingEnabled`. |
| **Sparrow** | The remote-config/workspace service supplying per-tenant app config (incl. `analytics.adobe`). ESPN NEXUS scope = `ESPN_NEXUS`, workspace `Growth`. |
| **Flex** | The server-driven-UI BFF (`growth-life-client-api`). `NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled` points ESPN commerce at a local instance. |
| **WeaponX / Mystique** | Feature-flag services. `wpnx-enable-legacy-analytics-espn` is the ESPN legacy-Adobe flag, read via `useMystiqueFeatureFlags`. |
| **MSW** | Mock Service Worker. Toggled by `NEXT_PUBLIC_API_MOCKING` ∈ `{enabled, playwright, cypress}`. |
| **SCRAAP** | Disney's security scanner: dependency CVEs, Semgrep, secret detection, infra hardening. |
| **Mergify** | The merge-queue bot. `.github/mergify.yml` `ci_gates` is the authoritative required-checks list. |
| **`test.product` / `test.owner` / `test.env`** | The three Datadog CI Visibility tag types produced from `@tag`s in test titles. |
| **blob reporter** | Playwright's shard-mergeable report format. Required for the shard → `merge-reports` flow. ESPN commerce has it; ESPN marketing does not. |

---

## 11. Open questions

1. **Does ESPN traffic actually appear in Glimpse?** ESPN authors no Glimpse events, but the provider tree is mounted and `isGlimpseEnabledAtom` fails open. Resolve by reading `enabledAnalyticsTooling` for the `espn` tenant in remote config / Sparrow, and by querying Datadog logs for `@errorCode:INVALID_GLIMPSE_METRICS_DATA @service:web-solo-commerce-espn`.
2. **Where is `ESPNContextData` defined?** `apps/commerce/espn/src/hooks/use-set-espn-adobe-common-data.ts:6` imports it from `@solo/types/src`, but a name grep under `packages/types/src` returns nothing. Trace the alias before extending the ESPN context schema.
3. **What monitors, SLOs and synthetics exist for `web-solo-commerce-espn` and `espn-nexus`?** Nothing is defined in-repo. Enumerate via the Datadog API (`pup`) or the `Observability/observe-datadog-config` repo.
4. **Which Datadog dashboards cover ESPN?** Only one RUM Explorer link is committed (commerce, `datadog.tsx:61`). No dashboard IDs anywhere.
5. **Is `wpnx-enable-legacy-analytics-espn` currently on in prod?** It changes the ESPN billing-page analytics path entirely. Check WeaponX.
6. **Why does `growth-pr-checks-base.yml:82` use the Disney+ prefix `bix-caleen/apps/espn`** for ESPN's CI test-visibility service, when `apps-lint-and-test.yml:40` uses `espnplus-nexus`? Likely copy-paste; confirm which one Datadog dashboards key off.
7. **Is `ci.yml`'s ESPN nexus command intentionally cache-less and coverage-less** (`test` rather than `test:coverage`, no `--token`/`--team`, `ci.yml:59`), or is that drift from the disneyplus row (`:55`)?
8. **Should the 27-char rule be enforced server-side?** Today it is a local git hook only; a fresh clone without `core.hooksPath` set, or any branch created via the GitHub UI, bypasses it and fails at deploy time instead.
9. **Are the custom SCRAAP ESLint rules actually active on both ESPN apps?** They only propagate through `eslint-config-nsx` flat config; legacy `.eslintrc.*` packages are uncovered. Verify per ESPN package.
10. **What is the real ESPN Playwright happy-path coverage number?** The gate is 10%; knowing the actual figure tells you whether the threshold is slack or binding.
11. **Should ESPN be added to the footer compliance/legal-link cron audits?** All four are currently Disney+/Stitch scoped, leaving ESPN footer drift unmonitored.
12. **Is `setup-local-ssl` composite meant to be used?** It provisions the ESPN cert + hosts entry but no workflow references it — dead code, or a step toward re-enabling HTTPS in CI (WEB-30985)?
