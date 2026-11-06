# 06 — ESPN brand, theming, design system, and UI components (`cgi-web`)

> **Access statement.** `cgi-web` was **fully readable** at
> `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web` (branch `main`, clean tree,
> HEAD `607747d290`). All three brand apps, all packages, and the **built** design-token output
> (`packages/cgi/cgi-design-tokens/dist/*.css|json`, present locally) were inspected directly.
>
> **What I could NOT access** (labelled INFERRED or UNKNOWN throughout):
> - **Figma.** The token *values* are generated from `src/imported/figma-export.json`, which stores only
>   Figma **variable IDs**. The human-facing token names in Figma, the collection structure, and the
>   designer intent behind e.g. `brandBright` are not in the repo.
> - **The published `@solo/cgi-design-tokens@2.0.1` tarball** in the pnpm store ships only
>   `index.{cjs,mjs,d.ts}` — its `dist/` is generated at build time, so the *deployed* CSS was inferred
>   from the locally built `dist/`.
> - **Sauce Labs Visual** baselines/dashboard (`CGI_COMMERCE-BASE` project), Fuzzbucket/Jenkins Storybook
>   deploys, `webdocs-hub.bamgrid.com`.
> - **Runtime CDN contents** (`static-assets.bamgrid.com`, `a.espncdn.com`) — font/logo URLs were read
>   from source, not fetched.

**Path shorthand used below** (absolute root):

| Shorthand | Absolute root |
|---|---|
| `WEB/` | `/Users/juanfelipe.montana/Documents/disney/repositories/cgi-web/` |

---

## §0. The one-paragraph answer, and the two most important findings

**ESPN's visual identity is a four-layer pipeline, and the top three layers are brand-agnostic.**
Figma variables → `@solo/cgi-design-tokens` (Style Dictionary emits `dist/espn.{css,json,js}`) →
`@solo/cgi-design-components` presets (`espnPreset = { theme: { extend: ...espnTokens } }`) → consumed as a
**Tailwind preset** by each ESPN app. On top of that, each of the two product surfaces adds its own
brand layer: **marketing** adds `growth-components/tailwind/plugins/espn.ts` (typography + semantic
component classes), **commerce** adds a ~1,500-line `apps/commerce/espn/tailwind.config.cjs` semantic
utility layer *plus* a legacy Stitches theme (`commerce-base/src/common/styles/themes/espn.ts`). There is
**no `ThemeProvider`, no runtime theme switch, and no CSS-variable indirection in production** — each app
is a single-tenant Next.js build whose Tailwind config bakes literal `hsl()` values in at compile time.

**FINDING 1 — ESPN's brand token is BLUE, not red (CONFIRMED).**
`--colorsBrand: hsl(219, 90%, 66%)` = **`#5A91F6`** (`WEB/packages/cgi/cgi-design-tokens/dist/espn.css:213`).
`brandBright` and `action` are the same blue. The only red in ESPN's surface area is the **logo asset**
(`.../product/espn/images/logo-red.<hash>.svg`, `WEB/apps/commerce/espn/tailwind.config.cjs:36`). If you go
looking for `#D50A0A` (classic ESPN red) you will not find it — and `.primary-button` for ESPN is
**white on near-black** (`secondary` / `onSecondary`), not brand-coloured at all
(`WEB/packages/marketing/growth-components/tailwind/plugins/espn.ts:130-133`).

**FINDING 2 — ESPN's display font-weight tokens are invalid CSS (CONFIRMED bug).**
`--fontWeightDisplayXsmall … DisplayLarge: Cond Heavy`
(`WEB/packages/cgi/cgi-design-tokens/dist/espn.css:130-133`). Disney+ and Hulu emit `600` for the same keys.
Root cause is one line: the Figma weight-name map has no `condheavy` entry and falls through to the raw
string (`WEB/packages/cgi/cgi-design-tokens/src/config/transforms.ts:98`). Consequences: every commerce
`.common-text-display-*` rule ships `font-weight: Cond Heavy` and is silently dropped by the browser
(`WEB/apps/commerce/espn/tailwind.config.cjs:355`), while the marketing plugin quietly works around it by
hard-coding `font-black` instead of reading the token
(`WEB/packages/marketing/growth-components/tailwind/plugins/espn.ts:106,111,116,121`).

---

## §1. Where ESPN's visual identity lives in code

### 1a. Layer 1 — Figma → `@solo/cgi-design-tokens` (CONFIRMED)

`WEB/packages/cgi/cgi-design-tokens/` is the single source of ESPN design values. It does **not** store
hex codes in source; it stores Figma variable IDs and resolves them at build time.

```ts
// WEB/packages/cgi/cgi-design-tokens/src/tokens/colors/espn.ts:10-18
export default {
  colors: createTokenSetFromIds(
    colorVariableIds,
    variableCollectionIds.ESPN_COLOR,
    valueModeKeys.DEFAULT,
    tokenTypes.COLOR,
    modeIds.ESPN_DEFAULT,
  ),
};
```

Brand-scoped non-colour tokens live in `brands/espn.ts`, drawn from two Figma collections —
`ESPN_COLOR` (`borderRadius`, `focusIndicator`) and `ESPN_TYPE` (`fontFamily`, `fontSize`, `fontWeight`,
`lineHeight`, `letterSpacing`) — with an in-file note explaining why radii live beside colours:
> Note that borderRadius and focusIndicator appear alongside colors in their variable collection in Figma.
> Since our color tokens are split between light/dark mode, any brand-specific tokens outside of that are
> grouped here in the "brand" tokens — `WEB/packages/cgi/cgi-design-tokens/src/tokens/brands/espn.ts:19-22`

**The build** (`WEB/packages/cgi/cgi-design-tokens/scripts/build.ts`) declares five themes; note ESPN is the
only one with **no `dataTheme`**:

```ts
// WEB/packages/cgi/cgi-design-tokens/scripts/build.ts:41-72 (excerpt)
const tokenSets: Array<ThemeConfiguration> = [
  { themeName: 'disney',       sourceFiles: [...], dataTheme: 'dark'  },
  { themeName: 'disney-light', sourceFiles: [...], dataTheme: 'light' },
  { themeName: 'hulu',         sourceFiles: [...], dataTheme: 'light' },
  { themeName: 'hulu-dark',    sourceFiles: [...], dataTheme: 'dark'  },
  { themeName: 'espn',         sourceFiles: ['common/index.ts', 'brands/espn.ts', 'colors/espn.ts'] },
];
// …:117-119 — which flows straight into the emitted CSS selector:
selector: dataTheme ? `.${themeName}, [data-theme="${dataTheme}"]` : `.${themeName}`,
```

**Result (CONFIRMED):** `dist/espn.css:5` is `.espn {` — with **no `[data-theme=...]` alias**, unlike all four
Disney/Hulu variants (`dist/disney.css:5` = `.disney, [data-theme="dark"] {`). **ESPN has exactly one theme;
there is no ESPN light mode.** See §10 G-3.

Figma→token sync is a **manual GitHub Action, not a live link**: it "Imports design variables from a Figma
file via the Figma REST API, regenerates … `figma-export.json`, and opens a PR with the result. From that
committed JSON the build step (Style Dictionary) produces the per-brand token outputs (Disney+, Hulu, ESPN)
that every app consumes via `@solo/cgi-design-tokens`"
(`WEB/.github/workflows/sync-figma-to-tokens.yml:5-10`). Two modes (`:12-40`): default sync from the
canonical file (mergeable PR), and **designer branch preview** (labelled `DO NOT MERGE` + `Auto-deploy`,
existing only to spin up a Fuzzbucket staging env for design review).

### 1b. The real ESPN token values (CONFIRMED — all from `dist/espn.css`)

245 declarations total, in 17 top-level groups identical across all three brands (see §10 G-6).

**Colours** (`dist/espn.css:190-250`; hex computed from the emitted HSL):

| Token (CSS var) | Tailwind name | HSL | Hex |
|---|---|---|---|
| `--colorsBrand` | `brand` | `hsl(219, 90%, 66%)` | **`#5A91F6`** |
| `--colorsBrandBright` | `brandBright` | `hsl(219, 90%, 66%)` | `#5A91F6` |
| `--colorsBrandContainer` | `brandContainer` | `hsl(219, 90%, 33%)` | `#083DA0` |
| `--colorsAction` | `action` | `hsl(219, 90%, 66%)` | `#5A91F6` |
| `--colorsSurface` | `surface` | `hsl(220, 9%, 7%)` | `#101113` |
| `--colorsSurfaceContainer` | `surfaceContainer` | `hsl(210, 3%, 12%)` | `#1E1F20` |
| `--colorsSurfaceContainerHigh` | `surfaceContainerHigh` | `hsl(210, 2%, 17%)` | `#2A2B2C` |
| `--colorsSurfaceContainerHighest` | `surfaceContainerHighest` | `hsl(210, 2%, 23%)` | `#393B3C` |
| `--colorsOnSurface` | `onSurface` | `hsl(240, 20%, 98%)` | `#F9F9FB` |
| `--colorsOnSurfaceVariant` | `onSurfaceVariant` | `hsl(210, 1%, 64%)` | `#A2A3A4` |
| `--colorsSecondary` | `secondary` | `hsl(240, 20%, 98%)` | `#F9F9FB` |
| `--colorsOnSecondary` | `onSecondary` | `hsl(220, 9%, 7%)` | `#101113` |
| `--colorsTertiary` | `tertiary` | `hsl(210, 1%, 29%)` | `#494A4B` |
| `--colorsOutline` | `outline` | `hsl(220, 1%, 43%)` | `#6D6D6F` |
| `--colorsOutlineVariant` | `outlineVariant` | `hsl(210, 1%, 29%)` | `#494A4B` |
| `--colorsError` | `error` | `hsl(0, 100%, 62%)` | `#FF3D3D` |
| `--colorsSuccess` | `success` | `hsl(120, 48%, 49%)` | `#41B941` |
| `--colorsWarning` | `warning` | `hsl(34, 93%, 57%)` | `#F79F2B` |
| `--colorsFocusIndicator` | `focusIndicator` | `hsl(240, 20%, 98%)` | `#F9F9FB` |
| `--colorsFocusIndicatorVariant` | `focusIndicatorVariant` | `hsl(219, 72%, 55%)` | `#3A73DF` |
| `--colorsScrim` | `scrim` | `hsla(220, 9%, 7%, 0.7)` | — |

