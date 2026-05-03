import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const urlShortenerDiagram = String.raw`flowchart LR
    USER["User\nvisits bit.ly/abc"]
    CF["CloudFront\nEdge Cache"]
    API["API Service\nECS Fargate"]
    REDIS["Redis\nURL Cache"]
    DDB["DynamoDB\nURL Store"]

    USER --> CF
    CF -->|cache miss| API
    API --> REDIS
    REDIS -->|hit| API
    REDIS -->|miss| DDB
    DDB --> REDIS
    API -->|301 redirect| USER`;

const notificationDiagram = String.raw`flowchart TD
    API["API / Event Source\nTrigger notification"]
    EB["EventBridge\nRoute by type"]
    SQS_EMAIL["SQS\nEmail Queue"]
    SQS_PUSH["SQS\nPush Queue"]
    SQS_SMS["SQS\nSMS Queue"]
    EMAIL["Lambda\nSES Email Worker"]
    PUSH["Lambda\nAPNs/FCM Push Worker"]
    SMS["Lambda\nTwilio SMS Worker"]
    PREF["DynamoDB\nUser Preferences"]

    API --> EB
    EB --> SQS_EMAIL & SQS_PUSH & SQS_SMS
    SQS_EMAIL --> EMAIL
    SQS_PUSH --> PUSH
    SQS_SMS --> SMS
    EMAIL & PUSH & SMS --> PREF`;

const chatDiagram = String.raw`flowchart LR
    ALICE["Alice\nBrowser"]
    BOB["Bob\nBrowser"]
    WS["WebSocket API\nAPI Gateway"]
    LAMBDA["Connection Manager\nLambda"]
    DDB["DynamoDB\nMessages + Connections"]
    REDIS["Redis Pub/Sub\nFan-out"]

    ALICE -->|ws connect| WS
    BOB -->|ws connect| WS
    ALICE -->|send message| WS
    WS --> LAMBDA
    LAMBDA --> DDB
    LAMBDA --> REDIS
    REDIS -->|fan-out| LAMBDA
    LAMBDA -->|push to Bob| WS
    WS --> BOB`;

export const toc: TocItem[] = [
  { id: "how-to-use", title: "How to Use These Practice Problems", level: 2 },
  { id: "url-shortener", title: "Problem 1: URL Shortener", level: 2 },
  { id: "file-processing", title: "Problem 2: File Upload and Processing System", level: 2 },
  { id: "notification-system", title: "Problem 3: Notification System", level: 2 },
  { id: "real-time-chat", title: "Problem 4: Real-Time Chat", level: 2 },
  { id: "news-feed", title: "Problem 5: News Feed / Social Timeline", level: 2 },
  { id: "payment-workflow", title: "Problem 6: Payment Processing Workflow", level: 2 },
  { id: "group-expense", title: "Problem 7: Group Expense Splitting App", level: 2 },
  { id: "rate-limiter", title: "Problem 8: Rate Limiter Service", level: 2 },
];

