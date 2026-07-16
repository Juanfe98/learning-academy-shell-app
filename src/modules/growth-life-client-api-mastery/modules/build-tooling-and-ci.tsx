import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const generatedArtifactsDiagram = String.raw`flowchart TD
  TYPES["TS interfaces<br/>(elements/, domain/models/)"]
  TYPES -->|build:typeguards| GUARDS["type guards<br/>(runtime validation)"]
  TYPES -->|build:schemas| SCHEMAS["JSON schemas<br/>lib/validator/schemas/"]
  SCHEMAS -->|swagger-from-types| BUNDLE["openapi.json"]
  YAML["route openapi.yaml"] -->|build:openapi| BUNDLE
  GUARDS -.->|CI: typeguards-check| CI1["fails if stale"]
  BUNDLE -.->|CI: openapi-check| CI2["fails if stale"]`;

const ciDiagram = String.raw`flowchart LR
  PR["Pull Request"]
  PR --> C1["typeguards-check"]
  PR --> C2["openapi-check"]
  PR --> C3["template-link-check"]
  PR --> C4["fixture-check"]
  PR --> C5["legacy-test-check"]
  PR --> C6["migration-check"]
  PR --> C7["CI: tests + SonarQube"]`;

const importRuleDiagram = String.raw`flowchart LR
  A["src/domain/screen/x"] -->|"❌ ../../lib"| BAD["ESLint error"]
  A -->|"✅ !lib/*"| GOOD["allowed"]
  B["same folder"] -->|"✅ ./sibling"| GOOD`;

