# GCIEX-993 Ticket Dossier — [POP] CLEANUP - Hard Block Copy Test - Hulu

Researched 2026-08-27 via jira CLI (deept.atlassian.net) + both repos. Feeds the
`gciex-993-ooh-hard-block-cleanup` module of the hulu-architecture academy.

## Ticket facts (Jira, verified)

- **GCIEX-993** — Task, Open, P3. Assignee: Juan Felipe Montana Perdomo. Reporter: Allison Cornell.
  Labels: `POP`, `POP-experiment-cleanup`, `ready-for-cleanup`. Parent epic: **WEB-33050** "[POP] Hulu
  OOH Hard Block Copy Test".
- Description: "Cleanup or productionalize [WEB-33051]". AC: (1) Remove all references to experiment in
  code — template repo and api repo. (2) Copy on the OOH Hard Block Screen for Hulu returned to the
  **control copy** for all users. Control cypher keys listed in ticket:
  `ooh_hard_block_headline` ("This TV doesn't seem to be part of the Hulu Household for this account"),
  `ooh_hard_block_subcopy` ("If this TV isn't part of the account Household, create your own account to
  continue streaming."), `ooh_continue_cta` (CONTINUE), `ooh_hard_block_subcopy_2` ("Need more options?
  Try these instead."), `ooh_update_household_cta` (UPDATE HOUSEHOLD), `ooh_travel_mode_cta`
  (I'M AWAY FROM HOME).
- **WEB-33051** (experiment ticket, Done): copy test isolating headline vs CTA impact on conversion,
  based on D+ OOH tone tests (aggressive-passive variant: +8.72% initial / +8.35% follow-up total CYOS
  CVR; aggressive-medium: +6.62%). Scope: Global, **BBD devices**, Hulu app. Dev notes: new/split hulu
  cyphers (`ooh_hard_block_headline_create_account`, hulu tenant on `ooh_continue_cta`, hulu split of
  subcopy_3 wording, `ooh_get_started_cta`).
- WEB-33051 comments (dates 2025): (a) 2025-07-18 "Waiting on Spearmint integration with Flex so that we
  can run Hulu experiments... Hulu experiments are set up in Spearmint rather than WeaponX and the Flex
  team is working on adding that support because of Hulu ACP" — **this experiment motivated the
  Spearmint→Flex middleware**; (b) 2025-08-26 dev work complete; blocker: "unable to get the spearmint
  experiment assignments from the Hulu BBD client to Flex"; (c) "Limiting the experiment to only BBD
  instead of LRD."
- GCIEX-993 has zero comments.

## Decision ambiguity

Title says "Cleanup **or productionalize**"; AC #2 mandates control copy for all users ⇒ reads as
**cleanup to control**. Pre-flight (per experiment-preflight checklist): check Spearmint PROD status +
results (spearmint.prod.hulu.com) and confirm with reporter if results contradict AC. `ready-for-cleanup`
label supports cleanup.

## Code map — growth-life-client-api (flex)

- Screen: `deviceOutOfHousehold` — **status `migrating`** in `src/platform/migrationConfig.ts:426`
  (change-both duty; legacy files list includes the experiments service).
- Feature ID: **`POP-Hulu-OOH-Hard-Block-Copy-Test`** — raw string, NO `sprmnt-`/`wpnx-` prefix,
  **NOT in `src/lib/experiments/registry.ts` or `variants.ts`** (deviation from EXPERIMENTATION.md
  conventions; template-config-driven only).
- References:
  - `src/domain/screen/account/deviceOutOfHousehold/experiments/deviceOutOfHouseholdService.ts:44-45` —
    first entry of `hardBlockExperimentFeatureIds` (no TODO comment on it, unlike siblings).
  - `src/domain/screen/account/deviceOutOfHousehold/experiments/deviceOutOfHouseholdService.test.ts` —
    doc table "Hard Block Copy Test Hulu" (~:95-101) + per-variant tests (~:1566-1720, e.g. :1581
    variant_id 'aggressive-passive-tone-hulu', :1650 'soft-tone-hulu', :1687 'create-account-hulu').
  - `src/__fixtures__/templates/configuration/flex-device-out-of-household/device-out-of-household.json:5`
    (experimentFeatureIds) + variant template entries (:37-56) + dataKeys (:845+).
  - `src/lib/datadog/featureFlagSpanTags.test.ts:177-178` — uses the feature id as a tag example.
  - `src/platform/migration-tracking/deviceOutOfHousehold.json:49` — parity fixture lists the id.
  - No platform-assembly source reference (config-driven); no cgi-web reference (BBD device clients, not web).
- Transport (verified in service `deviceOutOfHouseholdService.ts:1210-1240`):
  `flexContext.experimentation` prioritized ("Prioritize WX experimentation data over query param;
  experimentData will be deprecated") — for Hulu this is the **Spearmint header decoded by the
  middleware**; comment "Hulu clients pass in experienceId, D+ needs it to be fetched from upstream"
  (Hulu skips Jafar; testPersona = {}).
- Variant filtering: `filterExperimentsByExperienceId('HARD'|'SOFT', experimentation)` via
  `experienceIdToFeatureIdMap`; holdout interplay `isUserInPopHoldoutGroup` →
  `updateControlVariantForHoldoutGroup` (service :1250-1262).
- Route: `GET /screens/v1/account/device-out-of-household` (`src/routes/screens/v1/account/deviceOutOfHousehold.ts:24,48-51`)
  — query params `experienceId`, `experimentData` (deprecated), `onBack`, `screenType`.
- HITS pageId for hard block: `hh_hard_block` (test :1562).

## Experiment variants (exact, from test doc table + config)

Experiment = control + 4 variants (hard block only):

| variant_id | dataKey | Changes |
|---|---|---|
| `aggressive-passive-tone-hulu` | `aggressivePassiveToneHulu` | headerText→`ooh_hard_block_headline_create_account`, subheaderText→`ooh_hard_block_subcopy_var` |
| `aggressive-medium-tone-hulu` | `aggressiveMediumToneHulu` | same header + subcopy_var + createAccountButton→`ooh_see_plans_cta` |
| `soft-tone-hulu` | `softToneHulu` | subheaderText→`ooh_hard_block_subcopy_var_2` only |
| `create-account-hulu` | `passiveAggressiveCreateAccountHulu` | createAccountButton→`ooh_create_account_cta` |

Rendered variant copy (from hulu cypher fixture, test assertions): header "Create an account to continue
streaming", subheader "This TV doesn't seem to be part of the Hulu Household for this account."

**NOT in scope (sibling experiment, same config file):** `POP-Hulu-CYOS-Emphasized-Soft-Block` with
variants `create-account-primary-hulu`/`continue-primary-hulu` (softBlock dataKeys
`createAccountPrimaryHulu`/`continuePrimaryHulu`) — different cleanup ticket.

## Code map — growth-life-client-templates

- `templates/configuration/flex-device-out-of-household/device-out-of-household.json` — the REAL config
  (fixtures mirror it): line 5 experimentFeatureIds entry; 4 variant template entries; 4 dataKeys
  (`aggressivePassiveToneHulu`, `aggressiveMediumToneHulu`, `softToneHulu`,
  `passiveAggressiveCreateAccountHulu`).
- Grep for the feature id in templates repo hits ONLY this file.

## Cypher notes

Variant keys (candidates for retirement, but check cross-usage first — `ooh_create_account_cta` and
`ooh_hard_block_headline_create_account` are used by OTHER experiments'/screens' configs; deleting
dictionary content is a Cypher-service operation, not repo code): `ooh_hard_block_headline_create_account`,
`ooh_hard_block_subcopy_var`, `ooh_hard_block_subcopy_var_2`, `ooh_see_plans_cta`, `ooh_create_account_cta`.
Control keys stay untouched (already the default path).

## Open questions / pre-flight

1. Spearmint PROD status + results for POP-Hulu-OOH-Hard-Block-Copy-Test (dashboard) — confirm cleanup
   vs productionalize with Allison Cornell if a variant won.
2. Whether variant cypher keys should also be retired from the dictionary (owner: Cypher/copy team;
   check cross-usage — `create-account` keys are shared with the soft-block sibling).
3. Ticket dates: WEB-33051 activity is 2025-07/08 — experiment has been running ~1 year.
