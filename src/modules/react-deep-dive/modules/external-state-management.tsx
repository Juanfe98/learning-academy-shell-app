import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const serverVsClientDiagram = String.raw`flowchart LR
  subgraph SERVER["Server State"]
    direction TB
    S1["Lives on a server"]
    S2["Async to access"]
    S3["Shared across sessions"]
    S4["Can become stale"]
    S5["Owned by the backend"]
  end
  subgraph CLIENT["Client State"]
    direction TB
    C1["Lives in the browser"]
    C2["Synchronous"]
    C3["Local to one session"]
    C4["Always fresh"]
    C5["Owned by the UI"]
  end
  SERVER -- "fetched via useQuery" --> CACHE["React Query Cache"]
  CACHE -- "components subscribe" --> COMP["React Components"]
  CLIENT -- "stored in Zustand / URL / useState" --> COMP`;

const duplicatedStateDiagram = String.raw`flowchart TD
  API["REST API / GraphQL"]

  subgraph WRONG["WRONG — duplicated state"]
    direction TB
    RQW["React Query Cache\n(source of truth #1)"]
    USW["useState in component\n(source of truth #2)"]
    RQW -->|"copied into"| USW
    USW -->|"stale, out-of-sync"| BW["Bug: stale UI after mutation"]
  end

  subgraph RIGHT["RIGHT — single source"]
    direction TB
    RQR["React Query Cache\n(one source of truth)"]
    RQR -->|"components read directly"| CR["UI always consistent"]
  end

  API --> RQW
  API --> RQR`;

