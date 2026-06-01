import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "indexes-deep", title: "Indexes in Depth", level: 2 },
  { id: "query-plans", title: "EXPLAIN and Query Plans", level: 2 },
  { id: "isolation-levels", title: "Isolation Levels", level: 2 },
  { id: "locks-deadlocks", title: "Locks and Deadlocks", level: 2 },
  { id: "pool-tuning", title: "Connection Pool Tuning", level: 2 },
  { id: "read-replicas", title: "Read Replicas and Lag", level: 2 },
  { id: "migrations-scale", title: "Migrations at Scale", level: 2 },
];

export default function AdvancedDatabaseEngineering() {
  return (
    <div className="article-content">
      <p>
        Database depth is one of the clearest senior-level differentiators. Express services often
        fail because of slow queries, bad indexes, pool exhaustion, lock contention, or unsafe
        migrations — not because of route syntax.
      </p>

      <h2 id="indexes-deep">Indexes in Depth</h2>
      <p>
        Indexes speed reads by maintaining extra data structures, usually B-trees. They slow writes
        because every insert/update/delete may update indexes too. Good senior answers mention column
        cardinality, selectivity, composite index order, covering indexes, partial indexes, and unique
        constraints as correctness tools.
      </p>
      <pre><code>{`-- Composite index order matters
CREATE INDEX idx_orders_tenant_status_created
ON orders (tenant_id, status, created_at DESC);

-- Efficient for:
-- WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC
-- Less useful for only WHERE status = ? without tenant_id`}</code></pre>

      <h2 id="query-plans">EXPLAIN and Query Plans</h2>
      <p>
        <code>EXPLAIN ANALYZE</code> shows what the database actually did: sequential scan vs index scan,
        estimated vs actual rows, join strategy, sorting, and timing. Use it when latency increases or
        before shipping a query expected to hit large tables.
      </p>
      <pre><code>{`EXPLAIN ANALYZE
SELECT id, total, created_at
FROM orders
WHERE tenant_id = 't1' AND status = 'paid'
ORDER BY created_at DESC
LIMIT 50;`}</code></pre>

      <h2 id="isolation-levels">Isolation Levels</h2>
      <p>
        Transactions define what concurrent operations can observe. Know the tradeoffs:
      </p>
      <ul>
        <li><strong>Read committed</strong>: common default; prevents dirty reads but non-repeatable reads can occur.</li>
        <li><strong>Repeatable read</strong>: stable reads inside a transaction; phantom behavior depends on DB.</li>
        <li><strong>Serializable</strong>: strongest isolation; may abort transactions that must be retried.</li>
      </ul>

      <h2 id="locks-deadlocks">Locks and Deadlocks</h2>
      <p>
        Deadlocks happen when transactions wait on each other in a cycle. Prevent them by locking rows
        in a consistent order, keeping transactions short, avoiding user/network calls inside
        transactions, and retrying safe transactions on deadlock errors.
      </p>
      <pre><code>{`// Transfer money: lock accounts in deterministic order to reduce deadlocks
await prisma.$transaction(async (tx) => {
  const [first, second] = [fromId, toId].sort();
  await tx.$queryRaw\`SELECT id FROM accounts WHERE id = ${"${first}"} FOR UPDATE\`;
  await tx.$queryRaw\`SELECT id FROM accounts WHERE id = ${"${second}"} FOR UPDATE\`;
  // validate balance, then update both rows
});`}</code></pre>

      <h2 id="pool-tuning">Connection Pool Tuning</h2>
      <p>
        More Node pods can accidentally overload the database. Total possible DB connections equals
        pods × pool size × processes per pod. Size pools based on DB capacity and query latency, and
        monitor waiting clients, active connections, and timeout errors.
      </p>

      <h2 id="read-replicas">Read Replicas and Lag</h2>
      <p>
        Read replicas improve read scalability but introduce replication lag. Do not read immediately
        from a replica after a write when the user expects read-your-writes consistency. Route critical
        post-write reads to primary or use consistency tokens when available.
      </p>

      <h2 id="migrations-scale">Migrations at Scale</h2>
      <p>
        Avoid long locks and breaking changes. Use expand/contract migrations, backfills in batches,
        online index creation where supported, feature flags, and rollback plans. A senior engineer
        treats migrations as deployments, not just SQL files.
      </p>
    </div>
  );
}
