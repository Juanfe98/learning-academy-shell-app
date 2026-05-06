import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const connectionPoolDiagram = String.raw`sequenceDiagram
    participant A as App (request)
    participant P as Connection Pool
    participant DB as Database

    Note over P: Pool initialized with min=2 connections open

    A->>P: acquire connection
    P-->>A: return idle connection (no handshake)
    A->>DB: SELECT * FROM users WHERE id = 1
    DB-->>A: result
    A->>P: release connection (back to pool)

    Note over P: Connection reused — no TCP handshake overhead

    A->>P: acquire (pool full + all busy)
    P-->>A: wait in queue...
    Note over P: Timeout if wait > configured limit`;

const nPlusOneDiagram = String.raw`sequenceDiagram
    participant S as Service
    participant DB as Database

    Note over S,DB: N+1 Problem — 1 + N queries
    S->>DB: SELECT * FROM orders (returns 100 orders)
    DB-->>S: 100 orders

    loop for each order
        S->>DB: SELECT * FROM users WHERE id = order.userId
        DB-->>S: user
    end
    Note over S,DB: 101 queries total!

    Note over S,DB: Fixed — 2 queries with JOIN / include
    S->>DB: SELECT orders.*, users.* FROM orders JOIN users ON orders.userId = users.id
    DB-->>S: all data in one trip`;

const acidDiagram = String.raw`flowchart TD
    A[ACID Properties] --> At[Atomicity\nAll or nothing\nRollback on failure]
    A --> C[Consistency\nData rules always\nsatisfied]
    A --> I[Isolation\nTransactions don't\ninterfere]
    A --> D[Durability\nCommitted data\nsurvives crashes]

    At --> Ex1["BEGIN - debit $100 - credit $100 - COMMIT\nor entire tx ROLLBACK"]
    I --> Ex2[READ COMMITTED\nREPEATABLE READ\nSERIALIZABLE]`;

const relationshipsDiagram = String.raw`erDiagram
    User ||--o{ Post : "one-to-many"
    Post }o--o{ Tag : "many-to-many"
    Post ||--|| PostMeta : "one-to-one"

    User {
        int id PK
        string email
    }
    Post {
        int id PK
        int userId FK
        string title
    }
    Tag {
        int id PK
        string name
    }
    PostTag {
        int postId FK
        int tagId FK
    }`;

export const toc: TocItem[] = [
  { id: "connect-db", title: "How do you connect Node.js with a database?", level: 2 },
  { id: "connection-pooling", title: "What is connection pooling?", level: 2 },
  { id: "why-pooling", title: "Why is connection pooling important?", level: 2 },
  { id: "orm", title: "What is an ORM?", level: 2 },
  { id: "orm-vs-query-builder", title: "ORM vs query builder", level: 2 },
  { id: "prisma", title: "What is Prisma?", level: 2 },
  { id: "other-orms", title: "TypeORM, Sequelize, and Mongoose", level: 2 },
  { id: "sql-vs-nosql", title: "SQL vs NoSQL: when to choose each", level: 2 },
  { id: "transactions", title: "How do you handle database transactions?", level: 2 },
  { id: "acid", title: "What are ACID properties?", level: 2 },
  { id: "n-plus-one", title: "How do you avoid N+1 queries?", level: 2 },
  { id: "indexes", title: "What are database indexes?", level: 2 },
  { id: "index-tradeoffs", title: "Tradeoffs of indexes", level: 2 },
  { id: "migrations", title: "How do you handle database migrations?", level: 2 },
  { id: "relationships", title: "Modeling one-to-many and many-to-many relationships", level: 2 },
  { id: "soft-deletes", title: "How do you handle soft deletes?", level: 2 },
  { id: "optimistic-locking", title: "What is optimistic locking?", level: 2 },
  { id: "idempotency-keys", title: "How do you implement idempotency keys?", level: 2 },
  { id: "eventual-consistency", title: "What is eventual consistency?", level: 2 },
];

