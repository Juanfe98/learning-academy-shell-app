import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const architectureDiagram = String.raw`flowchart TD
    USERS["Users — 100k DAU at launch"]

    subgraph EDGE["Edge Layer"]
        R53["Route 53\nDNS + Health Checks"]
        CF["CloudFront\nSPA + CDN + WAF"]
        COG["Cognito\nJWT Authentication"]
    end

    subgraph API["Application Layer — Private Subnets"]
        ALB["ALB\nHTTPS + Health Checks"]
        ECS["ECS Fargate\nNode.js API\n2–10 tasks, auto-scale"]
        REDIS["ElastiCache Redis\nSession + Section Cache"]
    end

    subgraph DATA["Data Layer — Private Subnets"]
        DDB["DynamoDB\nOn-Demand\nUsers, CVs, Sections, Exports"]
        S3U["S3 Uploads\nSSE-KMS + Versioning"]
        S3E["S3 Exports\nPresigned Download URLs"]
    end

    subgraph ASYNC["Async Parsing Layer"]
        SQS["SQS Standard\nParse Jobs\nDLQ after 3 retries"]
        LAMBDA["Lambda\n15-min timeout\n10 reserved concurrency"]
        AI["AI Provider\nClaude or GPT-4"]
    end

    subgraph OPS["Operations"]
        CW["CloudWatch\nLogs + Metrics + Alarms"]
        XR["X-Ray\nDistributed Traces"]
        SM["Secrets Manager\nAPI Keys"]
        GH["GitHub Actions\nCI/CD"]
        ECR["ECR\nContainer Registry"]
    end

    USERS --> R53 --> CF --> ALB
    CF --> COG
    ALB --> ECS
    ECS --> REDIS & DDB & S3U & SQS
    SQS --> LAMBDA
    LAMBDA --> S3U & AI & DDB & S3E
    ECS & LAMBDA --> CW & XR
    ECS --> SM
    GH --> ECR --> ECS`;

const loginSequence = String.raw`sequenceDiagram
    participant B as Browser
    participant COG as Cognito
    participant API as ECS API
    participant DB as DynamoDB

    B->>COG: POST /oauth2/token (email + password)
    COG-->>B: { accessToken, refreshToken, idToken }
    Note over B: Store tokens in memory (not localStorage)

    B->>API: GET /api/me (Authorization: Bearer accessToken)
    API->>API: Verify JWT signature (Cognito JWKS)
    API->>DB: GetItem(PK=USER#sub)
    DB-->>API: User profile
    API-->>B: { userId, name, email, plan }

    Note over B,DB: Token refresh (silent, every 55 minutes)
    B->>COG: POST /oauth2/token (refreshToken)
    COG-->>B: { new accessToken }`;

const exportSequence = String.raw`sequenceDiagram
    participant B as Browser
    participant API as ECS API
    participant DB as DynamoDB
    participant LAMBDA as Lambda Worker
    participant S3 as S3 Exports

    B->>API: POST /api/cvs/:cvId/exports { template }
    API->>DB: Create Export record (status: generating)
    API->>DB: Enqueue export job (SQS via EventBridge)
    API-->>B: { exportId, status: generating }

    Note over LAMBDA: Async — user polls or uses WebSocket

    LAMBDA->>DB: Get CV sections
    LAMBDA->>LAMBDA: Render PDF (headless Chrome or Puppeteer)
    LAMBDA->>S3: Upload PDF
    LAMBDA->>DB: Update Export (status: ready, s3Key)

    B->>API: GET /api/exports/:exportId (polling)
    API->>DB: GetItem Export record
    API->>S3: Generate presigned URL (expires 5 min)
    API-->>B: { status: ready, downloadUrl }
    B->>S3: Download PDF directly`;

