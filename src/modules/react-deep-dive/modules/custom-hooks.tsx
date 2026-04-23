import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-makes-a-custom-hook", title: "What Makes a Custom Hook", level: 2 },
  { id: "extracting-logic-vs-ui", title: "Extracting Logic vs Extracting UI", level: 2 },
  { id: "building-common-hooks", title: "Building Common Hooks", level: 2 },
  { id: "usedebounce", title: "useDebounce", level: 3 },
  { id: "useprevious", title: "usePrevious", level: 3 },
  { id: "uselocalstorage", title: "useLocalStorage", level: 3 },
  { id: "useasync", title: "useAsync", level: 3 },
  { id: "rules-of-hooks", title: "Rules of Hooks and Why They Exist", level: 2 },
  { id: "testing-custom-hooks", title: "Testing Custom Hooks", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CustomHooks() {
  return (
    <div className="article-content">
      <p>
        Custom hooks are the primary abstraction mechanism in React for sharing stateful logic.
        Unlike component composition (which shares UI) or utility functions (which share pure
        logic), custom hooks let you share code that uses React features — state, effects,
        refs, context — across multiple components without changing the component hierarchy.
        Understanding when and how to extract custom hooks is a core skill for writing
        maintainable React.
      </p>

      <h2 id="what-makes-a-custom-hook">What Makes a Custom Hook</h2>

      <p>
        A custom hook is a JavaScript function whose name starts with <code>use</code> and that
        calls other hooks internally. The naming convention is enforced by the
        <code>eslint-plugin-react-hooks</code> linter, which applies the Rules of Hooks only to
        functions named with the <code>use</code> prefix. A function named <code>getUser</code>
        that calls <code>useState</code> inside it will not receive hooks linting warnings —
        and will silently break when called conditionally.
      </p>

      <pre><code>{`// This is a custom hook — React treats it like a component for rules purposes.
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

// Consumed exactly like a built-in hook:
function ResponsiveLayout() {
  const width = useWindowWidth();
  return <div>{width > 768 ? <DesktopView /> : <MobileView />}</div>;
}

// React tracks hook state per component instance — not per hook definition.
// Two components using useWindowWidth() each have their own separate state.`}</code></pre>

      <h2 id="extracting-logic-vs-ui">Extracting Logic vs Extracting UI</h2>

      <p>
        The decision between a custom hook and a component comes down to what you are sharing.
        Custom hooks share <em>behavior and logic</em>. Components share <em>rendered output</em>.
        If the abstraction produces JSX, it should be a component. If it manages state and
        side effects but leaves rendering to the caller, it should be a hook.
      </p>

      <pre><code>{`// Logic → custom hook. The caller decides how to render the data.
function useUserSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    setLoading(true);
    const controller = new AbortController();

    searchUsers(query, { signal: controller.signal })
      .then(setResults)
      .catch(err => { if (err.name !== "AbortError") throw err; })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  return { query, setQuery, results, loading };
}

// Two completely different UIs — same logic via the same hook.
function SearchModal() {
  const { query, setQuery, results, loading } = useUserSearch();
  return (
    <Modal>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {loading ? <Spinner /> : <UserList users={results} />}
    </Modal>
  );
}

function SearchSidebar() {
  const { query, setQuery, results } = useUserSearch();
  return (
    <aside>
      <SearchInput value={query} onChange={setQuery} />
      <CompactUserList users={results} />
    </aside>
  );
}`}</code></pre>

      <h2 id="building-common-hooks">Building Common Hooks</h2>

      <h3 id="usedebounce">useDebounce</h3>

      <p>
        Debouncing delays updating a value until a specified amount of time has passed since
        the last change. Useful for avoiding excessive API calls on rapidly-changing inputs.
      </p>

      <pre><code>{`function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
    // On every value change, the previous timer is cleared before a new one starts.
    // The value only updates after delay ms of no changes.
  }, [value, delay]);

  return debouncedValue;
}

function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [inputValue, setInputValue] = useState("");
  const debouncedQuery = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedQuery) onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <input
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      placeholder="Search..."
    />
  );
}`}</code></pre>

      <h3 id="useprevious">usePrevious</h3>

      <p>
        Captures the previous render&apos;s value of a variable. Built on a ref that
        synchronizes after render.
      </p>

      <pre><code>{`function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  // useEffect fires after render, so ref.current holds last render's value
  // during the current render. After this effect, it holds the current value.
  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

function AnimatedCounter({ count }: { count: number }) {
  const previousCount = usePrevious(count);
  const direction = previousCount !== undefined && count > previousCount ? "up" : "down";

  return (
    <div className={\`counter counter--\${direction}\`}>
      {count}
    </div>
  );
}`}</code></pre>

      <h3 id="uselocalstorage">useLocalStorage</h3>

      <p>
        Persists state to localStorage, with hydration safety for SSR environments.
      </p>

      <pre><code>{`function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Lazy initializer runs once on mount — safe for SSR if guarded
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const next = typeof value === "function"
          ? (value as (prev: T) => T)(prev)
          : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // localStorage may be full or disabled in private browsing
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "dark");
  return (
    <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
      {theme}
    </button>
  );
}`}</code></pre>

      <h3 id="useasync">useAsync</h3>

      <p>
        A general-purpose hook for tracking the state of any async operation, with automatic
        abort on cleanup and correct handling of race conditions.
      </p>

      <pre><code>{`type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function useAsync<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList
) {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    asyncFn(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setState({ status: "success", data });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

function UserProfile({ userId }: { userId: string }) {
  const state = useAsync(
    signal => fetchUser(userId, { signal }),
    [userId]
  );

  if (state.status === "loading") return <Skeleton />;
  if (state.status === "error")   return <ErrorBanner message={state.error.message} />;
  if (state.status === "success") return <Profile user={state.data} />;
  return null;
}`}</code></pre>

      <h2 id="rules-of-hooks">Rules of Hooks and Why They Exist</h2>

      <p>
        React enforces two rules for hooks: (1) only call hooks at the top level of a component
        or custom hook — never inside loops, conditions, or nested functions, and (2) only call
        hooks from React function components or custom hooks — not from regular JavaScript functions.
      </p>

      <p>
        These rules exist because React tracks hook state using a <strong>linked list on the fiber</strong>.
        Each hook call corresponds to a node in that list, identified by its call order. If a
        hook is called conditionally, the list order changes between renders, causing React to
        associate hook state with the wrong hook. This produces silent data corruption.
      </p>

      <pre><code>{`// WRONG: hook called conditionally — breaks the linked list invariant
function UserCard({ userId, showEmail }: { userId: string; showEmail: boolean }) {
  const user = useUser(userId);

  if (showEmail) {
    const email = useFormattedEmail(user.email); // Different number of hooks per render!
  }

  return <div>{user.name}</div>;
}

// CORRECT: move the conditional inside the hook or after all hooks
function UserCard({ userId, showEmail }: { userId: string; showEmail: boolean }) {
  const user = useUser(userId);
  const formattedEmail = useFormattedEmail(user.email); // Always called

  return (
    <div>
      {user.name}
      {showEmail && <span>{formattedEmail}</span>}
    </div>
  );
}

// Why custom hooks must start with "use":
// The linter enforces the Rules of Hooks on functions named with "use".
// A function named getUser that calls useState internally won't get linting
// warnings — and will silently break if called conditionally.`}</code></pre>

      <h2 id="testing-custom-hooks">Testing Custom Hooks</h2>

      <p>
        Custom hooks cannot be called outside of React components. The standard approach is to
        test them using <code>@testing-library/react</code>&apos;s <code>renderHook</code>
        utility, which mounts a minimal component that calls your hook and exposes the result.
      </p>

      <pre><code>{`import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";
import { vi } from "vitest";

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("does not update before the delay has passed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "updated" });
    vi.advanceTimersByTime(200);
    expect(result.current).toBe("initial"); // Not yet updated
  });

  it("updates after the delay has passed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "updated" });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("updated");
  });
});`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Custom hooks are functions named with <code>use</code> that call other hooks — they share stateful logic, not UI</li>
        <li>Each component instance that calls a custom hook gets its own isolated state</li>
        <li>Extract to a custom hook when the same combination of state + effects appears in multiple components</li>
        <li>Hooks track state by call order — never call hooks inside conditions, loops, or early returns</li>
        <li>Test custom hooks with <code>renderHook</code> from <code>@testing-library/react</code></li>
        <li>Encapsulate cleanup in the hook itself — callers should not need to know about timers or subscriptions</li>
      </ul>

      <p>
        The next module covers <strong>Suspense</strong> — what it actually does at the React
        level, how it composes with lazy loading and data fetching, and where Error Boundaries fit in.
      </p>
    </div>
  );
}
