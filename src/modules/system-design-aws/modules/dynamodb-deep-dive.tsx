import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-makes-dynamodb-different", title: "What Makes DynamoDB Different", level: 2 },
  { id: "core-concepts", title: "Core Concepts: Tables, Items, Attributes", level: 2 },
  { id: "primary-keys", title: "Primary Keys: Partition Key and Sort Key", level: 2 },
  { id: "access-patterns-first", title: "Access Patterns First, Design Second", level: 2 },
  { id: "secondary-indexes", title: "GSI and LSI: Secondary Indexes", level: 2 },
  { id: "query-vs-scan", title: "Query vs Scan", level: 2 },
  { id: "hot-partitions", title: "Hot Partitions: The Cardinal Sin", level: 2 },
  { id: "capacity-modes", title: "Provisioned vs On-Demand Capacity", level: 2 },
  { id: "consistency", title: "Strong vs Eventual Consistency", level: 2 },
  { id: "streams-ttl", title: "DynamoDB Streams and TTL", level: 2 },
  { id: "single-table-design", title: "Single-Table Design", level: 2 },
  { id: "real-example", title: "Real Example: Expense-Sharing App", level: 2 },
  { id: "anti-patterns", title: "Anti-Patterns", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function DynamodbDeepDive() {
  return (
    <div className="article-content">
      <p>
        DynamoDB is one of AWS&apos;s most powerful services and one of the most misunderstood.
        Engineers who approach it like a relational database fight it constantly and produce slow,
        expensive, unmaintainable designs. Engineers who understand its data model build systems
        that scale to any load with single-digit millisecond latency and zero operational overhead.
        The mental shift required is significant, but once it clicks, DynamoDB becomes the right
        tool for a surprising number of production workloads.
      </p>

      <h2 id="what-makes-dynamodb-different">What Makes DynamoDB Different</h2>
      <ul>
        <li>
          <strong>No joins.</strong> You cannot join across tables. All related data for a query
          must come from a single read operation, which drives single-table design.
        </li>
        <li>
          <strong>Schema-flexible.</strong> Items in the same table can have different attributes.
          Only the primary key attributes are required.
        </li>
        <li>
          <strong>Horizontally scalable to any volume.</strong> DynamoDB internally partitions data
          across many servers. As your data grows, AWS automatically adds partitions. There is no
          practical storage or throughput ceiling.
        </li>
        <li>
          <strong>Single-digit millisecond latency at any scale.</strong> AWS guarantees this in
          the SLA. You do not get this from a relational database under high load.
        </li>
        <li>
          <strong>Fully managed.</strong> No servers to provision, patch, or back up. Replication
          across 3 AZs is automatic.
        </li>
        <li>
          <strong>Pricing per request.</strong> You pay for read and write capacity units, not for
          idle server time.
        </li>
      </ul>

      <h2 id="core-concepts">Core Concepts: Tables, Items, Attributes</h2>
      <pre><code>{`// DynamoDB terminology vs SQL terminology
SQL Term        DynamoDB Term
-----------     -------------
Table       →   Table
Row         →   Item
Column      →   Attribute
Primary Key →   Partition Key (+ optional Sort Key)

// An item in DynamoDB (JSON-like structure)
{
  "PK": "USER#user-123",          // Partition Key (String)
  "SK": "PROFILE",                 // Sort Key (String)
  "name": "Alice Chen",
  "email": "alice@example.com",
  "createdAt": "2024-01-15T10:00:00Z",
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}

// Another item in the SAME table (different type of entity)
{
  "PK": "USER#user-123",          // Same partition key
  "SK": "ORDER#order-456",         // Different sort key → different item type
  "orderId": "order-456",
  "total": 89.99,
  "status": "shipped",
  "items": ["item-1", "item-2"]
}
// Both items coexist in the same table — this is single-table design`}</code></pre>

      <h2 id="primary-keys">Primary Keys: Partition Key and Sort Key</h2>
      <p>
        Every item in DynamoDB must have a primary key. The primary key uniquely identifies each item.
        There are two types:
      </p>
      <p>
        <strong>Simple primary key (partition key only):</strong> A single attribute that uniquely
        identifies the item. Every item must have a different partition key value. Good for
        straightforward key-value lookups.
      </p>
      <p>
        <strong>Composite primary key (partition key + sort key):</strong> Two attributes together
        uniquely identify the item. Multiple items can share the same partition key as long as their
        sort keys differ. This is the foundation of all non-trivial DynamoDB design.
      </p>
      <pre><code>{`// Partition Key (PK) determines physical partition
// All items with the same PK are on the same partition server
// → efficient to query all items with a PK

// Sort Key (SK) determines ordering within a partition
// Items are sorted by SK within a partition
// → supports range queries: SK begins_with, between, >, <

// Example: user's orders (all on same partition, sorted by date)
PK: "USER#alice"    SK: "ORDER#2024-01-01"
PK: "USER#alice"    SK: "ORDER#2024-01-15"
PK: "USER#alice"    SK: "ORDER#2024-02-01"
PK: "USER#alice"    SK: "PROFILE"

// Query: get all of Alice's orders from January 2024
{
  KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":pk": "USER#alice",
    ":start": "ORDER#2024-01-01",
    ":end": "ORDER#2024-01-31"
  }
}
// Single efficient query → all results from one partition`}</code></pre>

      <h2 id="access-patterns-first">Access Patterns First, Design Second</h2>
      <p>
        This is the most important concept in DynamoDB design. In SQL, you design the schema first
        and then figure out how to query it using SQL&apos;s flexible query language. In DynamoDB,
        the key structure IS the query language &mdash; you can only efficiently query by partition
        key + sort key. Every access pattern you need must be expressible through some combination
        of primary keys and secondary indexes.
      </p>
      <p>
        <strong>Process:</strong>
      </p>
      <ol>
        <li>List every read/write operation your application needs</li>
        <li>For each operation, define: what is the lookup key? What filters apply? What sort order?</li>
        <li>Design your PK/SK to serve those access patterns</li>
        <li>For access patterns that do not fit PK/SK, create a Global Secondary Index (GSI)</li>
      </ol>

      <h2 id="secondary-indexes">GSI and LSI: Secondary Indexes</h2>
      <p>
        Secondary indexes let you query on attributes other than the primary key. They create an
        alternate view of your data with different PK and SK attributes.
      </p>
      <p><strong>Global Secondary Index (GSI):</strong></p>
      <ul>
        <li>Different partition key and/or sort key than the base table</li>
        <li>Can be created at any time</li>
        <li>Has its own read/write capacity</li>
        <li>Eventually consistent by default (can request strongly consistent for same-region GSIs... but it&apos;s not supported &mdash; GSIs are always eventually consistent)</li>
        <li>Up to 20 GSIs per table</li>
      </ul>
      <p><strong>Local Secondary Index (LSI):</strong></p>
      <ul>
        <li>Same partition key as base table, different sort key</li>
        <li>Must be created at table creation time (cannot add later)</li>
        <li>Shares capacity with base table</li>
        <li>Supports strongly consistent reads</li>
        <li>5GB size limit per partition key value</li>
        <li>Up to 5 LSIs per table</li>
      </ul>
      <pre><code>{`// Base table: orders
// PK: "USER#userId"  SK: "ORDER#orderId"

// GSI: query orders by status across all users
// GSI-PK: status   GSI-SK: createdAt
// Allows: "get all PENDING orders sorted by date"

// GSI: query all orders for a specific product
// GSI-PK: "PRODUCT#productId"  GSI-SK: createdAt
// Allows: "get orders containing product X"

// AWS SDK query on GSI
const result = await dynamodb.query({
  TableName: "orders",
  IndexName: "status-createdAt-index",  // GSI name
  KeyConditionExpression: "status = :s AND createdAt > :date",
  ExpressionAttributeValues: {
    ":s": "PENDING",
    ":date": "2024-01-01"
  }
});`}</code></pre>

      <h2 id="query-vs-scan">Query vs Scan</h2>
      <p>
        <strong>Query:</strong> Uses the primary key (or GSI key) to retrieve items. Reads only the
        items you need. Efficient at any scale. Always prefer Query.
      </p>
      <p>
        <strong>Scan:</strong> Reads every item in the table (or every item in a specific segment
        for parallel scans). Reads the entire table regardless of how many items you need. Very
        expensive at scale. Avoid in production code.
      </p>
      <pre><code>{`// GOOD: Query (reads only relevant items)
const result = await dynamodb.query({
  TableName: "table",
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
  ExpressionAttributeValues: {
    ":pk": "USER#alice",
    ":prefix": "ORDER#"
  }
});
// Reads only Alice's orders — O(result size)

// BAD: Scan (reads entire table)
const result = await dynamodb.scan({
  TableName: "table",
  FilterExpression: "userId = :id",
  ExpressionAttributeValues: { ":id": "alice" }
});
// Reads EVERY item in the table, then filters — O(table size)
// At 1 million items: you pay to read 1M items to get maybe 50`}</code></pre>
      <p>
        If you find yourself writing Scans, it is a signal that your table design does not support
        your access patterns. Add a GSI instead.
      </p>

      <h2 id="hot-partitions">Hot Partitions: The Cardinal Sin</h2>
      <p>
        DynamoDB distributes data across partitions by hashing the partition key. Each partition
        has a maximum throughput capacity. A hot partition occurs when a disproportionate amount
        of traffic goes to a single partition key, overwhelming that partition&apos;s capacity
        even if the total table capacity is sufficient.
      </p>
      <pre><code>{`// HOT PARTITION: using a fixed, popular value as PK
// Bad: all requests go to the same partition
{
  "PK": "GLOBAL",     // All users write here
  "SK": "COUNTER#views"
}
// 10,000 writes/second all hit "GLOBAL" partition → throttled

// HOT PARTITION: using a date as PK (sequential writes)
{
  "PK": "2024-01-15",  // All today's events go here
  "SK": "EVENT#timestamp"
}
// All writes go to today's partition → hot

// SOLUTION 1: Add a suffix to distribute across shards
const shard = Math.floor(Math.random() * 10);  // 0-9
{
  "PK": \`COUNTER#\${shard}\`,
  "SK": "views"
}
// Sum all shards when reading — now 10x the write capacity

// SOLUTION 2: Use a user ID as PK (each user has own partition)
{
  "PK": "USER#user-id-xyz",  // distributed by user
  "SK": "EVENT#2024-01-15T10:00:00Z"
}
// User writes are naturally distributed across thousands of partitions`}</code></pre>

      <h2 id="capacity-modes">Provisioned vs On-Demand Capacity</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Provisioned</th>
            <th>On-Demand</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pricing model</td>
            <td>Pay per provisioned RCU/WCU/hour</td>
            <td>Pay per actual read/write request</td>
          </tr>
          <tr>
            <td>Cost at steady traffic</td>
            <td>Lower (predictable)</td>
            <td>Higher (~6&ndash;7&times; per unit)</td>
          </tr>
          <tr>
            <td>Cost at spiky traffic</td>
            <td>Pay for peak capacity even when idle</td>
            <td>Pay only for actual usage</td>
          </tr>
          <tr>
            <td>Throttling</td>
            <td>Throttled if burst exceeds provisioned + burst capacity</td>
            <td>Never throttled (AWS handles bursts)</td>
          </tr>
          <tr>
            <td>Auto Scaling</td>
            <td>Yes (but takes minutes to scale)</td>
            <td>Instantaneous</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Predictable, steady workloads</td>
            <td>Unpredictable, spiky, new projects</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>RCU/WCU math:</strong> 1 Read Capacity Unit (RCU) = 1 strongly consistent read of
        up to 4KB per second (or 2 eventually consistent reads). 1 Write Capacity Unit (WCU) = 1
        write of up to 1KB per second. A 10KB item = 3 RCUs (10/4, rounded up) or 10 WCUs per write.
      </p>

      <h2 id="consistency">Strong vs Eventual Consistency</h2>
      <p>
        DynamoDB replicates data across 3 AZs. By default, reads are eventually consistent &mdash;
        you might read a slightly stale value (milliseconds behind). Strongly consistent reads always
        return the most recent write but cost 2&times; as many RCUs.
      </p>
      <pre><code>{`// Eventually consistent read (default) — 1 RCU per 4KB
const result = await dynamodb.getItem({
  TableName: "table",
  Key: { PK: "USER#alice", SK: "PROFILE" }
});

// Strongly consistent read — 2 RCUs per 4KB
const result = await dynamodb.getItem({
  TableName: "table",
  Key: { PK: "USER#alice", SK: "PROFILE" },
  ConsistentRead: true
});

// GSIs never support strongly consistent reads
// LSIs do (and they share base table capacity)`}</code></pre>

      <h2 id="streams-ttl">DynamoDB Streams and TTL</h2>
      <p>
        <strong>DynamoDB Streams:</strong> A changelog of all writes to a table (inserts, updates,
        deletes). Each stream record contains the old and new state of the item. You can attach a
        Lambda function to process stream records, enabling event-driven patterns: when an order
        is created, trigger an email notification.
      </p>
      <p>
        <strong>TTL (Time to Live):</strong> Automatically delete items after a specified timestamp.
        Items with a TTL attribute in the past are deleted by a background process (typically within
        48 hours). Free &mdash; no WCU consumed. Useful for: sessions, temporary data, cache entries,
        audit logs with retention windows.
      </p>
      <pre><code>{`// TTL: add expiresAt attribute (Unix timestamp)
{
  "PK": "SESSION#token-xyz",
  "SK": "SESSION",
  "userId": "alice",
  "expiresAt": 1735689600  // Unix timestamp: 2025-01-01 00:00:00 UTC
}
// DynamoDB automatically deletes this item after expiresAt

// DynamoDB Streams + Lambda: event-driven on writes
// Lambda function receives stream record:
{
  "eventName": "INSERT",
  "dynamodb": {
    "NewImage": {
      "PK": { "S": "ORDER#order-123" },
      "status": { "S": "created" },
      "userId": { "S": "USER#alice" }
    }
  }
}`}</code></pre>

      <h2 id="single-table-design">Single-Table Design</h2>
      <p>
        Single-table design is the practice of storing multiple entity types in one DynamoDB table.
        Since DynamoDB cannot join across tables, co-locating related entities in the same table
        enables efficient single-request fetches of all data needed for a view.
      </p>
      <p>
        The strategy uses generic PK/SK attribute names and prefixes (like <code>USER#</code>,
        <code>ORDER#</code>) to distinguish entity types within the same table.
      </p>
      <pre><code>{`// Single-table with multiple entity types
// Table: "app" with PK (partition key) and SK (sort key)

// User entity
{ PK: "USER#alice",  SK: "PROFILE",         name: "Alice", email: "alice@..." }

// User's orders
{ PK: "USER#alice",  SK: "ORDER#2024-01-15#order-1", total: 89.99, status: "shipped" }
{ PK: "USER#alice",  SK: "ORDER#2024-02-01#order-2", total: 34.50, status: "pending" }

// Order details
{ PK: "ORDER#order-1", SK: "DETAILS",     items: [...], shippingAddress: "..." }
{ PK: "ORDER#order-1", SK: "ITEM#sku-abc", quantity: 2, price: 44.99 }

// Access pattern: get user profile + all orders (single query!)
Query: PK = "USER#alice"
→ Returns PROFILE, ORDER#2024-01-15#order-1, ORDER#2024-02-01#order-2
→ All entities needed for "my orders" page in ONE query

// Access pattern: get order details + all items (single query!)
Query: PK = "ORDER#order-1"
→ Returns DETAILS, ITEM#sku-abc, ITEM#sku-def
→ All entities needed for "order detail" page in ONE query`}</code></pre>

      <h2 id="real-example">Real Example: Expense-Sharing App</h2>
      <p>
        Let&apos;s model an app like Splitwise where users create groups and track shared expenses.
      </p>
      <p><strong>Access patterns to support:</strong></p>
      <ol>
        <li>Get user profile</li>
        <li>Get all groups for a user</li>
        <li>Get all members of a group</li>
        <li>Get all expenses in a group (sorted by date)</li>
        <li>Get expenses where a specific user is a participant</li>
      </ol>
      <pre><code>{`// Table design: "expenses-app"
// PK: partition key | SK: sort key

// 1. User profile
{ PK: "USER#alice",    SK: "PROFILE", name: "Alice Chen", email: "alice@..." }

// 2. User-Group memberships (for access pattern: "get all groups for user")
{ PK: "USER#alice",    SK: "GROUP#grp-1",  groupName: "SF Trip",   joinedAt: "2024-01" }
{ PK: "USER#alice",    SK: "GROUP#grp-2",  groupName: "Roommates", joinedAt: "2024-03" }

// 3. Group memberships (for access pattern: "get all members of group")
{ PK: "GROUP#grp-1",  SK: "MEMBER#alice",  name: "Alice",  email: "alice@..." }
{ PK: "GROUP#grp-1",  SK: "MEMBER#bob",    name: "Bob",    email: "bob@..." }

// 4. Expenses (for access pattern: "get expenses in group, sorted by date")
{ PK: "GROUP#grp-1",  SK: "EXPENSE#2024-01-15#exp-1", description: "Hotel", total: 300, paidBy: "alice" }
{ PK: "GROUP#grp-1",  SK: "EXPENSE#2024-01-16#exp-2", description: "Dinner", total: 80,  paidBy: "bob" }

// 5. Expense splits (for access pattern: "get user's share in expense")
{ PK: "EXPENSE#exp-1", SK: "SPLIT#alice", amount: 100, settled: false }
{ PK: "EXPENSE#exp-1", SK: "SPLIT#bob",   amount: 100, settled: false }
{ PK: "EXPENSE#exp-1", SK: "SPLIT#carol", amount: 100, settled: true }

// GSI-1: "get all expenses where alice has a split" (access pattern 5)
// GSI-PK: "SPLIT#alice"  (needs attribute on splits item)
// GSI-SK: createdAt
// Add attribute: GSI1PK: "USER_EXPENSE#alice" to each split item
{ PK: "EXPENSE#exp-1", SK: "SPLIT#alice", GSI1PK: "USER_EXPENSE#alice", GSI1SK: "2024-01-15", amount: 100 }

// Query: get all expenses for Alice
GSI Query: GSI1PK = "USER_EXPENSE#alice", GSI1SK > "2024-01-01"
`}</code></pre>

      <h2 id="anti-patterns">Anti-Patterns</h2>
      <ul>
        <li>
          <strong>Using Scan in any production read path.</strong> This is almost always wrong.
          If you need it, redesign your table or add a GSI.
        </li>
        <li>
          <strong>Using DynamoDB like a relational database.</strong> Separate tables per entity type,
          then doing application-side joins by making multiple queries. You lose the single-request
          efficiency that makes DynamoDB worth it.
        </li>
        <li>
          <strong>Storing large items (&gt;400KB).</strong> DynamoDB has a 400KB item size limit.
          Store large payloads in S3 and keep only metadata and a reference in DynamoDB.
        </li>
        <li>
          <strong>Creating too many GSIs.</strong> Each GSI has its own capacity, replicates data,
          and costs money. Design your table to minimize the number of GSIs needed.
        </li>
        <li>
          <strong>Not planning for hot partitions on high-traffic items.</strong> A product viewed by
          millions daily, a user with millions of orders &mdash; plan for write distribution
          strategies.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between a partition key and a sort key in DynamoDB?</strong></p>
      <p>
        The partition key (hash key) determines which physical partition the item is stored on.
        All items with the same partition key are on the same partition and can be retrieved in a
        single Query. The sort key (range key) determines the ordering of items within a partition
        and enables range queries &mdash; you can query all items with a given partition key and a
        sort key that begins with, is between, or is greater/less than a value.
      </p>

      <p><strong>Q: What is a GSI and when would you use one?</strong></p>
      <p>
        A Global Secondary Index creates an alternate key structure for your table &mdash; a different
        partition key and optionally a different sort key &mdash; allowing you to query on attributes
        other than the primary key. You use a GSI when you have an access pattern that cannot be
        served by the primary key or by querying SK range. For example: if your table is keyed by
        user ID but you need to look up users by email, you create a GSI with email as the partition key.
      </p>

      <p><strong>Q: Why should you avoid Scans in DynamoDB?</strong></p>
      <p>
        A Scan reads every item in the table regardless of how many results you actually need. At a
        million items, you pay to read a million items even if your filter returns 10. Cost is O(table
        size), not O(result size). The correct solution is to design your table so the access pattern
        can be served by a Query or GSI Query, which reads only relevant items.
      </p>

      <p><strong>Q: What is a hot partition and how do you prevent it?</strong></p>
      <p>
        A hot partition occurs when too many requests target the same partition key, overwhelming
        that partition&apos;s read/write capacity even though the total table has sufficient capacity.
        Prevention strategies: use attributes with high cardinality (user ID, order ID) as partition
        keys; avoid sequential keys (dates, incrementing numbers); for write-heavy scenarios, add
        a random suffix and aggregate reads; for counters, use write sharding across N partition keys.
      </p>

      <p><strong>Q: What is single-table design and what problem does it solve?</strong></p>
      <p>
        Single-table design stores multiple entity types in one DynamoDB table using generic PK/SK
        attribute names and prefixes to distinguish entities. It solves the &quot;no joins&quot;
        limitation by co-locating related entities in the same partition, enabling a single Query
        to retrieve all entities needed for a view. For example, a user&apos;s profile, settings,
        and all their orders can be in one partition and retrieved in one round trip.
      </p>
    </div>
  );
}