For contrast (`dist/disney.css`, `dist/hulu.css`): D+ `brand` = `#056D85`, `brandBright` = `#33DDFF`;
Hulu `brand` = `#12BA69`, `brandBright` = `#1DE782`. Hulu's default `surface` is **light** (`#F3F4F7`),
Disney+ and ESPN are dark.

**Border radius** (`:6-18`) — note the semantic aliases: `none 0`, `xxs 2px`, `xs 4px`, `small 8px`,
`medium 12px`, `large 16px`, `xl 24px`, `full 1000px`, **`card 8px`**, **`badge 4px`**, **`vessel 1000px`**,
**`input 4px`**, **`button 1000px`** (fully pill buttons).
**Box shadow** (`:19-24`): `level0: none` … `level5: 0px 10px 20px -5px rgba(0,0,0,.30), 0px 8px 12px 6px rgba(0,0,0,.15)`.
**Spacing** (`:60-76`): 4px scale keyed by zero-padded strings — `01: 4px` … `09: 36px`, then `10: 40px`,
`12: 48`, `14: 56`, `16: 64`, `18: 72`, `20: 80`, `24: 96`, `40: 160px`. Accessed as
`espnTokens.spacing['06']` — quoted keys are mandatory (`WEB/apps/commerce/espn/tailwind.config.cjs:83`).
**Grid / breakpoints** (`:25-39`): `screens xs 0 / sm 480 / md 768 / lg 1024 / xl 1366`;
`maxWidth xs 479 / sm 767 / md 1023 / lg 1365 / xl 1583`; grid columns `2 → 6 → 6 → 12 → 12`.
**Focus indicator** (`:77-78`): `thickness 2px`, `outerOffset 2px`.

**Typography** — three font families, split by role (`:79-96`):

| Role | ESPN family |
|---|---|
| `fontFamilyBody*`, `fontFamilyLabel*` | `BentonSans` |
| `fontFamilyHeadlineXsmall…Large` | `ESPN Ignite Text` |
| `fontFamilyHeadlineXlarge`, `Xxlarge` | `ESPN Ignite Text Condensed` |
| `fontFamilyDisplay*` | `ESPN Ignite Display` |

Font sizes carry explicit `*Mobile` variants (`:101-120`), e.g. `displayLarge 56px` /
`displayLargeMobile 40px`, `headlineXxlarge 36px` / `headlineXxlargeMobile 32px`.
Weights (`:125-143`): body `400`, `bodyHeavy 600`, headline/label `600`, **display `Cond Heavy` ← broken**.

### 1c. Layer 2 — `@solo/cgi-design-components` presets (CONFIRMED)

Three files, eight lines total, are the entire brand-selection API:
```ts
// WEB/packages/cgi/cgi-design-components/src/themes/espn.ts:1-8
import { espnTokens } from '@solo/cgi-design-tokens';
export const espnTheme: ThemeConfig = { extend: { ...espnTokens } };
// WEB/packages/cgi/cgi-design-components/src/presets/espn.ts:1-5
import { espnTheme } from '../themes/espn';
export default { theme: espnTheme };
```
`ThemeConfig` is just `Config['theme']` from Tailwind (`.../src/themes/index.ts:1-3`), and `espnTokens` is
`dist/espn.json` (`WEB/packages/cgi/cgi-design-tokens/index.mjs:7`). **So "the ESPN theme" is literally a
Tailwind preset object of resolved values.** No provider, no context, no CSS variables.

### 1d. Layer 3a — marketing brand layer: `growth-components/tailwind/plugins/espn.ts`

186 lines; adds ESPN `@font-face`s, element defaults, the type-ramp utility classes, and semantic
component colours. Excerpt:

```ts
// WEB/packages/marketing/growth-components/tailwind/plugins/espn.ts:8-28 (excerpt)
export default plugin(function ({ addBase, addUtilities, theme }) {
  const baseColors = theme('colors') as Record<string, string>;
  addBase({
    // @ts-expect-error font face is expecting an object instead of array ...
    '@font-face': getFontFace(EspnFonts),
    html: { '@apply font-benton': {} },
    body: { '@apply bg-surface text-onSurface text-bodyLarge leading-bodyLarge tracking-bodyLarge max-md:overflow-x-hidden': {} },
    p:  { '@apply text-onSurface my-5 lg:my-6': {} },
    h1: { '@apply text-onSurface display-small': {} },
    h2: { '@apply text-onSurface headline-xxlarge': {} },
    h3: { '@apply text-onSurface headline-large': {} },  // …h4–h6 follow
  });
// :176-185 — local family aliases
theme: { extend: { fontFamily: { ignite: ['Ignite','sans-serif'],
  igniteCondensed: ['Ignite Condensed','sans-serif'], benton: ['Benton','sans-serif'] } } }
```
⚠️ These alias names (`Ignite`, `Ignite Condensed`, `Benton`) intentionally **differ** from the token
`fontFamily*` values (`ESPN Ignite Display`, `BentonSans`) — see §10 G-7.

### 1e. Layer 3b — commerce brand layer: two parallel systems (CONFIRMED)

Commerce ESPN is themed **twice**, by two generations of tooling that coexist:

1. **Stitches (legacy, CSS-in-JS)** — `WEB/packages/cgi/commerce-base/src/common/styles/themes/espn.ts`
   (450 lines): a flat `Theme` object of ~250 named design decisions, mostly `espnTokens.*` with hard-coded
   HSL fallbacks where a token is missing or wrong. Sections: `borderWidths` (`:7`), `colors` (`:12`),
   `fonts` (`:169`), `fontSizes` (`:209`), `lineHeights` (`:237`), `letterSpacings` (`:257`), `sizes` (`:281`),
   `space` (`:304`), `transitions` (`:318`), `shadows` (`:325`), `radii` (`:341`), `fontReferences` (`:372`).
   The token-gap pattern is documented in place, e.g.
   `buttonPrimaryText: 'hsl(240, 8%, 10%)', // Note: this should be` `onTertiary`, `but that color is wrong.`
   (`:47`) beside `buttonPrimaryBackground: espnTokens.colors.secondary` (`:42`).
   One ESPN colour lives in the **base** theme instead: `espnChampionshipGold: 'hsl(42.96, 100%, 49.02%)'`
   (`.../styles/themes/base.ts:97`, typed at `.../styles/styles.types.ts:105`, consumed at `.../espn.ts:98`).
2. **Tailwind (current)** — `WEB/apps/commerce/espn/tailwind.config.cjs`, **1,567 lines**, almost entirely
   one `addUtilities({...})` call defining ~400 semantic classes. Its own header states the rule:
   ```js
   // WEB/apps/commerce/espn/tailwind.config.cjs:59-65
   /**
    * Tenant specific overrides for values that are not available in
    * the Design system tokens.
    *
    * WARNING: Classes should only be added here when you've confirmed with design that
    * design tokens cannot be leveraged for this style.
    */
   ```
   It also injects ~30 global CSS variables for things Tailwind can't express (`:69-104`), e.g.
   `--background: no-repeat fixed linear-gradient(180deg, hsl(220,9%,7%) 9%, hsl(210,3%,12%) 94.5%)`,
   `--billing-container-width: 506px`, `--color-action: espnTokens.colors.action`.

**Not ESPN:** `@solo/marketing-styles` (`WEB/packages/marketing/styles/`) uses Vanilla Extract
(`*.css.ts`) with a `themeContract` and `src/tenants/{disney,hulu}/` — **there is no `tenants/espn/`**, and
only `apps/marketing-unified/disneyplus` depends on the package. See §10 G-1 (doc drift).

---

## §2. The theming mechanism, end to end

### 2a. Marketing (NEXUS) — build-time literals, one config per app (CONFIRMED)

```js
// WEB/apps/marketing-unified/espn/tailwind.config.cjs:1-19
import espnPreset from '@solo/cgi-design-components/src/presets/espn';
import { animation, espnPlugin } from '@solo/growth-components/tailwind';
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}',
    '../../../packages/cgi/cgi-design-components/src/**/*.{ts,tsx}',
    '../../../packages/marketing/growth-components/src/**/*.{ts,tsx}',
    '../../../packages/marketing/stitch/src/**/*.{ts,tsx}',
    '../../../packages/cgi/footer/src/**/*.{ts,tsx}'],
  plugins: [espnPlugin],
  presets: [espnPreset],
  theme: { extend: animation },
};
```
The app's entire CSS entry is three Tailwind directives plus two experiment-visibility classes
(`WEB/apps/marketing-unified/espn/src/styles/globals.css:1-10`) — **all brand styling comes from the preset
+ plugin**, none from hand-written CSS. And because `espnPreset` carries **resolved values**, the compiled
CSS contains literal `hsl(...)`: no `var(--colorsBrand)`, and **no `.espn` class on the DOM**.

