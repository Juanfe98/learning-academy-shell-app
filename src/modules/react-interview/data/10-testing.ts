import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "testing",
  title: "Testing",
  icon: "🧪",
  description: "Write tests for React components using render, screen, and fireEvent — the patterns every senior dev must know.",
  accentColor: "#a855f7",
  challenges: [
    {
      id: "test-counter",
      topicId: "testing",
      title: "Write tests for a Counter component",
      difficulty: "easy",
      description:
        "A `Counter` component is provided. Write `it()` blocks that verify: initial count is 0, clicking the + button increments the count, clicking the − button decrements it. Use `render`, `screen.getByText`, and `fireEvent.click`.",
      concepts: ["render", "screen.getByText", "fireEvent.click", "assertions"],
      starterCode: `// Given component — do not modify
function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c - 1)}>-</button>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}

// ─── Write your tests below ──────────────────────────────

it("shows initial count of 0", () => {
  render(<Counter />);
  // TODO: assert the count shows "0"
});

it("increments count when + is clicked", () => {
  render(<Counter />);
  // TODO: click the + button and assert count shows "1"
});

it("decrements count when - is clicked", () => {
  render(<Counter />);
  // TODO: click the - button and assert count shows "-1"
});`,
      hints: [
        "`render(<Counter />)` mounts the component into the hidden container.",
        "`screen.getByText('0')` finds an element whose text content is '0'. Check `.toBeTruthy()`.",
        "Find buttons by their label text: `screen.getByText('+')` — then `fireEvent.click(btn)`.",
        "After clicking +, assert `screen.getByText('1')` is truthy.",
      ],
      tests: [
        {
          description: "Counter renders with initial count 0",
          code: `
it("Counter renders initial count of 0", () => {
  render(<Counter />);
  expect(screen.getByText("0")).toBeTruthy();
});`,
        },
        {
          description: "clicking + increments the count",
          code: `
it("clicking + shows count 1", () => {
  render(<Counter />);
  fireEvent.click(screen.getByText("+"));
  expect(screen.getByText("1")).toBeTruthy();
});`,
        },
        {
          description: "clicking - decrements the count",
          code: `
it("clicking - shows count -1", () => {
  render(<Counter />);
  fireEvent.click(screen.getByText("-"));
  expect(screen.getByText("-1")).toBeTruthy();
});`,
        },
        {
          description: "multiple clicks accumulate",
          code: `
it("three + clicks shows count 3", () => {
  render(<Counter />);
  const btn = screen.getByText("+");
  fireEvent.click(btn);
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(screen.getByText("3")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "test-todo-list",
      topicId: "testing",
      title: "Write tests for a TodoList component",
      difficulty: "medium",
      description:
        "A `TodoList` component is provided. Write tests that cover: the empty state message, adding a new item via the input and button, and the item count updating. Use `fireEvent.change` to type into the input and `fireEvent.click` to submit.",
      concepts: ["fireEvent.change", "fireEvent.click", "screen.queryByText", "form interaction"],
      starterCode: `// Given component — do not modify
function TodoList() {
  const [items, setItems] = React.useState([]);
  const [input, setInput] = React.useState("");

  function add() {
    if (!input.trim()) return;
    setItems(prev => [...prev, input.trim()]);
    setInput("");
  }

  return (
    <div>
      <p>{items.length === 0 ? "No tasks yet" : \`\${items.length} task(s)\`}</p>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="New task"
      />
      <button onClick={add}>Add</button>
      <ul>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

// ─── Write your tests below ──────────────────────────────

it("shows empty state message initially", () => {
  render(<TodoList />);
  // TODO: assert "No tasks yet" is visible
});

it("adds an item when input is filled and Add is clicked", () => {
  render(<TodoList />);
  // TODO: type "Buy milk" into the input, click Add, assert "Buy milk" appears
});

it("updates the task count after adding an item", () => {
  render(<TodoList />);
  // TODO: add an item and assert count shows "1 task(s)"
});`,
      hints: [
        "Type into the input: `fireEvent.change(input, { target: { value: 'Buy milk' } })`.",
        "Find the input: `screen.getByRole('input')` won't work — use `screen.getByText` on button + traverse, or use the placeholder. In our runner, `_container.querySelector('input')` works if you assign it.",
        "After clicking Add, `screen.getByText('Buy milk')` should find the new list item.",
        "After adding 1 item, `screen.getByText('1 task(s)')` replaces 'No tasks yet'.",
      ],
      tests: [
        {
          description: "shows 'No tasks yet' on mount",
          code: `
it("shows No tasks yet initially", () => {
  render(<TodoList />);
  expect(screen.getByText("No tasks yet")).toBeTruthy();
});`,
        },
        {
          description: "adding an item renders it in the list",
          code: `
it("renders added item in the list", () => {
  render(<TodoList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "Buy milk" } });
  fireEvent.click(screen.getByText("Add"));
  expect(screen.getByText("Buy milk")).toBeTruthy();
});`,
        },
        {
          description: "count updates after add",
          code: `
it("count shows 1 task(s) after adding", () => {
  render(<TodoList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "Walk dog" } });
  fireEvent.click(screen.getByText("Add"));
  expect(screen.getByText("1 task(s)")).toBeTruthy();
});`,
        },
        {
          description: "empty input does not add item",
          code: `
it("clicking Add with empty input does not add item", () => {
  render(<TodoList />);
  fireEvent.click(screen.getByText("Add"));
  expect(screen.getByText("No tasks yet")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "test-search-filter",
      topicId: "testing",
      title: "Write tests for a SearchFilter component",
      difficulty: "medium",
      description:
        "A `SearchFilter` component renders a list of fruits and filters them as you type. Write tests that verify: all items appear initially, typing filters the list, clearing the input restores all items. Focus on testing behavior from the user's perspective.",
      concepts: ["fireEvent.change", "screen.getAllByText", "screen.queryByText", "behavioral testing"],
      starterCode: `// Given component — do not modify
const FRUITS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry"];

function SearchFilter() {
  const [query, setQuery] = React.useState("");
  const filtered = FRUITS.filter(f =>
    f.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search fruits..."
      />
      <p>{filtered.length} result(s)</p>
      <ul>
        {filtered.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}

// ─── Write your tests below ──────────────────────────────

it("shows all fruits on initial render", () => {
  render(<SearchFilter />);
  // TODO: assert "5 result(s)" is shown
});

it("filters list when user types", () => {
  render(<SearchFilter />);
  // TODO: type "ap" and assert only Apple and Apricot remain visible
  //       (Banana, Blueberry, Cherry should not appear)
});

it("restores full list when query is cleared", () => {
  render(<SearchFilter />);
  // TODO: type "ban", then clear input, assert all 5 results return
});`,
      hints: [
        "Type into the input: `const input = document.querySelector('input'); fireEvent.change(input, { target: { value: 'ap' } })`.",
        "After typing 'ap': `screen.getByText('Apple')` and `screen.getByText('Apricot')` should be truthy.",
        "`screen.queryByText('Banana')` returns null if not found — use `.toBeFalsy()` to assert absence.",
        "Clear the input by setting value to empty string: `fireEvent.change(input, { target: { value: '' } })`.",
      ],
      tests: [
        {
          description: "renders all 5 fruits initially",
          code: `
it("all 5 results shown on mount", () => {
  render(<SearchFilter />);
  expect(screen.getByText("5 result(s)")).toBeTruthy();
});`,
        },
        {
          description: "typing 'ap' shows only Apple and Apricot",
          code: `
it("typing 'ap' filters to Apple and Apricot", () => {
  render(<SearchFilter />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "ap" } });
  expect(screen.getByText("Apple")).toBeTruthy();
  expect(screen.getByText("Apricot")).toBeTruthy();
  expect(screen.queryByText("Banana")).toBeFalsy();
});`,
        },
        {
          description: "clearing input restores all results",
          code: `
it("clearing input restores 5 results", () => {
  render(<SearchFilter />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "ban" } });
  fireEvent.change(input, { target: { value: "" } });
  expect(screen.getByText("5 result(s)")).toBeTruthy();
});`,
        },
        {
          description: "no match shows 0 result(s)",
          code: `
it("no match shows 0 result(s)", () => {
  render(<SearchFilter />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "xyz" } });
  expect(screen.getByText("0 result(s)")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "test-form-validation",
      topicId: "testing",
      title: "Write tests for a form with validation",
      difficulty: "medium",
      description:
        "A login form is provided with required-field validation: empty submit shows an error message, valid input clears the error, and submitting calls `onSubmit` with the value. Write tests for all three behaviors using `fireEvent.change`, `fireEvent.submit`, and `screen.queryByText`.",
      concepts: ["fireEvent.submit", "fireEvent.change", "queryByText", "controlled forms"],
      starterCode: `// Given component — do not modify
function LoginForm({ onSubmit }) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setError("");
    onSubmit(email);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter email"
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}

// ─── Write your tests below ──────────────────────────────

it("shows error when submitted with empty email", () => {
  render(<LoginForm onSubmit={() => {}} />);
  // TODO: submit the form without filling in email, assert error appears
});

it("does not call onSubmit when email is empty", () => {
  let called = false;
  render(<LoginForm onSubmit={() => { called = true; }} />);
  // TODO: submit empty form and assert called is still false
});

it("calls onSubmit with the email value on valid submit", () => {
  let received = null;
  render(<LoginForm onSubmit={(v) => { received = v; }} />);
  // TODO: fill in email, submit, assert received equals the typed email
});`,
      hints: [
        "Submit the form: `fireEvent.submit(document.querySelector('form'))`.",
        "After empty submit: `screen.getByText('Email is required')` should be truthy (or use `getByRole('alert')`).",
        "Fill the email input: `fireEvent.change(document.querySelector('input'), { target: { value: 'a@b.com' } })`.",
        "After valid submit: assert `received === 'a@b.com'` and `screen.queryByText('Email is required')` is falsy.",
      ],
      tests: [
        {
          description: "empty submit shows validation error",
          code: `
it("empty submit shows Email is required", () => {
  render(<LoginForm onSubmit={() => {}} />);
  fireEvent.submit(document.querySelector("form"));
  expect(screen.getByText("Email is required")).toBeTruthy();
});`,
        },
        {
          description: "onSubmit not called when email is empty",
          code: `
it("onSubmit not called with empty email", () => {
  let called = false;
  render(<LoginForm onSubmit={() => { called = true; }} />);
  fireEvent.submit(document.querySelector("form"));
  expect(called).toBe(false);
});`,
        },
        {
          description: "onSubmit called with email value on valid submit",
          code: `
it("onSubmit called with typed email", () => {
  let received = null;
  render(<LoginForm onSubmit={(v) => { received = v; }} />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "user@test.com" } });
  fireEvent.submit(document.querySelector("form"));
  expect(received).toBe("user@test.com");
});`,
        },
        {
          description: "error clears after valid submission",
          code: `
it("error is gone after valid submit", () => {
  render(<LoginForm onSubmit={() => {}} />);
  fireEvent.submit(document.querySelector("form"));
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "a@b.com" } });
  fireEvent.submit(document.querySelector("form"));
  expect(screen.queryByText("Email is required")).toBeFalsy();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
  ],
};

export default topic;
