import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook, ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const interviewFlowDiagram = String.raw`flowchart TD
    START["System Design Question\nposed by interviewer"]

    CLARIFY["Step 1 — Clarify\n5 minutes\nAsk scope questions"]
    REQ["Step 2 — Requirements\n3 minutes\nFunctional + Non-functional"]
    EST["Step 3 — Capacity Estimation\n5 minutes\nQPS, Storage, Bandwidth"]
    API["Step 4 — API Design\n5 minutes\nEndpoints + Data contracts"]
    DATA["Step 5 — Data Model\n5 minutes\nEntities + Access patterns"]
    ARCH["Step 6 — High-Level Architecture\n10 minutes\nDraw the boxes"]
    DEEP["Step 7 — Deep Dives\n15 minutes\nInterviewer picks 2–3 areas"]
    CLOSE["Step 8 — Tradeoffs + Close\n5 minutes\nAlternatives considered"]

    START --> CLARIFY --> REQ --> EST --> API --> DATA --> ARCH --> DEEP --> CLOSE

    style ARCH fill:#6366f1,color:#fff,stroke:#4f46e5
    style DEEP fill:#f59e0b,color:#fff,stroke:#d97706`;

export const toc: TocItem[] = [
  { id: "why-framework", title: "Why You Need a Framework", level: 2 },
  { id: "step1-clarify", title: "Step 1 — Clarify Requirements", level: 2 },
  { id: "step2-requirements", title: "Step 2 — Define Requirements", level: 2 },
  { id: "step3-estimation", title: "Step 3 — Capacity Estimation", level: 2 },
  { id: "step4-api", title: "Step 4 — API Design", level: 2 },
  { id: "step5-data-model", title: "Step 5 — Data Model", level: 2 },
  { id: "step6-architecture", title: "Step 6 — High-Level Architecture", level: 2 },
  { id: "step7-deep-dives", title: "Step 7 — Deep Dives", level: 2 },
  { id: "step8-tradeoffs", title: "Step 8 — Tradeoffs and Close", level: 2 },
  { id: "senior-phrases", title: "Senior-Level Phrases to Use", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes to Avoid", level: 2 },
  { id: "checklist", title: "Pre-Interview Checklist", level: 2 },
];

export default function InterviewFramework() {
  return (
    <div className="article-content">
      <p>
        System design interviews have a consistent structure, but most candidates fail them not
        because of knowledge gaps &mdash; they fail because they have no framework. They jump to
        drawing boxes too early, skip requirements clarification, run out of time before covering
        reliability or security, and miss the tradeoffs discussion entirely. The interviewer is
        evaluating your ability to think systematically under ambiguity, not your ability to
        memorize AWS service names.
      </p>
      <p>
        This module gives you a repeatable 8-step framework that works for any system design question.
        Internalize this process and you can walk into any interview with a clear structure, even
        for a system you have never designed before.
      </p>

      <MermaidDiagram
        chart={interviewFlowDiagram}
        title="System Design Interview Flow"
        caption="45-minute interview breakdown. Architecture and deep dives take the most time. Never skip clarification."
        minHeight={520}
      />

      <h2 id="why-framework">Why You Need a Framework</h2>
      <p>
        <strong>Analogy:</strong> A surgeon does not improvise the order of steps in an operation.
        They follow a protocol that has been refined over decades to minimize errors and maximize
        outcomes under pressure. A system design framework serves the same purpose: it ensures you
        cover every critical dimension even when nervous, and it signals to the interviewer that you
        have done this before.
      </p>
      <p>
        Without a framework, you will:
      </p>
      <ul>
        <li>Over-invest time in one area (database details) and run out of time for others (observability)</li>
        <li>Make architectural decisions before understanding scale requirements</li>
        <li>Forget to discuss failure modes, security, or cost</li>
        <li>Struggle to steer the conversation toward your strengths</li>
      </ul>

      <h2 id="step1-clarify">Step 1 &mdash; Clarify Requirements (5 min)</h2>
      <p>
        Never start designing before you understand the problem. The fastest way to fail a system
        design interview is to spend 40 minutes designing a beautiful system for the wrong requirements.
        Ask questions to narrow the problem space.
      </p>
      <p>
        <strong>Questions to ask:</strong>
      </p>
      <pre><code>{`// Clarification question templates

// Scale questions
"What is the expected number of daily active users at launch? At peak?"
"What is the read/write ratio? Is this read-heavy, write-heavy, or balanced?"
"What is the expected QPS? Do we need to handle bursty traffic?"
"What regions do we need to serve? Is this a global system?"

// Functional questions
"Who are the primary users? What is the core user journey?"
"What are the top 3 features that must work for this to be useful?"
"Are there any features we should explicitly NOT design for now?"

// Non-functional questions
"What latency is acceptable for the core user flow? Under 100ms? Under 1s?"
"What is the availability requirement? 99.9%? 99.99%?"
"Is there a consistency vs availability preference? Can we show slightly stale data?"
"What is the data retention requirement? How long do we keep data?"

// Constraints
"Do we have a preference for specific databases or cloud providers?"
"What is the team size operating this? How many engineers on-call?"
"Are there compliance requirements? GDPR? PCI-DSS?"

// The goal: define a well-scoped problem before drawing anything`}</code></pre>
      <p>
        After 5 minutes of clarification, you should know: the rough scale, the 2&ndash;3 core
        user flows, the latency and availability targets, and what is explicitly out of scope.
        <strong>State your assumptions explicitly</strong> &mdash; interviewers respect engineers
        who surface and document their assumptions rather than silently assuming the easiest case.
      </p>

      <h2 id="step2-requirements">Step 2 &mdash; Define Requirements (3 min)</h2>
      <p>
        Write down (or say aloud) the two types of requirements before proposing any solution:
      </p>
      <pre><code>{`// Requirements structure

// FUNCTIONAL REQUIREMENTS — what the system must do
// Keep to 3–5 core capabilities. Be specific.
Functional Requirements:
1. Users can create and upload a CV (PDF/DOCX, max 10MB)
2. System parses the CV using an AI provider and extracts structured data
3. Users can edit the extracted content in a web editor
4. Users can export a formatted CV as a PDF
5. Users can maintain up to 10 CV versions

// NON-FUNCTIONAL REQUIREMENTS — how well the system must do it
Non-Functional Requirements:
- Availability: 99.9% uptime (8.7 hours downtime/year acceptable)
- Latency: API responses < 200ms p99, CV parsing async (user notified when done)
- Scale: 100k DAU at launch, designed to 1M DAU
- Storage: Up to 10MB per CV file, up to 10 versions per user
- Consistency: Eventual consistency acceptable for parsed content display
- Security: Data encrypted at rest and in transit, GDPR compliant

// OUT OF SCOPE (explicit)
- Real-time collaboration
- Mobile native apps
- Payment processing
- CV template marketplace`}</code></pre>

      <h2 id="step3-estimation">Step 3 &mdash; Capacity Estimation (5 min)</h2>
      <p>
        Quick back-of-envelope math to size the system. You do not need precision &mdash; you need
        to understand the order of magnitude and identify where the bottlenecks will be.
      </p>
      <pre><code>{`// Capacity estimation template — talk through this out loud

// Traffic
DAU = 100,000
Average API calls per user per day = 20
Average QPS = 100k × 20 / 86,400 ≈ 23 QPS
Peak QPS = 23 × 3 = ~70 QPS
// → Very low traffic. A single ECS service or Lambda easily handles this.

// Storage
Active users = 100k
CVs per user (avg) = 3
CV file size (avg) = 2 MB
Total file storage = 100k × 3 × 2 MB = 600 GB
// → S3 with lifecycle policies. At $0.023/GB, costs ~$14/month. Negligible.

// Database
CV metadata per user = ~5 KB
Total metadata = 100k × 5 KB = 500 MB
// → DynamoDB with on-demand pricing. Very small table.

// Bandwidth
Read QPS = 60 (85% of traffic is reads)
Average response = 10 KB (CV metadata + sections)
Read bandwidth = 60 × 10 KB = 600 KB/s = ~5 Mbps
// → Very manageable. CloudFront CDN not even necessary at this scale.

// Conclusion from estimation:
// - Scale is very small — simple architecture first, no premature optimization
// - Storage and bandwidth are trivial — cost is dominated by compute and AI calls
// - CV parsing is async — AI call latency (1–30s) must not block the user request`}</code></pre>

      <h2 id="step4-api">Step 4 &mdash; API Design (5 min)</h2>
      <p>
        Define the key API endpoints. This grounds the architecture in real contracts and surfaces
        ambiguities early. You do not need to define every endpoint &mdash; focus on the core flows.
      </p>
      <pre><code>{`// API design — define the contract before drawing infrastructure

// REST API conventions:
// POST /resource       → create
// GET  /resource/:id   → read one
// GET  /resource       → list/search
// PATCH /resource/:id  → partial update
// DELETE /resource/:id → delete

// Core CV Builder API:

// Upload CV
POST /api/cvs/upload
Request: multipart/form-data { file: File }
Response: { cvId: string, status: "processing" }
Notes: Returns immediately. Parsing is async.

// Get CV status
GET /api/cvs/:cvId
Response: {
  cvId: string,
  status: "processing" | "ready" | "error",
  sections?: { contact, summary, experience, education, skills }
}

// Update CV section
PATCH /api/cvs/:cvId/sections/:section
Request: { content: SectionContent }
Response: { section: SectionContent, updatedAt: string }

// Export CV as PDF
POST /api/cvs/:cvId/export
Request: { template: "modern" | "classic" | "minimal" }
Response: { exportJobId: string }  // async — returns job ID

// Get export status / download URL
GET /api/exports/:exportJobId
Response: { status: "done" | "processing", downloadUrl?: string }

// Authentication
POST /api/auth/register  → create account
POST /api/auth/login     → returns JWT
POST /api/auth/refresh   → refresh access token

// API design principles:
// - Return job IDs for async operations, never block the response
// - Use consistent error format: { error: { code, message, details } }
// - Always version the API: /api/v1/ for breaking changes
// - Pagination on list endpoints: { data: [], nextCursor: string }`}</code></pre>

      <h2 id="step5-data-model">Step 5 &mdash; Data Model (5 min)</h2>
      <p>
        Define the key entities and their relationships. For SQL, think about tables and foreign
        keys. For DynamoDB, think about access patterns first.
      </p>
      <pre><code>{`// Data model — entities and access patterns

// DynamoDB single-table design:
// Access patterns drive the key design:
// 1. Get user by ID
// 2. Get all CVs for a user
// 3. Get a specific CV by ID
// 4. Get all sections of a CV
// 5. Get export job by ID

// Key design:
Table: cv-builder
PK              SK                  Attributes
USER#u-123      PROFILE             { name, email, createdAt, plan }
USER#u-123      CV#cv-456           { title, status, fileKey, createdAt }
USER#u-123      CV#cv-789           { title, status, fileKey, createdAt }
CV#cv-456       SECTION#contact     { name, email, phone, location }
CV#cv-456       SECTION#experience  { jobs: [...] }
CV#cv-456       SECTION#education   { schools: [...] }
CV#cv-456       EXPORT#exp-111      { status, template, downloadUrl, expiresAt }

// Access pattern implementations:
// 1. Get user: GetItem(PK=USER#u-123, SK=PROFILE)
// 2. Get user's CVs: Query(PK=USER#u-123, SK begins_with CV#)
// 3. Get CV: GetItem(PK=USER#u-123, SK=CV#cv-456)
// 4. Get CV sections: Query(PK=CV#cv-456, SK begins_with SECTION#)
// 5. Get export: GetItem(PK=CV#cv-456, SK=EXPORT#exp-111)

// S3 key structure:
// uploads/{userId}/{cvId}/original.pdf   ← uploaded file
// exports/{userId}/{cvId}/{exportId}.pdf ← generated PDF
// presigned-upload URL → browser uploads directly to S3 (never hits your API)`}</code></pre>

      <h2 id="step6-architecture">Step 6 &mdash; High-Level Architecture (10 min)</h2>
      <p>
        Draw the main components and how they connect. Start simple, then add complexity only where
        justified by the requirements and estimation from earlier steps.
      </p>
      <p>
        The standard components for a web application:
      </p>
      <pre><code>{`// High-level architecture — talk through each component

Browser/Mobile
  ↓
CloudFront CDN (static assets)
  ↓
ALB (Application Load Balancer)
  ↓
ECS Fargate (API service, 2 tasks, auto-scaling)
  ↓
  ├── DynamoDB (metadata, user data, CV sections)
  ├── S3 (file storage, presigned URLs for upload/download)
  ├── Redis / ElastiCache (session cache, rate limiting)
  └── SQS Queue → Lambda (async CV parsing worker)
              └── AI Provider (Claude/OpenAI for parsing)

Auth: AWS Cognito (user pool) + JWT

Observability:
  - CloudWatch Logs (all services)
  - CloudWatch Metrics + Alarms (error rate, latency)
  - X-Ray (distributed traces)

Security:
  - VPC: ECS in private subnets, ALB in public subnets
  - Secrets Manager: AI API keys, DB credentials
  - IAM roles on ECS tasks (no credentials in code)

CI/CD: GitHub Actions → ECR → ECS rolling deploy

// Talk through the request flow:
// 1. User uploads CV → POST /api/cvs/upload
// 2. API stores file metadata in DynamoDB (status: processing)
// 3. API uploads file to S3 using server-side upload (or returns presigned PUT URL)
// 4. API publishes message to SQS queue { cvId, s3Key }
// 5. API returns { cvId, status: "processing" } immediately (< 100ms)
// 6. Lambda worker picks up SQS message
// 7. Worker downloads file from S3
// 8. Worker calls AI provider to parse CV
// 9. Worker stores parsed sections in DynamoDB (status: ready)
// 10. User polls GET /api/cvs/:cvId or receives WebSocket notification`}</code></pre>

      <h2 id="step7-deep-dives">Step 7 &mdash; Deep Dives (15 min)</h2>
      <p>
        The interviewer will direct you to dig deeper into 2&ndash;3 specific areas. Common deep
        dive topics and what to say:
      </p>
      <ArticleTable caption="Common deep dive areas and what interviewers want to hear" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Deep dive area</th>
              <th>What interviewers look for</th>
              <th>Key points to cover</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Scaling</strong></td>
              <td>Can you scale each layer independently?</td>
              <td>Stateless API → horizontal scale. DB read replicas or DynamoDB. CDN for static. Queue absorbs spikes.</td>
            </tr>
            <tr>
              <td><strong>Database design</strong></td>
              <td>Are access patterns efficient? How do you handle growth?</td>
              <td>Indexes on hot query paths. Pagination. Sharding strategy if needed. Read/write separation.</td>
            </tr>
            <tr>
              <td><strong>Reliability</strong></td>
              <td>What happens when components fail?</td>
              <td>Multi-AZ deployment. Health checks. Circuit breakers. DLQ for failed queue messages. Retry strategies.</td>
            </tr>
            <tr>
              <td><strong>Async processing</strong></td>
              <td>How do you handle failures in the worker?</td>
              <td>Idempotency keys. DLQ after 3 retries. Exponential backoff. Status tracking in DB. User notification.</td>
            </tr>
            <tr>
              <td><strong>Security</strong></td>
              <td>Is user data protected?</td>
              <td>Private subnets. IAM roles. Encryption at rest and in transit. Presigned URLs expire. Cognito JWT validation.</td>
            </tr>
            <tr>
              <td><strong>Observability</strong></td>
              <td>How do you know when something breaks?</td>
              <td>Structured logs with correlation IDs. Error rate and latency alarms. Distributed traces. SLOs defined.</td>
            </tr>
            <tr>
              <td><strong>Cost optimization</strong></td>
              <td>Is this architecture cost-efficient?</td>
              <td>Fargate Spot for workers. S3 lifecycle to Glacier. CloudFront reduces egress. DynamoDB on-demand vs provisioned.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="step8-tradeoffs">Step 8 &mdash; Tradeoffs and Close (5 min)</h2>
      <p>
        End by naming the explicit tradeoffs you accepted. This is where senior engineers separate
        themselves &mdash; juniors design without acknowledging tradeoffs, seniors design with them.
      </p>
      <pre><code>{`// Tradeoff summary — say something like this:

"Let me call out the key design decisions and their tradeoffs:

1. ECS Fargate over Lambda for the API:
   Chose: Persistent container (ECS) for the API service
   Because: More predictable latency, no cold starts, easier to run Node.js long-lived server
   Tradeoff: More expensive at low traffic; Lambda would be cheaper if traffic is very spiky.
   Revisit: If usage is bursty with long idle periods, switch to Lambda.

2. DynamoDB over PostgreSQL:
   Chose: DynamoDB for primary data store
   Because: Scales horizontally without ops work, single-digit ms at any scale, good for key-value access
   Tradeoff: No joins, no ad-hoc queries. Must design access patterns upfront.
   Revisit: If we need complex reporting or analytics, add a read replica in PostgreSQL or Redshift.

3. Eventual consistency for CV sections:
   Chose: DynamoDB eventual reads (default) for section display
   Because: Faster reads, lower cost, and staleness is unnoticeable (we just parsed, user doesn't re-read immediately)
   Tradeoff: Very brief window where a refresh might show old data.
   Revisit: Use ConsistentRead: true immediately after a write if user-facing freshness is critical.

4. SQS + Lambda for parsing over in-process:
   Chose: Async queue-based processing
   Because: AI calls take 2–30 seconds; keeping them in the request path would mean timeouts and poor UX
   Tradeoff: More moving parts, harder to debug, eventual consistency on status.
   Revisit: If AI provider had sub-100ms streaming, we could explore server-sent events for real-time."`}</code></pre>

      <h2 id="senior-phrases">Senior-Level Phrases to Use</h2>
      <ul>
        <li><strong>&quot;Let me clarify the requirements before proposing a solution...&quot;</strong> — signals disciplined process</li>
        <li><strong>&quot;The key tradeoff here is X vs Y. Given [constraint], I would choose X because...&quot;</strong> — shows nuanced thinking</li>
        <li><strong>&quot;I am going to start with the simplest design that meets these requirements, and we can add complexity where needed.&quot;</strong> — avoids premature optimization</li>
        <li><strong>&quot;The bottleneck at this scale is [X]. Here is how I would address it...&quot;</strong> — demonstrates performance intuition</li>
        <li><strong>&quot;If we need to scale this 10x, the first thing I would change is...&quot;</strong> — shows growth thinking</li>
        <li><strong>&quot;Let me make an explicit assumption here: [assumption]. We can revisit this if that is wrong.&quot;</strong> — surfaces assumptions rather than hiding them</li>
        <li><strong>&quot;The failure mode I am most concerned about is [X]. Here is how I would handle it...&quot;</strong> — shows production mindset</li>
        <li><strong>&quot;I would instrument this with [specific metrics] and set an alert when [threshold].&quot;</strong> — shows observability discipline</li>
      </ul>

      <InterviewPlaybook
        title="45-Minute Interview Time Budget"
        intro="This is how to allocate time across the 8 steps in a standard 45-minute system design interview."
        steps={[
          "0–5 min: Clarify requirements. Ask 4–6 focused questions. Do not draw anything yet.",
          "5–8 min: State requirements out loud (functional and non-functional). Get interviewer confirmation.",
          "8–13 min: Quick capacity estimation. Talk through math out loud — this shows your reasoning process.",
          "13–18 min: Sketch the API design. 3–5 core endpoints. Request/response shape for the most critical flow.",
          "18–23 min: Data model. Which database, why, key schema decisions.",
          "23–33 min: High-level architecture diagram. Draw components, connect them, narrate the request flow.",
          "33–43 min: Deep dives on areas the interviewer selects. Be prepared for: scaling, database, reliability, security, observability.",
          "43–45 min: Tradeoffs summary. Name 3 key design choices and what you would revisit if requirements changed.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes to Avoid</h2>
      <ul>
        <li>
          <strong>Jumping to the solution before clarifying.</strong> Starting to draw architecture
          before asking any questions is the single most common mistake. It signals you do not know
          how to work with ambiguous requirements &mdash; a core senior skill.
        </li>
        <li>
          <strong>Over-engineering the happy path.</strong> Designing a globally distributed,
          multi-region active-active system for a product with 10k users is a red flag. Show that
          you can right-size architecture to the actual requirements.
        </li>
        <li>
          <strong>Forgetting failure modes.</strong> Interviewers expect you to ask: &quot;What
          happens if the queue worker crashes mid-processing?&quot; Design for partial failures,
          not just the happy path.
        </li>
        <li>
          <strong>Using technology without justifying the choice.</strong> &quot;We&apos;ll use
          Kafka&quot; without explaining why Kafka over SQS is a weak answer. Always justify tool
          choices against requirements.
        </li>
        <li>
          <strong>Not discussing tradeoffs.</strong> Every architectural decision has a tradeoff.
          If you present a design without any &quot;we chose X over Y because...&quot;, you are
          missing the most important part of the evaluation.
        </li>
        <li>
          <strong>Running silent.</strong> Think out loud. Interviewers evaluate your reasoning
          process, not just the final diagram. A thoughtful wrong answer is better than a silent
          right answer.
        </li>
      </ul>

      <h2 id="checklist">Pre-Interview Checklist</h2>
      <p>
        Before any system design interview, make sure you can explain each of these from memory:
      </p>
      <ArticleTable caption="System design readiness checklist" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Can you explain it in 2 minutes?</th>
              <th>Can you justify when to use it?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>DNS, CDN, Load Balancer</td><td>☐</td><td>☐</td></tr>
            <tr><td>SQL vs NoSQL tradeoffs</td><td>☐</td><td>☐</td></tr>
            <tr><td>DynamoDB access patterns and single-table design</td><td>☐</td><td>☐</td></tr>
            <tr><td>Horizontal vs vertical scaling</td><td>☐</td><td>☐</td></tr>
            <tr><td>Cache-aside pattern and cache invalidation</td><td>☐</td><td>☐</td></tr>
            <tr><td>Queue + worker pattern and idempotency</td><td>☐</td><td>☐</td></tr>
            <tr><td>Circuit breaker and retry with backoff</td><td>☐</td><td>☐</td></tr>
            <tr><td>Multi-AZ vs multi-region and when each matters</td><td>☐</td><td>☐</td></tr>
            <tr><td>JWT vs sessions and OAuth2 flow</td><td>☐</td><td>☐</td></tr>
            <tr><td>Logs, metrics, traces and correlation IDs</td><td>☐</td><td>☐</td></tr>
            <tr><td>CAP theorem (CP vs AP, not C vs A vs P)</td><td>☐</td><td>☐</td></tr>
            <tr><td>Back-of-envelope QPS and storage estimation</td><td>☐</td><td>☐</td></tr>
            <tr><td>Blue/green vs canary vs rolling deployment</td><td>☐</td><td>☐</td></tr>
          </tbody>
        </table>
      </ArticleTable>
    </div>
  );
}
