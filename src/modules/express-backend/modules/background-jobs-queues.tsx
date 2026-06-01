import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const queueDiagram = String.raw`flowchart LR
  API[Express API] -->|enqueue job| Q[(Queue)]
  Q --> W1[Worker 1]
  Q --> W2[Worker 2]
  W1 --> DB[(Database)]
  W1 --> EXT[External API]
  W2 --> DB
  Q --> DLQ[(Dead Letter Queue)]`;

export const toc: TocItem[] = [
  { id: "why-queues", title: "Why Background Jobs Exist", level: 2 },
  { id: "queue-vs-request", title: "Request Path vs Worker Path", level: 2 },
  { id: "retries-dlq", title: "Retries and Dead Letter Queues", level: 2 },
  { id: "idempotent-jobs", title: "Idempotent Job Handlers", level: 2 },
  { id: "outbox-pattern", title: "Transactional Outbox Pattern", level: 2 },
  { id: "bullmq-example", title: "BullMQ Example", level: 2 },
  { id: "interview-tradeoffs", title: "Interview Tradeoffs", level: 2 },
];

export default function BackgroundJobsQueues() {
  return (
    <div className="article-content">
      <p>
        Senior Express systems rarely do everything inside the HTTP request. Emails, webhooks, image
        processing, report generation, billing retries, and fan-out notifications belong in workers.
        Queues improve reliability, latency, and operational control, but introduce idempotency and
        ordering problems.
      </p>

      <h2 id="why-queues">Why Background Jobs Exist</h2>
      <MermaidDiagram chart={queueDiagram} title="API + Queue + Workers" minHeight={320} />
      <ul>
        <li>Keep user-facing requests fast.</li>
        <li>Retry transient failures without making clients retry manually.</li>
        <li>Smooth traffic spikes with buffering.</li>
        <li>Run CPU or I/O-heavy tasks outside API processes.</li>
      </ul>

      <h2 id="queue-vs-request">Request Path vs Worker Path</h2>
      <p>
        The request path should validate input, persist intent, enqueue durable work, and return a
        clear status. The worker path should execute side effects, retry safely, emit metrics, and
        update state. Never rely only on in-memory arrays or timers for business-critical work.
      </p>

      <h2 id="retries-dlq">Retries and Dead Letter Queues</h2>
      <p>
        Retrying everything immediately can create a retry storm. Use exponential backoff with jitter,
        cap attempts, classify permanent vs transient errors, and move poison messages to a dead-letter
        queue for investigation.
      </p>
      <pre><code>{`function nextDelayMs(attempt: number) {
  const base = Math.min(30_000, 500 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}`}</code></pre>

      <h2 id="idempotent-jobs">Idempotent Job Handlers</h2>
      <p>
        Most queues provide at-least-once delivery: a job can run more than once. Job handlers must be
        idempotent. Use unique operation IDs, database constraints, processed-event tables, external
        idempotency keys, and state transitions that are safe to repeat.
      </p>

      <h2 id="outbox-pattern">Transactional Outbox Pattern</h2>
      <p>
        The classic bug: database commit succeeds but enqueue fails, or enqueue succeeds but database
        commit rolls back. The outbox pattern writes the domain change and an <code>outbox_events</code>
        row in the same transaction. A relay later publishes pending outbox events to the queue.
      </p>
      <pre><code>{`await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderInput });
  await tx.outboxEvent.create({
    data: {
      id: crypto.randomUUID(),
      type: "order.created",
      aggregateId: order.id,
      payload: order,
    },
  });
});

// A worker polls unpublished outbox rows, publishes them, then marks them sent.
// This avoids losing events when the API crashes between DB commit and queue publish.`}</code></pre>

      <h2 id="bullmq-example">BullMQ Example</h2>
      <pre><code>{`import { Queue, Worker } from "bullmq";

export const emailQueue = new Queue("email", {
  connection: { host: process.env.REDIS_HOST },
});

await emailQueue.add(
  "welcome-email",
  { userId },
  {
    jobId: "welcome-email:" + userId, // dedupe/idempotency hint
    attempts: 5,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: 1_000,
  },
);

new Worker("email", async (job) => {
  await sendWelcomeEmail(job.data.userId);
}, { concurrency: 10 });`}</code></pre>

      <h2 id="interview-tradeoffs">Interview Tradeoffs</h2>
      <ul>
        <li><strong>Redis/BullMQ</strong>: simple and fast, common for Node teams, but Redis persistence/HA must be configured carefully.</li>
        <li><strong>RabbitMQ</strong>: strong routing and acknowledgements, operationally more complex.</li>
        <li><strong>SQS/PubSub</strong>: managed and scalable, but cloud-specific and eventually consistent.</li>
        <li><strong>Kafka</strong>: event streaming and replay, not a general-purpose task queue.</li>
      </ul>
    </div>
  );
}
