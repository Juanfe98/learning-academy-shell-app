import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const ladderDiagram = String.raw`flowchart TD
  START["Made a change"]
  START --> UNIT["1. Targeted unit test<br/>(jest on the file)"]
  UNIT --> TYPES["2. Type-check<br/>(tsc --noEmit)"]
  TYPES --> LINT["3. Lint<br/>(eslint + stylelint)"]
  LINT --> COV["4. Coverage<br/>(100% enforced)"]
  COV --> E2E["5. Playwright E2E<br/>(if integration risk)"]
  E2E --> BUILD["6. Build<br/>(if config/bundling touched)"]`;

const testTypesDiagram = String.raw`flowchart LR
  CODE["your change"]
  CODE --> JEST["Jest + RTL<br/>unit/component"]
  CODE --> PW["Playwright<br/>E2E (integration mode)"]
  CODE --> VRT["Storybook + Sauce<br/>visual regression"]
  JEST --> COV["100% coverage gate"]`;

const turboMapDiagram = String.raw`flowchart TD
  ROOT["root package.json script"]
  ROOT --> TURBO["turbo <task> --filter=@solo/<pkg>"]
  TURBO --> CACHE{"inputs changed?"}
  CACHE -->|"no"| HIT["cache hit — replays instantly"]
  CACHE -->|"yes"| RUN["runs + caches"]`;

const prGateDiagram = String.raw`flowchart TD
  DONE["change complete"]
  DONE --> C1["coverage green (100%)"]
  C1 --> C2["type-check clean"]
  C2 --> C3["lint clean (incl. logical CSS, owner tags)"]
  C3 --> C4["other brands/regions unaffected"]
  C4 --> C5["dead flags/fixtures cleaned"]
  C5 --> C6["CODEOWNERS reviewers + branch ≤27 chars"]
  C6 --> PR["open PR"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "test-types", title: "The Kinds of Checks", level: 2 },
  { id: "unit", title: "Unit Tests (Jest)", level: 2 },
  { id: "e2e", title: "E2E Tests (Playwright)", level: 2 },
  { id: "coverage", title: "Coverage", level: 2 },
  { id: "lint-types", title: "Lint and Type-Check", level: 2 },
  { id: "build", title: "Build", level: 2 },
  { id: "turbo-note", title: "How Filters and Caching Affect Checks", level: 3 },
  { id: "ladder", title: "The Validation Ladder", level: 2 },
  { id: "pre-pr", title: "The Pre-PR Gate", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Choose the Right Checks", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RunningTestsAndChecks() {
  return (
    <div className="article-content">
      <p>
        This is the command runbook for validating a change — unit tests, E2E, coverage, lint,
        type-check, and build — plus the order to run them in and the gate to clear before opening a
        PR. Every command here is verified against the root <code>package.json</code>; running the
        wrong or non-existent script is a classic time-sink, so this module is deliberately a
        copy-paste reference. It pairs with the testing-standards module (which explains <em>how</em>{" "}
        tests are written); this one is about <em>running</em> them.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        100% coverage is enforced, type-check is separate from build, and Turbo caching can make a
        check look like it &quot;did nothing.&quot; Knowing the exact scripts and the right order —
        cheapest, most-targeted check first — is what keeps your feedback loop fast and your PRs
        green on the first CI run.
      </p>

      <h2 id="test-types">The Kinds of Checks</h2>
      <MermaidDiagram
        chart={testTypesDiagram}
        title="The check types"
        caption="Jest + RTL for units (gated at 100% coverage), Playwright for E2E (runs in integration/MSW mode), Storybook + Sauce Labs for visual regression. Plus lint, type-check, and build as static gates."
        minHeight={280}
      />

      <h2 id="unit">Unit Tests (Jest)</h2>
      <p>
        Commerce unit tests run per brand through Turbo (these map to the{" "}
        <code>coverage:jest</code> turbo task):
      </p>
      <CodeBlock
        lang="bash"
        filename="jest unit tests"
        code={`pnpm test:commerce:jest:disney       # turbo coverage:jest --filter=@solo/commerce-disney
