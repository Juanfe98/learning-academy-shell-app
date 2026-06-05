import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const monorepoDiagram = String.raw`flowchart TD
  subgraph Monorepo
    TOK["packages/tokens"] --> PRIM["packages/primitives"]
    TOK --> REACT["packages/react"]
    PRIM --> REACT
    ICON["packages/icons"] --> REACT
    REACT --> DOCS["apps/docs (Storybook)"]
    REACT --> PLAY["apps/playground"]
  end
  REACT --> NPM["Published to npm<br/>@acme/react"]
  TOK --> NPM2["@acme/tokens"]`;

const bundleDiagram = String.raw`flowchart LR
  SRC["src/*.tsx<br/>(TS, ESM)"] --> BUILD["tsup / Vite lib mode"]
  BUILD --> ESM["dist/index.js<br/>(ESM)"]
  BUILD --> CJS["dist/index.cjs<br/>(CJS fallback)"]
  BUILD --> DTS["dist/index.d.ts<br/>(types)"]
  ESM --> EXPORTS["package.json exports map"]
  CJS --> EXPORTS
  DTS --> EXPORTS
  EXPORTS --> CONS["Consumer bundler<br/>tree-shakes unused code"]`;

export const toc: TocItem[] = [
  { id: "why-monorepo", title: "Why a Monorepo", level: 2 },
  { id: "package-topology", title: "Package Topology", level: 2 },
  { id: "workspaces", title: "Workspaces & Turborepo", level: 3 },
  { id: "building", title: "Building Libraries (Not Apps)", level: 2 },
  { id: "exports", title: "The package.json exports Map", level: 3 },
  { id: "tree-shaking", title: "Tree-Shaking & sideEffects", level: 2 },
  { id: "peer-deps", title: "Peer Dependencies", level: 2 },
  { id: "publishing", title: "Publishing to npm", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function MonorepoBuildAndDistribution() {
  return (
    <div className="article-content">
      <p>
        A design system is <em>shipped software</em>: it gets built, versioned, published to a
        registry, and installed by consumers. How you package and distribute it determines whether
        consumers get fast builds, small bundles, and good types — or bloated apps and dependency
        hell. This module covers the monorepo structure nearly every serious system uses, how to
        bundle a <em>library</em> (different from bundling an app), and the packaging details
        (exports maps, tree-shaking, peer deps) that separate a professional package from an
        amateur one.
      </p>

      <h2 id="why-monorepo">Why a Monorepo</h2>
      <p>
        Design systems are naturally multi-package: tokens, icons, headless primitives, styled
        components, docs, maybe per-framework packages. A <strong>monorepo</strong> keeps them in
        one repository with shared tooling and atomic cross-package changes — change a token and
        update the component that uses it in <em>one</em> commit and PR, with one CI run. The
        alternative (a repo per package) means coordinating versioned releases across repos just to
        make a single logical change, which is miserable. The tradeoff is more upfront tooling
        (workspaces, a task runner), which is why dedicated tools exist.
      </p>

      <h2 id="package-topology">Package Topology</h2>
      <MermaidDiagram
        chart={monorepoDiagram}
        title="A typical design-system monorepo"
        caption="Packages depend downward (react → primitives → tokens); apps (docs, playground) consume the packages; publishable packages go to npm."
        minHeight={460}
      />
      <p>
        The golden rule from the foundations module holds: <strong>dependencies flow
        downward</strong>. <code>tokens</code> depends on nothing; <code>primitives</code> depends
        on <code>tokens</code>; <code>react</code> depends on both. A token package importing a
        component is a cycle and a design smell.
      </p>

      <h3 id="workspaces">Workspaces & Turborepo</h3>
      <p>
        <strong>pnpm workspaces</strong> (or npm/yarn workspaces) link local packages so{" "}
        <code>@acme/react</code> can import <code>@acme/tokens</code> by name during development,
        resolving to the local source — no publishing between every change.{" "}
        <strong>Turborepo</strong> (or Nx) layers on top to orchestrate and <em>cache</em> tasks:
        it builds packages in dependency order and skips work whose inputs haven&rsquo;t changed,
        turning a multi-minute monorepo build into seconds.
      </p>

      <CodeBlock
        code={`# pnpm-workspace.yaml — declare where packages live
packages:
  - "packages/*"
  - "apps/*"

# Local dependency uses the workspace protocol — always the local version:
# packages/react/package.json
{
  "name": "@acme/react",
  "dependencies": { "@acme/tokens": "workspace:*" }
}

# turbo.json — cache build outputs, run in dependency order
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }
  }
}`}
        lang="yaml"
        filename="workspace-config"
      />

      <h2 id="building">Building Libraries (Not Apps)</h2>
      <p>
        A critical distinction interviewers probe: <strong>bundling a library is the opposite of
        bundling an app</strong>. An app bundle inlines everything into a few optimized files for a
        browser. A <em>library</em> should ship mostly-unbundled, preserve module boundaries, output
        both ESM and (often) CJS, externalize dependencies, and emit type declarations — so the{" "}
        <em>consumer&rsquo;s</em> bundler can tree-shake and optimize. Tools:{" "}
        <strong>tsup</strong> (zero-config, esbuild-based — the popular default), Vite library mode,
        or Rollup.
      </p>

      <MermaidDiagram
        chart={bundleDiagram}
        title="Library build outputs"
        caption="A library emits ESM, an optional CJS fallback, and type declarations, wired through the exports map so the consumer's bundler can tree-shake."
        minHeight={360}
      />

      <CodeBlock
        code={`// tsup.config.ts — build a tree-shakeable component library
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],     // ESM first; CJS for older consumers
  dts: true,                  // emit .d.ts type declarations
  treeshake: true,
  external: ["react", "react-dom"],  // DON'T bundle peer deps
  splitting: true,            // preserve module boundaries for tree-shaking
});`}
        lang="typescript"
        filename="tsup.config.ts"
      />

      <h3 id="exports">The package.json exports Map</h3>
      <p>
        The modern <code>exports</code> field is how you expose entry points and serve the right
        format (ESM vs CJS) and types to each consumer. It also <strong>encapsulates</strong> your
        package — only listed paths are importable, so internals stay private. Getting{" "}
        <code>exports</code>, <code>main</code>, <code>module</code>, and <code>types</code> right
        is the difference between &ldquo;it just works&rdquo; and cryptic resolution errors in
        consumers.
      </p>

      <CodeBlock
        code={`{
  "name": "@acme/react",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",     // ESM
      "require": "./dist/index.cjs"    // CJS fallback
    },
    "./styles.css": "./dist/styles.css"   // expose CSS explicitly
  },
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" }
}`}
        lang="json"
        filename="package.json"
      />

      <h2 id="tree-shaking">Tree-Shaking & sideEffects</h2>
      <p>
        Consumers should pay only for components they import — importing <code>Button</code>{" "}
        shouldn&rsquo;t pull in your entire library. This requires <strong>ESM output</strong>{" "}
        (statically analyzable) and the <code>&quot;sideEffects&quot;: false</code> flag, which
        tells bundlers your modules have no import-time side effects and unused exports can be
        dropped. The classic gotcha: <strong>CSS imports <em>are</em> side effects</strong> — if
        components <code>import &quot;./Button.css&quot;</code>, mark those files in a{" "}
        <code>sideEffects</code> array so the CSS isn&rsquo;t tree-shaken away.
      </p>

      <CodeBlock
        code={`// If component files import CSS, declare those as side-effectful so they survive:
{
  "sideEffects": ["*.css", "**/*.css"]
}
// Otherwise "sideEffects": false drops your styles and components render unstyled.

// Also avoid barrel-file traps that defeat tree-shaking in some bundlers:
// A massive index.ts re-exporting everything CAN pull in more than expected —
// prefer per-component entry points or ensure bundler handles it.`}
        lang="json"
        filename="side-effects.json"
      />

      <h2 id="peer-deps">Peer Dependencies</h2>
      <p>
        <code>react</code> and <code>react-dom</code> must be <strong>peer dependencies</strong>,
        not regular dependencies. If your library bundled its own React, a consumer would end up
        with two copies — breaking hooks (&ldquo;invalid hook call&rdquo;), context, and bloating
        the bundle. Peer deps say &ldquo;I need React, but use <em>yours</em>.&rdquo; The same
        applies to any singleton or framework the consumer already owns.
      </p>

      <ArticleTable
        caption="Dependency types and where each belongs in a design-system package."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Bundled / installed</th>
              <th>Use for</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>dependencies</code></td>
              <td>Installed with your pkg</td>
              <td>Internal libs the consumer shouldn&rsquo;t manage</td>
              <td><code>clsx</code>, <code>@radix-ui/*</code></td>
            </tr>
            <tr>
              <td><code>peerDependencies</code></td>
              <td>Consumer provides</td>
              <td>Frameworks / singletons consumer owns</td>
              <td><code>react</code>, <code>react-dom</code></td>
            </tr>
            <tr>
              <td><code>devDependencies</code></td>
              <td>Not shipped</td>
              <td>Build/test tooling</td>
              <td><code>tsup</code>, <code>vitest</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="publishing">Publishing to npm</h2>
      <p>
        Packages publish to the npm registry (public, or a private registry / GitHub Packages for
        internal systems), usually scoped (<code>@acme/react</code>). Two safeguards every quality
        package uses: a <code>files</code> allowlist (or <code>.npmignore</code>) so only{" "}
        <code>dist</code> ships — never source or tests — and <code>publint</code> /{" "}
        <code>arethetypeswrong</code> in CI to validate the exports map and type resolution before
        publish. Releases themselves are automated with Changesets, which is the entire next module.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you package and distribute a component library?'"
        intro="This separates engineers who've shipped a library from those who've only shipped apps. Lead with the library-vs-app bundling distinction."
        steps={[
          "Structure as a monorepo (pnpm workspaces + Turborepo) for atomic cross-package changes and cached builds; dependencies flow downward.",
          "Stress: bundling a library ≠ bundling an app — ship ESM (+ optional CJS), preserve module boundaries, externalize peer deps, emit .d.ts.",
          "Make it tree-shakeable: ESM output + sideEffects:false, but list CSS files as side effects or styles get dropped.",
          "React/react-dom must be peerDependencies to avoid duplicate-React 'invalid hook call' bugs.",
          "Get the package.json exports map right (types/import/require), ship only dist via a files allowlist, and validate with publint in CI.",
        ]}
      />

      <InterviewChallenge
        title="Debug the bloated bundle"
        scenario={
          <>
            A team installs your <code>@acme/react</code> library and imports a single{" "}
            <code>&lt;Badge /&gt;</code>. Their production bundle grows by 180KB. They also report
            an &ldquo;Invalid hook call&rdquo; error in some setups, and that your components render
            with no styles after their bundler runs.
          </>
        }
        tasks={[
          "Diagnose each of the three problems and its root cause in your packaging.",
          "Specify the exact package.json / build changes that fix them.",
          "Explain how you'd catch these before publishing next time.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>1) 180KB for one Badge → tree-shaking is broken.</strong> Likely CJS-only
            output (not statically analyzable) and/or missing <code>sideEffects</code>. Fix: emit
            ESM with <code>splitting</code>, set <code>&quot;sideEffects&quot;</code> correctly, and
            ensure the <code>exports</code>/<code>module</code> fields point bundlers at the ESM
            build so unused components are dropped.
          </p>
          <p>
            <strong>2) Invalid hook call → duplicate React.</strong> You bundled React as a regular
            dependency, so the consumer has two copies. Fix: move <code>react</code> /{" "}
            <code>react-dom</code> to <code>peerDependencies</code> and mark them{" "}
            <code>external</code> in the build config.
          </p>
          <p>
            <strong>3) No styles → CSS tree-shaken away.</strong> <code>sideEffects: false</code>{" "}
            told the bundler your CSS-importing modules are pure, so it dropped them. Fix: set{" "}
            <code>&quot;sideEffects&quot;: [&quot;*.css&quot;]</code> (or ship a single CSS file
            exposed via the exports map for consumers to import explicitly).
          </p>
          <p>
            <strong>Prevention:</strong> add <code>publint</code> and{" "}
            <code>arethetypeswrong</code> to CI, plus a smoke-test that installs the packed tarball
            in a fresh app and measures the bundle size of importing one component.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use a <strong>monorepo</strong> (pnpm workspaces + Turborepo) for atomic cross-package
          changes and cached builds; dependencies flow <strong>downward</strong>.
        </li>
        <li>
          <strong>Bundling a library ≠ an app</strong>: ship ESM (+ optional CJS), preserve module
          boundaries, externalize peer deps, and emit type declarations (tsup is the easy default).
        </li>
        <li>
          Enable tree-shaking with <strong>ESM + <code>sideEffects: false</code></strong> — but
          list CSS files as side effects or your styles get dropped.
        </li>
        <li>
          Put <strong>react/react-dom in peerDependencies</strong> to avoid duplicate-React
          &ldquo;invalid hook call&rdquo; bugs.
        </li>
        <li>
          Get the <strong><code>exports</code> map</strong> right and validate it with{" "}
          <code>publint</code> in CI; ship only <code>dist</code> via a <code>files</code> allowlist.
        </li>
      </ul>
    </div>
  );
}
