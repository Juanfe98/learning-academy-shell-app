# ESPN Data Layer — `@solo/data-interface-espn` + backend integrations

**Repo:** `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web`
**Scope:** the ESPN data interface package, its full API surface, Flex/server-driven-UI plumbing, brand comparison, auth/session, error handling, types, mocking, vocabulary.
**Date:** 2026-08-25 · **Branch:** `main` @ `607747d290`
**Labels:** `CONFIRMED` = read directly in a cited file. `INFERRED` = deduced from surrounding code, not stated anywhere.

---

## 0. TL;DR — the five sentences that matter

1. `@solo/data-interface-espn` is tiny (**54 files, 908 non-test source lines**) and exports exactly **one** symbol: `buildDataInterface`. `packages/cgi/data-interface-espn/src/index.ts:1`
2. It is a **thin adapter over the BamTech Browser SDK** (`@js-client-sdk/sdk`). Almost every method is a one-line delegation to `sdkSession.<someApi>.<method>()`. It contains **no `fetch`, no axios, no URL construction, no GraphQL codegen**.
3. ESPN's Flex (server-driven UI) layer is a **2-method pass-through** to `sdkSession.flexApi` — byte-for-byte identical to Disney+. All 106 Flex endpoints (URL, verb, headers, timeout) are resolved by the SDK from a **remotely-fetched bootstrap config**, not from repo code.
4. ESPN's identity slice implements ~15 real Orchestration GraphQL operations and **hard-codes or `throw`s "Not implemented"** for ~50 more, because ESPN's Orchestration graph does not expose profiles/personal-info/Nielsen fields.
5. ESPN is closer to Disney+ than to Hulu: **ESPN and D+ both drive Flex through the SDK; Hulu builds Flex URLs by hand from `edgeBaseUrl`.** ESPN is D+ minus profiles.

---

## 1. Package location, file tree, and how it is built

### 1.1 Location & size — CONFIRMED

| Brand | Package | Path | Files | Non-test src LoC |
|---|---|---|---|---|
| ESPN | `@solo/data-interface-espn` | `packages/cgi/data-interface-espn` | 54 | 908 |
| Disney+ | `@solo/data-interface-disney` | `packages/cgi/data-interface-disney` | 158 | — |
| Hulu | `@solo/data-interface-hulu` | `packages/cgi/data-interface-hulu` | 95 | — |

ESPN is **~3× smaller** than Disney+ by file count. That gap is almost entirely the `identity/profiles/` and `identity/operations/` directories that exist for D+ and not for ESPN.

`package.json` facts (`packages/cgi/data-interface-espn/package.json`):
- `"main": "src/index.tsx"` / `"types": "src/index.tsx"` — **note the `.tsx` extension, but the actual file on disk is `src/index.ts`.** Nothing resolves through `main` in practice; every consumer deep-imports `@solo/data-interface-espn/src/data-interface`. GOTCHA, see §11.
- Exactly **one runtime dependency**: `es-cookie` (used only by `clean-browser-storage.ts`).
- `react-query` and `@solo/types` are **devDependencies** — the package relies on the consumer providing them (ambient global types + peer React).
- `"private": true`, version pinned at `1.0.0` — not published, consumed via `workspace:`.

### 1.2 Full file tree — CONFIRMED

```
packages/cgi/data-interface-espn/
├── .babelrc, eslint.config.js, jest.config.js, lint-staged.config.js
├── package.json, readme.md, tsconfig.json, turbo.json
└── src/
    ├── index.ts                                   # 1 line: export { buildDataInterface }
    ├── data-interface.ts                          # 34 lines: composes 5 slices
    ├── data-interface.test.tsx
    ├── flex/
    │   ├── flex-data-interface.ts                 # 19 lines  <-- ENTIRE Flex layer
    │   ├── flex-data-interface.test.tsx
    │   └── index.ts
    ├── identity/
    │   ├── identity-data-interface.ts             # 152 lines <-- the big one
    │   ├── identity-data-interface.test.tsx
    │   ├── index.ts
    │   ├── __fixtures__/
    │   │   ├── create-consent-token-error.json
    │   │   ├── create-consent-token-success.json
    │   │   └── session-info.json
    │   ├── helpers/
    │   │   ├── clean-browser-storage.ts           # logout storage purge
    │   │   ├── format-create-consent-token.ts
    │   │   └── format-session-device-id.ts
    │   └── operations/                            # one file per GraphQL op
    │       ├── index.ts
    │       ├── setup-query-function.ts            # orchestrationApi.query wrapper
    │       ├── get-orchestration-operations.ts    # Proxy-based notImplemented shim
    │       ├── accept-extra-member-invite.ts
    │       ├── check-extra-member-eligibility.ts
    │       ├── extra-member-info.ts
    │       ├── redeem-extra-invite.ts
    │       ├── validate-action-grant.ts
    │       ├── identity-consent.ts
    │       ├── get-legal-documents.ts
    │       ├── get-subscriptions.ts
    │       ├── get-account-onboarding-status.ts   # STATIC, no network
    │       ├── get-marketing-preferences.ts       # STATIC, no network
    │       └── personal-info.ts                   # STATIC, no network
    ├── payment/
    │   ├── payment-interface.ts                   # 51 lines
    │   ├── payment-interface.test.tsx
    │   └── index.ts
    ├── activations/
    │   ├── activations-data-interface.ts          # 25 lines
    │   ├── activations-data-interface.test.tsx
    │   └── index.ts
    ├── experimentation/
    │   ├── experimentation-data-interface.ts      # 10 lines
    │   ├── helpers/get-experiment-assignments.ts  # 21 lines
    │   └── index.ts
    └── test/setup-tests.ts
```

### 1.3 `buildDataInterface` — CONFIRMED

`packages/cgi/data-interface-espn/src/data-interface.ts:16-34`:

```ts
export function buildDataInterface({
  sdkSession,
  queryClient,
  observability,
}: {
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
}
```

**Five slices, flat-spread into one object.** Later spreads win on key collision (no collisions today — each slice `Pick<>`s a disjoint set of `DATA_INTERFACE` keys, which is how the type system enforces the partition). The whole thing is **synchronous and cheap** — it builds closures only, no I/O.

`SDKSession` and `FlexScreenOptions` are **ambient globals** (no import), declared in `packages/developer-experience/types/src/types/bam-browser-sdk.d.ts`. That is why the package has no `@solo/types` runtime dep for them.

### 1.4 `DATA_INTERFACE` — the cross-brand contract — CONFIRMED

Declared at `packages/developer-experience/types/src/index.d.ts:575-694`:

```ts
export type DATA_INTERFACE = {
  avatarCollections / avatarSet / getFlexScreen / flexExecution /
  selfServiceDeleteWithActionGrant / getAccountOnboardingStatus /
  isLoggedIn / logout / getPersonalInfo / getUserDetails /
  getMarketingPreferences / getSubscriberInfo / getSubscriptions /
  createCardPaymentMethod / createApplePayPaymentMethod? /
  updatePaymentMethod / validateLicensePlate / activateLicensePlate /
  getAccountNielsenMeasurementConsent / getCompleteAccountInfo /
  getGlobalizationData / updateAccountNielsenMeasurementConsent /
  profileViewData / getIdentityConsent / redirectRulesQuery /
  getLegalDocuments / profilesRedirectRulesData / getIdentityDetails /
  updatePaymentCardByIdentityIdMethod / updateCardInfoForPurchaseMethod /
  redeemActivationToken / getExperimentAssignments
} & OrchestrationOperations;   // ~90 more methods, index.d.ts:280-446
```

**This is the key architectural fact:** `DATA_INTERFACE` is a **single flat union of every method any brand needs** — there is no abstract base class, no interface hierarchy, no per-brand narrowing at the type level. Every brand must satisfy the *whole* type. ESPN satisfies it by supplying `notImplemented` throwers and a `Proxy` for the long tail (§3.2, §5).

`OrchestrationOperations` is ~90 methods, overwhelmingly **profiles**-shaped (`createProfile`, `switchProfile`, `updateProfileMaturityRating`, `enableProfileKidsMode`, `retrieveProfilePinWithActionGrant`, `linkHuluAccount`, …). `packages/developer-experience/types/src/index.d.ts:280-446`.

### 1.5 `dataInterfaceAtom` + `useHydrateDataInterface` — CONFIRMED

`packages/cgi/commerce-base/src/common/data-interface/atoms.ts:1-25` (entire file):

```ts
const baseDataInterfaceAtom = atom<DATA_INTERFACE | null>(null);

export const dataInterfaceAtom = atom((get) => {
  const dataInterface = get(baseDataInterfaceAtom);
  if (dataInterface === null) {
    throw new Error('The data interface must be hydrated before usage.');
  }
  return dataInterface;
});

export function useHydrateDataInterface(dataInterface: DATA_INTERFACE) {
  useHydrateAtoms([buildInitialValue(baseDataInterfaceAtom, dataInterface)]);
}
```

A **read-only derived atom that throws** if unhydrated — so a component that reads `dataInterfaceAtom` outside the hydration subtree fails loudly rather than silently no-op'ing. Exported from `packages/cgi/commerce-base/src/common/data-interface/index.ts:1`.

### 1.6 The ESPN hydration chain — CONFIRMED

```
apps/commerce/espn/pages/_app.page.tsx:98-100
  <JotaiProvider> → <QueryProvider> → getLayout()
        │
        ▼
apps/commerce/espn/src/layout/espn-layout.tsx:120-137
  <HydrateESPNDeviceAttributeProvider>        # espn_aid cookie → SDK device id
        │
        ▼
apps/commerce/espn/src/layout/hydrate-data-interface.tsx:29-35
  buildESPNDataInterface({ sdkSession, queryClient, observability })
  useHydrateDataInterface(dataInterface)
        │
        ▼
packages/cgi/commerce-base/src/**  →  useAtomValue(dataInterfaceAtom)
```

`apps/commerce/espn/src/layout/hydrate-data-interface.tsx` has **two variants** behind a flag (`TODO: GCIEX-4196 - Remove when gating validated in production`, line 43):

| Variant | Gating |
|---|---|
| `HydrateDataInterfaceOriginal` | gates on SDK readiness only |
| `HydrateDataInterfaceOptimized` | *additionally* gates children on `useDictionaryQuery()` success, to prevent `MISSING_CYPHER_KEY_IN_DICTIONARY` errors caused by server-side dictionary optimization (lines 116-119) |

On dictionary error the optimized path **throws with `{ cause: error }`** (lines 102-109) rather than degrading.

A second, legacy hydration site exists at `apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx:166-180` (CUP V1 pages). **GOTCHA:** two layouts, two hydration paths — see §11.

Also note `packages/cgi/commerce-base/src/test/testing-library.tsx:4-7` imports **all three** brands' `buildDataInterface` so shared tests can run per-tenant.

---

## 2. Full API surface, grouped

Legend: **SDK** = delegates to a `sdkSession.*` API; **GQL** = Orchestration GraphQL string in this repo; **STATIC** = returns a hard-coded object, no network; **THROW** = `throw new Error('Not implemented')`; **PROXY** = falls through `buildOperations`' `notImplemented` proxy.

### 2.1 Flex / server-driven UI (2 methods) — CONFIRMED

`packages/cgi/data-interface-espn/src/flex/flex-data-interface.ts:8-19` — **the entire file**:

```ts
export const getFlexDataInterface = (
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
};
```

| Method | Kind | Underlying | Signature |
|---|---|---|---|
| `getFlexScreen<T>` | SDK | `flexApi.getScreen` | `(FlexScreenOptions) => Promise<FlexResponse<T>>` |
| `flexExecution<T>` | SDK | `flexApi.execute` | `(FlexExecutionOptions) => Promise<FlexExecutionResponse<T>>` |

### 2.2 Payments (4 methods) — CONFIRMED

`packages/cgi/data-interface-espn/src/payment/payment-interface.ts`

