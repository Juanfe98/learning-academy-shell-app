import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "useref-escaping-render", title: "useRef: Escaping the Render Cycle", level: 2 },
  { id: "useref-dom-access", title: "useRef for DOM Access", level: 3 },
  { id: "useref-mutable-values", title: "useRef for Mutable Values Without Re-renders", level: 3 },
  { id: "usememo-what-it-does", title: "useMemo: What It Actually Does", level: 2 },
  { id: "usememo-when-it-helps", title: "When useMemo Genuinely Helps", level: 3 },
  { id: "usememo-referential-stability", title: "Referential Stability for Dependencies", level: 3 },
  { id: "usecallback", title: "useCallback: Stabilizing Function References", level: 2 },
  { id: "the-memoization-trap", title: "The Memoization Trap", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function UseRefUseMemoUseCallback() {
  return (
    <div className="article-content">
      <p>
        Three hooks — <code>useRef</code>, <code>useMemo</code>, and <code>useCallback</code> —
        are frequently misunderstood and more frequently misused. Codebases that blindly wrap
        every value in <code>useMemo</code> and every callback in <code>useCallback</code> are
        not faster; they are slower, harder to read, and their authors do not understand what
        these hooks actually do. This module builds the precise mental model for each.
      </p>

      <h2 id="useref-escaping-render">useRef: Escaping the Render Cycle</h2>

      <p>
        <code>useRef</code> returns a plain JavaScript object with a single property,{" "}
        <code>current</code>, that persists across renders. Mutating <code>ref.current</code>{" "}
        does not trigger a re-render. Reading <code>ref.current</code> gives you the latest value
        without closing over a stale snapshot. This makes refs the escape hatch for values that
        need to <em>persist</em> but should not <em>drive</em> rendering.
      </p>

      <pre><code>{`// The ref object itself is stable across renders — same object every time.
// Its .current property is mutable.
const ref = useRef<number>(0);

// Mutating ref.current does NOT trigger a re-render.
ref.current = 42; // no re-render

// Reading ref.current always gives the latest value — no stale closure.
function handleClick() {
  console.log(ref.current); // always up to date
}`}</code></pre>

      <h3 id="useref-dom-access">useRef for DOM Access</h3>

      <p>
        Attaching a ref to a JSX element via the <code>ref</code> prop causes React to set
        <code>ref.current</code> to the actual DOM node after mounting, and to <code>null</code>
        after unmounting. This is the idiomatic way to call imperative DOM APIs that React does
        not expose as props.
      </p>

      <pre><code>{`function VideoPlayer({ src, isPlaying }: { src: string; isPlaying: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync the DOM with the isPlaying prop imperatively.
  // The <video> element's play/pause API has no JSX equivalent.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {}); // play() returns a Promise
    } else {
      video.pause();
    }
  }, [isPlaying]);

  return <video ref={videoRef} src={src} />;
}

// Forwarding refs to child components (React 19 simplified this):
// Pre-React 19: needed forwardRef() wrapper
// React 19: ref is just a regular prop — no forwardRef needed
function FancyInput({ ref, ...props }: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className="fancy-input" {...props} />;
}`}</code></pre>

      <h3 id="useref-mutable-values">useRef for Mutable Values Without Re-renders</h3>

      <p>
        Any value that needs to persist across renders but whose change should not cause a
        re-render belongs in a ref. The classic cases are: tracking the previous value of a
        prop, storing a timeout ID or interval ID, keeping a flag for whether a component is
        mounted, and holding a callback that effects need access to without re-creating those effects.
      </p>

      <pre><code>{`// Track the previous value of a prop
function UserStats({ userId }: { userId: string }) {
  const previousUserIdRef = useRef<string>(userId);

  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      // userId changed — track the event
      analytics.track("user_changed", {
        from: previousUserIdRef.current,
        to: userId,
      });
      previousUserIdRef.current = userId;
    }
  });

  return <div>Stats for {userId}</div>;
}

// Hold a timer ID to cancel it later
function DelayedSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  function handleChange(query: string) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onSearch(query), 300);
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current); // cleanup on unmount
  }, []);

  return <input onChange={e => handleChange(e.target.value)} />;
}`}</code></pre>

      <h2 id="usememo-what-it-does">useMemo: What It Actually Does</h2>

      <p>
        <code>useMemo</code> caches the result of a computation across renders. On the first
        render it computes the value and stores it. On subsequent renders it checks whether the
        dependencies have changed. If they have not, it returns the cached value. If they have,
        it runs the computation again and caches the new result.
      </p>

      <p>
        <strong>Critically: <code>useMemo</code> has a cost.</strong> React must store the
        cached value, store the dependency array, and shallow-compare the dependencies on every
        render. For cheap computations, this overhead exceeds the savings. The React team has
        explicitly stated that <code>useMemo</code> is a performance optimization for specific
        scenarios — not a default to apply everywhere.
      </p>

      <pre><code>{`// Measuring the cost of useMemo on a trivial computation:
// Without useMemo: 0.001ms to concatenate two strings
// With useMemo:    0.003ms to compare deps + return cached value
// Net: 3x slower. useMemo made this worse.
const fullName = useMemo(
  () => \`\${firstName} \${lastName}\`,
  [firstName, lastName]
);

// The calculation React does EVERY render regardless:
// 1. Retrieve the cached deps array
// 2. Shallow-compare each dep to its previous value
// 3a. If unchanged: return cached result (saves the computation)
// 3b. If changed: run the factory, cache and return new result`}</code></pre>

      <h3 id="usememo-when-it-helps">When useMemo Genuinely Helps</h3>

      <p>
        <code>useMemo</code> is worth its overhead in two situations: (1) the computation is
        genuinely expensive — sorting or filtering thousands of items, computing complex
        aggregations — and (2) you need referential stability for downstream dependencies.
      </p>

      <pre><code>{`// GOOD: expensive computation over a large dataset
function Analytics({ events }: { events: AnalyticsEvent[] }) {
  // Sorting 10,000 events on every render without memoization
  // causes perceptible jank. useMemo here is warranted.
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.timestamp - a.timestamp),
    [events]
  );

  const aggregations = useMemo(
    () => computeAggregations(sortedEvents), // O(n) pass over sorted data
    [sortedEvents]
  );

  return <EventChart data={aggregations} />;
}

// How to verify it's worth memoizing:
// Use the React DevTools Profiler. Measure the render time with and without.
// If the difference is imperceptible (sub-1ms), remove the useMemo.`}</code></pre>

      <h3 id="usememo-referential-stability">Referential Stability for Dependencies</h3>

      <p>
        JavaScript&apos;s <code>===</code> operator compares objects and arrays by reference.
        Two objects with identical contents are not equal if they are different instances.
        When an object or array is created inline in render and used as a <code>useEffect</code>
        dependency, it appears &quot;changed&quot; on every render — causing the effect to
        re-run every render even when the data is the same.
      </p>

      <pre><code>{`// Bug: options object is re-created on every render
function UserList({ userId }: { userId: string }) {
  // This object is a NEW reference every render.
  const queryOptions = { userId, page: 1, limit: 20 };

  useEffect(() => {
    fetchUsers(queryOptions); // Effect runs on EVERY render!
  }, [queryOptions]); // new object reference = always "changed"
}

// Fix: useMemo gives queryOptions a stable reference
function UserList({ userId }: { userId: string }) {
  const queryOptions = useMemo(
    () => ({ userId, page: 1, limit: 20 }),
    [userId] // Only new reference when userId changes
  );

  useEffect(() => {
    fetchUsers(queryOptions);
  }, [queryOptions]); // Only runs when userId changes ✓
}`}</code></pre>

      <h2 id="usecallback">useCallback: Stabilizing Function References</h2>

      <p>
        <code>useCallback(fn, deps)</code> is syntactic sugar for <code>useMemo(() =&gt; fn, deps)</code>.
        It returns a stable function reference that only changes when the dependencies change.
        Like <code>useMemo</code>, it has overhead — do not use it by default.
      </p>

      <p>
        <code>useCallback</code> matters in two scenarios: (1) the function is a dependency of
        an effect, and you do not want to re-run the effect on every render, and (2) the function
        is passed to a <code>React.memo</code>&apos;d child and you want to preserve the memoization.
      </p>

      <pre><code>{`// useCallback for effect dependency stability
function UserSearch({ onResultsChange }: { onResultsChange: (r: User[]) => void }) {
  const [query, setQuery] = useState("");

  // Without useCallback: onResultsChange is a new function every render.
  // That means the effect runs on every render — likely not what you want.
  const stableOnResultsChange = useCallback(onResultsChange, [onResultsChange]);
  // Better: accept that the parent should memoize their callback, or use a ref.

  useEffect(() => {
    if (!query) return;
    searchUsers(query).then(stableOnResultsChange);
  }, [query, stableOnResultsChange]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// useCallback preserving React.memo optimization
const ExpensiveList = React.memo(({ onItemClick }: { onItemClick: (id: string) => void }) => {
  return <LargeList onItemClick={onItemClick} />;
});

function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Without useCallback: new function every render → React.memo skipped → ExpensiveList re-renders
  // With useCallback: same function reference → React.memo works → no unnecessary re-renders
  const handleItemClick = useCallback((id: string) => {
    setSelectedId(id);
    analytics.track("item_selected", { id });
  }, []); // Empty deps: setSelectedId is stable, analytics is external

  return <ExpensiveList onItemClick={handleItemClick} />;
}`}</code></pre>

      <h2 id="the-memoization-trap">The Memoization Trap</h2>

      <p>
        The most damaging pattern in React codebases is reflexive memoization — wrapping every
        function in <code>useCallback</code> and every computed value in <code>useMemo</code>
        without measuring whether it helps. This pattern makes code harder to read, increases
        bundle size, adds runtime overhead, and creates a false sense of optimization.
      </p>

      <pre><code>{`// Anti-pattern: memoizing everything reflexively
function ProductCard({ product }: { product: Product }) {
  // These are all cheap — useMemo adds overhead, not removes it.
  const title = useMemo(() => product.name.toUpperCase(), [product.name]);
  const price = useMemo(() => \`$\${product.price.toFixed(2)}\`, [product.price]);

  // This function is not passed to a memo'd child or used as an effect dep.
  // useCallback here does nothing useful.
  const handleClick = useCallback(() => {
    console.log("clicked", product.id);
  }, [product.id]);

  return (
    <div onClick={handleClick}>
      <span>{title}</span>
      <span>{price}</span>
    </div>
  );
}

// The three questions before reaching for useMemo/useCallback:
// 1. Is this computation actually expensive? (Profile first)
// 2. Is this function/value used as a dependency of an effect or a memo'd child?
// 3. Is this causing a measurable performance problem?
// If the answer to all three is no, do not memoize.`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>useRef</code> gives you a mutable container that persists across renders without causing re-renders</li>
        <li>Attach refs to DOM nodes via the <code>ref</code> prop to access imperative DOM APIs</li>
        <li>Use refs to hold values that effects need access to without listing them in the dependency array</li>
        <li><code>useMemo</code> caches computation — it adds overhead; only use it for genuinely expensive work</li>
        <li><code>useMemo</code> is also useful for referential stability: giving objects stable identities across renders</li>
        <li><code>useCallback</code> stabilizes function references — useful when a callback is an effect dep or a <code>React.memo</code> prop</li>
        <li>Profile before memoizing — most components are fast enough without it, and memoization adds its own cost</li>
      </ul>

      <p>
        The next module covers <strong>Context</strong> — React&apos;s built-in dependency
        injection system — and the re-render problems you will encounter if you treat it as a
        state management library.
      </p>
    </div>
  );
}
