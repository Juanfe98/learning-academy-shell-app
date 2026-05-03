import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-caching", title: "Why Caching Exists", level: 2 },
  { id: "browser-caching", title: "Browser Caching: Cache-Control and ETag", level: 2 },
  { id: "cdn-caching", title: "CDN Caching", level: 2 },
  { id: "application-caching", title: "Application-Level Caching", level: 2 },
  { id: "redis-vs-memcached", title: "Redis vs Memcached", level: 2 },
  { id: "ttl-design", title: "TTL Design", level: 2 },
  { id: "cache-invalidation", title: "Cache Invalidation: The Hard Problem", level: 2 },
  { id: "caching-patterns", title: "Caching Patterns", level: 2 },
  { id: "cache-stampede", title: "Cache Stampede and the Thundering Herd", level: 2 },
  { id: "cache-warming", title: "Cache Warming", level: 2 },
  { id: "real-examples", title: "Real Examples", level: 2 },
  { id: "when-not-to-cache", title: "When NOT to Cache", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function CachingStrategies() {
  return (
    <div className="article-content">
      <p>
        Caching is the highest-leverage performance optimization in distributed systems. A cache hit
        can reduce a 100ms database query to a 0.5ms memory read &mdash; a 200&times; improvement.
        At scale, it is the difference between a database that handles your traffic and one that
        collapses under it. But caching is also where some of the most subtle bugs in distributed
        systems live: stale data, cache stampedes, inconsistency between cache and database, and
        silent data corruption.
      </p>

      <h2 id="why-caching">Why Caching Exists</h2>
      <p>
        <strong>Analogy:</strong> You are writing a report that requires looking up a reference book.
        After the first lookup, you keep the book open on your desk (cache) rather than returning it
        to the shelf (database) after every paragraph. The desk has limited space, so you eventually
        put older books away &mdash; but the books you use most stay close.
      </p>
      <p>
        Two primary reasons to cache:
      </p>
      <ul>
        <li>
          <strong>Latency:</strong> Memory reads (~100ns) are orders of magnitude faster than disk
          reads (~10ms) or network database queries (~5&ndash;100ms). Serving data from a Redis
          cache is 10&ndash;200&times; faster than a database query.
        </li>
        <li>
          <strong>Cost and capacity:</strong> Reducing database load extends the database&apos;s
          effective capacity. Serving 95% of reads from cache means your database handles 20&times;
          more users with the same hardware.
        </li>
      </ul>

      <h2 id="browser-caching">Browser Caching: Cache-Control and ETag</h2>
      <p>
        The browser has its own HTTP cache. The server controls browser caching behavior through
        response headers.
      </p>
      <pre><code>{`# Key Cache-Control directives
Cache-Control: public, max-age=86400
  # Public: can be cached by any cache (CDN, browser)
  # max-age=86400: fresh for 24 hours (in seconds)

Cache-Control: private, max-age=3600
  # Private: browser only (not CDN)
  # max-age=3600: fresh for 1 hour

Cache-Control: no-cache
  # Must revalidate with server before using
  # (Does NOT mean "don't cache" — despite the name)

Cache-Control: no-store
  # Do not cache at all (truly no caching)

Cache-Control: public, max-age=31536000, immutable
  # Cache for 1 year + immutable (browser will not revalidate)
  # Use for content-addressed assets (main.abc123.js)

# ETag: hash of response content
ETag: "abc123def456"

# Conditional GET: client sends If-None-Match header
# If content unchanged → 304 Not Modified (no body, saves bandwidth)
# If changed → 200 OK with new content and new ETag`}</code></pre>

      <table>
        <thead>
          <tr>
            <th>Resource type</th>
            <th>Recommended Cache-Control</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HTML pages</td>
            <td><code>no-cache</code> or <code>max-age=60</code></td>
            <td>Users need fresh HTML after deploy</td>
          </tr>
          <tr>
            <td>Hashed JS/CSS (<code>main.abc.js</code>)</td>
            <td><code>public, max-age=31536000, immutable</code></td>
            <td>Hash changes with content; cache forever</td>
          </tr>
          <tr>
            <td>Images (with version in URL)</td>
            <td><code>public, max-age=604800</code></td>
            <td>1 week; update URL to force refresh</td>
          </tr>
          <tr>
            <td>API responses (public data)</td>
            <td><code>public, max-age=60, stale-while-revalidate=300</code></td>
            <td>Cache briefly; revalidate in background</td>
          </tr>
          <tr>
            <td>API responses (user-specific)</td>
            <td><code>private, no-cache</code> or <code>no-store</code></td>
            <td>Never share between users</td>
          </tr>
        </tbody>
      </table>

      <h2 id="cdn-caching">CDN Caching</h2>
      <p>
        CDN caches (CloudFront) operate between the client and your origin server. They cache based
        on the URL (and optionally headers, cookies, query strings) and serve responses from edge
        nodes globally. A cache hit at the CDN level means your origin never receives the request.
      </p>
      <p>
        <strong>CloudFront cache key:</strong> By default, CloudFront&apos;s cache key is just the
        URL. You can add headers or query strings to the cache key if you need per-language or
        per-device responses.
      </p>
      <pre><code>{`# CloudFront behavior configuration
Default TTL: 86400     # 1 day if no Cache-Control header
Maximum TTL: 31536000  # 1 year
Minimum TTL: 0         # Can serve from cache even if no-cache header

# To include query string in cache key:
# ?version=1 and ?version=2 would be cached separately

# CloudFront caches EVERYTHING unless you tell it not to
# For API endpoints, set Cache-Control: no-store
# OR configure CloudFront behavior to not cache /api/*`}</code></pre>

      <h2 id="application-caching">Application-Level Caching</h2>
      <p>
        Application-level caching is where your backend service caches data from downstream services
        (databases, external APIs) in a fast in-memory store. This is the primary place where Redis
        or Memcached is used.
      </p>
      <pre><code>{`// Application cache pattern (Node.js + Redis)
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });

async function getUser(userId: string) {
  // 1. Check cache
  const cacheKey = \`user:\${userId}\`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);  // cache hit
  }

  // 2. Cache miss → fetch from database
  const user = await db.users.findById(userId);
  if (!user) return null;

  // 3. Populate cache with TTL
  await redis.setEx(cacheKey, 3600, JSON.stringify(user));  // 1 hour TTL

  return user;
}

// Cache invalidation on update
async function updateUser(userId: string, data: Partial<User>) {
  const user = await db.users.update(userId, data);
  // Invalidate the cached version
  await redis.del(\`user:\${userId}\`);
  return user;
}`}</code></pre>

      <h2 id="redis-vs-memcached">Redis vs Memcached</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Redis</th>
            <th>Memcached</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data structures</td>
            <td>Strings, hashes, lists, sets, sorted sets, streams</td>
            <td>Strings only</td>
          </tr>
          <tr>
            <td>Persistence</td>
            <td>Optional (RDB snapshots, AOF logs)</td>
            <td>None (in-memory only)</td>
          </tr>
          <tr>
            <td>Pub/Sub</td>
            <td>Yes</td>
            <td>No</td>
          </tr>
          <tr>
            <td>Atomic operations</td>
            <td>Yes (INCR, DECR, LPUSH, ZADD, etc.)</td>
            <td>Limited (INCR/DECR only)</td>
          </tr>
          <tr>
            <td>Cluster mode</td>
            <td>Redis Cluster (sharding)</td>
            <td>Client-side sharding</td>
          </tr>
          <tr>
            <td>Use cases</td>
            <td>Everything: caching, sessions, queues, pub/sub, rate limiting, leaderboards</td>
            <td>Simple caching only</td>
          </tr>
          <tr>
            <td>AWS managed</td>
            <td>ElastiCache for Redis (or OSS Redis on EC2)</td>
            <td>ElastiCache for Memcached</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Choose Redis in virtually all cases.</strong> Memcached&apos;s only advantage is
        slightly simpler architecture for pure caching workloads. Redis&apos;s richer data structures
        and additional features make it worth the marginal overhead. In interviews, say Redis unless
        there is a specific reason for Memcached.
      </p>

      <h2 id="ttl-design">TTL Design</h2>
      <p>
        TTL (Time to Live) determines how long a cached value remains valid before being considered
        stale. Choosing the right TTL requires balancing freshness vs. cache effectiveness.
      </p>
      <ul>
        <li><strong>User profile:</strong> 15&ndash;60 minutes. Users rarely change profile data; stale for a few minutes is acceptable.</li>
        <li><strong>Product catalog:</strong> 5&ndash;15 minutes. Products change infrequently; slight staleness is acceptable.</li>
        <li><strong>Stock/inventory count:</strong> 30&ndash;60 seconds or no cache. Stale inventory counts lead to overselling.</li>
        <li><strong>Session data:</strong> Match session expiry (typically 1&ndash;24 hours).</li>
        <li><strong>API rate limit counter:</strong> Exactly the rate window (e.g., 60 seconds).</li>
        <li><strong>Dashboard metrics/aggregates:</strong> 1&ndash;5 minutes. Metrics can be slightly stale.</li>
      </ul>
      <p>
        <strong>Jitter:</strong> If you cache 10,000 items all with a TTL of 3600 seconds and they
        all expire at the same time, you get a thundering herd to the database. Add random jitter:
        <code>TTL = 3600 + random(0, 300)</code> to spread expiration over a window.
      </p>

      <h2 id="cache-invalidation">Cache Invalidation: The Hard Problem</h2>
      <p>
        Phil Karlton famously said: &quot;There are only two hard things in Computer Science: cache
        invalidation and naming things.&quot; Cache invalidation is hard because cached data becomes
        stale when the underlying data changes, and notifying caches reliably in distributed systems
        is complex.
      </p>
      <p><strong>Invalidation strategies:</strong></p>
      <ul>
        <li>
          <strong>Time-based expiry (TTL):</strong> Simplest approach. Accept that data may be stale
          for up to TTL seconds. Right for most non-critical data.
        </li>
        <li>
          <strong>Write-through invalidation:</strong> When you write to the database, also delete
          the cache key. Next read will miss and repopulate. Simple but can lead to thundering herds.
        </li>
        <li>
          <strong>Write-through update:</strong> When you write to the database, also update the cache.
          Keeps cache warm but requires keeping them in sync, which is error-prone.
        </li>
        <li>
          <strong>Event-driven invalidation:</strong> Database changes emit events (DynamoDB Streams,
          Postgres NOTIFY, change data capture). Consumers update/invalidate caches. Decoupled but more complex.
        </li>
      </ul>

      <h2 id="caching-patterns">Caching Patterns</h2>
      <p><strong>Cache-aside (Lazy Loading) &mdash; most common:</strong></p>
      <pre><code>{`// Application manages cache explicitly
// Read: check cache → miss → DB → populate cache
// Write: write to DB → invalidate cache

async function getProduct(id: string) {
  const cached = await redis.get(\`product:\${id}\`);
  if (cached) return JSON.parse(cached);           // hit

  const product = await db.products.findById(id); // miss
  await redis.setEx(\`product:\${id}\`, 300, JSON.stringify(product));
  return product;
}

async function updateProduct(id: string, data: any) {
  await db.products.update(id, data);
  await redis.del(\`product:\${id}\`);              // invalidate
}`}</code></pre>

      <p><strong>Write-through &mdash; for write-heavy with frequent reads:</strong></p>
      <pre><code>{`// Write to cache AND database simultaneously
// Cache is always warm; no cache miss on first read after write
async function createProduct(data: any) {
  const product = await db.products.create(data);
  await redis.setEx(\`product:\${product.id}\`, 300, JSON.stringify(product));
  return product;
}
// Downside: cache is populated even for items that may never be read again`}</code></pre>

      <p><strong>Write-behind (Write-back) &mdash; for write-heavy systems:</strong></p>
      <pre><code>{`// Write to cache immediately, write to DB asynchronously
// Very fast writes but risk of data loss if cache crashes before DB write
// Rarely appropriate for user data; sometimes used for counters/analytics`}</code></pre>

      <h2 id="cache-stampede">Cache Stampede and the Thundering Herd</h2>
      <p>
        A cache stampede occurs when a cached value expires and many concurrent requests all
        simultaneously miss the cache, all rush to compute the value from the database, and all
        try to write it back to the cache simultaneously. This hammers the database and may cause
        it to time out.
      </p>
      <pre><code>{`// Problem: 1000 concurrent requests, cache expires
// → All 1000 hit DB simultaneously

// Solution 1: Probabilistic early expiry
// Start refreshing before TTL expires with increasing probability
async function getWithEarlyRefresh(key: string, fetch: () => Promise<any>, ttl: number) {
  const item = await redis.get(key);
  if (item) {
    const parsed = JSON.parse(item);
    const remaining = await redis.ttl(key);
    // If < 10% of TTL remaining, refresh with 10% probability
    if (remaining < ttl * 0.1 && Math.random() < 0.1) {
      // Refresh in background without blocking current request
      fetch().then(value => redis.setEx(key, ttl, JSON.stringify(value)));
    }
    return parsed;
  }
  // Full miss
  const value = await fetch();
  await redis.setEx(key, ttl, JSON.stringify(value));
  return value;
}

// Solution 2: Mutex lock
// Only one request recomputes; others wait
const lock = new Map<string, Promise<any>>();

async function getWithLock(key: string, fetch: () => Promise<any>, ttl: number) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Check if another request is already computing
  if (lock.has(key)) return lock.get(key);

  // This request is the designated recomputer
  const promise = fetch().then(async value => {
    await redis.setEx(key, ttl, JSON.stringify(value));
    lock.delete(key);
    return value;
  });
  lock.set(key, promise);
  return promise;
}`}</code></pre>

      <h2 id="cache-warming">Cache Warming</h2>
      <p>
        When a service restarts or a new cache is provisioned, the cache is cold (empty). All requests
        miss and hit the database simultaneously. Cache warming pre-populates the cache with frequently
        accessed data before traffic is sent to the service.
      </p>
      <pre><code>{`// Cache warming script: run before traffic cutover
async function warmCache() {
  // Get the top 1000 most viewed products from analytics
  const popularProducts = await analytics.getTopProducts(1000);

  // Populate cache in batches to avoid overwhelming the DB
  const batches = chunk(popularProducts, 50);
  for (const batch of batches) {
    await Promise.all(batch.map(async (productId) => {
      const product = await db.products.findById(productId);
      await redis.setEx(\`product:\${productId}\`, 3600, JSON.stringify(product));
    }));
    await sleep(100);  // rate limit DB calls
  }
  console.log('Cache warm complete');
}`}</code></pre>

      <h2 id="real-examples">Real Examples</h2>
      <p><strong>Product catalog:</strong> Cache product data with 5-minute TTL. Invalidate on product updates. Use Redis hash for structured data.</p>
      <p><strong>User profile:</strong> Cache with 30-minute TTL. Invalidate on profile update. Store only non-sensitive fields (not passwords, not full financial info).</p>
      <p><strong>Dashboard metrics:</strong> Cache aggregated counts with 2-minute TTL. Accept slight staleness in dashboards.</p>
      <p><strong>Rate limiting:</strong> Redis INCR + EXPIRE pattern for per-IP or per-user rate counters. Atomic operations ensure correctness across instances.</p>
      <p><strong>Session storage:</strong> Redis with key <code>session:token</code>, TTL matching session duration. Invalidate on logout.</p>

      <h2 id="when-not-to-cache">When NOT to Cache</h2>
      <ul>
        <li>Data that must be strongly consistent (bank balances, inventory counts during checkout)</li>
        <li>Data that is unique per request (personalized, real-time recommendations)</li>
        <li>Data that changes so frequently the cache hit rate would be near zero</li>
        <li>Small datasets that fit in DB memory anyway (the DB already caches them)</li>
        <li>Data whose staleness could cause security issues (permissions, auth tokens)</li>
      </ul>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Talk About Caching Without Sounding Reckless"
        intro="Good interview answers do not stop at 'add Redis.' They explain what is cached, where it lives, how it expires, and how correctness is protected."
        steps={[
          "Name the cache layer first: browser, CDN, application cache, or something closer to the database, because each solves a different problem.",
          "Define the cache key, TTL, and invalidation rule so the design has real behavior rather than vague acceleration.",
          "State whether stale data is acceptable and for how long. If it is not, explain how you revalidate or bypass the cache.",
          "Choose the pattern deliberately such as cache-aside for read-heavy workloads, write-through for simpler consistency, or write-behind only when asynchronous persistence is acceptable.",
          "Mention one failure mode such as stampede, stale permissions, or explosive key cardinality and how you would mitigate it.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Caching user-specific data without user-scoped keys:</strong> Caching
          <code>GET /user/profile</code> without including the user ID in the cache key means all
          users get the same cached profile.
        </li>
        <li>
          <strong>Forgetting to invalidate on write:</strong> Updating a record in the database
          without deleting the cache key. Users see stale data until TTL expires.
        </li>
        <li>
          <strong>Too long a TTL for mutable data:</strong> Caching mutable user data for 24 hours.
          Changes are invisible to users for up to 24 hours.
        </li>
        <li>
          <strong>Not handling cache unavailability:</strong> If Redis goes down and your code
          does not have a fallback path to the database, your entire service goes down. Always
          handle cache errors gracefully and fall back to the database.
        </li>
        <li>
          <strong>Serializing complex objects without considering size:</strong> Caching large
          objects (full user history, all orders) bloats Redis memory and the network round trip.
          Cache only what the requesting view actually needs.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What caching strategies do you know and when would you use each?</strong></p>
      <p>
        Cache-aside (lazy loading) is the most common: check cache, miss leads to DB read and cache
        population. Good for read-heavy workloads with occasional writes. Write-through updates the
        cache on every write, keeping it warm but populating even infrequently accessed data.
        Write-behind queues the database write, allowing very fast write responses but risking data
        loss on cache failure. Read-through has the cache handle DB misses automatically, abstracting
        caching from the application. Choice depends on read/write ratio, consistency requirements,
        and whether cache warmth matters.
      </p>

      <p><strong>Q: What is a cache stampede and how do you prevent it?</strong></p>
      <p>
        A cache stampede happens when many concurrent requests simultaneously miss the same cache key
        (usually after expiration), all query the database, and all try to repopulate the cache. This
        hammers the database with redundant work. Prevention: probabilistic early expiration (refresh
        slightly before expiry with increasing probability), mutex/lock-based recomputation (only one
        request recomputes while others wait), or background refresh with stale-while-revalidate
        (serve stale data while refreshing asynchronously).
      </p>

      <p><strong>Q: Why is cache invalidation hard?</strong></p>
      <p>
        Cache invalidation is hard because you have two sources of truth (cache and database) that
        can diverge, and notifying all caches reliably in a distributed system is complex. Time-based
        expiry accepts brief staleness. Explicit invalidation on write requires coupling write paths
        to cache management and can miss invalidations (race conditions, bugs). Event-driven
        invalidation via change data capture is more robust but adds operational complexity. There
        is no perfect solution &mdash; you choose the tradeoff that fits your consistency requirements.
      </p>

      <p><strong>Q: When should you NOT cache data?</strong></p>
      <p>
        Do not cache when: strong consistency is required (inventory that must never show false
        availability, bank balances during transactions), data is unique per request (personalized
        real-time data), data changes so frequently the hit rate would be near zero (live sensor
        readings), the dataset is small enough that the database already caches it in memory,
        or staleness creates a security vulnerability (permission checks, revoked tokens).
      </p>
    </div>
  );
}
