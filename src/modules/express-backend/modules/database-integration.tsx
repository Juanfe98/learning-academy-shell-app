import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const connectionPoolDiagram = String.raw`flowchart TD
    APP["Express App\n(multiple concurrent requests)"]
    POOL["Connection Pool\n(max 10 connections)"]
    C1["DB Connection 1"]
    C2["DB Connection 2"]
    C3["DB Connection 3"]
    CD["...up to max"]
    DB[("PostgreSQL\nDatabase")]

    APP --> POOL
    POOL --> C1
    POOL --> C2
    POOL --> C3
    POOL --> CD
    C1 --> DB
    C2 --> DB
    C3 --> DB
    CD --> DB`;

const nPlusOneDiagram = String.raw`flowchart TD
    N1["N+1 Problem\nFetch 10 users → 10 separate queries for each user's posts"]
    N1 --> Q1["SELECT * FROM users LIMIT 10"]
    Q1 --> L1["Loop over 10 users"]
    L1 --> Q2["SELECT * FROM posts WHERE userId = user1.id"]
    L1 --> Q3["SELECT * FROM posts WHERE userId = user2.id"]
    L1 --> QN["...8 more queries"]

    N2["Batched Query\nFetch all posts in one query, group in memory"]
    N2 --> QB1["SELECT * FROM users LIMIT 10"]
    QB1 --> QB2["SELECT * FROM posts WHERE userId IN (1,2,3,...10)"]
    QB2 --> GROUP["Group posts by userId in JS\nO(n) single pass"]`;

export const toc: TocItem[] = [
  { id: "connection-pools", title: "Connection Pools", level: 2 },
  { id: "raw-vs-orm", title: "Raw pg vs Knex vs Prisma", level: 2 },
  { id: "prisma-express", title: "Prisma in Express", level: 2 },
  { id: "repository-pattern", title: "Repository Pattern", level: 2 },
  { id: "transactions", title: "Transactions", level: 2 },
  { id: "n-plus-one", title: "The N+1 Problem", level: 2 },
  { id: "migrations", title: "Database Migrations", level: 2 },
  { id: "graceful-shutdown", title: "Connection Handling & Graceful Shutdown", level: 2 },
];