| Method | Kind | Underlying SDK call | Notes |
|---|---|---|---|
| `createCardPaymentMethod` | SDK | `commerce.paymentCardApi.createCardPaymentMethod(payload, region?)` | coerces `isShared` to a real boolean via `Boolean(...)`; returns `paymentMethodId: string`. Line 22-35 |
| `updatePaymentMethod` | SDK | `commerceApi.updatePaymentMethod(payload)` | same `Boolean(isShared)` coercion. Line 36-43 |
| `updatePaymentCardByIdentityIdMethod` | SDK | `walletApi.updatePaymentCardByIdentityId(options)` | Line 44-46 |
| `updateCardInfoForPurchaseMethod` | SDK | `walletApi.updateCardInfoForPurchase(options)` | Line 47-49 |

**ESPN does NOT implement `createApplePayPaymentMethod`** — it's `?`-optional in `DATA_INTERFACE` (`index.d.ts:651`), so ESPN simply omits it. INFERRED: Apple Pay is not an ESPN web payment method.

Underlying HTTP (from the SDK bootstrap config, §4.3):
- `createCardPaymentMethod` → `POST /tokens/sps` (region-suffixed variants: `createPaymentMethodUsEastOne/Two`, `UsWestTwo`, `EuWestOne`, `EuCentralOne`)
- `updatePaymentMethod` → `PATCH /wallet/{paymentType}/{paymentMethodId}`
- `updatePaymentCardByIdentityId` → `PATCH /id/payment-cards/{paymentMethodId}`
- `updateCardInfoForPurchase` → `PATCH /id/prepare/payment-cards/{paymentMethodId}`

### 2.3 Activations (1 method) — CONFIRMED

`packages/cgi/data-interface-espn/src/activations/activations-data-interface.ts:15-23`:

```ts
redeemActivationToken: <T extends AppTenants = AppTenants.espn>({
  providerId, token,
}: IncomingActivationPageParameters): Promise<RedeemActivationTokenResponseFactory<T>> =>
  sdkSession.purchaseApi.redeemToken(providerId, token) as Promise<
    RedeemActivationTokenResponseFactory<T>
  >,
```

The **default type param differs per brand** (`AppTenants.espn` here; `AppTenants.disneyPlus` in the `DATA_INTERFACE` declaration at `index.d.ts:687`). This matters because `RedeemActivationTokenResponseFactory` returns `RedeemActivationTokenResponse | null` for Hulu and non-nullable otherwise (`packages/developer-experience/types/src/types/activations/redeem-incoming-activation-token.ts:17-21`). So **ESPN callers get a non-nullable response type**; Hulu callers must null-check.

Note the `as Promise<...>` cast — the SDK's declared `redeemToken` return is `RedeemTokenAPIResult` (`bam-browser-sdk.d.ts:228-231`), so this is an **unchecked widening**. INFERRED: response shape is trusted, not validated.

### 2.4 Experimentation (1 method) — CONFIRMED

`packages/cgi/data-interface-espn/src/experimentation/helpers/get-experiment-assignments.ts:1-21`

`getExperimentAssignments()` reads `(await sdkSession.getSessionInfo()).experiments` and **normalises array-or-record into a record keyed by `experiment.featureId`**. No network call of its own — it piggybacks on the session. Compare: Hulu has `experimentation/helpers/parse-spearmint-experiments.ts` (a completely different upstream — Spearmint).

### 2.5 Identity — real GraphQL operations (7) — CONFIRMED

All go through `setupQueryFunction` → `sdkSession.orchestrationApi.query()` → `POST /v1/public/graphql`.

| `DATA_INTERFACE` method | GraphQL op name | Type | File |
|---|---|---|---|
| `getIdentityConsent` (logged-in branch) | `createConsentToken` | mutation | `identity/operations/identity-consent.ts:9-18` |
| `getLegalDocuments` | `legalDocuments` | query | `identity/operations/get-legal-documents.ts:8-16` |
| `getSubscriptions` | `getSubscriptions` | query | `identity/operations/get-subscriptions.ts:9-39` |
| `acceptExtraMemberInvite` | `acceptExtraMemberInvite($input: AcceptExtraMemberInviteInput!)` | mutation | `identity/operations/accept-extra-member-invite.ts:9-15` |
| `redeemExtraMemberInvite` | `redeemExtraMemberInvite($input: RedeemExtraMemberInviteInput!)` | mutation | `identity/operations/redeem-extra-invite.ts:9-18` |
| `checkExtraMemberEligibility` | `checkExtraMemberEligibility($email: String!)` | query | `identity/operations/check-extra-member-eligibility.ts:9-16` |
| `extraMemberInfoQuery` | `extraMemberInfoQuery` | query | `identity/operations/extra-member-info.ts:9-30` |
| `validateActionGrant` | `validateActionGrant($actionGrant: String!)` | query | `identity/operations/validate-action-grant.ts:9-16` |

The `getSubscriptions` query is the most product-revealing one — `packages/cgi/data-interface-espn/src/identity/operations/get-subscriptions.ts:9-39`:

```graphql
query getSubscriptions {
  me { identity { subscriber { subscriptions {
    cancellation { type }
    id
    partner
    product { sku name }
    source { sourceType sourceProvider subType }
    stacking { status }
    state
    term { expiryDate }
  } } } }
}
```

Note the post-processing at lines 53-60: **if `errors` is non-empty it returns `{ data: null, errors, extensions }`; otherwise it flattens to the bare `subscriptions` array (defaulting to `[]`).** So callers get an array, not the graph envelope.

### 2.6 Identity — SDK-backed (3) — CONFIRMED

| Method | Implementation | File:line |
|---|---|---|
| `isLoggedIn` | `sdkSession?.isAuthorized('bamIdentity')` | `identity-data-interface.ts:76` |
| `getSubscriberInfo` | `sdkSession.subscriptionApi.getSubscriberInfo()`; falls back to `{ subscriberStatus: 'unknown', subscriptions: [], doubleBilled: false, overlappingSubscription: false }` when no session | `identity-data-interface.ts:122-131` |
| `logout` | **no graph call** — `sdkSession.reset()` → `queryClient.invalidateQueries(['isLoggedInQuery', true])` → `cleanBrowserStorage()` → `true` | `identity-data-interface.ts:90-99` |

`logout` carries an explicit code comment: *"Utilize the `sdkSession.reset()` method as the logout graph call does not exist on ESPN+"* (`identity-data-interface.ts:91`). This is the single clearest statement of the ESPN↔D+ graph divergence in the package.

`getSubscriberInfo` → `GET /v2/subscribers` (bootstrap config, §4.3).

### 2.7 Identity — STATIC / hard-coded (5) — CONFIRMED

These are the interesting ones — **ESPN returns fake-but-valid graph envelopes to keep shared commerce-base flows from branching.**

| Method | Returned value | Why (from the code comment) | File |
|---|---|---|---|
| `getMarketingPreferences` | `eligibleForOnboarding: true, isOnboarded: true` | *"We hard-code ESPN users' marketing preferences to ensure that they are not taken through our review-and-accept page."* | `operations/get-marketing-preferences.ts:18-25` |
| `getPersonalInfo` | `eligibleForCollection: 'NotEligible', requiresCollection: []` | *"ESPN personal info collection is handled by OneID and not the Orchestration API."* | `operations/personal-info.ts:18-26` |
| `getAccountOnboardingStatus` | `{ activeProfile: null, profiles: [] }` + a fully-shaped `extensions` block | *"ESPN does not support content onboarding via the Orchestration API, so we return a no-op response indicating no onboarding is required."* | `operations/get-account-onboarding-status.ts:32-39` |
| `getUserDetails` | `{ data: { me: { account: { attributes: { email: '' } } } } }` | `// TODO ACP-701: Update the getUserDetails method in the data interface for ESPN and D+ to use meQuery` | `identity-data-interface.ts:77-89` |
| `getDefaultProfileData` | `{ profile: { id: 'default_profile', attributes: { parentalControls: { isPinProtected: false } } } }` | (no comment) — synthesises a single fake profile so profile-aware shared code doesn't crash | `operations/get-orchestration-operations.ts:46-58` |
| `selfServiceDeleteWithActionGrant` | `Promise.resolve({} as ...)` | `// No-op function, used only on D+` | `identity-data-interface.ts:139-140` |

**This is the dominant ESPN design pattern:** rather than gating every shared component on tenant, the data layer lies convincingly. GOTCHA — see §11.

`getIdentityConsent` is a **hybrid**: logged-in → real `createConsentToken` mutation; logged-out → `formatSessionDeviceId(await sdkSession.getSessionInfo())`, which synthesises `{ consent: { id: sessionInfo.device.id, idType: 'DeviceId' } }`, or an error envelope with code `MISSING_SESSION_INFO` when session info is absent (`identity-data-interface.ts:103-111`, `identity/helpers/format-session-device-id.ts:3-33`).

### 2.8 Identity — explicit THROW (8) — CONFIRMED

`packages/cgi/data-interface-espn/src/identity/identity-data-interface.ts`:

| Method | Line | Message |
|---|---|---|
| `avatarCollections` | 70-72 | `Not implemented` (cast through `notImplemented`) |
| `avatarSet` | 73-75 | `Not implemented` |
| `getAccountNielsenMeasurementConsent` | 100-102 | `Not implemented` |
| `updateAccountNielsenMeasurementConsent` | 141-143 | `Not implemented` |
| `redirectRulesQuery` | 112-114 | `Not implemented` |
| `getIdentityDetails` | 115-117 | `Not implemented` |
| `profilesRedirectRulesData` | 133-135 | `Not implemented` |
| `profileViewData` | 136-138 | `Not implemented` |
| `validateLicensePlate` | 144-146 | `Implementation not yet created for tenant` |
| `activateLicensePlate` | 147-149 | `Implementation not yet created for tenant` |

Note the **two different messages** — `Not implemented` (will never be) vs `Implementation not yet created for tenant` (planned). INFERRED, but the wording is deliberate.

### 2.9 Identity — PROXY fall-through (~80) — CONFIRMED

`packages/cgi/data-interface-espn/src/identity/operations/get-orchestration-operations.ts:21-35`:

```ts
export function buildOperations<T extends Record<string, unknown>>(
  impl: Partial<T>
): T {
  return new Proxy(impl as T, {
    get(target, property: string | symbol) {
      const value = target[property as keyof T];
      if (!value) {
        return notImplemented;   // async () => { throw new Error('Not implemented'); }
      }
      return value;
    },
  });
}
```

ESPN supplies **6 real entries** to `buildOperations` (lines 40-63): `acceptExtraMemberInvite`, `checkExtraMemberEligibility`, `extraMemberInfoQuery`, `getDefaultProfileData` (static), `redeemExtraMemberInvite`, `validateActionGrant`. **Every one of the other ~84 `OrchestrationOperations` members resolves to `notImplemented` at property-access time.**

**GOTCHA:** because the shim is a `Proxy` and not a literal object, `Object.keys(dataInterface)` / `'someOp' in dataInterface` / spread do **not** enumerate the missing ops. A `...getOrchestrationOperations(...)` spread at `identity-data-interface.ts:150` copies only the 6 real keys out of the proxy — the proxy's `notImplemented` fallback is **lost** on spread. INFERRED but high-confidence, and it means accessing e.g. `dataInterface.switchProfile` yields `undefined` (a `TypeError: not a function`) rather than the nice `Not implemented` error. Worth verifying — see §12 Open Questions.

### 2.10 Coverage of the contract — summary table

| `DATA_INTERFACE` group | Total members | ESPN real | ESPN static | ESPN throw/proxy |
|---|---|---|---|---|
| Flex | 2 | 2 | 0 | 0 |
| Payments | 5 | 4 | 0 | 1 (omitted optional) |
| Activations | 1 | 1 | 0 | 0 |
| Experimentation | 1 | 1 | 0 | 0 |
| Subscriptions / account | 3 | 2 | 1 | 0 |
| Identity / consent / legal | ~12 | 3 | 4 | 8 |
| `OrchestrationOperations` | ~90 | 5 | 1 | ~84 |

---

## 3. Flex / server-driven UI

### 3.1 How ESPN reaches Flex — CONFIRMED

