import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const anatomyDiagram = String.raw`flowchart TD
  subgraph Foundations
    T["Design Tokens<br/>color, type, space, motion"]
  end
  subgraph Assets
    I["Icons & Illustrations"]
    F["Fonts & Brand assets"]
  end
  subgraph Code
    P["Headless primitives<br/>behavior + a11y"]
    C["Styled components<br/>Button, Input, Modal"]
    PT["Patterns<br/>forms, page layouts"]
  end
  subgraph Knowledge
    G["Usage guidelines"]
    D["Docs site / Storybook"]
    V["Contribution & governance"]
  end
  T --> C
  I --> C
  F --> C
  P --> C
  C --> PT
  C --> D
  PT --> D
  G --> D
  V --> D
  D --> APP["Product teams<br/>ship consistent UI fast"]`;

const sourceOfTruthDiagram = String.raw`flowchart LR
  subgraph Without["Without a design system"]
    A1["Team A buttons"] --> X["Inconsistent UI<br/>duplicated work<br/>drift"]
    A2["Team B buttons"] --> X
    A3["Team C buttons"] --> X
  end
  subgraph With["With a design system"]
    DS["Single source of truth"] --> B1["Team A"]
    DS --> B2["Team B"]
    DS --> B3["Team C"]
  end`;

