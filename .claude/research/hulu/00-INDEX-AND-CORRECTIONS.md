# Hulu Architecture Research — Index & Corrections

Research date: 2026-08-27. Sources: `growth-life-client-api` (flex) and `cgi-web` repos, explored by two
deep-research agents plus a manual verification pass by the main session. Feeds the
`hulu-architecture` academy in se-hub.

## Files

| File | Contents |
|---|---|
| `01-flex-hulu-dossier.md` | Everything Hulu-specific in growth-life-client-api: partner detection, hulu screens/routes, SKUs, HITS, feature flags, Spearmint/WeaponX middleware, templates, cypher, backends |
| `02-cgi-web-hulu-dossier.md` | Everything Hulu-specific in cgi-web: monorepo map, apps/commerce/hulu anatomy, flex integration, SUF, experimentation, flags, analytics, auth, theming, deployment |

## Verification pass results (main session, spot-checked against live code)

All CONFIRMED by direct read:

- `isPartnerHulu()` at `src/domain/common/util.ts:205` (flex)
- 5 `sprmnt-GREAT-*` experiment constants in `src/lib/experiments/registry.ts:432,441,479,489,721`
- Spearmint treatments verified in `variants.ts`: `AddonCohortRetentionTreatments ['control','bypass']` (:333),
  `SwitchBillingTreatments ['control','cancel-anytime']` (:341), `PlanSelectCardOrderTreatments
  ['control','duo-first','duo-first-hulu-last','no-hulu']` (:370-375), `DuoUpsellStandaloneBillingTreatments
  ['control','brand-focused','content-focused']` (:383+), `CancelSaveHeaderTreatments ['control','loyalty','urgency',...]`
  (:542+, cleanup ticket GCIEX-10029)
- `HuludaysBackground = 'wpnx-ips-huludays-background'` registry.ts:271, treatments `['control','treatment']` variants.ts:171
- Experiment headers `x-bamtech-spearmint-assignments` / `x-bamtech-weaponx-assignments` in `StandardHeaders.ts:122-123`
- Middleware fallback order (WeaponX preferred, Spearmint fallback) `src/middlewares/experimentation.ts:76-100`
- Spearmint wire format `{ [version]: [{e,t,n:"featureId--variantId"}] }` + brace-trim workaround —
  `src/lib/experiments/treatment.ts:18-73`
- Hulu success redirect `'mlp-welcome'` vs `'welcome-back'` — `successService.ts:1856`,
  `successAssembly.ts:391,1369`
- HITS `FLOW_NAMES` in flex: `suf_web_default | suf_web_hisuf | suf_web_redeem | hi_switch | ...`
  (`src/elements/v1/types/metricsData/hitsData.ts:72-79`) — **no `suf_web_one_hulu` in flex**

## CORRECTIONS to agent dossiers

1. **cgi-web agent MISSED the client-side Spearmint infrastructure.** Its §5 claims experiment resolution is
   server-side only and lists Mystique fallback flags as "what actually executes for Hulu". Reality (verified
   by main session):
   - `packages/cgi/data-interface-hulu/src/experimentation/helpers/parse-spearmint-experiments.ts` — reads the
     **`_hulu_assignments` cookie** (base64 JSON `{v1:[{e,t,n:"featureId--variantId"}]}`), same payload format
     and same trailing-garbage brace-trim workaround as flex's `decodeSpearmintAssignments`.
   - `packages/cgi/data-interface-hulu/src/experimentation/experimentation-data-interface.ts` — exposes it as
     `dataInterface.getExperimentAssignments()`.
   - `packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-experiment.ts` — generic hook:
     fetch assignments → `processVariant` → sets Datadog RUM global context property per featureId.
   - `packages/cgi/commerce-base/src/common/hooks/experiments/use-spearmint-copy-overrides.ts` — copy
     experiments via dictionary-key convention `{originalKey}__exp__{experimentName}__{variantId}`, prefix
     `sprmnt-great-copy-`, module-level assignment cache.
   - `packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx:83-94` —
     merges WeaponX + Spearmint copy overrides; comment: "For Hulu: WeaponX overrides will be empty (SDK
     disabled), Spearmint overrides active. For Disney+/ESPN: Spearmint overrides will be empty (no cookie),
     WeaponX overrides active."
   - `packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx` also extracts spearmint experiments
     for RUM tagging.
   - `packages/cgi/commerce-base/src/profiles/profiles-loading-redirects/hooks/use-experiment-assignments-query.tsx`
     consumes `getExperimentAssignments` too.
2. **`suf_web_one_hulu` resolution.** Absent from flex; defined client-side as a valid
   `HitsSubscriptionFlowName` (`packages/instrumentation/src/hits/types/account.ts:229-240`), and arrives via
   the `hitsFlowName` URL query param (`use-commerce-query-params.ts:72`, fallback `suf_web_default` in
   `use-billing-hits-payloads.ts`). The literal `suf_web_one_hulu` value is injected by out-of-repo entry
   links (hulu.com surfaces / campaigns). ASSUMPTION on exact injector; observed live in Datadog RUM
   (GREAT-1150 research: ~749 events/7d, decaying).
3. **Who sends `x-bamtech-spearmint-assignments` to flex**: no cgi-web source sets that header. Payload format
   identity with the `_hulu_assignments` cookie + `credentials: 'include'` on every flex fetch ⇒ working
   theory: Hulu Edge translates cookie → header server-side. ASSUMPTION — not verifiable in these two repos.
4. **Welcome-back**: route verifiably absent for Hulu (`apps/commerce/hulu/pages` has no welcome-back; D+
   and ESPN both have it). "Redirects to standard SUF" behavior is product knowledge (GREAT-1150), not found
   as a redirect rule in cgi-web.
5. **espn-academy divergences module** says "Hulu uses Spearmint instead [of WeaponX]" — correct, and now
   fully mechanized by correction #1 + flex dossier §6.
