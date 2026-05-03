import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewChallenge, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-this-module-exists", title: "Why This Module Exists", level: 2 },
  { id: "challenge-map", title: "Challenge Map", level: 2 },
  { id: "challenge-1", title: "Challenge 1: Editable Table With Bulk Actions", level: 2 },
  { id: "challenge-2", title: "Challenge 2: Complex Form Wizard", level: 2 },
  { id: "challenge-3", title: "Challenge 3: Search + Filters + Lists", level: 2 },
  { id: "challenge-4", title: "Challenge 4: Rendering Bug Hunt", level: 2 },
  { id: "challenge-5", title: "Challenge 5: Component API Design", level: 2 },
  { id: "how-to-answer", title: "How to Answer Under Interview Pressure", level: 2 },
  { id: "practice-ladder", title: "Practice Ladder", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

const challengeRows = [
  {
    challenge: "Editable data table",
    tests: "State shape, derivation, optimistic updates, row identity, reducer design",
    commonFailure: "Stores every projection in state and loses sync between rows, filters, and bulk actions",
  },
  {
    challenge: "Complex form wizard",
    tests: "Validation boundaries, field modeling, async submission, pending/error UX",
    commonFailure: "Builds one giant object + boolean soup and cannot explain impossible states",
  },
  {
    challenge: "Search + filter list",
    tests: "Effects, debouncing, cancellation, URL sync, performance",
    commonFailure: "Uses one giant effect for everything and introduces race conditions",
  },
  {
    challenge: "Rendering bug hunt",
    tests: "Profiler usage, re-render diagnosis, memoization discipline, context strategy",
    commonFailure: "Sprinkles useMemo/useCallback everywhere before proving the bottleneck",
  },
  {
    challenge: "Component API design",
    tests: "Composition, controlled vs uncontrolled, accessibility, extensibility",
    commonFailure: "Builds a prop explosion instead of a coherent API surface",
  },
];

const interviewLoop = String.raw`flowchart TD
    A["1. Clarify the user flow"] --> B["2. Name the core state domains"]
    B --> C["3. Separate stored vs derived state"]
    C --> D["4. Choose local state, reducer, context, or server state boundary"]
    D --> E["5. Identify async edges: fetch, validate, submit, retry"]
    E --> F["6. Talk through failure cases and accessibility"]
    F --> G["7. Ship a minimal version, then add polish/perf"]
    G --> H["8. Mention debugging and profiling plan"]
`;

export default function ReactInterviewChallenges() {
  return (
    <div className="article-content">
      <p>
        This module is the bridge between <em>knowing React concepts</em> and{" "}
        <em>performing well in a real React interview</em>. Most frontend interviews do not ask
        you to recite what <code>useEffect</code> does. They ask you to design a feature, fix a
        bug, model messy state, or talk through a UI that has tables, forms, lists, async work,
        and performance constraints all at once.
      </p>

      <h2 id="why-this-module-exists">Why This Module Exists</h2>

      <p>
        The hardest part of React interviews is usually not syntax. It is structuring your
        thinking under pressure. You need to show that you can break a UI into state domains,
        choose the right ownership boundaries, avoid accidental complexity, and narrate tradeoffs
        clearly enough that another engineer would trust you on a production feature.
      </p>

      <p>
        Treat each challenge in this module as a realistic prompt. Don&apos;t just jump to code.
        Practice the habits senior engineers actually use: clarifying requirements, modeling
        the data flow, calling out failure modes, and deliberately choosing where React state
        should live.
      </p>

      <h2 id="challenge-map">Challenge Map</h2>

      <ArticleTable
        caption="What each React interview challenge is really testing."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Challenge shape</th>
              <th scope="col">What it tests</th>
              <th scope="col">Common weak answer</th>
            </tr>
          </thead>
          <tbody>
            {challengeRows.map((row) => (
              <tr key={row.challenge}>
                <th scope="row">{row.challenge}</th>
                <td>{row.tests}</td>
                <td>{row.commonFailure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ArticleTable>

      <MermaidBlock />

      <h2 id="challenge-1">Challenge 1: Editable Table With Bulk Actions</h2>

      <InterviewChallenge
        title="Admin Users Table"
        scenario={
          <>
            Build a users table with server-backed pagination, sortable columns, row selection,
            inline role editing, bulk deactivate, and a filter bar. The interviewer may ask you
            to add one feature mid-stream: preserve unsaved row edits while pagination changes, or
            support a &quot;select all matching rows&quot; behavior for filtered results.
          </>
        }
        tasks={[
          "Explain the state model before you code: source rows, query params, selection, draft edits, and submission states.",
          "Decide which values are stored and which are derived, especially counts, visible rows, and selection summaries.",
          "Describe how you would handle optimistic row edits, rollback, and partial failures for bulk actions.",
          "Explain when a reducer becomes more maintainable than multiple useState calls.",
        ]}
        pitfalls={[
          "Tracking selection by array index instead of stable ids.",
          "Duplicating filtered rows and sorted rows in state.",
          "Mixing server data, UI drafts, and submission flags into one flat object with unclear ownership.",
        ]}
        signal="The best answers model stable identities first, derive projections during render, and make it obvious how edits survive refetches without mutating source data."
      />

      <h2 id="challenge-2">Challenge 2: Complex Form Wizard</h2>

      <InterviewChallenge
        title="Onboarding or Checkout Wizard"
        scenario={
          <>
            Implement a multi-step form with conditional fields, async validation, a review step,
            and a final server submission. A common twist is that one step depends on data from a
            previous step, or that a field can be auto-saved in the background while the user keeps
            editing.
          </>
        }
        tasks={[
          "Choose the form state shape so impossible combinations are hard to represent.",
          "Separate field-level validation, step-level gating, and final submission errors.",
          "Explain when uncontrolled inputs are still useful and when controlled inputs are required.",
          "Design the pending and error UX so users understand whether the form is validating, saving, or submitting.",
        ]}
        pitfalls={[
          "One giant form object plus many booleans like isDirty, isValid, isSaving, isSubmitted with no clear state machine.",
          "Running validation in effects when the logic belongs in handlers or schema-based validation.",
          "Putting every UI concern into global context even though most of it is local to the wizard subtree.",
        ]}
        signal="Strong answers talk about state machines, validation boundaries, and user feedback with enough precision that the feature sounds maintainable before a single input is rendered."
      />

      <h2 id="challenge-3">Challenge 3: Search + Filters + Lists</h2>

      <InterviewChallenge
        title="Faceted Directory or Marketplace"
        scenario={
          <>
            Build a searchable list view with text search, category filters, sort order, result
            counts, empty states, skeletons, and query-string synchronization. The bug version of
            this prompt is even more common: old responses overwrite fresh ones, typing feels
            laggy, or changing filters causes unnecessary refetch loops.
          </>
        }
        tasks={[
          "Describe the difference between local UI state, server state, and derived list state.",
          "Explain how you would debounce input, cancel stale requests, and keep the URL in sync without one giant effect.",
          "Discuss whether useTransition or useDeferredValue helps and what problem each one would actually solve.",
          "Call out how you would test race conditions and stale-closure bugs.",
        ]}
        pitfalls={[
          "A single effect that debounces, fetches, parses, filters, updates the URL, and resets pagination.",
          "Using transitions to hide wasteful rendering instead of reducing work.",
          "Treating every list lag issue as a fetch issue when the real bottleneck is rendering or missing virtualization.",
        ]}
        signal="A senior answer separates concerns cleanly, keeps urgent input responsive, and can explain both the async correctness story and the rendering-performance story."
      />

      <h2 id="challenge-4">Challenge 4: Rendering Bug Hunt</h2>

      <InterviewChallenge
        title="Find the Re-render Storm"
        scenario={
          <>
            You inherit a dashboard where typing into one widget makes unrelated panels re-render,
            notifications cause frame drops, and the team has responded by wrapping half the codebase
            in <code>useMemo</code> and <code>useCallback</code>. The interviewer wants to know if
            you can diagnose the real bottleneck instead of doing ritual performance work.
          </>
        }
        tasks={[
          "Talk through how you would use the React DevTools Profiler to identify the hot path.",
          "Explain what evidence would tell you the issue is prop churn, context churn, expensive rendering, or too many mounted nodes.",
          "Decide which fixes should come first: state colocation, split contexts, memoization, virtualization, or server-side work reduction.",
          "Describe how you would prevent over-optimizing the codebase after the immediate bug is fixed.",
        ]}
        pitfalls={[
          "Adding memoization before proving where the wasted work comes from.",
          "Using a global store as an escape hatch for problems caused by bad state placement.",
          "Treating React performance as only a hooks problem instead of a UI architecture problem.",
        ]}
        signal="Strong candidates narrate performance work as a measurement problem first, a state-ownership problem second, and a memoization problem only when the evidence points there."
      />

      <h2 id="challenge-5">Challenge 5: Component API Design</h2>

      <InterviewChallenge
        title="Build a Reusable Combobox, Drawer, or Data Card System"
        scenario={
          <>
            This is the prompt where the interviewer is testing whether you can design a reusable
            React API rather than just one screen. You may be asked to build a combobox, drawer,
            modal, dashboard card, or card list system that must support multiple layouts and product
            variants later.
          </>
        }
        tasks={[
          "Choose between compound components, slots, controlled props, and local state, and explain why.",
          "Define the minimal API that gives consumers flexibility without creating a prop explosion.",
          "Call out accessibility constraints such as focus management, keyboard navigation, and ARIA semantics.",
          "Explain what should be guaranteed by the component itself versus left to consuming app code.",
        ]}
        pitfalls={[
          "Building a gigantic prop surface to cover every imagined future variation.",
          "Ignoring keyboard/focus behavior while optimizing only for visual flexibility.",
          "Using context for simple parent-child composition when plain props would be clearer.",
        ]}
        signal="The strongest answers sound like library authors: they protect invariants, expose a small but powerful API, and treat accessibility and extensibility as first-class design constraints."
      />

      <h2 id="how-to-answer">How to Answer Under Interview Pressure</h2>

      <InterviewPlaybook
        title="React Interview Answer Framework"
        intro={
          <>
            A strong React answer usually sounds calm and structured. Even if you don&apos;t finish
            the full implementation, interviewers get a lot of signal from how you decompose the
            problem and communicate tradeoffs.
          </>
        }
        steps={[
          "Clarify the user journey and the non-obvious requirements before proposing architecture.",
          "Name the state domains out loud: server data, local UI state, form drafts, derived values, and pending/error states.",
          "Choose ownership deliberately: local state first, reducer when transitions are coupled, context only when multiple consumers truly need the same dependency.",
          "Call out async edges explicitly: fetch, validate, submit, retry, optimistic update, cancellation, and rollback.",
          "Say how you would test or profile the risky parts instead of pretending you can reason about every bug from memory alone.",
        ]}
      />

      <h2 id="practice-ladder">Practice Ladder</h2>

      <p>
        If you want this module to transfer into real interviews, don&apos;t do each challenge just
        once. Repeat it with increasing constraints.
      </p>

      <ol>
        <li>First pass: explain the architecture and state model without coding.</li>
        <li>Second pass: build the minimal working feature with correct ownership boundaries.</li>
        <li>Third pass: add a realistic twist like autosave, optimistic updates, keyboard support, or URL sync.</li>
        <li>Fourth pass: profile or test the weak spots, then explain what you would harden next in production.</li>
      </ol>

      <p>
        This progression matters because interviews often reward deliberate engineering judgment
        more than raw speed. Shipping a smaller correct system and articulating the next tradeoffs
        is usually stronger than rushing into a sprawling implementation.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>React interview challenges usually test state modeling and architecture more than API memorization.</li>
        <li>Tables, forms, lists, and complex UI all become easier when you separate stored state from derived state.</li>
        <li>Effects, async work, and performance bugs are easier to debug when you narrate the system boundaries clearly.</li>
        <li>Good answers are structured: clarify requirements, model state, choose ownership, then discuss failure modes and polish.</li>
        <li>Practicing realistic challenge shapes is one of the fastest ways to become interview-ready in React.</li>
      </ul>
    </div>
  );
}

function MermaidBlock() {
  return (
    <div style={{ margin: "1.4rem 0 1.8rem" }}>
      <div
        style={{
          fontSize: "0.92rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          marginBottom: "0.75rem",
        }}
      >
        A practical loop for attacking React interview prompts without getting lost in implementation details too early.
      </div>

      <MermaidDiagram chart={interviewLoop} title="React interview problem-solving loop" />
    </div>
  );
}
