import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const experimentChainDiagram = String.raw`flowchart TD
  SP["Spearmint assigns Hulu BBD user<br/>POP-Hulu-OOH-Hard-Block-Copy-Test"] --> D["Hulu BBD (TV device) client"]
  D -->|"spearmint assignments +<br/>?experienceId=HARD query param"| E["Edge → Flex"]
  E --> M["experimentation middleware<br/>decodes x-bamtech-spearmint-assignments<br/>→ flexContext.experimentation (WeaponX shape)"]
  M --> S["buildDeviceOutOfHouseholdScreen<br/>'Hulu clients pass in experienceId,<br/>D+ needs it fetched from upstream' (Jafar skipped)"]
  S --> H{"isUserInPopHoldoutGroup?"}
  H -->|yes| HO["updateControlVariantForHoldoutGroup"]
  H -->|no| F["filterExperimentsByExperienceId('HARD')<br/>keeps only hardBlockExperimentFeatureIds"]
  F --> T["getOutOfHouseholdTemplateConfig →<br/>getTemplateConfiguration matches variant_id<br/>in templates map"]
  T --> K["dataKey selected, e.g.<br/>aggressivePassiveToneHulu"]
  K --> C["variant cyphers merged over default →<br/>hard block screen JSON (pageId hh_hard_block)"]`;

const cleanupFlowDiagram = String.raw`flowchart TD
  A["Start GCIEX-993"] --> B["PRE-FLIGHT: Spearmint PROD dashboard<br/>status + results for the experiment"]
  B --> C{"Results say a<br/>variant won?"}
  C -->|"yes — conflicts with AC"| D["STOP: confirm with reporter<br/>(Allison Cornell) — AC says control"]
  C -->|"no / terminated"| E["CLEANUP to control"]
  E --> F["templates repo:<br/>remove feature id + 4 variant entries + 4 dataKeys"]
  E --> G["flex repo fixtures:<br/>mirror the same JSON removal"]
  E --> H["flex code: remove id from<br/>hardBlockExperimentFeatureIds"]
  E --> I["tests: delete 4+1 variant cases +<br/>doc-table rows; update datadog tag example"]
  F --> J["Verify: control copy for forced-variant curls,<br/>sibling soft-block experiment untouched,<br/>suites green, typeguards/swagger unchanged"]
  G --> J
  H --> J
  I --> J`;

const uiDiagram = String.raw`flowchart TD
  subgraph HB["OOH Hard Block screen (TV / BBD) — CONTROL"]
    H1["headline: ooh_hard_block_headline<br/>'This TV doesn't seem to be part of the<br/>Hulu Household for this account'"]
    H2["subcopy: ooh_hard_block_subcopy<br/>'If this TV isn't part of the account Household,<br/>create your own account to continue streaming.'"]
    H3["primary CTA: ooh_continue_cta 'CONTINUE'"]
    H4["subcopy 2: ooh_hard_block_subcopy_2<br/>'Need more options? Try these instead.'"]
    H5["ooh_update_household_cta 'UPDATE HOUSEHOLD'"]
    H6["ooh_travel_mode_cta 'I'M AWAY FROM HOME'"]
  end
  V["Variants only swap cypher keys via dataKey overlays:<br/>headline → ooh_hard_block_headline_create_account<br/>subcopy → ooh_hard_block_subcopy_var / _var_2<br/>CTA → ooh_see_plans_cta / ooh_create_account_cta"] -.-> HB`;

