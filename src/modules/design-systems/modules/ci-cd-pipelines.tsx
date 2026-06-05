import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart LR
  PR["Pull request"] --> CI["CI: validate"]
  CI --> LINT["lint + typecheck"]
  CI --> TEST["unit + a11y tests"]
  CI --> VIS["Chromatic visual review"]
  CI --> SIZE["bundle size check"]
  LINT --> GATE{"all pass?"}
  TEST --> GATE
  VIS --> GATE
  SIZE --> GATE
  GATE -->|"yes"| MERGE["Merge to main"]
  MERGE --> REL["Release: Changesets"]
  REL --> PUB["publish to npm + tag + changelog"]
  PUB --> DOCS["deploy Storybook docs"]`;

const cachingDiagram = String.raw`flowchart TD
  CHANGE["Change in packages/react"] --> TURBO["Turborepo: what's affected?"]
  TURBO --> BUILD1["Rebuild react + dependents"]
  TURBO --> SKIP["Skip tokens, icons (unchanged) -> cache hit"]
  BUILD1 --> FAST["CI runs in seconds, not minutes"]
  SKIP --> FAST`;

export const toc: TocItem[] = [
  { id: "ci-is-the-contract", title: "CI Is How You Keep the Promise", level: 2 },
  { id: "the-gates", title: "The Quality Gates", level: 2 },
  { id: "validate-workflow", title: "The Validate Workflow", level: 2 },
  { id: "chromatic-ci", title: "Visual Review in CI", level: 2 },
  { id: "bundle-size", title: "Bundle-Size Budgets", level: 2 },
  { id: "release-workflow", title: "The Automated Release Workflow", level: 2 },
  { id: "caching", title: "Fast CI: Affected-Only + Caching", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CiCdPipelines() {
  return (
    <div className="article-content">
      <p>
        Everything in this academy — accessible components, visual consistency, safe versioning,
        small bundles — is only a <em>promise</em> until CI enforces it on every change. A design
        system shipped to hundreds of apps cannot rely on humans remembering to run the a11y check
        or bump the version correctly. This module builds the concrete pipeline: the quality gates on
        every PR and the automated release on merge, with real GitHub Actions configs you can copy.
        CI is the machine that makes the system trustworthy.
      </p>

      <h2 id="ci-is-the-contract">CI Is How You Keep the Promise</h2>
      <p>
        Recall the versioning module: the system&rsquo;s currency is <strong>consumer trust</strong>.
        Trust is built by <em>never</em> shipping a regression — and the only scalable way to
        guarantee that is automation. CI turns every standard in this academy into an enforced gate:
        types, lint, tests, accessibility, visual consistency, bundle size. CD turns merges into
        safe, automated releases. Without this, the system degrades the moment the team gets busy.
      </p>

      <MermaidDiagram
        chart={pipelineDiagram}
        title="The full pipeline"
        caption="Every PR runs the quality gates; merging to main triggers an automated Changesets release and docs deploy."
        minHeight={300}
      />

      <h2 id="the-gates">The Quality Gates</h2>
      <ArticleTable
        caption="What runs on every PR and why it gates the merge."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Gate</th><th>Catches</th><th>Tool</th></tr>
          </thead>
          <tbody>
            <tr><td>Typecheck</td><td>API/type breakage</td><td><code>tsc --noEmit</code></td></tr>
            <tr><td>Lint + format</td><td>Style drift, banned patterns</td><td>ESLint, Prettier, Stylelint</td></tr>
            <tr><td>Unit + interaction</td><td>Logic/behavior regressions</td><td>Vitest, Testing Library</td></tr>
            <tr><td>Accessibility</td><td>a11y violations</td><td>axe / Storybook test-runner</td></tr>
            <tr><td>Visual regression</td><td>Unintended appearance changes</td><td>Chromatic</td></tr>
            <tr><td>Bundle size</td><td>Size regressions</td><td>size-limit</td></tr>
            <tr><td>Changeset present</td><td>Un-versioned changes</td><td>Changesets bot</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="validate-workflow">The Validate Workflow</h2>
      <p>
        The PR workflow runs all the fast gates in parallel. Here&rsquo;s a complete, runnable GitHub
        Actions config for a pnpm + Turborepo design-system monorepo:
      </p>

      <CodeBlock
        code={`# .github/workflows/validate.yml
