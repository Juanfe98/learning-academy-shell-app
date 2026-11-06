# ESPN Commerce App Anatomy (`apps/commerce/espn`)

> Research digest — repo `cgi-web`, branch `main` (clean) @ `607747d290`.
> Every significant claim is tagged **CONFIRMED** (with `path:line`) or **INFERRED**.
> Repo root for all relative paths: `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web`.

---

## 0. Executive Summary (the 60-second version)

- **CONFIRMED** — Commerce is **not** one tenant-parameterized Next.js app. It is **three sibling
  Next.js apps** (`apps/commerce/disneyPlus`, `apps/commerce/hulu`, `apps/commerce/espn`), each with
  its own `next.config.js`, `pages/`, `_app`, `_document`, `middleware`, `public/`, `Dockerfile`,
  `.env`, `jest.config.js`, `playwright.config.ts`, and Jenkins job. Shared behaviour lives in
  `@solo/commerce-base`. (`apps/commerce/AGENTS.md:26-48`, `apps/commerce/espn/next.config.js:1`)
- **CONFIRMED** — The ESPN app is an almost-pure **shell**: 79 page files, of which the vast majority
  are 20–30-line re-export stubs (`export { XPage as default } from '@solo/commerce-base/...'`) plus a
  `buildGetServerSideProps([...])` call. All real logic is in `commerce-base`.
- **CONFIRMED** — The tenant switch is **`process.env.PRODUCT=espn`**, baked into
  `apps/commerce/espn/.env:20`. It selects the Sparrow remote-config workspace
  (`commerce-espn`), the Glimpse `partner`/`appName`, and the SEO metadata block.
- **CONFIRMED** — Local dev URL is **`https://local.plus.espn.com:5004`** (ssl-proxy) fronting Next on
  **port 5040**. (`apps/commerce/espn/package.json:32-33`)
- **CONFIRMED** — Deployed as Fuzzbucket/Jenkins app **`espnplus-commerce`**, Datadog service
  **`web-solo-commerce-espn`**, static endpoint `espnplus-static.bamgrid.com`. (`ci/espnplus/commerce:11,29,38`)
- **CONFIRMED** — ESPN has **79** page files vs Disney+ **106** and Hulu **63**. Exactly **1** page is
  ESPN-only. Per-brand availability is gated primarily at **runtime** by
  `isRouteEnabled({ featureFlagName })` reading the Sparrow config (42 of 79 ESPN pages are gated).

---

## 1. Physical Structure

### 1.1 Per-brand dirs, not one parameterized app — **CONFIRMED**

```
apps/
├── commerce/
│   ├── AGENTS.md
│   ├── disneyPlus/    # @solo/commerce-disney
│   ├── hulu/          # @solo/commerce-hulu
│   └── espn/          # @solo/commerce-espn
└── marketing-unified/ # separate NEXUS platform (disneyplus/hulu/espn)
```

`apps/commerce/AGENTS.md:16` states it plainly: *"Each brand has its own Next.js application that
shares common commerce infrastructure via `@solo/commerce-base`."*

Note the casing asymmetry: the directory is `disneyPlus` (camelCase) but `espn` and `hulu` are
lowercase. Package names are also inconsistent: `@solo/commerce-disney` (not `-disneyplus`),
`@solo/commerce-hulu`, `@solo/commerce-espn`. **CONFIRMED** — `apps/commerce/espn/package.json:2`,
and per-app `name` fields dumped side-by-side.

### 1.2 ESPN app top-level inventory — **CONFIRMED**

| Path | Role |
|---|---|
| `next.config.js` | Next config. Sole entry point for build/runtime config. 253 lines. |
| `next.config.test.js` | Unit tests for the config itself (it is in `collectCoverageFrom`). |
| `middleware.page.tsx` | Edge middleware — lang/locale extraction + URL rewrite. |
| `instrumentation.page.tsx` | Next `register()` hook; delegates to `instrumentation-node.ts`. |
| `instrumentation-node.ts` | Node-only cold-boot telemetry setup. |
| `pages/_app.page.tsx` | Root React app; providers + layout dispatch. |
| `pages/_document.page.tsx` | SSR `<html>`, stitches CSS, ESPN theme className. |
| `pages/_error.page.tsx` | Error page with its own `getPageLayout`. |
| `pages/api/**` | healthcheck, akamai-healthcheck, footer-preview, MSW control endpoints. |
| `pages/commerce/**`, `pages/identity/**`, `pages/profiles/**` | Route stubs. |
| `pages/landing.page.tsx`, `pages/login.page.tsx` | Internal dev login/landing. |
| `pages/mock-documents/sca/*.html.page.tsx` | Fake 3DS/SCA challenge + DDC documents. |
| `src/common/build-get-server-side-props/` | **ESPN's wrapper around the shared SSP builder.** |
| `src/common/layouts/` | `page-layout.tsx`, `legacy-application-layout.tsx`, `utils/render-consent.tsx`. |
| `src/layout/` | `espn-layout.tsx`, `hydrate-data-interface.tsx`. |
| `src/common/footer/footer.tsx` | ESPN `GlobalFooter` wrapper over `@solo/footer`. |
| `src/common/icons/` | ESPN-flavoured icons (`check`, `cross`, `lock`, `plus`, `reload`, addon checkbox). |
| `src/hooks/` | `use-fetch-espn-adobe-common-data`, `use-set-espn-adobe-common-data`. |
| `src/queries/` | `use-flex-subscriber-cohorts` + browser mocks. |
| `src/commerce-espn-dict-keys.generated.ts` | **Generated** SSR dictionary-key allowlist. |
| `src/test/setup/*` | 10 Jest setup files (MSW, dictionary, router, intl, instrumentation…). |
| `server-mocks/`, `browser-mocks/` | MSW handler wiring (server + browser). |
| `playwright/` + `playwright.config.ts` | 19 E2E spec files. |
| `Dockerfile`, `entrypoint.sh`, `.dockerignore` | Container packaging. |
| `.env`, `.env.development`, `.env.test`, `.env.local`, `.env.local.example` | Env layering. |
| `turbo.json` | Turbo task overrides (extends root). |
| `tailwind.config.cjs`, `postcss.config.cjs`, `.stylelintrc.js` | Styling toolchain. |
| `emotion-core-stub.ts` | tsconfig alias target for `@emotion/core`. |
| `sonar-project.properties` | SonarQube project (`cgi-client:commerce-espn`). |

Notably **absent**: no `src/account/`, `src/identity/`, `src/payments/`, `src/profiles/` dirs — the
`apps/commerce/AGENTS.md:36-48` generic tree is **stale for ESPN**. ESPN's `src/` is only
`common/`, `hooks/`, `layout/`, `queries/`, `test/`, `types/`. **CONFIRMED** (directory listing).

### 1.3 `public/` is nearly empty — **CONFIRMED**

