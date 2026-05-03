import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const capTriangleDiagram = String.raw`flowchart TD
    C["Consistency\nEvery node sees the same data\nat the same time"]
    A["Availability\nEvery request gets a response\n(not guaranteed to be latest)"]
    P["Partition Tolerance\nSystem operates despite\nnetwork partition"]

    C <-->|"CP\nPostgreSQL, ZooKeeper\nHBase, Redis Sentinel"| P
    A <-->|"AP\nDynamoDB, Cassandra\nCouchDB, DNS"| P
    C <-->|"CA\nSingle-node systems only\nImpossible in distributed systems"| A

    style C fill:#6366f1,color:#fff,stroke:#4f46e5
    style A fill:#f59e0b,color:#fff,stroke:#d97706
    style P fill:#22c55e,color:#fff,stroke:#16a34a`;

const consistencySpectrumDiagram = String.raw`flowchart LR
    subgraph STRONG["Strongest — Highest Cost"]
        LIN["Linearizability\nReads see latest write\nHighest coordination overhead"]
    end
    subgraph MEDIUM["Sequential Consistency"]
        SEQ["Sequential Consistency\nOperations appear in some\nglobal order"]
    end
    subgraph CAUSAL["Causal"]
        CAU["Causal Consistency\nCausally related ops ordered\nUnrelated can diverge"]
    end
    subgraph WEAK["Weakest — Lowest Cost"]
        EVT["Eventual Consistency\nAll replicas converge\neventually (no time bound)"]
    end
    STRONG --> MEDIUM --> CAUSAL --> WEAK`;

