import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const runtimeDiagram = String.raw`flowchart TD
  subgraph Runtime["Runtime CSS-in-JS (styled-components, emotion)"]
    R1["Component renders"] --> R2["Serialize styles in JS"]
    R2 --> R3["Inject <style> into DOM"]
    R3 --> R4["Browser applies"]
    R4 -.-> |"cost every render"| R1
  end
  subgraph Zero["Zero-runtime (vanilla-extract, Panda)"]
    Z1["Build step"] --> Z2["Extract to static .css"]
    Z2 --> Z3["Ship plain CSS file"]
    Z3 --> Z4["Browser applies, no JS cost"]
  end`;

const decisionDiagram = String.raw`flowchart TD
  Q1{"Need runtime-dynamic<br/>styles from arbitrary props?"} -->|"Rarely"| Q2{"Want zero JS<br/>style cost?"}
  Q1 -->|"Often"| RT["Runtime CSS-in-JS<br/>or CSS vars + classes"]
  Q2 -->|"Yes"| Q3{"RSC / SSR heavy?"}
  Q3 -->|"Yes"| ZR["vanilla-extract / Panda<br/>/ CSS Modules / Tailwind"]
  Q3 -->|"No"| ZR
  Q2 -->|"Tooling minimal"| TW["Tailwind + tokens"]`;