export const toc: TocItem[] = [
  { id: "the-ticket", title: "The Ticket: What GCIEX-993 Asks", level: 2 },
  { id: "the-experiment-story", title: "The Experiment Story (WEB-33051)", level: 2 },
  { id: "the-ui", title: "The UI: OOH Hard Block Screen", level: 2 },
  { id: "how-it-works-in-code", title: "How the Experiment Works in Code", level: 2 },
  { id: "variant-matrix", title: "The Variant Matrix", level: 2 },
  { id: "touchpoint-map", title: "The Touchpoint Map (Both Repos)", level: 2 },
  { id: "cleanup-plan", title: "The Cleanup Plan, Step by Step", level: 2 },
  { id: "qa-plan", title: "QA & Evidence Plan", level: 2 },
  { id: "traps", title: "Traps Specific to This Ticket", level: 2 },
  { id: "interview-framing", title: "Explaining It to Your Reviewer", level: 2 },
  { id: "challenge", title: "Challenge: Pre-Flight Dry Run", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Gciex993OohHardBlockCleanup() {
  return (
    <div className="article-content">
      <p>
        This module is the full preparation for{" "}
        <strong>GCIEX-993 — &quot;[POP] CLEANUP - Hard Block Copy Test -
        Hulu&quot;</strong>: the requirement, the experiment&apos;s history
        (which happens to be the origin story of the Spearmint→Flex
        integration you learned in the experimentation module), the UI, the
        exact code touchpoints in both repos, and a step-by-step cleanup +
        QA plan. Everything here is verified against Jira and live code
        (2026-08-27); the few unverified points are tagged.
      </p>

      <h2 id="the-ticket">The Ticket: What GCIEX-993 Asks</h2>
      <ArticleTable caption="Ticket card. The labels tell you the workflow: POP-experiment-cleanup + ready-for-cleanup.">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Key / Type / Status</td>
              <td>GCIEX-993 · Task · Open · P3</td>
            </tr>
            <tr>
              <td>Assignee / Reporter</td>
              <td>Juan Felipe Montana Perdomo / Allison Cornell</td>
            </tr>
            <tr>
              <td>Labels</td>
              <td>
                <code>POP</code>, <code>POP-experiment-cleanup</code>,{" "}
                <code>ready-for-cleanup</code>
              </td>
            </tr>
            <tr>
              <td>Parent epic</td>
              <td>WEB-33050 — [POP] Hulu OOH Hard Block Copy Test</td>
            </tr>
            <tr>
              <td>Summary of ask</td>
              <td>
                &quot;Cleanup or productionalize [WEB-33051]&quot; — with AC
                that mandate <strong>control copy for all users</strong> and
                removal of all experiment references in{" "}
                <strong>template repo and api repo</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>The one decision to lock before coding:</strong> the title
        says &quot;cleanup <em>or productionalize</em>&quot;, but AC #2
        explicitly returns the screen to control copy for all users — which is
        the definition of <em>cleanup</em> (per the repo&apos;s
        EXPERIMENTATION.md: winner-is-control ⇒ cleanup, not
        productionalize). The <code>ready-for-cleanup</code> label agrees.
        Pre-flight duty anyway: check the experiment&apos;s{" "}
        <strong>PROD status and results in Spearmint</strong>{" "}
        (spearmint.prod.hulu.com — links should be in the experiment&apos;s
        docs; the feature id is not in Flex&apos;s registry, see below) and if
        results show a winning variant, confirm with Allison before deleting
        anything. <em>[Spearmint live status: unverified from code —
        dashboard check required.]</em>
      </p>

      <h2 id="the-experiment-story">The Experiment Story (WEB-33051)</h2>
      <p>
        WEB-33051 (Done) ran a copy test on the Hulu{" "}
        <strong>OOH (out-of-household) Hard Block</strong> screen — the POP
        (paid-sharing) blocker a borrower sees on a TV that is not part of the
        account&apos;s Household. Design rationale from the ticket: the D+
        OOH tone tests showed the &quot;Aggressive-Passive&quot; variant
        lifted total CYOS CVR <strong>+8.72%</strong> (initial) /{" "}
        <strong>+8.35%</strong> (follow-up), and &quot;Aggressive-Medium&quot;
        +6.62% — but those variants changed several elements at once. This
        Hulu test <em>isolates</em> headline vs CTA copy to learn which
        element drives conversion. Scope: <strong>Global, BBD devices, Hulu
        app</strong>.
      </p>
      <p>
        Two pieces of history worth knowing because they explain the code
        shape:
      </p>
      <ul>
        <li>
          <strong>It is the reason Spearmint support exists in Flex.</strong>{" "}
          Comment (2025-07-18): <em>&quot;Waiting on Spearmint integration
          with Flex so that we can run Hulu experiments... Hulu experiments
          are set up in Spearmint rather than WeaponX and the Flex team is
          working on adding that support... because of Hulu ACP.&quot;</em>{" "}
          The middleware you studied in the Spearmint module was built for
          this experiment family.
        </li>
        <li>
          <strong>It was scoped down to BBD only.</strong> Comments
          (2025-08-26): dev work done, but{" "}
          <em>&quot;unable to get the spearmint experiment assignments from
          the Hulu BBD client to Flex&quot;</em> was a blocker, and the
          resolution was <em>&quot;Limiting the experiment to only BBD
          instead of LRD.&quot;</em>{" "}
          <em>[Ticket activity is dated 2025-07/08 — the experiment has been
          live for roughly a year before this cleanup.]</em>
        </li>
      </ul>

      <h2 id="the-ui">The UI: OOH Hard Block Screen</h2>
      <MermaidDiagram
        chart={uiDiagram}
        title="Hard Block Screen Anatomy (Control) and What Variants Touch"
        caption="A TV-rendered Flex screen. The experiment never changes structure — only which cypher keys fill the header, subcopy, and primary CTA."
        minHeight={520}
      />
      <p>
        The AC lists the control copy verbatim — these six keys are your
        &quot;expected end state for all users&quot;:{" "}
        <code>ooh_hard_block_headline</code>,{" "}
        <code>ooh_hard_block_subcopy</code>, <code>ooh_continue_cta</code>{" "}
        (CONTINUE), <code>ooh_hard_block_subcopy_2</code>,{" "}
        <code>ooh_update_household_cta</code>,{" "}
        <code>ooh_travel_mode_cta</code>. Since control is already the
        config&apos;s <code>default</code> dataKey, restoring it means{" "}
        <em>removing the variant overlays</em>, not writing new copy. HITS
        page id for this screen: <code>hh_hard_block</code> — useful when you
        look at dashboards.
      </p>

      <h2 id="how-it-works-in-code">How the Experiment Works in Code</h2>
      <MermaidDiagram
        chart={experimentChainDiagram}
        title="Assignment → Render Chain for This Experiment"
        caption="Every box is verified in code. Note the two Hulu-specific hops: spearmint header decoding in middleware, and the experienceId query param that lets Hulu clients skip Jafar."
        minHeight={640}
      />
      <p>Three code facts define this experiment&apos;s shape:</p>
      <CodeBlock
        code={`// 1) It is a raw feature-id string — NOT in registry.ts/variants.ts
//    (deviation from EXPERIMENTATION.md; template-config-driven only, no sprmnt-/wpnx- prefix)
// src/domain/screen/account/deviceOutOfHousehold/experiments/deviceOutOfHouseholdService.ts:44-45
export const hardBlockExperimentFeatureIds = [
  'POP-Hulu-OOH-Hard-Block-Copy-Test',
  'wpnx-pop-interstitial-artwork-and-layout',
  // ... 12 more, each with its own cleanup TODO
];

// 2) Transport priority — the spearmint-normalized context object wins
// deviceOutOfHouseholdService.ts:~1213
// "Prioritize WX experimentation data over query param
//  experimentData will be deprecated in favor of the above"
if (flexContext.experimentation) {
  experimentation = flexContext.experimentation;
} else if (experimentData) { /* deprecated query-param path */ }

// 3) Hulu skips Jafar — the client sends experienceId directly
// deviceOutOfHouseholdService.ts:~1224
// "Hulu clients pass in experienceId, D+ needs it to be fetched from upstream"
if (experienceId) {
  experienceIdForRoadblock = experienceId;
  testPersonaForRoadblock = {};
} else { /* getExperienceIdAndPersona → Jafar */ }`}
        lang="typescript"
        filename="the three defining facts (flex)"
      />
      <p>
        After that, <code>filterExperimentsByExperienceId(&apos;HARD&apos;)</code>{" "}
        keeps only hard-block experiment ids (with the POP-holdout interplay:{" "}
        <code>isUserInPopHoldoutGroup</code> →{" "}
        <code>updateControlVariantForHoldoutGroup</code> instead), and{" "}
        <code>getTemplateConfiguration</code> matches the user&apos;s{" "}
        <code>variant_id</code> against the config&apos;s{" "}
        <code>templates</code> map. There is <strong>no detection helper, no
        FeatureSet boolean, no service branch</strong> for this experiment —
        it is 100% template-config: the entire behavior difference is
        &quot;which dataKey&apos;s cyphers merge over default&quot;.
      </p>

      <h2 id="variant-matrix">The Variant Matrix</h2>
      <ArticleTable
        caption="Exact variant set for POP-Hulu-OOH-Hard-Block-Copy-Test (from the test doc-table + templates config). The soft-block rows at the bottom are the SIBLING experiment — do not touch."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>variant_id</th>
              <th>dataKey</th>
              <th>Cypher overrides</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>control</code></td>
              <td><code>default</code></td>
              <td>— (the six AC keys)</td>
            </tr>
            <tr>
              <td><code>aggressive-passive-tone-hulu</code></td>
              <td><code>aggressivePassiveToneHulu</code></td>
              <td>
                header→<code>ooh_hard_block_headline_create_account</code>{" "}
                (&quot;Create an account to continue streaming&quot;),
                subheader→<code>ooh_hard_block_subcopy_var</code>
              </td>
            </tr>
            <tr>
              <td><code>aggressive-medium-tone-hulu</code></td>
              <td><code>aggressiveMediumToneHulu</code></td>
              <td>
                same header + subcopy_var, plus CTA→
                <code>ooh_see_plans_cta</code>
              </td>
            </tr>
            <tr>
              <td><code>soft-tone-hulu</code></td>
              <td><code>softToneHulu</code></td>
              <td>
                subheader→<code>ooh_hard_block_subcopy_var_2</code> only
              </td>
            </tr>
            <tr>
              <td><code>create-account-hulu</code></td>
              <td><code>passiveAggressiveCreateAccountHulu</code></td>
              <td>
                CTA→<code>ooh_create_account_cta</code>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <strong>⚠ SIBLING — POP-Hulu-CYOS-Emphasized-Soft-Block
                (separate ticket):</strong>{" "}
                <code>create-account-primary-hulu</code> /{" "}
                <code>continue-primary-hulu</code> →{" "}
                <code>createAccountPrimaryHulu</code> /{" "}
                <code>continuePrimaryHulu</code> (softBlock keys)
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="touchpoint-map">The Touchpoint Map (Both Repos)</h2>
      <ArticleTable
        caption="Every reference to the experiment, verified by grep on 2026-08-27. This is the complete removal surface."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Repo</th>
              <th>File</th>
              <th>What to do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>templates</td>
              <td>
                <code>templates/configuration/flex-device-out-of-household/device-out-of-household.json</code>
              </td>
              <td>
                Remove <code>&quot;POP-Hulu-OOH-Hard-Block-Copy-Test&quot;</code>{" "}
                from <code>experimentFeatureIds</code> (:5); remove the 4
                variant entries from <code>templates</code>; remove the 4
                dataKeys from <code>data</code>
              </td>
            </tr>
            <tr>
              <td>flex</td>
              <td>
                <code>src/__fixtures__/templates/configuration/flex-device-out-of-household/device-out-of-household.json</code>
              </td>
              <td>Mirror the exact same JSON removal (fixtures = local copy)</td>
            </tr>
            <tr>
              <td>flex</td>
              <td>
                <code>.../deviceOutOfHousehold/experiments/deviceOutOfHouseholdService.ts:45</code>
              </td>
              <td>
                Remove the id from <code>hardBlockExperimentFeatureIds</code>
              </td>
            </tr>
            <tr>
              <td>flex</td>
              <td>
                <code>.../experiments/deviceOutOfHouseholdService.test.ts</code>
              </td>
              <td>
                Delete the 4 variant <code>it</code> blocks (~:1566-1720) +
                the control-variant case tied to the experiment + the
                &quot;Hard Block Copy Test Hulu&quot; doc-table rows (~:95-101)
              </td>
            </tr>
            <tr>
              <td>flex</td>
              <td><code>src/lib/datadog/featureFlagSpanTags.test.ts:177-178</code></td>
              <td>
                Swap the example feature-id string for a live one (it is only
                a tag-format example — but AC says &quot;all
                references&quot;)
              </td>
            </tr>
            <tr>
              <td>flex</td>
              <td>
                <code>src/platform/migration-tracking/deviceOutOfHousehold.json:49</code>
              </td>
              <td>
                Parity fixture lists the id — regenerate/update per the
                migration-tracking process (screen is <code>migrating</code>)
              </td>
            </tr>
            <tr>
              <td>—</td>
              <td>Registry/variants/FeatureSet/metricsDataBuilder</td>
              <td>
                <strong>Nothing to do</strong> — the experiment was never
                registered, has no FeatureSet boolean, no service branch, no
                metrics fields (verified by grep)
              </td>
            </tr>
            <tr>
              <td>cgi-web</td>
              <td>—</td>
              <td>
                <strong>Not involved</strong> — BBD device clients render this
                screen, not the web app
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Cypher dictionary note: the variant keys
        (<code>ooh_hard_block_subcopy_var</code>,{" "}
        <code>ooh_see_plans_cta</code>...) live in the Cypher service, not in
        either repo. Do <strong>not</strong> assume they can be retired:{" "}
        <code>ooh_create_account_cta</code> is verifiably shared with the
        soft-block sibling&apos;s dataKeys. Key retirement is a separate,
        cross-usage-checked follow-up at most.
      </p>

      <h2 id="cleanup-plan">The Cleanup Plan, Step by Step</h2>
      <MermaidDiagram
        chart={cleanupFlowDiagram}
        title="GCIEX-993 Execution Flow"
        caption="Pre-flight gate first; then a four-front removal (templates, fixtures, code, tests) converging on one verification pass."
        minHeight={560}
      />
      <p>
        This is the repo&apos;s EXPERIMENTATION.md &quot;Cleanup&quot;
        playbook, specialized — steps that do not apply here (registry,
        variants, FeatureSet, metricsDataBuilder, experiments-dir deletion)
        drop out because this experiment is config-only:
      </p>
      <CodeBlock
        code={`# 0. Pre-flight (before any edit)
#    - Spearmint PROD status/results; confirm cleanup-vs-productionalize if needed
#    - grep both repos for every reference:
grep -rn "POP-Hulu-OOH-Hard-Block-Copy-Test" src/                      # flex
grep -rn "POP-Hulu-OOH-Hard-Block-Copy-Test" ../growth-life-client-templates/
grep -rn "aggressive-passive-tone-hulu\\|aggressive-medium-tone-hulu\\|soft-tone-hulu\\|create-account-hulu\\b" src/

# 1. templates repo — remove feature id + 4 template entries + 4 dataKeys
# 2. flex fixtures — mirror the same removal (keeps local dev + HULU_ENV=ci tests honest)
# 3. flex code — drop the id from hardBlockExperimentFeatureIds (experiments/deviceOutOfHouseholdService.ts:45)
# 4. flex tests — delete variant cases + doc-table rows; fix datadog tag example
# 5. verify no orphans: re-run the greps from step 0 → zero hits
#    (careful: 'create-account-hulu' must not catch 'create-account-primary-hulu' — sibling!)
# 6. targeted validation:
HULU_ENV=ci npx jest src/domain/screen/account/deviceOutOfHousehold --silent
npx tsc --noEmit && npx eslint src/domain/screen/account/deviceOutOfHousehold
# typeguards/swagger: NOT needed (no interface/route changes) — state that in the PR`}
        lang="bash"
        filename="cleanup runbook"
      />
      <p>
        Both repos ship as <strong>paired PRs</strong> (flex PR template has a
        Template PR link field). Sequencing: config removal is
        backwards-compatible in either order — with the id still in{" "}
        <code>hardBlockExperimentFeatureIds</code> but no variant entries in
        config, <code>getTemplateConfiguration</code> simply falls back to{" "}
        <code>templates.control</code>; with entries but no id in the code
        list, the middleware-filtered experiment never matches. Ship
        templates-first or together; note the order in the PR.
      </p>

      <h2 id="qa-plan">QA &amp; Evidence Plan</h2>
      <CodeBlock
        code={`# BEFORE (on main): force a variant — expect variant copy
SPRMNT='{"v1":[{"e":1,"t":2,"n":"POP-Hulu-OOH-Hard-Block-Copy-Test--aggressive-passive-tone-hulu"}]}'
curl 'http://localhost:3200/screens/v1/account/device-out-of-household?experienceId=HARD' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-account-id: <acct>' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: qa-993-before' \\
  -H "x-bamtech-spearmint-assignments: $(printf '%s' "$SPRMNT" | base64)"
# → header cypher = ooh_hard_block_headline_create_account

# AFTER (on branch): the SAME forced-variant curl — expect CONTROL copy
# → header cypher = ooh_hard_block_headline (assignment ignored, falls to control)

# REGRESSION 1: no-assignment control unchanged (before == after)
# REGRESSION 2: sibling soft-block experiment still works —
SPRMNT2='{"v1":[{"e":1,"t":2,"n":"POP-Hulu-CYOS-Emphasized-Soft-Block--create-account-primary-hulu"}]}'
#   ...?experienceId=SOFT with that header → primary CTA = ooh_create_account_cta (unchanged)
# REGRESSION 3: one D+ request (no partner-hulu, Jafar path) → hard block unchanged`}
        lang="bash"
        filename="before/after evidence matrix"
      />
      <p>
        That four-row matrix (forced-variant flip, control stability, sibling
        stability, D+ stability) is the whole story a reviewer needs — capture
        the curls per the house evidence pattern. Note the platform angle: the
        screen is <code>migrating</code>, but this experiment has{" "}
        <strong>no platform-assembly code reference</strong> (config-driven;
        only the migration-tracking parity JSON lists the id) — so
        &quot;change both engines&quot; reduces to updating that parity
        fixture, and you should say exactly that in the PR to preempt the
        review question.
      </p>

      <h2 id="traps">Traps Specific to This Ticket</h2>
      <ul>
        <li>
          <strong>The sibling experiment shares the config file.</strong>{" "}
          <code>POP-Hulu-CYOS-Emphasized-Soft-Block</code> lives in the same{" "}
          <code>experimentFeatureIds</code> array and its variant names are
          near-collisions (<code>create-account-hulu</code> vs{" "}
          <code>create-account-primary-hulu</code>). Greps and deletions must
          be word-boundary-precise.
        </li>
        <li>
          <strong>No registry entry to delete.</strong> If you follow
          EXPERIMENTATION.md mechanically you will hunt for registry/variants
          entries that do not exist — this experiment predates/bypasses that
          convention (raw feature-id string, config-only). Absence is
          correct, not an oversight to &quot;fix&quot;.
        </li>
        <li>
          <strong>Holdout logic stays.</strong>{" "}
          <code>isUserInPopHoldoutGroup</code>/<code>updateControlVariantForHoldoutGroup</code>{" "}
          serve the whole POP program — they reference no experiment id and
          are out of scope.
        </li>
        <li>
          <strong>Fixture-vs-real config drift.</strong> The flex fixture JSON
          and the templates-repo JSON are near-mirrors but not byte-identical
          (the real one has extra ids like{" "}
          <code>wpnx-POP-Switch-Merged-HB-CTAs</code>). Edit each on its own
          terms; do not copy one over the other.
        </li>
        <li>
          <strong>Bare <code>npx jest</code> trap applies doubly here</strong>:
          without <code>HULU_ENV=ci</code>, template configs come from staging
          S3 — your local config deletions would be invisible to the very
          tests that validate them.
        </li>
        <li>
          <strong>Do not delete dictionary keys.</strong> Cypher content is a
          service-side concern with cross-usage risk
          (<code>ooh_create_account_cta</code> is shared); at most file a
          follow-up.
        </li>
      </ul>

      <h2 id="interview-framing">Explaining It to Your Reviewer</h2>
      <InterviewPlaybook
        title={`"Walk me through your GCIEX-993 PR."`}
        intro={
          <>
            The PR description writes itself if you narrate cause → mechanism
            → proof. This is also the shape senior reviewers reward.
          </>
        }
        steps={[
          "Context in one line: year-old Hulu Spearmint copy test on the OOH hard block (BBD), ready-for-cleanup per AC — control copy for all users; Spearmint prod status checked (attach screenshot/link).",
          "Mechanism in one line: the experiment was 100% template-config (raw feature id, no registry/FeatureSet/service branch), so cleanup = config-entry removal in both repos + one array element + tests.",
          "Enumerate the removal surface from the touchpoint map — and explicitly name the two non-touchpoints reviewers will ask about: no registry/variants entries existed, and no platform-assembly code (only the parity-tracking JSON), despite the screen being 'migrating'.",
          "Prove behavior with the four-row evidence matrix: forced-variant now yields control; bare control unchanged; sibling soft-block experiment unchanged; D+ unchanged.",
          "Close with scope discipline: sibling experiment untouched (near-collision names called out), cypher dictionary keys left in place with the cross-usage rationale, typeguards/swagger not run because no types/routes changed.",
        ]}
      />

      <h2 id="challenge">Challenge: Pre-Flight Dry Run</h2>
      <InterviewChallenge
        title="Three curveballs before you type a line"
        scenario={
          <>
            You start GCIEX-993 and immediately hit three surprises:{" "}
            <strong>(a)</strong> the Spearmint prod dashboard shows the
            experiment still <em>Running</em> with traffic allocated;{" "}
            <strong>(b)</strong> your grep for{" "}
            <code>create-account-hulu</code> returns hits in dataKeys you
            were not planning to touch; <strong>(c)</strong> a teammate
            comments &quot;while you&apos;re in there, the{" "}
            <code>soft-tone-hulu</code> copy tested well — maybe keep
            it?&quot;
          </>
        }
        tasks={[
          "For (a): what do you do before editing code, and who do you contact with what specific question?",
          "For (b): explain what your grep actually caught and how you make the deletion precise.",
          "For (c): classify the teammate's suggestion in EXPERIMENTATION.md terms and state what it would change about the work — then say what you actually do.",
          "Write the one-sentence scope statement you would post on the ticket before starting.",
        ]}
        pitfalls={[
          "Deleting config for an experiment that is still allocating traffic — users in variants would silently fall to control mid-experiment (that IS the end state, but the experiment must be stopped in Spearmint first, and that's the owner's call).",
          "Word-boundary-blind greps catching create-account-primary-hulu (the sibling).",
          "Treating (c) as a small favor — keeping soft-tone copy is a productionalization, a different playbook with different AC, requiring the reporter's sign-off.",
          "Starting without posting scope — POP tickets have a dense sibling-experiment neighborhood.",
        ]}
        signal="A strong answer refuses to edit while the experiment is live, greps with exact-string discipline, and reroutes the scope-change request to the ticket owner instead of absorbing it."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a)</strong> Do not touch code. The AC assumes the
          experiment is concluded; a Running-with-traffic state contradicts
          the <code>ready-for-cleanup</code> label. Message Allison Cornell
          (reporter) with: &quot;Spearmint shows the experiment still
          Running/allocating — should it be stopped in Spearmint first, and do
          the results confirm control as the end state per the AC?&quot;
          Cleanup resumes when the dashboard shows terminated/stopped.
          (Remember the WeaponX lesson that likely transfers: staging entries
          linger forever; only PROD status means anything.{" "}
          <em>[Transfer to Spearmint = assumption.]</em>)
        </p>
        <p>
          <strong>(b)</strong> The substring <code>create-account-hulu</code>{" "}
          is contained in nothing else, but a loose pattern like{" "}
          <code>create-account.*hulu</code> or grepping{" "}
          <code>createAccount</code> catches the sibling&apos;s{" "}
          <code>create-account-primary-hulu</code> /{" "}
          <code>createAccountPrimaryHulu</code>. Fix: grep exact variant ids
          and exact dataKey names from the variant matrix, and diff-review
          every JSON hunk against the matrix before committing.
        </p>
        <p>
          <strong>(c)</strong> That is{" "}
          <strong>productionalization of a non-control variant</strong> — the
          other playbook: inline the winning variant&apos;s dataKey into{" "}
          <code>default</code>, different AC, different evidence. It
          contradicts the current AC (&quot;control for all users&quot;), so
          you do not decide it in a PR comment: point the teammate to the
          ticket, ask the reporter to either amend the AC or file a follow-up,
          and proceed with cleanup as written unless the AC changes.
        </p>
        <p>
          <strong>Scope statement:</strong> &quot;Cleaning up
          POP-Hulu-OOH-Hard-Block-Copy-Test to control per AC: removing the
          feature id + 4 hard-block variant entries/dataKeys from the OOH
          config in both repos, the id from{" "}
          <code>hardBlockExperimentFeatureIds</code>, and the variant tests;
          NOT touching the CYOS-Emphasized-Soft-Block sibling, holdout logic,
          or cypher dictionary content.&quot;
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          GCIEX-993 = cleanup-to-control of a year-old Hulu Spearmint copy
          test on the OOH hard block (BBD only) — the experiment that
          motivated the Spearmint→Flex integration itself.
        </li>
        <li>
          The experiment is 100% template-config: raw feature id (no
          registry/FeatureSet/service branch), 4 variants selecting dataKeys
          that overlay cypher keys.
        </li>
        <li>
          Removal surface = templates-repo config + flex fixture mirror + one
          array element + tests + a tag example + parity-tracking JSON.
          cgi-web: uninvolved.
        </li>
        <li>
          Sharp edges: sibling soft-block experiment in the same file with
          near-collision names; holdout logic out of scope; dictionary keys
          stay; <code>HULU_ENV=ci</code> or your config deletions are
          invisible to tests.
        </li>
        <li>
          Evidence = four-row matrix: forced-variant→control flip, control
          stability, sibling stability, D+ stability.
        </li>
        <li>
          Pre-flight gate: Spearmint PROD status/results + reporter
          confirmation resolves the &quot;cleanup or productionalize&quot;
          title ambiguity before any deletion.
        </li>
      </ul>
    </div>
  );
}
