import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cacheAsideDiagram = String.raw`flowchart TD
    REQ["GET /products/:id"]
    REQ --> CHECK["Check Redis\nGET product:id"]
    CHECK -->|"HIT"| RETURN["Return cached data\nCache-Control: max-age=300"]
    CHECK -->|"MISS"| DB["Query PostgreSQL\nSELECT * FROM products WHERE id = ?"]
    DB --> STORE["Store in Redis\nSETEX product:id 300 json_data"]
    STORE --> RETURN2["Return data"]`;

const cacheStrategiesDiagram = String.raw`flowchart LR
    subgraph CA["Cache-Aside (Lazy)"]
        A1["App checks cache"] --> A2{"Miss?"}
        A2 -->|Yes| A3["Load from DB"] --> A4["Store in cache"] --> A5["Return"]
        A2 -->|No| A5
    end
    subgraph RT["Read-Through"]
        B1["App reads cache"] --> B2{"Miss?"}
        B2 -->|Yes| B3["Cache loads from DB automatically"] --> B4["Return"]
        B2 -->|No| B4
    end
    subgraph WT["Write-Through"]
        C1["App writes"] --> C2["Cache updates DB"] --> C3["Cache updates itself"] --> C4["Return"]
    end`;

export const toc: TocItem[] = [
  { id: "why-cache", title: "Why Cache", level: 2 },
  { id: "cache-aside", title: "Cache-Aside Pattern", level: 2 },
  { id: "cache-strategies", title: "Cache Strategies Compared", level: 2 },
  { id: "redis-data-structures", title: "Redis Data Structures for Caching", level: 2 },
  { id: "ttl-strategies", title: "TTL Strategies", level: 2 },
  { id: "cache-invalidation", title: "Cache Invalidation", level: 2 },
  { id: "ioredis-express", title: "ioredis in Express", level: 2 },
  { id: "http-caching", title: "HTTP Caching Headers", level: 2 },
  { id: "when-not-to-cache", title: "When NOT to Cache", level: 2 },
];

