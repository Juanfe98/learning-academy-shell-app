import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const monorepoDiagram = String.raw`flowchart TD
  ROOT["cgi-web (pnpm workspace + Turbo)"]
  ROOT --> APPS["apps/commerce/{disneyPlus,hulu,espn}"]
  ROOT --> CB["packages/cgi/commerce-base"]
  ROOT --> DI["packages/cgi/data-interface-*"]
  APPS -->|"import src/*"| CB
  APPS -->|"turbo dev --filter"| RUN["dev server for one brand"]
  CB -->|"dependsOn ^build"| DI`;

const productDiagram = String.raw`flowchart LR
  CMD["pnpm dev:commerce:hulu"]
  CMD --> TURBO["turbo dev --filter=@solo/commerce-hulu"]
  TURBO --> ENV["PORT=5030 PRODUCT=hulu next dev"]
  ENV --> PROD["PRODUCT selects tenant<br/>config + dictionary fixtures"]
  ENV --> MOCK["NEXT_PUBLIC_API_MOCKING=enabled?<br/>→ MSW browser worker"]`;

const turboDiagram = String.raw`flowchart TD
  TASK["turbo <task> --filter=@solo/commerce-base"]
  TASK --> DEP["dependsOn: ^build<br/>(build deps first)"]
  DEP --> CACHE{"cached?"}
  CACHE -->|"yes"| HIT["replay outputs instantly"]
  CACHE -->|"no"| RUN["run + cache outputs (remote cache)"]`;

