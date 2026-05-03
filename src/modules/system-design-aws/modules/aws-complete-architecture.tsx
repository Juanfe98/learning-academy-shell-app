import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const highLevelDiagram = String.raw`flowchart TD
    BROWSER["User Browser\nReact SPA"]

    subgraph ENTRY["Traffic Entry"]
        CF["CloudFront CDN\nSPA hosting + API caching"]
        WAF["AWS WAF\nBot protection + rate limiting"]
        ALB["Application Load Balancer\nHTTPS termination"]
    end

    subgraph AUTH["Authentication"]
        COG["Cognito User Pool\nJWT issuance"]
    end

    subgraph APP["Application Layer — Private Subnet"]
        ECS["ECS Fargate\nNode.js API × 2 tasks\nauto-scaling 2–10"]
    end

    subgraph DATA["Data Layer — Private Subnet"]
        DDB["DynamoDB\nOn-demand\nUsers, CVs, sections"]
        REDIS["ElastiCache Redis\nSession cache\nFrequent CV reads"]
    end

    subgraph FILES["File Storage"]
        S3_UP["S3 Uploads Bucket\nOriginal files\nSSE-KMS encrypted"]
        S3_EX["S3 Exports Bucket\nGenerated PDFs\nPresigned download URLs"]
    end

    subgraph ASYNC["Async Processing"]
        SQS["SQS Queue\nCV parse jobs"]
        DLQ["SQS DLQ\nFailed after 3 retries"]
        LAMBDA["Lambda Worker\nCV parsing\n15 min max"]
        AI["AI Provider\nClaude or OpenAI"]
    end

    subgraph OBS["Observability"]
        CW["CloudWatch\nLogs + Metrics + Alarms"]
        XR["X-Ray\nDistributed traces"]
    end

    BROWSER --> CF
    CF --> WAF --> ALB
    CF --> COG
    ALB --> ECS
    ECS --> DDB & REDIS & S3_UP
    ECS --> SQS
    SQS --> LAMBDA
    LAMBDA --> S3_UP & AI & DDB & S3_EX
    SQS -->|after 3 retries| DLQ
    ECS & LAMBDA --> CW & XR`;

const uploadSequenceDiagram = String.raw`sequenceDiagram
    participant B as Browser
    participant API as ECS API
    participant S3 as S3 Uploads
    participant SQS as SQS Queue
    participant DB as DynamoDB
    participant W as Lambda Worker
    participant AI as AI Provider

    B->>API: POST /api/cvs/upload-url
    API->>DB: Create CV record (status: uploading)
    API->>S3: Generate presigned PUT URL
    API-->>B: { cvId, uploadUrl }

    B->>S3: PUT file (direct upload, no API hop)
    S3-->>B: 200 OK

    B->>API: POST /api/cvs/:cvId/complete
    API->>DB: Update status: processing
    API->>SQS: Publish { cvId, s3Key }
    API-->>B: { cvId, status: processing }

    Note over W: Async — user not waiting
    W->>SQS: Poll message
    W->>S3: Download file
    W->>AI: POST /parse (with file content)
    AI-->>W: Structured CV data
    W->>DB: Save sections, update status: ready
    W->>S3: Upload thumbnail (optional)
    W->>SQS: Delete message`;

export const toc: TocItem[] = [
  { id: "scenario", title: "The Scenario", level: 2 },
  { id: "high-level", title: "High-Level Architecture", level: 2 },
  { id: "frontend", title: "Frontend Hosting", level: 2 },
  { id: "authentication", title: "Authentication (Cognito)", level: 2 },
  { id: "api-layer", title: "API Layer (ECS Fargate + ALB)", level: 2 },
  { id: "database", title: "Database (DynamoDB)", level: 2 },
  { id: "file-storage", title: "File Storage (S3)", level: 2 },
  { id: "async-processing", title: "Async Processing (SQS + Lambda)", level: 2 },
  { id: "ai-integration", title: "AI Provider Integration", level: 2 },
  { id: "caching", title: "Caching Strategy (Redis + CloudFront)", level: 2 },
  { id: "security", title: "Security Architecture", level: 2 },
  { id: "observability", title: "Observability", level: 2 },
  { id: "cicd", title: "CI/CD Pipeline", level: 2 },
  { id: "cost", title: "Cost Estimate", level: 2 },
  { id: "failure-handling", title: "Failure Scenarios", level: 2 },
  { id: "tradeoffs", title: "Tradeoffs Table", level: 2 },
  { id: "interview-explanation", title: "5-Minute Interview Explanation", level: 2 },
];

