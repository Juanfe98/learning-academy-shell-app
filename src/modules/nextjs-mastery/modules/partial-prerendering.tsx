import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pprRequestDiagram = String.raw`sequenceDiagram
  participant B as Browser
  participant CDN as CDN Edge
  participant O as Origin Server

  Note over B,O: Traditional SSR — everything from origin
  B->>O: GET /products/123
  Note over O: Render full page (DB calls, auth checks...) ~200ms
  O-->>B: Full HTML response (TTFB: ~200ms)

  Note over B,O: PPR — shell from CDN, holes from origin, ONE response
  B->>CDN: GET /products/123
  CDN-->>B: Static shell HTML instantly (~1ms TTFB)
  CDN->>O: Simultaneously: fill dynamic holes
  Note over O: Fetch stock count, personalized price... ~200ms
  O-->>B: Dynamic holes stream into same response
  Note over B: Shell visible in ~1ms, data fills in ~200ms`;

const pprCdnFlowDiagram = String.raw`flowchart TD
  subgraph "Build Time"
    BT1["next build runs"]
    BT2["Next.js pre-renders everything\noutside Suspense boundaries"]
    BT3["Static HTML stored\non CDN edge nodes"]
    BT1 --> BT2 --> BT3
  end

  subgraph "Request Time"
    RT1["Browser requests /products/123"]
    RT2["CDN delivers static shell\n— ~1ms TTFB"]
    RT3["Origin server fills Suspense holes\n(DB, cookies, personalisation)"]
    RT4["Dynamic content streams\ninto same HTTP response"]
    RT1 --> RT2
    RT2 --> RT3
    RT3 --> RT4
  end

  BT3 -->|"Shell served from"| RT2

  style BT3 fill:#1a3a2a,color:#86efac
  style RT2 fill:#1a3a2a,color:#86efac
  style RT3 fill:#1e3a5f,color:#93c5fd
  style RT4 fill:#1e3a5f,color:#93c5fd`;

const pprComponentTreeDiagram = String.raw`flowchart TD
  subgraph "Static shell — prerendered at build time, served from CDN"
    NAV["&lt;Navbar /&gt;"]
    PROD["&lt;ProductInfo /&gt;\ntitle, description, images"]
    FOOTER["&lt;Footer /&gt;"]
  end

  subgraph "Dynamic holes — streamed from origin at request time"
    STOCK["&lt;Suspense&gt;\n  &lt;StockBadge /&gt;\n  reads live DB"]
    PRICE["&lt;Suspense&gt;\n  &lt;PersonalisedPrice /&gt;\n  reads cookies()"]
    RECS["&lt;Suspense&gt;\n  &lt;Recommendations /&gt;\n  user-specific ML"]
  end

  PAGE["ProductPage"] --> NAV
  PAGE --> PROD
  PAGE --> STOCK
  PAGE --> PRICE
  PAGE --> RECS
  PAGE --> FOOTER

  style NAV fill:#1a3a2a,color:#86efac
  style PROD fill:#1a3a2a,color:#86efac
  style FOOTER fill:#1a3a2a,color:#86efac
  style STOCK fill:#1e3a5f,color:#93c5fd
  style PRICE fill:#1e3a5f,color:#93c5fd
  style RECS fill:#1e3a5f,color:#93c5fd`;