export const toc: TocItem[] = [
  { id: "the-landscape", title: "The Styling Landscape", level: 2 },
  { id: "runtime-vs-zero", title: "Runtime vs Zero-Runtime", level: 2 },
  { id: "rsc-problem", title: "The RSC Problem", level: 3 },
  { id: "approaches", title: "The Approaches", level: 2 },
  { id: "css-modules", title: "CSS Modules", level: 3 },
  { id: "tailwind", title: "Tailwind / Atomic CSS", level: 3 },
  { id: "css-in-js", title: "Runtime CSS-in-JS", level: 3 },
  { id: "zero-runtime", title: "Zero-Runtime CSS-in-JS", level: 3 },
  { id: "tokens-bridge", title: "How Tokens Bridge Every Approach", level: 2 },
  { id: "choosing", title: "Choosing for a Design System", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StylingStrategiesAndTechnologies() {
  return (
    <div className="article-content">
      <p>
        The styling-technology choice is the most consequential and most debated decision in a
        design system, because it&rsquo;s nearly impossible to reverse — it&rsquo;s baked into
        every component. The landscape shifted dramatically with React Server Components, which
        broke the most popular approach (runtime CSS-in-JS) and pushed the ecosystem toward{" "}
        <strong>zero-runtime</strong> solutions. This module gives you the mental model to evaluate
        any styling tech and defend a choice — the thing senior frontend interviews probe hardest.
      </p>

      <h2 id="the-landscape">The Styling Landscape</h2>
      <p>
        Every styling approach answers the same questions differently: <em>where</em> do styles
        live (separate file, co-located, in JS), <em>when</em> are they computed (build time vs
        runtime), and <em>how</em> are they scoped (global, hashed, atomic). The five families:
        plain CSS / Sass, CSS Modules, utility/atomic CSS (Tailwind), runtime CSS-in-JS
        (styled-components, emotion), and zero-runtime CSS-in-JS (vanilla-extract, Panda, Stitches,
        Linaria).
      </p>

      <h2 id="runtime-vs-zero">Runtime vs Zero-Runtime</h2>
      <p>
        This is the axis that matters most. <strong>Runtime CSS-in-JS</strong> serializes styles to
        CSS strings <em>while the app runs</em> and injects them into the DOM on render.{" "}
        <strong>Zero-runtime</strong> approaches extract all styles to static <code>.css</code>{" "}
        files at <em>build time</em>, shipping plain CSS with no per-render JS cost.
      </p>

      <MermaidDiagram
        chart={runtimeDiagram}
        title="Where the work happens"
        caption="Runtime CSS-in-JS pays a serialization + injection cost on render; zero-runtime moves all of it to the build step."
        minHeight={420}
      />

      <p>
        The runtime cost is real: style serialization on every render, larger JS bundles (the CSS
        engine ships to the client), and hydration overhead. For a design system used by thousands
        of components across many apps, this tax compounds. That alone made the ecosystem
        skeptical of runtime CSS-in-JS even before RSC.
      </p>

      <h3 id="rsc-problem">The RSC Problem</h3>
      <p>
        Then React Server Components made it concrete: <strong>runtime CSS-in-JS libraries
        require a client runtime</strong> (React context, hooks, dynamic injection) and therefore
        cannot run in Server Components. A component using styled-components must be a Client
        Component (<code>&quot;use client&quot;</code>), forfeiting the streaming and zero-JS
        benefits of RSC. This is why the Next.js team explicitly steered people away from runtime
        CSS-in-JS, and why new design systems default to zero-runtime or utility CSS.
      </p>

      <h2 id="approaches">The Approaches</h2>

      <h3 id="css-modules">CSS Modules</h3>
      <p>
        CSS Modules are plain CSS files where class names are locally scoped (hashed) at build
        time. Zero runtime, RSC-safe, framework-agnostic, and dead simple. The downside is no
        first-class dynamic styling and weaker co-location with logic — but for a token-driven
        system where dynamism comes from CSS variables, that&rsquo;s rarely a problem.
      </p>

      <CodeBlock
        code={`/* Button.module.css */
.button {
  background: var(--color-action-primary);
  padding: var(--space-inset-md);
}
.primary { /* variant */ }`}
        lang="css"
        filename="Button.module.css"
      />

      <h3 id="tailwind">Tailwind / Atomic CSS</h3>
      <p>
        Tailwind generates atomic utility classes (one declaration each) and you compose them on
        elements. Styles are static (build-time, RSC-safe), the generated CSS is tiny and capped
        (classes are deduplicated across the whole app), and tokens map cleanly to the Tailwind
        theme config. For design systems, the winning pattern is{" "}
        <strong>Tailwind + cva</strong>: tokens define the theme, cva maps variant props to utility
        strings.
      </p>

      <CodeBlock
        code={`// Tailwind theme reads from your design tokens (Tailwind v4 uses CSS @theme):
/* globals.css */
@theme {
  --color-action-primary: var(--blue-500);
  --spacing-inset-md: 0.75rem;
}

// Component composes utilities via cva — variants are type-safe:
const button = cva("inline-flex rounded-md font-medium", {
  variants: { variant: { primary: "bg-action-primary text-white" } },
});`}
        lang="typescript"
        filename="tailwind-system.ts"
      />

      <h3 id="css-in-js">Runtime CSS-in-JS</h3>
      <p>
        styled-components and emotion popularized co-locating styles with components, props-driven
        dynamic styles, and automatic critical-CSS. Excellent DX, and still fine for{" "}
        <em>client-rendered</em> SPAs. But the runtime cost and RSC incompatibility make them a
        weak default for a <em>new</em> design system in 2024+. styled-components entered
        maintenance mode in 2025 — a strong signal about the ecosystem&rsquo;s direction.
      </p>

      <CodeBlock
        code={`// Runtime CSS-in-JS: ergonomic, but requires "use client" and costs at runtime
import styled from "styled-components";

const Button = styled.button<{ $variant: "primary" | "ghost" }>\`
  padding: var(--space-inset-md);
  background: \${(p) => (p.$variant === "primary" ? "var(--color-action-primary)" : "transparent")};
\`;
// ^ Cannot be a Server Component. Styles serialized per render.`}
        lang="tsx"
        filename="styled-components.tsx"
      />

      <h3 id="zero-runtime">Zero-Runtime CSS-in-JS</h3>
      <p>
        These give you the CSS-in-JS authoring experience (co-location, TypeScript, theme objects)
        but <strong>compile to static CSS</strong> at build time — no runtime cost, RSC-safe.{" "}
        <strong>vanilla-extract</strong> (TypeScript files compiled to CSS),{" "}
        <strong>Panda CSS</strong> (token-first, generates atomic CSS), and <strong>Linaria</strong>{" "}
        lead here. They&rsquo;re the modern sweet spot for type-safe, token-driven systems that must
        work with RSC.
      </p>

      <CodeBlock
        code={`// vanilla-extract: authored in TS, extracted to static CSS at build
import { style, createVar } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

export const button = style({
  padding: tokens.space.insetMd,        // type-safe token reference
  background: tokens.color.actionPrimary,
  ":hover": { background: tokens.color.actionPrimaryHover },
});
// Output: a plain .css file. Zero JS shipped. Works in Server Components.`}
        lang="typescript"
        filename="button.css.ts"
      />

      <h2 id="tokens-bridge">How Tokens Bridge Every Approach</h2>
      <p>
        Here&rsquo;s the unifying insight: <strong>if your styling references design tokens (CSS
        custom properties), the styling technology becomes a swappable implementation detail</strong>.
        CSS Modules, Tailwind, and vanilla-extract can all reference{" "}
        <code>var(--color-action-primary)</code>. The tokens are the durable contract; the styling
        engine on top is replaceable. This is why the token module came first — get tokens right
        and the styling-tech debate matters far less than people think.
      </p>

      <h2 id="choosing">Choosing for a Design System</h2>
      <p>
        There&rsquo;s no universal winner, but there is a defensible decision process driven by your
        constraints — chiefly RSC/SSR usage and how much truly-dynamic styling you need.
      </p>

      <MermaidDiagram
        chart={decisionDiagram}
        title="A styling-tech decision flow"
        caption="The dominant inputs are RSC/SSR usage and how often you need runtime-dynamic styles from arbitrary props."
        minHeight={420}
      />

      <ArticleTable
        caption="Styling approaches scored on the axes that matter for a design system."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Runtime cost</th>
              <th>RSC-safe</th>
              <th>Dynamic styling</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CSS Modules</td>
              <td>None</td>
              <td>✅</td>
              <td>Via CSS vars</td>
              <td>Simple, durable, framework-agnostic systems</td>
            </tr>
            <tr>
              <td>Tailwind + cva</td>
              <td>None</td>
              <td>✅</td>
              <td>Via CSS vars / variants</td>
              <td>Fast iteration, capped CSS size</td>
            </tr>
            <tr>
              <td>vanilla-extract / Panda</td>
              <td>None</td>
              <td>✅</td>
              <td>Recipes + CSS vars</td>
              <td>Type-safe, token-first, RSC apps</td>
            </tr>
            <tr>
              <td>styled-components / emotion</td>
              <td>Per render</td>
              <td>❌ (client only)</td>
              <td>Excellent (props)</td>
              <td>Client-rendered SPAs, legacy systems</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What styling approach would you choose for a new design system and why?'"
        intro="This is a trap if you answer with a favorite. The senior move is to make it a constraints-driven decision and show you know why the ground shifted."
        steps={[
          "Refuse to name a winner blindly — say the choice depends on RSC/SSR usage, dynamic-styling needs, and team familiarity.",
          "Explain the runtime vs zero-runtime axis and the RSC problem: runtime CSS-in-JS can't run in Server Components and costs per render.",
          "Default recommendation for a NEW system on modern React: zero-runtime (vanilla-extract/Panda) or Tailwind+cva, both RSC-safe.",
          "Make the key point: if styles reference design tokens, the styling engine is a swappable detail — tokens are the durable contract.",
          "Note styled-components entered maintenance in 2025 — a signal the ecosystem moved toward zero-runtime.",
        ]}
      />

      <InterviewChallenge
        title="Migrate off runtime CSS-in-JS"
        scenario={
          <>
            Your company&rsquo;s design system is built on styled-components. The product teams are
            adopting Next.js App Router and complaining that every system component forces{" "}
            <code>&quot;use client&quot;</code>, killing their Server Component benefits and hurting
            performance. Leadership asks you for a migration plan.
          </>
        }
        tasks={[
          "Explain precisely why styled-components forces 'use client' and why that hurts.",
          "Propose a target styling tech and justify it against their constraints.",
          "Describe how to migrate incrementally without a big-bang rewrite of every component.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Why it forces client:</strong> styled-components needs a React runtime —
            context for theming, hooks, and dynamic <code>&lt;style&gt;</code> injection during
            render. None of that can execute in a Server Component, so any styled component (and
            everything importing it) becomes a client boundary, forfeiting streaming and
            zero-JS rendering.
          </p>
          <p>
            <strong>Target:</strong> a zero-runtime engine — <strong>vanilla-extract</strong> (if
            they value TypeScript-authored styles and theme contracts) or <strong>Tailwind +
            cva</strong> (if they want speed and a capped CSS budget). Both extract to static CSS,
            are RSC-safe, and reference the same tokens.
          </p>
          <p>
            <strong>Incremental path:</strong> First, ensure all styled-components already reference
            <em>tokens</em> (CSS variables), not hardcoded values — if so, the visual contract is
            already engine-independent. Then migrate component-by-component, leaf components first,
            keeping the public API identical so consumers don&rsquo;t change imports. Run both
            engines in parallel during the transition. Track progress by counting remaining{" "}
            <code>&quot;use client&quot;</code> directives forced by styling. The token layer is
            what makes this a mechanical migration rather than a redesign.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The decisive axis is <strong>runtime vs zero-runtime</strong>: zero-runtime extracts to
          static CSS at build time with no per-render cost.
        </li>
        <li>
          <strong>Runtime CSS-in-JS can&rsquo;t run in Server Components</strong> and forces{" "}
          <code>&quot;use client&quot;</code> — the main reason new systems avoid it.
        </li>
        <li>
          For a new system on modern React, default to <strong>zero-runtime</strong>{" "}
          (vanilla-extract/Panda) or <strong>Tailwind + cva</strong>.
        </li>
        <li>
          If styles reference <strong>design tokens</strong>, the styling engine is a swappable
          implementation detail — tokens are the durable contract.
        </li>
        <li>
          The choice is hard to reverse, so make it a <strong>constraints-driven</strong> decision
          (RSC/SSR, dynamic styling, team familiarity), not a favorite.
        </li>
      </ul>
    </div>
  );
}