export default function AwsCompleteArchitecture() {
  return (
    <div className="article-content">
      <p>
        This module connects every concept from the academy into a single, complete AWS architecture.
        The system we are designing is a CV Builder application &mdash; a product where users upload
        their existing CVs, an AI parses and structures the content, they edit the result, and export
        a formatted PDF. This is not a toy example: it touches file storage, async processing, AI
        integration, authentication, caching, observability, and multi-AZ reliability.
      </p>
      <p>
        Read this module as if you are presenting it in a system design interview. Each section
        explains not just what was chosen, but why &mdash; and what was rejected.
      </p>

      <h2 id="scenario">The Scenario</h2>
      <p>
        <strong>Product:</strong> CV Builder &mdash; users upload CVs, AI parses them, users edit
        and export PDFs.
      </p>
      <p><strong>Scale assumptions (start of the exercise):</strong></p>
      <ul>
        <li>100k DAU at launch, designed to scale to 1M DAU</li>
        <li>Average 20 API calls per user per day → ~23 average QPS, 70 peak QPS</li>
        <li>500 CV uploads per day at launch</li>
        <li>Average CV file: 2MB. Average 3 CVs per user stored.</li>
        <li>AI parsing: 5–30 seconds per CV (highly variable)</li>
        <li>Availability target: 99.9% (8.7 hours downtime/year)</li>
        <li>Latency target: API p99 &lt; 200ms, async parsing: user notified when done</li>
      </ul>

      <h2 id="high-level">High-Level Architecture</h2>
      <MermaidDiagram
        chart={highLevelDiagram}
        title="CV Builder — Complete AWS Architecture"
        caption="Traffic enters through CloudFront. ECS Fargate handles the API. Async parsing goes through SQS to Lambda. All services sit in private subnets."
        minHeight={620}
      />

      <h2 id="frontend">Frontend Hosting</h2>
      <p>
        <strong>Choice: S3 + CloudFront</strong>
      </p>
      <p>
        The React SPA is built to static files (HTML, JS, CSS) and uploaded to an S3 bucket. CloudFront
        serves these files from 400+ edge locations globally, meaning users in São Paulo get the same
        fast load time as users in Virginia.
      </p>
      <pre><code>{`// S3 bucket for SPA hosting
resource "aws_s3_bucket" "frontend" {
  bucket = "cv-builder-frontend-prod-\${account_id}"
}
// Bucket is PRIVATE — CloudFront accesses it via Origin Access Control (OAC)
// Never make the bucket public; use CloudFront as the only entrypoint

// CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  origins = [{
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    s3_origin_config = { origin_access_identity = aws_cloudfront_origin_access_identity.oai.path }
  }]

  default_cache_behavior = {
    viewer_protocol_policy = "redirect-to-https"
    compress               = true  // Brotli + gzip compression
    // Cache-Control on HTML: no-cache (always re-validate, picks up new deployments)
    // Cache-Control on JS/CSS/assets: max-age=31536000 (1 year, content-hashed filenames)
  }
}

// Deployment: GitHub Actions runs 'pnpm build', uploads to S3, invalidates CloudFront cache
// aws s3 sync dist/ s3://cv-builder-frontend-prod/
// aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
// This takes ~30s — zero-downtime because old files are replaced atomically`}</code></pre>
      <p>
        <strong>Why not Amplify?</strong> AWS Amplify is a higher-level service that wraps
        S3 + CloudFront with a managed CI/CD pipeline. It is a valid choice for teams that want
        less configuration. We choose bare S3 + CloudFront here for more control over caching
        behaviors, custom headers, and WAF integration. At scale, the two approaches are equivalent.
      </p>

      <h2 id="authentication">Authentication (Cognito)</h2>
      <p>
        <strong>Choice: Cognito User Pool + JWT</strong>
      </p>
      <pre><code>{`// Cognito User Pool handles:
// - Sign up (email + password, or social: Google, Apple)
// - Sign in → returns access token + refresh token + ID token
// - Token refresh (automatic in Amplify Auth SDK)
// - MFA (optional, can enable for enterprise tier)
// - Email verification
// - Password reset

// Access token: JWT, signed by Cognito, valid 1 hour
// Refresh token: opaque, valid 30 days, used to get new access tokens

// API validates JWT on every request:
// 1. Extract Bearer token from Authorization header
// 2. Verify JWT signature using Cognito's public JWKS endpoint
//    (https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json)
// 3. Check exp claim (not expired)
// 4. Check aud claim (this token was issued for our app)
// 5. Extract sub claim (this is the userId)
// All done in middleware — no database call required

// Express middleware example:
import { CognitoJwtVerifier } from 'aws-jwt-verify';
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
});

app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = await verifier.verify(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});`}</code></pre>

      <h2 id="api-layer">API Layer (ECS Fargate + ALB)</h2>
      <p>
        <strong>Choice: ECS Fargate (not Lambda) behind ALB (not API Gateway)</strong>
      </p>
      <p>
        <strong>Why ECS over Lambda for the API:</strong> The API is a persistent Node.js server
        that maintains a DynamoDB connection pool and Redis connection. Lambda&apos;s stateless
        invocation model means every Lambda would open a new connection to Redis &mdash; at 70 QPS,
        this creates connection churn. ECS Fargate runs 2 always-on containers that maintain
        persistent connections.
      </p>
      <p>
        <strong>Why ALB over API Gateway:</strong> At the scale we are designing for, ALB is
        significantly cheaper than API Gateway. API Gateway charges $3.50 per million requests;
        ALB charges $0.008 per LCU-hour (typically much cheaper at moderate volume). ALB also has
        lower operational complexity for an ECS backend.
      </p>
      <pre><code>{`// ECS Fargate task configuration
{
  cpu: 512,           // 0.5 vCPU
  memory: 1024,       // 1 GB RAM
  desiredCount: 2,    // minimum 2 for high availability (one per AZ)
  // auto-scaling: 2–10 based on CPU target tracking at 70%

  environment: [
    { name: 'TABLE_NAME', value: 'cv-builder-prod' },
    { name: 'UPLOADS_BUCKET', value: 'cv-builder-uploads-prod' },
    { name: 'REDIS_HOST', value: 'elasticache-cluster.xxxxx.cache.amazonaws.com' },
  ],

  secrets: [
    // Retrieved from Secrets Manager at task startup — never in plaintext
    { name: 'AI_API_KEY', valueFrom: 'arn:aws:secretsmanager:...:secret:ai-api-key' }
  ],

  logConfiguration: {
    logDriver: 'awslogs',
    options: {
      'awslogs-group': '/ecs/cv-builder-api',
      'awslogs-region': 'us-east-1',
    }
  },

  healthCheck: {
    command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
    interval: 30,
    timeout: 5,
    retries: 3,
    startPeriod: 60,  // Grace period for initial startup
  }
}`}</code></pre>

      <h2 id="database">Database (DynamoDB)</h2>
      <p>
        <strong>Choice: DynamoDB on-demand (not RDS PostgreSQL)</strong>
      </p>
      <p>
        The access patterns for this application are well-defined and simple: get user by ID, get
        user&apos;s CVs, get sections of a specific CV. There are no complex joins, no ad-hoc
        queries, and the scale will eventually require horizontal partitioning. DynamoDB fits
        perfectly.
      </p>
      <p>
        <strong>Why not PostgreSQL:</strong> PostgreSQL would require a primary + read replica,
        multi-AZ standby, a connection pool (PgBouncer or RDS Proxy), and manual scaling decisions
        as data grows. For this access pattern, it adds operational complexity without benefit.
      </p>
      <pre><code>{`// DynamoDB single-table design
Table: cv-builder-prod
PK                    SK                    Attributes
USER#u-123            PROFILE               { name, email, plan, createdAt }
USER#u-123            CV#cv-456             { title, status, fileKey, createdAt, updatedAt }
CV#cv-456             SECTION#contact       { name, email, phone, location, linkedin }
CV#cv-456             SECTION#summary       { text }
CV#cv-456             SECTION#experience    { jobs: [{company, role, dates, bullets}] }
CV#cv-456             SECTION#education     { schools: [{name, degree, year}] }
CV#cv-456             SECTION#skills        { categories: [{name, skills: []}] }
CV#cv-456             EXPORT#exp-789        { status, template, downloadKey, expiresAt }

// Key access patterns:
// 1. Get user profile:
//    GetItem(PK=USER#u-123, SK=PROFILE)
// 2. List user's CVs:
//    Query(PK=USER#u-123, SK begins_with CV#)
// 3. Get all sections of a CV:
//    Query(PK=CV#cv-456, SK begins_with SECTION#)
// 4. Get a specific section:
//    GetItem(PK=CV#cv-456, SK=SECTION#experience)
// 5. Get export status:
//    GetItem(PK=CV#cv-456, SK=EXPORT#exp-789)

// Billing: PAY_PER_REQUEST (on-demand)
// At 100k DAU × 20 requests × avg 3 DynamoDB ops = 6M ops/day
// At $1.25/million reads → ~$7.50/day for reads → $225/month → negligible`}</code></pre>

      <h2 id="file-storage">File Storage (S3)</h2>
      <pre><code>{`// Two S3 buckets with different access patterns

// Bucket 1: Uploads (user-submitted files)
cv-builder-uploads-prod-{accountId}
├── uploads/{userId}/{cvId}/original.pdf   ← user's original file
└── uploads/{userId}/{cvId}/original.docx  ← or DOCX

// Bucket 2: Exports (generated PDFs)
cv-builder-exports-prod-{accountId}
└── exports/{userId}/{cvId}/{exportId}.pdf  ← generated PDF

// Upload flow using presigned URL:
// 1. Client → POST /api/cvs/upload-url
// 2. API generates presigned PUT URL (expires in 15 minutes):
const { url } = await s3Client.getSignedUrlPromise('putObject', {
  Bucket: process.env.UPLOADS_BUCKET,
  Key: \`uploads/\${userId}/\${cvId}/original.pdf\`,
  ContentType: 'application/pdf',
  ContentLength: requestedSize,  // enforce size limit at S3 level
  Expires: 900,  // 15 minutes
});
// 3. Client uploads directly to S3 — API never sees the bytes
// 4. Client notifies API: POST /api/cvs/:cvId/complete

// Download flow (presigned GET URL):
// 1. Client → POST /api/exports/:exportId/download-url
// 2. API verifies user owns the export (DynamoDB lookup)
// 3. API generates presigned GET URL (expires in 5 minutes):
const { url } = await s3Client.getSignedUrlPromise('getObject', {
  Bucket: process.env.EXPORTS_BUCKET,
  Key: \`exports/\${userId}/\${cvId}/\${exportId}.pdf\`,
  Expires: 300,  // 5 minutes — short expiry for security
  ResponseContentDisposition: 'attachment; filename="my-cv.pdf"',
});
// 4. Client downloads directly from S3

// Security:
// Both buckets: BlockPublicAccess enabled, no public policy
// Uploads bucket: only the API's IAM role can write (s3:PutObject)
// Exports bucket: Lambda worker writes, API reads
// All objects: SSE-KMS encryption at rest`}</code></pre>

      <h2 id="async-processing">Async Processing (SQS + Lambda)</h2>
      <MermaidDiagram
        chart={uploadSequenceDiagram}
        title="CV Upload and Parsing Sequence"
        caption="Presigned URL upload bypasses the API. SQS decouples the API from the slow AI parsing step."
        minHeight={500}
      />
      <pre><code>{`// Lambda worker configuration
{
  runtime: 'nodejs20.x',
  timeout: 900,          // 15 minutes max — AI parsing can take 30s
  memorySize: 1024,      // more memory = more CPU allocation in Lambda
  reservedConcurrency: 10,  // max 10 concurrent parse jobs (protect AI provider rate limit)

  environment: {
    DYNAMODB_TABLE: 'cv-builder-prod',
    UPLOADS_BUCKET: 'cv-builder-uploads-prod',
    EXPORTS_BUCKET: 'cv-builder-exports-prod',
  }
}

// SQS trigger configuration
{
  batchSize: 1,          // process one CV at a time (AI calls are slow, no benefit to batching)
  maximumBatchingWindow: 0,
  functionResponseTypes: ['ReportBatchItemFailures'],  // partial failures
}

// Lambda worker code (simplified):
export const handler = async (event) => {
  const failures = [];
  for (const record of event.Records) {
    const { cvId, s3Key, userId } = JSON.parse(record.body);
    try {
      // 1. Idempotency check
      const cv = await dynamodb.getItem({ PK: \`CV#\${cvId}\`, SK: \`CV#\${cvId}\` });
      if (cv.status === 'ready') continue;  // already processed

      // 2. Download from S3
      const file = await s3.getObject({ Bucket: UPLOADS_BUCKET, Key: s3Key }).Body;

      // 3. Call AI provider with retry
      const parsed = await callAIWithRetry(file, { maxRetries: 3, backoff: 'exponential' });

      // 4. Store sections in DynamoDB (batch write)
      await batchWriteSections(cvId, parsed);

      // 5. Update CV status to 'ready'
      await dynamodb.updateItem({
        PK: \`CV#\${cvId}\`,
        SK: \`CV#\${cvId}\`,
        status: 'ready',
        parsedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error({ cvId, error: error.message });
      failures.push({ itemIdentifier: record.messageId });
      // SQS retries failed messages; after 3 retries → DLQ
    }
  }
  return { batchItemFailures: failures };
};

// DLQ alerting:
// CloudWatch alarm on DLQ depth > 0
// SNS notification → on-call engineer
// Runbook: inspect DLQ messages, identify root cause (corrupt file? AI provider issue?)
// Replay DLQ once resolved: aws sqs receive-message --queue-url DLQ_URL | replay to main queue`}</code></pre>

      <h2 id="ai-integration">AI Provider Integration</h2>
      <pre><code>{`// AI provider integration with resilience patterns

async function callAIWithRetry(fileContent, options) {
  const { maxRetries = 3 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Parse this CV and return structured JSON...' },
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileContent.toString('base64') } }
          ]
        }]
      });
      return JSON.parse(response.content[0].text);

    } catch (error) {
      if (error.status === 429) {
        // Rate limited — exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
        await sleep(delay);
      } else if (error.status >= 500) {
        // Transient provider error — retry
        await sleep(1000 * attempt);
      } else {
        // Client error (400s except 429) — do not retry, fail immediately
        throw error;
      }
    }
  }
  throw new Error('AI provider failed after max retries');
}

// Cost optimization:
// Cache AI responses for identical file hashes
// Store file SHA-256 in DynamoDB; if same hash exists, copy existing parse result
// This handles users uploading the same CV multiple times`}</code></pre>

      <h2 id="caching">Caching Strategy (Redis + CloudFront)</h2>
      <pre><code>{`// Two-layer caching:

// Layer 1: CloudFront (edge cache for static and semi-static API responses)
// Cache the /api/cvs list response per user for 30 seconds:
// API sets: Cache-Control: public, max-age=30, s-maxage=30
// CloudFront caches with Vary: Authorization (per-user cache)
// Good for: CV list, export status polling (eventually consistent OK)

// Layer 2: Redis (application cache for DynamoDB reads)
// Cache CV sections (the parsed content, frequently read while editing):
// Key: cv-sections:{cvId}
// TTL: 5 minutes
// Invalidate: when sections are updated via PATCH /api/cvs/:cvId/sections/:section

// Redis implementation:
async function getCVSections(cvId) {
  const cacheKey = \`cv-sections:\${cvId}\`;

  // Cache-aside pattern:
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss: read from DynamoDB
  const sections = await dynamodb.query({
    PK: \`CV#\${cvId}\`,
    SK: { beginsWith: 'SECTION#' }
  });

  // Store in cache with TTL
  await redis.setex(cacheKey, 300, JSON.stringify(sections));  // 300s = 5 minutes
  return sections;
}

async function updateSection(cvId, sectionName, content) {
  // Write to DynamoDB
  await dynamodb.putItem({ PK: \`CV#\${cvId}\`, SK: \`SECTION#\${sectionName}\`, ...content });

  // Invalidate the cache entry for this CV
  await redis.del(\`cv-sections:\${cvId}\`);
}

// ElastiCache Redis cluster:
// t3.micro (1 GB): $0.017/hour = ~$12/month — sufficient for 100k DAU with selective caching
// Upgrade to r6g.large if Redis becomes a bottleneck`}</code></pre>

      <h2 id="security">Security Architecture</h2>
      <pre><code>{`// Security layers:

// 1. Network isolation (VPC)
// - ALB: public subnet (has internet access)
// - ECS tasks: private subnet (no direct internet access)
// - ElastiCache: private subnet
// - No security groups expose database ports to 0.0.0.0/0

// 2. IAM roles (no credentials in code)
// ECS task role:
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
    "dynamodb:Query", "dynamodb:BatchWriteItem"
  ],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/cv-builder-prod"
},
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::cv-builder-uploads-prod/*"
},
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:ai-api-key-*"
}

// 3. Encryption
// - DynamoDB: encryption at rest with AWS-managed key (default)
// - S3: SSE-KMS with customer-managed key
// - All traffic: HTTPS only (CloudFront + ALB with SSL certificate from ACM)
// - Redis: encryption in-transit and at-rest

// 4. Secrets management
// AI API key → Secrets Manager
// Retrieved by ECS task at startup, cached in memory for process lifetime
// Lambda retrieves from Secrets Manager on cold start (cached via Lambda extensions)

// 5. WAF rules on CloudFront
// - AWS Managed Rule Groups: Core rule set (XSS, SQLi, known bad IPs)
// - Rate limit: 100 requests/5-min per IP for login endpoints
// - Rate limit: 1000 requests/5-min per IP for API endpoints`}</code></pre>

      <h2 id="observability">Observability</h2>
      <pre><code>{`// Structured logging (all ECS and Lambda services):
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()],  // CloudWatch picks this up
});

// Every request log:
logger.info('request', {
  requestId: req.headers['x-amzn-trace-id'],  // X-Ray trace ID, also used as correlation ID
  userId: req.userId,
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  durationMs: Date.now() - req.startTime,
  userAgent: req.headers['user-agent'],
});

// CloudWatch Alarms:
// 1. API error rate > 1% (5xx responses / total requests, 5-minute window)
//    → SNS → PagerDuty/Slack alert
// 2. API p99 latency > 500ms (5-minute window)
//    → SNS → Slack warning
// 3. DLQ messages > 0
//    → SNS → PagerDuty alert (CV parsing failures)
// 4. ECS CPU > 80% for 10 minutes
//    → SNS → Slack warning (auto-scaling should kick in, but confirm)
// 5. DynamoDB throttled requests > 0 (should be 0 with on-demand)
//    → SNS → alert

// X-Ray tracing:
// Enabled on ECS task via AWS X-Ray SDK
// Traces: incoming request → DynamoDB calls → Redis calls → SQS publish
// Lambda: automatic tracing via AWS_XRAY_DAEMON_ADDRESS environment variable
// Service map in X-Ray console shows end-to-end latency breakdown

// Custom CloudWatch metrics (business KPIs):
await cloudwatch.putMetricData({
  Namespace: 'CVBuilder/Business',
  MetricData: [
    { MetricName: 'CVUploads', Value: 1, Unit: 'Count' },
    { MetricName: 'CVParseLatencySeconds', Value: parseTimeSeconds, Unit: 'Seconds' },
    { MetricName: 'PDFExports', Value: 1, Unit: 'Count' },
  ]
});`}</code></pre>

      <h2 id="cicd">CI/CD Pipeline</h2>
      <pre><code>{`# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm test && pnpm build

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsDeployRole
          aws-region: us-east-1

      - name: Build and push Docker image to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin ECR_REGISTRY
          docker build -t $ECR_REGISTRY/cv-builder-api:$GITHUB_SHA .
          docker push $ECR_REGISTRY/cv-builder-api:$GITHUB_SHA

      - name: Deploy to ECS (rolling update)
        run: |
          aws ecs update-service \\
            --cluster cv-builder-prod \\
            --service api \\
            --force-new-deployment
          # ECS rolling deployment:
          # - Starts 1 new task (with new image)
          # - Waits for health check to pass
          # - Stops 1 old task
          # - Repeats until all tasks updated
          # - Zero downtime: always >= 1 task healthy

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build:frontend
      - run: aws s3 sync dist/ s3://cv-builder-frontend-prod/ --delete
      - run: aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"`}</code></pre>

      <h2 id="cost">Cost Estimate</h2>
      <ArticleTable caption="Monthly cost estimate at 100k DAU (us-east-1)" minWidth={680}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Configuration</th>
              <th>Monthly cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ECS Fargate</td>
              <td>2 tasks × 0.5 vCPU × 1GB, always-on</td>
              <td>~$35</td>
            </tr>
            <tr>
              <td>ALB</td>
              <td>1 ALB, moderate LCU usage</td>
              <td>~$20</td>
            </tr>
            <tr>
              <td>DynamoDB</td>
              <td>On-demand, 6M reads + 2M writes/day</td>
              <td>~$30</td>
            </tr>
            <tr>
              <td>ElastiCache Redis</td>
              <td>1× cache.t3.micro</td>
              <td>~$12</td>
            </tr>
            <tr>
              <td>S3 (uploads + exports)</td>
              <td>600 GB storage + 500 uploads/day egress</td>
              <td>~$20</td>
            </tr>
            <tr>
              <td>CloudFront</td>
              <td>100GB/month transfer, 10M requests</td>
              <td>~$15</td>
            </tr>
            <tr>
              <td>Lambda (workers)</td>
              <td>500 invocations/day × 15s avg</td>
              <td>~$2</td>
            </tr>
            <tr>
              <td>SQS</td>
              <td>1M messages/month</td>
              <td>~$0.40</td>
            </tr>
            <tr>
              <td>Secrets Manager</td>
              <td>2 secrets</td>
              <td>~$0.80</td>
            </tr>
            <tr>
              <td>Cognito</td>
              <td>100k MAU</td>
              <td>Free (first 50k MAU free, then $0.0055/MAU)</td>
            </tr>
            <tr>
              <td>CloudWatch</td>
              <td>Logs + metrics + alarms</td>
              <td>~$10</td>
            </tr>
            <tr>
              <td><strong>Total AWS</strong></td>
              <td></td>
              <td><strong>~$145/month</strong></td>
            </tr>
            <tr>
              <td>AI Provider (Claude/OpenAI)</td>
              <td>500 CVs/day × avg 3000 tokens</td>
              <td>~$150–300/month (dominant cost)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The AI provider cost is the dominant cost and scales linearly with CV uploads. At 10x scale
        (5,000 uploads/day), AI costs reach $1,500–3,000/month. This drives the decision to cache
        parse results for identical file hashes and consider batch processing for non-real-time use cases.
      </p>

      <h2 id="failure-handling">Failure Scenarios</h2>
      <ArticleTable caption="What happens when each component fails" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Component failure</th>
              <th>Impact</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>One ECS task crashes</td>
              <td>ALB routes all traffic to remaining task; ECS starts replacement</td>
              <td>ECS health checks detect crash; replacement starts within 30s; ALB health checks remove unhealthy target</td>
            </tr>
            <tr>
              <td>One AZ goes down</td>
              <td>Half of ECS tasks lost; ALB reroutes to surviving AZ</td>
              <td>ALB is multi-AZ; ECS has tasks in both AZs; DynamoDB is multi-AZ automatically; Redis has replica in second AZ</td>
            </tr>
            <tr>
              <td>Redis goes down</td>
              <td>Cache misses → all reads go to DynamoDB; higher latency but service continues</td>
              <td>API should handle Redis connection errors gracefully (cache-aside: on exception, go to DB). DynamoDB can handle the full read load.</td>
            </tr>
            <tr>
              <td>AI provider is down or slow</td>
              <td>CV parsing fails; Lambda retries 3x with backoff; moves to DLQ</td>
              <td>User sees &quot;processing&quot; status for longer. DLQ alarm fires. Replay DLQ when provider recovers. Uploads still work; only parsing delayed.</td>
            </tr>
            <tr>
              <td>S3 PUT fails mid-upload</td>
              <td>Client gets S3 error; file not stored</td>
              <td>Client SDK retries the upload. DynamoDB record stays &quot;uploading.&quot; Client can re-request presigned URL and retry. S3 multi-part upload for files &gt;5MB provides resumability.</td>
            </tr>
            <tr>
              <td>DynamoDB throttling</td>
              <td>Requests fail with ProvisionedThroughputExceededException</td>
              <td>On-demand billing automatically scales (no throttling in normal operation). If hitting warm-up limits during a traffic spike, AWS DynamoDB Adaptive Capacity absorbs burst.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="tradeoffs">Tradeoffs Table</h2>
      <ArticleTable caption="Key architectural decisions and their tradeoffs" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Decision</th>
              <th>Chosen</th>
              <th>Alternative</th>
              <th>Why chosen</th>
              <th>When to revisit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compute</td>
              <td>ECS Fargate</td>
              <td>Lambda for API</td>
              <td>Persistent connections to Redis/DynamoDB; no cold starts; easier to tune</td>
              <td>If traffic becomes extremely spiky and idle costs are significant</td>
            </tr>
            <tr>
              <td>Database</td>
              <td>DynamoDB</td>
              <td>PostgreSQL (RDS)</td>
              <td>Access patterns are key-value; infinite horizontal scale; no ops overhead</td>
              <td>If complex analytics queries are needed; add Redshift as read path</td>
            </tr>
            <tr>
              <td>API entry</td>
              <td>ALB</td>
              <td>API Gateway</td>
              <td>Cheaper at volume; simpler for ECS; more flexible header handling</td>
              <td>If Lambda-backed routes are added and API management features (throttling, usage plans) are needed</td>
            </tr>
            <tr>
              <td>Auth</td>
              <td>Cognito</td>
              <td>Auth0, custom JWT</td>
              <td>AWS-native; no extra vendor; free for first 50k MAU; supports social login</td>
              <td>If Cognito customization (custom auth flows, UI) becomes too limiting</td>
            </tr>
            <tr>
              <td>Parsing</td>
              <td>SQS + Lambda</td>
              <td>In-process (API)</td>
              <td>AI calls take 5–30s; can&apos;t block HTTP response; Lambda scales parsing independently</td>
              <td>Never — this is the right pattern for long-running async work</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-explanation">5-Minute Interview Explanation</h2>
      <InterviewPlaybook
        title="How to Present This Architecture in an Interview"
        intro="If asked to design a CV Builder or document processing system, here is how to walk through this architecture clearly and confidently in 5 minutes."
        steps={[
          "Start with the user flow: 'A user uploads a CV, we parse it asynchronously with AI, they edit the result, and export a PDF.' This grounds everything in the product.",
          "State the key constraints that drive decisions: 'AI parsing takes 5–30 seconds — it must be async. File sizes up to 10MB — we should use presigned URLs so files never hit our API server.'",
          "Draw the high-level boxes: CloudFront → ALB → ECS Fargate → DynamoDB, S3, Redis. Then add the async branch: ECS → SQS → Lambda → AI provider → DynamoDB.",
          "Explain the key design choices: 'I chose DynamoDB over RDS because our access patterns are simple key-value lookups and the system needs to scale horizontally. I chose ECS over Lambda because the API maintains persistent Redis connections.'",
          "Cover failure modes proactively: 'If the AI provider is down, the Lambda fails, SQS retries up to 3 times, then moves to a DLQ. We alert on DLQ depth and replay when the provider recovers. The user sees a longer processing time but the upload is not lost.'",
          "End with the cost and scale: 'At 100k DAU, this costs roughly $150/month for AWS services — the AI provider is the dominant cost at another $150–300. At 1M DAU, we would scale ECS to 10–20 tasks and switch to DynamoDB provisioned capacity for cost predictability.'",
        ]}
      />
    </div>
  );
}
