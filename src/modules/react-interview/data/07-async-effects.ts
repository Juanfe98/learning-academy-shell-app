import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "async-effects",
  title: "Async & Effects",
  icon: "⏳",
  description: "Tame side effects: cleanup, AbortController, race conditions, optimistic UI.",
  accentColor: "#f97316",
  challenges: [
    {
      id: "cleanup-interval",
      topicId: "async-effects",
      title: "Fix a component that causes a memory leak (setInterval not cleared)",
      difficulty: "easy",
      description:
        "The `Clock` component starts a `setInterval` in `useEffect` but never clears it. When the component unmounts the interval keeps running and tries to call `setState` on an unmounted component — a classic memory leak. Return a cleanup function that clears the interval.",
      concepts: ["useEffect cleanup", "setInterval", "memory leaks"],
      starterCode: `function Clock() {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    // TODO: return a cleanup function
  }, []);

  return <p>Time: {time}</p>;
}

function App() {
  const [show, setShow] = React.useState(true);
  return (
    <div>
      <button onClick={() => setShow(v => !v)}>Toggle Clock</button>
      {show && <Clock />}
    </div>
  );
}

export default App;`,
      hints: [
        "Effects can return a cleanup function that React calls when the component unmounts or before the effect re-runs.",
        "Return `() => clearInterval(id)` from the effect.",
        "This ensures the interval is cleared when `Clock` unmounts (e.g. when Toggle is clicked).",
      ],
      tests: [
        {
          description: "renders the clock time",
          code: `
it("renders a time string", () => {
  render(<App />);
  expect(screen.getByText(/Time:/)).toBeTruthy();
});`,
        },
        {
          description: "toggle button shows and hides the clock",
          code: `
it("toggle button hides the clock", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Toggle Clock"));
  expect(screen.queryByText(/Time:/)).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 5,
    },
    {
      id: "abort-fetch",
      topicId: "async-effects",
      title: "Cancel a fetch request on component unmount using AbortController",
      difficulty: "medium",
      description:
        "The `UserProfile` component fetches user data in `useEffect`, but if the component unmounts before the fetch completes, it will try to call `setState` on an unmounted component. Use `AbortController` to cancel the in-flight fetch on cleanup.",
      concepts: ["AbortController", "useEffect cleanup", "fetch", "memory leaks"],
      starterCode: `function UserProfile({ userId }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`)
      .then(r => r.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") setLoading(false);
      });
    // TODO: return cleanup that aborts the fetch
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  return <p>{user?.name}</p>;
}

export default function App() {
  const [id, setId] = React.useState(1);
  return (
    <div>
      <UserProfile userId={id} />
      <button onClick={() => setId(i => i + 1)}>Next</button>
    </div>
  );
}`,
      hints: [
        "Create an `AbortController` at the top of the effect: `const controller = new AbortController()`.",
        "Pass the signal to fetch: `fetch(url, { signal: controller.signal })`.",
        "Return a cleanup: `return () => controller.abort()`.",
      ],
      tests: [
        {
          description: "shows loading state initially",
          code: `
it("shows loading initially", () => {
  render(<App />);
  expect(screen.getByText("Loading...")).toBeTruthy();
});`,
        },
        {
          description: "Next button renders",
          code: `
it("Next button renders", () => {
  render(<App />);
  expect(screen.getByText("Next")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "fix-race-condition",
      topicId: "async-effects",
      title: "Fix a useEffect data fetch that shows stale results on fast typing",
      difficulty: "medium",
      description:
        "The `SearchResults` component fetches results as the user types. If the user types quickly, a slower earlier response can arrive after a faster later one — showing stale results. Fix the race condition using an `ignore` flag or `AbortController`.",
      concepts: ["race conditions", "useEffect cleanup", "AbortController", "async"],
      starterCode: `function SearchResults({ query }) {
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query) { setResults([]); return; }
    setLoading(true);
    fetch(\`https://jsonplaceholder.typicode.com/posts?title_like=\${query}\`)
      .then(r => r.json())
      .then(data => {
        setResults(data);  // BUG: stale response may arrive after newer one
        setLoading(false);
      });
    // TODO: fix the race condition
  }, [query]);

  return (
    <div>
      {loading && <p>Searching...</p>}
      <ul>{results.slice(0, 5).map(r => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}

export default function App() {
  const [q, setQ] = React.useState("");
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search posts..." />
      <SearchResults query={q} />
    </div>
  );
}`,
      hints: [
        "Use an `ignore` flag: `let ignore = false`. In `.then()`, check `if (!ignore) setResults(data)`. In cleanup, `return () => { ignore = true }`.",
        "When `query` changes, React runs the old effect's cleanup (setting `ignore = true`) before starting the new effect.",
        "This means stale responses are silently dropped without needing to abort the network request.",
      ],
      tests: [
        {
          description: "renders the search input",
          code: `
it("renders the search input", () => {
  render(<App />);
  expect(document.querySelector("input")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "optimistic-update",
      topicId: "async-effects",
      title: "Implement optimistic UI: update state immediately, rollback on error",
      difficulty: "hard",
      description:
        "The `TodoList` component has a 'like' button. Currently it waits for the server before updating the UI. Implement optimistic updates: immediately update the like count in state, then rollback to the previous value if the server call fails.",
      concepts: ["optimistic UI", "useState", "async/await", "error handling", "rollback"],
      starterCode: `function TodoList() {
  const [todos, setTodos] = React.useState([
    { id: 1, title: "Buy groceries", likes: 3 },
    { id: 2, title: "Walk the dog", likes: 1 },
  ]);

  async function likeTodo(id) {
    // Simulate API call — fails 30% of the time
    const success = Math.random() > 0.3;
    await new Promise(r => setTimeout(r, 500));
    if (!success) throw new Error("Server error");
    // TODO: implement optimistic update with rollback on failure
  }

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.title}
          <button onClick={() => likeTodo(todo.id)}>
            ❤️ {todo.likes}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default TodoList;`,
      hints: [
        "Before the API call, save the current state: `const previousTodos = todos`. Then immediately call `setTodos(...)` to increment the like count.",
        "In the `catch` block, call `setTodos(previousTodos)` to roll back.",
        "Closure captures `todos` at the time `likeTodo` is called — you can safely use it as the rollback snapshot.",
      ],
      tests: [
        {
          description: "renders todos with like buttons",
          code: `
it("renders todos with like counts", () => {
  render(<TodoList />);
  expect(screen.getByText("Buy groceries")).toBeTruthy();
  expect(screen.getByText(/❤️ 3/)).toBeTruthy();
});`,
        },
        {
          description: "like button is clickable",
          code: `
it("like button is clickable", () => {
  render(<TodoList />);
  const btn = screen.getByText(/❤️ 3/);
  fireEvent.click(btn);
  // Optimistically increments to 4
  expect(screen.getByText(/❤️ 4/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
