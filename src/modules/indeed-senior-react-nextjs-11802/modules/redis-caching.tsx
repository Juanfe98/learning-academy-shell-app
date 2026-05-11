import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cacheAsideDiagram = String.raw`flowchart LR
    NX["Next.js Server\n(Route Handler or Server Component)"]
    REDIS["Redis\n(in-memory cache)"]
    CS["Contentstack\nDelivery API CDN"]

    NX -->|"1. GET key"| REDIS
    REDIS -->|"2a. Cache HIT → return data"| NX
    REDIS -->|"2b. Cache MISS"| NX
    NX -->|"3. Fetch from CMS"| CS
    CS -->|"4. Return data"| NX
    NX -->|"5. SETEX key TTL data"| REDIS`;

const webhookInvalidationDiagram = String.raw`sequenceDiagram
    participant ED as Editor
    participant CS as Contentstack
    participant WH as Webhook Handler
    participant RD as Redis
    participant NX as Next.js Cache

    ED->>CS: Publishes article (uid: blt123)
    CS->>WH: POST /api/revalidate { uid, slug, contentType }
    WH->>RD: DEL contentstack:article:blt123:en-us
    WH->>NX: revalidatePath('/help/billing/update-billing')
    WH->>NX: revalidateTag('article:blt123')
    WH-->>CS: 200 OK { invalidated: true }
    Note over RD: Next request for blt123 re-fetches from CS and re-populates Redis`;

