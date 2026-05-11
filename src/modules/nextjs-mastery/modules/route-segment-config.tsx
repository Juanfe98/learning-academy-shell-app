import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const renderingDecisionDiagram = String.raw`flowchart TD
  START["Next.js evaluates route at build time"]
  START --> SEG{"Segment config<br/>dynamic = ?"}
  SEG -->|"force-static"| STATIC["Force static rendering<br/>cookies/headers return empty<br/>Always cached"]
  SEG -->|"force-dynamic"| DYNAMIC["Force dynamic rendering<br/>Runs on every request<br/>Never cached"]
  SEG -->|"error"| ERROR_CHECK{"Dynamic functions used?"}
  ERROR_CHECK -->|"Yes"| BUILD_ERROR["Build error thrown<br/>Cannot be static"]
  ERROR_CHECK -->|"No"| STATIC2["Renders statically"]
  SEG -->|"auto (default)"| AUTO{"Dynamic functions<br/>used? (cookies, headers,<br/>searchParams)"}
  AUTO -->|"Yes"| DYNAMIC2["Dynamic rendering<br/>(implicit opt-in)"]
  AUTO -->|"No"| FETCH{"Uncached fetch<br/>or unstable_noStore?"}
  FETCH -->|"Yes"| DYNAMIC3["Dynamic rendering"]
  FETCH -->|"No"| STATIC3["Static rendering"]`;

const precedenceHierarchyDiagram = String.raw`flowchart TD
  ROUTE["Route-level segment config<br/>export const dynamic / revalidate / fetchCache"]
  ROUTE -->|"Sets the default for all fetches"| FETCH_OPTS["fetch() call options<br/>cache: 'no-store' | 'force-cache'<br/>next: { revalidate: N }"]
  FETCH_OPTS -->|"fetch-level wins over segment default"| RESULT["Effective cache behavior<br/>per-fetch override beats segment default"]

  note1["fetchCache = 'default-no-store':<br/>all fetches with no explicit option use no-store"]
  note2["fetch(url, { cache: 'force-cache' }):<br/>this specific fetch is cached regardless of segment config"]

  ROUTE -.-> note1
  FETCH_OPTS -.-> note2`;

