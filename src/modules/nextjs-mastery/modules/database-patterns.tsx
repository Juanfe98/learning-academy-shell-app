import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const connectionModels = String.raw`flowchart TD
  subgraph Traditional["Traditional Server (1 long-lived process)"]
    TS["Node.js Process"]
    TP["Connection Pool<br/>(e.g. 10 connections max)"]
    R1["Request 1"] --> TP
    R2["Request 2"] --> TP
    R3["Request 3"] --> TP
    RN["Request N"] --> TP
    TS --> TP
    TP --> DB1[("PostgreSQL<br/>100 connections")]
  end

  subgraph Serverless["Serverless (Vercel / Lambda)"]
    FN1["Invocation 1<br/>Pool: 0→10"]
    FN2["Invocation 2<br/>Pool: 0→10"]
    FN3["Invocation 3<br/>Pool: 0→10"]
    FN10["Invocation 10<br/>Pool: 0→10"]
    FN11["Invocation 11<br/>Pool: 0→10"]
    FN1 --> DB2
    FN2 --> DB2
    FN3 --> DB2
    FN10 --> DB2
    FN11 --> BOOM["❌ Connection limit exceeded!<br/>PrismaClientInitializationError"]
    BOOM --> DB2[("PostgreSQL<br/>100 connections")]
  end`;

const edgeRuntimeDecision = String.raw`flowchart TD
  START["Choosing ORM/Driver for Next.js"]
  START --> Q1{"Runtime target?"}
  Q1 -->|"Node.js (default)"| Q2{"Prefer SQL or ORM?"}
  Q1 -->|"Edge (Vercel Edge / Middleware)"| EDGE["Edge-compatible only"]

  Q2 -->|"ORM / type-safe"| PRISMA["Prisma + PrismaClient<br/>Use dev singleton pattern"]
  Q2 -->|"SQL-like, lightweight"| DRIZZLE["Drizzle ORM<br/>+ postgres driver"]

  PRISMA --> POOL1{"Need connection pooling?"}
  DRIZZLE --> POOL2{"Need connection pooling?"}

  POOL1 -->|"Managed (easiest)"| ACC["Prisma Accelerate<br/>(HTTP proxy + cache)"]
  POOL1 -->|"Self-hosted"| PGB["PgBouncer<br/>transaction mode"]
  POOL2 -->|"Neon DB"| NEON_D["@neondatabase/serverless<br/>(pg driver)"]
  POOL2 -->|"Any Postgres"| PGB

  EDGE --> Q3{"ORM preference?"}
  Q3 -->|"Prisma"| ACC2["Prisma Accelerate<br/>(HTTP, no TCP)"]
  Q3 -->|"Drizzle"| NEON_E["Drizzle + @neondatabase/serverless<br/>(HTTP driver)"]`;

