import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const roadmapDiagram = String.raw`flowchart TD
  P0["Phase 0: Audit + buy-in<br/>inventory existing UI, align stakeholders"] --> P1["Phase 1: Tokens<br/>color/type/space scales -> tokens.json"]
  P1 --> P2["Phase 2: Tooling + monorepo<br/>workspace, build, Storybook, CI"]
  P2 --> P3["Phase 3: First components<br/>Button, Input, the high-traffic few"]
  P3 --> P4["Phase 4: Docs + publish<br/>autodocs, guidelines, npm release"]
  P4 --> P5["Phase 5: Adoption + governance<br/>migrate a pilot team, RFCs, metrics"]
  P5 --> P1`;

const dependencyDiagram = String.raw`flowchart LR
  T["@acme/tokens"] --> P["@acme/primitives<br/>(Radix-based)"]
  T --> R["@acme/react"]
  P --> R
  R --> SB["Storybook docs"]
  R --> NPM["npm publish"]`;

export const toc: TocItem[] = [
  { id: "the-capstone", title: "The Capstone: Tying It Together", level: 2 },
  { id: "phase-0", title: "Phase 0: Audit & Buy-In", level: 2 },
  { id: "phase-1", title: "Phase 1: Tokens First", level: 2 },
  { id: "phase-2", title: "Phase 2: Repo, Tooling & Storybook", level: 2 },
  { id: "phase-3", title: "Phase 3: The First Components", level: 2 },
  { id: "phase-4", title: "Phase 4: Docs & Publish", level: 2 },
  { id: "phase-5", title: "Phase 5: Adoption & Governance", level: 2 },
  { id: "mvp", title: "What an MVP Looks Like", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function BuildingADesignSystemFromScratch() {
  return (
    <div className="article-content">
      <p>
        This is the capstone: a sequenced, end-to-end walkthrough that connects every previous
        module into one build. The most common failure when starting a design system is{" "}
        <strong>building in the wrong order</strong> — teams jump straight to components, skip
        tokens, ignore distribution, and forget adoption until it&rsquo;s too late. The right order
        follows the dependency graph from the foundations module: <strong>tokens → tooling →
        components → docs → adoption</strong>, shipping a thin slice end-to-end before going wide.
        Follow this and you have a defensible plan for the &ldquo;how would you build a design system
        from scratch?&rdquo; interview and for the real thing.
      </p>

      <h2 id="the-capstone">The Capstone: Tying It Together</h2>
      <MermaidDiagram
        chart={roadmapDiagram}
        title="The build roadmap"
        caption="Build bottom-up and thin-first: tokens, then tooling, then a few components, then docs and release, then adoption — iterating back as you grow."
        minHeight={460}
      />
      <p>
        The governing principle: <strong>ship a vertical slice early</strong>. A working
        tokens-to-published-Button pipeline in week three teaches you more (and builds more trust)
        than thirty unpublished components in month six. Go deep on the pipeline before wide on the
        catalog.
      </p>

      <h2 id="phase-0">Phase 0: Audit & Buy-In</h2>
      <p>
        Before writing code, do a <strong>UI inventory</strong>: screenshot every button, input,
        and color currently in the products. This does three things — it reveals the true scope of
        inconsistency (usually shocking, and a powerful argument for the project), it tells you
        which components are highest-traffic (build those first), and it surfaces the real values to
        consolidate into tokens. Pair it with <strong>stakeholder buy-in</strong>: a design system
        without leadership backing and at least one willing pilot team is a hobby project that
        won&rsquo;t get adopted.
      </p>

      <h2 id="phase-1">Phase 1: Tokens First</h2>
      <p>
        Always start with tokens — they&rsquo;re the foundation everything else consumes, and they
        deliver consistency value even before any component exists. Define the primitive scales
        (color ramps in OKLCH, a modular type scale, a 4-point spacing scale), then the semantic
        layer, in a DTCG <code>tokens.json</code>, and wire Style Dictionary to emit CSS variables.
      </p>

      <CodeBlock
        code={`// packages/tokens/src/tokens.json (excerpt) — primitive + semantic tiers
{
  "color": {
    "blue": { "600": { "$value": "oklch(0.55 0.2 255)", "$type": "color" } },
    "action": { "primary": { "$value": "{color.blue.600}", "$type": "color" } }
  },
  "space": { "4": { "$value": "16px", "$type": "dimension" } }
}

// Build emits dist/tokens.css:  :root { --color-action-primary: oklch(...); ... }
// + dist/tokens.ts for JS contexts. This package depends on NOTHING.`}
        lang="json"
        filename="packages/tokens/tokens.json"
      />

      <h2 id="phase-2">Phase 2: Repo, Tooling & Storybook</h2>
      <p>
        Stand up the monorepo and the build/test/docs pipeline <em>before</em> writing many
        components, so every component is born with a consistent build, types, tests, and a docs
        page. Concretely: a pnpm workspace, the package topology, tsup builds, Storybook with
        autodocs + the a11y addon, and CI running typecheck, tests, and visual regression.
      </p>

      <MermaidDiagram
        chart={dependencyDiagram}
        title="The starter package graph"
        caption="A minimal but correct topology: tokens at the base, a Radix-based primitives package, the styled react package, feeding Storybook and npm."
        minHeight={260}
      />

      <CodeBlock
        code={`acme-ds/
├─ package.json            # pnpm workspace root, turbo
├─ pnpm-workspace.yaml
├─ packages/
│  ├─ tokens/             # Style Dictionary -> CSS vars + TS
│  ├─ primitives/         # thin wrappers over Radix (optional early)
│  └─ react/              # styled components consuming tokens
└─ apps/
   └─ docs/               # Storybook (autodocs, a11y, interactions)

# CI gates from day one: tsc, vitest, axe, chromatic, publint`}
        lang="bash"
        filename="repo-layout"
      />

      <h2 id="phase-3">Phase 3: The First Components</h2>
      <p>
        Build the few highest-traffic components first — typically <code>Button</code>,{" "}
        <code>Input</code>, <code>Text</code>, and one overlay (<code>Dialog</code> or{" "}
        <code>Tooltip</code>) on a headless base. Apply everything from the architecture and a11y
        modules: extend native props, support controlled/uncontrolled where relevant, variants via
        cva, build overlays on Radix/React Aria, reference only semantic tokens.
      </p>

      <CodeBlock
        code={`import { cva, type VariantProps } from "class-variance-authority";
import "./button.css";   // references only semantic tokens (var(--color-action-primary))

const button = cva("ds-btn", {
  variants: {
    variant: { primary: "ds-btn--primary", ghost: "ds-btn--ghost", danger: "ds-btn--danger" },
    size: { sm: "ds-btn--sm", md: "ds-btn--md", lg: "ds-btn--lg" },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,   // native props for free
    VariantProps<typeof button> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, isLoading, className, children, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)}
            disabled={isLoading || props.disabled} aria-busy={isLoading} {...props}>
      {isLoading && <Spinner aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";`}
        lang="tsx"
        filename="packages/react/src/Button.tsx"
      />

      <h2 id="phase-4">Phase 4: Docs & Publish</h2>
      <p>
        Ship the vertical slice: stories for every state, autodocs API tables, MDX usage guidelines,
        and the first npm release via Changesets. Now a pilot team can actually{" "}
        <code>pnpm add @acme/react</code> and use a real, documented, versioned Button — the proof
        the whole pipeline works.
      </p>

      <h2 id="phase-5">Phase 5: Adoption & Governance</h2>
      <p>
        Migrate the pilot team first (proves value and surfaces gaps), then expand. Stand up the
        contribution model and RFC process, start tracking adoption metrics, and iterate the catalog
        based on real demand from the audit — not guesses. From here the loop repeats: new tokens,
        new components, always tokens-first and always shipped through the established pipeline.
      </p>

      <h3 id="mvp">What an MVP Looks Like</h3>
      <ArticleTable
        caption="A realistic v0.1 scope — thin but complete end-to-end, not a big-bang catalog."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>v0.1 (MVP)</th>
              <th>Deferred</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tokens</td>
              <td>Core color/type/space, light + dark</td>
              <td>Multi-brand, motion, high-contrast</td>
            </tr>
            <tr>
              <td>Components</td>
              <td>Button, Input, Text, Dialog</td>
              <td>Combobox, DataTable, DatePicker</td>
            </tr>
            <tr>
              <td>Docs</td>
              <td>Storybook + autodocs + usage</td>
              <td>Polished marketing docs site</td>
            </tr>
            <tr>
              <td>Process</td>
              <td>Changesets release, 1 pilot team</td>
              <td>Full RFC process, federated contribution</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you build a design system from scratch?'"
        intro="The interviewer wants a sequenced plan that respects dependencies and ships value early — not a wish-list of features."
        steps={[
          "Phase 0: audit existing UI (reveals scope + highest-traffic components) and secure buy-in + a pilot team.",
          "Build bottom-up: tokens FIRST (they deliver value before any component and everything consumes them), then tooling/monorepo/Storybook.",
          "Then a few high-traffic components on a headless base, applying API design + a11y best practices and referencing only semantic tokens.",
          "Ship a vertical slice early: docs + first npm release via Changesets, so a pilot team can actually use a real versioned component.",
          "Then adoption + governance: migrate the pilot, add RFCs, track metrics, iterate the catalog from real demand — loop back tokens-first.",
        ]}
      />

      <InterviewChallenge
        title="Your first 90 days"
        scenario={
          <>
            You&rsquo;re hired as the first design-system engineer at a 50-person company with three
            React products that share nothing. You have 90 days to show meaningful value or the
            initiative loses funding. There&rsquo;s a designer who&rsquo;s eager to help and one
            product team willing to be a guinea pig.
          </>
        }
        tasks={[
          "Lay out what you'd deliver in the 90 days and in what order.",
          "Justify why you would NOT spend the time building a big component catalog.",
          "Define the single most important thing to demonstrate by day 90.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Plan (thin vertical slice):</strong> Weeks 1–2 — UI audit across the three
            products + align with the eager designer on token values; this also produces the
            consistency-gap story for leadership. Weeks 3–4 — tokens package (light/dark) +
            monorepo + Storybook + CI. Weeks 5–8 — the 3–4 highest-traffic components from the audit
            (Button, Input, Text, Dialog on Radix), fully tested, documented, accessible. Weeks 9–12
            — publish to npm via Changesets and <strong>migrate the guinea-pig team&rsquo;s most
            visible screen</strong> onto the system, measuring before/after.
          </p>
          <p>
            <strong>Why not a big catalog:</strong> 50 half-finished components prove nothing and
            won&rsquo;t be adopted; a small set that&rsquo;s actually <em>shipped, documented, and
            running in production</em> proves the entire pipeline (tokens → component → docs →
            publish → adoption) works. Breadth without the pipeline is the classic way these
            initiatives die.
          </p>
          <p>
            <strong>The day-90 proof:</strong> a real product screen running on the published design
            system, with a visible consistency/velocity win the pilot team will vouch for. That
            single end-to-end success — not component count — is what secures continued funding and
            the next team&rsquo;s buy-in.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Build in dependency order: <strong>tokens → tooling → components → docs → adoption</strong>{" "}
          — the wrong order is the most common failure.
        </li>
        <li>
          <strong>Ship a vertical slice early</strong>: a tokens-to-published-Button pipeline beats
          a pile of unpublished components.
        </li>
        <li>
          Start with a <strong>UI audit + buy-in</strong> — it scopes the work, picks the
          first components, and proves the need.
        </li>
        <li>
          Stand up <strong>tooling and Storybook before</strong> writing many components, so each is
          born with build, types, tests, and docs.
        </li>
        <li>
          Build the <strong>few highest-traffic components</strong> on a headless base, referencing
          only semantic tokens.
        </li>
        <li>
          The MVP is <strong>thin but complete end-to-end</strong>; prove it by migrating a pilot
          team, then iterate from real demand.
        </li>
      </ul>
    </div>
  );
}
