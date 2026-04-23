import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "performance",
  title: "Performance",
  icon: "⚡",
  description: "Profile, memoize, and optimize React components for production.",
  accentColor: "#f59e0b",
  challenges: [
    {
      id: "usememo-derived-data",
      topicId: "performance",
      title: "Memoize an expensive sort+filter on a large list",
      difficulty: "easy",
      description:
        "The `ProductList` component re-runs an expensive sort and filter on every render, even when the filter hasn't changed. Wrap the computation in `useMemo` so it only re-runs when `products` or `filterText` changes.",
      concepts: ["useMemo", "memoization", "derived data"],
      starterCode: `const products = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: \`Product \${i}\`,
  price: Math.random() * 100,
  category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
}));

function ProductList() {
  const [filterText, setFilterText] = React.useState("");

  // This runs on every render — memoize it!
  const filtered = products
    .filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => a.price - b.price);

  return (
    <div>
      <input
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
        placeholder="Filter products..."
      />
      <p>{filtered.length} results</p>
      <ul>
        {filtered.slice(0, 20).map(p => (
          <li key={p.id}>{p.name} — \${p.price.toFixed(2)}</li>
        ))}
      </ul>
    </div>
  );
}

export default ProductList;`,
      hints: [
        "Wrap the filter+sort chain in `React.useMemo(() => { ... }, [filterText])`.",
        "Add `filterText` to the dependency array — the memoized value will only recompute when it changes.",
        "`products` is defined outside the component, so it's stable and doesn't need to be in the dep array.",
      ],
      tests: [
        {
          description: "shows 5000 results initially",
          code: `
it("shows 5000 results initially", () => {
  render(<ProductList />);
  expect(screen.getByText("5000 results")).toBeTruthy();
});`,
        },
        {
          description: "filters results by typed text",
          code: `
it("filters down when typing 'Product 1'", () => {
  render(<ProductList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "Product 1" } });
  const count = parseInt(screen.getByText(/results/).textContent);
  expect(count).toBeLessThan(5000);
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "stable-references",
      topicId: "performance",
      title: "Fix a useEffect that fires on every render due to unstable deps",
      difficulty: "medium",
      description:
        "The `DataLoader` component fetches data inside a `useEffect`, but the effect runs on every render because `options` (an object) and `callback` (a function) are recreated each time. Stabilize both references so the effect only runs when the actual values change.",
      concepts: ["useEffect", "useMemo", "useCallback", "referential equality"],
      starterCode: `function DataLoader({ userId, onLoad }) {
  const [data, setData] = React.useState(null);

  const options = { userId, method: "GET" }; // new object every render
  const callback = (result) => {             // new function every render
    onLoad(result);
    setData(result);
  };

  React.useEffect(() => {
    console.log("effect ran"); // should only run when userId changes
    // Simulated fetch:
    const result = { id: userId, name: \`User \${userId}\` };
    callback(result);
  }, [options, callback]); // unstable deps

  return <div>{data ? \`Loaded: \${data.name}\` : "Loading..."}</div>;
}

export default function App() {
  const [id, setId] = React.useState(1);
  const handleLoad = React.useCallback((d) => console.log("loaded", d), []);
  return (
    <div>
      <DataLoader userId={id} onLoad={handleLoad} />
      <button onClick={() => setId(i => i + 1)}>Next User</button>
    </div>
  );
}`,
      hints: [
        "Stabilize `options` with `useMemo`: `const options = React.useMemo(() => ({ userId, method: 'GET' }), [userId])`.",
        "Stabilize `callback` with `useCallback`: `const callback = React.useCallback((result) => { ... }, [onLoad])`.",
        "Now the effect dep array `[options, callback]` only changes when `userId` or `onLoad` changes.",
      ],
      tests: [
        {
          description: "renders loading or loaded state",
          code: `
it("renders a loaded user message", () => {
  render(<App />);
  expect(screen.getByText("Loaded: User 1")).toBeTruthy();
});`,
        },
        {
          description: "Next User button renders",
          code: `
it("Next User button renders", () => {
  render(<App />);
  expect(screen.getByText("Next User")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "memo-context-split",
      topicId: "performance",
      title: "Prevent all consumers from re-rendering when one context value changes",
      difficulty: "hard",
      description:
        "The `AppContext` below holds both `user` and `theme`. When `theme` changes, `UserDisplay` (which only reads `user`) also re-renders. Split the context into two — `UserContext` and `ThemeContext` — so each consumer only re-renders for the value it cares about.",
      concepts: ["context splitting", "React.memo", "createContext", "re-rendering"],
      starterCode: `const AppContext = React.createContext(null);

const UserDisplay = React.memo(function UserDisplay() {
  const { user } = React.useContext(AppContext);
  console.log("UserDisplay rendered");
  return <p>User: {user.name}</p>;
});

const ThemeDisplay = React.memo(function ThemeDisplay() {
  const { theme } = React.useContext(AppContext);
  console.log("ThemeDisplay rendered");
  return <p>Theme: {theme}</p>;
});

function App() {
  const [user] = React.useState({ name: "Alice" });
  const [theme, setTheme] = React.useState("dark");

  return (
    <AppContext.Provider value={{ user, theme }}>
      <UserDisplay />
      <ThemeDisplay />
      <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
        Toggle Theme
      </button>
    </AppContext.Provider>
  );
}

export default App;`,
      hints: [
        "Create two contexts: `const UserContext = React.createContext(null)` and `const ThemeContext = React.createContext(null)`.",
        "Provide them separately in `App`: wrap children in `<UserContext.Provider value={user}><ThemeContext.Provider value={{theme, setTheme}}>...</ThemeContext.Provider></UserContext.Provider>`.",
        "Update each consumer to use its own context. Now changing `theme` only updates `ThemeContext` subscribers.",
      ],
      tests: [
        {
          description: "renders user and theme",
          code: `
it("renders user name and theme", () => {
  render(<App />);
  expect(screen.getByText("User: Alice")).toBeTruthy();
  expect(screen.getByText("Theme: dark")).toBeTruthy();
});`,
        },
        {
          description: "toggle button changes the theme",
          code: `
it("toggle button switches theme to light", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Toggle Theme"));
  expect(screen.getByText("Theme: light")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 25,
    },
    {
      id: "batch-state-updates",
      topicId: "performance",
      title: "Batch two setState calls to avoid a double render",
      difficulty: "medium",
      description:
        "The `DataFetcher` below calls two `setState` updates in an async context (inside a `setTimeout`). In React 17 and earlier, async updates are NOT automatically batched — this causes two separate re-renders. Use `ReactDOM.flushSync` or `React.startTransition` (React 18+) to understand batching, or refactor into a single state object.",
      concepts: ["batching", "setState", "React 18", "flushSync", "state consolidation"],
      starterCode: `function DataFetcher() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  function fetchData() {
    setLoading(true);

    setTimeout(() => {
      // Two separate setState calls — causes 2 renders in React 17
      setData({ value: 42 });
      setLoading(false);
    }, 100);
  }

  return (
    <div>
      <button onClick={fetchData}>Fetch</button>
      <p>{loading ? "Loading..." : data ? \`Value: \${data.value}\` : "Idle"}</p>
    </div>
  );
}

export default DataFetcher;`,
      hints: [
        "In React 18, all state updates (including async) are automatically batched. If you're on React 18 this is already fixed.",
        "Alternative: consolidate into one state object: `const [state, setState] = useState({ data: null, loading: false })` and call `setState({ data: {...}, loading: false })` once.",
        "Use `ReactDOM.flushSync` only when you need to force a synchronous update and exit the batch.",
      ],
      tests: [
        {
          description: "shows Idle initially",
          code: `
it("shows Idle initially", () => {
  render(<DataFetcher />);
  expect(screen.getByText("Idle")).toBeTruthy();
});`,
        },
        {
          description: "Fetch button renders",
          code: `
it("Fetch button renders", () => {
  render(<DataFetcher />);
  expect(screen.getByText("Fetch")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
  ],
};

export default topic;