export const toc: TocItem[] = [
  { id: "db-mental-model", title: "The Serverless Mental Model", level: 2 },
  { id: "serverless-connection-problem", title: "The Connection Exhaustion Problem", level: 2 },
  { id: "prisma-nextjs", title: "Prisma with Next.js", level: 2 },
  { id: "prisma-singleton", title: "The Dev Hot-Reload Singleton", level: 3 },
  { id: "drizzle-nextjs", title: "Drizzle with Next.js", level: 2 },
  { id: "connection-pooling-solutions", title: "Connection Pooling Solutions", level: 2 },
  { id: "data-access-layer", title: "The Data Access Layer Pattern", level: 2 },
  { id: "transactions-server-actions", title: "Transactions in Server Actions", level: 2 },
  { id: "edge-runtime-constraint", title: "Edge Runtime Constraints", level: 2 },
  { id: "db-comparison-table", title: "ORM / Driver Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DatabasePatterns() {
  return (
    <div className="article-content">
      <p>
        Connecting a database to a Next.js app looks deceptively simple — install Prisma, run{" "}
        <code>prisma.user.findMany()</code> in a Server Component, ship it. The trap is that
        Next.js on Vercel is a <strong>serverless runtime</strong>, and every database pattern
        you learned from Express, Rails, or Django is based on a fundamentally different model.
        The most common production incident for teams shipping their first Next.js + Postgres app
        is connection exhaustion: the database starts rejecting connections under real traffic
        and the app goes dark. This module builds the mental model to prevent that, then walks
        through the patterns that actually hold up at scale.
      </p>

      <h2 id="db-mental-model">The Serverless Mental Model</h2>
      <p>
        A traditional server is a <strong>long-lived process</strong>. It boots once, opens a
        connection pool of, say, 10 connections, and every incoming HTTP request borrows a
        connection from that pool and returns it when done. The pool is shared — 1 000 requests
        per second can share those 10 connections because they take turns.
      </p>
      <p>
        A serverless function is a <strong>short-lived, stateless execution unit</strong>. Vercel
        can spin up hundreds of isolated function instances in parallel — one per concurrent
        request. Each instance starts from a cold module graph. There is no shared process, no
        shared memory, and <em>no shared connection pool</em>. If your ORM opens a pool of 10
        connections per process and Vercel has 11 concurrent invocations, you have just tried to
        open 110 connections to a database whose default maximum is 100.
      </p>
      <p>
        The solution is not to stop using ORMs — it is to understand which layer handles pooling
        and to put that layer in the right place: <strong>outside your function</strong>, in a
        proxy that outlives individual invocations.
      </p>

      <h2 id="serverless-connection-problem">The Connection Exhaustion Problem</h2>
      <p>
        PostgreSQL ships with a default <code>max_connections = 100</code>. Prisma&apos;s
        connection pool default is <code>num_physical_cpus × 2 + 1</code>, which on a typical
        cloud instance is around 10. With a traditional server this is fine: one pool shared by
        all requests. In serverless, every cold-start invocation opens its own pool.
      </p>
      <p>
        The math is brutal:{" "}
        <strong>11 concurrent Vercel function invocations × 10 connections each = 110</strong>.
        Postgres rejects the 101st connection with{" "}
        <code>FATAL: sorry, too many clients already</code>, which Prisma surfaces as{" "}
        <code>PrismaClientInitializationError: Can&apos;t reach database server</code>. Your app
        appears to work fine in development (one process, one pool) and falls over silently the
        moment it sees real traffic.
      </p>

      <MermaidDiagram
        chart={connectionModels}
        title="Traditional vs Serverless Connection Models"
        caption="A traditional server shares one pool across all requests. Serverless creates a new pool per invocation — connection count scales with concurrency, not request rate."
        minHeight={560}
      />

      <p>
        The failure is especially insidious because it only appears under concurrent load. A
        simple <code>hey -n 200 -c 50 https://yourapp.com/api/users</code> load test will surface
        it immediately, but light sequential traffic never will.
      </p>

      <h2 id="prisma-nextjs">Prisma with Next.js</h2>
      <p>
        Prisma is the most popular ORM in the Next.js ecosystem for good reason: its generated
        client is fully type-safe, migration tooling is excellent, and it integrates cleanly into
        Server Components and Server Actions.
      </p>

      <pre>
        <code>{`# Install and initialize
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql

# schema.prisma (simplified)
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
  name      String?
  createdAt DateTime @default(now())
}

# After editing schema:
npx prisma migrate dev --name init
npx prisma generate`}</code>
      </pre>

      <p>
        Using Prisma in a Server Component is straightforward once you have the singleton
        in place (see below):
      </p>

      <pre>
        <code>{`// src/app/(hub)/users/page.tsx  — Server Component
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  // This runs on the server — prisma is never sent to the browser
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name} — {u.email}</li>
      ))}
    </ul>
  );
}

// src/app/actions/user.ts  — Server Action
"use server";
import { prisma } from "@/lib/prisma";

export async function createUser(formData: FormData) {
  const email = formData.get("email") as string;
  const name  = formData.get("name")  as string;
  return prisma.user.create({ data: { email, name } });
}`}</code>
      </pre>

      <h3 id="prisma-singleton">The Dev Hot-Reload Singleton</h3>
      <p>
        Next.js dev mode uses Hot Module Replacement (HMR). Every time you save a file, the
        module graph is partially invalidated and re-evaluated. <strong>Without a singleton,
        every HMR cycle creates a new <code>PrismaClient</code> instance</strong> — and each
        instance opens its own connection pool. After a few dozen saves, your database will hit
        its connection limit even locally. The fix is canonical and well-known:
      </p>

      <pre>
        <code>{`// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// globalThis survives HMR: values attached to it persist across module re-evaluations
// In production there is no HMR, so this just creates one instance at startup
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Only attach to globalThis in dev — in production we want the module-level singleton
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}`}</code>
      </pre>

      <p>
        The pattern works because <code>globalThis</code> is the global object — it outlives
        individual module instances in the Next.js dev runtime. The first time the module loads,{" "}
        <code>globalForPrisma.prisma</code> is <code>undefined</code>, so a new{" "}
        <code>PrismaClient</code> is created and stored on <code>globalThis</code>. On every
        subsequent HMR reload, the existing instance is reused. In production (no HMR),
        the <code>if</code> guard is never true — a single module-level instance is created
        at cold-start and never reassigned.
      </p>

      <h2 id="drizzle-nextjs">Drizzle with Next.js</h2>
      <p>
        Drizzle ORM takes a different philosophy: it is a <strong>thin, SQL-first abstraction
        with zero connection management of its own</strong>. Drizzle does not open pools — it
        delegates entirely to the underlying driver. This makes it naturally serverless-safe when
        paired with the right driver, and its bundle size is significantly smaller than Prisma
        (no generated client, no Rust binary).
      </p>

      <pre>
        <code>{`# Install Drizzle with the postgres.js driver (Node.js only)
npm install drizzle-orm postgres
npm install -D drizzle-kit

// src/lib/schema.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:     text("email").notNull().unique(),
  name:      text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// src/lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// postgres() manages the underlying pool — one instance per process
// In serverless, each invocation gets one connection (pool size 1 by default)
const client = postgres(process.env.DATABASE_URL!, {
  max: 1, // ← crucial for serverless: don't over-allocate connections per invocation
});

export const db = drizzle(client, { schema });`}</code>
      </pre>

      <pre>
        <code>{`// Usage in a Server Component
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { desc } from "drizzle-orm";

export default async function UsersPage() {
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(50);

  return <ul>{allUsers.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}`}</code>
      </pre>

      <p>
        Drizzle&apos;s SQL-like syntax (<code>.select().from().where().orderBy()</code>) is
        deliberately close to raw SQL, which makes it easier to reason about what query will
        actually run. Prisma&apos;s model-based API is more abstract — easier to start with,
        but harder to optimize when you need a specific query shape.
      </p>

      <h2 id="connection-pooling-solutions">Connection Pooling Solutions</h2>
      <p>
        The real fix for the serverless connection problem is a <strong>connection pooler
        that lives outside your function</strong> and accepts many short-lived connections while
        maintaining a smaller stable pool to the actual database. You have four practical options:
      </p>

      <h3>PgBouncer (Self-Hosted)</h3>
      <p>
        PgBouncer is the battle-tested open-source Postgres connection pooler. Run it in{" "}
        <strong>transaction mode</strong>: a client connection is only associated with a server
        connection for the duration of a single transaction. Between transactions, the slot
        returns to the pool. A PgBouncer instance with 20 server connections can serve thousands
        of client connections. Requires your own infra (or a managed Postgres provider that
        bundles it).
      </p>

      <h3>Prisma Accelerate (Managed)</h3>
      <p>
        Prisma&apos;s cloud product. Change your <code>DATABASE_URL</code> to a Prisma Accelerate
        connection string and your Prisma client automatically routes through their global proxy.
        Accelerate handles pooling, adds query-result caching (with cache invalidation tags),
        and — critically — uses HTTP rather than TCP, making it{" "}
        <strong>edge runtime compatible</strong>. No infra changes, just a URL swap.
      </p>

      <pre>
        <code>{`// With Prisma Accelerate: just change the URL
// DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"
// No code changes required — prisma.$extends() needed for cache features only

import { PrismaClient } from "@prisma/client/edge"; // ← edge-safe import
import { withAccelerate } from "@prisma/extension-accelerate";

export const prisma = new PrismaClient().$extends(withAccelerate());

// Optional: cache a query for 60 seconds
const users = await prisma.user.findMany({
  cacheStrategy: { swr: 60, ttl: 60 },
});`}</code>
      </pre>

      <h3>Neon Serverless Driver</h3>
      <p>
        If you use Neon Postgres, their <code>@neondatabase/serverless</code> driver replaces
        TCP with <strong>HTTP for single queries and WebSockets for transactions</strong>. HTTP
        has no persistent connection overhead — each query is a single HTTP round-trip. This
        eliminates connection exhaustion entirely for read-heavy workloads and works in any
        runtime including the Edge.
      </p>

      <pre>
        <code>{`import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Each query is an independent HTTP request — no connection pool needed
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// For transactions (needs WebSocket):
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbWs = drizzleWs({ client: pool, schema });`}</code>
      </pre>

      <h3>Supabase Built-in Pooler</h3>
      <p>
        Supabase runs Supavisor (a Postgres pooler) on port <code>6543</code>. The direct
        connection on port <code>5432</code> is for migrations and long-lived processes only.
        For serverless, always use port <code>6543</code> with transaction mode and append{" "}
        <code>?pgbouncer=true</code> to disable Prisma&apos;s prepared statements
        (incompatible with PgBouncer transaction mode).
      </p>

      <pre>
        <code>{`# .env
# Direct (migrations only, never use from serverless functions)
DIRECT_URL="postgresql://user:pass@db.project.supabase.co:5432/postgres"

# Pooled (use this in your app)
DATABASE_URL="postgresql://user:pass@db.project.supabase.co:6543/postgres?pgbouncer=true"

# schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // prisma migrate uses this
}`}</code>
      </pre>

      <h2 id="data-access-layer">The Data Access Layer Pattern</h2>
      <p>
        Once you have pooling sorted, the next architectural decision is where to put your
        database queries. The most common mistake is querying directly from Server Components
        and Server Actions scattered across the codebase — it works, but it does not scale
        as a codebase grows. The <strong>Data Access Layer (DAL)</strong> is the Next.js
        team&apos;s recommended pattern: centralize all database access in{" "}
        <code>src/lib/data/</code>.
      </p>
      <p>
        Every DAL function follows the same structure: verify the session, validate input,
        run the query, return shaped data. Mark the file with <code>import &quot;server-only&quot;</code>{" "}
        so the bundler will throw an error if it ever ends up in a client bundle.
      </p>

      <pre>
        <code>{`// src/lib/data/users.ts
import "server-only"; // hard build error if accidentally imported client-side
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getUserById(id: string) {
  const session = await getSession();
  if (!session) return null; // never expose DB to unauthenticated requests

  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true }, // never select password hash etc.
  });
}

export async function getUsersForAdmin() {
  const session = await getSession();
  if (session?.role !== "admin") throw new Error("Unauthorized");

  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// Usage: same function reusable from both Server Components and Server Actions
// Server Component:
// const user = await getUserById(params.id);
// Server Action:
// const user = await getUserById(session.userId);`}</code>
      </pre>

      <p>
        The DAL pattern gives you three things: <strong>auth in one place</strong> (not
        sprinkled across every page), <strong>select hygiene</strong> (you decide which fields
        leave the database), and <strong>reusability</strong> (the same function works from
        any Server Component, any Server Action, and any API route).
      </p>

      <h2 id="transactions-server-actions">Transactions in Server Actions</h2>
      <p>
        Server Actions are the right place to run multi-step write operations that must succeed
        or fail atomically. Both Prisma and Drizzle support transactions natively.
      </p>

      <pre>
        <code>{`// src/app/actions/order.ts
"use server";
import { prisma } from "@/lib/prisma";
import { db, orders, inventory } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

// --- Prisma transaction ---
export async function createOrderPrisma(userId: string, productId: string) {
  return prisma.$transaction(async (tx) => {
    // All operations share the same connection and are rolled back together on error
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });

    if (product.stock < 1) throw new Error("Out of stock");

    const order = await tx.order.create({
      data: { userId, productId, totalCents: product.priceCents },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: 1 } },
    });

    return order;
  });
}

// --- Drizzle transaction ---
export async function createOrderDrizzle(userId: string, productId: string) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(inventory)
      .where(eq(inventory.id, productId))
      .for("update"); // row-level lock prevents concurrent overselling

    if (!product || product.quantity < 1) throw new Error("Out of stock");

    const [order] = await tx
      .insert(orders)
      .values({ userId, productId, totalCents: product.priceCents })
      .returning();

    await tx
      .update(inventory)
      .set({ quantity: sql\`\${inventory.quantity} - 1\` })
      .where(eq(inventory.id, productId));

    return order;
  });
}`}</code>
      </pre>

      <p>
        The most common transaction mistake with PgBouncer is using <strong>session-mode
        pooling instead of transaction-mode</strong>. In session mode, a client connection
        is held for the entire session — transactions work but you get no pooling benefit.
        In transaction mode (what you want), the connection returns to the pool after each
        transaction, so Prisma&apos;s <code>$transaction</code> and Drizzle&apos;s{" "}
        <code>transaction()</code> work correctly but <strong>prepared statements and advisory
        locks do not</strong> (they are session-scoped).
      </p>

      <h2 id="edge-runtime-constraint">Edge Runtime Constraints</h2>
      <p>
        Vercel Edge Functions and Next.js Middleware run in a V8 isolate — not Node.js. They
        have no access to TCP sockets, no <code>net</code> module, and no native binaries.
        This rules out Prisma&apos;s standard client and the <code>postgres</code> npm driver.
        If your route is marked <code>export const runtime = &quot;edge&quot;</code>, your
        database access layer must use HTTP-based transport exclusively.
      </p>

      <MermaidDiagram
        chart={edgeRuntimeDecision}
        title="Choosing ORM and Driver by Runtime Target"
        caption="Edge runtime eliminates TCP-based drivers. For Middleware or Edge Routes, use Prisma Accelerate (HTTP proxy) or Drizzle with the Neon serverless HTTP driver."
        minHeight={580}
      />

      <pre>
        <code>{`// Edge-safe route using Drizzle + Neon HTTP driver
export const runtime = "edge"; // ← opt in to V8 isolate

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "@/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql, { schema: { users } });

export async function GET() {
  const result = await db.select().from(users).limit(10);
  return Response.json(result);
}

// NOTE: Middleware (src/middleware.ts) is always edge
// Never import @/lib/prisma or drizzle-orm/postgres-js there`}</code>
      </pre>

      <h2 id="db-comparison-table">ORM / Driver Comparison</h2>

      <ArticleTable
        caption="Choose based on your runtime target and whether you need managed pooling. Mix-and-match is fine: Drizzle for edge routes, Prisma for complex Node.js queries."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>ORM / Driver</th>
              <th>Edge compatible</th>
              <th>Bundle size</th>
              <th>Pooling built-in</th>
              <th>TypeScript</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Prisma</strong> (standard)</td>
              <td>No (TCP / Rust binary)</td>
              <td>~3 MB generated client</td>
              <td>Internal pool (set <code>connection_limit=1</code> for serverless)</td>
              <td>Excellent — generated types</td>
              <td>Complex schemas, team projects, automated migrations</td>
            </tr>
            <tr>
              <td><strong>Prisma Accelerate</strong></td>
              <td>Yes (HTTP)</td>
              <td>~3 MB (edge import path)</td>
              <td>Managed globally by Prisma</td>
              <td>Excellent</td>
              <td>Prisma on Vercel without self-managing pooling</td>
            </tr>
            <tr>
              <td><strong>Drizzle ORM</strong> + <code>postgres</code> driver</td>
              <td>No (TCP)</td>
              <td>~35 KB</td>
              <td>Via driver config (<code>max: 1</code> for serverless)</td>
              <td>Excellent — schema-derived types</td>
              <td>SQL-first, lightweight, no codegen step</td>
            </tr>
            <tr>
              <td><strong>Drizzle ORM</strong> + Neon HTTP driver</td>
              <td>Yes (HTTP)</td>
              <td>~40 KB</td>
              <td>HTTP — no persistent connections</td>
              <td>Excellent</td>
              <td>Edge functions, Neon DB, high-concurrency serverless</td>
            </tr>
            <tr>
              <td><strong>Raw <code>pg</code></strong></td>
              <td>No (TCP)</td>
              <td>~200 KB</td>
              <td>Via <code>pg.Pool</code> (set <code>max: 1</code> for serverless)</td>
              <td>Manual or with <code>pg-typed</code></td>
              <td>Maximum control, existing SQL migrations</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title='How to answer: "Why do you get too many connections with Prisma on Vercel and how do you fix it?"'
        intro="A strong answer shows you understand the serverless execution model, not just the Prisma config knob. Start with the root cause, then walk through the fix and trade-offs."
        steps={[
          "Start with the root cause: serverless functions are stateless and short-lived. Each cold-start invocation creates a new module instance and a new PrismaClient — which opens its own connection pool. 100 concurrent invocations × 10 connections per pool = 1 000 connections to a database that defaults to accepting 100.",
          "Name the specific error: PrismaClientInitializationError or 'too many clients already' from Postgres. It only manifests under concurrent load, which is why it passes local testing.",
          "Walk through the fixes in order of complexity: (1) set connection_limit=1 in DATABASE_URL as a quick mitigation — each invocation takes one connection instead of ten. (2) Use Prisma Accelerate — it acts as an HTTP proxy that maintains a stable pool to your DB and accepts HTTP from your functions. (3) PgBouncer in transaction mode for self-hosted setups.",
          "Mention the dev singleton separately: in development, HMR creates new PrismaClient instances per save cycle — the globalThis singleton prevents connection leaks during local iteration.",
          "Close with the production implication: this is why managed Postgres services (Neon, Supabase, PlanetScale) all ship with a built-in connection pooler. Using the direct connection URL from a serverless function is almost always wrong.",
        ]}
      />

      <InterviewPlaybook
        title='How to answer: "What is the Data Access Layer pattern and why does it matter in Next.js?"'
        intro="The interviewer wants to know if you think about security boundaries and code organization — not just whether you can query a database."
        steps={[
          "Define it: a DAL is a centralized layer (typically src/lib/data/) where all database queries live. Every function in the DAL verifies the user's session before touching the database.",
          "Explain why it matters for security: without a DAL, auth checks get sprinkled across Server Components and Actions. It is easy to add a new route and forget to add the auth check. With a DAL, auth is enforced at the data layer — you cannot fetch user data without going through a function that already validates the session.",
          "Explain why it matters for consistency: you control which fields leave the database in one place (select only the fields you need). No risk of accidentally sending a password hash or internal field to a component.",
          "Mention the server-only guard: adding import 'server-only' to DAL files causes a hard build error if a Client Component ever imports them. This is a zero-cost safety net that catches accidental exposure at build time.",
          "Close with reusability: the same getUserById() function works from a Server Component, a Server Action, and an API route handler without duplicating the query or the auth check.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Design the Database Layer for a Multi-Tenant SaaS on Vercel"
        scenario={
          <>
            You are joining a team building a project management SaaS — think a simplified
            Linear. The app is Next.js deployed to Vercel (Node.js functions, no edge). The
            database is Postgres on Neon. The product has three user roles:{" "}
            <strong>owner</strong>, <strong>member</strong>, and <strong>viewer</strong>.
            Data is strictly tenant-isolated — a user must never see another organisation&apos;s
            projects or tasks. The team will grow to 5 engineers and expects 10 000 active
            organisations within six months.
          </>
        }
        tasks={[
          "Choose an ORM and justify it for this specific stack (Vercel + Neon). Address connection pooling — what will break under real traffic without intervention and what is your fix?",
          "Sketch the Data Access Layer structure: what files would you create, what does a DAL function signature look like, and how does it enforce tenant isolation so no engineer can accidentally query across org boundaries?",
          "A payment flow must atomically: (a) create an Invoice record, (b) decrement the org's credit balance, and (c) emit a billing_event to an outbox table. Write the transaction. What can go wrong if the pooler is in session mode vs transaction mode?",
          "A new engineer adds a Middleware that reads the current org's feature flags from the database on every request. Why is this a problem and how do you fix it?",
        ]}
      />

      <SolutionReveal>
        <p>
          <strong>ORM and pooling choice:</strong> Drizzle ORM with the{" "}
          <code>@neondatabase/serverless</code> HTTP driver is the cleanest fit. Neon&apos;s
          HTTP driver has no persistent connections — each query is a round-trip HTTP call,
          which means connection exhaustion is structurally impossible for single queries.
          For transactions (the payment flow), use the WebSocket variant of the Neon driver
          with a Pool. Set the pool max to 1 per invocation. Alternatively, Drizzle +{" "}
          <code>postgres</code> driver with <code>max: 1</code> + Neon&apos;s built-in
          Supavisor-style pooler on port 6543 also works.
        </p>
        <p>
          <strong>DAL structure:</strong>
        </p>
        <pre>
          <code>{`// src/lib/data/projects.ts
import "server-only";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Every DAL function receives orgId from the session — never from user input
export async function getProjectsByOrg(orgId: string) {
  const session = await getSession();
  // Belt-and-suspenders: session.orgId must match the requested orgId
  if (!session || session.orgId !== orgId) throw new Error("Unauthorized");

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.deletedAt, null)));
}`}</code>
        </pre>
        <p>
          Tenant isolation is enforced by making <code>orgId</code> a required parameter
          sourced exclusively from the verified session — never from a URL param or request
          body. The <code>and(eq(projects.orgId, orgId), ...)</code> clause is in every query,
          making cross-tenant leaks require a deliberate override.
        </p>
        <p>
          <strong>Transaction (payment flow):</strong>
        </p>
        <pre>
          <code>{`// src/app/actions/billing.ts
"use server";
import { dbWs } from "@/lib/db"; // WebSocket pool for transactions
import { invoices, orgs, billingOutbox } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function chargeOrg(orgId: string, amountCents: number) {
  return dbWs.transaction(async (tx) => {
    const [org] = await tx
      .select({ credits: orgs.creditBalance })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .for("update"); // row lock prevents concurrent double-charges

    if (org.credits < amountCents) throw new Error("Insufficient credits");

    const [invoice] = await tx
      .insert(invoices)
      .values({ orgId, amountCents })
      .returning();

    await tx
      .update(orgs)
      .set({ creditBalance: sql\`\${orgs.creditBalance} - \${amountCents}\` })
      .where(eq(orgs.id, orgId));

    await tx.insert(billingOutbox).values({
      eventType: "billing_charged",
      payload: { orgId, invoiceId: invoice.id, amountCents },
    });

    return invoice;
  });
}`}</code>
        </pre>
        <p>
          In <strong>session-mode</strong> pooling, transactions work correctly but each
          transaction holds its connection for its full duration — you lose the pooling
          benefit. In <strong>transaction-mode</strong> pooling (PgBouncer), the connection
          returns to the pool after the transaction ends, which is what you want, but
          session-scoped features break: prepared statements, advisory locks,{" "}
          <code>SET LOCAL</code>, and <code>LISTEN/NOTIFY</code> all assume a persistent
          session. Always use <code>pgbouncer=true</code> in your URL to disable
          Prisma/Drizzle prepared statements when running through a transaction-mode pooler.
        </p>
        <p>
          <strong>Middleware database access:</strong> Middleware runs on the Edge runtime
          (V8 isolate) on every single request — including static asset requests, API calls,
          and page navigations. A database query in Middleware adds latency to every request
          globally. Fix: cache feature flags aggressively (Redis / Vercel KV) and look them
          up there, or encode them as a signed JWT in the session cookie. The database should
          be the source of truth, not the hot path.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Serverless breaks traditional connection pools.</strong> Each function
          invocation creates its own pool — under concurrent traffic you exhaust Postgres
          max_connections fast. Never use a standard ORM connection without a pooler or
          setting <code>max: 1</code> per invocation.
        </li>
        <li>
          <strong>The Prisma dev singleton is non-negotiable.</strong> Without it, HMR leaks
          a new <code>PrismaClient</code> on every save. Pin one instance to{" "}
          <code>globalThis</code> in development.
        </li>
        <li>
          <strong>Put pooling outside your function.</strong> Prisma Accelerate, PgBouncer
          (transaction mode), Neon&apos;s HTTP driver, or Supabase&apos;s Supavisor on port
          6543 — all keep a stable pool to Postgres while accepting ephemeral connections
          from your functions.
        </li>
        <li>
          <strong>Data Access Layer = auth in one place.</strong> Every DB function verifies
          the session before touching data. Add <code>import &quot;server-only&quot;</code>{" "}
          to make accidental client-side imports a build error.
        </li>
        <li>
          <strong>Edge runtime = no TCP.</strong> Middleware and edge routes cannot use
          standard Prisma or the <code>postgres</code> driver. Use Prisma Accelerate or
          Drizzle + the Neon HTTP driver for anything deployed to V8 isolates.
        </li>
        <li>
          <strong>Transaction-mode pooling breaks prepared statements.</strong> When using
          PgBouncer or Supabase&apos;s pooler, append <code>?pgbouncer=true</code> to your
          URL to disable prepared statements — they are session-scoped and incompatible with
          transaction-mode connection assignment.
        </li>
      </ul>
    </div>
  );
}
