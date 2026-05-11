import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "rsc-rcc", title: "RSC vs Client Components", level: 2 },
  { id: "caching-questions", title: "Caching & Data Fetching", level: 2 },
  { id: "rendering-questions", title: "Rendering Strategies", level: 2 },
  { id: "routing-questions", title: "Routing & Navigation", level: 2 },
  { id: "server-actions-questions", title: "Server Actions", level: 2 },
  { id: "auth-questions", title: "Auth & Middleware", level: 2 },
  { id: "performance-questions", title: "Performance & Optimization", level: 2 },
  { id: "pages-vs-app", title: "Pages Router vs App Router", level: 2 },
  { id: "debugging-questions", title: "Common Bugs & Debugging", level: 2 },
  { id: "decision-matrix", title: "SSR vs SSG vs ISR vs CSR Decision Matrix", level: 2 },
];

function Q({
  q,
  ideal,
  example,
}: {
  q: string;
  ideal: string;
  example?: string;
}) {
  return (
    <div
      style={{
        marginBottom: "1.6rem",
        paddingLeft: "1rem",
        borderLeft: "2px solid #2a2a38",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#f0f0f5" }}>
        Q: {q}
      </p>
      <p style={{ marginBottom: example ? "0.45rem" : 0, color: "#a0a0b8" }}>
        <strong style={{ color: "#f0f0f5" }}>Ideal response:</strong> {ideal}
      </p>
      {example && (
        <pre style={{ marginTop: 0 }}>
          <code>{example}</code>
        </pre>
      )}
    </div>
  );
}

export default function NextjsInterviewQuestions() {
  return (
    <div className="article-content">
      <p>
        This module covers the 30+ questions you are most likely to face in a senior Next.js
        interview. Each question includes the ideal answer shape, the reasoning behind it, and
        a concrete code example. The goal is not to memorize but to build the mental models
        that let you answer variations of these questions fluently.
      </p>

      <ArticleTable caption="Coverage map — know which section to study first for your gaps." minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Frequency in interviews</th>
              <th>What a strong answer shows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>RSC vs Client Components</td>
              <td>Very high</td>
              <td>Deep understanding of the server/client boundary</td>
            </tr>
            <tr>
              <td>Caching</td>
              <td>Very high</td>
              <td>Can debug stale data and choose the right revalidation strategy</td>
            </tr>
            <tr>
              <td>Rendering strategies</td>
              <td>High</td>
              <td>Can choose the right strategy and explain ISR correctly</td>
            </tr>
            <tr>
              <td>Server Actions</td>
              <td>High</td>
              <td>Understands progressive enhancement and security rules</td>
            </tr>
            <tr>
              <td>Auth & Middleware</td>
              <td>High</td>
              <td>Knows edge constraints and the layered auth model</td>
            </tr>
            <tr>
              <td>Pages vs App Router</td>
              <td>Medium</td>
              <td>Can articulate the migration tradeoffs</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="rsc-rcc">RSC vs Client Components</h2>

      <Q
        q="What is a React Server Component and how does it differ from a regular (client) component?"
        ideal="A React Server Component runs only on the server and never ships its implementation code to the browser. It can be async, directly access databases and secrets, and has zero bundle cost. A Client Component runs on the server during SSR and then hydrates in the browser — it ships JavaScript to the client and can use hooks and browser APIs. In Next.js App Router, all components are Server Components by default; 'use client' opts into the client bundle."
        example={`// Server Component — async, zero bundle cost, direct DB access
async function ProductList() {
  const products = await db.product.findMany(); // server-only
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// Client Component — ships JS to browser, can use hooks
"use client";
function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>{added ? "Added" : "Add"}</button>;
}`}
      />

      <Q
        q="Can a Client Component import a Server Component?"
        ideal="No. A Client Component cannot import a Server Component because it would pull server code into the client bundle. However, a Client Component CAN receive a Server Component as children — the Server Component is rendered on the server and passed as pre-rendered React elements to the Client Component's children prop."
        example={`// ❌ Wrong — breaks the server component
"use client";
import { ServerData } from "./ServerData";
export function ClientWrapper() {
  return <ServerData />; // ServerData loses server-component status
}

// ✓ Correct — pass server component as children
// In the Server Component parent:
import { ClientWrapper } from "./ClientWrapper";
import { ServerData } from "./ServerData";

export default function Page() {
  return (
    <ClientWrapper>
      <ServerData /> {/* Rendered on server, passed as children */}
    </ClientWrapper>
  );
}`}
      />

      <Q
        q="What props can you safely pass from a Server Component to a Client Component?"
        ideal="Only serializable values: primitives (string, number, boolean), plain objects, arrays, and null/undefined. You cannot pass functions, class instances, React refs, or non-serializable objects. The props cross a serialization boundary — think of it like passing data through JSON.stringify."
        example={`// ✓ Serializable — safe
<ClientChart data={metrics} title="Revenue" enabled={true} />

// ✗ Not serializable — will throw
<ClientComponent
  onClick={() => {}}        // function
  ref={someRef}             // ref
  client={prismaClient}     // class instance
/>`}
      />

      <Q
        q="When would you use 'use client' and when would you not?"
        ideal="Use 'use client' only when you need interactivity (event handlers, useState, useEffect, useRef), browser APIs (window, localStorage, geolocation), or context (useContext). Avoid 'use client' for anything that can be server-only: data fetching, accessing secrets, DB queries, heavy computation that doesn't need user interaction. Keep Client Components small and at the leaves of your component tree."
        example={`// ✓ Good use of "use client" — needs browser API and state
"use client";
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return visible ? <button onClick={() => window.scrollTo(0, 0)}>Top</button> : null;
}

// ✗ Unnecessary "use client" — this is pure display, no browser APIs needed
"use client";
export function UserName({ name }: { name: string }) {
  return <span className="font-bold">{name}</span>;
  // Remove "use client" — this should be a Server Component
}`}
      />

      <h2 id="caching-questions">Caching & Data Fetching</h2>

      <Q
        q="Explain the four caching layers in Next.js."
        ideal="Request Memoization deduplicates identical fetch() calls within a single server render — if multiple components fetch the same URL in one request, only one HTTP call is made. The Data Cache persists fetch responses across requests and deployments — it's the ISR cache. The Full Route Cache stores rendered HTML and RSC payloads for static routes, making them CDN-servable with zero compute. The Router Cache is client-side and stores RSC payloads for recently visited routes, enabling instant back/forward navigation."
      />

      <Q
        q="What is the difference between fetch with next.revalidate and cache: no-store?"
        ideal="next.revalidate: N caches the response for N seconds then revalidates in the background — this is ISR. The user always gets a response immediately (either cached or freshly rendered), and stale-while-revalidate keeps the page fast. cache: no-store opts completely out of the Data Cache — every request fetches fresh data and makes the route dynamic. Use revalidate for content that changes occasionally, no-store for user-specific or real-time data."
        example={`// ISR — serves from cache for 60s, then revalidates in background
const data = await fetch("/api/products", { next: { revalidate: 60 } });

// Never cached — always fresh, route is always dynamic
const data = await fetch("/api/cart", { cache: "no-store" });

// Cached indefinitely — only revalidated by revalidateTag/revalidatePath
const data = await fetch("/api/config", { next: { tags: ["config"] } });`}
      />

      <Q
        q="Your mutation runs but the page still shows old data. How do you debug this?"
        ideal="There are three possible cache layers responsible. First, check the Router Cache — the browser is serving a stale RSC payload. Fix: call revalidatePath() from your Server Action (it also clears Router Cache), or router.refresh() from the client. Second, check the Data Cache — your fetch is cached. Fix: add revalidateTag() or revalidatePath() after the mutation. Third, check you're not testing in development mode — Next.js disables the Data Cache and Full Route Cache in dev. Test with pnpm build && pnpm start."
        example={`// Server Action — correct revalidation after mutation
"use server";
export async function updatePost(id: string, data: PostData) {
  await db.post.update({ where: { id }, data });
  revalidatePath(\`/posts/\${id}\`); // clears Full Route Cache + Router Cache for this path
  revalidateTag(\`post-\${id}\`);    // clears any tagged fetches for this post
}`}
      />

      <Q
        q="What is request memoization and how does it help?"
        ideal="Request memoization automatically deduplicates identical fetch() calls within a single server render. If your UserCard, UserSidebar, and UserBadge components all fetch /api/users/123, only one HTTP request is made. The subsequent calls hit an in-request cache. This lets you co-locate data fetching with the components that need it without worrying about duplicate network requests. It resets between requests — it's not persistent like the Data Cache."
        example={`// All three components can call this independently
async function getUser(id: string) {
  return fetch(\`/api/users/\${id}\`).then(r => r.json()); // memoized per request
}

// For non-fetch sources (DB queries), use React.cache():
import { cache } from "react";
const getUserFromDB = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});`}
      />

      <h2 id="rendering-questions">Rendering Strategies</h2>

      <Q
        q="What makes a Next.js route dynamic vs static?"
        ideal="A route is static by default. It becomes dynamic when it uses cookies(), headers(), or searchParams — these are called 'dynamic functions' and signal that the response depends on the incoming request. Fetches with cache: 'no-store' also make a route dynamic. Dynamic routes render on every request and bypass the Full Route Cache. You can override this with the dynamic config export."
        example={`// Static route (no dynamic functions)
export default async function Page() {
  const data = await fetch("/api/data").then(r => r.json());
  return <div>{data.title}</div>;
}

// Dynamic route (uses cookies)
import { cookies } from "next/headers";
export default async function Page() {
  const cookieStore = await cookies(); // makes this route dynamic
  const userId = cookieStore.get("user-id")?.value;
  // ...
}

// Force static or dynamic:
export const dynamic = "force-static";   // always static
export const dynamic = "force-dynamic";  // always dynamic`}
      />

      <Q
        q="Explain Partial Prerendering (PPR)."
        ideal="PPR (stable in Next.js 15) combines static and dynamic rendering in one route. The static shell — everything outside Suspense boundaries — is generated at build time and served from CDN instantly. The dynamic holes — components inside Suspense boundaries — stream from the server on each request. The user sees the static shell immediately (TTFB of a CDN), then dynamic content streams in. It's the best of SSG (instant shell) and SSR (fresh personalized content)."
        example={`// With PPR enabled, this page has a static shell and a dynamic section
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <StaticProductHeader /> {/* ← built at build time, served from CDN */}
      <Suspense fallback={<PricingSkeleton />}>
        <PersonalizedPricing productId={params.id} /> {/* ← streamed per request */}
      </Suspense>
    </div>
  );
}`}
      />

      <Q
        q="What is the difference between loading.tsx and Suspense?"
        ideal="loading.tsx is syntactic sugar — Next.js automatically wraps the page in a Suspense boundary using the loading.tsx content as the fallback. This means the loading state applies to the entire page. Manual Suspense boundaries give you granular control — you can show a skeleton for one slow section while the rest of the page renders immediately. For production apps, manual Suspense is usually better because it lets the fast parts arrive first."
        example={`// loading.tsx — wraps the ENTIRE page
export default function Loading() {
  return <FullPageSkeleton />;
}

// Manual Suspense — granular control, fast parts arrive first
export default function Page() {
  return (
    <div>
      <FastSection />  {/* renders immediately */}
      <Suspense fallback={<SlowSectionSkeleton />}>
        <SlowSection /> {/* streams in when ready */}
      </Suspense>
    </div>
  );
}`}
      />

      <h2 id="routing-questions">Routing & Navigation</h2>

      <Q
        q="In Next.js 15, how do you access route params and search params?"
        ideal="In Next.js 15, both params and searchParams are Promises and must be awaited. This is a breaking change from Next.js 14 where they were synchronous objects. Accessing them without await gives you a Promise object, not the actual values."
        example={`// Next.js 15 — must await params and searchParams
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page = "1" } = await searchParams;
  // ...
}

// Same for generateMetadata:
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug };
}`}
      />

      <Q
        q="What is the difference between redirect() and router.push()?"
        ideal="redirect() is a server-side function from next/navigation — it terminates the current server render and sends a redirect response. It's used in Server Components, Server Actions, and Route Handlers. router.push() is a client-side function from the useRouter() hook — it performs a client-side navigation by updating the Router Cache. Use redirect() for post-auth checks and post-mutation redirects in Server Actions. Use router.push() for user-triggered navigation in Client Components."
        example={`// Server Component — redirect() throws internally, stops server render
import { redirect } from "next/navigation";
export default async function ProtectedPage() {
  const session = await getSession();
  if (!session) redirect("/login"); // server-side redirect
}

// Client Component — router.push() for client navigation
"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await logout();
    router.push("/login");  // client-side navigation
  };
  return <button onClick={handleLogout}>Log out</button>;
}`}
      />

      <Q
        q="What are route groups and when do you use them?"
        ideal="Route groups are folders wrapped in parentheses — (groupName) — that organize routes without affecting the URL. They are useful for applying different layouts to routes at the same URL depth (e.g., a hub layout for /dashboard and /settings, but a marketing layout for / and /about), for creating multiple root layouts, and for organizing code without creating URL segments."
        example={`// src/app/
//   (hub)/
//     layout.tsx   ← sidebar layout
//     dashboard/page.tsx → /dashboard
//     settings/page.tsx  → /settings
//   (marketing)/
//     layout.tsx   ← minimal layout
//     page.tsx     → /
//     about/page.tsx → /about
//
// Both groups are at the same URL depth, but have completely different layouts.
// The folder names (hub) and (marketing) don't appear in the URL.`}
      />

      <h2 id="server-actions-questions">Server Actions</h2>

      <Q
        q="What is the difference between Server Actions and Route Handlers?"
        ideal="Server Actions are designed for React-integrated mutations — form submissions, button clicks, state updates from components. They integrate with useActionState, useFormStatus, useOptimistic, support progressive enhancement (work without JS), and automatically revalidate with revalidatePath/revalidateTag. Route Handlers are for external-facing HTTP APIs — webhooks, mobile apps, third-party integrations, file downloads, or when you need full control over HTTP semantics (status codes, content-type, streaming)."
      />

      <Q
        q="Are Server Actions secure by default? What do you need to do?"
        ideal="Next.js protects Server Actions against CSRF by validating the Origin header. However, they are not authenticated by default — they're POST endpoints anyone can call. Every Server Action must independently verify the session, check that the user is authorized to perform the action, and validate inputs. Do not rely on middleware for Server Action authorization — middleware protects pages, not individual actions."
        example={`"use server";
import { auth } from "@/lib/auth";

export async function deleteComment(commentId: string) {
  // Step 1: verify authentication
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Step 2: verify authorization (ownership)
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Step 3: perform mutation
  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/posts");
}`}
      />

      <Q
        q="How does useActionState work and why was it renamed from useFormState?"
        ideal="useActionState (React 19) manages the state returned by a Server Action. You wrap the action with useActionState, which returns the current state and a bound action function. The action receives prevState as its first argument (before formData). It was renamed from useFormState (react-dom) to useActionState (react) in React 19 to reflect that it works with any action, not just form actions."
        example={`// React 19 (Next.js 15)
import { useActionState } from "react";

const [state, formAction] = useActionState(myServerAction, initialState);

// React 18 (Next.js 14)
import { useFormState } from "react-dom";

const [state, formAction] = useFormState(myServerAction, initialState);

// The Server Action must accept prevState as first param:
export async function createPost(prevState: FormState, formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) return { error: "Title required" };
  await db.post.create({ data: { title } });
  return { success: true };
}`}
      />

      <h2 id="auth-questions">Auth & Middleware</h2>

      <Q
        q="Why can't middleware access a database directly?"
        ideal="Middleware runs on the Edge Runtime, which is a V8-based environment (like a Service Worker), not Node.js. TCP connections — required by all SQL databases and most ORMs (Prisma, pg, MySQL2) — are not available in the Edge Runtime. The Edge Runtime only has Web APIs (fetch, URL, TextEncoder, Web Crypto). For auth in middleware, use stateless JWT validation with the jose library. For anything requiring a DB, handle it in a Route Handler or Server Component (which run in Node.js)."
        example={`// ✓ Correct — stateless JWT validation at the edge
import { jwtVerify } from "jose"; // edge-compatible library

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("access-token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    await jwtVerify(token, secret); // stateless — no DB call
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}`}
      />

      <Q
        q="What is the difference between JWT sessions and database sessions in Next.js?"
        ideal="JWT sessions are stateless — the user's identity and claims are stored in a signed token in a cookie. Middleware can verify the JWT without a DB call, making it edge-compatible. The downside is you can't instantly revoke a JWT (it's valid until expiry). Database sessions store a session ID in the cookie and look up the session in the DB on every request — this means instant revocation but requires a DB hit and is not edge-compatible without HTTP-based databases."
      />

      <Q
        q="If middleware protects /dashboard, do Server Actions under /dashboard also need auth checks?"
        ideal="Yes. Middleware only protects page navigation — it does not protect Server Actions, which are POST requests that can be called independently of navigation. A malicious actor can call any Server Action directly with a POST request. Every Server Action must independently verify the session and check authorization for the specific resource being accessed."
      />

      <h2 id="performance-questions">Performance & Optimization</h2>

      <Q
        q="What does next/image actually optimize?"
        ideal="next/image handles four things: format optimization (automatically serving WebP/AVIF which are 30-50% smaller than JPEG/PNG), size optimization (generating multiple sizes and serving the right one based on the device via srcset), lazy loading by default (images below the fold don't load until they're near the viewport), and layout shift prevention (the dimensions are known, so the browser reserves space before the image loads). The sizes prop is critical for correct size selection — without it, the browser may download a much larger image than rendered."
        example={`<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, 400px"
  priority // add only for above-the-fold (LCP) images
/>`}
      />

      <Q
        q="How does dynamic import with ssr: false differ from React.lazy?"
        ideal="Both perform code splitting, but they have different SSR behavior. React.lazy always SSRs the component (renders it on the server, suspends). next/dynamic with ssr: false completely skips server rendering — the component is not rendered on the server at all, only on the client after hydration. Use React.lazy for components that should SSR with Suspense. Use dynamic(..., { ssr: false }) for browser-only components (maps, chart libraries that read window) that must not execute server-side."
        example={`// React.lazy — SSRs the component, suspends until the chunk loads
const Chart = lazy(() => import("./Chart"));
<Suspense fallback={<Skeleton />}><Chart /></Suspense>

// dynamic with ssr: false — client-only, no SSR
const MapView = dynamic(() => import("./MapView"), { ssr: false });
<MapView /> // renders nothing on server, hydrates in browser`}
      />

      <h2 id="pages-vs-app">Pages Router vs App Router</h2>

      <Q
        q="What are the main differences between Pages Router and App Router?"
        ideal="App Router introduces React Server Components (components run on the server by default), persistent nested layouts (layouts don't remount on navigation), file-based layout composition (layout.tsx, loading.tsx, error.tsx), Server Actions for mutations, and streaming with Suspense. Pages Router uses getServerSideProps/getStaticProps for data fetching, _app.tsx for global layout, and client-side data fetching patterns. App Router is the future — Pages Router is maintained but not receiving new features."
        example={`// Pages Router pattern
export async function getServerSideProps({ params }) {
  const data = await fetchData(params.slug);
  return { props: { data } };
}
export default function Page({ data }) { ... }

// App Router pattern
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchData(slug); // direct async in component
  return <div>{data.content}</div>;
}`}
      />

      <Q
        q="Can you use Pages Router and App Router in the same Next.js project?"
        ideal="Yes, during migration both can coexist. Files in src/pages/ use the Pages Router; files in src/app/ use the App Router. They cannot share the same routes, but they can share components, utilities, and libraries. When a route exists in both, App Router takes precedence. This allows incremental migration without a big-bang rewrite."
      />

      <Q
        q="What APIs from Pages Router do NOT exist in App Router?"
        ideal="getServerSideProps, getStaticProps, getStaticPaths, and getInitialProps are Pages Router only — they don't exist in App Router. In App Router, you do data fetching directly in async Server Components. next/head is replaced by the metadata export. useRouter from next/router is replaced by useRouter from next/navigation (different API). The _app.tsx and _document.tsx patterns are replaced by root layout.tsx."
      />

      <h2 id="debugging-questions">Common Bugs & Debugging</h2>

      <Q
        q="What causes a hydration error and how do you fix it?"
        ideal="Hydration errors happen when the HTML generated on the server doesn't match what React generates during hydration in the browser. Common causes: (1) Rendering values that differ between server and browser — timestamps, random numbers, window properties. (2) Accessing browser-only APIs (window, document) during SSR — they don't exist on the server. (3) Incorrect HTML nesting (e.g. p inside p). (4) Browser extensions injecting DOM nodes. Fix: gate browser-only rendering behind a mounted state, use suppressHydrationWarning for intentionally different values, or use next/dynamic with ssr: false for fully browser-dependent components."
        example={`// ❌ Hydration mismatch — timestamp differs
export function Timestamp() {
  return <span>{new Date().toLocaleTimeString()}</span>;
}

// ✓ Fix — render after mount only
"use client";
export function Timestamp() {
  const [time, setTime] = useState("");
  useEffect(() => { setTime(new Date().toLocaleTimeString()); }, []);
  return <span>{time || "..."}</span>;
}

// ✓ suppressHydrationWarning for intentional mismatches (rare)
<span suppressHydrationWarning>{serverRenderedTime}</span>`}
      />

      <Q
        q="Why does my Server Action mutation work in development but not in production?"
        ideal="The most common cause is that development mode disables caching, so mutations appear to work (the page re-fetches fresh data). In production, the Data Cache and Full Route Cache are active. If your Server Action doesn't call revalidatePath() or revalidateTag(), the cached data continues to be served. Always call the appropriate revalidation function after a mutation. Test cache behavior with pnpm build && pnpm start."
        example={`"use server";
export async function updateUser(id: string, data: UserUpdate) {
  await db.user.update({ where: { id }, data });
  // ← Without this, production shows stale data:
  revalidatePath(\`/users/\${id}\`);
  revalidateTag("users");
}`}
      />

      <Q
        q="What does 'cookies() should be awaited before using its value' mean?"
        ideal="In Next.js 15, cookies() and headers() from next/headers return Promises. You must await them before accessing the value. This is a breaking change from Next.js 14 where they were synchronous. Accessing properties on the Promise object directly returns undefined or throws — not the cookie value you expect."
        example={`// Next.js 14 (OLD)
const cookieStore = cookies(); // synchronous
const token = cookieStore.get("token")?.value;

// Next.js 15 (CORRECT)
const cookieStore = await cookies(); // must await
const token = cookieStore.get("token")?.value;`}
      />

      <Q
        q="Why is my Route Handler returning cached data when I expect fresh data?"
        ideal="GET Route Handlers are statically evaluated by default in Next.js — the response can be cached by the Full Route Cache. To make a Route Handler dynamic (run on every request), export const dynamic = 'force-dynamic' or use cookies()/headers() inside it. Alternatively, if the caller controls the fetch, add cache: 'no-store' to the fetch call."
        example={`// src/app/api/realtime-prices/route.ts
export const dynamic = "force-dynamic"; // run on every request

export async function GET() {
  const prices = await fetchLiveMarketData();
  return Response.json(prices);
}`}
      />

      <h2 id="decision-matrix">SSR vs SSG vs ISR vs CSR Decision Matrix</h2>
      <p>
        The rendering strategy question is a classic interview topic. Here is the complete
        decision logic:
      </p>

      <ArticleTable caption="Rendering strategy selection — use the leftmost strategy that meets your requirements." minWidth={1000}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>When to use</th>
              <th>Next.js mechanism</th>
              <th>Tradeoff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>SSG (Static)</strong></td>
              <td>Content doesn't change or changes only at deployment (docs, marketing, portfolio)</td>
              <td>Server Component with no dynamic functions + default caching</td>
              <td>Fastest, but stale after deployment until next build</td>
            </tr>
            <tr>
              <td><strong>ISR</strong></td>
              <td>Content changes occasionally but not per-user (blog, product catalog, news)</td>
              <td><code>next.revalidate</code> on fetch, or <code>revalidateTag()</code> on mutation</td>
              <td>Near-instant responses with eventual consistency</td>
            </tr>
            <tr>
              <td><strong>SSR (Dynamic)</strong></td>
              <td>Content is per-user, real-time, or changes too frequently for ISR (dashboard, cart, admin)</td>
              <td>Server Component with <code>cookies()</code>/<code>headers()</code> or <code>cache: "no-store"</code></td>
              <td>Always fresh, but server must compute on every request</td>
            </tr>
            <tr>
              <td><strong>PPR</strong></td>
              <td>Mix: static shell + dynamic personalized sections (e-commerce product pages)</td>
              <td>Static outer layout + Suspense boundaries around dynamic parts</td>
              <td>Best UX (instant shell + streamed personalization), requires Next.js 15+</td>
            </tr>
            <tr>
              <td><strong>CSR (Client-Side)</strong></td>
              <td>Highly interactive UIs, real-time updates, data that must not SSR (admin dashboard widgets)</td>
              <td>Client Component with <code>useEffect</code> + fetch, or SWR/React Query</td>
              <td>No SSR HTML — worse SEO and LCP, but full client-side control</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// Decision tree in code:

// 1. Does content change per-user? → SSR or CSR
import { cookies } from "next/headers"; // → SSR

// 2. Does content change occasionally but not per-user? → ISR
const data = await fetch("/api/products", { next: { revalidate: 3600 } }); // → ISR

// 3. Does content never change? → SSG
const data = await fetch("/api/config"); // → SSG (default force-cache)

// 4. Do you need the static shell instantly + dynamic sections? → PPR
// (requires Next.js 15 with ppr: true in next.config.ts)
<div>
  <StaticShell />
  <Suspense fallback={<Skeleton />}><DynamicSection /></Suspense>
</div>

// 5. Does it require browser APIs or user interaction before fetching? → CSR
"use client";
const { data } = useSWR("/api/notifications"); // CSR`}</code></pre>
    </div>
  );
}
