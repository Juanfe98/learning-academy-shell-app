import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const genericTypeFlowDiagram = String.raw`flowchart TD
  T["T extends object\n(type parameter on Select)"]
  T --> OPT["options: T[]\n(array of items)"]
  T --> VAL["value: T\n(current selection)"]
  T --> CHG["onChange: (val: T) => void\n(callback — T inferred, not any)"]
  OPT --> RENDER["getLabel(item: T): string\n(custom render — T still in scope)"]
  VAL --> RENDER
  CHG --> CONSUMER["Consumer call site\nTypeScript verifies val matches T"]
  RENDER --> SAFE["End-to-end type safety\nNo casts. No any. Compiler catches mismatches."]`;

const contextPatternDiagram = String.raw`flowchart TD
  CTX["createContext\x28undefined as T | undefined\x29\n(undefined signals 'outside provider')"]
  CTX --> PROV["Provider wraps subtree\nvalue: T — always defined here"]
  CTX --> HOOK["useMyContext custom hook\nreads context with useContext"]
  HOOK --> CHECK{"{value === undefined?}"}
  CHECK -->|"yes"| THROW["throw new Error\n'useMyContext must be inside MyProvider'"]
  CHECK -->|"no"| RETURN["return value\ntype is T — not T | undefined"]
  RETURN --> CONSUMER["Consumer component\ngets T — no ! assertion needed"]
  THROW --> DEV["Dev-time guard\nfails loudly before production"]`;

