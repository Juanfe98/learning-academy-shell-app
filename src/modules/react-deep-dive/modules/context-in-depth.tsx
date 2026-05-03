import { InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "context-is-not-state-management", title: "Context Is Not a State Manager", level: 2 },
  { id: "how-context-propagation-works", title: "How Context Propagation Works", level: 2 },
  { id: "the-re-render-problem", title: "The Re-render Problem", level: 2 },
  { id: "splitting-context", title: "Splitting Context Into Multiple Providers", level: 2 },
  { id: "context-plus-usereducer", title: "The Context + useReducer Pattern", level: 2 },
  { id: "when-to-use-external-state", title: "When to Reach for Zustand or Jotai", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Dashboard Re-render Storm", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ContextInDepth() {
  return (
    <div className="article-content">
      <p>
        Context is one of React&apos;s most misapplied APIs. Teams discover it as a way to avoid
        prop drilling, correctly use it for that purpose, and then gradually reach for it to solve
        every state-sharing problem until their app re-renders itself into a performance disaster.
        Understanding what Context actually is — and what it is not — prevents that trajectory.
      </p>

      <h2 id="context-is-not-state-management">Context Is Not a State Manager</h2>

      <p>
        React Context is a <strong>dependency injection</strong> system. It lets you make a value
        available to any component in a subtree without passing it through every intermediate
        component as a prop. Context does not manage state — it distributes it. The state still
        lives in a <code>useState</code> or <code>useReducer</code> call; Context is just the
        delivery mechanism.
      </p>

      <p>
        This distinction matters because it correctly predicts Context&apos;s limitations: it has
        no built-in selectors, no atomization, no computed values, and no way to subscribe a
        component to only part of the context value. When the context value changes, every
        consumer re-renders — no exceptions.
      </p>

      <pre><code>{`// Context: the distribution layer — not the storage layer
const ThemeContext = createContext<"light" | "dark">("light");

function App() {
  // State lives here — useState is the actual storage.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    // Context distributes the value to all consumers below.
    <ThemeContext.Provider value={theme}>
      <Header />
      <Main />
      <Footer />
      <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
        Toggle
      </button>
    </ThemeContext.Provider>
  );
}

// Any component in the tree can read the theme without props:
function ThemeIcon() {
  const theme = useContext(ThemeContext);
  return <Icon name={theme === "dark" ? "moon" : "sun"} />;
}`}</code></pre>

      <h2 id="how-context-propagation-works">How Context Propagation Works</h2>

      <p>
        When the value passed to <code>Provider</code> changes, React traverses the subtree
        and re-renders every component that called <code>useContext</code> with that context.
        This traversal skips components that are not consumers — a deep tree with few consumers
        only re-renders those few consumers, not every node in the subtree.
      </p>

      <p>
        However, React checks context value changes using <code>Object.is</code> — the same
        strict equality check used for state. If the provider&apos;s parent re-renders and passes
        a new object reference as the context value, every consumer re-renders even if the data
        is logically identical.
      </p>

      <pre><code>{`// Bug: new object reference on every parent render
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // This object is new on every render of AuthProvider.
  // Every consumer re-renders whenever AuthProvider re-renders.
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Fix: memoize the context value
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
  // Now consumers only re-render when user actually changes.
}`}</code></pre>

      <h2 id="the-re-render-problem">The Re-render Problem</h2>

      <p>
        The fundamental issue with using Context as a general state manager is that there is no
        subscription mechanism. When you call <code>useContext(MyContext)</code>, you are
        subscribing to the <em>entire</em> context value. Any change to any part of the context
        triggers a re-render in every consumer — even if the component only cares about one field.
      </p>

      <pre><code>{`// A context that holds multiple values
const AppContext = createContext<{
  user: User | null;
  notifications: Notification[];
  theme: "light" | "dark";
  sidebarOpen: boolean;
}>({...});

// This component only cares about theme, but it re-renders when:
// - user changes (login/logout)
// - notifications arrive
// - sidebarOpen toggles
// — all of which have nothing to do with theme
function ThemeButton() {
  const { theme } = useContext(AppContext);
  return <button className={\`btn-\${theme}\`}>Click</button>;
}

// In a real app with dozens of consumers and frequent updates,
// this creates serious performance issues.`}</code></pre>

      <h2 id="splitting-context">Splitting Context Into Multiple Providers</h2>

      <p>
        The idiomatic solution to the over-rendering problem is to split your context by
        update frequency. Values that change together belong in the same context. Values that
        change independently belong in separate contexts. A component only re-renders when a
        context it actually consumes changes.
      </p>

      <pre><code>{`// Before: one large context — any update re-renders all consumers
const AppContext = createContext<AppState>({...});

// After: split by change frequency
const UserContext = createContext<User | null>(null);          // changes on login/logout
const NotificationsContext = createContext<Notification[]>([]); // changes frequently
const ThemeContext = createContext<"light" | "dark">("light"); // rarely changes
const UIContext = createContext<{ sidebarOpen: boolean }>({...}); // changes on interaction

// Now ThemeButton only re-renders when ThemeContext changes:
function ThemeButton() {
  const theme = useContext(ThemeContext); // no longer affected by login or notifications
  return <button className={\`btn-\${theme}\`}>Click</button>;
}

// Nesting providers:
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <UIProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </UIProvider>
      </ThemeProvider>
    </UserProvider>
  );
}`}</code></pre>

      <h2 id="context-plus-usereducer">The Context + useReducer Pattern</h2>

      <p>
        For global state that multiple components need to both read and update, the
        <code>Context + useReducer</code> pattern gives you predictable state transitions
        without a third-party library. The pattern: put state and dispatch in separate contexts.
        Consumers that only read state never re-render from dispatch changes; consumers that
        only dispatch never re-render from state changes.
      </p>

      <pre><code>{`type CartState = { items: CartItem[]; total: number };
type CartAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const items = [...state.items, action.item];
      return { items, total: items.reduce((sum, i) => sum + i.price, 0) };
    }
    case "REMOVE_ITEM": {
      const items = state.items.filter(i => i.id !== action.itemId);
      return { items, total: items.reduce((sum, i) => sum + i.price, 0) };
    }
    case "CLEAR":
      return { items: [], total: 0 };
  }
}

// Two separate contexts: one for state, one for dispatch
const CartStateContext = createContext<CartState>({ items: [], total: 0 });
const CartDispatchContext = createContext<React.Dispatch<CartAction>>(() => {});

function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// Custom hooks encapsulate access
function useCartState() { return useContext(CartStateContext); }
function useCartDispatch() { return useContext(CartDispatchContext); }

// AddToCartButton re-renders ONLY when dispatch changes (it never does)
function AddToCartButton({ item }: { item: CartItem }) {
  const dispatch = useCartDispatch();
  return (
    <button onClick={() => dispatch({ type: "ADD_ITEM", item })}>
      Add to cart
    </button>
  );
}

// CartSummary re-renders when cart state changes
function CartSummary() {
  const { items, total } = useCartState();
  return <div>{items.length} items — $\{total.toFixed(2)}</div>;
}`}</code></pre>

      <h2 id="when-to-use-external-state">When to Reach for Zustand or Jotai</h2>

      <p>
        Context + useReducer handles a surprising amount of global state well. The signals
        that you&apos;ve outgrown it: (1) you need fine-grained subscriptions — components
        should only re-render when the specific slice they care about changes, (2) you have
        complex async flows (Zustand&apos;s middleware or Jotai&apos;s async atoms handle
        these more naturally), or (3) performance profiling shows Context re-renders are
        causing real jank despite splitting.
      </p>

      <pre><code>{`// Zustand gives you fine-grained selectors out of the box.
// Only re-renders when the selected slice changes.
const useStore = create<AppState>((set) => ({
  user: null,
  theme: "dark",
  cartCount: 0,
  setUser: (user) => set({ user }),
  incrementCart: () => set(s => ({ cartCount: s.cartCount + 1 })),
}));

// This component only re-renders when cartCount changes —
// not when user or theme change.
function CartBadge() {
  const cartCount = useStore(state => state.cartCount);
  return <span>{cartCount}</span>;
}

// Context is still appropriate for:
// - Low-frequency values (theme, locale, authenticated user)
// - Component library internals (sharing state between Tabs and Tab children)
// - Dependency injection (passing a logger, a router, an analytics client)
// Reserve external libraries for state that changes frequently and has many consumers.`}</code></pre>

      <h2 id="interview-challenge">Interview Challenge: Dashboard Re-render Storm</h2>

      <InterviewChallenge
        title="One AppContext to Rule Them All"
        scenario={
          <>
            A dashboard currently stores theme, auth state, feature flags, websocket
            notifications, live KPI values, and left-nav UI state inside a single{" "}
            <code>AppContext</code>. Product says the dashboard stutters whenever notifications
            stream in. The interview goal is to see whether you can diagnose render churn with
            evidence and propose a refactor that improves subscription granularity without turning
            the codebase into accidental complexity.
          </>
        }
        tasks={[
          "Explain how you would prove the problem with the React DevTools Profiler instead of guessing from the code alone.",
          "Refactor the provider strategy so slow-moving dependencies and high-frequency feeds no longer force the same consumers to re-render.",
          "Decide when split contexts are enough versus when selector-based external state is justified.",
          "Describe how you would keep dispatch ergonomics good while avoiding one monolithic provider value object.",
        ]}
        pitfalls={[
          "Memoizing one giant context object and assuming that solves subscription granularity.",
          "Moving all state to Zustand or another store before profiling the actual bottleneck.",
          "Keeping state and dispatch in one changing object when many consumers only need one of them.",
        ]}
        signal="High-signal answers separate low-frequency dependencies from hot feeds, use split providers and state/dispatch separation first, and only reach for selector-based external stores when profiling shows Context's all-or-nothing subscription model is the real bottleneck."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Context is a dependency injection system — state still lives in <code>useState</code>/<code>useReducer</code></li>
        <li>Every consumer re-renders when the context value changes — there are no selectors</li>
        <li>Inline object values in <code>Provider</code> create new references on every render — memoize them</li>
        <li>Split contexts by change frequency so unrelated updates do not cause unnecessary re-renders</li>
        <li>Separate state context from dispatch context so dispatch-only consumers never re-render from state changes</li>
        <li>Context + useReducer handles most global state needs; reach for Zustand/Jotai when you need selector-level granularity</li>
      </ul>

      <p>
        The next module dives into <strong>custom hooks</strong> — the primary abstraction
        mechanism for sharing stateful logic between components, and where most non-trivial
        React patterns ultimately live.
      </p>
    </div>
  );
}
