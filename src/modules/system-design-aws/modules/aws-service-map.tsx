import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const awsOverviewDiagram = String.raw`flowchart TD
    USER["Users\nBrowser or Mobile"]

    subgraph ENTRY["Traffic Entry"]
        R53["Route 53\nDNS"]
        CF["CloudFront\nCDN"]
        WAF["AWS WAF"]
        ALB["ALB / NLB\nLoad Balancer"]
        APIGW["API Gateway"]
    end

    subgraph COMPUTE["Compute"]
        ECS["ECS Fargate\nContainers"]
        LAMBDA["Lambda\nServerless"]
        EC2["EC2\nVMs"]
    end

    subgraph DATA["Data"]
        DDB["DynamoDB\nNoSQL"]
        RDS["RDS Aurora\nRelational"]
        EC["ElastiCache\nRedis Cache"]
        S3["S3\nObject Storage"]
    end

    subgraph ASYNC["Async"]
        SQS["SQS\nQueue"]
        SNS["SNS\nPub Sub"]
        EB["EventBridge\nEvent Bus"]
    end

    subgraph SECURITY["Security"]
        IAM["IAM\nAccess Control"]
        COG["Cognito\nAuth"]
        KMS["KMS\nEncryption"]
        SM["Secrets Manager"]
    end

    subgraph OBS["Observability"]
        CW["CloudWatch\nLogs and Metrics"]
        CT["CloudTrail\nAudit"]
        XR["X-Ray\nTracing"]
    end

    USER --> R53 --> CF --> WAF --> ALB & APIGW
    ALB --> ECS & EC2
    APIGW --> LAMBDA
    ECS & LAMBDA & EC2 --> DDB & RDS & EC & S3
    ECS & LAMBDA --> SQS & SNS & EB
    IAM -.-> COMPUTE & DATA & ASYNC
    CW -.-> COMPUTE & DATA`;