export default function CachingRedis() {
  return (
    <div className="article-content">
      <p>
        &quot;There are only two hard things in Computer Science: cache invalidation and naming
        things.&quot; — Phil Karlton. Caching is one of the highest-leverage performance
        improvements available: a Redis GET takes ~0.1ms; a PostgreSQL query with joins takes 5–50ms.
        A 50x speedup with a few lines of code. But wrong cache invalidation corrupts user data.
        Know exactly when the cache is stale, or don&apos;t cache.
      </p>

      <h2 id="why-cache">Why Cache</h2>
      <pre><code>{`// Latency numbers that justify caching
// L1 cache reference:          0.5 ns
// L2 cache reference:          7 ns
// Main memory access:          100 ns
// SSD random read:             150 us  (150,000 ns)
// Redis GET (local):           0.1 ms  (100,000 ns)
// PostgreSQL simple query:     5-10 ms
// PostgreSQL complex query:    50-500 ms
// Network round-trip (LAN):    0.5 ms
// Network round-trip (cross-region): 150 ms

// Cache hit ratio math
// If p% of requests hit cache with 0.1ms response time
// And (1-p)% go to DB with 10ms response time
// Average latency = 0.1*p + 10*(1-p)

// At 80% cache hit ratio: 0.1*0.8 + 10*0.2 = 0.08 + 2.0 = 2.08ms  (vs 10ms uncached)
// At 95% cache hit ratio: 0.1*0.95 + 10*0.05 = 0.095 + 0.5 = 0.595ms (vs 10ms uncached)

// Beyond latency: caching reduces DB load
// DB can serve fewer queries → handle more concurrent users
// Use case: product catalog, user profiles, config data, computed aggregates`}</code></pre>

      <h2 id="cache-aside">Cache-Aside Pattern</h2>
      <MermaidDiagram
        chart={cacheAsideDiagram}
        title="Cache-Aside (Lazy Loading) Pattern"
        caption="The application manages the cache explicitly. On miss: load from DB, store in Redis with TTL, return. On hit: return directly. The cache is only populated on demand — items not recently accessed are not in cache."
        minHeight={380}
      />
      <pre><code>{`import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// Cache-aside implementation for product lookup
async function getProduct(req: Request, res: Response) {
  const { id } = req.params;
  const cacheKey = \`product:\${id}\`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    // Cache HIT — return immediately
    res.set("X-Cache", "HIT");
    res.json(JSON.parse(cached));
    return;
  }

  // 2. Cache MISS — load from DB
  const product = await db.products.findById(id);
  if (!product) throw new NotFoundError("Product", id);

  // 3. Store in cache with TTL
  await redis.setEx(cacheKey, 300, JSON.stringify({ data: product })); // 5 minute TTL

  // 4. Return
  res.set("X-Cache", "MISS");
  res.json({ data: product });
}

// Reusable cache wrapper
async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetchFn();
  await redis.setEx(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Usage
const product = await withCache(
  \`product:\${id}\`,
  300,
  () => db.products.findById(id)
);`}</code></pre>

      <h2 id="cache-strategies">Cache Strategies Compared</h2>
      <MermaidDiagram
        chart={cacheStrategiesDiagram}
        title="Cache Strategy Patterns"
        caption="Cache-aside gives the app full control. Read-through delegates loading to the cache. Write-through keeps cache and DB in sync but adds write latency. Write-behind batches writes for throughput."
        minHeight={280}
      />
      <ArticleTable caption="Cache strategy comparison — when data is updated, read/write complexity, staleness risk" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>When Cache Updates</th>
              <th>Read Path</th>
              <th>Write Path</th>
              <th>Stale Risk</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Cache-Aside</strong></td>
              <td>On cache miss (lazy)</td>
              <td>App → Cache → (miss) → DB → Cache</td>
              <td>App → DB (cache not updated on write)</td>
              <td>Until TTL expires</td>
              <td>Read-heavy; infrequent writes; acceptable staleness</td>
            </tr>
            <tr>
              <td><strong>Read-Through</strong></td>
              <td>On cache miss (lazy)</td>
              <td>App → Cache → (miss auto-loads DB)</td>
              <td>App → DB</td>
              <td>Until TTL expires</td>
              <td>Same as cache-aside; cache manages DB loading</td>
            </tr>
            <tr>
              <td><strong>Write-Through</strong></td>
              <td>On every write (eager)</td>
              <td>App → Cache (always hit)</td>
              <td>App → Cache → DB (synchronous)</td>
              <td>None — always fresh</td>
              <td>Read-heavy; consistency critical; accept write latency</td>
            </tr>
            <tr>
              <td><strong>Write-Behind</strong></td>
              <td>On every write (eager)</td>
              <td>App → Cache (always hit)</td>
              <td>App → Cache (async → DB batch)</td>
              <td>Risk of data loss if Redis crashes before DB sync</td>
              <td>Write-heavy; throughput over durability</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="redis-data-structures">Redis Data Structures for Caching</h2>
      <pre><code>{`import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// STRINGS — simplest case: serialized JSON objects
await redis.setex("product:123", 300, JSON.stringify(product));
const raw = await redis.get("product:123");

// HASHES — cache partial object fields; update individual fields without reserializing
await redis.hset("user:123", {
  name: "Alice",
  email: "alice@example.com",
  role: "admin",
});
await redis.expire("user:123", 3600);

const name = await redis.hget("user:123", "name"); // get single field
const user = await redis.hgetall("user:123");       // get all fields as object
await redis.hset("user:123", "name", "Alice Updated"); // update one field

// SORTED SETS — leaderboards, time-series, rate limiting
// Score = value to sort by (timestamp, score, count)
await redis.zadd("leaderboard", 1500, "user:alice");
await redis.zadd("leaderboard", 2300, "user:bob");
await redis.zadd("leaderboard", 1900, "user:carol");

const top10 = await redis.zrevrange("leaderboard", 0, 9, "WITHSCORES");

// LISTS — queues, recent activity feeds
await redis.lpush("recent-views:user:123", productId);
await redis.ltrim("recent-views:user:123", 0, 49); // keep last 50
const recentViews = await redis.lrange("recent-views:user:123", 0, 9); // first 10

// SETS — unique membership (e.g., users who have seen a notification)
await redis.sadd("notification:seen:notif-456", userId);
const hasSeen = await redis.sismember("notification:seen:notif-456", userId);

// Pipelines — batch multiple commands into one round-trip
const pipeline = redis.pipeline();
pipeline.get("product:123");
pipeline.get("product:456");
pipeline.get("product:789");
const results = await pipeline.exec();
// results: [[null, "..."], [null, "..."], [null, "..."]]`}</code></pre>

      <h2 id="ttl-strategies">TTL Strategies</h2>
      <pre><code>{`// TTL = Time To Live — seconds until key expires and is deleted

// Absolute TTL — cache expires at a fixed time from insertion
// Use for: content that changes on a schedule (daily stats, hourly feed)
await redis.setex("daily-stats:2024-01-15", 86400, JSON.stringify(stats)); // 24 hours

// Sliding TTL — reset TTL on each access (cache stays as long as it's being used)
// Use for: session data, user preferences
await redis.expire("session:abc123", 1800); // reset to 30 min on each access

// Cache stampede prevention — when cache expires under high load,
// many requests hit DB simultaneously
// Solution 1: Mutex / lock
const lockKey = \`lock:product:\${id}\`;
const acquired = await redis.set(lockKey, "1", "EX", 5, "NX"); // NX = only if not exists

if (!acquired) {
  // Another request is loading — wait a bit and retry from cache
  await new Promise((resolve) => setTimeout(resolve, 50));
  return redis.get(cacheKey);
}

try {
  const data = await loadFromDb(id);
  await redis.setex(cacheKey, 300, JSON.stringify(data));
  return data;
} finally {
  await redis.del(lockKey);
}

// Solution 2: Stale-while-revalidate — serve stale data, refresh in background
const data = await redis.get(cacheKey);
const meta = await redis.get(\`\${cacheKey}:meta\`);

if (data && meta) {
  const { expiresAt } = JSON.parse(meta);
  if (Date.now() > expiresAt - 10_000) {
    // Within 10s of expiry — start background refresh
    loadFromDb(id).then((fresh) =>
      redis.setex(cacheKey, 300, JSON.stringify(fresh))
    ).catch(console.error);
  }
  return JSON.parse(data); // return stale data immediately
}

// Solution 3: Jitter — randomize TTLs to prevent synchronized expiry
const TTL_BASE = 300;
const TTL_JITTER = Math.floor(Math.random() * 60); // 0-60 seconds
await redis.setex(cacheKey, TTL_BASE + TTL_JITTER, JSON.stringify(data));`}</code></pre>

      <h2 id="cache-invalidation">Cache Invalidation</h2>
      <pre><code>{`// The hardest problem in caching: knowing when to invalidate

// Strategy 1: TTL-only (simplest — accept staleness)
// Works when: data changes infrequently, stale reads are acceptable
// Risk: stale data served for up to TTL seconds after mutation

// Strategy 2: Explicit invalidation on write (write-invalidate)
// On every mutation, delete the cached entry
// Next read will be a miss and reload fresh data

async function updateProduct(id: string, data: Partial<Product>) {
  const updated = await db.products.update({ where: { id }, data });

  // Invalidate all cache keys that may contain this product
  await redis.del(\`product:\${id}\`);
  await redis.del("products:list:*"); // wildcards need SCAN, not DEL

  return updated;
}

// Wildcard deletion — use SCAN + DEL (not KEYS which blocks Redis)
async function deleteByPattern(pattern: string) {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  for await (const keys of stream) {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Strategy 3: Tag-based invalidation
// Tag cache entries with logical groups; invalidate by tag
// E.g., all pages that show product 123, even across different routes

async function cacheWithTag(key: string, data: unknown, tags: string[], ttl: number) {
  await redis.setex(key, ttl, JSON.stringify(data));
  // Record this key under each tag
  for (const tag of tags) {
    await redis.sadd(\`tag:\${tag}\`, key);
    await redis.expire(\`tag:\${tag}\`, ttl + 60); // tag expires slightly after key
  }
}

async function invalidateTag(tag: string) {
  const keys = await redis.smembers(\`tag:\${tag}\`);
  if (keys.length > 0) await redis.del(...keys, \`tag:\${tag}\`);
}

// Usage
await cacheWithTag("product:123", product, ["product:123", "category:electronics"], 300);
// When product 123 changes:
await invalidateTag("product:123"); // invalidates all cache entries tagged with this product`}</code></pre>

      <h2 id="ioredis-express">ioredis in Express</h2>
      <pre><code>{`// ioredis vs redis (official client):
// ioredis: more features, cluster support, Lua scripting, TypeScript first
// redis: official client, promises-based, similar API

import Redis from "ioredis";

// src/lib/redis.ts — singleton
const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000), // exponential backoff
  enableOfflineQueue: true, // queue commands while reconnecting
  lazyConnect: true, // don't connect until first command
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err));
redis.on("reconnecting", () => console.log("Redis reconnecting..."));

export { redis };

// Cache middleware for Express routes
function cacheMiddleware(ttl: number) {
  return asyncHandler(async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = \`cache:\${req.originalUrl}\`;
    const cached = await redis.get(key);

    if (cached) {
      res.set("X-Cache", "HIT");
      res.json(JSON.parse(cached));
      return;
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        redis.setex(key, ttl, JSON.stringify(body)).catch(console.error);
      }
      return originalJson(body);
    };

    res.set("X-Cache", "MISS");
    next();
  });
}

// Apply to specific routes
router.get("/products", cacheMiddleware(300), listProducts);
router.get("/products/:id", cacheMiddleware(300), getProduct);`}</code></pre>

      <h2 id="http-caching">HTTP Caching Headers</h2>
      <pre><code>{`// HTTP caching: browser and CDN cache responses without hitting your server

// Cache-Control — primary caching directive
res.set("Cache-Control", "public, max-age=300");
// public: both browser and CDN may cache
// private: only browser may cache (user-specific data)
// no-store: don't cache at all (sensitive data)
// no-cache: cache but revalidate with server before use (304 responses)
// max-age=300: cache is fresh for 300 seconds
// stale-while-revalidate=60: serve stale cache while fetching fresh in background

// ETag — content hash for conditional requests
// Server generates ETag (hash of content)
res.set("ETag", crypto.createHash("md5").update(JSON.stringify(product)).digest("hex"));

// Client sends ETag on next request
// GET /products/123
// If-None-Match: "abc123hash"
if (req.headers["if-none-match"] === product.etag) {
  res.sendStatus(304); // Not Modified — client uses cached version
  return;
}

// Last-Modified — timestamp-based conditional caching
res.set("Last-Modified", product.updatedAt.toUTCString());

// GET /products/123
// If-Modified-Since: Mon, 15 Jan 2024 10:00:00 GMT
const ifModifiedSince = req.headers["if-modified-since"];
if (ifModifiedSince && product.updatedAt <= new Date(ifModifiedSince)) {
  res.sendStatus(304);
  return;
}

// Practical caching headers for API routes
function setCacheHeaders(res: Response, options: {
  ttl: number;         // seconds
  visibility?: "public" | "private";
  revalidate?: number; // stale-while-revalidate seconds
}) {
  const directives = [
    options.visibility ?? "private",
    \`max-age=\${options.ttl}\`,
    ...(options.revalidate ? [\`stale-while-revalidate=\${options.revalidate}\`] : []),
  ];
  res.set("Cache-Control", directives.join(", "));
}

// Public product catalog — safe to cache in CDN
router.get("/products/:id", async (req, res) => {
  const product = await getProduct(req.params.id);
  setCacheHeaders(res, { ttl: 300, visibility: "public", revalidate: 60 });
  res.json({ data: product });
});

// User-specific data — browser only, never CDN
router.get("/users/me", authenticate, async (req, res) => {
  const user = await getUser(req.user!.id);
  setCacheHeaders(res, { ttl: 60, visibility: "private" });
  res.json({ data: user });
});`}</code></pre>

      <h2 id="when-not-to-cache">When NOT to Cache</h2>
      <pre><code>{`// Don't cache these:

// 1. User-specific data with high mutation rate
// Shopping cart, notification count, real-time balance
// Cache invalidation is too frequent to be worthwhile

// 2. Financial or medical data that must be authoritative
// Even 1 second of staleness is unacceptable
// Just don't cache — DB query is the source of truth

// 3. Uniqueness checks during user creation
// WRONG: check cache for "is email taken?" — cache may be stale
// Duplicate email hits DB constraint, race condition creates duplicate users
const isEmailTaken = await redis.get(\`email:\${email}\`); // ✗ stale = duplicate account

// CORRECT: always check the authoritative source for critical uniqueness checks
const existing = await db.users.findByEmail(email); // ✓ always authoritative
if (existing) throw new ConflictError("Email already registered");

// 4. POST response — never cache the response to a mutating request
// (Browsers won't, but middleware caches might)
router.post("/users", (req, res) => {
  res.set("Cache-Control", "no-store"); // explicit — don't cache POST responses
  // ...
});

// 5. Data where you can't reliably compute the cache key
// Complex search queries with many filter combinations
// For search: Elasticsearch or DB full-text search is better than cache

// Rule of thumb: cache reads, not writes
// Cache shared data, not user-specific data
// Cache stable data, not rapidly changing data`}</code></pre>
    </div>
  );
}