export const toc: TocItem[] = [
  { id: "why-redis", title: "Why Redis as a CMS API Cache Layer", level: 2 },
  { id: "cache-aside", title: "Cache-Aside Pattern", level: 2 },
  { id: "key-strategy", title: "Cache Key Strategy", level: 3 },
  { id: "ttl-strategy", title: "TTL Strategy Per Content Type", level: 3 },
  { id: "redis-connection", title: "Redis Connection in Next.js (Singleton Pattern)", level: 2 },
  { id: "webhook-invalidation", title: "Webhook-Triggered Cache Invalidation", level: 2 },
  { id: "monitoring", title: "Monitoring Cache Hit Rate", level: 2 },
  { id: "caching-layers", title: "All Caching Layers Compared", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function RedisCaching() {
  return (
    <div className="article-content">
      <p>
        At scale, even a CDN-backed headless CMS can become a bottleneck. The Contentstack
        Delivery API has rate limits. Cold ISR requests hit the CMS on every cache miss. A Redis
        layer between Next.js and Contentstack reduces API costs, eliminates rate limit errors
        during traffic spikes, and reduces p99 latency for server-side renders. This module
        covers the complete caching architecture for a Help Center.
      </p>

      <h2 id="why-redis">Why Redis as a CMS API Cache Layer</h2>
      <p>
        Next.js already has ISR caching for full page renders. So why Redis? Three reasons:
      </p>
      <ol>
        <li>
          <strong>Rate limit protection during traffic spikes.</strong> If 100 users hit uncached
          article pages simultaneously (after a deploy, for example), 100 requests hit Contentstack
          in parallel. Redis absorbs this: the first request populates the cache, the other 99
          get served from Redis.
        </li>
        <li>
          <strong>Reduce latency for SSR routes and Route Handlers.</strong> Route Handlers
          serving personalized content (user saved articles + CMS data) run on every request —
          no ISR. Redis caches the CMS portion of that response.
        </li>
        <li>
          <strong>Control over cache invalidation.</strong> You can invalidate specific Redis keys
          via webhook on article publish, independent of Next.js ISR TTLs. This gives you more
          granular control.
        </li>
      </ol>

      <h2 id="cache-aside">Cache-Aside Pattern</h2>
      <MermaidDiagram
        chart={cacheAsideDiagram}
        title="Cache-Aside Pattern with Redis Between Next.js and Contentstack"
        caption="On a cache miss, fetch from Contentstack and populate Redis. On a cache hit, return from Redis without touching Contentstack. Simple, effective, debuggable."
        minHeight={300}
      />

      <pre>
        <code>{`// src/lib/contentstack-cached.ts — cache-aside wrapper
import "server-only"; // prevent client bundle inclusion
import { getRedisClient } from "@/lib/redis";
import { getArticle as getArticleFromCms } from "@/lib/contentstack";
import type { Article } from "@/lib/types/contentstack";

export async function getArticle(slug: string, locale = "en-us"): Promise<Article | null> {
  const redis = getRedisClient();
  const cacheKey = \`contentstack:article:\${slug}:\${locale}\`;

  // 1. Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    // Track cache hit for monitoring
    console.log(\`Cache HIT: \${cacheKey}\`);
    return JSON.parse(cached) as Article;
  }

  console.log(\`Cache MISS: \${cacheKey}\`);

  // 2. Fetch from Contentstack on cache miss
  const article = await getArticleFromCms(slug, locale);

  if (article) {
    // 3. Populate Redis with TTL
    // SETEX key seconds value — atomically sets and expires
    await redis.setex(
      cacheKey,
      3600, // 1 hour — matches the ISR revalidation interval
      JSON.stringify(article)
    );
  }

  return article;
}`}</code>
      </pre>

      <h3 id="key-strategy">Cache Key Strategy</h3>

      <pre>
        <code>{`// Key format: contentstack:{contentType}:{uid}:{locale}
// Deterministic — the same content always produces the same key
// Namespace-scoped — can DEL by pattern for bulk invalidation
// Locale-aware — different locales are separate cache entries

// Article by slug:
\`contentstack:article:/help/billing/update-billing:en-us\`

// Article by uid (for embedded entry lookup):
\`contentstack:article:blt123abc:en-us\`

// Category listing:
\`contentstack:category-listing:/help/billing:en-us\`

// Homepage featured articles:
\`contentstack:featured-articles:en-us\`

// Benefits of this format:
// 1. Can invalidate all English article caches: redis.keys('contentstack:article:*:en-us')
// 2. Can invalidate one specific article: redis.del('contentstack:article:blt123:en-us')
// 3. Clear all caches for a locale: pattern-based deletion

// Bulk invalidation by content type (after a structural CMS change):
async function invalidateContentType(contentType: string, locale: string) {
  const pattern = \`contentstack:\${contentType}:*:\${locale}\`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}`}</code>
      </pre>

      <h3 id="ttl-strategy">TTL Strategy Per Content Type</h3>

      <pre>
        <code>{`// TTL varies by content type based on update frequency and staleness tolerance

const CACHE_TTL = {
  article: 3600,           // 1 hour — articles rarely change after publish
  "category-listing": 300, // 5 minutes — new articles appear in listings quickly
  "featured-articles": 60, // 1 minute — marketing changes featured content frequently
  author: 86400,            // 24 hours — author profiles almost never change
  navigation: 3600,        // 1 hour — site navigation changes infrequently
} as const;

// Usage:
await redis.setex(
  cacheKey,
  CACHE_TTL.article,
  JSON.stringify(article)
);

// Short TTL (60s) — items that need to be fresh fast (featured hero)
// Medium TTL (300s) — items editors publish and expect visible within minutes (categories)
// Long TTL (3600s) — stable content where staleness is acceptable (article detail)
// Very long TTL (86400s) — nearly immutable data (author profiles)`}</code>
      </pre>

      <h2 id="redis-connection">Redis Connection in Next.js (Singleton Pattern)</h2>
      <p>
        Serverless functions (Next.js on Vercel, AWS Lambda) create new function instances on
        cold starts. Without a singleton, each invocation creates a new Redis connection, quickly
        exhausting the connection pool.
      </p>

      <pre>
        <code>{`// src/lib/redis.ts — global singleton connection
import "server-only";
import { Redis } from "ioredis";

// Use global to persist the connection between hot reloads in development
// and between invocations in serverless environments that reuse the Node.js process
declare global {
  var redis: Redis | undefined;
}

export function getRedisClient(): Redis {
  if (global.redis) {
    return global.redis;
  }

  const redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      // Exponential backoff: 50ms, 100ms, 200ms
      return Math.min(times * 50, 200);
    },
    lazyConnect: true, // don't connect until first command
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err);
    // Don't throw — let the CMS cache miss path handle it
  });

  global.redis = redis;
  return redis;
}

// For serverless environments with connection pooling (Upstash, Redis Cloud):
// Use the HTTP-based client instead of ioredis (no persistent TCP connection)
import { Redis } from "@upstash/redis";

const upstashRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
// Upstash Redis is the recommended choice for Vercel serverless functions`}</code>
      </pre>

      <h2 id="webhook-invalidation">Webhook-Triggered Cache Invalidation</h2>
      <MermaidDiagram
        chart={webhookInvalidationDiagram}
        title="Webhook-Triggered Redis + Next.js Cache Invalidation Chain"
        caption="A single Contentstack publish event triggers invalidation across Redis and Next.js ISR cache simultaneously — no stale data window."
        minHeight={440}
      />

      <pre>
        <code>{`// src/app/api/revalidate/route.ts — handles both Redis and Next.js cache invalidation
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis";
import crypto from "node:crypto";

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const hmac = crypto
    .createHmac("sha256", process.env.CONTENTSTACK_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-contentstack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { content_type_uid, data, event } = payload;

  if (!["publish", "unpublish"].includes(event)) {
    return Response.json({ skipped: true });
  }

  const redis = getRedisClient();
  const promises: Promise<unknown>[] = [];

  if (content_type_uid === "article") {
    const entry = data.entries?.[0];
    if (entry) {
      // Invalidate Redis cache for all locales of this article
      const locales = ["en-us", "es-mx", "fr-fr"];
      for (const locale of locales) {
        const key = \`contentstack:article:\${entry.url}:\${locale}\`;
        promises.push(redis.del(key));
        // Also invalidate by uid for embedded entry lookups
        const uidKey = \`contentstack:article:\${entry.uid}:\${locale}\`;
        promises.push(redis.del(uidKey));
      }

      // Invalidate Next.js ISR cache
      if (entry.url) {
        promises.push(Promise.resolve(revalidatePath(entry.url)));
        promises.push(Promise.resolve(revalidateTag(\`article:\${entry.uid}\`)));
      }

      // Invalidate category listing (new article appears here)
      if (entry.category?.url) {
        const listingKey = \`contentstack:category-listing:\${entry.category.url}:en-us\`;
        promises.push(redis.del(listingKey));
        promises.push(Promise.resolve(revalidatePath(entry.category.url)));
      }
    }
  }

  await Promise.allSettled(promises); // Don't fail if some invalidations fail

  return Response.json({
    invalidated: true,
    contentType: content_type_uid,
    uid: data.entries?.[0]?.uid,
  });
}`}</code>
      </pre>

      <h2 id="monitoring">Monitoring Cache Hit Rate</h2>

      <pre>
        <code>{`// Instrument the cache-aside pattern to track hit rate
// Log to your observability platform (Datadog, CloudWatch, etc.)

type CacheOutcome = "hit" | "miss" | "error";

async function getArticleWithMetrics(slug: string, locale: string): Promise<Article | null> {
  const redis = getRedisClient();
  const cacheKey = \`contentstack:article:\${slug}:\${locale}\`;
  const startTime = Date.now();
  let outcome: CacheOutcome = "hit";

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      // Record cache hit metric
      trackMetric("redis.cache.hit", 1, { contentType: "article" });
      trackMetric("redis.cache.latency", Date.now() - startTime, { outcome: "hit" });
      return JSON.parse(cached) as Article;
    }

    outcome = "miss";
    const article = await getArticleFromCms(slug, locale);
    if (article) {
      await redis.setex(cacheKey, CACHE_TTL.article, JSON.stringify(article));
    }

    trackMetric("redis.cache.miss", 1, { contentType: "article" });
    return article;
  } catch (redisError) {
    // Redis failure — fall through to CMS
    outcome = "error";
    console.error("Redis error, falling back to CMS:", redisError);
    trackMetric("redis.cache.error", 1, { contentType: "article" });
    return getArticleFromCms(slug, locale); // graceful degradation
  } finally {
    trackMetric("redis.cache.latency", Date.now() - startTime, { outcome });
  }
}

// Target metrics:
// Cache hit rate > 80% indicates the cache is working effectively
// Cache hit rate < 60% suggests TTL is too short or keys are being invalidated too aggressively
// Redis latency p99 < 5ms (in-memory — should be very fast)
// CMS fetch latency p99 < 200ms (Contentstack CDN — fast, but not as fast as Redis)`}</code>
      </pre>

      <h2 id="caching-layers">All Caching Layers Compared</h2>

      <ArticleTable caption="Each caching layer has a specific scope, TTL, and invalidation trigger. Understanding all layers prevents debugging nightmares." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>What It Caches</th>
              <th>TTL</th>
              <th>Invalidation Trigger</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Browser Cache</strong></td>
              <td>Full HTML pages, JS bundles, images</td>
              <td>max-age or Cache-Control</td>
              <td>User refresh or TTL expiry</td>
              <td>Per user, per browser</td>
            </tr>
            <tr>
              <td><strong>CDN (Cloudflare / Vercel Edge)</strong></td>
              <td>Full HTML pages for public routes</td>
              <td>s-maxage (same as ISR revalidate)</td>
              <td>Webhook → revalidatePath → CDN purge</td>
              <td>Global, shared across all users</td>
            </tr>
            <tr>
              <td><strong>Next.js Full-Route Cache</strong></td>
              <td>Server-rendered page output (HTML + RSC payload)</td>
              <td>revalidate: N seconds</td>
              <td>revalidatePath / revalidateTag</td>
              <td>Per Next.js server instance</td>
            </tr>
            <tr>
              <td><strong>Next.js Data Cache (fetch)</strong></td>
              <td>Results of fetch() calls with next: options</td>
              <td>revalidate: N or tags</td>
              <td>revalidateTag(tag)</td>
              <td>Per Next.js server instance</td>
            </tr>
            <tr>
              <td><strong>Redis</strong></td>
              <td>Contentstack API responses (JSON)</td>
              <td>SETEX TTL per content type</td>
              <td>DEL key via webhook handler</td>
              <td>Shared across all server instances</td>
            </tr>
            <tr>
              <td><strong>Contentstack CDN</strong></td>
              <td>Content entries served by the Delivery API</td>
              <td>Auto-managed by Contentstack</td>
              <td>On entry publish in Contentstack</td>
              <td>Global, managed by Contentstack</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you cache CMS content to reduce API costs and improve performance?'"
        intro="This question tests multi-layer thinking. Don't just say 'add Redis' — explain why each layer exists, what problem it solves, and how they interact."
        steps={[
          "Start with the layers: there are already caching layers in the stack — Contentstack's own CDN, Next.js ISR (full-route cache and fetch cache), and the CDN in front of Next.js. Explain each layer and what it caches.",
          "Explain when Redis adds value on top of these layers: for SSR routes and Route Handlers that run on every request (personalized content, authenticated pages), Next.js ISR doesn't help — these pages are dynamic by definition. Redis caches the Contentstack API responses for these pages, reducing latency and protecting against rate limits during traffic spikes.",
          "Describe the cache-aside pattern: check Redis first. On hit, return immediately. On miss, fetch from Contentstack, store in Redis with a TTL, return the result. TTL varies by content type — articles 1 hour, category listings 5 minutes, featured content 1 minute.",
          "Address cache invalidation: Contentstack fires a webhook on publish. The webhook handler deletes the specific Redis keys for the published entry (by uid and slug, across all locales), then also calls Next.js revalidatePath to invalidate the ISR page cache. Both caches clear simultaneously.",
          "Close with monitoring: measure cache hit rate (target > 80%). If hit rate is low, TTLs may be too short or keys are being invalidated too aggressively. Track Redis latency (target p99 < 5ms) to catch connection pool exhaustion or network issues.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Complete Caching Strategy for an Indeed-Scale Help Center"
        scenario={
          <span>
            The Indeed Help Center has 10,000 articles and receives 200 CMS updates per day.
            Monthly active users: 2 million. The Contentstack Delivery API has a rate limit of
            1,000 requests per minute per stack. During peak traffic (e.g., a product launch),
            the Help Center receives 500 requests per second. The current implementation uses only
            Next.js ISR with revalidate: 3600 — no Redis, no additional caching layers.
          </span>
        }
        tasks={[
          "Calculate whether the current ISR-only setup can handle 500 req/sec without hitting Contentstack rate limits — show your math and explain the cache miss scenario",
          "Design the Redis cache layer: what content types do you cache, what TTL for each, and what cache key format do you use?",
          "Design the invalidation chain: when an editor publishes article uid 'blt123' with slug '/help/billing/update-billing', what Redis keys are deleted and what Next.js caches are invalidated?",
          "A Redis outage occurs. Describe the graceful degradation: what happens to article page requests when Redis is unavailable, and how do you ensure the outage doesn't take down the Help Center?",
          "You want to measure cache effectiveness. What two metrics do you track, what are the target values, and how do you alert when they fall below threshold?",
        ]}
        pitfalls={[
          "Not accounting for the cold start problem: 500 req/sec × 3600s ISR interval means up to 500 simultaneous ISR cold starts all hitting Contentstack — this alone would exhaust the rate limit",
          "Using redis.keys() pattern matching in production — KEYS blocks the Redis event loop and causes timeouts on large keyspaces; use SCAN instead",
          "Not having graceful degradation — if Redis.get() throws, catching the error and falling through to the CMS is the correct behavior, not crashing the request",
          "Using the same TTL for all content types — featured hero content must be fresh within 1 minute; author profiles can be stale for 24 hours; same TTL means either stale heroes or excessive CMS calls for immutable data",
        ]}
        signal="A strong answer calculates that 500 req/sec cold starts could easily exceed 1000/min Contentstack rate limits, adds Redis with content-type-specific TTLs, invalidates all locale variants of the article key on publish, falls through to CMS on Redis error without crashing, and tracks hit rate + latency with specific alert thresholds."
      />
    </div>
  );
}
