import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fullSystemDiagram = String.raw`flowchart TD
  CHANNELS["Customer Channels\nWeb Chat / Email / Phone / Mobile"]
  CHANNELS --> APIGW["API Gateway\nAuth (Cognito)\nRate limiting\nWebSocket for chat"]
  APIGW --> INGEST["Conversation Ingest Service\nNode.js Lambda\nCreates ticket + starts workflow"]
  INGEST --> TEMPORAL["Temporal Server\nWorkflow orchestration"]
  TEMPORAL --> CLASSIFY["Classification Activity\nBedrock Claude Haiku\nIntent + category + priority"]
  TEMPORAL --> RAG["RAG Activity\nEmbed query\nSearch OpenSearch\nRetrieve top-5 chunks"]
  TEMPORAL --> GENERATE["Generation Activity\nBedrock Claude Sonnet\nGrounded response"]
  TEMPORAL --> ROUTE["Routing Activity\nAI resolved? → customer\nLow confidence? → human queue"]
  ROUTE --> DYNAMO["DynamoDB\nTickets + Conversations\nSingle table design"]
  ROUTE --> HUMAN["Agent Desktop\nHuman agent queue\nEscalated tickets"]
  DYNAMO --> EVENTBRIDGE["EventBridge\nTicketCreated\nTicketEscalated\nAiResolved"]
  EVENTBRIDGE --> ANALYTICS["Analytics Pipeline\nKinesis → S3 → Athena\nAI quality metrics"]
  EVENTBRIDGE --> NOTIFY["Notification Service\nSES email\nPush notifications"]`;

const knowledgeBaseDiagram = String.raw`flowchart LR
  SOURCES["Knowledge Sources\nGoDaddy Help Articles\nProduct Documentation\nFAQ Database\nPast Resolutions (anonymized)"]
  SOURCES --> PIPELINE["Ingestion Pipeline\n(Temporal workflow)\nChunk → Embed → Index"]
  PIPELINE --> OPENSEARCH["OpenSearch\nVector index\nBM25 + semantic hybrid"]
  PUBLISH["CMS Publish Event\n(EventBridge)"]
  PUBLISH --> PIPELINE
  QUERY["Customer Query\n'How to transfer domain?'"]
  QUERY --> EMBED2["Embed query\n(Titan v2)"]
  EMBED2 --> HYBRID["Hybrid Search\nsemantic + keyword\nRRF score fusion"]
  HYBRID --> OPENSEARCH
  OPENSEARCH --> RERANK["Cross-encoder rerank\nTop 5 from 20"]
  RERANK --> PROMPT["Augmented Prompt\nContext + query → Claude"]`;