Only two files: `favicon.ico` (15 KB) and `mockServiceWorker.js` (MSW's generated worker). No brand
logos, no manifest, no robots.txt in the app. Brand imagery comes from Ripcut/`static-assets.bamgrid.com`
at runtime (see `next.config.js:101-112` `images.remotePatterns`).

---

## 2. The Tenant Switch — How the Code Knows It Is ESPN

There is **no single brand enum**. There are **five distinct, partly-overlapping** mechanisms. This is
the highest-value section for a newcomer.

### 2.1 Mechanism 1 — `process.env.PRODUCT` (server-only, the primary switch)

**CONFIRMED** — declared once, in the app's committed `.env`:

```
# apps/commerce/espn/.env:20
PRODUCT=espn
```

Canonical type — **CONFIRMED** `packages/developer-experience/types/src/index.d.ts:155`:

```ts
export type ProductName = 'disneyPlus' | 'hulu' | 'espn';
```

So the three literals are `disneyPlus` (camelCase!), `hulu`, `espn`. **ESPN's literal is `espn`, never
`espnPlus`** in `ProductName` space. Consumers:

| Consumer | Location | What it derives |
|---|---|---|
| `getInitialGlimpseConfig` | `packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts:293` | Glimpse `appName` + `partner`; **throws** if `PRODUCT` unknown |
| `buildGetServerSideProps` | same file `:394` | `productUrlOrigin`, `productMetaData`, Sparrow `productName` |
| `getProductNameForMocks` | `packages/cgi/commerce-base/src/common/lib/get-product-name-for-mocks.ts:19` | MSW mock selection; falls back to `publicRuntimeConfig.productNameForMocks`, then `'disneyPlus'` |
| `env-log` boot log | `packages/cgi/commerce-base/src/common/constants/env-log.ts:26` | Prints `WARNING: PRODUCT not set, mocks will misbehave!` |
| Jest coverage script | `apps/commerce/espn/package.json` (`coverage:jest`) | `PRODUCT=espn jest --coverage` |
| Playwright | `apps/commerce/espn/playwright.config.ts:107` | `env: { PRODUCT: 'espn' }` on the webServer |
| Jenkins | `ci/espnplus/commerce:35` | `PRODUCT: 'espn'` |
| Turbo cache key | `apps/commerce/espn/turbo.json:5` | `"env": ["PRODUCT", "NEXT_PUBLIC_FLEX_LOCAL_SERVICE"]` |

**CONFIRMED gotcha:** `packages/cgi/commerce-base/next.config.js:19` defaults
`process.env.PRODUCT ?? 'disneyPlus'`. If `PRODUCT` leaks unset in an ESPN context, you silently get
Disney+ mocks/config rather than an error.

### 2.2 Mechanism 2 — `productConfigMap` / `metadataByProduct` (the ESPN identity table)

**CONFIRMED** — `packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts:154-175`:

```ts
export const productConfigMap: { [key in ProductName]: … } = {
  disneyPlus: { appName: 'Disney+', partner: 'disney',  url: 'https://www.disneyplus.com' },
  espn:       { appName: 'ESPN',    partner: 'espn',    url: 'https://plus.espn.com' },
  hulu:       { appName: 'Hulu',    partner: 'hulu',    url: 'https://www.hulu.com' },
};
```

Note the **two-namespace split**: `ProductName` is `espn`, and the Glimpse/session **`partner`** is also
`espn` — but Disney+ is `disneyPlus` as product and **`disney`** as partner. That mismatch is the
single most common source of brand-check bugs.

`MetadataAppName` enum (`:55-59`) uses yet another key set — `hulu | disney | espn`:

```ts
export enum MetadataAppName { hulu = 'Hulu', disney = 'Disney+', espn = 'ESPN' }
```

ESPN SEO/OG metadata — **CONFIRMED** `:207-228`:
- `productImage`: `https://static-assets.bamgrid.com/product/espn/images/share-default.b8a8bdc4a47234445c83e2d4c0c30c1b.png`
- `productTwitterHandle`: `@ESPN`
- OG image is **1296×729 `image/x-png`** (D+ and Hulu are 1200×630 `image/jpeg`) — ESPN is the odd one out.
- Fallback title/description still point at the legacy key `commerce_pagetitle_fallback` (Hulu has been
  migrated to `fallback_page_title`/`fallback_page_description`; ESPN + D+ have a `TODO WEB-11012`).

### 2.3 Mechanism 3 — `partnerName` from the session (runtime, client-side)

**CONFIRMED** — `partnerName` comes from `useSessionInfo().data?.partnerName`, i.e. the BAMTech session,
not from env. Values checked in code are `'disney' | 'hulu' | 'espn'`. Live ESPN branches:

| Location | Branch |
|---|---|
| `packages/cgi/commerce-base/src/payments/payment-forms/components/payments-container/payments-container.tsx:799-801` | `partnerName === 'disney' \|\| partnerName === 'espn'` |
| `packages/cgi/commerce-base/src/payments/payment-forms/components/change-payment-forms-container/change-payment-forms-container.tsx:89,95` | `partnerName === 'espn' \|\| isInCardNumberFieldFirstExperiment` (card-number-field-first layout) |
| `packages/cgi/commerce-base/src/common/context/toodles/toodles.tsx:213,235,237,288` | ESPN-specific Toodles debug panel behaviour; `isDeployingToMariner = ['hulu','espn'].some(...)` |
| `packages/cgi/commerce-base/src/retention/cancel/hooks/use-cancel-contract-auth-redirect.ts:83-88` | partner-scoped cancel-contract redirect |
| `packages/cgi/commerce-base/src/common/footer/hooks/use-generate-regulated-cancel-subscription-handler.ts:33,136,160` | sibling-site subscription detection (`subscription?.partner !== partnerName`) |

**INFERRED** — because `partnerName` is session-derived, an ESPN-app page can legitimately observe
`partnerName === 'disney'` (a D+ subscriber managing an ESPN-linked account), which is exactly why
these checks exist separately from `PRODUCT`.

### 2.4 Mechanism 4 — theme / `ThemeName` (styling namespace)

**CONFIRMED** — `packages/cgi/commerce-base/src/common/styles/stitches.config.ts:69`:

```ts
export type ThemeName = 'base' | 'disneyPlus' | 'hulu' | 'espn';
```

ESPN theme file: `packages/cgi/commerce-base/src/common/styles/themes/espn.ts`, re-exported at
`themes/index.ts:3`. Applied once, outside React, in `_document`:

```tsx
// apps/commerce/espn/pages/_document.page.tsx:3,17
import { espn as espnTheme } from '@solo/commerce-base/src/common/styles/themes';
const defaultClassName = createTheme(espnTheme.theme).className;   // WEB-2277
```

Other espn-keyed enums (all literal `'espn'`): `addon-checkbox-icon.tsx:16`,
`account/success/__browser-mocks__/screen.ts:8`, `account/change-subscription/__browser-mocks__/screens.ts:53`,
`signup/student/hooks/use-student-brand.ts:23` (`themeName: 'espn'`).

### 2.5 Mechanism 5 — `tenant` string (footer + Flex/Cannonball namespace)

**CONFIRMED** — a *fourth* naming space, `'disney' | 'espn' | 'hulu'` (note: `disney`, not `disneyPlus`):

- `packages/cgi/commerce-base/src/common/services/flex/models/actions.types.ts:116` — `export const tenants = ['disney', 'espn', 'hulu'];`
- `apps/commerce/espn/src/common/footer/footer.tsx:70` — `<Footer tenant="espn" …>`
- `apps/commerce/espn/pages/api/footer-preview.api.ts:27` — `tenant: String(tenant) as 'disney' | 'hulu' | 'espn'`
- `apps/commerce/espn/src/common/build-get-server-side-props/build-get-server-side-props.ts:49` — `getFooterLayout({ tenant: 'espn', … })`
- `apps/commerce/espn/src/common/layouts/page-layout.tsx:109` — Datadog error context `tenant: 'espn'`

### 2.6 `process.env.NEXT_PUBLIC_*` — what actually exists

**CONFIRMED** — only two `NEXT_PUBLIC_` vars are used by the ESPN commerce app:

| Var | Values | Where |
|---|---|---|
| `NEXT_PUBLIC_API_MOCKING` | `disabled` (default, `.env:7`), `enabled` (integration), `playwright` (E2E) | `next.config.js:19`, `build-get-server-side-props.ts:408`, `package.json` dev scripts |
| `NEXT_PUBLIC_FLEX_LOCAL_SERVICE` | `enabled` | `package.json` `dev:local-flex`, `turbo.json:5` — only ESPN + disneyPlus have this script |

There is **no** `NEXT_PUBLIC_PRODUCT` / `NEXT_PUBLIC_BRAND`. Brand reaches the client via
`publicRuntimeConfig`, not `NEXT_PUBLIC_*`. **CONFIRMED** — `next.config.js:119-137`.

### 2.7 `publicRuntimeConfig` — the client-visible brand surface

**CONFIRMED** — `apps/commerce/espn/next.config.js:21,119-137`:

```js
const espnProductName = 'espn';
// …
publicRuntimeConfig: {
  datadogServiceName: `web-solo-commerce-${espnProductName}`,   // web-solo-commerce-espn
  productNameForMocks: isE2EMocking || !isProd ? espnProductName : undefined,
  datadogRUMEnv: process.env.DATADOG_RUM_ENV === 'prod' ? 'prod' : 'non-prod',
  datadogRUMBuildId: gitCommit,
  enableDictionaryDebugging: !isProd,
  isDebugToolingEnabled: process.env.ENABLE_DEBUG_TOOLING === 'true' || !isProd,
  isUsingLocalEdgeServer,
  remoteDictionariesToLoad: process.env.REMOTE_DICTIONARIES_TO_LOAD,
  yellowPagesId: process.env.YELLOW_PAGES_ID,
  pinnedPlatformOptions: { pinnedPlatformName, pinnedPlatformVersion },
  dapiSensitiveSecretsApiKey: process.env.DAPI_SENSITIVE_SECRETS_API_KEY,
}
```

`productNameForMocks` is **deliberately `undefined` in prod** — brand identity is not shipped to prod
clients this way. `serverRuntimeConfig` holds only `remoteConfigHeaders.Referer`
(`REMOTE_CONFIG_S3_ACCESS_KEY`) and `remoteConfigDefaultBackend` (`:138-143`).

### 2.8 Vocabulary cheat-sheet: which literal in which namespace — **CONFIRMED**

| Namespace | Disney+ | Hulu | ESPN | Defined at |
|---|---|---|---|---|
| `ProductName` / `PRODUCT` env | `disneyPlus` | `hulu` | `espn` | `packages/developer-experience/types/src/index.d.ts:155` |
| Glimpse `partner` / session `partnerName` | `disney` | `hulu` | `espn` | `build-get-server-side-props.ts:160-174` |
| `tenant` (footer, Flex) | `disney` | `hulu` | `espn` | `flex/models/actions.types.ts:116` |
| `ThemeName` | `disneyPlus` | `hulu` | `espn` | `stitches.config.ts:69` |
| `MetadataAppName` key | `disney` | `hulu` | `espn` | `build-get-server-side-props.ts:55-59` |
| Sparrow workspace | `commerce-disneyplus` | `commerce-hulu` | `commerce-espn` | `load-sparrow-config.ts:64` |
| npm package | `@solo/commerce-disney` | `@solo/commerce-hulu` | `@solo/commerce-espn` | per-app `package.json` |
| Jenkins app | `disneyplus-commerce` | `hulu-commerce` | `espnplus-commerce` | `ci/espnplus/commerce:11` |
| Vault service | — | — | `espnplus-commerce` | `apps/commerce/espn/.env.local.example:6` |
| Datadog service | — | — | `espnplus-commerce` (`.env:13`) / `web-solo-commerce-espn` (RUM) | `.env:13`, `next.config.js:123` |
| Datadog CI service | `cup_commerce/apps/disneyplus` | `cup_commerce/apps/hulu` | `cup_commerce/apps/espn` | `.github/workflows/apps-lint-and-test.yml:32` |

**Six different spellings of "ESPN" across the stack** — all happen to be `espn` except the Jenkins/Vault/DD
ones (`espnplus-*`) and the RUM one (`web-solo-commerce-espn`). Disney+ is the one whose spellings
genuinely diverge, so any `if (brand === X)` you write must be namespace-aware.

---

## 3. Scripts, Env Vars, Ports, Local URLs

### 3.1 Root-level ESPN scripts — **CONFIRMED** (`package.json`)

| Script | Command |
|---|---|
| `dev:commerce:espn` | `turbo dev --filter=@solo/commerce-espn` (`:35`) |
| `dev:commerce:integration:espn` | `turbo dev:integration --filter=@solo/commerce-espn` (`:38`) |
| `build:commerce:espn` | `turbo build --filter=@solo/commerce-espn` (`:15`) |
| `lint:commerce:espn` | `turbo lint --filter=@solo/commerce-espn` (`:55`) |
| `lint:type-check:commerce:espn` | `turbo lint:type-check --filter=@solo/commerce-espn` (`:67`) |
| `test:commerce:jest:espn` | `turbo coverage:jest --filter=@solo/commerce-espn` (`:92`) |
| `test:commerce:jest:report:espn` | `turbo coverage:report:jest --filter=@solo/commerce-espn` (`:95`) |
| `test:commerce:playwright:espn` | `turbo test:playwright --filter=@solo/commerce-espn` (`:98`) |
| `test:commerce:playwright:headless:espn` | `turbo test:playwright:headless --filter=@solo/commerce-espn` (`:100`) |
| `lint:data-interface-espn` / `lint:type-check:data-interface-espn` / `test:data-interface-espn:coverage` | `--filter=@solo/data-interface-espn` (`:59,70,105`) |

There is **no root `dev:commerce:local-flex:espn`** — you must run `pnpm --filter @solo/commerce-espn dev:local-flex`
directly. **CONFIRMED** (root script list contains no such entry).

### 3.2 App-level scripts — **CONFIRMED** (`apps/commerce/espn/package.json`)

```jsonc
"dev":            "pnpm -w check-commerce-secrets && pnpm prebuild && npm run dev:start",   // :29
"dev:integration":"NEXT_PUBLIC_API_MOCKING=enabled npm run dev:start",                      // :30
"dev:local-flex": "NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled npm run dev:start", // :31
"dev:proxy":      "wait-on -l http://local.plus.espn.com:5040/healthcheck && PORT=5004 TARGET_PORT=5040 TARGET_HOST=127.0.0.1 pnpm exec wcs ssl-proxy -c ../../.certs -p 5004 --ignore-ws-errors true", // :32
"dev:start":      "pnpm run local-setup concurrently --names \"PROXY,SERVER\" \"npm run dev:proxy\" \"PORT=5040 next dev\"", // :33
"local-setup":    "WITH_TRAFFIC_DIRECTOR=$([ \"$(docker ps -aq -f name=traffic-director -f status=running)\" ] && echo 'true' || echo 'false') WITH_EDGE_SERVER=$([ \"$(docker ps -aq -f name=edge -f status=running)\" ] && echo 'true' || echo 'false')", // :39
"prebuild":       "pnpm --filter @solo/dictionary extract-ssr-keys \"$PWD\" commerce-espn",
"build":          "pnpm prebuild && next build",
"start":          "NODE_ENV=production NODE_OPTIONS=\"--require dd-trace/init\" next start --keepAliveTimeout 61000",
"coverage:jest":  "echo \"check unit coverage...\" && PRODUCT=espn jest --coverage",
"test:playwright":"pnpm clean:coverage:playwright && PRODUCT=espn playwright test --ui",
"test:playwright:headless": "pnpm clean:coverage:playwright && PRODUCT=espn playwright test",
"profile":        "… PORT=5040 DD_SERVICE=cup_commerce_espn NODE_OPTIONS=\"--inspect\" next dev",
"analyze":        "ANALYZE=true turbo build --force",
"datadog-agent:start": "DD_VERSION=$(npm pkg get version) docker compose -f ../../datadog/docker-compose.local.yml --env-file .env --env-file .env.local up --build -d",
"coverage:jest:ci":"../../../scripts/utils/run-tests-upload-datadog.sh cup_commerce/apps/espn",
```

### 3.3 Ports and local URLs — **CONFIRMED** (all three apps, for contrast)

| App | Next port | SSL-proxy port | Local hostname | Local URL you open |
|---|---|---|---|---|
| Disney+ | 5010 | 5001 | `local.disneyplus.com` | `https://local.disneyplus.com:5001` |
| Hulu | 5030 | 5003 | `local.huluqa.com` | `https://local.huluqa.com:5003` |
| **ESPN** | **5040** | **5004** | **`local.plus.espn.com`** | **`https://local.plus.espn.com:5004`** |

**CONFIRMED gotcha:** `apps/commerce/AGENTS.md:86` says `pnpm dev:commerce:espn # https://local.espn.com`.
That hostname is **wrong** — it is `local.plus.espn.com`. The `local.espn.com` form appears nowhere
in the certs or scripts; the certificate list contains `local.plus.espn.com` and `localhost.espn.com`
but not `local.espn.com`. (`scripts/var/settings.sh:3`)

ssl-proxy is **always started** by `dev:start` (`concurrently` with `PROXY` and `SERVER`), and it
`wait-on`s `http://local.plus.espn.com:5040/healthcheck` before binding — so if `/etc/hosts` lacks the
mapping, dev hangs at "waiting". **CONFIRMED** (`package.json:32`).

Cert domains include ESPN — **CONFIRMED** `scripts/var/settings.sh:3`:

```
CERTIFICATE_DOMAINS="local.disneyplus.com local.hulu.com local.huluqa.com localhost.disneyplus.com
localhost.hulu.com localhost.huluqa.com local.qa-disney.api.edge.bamgrid.com
local.client-sdk-configs.bamgrid.com local.plus.espn.com localhost.espn.com
local.qa-espn.api.edge.bamgrid.com local.appsupport.com"
```

CI mirrors this — `.github/composite-actions/shared/setup-local-ssl/action.yml:27,36` runs `mkcert … local.plus.espn.com`
and `echo "127.0.0.1 local.plus.espn.com" | tee -a /etc/hosts`.

### 3.4 Env-file layering — **CONFIRMED**

| File | Committed? | Contents |
|---|---|---|
| `.env` | yes | 20 lines: `PRODUCT=espn`, `REMOTE_CONFIG_URL` template, `AWS_REGION=us-east-1`, `REMOTE_CONFIG_VERSION=1.0`, `REMOTE_CONFIGS_TO_LOAD=prod,beta,preview,qa,qa-local,beta-local,preview-local,prod-local`, `REMOTE_CONFIG_DEFAULT=qa`, `REMOTE_DICTIONARIES_TO_LOAD=accessibility,identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding`, `NEXT_PUBLIC_API_MOCKING=disabled`, `NEXT_TELEMETRY_DISABLED=1`, `DATADOG_RUM_ENV=non-prod`, `LOCAL_EDGE_SERVER=disabled`, `YELLOW_PAGES_ID=6616b21135f3fecb74145117`, `CONTAINER_NAME=espnplus_commerce_datadog_agent_local`, `DD_SERVICE=espnplus-commerce`, `DD_TAGS=jest:test`, `DD_TRACE_SAMPLING_RULES`, `PINNED_PLATFORM_NAME=web-cup`, `PINNED_PLATFORM_VERSION=1.0`, `SPARROW_CONFIG_URL` template, `SPARROW_VERSION=latest` |
| `.env.development` | yes | `NODE_TLS_REJECT_UNAUTHORIZED=0` (one line — needed for the self-signed local proxy) |
| `.env.test` | yes | `REMOTE_CONFIG_S3_ACCESS_KEY=test-placeholder`, `DAPI_SENSITIVE_SECRETS_API_KEY=test-placeholder` |
| `.env.local.example` | yes | Documents the two secrets + **Vault service `espnplus-commerce`, namespace `60c7e031310ce5f580d4db16`, environment `staging`** |
| `.env.local` | **no** (gitignored) | The two real secrets. `pnpm -w check-commerce-secrets` (`scripts/lib/check-commerce-secrets.sh`) gate-checks it before `dev`. |

The only two secrets the ESPN app needs locally are `DAPI_SENSITIVE_SECRETS_API_KEY` and
`REMOTE_CONFIG_S3_ACCESS_KEY`. **CONFIRMED** (`.env.local.example:10-11`).

### 3.5 Docker-detected local modes — **CONFIRMED**

`local-setup` (`package.json:39`) probes running Docker containers and exports:
- `WITH_TRAFFIC_DIRECTOR=true` if a container named `traffic-director` is running →
  `next.config.js:70-72` sets `assetPrefix = '/commerce/'`.
- `WITH_EDGE_SERVER=true` if a container named `edge` is running →
  `publicRuntimeConfig.isUsingLocalEdgeServer`.

Both are hard-gated `!isProd` (`next.config.js:14-17`), so they can never affect a prod build.

---

## 4. Routing / Pages Inventory

### 4.1 `pageExtensions` — **CONFIRMED**

`apps/commerce/espn/next.config.js:115` — `pageExtensions: ['page.tsx', 'api.ts']`.
Consequences: co-located `*.test.tsx` files inside `pages/` are **not** routes; and
`instrumentation.page.tsx` must carry the `.page.tsx` extension or Next silently ignores it
(explicitly documented at `apps/commerce/espn/instrumentation.page.tsx:7-9`).

### 4.2 Rewrites / redirects — **CONFIRMED**

`next.config.js:239-250` — only **two rewrites**, no redirects at all:

```js
rewrites: async () => [
  { source: '/healthcheck',                  destination: '/api/healthcheck' },
  { source: '/commerce/akamai-healthcheck',  destination: '/api/commerce/akamai-healthcheck' },
]
```

The middleware performs a **third**, dynamic rewrite (language/locale stripping) — §4.5.

### 4.3 Counts — **CONFIRMED** (computed over `pages/**/*.page.tsx`, excluding `.test.`)

| App | Page files |
|---|---|
| Disney+ | 106 |
| **ESPN** | **79** |
| Hulu | 63 |
| Distinct across all three | 121 |
| Present in all three | 46 |

### 4.4 ESPN route inventory

**`/commerce/*` (37 routes)** — `account`, `activate/[provider]`, `activate/callback`,
`activate/error`, `activate`, `activate/success`, `add-ons`, `billing-history`, `billing`, `cadence`,
`cancel/[slug]`, `cancel/landing`, `cancel/pause`, `cancel/success`, `challenge/success`,
`change-payment`, `change-subscription`, `change-subscription/confirm`, `change-subscription/success`,
`extra-member/[slug]`, `extra-member/accept`, `extra-member`, `extra-member/invite-not-valid`,
`extra-member/manage-access`, `extra-member/manage-access/removal-success`,
`extra-member/not-eligible`, `extra-member/restart-subscription`, `gift` (+`authenticated`,
`review`, `success`, `value`), `/commerce` (root), `pause`, `pause/success`,
`payment-processing`, `plans`, `portability`, `redeem`, `restart-subscription/confirm`,
`restart-subscription/success`, `review-subscription`, `student`, `student/loading`,
`subscription`, `success`, `unlock`, `welcome-back`.

**`/identity/*` (16)** — `begin/[...slug]`, `begin`, `loading`, `login/[slug]`, `login`, `logout`,
`magic`, `nielsen`, `oauth-review-terms`, `review-and-accept`, `sign-up/[slug]`, `sign-up`, `start`,
`subscriber-agreement`, `update-credentials`, `verify`.

**`/profiles/*` (7)** — `consume-transfer`, `extra-member/accept/transfer/[slug]`,
`extra-member/accept/transfer`, `extra-member/accept/transfer/not-eligible`, `transfer/[slug]`,
`transfer`, `transfer/request/[slug]`, `transfer/request`.

**Root (2)** — `/landing`, `/login` (both re-export `@solo/commerce-base/src/dev/internal-login`, i.e.
**dev-only internal login helpers**).

**Catch-alls** — ESPN has exactly **one** catch-all: `identity/begin/[...slug].page.tsx` (required
`[...slug]`). Disney+ additionally uses the **optional** `[[...slug]]` form widely across `profiles/*`
(9 files); ESPN uses none of those. **CONFIRMED** (page matrix).

**API routes (7)** — `api/healthcheck`, `api/commerce/akamai-healthcheck`, `api/footer-preview`,
`api/msw/{start,stop,reset,use}`.

**Mock documents (2)** — `mock-documents/sca/challenge.html.page.tsx`, `.../ddc.html.page.tsx`
(3DS/SCA test artifacts; the only two page files with **no** `getServerSideProps`).

### 4.5 Cross-brand differential — **CONFIRMED**

**ESPN-only page (1):**
- `profiles/extra-member/accept/transfer/index.page.tsx` — **INFERRED** this is not a real ESPN
  exclusive but a divergence artifact: Disney+ has the same route as the optional catch-all
  `profiles/extra-member/accept/transfer/[[...slug]].page.tsx`, which absorbs the index. ESPN spells
  `index` + `[slug]` separately.

**Missing from ESPN, Disney+-only (30):** `commerce/activate/select-provider`,
`commerce/cancel-contract/{index,account,success}`, `commerce/interactive-payment`,
`commerce/payment-sandbox-redirect`, `commerce/upgrade`,
`commerce/withdraw-subscription/{index,account,failure,success}`, `identity/login/passkey`,
`parks/landing`, `parks/photos/slides`, and 17 `profiles/*` routes (`add-profile`, `adhoc-transfer/*`,
`complete-account-info`, `edit/[profileId]`, `loading`, `select`, `setup`, `sg-r21`,
`sk-age-verification`, `tastes`, `update/[profileId]`, plus the `[[...slug]]` variants).

**Missing from ESPN, Hulu-only (9):** `commerce/account/{manage-email-notifications,set-change-home,update-personal-info}`,
`commerce/activate/spotify/{index,connect,partner-confirm}`, `commerce/change-subscription/setup`,
`commerce/charges`, `commerce/purchase`.

**Missing from ESPN but present in both others (3):** `identity/delete/[slug]`,
`identity/manage-devices`, `profiles/adhoc-transfer/max-profiles`. **INFERRED** — these three are the
genuine ESPN feature gaps worth flagging.

**ESPN + Disney+ but not Hulu (27):** notably `commerce/add-ons`, `commerce/welcome-back`,
`commerce/subscription`, `commerce/portability`, `commerce/review-subscription`,
`commerce/payment-processing`, `commerce/unlock`, the whole `identity/{begin,login,logout,sign-up,…}`
set, `landing`, `login`, and the SCA mock documents. **INFERRED** — Hulu runs a separate identity
stack (`packages/identity-hulu`), which explains the `identity/*` absence.

**ESPN + Hulu but not Disney+ (5):** the non-catch-all `profiles/transfer*` spellings.

### 4.6 Per-brand page availability gating — **CONFIRMED**

Two layers, and the runtime one is what actually matters:

1. **Build-time (file presence).** A page simply not existing in `apps/commerce/espn/pages/` is a 404.
2. **Runtime (`isRouteEnabled`).** `packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts:65-86`
   is a `CompositionFunction` that reads `commerceAppConfig['feature-flags'].general[flag]` and returns
   `{ notFound: true }` when falsy, which Next renders as 404:

```ts
export function isRouteEnabled({ featureFlagName }: { featureFlagName: RouteEnablingFeatureFlags }): CompositionFunction {
  return function _isRouteEnabled(commerceAppConfig) {
    const { 'feature-flags': { general: featureConfig } } = commerceAppConfig;
    const isFlaggedRouteEnabled = featureConfig[featureFlagName as keyof …];
    if (isFlaggedRouteEnabled) return {};
    return { notFound: true };
  };
}
```

The allowlist of gate flags is `RouteEnablingFeatureFlagsList` (`:5-51`), ~45 entries.

**42 of 79 ESPN pages are flag-gated** — **CONFIRMED** (computed). Selected mapping:

| ESPN route | Gate flag | ESPN fixture default |
|---|---|---|
| `/commerce` | `enableCommerceUnifiedRootRoute` | `true` |
| `/commerce/plans` | `enableCommerceUnifiedPlans` | **`false`** |
| `/commerce/welcome-back` | `enableCommerceUnifiedWelcomeBack` | **`false`** |
| `/commerce/billing-history` | `enableCommerceUnifiedBillingHistory` | `true` |
| `/commerce/change-subscription`(+`/confirm`) | `enableCommerceUnifiedChangeSubscription` | `true` |
| `/commerce/cancel/*` | `enableCommerceUnifiedCancelRoute` (+`…CancelLandingRoute`, `enableCommerceMembershipPause`) | `true` / `true` / **`false`** |
| `/commerce/activate` | `enableCommerceUnifiedActivationRoute` | `true` |
| `/commerce/activate/[provider]`, `/error` | `enableCommerceUnifiedOutgoingActivationRoute` | `true` |
| `/commerce/activate/callback` | `enableCommerceUnifiedCallbackRoute` | `true` |
| `/commerce/add-ons` | `enableSignUpFlowAddOnsRoute` | (see fixture) |
| `/commerce/cadence` | `enableSignUpFlowCadenceRoute` | (see fixture) |
| `/commerce/gift/*` (5 pages) | `enableGiftCard` | (see fixture) |
| `/commerce/redeem` | `enableCommerceUnifiedRedemption` | `true` |
| `/commerce/student`, `/student/loading` | `enableCommerceUnifiedStudentRoute` | `true` |
| `/commerce/unlock` | `enableCommerceTiara` | (see fixture) |
| `/commerce/extra-member/*` | `enableCommerceUnifiedExtraMember` / `…ExtraMemberAccessRoute` | (see fixture) |
| `/commerce/pause`, `/pause/success` | `enableCommerceMembershipPause` | **`false`** |
| `/identity/begin` , `/identity/start` | `enableIdentityUnifiedLicensePlateFlow` | (see fixture) |
| `/identity/begin/[...slug]` | `enableLicensePlateDynamicRoutes` | (see fixture) |
| `/identity/sign-up`(+`[slug]`) | `enableIdentityCreateAccountRoute` | (see fixture) |
| `/identity/nielsen` | `enableIdentityUnifiedNielsenRoute` | (see fixture) |
| `/identity/subscriber-agreement` | `enableIdentityReviewAndAcceptRoute` | (see fixture) |
| `/identity/update-credentials` | `enableUpdateCredentialsRoute` | (see fixture) |

Flag defaults above come from the ESPN Sparrow **test fixture**
`packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts:5-30`.
**Real values come from Sparrow S3 at request time** — the fixture is only the mock/test baseline.

The 33 remaining ESPN pages have `getServerSideProps` but **no** flag gate (e.g. `/commerce/account`,
`/commerce/billing`, `/commerce/change-payment`, `/commerce/subscription`, most `profiles/*`).

Other composition functions in use across ESPN pages — **CONFIRMED** (computed):
`isRouteEnabled` ×40 call sites, `getLayoutConfigProp` ×30, `getLayoutConfigProps` ×9,
`getSubscriptionSuccessServerSideProps` ×2, `getGiftCardServerSideProps` ×2, `redirectUserToLogin` ×2,
`getChangePaymentPageProps`, `isSlugFound`, `getRedirectProp`, `redirectUserToRedirectURL` ×1 each.

### 4.7 Middleware — **CONFIRMED** (`apps/commerce/espn/middleware.page.tsx`)

```tsx
export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const { lang, locale, globalizedPathname } = geoNext(request);   // @solo/lang-locale-next
  const response = globalizedPathname && clonedUrlWithRewrittenPathname
      ? NextResponse.rewrite(clonedUrlWithRewrittenPathname)
      : NextResponse.next();
  response.headers.append('language', lang);
  response.headers.append('locale', locale);
  return response;
}
export const config = { matcher: '/((?!api|healthcheck).*)' };
```

This is why `/es-419/commerce/billing-history` works without a `[lang]` segment in `pages/`: the
middleware strips the locale prefix, rewrites to the bare path, and hands `language`/`locale` down as
**response headers**, which `getServerSideProps` then reads from `context.res.getHeaders()`
(`build-get-server-side-props.ts:372-388`) and `_document` reads via `ctx.res?.getHeader('language')`
(`_document.page.tsx:37-38`). ESPN's middleware is byte-identical in shape to the other brands
(**INFERRED** — not diffed, but it imports the same shared `geoNext`).

---

## 5. Config Plumbing

### 5.1 Sparrow (remote config) is the brand-config source of truth — **CONFIRMED**

The object every page receives as `pageProps.commerceAppConfig` is fetched at request time from
**Sparrow** (S3-hosted JSON), not from any file in the repo.

URL template — `apps/commerce/espn/.env:18`:
```
SPARROW_CONFIG_URL=https://fed-configs.s3.amazonaws.com/sparrow/[[WORKSPACE]]/[[SCOPE]]/[[CONFIG]]/[[VERSION]]/[[VARIANT]].json
```

Workspace derivation — `packages/cgi/commerce-base/src/common/lib/sparrow/load-sparrow-config.ts:61-65`:

```ts
const sparrowMergedConfig = await getSparrowMergedConfig<CommerceAppConfig>({
  ...sparrowRequestConfig,
  variant: backendService,
  workspace: `commerce-${productName.toLowerCase()}`, // Commerce workspace names are always lowercase
});
```

So ESPN → **`commerce-espn`**. The `.toLowerCase()` exists because Disney+'s `ProductName` is
`disneyPlus` → `commerce-disneyplus`; for ESPN it is a no-op.

`variant` = the **backend service** resolved from `dss_backend_services` cookie / query, defaulting to
`REMOTE_CONFIG_DEFAULT=qa` (`.env:5`). Allowed set: `prod,beta,preview,qa,qa-local,beta-local,preview-local,prod-local`
(`.env:4`). Results are LRU-cached, 40 entries, 5-minute TTL, keyed by `backendService`
(`load-sparrow-config.ts:15,31-35`). Cache is skipped when `NEXT_PUBLIC_API_MOCKING === 'playwright'`
(`build-get-server-side-props.ts:407-408`).

Auth to S3 is via a **`Referer` header** carrying `REMOTE_CONFIG_S3_ACCESS_KEY`
(`next.config.js:138-141`) — an unusual pattern worth knowing.

### 5.2 `CommerceAppConfig` shape for ESPN — **CONFIRMED**

From the ESPN fixture (`…/__fixtures__/espn/sparrow-commerce-espn-workspace.ts`, 531 lines), four top-level scopes:

| Scope | Line | Contents |
|---|---|---|
| `feature-flags` | `:5` | `general` — ~45 boolean route/behaviour flags (see §4.6) |
| `feature-configuration` | `:58` | `analytics`, `dictionary`, `general`, `oneId`, `braze`, `helpCenterUrl`, … |
| `countries` | `:226` | Continent → country → `{ featureFlags, footer[] }` overrides (e.g. `NA.AS`) |
| `paths` | `:453` | All outbound URLs and API base URLs |

**Dictionary config** (`:` inside `feature-configuration.dictionary`):
```ts
dictionary: {
  dictionaryTenant: 'espn',
  dictionaryVersions: { accessibility: '0.0', identity: '0.0', pcon: '0.0',
    'unified-commerce': '0.0', 'unified-commerce-onboarding': '0.0', 'unified-offers': '0.0' },
}
```

**Locales — ESPN supports exactly two** (`:160-169`):
```ts
supportedLangsMap: {
  en:        { dict: 'en',     hreflang: 'en' },
  'es-419':  { dict: 'es-419', hreflang: 'es' },
} as SupportedLangsMap
```
This is far narrower than Disney+/Hulu. **INFERRED** — much of the i18n machinery in `commerce-base` is
effectively inert for ESPN.

**OneID** (`:171-174`): `clientId: 'ESPN-ONESITE.WEB'`, `closeUrl: 'https://plus.espn.com'`,
`scriptUrl: 'https://stg.cdn.registerdisney.go.com/v4/OneID.js'`.

**Adobe analytics** (`:130-136`): `crossDomains: ['espn.com']`, `server`/`secureServer`: `'sw88.espn.com'`.

**Braze** (`:146`): `baseUrl: 'sdk.iad-03.braze.com'`.

**Help center** (`:159`): `https://support.espn.com`.

### 5.3 ESPN domain references — **CONFIRMED** (complete inventory of non-`.next`/`build` hits)

| Domain | Where | Meaning |
|---|---|---|
| `local.plus.espn.com` | `package.json:32`, `playwright.config.ts:12` (commented), `scripts/var/settings.sh:3`, `.github/composite-actions/shared/setup-local-ssl/action.yml:27,36` | **Local dev hostname** |
| `secure.web.plus.espn.com` | `src/layout/espn-layout.test.tsx:1060,1088`; `playwright/tests/flows/espn-internal-activation.spec.ts:102` | **Prod ESPN commerce host** (appears only in tests/fixtures in this repo) |
| `stage.web.plus.espn.com` | ESPN Sparrow fixture `:484,500,504`; Hulu fixtures | **Staging ESPN commerce host**; `paths.root_domain` |
| `plus.espn.com` | Sparrow fixture `:173` (`oneId.closeUrl`), `:68` in footer snapshots (`/business-jhp`); `productConfigMap.espn.url` in `build-get-server-side-props.ts:168` | **Marketing/product origin** |
| `sandbox.espn.com` | Sparrow fixture `:202,470,481,496-503` | **Non-prod ESPN watch/offers app** (plan selector, home, onboarding, welcome-back) |
| `qa.espn.com`, `espn.com` | Sparrow fixture `:205,206` (allowed-origins-style list at `:200-206`) | Origin allowlist |
| `support.espn.com` | Sparrow fixture `:159,486`; footer snapshots `:98` | Help center |
| `qa-espn.api.edge.bamgrid.com` | Sparrow fixture `:456` (`paths.commerce.base`), `:507-510` (dictionary URLs) | **ESPN QA API edge** |
| `espn.api.edge.bamgrid.com` | Sparrow fixture `:457` (`cancel_sub`) | ESPN prod API edge |
| `local.qa-espn.api.edge.bamgrid.com` | `scripts/var/settings.sh:3` | Local API-edge cert |
| `espnplus-static.bamgrid.com` | `ci/espnplus/commerce:38` (`STATIC_ENDPOINT`) | **Static asset CDN** |

**No cookie-domain configuration exists in the ESPN Sparrow config** — grepping the fixture for
`cookieDomain` returns nothing. **INFERRED** — cookies are set host-scoped by `cookies-next`
(`build-get-server-side-props.ts:328-331` sets `dss_sdk_config_env` with no `domain` option), or the
domain is handled by the identity SDK outside this config.

### 5.4 Cross-brand paths inside ESPN's config — **CONFIRMED** (important)

`paths.paths.commerce` in the ESPN config carries **Disney+ URLs too** (`:458-468`):
`disney_account_details`, `disney_plan_selector`, `disney_plan_switch`, `disney_plan_switch_ledger`,
`disney_signup_preview`, `disney_upsell_interstitial` → all `https://stage-web.disneyplus.com/...`.
And the ESPN-side entries are **relative** (`espn_account_details: '/commerce/account'`,
`espn_plan_switch: '/commerce/change-subscription'`). So the same config object drives cross-brand
hand-offs; the app is expected to link out to Disney+ for bundle flows.

`paths.paths.activate` (`:519-529`) lists external partner activation targets: `hulu`
(`signup.huluqa.com`), `raptor_us` (`stage.venu.com`), `foxone_us` (`stage-subs.fox.com`),
`mlb_us` (`qa-gcp.mlb.com/commerce/link-account/espn/provider`), `nfl_us` (`staging-id.nfl.com`).

`ripcut`, `ripcutRaw`, and `orchestrationUrl` all point at **`qa-disney.*`** hosts even in the ESPN
config (`:513-518`) — image delivery and GraphQL orchestration are Disney-shared. **CONFIRMED.**

### 5.5 `next.config.js` security headers — **CONFIRMED** (`:23-60`)

Applied to `/:path*`: `Cache-Control: public, max-age=900, stale-while-revalidate=59`,
`Content-Security-Policy: frame-ancestors 'self'`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Strict-Transport-Security: max-age=15552000; includeSubDomains`, `X-Content-Type-Options: nosniff`,
`X-DNS-Prefetch-Control: off`, `X-Frame-Options: DENY`,
`X-Permitted-Cross-Domain-Policies: none`, plus legacy `X-UA-Compatible: IE=Edge`.
`poweredByHeader: false`, `generateEtags: false`, `productionBrowserSourceMaps: true`.

### 5.6 Build-output directories — **CONFIRMED** (`next.config.js:81-87`)

```js
function getDistDir() {
  if (isE2EMocking && isProd) return 'build-test';  // NEXT_PUBLIC_API_MOCKING=playwright + prod
  if (isProd) return 'build';
  return '.next';
}
```
Three possible output dirs. `generateBuildId: () => gitCommit` (first 8 chars of `GIT_COMMIT`, else `'LOCAL'`).

### 5.7 Webpack customizations — **CONFIRMED** (`next.config.js:146-238`)

1. **Rive chunk splitting** (prod, client only, `:172-183`): forces `@rive-app/*` into a named `rive.js`
   chunk (`enforce: true`, `priority: -10`, `reuseExistingChunk`). ~500 kB library used on few pages.
2. **Source maps**: `devtool = 'eval-source-map'` when `!isProd && !isE2EMocking`, else `false`;
   `SourceMapDevToolPlugin` appends `//# sourceMappingURL=${SOURCE_MAP_URL}/[url]` (`:185-191`).
3. **Intl locale-data ignored on the server** (`:195-210`, `IgnorePlugin` on
   `@formatjs/intl-listformat/locale-data`) — WEB-12548.
4. **MSW alias stripping** (`:219-234`): server drops `msw/browser`, client drops `msw/node`
   (mswjs/msw#1801). Plus `serverExternalPackages: ['msw']` (`:98`).
5. `transpilePackages` = every `@solo/*` dep and devDep, computed from `package.json` (`:8-11`).

---

## 6. Layout / Provider Stack for an ESPN Page Render

### 6.1 `_app` dispatch — **CONFIRMED** (`apps/commerce/espn/pages/_app.page.tsx`)

Module-level side effects run **before** React (`:18-21`):
`initDatadog()`, `polyfillIntl()`, `polyfillReplaceAll()`, `enableMapSet()` (immer).

Root render (`:97-101`):
```tsx
<JotaiProvider>
  <QueryProvider>{getLayout()}</QueryProvider>
</JotaiProvider>
```

`getLayout()` is a **three-way dispatch** (`:84-95`):
1. `Component.getPageLayout(layoutProps)` — **CUP V2** path. `layoutProps = { page, pageProps, router }`.
2. else `Component.getLegacyLayout(legacyLayoutProps)` — **CUP V1** path (~24 explicit props).
3. else `getDefaultPageLayout(legacyLayoutProps)` — fallback, from `src/common/layouts/page-layout.tsx:186`.

**Maintenance short-circuit** (`:43-53`): if `Component.maintenance?.flag` is set and the matching
`pageProps.commerceAppConfig['feature-flags'].general[flag]` is truthy, the page component is replaced
by `<ServiceUnavailable message={Component.maintenance?.message} />` *before* layout selection — so the
layout chrome still renders around the maintenance notice.

`CustomApp.getInitialProps` (`:104-113`) only calls `App.getInitialProps` and logs
`{ url } 'Page Requested'` via `getLogger('_app.page')`.

### 6.2 `_document` — **CONFIRMED** (`apps/commerce/espn/pages/_document.page.tsx`)

- `createTheme(espnTheme.theme).className` computed **at module scope** (`:17`) to avoid a flash of
  unstyled content (WEB-2277).
- `<Html lang={locale ? `${language}-${locale}` : language}>` (`:47,50`), values read from the
  middleware-set response headers (`:37-38`).
- Two inline `<style>` blocks: stitches `getCSSText()` and `@solo/mydisney-ui` `getCssText()` (`:52-58`).
- `<Metadata productName="espn" />` (`:59`) — the one hardcoded brand literal in `_document`.
- `<body className={defaultClassName}>` (`:61`).

### 6.3 `PageLayout` — the ESPN default page layout — **CONFIRMED** (`src/common/layouts/page-layout.tsx`)

Ordered tree (`:132-183`):

```
<GlobalStyles />                                  ← must precede any content-rendering component
<SearchEngineOptimizationMetaData … />            ← peer of the app layout so SEO survives a throw
<LegacyApplicationLayout …>
  <DevelopmentLayout />
  <OneId />
  <RenderConsent commerceAppConfig={…} />
  <VisualLayout adobePageName commerceAppConfig GlobalFooterComponent={GlobalFooter}>
    {isLoginRequired
      ? <OneIdWrapper isLoginRequired>
          <LoginRequired authRedirectTarget={actualAuthRedirectTarget}>{children}</LoginRequired>
        </OneIdWrapper>
      : <>{children}</>}
  </VisualLayout>
</LegacyApplicationLayout>
```

ESPN-specific details:
- `GlobalFooterComponent={GlobalFooter}` (`:169`) injects ESPN's footer wrapper — **this is the brand
  seam**; the shared `VisualLayout` is footer-agnostic.
- **Missing-config guard** (`:93-119`): if `commerceAppConfig` is absent, it reports to Datadog RUM with
  `tenant: 'espn'`, `owner: Owners.CORE`, `sourceComponent: 'PageLayout'`, **strips `dictionary` and
  `children` from the payload first**, and renders `<StaticErrorLayout>`.
- `isLoginRequired` **defaults to `true`** (`:74`) — auth is opt-out, not opt-in.
- `fallbackNoIndexConfig = { noIndex: isLoginRequired }` (`:125`) — authed pages are noindex by default.
- `actualAuthRedirectTarget = authRedirectTarget ?? commerceAppConfig.paths.paths.commerce.login ?? '/identity/login'` (`:127-130`).

### 6.4 `LegacyApplicationLayout` — **CONFIRMED** (`src/common/layouts/legacy-application-layout.tsx`)

```
<ApplicationErrorBoundary commerceAppConfig dictionary>
  <HydrateBaseAtoms … />                       ← Jotai hydration of ~13 SSR props
  <BrowserMocks>                               ← MSW gate; anything doing network I/O must be inside
    <HydrateESPNDeviceAttributeProvider>       ← ESPN-SPECIFIC
      <HydrateDataInterface shouldUseOptimizedVersion={…enableDictionaryClientGating} dictionary>
        <SetDatadogUserContext />
        <LoadAnalytics />                      ← ESPN-SPECIFIC (Adobe common data)
        <LanguageRedirect>{children}</LanguageRedirect>
        <PortalToodles />
      </HydrateDataInterface>
    </HydrateESPNDeviceAttributeProvider>
  </BrowserMocks>
</ApplicationErrorBoundary>
```

### 6.5 `ESPNLayout` — the CUP V2 sibling — **CONFIRMED** (`src/layout/espn-layout.tsx:109-140`)

```tsx
<BrowserMocks>
  <HydrateAvatarFallbackStyle avatarFallbackStyle="letter" />        {/* ESPN: letter avatars */}
  <HydrateESPNDeviceAttributeProvider>
    <HydrateDataInterface shouldUseOptimizedVersion={…enableDictionaryClientGating} dictionary>
      <PortalToodles />
      <SetDatadogUserContext />
      <RenderConsent commerceAppConfig><LoadAnalytics /></RenderConsent>
      <OneId />
      <LanguageRedirect>{children}</LanguageRedirect>
    </HydrateDataInterface>
  </HydrateESPNDeviceAttributeProvider>