pnpm test:commerce:jest:hulu
pnpm test:commerce:jest:espn
pnpm test:commerce:jest:report:hulu  # open the coverage report`}
      />
      <p>
        For a tight inner loop, run jest directly inside the package you&apos;re editing — each app
        (and commerce-base) has raw <code>test:jest</code>, <code>test:watch</code>, and{" "}
        <code>coverage:jest</code> scripts. Watch mode on a single file is the fastest feedback while
        writing a test:
      </p>
      <CodeBlock
        lang="bash"
        filename="tight inner loop (inside a package)"
        code={`# from packages/cgi/commerce-base (or a brand app)
pnpm test:watch                       # jest --watch
# or target one file
pnpm exec jest path/to/thing.test.tsx`}
      />

      <h2 id="e2e">E2E Tests (Playwright)</h2>
      <p>
        Playwright E2E runs per brand — a UI (headed) variant and a headless variant. These run in
        the MSW-mocked integration mode:
      </p>
      <CodeBlock
        lang="bash"
        filename="playwright e2e"
        code={`pnpm test:commerce:playwright:hulu            # PRODUCT=hulu playwright test --ui
pnpm test:commerce:playwright:headless:hulu   # headless
# disney / espn variants exist too, plus marketing equivalents:
pnpm test:marketing-unified:playwright:hulu`}
      />
      <p>
        Remember Playwright is driven from the <em>brand apps</em>, not commerce-base — commerce-base
        only ships the shared <code>playwright-utils</code> helpers. Browsers must have been installed
        via <code>pnpm run setup configure playwright</code>.
      </p>

      <h2 id="coverage">Coverage</h2>
      <p>
        The commerce-base coverage report (100% thresholds on branches/functions/lines/statements):
      </p>
      <CodeBlock
        lang="bash"
        filename="coverage"
        code={`pnpm test:commerce-base:coverage          # turbo test:coverage --filter=@solo/commerce-base
pnpm test:commerce-base:coverage:report   # open the HTML report`}
      />
      <p>
        The threshold is enforced (disabled only when CI shards). An uncovered line fails the run —
        so if your change added a branch (a region check, an experiment treatment, an error path),
        you need a test that exercises it. Use the coverage report to find the exact uncovered lines.
      </p>

      <h2 id="lint-types">Lint and Type-Check</h2>
      <p>
        Lint (ESLint + stylelint) and type-check (<code>tsc --noEmit</code>) are <strong>separate
        gates</strong> — a green build does not imply clean types, because type-check runs on its own:
      </p>
      <CodeBlock
        lang="bash"
        filename="lint + type-check"
        code={`# lint
pnpm lint                       # all @solo/* packages
pnpm lint:commerce:hulu         # one brand
pnpm lint:commerce-base

# type-check (tsc -p tsconfig.json --noEmit)
pnpm lint:type-check:all
pnpm lint:type-check:commerce:hulu
pnpm lint:type-check:commerce-base`}
      />
      <p>
        The lint config enforces repo conventions from earlier modules: logical CSS properties
        (RTL-friendly), the test owner-tag rule, and the ban on importing the singleton{" "}
        <code>queryClient</code> in tests. Per-app lint also has ESLint <code>--max-warnings</code>{" "}
        caps, so new warnings can fail lint even if nothing errored.
      </p>

      <h2 id="build">Build</h2>
      <CodeBlock
        lang="bash"
        filename="build"
        code={`pnpm build                    # turbo build (everything)
pnpm build:commerce:hulu      # one brand
pnpm build:commerce:disney
pnpm build:commerce:espn`}
      />
      <p>
        Run a build when your change touches integration, bundling, config, or deployment behavior —
        not for every small edit. For pure logic/UI changes, the targeted unit test + type-check is
        the faster and more relevant signal.
      </p>

      <h3 id="turbo-note">How Filters and Caching Affect Checks</h3>
      <MermaidDiagram
        chart={turboMapDiagram}
        title="Turbo filter + cache for checks"
        caption="Root scripts wrap turbo <task> --filter. If inputs are unchanged, Turbo replays a cache hit instantly — a check that finishes suspiciously fast may not have re-run. Change an input or clear the cache to force it."
        minHeight={300}
      />
      <p>
        <code>--filter=@solo/&lt;pkg&gt;</code> scopes a check to one package. And because Turbo
        caches, a lint/test/build that returns instantly with a cache hit didn&apos;t actually
        re-run — expected when nothing changed, but worth knowing when you&apos;re verifying a fix
        &quot;took.&quot;
      </p>

      <h2 id="ladder">The Validation Ladder</h2>
      <p>
        Run the <strong>cheapest, most-targeted check first</strong> and climb only as far as the
        change&apos;s risk demands:
      </p>
      <MermaidDiagram
        chart={ladderDiagram}
        title="The validation ladder"
        caption="Targeted unit test → type-check → lint → coverage → E2E (if integration risk) → build (if config/bundling). Don't jump straight to a full build for a one-line logic fix."
        minHeight={440}
      />
      <ArticleTable
        caption="Which rung for which change."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Change</th>
              <th>Minimum checks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>One-line logic fix in a component</td>
              <td>Targeted jest + type-check</td>
            </tr>
            <tr>
              <td>New branch (region/experiment/error path)</td>
              <td>Jest with coverage (prove the branch is hit)</td>
            </tr>
            <tr>
              <td>Public type / interface change</td>
              <td>Type-check across affected packages</td>
            </tr>
            <tr>
              <td>Multi-step flow / navigation</td>
              <td>Jest + Playwright E2E</td>
            </tr>
            <tr>
              <td>Config / bundling / next.config</td>
              <td>Build (+ the above)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="pre-pr">The Pre-PR Gate</h2>
      <MermaidDiagram
        chart={prGateDiagram}
        title="What to clear before opening a PR"
        caption="Coverage green → types clean → lint clean → other brands/regions unaffected → dead flags/fixtures removed → CODEOWNERS reviewers correct and branch name ≤27 chars, no slashes."
        minHeight={420}
      />
      <ArticleTable
        caption="The pre-PR checklist."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Command / action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Coverage 100%</td>
              <td><code>pnpm test:commerce-base:coverage</code> (or brand jest)</td>
            </tr>
            <tr>
              <td>Types clean</td>
              <td><code>pnpm lint:type-check:commerce-base</code> / <code>:all</code></td>
            </tr>
            <tr>
              <td>Lint clean</td>
              <td><code>pnpm lint:commerce-base</code> (logical CSS, owner tags, warning caps)</td>
            </tr>
            <tr>
              <td>Other brands/regions unaffected</td>
              <td>Manual reasoning + tests for each branch</td>
            </tr>
            <tr>
              <td>Dead flags/fixtures removed</td>
              <td>Grep the <code>FEATURE_ID</code>/flag key across src/fixtures/tests</td>
            </tr>
            <tr>
              <td>Correct reviewers</td>
              <td>Check CODEOWNERS for the folder(s) touched</td>
            </tr>
            <tr>
              <td>Branch name valid</td>
              <td>≤27 chars, no slashes (Jenkins/Fuzzbucket)</td>
            </tr>
            <tr>
              <td>No secrets / PII in logs</td>
              <td>SCRAAP conventions; <code>test-placeholder</code> in fixtures</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you validate a change in cgi-web?'"
        intro="Lead with the validation ladder, then the exact commands, then the pre-PR gate."
        steps={[
          "Climb the ladder cheapest-first: targeted jest → type-check (tsc --noEmit, separate from build) → lint → coverage → Playwright E2E (if integration risk) → build (only if config/bundling).",
          "Real commands: pnpm test:commerce:jest:<brand> (maps to turbo coverage:jest), pnpm test:commerce:playwright[:headless]:<brand>, pnpm test:commerce-base:coverage, pnpm lint[:commerce:<brand>], pnpm lint:type-check:all, pnpm build:commerce:<brand>.",
          "Coverage is enforced at 100% (off only when CI shards) — a new branch needs a test that hits it; use the coverage report to find uncovered lines.",
          "Turbo caches and filters: --filter scopes to a package; a cache hit means nothing re-ran, so change an input to force it.",
          "Pre-PR gate: coverage green, types clean, lint clean, other brands/regions unaffected, dead flags/fixtures removed, CODEOWNERS correct, branch ≤27 chars no slashes, no secrets/PII.",
        ]}
      />

      <h2 id="challenge">Challenge: Choose the Right Checks</h2>
      <InterviewChallenge
        title="Pick the minimal-but-sufficient validation for three changes"
        scenario={
          <>
            You have three changes to validate: (1) you productionalized an experiment, deleting a{" "}
            <code>wpnx-*</code> hook and its control branch; (2) you added a new region branch (
            <code>region === &apos;PT&apos;</code>) to a currency-formatting helper; (3) you changed{" "}
            <code>next.config.js</code> asset-prefix logic. For each, name the checks you&apos;d run,
            in order, and why — without over- or under-testing.
          </>
        }
        tasks={[
          "For (1), explain why coverage matters most and what will fail if you miss a branch.",
          "For (2), name the checks that prove both the PT and non-PT paths work.",
          "For (3), justify why this is the case where a build IS warranted.",
          "State which of the three most needs Playwright E2E, if any.",
        ]}
        pitfalls={[
          "Running a full build for the experiment cleanup (a logic/coverage change).",
          "Adding the PT branch without a test that hits it (coverage fails).",
          "Skipping the build on the next.config change (config/bundling risk).",
        ]}
        signal="A strong answer runs coverage-focused jest + type-check for (1) (deleted branches must not drop coverage; removed hook must not break types), jest with coverage for both PT and non-PT paths in (2), and a build (plus jest/type-check) for (3) because it's config/bundling — and notes none strictly needs Playwright unless a multi-step flow changed."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(1) Experiment productionalization:</strong> coverage-focused jest + type-check.
          Deleting the control branch can leave a now-uncovered line elsewhere (100% is enforced), and
          removing the hook/constant can break types at call sites. Run{" "}
          <code>pnpm test:commerce-base:coverage</code> and{" "}
          <code>pnpm lint:type-check:commerce-base</code>. No build needed — it&apos;s logic.
        </p>
        <p>
          <strong>(2) New region branch:</strong> jest with coverage, asserting <em>both</em> the{" "}
          <code>PT</code> path and the non-PT (default) path — otherwise the new branch is uncovered
          and coverage fails. Type-check too. No build; no E2E unless it changes a flow.
        </p>
        <p>
          <strong>(3) <code>next.config.js</code> asset-prefix:</strong> this is the case a{" "}
          <strong>build is warranted</strong> — it&apos;s config/bundling behavior that unit tests
          won&apos;t catch. Run <code>pnpm build:commerce:&lt;brand&gt;</code> plus jest/type-check.
        </p>
        <p>
          <strong>Playwright:</strong> none of the three strictly needs it — they&apos;re logic/
          config, not multi-step navigation. Reserve E2E for changes to a flow&apos;s steps or
          routing.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Climb the ladder.</strong> Targeted jest → type-check → lint → coverage → E2E →
          build; cheapest and most-targeted first.
        </li>
        <li>
          <strong>Know the real scripts.</strong> <code>test:commerce:jest:*</code>,{" "}
          <code>test:commerce:playwright[:headless]:*</code>, <code>test:commerce-base:coverage</code>,{" "}
          <code>lint:type-check:*</code>, <code>build:commerce:*</code>.
        </li>
        <li>
          <strong>Coverage is a hard gate.</strong> 100% enforced; a new branch needs a test that hits
          it.
        </li>
        <li>
          <strong>Type-check is separate from build.</strong> Run <code>tsc --noEmit</code> — a green
          build doesn&apos;t prove clean types.
        </li>
        <li>
          <strong>Clear the pre-PR gate.</strong> Coverage, types, lint, cross-brand/region, dead-flag
          cleanup, CODEOWNERS, branch ≤27 chars.
        </li>
      </ul>
    </div>
  );
}