export const toc: TocItem[] = [
  { id: "problem-statement", title: "Problem Statement", level: 2 },
  { id: "functional-requirements", title: "Functional Requirements", level: 2 },
  { id: "non-functional-requirements", title: "Non-Functional Requirements", level: 2 },
  { id: "assumptions", title: "Assumptions", level: 2 },
  { id: "capacity-estimation", title: "Capacity Estimation", level: 2 },
  { id: "api-design", title: "API Design", level: 2 },
  { id: "data-model", title: "Data Model", level: 2 },
  { id: "aws-architecture", title: "AWS Architecture", level: 2 },
  { id: "async-flow", title: "Key Flows: Login, Upload, Export", level: 2 },
  { id: "security-architecture", title: "Security Architecture", level: 2 },
  { id: "observability-architecture", title: "Observability Architecture", level: 2 },
  { id: "cicd-strategy", title: "CI/CD Strategy", level: 2 },
  { id: "disaster-recovery", title: "Disaster Recovery", level: 2 },
  { id: "cost-optimization", title: "Cost Optimization", level: 2 },
  { id: "tradeoffs", title: "Tradeoffs", level: 2 },
  { id: "alternatives", title: "Alternatives Considered", level: 2 },
  { id: "readiness-checklist", title: "Interview Readiness Checklist", level: 2 },
];

