import { InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-concurrent-means", title: "What Concurrent Rendering Means", level: 2 },
  { id: "usetransition", title: "useTransition: Non-Urgent Updates", level: 2 },
  { id: "ispending-flag", title: "The isPending Flag", level: 3 },
  { id: "usedeferred-value", title: "useDeferredValue: Deferring a Value", level: 2 },
  { id: "starttransition", title: "startTransition for Non-Hook Contexts", level: 2 },
  { id: "when-to-use-which", title: "When to Use Which", level: 2 },
  { id: "real-examples", title: "Real Examples", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Laggy Faceted Search", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ConcurrentFeatures() {
  return (
    <div className="article-content">
      <p>
        React 18&apos;s concurrent features are a significant shift in how React manages rendering
        priority. Before React 18, every state update was urgent — React would block the main
        thread until the full render and commit were complete. Concurrent rendering makes this
        interruptible, enabling React to keep the UI responsive during heavy state transitions.
      </p>

      <h2 id="what-concurrent-means">What Concurrent Rendering Means</h2>

      <p>
        &quot;Concurrent&quot; in React does not mean multi-threaded — JavaScript is single-threaded.
        It means React can <em>pause</em> rendering work, yield control back to the browser for
        higher-priority tasks (like responding to user input), and then resume the paused work.
        This is only possible because of the Fiber architecture: React&apos;s work is stored as a
        linked list of fibers that can be interrupted and resumed at any point.
      </p>

      <p>
        The key concept is <strong>rendering priority</strong>. React now distinguishes between
        urgent updates (typing, clicking — things users expect to feel instant) and non-urgent
        updates (rendering search results, transitioning between views — things where a slight
        delay is acceptable). Concurrent features are the API surface for controlling that
        distinction.
      </p>

      <pre><code>{`// Without concurrent features: typing in an input that filters 10,000 rows
// React renders the filtered list synchronously — blocking the input.
// The input feels laggy because the keystroke can't update until the list renders.

function SlowSearch({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");

  // PROBLEM: filter runs synchronously on every keystroke.
  // With 10,000 items, this blocks the thread for ~50ms per keystroke.
  const filtered = items.filter(i => i.name.includes(query));

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ItemList items={filtered} /> {/* Re-renders with 10,000 nodes each keystroke */}
    </>
  );
}`}</code></pre>

      <h2 id="usetransition">useTransition: Non-Urgent Updates</h2>

      <p>
        <code>useTransition</code> returns a <code>[isPending, startTransition]</code> tuple.
        State updates wrapped in <code>startTransition</code> are marked as non-urgent.
        React renders them at lower priority: it will interrupt the transition render if an
        urgent update (like another keystroke) arrives, discard the in-progress work, and start
        over with the new state. The UI stays responsive — the input updates immediately, while
        the heavy list render happens when the browser has cycles to spare.
      </p>

      <pre><code>{`import { useState, useTransition } from "react";

function SearchPage({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // URGENT: input reflects the keystroke immediately
    setQuery(value);

    // NON-URGENT: filtering is deferred — React can interrupt it
    startTransition(() => {
      setFilteredItems(items.filter(i =>
        i.name.toLowerCase().includes(value.toLowerCase())
      ));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {/* Show a visual indicator while the transition is in progress */}
      <div style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 200ms" }}>
        <ItemList items={filteredItems} />
      </div>
    </>
  );
}`}</code></pre>

      <h3 id="ispending-flag">The isPending Flag</h3>

      <p>
        <code>isPending</code> is <code>true</code> from the moment you call
        <code>startTransition</code> until React finishes committing the transition. This gives
        you a signal to show a loading indicator without hiding the current content — users see
        the stale UI (with a visual hint that it&apos;s updating) rather than a blank state or
        a spinner that occludes content.
      </p>

      <pre><code>{`// isPending lets you show progress without destroying the current UI
function TabView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isPending, startTransition] = useTransition();

  function handleTabChange(tab: string) {
    startTransition(() => setActiveTab(tab));
  }

  return (
    <div>
      <TabList
        activeTab={activeTab}
        onTabChange={handleTabChange}
        // Visual indicator: the active tab appears to be loading
        pendingTab={isPending ? activeTab : undefined}
      />
      {/* Current tab content stays visible (dimmed) while the new tab renders */}
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}

// This is fundamentally different from showing a Suspense fallback:
// - Suspense fallback: replaces content with a spinner
// - isPending dimming: keeps current content visible, adds a loading hint
// Use isPending for transitions; use Suspense fallbacks for initial loads.`}</code></pre>

      <h2 id="usedeferred-value">useDeferredValue: Deferring a Value</h2>

      <p>
        <code>useDeferredValue</code> is conceptually similar to <code>useTransition</code> but
        applies to values rather than state update calls. You pass it a value and it returns a
        deferred copy of that value. The deferred copy updates at lower priority — React will
        render the component with the old value while a lower-priority re-render catches up to
        the new value.
      </p>

      <pre><code>{`import { useState, useDeferredValue } from "react";

function SearchPage({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");

  // The deferred query updates at lower priority.
  // During heavy renders, deferredQuery may lag behind query.
  const deferredQuery = useDeferredValue(query);

  // Memoize the expensive list to avoid re-running when only query changes.
  // The list only re-renders when deferredQuery changes.
  const filteredItems = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [items, deferredQuery]
  );

  // deferredQuery !== query while a transition is in progress
  const isStale = query !== deferredQuery;

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <ItemList items={filteredItems} />
      </div>
    </>
  );
}`}</code></pre>

      <h2 id="starttransition">startTransition for Non-Hook Contexts</h2>

      <p>
        <code>startTransition</code> can also be imported directly from React for use outside
        of components — in event handlers that don&apos;t have access to the hook, in route
        handlers, or in library code that manages state updates.
      </p>

      <pre><code>{`import { startTransition } from "react";

// Router library signaling a navigation as a transition:
function navigateTo(path: string) {
  startTransition(() => {
    setCurrentPath(path); // Non-urgent — React can interrupt this
  });
}

// Note: the function passed to startTransition must be synchronous.
// You cannot pass an async function directly.
// For async transitions, update state inside the async callback:
startTransition(() => {
  // This is synchronous — it schedules the state update
  setIsLoading(true);
});

fetchData().then(data => {
  startTransition(() => {
    setData(data);      // This is also a transition
    setIsLoading(false);
  });
});`}</code></pre>

      <h2 id="when-to-use-which">When to Use Which</h2>

      <p>
        <code>useTransition</code> is the right tool when you control the state update — you
        can wrap the <code>setState</code> call directly in <code>startTransition</code>.
        <code>useDeferredValue</code> is the right tool when you receive a value from outside
        (a prop, a context value) and need to defer rendering based on it without modifying how
        the value is set.
      </p>

      <pre><code>{`// Use useTransition when you own the state update:
function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value); // urgent
    startTransition(() => {
      setResults(heavySearch(value)); // non-urgent
    });
  }

  return <input value={query} onChange={e => handleChange(e.target.value)} />;
}

// Use useDeferredValue when you receive the value as a prop:
function HeavyFilteredList({ query }: { query: string }) {
  // You can't wrap the parent's state update in startTransition from here.
  // useDeferredValue lets you defer your own rendering based on the prop.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => bigList.filter(item => item.includes(deferredQuery)),
    [deferredQuery]
  );

  return <List items={filtered} />;
}`}</code></pre>

      <h2 id="real-examples">Real Examples</h2>

      <p>
        The most common practical applications of concurrent features are search inputs that
        filter large datasets, tab switching that renders expensive panels, and route navigations
        where the next route&apos;s content needs to load.
      </p>

      <pre><code>{`// Tab switching with useTransition — the active tab remains visible
// while the new tab's heavy content renders in the background
function Dashboard() {
  const [tab, setTab] = useState<"overview" | "analytics" | "settings">("overview");
  const [isPending, startTransition] = useTransition();

  const tabs = ["overview", "analytics", "settings"] as const;

  return (
    <div>
      <nav>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => startTransition(() => setTab(t))}
            className={[
              tab === t ? "active" : "",
              isPending && tab === t ? "loading" : "",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Current tab stays rendered (possibly dimmed) while new tab loads */}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        {tab === "overview"   && <OverviewPanel />}
        {tab === "analytics"  && <AnalyticsPanel />}  {/* Heavy charts */}
        {tab === "settings"   && <SettingsPanel />}
      </div>
    </div>
  );
}`}</code></pre>

      <h2 id="interview-challenge">Interview Challenge: Laggy Faceted Search</h2>

      <InterviewChallenge
        title="Large Catalog Search"
        scenario={
          <>
            A product catalog page has text search, faceted filters, sortable results, and a
            result grid with expensive cards. Typing in the search box feels sticky, but the team
            is already using <code>useMemo</code> everywhere and still sees jank. The interview
            goal is to see whether you understand what concurrent features can and cannot solve.
          </>
        }
        tasks={[
          "Explain how you would profile the lag first so you know whether the bottleneck is CPU-bound rendering, network delay, or too much unnecessary work.",
          "Decide where useTransition helps, where useDeferredValue helps, and where neither helps because the real fix is reducing work.",
          "Describe what UI feedback you would show while deferred results catch up so the interface feels responsive instead of confusing.",
          "Call out cases where virtualization, memoization discipline, or moving work to the server matters more than transition APIs.",
        ]}
        pitfalls={[
          "Using transitions as a substitute for fixing wasteful renders.",
          "Deferring the input's own state update, which makes typing feel worse instead of better.",
          "Adding spinners everywhere rather than preserving current content with subtle pending feedback.",
        ]}
        signal="Senior answers start with profiling, keep urgent interactions urgent, use concurrent APIs to prioritize work rather than magically speed it up, and still reduce the actual amount of rendering when the data size demands it."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Concurrent rendering makes React work interruptible — JavaScript is still single-threaded</li>
        <li><code>useTransition</code> marks state updates as non-urgent so urgent updates (typing) are never blocked</li>
        <li><code>isPending</code> lets you show a loading hint without hiding the current content</li>
        <li><code>useDeferredValue</code> defers rendering based on a received value — use when you don&apos;t own the state update</li>
        <li><code>startTransition</code> can be imported directly for use outside of components</li>
        <li>Use concurrent features only for updates that cause perceptible jank — profile first</li>
      </ul>

      <p>
        The next module covers <strong>React 19</strong> — the <code>use()</code> hook,
        Server Actions, optimistic UI, and the new APIs that change how you write everyday
        React code.
      </p>
    </div>
  );
}
