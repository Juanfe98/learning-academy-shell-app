import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const temporalArchDiagram = String.raw`flowchart TD
  CLIENT["Client / API\nstarts workflow execution"]
  CLIENT --> TSERVER["Temporal Server\nOrchestration state machine\nDurable task queue"]
  TSERVER --> WORKER["Worker Process\nYour code runs here\nWorkflows + Activities"]
  WORKER --> ACTIVITY["Activity\nExternal API calls\nDB reads/writes\nLLM inference"]
  ACTIVITY --> LLM["AWS Bedrock / OpenAI\nClassification\nResponse generation"]
  ACTIVITY --> DB["DynamoDB\nTicket persistence"]
  ACTIVITY --> SQS["SQS / SNS\nEvent publishing"]
  TSERVER --> HISTORY["Event History\nDurable log of every state transition\nReplay-safe execution"]
  WORKER -."heartbeat & completion".-> TSERVER`;

const aiPipelineDiagram = String.raw`sequenceDiagram
  participant API as REST API
  participant TEMP as Temporal Server
  participant WF as Workflow (Worker)
  participant ACT as Activities (Worker)
  participant LLM as Bedrock

  API->>TEMP: StartWorkflow(SupportTicketWorkflow, {ticketId, subject})
  TEMP->>WF: Schedule workflow
  WF->>ACT: ClassifyTicketActivity(subject)
  ACT->>LLM: Classify intent + category
  LLM-->>ACT: { category: "domain", intent: "transfer_question" }
  ACT-->>WF: classification result
  WF->>ACT: RetrieveKnowledgeActivity(category, intent)
  ACT-->>WF: relevant knowledge chunks
  WF->>ACT: GenerateResponseActivity(subject, chunks)
  ACT->>LLM: Generate grounded response
  LLM-->>ACT: response text
  ACT-->>WF: AI response
  WF->>ACT: UpdateTicketActivity(ticketId, response, classification)
  Note over WF: If any activity fails: auto-retry with backoff
  Note over WF: If worker crashes: resume from last completed activity`;