ESPN does **not** construct Flex URLs. The chain is:

```
commerce-base component
  └─ useAtomValue(dataInterfaceAtom).getFlexScreen({ key, version, queryParams, headers, method })
       └─ sdkSession.flexApi.getScreen(options)          # @js-client-sdk/sdk@35.3.17
            └─ SDK looks up options.key in services.flex.client.endpoints
                 └─ substitutes {version} + {accessToken} into href/headers
                      └─ HTTPS to https://<env>-espn.api.edge.bamgrid.com/screens|execution/<version>/<path>
```

The endpoint table lives in the **SDK bootstrap config, fetched at runtime** from
`https://client-sdk-configs.bamgrid.com/bam-sdk/v7.0/espn-a9b93989/browser/v<SDK_VERSION>/<os>/<browser>/<env>.json`
(URL pattern confirmed in `packages/cgi/commerce-base/src/common/context/__browser-mocks__/handlers.ts:83-125`; local override base `https://local.client-sdk-configs.bamgrid.com/bam-sdk` at `packages/cgi/sdk-session/src/sdk-atoms.ts:188`).

The repo keeps a **checked-in snapshot** of that config for tests:
`packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json` and `.../espn/macosx-chrome-preprod.json`.

**Answering the brief's question directly:** in cgi-web, "Flex" is reached as the **`services.flex` client of the Edge gateway** (`*-espn.api.edge.bamgrid.com`), not as a direct HTTP call to `growth-life-client-api`. `growth-life-client-api` is the server-side implementation behind that Edge route (per prior team knowledge / repo memory), but **no cgi-web ESPN source file names `growth-life-client-api`** — CONFIRMED by grep. The only local-Flex hook is the env var `NEXT_PUBLIC_FLEX_LOCAL_SERVICE`, declared in `apps/commerce/espn/turbo.json:5` and used by `apps/commerce/espn/package.json:31` (`dev:local-flex`); **the code that consumed it was deleted in June 2025 (commit `7a74df8904`)**, so that script is currently a no-op for Flex redirection. See §9.3 and §12.

### 3.2 Request/response shapes — CONFIRMED

`packages/developer-experience/types/src/types/bam-browser-sdk.d.ts:153-201`:

```ts
declare type FlexScreenOptions =
  | { key: string; version: string; queryParams?: Record<string, unknown>;
      requestBody?: Record<string, unknown>; headers?: Record<string, string>;
      method?: HttpMethod; }
  | { /** The must be `unknown` to execute the configOverride. */
      key: 'unknown'; version: string; queryParams?; requestBody?; headers?;
      method?: HttpMethod;
      configOverride?: (options: SDKEndpoint) => SDKEndpoint; };

declare type FlexExecutionOptions = FlexScreenOptions;

declare interface FlexResponse<T> {
  content: T;
  screenType: string;
  templateId: string;      // <-- the template id the brief asked about
  initialFocus: string;
  metricsData: Record<string, never>;
}

declare interface FlexExecutionResponse<T> {
  success: boolean;
  successData?: T;
  errorData?: Record<string, any>;
  metricsData: Record<string, never>;
}
```

Key points:
- **`templateId` is a *response* field, not a request field.** You never send a template id; Flex decides which template to render and tells you which one it chose. `content` is the template payload; commerce-base components are written against `Flex*ContentModel` / `Flex*DataModel` TypeScript types (e.g. `FlexChangePaymentDataModel`, `FlexGiftCardValueContentModel`, `FlexWalletModalContentModel`).
- **Screens vs executions:** `getScreen` → `/screens/{version}/...`, returns `FlexResponse<T>` (UI to render). `execute` → `/execution/{version}/...`, returns `FlexExecutionResponse<T>` (an action result, `success`+`successData`/`errorData`).
- **The `key: 'unknown'` + `configOverride` escape hatch** lets a caller hit a path the SDK config doesn't know about. Live example — `packages/cgi/commerce-base/src/transactional/activation/hooks/use-activation-success-page-data.ts:77-92`:

```ts
const activationSuccessFlexScreenOptions: FlexScreenOptions =
  isSDKEnabled && sdkSession && providerId
    ? { key: 'unknown', queryParams: flexQueryParams, version: 'v1',
        configOverride: (config: SDKEndpoint) => ({
          ...config, href: `${config.href}/subscription/activation-success`,
        }) }
    : { key: 'activationSuccess', queryParams: flexQueryParams, version: 'v1' };
```
with the comment *"this is a temporary config override until the disney endpoint is live and the endpoint is added to data interface by the SDK team"* (line 74-75). Note: ESPN's config **does** have `incomingActivation` but **not** `activationSuccess` — see §3.5.

### 3.3 Headers sent — CONFIRMED

Three layers stack:

**(a) SDK common headers** — `packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json`, `commonHeaders`:
```json
{ "X-Application-Version": "{applicationVersion}",
  "X-BAMSDK-Client-ID":    "espn-a9b93989",
  "X-BAMSDK-Platform":     "{SDKPlatform}",
  "X-BAMSDK-Version":      "{SDKVersion}" }
```
`commonValues: { "platformId": "browser" }`.

**(b) Per-endpoint headers** (every Flex endpoint in the ESPN config):
```json
{ "Accept": "application/json; charset=utf-8",
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json; charset=utf-8" }
```
`timeout: 15`, `ttl: 0`, `templated: true`. **The SDK injects `Authorization` — application code never sets it.**

**(c) Caller-supplied headers** via `FlexScreenOptions.headers`. There is exactly one helper for this — `packages/cgi/commerce-base/src/common/constants/subscription-sources.ts:43-61`:

```ts
export const generateFlexHeaders = ({ salesPlatform }: { salesPlatform?: string }) => {
  const result: Record<string, string> = {};
  if (salesPlatform) { result['X-Bamtech-Sales-Platform'] = salesPlatform; }
  // If there are no headers set, we return undefined to send no headers at all
  if (Object.keys(result).length === 0) { return; }
  return result;
};
```

So the **only** app-level Flex header today is `X-Bamtech-Sales-Platform`, "sent to Flex as a header for it to drive eligibility and content requirements" (comment, lines 39-41). Its value comes from `useSalesPlatform()` (lines 29-34): the `salesPlatform` query param, falling back to the License Plate `deviceProfile`.

**Region / partner / device are NOT sent as Flex headers by cgi-web.** They are implicit: region from the session/token (`token.region`, `sdk-atoms.ts:414`), device from the SDK device grant (`espn_aid`, §5.3), partner from the client id (`espn-a9b93989`). INFERRED — no `x-region`/`x-partner` header is set anywhere in ESPN paths.

Query params go through `generateFlexQueryParams` (`subscription-sources.ts:68-82`), which strips `undefined`/`''` and returns `undefined` for an empty object.

Correlation id: registered on the SDK session, not per-request — `registerCorrelationID(newSession)` at `packages/cgi/sdk-session/src/sdk-atoms.ts:384`, via `lib/glimpse-session.ts`. The SDK exposes `LoggingAPI.registerCorrelationId(id, forProvider)` (`bam-browser-sdk.d.ts:203-205`). `correlationId` is also a sessionStorage key purged on logout (`clean-browser-storage.ts:29`).

### 3.4 The full ESPN Flex endpoint inventory — CONFIRMED

**106 endpoints** in `services.flex.client.endpoints`, baseUrl `https://qa-espn.api.edge.bamgrid.com` (D+ has 119 at `qa-disney.api.edge.bamgrid.com`). Grouped:

**Screens — account (`GET /screens/{version}/account/...`)**
`accountDetails` (`/account-details`) · `addOnSuccess` (`/add-on-success`) · `billingHistory` · `cancelFlow` (`/cancel`) · `cancelSuccess` · `changePayment` · `consentLedger` · `deviceAccountDetails` · `deviceOutOfHouseholdCTA` · `giftCardSuccess` · `interactivePayment` · `lrBillingCadence` · `lrPlanSwitch` · `lrPlanSwitchSuccess` · `manageAccess` · `manageExtraMember` (`/manage-em`) · `offDevice` · `planSwitch` · `planSwitchLedger` · `planSwitchSuccess` · `reviewPayment` · `subscriptionDetails` · `subscriptionSummary`
Plus `POST` screens: `deviceOutOfHousehold`, `planSwitchLedgerSecondary`

**Screens — subscription (`/screens/{version}/subscription/...`)**
`addonSelector` (POST `/addon-selector`) · `deviceIps` · `devicePaymentConfirm` · `devicePlanSelect` · `devicePlanSwitch` · `deviceReacquisition` (+ `deviceReacquisitionSecondary` POST) · `deviceSelectBillingCadence` · `deviceSelectSuccess` · `deviceSignupPaywall` (POST → `/device-select-billing-cadence`) · `deviceSuccess` · `deviceSwitchBillingCadence` · `deviceSwitchPaywall` (POST) · `deviceSwitchSuccess` · `extraMemberSelfRemoval` · `ips` · `restartLedger` · `restartSuccess` · `subscriptionPause` · `subscriptionPauseSuccess` · `subscriptionPreview` (+ `subscriptionPreviewSecondary` POST) · `subscriptionReacquisition` · `subscriptionReview` · `subscriptionSuccess` · `subscriptionSwitchSuccess` (→ `/plan-switch-success`) · `unifiedWallet` · `unifiedWalletList`

**Screens — landing (`/screens/{version}/landing/...`)**
`acceptInvite` · `deviceOutOfHouseholdInterstitial` (POST) · `giftCardRedemption` · `giftCardValue` · **`incomingActivation` ⟵ ESPN-ONLY** · `landingPlans` (`/plans`) · `redeemPromoCode` · `welcome`

**Screens — payments / consent / generic**
`apmPaymentMethod` (`/payments/apm/payment-method`) · `consentManagementBanner` (POST) · `consentManagementPreferenceCenter` (POST) · `consentManagementVendors` (POST) · `consentManagementVendorsDetails` (POST) · `message` (POST `/screens/{version}/message`) · `default` (GET `/screens/{version}`)

**Executions — subscription (`PUT /execution/{version}/subscription/...`)**
`cancelSubscription` (`/cancel-subscription`) · `subscriptionCancel` (`/cancel`) · `consumeExtraMember` (`/extra-member/consume-slot`) · `removeExtraMember` (`/extra-member/remove`) · `executionSubscriptionPause` (`/pause`) · `executionSubscriptionUnpause` (`/unpause`) · `retryPaymentCount` · `retryStatus` · `subscriberCohort` (`/subscriber-cohorts`) · `subscriptionOptIn` (`/opt-in`) · `subscriptionRestart` (`/restart`) · `subscriptionSignup` (`/signup`) · `subscriptionSwitch` (`/switch`) · `subscriptionVerify` (`/verify`) · `subscriptionZipcode` (`/zipcode`)

**Executions — payments (`PUT /execution/{version}/payments/...`)**
`executionChangePayment` (`/change-payment`) · `executionGiftCardValue` (`/gift-card/gift-card-value`) · `giftCardCreatePaymentMethod` (`/gift-card/create-payment-method`) · `subscriptionRedeemGiftCard` (`/gift-card/redeem-gift-card`) · `idealCreatePaymentMethod` · `klarnaCreatePaymentMethod` · `mercadoPagoCreatePaymentMethod` · `paypalClientToken` · `paypalCreatePaymentMethod` · `threeDsComplete` (`/credit-card/3ds-complete`) · `threeDsDdcJwt` (GET `/credit-card/3ds-ddcJwt`) · `threeDsValidate` · `verifyPaymentMethod`

**Executions — other**
`executionRedeemPromoCode` (`/offers/redeemPromoCode`) · `getThirdPartySkus` (`/offers/get-third-party-skus`) · `verifyOrder` (`/orders/verify-order`) · `walletBulkConsent` (`/wallet/bulk-consent`) · `walletRemoveCard` (**POST** `/wallet/remove-card`) · `loginRedirect` (`/account/login-redirect`) · `deviceOutOfHouseholdUpdate` (`/account/device-out-of-household/update`) · `consentManagementSaveLogConsent` · `execution` (PUT `/execution/{version}`) · `genericExecution` (PUT `/execution/{version}/generic`)