const vrtDiagram = String.raw`sequenceDiagram
  participant SB as Storybook (build + serve static)
  participant TR as test-runner
  participant Sauce as Sauce Labs Visual
  SB->>TR: stories with tag run-saucelabs
  TR->>TR: postVisit(page, context)
  TR->>Sauce: upload screenshot
  Sauce-->>TR: diff vs baseline (branch)`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "monorepo", title: "The Monorepo: pnpm + Turbo", level: 2 },
  { id: "product-env", title: "PRODUCT and API Mocking: The Two Switches", level: 2 },
  { id: "dev", title: "Running a Brand Locally", level: 2 },
  { id: "turbo", title: "How Turbo Tasks Work", level: 2 },
  { id: "lint", title: "Lint, Type-Check, and the Test Rules", level: 2 },
  { id: "storybook", title: "Storybook and Visual Regression", level: 2 },
  { id: "next-config", title: "The Next Config Bridge", level: 3 },
  { id: "commands", title: "The Command Cheat Sheet", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Diagnose a Local Setup", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function DevBuildTooling() {
  return (
    <div className="article-content">
      <p>
        commerce-base doesn&apos;t run on its own — it&apos;s built and served by the brand apps
        inside a pnpm + Turbo monorepo. This module covers the tooling you touch daily: how to run one
        brand locally, the two environment switches (<code>PRODUCT</code> and API mocking) that
        control everything, how Turbo caching decides whether your command actually executes, and the
        lint/type-check/VRT gates a PR must pass. Fluency here removes the &quot;why won&apos;t it
        start?&quot; friction from every ticket.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Most local-setup confusion is really confusion about two things:{" "}
        <em>which brand am I running</em> (<code>PRODUCT</code>) and <em>am I mocking the network</em>{" "}
        (API mocking). Get those two straight and the dev loop is predictable. Add Turbo&apos;s caching
        model and you&apos;ll never again wonder why a command &quot;did nothing.&quot;
      </p>

      <h2 id="monorepo">The Monorepo: pnpm + Turbo</h2>
      <MermaidDiagram
        chart={monorepoDiagram}
        title="How the pieces fit"
        caption="Brand apps import commerce-base source and are the runnable units. Turbo orchestrates tasks across the workspace; pnpm is strictly enforced (preinstall runs only-allow pnpm)."
        minHeight={340}
      />
      <p>
        The root <code>package.json</code> has a <code>preinstall: npx only-allow pnpm</code> hook —
        npm/yarn are rejected. Brand apps are the runnable units; commerce-base is a dependency they
        transpile from source. Turbo&apos;s root <code>turbo.json</code> declares the pipeline (
        <code>build</code>, <code>dev</code>, <code>test</code>, <code>lint</code>,{" "}
        <code>test:coverage</code>) with a remote cache at{" "}
        <code>turborepo-cache-legacy.us-east-1.bamgrid.net</code>.
      </p>

      <h2 id="product-env">PRODUCT and API Mocking: The Two Switches</h2>
      <p>
        Two environment variables control the entire local experience:
      </p>
      <MermaidDiagram
        chart={productDiagram}
        title="The two switches"
        caption="PRODUCT selects the tenant (config + dictionary fixtures via getProductNameForMocks). NEXT_PUBLIC_API_MOCKING=enabled turns on the MSW browser worker so the app runs against mocks."
        minHeight={320}
      />
      <ArticleTable
        caption="The two switches and what they control."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Switch</th>
              <th>Controls</th>
              <th>Read by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>PRODUCT=disney|hulu|espn</code></td>
              <td>Which tenant&apos;s config + dictionary fixtures load</td>
              <td><code>getProductNameForMocks()</code></td>
            </tr>
            <tr>
              <td><code>NEXT_PUBLIC_API_MOCKING=enabled</code></td>
              <td>Turns on the MSW browser worker (mock the network)</td>
              <td>Dev/integration + Storybook</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <code>getProductNameForMocks()</code> resolves the tenant from <code>process.env.PRODUCT</code>,
        falling back to <code>publicRuntimeConfig.productNameForMocks</code>, else{" "}
        <code>&apos;disneyPlus&apos;</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/lib/get-product-name-for-mocks.ts"
        code={`export const getProductNameForMocks = () => {
  return (process.env.PRODUCT ||
    getConfig()?.publicRuntimeConfig?.productNameForMocks ||
    'disneyPlus') as ProductName;
};`}
      />

      <h2 id="dev">Running a Brand Locally</h2>
      <p>
        The root scripts fan out to Turbo, which runs the brand app&apos;s dev command. From the root
        and the Hulu app:
      </p>
      <CodeBlock
        lang="bash"
        filename="terminal"
        code={`# Root: pick a brand
pnpm dev:commerce:hulu       # -> turbo dev --filter=@solo/commerce-hulu
pnpm dev:commerce:disney
pnpm dev:commerce:espn

# Integration mode = dev + API mocking on
pnpm dev:commerce:integration:hulu   # -> turbo dev:integration --filter=...`}
      />
      <CodeBlock
        lang="json"
        filename="apps/commerce/hulu/package.json"
        code={`{
  "dev": "pnpm -w check-commerce-secrets && pnpm prebuild && npm run dev:start",
  "dev:integration": "NEXT_PUBLIC_API_MOCKING=enabled npm run dev:start",
  "dev:start": "pnpm run local-setup concurrently ... \"PORT=5030 PRODUCT=hulu next dev\"",
  "test:playwright": "pnpm clean:coverage:playwright && PRODUCT=hulu playwright test --ui"
}`}
      />
      <p>
        So <code>dev</code> checks secrets, runs a <code>prebuild</code> (dictionary/codegen), and
        starts Next with <code>PRODUCT=hulu</code>. <code>dev:integration</code> is the same but with{" "}
        <code>NEXT_PUBLIC_API_MOCKING=enabled</code> so the MSW browser worker serves the app —
        exactly the mode Playwright E2E and integration testing use.
      </p>

      <h2 id="turbo">How Turbo Tasks Work</h2>
      <p>
        commerce-base&apos;s <code>turbo.json</code> extends the root and defines its tasks with{" "}
        <code>dependsOn: [&quot;^build&quot;]</code> — meaning dependencies build first. The payoff is
        caching:
      </p>
      <MermaidDiagram
        chart={turboDiagram}
        title="Turbo task execution + caching"
        caption="Turbo builds dependencies first (^build), then checks the cache. A cache hit replays outputs instantly — which is why a command can 'do nothing' if inputs are unchanged. The remote cache shares hits across machines/CI."
        minHeight={340}
      />
      <p>
        Practical consequence: if you run <code>turbo build</code> and see it finish instantly with
        &quot;cache hit,&quot; nothing recompiled — Turbo replayed cached outputs because the inputs
        didn&apos;t change. To force work, change an input or clear the cache. Filter to one package
        with <code>--filter=@solo/commerce-base</code>.
      </p>

      <h2 id="lint">Lint, Type-Check, and the Test Rules</h2>
      <ArticleTable
        caption="The quality gates."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>lint</code></td>
              <td><code>eslint --cache .</code> + <code>stylelint</code></td>
            </tr>
            <tr>
              <td><code>lint:type-check</code></td>
              <td><code>tsc -p tsconfig.json --noEmit</code></td>
            </tr>
            <tr>
              <td><code>lint:language</code></td>
              <td><code>alex -w</code> (inclusive-language check)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The ESLint flat config adds notable rules for the repo&apos;s conventions: the RTL-friendly
        plugin (enforcing logical CSS properties from the region module),{" "}
        <code>stylelint-plugin-logical-css</code>, the jest/testing-library rule set (including{" "}
        <code>require-owner-tag</code> for the team tags), and the ban on importing the singleton{" "}
        <code>queryClient</code> in tests. Type-check is separate from build — TS errors surface at{" "}
        <code>tsc --noEmit</code>, so run it before assuming a green build.
      </p>

      <h2 id="storybook">Storybook and Visual Regression</h2>
      <p>
        There are <strong>262</strong> <code>*.stories.tsx</code> files. Storybook (
        <code>@storybook/nextjs</code>) provides per-tenant CSS, an MSW worker seeded with the
        selected tenant&apos;s handlers, and a <strong>Direction (LTR/RTL/unset)</strong> toolbar for
        checking RTL layouts. Visual regression runs through Sauce Labs:
      </p>
      <MermaidDiagram
        chart={vrtDiagram}
        title="Visual regression flow"
        caption="Only stories tagged run-saucelabs are captured; the test-runner's postVisit uploads screenshots to Sauce Labs, which diffs against a per-branch baseline. VRT catches unintended visual changes tests can't."
        minHeight={300}
      />
      <p>
        Key scripts: <code>build:storybook</code> (builds + <code>npx msw init</code>),{" "}
        <code>storybook</code> (dev on 6006 with mocking enabled), <code>test:storybook</code> (Sauce
        run), <code>vrt:local</code>/<code>vrt:ci</code>, and <code>vrt:baseline-merge</code>. A story
        pins <code>{"sauceVisual: { delay: 2000 }"}</code> so screenshots capture after animations
        settle.
      </p>

      <h3 id="next-config">The Next Config Bridge</h3>
      <p>
        One subtle but important line: <code>commerce-base/next.config.js</code> sets{" "}
        <code>publicRuntimeConfig.productNameForMocks</code> only in non-prod. That&apos;s the bridge
        letting <code>getProductNameForMocks()</code> read the tenant on the <em>client</em> during
        local/test — in production the value is <code>undefined</code> (real config is used, not
        fixtures). <code>pageExtensions</code> is <code>[&apos;page.tsx&apos;, &apos;api.ts&apos;]</code>, which is why routes are named{" "}
        <code>index.page.tsx</code>.
      </p>

      <h2 id="commands">The Command Cheat Sheet</h2>
      <CodeBlock
        lang="bash"
        filename="daily commands"
        code={`# Dev (pick brand)
pnpm dev:commerce:hulu
pnpm dev:commerce:integration:hulu     # dev + MSW mocking

# Test
pnpm turbo test --filter=@solo/commerce-base
pnpm test:commerce-base:coverage       # PRODUCT=disneyPlus jest --coverage
pnpm test:commerce-base:coverage:report

# Lint / types
pnpm turbo lint --filter=@solo/commerce-base
pnpm turbo lint:type-check --filter=@solo/commerce-base

# Build (one package)
pnpm turbo build --filter=@solo/commerce-base

# Storybook / VRT
pnpm turbo build:storybook --filter=@solo/commerce-base`}
      />

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you run and build commerce-base?'"
        intro="Lead with the monorepo shape, then the two switches, then Turbo caching."
        steps={[
          "It's a pnpm + Turbo monorepo (pnpm strictly enforced via only-allow). Brand apps are the runnable units; commerce-base is transpiled from source, not built into an artifact.",
          "Two switches control local dev: PRODUCT (tenant config + dictionary fixtures via getProductNameForMocks) and NEXT_PUBLIC_API_MOCKING=enabled (MSW browser worker). dev:integration = dev + mocking.",
          "Turbo tasks dependsOn ^build and cache aggressively (remote cache) — a 'cache hit' means nothing recompiled; change inputs or clear cache to force work; --filter scopes to a package.",
          "Quality gates: eslint + stylelint (lint), tsc --noEmit (lint:type-check, separate from build), alex (lint:language); notable rules enforce logical CSS, owner tags, and the no-singleton-queryClient-in-tests rule.",
          "Storybook + Sauce Labs VRT (262 stories, LTR/RTL toolbar); next.config's publicRuntimeConfig.productNameForMocks bridges PRODUCT to the client in non-prod, and pageExtensions is why routes are *.page.tsx.",
        ]}
      />

      <h2 id="challenge">Challenge: Diagnose a Local Setup</h2>
      <InterviewChallenge
        title="A teammate's local Hulu app shows Disney+ copy and hits the real network"
        scenario={
          <>
            A teammate reports that their local environment shows Disney+ dictionary strings even
            though they think they&apos;re running Hulu, and network requests are hitting real
            backends instead of mocks. Diagnose both problems using the two switches and the tooling
            from this module.
          </>
        }
        tasks={[
          "Explain why the app defaults to Disney+ copy and how PRODUCT fixes it.",
          "Explain why requests hit the real network and which switch enables mocking.",
          "Name the command that sets both correctly for a mocked Hulu dev session.",
          "Mention how Turbo caching could make it look like a config change 'did nothing.'",
        ]}
        pitfalls={[
          "Assuming a code bug when it's an env-var/switch problem.",
          "Turning on mocking but forgetting PRODUCT (or vice versa).",
          "Re-running a build after a config change and seeing a cache hit, concluding it didn't apply.",
        ]}
        signal="A strong answer identifies that PRODUCT defaults to disneyPlus (so unset = Disney+ copy) and that NEXT_PUBLIC_API_MOCKING must be 'enabled' for the MSW worker, prescribes pnpm dev:commerce:integration:hulu (PRODUCT=hulu + mocking), and notes a Turbo cache hit can mask whether a change recompiled."
      />
      <SolutionReveal difficulty="easy">
        <p>
          <strong>Disney+ copy:</strong> <code>getProductNameForMocks()</code> falls back to{" "}
          <code>&apos;disneyPlus&apos;</code> when <code>PRODUCT</code> is unset. So the teammate
          isn&apos;t really running Hulu — they&apos;re running the default tenant. Setting{" "}
          <code>PRODUCT=hulu</code> (which the Hulu dev script does) loads Hulu&apos;s config and
          dictionary fixtures.
        </p>
        <p>
          <strong>Real network:</strong> the MSW browser worker only runs when{" "}
          <code>NEXT_PUBLIC_API_MOCKING=enabled</code>. Plain <code>dev</code> doesn&apos;t set it;{" "}
          <code>dev:integration</code> does. The single command that fixes both is{" "}
          <code>pnpm dev:commerce:integration:hulu</code> — it runs the Hulu dev server (
          <code>PRODUCT=hulu</code>) with mocking enabled. Finally, if they changed a config and
          re-ran a build seeing an instant &quot;cache hit,&quot; Turbo replayed cached outputs —
          they may need to change an input or clear the cache to actually recompile.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>pnpm + Turbo monorepo.</strong> Brand apps are runnable; commerce-base is
          transpiled from source. pnpm is enforced.
        </li>
        <li>
          <strong>Two switches.</strong> <code>PRODUCT</code> = tenant (default{" "}
          <code>disneyPlus</code>); <code>NEXT_PUBLIC_API_MOCKING=enabled</code> = MSW worker.{" "}
          <code>dev:integration</code> = both.
        </li>
        <li>
          <strong>Turbo caches aggressively.</strong> A &quot;cache hit&quot; means nothing ran;{" "}
          <code>--filter</code> scopes to a package.
        </li>
        <li>
          <strong>Gates.</strong> <code>lint</code> (eslint + stylelint), <code>lint:type-check</code>{" "}
          (<code>tsc --noEmit</code>, separate from build), <code>alex</code>.
        </li>
        <li>
          <strong>Storybook + Sauce VRT.</strong> Per-tenant CSS, RTL toolbar; routes are{" "}
          <code>*.page.tsx</code> via <code>pageExtensions</code>.
        </li>
      </ul>
    </div>
  );
}
