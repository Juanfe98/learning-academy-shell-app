import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart LR
    INS["install\n(pnpm install\ncache node_modules)"]
    LINT["lint\n(eslint + tsc --noEmit)\nblocks merge on fail"]
    TEST["unit-tests\n(jest --ci --coverage)\nblocks merge on fail"]
    BUILD["build\n(next build)\nblocks merge on fail"]
    E2E["playwright-e2e\n(3 parallel shards)\nblocks merge on fail"]
    PREV["preview-deploy\n(dynamic URL per MR)"]
    PROMOTE["promote-to-prod\n(manual gate)"]

    INS --> LINT
    INS --> TEST
    LINT --> BUILD
    TEST --> BUILD
    BUILD --> E2E
    BUILD --> PREV
    E2E --> PROMOTE
    PREV --> PROMOTE`;

const previewEnvDiagram = String.raw`sequenceDiagram
    participant DEV as Developer
    participant GL as GitLab
    participant CI as GitLab Runner
    participant ENV as Preview Environment
    participant MR as Merge Request

    DEV->>GL: Opens MR
    GL->>CI: Pipeline triggered
    CI->>ENV: Deploy to preview.help.indeed.com/mr-123
    ENV-->>MR: Comment with preview URL
    DEV->>ENV: QA testing
    DEV->>GL: Merges MR
    GL->>CI: Stop environment job runs
    CI->>ENV: Preview environment destroyed`;

export const toc: TocItem[] = [
  { id: "gitlab-fundamentals", title: "GitLab CI/CD Fundamentals", level: 2 },
  { id: "pipeline-stages", title: "Pipeline Stages for a Next.js App", level: 2 },
  { id: "caching-modules", title: "Caching node_modules Between Jobs", level: 3 },
  { id: "parallel-playwright", title: "Parallel Playwright with Matrix Jobs", level: 3 },
  { id: "preview-environments", title: "Preview Environments per MR", level: 2 },
  { id: "env-vars-gitlab", title: "Environment Variables in GitLab", level: 2 },
  { id: "quality-gates", title: "Merge Request Quality Gates", level: 2 },
  { id: "contentstack-promotion", title: "Contentstack Environment Promotion", level: 2 },
  { id: "stages-table", title: "Job Stages Reference", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function CicdGitlab() {
  return (
    <div className="article-content">
      <p>
        GitLab CI/CD is the pipeline platform at Indeed. You need to understand the pipeline
        structure well enough to add new jobs, debug failing stages, and review pipeline YAML.
        This module covers the full Next.js + Contentstack pipeline: install, lint, test, build,
        E2E, preview deploy, and production promotion.
      </p>

      <h2 id="gitlab-fundamentals">GitLab CI/CD Fundamentals</h2>

      <pre>
        <code>{`# .gitlab-ci.yml — top-level structure
# Stages define the execution order
# Jobs within the same stage run in parallel
# A stage only starts when all jobs in the previous stage pass

stages:
  - install      # pnpm install — must succeed before anything else
  - lint         # eslint + tsc — code quality gates
  - test         # jest unit tests
  - build        # next build — produces .next/ artifact
  - e2e          # playwright — full browser tests
  - deploy       # preview and production deployments

# Global variables — available in all jobs
variables:
  PNPM_VERSION: "9.0.0"
  NODE_VERSION: "22"

# Default config — applied to all jobs unless overridden
default:
  image: node:22-alpine
  before_script:
    - npm install -g pnpm@$PNPM_VERSION`}</code>
      </pre>

      <h2 id="pipeline-stages">Pipeline Stages for a Next.js App</h2>
      <MermaidDiagram
        chart={pipelineDiagram}
        title="Full GitLab CI Pipeline for Next.js + Contentstack"
        caption="Install runs once. Lint and unit-tests run in parallel. Build only starts after both pass. E2E and preview deploy after build. Production promotion requires manual approval."
        minHeight={300}
      />

      <pre>
        <code>{`# Complete .gitlab-ci.yml for a Next.js + Contentstack application

stages: [install, lint, test, build, e2e, deploy]

variables:
  PNPM_STORE: "$CI_PROJECT_DIR/.pnpm-store"

# ── INSTALL ─────────────────────────────────────────────────────────────────
install:
  stage: install
  script:
    - pnpm config set store-dir $PNPM_STORE
    - pnpm install --frozen-lockfile
  cache:
    # Cache per branch — dev branch and main get separate caches
    key:
      files: [pnpm-lock.yaml] # invalidate cache when lockfile changes
    paths:
      - node_modules/
      - .pnpm-store/
  artifacts:
    # Pass node_modules to downstream jobs
    paths: [node_modules/]
    expire_in: 1 hour

