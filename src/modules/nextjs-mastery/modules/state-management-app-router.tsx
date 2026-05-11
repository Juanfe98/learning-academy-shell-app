import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const stateArchitectureDiagram = String.raw`flowchart TD
    subgraph SERVER["Server (Node.js process)"]
        SC["Server Components\n(async, no hooks)"]
        DB["Database / ORM"]
        CACHE["fetch() cache\nReact cache()"]
        SC -->|"reads directly"| DB
        SC -->|"automatically cached"| CACHE
    end

    subgraph BOUNDARY["Server → Client Boundary"]
        SERIAL["Serialized props\n(JSON-safe values only)"]
        CHILDREN["children prop\n(pre-rendered JSX)"]
    end

    subgraph CLIENT["Client (Browser)"]
        CC["Client Components\n('use client')"]
        ZUSTAND["Zustand store\nglobal UI state"]
        CONTEXT["React Context\nscoped subtree state"]
        URL["URL / searchParams\nfilters, pagination, tabs"]
        SWR_BOX["SWR / React Query\nserver-sync state"]
        CC --> ZUSTAND
        CC --> CONTEXT
        CC --> URL
        CC --> SWR_BOX
    end

    SERVER -->|"props"| BOUNDARY
    BOUNDARY -->|"passes to"| CLIENT
    SC -->|"renders children\n(stays on server)"| CHILDREN
    CHILDREN -->|"slot into Client\ncomponent tree"| CC`;

const urlStateFlowDiagram = String.raw`flowchart LR
    subgraph useState["useState approach"]
        A["User clicks filter"] --> B["setState called"]
        B --> C["Component re-renders"]
        C --> D["State in memory\n(lost on refresh)"]
        D -->|"page refresh"| LOST["Filter gone\nUser frustrated"]
    end

    subgraph urlState["URL state approach"]
        E["User clicks filter"] --> F["router.push with\nnew searchParams"]
        F --> G["Component re-renders\nvia useSearchParams"]
        G --> H["State in URL bar"]
        H -->|"page refresh"| KEPT["Filter preserved"]
        H -->|"copy/share link"| SHARE["Shareable URL"]
        H -->|"browser back"| BACK["Back button works"]
    end`;

