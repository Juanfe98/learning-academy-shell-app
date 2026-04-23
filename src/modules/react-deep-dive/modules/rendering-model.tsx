import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-a-render", title: "What Is a Render?", level: 2 },
  { id: "virtual-dom-and-reconciliation", title: "Virtual DOM & Reconciliation", level: 2 },
  { id: "fiber-architecture", title: "The Fiber Architecture", level: 2 },
  { id: "render-phase-vs-commit-phase", title: "Render Phase vs Commit Phase", level: 2 },
  { id: "batching-in-react-18", title: "Batching in React 18", level: 2 },
  { id: "keys-and-reconciliation", title: "Keys and Their Role in Reconciliation", level: 2 },
  { id: "common-misconceptions", title: "Common Misconceptions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RenderingModel() {
  return (
    <div className="article-content">
      <p>
        Most React developers know how to write components. Far fewer understand what actually
        happens when those components run. React&apos;s rendering model is the engine under the
        hood — the mental model that explains why your app re-renders when it does, why certain
        optimizations work, and why others are cargo-culted noise. This module builds that model
        from first principles.
      </p>

      <h2 id="what-is-a-render">What Is a Render?</h2>

      <p>
        A <strong>render</strong> in React means React calling your component function. That is
        the entirety of it. When React renders <code>UserCard</code>, it calls the
        <code>UserCard</code> function, passes it props, and receives JSX in return. React uses
        that JSX to figure out what the DOM should look like — but calling your function and
        updating the DOM are two completely separate steps.
      </p>

      <p>
        React decides to render a component in three situations: (1) it is the initial render,
        (2) its own state changes, or (3) its parent re-rendered and passed it new props (or
        even the same props — React re-renders children by default on every parent render unless
        you opt out with <code>React.memo</code>).
      </p>

      <pre><code>{`// React calls this function on every render
function UserCard({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState(false);

  // This entire function body runs on every render.
  // Computing derived values here is fine — it's just a function call.
  const initials = userId.slice(0, 2).toUpperCase();

  return (
    <div>
      <span>{initials}</span>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}

// If the parent re-renders, UserCard re-renders too — even if userId didn't change.
// This is the default behavior. React.memo can prevent this.
const MemoizedUserCard = React.memo(UserCard);`}</code></pre>

      <h2 id="virtual-dom-and-reconciliation">Virtual DOM & Reconciliation</h2>

      <p>
        React does not modify the real DOM on every render. Instead, each render produces a
        lightweight description of what the UI should look like — a tree of plain JavaScript
        objects called the <strong>virtual DOM</strong>. React then compares this new tree
        against the previous one in a process called <strong>reconciliation</strong>. Only the
        differences are applied to the real DOM.
      </p>

      <p>
        This diffing algorithm makes a key assumption to stay efficient: it compares nodes at
        the same position in the tree. If a node&apos;s type changes at a given position (e.g.,
        a <code>&lt;div&gt;</code> becomes a <code>&lt;span&gt;</code>), React destroys the old
        subtree entirely and builds a fresh one. It does not try to reuse children from a
        destroyed parent.
      </p>

      <pre><code>{`// When condition flips, React destroys the <Input> subtree and
// creates a fresh one. The input loses its DOM state (focus, scroll position).
function SearchPanel({ isAdvanced }: { isAdvanced: boolean }) {
  return (
    <div>
      {isAdvanced ? (
        <div className="advanced">
          <Input placeholder="Advanced search..." />
        </div>
      ) : (
        <section className="simple">
          <Input placeholder="Search..." />
        </section>
      )}
    </div>
  );
}

// If you want both inputs to persist, render both and hide one with CSS.
// Or give them the same position in the tree so React reuses the node.`}</code></pre>

      <h2 id="fiber-architecture">The Fiber Architecture</h2>

      <p>
        Before React 16, reconciliation was a synchronous, recursive walk of the component tree.
        Once started, it could not be interrupted — long render trees could block the main thread
        for hundreds of milliseconds, causing dropped frames and unresponsive UIs.
      </p>

      <p>
        <strong>Fiber</strong> is the complete rewrite that shipped in React 16. Each component
        in your tree corresponds to a <em>fiber</em> — a JavaScript object that tracks the
        component&apos;s type, props, state, and its relationships to parent, child, and sibling
        fibers. The fiber tree is a linked list, not a call stack, which means React can pause
        work on one fiber, yield control back to the browser, and resume later.
      </p>

      <p>
        You do not write Fiber code directly. But understanding that React maintains a mutable
        fiber tree explains why hooks work the way they do — each hook&apos;s state is stored on
        the fiber, not in the component function. The function is just a recipe; the fiber is
        where the actual state lives.
      </p>

      <pre><code>{`// Conceptually, a fiber looks like this (massively simplified):
// {
//   type: UserCard,          // the component function or "div", "span", etc.
//   key: null,
//   pendingProps: { userId: "123" },
//   memoizedProps: { userId: "123" },
//   memoizedState: { ... }, // linked list of hook states
//   return: <parent fiber>,
//   child: <first child fiber>,
//   sibling: <next sibling fiber>,
// }
//
// useState's state is stored in memoizedState on this fiber.
// That's why hooks must be called in the same order every render —
// React walks the linked list positionally to find each hook's state.`}</code></pre>

      <h2 id="render-phase-vs-commit-phase">Render Phase vs Commit Phase</h2>

      <p>
        React&apos;s work is divided into two distinct phases, and understanding which phase
        you are in has real consequences for how you write code.
      </p>

      <p>
        The <strong>render phase</strong> is pure computation. React calls your component
        functions, runs your hooks, and builds the new fiber tree. This phase is allowed to be
        interrupted, retried, or even discarded — React may run it multiple times without
        committing the result. This is why React 18 Strict Mode double-invokes render-phase
        logic in development: to surface side effects that incorrectly assume single execution.
      </p>

      <p>
        The <strong>commit phase</strong> is when React applies the calculated changes to the
        real DOM. This phase runs synchronously and cannot be interrupted. It is divided into
        three sub-phases: before mutation (snapshot capture), mutation (DOM updates), and layout
        (<code>useLayoutEffect</code> fires here). After the browser paints, React fires
        <code>useEffect</code> callbacks.
      </p>

      <pre><code>{`// Render phase: pure, may run multiple times — NO side effects here
function ProductList({ categoryId }: { categoryId: string }) {
  // This runs during the render phase — keep it pure.
  const filtered = products.filter(p => p.categoryId === categoryId);
  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// useLayoutEffect fires synchronously after DOM mutations, before paint.
// Use for reading layout measurements and synchronously applying corrections.
function Tooltip({ anchorRef }: { anchorRef: React.RefObject<HTMLElement> }) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    // Measure and reposition before the browser paints — no flicker.
    const { bottom } = anchor.getBoundingClientRect();
    tooltip.style.top = \`\${bottom + 8}px\`;
  });

  return <div ref={tooltipRef} className="tooltip" />;
}`}</code></pre>

      <h2 id="batching-in-react-18">Batching in React 18</h2>

      <p>
        React has always batched state updates that occur inside React event handlers — multiple
        <code>setState</code> calls in one click handler result in one re-render, not multiple.
        But before React 18, updates inside <code>setTimeout</code>, Promises, or native event
        listeners were <em>not</em> batched. Each update triggered its own render.
      </p>

      <p>
        React 18 introduced <strong>automatic batching</strong>: all state updates are batched
        regardless of where they originate. This is a silent performance improvement that reduces
        re-renders in async code. On the rare occasion you need to force synchronous flushing,
        use <code>flushSync</code> from <code>react-dom</code>.
      </p>

      <pre><code>{`import { flushSync } from "react-dom";

function handleAsyncAction() {
  // React 18: both updates batched — ONE re-render
  fetchUserData().then(() => {
    setUser(newUser);
    setLoading(false);
  });
}

// Before React 18, the above triggered TWO re-renders.
// fetchUserData().then(() => {
//   setUser(newUser);   // re-render 1
//   setLoading(false);  // re-render 2
// });

// flushSync opts out of batching when you need the DOM updated immediately
function handleCriticalUpdate() {
  flushSync(() => {
    setHighPriorityState(newValue); // DOM updated synchronously here
  });
  // You can safely read the DOM here — it reflects the new state
  const element = document.getElementById("target");
}`}</code></pre>

      <h2 id="keys-and-reconciliation">Keys and Their Role in Reconciliation</h2>

      <p>
        When React renders a list, it needs to track which item corresponds to which fiber
        across renders. Without keys, React matches items by their position in the array. This
        causes bugs when items are reordered: React reuses the fiber at position 0 for whatever
        is now at position 0, regardless of whether it&apos;s the same item.
      </p>

      <p>
        Keys tell React the item&apos;s <em>identity</em> independently of its position. When
        a keyed item moves from position 2 to position 0, React moves its fiber and preserves
        its state. When a keyed item disappears, React destroys its fiber and unmounts it cleanly.
      </p>

      <pre><code>{`// WITHOUT keys — React matches by position
// If items reorder, the wrong state stays attached to the wrong item
function BadList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li>  {/* No key — position-based matching */}
          <ItemRow item={item} />
        </li>
      ))}
    </ul>
  );
}

// WITH stable keys — React matches by identity
function GoodList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>  {/* Stable, unique ID */}
          <ItemRow item={item} />
        </li>
      ))}
    </ul>
  );
}

// ANTI-PATTERN: using array index as key
// Fine when the list is static. Breaks when items are added, removed, or reordered.
items.map((item, index) => <li key={index}>{item.name}</li>)

// ADVANCED: using key to force a component reset
// Changing the key destroys the old fiber and creates a fresh one.
// This is the idiomatic way to reset uncontrolled component state.
<ProfileForm key={userId} userId={userId} />`}</code></pre>

      <h2 id="common-misconceptions">Common Misconceptions</h2>

      <p>
        <strong>Misconception: &quot;Re-render means DOM update.&quot;</strong> This is false.
        Re-render means React called your component function again. Whether the DOM actually
        changes depends entirely on whether reconciliation finds any differences. A component
        can re-render dozens of times while the DOM remains completely unchanged.
      </p>

      <p>
        <strong>Misconception: &quot;Re-renders are expensive.&quot;</strong> Calling a pure
        component function is a fraction of a millisecond. The expense comes from large subtrees,
        heavy computation inside render, or actual DOM mutations. Optimize the right thing —
        reach for a profiler before reaching for <code>React.memo</code>.
      </p>

      <p>
        <strong>Misconception: &quot;Wrapping everything in React.memo improves performance.&quot;</strong>
        <code>React.memo</code> adds cost: React must shallow-compare every prop on every render
        to decide whether to skip re-rendering. If your component is cheap and its parents do not
        re-render often, <code>React.memo</code> adds overhead rather than removing it.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>A render is just React calling your component function — separate from any DOM update</li>
        <li>Reconciliation diffs virtual DOM trees to compute the minimal set of DOM mutations</li>
        <li>The fiber architecture stores component state outside the function — hooks walk a linked list per fiber</li>
        <li>The render phase is pure and interruptible; the commit phase is synchronous and observable</li>
        <li>React 18 automatically batches all state updates — async updates now also trigger single re-renders</li>
        <li>Keys give list items a stable identity that persists across reorders and array mutations</li>
        <li>Re-renders are not DOM updates; they are cheap function calls that <em>may</em> result in DOM updates</li>
      </ul>

      <p>
        Now that you understand how React decides <em>what</em> to render, the next module
        examines <strong>state</strong> — specifically what <code>useState</code> actually stores,
        why state updates appear asynchronous, and when to reach for <code>useReducer</code> instead.
      </p>
    </div>
  );
}