export const toc: TocItem[] = [
  { id: "ppr-mental-model", title: "The Mental Model: Ending the Binary Choice", level: 2 },
  { id: "ppr-how-it-works", title: "How PPR Works Technically", level: 2 },
  { id: "ppr-suspense-boundary", title: "The Suspense Boundary is the PPR Boundary", level: 2 },
  { id: "enabling-ppr", title: "Enabling PPR", level: 2 },
  { id: "dynamic-signals", title: "What Makes a Component Dynamic", level: 2 },
  { id: "ppr-vs-streaming-vs-isr", title: "PPR vs Streaming vs ISR", level: 2 },
  { id: "practical-ppr-patterns", title: "Practical PPR Patterns", level: 2 },
  { id: "ppr-limitations", title: "Current Limitations", level: 2 },
  { id: "ppr-comparison-table", title: "Rendering Strategy Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PartialPrerendering() {
  return (
    <div className="article-content">
      <p>
        Partial Prerendering (PPR) is the most significant rendering architecture shift in
        Next.js since the App Router itself. It does not just add a new option — it breaks a
        fundamental binary. Before PPR, every route was either fully static (prerendered at build
        time, CDN-served, blazing-fast TTFB) or fully dynamic (rendered per-request from origin,
        capable of personalisation, but slower). PPR collapses that tradeoff: the{" "}
        <strong>static shell arrives from CDN instantly</strong>, and{" "}
        <strong>dynamic holes stream in from origin</strong> — all in a single HTTP response.
        This module builds the correct mental model and covers everything you need to use PPR
        confidently in production.
      </p>

      <h2 id="ppr-mental-model">The Mental Model: Ending the Binary Choice</h2>
      <p>
        The core problem PPR solves is what you might call the{" "}
        <strong>static-or-dynamic binary</strong>. In traditional Next.js, as soon as one
        component in a route reads <code>cookies()</code>, accesses <code>searchParams</code>,
        or calls <code>noStore()</code>, the entire route opts out of static prerendering and
        becomes a fully dynamic server render. The CDN cannot help — every request goes all the
        way to origin.
      </p>
      <p>
        This means developers face an uncomfortable choice on almost every real page. A product
        detail page: the product title, description, and images are completely static — they
        change only when someone edits the catalogue. But the stock badge, personalised price,
        and cart state are dynamic. Before PPR, reading <code>cookies()</code> for the cart
        anywhere on the page condemned the static product content to be re-rendered on every
        single request.
      </p>
      <p>
        PPR reframes the question. Instead of asking{" "}
        <em>&quot;is this route static or dynamic?&quot;</em>, you ask{" "}
        <em>&quot;which subtrees are static and which are dynamic?&quot;</em>. The boundary
        between them is drawn by <code>Suspense</code>. Everything outside a{" "}
        <code>Suspense</code> boundary is prerendered at build time. Everything inside a{" "}
        <code>Suspense</code> boundary that calls a dynamic function becomes a{" "}
        <strong>dynamic hole</strong> — a placeholder in the prerendered HTML that is filled
        at request time by the origin server, streamed into the same HTTP response.
      </p>

      <h2 id="ppr-how-it-works">How PPR Works Technically</h2>
      <p>
        Understanding the two phases — build time and request time — is what separates a sharp
        PPR answer from a vague one.
      </p>

      <MermaidDiagram
        chart={pprRequestDiagram}
        title="PPR vs Traditional SSR — Request Timeline"
        caption="The critical difference: in PPR the browser's TTFB is determined by CDN latency (~1ms), not origin processing time. The static shell is already at the edge. Dynamic holes stream in from origin in the same response — the browser never waits for a second request."
        minHeight={520}
      />

      <p>
        <strong>Build time:</strong> <code>next build</code> runs a special static pass over
        every PPR-enabled route. Next.js renders the component tree but treats all dynamic
        function calls as if they were absent — components that call <code>cookies()</code> or{" "}
        <code>headers()</code> are replaced by their <code>Suspense</code> fallbacks in the
        build output. The result is a static HTML document — the shell — that is stored on
        CDN edge nodes around the world.
      </p>
      <p>
        <strong>Request time:</strong> When a request arrives at the CDN, the edge node sends
        the static shell immediately. Simultaneously, the request is forwarded to the origin
        server, which renders only the dynamic holes. The dynamic content is streamed back to
        the browser in the{" "}
        <strong>same HTTP response</strong> that was already in flight. From the browser&apos;s
        perspective, there is one response with progressive HTML chunks — the shell arrives
        first, then the dynamic sections fill in.
      </p>
      <p>
        The most important distinction to nail in an interview:{" "}
        <strong>
          regular React Streaming sends the entire response from origin — including the shell.
        </strong>{" "}
        The improvement is that the shell is not blocked by slow data fetches. PPR goes further
        — the shell comes from CDN, not origin at all. Origin only handles the dynamic holes.
        The TTFB improvement over pure streaming can be dramatic for geographically distributed
        users.
      </p>

      <MermaidDiagram
        chart={pprCdnFlowDiagram}
        title="PPR Build Time vs Request Time Flow"
        caption="Green nodes are CDN-served (milliseconds). Blue nodes involve the origin server (tens to hundreds of milliseconds). PPR ensures the user never waits on origin for content that does not change per-request."
        minHeight={440}
      />

      <h2 id="ppr-suspense-boundary">The Suspense Boundary is the PPR Boundary</h2>
      <p>
        This is the design insight that makes PPR elegant: you do not need a new API or
        configuration per component. You already have <code>Suspense</code>. PPR reuses it
        as the static/dynamic split point.
      </p>
      <p>
        The rule is simple: any component <strong>outside</strong> a <code>Suspense</code>{" "}
        boundary is statically prerendered at build time. Any component{" "}
        <strong>inside</strong> a <code>Suspense</code> boundary that calls a dynamic
        function (<code>cookies()</code>, <code>headers()</code>, etc.) becomes a dynamic
        hole. The fallback you provide to <code>Suspense</code> is what appears in the
        prerendered shell while the dynamic content is in flight.
      </p>

      <pre>
        <code>{`// app/products/[id]/page.tsx — PPR product page
import { Suspense } from "react";
import { ProductInfo } from "@/components/ProductInfo";       // static
import { StockBadge } from "@/components/StockBadge";         // dynamic (DB)
import { PersonalisedPrice } from "@/components/PersonalisedPrice"; // dynamic (cookies)
import { Recommendations } from "@/components/Recommendations";    // dynamic (user ML)

export const experimental_ppr = true; // opt-in for this route

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      {/* STATIC SHELL — prerendered at build time, served from CDN */}
      <ProductInfo productId={id} />

      {/* DYNAMIC HOLE — Suspense wraps the dynamic component */}
      {/* The fallback is what the prerendered HTML shows while data loads */}
      <Suspense fallback={<StockSkeleton />}>
        <StockBadge productId={id} />
      </Suspense>

      <Suspense fallback={<PriceSkeleton />}>
        <PersonalisedPrice productId={id} />
      </Suspense>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </div>
  );
}

// StockBadge reads from a live database — makes it dynamic
async function StockBadge({ productId }: { productId: string }) {
  // This fetch opts out of caching — it is a dynamic operation
  const stock = await fetch(\`/api/stock/\${productId}\`, {
    cache: "no-store",
  }).then((r) => r.json());

  return (
    <span className={stock.available ? "in-stock" : "out-of-stock"}>
      {stock.available ? "In Stock" : "Out of Stock"}
    </span>
  );
}

// PersonalisedPrice reads cookies — classic dynamic signal
import { cookies } from "next/headers";

async function PersonalisedPrice({ productId }: { productId: string }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user-id")?.value;

  const price = await fetchUserPrice(productId, userId);

  return <span className="price">{price.formatted}</span>;
}`}</code>
      </pre>

      <MermaidDiagram
        chart={pprComponentTreeDiagram}
        title="PPR Component Tree — Static Shell vs Dynamic Holes"
        caption="Green components are in the static shell served from CDN. Blue components are Suspense-wrapped dynamic holes rendered by origin on each request. The Suspense boundary is literally the line between CDN and origin."
        minHeight={480}
      />

      <h2 id="enabling-ppr">Enabling PPR</h2>
      <p>
        PPR is experimental in Next.js 15. It has two modes: global opt-in (every route) and
        incremental opt-in (per route). Incremental is the safer choice when migrating an
        existing application.
      </p>

      <pre>
        <code>{`// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Option 1: opt-in per route (safer for existing apps)
    ppr: "incremental",

    // Option 2: enable for ALL routes in the app
    // ppr: true,
  },
};

export default nextConfig;

// With incremental mode, each route that wants PPR exports a constant:
// app/products/[id]/page.tsx
export const experimental_ppr = true;

// app/blog/[slug]/page.tsx — this route stays fully static/dynamic (no PPR)
// (no export needed — just omit it)

// Routes WITHOUT experimental_ppr = true in incremental mode behave
// exactly as they did before PPR. Zero breaking change for the rest of the app.`}</code>
      </pre>

      <p>
        The <code>experimental_ppr = true</code> export is inherited through layouts. If you
        put it in a shared layout, all child routes under that layout opt into PPR automatically.
        This is useful for migrating an entire section of the app at once.
      </p>

      <pre>
        <code>{`// app/(shop)/layout.tsx — opts in the entire (shop) route group
export const experimental_ppr = true;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className="shop-layout">{children}</div>;
}

// Now /shop/products, /shop/cart, /shop/checkout all have PPR enabled
// — as long as they use Suspense correctly around dynamic parts`}</code>
      </pre>

      <h2 id="dynamic-signals">What Makes a Component Dynamic</h2>
      <p>
        PPR requires clarity about exactly which function calls force dynamic rendering. This
        is not new behaviour — these APIs have always made routes dynamic. PPR just makes the
        consequence more surgical: only the Suspense subtree that contains the call becomes
        a dynamic hole, rather than the whole route.
      </p>

      <ArticleTable
        caption="Dynamic signals — each of these inside a Suspense boundary creates a PPR dynamic hole. Outside a Suspense boundary, they make the entire route dynamic and defeat PPR."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>API / Pattern</th>
              <th>Why it is dynamic</th>
              <th>PPR implication</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>cookies()</code></td>
              <td>Reads the HTTP request — different per user/session</td>
              <td>Wrap the consuming component in Suspense</td>
            </tr>
            <tr>
              <td><code>headers()</code></td>
              <td>Reads request headers — e.g. User-Agent, Auth tokens</td>
              <td>Wrap the consuming component in Suspense</td>
            </tr>
            <tr>
              <td><code>searchParams</code> (page prop)</td>
              <td>Changes per URL — cannot be known at build time</td>
              <td>Move <code>searchParams</code> access into a Suspense-wrapped child</td>
            </tr>
            <tr>
              <td><code>noStore()</code></td>
              <td>Explicit opt-out of caching — signals intent to always be fresh</td>
              <td>The component calling it becomes a dynamic hole</td>
            </tr>
            <tr>
              <td><code>fetch(..., {"{ cache: 'no-store' }"})</code></td>
              <td>Bypasses the cache — always hits the network</td>
              <td>The component that calls it becomes a dynamic hole</td>
            </tr>
            <tr>
              <td><code>Date.now()</code>, <code>Math.random()</code></td>
              <td>Non-deterministic — result changes on every call</td>
              <td>Next.js detects these and marks the component dynamic</td>
            </tr>
            <tr>
              <td><code>connection()</code></td>
              <td>Explicit signal that a real request connection is required</td>
              <td>Wrapping component must be inside Suspense for PPR</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        <strong>The most common PPR mistake:</strong> calling a dynamic function in a component
        that is NOT wrapped in Suspense. Without a Suspense boundary, Next.js cannot prerender
        a static shell for that part of the tree — it falls back to making the entire route
        dynamic, as if PPR were not enabled. Always check the component tree for dynamic calls
        that have leaked outside their intended Suspense boundary.
      </p>

      <pre>
        <code>{`// ❌ WRONG — searchParams access is outside Suspense, defeats PPR
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort: string }>;
}) {
  const { sort } = await searchParams; // ← dynamic signal outside Suspense boundary
  // Entire route is now dynamic — PPR has no static shell to prerender
  return (
    <div>
      <ProductGrid sort={sort} />
    </div>
  );
}

// ✅ CORRECT — move searchParams access inside a Suspense-wrapped child
export default function ProductsPage() {
  // Page component itself has no dynamic calls — fully static shell
  return (
    <div>
      <StaticProductsHeader />
      <Suspense fallback={<GridSkeleton />}>
        {/* searchParams is read inside this boundary — safe for PPR */}
        <ProductGridWithSort />
      </Suspense>
    </div>
  );
}

// The dynamic child reads searchParams internally
async function ProductGridWithSort() {
  const { searchParams } = await import("next/navigation");
  // OR pass it as a prop from a dedicated search-params reading component
  // ...
}`}</code>
      </pre>

      <h2 id="ppr-vs-streaming-vs-isr">PPR vs Streaming vs ISR</h2>
      <p>
        These three strategies are often conflated. They solve overlapping but distinct problems,
        and understanding the difference is what makes a senior-level answer.
      </p>
      <p>
        <strong>Streaming</strong> (regular React Suspense without PPR): the entire HTTP
        response originates from the server. The shell is fast because it does not wait for
        slow data fetches — it renders immediately and streams. But the TTFB still involves
        the origin server processing the shell. For users far from your origin, this matters.
      </p>
      <p>
        <strong>ISR (Incremental Static Regeneration)</strong>: the whole route is statically
        generated and served from CDN. On the first request after a revalidation period
        expires, the origin re-renders the page and updates the CDN copy. Excellent TTFB,
        but the content is always the same for all users — no personalisation.
      </p>
      <p>
        <strong>PPR</strong>: the static parts behave exactly like ISR — prerendered at build
        time, served from CDN. The dynamic parts behave like Streaming — rendered per-request
        from origin. The key insight is that these happen in the same HTTP response. You get
        ISR-level TTFB for the shell and per-request freshness for the personalised sections.
      </p>

      <h2 id="practical-ppr-patterns">Practical PPR Patterns</h2>
      <p>
        The central principle is to push dynamic function calls as deep into the component
        tree as possible, and always keep them inside a Suspense boundary. Shallow dynamic
        calls — reading cookies in the page itself — defeat PPR. Deep ones — reading cookies
        in a small leaf component — create precise dynamic holes.
      </p>

      <pre>
        <code>{`// Pattern 1: E-commerce product page
// Static: product info, images, description (changes only on catalogue edit)
// Dynamic: stock count (live DB), cart state (cookies), recommendations (user ML)

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <article>
      {/* Static: entire ProductInfo tree prerendered at build time */}
      <Suspense fallback={<ProductInfoSkeleton />}>
        <ProductInfo params={params} />
      </Suspense>

      <aside>
        {/* Dynamic holes — independent Suspense boundaries */}
        <Suspense fallback={<StockSkeleton />}>
          <StockBadge params={params} />
        </Suspense>

        <Suspense fallback={<PriceSkeleton />}>
          <PersonalisedPrice params={params} />
        </Suspense>
      </aside>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations params={params} />
      </Suspense>
    </article>
  );
}

// ProductInfo is fully static — reads from a cached data source only
async function ProductInfo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    // This fetch is cached — same product data served to all users
    next: { tags: [\`product:\${id}\`] },
  });
  return <ProductInfoUI product={product} />;
}

// Pattern 2: Blog post with dynamic comment count
export default function BlogPostPage() {
  return (
    <article>
      {/* Static: post content — never changes at request time */}
      <PostContent />
      <PostAuthor />

      {/* Dynamic: live comment count — changes as readers comment */}
      <Suspense fallback={<span>... comments</span>}>
        <CommentCount />
      </Suspense>
    </article>
  );
}

// Pattern 3: Dashboard with static layout and dynamic widgets
export default function DashboardPage() {
  return (
    <div className="dashboard">
      {/* Static: nav, sidebar, layout chrome — identical for all sessions */}
      <DashboardNav />
      <DashboardSidebar />

      <main>
        {/* Each widget is an independent dynamic hole */}
        <Suspense fallback={<MetricsSkeleton />}>
          <UserMetrics />    {/* reads cookies for user ID */}
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />   {/* reads live DB — no-store */}
        </Suspense>

        <Suspense fallback={<TasksSkeleton />}>
          <PendingTasks />   {/* user-specific, reads session */}
        </Suspense>
      </main>
    </div>
  );
}`}</code>
      </pre>

      <h2 id="ppr-limitations">Current Limitations</h2>
      <p>
        PPR is experimental as of Next.js 15. The API surface is deliberately narrow to allow
        changes before stabilisation. Knowing the limitations prevents production surprises.
      </p>
      <ul>
        <li>
          <strong>Experimental flag required.</strong> <code>experimental.ppr</code> must be
          set in <code>next.config.ts</code>. The API — including the{" "}
          <code>experimental_ppr</code> export name — may change in a minor release.
        </li>
        <li>
          <strong>Requires a server.</strong> PPR is incompatible with{" "}
          <code>output: &apos;export&apos;</code> (static HTML export). The dynamic holes
          need an origin server to render at request time. Vercel, self-hosted Node.js, and
          other server environments all work.
        </li>
        <li>
          <strong>Dynamic calls outside Suspense defeat PPR silently.</strong> If any
          component in the static part of the tree calls <code>cookies()</code> or{" "}
          <code>headers()</code> without a Suspense wrapper, Next.js falls back to fully
          dynamic rendering for the entire route. There is no build-time error — watch for
          this in code review.
        </li>
        <li>
          <strong>Nested Suspense boundaries work, but are additive.</strong> A dynamic hole
          inside another Suspense boundary is still a dynamic hole — it does not get any
          extra prerendering just because it is nested deeper.
        </li>
        <li>
          <strong>Client Component dynamic work is not a PPR signal.</strong> Client
          Components that call browser APIs or use <code>useEffect</code> do not participate
          in PPR — they are always client-side and do not affect the static/dynamic split.
          PPR only applies to Server Component tree analysis.
        </li>
      </ul>

      <h2 id="ppr-comparison-table">Rendering Strategy Comparison</h2>

      <ArticleTable
        caption="PPR vs ISR vs Streaming vs Full SSR — use this table to choose the right strategy for each route."
        minWidth={1000}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Full SSR</th>
              <th>ISR</th>
              <th>Streaming (Suspense)</th>
              <th>PPR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>TTFB source</strong></td>
              <td>Origin server</td>
              <td>CDN (after first build/revalidation)</td>
              <td>Origin server</td>
              <td>CDN for shell, origin for holes</td>
            </tr>
            <tr>
              <td><strong>CDN delivery</strong></td>
              <td>No — dynamic per request</td>
              <td>Yes — full page cached</td>
              <td>No — full response from origin</td>
              <td>Yes — static shell only</td>
            </tr>
            <tr>
              <td><strong>Data freshness</strong></td>
              <td>Always fresh</td>
              <td>Stale up to revalidation window</td>
              <td>Always fresh</td>
              <td>Shell: stale (build-time). Holes: always fresh</td>
            </tr>
            <tr>
              <td><strong>Personalisation</strong></td>
              <td>Full — cookies/session available</td>
              <td>None — same response for all users</td>
              <td>Full — cookies/session available</td>
              <td>Shell: none. Holes: full personalisation</td>
            </tr>
            <tr>
              <td><strong>Suspense required</strong></td>
              <td>Optional (for UX only)</td>
              <td>No</td>
              <td>Yes — defines streaming boundaries</td>
              <td>Yes — defines static/dynamic split</td>
            </tr>
            <tr>
              <td><strong>Production readiness</strong></td>
              <td>Stable — since Next.js 13</td>
              <td>Stable — since Next.js 9</td>
              <td>Stable — since Next.js 13</td>
              <td>Experimental — Next.js 14/15</td>
            </tr>
            <tr>
              <td><strong>Best use case</strong></td>
              <td>Fully personalised pages (user dashboards, checkout)</td>
              <td>Content pages with infrequent updates (blog, docs, marketing)</td>
              <td>Pages with mixed fast/slow data (dashboard with heavy queries)</td>
              <td>Pages with static layout and dynamic personalised sections (e-commerce, SaaS)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="What is Partial Prerendering and how is it different from ISR?"
        intro="Weak answers say 'it combines static and dynamic'. Strong answers explain the mechanism, name the CDN vs origin distinction, and identify the Suspense boundary as the split point."
        steps={[
          "Open with the problem PPR solves: the static-or-dynamic binary. Before PPR, one dynamic call anywhere in a route made the whole route dynamic. CDN could no longer help, even for the parts that never change.",
          "Explain the two phases: build time produces a static shell (everything outside Suspense), stored on CDN. Request time fills the dynamic holes (inside Suspense) from origin, streaming into the same HTTP response.",
          "Name the key distinction from ISR: ISR serves the whole route from CDN but cannot personalise. PPR serves the shell from CDN and personalises the holes at request time. Different tradeoff, not an upgrade from one to the other.",
          "Name the key distinction from regular Streaming: Streaming sends the entire response from origin — TTFB is still bounded by origin latency. PPR's TTFB is CDN latency for the shell. For global users, this is significant.",
          "Close with the Suspense-as-boundary design: you do not need a new API per component. The same Suspense you use for loading states also defines the PPR split. A dynamic call outside Suspense silently defeats PPR for the entire route.",
        ]}
      />

      <InterviewPlaybook
        title="How do Suspense boundaries define PPR dynamic holes, and what happens if you forget one?"
        intro="This question probes whether you understand the failure mode — a dynamic call outside Suspense does not cause an error, it silently falls back to full SSR."
        steps={[
          "Explain the rule: components outside Suspense are statically prerendered at build time. Components inside Suspense that call dynamic APIs (cookies, headers, noStore, no-store fetch) become dynamic holes rendered at request time.",
          "Describe the fallback prop: the Suspense fallback is what appears in the prerendered HTML. The browser sees the fallback first (from CDN), then the dynamic content replaces it as the origin streams the response.",
          "Explain the failure mode: if a component outside Suspense calls cookies() or headers(), Next.js cannot prerender a static shell for that subtree. The entire route becomes fully dynamic — equivalent to plain SSR with no CDN benefit.",
          "There is no build error or warning for this — it degrades silently. Recommend auditing with the Next.js DevTools or by checking the build output for routes that should be PPR but are showing as 'dynamic'.",
          "Close with the fix: always push dynamic function calls as deep as possible in the tree, and always wrap the consuming component in Suspense. Treat Suspense as a first-class architectural boundary, not just a loading UX concern.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Design PPR Boundaries for an E-commerce Product Page"
        scenario={
          <>
            You are reviewing a Next.js product page component tree. The page is a server-rendered
            route that currently has slow TTFB because it reads user cookies for personalisation.
            The team wants to adopt PPR. The component tree looks like this:
            <br />
            <br />
            <code>ProductPage</code> (page component, receives <code>params</code>)<br />
            ├── <code>GlobalNav</code> — static links, no async work<br />
            ├── <code>ProductHero</code> — fetches product title/images with <code>next: {"{ tags: ['product'] }"}</code><br />
            ├── <code>ProductDescription</code> — fetches product copy, same cache tags<br />
            ├── <code>StockWidget</code> — fetches stock count with <code>cache: &apos;no-store&apos;</code><br />
            ├── <code>PriceDisplay</code> — calls <code>cookies()</code> to get user tier, then fetches personalised price<br />
            ├── <code>SimilarProducts</code> — calls <code>headers()</code> for locale, fetches localised product list<br />
            └── <code>StaticFooter</code> — no async work
          </>
        }
        tasks={[
          "Identify which components should be in the static shell and which should be dynamic holes. Justify each decision.",
          "Draw the Suspense boundary placement that enables PPR while keeping independent dynamic holes independent (so a slow stock fetch does not delay the price display).",
          "Write the page component showing the Suspense structure. Show the fallback for each dynamic hole.",
          "Explain what happens at build time vs request time for this page. What does the CDN store? What does origin render?",
          "A junior engineer suggests wrapping ProductPage itself in a Suspense boundary so that 'everything inside is dynamic'. Why does this not achieve PPR, and what does it achieve instead?",
        ]}
      />

      <SolutionReveal>
        <p>
          <strong>Static shell components:</strong> <code>GlobalNav</code>,{" "}
          <code>ProductHero</code>, <code>ProductDescription</code>, and{" "}
          <code>StaticFooter</code>. These either have no async work or use cached fetches
          (tagged with <code>next.tags</code>) that produce the same output for all users.
          They are safe to prerender at build time.
        </p>
        <p>
          <strong>Dynamic holes:</strong> <code>StockWidget</code> (uses{" "}
          <code>cache: &apos;no-store&apos;</code> — live stock data changes constantly),{" "}
          <code>PriceDisplay</code> (calls <code>cookies()</code> — user-specific tier),
          and <code>SimilarProducts</code> (calls <code>headers()</code> — locale-dependent).
        </p>
        <pre>
          <code>{`// app/products/[id]/page.tsx
export const experimental_ppr = true;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // params is awaited here — accessing params is dynamic, but
  // it is not a cookie/header read, so it does not force full SSR
  const { id } = await params;

  return (
    <div>
      {/* STATIC SHELL */}
      <GlobalNav />

      {/* ProductHero uses a cached fetch — stays in static shell */}
      <Suspense fallback={<HeroSkeleton />}>
        <ProductHero productId={id} />
      </Suspense>

      <Suspense fallback={<DescriptionSkeleton />}>
        <ProductDescription productId={id} />
      </Suspense>

      {/* DYNAMIC HOLES — each in its own Suspense boundary */}
      {/* Independent boundaries: slow stock does NOT delay price display */}
      <Suspense fallback={<StockSkeleton />}>
        <StockWidget productId={id} />
      </Suspense>

      <Suspense fallback={<PriceSkeleton />}>
        <PriceDisplay productId={id} />
      </Suspense>

      <Suspense fallback={<SimilarProductsSkeleton />}>
        <SimilarProducts productId={id} />
      </Suspense>

      <StaticFooter />
    </div>
  );
}`}</code>
        </pre>
        <p>
          <strong>Build time:</strong> Next.js renders the page with dynamic holes replaced
          by their Suspense fallbacks. The result — shell HTML with skeleton placeholders for
          the three dynamic widgets — is stored on CDN.
        </p>
        <p>
          <strong>Request time:</strong> CDN sends the shell instantly. Origin renders only
          the three dynamic holes (<code>StockWidget</code>, <code>PriceDisplay</code>,{" "}
          <code>SimilarProducts</code>), streaming their HTML into the same response. The
          browser replaces the skeletons as each hole arrives.
        </p>
        <p>
          <strong>Why wrapping ProductPage in Suspense does not achieve PPR:</strong> A
          Suspense boundary around the entire page with a dynamic component inside creates
          one large dynamic hole — the whole page. The static shell would consist only of
          what is outside that Suspense, which in this case is nothing. You have effectively
          implemented regular Streaming SSR (everything from origin) with no CDN for any
          content. Independent Suspense boundaries are essential — they keep each dynamic
          hole isolated so the browser can hydrate them independently.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>PPR ends the static-or-dynamic binary.</strong> Static shell from CDN
          (instant TTFB) and dynamic holes streamed from origin in the same HTTP response.
          No second request, no client-side fetch for dynamic data.
        </li>
        <li>
          <strong>The Suspense boundary is the PPR boundary.</strong> Everything outside
          Suspense is prerendered at build time. Everything inside Suspense that calls a
          dynamic API becomes a dynamic hole. You do not need a new annotation per component.
        </li>
        <li>
          <strong>A dynamic call outside Suspense silently defeats PPR</strong> for the
          entire route — it degrades to full SSR. There is no build error. Audit the tree
          carefully and push dynamic calls as deep as possible.
        </li>
        <li>
          <strong>PPR vs Streaming</strong> is about where the shell comes from: CDN
          (PPR) or origin (Streaming). For geographically distributed users, CDN-served
          shells dramatically improve perceived performance.
        </li>
        <li>
          <strong>Independent Suspense boundaries matter.</strong> Wrapping dynamic
          components in separate <code>Suspense</code> elements means a slow stock
          fetch does not block a fast price lookup. The browser hydrates each hole
          as it arrives.
        </li>
        <li>
          <strong>PPR is experimental in Next.js 15.</strong> Enable with{" "}
          <code>experimental: {"{ ppr: 'incremental' }"}</code> and opt in per route
          with <code>export const experimental_ppr = true</code>. The API name may
          change before stabilisation. Not compatible with <code>output: &apos;export&apos;</code>.
        </li>
      </ul>
    </div>
  );
}