</BrowserMocks>
```

**CONFIRMED trap:** `ESPNLayout` and `LegacyApplicationLayout` each define their **own private
`LoadAnalytics`** with *different* consent logic:
- `espn-layout.tsx:49-57` — flag-aware: `useMystiqueFeatureFlags()['wpnx-use-privacy-consent-package']`
  chooses between `useHasPrivacyConsent()` (new `@solo/privacy-consent`) and `useHasOneTrustConsent()`.
- `legacy-application-layout.tsx:54-56` — OneTrust only, plus `useToggleAdobeAnalytics(hasOneTrustConsent)`.

`legacy-application-layout.tsx:34` carries `TODO: WEB-27451` for this duplication.

### 6.6 Brand-conditional providers — the definitive list

| Provider | ESPN-specific? | Evidence |
|---|---|---|
| `JotaiProvider`, `QueryProvider` | No — shared | `_app.page.tsx:98-99` |
| `ApplicationErrorBoundary`, `HydrateBaseAtoms` | No | `legacy-application-layout.tsx:146,150` |
| **`HydrateESPNDeviceAttributeProvider`** | **YES** — wraps `new ESPNDeviceAttributeProvider()` from `@solo/sdk-session/src/espn-device-attribute-provider`, guarded by `isBrowser()` | `espn-layout.tsx:88-98`, `legacy-application-layout.tsx:85-95` |
| **`HydrateDataInterface`** | **YES** — builds `buildDataInterface` from `@solo/data-interface-espn/src/data-interface` | `src/layout/hydrate-data-interface.tsx:5` |
| **`LoadAnalytics`** | **YES** — uses `useFetchESPNAdobeCommonData()` | `espn-layout.tsx:38`, `legacy-application-layout.tsx:40` |
| **`GlobalFooter`** | **YES** — `<Footer tenant="espn" fallback={espnFooterFallback}>` | `src/common/footer/footer.tsx:70,79` |
| `HydrateAvatarFallbackStyle` | Brand-**valued** (`"letter"`), shared component | `espn-layout.tsx:119` |
| `OneId` / `OneIdWrapper` | Shared component, ESPN-valued config (`clientId: 'ESPN-ONESITE.WEB'`) | `page-layout.tsx:164`, Sparrow fixture `:172` |
| `RenderConsent` | ESPN-**owned file** (`src/common/layouts/utils/render-consent.tsx`) but same shape as siblings | `page-layout.tsx:165` |
| `BrowserMocks` | ESPN-owned wrapper (`src/test/components/browser-mocks.tsx` → `espn-browser-mocks.tsx`) | `espn-layout.tsx:118` |
| `PortalToodles`, `SetDatadogUserContext`, `LanguageRedirect`, `DevelopmentLayout`, `VisualLayout`, `LoginRequired` | No — shared | various |

### 6.7 `HydrateDataInterface` — two variants — **CONFIRMED** (`src/layout/hydrate-data-interface.tsx`)

- `_HydrateDataInterfaceOriginal` (`:18`) — gates only on SDK readiness.
- `HydrateDataInterfaceOptimized` (`:120`) — **additionally** gates on `useDictionaryQuery()` success,
  returning `null` until the client-side dictionary loads, to prevent
  `MISSING_CYPHER_KEY_IN_DICTIONARY` errors caused by server-side dictionary optimization (`:111-118`).
- The selector is `shouldUseOptimizedVersion = commerceAppConfig['feature-flags'].general.enableDictionaryClientGating`,
  with `TODO: GCIEX-4196 - Remove when gating validated in production` (`:182`).

### 6.8 ESPN footer — **CONFIRMED** (`src/common/footer/footer.tsx`)

```tsx
<Footer
  tenant="espn"
  type={FooterTypes.ACCOUNT_MANAGEMENT}
  cannonballEnvironment="production"     // hardcoded, both envs
  usePreview={usePreview}
  region="us"                            // hardcoded — ESPN commerce is US-only
  language={footerLanguage}              // 'en' | 'es'  (es-419 → 'es')
  footerData={effectiveFooterData}
  componentRegistry={defaultComponentRegistry}
  fallback={espnFooterFallback}          // @solo/footer/fallbacks/espn
  observability={{ datadogRum, app: 'commerce-espn', env: 'production', owner: Owners.CORE,
                   sourceComponent: 'GlobalFooter' }}