export const toc: TocItem[] = [
  { id: "why", title: "Why Codegen Exists Here", level: 2 },
  { id: "typeguards", title: "build:typeguards", level: 2 },
  { id: "swagger", title: "build:swagger & Schemas", level: 2 },
  { id: "when", title: "Which Command After Which Change", level: 2 },
  { id: "imports", title: "The Import Rules", level: 2 },
  { id: "eslint-local", title: "Local ESLint Rules", level: 3 },
  { id: "ci", title: "The CI Gauntlet", level: 2 },
  { id: "local-dev", title: "Local Dev & Test Environments", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Ship Without Breaking CI", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function BuildToolingAndCi() {
  return (
    <div className="article-content">
      <p>
        This service leans heavily on <strong>code generation</strong>: type guards and JSON schemas
        are derived from your TypeScript types, and the OpenAPI spec is bundled from route YAML plus
        those schemas. That means a type change isn&apos;t &quot;done&quot; when it compiles — it&apos;s
        done when you&apos;ve regenerated the derived artifacts. Forgetting is the single most common
        way to turn a green local build into a red CI run. This module covers the codegen commands,
        the import rules, and the CI checks that gate every PR.
      </p>

      <h2 id="why">Why Codegen Exists Here</h2>
      <p>
        TypeScript types vanish at runtime. But this service validates that responses actually match
        their contracts at runtime (remember the malformed-template path from module 4), and it
        publishes an OpenAPI spec for clients. Both need a concrete, runtime representation of the
        types — so the repo <em>generates</em> type guards and JSON schemas from the interfaces. The
        generated files are committed, which is why they must be regenerated and checked in whenever
        the source types change.
      </p>
      <MermaidDiagram
        chart={generatedArtifactsDiagram}
        title="Types are the source; guards, schemas, and openapi.json are generated"
        caption="Change an interface → regenerate guards/schemas → CI compares your committed artifacts against a fresh generation and fails if they drift."
        minHeight={440}
      />

      <h2 id="typeguards">build:typeguards</h2>
      <p>
        <code>npm run build:typeguards</code> regenerates runtime type guards from your interfaces.
        The rule from <code>CLAUDE.md</code>: <strong>run it after ANY change to interfaces/types in{" "}
        <code>elements/</code> or <code>domain/models/</code>.</strong> The CI variant{" "}
        (<code>build:typeguards:ci</code>, a <code>-dry-run</code>) powers the{" "}
        <code>typeguards-check</code> workflow — if your committed guards don&apos;t match a fresh
        generation, it fails.
      </p>

      <h2 id="swagger">build:swagger &amp; Schemas</h2>
      <p>
        <code>npm run build:swagger</code> is a composite: it runs <code>build:schemas</code>{" "}
        (generates JSON schemas into <code>src/lib/validator/schemas/</code>), then{" "}
        <code>swagger-from-types</code>, then <code>build:openapi</code> (bundles{" "}
        <code>openapi.json</code>). Run it after modifying a route&apos;s OpenAPI spec or the response
        type it references. The <code>openapi-check</code> CI workflow catches a stale bundle.
      </p>
      <CodeBlock
        lang="bash"
        filename="the two codegen commands you'll actually run"
        code={`# After changing an interface in elements/ or domain/models/:
npm run build:typeguards

# After changing a route's openapi.yaml or its response type:
npm run build:swagger   # = build:schemas → swagger-from-types → build:openapi`}
      />

      <h2 id="when">Which Command After Which Change</h2>
      <ArticleTable
        caption="Map your change to the command you must run before pushing."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>You changed…</th><th>Run</th><th>CI check that catches you</th></tr>
          </thead>
          <tbody>
            <tr><td>An interface in <code>elements/</code> or <code>domain/models/</code></td><td><code>build:typeguards</code></td><td><code>typeguards-check</code></td></tr>
            <tr><td>A route&apos;s <code>openapi.yaml</code> or response type</td><td><code>build:swagger</code></td><td><code>openapi-check</code></td></tr>
            <tr><td>Template-generating TS</td><td><code>generate-templates</code></td><td><code>platform-generated-templates-check</code></td></tr>
            <tr><td>A migrating screen (one side)</td><td><code>migration:check</code></td><td><code>migration-check</code></td></tr>
            <tr><td>Template links</td><td>—</td><td><code>template-link-check</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="imports">The Import Rules</h2>
      <p>
        Imports are linted, not merely conventional. <strong>Use <code>!</code>-prefixed aliases for
        cross-directory imports</strong> (<code>!domain/*</code>, <code>!lib/*</code>,{" "}
        <code>!backends/*</code>, <code>!elements/*</code>, <code>!middlewares/*</code>,{" "}
        <code>!routes/*</code>). Parent-relative imports (<code>../*</code>) are an ESLint{" "}
        <em>error</em>. Same-folder <code>./</code> is fine.
      </p>
      <MermaidDiagram
        chart={importRuleDiagram}
        title="Import rules the linter enforces"
        caption="Cross-directory: use ! aliases. Parent-relative ../ is an error. Same-folder ./ is allowed."
        minHeight={240}
      />
      <p>
        Imports are also <strong>alphabetized and grouped</strong> (builtins/external, then internal{" "}
        <code>!*</code>, then relative, newlines between groups) — enforced by ESLint. And a naming
        rule: use <code>addOn</code>/<code>addOns</code>, never <code>addon</code>/<code>addons</code>{" "}
        (an <code>id-denylist</code> error).
      </p>

      <h3 id="eslint-local">Local ESLint Rules</h3>
      <p>
        The repo ships custom lint rules in <code>eslint-local-rules.js</code>. The one to know is{" "}
        <code>local-rules/no-screen-function-registry</code> from module 8: creating a screen-specific
        function registry (e.g. <code>heroFunctionRegistry.ts</code>) is a hard error — register in a
        canonical domain registry instead. There&apos;s also a platform boundary lint{" "}
        (<code>lint:platform</code> with <code>LINT_PLATFORM_BOUNDARIES=true</code>) guarding the
        platform layer&apos;s import boundaries.
      </p>

      <h2 id="ci">The CI Gauntlet</h2>
      <p>
        A PR runs a fleet of workflows. Knowing them means you can predict a red build before you
        push.
      </p>
      <MermaidDiagram
        chart={ciDiagram}
        title="The CI checks on every PR"
        caption="Codegen freshness, template links, fixtures, legacy tests, migration parity, and the test suite + SonarQube all gate the merge."
        minHeight={320}
      />
      <ArticleTable
        caption="The CI workflows and what each guards."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Workflow</th><th>Guards</th></tr>
          </thead>
          <tbody>
            <tr><td><code>ci.yml</code></td><td>Test shards + SonarQube quality gate</td></tr>
            <tr><td><code>typeguards-check.yml</code></td><td>Type guards are up to date</td></tr>
            <tr><td><code>openapi-check.yml</code></td><td>OpenAPI bundle is up to date</td></tr>
            <tr><td><code>template-link-check.yml</code></td><td>Template links resolve</td></tr>
            <tr><td><code>fixture-check.yml</code></td><td>No new fixture files (except templates)</td></tr>
            <tr><td><code>legacy-test-check.yml</code></td><td>Warns on legacy-test edits / deletable legacy files</td></tr>
            <tr><td><code>migration-check.yml</code></td><td>Migrating screens changed on both sides</td></tr>
            <tr><td><code>platform-generated-templates-check.yml</code></td><td>Generated templates are current</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="local-dev">Local Dev &amp; Test Environments</h2>
      <p>
        The <code>HULU_ENV</code> variable decides where config/templates come from, and getting it
        wrong causes silent, confusing failures.
      </p>
      <ArticleTable
        caption="The environments and when to use each."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Command</th><th>Env</th><th>Behavior</th></tr>
          </thead>
          <tbody>
            <tr><td><code>npm run local</code></td><td><code>HULU_ENV=local</code></td><td>Local fixtures for templates — no network</td></tr>
            <tr><td><code>npm run dev</code></td><td>staging</td><td>Fetches templates from S3</td></tr>
            <tr><td><code>npm run test</code></td><td><code>HULU_ENV=ci</code></td><td>Type-checks first, then Jest with CI config</td></tr>
            <tr><td><code>npm run test:integration</code></td><td><code>HULU_ENV=integration</code></td><td>Route integration tests, sequential</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        A real gotcha worth remembering: running a bare <code>jest</code> without{" "}
        <code>HULU_ENV=ci</code> can select the S3-backed template-config client instead of the local
        fixture-backed one, so new local config entries may be ignored in confusing ways. Always go
        through <code>npm run test</code>, which pins <code>HULU_ENV=ci</code>.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What do you have to run before pushing a change here?'"
        intro="Show you understand the codegen-is-committed model and can map a change to its command and CI check."
        steps={[
          "Explain that type guards, JSON schemas, and openapi.json are generated from TS types and committed — so a compiling change isn't necessarily complete.",
          "Map changes: interface in elements/ or domain/models → build:typeguards; route openapi.yaml or response type → build:swagger.",
          "Name the matching CI checks (typeguards-check, openapi-check) that fail on stale artifacts.",
          "Cover import discipline: ! aliases for cross-dir, no ../ parents, alphabetized groups, addOn not addon, plus local rules like no-screen-function-registry.",
          "Mention the broader CI gauntlet (fixture, legacy-test, migration, template-link, SonarQube) and the HULU_ENV=ci gotcha for tests.",
        ]}
      />

      <h2 id="challenge">Challenge: Ship Without Breaking CI</h2>
      <InterviewChallenge
        title="A new field on a screen response"
        scenario={
          <>
            You add a new <code>promoBadge</code> field to a screen&apos;s contract type in{" "}
            <code>domain/models/screens/v1/</code>, populate it in the service, import a helper from{" "}
            <code>src/lib/</code> using <code>../../lib/helper</code>, and open a PR. Local{" "}
            <code>tsc</code> passes. Predict which CI checks fail and how you&apos;d fix each before
            pushing.
          </>
        }
        tasks={[
          "Identify the codegen command the type change requires and the CI check that fails without it.",
          "Explain the OpenAPI implication if the field is part of the response schema.",
          "Spot the import violation and give the compliant form.",
          "Name any other check that could trip (e.g. if the screen is migrating).",
        ]}
        pitfalls={[
          "Assuming a passing tsc means CI will pass — generated guards/schemas can be stale.",
          "Using ../../lib instead of !lib (ESLint error).",
          "Forgetting build:swagger when the response schema changed.",
          "Editing only one side of a migrating screen.",
        ]}
        signal="A strong answer runs build:typeguards (and build:swagger if the schema changed), fixes the import to !lib/helper, and checks migrationConfig for the migrating case."
      />
      <SolutionReveal difficulty="medium">
        <p>
          The type change means <strong><code>typeguards-check</code></strong> will fail unless you
          run <code>npm run build:typeguards</code> and commit the regenerated guards — a green{" "}
          <code>tsc</code> says nothing about the committed guards being current. If{" "}
          <code>promoBadge</code> is part of the response schema, you also need{" "}
          <code>npm run build:swagger</code> or <strong><code>openapi-check</code></strong> fails on a
          stale <code>openapi.json</code>. The <code>../../lib/helper</code> import is an ESLint error
          — change it to <code>!lib/helper</code> (and keep imports alphabetized within their group).
          Finally, check <code>migrationConfig.ts</code>: if this screen is <code>migrating</code>,{" "}
          <strong><code>migration-check</code></strong> will flag that you changed the legacy contract
          but not the platform side, so mirror the field there too. Run the two codegen commands, fix
          the import, and reflect the migrating change — then the gauntlet is green.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Codegen is committed.</strong> Type guards, JSON schemas, and{" "}
          <code>openapi.json</code> are generated from types — a compiling change isn&apos;t
          necessarily complete.
        </li>
        <li>
          <strong><code>build:typeguards</code></strong> after interface changes in{" "}
          <code>elements/</code>/<code>domain/models/</code>; <strong><code>build:swagger</code></strong>{" "}
          after route spec/response-type changes.
        </li>
        <li>
          <strong>Imports are linted:</strong> <code>!</code> aliases cross-dir, no <code>../</code>{" "}
          parents, alphabetized groups, <code>addOn</code> not <code>addon</code>, plus{" "}
          <code>no-screen-function-registry</code>.
        </li>
        <li>
          <strong>A CI gauntlet gates every PR</strong> — typeguards, openapi, template-link,
          fixture, legacy-test, migration, and tests + SonarQube.
        </li>
        <li>
          <strong><code>HULU_ENV</code> matters:</strong> <code>local</code> uses fixtures,{" "}
          <code>test</code> pins <code>ci</code> — bare <code>jest</code> can select S3-backed config
          and ignore new local config.
        </li>
      </ul>
    </div>
  );
}