export const toc: TocItem[] = [
  { id: "requirements", title: "Requirements & Scope", level: 2 },
  { id: "high-level", title: "High-Level Architecture", level: 2 },
  { id: "conversation-ingest", title: "Conversation Ingest Service", level: 2 },
  { id: "ai-pipeline", title: "AI Processing Pipeline", level: 2 },
  { id: "knowledge-base", title: "Knowledge Base Architecture", level: 2 },
  { id: "routing", title: "Intelligent Routing — AI vs Human", level: 2 },
  { id: "database-design", title: "Database Design", level: 2 },
  { id: "observability", title: "Observability & AI Quality", level: 2 },
  { id: "security", title: "Security & Compliance", level: 2 },
  { id: "on-call", title: "On-Call & Incident Management", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "System Design Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SystemDesignGodaddyAiCare() {
  return (
    <div className="article-content">
      <p>
        GoDaddy&apos;s AI Care platform is a system that handles millions of customer
        interactions annually, using AI to classify, route, and resolve support requests
        automatically. This module walks through the complete system design — the architecture
        you would be asked to design and build in this role. Understand this end-to-end before
        your interview.
      </p>

      <h2 id="requirements">Requirements & Scope</h2>
      <pre><code>{`// Functional requirements:
// 1. Accept customer support requests via web chat, email, and mobile (REST + WebSocket)
// 2. AI-classify intent and category on every incoming message
// 3. Use RAG to generate grounded, accurate responses from GoDaddy's knowledge base
// 4. Route low-confidence AI responses to human agents
// 5. Track conversation state: created → ai_processing → ai_resolved | escalated | human_assigned
// 6. Publish domain events for analytics and notification services
// 7. Support human agents viewing and responding to escalated conversations

// Non-functional requirements:
// Scale: 2M tickets/month = ~770 tickets/min = ~13/second avg, 100/s peak
// Availability: 99.9% (allows ~8.7 hours downtime/year)
// Latency: AI response within 10 seconds of customer message (P95)
// AI quality: >80% customer satisfaction on AI-resolved tickets
// Security: PII handled per GDPR/CCPA, customer data encrypted at rest and in transit

// Explicitly out of scope (but note the extensions):
// Voice/phone integration (mention Twilio/Lex integration as extension)
// Proactive outreach (mention Pinpoint / SES as extension)
// Multi-language (mention Amazon Translate as extension)`}</code></pre>

      <MermaidDiagram
        chart={fullSystemDiagram}
        title="GoDaddy AI Care Platform — Full Architecture"
        caption="Temporal orchestrates the multi-step AI pipeline. The RAG activity retrieves knowledge, the generation activity creates the response. EventBridge fans domain events to analytics and notification services."
        minHeight={560}
      />

      <h2 id="conversation-ingest">Conversation Ingest Service</h2>
      <p>
        The ingest service is the entry point for all customer contact. It handles three
        channels: REST API (web/mobile form submissions), WebSocket (real-time chat), and
        SES email (email-to-ticket via S3 event → Lambda).
      </p>
      <pre><code>{`// WebSocket for real-time chat: API Gateway WebSocket API
// Supports: connect, disconnect, message, getConversation routes

// Message ingestion handler (Lambda, TypeScript)
export const onMessage: APIGatewayProxyHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId!;
  const body = JSON.parse(event.body ?? "{}") as CustomerMessage;

  // 1. Validate and create ticket
  const ticket = await createTicketUseCase.execute({
    customerId: await getCustomerFromConnection(connectionId),
    subject: body.text,
    channel: "web_chat",
    connectionId,  // needed to push AI response back via WebSocket
  });

  // 2. Start Temporal workflow — returns immediately, processing is async
  await temporalClient.workflow.start(SupportTicketWorkflow, {
    taskQueue: "ai-care-queue",
    workflowId: \`ticket-\${ticket.id}\`,
    args: [{ ticketId: ticket.id, subject: body.text, customerId: ticket.customerId }],
  });

  // 3. Acknowledge immediately — customer sees "typing..." indicator
  return {
    statusCode: 200,
    body: JSON.stringify({ ticketId: ticket.id, status: "processing" }),
  };
};

// When AI response is generated, push back via WebSocket
export async function pushAiResponse(connectionId: string, response: string): Promise<void> {
  await apiGatewayManagement.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({ type: "ai_response", content: response }),
  }));
}`}</code></pre>

      <h2 id="ai-pipeline">AI Processing Pipeline</h2>
      <pre><code>{`// The Temporal workflow coordinates 4 activities:

// Activity 1: Classification (Bedrock Claude Haiku — fast, cheap)
// Input: ticket subject + customer context
// Output: { category, intent, priority, requiresHumanAgent, confidence }
// Timeout: 30s, retries: 3, backoff: exponential

// Activity 2: Knowledge Retrieval (OpenSearch vector search)
// Input: category + intent + subject
// Output: top-5 relevant knowledge chunks with scores
// Timeout: 10s, retries: 2
// Skip if category has no knowledge base (e.g., "custom_complaint")

// Activity 3: Response Generation (Bedrock Claude Sonnet — high quality)
// Input: subject + knowledge chunks + conversation history
// Output: { response, confidence, sourceIds }
// Timeout: 60s, retries: 3 with 5s backoff
// Falls back to: "I'm having trouble generating a response" + escalation

// Activity 4: Routing Decision
// if confidence >= 0.8: send AI response to customer (ai_resolved)
// if confidence < 0.8: send AI response + "Would you like to speak to an agent?" button
// if confidence < 0.5: skip AI response, route directly to human queue
// if requiresHumanAgent: skip AI entirely, immediate escalation

// Confidence thresholds calibrated on evaluation dataset:
const ROUTING_CONFIG = {
  autoResolveThreshold: 0.80,    // send AI response without human review
  escalationThreshold: 0.50,     // below this: skip AI, go straight to human
} as const;`}</code></pre>

      <h2 id="knowledge-base">Knowledge Base Architecture</h2>

      <MermaidDiagram
        chart={knowledgeBaseDiagram}
        title="RAG Knowledge Base Pipeline"
        caption="Hybrid search (semantic + BM25 keyword) with cross-encoder reranking gives higher precision than pure vector search. CMS publish events trigger re-ingestion of updated articles automatically."
        minHeight={380}
      />

      <pre><code>{`// Hybrid search: combines semantic similarity (embeddings) with BM25 keyword matching
// Reciprocal Rank Fusion (RRF) combines the two result lists into one ranked list

// OpenSearch query for hybrid search:
const hybridQuery = {
  query: {
    hybrid: {
      queries: [
        {
          neural: {
            embedding_field: {
              query_text: customerQuery,
              model_id: "amazon-titan-embed-text-v2",
              k: 20,    // top-20 from vector search
            },
          },
        },
        {
          match: {
            content: {
              query: customerQuery,
              boost: 0.3,    // BM25 weighted lower than semantic
            },
          },
        },
      ],
    },
  },
  size: 20,
  _source: ["id", "content", "title", "category", "updatedAt"],
};

// Knowledge base ingestion Temporal workflow (triggered by CMS publish event)
export async function KnowledgeBaseIngestionWorkflow(input: IngestionInput): Promise<void> {
  const article = await fetchArticle(input.articleId);
  const chunks = await chunkArticle({ content: article.content, maxTokens: 500, overlap: 50 });
  const embeddings = await embedBatch({ texts: chunks.map(c => c.text) });

  await indexChunks({
    articleId: input.articleId,
    chunks: chunks.map((c, i) => ({
      ...c,
      embedding: embeddings[i],
      metadata: { title: article.title, category: article.category, version: article.version },
    })),
  });
}`}</code></pre>

      <h2 id="routing">Intelligent Routing — AI vs Human</h2>

      <ArticleTable caption="Routing decision matrix based on AI confidence and ticket category." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>AI Confidence</th>
              <th>Routing Decision</th>
              <th>Customer Experience</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Common FAQ (domain transfer steps)</td>
              <td>&gt; 80%</td>
              <td>AI auto-resolves, no human review</td>
              <td>Instant response, &lt;10s</td>
            </tr>
            <tr>
              <td>Moderate complexity</td>
              <td>50-80%</td>
              <td>AI responds + offers human escalation button</td>
              <td>Response with option to escalate</td>
            </tr>
            <tr>
              <td>Complex / account-specific</td>
              <td>&lt; 50%</td>
              <td>Skip AI response, route to next available agent</td>
              <td>&quot;I&apos;m connecting you with an agent...&quot;</td>
            </tr>
            <tr>
              <td>Billing dispute, angry customer</td>
              <td>Classification detects high-priority</td>
              <td>Immediate human escalation regardless of confidence</td>
              <td>Priority queue, shorter wait</td>
            </tr>
            <tr>
              <td>Legal / compliance topics</td>
              <td>Category blocklist</td>
              <td>Always human — AI not permitted</td>
              <td>Agent assigned immediately</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="database-design">Database Design</h2>
      <pre><code>{`// DynamoDB single table: all support entities in one table

// Access patterns to model:
// 1. Get conversation by ID → PK: CONV#{id}, SK: METADATA
// 2. Get messages in a conversation (sorted by time) → PK: CONV#{id}, SK: MSG#{timestamp}
// 3. List open tickets for human agent queue → GSI1: PK: STATUS#OPEN, SK: priority+createdAt
// 4. Get customer's conversation history → GSI2: PK: CUSTOMER#{id}, SK: CONV#{createdAt}

// Item examples:
// Conversation metadata:
// PK: CONV#abc-123  SK: METADATA
// { id, customerId, channel, status, category, aiConfidence, agentId, createdAt }
// GSI1pk: STATUS#OPEN  GSI1sk: HIGH#2026-05-14T10:00:00

// Message item:
// PK: CONV#abc-123  SK: MSG#2026-05-14T10:00:05.000Z
// { id, author: CUSTOMER, content, attachments }

// AI response item (separate from conversation message):
// PK: CONV#abc-123  SK: AI#2026-05-14T10:00:08.000Z
// { response, confidence, knowledgeSourceIds, bedrockModelId, promptTokens, completionTokens }

// DynamoDB streams → Lambda → ElasticSearch/OpenSearch for full-text search
// Tickets table in DynamoDB is the system of record (fast reads)
// OpenSearch is the search plane (full-text, agent search, analytics)`}</code></pre>

      <h2 id="observability">Observability & AI Quality</h2>
      <pre><code>{`// Four observability pillars for an AI care platform:

// 1. Infrastructure metrics (CloudWatch)
// - Lambda invocation count, error rate, P99 duration
// - DynamoDB read/write capacity, throttle events
// - SQS/Temporal task queue depth
// - API Gateway 4xx/5xx rates

// 2. AI pipeline metrics (custom CloudWatch metrics)
const metrics = {
  classificationLatencyMs: "Bedrock/ClassificationLatency",
  generationLatencyMs: "Bedrock/GenerationLatency",
  ragRetrievalLatencyMs: "RAG/RetrievalLatency",
  aiConfidenceScore: "AI/ConfidenceScore",
  autoResolutionRate: "Care/AutoResolutionRate",  // % resolved without human
  escalationRate: "Care/EscalationRate",           // % escalated to human
  knowledgeHitRate: "RAG/KnowledgeHitRate",        // % queries with relevant knowledge found
};

// 3. Business quality metrics (AI quality)
// Track daily:
// - Customer satisfaction score on AI-resolved tickets (thumbs up/down)
// - Auto-resolution rate (target > 60% of tickets resolved by AI)
// - Mean time to AI response (target P95 < 10s)
// - Escalation rate by category (domain vs billing vs technical)
// - Hallucination rate (LLM-as-judge daily sample of 500 responses)

// 4. Alerting thresholds (PagerDuty via CloudWatch)
const alerts = {
  "AI error rate > 5%": "immediate page",         // Bedrock degraded
  "Temporal task queue > 1000 pending": "5 min",  // worker capacity issue
  "P95 AI response > 30s": "immediate page",       // SLA breach
  "Auto-resolution rate drops > 20%": "15 min",   // AI quality regression
  "DLQ depth > 0": "immediate page",               // failed message processing
};`}</code></pre>

      <h2 id="security">Security & Compliance</h2>
      <pre><code>{`// Security requirements for a customer support AI platform:

// 1. PII handling — GDPR/CCPA
// Customer messages may contain: SSNs, credit cards, passwords
// Solution: PII detection before sending to LLM
await piiDetector.redact(customerMessage);  // replace PII with [REDACTED] tokens
// Bedrock Guardrails: block PII in outputs

// 2. Data residency
// GoDaddy serves global customers — EU data must stay in EU
// Solution: API Gateway + Lambda in eu-west-1 for EU customers
// DynamoDB global tables: EU replica stays in EU

// 3. Encryption
// At rest: DynamoDB encryption (KMS), S3 knowledge base (KMS)
// In transit: TLS 1.3 on all API endpoints
// LLM prompts may contain customer data → Bedrock processes in VPC endpoint

// 4. Authentication
// Customer auth: Cognito User Pools → JWT → API Gateway JWT authorizer
// Agent auth: Cognito with MFA required for human agent desktop
// Service-to-service: IAM roles (no long-lived credentials)

// 5. Audit logging — all agent actions logged to CloudTrail
// What data was accessed, when, by which agent
// Required for GDPR data access audits`}</code></pre>

      <h2 id="on-call">On-Call & Incident Management</h2>
      <p>
        The GoDaddy JD explicitly lists on-call rotation as a responsibility, including
        incident investigation, After Action Reviews (AARs), and preventing recurrence.
        Understanding how to operate a production AI system under pressure is evaluated.
      </p>
      <pre><code>{`// On-call runbook: Temporal task queue backed up (classic production scenario)

// Detection: CloudWatch alarm "Temporal queue depth > 1000 messages" pages on-call

// Investigation steps:
// 1. Check Temporal UI: what workflows are stuck? What activity is failing?
//    → Classification activity failing → Bedrock API degraded?
//    → Generation activity failing → model capacity issue?

// 2. Check Bedrock metrics:
//    CloudWatch → Bedrock → InvocationClientErrors, InvocationServerErrors, Throttles
//    → High throttle count: GoDaddy hitting Bedrock quota

// 3. Mitigation:
//    Option A: Reduce Temporal worker concurrency (stops adding to queue, drains gracefully)
//    Option B: Enable fallback classifier (rule-based) for classifications
//    Option C: Increase Bedrock quota (AWS support, 24-48h SLA)

// 4. After Action Review (AAR) template:
// - What happened? (timeline)
// - What was the customer impact? (tickets delayed, % affected)
// - Root cause (Bedrock quota too low, no circuit breaker)
// - What did we do to mitigate? (reduced concurrency, switched to fallback)
// - What prevents recurrence? (add circuit breaker, increase quota proactively)
// - Action items with owners and due dates`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Design an AI-powered customer support platform for GoDaddy.'"
        intro="This is the big system design question for this role. You are designing the system you will actually build. Demonstrate that you understand the full stack — AI pipeline, AWS services, data design, and operational excellence."
        steps={[
          "Clarify requirements first: 'Before I draw anything: what channels (chat/email/phone)? What SLA — 99.9% or 99.99%? What scale — peak tickets per second? AI auto-resolution target?'",
          "Lead with the AI pipeline architecture: 'The core is a Temporal workflow with four activities: classify → retrieve knowledge (RAG) → generate response → route based on confidence. Each activity has independent retry policies. Worker crash? Temporal resumes from the last completed activity.'",
          "Explain the RAG knowledge base: 'GoDaddy\\'s help articles and past ticket resolutions are indexed in OpenSearch with Amazon Titan embeddings. I use hybrid search — semantic + BM25 — with cross-encoder reranking. When a customer asks about domain transfer, the top-5 most relevant chunks go into the Claude prompt.'",
          "Name the operational concerns: 'What makes this production-ready: PII detection before LLM calls, Bedrock Guardrails for output safety, DLQ + alerts for failed messages, LLM-as-judge daily quality scoring, and a circuit breaker to fall back to rule-based classification when Bedrock degrades.'",
        ]}
      />

      <InterviewChallenge
        title="System Design Extension: Multi-Channel Support with Email"
        scenario={
          <>
            GoDaddy wants to extend the AI care platform to handle inbound support emails.
            Customers email support@godaddy.com. The system must: parse the email, create a
            ticket, run the AI pipeline, and reply to the customer via email if confidence
            is high — all within 60 seconds. Human-escalated tickets must appear in the same
            agent queue as chat escalations.
          </>
        }
        tasks={[
          "How does email ingestion differ from real-time chat? What AWS services handle email inbound?",
          "The 60-second SLA is tighter than typical email expectations. Is this achievable? What's the bottleneck?",
          "How do you ensure the AI email reply is safe to send without human review? What guardrails are critical?",
          "How do you handle email threads (customer replies to the AI response)? What conversation state do you maintain?",
          "The agent queue receives both chat escalations and email escalations. How does the agent desktop know the channel and how to respond (WebSocket vs SES)?",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Temporal as the AI pipeline orchestrator</strong> — classify → retrieve → generate → route. Each step is a retryable Activity. Worker crashes don&apos;t lose progress.</li>
        <li><strong>Hybrid RAG search</strong> (semantic + BM25 + reranking) significantly outperforms pure vector search for customer support queries that mix domain terminology with natural language.</li>
        <li><strong>Confidence-based routing</strong> — auto-resolve at &gt;80%, offer escalation at 50-80%, always escalate below 50%. Calibrate thresholds on your evaluation dataset.</li>
        <li><strong>PII detection before LLM calls</strong> is non-negotiable for GDPR/CCPA compliance. Customer support messages regularly contain SSNs, credit cards, and passwords.</li>
        <li>On-call responsibility requires knowing the operational playbook: Temporal UI for workflow debugging, CloudWatch for Bedrock metrics, DLQ for failed messages, and AAR process for recurrence prevention.</li>
        <li>The AI quality loop: track auto-resolution rate, satisfaction scores, and hallucination rate daily. Regression in any of these signals prompt or RAG pipeline degradation before customers notice.</li>
      </ul>
    </div>
  );
}
