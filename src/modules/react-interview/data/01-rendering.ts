import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "rendering",
  title: "React Rendering",
  icon: "🔄",
  description: "Understand when and why React re-renders, and how to control it.",
  accentColor: "#6366f1",
  challenges: [
    {
      id: "memo-child-component",
      topicId: "rendering",
      title: "Stop a child from re-rendering on every parent update",
      difficulty: "easy",
      description:
        "The `ParentComponent` updates its own state every second via a timer. The `ChildComponent` below does not depend on that state, yet it re-renders on every tick. Wrap `ChildComponent` with `React.memo` to prevent unnecessary re-renders.",
      concepts: ["React.memo", "re-rendering", "referential equality"],
      starterCode: `function ChildComponent({ label }) {
  console.log("ChildComponent rendered");
  return <div>{label}</div>;
}

function ParentComponent() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p>Parent count: {count}</p>
      <ChildComponent label="Static Label" />
    </div>
  );
}

export default ParentComponent;`,
      hints: [
        "React re-renders a component whenever its parent re-renders, even if its own props haven't changed.",
        "`React.memo(Component)` wraps a component so it only re-renders when its props change (shallow comparison).",
        "Wrap the `ChildComponent` definition: `const ChildComponent = React.memo(function ChildComponent({ label }) { ... });`",
      ],
      tests: [
        {
          description: "ChildComponent is wrapped with React.memo",
          code: `
it("ChildComponent is wrapped with React.memo", () => {
  expect(typeof ChildComponent).toBe("object");
  expect(ChildComponent.$$typeof).toBe(Symbol.for("react.memo"));
});`,
        },
        {
          description: "renders the static label",
          code: `
it("renders the static label", () => {
  const el = render(<ParentComponent />);
  expect(screen.getByText("Static Label")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 5,
    },
    {
      id: "fix-stale-key",
      topicId: "rendering",
      title: "Fix a list that loses input state on reorder (key prop bug)",
      difficulty: "easy",
      description:
        "The list below renders items with their index as the `key`. When the items are shuffled, each `<input>` retains the value from its old position instead of following its item. Fix the key prop to use the item's stable `id` field.",
      concepts: ["key prop", "reconciliation", "list rendering"],
      starterCode: `const initialItems = [
  { id: "a", name: "Apple" },
  { id: "b", name: "Banana" },
  { id: "c", name: "Cherry" },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function ItemList() {
  const [items, setItems] = React.useState(initialItems);
  return (
    <div>
      <button onClick={() => setItems(shuffle(items))}>Shuffle</button>
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item.name}: <input defaultValue={item.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ItemList;`,
      hints: [
        "Using an array index as `key` means React identifies items by position, not by identity.",
        "When the array is reordered React sees items 'in place' — it updates the text but reuses the DOM node (and its input value).",
        "Use `item.id` as the key: `key={item.id}`.",
      ],
      tests: [
        {
          description: "each list item uses item.id as its key (no index keys)",
          code: `
it("each list item uses item.id as its key", () => {
  const el = render(<ItemList />);
  const items = el.querySelectorAll("li");
  expect(items.length).toBe(3);
});`,
        },
        {
          description: "renders all item names",
          code: `
it("renders all item names", () => {
  render(<ItemList />);
  expect(screen.getByText(/Apple/)).toBeTruthy();
  expect(screen.getByText(/Banana/)).toBeTruthy();
  expect(screen.getByText(/Cherry/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 5,
    },
    {
      id: "memo-with-callback",
      topicId: "rendering",
      title: "Memoize a child + stabilize its callback prop",
      difficulty: "medium",
      description:
        "The `ExpensiveChild` component is wrapped in `React.memo`, but it still re-renders every time the parent updates. This is because the `onAction` callback is re-created on every render. Use `useCallback` to stabilize it.",
      concepts: ["React.memo", "useCallback", "referential equality", "re-rendering"],
      starterCode: `const ExpensiveChild = React.memo(function ExpensiveChild({ onAction }) {
  console.log("ExpensiveChild rendered");
  return <button onClick={onAction}>Do Action</button>;
});

function Parent() {
  const [count, setCount] = React.useState(0);

  const handleAction = () => {
    console.log("action triggered");
  };

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment ({count})</button>
      <ExpensiveChild onAction={handleAction} />
    </div>
  );
}

export default Parent;`,
      hints: [
        "`React.memo` does a shallow comparison of props. Functions are objects — a new function reference fails the equality check even if the logic is identical.",
        "`useCallback(fn, deps)` returns a memoized version of a callback that only changes when `deps` change.",
        "Wrap `handleAction` with `useCallback`: `const handleAction = React.useCallback(() => { ... }, []);`",
      ],
      tests: [
        {
          description: "ExpensiveChild is wrapped with React.memo",
          code: `
it("ExpensiveChild is wrapped with React.memo", () => {
  expect(ExpensiveChild.$$typeof).toBe(Symbol.for("react.memo"));
});`,
        },
        {
          description: "renders button and parent counter",
          code: `
it("renders button and parent counter", () => {
  render(<Parent />);
  expect(screen.getByText(/Do Action/)).toBeTruthy();
  expect(screen.getByText(/Increment/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "why-did-it-render",
      topicId: "rendering",
      title: "Identify and fix 3 unnecessary re-renders in a dashboard",
      difficulty: "hard",
      description:
        "The `Dashboard` below has three performance problems: (1) `StatsPanel` re-renders because its `config` object is recreated inline, (2) `UserList` re-renders because `getUsers` is a new function each render, (3) `Header` re-renders because it reads a context value it doesn't actually use. Fix all three.",
      concepts: ["useMemo", "useCallback", "context splitting", "React.memo"],
      starterCode: `const ThemeContext = React.createContext({ theme: "dark", language: "en" });

const Header = React.memo(function Header() {
  const ctx = React.useContext(ThemeContext);
  return <header>Header (theme: {ctx.theme})</header>;
});

const StatsPanel = React.memo(function StatsPanel({ config }) {
  return <div>Stats: {config.title}</div>;
});

const UserList = React.memo(function UserList({ getUsers }) {
  const users = getUsers();
  return <ul>{users.map(u => <li key={u}>{u}</li>)}</ul>;
});

function Dashboard() {
  const [count, setCount] = React.useState(0);

  const config = { title: "Monthly Overview" };
  const getUsers = () => ["Alice", "Bob", "Carol"];

  return (
    <ThemeContext.Provider value={{ theme: "dark", language: "en" }}>
      <button onClick={() => setCount(c => c + 1)}>Tick ({count})</button>
      <Header />
      <StatsPanel config={config} />
      <UserList getUsers={getUsers} />
    </ThemeContext.Provider>
  );
}

export default Dashboard;`,
      hints: [
        "Problem 1: `config` is a new object literal every render. Wrap it with `useMemo`: `const config = React.useMemo(() => ({ title: 'Monthly Overview' }), []);`",
        "Problem 2: `getUsers` is a new function every render. Wrap it with `useCallback`: `const getUsers = React.useCallback(() => [...], []);`",
        "Problem 3: `Header` consumes the whole context even though it only needs `theme`. Create a separate `ThemeOnlyContext` for just the theme, or split the provider so `Header` only subscribes to the value it uses.",
      ],
      tests: [
        {
          description: "renders all three panels",
          code: `
it("renders all three panels", () => {
  render(<Dashboard />);
  expect(screen.getByText(/Header/)).toBeTruthy();
  expect(screen.getByText(/Stats/)).toBeTruthy();
  expect(screen.getByText("Alice")).toBeTruthy();
});`,
        },
        {
          description: "tick button increments the counter",
          code: `
it("tick button increments the counter", () => {
  render(<Dashboard />);
  const btn = screen.getByText(/Tick/);
  fireEvent.click(btn);
  expect(screen.getByText(/Tick \(1\)/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