/>
```
`getFooterLanguage` (`:25-29`): `appLanguage === 'es-419' ? 'es' : 'en'` — everything non-`es-419`
falls back to English. `region="us"` and `cannonballEnvironment="production"` are **hardcoded**, i.e.
non-US ESPN would need code changes, not config.

Preview mode (`:44-66`): triggered by `previewFooter=true` or `footerPreview=true` (router query **or**
`URLSearchParams`), then reads `window.__NEXT_DATA__.props.pageProps.footerPreviewData` as an SSR
fallback path.

---

## 7. `getServerSideProps` Pipeline

### 7.1 Two-layer wrapper — **CONFIRMED**

Every ESPN page imports `buildGetServerSideProps` from
`apps/commerce/espn/src/common/build-get-server-side-props`, **never** from `commerce-base` directly.
The file states this as policy and carries the ESLint escape hatch:

```ts
// apps/commerce/espn/src/common/build-get-server-side-props/build-get-server-side-props.ts:1-4
// This is the only file we should be importing buildGetServerSideProps from commerce-base.
// buildGetServerSideProps is modified to provide ESPN specific functionality.
// eslint-disable-next-line no-restricted-imports
```

### 7.2 ESPN wrapper — the two ESPN-specific behaviours — **CONFIRMED** (`:23-67`)

```ts
export function buildGetServerSideProps<TPageProps>(propCompositionFunctions = []) {
  const baseGetServerSideProps = baseBuildGetServerSideProps(
    propCompositionFunctions,
    SSRNormalizedCommerceEspnDictionary     // ① ESPN's generated SSR key allowlist
  );
  return async (context) => {
    const result = await baseGetServerSideProps(context);
    if ('redirect' in result || 'notFound' in result) return result;
    const useFooterPreview = context.query['previewFooter'] === 'true'
                          || context.query['footerPreview'] === 'true';
    if (!useFooterPreview) return result;
    try {                                    // ② footer-preview injection
      const { getFooterLayout } = await import('@solo/footer/server');
      const footerPreviewData = await getFooterLayout({
        tenant: 'espn', type: 'account-management',
        cannonballEnvironment: 'production', region: 'us', language: 'en', usePreview: true,
      });
      return { ...result, props: { ...result.props, footerPreviewData } };
    } catch { return result; }               // silently degrades
  };
}
```

**① SSR dictionary keys**: `SSRNormalizedCommerceEspnDictionary` comes from
`src/commerce-espn-dict-keys.generated.ts`, produced by `prebuild`
(`pnpm --filter @solo/dictionary extract-ssr-keys "$PWD" commerce-espn`). It enables dictionary
request narrowing (§7.3 step 7).

**② Footer preview**: ESPN-only — hardcoded `tenant`/`region`/`language`/`env`, dynamic-imported so
`@solo/footer/server` never enters the default bundle, and wrapped in a bare `catch {}` so a Cannonball
outage degrades to the normal footer rather than 500-ing.

The file also re-exports `getDefaultServerSideProps`, `CommercePageProps`, `CompositionFunction`,
`PagePropFunction`, `MetadataAppName`, `ProductMetaData`, `ProductUrl` (`:69-79`) so pages never touch
`commerce-base` for these either.

### 7.3 Base pipeline — ordered steps — **CONFIRMED** (`packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts:363-594`)

| # | Step | Lines |
|---|---|---|
| 1 | `getLogger('buildGetServerSideProps')`; open `try` | `:366-368` |
| 2 | Read `user-agent` from request headers | `:369-370` |
| 3 | Read middleware-set **response** headers → `language` (`defaultLang`), `locale` (`defaultLocale`), `languageDirection` (`headers.dir`, default `'ltr'`) | `:372-388` |
| 4 | `getURLLanguage({ language, locale })` → `urlLanguage` | `:390-393` |
| 5 | `productName = process.env.PRODUCT as ProductName` → `productUrlOrigin` (`productConfigMap[…].url`), `productMetaData` (`metadataByProduct[…]`) | `:394-397` |
| 6 | `getRemoteConfigBackendService(query, req, REMOTE_CONFIG_DEFAULT)` → `backendService` | `:398-405` |
| 7 | `shouldCacheConfig = NEXT_PUBLIC_API_MOCKING !== 'playwright'` | `:407-408` |
| 8 | **`await loadSparrowConfig({...})`** → `commerceAppConfig` (workspace `commerce-espn`, variant = backendService) | `:410-421` |
| 9 | `assignSdkConfigEnvironmentOverride(context)` — if `isDebugToolingEnabled` and `?dss_sdk_config_env` ∈ {`qa`,`preprod`,`prod`}, set the cookie | `:423`, `:314-333` |
| 10 | Resolve `appLanguageForURLLanguage` from `supportedLangsMap[urlLanguage] ?? supportedLangsMap['en']` | `:424-428` |
| 11 | Destructure `publicRuntimeConfig` (`yellowPagesId`, `remoteDictionariesToLoad`, `isDebugToolingEnabled`, `enableDictionaryDebugging`, `pinnedPlatformOptions`, `dapiSensitiveSecretsApiKey`) | `:429-437` |
| 12 | `shouldShowFallbackIndicator` = dictionary debugging ∧ debug tooling ∧ ¬browser-mocking ∧ ¬server-mocking | `:441-445` |
| 13 | Log whether `DAPI_SENSITIVE_SECRETS_API_KEY` is present (`TODO WEB-28495`) | `:447-452` |
| 14 | **Run all composition functions**, left→right, each receiving `(commerceAppConfig, context)`, shallow-merged via `reduce` | `:454-465` |
| 15 | `shouldOptimizeDictionary` = `feature-flags.general.enableDictionaryOptimization` ∧ `ssrDictionaryKeys` present → build `includeKeys` | `:467-475` |
| 16 | If optimizing: log the route + total key count; **warn** if `> TRACKED_KEYS_WARNING_THRESHOLD` (500) | `:478-499`, `:34` |
| 17 | **`await getDictionaryServerProps({...})`** → `dictionary` | `:501-530` |
| 18 | `getRegionProps(context)` → `regionFromCDN` (`x-aka-user-geo`), `regionFromUserOverride` (`dss-physical-country`) | `:532`, `:137-152` |
| 19 | `getInitialGlimpseConfig(context, appLanguageForURLLanguage)` — **throws** on unknown `PRODUCT`; `appVersion` = `dss_branch__dss_backend_services` cookies if both present, else `publicRuntimeConfig.gitCommit` | `:534-537`, `:264-312` |
| 20 | Build `productUrl = { origin: productUrlOrigin, path: resolvedUrl }` | `:540-543` |
| 21 | Assemble `finalPageProps`; **composition-function props spread LAST** (they can override base props) | `:545-562` |
| 22 | If `DD_ENV === 'stage'`, log `cgi-web.pagePropsSize` (JSON length, product, route, `dssBackendServices`) | `:564-582` |
| 23 | Return `{ ...composedServerSideProps, props: finalPageProps }` — so a composition function's `notFound`/`redirect` survives | `:584-587` |
| 24 | `catch`: `console.log('ERRROR')` (sic, extra R, "for WCS testing"), `logger.error`, **rethrow** | `:588-593` |

### 7.4 ESPN-specific branches inside the pipeline

**CONFIRMED** — there are **no `if (product === 'espn')` branches** in the base pipeline. Every ESPN
difference is a **lookup**, not a branch:

| Where | Mechanism | ESPN value |
|---|---|---|
| Step 5 | `productConfigMap[productName].url` | `https://plus.espn.com` |
| Step 5 | `metadataByProduct[productName]` | ESPN OG image 1296×729 png, `@ESPN` |
| Step 8 | `workspace = commerce-${productName.toLowerCase()}` | `commerce-espn` |
| Step 17 | `commerceAppConfig[…].dictionary.dictionaryTenant` | `espn` |
| Step 19 | `productConfigMap[productName].partner` / `.appName` | `espn` / `ESPN` |
| Wrapper ① | `ssrDictionaryKeys` arg | `SSRNormalizedCommerceEspnDictionary` |
| Wrapper ② | footer-preview post-processing | ESPN-only code path |

