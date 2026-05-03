import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "availability-math", title: "Availability Math: The Nines", level: 2 },
  { id: "reliability-vs-availability", title: "Reliability vs Availability", level: 2 },
  { id: "fault-tolerance-degradation", title: "Fault Tolerance vs Graceful Degradation", level: 2 },
  { id: "redundancy", title: "Redundancy: Eliminating Single Points of Failure", level: 2 },
  { id: "multi-az", title: "Multi-AZ: AWS Availability Zones", level: 2 },
  { id: "multi-region", title: "Multi-Region: Active-Active vs Active-Passive", level: 2 },
  { id: "health-checks-failover", title: "Health Checks and Automatic Failover", level: 2 },
  { id: "aws-examples", title: "AWS Services and Their Availability Guarantees", level: 2 },
  { id: "rto-rpo", title: "RTO vs RPO", level: 2 },
  { id: "disaster-recovery", title: "Disaster Recovery Tiers", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function ReliabilityAvailability() {
  return (
    <div className="article-content">
      <p>
        Availability is one of the most customer-visible properties of a system. Every minute of
        downtime has measurable business impact: lost revenue, damaged trust, SLA penalties. Building
        highly available systems is not magic &mdash; it follows predictable engineering patterns.
        But it requires understanding what &quot;availability&quot; actually means, doing the math on
        what different targets cost to achieve, and knowing which patterns to apply at which layer.
      </p>

      <h2 id="availability-math">Availability Math: The Nines</h2>
      <table>
        <thead>
          <tr>
            <th>Availability</th>
            <th>Downtime/year</th>
            <th>Downtime/month</th>
            <th>Downtime/week</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>99% (two nines)</td>
            <td>87.6 hours</td>
            <td>7.2 hours</td>
            <td>1.68 hours</td>
          </tr>
          <tr>
            <td>99.9% (three nines)</td>
            <td>8.76 hours</td>
            <td>43.8 minutes</td>
            <td>10.1 minutes</td>
          </tr>
          <tr>
            <td>99.95%</td>
            <td>4.38 hours</td>
            <td>21.9 minutes</td>
            <td>5 minutes</td>
          </tr>
          <tr>
            <td>99.99% (four nines)</td>
            <td>52.6 minutes</td>
            <td>4.38 minutes</td>
            <td>1.01 minutes</td>
          </tr>
          <tr>
            <td>99.999% (five nines)</td>
            <td>5.26 minutes</td>
            <td>26.3 seconds</td>
            <td>6.05 seconds</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Key insights from this table:</strong>
      </p>
      <ul>
        <li>Each additional nine roughly 10&times; reduces allowed downtime.</li>
        <li>99.99% sounds impressive but is only 52 minutes/year &mdash; not hard to exceed with monthly deployments if each deployment has 5 minutes of risk.</li>
        <li>Five nines (5.26 min/year) is extremely difficult to achieve &mdash; it means a single 6-minute outage violates your SLA for the year.</li>
      </ul>

      <p>
        <strong>Composite availability:</strong> When services depend on each other, their availabilities
        multiply. If your API (99.9%) depends on a database (99.9%), your composite availability is
        99.9% × 99.9% = 99.8%. Add a cache (99.9%) and you get 99.7%. This is why removing
        dependencies from the critical path (circuit breakers, fallbacks) improves system availability.
      </p>
      <pre>{`
System availability = product of all dependency availabilities

API: 99.9% × DB: 99.9% × Cache: 99.9% × Queue: 99.9% = 99.6%
That's 3.5 hours of downtime/year from a system that looks like four 99.9% components.

With redundant components (both must fail for outage):
Redundant DB: 1 - (1-0.999)^2 = 1 - 0.000001 = 99.9999%
Much higher than either individual instance!
`}</pre>

      <h2 id="reliability-vs-availability">Reliability vs Availability</h2>
      <p>
        These are frequently confused but are distinct concepts:
      </p>
      <ul>
        <li>
          <strong>Availability:</strong> The system is up and responding. Measured as uptime percentage.
          A system can be available (up) while returning wrong data.
        </li>
        <li>
          <strong>Reliability:</strong> The system does the right thing consistently. A system can be
          available but unreliable (correct responses only 95% of the time).
        </li>
      </ul>
      <p>
        <strong>Example:</strong> An e-commerce checkout that is always up (99.99% available) but
        occasionally charges the wrong amount (97% reliable) is highly available but unreliable.
        A payment processor that is down for maintenance for 10 minutes per month (99.9% available)
        but always charges exactly the right amount (99.9999% reliable) is slightly less available
        but highly reliable. In financial systems, reliability typically matters more than those
        last few nines of availability.
      </p>

      <h2 id="fault-tolerance-degradation">Fault Tolerance vs Graceful Degradation</h2>
      <p>
        <strong>Fault tolerance:</strong> The system continues functioning correctly when a component
        fails. Achieved through redundancy: multiple instances, standby replicas, automatic failover.
        The user should not be able to tell that a component failed.
      </p>
      <p>
        <strong>Graceful degradation:</strong> The system continues functioning with reduced
        capability when a component fails, rather than failing completely. The user gets a degraded
        experience, but the core flow still works.
      </p>
      <pre><code>{`// Graceful degradation example: recommendation service fails
async function getProductPage(productId: string) {
  const product = await db.products.findById(productId);  // critical path

  let recommendations = [];
  try {
    recommendations = await recommendationService.get(productId, { timeout: 200 });
  } catch (error) {
    // Recommendation service is down: degrade gracefully
    recommendations = await getPopularProducts();  // fallback
    // Or: recommendations = []  // empty is better than 500
  }

  return { product, recommendations };
}`}</code></pre>

      <h2 id="redundancy">Redundancy: Eliminating Single Points of Failure</h2>
      <p>
        A single point of failure (SPOF) is any component whose failure causes the entire system
        to fail. The goal of high availability architecture is to eliminate SPOFs at every layer.
      </p>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>SPOF</th>
            <th>Redundancy solution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>DNS</td>
            <td>Single name server</td>
            <td>Route 53 with multiple name servers (automatic)</td>
          </tr>
          <tr>
            <td>CDN</td>
            <td>Single edge location</td>
            <td>CloudFront distributes across hundreds of POPs (automatic)</td>
          </tr>
          <tr>
            <td>Load balancer</td>
            <td>Single ALB node</td>
            <td>ALB is managed and redundant across AZs (automatic)</td>
          </tr>
          <tr>
            <td>Application servers</td>
            <td>Single ECS task</td>
            <td>Multiple tasks across multiple AZs; auto-scaling</td>
          </tr>
          <tr>
            <td>Database</td>
            <td>Single RDS instance</td>
            <td>RDS Multi-AZ: synchronous standby in second AZ; auto-failover in &lt;60s</td>
          </tr>
          <tr>
            <td>Cache</td>
            <td>Single Redis node</td>
            <td>ElastiCache Redis with replica and automatic failover</td>
          </tr>
          <tr>
            <td>Data center</td>
            <td>Single AWS AZ</td>
            <td>Multi-AZ deployment for all critical resources</td>
          </tr>
          <tr>
            <td>Region</td>
            <td>Single AWS region</td>
            <td>Multi-region active-active or active-passive</td>
          </tr>
        </tbody>
      </table>

      <h2 id="multi-az">Multi-AZ: AWS Availability Zones</h2>
      <p>
        An Availability Zone (AZ) is one or more discrete data centers within an AWS region, each
        with redundant power, cooling, and networking. AZs in the same region are connected by
        low-latency links (~1&ndash;2ms). They are engineered to be isolated from failures in other AZs:
        separate power grids, separate network feeds, typically in different buildings or campuses.
      </p>
      <p>
        <strong>Why Multi-AZ:</strong> A single AZ failure (caused by power, cooling, or hardware
        failure) is a known production event. AWS has experienced AZ-level failures. Spreading
        resources across multiple AZs means a single-AZ failure causes no outage in your system.
      </p>
      <pre>{`
AWS Region: us-east-1
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AZ: us-east-1a       AZ: us-east-1b    AZ: us-east-1c│
│   ┌─────────────┐     ┌─────────────┐   ┌────────────┐ │
│   │ ECS Tasks   │     │ ECS Tasks   │   │ ECS Tasks  │ │
│   │ (2 tasks)   │     │ (2 tasks)   │   │(2 tasks)   │ │
│   └─────────────┘     └─────────────┘   └────────────┘ │
│   ┌─────────────┐     ┌─────────────┐                   │
│   │ RDS Primary │────►│ RDS Standby │                   │
│   │ (sync repl) │     │ (auto-failover)│                │
│   └─────────────┘     └─────────────┘                   │
│                                                         │
│   ALB: spans all AZs automatically                      │
│   (routes only to healthy AZ targets)                   │
└─────────────────────────────────────────────────────────┘

If us-east-1a fails:
- ALB stops routing to us-east-1a targets (within seconds)
- RDS failover promotes us-east-1b standby to primary (~60s)
- Traffic continues via us-east-1b and us-east-1c
`}</pre>

      <h2 id="multi-region">Multi-Region: Active-Active vs Active-Passive</h2>
      <p>
        Multi-AZ protects against a single data center failure. Multi-region protects against a
        regional failure (AWS has experienced region-level disruptions). There are two multi-region
        approaches:
      </p>
      <p>
        <strong>Active-Passive:</strong> Primary region handles all traffic. Secondary region is
        a standby that is warmed up but not serving traffic. On primary failure, DNS failover routes
        all traffic to the secondary. RTO: 5&ndash;60 minutes (depends on DNS TTL and failover steps).
        RPO: depends on replication lag.
      </p>
      <p>
        <strong>Active-Active:</strong> Both regions serve traffic simultaneously. Route 53
        latency-based routing sends users to the nearest region. Data is replicated bidirectionally.
        On one region failing, 100% of traffic goes to the remaining region. RTO: &lt;1 minute
        (DNS TTL). RPO: near-zero (synchronous or near-synchronous replication).
      </p>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Active-Passive</th>
            <th>Active-Active</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cost</td>
            <td>Low: standby region runs at minimum capacity</td>
            <td>High: full capacity in both regions</td>
          </tr>
          <tr>
            <td>Complexity</td>
            <td>Lower: data flows one direction</td>
            <td>Higher: bidirectional replication, conflict resolution</td>
          </tr>
          <tr>
            <td>Latency benefit</td>
            <td>None (only one region serves users)</td>
            <td>Yes: users routed to nearest region</td>
          </tr>
          <tr>
            <td>RTO</td>
            <td>5&ndash;60 minutes</td>
            <td>&lt;1 minute</td>
          </tr>
        </tbody>
      </table>

      <h2 id="health-checks-failover">Health Checks and Automatic Failover</h2>
      <p>
        Availability is only achieved if failures are detected and traffic is rerouted automatically.
        Health checks are the mechanism for this at every layer.
      </p>
      <ul>
        <li>
          <strong>ALB health checks:</strong> Ping your service at <code>/health</code> every 15
          seconds. If 2 consecutive checks fail, the target is marked unhealthy and removed from
          rotation. Configure the health check endpoint to return 200 only if the service is fully
          operational (can connect to database, cache, etc.).
        </li>
        <li>
          <strong>Route 53 health checks:</strong> Monitor your endpoints and change DNS responses
          on failure. Used for region-level failover. With TTL 30&ndash;60 seconds, DNS changes
          propagate within minutes.
        </li>
        <li>
          <strong>RDS Multi-AZ failover:</strong> Automatic. When the primary fails, AWS promotes
          the standby and updates the DNS endpoint. Applications using the endpoint DNS (not IP)
          automatically connect to the new primary within 1&ndash;2 minutes.
        </li>
        <li>
          <strong>ECS service health:</strong> ECS monitors task health. If a task fails, ECS
          automatically starts a replacement task.
        </li>
      </ul>
      <pre><code>{`// Health check endpoint: comprehensive check
app.get('/health', async (req, res) => {
  const checks = {
    database: 'unknown',
    cache: 'unknown',
  };

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'failed';
  }

  try {
    await redis.ping();
    checks.cache = 'ok';
  } catch (e) {
    checks.cache = 'degraded';  // cache failure = degraded, not failing
  }

  const isHealthy = checks.database === 'ok';  // DB is critical

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});`}</code></pre>

      <h2 id="aws-examples">AWS Services and Their Availability Guarantees</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>SLA</th>
            <th>What the SLA covers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>S3</td>
            <td>99.99%</td>
            <td>Data durability: 11 nines (99.999999999%)</td>
          </tr>
          <tr>
            <td>DynamoDB</td>
            <td>99.99%</td>
            <td>Single-region; 99.999% with global tables</td>
          </tr>
          <tr>
            <td>RDS Multi-AZ</td>
            <td>99.95%</td>
            <td>Automatic failover to standby; DNS updated</td>
          </tr>
          <tr>
            <td>ALB</td>
            <td>99.99%</td>
            <td>AWS-managed, multi-AZ</td>
          </tr>
          <tr>
            <td>CloudFront</td>
            <td>99.9%</td>
            <td>Edge delivery; origin failover possible</td>
          </tr>
          <tr>
            <td>Lambda</td>
            <td>99.95%</td>
            <td>Per invocation; cold starts can add latency</td>
          </tr>
          <tr>
            <td>ECS Fargate</td>
            <td>99.99%</td>
            <td>Service scheduled availability</td>
          </tr>
          <tr>
            <td>Route 53</td>
            <td>100%</td>
            <td>Only AWS service with 100% SLA</td>
          </tr>
        </tbody>
      </table>

      <h2 id="rto-rpo">RTO vs RPO</h2>
      <p>
        <strong>Recovery Time Objective (RTO):</strong> The maximum acceptable time for the system
        to be restored after a failure. &quot;We can accept being down for 30 minutes.&quot;
      </p>
      <p>
        <strong>Recovery Point Objective (RPO):</strong> The maximum acceptable data loss, expressed
        as time. &quot;We can afford to lose up to 1 hour of data.&quot;
      </p>
      <p>
        <strong>Analogy:</strong> You are saving a document. RTO = how long can you work without the
        document? RPO = how much typing can you afford to lose? If you save every 5 minutes (RPO = 5
        min) and saving takes 1 second (RTO ≈ 0), you are highly protected. If you save once a day
        (RPO = 24h) and restoring from backup takes 8 hours (RTO = 8h), you have much higher risk.
      </p>
      <table>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>RTO</th>
            <th>RPO</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Backup &amp; Restore</td>
            <td>Hours</td>
            <td>Hours</td>
            <td>Low (just backup storage)</td>
          </tr>
          <tr>
            <td>Pilot Light</td>
            <td>Minutes&ndash;Hours</td>
            <td>Minutes</td>
            <td>Low (minimal standby infra)</td>
          </tr>
          <tr>
            <td>Warm Standby</td>
            <td>Minutes</td>
            <td>Seconds&ndash;Minutes</td>
            <td>Medium (scaled-down standby)</td>
          </tr>
          <tr>
            <td>Multi-Region Active-Active</td>
            <td>Seconds</td>
            <td>Near-zero</td>
            <td>High (full capacity in both regions)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="disaster-recovery">Disaster Recovery Tiers</h2>
      <p>
        <strong>Backup and Restore:</strong> Periodic backups (daily snapshots, S3 versioning).
        On disaster: restore from backup, rebuild infrastructure, start services. Cheapest but
        highest RTO/RPO. Acceptable for dev/staging environments or non-critical data.
      </p>
      <p>
        <strong>Pilot Light:</strong> Core data infrastructure (database replicas) runs continuously.
        Application servers are turned off. On disaster: start application servers, update DNS.
        Much faster recovery than backup-restore, with relatively low cost.
      </p>
      <p>
        <strong>Warm Standby:</strong> A scaled-down version of the full system runs continuously
        in the DR region. On disaster: scale up the DR environment and redirect traffic.
        Minutes to recover; moderate cost.
      </p>
      <p>
        <strong>Multi-Site Active-Active:</strong> Full production capacity in two+ regions.
        Both regions serve traffic. On region failure: Route 53 directs all traffic to the
        surviving region. Seconds to recover; highest cost and complexity.
      </p>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Answer High-Availability Questions"
        intro="Strong availability answers tie the target to the business impact and the cost of the mitigation, instead of jumping straight to multi-region as a reflex."
        steps={[
          "Start by asking for the availability target, acceptable downtime, and whether correctness or uptime matters more for the critical flow.",
          "Eliminate single points of failure one layer at a time: entry, compute, cache, database, and region only if the requirement justifies it.",
          "Explain why Multi-AZ is usually the first major step before multi-region, because it removes common failure modes with much less complexity.",
          "Name the failover mechanism and tradeoff clearly, such as synchronous standby, DNS failover, active-passive replication, or active-active conflict handling.",
          "Close with RTO and RPO so your answer includes recovery expectations, not just topology boxes.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Single-AZ database:</strong> The most common availability mistake. An RDS instance
          in a single AZ is a SPOF. Enable Multi-AZ for all production databases. The failover takes
          1&ndash;2 minutes; without it, the failure takes hours to manually recover.
        </li>
        <li>
          <strong>Deploying all instances to one AZ:</strong> If your ECS service and ALB both run
          in us-east-1a, an AZ failure takes down your service. Always spread across at least 2 AZs.
        </li>
        <li>
          <strong>No health checks on load balancer:</strong> If a backend instance fails silently,
          the ALB continues sending it traffic. Configure health checks and ensure the health
          endpoint actually verifies dependencies.
        </li>
        <li>
          <strong>Health check that passes while the service is broken:</strong> A health endpoint
          that just returns 200 without checking database connectivity. If the DB is down, health
          checks pass but requests fail. Health checks should verify critical dependencies.
        </li>
        <li>
          <strong>Assuming managed services have 100% availability:</strong> Even RDS, DynamoDB,
          and S3 have SLAs below 100%. Design for graceful degradation when any managed service
          is temporarily unavailable.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between 99.9% and 99.99% availability?</strong></p>
      <p>
        99.9% allows 8.76 hours of downtime per year; 99.99% allows only 52.6 minutes. The difference
        is roughly 10&times; in allowed downtime. Each additional nine is also significantly harder
        and more expensive to achieve: going from 99.99% to 99.999% requires eliminating essentially
        all human-operated deployments from the failure budget. Most production applications target
        99.9% to 99.99%.
      </p>

      <p><strong>Q: What is the difference between RTO and RPO?</strong></p>
      <p>
        RTO (Recovery Time Objective) is how long the system can be down: &quot;We must be back
        online within 15 minutes of a failure.&quot; RPO (Recovery Point Objective) is how much
        data loss is acceptable: &quot;We can afford to lose at most 5 minutes of transactions.&quot;
        Together they define the disaster recovery requirements and directly drive the choice of
        DR strategy. Multi-region active-active achieves near-zero for both. Backup-and-restore
        might be RTO=hours, RPO=24 hours.
      </p>

      <p><strong>Q: How does AWS Multi-AZ work for RDS?</strong></p>
      <p>
        RDS Multi-AZ maintains a synchronous standby replica in a different AZ. Every write to
        the primary is synchronously replicated to the standby before acknowledging to the
        application. If the primary fails (hardware failure, AZ outage, or even an OS patch reboot),
        AWS automatically promotes the standby and updates the DNS endpoint for the database. The
        failover takes 60&ndash;120 seconds. Applications using the RDS endpoint (not IP) reconnect
        automatically after a brief period.
      </p>

      <p><strong>Q: How do you eliminate a single point of failure in a typical web architecture?</strong></p>
      <p>
        Layer by layer: DNS &mdash; Route 53 with health checks. CDN &mdash; CloudFront with origin
        groups. Load balancer &mdash; ALB is inherently redundant across AZs. Application servers
        &mdash; multiple ECS tasks across AZs with auto-scaling. Database &mdash; RDS Multi-AZ or
        DynamoDB (inherently multi-AZ). Cache &mdash; ElastiCache Redis with replica. Storage &mdash;
        S3 (11 nines durability, inherently distributed). Queue &mdash; SQS (managed, multi-AZ).
        Each layer needs at least N+1 redundancy (N instances to handle traffic + 1 spare for failures).
      </p>
    </div>
  );
}