export default function DatabaseIntegration() {
  return (
    <div className="article-content">
      <p>
        The database layer is where most backend bugs live: connection exhaustion under load, N+1
        queries that work fine in dev but collapse in production, missing transactions that leave
        data in inconsistent states, and migrations that break production on deploy. This module
        covers the patterns that make database integration reliable.
      </p>

      <h2 id="connection-pools">Connection Pools</h2>
      <MermaidDiagram
        chart={connectionPoolDiagram}
        title="Database Connection Pool"
        caption="Opening a new TCP connection to PostgreSQL takes ~50ms. Without pooling, each request creates and destroys a connection — this doesn't scale. A pool maintains a set of reusable connections. Requests wait for an available connection rather than opening new ones."
        minHeight={380}
      />
      <pre><code>{`// pg — raw PostgreSQL client with connection pooling
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                  // maximum connections in pool (default: 10)
  min: 2,                   // minimum connections to keep open (warm pool)
  idleTimeoutMillis: 30_000, // close idle connections after 30s
  connectionTimeoutMillis: 5_000, // error if can't get connection in 5s
  allowExitOnIdle: false,   // keep pool alive (set true only in scripts)
});

// Pool events — critical for monitoring
pool.on("connect", () => console.log("New DB connection established"));
pool.on("error", (err) => console.error("Pool error:", err)); // idle client error

// Use pool.query for simple queries (borrows and returns connection automatically)
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

// Use pool.connect() for transactions (need the same connection for all statements)
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... multiple queries on same client ...
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release(); // CRITICAL: always release back to pool
}

// Pool size tuning
// Too small: requests queue up waiting for connections (high latency)
// Too large: DB runs out of resources (PostgreSQL default max_connections = 100)
// Rule of thumb: pool size ≈ (num_cores × 2) + effective_spindle_count
// For serverless: use pgBouncer or Prisma Accelerate for connection pooling
// (serverless functions can create many pools simultaneously)`}</code></pre>

      <h2 id="raw-vs-orm">Raw pg vs Knex vs Prisma</h2>
      <ArticleTable caption="Database access layers — type safety, learning curve, features, and ideal use case" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Library</th>
              <th>Type Safety</th>
              <th>Learning Curve</th>
              <th>Key Features</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>pg</code></td>
              <td>None (raw <code>any[]</code>)</td>
              <td>Low</td>
              <td>Full SQL control, streaming, LISTEN/NOTIFY, COPY</td>
              <td>Complex queries, performance-critical, full SQL control</td>
            </tr>
            <tr>
              <td><code>Knex</code></td>
              <td>Minimal (basic generics)</td>
              <td>Medium</td>
              <td>Query builder, migrations, seeds, multi-DB support</td>
              <td>Teams comfortable with SQL, need query building + migrations</td>
            </tr>
            <tr>
              <td><code>Prisma</code></td>
              <td>Excellent (generated types)</td>
              <td>Medium</td>
              <td>Schema-first, generated client, migrations, Studio GUI</td>
              <td>TypeScript-first projects, rapid development, team productivity</td>
            </tr>
            <tr>
              <td><code>TypeORM</code></td>
              <td>Good (decorator-based)</td>
              <td>High</td>
              <td>Active Record + Data Mapper, decorators, migrations</td>
              <td>Teams from Java/Spring background, decorator-heavy codebases</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="prisma-express">Prisma in Express</h2>
      <pre><code>{`// 1. Install and initialize
// npm install prisma @prisma/client
// npx prisma init  → creates prisma/schema.prisma + .env

// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
}

enum Role {
  USER
  EDITOR
  ADMIN
}

// 2. Run migration (generates SQL and applies it)
// npx prisma migrate dev --name "init"
// npx prisma generate  → regenerates PrismaClient types

// 3. Singleton PrismaClient — one instance per process
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

// Prevent multiple instances in Next.js hot reload / ts-node watch
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 4. Typed queries in route handlers
import { prisma } from "@/lib/prisma";

// Create
const user = await prisma.user.create({
  data: { email, name, role: "USER" },
});

// Read with relation loading
const userWithPosts = await prisma.user.findUnique({
  where: { id },
  include: { posts: { where: { published: true }, orderBy: { createdAt: "desc" } } },
});

// Update
const updated = await prisma.user.update({
  where: { id },
  data: { name },
});

// Paginate
const users = await prisma.user.findMany({
  where: { role: "USER" },
  orderBy: { createdAt: "desc" },
  take: 20,
  skip: offset,
});

// Delete
await prisma.user.delete({ where: { id } });

// Type-safe selection — only include specified fields
const userNames = await prisma.user.findMany({
  select: { id: true, name: true, email: true }, // TypeScript knows the shape
});
// userNames is typed as { id: string; name: string; email: string }[]`}</code></pre>

      <h2 id="repository-pattern">Repository Pattern</h2>
      <pre><code>{`// Repository pattern: encapsulate all DB access behind an interface
// Benefits: easy to mock in tests, swap implementations, centralize query logic

// src/repositories/user.repository.ts
import { prisma } from "@/lib/prisma";
import { User, Prisma } from "@prisma/client";

interface FindManyOptions {
  role?: string;
  page?: number;
  limit?: number;
}

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findMany({ role, page = 1, limit = 20 }: FindManyOptions = {}) {
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as Prisma.EnumRoleFilter;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async create(data: { email: string; name: string }): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Partial<Pick<User, "name" | "role">>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}

// Dependency injection in route handler
const userRepository = new UserRepository();

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json({ data: user });
}));`}</code></pre>

      <h2 id="transactions">Transactions</h2>
      <pre><code>{`// Transactions: multiple DB operations that must all succeed or all fail
// Critical for: money transfers, order creation (deduct stock + create order), user registration

// Prisma interactive transactions
async function transferCredits(fromUserId: string, toUserId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // All operations in this callback use the same transaction
    const sender = await tx.user.findUnique({ where: { id: fromUserId } });
    if (!sender || sender.credits < amount) {
      throw new Error("Insufficient credits"); // causes automatic rollback
    }

    const [updatedSender, updatedReceiver] = await Promise.all([
      tx.user.update({
        where: { id: fromUserId },
        data: { credits: { decrement: amount } },
      }),
      tx.user.update({
        where: { id: toUserId },
        data: { credits: { increment: amount } },
      }),
    ]);

    await tx.transaction.create({
      data: { fromUserId, toUserId, amount, type: "TRANSFER" },
    });

    return { updatedSender, updatedReceiver };
  });
  // If any operation throws, the entire transaction is rolled back automatically
}

// Prisma batch transactions (faster, no inter-operation dependency)
const [createdUser, createdProfile] = await prisma.$transaction([
  prisma.user.create({ data: { email, name } }),
  prisma.profile.create({ data: { bio: "", userId: "..." } }), // userId not available yet!
  // Use interactive transactions when operations depend on each other's results
]);

// Raw pg transactions
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
  await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release(); // always release — even if rollback throws
}`}</code></pre>

      <h2 id="n-plus-one">The N+1 Problem</h2>
      <MermaidDiagram
        chart={nPlusOneDiagram}
        title="N+1 Query Problem vs Batched Solution"
        caption="N+1 queries happen when you load a list of N items, then loop and query related data for each one. The fix is to load all related data in one query using an IN clause, then group the results in memory."
        minHeight={400}
      />
      <pre><code>{`// N+1 problem: 1 query for users + N queries for each user's posts
async function getUsersWithPosts_BAD() {
  const users = await prisma.user.findMany({ take: 20 }); // 1 query
  for (const user of users) {
    user.posts = await prisma.post.findMany({ where: { authorId: user.id } }); // 20 more queries!
  }
  return users; // 21 total queries
}

// Solution 1: Prisma include — eager load in a single query (JOIN)
async function getUsersWithPosts_GOOD() {
  return prisma.user.findMany({
    take: 20,
    include: {
      posts: { where: { published: true }, take: 5 },
    },
  });
  // 1 query with JOIN — much better
}

// Solution 2: Separate query + group in memory
// Use when you need more control (filtering, pagination on nested data)
async function getUsersWithPosts_BATCHED() {
  const users = await prisma.user.findMany({ take: 20 }); // 1 query
  const userIds = users.map((u) => u.id);

  const posts = await prisma.post.findMany({
    where: { authorId: { in: userIds } }, // 1 query with IN clause
    orderBy: { createdAt: "desc" },
  });

  // Group posts by authorId in memory — O(n) pass
  const postsByUserId = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    (acc[post.authorId] ??= []).push(post);
    return acc;
  }, {});

  return users.map((u) => ({ ...u, posts: postsByUserId[u.id] ?? [] }));
  // Total: 2 queries instead of 21
}

// Solution 3: DataLoader pattern (for GraphQL resolvers)
// Batches N individual calls into one, with per-item caching
import DataLoader from "dataloader";

const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => userMap.get(id) ?? null);
});

// Each call is batched in the same tick
const user1 = await userLoader.load("id1"); // These 3 calls become 1 DB query
const user2 = await userLoader.load("id2");
const user3 = await userLoader.load("id3");`}</code></pre>

      <h2 id="migrations">Database Migrations</h2>
      <pre><code>{`// Prisma migrations — schema-first, version-controlled
// npx prisma migrate dev --name "add-user-role"
// Creates: prisma/migrations/20240115_add_user_role/migration.sql
// Applies the migration to your development DB
// Updates Prisma Client types

// Migration file (auto-generated, do not edit):
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'EDITOR', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

// In production: npx prisma migrate deploy
// Applies all pending migrations (does NOT generate new ones)
// Safe: checks migration history, refuses to apply if history diverges

// Never: npx prisma migrate reset (drops all data!)
// Never: edit migration files after they've been applied

// Additive migrations are safe: ADD COLUMN with DEFAULT
// Destructive migrations are dangerous: DROP COLUMN, ALTER TYPE, rename columns
// For destructive changes: expand-contract pattern
// Step 1: Add new column (backwards compatible)
// Step 2: Deploy new code that writes to both old and new column
// Step 3: Backfill old data to new column
// Step 4: Deploy code that reads only from new column
// Step 5: Drop old column (backwards incompatible — separate deploy)

// Prisma Studio — GUI database browser
// npx prisma studio  → opens http://localhost:5555`}</code></pre>

      <h2 id="graceful-shutdown">Connection Handling & Graceful Shutdown</h2>
      <pre><code>{`// src/lib/prisma.ts — singleton with shutdown hook
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// src/server.ts — graceful shutdown
import { createServer } from "http";
import app from "./app";
import { prisma } from "./lib/prisma";
import { pool } from "./lib/pg"; // if using raw pg

const server = createServer(app);

server.listen(process.env.PORT ?? 3000, () => {
  console.log("Server listening on port", process.env.PORT ?? 3000);
});

async function shutdown(signal: string) {
  console.log(\`\${signal} received, shutting down gracefully\`);

  // Stop accepting new connections
  server.close(async () => {
    console.log("HTTP server closed");

    // Close database connections
    await prisma.$disconnect();
    await pool.end(); // if using pg pool

    console.log("Database connections closed");
    process.exit(0);
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM")); // Kubernetes sends this to terminate pods
process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C in terminal`}</code></pre>
    </div>
  );
}
