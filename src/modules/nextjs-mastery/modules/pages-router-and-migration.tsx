import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const ssrLifecycleDiagram = String.raw`flowchart TD
  REQ["Browser sends GET /products/42"]
  REQ --> MW["Next.js server receives request"]
  MW --> GSP["getServerSideProps runs on the server<br/>(every single request — no cache)"]
  GSP --> DB["Fetch from database / API<br/>req.params, req.query, req.cookies available"]
  DB --> PROPS["Return { props: { product } }"]
  PROPS --> RENDER["React renders page component on the server<br/>with the returned props"]
  RENDER --> HTML["Full HTML sent to browser"]
  HTML --> HYDRATE["React hydrates on the client<br/>(attaches event listeners)"]
  HYDRATE --> INTERACT["Page is interactive"]`;

const migrationFlowDiagram = String.raw`flowchart LR
  PAGES["Pages Router<br/>pages/ directory<br/>_app.tsx, _document.tsx<br/>getServerSideProps / getStaticProps"]
  COEXIST["Coexistence Phase<br/>Both routers active<br/>pages/ + app/ in same project<br/>Separate layout trees"]
  APP["App Router<br/>app/ directory<br/>layout.tsx, loading.tsx<br/>Server Components + fetch()"]

  PAGES -->|"Step 1: Create app/ directory<br/>move non-critical pages"| COEXIST
  COEXIST -->|"Step 2: Migrate remaining pages<br/>replace data fetching patterns"| APP

  style PAGES fill:#1e3a5f,color:#93c5fd
  style COEXIST fill:#3b2f1e,color:#fcd34d
  style APP fill:#1a3a2a,color:#86efac`;