export const toc: TocItem[] = [
  { id: "state-mental-model", title: "The State Mental Model for App Router", level: 2 },
  { id: "provider-pattern", title: "Provider Pattern with RSC", level: 2 },
  { id: "zustand-app-router", title: "Zustand with App Router", level: 2 },
  { id: "react-context-pattern", title: "React Context with App Router", level: 2 },
  { id: "url-as-state", title: "URL as State (Most Underused)", level: 2 },
  { id: "swr-react-query", title: "SWR and React Query with App Router", level: 2 },
  { id: "use-hook", title: "The use() Hook", level: 2 },
  { id: "state-decision-table", title: "State Decision Table", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StateManagementAppRouter() {
  return (
    <div className="article-content">
      <p>
        State management is the hardest thing to get right in a Next.js App Router application —
        not because the APIs are complex, but because App Router introduces a strict server/client
        boundary that invalidates most of what you learned in Pages Router. The wrong mental model
        leads to accidentally disabling Server Components, creating SSR hydration mismatches, or
        leaking state across requests in production. This module builds the correct architecture
        from first principles.
      </p>

      <h2 id="state-mental-model">The State Mental Model for App Router</h2>
      <p>
        App Router splits the world into two execution environments: the server (Node.js, runs once
        per request) and the client (browser, runs continuously). <strong>Server Components</strong>{" "}
        live on the server side — they are <code>async</code>, can read databases directly, and
        never hold React state or hooks. <strong>Client Components</strong> (marked with{" "}
        <code>&quot;use client&quot;</code>) live in the browser and own all interactive state.
      </p>
      <p>
        This split is not a limitation — it is an architecture constraint that forces better
        decisions. Data that comes from a database belongs on the server. UI state (is this modal
        open?) belongs on the client. Mixing them is where apps get slow, buggy, and hard to
        reason about.
      </p>

      <MermaidDiagram
        chart={stateArchitectureDiagram}
        title="State Architecture Layers in App Router"
        caption="Server Components own data fetching. Client Components own interactive state. The boundary is crossed via serialized props or the children-as-hole pattern."
        minHeight={520}
      />

      <p>
        The most important rule: <strong>you cannot pass a React component as a prop from Server
        to Client</strong>. You can pass serializable values (strings, numbers, plain objects, arrays).
        To render server-fetched JSX inside a client component tree, pass it as{" "}
        <code>children</code> — this is the &quot;props-as-hole&quot; pattern and it is how Next.js
        keeps the layout tree efficient.
      </p>

      <h2 id="provider-pattern">Provider Pattern with RSC</h2>
      <p>
        The most common mistake when migrating from Pages Router: wrapping the root layout in a
        store provider by adding <code>&quot;use client&quot;</code> to <code>layout.tsx</code>.
        This turns the entire application shell into a Client Component, which means every page
        inside it loses the ability to be a Server Component. You have killed the primary
        performance benefit of App Router.
      </p>

      <pre>
        <code>{`// ❌ Wrong: marks the entire layout as a client component
"use client";
import { StoreProvider } from "@/lib/store/provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
// All pages inside this layout now bundle client-side JS from the root.
// Server Components inside will still work, but the layout shell itself
// becomes a client component — and Next.js has to serialize its entire subtree.`}</code>
      </pre>

      <p>
        The fix is a thin <strong>Providers client component</strong> that accepts{" "}
        <code>children</code> as a prop. Because <code>children</code> is passed in (not defined
        inside the client component), React treats it as an opaque slot — the actual JSX trees
        passed as children are still evaluated on the server.
      </p>

      <pre>
        <code>{`// ✅ Correct: src/app/providers.tsx — thin client wrapper
"use client";
import { StoreProvider } from "@/lib/store/provider";
import { ThemeProvider } from "@/lib/theme/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </StoreProvider>
  );
}

// src/app/layout.tsx — stays a Server Component (no "use client")
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Providers is a Client Component, but children is server-rendered JSX */}
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
// children (your page components) remain Server Components.
// They are pre-rendered on the server and slotted into the Providers client tree.`}</code>
      </pre>

      <p>
        Why does this work? When Next.js renders the layout, it evaluates{" "}
        <code>children</code> (the page) on the server first. The result is a serialized JSX
        description — not a function reference. That description is passed into{" "}
        <code>Providers</code> as a prop. The client component receives a completed server tree,
        not a factory it needs to invoke.
      </p>

      <h2 id="zustand-app-router">Zustand with App Router</h2>
      <p>
        Zustand is the most popular choice for global client state in App Router applications.
        The critical mistake is creating the store in module scope. In Next.js, modules are
        evaluated once per server process — which means a module-level store is{" "}
        <strong>shared across all requests</strong>. User A&apos;s state bleeds into User B&apos;s
        response. This is a serious security issue in multi-tenant apps.
      </p>

      <pre>
        <code>{`// ❌ Wrong: module-level store is shared across ALL requests on the server
import { create } from "zustand";

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
// In Node.js, this module is loaded once. Every request shares the same store instance.
// On a server with 100 concurrent requests, they all read/write the same "user" state.`}</code>
      </pre>

      <pre>
        <code>{`// ✅ Correct: factory pattern — one store per client session

// src/lib/store/user-store.ts
import { createStore } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  user: User | null;
  preferences: UserPreferences;
}
interface UserActions {
  setUser: (user: User | null) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}
type UserStore = UserState & UserActions;

export type UserStoreApi = ReturnType<typeof createUserStore>;

export function createUserStore(initState?: Partial<UserState>) {
  return createStore<UserStore>()(
    persist(
      (set) => ({
        user: null,
        preferences: { theme: "dark", language: "en" },
        ...initState,
        setUser: (user) => set({ user }),
        updatePreferences: (prefs) =>
          set((s) => ({ preferences: { ...s.preferences, ...prefs } })),
      }),
      {
        name: "user-store",
        skipHydration: true, // SSR safety: don't auto-read localStorage on server
      }
    )
  );
}`}</code>
      </pre>

      <pre>
        <code>{`// src/lib/store/user-store-context.tsx
"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { createUserStore, type UserStoreApi } from "./user-store";

const UserStoreContext = createContext<UserStoreApi | null>(null);

export function UserStoreProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User;
}) {
  // useRef ensures we only create the store once per component lifetime
  const storeRef = useRef<UserStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createUserStore({ user: initialUser ?? null });
  }

  useEffect(() => {
    // Rehydrate from localStorage after mount (SSR-safe pattern)
    storeRef.current?.persist.rehydrate();
  }, []);

  return (
    <UserStoreContext.Provider value={storeRef.current}>
      {children}
    </UserStoreContext.Provider>
  );
}

export function useUserStore<T>(selector: (store: ReturnType<typeof createUserStore>["getState"]) => T): T {
  const store = useContext(UserStoreContext);
  if (!store) throw new Error("useUserStore must be used within UserStoreProvider");
  return useStore(store, selector);
}`}</code>
      </pre>

      <p>
        The <code>skipHydration: true</code> + <code>useEffect</code> rehydration pattern is
        mandatory whenever you use Zustand persist in a Next.js app. Without it, the server renders
        with empty store state, the client hydrates with localStorage data, and React throws a
        hydration mismatch error. The <code>useEffect</code> only runs after mount, so the initial
        server-rendered HTML and the first client render always agree.
      </p>

      <h2 id="react-context-pattern">React Context with App Router</h2>
      <p>
        React Context follows the same pattern as Zustand: the context and provider must live in a
        Client Component, but the children they wrap can remain Server Components. Use Context for
        state that is scoped to a specific subtree — not the entire app.
      </p>

      <pre>
        <code>{`// src/app/dashboard/dashboard-context.tsx
"use client";
import { createContext, useContext, useState } from "react";

interface DashboardContextValue {
  selectedPanel: string;
  setSelectedPanel: (id: string) => void;
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedPanel, setSelectedPanel] = useState("overview");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <DashboardContext.Provider
      value={{
        selectedPanel,
        setSelectedPanel,
        isDrawerOpen,
        toggleDrawer: () => setIsDrawerOpen((v) => !v),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

// src/app/dashboard/layout.tsx — stays a Server Component
import { DashboardProvider } from "./dashboard-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      {/* children (the actual dashboard pages) are Server Components */}
      {children}
    </DashboardProvider>
  );
}`}</code>
      </pre>

      <h2 id="url-as-state">URL as State (Most Underused)</h2>
      <p>
        URL state is the most underused pattern in React applications. Filters, pagination,
        selected tabs, open modals, search queries — most of this state belongs in the URL,
        not in <code>useState</code>. Engineers default to <code>useState</code> because it is
        familiar, but they pay for it every time a user refreshes the page, shares a link, or
        presses the browser back button.
      </p>

      <MermaidDiagram
        chart={urlStateFlowDiagram}
        title="URL State vs useState: What Happens on Refresh"
        caption="URL state survives refresh, enables link sharing, and makes the back button work — for free. useState requires re-implementing all of this manually."
        minHeight={420}
      />

      <p>
        In Next.js App Router, URL state is managed through three hooks:{" "}
        <code>useSearchParams()</code> to read params, <code>usePathname()</code> to get the
        current path, and <code>useRouter()</code> to navigate. The most common mistake is mutating
        the <code>URLSearchParams</code> object directly instead of creating a new copy first.
      </p>

      <pre>
        <code>{`// src/components/FilterPanel.tsx
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface Filters {
  status: "all" | "active" | "archived";
  category: string;
  page: number;
}

export function FilterPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read current filter values from URL with defaults
  const status = (searchParams.get("status") ?? "all") as Filters["status"];
  const category = searchParams.get("category") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  function updateFilter(key: string, value: string) {
    // Always create a new URLSearchParams from the existing ones
    // Never mutate the object returned by useSearchParams — it is read-only
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key); // remove the param if value is empty/default
    }
    // Reset page when filters change
    if (key !== "page") params.delete("page");
    router.push(\`\${pathname}?\${params.toString()}\`);
  }

  function resetFilters() {
    router.push(pathname); // navigate to path with no query string
  }

  return (
    <div className="filter-panel">
      <select value={status} onChange={(e) => updateFilter("status", e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
      <input
        type="text"
        value={category}
        onChange={(e) => updateFilter("category", e.target.value)}
        placeholder="Category..."
      />
      <button onClick={resetFilters}>Reset</button>
    </div>
  );
}`}</code>
      </pre>

      <p>
        Server Components can read search params too, but via props — not hooks. The page component
        at <code>app/products/page.tsx</code> receives <code>searchParams</code> as a prop, making
        it possible to run a filtered database query entirely on the server without any client
        JavaScript.
      </p>

      <pre>
        <code>{`// src/app/products/page.tsx — Server Component
// searchParams are passed as a prop, not via useSearchParams()
interface PageProps {
  searchParams: Promise<{ status?: string; category?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  // In Next.js App Router, searchParams is a Promise — always await it
  const params = await searchParams;
  const status = params.status ?? "all";
  const page = Number(params.page ?? "1");

  // Server-side filtered query — zero client JS needed for filtering
  const products = await db.product.findMany({
    where: status !== "all" ? { status } : undefined,
    skip: (page - 1) * 20,
    take: 20,
  });

  return <ProductList products={products} />;
}`}</code>
      </pre>

      <h2 id="swr-react-query">SWR and React Query with App Router</h2>
      <p>
        Use SWR or React Query for data that needs to stay fresh without a full page navigation:
        user-specific data, real-time feeds, data that updates in response to mutations elsewhere
        in the UI. The key pattern with App Router is to fetch the initial data on the server and
        pass it as <code>fallbackData</code> (SWR) or <code>initialData</code> (React Query).
        This eliminates the loading spinner on first render.
      </p>

      <pre>
        <code>{`// src/app/notifications/page.tsx — Server Component
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  // Server fetches initial data — no loading state for the user
  const initialNotifications = await fetchNotifications({ userId: await getAuthUser() });

  return (
    // Pass initial data down to the client component
    <NotificationsList fallbackData={initialNotifications} />
  );
}

// src/app/notifications/notifications-list.tsx — Client Component
"use client";
import useSWR from "swr";
import type { Notification } from "@/lib/types";

interface Props {
  fallbackData: Notification[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NotificationsList({ fallbackData }: Props) {
  const { data: notifications, mutate } = useSWR<Notification[]>(
    "/api/notifications",
    fetcher,
    {
      fallbackData,         // No loading state on first render — uses server data
      refreshInterval: 30_000, // Poll every 30s for new notifications
      revalidateOnFocus: true, // Re-fetch when user returns to the tab
    }
  );

  async function markAsRead(id: string) {
    // Optimistic update: update local state immediately
    await mutate(
      async (current) => {
        await fetch(\`/api/notifications/\${id}/read\`, { method: "POST" });
        return current?.map((n) => (n.id === id ? { ...n, read: true } : n));
      },
      { optimisticData: notifications?.map((n) => (n.id === id ? { ...n, read: true } : n)) }
    );
  }

  return (
    <ul>
      {notifications?.map((n) => (
        <li key={n.id} onClick={() => markAsRead(n.id)}>
          {n.message}
        </li>
      ))}
    </ul>
  );
}`}</code>
      </pre>

      <h2 id="use-hook">The use() Hook</h2>
      <p>
        React 19 introduced the <code>use()</code> hook, which allows a Client Component to
        consume a <code>Promise</code> passed from a Server Component as a prop. Unlike{" "}
        <code>useEffect</code>-based data fetching, there is no client-side waterfall: the Promise
        starts resolving on the server, and the client just waits for it to finish using a
        Suspense boundary.
      </p>

      <pre>
        <code>{`// src/app/profile/page.tsx — Server Component
import { Suspense } from "react";
import { UserProfile } from "./user-profile";

export default async function ProfilePage() {
  // Pass the Promise itself — NOT the resolved value
  // The server starts the fetch; the client receives a Promise-in-flight
  const userPromise = fetchUserProfile(); // returns Promise<UserProfile>

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      {/* The promise is a serializable reference — safe to pass as a prop */}
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// src/app/profile/user-profile.tsx — Client Component
"use client";
import { use } from "react";
import type { UserProfile as UserProfileType } from "@/lib/types";

interface Props {
  userPromise: Promise<UserProfileType>;
}

export function UserProfile({ userPromise }: Props) {
  // use() suspends the component until the promise resolves.
  // The Suspense boundary above handles the loading state.
  // No useEffect, no useState, no loading boolean.
  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}`}</code>
      </pre>

      <p>
        The key difference from <code>useEffect</code> data fetching: with <code>useEffect</code>,
        the component mounts first (causing a flash), then triggers a fetch from the client
        (adding a network round-trip). With <code>use()</code>, the fetch starts on the server
        before the component ever mounts. The Suspense fallback shows during the initial server
        fetch, not after a client waterfall.
      </p>

      <h2 id="state-decision-table">State Decision Table</h2>

      <ArticleTable
        caption="Pick the right state mechanism by asking: does this state need to survive a refresh? Is it shared globally? Does it come from a server?"
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>State type</th>
              <th>Best solution</th>
              <th>Survives refresh</th>
              <th>Shareable URL</th>
              <th>SSR safe</th>
              <th>When NOT to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Filters, pagination, tabs</td>
              <td>URL searchParams</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>Highly ephemeral UI (hover state)</td>
            </tr>
            <tr>
              <td>Global UI (theme, sidebar open)</td>
              <td>Zustand + localStorage persist</td>
              <td>Yes (via localStorage)</td>
              <td>No</td>
              <td>With <code>skipHydration</code></td>
              <td>Server data; per-request user data</td>
            </tr>
            <tr>
              <td>Subtree UI (modal, accordion)</td>
              <td>React Context + useState</td>
              <td>No</td>
              <td>No</td>
              <td>Yes (if Provider is client)</td>
              <td>Global state spanning multiple routes</td>
            </tr>
            <tr>
              <td>Server data (users, posts)</td>
              <td>Server Component + direct DB call</td>
              <td>Yes (new fetch per request)</td>
              <td>Via URL params</td>
              <td>Yes (runs on server)</td>
              <td>Real-time data; user-interaction-driven</td>
            </tr>
            <tr>
              <td>Live / user-specific data</td>
              <td>SWR / React Query with <code>fallbackData</code></td>
              <td>Yes (refetches)</td>
              <td>No</td>
              <td>Yes (with fallbackData)</td>
              <td>Static data that rarely changes</td>
            </tr>
            <tr>
              <td>Form state</td>
              <td>React Hook Form or <code>useFormState</code></td>
              <td>No</td>
              <td>No</td>
              <td>With Server Actions</td>
              <td>Complex multi-step wizard (use URL)</td>
            </tr>
            <tr>
              <td>Streamed server data</td>
              <td><code>use()</code> + Suspense</td>
              <td>Refetches on navigation</td>
              <td>No</td>
              <td>Yes (starts on server)</td>
              <td>Data that needs client-side polling</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How do you use Zustand in a Next.js App Router application?"
        intro="Most candidates describe the Pages Router pattern (module-level store). A strong answer immediately calls out the SSR cross-request contamination risk and explains the factory + context provider solution."
        steps={[
          "Open by naming the problem: module-level Zustand stores are created once per Node.js process. In SSR, that means every request shares the same store instance — User A's state leaks into User B's response.",
          "Describe the fix: use createStore (not create) inside a factory function, instantiate it inside a React Context provider using useRef, and mount that provider in the Providers client component.",
          "Explain the SSR hydration pattern: skipHydration: true prevents Zustand from reading localStorage during server rendering. A useEffect on mount calls persist.rehydrate() so the client picks up saved state after the first render matches the server.",
          "Call out the common mistake: adding 'use client' to layout.tsx to wrap the store provider. This turns the root layout into a Client Component and kills Server Components for every page in the app.",
          "Close with the solution: the thin Providers client component with children as a prop. Children are rendered on the server and slotted in as pre-built JSX — they do not become client components just because they live inside one.",
        ]}
      />

      <InterviewPlaybook
        title="When would you reach for URL state over useState?"
        intro="Weak answers say 'when I want to share a link.' A strong answer treats URL state as the default for navigational state and explains the back-button and SSR advantages concretely."
        steps={[
          "Lead with the decision criteria: does this state represent something the user navigated to? Filters, search queries, active tabs, pagination, open modal IDs — these are all navigational. They belong in the URL.",
          "Name the three things you get for free: (1) refresh preserves state, (2) the URL is shareable with full context, (3) browser back/forward works without any extra code.",
          "Contrast with the useState cost: every time you choose useState for navigational state, you are manually rebuilding what the browser already does — and usually doing it worse.",
          "Describe the Server Component bonus: when filters live in searchParams, the server can run a filtered database query before sending any HTML. Zero client JavaScript needed for the filtering logic.",
          "Name when NOT to use URL state: highly ephemeral UI like hover tooltips, drag state, or animation progress. These update too frequently to push to the URL on every change.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Design the State Architecture for an Analytics Dashboard"
        scenario={
          <>
            You are building an analytics dashboard at <code>/dashboard/analytics</code>. The
            dashboard has four distinct state concerns that you need to wire up:
            <ol>
              <li>
                <strong>Filters panel</strong> — date range, metric type (revenue / signups /
                churn), and granularity (day / week / month). Users frequently share filtered
                views with teammates via Slack.
              </li>
              <li>
                <strong>Auth state</strong> — the currently logged-in user and their org-level
                permissions. Used in the sidebar, the chart legends, and the export button
                visibility logic.
              </li>
              <li>
                <strong>Live metrics tiles</strong> — four metric cards (total revenue, active
                users, conversion rate, churn). These need to update every 30 seconds without a
                page reload.
              </li>
              <li>
                <strong>Export modal</strong> — a modal that opens when the user clicks
                &quot;Export CSV&quot;, with format options and a progress indicator.
              </li>
            </ol>
            For each concern, choose the right state mechanism and justify it. Then describe how
            you would wire the initial server data into the live metrics tiles to avoid a loading
            flash on first render.
          </>
        }
        tasks={[
          "For each of the four state concerns, name the exact mechanism (URL searchParams, Zustand, React Context, SWR/React Query, Server Component, or use()) and explain why.",
          "Describe what happens to the filters when a user shares the URL with a colleague. Walk through the full render cycle when the colleague opens the link.",
          "Explain how you would prevent the live metrics tiles from showing a loading spinner on first render, given that the data comes from an authenticated API endpoint.",
          "The export modal only needs to exist while it is open. What is the simplest correct solution, and what would be over-engineering it?",
        ]}
      />

      <SolutionReveal>
        <p>
          <strong>Filters panel → URL searchParams.</strong> The sharing requirement is the
          deciding factor. Filters go in the URL:{" "}
          <code>/dashboard/analytics?range=30d&metric=revenue&granularity=week</code>. The Server
          Component reads <code>searchParams</code> as a prop and runs a filtered query before
          sending HTML — no loading state at all. When a colleague opens the link, Next.js renders
          the page server-side with the filters already applied. The client mounts with the correct
          data already in the DOM.
        </p>
        <p>
          <strong>Auth state → Zustand with context provider pattern.</strong> Auth state is global
          (used in sidebar, charts, export button) and needs to persist across navigations without
          re-fetching. Fetch the user server-side in the root layout, pass it as{" "}
          <code>initialUser</code> to the <code>UserStoreProvider</code>, and store it in Zustand.
          All Client Components read from the store. The server never needs to re-fetch it.
        </p>
        <p>
          <strong>Live metrics tiles → SWR with <code>fallbackData</code>.</strong> The Server
          Component fetches the initial metrics on the server and passes them as{" "}
          <code>fallbackData</code> to the SWR hook. On first render, SWR uses the server data —
          no loading spinner. After mount, it polls every 30 seconds. This is the core App Router
          SWR pattern: server for initial load, SWR for keeping it fresh.
        </p>
        <p>
          <strong>Export modal → local <code>useState</code> in a parent Client Component.</strong>{" "}
          The modal is ephemeral, local to one page, and does not need to survive refresh or be
          shared. A single <code>const [isOpen, setIsOpen] = useState(false)</code> in the
          dashboard&apos;s Client Component shell is the correct answer. Using Zustand or Context
          for this would be over-engineering: you are adding global machinery for local toggle state.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>App Router creates a hard server/client boundary.</strong> Server Components own
          data fetching and cannot hold state. Client Components own interactivity. The boundary is
          crossed with serialized props or the <code>children</code>-as-hole pattern.
        </li>
        <li>
          <strong>Never mark <code>layout.tsx</code> as a Client Component</strong> to wrap a
          store provider. Use a thin <code>Providers</code> client component with{" "}
          <code>children</code> as a prop instead — children stay server-rendered.
        </li>
        <li>
          <strong>Zustand module-level stores leak state across requests on the server.</strong>{" "}
          Use the factory pattern (<code>createStore</code> inside a function) + a context provider
          with <code>useRef</code> to scope one store per client session.
        </li>
        <li>
          <strong>URL state is the correct default for navigational state.</strong> Filters,
          pagination, active tabs, and search queries all belong in the URL — you get refresh
          survival, shareability, and back-button support for free.
        </li>
        <li>
          <strong>Pass <code>fallbackData</code> from Server Component to SWR</strong> to
          eliminate the initial loading flash. The server does the first fetch; SWR takes over for
          live updates.
        </li>
        <li>
          <strong>The <code>use()</code> hook streams a Promise from server to client</strong>{" "}
          without a client waterfall. The fetch starts on the server; the Suspense boundary handles
          the loading UI. Always prefer this over <code>useEffect</code> data fetching when the
          data originates on the server.
        </li>
      </ul>
    </div>
  );
}