export const toc: TocItem[] = [
  { id: "why-cap", title: "Why CAP Theorem Matters", level: 2 },
  { id: "what-is-cap", title: "What Is CAP Theorem", level: 2 },
  { id: "partition-tolerance", title: "Partition Tolerance Is Non-Optional", level: 2 },
  { id: "cp-vs-ap", title: "CP vs AP: The Real Choice", level: 2 },
  { id: "consistency-models", title: "Consistency Models Explained", level: 2 },
  { id: "base-vs-acid", title: "BASE vs ACID", level: 2 },
  { id: "distributed-transactions", title: "Distributed Transactions", level: 2 },
  { id: "real-world-examples", title: "Real-World Database Examples", level: 2 },
  { id: "decision-framework", title: "Decision Framework", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function CapTheoremTradeoffs() {
  return (
    <div className="article-content">
      <p>
        CAP theorem is one of the most cited concepts in distributed systems and one of the most
        frequently misunderstood. Engineers repeat it as a slogan &mdash; &quot;you can only pick
        two&quot; &mdash; without being able to explain what that means in practice, what the real
        choice is (it is not Consistency vs Availability in a vacuum), or how specific databases
        position themselves on this spectrum. This module builds the correct mental model.
      </p>

      <h2 id="why-cap">Why CAP Theorem Matters</h2>
      <p>
        <strong>Analogy:</strong> Imagine a bank with two branches. A customer deposits money at
        Branch A. Seconds later, they check their balance at Branch B. In a consistent system,
        Branch B immediately shows the deposit. In an available-first system, Branch B might show
        the old balance temporarily, but it always responds. If the communication line between the
        branches is cut (a network partition), you must choose: Block Branch B until the connection
        is restored (CP &mdash; consistent but unavailable) or let Branch B respond with potentially
        stale data (AP &mdash; available but inconsistent).
      </p>
      <p>
        This is not an academic concern. Network partitions happen in production &mdash; a flaky switch,
        a misconfigured firewall, a datacenter network incident. Your database has already made this
        choice in its design. Understanding that choice helps you pick the right database for each
        use case.
      </p>

      <h2 id="what-is-cap">What Is CAP Theorem</h2>
      <p>
        Formulated by Eric Brewer in 2000 and proven by Gilbert and Lynch in 2002, CAP theorem states
        that a distributed system can provide at most two of three guarantees simultaneously:
      </p>
      <MermaidDiagram
        chart={capTriangleDiagram}
        title="CAP Theorem Triangle"
        caption="In practice, partition tolerance is non-negotiable in any distributed system. The real choice is between CP and AP."
        minHeight={380}
      />
      <ul>
        <li>
          <strong>Consistency (C):</strong> Every read receives the most recent write or an error.
          All nodes see the same data at the same time. This is not the same as ACID consistency
          &mdash; it specifically means linearizability: reads reflect the globally latest state.
        </li>
        <li>
          <strong>Availability (A):</strong> Every request receives a response (not an error), though
          the response may not contain the most recent write. The system is always operational.
        </li>
        <li>
          <strong>Partition Tolerance (P):</strong> The system continues operating even when some
          messages between nodes are dropped or delayed due to a network partition.
        </li>
      </ul>

      <h2 id="partition-tolerance">Partition Tolerance Is Non-Optional</h2>
      <p>
        Here is the key insight that most explanations gloss over: <strong>in any distributed system
        running over a real network, partition tolerance is not optional</strong>. Networks fail.
        Packets drop. Routers crash. A distributed system that stops working when any network issue
        occurs is not a useful distributed system.
      </p>
      <p>
        This means the &quot;CA&quot; option &mdash; Consistency and Availability without Partition
        Tolerance &mdash; only applies to single-node systems. A single PostgreSQL instance running
        on one server is CA: it is consistent and available, and does not have to worry about
        partitions because it has no network to partition.
      </p>
      <p>
        <strong>The real choice for distributed databases is CP vs AP</strong>:
      </p>
      <ul>
        <li>
          <strong>CP (Consistent + Partition-tolerant):</strong> When a partition occurs, the system
          refuses to respond (returns an error) rather than risk returning stale data. Availability
          is sacrificed to guarantee consistency.
        </li>
        <li>
          <strong>AP (Available + Partition-tolerant):</strong> When a partition occurs, the system
          continues to respond but may return stale data. Consistency is sacrificed to guarantee
          availability.
        </li>
      </ul>

      <h2 id="cp-vs-ap">CP vs AP: The Real Choice</h2>
      <ArticleTable caption="CP vs AP — choose based on whether your domain tolerates stale reads" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>CP (Consistent)</th>
              <th>AP (Available)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>During a partition</strong></td>
              <td>Returns error or timeout</td>
              <td>Returns potentially stale data</td>
            </tr>
            <tr>
              <td><strong>User experience (partition)</strong></td>
              <td>Service is down or degraded</td>
              <td>Service works, may show old data</td>
            </tr>
            <tr>
              <td><strong>Data guarantee</strong></td>
              <td>Never returns stale data</td>
              <td>Eventually consistent (no time bound)</td>
            </tr>
            <tr>
              <td><strong>Good for</strong></td>
              <td>Financial transactions, inventory, reservations, auth</td>
              <td>Social feeds, likes, view counts, DNS, caches</td>
            </tr>
            <tr>
              <td><strong>Bad for</strong></td>
              <td>High-availability, best-effort applications</td>
              <td>Any domain where stale reads cause real harm</td>
            </tr>
            <tr>
              <td><strong>AWS examples</strong></td>
              <td>RDS with read replicas (strong), DynamoDB strong reads</td>
              <td>DynamoDB eventual reads (default), ElastiCache</td>
            </tr>
            <tr>
              <td><strong>Database examples</strong></td>
              <td>PostgreSQL, MySQL, HBase, ZooKeeper, Redis Sentinel</td>
              <td>Cassandra, DynamoDB (eventual), CouchDB, DNS</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        <strong>Practical example:</strong> An e-commerce site has two features:
      </p>
      <ul>
        <li>
          <strong>Product inventory:</strong> &quot;3 left in stock.&quot; If two users both see
          &quot;1 left&quot; and both buy, you oversell. This needs CP &mdash; strong consistency.
          Use a SQL database with transactions.
        </li>
        <li>
          <strong>Product view count:</strong> &quot;234 people viewed this today.&quot; If the
          count is occasionally off by a few, no real harm. This is fine for AP &mdash; eventual
          consistency. Use DynamoDB or a Redis counter.
        </li>
      </ul>

      <h2 id="consistency-models">Consistency Models Explained</h2>
      <p>
        CAP consistency is binary in theory, but in practice databases offer a spectrum of consistency
        models. Understanding this spectrum helps you pick the right consistency level for each access
        pattern.
      </p>
      <MermaidDiagram
        chart={consistencySpectrumDiagram}
        title="Consistency Spectrum"
        caption="Stronger consistency = more coordination overhead = higher latency and lower availability under partition."
        minHeight={200}
      />
      <ul>
        <li>
          <strong>Linearizability (Strict Consistency):</strong> The strongest model. Every read
          reflects the latest write globally. Operations appear instantaneous from any observer&apos;s
          perspective. Requires coordination between all replicas &mdash; high latency. Used in:
          etcd, ZooKeeper, Google Spanner.
        </li>
        <li>
          <strong>Sequential Consistency:</strong> All operations appear to happen in some global
          order, but the order does not have to match real time. Slightly weaker than linearizability
          but still strong.
        </li>
        <li>
          <strong>Causal Consistency:</strong> Operations that are causally related (A happens before
          B because B depends on A) are seen in that order everywhere. Unrelated operations can be
          seen in different orders by different nodes. Used in: some NoSQL databases.
        </li>
        <li>
          <strong>Eventual Consistency:</strong> If no new updates are made, all replicas will
          eventually converge to the same value. No time bound. A replica can be arbitrarily stale
          during replication lag. Used in: DynamoDB (default), Cassandra, DNS, S3.
        </li>
      </ul>

      <h2 id="base-vs-acid">BASE vs ACID</h2>
      <p>
        ACID and BASE are not opposites &mdash; they are different design philosophies for different
        classes of systems.
      </p>
      <ArticleTable caption="ACID vs BASE — the two dominant consistency philosophies" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>ACID (Relational DBs)</th>
              <th>BASE (NoSQL / distributed DBs)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Atomicity</strong></td>
              <td>All operations in a transaction succeed or all fail</td>
              <td>Basically Available: system remains operational</td>
            </tr>
            <tr>
              <td><strong>Consistency</strong></td>
              <td>DB moves from one valid state to another (constraints enforced)</td>
              <td>Soft State: state may change without input (replication convergence)</td>
            </tr>
            <tr>
              <td><strong>Isolation</strong></td>
              <td>Concurrent transactions appear sequential</td>
              <td>Eventually Consistent: convergence over time</td>
            </tr>
            <tr>
              <td><strong>Durability</strong></td>
              <td>Committed data persists even after crash</td>
              <td>Data persists, but may require reconciliation across replicas</td>
            </tr>
            <tr>
              <td><strong>Tradeoff</strong></td>
              <td>Correctness over availability and scale</td>
              <td>Availability and scale over strict correctness</td>
            </tr>
            <tr>
              <td><strong>Use when</strong></td>
              <td>Money, inventory, reservations — correctness critical</td>
              <td>Social data, analytics, caching — scale and availability critical</td>
            </tr>
            <tr>
              <td><strong>Examples</strong></td>
              <td>PostgreSQL, MySQL, Oracle, Google Spanner</td>
              <td>Cassandra, DynamoDB, MongoDB, CouchDB</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre><code>{`// ACID transaction example (PostgreSQL)
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE user_id = 'alice';
  UPDATE accounts SET balance = balance + 100 WHERE user_id = 'bob';
COMMIT;
-- If anything fails between BEGIN and COMMIT, the entire thing rolls back.
-- Both users' balances are always correct. This is ACID atomicity.

// DynamoDB eventual consistency vs strong consistency
// Default (eventual): faster, cheaper, may return slightly stale data
const result = await dynamodb.getItem({
  TableName: 'Orders',
  Key: { PK: { S: 'ORDER#123' } }
  // ConsistentRead: false  ← default, eventual
}).promise();

// Strong read: guarantees latest data, costs 2x RCUs
const result = await dynamodb.getItem({
  TableName: 'Orders',
  Key: { PK: { S: 'ORDER#123' } },
  ConsistentRead: true  // ← guaranteed to return latest write
}).promise();

// When to use strong reads in DynamoDB:
// - After a write, immediately reading the same item and needing the new value
// - Inventory checks before fulfillment
// - Auth token validation`}</code></pre>

      <h2 id="distributed-transactions">Distributed Transactions</h2>
      <p>
        When a single business operation spans multiple services or databases, maintaining ACID
        properties is extremely difficult. You can no longer use a simple SQL transaction.
      </p>
      <p>
        <strong>Two-Phase Commit (2PC):</strong> A coordinator asks all participants if they can
        commit (Phase 1). If all say yes, the coordinator sends commit (Phase 2). If any say no,
        abort. Problems: the coordinator is a single point of failure; if the coordinator crashes
        between phases, participants are left waiting indefinitely (blocking). Rarely used in modern
        distributed systems.
      </p>
      <p>
        <strong>Saga Pattern:</strong> The modern alternative. Break the distributed transaction into
        a sequence of local transactions, each publishing an event. If any step fails, compensating
        transactions roll back completed steps.
      </p>
      <pre><code>{`// Saga pattern example: Place order across multiple services
// Each service has a local transaction + compensating transaction

// Happy path saga:
// 1. Orders service: Create order (status: PENDING)
// 2. Inventory service: Reserve items ← emits ItemsReserved event
// 3. Payment service: Charge card ← emits PaymentCharged event
// 4. Orders service: Mark order CONFIRMED

// Failure saga (payment declined):
// 1. Orders service: Create order (PENDING) ✓
// 2. Inventory service: Reserve items ✓
// 3. Payment service: Charge FAILED ← emits PaymentFailed event
// → Compensating transactions run in reverse:
// 4. Inventory service: Release reserved items (compensating tx)
// 5. Orders service: Mark order FAILED (compensating tx)

// Implementation with SQS + EventBridge:
// Each step publishes event to EventBridge on success/failure
// Orchestrator Lambda listens and drives state machine
// AWS Step Functions can manage saga orchestration natively

// Key challenges:
// - Compensating transactions must be idempotent (may run more than once)
// - Intermediate states (PENDING) must be handled gracefully
// - No isolation between sagas — concurrent sagas may interfere
// - This is eventual consistency at the business logic level`}</code></pre>

      <h2 id="real-world-examples">Real-World Database Examples</h2>
      <ArticleTable caption="How popular databases position themselves on CAP" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Database</th>
              <th>CAP position</th>
              <th>Default consistency</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PostgreSQL</strong></td>
              <td>CA (single node) / CP (with Patroni HA)</td>
              <td>Strong (ACID)</td>
              <td>Single primary; read replicas are eventually consistent by default</td>
            </tr>
            <tr>
              <td><strong>MySQL</strong></td>
              <td>CA (single node) / CP (with Group Replication)</td>
              <td>Strong (ACID)</td>
              <td>Similar to PostgreSQL; Aurora adds multi-AZ with sub-second replica lag</td>
            </tr>
            <tr>
              <td><strong>DynamoDB</strong></td>
              <td>AP (default) / CP (with ConsistentRead)</td>
              <td>Eventual</td>
              <td>Can opt into strong consistency per read at 2x cost</td>
            </tr>
            <tr>
              <td><strong>Cassandra</strong></td>
              <td>AP</td>
              <td>Eventual (tunable)</td>
              <td>Tunable consistency: QUORUM reads give strong-ish guarantees at cost of latency</td>
            </tr>
            <tr>
              <td><strong>Redis (single)</strong></td>
              <td>CA</td>
              <td>Strong (in-memory)</td>
              <td>Redis Cluster is AP; Sentinel-managed failover is CP (may block briefly)</td>
            </tr>
            <tr>
              <td><strong>Google Spanner</strong></td>
              <td>CP (global)</td>
              <td>Linearizable</td>
              <td>Uses atomic clocks (TrueTime) to achieve global linearizability — rare and expensive</td>
            </tr>
            <tr>
              <td><strong>ZooKeeper / etcd</strong></td>
              <td>CP</td>
              <td>Strong (Raft/ZAB consensus)</td>
              <td>Used for distributed coordination, config, and leader election — correctness over availability</td>
            </tr>
            <tr>
              <td><strong>DNS</strong></td>
              <td>AP</td>
              <td>Eventual (TTL-based)</td>
              <td>Classic eventual consistency — changes propagate within TTL window, never block</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="decision-framework">Decision Framework</h2>
      <p>
        Ask these questions to decide on consistency requirements:
      </p>
      <ol>
        <li>
          <strong>Can the domain tolerate stale reads?</strong> Social media likes: yes. Bank balance:
          no. Inventory count: no.
        </li>
        <li>
          <strong>What is the impact of a wrong answer?</strong> Showing a slightly old like count:
          invisible to users. Showing a wrong account balance: regulatory violation and user harm.
        </li>
        <li>
          <strong>Does the write require reading other data first?</strong> &quot;Transfer $100 from
          Alice to Bob&quot; requires reading both balances atomically. This needs ACID transactions.
          &quot;Increment view count&quot; does not.
        </li>
        <li>
          <strong>What is the read/write ratio?</strong> High-read, low-write with tolerance for
          staleness &rarr; AP with caching. High-write with correctness requirements &rarr; CP with
          conflict resolution.
        </li>
        <li>
          <strong>What scale do you need?</strong> ACID databases on a single node scale to ~50k
          QPS with effort. AP databases like DynamoDB scale to millions of QPS with no configuration.
        </li>
      </ol>

      <InterviewPlaybook
        title="Interview Approach: CAP Theorem"
        intro="Most candidates can recite CAP theorem. Senior candidates know the practical implications and can apply it to real database choices."
        steps={[
          "State that partition tolerance is not optional in distributed systems — the real choice is CP vs AP, not C vs A vs P.",
          "Explain the practical meaning: CP means the system returns errors during a partition to avoid stale data; AP means it responds with potentially stale data to remain available.",
          "Give concrete domain examples: payments and inventory need CP (correctness critical); social feeds, view counts, and caches are fine with AP (staleness tolerable).",
          "Mention that CAP is a spectrum, not binary — databases like DynamoDB let you choose per-read (eventual vs strong), and Cassandra lets you tune consistency with QUORUM reads.",
          "Connect to ACID vs BASE: ACID databases prioritize correctness (CP-leaning), BASE databases prioritize availability and scale (AP-leaning).",
          "Discuss sagas as the modern solution to distributed transactions — instead of 2PC, use compensating transactions with event-driven coordination.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Thinking CAP means &quot;pick any two.&quot;</strong> Partition tolerance is
          non-negotiable in any real distributed system. You always get P. The choice is C vs A
          under partition. Single-node systems are CA but they are not distributed.
        </li>
        <li>
          <strong>Confusing ACID Consistency with CAP Consistency.</strong> They are different things.
          ACID Consistency means the database moves from one valid state to another (constraints are
          not violated). CAP Consistency (linearizability) means all nodes see the same data at the
          same time. A database can satisfy ACID Consistency without being CAP-consistent across
          replicas.
        </li>
        <li>
          <strong>Applying CP everywhere out of fear.</strong> Eventual consistency is correct and
          appropriate for a huge proportion of production workloads. Applying strong consistency
          universally adds unnecessary latency and reduces availability for no benefit.
        </li>
        <li>
          <strong>Using 2PC for distributed transactions.</strong> Two-phase commit has a coordinator
          as a single point of failure and blocks participants if the coordinator crashes. The saga
          pattern is the practical alternative for most microservice architectures.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: Explain CAP theorem in plain English.</strong></p>
      <p>
        In a distributed system, when a network partition occurs, you must choose between two
        behaviors: either reject requests to avoid returning stale data (CP &mdash; consistent but
        temporarily unavailable), or continue serving requests with potentially stale data (AP
        &mdash; available but not guaranteed consistent). Partition tolerance is not optional in
        any real distributed system, so the practical choice is always CP vs AP.
      </p>

      <p><strong>Q: When would you choose eventual consistency over strong consistency?</strong></p>
      <p>
        When the domain tolerates stale reads without real harm. Social media likes, view counts,
        recommendation scores, DNS records, and shopping cart item counts are all fine with eventual
        consistency &mdash; users do not notice or care if the number is slightly off for a second.
        Strong consistency adds latency and reduces availability, so it should be reserved for
        domains where correctness is critical: financial transactions, inventory, user auth sessions.
      </p>

      <p><strong>Q: How does DynamoDB handle consistency?</strong></p>
      <p>
        DynamoDB is AP by default, using eventual consistency for reads, which is cheaper (1 RCU per
        4KB) and faster. It also supports strong consistency (ConsistentRead: true), which guarantees
        the latest write is returned but costs 2 RCUs per 4KB. Most production DynamoDB workloads
        use eventual consistency and design around it &mdash; for example, reading after writing uses
        the locally returned write value rather than immediately re-reading from the DB.
      </p>

      <p><strong>Q: What is the saga pattern and when do you use it?</strong></p>
      <p>
        The saga pattern is an approach to distributed transactions where a multi-step operation is
        broken into a sequence of local transactions, each publishing events. If any step fails,
        compensating transactions undo completed steps in reverse. Use it when a business operation
        spans multiple services (place order &rarr; reserve inventory &rarr; charge payment) and
        you cannot use a single ACID transaction. AWS Step Functions can orchestrate sagas natively.
      </p>
    </div>
  );
}
