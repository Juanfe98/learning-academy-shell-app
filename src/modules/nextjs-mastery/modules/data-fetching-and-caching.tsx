import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "rendering-modes", title: "Static vs Dynamic Rendering", level: 2 },
  { id: "four-cache-layers", title: "The 4-Layer Cache Model", level: 2 },
  { id: "request-memoization", title: "Layer 1: Request Memoization", level: 3 },
  { id: "data-cache", title: "Layer 2: Data Cache", level: 3 },
  { id: "full-route-cache", title: "Layer 3: Full Route Cache", level: 3 },
  { id: "router-cache", title: "Layer 4: Router Cache", level: 3 },
  { id: "fetch-options", title: "fetch() Options and Cache Behavior", level: 2 },
  { id: "revalidation", title: "Revalidation Strategies", level: 2 },
  { id: "unstable-cache", title: "unstable_cache for Non-fetch Data", level: 2 },
  { id: "generate-static-params", title: "generateStaticParams", level: 2 },
  { id: "dynamic-functions", title: "Dynamic Functions That Opt Out of Caching", level: 2 },
  { id: "common-cache-bugs", title: "Common Cache Bugs", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function DataFetchingAndCaching() {
  return (
    <div className="article-content">
      <p>
        Caching is where most Next.js developers get surprised in production. The framework
        aggressively caches at multiple layers to maximize performance, but each layer has
        different opt-out mechanisms and revalidation strategies. This is consistently one of
        the top interview topics for senior Next.js roles.
      </p>

      <h2 id="rendering-modes">Static vs Dynamic Rendering</h2>
      <p>
        Next.js renders routes at two different times: at build time (static) or at request
        time (dynamic). The rendering mode is determined automatically based on what your page
        uses — you rarely need to configure it explicitly.
      </p>

      <ArticleTable caption="What triggers each rendering mode." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Rendering mode</th>
              <th>When it renders</th>
              <th>Triggered by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Static</strong></td>
              <td>At build time</td>
              <td>Default for pages with no dynamic functions or uncached fetches</td>
            </tr>
            <tr>
              <td><strong>Dynamic</strong></td>
              <td>On every request</td>
              <td><code>cookies()</code>, <code>headers()</code>, <code>searchParams</code>, <code>fetch</code> with <code>no-store</code></td>
            </tr>
            <tr>
              <td><strong>Streaming</strong></td>
              <td>Progressive during request</td>
              <td>Suspense boundaries with async Server Components below them</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// Statically rendered — Next.js renders this at build time and caches the HTML
export default async function ProductList() {
  // fetch with default caching — treated as static
  const products = await fetch("https://api.example.com/products").then(r => r.json());
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// Dynamically rendered — Next.js renders this on every request
import { cookies } from "next/headers";

export default async function UserDashboard() {
  const cookieStore = await cookies(); // cookies() opts the route into dynamic rendering
  const session = cookieStore.get("session");
  const user = await fetchUser(session?.value);
  return <div>Hello, {user.name}</div>;
}

// Force a route to be dynamic even without using dynamic functions:
export const dynamic = "force-dynamic";

// Force a route to be static (skip dynamic evaluation):
export const dynamic = "force-static";`}</code></pre>

      <h2 id="four-cache-layers">The 4-Layer Cache Model</h2>
      <p>
        Next.js has four distinct caches that interact with each other. Understanding all four
        is the difference between being able to debug cache behavior and being confused by it.
      </p>

      <ArticleTable caption="The four caches, where they live, and what they store." minWidth={1000}>
        <table>
          <thead>
            <tr>
              <th>Cache</th>
              <th>Location</th>
              <th>What it caches</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Request Memoization</strong></td>
              <td>Server, per-request</td>
              <td>Identical <code>fetch()</code> calls within one server render</td>
              <td>Single request lifetime only</td>
            </tr>
            <tr>
              <td><strong>Data Cache</strong></td>
              <td>Server, persistent</td>
              <td>Fetch responses across requests and deployments</td>
              <td>Until revalidated or manually purged</td>
            </tr>
            <tr>
              <td><strong>Full Route Cache</strong></td>
              <td>Server, persistent</td>
              <td>Rendered HTML and RSC payload for static routes</td>
              <td>Until revalidated or new deployment</td>
            </tr>
            <tr>
              <td><strong>Router Cache</strong></td>
              <td>Browser, in-memory</td>
              <td>RSC payloads for visited routes</td>
              <td>Session (resets on page refresh), ~30s static, ~0s dynamic</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="request-memoization">Layer 1: Request Memoization</h3>
      <p>
        Within a single server render, Next.js deduplicates identical <code>fetch()</code> calls.
        If <code>ProductDetail</code>, <code>ProductSidebar</code>, and <code>RelatedProducts</code>
        all call <code>fetch("/api/products/123")</code>, only one HTTP request is made. This lets
        you write components that fetch their own data without worrying about waterfalls or
        duplicate network calls.
      </p>

      <pre><code>{`// Three separate Server Components all fetching the same resource:
// getUser() makes one fetch call — but it's deduplicated automatically

async function getUser(id: string) {
  // Same URL called three times in one render tree = only ONE actual HTTP call
  const res = await fetch(\`https://api.example.com/users/\${id}\`);
  return res.json();
}

// Header component
async function Header({ userId }: { userId: string }) {
  const user = await getUser(userId); // fetch /users/123
  return <header>{user.name}</header>;
}

// Sidebar component
async function Sidebar({ userId }: { userId: string }) {
  const user = await getUser(userId); // same URL — memoized, no second HTTP call
  return <aside>{user.avatar}</aside>;
}

// Note: memoization applies to the fetch function, NOT to arbitrary async functions.
// For non-fetch data sources, use React.cache() to get the same behavior:
import { cache } from "react";

const getUserFromDB = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } }); // deduplicated per render
});`}</code></pre>

      <h3 id="data-cache">Layer 2: Data Cache</h3>
      <p>
        The Data Cache persists fetch responses across multiple requests and deployments. It is
        stored on the Next.js server (or edge nodes) and survives individual request lifetimes.
        This is what enables ISR (Incremental Static Regeneration) — stale data is served from
        the cache while a background revalidation updates it.
      </p>

      <pre><code>{`// Cached indefinitely (until manual revalidation or deployment)
const data = await fetch("https://api.example.com/data");
// Equivalent to:
const data = await fetch("https://api.example.com/data", { cache: "force-cache" });

// Cached with time-based revalidation (ISR pattern)
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 3600 }, // revalidate at most every 1 hour
});

// Opt OUT of the Data Cache — always fresh data on every request
const data = await fetch("https://api.example.com/data", {
  cache: "no-store",
});

// Tag-based revalidation — revalidate by tag, not just by time
const data = await fetch("https://api.example.com/products", {
  next: { tags: ["products"] },
});

// Then from a Server Action or Route Handler:
import { revalidateTag } from "next/cache";
revalidateTag("products"); // invalidates all fetches tagged with "products"

// Path-based revalidation:
import { revalidatePath } from "next/cache";
revalidatePath("/products"); // invalidates the Full Route Cache for this path`}</code></pre>

      <h3 id="full-route-cache">Layer 3: Full Route Cache</h3>
      <p>
        The Full Route Cache stores the rendered HTML and RSC payload for statically rendered
        routes. This is what makes Next.js static pages blazingly fast — no server work at all
        on request. Dynamic routes bypass the Full Route Cache entirely.
      </p>

      <pre><code>{`// This route gets Full Route Cache:
// - Static rendering (no cookies(), headers(), etc.)
// - Data Cache with revalidate or force-cache
export default async function ProductsPage() {
  const products = await fetch("https://api.example.com/products", {
    next: { revalidate: 60 }, // revalidate hourly
  }).then(r => r.json());

  return <ProductGrid products={products} />;
}
// On the first request, Next.js renders the page and stores the HTML.
// For the next 60 seconds, the stored HTML is served directly — zero rendering work.
// After 60 seconds, the next request triggers a background revalidation.

// This route does NOT get Full Route Cache:
import { cookies } from "next/headers";

export default async function PersonalizedPage() {
  const cookieStore = await cookies(); // dynamic function — bypasses Full Route Cache
  // ...
}`}</code></pre>

      <h3 id="router-cache">Layer 4: Router Cache</h3>
      <p>
        The Router Cache lives in the <strong>browser</strong>. It caches RSC payloads for
        routes you have navigated to, enabling instant back/forward navigation. This is the cache
        that surprises developers the most — mutations may not immediately reflect because the
        browser is serving the cached route.
      </p>

      <pre><code>{`// Router Cache behavior:
// - Static routes: cached for ~5 minutes
// - Dynamic routes: cached for ~30 seconds (configurable in next.config.ts)
// - Cleared: on full page refresh, calling router.refresh(), or revalidatePath()

// When to call router.refresh() in a Client Component:
"use client";
import { useRouter } from "next/navigation";

export function DeleteButton({ itemId }: { itemId: string }) {
  const router = useRouter();

  async function handleDelete() {
    await fetch(\`/api/items/\${itemId}\`, { method: "DELETE" });
    router.refresh(); // clears Router Cache and triggers re-fetch of current route
  }

  return <button onClick={handleDelete}>Delete</button>;
}

// Or configure the staletime in next.config.ts (Next.js 15+):
// next.config.ts
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,   // don't cache dynamic routes in Router Cache
      static: 300,  // cache static routes for 5 minutes
    },
  },
};`}</code></pre>

      <h2 id="fetch-options">fetch() Options and Cache Behavior</h2>
      <ArticleTable caption="Complete reference for Next.js-extended fetch options." minWidth={960}>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Effect on Data Cache</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>cache: "force-cache"</code></td>
              <td>Cache indefinitely (default for static routes)</td>
              <td>Data that rarely or never changes (CMS content, product catalog)</td>
            </tr>
            <tr>
              <td><code>cache: "no-store"</code></td>
              <td>Never cache — always fresh</td>
              <td>User-specific data, real-time prices, live inventory</td>
            </tr>
            <tr>
              <td><code>next.revalidate: N</code></td>
              <td>Cache for N seconds, then revalidate in background (ISR)</td>
              <td>Content that changes occasionally (blog posts, product descriptions)</td>
            </tr>
            <tr>
              <td><code>next.tags: ["tag"]</code></td>
              <td>Cache with tag, invalidate via <code>revalidateTag("tag")</code></td>
              <td>When you need event-driven revalidation (on mutation)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="revalidation">Revalidation Strategies</h2>

      <pre><code>{`// Strategy 1: Time-based (ISR) — simplest, no infrastructure needed
const data = await fetch(url, { next: { revalidate: 60 } });

// Strategy 2: On-demand via tag — triggered by mutations
// In your Server Action that updates a product:
"use server";
import { revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: ProductUpdate) {
  await db.product.update({ where: { id }, data });
  revalidateTag("products"); // invalidates all fetches tagged with "products"
  revalidateTag(\`product-\${id}\`); // more granular: only this product's fetch
}

// The fetch that will be revalidated:
const product = await fetch(\`/api/products/\${id}\`, {
  next: { tags: [\`product-\${id}\`, "products"] },
});

// Strategy 3: On-demand via path
import { revalidatePath } from "next/cache";
revalidatePath("/products"); // invalidates the page at /products
revalidatePath("/products/[id]", "page"); // invalidates all dynamic product pages
revalidatePath("/products", "layout"); // invalidates the layout AND all pages under /products

// Strategy 4: Webhook-triggered revalidation (ISR with external triggers)
// src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const { tag, secret } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag });
}`}</code></pre>

      <h2 id="unstable-cache">unstable_cache for Non-fetch Data</h2>
      <p>
        <code>fetch()</code> is automatically integrated with the Next.js Data Cache. For
        other data sources (database queries, file reads, third-party SDKs), use{" "}
        <code>unstable_cache</code> to get the same caching behavior.
      </p>

      <pre><code>{`import { unstable_cache } from "next/cache";

// Wrap any async function to cache its results in the Data Cache
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return db.user.findUnique({ where: { id: userId } });
  },
  ["user"], // cache key prefix
  {
    tags: ["users"],    // for tag-based revalidation
    revalidate: 3600,   // 1 hour time-based revalidation
  }
);

// Usage — behaves like a cached fetch
const user = await getCachedUser(userId);

// Revalidate when the user is updated:
"use server";
import { revalidateTag } from "next/cache";

export async function updateUser(id: string, data: UserUpdate) {
  await db.user.update({ where: { id }, data });
  revalidateTag("users"); // invalidates getCachedUser for all userIds
}`}</code></pre>

      <h2 id="generate-static-params">generateStaticParams</h2>
      <p>
        For dynamic routes that should be statically rendered, export{" "}
        <code>generateStaticParams</code> to tell Next.js which parameter values to pre-render
        at build time.
      </p>

      <pre><code>{`// src/app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  // Return an array of param objects — Next.js pre-renders one page per entry
  return posts.map((post) => ({ slug: post.slug }));
}

// For catch-all routes:
// src/app/docs/[...path]/page.tsx
export async function generateStaticParams() {
  const docs = await getAllDocPaths();
  return docs.map((path) => ({ path: path.split("/") }));
}

// Control what happens for params NOT in generateStaticParams:
export const dynamicParams = true;  // default: render on-demand and cache
export const dynamicParams = false; // return 404 for unknown params (strict static)`}</code></pre>

      <h2 id="dynamic-functions">Dynamic Functions That Opt Out of Caching</h2>
      <p>
        Calling any of these functions in a Server Component automatically makes the route
        dynamic — Next.js renders it on every request and bypasses the Full Route Cache.
      </p>

      <pre><code>{`// These functions opt a route into dynamic rendering:
import { cookies } from "next/headers";
import { headers } from "next/headers";
// accessing searchParams prop from page.tsx also makes the page dynamic

const cookieStore = await cookies(); // dynamic
const headerStore = await headers(); // dynamic

// Pattern: isolate dynamic functions to keep most of the page static
// Use Suspense to stream the dynamic part alongside a static shell:

// src/app/product/[id]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // This part is static — fetches product data at build time
  const product = await getProduct(id);

  return (
    <div>
      <ProductDetails product={product} />
      {/* This Suspense boundary streams in the dynamic (user-specific) section */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <PersonalizedRecommendations productId={id} />
      </Suspense>
    </div>
  );
}

// PersonalizedRecommendations reads cookies, making it dynamic,
// but it's isolated inside a Suspense boundary
async function PersonalizedRecommendations({ productId }: { productId: string }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user-id")?.value;
  const recs = await getPersonalizedRecs(userId, productId);
  return <RecommendationGrid items={recs} />;
}`}</code></pre>

      <h2 id="common-cache-bugs">Common Cache Bugs</h2>
      <ul>
        <li>
          <strong>Stale data after mutation.</strong> You call a Server Action to update data but
          the page still shows old data. Cause: the Router Cache or Full Route Cache is serving
          stale content. Fix: call <code>revalidatePath()</code> or <code>revalidateTag()</code>
          from the Server Action.
        </li>
        <li>
          <strong>Development vs production cache difference.</strong> In <code>pnpm dev</code>,
          the Data Cache and Full Route Cache are disabled by default. Caching bugs only appear
          in production builds. Always test with <code>pnpm build && pnpm start</code>.
        </li>
        <li>
          <strong>Over-caching user-specific data.</strong> Using <code>force-cache</code> or
          <code>revalidate</code> on fetches that return user-specific content — those responses
          will be shared across users if the Full Route Cache is active.
        </li>
        <li>
          <strong>Forgetting that Route Handlers are cached by GET method.</strong> GET Route
          Handlers are statically evaluated by default. Add <code>export const dynamic = "force-dynamic"</code>
          if you need the handler to run on every request.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain Next.js caching in an interview"
        intro="Interviewers want to see that you understand caching as a system with multiple layers, not just as 'adding cache: no-store to your fetch'. Show you know the tradeoffs."
        steps={[
          "Name the four layers: Request Memoization (per-request deduplication), Data Cache (persistent fetch cache), Full Route Cache (HTML/RSC stored on server), Router Cache (browser-side RSC payload cache). Each lives in a different place and has different invalidation mechanisms.",
          "Explain what makes a route static vs dynamic: static routes have no cookies(), headers(), or no-store fetches. Dynamic functions opt the entire route into per-request rendering and bypass the Full Route Cache.",
          "Cover the ISR pattern: fetch with next.revalidate serves cached data and revalidates in the background. next.tags enables event-driven invalidation — you call revalidateTag() from a Server Action after a mutation.",
          "Call out the development gotcha: caches are disabled in dev mode. Production is the first time you see full cache behavior. Always test with pnpm build && pnpm start before claiming something is 'not cached'.",
          "Explain Router Cache: it's client-side and can serve stale data after mutations. The fix is revalidatePath() from a Server Action (which also clears the Router Cache for that path) or router.refresh() from the client.",
        ]}
      />
    </div>
  );
}
