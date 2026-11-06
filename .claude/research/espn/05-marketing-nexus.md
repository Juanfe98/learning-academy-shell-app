# 05 — ESPN Marketing / NEXUS (`plus.espn.com`, the sales layer)

> Research digest for `apps/marketing-unified/espn` (`@solo/marketing-unified-espn`)
> in the `cgi-web` monorepo. All paths are repo-relative to
> `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web`.
> Every claim is tagged **CONFIRMED** (read in a real file, path:line cited) or
> **INFERRED** (deduced, not directly proven).

---

## 0. Executive summary (read this first)

**CONFIRMED** — The ESPN marketing app is a *single-route, fully CMS-driven*
Next.js Pages Router app. There is exactly **one content route**: the optional
catch-all `[[...path]].page.tsx`. Every sport/league landing page (`/soccer`,
`/mlbtv`, `/nflbundle`, `/nfl`, `/bundle`, `/changeplans`, …) is the *same* React
page fed different CMS content. There are no per-sport files and no plan page
file — plan cards are CMS components dropped onto landing pages.

**CONFIRMED** — The marketing app never talks to commerce APIs. It does not
price plans, does not build checkout URLs, and does not know about carts. The
hand-off to commerce is a **plain `href` authored in the CMS**, of the form
`https://secure.web.plus.espn.com/commerce/billing?pref=<package_id>`. Prices
shown on the page come from **offer tokens** — CMS placeholder strings replaced
server-side by `@solo/plans-pricing-api`.

**CONFIRMED** — The app is mid-migration from **Cannonball** (CDN JSON manifest
+ snapshot) to **Spaceball** (GraphQL). Both live behind one seam:
`getPageData()` picks `checkPathInSpaceball` vs `checkPathInCannonball` based on
the `enableSpaceball` feature flag. Both return the same `pageData` shape so the
rest of `getServerSideProps` is backend-agnostic.

---

## 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **NEXUS** | The unified marketing website *platform* shared by Disney+, Hulu and ESPN (`apps/marketing-unified/*` + `packages/marketing/*`). Not a framework — a set of shared packages + a shared GSSP shape. |
| **Cannonball** (cnbl) | Legacy CMS delivery. Two-step: fetch a **manifest** (route → per-locale snapshot URL), then fetch the **snapshot** (page JSON). Served from `cnbl-cdn.bamgrid.com`. |
| **Spaceball** | New CMS delivery. Single GraphQL POST returning page content + available locales in one round trip. Served from `spaceball.global.twdcgrid.net/graphql`. |
| **Snapshot** | The published JSON blob for one route + one locale in Cannonball. |
| **Manifest** | Cannonball's route index (`{ routes: { soccer: { resources: { "en-US": "//…json" } } } }`). |
| **Stitch** | `@solo/stitch` — the Model→Builder→Component→Registry rendering engine that turns CMS JSON into React. |
| **StitchDocument** | Server-built object: `{ preContent, mainContent, postContent, modals, metadata, styleOverrides, backgroundColorOverride }`. |
| **Component registry** | Map from CMS component type key (e.g. `planCard`) → React component. Brand-overridable. |
| **Offer token** | CMS placeholder (e.g. `{{espn_unlimited_monthly.price}}`) replaced server-side with a formatted price. |
| **`pref`** | The query param that carries the chosen ESPN package id into commerce (`?pref=espn_unlimited`). |
| **Sparrow** | Remote config service (S3-backed). Supplies `paths`, `featureConfig`, `countries`, dictionary versions, analytics ids. Scope for ESPN = `ESPN_NEXUS`, workspace `Growth`. |
| **OLP** | Offer Landing Page — the homepage `/`. |
| **MLP** | Marketing Landing Page — a sport/league page such as `/soccer`. |
| **Toodles** | Growth's in-page debug widget (`@solo/growth-dx`), gated by `ENABLE_DEBUG_TOOLING`. |
| **Ripcut** | Disney image transform/CDN service used for CMS images. |
| **SWID** | ESPN's anonymous visitor cookie, minted client-side if absent. |

---

## 2. Anatomy of `apps/marketing-unified/espn`

### 2.1 Top-level layout

**CONFIRMED** (from `ls -la` of the app dir):

```
apps/marketing-unified/espn/
├── AGENTS.md                    # 16 lines — pure pointer to README.md
├── README.md                    # the actual context file (155 lines)
├── package.json                 # @solo/marketing-unified-espn, v1.0.5, private
├── next.config.js               # 136 lines (+ next.config.test.js, 12.7KB of tests!)
├── middleware.page.ts           # lives at src/middleware.page.ts
├── tailwind.config.cjs          # 19 lines — presets + plugin only
├── postcss.config.cjs
├── jest.config.js               # 100% coverage thresholds
├── playwright.config.ts
├── tsconfig.json / tsconfig.test.json
├── eslint.config.js / lint-staged.config.js / .prettierrc.js
├── babel.config.js
├── babel-plugins/tracer-plugin.js   # custom dd-trace instrumentation transform
├── turbo.json
├── Dockerfile / entrypoint.sh / .dockerignore
├── sonar-project.properties
├── .env.example / .env.local.example / .env.test
├── __mocks__/@solo/logger.js
├── public/                      # ONLY favicon.ico + mockServiceWorker.js
├── playwright/
│   ├── helpers.ts
│   ├── support/{fixtures.ts, happy-paths.ts, happy-path-output.js, js-css-coverage-report.js}
│   └── tests/pages/{mlp.spec.ts, mlp-sp.spec.ts, olp.spec.ts, olp-sp.spec.ts}
└── src/
    ├── middleware.page.ts
    ├── pages/                   # 11 files total
    ├── views/                   # landing-page (the only real view) + error/denied
    ├── shared/                  # layouts, error-handler, types, test setup
    ├── libs/                    # datadog-rum.ts, logger-with-datadog.ts
    ├── mocks/                   # MSW handlers + JSON fixtures
    └── styles/
```

**CONFIRMED** — `public/` contains only two files:
`apps/marketing-unified/espn/public/favicon.ico` and
`apps/marketing-unified/espn/public/mockServiceWorker.js`. All real imagery is
remote (`a.espncdn.com`, `static-assets.bamgrid.com`, Ripcut).

### 2.2 `src/` directory census

**CONFIRMED** — 46 source dirs, and **almost all complexity sits in one view**
(`src/views/landing-page/`) plus one layout tree (`src/shared/layout/`):

| Area | Files (non-test) |
| --- | --- |
| `views/landing-page.tsx` | the page component (132 lines) |
| `views/landing-page/get-server-side-props.ts` | **447 lines — the orchestrator** (see Appendix A) |
| `views/landing-page/get-server-side-props/` | `get-configs`, `get-page-data`, `get-cms-content`, `get-cms-content-with-tokens-replaced`, `get-page-props` (+ `get-page-props/get-footer-props`), `get-client-config`, `get-localization-redirect`, `get-redirect-result`, `get-vanity-redirect`, `get-url`, `run-localization-rules` (+ `verify-location`, `verify-language-in-url`, `verify-browser-preferred-language`, `shared/is-parent-country-enabled`), `set-cache-headers`, `tag-props-size`, `validate-preview-content`, `get-common-headers/string-type-check` |
| `views/landing-page/` misc | `stitch.ts`, `stitch/build-stitch-document.ts`, `footer-component-registry.ts`, `shared/constants.ts`, `use-adobe-analytics-common-data.tsx` (+ `use-fetch-adobe-common-data`, `use-flex-adobe-analytics-subscriber-cohorts`, `use-set-common-adobe-data`, `use-swid`) |
| `shared/layout/` | `layout.tsx`, `application-layout.tsx`, `page-layout.tsx`, `base-layout.tsx`, `error-layout.tsx` |
| `shared/layout/application-layout/` | `experiment-scripts.tsx` **+ ~20 files under `get-experiment/**`** (device register/grant/session-info), `load-analytics.tsx` (+ `adobe-launch`, `analytics`), `privacy-consent-wrapper.tsx` (+ 3 consent hooks), `hydrate-base-atoms.tsx`, `stitch-component-registry-overrides.tsx` (+ `entitled-content.tsx`), `toodles.tsx` / `toodles-dynamic.tsx`, `shared/{constants,types}.ts` |
| `shared/layout/page-layout/` | `auth-and-entitled-guard.tsx`, `oneid.tsx` (+ `oneid-atom`, `oneid-script`, `oneid-wrapper`, `use-exchange-id-token-for-access-token`, `types`) |
| `shared/` other | `constants.ts`, `error-handler.ts` (+ `handlers/handle-404`, `handlers/handle-500-to-error-page`, `props-getters/{get-404-props,get-redirect-props}`), `language-utils.ts`, `time-utils.ts`, `use-sdk-session-info.ts`, `types/{configs,window,fetchpriority}`, `testing-utilities.tsx` |
| `views/` other | `error-page.tsx`, `denied-page.tsx` |
| `libs/` | `datadog-rum.ts`, `logger-with-datadog.ts` |
| `test/` | `jest.{setup,setup-msw,global-setup,fail-on-console,mock-router,mock-instrumentation,query-client}.ts` |

### 2.3 `next.config.js` (**CONFIRMED**, `apps/marketing-unified/espn/next.config.js`)

Key facts:

```js
32	  pageExtensions: ['page.tsx', 'api.ts', 'page.ts'],
33	  distDir: isProd ? 'build' : '.next',
54	    datadogServiceName: 'espn-nexus',
56	  rewrites: async () => {
57	    return [
58	      { source: '/healthcheck',        destination: '/api/healthcheck' },
62	      { source: '/akamai-healthcheck', destination: '/api/akamai-healthcheck' },
66	    ];
```

- `next.config.js:12-15` — **every** `@solo/*` dep and devDep is auto-added to
  `transpilePackages` (workspace packages ship untranspiled).
- `next.config.js:28` — `assetPrefix: process.env.STATIC_ROOT_URL`.
- `next.config.js:29` — `generateBuildId: () => gitCommit` (8-char `GIT_COMMIT`).
- `next.config.js:74-77` — **server-only alias**: `@solo/logger` is rewritten to
  `src/libs/logger-with-datadog.ts`, with the real package reachable as
  `real-@solo/logger`. This is a repo-wide gotcha: importing `@solo/logger` on
  the server gives you the Datadog-wrapped logger, not the package.
- `next.config.js:88-96` — server bundle gets an extra `babel-loader` pass so
  the custom `babel-plugins/tracer-plugin.js` transform runs (auto dd-trace
  instrumentation).