### 3.5 ESPN vs Disney+ Flex key deltas — CONFIRMED

**ESPN-only key (1):** `incomingActivation` → `GET /screens/{version}/landing/incoming-activation`

**Present for Disney+, absent for ESPN (14):**
`apmCheckout`, `cancelSubscriptionUnauthenticated`, `comcastPaymentMethod`, `comcastSufConsentTemplate`, `comcastSwitchConsentTemplate`, `deviceRestartLedger`, `enrollPaymentMethod`, `landingCadence`, `landingUpgrade`, `optimizeSubscription`, `unauthenticatedCancel`, `unauthenticatedCancelSuccess`, `verifySegment`, `verifySegmentExecution`

Reading: **ESPN has no Comcast/MVPD payment-method templates, no unauthenticated cancel flow, no segment verification, no upgrade landing.** Note also that `activationSuccess` is absent from *both* — which is exactly why `use-activation-success-page-data.ts` reaches for the `key: 'unknown'` + `configOverride` hack.

**Service-level delta:** D+'s bootstrap config has two services ESPN's lacks — `config` and `consent`. ESPN has no services D+ lacks. (ESPN nonetheless gets consent *screens* via Flex `consentManagement*` keys.)

### 3.6 Which ESPN screens are Flex-driven vs locally rendered — CONFIRMED (structure), INFERRED (per-page mapping)

ESPN commerce has **79 `*.page.tsx` routes** under `apps/commerce/espn/pages/`. The pages are **thin route shells** — 56 of them import from `@solo/commerce-base/src/common/layouts` and 42 from `common/lib/is-route-enabled`; the actual page bodies come from `commerce-base` (`signup/pages`, `payments/gift-card/pages`, `retention/cancel`, `account/change-subscription`, `transactional/activation/pages`, `profiles/pages/...`).

**Flex-driven** (a `commerce-base` page/hook calls `getFlexScreen`/`flexExecution`; confirmed callsites listed below):

| ESPN route(s) | Flex key(s) | Callsite |
|---|---|---|
| `commerce/change-payment/index` | `changePayment`, `executionChangePayment` | `commerce-base/src/payments/change-payment/pages/change-payment-page.tsx:101` |
| `commerce/gift/value` | `giftCardValue`, `executionGiftCardValue` | `payments/gift-card/pages/gift-card-value-page/gift-card-value-page.tsx:55` |
| `commerce/gift/review` | (gift review screen) | `payments/gift-card/pages/gift-card-review-page/gift-card-review-page.tsx:82` |
| `commerce/gift/success` | `giftCardSuccess` | `payments/gift-card/pages/gift-card-success-page/gift-card-success-page.tsx:62` |
| `commerce/gift/index` | `giftCardRedemption` | `payments/gift-card/pages/gift-card-redeem-page/gift-card-redeem-page.tsx:46` |
| `commerce/payment-processing/index` | `apmPaymentMethod`, `interactivePayment` | `payments/apm/pages/interactive-payment-page/interactive-payment-page.tsx:149` |
| `commerce/cancel/*`, `commerce/pause/*` | `cancelFlow`, `cancelSuccess`, `subscriptionCancel`, `executionSubscriptionPause/Unpause`, `subscriptionPause`, `subscriptionPauseSuccess` | `retention/cancel/queries/*.tsx`, `retention/pause/queries/*`, `retention/pause/hooks/use-get-pause-success.ts:30`, `retention/pause/pages/pause-page/pause-page.tsx:39` |
| `commerce/restart-subscription/*` | `subscriptionRestart`, `restartLedger`, `restartSuccess` | `retention/restart-pending-cancel/queries/use-restart-subscription-mutation.ts:22`, `retention/cancel/queries/flex-single-subscription-restart.tsx:55` |
| `commerce/activate/success` | `activationSuccess` (via `key:'unknown'` override) | `transactional/activation/hooks/use-activation-success-page-data.ts:77-98` |
| wallet modal (cross-route) | `unifiedWallet`, `unifiedWalletList`, `walletBulkConsent`, `walletRemoveCard` | `payments/wallet/queries/use-flex-wallet-*.ts`, `payments/wallet/components/wallet-modal/wallet-modal-container/wallet-modal-container.tsx:63` |
| analytics (cross-route, ESPN-only) | `subscriberCohort` | `apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts:56-67` |
| `commerce/billing-history`, `commerce/account`, `commerce/subscription`, `commerce/change-subscription/*`, `commerce/plans`, `commerce/cadence`, `commerce/billing`, `commerce/review-subscription`, `commerce/add-ons` | `billingHistory`, `accountDetails`, `subscriptionDetails`, `planSwitch*`, `landingPlans`, `subscriptionPreview*`, `subscriptionReview`, `addonSelector` | INFERRED from the endpoint inventory + `commerce-base` `account/`/`signup/` fixture dirs (`account/billing-history/__fixtures__/espn`, `signup/__fixtures__/espn/billing-page-espn-with-mlb.json`) |

**Locally rendered (not Flex):** the entire `identity/**` tree (17 routes: `begin`, `login`, `logout`, `magic`, `sign-up`, `verify`, `update-credentials`, `review-and-accept`, `subscriber-agreement`, `oauth-review-terms`, `nielsen`, `start`, `loading`) — these are OneID/identity-auth flows, not Flex screens. Also `_error`, `landing`, `login`, `mock-documents/sca/*`.

**Locally rendered *and* dead-ended:** `profiles/**` (8 routes) — the profile transfer / extra-member-transfer pages exist as routes, but every underlying orchestration op (`transferProfile`, `eligibleProfilesForTransfer`, `requestProfileTransfer`, …) hits `notImplemented` on ESPN. INFERRED: these are almost certainly gated off by `is-route-enabled` for the ESPN tenant. See §12.

---

## 4. ESPN vs Disney+ vs Hulu

### 4.1 The shared layer — CONFIRMED

There is **no abstract base class and no shared data-interface package.** The sharing mechanism is:

| Shared thing | Where |
|---|---|
| The contract | `DATA_INTERFACE` + `OrchestrationOperations` types, `packages/developer-experience/types/src/index.d.ts:575-694`, `:280-446` |
| The consumer | `packages/cgi/commerce-base/src/**` reads `useAtomValue(dataInterfaceAtom)` |
| The hydration hook | `packages/cgi/commerce-base/src/common/data-interface/atoms.ts` |
| Ambient SDK types | `packages/developer-experience/types/src/types/bam-browser-sdk.d.ts` |
| Session/SDK | `@solo/sdk-session` (`packages/cgi/sdk-session`) — used by ESPN + D+, **not** by Hulu's data interface |

Each brand independently satisfies the same structural type. **Duck typing, enforced by TypeScript.** The `AGENTS.md` warning — *"Data interfaces must stay in sync — if you add a method to one brand's interface, consider whether the other brands need it"* (`packages/cgi/AGENTS.md:142`) — exists precisely because nothing structural forces it.

### 4.2 `buildDataInterface` signatures side by side — CONFIRMED

| | ESPN | Disney+ | Hulu |
|---|---|---|---|
| File | `data-interface-espn/src/data-interface.ts:16` | `data-interface-disney/src/data-interface.ts:16` | `data-interface-hulu/src/data-interface.ts:34` |
| Params | `{ sdkSession, queryClient, observability }` | `{ sdkSession, observability, queryClient }` | `{ accountApiBaseUrl, edgeBaseUrl, homeBaseUrl, huluBaseUrl, identityBaseUrl, observability, orchestrationUrl, secureBaseUrl, userAgent, wafBaseUrl, yokozunaUrl }` |
| Transport | BamTech SDK | BamTech SDK | **raw URLs + `fetch`** |
| Slices | flex, identity, payment, activations, experimentation | identical 5 | identical 5 |

**ESPN's and Disney+'s `buildDataInterface` are functionally identical** — same 5 slices, same 3 params, differing only in destructuring order. Hulu takes **nine base URLs** and a `userAgent` because it has no SDK session to resolve endpoints for it.

### 4.3 Flex: the real divergence — CONFIRMED

ESPN (`flex/flex-data-interface.ts`, 19 lines) and Disney+ (`data-interface-disney/src/flex/flex-data-interface.ts`, 19 lines) are **character-for-character identical**.

Hulu's (`data-interface-hulu/src/flex/flex-data-interface.ts`, ~280 lines) is a different animal:

```
lines   8-38   const flexScreenKeysToUrls = { acceptInvite: 'landing/accept-invite',
                 accountDetails: 'hulu/account-home', billingHistory: 'account/billing-history', ... }
lines  48-72   const flexExecutionKeysToUrls = { cancelSubscription: 'subscription/cancel-subscription', ... }
lines  74-78   // ACP Flex endpoints deviate from CUP in some instances and require a version override
               // These overrides can be safely removed once D+/ESPN are fully migrated to ACP
               const versionOverride = { subscriptionPreview: 'v2' };
lines  40-94   isFlexScreenKeyMapped / isFlexExecutionKeyMapped / isUnknownKeyOption type guards
lines 121-153  buildEndpoint(): `${edgeBaseUrl}/${type}/${version}/${flexKeysToUrls[key]}`
                 + configOverride path for key === 'unknown'
lines 160-280  getFlexDataInterface({ edgeBaseUrl, userAgent }) — hand-rolls query-string,
                 headers (getCachedPlatformHeader), error handling (handleFlexError/isFlexError)
```

Consequences:
1. **Hulu keeps its Flex key→path map in the repo**; ESPN/D+ keep theirs in a remote SDK config. Adding a Flex screen for Hulu is a code change with a guard-rail error (`The Flex screen key, ${key}, must first be mapped to a path in the data interface.`, line 179-181); for ESPN it is a config change with **no repo-side validation at all**.
2. **Hulu has bespoke Flex error handling** (`./exceptions` → `handleFlexError`, `isFlexError`). ESPN/D+ have none in the data layer — errors surface as whatever the SDK throws.
3. Hulu sends a **platform header** via `getCachedPlatformHeader` (`../lib/get-cached-platform-header`). ESPN/D+ get platform via SDK `commonHeaders` `X-BAMSDK-Platform`.

The comment at Hulu lines 74-76 is the load-bearing one for understanding **why** the divergence exists: **Hulu is on ACP; D+ and ESPN are on CUP and are being migrated to ACP.** ESPN's thin SDK pass-through is the *old* pattern; Hulu's explicit map is the *new* one. Corroborated by `packages/cgi/commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx:9` — *"Once ESPN moves to the ACP architecture, this handler can be moved to the ESPN application…"*

### 4.4 Identity: ESPN = D+ minus profiles — CONFIRMED

Disney+ `identity/` contains directories ESPN entirely lacks:
- `identity/content-api/` — `avatar-collections.ts`, `avatar-set.ts`, `constants.ts` (ESPN: both methods `throw`)
- `identity/profiles/` — `get-redirect-rules.ts`, `profiles-redirect-rules-data.ts`, `redeem-age-verification.ts`, `request-age-verification.ts`, `retrieve-profile-pin-with-action-grant.ts` (ESPN: `throw`)
- `identity/operations/` — ~60 more files: `authenticate-with-otp`, `authenticate-with-password`, `create-profile*`, `enable-profile-*`, `disable-profile-*`, `update-profile-*`, `switch-profile`, `link-hulu-account`, `link-hulu-profile`, `eligible-*`, `globalization`, `me`, `onboard-profile*`, `pending-ad-hoc-profile-transfers`, `activate-license-plate-code`, `current-nielsen-measurement-consent`, `delete-account-with-action-grant`, `logout-account-device-with-action-grant`, `get-profile-setup-details`

Hulu has an `identity/api/` directory (REST) that neither ESPN nor D+ has — again the ACP/CUP split.

