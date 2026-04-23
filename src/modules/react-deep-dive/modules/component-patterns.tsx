import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "compound-components", title: "Compound Components", level: 2 },
  { id: "render-props", title: "Render Props", level: 2 },
  { id: "slot-pattern", title: "The Slot Pattern with children Composition", level: 2 },
  { id: "controlled-vs-uncontrolled", title: "Controlled vs Uncontrolled Components", level: 2 },
  { id: "higher-order-components", title: "Higher-Order Components in 2024", level: 2 },
  { id: "lifting-vs-pushing-state", title: "Lifting State Up vs Pushing State Down", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ComponentPatterns() {
  return (
    <div className="article-content">
      <p>
        Component patterns are the vocabulary for expressing complex UI relationships in React.
        Understanding them means you recognize the right tool for each architectural problem
        rather than reinventing solutions with prop drilling, global state, or imperative hacks.
        These patterns are language-agnostic enough that you will encounter them in every serious
        React codebase — and in interviews.
      </p>

      <h2 id="compound-components">Compound Components</h2>

      <p>
        Compound components are a group of components that share implicit state through a parent
        Context. They appear to be independent components but form a cohesive unit. Think of
        HTML&apos;s <code>&lt;select&gt;</code> and <code>&lt;option&gt;</code> — you use them
        together and the browser shares selection state implicitly between them.
      </p>

      <p>
        The pattern is ideal for components like Tabs, Accordion, Select, Dropdown, and Modal
        — cases where child components need to communicate without the user of the compound
        component managing that internal state.
      </p>

      <pre><code>{`// Compound component implementation: Tabs
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used within <Tabs>");
  return ctx;
}

// Root component manages state and provides it via context
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// Sub-components read from context — no props needed for coordination
function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist" className="tab-list">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabs();
  return (
    <button
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
      className={activeTab === id ? "tab active" : "tab"}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab } = useTabs();
  if (activeTab !== id) return null;
  return <div role="tabpanel">{children}</div>;
}

// Namespace the sub-components for discoverable API
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Consumer API — no state management required on the consumer's side:
function SettingsPage() {
  return (
    <Tabs defaultTab="general">
      <Tabs.List>
        <Tabs.Tab id="general">General</Tabs.Tab>
        <Tabs.Tab id="security">Security</Tabs.Tab>
        <Tabs.Tab id="billing">Billing</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="general"><GeneralSettings /></Tabs.Panel>
      <Tabs.Panel id="security"><SecuritySettings /></Tabs.Panel>
      <Tabs.Panel id="billing"><BillingSettings /></Tabs.Panel>
    </Tabs>
  );
}`}</code></pre>

      <h2 id="render-props">Render Props</h2>

      <p>
        The render props pattern passes a function as a prop (or as <code>children</code>) that
        the component calls with its internal state. This lets the consumer control rendering
        while the component manages the behavior. Render props were the pre-hooks solution to
        sharing stateful logic. Today, custom hooks solve most of the same problems more cleanly —
        but render props remain valuable when you need the consuming code to decide <em>what</em>
        renders, not just <em>how</em> the logic works.
      </p>

      <pre><code>{`// Render prop: the List component manages selection state,
// the consumer controls how items and the selected item look.
function SelectableList<T extends { id: string }>({
  items,
  renderItem,
  renderSelected,
}: {
  items: T[];
  renderItem: (item: T, isSelected: boolean, onSelect: () => void) => React.ReactNode;
  renderSelected: (item: T) => React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {renderItem(item, item.id === selectedId, () => setSelectedId(item.id))}
          </li>
        ))}
      </ul>
      {selectedItem && renderSelected(selectedItem)}
    </div>
  );
}

// Consumer decides both the list item UI and the detail UI:
<SelectableList
  items={users}
  renderItem={(user, isSelected, onSelect) => (
    <button
      onClick={onSelect}
      className={isSelected ? "user-item selected" : "user-item"}
    >
      {user.name}
    </button>
  )}
  renderSelected={user => <UserDetailPanel user={user} />}
/>`}</code></pre>

      <h2 id="slot-pattern">The Slot Pattern with children Composition</h2>

      <p>
        The slot pattern uses named props that accept JSX (React nodes) to define structural
        &quot;slots&quot; in a component&apos;s layout. Unlike compound components, there is no
        implicit shared state — slots are purely compositional. This pattern appears constantly
        in layout components, modals, cards, and page shells.
      </p>

      <pre><code>{`// Slot pattern: named props for different regions of a layout
interface PageLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;   // "default slot"
  footer?: React.ReactNode;
}

function PageLayout({ header, sidebar, children, footer }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="page-header">{header}</header>
      <div className="page-body">
        {sidebar && <aside className="page-sidebar">{sidebar}</aside>}
        <main className="page-content">{children}</main>
      </div>
      {footer && <footer className="page-footer">{footer}</footer>}
    </div>
  );
}

// Consumer composes the layout without knowing its internal structure:
function DashboardPage() {
  return (
    <PageLayout
      header={<DashboardHeader />}
      sidebar={<DashboardNav />}
      footer={<PageFooter />}
    >
      <DashboardContent />  {/* Goes into the children / "default" slot */}
    </PageLayout>
  );
}`}</code></pre>

      <h2 id="controlled-vs-uncontrolled">Controlled vs Uncontrolled Components</h2>

      <p>
        This is a design decision, not a React feature. A <strong>controlled</strong> component
        gets its value and change handler from the parent — the parent owns the state. An
        <strong>uncontrolled</strong> component manages its own internal state — the parent
        only reads the value when it needs it (via a ref or on form submission).
      </p>

      <p>
        Neither is universally better. Controlled components give you full visibility into and
        control over the value at every keystroke — required for live validation, character
        limits, formatting. Uncontrolled components are simpler when you only need the value
        at submission and do not need to react to intermediate changes.
      </p>

      <pre><code>{`// CONTROLLED: parent owns state — full visibility into value
function ControlledInput({ value, onChange, maxLength }: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <div>
      <input
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxLength))}
      />
      <span>{value.length}/{maxLength}</span>  {/* Live character count */}
    </div>
  );
}

// UNCONTROLLED: component owns state — simpler when parent just needs final value
function UncontrolledForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit(new FormData(e.currentTarget));
    }}>
      <input name="username" defaultValue="alice" />  {/* defaultValue, not value */}
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </form>
  );
}

// The rule of thumb:
// Use controlled when you need to react to every change (validation, formatting).
// Use uncontrolled when you only need the value on submit and there's no live feedback.`}</code></pre>

      <h2 id="higher-order-components">Higher-Order Components in 2024</h2>

      <p>
        Higher-Order Components (HOCs) are functions that take a component and return an
        enhanced component. They were the canonical pattern for cross-cutting concerns before
        hooks. Today, custom hooks solve most of the same problems with less indirection. HOCs
        remain appropriate for a specific niche: augmenting components you cannot add hooks to
        (class components, third-party components) or scenarios where the enhancement must wrap
        the component at the JSX level.
      </p>

      <pre><code>{`// HOC: wraps a component to add permission checking
function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: Permission
) {
  function PermissionGuard(props: P) {
    const { permissions } = useAuth();

    if (!permissions.includes(requiredPermission)) {
      return <AccessDenied />;
    }

    return <WrappedComponent {...props} />;
  }

  // Preserve the display name for React DevTools
  PermissionGuard.displayName =
    \`withPermission(\${WrappedComponent.displayName ?? WrappedComponent.name})\`;

  return PermissionGuard;
}

// Usage: AdminPanel is only rendered if the user has "admin" permission
const ProtectedAdminPanel = withPermission(AdminPanel, "admin");

// The equivalent with a hook — simpler, less indirection:
function AdminPanel() {
  const { permissions } = useAuth();
  if (!permissions.includes("admin")) return <AccessDenied />;
  return <AdminContent />;
}

// When to choose HOC over hook:
// - You cannot modify the wrapped component (third-party, class component)
// - The enhancement needs to intercept rendering entirely (e.g., error boundaries)
// - You are building a library and need a stable composable API`}</code></pre>

      <h2 id="lifting-vs-pushing-state">Lifting State Up vs Pushing State Down</h2>

      <p>
        State placement is one of the highest-leverage architectural decisions in a React app.
        The principle is simple: state should live as close to where it is used as possible.
        Lifting state up — moving it to the nearest common ancestor — enables sibling communication.
        Pushing state down — keeping it local to the component that needs it — reduces unnecessary
        re-renders and coupling.
      </p>

      <pre><code>{`// TOO HIGH: global state for local UI behavior
// Putting a modal's open/closed state in a global store
// when only one component needs it is unnecessary coupling.
const useGlobalStore = create(set => ({
  isDeleteModalOpen: false, // This doesn't need to be global
  openDeleteModal: () => set({ isDeleteModalOpen: true }),
}));

// CORRECT: local state stays local
function ProductRow({ product }: { product: Product }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  return (
    <>
      <button onClick={() => setShowDeleteModal(true)}>Delete</button>
      {showDeleteModal && (
        <DeleteModal
          product={product}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

// When to LIFT state:
// Two sibling components need to share data.
// Move state to their nearest common ancestor.
function SearchInterface() {
  const [query, setQuery] = useState("");  // Lifted: both siblings need it

  return (
    <>
      <SearchInput value={query} onChange={setQuery} />
      <SearchResults query={query} />
    </>
  );
}

// When to PUSH state down (colocation):
// A piece of state only affects a subtree. Move it into the subtree root.
// This prevents the parent from re-rendering when the child's state changes.
function Dashboard() {
  return (
    <>
      <SummaryPanel />
      {/* FilterableTable owns its own filter state — Dashboard doesn't re-render on filter changes */}
      <FilterableTable />
    </>
  );
}`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Compound components share implicit state via Context — use for UI elements where children coordinate (Tabs, Accordion)</li>
        <li>Render props pass UI-generating functions — still valuable when consumers need full rendering control</li>
        <li>The slot pattern uses named ReactNode props to define layout regions without shared state</li>
        <li>Controlled components give parent full visibility into value changes; uncontrolled components are simpler for submit-only flows</li>
        <li>HOCs are still appropriate for augmenting components you cannot add hooks to — prefer custom hooks otherwise</li>
        <li>State should live as close to its consumers as possible — lift when siblings need to share, push down when only a subtree needs it</li>
      </ul>

      <p>
        You have now covered React&apos;s rendering model, state internals, effects, memoization,
        Context, custom hooks, Suspense, concurrent features, React 19, and architectural
        patterns. The next step is applying these concepts under real constraints — reach for
        the React DevTools Profiler, profile before optimizing, and build components that are
        easy to reason about before they are fast.
      </p>
    </div>
  );
}
