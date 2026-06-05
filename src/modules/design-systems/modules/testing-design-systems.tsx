import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pyramidDiagram = String.raw`flowchart TD
  subgraph Layers["What to test in a design system"]
    A["A11y tests (axe)<br/>every component story"]
    B["Unit / behavior tests<br/>Testing Library + interactions"]
    C["Visual regression<br/>Chromatic / Playwright snapshots"]
    D["Type tests<br/>tsc / tsd — the API contract"]
  end
  A --> CONF["Confidence to ship<br/>without breaking 100s of apps"]
  B --> CONF
  C --> CONF
  D --> CONF`;

const visualRegressionDiagram = String.raw`flowchart LR
  PR["PR changes Button"] --> CAP["Capture story screenshots"]
  CAP --> CMP["Diff vs baseline"]
  CMP -->|"pixels changed"| REV["Human reviews diff"]
  REV -->|"intended"| ACC["Accept as new baseline"]
  REV -->|"regression"| BLOCK["Block merge"]
  CMP -->|"no change"| PASS["Auto-pass"]`;

export const toc: TocItem[] = [
  { id: "what-to-test", title: "What a Design System Must Test", level: 2 },
  { id: "behavior", title: "Behavior Tests, Not Implementation", level: 2 },
  { id: "interaction", title: "Interaction Tests via Stories", level: 3 },
  { id: "visual", title: "Visual Regression Testing", level: 2 },
  { id: "chromatic", title: "Chromatic & the Story-as-Test Pattern", level: 3 },
  { id: "a11y", title: "Automated Accessibility Tests", level: 2 },
  { id: "types", title: "Type Tests: The API Contract", level: 2 },
  { id: "strategy", title: "A Pragmatic Test Strategy", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TestingDesignSystems() {
  return (
    <div className="article-content">
      <p>
        Testing a design system carries unusual stakes: a regression doesn&rsquo;t break one
        feature, it breaks <strong>every app that depends on the component</strong>. That changes
        what you test and how. Design systems need a different test mix than apps — heavy on{" "}
        <strong>visual regression</strong> and <strong>accessibility</strong> (because appearance
        and a11y <em>are</em> the contract) and on <strong>type-level tests</strong> (because the
        props are a public API). This module lays out the full testing strategy that lets you ship
        changes confidently to hundreds of downstream consumers.
      </p>

      <h2 id="what-to-test">What a Design System Must Test</h2>
      <p>
        The classic test pyramid is reshaped for a component library. The four layers that matter:
      </p>

      <MermaidDiagram
        chart={pyramidDiagram}
        title="The design-system test mix"
        caption="Behavior, visual, accessibility, and type tests together give the confidence to ship to hundreds of apps."
        minHeight={380}
      />

      <h2 id="behavior">Behavior Tests, Not Implementation</h2>
      <p>
        Unit tests for components should verify <strong>what the user experiences</strong>, not
        internal state. <strong>Testing Library</strong> enforces this by design: you query the DOM
        the way a user would (by role, label, text), never by class name or component internals.
        This makes tests resilient to refactors — exactly what you need when the implementation will
        change but the behavior must not.
      </p>

      <CodeBlock
        code={`import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

test("calls onClick and is disabled while loading", async () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button onClick={onClick}>Save</Button>);

  // Query by ROLE + accessible name — how a user/AT finds it, not by class:
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledOnce();

  rerender(<Button isLoading onClick={onClick}>Save</Button>);
  expect(screen.getByRole("button")).toBeDisabled();   // behavior, not internals
});`}
        lang="tsx"
        filename="Button.test.tsx"
      />

      <h3 id="interaction">Interaction Tests via Stories</h3>
      <p>
        Storybook&rsquo;s <strong>play function</strong> lets a story script a sequence of user
        interactions and assertions — the story <em>is</em> the test, running in a real browser.
        This unifies docs, manual QA, and automated interaction testing into one artifact, which is
        a huge maintenance win.
      </p>

      <CodeBlock
        code={`import { expect, userEvent, within } from "@storybook/test";

export const OpensAndSelects: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Options" }));
    const menu = await canvas.findByRole("menu");           // opened
    await userEvent.keyboard("{ArrowDown}{Enter}");          // keyboard nav works
    await expect(canvas.getByRole("button")).toHaveTextContent("Edit");
  },
};
// Runs in CI via the Storybook test-runner; also visible/debuggable in the UI.`}
        lang="tsx"
        filename="Menu.stories.tsx"
      />

      <h2 id="visual">Visual Regression Testing</h2>
      <p>
        For a design system, <strong>appearance is the contract</strong> — and unit tests
        can&rsquo;t catch a button that&rsquo;s suddenly 4px too tall or the wrong shade. Visual
        regression testing screenshots each component state and diffs it against an approved
        baseline, flagging any pixel change for human review. This is the single most valuable test
        type for a design system because it catches the unintended visual side effects that
        token/CSS changes routinely cause across unrelated components.
      </p>

      <MermaidDiagram
        chart={visualRegressionDiagram}
        title="Visual regression flow"
        caption="Each PR re-screenshots stories and diffs against the baseline; pixel changes require explicit human approval before merge."
        minHeight={320}
      />

      <h3 id="chromatic">Chromatic & the Story-as-Test Pattern</h3>
      <p>
        <strong>Chromatic</strong> (from the Storybook team) is the standard hosted service: it
        captures every Storybook story across browsers/viewports and surfaces visual diffs in PRs.
        Because you already wrote a story for every component state (docs module), you get visual
        coverage <em>for free</em> — the stories <em>are</em> the test cases. Open-source
        alternatives: Playwright&rsquo;s <code>toHaveScreenshot()</code> or Loki. The key insight:
        <strong>write stories for every state once, and they power docs, interaction tests, and
        visual regression simultaneously.</strong>
      </p>

      <h2 id="a11y">Automated Accessibility Tests</h2>
      <p>
        Accessibility is part of the contract, so it belongs in CI. <strong>axe-core</strong> (via{" "}
        <code>jest-axe</code> or Storybook&rsquo;s a11y addon / test-runner) scans rendered
        components for violations — missing labels, bad roles, contrast failures. Remember the
        ceiling from the accessibility module: automation catches ~30–40% of issues, so it&rsquo;s a
        floor, not a guarantee. Run it on every component, and keep manual keyboard/screen-reader
        passes for interactive ones.
      </p>

      <CodeBlock
        code={`import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

test("Modal has no automatically-detectable a11y violations", async () => {
  const { container } = render(<Modal open title="Settings">Body</Modal>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
// In Storybook: the test-runner runs axe on every story automatically.`}
        lang="tsx"
        filename="Modal.a11y.test.tsx"
      />

      <h2 id="types">Type Tests: The API Contract</h2>
      <p>
        Because the props <em>are</em> the public API, the TypeScript types are a contract worth
        testing directly. <strong>Type tests</strong> (<code>tsd</code>, <code>expect-type</code>,
        or <code>vitest</code>&rsquo;s type testing) assert that valid prop combinations compile and
        invalid ones <em>fail</em> to compile — catching accidental API breakage that runtime tests
        miss entirely.
      </p>

      <CodeBlock
        code={`import { expectTypeOf } from "vitest";
import { Button, type ButtonProps } from "./Button";

test("Button API contract", () => {
  expectTypeOf<ButtonProps["variant"]>().toEqualTypeOf<
    "primary" | "secondary" | "danger" | undefined
  >();
  // @ts-expect-error — invalid variant must NOT compile (guards against API drift)
  const bad: ButtonProps = { variant: "nope" };
});`}
        lang="tsx"
        filename="Button.types.test.ts"
      />

      <h2 id="strategy">A Pragmatic Test Strategy</h2>
      <ArticleTable
        caption="A practical allocation of test types for a design-system component."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Test type</th>
              <th>Catches</th>
              <th>Coverage target</th>
              <th>Tool</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Visual regression</td>
              <td>Unintended appearance changes</td>
              <td>Every story / state</td>
              <td>Chromatic / Playwright</td>
            </tr>
            <tr>
              <td>Accessibility</td>
              <td>Labels, roles, contrast</td>
              <td>Every component</td>
              <td>axe (jest/storybook)</td>
            </tr>
            <tr>
              <td>Behavior / interaction</td>
              <td>Logic, keyboard, state</td>
              <td>Interactive components</td>
              <td>Testing Library / play fn</td>
            </tr>
            <tr>
              <td>Type</td>
              <td>API contract breakage</td>
              <td>Public component props</td>
              <td>tsd / expect-type</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The throughline: <strong>lean on stories as the shared substrate</strong>. One well-written
        set of stories per component feeds docs, visual regression, accessibility scanning, and
        interaction tests — minimizing duplicated effort while maximizing confidence.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you test a design system?'"
        intro="Interviewers want to see that you understand a design system needs a DIFFERENT test mix than an app — visual and a11y heavy — and why."
        steps={[
          "Frame the stakes: a regression breaks every consuming app, so appearance and a11y ARE the contract and must be tested directly.",
          "Behavior tests with Testing Library — query by role/label, test what users experience, not implementation, so refactors don't break tests.",
          "Visual regression (Chromatic / Playwright) is the highest-value layer — catches unintended visual side effects of token/CSS changes.",
          "Automated axe in CI on every component as a floor; type tests (tsd) to guard the public prop API.",
          "Tie it together: stories are the shared substrate — one set powers docs, visual, a11y, and interaction tests.",
        ]}
      />

      <InterviewChallenge
        title="A token change broke production"
        scenario={
          <>
            An engineer tweaked <code>--space-inset-md</code> from 12px to 16px to fix a Button
            that looked cramped. The unit tests all passed and it shipped. Three days later,
            multiple product teams report that their dense data tables and chip lists now overflow
            and look broken — the same token feeds dozens of components.
          </>
        }
        tasks={[
          "Explain why the existing tests didn't catch this and what class of bug it is.",
          "Specify the testing you'd add so this is caught before merge next time.",
          "Describe how the fix workflow should look once that testing exists.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Why it slipped:</strong> unit/behavior tests assert logic and roles, not
            pixels — they have no opinion on a 4px spacing change. This is a{" "}
            <strong>visual regression</strong>, and worse, a <em>cross-component</em> one: a shared
            token change rippled into every component consuming it. Exactly the failure mode visual
            testing exists for.
          </p>
          <p>
            <strong>Add visual regression</strong> (Chromatic or Playwright snapshots) over the
            full story catalog, running in CI on every PR. The token change would have produced
            diffs across Button, Table, Chip, and more — making the blast radius visible{" "}
            <em>before</em> merge instead of in production.
          </p>
          <p>
            <strong>Fixed workflow:</strong> the engineer changes the token, CI captures diffs for
            every affected story, and they see the table/chip breakage immediately. They either
            narrow the fix (a component-scoped token for Button instead of the global one — the
            real correct fix here) or consciously accept the new baselines across all components.
            Visual review becomes a required, human-approved gate for any token/CSS change.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A regression breaks <strong>every consuming app</strong>, so a design system needs a
          visual- and a11y-heavy test mix, not the typical app pyramid.
        </li>
        <li>
          <strong>Visual regression</strong> (Chromatic / Playwright) is the highest-value layer —
          it catches the cross-component side effects of token/CSS changes.
        </li>
        <li>
          Write <strong>behavior tests</strong> with Testing Library (query by role/label) so they
          survive refactors; test what users experience.
        </li>
        <li>
          Run <strong>automated axe</strong> on every component as a floor, plus manual
          keyboard/screen-reader passes for interactive ones.
        </li>
        <li>
          Add <strong>type tests</strong> to guard the public prop API against silent breakage.
        </li>
        <li>
          <strong>Stories are the shared substrate</strong> — one set powers docs, visual,
          accessibility, and interaction tests.
        </li>
      </ul>
    </div>
  );
}