**Why the divergence?** Stated in the ESPN code itself:
- ESPN has **no profiles product** → the whole profiles surface is unimplemented, and `getDefaultProfileData` fabricates one fake profile.
- ESPN identity/personal-info is **OneID, not Orchestration** (`operations/personal-info.ts:21-23`).
- ESPN's **logout graph call does not exist** (`identity-data-interface.ts:91`).
- ESPN Orchestration **rejects some graph fields outright** — hence the MSW tripwire in §8.2.

### 4.5 Other per-brand deltas — CONFIRMED

| Slice | ESPN | Disney+ | Hulu |
|---|---|---|---|
| Experimentation source | `sdkSession.getSessionInfo().experiments` | same helper name/shape | `parse-spearmint-experiments.ts` (**Spearmint**) |
| Activations | `sdkSession.purchaseApi.redeemToken` | same shape | `activations/operations/redeem-incoming-activation-token.ts` (own impl) |
| `getExperimentationDataInterface()` args | `(sdkSession)` | `(sdkSession)` | `()` — no session |
| Payment | 4 SDK delegations | SDK | `({ edgeBaseUrl, wafBaseUrl, yokozunaUrl })` — note `// TODO ACP-5517: Remove Yokozuna once unified tokenization launches` |
| `lib/` dir | none | none | present (`get-cached-platform-header`) |

---

## 5. Auth / session plumbing

### 5.1 Package & identity — CONFIRMED

`@solo/sdk-session` (`packages/cgi/sdk-session`) is the single session owner for ESPN and D+.

`packages/cgi/sdk-session/src/constants.ts` (entire file):
```ts
export const SDK_PARTNER_ID = {
  disneyPlus: 'disney-svod-3d9324fc',
  espn: 'espn-a9b93989',
} as const;

export const SDK_ENVIRONMENT_OVERRIDE_COOKIE = 'dss_sdk_config_env';
```

`espn-a9b93989` is **the** ESPN partner/client id — it appears in the SDK config URL path, the `X-BAMSDK-Client-ID` header, and the localStorage key namespaces.

### 5.2 Token acquisition & refresh — CONFIRMED

`packages/cgi/sdk-session/src/sdk-atoms.ts` (653 lines) owns bootstrap. Key mechanics:

**Storage key namespacing** (lines 291-296) — `${clientId}_${environment}`:
```
__bam_sdk_access--espn-a9b93989_qa
__bam_sdk_device_grant--espn-a9b93989_qa
__bam_sdk_session_info--espn-a9b93989_qa
__bam_sdk_feature_flags--espn-a9b93989_qa
```
(These exact strings are used by `packages/cgi/commerce-utils/src/mock-is-logged-in.ts:17-50` to fake login in tests.)

**Two token providers, one interop bridge.** There is an ongoing migration from the Browser SDK's own token handling to an **Identity Web SDK `tokenProvider`** (`identity-sdk-atom.ts`, `interop-rollout.ts` with `isInInteropRollout` / `getStablePercentile`). When a `tokenProvider` exists:
- `session.initialize({ tokenProvider })` (lines 231-236)
- the code then **writes back** into the legacy `__bam_sdk_access--*` / `__bam_sdk_device_grant--*` keys for backward compatibility (lines 388-471), shaping `{ context: { token, tokenType, accessTokenType, expiresIn, issuedAt, region, refreshToken }, contextState: { modes } }` from `tokenProvider.getProviderTokenWithoutRefresh()` and `tokenProvider.getGrant()`
- reference comment points at `github.bamtech.co/fed-core/browser-sdk/blob/main/src/token/accessStorage.ts` (line 395)

Otherwise it restores a `storedDeviceGrant` from localStorage and re-initialises (lines 322-381).

**Refresh** is the SDK's responsibility, driven by the token/orchestration endpoints (§5.4). No manual refresh loop in cgi-web. CONFIRMED by absence.

**Environment override** — `resolveSDKEnvironment()` (`lib/common-utils.ts:108`) reads the `dss_sdk_config_env` cookie and, if set, overrides the Sparrow-supplied environment (`sdk-atoms.ts:174-183`). Local config base: `https://local.client-sdk-configs.bamgrid.com/bam-sdk` (line 188).

**Correlation id** — `await registerCorrelationID(newSession)` (line 384), then `tracker.succeeded('correlation_id_registered')` (385). Implementation in `lib/glimpse-session.ts`.

### 5.3 ESPN's device-identity override — CONFIRMED, ESPN-UNIQUE

`packages/cgi/sdk-session/src/espn-device-attribute-provider.ts` (entire file, 59 lines) — the one genuinely ESPN-specific piece of session plumbing:

```ts
export class ESPNDeviceAttributeProvider extends SDK.Device.BrowserDeviceAttributeProvider {
  private espn_aid?: string;
  constructor() {
    if (!isBrowser()) throw new Error('getDeviceAttributes was invoked on the server, ...');
    super();
    const COOKIE_MAX_AGE = 31_536_000; // 1 year
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

Purpose (class docstring, lines 10-13): *"providing a consistent device ID across ESPN domains."* The cookie is scoped to `domain: 'espn.com'` so the id survives across ESPN properties. Note the **`as OsDeviceIdType` cast working around a missing SDK enum member** (lines 48-50) — an acknowledged hack.

Hydrated at `apps/commerce/espn/src/layout/espn-layout.tsx:88-94` and `apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx:85-91`, both guarded by `isBrowser() ? new ESPNDeviceAttributeProvider() : undefined`.

### 5.4 ESPN's full non-Flex endpoint surface — CONFIRMED

From `packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json` (`services.*.client.endpoints`), all on `https://qa-espn.api.edge.bamgrid.com`:

| Service | Endpoints |
|---|---|
| **token** | `exchange` → `POST /token` |
| **session** | `getInfo` → `GET /session`; `getLocation` → `GET /sessions/me/location` |
| **orchestration** | `query` → `POST /v1/public/graphql`; `registerDevice`, `refreshToken`, `exchangeDeviceGrantForAccessToken` → `POST /graph/v1/device/graphql` |
| **account** | `createAccount` POST `/accounts`; `createAccountGrant` POST `/accounts/grant`; `getCurrentAccount` GET `/accounts/me`; `updateAccountAttributes` PATCH `/accounts/me/attributes`; `deleteAccountAttributes` DELETE `/accounts/me/attributes` |
| **subscription** | `getSubscriberInfo` GET `/v2/subscribers`; `getAccountSubscription` GET `/v2/subscribers/subscriptions/{subscriptionId}`; `getSubscriptions` GET `/subscriptions`; `linkSubscriptionsFromDevice` POST `/subscriptions/copy/device` |
| **commerce** (39) | `submitOrderWithPaymentMethod` POST `/v2/order`; `updateOrder` PATCH `/v2/order`; `planSwitch` POST `/v2/order/switch`; `restartSubscription` POST `/v2/order/restart`; `resumeAccount` POST `/v2/order/resume`; `priceOrder` POST `/priceOrder`; `redeem` POST `/redeem`; `getOrderStatus` GET `/v2/orders/{guid}`; `createPaymentMethod*` POST `/tokens/sps` (×6 regions); wallet CRUD (`/wallet/payment-methods*`, `/wallet/payment-cards*`, `/wallet/{paymentType}/{paymentMethodId}`); `shareDefaultPaymentMethod` POST `/wallet/payment-methods/default/consent`; `associateAuthValuesWithPaymentMethod` PATCH `/wallet/payment-methods/{id}/auth-values`; PayPal Braintree (`/upv2/paypal/*`, `/paypalToken*`); iDEAL / Klarna / MercadoPago / Comcast; `getDdcJwtToken` GET `/commerceutilities/ddcjwt`; `lookupByZipCode` GET `/fed-web-app/assets/resources/zipcodes/{zipcode}.json` |
| **wallet** | `updatePaymentCardByIdentityId` PATCH `/id/payment-cards/{paymentMethodId}`; `updateCardInfoForPurchase` PATCH `/id/prepare/payment-cards/{paymentMethodId}` |
| **purchase** | `redeemPurchases` POST `/stores/{store}/purchases`; `restorePurchases` POST `/stores/{store}/restorations` |
| **externalActivation** | `activateToken` POST `/providers/{providerId}/activations`; `activateBundle` POST `/bundles/incoming/{providerId}`; `getActivationToken` GET `/bundles/outgoing/{providerId}`; `generateActivationToken` GET `/content-providers/{contentProvider}/activation-token` |
| **invoice** | `getInvoice` GET `/invoice-service`; `getPaginatedInvoices` GET `/invoice-service/invoices` |
| **eligibility** | `getEligibilityStatus` GET `/eligibility` |
| **ump** | `getMessages` GET `/v2/messages`; `getMessageById` GET `/v2/messages/{messageId}`; `executeAction` POST `/v1/actions/execute` |
| **entitlement** | `verifyMediaRights` (no baseUrl) |
| **paywall** | `paywall` (no baseUrl) |
| others | `adEngine`, `connectionPairing`, `content`, `customerService`, `dictionary`, `drm`, `eventEdge`, `explore`, `httpEnvelope`, `media`, `pushMessaging`, `qrcode`, `ripcut`, `socket`, `telemetry`, `weaponX` |

**Only a tiny slice of this is reachable through the ESPN data interface** — `orchestration.query`, `session.getInfo`, `subscription.getSubscriberInfo`, `commerce.paymentCardApi/updatePaymentMethod`, `wallet.*`, `purchase.redeemToken`, and all of `flex`. Everything else the SDK uses internally or ESPN commerce doesn't use.

### 5.5 The Sparrow layer — CONFIRMED

The SDK bootstrap options themselves come from **Sparrow** remote config, not from the repo:
- `useHydrateBamSDKConfigAtom(commerceAppConfig['feature-configuration'].sdk)` at `packages/cgi/commerce-base/src/common/layouts/__internal__/hydrate-base-atoms.tsx:73`
- Sparrow workspace naming: `` workspace: `commerce-${productName.toLowerCase()}` `` → **`commerce-espn`** (`packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts:64`)
- ESPN feature flags therefore live in Sparrow, e.g. `enableEspnInternalActivation` (`transactional/activation/hooks/use-espn-internal-activation-params.ts:43`), `wpnx-use-privacy-consent-package` (`espn-layout.tsx:51`), `wpnx-web-identity-enable-begin-unlmt-route` (`identity/loading/lib/is-dynamic-url-slug-enabled.ts:15`)

**Config chain:** Sparrow (`commerce-espn` workspace) → `commerceAppConfig['feature-configuration'].sdk` → `bamSDKConfigAtom` → SDK bootstrap → fetch `client-sdk-configs.bamgrid.com/.../espn-a9b93989/...` → `services.flex.client.endpoints` → Flex request.

---

## 6. Error handling & React Query wiring

### 6.1 Orchestration error normalisation — CONFIRMED

`packages/cgi/data-interface-espn/src/identity/operations/setup-query-function.ts:9-47` is the only error-handling logic in the ESPN data interface:

```ts
export function setupQueryFunction({ sdkSession }: { sdkSession: SDKSession }) {
  return async function queryFunction<T extends OrchestrationAPIResult>(options: {
    operationName?: string; query: string; variables?: Record<string, unknown>;
  }): Promise<T> {
    let data: T['data'] = null;
    const errors: T['errors'] = [];
    try {
      data = await sdkSession.orchestrationApi.query<T['data']>(options);
    } catch (error_) {
      const error = error_ as { reasons?: SDKErrorReason[] };
      // If the reasons array is missing or empty, rethrow the error.
      if (!Array.isArray(error?.reasons) || error.reasons.length === 0) throw error;
      for (const reason of error.reasons) {
        // If there is no code on *any* error reason, rethrow the error.
        if (!reason.code) throw error;
        errors.push({ message: reason.description,
                      extensions: { code: reason.code }, path: [], locations: [] });
      }
      return { data, errors } as T;      // response hydrated with errors
    }
    return { data, errors } as T;        // success response
  };
}
```

**Design:** SDK errors that carry `reasons[].code` are **converted into a GraphQL-shaped `errors` array and returned as a resolved promise**; anything else **rethrows**. So callers see two distinct failure modes:
- *soft* — `{ data: null|partial, errors: [{ message, extensions.code }] }`, resolved
- *hard* — thrown, propagating to React Query → error boundary

