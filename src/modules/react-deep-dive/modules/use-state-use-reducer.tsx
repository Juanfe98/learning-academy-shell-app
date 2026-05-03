import { InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "state-is-a-snapshot", title: "State Is a Snapshot, Not a Live Variable", level: 2 },
  { id: "why-updates-look-async", title: "Why State Updates Look Asynchronous", level: 2 },
  { id: "functional-updater-pattern", title: "The Functional Updater Pattern", level: 2 },
  { id: "batching-behavior", title: "Batching Behavior in React 18 vs 17", level: 2 },
  { id: "use-reducer", title: "useReducer: When and Why", level: 2 },
  { id: "designing-state-shape", title: "Designing State Shape", level: 2 },
  { id: "derived-vs-redundant-state", title: "Derived State vs Redundant State", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Editable Table + Bulk Actions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function UseStateUseReducer() {
  return (
    <div className="article-content">
      <p>
        <code>useState</code> looks simple: you call it, you get a value and a setter. But the
        mental model most developers carry — that state is a mutable variable you can update at
        any time — is wrong, and that wrong model is the root cause of some of the most common
        and confusing React bugs. This module corrects that model and shows you when to reach
        for <code>useReducer</code> instead.
      </p>

      <h2 id="state-is-a-snapshot">State Is a Snapshot, Not a Live Variable</h2>

      <p>
        Each render has its own version of state. When React calls your component function, it
        passes in the <em>current</em> state values as if they were constants — frozen for the
        duration of that render. Event handlers and effects that close over state capture the
        value of state <em>at the time the render occurred</em>, not the latest value.
      </p>

      <pre><code>{`function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    // count here is captured from this render's snapshot.
    // If count is 0 when this render happened, it will always be 0
    // inside this specific handleClick — even if you call setCount first.
    console.log(count);  // always logs the render's snapshot value
    setCount(count + 1);
    console.log(count);  // STILL logs the snapshot value — not the new state!
  }

  return <button onClick={handleClick}>{count}</button>;
}

// This is the snapshot problem made explicit:
function MultipleUpdates() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1); // setCount(0 + 1) — schedules update to 1
    setCount(count + 1); // setCount(0 + 1) — schedules update to 1 AGAIN
    setCount(count + 1); // setCount(0 + 1) — still 1, not 3!
    // After render: count === 1, not 3
  }

  return <button onClick={handleClick}>{count}</button>;
}`}</code></pre>

      <h2 id="why-updates-look-async">Why State Updates Look Asynchronous</h2>

      <p>
        When you call <code>setCount(1)</code>, React does not immediately mutate the state.
        Instead, it schedules a re-render. The component function will be called again on the
        next render cycle, and <em>that</em> call will see the new state value. The current
        execution continues with the old snapshot.
      </p>

      <p>
        This is intentional. If state were mutable mid-render, you could read different values
        from the same variable in the same render, making UI output non-deterministic. By
        treating each render as a pure snapshot, React can safely retry renders, batch updates,
        and defer work without consistency issues.
      </p>

      <pre><code>{`// Demonstrating the snapshot behavior with async code
function SearchBox() {
  const [query, setQuery] = useState("");

  async function handleSearch() {
    setQuery("react hooks");   // schedules a re-render

    await performSearch("react hooks");

    // After the await, we're in a closure that captured the OLD query ("").
    // Even though the UI shows "react hooks", this alert will show "".
    alert("Searched for: " + query);  // "" — stale closure!
  }

  // Solution: use a ref for values you need to read after async operations,
  // or read from the function argument rather than closing over state.
}`}</code></pre>

      <h2 id="functional-updater-pattern">The Functional Updater Pattern</h2>

      <p>
        The functional updater form — <code>setState(prev =&gt; nextValue)</code> — solves the
        stale snapshot problem. Instead of reading the current state from the closure, you pass
        a function that React calls with the <em>most recent</em> state as its argument. React
        queues these updater functions and applies them in order, using each result as the input
        for the next.
      </p>

      <pre><code>{`function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    // Functional updater: React passes the latest state to each call.
    // These are queued and applied sequentially.
    setCount(prev => prev + 1); // queues: 0 -> 1
    setCount(prev => prev + 1); // queues: 1 -> 2
    setCount(prev => prev + 1); // queues: 2 -> 3
    // After render: count === 3 ✓
  }

  return <button onClick={handleClick}>{count}</button>;
}

// When is the functional updater ESSENTIAL?
// 1. Multiple updates in one handler (above)
// 2. Updates inside callbacks that close over stale state
function TodoList() {
  const [todos, setTodos] = useState<string[]>([]);

  const addTodo = useCallback((text: string) => {
    // Without functional updater, this closes over the todos at the time
    // useCallback was last re-created — potentially stale.
    setTodos(prev => [...prev, text]); // always uses the current todos
  }, []); // empty deps is safe here because we use the functional updater

  return <input onBlur={e => addTodo(e.target.value)} />;
}`}</code></pre>

      <h2 id="batching-behavior">Batching Behavior in React 18 vs 17</h2>

      <p>
        React 17 batched updates inside React event handlers, but not inside
        <code>setTimeout</code>, native event listeners, or Promise callbacks. Each
        <code>setState</code> outside a React handler triggered a synchronous re-render.
        React 18 batches everything by default. The practical impact is that async code that
        previously caused two or three re-renders now causes one.
      </p>

      <pre><code>{`// React 17: two separate re-renders
// React 18: one batched re-render
async function loadUser(id: string) {
  const user = await fetchUser(id);
  setUser(user);       // React 17: re-render 1
  setLoading(false);   // React 17: re-render 2
  // React 18: both queued → single re-render
}

// The one exception: flushSync forces synchronous flush
import { flushSync } from "react-dom";

function handleFormSubmit() {
  flushSync(() => setSubmitting(true));
  // DOM is updated here — useful for measuring layout before a transition
  const rect = formRef.current?.getBoundingClientRect();
  animateOut(rect);
}`}</code></pre>

      <h2 id="use-reducer">useReducer: When and Why</h2>

      <p>
        <code>useReducer</code> is not a more complex version of <code>useState</code> — it is
        a different model of state management. Where <code>useState</code> gives you a value and
        a setter, <code>useReducer</code> gives you a value and a dispatch function. All state
        transitions are described as plain action objects, and a pure reducer function determines
        the next state from the current state and the action.
      </p>

      <p>
        Reach for <code>useReducer</code> when: (1) multiple state values always update together,
        (2) the next state depends on the previous in complex ways, (3) you want to centralize
        transition logic and make it testable independently of your component, or (4) you have
        deeply nested state updates that require spread hell with <code>useState</code>.
      </p>

      <pre><code>{`type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

type FetchAction<T> =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: T }
  | { type: "FETCH_ERROR"; message: string }
  | { type: "RESET" };

function fetchReducer<T>(
  state: FetchState<T>,
  action: FetchAction<T>
): FetchState<T> {
  switch (action.type) {
    case "FETCH_START":   return { status: "loading" };
    case "FETCH_SUCCESS": return { status: "success", data: action.payload };
    case "FETCH_ERROR":   return { status: "error", message: action.message };
    case "RESET":         return { status: "idle" };
  }
}

function UserProfile({ userId }: { userId: string }) {
  const [state, dispatch] = useReducer(fetchReducer<User>, { status: "idle" });

  useEffect(() => {
    dispatch({ type: "FETCH_START" });
    fetchUser(userId)
      .then(user => dispatch({ type: "FETCH_SUCCESS", payload: user }))
      .catch(err => dispatch({ type: "FETCH_ERROR", message: err.message }));
  }, [userId]);

  if (state.status === "loading") return <Spinner />;
  if (state.status === "error")   return <ErrorMessage message={state.message} />;
  if (state.status === "success") return <Profile user={state.data} />;
  return <button onClick={() => dispatch({ type: "FETCH_START" })}>Load</button>;
}`}</code></pre>

      <h2 id="designing-state-shape">Designing State Shape</h2>

      <p>
        Poor state shape is one of the primary causes of impossible UI states — states where
        your state variables are technically valid JavaScript but represent a logically impossible
        UI condition (like <code>isLoading: true</code> and <code>isError: true</code>
        simultaneously).
      </p>

      <pre><code>{`// BAD: three booleans that can represent 8 states, but only 3 are valid
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState<User | null>(null);
// isLoading: true AND isError: true is representable but meaningless.

// GOOD: discriminated union — only valid states exist
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

const [request, setRequest] = useState<RequestState<User>>({ status: "idle" });

// TypeScript now enforces correct field access per state:
if (request.status === "error") {
  console.error(request.error.message); // error is only accessible here
}
if (request.status === "success") {
  console.log(request.data.name); // data is only accessible here
}`}</code></pre>

      <h2 id="derived-vs-redundant-state">Derived State vs Redundant State</h2>

      <p>
        Redundant state is state that can be computed from other state or props. Storing it
        creates a synchronization problem: you must remember to update the derived value every
        time its source changes. Forgetting to do so introduces stale state bugs.
      </p>

      <pre><code>{`// REDUNDANT STATE — keeps firstName, lastName, AND fullName in state
function UserForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState(""); // redundant!

  // You must now remember to update fullName whenever either name changes.
  // Forgetting one update path = bug.
}

// DERIVED STATE — compute fullName during render
function UserForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Derived during render — always in sync, no extra state to manage.
  const fullName = \`\${firstName} \${lastName}\`.trim();

  return <input value={fullName} readOnly />;
}

// When is memoizing derived state worth it?
// Only when the computation is genuinely expensive AND inputs change infrequently.
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
// For most string concatenation and filtering: no useMemo needed.`}</code></pre>

      <h2 id="interview-challenge">Interview Challenge: Editable Table + Bulk Actions</h2>

      <InterviewChallenge
        title="Admin Users Table"
        scenario={
          <>
            You are handed a production admin table with server-backed pagination, row selection,
            inline role editing, a search box, and a bulk deactivate action. The current
            implementation stores <code>selectedIds</code>, <code>selectedCount</code>,{" "}
            <code>filteredUsers</code>, <code>isAllSelected</code>, and <code>dirtyRows</code> as
            separate pieces of state. Users report that the selected count drifts, bulk actions
            sometimes include rows that are no longer visible, and unsaved inline edits disappear
            when the page changes.
          </>
        }
        tasks={[
          "Redesign the state shape so the table can support pagination, filtering, selection, and inline edits without synchronization bugs.",
          "Explain which values should be derived during render versus stored, especially for selected counts, visible rows, and 'all selected' logic.",
          "Describe how you would model optimistic row edits so drafts survive refetches and pagination without mutating the original dataset.",
          "Defend whether this UI should stay on useState or move to useReducer, including the action names you would expect to see.",
        ]}
        pitfalls={[
          "Storing filtered arrays in state instead of deriving them from source rows + filters.",
          "Tracking selection by row index rather than a stable row id.",
          "Mutating nested row objects, which breaks React's change detection and makes undo logic painful.",
        ]}
        signal="Strong answers normalize rows by id, keep filter/sort/page controls separate from source data, derive projections like visible rows and counts during render, and use a reducer once events start sounding like business operations instead of simple field changes."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>State is a snapshot per render — event handlers close over the value at render time</li>
        <li>Calling <code>setState</code> schedules a re-render; it does not mutate state in the current render</li>
        <li>The functional updater form <code>setState(prev =&gt; next)</code> always operates on the latest state</li>
        <li>React 18 batches all state updates — async code now causes fewer re-renders than in React 17</li>
        <li>Use <code>useReducer</code> when multiple values update together or transitions are complex enough to test independently</li>
        <li>Model state as discriminated unions to make impossible states unrepresentable</li>
        <li>Compute derived values during render — do not store what you can calculate</li>
      </ul>

      <p>
        With state internals covered, the next module turns to <strong>effects</strong> — the
        most misunderstood hook in React, whose mental model of &quot;run code after render&quot;
        leads to most of the bugs people blame on React.
      </p>
    </div>
  );
}