export default function SystemDesignPractice() {
  return (
    <div className="article-content">
      <p>
        System design proficiency comes from repetition. Reading about the concepts is necessary
        but insufficient &mdash; you need to apply the framework to real problems under time pressure.
        This module presents eight classic system design problems with full solutions including
        requirements, API design, data model, architecture, and key tradeoffs. After each problem,
        there is a challenge: close the solution and try to reconstruct it from memory.
      </p>

      <h2 id="how-to-use">How to Use These Practice Problems</h2>
      <ol>
        <li>Read the problem statement and stop.</li>
        <li>Apply the 8-step interview framework for 15 minutes without reading the solution.</li>
        <li>Read the solution and compare your thinking.</li>
        <li>Identify which parts you missed or handled differently.</li>
        <li>In 48 hours, attempt the problem again from memory.</li>
      </ol>
      <p>
        The goal is not to memorize these specific designs &mdash; it is to internalize the pattern
        of thinking. The framework transfers to any system you will encounter.
      </p>

      <h2 id="url-shortener">Problem 1: URL Shortener</h2>
      <p>
        <strong>Problem:</strong> Design a URL shortening service like bit.ly. Users submit a long
        URL and receive a short code (e.g., <code>bit.ly/Xk3a9</code>). Clicking the short link
        redirects to the original URL.
      </p>
      <p><strong>Clarifying questions to ask:</strong></p>
      <ul>
        <li>What is the expected volume? How many links created per day? How many redirects?</li>
        <li>Should short codes be random or customizable?</li>
        <li>Should links expire?</li>
        <li>Do we need analytics (click counts, geographic data)?</li>
      </ul>
      <p><strong>Assume:</strong> 100M links, 10B redirects/month, 7-character random codes, no analytics for MVP.</p>

      <p><strong>Capacity estimation:</strong></p>
      <pre><code>{`// QPS
Write (new links): 100M / month / 30 / 86,400 ≈ 40 writes/s
Read (redirects): 10B / month / 30 / 86,400 ≈ 3,900 reads/s
Read:Write ratio = 100:1 → heavily read-dominated → caching critical

// Storage
Link record ≈ 500 bytes (short code + long URL + metadata)
100M links × 500 bytes = 50 GB total → small, fits in one DynamoDB table

// Bandwidth (redirects)
Redirect response = 200 bytes (301 response headers)
3,900 req/s × 200 bytes = 780 KB/s → negligible`}</code></pre>

      <p><strong>API design:</strong></p>
      <pre><code>{`// Create short link
POST /api/links
Request: { url: string, expiresAt?: string }
Response: { shortCode: "Xk3a9", shortUrl: "https://bit.ly/Xk3a9" }

// Redirect (note: this is a public URL, not an API endpoint)
GET /Xk3a9
Response: 301 Moved Permanently, Location: https://original-long-url.com/...

// 301 vs 302:
// 301 (permanent): browser caches the redirect, future requests skip the server
//   → Better user experience, lower server load
//   → Problem: if you update the long URL, old browsers use cached 301
// 302 (temporary): browser always hits the server
//   → Allows analytics tracking and URL updates
//   → Higher server load at scale`}</code></pre>

      <p><strong>Data model:</strong></p>
      <pre><code>{`// DynamoDB table
PK          SK      Attributes
CODE#Xk3a9  LINK    { longUrl, createdAt, expiresAt, ownerId }
USER#u-123  CODE#Xk3a9  { createdAt }  // to list user's links

// Short code generation
function generateShortCode() {
  // Base62 encoding of a random 7-character string
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * 62)]
  ).join('');
  // 62^7 = 3.5 trillion possible codes — enough for 100M links with extremely low collision probability
}

// Collision handling:
// On DynamoDB put, use ConditionExpression: attribute_not_exists(PK)
// If fails (collision), generate a new code and retry (extremely rare)`}</code></pre>

      <MermaidDiagram
        chart={urlShortenerDiagram}
        title="URL Shortener Architecture"
        caption="Redis caches hot short codes (90%+ cache hit rate). CloudFront caches redirects at the edge for viral links."
        minHeight={260}
      />

      <p><strong>Key tradeoffs:</strong></p>
      <ul>
        <li><strong>301 vs 302 redirect:</strong> 301 reduces server load via browser caching but prevents analytics. Use 302 if analytics matter.</li>
        <li><strong>Random code vs hash of URL:</strong> Random avoids hash collisions across different users shortening the same URL. Hash allows deduplication (same URL, same code) but requires handling hash collisions differently.</li>
        <li><strong>Cache TTL:</strong> Hot codes benefit from Redis caching. TTL should match link expiry. Evict on update/delete.</li>
      </ul>

      <h2 id="file-processing">Problem 2: File Upload and Processing System</h2>
      <p>
        <strong>Problem:</strong> Design a system where users upload documents (PDF, DOCX), the system
        processes them asynchronously (extract text, generate thumbnails), and users can download
        results. Think: CV parsing, document OCR, or file conversion.
      </p>
      <p><strong>Assume:</strong> 10k uploads/day, processing takes 5–30 seconds per file, max file size 50MB.</p>

      <p><strong>Architecture:</strong></p>
      <pre><code>{`// Upload flow:
// 1. Client requests presigned S3 upload URL
POST /api/files/upload-url
Request: { filename: string, contentType: string, size: number }
Response: { uploadUrl: string, fileId: string }
// uploadUrl is a presigned S3 PUT URL — client uploads directly to S3
// Your API never touches the file bytes (no bandwidth cost on your server)

// 2. Client uploads file directly to S3 using the presigned URL
PUT https://bucket.s3.amazonaws.com/... (S3 directly)
Response: 200 OK from S3

// 3. Client notifies API that upload is complete
POST /api/files/:fileId/complete
Response: { fileId, status: "processing" }
// API records status in DynamoDB and publishes to SQS

// Processing flow (async):
// SQS → Lambda worker:
// 1. Download file from S3
// 2. Extract text (or call AI provider)
// 3. Generate thumbnail
// 4. Upload processed outputs to S3
// 5. Update DynamoDB status to "ready"

// Status polling:
GET /api/files/:fileId
Response: {
  fileId, status: "uploading" | "processing" | "ready" | "failed",
  results?: { textKey: string, thumbnailKey: string }
}

// Download:
POST /api/files/:fileId/download-url
Response: { downloadUrl: string }  // presigned S3 GET URL, expires in 15 minutes`}</code></pre>

      <p><strong>Key design decisions:</strong></p>
      <ul>
        <li><strong>Presigned URL pattern:</strong> Client uploads directly to S3, server issues the URL. No file bytes flow through your API &mdash; unlimited file size, no bandwidth cost.</li>
        <li><strong>Idempotent workers:</strong> SQS may deliver the same message twice. The Lambda worker checks DynamoDB status before processing: if already &quot;ready&quot;, skip.</li>
        <li><strong>DLQ after 3 retries:</strong> If processing fails 3 times (corrupt file, AI provider timeout), move to DLQ. Alert and allow manual inspection.</li>
        <li><strong>TTL on processed files:</strong> DynamoDB TTL to delete metadata after 90 days. S3 lifecycle to move to Glacier after 30 days, delete after 90.</li>
      </ul>

      <h2 id="notification-system">Problem 3: Notification System</h2>
      <p>
        <strong>Problem:</strong> Design a notification system that sends messages to users via
        email, push notifications (iOS/Android), and SMS. Notifications are triggered by events:
        order shipped, comment received, payment processed, etc.
      </p>
      <p><strong>Assume:</strong> 100M users, 1B notifications/day, users can set per-channel preferences.</p>

      <MermaidDiagram
        chart={notificationDiagram}
        title="Notification System Architecture"
        caption="EventBridge routes by notification type. Per-channel SQS queues decouple producers from delivery workers."
        minHeight={420}
      />

      <p><strong>Key design decisions:</strong></p>
      <pre><code>{`// Notification preference check (in worker, not router):
// 1. Worker picks up message from SQS
// 2. Reads user preferences from DynamoDB (or Redis cache)
// 3. If user opted out of this channel: discard message
// 4. If user opted in: call delivery provider

// Why check preferences in the worker, not at publish time?
// → Decoupled: notification producer doesn't need to know preference details
// → Preference changes apply to all unprocessed messages in queue
// → Simpler producer code

// Rate limiting per user:
// Redis: INCR user:{userId}:notifications:{channelType}:{minute}
// If count > threshold: drop or delay notification
// Prevents a bad actor from spamming users via events

// Retry and idempotency:
// Each notification has a unique notificationId
// Worker stores notificationId in DynamoDB on first success
// On retry, check if notificationId already processed → skip (idempotent)

// Delivery providers:
// Email: AWS SES (Simple Email Service) — $0.10/1000 emails
// Push:  AWS SNS (can send to APNS/FCM) or dedicated providers (Firebase, OneSignal)
// SMS:   AWS SNS or Twilio (more reliable delivery globally)

// Dead letter queue handling:
// After 3 failures, message goes to DLQ
// Alert engineering team: specific notification type may have provider issues
// Allow replay from DLQ once the issue is resolved`}</code></pre>

      <h2 id="real-time-chat">Problem 4: Real-Time Chat</h2>
      <p>
        <strong>Problem:</strong> Design a real-time chat system. Users can create rooms, join rooms,
        and send messages that are instantly delivered to all room members. Think Slack or WhatsApp.
      </p>
      <p><strong>Assume:</strong> 50M DAU, 100k concurrent WebSocket connections, 10 active rooms per user, messages delivered within 100ms.</p>

      <MermaidDiagram
        chart={chatDiagram}
        title="Real-Time Chat Architecture"
        caption="WebSocket connections maintained per server. Redis pub/sub fans out messages to all connected servers. DynamoDB stores message history."
        minHeight={320}
      />

      <pre><code>{`// WebSocket connection management
// API Gateway WebSocket API manages connections natively
// Each connection has a unique connectionId

// Message flow:
// 1. Alice sends message:
//    Client → WebSocket API → Lambda (onMessage handler)
// 2. Lambda stores message in DynamoDB:
//    { PK: ROOM#room-123, SK: MSG#timestamp#uuid, text, sender, timestamp }
// 3. Lambda gets all active connection IDs for this room
//    (stored in DynamoDB: PK=ROOM#room-123, SK=CONN#connectionId)
// 4. Lambda calls API Gateway Management API to push message to each connection
//    (this is how you push server → client over WebSocket)

// Connection management:
// On connect ($connect): store connectionId + userId + rooms in DynamoDB
// On disconnect ($disconnect): remove connectionId from DynamoDB
// On message: handler above

// Scaling consideration:
// With 100k concurrent connections, each Lambda invocation serves one connection
// API Gateway WebSocket scales automatically — no server management needed
// DynamoDB for connection store scales automatically

// Message history (pagination):
GET /api/rooms/:roomId/messages?before=timestamp&limit=50
// Queries DynamoDB: PK=ROOM#room-123, SK begins_with MSG#, sort descending
// Cursor pagination using the timestamp SK

// Tradeoffs:
// + API Gateway WebSocket: no server management, scales to millions of connections
// - Higher cost per message than a persistent WebSocket server (ECS)
// - Lambda cold starts can cause connection delays (use Provisioned Concurrency)
// - API Gateway has 10-minute idle connection timeout (send keep-alive pings)`}</code></pre>

      <h2 id="news-feed">Problem 5: News Feed / Social Timeline</h2>
      <p>
        <strong>Problem:</strong> Design a social media feed. Users follow others and see a timeline
        of recent posts from people they follow, ordered by time.
      </p>
      <p><strong>Assume:</strong> 500M users, average 500 followers, 5% of users post per day.</p>

      <p><strong>Two approaches &mdash; fan-out on write vs fan-out on read:</strong></p>
      <pre><code>{`// APPROACH 1: Fan-out on Write (Push model)
// When Alice posts, immediately write to all her followers' feed tables
//
// Pros:
// - Feed reads are O(1): just read from pre-computed feed table
// - No computation at read time
// Cons:
// - Celebrities (10M followers) cause write amplification: 1 post = 10M writes
// - Feed updates must be consistent (what if 1 of 10M writes fails?)
//
// Implementation:
// POST /posts → API → DynamoDB (store post) → EventBridge event
// EventBridge → Lambda → get Alice's followers → batch write to feed tables
//
// DynamoDB feed table:
// PK=USER#bob-123, SK=FEED_ENTRY#timestamp#postId → { post content }
// Read Bob's feed: Query(PK=USER#bob-123, SK begins_with FEED_ENTRY#, limit=20)

// APPROACH 2: Fan-out on Read (Pull model)
// When Bob loads his feed, compute it on the fly from people he follows
//
// Pros:
// - No write amplification: celebrities' posts stored once
// Cons:
// - Reading requires merging N sorted lists (N = people Bob follows = 500)
// - Must read up to 500 timelines and merge-sort them = very slow without optimization
//
// Hybrid (used by Twitter/Instagram at scale):
// - Regular users: fan-out on write (their followers' feeds are pre-computed)
// - Celebrities (> 1M followers): fan-out on read (inject their posts at read time)
// - This limits write amplification while keeping read latency acceptable

// Cache strategy:
// Redis sorted set for each user's feed:
// ZADD feed:bob-123 <timestamp> <postId>
// ZREVRANGE feed:bob-123 0 19  → last 20 posts in user's feed
// On new post: write to Redis feeds of followers (fan-out on write to cache)
// Persist posts to DynamoDB for durability and history beyond cache`}</code></pre>

      <h2 id="payment-workflow">Problem 6: Payment Processing Workflow</h2>
      <p>
        <strong>Problem:</strong> Design the backend for processing payments in an e-commerce system.
        Users place orders, payments are charged, inventory is reserved, and orders are confirmed.
        Must handle failures gracefully and never double-charge.
      </p>
      <pre><code>{`// Payment processing — correctness critical
// Cannot use eventual consistency for money

// Core invariants:
// 1. Never charge a customer twice for the same order
// 2. Never confirm an order if payment fails
// 3. Reserve inventory before charging (or handle overselling)
// 4. Every payment attempt must be idempotent

// API design:
POST /api/orders
Request: { items: [{ productId, quantity }], paymentMethodId }
Response: { orderId, status: "pending" }
// Returns immediately; processing is async via saga

// Saga pattern for order placement:
// Step 1: Create order (status: PENDING) in DynamoDB
// Step 2: Reserve inventory in Inventory service
//   → Inventory DynamoDB: conditionally decrement stock (fail if stock < quantity)
// Step 3: Charge payment provider (Stripe, Braintree)
//   → Idempotency key: orderId (Stripe supports this natively)
// Step 4: Confirm order (status: CONFIRMED)
//
// Compensating transactions on failure:
// If Step 2 fails (out of stock): Mark order FAILED, no charge
// If Step 3 fails (payment declined): Release inventory reservation, mark FAILED
// If Step 4 fails (unlikely): Payment succeeded but order not confirmed
//   → Must reconcile: check Stripe for successful charge, confirm order

// Idempotency key (critical for payments):
// Each payment attempt has an idempotency key (typically orderId)
// If the network drops after charging but before receiving the response,
// retrying with the same idempotency key returns the same response
// without charging again. Stripe, Adyen support this natively.

// DynamoDB schema:
// PK=ORDER#order-123, SK=PAYMENT#pay-456 →
//   { status, amount, currency, idempotencyKey, chargedAt, stripeChargeId }
//
// Optimistic locking for inventory:
// UpdateItem with ConditionExpression: stock >= :requested
// If condition fails: order fails with OutOfStock error

// Observability for payments:
// Alert on: payment failure rate > 2%, refund rate spike, fraud score threshold
// Every payment attempt logged with: orderId, amount, outcome, stripeResponse`}</code></pre>

      <h2 id="group-expense">Problem 7: Group Expense Splitting App</h2>
      <p>
        <strong>Problem:</strong> Design a group expense app (like Splitwise). Users create groups,
        add expenses, assign who paid and who owes what, and the system calculates and simplifies
        debts between all members.
      </p>
      <pre><code>{`// Core data model
// DynamoDB single-table design
PK                  SK                  Attributes
GROUP#g-123         METADATA            { name, createdAt, createdBy }
GROUP#g-123         MEMBER#u-111        { joinedAt, role }
GROUP#g-123         MEMBER#u-222        { joinedAt, role }
GROUP#g-123         EXPENSE#exp-456     { amount, currency, description, paidBy, splits, createdAt }
USER#u-111          GROUP#g-123         { joinedAt }  // reverse lookup

// Expense splits stored inline:
expense.splits = [
  { userId: "u-111", amount: 33.33 },  // owes 1/3
  { userId: "u-222", amount: 33.33 },  // owes 1/3
  { userId: "u-333", amount: 33.34 },  // owes 1/3 + rounding
]
// u-111 paid the full $100, so their net = paid $100, owes $33.33 = net credit $66.67

// Balance calculation:
// For each group, compute net balance per member:
// net[userId] = sum(expense.amount for expenses where paidBy == userId)
//             - sum(split.amount for all splits where split.userId == userId)

// Debt simplification (the hard part):
// Naive: A owes B $10, A owes C $20, C owes B $5
// Simplified: A owes B $15, A owes C $20, C owes B $0 (chain)
// Algorithm: treat as graph, minimize number of transactions
// 1. Compute net balance for each person
// 2. Separate into debtors (negative) and creditors (positive)
// 3. Match largest debtor with largest creditor, settle, repeat

// When to compute balances:
// Option A: On every expense add/edit (pre-compute) → stored in DynamoDB, fast reads
// Option B: On demand when user views balance (compute at read time) → consistent
// With DynamoDB, Option B is cheap: query all expenses for group, compute in Lambda

// Settlement:
POST /api/groups/:groupId/settlements
Request: { payerId: string, receiverId: string, amount: number }
// Records the settlement, reduces debt. Does NOT process payment.
// Integration with Venmo/PayPal: link out to external payment, then record`}</code></pre>

      <h2 id="rate-limiter">Problem 8: Rate Limiter Service</h2>
      <p>
        <strong>Problem:</strong> Design a rate limiter that can be used by any API service to
        limit requests per user, IP, or API key. Should support different limits for different
        endpoints and time windows.
      </p>
      <ArticleTable caption="Rate limiting algorithms comparison" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>How it works</th>
              <th>Pros</th>
              <th>Cons</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Fixed Window</strong></td>
              <td>Count requests in fixed 1-minute windows. Reset counter at boundary.</td>
              <td>Simple to implement</td>
              <td>Allows 2x limit at window boundaries (burst at end + start of new window)</td>
            </tr>
            <tr>
              <td><strong>Sliding Window Log</strong></td>
              <td>Store timestamp of each request. Count requests in last N seconds.</td>
              <td>Very accurate</td>
              <td>High memory usage (store every timestamp)</td>
            </tr>
            <tr>
              <td><strong>Sliding Window Counter</strong></td>
              <td>Blend current + previous window counts weighted by overlap.</td>
              <td>Memory efficient, accurate enough</td>
              <td>Approximate, not exact</td>
            </tr>
            <tr>
              <td><strong>Token Bucket</strong></td>
              <td>Bucket fills with tokens at rate R. Each request consumes 1 token. Burst allowed when bucket is full.</td>
              <td>Allows controlled bursting, most flexible</td>
              <td>More complex to implement</td>
            </tr>
            <tr>
              <td><strong>Leaky Bucket</strong></td>
              <td>Queue of requests drained at fixed rate. No bursting.</td>
              <td>Smooths traffic, protects downstream services</td>
              <td>Adds latency; queue can grow under sustained load</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre><code>{`// Implementation using Redis (token bucket with sliding window counter)

// Redis data structure:
// Key: rate_limit:{userId}:{endpoint}:{windowMinute}
// Value: integer (request count)
// TTL: 2 minutes (covers current + previous window)

// Sliding window counter algorithm in Redis:
async function checkRateLimit(userId, endpoint, limit, windowSeconds) {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000));
  const prevWindowStart = windowStart - 1;

  const currentKey = \`rate:\${userId}:\${endpoint}:\${windowStart}\`;
  const prevKey = \`rate:\${userId}:\${endpoint}:\${prevWindowStart}\`;

  // Get counts from current and previous windows
  const [current, previous] = await redis.mget(currentKey, prevKey);
  const currentCount = parseInt(current || '0');
  const previousCount = parseInt(previous || '0');

  // Calculate overlap: what fraction of the previous window overlaps with "last N seconds"
  const elapsedInWindow = (now % (windowSeconds * 1000)) / (windowSeconds * 1000);
  const weightedCount = Math.floor(previousCount * (1 - elapsedInWindow)) + currentCount;

  if (weightedCount >= limit) {
    return { allowed: false, remaining: 0, resetAt: (windowStart + 1) * windowSeconds * 1000 };
  }

  // Increment current window count
  const pipeline = redis.pipeline();
  pipeline.incr(currentKey);
  pipeline.expire(currentKey, windowSeconds * 2);
  await pipeline.exec();

  return { allowed: true, remaining: limit - weightedCount - 1 };
}

// Where to enforce rate limits:
// Option A: In your API service (middleware) → simple, no network hop
// Option B: In API Gateway (built-in usage plans) → no code to write
// Option C: In a dedicated rate limiter service → reusable across all services

// Headers to return with every response:
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 42
// X-RateLimit-Reset: 1699900800 (Unix timestamp when limit resets)
// Retry-After: 30 (seconds until retry, only on 429 responses)

// Distributed rate limiting across multiple API servers:
// All servers share a Redis cluster → counts are globally consistent
// Atomicity: use Redis INCR which is atomic — no race conditions`}</code></pre>
    </div>
  );
}