**The CSS-variable path exists but is only used by the package's own config**, not by the app:
```js
// WEB/packages/marketing/growth-components/tailwind/tailwind.espn.cjs:9-11
const colors = generateTailwindColorTokens('@solo/cgi-design-tokens/tokens/espn.css');
```
```js
// WEB/packages/marketing/growth-components/tailwind/generate-tailwind-color-tokens.js:25-38 (excerpt)
root.walkDecls((decl) => { if (decl.prop.startsWith('--colors')) variables[decl.prop] = decl.value; });
const cssVarToTailwindToken = (n) => n.replace(/^--colors?/, '').replace(/^\w/, (c) => c.toLowerCase());
//  --colorsSurfaceVariant  ->  surfaceVariant: var(--colorsSurfaceVariant)
```
That path *requires* a `.espn`-classed ancestor to resolve. See §10 G-2 for why mixing the two matters.

### 2b. Commerce — Stitches `createTheme` + SSR body className (CONFIRMED)

```ts
// WEB/packages/cgi/commerce-base/src/common/styles/stitches.config.ts:69-83
export type ThemeName = 'base' | 'disneyPlus' | 'hulu' | 'espn';
export const Themes: Record<ThemeName, ReturnType<typeof createTheme>> = {
  base: createTheme(OriginalThemes.base.theme),
  disneyPlus: createTheme(OriginalThemes.disneyPlus.theme),
  hulu: createTheme(OriginalThemes.hulu.theme),
  espn: createTheme(OriginalThemes.espn.theme),
};
```
This **is** the PRODUCT-keyed theme map (its JSDoc at `:71-77` notes TypeScript enforces `ThemeName` and the
object keys stay in sync). It is applied in `_document`, deliberately at module scope:
```tsx
// WEB/apps/commerce/espn/pages/_document.page.tsx:17, 51-61 (excerpt)
const defaultClassName = createTheme(espnTheme.theme).className;   // see G-11 / WEB-2277
<Head>
  <style id="stitches" dangerouslySetInnerHTML={{ __html: getCSSText() }} />
  <style dangerouslySetInnerHTML={{ __html: getGlobalIdentityCSSText() }} />
  <Metadata productName="espn" />
</Head>
<body className={defaultClassName}>
```
So the ESPN commerce page ships a Stitches-generated hash class (e.g. `t-xxxxxx`) on `<body>` with Stitches
CSS inlined at SSR time. Tailwind runs in parallel with **preflight disabled** so it doesn't fight Stitches:
```js
// WEB/apps/commerce/espn/tailwind.config.cjs:14-16
corePlugins: { preflight: false }, // disables Preflight but keeps base layer active
```

### 2c. `ThemeSelector` — dev-only runtime swap (CONFIRMED)

