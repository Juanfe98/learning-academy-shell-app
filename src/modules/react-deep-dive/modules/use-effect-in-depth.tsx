import { InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "the-correct-mental-model", title: "The Correct Mental Model", level: 2 },
  { id: "dependency-array-is-a-contract", title: "The Dependency Array Is a Contract", level: 2 },
  { id: "stale-closures", title: "Stale Closures", level: 2 },
  { id: "cleanup-functions", title: "Cleanup Functions", level: 2 },
  { id: "firing-order", title: "Effect Firing Order", level: 2 },
  { id: "when-not-to-use-useeffect", title: "When NOT to Use useEffect", level: 2 },
  { id: "strict-mode-double-invoke", title: "React 18 Strict Mode Double-Invoke", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Search Form Race Conditions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function UseEffectInDepth() {
  return (
    <div className="article-content">
      <p>
        <code>useEffect</code> is responsible for more bugs, more confusion, and more StackOverflow
        questions than any other React API. The root cause is almost always the same: developers
        mentally model it as &quot;run code after render&quot; and use it as a general-purpose
        lifecycle method. The actual mental model is narrower and more precise — and once you
        internalize it, <code>useEffect</code> becomes dramatically less surprising.
      </p>

      <h2 id="the-correct-mental-model">The Correct Mental Model</h2>

      <p>
        <code>useEffect</code> is for <strong>synchronizing your component with an external system</strong>.
        The external system might be a WebSocket, a third-party library, a timer, a DOM node you
        need to imperatively control, or a browser API like <code>localStorage</code>. The word
        &quot;synchronize&quot; is key: you are expressing a relationship between your React state
        and something outside React, not performing one-off side effects.
      </p>

      <pre><code>{`// Correct use: synchronizing with an external system (a WebSocket)
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    // Set up the external system with current props/state
    const connection = createConnection(roomId);
    connection.connect();

    // Tear down when the dependency changes or component unmounts
    return () => connection.disconnect();
  }, [roomId]);

  return <div>Chat room: {roomId}</div>;
}

// When roomId changes: React runs the cleanup (disconnect from old room),
// then runs the effect again (connect to new room).
// When the component unmounts: React runs the cleanup (disconnect).`}</code></pre>

      <p>
        This model — set up, then clean up — maps to every valid <code>useEffect</code> use
        case. If you cannot identify what you are synchronizing with, and what the cleanup
        would be, that is a signal you probably should not be using <code>useEffect</code>.
      </p>

      <h2 id="dependency-array-is-a-contract">The Dependency Array Is a Contract</h2>

      <p>
        The dependency array is not an optimization — it is a <strong>correctness constraint</strong>.
        It tells React: &quot;re-run this effect whenever any of these values changes.&quot;
        Omitting a value that the effect reads means the effect can run with a stale snapshot of
        that value. The <code>eslint-plugin-react-hooks</code> exhaustive-deps rule exists to
        enforce this contract mechanically.
      </p>

      <pre><code>{`// Bug: roomId is read but not listed as a dependency
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId); // reads roomId
    connection.connect();
    return () => connection.disconnect();
  }, []); // Bug: effect never re-runs when roomId changes!
  // You stay connected to the original room forever.
}

// Fix: list every reactive value the effect depends on
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // Effect re-runs whenever roomId changes ✓
}

// If you find yourself wanting an empty dependency array but the effect
// reads props or state, that is almost always a bug, not an optimization.`}</code></pre>

      <p>
        If a value changes every render but you only want it to trigger the effect on initial
        mount, that is a sign the value should be a ref (see the next module) or you need
        to rethink whether you need an effect at all.
      </p>

      <h2 id="stale-closures">Stale Closures</h2>

      <p>
        The most common <code>useEffect</code> bug is reading a state or prop value from a
        closure that was created in a previous render. The effect&apos;s callback is a function
        created during a specific render — it closes over the state values from <em>that</em>
        render. If you do not include those values in the dependency array, future effect runs
        will use outdated values.
      </p>

      <pre><code>{`// Classic stale closure: polling with an interval
function LiveScore({ matchId }: { matchId: string }) {
  const [score, setScore] = useState(0);
  const [pollInterval, setPollInterval] = useState(5000);

  useEffect(() => {
    // pollInterval is read here — but NOT in the dependency array.
    // The closure captures pollInterval = 5000 forever.
    const timer = setInterval(async () => {
      const latest = await fetchScore(matchId);
      setScore(latest);
    }, pollInterval); // Uses stale pollInterval!

    return () => clearInterval(timer);
  }, [matchId]); // Bug: pollInterval missing from deps
}

// Fix: add pollInterval to deps (effect re-creates the interval when it changes)
useEffect(() => {
  const timer = setInterval(async () => {
    const latest = await fetchScore(matchId);
    setScore(latest);
  }, pollInterval);
  return () => clearInterval(timer);
}, [matchId, pollInterval]); // ✓

// Alternative: use a ref for the callback to avoid re-creating the interval
function usePollEffect(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback; // always up to date
  });

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]); // interval only re-creates when delay changes
}`}</code></pre>

      <h2 id="cleanup-functions">Cleanup Functions</h2>

      <p>
        Every <code>useEffect</code> that sets up an external subscription, timer, or listener
        must return a cleanup function. React calls this cleanup before running the effect again
        (when dependencies change) and when the component unmounts. Missing cleanup causes
        memory leaks, duplicate subscriptions, and stale callbacks firing after unmount.
      </p>

      <pre><code>{`// Memory leak: event listener added on every render, never removed
function ResizablePanel() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    // Missing cleanup! Each render adds another listener.
  });
}

// Correct: cleanup removes the exact listener that was added
function ResizablePanel() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Only runs on mount/unmount ✓
}

// Cleanup is also critical for async operations to prevent state updates
// on unmounted components:
useEffect(() => {
  let cancelled = false;

  fetchUser(userId).then(user => {
    if (!cancelled) setUser(user); // Guard: only update if still mounted
  });

  return () => { cancelled = true; };
}, [userId]);`}</code></pre>

      <h2 id="firing-order">Effect Firing Order</h2>

      <p>
        Understanding when effects fire relative to the render cycle prevents a whole class of
        timing bugs. The sequence on initial mount is: (1) React renders your component,
        (2) React commits changes to the DOM, (3) the browser paints, (4) React fires
        <code>useEffect</code> callbacks. On updates with dependency changes, React runs the
        previous render&apos;s cleanup first, then runs the new effect.
      </p>

      <pre><code>{`function SequenceDemo() {
  const [count, setCount] = useState(0);

  // useLayoutEffect fires synchronously after DOM mutations, before paint.
  // Use for measurements and imperative DOM corrections.
  useLayoutEffect(() => {
    console.log("2. useLayoutEffect — DOM is updated, browser hasn't painted");
    return () => console.log("4. useLayoutEffect cleanup (before next effect)");
  }, [count]);

  // useEffect fires asynchronously after paint.
  useEffect(() => {
    console.log("3. useEffect — browser has painted");
    return () => console.log("5. useEffect cleanup (before next effect)");
  }, [count]);

  console.log("1. Render phase");

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// On first click, console output order:
// 1. Render phase (new render)
// 4. useLayoutEffect cleanup (previous effect cleaned up)
// 5. useEffect cleanup (previous effect cleaned up)
// 2. useLayoutEffect (new effect)
// 3. useEffect (new effect)`}</code></pre>

      <h2 id="when-not-to-use-useeffect">When NOT to Use useEffect</h2>

      <p>
        React&apos;s documentation explicitly calls out two patterns where developers
        reach for <code>useEffect</code> but should not:
      </p>

      <p>
        <strong>Event-driven side effects.</strong> If something should happen because of a user
        action (a button click, a form submission), put the logic in the event handler. Effects
        fire after every render that changes dependencies — they are not the right place for
        &quot;run once because the user clicked.&quot;
      </p>

      <p>
        <strong>Derived state computation.</strong> If you compute a value from props or state
        inside an effect and then <code>setState</code> the result, you are creating an extra
        render cycle for no reason. Compute the value inline during render instead.
      </p>

      <pre><code>{`// WRONG: using useEffect to set derived state
function ProductList({ products, searchQuery }: Props) {
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    setFilteredProducts(
      products.filter(p => p.name.includes(searchQuery))
    );
  }, [products, searchQuery]);
  // This creates an extra render cycle: render → effect → setState → render

  return <ul>{filteredProducts.map(...)}</ul>;
}

// CORRECT: compute during render
function ProductList({ products, searchQuery }: Props) {
  // No extra state, no extra render cycle — just computation.
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return <ul>{filteredProducts.map(...)}</ul>;
}

// WRONG: using useEffect to notify parent of state changes
function Toggle({ onChange }: { onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    onChange(on); // Triggers another render in the parent — wasteful
  }, [on, onChange]);

  return <button onClick={() => setOn(v => !v)}>Toggle</button>;
}

// CORRECT: call onChange in the event handler
function Toggle({ onChange }: { onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(false);

  function handleClick() {
    const next = !on;
    setOn(next);
    onChange(next); // Call directly — no extra render cycle
  }

  return <button onClick={handleClick}>Toggle</button>;
}`}</code></pre>

      <h2 id="strict-mode-double-invoke">React 18 Strict Mode Double-Invoke</h2>

      <p>
        In React 18 development mode, <code>StrictMode</code> intentionally mounts components
        twice: mount → unmount → mount. Effects are run, cleaned up, and run again. This is not
        a bug — it is a lint tool. The purpose is to surface effects that break when run twice,
        which indicates they are not properly cleaning up or that they rely on side effects that
        should not happen during setup.
      </p>

      <pre><code>{`// This effect BREAKS under Strict Mode double-invoke:
useEffect(() => {
  const dialog = document.querySelector(".modal");
  dialog.showModal(); // called twice → error: dialog is already open
}, []);

// Fix: check state before calling imperative APIs
useEffect(() => {
  const dialog = document.querySelector(".modal");
  if (!dialog.open) dialog.showModal();
}, []);

// This effect IS resilient under double-invoke (the correct pattern):
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
  return () => connection.disconnect(); // cleanup disconnects before second mount
}, [roomId]);
// On Strict Mode double-invoke:
// connect → disconnect → connect  (ends in a connected state — correct)

// The golden rule: if your effect's net result after
// "run, cleanup, run" is different from "run" alone, you have a cleanup bug.`}</code></pre>

      <h2 id="interview-challenge">Interview Challenge: Search Form Race Conditions</h2>

      <InterviewChallenge
        title="Debounced Search + URL Sync"
        scenario={
          <>
            A marketplace search page has a debounced text input, category filters, a sort
            dropdown, URL query-string synchronization, and server-backed results. Users report
            flickering results, stale data replacing fresh data, and warnings about updates after
            navigation. The existing code has one large <code>useEffect</code> that debounces the
            input, pushes the URL, fires the fetch, and writes results into component state.
          </>
        }
        tasks={[
          "Split the responsibilities in this feature so each effect describes one synchronization relationship instead of one giant lifecycle blob.",
          "Explain how you would prevent stale requests from overwriting fresh ones when the user types quickly or navigates away mid-request.",
          "Decide what belongs in event handlers, what belongs in effects, and what can be derived from existing state during render.",
          "Use Strict Mode double-invoke to explain how you would prove the solution cleans up timers, aborts requests, and avoids duplicate subscriptions.",
        ]}
        pitfalls={[
          "Combining debounce timers, fetch requests, URL synchronization, and derived filtering in one effect.",
          "Ignoring AbortController or an equivalent cancellation path for in-flight requests.",
          "Silencing the exhaustive-deps lint rule instead of fixing the closure problem.",
        ]}
        signal="Great answers isolate the debounce, the URL sync, and the request lifecycle into separate setup/cleanup flows, use cancellation so stale work cannot commit, and keep pure derivation out of effects entirely."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>useEffect</code> synchronizes with external systems — not a lifecycle replacement</li>
        <li>The dependency array is a correctness contract, not an optimization knob</li>
        <li>Stale closures happen when you read state/props inside an effect but omit them from deps</li>
        <li>Every subscription, timer, or listener must have a corresponding cleanup return</li>
        <li><code>useLayoutEffect</code> fires synchronously after DOM mutations; <code>useEffect</code> fires after paint</li>
        <li>Do not derive state in effects — compute during render</li>
        <li>Do not put event-driven logic in effects — it belongs in event handlers</li>
        <li>Strict Mode double-invoke is a test: if your effect breaks, your cleanup is incomplete</li>
      </ul>

      <p>
        The next module covers <strong>useRef, useMemo, and useCallback</strong> — three hooks
        that each solve a specific problem with the render model, and whose misuse is responsible
        for some of React&apos;s worst performance anti-patterns.
      </p>
    </div>
  );
}