- `next.config.js:113-129` — MSW aliasing: `msw/browser` is stubbed out on the
  server and `msw/node` on the client (works around mswjs/msw#1801).
- **CONFIRMED** — `eslint.ignoreDuringBuilds: true` (`next.config.js:25-27`);
  linting is a separate CI step.
- **No `redirects`, no `images`, no i18n block.** All redirecting is done in
  middleware or in `getServerSideProps`.

There is a **12.7 KB `next.config.test.js`** — the config itself is unit tested
(it is the one root config file *not* excluded from coverage, see
`jest.config.js:74-75`).

### 2.4 `src/middleware.page.ts` (**CONFIRMED**, 179 lines)

This is the edge layer. It runs on everything except api/healthcheck/static/MSW:

```ts
170	export const config = {
178	  matcher: '/((?!api|healthcheck|_next/static|mockServiceWorker).*)',
179	};
```

Behaviour, in order:

1. **Lowercase enforcement** (`:29-41`) — any uppercase in the pathname → 308
   permanent redirect to the lowercased URL. `/mockServiceWorker.js` is
   explicitly exempted because its case must be preserved.
2. **Language-only locale normalisation** (`:43-69`) — `allowedTwoCharLangs =
   {en, es}`. `/es/top-rank` → 307 → `/es-us/top-rank`. An unsupported
   two-char lang (`/da/top-rank`) → 307 → `/top-rank`.
3. **Default-locale stripping** (`:71-80`) — `en-us` in the URL → 308 → URL
   without the locale.
4. **`/homepage` → `/`** (`:82-92`, 308). `homepage` is the CMS slug for the
   home page, so it must not be publicly addressable.
5. **`/restricted/*` gate** (`:94-110`) — allowed on local/stage; in prod
   requires cookie `test_bypass=4b852fcbd4bc121711ba037722fae8e0`, else
   rewrite to `/404` with status 404. (Hard-coded bypass value in source — see
   Gotchas.)
6. **Locale rewrite** (`:124-137`) — a non-default locale in the URL is
   *rewritten* (not redirected) to the locale-less pathname, so the single
   catch-all page handles it.
7. **Header injection** (`:139-166`) — this is how GSSP learns about geo/locale:

```ts
160	  response.headers.append('disable-redirect', disableRedirect);
161	  response.headers.append('physical-location', physicalLocation.toUpperCase());
162	  response.headers.append('language', lang);
163	  response.headers.append('region', locale);
164	  response.headers.append('pathname', globalizedPathname ?? nextUrl.pathname);
165	  response.headers.append('url', nextUrl.pathname);
```

  Physical location precedence (`:144-149`): `dss-physical-country` header >
  `x-aka-user-geo` (Akamai) > default `'US'`; overridable by
  `?dss-physical-country=`. `?disable-redirect=` / `disable-redirect` header
  disables localisation redirects.

`geoNext()` from `@solo/lang-locale-next` does the locale parsing
(`middleware.page.ts:7,26`).

### 2.5 `package.json` scripts (**CONFIRMED**, `apps/marketing-unified/espn/package.json`)

| Script | Value |
| --- | --- |
| `dev` (`:12`) | `turbo dev:server proxy --log-prefix=none` |
| `dev:server` (`:13`) | `next dev -p 4040 \| pnpm run format-logs` |
| `proxy` (`:19`) | waits on `http://local.plus.espn.com:4040/healthcheck`, then `wcs ssl-proxy -c ../../.certs -p 5040` |
| `build` (`:7`) | `pnpm next build` |
| `start` (`:20`) | `NODE_ENV=production NODE_OPTIONS="--require dd-trace/init" next start --keepAliveTimeout 70000` |
| `test` (`:22`) | `jest --coverage` |
| `test:watch` (`:27`) | `jest --watch` |
| `lint` (`:15`) | `eslint --cache --cache-strategy content --max-warnings 0 .` |
| `lint:type-check` (`:18`) | `tsc --noEmit` |
| `lint:language` (`:16`) | `alex -w` (inclusive-language lint) |
| `analyze:espn` (`:6`) | `PRODUCT=espn ANALYZE=true next build` |
| `test:playwright:*` | see §10 |

### 2.6 Dev command + real local URL

**CONFIRMED** — from root: `pnpm dev:marketing-unified:espn`
(`package.json:43` → `turbo dev --filter=@solo/marketing-unified-espn`).

**CONFIRMED — the real ports are 4040 (Next) and 5040 (SSL proxy), and the host
is `local.plus.espn.com`**, per `apps/marketing-unified/espn/package.json:13,19`.
So the working local URL is:

```
https://local.plus.espn.com:5040
```

**Documentation drift (see Gotchas):** `apps/marketing-unified/espn/README.md:24-26`
claims `https://local.espn.com:5030` / Next 4030 / proxy 5030, and
`apps/marketing-unified/README.md:13` repeats "espn/ — port 4030, SSL 5030".
Both are stale; only README.md:29 ("`pnpm dev` starts the server at
https://local.plus.espn.com:5040") matches the code.

For comparison (**CONFIRMED**): Hulu is 4050/5050 on `local.huluqa.com`
(`apps/marketing-unified/hulu/package.json:9-10`); Disney+ marketing is
`PORT=4060` (`apps/marketing-unified/disneyplus/package.json:8`) — also not the
4010/5010 the parent README claims.

### 2.7 Env vars

**CONFIRMED** — `.env.example`:

```
AWS_REGION=us-east-1
ENABLE_DEBUG_TOOLING=true
SPARROW_S3_ACCESS_KEY=…
SPARROW_CONFIG_URL=https://fed-configs.s3.amazonaws.com/sparrow/[[WORKSPACE]]/[[SCOPE]]/[[CONFIG]]/[[VERSION]]/[[VARIANT]].json
SPARROW_CONFIG_VERSION=latest
SPARROW_CONFIG_NAME=legacy-config
SPARROW_SCOPE_NAME=ESPN_NEXUS
SPARROW_WORKSPACE=Growth
```

`.env.local.example` documents the Vault source: **service `espnplus-nexus`,
namespace `60c7e031310ce5f580d4db16`, env `staging`**, secrets
`DAPI_SENSITIVE_SECRETS_API_KEY`, `REMOTE_CONFIG_S3_ACCESS_KEY`,
`SPARROW_S3_ACCESS_KEY`; populated by `./scripts/setup configure secrets`.

Also used but not in `.env.example` (**CONFIRMED** from code): `ROOT_URL`
(`get-server-side-props.ts:108`), `STATIC_ROOT_URL`, `SOURCE_MAP_URL`,
`GIT_COMMIT`, `DD_ENV`, `APPLICATION_NAME`, `NEXT_PUBLIC_API_MOCKING`.

### 2.8 Deploy shape

**CONFIRMED** — `Dockerfile` is a bare `node:22.14.0` image from Artifactory,
`EXPOSE 3000`, `USER node`, `CMD ["./entrypoint.sh"]`. `entrypoint.sh` sources
`/shared/config/application-vault.properties` into the env then runs
`npm start`. Turbo task config (`turbo.json`) marks `dev:server` and `proxy` as
`persistent: true, cache: false`, and `build` outputs `build/**` (matching
`distDir: 'build'` in prod).

---

## 3. NEXUS platform concepts

### 3.1 What NEXUS is

**CONFIRMED** — `apps/marketing-unified/README.md:7`:

> **NEXUS** is the unified marketing website platform serving Disney+, Hulu, and
> ESPN landing and content pages. All three brands share the same Next.js
> architecture, CMS integration, and component system, with brand-specific
> customization via configuration and overrides.

### 3.2 The layers

**CONFIRMED** (composite of `apps/marketing-unified/README.md:27-66` and the ESPN
files below):

```
Request
  ↓  L1 EDGE          src/middleware.page.ts        locale/case/geo → headers
  ↓  L2 ROUTE         src/pages/[[...path]].page.tsx  (single catch-all)
  ↓  L3 CONFIG        get-configs.ts → Sparrow       paths, flags, countries
  ↓  L4 DATA LOADER   get-page-data.ts               Cannonball | Spaceball
  ↓  L5 CONTENT       get-cms-content.ts             pathResult → CMSPayload
  ↓  L5b PRICING      get-cms-content-with-tokens-replaced.ts (offer tokens)
  ↓  L6 BUILD         stitch/build-stitch-document.ts → StitchDocument
  ↓  L7 PROPS         get-page-props.ts (+ footer props + debug)
  ↓  L8 RENDER        views/landing-page.tsx + <StitchComponent> + registry
  ↓  L9 PERSONALIZE   ExperimentScripts (client) → variantId/featureFlags
```

### 3.3 The route layer is one file

**CONFIRMED** — `apps/marketing-unified/espn/src/pages/[[...path]].page.tsx`
is **7 lines**:

```tsx
1	import { getPageLayout } from '../shared/layout';
2	import { LandingPage } from '../views/landing-page';
3
4	LandingPage.getLayout = getPageLayout;
5
6	export { getServerSideProps } from '../views/landing-page/get-server-side-props';
7	export { LandingPage as default } from '../views/landing-page';
```

`getLayout` composition is defined in
`apps/marketing-unified/espn/src/shared/layout.tsx:38-60`
(`ApplicationLayout` → `PageLayout` → children).

### 3.4 Module/component layer: Stitch

**CONFIRMED** — `packages/marketing/README.md:40-51`: Stitch is a
**Model → Builder → Component → Registry** pipeline.

- **Model** — a zod schema per CMS content type, e.g.
  `packages/marketing/stitch/src/models/plan-card-model.ts:18`.
- **Builder** — pure function CMS-field → StitchElement, e.g.
  `packages/marketing/stitch/src/builders/build-plan-card.ts:11`.
- **Component** — React renderer that resolves its concrete component from the
  registry, e.g. `packages/marketing/stitch/src/components/stitch-plan-card.tsx:13`
  → `useRegisteredComponent('planCard')`.
- **Registry** — default map in
  `packages/marketing/stitch/src/components/stitch-component-registry-provider.tsx:343`
  (`planCard: { component: PlanCard }`), typed at `:254`.

### 3.5 How generic packages get specialised for ESPN

**CONFIRMED** — five specialisation seams, all data/config rather than forks:

| Seam | ESPN value | Where |
| --- | --- | --- |
| **Registry overrides** | `entitledContent`, `slider.getItemsApiAdapter = getWatchApiItemsAdapter`, `image.srcsetGenerator` → Ripcut with `RIPCUT_PROD_ENDPOINT` | `src/shared/layout/application-layout/stitch-component-registry-overrides.tsx:9-26` |
| **`AppContext`** | `siteName: 'ESPN'`, `ripcutHost/Endpoint`, `assetHosts.cdn = a.espncdn.com`, favicons, social links, `parentOrganization.url = https://www.plus.espn.com/`, `fontsToLoad: EspnFonts`, `planToEntitlementsMap` | `src/views/landing-page/get-server-side-props.ts:348-379` |
| **Sparrow scope** | `SPARROW_SCOPE_NAME=ESPN_NEXUS`, workspace `Growth` | `.env.example:7-8` |
| **CMS org/space** | Cannonball & Spaceball org `espnplus`, spaces `landingpages` / `redirects` / `global` | `src/mocks/apis/sparrow-espn-nexus-config.ts` (paths block) |
| **Tailwind** | `presets: [espnPreset]`, `plugins: [espnPlugin]` | `tailwind.config.cjs:14-15` |
| **Data interface** | `buildDataInterface as buildESPNDataInterface` from `@solo/data-interface-espn` | `src/shared/layout/application-layout.tsx:3,125` |
| **Breakpoints** | `configureBreakpoints('espn')` at module scope | `src/shared/layout/application-layout.tsx:33` |
| **GraphQL query set** | `EspnplusLandingpages` / `EspnplusRedirects` / `EspnplusGlobal` resolved by `(org, space)` | `packages/marketing/growth-cms-api/src/shared/graphql/queries.ts:9-11` |

**INFERRED** — This is why ESPN has ~0 bespoke components: the brand is
expressed almost entirely through config, tokens and CMS content. The only
ESPN-specific React file in the registry is `entitled-content.tsx`.

---

## 4. Route inventory

### 4.1 File-level routes (**CONFIRMED**, `src/pages/`)

| Route | File | Data source | Purpose |
| --- | --- | --- | --- |
| `/*` (everything) | `src/pages/[[...path]].page.tsx` | GSSP → Sparrow + Cannonball/Spaceball | Optional catch-all; every marketing page |
| `/404` | `src/pages/404.page.tsx` | static | "Page Not Found." via `ErrorPage`, `getErrorLayout` |
| `/500` | `src/pages/500.page.tsx` | static | "Page Not Available" |
| `/denied` | `src/pages/denied.page.tsx` | static | Geo-blocked: "Your country is not supported." |
| `/healthcheck` | rewrite → `src/pages/api/healthcheck.api.ts` | — | LB/K8s probe (`next.config.js:58-61`) |
| `/akamai-healthcheck` | rewrite → `src/pages/api/akamai-healthcheck.api.ts` | — | Akamai origin probe |
| `/api/footer-preview` | `src/pages/api/footer-preview.api.ts` | `@solo/footer/api` | Footer CMS preview handler (2 lines: `createFooterPreviewHandler()`) |
| — | `src/pages/_app.page.tsx` | — | `initDatadogRum()`, MSW bootstrap when `NEXT_PUBLIC_API_MOCKING=playwright`, `getLayout` dispatch |
| — | `src/pages/_document.page.tsx` | — | `<Html lang>` from middleware headers; `<noscript>` un-hides `.experiment-preload-visibility` |

**There are no `.page.tsx` files for movie/series/guides pages in ESPN.** The
parent README lists `landing-page`, `movie-page`, `guides-page` as "current
views" for the platform — ESPN only has `landing-page`
(`src/views/landing-page.tsx`) plus `error-page.tsx` / `denied-page.tsx`.

### 4.2 CMS-level routes (**CONFIRMED**, 29 routes)

From the local Cannonball manifest fixture
`src/mocks/apis/cnbl-lps-manifest.json` (`data.routes` keys, with published
locales). This is a *snapshot of prod route keys* used for MSW, so it is the
best available inventory of real ESPN marketing pages:

| CMS route key | URL | Locales | Purpose |
| --- | --- | --- | --- |
| `homepage` | `/` | en-US, es-US | **OLP** — offer landing page / plan comparison |
| `soccer` | `/soccer` | en-US, es-US, en, es | Sport MLP (the canonical MLP in tests) |
| `nfl` | `/nfl` | en-US | Sport MLP |
| `nflbundle` | `/nflbundle` | en-US | NFL bundle offer page |
| `nhl` | `/nhl` | en-US | Sport MLP |
| `mlbtv` | `/mlbtv` | en, es, en-US, es-US | MLB.TV add-on page |
| `golf` | `/golf` | en-US | Sport MLP |
| `cfb` | `/cfb` | en-US | College football |
| `cbb` | `/cbb` | en-US | College basketball |
| `tennis` | `/tennis` | en-US | Sport MLP |
| `ufc` | `/ufc` | en-US, es-US | Combat sports / PPV |
| `wwe` | `/wwe` | en-US, es-US | WWE |
| `pfl` | `/pfl` | en-US | PFL |
| `originals` | `/originals` | en-US, en | ESPN Originals content |
| `bundle` | `/bundle` | en-US | Disney+/Hulu/ESPN bundle |
| `changeplans` | `/changeplans` | en-US | **Plan comparison / plan-card page** |
| `app` | `/app` | en-US | App download page |
| `foxone` | `/foxone` | en-US | Fox One partner offer |
| `foxoneadditionalterms` | `/foxoneadditionalterms` | en-US | Legal |
| `additionaltermsapply` | `/additionaltermsapply` | en-US | Legal |
| `bundletermsapply` | `/bundletermsapply` | en-US | Legal |
| `business-everpass` | `/business-everpass` | en-US | B2B (Everpass) |
| `business-jhp` | `/business-jhp` | en-US | B2B |
| `partner-program` | `/partner-program` | en-US | Partner/affiliate |
| `partner-program/welcome` | `/partner-program/welcome` | en-US | Partner onboarding |
| `restricted/ryans-test` | `/restricted/ryans-test` | en-US | Gated test page |
| `restricted/test-dtc` | `/restricted/test-dtc` | en-US | Gated test page |
| `restricted/test-sarah` | `/restricted/test-sarah` | en-US | Gated test page |
| `images/test` | `/images/test` | en | Image QA page |

**CONFIRMED** — the `/` ↔ `homepage` mapping is done in
`get-server-side-props.ts:169-172`:

```ts
169	      const isHomePage = pathname === '/';
170	      const cannonballPath = isHomePage
171	        ? 'homepage'
172	        : pathname.replace(/^\//, ''); // Remove leading slash
```

…and the reverse (`/homepage` → `/`) in `middleware.page.ts:82-92`.

**INFERRED** — `/offers` is **not** an ESPN NEXUS route; the nav "GET ESPN" CTA
points at `https://www.espn.com/watch/offers` (owned by ESPN Watch, outside this
repo). Playwright asserts only `toHaveURL(/\/offers/i)`
(`playwright/tests/pages/olp.spec.ts:68`, `mlp-sp.spec.ts:62`).

---

## 5. Data fetching: Cannonball vs Spaceball

### 5.1 Cannonball (legacy)

**CONFIRMED** — Two-step, CDN JSON. `packages/marketing/growth-cms-api/README.md:95-111`
documents the manifest shape:

```json
{ "_type": "manifest", "_version": 2, "_preview": false,
  "routes": { "mypath": { "type": "Snapshot",
    "resources": { "en-US": "//someCannonballPath.json" } } } }
```

Loader: `packages/marketing/growth-cms-api/src/cannonball/check-path-in-cannonball.ts:79`.
Result type (`:22-30`):

```ts
22	export interface CannonballPathCheckResult {
23	  source: 'cannonball';
24	  isPathValid: boolean;
25	  availableLocales: string[];
26	  pageData: CannonballPageData | null;
27	  manifest: CannonballManifest;
28	  marketLocales: string[];
29	  isWildcard: boolean;
30	}
```

Notable options (`:79-103`): `fetchPageData` (default `false`) makes it fetch the
snapshot too; `manifest` lets a caller **reuse an already-fetched manifest** to
avoid a second network hop; `previewId` selects preview content. It composes
`fetchManifest`, `fetchSnapshot`, `getAvailablePublishedLocales`,
`getPreferredCannonballPath` from `./cannonball-utils` (`:2-7`).

Prod/preview hosts (**CONFIRMED**, `src/mocks/apis/sparrow-espn-nexus-config.ts`
paths block):

```
stage        https://cnbl-cdn-stage.bamgrid.com/
stagePreview https://cnbl-preview-stage.bamgrid.com/
prod         https://cnbl-cdn.bamgrid.com/
preview      https://cnbl-preview.bamgrid.com/
```

### 5.2 Spaceball (target)

**CONFIRMED** — single GraphQL POST. Loader:
`packages/marketing/growth-cms-api/src/spaceball/check-path-in-spaceball.ts:54`.
Result type (`:45-52`) is deliberately the *same shape minus `manifest`*:

```ts
45	export interface SpaceballPathCheckResult {
46	  source: 'spaceball';
47	  isPathValid: boolean;
48	  availableLocales: string[];
49	  pageData: SpaceballPageData | null;
50	  marketLocales: string[];
51	  isWildcard: boolean;
52	}
```

Endpoints (**CONFIRMED**, same Sparrow paths block):

```
stage        https://spaceball-stage.global.twdcgrid.net/graphql
prod         https://spaceball.global.twdcgrid.net/graphql
preview      https://spaceball-preview.us-east-1.twdcgrid.net/graphql
stagePreview https://spaceball-preview-stage.us-east-1.twdcgrid.net/graphql
```

Query resolution is **per (org, space)**:
`packages/marketing/growth-cms-api/src/shared/utils/get-query.ts:4-21` looks up
`getTenantQueries({ org, space })` then `Queries[queryKey]`, and `print()`s the
gql document. ESPN's three modules are registered in
`packages/marketing/growth-cms-api/src/shared/graphql/queries.ts:9-11`:

```ts
 9	export * as EspnplusLandingpages from './queries/espn/landing/queries';
10	export * as EspnplusRedirects   from './queries/espn/redirects/queries';
11	export * as EspnplusGlobal      from './queries/espn/offer-tokens/queries';
```

`packages/marketing/growth-cms-api/src/shared/graphql/queries/espn/landing/queries.ts`
is only two re-exports (`pageQuery` from shared, `redirectsQuery` local).

The shared `pageQuery`
(`packages/marketing/growth-cms-api/src/shared/graphql/queries/shared/page.ts:3-42`)
does four jobs in one round trip: `inMarketLocales` (skippable), `locales`
(all published locales for the route), `page(… full: true)` (the content), and a
conditional `wildcard` + `wildcardLocales` pair.

ESPN's `redirectsQuery`
(`…/queries/espn/landing/redirects.ts:3-20`) returns
`{ _id, url, statusCode, allowInBetaOverride, includeQueryParams }` from the
`redirect` content type.

### 5.3 The migration seam — `getPageData`

**CONFIRMED** — `apps/marketing-unified/espn/src/views/landing-page/get-server-side-props/get-page-data.ts`.
This is the single switch:

```ts
 92	  const pathCheckResult = enableSpaceball
 93	    ? await checkPathInSpaceball({
 94	        route: pathname,
 95	        locale,
 96	        homepageRoute,
 97	        config: spaceballConfig!,
 98	        queryKey,
 99	      })
100	    : await checkPathInCannonball({
101	        route: pathname,
102	        locale,
103	        homepageRoute,
104	        config: cannonballConfig!,
105	        previewId,
106	        fetchPageData: true,
107	      });
```

Two design details worth knowing:

- **`fetchPageData: true`** on the Cannonball branch (`:106`) means the old
  "check path, then separately fetch the snapshot" two-call pattern was collapsed
  into one call so both backends return `pageData` directly. The docblock at
  `:57-62` says so explicitly.
- **The Cannonball data processor runs in both modes** (`:126-136`):

```ts
126	  // Running the cannonball data processor even without processessors.  This is done to ensure that _type exists on all component objects.
127	  if (pathResult.pageData) {
128	    pathResult.pageData = await cannonballDataProcessor({
129	      cannonballContentData: pathResult.pageData,
130	      locale, processors: {},
131	      injectableData: { spaceballConfig: spaceballConfig ?? null },
132	    });
133	  }
```

  Spaceball returns `_contentType`, Cannonball returns `_type`; the processor
  normalises so Stitch models (which key on `_type`) keep working.
- **Tracing** (`:117-142`): sets span tags `spaceball_path_check`
  (`success`/`error`) and `spaceball_enabled`. Combined with
  `spaceball_cache_status` / `cannonball_cache_status` from the CMS package
  (`packages/marketing/growth-cms-api/README.md:343-353`), this is how the
  migration is monitored in Datadog APM.

### 5.4 Which ESPN routes use which

**CONFIRMED** — *all of them use whichever the flag says*. There is no per-route
allowlist. Two separate flags:

| Flag | Controls | Default in fixture |
| --- | --- | --- |
| `enableSpaceball` | page content + redirects lookups | `false` (`src/mocks/apis/sparrow-espn-nexus-config.ts:24`) |
| `enableSpaceballMlp` | **offer-token** source only | `false` (`:25`) |

Both are read via `getFeatureFlagWithQueryOverride(config.featureConfig, …, query)`
(`get-server-side-props.ts:163-167` and `:384-388`), so they can be flipped per
request with `?enable-spaceball=true` — which is exactly what the "-sp" Playwright
specs do (`playwright/tests/pages/mlp-sp.spec.ts:16`).

**INFERRED** — In the checked-out fixture both flags are `false`, i.e. ESPN
marketing is (as of this commit) **still Cannonball-primary**, with Spaceball
reachable behind a flag/QSP. The live Sparrow prod value could differ; the
fixture only proves the local/default value.

### 5.5 Data-loader table

| # | File | Called from | Backend | Instance / space | Returns |
| --- | --- | --- | --- | --- | --- |
| 1 | `get-configs.ts:54` `getConfigs` | GSSP `:127` | Sparrow (S3) | scope `ESPN_NEXUS`, config `legacy-config`, variant from `?sparrow-variant` / cookie / `prod` | `paths`, `featureConfig`, `countries`, `appConfig`, `remoteAppConfig`, `dictionaryVersions`, `planToEntitlementsMap` |
| 2 | `get-page-data.ts:64` `getPageData` (page) | GSSP `:214-223` | Cannonball **or** Spaceball | `landingPages` | `pathResult` incl. `pageData`, `availableLocales`, `isPathValid` |
| 3 | `get-page-data.ts:64` `getPageData` (redirects) | GSSP `:224-232` | Cannonball **or** Spaceball | `redirects`, **language-only locale** (`:226`) | vanity-redirect record |
| 4 | `getDictionaryServerProps` (`@solo/dictionary`) | GSSP `:336-346` | Dictionary service | `productName: 'espn'`, `DICTIONARY_NAMES`, `DICTIONARY_KEYS` | i18n strings |
| 5 | `getCmsContentWithTokensReplaced` → `replaceOfferTokensInSnapshot` (`@solo/plans-pricing-api`) | GSSP `:401-410` | Cannonball **or** Spaceball, instance `global` | `global` (org `espnplus`, env `production`) | snapshot with prices substituted |
| 6 | `getFooterProps` (`@solo/footer`) | `get-page-props.ts:96-104` | Cannonball, `cannonballEnvironment: 'production'`, `region: 'us'` hard-coded | global-footer | footer content |
| 7 | `getExperiment` (client) | `experiment-scripts.tsx:79-86` | Orchestration / device SDK | — | `variantId`, `featureFlags` |

Caching: `getDssNodeDataLoaderConfig` wires `dss-node-data-loader` with
`config.path.cache_clients.primary` and
`config.appConfig.pageContentRedisHostname` (`get-server-side-props.ts:156-161`);
the same `cacheOptions` object is threaded into every CMS instance config.
Cache strategy is **target-URL-based, not caller-env-based**
(`packages/marketing/growth-cms-api/README.md:240-280`), so stage-web hitting
prod Spaceball is still cached.

---

## 6. The plan card / plan comparison page

### 6.1 There is no plan page *file*

**CONFIRMED** — `find` over the repo yields no ESPN plan page. The plan-card
machinery is generic Stitch + growth-components:

| Layer | File |
| --- | --- |
| Model (zod) | `packages/marketing/stitch/src/models/plan-card-model.ts:18` |
| Builder | `packages/marketing/stitch/src/builders/build-plan-card.ts:11` |
| Stitch component | `packages/marketing/stitch/src/components/stitch-plan-card.tsx:9` |
| Registry key | `planCard` — default binding at `packages/marketing/stitch/src/components/stitch-component-registry-provider.tsx:343` |
| Rendered component | `packages/marketing/growth-components/src/plan-card/plan-card.tsx` (exported at `growth-components/src/main.ts:144`) |

**CONFIRMED** — ESPN does **not** override `planCard`
(`src/shared/layout/application-layout/stitch-component-registry-overrides.tsx:9-26`
overrides only `entitledContent`, `slider`, `image`), so ESPN renders the shared
`PlanCard`.

**CONFIRMED** — `build-plan-card.ts` shows the plan card is a *pure layout
container*, not a data-driven pricing widget:

```ts
51	  return {
52	    _id,
53	    _type: 'PlanCard',
54	    header: builtHeader,
55	    body: bodyContent,
56	    footer: footerContent,
57	    footerTitle,
58	    collapsedTitle: { mobile: …, tablet: …, desktop: … },
63	    expandedTitle:  { mobile: …, tablet: …, desktop: … },
68	    shouldExpandOnLoad,
69	  };
```

`header`, `body[]` and `footer[]` are arbitrary child StitchElements built by
`buildEntity` (`:33,39-49`). It returns `null` if the header is empty (`:35-37`)
— i.e. a headerless plan card silently disappears.

**INFERRED** — The pages that *use* plan cards are the CMS routes `/` (OLP),
`/changeplans`, `/bundle`, `/nflbundle`, and the sport MLPs. Which components a
page contains is authored in the CMS, not in code, so the repo cannot tell you
definitively.

### 6.2 Where plan / offer / price data comes from

**CONFIRMED** — Prices are **not** fetched from a plans API at render time.
They arrive as **offer tokens**: CMS authors write placeholders, and GSSP
substitutes formatted prices before building props.

The GSSP step (`get-server-side-props.ts:381-410`):

```ts
381	      // Replace offer-token placeholders (e.g. {{token_name.price}}) with formatted
382	      // prices before building page props. Offer tokens are fetched from Spaceball when
383	      // enableSpaceballMlp is on, otherwise from the Cannonball manifest. See GCIEX-12583.
384	      const enableSpaceballMlp = getFeatureFlagWithQueryOverride(
385	        config.featureConfig, 'enableSpaceballMlp', query);
389	      const useOfferTokenPreview = Boolean(query['preview-offer-tokens']);
390	      const offerTokenCmsConfig = getCannonballInstanceConfig({
391	        config: config.paths[enableSpaceballMlp ? 'spaceball' : 'cannonball'],
392	        instance: 'global',
396	        previewQSP: 'preview-offer-tokens',
398	      });
399	      // When the 'global' offer-token instance isn't configured for the selected
400	      // CMS backend, skip token replacement rather than failing the whole page.
401	      const cmsPayloadWithTokensReplaced = offerTokenCmsConfig
402	        ? await getCmsContentWithTokensReplaced(cmsPayload, { … })
403	        : cmsPayload;
```

Token catalogue shape (**CONFIRMED**, `src/mocks/apis/cnbl-offer-token-global-snapshot.json`):

```json
{"_type":"offer_token_global_parent","_id":"espnOfferTokenGlobalParent1",
 "offer_tokens":[
   {"_type":"offer_token","token_name":"espn_unlimited_monthly",
    "package_id":"espn_unlimited","fallback_frequency":"MONTHLY",
    "fallback_retail_price":"29.99","fallback_price":"29.99",
    "fallback_currency":"USD"},
   {"token_name":"espn_unlimited_annual","package_id":"espn_unlimited",
    "fallback_frequency":"ANNUAL","fallback_retail_price":"299.99", …}],
 "custom_tokens":[]}
```

Same data over GraphQL (**CONFIRMED**,
`packages/marketing/growth-cms-api/src/shared/graphql/queries/shared/offer-tokens.ts:3-26`):

```graphql
query OfferTokens($route: String, $locale: String) {
  offerTokenGlobalParent(locale: $locale, where: { route: $route }) {
    offer_tokens { token_name package_id fallback_frequency
                   fallback_retail_price fallback_price fallback_currency }
    custom_tokens { token_name value }
  }
}
```

Substitution engine (**CONFIRMED**, `packages/marketing/plans-pricing-api/src/`):
`tokens/fetch-cms-tokens.ts`, `tokens/resolve-tokens.ts` (+
`resolve-tokens/build-token-graph.ts`, `resolve-tokens/replace-tokens.ts`),
`tokens/replace-tokens-in-snapshot.ts`, `tokens/formatter.ts`, and a live-price
path under `glo/get-offers.ts` (GLO = the offers service).

ESPN's currency formatting is **hard-coded in the app**, not remote
(`get-cms-content-with-tokens-replaced.ts:13-58`): only `USD`/`$`, region `US`,
`en` + `default` language, format string `'${N}${S}${P}${p}'`. The call passes
`tenant: 'espn'`, `appLangMap: { en: 'en-US' }` (`:101-109`).

Observability: token replacements are counted by regex-matching `$dd.dd` in the
serialised payload and set as span tag `tokens_replaced`
(`get-cms-content-with-tokens-replaced.ts:129-136`) — a crude but useful "did
pricing actually render" signal.

Failure mode: if `replaceOfferTokensInSnapshot` errors, the app **throws** so
prod renders the 500 page (`:113-127`).

### 6.3 The commerce hand-off contract

**CONFIRMED** — Extracted from the ESPN CMS fixtures
(`src/mocks/apis/cnbl-landing-page-home-snapshot.json`,
`cnbl-landing-page-soccer-snapshot.json`,
`spaceball-landing-home-snapshot.json`). These are the real authored hrefs:

```
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=espn_select
https://secure.web.plus.espn.com/commerce/billing?pref=espn_nfl_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=disney_hulu_espn_nfl_bundle
https://secure.web.plus.espn.com/identity/login?redirectURL=https://plus.espn.com/
https://www.espn.com/watch/offers
https://www.espn.com/watch/offers?entitlement=ESPN_FLAGSHIP
https://plus.espn.com/app
```

**The hand-off contract is therefore:**

| Param | Value space | Meaning |
| --- | --- | --- |
| host | `secure.web.plus.espn.com` | commerce app (`apps/commerce/espn`) |
| path | `/commerce/billing` | signup billing entry; also `/commerce/account`, `/commerce/change-subscription` seen in identity fixtures |
| `pref` | `espn_unlimited`, `espn_unlimited_bundle`, `espn_select`, `espn_nfl_bundle`, `disney_hulu_espn_nfl_bundle` | **preferred package id** — matches `offer_token.package_id` |
| `redirectURL` | absolute URL | post-login return target (`/identity/login`) |
| `entitlement` | e.g. `ESPN_FLAGSHIP` | ESPN Watch deep-link filter (not commerce) |

**CONFIRMED — the marketing app does not construct these URLs.** `buildLink`
(`packages/marketing/stitch/src/builders/build-link.ts:11-95`) passes `href`
through verbatim; the only transformation is optional locale prefixing when the
CMS sets `autoLocalizeUrl` (`:53-60`, via `autoLocalizeUri`). No query-param
merge, no campaign-param forwarding, no `pref` computation.

**CONFIRMED — `pref` is consumed on the commerce side**, and it survives the
identity flow:

- `packages/cgi/commerce-base/src/identity/sign-up/pages/sign-up-wrapper-page.test.tsx:225,248`
  and `.../identity/login/pages/login-wrapper-page.test.tsx:282,305` assert the
  `?pref=espn_unlimited_bundle` search string is preserved across login/signup.
- `packages/cgi/commerce-base/src/signup/student/student-sheerid-iframe.tsx:108-109`
  re-attaches `pref` to SheerID program + referer URLs.
- Flex/BFF fixtures set `content.action.data.query.pref`
  (`packages/cgi/commerce-base/src/signup/__browser-mocks__/handlers.ts:624,675`),
  i.e. `pref` is part of the server-driven-UI action contract.

**INFERRED** — Full click path: user clicks a plan CTA on `plus.espn.com` →
browser navigates to `secure.web.plus.espn.com/commerce/billing?pref=<pkg>` →
the commerce app (a different Next app in this monorepo, `apps/commerce/espn`)
resolves `pref` to an offer via Flex and renders billing. Nothing is shared
client-side between the two apps except the URL.

Client-side analytics on the click (**CONFIRMED**,
`src/views/landing-page.tsx:24-36`): `StitchActionsProvider` maps CMS
`actionKey` → Datadog RUM actions `GET_ESPN` (signup) and `LOG_IN`.

---

## 7. CMS and content

### 7.1 Which CMS

**CONFIRMED** — Cannonball (today) / Spaceball (target), org **`espnplus`**,
three spaces (`src/mocks/apis/sparrow-espn-nexus-config.ts`, paths block):

| Instance | org | space | environment | availableEnvironments |
| --- | --- | --- | --- | --- |
| `landingPages` | `espnplus` | `landingpages` | `prod` | `['prod','sandbox']` |
| `redirects` | `espnplus` | `redirects` | `prod` | `['prod']` |
| `global` | `espnplus` | `global` | `production` | `['production']` |

ESPN's app-local type mirror is
`src/shared/types/configs.ts:1-36` — note the comment on line 1: *"Mirror Hulu's
type structure (apps/marketing-unified/hulu/src/shared/types/configs.ts:1-116)"*,
and `:9` "Add other instances as needed (guides, content, etc.)". ESPN's config
surface is intentionally the smallest of the three brands.

### 7.2 Content model → component mapping

**CONFIRMED** — the mapping is the registry:

1. CMS emits `_type` (Cannonball) / `_contentType` (Spaceball) per node.
2. `cannonballDataProcessor` normalises to `_type` (`get-page-data.ts:126-136`).
3. `buildStitchDocument` runs zod validation then builders
   (`src/views/landing-page/stitch/build-stitch-document.ts`):

```ts
70	    topBanner  = cannonballEntity.topBanner?.map(b => buildBanner({…})) ?? [];
74	    navigation = cannonballEntity.navigation?.map(n => buildEntity({…})) ?? [];
78	    preContent = [topBanner, navigation].flat().filter(e => e !== null);
81	    styleOverrides = cannonballEntity.style_overrides?.map(o => buildStyleOverride({…}));
86	    metadata   = buildMetadata({ appContext, contentField: cannonballEntity, routeContext: routeConfig });
```

4. `<StitchComponent model={…}/>` resolves each node through the registry
   (`src/views/landing-page.tsx:92-129`, rendering
   `metadata`, `styleOverrides`, `preContent`, `mainContent`, `postContent`,
   `modals`, then `<Footer>`).

**Schema validation is non-fatal** — `validateCannonballEntity`
(`build-stitch-document.ts:22-41`) catches `ZodError`, logs
`eventName: 'stitchWarn'` with the message *"Cannonball Data Error: Layout
contains invalid data but proceeding to process it"*, and continues. Only two
hard failures exist: `BUILD_ERROR` and `MAIN_CONTENT_REQUIRED_ERROR` (`:43-46`).

Above-the-fold image loading is estimated, not measured
(`src/views/landing-page/shared/constants.ts:19-73`): a
`COMPONENT_VIEW_HEIGHT_CONFIG` of per-device vh guesses per component type
(`Hero: 100`, `Banner: 25`, `Section: 55/30`, …) feeds
`updateContentLoadingStrategy` from `@solo/stitch/shared`. The docblock warns
these are "rough approximations — not pixel-precise" and should be tuned per
tenant from LCP/CLS data.

### 7.3 Preview modes

**CONFIRMED** — four independent preview mechanisms:

| Mechanism | QSP / trigger | Where |
| --- | --- | --- |
| **Page content preview** | `?preview=<contentId>` | `get-server-side-props.ts:154,210-212`; passed to `checkPathInCannonball` as `previewId` |
| **Preview validation** | — | `get-server-side-props/validate-preview-content.ts:13-47` |
| **Offer-token preview** | `?preview-offer-tokens` | `get-server-side-props.ts:389,396` (`previewQSP`) |
| **Footer preview** | `?footerPreview` + `/api/footer-preview` | `get-page-props.ts:102`; `src/pages/api/footer-preview.api.ts` |
| **Sparrow config variant** | `?sparrow-variant=<v>` or `sparrow-variant` cookie | `get-configs.ts:35-47` |

The preview-validation rule is asymmetric by environment
(`validate-preview-content.ts:5-29`):

```ts
 5	/*
 6	 * Previewing content is stricter in Production vs local and staging
 7	 * In Production, the preview id must match the content id exactly,
 8	 * If it does not match, we remove query param and redirect, to fetch published content
10	 * When debugging tooling is enabled (local and staging) the preview query
11	 * param just needs to be present.
12	 */
23	  if (isDebugToolingEnabled() || query.preview == undefined) return null;
29	  if (contentId !== previewId) { …strip ?preview and 302… }
```

**Preview caching**: `setCacheHeaders(res, isPreviewContentRequested)`
(`get-server-side-props.ts:429`) — preview requests get different cache headers
than published ones.

**Author round-trip aid** (**CONFIRMED**, `get-page-props.ts:119-133`): props
carry a `debug` block with `entityId`, `source`, a `buildCannonballEditUrl(...)`
deep-link back into the CMS, and `getCmsEnvironmentData(...)` describing which
instance/environment each space resolved to. Surfaced by the Toodles widget
when `ENABLE_DEBUG_TOOLING=true`.

---

## 8. Personalization and experiments

### 8.1 What exists

**CONFIRMED** — client-side, in `src/shared/layout/application-layout/experiment-scripts.tsx`
and its ~20-file `get-experiment/` subtree:

- `ExperimentScripts` provides `StitchExperimentContext` with
  `{ variantId, setVariantId, featureFlags, setFeatureFlags }` (`:141-147`).
- `getExperiment({ language: 'en', region: 'us', pathname, orchestrationUrl,
  sdkConfig, setFeatureFlags })` (`:79-86`) — note **language/region are
  hard-coded to `en`/`us`** here even though the app serves `es-us`.
- **Anti-flicker gate**: children render inside
  `<div className="experiment-preload-visibility">` (`:144`) which is hidden by
  default until a variant resolves; `_document.page.tsx:34-51` injects a
  `<noscript><style>` that force-shows it when JS is off.
- **Forced variant** support (`:69-74`) plus a `disable-exp=true` escape hatch
  used by all Playwright specs (`playwright/helpers.ts:61,65`).
- **Crawler bypass**: `isCrawlerBot` from `@solo/growth-utils` (`:2,117-118`).
- Device session is built from scratch under
  `get-experiment/create-session/**`: `get-device-attributes`,
  `get-device-profile`, `get-latest-session` → `build-register-device-request`,
  `build-exchange-device-grant-request`, `fetch-from-orchestration`,
  `get-device-grant-from-local-storage`, `get-sdk-cache-keys/{access,
  device-grant, session-info}`, `transform-orchestration-to-access`,
  `map-response-to-session-info`.
- `showContent.ts` gates content on the resolved variant.
- Feature flags in the Sparrow fixture (`src/mocks/apis/sparrow-espn-nexus-config.ts:20-27`):
  `enableExperimentationFlag: false`, `enableExperimentationProvider: true`,
  `enableAmpWeaponX: true`, `enableSpaceball: false`, `enableSpaceballMlp: false`,
  `enableOneTrustUnauthAnonymous: true`.

Server-side "personalization" is really **localisation + entitlement**, not
targeting:

- **Geo/locale redirects** — `get-localization-redirect.ts` + `run-localization-rules.ts`
  with `verify-location.ts`, `verify-language-in-url.ts`,
  `verify-browser-preferred-language.ts`, `shared/is-parent-country-enabled.ts`.
  Driven by `config.countries` (`get-server-side-props.ts:138-152`).
- **Entitled content** — `stitch-component-registry-overrides/entitled-content.tsx`
  plus `page-layout/auth-and-entitled-guard.tsx`. The guard
  (`auth-and-entitled-guard.tsx:9-53`) checks the SDK session for an **ACTIVE
  subscription containing entitlement id `39547863` (`ESPN_FLAGSHIP`)** and, for
  `routesToValidate = new Set(['/'])`, redirects entitled users to
  `https://www.espn.com/watch/espnplus/`. There is also MLB-TV add-on detection
  keyed on SKUs starting `mlb_`.
- **Wholesale/MVPD cohorts** — `use-adobe-analytics-common-data/use-flex-adobe-analytics-subscriber-cohorts.tsx`
  fetches cohorts from **Flex**; the typed contextData is
  `{ tenant: 'espn', isWholesaleUser, isMVPDWholesaleUser, wholesaleUserProvider,
  login_status }` (`use-set-common-adobe-data.tsx:12-20`).

### 8.2 What explicitly does NOT exist

**CONFIRMED — experiment/variant is NOT attached to Datadog RUM context.**
`src/libs/datadog-rum.ts` calls `datadogRum.init(...)` and
`startSessionReplayRecording()` and sets **no** global context. A repo-wide grep
shows ESPN never calls `setGlobalContextProperty` / `setUser`; the only sibling
that does is Disney+ marketing
(`apps/marketing-unified/disneyplus/src/components/SetDatadogRouteContext.tsx:29-30`
sets `routeArchetype` + `routeGroup`;
`SetDatadogAuthContext.tsx:14` sets auth context).

The experiment result is emitted only as a one-off action
(`experiment-scripts.tsx:110-113`):

```ts
110	      datadogRum.addAction('EXPERIMENT', {
111	        value: experiment.value,
112	        locale: getLangLocale(currentURL.pathname, false),
113	      });
```

**Consequence (INFERRED):** you cannot slice ESPN RUM views / Core Web Vitals /
session replays by experiment or variant. You can only find the `EXPERIMENT`
action event and correlate by session id manually. Any "did variant B hurt LCP"
question needs a `setGlobalContextProperty('variantId', …)` added first.

**CONFIRMED — no Tealium and no HITS in the code.** A grep for
`tealium|hits` across `apps/marketing-unified/espn/src` returns nothing, despite
`apps/marketing-unified/espn/README.md:122-128` listing "Tealium — Tag
management" and "HITS — ESPN internal tracking". The actual stack is Datadog RUM
+ Adobe Analytics + Adobe Launch (`src/shared/layout/application-layout/load-analytics.tsx:43-58`).

**CONFIRMED — no route-level A/B routing, no edge personalization.** The
middleware does locale/case/geo only; there is no bucketing, cookie-splitting,
or variant rewrite at the edge.

### 8.3 Analytics wiring (for completeness)

- `LoadAnalytics` gates Adobe on consent: `hasPrivacyConsent.isReady &&
  enabledConsentGroups.targetedAdvertising`
  (`load-analytics.tsx:28-31`), then renders `<AdobeAnalytics>` +
  `<AdobeLaunch>` (`:45-57`). Without consent, **no** Adobe tags load.
- Page view fires once, and only after both `dssDeviceId` **and**
  `wholesaleUserProvider` are populated (`src/views/landing-page.tsx:59-81`),
  as `analyticsCallback('page_impression', { adobeAnalytics: { metricsData: {
  pageName, content_type: 'mlp', …contextData, …metricsData.adobe }}})`.
- Common data (`use-adobe-analytics-common-data.tsx:26-63`) includes
  `edition: '${language}-${region}'`, `entitlements`, `login_status`,
  `section: 'espnplus'`, `site: 'espnplus'`, `swid`, and a composite of
  `dssAccountId/dssDeviceId/dssProfileId/dssSessionId`.
- `useSwid()` mints a v4 uuid into cookie `SWID` (1-year, domain `.espn.com`,
  undefined on local) if absent (`use-adobe-analytics-common-data/use-swid.tsx:6-25`).
- Datadog RUM: app id `fa8304bf-…`, service `espn-nexus`, sample rate **100 on
  local/stage, 10 in prod**, `defaultPrivacyLevel: 'mask-user-input'`,
  `allowedTracingUrls: [/https:\/\/.*\.bamgrid\.com.+$/]`
  (`src/libs/datadog-rum.ts:13-31`). `beforeSend` overrides `view.referrer` from
  `localStorage.preserveReferrer` (`:32-39`). `window.datadogRum` is exposed
  deliberately so `@solo/footer` can emit RUM events (`:43-49`).
- Props size is measured and tagged: `tagPropsSize(responseProps)`
  (`get-server-side-props.ts:440`) — guards against oversized SSR payloads.

---

## 9. UI packages, theming, fonts

### 9.1 `packages/marketing/ui/*` — **there is no ESPN UI package**

**CONFIRMED** — `packages/marketing/ui/` contains exactly two dirs:

| Dir | Package |
| --- | --- |
| `ui/core/` | `@solo/marketing-ui-core` — base component library |
| `ui/disneyplus/` | `@solo/marketing-ui-disneyplus` v1.0.0 — Disney+ branded, wraps core |

(`packages/marketing/README.md:29-34` confirms the intent.) ESPN consumes
**none** of `packages/marketing/ui/*`.

### 9.2 What ESPN actually consumes

**CONFIRMED** — `apps/marketing-unified/espn/package.json` dependencies:

| Package | Role |
| --- | --- |
| `@solo/stitch` | CMS render engine + registry |
| `@solo/growth-components` | the actual UI kit (Tailwind, atomic) |
| `@solo/cgi-design-components` | Tailwind **preset** (`presets/espn`) + design tokens |
| `@solo/growth-cms-api` | Cannonball/Spaceball clients |
| `@solo/plans-pricing-api` | offer tokens / prices |
| `@solo/media-api` | Ripcut paths + Watch API adapter |
| `@solo/growth-utils` | env/geo/header helpers |
| `@solo/growth-dx` | Toodles debug widget |
| `@solo/footer` | global footer |
| `@solo/dictionary` | i18n |
| `@solo/remote-config` | Sparrow |
| `@solo/sdk-session`, `@solo/data-interface-espn` | session + brand data interface |
| `@solo/core-analytics`, `@solo/instrumentation`, `@solo/privacy-consent` | analytics + consent |
| `@solo/logger`, `@datadog/browser-rum`, `dd-trace` | observability |
| `jotai@1.7.6`, `react-query`, `xstate`, `zod`, `neverthrow`, `immer`, `tailwind-merge`, `msw`, `cookies-next`, `uuid` | libs |

Notable: **`jotai` is pinned to `1.7.6`** (an exact old version, not a catalog
entry) — `package.json:59`.

### 9.3 Theming chain

**CONFIRMED** — `apps/marketing-unified/espn/tailwind.config.cjs` is 19 lines:

```js
 1	import espnPreset from '@solo/cgi-design-components/src/presets/espn';
 2	import { animation, espnPlugin } from '@solo/growth-components/tailwind';
 6	  content: [
 7	    './src/**/*.{ts,tsx}',
 8	    './pages/**/*.{ts,tsx}',
 9	    '../../../packages/cgi/cgi-design-components/src/**/*.{ts,tsx}',
10	    '../../../packages/marketing/growth-components/src/**/*.{ts,tsx}',
11	    '../../../packages/marketing/stitch/src/**/*.{ts,tsx}',
12	    '../../../packages/cgi/footer/src/**/*.{ts,tsx}',
13	  ],
14	  plugins: [espnPlugin],
15	  presets: [espnPreset],
16	  theme: { extend: animation },
```

Token chain: `packages/cgi/cgi-design-components/src/presets/espn.ts` →
`{ theme: espnTheme }` → `packages/cgi/cgi-design-components/src/themes/espn.ts`
→ `{ extend: { ...espnTokens } }` from **`@solo/cgi-design-tokens`**. So all
ESPN colours/spacing/type scale live in the design-tokens package, **not** in
the app.

Typography (**CONFIRMED**,
`packages/marketing/growth-components/tailwind/plugins/espn.ts`):

- `@font-face` generated from `EspnFonts` (`../../fonts/espn-fonts`) via
  `getFontFace` (`:3-14`).
- `html { @apply font-benton }` (`:15`) — **Benton** is the body face.
- `body { @apply bg-surface text-onSurface text-bodyLarge … max-md:overflow-x-hidden }` (`:16-19`).
- Label utilities (`.label-xsmall`…`.label-xlarge`) use `font-benton font-bold`.
- Headline utilities (`.headline-xsmall`…`.headline-large`) use
  **`font-ignite`** — ESPN's display face (`:75-91`).

`EspnFonts` is also passed server-side as `appContext.fontsToLoad`
(`get-server-side-props.ts:367`) so Stitch can emit preloads.

Responsive breakpoints come from `configureBreakpoints('espn')`
(`src/shared/layout/application-layout.tsx:33`) — a runtime JS breakpoint
registry, separate from Tailwind's. **The ESPN README's claim that breakpoints
are "defined in tailwind.config.cjs" is wrong** — see Gotchas.

Brand asset hosts (**CONFIRMED**, `src/views/landing-page/shared/constants.ts:3-17`):
`CDN_HOST = 'https://a.espncdn.com'`,
`STATIC_ASSETS_HOST = 'https://static-assets.bamgrid.com'`, plus a full favicon
variant set under `…/product/espn/favicons/`. Ripcut endpoint
(`src/shared/constants.ts:11-17`):
`https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/espn/`.

Social links are hard-coded in the app, not CMS
(`src/views/landing-page/shared/constants.ts:75-79`): facebook/instagram/tiktok/
x/youtube.

---

## 10. Local dev and testing

### 10.1 Run it locally

```bash
# 1) one-time
./scripts/setup                                   # mkcert, MSW, Playwright
pnpm install
./scripts/setup configure secrets                 # populates .env.local from Vault
cd apps/marketing-unified/espn
cp .env.example .env.development.local            # per README.md:31-38
# or minimally: echo "ENABLE_DEBUG_TOOLING=true" > .env.development.local

# 2) run (from repo root)
pnpm dev:marketing-unified:espn
#   -> Next on 4040, SSL proxy on 5040
#   -> open https://local.plus.espn.com:5040
```

**CONFIRMED** — `pnpm dev` inside the app runs `turbo dev:server proxy`, so both
Next (4040) and the `wcs ssl-proxy` (5040, certs at `../../.certs`) come up
together; the proxy waits on `/healthcheck` first
(`package.json:12,13,19`). `/etc/hosts` must map `local.plus.espn.com`.

`getConfigs` hard-fails locally if any of `SPARROW_CONFIG_NAME`, `AWS_REGION`,
`SPARROW_CONFIG_URL`, `SPARROW_WORKSPACE`, `SPARROW_CONFIG_VERSION`,
`SPARROW_S3_ACCESS_KEY`, `SPARROW_SCOPE_NAME` is missing
(`get-configs.ts:58-75`), returning `VALIDATE_ENV_VARIABLES_ERROR` — which GSSP
then rethrows as a 500 (`get-server-side-props.ts:129-134`). **A blank page
locally is almost always a missing Sparrow env var.**

### 10.2 Mocks (MSW)

**CONFIRMED** — `src/mocks/`:

- `index.ts` — dual bootstrap: server-side `mockServer.listen({onUnhandledRequest:'warn'})`
  (skipped during `NEXT_PHASE=phase-production-build`), browser-side
  `worker.start({ serviceWorker: { url: '/mockServiceWorker.js' }})`.
- `handlers.ts` — composes `cannonballHandlers`, `spaceballHandlers`,
  dictionary, Sparrow scope config, plus `httpHandlers` +
  `disneyGraphHandlers` from `@solo/sdk-session` ("must be last to override").
- `handlers/cannonball/{index,landing-pages,footer,redirect}.ts` — plain
  `mockGet(json)` over the fixture files.
- `handlers/spaceball.ts` — `graphql.link('https://spaceball.global.twdcgrid.net/graphql/:org/:space/:env')`
  with three operations: `Page` (routes containing `soccer` → soccer snapshot,
  else home), `GetRedirects` → empty, `OfferTokens` → token response.
- Fixtures: `cnbl-lps-manifest.json`, `cnbl-landing-page-{home,soccer}-snapshot.json`,
  `cnbl-offer-token-global-{manifest,snapshot}.json`, `cnbl-redirect-manifest.json`,
  `cnbl-footer-{manifest,snapshot}.json`,
  `spaceball-landing-{home,soccer}-snapshot.json`,
  `spaceball-offer-tokens-response.json`, `spaceball-redirects-empty.json`,
  `dictionary-en-us-{accessibility,application,seo}-*.json`,
  `orchestration-register-device.json`, `sparrow-espn-nexus-config.ts`.

**Only two pages have snapshot fixtures** (home + soccer). Working on `/mlbtv`
or `/nflbundle` locally means either adding a fixture or hitting real CMS.

### 10.3 Jest

**CONFIRMED** — `apps/marketing-unified/espn/jest.config.js`:

- `collectCoverage: true`, `coverageProvider: 'babel'`,
  `testEnvironment: 'jest-fixed-jsdom'`, coverage → `coverage/jest`.
- **100% branches / functions / lines / statements** (`:146-153`).
- Coverage exclusions worth knowing (`:66-99`): `src/pages/**`, `src/libs/**`,
  `src/mocks/**`, `**/*.mock.ts`, `**/mocks.ts`, `**/stitch.ts`,
  `**/cannonball-model*`, `src/**/test/**`, `src/shared/testing-utilities.tsx`,
  all `*.json`, `babel-plugins/**`. Root configs are excluded **except**
  `next.config.js`.
- `@datadog/browser-rum` and `@datadog/browser-logs` are globally mapped to
  `@solo/observe/jest/datadog-mocks` to avoid "SDK loaded more than once"
  (`:119-125`).
- `setupFilesAfterEach` chain (`:136-144`): `@solo/test-utils/jest/datadog-tag-reporter`,
  `jest.fail-on-console.ts`, `jest.setup.ts`, `jest.mock-instrumentation.ts`,
  `jest.mock-router.ts`, `jest.setup-msw.ts`, `jest.query-client.ts`.
  **`fail-on-console` means a stray `console.warn` fails the suite.**
- `globals.datadogTagReporterConfig` (`:129-135`) derives test owner from
  CODEOWNERS, mapping `@cgi-client/web-growth` → `growth` (GCIEX-7017).
  Note the handle: NEXUS's GitHub team is `@cgi-client/web-growth`.

Commands: `pnpm -F @solo/marketing-unified-espn test`,
`… test -- <file>`, `… test -- --watch`, `… lint:type-check`, `… lint`.

### 10.4 Playwright

**CONFIRMED** — `apps/marketing-unified/espn/playwright.config.ts`:

- `baseURL = 'http://localhost:3000'` — HTTPS/`local.plus.espn.com:4040` is
  commented out pending **WEB-30985** (`:3-5`).
- `webServer.command`: CI → `PORT=3000 next start`; local →
  `dotenv -e .env.test -- next build && PORT=3000 next start` (`:89-91`).
  So **local Playwright does a full production build first** — slow.
- `env`: `NEXT_PUBLIC_API_MOCKING=playwright`, `PRODUCT=espn`, Sparrow vars
  (`SPARROW_SCOPE_NAME=ESPN_NEXUS`, `SPARROW_WORKSPACE=Growth`), with
  `SPARROW_S3_ACCESS_KEY` falling back to `'test-placeholder'` (`:92-108`).
- `expect.timeout: 60_000`, `timeout: 120_000`, `ignoreHTTPSErrors: true`,
  `trace/video: 'retain-on-failure'`, CI `retries: 2`, `maxFailures: 5`,
  `workers: 1`.
- Health gate: `url: ${baseURL}/healthcheck`, `reuseExistingServer: !CI`.

Specs (`playwright/tests/pages/`): `olp.spec.ts` (home, unauth + auth),
`olp-sp.spec.ts` (same with `?enable-spaceball=true`), `mlp.spec.ts` (`/soccer`),
`mlp-sp.spec.ts` (`/soccer` + Spaceball). Helpers:
`visitHomePage` → `/?disable-exp=true`, `visitSoccerMLPPage` →
`/soccer?disable-exp=true` (`playwright/helpers.ts:60-66`); `navigateTo` adds
header `X-BAMTech-wpnx-disable: true` and supports `locale` + `searchParams`
(`:25-45`). Auth fixtures come from
`@solo/growth-utils/test/mock-is-logged-in` with SDK key prefix
`espn-a9b93989_prod` (`playwright/helpers.ts:2-9`).

**Happy paths** are a first-class artifact — `playwright/support/happy-paths.ts`
declares 8 ids, all `team: 'growth'`: `accessFooterOLP`, `accessAuthFooterOLP`,
`accessFooterSoccerMLP`, `accessLoginOLP`, `accessLoginSoccerMLP`,
`accessSignupOLP`, `accessAuthSignupOLP`, `accessSignupSoccerMLP`. Tests
annotate `{ type: 'flow', description: HAPPY_PATHS.<id>.id }`, and
`pnpm coverage:playwright:happy-paths` reports coverage of them. There is also a
JS/CSS coverage reporter (`coverage:playwright:js-css:report`).

Root commands: `pnpm test:marketing-unified:playwright:espn`,
`pnpm test:marketing-unified:playwright:headless:espn`
(`package.json:115,117`).

### 10.5 Storybook

**CONFIRMED** — Storybook lives in `packages/marketing/growth-components`, not in
the ESPN app: `pnpm storybook` (port 6006) and `pnpm build:storybook`
(`growth-components/package.json:86-88`). Brand theming is done by building
per-brand CSS — `.storybook/tailwind/tailwind.espn.cjs` requires
`../../tailwind/plugins/espn`, and `build-storybook-css.mjs` compiles it. There
is no ESPN-specific `.storybook` config file and **no `*.stories.tsx` in the
ESPN app itself**; the only plan-card story is
`packages/marketing/growth-components/src/plan-card/plan-card.stories.tsx`.

---

## 11. Gotchas

1. **Dev URL in the docs is wrong.** README says `local.espn.com:5030` /
   ports 4030+5030; code says `local.plus.espn.com` / **4040 + 5040**
   (`apps/marketing-unified/espn/package.json:13,19` vs `README.md:24-26` and
   `apps/marketing-unified/README.md:13`). Same drift for Disney+ (README 4010,
   code `PORT=4060`).
2. **README lists Tealium + HITS; neither exists in code.** Grep of
   `apps/marketing-unified/espn/src` returns zero hits. Real stack: Datadog RUM
   + Adobe Analytics + Adobe Launch (`load-analytics.tsx:43-58`).
3. **README says breakpoints and `#cc0000` live in `tailwind.config.cjs`; they
   don't.** That file has no `screens` and no `colors`
   (`tailwind.config.cjs:1-19`). Breakpoints come from
   `configureBreakpoints('espn')` at runtime
   (`application-layout.tsx:33`); colours come from `espnTokens` in
   `@solo/cgi-design-tokens` via `themes/espn.ts`.
4. **README says "ESPN brand font stack"; the code uses two named faces** —
   `font-benton` (body/labels) and `font-ignite` (headlines)
   (`growth-components/tailwind/plugins/espn.ts:15,75-91`).
5. **`@solo/logger` is aliased on the server.** `next.config.js:74-81` rewrites
   it to `src/libs/logger-with-datadog.ts`. If you need the real package on the
   server, import `real-@solo/logger`.
6. **Only `*.page.tsx` / `*.api.ts` / `*.page.ts` are routed**
   (`next.config.js:32`). A `.tsx` in `src/pages` without `.page` is invisible.
   Conversely `src/middleware.page.ts` must keep the `.page` suffix.
7. **`getServerSideProps` throws on purpose.** Config, CMS, token-replacement
   and props failures all `throw new Error(...)` so Next renders `/500`
   (`get-server-side-props.ts:133,243,275,426`;
   `get-cms-content-with-tokens-replaced.ts:126`). Do not "helpfully" swallow
   these — the throw *is* the error strategy.
8. **Zod schema failures are silent-ish.** `validateCannonballEntity` logs
   `stitchWarn` and continues (`build-stitch-document.ts:22-41`). A malformed
   CMS field yields a missing component, not a visible error. Search logs for
   `eventName: 'stitchWarn'`.
9. **A plan card with an empty header renders nothing.**
   `build-plan-card.ts:35-37` returns `null` when `builtHeader` is empty.
10. **The commerce hand-off is CMS-authored, not code-generated.** `pref` values
    are typed by hand into Cannonball/Spaceball link hrefs; `buildLink`
    passes them through untouched
    (`packages/marketing/stitch/src/builders/build-link.ts:72-94`). A typo'd
    `pref` cannot be caught by any test in this repo. Also: **no campaign /
    attribution query params are forwarded** from the marketing URL into the
    commerce URL.
11. **Two Spaceball flags, easy to confuse.** `enableSpaceball` = page +
    redirects; `enableSpaceballMlp` = offer tokens only
    (`get-server-side-props.ts:163,384`). Flipping one does not flip the other.
12. **Offer-token replacement is skipped, not failed, when the `global` instance
    is unconfigured** (`get-server-side-props.ts:399-410`) — pages then render
    raw `{{token}}` placeholders. Watch the `tokens_replaced` span tag.
13. **Currency support is US-only and hard-coded.**
    `get-cms-content-with-tokens-replaced.ts:13-58` ships only `USD`/`$`/region
    `US` and `appLangMap: { en: 'en-US' }` (`:104`). Any non-US ESPN market
    needs that literal changed.
14. **Redirect lookups use language-only locale.**
    `get-server-side-props.ts:226` — `locale.split('-')[0]`, with the comment
    "Redirects only uses language for redirects". Region-specific vanity
    redirects are impossible today.
15. **`getFooterProps` hard-codes `region: 'us'` and
    `cannonballEnvironment: 'production'`** (`get-page-props.ts:100-101`) — the
    footer ignores the request's region and always reads prod CMS, even on stage.
16. **Restricted-route bypass cookie value is committed in source**:
    `test_bypass=4b852fcbd4bc121711ba037722fae8e0`
    (`middleware.page.ts:104`). Treat `/restricted/*` as effectively public.
17. **`/mockServiceWorker.js` is doubly special-cased** in middleware — exempt
    from the matcher (`:178`) *and* from lowercasing (`:32`). Renaming or
    case-changing it breaks browser MSW.
18. **Adobe never loads without targeted-advertising consent**
    (`load-analytics.tsx:28-31`) and the page-view event additionally waits on
    `dssDeviceId` + `wholesaleUserProvider`
    (`views/landing-page.tsx:59-68`). "Missing analytics" is usually consent or
    a Flex-cohort stall, not a tracking bug.
19. **Experiments hard-code `language: 'en', region: 'us'`**
    (`experiment-scripts.tsx:80-81`) even though `es-us` is a supported locale.
20. **RUM has no experiment/variant/route dimensions** (see §8.2). Add
    `setGlobalContextProperty` before promising variant-sliced RUM dashboards.
21. **100% coverage is enforced with `fail-on-console`.** Any new non-excluded
    file needs full branch coverage, and any log/warn in a test fails it
    (`jest.config.js:138,146-153`).
22. **Local Playwright runs a production `next build` first**
    (`playwright.config.ts:91`) — budget minutes, and remember
    `SPARROW_S3_ACCESS_KEY` defaults to `test-placeholder`.
23. **Only home + soccer have CMS fixtures.** Any other route under MSW falls
    through to the home snapshot for Spaceball
    (`src/mocks/handlers/spaceball.ts:17-25`) or 404s for Cannonball.
24. **`jotai` is pinned to exactly `1.7.6`** (`package.json:59`) — not the
    catalog version. Do not bump it casually.
25. **`auth-and-entitled-guard.tsx` is `/* istanbul ignore file */`** with
    `// TODO: WEB-32320` (`:1-2`) — the entitlement redirect logic is untested.
26. **Entitlement id `39547863` (`ESPN_FLAGSHIP`) is a magic number in source**
    (`auth-and-entitled-guard.tsx:49`).
27. **`preContent` is a flattened `[topBanner, navigation]`**
    (`build-stitch-document.ts:70-80`) — a CMS banner and the nav share one
    slot, so ordering bugs there present as "nav moved".

---

## 12. Open questions

1. **What are the live prod values of `enableSpaceball` / `enableSpaceballMlp`?**
   The repo only shows the MSW fixture (`false`/`false`). Needs a Sparrow prod
   read (`ESPN_NEXUS` / `legacy-config` / `prod` variant).
2. **Is there a per-route Spaceball rollout?** No allowlist exists in code, so it
   looks all-or-nothing per request. Confirm whether Sparrow variants are used
   to stage the migration by traffic slice.
3. **Who owns `www.espn.com/watch/offers`?** The nav "GET ESPN" CTA targets it,
   but it is not in this monorepo. Is it ESPN Watch, or a redirect into
   `secure.web.plus.espn.com`?
4. **Full `pref` vocabulary.** Five values appear in fixtures; the authoritative
   list presumably lives in Flex / `growth-life-client-api` package config.
5. **Does commerce validate unknown `pref` values?** Not answerable from the
   marketing side; check `apps/commerce/espn` + Flex behaviour for a bogus
   `?pref=`.
6. **`allowInBetaOverride`** is selected by the ESPN redirects GraphQL query
   (`queries/espn/landing/redirects.ts:16`) but never read by
   `get-vanity-redirect.ts` (which types only `url`/`statusCode`/
   `includeQueryParams`). Dead field or unimplemented feature?
7. **Cannonball `redirects` vs `landing/redirects` query modules.** Both
   `queries/espn/landing/redirects.ts` and `queries/espn/redirects/redirects.ts`
   exist. Which does `getTenantQueries({org:'espnplus', space:'redirects'})`
   actually resolve?
8. **`enableAmpWeaponX: true`** in the Sparrow fixture — no consumer found in
   the ESPN app. What is AMP/WeaponX and is the flag live?
9. **`planToEntitlementsMap`** is threaded into `AppContext`
   (`get-server-side-props.ts:353`) — which Stitch component consumes it, and
   does it drive plan-card gating?
10. **`get-vanity-redirect.ts` is typed to `CannonballPathCheckResult`** and
    cast at `get-redirect-result.ts:33` even in Spaceball mode. Is the
    Spaceball redirect shape genuinely identical, or is this an unsafe cast?
11. **Where is the `restricted/*` bypass cookie rotated?** It is a literal in
    middleware; is there a rotation process or is it permanent?
12. **Sauce Labs visual regression** is referenced in the root CLAUDE.md for
    Storybook — is ESPN in that suite, given there are no ESPN stories?
13. **`use-flex-adobe-analytics-subscriber-cohorts.tsx` calls Flex** — which
    Flex endpoint, and what happens to the page-view event when Flex is down
    (the `wholesaleUserProvider` gate implies the event never fires)?

---

## Appendix A — GSSP call order (`get-server-side-props.ts`)

**CONFIRMED**, single trace span `getServerSideProps` with
`tags.contentType: 'landing'` (`:82-90`):

| Line | Step |
| --- | --- |
| `:96` | `delete query.path` (strip the catch-all segment from query) |
| `:99-106` | `getCommonHeaders(res)` → middleware headers |
| `:108-114` | `host = process.env.ROOT_URL`; `getUrl({slug, locale, host})` |
| `:116-125` | build `RouteContext` |
| `:127-136` | `getConfigs()` — throws on failure |
| `:138-152` | `getLocalizationRedirect()` — early return |
| `:154` | `isPreviewContentRequested = Boolean(query.preview)` |
| `:156-161` | `getDssNodeDataLoaderConfig()` cache options |
| `:163-167` | `enableSpaceball` flag (+ QSP override) |
| `:169-172` | `/` → `homepage` route mapping |
| `:174-208` | 4 × `getCannonballInstanceConfig` (cnbl landing/redirects, sb landing/redirects) |
| `:213-233` | `Promise.all([getPageData(page), getPageData(redirects)])` |
| `:235-244` | CMS failure → throw |
| `:246-257` | `getVanityRedirectResult()` — early return |
| `:260-279` | `getCMSContent()` → `CMSPayload` |
| `:281-295` | `notFound` / `redirect` early returns |
| `:297-310` | `validatePreviewContent()` — early return |
| `:312-346` | dictionary (`productName: 'espn'`, `es` → `es-419` hack at `:316-318`) |
| `:348-379` | build `AppContext` |
| `:381-410` | offer-token replacement |
| `:412-427` | `getPageProps()` → StitchDocument + footer + debug |
| `:429` | `setCacheHeaders()` |
| `:431-440` | assemble props (+`metricsData`, `dictionary`, `getClientConfig(config)`, `language`, `region`, `physicalLocation`); `tagPropsSize()` |
| `:442-444` | return |

## Appendix B — Provider tree

**CONFIRMED** — `src/shared/layout.tsx:38-60` → `ApplicationLayout` →
`PageLayout` → page. Inside `ApplicationLayout`
(`src/shared/layout/application-layout.tsx`): `HelmetProvider`,
`JotaiProvider`, `QueryClientProvider` (`refetchOnWindowFocus: false, retry:
false`, `:35-42`), `DictionaryProvider`, `StitchComponentRegistryProvider`
(with `registryOverrides`), `StitchDataInterfaceProvider` (with
`buildESPNDataInterface({ sdkSession, … })` once the SDK is ready, `:123-133`),
`PrivacyConsentWrapper`, `LoadAnalytics`, `ExperimentScripts`,
`HydrateBaseAtoms`, `ToodlesWidget`. `configureBreakpoints('espn')` runs at
module scope (`:33`). Page-level: `PageLayout` → `oneid.tsx` (OneID script +
id-token→access-token exchange) and `auth-and-entitled-guard.tsx`.
Error pages use `getErrorLayout` → `ErrorLayout` only (no analytics/providers).

## Appendix C — File index for follow-up work

| Concern | Start here |
| --- | --- |
| Add/modify a route's data flow | `apps/marketing-unified/espn/src/views/landing-page/get-server-side-props.ts` |
| Cannonball↔Spaceball migration | `.../get-server-side-props/get-page-data.ts` + `packages/marketing/growth-cms-api/src/{cannonball,spaceball}/` |
| Prices / offer tokens | `.../get-server-side-props/get-cms-content-with-tokens-replaced.ts` + `packages/marketing/plans-pricing-api/src/tokens/` |
| Commerce hand-off | CMS link hrefs; `packages/marketing/stitch/src/builders/build-link.ts`; consumer `packages/cgi/commerce-base/src/identity/**` |
| Plan cards | `packages/marketing/stitch/src/{models,builders,components}/*plan-card*` + `packages/marketing/growth-components/src/plan-card/` |
| Redirects / locale | `apps/marketing-unified/espn/src/middleware.page.ts` + `.../get-server-side-props/{get-localization-redirect,get-vanity-redirect,run-localization-rules}.ts` |
| Brand components | `.../src/shared/layout/application-layout/stitch-component-registry-overrides.tsx` |
| Theming | `apps/marketing-unified/espn/tailwind.config.cjs` → `packages/cgi/cgi-design-components/src/{presets,themes}/espn.ts` → `@solo/cgi-design-tokens`; `packages/marketing/growth-components/tailwind/plugins/espn.ts` |
| Experiments | `.../src/shared/layout/application-layout/experiment-scripts.tsx` (+ `get-experiment/**`) |
| Analytics | `.../application-layout/load-analytics.tsx` + `.../views/landing-page/use-adobe-analytics-common-data*` |
| Observability | `apps/marketing-unified/espn/src/libs/datadog-rum.ts`, `logger-with-datadog.ts`, `babel-plugins/tracer-plugin.js` |
| Mocks | `apps/marketing-unified/espn/src/mocks/` |
| E2E | `apps/marketing-unified/espn/playwright/` |