name: Validate
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }            # full history for affected-detection + Chromatic

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - run: pnpm install --frozen-lockfile

      # Turborepo runs only what's affected, with caching:
      - run: pnpm turbo run typecheck lint test build

      # Enforce that every change ships a changeset (version intent):
      - name: Require changeset
        run: pnpm changeset status --since=origin/main`}
        lang="yaml"
        filename=".github/workflows/validate.yml"
      />

      <h2 id="chromatic-ci">Visual Review in CI</h2>
      <p>
        Visual regression (testing module) is the highest-value gate for a design system, and it runs
        as its own job because it publishes Storybook to Chromatic and posts diffs on the PR. A
        token/CSS change that ripples across components shows up here <em>before</em> merge.
      </p>

      <CodeBlock
        code={`# .github/workflows/chromatic.yml
name: Visual Review
on: pull_request

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }            # Chromatic needs git history to baseline
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: chromaui/action@latest
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true           # changes require human approval, don't hard-fail`}
        lang="yaml"
        filename=".github/workflows/chromatic.yml"
      />

      <h2 id="bundle-size">Bundle-Size Budgets</h2>
      <p>
        A design system that silently bloats consumers&rsquo; bundles loses trust fast. A{" "}
        <strong>size budget</strong> gate (size-limit) fails the PR if importing a component exceeds a
        threshold — catching the tree-shaking regressions and accidental heavy-dependency additions
        from the distribution module.
      </p>

      <CodeBlock
        code={`// .size-limit.json — fail CI if these budgets are exceeded
[
  { "name": "Button (tree-shaken)", "path": "dist/index.js", "import": "{ Button }", "limit": "4 kB" },
  { "name": "Full library",          "path": "dist/index.js", "limit": "60 kB" }
]
// package.json: "size": "size-limit"   ->  add 'pnpm size' to the validate workflow
// A PR that breaks tree-shaking (importing Button pulls in everything) fails the budget.`}
        lang="json"
        filename=".size-limit.json"
      />

      <h2 id="release-workflow">The Automated Release Workflow</h2>
      <p>
        On merge to main, the release workflow uses the Changesets Action. It does the two-step
        Changesets flow automatically: if unreleased changesets exist, it opens/updates a{" "}
        &ldquo;Version Packages&rdquo; PR (bumping versions + writing changelogs); when <em>that</em>{" "}
        PR merges, it publishes to npm. This is the entire release pipeline from the versioning
        module, automated.
      </p>

      <CodeBlock
        code={`# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

concurrency: \${{ github.workflow }}-\${{ github.ref }}   # never run two releases at once

jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, registry-url: "https://registry.npmjs.org" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build

      - uses: changesets/action@v1
        with:
          version: pnpm changeset version    # opens the "Version Packages" PR
          publish: pnpm changeset publish     # publishes when that PR is merged
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}`}
        lang="yaml"
        filename=".github/workflows/release.yml"
      />

      <p>
        A separate job (or a step after publish) deploys the Storybook docs site (to Chromatic,
        Vercel, or GitHub Pages) so docs always reflect the latest release — closing the loop from
        the documentation module.
      </p>

      <h2 id="caching">Fast CI: Affected-Only + Caching</h2>
      <p>
        A monorepo CI that rebuilds everything on every PR becomes painfully slow and discourages
        contribution. <strong>Turborepo</strong> (or Nx) runs only the tasks affected by the change
        and caches outputs — a token change rebuilds tokens and dependents but skips unrelated
        packages via cache hits. Add a remote cache so CI shares cache across runs and developers.
      </p>

      <MermaidDiagram
        chart={cachingDiagram}
        title="Affected-only builds with caching"
        caption="Turborepo rebuilds only what a change affects and serves the rest from cache, keeping CI fast as the monorepo grows."
        minHeight={280}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What does CI/CD look like for a design system?'"
        intro="Connect it to trust. The signal is naming the full gate set and the automated Changesets release, not just 'we run tests.'"
        steps={[
          "Frame CI as how you keep the trust promise: a system shipped to many apps can't rely on humans remembering checks — automation enforces every standard.",
          "Name the PR gates: typecheck, lint, unit + interaction, accessibility (axe), visual regression (Chromatic), bundle-size budget, and 'changeset present'.",
          "Visual regression is the highest-value gate — it catches cross-component side effects of token/CSS changes before merge (exitZeroOnChanges, human approves).",
          "CD via the Changesets Action: merge opens a Version Packages PR (bumps + changelog); merging that publishes to npm — fully automated.",
          "Keep CI fast with Turborepo affected-only builds + remote caching, and deploy Storybook docs on release.",
        ]}
      />

      <InterviewChallenge
        title="Design the pipeline from scratch"
        scenario={
          <>
            A design-system team ships manually: someone runs tests locally (sometimes), bumps
            versions by hand (occasionally wrong), and publishes from their laptop. Recently a
            broken a11y change and a bundle-size regression both reached production, and a botched
            manual version bump broke consumers. Build them a pipeline.
          </>
        }
        tasks={[
          "Define the PR gates that would have caught each of the three incidents.",
          "Design the automated release flow that removes manual versioning/publishing.",
          "Explain how you'd keep CI fast as the monorepo grows.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Gates mapped to incidents:</strong> the broken a11y change → an{" "}
          <strong>axe gate</strong> (Storybook test-runner / jest-axe) on every component, required
          to pass. The bundle-size regression → a <strong>size-limit budget</strong> gate that fails
          the PR. The botched manual bump → a <strong>&ldquo;changeset required&rdquo;</strong> gate +
          removing humans from versioning entirely. Add typecheck, lint, unit/interaction tests, and
          Chromatic visual review while you&rsquo;re there.
        </p>
        <p>
          <strong>Automated release:</strong> adopt <strong>Changesets</strong>. Authors add a
          changeset per PR (enforced by the gate). On merge to main, the Changesets Action opens a
          &ldquo;Version Packages&rdquo; PR that bumps versions and writes changelogs; merging that PR
          publishes to npm from CI (not a laptop), using an <code>NPM_TOKEN</code> secret and a{" "}
          <code>concurrency</code> guard so two releases never collide. No human touches version
          numbers.
        </p>
        <p>
          <strong>Fast CI:</strong> use Turborepo to run only affected tasks with output caching, plus
          a remote cache shared across CI and developers, so a change to one package doesn&rsquo;t
          rebuild the whole monorepo. This keeps the pipeline fast enough that the gates don&rsquo;t
          become a reason to bypass CI.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          CI is how a design system <strong>keeps its trust promise</strong> — automation enforces
          every standard so busy humans can&rsquo;t skip it.
        </li>
        <li>
          PR gates: <strong>typecheck, lint, unit + interaction, accessibility, visual regression,
          bundle-size budget, and changeset-present</strong>.
        </li>
        <li>
          Run the <strong>Changesets Action</strong> on merge: it opens a Version Packages PR, then
          publishes to npm automatically — no manual versioning.
        </li>
        <li>
          <strong>Visual regression</strong> (Chromatic) and <strong>bundle-size budgets</strong>{" "}
          (size-limit) are the design-system-specific gates that catch the costliest regressions.
        </li>
        <li>
          Keep CI fast with <strong>Turborepo affected-only builds + remote caching</strong>; deploy
          docs on release.
        </li>
      </ul>
    </div>
  );
}