export default function InterviewDatabases() {
  return (
    <div className="article-content">
      <p>
        Section 8 of 18 — Databases &amp; Data Access. Interviewers at senior level expect you to
        know not just how to query data, but <em>why</em> connection pools exist, how transactions
        work, what N+1 is and how to fix it, and when SQL is the wrong tool. This section covers
        all of it.
      </p>

      {/* ── 1 ── */}
      <h2 id="connect-db">How do you connect Node.js with a database?</h2>
      <p>
        You use a driver or ORM that provides an async client. The client opens one or more TCP
        connections to the database server. For PostgreSQL the canonical low-level driver is{" "}
        <code>pg</code> (node-postgres); for MongoDB it is the official <code>mongodb</code>{" "}
        driver. ORMs like Prisma, TypeORM, and Sequelize sit on top and manage the connection for
        you.
      </p>
      <pre><code>{`// Direct pg client — low-level control
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,          // max connections in pool
  idleTimeoutMillis: 30_000,
});

// Prisma — ORM approach (no manual pool setup needed)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();`}</code></pre>
      <p>
        Always read credentials from environment variables — never hardcode them. Use a connection
        pool (see next question) rather than opening a new connection per request.
      </p>

      {/* ── 2 ── */}
      <h2 id="connection-pooling">What is connection pooling?</h2>
      <p>
        A connection pool is a cache of open database connections that are reused across requests.
        Instead of opening a new TCP connection for every query (which takes 5–50 ms for a TLS
        handshake), the app borrows an already-open connection from the pool, uses it, and returns
        it when done.
      </p>
      <MermaidDiagram chart={connectionPoolDiagram} />
      <p>Key pool configuration parameters:</p>
      <ArticleTable caption="Connection pool configuration parameters" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Typical value</th>
              <th>What it controls</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>min / minConnections</code></td>
              <td>2</td>
              <td>Connections kept open even when idle</td>
            </tr>
            <tr>
              <td><code>max / maxConnections</code></td>
              <td>10–20</td>
              <td>Upper limit; excess requests queue</td>
            </tr>
            <tr>
              <td><code>idleTimeoutMillis</code></td>
              <td>30 000</td>
              <td>Close idle connection after this ms</td>
            </tr>
            <tr>
              <td><code>connectionTimeoutMillis</code></td>
              <td>5 000</td>
              <td>Fail if no connection available in this ms</td>
            </tr>
            <tr>
              <td><code>acquireTimeout</code></td>
              <td>10 000</td>
              <td>How long a request waits in the queue</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ── 3 ── */}
      <h2 id="why-pooling">Why is connection pooling important?</h2>
      <p>Without pooling, every HTTP request opens a new database connection. This causes:</p>
      <ul>
        <li>
          <strong>Latency spike</strong> — TCP + TLS handshake on every request adds 5–50 ms.
        </li>
        <li>
          <strong>Resource exhaustion</strong> — PostgreSQL defaults to 100 max connections. 100
          concurrent requests each with their own connection saturates the DB.
        </li>
        <li>
          <strong>Connection storms</strong> — On traffic spikes, thousands of simultaneous
          connection attempts can crash the DB.
        </li>
      </ul>
      <p>
        With a pool, connections are amortized. 20 connections can serve thousands of requests per
        second because each query completes in milliseconds and the connection is immediately
        available for the next request.
      </p>
      <p>
        <strong>PgBouncer</strong> is a dedicated connection pooler that sits between your app and
        PostgreSQL, useful when you have many Node.js processes (Kubernetes pods) each with their
        own pool — without it, total connections = pods × pool size, which can blow past the DB
        limit.
      </p>

      {/* ── 4 ── */}
      <h2 id="orm">What is an ORM?</h2>
      <p>
        ORM stands for Object-Relational Mapper. It maps database rows to language objects so you
        interact with the database using the host language rather than raw SQL.
      </p>
      <pre><code>{`// Without ORM — raw SQL
const result = await pool.query(
  "SELECT id, email FROM users WHERE id = $1",
  [userId]
);
const user = result.rows[0]; // plain object, manual mapping

// With Prisma ORM — typed, no SQL written
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true },
});
// user is typed as { id: number; email: string } | null`}</code></pre>
      <p>ORMs handle:</p>
      <ul>
        <li>Query building (SELECT, INSERT, UPDATE, DELETE)</li>
        <li>Relation loading (include / eager loading)</li>
        <li>Schema migrations</li>
        <li>Connection management</li>
        <li>Type generation (Prisma)</li>
      </ul>

      {/* ── 5 ── */}
      <h2 id="orm-vs-query-builder">ORM vs query builder</h2>
      <ArticleTable caption="ORM vs query builder — choosing the right tool" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Full ORM (Prisma, TypeORM)</th>
              <th>Query Builder (Knex, Drizzle)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Abstraction level</td>
              <td>High — model-centric API</td>
              <td>Low — SQL-like JS API</td>
            </tr>
            <tr>
              <td>Type safety</td>
              <td>Auto-generated types (Prisma)</td>
              <td>Manual or schema-driven (Drizzle)</td>
            </tr>
            <tr>
              <td>Complex queries</td>
              <td>Can be limiting or verbose</td>
              <td>Full SQL power</td>
            </tr>
            <tr>
              <td>Learning curve</td>
              <td>Lower for CRUD</td>
              <td>Requires SQL knowledge</td>
            </tr>
            <tr>
              <td>Migration</td>
              <td>Built-in (schema.prisma)</td>
              <td>Separate migration tool</td>
            </tr>
            <tr>
              <td>Performance</td>
              <td>Slightly more overhead</td>
              <td>Closer to raw SQL</td>
            </tr>
            <tr>
              <td>Use when</td>
              <td>Rapid CRUD, type safety first</td>
              <td>Complex reporting, data-heavy apps</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Drizzle ORM</strong> is a newer option that blurs the line — it is a type-safe
        query builder with ORM-style schema definition, popular for its zero-overhead philosophy.
      </p>

      {/* ── 6 ── */}
      <h2 id="prisma">What is Prisma?</h2>
      <p>
        Prisma is a type-safe ORM for Node.js and TypeScript with three main components:
      </p>
      <ul>
        <li>
          <strong>Prisma Client</strong> — auto-generated, fully typed query client. You never
          write SQL for CRUD.
        </li>
        <li>
          <strong>Prisma Schema</strong> — declarative data model in <code>schema.prisma</code>{" "}
          that describes models, relations, and the database connector.
        </li>
        <li>
          <strong>Prisma Migrate</strong> — generates SQL migration files from schema diffs and
          applies them.
        </li>
      </ul>
      <pre><code>{`// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [userId], references: [id])
  userId   Int
}

// Generated client usage
const user = await prisma.user.create({
  data: { email: "alice@example.com", name: "Alice" },
});

const posts = await prisma.post.findMany({
  where: { author: { email: "alice@example.com" } },
  include: { author: true },
  orderBy: { id: "desc" },
  take: 10,
});`}</code></pre>
      <p>
        Prisma&apos;s main strength is that TypeScript types are generated from the schema — if the
        schema changes, queries that reference deleted fields become compile errors.
      </p>

      {/* ── 7 ── */}
      <h2 id="other-orms">TypeORM, Sequelize, and Mongoose</h2>
      <ArticleTable caption="ORM comparison — choosing the right library for the job" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>ORM</th>
              <th>Database</th>
              <th>Style</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>TypeORM</strong></td>
              <td>SQL (Postgres, MySQL, SQLite)</td>
              <td>Decorator-based, Active Record or Data Mapper</td>
              <td>TypeScript-heavy projects, NestJS ecosystem</td>
            </tr>
            <tr>
              <td><strong>Sequelize</strong></td>
              <td>SQL</td>
              <td>Class-based, promise API</td>
              <td>Legacy Node.js projects, wide DB support needed</td>
            </tr>
            <tr>
              <td><strong>Mongoose</strong></td>
              <td>MongoDB only</td>
              <td>Schema + model, document-centric</td>
              <td>MongoDB projects with schema enforcement</td>
            </tr>
            <tr>
              <td><strong>Prisma</strong></td>
              <td>SQL + MongoDB</td>
              <td>Schema-first, generated client</td>
              <td>New projects, type safety priority</td>
            </tr>
            <tr>
              <td><strong>Drizzle</strong></td>
              <td>SQL</td>
              <td>Query builder + typed schema</td>
              <td>Complex queries, zero-overhead</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Mongoose</strong> adds schema validation to MongoDB (which is schemaless by
        default). It defines models with types, validators, and virtuals. Not an ORM in the
        relational sense but serves the same purpose for document databases.
      </p>

      {/* ── 8 ── */}
      <h2 id="sql-vs-nosql">SQL vs NoSQL: when to choose each</h2>
      <ArticleTable caption="SQL vs NoSQL — the real decision criteria" minWidth={880}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>SQL (Postgres, MySQL)</th>
              <th>NoSQL (MongoDB, DynamoDB, Redis)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Schema</td>
              <td>Fixed, enforced</td>
              <td>Flexible, schemaless</td>
            </tr>
            <tr>
              <td>Relations</td>
              <td>First-class JOINs</td>
              <td>Embedding or application-level joins</td>
            </tr>
            <tr>
              <td>Transactions</td>
              <td>Full ACID</td>
              <td>Limited (MongoDB has multi-doc transactions)</td>
            </tr>
            <tr>
              <td>Consistency</td>
              <td>Strong by default</td>
              <td>Tunable (eventual to strong)</td>
            </tr>
            <tr>
              <td>Query power</td>
              <td>Full SQL, aggregations</td>
              <td>Varies by DB</td>
            </tr>
            <tr>
              <td>Scaling</td>
              <td>Vertical first, horizontal harder</td>
              <td>Horizontal scaling by design (sharding)</td>
            </tr>
            <tr>
              <td>Use when</td>
              <td>Relational data, financial systems, complex queries</td>
              <td>Flexible schema, massive write throughput, caching, time-series</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Common advice: default to PostgreSQL. It supports JSON columns, full-text search, and
        horizontal read scaling via replicas. Reach for MongoDB when document shape varies wildly
        per record. Reach for Redis for caching and ephemeral data.</p>

      {/* ── 9 ── */}
      <h2 id="transactions">How do you handle database transactions?</h2>
      <p>
        A transaction groups multiple operations so they either all succeed or all roll back. Use
        transactions whenever you need to keep multiple tables or rows consistent — the classic
        example is a bank transfer: debit one account and credit another atomically.
      </p>
      <pre><code>{`// Prisma transaction — batch (all queries run atomically)
await prisma.$transaction([
  prisma.account.update({
    where: { id: fromId },
    data: { balance: { decrement: amount } },
  }),
  prisma.account.update({
    where: { id: toId },
    data: { balance: { increment: amount } },
  }),
]);

// Interactive transaction (when you need logic between queries)
await prisma.$transaction(async (tx) => {
  const sender = await tx.account.findUnique({ where: { id: fromId } });
  if (!sender || sender.balance < amount) {
    throw new Error("Insufficient funds"); // triggers auto-rollback
  }
  await tx.account.update({
    where: { id: fromId },
    data: { balance: { decrement: amount } },
  });
  await tx.account.update({
    where: { id: toId },
    data: { balance: { increment: amount } },
  });
});

// Raw pg transaction
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
    [amount, fromId]
  );
  await client.query(
    "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
    [amount, toId]
  );
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}`}</code></pre>

      {/* ── 10 ── */}
      <h2 id="acid">What are ACID properties?</h2>
      <MermaidDiagram chart={acidDiagram} />
      <ArticleTable caption="ACID properties explained with practical examples" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Meaning</th>
              <th>Practical example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Atomicity</strong></td>
              <td>All operations succeed or all are rolled back — no partial state</td>
              <td>If credit succeeds but debit fails, both are undone</td>
            </tr>
            <tr>
              <td><strong>Consistency</strong></td>
              <td>Transaction brings DB from one valid state to another — constraints always hold</td>
              <td>A balance cannot go negative if a CHECK constraint exists</td>
            </tr>
            <tr>
              <td><strong>Isolation</strong></td>
              <td>Concurrent transactions don&apos;t see each other&apos;s intermediate state</td>
              <td>Two simultaneous transfers don&apos;t corrupt each other</td>
            </tr>
            <tr>
              <td><strong>Durability</strong></td>
              <td>Committed transactions persist even if the server crashes immediately after</td>
              <td>Write-ahead log (WAL) on disk before acknowledging commit</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Isolation levels control the trade-off between consistency and concurrency:{" "}
        <code>READ COMMITTED</code> (default in Postgres) prevents dirty reads.{" "}
        <code>REPEATABLE READ</code> prevents non-repeatable reads. <code>SERIALIZABLE</code> is
        the strictest — transactions execute as if serial, preventing phantom reads.
      </p>

      {/* ── 11 ── */}
      <h2 id="n-plus-one">How do you avoid N+1 queries?</h2>
      <MermaidDiagram chart={nPlusOneDiagram} />
      <p>
        The N+1 problem occurs when you fetch a list of N records, then issue one additional query
        per record to fetch related data — totalling N+1 database round trips.
      </p>
      <pre><code>{`// BAD — N+1: 1 query for orders + 1 per order for user
const orders = await prisma.order.findMany();
for (const order of orders) {
  const user = await prisma.user.findUnique({ where: { id: order.userId } });
  // 100 orders = 101 queries
}

// GOOD — 1 query with include (Prisma generates a JOIN or batched query)
const orders = await prisma.order.findMany({
  include: { user: true },
});

// GOOD — explicit JOIN in raw SQL
const { rows } = await pool.query(\`
  SELECT o.*, u.name AS "userName", u.email AS "userEmail"
  FROM orders o
  JOIN users u ON o.user_id = u.id
\`);

// GOOD — DataLoader for batching in GraphQL or loop contexts
import DataLoader from "dataloader";

const userLoader = new DataLoader(async (ids: readonly number[]) => {
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
  const map = Object.fromEntries(users.map(u => [u.id, u]));
  return ids.map(id => map[id] ?? null);
});

// Now called N times but batched into 1 query automatically
const user = await userLoader.load(order.userId);`}</code></pre>

      {/* ── 12 ── */}
      <h2 id="indexes">What are database indexes?</h2>
      <p>
        An index is a separate data structure (typically a B-tree) that the database maintains
        alongside a table to speed up lookups on specific columns. Without an index, a query on a
        column requires a full table scan — O(n). With a B-tree index, lookup is O(log n).
      </p>
      <pre><code>{`-- Without index: full table scan on 10M rows
SELECT * FROM users WHERE email = 'alice@example.com';

-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Now: index seek — O(log n)
SELECT * FROM users WHERE email = 'alice@example.com';

-- Composite index — order matters (leftmost prefix rule)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
-- Efficient for: WHERE user_id = ? ORDER BY created_at DESC
-- NOT efficient for: WHERE created_at = ?  (leading column missing)

-- Prisma schema index
model User {
  id    Int    @id
  email String @unique          // unique constraint = unique index
  @@index([lastName, firstName])
}`}</code></pre>
      <p>
        PostgreSQL also supports <strong>partial indexes</strong> (index only rows matching a
        condition), <strong>expression indexes</strong> (index on <code>lower(email)</code>), and{" "}
        <strong>GIN indexes</strong> for full-text search and JSONB columns.
      </p>

      {/* ── 13 ── */}
      <h2 id="index-tradeoffs">Tradeoffs of indexes</h2>
      <ArticleTable caption="Index benefits vs costs — know when to add them and when to hold back" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Benefit</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Faster reads (SELECT, WHERE, ORDER BY, JOIN)</td>
              <td>Slower writes — INSERT/UPDATE/DELETE must update the index</td>
            </tr>
            <tr>
              <td>Enables efficient range scans</td>
              <td>Index takes disk space (can be 10–50% of table size)</td>
            </tr>
            <tr>
              <td>Supports covering indexes (no table lookup needed)</td>
              <td>Too many indexes confuses the query planner</td>
            </tr>
            <tr>
              <td>Enforces uniqueness (UNIQUE index)</td>
              <td>Index maintenance adds overhead on high-write tables</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Rule of thumb:</strong> index foreign keys, columns used in <code>WHERE</code>/
        <code>JOIN</code>/<code>ORDER BY</code>, and columns with high cardinality. Avoid indexing
        boolean or low-cardinality columns — the planner will prefer a full scan anyway. Use{" "}
        <code>EXPLAIN ANALYZE</code> in PostgreSQL to verify the query plan.
      </p>

      {/* ── 14 ── */}
      <h2 id="migrations">How do you handle database migrations?</h2>
      <p>
        A database migration is a versioned, tracked change to the schema (adding a table, adding a
        column, renaming a column). Migrations let you evolve the schema alongside code changes and
        apply them consistently across environments (dev → staging → prod).
      </p>
      <pre><code>{`# Prisma migration workflow
npx prisma migrate dev --name add_user_role
# Creates: prisma/migrations/20240115_add_user_role/migration.sql
# Applies to dev DB + updates _prisma_migrations table

# In CI/production (never use "migrate dev" in prod)
npx prisma migrate deploy
# Applies all pending migrations from the migrations folder

# Generated SQL example
-- prisma/migrations/.../migration.sql
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';`}</code></pre>
      <p>Best practices for safe migrations:</p>
      <ul>
        <li>
          <strong>Never drop a column in the same deploy as removing code that reads it</strong> —
          deploy the code change first, then drop the column in a separate migration.
        </li>
        <li>
          <strong>Adding NOT NULL columns</strong> — add with a DEFAULT first, backfill existing
          rows, then drop the default if needed. Adding NOT NULL without a default locks the table.
        </li>
        <li>
          <strong>Run migrations before starting new app code</strong> — in Kubernetes this means
          an init container or a pre-deploy job.
        </li>
        <li>
          <strong>Never edit an applied migration file</strong> — create a new migration instead.
        </li>
      </ul>

      {/* ── 15 ── */}
      <h2 id="relationships">Modeling one-to-many and many-to-many relationships</h2>
      <MermaidDiagram chart={relationshipsDiagram} />
      <pre><code>{`// One-to-many: User has many Posts
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}
model Post {
  id     Int  @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id])
}

// Many-to-many: Post has many Tags, Tag has many Posts
// Prisma auto-creates the join table (_PostToTag)
model Post {
  id   Int   @id @default(autoincrement())
  tags Tag[]
}
model Tag {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

// Many-to-many with extra fields on the join table — must be explicit
model Post {
  id      Int          @id
  authors PostAuthor[]
}
model Author {
  id    Int          @id
  posts PostAuthor[]
}
model PostAuthor {
  postId   Int
  authorId Int
  role     String  // "primary" | "contributor"
  post     Post    @relation(fields: [postId], references: [id])
  author   Author  @relation(fields: [authorId], references: [id])
  @@id([postId, authorId])
}`}</code></pre>

      {/* ── 16 ── */}
      <h2 id="soft-deletes">How do you handle soft deletes?</h2>
      <p>
        A soft delete marks a record as deleted without removing it from the database. This
        preserves audit history, allows recovery, and maintains referential integrity for related
        records.
      </p>
      <pre><code>{`// Schema — add deletedAt column
model User {
  id        Int       @id @default(autoincrement())
  email     String
  deletedAt DateTime? // null = active, timestamp = soft-deleted
}

// Soft delete
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() },
});

// All queries must filter out deleted records
await prisma.user.findMany({
  where: { deletedAt: null },
});

// Better: Prisma extension to apply filter automatically
const xprisma = prisma.$extends({
  query: {
    user: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});

// Restore
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: null },
});`}</code></pre>
      <p>
        Downside: queries must always filter on <code>deletedAt IS NULL</code>. Use a partial index
        on <code>WHERE deleted_at IS NULL</code> to keep read performance high. Old soft-deleted
        data accumulates — archive rows past a retention window to a separate table.
      </p>

      {/* ── 17 ── */}
      <h2 id="optimistic-locking">What is optimistic locking?</h2>
      <p>
        Optimistic locking prevents lost updates when two processes read the same row and both try
        to write back. Instead of locking the row on read, each row carries a version number. On
        update, you assert the version has not changed. If it has, the update fails and the caller
        retries.
      </p>
      <pre><code>{`// Schema — version column
model Product {
  id      Int @id
  stock   Int
  version Int @default(0)
}

// Read
const product = await prisma.product.findUnique({ where: { id } });
// product.version = 3, product.stock = 10

// Update only if version still matches
const updated = await prisma.product.updateMany({
  where: {
    id: product.id,
    version: product.version, // optimistic lock check
  },
  data: {
    stock: { decrement: quantity },
    version: { increment: 1 },
  },
});

if (updated.count === 0) {
  // Another process updated the row first — retry
  throw new ConflictError("Concurrent modification — please retry");
}

// PostgreSQL raw SQL equivalent
const result = await pool.query(
  \`UPDATE products
   SET stock = stock - $1, version = version + 1
   WHERE id = $2 AND version = $3\`,
  [quantity, productId, expectedVersion]
);
if (result.rowCount === 0) throw new ConflictError("Concurrent modification");`}</code></pre>
      <p>
        Use optimistic locking when conflicts are rare. Use pessimistic locking (
        <code>SELECT ... FOR UPDATE</code>) when conflicts are frequent or the cost of retrying is
        high (e.g., in financial systems with high contention on the same row).
      </p>

      {/* ── 18 ── */}
      <h2 id="idempotency-keys">How do you implement idempotency keys?</h2>
      <p>
        An idempotency key is a client-supplied unique identifier that allows the server to detect
        and deduplicate retried requests. The classic use case is payment processing: the client
        retries on network failure, but the charge should only happen once.
      </p>
      <pre><code>{`// Schema — store idempotency keys with cached responses
model IdempotencyKey {
  key        String   @id           // UUID from client header
  endpoint   String                 // "POST /payments"
  statusCode Int
  response   Json
  createdAt  DateTime @default(now())
  expiresAt  DateTime               // cleanup after 24h
}

// Middleware
import type { Request, Response, NextFunction } from "express";

async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) return next(); // optional for safe methods

  const cached = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (cached) {
    return res.status(cached.statusCode).json(cached.response);
  }

  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    prisma.idempotencyKey
      .create({
        data: {
          key,
          endpoint: req.method + " " + req.path,
          statusCode: res.statusCode,
          response: body,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      .catch(console.error);
    return originalJson(body);
  };

  next();
}

// Client usage — stable UUID per logical operation
const idempotencyKey = crypto.randomUUID();
await fetch("/api/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  },
  body: JSON.stringify({ amount: 100, currency: "USD" }),
});
// Safe to retry with the same idempotencyKey on network failure`}</code></pre>

      {/* ── 19 ── */}
      <h2 id="eventual-consistency">What is eventual consistency?</h2>
      <p>
        Eventual consistency means that if no new updates are made to a piece of data, all replicas
        will <em>eventually</em> converge to the same value — but there may be a window where
        different nodes return different results. This occurs in distributed systems: read replicas
        lag behind the primary, caches hold stale data, or microservices propagate state via
        events asynchronously.
      </p>
      <pre><code>{`// Example: read-your-writes problem with a read replica
await prisma.user.update({ where: { id }, data: { photoUrl: newUrl } });
// Write goes to PRIMARY (acknowledged)

// Redirect immediately reads from READ REPLICA (may lag 50–500ms)
const user = await prisma.user.findUnique({ where: { id } });
// user.photoUrl might still be the OLD URL — replica hasn't caught up

// Solutions:
// 1. Return the updated object directly from the write (no re-query)
// 2. Route reads to primary for N ms after a write
// 3. Write-through cache updated synchronously with the DB write
// 4. Optimistic UI — show the new value immediately, confirm async`}</code></pre>
      <ArticleTable caption="Eventual consistency scenarios and mitigations" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Cause</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Stale read replica</td>
              <td>Replication lag (50–500ms)</td>
              <td>Route reads to primary for writes; sticky sessions</td>
            </tr>
            <tr>
              <td>Stale cache</td>
              <td>Cache not invalidated after write</td>
              <td>Write-through cache or cache invalidation on write</td>
            </tr>
            <tr>
              <td>Cross-service state</td>
              <td>Service B hasn&apos;t processed event from Service A yet</td>
              <td>Polling, webhooks, or optimistic UI</td>
            </tr>
            <tr>
              <td>Distributed counter</td>
              <td>Multiple nodes increment simultaneously</td>
              <td>Single authoritative counter or CRDT</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Strong consistency requires coordination (locks, 2PC) which is expensive. Eventual
        consistency is a conscious trade-off to gain availability and partition tolerance (CAP
        theorem: you can only pick 2 of 3). Most web applications tolerate eventual consistency for
        non-critical reads.
      </p>
    </div>
  );
}