**INFERRED** — this is the intended design: `commerce-base` is described as "a tenant-agnostic platform"
(`get-product-name-for-mocks.ts` doc comment), so tenant behaviour is table/config-driven and the only
per-tenant *code* lives in the app shell.

### 7.5 Page-level usage pattern — **CONFIRMED**

The canonical ESPN page is ~28 lines. `pages/commerce/account/index.page.tsx`:

```tsx
export { AccountDetailsPage as default } from '@solo/commerce-base/src/account/account-details';
import { type PartialLayoutConfig } from '@solo/commerce-base/src/common/layouts';
import { buildGetServerSideProps } from '../../../src/common/build-get-server-side-props';

const getLayoutConfigProp = (): { props: { layoutConfig: PartialLayoutConfig } } => ({
  props: { layoutConfig: { visualLayout: {
    header: { type: 'siteHeader', showBorder: false, showGradientOnMobile: false },
    footer: { show: true, type: 'global' },
  } } },
});

export const getServerSideProps = buildGetServerSideProps([getLayoutConfigProp]);
```

And with a gate — `pages/commerce/welcome-back/index.page.tsx:28-31`:

```tsx
export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedWelcomeBack' }),
  getLayoutConfigProp,
]);
```

Order matters conceptually but not mechanically — step 14 merges all results, and step 23 preserves any
`notFound`. **INFERRED** — all composition functions run even after one returns `notFound`, so a
`notFound` gate does not short-circuit the Sparrow/dictionary fetches (step 8 and 17 already ran).
This is a real (small) waste on 404s.

