import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "error-handling",
  title: "Error Handling",
  icon: "🛡️",
  description: "Error boundaries, async error states, and retry logic.",
  accentColor: "#ef4444",
  challenges: [
    {
      id: "error-boundary",
      topicId: "error-handling",
      title: "Build a class-based ErrorBoundary component with fallback UI",
      difficulty: "easy",
      description:
        "React error boundaries must be class components. Implement `ErrorBoundary` with `static getDerivedStateFromError()` to capture the error and `componentDidCatch()` to log it. When a child throws, render a fallback UI instead of the crashed tree.",
      concepts: ["error boundaries", "getDerivedStateFromError", "componentDidCatch", "class components"],
      starterCode: `class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // TODO: return state that marks an error occurred
  }

  componentDidCatch(error, info) {
    // TODO: log the error
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, border: "1px solid red", borderRadius: 8 }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BrokenComponent({ shouldThrow }) {
  if (shouldThrow) throw new Error("I crashed!");
  return <p>I am fine ✅</p>;
}

function Demo() {
  const [crash, setCrash] = React.useState(false);
  return (
    <div>
      <button onClick={() => setCrash(v => !v)}>Toggle Crash</button>
      <ErrorBoundary>
        <BrokenComponent shouldThrow={crash} />
      </ErrorBoundary>
    </div>
  );
}

export default Demo;`,
      hints: [
        "`getDerivedStateFromError(error)` is a static method — return `{ hasError: true, error }`.",
        "`componentDidCatch(error, info)` receives the error and component stack. Use it for logging.",
        "The 'Try Again' button resets state to `{ hasError: false, error: null }` so the children re-render.",
      ],
      tests: [
        {
          description: "renders children normally when no error",
          code: `
it("renders children when no error", () => {
  render(<Demo />);
  expect(screen.getByText("I am fine ✅")).toBeTruthy();
});`,
        },
        {
          description: "shows fallback UI when child throws",
          code: `
it("shows fallback when child throws", () => {
  render(<Demo />);
  fireEvent.click(screen.getByText("Toggle Crash"));
  expect(screen.getByText("Something went wrong")).toBeTruthy();
  expect(screen.queryByText("I am fine ✅")).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "async-error-state",
      topicId: "error-handling",
      title: "Catch and display errors from an async useEffect fetch",
      difficulty: "easy",
      description:
        "The `PostLoader` component fetches a post but never handles fetch errors. Add an `error` state and display an error message when the fetch fails. Use a `404` URL to trigger a simulated error.",
      concepts: ["async error handling", "useState", "useEffect", "try/catch"],
      starterCode: `function PostLoader({ postId }) {
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(\`https://jsonplaceholder.typicode.com/posts/\${postId}\`)
      .then(r => {
        if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
        return r.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      });
      // TODO: add error handling
  }, [postId]);

  if (loading) return <p>Loading...</p>;
  if (!post) return <p>No post found.</p>;
  return <p>{post.title}</p>;
}

export default function App() {
  return (
    <div>
      <PostLoader postId={1} />
      <PostLoader postId={99999} />
    </div>
  );
}`,
      hints: [
        "Add `const [error, setError] = useState(null)` to track errors.",
        "Chain a `.catch(err => { setError(err); setLoading(false); })` after the `.then()` block.",
        "Render `<p>Error: {error.message}</p>` when `error` is truthy.",
      ],
      tests: [
        {
          description: "shows loading state initially",
          code: `
it("shows loading initially", () => {
  render(<App />);
  const loadingElements = document.querySelectorAll("p");
  expect(loadingElements.length).toBeGreaterThan(0);
});`,
        },
        {
          description: "component renders without crashing",
          code: `
it("component renders without crashing", () => {
  const el = render(<App />);
  expect(el).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "retry-on-error",
      topicId: "error-handling",
      title: "Implement a useRetry(fn, maxAttempts) hook with exponential backoff",
      difficulty: "hard",
      description:
        "Implement `useRetry(asyncFn, maxAttempts)` that calls `asyncFn()`, and on failure retries up to `maxAttempts` times with exponential backoff (delay = `2^attempt * 100ms`). Returns `{ data, loading, error, attempt }`.",
      concepts: ["retry logic", "exponential backoff", "useRef", "custom hooks", "async"],
      starterCode: `function useRetry(asyncFn, maxAttempts = 3) {
  const [state, setState] = React.useState({
    data: null,
    loading: true,
    error: null,
    attempt: 0,
  });

  React.useEffect(() => {
    let cancelled = false;

    async function run(attempt) {
      try {
        // TODO: implement retry with exponential backoff
        const result = await asyncFn();
        if (!cancelled) setState({ data: result, loading: false, error: null, attempt });
      } catch (err) {
        if (attempt < maxAttempts - 1) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise(r => setTimeout(r, delay));
          if (!cancelled) run(attempt + 1);
        } else {
          if (!cancelled) setState({ data: null, loading: false, error: err, attempt });
        }
      }
    }

    run(0);
    return () => { cancelled = true; };
  }, []);

  return state;
}

// Simulates a flaky API that fails the first 2 times
let callCount = 0;
function flakyFetch() {
  callCount++;
  return new Promise((resolve, reject) => {
    if (callCount < 3) reject(new Error(\`Attempt \${callCount} failed\`));
    else resolve({ value: "success" });
  });
}

function RetryDemo() {
  const { data, loading, error, attempt } = useRetry(flakyFetch, 5);

  if (loading) return <p>Loading (attempt {attempt + 1})...</p>;
  if (error) return <p>Failed: {error.message}</p>;
  return <p>Result: {data?.value} (succeeded on attempt {attempt + 1})</p>;
}

export default RetryDemo;`,
      hints: [
        "The recursive `run(attempt)` function already has the right structure. The backoff delay is `2^attempt * 100ms`.",
        "The `cancelled` flag prevents calling `setState` after unmount or after a newer effect run.",
        "On success, store `data` and set `loading: false`. On final failure (attempt >= maxAttempts - 1), store `error`.",
      ],
      tests: [
        {
          description: "shows loading state on mount",
          code: `
it("shows loading state on mount", () => {
  render(<RetryDemo />);
  expect(screen.getByText(/Loading/)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 40,
    },
  ],
};

export default topic;