`WEB/packages/cgi/commerce-base/src/common/components/global-styles/theme-selector.tsx` is the only runtime
theme switch. `applyThemeToBody(themeClass, themeTenantName)` (`:55-72`) removes every known theme class then
adds **two**: the Stitches hash *and* the plain tenant name — because Stitches and Tailwind scope
differently ("Apply the new Stitches theme class and tenant name so Tailwind design token classes scoped by
tenant render correctly", `:68-69`). It reverse-maps the Stitches hash back to a tenant name (`:26-42,74-91`)
and defaults to `Themes.base.className` when nothing matches (`:39-41`).

### 2d. Storybook — the only place a scope selector exists (CONFIRMED)

`scopeSelector` appears in **exactly three files**, all Storybook configs
(`commerce-base/.storybook/tailwind-{espn,hulu,disneyPlus}.config.cjs:10`):
```js
// WEB/packages/cgi/commerce-base/.storybook/tailwind-espn.config.cjs:1-15
// We are importing the Tailwind configuration from the tenant application so we can extend it below.
// This is an exception to the rule, since we typically _do not_ import anything from the tenant applications
// into Commerce-Base. ...
import tailwindConfig from '../../../../apps/commerce/espn/tailwind.config.cjs';
export default { ...tailwindConfig, theme: { scopeSelector: '.espn' },
  // We need this selector to prevent style clashes in Storybook between the different tenant themes
  important: '.espn' };
```
The app config reads it defensively: `const scopeClass = config('theme.scopeSelector') || ':root';`
(`WEB/apps/commerce/espn/tailwind.config.cjs:67`) — so in the real app the CSS vars land on `:root`, and in
Storybook on `.espn`. ⚠️ Note this Storybook override replaces `theme` wholesale, dropping
`tailwindConfig.theme.extend` (animations, `bg-app-logo`) — see §10 G-9.

### 2e. Summary matrix — how ESPN theming is selected per surface

| Surface | Mechanism | Brand selected by | Values are | DOM marker |
|---|---|---|---|---|
| `apps/marketing-unified/espn` | Tailwind preset + brand plugin | build-time config file | literal `hsl()` | none |
| `apps/commerce/espn` (Tailwind) | Tailwind preset + 1.5k-line utility plugin | build-time config file | literal `hsl()` + `:root` CSS vars | `:root` vars |
| `apps/commerce/espn` (Stitches) | `createTheme(espnTheme.theme)` | `_document` import | Stitches CSS vars | `<body class="t-…">` |
| `growth-components` Storybook | pre-generated per-tenant CSS, hot-swapped `<link>` | toolbar global | `var(--colors*)` | `className={tenant}` + `data-theme` |
| `commerce-base` Storybook | `important: '.espn'` + `scopeSelector: '.espn'` | per-tenant config file | literal `hsl()` scoped to `.espn` | `.espn` |
| `cgi-design-tokens` CSS output | `.espn { --colors*: … }` | class on ancestor | HSL strings | `.espn` |

---

## §3. ESPN UI component inventory

### 3a. Which packages serve ESPN (CONFIRMED)

| Package | Path | Serves ESPN? | Role |
|---|---|---|---|
| `@solo/cgi-design-tokens` | `WEB/packages/cgi/cgi-design-tokens` | ✅ | Token source of truth (`dist/espn.*`) |
| `@solo/cgi-design-components` | `WEB/packages/cgi/cgi-design-components` | ✅ | 23-component design system + `presets/espn` |
| `@solo/growth-components` | `WEB/packages/marketing/growth-components` | ✅ | 60+ marketing components, ESPN Tailwind plugin + fonts |
| `@solo/stitch` | `WEB/packages/marketing/stitch` | ✅ | CMS rendering (`Stitch*` components) |
| `@solo/commerce-base` | `WEB/packages/cgi/commerce-base` | ✅ | All commerce UI + `styles/themes/espn.ts` |
| `@solo/cgi-footer` | `WEB/packages/cgi/footer` | ✅ | Stitch-driven footer (`src/mocks/mocks/espn.ts`) |
| `@solo/data-interface-espn` | `WEB/packages/cgi/data-interface-espn` | ✅ | ESPN data layer (not UI) |
| `@solo/marketing-ui-core` | `WEB/packages/marketing/ui/core` | ❌ | Disney+ base library (Vanilla Extract) |
| `@solo/marketing-ui-disneyplus` | `WEB/packages/marketing/ui/disneyplus` | ❌ | Disney+ only wrapper |
| `@solo/marketing-styles` | `WEB/packages/marketing/styles` | ❌ | Vanilla Extract; `tenants/` = disney, hulu only |

### 3b. Component inventory (CONFIRMED)

**`@solo/cgi-design-components`** — 23 components under
`WEB/packages/cgi/cgi-design-components/src/components/`: `banner`, `breadcrumb`, `button`, `button-dock`,
`card`, `carousel`, `check-radio`, `checkbox`, `copyright-text`, `dialog`, `divider`, `grid`, `link`,
`pin-input`, `radio-button-group`, `segment-control`, `select`, `stack`, `tag`, `text-input`, `toast`,
`toggle`, `tooltip`, `typography`. **Zero ESPN-specific files** — every one is brand-neutral Tailwind, and
ESPN-ness arrives solely through `presets/espn`. Consumed by commerce ESPN (e.g. `Button` at
`WEB/packages/cgi/commerce-base/src/payments/wallet/components/wallet-module/add-card-button/add-card-button.tsx:1`,
`Stack`/`Link` in `.../identity/action-grant/components/form/*.tsx:1`) and by `@solo/cgi-footer`.

**`@solo/growth-components`** — marketing library, flat component dirs; the only ESPN-flavoured code is the
Tailwind plugin, fonts, breakpoints, and two components:

| Component / module | Path (under `WEB/packages/marketing/growth-components/`) | ESPN-specific? | Used where |
|---|---|---|---|
| ESPN Tailwind plugin | `tailwind/plugins/espn.ts` | ✅ **yes** | both ESPN apps |
| ESPN fonts | `fonts/espn-fonts.ts` | ✅ **yes** | marketing ESPN |
| ESPN Tailwind config | `tailwind/tailwind.espn.cjs` | ✅ **yes** | package Storybook |
| `TENANTS` enum | `src/shared/constants.ts:1-5` | shared 3-brand | breakpoints, stories |
| `SCREEN_OVERRIDES.espn` | `src/shared/breakpoints/screen-overrides.ts:18-20` | ✅ **yes** (`lg: 1025px`) | `configureBreakpoints('espn')` |
| `WatchEventCard` | `src/card/watch-event-card/` | de-facto ESPN+ (live/upcoming/reair airings) | ESPN landing sliders |
| `Slider` | `src/slider/` | shared; ESPN-only export pending removal (`src/main.ts:25`) | ESPN landing |
| `FlipCard` | `src/card/flip-card/` | shared, brand-coloured via `.flip-card-side-a/b` | all three |
| `MediaDetails` | `src/media-details/media-details.tsx:134` | shared "designed for Disney+, Hulu, and ESPN" | detail pages |
| `Modal` + `useFocusRestoration` | `src/modal/` | shared, with an ESPN/Hulu-specific branch (`use-focus-restoration.ts:148`) | all three |
| Breakpoint system | `src/shared/breakpoints/config.ts` | per-tenant singleton | app startup |

`@solo/stitch` — ~90 models/builders and ~120 `Stitch*` components; **no ESPN-specific components**. ESPN
touches it in three places only: `RIPCUT_PROD_ENDPOINT` (`src/builders/shared/constants.ts:4`),
`WatchEventCard` schema doc (`src/components/stitch-schema.ts:1173`), and the ESPN Storybook tenant toolbar
(`.storybook/preview.tsx:49`).

### 3c. What ESPN does NOT use (CONFIRMED)

- **`marketing/ui/core` + `marketing/ui/disneyplus`.** `ui/core/readme.md:6-10` describes itself as the base
  that "brand-specific packages (such as `@solo/marketing-ui-disneyplus`) wrap"; only
  `apps/marketing-unified/disneyplus/package.json:60` depends on the Disney wrapper. ESPN's single
  `ui/core` mention is a string in `Masthead/components/BundleDetailsModal/BundleDetailsModal.tsx`.
- **`marketing/styles` (Vanilla Extract).** No `tenants/espn/`.
- **`cgi-design-components/tailwind.config.cjs`** — its `themePresets` map has only `disney` and `hulu`
  (`:9-12`), so the design-system Storybook **cannot render the ESPN theme**. The file's own comment points
  at `WEB-23464` as the fix.

---

## §4. The shared-vs-brand pattern

The repo uses **three** distinct mechanisms, not one. None of them is per-brand subclassing, and none is
a `brand` prop threaded through components.

### 4a. Mechanism 1 — parallel Tailwind plugins publishing the *same* semantic class names (marketing)

Each brand ships a plugin that defines an identical vocabulary of utilities with different values.
Components then reference the vocabulary, never the brand.

| Semantic class | `disney.ts` | `espn.ts` | `hulu.ts` |
|---|---|---|---|
| `.primary-button` | `:134` | `:130` | `:114` |
| `.secondary-button` | `:140` | `:134` | `:119` |
| `.nav-item-focus` | `:155` | `:140` | `:125` |
| `.flip-card-side-a` / `-b` | `:172` / `:175` | `:144` / `:147` | `:139` / `:142` |
| `.compact-button` / `.small-button` | `:199` / `:203` | `:162` / `:166` | `:166` / `:170` |
| `.headline-large` | `:86` | `:90` | `:81` |
| `.display-small` | `:106` | `:110` | `:97` |

Concrete divergence on the same class (all in `.../growth-components/tailwind/plugins/`):
```ts
// espn.ts:130-133   — white pill on dark
'.primary-button': { backgroundColor: baseColors.secondary,      color: baseColors.onSecondary },
// hulu.ts:114-117   — inverse surface + explicit weight
'.primary-button': { backgroundColor: baseColors.inverseSurface, color: baseColors.inverseOnSurface, fontWeight: '500' },
// disney.ts:134-137 — brand cyan, with a token gap noted in-line:
//   "This maps to onSecondary for dark theme, but we want both light and dark to be the same color
//    TODO: Working with Core to see if we can have access to non-semantic tokens for these cases."
'.primary-button': { backgroundColor: baseColors.brandBright, … },
```
Genuinely shared rules live in one file imported by all three
(`WEB/packages/marketing/growth-components/tailwind/plugins/shared-classes.ts:1-77` —
`.hide-on-mobile/tablet/desktop`, `.no-scrollbar`, `.responsive-padding-*`, `.mask-hero-image*` with an
RTL variant at `:49-56`), spread in at `espn.ts:125`.

### 4b. Mechanism 2 — semantic utility-class contract (commerce)

`commerce-base` components hard-code names like `.bg-header`, `.site-header-height`,
`.button-primary-bg-hover`, `.account-items-container`, `.common-text-headline-small`. Each tenant app's
Tailwind config is obliged to define **every** one of them. ESPN's definitions
(`WEB/apps/commerce/espn/tailwind.config.cjs`) include:

```js
// :750-778 — ESPN wants a transparent, square, shadowless, responsive-height header
'.site-header-base': { backgroundColor: 'transparent', boxShadow: 'none', padding: `0 ${espnTokens.spacing['05']}` },
'.site-header-height': { height: '52px' }, '.site-header-height-sm': { height: '64px' },
'.site-header-height-md': { height: '72px' }, '.site-header-radii': { borderRadius: espnTokens.borderRadius.none },
// :1146-1150 — the logo is a background-image utility, not an <img>
'.h-header-logo': { height: '28px',
  backgroundImage: 'url("https://static-assets.bamgrid.com/product/espn/images/logo-red.3927cb00dff9e7964aca7abfbde97a53.svg")' },
```
This is why the file is 1,567 lines: it is not styling, it is **satisfying a contract**. A component added
to `commerce-base` with a new semantic class silently renders unstyled on any tenant that hasn't defined it.

### 4c. Mechanism 3 — behaviour injection via the Stitch registry (marketing)

Brand differences in *behaviour* (not colour) are injected as functions:
```tsx
// WEB/apps/marketing-unified/espn/src/shared/layout/application-layout/stitch-component-registry-overrides.tsx:9-26
export const registryOverrides: StitchComponentRegistryOverrides = {
  entitledContent,
  slider: { getItemsApiAdapter: getWatchApiItemsAdapter },
  image: { srcsetGenerator: ({ imageId, width, format = 'webp', label }) =>
    getImageRipcutPath({ id: imageId, width, format, host: RIPCUT_PROD_ENDPOINT, transform: 'compose', label }) },
};
```
mounted once at `WEB/apps/marketing-unified/espn/src/shared/layout/application-layout.tsx:172-181`.
ESPN's whole override surface is **three keys**; Disney+ maintains a much larger
`stitch-component-registry-overrides/` directory. ESPN's Slider pulls items from the **Watch API**, where
Disney+ uses Cannonball/Heimdall — a functional, not cosmetic, divergence.

### 4d. Where ESPN diverges *meaningfully* (CONFIRMED)

**(i) The `<h1>` maps to a different type-ramp tier per brand.**
```ts
// ESPN — espn.ts:22-27
h1: { '@apply text-onSurface display-small': {} },
h2: { '@apply text-onSurface headline-xxlarge': {} },
// Disney+ — disney.ts:23-28
h1: { '@apply text-onSurface headline-xxlarge': {} },
h2: { '@apply text-onSurface headline-xlarge': {} },
```
The same Stitch/`growth-components` markup therefore renders one ramp step larger and in a different family
on ESPN. Any shared component that reasons about heading size is brand-sensitive by construction.

**(ii) ESPN is the only brand with three font families and a 900 weight, and it switches family *and*
weight mid-ramp.** Disney+ extends `fontFamily` with one alias (`inspire`, `disney.ts:236-238`), Hulu with
one (`graphik`, `hulu.ts:195-197`), ESPN with three (`espn.ts:178-182`):
```ts
// espn.ts:90-92, 95-98, 110-113 (excerpt)
'.headline-large'  : '@apply font-ignite          font-bold  … md:text-headlineLarge …'
'.headline-xlarge' : '@apply font-igniteCondensed font-bold  … md:text-headlineXlarge …'
'.display-small'   : '@apply font-igniteCondensed font-black … md:text-displaySmall …'
```
Hulu uses `font-graphik font-semibold` throughout (`hulu.ts:97-99`); Disney+ uses **no family class and
hard-coded pixels** (`disney.ts:87,107` — `text-[24px]`, `text-[32px] … lg:text-[44px]`). So ESPN and Hulu
are token-driven while Disney+ is pixel-driven, in the same file family.

**(iii) Default body text colour and the `html` rule differ.** ESPN/Hulu: `body { … text-onSurface }`
(`espn.ts:17`, `hulu.ts:17`) and an `html` default family (`espn.ts:15`, `hulu.ts:15`). Disney+:
`text-onSurfaceVariant` (`disney.ts:16`) and **no `html` rule at all**.

**(iv) ESPN has no light theme.** See §1a / §10 G-3.

---

## §5. Stitch

### 5a. What it is (CONFIRMED)

`@solo/stitch` (`WEB/packages/marketing/stitch/`) is the **CMS rendering engine** for marketing, not a
styling library:
> Core CMS rendering system for Growth Marketing applications. Stitch follows the
> **Model-Builder-Component** pattern to transform Cannonball CMS data into rendered React components
> across all tenants (Disney+, Hulu, ESPN).
> **Data flow:** Cannonball CMS → Stitch Models → Stitch Builders → StitchDocument → React Components
> — `WEB/packages/marketing/stitch/readme.md:14-19`

Three layers (`readme.md:123-137`): **Models** (`src/models/`, ~90+ Zod-typed CMS entities) → **Builders**
(`src/builders/`, `build*` functions taking a raw `contentField`) → **Components** (`src/components/`,
`Stitch*` React components keyed off `model._type`). Core runtime pieces (`readme.md:149-158`):
`StitchComponent` (generic dispatcher), `StitchComponentRegistryProvider` (per-tenant overrides),
`StitchDataInterfaceProvider`/`useDataInterface`, `StitchActionsContext`.

**The problem it solves:** three brands each had their own bespoke page-rendering stack against a CMS with
no shared content model. Stitch is the single renderer; per-brand difference is expressed as registry
overrides (§4c), not forked components.

### 5b. Does ESPN use it? Yes, fully (CONFIRMED)

- `.../espn/src/views/landing-page/stitch/build-stitch-document.ts:48` — `buildStitchDocument({...})` returns
  `Result<StitchDocument, BuildStitchDocumentError>`; called from
  `.../get-server-side-props/get-page-props.ts:67-116` inside a traced span
  `views.landing-page.get-server-side-props.getPageProps.buildStitchDocument`.
- Providers mounted at `.../shared/layout/application-layout.tsx:12-15, 172-181`; Stitch source is in the
  ESPN Tailwind `content` array (`.../espn/tailwind.config.cjs:11`), so `Stitch*` classes compile with the
  ESPN preset.
- ESPN's Ripcut host is defined **inside** Stitch:
  `RIPCUT_PROD_ENDPOINT = ${RIPCUT_PROD_HOST}/ripcut-delivery/v2/variant/espn/`
  (`WEB/packages/marketing/stitch/src/builders/shared/constants.ts:4`).

### 5c. The "Stitch migration" and how an adapter works (CONFIRMED)

The migration is the move **off** each brand's legacy Cannonball shape **onto** Stitch models, bridged by
**smart adapters**:
> Because Cannonball doesn't yet have a global content model that can be shared across tenants, before
> getting on the NEXUS ecosystem each tenant (Disney+, Hulu, ESPN) had: different component
> implementations, different field names in Cannonball, different data structures, accumulated technical
> debt over time.
> — `WEB/packages/marketing/docs/onboarding/05-adapter-pattern-guide.md:23-28`
> **Smart Adapters** transform legacy Cannonball entities to modern Stitch models without requiring
> Cannonball CMS updates. — `:52`

Four contractual properties (`:85-120`): **idempotent** (`adapt(adapt(e)) === adapt(e)`), **recursive**
(children adapted automatically), **type-safe** (`sideAlignModel.safeParse(entity)` — success means already
modern, return as-is), **structural sharing** (`return hasChanges ? { ...entity, ...updates } : entity`).
Pipeline (`:122-142`): `Cannonball JSON (legacy) → Adapter Registry → specific adapter → idempotency check
→ transform fields → recursively adapt children → Stitch Model → Builder → Schema`.

**Adapter implementations exist only for Disney+** (CONFIRMED):
`WEB/apps/marketing-unified/disneyplus/src/data/stitch/builders/buildStitchPage/buildCannonballField/smart-adapters/`
holds ~40 `adapt-legacy-*.ts` files plus `adapt-entity-recursively.ts`, registered through
`adapter-registry.ts` (importing ~45 model types from `@solo/stitch/models` and ~45 legacy
`*CannonballEntity` schemas). **ESPN has no `smart-adapters/` directory** — its content is authored in
modern Stitch shape and consumed directly, matching the guide's own rule:
> ❌ **Creating a new tenant powered by Cannonball** - Use Stitch models directly in Cannonball — `:76`

**INFERRED:** ESPN is therefore "post-migration by construction" — it never accrued a legacy Cannonball
schema in this repo, so adapter work on ESPN tickets is almost certainly out of scope.

### 5d. Repo tooling for Stitch (CONFIRMED, from the available-skills manifest)

`generate-stitch-adapter`, `migrate-nsb-component`, `migrate-ui-component`, `migrate-to-spaceball`,
`generate-spaceball-fragments` (skills) and the `stitch-adapter` agent (works in an isolated git worktree,
creates the adapter, detects Glimpse analytics, opens a PR). Every one of these is scoped to **Disney+ /
NSB** in its own description — none targets ESPN.

---

## §6. Fonts, assets, logos

### 6a. Two ESPN font pipelines on two CDNs (CONFIRMED — this is the headline finding here)

| | Marketing ESPN | Commerce ESPN |
|---|---|---|
| Source file | `WEB/packages/marketing/growth-components/fonts/espn-fonts.ts` | `WEB/packages/cgi/commerce-base/src/common/styles/themes/espn.ts:372-449` |
| CDN | `https://a.espncdn.com` (`:3`) | `https://static-assets.bamgrid.com` |
| Path shape | `/prod/fonts/ESPNIgnite/…` , `/prod/fonts/benton-sans-*.woff2` | `/fonts/ignite/…` , `/fonts/benton-sans/…` , `/fonts/tungsten/…` |
| Formats | `woff2` only | `woff2` + `woff` + `otf`/`ttf` (content-hashed) |
| Families | `Ignite Condensed`, `Ignite`, `Benton` (3) | `ESPN Ignite Text`, `ESPN Ignite Text Condensed`, `ESPN Ignite Display`, `BentonSans`, **`Tungsten-Bold`** (5) |
| Weights | 900/700 (cond), 700 (text), 700/400 (Benton) | Regular + Bold per family; Benton 500/400 |
| Emitted by | Tailwind `addBase({'@font-face': getFontFace(EspnFonts)})` | Stitches `globalCSS({'@font-face': …})` |

Marketing declaration shape:
```ts
// WEB/packages/marketing/growth-components/fonts/espn-fonts.ts:5-19 (excerpt)
const IgniteCondensedFonts: TenantFont = {
  fontFamily: 'Ignite Condensed',
  locales: ['default', 'en', 'en-us', 'es', 'es-us'],
  fonts: [{ '900': { preload: true, font: {
    src: `url(${staticRoot}/prod/fonts/ESPNIgnite/ESPNIgniteDisplay-CondensedHeavy-Web.woff2) format("woff2")`,
    fontWeight: '900', fontStyle: 'normal', fontDisplay: 'swap' } } }, … ] };
export const EspnFonts = [IgniteCondensedFonts, IgniteFonts, BentonFonts]; // :81
```
All ESPN faces are `preload: true` + `fontDisplay: 'swap'` (`:11,21,39,57,68`) — i.e. **ESPN preloads every
face it declares**, unlike Disney+ which alternates `true/false` per weight
(`fonts/disney-fonts.ts:11,22,39,50,67,78,…`). See §10 G-8.

### 6b. Marketing font loading path (CONFIRMED)

Two independent consumers of the same `EspnFonts` array:

1. **`@font-face` emission** — `plugins/espn.ts:14` → `getFontFace(EspnFonts)`
   (`.../tailwind/plugins/shared/get-font-face.ts:3-19`), which flattens `TenantFont[]` into
   `TailwindFontFace[]` copying only `fontFamily, fontWeight, fontStyle, src` (`:9-14`) — ⚠️ **dropping
   `preload`, `locales`, and `fontDisplay`**; see §10 G-8.
2. **`<link rel=preload>` emission** — SSR puts the array on the app context:
   ```ts
   // WEB/apps/marketing-unified/espn/src/views/landing-page/get-server-side-props.ts:12, 367
   import { EspnFonts } from '@solo/growth-components/fonts';
   …  fontsToLoad: EspnFonts,
   ```
   consumed by Stitch's metadata builder → `StitchDocument.metadata.fonts`:
   ```ts
   // WEB/packages/marketing/stitch/src/builders/build-metadata.ts:54, 140
   const { assetHosts, ripcutHost, staticAssets: {…}, siteName, fontsToLoad } = appContext;
   …  fonts: fontsToLoad,
   ```
   typed at `WEB/packages/marketing/stitch/src/builders/shared/types/app-context.ts:76`
   (`fontsToLoad?: TenantFont[]`), rendered by `src/components/stitch-metadata.tsx:60,89`.

### 6c. Commerce font loading path (CONFIRMED)

```ts
// WEB/packages/cgi/commerce-base/src/common/styles/stitches.config.ts:85-88
export const fontReferences = Object.entries(OriginalThemes)
  .map(([, { fontReferences }]) => fontReferences)
  .filter(Boolean) // avoid including undefined fontReferences
  .reduce((acc, fontReferences) => [...acc, ...fontReferences]);
```
```ts
// WEB/packages/cgi/commerce-base/src/common/components/global-styles/global-styles.tsx:59-83 (excerpt)
function buildFontSrc(font: Font) {
  const urlsAndFormatsList = (font.fileFormats ?? ['eot', 'eot?#iefix', 'woff', 'woff2'])
    .map((ext) => `${font.url}.${ext}`)
    .map((url) => `url('${url}') format('${parseFileFormat(url)}')`);
  return [`local('${font.fontFamily}')`, ...urlsAndFormatsList].join(', ');
}
const GlobalFontStyles = globalCSS({ '@font-face': fontReferences.map((font) => ({
  fontFamily: font.fontFamily, src: buildFontSrc(font), fontWeight: font.fontWeight })) });
```
`local('<family>')` is tried before any network fetch. ⚠️ `fontReferences` concatenates **all four themes**
— see §10 G-4. There is also a locale-aware family override layer (`global-styles.tsx:97-127`,
`styles/lib/locale-styles.ts`) driven by URL language plus a Toodles `languageFontOverride` cookie, carrying
a `TODO WEB-32776` that it exists only until Hulu and D+ finish moving to design tokens (`:108`).

### 6d. Logos and static assets (CONFIRMED)

There are **no ESPN brand assets committed to the repo** — `apps/marketing-unified/espn/public/` and
`apps/commerce/espn/public/` contain only `favicon.ico` and `mockServiceWorker.js`. Everything is a
remote URL:

| Asset | URL | Cited at |
|---|---|---|
| ESPN wordmark (red) | `static-assets.bamgrid.com/product/espn/images/logo-red.3927cb00dff9e7964aca7abfbde97a53.svg` | `WEB/apps/commerce/espn/tailwind.config.cjs:36` (`bg-app-logo`), `:1090` (footer), `:1149` (header); `WEB/apps/marketing-unified/espn/src/shared/layout/error-layout.tsx:26` |
| MyDisney logo | `static-assets.bamgrid.com/identity/mydisney-light-logo.42770485441784429f861b664ce17ad4.svg` | `WEB/apps/commerce/espn/tailwind.config.cjs:1376` |
| warning / support / switch icons | `.../product/espn/images/{warning-icon,support-icon,switch-icon}.<hash>.svg` | `:110,116,122,128,1494,1498,1502` |
| content / pause icons | `.../product/**disneyplus**/images/{content-icon,pause-icon}.<hash>.svg` | `:1486,1490` ⚠️ see §10 G-5 |
| ESPN CDN host (marketing) | `https://a.espncdn.com` | `WEB/apps/marketing-unified/espn/src/views/landing-page/shared/constants.ts:3` |
| Airing artwork | `s.secure.espncdn.com/stitcher/artwork/collections/airings/…?package=ESPN_PLUS` | `WEB/packages/marketing/growth-components/src/card/watch-event-card/watch-event-card.stories.tsx:21` |

Content imagery is optimised through **Ripcut**, not `next/image`: the registry override generates srcsets
against `.../ripcut-delivery/v2/variant/espn/` with `transform: 'compose'`, `format: 'webp'` (§4c). Sizing is
**context-aware** — layout components (Grid, Hero, SideAlign, Section, Container) wrap children in
`ImageSizeMapProvider` and `StitchImage` regenerates variant URLs at runtime
(`WEB/packages/marketing/stitch/readme.md:160-173`; guide
`WEB/packages/marketing/docs/context-aware-image-sizing.md`).

---

## §7. Accessibility and responsive conventions in ESPN-facing components

### 7a. Focus indicator — tokenised and consistently applied (CONFIRMED)

ESPN ships `focusIndicator` = `#F9F9FB` (near-white), `focusIndicatorVariant` = `#3A73DF` (blue), plus
`focusIndicatorFocusIndicatorThickness: 2px` and `…OuterOffset: 2px` (`dist/espn.css:77-78, 243-244`).
Every interactive `cgi-design-components` primitive uses `focus-visible:` (not `:focus`), 2px outline, 2px
offset — the canonical string is
`'focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-focusIndicator'`
(`.../src/components/button/button.tsx:41`), repeated at `card/card-item.tsx:18`, `dialog/dialog.tsx:125`,
`toast/toast.tsx:125,128`, `toggle/toggle.tsx:179`, `breadcrumb/breadcrumb.tsx:37` (offset-4),
`check-radio/check-radio.tsx:36` (`-outline-offset-2`). Button variants split the two focus tokens:
primary → `focus:outline-focusIndicator`, secondary → `focus:outline-focusIndicatorVariant`
(`button/button.tsx:47,51`). `Toast` also honours reduced motion (`motion-reduce:transition-opacity`, `:125`).

Two exceptions: `growth-components` `FlipCard` signals focus with **border/text colour**, not an outline
(`src/card/flip-card/flip-card.tsx:51,69`); and Hulu's plugin repurposes `focusIndicator` as a background
(`plugins/hulu.ts:126`) where ESPN uses `onSurface` for `.nav-item-focus` (`plugins/espn.ts:140-142`).

### 7b. Focus management and a11y tooling (CONFIRMED)

- `useFocusManager` — "Keyboard navigation and focus management"
  (`WEB/packages/marketing/growth-components/readme.md:82`; also in `ui/core`).
- `useFocusRestoration` (`.../growth-components/src/modal/use-focus-restoration.ts`) restores focus to the
  trigger, with a branch written **specifically for ESPN**: "Restore on unmount (for ESPN/Hulu that unmount
  the modal entirely when closing) / Only restore if modal was actually opened and mounted (not a React
  hydration remount)" (`:148-150`), guarded by `hasFullyOpened && wasMounted` (`:155`).
