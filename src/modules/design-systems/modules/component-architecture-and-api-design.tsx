import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const layerDiagram = String.raw`flowchart TD
  B["Behavior layer<br/>headless: state, a11y, keyboard"] --> S["Style layer<br/>tokens, variants"]
  S --> API["Public API<br/>props, slots, composition"]
  API --> CONS["Consumer code<br/>product teams"]
  B -.-> |"separable: ship headless<br/>OR styled"| API`;

const compoundDiagram = String.raw`flowchart LR
  subgraph Monolith["Monolithic API (rigid)"]
    M["Select<br/>options={[...]}<br/>renderOption={...}<br/>groupBy={...}<br/>...30 props"]
  end
  subgraph Compound["Compound API (flexible)"]
    Root["Select"] --> Trigger["Select.Trigger"]
    Root --> Content["Select.Content"]
    Content --> Item["Select.Item"]
    Content --> Group["Select.Group"]
  end`;

export const toc: TocItem[] = [
  { id: "api-is-the-product", title: "The API Is the Product", level: 2 },
  { id: "props-design", title: "Designing Props", level: 2 },
  { id: "variants", title: "Variants & cva", level: 3 },
  { id: "controlled", title: "Controlled vs Uncontrolled", level: 2 },
  { id: "composition", title: "Composition Patterns", level: 2 },
  { id: "compound", title: "Compound Components", level: 3 },
  { id: "polymorphism", title: "Polymorphism & asChild", level: 3 },
  { id: "headless", title: "Headless / Behavior-Style Split", level: 2 },
  { id: "antipatterns", title: "API Anti-Patterns", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ComponentArchitectureAndApiDesign() {
  return (
    <div className="article-content">
      <p>
        A design system component is a <strong>public API</strong> consumed by hundreds of other
        engineers, and once they depend on it, every prop you shipped becomes a contract you must
        support — possibly for years. This changes how you design components entirely: the
        question is not &ldquo;does it render correctly?&rdquo; but &ldquo;will this API still feel
        right after 200 teams have used it in ways I never imagined?&rdquo; This module is about
        designing component APIs that are flexible without being chaotic, and the composition
        patterns that make that possible.
      </p>

      <h2 id="api-is-the-product">The API Is the Product</h2>
      <p>
        The hardest part of building a <code>Button</code> is not the CSS — it&rsquo;s deciding
        what props it takes. Too few props and teams fork it the first time they need something
        slightly different. Too many props and it becomes an unlearnable, unmaintainable
        kitchen-sink. The art is exposing the right <strong>flexibility primitives</strong> so
        that the 20% of cases you didn&rsquo;t foresee are still expressible without you shipping a
        prop for each one.
      </p>

      <MermaidDiagram
        chart={layerDiagram}
        title="The three layers of a system component"
        caption="Behavior, styling, and the public API are separable concerns — the most flexible systems let you consume behavior alone (headless) or the styled whole."
        minHeight={360}
      />

      <h2 id="props-design">Designing Props</h2>
      <p>
        Good prop design follows a few hard rules. <strong>Prefer a small set of orthogonal
        props</strong> over many boolean flags — <code>variant=&quot;primary&quot;</code> beats
        <code>isPrimary</code> + <code>isSecondary</code> + <code>isDanger</code> (which permit
        nonsensical combinations like <code>isPrimary</code> AND <code>isDanger</code>). Model
        mutually-exclusive states as a single union-typed prop so the type system forbids invalid
        states.
      </p>

      <CodeBlock
        code={`// ❌ Boolean soup: 2^4 = 16 combinations, most invalid
interface BadButtonProps {
  isPrimary?: boolean;
  isSecondary?: boolean;
  isDanger?: boolean;
  isLarge?: boolean;
}

// ✅ Orthogonal unions: invalid states are unrepresentable
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";  // pick exactly one
  size?: "sm" | "md" | "lg";
  // Always extend the native element's props so onClick, aria-*, type "just work"
}`}
        lang="typescript"
        filename="button-props.ts"
      />

      <p>
        Notice <code>extends React.ButtonHTMLAttributes</code>. A system component should{" "}
        <strong>extend the underlying native element&rsquo;s props</strong> so consumers get{" "}
        <code>onClick</code>, <code>disabled</code>, <code>aria-*</code>, and <code>ref</code>{" "}
        forwarding for free. Forgetting this is the most common reason teams say &ldquo;your Button
        doesn&rsquo;t support X&rdquo; and fork it.
      </p>

      <h3 id="variants">Variants & cva</h3>
      <p>
        Variants (visual styles selected by a prop) are so central that a dedicated tool exists:{" "}
        <strong>cva</strong> (class-variance-authority). It maps prop values to class names with
        type-safe variants and compound variants, and pairs naturally with Tailwind or any utility
        CSS.
      </p>

      <CodeBlock
        code={`import { cva, type VariantProps } from "class-variance-authority";

const button = cva("btn", {
  variants: {
    variant: {
      primary:   "btn--primary",
      secondary: "btn--secondary",
      danger:    "btn--danger",
    },
    size: { sm: "btn--sm", md: "btn--md", lg: "btn--lg" },
  },
  compoundVariants: [
    { variant: "danger", size: "lg", class: "btn--danger-emphasis" },
  ],
  defaultVariants: { variant: "primary", size: "md" },
});

// Props are DERIVED from the variant definition — single source of truth:
type ButtonProps = VariantProps<typeof button> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;`}
        lang="typescript"
        filename="button-variants.ts"
      />

      <h2 id="controlled">Controlled vs Uncontrolled</h2>
      <p>
        Any component with internal state (inputs, toggles, accordions, tabs) faces the{" "}
        <strong>controlled vs uncontrolled</strong> decision — and the senior answer is{" "}
        <em>support both</em>. Uncontrolled (component owns its state, consumer passes{" "}
        <code>defaultValue</code>) is the easy path for simple cases. Controlled (consumer owns
        state via <code>value</code> + <code>onChange</code>) is required when state must sync with
        other things. The standard pattern detects which mode it&rsquo;s in.
      </p>

      <CodeBlock
        code={`function useControllableState<T>(opts: {
  value?: T;            // controlled value (if provided)
  defaultValue?: T;     // initial value for uncontrolled mode
  onChange?: (v: T) => void;
}) {
  const isControlled = opts.value !== undefined;
  const [internal, setInternal] = React.useState(opts.defaultValue);

  const value = isControlled ? opts.value : internal;

  const setValue = (next: T) => {
    if (!isControlled) setInternal(next);  // only own state when uncontrolled
    opts.onChange?.(next);                 // always notify
  };

  return [value, setValue] as const;
}
// This single hook powers Radix, React Aria, and most quality systems.`}
        lang="typescript"
        filename="use-controllable-state.ts"
      />

      <h2 id="composition">Composition Patterns</h2>
      <p>
        Flexibility comes from <strong>composition</strong>, not configuration. Instead of a prop
        for every variation, expose smaller pieces the consumer assembles. The two workhorse
        patterns are <strong>compound components</strong> and <strong>polymorphism</strong>.
      </p>

      <h3 id="compound">Compound Components</h3>
      <p>
        Compound components split one logical component into a set of cooperating subcomponents
        that share implicit state via context. This is how every modern system models{" "}
        <code>Select</code>, <code>Tabs</code>, <code>Accordion</code>, <code>Dialog</code>.
      </p>

      <MermaidDiagram
        chart={compoundDiagram}
        title="Monolithic vs compound APIs"
        caption="A monolith piles config props onto one component; a compound API hands the consumer composable pieces that share state internally."
        minHeight={340}
      />

      <CodeBlock
        code={`const TabsContext = React.createContext<{
  active: string; setActive: (id: string) => void;
} | null>(null);

function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [active, setActive] = React.useState(defaultValue);
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}

function TabsList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const selected = ctx.active === value;
  return (
    <button role="tab" aria-selected={selected} onClick={() => ctx.setActive(value)}>
      {children}
    </button>
  );
}

// Attach as namespaced API — discoverable + clearly related:
Tabs.List = TabsList;
Tabs.Tab = Tab;

// Consumer composes freely — can interleave anything between pieces:
// <Tabs defaultValue="a">
//   <Tabs.List><Tabs.Tab value="a">A</Tabs.Tab><Tabs.Tab value="b">B</Tabs.Tab></Tabs.List>
// </Tabs>`}
        lang="tsx"
        filename="compound-tabs.tsx"
      />

      <h3 id="polymorphism">Polymorphism & asChild</h3>
      <p>
        A <code>Button</code> sometimes needs to render as an <code>&lt;a&gt;</code> (a link styled
        as a button). Two patterns solve this. The <strong>polymorphic <code>as</code> prop</strong>{" "}
        lets the consumer change the rendered element; the <strong><code>asChild</code> pattern</strong>{" "}
        (popularized by Radix) merges the component&rsquo;s props onto its single child instead of
        rendering its own element — cleaner for accessibility and avoids invalid nesting.
      </p>

      <CodeBlock
        code={`// asChild: Button passes its styling/behavior to whatever child you give it
import { Slot } from "@radix-ui/react-slot";

function Button({ asChild, className, ...props }: ButtonProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn("btn btn--primary", className)} {...props} />;
}

// Renders a real <a> with button styles — correct semantics, no nested <a><button>:
// <Button asChild><a href="/pricing">Pricing</a></Button>`}
        lang="tsx"
        filename="aschild-button.tsx"
      />

      <h2 id="headless">Headless / Behavior-Style Split</h2>
      <p>
        The most flexible architecture separates <strong>behavior</strong> (state, keyboard
        interaction, ARIA, focus management) from <strong>presentation</strong> (the styling).{" "}
        <strong>Headless</strong> libraries — Radix Primitives, React Aria, Headless UI, TanStack
        Table — ship the hard, accessibility-critical behavior with zero styles, and you layer your
        tokens on top. Many design systems are now built <em>on</em> a headless layer rather than
        from scratch, because re-implementing a fully accessible combobox is a multi-month trap.
      </p>

      <ArticleTable
        caption="Three component-architecture strategies and when each fits."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>You write</th>
              <th>Best for</th>
              <th>Tradeoff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>From scratch</td>
              <td>Behavior + styles + a11y</td>
              <td>Total control, simple components</td>
              <td>Re-solving accessibility is costly &amp; risky</td>
            </tr>
            <tr>
              <td>Headless base (Radix/React&nbsp;Aria)</td>
              <td>Styles only</td>
              <td>Complex widgets (menu, combobox, dialog)</td>
              <td>Dependency + their API constraints</td>
            </tr>
            <tr>
              <td>Wrap a styled lib (MUI/Mantine)</td>
              <td>Theme config</td>
              <td>Speed over differentiation</td>
              <td>Hard to escape their design opinions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="antipatterns">API Anti-Patterns</h3>
      <ul>
        <li>
          <strong>Boolean explosion</strong> — many flags instead of one union variant prop.
        </li>
        <li>
          <strong>Leaky styling props</strong> — <code>style</code> / arbitrary <code>className</code>{" "}
          everywhere defeats consistency. Allow controlled escape hatches, not unlimited ones.
        </li>
        <li>
          <strong>Not forwarding refs / native props</strong> — guarantees teams will fork.
        </li>
        <li>
          <strong>Render-blocking monoliths</strong> — 30-prop <code>Table</code> nobody can use;
          should be compound.
        </li>
        <li>
          <strong>Inconsistent prop names across components</strong> — <code>onChange</code> here,{" "}
          <code>onValueChange</code> there. Define cross-component naming conventions.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you design a flexible component API for a design system?'"
        intro="The interviewer wants to see that you treat components as long-lived public contracts and reach for composition over configuration."
        steps={[
          "Frame the component as a public API / contract consumed by many teams — every prop is forever.",
          "Prefer orthogonal union props over boolean flags so invalid states are unrepresentable; extend the native element's props and forward refs.",
          "Support both controlled and uncontrolled state via a useControllableState pattern.",
          "Reach for composition — compound components and asChild/polymorphism — instead of adding a prop per use case.",
          "Mention the headless/styled split: build on Radix or React Aria so accessibility behavior isn't reinvented per component.",
        ]}
      />

      <InterviewChallenge
        title="Design the Dialog API"
        scenario={
          <>
            Design the public API for a <code>Dialog</code> (modal) component in a design system.
            It must support a title, a body, footer actions, controlled and uncontrolled open
            state, and a trigger button — and teams will need to customize the footer heavily.
          </>
        }
        tasks={[
          "Decide between a monolithic prop-driven API and a compound API, and justify it.",
          "Show the controlled + uncontrolled open-state handling.",
          "Explain how the trigger avoids invalid <button><button> nesting.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Compound, not monolithic.</strong> A footer that teams &ldquo;customize
            heavily&rdquo; is a dead giveaway: a <code>footer={`{<JSX>}`}</code> prop becomes a
            slot that fights the consumer. Compose instead.
          </p>
          <CodeBlock
            code={`<Dialog open={open} onOpenChange={setOpen}>   {/* controlled */}
  <Dialog.Trigger asChild>                     {/* asChild -> no nested button */}
    <Button>Edit profile</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Edit profile</Dialog.Title>
    <Dialog.Description>Make changes here.</Dialog.Description>
    {/* body */}
    <Dialog.Footer>                            {/* fully composable */}
      <Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close>
      <Button>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>

// Uncontrolled? Omit open/onOpenChange, pass defaultOpen.
// Internally: useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })`}
            lang="tsx"
          />
          <p>
            <code>Dialog.Trigger asChild</code> merges trigger behavior (open-on-click,{" "}
            <code>aria-haspopup</code>, <code>aria-expanded</code>) onto the consumer&rsquo;s own{" "}
            <code>Button</code>, so you render exactly one button element with correct semantics.
            Behavior (focus trap, <code>Escape</code> to close, scroll lock, <code>aria-modal</code>)
            comes from a headless base like Radix Dialog.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A system component is a <strong>public API / long-lived contract</strong> — design it
          for cases you can&rsquo;t foresee.
        </li>
        <li>
          Prefer <strong>orthogonal union props</strong> over boolean flags; extend the native
          element&rsquo;s props and forward refs.
        </li>
        <li>
          Support <strong>controlled and uncontrolled</strong> state with one{" "}
          <code>useControllableState</code> pattern.
        </li>
        <li>
          Favor <strong>composition over configuration</strong>: compound components and{" "}
          <code>asChild</code>/polymorphism beat prop-explosion.
        </li>
        <li>
          Separate <strong>behavior from presentation</strong>; build on headless primitives
          (Radix, React Aria) so accessibility isn&rsquo;t reinvented.
        </li>
        <li>
          Use <strong>cva</strong> or similar to make variants type-safe and single-sourced.
        </li>
      </ul>
    </div>
  );
}
