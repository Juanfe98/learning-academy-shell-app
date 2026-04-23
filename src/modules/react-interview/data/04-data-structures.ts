import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "data-structures",
  title: "Data Structures",
  icon: "🌲",
  description: "Apply classic data structures — trees, tries, caches — inside React components.",
  accentColor: "#10b981",
  challenges: [
    {
      id: "render-tree",
      topicId: "data-structures",
      title: "Recursively render a nested comment tree from a flat array",
      difficulty: "medium",
      description:
        "Given a flat array of comments with `{ id, parentId, text }`, render them as a nested tree. Comments with `parentId: null` are top-level; others are nested under their parent. Use recursion to render child threads.",
      concepts: ["recursion", "tree rendering", "useMemo", "data transformation"],
      starterCode: `const comments = [
  { id: 1, parentId: null, text: "First top-level comment" },
  { id: 2, parentId: 1,    text: "Reply to first" },
  { id: 3, parentId: 1,    text: "Another reply to first" },
  { id: 4, parentId: null, text: "Second top-level comment" },
  { id: 5, parentId: 2,    text: "Nested reply (level 3)" },
];

function CommentNode({ comment, allComments }) {
  const children = allComments.filter(c => c.parentId === comment.id);
  return (
    <li>
      <p>{comment.text}</p>
      {children.length > 0 && (
        <ul>
          {children.map(child => (
            <CommentNode key={child.id} comment={child} allComments={allComments} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentTree() {
  const roots = comments.filter(c => c.parentId === null);
  return (
    <ul>
      {roots.map(c => (
        <CommentNode key={c.id} comment={c} allComments={comments} />
      ))}
    </ul>
  );
}

export default CommentTree;`,
      hints: [
        "Filter for root comments: `comments.filter(c => c.parentId === null)`.",
        "In `CommentNode`, find children: `allComments.filter(c => c.parentId === comment.id)`.",
        "For performance on large trees, build an index `{ [parentId]: children[] }` with `useMemo` instead of filtering on every render.",
      ],
      tests: [
        {
          description: "renders all 5 comment texts",
          code: `
it("renders all 5 comment texts", () => {
  render(<CommentTree />);
  expect(screen.getByText("First top-level comment")).toBeTruthy();
  expect(screen.getByText("Reply to first")).toBeTruthy();
  expect(screen.getByText("Nested reply (level 3)")).toBeTruthy();
  expect(screen.getByText("Second top-level comment")).toBeTruthy();
});`,
        },
        {
          description: "top-level list has exactly 2 root items",
          code: `
it("top-level list has exactly 2 root items", () => {
  const el = render(<CommentTree />);
  const rootList = el.querySelector("ul");
  expect(rootList.children.length).toBe(2);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "flatten-to-tree",
      topicId: "data-structures",
      title: "Build and render a tree from a flat parentId array",
      difficulty: "medium",
      description:
        "Given `[{id, parentId, label}]`, write a `buildTree(items)` function that converts the flat list into a nested tree `[{id, label, children:[...]}]`. Then render the tree recursively as a `<ul>/<li>` structure.",
      concepts: ["tree building", "recursion", "Map", "useMemo"],
      starterCode: `const flatItems = [
  { id: "root",   parentId: null,   label: "Root" },
  { id: "a",      parentId: "root", label: "A" },
  { id: "b",      parentId: "root", label: "B" },
  { id: "a1",     parentId: "a",    label: "A1" },
  { id: "a2",     parentId: "a",    label: "A2" },
  { id: "b1",     parentId: "b",    label: "B1" },
];

function buildTree(items) {
  // TODO: return the root nodes array with nested children
}

function TreeNode({ node }) {
  return (
    <li>
      {node.label}
      {node.children?.length > 0 && (
        <ul>
          {node.children.map(child => <TreeNode key={child.id} node={child} />)}
        </ul>
      )}
    </li>
  );
}

function TreeView() {
  const tree = React.useMemo(() => buildTree(flatItems), []);
  return (
    <ul>
      {tree.map(node => <TreeNode key={node.id} node={node} />)}
    </ul>
  );
}

export default TreeView;`,
      hints: [
        "Build a Map from id → node object (with empty `children: []`).",
        "Iterate again: if `parentId` is null, push to roots array; otherwise `map.get(parentId).children.push(node)`.",
        "Return the roots array. O(n) time, O(n) space.",
      ],
      tests: [
        {
          description: "renders all 6 labels",
          code: `
it("renders all 6 labels", () => {
  render(<TreeView />);
  ["Root","A","B","A1","A2","B1"].forEach(label => {
    expect(screen.getByText(label)).toBeTruthy();
  });
});`,
        },
        {
          description: "Root is the top-level item",
          code: `
it("Root is the single top-level item", () => {
  const el = render(<TreeView />);
  const rootUl = el.querySelector("ul");
  expect(rootUl.children.length).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "trie-autocomplete",
      topicId: "data-structures",
      title: "Build an autocomplete using a Trie",
      difficulty: "hard",
      description:
        "Implement a `Trie` class with `insert(word)` and `search(prefix)` methods, then use it to build an autocomplete input. `search(prefix)` should return all words in the trie that start with the prefix in O(k + m) time where k = prefix length and m = number of matching words.",
      concepts: ["Trie", "prefix search", "useMemo", "useRef"],
      starterCode: `const WORDS = ["apple","application","apply","apt","banana","band","bandwidth","can","candy","canyon"];

class Trie {
  constructor() {
    this.root = {};
  }

  insert(word) {
    // TODO
  }

  search(prefix) {
    // TODO: return array of all words starting with prefix
  }
}

function Autocomplete() {
  const trie = React.useMemo(() => {
    const t = new Trie();
    WORDS.forEach(w => t.insert(w));
    return t;
  }, []);

  const [query, setQuery] = React.useState("");
  const suggestions = query ? trie.search(query) : [];

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to search..."
      />
      <ul>
        {suggestions.map(w => <li key={w}>{w}</li>)}
      </ul>
    </div>
  );
}

export default Autocomplete;`,
      hints: [
        "Each trie node is an object: `{ children: {}, isEnd: false }`. `this.root` starts as an empty node.",
        "To insert: iterate each character, create child nodes as needed, mark `isEnd = true` at the last character.",
        "To search: traverse to the prefix node, then DFS/collect all words from that subtree.",
      ],
      tests: [
        {
          description: "renders the input",
          code: `
it("renders the search input", () => {
  render(<Autocomplete />);
  expect(document.querySelector("input")).toBeTruthy();
});`,
        },
        {
          description: "typing 'app' shows apple, application, apply",
          code: `
it("typing 'app' shows apple, application, apply", () => {
  render(<Autocomplete />);
  fireEvent.change(document.querySelector("input"), { target: { value: "app" } });
  expect(screen.getByText("apple")).toBeTruthy();
  expect(screen.getByText("application")).toBeTruthy();
  expect(screen.getByText("apply")).toBeTruthy();
});`,
        },
        {
          description: "typing 'ban' shows banana and band and bandwidth",
          code: `
it("typing 'ban' shows banana, band, bandwidth", () => {
  render(<Autocomplete />);
  fireEvent.change(document.querySelector("input"), { target: { value: "ban" } });
  expect(screen.getByText("banana")).toBeTruthy();
  expect(screen.getByText("band")).toBeTruthy();
  expect(screen.getByText("bandwidth")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 35,
    },
    {
      id: "lru-cache-hook",
      topicId: "data-structures",
      title: "Implement a useLRUCache(capacity) hook",
      difficulty: "hard",
      description:
        "Implement a `useLRUCache(capacity)` hook that returns `{ get, set }`. `get(key)` returns the cached value or `undefined` and marks the entry as most-recently-used. `set(key, value)` stores the entry and evicts the least-recently-used entry if the cache is at capacity. O(1) both operations.",
      concepts: ["LRU cache", "Map", "doubly-linked list", "useRef", "custom hooks"],
      starterCode: `function useLRUCache(capacity) {
  // TODO: implement get and set with O(1) LRU eviction
  // Hint: use a Map (insertion-ordered) as your cache
}

function CacheDemo() {
  const { get, set } = useLRUCache(3);
  const [log, setLog] = React.useState([]);

  function addEntry(key, value) {
    set(key, value);
    setLog(l => [...l, \`set(\${key}, \${value})\`]);
  }

  function readEntry(key) {
    const val = get(key);
    setLog(l => [...l, \`get(\${key}) → \${val ?? "miss"}\`]);
  }

  return (
    <div>
      <button onClick={() => addEntry("a", 1)}>set(a,1)</button>
      <button onClick={() => addEntry("b", 2)}>set(b,2)</button>
      <button onClick={() => addEntry("c", 3)}>set(c,3)</button>
      <button onClick={() => addEntry("d", 4)}>set(d,4)</button>
      <button onClick={() => readEntry("a")}>get(a)</button>
      <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

export default CacheDemo;`,
      hints: [
        "JavaScript `Map` preserves insertion order. Use it as a doubly-ordered list: delete + re-insert on access = O(1) move-to-front.",
        "On `set`: if key exists, delete it first (to refresh position). Then set. If size > capacity, delete `map.keys().next().value` (the oldest).",
        "On `get`: if key exists, get the value, delete key, re-insert to move to end (most-recent). Return the value.",
      ],
      tests: [
        {
          description: "set and get work for basic case",
          code: `
it("set and get buttons render", () => {
  render(<CacheDemo />);
  expect(screen.getByText("set(a,1)")).toBeTruthy();
  expect(screen.getByText("get(a)")).toBeTruthy();
});`,
        },
        {
          description: "clicking set(a,1) then get(a) logs a hit",
          code: `
it("get returns value after set", () => {
  render(<CacheDemo />);
  fireEvent.click(screen.getByText("set(a,1)"));
  fireEvent.click(screen.getByText("get(a)"));
  expect(screen.getByText("get(a) → 1")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 40,
    },
    {
      id: "virtual-list",
      topicId: "data-structures",
      title: "Render only visible rows in a 10,000-item list",
      difficulty: "hard",
      description:
        "Rendering 10,000 DOM nodes is slow. Implement basic row virtualization: given a list of items and a fixed `rowHeight`, only render the rows currently visible in the scroll container. Calculate `startIndex` and `endIndex` from the scroll position.",
      concepts: ["virtualization", "useRef", "useCallback", "scroll", "performance"],
      starterCode: `const ITEMS = Array.from({ length: 10000 }, (_, i) => \`Item \${i + 1}\`);
const ROW_HEIGHT = 40;
const CONTAINER_HEIGHT = 400;
const OVERSCAN = 3;

function VirtualList({ items }) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef(null);

  const totalHeight = items.length * ROW_HEIGHT;

  // TODO: calculate visible range
  const startIndex = 0;
  const endIndex = items.length;

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height: CONTAINER_HEIGHT, overflowY: "auto", position: "relative" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: offsetY, width: "100%" }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: ROW_HEIGHT, display: "flex", alignItems: "center", padding: "0 12px" }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <VirtualList items={ITEMS} />;
}`,
      hints: [
        "`startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)`",
        "`endIndex = Math.min(items.length - 1, Math.floor((scrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + OVERSCAN)`",
        "The outer div has `height: totalHeight` to create the full scroll space. The inner div is absolutely positioned at `offsetY = startIndex * ROW_HEIGHT`.",
      ],
      tests: [
        {
          description: "renders the container",
          code: `
it("renders the scroll container", () => {
  render(<App />);
  const container = document.querySelector("[style*='overflow']");
  expect(container).toBeTruthy();
});`,
        },
        {
          description: "initial render shows Item 1",
          code: `
it("initial render shows Item 1", () => {
  render(<App />);
  expect(screen.getByText("Item 1")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 40,
    },
  ],
};

export default topic;