- `@storybook/addon-a11y` (axe) is enabled in **every** ESPN-relevant Storybook:
  `cgi-design-components/.storybook/main.js:19`, `marketing/growth-components/.storybook/main.ts:16`,
  `marketing/stitch/.storybook/main.ts:40`, `cgi/commerce-base/.storybook/main.js:30`,
  `cgi/footer/.storybook/main.cjs:32`.
- SSR language on `<html>` from middleware headers:
  `<Html lang={locale ? `${language}-${locale}` : language}>` (`WEB/apps/commerce/espn/pages/_document.page.tsx:44-50`).
- `WatchEventCard` takes an explicit `imageAlt?: string`
  (`.../growth-components/src/card/watch-event-card/watch-event-card.tsx:12`).

### 7c. Responsive conventions (CONFIRMED)

**Mobile-first** on both surfaces: `WEB/packages/marketing/growth-components/readme.md:101`, and
`WEB/packages/cgi/commerce-base/src/common/styles/stitches.config.ts:8-15` — "Use mobile-first styling where
the default breakpoint is the 'xs' mobile breakpoint" — exposing `xsAndUp … xlAndUp`, plus escape hatches
(`xsAndSm`, bounded `md`, bounded `lg`, `print`) with an in-line justification for when they're allowed
(`:17-32`).

