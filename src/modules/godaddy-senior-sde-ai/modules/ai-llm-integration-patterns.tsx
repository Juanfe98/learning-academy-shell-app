import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const ragPipelineDiagram = String.raw`flowchart TD
  INGEST["Ingestion Pipeline\nKnowledge base articles\nProduct documentation\nPast ticket resolutions"]
  INGEST --> CHUNK["Chunking\nSplit into ~500 token segments\nwith 50 token overlap"]
  CHUNK --> EMBED["Embedding Model\nAmazon Titan / OpenAI ada-002\nConvert text → vector [1536 dims]"]
  EMBED --> VECTOR["Vector Store\nOpenSearch / pgvector / Pinecone\nIndexed by embedding"]
  QUERY["Customer Query:\n'How do I transfer my domain?'"]
  QUERY --> QEMBED["Embed the query\n(same model as ingestion)"]
  QEMBED --> SEARCH["Similarity Search\ncos_similarity top-k=5"]
  SEARCH --> VECTOR
  VECTOR --> CTX["Retrieved Context\nTop 5 relevant chunks"]
  CTX --> PROMPT["Augmented Prompt\nSystem + context + user query"]
  PROMPT --> LLM["LLM (Claude / GPT-4 / Bedrock)\nGenerates grounded response"]
  LLM --> RESP["Response to customer\nWith source citations"]`;

const agentReActDiagram = String.raw`sequenceDiagram
  participant U as Customer
  participant AGENT as AI Agent
  participant TOOLS as Tool Registry
  participant DB as DynamoDB
  participant LLM as Bedrock / Claude

  U->>AGENT: "My domain renewal failed, why?"
  AGENT->>LLM: Thought: I need to look up this customer's account
  LLM-->>AGENT: Action: lookup_customer_account(customerId)
  AGENT->>TOOLS: invoke lookup_customer_account
  TOOLS->>DB: Query customer record
  DB-->>TOOLS: Customer data
  TOOLS-->>AGENT: { email, domains, subscription_status }
  AGENT->>LLM: Thought: I see the renewal failed. Check billing.
  LLM-->>AGENT: Action: check_billing_status(customerId)
  AGENT->>TOOLS: invoke check_billing_status
  TOOLS-->>AGENT: { status: "card_expired", last4: "4242" }
  AGENT->>LLM: Observation: card expired. Generate response.
  LLM-->>AGENT: Final Answer: "Your domain renewal failed because..."
  AGENT-->>U: Helpful response with resolution steps`;

