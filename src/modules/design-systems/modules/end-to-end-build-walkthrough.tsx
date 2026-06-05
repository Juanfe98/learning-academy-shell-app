import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const repoDiagram = String.raw`flowchart TD
  ROOT["acme-ds/ (pnpm + turbo)"] --> TOK["packages/tokens"]
  ROOT --> REACT["packages/react"]
  ROOT --> DOCS["apps/docs (Storybook)"]
  TOK -->|"build: tokens.css + tokens.ts"| REACT
  REACT --> DOCS
  REACT -->|"changeset publish"| NPM["@acme/react on npm"]`;

const flowDiagram = String.raw`flowchart LR
  S1["1. Scaffold monorepo"] --> S2["2. Tokens package"]
  S2 --> S3["3. React package + first component"]
  S3 --> S4["4. Storybook + story"]
  S4 --> S5["5. Test (unit + axe)"]
  S5 --> S6["6. Build (tsup)"]
  S6 --> S7["7. Changesets release"]
  S7 --> S8["8. CI wires it together"]`;

export const toc: TocItem[] = [
  { id: "the-goal", title: "The Goal: One Real, Shippable Slice", level: 2 },
  { id: "step-1", title: "Step 1: Scaffold the Monorepo", level: 2 },
  { id: "step-2", title: "Step 2: The Tokens Package", level: 2 },
  { id: "step-3", title: "Step 3: The React Package + First Component", level: 2 },
  { id: "step-4", title: "Step 4: Storybook & a Story", level: 2 },
  { id: "step-5", title: "Step 5: Test It", level: 2 },
  { id: "step-6", title: "Step 6: Build for Distribution", level: 2 },
  { id: "step-7", title: "Step 7: Version & Publish", level: 2 },
  { id: "step-8", title: "Step 8: Wire CI", level: 2 },
  { id: "consume", title: "Consuming It in an App", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EndToEndBuildWalkthrough() {
  return (
    <div className="article-content">
      <p>
        This is the module that turns everything you&rsquo;ve learned into one followable build. The
        strategic capstone gave you the <em>roadmap</em>; this gives you the <em>actual commands and
        files</em> to stand up a real, publishable design system — a tokens package and a styled,
        documented, tested, published <code>Button</code> — from an empty folder. It&rsquo;s
        deliberately a thin vertical slice (one component, end to end) because a working
        tokens-to-npm pipeline teaches more than fifty unpublished components. Follow it and you have
        a system you can actually extend.
      </p>

      <h2 id="the-goal">The Goal: One Real, Shippable Slice</h2>
      <p>
        We&rsquo;re building <code>@acme/tokens</code> and <code>@acme/react</code> in a pnpm +
        Turborepo monorepo, documented in Storybook, tested with Vitest + axe, built with tsup,
        versioned with Changesets, and validated in CI. Every step uses tools from earlier modules —
        this is where they connect.
      </p>

      <MermaidDiagram
        chart={repoDiagram}
        title="What we're building"
        caption="A two-package monorepo: tokens feed the React package, which is documented in Storybook and published to npm."
        minHeight={320}
      />
      <MermaidDiagram
        chart={flowDiagram}
        title="The eight steps"
        caption="Scaffold → tokens → component → docs → test → build → release → CI. A complete vertical slice."
        minHeight={200}
      />

      <h2 id="step-1">Step 1: Scaffold the Monorepo</h2>
      <CodeBlock
        code={`mkdir acme-ds && cd acme-ds
pnpm init
git init

# Workspace + turbo
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "packages/*"
  - "apps/*"
EOF

pnpm add -D -w turbo typescript

cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": {}, "lint": {}
  }
}
EOF

mkdir -p packages/tokens packages/react apps/docs`}
        lang="bash"
        filename="step-1-scaffold.sh"
      />

      <h2 id="step-2">Step 2: The Tokens Package</h2>
      <p>
        Tokens first, always. A minimal Style Dictionary setup that emits CSS variables and a typed
        TS object.
      </p>

      <CodeBlock
        code={`# packages/tokens/package.json
{
  "name": "@acme/tokens",
  "version": "0.0.0",
  "type": "module",
  "exports": { "./tokens.css": "./dist/tokens.css", ".": "./dist/tokens.js" },
  "files": ["dist"],
  "scripts": { "build": "style-dictionary build" },
  "devDependencies": { "style-dictionary": "^4" }
}`}
        lang="json"
        filename="packages/tokens/package.json"
      />

      <CodeBlock
        code={`// packages/tokens/tokens/color.json  (DTCG, primitive + semantic)
{
  "color": {
    "blue": { "600": { "$value": "#4f46e5", "$type": "color" } },
    "white": { "$value": "#ffffff", "$type": "color" },
    "action": {
      "primary": { "$value": "{color.blue.600}", "$type": "color" },
      "on-primary": { "$value": "{color.white}", "$type": "color" }
    }
  },
  "space": { "3": { "$value": "12px", "$type": "dimension" }, "4": { "$value": "16px", "$type": "dimension" } },
  "radius": { "md": { "$value": "8px", "$type": "dimension" } }
}

// packages/tokens/config.js
export default {
  source: ["tokens/**/*.json"],
  platforms: {
    css: { transformGroup: "css", buildPath: "dist/",
      files: [{ destination: "tokens.css", format: "css/variables", options: { outputReferences: true } }] },
    js: { transformGroup: "js", buildPath: "dist/",
      files: [{ destination: "tokens.js", format: "javascript/es6" }] },
  },
};
// pnpm --filter @acme/tokens build  ->  dist/tokens.css with :root { --color-action-primary: var(--color-blue-600); ... }`}
        lang="javascript"
        filename="packages/tokens/tokens"
      />

      <h2 id="step-3">Step 3: The React Package + First Component</h2>
      <p>
        The component package depends on tokens via the workspace protocol, puts React in peer deps,
        and ships a real Button consuming semantic tokens.
      </p>

      <CodeBlock
        code={`# packages/react/package.json
{
  "name": "@acme/react",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": ["*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./styles.css": "./dist/index.css"
  },
  "files": ["dist"],
  "scripts": { "build": "tsup", "test": "vitest run", "typecheck": "tsc --noEmit" },
  "dependencies": { "clsx": "^2", "@acme/tokens": "workspace:*" },
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" },
  "devDependencies": { "tsup": "^8", "vitest": "^2", "vitest-axe": "^0.1", "@testing-library/react": "^16" }
}`}
        lang="json"
        filename="packages/react/package.json"
      />

      <CodeBlock
        code={`// packages/react/src/Button.tsx
import { forwardRef } from "react";
import { clsx } from "clsx";
import "./button.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props }, ref) {
  return <button ref={ref} className={clsx("acme-btn", \`acme-btn--\${variant}\`, \`acme-btn--\${size}\`, className)} {...props} />;
});

// packages/react/src/button.css  (references semantic tokens only)
// .acme-btn { border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); font: inherit; cursor: pointer; }
// .acme-btn--primary { background: var(--color-action-primary); color: var(--color-action-on-primary); border: 0; }
// .acme-btn--ghost { background: transparent; color: var(--color-action-primary); }

// packages/react/src/index.ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";`}
        lang="tsx"
        filename="packages/react/src/Button.tsx"
      />

      <h2 id="step-4">Step 4: Storybook & a Story</h2>
      <CodeBlock
        code={`// apps/docs — Storybook (npx storybook@latest init), then a story:
// packages/react/src/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import "@acme/tokens/tokens.css";   // load token variables in docs

const meta: Meta<typeof Button> = {
  title: "Components/Button", component: Button, tags: ["autodocs"],
  args: { children: "Click me" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };`}
        lang="tsx"
        filename="Button.stories.tsx"
      />

      <h2 id="step-5">Step 5: Test It</h2>
      <CodeBlock
        code={`// packages/react/src/Button.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Button } from "./Button";

test("fires onClick and exposes its accessible name", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledOnce();
});

test("has no a11y violations", async () => {
  const { container } = render(<Button>Save</Button>);
  expect(await axe(container)).toHaveNoViolations();
});
// pnpm --filter @acme/react test`}
        lang="tsx"
        filename="Button.test.tsx"
      />

      <h2 id="step-6">Step 6: Build for Distribution</h2>
      <CodeBlock
        code={`// packages/react/tsup.config.ts — library build (ESM + types + CSS), React external
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  treeshake: true,
  splitting: true,
  external: ["react", "react-dom"],   // peer deps, never bundled
  injectStyle: false,                  // emit a separate .css consumers import
});
// pnpm --filter @acme/react build  ->  dist/index.js, dist/index.d.ts, dist/index.css
// Validate before publishing:  pnpm dlx publint  &&  pnpm dlx @arethetypeswrong/cli --pack`}
        lang="typescript"
        filename="packages/react/tsup.config.ts"
      />

      <h2 id="step-7">Step 7: Version & Publish</h2>
      <CodeBlock
        code={`pnpm add -D -w @changesets/cli
pnpm changeset init

# Record intent for the first release:
pnpm changeset            # choose @acme/tokens + @acme/react, "minor", describe change

# Apply versions + changelogs, then publish:
pnpm changeset version    # 0.0.0 -> 0.1.0, writes CHANGELOG.md
pnpm -r build             # build all packages
pnpm changeset publish    # publishes @acme/tokens@0.1.0 and @acme/react@0.1.0 to npm`}
        lang="bash"
        filename="step-7-release.sh"
      />

      <ArticleTable
        caption="The slice maps every earlier module to a concrete artifact."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Module</th><th>Artifact in this build</th></tr>
          </thead>
          <tbody>
            <tr><td>Design Tokens</td><td><code>packages/tokens</code> + Style Dictionary config</td></tr>
            <tr><td>Component Architecture</td><td><code>Button</code> (forwardRef, native props, variants)</td></tr>
            <tr><td>Documentation</td><td>Storybook + autodocs story</td></tr>
            <tr><td>Testing</td><td>Vitest + vitest-axe</td></tr>
            <tr><td>Distribution</td><td>tsup ESM build, exports map, peer deps</td></tr>
            <tr><td>Versioning</td><td>Changesets release</td></tr>
            <tr><td>CI/CD</td><td>validate + release workflows (step 8)</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="step-8">Step 8: Wire CI</h2>
      <p>
        Add the <code>validate.yml</code> and <code>release.yml</code> workflows from the CI/CD
        module. Now every PR runs typecheck/lint/test/build via Turborepo, and merging to main
        opens a Version Packages PR that publishes on merge. The pipeline is complete.
      </p>

      <h2 id="consume">Consuming It in an App</h2>
      <CodeBlock
        code={`# In any product app:
pnpm add @acme/react @acme/tokens

# app entry (once): load token variables
import "@acme/tokens/tokens.css";
import "@acme/react/styles.css";

# use the component:
import { Button } from "@acme/react";
export default function Page() {
  return <Button variant="primary" onClick={() => alert("hi")}>Get started</Button>;
}`}
        lang="bash"
        filename="consume.sh"
      />
      <p>
        That&rsquo;s a complete design system: real package, real tokens, documented, tested,
        published, consumable. From here you extend it — add layout primitives, the Field/forms layer,
        a Combobox on Radix, an icon pipeline — each following the exact same path through these eight
        steps.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through standing up a design system end to end.'"
        intro="This is the synthesis question. Give the ordered, concrete pipeline and stress the thin-vertical-slice philosophy."
        steps={[
          "Scaffold a pnpm + Turborepo monorepo; create tokens and react packages with downward dependencies.",
          "Tokens FIRST: Style Dictionary emits CSS variables + typed TS; the component package consumes semantic tokens via workspace protocol.",
          "Build one real component (forwardRef, native props, variants, token CSS), document it in Storybook (autodocs), test with Vitest + axe.",
          "Build as a LIBRARY with tsup (ESM, dts, React external, sideEffects for CSS); validate with publint; release with Changesets.",
          "Wire CI (validate on PR, Changesets release on merge). Emphasize shipping a thin vertical slice (one component end-to-end) before going wide.",
        ]}
      />

      <InterviewChallenge
        title="Add a second package the right way"
        scenario={
          <>
            Your <code>@acme/react</code> + <code>@acme/tokens</code> slice is live. Now you need to
            add an icon set as <code>@acme/icons</code> that the React components can use, without
            breaking the existing release flow or consumers.
          </>
        }
        tasks={[
          "Place the new package correctly in the dependency graph and workspace.",
          "Wire it into the build, release, and CI so it ships alongside the others.",
          "Version it without forcing an unnecessary major on consumers.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Graph/workspace:</strong> add <code>packages/icons</code> (covered by{" "}
          <code>packages/*</code> in <code>pnpm-workspace.yaml</code>). It depends on nothing (or just
          tokens for sizing); <code>@acme/react</code> adds <code>&quot;@acme/icons&quot;:
          &quot;workspace:*&quot;</code> as a dependency. Dependencies still flow downward
          (react → icons → tokens), no cycles.
        </p>
        <p>
          <strong>Build/release/CI:</strong> give it the same <code>build</code> script (SVGR/tsup)
          so Turborepo&rsquo;s <code>^build</code> ordering builds icons before react. Changesets
          auto-detects the new package; no workflow changes needed. CI&rsquo;s affected-detection now
          rebuilds react whenever icons change.
        </p>
        <p>
          <strong>Versioning:</strong> adding a <em>new</em> package is a fresh <code>0.x</code> /
          initial release for <code>@acme/icons</code>, and exposing icons through{" "}
          <code>@acme/react</code> is an additive feature → a <strong>minor</strong> bump on
          <code>@acme/react</code>, not a major. Changesets handles the linked bump: a changeset
          marking <code>@acme/icons</code> minor and <code>@acme/react</code> minor publishes both
          with correct versions and changelogs, and existing consumers upgrade safely.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A real design system is a <strong>thin vertical slice first</strong>: tokens + one
          published, documented, tested component — then extend.
        </li>
        <li>
          The eight steps: <strong>scaffold → tokens → component → docs → test → build → release →
          CI</strong>, each using a tool from earlier modules.
        </li>
        <li>
          Tokens package emits <strong>CSS variables + typed TS</strong>; the component package
          consumes semantic tokens via the <strong>workspace protocol</strong>.
        </li>
        <li>
          Build as a <strong>library</strong> (tsup: ESM, dts, React external, CSS side-effect);
          validate with <strong>publint</strong>; release with <strong>Changesets</strong>.
        </li>
        <li>
          Adding more packages/components follows the <strong>same path</strong> — the pipeline is the
          reusable part.
        </li>
      </ul>
    </div>
  );
}
