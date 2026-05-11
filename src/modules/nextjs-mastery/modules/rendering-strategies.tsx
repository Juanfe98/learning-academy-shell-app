import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const csrLifecycleDiagram = String.raw`sequenceDiagram
  participant B as Browser
  participant S as CDN / Server
  participant A as API

  B->>S: GET /products (TTFB starts)
  S-->>B: HTML shell (no content, just <div id="root"> + JS bundle links)
  Note over B: FCP: browser paints empty shell
  B->>S: Download JS bundle
  S-->>B: React + page bundle
  Note over B: JS parses and executes
  B->>A: fetch("/api/products") from useEffect
  A-->>B: JSON data
  Note over B: React re-renders with data — user sees content`;

const ssrLifecycleDiagram = String.raw`sequenceDiagram
  participant B as Browser
  participant S as Next.js Server
  participant D as Database / API

  B->>S: GET /products (TTFB starts)
  S->>D: Fetch data on the server
  D-->>S: Data returned
  Note over S: React renders full HTML with data
  S-->>B: Complete HTML with content (TTFB ends)
  Note over B: FCP: browser paints real content immediately
  B->>S: Download React hydration bundle
  S-->>B: Hydration JS
  Note over B: React attaches event listeners — page is interactive`;

const isrFlowDiagram = String.raw`flowchart TD
  REQ["Incoming request to /product/42"]
  CACHED{"Is cached HTML\nfresh (within revalidate window)?"}
  SERVE["Serve cached HTML instantly\n(CDN edge — near-zero latency)"]
  STALE{"Has the revalidate window\nelapsed since last build?"}
  TRIGGER["Trigger background revalidation\n(this request still gets stale HTML)"]
  REGEN["Origin server re-runs\ngetStaticProps / fetch with revalidate"]
  UPDATE["Update cache with new HTML\n(all subsequent requests get fresh content)"]

  REQ --> CACHED
  CACHED -->|"Yes"| SERVE
  CACHED -->|"No — not yet built"| REGEN
  SERVE --> STALE
  STALE -->|"No"| SERVE
  STALE -->|"Yes"| TRIGGER
  TRIGGER --> SERVE
  TRIGGER --> REGEN
  REGEN --> UPDATE`;