export const toc: TocItem[] = [
  { id: "what-is-segment-config", title: "What Is Route Segment Config?", level: 2 },
  { id: "dynamic-config", title: "The dynamic Option", level: 2 },
  { id: "revalidate-config", title: "The revalidate Option", level: 2 },
  { id: "runtime-config", title: "The runtime Option", level: 2 },
  { id: "fetch-cache-config", title: "The fetchCache Option", level: 2 },
  { id: "generate-static-params", title: "Combining with generateStaticParams", level: 2 },
  { id: "segment-config-vs-fetch", title: "Segment Config vs fetch() Options: Precedence", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RouteSegmentConfig() {
  return (
    <div className="article-content">
      <p>
        Route Segment Config is a set of exported constants you can place in any{" "}
        <code>page.tsx</code>, <code>layout.tsx</code>, or <code>route.ts</code> file to override
        how Next.js renders, caches, and executes that specific segment. Understanding these options
        is critical for senior engineers because they control the fundamental rendering model — and
        using them incorrectly can silently break expected cache behavior or cause build failures.
      </p>

      <h2 id="what-is-segment-config">What Is Route Segment Config?</h2>
      <p>
        Route Segment Config is file-level metadata. You simply export constants from the segment
        file — Next.js reads them at build time and at runtime to determine how to handle the
        route. There are no function calls or component props involved.
      </p>
      <pre>
        <code>{`// src/app/dashboard/page.tsx
// These are route segment config options — exported constants, not component props

export const dynamic = "force-dynamic";     // never cache this route
export const revalidate = 0;                // ISR: revalidate every 0 seconds (always fresh)
export const runtime = "edge";              // run in Edge Runtime instead of Node.js

export default function DashboardPage() {
  return <div>Dashboard</div>;
}`}</code>
      </pre>
      <p>
        Config options cascade: a config in <code>layout.tsx</code> applies to the layout itself,
        but each child <code>page.tsx</code> can override it. The most specific segment wins. A
        config in a root layout does NOT automatically force-dynamic every page — only that
        layout segment itself.
      </p>

      <h2 id="dynamic-config">The dynamic Option</h2>
      <p>
        The <code>dynamic</code> option is the highest-level switch for static vs dynamic rendering.
        It overrides what Next.js would normally infer from your code.
      </p>

      <MermaidDiagram
        chart={renderingDecisionDiagram}
        title="How Next.js Determines Static vs Dynamic Rendering"
        caption="The segment dynamic option intercepts the decision before Next.js analyzes dynamic function usage. Only auto (the default) defers to code analysis."
        minHeight={560}
      />

      <ArticleTable caption="All dynamic values — behavior, use case, and gotchas." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Value</th>
              <th>Behavior</th>
              <th>When to use</th>
              <th>Gotcha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>&apos;auto&apos;</code></td>
              <td>Default. Next.js infers static or dynamic from your code.</td>
              <td>Always start here — only override when you have a reason.</td>
              <td>Any use of <code>cookies()</code>, <code>headers()</code>, or <code>searchParams</code> opts the entire route into dynamic rendering.</td>
            </tr>
            <tr>
              <td><code>&apos;force-dynamic&apos;</code></td>
              <td>Forces dynamic rendering. Equivalent to Pages Router <code>getServerSideProps</code>. Runs on every request. No caching.</td>
              <td>User dashboards, real-time data, anything that must be fresh per request.</td>
              <td>Prevents any static optimization. Do not use on marketing pages or routes that could be statically rendered.</td>
            </tr>
            <tr>
              <td><code>&apos;force-static&apos;</code></td>
              <td>Forces static rendering even if dynamic functions are used. <code>cookies()</code> and <code>headers()</code> return empty values.</td>
              <td>Rarely needed. Useful if you want a static shell where the dynamic data loads client-side.</td>
              <td>
                <code>cookies()</code> returns an empty cookie jar. <code>headers()</code> returns
                empty headers. <code>searchParams</code> is an empty object. This is almost never
                what you want if you actually read those values.
              </td>
            </tr>
            <tr>
              <td><code>&apos;error&apos;</code></td>
              <td>Errors at build time if the route uses any dynamic functions or uncached fetches. Guarantees the route is static.</td>
              <td>Marketing pages, landing pages, docs — where you want a build-time guarantee of no dynamic content.</td>
              <td>Build will fail if a developer accidentally adds <code>cookies()</code> to the component tree. This is a feature, not a bug.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// CORRECT: force-dynamic for a user-specific dashboard
// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";

export default async function DashboardPage() {
  const session = await cookies(); // works — dynamic rendering is forced
  const userId = session.get("user-id")?.value;
  // ...
}

// WRONG: force-static with cookies() — the cookies will be empty!
// app/marketing/page.tsx
export const dynamic = "force-static";

import { cookies } from "next/headers";

export default async function MarketingPage() {
  const session = await cookies();
  const theme = session.get("theme")?.value; // will always be undefined
  // ...
}`}</code>
      </pre>

      <h2 id="revalidate-config">The revalidate Option</h2>
      <p>
        The <code>revalidate</code> option sets the default ISR (Incremental Static Regeneration)
        revalidation interval for all data fetches within the segment. This is the segment-level
        default — individual <code>fetch()</code> calls can override it.
      </p>

      <ArticleTable caption="Revalidate values and their effects." minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Value</th>
              <th>Behavior</th>
              <th>Equivalent Pages Router pattern</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>false</code> (default)</td>
              <td>Cache indefinitely. Only revalidated on-demand or never.</td>
              <td><code>getStaticProps</code> without <code>revalidate</code></td>
            </tr>
            <tr>
              <td><code>0</code></td>
              <td>Never cache. Always fetch fresh data. Makes the route dynamic.</td>
              <td><code>getServerSideProps</code></td>
            </tr>
            <tr>
              <td><code>60</code> (any number)</td>
              <td>Revalidate every N seconds using stale-while-revalidate. Serve cached, regenerate in background.</td>
              <td><code>getStaticProps</code> with <code>revalidate: 60</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// app/blog/page.tsx
// All fetches in this route default to revalidating every 60 seconds
export const revalidate = 60;

// This fetch inherits the segment default: revalidates every 60s
const posts = await fetch("https://api.example.com/posts").then((r) => r.json());

// This fetch overrides with its own revalidate: every 300s regardless of segment config
const config = await fetch("https://api.example.com/config", {
  next: { revalidate: 300 },
}).then((r) => r.json());

// This fetch opts OUT of caching entirely, overriding the segment default
const liveData = await fetch("https://api.example.com/live", {
  cache: "no-store",
}).then((r) => r.json());`}</code>
      </pre>

      <p>
        <strong>Which revalidate wins?</strong> The fetch-level <code>next.revalidate</code> always
        takes precedence over the segment-level <code>revalidate</code> for that specific fetch. The
        segment default only applies to fetches that have no explicit option. However, there is one
        important rule: if any fetch in the route has a shorter revalidate than the segment config,
        the route will revalidate at the shorter interval.
      </p>

      <h2 id="runtime-config">The runtime Option</h2>
      <p>
        The <code>runtime</code> option switches the execution environment for a specific route
        segment. By default all routes run in the Node.js runtime. You can opt individual routes
        into the Edge Runtime for lower latency and global distribution.
      </p>

      <pre>
        <code>{`// app/api/search/route.ts
// Run this Route Handler in Edge Runtime
export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  // Edge Runtime: no Node.js APIs, fast cold start, globally distributed
  const results = await fetch(\`https://search-api.example.com?q=\${query}\`);
  return Response.json(await results.json());
}`}</code>
      </pre>

      <p>
        <strong>Edge Runtime constraints:</strong> The Edge Runtime does not have access to Node.js
        APIs. No <code>fs</code>, no <code>crypto</code> (Web Crypto API is available), no native
        modules, no <code>process.env</code> for secrets at runtime (only those injected at build
        time). Libraries that depend on Node.js built-ins will fail. Check each library&apos;s
        documentation for Edge Runtime compatibility before switching.
      </p>
      <p>
        <strong>When to use Edge Runtime:</strong> Middleware (always runs on Edge), authentication
        token validation (fast, globally distributed), geolocation-based routing, A/B testing, and
        lightweight API routes that only make outbound fetch calls.
      </p>

      <h2 id="fetch-cache-config">The fetchCache Option</h2>
      <p>
        The <code>fetchCache</code> option is a finer-grained control over how the segment defaults
        handle fetch caching. It is less commonly used than <code>dynamic</code> or{" "}
        <code>revalidate</code> but gives you precise control over which fetches are affected by
        segment-level defaults.
      </p>
      <pre>
        <code>{`// The possible values and what they mean:

// 'auto' (default): Next.js decides per-fetch based on the fetch options
export const fetchCache = "auto";

// 'default-cache': fetches with no cache option default to force-cache
export const fetchCache = "default-cache";

// 'only-cache': all fetches MUST use cache — throws if a fetch uses no-store
export const fetchCache = "only-cache";

// 'force-cache': all fetches are forced to use force-cache, ignoring fetch-level options
export const fetchCache = "force-cache";

// 'default-no-store': fetches with no cache option default to no-store
export const fetchCache = "default-no-store";

// 'only-no-store': all fetches MUST use no-store — throws if a fetch uses force-cache
export const fetchCache = "only-no-store";

// 'force-no-store': all fetches are forced to no-store, ignoring fetch-level options
export const fetchCache = "force-no-store";`}</code>
      </pre>

      <h2 id="generate-static-params">Combining with generateStaticParams</h2>
      <p>
        <code>generateStaticParams</code> tells Next.js which dynamic route segments to
        pre-render at build time. Combined with segment config, you can control exactly how those
        pre-rendered pages behave.
      </p>
      <pre>
        <code>{`// app/blog/[slug]/page.tsx

// Pre-generate all blog posts at build time
export async function generateStaticParams() {
  const posts = await fetch("https://api.example.com/posts").then((r) => r.json());
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

// Revalidate the pre-generated pages every hour
export const revalidate = 3600;

// If a slug is requested that wasn't pre-generated:
// 'blocking' (default): render on-demand and cache
// false: return 404 for unknown slugs
export const dynamicParams = true; // default: on-demand render unknown slugs

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next.js 15: params is a Promise
  const post = await fetch(\`https://api.example.com/posts/\${slug}\`).then((r) =>
    r.json()
  );
  return <article>{post.title}</article>;
}`}</code>
      </pre>

      <h2 id="segment-config-vs-fetch">Segment Config vs fetch() Options: Precedence</h2>

      <MermaidDiagram
        chart={precedenceHierarchyDiagram}
        title="Precedence: Segment Config vs fetch() Options"
        caption="Segment config sets the default for the entire route. Individual fetch() calls can override that default. fetch-level options always win over segment-level defaults for their specific request."
        minHeight={460}
      />

      <p>
        The practical rules:
      </p>
      <ul>
        <li>
          <strong>Segment revalidate = 60, fetch with no option:</strong> that fetch revalidates
          every 60 seconds.
        </li>
        <li>
          <strong>Segment revalidate = 60, fetch with {`{ next: { revalidate: 300 } }`}:</strong>{" "}
          that fetch revalidates every 300 seconds — the fetch-level wins.
        </li>
        <li>
          <strong>Segment dynamic = &apos;force-dynamic&apos;, any fetch:</strong> the entire route
          is dynamic regardless of individual fetch options.
        </li>
        <li>
          <strong>Segment fetchCache = &apos;force-no-store&apos;:</strong> all fetches are
          uncached — fetch-level cache options are ignored.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How does Next.js decide whether to statically render a page?"
        intro="Walk through the decision tree from segment config down to dynamic function analysis. Interviewers want to see you understand the opt-in/opt-out model and can name real failure modes."
        steps={[
          "Start with segment config: if dynamic is set to force-dynamic or force-static, the decision is made immediately and Next.js skips analysis.",
          "If dynamic is auto (the default), Next.js scans the route for dynamic function calls: cookies(), headers(), useSearchParams(), searchParams prop. Any of these opts the entire route into dynamic rendering.",
          "If no dynamic functions are found, Next.js checks fetch options. Any fetch with cache: 'no-store' or revalidate: 0 makes the route dynamic.",
          "If all fetches are cached (or there are no fetches), the route renders statically at build time.",
          "Mention the footgun: using cookies() anywhere in the component tree — even in a deeply nested server component — opts the entire route into dynamic rendering. This surprises developers who expect the rendering mode to be per-component.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: Choose the Right Segment Config"
        scenario={
          <span>
            You are architecting three pages for an e-commerce app. For each, choose the correct
            segment config options and explain your reasoning:
            <br />
            <br />
            <strong>Page A — Marketing homepage:</strong> static content, no user data, updated
            occasionally by the marketing team (CMS changes).
            <br />
            <strong>Page B — User dashboard:</strong> shows the logged-in user&apos;s orders,
            personalized recommendations, and real-time order status. Uses session cookies.
            <br />
            <strong>Page C — Product detail page:</strong> mostly static (product info rarely
            changes), but includes live inventory stock count that must be accurate within 30
            seconds.
          </span>
        }
        tasks={[
          "Choose dynamic and revalidate values for Page A. What guarantees the page can never accidentally become dynamic?",
          "Choose dynamic and revalidate values for Page B. Which dynamic functions does this page necessarily use and why does that matter?",
          "For Page C, design a hybrid approach: the product content is cached, but the stock count is always fresh. Is this achievable with a single route, or does it require a separate API route / client-side fetch?",
          "Your team suggests adding export const dynamic = 'force-dynamic' to all pages 'just to be safe'. What is wrong with this approach and what would you propose instead?",
        ]}
        pitfalls={[
          "Forgetting that force-static makes cookies() return an empty cookie jar — using it on the dashboard would silently show wrong/empty data.",
          "Using revalidate: 0 on the homepage instead of the more intentional force-dynamic — both work, but revalidate: 0 is semantically less clear.",
          "Adding force-dynamic to all pages — this eliminates all static optimization and turns every route into server-rendered on every request, which is a significant performance regression.",
        ]}
        signal="A strong answer for Page C recognizes that Next.js does not support per-component rendering modes within a single page (unless using Suspense streaming with separate async boundaries). The clean solution is to statically render the product shell with revalidate: 3600, fetch the stock count client-side with SWR/React Query, or use a separate route handler that is always dynamic."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>dynamic</code> is the master switch. <code>force-dynamic</code> = always runs on
          request. <code>force-static</code> = always cached, dynamic functions return empty.{" "}
          <code>error</code> = build-time guarantee of static. <code>auto</code> = inferred from
          code.
        </li>
        <li>
          <code>revalidate</code> sets the ISR default for all fetches in the segment. Individual
          fetch-level options override it. <code>revalidate: 0</code> is equivalent to{" "}
          <code>dynamic: &apos;force-dynamic&apos;</code> for data purposes.
        </li>
        <li>
          <code>runtime = &apos;edge&apos;</code> runs the segment in Edge Runtime. No Node.js APIs.
          Fast cold start. Globally distributed. Check library compatibility before switching.
        </li>
        <li>
          <code>fetchCache</code> gives segment-level control over which fetches are affected by
          default cache behavior. <code>force-no-store</code> and <code>force-cache</code> override
          fetch-level options.
        </li>
        <li>
          Segment config only affects the file it is exported from. A config on{" "}
          <code>layout.tsx</code> does not cascade to child <code>page.tsx</code> files.
        </li>
      </ul>
    </div>
  );
}