ESPN's marketing breakpoints are Tailwind defaults with **one** override:
```ts
// WEB/packages/marketing/growth-components/src/shared/breakpoints/screen-overrides.ts:7-21
export const SCREEN_OVERRIDES = {
  disney: { sm: '441px', md: '769px', lg: '1025px', xl: '1291px', '2xl': '1600px' },
  hulu:   { lg: '1025px' },
  espn:   { lg: '1025px' },
} as const;
```
It is the "single source of truth for per-tenant Tailwind screen overrides. Both Tailwind config files
(.cjs) and the breakpoint utility module import from here" (`:1-6`), consumed at
`WEB/packages/marketing/growth-components/tailwind/tailwind.espn.cjs:22` and
`src/shared/breakpoints/config.ts:97`. The derived 6-tier image query system deliberately skips Tailwind's
`xl` (`config.ts:27-37`). ESPN activates it once at module scope:
`configureBreakpoints('espn')` — `WEB/apps/marketing-unified/espn/src/shared/layout/application-layout.tsx:33`.
See §10 G-10 for the singleton hazard.

The ESPN Tailwind plugin's own responsive pattern is **`md:`-gated type scaling** (mobile value bare,
desktop value behind `md:`) applied uniformly across the ramp — e.g.
`'.display-medium': '@apply … text-displayXsmall leading-displayXsmall … md:text-displayMedium md:leading-displayMedium md:my-6'`
(`plugins/espn.ts:116-118`) — plus `max-md:overflow-x-hidden` on `body` (`:17`).

### 7d. RTL (CONFIRMED)

Logical properties are used throughout rather than physical ones: `marginInlineStart`, `insetInlineStart`,
`paddingInline`, `borderStartStartRadius`/`borderEndEndRadius` (e.g.
`WEB/apps/commerce/espn/tailwind.config.cjs:1467, 1524, 324-325, 1338-1339`;
`shared-classes.ts:27,33`). `shared-classes.ts:49-56` ships an explicit
`[dir="rtl"] .mask-hero-image-dual` variant flipping the gradient angle. `useIsRTL` is a public hook
(`growth-components/readme.md:84`) and Storybook has an LTR/RTL/unset toolbar
(`.storybook/preview.tsx:30-39`, applied as `dir={…}` at `:76`).

---

## §8. Storybook and visual regression (Sauce Labs)

### 8a. Storybook instances that render ESPN (CONFIRMED)

| Storybook | ESPN renderable? | How the ESPN theme is selected |
|---|---|---|
| `WEB/packages/marketing/growth-components/.storybook` | ✅ **ESPN is the default tenant** | toolbar global + hot-swapped `<link>` |
| `WEB/packages/marketing/stitch/.storybook` | ✅ | toolbar `items: ['disney','hulu','espn']` (`preview.tsx:49`) |
| `WEB/packages/cgi/commerce-base/.storybook` | ✅ | per-tenant config `tailwind-espn.config.cjs` |
| `WEB/packages/cgi/footer/.storybook` | ✅ (mocks at `src/mocks/mocks/espn.ts`) | footer Stitch registry |
| `WEB/packages/cgi/cgi-design-components/.storybook` | ❌ | `themePresets` = disney, hulu only (`tailwind.config.cjs:9-12`, `WEB-23464`) |
| `WEB/apps/commerce/{disneyPlus,hulu}/.storybook` | n/a | **no `apps/commerce/espn/.storybook` exists** |

