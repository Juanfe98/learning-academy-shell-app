import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const renderCauseTree = String.raw`flowchart TD
  A["Component scheduled to render"] --> B{"Own state\nchanged?"}
  B -->|Yes| F["Re-render"]
  B -->|No| C{"Consumed context\nvalue changed?"}
  C -->|Yes| F
  C -->|No| D{"Parent\nre-rendered?"}
  D -->|No| G["Skip render\n(memoized or untouched)"]
  D -->|Yes| E{"Wrapped in\nReact.memo?"}
  E -->|No| F
  E -->|Yes| H{"Props shallowly\nequal?"}
  H -->|Yes| G
  H -->|No| F
  F --> I["Commit phase:\nDOM updates"]
  G --> J["No DOM work"]

  style F fill:#6366f1,color:#fff,stroke:#6366f1
  style G fill:#22c55e,color:#fff,stroke:#22c55e
  style J fill:#22c55e,color:#fff,stroke:#22c55e`;

const codeSplittingFlow = String.raw`sequenceDiagram
  participant User
  participant Router
  participant React
  participant Network
  participant Module

  User->>Router: Navigates to /dashboard
  Router->>React: Renders <Suspense fallback={<Spinner/>}>
  React->>React: Encounters React.lazy(() => import('./Dashboard'))
  React-->>User: Shows fallback spinner immediately
  React->>Network: dynamic import('./Dashboard.js')
  Network->>Module: Fetches chunk from CDN/server
  Module-->>React: Module evaluated, default export ready
  React->>React: Re-renders with Dashboard component
  React-->>User: Shows fully loaded Dashboard

  Note over React,Network: Preload on hover: call the import() fn\nbefore navigation to fill cache early`;