Note the deliberate strictness: **one** reason lacking a `code` rethrows the whole error. `path: []` and `locations: []` are always empty — synthesised, not real GraphQL positions.

No retry, no backoff, no timeout in the data interface. Timeouts come from the SDK endpoint config (`timeout: 15` per Flex endpoint).

### 6.2 React Query wiring — CONFIRMED

Two layers.

**(a) `@solo/sdk-session` hooks** — `packages/cgi/sdk-session/src/sdk-hooks.ts`:

- `useSDKSession()` (lines 32-48): reads `sdkAtom` + `sdkSessionErrorHandlerAtom`; forwards SDK errors to a custom handler if one is hydrated, **otherwise** to `useErrorHandler` (react-error-boundary). Line 45: `useErrorHandler(sdkSessionErrorHandler ? undefined : sdkSessionError)`.

- `useSDKQuery()` (lines 78-123): wraps `useQuery`, injects `sdkSession` into the `queryFn` context. Two gates:
  ```ts
  enabled: isBrowser() && enabled && isReady,      // line 112
  ...(isEnabled ? {} : { retry: false, useErrorBoundary: true }),   // line 119
  ```
  and if `!isEnabled` the `queryFn` itself throws with the offending query key embedded (lines 104-108). The comment at 115-118 is explicit: *"By default, a query retries three times at increasing intervals (6 seconds total). We want to ensure the error throws immediately, and to the error boundary (loudly), when the query fails."*
  **`enabled` gating is therefore three-way: browser AND caller-enabled AND SDK-ready.**

- `useSDKMutation()` (lines 151-192): same pattern; returns `{ ...useMutationResult, isReady }`. Mutation-key echoed in the disabled-SDK error (line 172-175).

**(b) `meta.owner` for observability** — every commerce query/mutation attaches `meta: { owner: Owners.<TEAM>, errorMessage: ERROR_MESSAGES.<X> }`. `Owners` is re-exported from `@solo/observe` via `packages/cgi/commerce-base/src/common/constants/observability.ts:8` (with `// TODO WEB-33133` to stop re-exporting). Payments/retention queries use `Owners.TAP` almost universally.

The **ESPN-specific** example, `apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts:55-125`:
```ts
return useSDKMutation<FlexAdobeSubscriberCohortsModel, Error>({
  mutationKey: ['flexApi.execute.subscriberCohort'],
  mutationFn: ({ sdkSession }) => {
    const options: FlexExecutionOptions = {
      key: 'subscriberCohort', version: 'v1',
      queryParams: { __screen },
      headers: generateFlexHeaders({}),
    };
    return sdkSession.flexApi.execute(options);
  },
  onSuccess: ({ success, successData }) => { /* map cohorts → Adobe context */ },
  meta: { owner: Owners.TAP,
          errorMessage: ERROR_MESSAGES.ANALYTICS_FLEX_SUBSCRIBER_COHORT },
  useErrorBoundary: true,
});
```
**GOTCHA:** this ESPN hook **bypasses the data interface entirely** — it calls `sdkSession.flexApi.execute` directly rather than `dataInterface.flexExecution`. See §11.

`generateFlexHeaders({})` with no `salesPlatform` returns `undefined`, so no custom header is sent — the call is written for future header support.

**Query-key conventions observed:** array-first, string-literal keys. `['isLoggedInQuery', true]` (invalidated on logout, `identity-data-interface.ts:94`), `['activationSuccessPage']`, `['flexApi.execute.subscriberCohort']`. No centralised key factory found. INFERRED: keys are ad-hoc per callsite.

**Error observability at Flex callsites** — `use-activation-success-page-data.ts:101-110`:
```ts
} catch (error) {
  datadogRum.addError(error, {
    errorDetails: error,
    errorMessage: ERROR_MESSAGES.ACTIVATION_SUCCESS.FLEX_SCREEN_ERROR,
    owner: Owners.TAP, providerId, screen: 'activationSuccess',
  });
  throw new Error('Flex Activation Success call failed.');
```
i.e. **log to Datadog RUM with `owner`, then rethrow a generic error.** Note the original error's message is lost to the boundary (only Datadog keeps it).

Datadog is initialised app-wide at `apps/commerce/espn/pages/_app.page.tsx:3,18` (`initDatadog()`).

---

## 7. Types & codegen

### 7.1 Where types live — CONFIRMED

| What | Where |
|---|---|
| `DATA_INTERFACE`, `OrchestrationOperations`, `OrchestrationOperationNames`, `ProductName` | `packages/developer-experience/types/src/index.d.ts` (694 lines) |
| Ambient SDK types (`SDKSession`, `FlexScreenOptions`, `FlexResponse`, `FlexExecutionResponse`, `FlexAPI`, `OrchestrationAPI`, `PurchaseAPI`, `WalletAPI`, `CommerceAPI`, `AppTenants`, `SessionInfo`, `SDKEndpoint`) | `packages/developer-experience/types/src/types/bam-browser-sdk.d.ts` |
| Per-operation result/input types | `packages/developer-experience/types/src/types/identity/**` — one file per operation, e.g. `identity/account/subscriptions.ts`, `identity/profiles/extra-member-info.ts`, `identity/account/identity-consent.ts` |
| Activations | `packages/developer-experience/types/src/types/activations/redeem-incoming-activation-token.ts` |
| Analytics context | `packages/developer-experience/types/src/types/adobe.ts` (`ESPNContextData` at line 105) |
| Others | `glimpse.d.ts`, `dss-device.d.ts`, `design-tokens.d.ts`, `identity/license-plate.d.ts`, `identity/observability.ts` |

Package name: `@solo/types` (imported as `@solo/types` and `@solo/types/src`).

### 7.2 There is no GraphQL codegen — CONFIRMED

**Every ESPN GraphQL operation is a hand-written template literal** in its own `operations/*.ts` file, paired with a hand-written result type in `@solo/types`. No `.graphql` files, no fragments, no `graphql-codegen` config, no generated schema in the ESPN path.

The convention is consistent and worth copying:
```ts
const operationName = 'getSubscriptions';
export const getSubscriptionsQuery = `query ${operationName} { ... }`;
export async function getSubscriptions(queryFunction: OrchestrationQueryFunction) { ... }
```
— the op name is a `const` interpolated into the query **and** passed as `operationName` to `queryFunction`, so they can never drift. The query string is exported (for test assertions).

The only generated file in the ESPN app is **dictionary keys**, not GraphQL: `apps/commerce/espn/src/commerce-espn-dict-keys.generated.ts`, produced by `pnpm --filter @solo/dictionary extract-ssr-keys "$PWD" commerce-espn` (`apps/commerce/espn/package.json` `prebuild`).

**Consequence:** nothing validates ESPN's queries against the real ESPN Orchestration schema at build time. The repo's substitute for schema validation is the MSW tripwire in §8.2.

---

## 8. Mocking (MSW)

### 8.1 Layers — CONFIRMED

| Layer | Location | Purpose |
|---|---|---|
| **Server mocks** (Node/SSR) | `apps/commerce/espn/server-mocks/` | dictionary + Sparrow config during SSR |
| **Browser mocks** (client) | `apps/commerce/espn/src/queries/browser_mocks/`, `apps/commerce/espn/src/test/components/{browser-mocks,espn-browser-mocks}.tsx` | Flex/API responses in the browser |
| **Shared commerce-base mocks** | `packages/cgi/commerce-base/src/common/context/__browser-mocks__/handlers.ts`, `.../__fixtures__/sdk-config.ts` | SDK config + per-tenant fixtures |
| **MSW control API** | `apps/commerce/espn/pages/api/msw/{start,stop,reset,use}.api.ts` | runtime handler swapping (used by Playwright) |
| **Playwright** | `apps/commerce/espn/playwright/support/utils/playwright-server-mocking.ts`, `apps/commerce/espn/src/test/playwright/global-client-handlers.ts` | E2E |
| **Jest** | `apps/commerce/espn/src/test/setup/jest.setup-msw.ts`, `packages/cgi/sdk-session/src/tests/jest.setup-msw.ts` | unit |

`apps/commerce/espn/server-mocks/server-handlers.ts:7-10` (entire handler list):
```ts
export const serverHandlers = [
  ...getDictionaryHandlers('espn'),
  ...sparrowHandlers,
] as HttpHandler[];
```
`apps/commerce/espn/server-mocks/sparrow-handlers.ts:3-6`:
```ts
const sparrowMergedConfigHandler = getSparrowMergedConfigHandler({ productName: 'espn' });
export const sparrowHandlers = [sparrowMergedConfigHandler];
```

The **SDK config** itself is mocked in commerce-base — `packages/cgi/commerce-base/src/common/context/__browser-mocks__/handlers.ts:83-125` registers 8 handlers for
`https://client-sdk-configs.bamgrid.com/bam-sdk/v7.0/espn-a9b93989/browser/v${BAM_BROWSER_SDK_VERSION}/{macosx,linux}/{chrome,firefox}/{qa,preprod}.json`, served from the `packages/cgi/sdk-session/src/__fixtures__/espn/*.json` snapshots. **This is why the fixture is the authoritative endpoint inventory: mocked runs use exactly it.**

Per-tenant fixture selection uses `getProductNameForMocks()` — e.g. `packages/cgi/commerce-base/src/common/context/__fixtures__/sdk-config.ts:14-15`, which also exports `flexBaseURL`, `commerceBaseURL`, `orchestrationQueryURL`, `orchestrationDeviceURL`, `telemetryBaseURL`, `adobeBaseURL` (lines 76-81). Handlers key off those.

The ESPN Flex mock — `apps/commerce/espn/src/queries/browser_mocks/handlers.ts:12-34`:
```ts
export const espnAdobeSubscriberCohortsHandler = http.put(
  `${flexBaseURL}/execution/v1/subscription/subscriber-cohorts`,
  ({ request }) => {
    switch (new URL(request.url).searchParams.get('__screen')) {
      case 'empty':                 return HttpResponse.json(mockAdobeSubscriberCohortsEmpty);
      case 'mvpd-wholesaler':       return HttpResponse.json(mockAdobeSubscriberCohortsMVPDWholesaler);
      case 'multiple-wholesalers':  return HttpResponse.json(mockAdobeSubscriberCohortsMultipleWholesalers);
      default:                      return HttpResponse.json(mockAdobeSubscriberCohorts);
    }
  }
);
```
**Note the `__screen` query param as a mock-scenario selector** — a repo-wide convention (also used by `use-activation-success-page-data.ts` and `use-flex-subscriber-cohorts.ts`, both forwarding `__screen` to Flex). `__screen` is read from `useCommerceQueryParams()`.

ESPN fixture directories in commerce-base: `account/{account-details,billing-history,change-subscription,subscription-details,success}/__fixtures__/espn`, `common/{context,dictionary/data,footer,lib/sparrow}/**/espn`, `payments/__fixtures__/espn`, `payments/payment-forms/__fixtures__/espn`, `retention/cancel/__fixtures__/espn`, `signup/__fixtures__/espn`, `transactional/activation/__fixtures__/espn`. Named examples: `signup/__fixtures__/espn/billing-page-espn-with-mlb.json`, `account/success/__fixtures__/espn/espn-standalone-success-page{,-redirect}.json`.

### 8.2 The ESPN Orchestration tripwire — CONFIRMED, ESPN-UNIQUE, high value

`packages/cgi/commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx` (entire file):

```tsx
/**
 * Handler for all Orchestration API queries that attempt to request out for fields
 * unavailable in ESPN Orchestration.
 * If an excluded query is rendered in a Playwright test, an error will display.
 * This is intended to alert developers to accidental rendering of unavailable queries
 * in the hopes of ultimately preventing bugs from getting merged.
 *
 * Once ESPN moves to the ACP architecture, this handler can be moved to the ESPN
 * application and loaded into ESPN integration mode.
 *
 * To extend this handler, add the name of your query to the regex below with | as the delimiter.
 */
export const espnOrchestrationErrorHandler = graphql.query(
  /(isProfileCreationProtectedQuery|activeProfileAvatarQuery)/,
  () => HttpResponse.json({ errors: [{ message:
      'The graph fields being requested are not available in production Orchestration, ' +
      'and should not be loaded for the ESPN tenant. ...' }] }, { status: 500 })
);
```

