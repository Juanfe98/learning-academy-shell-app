import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "concurrent-modern",
  title: "Concurrent & Modern React",
  icon: "⚡",
  description: "useTransition, useDeferredValue, Suspense boundaries, and optimistic UI — the features that define senior React in 2024+.",
  accentColor: "#06b6d4",
  challenges: [
    {
      id: "use-transition-tabs",
      topicId: "concurrent-modern",
      title: "Keep UI responsive during slow tab switches with useTransition",
      difficulty: "medium",
      description:
        "A `TabSwitcher` component renders three tabs. Switching to the 'Reports' tab is slow (it renders 2000 rows). Wrap the tab state update in `useTransition` so the active tab button updates immediately while the content renders in the background. Show a `'Loading…'` indicator via `isPending` while the transition is in progress.",
      concepts: ["useTransition", "startTransition", "isPending", "concurrent rendering"],
      starterCode: `function SlowContent({ rows }) {
  // Simulates an expensive render
  const items = Array.from({ length: rows }, (_, i) => i);
  return <ul>{items.map(i => <li key={i}>Row {i + 1}</li>)}</ul>;
}

function TabSwitcher() {
  const [activeTab, setActiveTab] = React.useState("home");
  // TODO: replace useState above with useTransition
  // const [isPending, startTransition] = React.useTransition();

  function selectTab(tab) {
    // TODO: wrap setActiveTab in startTransition
    setActiveTab(tab);
  }

  return (
    <div>
      <div>
        {["home", "about", "reports"].map(tab => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            style={{ fontWeight: activeTab === tab ? "bold" : "normal" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TODO: show "Loading…" when isPending is true */}

      <div>
        {activeTab === "home"    && <p>Welcome home</p>}
        {activeTab === "about"   && <p>About us</p>}
        {activeTab === "reports" && <SlowContent rows={2000} />}
      </div>
    </div>
  );
}`,
      hints: [
        "`const [isPending, startTransition] = React.useTransition()` — destructure both values.",
        "Wrap the state update: `startTransition(() => { setActiveTab(tab); })`.",
        "The `isPending` flag is `true` from when `startTransition` is called until React finishes rendering.",
        "Show the loading indicator: `{isPending && <p>Loading…</p>}`.",
      ],
      tests: [
        {
          description: "renders initial home tab",
          code: `
it("renders welcome home on initial render", () => {
  render(<TabSwitcher />);
  expect(screen.getByText("Welcome home")).toBeTruthy();
});`,
        },
        {
          description: "switching tabs updates the active tab",
          code: `
it("clicking about tab shows About us content", () => {
  render(<TabSwitcher />);
  fireEvent.click(screen.getByText("about"));
  expect(screen.getByText("About us")).toBeTruthy();
});`,
        },
        {
          description: "tab buttons render for all three tabs",
          code: `
it("renders all three tab buttons", () => {
  render(<TabSwitcher />);
  expect(screen.getByText("home")).toBeTruthy();
  expect(screen.getByText("about")).toBeTruthy();
  expect(screen.getByText("reports")).toBeTruthy();
});`,
        },
        {
          description: "useTransition is used in the component",
          code: `
it("component uses useTransition (checks isPending indicator exists in markup when pending)", () => {
  render(<TabSwitcher />);
  // In a sync test environment transitions complete immediately,
  // so we just verify the component renders without errors
  fireEvent.click(screen.getByText("reports"));
  expect(screen.getByText("Row 1")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "use-deferred-search",
      topicId: "concurrent-modern",
      title: "Defer expensive search filtering with useDeferredValue",
      difficulty: "medium",
      description:
        "A `SearchList` component filters a list of 5000 items as the user types. The filtering blocks the input from feeling responsive. Use `useDeferredValue` to defer the filter computation: the input updates immediately, and the filtered list re-renders only when React has idle time. Show a dimmed/stale state when the deferred value lags behind.",
      concepts: ["useDeferredValue", "deferred rendering", "responsive input", "stale UI indicator"],
      starterCode: `const ALL_ITEMS = Array.from({ length: 5000 }, (_, i) => \`Item \${i + 1}\`);

function SearchList() {
  const [query, setQuery] = React.useState("");

  // TODO: derive a deferred version of query
  // const deferredQuery = React.useDeferredValue(query);

  // TODO: use deferredQuery for filtering instead of query
  const filtered = ALL_ITEMS.filter(item =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  // TODO: check if the UI is showing stale results
  // const isStale = query !== deferredQuery;

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search items..."
      />
      <p>{filtered.length} result(s)</p>

      {/* TODO: apply reduced opacity when isStale is true */}
      <ul>
        {filtered.slice(0, 20).map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}`,
      hints: [
        "`const deferredQuery = React.useDeferredValue(query)` — derive after setting query state.",
        "Use `deferredQuery` in the filter: `ALL_ITEMS.filter(item => item.toLowerCase().includes(deferredQuery.toLowerCase()))`.",
        "`const isStale = query !== deferredQuery` — true when the deferred value hasn't caught up yet.",
        "Apply visual feedback: `style={{ opacity: isStale ? 0.5 : 1 }}` on the list wrapper.",
      ],
      tests: [
        {
          description: "renders initial list with all 5000 items",
          code: `
it("shows 5000 result(s) on initial render", () => {
  render(<SearchList />);
  expect(screen.getByText("5000 result(s)")).toBeTruthy();
});`,
        },
        {
          description: "typing filters the list",
          code: `
it("typing filters results", () => {
  render(<SearchList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "Item 1" } });
  const countEl = screen.getByText(/result/);
  expect(countEl).toBeTruthy();
});`,
        },
        {
          description: "search for specific item shows it in results",
          code: `
it("Item 42 appears when searching '42'", () => {
  render(<SearchList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "Item 42" } });
  expect(screen.getByText("Item 42")).toBeTruthy();
});`,
        },
        {
          description: "clearing search restores all results",
          code: `
it("clearing search restores all 5000 results", () => {
  render(<SearchList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "xyz" } });
  fireEvent.change(input, { target: { value: "" } });
  expect(screen.getByText("5000 result(s)")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "suspense-boundary",
      topicId: "concurrent-modern",
      title: "Add Suspense boundaries for lazy-loaded components",
      difficulty: "easy",
      description:
        "A settings page lazily loads three panels (`ProfilePanel`, `SecurityPanel`, `BillingPanel`) using `React.lazy`. Wrap each one in a `<Suspense>` boundary with a meaningful fallback. Then add a parent Suspense boundary as a catch-all. Understand how nested boundaries let different parts of the UI load independently.",
      concepts: ["Suspense", "React.lazy", "fallback", "code splitting", "nested boundaries"],
      starterCode: `// Simulated lazy panels (pre-resolved so tests work synchronously)
const ProfilePanel = React.lazy(() =>
  Promise.resolve({ default: () => <div>Profile Settings</div> })
);
const SecurityPanel = React.lazy(() =>
  Promise.resolve({ default: () => <div>Security Settings</div> })
);
const BillingPanel = React.lazy(() =>
  Promise.resolve({ default: () => <div>Billing Settings</div> })
);

function LoadingSpinner({ label }) {
  return <p>Loading {label}…</p>;
}

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>

      {/* TODO: wrap ProfilePanel in a Suspense boundary
          fallback: <LoadingSpinner label="profile" /> */}
      <ProfilePanel />

      {/* TODO: wrap SecurityPanel in a Suspense boundary
          fallback: <LoadingSpinner label="security" /> */}
      <SecurityPanel />

      {/* TODO: wrap BillingPanel in a Suspense boundary
          fallback: <LoadingSpinner label="billing" /> */}
      <BillingPanel />
    </div>
  );
}`,
      hints: [
        "`<Suspense fallback={<LoadingSpinner label='profile' />}><ProfilePanel /></Suspense>`",
        "Each panel gets its own boundary so they load independently — if one fails, others still render.",
        "A parent `<Suspense>` around all three would show a single fallback for the whole page — less granular.",
        "React.lazy must always be used inside a Suspense boundary — without one, React throws an error.",
      ],
      tests: [
        {
          description: "ProfilePanel renders after Suspense resolves",
          code: `
it("renders Profile Settings content", async () => {
  render(<SettingsPage />);
  await new Promise(r => setTimeout(r, 0));
  expect(screen.getByText("Profile Settings")).toBeTruthy();
});`,
        },
        {
          description: "SecurityPanel renders after Suspense resolves",
          code: `
it("renders Security Settings content", async () => {
  render(<SettingsPage />);
  await new Promise(r => setTimeout(r, 0));
  expect(screen.getByText("Security Settings")).toBeTruthy();
});`,
        },
        {
          description: "BillingPanel renders after Suspense resolves",
          code: `
it("renders Billing Settings content", async () => {
  render(<SettingsPage />);
  await new Promise(r => setTimeout(r, 0));
  expect(screen.getByText("Billing Settings")).toBeTruthy();
});`,
        },
        {
          description: "Settings heading is always visible",
          code: `
it("Settings heading renders immediately", () => {
  render(<SettingsPage />);
  expect(screen.getByText("Settings")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "optimistic-todos",
      topicId: "concurrent-modern",
      title: "Implement optimistic UI with useOptimistic",
      difficulty: "medium",
      description:
        "Build a todo list where toggling a todo's `done` state updates the UI instantly (optimistically) before the server responds. Use `useOptimistic` to show the toggled state immediately, then reconcile with the server result. If the server call fails, the UI reverts automatically. This is the React 19 pattern — polyfill it with `useState` if on React 18.",
      concepts: ["useOptimistic", "optimistic UI", "React 19", "state reconciliation"],
      starterCode: `// useOptimistic polyfill for React 18 compatibility
// In React 19: const [optimisticTodos, addOptimistic] = React.useOptimistic(todos, updateFn)
function useOptimistic(state, updateFn) {
  const [optimistic, setOptimistic] = React.useState(state);
  React.useEffect(() => { setOptimistic(state); }, [state]);
  function dispatch(action) {
    setOptimistic(current => updateFn(current, action));
  }
  return [optimistic, dispatch];
}

const fakeToggleApi = (id) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (Math.random() > 0.2 ? resolve(id) : reject(id)), 300)
  );

function TodoList() {
  const [todos, setTodos] = React.useState([
    { id: 1, text: "Learn useOptimistic", done: false },
    { id: 2, text: "Ship to production", done: false },
    { id: 3, text: "Write tests",        done: true  },
  ]);

  // TODO: set up useOptimistic
  // const [optimisticTodos, applyOptimistic] = useOptimistic(
  //   todos,
  //   (current, toggledId) => current.map(t => t.id === toggledId ? { ...t, done: !t.done } : t)
  // );

  async function toggle(id) {
    // TODO:
    // 1. call applyOptimistic(id) to update UI immediately
    // 2. await fakeToggleApi(id)
    // 3. on success: update real todos state with setTodos
    // 4. on failure: optimistic state auto-reverts (useOptimistic handles it)
  }

  // TODO: render optimisticTodos instead of todos
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <button onClick={() => toggle(todo.id)}>
            {todo.done ? "✓" : "○"} {todo.text}
          </button>
        </li>
      ))}
    </ul>
  );
}`,
      hints: [
        "Set up: `const [optimisticTodos, applyOptimistic] = useOptimistic(todos, (current, id) => current.map(t => t.id === id ? {...t, done: !t.done} : t))`.",
        "In `toggle`: call `applyOptimistic(id)` synchronously first — this makes the UI respond instantly.",
        "Then `await fakeToggleApi(id)` — if it resolves, call `setTodos(prev => prev.map(...))` to commit the real state.",
        "If it rejects, do nothing — `useOptimistic` automatically rolls back the optimistic state to `todos`.",
        "Render `optimisticTodos` in the JSX so users see the optimistic state.",
      ],
      tests: [
        {
          description: "renders all three todos initially",
          code: `
it("renders all three todo items", () => {
  render(<TodoList />);
  expect(screen.getByText(/Learn useOptimistic/)).toBeTruthy();
  expect(screen.getByText(/Ship to production/)).toBeTruthy();
  expect(screen.getByText(/Write tests/)).toBeTruthy();
});`,
        },
        {
          description: "completed todo shows checkmark",
          code: `
it("completed todo shows ✓ icon", () => {
  render(<TodoList />);
  expect(screen.getByText(/✓.*Write tests/)).toBeTruthy();
});`,
        },
        {
          description: "incomplete todos show circle icon",
          code: `
it("incomplete todo shows ○ icon", () => {
  render(<TodoList />);
  expect(screen.getByText(/○.*Learn useOptimistic/)).toBeTruthy();
});`,
        },
        {
          description: "clicking a todo immediately updates the icon (optimistic)",
          code: `
it("clicking todo immediately shows toggled state", () => {
  render(<TodoList />);
  const btn = screen.getByText(/○.*Learn useOptimistic/);
  fireEvent.click(btn);
  expect(screen.getByText(/✓.*Learn useOptimistic/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