export const toc: TocItem[] = [
  { id: "the-problem", title: "The Problem a Design System Solves", level: 2 },
  { id: "definition", title: "A Working Definition", level: 2 },
  { id: "not-the-same-thing", title: "Design System vs Component Library vs Style Guide", level: 3 },
  { id: "anatomy", title: "The Anatomy of a Design System", level: 2 },
  { id: "maturity", title: "Maturity Levels", level: 2 },
  { id: "roi", title: "Why Companies Invest: The ROI", level: 2 },
  { id: "when-not-to", title: "When NOT to Build One", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatIsADesignSystem() {
  return (
    <div className="article-content">
      <p>
        A design system is not a folder of React components, and it is not a Figma file. Those
        are <em>outputs</em>. The system itself is the <strong>shared language and the set of
        rules</strong> that make those outputs consistent, reusable, and predictable across
        every product, team, and platform an organization ships. When you understand a design
        system as a <strong>single source of truth</strong> rather than a pile of artifacts,
        every architectural decision in the rest of this academy — tokens, theming, packaging,
        governance — starts to make sense as a way of protecting that single source of truth.
      </p>

      <h2 id="the-problem">The Problem a Design System Solves</h2>
      <p>
        Scale breaks consistency. One developer building one app keeps the UI coherent in their
        head. Add a second team, a third product, a mobile platform, and a marketing site, and
        the same &ldquo;primary button&rdquo; quietly forks into five subtly different buttons —
        different padding, different blue, different focus ring, different disabled behavior.
        Each fork is cheap to create and expensive forever: every bug must be fixed five times,
        every brand refresh becomes a multi-quarter migration, and users feel the product as a
        set of disconnected screens rather than one coherent app.
      </p>

      <MermaidDiagram
        chart={sourceOfTruthDiagram}
        title="The core value proposition"
        caption="Without a shared source, every team re-implements the same UI and drifts apart. With one, they all consume the same definitions."
        minHeight={360}
      />

      <p>
        The design system is the organizational answer to entropy. It says: there is{" "}
        <strong>one</strong> button, defined once, and everyone consumes it. The hard part is
        almost never building the button — it is building the button so well, documenting it so
        clearly, and distributing it so painlessly that teams <em>choose</em> to adopt it instead
        of writing their own.
      </p>

      <h2 id="definition">A Working Definition</h2>
      <p>
        A useful definition has three layers, and people argue endlessly because they each mean a
        different layer when they say &ldquo;design system&rdquo;:
      </p>
      <ul>
        <li>
          <strong>The design language</strong> — the principles, brand, voice, and visual
          decisions (how does this company feel? what does &ldquo;primary&rdquo; mean?).
        </li>
        <li>
          <strong>The toolkit</strong> — the concrete, reusable implementations: tokens, coded
          components, Figma libraries, icons.
        </li>
        <li>
          <strong>The practice</strong> — the governance, contribution model, docs, and team that
          keep the first two alive and adopted.
        </li>
      </ul>
      <p>
        A pile of components without a language is just a component library. A language without a
        toolkit is just a brand guideline. A toolkit without a practice rots within a year. A
        real design system is all three, kept in sync.
      </p>

      <h3 id="not-the-same-thing">Design System vs Component Library vs Style Guide</h3>
      <p>
        Interviewers love to probe whether you can distinguish these, because conflating them
        leads to scoping mistakes. Here is the precise breakdown:
      </p>

      <ArticleTable
        caption="The same words get used loosely — here is what each actually is and contains."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Artifact</th>
              <th>What it is</th>
              <th>Contains</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Style guide</strong></td>
              <td>Static documentation of visual rules</td>
              <td>Logo usage, colors, type, tone of voice</td>
              <td>Brand-level, often a PDF or static site</td>
            </tr>
            <tr>
              <td><strong>Pattern library</strong></td>
              <td>Catalog of UI patterns and when to use them</td>
              <td>Forms, empty states, navigation patterns</td>
              <td>Solution-level guidance</td>
            </tr>
            <tr>
              <td><strong>Component library</strong></td>
              <td>Shippable coded components</td>
              <td><code>Button</code>, <code>Input</code>, <code>Modal</code> in code</td>
              <td>Implementation only</td>
            </tr>
            <tr>
              <td><strong>Design system</strong></td>
              <td>The connected whole + the practice around it</td>
              <td>Tokens, components, patterns, docs, governance</td>
              <td>Organization-wide source of truth</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        The crisp interview line: <strong>&ldquo;A component library is a deliverable; a design
        system is a product with users — and its users are other engineers and designers.&rdquo;</strong>{" "}
        That framing changes everything: products need versioning, support, docs, a roadmap, and
        adoption metrics. So does a design system.
      </p>

      <h2 id="anatomy">The Anatomy of a Design System</h2>
      <p>
        Concretely, a mature system is a layered stack. Each layer depends on the one below it,
        which is exactly why we study them bottom-up in this academy: tokens first, then
        components, then distribution and governance on top.
      </p>

      <MermaidDiagram
        chart={anatomyDiagram}
        title="The layered anatomy"
        caption="Tokens and assets feed components; components compose into patterns; everything surfaces through docs that product teams consume."
        minHeight={520}
      />

      <p>
        Notice that <strong>documentation sits at the consumption boundary</strong>. A component
        nobody can find, understand, or trust does not exist as far as adoption is concerned. This
        is why a Storybook or docs site is a first-class part of the system, not an afterthought —
        we dedicate a full module to it.
      </p>

      <CodeBlock
        code={`// The same conceptual layers, expressed as packages in a real monorepo:
//
//   @acme/tokens        -> design tokens (the foundation)
//   @acme/icons         -> SVG icon set, generated to components
//   @acme/primitives    -> headless behavior (Menu, Dialog) - no styling
//   @acme/react         -> styled components consuming tokens + primitives
//   @acme/patterns      -> higher-level compositions (DataTable, PageShell)
//   docs/                -> Storybook + guidelines site
//
// Dependency direction always flows DOWNWARD:
//   react  ->  primitives  ->  tokens
// A token never imports a component. Break that rule and you get cycles.`}
        lang="typescript"
        filename="package-topology.ts"
      />

      <h2 id="maturity">Maturity Levels</h2>
      <p>
        Design systems are not binary — they exist on a maturity curve. Knowing where a system
        sits tells you what to invest in next.
      </p>
      <ul>
        <li>
          <strong>Level 0 — Ad hoc:</strong> every team styles their own. No shared anything.
        </li>
        <li>
          <strong>Level 1 — Shared tokens:</strong> a common color/spacing/type vocabulary, even
          if components are still per-team.
        </li>
        <li>
          <strong>Level 2 — Shared components:</strong> a published component library teams
          install. Consistency improves dramatically.
        </li>
        <li>
          <strong>Level 3 — Governed system:</strong> versioning, contribution process, docs,
          design-code parity, adoption tracking.
        </li>
        <li>
          <strong>Level 4 — Self-sustaining:</strong> the system is the default path, federated
          contributions flow in, and teams would feel pain leaving it.
        </li>
      </ul>
      <p>
        Most &ldquo;we have a design system&rdquo; claims are really Level 2. The jump from 2 to 3
        — adding the <em>practice</em> — is where most systems succeed or quietly die.
      </p>

      <h2 id="roi">Why Companies Invest: The ROI</h2>
      <p>
        A design system is expensive: a dedicated team, ongoing maintenance, migration costs. It
        has to pay for itself, and the argument is concrete:
      </p>
      <ul>
        <li>
          <strong>Velocity:</strong> teams assemble screens from trusted parts instead of
          rebuilding primitives. Net-new feature time drops.
        </li>
        <li>
          <strong>Consistency &amp; trust:</strong> users experience one coherent product;
          quality bugs (contrast, focus, inconsistent states) are fixed once for everyone.
        </li>
        <li>
          <strong>Accessibility at scale:</strong> get the keyboard and ARIA behavior right in one
          <code>Menu</code> and every team inherits it. This alone often justifies the investment.
        </li>
        <li>
          <strong>Cheaper change:</strong> a rebrand or dark-mode launch becomes a token change,
          not a thousand-file rewrite.
        </li>
      </ul>

      <h3 id="when-not-to">When NOT to Build One</h3>
      <p>
        Senior judgment means knowing when the answer is &ldquo;not yet.&rdquo; A single small app,
        a pre-product-market-fit startup, or a one-off marketing site does not need a governed
        system — the overhead outweighs the payoff and premature abstraction locks in the wrong
        decisions. Reach for tokens and a shared component file first; graduate to a real system
        when you feel the pain of duplication across <em>multiple</em> teams or products.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <p>
        &ldquo;What is a design system?&rdquo; is a deceptively simple opener. Weak answers say
        &ldquo;a library of components.&rdquo; Strong answers reveal that you understand it as a
        product and a practice.
      </p>

      <InterviewPlaybook
        title="How to answer: 'What is a design system, and why would a company invest in one?'"
        intro="The interviewer is checking whether you think in artifacts or in systems. Lead with the source-of-truth framing, then prove you understand the cost."
        steps={[
          "Define it as a single source of truth — the shared language plus toolkit plus practice — not just a component library.",
          "Distinguish it from a component library: 'a library is a deliverable; a system is a product whose users are engineers and designers.'",
          "Name the concrete ROI: velocity, consistency, accessibility solved once, and cheap rebrands/theming.",
          "Show maturity: acknowledge the cost (a team, governance, migrations) and say when it's premature — a single small app doesn't need one.",
          "Close on the failure mode: most systems die not from bad components but from missing practice — no docs, no governance, no adoption strategy.",
        ]}
      />

      <InterviewChallenge
        title="Diagnose the drift"
        scenario={
          <>
            You join a 60-engineer company with four product squads. Each squad has its own{" "}
            <code>Button</code> component. They look almost identical but the hover states,
            disabled opacity, and focus rings all differ slightly. Leadership asks you to
            &ldquo;make a design system&rdquo; and gives you one quarter.
          </>
        }
        tasks={[
          "Explain what you'd build first and why — and why you would NOT start by rewriting all four buttons on day one.",
          "Identify which layer of the anatomy gives the fastest consistency win with the least disruption.",
          "Describe how you'd measure whether the system is actually being adopted three months in.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Start at the bottom of the stack: tokens.</strong> Extract a shared
            color/spacing/type/focus-ring vocabulary first. Tokens are the cheapest, least
            disruptive consistency win — squads can adopt them incrementally without throwing away
            their components, and a single focus-ring token instantly normalizes the most visible
            inconsistency.
          </p>
          <p>
            Then publish <em>one</em> governed <code>Button</code> consuming those tokens and run a
            migration, squad by squad. Don&rsquo;t big-bang rewrite — you&rsquo;ll stall and lose
            trust. Replace the four buttons opportunistically.
          </p>
          <p>
            <strong>Measure adoption, not output.</strong> Track the percentage of UI built from
            system components (e.g. via import-graph tooling or a simple lint rule counting
            <code>@acme/react</code> imports vs local components), number of squads on the latest
            version, and a satisfaction pulse. &ldquo;We shipped 30 components&rdquo; is vanity;
            &ldquo;70% of new screens use system components&rdquo; is the real signal.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A design system is a <strong>single source of truth</strong> — language + toolkit +
          practice — not just a component library.
        </li>
        <li>
          Treat it as a <strong>product with users</strong> (engineers and designers): it needs
          versioning, docs, support, and a roadmap.
        </li>
        <li>
          The anatomy is layered: <strong>tokens → components → patterns → docs</strong>, with
          dependencies always flowing downward.
        </li>
        <li>
          ROI comes from velocity, consistency, accessibility solved once, and cheap
          rebrand/theming — but it costs a team and ongoing governance.
        </li>
        <li>
          Most systems are stuck at &ldquo;shared components&rdquo; (Level 2); the leap to a{" "}
          <strong>governed practice</strong> (Level 3) is where they live or die.
        </li>
        <li>
          Know when <strong>not</strong> to build one — premature systematization is a real,
          expensive mistake.
        </li>
      </ul>
    </div>
  );
}
