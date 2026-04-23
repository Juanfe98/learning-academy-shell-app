import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "patterns",
  title: "Patterns",
  icon: "🧩",
  description: "Compound components, render props, HOCs, and hook composition.",
  accentColor: "#ec4899",
  challenges: [
    {
      id: "compound-tabs",
      topicId: "patterns",
      title: "Build a <Tabs> / <Tab> / <TabPanel> compound component",
      difficulty: "medium",
      description:
        "Implement a compound `<Tabs>` component that manages which tab is active, with `<Tab>` (the clickable label) and `<TabPanel>` (the content area) as child components. Use React Context to share the active tab state without prop drilling.",
      concepts: ["compound components", "createContext", "useContext", "implicit state sharing"],
      starterCode: `const TabsContext = React.createContext(null);

function Tabs({ children, defaultTab }) {
  // TODO: manage active tab state, provide context
  return <div>{children}</div>;
}

function Tab({ id, children }) {
  // TODO: read from context, apply active styles, handle click
  return <button>{children}</button>;
}

function TabPanel({ id, children }) {
  // TODO: only render when this tab is active
  return <div>{children}</div>;
}

function Demo() {
  return (
    <Tabs defaultTab="profile">
      <div style={{ display: "flex", gap: 8 }}>
        <Tab id="profile">Profile</Tab>
        <Tab id="settings">Settings</Tab>
      </div>
      <TabPanel id="profile"><p>Profile content</p></TabPanel>
      <TabPanel id="settings"><p>Settings content</p></TabPanel>
    </Tabs>
  );
}

export default Demo;`,
      hints: [
        "In `Tabs`: `const [active, setActive] = useState(defaultTab)`. Provide `{ active, setActive }` via `TabsContext.Provider`.",
        "In `Tab`: read `{ active, setActive }` from context. `onClick={() => setActive(id)}`. Apply active styles when `active === id`.",
        "In `TabPanel`: read `active` from context. Return `null` when `active !== id`.",
      ],
      tests: [
        {
          description: "shows default tab content on mount",
          code: `
it("shows profile content by default", () => {
  render(<Demo />);
  expect(screen.getByText("Profile content")).toBeTruthy();
  expect(screen.queryByText("Settings content")).toBeNull();
});`,
        },
        {
          description: "clicking Settings tab shows Settings content",
          code: `
it("clicking Settings shows Settings content", () => {
  render(<Demo />);
  fireEvent.click(screen.getByText("Settings"));
  expect(screen.getByText("Settings content")).toBeTruthy();
  expect(screen.queryByText("Profile content")).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "render-props-toggle",
      topicId: "patterns",
      title: "Implement a <Toggle renderOn={…} renderOff={…} /> render prop component",
      difficulty: "medium",
      description:
        "Build a `<Toggle>` component that manages a boolean state and delegates rendering to the caller via `renderOn` and `renderOff` props. The caller decides what to show in each state; `Toggle` only provides the state and toggle function.",
      concepts: ["render props", "inversion of control", "useState"],
      starterCode: `function Toggle({ renderOn, renderOff }) {
  // TODO: manage boolean state, call the right render prop
}

function Demo() {
  return (
    <Toggle
      renderOn={(toggle) => (
        <div>
          <p>The light is ON 💡</p>
          <button onClick={toggle}>Turn Off</button>
        </div>
      )}
      renderOff={(toggle) => (
        <div>
          <p>The light is OFF 🌑</p>
          <button onClick={toggle}>Turn On</button>
        </div>
      )}
    />
  );
}

export default Demo;`,
      hints: [
        "`const [on, setOn] = useState(false)`. The toggle function: `const toggle = () => setOn(v => !v)`.",
        "Call `renderOn(toggle)` when `on` is true, `renderOff(toggle)` when false.",
        "Render props receive functions — call them like `{on ? renderOn(toggle) : renderOff(toggle)}`.",
      ],
      tests: [
        {
          description: "shows OFF state initially",
          code: `
it("shows OFF state initially", () => {
  render(<Demo />);
  expect(screen.getByText(/light is OFF/)).toBeTruthy();
});`,
        },
        {
          description: "Turn On button switches to ON state",
          code: `
it("Turn On button switches to ON state", () => {
  render(<Demo />);
  fireEvent.click(screen.getByText("Turn On"));
  expect(screen.getByText(/light is ON/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "hoc-auth-guard",
      topicId: "patterns",
      title: "Build a withAuth(Component) HOC that redirects if not authenticated",
      difficulty: "medium",
      description:
        "Implement a `withAuth(Component)` Higher-Order Component. When `isAuthenticated` is `false`, it should render a redirect message (simulating a router redirect). When `true`, it renders the wrapped component with all props forwarded.",
      concepts: ["HOC", "higher-order components", "prop forwarding", "authentication"],
      starterCode: `function withAuth(Component) {
  // TODO: return a new component that checks isAuthenticated prop
}

function Dashboard({ username }) {
  return <h1>Welcome, {username}!</h1>;
}

const ProtectedDashboard = withAuth(Dashboard);

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  return (
    <div>
      <button onClick={() => setIsAuthenticated(v => !v)}>
        {isAuthenticated ? "Log Out" : "Log In"}
      </button>
      <ProtectedDashboard isAuthenticated={isAuthenticated} username="Alice" />
    </div>
  );
}

export default App;`,
      hints: [
        "Return a new component from `withAuth`: `function WithAuth(props) { ... }`.",
        "Destructure `isAuthenticated` from props: `const { isAuthenticated, ...rest } = props`.",
        "If `!isAuthenticated`, render a redirect message. Otherwise, `return <Component {...rest} />`.",
      ],
      tests: [
        {
          description: "shows redirect message when not authenticated",
          code: `
it("shows redirect when not authenticated", () => {
  render(<App />);
  expect(screen.queryByText("Welcome, Alice!")).toBeNull();
});`,
        },
        {
          description: "shows dashboard after login",
          code: `
it("shows dashboard after logging in", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Log In"));
  expect(screen.getByText("Welcome, Alice!")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "hook-composition",
      topicId: "patterns",
      title: "Compose useSearch + useSort + usePagination into useFilteredList",
      difficulty: "hard",
      description:
        "Implement three focused hooks — `useSearch(items, key)`, `useSort(items, defaultField)`, `usePagination(items, pageSize)` — then compose them into `useFilteredList(items)` which returns everything the UI needs: filtered, sorted, paginated data plus all the controls.",
      concepts: ["hook composition", "custom hooks", "single-responsibility"],
      starterCode: `function useSearch(items, searchKey) {
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(
    () => items.filter(item => String(item[searchKey]).toLowerCase().includes(query.toLowerCase())),
    [items, query, searchKey]
  );
  return { query, setQuery, results };
}

function useSort(items, defaultField) {
  const [sortField, setSortField] = React.useState(defaultField);
  const [sortDir, setSortDir] = React.useState("asc");
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const cmp = a[sortField] < b[sortField] ? -1 : a[sortField] > b[sortField] ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);
  return { sorted, sortField, setSortField, sortDir, setSortDir };
}

function usePagination(items, pageSize) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
  return { page, setPage, pageItems, totalPages };
}

function useFilteredList(items) {
  // TODO: compose the three hooks above
  // Return: { query, setQuery, sortField, setSortField, sortDir, setSortDir,
  //           page, setPage, totalPages, pageItems }
}

const USERS = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: \`User \${i + 1}\`,
  age: 20 + (i % 40),
}));

function UserTable() {
  const { query, setQuery, sortField, setSortField, page, setPage, totalPages, pageItems } =
    useFilteredList(USERS);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />
      <button onClick={() => setSortField("name")}>Sort by name</button>
      <button onClick={() => setSortField("age")}>Sort by age</button>
      <ul>{pageItems.map(u => <li key={u.id}>{u.name} (age {u.age})</li>)}</ul>
      <p>Page {page} of {totalPages}</p>
      <button onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
    </div>
  );
}

export default UserTable;`,
      hints: [
        "In `useFilteredList`: call `useSearch` first → get `results`. Pass `results` to `useSort` → get `sorted`. Pass `sorted` to `usePagination`.",
        "Chain: `const { query, setQuery, results } = useSearch(items, 'name')` → `const { sorted, sortField, setSortField, sortDir, setSortDir } = useSort(results, 'name')` → `const { page, setPage, pageItems, totalPages } = usePagination(sorted, 10)`.",
        "Return all the controls from `useFilteredList` so the UI can wire them up.",
      ],
      tests: [
        {
          description: "renders 10 items per page initially",
          code: `
it("renders 10 items on first page", () => {
  render(<UserTable />);
  const items = document.querySelectorAll("li");
  expect(items.length).toBe(10);
});`,
        },
        {
          description: "shows correct page count for 50 items",
          code: `
it("shows 5 total pages for 50 items", () => {
  render(<UserTable />);
  expect(screen.getByText("Page 1 of 5")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 35,
    },
  ],
};

export default topic;