export const toc: TocItem[] = [
  { id: "mental-model", title: "The 4 Rendering Strategies", level: 2 },
  { id: "csr", title: "CSR — Client-Side Rendering", level: 2 },
  { id: "csr-pages-router", title: "CSR in the Pages Router", level: 3 },
  { id: "csr-app-router", title: "CSR in the App Router", level: 3 },
  { id: "ssr", title: "SSR — Server-Side Rendering", level: 2 },
  { id: "ssr-pages-router", title: "SSR in the Pages Router", level: 3 },
  { id: "ssr-app-router", title: "SSR in the App Router", level: 3 },
  { id: "ssg", title: "SSG — Static Site Generation", level: 2 },
  { id: "ssg-pages-router", title: "SSG in the Pages Router", level: 3 },
  { id: "ssg-app-router", title: "SSG in the App Router", level: 3 },
  { id: "isr", title: "ISR — Incremental Static Regeneration", level: 2 },
  { id: "isr-pages-router", title: "ISR in the Pages Router", level: 3 },
  { id: "isr-app-router", title: "ISR in the App Router", level: 3 },
  { id: "hybrid-patterns", title: "Hybrid Rendering Patterns", level: 2 },
  { id: "decision-matrix", title: "Decision Matrix", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RenderingStrategies() {
  return (
    <div className="article-content">
      <p>
        Every Next.js page makes a fundamental decision: when is the HTML generated, and by whom?
        The answer determines your page&apos;s performance, SEO, infrastructure cost, and how
        fresh the data is. There are four strategies — CSR, SSR, SSG, and ISR — arranged on a
        spectrum from fully static (fastest, least fresh) to fully dynamic (slowest, always
        fresh). Knowing not just what each strategy does, but <em>exactly when to use it</em>, is
        the mark of a senior Next.js engineer.
      </p>

      <h2 id="mental-model">The 4 Rendering Strategies</h2>
      <p>
        Think of the spectrum as a tradeoff between <strong>performance</strong> and{" "}
        <strong>data freshness</strong>. Static content is fast because it is pre-built and served
        directly from a CDN. Dynamic content is fresh because it is generated per request — but it
        costs a server roundtrip every time.
      </p>

      <ArticleTable
        caption="The four rendering strategies mapped to where rendering happens and when."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Rendered where</th>
              <th>Rendered when</th>
              <th>Spectrum position</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>CSR</strong> — Client-Side Rendering
              </td>
              <td>Browser (client)</td>
              <td>After JS loads, on every visit</td>
              <td>Fully dynamic (client-driven)</td>
            </tr>
            <tr>
              <td>
                <strong>SSR</strong> — Server-Side Rendering
              </td>
              <td>Next.js server</td>
              <td>On every request</td>
              <td>Fully dynamic (server-driven)</td>
            </tr>
            <tr>
              <td>
                <strong>SSG</strong> — Static Site Generation
              </td>
              <td>Build server</td>
              <td>Once at build time</td>
              <td>Fully static</td>
            </tr>
            <tr>
              <td>
                <strong>ISR</strong> — Incremental Static Regeneration
              </td>
              <td>Build server + background server</td>
              <td>Build time, then periodically</td>
              <td>Static with controlled freshness</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        The most important insight: <strong>most production pages should not use a single
        strategy</strong>. A product page might statically render the product details (SSG/ISR),
        dynamically fetch live inventory (SSR or CSR), and show personalized recommendations
        entirely on the client (CSR). The ability to compose strategies within a single page is
        the App Router&apos;s most powerful capability.
      </p>

      <h2 id="csr">CSR — Client-Side Rendering</h2>
      <p>
        CSR is what React applications did before Next.js existed. The server sends a nearly empty
        HTML shell — just enough to load the JavaScript bundle. The browser downloads the bundle,
        executes it, and React fetches data and renders the page entirely in the browser. CSR is
        the biggest gap in many Next.js developers&apos; mental model because Next.js is marketed
        as a server-rendering framework — but CSR is a critical tool for the right use cases.
      </p>
      <p>
        Use CSR for data that is <strong>user-specific</strong> (no two users see the same
        thing), <strong>highly interactive</strong> (dashboards, live charts, real-time feeds),
        or <strong>not SEO-critical</strong> (logged-in pages that search engines should not
        index). CSR keeps your server costs near zero for that data and moves the rendering load
        to the client.
      </p>

      <MermaidDiagram
        chart={csrLifecycleDiagram}
        title="CSR Request Lifecycle"
        caption="The key observation: TTFB is fast because the server sends almost nothing. But FCP (first content) is delayed — the user sees a blank page or skeleton until the JS fetches and renders data. On slow connections, this gap is painful."
        minHeight={480}
      />

      <p>
        The most common CSR failure modes are: a <strong>blank page flash</strong> while data
        loads (skeleton states are non-optional for good UX), <strong>SEO blindness</strong> since
        search engines may not execute your JavaScript, and <strong>slow performance on low-end
        devices or bad connections</strong> because the full bundle must download and parse before
        anything renders.
      </p>

      <h3 id="csr-pages-router">CSR in the Pages Router</h3>
      <p>
        In the Pages Router, CSR is implemented with <code>useEffect</code> + <code>fetch</code>,
        or a data-fetching library like SWR or React Query. The page component does not export
        <code>getServerSideProps</code> or <code>getStaticProps</code> — the server sends a static
        shell and data fetching happens entirely on the client.
      </p>

      <pre>
        <code>{`// pages/dashboard.tsx — pure CSR with useEffect
import { useState, useEffect } from "react";

interface DashboardData {
  revenue: number;
  users: number;
  orders: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
      })
      .then((json: DashboardData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []); // empty dependency array: runs once after mount

  if (loading) return <DashboardSkeleton />; // ALWAYS handle loading state
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Revenue: \${data.revenue.toLocaleString()}</p>
      <p>Users: {data.users.toLocaleString()}</p>
      <p>Orders: {data.orders.toLocaleString()}</p>
    </div>
  );
}

// No getServerSideProps or getStaticProps — page exports only the component`}</code>
      </pre>

      <p>
        The <code>useEffect</code> pattern works but has limitations: no automatic caching,
        no deduplication, and manual loading/error state management. For production CSR, use SWR
        or React Query.
      </p>

      <pre>
        <code>{`// pages/dashboard.tsx — CSR with SWR (recommended)
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardData {
  revenue: number;
  users: number;
  orders: number;
}

export default function Dashboard() {
  // SWR handles: loading state, error state, caching, deduplication,
  // focus revalidation, and polling — all out of the box
  const { data, error, isLoading } = useSWR<DashboardData>(
    "/api/dashboard-stats",
    fetcher,
    {
      refreshInterval: 30_000, // re-fetch every 30 seconds (live dashboard)
      revalidateOnFocus: true,  // re-fetch when the tab regains focus
    }
  );

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div>Error loading stats</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Revenue: \${data!.revenue.toLocaleString()}</p>
    </div>
  );
}

// pages/dashboard.tsx — CSR with React Query
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/dashboard-stats").then((r) => r.json()),
    staleTime: 30_000,        // consider data fresh for 30 seconds
    refetchInterval: 60_000,  // background re-fetch every 60 seconds
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div>Error loading stats</div>;

  return <DashboardUI data={data} />;
}`}</code>
      </pre>

      <h3 id="csr-app-router">CSR in the App Router</h3>
      <p>
        CSR in the App Router works exactly the same way — you just add the{" "}
        <code>&quot;use client&quot;</code> directive. Client Components can use <code>useState</code>,{" "}
        <code>useEffect</code>, SWR, or React Query. The key difference is that you now get to
        choose <em>which parts</em> of your page are CSR versus static — not the whole page.
      </p>

      <pre>
        <code>{`// src/components/LiveStats.tsx — a CSR widget inside an otherwise static page
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Stats {
  onlineUsers: number;
  activeSessions: number;
}

export function LiveStats() {
  const { data, isLoading } = useSWR<Stats>("/api/live-stats", fetcher, {
    refreshInterval: 5_000, // poll every 5 seconds
  });

  if (isLoading) return <StatsSkeleton />;

  return (
    <div className="live-stats">
      <span>{data?.onlineUsers} users online</span>
      <span>{data?.activeSessions} active sessions</span>
    </div>
  );
}

// src/app/dashboard/page.tsx — Server Component with a CSR widget embedded
// This page is SERVER-rendered by default (no "use client")
export default async function DashboardPage() {
  // This fetch runs on the server — fast, no client JS needed
  const summary = await fetch("https://api.example.com/summary").then((r) =>
    r.json()
  );

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Static server-rendered section */}
      <MonthlySummary data={summary} />
      {/* CSR widget — client fetches and polls independently */}
      <LiveStats />
    </div>
  );
}`}</code>
      </pre>

      <h2 id="ssr">SSR — Server-Side Rendering</h2>
      <p>
        SSR generates fresh HTML on the server for every incoming request. The browser receives
        complete, content-rich HTML — no blank page flash, no waiting for a JS bundle to fetch
        data. This is ideal for pages where content is personalized (different for every user),
        highly dynamic (changes per request), or SEO-critical with fresh data.
      </p>
      <p>
        The cost is real: every page load hits your origin server. Under high traffic, SSR
        requires significant server capacity. The most common SSR mistake is using it for pages
        where ISR or SSG would deliver the same freshness at a fraction of the cost.
      </p>

      <MermaidDiagram
        chart={ssrLifecycleDiagram}
        title="SSR Request Lifecycle"
        caption="TTFB is higher than static because the server must fetch data and render before responding. But unlike CSR, FCP is immediate — the browser receives real content and can paint it without downloading a JS bundle first."
        minHeight={480}
      />

      <h3 id="ssr-pages-router">SSR in the Pages Router</h3>
      <p>
        In the Pages Router, SSR is implemented with <code>getServerSideProps</code>. It runs on
        every request, has access to the raw HTTP request via <code>context.req</code>, and its
        return value is injected into the page component as props. See the Pages Router module for
        the deep-dive on the <code>context</code> object and performance pitfalls.
      </p>

      <pre>
        <code>{`// pages/account/[id].tsx — SSR with getServerSideProps
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

interface Account {
  id: string;
  balance: number;
  recentTransactions: Transaction[];
}

export const getServerSideProps = (async (context) => {
  // Access session cookie from the raw request — not possible with SSG
  const sessionToken = context.req.cookies["session-token"];
  if (!sessionToken) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const account = await fetchAccountData(sessionToken, context.params!.id as string);
  if (!account) return { notFound: true };

  return {
    props: { account },
    // No revalidate here — SSR never caches, always runs fresh
  };
}) satisfies GetServerSideProps;

export default function AccountPage({
  account,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div>
      <h1>Account Balance: \${account.balance.toFixed(2)}</h1>
      <TransactionList transactions={account.recentTransactions} />
    </div>
  );
}`}</code>
      </pre>

      <h3 id="ssr-app-router">SSR in the App Router</h3>
      <p>
        In the App Router, there is no <code>getServerSideProps</code>. Instead, dynamic rendering
        is triggered by calling <code>cookies()</code>, <code>headers()</code>, or using{" "}
        <code>fetch</code> with <code>cache: &apos;no-store&apos;</code>. You can also force
        dynamic rendering explicitly with the <code>dynamic</code> route segment config export.
      </p>

      <pre>
        <code>{`// src/app/account/[id]/page.tsx — SSR equivalent in the App Router
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Option 1: cookies() call automatically makes this route dynamic (SSR)
export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies(); // this line opts the route into SSR
  const sessionToken = cookieStore.get("session-token")?.value;

  if (!sessionToken) redirect("/login");

  // fetch with cache: "no-store" also forces fresh data on every request
  const res = await fetch(\`https://api.example.com/accounts/\${id}\`, {
    cache: "no-store",
    headers: { Authorization: \`Bearer \${sessionToken}\` },
  });

  if (!res.ok) return <div>Account not found</div>;

  const account = await res.json();

  return (
    <div>
      <h1>Account Balance: \${account.balance.toFixed(2)}</h1>
      <TransactionList transactions={account.recentTransactions} />
    </div>
  );
}

// Option 2: explicit SSR via route segment config
// export const dynamic = "force-dynamic";
// This forces dynamic rendering even if you don't use cookies() or headers()`}</code>
      </pre>

      <h2 id="ssg">SSG — Static Site Generation</h2>
      <p>
        SSG pre-renders pages at build time. The output is pure HTML and static assets that can
        be served from a CDN edge with near-zero latency. There is no server involved at runtime —
        the CDN serves the pre-built file directly to the browser. SSG is the fastest possible
        rendering strategy and should be the default when data does not change per user and
        staleness is acceptable.
      </p>

      <h3 id="ssg-pages-router">SSG in the Pages Router</h3>
      <p>
        Static generation uses <code>getStaticProps</code> for data fetching at build time, and{" "}
        <code>getStaticPaths</code> for dynamic routes to declare which paths to pre-render. Pages
        without either export are automatically statically generated (no data needed).
      </p>

      <pre>
        <code>{`// pages/blog/[slug].tsx — SSG with getStaticProps + getStaticPaths
import type { GetStaticProps, GetStaticPaths, InferGetStaticPropsType } from "next";

interface Post {
  slug: string;
  title: string;
  content: string;
  publishedAt: string;
}

// 1. Declare which paths to pre-build
export const getStaticPaths = (async () => {
  const posts = await fetch("https://cms.example.com/posts").then((r) => r.json());
  return {
    paths: posts.map((p: Post) => ({ params: { slug: p.slug } })),
    fallback: "blocking", // on-demand generation for paths not pre-built
  };
}) satisfies GetStaticPaths;

// 2. Fetch data at build time for each path
export const getStaticProps = (async (context) => {
  const { slug } = context.params as { slug: string };
  const post: Post = await fetch(
    \`https://cms.example.com/posts/\${slug}\`
  ).then((r) => r.json());

  if (!post) return { notFound: true };

  return { props: { post } };
  // No revalidate = page is static forever until next build
}) satisfies GetStaticProps;

export default function BlogPost({
  post,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>Published: {post.publishedAt}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}`}</code>
      </pre>

      <h3 id="ssg-app-router">SSG in the App Router</h3>
      <p>
        In the App Router, <strong>static generation is the default behavior</strong>. Any Server
        Component that does not call <code>cookies()</code>, <code>headers()</code>, or use{" "}
        <code>cache: &apos;no-store&apos;</code> is automatically statically rendered at build
        time. For dynamic routes, export <code>generateStaticParams</code> (the App Router
        equivalent of <code>getStaticPaths</code>).
      </p>

      <pre>
        <code>{`// src/app/blog/[slug]/page.tsx — SSG in the App Router
// generateStaticParams replaces getStaticPaths
export async function generateStaticParams() {
  const posts = await fetch("https://cms.example.com/posts").then((r) =>
    r.json()
  );
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

// dynamicParams controls what happens for paths NOT in generateStaticParams
// true (default): render on-demand the first time, then cache
// false: return 404 for unknown params
export const dynamicParams = true;

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // No cache option = force-cache by default on static routes
  // This fetch runs at build time and the result is baked into the HTML
  const post = await fetch(\`https://cms.example.com/posts/\${slug}\`).then((r) =>
    r.json()
  );

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}`}</code>
      </pre>

      <h2 id="isr">ISR — Incremental Static Regeneration</h2>
      <p>
        ISR is the pragmatic sweet spot between SSG and SSR. Pages are pre-built and served from
        the CDN like SSG — but they are automatically regenerated in the background after a
        configurable time window. The model is <strong>stale-while-revalidate</strong>: users
        always get a fast cached response, and the cache is refreshed transparently behind the
        scenes.
      </p>
      <p>
        The key insight about ISR: the user who triggers a revalidation does not wait. They
        receive the stale cached page immediately. The background regeneration runs server-side,
        and the <em>next</em> user after regeneration completes gets the fresh page. Maximum
        staleness is approximately equal to the <code>revalidate</code> interval.
      </p>

      <MermaidDiagram
        chart={isrFlowDiagram}
        title="ISR Stale-While-Revalidate Flow"
        caption="The triggering request gets the stale page instantly. Revalidation happens asynchronously in the background. This is why ISR can serve millions of requests with near-zero origin load while staying reasonably fresh."
        minHeight={500}
      />

      <h3 id="isr-pages-router">ISR in the Pages Router</h3>
      <p>
        Add a <code>revalidate</code> field to <code>getStaticProps</code>&apos; return value.
        The value is the number of seconds before the background regeneration is triggered.
      </p>

      <pre>
        <code>{`// pages/products/[id].tsx — ISR with getStaticProps
import type { GetStaticProps, GetStaticPaths } from "next";

export const getStaticPaths = (async () => {
  // Only pre-build the top 1000 most popular products
  const topProducts = await db.product.findMany({
    take: 1000,
    orderBy: { views: "desc" },
    select: { id: true },
  });
  return {
    paths: topProducts.map((p) => ({ params: { id: p.id } })),
    fallback: "blocking", // build remaining products on first request
  };
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
  const { id } = context.params as { id: string };
  const product = await db.product.findUnique({ where: { id } });

  if (!product) return { notFound: true };

  return {
    props: { product },
    revalidate: 300, // regenerate at most once every 5 minutes
    // A product page that changes prices daily can tolerate 5 minutes of staleness
    // while serving millions of requests from CDN cache
  };
}) satisfies GetStaticProps;

// On-demand ISR: skip the time window entirely from an API route
// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.secret !== process.env.REVALIDATION_SECRET) {
    return res.status(401).json({ message: "Invalid token" });
  }
  // Call this webhook from your CMS when a product is updated
  await res.revalidate(\`/products/\${req.query.id}\`);
  return res.json({ revalidated: true });
}`}</code>
      </pre>

      <h3 id="isr-app-router">ISR in the App Router</h3>
      <p>
        In the App Router, ISR is configured via the <code>next: {"{ revalidate: N }"}</code>{" "}
        option on individual <code>fetch()</code> calls, or via the <code>revalidate</code> route
        segment config export which applies to all fetches in that route.
      </p>

      <pre>
        <code>{`// src/app/products/[id]/page.tsx — ISR in the App Router

// Option 1: route-level revalidate (applies to all fetches in this route)
export const revalidate = 300; // regenerate at most every 5 minutes

export async function generateStaticParams() {
  const topProducts = await db.product.findMany({ take: 1000, select: { id: true } });
  return topProducts.map((p) => ({ id: p.id }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Option 2: fetch-level revalidate (more granular — different TTLs per data source)
  const product = await fetch(\`https://api.example.com/products/\${id}\`, {
    next: { revalidate: 300, tags: [\`product-\${id}\`, "products"] },
  }).then((r) => r.json());

  // On-demand revalidation from a Server Action:
  // import { revalidateTag } from "next/cache";
  // revalidateTag(\`product-\${id}\`); // purges the cache for this specific product

  return <ProductDetails product={product} />;
}`}</code>
      </pre>

      <h2 id="hybrid-patterns">Hybrid Rendering Patterns</h2>
      <p>
        The App Router&apos;s most powerful capability is that a single page is not locked into
        one rendering strategy. Because the server/client boundary is at the component level (not
        the page level), you can compose multiple strategies within a single URL. The outer page
        shell can be statically generated, an inner section can be dynamically server-rendered,
        and a widget can be entirely client-rendered — all coexisting in the same component tree.
      </p>
      <p>
        The canonical example is an e-commerce product page: the product name, description, and
        images are static (ISR). The live stock count is dynamic (SSR via Suspense). Personalized
        recommendations are fetched on the client (CSR, because they are user-specific and do not
        affect SEO).
      </p>

      <pre>
        <code>{`// src/app/products/[id]/page.tsx — hybrid rendering composition
import { Suspense } from "react";

// This Server Component is statically rendered (ISR, revalidate every 5 minutes)
export const revalidate = 300;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Static: baked into HTML at build time, served from CDN
  const product = await fetch(\`https://api.example.com/products/\${id}\`, {
    next: { revalidate: 300, tags: [\`product-\${id}\`] },
  }).then((r) => r.json());

  return (
    <div>
      {/* Static section — pre-rendered, SEO-friendly */}
      <ProductHeader product={product} />
      <ProductDescription description={product.description} />

      {/* Dynamic section — rendered per request, isolated in a Suspense boundary */}
      {/* This component calls cookies(), forcing it and only it into SSR */}
      <Suspense fallback={<StockSkeleton />}>
        <LiveStockCount productId={id} />
      </Suspense>

      {/* CSR section — fetched entirely in the browser */}
      {/* PersonalizedRecommendations is a Client Component ("use client") */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <PersonalizedRecommendations productId={id} />
      </Suspense>
    </div>
  );
}

// src/components/LiveStockCount.tsx — dynamic Server Component
import { cookies } from "next/headers";

async function LiveStockCount({ productId }: { productId: string }) {
  // cookies() opts ONLY this component into dynamic rendering (SSR)
  // The parent page shell stays static
  await cookies(); // read cookies to get region/locale for stock

  const stock = await fetch(\`https://api.example.com/stock/\${productId}\`, {
    cache: "no-store", // always fresh
  }).then((r) => r.json());

  return <div>{stock.available} in stock</div>;
}

// src/components/PersonalizedRecommendations.tsx — CSR component
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PersonalizedRecommendations({ productId }: { productId: string }) {
  // Fetches user-specific data from the browser — no server cache pollution
  const { data, isLoading } = useSWR(
    \`/api/recommendations?productId=\${productId}\`,
    fetcher
  );

  if (isLoading) return <RecommendationsSkeleton />;
  return <RecommendationGrid items={data} />;
}`}</code>
      </pre>

      <h2 id="decision-matrix">Decision Matrix</h2>

      <ArticleTable
        caption="Rendering strategy decision matrix — map your page requirements to the right strategy and API."
        minWidth={1100}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Pages Router API</th>
              <th>App Router API</th>
              <th>CDN cacheable</th>
              <th>Fresh every request</th>
              <th>JS required</th>
              <th>SEO</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>SSG</strong>
              </td>
              <td>
                <code>getStaticProps</code> + <code>getStaticPaths</code>
              </td>
              <td>
                Default (no dynamic functions), <code>generateStaticParams</code>
              </td>
              <td>Yes — forever</td>
              <td>No — build time only</td>
              <td>No (for initial render)</td>
              <td>Excellent</td>
              <td>Marketing pages, docs, blog — content changes only on deploy</td>
            </tr>
            <tr>
              <td>
                <strong>ISR</strong>
              </td>
              <td>
                <code>getStaticProps</code> + <code>revalidate</code>
              </td>
              <td>
                <code>fetch</code> with <code>next.revalidate</code> or{" "}
                <code>export const revalidate = N</code>
              </td>
              <td>Yes — until revalidated</td>
              <td>No — stale until next revalidation</td>
              <td>No (for initial render)</td>
              <td>Excellent</td>
              <td>Product pages, news, content that changes daily/hourly</td>
            </tr>
            <tr>
              <td>
                <strong>SSR</strong>
              </td>
              <td>
                <code>getServerSideProps</code>
              </td>
              <td>
                <code>cookies()</code> / <code>headers()</code> / <code>cache: &apos;no-store&apos;</code>{" "}
                / <code>dynamic = &apos;force-dynamic&apos;</code>
              </td>
              <td>No (per-request)</td>
              <td>Yes — always</td>
              <td>No (for initial render)</td>
              <td>Excellent</td>
              <td>Auth-gated pages, personalized server content, real-time data with SEO</td>
            </tr>
            <tr>
              <td>
                <strong>CSR</strong>
              </td>
              <td>
                <code>useEffect</code> + <code>fetch</code>, SWR, React Query
              </td>
              <td>
                <code>&quot;use client&quot;</code> + SWR / React Query
              </td>
              <td>Shell only</td>
              <td>Yes — on every client fetch</td>
              <td>Yes (required)</td>
              <td>Poor (blank shell)</td>
              <td>Logged-in dashboards, real-time widgets, highly personalized UI</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: Walk me through how you'd choose a rendering strategy for a new page"
        intro="Strong answers use a decision tree, not a list. Interviewers want to see that you reason from requirements — SEO needs, data freshness, personalization, traffic volume — not from memorized API names."
        steps={[
          "Start with the SEO question: does this page need to be indexed by search engines? If yes, CSR is off the table by default (unless you have a separate SSR or prerendering solution). Most public-facing pages need SEO.",
          "Ask about personalization: is the content the same for all users, or user-specific? User-specific content should not be SSG/ISR (shared cache would serve one user's data to another). It either needs SSR or the personalized section needs to be CSR.",
          "Ask about freshness tolerance: how stale can the data be? If hours or days is acceptable, ISR is almost always better than SSR because it serves from CDN cache under load. Only use SSR if you need per-request freshness.",
          "Default to SSG/ISR for public pages: if content is public and changes on a known schedule, SSG (deploy-triggered) or ISR (time-triggered) will handle any traffic volume with near-zero server cost.",
          "Close with the hybrid insight: the App Router lets you apply these strategies at the component level, not the page level. You don't have to choose one strategy per page — you can SSG the shell, SSR a dynamic section in a Suspense boundary, and CSR a personalized widget, all in the same URL.",
        ]}
      />

      <InterviewPlaybook
        title="What's the difference between SSR and SSG and when would you pick each?"
        intro="This question is about tradeoffs, not definitions. A weak answer says 'SSR is dynamic, SSG is static'. A strong answer names the performance implications, cache behavior, and a concrete production scenario for each."
        steps={[
          "SSG: HTML is generated once at build time. Served from CDN with no server involvement at runtime. Infinitely scalable under traffic with zero origin load. The downside is data is as fresh as your last deployment — staleness is unbounded without ISR.",
          "ISR: SSG with a background refresh mechanism. Stale-while-revalidate means users never wait, but the data can be up to revalidate seconds old. This is the right default for most public e-commerce, news, and content pages.",
          "SSR: HTML is generated per request on the server. TTFB is higher because the server must fetch data before responding. Use it only when you genuinely need request-time context (auth cookies, user session) or truly real-time data where staleness is not acceptable.",
          "The performance trap: using getServerSideProps for a public product page that gets 100k requests/hour means 100k origin server renders per hour. The same page with ISR and revalidate: 60 serves those 100k requests from CDN cache and hits the origin maybe 60 times.",
          "Decision shorthand: is the content the same for all users AND can it tolerate any staleness at all? → SSG or ISR. Does it need to be fresh as of this exact request AND/OR requires request-time data? → SSR. Is it user-specific and not SEO-critical? → CSR.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="E-Commerce Product Page Architecture"
        scenario={
          <>
            You are designing the rendering strategy for an e-commerce product page at a
            retailer that handles 500,000 requests per hour at peak. The page URL is{" "}
            <code>/products/[id]</code> and it has four distinct sections:
            <br />
            <br />
            1. <strong>Product details</strong> — name, description, images, specs. Updated by
            the product team maybe once a week. Must be SEO-indexed. Currently implemented with{" "}
            <code>getServerSideProps</code> and causing origin saturation under load.
            <br />
            <br />
            2. <strong>Live stock count</strong> — &quot;14 left in stock&quot;. Updated in real
            time from a warehouse system. Accuracy within 60 seconds is acceptable. Must display
            on the page (not behind a button click).
            <br />
            <br />
            3. <strong>Personalized recommendations</strong> — &quot;You might also like&quot;
            section. Based on the user&apos;s browsing history. Different for every user.
            Not SEO-relevant.
            <br />
            <br />
            4. <strong>Customer reviews</strong> — aggregated rating and recent reviews. New
            reviews are added continuously. Showing reviews up to 5 minutes stale is acceptable.
            Must be SEO-indexed (Google indexes review content for rich snippets).
          </>
        }
        tasks={[
          "For each of the four sections, choose a rendering strategy (SSG, ISR, SSR, or CSR) and justify your choice.",
          "Identify the failure mode in the current implementation (getServerSideProps for product details) and quantify the impact.",
          "Describe the App Router component structure that would compose all four strategies on the same page URL.",
          "For the live stock count, explain the tradeoff between using a dynamic Server Component inside a Suspense boundary versus a CSR widget with SWR polling.",
          "Identify which of the four sections, if switched to SSR, would cause a cache poisoning risk and explain why.",
        ]}
      />
      <SolutionReveal>
        <p>
          <strong>Section 1 — Product details: ISR</strong>
        </p>
        <p>
          Content changes once a week — using <code>getServerSideProps</code> means 500k/hr origin
          hits for data that barely changes. Switch to ISR with <code>revalidate: 3600</code> (1
          hour) or use on-demand revalidation triggered by the CMS when the product team publishes
          an update. CDN serves all 500k requests; the origin handles maybe 1 background
          regeneration per hour per product. SEO is preserved because the HTML is fully
          server-rendered.
        </p>
        <p>
          <strong>Section 2 — Live stock count: Dynamic Server Component (SSR) in a Suspense boundary</strong>
        </p>
        <p>
          60-second freshness tolerance rules out SSR on every request (expensive) and CSR polling
          (adds client-side complexity and a request from every browser). The right approach: a
          Server Component that uses <code>fetch</code> with <code>next: {"{ revalidate: 60 }"}</code>{" "}
          (ISR at the component level), wrapped in a <code>Suspense</code> boundary. This renders
          server-side (so it appears in the initial HTML) but re-validates in the background every
          60 seconds. Alternatively, a CSR widget with SWR <code>refreshInterval: 60000</code> works
          but adds a loading flash on first paint and does not contribute to SEO.
        </p>
        <p>
          <strong>Section 3 — Personalized recommendations: CSR</strong>
        </p>
        <p>
          User-specific data cannot be SSG or ISR — the cache would serve one user&apos;s
          recommendations to another user. It is not SEO-relevant. CSR with SWR or React Query is
          the right choice: the initial HTML loads fast (product details are static), and
          recommendations load in the background after hydration. The blank/skeleton state is
          acceptable because this section is not above the fold on most viewports.
        </p>
        <p>
          <strong>Section 4 — Customer reviews: ISR</strong>
        </p>
        <p>
          SEO-indexed + 5-minute staleness tolerance = ISR with <code>revalidate: 300</code>.
          Reviews are not user-specific (same content for all visitors), so shared CDN cache is
          safe. On-demand revalidation can be triggered by a webhook when a new review is approved.
        </p>
        <p>
          <strong>Current implementation failure mode</strong>
        </p>
        <p>
          At 500k requests/hour, <code>getServerSideProps</code> for product details means 500k
          origin renders/hour for data that changes once a week. That is wasted server capacity,
          higher hosting costs, and unnecessary TTFB latency on every single request. ISR would
          reduce that to approximately 1 origin render per product per revalidation window — a
          reduction of many orders of magnitude.
        </p>
        <p>
          <strong>Cache poisoning risk</strong>
        </p>
        <p>
          Section 3 (personalized recommendations). If it were switched to SSR and Next.js cached
          the rendered HTML at the Full Route Cache level, one user&apos;s recommendations would
          be served to subsequent users. This is prevented by ensuring personalized data is either
          CSR (no server cache) or behind dynamic rendering with no Full Route Cache — but the
          risk is real if the implementation is done carelessly.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Default to SSG/ISR for public pages.</strong> Most Next.js pages — product
          pages, blog posts, marketing content — should be statically generated and served from a
          CDN. The performance and cost advantages over SSR are enormous at any meaningful traffic
          volume.
        </li>
        <li>
          <strong>SSR is for request-time context, not freshness.</strong> The right reason to use
          SSR is that you need auth cookies, session data, or truly real-time content on a
          SEO-critical page. Using SSR just because data changes frequently is almost always a
          mistake — ISR with a short revalidation window is cheaper and faster.
        </li>
        <li>
          <strong>CSR is for user-specific, non-SEO-critical data.</strong> Dashboards, account
          pages, personalized widgets — anything where each user sees different content and search
          indexing is irrelevant. CSR moves rendering load off your server entirely.
        </li>
        <li>
          <strong>ISR&apos;s stale-while-revalidate model means users never wait.</strong> The
          triggering request gets the stale cached page instantly. The next user after background
          regeneration gets fresh content. Maximum staleness equals the revalidate interval —
          tolerable for most production use cases.
        </li>
        <li>
          <strong>The App Router enables per-component rendering strategies.</strong> A single
          page can have an SSG shell, an ISR data section, a dynamic Server Component inside a
          Suspense boundary, and a CSR widget — all composing cleanly within one URL. This is the
          primary architectural advantage over the Pages Router.
        </li>
        <li>
          <strong>Never cache user-specific data at the server layer.</strong> Personal
          recommendations, account balances, and auth-gated content must either be CSR or behind
          dynamic (per-request) rendering. Caching personalized content in the Full Route Cache or
          CDN is a cache poisoning bug that serves one user&apos;s data to another.
        </li>
      </ul>
    </div>
  );
}
