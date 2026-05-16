import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const stateMgmtDiagram = String.raw`flowchart TD
  Q1["Is state local to one component?"]
  Q1 -->|Yes| LOCAL["useState / useReducer\nNo external library needed"]
  Q1 -->|No| Q2["Is it shared across the entire app?"]
  Q2 -->|No| Q3["Shared across a subtree?"]
  Q3 -->|Yes| CTX["React Context + useReducer\nTheme, auth, locale — changes rarely"]
  Q3 -->|"Siblings / unrelated trees"| ZUSTAND["Zustand\nMinimal boilerplate, great for UI state"]
  Q2 -->|Yes| Q4["Complex derived state + devtools needed?"]
  Q4 -->|Yes| REDUX["Redux Toolkit\nComplex business state, time-travel debug"]
  Q4 -->|No| ZUSTAND2["Zustand / Jotai\nSimple global, no reducer overhead"]`;

const microfrontendDiagram = String.raw`flowchart TD
  SHELL["Shell App (Host)\ndisney.com\nRouting + Auth + Design System"]
  SHELL -->|"loads at runtime"| MF1["Disney+ MFE\nStreaming UI team\nindependent deploy"]
  SHELL -->|"loads at runtime"| MF2["ESPN MFE\nSports team\nindependent deploy"]
  SHELL -->|"loads at runtime"| MF3["Parks MFE\nExperiences team\nindependent deploy"]
  DS["@disney/ui-components\nshared singleton"]
  DS -."singleton".-> SHELL
  DS -."singleton".-> MF1
  DS -."singleton".-> MF2
  DS -."singleton".-> MF3
  AUTH["Disney Account SSO"]
  AUTH -."token".-> SHELL
  SHELL -."auth context".-> MF1
  SHELL -."auth context".-> MF2
  SHELL -."auth context".-> MF3`;

