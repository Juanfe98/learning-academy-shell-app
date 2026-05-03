import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-numbers", title: "Why Numbers Matter in System Design", level: 2 },
  { id: "hardware-latency", title: "Hardware Latency Numbers", level: 2 },
  { id: "network-latency", title: "Network Latency Numbers", level: 2 },
  { id: "service-latency", title: "Common Service Latency Targets", level: 2 },
  { id: "back-of-envelope", title: "Back-of-Envelope Calculations", level: 2 },
  { id: "qps-estimation", title: "QPS Estimation", level: 2 },
  { id: "storage-estimation", title: "Storage Estimation", level: 2 },
  { id: "bandwidth-estimation", title: "Bandwidth Estimation", level: 2 },
  { id: "units", title: "Unit Conversions to Memorize", level: 2 },
  { id: "interview-example", title: "Interview Example: Design Twitter", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function LatencyNumbers() {
  return (
    <div className="article-content">
      <p>
        Jeff Dean&apos;s famous &quot;Numbers Every Engineer Should Know&quot; have been circulating
        since 2012 because they remain foundational to system design reasoning. If you do not know
        that an SSD read is roughly 1,000 times faster than a disk seek, you cannot make good
        storage decisions. If you do not know that a cross-region round trip takes ~150ms, you cannot
        reason about replication lag or user-perceived latency in multi-region architectures. These
        numbers are the vocabulary of infrastructure conversations.
      </p>
      <p>
        In interviews, back-of-envelope calculations serve a different but equally important
        purpose: they demonstrate that you can translate a product description into an engineering
        workload, size the infrastructure, and identify where the bottlenecks will be. You are not
        expected to produce exact numbers &mdash; you are expected to show the reasoning.
      </p>

      <h2 id="why-numbers">Why Numbers Matter in System Design</h2>
      <p>
        <strong>Analogy:</strong> A civil engineer designing a bridge knows the tensile strength of
        steel, the load-bearing capacity of concrete, and wind force estimates. They do not guess.
        A software engineer designing a distributed system needs the same fluency with their materials:
        how fast can a disk read? How much data can a single server handle? How long does a network
        round trip take?
      </p>
      <p>
        Without numbers, system design becomes hand-waving. With them, you can say: &quot;At 100k
        QPS, a single PostgreSQL instance on the largest EC2 instance tops out at roughly 50k
        reads/second on the primary &mdash; so we need read replicas or a cache at this scale.&quot;
        That is a concrete, defensible claim.
      </p>

      <h2 id="hardware-latency">Hardware Latency Numbers</h2>
      <p>
        These are approximate orders of magnitude. The exact values vary by hardware generation,
        but the relative ratios are what matter &mdash; and they are stable across decades.
      </p>
      <ArticleTable caption="Hardware Latency Numbers — memorize the orders of magnitude, not the exact values" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Latency</th>
              <th>Relative to L1 Cache</th>
              <th>Practical takeaway</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>L1 cache read</td>
              <td>~1 ns</td>
              <td>1×</td>
              <td>Fastest possible memory access</td>
            </tr>
            <tr>
              <td>L2 cache read</td>
              <td>~4 ns</td>
              <td>4×</td>
              <td>Still very fast, CPU-local</td>
            </tr>
            <tr>
              <td>L3 cache read</td>
              <td>~40 ns</td>
              <td>40×</td>
              <td>Shared across CPU cores</td>
            </tr>
            <tr>
              <td>Main memory (RAM) read</td>
              <td>~100 ns</td>
              <td>100×</td>
              <td>100× slower than L1 — still fast for software</td>
            </tr>
            <tr>
              <td>SSD random read</td>
              <td>~100 µs</td>
              <td>100,000×</td>
              <td>1,000× slower than RAM — for disk-bound workloads</td>
            </tr>
            <tr>
              <td>HDD seek + read</td>
              <td>~10 ms</td>
              <td>10,000,000×</td>
              <td>100× slower than SSD — avoid for latency-sensitive workloads</td>
            </tr>
            <tr>
              <td>Read 1MB sequentially from SSD</td>
              <td>~1 ms</td>
              <td>—</td>
              <td>Sequential reads are much faster than random</td>
            </tr>
            <tr>
              <td>Read 1MB sequentially from RAM</td>
              <td>~250 µs</td>
              <td>—</td>
              <td>Data in memory: extremely fast sequential access</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Key insight:</strong> Every layer of the storage hierarchy is ~100–1,000× slower
        than the one above it. This is why in-memory caches (Redis) are so impactful: they move
        data from the SSD/HDD tier into the RAM tier, cutting latency by 100-10,000×.
      </p>

      <h2 id="network-latency">Network Latency Numbers</h2>
      <ArticleTable caption="Network Latency Numbers — the physical constraints no software can overcome" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Network hop</th>
              <th>Round-trip latency</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Same server (localhost)</td>
              <td>~0.05 ms (50 µs)</td>
              <td>Loopback interface, essentially memory speed</td>
            </tr>
            <tr>
              <td>Same data center / AWS AZ</td>
              <td>~0.5 ms</td>
              <td>Low-latency cross-server calls; target for intra-service calls</td>
            </tr>
            <tr>
              <td>Same AWS region, different AZ</td>
              <td>~1–2 ms</td>
              <td>Multi-AZ replication lag budget</td>
            </tr>
            <tr>
              <td>US East ↔ US West</td>
              <td>~60–80 ms</td>
              <td>Speed of light across continent</td>
            </tr>
            <tr>
              <td>US ↔ Europe</td>
              <td>~80–100 ms</td>
              <td>Transatlantic fiber</td>
            </tr>
            <tr>
              <td>US ↔ Asia Pacific</td>
              <td>~150–200 ms</td>
              <td>Transpacific; significant user-perceived delay</td>
            </tr>
            <tr>
              <td>DNS resolution (uncached)</td>
              <td>~20–120 ms</td>
              <td>Varies by TTL, recursive resolver location</td>
            </tr>
            <tr>
              <td>TLS handshake (additional)</td>
              <td>~50–100 ms</td>
              <td>Added to TCP connection; HTTPS overhead</td>
            </tr>
            <tr>
              <td>Sending 1MB over network</td>
              <td>~10 ms (10 Gbps link)</td>
              <td>Bandwidth-limited, not latency-limited at this size</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Key insight:</strong> Latency is bounded by physics. Light travels at ~200km/ms in
        fiber. US to Europe is ~6,000km, so the minimum round-trip is ~60ms &mdash; no amount of
        optimization can beat this. This is why CDNs and edge caching matter: serve content from
        the region closest to the user.
      </p>

      <h2 id="service-latency">Common Service Latency Targets</h2>
      <ArticleTable caption="Common Service Latency Targets — what good looks like in practice" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Typical p99 latency target</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Redis GET/SET</td>
              <td>&lt;1 ms</td>
              <td>In-memory, extremely fast; p99 should be sub-millisecond</td>
            </tr>
            <tr>
              <td>DynamoDB GetItem</td>
              <td>&lt;5 ms</td>
              <td>AWS SLA guarantee; consistently fast at any scale</td>
            </tr>
            <tr>
              <td>PostgreSQL simple SELECT (indexed)</td>
              <td>1–10 ms</td>
              <td>Highly variable — depends on connection pool, query complexity</td>
            </tr>
            <tr>
              <td>PostgreSQL complex query (joins)</td>
              <td>10–500 ms</td>
              <td>Can be slow under load; optimize with indexes, caching</td>
            </tr>
            <tr>
              <td>S3 GetObject</td>
              <td>10–50 ms</td>
              <td>Higher than DB for first byte; use CloudFront for low latency</td>
            </tr>
            <tr>
              <td>CloudFront CDN cache hit</td>
              <td>1–5 ms</td>
              <td>Served from edge, extremely fast for cached content</td>
            </tr>
            <tr>
              <td>REST API call (same region)</td>
              <td>5–50 ms</td>
              <td>Includes network + processing; target for internal services</td>
            </tr>
            <tr>
              <td>SQS SendMessage</td>
              <td>&lt;10 ms</td>
              <td>Async fire-and-forget; very fast to enqueue</td>
            </tr>
            <tr>
              <td>Lambda cold start</td>
              <td>100 ms – 3s</td>
              <td>Highly variable; use Provisioned Concurrency to eliminate</td>
            </tr>
            <tr>
              <td>External AI provider (OpenAI, Claude)</td>
              <td>500 ms – 30s</td>
              <td>Highly variable; always move to async queue, never block a request</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="back-of-envelope">Back-of-Envelope Calculations</h2>
      <p>
        Back-of-envelope (BOE) calculations are rough estimates designed to be calculated in your
        head or on a whiteboard in 2 minutes. The goal is not precision &mdash; it is to identify
        the order of magnitude of a problem and surface the key constraints.
      </p>
      <p>
        <strong>The BOE process:</strong>
      </p>
      <ol>
        <li><strong>Estimate users:</strong> DAU (daily active users), MAU (monthly active users)</li>
        <li><strong>Estimate QPS:</strong> how many requests per second the system must handle</li>
        <li><strong>Estimate storage:</strong> how much data is created per day/month/year</li>
        <li><strong>Estimate bandwidth:</strong> how much data moves in/out per second</li>
        <li><strong>Identify the bottleneck:</strong> what is the constraint &mdash; compute, storage, bandwidth, or cost?</li>
      </ol>
      <pre><code>{`// Back-of-envelope template

// Step 1: Users
DAU = 1 million (1M)
Peak traffic ratio = 3x average (users are active at different hours)

// Step 2: QPS (Queries Per Second)
// Key insight: 1M DAU / 86,400 seconds per day ≈ 12 requests/second average
// But with peak factor:
Average QPS = 1M DAU × (avg requests per user per day) / 86,400
            = 1M × 10 requests/day / 86,400
            ≈ 116 QPS average
Peak QPS    = 116 × 3 = ~350 QPS

// Quick mental math shortcut:
// 1M DAU, 10 req/user/day → ~100 QPS average, ~300 QPS peak
// 10M DAU, 10 req/user/day → ~1,000 QPS average, ~3,000 QPS peak
// 100M DAU, 10 req/user/day → ~10,000 QPS average, ~30,000 QPS peak

// Step 3: Storage
// How much data does each user action create?
// Example: Twitter-like posts, 280 chars max
Post size = 280 bytes text + 100 bytes metadata = ~400 bytes
Users posting = 10% of DAU = 100,000/day
Storage/day = 100,000 × 400 bytes = 40 MB/day
Storage/year = 40 MB × 365 = ~15 GB/year (tiny! media is the real cost)

Media size = 200 KB average image, 30% of posts have media
Media/day = 100,000 × 0.3 × 200 KB = 6 GB/day
Media/year = 6 GB × 365 = ~2 TB/year

// Step 4: Bandwidth
Read QPS >> Write QPS (social feeds: 100:1 read/write ratio)
Response size = 10 posts × 400 bytes = 4 KB per feed request
Read bandwidth = Read QPS × Response size
             = 300 QPS × 4 KB = 1.2 MB/s ≈ 10 Mbps  // very manageable`}</code></pre>

      <h2 id="qps-estimation">QPS Estimation</h2>
      <pre><code>{`// The essential formula
Average QPS = (DAU × avg_requests_per_user_per_day) / 86,400

// Rule of thumb: 1M DAU ≈ 12 average QPS (with 10 requests/user/day)
// Multiply by peak factor (2–10x depending on use case):
// - Evenly used service (APIs, internal tools): 2-3x
// - Consumer social app (evening peak): 3-5x
// - Flash sale / ticket release: 10-50x

// Common QPS breakpoints for infrastructure decisions:
// < 100 QPS    → single DB instance usually fine
// 100-1k QPS   → add read replicas or caching
// 1k-10k QPS   → horizontal scaling, caching critical, DB partitioning consideration
// 10k-100k QPS → distributed caching, DB sharding or switch to DynamoDB
// > 100k QPS   → CDN for static content, aggressive caching, highly specialized DB

// Lambda / serverless limits:
// Default concurrent Lambda = 1,000 per region (adjustable)
// Each Lambda = 1 request at a time
// 1,000 concurrent × 50ms avg duration = 20,000 req/s theoretical max
// In practice, burst limits + cold starts cap this lower

// ECS Fargate:
// 1 task = ~100-500 QPS depending on CPU/memory and request complexity
// 10 tasks = 1k-5k QPS
// Auto-scaling handles growth, but plan capacity headroom`}</code></pre>

      <h2 id="storage-estimation">Storage Estimation</h2>
      <pre><code>{`// Storage estimation formula
Daily storage = Daily writes × Average object size

// Data type size reference:
// UUID / ID: 16 bytes
// Short text (tweet, title): 100–300 bytes
// Medium text (post, comment): 1–10 KB
// Profile metadata: 500 bytes – 2 KB
// Profile photo (compressed): 50–200 KB
// Photo (full size): 1–5 MB
// Video (1 minute, compressed): 100–500 MB
// Audio (1 minute): 1–5 MB

// Example: File-sharing service (like Dropbox)
// 100M users, 10% upload something per day = 10M daily uploads
// Average file size = 500 KB
// Daily upload storage = 10M × 500 KB = 5 TB/day
// 5-year storage = 5 TB × 365 × 5 = ~9 PB
// → This immediately tells you: you need a distributed object store (S3),
//   not a relational database. You need lifecycle policies to cold storage.

// Replication factor:
// S3 stores 3 copies in same region by default
// Cross-region replication = 2x the cost
// Factor replication into storage cost estimates

// AWS cost reference (approximate, us-east-1):
// S3 Standard:   $0.023/GB/month → 1 TB = $23/month
// S3 IA:         $0.0125/GB/month → for infrequently accessed data
// S3 Glacier:    $0.004/GB/month → for archives (minutes to hours retrieval)
// EBS gp3:       $0.08/GB/month → attached block storage for EC2/RDS`}</code></pre>

      <h2 id="bandwidth-estimation">Bandwidth Estimation</h2>
      <pre><code>{`// Bandwidth formula
Bandwidth = QPS × Average response size

// Common response sizes:
// JSON API response (small): 1–5 KB
// JSON API response (list of 20 items): 10–50 KB
// HTML page (compressed): 30–100 KB
// Image (thumbnail): 10–50 KB
// Image (full): 200 KB – 2 MB
// Video stream: 1–8 Mbps per user

// Example: Video streaming service
// 1M concurrent viewers × 2 Mbps average bitrate = 2 Tbps outbound bandwidth
// → This is why Netflix uses CDNs: distributing 2 Tbps from one origin is impossible.
//   Edge servers in hundreds of cities handle regional load.

// AWS data transfer costs (approximate):
// Outbound from EC2 to internet: $0.09/GB
// Inbound to EC2: Free
// EC2 to S3 (same region): Free
// S3 to internet (without CloudFront): $0.09/GB
// CloudFront to internet: $0.01–0.085/GB (cheaper than S3 direct for high volume)

// At 1 TB/month outbound from EC2: $90/month
// At 100 TB/month outbound via CloudFront: ~$850/month
// → For high-traffic static content, CloudFront pays for itself in reduced EC2 egress`}</code></pre>

      <h2 id="units">Unit Conversions to Memorize</h2>
      <ArticleTable caption="Unit conversions for back-of-envelope calculations" minWidth={600}>
        <table>
          <thead>
            <tr>
              <th>Conversion</th>
              <th>Value</th>
              <th>Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Seconds per day</td>
              <td>86,400 (~100K)</td>
              <td>Converting DAU to QPS</td>
            </tr>
            <tr>
              <td>Seconds per month</td>
              <td>2.6M (~3M)</td>
              <td>Monthly traffic estimates</td>
            </tr>
            <tr>
              <td>1 KB</td>
              <td>10³ bytes (1,024 bytes)</td>
              <td>Small JSON payloads</td>
            </tr>
            <tr>
              <td>1 MB</td>
              <td>10⁶ bytes (1,048,576 bytes)</td>
              <td>Images, audio clips</td>
            </tr>
            <tr>
              <td>1 GB</td>
              <td>10⁹ bytes</td>
              <td>Videos, large datasets</td>
            </tr>
            <tr>
              <td>1 TB</td>
              <td>10¹² bytes</td>
              <td>Large storage systems</td>
            </tr>
            <tr>
              <td>1 PB</td>
              <td>10¹⁵ bytes</td>
              <td>Hyperscale systems (Netflix, YouTube)</td>
            </tr>
            <tr>
              <td>1 Gbps bandwidth</td>
              <td>~125 MB/s</td>
              <td>Network throughput conversion</td>
            </tr>
            <tr>
              <td>1 ms</td>
              <td>10⁻³ seconds</td>
              <td>Network latency</td>
            </tr>
            <tr>
              <td>1 µs (microsecond)</td>
              <td>10⁻⁶ seconds</td>
              <td>Memory/SSD latency</td>
            </tr>
            <tr>
              <td>1 ns (nanosecond)</td>
              <td>10⁻⁹ seconds</td>
              <td>CPU cache latency</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-example">Interview Example: Design Twitter</h2>
      <p>
        Walk through a complete back-of-envelope estimation for a Twitter-like system:
      </p>
      <pre><code>{`// Given: Design a Twitter-like social feed system
// Users: 300M MAU, 100M DAU
// Average user: reads 10 tweets, writes 0.1 tweets per day

// Step 1: Traffic (QPS)
Write QPS = 100M DAU × 0.1 tweets/day / 86,400 s = ~120 writes/s
Read QPS  = 100M DAU × 10 reads/day / 86,400 s = ~12,000 reads/s
Peak QPS  = 12,000 × 3 = ~36,000 reads/s at peak
// → Read:Write ratio = 100:1 (heavily read-dominated)
// → This tells us: we need aggressive read caching

// Step 2: Storage
Tweet size = 280 bytes text + 100 bytes metadata = ~400 bytes
Writes/day = 120 × 86,400 = ~10M tweets/day
Storage/day = 10M × 400 bytes = ~4 GB/day of text
Storage/year = 4 GB × 365 = ~1.5 TB/year of text
// Media: assume 20% of tweets have media, average 200 KB
Media/day = 10M × 0.2 × 200 KB = 400 GB/day
// → Media storage = ~150 TB/year → S3 + lifecycle to cheaper tiers

// Step 3: Feed generation
// Fan-out on write vs fan-out on read?
// Average follower count: 200
// When a user tweets, fan out to 200 followers' feeds
// 120 tweets/s × 200 followers = 24,000 writes/s to Redis feeds
// → Fan-out on write is feasible for average users
// → Celebrities with 50M followers need fan-out on read (would be 6M writes/s)

// Step 4: Infrastructure sizing
// Read QPS = 36,000/s, response = 10 tweets × 400 bytes = ~4 KB
// Bandwidth = 36,000 × 4 KB = 144 MB/s = ~1.2 Gbps

// Redis cluster for timeline cache:
// Each user's timeline = 100 recent tweet IDs × 8 bytes = 800 bytes
// 100M users × 800 bytes = 80 GB → fits in a Redis cluster
// Cache hit rate target = 99% to keep DB load at 1% of read traffic`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Using averages for latency instead of percentiles.</strong> Average latency hides
          outliers. A p99 of 2 seconds means 1% of users wait more than 2 seconds &mdash; at 10,000
          QPS, that is 100 users/second having a bad experience. Always think in p95/p99.
        </li>
        <li>
          <strong>Forgetting peak traffic in QPS estimates.</strong> Average QPS is not the design
          target &mdash; peak QPS is. A consumer app with 100 average QPS may see 500 QPS during
          morning rush. Size for peak or ensure auto-scaling handles it.
        </li>
        <li>
          <strong>Ignoring replication in storage estimates.</strong> If you store 1 TB of data with
          S3 (3-way replication) and cross-region replication (2 regions), your actual storage cost
          is for 6 TB, not 1 TB.
        </li>
        <li>
          <strong>Confusing throughput and latency.</strong> High throughput does not mean low
          latency. Batching improves throughput but increases latency. Optimize for whichever metric
          the user actually experiences.
        </li>
        <li>
          <strong>Not using estimates to guide architectural decisions.</strong> The point of BOE
          calculation is not the number &mdash; it is what the number tells you about the design.
          36,000 read QPS tells you: cache is mandatory. 150 TB/year of media tells you: lifecycle
          policies and cold storage are necessary.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: A service has 10M DAU. Each user makes 5 requests per day. What is the average and peak QPS?</strong></p>
      <p>
        Average: 10M × 5 / 86,400 ≈ 580 QPS. With a 3x peak factor: ~1,750 QPS. This is enough
        to need horizontal scaling and a caching layer, but a single well-tuned PostgreSQL instance
        can handle this read load if most reads are cached.
      </p>

      <p><strong>Q: Why is p99 latency more important than average latency for user experience?</strong></p>
      <p>
        Average latency hides the tail. A service with average 10ms latency might have p99 of 2s
        &mdash; meaning 1 in 100 requests is extremely slow. At scale, that 1% represents thousands
        of users per second experiencing a bad product. Slow tail latency cascades in microservices:
        if you call 10 services and each has 1% p99 outlier probability, ~10% of your requests will
        be slow. Always optimize for p99 in user-facing services.
      </p>

      <p><strong>Q: How long does a network round trip take from the US to Europe?</strong></p>
      <p>
        Roughly 80&ndash;100ms round trip. This is bounded by physics &mdash; light in fiber travels
        at roughly 200km/ms, and the transatlantic distance is ~6,000km. This is why multi-region
        active-active architectures must solve for replication lag: any write in US-East will not
        reach eu-west for at least 80ms.
      </p>

      <p><strong>Q: A user uploads 100 photos per month, each 2MB. 1M users. How much storage per year?</strong></p>
      <p>
        1M users × 100 photos/month × 2 MB × 12 months = 2,400 TB per year (2.4 PB). This immediately
        tells you: lifecycle policies are essential (move to IA/Glacier after 90 days), CDN caching
        is mandatory for reads, and you need a distributed object store (S3) not a database.
      </p>
    </div>
  );
}