export const toc: TocItem[] = [
  { id: "pages-router-overview", title: "Pages Router Overview", level: 2 },
  { id: "app-tsx", title: "_app.tsx and _document.tsx", level: 3 },
  { id: "api-folder", title: "The pages/api/ Directory", level: 3 },
  { id: "getserversideprops", title: "getServerSideProps", level: 2 },
  { id: "gsp-context", title: "The context Object", level: 3 },
  { id: "gsp-pitfalls", title: "Performance Pitfalls", level: 3 },
  { id: "getstaticprops", title: "getStaticProps and getStaticPaths", level: 2 },
  { id: "fallback-modes", title: "fallback: false / true / blocking", level: 3 },
  { id: "isr", title: "Incremental Static Regeneration (ISR)", level: 3 },
  { id: "pages-api-routes", title: "API Routes in the Pages Router", level: 2 },
  { id: "router-hook", title: "The useRouter Hook", level: 2 },
  { id: "app-vs-pages", title: "Pages Router vs App Router", level: 2 },
  { id: "migration-strategy", title: "Incremental Migration Strategy", level: 2 },
  { id: "migration-gotchas", title: "Migration Gotchas", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PagesRouterAndMigration() {
  return (
    <div className="article-content">
      <p>
        The Pages Router is how Next.js worked before the App Router arrived in Next.js 13. Many
        companies — including large-scale production systems — still run on it today. Understanding
        it is not just historical trivia: you will encounter Pages Router codebases in real jobs, in
        technical interviews, and in migration projects. Knowing both routers and when to choose each
        one is a genuine differentiator at the senior level.
      </p>
      <p>
        This module covers the complete Pages Router surface — file conventions, all three data
        fetching strategies, API routes, the <code>useRouter</code> hook — then puts them in direct
        comparison with the App Router, and walks through the incremental migration path.
      </p>

      <h2 id="pages-router-overview">Pages Router Overview</h2>
      <p>
        In the Pages Router, every file inside the <code>pages/</code> directory becomes a route.
        The mapping is direct: <code>pages/about.tsx</code> serves <code>/about</code>,{" "}
        <code>pages/blog/[slug].tsx</code> serves <code>/blog/:slug</code>. There is no{" "}
        <code>layout.tsx</code> convention — layouts are opt-in via component composition in{" "}
        <code>_app.tsx</code>.
      </p>

      <pre>
        <code>{`pages/
  index.tsx          → /
  about.tsx          → /about
  blog/
    index.tsx        → /blog
    [slug].tsx       → /blog/:slug
    [...rest].tsx    → /blog/* (catch-all)
  _app.tsx           → custom App wrapper (runs on every page)
  _document.tsx      → custom HTML shell (runs on server only)
  api/
    users.ts         → /api/users
    users/[id].ts    → /api/users/:id`}</code>
      </pre>

      <h3 id="app-tsx">_app.tsx and _document.tsx</h3>
      <p>
        These two special files serve different, non-overlapping purposes. Confusing them is one of
        the most common Pages Router mistakes.
      </p>
      <p>
        <strong>_app.tsx</strong> is the top-level React component that wraps every page. It runs
        on both the server and the client. Use it for global layouts, persisting UI state between
        page navigations (the layout does not unmount), and importing global CSS.
      </p>

      <pre>
        <code>{`// pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import "../styles/globals.css"; // global CSS must be imported here

export default function MyApp({ Component, pageProps }: AppProps) {
  // Component = the current page component
  // pageProps = props returned from getServerSideProps/getStaticProps

  return (
    <SessionProvider session={pageProps.session}>
      <GlobalNav />
      <Component {...pageProps} />
      <Footer />
    </SessionProvider>
  );
}

// You can also define getInitialProps here to inject props into every page,
// but this opts out of Automatic Static Optimization — avoid unless necessary`}</code>
      </pre>

      <p>
        <strong>_document.tsx</strong> is the server-only HTML shell. It wraps the entire HTML
        document — <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, <code>&lt;body&gt;</code>.
        Use it to set the <code>lang</code> attribute, add font preload links, or include custom
        scripts in a controlled order. It never runs on the client.
      </p>

      <pre>
        <code>{`// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preload a self-hosted font */}
        <link
          rel="preload"
          href="/fonts/inter.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Google Analytics script tag injected at the document level */}
      </Head>
      <body>
        <Main />      {/* where page content renders */}
        <NextScript /> {/* Next.js scripts, hydration bundles */}
      </body>
    </Html>
  );
}`}</code>
      </pre>

      <h3 id="api-folder">The pages/api/ Directory</h3>
      <p>
        Any file inside <code>pages/api/</code> becomes a serverless API endpoint. These are
        server-only — they never ship to the client bundle. The file exports a single default
        function that receives a Node.js <code>IncomingMessage</code> (req) and{" "}
        <code>ServerResponse</code> (res).
      </p>

      <h2 id="getserversideprops">getServerSideProps</h2>
      <p>
        <code>getServerSideProps</code> (GSP) runs on the server on <strong>every request</strong>.
        It has full access to the incoming HTTP request — headers, cookies, query params — and can
        reach databases, APIs, or the filesystem. The data it returns is injected into the page
        component as props.
      </p>

      <MermaidDiagram
        chart={ssrLifecycleDiagram}
        title="SSR Request Lifecycle with getServerSideProps"
        caption="getServerSideProps runs fresh on every request — there is zero caching at the framework level. Every user, every page load triggers a new server execution."
        minHeight={520}
      />

      <pre>
        <code>{`// pages/products/[id].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

interface Product {
  id: string;
  name: string;
  price: number;
}

export const getServerSideProps = (async (context) => {
  const { id } = context.params as { id: string };

  const res = await fetch(\`https://api.example.com/products/\${id}\`);

  if (!res.ok) {
    // Redirect to 404 page — no component renders
    return { notFound: true };
  }

  const product: Product = await res.json();

  return {
    props: { product }, // passed to the page component
  };
}) satisfies GetServerSideProps;

// TypeScript infers props from getServerSideProps return type
export default function ProductPage({
  product,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>\${product.price}</p>
    </div>
  );
}`}</code>
      </pre>

      <h3 id="gsp-context">The context Object</h3>
      <p>
        The <code>context</code> argument is the most important thing to understand about
        <code>getServerSideProps</code>. It gives you full access to the request environment.
      </p>

      <pre>
        <code>{`export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    params,    // { id: "42" } — dynamic route params
    query,     // { page: "2" } — URL query string
    req,       // Node.js IncomingMessage — raw HTTP request
    res,       // Node.js ServerResponse — can set headers, status codes
    preview,   // boolean — true when in Next.js Preview Mode
    previewData, // data set by setPreviewData()
    resolvedUrl, // the actual URL that was requested (after rewrites)
    locale,    // current locale (if i18n is configured)
  } = context;

  // Access cookies from the raw request
  const sessionToken = req.cookies["session-token"];

  // Set a custom response header
  res.setHeader("Cache-Control", "no-store");

  // Access query string: /products?sort=price
  const sortBy = query.sort ?? "name";

  return { props: { sortBy } };
};`}</code>
      </pre>

      <h3 id="gsp-pitfalls">Performance Pitfalls</h3>
      <p>
        The most common mistake with <code>getServerSideProps</code> is using it where a static
        approach would work. Because GSP runs on every request with no caching, it adds server
        latency to every single page load. An e-commerce product page that changes once a day does
        not need GSP — <code>getStaticProps</code> with ISR is almost always better.
      </p>
      <p>
        Real cases where GSP is the right choice: pages that need the incoming cookie or session to
        decide what data to fetch (auth-gated dashboards), pages where the data changes every few
        seconds and staleness is unacceptable, or pages that need to set custom response headers.
      </p>

      <h2 id="getstaticprops">getStaticProps and getStaticPaths</h2>
      <p>
        <code>getStaticProps</code> runs at <strong>build time</strong> (and optionally at
        revalidation time). The rendered HTML is cached and served from a CDN edge. For pages where
        the data does not need to be user-specific and does not change per-request, this is
        dramatically faster than GSP — latency drops from your origin server roundtrip to a CDN
        edge cache hit.
      </p>

      <pre>
        <code>{`// pages/blog/[slug].tsx
import type {
  GetStaticProps,
  GetStaticPaths,
  InferGetStaticPropsType,
} from "next";

// getStaticPaths: tells Next.js which dynamic paths to pre-build
export const getStaticPaths = (async () => {
  const posts = await fetch("https://api.example.com/posts").then((r) =>
    r.json()
  );

  return {
    paths: posts.map((post: { slug: string }) => ({
      params: { slug: post.slug },
    })),
    fallback: "blocking", // see section below
  };
}) satisfies GetStaticPaths;

// getStaticProps: runs at build time for each path returned above
export const getStaticProps = (async (context) => {
  const { slug } = context.params as { slug: string };
  const post = await fetch(
    \`https://api.example.com/posts/\${slug}\`
  ).then((r) => r.json());

  if (!post) return { notFound: true };

  return {
    props: { post },
    revalidate: 60, // ISR: re-run getStaticProps at most once every 60 seconds
  };
}) satisfies GetStaticProps;

export default function BlogPost({
  post,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return <article>{post.content}</article>;
}`}</code>
      </pre>

      <h3 id="fallback-modes">fallback: false / true / blocking</h3>
      <p>
        The <code>fallback</code> option in <code>getStaticPaths</code> controls what happens when a
        user requests a path that was not pre-rendered at build time. This is one of the most
        commonly tested Pages Router concepts in interviews.
      </p>

      <ArticleTable
        caption="The three fallback modes control how Next.js handles paths not pre-built at build time."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>What happens on unknown path</th>
              <th>User experience</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>fallback: false</code>
              </td>
              <td>Returns 404 immediately</td>
              <td>Hard 404 — no delay</td>
              <td>Finite, known set of paths (e.g. a small product catalog)</td>
            </tr>
            <tr>
              <td>
                <code>fallback: true</code>
              </td>
              <td>
                Serves a fallback page immediately with <code>router.isFallback === true</code>,
                then builds the page in the background
              </td>
              <td>Instant skeleton, then swaps to real content when ready</td>
              <td>
                Very large catalogs where pre-building all paths is impractical; requires explicit
                loading UI in the component
              </td>
            </tr>
            <tr>
              <td>
                <code>fallback: &quot;blocking&quot;</code>
              </td>
              <td>
                Server waits for <code>getStaticProps</code> to complete, then returns the fully
                rendered HTML
              </td>
              <td>No skeleton — user waits for the first response, then gets full HTML</td>
              <td>
                SEO-critical pages where a skeleton fallback would index poorly; simpler component
                code (no isFallback check needed)
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// When using fallback: true, the component must handle the fallback state
import { useRouter } from "next/router";

export default function BlogPost({ post }: { post: Post | undefined }) {
  const router = useRouter();

  // isFallback is true during the background generation phase
  if (router.isFallback) {
    return <div>Loading...</div>; // skeleton while the page is being built
  }

  return <article>{post!.content}</article>;
}

// With fallback: "blocking", no isFallback check needed — post is always defined`}</code>
      </pre>

      <h3 id="isr">Incremental Static Regeneration (ISR)</h3>
      <p>
        ISR is the mechanism that keeps statically generated pages fresh after they are built. You
        add a <code>revalidate</code> field to the return value of <code>getStaticProps</code>. The
        value is a number of seconds.
      </p>
      <p>
        The stale-while-revalidate model works like this: after <code>revalidate</code> seconds
        have passed since the page was last generated, the next request triggers a background
        regeneration. The current visitor still receives the stale (cached) page instantly — they do
        not wait. The regenerated page replaces the cache for all subsequent visitors. This means
        the maximum staleness is approximately <code>revalidate</code> seconds, but no user ever
        waits for server-side rendering.
      </p>

      <pre>
        <code>{`export const getStaticProps: GetStaticProps = async () => {
  const data = await fetchExpensiveData();

  return {
    props: { data },
    revalidate: 3600, // At most once per hour — stale-while-revalidate semantics
  };
};

// You can also trigger on-demand revalidation via an API route:
// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Protect with a secret to prevent abuse
  if (req.query.secret !== process.env.REVALIDATION_SECRET) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const path = req.query.path as string;
  await res.revalidate(path); // triggers ISR for that specific path
  return res.json({ revalidated: true });
}`}</code>
      </pre>

      <ArticleTable
        caption="When to use each Pages Router data-fetching strategy — the most common interview decision matrix."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>When it runs</th>
              <th>Caching</th>
              <th>Use case</th>
              <th>Revalidation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>getServerSideProps</code>
              </td>
              <td>Every request on the server</td>
              <td>None by default (you set <code>Cache-Control</code> manually)</td>
              <td>Auth-gated pages, real-time data, personalized content</td>
              <td>N/A — always fresh</td>
            </tr>
            <tr>
              <td>
                <code>getStaticProps</code>
              </td>
              <td>At build time</td>
              <td>CDN-cached indefinitely (until next build)</td>
              <td>Marketing pages, docs, blog posts with infrequent updates</td>
              <td>Only on next build</td>
            </tr>
            <tr>
              <td>
                <code>getStaticProps</code> + <code>revalidate</code> (ISR)
              </td>
              <td>Build time, then in background after revalidate interval</td>
              <td>CDN-cached, stale-while-revalidate</td>
              <td>Product pages, news articles — high traffic, periodic updates</td>
              <td>Time-based or on-demand</td>
            </tr>
            <tr>
              <td>
                <code>getStaticPaths</code> (with above)
              </td>
              <td>Build time to enumerate paths</td>
              <td>Same as <code>getStaticProps</code></td>
              <td>Dynamic routes with a known or large set of paths</td>
              <td>Same as <code>getStaticProps</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewPlaybook
        title="How to answer: Walk me through how ISR works"
        intro="Strong answers explain the stale-while-revalidate model, not just that ISR 'refreshes pages'. The failure mode to name is over-aggressive revalidate causing unnecessary origin hits."
        steps={[
          "Explain the build-time baseline: getStaticProps runs once at build time, generating static HTML that is served from CDN edge nodes globally.",
          "Describe the trigger: after the revalidate window has elapsed, the NEXT request to that page triggers a background regeneration — a new getStaticProps run on the origin server.",
          "Clarify who waits: the triggering request gets the stale cached page immediately. They do not wait. The newly generated page replaces the cache for subsequent visitors.",
          "Name the failure mode: setting revalidate too low (e.g. 1 second) on a high-traffic page means the origin gets hammered with background re-renders — effectively the same load as SSR with none of the caching benefit.",
          "Mention on-demand revalidation: res.revalidate(path) lets you trigger ISR immediately from a webhook (e.g. when a CMS publishes content), bypassing the time window entirely.",
        ]}
      />

      <h2 id="pages-api-routes">API Routes in the Pages Router</h2>
      <p>
        Pages Router API routes export a single handler function. Unlike App Router Route Handlers,
        there is no explicit HTTP method export — you branch on <code>req.method</code> inside the
        handler.
      </p>

      <pre>
        <code>{`// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";

type UserData = { id: string; name: string; email: string };
type ErrorData = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserData | ErrorData>
) {
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  }

  if (req.method === "PATCH") {
    const updated = await db.user.update({ where: { id }, data: req.body });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    await db.user.delete({ where: { id } });
    return res.status(204).end();
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: \`Method \${req.method} Not Allowed\` });
}

// Pages Router API config — disable body parsing for file uploads, etc.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};`}</code>
      </pre>

      <p>
        A common pattern is a middleware-like helper that wraps the handler to add auth, CORS, or
        error boundaries without rewriting each handler:
      </p>

      <pre>
        <code>{`// lib/api-middleware.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || !verifyToken(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return handler(req, res);
  };
}

// pages/api/protected.ts
import { withAuth } from "@/lib/api-middleware";

const handler: NextApiHandler = async (req, res) => {
  res.json({ secret: "protected data" });
};

export default withAuth(handler);`}</code>
      </pre>

      <h2 id="router-hook">The useRouter Hook</h2>
      <p>
        In the Pages Router, <code>useRouter</code> from <code>next/router</code> (not{" "}
        <code>next/navigation</code>) is the primary navigation primitive. It provides the current
        route state and programmatic navigation methods.
      </p>

      <pre>
        <code>{`import { useRouter } from "next/router"; // note: next/router, not next/navigation

export default function SearchPage() {
  const router = useRouter();

  // Current URL state
  const { pathname } = router; // "/search" — the file path, not the URL
  const { query } = router;    // { q: "nextjs", page: "2" } — URL query string + dynamic params

  // Programmatic navigation
  const handleSearch = (term: string) => {
    // push: adds to history stack (user can go back)
    router.push({
      pathname: "/search",
      query: { q: term, page: 1 },
    });
    // equivalent: router.push("/search?q=nextjs&page=1")
  };

  const handleTabSwitch = (tab: string) => {
    // replace: replaces current history entry (user cannot go back to previous)
    router.replace({ pathname: router.pathname, query: { ...router.query, tab } });
  };

  const handleFilter = (filter: string) => {
    // shallow: updates URL and query without re-running getServerSideProps/getStaticProps
    // Only re-runs if it would be re-run on a full navigation
    router.push(
      { query: { ...router.query, filter } },
      undefined,
      { shallow: true } // ← does NOT trigger getServerSideProps
    );
  };

  // router.back() — equivalent to window.history.back()
  // router.reload() — equivalent to window.location.reload()
  // router.prefetch("/products") — prefetch a route manually
  // router.isFallback — true when a fallback: true page is being generated

  return (
    <div>
      <p>Current query: {JSON.stringify(query)}</p>
      <button onClick={() => handleSearch("nextjs")}>Search</button>
    </div>
  );
}`}</code>
      </pre>

      <p>
        The critical difference to remember: in the Pages Router, <code>query</code> is empty on
        first render during SSR and is only populated after hydration. If you need query params
        server-side, read them from <code>context.query</code> in <code>getServerSideProps</code>{" "}
        instead.
      </p>

      <h2 id="app-vs-pages">Pages Router vs App Router</h2>
      <p>
        The App Router is not just a new file structure — it represents a fundamentally different
        mental model. In the Pages Router, the server/client boundary is at the page level. In the
        App Router, it is at the component level. This changes how you think about layout, data
        fetching, and performance.
      </p>

      <ArticleTable
        caption="Side-by-side comparison of the two Next.js routing paradigms across the most important dimensions."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Pages Router</th>
              <th>App Router</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Data fetching</td>
              <td>
                <code>getServerSideProps</code>, <code>getStaticProps</code>,{" "}
                <code>getStaticPaths</code> — page-level functions
              </td>
              <td>
                <code>async</code> Server Component functions — any component can fetch data
                directly
              </td>
            </tr>
            <tr>
              <td>Layouts</td>
              <td>
                Manual composition via <code>_app.tsx</code> — one global wrapper
              </td>
              <td>
                Nested <code>layout.tsx</code> files — composable, persistent across navigations
              </td>
            </tr>
            <tr>
              <td>Server/client split</td>
              <td>Page-level — entire page is either SSR or SSG</td>
              <td>
                Component-level — mix Server and Client Components in the same page tree
              </td>
            </tr>
            <tr>
              <td>Routing primitive</td>
              <td>
                <code>useRouter</code> from <code>next/router</code>
              </td>
              <td>
                <code>useRouter</code> from <code>next/navigation</code> (different API)
              </td>
            </tr>
            <tr>
              <td>Loading states</td>
              <td>Manual — you implement your own skeleton/spinner</td>
              <td>
                <code>loading.tsx</code> convention — automatic Suspense boundary
              </td>
            </tr>
            <tr>
              <td>Error handling</td>
              <td>
                Custom <code>_error.tsx</code>
              </td>
              <td>
                <code>error.tsx</code> per route segment — granular error boundaries
              </td>
            </tr>
            <tr>
              <td>Streaming</td>
              <td>Not supported natively</td>
              <td>Built-in — Server Components stream HTML as they resolve</td>
            </tr>
            <tr>
              <td>Mutations</td>
              <td>
                Call API routes from the client (<code>fetch("/api/...")</code>)
              </td>
              <td>
                Server Actions — run server code directly from form submissions or event handlers
              </td>
            </tr>
            <tr>
              <td>Bundle size</td>
              <td>
                All page code ships to client (including data fetching logic, marked server-only
                with tree shaking)
              </td>
              <td>
                Server Components send zero JS to client — much smaller client bundles
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewPlaybook
        title="How to answer: When would you choose Pages Router over App Router today?"
        intro="This question tests whether you can make pragmatic architectural decisions, not just recite docs. Strong answers acknowledge the App Router's advantages while naming concrete reasons to stay on Pages Router."
        steps={[
          "Lead with the default: for a greenfield Next.js project in 2024+, the App Router is the right choice — it delivers better performance, smaller client bundles, and more granular control over server/client boundaries.",
          "Name the legitimate Pages Router reasons: existing large codebases where migration cost outweighs the benefit right now; teams not yet familiar with the Server Component mental model; third-party libraries that don't yet support the App Router (some older auth libraries, CMS SDKs, or UI components use client-only APIs that break in RSC).",
          "Call out the incremental path: it's not binary — both routers can coexist in the same project during migration. A team can move pages one by one over months.",
          "Show you know the tradeoffs: Pages Router is simpler to reason about for teams coming from React SPA backgrounds. The mental model of 'this whole page is server-rendered or not' is easier to grasp than the Server/Client Component boundary.",
          "Close with the honest answer: most senior engineers today need to know both. Pages Router is what you'll find in most existing production codebases, and App Router is where new work goes.",
        ]}
      />

      <h2 id="migration-strategy">Incremental Migration Strategy</h2>
      <p>
        The App Router and Pages Router can coexist in the same Next.js project. The{" "}
        <code>app/</code> directory and <code>pages/</code> directory can both be present
        simultaneously. Routes in <code>app/</code> take precedence over <code>pages/</code> when
        paths conflict.
      </p>

      <MermaidDiagram
        chart={migrationFlowDiagram}
        title="Incremental Migration Flow: Pages Router to App Router"
        caption="Migration is a gradual process — both routers can coexist in production while you migrate page by page. The key constraint is that layout trees cannot be shared between the two routers."
        minHeight={300}
      />

      <p>
        A practical migration sequence:
      </p>

      <pre>
        <code>{`// Step 1: Create the app/ directory alongside existing pages/
// Both directories co-exist — Next.js handles routing for both

my-app/
  app/                   ← new App Router pages go here
    layout.tsx           ← NEW global layout (separate from _app.tsx)
    page.tsx             ← migrated home page
  pages/                 ← old Pages Router pages stay here during migration
    _app.tsx             ← still active for pages/ routes
    about.tsx            ← not yet migrated
    blog/
      [slug].tsx         ← not yet migrated

// Step 2: Migrate a simple static page first
// Before (pages/about.tsx):
export default function About() {
  return <h1>About</h1>;
}

// After (app/about/page.tsx):
export default function About() {
  return <h1>About</h1>;
}
// Then delete pages/about.tsx — app/ route takes over

// Step 3: Migrate data-fetching pages
// Before (pages/blog/[slug].tsx):
export const getStaticProps = async ({ params }) => {
  const post = await fetchPost(params.slug);
  return { props: { post }, revalidate: 60 };
};
export const getStaticPaths = async () => ({
  paths: [...],
  fallback: "blocking",
});
export default function BlogPost({ post }) { ... }

// After (app/blog/[slug]/page.tsx):
// generateStaticParams replaces getStaticPaths
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

// The page component is now async — data fetching happens inside
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  return <article>{post.content}</article>;
}

// ISR via export const revalidate = 60; at the file level
export const revalidate = 60;`}</code>
      </pre>

      <h3 id="migration-gotchas">Migration Gotchas</h3>
      <p>
        These are the issues that trip engineers up during real migrations:
      </p>

      <pre>
        <code>{`// ❌ Gotcha 1: _app.tsx and layout.tsx are SEPARATE layout trees
// You cannot share providers between them.
// Pages Router routes use _app.tsx; App Router routes use layout.tsx.
// If you have a global provider (Auth, Theme, Analytics), you need it in BOTH files
// during the migration period.

// ❌ Gotcha 2: useRouter import differs between routers
// Pages Router:
import { useRouter } from "next/router";
// App Router:
import { useRouter } from "next/navigation"; // different object, different API
// Mixing these causes runtime errors.

// ❌ Gotcha 3: getServerSideProps has no App Router equivalent
// The closest is an async Server Component + cookies()/headers() from next/headers
import { cookies } from "next/headers";

export default async function Dashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) redirect("/login"); // next/navigation redirect()

  const data = await fetchUserData(session.value);
  return <DashboardUI data={data} />;
}

// ❌ Gotcha 4: Client-only libraries break in Server Components
// Libraries that use window, document, or React Context at module load time
// cannot be imported in Server Components.
// Fix: import them in Client Components ("use client") or use next/dynamic with ssr: false

// ❌ Gotcha 5: Middleware runs for ALL routes (both Pages and App Router)
// If your middleware.ts was written for Pages Router path patterns,
// audit it carefully — it will also run for App Router routes.`}</code>
      </pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to explain getServerSideProps vs getStaticProps vs ISR in an interview"
        intro="A weak answer lists the names. A strong answer maps each strategy to a production scenario, names the cache implications, and explains the performance tradeoff explicitly."
        steps={[
          "getServerSideProps: runs on every request, has access to req/res, no caching. Use it only when you need request-time data (cookies, auth headers, truly real-time data). The cost is that every page load hits your origin server — it does not scale to high traffic without significant server capacity.",
          "getStaticProps: runs once at build time, output is CDN-cached forever (until next build). Zero origin hits at runtime. Use it for pages where data changes only when you deploy — docs, marketing pages, or content managed through a build-triggered CMS.",
          "ISR (getStaticProps + revalidate): the pragmatic middle ground. Pre-builds pages but refreshes them in the background on a schedule. The revalidate value is the maximum acceptable staleness in seconds. A product page with revalidate: 300 can serve millions of concurrent users with near-zero origin load while staying mostly fresh.",
          "The decision rule: default to static (getStaticProps). Add revalidate if the content needs to stay reasonably fresh. Only reach for getServerSideProps when you genuinely need request-time information that cannot be deferred.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Pages Router Migration Audit"
        scenario={
          <>
            You join a team that has a Next.js Pages Router application with several hundred pages.
            The tech lead asks you to audit the data-fetching strategy on five key pages and
            recommend whether each should stay on SSR (<code>getServerSideProps</code>), migrate
            to static + ISR (<code>getStaticProps</code> with <code>revalidate</code>), or be
            re-platformed to App Router Server Components. The five pages are:
            <br />
            <br />
            1. <strong>Public marketing homepage</strong> — content managed in a CMS, updated by
            marketing about once a week. Currently uses <code>getServerSideProps</code>.
            <br />
            2. <strong>User dashboard</strong> — shows account balance, recent transactions, and
            user-specific notifications. Currently uses <code>getServerSideProps</code> and reads
            session cookies.
            <br />
            3. <strong>Product catalog page</strong> — 50,000 products, filtered by category.
            Currently uses <code>getServerSideProps</code> with database queries. Page response is
            slow under load.
            <br />
            4. <strong>Blog post page</strong> — hundreds of articles, content rarely changes
            after publish. Currently uses <code>getStaticProps</code> with no{" "}
            <code>revalidate</code>.
            <br />
            5. <strong>Real-time stock ticker page</strong> — shows live prices, updates every
            second. Currently uses client-side polling after a{" "}
            <code>getServerSideProps</code> initial load.
          </>
        }
        tasks={[
          "For each page, identify the current problem with its data-fetching strategy (or confirm it is correct).",
          "Recommend the target strategy: keep as getServerSideProps, migrate to getStaticProps + ISR, migrate to App Router Server Component, or move the dynamic data entirely to the client. Justify each recommendation.",
          "For the product catalog page, describe the specific getStaticProps + getStaticPaths configuration you would use: what paths to pre-build at build time, what fallback mode to choose, and what revalidate interval makes sense.",
          "Identify which pages cannot be converted to static rendering and explain the technical reason why.",
          "Describe one migration gotcha that would apply if you moved the user dashboard to the App Router.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>_app.tsx vs _document.tsx</strong>: <code>_app.tsx</code> is the React wrapper
          (runs client and server, persists across navigations, home for global providers and CSS).
          <code>_document.tsx</code> is the HTML shell (server-only, use it for lang attribute,
          font preloads, custom body attributes).
        </li>
        <li>
          <strong>getServerSideProps runs on every request with no caching</strong> — it is the
          right tool for auth-gated, personalized, or truly real-time pages. Using it for public,
          cacheable content is the most common Pages Router performance mistake.
        </li>
        <li>
          <strong>ISR is the Pages Router's most powerful capability</strong> — combine{" "}
          <code>getStaticProps</code> with <code>revalidate</code> for pages that need to be fast
          AND reasonably fresh. Stale-while-revalidate means users never wait for the origin
          server.
        </li>
        <li>
          <strong>fallback: &quot;blocking&quot; is usually the right default</strong> for large
          dynamic catalogs — it is simpler than <code>fallback: true</code> (no isFallback check
          needed) and avoids 404s for valid paths not pre-built at build time.
        </li>
        <li>
          <strong>Both routers can coexist during migration</strong> — you do not need to rewrite
          everything at once. The critical constraint is that <code>_app.tsx</code> and{" "}
          <code>layout.tsx</code> are separate layout trees and cannot share state or providers.
        </li>
        <li>
          <strong>Know the import difference</strong>: <code>useRouter</code> from{" "}
          <code>next/router</code> (Pages Router) vs <code>next/navigation</code> (App Router)
          have different APIs and are not interchangeable — mixing them is a common migration bug.
        </li>
      </ul>
    </div>
  );
}