### 7.6 `_error.page.tsx` — **CONFIRMED** (`apps/commerce/espn/pages/_error.page.tsx`)

Uses `getDefaultServerSideProps` (the zero-composition-function instance, `build-get-server-side-props.ts:605`)
and defines its own `getPageLayout` (`:29-54`) that skips `LegacyApplicationLayout` in favour of
`<ApplicationLayout>` + `<BrowserMocks>` + `<HydrateDataInterface>` + `<PageContainer withErrorStyling headerType="siteHeader">`
+ `<SiteHeaderBase />`. Its `getServerSideProps` (`:61-76`) logs
`{ url, statusCode } 'Failed to load page'` via `getLogger('_error.page')` before delegating.

---

## 8. Build / Deploy Artifacts

### 8.1 Dockerfile — **CONFIRMED** (`apps/commerce/espn/Dockerfile`, 12 lines)

```dockerfile
FROM fed.docker.artifactory.global.bamgrid.net/node:22.14.0
EXPOSE 3000
RUN mkdir --parents /usr/src/app/apps/commerce/espn
COPY . /usr/src/app/apps/commerce/espn/
WORKDIR /usr/src/app/apps/commerce/espn
USER node
CMD ["./entrypoint.sh"]
```

Single-stage, non-root (`USER node`), `EXPOSE 3000`. It copies a **pre-pruned** context — the pruning
happens in CI via `CMD_PRUNE` (§8.3), and `DOCKER_BUILD_PATH: './target'`.

`entrypoint.sh` — **CONFIRMED**: sources `/shared/config/application-vault.properties` line-by-line into
the env (Vault sidecar), logs `Vault secrets not detected.` if absent, then `npm start` (which is
`NODE_ENV=production NODE_OPTIONS="--require dd-trace/init" next start --keepAliveTimeout 61000`).

### 8.2 Turbo tasks — **CONFIRMED** (`apps/commerce/espn/turbo.json`)

```jsonc
{ "extends": ["//"], "tasks": {
  "build":     { "env": ["PRODUCT", "NEXT_PUBLIC_FLEX_LOCAL_SERVICE"], "outputs": ["build/**", "build-test/**"] },
  "lint:fix":  { "dependsOn": ["^build"], "outputs": [".eslintcache", ".stylelintcache"] },
  "lint":      { "dependsOn": ["^build"], "outputs": [".eslintcache", ".stylelintcache"] }
}}
```
`PRODUCT` in the build task's `env` means **the Turbo remote cache is keyed on it** — an ESPN build and a
Hulu build cannot collide. `lint` depends on upstream `^build`, so linting the app builds its `@solo/*`
deps first (slow first run).

### 8.3 Jenkins / Fuzzbucket — **CONFIRMED** (`ci/espnplus/commerce`)

