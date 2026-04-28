import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "performance",
  title: "Performance",
  icon: "⚡",
  description:
    "Profile, memoize, and optimize React components for production.",
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
      title:
        "Prevent all consumers from re-rendering when one context value changes",
      difficulty: "hard",
      description:
        "The `AppContext` below holds both `user` and `theme`. When `theme` changes, `UserDisplay` (which only reads `user`) also re-renders. Split the context into two — `UserContext` and `ThemeContext` — so each consumer only re-renders for the value it cares about.",
      concepts: [
        "context splitting",
        "React.memo",
        "createContext",
        "re-rendering",
      ],
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
      concepts: [
        "batching",
        "setState",
        "React 18",
        "flushSync",
        "state consolidation",
      ],
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
    {
      id: "react-team-directory",
      topicId: "performance",
      title: "Build a team directory with memoized search and filtering",
      difficulty: "hard",
      description:
        "Build a realistic team directory UI with a department filter, a search box, a repeated member results view, and a profile detail pane. The main React skill is computing filtered results efficiently and keeping selection stable as the visible data changes.",
      targetImage: {
        src: "/react-challenges/team-directory-workspace.svg",
        alt: "React interview target mock for a team directory workspace with filter sidebar, result cards, and profile summary panel.",
        caption:
          "This is a great derived-data challenge: search query, active department, visible results, and selected member should all stay in sync without redundant state.",
      },
      concepts: [
        "useMemo",
        "derived data",
        "controlled inputs",
        "selected state",
        "list rendering",
      ],
      starterCode: `const MEMBERS = [
  {
    id: "u1",
    name: "Maya Chen",
    role: "Staff Product Designer",
    department: "Product",
    location: "Bogota",
    focus: "Design systems",
    status: "Active",
  },
  {
    id: "u2",
    name: "Luis Gomez",
    role: "Frontend Engineer",
    department: "Platform",
    location: "Medellin",
    focus: "Dashboard shell",
    status: "Active",
  },
  {
    id: "u3",
    name: "Sara Lin",
    role: "Product Manager",
    department: "Product",
    location: "Remote",
    focus: "Onboarding flows",
    status: "Away",
  },
  {
    id: "u4",
    name: "Diego Ruiz",
    role: "Data Engineer",
    department: "Data",
    location: "Bogota",
    focus: "Event pipelines",
    status: "Active",
  },
  {
    id: "u5",
    name: "Ana Torres",
    role: "UX Researcher",
    department: "Product",
    location: "Quito",
    focus: "Usability studies",
    status: "Offline",
  },
];

function FilterSidebar({ activeDepartment, onChangeDepartment }) {
  const departments = ["All", "Product", "Platform", "Data"];
  return (
    <aside>
      <h2>Filters</h2>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {departments.map((department) => (
          <button
            key={department}
            type="button"
            onClick={() => onChangeDepartment(department)}
            style={{
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: activeDepartment === department ? "#e0f2fe" : "white",
              fontWeight: activeDepartment === department ? 700 : 500,
            }}
          >
            {department}
          </button>
        ))}
      </div>
    </aside>
  );
}

function MemberResults({ members, selectedMemberId, onSelectMember }) {
  return (
    <ul style={{ listStyle: "none", display: "grid", gap: 16 }}>
      {members.map((member) => (
        <li key={member.id}>
          <button
            type="button"
            onClick={() => onSelectMember(member.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 16,
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              background: selectedMemberId === member.id ? "#e0f2fe" : "white",
            }}
          >
            <strong>{member.name}</strong>
            <p style={{ marginTop: 8 }}>{member.role}</p>
            <p style={{ color: "#475569", marginTop: 6 }}>
              {member.department} · {member.location}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MemberProfile({ member }) {
  if (!member) return <p>Select a team member.</p>;

  return (
    <section>
      <h2>{member.name}</h2>
      <p style={{ color: "#475569", marginTop: 8 }}>{member.role}</p>
      <dl style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <div>
          <dt>Department</dt>
          <dd>{member.department}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{member.location}</dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>{member.focus}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{member.status}</dd>
        </div>
      </dl>
    </section>
  );
}

function App() {
  const [query, setQuery] = React.useState("");
  const [activeDepartment, setActiveDepartment] = React.useState("All");
  const [selectedMemberId, setSelectedMemberId] = React.useState("u1");

  // TODO:
  // 1. use React.useMemo to derive the visible members from query + activeDepartment
  // 2. keep the selected member coherent when the visible list changes
  // 3. render the 3-region workspace with filter sidebar, result list, and profile panel

  return (
    <div>
      <h1>Team directory</h1>
    </div>
  );
}

export default App;`,
      hints: [
        "Memoize the visible list: filter by department first, then by a lowercase query against name and role.",
        "As with the inbox challenge, derive the selected object from the visible list instead of storing a duplicate selected member object.",
        "If the selected member is no longer visible after filtering, fall back to the first visible result or `null`.",
      ],
      tests: [
        {
          description: "renders the main shell and initial selected member",
          code: `
it("renders the directory shell and initial selected member", () => {
  render(<App />);
  expect(screen.getByText("Team directory")).toBeTruthy();
  expect(screen.getByText("Filters")).toBeTruthy();
  expect(screen.getByText("Maya Chen")).toBeTruthy();
});`,
        },
        {
          description: "search filters the member results",
          code: `
it("search filters results down to Maya", () => {
  render(<App />);
  fireEvent.change(document.querySelector("input"), { target: { value: "maya" } });
  expect(screen.getByText("Maya Chen")).toBeTruthy();
  expect(screen.queryByText("Luis Gomez")).toBeNull();
});`,
        },
        {
          description:
            "changing the department filter updates the visible results and profile",
          code: `
it("department filter shows Product members only", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Product"));
  expect(screen.getByText("Maya Chen")).toBeTruthy();
  expect(screen.queryByText("Luis Gomez")).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 35,
    },
  ],
};

export default topic;
