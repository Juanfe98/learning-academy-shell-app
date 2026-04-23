import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "hooks",
  title: "Hooks",
  icon: "🪝",
  description: "Master built-in hooks and build your own custom hooks.",
  accentColor: "#8b5cf6",
  challenges: [
    {
      id: "use-debounce",
      topicId: "hooks",
      title: "Build a useDebounce(value, delay) custom hook",
      difficulty: "easy",
      description:
        "Implement a `useDebounce(value, delay)` hook that returns a debounced version of `value`. The returned value should only update after `delay` milliseconds have passed without `value` changing. This is used to avoid firing expensive operations (like API calls) on every keystroke.",
      concepts: ["useEffect", "useRef", "custom hooks", "cleanup"],
      starterCode: `function useDebounce(value, delay) {
  // TODO: implement
}

function SearchBox() {
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 400);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to search..."
      />
      <p>Debounced: {debounced}</p>
    </div>
  );
}

export default SearchBox;`,
      hints: [
        "Store the debounced value in `useState`. Return that state value.",
        "In `useEffect`, set a `setTimeout` to update the state after `delay` ms.",
        "Return a cleanup function that calls `clearTimeout` on the timer — this cancels the pending update when `value` changes before the delay expires.",
      ],
      tests: [
        {
          description: "returns the initial value immediately",
          code: `
it("returns the initial value immediately", () => {
  render(<SearchBox />);
  expect(screen.getByText("Debounced:")).toBeTruthy();
});`,
        },
        {
          description: "input renders and accepts typing",
          code: `
it("input renders and accepts typing", () => {
  render(<SearchBox />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "hello" } });
  expect(input.value).toBe("hello");
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "use-previous",
      topicId: "hooks",
      title: "Build a usePrevious(value) custom hook",
      difficulty: "easy",
      description:
        "Implement a `usePrevious(value)` hook that returns the value from the **previous** render. On the first render it should return `undefined`. This is useful for comparing current vs previous props or state.",
      concepts: ["useRef", "useEffect", "custom hooks"],
      starterCode: `function usePrevious(value) {
  // TODO: implement
}

function Counter() {
  const [count, setCount] = React.useState(0);
  const previous = usePrevious(count);

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {previous ?? "none"}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

export default Counter;`,
      hints: [
        "`useRef` persists a mutable value across renders without causing re-renders.",
        "Store the current value in a ref **after** the component renders (inside `useEffect`).",
        "Return `ref.current` — which holds the value from the previous render cycle.",
      ],
      tests: [
        {
          description: "shows 'none' on first render (previous is undefined)",
          code: `
it("shows 'none' on first render", () => {
  render(<Counter />);
  expect(screen.getByText("Previous: none")).toBeTruthy();
});`,
        },
        {
          description: "shows previous value after increment",
          code: `
it("shows previous value after increment", () => {
  render(<Counter />);
  fireEvent.click(screen.getByText("Increment"));
  expect(screen.getByText("Previous: 0")).toBeTruthy();
  expect(screen.getByText("Current: 1")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "use-local-storage",
      topicId: "hooks",
      title: "Build a useLocalStorage(key, initialValue) hook",
      difficulty: "medium",
      description:
        "Implement `useLocalStorage(key, initialValue)` that works like `useState` but persists the value to `localStorage`. The API should mirror `useState`: returns `[storedValue, setValue]`. On mount, read from storage; fall back to `initialValue` if the key doesn't exist. Calling `setValue` should update both React state and localStorage.",
      concepts: ["useState", "useCallback", "localStorage", "custom hooks"],
      starterCode: `function useLocalStorage(key, initialValue) {
  // TODO: implement
}

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage("theme", "light");

  return (
    <div>
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
        Toggle
      </button>
    </div>
  );
}

export default ThemeToggle;`,
      hints: [
        "Initialize state lazily: pass a function to `useState` so the localStorage read only happens once.",
        "In `setValue`, update both `setState` and `localStorage.setItem(key, JSON.stringify(newValue))`.",
        "Handle the case where `localStorage` doesn't exist (SSR) by wrapping reads in a try/catch.",
      ],
      tests: [
        {
          description: "initializes with default value",
          code: `
it("initializes with default value", () => {
  render(<ThemeToggle />);
  expect(screen.getByText("Theme: light")).toBeTruthy();
});`,
        },
        {
          description: "toggles the value on click",
          code: `
it("toggles the value on click", () => {
  render(<ThemeToggle />);
  fireEvent.click(screen.getByText("Toggle"));
  expect(screen.getByText("Theme: dark")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "fix-stale-closure",
      topicId: "hooks",
      title: "Fix a useEffect with a stale closure bug",
      difficulty: "medium",
      description:
        "The `Timer` component below has a bug: clicking 'Start' begins a 1-second interval, but `count` always stays at 0 in the log because the interval captures a stale closure. Fix it so the interval always logs the current count.",
      concepts: ["useEffect", "useRef", "stale closure", "closures"],
      starterCode: `function Timer() {
  const [count, setCount] = React.useState(0);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      console.log("count:", count); // always logs 0 — stale closure!
      setCount(count + 1);          // also stale
    }, 1000);
    return () => clearInterval(id);
  }, [running]); // missing count in deps — intentional bug

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setRunning(r => !r)}>
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}

export default Timer;`,
      hints: [
        "The effect closure captures `count` from the first render. Subsequent renders don't re-register the interval because `running` hasn't changed.",
        "Fix 1: Use a functional update `setCount(c => c + 1)` so you don't need `count` in the closure at all.",
        "Fix 2 (alternative): Store count in a ref and read from the ref inside the interval.",
      ],
      tests: [
        {
          description: "renders count and start button",
          code: `
it("renders count and start button", () => {
  render(<Timer />);
  expect(screen.getByText("Count: 0")).toBeTruthy();
  expect(screen.getByText("Start")).toBeTruthy();
});`,
        },
        {
          description: "button toggles to Stop when clicked",
          code: `
it("button toggles to Stop when clicked", () => {
  render(<Timer />);
  fireEvent.click(screen.getByText("Start"));
  expect(screen.getByText("Stop")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "use-async",
      topicId: "hooks",
      title: "Build a useAsync(fn) hook: { data, loading, error }",
      difficulty: "medium",
      description:
        "Implement `useAsync(asyncFn, deps)` — a hook that executes an async function and returns `{ data, loading, error }`. It should re-run whenever `deps` change (like `useEffect`). Handle loading state and error state correctly.",
      concepts: ["useEffect", "useState", "async/await", "custom hooks", "error handling"],
      starterCode: `function useAsync(asyncFn, deps = []) {
  // TODO: implement
}

function UserCard({ userId }) {
  const { data, loading, error } = useAsync(
    () => fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`).then(r => r.json()),
    [userId]
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data) return null;
  return <p>Name: {data.name}</p>;
}

export default function App() {
  return <UserCard userId={1} />;
}`,
      hints: [
        "Initialize state: `const [state, setState] = useState({ data: null, loading: true, error: null })`.",
        "In `useEffect`, call the async function, set `loading: true` first, then update with data or error.",
        "Return a cleanup function that sets a `cancelled` flag so you don't call setState after unmount.",
      ],
      tests: [
        {
          description: "shows loading state initially",
          code: `
it("shows loading state initially", () => {
  render(<App />);
  expect(screen.getByText("Loading...")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "use-reducer-cart",
      topicId: "hooks",
      title: "Implement a shopping cart with useReducer",
      difficulty: "hard",
      description:
        "Build a shopping cart using `useReducer`. The cart should support: `ADD_ITEM` (add a product, or increment quantity if it already exists), `REMOVE_ITEM` (remove by productId), `UPDATE_QUANTITY` (set quantity for an item), and `CLEAR_CART`. Expose the cart state and a `dispatch` function via a `useCart` custom hook.",
      concepts: ["useReducer", "useContext", "custom hooks", "immutable state"],
      starterCode: `const initialState = { items: [] };

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      // TODO
    case "REMOVE_ITEM":
      // TODO
    case "UPDATE_QUANTITY":
      // TODO
    case "CLEAR_CART":
      // TODO
    default:
      return state;
  }
}

function useCart() {
  const [cart, dispatch] = React.useReducer(cartReducer, initialState);
  return { cart, dispatch };
}

function CartDemo() {
  const { cart, dispatch } = useCart();
  return (
    <div>
      <button onClick={() => dispatch({ type: "ADD_ITEM", payload: { id: "1", name: "Widget", price: 9.99 } })}>
        Add Widget
      </button>
      <button onClick={() => dispatch({ type: "CLEAR_CART" })}>Clear</button>
      <p>Items: {cart.items.length}</p>
    </div>
  );
}

export default CartDemo;`,
      hints: [
        "For `ADD_ITEM`: check if item exists with `state.items.find(i => i.id === action.payload.id)`. If yes, increment `quantity`. If no, push with `quantity: 1`.",
        "Always return new arrays/objects — never mutate state directly.",
        "For `UPDATE_QUANTITY`: use `state.items.map(item => item.id === id ? {...item, quantity} : item)`.",
      ],
      tests: [
        {
          description: "Add Widget increments item count",
          code: `
it("Add Widget increments item count", () => {
  render(<CartDemo />);
  fireEvent.click(screen.getByText("Add Widget"));
  expect(screen.getByText("Items: 1")).toBeTruthy();
});`,
        },
        {
          description: "Clear resets items to 0",
          code: `
it("Clear resets items to 0", () => {
  render(<CartDemo />);
  fireEvent.click(screen.getByText("Add Widget"));
  fireEvent.click(screen.getByText("Clear"));
  expect(screen.getByText("Items: 0")).toBeTruthy();
});`,
        },
        {
          description: "adding same item twice keeps count at 1",
          code: `
it("adding same item twice keeps item count at 1", () => {
  render(<CartDemo />);
  fireEvent.click(screen.getByText("Add Widget"));
  fireEvent.click(screen.getByText("Add Widget"));
  expect(screen.getByText("Items: 1")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 30,
    },
  ],
};

export default topic;