The growth-components mechanism is unusual: Tailwind cannot host multiple configs in one build, so
per-tenant CSS is **pre-generated** and hot-swapped by DOM manipulation:
```tsx
// WEB/packages/marketing/growth-components/.storybook/preview.tsx:47-58 (excerpt)
useEffect(() => {                       // on tenant/theme change, replace the <link>
  const id = 'dynamic-tailwind';
  let link = document.querySelector(`#${id}`) as HTMLLinkElement | null;
  if (link) link.remove();
  link = document.createElement('link'); link.id = id; link.rel = 'stylesheet';
  link.href = `/tailwind/${tenant}-${theme}.css`;
  document.head.append(link);
}, [tenant, theme]);
```
Stories are wrapped in `<div className={tenant} data-theme={theme} dir={…}>` (`:72-83`), with the reason at
`:61-71` ("we must rely on the className / data-theme attributes rather than using the CSS variables
approach because Storybook doesn't support loading CSS files from non-local sources"). The generator
(`.storybook/tailwind/build-storybook-css.mjs:13-34`) emits five files; the ESPN config uses
`important: '.espn[data-theme="dark"]'` (`.storybook/tailwind/tailwind.espn.cjs:11`).

### 8b. Visual regression — Sauce Labs Visual (CONFIRMED)

Configured in exactly **one** package: `WEB/packages/cgi/commerce-base/package.json`. The `test:storybook`
script (`:25`) builds + serves the static Storybook, then runs `npx test-storybook --index-json` against it
with `SAUCE_VISUAL_PROJECT='CGI_COMMERCE-BASE'`, `SAUCE_VISUAL_BUILD_NAME='CGI_COMMERCE-BASE'`,
`SAUCE_VISUAL_BRANCH='main'`, and credentials `WEBPROFILES_SAUCE_USERNAME` / `WEBPROFILES_SAUCE_ACCESS_KEY`.
Baselines are promoted by `vrt:baseline-merge` →
`npx @saucelabs/visual baselines merge -p web-profiles -s $(git rev-parse --abbrev-ref HEAD) -t HEAD` (`:27`).
Deps: `@saucelabs/visual-storybook: ^0.4.2` (`:106`), `@storybook/test-runner` (`:119`).
⚠️ `SAUCE_VISUAL_BRANCH` is hard-coded to `main` and the command ends in `exit 0` — **failures never fail
the job**. Storybook builds run under MSW (`NEXT_PUBLIC_API_MOCKING=enabled`, `:11,18`).

Marketing has **no** Sauce Visual wiring; its review loop is a manual Jenkins deploy:
> Go to https://fed.jenkins.us-east-1.bamgrid.net/job/fzb-nexus-storybook/ … Ctrl+F for your branch name
> and click `Schedule build` … go to https://webdocs-hub.bamgrid.com/ … Every time you push up a change to
> your feature branch, you'll need to rerun the Storybook build.
> — `WEB/packages/marketing/growth-components/readme.md:33-40`

CI Storybook publish targets exist for both surfaces (`WEB/ci/storybook/{commerce,nexus,cgi-design-components,…}/storybook`)
plus ESPN-specific pipelines `WEB/ci/espnplus/commerce` and `WEB/ci/espnplus/nexus`.
**INFERRED:** ESPN commerce components are covered by Sauce Visual only through the shared `commerce-base`
Storybook — and only for stories whose tenant config is ESPN.

---

## §9. Vocabulary

| Term | Meaning here |
|---|---|
| **Token** | A Figma variable resolved by Style Dictionary into `dist/<brand>.{css,json,js}`. Names are camelCase and flattened: `--colorsSurfaceContainerHigh` ↔ `colors.surfaceContainerHigh` ↔ Tailwind `surfaceContainerHigh`. |
| **Preset** | A Tailwind `presets[]` entry (`@solo/cgi-design-components/src/presets/espn`). **This is what "the ESPN theme" means in production.** |
| **Plugin** | A Tailwind `plugins[]` entry adding `@font-face`, element base rules, and semantic utilities (`plugins/espn.ts`). |
| **Semantic utility class** | A brand-agnostic class name (`.primary-button`, `.site-header-base`, `.common-text-display-large`) that every tenant config must define. The core cross-brand contract. |
| **Type ramp** | The `body/label/headline/display` × `xsmall…xxlarge` scale, each tier a utility class. ESPN's ramp swaps font family *and* weight mid-scale. |
| **`scopeSelector`** | Tailwind theme key read by tenant configs to decide where CSS vars land. `.espn` in Storybook, `:root` in the app. |
| **Stitches** | The legacy CSS-in-JS lib (`@stitches/react`) powering `commerce-base`. **Unrelated to Stitch.** |
| **Stitch** | `@solo/stitch`, the Cannonball→React CMS renderer for marketing. |
| **Smart adapter** | Idempotent, recursive, Zod-validated transform from a legacy Cannonball entity to a modern Stitch model. Disney+ only. |
| **Registry override** | Per-tenant function injection into Stitch (`slider.getItemsApiAdapter`, `image.srcsetGenerator`). ESPN's only Stitch customisation. |
| **Ripcut** | Disney's image transform CDN; ESPN variant path `/ripcut-delivery/v2/variant/espn/`. |
| **Toodles** | In-app dev/QA overlay; owns `ThemeSelector` and the `languageFontOverride` cookie. |
| **NEXUS** | The unified marketing platform (`apps/marketing-unified/*`). |
| **`espnChampionshipGold`** | `hsl(42.96, 100%, 49.02%)` — an ESPN-only colour that lives in the **base** Stitches theme. |

---

## §10. Gotchas

**G-1 — `@solo/marketing-styles` does not support ESPN, but two READMEs say it does (CONFIRMED).**
`WEB/packages/marketing/README.md:90` claims "Brand-specific theme CSS files (Disney, Hulu, ESPN)" and
`WEB/packages/marketing/styles/readme.md:18` claims "multi-tenant styling across Disney+, Hulu, and ESPN".
Reality: `WEB/packages/marketing/styles/src/tenants/` contains only `disney/` and `hulu/`, and the only
dependent is `apps/marketing-unified/disneyplus`. **Do not look for ESPN Vanilla Extract themes; they do
not exist.** ESPN marketing theming is Tailwind, in `growth-components`.

**G-2 — Two incompatible token-delivery modes coexist; mixing them yields invisible styles (CONFIRMED).**
The app config uses `presets: [espnPreset]` → literal `hsl()` values, no DOM class needed
(`WEB/apps/marketing-unified/espn/tailwind.config.cjs:15`). The package config uses
`generateTailwindColorTokens('@solo/cgi-design-tokens/tokens/espn.css')` → `var(--colorsX)`, which resolves
**only** inside a `.espn` ancestor (`tailwind/tailwind.espn.cjs:9-11`; `dist/espn.css:5`). Copy a class list
from a Storybook story (var-based) into the app (literal-based), or vice versa, and colours either work by
accident or resolve to nothing. Always confirm which config compiled the CSS you are debugging.

**G-3 — ESPN has no light theme and no `data-theme` alias (CONFIRMED).**
`scripts/build.ts:41-72` gives ESPN no `dataTheme`, so `:117-119` emits the selector `.espn` alone —
where Disney/Hulu emit `.disney, [data-theme="dark"]` etc. Two consequences:
(a) any code that themes via `[data-theme]` alone gets **zero** ESPN variables;
(b) `build-storybook-css.mjs:13-34` generates only `espn-dark.css`, yet the Storybook toolbar offers
`['light','dark']` for all tenants (`.storybook/preview.tsx:20-29`) — selecting **tenant=espn + theme=light
requests `/tailwind/espn-light.css`, which does not exist**, giving a 404 and an unstyled canvas. Not a bug
in ESPN; a bug in the toolbar's assumption.

**G-4 — Every commerce app ships all four themes' `@font-face` blocks (CONFIRMED).**
`stitches.config.ts:85-88` reduces `fontReferences` across **all** of `base`, `disneyPlus`, `hulu`, `espn`
with no tenant filter, and `global-styles.tsx:77-83` emits the lot. ESPN commerce CSS therefore declares
Inspire, Graphik, *and* the ESPN families. Unused faces aren't downloaded, but **a `font-family` typo in an
ESPN component can silently resolve to a Disney+ or Hulu face instead of failing visibly.**

**G-5 — Cross-brand asset leak in the ESPN commerce config (CONFIRMED).**
```js
// WEB/apps/commerce/espn/tailwind.config.cjs:1484-1491
'.bg-content-icon': { backgroundImage: 'url(".../product/disneyplus/images/content-icon.<hash>.svg")' },
'.bg-pause-icon':   { backgroundImage: 'url(".../product/disneyplus/images/pause-icon.<hash>.svg")' },
```
Two ESPN utilities point at `product/**disneyplus**/` assets while every neighbouring rule uses
`product/espn/`. Also note `'.bg-promo-icon'` (`:1492`) and `'.bg-switch-icon'` (`:1500`) resolve to the
**same** `switch-icon.<hash>.svg`, and `'fill-info-hover'` at `:1044` is **missing its leading dot**, so
that rule generates a bogus element selector and never applies (the correct `.fill-info-hover` exists at
`:551`).

**G-6 — The `twMerge` extension is built from Disney tokens for all brands (CONFIRMED assumption, currently safe).**
`WEB/packages/cgi/cgi-design-components/src/styles/utils.ts:1-3, 104-108`:
`// tokens are consistently defined across tenants, so utilizing Disney here does not matter` /
`import { disneyTokens … }` / `designComponentsTwMerge = extendTailwindMerge({ extend: { classGroups: generateClassGroups(disneyTokens) } })`.
I verified the assumption holds **today**: disney/espn/hulu each expose the same 17 groups and exactly
**241** flattened keys, zero set difference either direction. **But it is load-bearing and unenforced** —
the moment ESPN gains a token Disney lacks, `designComponentsTwMerge` stops recognising that class group and
conflicting ESPN classes both survive the merge, giving source-order-dependent styling. No test asserts key
parity; worth adding one.

