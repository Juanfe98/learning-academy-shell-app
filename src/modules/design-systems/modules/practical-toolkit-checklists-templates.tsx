import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dodDiagram = String.raw`flowchart LR
  IDEA["Component idea"] --> RFC["RFC approved"]
  RFC --> BUILD["Built"]
  BUILD --> DOD{"Definition of Done"}
  DOD -->|"a11y + tests + docs + states + tokens"| SHIP["Ships in release"]
  DOD -->|"any missing"| BUILD`;

const checklistFlowDiagram = String.raw`flowchart TD
  PR["Component PR"] --> AUTO["Automated gates (CI)<br/>types, lint, axe, visual, size"]
  PR --> MANUAL["Manual checklist<br/>keyboard, SR, states, API review"]
  AUTO --> MERGE{"Merge?"}
  MANUAL --> MERGE
  MERGE -->|"all checked"| DONE["Done"]`;

export const toc: TocItem[] = [
  { id: "why-artifacts", title: "Why You Need Reusable Artifacts", level: 2 },
  { id: "component-dod", title: "The Component Definition of Done", level: 2 },
  { id: "a11y-checklist", title: "The Accessibility Checklist", level: 2 },
  { id: "component-spec", title: "The Component Spec Template", level: 2 },
  { id: "rfc-template", title: "The RFC Template", level: 2 },
  { id: "pr-template", title: "The Contribution PR Template", level: 2 },
  { id: "review-checklist", title: "The API Review Checklist", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PracticalToolkitChecklistsTemplates() {
  return (
    <div className="article-content">
      <p>
        A design system runs on <strong>repeatable processes</strong>, and the artifacts that encode
        those processes — a Definition of Done, an accessibility checklist, a component spec, an RFC
        template, a PR template — are what keep quality consistent as more people contribute. They
        turn the standards from this entire academy into things a contributor can actually follow.
        This final module is your copy-paste toolkit: the real templates and checklists to drop into
        a repo on day one. Pair the <em>automated</em> gates (CI module) with these <em>human</em>{" "}
        checklists for the things automation can&rsquo;t verify.
      </p>

      <h2 id="why-artifacts">Why You Need Reusable Artifacts</h2>
      <p>
        Quality that lives only in the maintainers&rsquo; heads doesn&rsquo;t scale to contributors.
        Written artifacts make expectations explicit, reviewable, and teachable — a new contributor
        reads the Definition of Done and knows exactly what &ldquo;finished&rdquo; means. They also
        make review objective (checklist vs vibes) and prevent the slow erosion of standards as the
        team grows. Automation covers the mechanical checks; these cover judgment and the things only
        a human can verify (does the keyboard flow <em>feel</em> right? is the API name clear?).
      </p>

      <MermaidDiagram
        chart={dodDiagram}
        title="The Definition of Done as a gate"
        caption="A component isn't 'done' when it renders — it ships only after meeting the explicit Definition of Done."
        minHeight={220}
      />

      <h2 id="component-dod">The Component Definition of Done</h2>
      <p>
        The single most useful artifact: an explicit checklist of what &ldquo;done&rdquo; means for
        any new component. Nothing ships until every box is checked.
      </p>

      <CodeBlock
        code={`## Component Definition of Done

### API & implementation
- [ ] Extends the underlying native element's props; forwards ref
- [ ] Variants modeled as union props (no boolean soup); typed with cva or equivalent
- [ ] Controlled + uncontrolled supported (if stateful)
- [ ] References ONLY semantic tokens — no hardcoded colors/spacing
- [ ] No outer margins (spacing owned by layout)

### Accessibility
- [ ] Built on native element or headless primitive (Radix/React Aria)
- [ ] Full keyboard operation per WAI-ARIA APG
- [ ] Visible focus (:focus-visible); focus trap/restore for overlays
- [ ] Accessible name; correct roles/ARIA; passes axe

### States
- [ ] All states designed & built: default, hover, focus, active, disabled,
      loading, error, empty (as applicable)

### Quality
- [ ] Behavior tests (Testing Library, query by role) + axe test
- [ ] Story per state (docs + visual regression + interaction)
- [ ] Responsive via container queries where relevant; logical CSS properties (RTL-ready)
- [ ] No user-facing hardcoded strings (translatable)

### Docs & release
- [ ] Autodocs API table (typed props + JSDoc)
- [ ] Usage guidelines (when to use / when not / do & don't)
- [ ] Changeset added with correct bump level`}
        lang="markdown"
        filename="DEFINITION_OF_DONE.md"
      />

      <MermaidDiagram
        chart={checklistFlowDiagram}
        title="Automated gates + human checklist"
        caption="CI handles the mechanical gates; a human checklist covers keyboard feel, screen-reader experience, states, and API judgment."
        minHeight={260}
      />

      <h2 id="a11y-checklist">The Accessibility Checklist</h2>
      <p>
        Automated axe catches ~a third of issues; this manual checklist covers the rest. Run it for
        every interactive component before merge.
      </p>

      <CodeBlock
        code={`## Accessibility Checklist (manual — axe can't verify these)

- [ ] Operable with keyboard ONLY (unplug the mouse and try)
- [ ] Tab order is logical; no keyboard traps (except intentional modal traps)
- [ ] Focus is always visible and never lost (overlays restore focus on close)
- [ ] Tested with a screen reader (VoiceOver/NVDA): name, role, state announced
- [ ] Arrow-key navigation works for composite widgets (menu/tabs/grid)
- [ ] Color is not the only signal (icons/text accompany color states)
- [ ] Contrast passes WCAG AA in light AND dark themes
- [ ] Respects prefers-reduced-motion
- [ ] Touch targets >= 44x44px
- [ ] Works at 200% zoom and 400% (reflow, no horizontal scroll)`}
        lang="markdown"
        filename="A11Y_CHECKLIST.md"
      />

      <h2 id="component-spec">The Component Spec Template</h2>
      <p>
        Before building, write a one-page spec. It forces clarity on the API and states up front and
        becomes the test plan and docs outline.
      </p>

      <CodeBlock
        code={`# Component Spec: <ComponentName>

## Purpose
One sentence: what problem this solves and when to use it (vs alternatives).

## Anatomy
List the parts (trigger, content, etc.) — sketch or compound structure.

## API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "primary" \\| "ghost" | "primary" | Visual emphasis |
| ... |

## States
default / hover / focus / active / disabled / loading / error / empty — describe each.

## Interaction & keyboard (link the APG pattern)
- Click / Enter / Space / Arrows / Escape behavior

## Accessibility
Roles, aria-*, focus behavior, accessible name source.

## Composition / variants
Compound parts, asChild support, polymorphism.

## Open questions
Anything unresolved for review.`}
        lang="markdown"
        filename="COMPONENT_SPEC_TEMPLATE.md"
      />

      <h2 id="rfc-template">The RFC Template</h2>
      <p>
        From the governance module — the lightweight proposal for significant additions or changes,
        so decisions are designed and recorded before code.
      </p>

      <CodeBlock
        code={`# RFC: <title>

## Summary
One paragraph: what and why.

## Motivation
What problem does this solve? Who's asking? What's the cost of not doing it?

## Proposed solution
API sketch, behavior, where it lives (core / community tier).

## Alternatives considered
What else could solve this, and why this is better.

## Drawbacks & risks
Bundle size, maintenance, accessibility, breaking-change surface.

## Adoption & migration
How do teams adopt it? Any codemod/migration needed?

## Open questions
Unresolved decisions for reviewers.`}
        lang="markdown"
        filename="RFC_TEMPLATE.md"
      />

      <h2 id="pr-template">The Contribution PR Template</h2>
      <p>
        A GitHub PR template that puts the gates in front of every contributor automatically.
      </p>

      <CodeBlock
        code={`<!-- .github/pull_request_template.md -->
## What & why
Describe the change and link the RFC/issue.

## Checklist
- [ ] Changeset added (\`pnpm changeset\`) with correct bump level
- [ ] Stories cover all states
- [ ] Tests added (behavior + axe)
- [ ] Definition of Done met (link checklist)
- [ ] Accessibility checklist run for interactive components
- [ ] Docs / usage guidelines updated
- [ ] No hardcoded strings, colors, or spacing (tokens only)

## Visual changes
Chromatic link / screenshots. Note any intentional baseline changes.

## Breaking changes
List them, or "none". If breaking: migration notes + codemod?`}
        lang="markdown"
        filename=".github/pull_request_template.md"
      />

      <h2 id="review-checklist">The API Review Checklist</h2>
      <p>
        Component APIs are forever (architecture module), so a focused API review before the first
        release prevents painful breaking changes later.
      </p>

      <ArticleTable
        caption="What to scrutinize in an API review before a component's first release."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Check</th><th>Why it matters</th></tr>
          </thead>
          <tbody>
            <tr><td>Prop names consistent with other components?</td><td><code>onChange</code> vs <code>onValueChange</code> drift confuses users</td></tr>
            <tr><td>Boolean flags or union variants?</td><td>Unions prevent invalid states; flags explode combinations</td></tr>
            <tr><td>Native props extended + ref forwarded?</td><td>Prevents teams forking for a missing prop</td></tr>
            <tr><td>Composition vs config?</td><td>Heavy customization needs slots/compound, not a prop per case</td></tr>
            <tr><td>Sensible defaults?</td><td>Common case should need minimal props</td></tr>
            <tr><td>Escape hatches (className/asChild)?</td><td>Controlled flexibility prevents forking</td></tr>
            <tr><td>Anything you'd regret supporting forever?</td><td>Every prop is a long-term contract</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you keep quality consistent as a design system scales to many contributors?'"
        intro="The signal is process maturity: explicit artifacts + the split between automated and human checks."
        steps={[
          "Quality in maintainers' heads doesn't scale — encode it in reusable artifacts (DoD, a11y checklist, component spec, RFC, PR template).",
          "A Definition of Done makes 'finished' explicit and gates the release: API, a11y, all states, tests, docs, changeset.",
          "Split the checks: CI automates the mechanical gates; manual checklists cover what automation can't (keyboard feel, screen-reader experience, API judgment).",
          "Use RFC + component spec templates so APIs and states are designed BEFORE code, and decisions are recorded.",
          "Put the checklist in the PR template so every contributor follows it automatically — process becomes the default path.",
        ]}
      />

      <InterviewChallenge
        title="Standardize a sloppy contribution process"
        scenario={
          <>
            Contributions to your design system are inconsistent: some components have no tests,
            some skip dark mode, some have hardcoded strings, accessibility is hit-or-miss, and
            reviewers argue subjectively about APIs. Quality varies wildly by who built the
            component. Fix the process.
          </>
        }
        tasks={[
          "Identify which artifacts you'd introduce and what each fixes.",
          "Split responsibilities between automation and human review.",
          "Explain how you'd make following the process the default, not optional.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Artifacts → fixes:</strong> a <strong>Definition of Done</strong> (no tests / no
          dark mode / hardcoded strings all become required boxes); an <strong>accessibility
          checklist</strong> (fixes hit-or-miss a11y); a <strong>component spec template</strong>{" "}
          (forces API + states design up front); an <strong>API review checklist</strong> (makes
          review objective instead of subjective arguments); an <strong>RFC template</strong> for
          significant additions.
        </p>
        <p>
          <strong>Automation vs human:</strong> CI enforces the mechanical, non-negotiable gates —
          typecheck, lint (ban hardcoded hex/px), axe, visual regression (catches missing dark mode),
          bundle size, changeset-present. Human review handles judgment — API naming/consistency,
          keyboard feel, screen-reader experience, composition decisions — guided by the checklists so
          it&rsquo;s objective.
        </p>
        <p>
          <strong>Make it the default:</strong> put the checklist in the <strong>PR template</strong>{" "}
          so every contributor sees it; make the CI gates <em>required</em> status checks (can&rsquo;t
          merge without them); link the Definition of Done from the contributing guide and onboarding.
          The process should be the path of least resistance — easier to follow than to bypass —
          which also ties back to adoption: contributors trust a system whose quality is visibly
          consistent.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Reusable <strong>artifacts</strong> (DoD, a11y checklist, spec, RFC, PR templates) encode
          quality so it scales beyond the maintainers&rsquo; heads.
        </li>
        <li>
          A <strong>Definition of Done</strong> makes &ldquo;finished&rdquo; explicit and gates every
          release.
        </li>
        <li>
          Split checks: <strong>CI automates</strong> the mechanical gates; <strong>manual
          checklists</strong> cover keyboard feel, screen-reader experience, and API judgment.
        </li>
        <li>
          <strong>Spec and RFC templates</strong> force API/state design before code and record
          decisions.
        </li>
        <li>
          Put the checklist in the <strong>PR template</strong> and make CI gates{" "}
          <strong>required</strong> — process becomes the default path, not optional.
        </li>
      </ul>
    </div>
  );
}