# ── LINT ────────────────────────────────────────────────────────────────────
lint:
  stage: lint
  needs: [install]
  script:
    - pnpm lint
    - pnpm tsc --noEmit   # TypeScript errors surface here, not in pnpm build alone
  allow_failure: false     # Blocks merge on any lint error

# ── UNIT TESTS ──────────────────────────────────────────────────────────────
unit-tests:
  stage: test
  needs: [install]
  script:
    - pnpm test --ci --coverage --coverageReporters=cobertura
  coverage: '/All files\s*\|\s*(\d+\.?\d*)/'  # Regex to extract coverage %
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths: [coverage/]
    expire_in: 1 week

# ── BUILD ───────────────────────────────────────────────────────────────────
build:
  stage: build
  needs: [lint, unit-tests]  # Both must pass before building
  script:
    - pnpm build
  artifacts:
    paths: [.next/]  # Pass build output to downstream jobs
    expire_in: 1 hour
  environment:
    name: production  # Associates this job with the production environment config`}</code>
      </pre>

      <h3 id="caching-modules">Caching node_modules Between Jobs</h3>

      <pre>
        <code>{`# Cache strategy options — each has tradeoffs

# Option 1: Cache by lockfile hash (recommended)
# Invalidates automatically when dependencies change
cache:
  key:
    files:
      - pnpm-lock.yaml  # key changes when lockfile changes
  paths:
    - node_modules/
    - .pnpm-store/

# Option 2: Cache by branch name
# Allows each branch to have its own cache
cache:
  key: "$CI_COMMIT_REF_SLUG"  # e.g., "feature-add-search"
  paths:
    - node_modules/

# Cache policies:
# policy: pull-push (default) — download cache at start, upload at end
# policy: pull           — download only, don't update cache (read-only jobs)
# policy: push           — upload only, don't use existing cache

# In downstream jobs (after install), use pull-only to save time:
lint:
  cache:
    key:
      files: [pnpm-lock.yaml]
    paths: [node_modules/, .pnpm-store/]
    policy: pull  # Don't push — only install job should update the cache`}</code>
      </pre>

      <h3 id="parallel-playwright">Parallel Playwright with Matrix Jobs</h3>

      <pre>
        <code>{`# Run Playwright tests across 3 parallel runners using CI_NODE_INDEX/CI_NODE_TOTAL
# This reduces E2E time from 15 minutes to ~5 minutes

playwright-e2e:
  stage: e2e
  needs: [build]
  image: mcr.microsoft.com/playwright:v1.52.0-jammy  # Playwright Docker image with browsers
  parallel:
    matrix:
      - SHARD_INDEX: ["1", "2", "3"]  # 3 parallel runners
  variables:
    SHARD_TOTAL: "3"
  script:
    # Start the Next.js production server in the background
    - pnpm start &
    - sleep 5  # wait for server to start (or use wait-on package)
    # Run only this shard's portion of tests
    - pnpm playwright test --shard=$SHARD_INDEX/$SHARD_TOTAL --reporter=gitlab
  artifacts:
    when: on_failure
    paths: [playwright-report/]
    expire_in: 1 week
  # Optional: merge sharded reports for a single merged HTML report
  # Requires a merge job after all shards complete`}</code>
      </pre>

      <h2 id="preview-environments">Preview Environments per MR</h2>
      <MermaidDiagram
        chart={previewEnvDiagram}
        title="Preview Environment Lifecycle — MR Opened to Merged"
        caption="Each MR gets its own preview URL. QA and stakeholders review in the preview before merge. The environment is automatically destroyed when the MR closes."
        minHeight={420}
      />

      <pre>
        <code>{`# Dynamic preview environment per Merge Request
preview-deploy:
  stage: deploy
  needs: [build]
  script:
    # Deploy to a staging platform (Vercel, AWS, Kubernetes) with MR-specific URL
    - pnpm deploy:preview --url "https://mr-$CI_MERGE_REQUEST_IID.preview.help.indeed.com"
    # Comment the preview URL on the MR
    - |
      curl --request POST \
        --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        --data "body=Preview URL: https://mr-$CI_MERGE_REQUEST_IID.preview.help.indeed.com" \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
  environment:
    name: preview/$CI_COMMIT_REF_SLUG          # unique environment per branch
    url: "https://mr-$CI_MERGE_REQUEST_IID.preview.help.indeed.com"
    on_stop: stop-preview                        # trigger stop job on MR close
    auto_stop_in: 1 week                         # auto-stop if not manually stopped
  only:
    - merge_requests

# Cleanup job — runs automatically when MR is closed or merged
stop-preview:
  stage: deploy
  needs: []
  script:
    - pnpm deploy:teardown --env "mr-$CI_MERGE_REQUEST_IID"
  environment:
    name: preview/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
  only:
    - merge_requests`}</code>
      </pre>

      <h2 id="env-vars-gitlab">Environment Variables in GitLab</h2>

      <pre>
        <code>{`# GitLab environment variable types:

# 1. Variable — plain text, shown in job logs (use for non-secrets)
# NEXT_PUBLIC_CONTENTSTACK_API_KEY = blt_dev_xxxx

# 2. Masked variable — value hidden in job logs (use for secrets)
# CONTENTSTACK_DELIVERY_TOKEN = cs_delivery_xxx (masked)

# 3. Protected variable — only available on protected branches (main, release/*)
# CONTENTSTACK_PROD_DELIVERY_TOKEN = cs_delivery_prod_xxx (masked + protected)

# 4. File variable — contents written to a temp file, path injected as env var
# Useful for SSH keys, certificates, large config files

# Using environment variables in .gitlab-ci.yml:
build:
  script:
    - pnpm build
  variables:
    # Branch-specific overrides — staging vs production Contentstack environment
    CONTENTSTACK_ENVIRONMENT: "staging"  # overridden in production job
  environment:
    name: staging

deploy-production:
  extends: build
  variables:
    CONTENTSTACK_ENVIRONMENT: "production"
  environment:
    name: production
    url: "https://help.indeed.com"
  when: manual  # require manual trigger for production
  only:
    - main       # only deployable from main branch`}</code>
      </pre>

      <h2 id="quality-gates">Merge Request Quality Gates</h2>

      <pre>
        <code>{`# Require lint-staged for pre-commit validation
# Prevents "oops I committed broken code" before CI even runs

# package.json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{ts,tsx,json}": "tsc --noEmit"
  },
  "scripts": {
    "prepare": "husky"
  }
}

# .husky/pre-commit
#!/bin/sh
pnpm lint-staged

# GitLab merge request settings (via Settings → Merge requests):
# - Require pipeline to succeed before merge (blocks broken builds)
# - Require code owner approval (CODEOWNERS file)
# - Squash commits on merge (cleaner git history)

# CODEOWNERS — require specific reviewers for critical paths
# .gitlab/CODEOWNERS
[Performance]
src/app/**/*.tsx @perf-team

[Testing]
src/**/*.test.ts @qa-team

[Infrastructure]
.gitlab-ci.yml @devops-team
next.config.ts @frontend-leads`}</code>
      </pre>

      <h2 id="contentstack-promotion">Contentstack Environment Promotion</h2>

      <pre>
        <code>{`# Content promotion pipeline:
# dev → staging → production
# Each promotion requires passing the pipeline + manual approval

# .gitlab-ci.yml — content promotion stage
promote-content:
  stage: deploy
  script:
    # Use Contentstack Management API to bulk-publish entries to production
    - |
      node scripts/promote-content.js \
        --from-env staging \
        --to-env production \
        --content-type article \
        --locale en-us
  environment:
    name: production
  when: manual  # requires human to click the "Play" button
  only:
    - main
  # Content promotion happens AFTER the Next.js app is deployed
  # so the new frontend code is already live before content goes live`}</code>
      </pre>

      <h2 id="stages-table">Job Stages Reference</h2>

      <ArticleTable caption="Each CI stage has a specific purpose, failure impact, and parallelization opportunity." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Purpose</th>
              <th>Failure Impact</th>
              <th>Parallelization</th>
              <th>Approx Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>install</strong></td>
              <td>Install dependencies, populate cache</td>
              <td>Blocks all subsequent stages</td>
              <td>None — runs once</td>
              <td>30–90s (cache hit: 5s)</td>
            </tr>
            <tr>
              <td><strong>lint</strong></td>
              <td>ESLint + TypeScript type checking</td>
              <td>Blocks build — catches type errors before compilation</td>
              <td>Split ESLint and tsc into separate parallel jobs</td>
              <td>30–60s</td>
            </tr>
            <tr>
              <td><strong>unit-tests</strong></td>
              <td>Jest unit and integration tests</td>
              <td>Blocks build — must pass before shipping</td>
              <td>Jest --shard for large test suites</td>
              <td>60–120s</td>
            </tr>
            <tr>
              <td><strong>build</strong></td>
              <td>next build — type-checks and bundles</td>
              <td>Blocks deploy — artifact used by E2E and deploy</td>
              <td>None — Next.js build is sequential</td>
              <td>2–10 min</td>
            </tr>
            <tr>
              <td><strong>e2e</strong></td>
              <td>Playwright browser tests</td>
              <td>Blocks production promotion (not preview)</td>
              <td>--shard flag across matrix jobs — 3–5 runners</td>
              <td>5–20 min (sharded)</td>
            </tr>
            <tr>
              <td><strong>preview deploy</strong></td>
              <td>Dynamic preview URL per MR</td>
              <td>Does not block merge — informational</td>
              <td>None</td>
              <td>1–3 min</td>
            </tr>
            <tr>
              <td><strong>promote to production</strong></td>
              <td>Deploy to production with manual gate</td>
              <td>Manual step — requires explicit approval</td>
              <td>None</td>
              <td>1–5 min (after approval)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through how you'd set up a CI/CD pipeline for a Next.js application'"
        intro="You don't need to memorize every GitLab YAML attribute. You need to show that you understand the pipeline stages, why they are ordered that way, and how to make the pipeline fast and safe."
        steps={[
          "Start with the stages: install → lint + unit tests (parallel) → build → E2E → deploy. Each stage only starts when the previous stage fully passes. This ordering means we catch cheap errors (linting) before running expensive ones (E2E), which is economically sensible.",
          "Explain the caching strategy: node_modules is cached by the pnpm-lock.yaml file hash. If no dependency changed, the cache hits and install takes 5 seconds instead of 90. Downstream jobs use pull-only cache policy — they read from cache but don't update it, saving time.",
          "Describe parallel E2E: Playwright tests with 3 parallel shards reduce E2E from 15 minutes to 5. Each shard runs 1/3 of the tests using the --shard flag. This is the single biggest CI time optimization for Next.js apps with meaningful E2E coverage.",
          "Explain preview environments: every MR gets a dynamic preview URL. The pipeline deploys to a staging platform with MR ID in the URL, then comments that URL on the MR. When the MR closes, a cleanup job tears down the preview. Stakeholders and QA review before merge — not after.",
          "Close with the production gate: production deployment requires a manual click after E2E passes. This means a human is always in the loop for production deploys. Environment variables for production credentials are protected — only available on the main branch.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design a GitLab CI Pipeline for a Next.js + Contentstack Monorepo"
        scenario={
          <span>
            The Indeed Help Center codebase is a monorepo with a Next.js frontend
            in <code>packages/frontend/</code> and a Node.js backend API
            in <code>packages/backend/</code>. The pipeline must: run frontend and backend tests in
            parallel, only rebuild what changed (if only backend files changed, don&apos;t rebuild
            the frontend), deploy a preview per MR, and promote to production with a manual gate.
            The Playwright E2E tests test the full stack (frontend + backend together) and are too
            slow to run on every MR — they should only run before production promotion.
          </span>
        }
        tasks={[
          "Design the stage order for this monorepo pipeline — list the stages and which jobs run in each",
          "Write the GitLab CI rules for conditional builds: only run the frontend build job when files in packages/frontend/ have changed (use rules: changes:)",
          "Design the cache strategy: the frontend and backend have separate node_modules — how do you cache them separately with different cache keys?",
          "Describe the E2E gating strategy: E2E only runs before production promotion, not on every MR — what does the pipeline YAML look like for this?",
          "List three things that should be masked variables and three that should be protected variables in this setup, and explain the difference",
        ]}
        pitfalls={[
          "Running E2E tests on every MR when the spec says they're too slow — E2E should be a pre-production gate, not a per-MR gate",
          "Sharing a single cache key for frontend and backend node_modules — they have different dependency trees; separate cache keys prevent cache corruption",
          "Not using rules: changes: for conditional builds — without this, both frontend and backend rebuild on every push, wasting CI minutes",
          "Putting production secrets in non-protected variables — any branch can access them, which defeats the protection purpose",
        ]}
        signal="A strong answer uses rules: changes: paths: ['packages/frontend/**/*'] for conditional builds, separate cache keys like pnpm-frontend-$CI_COMMIT_REF_SLUG and pnpm-backend-$CI_COMMIT_REF_SLUG, runs E2E only in a promotion pipeline (not on every MR), and correctly distinguishes masked (hidden in logs) from protected (only on protected branches) variables."
      />
    </div>
  );
}
