import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-suspense-actually-does", title: "What Suspense Actually Does", level: 2 },
  { id: "suspense-boundaries-and-fallbacks", title: "Suspense Boundaries and Fallbacks", level: 2 },
  { id: "suspense-with-lazy-loading", title: "Suspense with Lazy Loading", level: 2 },
  { id: "suspense-with-data-fetching", title: "Suspense with Data Fetching", level: 2 },
  { id: "error-boundaries", title: "Error Boundaries", level: 2 },
  { id: "nested-suspense-boundaries", title: "Nested Suspense Boundaries", level: 2 },
  { id: "the-waterfall-problem", title: "The Waterfall Problem", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SuspenseAndDataFetching() {
  return (
    <div className="article-content">
      <p>
        Suspense is one of the most misunderstood React features — frequently described as
        &quot;data fetching support&quot; when it actually has nothing to do with fetching. Understanding
        the mechanism makes the API predictable and the current ecosystem constraints obvious.
      </p>

      <h2 id="what-suspense-actually-does">What Suspense Actually Does</h2>

      <p>
        Suspense is a mechanism for <strong>catching thrown Promises</strong>. When a component
        throws a Promise during rendering, React catches it, renders the nearest{" "}
        <code>Suspense</code> boundary&apos;s fallback, and waits for the Promise to resolve.
        When it resolves, React attempts to render the suspended component again. That is the
        entire mechanism.
      </p>

      <pre><code>{`// Suspense works by catching thrown Promises.
// This is a minimal illustration — not a pattern you'd use directly.
function SuspendingComponent({ resource }: { resource: Resource<string> }) {
  // resource.read() throws a Promise if data isn't ready yet.
  // React catches the thrown Promise and shows the fallback.
  // When the Promise resolves, React re-renders this component.
  const data = resource.read();
  return <div>{data}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuspendingComponent resource={dataResource} />
    </Suspense>
  );
}

// In practice you never write resource.read() yourself.
// React Query, SWR, Relay, and React's own use() hook handle
// the Promise-throwing protocol internally.`}</code></pre>

      <p>
        This &quot;throw a Promise&quot; protocol is intentionally low-level. You interact with
        Suspense through higher-level abstractions: <code>React.lazy</code> for code splitting,
        the <code>use()</code> hook in React 19, or data fetching libraries like React Query
        that support Suspense mode.
      </p>

      <h2 id="suspense-boundaries-and-fallbacks">Suspense Boundaries and Fallbacks</h2>

      <p>
        A <code>Suspense</code> component is a <em>boundary</em> — similar to a try/catch in
        JavaScript. Any Promise thrown anywhere in its subtree is caught at the nearest ancestor
        <code>Suspense</code> boundary. The fallback prop receives the JSX to display while
        waiting. Once all Promises in the subtree have resolved, React removes the fallback and
        renders the actual content.
      </p>

      <pre><code>{`// Suspense boundary placement determines loading granularity
function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      {/* Header loads immediately — not wrapped in Suspense */}
      <PageHeader />

      {/* Product details suspend independently */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails productId={productId} />
      </Suspense>

      {/* Reviews suspend independently — header and product don't wait for reviews */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsList productId={productId} />
      </Suspense>
    </div>
  );
}

// If both were wrapped in one Suspense boundary,
// you'd see one fallback until BOTH were ready.
// Split boundaries let sections appear as they load independently.`}</code></pre>

      <h2 id="suspense-with-lazy-loading">Suspense with Lazy Loading</h2>

      <p>
        <code>React.lazy</code> is the stable, well-established use case for Suspense. It wraps
        a dynamic <code>import()</code> and integrates with the Suspense protocol automatically.
        The module&apos;s Promise is thrown until the chunk loads, then the component renders.
      </p>

      <pre><code>{`import { lazy, Suspense } from "react";

// The component is only loaded when it's first rendered.
// The dynamic import() returns a Promise — React.lazy wraps it.
const HeavyChart = lazy(() => import("./components/HeavyChart"));
const RichTextEditor = lazy(() => import("./components/RichTextEditor"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

function Dashboard({ showEditor }: { showEditor: boolean }) {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>

      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          {/* RichTextEditor chunk is only downloaded when showEditor is true */}
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}

// Nested lazy loading: the parent resolves first, then children suspend individually.
// This is intentional — granular loading states are usually better UX than one big spinner.`}</code></pre>

      <h2 id="suspense-with-data-fetching">Suspense with Data Fetching</h2>

      <p>
        Suspense-integrated data fetching is the most discussed use case. In practice, you get
        this by using a library that implements the Suspense protocol — not by implementing it
        yourself. React Query, SWR, and Relay all support a Suspense mode. React Server
        Components do it natively (async components just <code>await</code> their data).
      </p>

      <pre><code>{`// React Query Suspense mode (v5+)
import { useSuspenseQuery } from "@tanstack/react-query";

// With useSuspenseQuery, the component suspends if data isn't cached.
// No more isLoading/isError checks inside the component.
function UserProfile({ userId }: { userId: string }) {
  // This will suspend if data isn't ready. TypeScript knows data is User here.
  const { data: user } = useSuspenseQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  // By the time we reach here, user is guaranteed to exist.
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}

// React Server Components (Next.js App Router)
// Async components on the server are the simplest form of Suspense integration:
async function ProductPage({ id }: { id: string }) {
  // Direct await — no useState, no useEffect, no hooks.
  const product = await fetchProduct(id);
  return <ProductDetails product={product} />;
}`}</code></pre>

      <h2 id="error-boundaries">Error Boundaries</h2>

      <p>
        Suspense catches thrown Promises (pending state). <strong>Error Boundaries</strong> are
        the error equivalent — class components that implement <code>componentDidCatch</code> to
        catch thrown Errors anywhere in their subtree. Together, Suspense and Error Boundaries
        form a complete loading/error handling strategy without <code>try/catch</code> in every
        component.
      </p>

      <pre><code>{`// Error Boundaries must be class components — there's no hook equivalent yet.
// In practice, use the react-error-boundary library instead of writing your own.
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function UserSection({ userId }: { userId: string }) {
  return (
    // Error boundary wraps Suspense — errors from loading OR rendering are caught.
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => { /* optionally invalidate the query cache */ }}
    >
      <Suspense fallback={<Skeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Error boundaries catch:
// - Errors thrown during rendering
// - Errors thrown in lifecycle methods (class components)
// - Errors thrown in the Suspense protocol (failed fetches)
//
// Error boundaries do NOT catch:
// - Errors in event handlers (use try/catch)
// - Errors in async callbacks (use try/catch)
// - Errors in the error boundary itself`}</code></pre>

      <h2 id="nested-suspense-boundaries">Nested Suspense Boundaries</h2>

      <p>
        Suspense boundaries compose. An inner boundary catches Promises from its subtree first.
        If no inner boundary exists, React walks up the tree to find the nearest ancestor
        boundary. This lets you provide high-fidelity fallbacks for specific sections while
        having a coarser catch-all at the route level.
      </p>

      <pre><code>{`function SettingsPage() {
  return (
    // Route-level catch-all: if anything breaks badly, the whole page shows this
    <Suspense fallback={<PageSpinner />}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfileSection />
      </Suspense>

      <Suspense fallback={<BillingSkeleton />}>
        <BillingSection />
      </Suspense>

      {/* No inner boundary: this section shows the route-level fallback */}
      <DangerZone />
    </Suspense>
  );
}

// Progressive loading with nested boundaries:
// 1. Page first renders with PageSpinner
// 2. ProfileSection loads → replaces its skeleton, rest still loading
// 3. BillingSection loads → replaces its skeleton
// 4. Never shows the outer PageSpinner again after initial load`}</code></pre>

      <h2 id="the-waterfall-problem">The Waterfall Problem</h2>

      <p>
        A waterfall occurs when a component fetches data and, only after that data arrives,
        renders children that fetch more data. Each fetch waits for the previous one to complete,
        creating a sequential chain when parallel requests were possible.
      </p>

      <pre><code>{`// WATERFALL: each layer waits for the parent's fetch to complete
function UserDashboard({ userId }: { userId: string }) {
  // 1. Fetch user first...
  const user = useSuspenseQuery({ queryKey: ["user", userId], queryFn: ... });

  return (
    // 2. Only when user loads do we start fetching their orders
    <Suspense fallback={<Skeleton />}>
      <UserOrders userId={user.data.id} />  {/* starts AFTER user fetch */}
    </Suspense>
  );
}

// SOLUTION 1: Hoist fetches to a parent that starts them in parallel
function UserDashboard({ userId }: { userId: string }) {
  // Both fetches start simultaneously — they don't depend on each other
  const userQuery = useSuspenseQuery({ queryKey: ["user", userId], queryFn: ... });
  const ordersQuery = useSuspenseQuery({ queryKey: ["orders", userId], queryFn: ... });

  return (
    <>
      <UserHeader user={userQuery.data} />
      <OrdersList orders={ordersQuery.data} />
    </>
  );
}

// SOLUTION 2: Prefetch on navigation (React Query)
// Start fetching as soon as the route becomes active,
// before any component renders.
router.on("navigate", ({ params }) => {
  queryClient.prefetchQuery({ queryKey: ["user", params.userId], ... });
  queryClient.prefetchQuery({ queryKey: ["orders", params.userId], ... });
});`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Suspense catches thrown Promises — data fetching libraries implement this protocol, not you</li>
        <li>Suspense boundaries are like try/catch: the nearest ancestor boundary catches the thrown Promise</li>
        <li><code>React.lazy</code> is Suspense for code splitting — the most stable, widely-used application</li>
        <li>Use library-provided Suspense support (React Query, SWR) rather than implementing the Promise protocol yourself</li>
        <li>Error Boundaries are the error equivalent of Suspense — use <code>react-error-boundary</code> library</li>
        <li>Nest Suspense boundaries to achieve granular, independent loading states</li>
        <li>Prevent waterfalls by starting parallel fetches as high in the tree as possible</li>
      </ul>

      <p>
        The next module covers React&apos;s <strong>concurrent features</strong> — the scheduler
        that makes rendering interruptible, and the <code>useTransition</code> and{" "}
        <code>useDeferredValue</code> APIs that let you keep the UI responsive during heavy updates.
      </p>
    </div>
  );
}
