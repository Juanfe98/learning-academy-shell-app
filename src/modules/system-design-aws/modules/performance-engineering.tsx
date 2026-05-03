import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const btreeDiagram = String.raw`flowchart TB
    ROOT["m@..., s@..."]
    LEFT["a@.., d@.."]
    MID["n@..."]
    RIGHT["t@.., z@.."]
    LEAF1["a@..."]
    LEAF2["d@..."]
    LEAF3["t@..."]
    LEAF4["w@..."]
    ROWS1["Row pointers"]
    ROWS2["Row pointers"]
    ROWS3["Row pointers"]
    ROWS4["Row pointers"]

    ROOT --> LEFT
    ROOT --> MID
    ROOT --> RIGHT
    LEFT --> LEAF1
    LEFT --> LEAF2
    RIGHT --> LEAF3
    RIGHT --> LEAF4
    LEAF1 --> ROWS1
    LEAF2 --> ROWS2
    LEAF3 --> ROWS3
    LEAF4 --> ROWS4`;

export const toc: TocItem[] = [
  { id: "measuring-performance", title: "Measuring Performance: Why Percentiles Matter", level: 2 },
  { id: "bottleneck-identification", title: "Finding Bottlenecks: CPU-Bound vs IO-Bound", level: 2 },
  { id: "connection-pooling", title: "Connection Pooling", level: 2 },
  { id: "indexing-deep-dive", title: "Database Indexing Deep Dive", level: 2 },
  { id: "pagination", title: "Pagination: Offset vs Cursor", level: 2 },
  { id: "payload-optimization", title: "Payload Optimization: Compression and Over-fetching", level: 2 },
  { id: "batching", title: "Batching: N+1 and DataLoader Pattern", level: 2 },
  { id: "async-processing", title: "Async Processing for Heavy Work", level: 2 },
  { id: "cdn-optimization", title: "CDN and Edge Optimization", level: 2 },
  { id: "debugging-framework", title: "Debugging Framework: How to Investigate Slow Endpoints", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function PerformanceEngineering() {
  return (
    <div className="article-content">
      <p>
        Performance engineering is the discipline of making systems faster and more efficient in a
        principled, measurable way. The key word is <em>principled</em>: random optimization is
        often counterproductive. The correct process is always: measure first, identify the
        bottleneck, optimize the bottleneck, measure again. Optimization without measurement is
        guessing.
      </p>

      <h2 id="measuring-performance">Measuring Performance: Why Percentiles Matter</h2>
      <p>
        <strong>Never report only the average.</strong> The average latency is almost useless because
        it hides the outliers that actually affect users.
      </p>
      <pre>{`
Request latencies (ms): 5, 6, 5, 7, 6, 5, 8, 6, 7, 500

Average: (5+6+5+7+6+5+8+6+7+500) / 10 = 55.5ms
  → Sounds acceptable, right?

p50 (median): 6ms      → 50% of users see ≤6ms
p95:          ~30ms    → 95% of users see ≤30ms
p99:          ~500ms   → 99% of users see ≤500ms (that last request is terrible)

The one 500ms request drags the average to 55.5ms but most users see 6ms.
At 1M requests/day, p99 = 10,000 users/day experiencing 500ms+ latency.
`}</pre>
      <p>
        <strong>Which percentile to optimize?</strong> It depends on your SLO and business model.
        For interactive user-facing APIs, optimize p99. For background jobs, p95 is usually
        sufficient. For critical paths (checkout, login), p99.9 matters.
      </p>
      <p>
        <strong>The 99th percentile trap:</strong> Sometimes p99 is driven by a small number of
        inherently slow operations (very large payloads, cold starts). Optimizing for p99 at all
        costs can mean sacrificing p50 for all users to save the 1%. Understand what drives your
        tail latency before optimizing it.
      </p>

      <h2 id="bottleneck-identification">Finding Bottlenecks: CPU-Bound vs IO-Bound</h2>
      <p>
        Every performance problem has a bottleneck &mdash; a single constraint that limits the system.
        Optimizing anything other than the bottleneck produces no improvement (Amdahl&apos;s Law).
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Symptoms</th>
            <th>Examples</th>
            <th>Solutions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CPU-bound</td>
            <td>High CPU%, many short fast I/O operations</td>
            <td>Image processing, cryptography, complex computation, JSON serialization of large payloads</td>
            <td>More CPU, vertical scaling, offload to worker, caching, algorithm optimization</td>
          </tr>
          <tr>
            <td>I/O-bound</td>
            <td>Low CPU%, many waiting operations, high latency</td>
            <td>Database queries, external API calls, disk reads</td>
            <td>Caching, connection pooling, async I/O, parallelization, better indexes</td>
          </tr>
          <tr>
            <td>Memory-bound</td>
            <td>High memory, GC pressure, OOM kills</td>
            <td>Large in-memory datasets, memory leaks, oversized response objects</td>
            <td>Streaming instead of buffering, pagination, reduce object size, fix leaks</td>
          </tr>
          <tr>
            <td>Network-bound</td>
            <td>High network bandwidth, many small calls</td>
            <td>Chatty microservices, uncompressed large responses</td>
            <td>Batching calls, compression, move computation closer to data</td>
          </tr>
        </tbody>
      </table>
      <pre><code>{`# Profile CPU usage on Node.js process
node --prof app.js
node --prof-process isolate-*.log

# Profile with clinic.js (excellent for Node.js)
npx clinic doctor -- node app.js
npx clinic flame -- node app.js  # flamegraph

# Check current process metrics
top -p $(pgrep node)
htop  # interactive

# CloudWatch metrics for ECS
# CPU utilization per task
# Memory utilization per task
# Network bytes in/out
# These point to CPU vs IO vs memory bottleneck`}</code></pre>

      <h2 id="connection-pooling">Connection Pooling</h2>
      <p>
        Opening a database connection is expensive: TCP handshake, auth (~5&ndash;20ms). At 1000 req/s,
        creating a new connection per request wastes 5&ndash;20 seconds per second of overhead.
        Connection pooling maintains a pool of pre-opened connections that requests can borrow and
        return.
      </p>
      <pre><code>{`// Node.js PostgreSQL connection pool (node-postgres)
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // maximum connections in pool
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 2000  // fail fast if no connection available
});

// Each request borrows a connection from the pool
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
// Connection returned to pool automatically

// Connection pool sizing rule of thumb:
// max_connections = (num_cores * 2) + num_disk_spindles
// For web apps, 10-20 connections per service instance
// Use RDS Proxy for serverless (Lambda can't maintain persistent pools)`}</code></pre>

      <p>
        <strong>AWS RDS Proxy:</strong> Sits between your application and RDS. Maintains a warm pool
        of connections to the database. Essential for Lambda functions (which cannot maintain
        persistent connections) and for services with spiky traffic that might exhaust RDS
        <code>max_connections</code>.
      </p>

      <h2 id="indexing-deep-dive">Database Indexing Deep Dive</h2>
      <p>
        The B-tree index is the default index type in PostgreSQL and MySQL. It stores values in a
        sorted tree structure, enabling O(log n) lookups instead of O(n) table scans.
      </p>
      <MermaidDiagram
        chart={btreeDiagram}
        title="B-tree Index Structure"
        caption="The index keeps keys sorted so the database can discard huge parts of the search space at each branch instead of scanning every row."
        minHeight={520}
      />
      <pre>{`Lookup for "alice@example.com":
  1. Start at root
  2. "alice@" < "m@" → go left
  3. "alice@" > "a@" → go right child
  4. Found! → row pointer → fetch actual row

O(log n) = ~20 comparisons for 1 million rows
vs full table scan = 1,000,000 comparisons
`}</pre>
      <pre><code>{`-- Composite index: column order is critical
-- This serves: WHERE user_id = ?
--           and WHERE user_id = ? AND status = ?
-- But NOT WHERE status = ? alone
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Rule: most selective filter first in most cases
-- But for range queries, the equality filter must come first
-- WHERE user_id = ? AND created_at > ?
-- → (user_id, created_at) is correct
-- → (created_at, user_id) would require full index scan

-- EXPLAIN ANALYZE: check if index is used
EXPLAIN ANALYZE
  SELECT * FROM orders WHERE user_id = 'abc' AND status = 'pending';

-- Output to look for:
-- "Index Scan using idx_orders_user_status" → good
-- "Seq Scan on orders" → missing or wrong index

-- Index bloat: indexes grow with updates/deletes
-- Rebuild periodically:
REINDEX INDEX CONCURRENTLY idx_orders_user_status;`}</code></pre>

      <h2 id="pagination">Pagination: Offset vs Cursor</h2>
      <p>
        Pagination is necessary for any query returning potentially unbounded results. There are
        two main approaches, and one of them breaks at scale.
      </p>
      <p><strong>Offset pagination (DO NOT use for large tables in production):</strong></p>
      <pre><code>{`// OFFSET pagination
SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 1000;
// Problem: database must read 1020 rows and discard the first 1000
// At OFFSET 100000 → reads 100020 rows → 5000ms query

// O(OFFSET) performance → pages load slower and slower as users go deeper
// Also inconsistent: if items are inserted between pages, items are skipped or duplicated`}</code></pre>

      <p><strong>Cursor pagination (always use for production):</strong></p>
      <pre><code>{`// CURSOR pagination: start from a known position
// First page:
SELECT * FROM products ORDER BY created_at DESC, id DESC LIMIT 20;
// → returns items with last item cursor: { created_at: "2024-01-15", id: "abc123" }

// Next page: use cursor as WHERE clause
SELECT * FROM products
WHERE (created_at, id) < ('2024-01-15', 'abc123')
ORDER BY created_at DESC, id DESC
LIMIT 20;
// → consistent O(log n) performance regardless of how deep you paginate
// Requires index on (created_at, id)

// API response
{
  "items": [...],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1IiwiaWQiOiJhYmMxMjMifQ==",
  "hasMore": true
}

// Cursor is base64-encoded JSON — client passes it as query parameter
// &cursor=eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1IiwiaWQiOiJhYmMxMjMifQ==`}</code></pre>

      <h2 id="payload-optimization">Payload Optimization: Compression and Over-fetching</h2>
      <p>
        Large HTTP responses waste bandwidth, cost money, and slow page loads. Two key optimizations:
      </p>
      <p><strong>Compression:</strong> gzip reduces JSON payloads by 60&ndash;80%. brotli (used by
        modern browsers) reduces by 70&ndash;90%. Enable at the load balancer or application level.
      </p>
      <pre><code>{`// Express.js: enable compression
import compression from 'compression';
app.use(compression({
  level: 6,        // compression level 0-9 (6 = good balance)
  threshold: 1024  // only compress responses > 1KB
}));

// Check if a response is compressed
curl -H "Accept-Encoding: gzip" -I https://api.example.com/products
# Look for: Content-Encoding: gzip`}</code></pre>

      <p><strong>Over-fetching:</strong> Returning 50 fields when the client needs 5. Each unnecessary
        field increases payload size, serialization time, and memory usage. Solutions: specific SELECT
        columns (not SELECT *), field selection via query parameters, or GraphQL for precise field
        selection.
      </p>

      <h2 id="batching">Batching: N+1 and DataLoader Pattern</h2>
      <pre><code>{`// DataLoader pattern: batch and cache lookups
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds: readonly string[]) => {
  // Called once with ALL requested user IDs
  const users = await db.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [[...userIds]]
  );
  const usersById = Object.fromEntries(users.map(u => [u.id, u]));
  // Return in same order as input IDs
  return userIds.map(id => usersById[id] || null);
});

// Multiple concurrent requests for users
// All batched into a single SQL query per tick
const [alice, bob, carol] = await Promise.all([
  userLoader.load('user-alice'),
  userLoader.load('user-bob'),
  userLoader.load('user-carol')
]);
// → 1 SQL query: WHERE id IN ('user-alice', 'user-bob', 'user-carol')`}</code></pre>

      <h2 id="async-processing">Async Processing for Heavy Work</h2>
      <p>
        Some operations should not block the HTTP response: sending emails, generating PDFs, resizing
        images, ML inference, search index updates. These belong in background workers, not in the
        request path.
      </p>
      <pre><code>{`// DON'T: Block the HTTP response waiting for heavy work
app.post('/api/upload-cv', async (req, res) => {
  const cv = await saveFile(req.file);
  await parseCV(cv);       // ← 5-30 seconds
  await runAIAnalysis(cv); // ← 10-60 seconds
  res.json({ success: true });
  // User waits 30-90 seconds for response → terrible UX
});

// DO: Acknowledge immediately, process async
app.post('/api/upload-cv', async (req, res) => {
  const cv = await db.cvs.create({ userId: req.user.id, status: 'pending' });
  await s3.upload(req.file, cv.s3Key);
  await sqs.sendMessage({
    QueueUrl: process.env.CV_PROCESSING_QUEUE,
    MessageBody: JSON.stringify({ cvId: cv.id })
  });
  res.status(202).json({ cvId: cv.id, status: 'processing' });
  // Response in ~200ms → client polls /api/cvs/:id for status
});`}</code></pre>

      <h2 id="cdn-optimization">CDN and Edge Optimization</h2>
      <ul>
        <li>Serve all static assets (JS, CSS, images) through CloudFront with long TTLs</li>
        <li>Content-address assets (hash in filename) to enable 1-year TTL + immutable</li>
        <li>Use CloudFront origin shield to reduce load on your ALB</li>
        <li>Enable Brotli compression at CloudFront level</li>
        <li>Use pre-signed URLs for private files served from CloudFront origin</li>
        <li>Monitor CloudFront cache hit rate &mdash; aim for &gt;90% for static assets</li>
      </ul>

      <h2 id="debugging-framework">Debugging Framework: How to Investigate Slow Endpoints</h2>
      <pre>{`
Step 1: Establish the scope
  - Is it slow for all users or specific ones?
  - Is it slow for all endpoints or specific ones?
  - When did it start? (correlate with deploys, data growth)

Step 2: Check error rates first
  - Slow responses can be retries from 5xx errors
  - CloudWatch → ALB → TargetResponseCode (500, 504 counts)

Step 3: Check TTFB (time to first byte)
  - High TTFB = server-side issue
  - Low TTFB + slow load = large payload / client-side

Step 4: Check application-level metrics
  - ALB target response time (p95/p99)
  - ECS CPU and memory utilization
  - Database query time (CloudWatch RDS or pg_stat_statements)
  - Cache hit rate (Redis CloudWatch metrics)

Step 5: Identify the slow layer
  - Add timing logs to your handler:
    t1 = auth check, t2 = cache check, t3 = DB query, t4 = response

Step 6: Drill into the database
  - Enable slow query log (queries > 1000ms)
  - Run EXPLAIN ANALYZE on suspect queries
  - Check pg_stat_statements for top queries by total time

Step 7: Fix and verify
  - One change at a time
  - Measure before and after
  - Deploy to staging with production-scale data
`}</pre>
      <pre><code>{`-- PostgreSQL: find slowest queries
SELECT query, calls, mean_exec_time, total_exec_time,
       rows, 100.0 * shared_blks_hit /
             NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check what's currently running
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY duration DESC;`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Optimizing without measuring:</strong> Adding caching everywhere &quot;just in case&quot;
          before profiling. Cache has overhead too &mdash; unnecessary caching adds latency and
          complexity without benefit.
        </li>
        <li>
          <strong>Using offset pagination on large tables:</strong> Works fine in development with
          100 rows. Breaks in production with 10 million rows. Cursor pagination from day one.
        </li>
        <li>
          <strong>SELECT * in production code:</strong> Returns all columns including large TEXT/BLOB
          fields you do not need. Explicit column selection reduces I/O and memory significantly.
        </li>
        <li>
          <strong>Blocking the event loop for heavy computation in Node.js:</strong> CPU-intensive
          operations in the request handler (complex parsing, image processing) block all other
          requests. Offload to a worker thread (<code>worker_threads</code>) or background worker.
        </li>
        <li>
          <strong>Not setting timeouts on external calls:</strong> A slow third-party API call with
          no timeout blocks your thread indefinitely. Always set connection timeout and read timeout.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: How would you debug a slow API endpoint?</strong></p>
      <p>
        First, determine if it is always slow or intermittently slow (different root causes). Check
        error rates to rule out retry storms. Measure TTFB to determine if server-side. Check
        CloudWatch metrics: ALB latency by endpoint, ECS CPU/memory, database query duration,
        cache hit rate. Add timing instrumentation to the handler to narrow down which operation
        is slow (auth, cache check, DB query, serialization). For DB issues, run EXPLAIN ANALYZE.
        For application issues, profile with clinic.js or language-specific profiler.
      </p>

      <p><strong>Q: Why is offset pagination a problem at scale?</strong></p>
      <p>
        With OFFSET pagination, the database must scan and discard all rows before the offset before
        returning the page. <code>OFFSET 10000 LIMIT 20</code> causes the database to read 10,020
        rows to return 20. Performance degrades linearly with offset size. Additionally, new items
        inserted between page fetches cause items to be skipped or duplicated. Cursor pagination
        uses a WHERE clause based on the last seen item, which is O(log n) regardless of depth and
        remains consistent with concurrent inserts.
      </p>

      <p><strong>Q: What is the DataLoader pattern and why does it matter?</strong></p>
      <p>
        DataLoader solves the N+1 query problem by batching and deduplicating individual item lookups
        that happen within a single request cycle. Instead of making N separate database queries for
        N items (each query ~5ms = N×5ms total), DataLoader collects all requested IDs and makes one
        batch query per event loop tick (1 query = ~5ms regardless of N). It also caches within the
        request, so the same item looked up multiple times only queries the database once. Essential
        for GraphQL resolvers but valuable in any context with nested data fetching.
      </p>

      <p><strong>Q: How do you optimize a very large JSON response?</strong></p>
      <p>
        Several layers: enable gzip/brotli compression at the server or load balancer (60&ndash;80%
        size reduction for JSON). Remove over-fetching by only selecting the fields the client
        actually uses. Paginate large lists instead of returning all items at once. Consider streaming
        for very large responses (server-sent events or chunked transfer encoding). Cache at CDN or
        application level to avoid recomputing large responses. For structured data with repeated
        field names, consider binary protocols like MessagePack or Protocol Buffers.
      </p>
    </div>
  );
}