```groovy
Map appConfig = [
  APPLICATION_NAME: 'espnplus-commerce',
  DEPLOY_WITH_MARINER: true,
  MARINER_AWS_ACCOUNT: 'cp1-nonprod-main',
  HELM_VALUES_FILE_PATH_2: 'cp1-nonprod',
  HELM_VALUES_FILE_PATH_3: 'env-stage.yaml',
  HULU_APP_HELM_CHART_VERSION: '0.36.0',
  AUTOMATED_TESTS_JOB: 'site-dominguez-twdcgrid/espnplus-app-tests/main',
  CMD_BUILD:  'turbo build --filter=@solo/commerce-espn --token="1" --team="commerce"',
  CMD_INSTALL:'pnpm install',
  CMD_PRUNE:  'pnpm --filter commerce-espn --prod deploy ./target',
  CMD_LINT:   'echo lint and type-check run in GHA',
  CMD_TEST:   'echo unit tests run in GHA',
  CMD_SONAR:  'echo skipping sonar',
  CUSTOM_NODE_VERSION: '22.14.0',
  DATADOG_APP_NAME: 'web-solo-commerce-espn',
  REGIONS: ['us-east-1'],
  DOCKER_BUILD_PATH: './target',
  PRODUCT: 'espn', VARIANT: 'commerce',
  STATIC_APP: 'espnplus', STATIC_ENDPOINT: 'espnplus-static.bamgrid.com',
  LOCAL_BUILDS_PATH: 'apps/commerce/espn/build/static',
  IS_NEXT_APP: true,
  TEST_RESULT_XML: 'apps/commerce/espn/src/test/unit/results.xml',
  DEPLOY_WITH_JANUS: false,
]
```

Note `CMD_PRUNE` uses `--filter commerce-espn` (**no `@solo/` scope**) while `CMD_BUILD` uses
`--filter=@solo/commerce-espn`. **INFERRED** — pnpm resolves the bare name too, so this works, but it
is an inconsistency.

Branch → environment matrix — **CONFIRMED** (`ci/espnplus/commerce:46-90`):

| Branch | AUTO_DEPLOY | AWS account | Helm values | Regions |
|---|---|---|---|---|
| *(default)* | (default) | `cp1-nonprod-main` | `cp1-nonprod` / `env-stage.yaml` | `us-east-1` |
| `canary-a\|b\|c` | **false** | `cp1-prod-main` | `cp1-prod` / `env-canary.yaml` | `us-east-1`, `us-west-2` |
| `main` | true | `cp1-nonprod-main` | `cp1-nonprod` / `env-main.yaml` | `us-east-1`, `us-west-2` |
| `partner-activation` | true | `cp1-nonprod-main` | `cp1-nonprod` / `env-partner.yaml` | `us-east-1` |
| `release-*` / `hotfix-*` | true | `cp1-prod-main` | `cp1-prod` / `env-release-candidate.yaml` | `us-east-1`, `us-west-2` |
| `trunk-clone` | true | `cp1-prod-main` | `cp1-prod` / `env-release-candidate.yaml` | `us-east-1`, `us-west-2` |
| `trunk` | **false** | `cp1-prod-main` | `cp1-prod` / **`env-prod.yaml`** | `us-east-1`, `us-west-2` |

Post-deploy hook (`:96-107`): on `main`, `cloneBranch` mirrors `main` → **`partner-activation`**. So
ESPN maintains a long-lived partner-activation environment auto-synced from `main` — **ESPN-relevant and
easy to miss**.

Monorepo orchestrator — **CONFIRMED** (`ci/monorepough:25-33,76-83`):
```groovy
Map espnPlusNexus   = [ job: "fzb-espnplus-nexus/${encodedBranchName}",   brand: "ESPN" ]
Map espnPlusCommerce= [ job: "fzb-espnplus-commerce/${encodedBranchName}", brand: "ESPN" ]
List publicProjects = [ dPlusNexus, dPlusCommerce, espnPlusCommerce, espnPlusNexus, huluNexus, huluCommerce ]
```
Teams channel `cgi-web-releases`; on `trunk` + `params.DEPLOY` it runs `trackRelease` and back-merges
`trunk → main` and `trunk → trunk-clone` (`:111-128`).

### 8.4 GitHub Actions mentioning ESPN — **CONFIRMED**

| Workflow | ESPN reference |
|---|---|
| `.github/workflows/apps-lint-and-test.yml:30-33` | matrix entry `name: espn`, `package: '@solo/commerce-espn'`, `datadog_service: 'cup_commerce/apps/espn'`, `turbo-team: commerce`. Runs `turbo ${PACKAGE}#lint` then `#lint:type-check`. Container `artifactory.global.twdcgrid.net/hulu-docker/node:22.14.0-bullseye`, runner `amd-standard-new`. |
| `.github/workflows/ci.yml:43-46` | `name: commerce-espn`, `path: apps/commerce/espn`, `project-key: cgi-client:commerce-espn`, `command: pnpm turbo coverage:jest:ci --filter=@solo/commerce-espn --token="1" --team="commerce"` |
| `.github/workflows/commerce-pr-checks-espn-sharded.yml` | Calls `commerce-playwright-tests-sharded.yml` with `tenant: espn`, `folder: espn`, **`shard_count: 2`**, **`coverage_threshold: 10`**, `secrets: inherit` |
| `.github/workflows/sonarqube-summary.yml:117` | `{"name":"commerce-espn","projectKey":"cgi-client:commerce-espn"}` |
| `.github/workflows/growth-pr-checks-espn.yml` | ESPN **marketing-unified**, not commerce |
| also referenced in | `labeler.yml`, `mergify.yml`, `CODEOWNERS`, `commerce-code-coverage.yml`, `commerce-bundle-analysis.yml`, `metrics.yml`, `playwright-stress-test.yml`, `flake-check.yml` |

Division of labour — **CONFIRMED**: lint, type-check, unit tests, and Playwright run in **GitHub
Actions**; Jenkins explicitly stubs them out (`CMD_LINT`/`CMD_TEST`/`CMD_TEST_INTEGRATION`/`CMD_SONAR`
are all `echo`). Jenkins only installs, builds, prunes, dockerizes, and deploys.

### 8.5 Test configuration — **CONFIRMED**

**Jest** (`apps/commerce/espn/jest.config.js`):
- `next/jest` + **`babel-jest` with `next/babel`** override, because "next/jest code coverage numbers are
  incorrect" (`TODO WEB-2303`, `:80-84`).
- **100% coverage threshold on branches/functions/lines/statements** (`:31-38`).
- `collectCoverageFrom`: `src/**` + `pages/api/footer-preview.api.ts` + **`next.config.js`** (`:15-18`);
  excludes `__browser-mocks__`, `__common-mocks__`, `__server-mocks__`, `*.test|stories|storybook.*`, `src/**/test/**`.
- 10 `setupFilesAfterEach` files (`:68-79`), incl. `@solo/test-utils/jest/datadog-tag-reporter`.
- `moduleNameMapper` redirects `@datadog/browser-rum`, `@datadog/browser-logs`, and
  `@solo/commerce-base/node_modules/@datadog/browser-rum` to `@solo/observe/jest/datadog-mocks`; pins
  `dss-device` via `require.resolve` to survive pnpm hoisting (`:50-62`).
- `testTimeout: 10_000`; `testPathIgnorePatterns: ['/node_modules/', '/playwright/']`.

**Playwright** (`apps/commerce/espn/playwright.config.ts`):
- `baseURL = 'http://localhost:5040'` — **plain HTTP**, with the HTTPS variant commented out
  (`TODO WEB-30985 — Re-Enable HTTPS when SSL resolution in CI is resolved`, `:11-13`).
- `webServer.command`: CI → `PORT=5040 next start`; local → `next build && PORT=5040 next start`.
- `webServer.env`: `NEXT_PUBLIC_API_MOCKING: 'playwright'`, `GIT_COMMIT`, **`PRODUCT: 'espn'`** (`:103-108`).
- Readiness probe URL is `${baseURL}/commerce/billing-history` (`:109`) — **not** `/healthcheck`.
- Only the `chromium` project is enabled; firefox/webkit/mobile blocks are commented out (`:59-96`).
- `workers: 1` on CI, `maxFailures: 5`, `timeout: 30_000`, `expect.timeout: 10_000`,
  `ignoreHTTPSErrors: true`, `trace`/`video`: `retain-on-failure`.
- 19 spec files across `account/`, `common/`, `flows/`, `payments/`, `signup/` — notably
  `flows/espn-internal-activation.spec.ts` (the largest ESPN-unique flow) and
  `common/dictionary-optimization.spec.ts`.

### 8.6 Dependencies — **CONFIRMED**

32 runtime deps, 49 devDeps. The 19 `@solo/*` runtime deps:
`cgi-design-components`, `cgi-design-tokens`, `commerce-base`, `commerce-utils`, `core-analytics`,
**`data-interface-disney`**, **`data-interface-espn`**, `dictionary`, `footer`, `identity-auth`,
`instrumentation`, `lang-locale-next`, `logger`, `mydisney-ui`, `privacy-consent`, `remote-config`,
`sdk-session`, `toodles-react`, `types`.

**CONFIRMED oddity:** the ESPN app depends on **both** `@solo/data-interface-espn` *and*
`@solo/data-interface-disney`. **INFERRED** — needed for the cross-brand Disney+ hand-off paths seen in
the Sparrow config (§5.4) and/or bundle flows; `hydrate-data-interface.tsx:5` only builds the ESPN one,
so the Disney interface must be consumed elsewhere (unverified).

`packages/cgi/data-interface-espn/src/` contains: `activations/`, `experimentation/`, `flex/`,
`identity/`, `payment/`, `test/`. Its own scripts exist at root (`lint:data-interface-espn`,
`test:data-interface-espn:coverage`).

### 8.7 `tsconfig.json` — **CONFIRMED**

`strict: true`, `noEmit: true`, `jsx: 'preserve'`, `moduleResolution: 'node'`, `target: 'es6'`.
Only two `paths` entries: `"@emotion/core": ["emotion-core-stub.ts"]` (a shim for a legacy transitive
dep) and `"*": ["node_modules/@types/*"]`. **No `@/` style aliases** — ESPN pages use relative imports
(`'../../../src/common/build-get-server-side-props'`). Jest deletes the `"*"` path before mapping
(`jest.config.js:10`) to avoid pathological resolution.

---

## 9. Vocabulary

| Term | Meaning |
|---|---|
| **CUP / CUP V2** | Commerce Unified Platform. V2 = `getPageLayout` + `commerce-base` features; V1 = `getLegacyLayout`. ESPN's `package.json` description: *"ESPN commerce application using CUP V2"*. |
| **Sparrow** | S3-hosted remote-config service. Workspace `commerce-espn`, variant = backend service. Returns `CommerceAppConfig`. |
| **`CommerceAppConfig`** | The per-request config object: `feature-flags`, `feature-configuration`, `countries`, `paths`. Flows from SSP → pageProps → `commerceAppConfigAtom`. |
| **backend service / `dss_backend_services`** | Environment selector cookie/query (`qa`, `prod`, `beta`, `preview`, `*-local`). Becomes the Sparrow `variant`. |
| **Glimpse** | Disney's metrics/analytics pipeline. `initialGlimpseConfiguration` is computed server-side. |
| **Cypher / dictionary** | Localized-copy service. Dictionaries: `accessibility`, `identity`, `pcon`, `unified-commerce`, `unified-commerce-onboarding`, `unified-offers`. |
| **Dictionary optimization** | Server sends only the SSR keys listed in `commerce-espn-dict-keys.generated.ts`. Gated by `enableDictionaryOptimization`; the client-side counterpart gate is `enableDictionaryClientGating`. |
| **Ripcut** | Disney's image-transform CDN (`*-ripcut-delivery.disney-plus.net`). |
| **Toodles** | In-app developer/debug panel (`PortalToodles`, `@solo/toodles-react`). |
| **Mystique** | Feature-flag service behind `useMystiqueFeatureFlags()` (distinct from Sparrow flags). |
| **Flex** | Server-driven-UI BFF (`growth-life-client-api`). `NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled` points the app at a local Flex. |
| **Cannonball** | CMS/content service backing `@solo/footer` (`cannonballEnvironment: 'production'`). |
| **Fuzzbucket / `fzb-*`** | Jenkins pipeline framework. ESPN commerce job: `fzb-espnplus-commerce`. |
| **Mariner / Janus** | Deploy mechanisms. ESPN: `DEPLOY_WITH_MARINER: true`, `DEPLOY_WITH_JANUS: false`. |
| **Traffic Director / Edge server** | Local Docker containers detected by `local-setup`; TD flips `assetPrefix` to `/commerce/`. |
| **`wcs ssl-proxy`** | Web Client Services TLS terminator used for local HTTPS (certs in `apps/.certs`). |
| **DAPI** | Dictionary API. `DAPI_SENSITIVE_SECRETS_API_KEY` unlocks sensitive keys. |
| **OneID / OneTrust** | Identity SDK (`ESPN-ONESITE.WEB`) / consent-management platform. |
| **`partner-activation` branch** | Long-lived ESPN environment branch auto-cloned from `main`. |

