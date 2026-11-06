# ESPN Research — Index & Corrections Register

Research backing the **ESPN Architecture** academy (`src/modules/espn-architecture/`).
Produced 2026-08-25 from `cgi-web` @ `607747d290` (main) and `growth-life-client-api`.

**Read this file first.** The digests below were written in parallel by independent
researchers, then partially corrected during module authoring. Where a digest and
this register disagree, **this register wins**.

## Digests

| File | Scope | Lines |
|---|---|---|
| `01-commerce-app-anatomy.md` | `apps/commerce/espn` shell, tenant switch, SSP pipeline, route gating, deploy | 1309 |
| `02-data-layer.md` | `data-interface-espn`, BamTech Browser SDK adapter, orchestration proxy, mocks | ~730 |
| `03-signup-checkout-flow.md` | Entry contracts, `/identity/loading` handlers, add-ons, ledger, purchase execution | 1098 |
| `04-identity-auth.md` | OneID v4 vs Identity v5, session, cross-domain SSO, redirect validation, TVE boundary | 1226 |
| `05-marketing-nexus.md` | `apps/marketing-unified/espn`, CMS routes, Cannonball/Spaceball, hand-off contract | 1457 |
| `06-brand-theming-ui.md` | Design tokens, Tailwind presets, fonts, Stitch, theming defects | 1026 |
| `07-flags-experiments-region-i18n.md` | Two flag systems, WeaponX, territories, Cypher dictionary, offers | 1871 |
| `08-observability-ci-testing.md` | Adobe vs Glimpse, two RUM apps, logging taxonomy, CI gates, testing | 1645 |
| `09-flex-bff-espn.md` | Flex BFF, partner predicate, two engines, templates, symptom→owner table | 963 |

Approx. 11,300 cited lines. Every significant claim is labelled CONFIRMED / INFERRED /
UNKNOWN with a `path:line` citation.

## Corrections established during module authoring

Each was verified first-hand in the repo, overriding the original digest text.

| # | Corrected fact | Superseded claim | Source of correction |
|---|---|---|---|
| 1 | ESPN's brand colour **token is blue**, `hsl(219,90%,66%)` ≈ `#5A91F6`. Red exists only inside the logo asset. `cc0000` appears in exactly one place repo-wide: a stale line in `apps/marketing-unified/espn/README.md`. | "ESPN brand red `#cc0000`" | Read from built token output `cgi-design-tokens/dist/espn.json` + `dist/espn.css:199,213,214`; full-repo grep |
| 2 | Hulu `fontWeight.displayLarge` is **500** | digest 06 said 600 | direct token read |
| 3 | ESPN Flex endpoints = **106** | digest 09 said 107 | counted in `sdk-session/src/__fixtures__/espn/macosx-chrome-qa.json` |
| 4 | `OrchestrationOperations` has **68** members; **62** fall through the `notImplemented` proxy | digest 02 said ~90 / ~84 | counted in `developer-experience/types` |
| 5 | `ACTION_CODES` has **12** members (`ERROR_CODES` 73 confirmed) | digest 08 said 13 | counted in `commerce-base/src/common/constants/observability.ts` |
| 6 | Hulu's Flex layer is **318** lines | digest 02 said ~280 | measured |
| 7 | Non-test src: ESPN 31 files / 908 LoC, D+ 111 / 5041, Hulu 60 / 3533 | digest 02 counts included dotfiles | measured |
| 8 | Marketing offer-token prices **always render the CMS `fallback_*` values** — `replaceOfferTokensInSnapshot` calls `buildOfferToken` with `offer: {}` behind `TODO WEB-33524`. The GLO offers client has no ESPN brand. | fallbacks framed as a degradation safety net | `packages/marketing/plans-pricing-api/src/tokens.ts` |
| 9 | `?enable-spaceball=true` is **ignored in production** unless debug tooling or Playwright is active | implied as a general override | `get-feature-flag-with-query-override.ts` |
| 10 | Flex experiment latch is `if (!experimentTemplateConfigurationForScreen)` — the winner is the first featureId **whose variant maps to an entry in `templates`**, not merely the first with an assignment. A second silent path to control exists via `templatesV2[variant][version]`. | "first featureId wins" | `growth-life-client-api: src/domain/screen/common/configuration.ts:36-100` |
| 11 | ESPN paywall config lists **4** `experimentFeatureIds` against **7** template variants | 3 sketched | parsed `espn-paywall.json` |
| 12 | The `notImplemented` proxy-spread hazard is **confirmed in source** and reproduced in Node semantics (spread of a get-trap-only Proxy copies own keys only → `TypeError`, not `Not implemented`). Not yet observed in a running app. `cancelInvite` is the cleanest probe. | INFERRED | `identity-data-interface.ts:150` + Node repro |
| 13 | Divergence is expressed in data, not code: **366** `espn` matches across 84 production files in `commerce-base`, but only **26** brand-literal comparisons across 10 files — **3** are `=== 'espn'` | no quantification | fresh grep, tests/fixtures/mocks excluded |
| 14 | No *app-wide* ThemeProvider or runtime theme switch, but **four isolated `ThemeProvider` usages pin `themeName="disneyPlus"`** — one in the ESPN-only wallet modal | "no ThemeProvider in production" | `grep 'themeName="'`; `payments/wallet/.../wallet-modal-container.tsx:141` |
| 15 | `NEXT_PUBLIC_FLEX_LOCAL_SERVICE` has **no source consumer** (verified). The June 2025 deletion-commit detail comes from an untracked personal doc and is not repo-attested. | asserted deletion commit | grep across both repos |
| 16 | The digests 05/06 never actually conflicted on brand colour — 05 already flagged the README as wrong. | apparent conflict | `05-marketing-nexus.md:1266-1271` |