**G-7 — Tailwind font aliases deliberately do not match token font families (CONFIRMED).**
`plugins/espn.ts:178-182` defines `benton: ['Benton', …]`, `ignite: ['Ignite', …]`,
`igniteCondensed: ['Ignite Condensed', …]` — matching the `@font-face` families declared in
`fonts/espn-fonts.ts` (`'Benton'`, `'Ignite'`, `'Ignite Condensed'`). The **tokens** name the same faces
`BentonSans`, `ESPN Ignite Text`, `ESPN Ignite Text Condensed`, `ESPN Ignite Display`
(`dist/espn.css:79-96`), which is what commerce uses (`themes/espn.ts:169-184`). So `font-benton`
(marketing) and `fontFamily: espnTokens.fontFamily.bodyLarge` (commerce) reference **different
`@font-face` names loaded from different CDNs**. Use `font-*` aliases in marketing and token values in
commerce; never cross over.

**G-8 — `getFontFace` silently drops `preload` and `fontDisplay` (CONFIRMED).**
`TenantFont` carries `preload: boolean` and `font.fontDisplay` (`fonts/types.ts:2-10`), and every ESPN face
sets `preload: true, fontDisplay: 'swap'`. But `getFontFace` copies only
`fontFamily, fontWeight, fontStyle, src` (`plugins/shared/get-font-face.ts:9-14`) — so the generated
`@font-face` rules have **no `font-display`** and fall back to the browser default (`auto`/block), risking
FOIT. `preload` survives only via the separate `fontsToLoad` → `StitchDocument.metadata.fonts` path
(§6b), so `<link rel=preload>` and `@font-face` are produced by two code paths from one array and can
disagree.

**G-9 — `commerce-base`'s ESPN Storybook config discards `theme.extend` (CONFIRMED).**
```js
// WEB/packages/cgi/commerce-base/.storybook/tailwind-espn.config.cjs:6-11
export default { ...tailwindConfig, theme: { scopeSelector: '.espn' }, important: '.espn' };
```
Spreading `tailwindConfig` then assigning a **fresh** `theme` object replaces
`tailwindConfig.theme.extend` — losing ESPN's animations (`slide-up`, `fade-in`, `cursor-blink-espn`),
keyframes, and `backgroundImage['app-logo']` (`WEB/apps/commerce/espn/tailwind.config.cjs:26-57`).
Animated/logo-bearing ESPN stories will not match the app. Also note `important: '.espn'` raises specificity
for *every* utility, so Storybook cannot reproduce app-level specificity bugs.

**G-10 — Breakpoints are a module-level mutable singleton that defaults to Disney (CONFIRMED).**
`WEB/packages/marketing/growth-components/src/shared/breakpoints/config.ts:68-92`:
`// Default to Disney+ for backward compatibility (matches old Context default)` /
`let currentConfig = createBreakpointConfig('disney')` / `configureBreakpoints(tenant)` mutates it /
`getBreakpoints()` returns it (JSDoc: "Returns Disney+ breakpoints if configureBreakpoints() hasn't been
called") / `resetBreakpoints()` reverts to **disney**, not the current tenant.
ESPN sets it at module scope (`application-layout.tsx:33`), which is correct — but any ESPN code path
reaching `getBreakpoints()` **before** that module is evaluated (isolated unit test, story, a
`getServerSideProps` helper imported without the layout) gets **Disney breakpoints**
(`sm 441 / md 769 / lg 1025 / xl 1291 / 2xl 1600`) instead of ESPN's
(`sm 640 / md 768 / lg 1025 / xl 1280 / 2xl 1536`). Silent, cross-request under SSR, and it corrupts
`imageWidthBaseSizes` → wrong Ripcut variant widths. Tests must call `configureBreakpoints('espn')` and
`resetBreakpoints()`.

**G-11 — SSR theme resolution is order-critical in commerce (CONFIRMED, with a ticket).**
`const defaultClassName = createTheme(espnTheme.theme).className;` sits at module scope in
`WEB/apps/commerce/espn/pages/_document.page.tsx:17` under the comment "initialize default theme outside of
React rendering lifecycle which can cause this value to be resolved AFTER the first render leaving the page
inappropriately styled. **See WEB-2277**" (`:14-16`). Moving it inside the component regresses WEB-2277
(flash of unthemed content). Related: Stitches CSS is injected via
`dangerouslySetInnerHTML={{ __html: getCSSText() }}` (`:52-55`) — order relative to Tailwind's stylesheet
decides which wins at equal specificity, and `preflight: false` (`tailwind.config.cjs:15`) exists precisely
to stop Tailwind's reset clobbering Stitches.

**G-12 — `.espn` in `dist/espn.css` is never applied in production apps (CONFIRMED).**
Neither ESPN app puts `class="espn"` on any element; commerce puts a **Stitches hash** on `<body>`
(`_document.page.tsx:61`) and marketing puts nothing. So a debugging habit of "add `.espn` to `<html>` and
the vars will appear" only works if `dist/espn.css` is actually loaded — which it is not in either app.
`.espn` is a Storybook/`ThemeSelector` construct.

**G-13 — Specificity: escalation exists only in Storybook; the app relies entirely on `twMerge` (CONFIRMED).**
`important: '.espn'` lives in both Storybook configs, and the sole `!important` in shared code is
`'li:has(.animation-card-container)': { flex: '0 0 auto !important', width: 'auto !important' }`
(`shared-classes.ts:73-76`). In the app, conflict resolution is `twMerge` — and both READMEs name string
concatenation as *the* pitfall (`WEB/packages/marketing/README.md:149` "never concatenate Tailwind class
strings directly, it causes specificity conflicts"; `growth-components/readme.md:123-125`).
`commerce-base`/footer must use the token-aware `designComponentsTwMerge` (e.g.
`WEB/packages/cgi/footer/src/footer/stitch-component/stitch-collection/stitch-collection/collection.tsx:2`);
plain `twMerge` there loses the custom class groups from G-6.

**G-14 — `borderRadiusButton: 1000px` means ESPN buttons are fully pill-shaped by token (CONFIRMED).**
`dist/espn.css:18`. Any ESPN mock showing square buttons is either using `.rounded-section` / explicit
`borderRadius: '4px'` overrides (numerous in `tailwind.config.cjs`, e.g. `:1038-1043`) or is stale. The same
applies to `borderRadiusVessel: 1000px` (`:16`).

**G-15 — Stitch registry gaps fail silently (CONFIRMED, from the package's own pitfalls).**
> **Component registry** — Brand-specific overrides must be registered via
> `StitchComponentRegistryProvider`. Missing registrations cause silent fallbacks.
> — `WEB/packages/marketing/stitch/readme.md:203-205`; see also
> `WEB/packages/marketing/README.md`: "Stitch registry is per-brand — adding a component to one brand's
> registry doesn't add it to others."
ESPN registers only `entitledContent`, `slider`, `image`. A new Stitch component that assumes a registry
override will fall back on ESPN with no error.

---

## §11. Open questions

1. **`Cond Heavy` (Finding 2).** Fix in Figma (rename to `Heavy`, already mapped at `transforms.ts:94`) or in
   code (add `condheavy: '900'`)? Is there a Jira? Would emitting `900` visibly change commerce display type
   — i.e. does anything currently depend on the value being ignored? UNKNOWN.
2. **Is ESPN's `brand` (`#5A91F6`) intentional or a placeholder?** `brand`, `brandBright`, `action`, `info`
   are the *same* blue (`dist/espn.css:213,214,199,238`) — unusual for a designed system, reads
   under-differentiated. Needs a designer/Figma answer.
3. **Will ESPN get a light theme?** If so `scripts/build.ts` needs an `espn-light` entry with `dataTheme`,
   and the `.espn`-only selector (`:117-119`) becomes a migration hazard for anything keying off `.espn`.
4. **`WEB-23464`** — tracked fix for `cgi-design-components`' single-preset Storybook
   (`tailwind.config.cjs:4-8`). Is ESPN in scope? Today ESPN cannot be reviewed there at all.
5. **Actual ESPN visual-regression coverage?** Which ESPN stories are in the `CGI_COMMERCE-BASE` baseline,
   and does marketing have any automated visual gate (§8b)?
6. **Is the 1,567-line `apps/commerce/espn/tailwind.config.cjs` being retired?** Four live TODOs
   (`WEB-33666` `:779`, `GCIEX-9222` `:964`, `WEB-33017` `:972`, `WEB-32776` in `global-styles.tsx:108`) and
   heavy duplication of the Stitches theme. Is there a plan to collapse Stitches + Tailwind, and what
   token-coverage target would let the file shrink?
7. **Is `packages/marketing/styles/src/multi-tenant-styles/` a planned ESPN destination or dead code?**
   Named as if tri-brand; no dependency edge from ESPN.
8. **`Tungsten-Bold`** ships in commerce ESPN `fontReferences`
   (`.../styles/themes/espn.ts:446-448`) but appears in no token, alias, or marketing font file. Live or dead?
9. **ESPN adapters (§5c) are absent — permanent or pending?** Was ESPN authored natively in modern Stitch
   shape, or is legacy ESPN content simply not migrated into this repo yet?
10. **`espnChampionshipGold` lives in the *base* Stitches theme** (`.../styles/themes/base.ts:97`). Why not
    the ESPN theme, and is the identical gradient duplicated in Tailwind (`tailwind.config.cjs:795,956`)
    meant to be the same value? Two sources, no link between them.
