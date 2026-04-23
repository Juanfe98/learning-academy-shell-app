import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "state-props",
  title: "State & Props",
  icon: "📦",
  description: "Master data flow: lifting state, controlled inputs, Context, and derived state.",
  accentColor: "#06b6d4",
  challenges: [
    {
      id: "lift-state-up",
      topicId: "state-props",
      title: "Sync two sibling components by lifting state",
      difficulty: "easy",
      description:
        "Two sibling components — `TemperatureC` and `TemperatureF` — each manage their own state and are currently out of sync. Lift the state to their parent `TemperatureConverter` so that updating one field immediately updates the other.",
      concepts: ["lifting state", "controlled components", "single source of truth"],
      starterCode: `function TemperatureC({ value, onChange }) {
  return (
    <label>
      Celsius:
      <input type="number" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function TemperatureF({ value, onChange }) {
  return (
    <label>
      Fahrenheit:
      <input type="number" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function TemperatureConverter() {
  // TODO: lift state here and compute conversions
  return (
    <div>
      <TemperatureC value={""} onChange={() => {}} />
      <TemperatureF value={""} onChange={() => {}} />
    </div>
  );
}

export default TemperatureConverter;`,
      hints: [
        "Keep a single state in the parent, e.g. `const [celsius, setCelsius] = useState('')`.",
        "Compute Fahrenheit from Celsius: `(parseFloat(celsius) * 9/5 + 32).toFixed(2)`. Handle empty string.",
        "Pass the computed values down and update the source-of-truth in the `onChange` handlers.",
      ],
      tests: [
        {
          description: "renders both input fields",
          code: `
it("renders both input fields", () => {
  render(<TemperatureConverter />);
  expect(screen.getByText(/Celsius/)).toBeTruthy();
  expect(screen.getByText(/Fahrenheit/)).toBeTruthy();
});`,
        },
        {
          description: "typing in Celsius updates the Fahrenheit input",
          code: `
it("typing 100 Celsius shows 212 Fahrenheit", () => {
  render(<TemperatureConverter />);
  const inputs = document.querySelectorAll("input");
  fireEvent.change(inputs[0], { target: { value: "100" } });
  expect(inputs[1].value).toBe("212.00");
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "controlled-input",
      topicId: "state-props",
      title: "Convert an uncontrolled input to controlled",
      difficulty: "easy",
      description:
        "The form below uses `defaultValue` (uncontrolled). Convert it to a fully controlled form where React owns the input values. The submit handler should receive the current values from state, not from the DOM.",
      concepts: ["controlled components", "useState", "forms"],
      starterCode: `function SignupForm() {
  function handleSubmit(e) {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const email = e.target.elements.email.value;
    console.log({ name, email });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" defaultValue="" placeholder="Name" />
      <input name="email" defaultValue="" placeholder="Email" type="email" />
      <button type="submit">Sign Up</button>
    </form>
  );
}

export default SignupForm;`,
      hints: [
        "Add `useState` for each field: `const [name, setName] = useState('')`.",
        "Replace `defaultValue` with `value={name}` and add `onChange={e => setName(e.target.value)}`.",
        "In `handleSubmit`, read from state directly instead of `e.target.elements`.",
      ],
      tests: [
        {
          description: "renders both inputs and submit button",
          code: `
it("renders both inputs and submit button", () => {
  render(<SignupForm />);
  expect(document.querySelector("input[placeholder='Name']")).toBeTruthy();
  expect(document.querySelector("input[placeholder='Email']")).toBeTruthy();
  expect(screen.getByText("Sign Up")).toBeTruthy();
});`,
        },
        {
          description: "inputs reflect typed values",
          code: `
it("inputs reflect typed values", () => {
  render(<SignupForm />);
  const nameInput = document.querySelector("input[placeholder='Name']");
  fireEvent.change(nameInput, { target: { value: "Alice" } });
  expect(nameInput.value).toBe("Alice");
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "context-provider",
      topicId: "state-props",
      title: "Replace prop drilling 3 levels deep with Context",
      difficulty: "medium",
      description:
        "The `user` prop is passed through `App → Layout → Sidebar → UserAvatar` — three layers of prop drilling. The intermediate components (`Layout`, `Sidebar`) don't use `user` themselves. Refactor to use `React.createContext` and `useContext` so only `UserAvatar` reads from context.",
      concepts: ["createContext", "useContext", "Context.Provider", "prop drilling"],
      starterCode: `function UserAvatar({ user }) {
  return <div className="avatar">{user.name[0]}</div>;
}

function Sidebar({ user }) {
  return (
    <aside>
      <UserAvatar user={user} />
    </aside>
  );
}

function Layout({ user }) {
  return (
    <div>
      <Sidebar user={user} />
      <main>Content</main>
    </div>
  );
}

function App() {
  const user = { name: "Alice", role: "admin" };
  return <Layout user={user} />;
}

export default App;`,
      hints: [
        "Create a context: `const UserContext = React.createContext(null)`.",
        "Wrap the tree in `<UserContext.Provider value={user}>` in `App`.",
        "In `UserAvatar`, use `const user = React.useContext(UserContext)` and remove the `user` prop.",
        "Remove the `user` prop from `Layout` and `Sidebar` signatures entirely.",
      ],
      tests: [
        {
          description: "renders the user avatar with first initial",
          code: `
it("renders the user avatar with first initial", () => {
  render(<App />);
  expect(screen.getByText("A")).toBeTruthy();
});`,
        },
        {
          description: "renders main content area",
          code: `
it("renders main content area", () => {
  render(<App />);
  expect(screen.getByText("Content")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "derive-from-state",
      topicId: "state-props",
      title: "Eliminate redundant state by deriving from a single source of truth",
      difficulty: "medium",
      description:
        "The `FilteredList` component stores `items`, `filter`, and `filteredItems` in state. This creates a sync problem — `filteredItems` can drift out of sync with `items`. Remove `filteredItems` from state entirely and derive it directly from `items` and `filter` during render.",
      concepts: ["derived state", "single source of truth", "useState"],
      starterCode: `function FilteredList() {
  const [items] = React.useState(["Apple", "Banana", "Avocado", "Blueberry", "Cherry"]);
  const [filter, setFilter] = React.useState("");
  const [filteredItems, setFilteredItems] = React.useState(items); // redundant!

  function handleFilterChange(e) {
    const value = e.target.value;
    setFilter(value);
    setFilteredItems(items.filter(item => item.toLowerCase().includes(value.toLowerCase())));
  }

  return (
    <div>
      <input value={filter} onChange={handleFilterChange} placeholder="Filter..." />
      <ul>
        {filteredItems.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export default FilteredList;`,
      hints: [
        "Delete `filteredItems` state and `setFilteredItems` calls entirely.",
        "Derive the list inline: `const filteredItems = items.filter(item => item.toLowerCase().includes(filter.toLowerCase()))`.",
        "Simplify `handleFilterChange` to just call `setFilter(value)`.",
      ],
      tests: [
        {
          description: "shows all items initially",
          code: `
it("shows all items initially", () => {
  render(<FilteredList />);
  expect(screen.getByText("Apple")).toBeTruthy();
  expect(screen.getByText("Banana")).toBeTruthy();
  expect(screen.getByText("Cherry")).toBeTruthy();
});`,
        },
        {
          description: "filters items by typed query",
          code: `
it("filters items matching 'av'", () => {
  render(<FilteredList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "av" } });
  expect(screen.getByText("Avocado")).toBeTruthy();
  expect(screen.queryByText("Banana")).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 10,
    },
  ],
};

export default topic;