export const toc: TocItem[] = [
  { id: "what-is-temporal", title: "What is Temporal?", level: 2 },
  { id: "durable-execution", title: "Durable Execution Model", level: 3 },
  { id: "workflows-activities", title: "Workflows vs Activities", level: 2 },
  { id: "workflow-code", title: "Writing Workflows", level: 3 },
  { id: "activity-code", title: "Writing Activities", level: 3 },
  { id: "retry-policies", title: "Retry Policies & Timeouts", level: 2 },
  { id: "signals-queries", title: "Signals & Queries", level: 2 },
  { id: "saga-pattern", title: "Saga Pattern — Distributed Transactions", level: 2 },
  { id: "child-workflows", title: "Child Workflows", level: 3 },
  { id: "ai-pipeline", title: "Temporal for AI Pipelines", level: 2 },
  { id: "temporal-vs-sqs", title: "Temporal vs SQS + Step Functions", level: 2 },
  { id: "testing-temporal", title: "Testing Temporal Workflows", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Temporal Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TemporalWorkflowEngine() {
  return (
    <div className="article-content">
      <p>
        Temporal is explicitly mentioned in the GoDaddy JD as a desired skill. This is a
        significant signal — it means GoDaddy either already uses Temporal or plans to.
        For an AI Care platform, Temporal is a natural fit: multi-step AI pipelines (classify →
        retrieve → generate → persist) that must be reliable under LLM API failures, network
        timeouts, and worker crashes. This module covers Temporal from first principles through
        the AI pipeline patterns GoDaddy is likely to use.
      </p>

      <h2 id="what-is-temporal">What is Temporal?</h2>
      <p>
        Temporal is a workflow orchestration platform that provides <strong>durable
        execution</strong> — the ability to write code that continues correctly even if the
        process crashes, the network fails, or an external API is unavailable. The mental
        model: Temporal makes a sequence of steps behave as if it always runs on a
        reliable, never-crashing computer.
      </p>
      <p>
        The alternative without Temporal: SQS queues + Lambda + DynamoDB state tracking +
        Step Functions + custom retry logic + dead letter queues + manual reconciliation.
        Temporal replaces all of that complexity with plain code that looks synchronous but
        runs durably.
      </p>

      <MermaidDiagram
        chart={temporalArchDiagram}
        title="Temporal Architecture — Worker, Server, and Activities"
        caption="The Temporal Server manages the durable task queue and event history. Your code runs in Worker processes. Activities are the leaf nodes — they do the actual I/O (LLM calls, DB writes). Workflows orchestrate activities."
        minHeight={420}
      />

      <h3 id="durable-execution">Durable Execution Model</h3>
      <p>
        The key insight: <strong>Temporal records every state transition in an append-only
        event history</strong>. If the worker crashes mid-workflow, a new worker picks up the
        execution, replays the event history to rebuild the in-memory state, and resumes
        from exactly where it left off. Activities that already completed are NOT re-executed —
        their results are replayed from history.
      </p>
      <pre><code>{`// What makes workflow code "durable"?
// Temporal replays the workflow function to reconstruct state after a crash.
// This has implications for what code is safe to put in a workflow function:

// SAFE in workflows (deterministic, replayed from history):
const result = await activities.classifyTicket(subject);    // replay returns cached result
const date = workflow.now();                                  // use workflow.now(), not Date.now()
const uuid = workflow.uuid4();                               // use workflow.uuid4(), not crypto.randomUUID()

// UNSAFE in workflows (non-deterministic, causes replay issues):
const date = new Date();                     // ✗ different value on replay
const id = Math.random();                    // ✗ different value on replay
await fetch("https://api.example.com/...");  // ✗ activities are for I/O, not workflows
console.log("processing...");                // ✓ safe but beware — replayed on crash

// The workflow function is just orchestration logic — no I/O allowed directly
// All I/O goes in Activities (which Temporal executes exactly once per run)`}</code></pre>

      <h2 id="workflows-activities">Workflows vs Activities</h2>

      <ArticleTable caption="Workflows vs Activities — responsibilities and constraints." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Workflow</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Purpose</td>
              <td>Orchestration — coordinates Activities, manages state machine</td>
              <td>Execution — does actual I/O: API calls, DB writes, computations</td>
            </tr>
            <tr>
              <td>Determinism</td>
              <td>Must be deterministic — replayed on crash</td>
              <td>Can be non-deterministic — retried idempotently</td>
            </tr>
            <tr>
              <td>Duration</td>
              <td>Can run for days, weeks, months</td>
              <td>Short-lived — seconds to minutes</td>
            </tr>
            <tr>
              <td>Failure handling</td>
              <td>Coordinates compensation activities on failure</td>
              <td>Retried automatically with backoff by Temporal</td>
            </tr>
            <tr>
              <td>I/O</td>
              <td>Never — no network, DB, or system calls</td>
              <td>Yes — all external interactions happen here</td>
            </tr>
            <tr>
              <td>Testing</td>
              <td>TestWorkflowEnvironment with mock activities</td>
              <td>Standard unit tests — just function calls</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="workflow-code">Writing Workflows</h3>
      <pre><code>{`import * as workflow from "@temporalio/workflow";
import type * as activities from "./activities";

// Import activities with type info — actual implementation runs in Activity Workers
const { classifyTicket, retrieveKnowledge, generateResponse, updateTicket, escalateTicket } =
  workflow.proxyActivities<typeof activities>({
    startToCloseTimeout: "2 minutes",  // max time for a single activity attempt
    retry: {
      maximumAttempts: 3,
      initialInterval: "1s",
      backoffCoefficient: 2,          // 1s, 2s, 4s
    },
  });

// Workflow: orchestrates the full ticket processing pipeline
export async function SupportTicketWorkflow(input: TicketWorkflowInput): Promise<TicketResult> {
  const { ticketId, subject, customerId } = input;

  // Step 1: Classify — errors here retry automatically
  const classification = await classifyTicket({ ticketId, subject });

  // Step 2: Route based on classification
  if (classification.requiresHumanAgent) {
    // Immediately escalate high-confidence human-required cases
    await escalateTicket({
      ticketId,
      reason: classification.escalationReason,
      priority: classification.priority,
    });
    return { status: "escalated", ticketId };
  }

  // Step 3: Retrieve knowledge from RAG
  const knowledgeChunks = await retrieveKnowledge({
    category: classification.category,
    intent: classification.intent,
    query: subject,
  });

  // Step 4: Generate AI response
  let aiResponse: AiResponse;
  try {
    aiResponse = await generateResponse({ subject, knowledgeChunks, customerId });
  } catch (err) {
    // If AI generation fails after retries, fall back to canned response + escalation
    aiResponse = { content: "I'm having trouble generating a response.", confidence: 0 };
    await escalateTicket({ ticketId, reason: "AI generation failed", priority: "medium" });
  }

  // Step 5: Persist result
  await updateTicket({
    ticketId,
    classification,
    aiResponse: aiResponse.content,
    status: aiResponse.confidence > 0.7 ? "ai_resolved" : "pending_human",
  });

  return { status: "processed", ticketId, confidence: aiResponse.confidence };
}`}</code></pre>

      <h3 id="activity-code">Writing Activities</h3>
      <pre><code>{`import { Context } from "@temporalio/activity";

// Activities: the actual I/O — these are regular async functions
// Temporal retries them on failure, checks heartbeats for long-running tasks

export async function classifyTicket(input: ClassifyInput): Promise<Classification> {
  // Heartbeat: tells Temporal "I'm still alive" — required for long-running activities
  Context.current().heartbeat("classifying...");

  const response = await bedrockClient.complete({
    systemPrompt: CLASSIFICATION_PROMPT,
    messages: [{ role: "user", content: input.subject }],
    temperature: 0,          // deterministic classification
    maxTokens: 200,
  });

  return parseClassification(response.content);
}

export async function generateResponse(input: GenerateInput): Promise<AiResponse> {
  // Check for cancellation (e.g., customer closed the chat)
  Context.current().heartbeat("generating response...");

  const context = input.knowledgeChunks
    .map(c => c.content)
    .join("\n\n");

  const response = await bedrockClient.complete({
    systemPrompt: buildResponsePrompt(context),
    messages: [{ role: "user", content: input.subject }],
    maxTokens: 500,
  });

  const confidence = await scoreResponse(input.subject, response.content);
  return { content: response.content, confidence };
}

// Activity with idempotency — safe to retry
export async function updateTicket(input: UpdateTicketInput): Promise<void> {
  // DynamoDB conditional write: only update if not already processed
  await dynamoClient.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: { S: \`TICKET#\${input.ticketId}\` }, sk: { S: "METADATA" } },
    UpdateExpression: "SET #status = :status, aiResponse = :response, processedAt = :now",
    ConditionExpression: "attribute_not_exists(processedAt)",  // idempotency guard
    ExpressionAttributeValues: {
      ":status": { S: input.status },
      ":response": { S: input.aiResponse },
      ":now": { S: new Date().toISOString() },
    },
  }));
}`}</code></pre>

      <h2 id="retry-policies">Retry Policies & Timeouts</h2>
      <pre><code>{`// Temporal has four timeout types — understand when to use each

// 1. scheduleToStartTimeout: max time Temporal will wait to START the activity
//    (how long it can sit in the queue before a worker picks it up)
// Use: detect queue backup / worker shortage

// 2. startToCloseTimeout: max time for ONE attempt of the activity
//    Must be longer than the activity's expected duration
// Use: per-attempt time limit (LLM calls → 2 min; DB writes → 10s)

// 3. scheduleToCloseTimeout: max total time across ALL attempts
//    If this fires: the activity fails permanently regardless of retries left
// Use: absolute deadline (don't retry forever)

// 4. heartbeatTimeout: if no heartbeat within this window → Temporal cancels
//    Only needed for long-running activities that heartbeat
// Use: batch processing, large uploads

const llmActivities = workflow.proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",      // one LLM call attempt: 2 min max
  scheduleToCloseTimeout: "10 minutes",  // all retries combined: 10 min max
  heartbeatTimeout: "30 seconds",        // heartbeat every 20s in the activity
  retry: {
    maximumAttempts: 5,
    initialInterval: "2s",
    backoffCoefficient: 2,             // 2s, 4s, 8s, 16s, 32s
    maximumInterval: "60s",             // cap backoff at 60s
    nonRetryableErrorTypes: [           // don't retry these — they won't get better
      "InvalidInputError",
      "QuotaExceededError",
    ],
  },
});`}</code></pre>

      <h2 id="signals-queries">Signals & Queries</h2>
      <pre><code>{`// Signals: external code sends a signal INTO a running workflow
// Use case: customer escalates while AI is processing → interrupt the workflow

// Define signals in the workflow definition
export const escalationSignal = workflow.defineSignal<[EscalationReason]>("escalate");
export const customerFeedbackSignal = workflow.defineSignal<[Feedback]>("customerFeedback");

// Queries: read workflow state without interrupting it (synchronous)
export const statusQuery = workflow.defineQuery<WorkflowStatus>("getStatus");

// In the workflow function: listen for signals
export async function SupportTicketWorkflow(input: TicketWorkflowInput): Promise<TicketResult> {
  let escalated = false;

  // Set up signal handler — can be triggered at any point
  workflow.setHandler(escalationSignal, (reason: EscalationReason) => {
    escalated = true;
    workflow.log.info("Escalation signal received", { reason });
  });

  // Set up query handler
  workflow.setHandler(statusQuery, () => ({
    phase: "classifying",
    ticketId: input.ticketId,
  }));

  const classification = await classifyTicket({ subject: input.subject });

  // Check if escalated while classification was running
  if (escalated) {
    await escalateTicket({ ticketId: input.ticketId, reason: "customer_requested" });
    return { status: "escalated" };
  }

  // ... continue processing
}

// Sending a signal from the API layer
const workflowHandle = client.getHandle(workflowId);
await workflowHandle.signal(escalationSignal, { requestedBy: agentId });

// Querying workflow state
const status = await workflowHandle.query(statusQuery);`}</code></pre>

      <h2 id="saga-pattern">Saga Pattern — Distributed Transactions</h2>
      <p>
        Distributed transactions across multiple services are impossible to implement with
        traditional ACID transactions. The Saga pattern chains a sequence of local transactions,
        each with a compensating transaction that runs on failure to undo the previous steps.
        Temporal makes Sagas clean to implement.
      </p>
      <pre><code>{`// Saga: Domain transfer workflow — must rollback cleanly on failure
export async function DomainTransferWorkflow(input: DomainTransferInput): Promise<TransferResult> {
  const compensations: Array<() => Promise<void>> = [];

  try {
    // Step 1: Lock source domain (prevents transfer during processing)
    await lockDomainAtSource(input.domain);
    compensations.push(() => unlockDomainAtSource(input.domain));

    // Step 2: Initiate transfer at GoDaddy
    const transferId = await initiateTransferAtGodaddy(input.domain);
    compensations.push(() => cancelTransferAtGodaddy(transferId));

    // Step 3: Charge the customer
    const chargeId = await chargeCustomer({ customerId: input.customerId, amount: 14.99 });
    compensations.push(() => refundCharge(chargeId));

    // Step 4: Update DNS after auth code confirmed (may wait hours)
    await waitForAuthCodeConfirmation(input.domain);  // Temporal waits durably
    await updateDnsRecords(input.domain);

    // Step 5: Finalize — point of no return
    await finalizeTransfer(transferId);

    return { status: "completed", domain: input.domain };

  } catch (err) {
    // Compensate in reverse order — undo what was done
    workflow.log.error("Transfer failed, compensating", { error: err });

    for (const compensate of compensations.reverse()) {
      try {
        await compensate();
      } catch (compensationErr) {
        // Compensation failed — alert on-call, manual intervention needed
        workflow.log.error("Compensation failed", { error: compensationErr });
        await alertOnCall({ workflowId: workflow.workflowInfo().workflowId });
      }
    }

    throw err;
  }
}`}</code></pre>

      <h2 id="ai-pipeline">Temporal for AI Pipelines</h2>

      <MermaidDiagram
        chart={aiPipelineDiagram}
        title="Temporal AI Processing Pipeline — GoDaddy Care"
        caption="Each step in the AI pipeline is a separate Activity with independent retry policies. If the LLM API fails mid-pipeline, only the failed Activity retries — completed steps are replayed from history without re-executing."
        minHeight={420}
      />

      <h2 id="temporal-vs-sqs">Temporal vs SQS + Step Functions</h2>

      <ArticleTable caption="Temporal vs AWS-native orchestration — when to choose each." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Temporal</th>
              <th>SQS + Step Functions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Code model</td>
              <td>Workflow as regular code (TypeScript/Go)</td>
              <td>State machine defined in JSON/YAML</td>
            </tr>
            <tr>
              <td>Debugging</td>
              <td>Full event history, replay in tests</td>
              <td>CloudWatch logs + X-Ray traces</td>
            </tr>
            <tr>
              <td>Local dev</td>
              <td>Local Temporal server — full workflow testing</td>
              <td>localstack or AWS account required</td>
            </tr>
            <tr>
              <td>Signals/queries</td>
              <td>Native — workflows can receive external events</td>
              <td>Complex: callback URLs + SQS message injection</td>
            </tr>
            <tr>
              <td>Long-running (days/weeks)</td>
              <td>Native — workflows can sleep for weeks</td>
              <td>Step Functions: max 1 year; SQS: complex</td>
            </tr>
            <tr>
              <td>Infrastructure</td>
              <td>Temporal server to run (Temporal Cloud is managed)</td>
              <td>Fully managed, no servers to run</td>
            </tr>
            <tr>
              <td>Cost model</td>
              <td>Temporal Cloud: per action; self-hosted: server cost</td>
              <td>Pay per state transition</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="testing-temporal">Testing Temporal Workflows</h2>
      <pre><code>{`import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";

describe("SupportTicketWorkflow", () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(() => testEnv.teardown());

  it("classifies and responds to domain transfer question", async () => {
    const { client, nativeConnection } = testEnv;

    // Mock activities — replace real LLM calls with deterministic responses
    const mockActivities: typeof activities = {
      classifyTicket: async () => ({
        category: "domain",
        intent: "transfer_question",
        requiresHumanAgent: false,
        confidence: 0.95,
      }),
      retrieveKnowledge: async () => [{
        content: "To transfer a domain, you need an auth code...",
        score: 0.92,
      }],
      generateResponse: async () => ({
        content: "To transfer your domain to GoDaddy, follow these steps...",
        confidence: 0.88,
      }),
      updateTicket: async () => undefined,
      escalateTicket: async () => undefined,
    };

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: "test-queue",
      workflowsPath: require.resolve("./workflows"),
      activities: mockActivities,      // inject mock activities
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(SupportTicketWorkflow, {
        taskQueue: "test-queue",
        workflowId: "test-workflow-1",
        args: [{ ticketId: "t-1", subject: "How do I transfer my domain?", customerId: "c-1" }],
      });

      expect(result.status).toBe("processed");
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });
});`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is Temporal and when would you use it over SQS or Step Functions?'"
        intro="Temporal is listed in GoDaddy's JD — showing genuine understanding rather than surface familiarity is a significant differentiator."
        steps={[
          "Lead with the problem it solves: 'Temporal solves durable execution — the ability to write code that continues correctly even if the process crashes, the network fails, or an external API is unavailable. Without it, you need SQS + DLQ + Step Functions + DynamoDB state tracking + custom retry logic to get the same guarantees.'",
          "Explain the durable execution model: 'Temporal records every state transition in an append-only event history. On worker crash, a new worker replays the history to rebuild state and resumes from where it left off. Activities that already completed are not re-executed — their results come from history.'",
          "Name the AI pipeline use case: 'For GoDaddy\\'s AI care pipeline — classify → retrieve knowledge → generate response — Temporal is an excellent fit. Each step can fail independently. Temporal retries only the failed step. The workflow runs for minutes but the code reads as synchronous.'",
          "Acknowledge when NOT to use it: 'Simple fire-and-forget async tasks go to SQS — that\\'s overkill for Temporal. Step Functions is the right answer when you\\'re all-in on AWS managed services with no self-hosted servers. I\\'d recommend Temporal when the workflow is complex (signals, long-running, saga) and developer experience matters.'",
        ]}
      />

      <InterviewChallenge
        title="Temporal Challenge: AI Support Ticket Processing Pipeline"
        scenario={
          <>
            Design and implement a Temporal workflow for GoDaddy&apos;s AI support pipeline.
            When a ticket is created, the workflow must: classify the intent using Bedrock,
            retrieve relevant knowledge (up to 30 seconds), generate an AI response, and update
            the ticket. If a customer escalates the ticket via the API during processing, the
            workflow must stop AI processing immediately and route to a human agent.
          </>
        }
        tasks={[
          "Define the workflow signature: input, return type, and what signals it accepts.",
          "Implement the workflow function with proper error handling and saga compensation.",
          "Define retry policies for each activity: classify (fast, retry on 429), generateResponse (slow LLM, retry on 503), updateTicket (DB write, non-retryable on conflict).",
          "Implement the escalation signal handler that interrupts the AI pipeline mid-execution.",
          "Write a test that verifies the escalation signal stops AI processing and routes to human.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Durable execution</strong> — Temporal replays workflow history on crash. Completed Activities are replayed from history, not re-executed. Only failed Activities retry.</li>
        <li><strong>Workflows must be deterministic</strong> — no <code>Date.now()</code>, no <code>Math.random()</code>, no direct I/O. All of these go in Activities.</li>
        <li><strong>Activities are the I/O boundary</strong> — all LLM calls, DB writes, and API calls live in Activities. They can be non-deterministic and are retried idempotently.</li>
        <li><strong>Signals interrupt running workflows</strong> — perfect for the escalation use case where customer action must immediately change AI pipeline behavior.</li>
        <li><strong>Saga pattern with compensations</strong> — Temporal makes distributed transactions clean: try each step, push a compensation for each, run compensations in reverse on failure.</li>
        <li>For GoDaddy: Temporal is ideal for the multi-step AI processing pipeline where individual LLM API failures should not fail the entire ticket — only that step retries.</li>
      </ul>
    </div>
  );
}