export const toc: TocItem[] = [
  { id: "server-vs-client-state", title: "Server State vs Client State", level: 2 },
  { id: "tanstack-query", title: "TanStack Query (React Query)", level: 2 },
  { id: "query-keys", title: "Query Keys as a Contract", level: 3 },
  { id: "optimistic-updates", title: "Optimistic Updates with onMutate", level: 3 },
  { id: "zustand-patterns", title: "Zustand Patterns", level: 2 },
  { id: "slice-pattern", title: "The Slice Pattern", level: 3 },
  { id: "selector-anti-patterns", title: "Selector Anti-patterns", level: 3 },
  { id: "url-as-state", title: "URL as State", level: 2 },
  { id: "decision-matrix", title: "Decision Matrix", level: 2 },
  { id: "common-anti-patterns", title: "Common Anti-patterns", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Dashboard State Architecture", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ExternalStateManagement() {
  return (
    <div className="article-content">
      <p>
        The most common state management mistake in large React applications is not choosing the
        wrong library — it is treating all state as the same category of problem. When an interviewer
        asks &quot;how do you manage state in a large-scale React app?&quot;, they are really asking
        whether you understand the architectural distinction between{" "}
        <strong>server state</strong> and <strong>client state</strong>. These two categories have
        fundamentally different lifecycles, ownership models, and invalidation strategies. Getting
        that distinction right determines whether you reach for TanStack Query, Zustand, URL
        params, or plain <code>useState</code> — and each wrong choice at scale compounds into
        re-renders, stale data, and state synchronization bugs that are miserable to debug.
      </p>

      <h2 id="server-vs-client-state">Server State vs Client State</h2>

      <p>
        <strong>Server state</strong> is data that originates on a remote server, is fetched
        asynchronously, can be modified by other clients or background processes, and can become
        stale the moment it lands in your browser. Examples: a list of orders from your API, a
        user&apos;s profile from a database, search results. The defining characteristic is that
        you do not <em>own</em> this data — the server does. Your UI is a temporary, cached view
        of it.
      </p>

      <p>
        <strong>Client state</strong> is data that your application creates and owns entirely
        within the browser session. It is always synchronous, always fresh, and does not exist
        anywhere else. Examples: whether a modal is open, which tab is selected, a user&apos;s
        draft form input before submission, a theme preference stored locally. There is no server
        to become out of sync with.
      </p>

      <MermaidDiagram
        chart={serverVsClientDiagram}
        title="Server State vs Client State"
        caption="Server state requires async fetching, caching, and invalidation. Client state is synchronous and always up to date — these fundamentally different lifecycles call for different tools."
        minHeight={340}
      />

      <p>
        The architectural mistake that causes the most pain is managing server state as if it were
        client state — storing API responses in <code>useState</code> and manually triggering
        re-fetches. This forces you to re-implement caching, deduplication, background refresh,
        loading/error states, and stale detection from scratch. Libraries like TanStack Query
        exist precisely because this is hard to get right and teams kept writing it wrong.
      </p>

      <h2 id="tanstack-query">TanStack Query (React Query)</h2>

      <p>
        TanStack Query is not a state management library. It is a <strong>server state synchronization</strong>{" "}
        library. The distinction matters: it does not let you store arbitrary client state, it
        manages the lifecycle of asynchronous data — fetching, caching, background re-validation,
        and garbage collection.
      </p>

      <p>
        The two hooks you reach for most are <code>useQuery</code> for reads and{" "}
        <code>useMutation</code> for writes. Understanding <code>staleTime</code> and{" "}
        <code>gcTime</code> is where most teams go wrong.
      </p>

      <CodeBlock
        lang="tsx"
        code={`import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// staleTime: how long a cached result is considered fresh.
// During this window, React Query will NOT re-fetch — it serves from cache.
// Default is 0, meaning every mount triggers a background re-fetch.
// For relatively static data, setting this saves significant network traffic.

// gcTime (formerly cacheTime): how long an UNUSED cache entry is kept in memory
// before being garbage-collected. Default is 5 minutes.
// Once all components using a query unmount, the countdown starts.

const FIVE_MINUTES = 5 * 60 * 1000;

function useOrders(userId: string) {
  return useQuery({
    queryKey: ["orders", userId],       // cache key — see section below
    queryFn: () => fetchOrders(userId), // async function returning the data
    staleTime: FIVE_MINUTES,            // treat data as fresh for 5 min
    gcTime: 10 * 60 * 1000,            // keep cache for 10 min after unmount
  });
}

function OrderList({ userId }: { userId: string }) {
  const { data, isPending, isError, error } = useOrders(userId);

  if (isPending) return <Skeleton />;
  if (isError) return <ErrorMessage error={error} />;

  // data is typed — TypeScript infers the return type of fetchOrders
  return (
    <ul>
      {data.map(order => (
        <li key={order.id}>{order.title}</li>
      ))}
    </ul>
  );
}`}
      />

      <h3 id="query-keys">Query Keys as a Contract</h3>

      <p>
        Query keys are more than cache identifiers — they are a contract. React Query uses{" "}
        <code>JSON.stringify</code>-style structural equality on keys, which means{" "}
        <code>["orders", userId]</code> and <code>["orders", "user-123"]</code> are different
        cache entries when <code>userId</code> changes. This is intentional and powerful: your
        cache is automatically scoped to the parameters that make each query unique.
      </p>

      <CodeBlock
        lang="tsx"
        code={`// Hierarchical keys let you invalidate at different granularities.
// Invalidating ["orders"] invalidates ALL queries whose key starts with "orders".

const queryClient = useQueryClient();

// Invalidate a specific user's orders:
queryClient.invalidateQueries({ queryKey: ["orders", userId] });

// Invalidate ALL orders across all users (e.g., after a bulk operation):
queryClient.invalidateQueries({ queryKey: ["orders"] });

// Set data directly in cache (e.g., after a create mutation):
queryClient.setQueryData(["orders", userId], (old: Order[]) => [
  ...old,
  newOrder,
]);

// Prefetch before the user navigates to a page:
await queryClient.prefetchQuery({
  queryKey: ["orders", userId],
  queryFn: () => fetchOrders(userId),
});`}
      />

      <h3 id="optimistic-updates">Optimistic Updates with onMutate</h3>

      <p>
        Optimistic updates make UI feel instant by updating the cache before the server confirms
        the mutation. The <code>onMutate</code> callback runs synchronously before the request
        fires. The critical detail: you must save a snapshot and roll back on error, otherwise a
        network failure silently shows the user incorrect data.
      </p>

      <CodeBlock
        lang="tsx"
        code={`function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => api.completeOrder(orderId),

    onMutate: async (orderId) => {
      // 1. Cancel any in-flight refetches that would overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // 2. Snapshot the current cache so we can roll back on error.
      const previousOrders = queryClient.getQueryData<Order[]>(["orders"]);

      // 3. Apply the optimistic update immediately.
      queryClient.setQueryData<Order[]>(["orders"], (old = []) =>
        old.map(o => o.id === orderId ? { ...o, status: "completed" } : o)
      );

      // 4. Return snapshot in context — onError receives this.
      return { previousOrders };
    },

    onError: (_err, _orderId, context) => {
      // Roll back to the snapshot if the mutation fails.
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
    },

    onSettled: () => {
      // Always re-sync from the server after success or error.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}`}
      />

      <h2 id="zustand-patterns">Zustand Patterns</h2>

      <p>
        Zustand is the right tool for client state that is shared across components but does not
        come from a server. Think: the currently selected items in a multi-select, sidebar collapse
        state, a step in a multi-page wizard, or a shopping cart that has not been persisted yet.
        It is intentionally minimal — a store is just a function that returns state and actions.
      </p>

      <h3 id="slice-pattern">The Slice Pattern</h3>

      <p>
        As stores grow, the slice pattern keeps them maintainable. Each slice is a plain function
        with a consistent signature, and they are composed into one <code>create</code> call.
      </p>

      <CodeBlock
        lang="tsx"
        code={`import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";

// Each slice defines its own state shape and actions.
type FiltersSlice = {
  filters: { status: string; category: string };
  setFilter: (key: keyof FiltersSlice["filters"], value: string) => void;
  resetFilters: () => void;
};

type UISlice = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

type AppStore = FiltersSlice & UISlice;

const createFiltersSlice = (set: any): FiltersSlice => ({
  filters: { status: "all", category: "all" },
  setFilter: (key, value) =>
    set((state: AppStore) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () =>
    set({ filters: { status: "all", category: "all" } }),
});

const createUISlice = (set: any): UISlice => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
});

export const useAppStore = create<AppStore>()(
  persist(
    subscribeWithSelector((...a) => ({
      ...createFiltersSlice(...a),
      ...createUISlice(...a),
    })),
    {
      name: "app-store",
      // Only persist filters — not transient UI state like sidebarOpen.
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);`}
      />

      <h3 id="selector-anti-patterns">Selector Anti-patterns</h3>

      <p>
        The most common Zustand performance bug: selectors that return new object references on
        every call. Zustand uses strict equality (<code>Object.is</code>) to decide whether to
        re-render. If your selector computes a new object, the component re-renders on every
        store update — even if the underlying data did not change.
      </p>

      <CodeBlock
        lang="tsx"
        code={`// WRONG — returns a new object reference every time, causes constant re-renders.
const filters = useAppStore(state => ({
  status: state.filters.status,
  category: state.filters.category,
}));

// CORRECT option 1 — select primitives individually.
const status = useAppStore(state => state.filters.status);
const category = useAppStore(state => state.filters.category);

// CORRECT option 2 — use the shallow comparator for object selectors.
import { useShallow } from "zustand/react/shallow";

const filters = useAppStore(
  useShallow(state => ({
    status: state.filters.status,
    category: state.filters.category,
  }))
);

// subscribeWithSelector lets you react to state changes outside React —
// useful for driving non-React side effects (analytics, third-party libs).
useAppStore.subscribe(
  state => state.filters,
  (filters) => {
    analytics.track("filters_changed", filters);
  },
  { equalityFn: shallow, fireImmediately: false }
);`}
      />

      <h2 id="url-as-state">URL as State</h2>

      <p>
        For filter, sort, search, and pagination parameters, the URL is the correct state store —
        not <code>useState</code>, not Zustand. Putting this state in the URL gives you
        shareability (a copied URL reproduces the exact view), browser history navigation, and
        server-side rendering support for free. The most common mistake is building a data table
        with local filter state and then being asked &quot;why can&apos;t I share a link to this
        filtered view?&quot; in a code review.
      </p>

      <CodeBlock
        lang="tsx"
        code={`"use client";
// Note: useSearchParams requires a Client Component in Next.js App Router.

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    status: searchParams.get("status") ?? "all",
    category: searchParams.get("category") ?? "all",
    page: Number(searchParams.get("page") ?? "1"),
    sort: searchParams.get("sort") ?? "created_at",
  };

  const setFilter = useCallback(
    (key: string, value: string) => {
      // Build a new URLSearchParams from the current ones to preserve other params.
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 when filters change.
      if (key !== "page") params.set("page", "1");

      router.push(\`\${pathname}?\${params.toString()}\`);
    },
    [searchParams, router, pathname]
  );

  return { filters, setFilter };
}`}
      />

      <h2 id="decision-matrix">Decision Matrix</h2>

      <p>
        Choosing the wrong tool for a given category of state is how apps accumulate complexity.
        This matrix maps state categories to their correct home.
      </p>

      <ArticleTable
        caption="Use this matrix to pick the right state tool. The most common mistake is using useState or Context for server state that belongs in React Query."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>State type</th>
              <th>Examples</th>
              <th>Correct tool</th>
              <th>Why not the others</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Server / async data</strong></td>
              <td>API responses, search results, user profiles</td>
              <td><code>useQuery</code> (TanStack Query)</td>
              <td>useState loses caching, dedup, background refresh; Context re-renders all consumers</td>
            </tr>
            <tr>
              <td><strong>Shared client UI state</strong></td>
              <td>Cart, wizard step, multi-select, global modal</td>
              <td>Zustand</td>
              <td>Context re-renders every consumer; useState is local-only</td>
            </tr>
            <tr>
              <td><strong>Navigation / filter / sort / pagination</strong></td>
              <td>Table filters, search query, page number, sort order</td>
              <td>URL (<code>useSearchParams</code>)</td>
              <td>Local state loses shareability and back-button support</td>
            </tr>
            <tr>
              <td><strong>Local component state</strong></td>
              <td>Input value, toggle, hover, dropdown open</td>
              <td><code>useState</code> / <code>useReducer</code></td>
              <td>Overkill to put truly local state in a global store</td>
            </tr>
            <tr>
              <td><strong>Stable config / theme</strong></td>
              <td>Current user, locale, feature flags, theme</td>
              <td>React Context</td>
              <td>Changes infrequently — Context re-render cost is acceptable; no async needed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="common-anti-patterns">Common Anti-patterns</h2>

      <p>
        The single most expensive bug in React state management is{" "}
        <strong>duplicating server state into local state</strong>. It looks innocent — you fetch
        data with React Query and then copy it into a <code>useState</code> so you can &quot;modify
        it locally.&quot; Now you have two sources of truth. After a mutation, one source updates
        and the other does not. The user sees stale data until a full page reload.
      </p>

      <MermaidDiagram
        chart={duplicatedStateDiagram}
        title="The Duplicated State Anti-pattern"
        caption="Copying server state into useState creates two sources of truth. After a mutation, they diverge. Components should read directly from the React Query cache."
        minHeight={400}
      />

      <p>
        Other anti-patterns worth naming explicitly:
      </p>

      <ul>
        <li>
          <strong>Missing <code>staleTime</code>:</strong> The default is <code>0</code>, which
          means every component mount triggers a background re-fetch. For any data that does not
          need to be real-time, set an appropriate <code>staleTime</code> to prevent waterfall
          re-fetches on navigation.
        </li>
        <li>
          <strong>Using Context for server data:</strong> Fetching in a Context provider and
          distributing the result is a pattern that predates React Query. It has no caching,
          no deduplication, no background refresh, and causes every consumer to re-render on any
          change. Replace it with <code>useQuery</code>.
        </li>
        <li>
          <strong>Over-fetching with broad query keys:</strong> Using{" "}
          <code>["data"]</code> as a query key when you should be using{" "}
          <code>["orders", userId, filters]</code> means cache invalidation is too coarse —
          unrelated mutations flush shared cache entries.
        </li>
        <li>
          <strong>Putting everything in Zustand:</strong> Zustand is for client state. Using it
          to store API responses means you are building a manual cache without background refresh,
          deduplication, or garbage collection. Server state belongs in React Query.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title='How to answer: "How would you manage state in a large-scale React application?"'
        intro="Weak answers list tools (Redux, Context, Zustand). Strong answers start with the architectural distinction between server state and client state, then map tools to categories — showing the interviewer you understand why each tool exists, not just how to use it."
        steps={[
          "Open with the core distinction: server state (async, stale, server-owned) vs client state (synchronous, browser-owned). This frames everything that follows.",
          "Map tools to categories: TanStack Query for server state, Zustand for shared client state, URL params for navigation/filter state, useState for local component state, Context for stable config. Justify each choice — the interviewer wants to hear the tradeoffs, not just the answer.",
          "Name a real failure mode: 'The most common mistake I have seen is copying API responses into useState, which creates two sources of truth and causes stale UI after mutations. React Query's cache is the single source of truth for server data.'",
          "Close with a production implication: staleTime configuration, cache invalidation strategy on mutations, and how URL state enables sharable links — these signal you have shipped this at scale, not just read the docs.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge: Dashboard State Architecture</h2>

      <InterviewChallenge
        title="Design the State Architecture for an Analytics Dashboard"
        scenario={
          <>
            You are building an analytics dashboard with the following features: a data table
            showing orders (fetched from <code>/api/orders</code>), filter controls for status
            and date range, a sort control, pagination, a user preferences panel (theme, default
            page size) that persists across sessions, and a &quot;selected rows&quot; multi-select
            for bulk actions. The product team wants users to be able to share a link to any
            filtered/sorted view. You also need to handle the case where a bulk &quot;mark
            complete&quot; action should feel instant.
          </>
        }
        tasks={[
          "Categorize each piece of state: which category does it belong to (server state, shared client state, URL state, local state, config)?",
          "Select the correct tool for each category and justify why the alternatives are wrong for that specific case.",
          "Sketch the optimistic update flow for the 'mark complete' bulk action: what happens in onMutate, onError, and onSettled? What could go wrong if you skip the snapshot/rollback step?",
          "The filters, sort, and pagination state — what breaks if you store this in useState instead of the URL? What breaks if you store it in Zustand instead of the URL?",
        ]}
      />

      <SolutionReveal>
        <p><strong>State categorization and tool selection:</strong></p>
        <ul>
          <li>
            <strong>Orders data</strong> — server state. Use <code>useQuery</code> with a key of{" "}
            <code>["orders", filters, sort, page]</code> so every unique filter/sort/page
            combination has its own cache entry. Set <code>staleTime</code> to something
            reasonable (e.g., 30 seconds) — order lists do not need to be real-time.
          </li>
          <li>
            <strong>Filters, sort, pagination</strong> — URL state via <code>useSearchParams</code>.
            This is the only option that satisfies the shareable link requirement. Zustand would
            lose the state on hard refresh; useState would lose it on navigation. The URL is
            the correct store for anything a user might want to bookmark or share.
          </li>
          <li>
            <strong>Selected rows</strong> — local <code>useState</code> or Zustand if the
            selection needs to survive navigation. A <code>Set&lt;string&gt;</code> of IDs is
            sufficient. Do not put this in the URL — row selection is ephemeral UI state.
          </li>
          <li>
            <strong>User preferences (theme, page size)</strong> — Zustand with{" "}
            <code>persist</code> middleware writing to <code>localStorage</code>. This is
            client-owned state that needs to survive page reloads. If preferences are server-synced,
            they become server state and belong in <code>useQuery</code> with a mutation on save.
          </li>
        </ul>
        <p><strong>Optimistic update flow for bulk mark-complete:</strong></p>
        <ol>
          <li><code>onMutate</code>: cancel in-flight queries, snapshot current cache, apply optimistic update (map selected order IDs to status: &apos;completed&apos;), return snapshot.</li>
          <li><code>onError</code>: restore snapshot from context. Without this, a network failure leaves the UI permanently showing incorrect completed status.</li>
          <li><code>onSettled</code>: invalidate the orders query to re-sync from the server regardless of success or failure.</li>
        </ol>
        <p><strong>Why URL over Zustand for filters:</strong> Zustand would work for persistence during the session but breaks shareable links and browser back/forward navigation. The URL is the native browser state store for navigation parameters — using it is not a workaround, it is the correct abstraction.</p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          The architectural question behind every state management interview question is:
          is this server state or client state? Get that distinction right and tool selection
          follows logically.
        </li>
        <li>
          TanStack Query is not a state manager — it is a server state synchronization layer.
          Use it for anything that comes from an API. Do not copy its cache into{" "}
          <code>useState</code>.
        </li>
        <li>
          <code>staleTime</code> defaults to <code>0</code> — always configure it intentionally.
          Missing <code>staleTime</code> is the most common React Query performance problem in
          production.
        </li>
        <li>
          Optimistic updates require a rollback path. <code>onMutate</code> without{" "}
          <code>onError</code> rollback is a latent bug that only surfaces under network failure.
        </li>
        <li>
          Zustand selectors that return new object references cause continuous re-renders. Use
          primitive selectors or <code>useShallow</code> for object selectors.
        </li>
        <li>
          Filter, sort, and pagination state belongs in the URL, not in a state store. It is the
          only option that gives you shareability, SSR compatibility, and browser history for free.
        </li>
      </ul>
    </div>
  );
}