This is the repo's **only mechanism** for catching "we rendered a D+-only graph query on ESPN". It is a **regex denylist maintained by hand**, currently containing exactly **two** query names. Anything not listed will silently 200 in mocked runs and fail in production. See §11 and §12.

### 8.3 Running ESPN commerce with mocks — CONFIRMED

From `apps/commerce/espn/package.json`:

| Command | Effect |
|---|---|
| `pnpm dev:commerce:espn` | plain dev (root script → `turbo dev --filter=@solo/commerce-espn`) |
| `pnpm dev:commerce:integration:espn` | `NEXT_PUBLIC_API_MOCKING=enabled` → **MSW on** (integration mode) |
| `apps/commerce/espn` → `dev:local-flex` | `NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled` — **the Flex-redirection half no longer works**, see §12 |
| `dev:start` | `local-setup` + concurrently `dev:proxy` + `PORT=5040 next dev` |
| `dev:proxy` | SSL proxy: waits on `http://local.plus.espn.com:5040/healthcheck`, serves `:5004` from `../../.certs` |
| `pnpm test:commerce:jest:espn` | `PRODUCT=espn jest --coverage` (the `PRODUCT` env var drives `getProductNameForMocks()`) |
| `pnpm test:commerce:playwright:espn` / `:headless:espn` | E2E |
| `pnpm test:data-interface-espn:coverage` | package-level coverage |
| `pnpm lint:type-check:data-interface-espn` | `tsc --noEmit` |

**Local host name: `local.plus.espn.com`** (from `dev:proxy`) — note `plus`, i.e. ESPN+.

---

## 9. Vocabulary — ESPN product / billing terms found in code

All CONFIRMED unless marked.

### 9.1 Identity / platform

| Term | Meaning | Where |
|---|---|---|
| `espn-a9b93989` | ESPN's BamTech SDK partner/client id; namespaces every storage key and the SDK-config URL | `packages/cgi/sdk-session/src/constants.ts:3` |
| `espn_aid` | ESPN Anonymous ID — 1-year cookie on `domain: 'espn.com'`, uuid v4, shared across ESPN domains | `espn-device-attribute-provider.ts:29-39` |
| `espnAnonymousSessionId` | `OsDeviceIdType` pushed into SDK device attributes; **not yet a real SDK enum member** | `espn-device-attribute-provider.ts:48-50` |
| `bamIdentity` | the authorization scope ESPN checks for login | `identity-data-interface.ts:76` |
| OneID | Disney's identity system; owns ESPN personal-info collection (**not** Orchestration) | `operations/personal-info.ts:21-23`; `commerce-base/src/common/oneid/oneid` |
| `local.plus.espn.com` | local dev hostname | `apps/commerce/espn/package.json` `dev:proxy` |
| `espnplus` | footer/template `org` + `section` identifier for ESPN+ | `packages/cgi/footer/src/server/get-footer-layout/config.ts:41,46`; `fallbacks/espn.ts:24` |
| `dss_sdk_config_env` | cookie that overrides SDK environment (qa/preprod/prod) | `sdk-session/src/constants.ts:6` |
| `ag` | action-grant cookie removed on logout (domain-scoped to last two hostname labels) | `clean-browser-storage.ts:45` |

### 9.2 Subscriber cohorts / wholesale (ESPN-only concepts)

`packages/developer-experience/types/src/types/adobe.ts:105-111`:
```ts
export type ESPNContextData = {
  tenant: 'espn';
  /** Subscriber cohorts derived from Flex API. */
  isWholesaleUser: 'Yes' | 'No';
  isMVPDWholesaleUser: 'Yes' | 'No';
  wholesaleUserProvider: string;
};
```
(Contrast `HuluContextData = { tenant: 'hulu' }` — no cohort fields.)

| Term | Meaning | Where |
|---|---|---|
| **cohort** | classification returned by Flex `subscriberCohort` execution: `{ type, provider?, affiliateId? }` | `apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts:24-32` |
| **`wholesale_user`** | cohort type → `isWholesaleUser: 'Yes'` — a subscriber acquired via a wholesale (bulk/partner) deal rather than D2C | `use-flex-subscriber-cohorts.ts:79,91` |
| **`wholesale_mvpd_user`** | cohort type → `isMVPDWholesaleUser: 'Yes'` — wholesale via an **MVPD** (Multichannel Video Programming Distributor: cable/satellite/vMVPD) | `use-flex-subscriber-cohorts.ts:86,96` |
| **`wholesaleUserProvider`** | de-duplicated, comma-joined provider names across both cohort types; defaults to `'no provider'` | `use-flex-subscriber-cohorts.ts:103-111` |
| `DEFAULT_WHOLESALE_CONTEXT_DATA` | `{ isWholesaleUser: 'No', isMVPDWholesaleUser: 'No', wholesaleUserProvider: 'no provider' }` | `use-flex-subscriber-cohorts.ts:18-22` |
| `affiliateId` | third field on a cohort; **unused** by the current mapping | `use-flex-subscriber-cohorts.ts:27` |

**No occurrence of the literal string "TVE"** (TV Everywhere) anywhere in ESPN commerce source. MVPD is the closest concept. CONFIRMED by grep.
**No occurrence of "ESPN Unlimited"** as a product name. There *is* an `unlimited` dynamic URL slug on the identity side — `unlimited: 'wpnx-web-identity-enable-begin-unlmt-route'` (`commerce-base/src/identity/loading/lib/is-dynamic-url-slug-enabled.ts:15`) and `'unlimited'` in `identity/loading/lib/dynamic-url-map.ts:10,66`, plus the ESPN route `identity/begin/[...slug]`. INFERRED: `unlimited` is a marketing route slug for an ESPN tier, gated by the Sparrow flag `wpnx-web-identity-enable-begin-unlmt-route`.

### 9.3 Subscription / billing model (from the `getSubscriptions` graph query)

`packages/cgi/data-interface-espn/src/identity/operations/get-subscriptions.ts:9-39` and `DATA_INTERFACE.getSubscriberInfo` (`index.d.ts:595-642`):

| Term | Meaning |
|---|---|
| **`sku`** | `product.sku` — the purchasable SKU string |
| **`partner`** | subscription-level partner attribution |
| **`source.sourceType`** | `IAP` \| `EXT` \| `3P` (external) or `CST`/`D2C`/`EXT`/`OPS` (internal) — `commerce-base/src/common/constants/subscription-sources.ts:5-17` |
| **`source.sourceProvider`** | `BAMTECH` \| `NO_PAYMENT` — `subscription-sources.ts:7-10` |
| **`source.subType`** | `Comp` \| `PromoRedemption` — `subscription-sources.ts:19-22` |
| **`stacking.status`** | whether this subscription stacks on another (ESPN+ ↔ bundle overlap) |
| **`cancellation.type`** | cancellation classification |
| **`state`**, **`term.expiryDate`** | lifecycle |
| **`entitlements`** | `product.entitlements: [{ id, name, desc, partner? }]` — what the SKU grants |
| **`bundle`** / **`bundleType`** | boolean + type; ESPN+ is frequently sold inside the Disney bundle |
| **`offerId`** / **`promotionId`** | merchandising identifiers |
| **`categoryCodes`**, **`subscriptionPeriod`**, **`earlyAccess`** | product metadata |
| **`redeemed`** | `{ campaignCode, voucherCode }` |
| **`doubleBilled`**, **`overlappingSubscription`** | `getSubscriberInfo` flags for cross-tenant billing conflicts |
| **`isEntitled`**, **`canCancel`**, **`externalSubscriptionId`** | per-subscription flags |
| **`isFreeTrial`**, **`nextRenewalDate`**, **`purchaseDate`**, **`startDate`** | `term` fields |

### 9.4 "Ledger" — CONFIRMED

**In this codebase `ledger` means a Flex screen that itemises a price change**, not an accounting ledger. ESPN Flex keys: `planSwitchLedger` (+`planSwitchLedgerSecondary`), `restartLedger`, and separately `consentLedger` (`GET /screens/{version}/account/consent-ledger` — an audit trail of consent decisions). `deviceRestartLedger` exists for D+ but **not** ESPN.

### 9.5 Activation / partner terms

| Term | Meaning | Where |
|---|---|---|
| **incoming activation** | third party → ESPN token redemption; ESPN-only Flex screen `landing/incoming-activation` | ESPN SDK config; `IncomingActivationPageParameters` type |
| **ESPN Internal Activation** | ESPN Web → landing → external provider login → callback; **query-param driven**, gated by Sparrow flag `enableEspnInternalActivation` | `commerce-base/src/transactional/activation/hooks/use-espn-internal-activation-params.ts` |
| `isEspnInternalActivationFlow` | the canonical signal — `Boolean(isEspnInternalActivation && providerId && successURL)`; deliberately **excludes** `providerLoginUrl` so it survives the provider round trip | same file, lines 55-62 |
| `providerId` / `providerLoginUrl` / `successURL` | forwarded params (re-serialised into the provider `activationUrl`) | same file |
| `entitlementId` | **intentionally not gated** — also used by D+ internal activations and license-plate redemption | same file, lines 33-35 |
| `redeemToken(providerId, token)` | SDK purchase API call behind `redeemActivationToken` | `activations/activations-data-interface.ts:21` |
| bundle activation | SDK `externalActivation`: `POST /bundles/incoming/{providerId}`, `GET /bundles/outgoing/{providerId}` | ESPN SDK config |
| license plate | device-pairing code flow — **`validateLicensePlate`/`activateLicensePlate` throw on ESPN** | `identity-data-interface.ts:144-149` |
| **MLB** | appears in an ESPN billing fixture (`billing-page-espn-with-mlb.json`) — INFERRED: an ESPN add-on/partner package | `commerce-base/src/signup/__fixtures__/espn/` |
| Verizon | billed-user segment needing a bespoke activation-success template | `use-activation-success-page-data.ts:74` (`TODO: WEB-29516`) |
| Comcast | D+-only Flex templates (`comcastPaymentMethod`, `comcastSufConsentTemplate`, `comcastSwitchConsentTemplate`) — **absent for ESPN** | §3.5 |

### 9.6 Architecture acronyms

| Acronym | Meaning | Evidence |
|---|---|---|
| **CUP** | the legacy commerce platform D+/ESPN are on | `data-interface-hulu/src/flex/flex-data-interface.ts:74-76`; `test:coverage:ci` paths `cup_commerce/...` |
| **ACP** | the target platform; Hulu already there, D+/ESPN migrating | same comment; `espn-orchestration-error-handler.tsx:9`; ticket prefixes `ACP-701`, `ACP-5517` |
| **Flex** | the server-driven-UI service behind Edge `services.flex` (screens + executions) | throughout |
| **Sparrow** | remote config / feature-flag service; ESPN workspace `commerce-espn` | `common/lib/sparrow/load-sparrow-config.ts:64` |
| **Edge** | `*-espn.api.edge.bamgrid.com` gateway fronting all services | SDK config |
| **Glimpse** | analytics/telemetry; owns correlation-id registration | `sdk-session/src/lib/glimpse-session.ts` |
| **Yokozuna** | Hulu-only tokenization service being retired (`TODO ACP-5517`) | `data-interface-hulu/src/data-interface.ts:45-46` |
| **Spearmint** | Hulu-only experimentation source | `data-interface-hulu/src/experimentation/helpers/parse-spearmint-experiments.ts` |
| **UMP** | Universal Message Platform (`/v2/messages`, `/v1/actions/execute`) | ESPN SDK config |
| **APM** | Alternative Payment Method (iDEAL, Klarna, MercadoPago, PayPal) | Flex `apmPaymentMethod`; `commerce-base/src/payments/apm/` |
| **3DS / DDC** | 3-D Secure / Device Data Collection (`threeDsComplete`, `threeDsValidate`, `threeDsDdcJwt`) | ESPN Flex config |
| **SCA** | Strong Customer Authentication | `commerce-base/src/payments/strong-customer-authentication/` |