export default function CapstoneCvBuilder() {
  return (
    <div className="article-content">
      <p>
        This is the capstone of the System Design &amp; AWS academy. It is a complete, production-ready
        system design document for the CV Builder application &mdash; the same system we have referenced
        throughout the course. Read it as if you are presenting it to a hiring committee, an engineering
        leadership review, or an architecture board. Every decision is justified. Every tradeoff is named.
        Every failure mode has a mitigation.
      </p>
      <p>
        After reading this, you should be able to reproduce this design &mdash; or any equivalent &mdash;
        from scratch for any similar document-processing, file-upload, or AI-integrated web application.
        The patterns are universal.
      </p>

      <h2 id="problem-statement">Problem Statement</h2>
      <p>
        Job seekers spend significant time manually reformatting their existing CVs for different
        positions and template styles. They also struggle with inconsistent formatting across versions.
        We are building a CV Builder that eliminates this friction: users upload their existing CV,
        AI extracts and structures the content, they edit it in a clean interface, and they export
        beautifully formatted PDFs in seconds.
      </p>

      <h2 id="functional-requirements">Functional Requirements</h2>
      <ol>
        <li>Users can create an account with email/password or Google/Apple social login.</li>
        <li>Users can upload a CV in PDF or DOCX format (max 10MB per file).</li>
        <li>The system parses the uploaded CV using an AI provider and extracts structured sections: contact info, summary, work experience, education, and skills.</li>
        <li>Users can edit any extracted section in a rich text editor.</li>
        <li>Users can preview their CV in multiple templates (modern, classic, minimal).</li>
        <li>Users can export their CV as a formatted PDF.</li>
        <li>Users can save and manage up to 10 CV versions per account.</li>
        <li>Users can share a public download link for their exported PDF (optional, per export).</li>
      </ol>

      <h2 id="non-functional-requirements">Non-Functional Requirements</h2>
      <ArticleTable caption="Non-functional requirements with measurable targets" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Target</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Availability</td>
              <td>99.9% monthly (≤ 43 min downtime)</td>
              <td>Job seekers use this at application deadlines; downtime is costly</td>
            </tr>
            <tr>
              <td>API latency</td>
              <td>p99 ≤ 200ms (excluding async parsing)</td>
              <td>Editing must feel instant; slow API hurts perceived quality</td>
            </tr>
            <tr>
              <td>CV parsing time</td>
              <td>≤ 30s for 90% of CVs</td>
              <td>AI providers are variable; async flow handles this without blocking UX</td>
            </tr>
            <tr>
              <td>Upload success rate</td>
              <td>≥ 99.5%</td>
              <td>Failed uploads lose user data — must be reliable</td>
            </tr>
            <tr>
              <td>Data durability</td>
              <td>≥ 11 nines (S3 + DynamoDB)</td>
              <td>User CV data must never be lost</td>
            </tr>
            <tr>
              <td>Scale</td>
              <td>100k DAU launch, designed to 1M DAU</td>
              <td>Architecture must accommodate 10x growth without re-platforming</td>
            </tr>
            <tr>
              <td>Security</td>
              <td>SOC 2 Type II compliant</td>
              <td>CV data is sensitive PII; enterprise customers require compliance</td>
            </tr>
            <tr>
              <td>GDPR</td>
              <td>Right to erasure within 30 days</td>
              <td>EU users have data deletion rights; must be implemented and auditable</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="assumptions">Assumptions</h2>
      <ul>
        <li>Users are authenticated for all CV operations. No anonymous CV creation.</li>
        <li>CV parsing is eventually consistent &mdash; users are notified when parsing completes, not blocked.</li>
        <li>PDF export is also async (rendering takes 2–5s). Users receive a download link when ready.</li>
        <li>We operate in a single AWS region (us-east-1) at launch. Multi-region can be added if latency for EU users is a concern.</li>
        <li>AI parsing uses a third-party provider (Anthropic Claude or OpenAI GPT-4). We do not run our own model.</li>
        <li>The tech stack is: React frontend, Node.js API, DynamoDB, S3, ECS Fargate, Lambda.</li>
      </ul>

      <h2 id="capacity-estimation">Capacity Estimation</h2>
      <pre><code>{`// === Traffic ===
DAU = 100,000
Average API calls per user per day = 20 (editing, previewing, loading sections)
Average QPS = 100k × 20 / 86,400 ≈ 23 QPS
Peak QPS = 23 × 3 = ~70 QPS
// → Very manageable; 2 ECS tasks can handle 70 QPS with headroom

// === Uploads ===
Upload rate = 5% of DAU upload per day = 5,000 uploads/day
= 5,000 / 86,400 ≈ 0.06 uploads/second (very low)
Peak uploads = ~30/minute during peak hours

// === Storage ===
File size (avg): 2 MB
Uploads/day: 5,000
Storage growth/day: 5,000 × 2 MB = 10 GB/day
Storage growth/year: 10 GB × 365 = ~3.65 TB/year
// → S3 with lifecycle to IA after 90 days

Exports/day: 2,000 PDFs × 500 KB avg = 1 GB/day
// → S3 with 7-day TTL for export files (then delete or move to user-controlled download)

DynamoDB metadata: ~5 KB per CV × 300k total CVs = 1.5 GB total
// → Trivially small; DynamoDB scales to TB automatically

// === Bandwidth ===
Read bandwidth: 60 QPS × 10 KB avg response = 600 KB/s ≈ 5 Mbps
Upload bandwidth: 0.06 upload/s × 2 MB = 120 KB/s (to S3, not API server)
Export bandwidth: via S3 presigned URLs; not through API server

// === Key conclusion ===
// Scale is low to moderate. Simple architecture is appropriate.
// Dominant costs: AI parsing provider, not infrastructure.`}</code></pre>

      <h2 id="api-design">API Design</h2>
      <pre><code>{`// Base URL: https://api.cvbuilder.com/v1
// All endpoints require Authorization: Bearer {accessToken} unless noted

// === Authentication ===
POST   /auth/register       { email, password } → { userId, accessToken, refreshToken }
POST   /auth/login          { email, password } → { accessToken, refreshToken }
POST   /auth/refresh        { refreshToken }    → { accessToken }
DELETE /auth/logout         { refreshToken }    → 204

// === CVs ===
GET    /cvs                              → { cvs: [CVSummary], nextCursor }
POST   /cvs/upload-url                  { filename, contentType, size } → { cvId, uploadUrl }
POST   /cvs/:cvId/complete              {} → { cvId, status: "processing" }
GET    /cvs/:cvId                       → { cv: CV, status, sections }
DELETE /cvs/:cvId                       → 204
PATCH  /cvs/:cvId                       { title } → { cv: CV }

// === Sections ===
GET    /cvs/:cvId/sections              → { sections: Section[] }
GET    /cvs/:cvId/sections/:section     → { section: Section }
PATCH  /cvs/:cvId/sections/:section     { content } → { section: Section }

// === Exports ===
POST   /cvs/:cvId/exports               { template: "modern" | "classic" | "minimal" } → { exportId }
GET    /exports/:exportId               → { status, downloadUrl?, expiresAt? }
POST   /exports/:exportId/share         {} → { shareUrl } (public link, no auth required)

// === Account ===
GET    /me                              → { userId, email, name, plan, cvCount }
DELETE /me                              → 202 (GDPR erasure, async)

// Error format (all endpoints):
// { error: { code: "CV_NOT_FOUND", message: "CV not found", details?: any } }
// HTTP status codes:
// 400 Bad Request, 401 Unauthorized, 403 Forbidden,
// 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Internal Server Error`}</code></pre>

      <h2 id="data-model">Data Model</h2>
      <pre><code>{`// DynamoDB single-table design
// Table name: cv-builder-prod

// ENTITY: User
PK: USER#{userId}     SK: PROFILE
Attributes: { email, name, plan, createdAt, cvCount }

// ENTITY: CV (summary record — for listing)
PK: USER#{userId}     SK: CV#{cvId}
Attributes: { title, status, createdAt, updatedAt, fileKey, sectionCount }

// ENTITY: CV Sections (one item per section)
PK: CV#{cvId}         SK: SECTION#{sectionName}
Attributes: section-specific content

// ENTITY: Export
PK: CV#{cvId}         SK: EXPORT#{exportId}
Attributes: { status, template, s3Key, downloadUrl, shareToken, expiresAt, createdAt }

// ENTITY: Share token reverse lookup (for public download link)
PK: SHARE#{shareToken}   SK: SHARE#{shareToken}
Attributes: { cvId, exportId, expiresAt }

// Access patterns and implementation:
// 1. Get user profile:          GetItem(PK=USER#u1, SK=PROFILE)
// 2. List user's CVs:           Query(PK=USER#u1, SK begins_with CV#)  — sorted by creation (SK is prefixed with CV#)
// 3. Get CV status:             GetItem(PK=USER#u1, SK=CV#cv1)
// 4. Get all CV sections:       Query(PK=CV#cv1, SK begins_with SECTION#)
// 5. Get one section:           GetItem(PK=CV#cv1, SK=SECTION#experience)
// 6. Update section:            PutItem(PK=CV#cv1, SK=SECTION#experience, ...content)
// 7. Get export status:         GetItem(PK=CV#cv1, SK=EXPORT#exp1)
// 8. Resolve share token:       GetItem(PK=SHARE#token, SK=SHARE#token)

// S3 key structure:
// uploads/{userId}/{cvId}/original.{ext}         — uploaded file
// exports/{userId}/{cvId}/{exportId}/cv.pdf       — generated PDF
// public/{shareToken}.pdf                         — shared PDF copy (if sharing enabled)

// TTL:
// Export records: TTL = 7 days after creation (auto-deleted)
// Share tokens: TTL = 30 days or until user revokes

// GDPR erasure:
// DELETE /me triggers an async Lambda that:
// 1. Deletes all DynamoDB items with PK=USER#userId or CV#cvId owned by user
// 2. Deletes all S3 objects under uploads/{userId}/ and exports/{userId}/
// 3. Records deletion timestamp in audit table (for compliance evidence)`}</code></pre>

      <h2 id="aws-architecture">AWS Architecture</h2>
      <MermaidDiagram
        chart={architectureDiagram}
        title="CV Builder — Production AWS Architecture"
        caption="All application components run in private subnets. Only ALB and CloudFront are public-facing."
        minHeight={640}
      />

      <h2 id="async-flow">Key Flows: Login, Upload, Export</h2>
      <MermaidDiagram
        chart={loginSequence}
        title="Login and Token Flow"
        caption="Cognito issues JWTs. API validates signature locally — no Cognito call on every request."
        minHeight={380}
      />
      <MermaidDiagram
        chart={exportSequence}
        title="PDF Export Flow"
        caption="Export is async. Lambda renders PDF with headless Chrome (Puppeteer). User polls for status."
        minHeight={480}
      />

      <h2 id="security-architecture">Security Architecture</h2>
      <ArticleTable caption="Security controls by layer" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Control</th>
              <th>Implementation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Edge</td>
              <td>WAF rules</td>
              <td>CloudFront WAF: Core rule set, rate limit 100 req/5-min on /auth/*, SQL injection protection</td>
            </tr>
            <tr>
              <td>Authentication</td>
              <td>JWT validation</td>
              <td>API validates Cognito JWT signature on every request using JWKS. No session database.</td>
            </tr>
            <tr>
              <td>Authorization</td>
              <td>Resource ownership</td>
              <td>Every DynamoDB read checks that the item&apos;s userId matches the JWT sub. No global admin endpoints.</td>
            </tr>
            <tr>
              <td>Network</td>
              <td>Private subnets</td>
              <td>ECS tasks, Redis, DynamoDB VPC endpoints — all in private subnets. ALB is the only public entry point.</td>
            </tr>
            <tr>
              <td>Credentials</td>
              <td>IAM roles only</td>
              <td>ECS task role has least-privilege access to DynamoDB table and S3 bucket. No AWS access keys in code.</td>
            </tr>
            <tr>
              <td>Secrets</td>
              <td>Secrets Manager</td>
              <td>AI API key stored in Secrets Manager. ECS retrieves on startup. Never in environment variables or code.</td>
            </tr>
            <tr>
              <td>Data at rest</td>
              <td>Encryption</td>
              <td>S3: SSE-KMS with customer-managed key. DynamoDB: AWS-managed encryption. Redis: encryption at rest.</td>
            </tr>
            <tr>
              <td>Data in transit</td>
              <td>TLS everywhere</td>
              <td>CloudFront → ALB: HTTPS. ALB → ECS: HTTP (within VPC, acceptable). ECS → Redis/DynamoDB: TLS. No plaintext outside VPC.</td>
            </tr>
            <tr>
              <td>Audit</td>
              <td>CloudTrail</td>
              <td>All AWS API calls logged to CloudTrail with 7-year retention. GuardDuty enabled for threat detection.</td>
            </tr>
            <tr>
              <td>File access</td>
              <td>Presigned URLs</td>
              <td>All file access via presigned URLs with 5-minute expiry. No public S3 bucket policies.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="observability-architecture">Observability Architecture</h2>
      <pre><code>{`// Structured log format (all services):
{
  "timestamp": "2025-04-30T10:15:30.123Z",
  "level": "info",
  "requestId": "1-6626-abc123",        // X-Ray trace ID (propagated through all services)
  "userId": "u-abc123",
  "service": "cv-builder-api",
  "action": "cv.upload.complete",
  "cvId": "cv-xyz456",
  "durationMs": 45,
  "statusCode": 200
}

// Key CloudWatch alarms:
// 1. API error rate: (5xx count / total requests) > 1% for 5 minutes
//    → SNS → PagerDuty P2 alert
// 2. API p99 latency > 500ms for 5 minutes
//    → SNS → Slack warning
// 3. SQS DLQ depth > 0
//    → SNS → PagerDuty P1 alert (CV parsing failures)
// 4. ECS CPU > 80% for 10 minutes
//    → SNS → Slack (auto-scaling should handle, but confirm)
// 5. S3 5xx errors > 0
//    → SNS → PagerDuty (upload failures)

// Custom business metrics:
// - cv_uploads_total (counter) → rate of CV uploads
// - cv_parse_success_rate → parsing success rate (should be > 95%)
// - cv_parse_duration_seconds (histogram p50/p95/p99) → parsing latency
// - pdf_exports_total (counter)
// - active_users_daily (gauge) → DAU

// SLOs:
// API availability: 99.9% over 30-day rolling window
// API p99 latency: ≤ 200ms over 1-hour windows (measured via CloudWatch Metrics)
// CV parse success rate: ≥ 97% (DLQ / total attempts over 1 day)
// Error budget burn rate: alert when burn rate > 5x (consuming error budget too fast)`}</code></pre>

      <h2 id="cicd-strategy">CI/CD Strategy</h2>
      <pre><code>{`// Pipeline: GitHub Actions → ECR → ECS rolling deploy

// On PR:
// 1. pnpm lint + pnpm test (unit + integration)
// 2. pnpm build (TypeScript compile check)
// 3. Docker build (verify image builds)
// 4. Terraform plan (show infra changes)
// 5. Security scan: Trivy (container image), npm audit (dependencies)

// On merge to main:
// 1. Run tests again
// 2. Docker build + tag with git SHA
// 3. Push to ECR
// 4. Update ECS task definition with new image
// 5. aws ecs update-service --force-new-deployment (rolling update)
//    ECS: drains 1 old task, starts 1 new task, waits for health check, repeat
// 6. Monitor CloudWatch error rate for 10 minutes after deploy
//    → If error rate spikes: rollback to previous task definition

// Database migrations:
// Expand/contract pattern:
// - Phase 1: Add new attribute, keep reading old attribute (deploy)
// - Phase 2: Backfill data to new attribute (migration script, separate deploy)
// - Phase 3: Read from new attribute, write to both (deploy)
// - Phase 4: Remove old attribute reads (deploy)
// - Phase 5: Remove old attribute writes (deploy)
// This avoids downtime by making all changes backwards-compatible

// Feature flags:
// Using a simple DynamoDB table: { feature: "ai-summary", enabled: true, rolloutPercent: 10 }
// API checks feature flag from Redis cache (refreshed every 60s)
// Allows: gradual rollout, instant kill switch, A/B testing`}</code></pre>

      <h2 id="disaster-recovery">Disaster Recovery</h2>
      <ArticleTable caption="Disaster recovery tiers and their costs" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>RTO</th>
              <th>RPO</th>
              <th>Strategy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Single ECS task failure</td>
              <td>&lt; 30 seconds</td>
              <td>0 (stateless)</td>
              <td>ECS auto-replacement. ALB routes to healthy tasks.</td>
            </tr>
            <tr>
              <td>Single AZ failure</td>
              <td>&lt; 1 minute</td>
              <td>0</td>
              <td>ECS tasks and ALB are multi-AZ. DynamoDB and S3 replicate across 3 AZs automatically.</td>
            </tr>
            <tr>
              <td>ECS service failure</td>
              <td>&lt; 5 minutes</td>
              <td>0</td>
              <td>ECS desired count maintains minimum tasks. Re-deploy from ECR if image is corrupt.</td>
            </tr>
            <tr>
              <td>DynamoDB table corruption</td>
              <td>&lt; 30 minutes</td>
              <td>≤ 5 minutes (PITR)</td>
              <td>DynamoDB Point-In-Time Recovery (PITR) enabled. Restore to any second in last 35 days.</td>
            </tr>
            <tr>
              <td>S3 object accidental deletion</td>
              <td>&lt; 10 minutes</td>
              <td>0 (versioning)</td>
              <td>S3 versioning enabled. Deleted objects can be undeleted. MFA delete on production bucket.</td>
            </tr>
            <tr>
              <td>Full region failure (us-east-1)</td>
              <td>&lt; 4 hours</td>
              <td>≤ 1 hour</td>
              <td>S3 cross-region replication to us-west-2. DynamoDB global tables to us-west-2. Deploy ECS to standby region. Route 53 health check triggers failover. (Active only if downtime risk is critical.)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="cost-optimization">Cost Optimization</h2>
      <ul>
        <li>
          <strong>Lambda for parsing workers (not ECS):</strong> Parsing runs ~500 times/day. An
          always-on ECS task for this would be wasteful. Lambda costs ~$2/month for 500 invocations
          of 15 seconds each. ECS would cost ~$35/month for an equivalent always-on task.
        </li>
        <li>
          <strong>DynamoDB on-demand billing:</strong> At 100k DAU with moderate DB usage, on-demand
          is more cost-effective than provisioned capacity (no capacity planning, pay per request,
          handles traffic spikes without throttling). At 10x scale, switch to provisioned with
          auto-scaling for ~30% savings.
        </li>
        <li>
          <strong>S3 lifecycle policies:</strong> Original CV files moved to S3 Infrequent Access
          after 30 days (60% cheaper per GB). Export files deleted after 7 days (users can re-export).
        </li>
        <li>
          <strong>CloudFront for egress cost reduction:</strong> S3 direct egress: $0.09/GB.
          CloudFront egress: $0.01/GB. For 1TB/month, CloudFront saves $80/month.
        </li>
        <li>
          <strong>AI parsing cache:</strong> Hash the uploaded file (SHA-256). If same hash exists
          in DynamoDB, copy the existing parse result. Eliminates duplicate AI calls for identical
          CVs uploaded multiple times (common for users testing the product).
        </li>
        <li>
          <strong>Reserved capacity for predictable load:</strong> 1-year reserved EC2 instances
          for the Fargate underlying compute at 1M DAU scale. ~30–40% discount vs on-demand.
        </li>
      </ul>

      <h2 id="tradeoffs">Tradeoffs</h2>
      <ArticleTable caption="Key architectural decisions with their tradeoffs explicitly named" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Decision</th>
              <th>Choice</th>
              <th>Tradeoff accepted</th>
              <th>Trigger to revisit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Database</td>
              <td>DynamoDB</td>
              <td>No ad-hoc queries, no joins. Access patterns must be designed upfront. Analytics requires a separate data path.</td>
              <td>If reporting requirements emerge (user analytics, business dashboards), add Redshift or Athena over S3 exports.</td>
            </tr>
            <tr>
              <td>Compute (API)</td>
              <td>ECS Fargate</td>
              <td>Higher minimum cost vs Lambda (always 2 tasks). Cold starts avoided, persistent connections enabled.</td>
              <td>If traffic drops below 5k DAU and cost optimization is critical, switch to Lambda + API Gateway.</td>
            </tr>
            <tr>
              <td>Region</td>
              <td>Single region (us-east-1)</td>
              <td>EU users see ~80–100ms latency (transatlantic). Full region failure requires manual failover.</td>
              <td>If EU becomes a significant user base (&gt;30%), add eu-west-1 with Route 53 latency routing.</td>
            </tr>
            <tr>
              <td>Auth</td>
              <td>Cognito</td>
              <td>Limited UI customization. Advanced auth flows (passwordless, magic link) require custom Lambda triggers.</td>
              <td>If enterprise SSO (SAML/OIDC) requirements emerge, evaluate Auth0 or Okta.</td>
            </tr>
            <tr>
              <td>Parsing</td>
              <td>Third-party AI</td>
              <td>Cost scales with usage. Provider downtime causes parse delays. No on-premise option for sensitive data.</td>
              <td>If AI provider cost exceeds $5k/month, evaluate fine-tuned open-source model on EC2 (g4dn instances).</td>
            </tr>
            <tr>
              <td>Consistency</td>
              <td>Eventual (DynamoDB default)</td>
              <td>Brief window after write where reads may return stale data. Not a real UX problem for this use case.</td>
              <td>If payments or inventory are added, use ConsistentRead: true or switch to SQL for those specific entities.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="alternatives">Alternatives Considered</h2>
      <ul>
        <li>
          <strong>PostgreSQL (RDS) instead of DynamoDB.</strong> Rejected because: our access
          patterns are simple key-value lookups; SQL joins add no value for this data model;
          scaling PostgreSQL to 1M DAU requires read replicas, connection pooling (PgBouncer), and
          eventually sharding &mdash; significant operational complexity. DynamoDB handles all of
          this automatically.
        </li>
        <li>
          <strong>Lambda for the API instead of ECS.</strong> Rejected because: the API maintains
          persistent connections to Redis (session cache). Lambda&apos;s stateless execution model
          would create a new Redis connection per invocation &mdash; connection pool thrash at
          70 QPS. ECS maintains a small, stable connection pool.
        </li>
        <li>
          <strong>Kubernetes (EKS) instead of ECS.</strong> Rejected because: EKS adds significant
          operational complexity (node management, cluster upgrades, pod networking) for a team that
          does not have dedicated platform engineers. ECS Fargate delivers equivalent functionality
          with AWS managing the underlying infrastructure.
        </li>
        <li>
          <strong>Firebase / Supabase instead of AWS.</strong> Rejected because: Firebase Real-time
          Database and Firestore do not offer the control or compliance guarantees needed (SOC 2,
          GDPR data residency). AWS gives us full control over data location, encryption keys, and
          network topology.
        </li>
      </ul>

      <InterviewPlaybook
        title="5-Minute Interview Walk-Through"
        intro="If asked to design this system in a 45-minute interview, here is how to present it efficiently."
        steps={[
          "Clarify requirements: 'I want to confirm a few things before designing. How many users at launch? What is the latency tolerance for parsing — can it be async? What is the expected file size limit?' Then state your confirmed assumptions.",
          "State non-functional requirements explicitly: '99.9% availability, p99 API latency under 200ms, CV parsing async with 30s target, all data encrypted at rest, GDPR compliant.'",
          "Capacity estimation (60 seconds): '100k DAU × 20 req/day = 23 average QPS, 70 peak. Very low scale. Storage is 10GB/day. AI parsing is the dominant cost.' Mention this tells you the architecture can start simple.",
          "Draw the high-level architecture: CloudFront → ALB → ECS Fargate → DynamoDB, S3, Redis. Add the async path: ECS → SQS → Lambda → AI → DynamoDB. Explain each arrow.",
          "Highlight two key design decisions: '(1) CV parsing is async because AI calls take 5–30 seconds — I use SQS + Lambda so the API returns immediately. (2) I chose DynamoDB over PostgreSQL because all access patterns are key-value lookups and I need infinite scale without ops overhead.'",
          "Cover failure modes: 'If the AI provider fails, SQS retries 3 times with exponential backoff, then moves to a DLQ. We alert on DLQ depth. The upload is not lost — parsing resumes when the provider recovers.'",
          "End with tradeoffs: 'I accepted eventual consistency for DynamoDB reads — acceptable because a CV section display being briefly stale after a write is invisible to users. If payments were involved, I would use strong reads.'",
        ]}
      />

      <h2 id="readiness-checklist">Interview Readiness Checklist</h2>
      <p>
        You are ready to pass senior-level system design interviews when you can answer YES to every
        item on this list without hesitation:
      </p>
      <ArticleTable caption="Interview readiness self-assessment" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Can you explain this from memory?</th>
              <th>Ready?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>How a request travels from browser to DynamoDB and back (DNS, CDN, TLS, LB, API, DB)</td><td>☐</td></tr>
            <tr><td>Why DynamoDB scales infinitely (partitioning) and when SQL is better (joins, transactions, ad-hoc queries)</td><td>☐</td></tr>
            <tr><td>How to design a DynamoDB single-table schema for a given set of access patterns</td><td>☐</td></tr>
            <tr><td>Why async is the right pattern for any operation taking &gt;500ms (AI, PDF export, email)</td><td>☐</td></tr>
            <tr><td>What happens to a message if a Lambda worker crashes (SQS retry → DLQ)</td><td>☐</td></tr>
            <tr><td>Why idempotency keys matter and how to implement them (check if processed before acting)</td><td>☐</td></tr>
            <tr><td>The difference between cache-aside, write-through, and write-behind caching</td><td>☐</td></tr>
            <tr><td>How a circuit breaker works (closed → open → half-open) and when to use one</td><td>☐</td></tr>
            <tr><td>CAP theorem: the real choice is CP vs AP, and partition tolerance is non-optional</td><td>☐</td></tr>
            <tr><td>How to estimate QPS from DAU (DAU × requests/day / 86,400 × peak factor)</td><td>☐</td></tr>
            <tr><td>The 8-step system design interview framework and how to allocate 45 minutes</td><td>☐</td></tr>
            <tr><td>Three senior-level tradeoff statements you can make for any common architectural decision</td><td>☐</td></tr>
            <tr><td>How to explain multi-AZ vs multi-region and when each is necessary</td><td>☐</td></tr>
            <tr><td>What RTO and RPO mean and how to reason about disaster recovery tiers</td><td>☐</td></tr>
            <tr><td>The three pillars of observability and a concrete example of debugging a production incident with each</td><td>☐</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        When every box is checked, you are ready. The goal was never to memorize architectures &mdash;
        it was to internalize the patterns, the tradeoffs, and the reasoning process. Every system you
        will ever design is a combination of the same 30 components, connected in different ways for
        different constraints. You now have the vocabulary, the mental models, and the framework to
        design any of them.
      </p>
    </div>
  );
}