---

## 10. Gotchas & Traps

1. **`local.espn.com` is wrong.** `apps/commerce/AGENTS.md:86` documents the ESPN dev URL as
   `https://local.espn.com`. The real host is **`local.plus.espn.com`**, port **5004**.
   `local.espn.com` is not in `CERTIFICATE_DOMAINS`. — **CONFIRMED** (`scripts/var/settings.sh:3` vs `AGENTS.md:86`).
2. **`AGENTS.md`'s per-brand `src/` tree is stale for ESPN.** It advertises
   `src/{account,identity,payments,profiles,common,layout,hooks,test}`; ESPN actually has only
   `src/{common,hooks,layout,queries,test,types}`. — **CONFIRMED**.
3. **`PRODUCT` silently defaults to `disneyPlus`.** `packages/cgi/commerce-base/next.config.js:19`
   (`process.env.PRODUCT ?? 'disneyPlus'`) and `get-product-name-for-mocks.ts:19` both fall back to
   Disney+. A missing `PRODUCT` yields Disney+ mocks, not an error. Only
   `getInitialGlimpseConfig` throws (`build-get-server-side-props.ts:295-299`). — **CONFIRMED**.
4. **ESPN and Disney+ rely on `.env` for `PRODUCT`; Hulu sets it inline.** Hulu's `dev:start` is
   `PORT=5030 PRODUCT=hulu next dev`; ESPN's is `PORT=5040 next dev` and depends on
   `apps/commerce/espn/.env:20`. Any script that bypasses dotenv loading loses the ESPN tenant. — **CONFIRMED**.
5. **Four brand namespaces, easy to cross.** `ProductName`(`espn`) ≠ `partner`(`espn`) ≠ `tenant`(`espn`)
   ≠ `ThemeName`(`espn`) — for ESPN they coincide, so an `espn`-only test will pass while the same code
   breaks for Disney+ (`disneyPlus` vs `disney`). **Never validate a brand check against ESPN alone.** — **INFERRED** from §2.8.
6. **`partnerName` is session-derived, not app-derived.** An ESPN-app request can legitimately see
   `partnerName === 'disney'`. Do not use `partnerName` as "which app am I". — **INFERRED** (`payments-container.tsx:799`).
7. **Two `LoadAnalytics` implementations with different consent logic.** `espn-layout.tsx:36-83`
   (flag-aware, `@solo/privacy-consent` vs OneTrust) and `legacy-application-layout.tsx:38-80`
   (OneTrust only + `useToggleAdobeAnalytics`). Fixing a consent bug in one leaves the other. — **CONFIRMED**; `TODO WEB-27451`.
8. **Anything doing network I/O must render inside `<BrowserMocks>`.** Warned in-code in three places
   (`espn-layout.tsx:121`, `legacy-application-layout.tsx:174`, `_error.page.tsx:40`). Outside it, MSW
   is not installed and integration/E2E runs hit real services. — **CONFIRMED**.
9. **`pageExtensions: ['page.tsx','api.ts']` is load-bearing.** A new `instrumentation.ts` or
   `foo.tsx` in `pages/` is silently ignored. Explicitly documented at
   `apps/commerce/espn/instrumentation.page.tsx:7-9`. — **CONFIRMED**.
10. **`isRouteEnabled` does not short-circuit.** All composition functions still run and Sparrow +
    dictionary are still fetched before the `notFound` is returned (steps 8/17 precede step 23). — **INFERRED** from `build-get-server-side-props.ts:454-587`.
11. **Composition-function props win.** `...composedServerSideProps.props` is spread **last** into
    `finalPageProps` (`:561`), so a composition function can overwrite `commerceAppConfig`, `dictionary`,
    etc. — usually unintentionally. — **CONFIRMED**.
12. **`/commerce/plans` and `/commerce/welcome-back` are OFF in the ESPN baseline.**
    `enableCommerceUnifiedPlans: false` and `enableCommerceUnifiedWelcomeBack: false` in the ESPN
    Sparrow fixture. A newcomer navigating there locally gets a 404 and assumes the page is broken. So
    is `enableCommerceMembershipPause: false` (kills `/commerce/pause*` and `/commerce/cancel/pause`). — **CONFIRMED** (fixture `:20,22,11`).
13. **Playwright readiness probes `/commerce/billing-history`, not `/healthcheck`.** If
    `enableCommerceUnifiedBillingHistory` flips false, the whole E2E suite fails to start rather than
    failing one test. — **CONFIRMED** (`playwright.config.ts:109`).
14. **Playwright is HTTP-only.** `baseURL = 'http://localhost:5040'` with HTTPS commented out
    (`TODO WEB-30985`). Anything that requires a secure context (some payment/3DS flows) behaves
    differently under E2E than in the ssl-proxy dev setup. — **CONFIRMED**.
15. **`dev` hangs, it does not fail, when `/etc/hosts` is missing the entry.** `dev:proxy` `wait-on`s
    `http://local.plus.espn.com:5040/healthcheck` before starting; a missing hosts entry looks like a
    slow build. Run `./scripts/setup` / `mkcert` first. — **INFERRED** from `package.json:32`.
16. **100% Jest coverage is enforced and includes `next.config.js`.** `coverageThreshold.global` is
    100/100/100/100 and `next.config.js` is in `collectCoverageFrom` — hence
    `next.config.test.js` exists. Editing `next.config.js` without touching its test **fails CI**. — **CONFIRMED** (`jest.config.js:18,31-38`).
17. **`lint` depends on `^build`.** `turbo.json:12-15`. The first `pnpm lint:commerce:espn` builds every
    upstream `@solo/*` package — minutes, not seconds. — **CONFIRMED**.
18. **`build` writes to one of three dirs** (`.next` / `build` / `build-test`). Jenkins reads
    `apps/commerce/espn/build/static`; stale `.next` from a dev session does not affect it, but
    `pnpm clean` removes all three. — **CONFIRMED** (`next.config.js:81-87`, `ci/espnplus/commerce:39`).
19. **`console.log('ERRROR')` (three R's) is intentional.** `build-get-server-side-props.ts:589-590`
    — "for WCS testing, extra R is intentional for debugging". Do not "fix" the typo.
20. **Footer preview silently degrades.** The ESPN wrapper's `catch {}`
    (`build-get-server-side-props.ts:63` in the ESPN file) swallows all errors, so a broken
    `?previewFooter=true` just renders the normal footer with no signal. — **CONFIRMED**.
21. **ESPN footer hardcodes `region="us"`, `cannonballEnvironment="production"`, and English fallback.**
    `src/common/footer/footer.tsx:72,74` and `getFooterLanguage` (`:28`). Non-US/non-en-es ESPN is a code
    change, not a config change. — **CONFIRMED**.
22. **ESPN supports only `en` and `es-419`.** `supportedLangsMap` has two entries; unknown URL languages
    silently fall back to `en` (`build-get-server-side-props.ts:427-428`). — **CONFIRMED**.
23. **The `partner-activation` branch is auto-cloned from `main` after every `main` deploy.**
    `ci/espnplus/commerce:96-107`. A change merged to `main` reaches that environment without a separate
    PR — surprising if you are debugging a partner-activation-only issue. — **CONFIRMED**.
24. **Branch names must be ≤27 chars with no slashes** (root `CLAUDE.md`, Jenkins/Fuzzbucket limit).
    `ci/monorepough:12` double-encodes slashes as `%252F` as a workaround, but the repo rule stands.
25. **`.next` and `build*` dirs poison repo-wide greps.** `apps/commerce/espn/.next/server/pages/**`
    contains minified copies of `commerce-base` source with all the brand literals inlined. Always
    exclude `.next`, `build`, `build-test`, `node_modules` when grepping for brand strings. — **CONFIRMED** (observed during this research).
26. **`CMD_PRUNE` uses the unscoped filter** `commerce-espn` while `CMD_BUILD` uses `@solo/commerce-espn`
    (`ci/espnplus/commerce:21,25`). It resolves today; it is a latent trap if a same-named package appears.
27. **`ripcut`, `ripcutRaw`, `orchestrationUrl` in the ESPN config point at `qa-disney.*` hosts**
    (Sparrow fixture `:513-518`). ESPN image and GraphQL traffic is Disney-shared; do not assume an
    `espn` host for every ESPN request.

---

## 11. Open Questions / Unverified

1. **Is `@solo/data-interface-disney` actually used at runtime by the ESPN app?** It is a declared
   dependency, but `hydrate-data-interface.tsx:5` imports only `@solo/data-interface-espn`. The Disney
   interface may be dead weight or used by a cross-brand component. *Not traced.*
2. **`_app.page.tsx` accepts `language`/`locale`/`regionFromCDN`/`regionFromUserOverride` in
   `CommerceAppProps` (`:29-32`) but never reads them from `props`** — it reads them off `pageProps`
   instead. Whether those top-level props are ever populated is unverified.
3. **Middleware parity.** I did not diff `apps/commerce/espn/middleware.page.tsx` against the Hulu and
   Disney+ middlewares; the ESPN one is asserted identical-in-shape only because they share `geoNext`.
4. **Cookie domains.** No `cookieDomain` key exists in the ESPN Sparrow config, and
   `assignSdkConfigEnvironmentOverride` sets `dss_sdk_config_env` with no `domain`. Where (if anywhere)
   ESPN cookie scoping is configured — identity SDK? Akamai? Helm? — is unresolved.
5. **Real Sparrow values vs fixture.** All feature-flag defaults quoted in §4.6 come from the **test
   fixture** `__fixtures__/espn/sparrow-commerce-espn-workspace.ts`. Production/QA values live in S3 and
   were not fetched. Treat fixture values as *illustrative*, not authoritative.
6. **`countries` scope coverage for ESPN.** I inspected only the `NA.AS` entry (`:226-245`). The full
   continent/country override matrix and its `footer[]` module lists were not enumerated.
7. **`.github/CODEOWNERS` has no `commerce/espn` line.** Grepping `commerce/espn` in CODEOWNERS returned
   nothing, so ESPN commerce ownership must be inherited from a broader glob (e.g. `apps/commerce/`).
   The effective owner was not resolved.
8. **`HULU_APP_HELM_CHART_VERSION: '0.36.0'` in the ESPN Jenkins config** (`ci/espnplus/commerce:16`) —
   presumably a shared chart with a Hulu-legacy name, but unconfirmed.
9. **`marketing-unified/espn`** (`@solo/marketing-unified-espn`, Jenkins `espnplus-nexus`,
   `growth-pr-checks-espn.yml`) is a *separate* ESPN app owned by Growth. Out of scope here; its
   relationship to commerce ESPN (shared `data-interface-espn`, shared Sparrow?) is untraced.
10. **Which of the three "missing from ESPN but present in both siblings" pages
    (`identity/delete/[slug]`, `identity/manage-devices`, `profiles/adhoc-transfer/max-profiles`) are
    intentional gaps vs oversights** is unknown — no ticket references found.
11. **`AUTOMATED_TESTS_JOB: 'site-dominguez-twdcgrid/espnplus-app-tests/main'`** — an external
    post-deploy test suite outside this repo. Contents unknown.
12. **`YELLOW_PAGES_ID=6616b21135f3fecb74145117`** (`.env:11`) is committed and ESPN-specific. Its exact
    role (service-catalog registration for dictionary/DAPI?) was not confirmed.