---

## 10. Inventory summary tables

### 10.1 ESPN data-interface slices

| Slice | File | LoC | Methods | Transport |
|---|---|---|---|---|
| Flex | `src/flex/flex-data-interface.ts` | 19 | 2 | `sdkSession.flexApi` |
| Identity | `src/identity/identity-data-interface.ts` (+16 op/helper files) | 152 (+~380) | ~25 declared, 15 real | `sdkSession.orchestrationApi` / `subscriptionApi` / static |
| Payment | `src/payment/payment-interface.ts` | 51 | 4 | `sdkSession.commerce.paymentCardApi` / `commerceApi` / `walletApi` |
| Activations | `src/activations/activations-data-interface.ts` | 25 | 1 | `sdkSession.purchaseApi` |
| Experimentation | `src/experimentation/**` | 31 | 1 | `sdkSession.getSessionInfo()` |

### 10.2 Cross-brand comparison at a glance

| Dimension | ESPN | Disney+ | Hulu |
|---|---|---|---|
| Platform | CUP → ACP | CUP → ACP | ACP |
| Flex transport | SDK `flexApi` | SDK `flexApi` | hand-built URLs from `edgeBaseUrl` |
| Flex key→path map | remote SDK config (106 keys) | remote SDK config (119 keys) | **in-repo** (~38 screen + ~24 execution) |
| Flex error handling | none in data layer | none | `./exceptions` (`handleFlexError`) |
| Identity graph | ESPN Orchestration (restricted) | full Orchestration | REST `identity/api/` + Orchestration |
| Profiles | not implemented (~84 proxy throws) | fully implemented | partial |
| Personal info | OneID (hard-coded static) | Orchestration | Orchestration |
| Logout | `sdkSession.reset()` (no graph op) | graph logout | — |
| Experimentation | SDK session `experiments` | SDK session `experiments` | Spearmint |
| Device id | **`ESPNDeviceAttributeProvider`** (`espn_aid`) | SDK default | n/a |
| `buildDataInterface` args | 3 | 3 | 11 |
| Non-test src files | ~30 | ~110 | ~60 |

---

## 11. Gotchas

1. **`package.json` `main`/`types` point at `src/index.tsx`, which does not exist** (the file is `src/index.ts`). Everything works only because all consumers deep-import `@solo/data-interface-espn/src/data-interface`. A future consumer doing `import { buildDataInterface } from '@solo/data-interface-espn'` will fail. CONFIRMED.

2. **The data layer lies rather than branches.** `getMarketingPreferences`, `getPersonalInfo`, `getAccountOnboardingStatus`, `getUserDetails`, `getDefaultProfileData` all return convincing hard-coded graph envelopes so shared commerce-base code doesn't need tenant checks. Reading a value out of these will give you a *plausible but fabricated* answer with no runtime signal that it's fake. `getUserDetails` in particular returns **`email: ''`** — an empty string, not `null`, so falsy-checks pass but truthy-checks silently fail.

3. **`buildOperations` is a `Proxy`, and `...spread` defeats it.** `identity-data-interface.ts:150` spreads the proxy, copying only the 6 real keys. The `notImplemented` fallback for the other ~84 ops is therefore **not** in the final object. Expect `TypeError: dataInterface.switchProfile is not a function` rather than the intended `Error: Not implemented`. INFERRED — worth a 5-line test to confirm.

4. **Adding an ESPN Flex screen requires no repo change and gets no repo-side validation.** Hulu throws a clear error for an unmapped key; ESPN's SDK will attempt whatever the remote config says (or fail opaquely). The checked-in `__fixtures__/espn/*.json` snapshot can silently drift from the live config.

5. **`use-flex-subscriber-cohorts.ts` bypasses the data interface** — it calls `sdkSession.flexApi.execute` directly instead of `dataInterface.flexExecution`. It's the one ESPN-app-local Flex query, and it sits outside the abstraction (so it's invisible to anything that mocks/instruments `dataInterfaceAtom`).

6. **The ESPN Orchestration tripwire is a two-entry hand-maintained regex.** `espnOrchestrationErrorHandler` only catches `isProfileCreationProtectedQuery|activeProfileAvatarQuery`. Any *other* D+-only query rendered on ESPN passes mocked tests and fails in production. Extending the regex is documented in the file but relies on developer diligence.

7. **Two hydration paths in the ESPN app.** `espn-layout.tsx` (CUP V2) and `common/layouts/legacy-application-layout.tsx` (CUP V1) both hydrate the device-attribute provider and the data interface. A change to one is easy to miss in the other. And `hydrate-data-interface.tsx` itself has *two* variants behind `GCIEX-4196`.

8. **`setupQueryFunction` rethrows if ANY error reason lacks a `code`** — a partially-coded multi-reason error escapes normalisation entirely and hits the error boundary. Also `path: []`/`locations: []` are always fabricated, so GraphQL error-position tooling is useless here.

9. **`redeemActivationToken`'s `as Promise<...>` cast is unchecked.** The SDK declares `redeemToken` as returning `RedeemTokenAPIResult` (`{ errors?: [{code, description}] }`); the ESPN interface asserts it's a `RedeemActivationTokenResponseFactory`. If the SDK shape changes, TypeScript will not notice.

10. **`getSubscriptions` collapses the envelope on success but preserves it on error.** Success → bare array (or `[]`); failure → `{ data: null, errors, extensions }`. Callers must handle both shapes.

11. **`dev:local-flex` for ESPN is half-broken.** `NEXT_PUBLIC_FLEX_LOCAL_SERVICE` is still declared in `apps/commerce/espn/turbo.json:5` and set by the script, but the code that consumed it (`generate-sdk-config-with-local-flex.ts` and friends) was deleted in June 2025 (commit `7a74df8904`). The script now only enables MSW.

12. **`dataInterfaceAtom` throws when unhydrated** — good for catching mistakes, but it means any component reading it outside `HydrateDataInterface` (including some test setups) blows up with `The data interface must be hydrated before usage.` rather than getting `null`.

13. **100% unit-test coverage is enforced** on these packages (`packages/cgi/AGENTS.md:145`). Adding a branch to the ESPN data interface without a test will fail CI.

---

## 12. Open questions

1. **Does the `Proxy` fallback actually survive?** (Gotcha #3.) `getOrchestrationOperations` returns a `Proxy`; `identity-data-interface.ts:150` spreads it. Confirm empirically whether unimplemented orchestration ops throw `Not implemented` or `TypeError`. If the latter, the `buildOperations` abstraction is providing no runtime value on ESPN.

2. **Where is the real `growth-life-client-api` ↔ ESPN Flex boundary documented?** No cgi-web ESPN source references `growth-life-client-api`. Confirm that Edge `services.flex` for `*-espn` routes to it (vs. a separate ESPN Flex deployment), and whether ESPN screen templates live in the same repo as Disney+/Hulu ones.

3. **Which ESPN routes are actually enabled?** 79 routes exist including 8 `profiles/**` routes whose orchestration ops all throw. Read `commerce-base/src/common/lib/is-route-enabled` + the `commerce-espn` Sparrow workspace to produce a definitive live-route list. Until then the "Flex-driven vs local" table in §3.6 is partly inferred.

4. **What is "unlimited"?** `wpnx-web-identity-enable-begin-unlmt-route` + `dynamic-url-map.ts` `unlimited` slug + route `identity/begin/[...slug]`. Is this the ESPN direct-to-consumer "ESPN Unlimited" tier? Check the Sparrow flag's rollout state and the marketing app.

5. **How do the checked-in SDK config fixtures stay in sync with the live config?** `packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-{qa,preprod}.json` are the source of truth for all mocked runs. Is there a refresh job? (The repo has an `/upgrade-js-sdk` skill that "fetches new fixtures" — likely the mechanism; confirm it covers the ESPN files.)

6. **Is there an ACP migration plan for ESPN's data interface?** `ACP-701` (use `meQuery` for `getUserDetails` on ESPN and D+), `ACP-5517` (retire Yokozuna), and the Hulu `versionOverride` comment all point at a planned convergence. Knowing the target shape would say whether ESPN's thin SDK pass-through is going to be replaced by Hulu's explicit-map pattern.

7. **Is `activationSuccess` ever going to exist for ESPN?** It's absent from both ESPN and D+ Flex configs, forcing the `key: 'unknown'` + `configOverride` workaround (`WEB-29516`). Confirm whether the SDK team added it since.

8. **`affiliateId` on cohorts is parsed but unused** (`use-flex-subscriber-cohorts.ts:27`). Intentional, or a missed analytics dimension?

---

## Appendix — highest-value file paths

```
# The package
packages/cgi/data-interface-espn/src/index.ts                                    # 1-line export
packages/cgi/data-interface-espn/src/data-interface.ts                           # 5-slice composition
packages/cgi/data-interface-espn/src/flex/flex-data-interface.ts                 # ENTIRE Flex layer (19 lines)
packages/cgi/data-interface-espn/src/identity/identity-data-interface.ts         # the divergence map (152 lines)
packages/cgi/data-interface-espn/src/identity/operations/setup-query-function.ts # error normalisation
packages/cgi/data-interface-espn/src/identity/operations/get-orchestration-operations.ts  # Proxy shim
packages/cgi/data-interface-espn/src/identity/operations/get-subscriptions.ts    # billing vocabulary
packages/cgi/data-interface-espn/src/payment/payment-interface.ts
packages/cgi/data-interface-espn/src/activations/activations-data-interface.ts
packages/cgi/data-interface-espn/src/identity/helpers/clean-browser-storage.ts

# The contract
packages/developer-experience/types/src/index.d.ts                     # DATA_INTERFACE :575, OrchestrationOperations :280
packages/developer-experience/types/src/types/bam-browser-sdk.d.ts     # Flex types :153-201, AppTenants :562
packages/developer-experience/types/src/types/adobe.ts                 # ESPNContextData :105

# Hydration
packages/cgi/commerce-base/src/common/data-interface/atoms.ts
apps/commerce/espn/src/layout/hydrate-data-interface.tsx
apps/commerce/espn/src/layout/espn-layout.tsx
apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx
apps/commerce/espn/pages/_app.page.tsx

# Session / auth
packages/cgi/sdk-session/src/constants.ts                              # espn-a9b93989
packages/cgi/sdk-session/src/espn-device-attribute-provider.ts         # espn_aid
packages/cgi/sdk-session/src/sdk-atoms.ts                              # bootstrap, tokens, correlation id
packages/cgi/sdk-session/src/sdk-hooks.ts                              # useSDKQuery / useSDKMutation
packages/cgi/sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json   # ★ 106 Flex endpoints + all services
packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts

# Flex helpers & ESPN-specific callsites
packages/cgi/commerce-base/src/common/constants/subscription-sources.ts            # generateFlexHeaders
apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts                       # wholesale/MVPD cohorts
packages/cgi/commerce-base/src/transactional/activation/hooks/use-activation-success-page-data.ts
packages/cgi/commerce-base/src/transactional/activation/hooks/use-espn-internal-activation-params.ts

# Mocking
apps/commerce/espn/server-mocks/{index,server-mocks,server-handlers,sparrow-handlers}.ts
apps/commerce/espn/src/queries/browser_mocks/handlers.ts
packages/cgi/commerce-base/src/common/context/__browser-mocks__/handlers.ts         # SDK config mocks :83-125
packages/cgi/commerce-base/src/common/context/__fixtures__/sdk-config.ts           # flexBaseURL etc.
packages/cgi/commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx  # ★ tripwire

# Comparison
packages/cgi/data-interface-disney/src/{data-interface.ts,flex/flex-data-interface.ts}
packages/cgi/data-interface-hulu/src/{data-interface.ts,flex/flex-data-interface.ts}
packages/cgi/AGENTS.md
```
