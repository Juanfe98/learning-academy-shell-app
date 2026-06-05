import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const topicMapDiagram = String.raw`flowchart TD
  Q["Design system interview"] --> F["Foundations<br/>what/why, tokens, scales"]
  Q --> C["Components<br/>API design, composition, a11y"]
  Q --> S["Styling<br/>CSS-in-JS vs zero-runtime, theming"]
  Q --> D["Distribution<br/>packaging, versioning, testing"]
  Q --> O["Org<br/>governance, adoption, tradeoffs"]
  F --> SR["Senior signal:<br/>tradeoffs + production failure modes"]
  C --> SR
  S --> SR
  D --> SR
  O --> SR`;

const levelDiagram = String.raw`flowchart LR
  JR["Junior answer<br/>'a library of components'"] --> MID["Mid answer<br/>'tokens + components + docs'"]
  MID --> SR["Senior answer<br/>'a product with users; tradeoffs;<br/>failure modes; org dynamics'"]`;

export const toc: TocItem[] = [
  { id: "how-interviews-work", title: "How Design-System Interviews Work", level: 2 },
  { id: "what-separates-levels", title: "What Separates Junior from Senior Answers", level: 2 },
  { id: "foundations-q", title: "Foundations Questions", level: 2 },
  { id: "component-q", title: "Component & API Questions", level: 2 },
  { id: "styling-theming-q", title: "Styling & Theming Questions", level: 2 },
  { id: "distribution-q", title: "Distribution, Versioning & Testing Questions", level: 2 },
  { id: "org-q", title: "Governance & Tradeoff Questions", level: 2 },
  { id: "rapid-fire", title: "Rapid-Fire Reference", level: 2 },
  { id: "challenge", title: "System Design Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DesignSystemsInterviewQuestions() {
  return (
    <div className="article-content">
      <p>
        Design-system questions show up in senior and staff frontend interviews because they probe
        the exact thing those roles require: the ability to think in <strong>systems, tradeoffs,
        and organizational impact</strong>, not just to write a component. This module consolidates
        the questions you&rsquo;ll actually face, organized by the academy&rsquo;s topic areas, with
        the framing that turns a correct-but-junior answer into a senior one. Every question links
        back to a module — this is your review and your interview prep in one.
      </p>

      <h2 id="how-interviews-work">How Design-System Interviews Work</h2>
      <p>
        These questions span the whole stack — and interviewers rarely want a textbook definition.
        They want to see you reason about <em>why</em>, name <em>failure modes</em>, and weigh{" "}
        <em>alternatives</em>. The map below is the territory:
      </p>

      <MermaidDiagram
        chart={topicMapDiagram}
        title="The design-system interview surface"
        caption="Questions cluster into five areas; the senior signal across all of them is reasoning about tradeoffs and production failure modes."
        minHeight={400}
      />

      <h2 id="what-separates-levels">What Separates Junior from Senior Answers</h2>
      <p>
        The single most useful thing to internalize: the same question has a junior, mid, and senior
        answer, and the gap is always <strong>tradeoffs and failure modes</strong>.
      </p>

      <MermaidDiagram
        chart={levelDiagram}
        title="The answer-quality ladder"
        caption="Seniority shows in moving from 'what it is' to 'why, what breaks, and what the alternatives cost.'"
        minHeight={220}
      />

      <ArticleTable
        caption="The same question, answered at three levels."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Junior</th>
              <th>Senior</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>What&rsquo;s a design system?</td>
              <td>&ldquo;A component library.&rdquo;</td>
              <td>&ldquo;A product with users (engineers/designers): language + toolkit + practice, with versioning, docs, governance.&rdquo;</td>
            </tr>
            <tr>
              <td>Why tokens?</td>
              <td>&ldquo;To reuse colors.&rdquo;</td>
              <td>&ldquo;Three-tier indirection so theming is a semantic remap and components never change; cross-platform from one source.&rdquo;</td>
            </tr>
            <tr>
              <td>Which styling approach?</td>
              <td>&ldquo;Tailwind / styled-components.&rdquo;</td>
              <td>&ldquo;Depends on RSC/dynamic needs; runtime CSS-in-JS breaks RSC; tokens make the engine swappable.&rdquo;</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="foundations-q">Foundations Questions</h2>
      <InterviewPlaybook
        title="'How are design tokens structured, and why the indirection?'"
        intro="Tests whether you understand the three-tier model as a means to theming, not just naming."
        steps={[
          "Three tiers: primitive (raw values) → semantic (intent like color-action-primary) → component (button-bg).",
          "Components consume the semantic layer only — never primitives.",
          "The payoff: theming/dark mode is a remap of semantic→primitive with zero component changes; one source builds every platform.",
          "Failure mode: components referencing primitives directly makes theming a global find-and-replace. Name by role, not appearance.",
        ]}
      />
      <InterviewPlaybook
        title="'When should a company NOT build a design system?'"
        intro="A judgment question — answering it shows senior maturity about premature abstraction."
        steps={[
          "A single small app or pre-PMF startup: the governance overhead outweighs the duplication payoff.",
          "Premature systematization locks in the wrong abstractions before you know the real patterns.",
          "Start with shared tokens + a component file; graduate to a governed system when multiple teams/products feel duplication pain.",
        ]}
      />

      <h2 id="component-q">Component & API Questions</h2>
      <InterviewPlaybook
        title="'How do you design a flexible component API?'"
        intro="The core component question. Lead with 'it's a public contract.'"
        steps={[
          "Treat props as a long-lived public API; prefer orthogonal union props over boolean flags so invalid states are unrepresentable.",
          "Extend the native element's props and forward refs so onClick/aria/disabled work and teams don't fork.",
          "Support controlled + uncontrolled via one useControllableState pattern.",
          "Favor composition (compound components, asChild/polymorphism) over prop-explosion; build behavior on headless primitives.",
        ]}
      />
      <InterviewPlaybook
        title="'How do you guarantee accessibility across the system?'"
        intro="Expect this in any serious frontend interview. Lead with leverage."
        steps={[
          "Leverage: solve a11y once in shared components; every consumer inherits it — the strongest ROI argument for a system.",
          "Semantics first (native elements), ARIA only to fill gaps; follow WAI-ARIA APG keyboard contracts.",
          "Focus: visible focus (:focus-visible), focus trap + restoration in overlays, roving tabindex in composites.",
          "Build on Radix/React Aria; test with automated axe (catches ~a third) + manual keyboard/screen-reader passes.",
        ]}
      />

      <h2 id="styling-theming-q">Styling & Theming Questions</h2>
      <InterviewPlaybook
        title="'Runtime CSS-in-JS vs zero-runtime — what would you pick and why?'"
        intro="A trap if you name a favorite. Make it constraints-driven and show you know why the ground shifted."
        steps={[
          "Runtime CSS-in-JS serializes styles per render and CANNOT run in Server Components — forces 'use client', forfeiting RSC benefits.",
          "Zero-runtime (vanilla-extract, Panda) extracts static CSS at build time: no runtime cost, RSC-safe.",
          "For a new system on modern React, default to zero-runtime or Tailwind+cva; styled-components entered maintenance in 2025.",
          "Key point: if styles reference tokens, the engine is a swappable detail — tokens are the durable contract.",
        ]}
      />
      <InterviewPlaybook
        title="'How do you implement dark mode and multi-brand theming, and avoid the flash?'"
        intro="The FOUC gotcha is the senior differentiator here."
        steps={[
          "A theme is a remap of semantic tokens to primitives; CSS custom properties cascade and switch at runtime with zero re-render.",
          "Dark mode is more than inversion: recheck contrast, express elevation as surface tint, respect prefers-color-scheme with a persisted override.",
          "Kill the SSR flash with a tiny blocking inline script that sets the theme attribute before first paint, ahead of React.",
          "Multi-brand scales via a compile-time-enforced theme contract; brand × theme composes additively, not multiplicatively.",
        ]}
      />

      <h2 id="distribution-q">Distribution, Versioning & Testing Questions</h2>
      <InterviewPlaybook
        title="'How do you package and version a component library safely?'"
        intro="Separates those who've shipped a library from app-only engineers."
        steps={[
          "Monorepo (pnpm + Turborepo); bundle as a LIBRARY: ESM (+CJS), externalize peer deps, emit .d.ts, sideEffects-aware tree-shaking (list CSS!).",
          "react/react-dom as peerDependencies to avoid duplicate-React 'invalid hook call' bugs.",
          "Version with semver as a contract; recognize sneaky breaks (default-value changes, DOM/visual changes).",
          "Automate with Changesets; deprecate before deleting; ship codemods + migration guides with every major.",
        ]}
      />
      <InterviewPlaybook
        title="'How do you test a design system?'"
        intro="The right answer is 'a different mix than an app.'"
        steps={[
          "A regression breaks every consuming app, so appearance and a11y ARE the contract.",
          "Visual regression (Chromatic/Playwright) is the highest-value layer — catches cross-component side effects of token/CSS changes.",
          "Behavior tests with Testing Library (query by role/label, not internals); automated axe on every component; type tests for the prop API.",
          "Stories are the shared substrate powering docs, visual, a11y, and interaction tests at once.",
        ]}
      />

      <h2 id="org-q">Governance & Tradeoff Questions</h2>
      <InterviewPlaybook
        title="'How do you make a design system succeed organizationally?'"
        intro="The staff-level question. Most systems fail here, not technically."
        steps={[
          "It's sociotechnical — half code, half process. Centralized teams bottleneck; the path past capacity is enabling federated contribution (hybrid model).",
          "Define a paved contribution path with RFCs and component tiers (core / community / out-of-scope).",
          "Drive adoption: best DX, low migration cost (codemods), active support, reliability/trust, exec sponsorship.",
          "Measure: coverage (% UI from system), version distribution, detachment/fork rate, satisfaction — you manage what you measure.",
        ]}
      />

      <h2 id="rapid-fire">Rapid-Fire Reference</h2>
      <p>Quick crisp answers to common one-liners:</p>
      <ul>
        <li><strong>Design system vs component library?</strong> A library is a deliverable; a system is a product with users + practice.</li>
        <li><strong>Why semantic tokens?</strong> So theming is a remap and components are theme-agnostic.</li>
        <li><strong>asChild vs <code>as</code> prop?</strong> <code>asChild</code> merges props onto your child (avoids invalid nesting, better a11y); <code>as</code> swaps the rendered element.</li>
        <li><strong>Why peerDependencies for React?</strong> Avoid two React copies → &ldquo;invalid hook call&rdquo;.</li>
        <li><strong>Why does styled-components break RSC?</strong> It needs a client runtime; can&rsquo;t run in Server Components.</li>
        <li><strong>What&rsquo;s a breaking change?</strong> Anything consumers depend on: removed/renamed props, changed defaults, DOM/visual changes targeted by CSS.</li>
        <li><strong>Highest-value test type?</strong> Visual regression — appearance is the contract.</li>
        <li><strong>Most common adoption killer?</strong> Centralized-team bottleneck + missing docs.</li>
        <li><strong>OKLCH over HSL?</strong> Perceptual uniformity → balanced auto-generated ramps.</li>
        <li><strong>Build vs adopt?</strong> Driven by brand differentiation + a11y/eng capacity; building on headless is the common sweet spot.</li>
      </ul>

      <h2 id="challenge">System Design Challenge</h2>
      <InterviewChallenge
        title="Whiteboard: design a design system for a multi-product company"
        scenario={
          <>
            &ldquo;Design a design system for a company with three web products, a marketing site,
            and a planned mobile app. They want a consistent brand, dark mode, and the ability to
            white-label for enterprise customers. Walk me through your architecture and rollout.&rdquo;
            This is a common staff-level system-design prompt — you have ~30 minutes.
          </>
        }
        tasks={[
          "Lay out the architecture across tokens, styling, components, and distribution.",
          "Address dark mode, multi-brand/white-label, and the cross-platform (mobile) requirement.",
          "Sequence the rollout and name the biggest risk to the whole effort.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Architecture (bottom-up):</strong> Start with a <em>platform-neutral token
            layer</em> (DTCG + Style Dictionary) — the mobile + white-label requirements make this
            non-negotiable, since one source must emit CSS vars for web and native values for
            mobile. Three tiers; semantic layer is the theming surface. <em>Styling:</em>{" "}
            zero-runtime (vanilla-extract/Panda) or Tailwind+cva for web — RSC-safe, and theming via
            CSS variables. <em>Components:</em> build on a headless base (Radix/React Aria) for
            accessibility, referencing only semantic tokens. <em>Distribution:</em> pnpm monorepo,{" "}
            <code>@acme/tokens</code> / <code>@acme/react</code> (and later a RN package), Changesets
            releases, Storybook + Chromatic.
          </p>
          <p>
            <strong>Dark mode + white-label:</strong> both are semantic-token remaps. Dark mode is a
            fixed second mode shipped once. White-label injects each customer&rsquo;s brand{" "}
            <em>primitives</em> at runtime (SSR-injected CSS variables from their config) — brand ×
            theme composes additively. Enforce a <em>theme contract</em> at compile time so every
            brand supplies every token. The flash is handled by an SSR-injected blocking script.{" "}
            <strong>Cross-platform:</strong> tokens are platform-neutral; the web package and a
            future React Native package both consume the same token source — Style Dictionary emits
            both.
          </p>
          <p>
            <strong>Rollout:</strong> tokens → tooling/Storybook → high-traffic web components →
            publish + migrate one pilot product → expand + governance (RFCs, metrics) → add the RN
            package when mobile starts. Ship a vertical slice early.
          </p>
          <p>
            <strong>Biggest risk:</strong> not technical — <em>adoption/governance</em>. With three
            products and a small team, a centralized model bottlenecks; the effort dies if teams
            route around it. Mitigate with a hybrid governance model, great DX/docs, low-cost
            migration (codemods), and executive sponsorship, and measure coverage to prove it&rsquo;s
            working. Naming this as the top risk is the senior move — interviewers expect the
            organizational dimension, not just the tech.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Design-system questions test <strong>systems thinking, tradeoffs, and org impact</strong>{" "}
          — the staff-level signal.
        </li>
        <li>
          The junior→senior gap is always <strong>&ldquo;why + failure modes + alternatives,&rdquo;</strong>{" "}
          not memorized definitions.
        </li>
        <li>
          Have crisp framings ready for tokens (three-tier → theming), component APIs (public
          contract + composition), styling (RSC + tokens-as-contract), and versioning (semver +
          deprecate-before-delete + codemods).
        </li>
        <li>
          For accessibility, lead with <strong>leverage</strong>; for styling, refuse to name a
          blind favorite and make it <strong>constraints-driven</strong>.
        </li>
        <li>
          On system-design prompts, build <strong>bottom-up</strong>, address theming/multi-brand as
          token remaps, and name <strong>adoption/governance as the biggest risk</strong>.
        </li>
      </ul>
    </div>
  );
}
