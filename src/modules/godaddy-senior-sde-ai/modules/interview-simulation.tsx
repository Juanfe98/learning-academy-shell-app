import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const interviewStructureDiagram = String.raw`flowchart TD
  PHONE["Phone Screen\n30 min\nRecruiter: experience + motivation"]
  PHONE --> TECH1["Technical Screen\n60 min\nSenior SDE: coding + architecture intro"]
  TECH1 --> LOOP["On-site Loop (4 rounds)"]
  LOOP --> C1["Coding Round 1\n60 min\nBackend problem in TS or Go"]
  LOOP --> C2["Coding Round 2\n60 min\nSystem design intro problem"]
  LOOP --> C3["Architecture & Design\n60 min\nDDD, hexagonal, AI system design"]
  LOOP --> C4["Leadership & Behavioral\n45 min\nSTAR stories, code review, mentoring"]
  C1 & C2 & C3 & C4 --> DEBRIEF["Hiring Manager Debrief\nAll interviewers discuss\nHire / No-hire decision"]`;

export const toc: TocItem[] = [
  { id: "interview-format", title: "Interview Format & Evaluation Criteria", level: 2 },
  { id: "round1-coding-ts", title: "Round 1: TypeScript Backend Coding", level: 2 },
  { id: "q1-idempotency", title: "Q1: Idempotent Ticket Creation", level: 3 },
  { id: "q2-rate-limiter", title: "Q2: Token Bucket Rate Limiter", level: 3 },
  { id: "q3-retry", title: "Q3: Retry with Exponential Backoff", level: 3 },
  { id: "round2-architecture", title: "Round 2: Architecture & DDD", level: 2 },
  { id: "q4-domain-model", title: "Q4: Design the Support Ticket Domain Model", level: 3 },
  { id: "q5-hexagonal", title: "Q5: Hexagonal Architecture in Practice", level: 3 },
  { id: "round3-ai-system", title: "Round 3: AI System Design", level: 2 },
  { id: "q6-rag-design", title: "Q6: Design GoDaddy's Knowledge Base RAG", level: 3 },
  { id: "q7-temporal", title: "Q7: AI Pipeline with Temporal", level: 3 },
  { id: "round4-leadership", title: "Round 4: Leadership & Behavioral", level: 2 },
  { id: "q8-code-review", title: "Q8: Code Review Scenario", level: 3 },
  { id: "q9-incident", title: "Q9: Production Incident — What Do You Do?", level: 3 },
  { id: "q10-star", title: "Q10: STAR Stories Library", level: 3 },
  { id: "questions-to-ask", title: "Questions to Ask Your Interviewer", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function InterviewSimulation() {
  return (
    <div className="article-content">
      <p>
        This module simulates the GoDaddy Senior SDE (AI) interview from the interviewer&apos;s
        perspective. Each question is framed as the interviewer delivers it, followed by what
        separates a strong answer from a weak one, and a model response to practice out loud.
        GoDaddy evaluates software craftsmanship — expect deep DDD, hexagonal architecture,
        and production AI engineering questions, not just LeetCode puzzles.
      </p>

      <h2 id="interview-format">Interview Format & Evaluation Criteria</h2>

      <MermaidDiagram
        chart={interviewStructureDiagram}
        title="GoDaddy Senior SDE Interview Pipeline"
        caption="Four on-site rounds covering coding, system design, architecture, and leadership. All four interviewers participate in the debrief — a weak performance in any round can block an offer."
        minHeight={380}
      />

      <pre><code>{`// GoDaddy Senior SDE evaluation dimensions (inferred from JD):

1. Software Craftsmanship
   - DDD proficiency: entities, aggregates, bounded contexts
   - Hexagonal architecture: ports, adapters, testability
   - Testing discipline: unit, integration, test pyramid
   - Code quality: meaningful names, single responsibility, no leaky abstractions

2. Backend Engineering
   - REST API design (8+ years is a high bar — they expect production experience)
   - TypeScript at scale: types, generics, error handling
   - Go proficiency: goroutines, channels, error idioms (preferred, not required)
   - Database design: DynamoDB single-table, NoSQL access patterns, indexing

3. AWS Platform
   - Lambda, API Gateway, DynamoDB, SQS, EventBridge
   - IaC with CDK or Terraform
   - Observability: CloudWatch, X-Ray, structured logging
   - Security: IAM least privilege, Secrets Manager

4. AI Engineering (the differentiator for this role)
   - LLM integration: provider abstraction, streaming, prompt engineering
   - RAG pipeline: chunking, embedding, retrieval, reranking
   - AI agents: ReAct pattern, tool use, agent loop
   - Evaluation: regression testing, LLM-as-judge, business quality metrics

5. Leadership & Collaboration
   - Code review philosophy
   - Mentoring developers
   - Technical decision making (ADRs, RFCs)
   - Incident response (on-call is a stated requirement)
   - Agile collaboration (JD explicitly calls this out)`}</code></pre>

      <h2 id="round1-coding-ts">Round 1: TypeScript Backend Coding</h2>

      <h3 id="q1-idempotency">Q1: Idempotent Ticket Creation</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Implement an idempotent support ticket creation endpoint"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;GoDaddy&apos;s mobile app sends the same
            ticket creation request twice when the network is flaky. Customers end up with
            duplicate tickets. We use an <code>Idempotency-Key</code> header (UUID) to
            prevent this. Implement the idempotency logic — show me where it lives and
            how you store and look up the key.&quot;
          </>
        }
        tasks={[
          "Where does the idempotency check live — middleware, use case, or repository?",
          "What is the storage strategy for idempotency keys? What TTL?",
          "What do you return if the same key is sent while the first request is still processing?",
          "How do you prevent a race condition between two simultaneous requests with the same key?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Strong answer: idempotency is a cross-cutting concern → middleware or a dedicated
// IdempotencyService that wraps the use case. Not in the repository (too deep)
// and not raw in the controller (too scattered if you have multiple endpoints).

// DynamoDB is ideal for idempotency storage: atomic conditional writes prevent races

interface IdempotencyRecord {
  pk: string;                  // IDEMPOTENCY#{key}
  sk: string;                  // "RESULT"
  status: "processing" | "complete";
  response?: unknown;
  expiresAt: number;           // TTL — DynamoDB auto-deletes expired items
}

class IdempotencyService {
  constructor(
    private readonly dynamoClient: DynamoDBClient,
    private readonly table: string,
    private readonly ttlSeconds = 86400,  // 24 hours
  ) {}

  // Returns: { isNew: true } if first request | { isNew: false, response } if duplicate
  async acquire(
    key: string
  ): Promise<{ isNew: true } | { isNew: false; response: unknown }> {
    try {
      // Atomic conditional write: only succeeds if key doesn't exist
      await this.dynamoClient.send(new PutItemCommand({
        TableName: this.table,
        Item: {
          pk: { S: \`IDEMPOTENCY#\${key}\` },
          sk: { S: "RESULT" },
          status: { S: "processing" },
          expiresAt: { N: String(Math.floor(Date.now() / 1000) + this.ttlSeconds) },
        },
        ConditionExpression: "attribute_not_exists(pk)",  // atomic — no race condition
      }));
      return { isNew: true };
    } catch (err) {
      if ((err as Error).name === "ConditionalCheckFailedException") {
        // Key exists — get the stored response
        const existing = await this.getRecord(key);
        if (existing?.status === "processing") {
          // Still processing — return 202 Accepted
          throw new RequestInProgressError(key);
        }
        return { isNew: false, response: existing?.response };
      }
      throw err;
    }
  }

  async complete(key: string, response: unknown): Promise<void> {
    await this.dynamoClient.send(new UpdateItemCommand({
      TableName: this.table,
      Key: { pk: { S: \`IDEMPOTENCY#\${key}\` }, sk: { S: "RESULT" } },
      UpdateExpression: "SET #status = :complete, response = :resp",
      ExpressionAttributeValues: {
        ":complete": { S: "complete" },
        ":resp": { S: JSON.stringify(response) },
      },
    }));
  }
}

// Usage in use case wrapper:
async function createTicketIdempotent(
  command: CreateTicketCommand,
  idempotencyKey: string
): Promise<CreateTicketResult> {
  const acquired = await idempotencyService.acquire(idempotencyKey);

  if (!acquired.isNew) {
    return acquired.response as CreateTicketResult;  // return identical result
  }

  try {
    const result = await createTicketUseCase.execute(command);
    await idempotencyService.complete(idempotencyKey, result);
    return result;
  } catch (err) {
    // Delete the idempotency record on failure so client can retry
    await idempotencyService.delete(idempotencyKey);
    throw err;
  }
}

// Note for interviewer: same-key concurrent requests — the second hits
// ConditionalCheckFailedException and sees status="processing" → returns 202.
// Client retries after a delay (exponential backoff) until status="complete".`}</code></pre>
      </SolutionReveal>

      <h3 id="q2-rate-limiter">Q2: Token Bucket Rate Limiter</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Implement a distributed rate limiter for the AI API"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;The Bedrock API has a token quota.
            We need a rate limiter that allows at most 100 AI requests per minute per
            customer, enforced across all Lambda instances (not just per-instance).
            Implement a token bucket rate limiter backed by Redis. You have 30 minutes.&quot;
          </>
        }
        tasks={[
          "Explain why a distributed rate limiter is needed (not per-Lambda).",
          "Implement a token bucket using Redis — what data structure and commands do you use?",
          "How do you make the check-and-decrement atomic to prevent race conditions?",
          "What happens when Redis is unavailable — fail open or fail closed?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Why distributed? Lambda is stateless and horizontally scaled. A per-instance
// counter only limits one instance — 10 Lambda instances = 10x the intended limit.

// Token bucket: atomic Lua script in Redis (EVAL — executes atomically)
const RATE_LIMIT_SCRIPT = \`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call("HMGET", key, "tokens", "lastRefill")
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = limit
  lastRefill = now
end

-- Refill based on time elapsed
local elapsed = now - lastRefill
local refill = math.floor(elapsed / window * limit)
tokens = math.min(limit, tokens + refill)
lastRefill = now

if tokens <= 0 then
  redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
  redis.call("EXPIRE", key, window * 2)
  return 0   -- rate limited
end

tokens = tokens - 1
redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
redis.call("EXPIRE", key, window * 2)
return 1     -- allowed
\`;

class DistributedRateLimiter {
  constructor(
    private readonly redis: RedisClient,
    private readonly config: { limit: number; windowSeconds: number }
  ) {}

  async isAllowed(customerId: string): Promise<boolean> {
    const key = \`ratelimit:ai:\${customerId}\`;
    try {
      const result = await this.redis.eval(
        RATE_LIMIT_SCRIPT,
        [key],
        [String(this.config.limit), String(this.config.windowSeconds), String(Date.now() / 1000)],
      );
      return result === 1;
    } catch (err) {
      // Redis unavailable → fail OPEN (allow the request)
      // Rationale: degraded rate limiting is better than zero availability
      // For high-security scenarios (payment APIs), fail CLOSED instead
      console.error("Rate limiter Redis error, failing open", err);
      return true;
    }
  }
}

// Middleware integration:
function aiRateLimitMiddleware(limiter: DistributedRateLimiter) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const customerId = res.locals.user.sub;
    const allowed = await limiter.isAllowed(customerId);
    if (!allowed) {
      return res.status(429).json({
        code: "RATE_LIMIT_EXCEEDED",
        message: "AI API rate limit reached. Retry after 60 seconds.",
        retryAfter: 60,
      });
    }
    next();
  };
}`}</code></pre>
      </SolutionReveal>

      <h3 id="q3-retry">Q3: Retry with Exponential Backoff</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Build a generic retry utility with exponential backoff"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;We call the Bedrock API in several
            places. Sometimes it returns 429 (throttle) or 503 (overloaded). We want a
            generic retry utility with exponential backoff and jitter. It must support:
            configurable max attempts, non-retryable error types, and a timeout for the
            total operation. Implement it in TypeScript.&quot;
          </>
        }
        tasks={[
          "Implement the retry function with configurable backoff strategy.",
          "Add jitter to prevent thundering herd — what kind of jitter and why?",
          "Support non-retryable error types (e.g., 400 Bad Request should not retry).",
          "Add an overall timeout that aborts all retries after N seconds.",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffCoefficient: number;
  maxDelayMs: number;
  jitter: boolean;
  nonRetryableErrors?: Array<new (...args: never[]) => Error>;
  timeoutMs?: number;
}

class RetryExhaustedError extends Error {
  constructor(readonly attempts: number, readonly lastError: Error) {
    super(\`All \${attempts} retry attempts failed: \${lastError.message}\`);
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const deadline = config.timeoutMs
    ? Date.now() + config.timeoutMs
    : Infinity;

  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // Check overall timeout
    if (Date.now() > deadline) {
      throw new RetryExhaustedError(attempt - 1, new Error("Timeout exceeded"));
    }

    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;

      // Check if this error type should NOT be retried
      const isNonRetryable = config.nonRetryableErrors?.some(
        ErrorClass => err instanceof ErrorClass
      );
      if (isNonRetryable) {
        throw err;  // propagate immediately, no more attempts
      }

      if (attempt === config.maxAttempts) break;

      // Calculate delay with exponential backoff
      let delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffCoefficient, attempt - 1),
        config.maxDelayMs,
      );

      // Full jitter: random value [0, delay] — distributes retry storms over time
      // Better than "equal jitter" for thundering herd prevention
      if (config.jitter) {
        delay = Math.random() * delay;
      }

      // Ensure we don't wait past the deadline
      const remainingTime = deadline - Date.now();
      delay = Math.min(delay, remainingTime);

      console.log(\`Retry attempt \${attempt}/\${config.maxAttempts} failed, retrying in \${delay}ms\`, {
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new RetryExhaustedError(config.maxAttempts, lastError);
}

// Usage: Bedrock LLM call with retry
const response = await withRetry(
  () => bedrockClient.complete({ systemPrompt, messages }),
  {
    maxAttempts: 5,
    initialDelayMs: 1_000,    // start at 1s
    backoffCoefficient: 2,    // 1s, 2s, 4s, 8s, 16s
    maxDelayMs: 60_000,
    jitter: true,              // prevent thundering herd
    timeoutMs: 120_000,        // 2 min total budget
    nonRetryableErrors: [InvalidRequestError, AuthenticationError],
  }
);`}</code></pre>
      </SolutionReveal>

      <h2 id="round2-architecture">Round 2: Architecture & DDD</h2>

      <h3 id="q4-domain-model">Q4: Design the Support Ticket Domain Model</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Model the Support Ticket domain for GoDaddy"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;A support ticket goes through states:
            open → ai_processing → ai_resolved | pending_human | escalated → closed.
            Tickets can be re-opened. The AI assigns a category and confidence score.
            Design the domain model — what are the aggregates, value objects, and invariants?
            Implement the <code>SupportTicket</code> aggregate in TypeScript.&quot;
          </>
        }
        tasks={[
          "Name the Entities, Value Objects, and the Aggregate Root.",
          "What invariants does the SupportTicket enforce? Show them in code.",
          "What domain events does SupportTicket emit across its lifecycle?",
          "Why is the AI confidence score a Value Object, not a primitive?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Value Objects — defined by value, immutable
class TicketId { /* ... */ }
class CustomerId { /* ... */ }
class AgentId { /* ... */ }

class ConfidenceScore {
  private constructor(private readonly value: number) {}

  static create(score: number): ConfidenceScore {
    if (score < 0 || score > 1) throw new DomainError("Confidence must be between 0 and 1");
    return new ConfidenceScore(score);
  }

  get isHighConfidence(): boolean { return this.value >= 0.8; }
  get isLowConfidence(): boolean { return this.value < 0.5; }
  toNumber(): number { return this.value; }
  // Why Value Object: encapsulates validation + behavior (isHighConfidence)
  // A raw number can't express these business rules
}

class TicketCategory {
  private static readonly VALID = ["billing", "technical", "account", "domain", "hosting"] as const;
  private constructor(private readonly value: string) {}

  static create(raw: string): TicketCategory {
    if (!TicketCategory.VALID.includes(raw as never))
      throw new DomainError(\`Invalid category: \${raw}\`);
    return new TicketCategory(raw);
  }
}

// Domain Events — past-tense facts
class TicketCreated { readonly eventType = "ticket.created"; /* ... */ }
class AiClassificationApplied { readonly eventType = "ticket.ai_classified"; /* ... */ }
class TicketEscalated { readonly eventType = "ticket.escalated"; /* ... */ }
class TicketClosed { readonly eventType = "ticket.closed"; /* ... */ }

// Aggregate Root: SupportTicket
class SupportTicket {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: TicketId,
    readonly customerId: CustomerId,
    private _subject: string,
    private _status: TicketStatus,
    private _category: TicketCategory | null,
    private _aiConfidence: ConfidenceScore | null,
    private _aiResponse: string | null,
    private _assignedAgent: AgentId | null,
  ) {}

  static create(input: CreateTicketInput): SupportTicket {
    const ticket = new SupportTicket(
      TicketId.generate(), input.customerId, input.subject,
      TicketStatus.Open, null, null, null, null,
    );
    ticket._events.push(new TicketCreated(ticket.id, input.customerId, input.subject));
    return ticket;
  }

  applyAiClassification(category: TicketCategory, confidence: ConfidenceScore, response: string): void {
    // Invariant: can only classify when in AI_PROCESSING state
    if (this._status !== TicketStatus.AiProcessing)
      throw new DomainError("Ticket must be in AI_PROCESSING state to apply classification");

    this._category = category;
    this._aiConfidence = confidence;
    this._aiResponse = response;

    // Business rule: route based on confidence
    this._status = confidence.isHighConfidence ? TicketStatus.AiResolved : TicketStatus.PendingHuman;

    this._events.push(new AiClassificationApplied(this.id, category, confidence, response));
  }

  escalate(reason: string, requestedBy: AgentId | "customer"): void {
    // Invariant: closed tickets cannot be escalated
    if (this._status === TicketStatus.Closed)
      throw new DomainError("Cannot escalate a closed ticket");

    this._status = TicketStatus.Escalated;
    this._events.push(new TicketEscalated(this.id, reason, requestedBy));
  }

  pullEvents(): DomainEvent[] {
    const pending = [...this._events];
    this._events = [];
    return pending;
  }
}`}</code></pre>
      </SolutionReveal>

      <h3 id="q5-hexagonal">Q5: Hexagonal Architecture in Practice</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Walk me through your hexagonal architecture for the ticket service"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;You said you use Hexagonal Architecture.
            Show me concretely: what are the ports, what are the adapters, and how does the
            dependency graph actually look? Draw it or write the interfaces. What makes your
            domain layer testable in isolation?&quot;
          </>
        }
        tasks={[
          "Name all the ports (interfaces) the ticket service defines.",
          "Name the driven adapters (implementations) for each port.",
          "How do you wire this together in production vs test?",
          "Show the test for the EscalateTicket use case — what dependencies does it need?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// PORTS — defined in the APPLICATION LAYER, owned by the domain
// These are the only I/O abstractions the domain knows about

interface TicketRepository {
  save(ticket: SupportTicket): Promise<void>;
  findById(id: TicketId): Promise<SupportTicket | null>;
  nextId(): TicketId;
}

interface DomainEventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}

interface AiClassificationPort {
  classify(subject: string): Promise<{ category: string; confidence: number }>;
}

interface KnowledgeRetrievalPort {
  retrieve(query: string, category: string): Promise<KnowledgeChunk[]>;
}

// DRIVEN ADAPTERS — in infrastructure layer
// Production:
class DynamoDbTicketRepository implements TicketRepository { /* ... */ }
class SqsEventPublisher implements DomainEventPublisher { /* ... */ }
class BedrockClassifier implements AiClassificationPort { /* ... */ }
class OpenSearchKnowledgeRetrieval implements KnowledgeRetrievalPort { /* ... */ }

// Test doubles — in-memory, no cloud dependencies:
class InMemoryTicketRepository implements TicketRepository {
  private store = new Map<string, SupportTicket>();
  async save(t: SupportTicket) { this.store.set(t.id.value, t); }
  async findById(id: TicketId) { return this.store.get(id.value) ?? null; }
  nextId() { return TicketId.generate(); }
}

class InMemoryEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];
  async publish(events: DomainEvent[]) { this.published.push(...events); }
}

// APPLICATION SERVICE (Use Case): wires ports together, no infrastructure
class EscalateTicketUseCase {
  constructor(
    private readonly repo: TicketRepository,      // INTERFACE — not DynamoDB
    private readonly events: DomainEventPublisher, // INTERFACE — not SQS
  ) {}

  async execute(command: EscalateTicketCommand): Promise<void> {
    const ticket = await this.repo.findById(command.ticketId);
    if (!ticket) throw new TicketNotFoundError(command.ticketId);
    ticket.escalate(command.reason, command.requestedBy);
    await this.repo.save(ticket);
    await this.events.publish(ticket.pullEvents());
  }
}

// TEST: zero external dependencies — pure domain logic test
it("escalates ticket and publishes TicketEscalated event", async () => {
  const repo = new InMemoryTicketRepository();
  const events = new InMemoryEventPublisher();
  const useCase = new EscalateTicketUseCase(repo, events);

  const ticket = SupportTicket.create({ subject: "Help!", customerId: CustomerId.of("c1") });
  await repo.save(ticket);

  await useCase.execute({ ticketId: ticket.id, reason: "Customer angry", requestedBy: AgentId.of("a1") });

  const saved = await repo.findById(ticket.id);
  expect(saved?.status).toBe(TicketStatus.Escalated);
  expect(events.published).toContainEqual(
    expect.objectContaining({ eventType: "ticket.escalated" })
  );
});`}</code></pre>
      </SolutionReveal>

      <h2 id="round3-ai-system">Round 3: AI System Design</h2>

      <h3 id="q6-rag-design">Q6: Design GoDaddy&apos;s Knowledge Base RAG Pipeline</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Design the RAG pipeline for GoDaddy's AI support assistant"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;Our AI assistant needs to answer
            questions using GoDaddy&apos;s 10,000 help articles, updated daily. The
            assistant should cite sources. When an article is updated in our CMS, the
            knowledge base should reflect it within 5 minutes. Design the ingestion
            pipeline and retrieval system.&quot;
          </>
        }
        tasks={[
          "What is the ingestion pipeline? Walk through chunking, embedding, and indexing.",
          "How do you handle article updates — full re-index or incremental?",
          "The CMS publishes events when articles change. How do you wire this to the ingestion pipeline?",
          "How do you measure if retrieval quality is good? What metrics?",
          "What is the fallback when no relevant knowledge is found?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Full answer framework:

// INGESTION PIPELINE:
// 1. Chunking: split articles into ~400 token chunks with 50 token overlap
//    Use paragraph boundaries when possible (better semantic coherence)
//    Store chunk metadata: articleId, title, category, lastUpdated

// 2. Embedding: Amazon Titan Embed v2 (1024 dimensions)
//    Batch embed chunks (10 at a time due to Bedrock rate limits)
//    Store: chunk text + embedding + metadata

// 3. Indexing: OpenSearch with kNN plugin
//    Index: k-NN vector field + BM25 text field (hybrid)
//    Alias: "knowledge_base" → points to current index
//    Use alias for zero-downtime re-index

// INCREMENTAL UPDATES (article updated):
// 1. CMS publishes "article.updated" event to EventBridge
// 2. EventBridge → Lambda → Start Temporal KnowledgeBaseIngestionWorkflow
// 3. Workflow activities:
//    a. FetchArticleActivity: get new content from CMS
//    b. DeleteChunksActivity: delete all chunks for this articleId from OpenSearch
//    c. ChunkActivity: re-chunk the updated content
//    d. EmbedActivity: embed all new chunks
//    e. IndexActivity: write new chunks to OpenSearch
// Total pipeline: ~2 minutes for a single article (well within 5-min target)

// RETRIEVAL QUALITY METRICS:
// 1. Recall@K: % of queries where the correct article is in top-K results
//    Measured on a labeled evaluation set (100 query-document pairs)
//    Target: Recall@5 > 90%

// 2. MRR (Mean Reciprocal Rank): how high is the correct chunk ranked on average?

// 3. End-to-end quality: LLM-as-judge scores response correctness
//    Sample 500 AI-resolved conversations daily
//    Judge prompt: "Given this question and this response, rate: accuracy (1-5), grounding (1-5)"

// FALLBACK WHEN NO RELEVANT KNOWLEDGE FOUND:
// Cosine similarity threshold: if best chunk score < 0.6, treat as "no knowledge"
// Response: "I don't have specific information about this. Let me connect you with a specialist."
// Route to: human agent queue with category="knowledge_gap"
// Log: knowledge gap events → fed back to content team to write new articles
// This creates a virtuous cycle: gaps → new content → better AI coverage`}</code></pre>
      </SolutionReveal>

      <h3 id="q7-temporal">Q7: AI Pipeline with Temporal</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Why Temporal for the AI pipeline? Convince me."
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;We already have SQS + Lambda + Step
            Functions in our AWS stack. Why would you add Temporal? What does it give us
            that we don&apos;t already have? And what are the operational costs?&quot;
          </>
        }
        tasks={[
          "Name three concrete advantages of Temporal over Step Functions for this use case.",
          "What is the operational overhead of adding Temporal?",
          "When would you choose Step Functions over Temporal?",
          "How does Temporal handle the case where Bedrock API is down for 30 minutes?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Strong answer: be concrete about the advantages AND the costs

// Temporal advantage 1: Durable execution across worker crashes
// Step Functions: if the task is running in Lambda and Lambda cold-starts kill it,
//   Step Functions sees it as a failure and retries the ENTIRE step
// Temporal: if a worker crashes mid-activity, Temporal resumes from EXACTLY where
//   it stopped on the next worker. The event history tracks every completed Activity.
// For our AI pipeline: if the generation Activity crashes mid-stream, only that
//   activity retries. Classification and retrieval results are replayed from history.

// Temporal advantage 2: Signals for real-time interruption
// Step Functions: customer escalates ticket → you can't cleanly stop a running execution
//   without cancelling the entire state machine
// Temporal: customer escalation signal → workflow handler fires immediately,
//   current activity completes, workflow branches to escalation path
// For our AI pipeline: customer clicks "Talk to an agent" → immediate clean escalation

// Temporal advantage 3: Developer experience for complex workflows
// Step Functions: workflow logic lives in JSON/YAML state machine definition
//   Adding conditional logic = deeply nested state machine with Choice states
// Temporal: workflow is TypeScript code → if/else, try/catch, loops — all normal code
// For our AI pipeline: the confidence-based routing and saga compensation are
//   3 lines of TypeScript vs. 50 lines of ASL (Amazon States Language)

// Temporal operational costs (honest answer):
// - Temporal Server to run: use Temporal Cloud ($0.00042/action) or self-hosted on ECS
// - New concept for team: workflow replay model requires learning the determinism rules
// - Local development: run local Temporal server (trivial: docker compose up)

// When to choose Step Functions instead:
// - Team is all-in on AWS managed services, no desire to manage Temporal
// - Simple linear pipelines with no signals, no complex error handling
// - Compliance requires all infrastructure in AWS console with AWS audit trail

// Bedrock down for 30 minutes — Temporal behavior:
// - generateResponse Activity fails → Temporal retries with exponential backoff
// - Retries continue for up to scheduleToCloseTimeout (e.g., 15 minutes)
// - After 15 minutes of retries: Activity fails permanently
// - Workflow catches the error → executes fallback: canned response + escalate to human
// - All in-flight workflows pick up when Bedrock recovers — no manual intervention
// - Step Functions would need a CloudWatch alarm → Lambda → re-trigger failed executions`}</code></pre>
      </SolutionReveal>

      <h2 id="round4-leadership">Round 4: Leadership & Behavioral</h2>

      <h3 id="q8-code-review">Q8: Code Review Scenario</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Review this pull request and give your feedback"
        scenario={
          <>
            <strong>Interviewer shares code:</strong>
            <pre><code>{`// Ticket controller — newly written by a junior engineer
async function handleCreateTicket(req, res) {
  try {
    const ticket = await db.query(
      "INSERT INTO tickets (subject, customer_id, status) VALUES (?, ?, 'open') RETURNING *",
      [req.body.subject, req.user.id]
    );

    const aiResult = await fetch("https://bedrock.amazonaws.com/model/claude/invoke", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.AI_TOKEN },
      body: JSON.stringify({ prompt: req.body.subject })
    });

    res.json({ ticket: ticket.rows[0], ai: await aiResult.json() });
  } catch (e) {
    res.status(500).json({ error: e.message });  // sends error to client
  }
}`}</code></pre>
          </>
        }
        tasks={[
          "List the issues you find — rank them by severity (blocking vs suggestion).",
          "For each blocking issue: explain why it's a problem and show the fix.",
          "How do you deliver this feedback to a junior engineer without discouraging them?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Issues ranked by severity:

// BLOCKING — must fix before merge:

// 1. [SECURITY] Error message leaked to client
// Current: res.status(500).json({ error: e.message })
// Risk: e.message may contain SQL details, file paths, internal API URLs
// Fix: log the full error server-side, return a generic message to client
// res.status(500).json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
// logger.error("handleCreateTicket failed", { error: e, userId: req.user?.id });

// 2. [SECURITY] AI API key in Authorization header
// Current: Authorization: "Bearer " + process.env.AI_TOKEN
// Bedrock uses IAM roles, not API tokens. process.env.AI_TOKEN suggests a third-party key
// Fix: use IAM role with Bedrock permissions (no key needed)
// or: fetch from Secrets Manager, never from env var (secrets rotation)

// 3. [RELIABILITY] No types — req, res are any
// Risk: req.body.subject could be undefined (no validation), SQL injection via body
// Fix: validate body with Zod before touching req.body
// const body = CreateTicketSchema.parse(req.body);

// 4. [ARCHITECTURE] Synchronous AI call in the HTTP handler
// Risk: Bedrock latency (1-10s) blocks the HTTP response; customer waits
// Fix: save ticket to DB, return 202 Accepted, process AI async via SQS/Temporal
// Current design also creates a 500 if Bedrock fails, failing the ticket creation too

// 5. [ARCHITECTURE] Direct SQL in controller — no layering
// Risk: controller knows DB schema, hard to test, no domain layer
// Fix: createTicketUseCase.execute(body) — controller is thin

// SUGGESTIONS — worth discussing:

// 6. [SUGGESTION] No idempotency key header handling
//    Mobile apps send duplicates on network retry — this creates duplicate tickets

// 7. [SUGGESTION] No correlation ID in the response
//    When the customer calls support saying "my ticket creation failed",
//    there's no way to find the logs for this request

// How to deliver feedback to junior engineer:
// "This is a solid first attempt — you got the happy path right and the try/catch is there.
// A few things to work through together: the biggest one is the error message leak on line N
// — this is a security issue I've seen cause real incidents. Here's what I'd do instead.
// Also the synchronous AI call will timeout on mobile — let me show you the async pattern
// we use for this. Want to pair on these two and we can get this merged today?"`}</code></pre>
      </SolutionReveal>

      <h3 id="q9-incident">Q9: Production Incident — What Do You Do?</h3>

      <InterviewPlaybook
        title="[INTERVIEWER] At 2am, PagerDuty fires: AI response latency P95 > 30s. Walk me through your response."
        intro="GoDaddy explicitly requires on-call participation and After Action Reviews. They want to see a structured, calm, methodical incident response — not panic or guesswork."
        steps={[
          "Acknowledge and communicate: 'First, I post in the on-call Slack channel: \"I'm on this. Investigating.\" This keeps the team informed and prevents duplicate investigation.'",
          "Triage the blast radius: 'What % of customers are affected? Is it all regions or one? Is ticket creation also broken or just slow? I check the AI latency dashboard and look at the HTTP 5xx rate — if 5xx is flat, tickets are still creating, just responding slowly.'",
          "Identify the bottleneck: 'P95 latency spike → start with the slowest thing. Check Bedrock metrics: ThrottledInvocations count. Check Temporal task queue depth. Check OpenSearch latency. Narrow to which Activity is slow.'",
          "Mitigate first, root-cause second: 'If Bedrock is throttling: reduce Temporal worker concurrency to lower LLM request volume. If the queue is backed up: scale up workers temporarily. Enable the fallback classifier (rule-based) to bypass Bedrock for low-complexity tickets. Latency drops → document what I did.'",
          "Write the AAR: 'After mitigating: document timeline, impact, root cause, mitigation, and prevention. Root cause was: Bedrock quota too low for peak traffic. Prevention: increase quota proactively; add circuit breaker to fall back to rule-based classification when Bedrock latency > 5s.'",
        ]}
      />

      <h3 id="q10-star">Q10: STAR Stories Library</h3>
      <p>
        Prepare these five stories before your interview. Each should be adaptable to multiple
        question types. Practice them out loud until they are 2 minutes each.
      </p>
      <pre><code>{`// Story 1: Technical decision with disagreement
// Question triggers: "Tell me about a technical decision you drove"
//                   "Describe a time you disagreed with the team"
// Setup: Proposed replacing bespoke retry logic + multiple SQS consumers
//        with Temporal. Two senior engineers preferred to stay with SQS.
// Action: RFC document with concrete comparison (lines of code, failure scenarios,
//         testability). Ran a 2-week spike with both approaches. Data showed
//         Temporal had 40% less code and was fully unit-testable.
// Result: Team adopted Temporal. Error rate on the workflow dropped 60%
//         in the first month.

// Story 2: Performance optimization with measurable impact
// Question triggers: "Tell me about a performance improvement you delivered"
// Setup: Support ticket search was timing out for customers with >100 tickets.
//        N+1 query pattern — fetching messages for each ticket in a loop.
// Action: Profiled with EXPLAIN ANALYZE. Replaced N+1 with a single batch query
//         + DynamoDB batch read. Added a GSI for the access pattern.
// Result: Search latency dropped from 8s (P95) to 200ms. Zero customer complaints
//         about search in the following quarter.

// Story 3: Mentoring a junior/mid engineer
// Question triggers: "Tell me about a time you mentored someone"
//                   "How do you help engineers grow?"
// Setup: Junior engineer was submitting PRs with no error handling and
//        no tests. Code review cycle was taking 3 days.
// Action: Paired for 2 hours weekly for 6 weeks. Focused on: why tests matter
//         (showed them a production incident caused by untested code), not just
//         what to write. Co-wrote the first test suite together.
// Result: PR review cycle dropped to same-day. Engineer now writes tests by default
//         and recently mentored another junior engineer using the same approach.

// Story 4: Ambiguous requirements → defined the solution
// Question triggers: "Tell me about a time you dealt with ambiguity"
// Setup: "Build an AI chatbot for support" — no spec, no data, no evaluation criteria.
// Action: Ran a 2-week discovery: interviewed 5 support agents, analyzed
//         1000 past tickets for pattern, defined success metrics (auto-resolution rate,
//         satisfaction score). Wrote a product spec before any code.
// Result: Got PM, EM, and support team lead buy-in before sprint 1. No scope creep
//         because success criteria were defined upfront.

// Story 5: Cross-team collaboration on shared API
// Question triggers: "Tell me about collaborating with other teams"
// Setup: Frontend and backend teams were defining the same classification API
//        endpoint differently, discovered 2 weeks before launch.
// Action: Organized a 1-hour joint meeting. Shared the frontend spec with backend,
//         backend shared constraints. Agreed on schema in 45 minutes.
//         Wrote contract tests (Pact) so future drift would be caught in CI.
// Result: Launched on time. Pact tests caught a breaking change 3 weeks later,
//         preventing a production incident.`}</code></pre>

      <h2 id="questions-to-ask">Questions to Ask Your Interviewer</h2>
      <pre><code>{`// Strong questions for GoDaddy Senior SDE AI round:

// Technical / AI:
"What is the current state of the AI care platform?
Are you building the RAG pipeline from scratch, or evolving an existing system?
What AI provider do you use — Bedrock, or direct OpenAI/Anthropic?"

"How do you currently measure AI response quality?
Do you have an evaluation dataset and LLM-as-judge scoring in place?"

"Is Temporal already in production, or is this a greenfield adoption?
What is the team's current experience level with Temporal?"

// Architecture / Process:
"How do the engineering teams practice DDD in day-to-day development?
Is there a formal review process for domain model changes?"

"What does the on-call rotation look like — how many engineers share the rotation,
and what is the approximate alert frequency per week?"

// Team / Growth:
"What is the biggest technical challenge the Care AI team expects to face
in the next 6 months?"

"What does the career growth path look like from Senior SDE to Staff SDE at GoDaddy?
Are there opportunities to lead architectural decisions across teams?"`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Talk continuously</strong> — GoDaddy evaluates thought process. A correct answer arrived at silently scores lower than an imperfect answer explained clearly.</li>
        <li><strong>DDD vocabulary matters</strong> — use precise terms: aggregate root, value object, bounded context, port, adapter. Surface-level DDD knowledge is a red flag for this role.</li>
        <li><strong>Security is a first-class concern</strong> — GoDaddy explicitly lists &quot;secure coding practices&quot;. Every coding challenge: identify the security implications first (input validation, auth, secrets, error leakage).</li>
        <li><strong>Production thinking</strong> — for every design question, proactively name failure modes, observability hooks, and SLA implications. &quot;And here is how we detect it before customers do.&quot;</li>
        <li><strong>Temporal fluency is a differentiator</strong> — it is listed in the JD. Being able to explain durable execution, signals, and the Saga pattern gives you a significant edge over candidates who only know SQS/Step Functions.</li>
        <li>On-call is evaluated — know the incident response playbook: communicate first, triage blast radius, mitigate then root-cause, write the AAR with prevention action items.</li>
      </ul>
    </div>
  );
}
