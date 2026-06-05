import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const stateDiagram = String.raw`stateDiagram-v2
  [*] --> Closed
  Closed --> Open : click trigger / ArrowDown / type
  Open --> Filtering : user types
  Filtering --> Open : results update
  Open --> Closed : Escape / select / blur
  Open --> Highlight : ArrowUp/Down
  Highlight --> Selected : Enter / click
  Selected --> Closed : commit value + restore focus`;

const layersDiagram = String.raw`flowchart TD
  HEADLESS["Headless layer<br/>state + keyboard + ARIA (Radix/React Aria)"] --> WRAP["System wrapper<br/>tokens + variants + Field wiring"]
  WRAP --> STORIES["Stories<br/>every state"]
  WRAP --> TESTS["Tests<br/>interaction + axe"]
  WRAP --> APP["Product usage"]`;

export const toc: TocItem[] = [
  { id: "the-jump", title: "The Jump from Atoms to Hard Components", level: 2 },
  { id: "spec-first", title: "Spec First: The Interaction Contract", level: 2 },
  { id: "build-or-buy", title: "Build the Behavior or Buy It", level: 2 },
  { id: "combobox", title: "Building a Combobox on Radix", level: 2 },
  { id: "styling-states", title: "Styling Every State", level: 2 },
  { id: "stories", title: "Stories for Every State", level: 2 },
  { id: "testing", title: "Testing the Interactions", level: 2 },
  { id: "scratch-note", title: "When You Must Build Behavior From Scratch", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function BuildingAComplexComponent() {
  return (
    <div className="article-content">
      <p>
        Buttons and inputs are warm-ups. The components that define whether a design system is
        trusted — <strong>Combobox, Dialog, Menu, Tooltip, Date Picker</strong> — are an order of
        magnitude harder because they combine state, keyboard interaction, focus management, ARIA,
        positioning, and async data. This module is a complete, runnable build of a production
        <code>Combobox</code> (autocomplete select), end to end: spec → behavior → styling → stories
        → tests. It&rsquo;s the template you&rsquo;ll reuse for every hard component.
      </p>

      <h2 id="the-jump">The Jump from Atoms to Hard Components</h2>
      <p>
        A Combobox must: open on click/typing/arrow, filter options as you type, highlight options
        with arrow keys, select with Enter/click, close on Escape/blur/select, manage focus
        (<code>aria-activedescendant</code> so focus stays in the input while highlighting options),
        expose correct roles (<code>combobox</code>/<code>listbox</code>/<code>option</code>),
        position the popover, and handle empty/loading/async states. Getting every detail right by
        hand is weeks of work and a perpetual bug source — which drives the core decision below.
      </p>

      <MermaidDiagram
        chart={stateDiagram}
        title="The Combobox state machine"
        caption="Open, filter, highlight, select, close — each transition has keyboard and pointer triggers plus focus and ARIA obligations."
        minHeight={380}
      />

      <h2 id="spec-first">Spec First: The Interaction Contract</h2>
      <p>
        Before code, write the interaction contract — it doubles as your test plan and your docs.
        For composite widgets, the WAI-ARIA APG already defines the expected keyboard behavior, so
        the spec is mostly &ldquo;follow the APG combobox pattern&rdquo; plus your product specifics
        (async loading, multi-select, empty state).
      </p>

      <ArticleTable
        caption="The Combobox interaction contract (APG combobox pattern)."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Input</th>
              <th>Behavior</th>
              <th>ARIA / focus obligation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Click / type / ↓</td>
              <td>Open listbox</td>
              <td><code>aria-expanded=true</code></td>
            </tr>
            <tr>
              <td>↑ / ↓</td>
              <td>Move highlight</td>
              <td><code>aria-activedescendant</code> → option id (focus stays in input)</td>
            </tr>
            <tr>
              <td>Type</td>
              <td>Filter options</td>
              <td>Announce result count via live region</td>
            </tr>
            <tr>
              <td>Enter / click option</td>
              <td>Select &amp; close</td>
              <td>Commit value, return focus to input</td>
            </tr>
            <tr>
              <td>Escape</td>
              <td>Close, keep value</td>
              <td><code>aria-expanded=false</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="build-or-buy">Build the Behavior or Buy It</h2>
      <p>
        The senior decision: <strong>do not hand-roll the behavior layer for a Combobox.</strong>{" "}
        Build on a headless base — Radix, React Aria, Downshift, or Ark UI — which encodes the APG
        contract, cross-browser quirks, and screen-reader edge cases. Your design system&rsquo;s job
        is the <em>styled wrapper</em>: tokens, variants, states, and Field integration on top of
        proven behavior.
      </p>

      <MermaidDiagram
        chart={layersDiagram}
        title="What you build vs what you reuse"
        caption="Reuse the headless behavior layer; build the token-styled wrapper, stories, and tests on top."
        minHeight={280}
      />

      <h2 id="combobox">Building a Combobox on Radix</h2>
      <p>
        Here&rsquo;s a complete styled Combobox wrapper. (Radix ships these as composable parts;
        React Aria ships hooks — the wrapper pattern is the same.) The system component composes the
        headless parts, applies token classes, and exposes a clean, documented API.
      </p>

      <CodeBlock
        code={`"use client";
import { forwardRef, useState, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";

export interface ComboboxOption { value: string; label: string; }
export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  { options, value, onValueChange, placeholder = "Search…", loading, emptyMessage = "No results" },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  function commit(opt: ComboboxOption) {
    onValueChange?.(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { setOpen(true); setActive((i) => Math.min(i + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setActive((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter" && open && filtered[active]) { commit(filtered[active]); e.preventDefault(); }
    else if (e.key === "Escape") setOpen(false);
  }

  const listboxId = "cbx-list";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="ds-combobox">
          <input
            ref={ref}
            className="ds-input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={open && filtered[active] ? \`opt-\${filtered[active].value}\` : undefined}
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
          />
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          className="ds-combobox__popover"
          onOpenAutoFocus={(e) => e.preventDefault()}   // keep focus in the input
          align="start"
          sideOffset={4}
        >
          <ul id={listboxId} role="listbox" className="ds-combobox__list">
            {loading && <li className="ds-combobox__status" aria-live="polite">Loading…</li>}
            {!loading && filtered.length === 0 && (
              <li className="ds-combobox__status">{emptyMessage}</li>
            )}
            {!loading && filtered.map((opt, i) => (
              <li
                key={opt.value}
                id={\`opt-\${opt.value}\`}
                role="option"
                aria-selected={opt.value === value}
                data-active={i === active}
                className="ds-combobox__option"
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(opt)}
              >
                {opt.label}
              </li>
            ))}
          </ul>
          {/* live region announces result count to screen readers */}
          <span className="sr-only" aria-live="polite">{filtered.length} results</span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});`}
        lang="tsx"
        filename="Combobox.tsx"
      />

      <h2 id="styling-states">Styling Every State</h2>
      <p>
        The component is incomplete until <em>every visual state</em> is styled with tokens: default,
        hover, active/highlighted option, selected, disabled, focus-visible, loading, and empty. Use
        data attributes (<code>data-active</code>, <code>aria-selected</code>) as styling hooks so
        the CSS mirrors the state machine.
      </p>

      <CodeBlock
        code={`.ds-combobox__popover {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevation-3);
  padding: var(--space-1);
  min-width: var(--radix-popover-trigger-width);  /* match input width */
}
.ds-combobox__option {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-default);
}
.ds-combobox__option[data-active="true"] { background: var(--color-bg-hover); }  /* keyboard highlight */
.ds-combobox__option[aria-selected="true"] { font-weight: 600; color: var(--color-action-primary); }
.ds-combobox__status { padding: var(--space-3); color: var(--color-text-muted); }
.ds-input:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }`}
        lang="css"
        filename="combobox.css"
      />

      <h2 id="stories">Stories for Every State</h2>
      <p>
        Per the docs and testing modules, write a story for each state — these become docs, visual
        regression snapshots, and the substrate for interaction tests.
      </p>

      <CodeBlock
        code={`import type { Meta, StoryObj } from "@storybook/react";
import { Combobox } from "./Combobox";

const meta: Meta<typeof Combobox> = { title: "Components/Combobox", component: Combobox, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Combobox>;

const options = [
  { value: "us", label: "United States" }, { value: "ca", label: "Canada" }, { value: "mx", label: "Mexico" },
];

export const Default: Story = { args: { options } };
export const Loading: Story = { args: { options: [], loading: true } };
export const Empty: Story = { args: { options: [], emptyMessage: "No countries found" } };
export const Preselected: Story = { args: { options, value: "ca" } };`}
        lang="tsx"
        filename="Combobox.stories.tsx"
      />

      <h2 id="testing">Testing the Interactions</h2>
      <p>
        Verify the interaction contract with Testing Library (querying by role) and the play
        function, plus an axe check. Test <em>behavior</em>: typing filters, arrows highlight, Enter
        selects, Escape closes.
      </p>

      <CodeBlock
        code={`import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Combobox } from "./Combobox";

const options = [{ value: "us", label: "United States" }, { value: "ca", label: "Canada" }];

test("filters, navigates with keyboard, and selects", async () => {
  const onValueChange = vi.fn();
  render(<Combobox options={options} onValueChange={onValueChange} />);

  const input = screen.getByRole("combobox");
  await userEvent.type(input, "can");                 // filter
  expect(screen.getByRole("option", { name: "Canada" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "United States" })).not.toBeInTheDocument();

  await userEvent.keyboard("{ArrowDown}{Enter}");     // highlight + select
  expect(onValueChange).toHaveBeenCalledWith("ca");
});

test("no a11y violations", async () => {
  const { container } = render(<Combobox options={options} />);
  expect(await axe(container)).toHaveNoViolations();
});`}
        lang="tsx"
        filename="Combobox.test.tsx"
      />

      <h2 id="scratch-note">When You Must Build Behavior From Scratch</h2>
      <p>
        Sometimes you can&rsquo;t use a headless lib (framework-agnostic web-component system, a
        widget no library covers). Then you own the full APG implementation: roving focus or{" "}
        <code>aria-activedescendant</code>, the complete keyboard map, focus trap/restoration for
        overlays, and exhaustive screen-reader testing across NVDA/VoiceOver/JAWS. Budget for it —
        it&rsquo;s genuinely weeks per complex widget — and lean on the APG&rsquo;s reference code.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through building a Combobox for a design system.'"
        intro="A favorite staff-level prompt. The signal is: spec the contract, reuse the behavior layer, and know all the states — not heroically hand-rolling ARIA."
        steps={[
          "Start with the interaction contract (APG combobox pattern): open/filter/highlight/select/close, with aria-expanded, aria-activedescendant, listbox/option roles.",
          "Make the build-vs-buy call explicitly: build on a headless base (Radix/React Aria/Downshift) — re-solving combobox a11y is weeks of work and a bug source.",
          "Your job is the styled wrapper: token classes, every state (hover/active/selected/disabled/loading/empty), Field integration, clean documented API.",
          "Stories for every state double as docs, visual snapshots, and interaction tests; verify behavior by role + an axe check.",
          "Acknowledge the from-scratch case (web-component systems): you'd own the full APG impl, focus management, and multi-screen-reader testing.",
        ]}
      />

      <InterviewChallenge
        title="Add async search to the Combobox"
        scenario={
          <>
            Product wants the Combobox to fetch options from an API as the user types (server-side
            search over thousands of records), with a loading indicator, debouncing, and graceful
            handling of out-of-order responses. Extend your component.
          </>
        }
        tasks={[
          "Describe the state and effects you'd add for async search.",
          "Handle debouncing and the race condition where an earlier request resolves after a later one.",
          "Keep the accessibility (loading + result announcements) correct.",
        ]}
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>State/effects:</strong> add <code>loading</code>, the fetched <code>options</code>,
          and a debounced effect on <code>query</code>. Debounce ~250ms so you don&rsquo;t fire per
          keystroke.
        </p>
        <CodeBlock
          code={`useEffect(() => {
  if (!query) return;
  const controller = new AbortController();
  const t = setTimeout(async () => {
    setLoading(true);
    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, { signal: controller.signal });
      setOptions(await res.json());
    } catch (e) { if (e.name !== "AbortError") setError(true); }
    finally { setLoading(false); }
  }, 250);                                  // debounce
  return () => { clearTimeout(t); controller.abort(); };  // cancels stale request -> fixes race
}, [query]);`}
          lang="tsx"
        />
        <p>
          <strong>Race fix:</strong> the <code>AbortController</code> in the cleanup cancels the
          previous in-flight request whenever <code>query</code> changes, so an earlier response can
          never overwrite a later one. (Alternatively, track a request id and ignore stale
          responses.)
        </p>
        <p>
          <strong>A11y:</strong> keep the <code>aria-live=&quot;polite&quot;</code> status showing
          &ldquo;Loading…&rdquo; then the result count, so screen-reader users hear the async update.
          Don&rsquo;t move focus during loading; keep <code>aria-activedescendant</code> consistent
          once results arrive.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Complex components (Combobox/Dialog/Menu) combine <strong>state, keyboard, focus, ARIA,
          positioning, async</strong> — orders of magnitude harder than atoms.
        </li>
        <li>
          <strong>Spec the interaction contract first</strong> (follow the WAI-ARIA APG) — it&rsquo;s
          your docs and test plan.
        </li>
        <li>
          <strong>Build on a headless base</strong> (Radix/React Aria/Downshift); your job is the
          token-styled wrapper, not re-solving accessibility.
        </li>
        <li>
          Style <strong>every state</strong> with token-driven data-attribute hooks; write a{" "}
          <strong>story per state</strong> for docs + visual + interaction tests.
        </li>
        <li>
          Async needs <strong>debouncing + request cancellation</strong> (AbortController) to fix
          out-of-order responses, with live-region announcements preserved.
        </li>
      </ul>
    </div>
  );
}