export const toc: TocItem[] = [
  { id: "llm-integration", title: "LLM API Integration Patterns", level: 2 },
  { id: "provider-abstraction", title: "Provider Abstraction Layer", level: 3 },
  { id: "streaming", title: "Streaming Responses", level: 3 },
  { id: "rag", title: "RAG — Retrieval Augmented Generation", level: 2 },
  { id: "chunking", title: "Chunking Strategy", level: 3 },
  { id: "embedding", title: "Embedding Models & Vector Stores", level: 3 },
  { id: "retrieval", title: "Retrieval & Reranking", level: 3 },
  { id: "agents", title: "AI Agent Architecture", level: 2 },
  { id: "react-pattern", title: "ReAct Pattern & Tool Use", level: 3 },
  { id: "prompt-engineering", title: "Prompt Engineering for Production", level: 2 },
  { id: "context-management", title: "Context Window Management", level: 3 },
  { id: "cost-optimization", title: "Cost Optimization", level: 2 },
  { id: "eval-testing", title: "Evaluation & Testing LLM Apps", level: 2 },
  { id: "guardrails", title: "Guardrails & Safety", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "AI Integration Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AiLlmIntegrationPatterns() {
  return (
    <div className="article-content">
      <p>
        The GoDaddy JD is for the &quot;Care Team (AI)&quot; — the parenthetical is the key.
        This team builds AI-powered solutions that enhance customer service. Prior AI/ML
        experience is listed as desired, but for a role with &quot;AI&quot; in the title, it
        is effectively required. This module covers the engineering patterns for production
        LLM integration: RAG pipelines, AI agents, prompt engineering, cost optimization,
        and the evaluation/testing discipline that separates prototypes from production systems.
      </p>

      <h2 id="llm-integration">LLM API Integration Patterns</h2>
      <p>
        The most common mistake in LLM integration: calling the OpenAI or Bedrock API directly
        from business logic, hardcoding model names, and building no abstraction layer. When
        you need to switch providers (cost, capability, compliance), the refactor is enormous.
        The solution is to treat the LLM as a port in your hexagonal architecture.
      </p>

      <h3 id="provider-abstraction">Provider Abstraction Layer</h3>
      <pre><code>{`// LLM port — defined in the application layer
interface LlmPort {
  complete(request: LlmRequest): Promise<LlmResponse>;
  stream(request: LlmRequest): AsyncIterable<string>;
}

interface LlmRequest {
  systemPrompt: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;  // 0 = deterministic, 1 = creative
  tools?: LlmTool[];     // for function/tool calling
}

interface LlmResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  stopReason: "end_turn" | "max_tokens" | "tool_use";
  toolUse?: ToolUseBlock[];
}

// Bedrock adapter (Claude via AWS Bedrock — likely at GoDaddy)
class BedrockClaudeAdapter implements LlmPort {
  constructor(
    private readonly client: BedrockRuntimeClient,
    private readonly modelId = "anthropic.claude-3-5-sonnet-20241022-v2:0",
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const response = await this.client.send(new InvokeModelCommand({
      modelId: this.modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: request.systemPrompt,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.3,
        tools: request.tools,
      }),
    }));

    const body = JSON.parse(new TextDecoder().decode(response.body));
    return {
      content: body.content[0].text,
      usage: { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens },
      stopReason: body.stop_reason,
      toolUse: body.content.filter((c: any) => c.type === "tool_use"),
    };
  }

  async *stream(request: LlmRequest): AsyncIterable<string> {
    const response = await this.client.send(new InvokeModelWithResponseStreamCommand({
      modelId: this.modelId,
      body: JSON.stringify({ /* same as complete */ }),
    }));

    for await (const event of response.body!) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk?.bytes));
      if (chunk.type === "content_block_delta" && chunk.delta?.text) {
        yield chunk.delta.text;
      }
    }
  }
}

// OpenAI adapter: same interface, different implementation
class OpenAiAdapter implements LlmPort {
  async complete(request: LlmRequest): Promise<LlmResponse> {
    const resp = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: request.systemPrompt },
        ...request.messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });
    return { content: resp.choices[0].message.content!, /* ... */ };
  }
}`}</code></pre>

      <h3 id="streaming">Streaming Responses</h3>
      <pre><code>{`// Streaming is critical for customer-facing AI — users see tokens appear instantly
// vs waiting 5-10 seconds for a complete response

// Next.js API Route with streaming (Server-Sent Events)
export async function POST(req: Request) {
  const { query, conversationId } = await req.json();
  const context = await ragService.retrieveContext(query);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of llm.stream({
          systemPrompt: buildSystemPrompt(context),
          messages: [{ role: "user", content: query }],
        })) {
          // Send each token as SSE
          controller.enqueue(
            encoder.encode(\`data: \${JSON.stringify({ token })}\n\n\`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// Client: display tokens as they arrive
const es = new EventSource("/api/ai/respond");
es.onmessage = (e) => {
  if (e.data === "[DONE]") { es.close(); return; }
  const { token } = JSON.parse(e.data);
  setResponse(prev => prev + token);  // progressive display
};`}</code></pre>

      <h2 id="rag">RAG — Retrieval Augmented Generation</h2>
      <p>
        RAG is the foundational pattern for AI customer support. Instead of relying on the
        LLM&apos;s training data (which is outdated and lacks GoDaddy-specific knowledge),
        RAG retrieves relevant documentation from a knowledge base and injects it into the
        prompt as context. The LLM generates answers grounded in real, current information.
      </p>

      <MermaidDiagram
        chart={ragPipelineDiagram}
        title="RAG Pipeline — GoDaddy Knowledge Base"
        caption="Two phases: ingestion (offline) processes documents into vectors. Retrieval (online) embeds the query, finds similar chunks, and augments the LLM prompt with the retrieved context."
        minHeight={500}
      />

      <h3 id="chunking">Chunking Strategy</h3>
      <p>
        Chunking — splitting documents into pieces before embedding — is the most impactful
        quality decision in a RAG system. Too large: chunks contain irrelevant information
        that dilutes the retrieval signal. Too small: chunks lose context needed to answer questions.
      </p>

      <ArticleTable caption="Chunking strategies and when to use each." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>How it works</th>
              <th>Best for</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fixed size (token count)</td>
              <td>Split every N tokens with M overlap</td>
              <td>Homogeneous documents (FAQs, articles)</td>
              <td>Splits mid-sentence — loses semantic coherence</td>
            </tr>
            <tr>
              <td>Sentence / paragraph</td>
              <td>Split on natural boundaries (periods, newlines)</td>
              <td>Prose documentation</td>
              <td>Variable chunk sizes may exceed context window</td>
            </tr>
            <tr>
              <td>Semantic chunking</td>
              <td>Embed sentences, split where embedding distance spikes</td>
              <td>Long documents with topic changes</td>
              <td>Computationally expensive ingestion</td>
            </tr>
            <tr>
              <td>Hierarchical (parent-child)</td>
              <td>Store large parent chunks + small child chunks; retrieve child, return parent</td>
              <td>Complex documentation with subsections</td>
              <td>More complex index management</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="embedding">Embedding Models & Vector Stores</h3>
      <pre><code>{`// Embedding service — converts text to dense vector representation
class EmbeddingService {
  constructor(private readonly bedrockClient: BedrockRuntimeClient) {}

  async embed(text: string): Promise<number[]> {
    const response = await this.bedrockClient.send(new InvokeModelCommand({
      modelId: "amazon.titan-embed-text-v2:0",
      body: JSON.stringify({ inputText: text, dimensions: 1024 }),
    }));
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding;
  }

  // Batch embed — more efficient than calling one by one
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Bedrock Titan doesn't support batch — parallelize with concurrency limit
    const chunks = chunk(texts, 10);  // process 10 at a time
    const results: number[][] = [];
    for (const batch of chunks) {
      const embeddings = await Promise.all(batch.map(t => this.embed(t)));
      results.push(...embeddings);
    }
    return results;
  }
}

// pgvector: PostgreSQL extension for vector similarity search
// Great choice when you already have RDS Postgres (no new infra)
// SQL for finding top-k similar documents:
// SELECT id, content, (embedding <=> $1::vector) as distance
// FROM knowledge_base
// WHERE category = 'domain_management'
// ORDER BY embedding <=> $1::vector
// LIMIT 5;

// OpenSearch: AWS-managed vector search (scales beyond Postgres)
// Pinecone: fully managed, no infrastructure to run`}</code></pre>

      <h3 id="retrieval">Retrieval & Reranking</h3>
      <pre><code>{`// RAG retrieval with reranking — two-stage retrieval for higher precision
class RagRetrievalService {
  async retrieve(query: string, topK = 5): Promise<RetrievedChunk[]> {
    // Stage 1: Approximate nearest neighbor search (fast, recall-focused)
    // Retrieves top-20 candidates using cosine similarity on embeddings
    const queryEmbedding = await this.embeddings.embed(query);
    const candidates = await this.vectorStore.similaritySearch(queryEmbedding, topK * 4);

    // Stage 2: Reranking (precise, but only runs on 20 candidates)
    // Cross-encoder reranker scores query-document pairs more accurately
    const reranked = await this.reranker.rank(query, candidates);

    // Return top-k after reranking
    return reranked.slice(0, topK);
  }
}

// Prompt augmentation with retrieved context
function buildAugmentedPrompt(query: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => \`[Source \${i + 1}]: \${c.content}\n(Source: \${c.metadata.title})\`)
    .join("\n\n");

  return \`You are a GoDaddy customer support assistant. Answer the customer's question
using ONLY the information in the provided context. If the context doesn't contain
enough information to answer, say so — do not make up information.

CONTEXT:
\${context}

CUSTOMER QUESTION:
\${query}

Provide a clear, helpful answer. Cite the source number(s) you used.\`;
}`}</code></pre>

      <h2 id="agents">AI Agent Architecture</h2>
      <p>
        RAG answers questions from a knowledge base. AI Agents go further — they can take
        actions: look up a customer&apos;s account, check billing status, create a ticket,
        send an email. The agent loop: think → act → observe → think again, until it reaches
        a final answer or escalates to a human.
      </p>

      <MermaidDiagram
        chart={agentReActDiagram}
        title="AI Agent ReAct Loop — Customer Support Agent"
        caption="The agent interleaves reasoning (Thought) and action (Action) until it has enough information to answer. Tools are domain functions exposed to the LLM via structured schemas. The agent never calls tools directly — the runtime does."
        minHeight={440}
      />

      <h3 id="react-pattern">ReAct Pattern & Tool Use</h3>
      <pre><code>{`// Tool definitions — exposed to LLM as JSON schema
const supportTools: LlmTool[] = [
  {
    name: "lookup_customer_account",
    description: "Retrieves a customer's account information including domains and subscription status.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "The customer's unique ID" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "check_domain_status",
    description: "Checks the registration and DNS status of a specific domain.",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "The domain name, e.g. example.com" },
      },
      required: ["domain"],
    },
  },
  {
    name: "create_support_ticket",
    description: "Creates a support ticket when the AI cannot resolve the issue.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        category: { type: "string", enum: ["billing", "technical", "account", "domain"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["summary", "category"],
    },
  },
];

// Tool execution router
const toolExecutors: Record<string, (input: unknown) => Promise<unknown>> = {
  lookup_customer_account: ({ customer_id }) =>
    customerService.getAccount(customer_id as string),
  check_domain_status: ({ domain }) =>
    domainService.checkStatus(domain as string),
  create_support_ticket: (input) =>
    ticketService.create(input as CreateTicketCommand),
};

// Agent loop — runs until final answer or max iterations
async function runSupportAgent(
  customerId: string,
  userMessage: string,
  maxIterations = 10,
): Promise<string> {
  const messages: LlmMessage[] = [{ role: "user", content: userMessage }];
  const systemPrompt = buildAgentSystemPrompt(customerId);

  for (let i = 0; i < maxIterations; i++) {
    const response = await llm.complete({ systemPrompt, messages, tools: supportTools });

    if (response.stopReason === "end_turn") {
      return response.content;  // LLM has a final answer
    }

    if (response.stopReason === "tool_use" && response.toolUse) {
      // Execute each tool the LLM requested
      const toolResults = await Promise.all(
        response.toolUse.map(async (tu) => {
          const executor = toolExecutors[tu.name];
          if (!executor) return { toolUseId: tu.id, content: "Tool not found" };
          try {
            const result = await executor(tu.input);
            return { toolUseId: tu.id, content: JSON.stringify(result) };
          } catch (err) {
            return { toolUseId: tu.id, content: \`Error: \${(err as Error).message}\` };
          }
        })
      );

      // Add LLM's reasoning + tool results to conversation history
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }

  return "I was unable to resolve your issue. Creating a support ticket for you.";
}`}</code></pre>

      <h2 id="prompt-engineering">Prompt Engineering for Production</h2>
      <pre><code>{`// Production prompt engineering principles:

// 1. System prompt: define the persona, constraints, and output format explicitly
const SUPPORT_AGENT_SYSTEM = \`You are a GoDaddy customer support specialist.
Your goal: resolve customer issues accurately and efficiently.

RULES:
- Only make claims you can verify from the customer's account data or retrieved context
- Never promise refunds, account credits, or policy exceptions without manager approval
- If you cannot resolve the issue: create a support ticket, do not keep trying
- Keep responses concise (< 200 words unless technical detail is required)
- Always acknowledge the customer's frustration before explaining the solution

OUTPUT FORMAT:
- Start with a brief acknowledgment
- Provide the solution or next steps
- If a ticket was created: include the ticket ID
- End with: "Is there anything else I can help you with?"\`;

// 2. Few-shot examples: show the model the desired behavior
const FEW_SHOT_EXAMPLES = \`
EXAMPLE 1:
Customer: "My website is down!"
Assistant: "I can see your concern — that's urgent. I've checked your hosting account and
your hosting plan is active. The issue appears to be a DNS propagation delay for the recent
nameserver change made 2 hours ago. DNS propagation typically takes 24-48 hours.
Your site should be accessible within the next few hours.
Is there anything else I can help you with?"

EXAMPLE 2:
Customer: "Why was I charged twice?"
Assistant: "I understand how frustrating double charges are. I've reviewed your billing
history. You were charged \${'\$'}19.99 on May 1st for domain renewal and \${'\$'}19.99 on May 3rd
for hosting renewal — these are two separate services on different renewal dates.
If you believe this is incorrect, I can create a billing review ticket.
Is there anything else I can help you with?"\`;`}</code></pre>

      <h3 id="context-management">Context Window Management</h3>
      <pre><code>{`// Long conversations exceed context windows — must manage strategically
class ConversationContextManager {
  private readonly maxTokens = 100_000;  // Claude Sonnet context
  private readonly reservedForResponse = 4_000;
  private readonly maxContextTokens = this.maxTokens - this.reservedForResponse;

  compress(messages: LlmMessage[], systemPromptTokens: number): LlmMessage[] {
    const availableForHistory = this.maxContextTokens - systemPromptTokens;
    const estimatedTokens = messages.reduce((sum, m) =>
      sum + this.estimateTokens(m.content), 0);

    if (estimatedTokens <= availableForHistory) {
      return messages;  // fits fine
    }

    // Strategy: summarize the oldest messages, keep the recent ones verbatim
    const recent = messages.slice(-6);  // always keep last 3 turns
    const older = messages.slice(0, -6);

    if (older.length === 0) return recent;

    // Summarize older messages with a quick LLM call
    return [
      {
        role: "system",
        content: \`[Earlier conversation summary]: \${this.summarize(older)}\`,
      },
      ...recent,
    ];
  }
}`}</code></pre>

      <h2 id="cost-optimization">Cost Optimization</h2>

      <ArticleTable caption="LLM cost optimization techniques for production AI systems." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Technique</th>
              <th>Impact</th>
              <th>Trade-off</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prompt caching (Anthropic)</td>
              <td>90% cost reduction on cached tokens</td>
              <td>Cache TTL = 5 min; system prompt must be first in request</td>
            </tr>
            <tr>
              <td>Model routing by complexity</td>
              <td>Use Haiku for classification, Sonnet for generation</td>
              <td>Need to classify query complexity accurately</td>
            </tr>
            <tr>
              <td>Response caching</td>
              <td>Identical queries → cached response</td>
              <td>Semantic deduplication needed; stale cache risk</td>
            </tr>
            <tr>
              <td>Limit max_tokens</td>
              <td>Set tight limit based on use case</td>
              <td>Truncated responses if limit too low</td>
            </tr>
            <tr>
              <td>Batch inference</td>
              <td>50% cost discount (Bedrock / OpenAI batch)</td>
              <td>24h latency — only for offline classification</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="eval-testing">Evaluation & Testing LLM Apps</h2>
      <pre><code>{`// LLM testing is different from unit testing — output is probabilistic
// You need evaluation datasets with expected behaviors, not exact matches

// 1. Unit tests for deterministic components
describe("RagRetrievalService", () => {
  it("retrieves top-k relevant chunks for a domain transfer query", async () => {
    const service = new RagRetrievalService(
      new MockEmbeddingService(),      // returns pre-computed embeddings
      new InMemoryVectorStore(testChunks),
    );
    const results = await service.retrieve("How do I transfer my domain?", 3);
    expect(results).toHaveLength(3);
    expect(results[0].metadata.category).toBe("domain_management");
  });
});

// 2. Prompt regression tests — catch prompt changes that degrade output
describe("Support prompt regression", () => {
  const testCases = [
    {
      input: "My domain is not resolving",
      mustContain: ["DNS", "propagation"],
      mustNotContain: ["refund", "I don't know"],
      category: "domain",
    },
    {
      input: "How do I cancel my hosting plan?",
      mustContain: ["cancel", "account"],
      mustNotContain: ["There is nothing I can do"],
      category: "billing",
    },
  ];

  for (const tc of testCases) {
    it(\`handles: \${tc.input}\`, async () => {
      const response = await agentService.respond({ query: tc.input });
      for (const must of tc.mustContain) {
        expect(response.toLowerCase()).toContain(must.toLowerCase());
      }
      for (const mustNot of tc.mustNotContain) {
        expect(response.toLowerCase()).not.toContain(mustNot.toLowerCase());
      }
    }, 30_000);  // longer timeout for LLM calls
  }
});

// 3. LLM-as-judge evaluation for quality scoring
async function evaluateResponse(question: string, response: string): Promise<EvalScore> {
  const judgment = await llm.complete({
    systemPrompt: "You are an evaluator. Rate this customer support response.",
    messages: [{
      role: "user",
      content: \`Question: \${question}\nResponse: \${response}\n
Rate on: accuracy (1-5), helpfulness (1-5), safety (1-5). Output JSON only.\`
    }],
    temperature: 0,  // deterministic for evaluation
  });
  return JSON.parse(judgment.content) as EvalScore;
}`}</code></pre>

      <h2 id="guardrails">Guardrails & Safety</h2>
      <pre><code>{`// Production AI guardrails — critical for customer-facing systems

// 1. Input guardrails: classify before processing
async function classifyIntent(query: string): Promise<IntentClassification> {
  // Fast, cheap model (Haiku) for intent classification
  const result = await fastLlm.complete({
    systemPrompt: "Classify the user query. Output JSON: { intent, isSafe, isSupport }",
    messages: [{ role: "user", content: query }],
    temperature: 0,
    maxTokens: 100,
  });
  return JSON.parse(result.content);
}

// 2. Output guardrails: check before sending to customer
async function validateResponse(response: string): Promise<ValidationResult> {
  // Check for PII leakage, policy violations, hallucinated facts
  const checks = await Promise.all([
    piiDetector.scan(response),                    // redact phone numbers, emails
    policyChecker.containsProhibitedContent(response), // no competitor mentions
    factChecker.hasUnsupportedClaims(response),    // no invented pricing
  ]);
  return { isSafe: checks.every(c => c.passed), violations: checks.filter(c => !c.passed) };
}

// 3. AWS Bedrock Guardrails — managed service for LLM safety
// CDK:
const guardrail = new bedrock.CfnGuardrail(this, "SupportGuardrail", {
  name: "godaddy-support-guardrail",
  blockedInputMessaging: "I cannot process this request.",
  blockedOutputsMessaging: "I cannot provide this information.",
  contentPolicyConfig: {
    filtersConfig: [
      { type: "HATE", inputStrength: "HIGH", outputStrength: "HIGH" },
      { type: "VIOLENCE", inputStrength: "MEDIUM", outputStrength: "MEDIUM" },
    ],
  },
  sensitiveInformationPolicyConfig: {
    piiEntitiesConfig: [
      { type: "CREDIT_DEBIT_CARD_NUMBER", action: "BLOCK" },
      { type: "AWS_SECRET_KEY", action: "BLOCK" },
    ],
  },
});`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How would you build an AI system that answers customer support questions for GoDaddy?'"
        intro="This is the core system design question for this role. Show that you understand the full pipeline from knowledge ingestion to response delivery, and that you think about production concerns from the start."
        steps={[
          "Start with RAG, not fine-tuning: 'My first choice is always RAG over fine-tuning. Fine-tuning teaches the model new behavior patterns; RAG gives it access to current, accurate, source-cited information. GoDaddy's product documentation and past ticket resolutions are the knowledge base.'",
          "Explain the pipeline: 'Three phases: ingestion (chunk docs → embed → store in vector DB), retrieval (embed query → similarity search → rerank top-5), generation (augmented prompt with retrieved context → Claude/Bedrock → response with citations).'",
          "Address the AI agent for complex issues: 'Simple FAQ questions are answered by RAG alone. Complex cases — account issues, billing disputes — need an agent that can look up the customer\\'s account, check domain status, and create tickets. I implement this with Claude\\'s tool use capability.'",
          "Close with production concerns: 'What makes the difference in production: evaluation datasets with regression tests, prompt caching for 90% cost reduction on the system prompt, input/output guardrails via Bedrock Guardrails, and LLM-as-judge quality scoring on a sample of conversations daily.'",
        ]}
      />

      <InterviewChallenge
        title="AI Integration Challenge: GoDaddy Domain Transfer Assistant"
        scenario={
          <>
            GoDaddy wants an AI assistant that helps customers transfer domains from
            competitors (GoDaddy&apos;s &quot;Domain Transfer&quot; product). The assistant
            should: answer questions about the transfer process, look up domain eligibility
            (transfer lock, expiry within 60 days blocks transfer), walk customers through
            the steps, and create a support ticket if the customer gets stuck. You have
            45 minutes to design and sketch the implementation.
          </>
        }
        tasks={[
          "What knowledge sources would you ingest into the RAG knowledge base for this assistant?",
          "Define the 3-4 tools the AI agent needs to accomplish its goal. Write the tool schema for one.",
          "What are the guardrails? What inputs should be blocked? What outputs should be validated before delivery?",
          "The assistant must not access sensitive account data if the user is unauthenticated. How do you enforce this?",
          "How do you measure if the assistant is actually helping? Define 3 business metrics.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Treat LLM as a port</strong> — define a provider-agnostic interface. Switching from OpenAI to Bedrock should require changing only the adapter, not the business logic.</li>
        <li><strong>RAG over fine-tuning</strong> for customer support — RAG gives access to current, source-cited information. Fine-tuning teaches behavior, not facts.</li>
        <li><strong>Chunking strategy determines RAG quality</strong> — 500-token chunks with 50-token overlap and semantic boundary splitting gives the best retrieval precision for documentation.</li>
        <li><strong>AI Agents + Tool Use</strong> for complex support cases — the ReAct loop (Think → Act → Observe) with domain-specific tools handles multi-step resolution workflows.</li>
        <li><strong>Evaluation is not optional</strong> — LLM output is probabilistic. Build regression test datasets, use LLM-as-judge for quality scoring, and monitor production response quality daily.</li>
        <li><strong>Prompt caching</strong> (Anthropic) reduces cost by 90% for cached tokens — always put the system prompt first and enable caching for production AI systems.</li>
      </ul>
    </div>
  );
}