export const toc: TocItem[] = [
  { id: "generic-components", title: "Generic Components", level: 2 },
  { id: "componentprops-and-html-attributes", title: "ComponentProps & HTML Attribute Inference", level: 2 },
  { id: "forwardref-typing", title: "forwardRef Typing", level: 2 },
  { id: "discriminated-unions-for-variants", title: "Discriminated Unions for Variants", level: 2 },
  { id: "polymorphic-as-prop", title: "Polymorphic as Prop Pattern", level: 2 },
  { id: "type-safe-usereducer", title: "Type-Safe useReducer", level: 2 },
  { id: "context-typing-without-assertions", title: "Context Typing Without Assertions", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypeScriptAndReact() {
  return (
    <div className="article-content">
      <p>
        Most React developers use TypeScript to satisfy the compiler — adding types until the red
        squiggles disappear. That is not the goal. The goal is to make the type system document
        your <em>constraints</em>: which props are mutually exclusive, what shape a reducer action
        must take, which components must be wrapped in a provider. Done well, TypeScript in React
        catches entire categories of bugs before they reach review, and makes components
        self-documenting without a single line of JSDoc. That&apos;s the difference between
        TypeScript as a linter and TypeScript as a design tool — and it is what staff-level
        engineers are evaluated on.
      </p>

      <h2 id="generic-components">Generic Components</h2>

      <p>
        A generic component preserves type information through its interface. The most common
        mistake is to reach for <code>any[]</code> or a union of concrete types when you actually
        want a type parameter that the caller controls. The payoff: the compiler can verify that
        <code>onChange</code> gives you back the same type you passed into <code>options</code>,
        without a cast at the call site.
      </p>

      <pre><code>{`// Bad: caller loses type safety — onChange gives you back 'any'
type SelectProps = {
  options: any[];
  value: any;
  onChange: (val: any) => void;
  getLabel: (item: any) => string;
};

// Good: T is inferred from the 'options' prop at the call site
type SelectProps<T extends object> = {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  getLabel: (item: T) => string;
};

function Select<T extends object>({
  options,
  value,
  onChange,
  getLabel,
}: SelectProps<T>) {
  return (
    <ul>
      {options.map((item, i) => (
        <li key={i} onClick={() => onChange(item)}>
          {getLabel(item)}
        </li>
      ))}
    </ul>
  );
}

// At the call site — T is inferred as { id: string; name: string }
// TypeScript will error if you pass a User to onChange expecting a Role.
<Select
  options={users}
  value={selectedUser}
  onChange={(user) => setSelectedUser(user)}  // user: User, not any
  getLabel={(user) => user.name}
/>`}</code></pre>

      <MermaidDiagram
        chart={genericTypeFlowDiagram}
        title="Generic Type Flow Through a Select Component"
        caption="T flows from the options array through value and onChange — the compiler enforces consistency at every step without a single cast."
        minHeight={420}
      />

      <p>
        The constraint <code>T extends object</code> is intentional — it prevents primitive types
        (strings, numbers) which would cause issues with React key handling and object identity
        checks. Tighten the constraint to match your domain: <code>T extends &#123; id: string &#125;</code>
        if your list items always have an <code>id</code>.
      </p>

      <h2 id="componentprops-and-html-attributes">ComponentProps &amp; HTML Attribute Inference</h2>

      <p>
        Building a design system means wrapping native HTML elements. The trap is to manually
        redeclare every prop the underlying element accepts — you will miss some, others will
        drift. The right approach is to derive wrapper props from the element type itself using
        utility types from <code>react</code>.
      </p>

      <pre><code>{`import { ComponentProps, HTMLAttributes, ButtonHTMLAttributes } from "react";

// Pattern 1: wrap a native element — extends its full attribute set
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

function Button({ variant = "primary", className, ...rest }: ButtonProps) {
  return (
    <button
      className={\`btn btn--\${variant} \${className ?? ""}\`}
      {...rest}  // all HTMLButtonElement attributes pass through
    />
  );
}

// Pattern 2: wrap a custom component — derive props from it
type IconButtonProps = ComponentProps<typeof Button> & {
  icon: React.ReactNode;
};

function IconButton({ icon, children, ...rest }: IconButtonProps) {
  return (
    <Button {...rest}>
      {icon}
      {children}
    </Button>
  );
}

// Pattern 3: omit a prop you want to control yourself
type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "className"> & {
  variant?: "elevated" | "flat";
};`}</code></pre>

      <ArticleTable
        caption="React TypeScript utility types for prop inference — pick the right tool based on what you are wrapping."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Utility Type</th>
              <th>Source</th>
              <th>Use Case</th>
              <th>Gotcha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ComponentProps&lt;T&gt;</code></td>
              <td><code>react</code></td>
              <td>Derive props from any component or tag: <code>ComponentProps&lt;typeof Input&gt;</code> or <code>ComponentProps&lt;&quot;button&quot;&gt;</code></td>
              <td>Includes <code>ref</code> only if T uses <code>forwardRef</code></td>
            </tr>
            <tr>
              <td><code>ComponentPropsWithRef&lt;T&gt;</code></td>
              <td><code>react</code></td>
              <td>Same as above but always includes <code>ref</code></td>
              <td>Use when building a wrapper that forwards refs</td>
            </tr>
            <tr>
              <td><code>ComponentPropsWithoutRef&lt;T&gt;</code></td>
              <td><code>react</code></td>
              <td>Explicitly excludes <code>ref</code> from props</td>
              <td>Prefer when you are not forwarding refs</td>
            </tr>
            <tr>
              <td><code>HTMLAttributes&lt;T&gt;</code></td>
              <td><code>react</code></td>
              <td>Generic HTML element attributes: <code>id</code>, <code>className</code>, <code>style</code>, event handlers</td>
              <td>Misses element-specific attrs like <code>href</code> or <code>type</code></td>
            </tr>
            <tr>
              <td><code>ButtonHTMLAttributes&lt;T&gt;</code></td>
              <td><code>react</code></td>
              <td>Button-specific attrs + all HTMLAttributes</td>
              <td>Use <code>*HTMLAttributes&lt;HTMLElement&gt;</code> for full specificity</td>
            </tr>
            <tr>
              <td><code>Omit&lt;T, K&gt;</code></td>
              <td>TypeScript</td>
              <td>Remove props you want to control: <code>Omit&lt;ButtonProps, &quot;onClick&quot;&gt;</code></td>
              <td>Does not give an error if K does not exist in T</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="forwardref-typing">forwardRef Typing</h2>

      <p>
        <code>React.forwardRef</code> takes two type parameters: the <strong>element type</strong>
        the ref will point to, and the <strong>props type</strong>. The order is always
        <code>forwardRef&lt;ElementType, Props&gt;</code> — and getting that order wrong is the
        number-one mistake. The ref type comes first because it describes what <em>consumers</em>
        of the ref will receive; props come second because they describe what the component accepts.
      </p>

      <pre><code>{`import { forwardRef, useImperativeHandle, useRef } from "react";

// Basic forwardRef: expose the input DOM element
type TextInputProps = {
  label: string;
  error?: string;
} & ComponentPropsWithoutRef<"input">;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, ...rest }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...rest} />
        {error && <span>{error}</span>}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

// Advanced: useImperativeHandle — expose a custom interface instead of the DOM element
type DialogHandle = {
  open: () => void;
  close: () => void;
};

type DialogProps = {
  children: React.ReactNode;
};

const Dialog = forwardRef<DialogHandle, DialogProps>(({ children }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  return isOpen ? (
    <dialog ref={dialogRef} open>
      {children}
    </dialog>
  ) : null;
});

// At the call site — ref is typed as DialogHandle, not HTMLDialogElement
const ref = useRef<DialogHandle>(null);
ref.current?.open(); // TypeScript knows this method exists`}</code></pre>

      <InterviewPlaybook
        title="How to answer: Explain forwardRef and when you would use useImperativeHandle"
        intro="Most candidates can describe forwardRef. Strong answers distinguish between forwarding a DOM element ref (simple case) and exposing a custom imperative API (useImperativeHandle), and explain why the latter is preferable for complex components."
        steps={[
          "Start with the constraint: React props are one-way, but parent components sometimes need to call methods on child components imperatively — focus an input, open a modal, scroll to a position.",
          "Describe forwardRef as the mechanism to forward a ref created by the parent through to a DOM element inside the child.",
          "Introduce useImperativeHandle as the pattern to expose a custom API: instead of giving the parent a raw DOM element (which leaks internals), you expose only the methods the parent legitimately needs.",
          "Name the production use case: a design system Dialog component that exposes open() and close() methods — consumers should not know whether it uses a native <dialog> or a div.",
          "Mention the type ordering gotcha in TypeScript: forwardRef<ElementType, Props> — ref type first, props second.",
        ]}
      />

      <h2 id="discriminated-unions-for-variants">Discriminated Unions for Variants</h2>

      <p>
        Optional boolean props for variants are a trap. <code>isPrimary</code>, <code>isDanger</code>,
        and <code>isGhost</code> can all be true simultaneously — an illegal state your type
        allows but your UI cannot render. Discriminated unions make mutually exclusive combinations
        <strong>impossible to represent</strong>.
      </p>

      <pre><code>{`// Bad: three booleans that should be mutually exclusive
type ButtonProps = {
  isPrimary?: boolean;
  isDanger?: boolean;
  isGhost?: boolean;
  children: React.ReactNode;
};
// Nothing prevents: <Button isPrimary isDanger /> — both true, undefined behavior.

// Good: discriminated union — one variant at a time
type ButtonProps =
  | { variant: "primary"; children: React.ReactNode }
  | { variant: "danger"; confirmLabel?: string; children: React.ReactNode }
  | { variant: "ghost"; children: React.ReactNode };

function Button(props: ButtonProps) {
  // TypeScript narrows inside switch — props.confirmLabel only accessible when
  // variant === "danger"
  switch (props.variant) {
    case "primary": return <button className="btn-primary">{props.children}</button>;
    case "danger":
      return (
        <button className="btn-danger" aria-label={props.confirmLabel}>
          {props.children}
        </button>
      );
    case "ghost":  return <button className="btn-ghost">{props.children}</button>;
    default:
      // Exhaustive check: if you add a new variant without handling it here,
      // TypeScript errors at compile time.
      const _exhaustive: never = props;
      return _exhaustive;
  }
}`}</code></pre>

      <p>
        The <code>never</code> exhaustive check pattern is the staff-level answer to
        &ldquo;how do you handle new enum values safely?&rdquo; When someone adds a fourth
        variant and forgets to handle it in <code>switch</code>, the assignment
        <code>const _exhaustive: never = props</code> will fail at build time — not silently
        render the wrong thing in production.
      </p>

      <h2 id="polymorphic-as-prop">Polymorphic as Prop Pattern</h2>

      <p>
        A polymorphic component renders as different HTML elements based on a prop — a
        <code>Text</code> component that renders as <code>&lt;p&gt;</code>, <code>&lt;h1&gt;</code>,
        or <code>&lt;span&gt;</code>. Most implementations are wrong: they accept
        <code>as: string</code> and lose all prop safety. The correct version infers the
        valid HTML attributes for whatever element <code>as</code> points to.
      </p>

      <pre><code>{`// Wrong approach — as: string loses all type safety
type TextProps = {
  as?: string;
  children: React.ReactNode;
  [key: string]: unknown; // index signature — defeats the purpose
};

// Correct approach — as constrains valid props to that element's attributes
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = object,
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

// Usage: define your own props, then let the rest come from the element
type TextOwnProps = {
  size?: "sm" | "md" | "lg";
  weight?: "normal" | "bold";
};

type TextProps<C extends React.ElementType> = PolymorphicComponentProps<C, TextOwnProps>;

function Text<C extends React.ElementType = "span">({
  as,
  size = "md",
  weight = "normal",
  children,
  ...rest
}: TextProps<C>) {
  const Component = as ?? "span";
  return (
    <Component className={\`text-\${size} font-\${weight}\`} {...rest}>
      {children}
    </Component>
  );
}

// TypeScript infers the correct props for each element:
<Text as="a" href="/about">Link text</Text>        // href: string — valid for <a>
<Text as="button" onClick={() => {}}>Click</Text>  // onClick — valid for <button>
<Text as="h1">Heading</Text>                       // no href needed — TypeScript knows
// <Text as="a" type="submit">...</Text>           // ERROR: type is not valid on <a>`}</code></pre>

      <h2 id="type-safe-usereducer">Type-Safe useReducer</h2>

      <p>
        <code>useReducer</code> with discriminated action unions gives you a compile-time
        enforced state machine. The pattern pairs well with the <code>ReturnType</code> trick
        to derive the state type from the initial state, so you only define shape once.
      </p>

      <pre><code>{`// Step 1: define actions as a discriminated union
type CartAction =
  | { type: "ADD_ITEM"; payload: { productId: string; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "SET_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "CLEAR" };

// Step 2: define state — explicit type or use typeof initialState
type CartItem = { productId: string; quantity: number };
type CartState = {
  items: CartItem[];
  lastModified: string | null;
};

// Step 3: reducer — TypeScript narrows payload based on 'type' in each case
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.items.find(
        (i) => i.productId === action.payload.productId
      );
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === action.payload.productId
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
          lastModified: new Date().toISOString(),
        };
      }
      return {
        ...state,
        items: [...state.items, action.payload],
        lastModified: new Date().toISOString(),
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (i) => i.productId !== action.payload.productId
        ),
        lastModified: new Date().toISOString(),
      };
    case "SET_QUANTITY":
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.payload.productId
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
        lastModified: new Date().toISOString(),
      };
    case "CLEAR":
      return { items: [], lastModified: new Date().toISOString() };
  }
}

// Step 4: typed selectors — derive from CartState, not from 'any'
const selectTotalItems = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

// Usage
const [cart, dispatch] = useReducer(cartReducer, { items: [], lastModified: null });
dispatch({ type: "ADD_ITEM", payload: { productId: "sku-1", quantity: 2 } });
// dispatch({ type: "ADD_ITEM", payload: { productId: "sku-1" } }); // ERROR: missing quantity`}</code></pre>

      <h2 id="context-typing-without-assertions">Context Typing Without Assertions</h2>

      <p>
        The common pattern for React context is <code>createContext(null as unknown as T)</code>
        or a <code>!</code> non-null assertion in every consumer. Both are lies. The correct
        pattern creates a context typed as <code>T | undefined</code>, then enforces provider
        presence in a custom hook that throws a clear error — making the assertion
        <em>unnecessary</em> because the type is narrowed by the throw.
      </p>

      <pre><code>{`// Bad: cast at creation time — consumers can call this hook outside provider
// and get undefined at runtime while TypeScript stays silent
const ThemeContext = createContext(null as unknown as ThemeContextValue);

// Good: undefined signals 'no provider' — the hook handles it explicitly
type ThemeContextValue = {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// The custom hook: useContext + null guard
// After the throw, TypeScript knows 'value' is ThemeContextValue — not undefined
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value; // type: ThemeContextValue — no assertion needed
}

// Consumer: clean, no ! needed anywhere
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Switch to {theme === "dark" ? "light" : "dark"} mode
    </button>
  );
}`}</code></pre>

      <MermaidDiagram
        chart={contextPatternDiagram}
        title="Type-Safe Context Pattern: createContext + Custom Hook"
        caption="undefined at creation time lets the hook detect missing providers at runtime. The throw narrows the type — no assertions needed downstream."
        minHeight={400}
      />

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: How do you type a reusable data table component?"
        intro="This question separates engineers who add types from engineers who use types to encode constraints. The interviewer wants to hear about generics, derived props, and row-level type safety — not just TypeScript syntax."
        steps={[
          "Start with the data shape: the table needs a generic type parameter T for the row type. columns is ColumnDef<T>[], data is T[]. This means TypeScript can verify that column.accessor points to a real key of T.",
          "Define ColumnDef<T> so each column's accessor is keyof T or a function (row: T) => ReactNode — this gives you cell renderers that are typed to the row, not to any.",
          "Discuss selection state: selected rows are T[] or Set<T['id']> if T has a required id. The onRowSelect callback is (row: T) => void — same T, same guarantee.",
          "Mention the ArticleTable or similar wrapper pattern for HTML attribute inference: the table root extends HTMLAttributes<HTMLTableElement> so consumers can pass standard HTML props without you redeclaring them.",
          "Close with the tradeoff: stricter types mean more complex generics and longer type error messages. The payoff is that consumers can't accidentally pass a User column to a Product table — caught at compile time, not production.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Type a Polymorphic Button Component"
        scenario={
          <>
            Your design system has a <code>Button</code> component that needs to render as a{" "}
            <code>&lt;button&gt;</code> by default, but can render as an <code>&lt;a&gt;</code>{" "}
            when given an <code>href</code>, or as any other element via an <code>as</code> prop.
            The tricky requirement: TypeScript must infer the <strong>correct HTML attributes</strong>{" "}
            for whatever element is used. Passing <code>href</code> should only be valid when{" "}
            <code>as=&quot;a&quot;</code>, and <code>type=&quot;submit&quot;</code> should only be
            valid when rendering as a button.
          </>
        }
        tasks={[
          "Define a PolymorphicButton type that accepts an 'as' prop constrained to React.ElementType and merges the target element's valid HTML attributes into the component's prop set.",
          "Ensure that your own props (variant, size, loading) take precedence over conflicting HTML attributes using Omit.",
          "Write the component implementation such that TypeScript narrows correctly and no type assertions (as or !) are used anywhere in the component body.",
          "Demonstrate correct usage at two call sites: one as a <button type='submit'> and one as an <a href='/docs'> — and show a call site that TypeScript should reject.",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type ButtonOwnProps<E extends ElementType = ElementType> = {
  as?: E;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
};

type ButtonProps<E extends ElementType> = ButtonOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof ButtonOwnProps>;

const defaultElement = "button";

function Button<E extends ElementType = typeof defaultElement>({
  as,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  ...rest
}: ButtonProps<E>) {
  const Component = as ?? defaultElement;
  return (
    <Component
      className={\`btn btn--\${variant} btn--\${size}\${loading ? " btn--loading" : ""}\`}
      {...rest}
    >
      {loading ? <span className="spinner" /> : null}
      {children}
    </Component>
  );
}

// Valid: renders as <button> — type="submit" is valid
<Button type="submit" variant="primary">Save</Button>

// Valid: renders as <a> — href is valid
<Button as="a" href="/docs" variant="ghost">Docs</Button>

// TypeScript error: href is not valid on <button>
// <Button href="/docs">Invalid</Button>
// Argument of type '{ href: string; children: string; }' is not assignable...`}</code></pre>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Types document constraints, not just shapes.</strong> Use discriminated unions for
          mutually exclusive props, generics for reusable components that preserve caller-supplied
          types, and <code>never</code> for exhaustive checks that fail at build time when new
          variants are added.
        </li>
        <li>
          <strong>Derive props, do not redeclare them.</strong> <code>ComponentProps&lt;T&gt;</code>,
          <code>HTMLAttributes&lt;T&gt;</code>, and <code>ComponentPropsWithoutRef&lt;T&gt;</code>
          keep wrapper components in sync with their underlying element — if the element gains a
          new attribute, your wrapper inherits it automatically.
        </li>
        <li>
          <strong>forwardRef generic order matters.</strong> It is always
          <code>forwardRef&lt;ElementType, Props&gt;</code>. Use
          <code>useImperativeHandle</code> to expose a custom API instead of a raw DOM reference
          when the component has complex internal behavior.
        </li>
        <li>
          <strong>Polymorphic components require careful Omit.</strong> Your own props must use
          <code>Omit&lt;ComponentPropsWithoutRef&lt;C&gt;, keyof OwnProps&gt;</code> to prevent
          conflicts. Never use an index signature — it defeats every type guarantee you just built.
        </li>
        <li>
          <strong>Context typed as <code>T | undefined</code> plus a throwing custom hook</strong>{" "}
          eliminates every <code>!</code> assertion from consumers. The throw narrows the type in
          the hook — TypeScript sees <code>T</code> after the guard, not <code>T | undefined</code>.
        </li>
        <li>
          <strong>Typed reducers are state machines.</strong> Discriminated action unions mean
          TypeScript validates that every <code>dispatch</code> call matches a real action shape.
          Combined with the <code>never</code> exhaustive check in the switch, adding a new action
          type without handling it is a compile-time error, not a silent runtime no-op.
        </li>
      </ul>
    </div>
  );
}
