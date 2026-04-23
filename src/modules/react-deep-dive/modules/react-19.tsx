import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "the-use-hook", title: "The use() Hook", level: 2 },
  { id: "server-actions", title: "Server Actions and the action Prop", level: 2 },
  { id: "use-optimistic", title: "useOptimistic: Built-in Optimistic UI", level: 2 },
  { id: "use-form-status-use-action-state", title: "useFormStatus and useActionState", level: 2 },
  { id: "ref-as-prop", title: "ref as a Regular Prop", level: 2 },
  { id: "react-compiler", title: "The React Compiler", level: 2 },
  { id: "day-to-day-impact", title: "What This Means for Day-to-Day Code", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function React19() {
  return (
    <div className="article-content">
      <p>
        React 19 (stable release December 2024) is the most significant update to the React
        API surface since hooks. It completes the concurrent rendering story, introduces
        first-class form and mutation support, and removes long-standing ergonomic rough edges.
        Some of these features (Server Actions, Server Components) require a framework like
        Next.js — others are available in any React 19 app.
      </p>

      <h2 id="the-use-hook">The use() Hook</h2>

      <p>
        <code>use()</code> is a new hook that reads the value of a Promise or a Context object
        inside a component. What makes it different from <code>useContext</code> is that it can
        be called conditionally — it is not subject to the same position-invariant rules as
        other hooks because React handles it differently internally.
      </p>

      <pre><code>{`import { use, Suspense } from "react";

// use() with a Promise: reads the resolved value.
// If the Promise is pending, the component suspends.
// If the Promise rejects, the nearest Error Boundary catches it.
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends if not resolved yet
  return <div>{user.name}</div>;
}

function App() {
  const userPromise = fetchUser("123"); // starts immediately — before render

  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// use() with Context — the key difference from useContext is conditional calling
function ConditionalTheme({ applyTheme }: { applyTheme: boolean }) {
  if (!applyTheme) return <div>No theme</div>;

  // Legal: use() can be called inside a conditional
  const theme = use(ThemeContext);
  return <div className={theme}>Themed content</div>;
}`}</code></pre>

      <p>
        <code>use()</code> is the foundation for patterns where data fetching happens at
        the component-call site rather than in effects. In React Server Component contexts,
        you can pass a server-side Promise as a prop and <code>use()</code> it on the client.
      </p>

      <h2 id="server-actions">Server Actions and the action Prop</h2>

      <p>
        Server Actions are async functions that run on the server but can be called from client
        components. In React 19, the <code>action</code> prop on forms accepts an async function
        directly — React handles submission state, optimistic updates, and re-validation
        automatically through the new form integration APIs.
      </p>

      <pre><code>{`// Server Action — runs exclusively on the server
// File: app/actions.ts
"use server";

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  try {
    await db.users.create({ name, email });
    revalidatePath("/users");
    return {};
  } catch (error) {
    return { error: "Failed to create user" };
  }
}

// Client component using the Server Action
"use client";
import { createUser } from "./actions";
import { useActionState } from "react";

function CreateUserForm() {
  // useActionState wires the action to form state management.
  // state: the last return value from the action (or initialState)
  // action: the wrapped action to pass to the form
  // isPending: true while the action is in flight
  const [state, action, isPending] = useActionState(createUser, {});

  return (
    <form action={action}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}`}</code></pre>

      <h2 id="use-optimistic">useOptimistic: Built-in Optimistic UI</h2>

      <p>
        Optimistic UI means updating the UI immediately (assuming the server request will succeed)
        and then reconciling when the actual response arrives. React 19 builds this into the
        framework with <code>useOptimistic</code>. The optimistic state is shown while the
        async action is in flight, and automatically reverts to the real state when the action
        completes (either successfully or with an error).
      </p>

      <pre><code>{`import { useOptimistic, useTransition } from "react";

type Message = { id: string; text: string; pending?: boolean };

function MessageList({ messages }: { messages: Message[] }) {
  // useOptimistic(realState, updateFn)
  // optimisticMessages is shown while actions are pending.
  // When the action completes, React reverts to the real messages state.
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (currentMessages: Message[], newText: string) => [
      ...currentMessages,
      { id: crypto.randomUUID(), text: newText, pending: true },
    ]
  );

  const [, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const text = formData.get("message") as string;

    startTransition(async () => {
      // Immediately show the optimistic message
      addOptimisticMessage(text);

      // Then send to the server — if this fails, the optimistic state reverts
      await sendMessage(text);
    });
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map(msg => (
          <li key={msg.id} style={{ opacity: msg.pending ? 0.6 : 1 }}>
            {msg.text} {msg.pending && "(sending...)"}
          </li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="message" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}`}</code></pre>

      <h2 id="use-form-status-use-action-state">useFormStatus and useActionState</h2>

      <p>
        <code>useFormStatus</code> reads the status of the nearest parent form&apos;s action.
        It returns <code>{"{ pending, data, method, action }"}</code>. This lets deeply nested
        child components respond to form submission state without prop drilling.
      </p>

      <pre><code>{`import { useFormStatus } from "react-dom"; // Note: from react-dom, not react

// A submit button that knows when its form is pending — no props needed.
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Submitting..." : children}
    </button>
  );
}

// This works because SubmitButton reads the state of its parent <form>.
// It doesn't need to receive isPending as a prop.
function CheckoutForm() {
  return (
    <form action={submitOrder}>
      <ProductList />
      <ShippingDetails />
      <PaymentSection />
      {/* SubmitButton automatically knows when the form is pending */}
      <SubmitButton>Place Order</SubmitButton>
    </form>
  );
}

// useActionState (previously useFormState before React 19):
// const [state, action, isPending] = useActionState(serverAction, initialState);
// - state: accumulated state from the action's return values
// - action: the action to pass to a form's action prop
// - isPending: true while the action is in flight`}</code></pre>

      <h2 id="ref-as-prop">ref as a Regular Prop</h2>

      <p>
        Before React 19, refs could not be passed as regular props — they had to be forwarded
        using the <code>forwardRef</code> wrapper, which added boilerplate and confused many
        developers. React 19 removes this limitation: <code>ref</code> is now just a regular
        prop. <code>forwardRef</code> still works but is no longer necessary for new code.
      </p>

      <pre><code>{`// Before React 19: forwardRef boilerplate required
import { forwardRef } from "react";

const TextInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
);

// React 19: ref is just a prop — no forwardRef needed
function TextInput({ label, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}

// Usage is identical in both cases:
const inputRef = useRef<HTMLInputElement>(null);
<TextInput ref={inputRef} label="Email" />`}</code></pre>

      <h2 id="react-compiler">The React Compiler</h2>

      <p>
        The React Compiler (previously &quot;React Forget&quot;) is a build-time tool that
        automatically inserts <code>useMemo</code>, <code>useCallback</code>, and
        <code>React.memo</code> where it can prove they are beneficial. It analyzes your
        component code and generates memoization at the compiler level, meaning you write
        plain React code and get the performance characteristics of a fully-optimized codebase.
      </p>

      <p>
        The compiler was shipped to production at Meta before the public release. It is opt-in
        for React 19 apps. The impact: if you are writing idiomatic React (no mutations of
        props or state, pure render functions), you can largely stop thinking about manual
        memoization. The compiler handles it more precisely than human judgment anyway.
      </p>

      <pre><code>{`// Before React Compiler: manual memoization
function ProductCard({ product, onAddToCart }: Props) {
  const formattedPrice = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(product.price),
    [product.price]
  );

  const handleClick = useCallback(() => {
    onAddToCart(product.id);
  }, [onAddToCart, product.id]);

  return (
    <div onClick={handleClick}>
      <span>{product.name}</span>
      <span>{formattedPrice}</span>
    </div>
  );
}

// With React Compiler: write plain code, compiler handles memoization
// (Compile output is memoized — you don't see it in source)
function ProductCard({ product, onAddToCart }: Props) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(product.price);

  return (
    <div onClick={() => onAddToCart(product.id)}>
      <span>{product.name}</span>
      <span>{formattedPrice}</span>
    </div>
  );
}`}</code></pre>

      <h2 id="day-to-day-impact">What This Means for Day-to-Day Code</h2>

      <p>
        React 19&apos;s practical impact on typical application code: form submissions no
        longer need a pattern of <code>useState</code> + <code>useEffect</code> + manual
        error state — <code>useActionState</code> handles the full state machine. Optimistic
        updates no longer require a custom <code>useState</code> dance — <code>useOptimistic</code>
        does it declaratively. Ref forwarding no longer requires <code>forwardRef</code>.
        And for new projects with the React Compiler enabled, manual memoization becomes an
        exception rather than a rule.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>use()</code> reads Promises and Contexts — can be called conditionally, unlike other hooks</li>
        <li>Server Actions are async server-side functions callable from client components via form <code>action</code></li>
        <li><code>useOptimistic</code> shows temporary state while an async action is in flight, automatically reverting on completion</li>
        <li><code>useActionState</code> manages the state machine for async form actions (pending, result, error)</li>
        <li><code>useFormStatus</code> lets nested components read their parent form&apos;s submission state without prop drilling</li>
        <li><code>ref</code> is now a regular prop — no more <code>forwardRef</code> wrapper needed</li>
        <li>The React Compiler automates memoization at build time — manual <code>useMemo</code>/<code>useCallback</code> becomes less necessary</li>
      </ul>

      <p>
        The final module covers <strong>component patterns</strong> — the architectural
        patterns (compound components, render props, controlled vs uncontrolled, composition)
        that determine how well-designed React components work with each other.
      </p>
    </div>
  );
}
