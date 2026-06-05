import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const leverageDiagram = String.raw`flowchart TD
  A["Accessible Menu<br/>built once in the system"] --> T1["Team 1 app"]
  A --> T2["Team 2 app"]
  A --> T3["Team 3 app"]
  A --> TN["...N teams"]
  T1 --> U["Every user, every app,<br/>gets keyboard + screen reader support"]
  T2 --> U
  T3 --> U
  TN --> U`;

const focusDiagram = String.raw`stateDiagram-v2
  [*] --> Closed
  Closed --> Open : trigger click / Enter / Space
  Open --> FocusTrapped : focus moves into dialog
  FocusTrapped --> FocusTrapped : Tab cycles within
  FocusTrapped --> Closed : Escape / close
  Closed --> Restored : focus returns to trigger
  Restored --> [*]`;

export const toc: TocItem[] = [
  { id: "the-multiplier", title: "Accessibility Is a Force Multiplier", level: 2 },
  { id: "semantics-first", title: "Semantics First, ARIA Second", level: 2 },
  { id: "keyboard", title: "Keyboard Interaction Patterns", level: 2 },
  { id: "roving-tabindex", title: "Roving tabindex", level: 3 },
  { id: "focus", title: "Focus Management", level: 2 },
  { id: "focus-trap", title: "Focus Trapping & Restoration", level: 3 },
  { id: "headless-libs", title: "Headless Accessibility Libraries", level: 2 },
  { id: "naming", title: "Accessible Names & Live Regions", level: 2 },
  { id: "testing", title: "Testing Accessibility", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AccessibilityInDesignSystems() {
  return (
    <div className="article-content">
      <p>
        Accessibility is the single strongest argument for a design system, and the reason is
        leverage: <strong>solve keyboard and screen-reader support once in a shared component, and
        every team that consumes it inherits correct behavior automatically</strong>. The
        accessible combobox is genuinely hard — focus management, ARIA, keyboard semantics, edge
        cases that take weeks to get right. No product team should re-solve it. The design system
        is where that expertise is encoded once and distributed everywhere. This module covers what
        &ldquo;accessible by default&rdquo; actually requires.
      </p>

      <h2 id="the-multiplier">Accessibility Is a Force Multiplier</h2>
      <MermaidDiagram
        chart={leverageDiagram}
        title="Accessibility leverage"
        caption="One accessible primitive, built once in the system, delivers correct behavior to every consuming team and every one of their users."
        minHeight={360}
      />
      <p>
        This also flips the economics: building accessibility into the system is far cheaper than
        retrofitting it across N apps after a lawsuit or audit. And it raises the floor — even teams
        with no accessibility expertise ship accessible UI just by using the components correctly.
        The system&rsquo;s job is to make the accessible path the <em>default</em> path and the
        inaccessible path hard.
      </p>

      <h2 id="semantics-first">Semantics First, ARIA Second</h2>
      <p>
        The first rule of ARIA is <strong>don&rsquo;t use ARIA</strong> when a native element does
        the job. A <code>&lt;button&gt;</code> is focusable, keyboard-operable, and announced as a
        button for free; a <code>&lt;div role=&quot;button&quot;&gt;</code> requires you to
        manually add <code>tabindex</code>, <code>Enter</code>/<code>Space</code> handlers, and
        still behaves subtly wrong. Design system components should be built on the most semantic
        native element possible, and ARIA should only fill gaps native HTML can&rsquo;t.
      </p>

      <CodeBlock
        code={`// ❌ Reinventing a button badly — needs tabindex, key handlers, role, and still wrong
<div role="button" tabIndex={0} onClick={onClick}
     onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}>
  Save
</div>

// ✅ Use the native element — focus, keyboard, semantics, form submission all free
<button type="button" onClick={onClick}>Save</button>

// ARIA only fills real gaps native HTML lacks (e.g. a custom toggle):
<button role="switch" aria-checked={on} onClick={() => setOn(!on)}>
  {on ? "On" : "Off"}
</button>`}
        lang="tsx"
        filename="semantics-first.tsx"
      />

      <h2 id="keyboard">Keyboard Interaction Patterns</h2>
      <p>
        Every interactive component must be fully operable by keyboard, and the expected key
        bindings are <em>standardized</em> by the <strong>WAI-ARIA Authoring Practices Guide
        (APG)</strong> — the reference every serious design system follows. Menus, tabs, comboboxes,
        and grids each have a defined keyboard contract.
      </p>

      <ArticleTable
        caption="WAI-ARIA APG keyboard contracts for common composite widgets."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Widget</th>
              <th>Arrow keys</th>
              <th>Enter / Space</th>
              <th>Escape</th>
              <th>Home / End</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Menu</td>
              <td>Move between items</td>
              <td>Activate item</td>
              <td>Close, restore focus</td>
              <td>First / last item</td>
            </tr>
            <tr>
              <td>Tabs</td>
              <td>Move between tabs</td>
              <td>Activate tab</td>
              <td>—</td>
              <td>First / last tab</td>
            </tr>
            <tr>
              <td>Combobox</td>
              <td>Navigate options</td>
              <td>Select option</td>
              <td>Close listbox</td>
              <td>First / last option</td>
            </tr>
            <tr>
              <td>Dialog</td>
              <td>—</td>
              <td>—</td>
              <td>Close, restore focus</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="roving-tabindex">Roving tabindex</h3>
      <p>
        A key APG technique: in a composite widget (menu, toolbar, radio group), only{" "}
        <strong>one</strong> item is in the tab order at a time. <code>Tab</code> enters/exits the
        widget as a unit; <em>arrow keys</em> move within it. This is the <strong>roving
        tabindex</strong> pattern — the active item has <code>tabindex=&quot;0&quot;</code>, all
        others <code>tabindex=&quot;-1&quot;</code>, and focus moves programmatically on arrow keys.
      </p>

      <CodeBlock
        code={`// Roving tabindex: only the active item is tabbable; arrows move focus
function useRovingTabindex(itemCount: number) {
  const [active, setActive] = React.useState(0);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % itemCount);
    if (e.key === "ArrowUp")   setActive((i) => (i - 1 + itemCount) % itemCount);
    if (e.key === "Home")      setActive(0);
    if (e.key === "End")       setActive(itemCount - 1);
  };
  const getItemProps = (i: number) => ({
    tabIndex: i === active ? 0 : -1,   // only one item in tab order
    "data-active": i === active,
  });
  return { onKeyDown, getItemProps };
}`}
        lang="tsx"
        filename="roving-tabindex.tsx"
      />

      <h2 id="focus">Focus Management</h2>
      <p>
        Focus is the most error-prone part of accessible components. Three rules: focus must always
        be <strong>visible</strong> (never <code>outline: none</code> without a replacement —
        prefer <code>:focus-visible</code> so it shows for keyboard users), focus must be{" "}
        <strong>trapped</strong> inside modals, and focus must be <strong>restored</strong> when an
        overlay closes.
      </p>

      <h3 id="focus-trap">Focus Trapping & Restoration</h3>
      <MermaidDiagram
        chart={focusDiagram}
        title="Dialog focus lifecycle"
        caption="Opening moves focus in and traps it; Tab cycles within; Escape closes and focus returns to the element that opened the dialog."
        minHeight={380}
      />
      <p>
        When a dialog opens, focus moves into it (usually the first focusable element or the
        dialog itself). While open, <code>Tab</code> cycles only within the dialog — it cannot
        escape to the page behind. When it closes, focus returns to the trigger that opened it, so
        keyboard users don&rsquo;t lose their place. Getting all of this right by hand, for every
        overlay, is exactly the kind of work the design system should centralize.
      </p>

      <h2 id="headless-libs">Headless Accessibility Libraries</h2>
      <p>
        Because this behavior is hard and standardized, the pragmatic senior choice is to build on a
        battle-tested <strong>headless library</strong> rather than reimplement it.{" "}
        <strong>Radix Primitives</strong>, <strong>React Aria</strong> (Adobe), and{" "}
        <strong>Headless UI</strong> ship the focus management, keyboard handling, and ARIA wiring
        with no styling — you add tokens on top. React Aria in particular encodes years of Adobe
        Spectrum&rsquo;s accessibility work and handles cross-browser/screen-reader quirks most
        teams don&rsquo;t even know exist.
      </p>

      <CodeBlock
        code={`// Build on Radix: accessibility behavior is handled; you only style.
import * as Dialog from "@radix-ui/react-dialog";

export function Modal({ trigger, title, children }: ModalProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog">  {/* focus trap, Escape, aria-modal: free */}
          <Dialog.Title className="dialog__title">{title}</Dialog.Title>
          {children}
          <Dialog.Close asChild><button aria-label="Close">×</button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}`}
        lang="tsx"
        filename="radix-modal.tsx"
      />

      <h2 id="naming">Accessible Names & Live Regions</h2>
      <p>
        Every interactive element needs an <strong>accessible name</strong> — what a screen reader
        announces. Visible text is the best source; icon-only buttons need <code>aria-label</code>.
        Dynamic updates (toasts, async results, form errors) must be announced via{" "}
        <strong>live regions</strong> (<code>aria-live</code>) so users who can&rsquo;t see the
        change still hear it. A design system should bake live regions into its Toast and form-error
        components so teams get announcements for free.
      </p>

      <CodeBlock
        code={`// Icon-only button: accessible name via aria-label (decorative icon hidden)
<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

// Toast region announces new messages without stealing focus:
<div aria-live="polite" aria-atomic="true" className="toast-region">
  {toasts.map((t) => <Toast key={t.id}>{t.message}</Toast>)}
</div>
// "polite" waits for a pause; "assertive" interrupts (use for errors only).`}
        lang="tsx"
        filename="accessible-names.tsx"
      />

      <h2 id="testing">Testing Accessibility</h2>
      <p>
        Automated tools (<strong>axe-core</strong>, jest-axe, Storybook&rsquo;s a11y addon) catch
        ~30–40% of issues — missing labels, contrast failures, bad roles — and belong in CI. But
        they cannot verify keyboard flow or screen-reader experience. The system needs both:
        automated axe checks on every component story, <em>plus</em> manual keyboard-only and
        screen-reader passes for interactive components. We go deeper on this in the testing module.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you ensure accessibility in a design system?'"
        intro="Interviewers want the leverage argument plus concrete mechanics. Generic 'we use ARIA' answers signal shallow knowledge."
        steps={[
          "Lead with leverage: solve a11y once in shared components and every consuming team inherits it — the strongest ROI for a design system.",
          "Semantics first: build on native elements; use ARIA only to fill gaps. Follow the WAI-ARIA APG for keyboard contracts.",
          "Detail focus management: visible focus (:focus-visible), focus trap in modals, focus restoration on close, roving tabindex in composites.",
          "Recommend building on headless libraries (Radix, React Aria) rather than reimplementing fragile a11y behavior.",
          "Testing: automated axe in CI catches ~a third; add manual keyboard + screen-reader passes for interactive components.",
        ]}
      />

      <InterviewChallenge
        title="Audit an inaccessible dropdown"
        scenario={
          <>
            A team built a custom dropdown menu as{" "}
            <code>&lt;div onClick&gt;</code> elements. It works with a mouse but: it can&rsquo;t be
            opened or navigated by keyboard, screen readers announce nothing useful, focus stays on
            the page behind when it opens, and closing it leaves focus lost. They want it added to
            the design system.
          </>
        }
        tasks={[
          "List every accessibility defect and the correct behavior for each.",
          "Decide whether to fix it in place or rebuild on a headless primitive, and justify it.",
          "Describe how you'd prevent these defects from reaching the system again.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Defects → fixes:</strong> (1) <code>div</code> triggers aren&rsquo;t focusable
            or keyboard-operable → use a real <code>&lt;button&gt;</code> with{" "}
            <code>aria-haspopup=&quot;menu&quot;</code> and <code>aria-expanded</code>. (2) No
            keyboard nav → implement APG menu keys (arrows, Enter, Escape, Home/End) with roving
            tabindex. (3) Screen reader silent → correct <code>role=&quot;menu&quot;</code>/
            <code>menuitem</code> and accessible names. (4) Focus not managed → move focus into the
            menu on open, trap it, and restore to the trigger on close.
          </p>
          <p>
            <strong>Rebuild on a headless primitive</strong> (Radix <code>DropdownMenu</code> or
            React Aria). Reimplementing all of the above correctly across browsers and screen
            readers is weeks of work and a perpetual bug source; a headless base gives it for free
            and you only add token styling. Fixing in place re-solves a solved problem.
          </p>
          <p>
            <strong>Prevention:</strong> make the accessible primitive the only sanctioned path
            (lint against raw <code>role=&quot;button&quot;</code>/clickable divs), require a
            jest-axe check + keyboard interaction test in every component story, and add an
            accessibility checklist to the contribution/PR template.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Accessibility is the design system&rsquo;s biggest <strong>force multiplier</strong> —
          solve it once, every consumer inherits it.
        </li>
        <li>
          <strong>Semantics first:</strong> build on native elements; use ARIA only to fill gaps.
          Follow the <strong>WAI-ARIA APG</strong> keyboard contracts.
        </li>
        <li>
          Master focus: <strong>visible focus</strong> (<code>:focus-visible</code>),{" "}
          <strong>focus trap</strong> in modals, <strong>focus restoration</strong> on close, and{" "}
          <strong>roving tabindex</strong> in composites.
        </li>
        <li>
          Build on <strong>headless libraries</strong> (Radix, React Aria) instead of reinventing
          fragile accessibility behavior.
        </li>
        <li>
          Provide <strong>accessible names</strong> and bake <strong>live regions</strong> into
          toasts and error components.
        </li>
        <li>
          Test with <strong>automated axe in CI</strong> plus <strong>manual keyboard and
          screen-reader</strong> passes — automation catches only about a third.
        </li>
      </ul>
    </div>
  );
}