## Confirmed defects & doc drift (candidates for tickets)

Defects — verified in source:

1. `addOnsExperimentRedirectHandler` returns `handler: 'entitledUserRedirectHandler'` (`commerce-base/src/common/redirect/handlers.ts:32-41`), feeding the `[navigation] Redirect handler success` RUM action at `use-navigation-redirect.tsx:372`. **ESPN RUM misreports why users reach add-ons.** Found independently by two agents.
2. ESPN display font weights ship as **invalid CSS** — `--fontWeightDisplay*: Cond Heavy` (`cgi-design-tokens/dist/espn.css:130-133`), root-caused to a missing `condheavy` entry in the Figma weight map (`src/config/transforms.ts:98`). Commerce ships it broken; marketing masks it with `font-black`.
3. Four hardcoded `themeName="disneyPlus"` sites, incl. the **ESPN-only** wallet modal — an ESPN-exclusive surface rendering Disney+ tokens. An adjacent comment calls it deliberate, which makes it debatable rather than clear-cut.
4. `pnpm -F @solo/commerce-espn test:jest` **silently runs with Disney+ fixtures** (no `PRODUCT=espn`). Developers can believe they tested ESPN when they did not.
5. `pnpm test:marketing-unified:playwright:headless:espn` is **broken** — resolves to a turbo task that package never defines.
6. `metrics.yml:10-13` emits **no ESPN commerce Playwright metrics** — stale pre-"(Sharded)" `workflow_run` names.
7. ESPN jest files carry **no `@espn` tag**, so ESPN results are not sliceable by product in CI visibility.
8. Two ESPN Tailwind utilities point at `product/disneyplus/` assets; `'fill-info-hover'` is missing its leading dot (dead rule).
9. `data-interface-espn` `package.json` `main`/`types` point at `src/index.tsx`, which does not exist (works only because consumers deep-import).

Latent hazards:

10. `isPartnerESPN` is **case-sensitive** while several call sites `.toLocaleLowerCase()` first — divergent behaviour if a client ever sends `ESPN`.
11. Multiple `experimentFeatureIds` on one screen → all but one silently dropped (see correction 10).
12. Breakpoints are a mutable module singleton defaulting to Disney; `resetBreakpoints()` reverts to **Disney**, not the current tenant.
13. `designComponentsTwMerge` builds class groups from Disney tokens for all brands — parity holds today, untested and load-bearing.
14. `@env:stage` never matches ESPN commerce (env collapsed to `prod|non-prod`), so a natural RUM filter silently returns nothing.

Documentation drift — code wins:

15. `apps/commerce/AGENTS.md` — stale `src/` tree for ESPN; wrong local host (`local.espn.com`, real is `local.plus.espn.com:5004`); wrong package name (`@solo/commerce-disneyplus`, real is `@solo/commerce-disney`).
16. `apps/marketing-unified/espn/README.md` — wrong host/port (real: `local.plus.espn.com:5040`, Next 4040); lists Tealium + HITS which **do not exist in code**; `#cc0000`.
17. Root `CLAUDE.md` — Growth team listed as `@cgi-client/growth`; `.github/CODEOWNERS` (what GitHub enforces) uses `@cgi-client/web-growth`.
18. `load-sparrow-config.ts:80` doc-comment claims errors return unmodified config; the code throws.

## Known unknowns — do not waste a day rediscovering

- `growth-life-client-templates` (separate repo) — deployed templates could not be compared against checked-in fixtures.
- Cypher dictionary **contents** — what any key resolves to per locale.
- Production Sparrow values, LaunchDarkly states, WeaponX allocations. **All flag values quoted in the digests are QA/test fixtures.**
- Which Flex engine (legacy vs platform) actually serves the ESPN paywall in production.
- Bundle **contents** for the ESPN bundle package ids — documented nowhere.
- Monitors / SLOs / synthetics — none in `cgi-web`; they live in a separate observability-config repo.
- Whether ESPN traffic reaches Glimpse in production (`isGlimpseEnabledAtom` fails open; needs the `espn` tenant's `enabledAnalyticsTooling`).
- Product terms with **no code attestation**: "paywall" (Adobe pageName + CDN folder only), "contextualization" (dictionary strings only), "TVE" (absent from commerce and marketing entirely), `Plan` as a type.
