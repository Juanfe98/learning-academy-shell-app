import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "the-choice-matters", title: "Why the Database Choice Matters", level: 2 },
  { id: "relational-model", title: "The Relational Model (SQL)", level: 2 },
  { id: "acid", title: "ACID Properties", level: 2 },
  { id: "nosql-categories", title: "NoSQL Categories", level: 2 },
  { id: "consistency-models", title: "Consistency Models and CAP Theorem", level: 2 },
  { id: "comparison-table", title: "Comparison: PostgreSQL vs DynamoDB vs MongoDB vs Redis", level: 2 },
  { id: "indexing", title: "Indexing Deep Dive", level: 2 },
  { id: "n-plus-one", title: "The N+1 Query Problem", level: 2 },
  { id: "when-sql", title: "When SQL Wins", level: 2 },
  { id: "when-nosql", title: "When NoSQL Wins", level: 2 },
  { id: "decision-tree", title: "Decision Tree", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function SqlVsNosql() {
  return (
    <div className="article-content">
      <p>
        The database choice is one of the most consequential decisions in system design, because it
        is nearly impossible to reverse. Migrating from PostgreSQL to DynamoDB &mdash; or vice versa
        &mdash; with production data is a multi-month project. Getting it right the first time
        requires understanding what each type of database is optimized for and what access patterns
        your system actually needs.
      </p>

      <h2 id="the-choice-matters">Why the Database Choice Matters</h2>
      <p>
        The wrong database choice manifests in production in predictable ways: a document database
        chosen for its simplicity that now needs complex cross-document transactions; a relational
        database chosen by default that is breaking under 10M writes/day; a time-series database
        that was not chosen when it should have been. Each wrong choice translates into years of
        workarounds, performance issues, and eventual painful migrations.
      </p>

      <h2 id="relational-model">The Relational Model (SQL)</h2>
      <p>
        Relational databases organize data into tables (relations) with rows and columns. Data is
        normalized &mdash; stored in the smallest logical units to avoid duplication &mdash; and
        relationships are expressed through foreign keys and joined at query time.
      </p>
      <pre><code>{`-- Users table
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (references users)
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  total       NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Query: get all orders for a user with user details
SELECT u.name, u.email, o.id, o.total, o.status
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE u.id = 'user-uuid-here'
  AND o.created_at > NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC;`}</code></pre>
      <p>
        <strong>Strengths:</strong> Flexible ad-hoc queries (SQL lets you answer questions you did
        not anticipate), strong consistency and transactions, well-understood schema enforcement,
        powerful joins, decades of tooling and expertise.
      </p>
      <p>
        <strong>Weaknesses:</strong> Vertical scaling is limited (hard to shard relationally),
        schema changes on large tables require careful migrations, joins are expensive at massive scale.
      </p>

      <h2 id="acid">ACID Properties</h2>
      <p>
        ACID is what relational databases guarantee for transactions, and it is what makes them
        the default choice for financial and other high-integrity workloads.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Definition</th>
            <th>Real-world implication</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Atomicity</strong></td>
            <td>All operations in a transaction succeed or all fail</td>
            <td>Transfer $100 from A to B: either both debit and credit happen or neither does. No partial state.</td>
          </tr>
          <tr>
            <td><strong>Consistency</strong></td>
            <td>Transaction brings DB from one valid state to another; constraints enforced</td>
            <td>A foreign key constraint prevents orphaned orders (orders with no user)</td>
          </tr>
          <tr>
            <td><strong>Isolation</strong></td>
            <td>Concurrent transactions do not see each other&apos;s intermediate state</td>
            <td>Two users buying the last item do not both think they succeeded</td>
          </tr>
          <tr>
            <td><strong>Durability</strong></td>
            <td>Committed transactions persist even after system failure</td>
            <td>Power cut after commit &rarr; data is still there when server restarts</td>
          </tr>
        </tbody>
      </table>
      <pre><code>{`-- ACID transaction example: transfer money
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 'alice';
  UPDATE accounts SET balance = balance + 100 WHERE id = 'bob';
  -- If either fails, ROLLBACK is automatic
COMMIT;

-- PostgreSQL also supports serializable isolation
-- which prevents all write skew anomalies
BEGIN ISOLATION LEVEL SERIALIZABLE;
  SELECT balance FROM accounts WHERE id = 'alice' FOR UPDATE;
  -- ... business logic ...
  UPDATE accounts SET balance = ... WHERE id = 'alice';
COMMIT;`}</code></pre>

      <h2 id="nosql-categories">NoSQL Categories</h2>
      <p>
        &quot;NoSQL&quot; is an umbrella term for databases that do not use the relational model.
        Each category makes different tradeoffs.
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Data model</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Key-Value</td>
            <td>Redis, DynamoDB, Memcached</td>
            <td>Key maps to a value (string, hash, list, set)</td>
            <td>Caching, sessions, simple lookups, leaderboards</td>
          </tr>
          <tr>
            <td>Document</td>
            <td>MongoDB, Firestore, CouchDB</td>
            <td>JSON-like documents; flexible schema per document</td>
            <td>Content management, catalogs, user profiles with variable fields</td>
          </tr>
          <tr>
            <td>Wide-Column</td>
            <td>Cassandra, HBase, ScyllaDB</td>
            <td>Rows with dynamic columns; optimized for time-series/write-heavy</td>
            <td>IoT, analytics, high-write time series, massive scale</td>
          </tr>
          <tr>
            <td>Graph</td>
            <td>Neo4j, Amazon Neptune</td>
            <td>Nodes and edges with properties</td>
            <td>Social graphs, recommendation engines, fraud detection</td>
          </tr>
          <tr>
            <td>Search</td>
            <td>Elasticsearch, OpenSearch, Typesense</td>
            <td>Inverted indexes optimized for full-text search</td>
            <td>Full-text search, faceted filtering, log analysis</td>
          </tr>
          <tr>
            <td>Time-Series</td>
            <td>InfluxDB, TimescaleDB, DynamoDB with time-based SK</td>
            <td>Optimized for time-stamped measurements</td>
            <td>Metrics, monitoring, IoT sensor data, financial ticks</td>
          </tr>
        </tbody>
      </table>

      <h2 id="consistency-models">Consistency Models and CAP Theorem</h2>
      <p>
        The CAP theorem states that a distributed database can only guarantee two of three
        properties simultaneously: Consistency, Availability, and Partition Tolerance. Since
        network partitions are a reality of distributed systems, the real choice is between CP
        (prioritize consistency over availability) and AP (prioritize availability over consistency).
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Behavior</th>
            <th>Example databases</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Strong consistency (CP)</td>
            <td>All reads see the most recent write</td>
            <td>PostgreSQL, MySQL, DynamoDB (strong reads)</td>
          </tr>
          <tr>
            <td>Eventual consistency (AP)</td>
            <td>Reads may see stale data; will eventually be consistent</td>
            <td>DynamoDB (default), Cassandra, S3, DNS</td>
          </tr>
          <tr>
            <td>Causal consistency</td>
            <td>Operations that are causally related are seen in order</td>
            <td>MongoDB (with sessions)</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>When eventual consistency is fine:</strong> Likes on social posts, view counts,
        product inventory display (you show &quot;a few left&quot; rather than an exact count),
        search indexes.
      </p>
      <p>
        <strong>When strong consistency is required:</strong> Bank balances, inventory that must
        not be oversold, unique constraint enforcement, financial ledgers.
      </p>

      <h2 id="comparison-table">Comparison: PostgreSQL vs DynamoDB vs MongoDB vs Redis</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>PostgreSQL</th>
            <th>DynamoDB</th>
            <th>MongoDB</th>
            <th>Redis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data model</td>
            <td>Relational (tables/rows)</td>
            <td>Key-value + document</td>
            <td>Document (JSON)</td>
            <td>Key-value (strings, hashes, lists, sets, sorted sets)</td>
          </tr>
          <tr>
            <td>Query language</td>
            <td>SQL (full power)</td>
            <td>GetItem, Query, Scan (limited)</td>
            <td>MongoDB Query Language</td>
            <td>Commands (GET, SET, ZADD, etc.)</td>
          </tr>
          <tr>
            <td>Transactions</td>
            <td>Full ACID</td>
            <td>TransactWrite (up to 100 items)</td>
            <td>Multi-document ACID (v4+)</td>
            <td>Lua scripts, MULTI/EXEC (limited)</td>
          </tr>
          <tr>
            <td>Scaling</td>
            <td>Vertical + read replicas; sharding is complex</td>
            <td>Unlimited horizontal (AWS manages)</td>
            <td>Horizontal sharding</td>
            <td>Cluster mode (Redis Cluster)</td>
          </tr>
          <tr>
            <td>Consistency</td>
            <td>Strong</td>
            <td>Eventual (default) / Strong (extra cost)</td>
            <td>Tunable</td>
            <td>Strong (single node), eventual (cluster)</td>
          </tr>
          <tr>
            <td>Schema</td>
            <td>Strict (enforced)</td>
            <td>Flexible (schema-less attributes)</td>
            <td>Flexible</td>
            <td>None (values are bytes)</td>
          </tr>
          <tr>
            <td>Joins</td>
            <td>Full JOIN support</td>
            <td>None (single-table design required)</td>
            <td>$lookup (limited)</td>
            <td>None</td>
          </tr>
          <tr>
            <td>Latency</td>
            <td>1&ndash;10ms (indexed)</td>
            <td>Single-digit ms (guaranteed)</td>
            <td>1&ndash;20ms</td>
            <td>&lt;1ms</td>
          </tr>
          <tr>
            <td>AWS managed service</td>
            <td>RDS, Aurora</td>
            <td>DynamoDB (native)</td>
            <td>DocumentDB (compatible)</td>
            <td>ElastiCache for Redis</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Complex queries, transactions, reporting</td>
            <td>Known access patterns, massive scale, serverless</td>
            <td>Variable-schema content, rapid iteration</td>
            <td>Caching, sessions, real-time leaderboards, pub/sub</td>
          </tr>
        </tbody>
      </table>

      <h2 id="indexing">Indexing Deep Dive</h2>
      <p>
        Indexes are the single most impactful performance optimization in relational databases. A
        missing index on a queried column can turn a 5ms query into a 5-second table scan.
      </p>
      <pre><code>{`-- B-tree index (default): good for equality and range queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite index: column ORDER matters
-- This index helps queries that filter by user_id, or user_id + status
-- It does NOT help queries that filter only by status
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Covering index: includes extra columns to avoid table lookup
-- Query: SELECT id, total FROM orders WHERE user_id = ? AND status = 'paid'
-- This index covers the entire query (no need to read the main table)
CREATE INDEX idx_orders_user_status_covering
  ON orders(user_id, status)
  INCLUDE (id, total);

-- Partial index: only index rows matching a condition
-- Useful for filtering a small subset of a large table
CREATE INDEX idx_orders_pending
  ON orders(created_at)
  WHERE status = 'pending';  -- only pending orders indexed

-- Check if index is being used
EXPLAIN ANALYZE
  SELECT * FROM orders WHERE user_id = 'uuid' AND status = 'paid';
-- Look for "Index Scan" (good) vs "Seq Scan" (bad on large tables)`}</code></pre>

      <p>
        <strong>Common indexing mistakes:</strong>
      </p>
      <ul>
        <li>Not indexing foreign keys (every JOIN on an un-indexed column is a full scan)</li>
        <li>Over-indexing: too many indexes slow down writes and waste storage</li>
        <li>Wrong column order in composite index (the most selective/filtered column usually goes first)</li>
        <li>Not using EXPLAIN ANALYZE to verify the query planner uses the index</li>
      </ul>

      <h2 id="n-plus-one">The N+1 Query Problem</h2>
      <p>
        N+1 is one of the most common performance bugs in applications that use ORMs or fetch data
        lazily. It happens when you execute 1 query to get a list, then N additional queries for
        each item in that list.
      </p>
      <pre><code>{`// N+1 problem (Node.js / any language)
const orders = await db.query('SELECT * FROM orders LIMIT 100');
// 1 query ↑

for (const order of orders) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
  // 100 additional queries ↑ (one per order)
  order.userName = user.name;
}
// Total: 101 queries → ~500ms

// Solution 1: JOIN
const ordersWithUsers = await db.query(\`
  SELECT o.*, u.name as user_name, u.email
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LIMIT 100
\`);
// 1 query → ~5ms

// Solution 2: Batch lookup (when JOIN is impractical)
const orders = await db.query('SELECT * FROM orders LIMIT 100');
const userIds = [...new Set(orders.map(o => o.userId))];
const users = await db.query(
  'SELECT * FROM users WHERE id = ANY($1)', [userIds]
);
const usersById = Object.fromEntries(users.map(u => [u.id, u]));
for (const order of orders) {
  order.user = usersById[order.userId];
}
// 2 queries → ~10ms`}</code></pre>

      <h2 id="when-sql">When SQL Wins</h2>
      <ul>
        <li>Complex queries with joins across many tables (reporting, analytics)</li>
        <li>Transactions across multiple entities (payments, inventory)</li>
        <li>Unknown access patterns (you need to be able to ask ad-hoc questions)</li>
        <li>Strong consistency requirements</li>
        <li>Referential integrity enforcement</li>
        <li>Team familiarity &mdash; SQL expertise is widespread and transferable</li>
        <li>Moderate scale (PostgreSQL handles hundreds of millions of rows comfortably with proper indexing)</li>
      </ul>

      <h2 id="when-nosql">When NoSQL Wins</h2>
      <ul>
        <li>Massive scale with known access patterns (DynamoDB at AWS scale)</li>
        <li>Very high write throughput (&gt;100k writes/second) &mdash; Cassandra</li>
        <li>Variable schema, rapid iteration on data shape (document stores)</li>
        <li>Caching and session storage &mdash; always Redis</li>
        <li>Full-text search &mdash; always a search engine (OpenSearch, Typesense)</li>
        <li>Time-series data with high ingest rate &mdash; TimescaleDB or DynamoDB</li>
        <li>Graph traversal queries &mdash; graph databases</li>
        <li>Serverless architectures (DynamoDB scales to zero, no connection pool)</li>
      </ul>

      <h2 id="decision-tree">Decision Tree</h2>
      <pre>{`
Do you need full-text search?
  YES → Search engine (OpenSearch/Typesense) as primary or alongside DB
  NO → continue

Is your primary use case caching or session storage?
  YES → Redis
  NO → continue

Do you need complex cross-entity transactions?
  YES → PostgreSQL / Aurora (relational)
  NO → continue

Do you have truly massive scale (>50M writes/day, >100GB)?
  YES → Are your access patterns known and fixed?
    YES → DynamoDB (if AWS) or Cassandra
    NO → PostgreSQL with read replicas + sharding
  NO → continue

Is your data schema highly variable or evolving rapidly?
  YES → MongoDB / Document store
  NO → PostgreSQL (safe default for most applications)
`}</pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Defend a Database Choice"
        intro="The strongest database answers connect the data model to access patterns, consistency requirements, and scaling constraints instead of treating the choice as a brand preference."
        steps={[
          "Start with the hot access patterns: the most frequent reads, the most critical writes, and any fan-out or analytical queries.",
          "State whether you need strong transactions, joins, and referential integrity, or whether eventual consistency is acceptable for the product behavior.",
          "Choose the model that best matches those needs, then immediately say what you are giving up in exchange for that choice.",
          "Name the likely future pain point such as relational sharding, DynamoDB modeling rigidity, or weak ad-hoc querying, so the tradeoff feels honest.",
          "If one database cannot cleanly serve all workloads, split responsibilities rather than forcing a single store to do search, caching, OLTP, and analytics all at once.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Defaulting to MongoDB because the schema is &quot;flexible&quot;:</strong>
          Document databases do not eliminate the need for schema design &mdash; they just defer
          enforcement to the application. Complex relationships still need to be modeled. Most
          apps that start on MongoDB end up wanting PostgreSQL&apos;s query power.
        </li>
        <li>
          <strong>Using a relational database for time-series data:</strong> Storing millions of
          metrics or sensor readings in a PostgreSQL table with a timestamp column grows slowly
          painful. INSERT speed degrades, queries become expensive, and indexes bloat. Use
          TimescaleDB or a dedicated time-series store.
        </li>
        <li>
          <strong>Not indexing before testing performance:</strong> Testing a query that returns
          100 rows from 1,000 rows and calling it fast. Without proper indexes, it breaks at
          1 million rows. Always test with production-scale data volumes.
        </li>
        <li>
          <strong>Using DynamoDB without understanding access patterns first:</strong> DynamoDB
          requires you to design your table around your queries. If you design the schema first
          and access patterns later (like SQL), you end up with Scans everywhere, which are
          expensive and slow.
        </li>
        <li>
          <strong>No connection pooling:</strong> Opening a new database connection per request
          under load exhausts PostgreSQL&apos;s <code>max_connections</code> (default 100).
          Always use a connection pool (pg-pool, RDS Proxy, PgBouncer).
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: When would you choose DynamoDB over PostgreSQL?</strong></p>
      <p>
        DynamoDB wins when: you need to scale to truly massive throughput (millions of writes/second),
        your access patterns are known and fixed in advance, you want zero server management (truly
        serverless), or you need guaranteed single-digit millisecond latency at any scale. PostgreSQL
        wins when: you need complex joins and ad-hoc queries, you need ACID transactions across
        multiple entities, your schema is evolving, or your scale is moderate (PostgreSQL handles
        hundreds of millions of rows fine).
      </p>

      <p><strong>Q: What are ACID properties and why do they matter?</strong></p>
      <p>
        ACID (Atomicity, Consistency, Isolation, Durability) defines the guarantees of database
        transactions. Atomicity means a transaction either fully succeeds or fully fails &mdash; no
        partial state. Consistency means constraints are always enforced. Isolation means concurrent
        transactions do not interfere. Durability means committed data survives failures. They matter
        for any data where partial writes would be dangerous: payments, inventory, reservations.
      </p>

      <p><strong>Q: What is the N+1 problem and how do you solve it?</strong></p>
      <p>
        N+1 occurs when you execute 1 query to get a list of N items, then make an additional query
        for each item to fetch related data, resulting in N+1 total queries. At scale this is a
        significant performance issue. Solutions: use a JOIN in the original query to fetch all data
        at once, batch fetch related entities with a WHERE id IN (...) query, or use a DataLoader
        pattern to batch and deduplicate lookups.
      </p>

      <p><strong>Q: What is eventual consistency and when is it acceptable?</strong></p>
      <p>
        Eventual consistency means that after a write, reads may temporarily see stale data, but
        all replicas will eventually converge to the same state. It is acceptable for data where
        brief staleness does not cause business problems: social media likes and view counts, product
        catalog information, search indexes, DNS records, user preferences. It is not acceptable
        for: bank balances, inventory counts in a flash sale, unique username enforcement, or any
        data where a stale read leads to an invalid business operation.
      </p>
    </div>
  );
}