export const toc: TocItem[] = [
  { id: "overview", title: "The AWS Service Landscape", level: 2 },
  { id: "compute", title: "Compute: EC2, Lambda, ECS, EKS", level: 2 },
  { id: "networking", title: "Networking: VPC, Route 53, CloudFront, ALB, API Gateway", level: 2 },
  { id: "storage", title: "Storage: S3, EBS, EFS", level: 2 },
  { id: "databases", title: "Databases: RDS, Aurora, DynamoDB, ElastiCache, OpenSearch", level: 2 },
  { id: "messaging", title: "Messaging: SQS, SNS, EventBridge, Kinesis", level: 2 },
  { id: "security", title: "Security: IAM, Cognito, KMS, Secrets Manager, WAF", level: 2 },
  { id: "observability", title: "Observability: CloudWatch, CloudTrail, X-Ray", level: 2 },
  { id: "devops", title: "DevOps: ECR, CodePipeline, CloudFormation, CDK", level: 2 },
  { id: "decision-matrix", title: "Service Decision Matrix", level: 2 },
  { id: "common-wrong-choices", title: "Common Wrong Service Choices", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function AwsServiceMap() {
  return (
    <div className="article-content">
      <p>
        AWS has over 200 services. The good news: for system design at the senior level, you need
        deep fluency with roughly 25–30 core services and awareness of another 20. This module maps
        those services by category, explains what problem each solves, and &mdash; critically &mdash;
        tells you when <em>not</em> to use each one. Knowing when to reach for a service and when to
        reach for a simpler alternative is what separates a senior engineer from someone who just
        memorized service names.
      </p>

      <MermaidDiagram
        chart={awsOverviewDiagram}
        title="AWS Services by Architecture Layer"
        caption="A complete web application on AWS. Traffic entry → Compute → Data → Async → Security and Observability wrap everything."
        minHeight={580}
      />

      <h2 id="overview">The AWS Service Landscape</h2>
      <p>
        Think of AWS services in layers. A user request enters through the Traffic Entry layer,
        reaches Compute, which reads and writes Data, hands off slow work to Async services, and
        everything is wrapped by Security and Observability. Every architecture decision is about
        choosing the right service at each layer.
      </p>

      <h2 id="compute">Compute: EC2, Lambda, ECS, EKS</h2>
      <ArticleTable caption="Compute services — match compute type to your workload characteristics" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it is</th>
              <th>Best for</th>
              <th>Not for</th>
              <th>Pricing model</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>EC2</strong></td>
              <td>Virtual machine in AWS. Full OS control.</td>
              <td>Stateful workloads, legacy apps, deep OS-level control, GPU workloads, self-managed databases</td>
              <td>Simple APIs, event-driven work — overkill and expensive for these</td>
              <td>Per hour, per instance type</td>
            </tr>
            <tr>
              <td><strong>Lambda</strong></td>
              <td>Serverless functions. AWS manages all infrastructure. Maximum 15 min runtime.</td>
              <td>Event-driven handlers (S3, SQS, API Gateway), lightweight APIs, scheduled jobs, file processing workers</td>
              <td>Long-running processes (&gt;15 min), latency-sensitive work (cold starts), persistent connections (WebSockets, DB pools)</td>
              <td>Per request + duration (ms)</td>
            </tr>
            <tr>
              <td><strong>ECS Fargate</strong></td>
              <td>Run containers without managing servers. AWS provisions compute automatically.</td>
              <td>Long-running APIs, microservices, background workers that need persistent connections, any containerized workload</td>
              <td>Short-lived event handlers (Lambda is cheaper), Kubernetes-specific tooling requirements</td>
              <td>Per vCPU + memory, per second</td>
            </tr>
            <tr>
              <td><strong>ECS EC2</strong></td>
              <td>Run containers on EC2 instances you manage.</td>
              <td>When you need specific EC2 instance types (GPU, memory-optimized), cost-sensitive at high scale</td>
              <td>Most teams — Fargate removes operational burden for modest cost premium</td>
              <td>EC2 pricing + ECS overhead</td>
            </tr>
            <tr>
              <td><strong>EKS</strong></td>
              <td>Managed Kubernetes. AWS manages the control plane.</td>
              <td>Teams with existing Kubernetes expertise, multi-cloud portability needs, complex networking, service mesh</td>
              <td>Small teams without Kubernetes expertise — operational burden is significant vs ECS</td>
              <td>$0.10/hour for control plane + EC2/Fargate for nodes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Decision guide:</strong> Start with Lambda if the workload is event-driven and
        short-lived. Use ECS Fargate if you need a persistent, always-on service. Only reach for
        EKS if you have strong Kubernetes expertise or multi-cloud requirements. EC2 directly is
        rarely the right choice for new services.
      </p>

      <h2 id="networking">Networking: VPC, Route 53, CloudFront, ALB, API Gateway</h2>
      <ArticleTable caption="Networking services — understand the traffic path from user to backend" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Layer</th>
              <th>What it does</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>VPC</strong></td>
              <td>Network</td>
              <td>Your private network in AWS. Isolates resources from the public internet. Controls subnets, routing, and security.</td>
              <td>Every production deployment. Always create a VPC — never use the default VPC in production.</td>
            </tr>
            <tr>
              <td><strong>Route 53</strong></td>
              <td>DNS</td>
              <td>AWS DNS service. Routes users to your infrastructure. Supports health checks, failover routing, latency-based routing, weighted routing.</td>
              <td>Always. Routes domain → CloudFront or ALB. Enables multi-region failover via health checks.</td>
            </tr>
            <tr>
              <td><strong>CloudFront</strong></td>
              <td>CDN / Edge</td>
              <td>Global CDN. Caches content at 400+ edge locations. Handles TLS termination, HTTP/2, compression, and WAF integration.</td>
              <td>Any public-facing content: static assets, SPA frontends, large file downloads, API responses that can be cached.</td>
            </tr>
            <tr>
              <td><strong>AWS WAF</strong></td>
              <td>Security / Edge</td>
              <td>Web Application Firewall. Blocks malicious requests, SQL injection, XSS, bot traffic, and enforces rate limits.</td>
              <td>Any public API or web application. Attach to CloudFront or ALB.</td>
            </tr>
            <tr>
              <td><strong>ALB (Application Load Balancer)</strong></td>
              <td>Load Balancer L7</td>
              <td>Distributes HTTP/HTTPS traffic to multiple targets. Supports path-based routing, host-based routing, WebSockets, and sticky sessions.</td>
              <td>HTTP APIs, microservices routing, WebSocket applications. Primary entry point for ECS services.</td>
            </tr>
            <tr>
              <td><strong>NLB (Network Load Balancer)</strong></td>
              <td>Load Balancer L4</td>
              <td>TCP/UDP load balancer. Ultra-low latency (&lt;1ms). Preserves client IP. Can handle millions of RPS.</td>
              <td>When ultra-low latency is required, TCP pass-through, non-HTTP protocols (gaming, IoT, gRPC at scale).</td>
            </tr>
            <tr>
              <td><strong>API Gateway</strong></td>
              <td>API management</td>
              <td>Fully managed API layer. Routes requests to Lambda, HTTP backends, or AWS services. Handles auth, throttling, and caching.</td>
              <td>Lambda-backed APIs, REST or WebSocket APIs with built-in throttling, usage plans, and API keys. Low-to-medium traffic serverless APIs.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>ALB vs API Gateway:</strong> Use ALB for ECS-backed APIs &mdash; it is cheaper at
        high volume and more flexible. Use API Gateway for Lambda-backed APIs &mdash; it handles
        Lambda integration natively and provides throttling and usage plans out of the box.
      </p>

      <h2 id="storage">Storage: S3, EBS, EFS</h2>
      <ArticleTable caption="Storage services — object, block, and file storage have different use cases" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th>
              <th>Access pattern</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>S3</strong></td>
              <td>Object storage</td>
              <td>HTTP GET/PUT per object. Not a filesystem.</td>
              <td>File uploads, images, PDFs, video, backups, static assets, data lake. Unlimited scale, 11 nines durability.</td>
            </tr>
            <tr>
              <td><strong>EBS (Elastic Block Store)</strong></td>
              <td>Block storage</td>
              <td>Attached to a single EC2 instance like a hard drive.</td>
              <td>EC2 root volumes, database data directories (RDS uses EBS under the hood), any workload needing a local disk.</td>
            </tr>
            <tr>
              <td><strong>EFS (Elastic File System)</strong></td>
              <td>File storage (NFS)</td>
              <td>Network filesystem. Multiple EC2 instances can mount it simultaneously.</td>
              <td>Shared content between multiple containers/instances (CMS uploads, shared config), machine learning training data.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Most new systems use S3</strong> for file storage &mdash; it is infinitely scalable,
        durable, cheap, and works well with CloudFront. EBS is for block storage attached to a server.
        EFS is for when multiple servers need to share the same filesystem (uncommon in container architectures).
      </p>

      <h2 id="databases">Databases: RDS, Aurora, DynamoDB, ElastiCache, OpenSearch</h2>
      <ArticleTable caption="Database services — pick based on data model, access patterns, and scale" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th>
              <th>Best for</th>
              <th>Scaling model</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>RDS PostgreSQL/MySQL</strong></td>
              <td>Relational SQL</td>
              <td>Complex queries, joins, ACID transactions. Financial data, inventory, user records with relationships.</td>
              <td>Vertical (larger instance) + read replicas. Single primary. Hard ceiling around 100k QPS with caching.</td>
            </tr>
            <tr>
              <td><strong>Aurora</strong></td>
              <td>Relational SQL (AWS-native)</td>
              <td>Same as RDS but higher performance. Aurora Serverless v2 auto-scales. Up to 15 read replicas with &lt;10ms lag.</td>
              <td>Better than RDS for read-heavy workloads. Aurora Serverless scales to zero (good for dev environments).</td>
            </tr>
            <tr>
              <td><strong>DynamoDB</strong></td>
              <td>Key-value / NoSQL</td>
              <td>High-throughput key-value access, serverless apps, session storage, gaming leaderboards, IoT data. Infinite horizontal scale.</td>
              <td>Fully automatic horizontal partitioning. No ceiling. Single-digit ms at any QPS.</td>
            </tr>
            <tr>
              <td><strong>ElastiCache (Redis)</strong></td>
              <td>In-memory cache</td>
              <td>Session storage, leaderboards, real-time counters, pub/sub, caching DB query results. Sub-millisecond reads.</td>
              <td>Cluster mode for horizontal scale. Redis is not durable by default — data can be lost on restart.</td>
            </tr>
            <tr>
              <td><strong>OpenSearch</strong></td>
              <td>Full-text search</td>
              <td>Full-text search, log analytics, complex filtering and aggregations. Not a primary database.</td>
              <td>Horizontal sharding. Typically written to via DynamoDB Streams or a pipeline — not directly from the application.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="messaging">Messaging: SQS, SNS, EventBridge, Kinesis</h2>
      <ArticleTable caption="Messaging and event services — decouple producers from consumers" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Model</th>
              <th>Best for</th>
              <th>Key limits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>SQS</strong></td>
              <td>Queue (1 consumer)</td>
              <td>Background job processing, task queues, decoupling services, rate limiting downstream. DLQ support built-in.</td>
              <td>Standard: no ordering guarantee, at-least-once delivery. FIFO: ordered, exactly-once, 300 TPS limit.</td>
            </tr>
            <tr>
              <td><strong>SNS</strong></td>
              <td>Pub/Sub (many consumers)</td>
              <td>Fan-out to multiple queues, email/SMS notifications, triggering multiple downstream services from one event.</td>
              <td>Not durable — messages not delivered if subscriber is down at time of publish. Use SNS → SQS for durability.</td>
            </tr>
            <tr>
              <td><strong>EventBridge</strong></td>
              <td>Event bus / routing</td>
              <td>Event-driven architectures, routing events from AWS services, cross-account event delivery, scheduled rules (cron).</td>
              <td>Max event size 256 KB. Higher-level than SQS — events have schemas and rules, not just messages.</td>
            </tr>
            <tr>
              <td><strong>Kinesis Data Streams</strong></td>
              <td>Streaming (ordered log)</td>
              <td>Real-time data pipelines, clickstream analytics, log aggregation, IoT data. Multiple consumers can read the same stream independently.</td>
              <td>Ordered within a shard. Data retained 24 hours (default) to 7 days. More complex than SQS to operate.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Decision guide:</strong> Use SQS for background job queues (one consumer). Use SNS
        to fan out to multiple SQS queues. Use EventBridge for event routing and AWS service integration.
        Use Kinesis when you need ordered, real-time streaming with multiple independent readers.
      </p>

      <h2 id="security">Security: IAM, Cognito, KMS, Secrets Manager, WAF</h2>
      <ArticleTable caption="Security services — defense in depth across identity, encryption, and access" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it does</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>IAM</strong></td>
              <td>Controls who (users, services, roles) can do what to which AWS resources. The foundation of AWS security.</td>
              <td>Always. Every ECS task, Lambda, and EC2 should have an IAM role with least-privilege permissions. Never use root credentials.</td>
            </tr>
            <tr>
              <td><strong>Cognito User Pools</strong></td>
              <td>Managed user authentication. Sign up, sign in, MFA, social login (Google, Apple), JWT issuance.</td>
              <td>Any application needing user accounts. Replaces building auth from scratch. Pairs with API Gateway for JWT validation.</td>
            </tr>
            <tr>
              <td><strong>Cognito Identity Pools</strong></td>
              <td>Grants temporary AWS credentials to authenticated users, enabling direct access to AWS services (S3, DynamoDB) from the browser or mobile.</td>
              <td>When frontend needs to upload directly to S3 or access DynamoDB without an API layer. Less common — presigned URLs often simpler.</td>
            </tr>
            <tr>
              <td><strong>KMS</strong></td>
              <td>Key Management Service. Creates and manages encryption keys. Used for envelope encryption: KMS encrypts the data key, data key encrypts the data.</td>
              <td>Encryption of S3 objects, RDS, DynamoDB, Secrets Manager, and EBS. Use customer-managed keys (CMK) when you need key rotation control or audit.</td>
            </tr>
            <tr>
              <td><strong>Secrets Manager</strong></td>
              <td>Secure storage and rotation of secrets: API keys, database passwords, OAuth tokens. Automatic rotation for RDS credentials.</td>
              <td>Any secret that a service needs at runtime. Lambda and ECS tasks retrieve secrets at startup. Never hardcode credentials or put them in environment variables directly.</td>
            </tr>
            <tr>
              <td><strong>WAF</strong></td>
              <td>Web Application Firewall. Blocks SQL injection, XSS, bad bots, and rate limits based on IP, geo, or request attributes.</td>
              <td>Any public API or web application. Attach to CloudFront (for global protection) or ALB (for regional).</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="observability">Observability: CloudWatch, CloudTrail, X-Ray</h2>
      <ArticleTable caption="Observability services — logs, metrics, traces, and audit" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it gives you</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CloudWatch Logs</strong></td>
              <td>Centralized log storage. Ingest, store, search, and alert on application and AWS service logs.</td>
              <td>Default log destination for ECS (awslogs driver), Lambda, API Gateway. Use Log Insights for querying.</td>
            </tr>
            <tr>
              <td><strong>CloudWatch Metrics</strong></td>
              <td>Time-series metrics from AWS services and custom app metrics. Dashboards and alarms.</td>
              <td>Always. Set alarms on error rate, latency, CPU, memory. Custom metrics for business KPIs (CV parse failures, export latency).</td>
            </tr>
            <tr>
              <td><strong>CloudWatch Alarms</strong></td>
              <td>Triggers actions (SNS notification, auto-scaling, Lambda) when a metric breaches a threshold.</td>
              <td>On-call alerts: error rate &gt; 1%, latency p99 &gt; 500ms, DLQ depth &gt; 0.</td>
            </tr>
            <tr>
              <td><strong>CloudTrail</strong></td>
              <td>API audit log. Records every AWS API call: who called what, when, from where.</td>
              <td>Compliance, security incident investigation, detecting unauthorized access. Enable in every account.</td>
            </tr>
            <tr>
              <td><strong>X-Ray</strong></td>
              <td>Distributed tracing. Traces requests across Lambda, ECS, API Gateway, and DynamoDB. Generates service maps.</td>
              <td>Debugging latency across microservices. Identifying where time is spent in a slow request path.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="devops">DevOps: ECR, CodePipeline, CloudFormation, CDK</h2>
      <ArticleTable caption="DevOps services — build, package, and deploy infrastructure and applications" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it does</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ECR (Elastic Container Registry)</strong></td>
              <td>Private Docker container registry. Store, version, and scan container images.</td>
              <td>Always use ECR for storing Docker images used by ECS or Lambda. Integrated with IAM for access control.</td>
            </tr>
            <tr>
              <td><strong>CodePipeline</strong></td>
              <td>AWS-native CI/CD pipeline. Connects CodeCommit/GitHub → CodeBuild → CodeDeploy → ECS/Lambda.</td>
              <td>Teams staying fully in the AWS ecosystem. GitHub Actions is often simpler and more portable for teams already using GitHub.</td>
            </tr>
            <tr>
              <td><strong>CloudFormation</strong></td>
              <td>AWS-native IaC. Define infrastructure in YAML/JSON templates. AWS manages state.</td>
              <td>Teams preferring AWS-native tooling or deploying via CDK (CDK synthesizes to CloudFormation).</td>
            </tr>
            <tr>
              <td><strong>CDK</strong></td>
              <td>Define AWS infrastructure in TypeScript, Python, or other languages. Compiles to CloudFormation.</td>
              <td>TypeScript teams building AWS-only infrastructure. Type-safe infrastructure with full language features.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="decision-matrix">Service Decision Matrix</h2>
      <p>
        When asked &quot;what service would you use for X?&quot; in an interview, use this mental framework:
      </p>
      <pre><code>{`// Service selection decision guide

// Compute:
Need to run a container always-on?      → ECS Fargate
Need event-driven, short execution?     → Lambda
Need GPU or specialized instance type?  → EC2
Need Kubernetes specifically?           → EKS

// Database:
Need joins, transactions, ACID?         → RDS PostgreSQL or Aurora
Need infinite scale, key-value access?  → DynamoDB
Need full-text search?                  → OpenSearch (DynamoDB Streams → OpenSearch)
Need sub-millisecond reads, caching?    → ElastiCache Redis
Need time-series data?                  → Timestream or InfluxDB

// Queue/Events:
Need a simple job queue (1 consumer)?   → SQS Standard
Need ordered jobs, exactly-once?        → SQS FIFO
Need to fan out to multiple consumers?  → SNS → multiple SQS
Need event routing with rules?          → EventBridge
Need ordered streaming, replay?         → Kinesis Data Streams

// Storage:
Need to store files, images, PDFs?      → S3
Need a disk attached to a server?       → EBS
Need a shared filesystem?               → EFS

// Auth:
Need user authentication (sign up/in)?  → Cognito User Pools
Need service-to-service auth?           → IAM roles (no Cognito needed)
Need API keys for external partners?    → API Gateway API keys

// Load balancing:
HTTP/HTTPS traffic, path routing?       → ALB
TCP/UDP, ultra-low latency?             → NLB
Lambda-backed API, throttling, caching? → API Gateway`}</code></pre>

      <h2 id="common-wrong-choices">Common Wrong Service Choices</h2>
      <ul>
        <li>
          <strong>Using Lambda for a long-running API server.</strong> Lambda has a 15-minute maximum
          runtime and cold starts. A persistent ECS Fargate service is better for long-lived HTTP
          server workloads with database connection pools.
        </li>
        <li>
          <strong>Using EC2 directly when ECS Fargate is available.</strong> Running raw EC2 requires
          you to manage OS patches, security updates, and server failures. ECS Fargate handles all of
          this automatically for a modest cost premium.
        </li>
        <li>
          <strong>Using RDS when DynamoDB would scale better.</strong> A social media app&apos;s
          timeline, session storage, or leaderboard that needs to scale to millions of users is a
          poor fit for a single-primary RDS cluster. DynamoDB partitions automatically and has no
          practical throughput ceiling.
        </li>
        <li>
          <strong>Using DynamoDB for complex reporting queries.</strong> DynamoDB does not support
          SQL joins, aggregations, or ad-hoc queries. If you need analytics or complex reporting,
          stream to a data warehouse (Redshift) or a relational database.
        </li>
        <li>
          <strong>Storing secrets in environment variables or SSM Parameter Store plaintext.</strong>
          Use Secrets Manager for sensitive values. Parameter Store is fine for non-sensitive
          configuration. Never put plaintext passwords in environment variables visible in ECS
          task definitions.
        </li>
        <li>
          <strong>Using S3 as a database.</strong> S3 is object storage, not a database. Each
          object read is a separate HTTP call (~10–50ms). Do not store individual small records
          in S3 and query them at runtime &mdash; put them in DynamoDB or RDS.
        </li>
        <li>
          <strong>Using Kinesis when SQS is sufficient.</strong> Kinesis is complex to operate
          and necessary for ordered streaming or multi-consumer replay. Most background job patterns
          only need SQS, which is simpler, cheaper for low-volume, and fully managed.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: When would you use Lambda over ECS Fargate?</strong></p>
      <p>
        Lambda for event-driven, short-duration work: processing an SQS message, handling an S3
        upload event, running a scheduled job, or serving as a thin API Gateway backend at low
        traffic. ECS Fargate for persistent, always-on services: APIs with database connection pools,
        WebSocket servers, long-running background workers, or any service where cold start latency
        is unacceptable.
      </p>

      <p><strong>Q: When would you use DynamoDB over RDS?</strong></p>
      <p>
        DynamoDB when: access patterns are simple key-value or query-within-partition, the system
        needs to scale to millions of QPS without operational complexity, and you can design access
        patterns upfront. RDS when: the data model requires joins, the queries are ad-hoc, you need
        ACID transactions across multiple entities, or the team has strong SQL expertise and the
        scale does not demand NoSQL.
      </p>

      <p><strong>Q: What is the difference between SQS and SNS?</strong></p>
      <p>
        SQS is a queue: one message goes to one consumer, persisted until consumed. SNS is a
        pub/sub fanout: one message is delivered to all subscribers simultaneously. The common
        pattern is SNS → multiple SQS queues, which provides both fanout (SNS) and durability
        (SQS). SNS alone is not durable &mdash; if a subscriber is down when the message is
        published, the message is lost.
      </p>

      <p><strong>Q: How does CloudTrail differ from CloudWatch?</strong></p>
      <p>
        CloudTrail records AWS API calls &mdash; who made what API call, when, from where. It is
        an audit log of control plane events: &quot;which user deleted the S3 bucket.&quot;
        CloudWatch records metrics and application logs &mdash; the operational data plane:
        &quot;what is my Lambda error rate right now.&quot; Both are necessary: CloudTrail for
        security and compliance, CloudWatch for operational monitoring.
      </p>
    </div>
  );
}