export const toc: TocItem[] = [
  { id: "composition-patterns", title: "Component Composition Patterns", level: 2 },
  { id: "compound-components", title: "Compound Components", level: 3 },
  { id: "render-props", title: "Render Props & Slot Pattern", level: 3 },
  { id: "state-architecture", title: "State Management Architecture", level: 2 },
  { id: "state-decision", title: "The Decision Framework", level: 3 },
  { id: "state-colocation", title: "State Colocation Principle", level: 3 },
  { id: "microfrontends", title: "Micro-Frontend Architecture", level: 2 },
  { id: "module-federation", title: "Module Federation", level: 3 },
  { id: "design-system-sharing", title: "Design System Sharing", level: 3 },
  { id: "performance-patterns", title: "Performance Patterns", level: 2 },
  { id: "memoization", title: "Memoization Strategy", level: 3 },
  { id: "virtualization", title: "Virtualization for Large Lists", level: 3 },
  { id: "concurrent-react", title: "Concurrent React Features", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Architecture Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ReactArchitectureAtScale() {
  return (
    <div className="article-content">
      <p>
        A senior IC can implement any React pattern correctly. A staff engineer understands
        WHY each pattern exists, WHEN it hurts you, and HOW to drive architectural decisions
        across teams. This module covers the patterns, state philosophy, and micro-frontend
        architecture Disney evaluates at the staff level.
      </p>

      <h2 id="composition-patterns">Component Composition Patterns</h2>
      <p>
        The most important shift at the staff level is understanding that component patterns
        are organizational tools, not just technical ones. The right pattern reduces the
        surface area for bugs AND makes it obvious how to extend a component without touching
        its internals.
      </p>

      <h3 id="compound-components">Compound Components</h3>
      <p>
        The compound component pattern uses <strong>React Context internally</strong> to
        share state between co-located sub-components. The parent coordinates; consumers
        control composition. This is the pattern behind every modern UI library: Radix UI,
        Headless UI, React Aria.
      </p>
      <pre><code>{`const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ defaultTab, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function Tab({ id, children }: TabProps) {
  const ctx = React.useContext(TabsContext)!;
  return (
    <button
      role="tab"
      aria-selected={ctx.active === id}
      onClick={() => ctx.setActive(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: TabPanelProps) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.active !== id) return null;
  return <div role="tabpanel">{children}</div>;
}

Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Consumer controls composition — not the library
<Tabs defaultTab="streaming">
  <Tabs.Tab id="streaming">Disney+</Tabs.Tab>
  <Tabs.Tab id="sports">ESPN</Tabs.Tab>
  <Tabs.Panel id="streaming"><StreamingContent /></Tabs.Panel>
  <Tabs.Panel id="sports"><SportsContent /></Tabs.Panel>
</Tabs>`}</code></pre>

      <p>
        The staff-level insight: <strong>this pattern trades implicit coupling for explicit
        composition</strong>. Use it when consumers need to control layout or ordering of
        sub-components. Avoid it for simple components where it adds complexity without benefit.
      </p>

      <h3 id="render-props">Render Props & Slot Pattern</h3>
      <p>
        Render props share stateful logic while giving the consumer full control over rendered
        output. In a modern codebase, the preferred form is a <strong>custom hook</strong> —
        same pattern, no wrapper element in the tree.
      </p>
      <pre><code>{`// Render prop form — share data, consumer owns UI
function MouseTracker({ children }: { children: (pos: Position) => React.ReactNode }) {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return <>{children(pos)}</>;
}

// Modern form — custom hook (same logic, no extra element)
function useMousePosition() {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  useEffect(() => { /* same */ }, []);
  return pos;
}

// Disney parks interactive map: cursor drives highlight
function InteractiveMap() {
  const { x, y } = useMousePosition();
  return <MapCanvas cursorX={x} cursorY={y} />;
}`}</code></pre>

      <h2 id="state-architecture">State Management Architecture</h2>
      <p>
        The most common staff-level interview question: &quot;How do you decide which state
        management solution to use?&quot; The wrong answer is naming your favorite library.
        The right answer is a decision framework based on the <strong>scope, frequency of
        change, and derivation complexity</strong> of the state.
      </p>

      <MermaidDiagram
        chart={stateMgmtDiagram}
        title="State Management Decision Framework"
        caption="Start at the top: if state is local, keep it local. Only reach for global state when genuinely needed across unrelated subtrees."
        minHeight={380}
      />

      <h3 id="state-decision">The Decision Framework</h3>

      <ArticleTable caption="State management options compared by scope, boilerplate, and ideal use case." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Scope</th>
              <th>Boilerplate</th>
              <th>Ideal for</th>
              <th>Avoid when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useState</code></td>
              <td>Component</td>
              <td>None</td>
              <td>Form inputs, toggles, local UI state</td>
              <td>State needs to survive unmount or be shared</td>
            </tr>
            <tr>
              <td><code>useReducer</code></td>
              <td>Component / subtree</td>
              <td>Low</td>
              <td>Complex local state with multiple sub-values</td>
              <td>State needs to be global</td>
            </tr>
            <tr>
              <td>React Context</td>
              <td>Subtree</td>
              <td>Medium</td>
              <td>Theme, auth, locale — changes rarely</td>
              <td>High-frequency updates — causes full subtree re-render</td>
            </tr>
            <tr>
              <td>Zustand</td>
              <td>Global</td>
              <td>Low</td>
              <td>UI state: sidebar, modal, cart, playback state</td>
              <td>Very complex derived state logic</td>
            </tr>
            <tr>
              <td>Redux Toolkit</td>
              <td>Global</td>
              <td>Medium</td>
              <td>Complex business state, devtools, time-travel debug</td>
              <td>Small apps where it adds ceremony for no gain</td>
            </tr>
            <tr>
              <td>Jotai / Recoil</td>
              <td>Global atoms</td>
              <td>Low</td>
              <td>Fine-grained subscriptions — only re-render what changed</td>
              <td>When atom dependency graph gets complex to reason about</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="state-colocation">State Colocation Principle</h3>
      <p>
        State should live as close to where it is used as possible. The most common mistake on
        large teams is lifting state to a global store &quot;because it might be needed elsewhere
        later.&quot; This creates invisible coupling — any component in the entire app can
        accidentally modify shared state, making bugs nearly impossible to trace.
      </p>
      <pre><code>{`// Anti-pattern: lifting state to Redux prematurely
// Any component anywhere can accidentally reset filterQuery
const { filterQuery, setFilterQuery } = useSelector(state => state.contentBrowser);

// Better: keep it local until proven otherwise
function ContentBrowser() {
  const [filterQuery, setFilterQuery] = useState("");
  return (
    <>
      <SearchInput value={filterQuery} onChange={setFilterQuery} />
      <ContentGrid filter={filterQuery} />
    </>
  );
}

// Only lift when two genuinely unrelated subtrees need the same state.
// "Might need it later" is not a reason to go global.`}</code></pre>

      <InterviewPlaybook
        title="How to answer: 'How do you choose a state management solution?'"
        intro="Interviewers want a framework, not an opinion. The weak answer names a library. The strong answer names the decision criteria."
        steps={[
          "Start with colocation: 'My default is useState — local state is always the right first choice. I only escalate when proven necessary.'",
          "Name the escalation triggers: scope (siblings need it), persistence (survives navigation), complexity (derived state with selectors).",
          "Explain the Context trap: 'Context is not a state manager — it's dependency injection. High-frequency state in Context re-renders your entire subtree on every change.'",
          "Close with organizational reality: 'At Disney scale, Redux Toolkit wins when you need devtools, time-travel debugging, and a shared mental model across 20 engineers who all need to understand the state shape.'",
        ]}
      />

      <h2 id="microfrontends">Micro-Frontend Architecture</h2>
      <p>
        When multiple product teams own different parts of the same user-facing product,
        micro-frontends solve the organizational scaling problem that monorepos don&apos;t
        fully address. Disney builds exactly this: Disney+, ESPN, Hulu, and Parks digital
        experiences that must integrate while being owned by independent teams with
        independent deployment pipelines.
      </p>

      <MermaidDiagram
        chart={microfrontendDiagram}
        title="Disney Micro-Frontend Architecture with Module Federation"
        caption="Each product team owns their MFE independently. The shell orchestrates routing and auth. The design system is a shared singleton to prevent version conflicts."
        minHeight={440}
      />

      <h3 id="module-federation">Module Federation</h3>
      <p>
        Webpack 5 Module Federation enables runtime composition of micro-frontends. Each MFE
        exposes components as remote modules; the shell (host) app loads them at runtime without
        rebuilding the host. This is the key that enables independent deploys.
      </p>
      <pre><code>{`// webpack.config.js — Disney+ MFE (remote)
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "disneyPlus",
      filename: "remoteEntry.js",
      exposes: {
        "./ContentRow": "./src/components/ContentRow",
        "./HeroCarousel": "./src/components/HeroCarousel",
        "./PlayerShell": "./src/components/PlayerShell",
      },
      shared: {
        // singleton: true is critical — prevents two React instances
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
        "@disney/ui": { singleton: true },
      },
    }),
  ],
};

// shell/webpack.config.js — host app
new ModuleFederationPlugin({
  name: "shell",
  remotes: {
    // URL injected at runtime via env — enables blue/green MFE deploys
    disneyPlus: \`disneyPlus@\${process.env.DISNEY_PLUS_URL}/remoteEntry.js\`,
    espn: \`espn@\${process.env.ESPN_URL}/remoteEntry.js\`,
  },
  shared: { react: { singleton: true }, "react-dom": { singleton: true } },
});

// Usage in shell — component loaded at runtime, lazily
const ContentRow = React.lazy(() => import("disneyPlus/ContentRow"));

function HomePage() {
  return (
    <React.Suspense fallback={<ContentRowSkeleton />}>
      <ContentRow genre="Action" />
    </React.Suspense>
  );
}`}</code></pre>

      <h3 id="design-system-sharing">Design System Sharing</h3>
      <p>
        The hardest problem in micro-frontends is the <strong>shared singleton problem</strong>:
        React must have exactly one instance running. If two MFEs bundle their own React, Context
        and hooks break silently. The <code>singleton: true</code> flag enforces this, but it
        means all MFEs must agree on compatible React versions — a cross-team governance challenge
        that requires an RFC process and a design system team with clear ownership.
      </p>

      <h2 id="performance-patterns">Performance Patterns</h2>

      <h3 id="memoization">Memoization Strategy</h3>
      <p>
        Memoization is the most misused performance tool in React. The common mistake is
        adding <code>memo</code>, <code>useMemo</code>, and <code>useCallback</code> everywhere
        &quot;just in case.&quot; Each has a cost: allocation, comparison overhead, code
        complexity. Rule: <strong>profile first, memoize second</strong>.
      </p>
      <pre><code>{`// Correct use: ContentRow is expensive (DOM-heavy) with stable props
const ContentRow = React.memo(function ContentRow({ genre, items }: Props) {
  return (
    <div className="content-row">
      {items.map(item => <ContentCard key={item.id} {...item} />)}
    </div>
  );
}, (prev, next) => {
  // Custom comparator — avoids deep equality on large arrays
  return prev.genre === next.genre &&
    prev.items.length === next.items.length &&
    prev.items.every((item, i) => item.id === next.items[i].id);
});

// useMemo — expensive computation, not just "avoid object creation"
const sortedContent = useMemo(() =>
  items
    .filter(item => item.rating >= minRating)
    .sort((a, b) => b.popularity - a.popularity),
  [items, minRating]
);

// useCallback — only when the child uses React.memo AND takes it as prop
const handlePlay = useCallback((contentId: string) => {
  analytics.track("play", { contentId, userId });
  setPlaying(contentId);
}, [analytics, userId]); // analytics must itself be stable or this is pointless`}</code></pre>

      <h3 id="virtualization">Virtualization for Large Lists</h3>
      <p>
        Disney content libraries have hundreds of items per row. Rendering all to the DOM
        kills scroll performance. Virtualization renders only items in the viewport plus a
        small buffer. Use <code>@tanstack/react-virtual</code> for maximum flexibility.
      </p>
      <pre><code>{`import { useVirtualizer } from "@tanstack/react-virtual";

function ContentRow({ items }: { items: ContentItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,    // estimated card width in px
    horizontal: true,
    overscan: 3,                // render 3 items outside viewport each side
  });

  return (
    <div ref={parentRef} className="overflow-x-auto h-52">
      <div style={{ width: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.index}
            style={{ position: "absolute", left: vItem.start, width: vItem.size }}
          >
            <ContentCard item={items[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}`}</code></pre>

      <h3 id="concurrent-react">Concurrent React Features</h3>
      <p>
        React 18 concurrent features give fine-grained control over update priority.
        <code>useTransition</code> marks state updates as non-urgent — React can interrupt
        them to handle user input first. This keeps the UI responsive during expensive
        filtering or search operations.
      </p>
      <pre><code>{`import { useTransition, useDeferredValue } from "react";

function ContentSearch({ items }: { items: ContentItem[] }) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [filteredItems, setFilteredItems] = useState(items);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);          // urgent: update input immediately

    startTransition(() => {            // non-urgent: can be interrupted
      setFilteredItems(items.filter(item =>
        item.title.toLowerCase().includes(e.target.value.toLowerCase())
      ));
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} placeholder="Search Disney+" />
      {isPending && <Spinner size="sm" />}
      <ContentGrid items={filteredItems} />
    </>
  );
}

// Alternative: useDeferredValue for values you don't control
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      <ExpensiveResultsList query={deferredQuery} />
    </div>
  );
}`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How would you architect a React app shared across multiple product teams?'"
        intro="This is the canonical staff-level question. It tests whether you think in organizational boundaries, not just technical ones."
        steps={[
          "Frame in terms of team ownership first: 'The answer depends on the deployment model. Can all teams deploy together, or do they need independent release cycles?'",
          "Name the spectrum: 'From a monorepo with shared components (low overhead, tight coupling) to Module Federation micro-frontends (full autonomy, complex integration).'",
          "Explain Module Federation trade-offs explicitly: 'MFE gives teams independent deploys, but creates a shared singleton constraint on React and the design system. Every team must agree on compatible versions — a governance problem that requires process, not just tech.'",
          "Anchor to Disney's reality: 'At Disney scale, ESPN vs Disney+ vs Parks need independent velocity. I would recommend Module Federation with a shell app owning routing, auth, and the design system. The governance cost is worth the deployment independence.'",
        ]}
      />

      <InterviewChallenge
        title="Architecture Challenge: CMS-Driven Page Layout System"
        scenario={
          <>
            Disney&apos;s marketing team needs to configure homepage layouts without code
            deployments. They control: which content rows appear, in what order, and with what
            titles. The configuration comes from a CMS API as JSON. You have 40 minutes to
            design and implement the core of this system.
          </>
        }
        tasks={[
          "Define the TypeScript interface for the CMS page configuration (supports multiple row types: ContentRow, HeroCarousel, PromoBanner).",
          "Implement a component registry that maps CMS component type IDs to React components.",
          "Build a PageRenderer that takes the CMS config and renders correct components in order.",
          "Handle unknown component types gracefully — log a warning, render nothing, do not crash.",
          "Explain how you would extend this system to support A/B testing two different layouts.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Compound components</strong> trade implicit coupling for explicit composition — use when consumers need to control layout or ordering of sub-parts.</li>
        <li><strong>State colocation</strong> is the single biggest lever for reducing unexpected re-renders and debugging complexity in large codebases.</li>
        <li><strong>Module Federation</strong> enables independent deployment across product teams but creates a version governance problem for React and shared design systems.</li>
        <li><strong>Memoize based on profiling</strong>, not intuition — premature memoization adds allocation overhead without measurable benefit.</li>
        <li><code>useTransition</code> keeps UIs responsive during expensive updates by marking them as interruptible and non-urgent.</li>
        <li>At the staff level, every architectural decision must be framed in terms of <strong>team boundaries and organizational trade-offs</strong>, not just technical correctness.</li>
      </ul>
    </div>
  );
}