export const toc: TocItem[] = [
  { id: "react-devtools-profiler", title: "React DevTools Profiler", level: 2 },
  { id: "profiler-api", title: "Profiler API in Code", level: 3 },
  { id: "react-memo-deep-dive", title: "React.memo Deep Dive", level: 2 },
  { id: "memo-vs-usememo-vs-usecallback", title: "memo vs useMemo vs useCallback", level: 3 },
  { id: "re-render-storm-patterns", title: "Re-render Storm Patterns", level: 2 },
  { id: "list-virtualization", title: "List Virtualization", level: 2 },
  { id: "code-splitting-strategies", title: "Code Splitting Strategies", level: 2 },
  { id: "web-vitals-react-lens", title: "Web Vitals from a React Lens", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: The Slow Dashboard", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PerformanceAndProfiling() {
  return (
    <div className="article-content">
      <p>
        React performance is one of the sharpest interview differentiators at the senior level.
        Junior engineers reach for <code>React.memo</code> and <code>useCallback</code> by
        instinct. Senior engineers reach for the profiler first. The mental model that separates
        the two: <strong>measure before you optimize</strong>. Blindly memoizing everything is
        not free — it adds comparison overhead, makes code harder to read, and often solves the
        wrong problem. This module builds the diagnostic toolchain first, then covers each
        optimization technique in order of how often you actually need it in production.
      </p>

      <h2 id="react-devtools-profiler">React DevTools Profiler</h2>

      <p>
        The Profiler tab in React DevTools is the primary tool for understanding why your app is
        slow. It records render timing for every component in a commit and surfaces two key
        signals: <strong>which components rendered</strong> and <strong>why they rendered</strong>.
        The &quot;why did this render?&quot; tooltip is the most actionable thing in the profiler
        — it tells you whether the cause was a prop change, state change, context change, or a
        parent re-render with no real diff.
      </p>

      <p>
        Reading the flame graph correctly matters. Wider bars mean more time spent rendering.
        A wide bar at the top of a subtree often means a parent is doing expensive work and
        pulling its entire subtree along. The most common finding in a profiler session is not
        an expensive single component, but a high-frequency re-render at the top of the tree
        causing dozens of cheap components to run unnecessarily on every keystroke or tick.
      </p>

      <MermaidDiagram
        chart={renderCauseTree}
        title="Render Cause Decision Tree"
        caption="React's decision logic for whether to re-render a component. React.memo short-circuits the parent re-render path via shallow prop comparison."
        minHeight={480}
      />

      <h3 id="profiler-api">Profiler API in Code</h3>

      <p>
        When DevTools aren&apos;t enough — in staging environments, automated performance
        regression tests, or server-side render timing — the <code>Profiler</code> component
        API gives you the same data programmatically.
      </p>

      <CodeBlock lang="tsx" code={`import { Profiler } from "react";
import type { ProfilerOnRenderCallback } from "react";

const onRender: ProfilerOnRenderCallback = (
  id,           // the "id" prop of the Profiler tree
  phase,        // "mount" | "update" | "nested-update"
  actualDuration,  // ms spent rendering the committed update
  baseDuration,    // estimated ms for a full re-render without memoization
  startTime,
  commitTime
) => {
  // In production, ship to your observability platform
  if (actualDuration > 16) {
    // Anything over 16ms risks dropping a frame at 60fps
    console.warn(\`[Profiler] \${id} took \${actualDuration.toFixed(1)}ms (\${phase})\`);
  }
};

function App() {
  return (
    <Profiler id="DashboardPanel" onRender={onRender}>
      <DashboardPanel />
    </Profiler>
  );
}

// baseDuration vs actualDuration:
// baseDuration: how long it WOULD take without any memoization (worst case)
// actualDuration: how long it DID take this commit (benefits from memo/lazy)
// If actualDuration ≈ baseDuration, your memoization isn't helping at all.`} />

      <h2 id="react-memo-deep-dive">React.memo Deep Dive</h2>

      <p>
        <code>React.memo</code> wraps a component and bails out of re-rendering if the incoming
        props are shallowly equal to the previous render&apos;s props. Shallow equality means
        object identity comparison — <code>===</code> for each prop value. This is where most
        developers go wrong: they wrap a component in <code>memo</code> but pass a new object
        literal or a new function reference on every parent render, and the memo never fires.
      </p>

      <CodeBlock lang="tsx" code={`// PROBLEM: memo is useless here — new object created every render
function ParentBad() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      {/* New object reference every render → memo always returns false */}
      <MemoizedChild config={{ theme: "dark" }} />
    </>
  );
}

// FIX 1: Lift constant objects out of render scope
const DARK_CONFIG = { theme: "dark" } as const;

function ParentFixed() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      {/* DARK_CONFIG is the same reference every render */}
      <MemoizedChild config={DARK_CONFIG} />
    </>
  );
}

// FIX 2: useMemo for derived objects, useCallback for functions
function ParentWithDerivedConfig({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  // Stable reference — only recomputes when userId changes
  const config = useMemo(() => ({ theme: "dark", userId }), [userId]);
  const handleSelect = useCallback((id: string) => console.log(id), []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <MemoizedChild config={config} onSelect={handleSelect} />
    </>
  );
}

// Custom comparator — use sparingly, it's easy to get wrong
const MemoizedChild = React.memo(ChildComponent, (prev, next) => {
  // Return true to SKIP re-render (props are "equal")
  // Return false to ALLOW re-render
  return prev.config.userId === next.config.userId;
});`} />

      <h3 id="memo-vs-usememo-vs-usecallback">memo vs useMemo vs useCallback</h3>

      <ArticleTable
        caption="When to reach for each memoization primitive — and what they actually memoize."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Primitive</th>
              <th>What it memoizes</th>
              <th>Use when</th>
              <th>Common mistake</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>React.memo(Component)</code></td>
              <td>The rendered output of a component subtree</td>
              <td>Component re-renders with identical props from a frequently updating parent</td>
              <td>Passing new object/function references as props, defeating the memo entirely</td>
            </tr>
            <tr>
              <td><code>useMemo(() =&gt; val, [deps])</code></td>
              <td>A computed value inside a component</td>
              <td>Expensive derivation (sorting, filtering large lists) or stable object reference for a memoized child</td>
              <td>Wrapping cheap computations that cost more to compare than to recompute</td>
            </tr>
            <tr>
              <td><code>useCallback(fn, [deps])</code></td>
              <td>A function reference</td>
              <td>Passing event handlers as props to <code>React.memo</code>-wrapped children or as <code>useEffect</code> deps</td>
              <td>Using it on inline handlers that are never passed down — zero benefit, extra overhead</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewPlaybook
        title="How to answer: 'When would you use React.memo?'"
        intro="Weak answers list the API. Strong answers describe the diagnostic signal that triggers reaching for it."
        steps={[
          "Open with the trigger condition: you've profiled and confirmed a component re-renders frequently with identical props from a fast-updating parent (e.g., a list item in a real-time feed).",
          "Explain the shallow comparison constraint and the unstable-reference trap — memo only helps if all props are primitives or stable references. Name the fix: useMemo / useCallback for derived objects and handlers.",
          "Close with the cost: memo adds a comparison on every render, so it can hurt if the component rarely re-renders or if props always change. The profiler's baseDuration vs actualDuration delta tells you whether it's actually buying you anything.",
        ]}
      />

      <h2 id="re-render-storm-patterns">Re-render Storm Patterns</h2>

      <p>
        A re-render storm is when one state update cascades into dozens or hundreds of unnecessary
        renders across the tree. The three most common causes in production are: context value
        instability, inline object/function props, and misused <code>key</code> props.
      </p>

      <p>
        <strong>Context instability</strong> is the most dangerous. If your context provider
        constructs its value inline, every consumer in the entire app re-renders on every provider
        update — even consumers that only use a slice of the context that didn&apos;t change.
        The fix is to split contexts by update frequency (separate <code>UserContext</code> from
        <code>ThemeContext</code>) and memoize the value object.
      </p>

      <CodeBlock lang="tsx" code={`// BAD: new object reference on every AuthProvider render
// Every context consumer re-renders when ANY auth state changes
function AuthProviderBad({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  return (
    // { user, permissions, setUser, setPermissions } is a new object every render
    <AuthContext.Provider value={{ user, permissions, setUser, setPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

// GOOD: stable value object — only triggers consumers when deps change
function AuthProviderGood({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const value = useMemo(
    () => ({ user, permissions, setUser, setPermissions }),
    [user, permissions]  // setUser/setPermissions are stable from useState
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// EVEN BETTER for large apps: split by read vs write
const AuthStateContext = React.createContext<{ user: User | null; permissions: string[] } | null>(null);
const AuthDispatchContext = React.createContext<{ setUser: ...; setPermissions: ... } | null>(null);
// Dispatch consumers never re-render on state changes — they only hold stable setters`} />

      <p>
        <strong>Key misuse</strong> is the second storm source. Using an index as a key is not
        just a correctness issue — it causes React to reuse DOM nodes across different data,
        leading to stale state. Using an unstable key (like <code>Math.random()</code> or
        <code>Date.now()</code>) forces React to unmount and remount the component on every render,
        throwing away all its state and causing a full subtree re-render. Always use a stable,
        unique business identifier.
      </p>

      <h2 id="list-virtualization">List Virtualization</h2>

      <p>
        Rendering 10,000 rows into the DOM is not a React problem — it is a DOM problem. Each
        node occupies memory, triggers layout, and is hit by style recalculation. The rule of
        thumb: virtualize when your list exceeds ~200 items. Below that, the overhead of a
        virtualization library often costs more than the rendering itself.
      </p>

      <p>
        <strong>@tanstack/virtual</strong> v3 is the headless option — it gives you the math
        (which items are visible, what their offsets are) without imposing any DOM structure.
        You own the rendering, which means it works with any styling system.
      </p>

      <CodeBlock lang="tsx" code={`import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface Row {
  id: string;
  name: string;
  email: string;
}

function VirtualTable({ rows }: { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,          // estimated row height in px
    overscan: 5,                     // render 5 extra rows beyond the visible window
  });

  return (
    // The scroll container — fixed height, overflow scroll
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      {/* The total height container — tells browser the full scroll height */}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}  // enables dynamic height measurement
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: \`translateY(\${virtualRow.start}px)\`,
              }}
            >
              <span>{row.name}</span>
              <span>{row.email}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// For dynamic row heights (variable content): use measureElement ref instead of
// a fixed estimateSize. TanStack Virtual recalculates offsets after measurement.`} />

      <h2 id="code-splitting-strategies">Code Splitting Strategies</h2>

      <p>
        Code splitting is a performance technique before it is a React technique. The goal is to
        ship only the JavaScript a user needs for their current route, deferring everything else
        to on-demand fetches. React&apos;s built-in primitive is <code>React.lazy</code> +
        <code>Suspense</code>. The split boundary you draw determines how much you save.
      </p>

      <MermaidDiagram
        chart={codeSplittingFlow}
        title="Code Splitting Loading Flow"
        caption="React.lazy defers the module fetch to the first render attempt. Preloading on hover starts the fetch before navigation, hiding latency behind user intent."
        minHeight={420}
      />

      <CodeBlock lang="tsx" code={`import { lazy, Suspense, useCallback } from "react";

// Route-level split — most impactful, lowest granularity
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

// Component-level split — for heavy components rarely shown (rich editors, maps)
const RichEditor = lazy(() => import("./components/RichEditor"));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// Preloading on hover — starts the fetch before the user clicks
// The import() promise is idempotent: calling it twice uses the module cache
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const preload = useCallback(() => {
    if (to === "/dashboard") import("./pages/Dashboard");
    if (to === "/settings") import("./pages/Settings");
  }, [to]);

  return (
    <Link to={to} onMouseEnter={preload} onFocus={preload}>
      {children}
    </Link>
  );
}

// Named chunk for better cache granularity and debugging
const HeavyChart = lazy(
  () => import(/* webpackChunkName: "heavy-chart" */ "./components/HeavyChart")
);`} />

      <h2 id="web-vitals-react-lens">Web Vitals from a React Lens</h2>

      <p>
        Core Web Vitals are user-centric metrics that Google uses in search ranking. Each one has
        a direct mapping to React patterns that hurt or help it. Understanding that mapping lets
        you defend optimization decisions in a system design or performance-focused interview.
      </p>

      <ArticleTable
        caption="How React patterns affect each Core Web Vital — and the fix for each."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Vital</th>
              <th>What it measures</th>
              <th>React patterns that hurt it</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>LCP</strong> (Largest Contentful Paint)</td>
              <td>Time until the largest visible content element is rendered</td>
              <td>Lazy-loading the hero image component, SSR waterfalls, large JS bundles blocking paint</td>
              <td>Server-render above-the-fold content, eager-load hero images, defer non-critical JS</td>
            </tr>
            <tr>
              <td><strong>INP</strong> (Interaction to Next Paint)</td>
              <td>Latency from user interaction to next frame painted</td>
              <td>Re-render storms triggered by click/input, expensive synchronous state updates, Context updates re-rendering large subtrees</td>
              <td><code>startTransition</code> to defer non-urgent updates, split context, memoize subtrees, <code>useDeferredValue</code> for derived state</td>
            </tr>
            <tr>
              <td><strong>CLS</strong> (Cumulative Layout Shift)</td>
              <td>Total unexpected visual shift during page lifetime</td>
              <td>Components that render <code>null</code> then swap to content (Suspense fallback too short), dynamic ads/embeds without reserved space</td>
              <td>Reserve layout space with skeleton loaders, set explicit dimensions on async content, use stable Suspense fallbacks</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <CodeBlock lang="tsx" code={`import { startTransition, useDeferredValue, useState } from "react";

// startTransition: mark an update as non-urgent
// React renders the current UI first, then applies the transition
function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);  // urgent: update the input immediately

    startTransition(() => {
      // non-urgent: React may defer this if the user keeps typing
      setResults(expensiveSearch(value));
    });
  }

  return <input value={query} onChange={handleChange} />;
}

// useDeferredValue: decouple a slow derived render from the fast input
function FilteredList({ query }: { query: string }) {
  // deferredQuery lags behind query during rapid updates
  // The list renders with stale data while the new render is in progress
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => bigList.filter(i => i.includes(deferredQuery)), [deferredQuery]);

  return (
    // isStale pattern: dim the list to signal in-progress update
    <ul style={{ opacity: deferredQuery !== query ? 0.6 : 1 }}>
      {filtered.map(item => <li key={item}>{item}</li>)}
    </ul>
  );
}`} />

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How would you diagnose and fix a slow React page?'"
        intro="This is the most common React performance question at senior level. The interviewer wants a systematic process, not a list of APIs. Weak answers jump to solutions. Strong answers start with measurement."
        steps={[
          "Start with measurement, not assumptions: open React DevTools Profiler, record a session reproducing the slowness, identify which components are rendering and why. Distinguish between render frequency (re-render storms) and render cost (expensive work per render).",
          "For re-render storms: find the root cause — is it context value instability, inline object/function props, or a state update too high in the tree? Fix the source rather than wrapping every child in memo.",
          "For expensive renders: check if it's a DOM count problem (virtualize large lists), a JS computation problem (useMemo for expensive derivations), or a bundle size problem (lazy-load the heavy dependency).",
          "Measure the Web Vitals impact: LCP tells you if the critical path is blocked, INP tells you if interactions feel sluggish, CLS tells you if layout is jumping. Each maps to a specific React fix.",
          "Close with the profiler validation loop: after a fix, re-run the profiler to confirm actualDuration dropped. Never ship a performance change you haven't verified with numbers.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge: The Slow Dashboard</h2>

      <InterviewChallenge
        title="Diagnose and fix a slow analytics dashboard"
        scenario={
          <>
            You inherit a dashboard component used by a BI team. It displays a live-updating
            metrics table (100 rows, refreshes every 2 seconds), a search input that filters
            the table, and a chart panel that is only visible when a user clicks a tab. Users
            report the search input feels laggy and the whole page stutters on each data refresh.
            The component renders inside a <code>DashboardContext.Provider</code> that holds the
            full app theme, user preferences, and the live metrics data in one object.
          </>
        }
        tasks={[
          "Issue 1 — Identify why the search input feels laggy and explain the fix. What React primitive do you reach for and why?",
          "Issue 2 — Identify why the entire page (including unrelated components) re-renders every 2 seconds and propose a structural fix to the context.",
          "Issue 3 — The chart panel is a 120 kB dependency that loads even on the initial page load. How do you fix this and what fallback do you show while it loads?",
        ]}
        pitfalls={[
          "Wrapping every component in React.memo before diagnosing the context instability — this hides the symptom without fixing the cause.",
          "Using useCallback on the search handler when the real issue is the filtered list computation, not the function reference.",
          "Setting a Suspense fallback of null for the chart — this causes a CLS shift when the chart appears.",
        ]}
        signal="A strong answer traces each symptom to its structural cause, applies the minimal fix (useDeferredValue for input lag, context split for re-render storm, React.lazy for bundle), and mentions profiler validation before and after."
      />

      <SolutionReveal difficulty="hard">
        <p><strong>Issue 1 — Laggy search input:</strong></p>
        <p>
          Every keystroke triggers a synchronous filter over 100 rows, then a re-render of the
          table. The fix: <code>useDeferredValue(query)</code> on the value passed to the filtered
          list. The input updates instantly (urgent), while the table re-render is deferred until
          the browser has idle time. Optionally dim the table during the deferred update with
          an <code>opacity</code> style.
        </p>
        <p><strong>Issue 2 — Whole page re-renders every 2 seconds:</strong></p>
        <p>
          The <code>DashboardContext</code> bundles theme, preferences, and live metrics in one
          object. When metrics update, every consumer re-renders — including theme-only consumers.
          Fix: split into <code>MetricsContext</code> (updates every 2s) and{" "}
          <code>PreferencesContext</code> (stable). Components that only need theme/preferences
          subscribe to the stable context and never re-render on metrics ticks.
        </p>
        <p><strong>Issue 3 — Chart panel in initial bundle:</strong></p>
        <CodeBlock lang="tsx" code={`const ChartPanel = lazy(() => import("./ChartPanel"));

// In the dashboard:
{activeTab === "chart" && (
  <Suspense fallback={<div style={{ height: 400 }}><ChartSkeleton /></div>}>
    <ChartPanel data={metrics} />
  </Suspense>
)}

// Preload on tab hover to hide network latency:
function TabButton({ id, label }: { id: string; label: string }) {
  const preload = useCallback(() => {
    if (id === "chart") import("./ChartPanel");
  }, [id]);
  return <button onMouseEnter={preload}>{label}</button>;
}`} />
        <p>
          The <code>style=&#123;&#123; height: 400 &#125;&#125;</code> on the fallback wrapper
          reserves the layout space, preventing a CLS shift when the chart mounts.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Measure before you optimize.</strong> The React DevTools Profiler&apos;s
          &quot;why did this render?&quot; tooltip and <code>Profiler</code> API tell you
          exactly where time is being spent. Guessing leads to cargo-culted memoization that
          adds overhead without improving anything.
        </li>
        <li>
          <strong>Unstable references defeat React.memo.</strong> Wrapping a component in memo
          while passing new object literals or arrow functions as props on every render means
          memo&apos;s comparison always returns false. Fix the reference before wrapping the
          component.
        </li>
        <li>
          <strong>Context instability is the most common re-render storm source.</strong> A
          single provider with a new object reference on every update will re-render every
          consumer in the app. Split contexts by update frequency and memoize value objects.
        </li>
        <li>
          <strong>Virtualize at &gt;200 rows; split code at every route.</strong> These are the
          two highest-ROI mechanical optimizations. Virtualization keeps DOM node count bounded.
          Route-level code splitting keeps initial bundle size bounded. Both are table stakes
          for any production React app.
        </li>
        <li>
          <strong><code>startTransition</code> and <code>useDeferredValue</code> are INP
          tools.</strong> They let React prioritize urgent updates (input, click feedback) over
          expensive derived renders (filtered lists, chart redraws), directly improving
          Interaction to Next Paint.
        </li>
        <li>
          <strong>Every performance fix should end with a profiler re-run.</strong> Confirm that
          <code>actualDuration</code> dropped for the targeted component. If it didn&apos;t, your
          mental model of the bottleneck was wrong — go back to measurement.
        </li>
      </ul>
    </div>
  );
}
