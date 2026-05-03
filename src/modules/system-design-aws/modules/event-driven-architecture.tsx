import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const eventCascadeDiagram = String.raw`flowchart TD
    U["User uploads CV"] --> API["API Server"]
    API --> S3["Save file to S3"]
    API --> DDB["Create CV record in DynamoDB<br/>status = uploaded"]
    API --> EVT["Publish CV_UPLOADED to EventBridge"]
    API --> ACK["Return 202 Accepted immediately"]

    EVT --> TXT["Lambda: extract text"]
    EVT --> NOTIFY["Lambda: notify user"]
    EVT --> ANALYTICS["Lambda: analytics"]
    EVT --> AIQ["SQS queue for AI analysis"]

    TXT --> DDB2["Update CV status = parsed"]
    NOTIFY --> EMAIL["SES email: CV received"]
    ANALYTICS --> METRICS["Metrics and counters"]
    AIQ --> AIW["Lambda worker: call AI API<br/>parse skills<br/>update database"]
    AIW --> DDB3["Persist derived results"]
    AIW --> USERUPD["Notify user of progress"]

    DDB2 --> PARSED["Emit CV_PARSED"]
    PARSED --> INDEX["Lambda: update search index"]
    PARSED --> SCORE["Trigger scoring workflow"]`;

const kafkaPartitionsDiagram = String.raw`flowchart TD
    TOPIC["Topic: cv-events"]
    P0["Partition 0<br/>event-1, event-3, event-7"]
    P1["Partition 1<br/>event-2, event-5, event-8"]
    P2["Partition 2<br/>event-4, event-6, event-9"]
    A1["Consumer A1"]
    A2["Consumer A2"]
    A3["Consumer A3"]
    B1["Consumer B1<br/>replay from offset 0"]

    TOPIC --> P0
    TOPIC --> P1
    TOPIC --> P2
    P0 --> A1
    P1 --> A2
    P2 --> A3
    P0 --> B1
    P1 --> B1
    P2 --> B1`;

export const toc: TocItem[] = [
  { id: "what-is-an-event", title: "What Is an Event?", level: 2 },
  { id: "event-types", title: "Domain Events vs Integration Events", level: 2 },
  { id: "pubsub-vs-queues", title: "Pub/Sub vs Queues", level: 2 },
  { id: "event-streaming", title: "Event Streaming vs Event Messaging", level: 2 },
  { id: "event-sourcing", title: "Event Sourcing Concept", level: 2 },
  { id: "cqrs", title: "CQRS: Command Query Responsibility Segregation", level: 2 },
  { id: "webhooks", title: "Webhooks: Push, Not Poll", level: 2 },
  { id: "eventbridge", title: "AWS EventBridge Deep Dive", level: 2 },
  { id: "kafka-concepts", title: "Kafka Conceptually", level: 2 },
  { id: "kinesis", title: "AWS Kinesis", level: 2 },
  { id: "real-example", title: "Real Example: CV Upload Event Cascade", level: 2 },
  { id: "tradeoffs", title: "Tradeoffs vs Synchronous Architecture", level: 2 },
  { id: "failure-handling", title: "Failure Handling in Event-Driven Systems", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function EventDrivenArchitecture() {
  return (
    <div className="article-content">
      <p>
        Event-driven architecture (EDA) represents a fundamental shift from request/response thinking
        to reactive thinking. Instead of service A calling service B directly, service A emits a
        fact (an event) and any interested parties react to it. This inversion of control produces
        systems that are loosely coupled, independently scalable, and naturally resilient to partial
        failures. It also introduces new challenges: eventual consistency, event ordering, and
        distributed debugging. This module covers when and how to use it effectively.
      </p>

      <h2 id="what-is-an-event">What Is an Event?</h2>
      <p>
        An event is an <strong>immutable fact that something happened</strong> in the past. It is
        not a command (&quot;please send an email&quot;) or a request (&quot;give me user data&quot;)
        &mdash; it is a statement of what occurred (&quot;user signed up&quot;, &quot;order placed&quot;,
        &quot;payment failed&quot;).
      </p>
      <p>
        Key properties:
      </p>
      <ul>
        <li><strong>Immutable:</strong> Events do not change. You cannot &quot;unsend&quot; a user.signup event.</li>
        <li><strong>Timestamped:</strong> Events record when they happened.</li>
        <li><strong>Fact-based:</strong> Events represent what happened, not what should happen next. That decision belongs to the consumer.</li>
        <li><strong>Self-contained:</strong> A well-designed event contains enough data for consumers to act without additional lookups.</li>
      </ul>
      <pre><code>{`// Good event: fact-based, self-contained, immutable
{
  "type": "user.signed_up",
  "version": "1.0",
  "id": "evt-abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "auth-service",
  "data": {
    "userId": "user-alice",
    "email": "alice@example.com",
    "plan": "free",
    "referralCode": "FRIEND2024"
  }
}

// Bad event: too thin (consumers need to fetch data separately)
{ "type": "user.signed_up", "userId": "user-alice" }
// → email service can't send welcome email without another fetch

// Bad event: command-like (tells consumers what to do)
{ "type": "send_welcome_email", "userId": "user-alice" }
// → couples the producer to a specific consumer action`}</code></pre>

      <h2 id="event-types">Domain Events vs Integration Events</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Scope</th>
            <th>Purpose</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Domain event</td>
            <td>Within a single bounded context / service</td>
            <td>Trigger internal reactions without tight coupling</td>
            <td><code>UserProfileUpdated</code> within the user service</td>
          </tr>
          <tr>
            <td>Integration event</td>
            <td>Across service boundaries</td>
            <td>Notify other services of changes in your domain</td>
            <td><code>user.profile_updated</code> published to a shared event bus for other services</td>
          </tr>
        </tbody>
      </table>
      <p>
        The distinction matters because integration events form a public contract with other teams.
        Changing an integration event is a breaking change. Domain events are private implementation
        details that can be changed freely.
      </p>

      <h2 id="pubsub-vs-queues">Pub/Sub vs Queues</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Queue (SQS)</th>
            <th>Pub/Sub (SNS, EventBridge)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Message routing</td>
            <td>Point-to-point: one consumer gets each message</td>
            <td>Fan-out: all subscribers get every message</td>
          </tr>
          <tr>
            <td>Consumer count</td>
            <td>Multiple workers compete for messages (load balancing)</td>
            <td>Multiple independent subscribers each get a copy</td>
          </tr>
          <tr>
            <td>Adding consumers</td>
            <td>New workers added to queue consumer group</td>
            <td>New subscriber created independently</td>
          </tr>
          <tr>
            <td>Use case</td>
            <td>Work distribution: process each order exactly once</td>
            <td>Event notification: notify all interested parties of an event</td>
          </tr>
          <tr>
            <td>Coupling</td>
            <td>Producer knows about the specific queue</td>
            <td>Producer knows only the topic/bus; consumers are unknown to producer</td>
          </tr>
        </tbody>
      </table>

      <h2 id="event-streaming">Event Streaming vs Event Messaging</h2>
      <p>
        <strong>Event messaging (SQS, SNS, EventBridge):</strong> Fire-and-forget delivery. Messages
        are delivered to consumers and deleted from the broker. Good for triggering actions. Not
        designed for replay or long-term history.
      </p>
      <p>
        <strong>Event streaming (Kafka, Kinesis):</strong> Events are stored durably in an append-only
        log with a retention period (days to forever). Consumers read from a position in the log
        and can replay events. Multiple consumer groups can independently consume the same stream
        at different offsets. Good for: audit logs, data pipelines, analytics, rebuilding state
        from history.
      </p>

      <h2 id="event-sourcing">Event Sourcing Concept</h2>
      <p>
        Event sourcing is a persistence pattern where the system state is derived from an append-only
        log of events, rather than storing the current state directly. Instead of storing
        &quot;balance: $500&quot;, you store all the transactions: &quot;deposit: $1000&quot;,
        &quot;withdrawal: $300&quot;, &quot;withdrawal: $200&quot;. The balance is computed by
        replaying these events.
      </p>
      <p>
        <strong>Benefits:</strong> Complete audit history, ability to replay events to rebuild state,
        temporal queries (&quot;what was the state at 2pm?&quot;), easy event-driven integrations.
      </p>
      <p>
        <strong>Costs:</strong> Complex to implement correctly, eventual consistency, difficult to
        query current state efficiently without snapshots, not appropriate for most applications.
      </p>

      <h2 id="cqrs">CQRS: Command Query Responsibility Segregation</h2>
      <p>
        CQRS separates the write model (commands that change state) from the read model (queries
        that retrieve state). This allows optimizing each independently:
      </p>
      <ul>
        <li>Write side: normalized, consistent, transactional</li>
        <li>Read side: denormalized, cached, optimized for specific query patterns</li>
      </ul>
      <p>
        A common simpler form: separate read replicas from the write database (no full CQRS, just
        read scaling). Full CQRS with separate read models is complex and worth it only for
        systems with very different read and write performance requirements.
      </p>

      <h2 id="webhooks">Webhooks: Push, Not Poll</h2>
      <p>
        Webhooks are HTTP callbacks. Instead of your service polling another service for updates,
        the other service pushes updates to your endpoint when something happens.
      </p>
      <pre><code>{`// Stripe webhook: payment status changes
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify the webhook signature (IMPORTANT: prevents fake webhooks)
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Respond immediately (Stripe retries if it doesn't get 2xx within 5s)
  res.json({ received: true });

  // Process asynchronously
  await queue.enqueue({ type: 'stripe-webhook', event });
});

// Handler processes the queued event
async function handleStripeEvent(event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await fulfillOrder(event.data.object.metadata.orderId);
      break;
    case 'payment_intent.payment_failed':
      await notifyPaymentFailed(event.data.object.metadata.orderId);
      break;
  }
}`}</code></pre>
      <p>
        <strong>Webhook best practices:</strong> Always verify signatures. Respond with 2xx
        immediately and process async (webhooks time out). Handle duplicates idempotently.
        Log all received webhooks for debugging.
      </p>

      <h2 id="eventbridge">AWS EventBridge Deep Dive</h2>
      <p>
        EventBridge is AWS&apos;s serverless event bus. It routes events from producers to consumers
        based on rules, without consumers knowing about each other.
      </p>
      <p><strong>Core concepts:</strong></p>
      <ul>
        <li><strong>Event bus:</strong> A routing channel. Default bus receives AWS service events. Custom buses for your own events.</li>
        <li><strong>Rules:</strong> Pattern-based routing. &quot;Route events where source=my-app and type=order.created to these targets.&quot;</li>
        <li><strong>Targets:</strong> Lambda, SQS, SNS, ECS task, API Gateway, Step Functions, etc.</li>
        <li><strong>Schema registry:</strong> Discover and document event schemas. Auto-generates TypeScript types.</li>
        <li><strong>Event replay:</strong> Archive events and replay them for debugging or bootstrapping new consumers.</li>
      </ul>
      <pre><code>{`// Publish event to EventBridge
await eventBridge.putEvents({
  Entries: [{
    EventBusName: 'my-app-bus',
    Source: 'cv-service',
    DetailType: 'CV Uploaded',
    Detail: JSON.stringify({
      cvId: 'cv-123',
      userId: 'user-alice',
      s3Key: 'uploads/alice/cv.pdf'
    })
  }]
});

// EventBridge rule (Terraform)
resource "aws_cloudwatch_event_rule" "cv_uploaded" {
  event_bus_name = "my-app-bus"
  event_pattern = jsonencode({
    source      = ["cv-service"]
    detail-type = ["CV Uploaded"]
  })
}

// Targets: Lambda for parsing, SQS for analytics
resource "aws_cloudwatch_event_target" "parse_cv" {
  rule      = aws_cloudwatch_event_rule.cv_uploaded.name
  target_id = "ParseCV"
  arn       = aws_lambda_function.cv_parser.arn
}`}</code></pre>

      <h2 id="kafka-concepts">Kafka Conceptually</h2>
      <p>
        Apache Kafka is the dominant event streaming platform. Understanding it conceptually is
        essential for system design interviews even if you use SQS/SNS in practice.
      </p>
      <ul>
        <li>
          <strong>Topic:</strong> Named category of events. Like a SQS queue but with persistent storage
          and multiple consumer groups reading independently.
        </li>
        <li>
          <strong>Partition:</strong> A topic is split into N partitions for parallelism. Each partition is
          an ordered, immutable log. Messages within a partition are ordered; across partitions, they are not.
        </li>
        <li>
          <strong>Consumer group:</strong> Multiple consumers sharing the same group name divide partitions
          among themselves (load balancing within a group). Multiple groups can consume the same topic
          independently (fan-out between groups).
        </li>
        <li>
          <strong>Offset:</strong> Position of each consumer within a partition. Consumers commit their
          offset after processing, enabling replay from any point.
        </li>
        <li>
          <strong>Retention:</strong> Messages are retained for a configurable period (hours to forever),
          not deleted after consumption. This enables replay and late consumers.
        </li>
      </ul>
      <MermaidDiagram
        chart={kafkaPartitionsDiagram}
        title="Kafka Topic, Partitions, and Consumer Groups"
        caption="Within a consumer group, partitions are split across consumers for parallelism. A different group gets an independent read position and can replay the same retained events."
        minHeight={560}
      />
      <p>
        All messages are retained for the configured retention window regardless of whether a consumer
        has processed them. That is the key mental shift from queue semantics to stream semantics.
      </p>
      <p>
        <strong>Kafka vs SQS:</strong> Use Kafka when you need event replay, multiple independent
        consumer groups on the same stream, high-throughput ordered event streaming, or building
        a data pipeline. Use SQS when you need simple reliable job queuing without replay requirements.
        AWS MSK (Managed Streaming for Kafka) is the managed Kafka service on AWS.
      </p>

      <h2 id="kinesis">AWS Kinesis</h2>
      <p>
        Kinesis Data Streams is AWS&apos;s managed event streaming service (similar to Kafka but
        AWS-native). Simpler to operate than Kafka but with some limitations.
      </p>
      <ul>
        <li><strong>Shards:</strong> Unit of capacity. Each shard handles 1MB/s write, 2MB/s read.</li>
        <li><strong>Retention:</strong> 24 hours default (up to 365 days).</li>
        <li><strong>Enhanced fan-out:</strong> Dedicated read throughput per consumer (up to 2MB/s per consumer per shard).</li>
        <li><strong>Best for:</strong> Real-time analytics, log ingestion, IoT data, event sourcing within AWS.</li>
      </ul>

      <h2 id="real-example">Real Example: CV Upload Event Cascade</h2>
      <MermaidDiagram
        chart={eventCascadeDiagram}
        title="CV Upload Event Cascade"
        caption="The user-visible request ends quickly with 202 Accepted, while the real business workflow fans out behind EventBridge and SQS."
        minHeight={700}
      />

      <h2 id="tradeoffs">Tradeoffs vs Synchronous Architecture</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Synchronous (RPC)</th>
            <th>Event-Driven</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Coupling</td>
            <td>Tight: service A must know B exists</td>
            <td>Loose: A only knows about the event bus</td>
          </tr>
          <tr>
            <td>Consistency</td>
            <td>Immediate (strongly consistent)</td>
            <td>Eventual (consumers may be behind)</td>
          </tr>
          <tr>
            <td>Debugging</td>
            <td>Simple: follow the call stack</td>
            <td>Complex: events jump between systems</td>
          </tr>
          <tr>
            <td>Latency for caller</td>
            <td>Waits for all downstream to complete</td>
            <td>Returns immediately; processing happens later</td>
          </tr>
          <tr>
            <td>Resilience</td>
            <td>Caller fails if downstream fails</td>
            <td>Events queued; downstream can be down temporarily</td>
          </tr>
          <tr>
            <td>Adding consumers</td>
            <td>Requires modifying producer</td>
            <td>Add new subscriber without touching producer</td>
          </tr>
          <tr>
            <td>Complexity</td>
            <td>Lower: direct calls</td>
            <td>Higher: distributed debugging, event schemas, eventual consistency</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>When to use synchronous:</strong> User is waiting for the response, strong consistency
        is required, operations are simple and fast, you need a direct error response.
      </p>
      <p>
        <strong>When to use event-driven:</strong> Work takes more than 2&ndash;3 seconds, multiple
        systems need to react, operations should be decoupled, you need natural retry on failure.
      </p>

      <h2 id="failure-handling">Failure Handling in Event-Driven Systems</h2>
      <ul>
        <li>
          <strong>Saga pattern for distributed transactions:</strong> When a business transaction spans
          multiple services (e.g., create order + reserve inventory + charge card), use a saga: a
          sequence of local transactions where each failure triggers compensating transactions to
          undo completed steps.
        </li>
        <li>
          <strong>Idempotency keys:</strong> Include a unique ID in every event. Consumers check if
          they have already processed the event before acting.
        </li>
        <li>
          <strong>Event ordering:</strong> Events can arrive out of order. Consumers should handle
          this: process the most recent state, not assume events arrive in order.
        </li>
        <li>
          <strong>Outbox pattern:</strong> To avoid lost events, write events to a local database
          table (outbox) in the same transaction as the domain change. A separate process reads
          the outbox and publishes to the event bus. Guarantees atomicity between data change and
          event publication.
        </li>
      </ul>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Justify Event-Driven Architecture"
        intro="Event-driven systems impress interviewers only when you explain why the extra complexity is worth it for the specific workload."
        steps={[
          "Start by naming the user-facing constraint: long-running work, fan-out to multiple consumers, or resilience to temporary downstream outages.",
          "State what event represents the business fact and which components publish versus subscribe so the ownership boundary is clear.",
          "Acknowledge the tradeoff immediately: you gain decoupling and resilience, but you also accept eventual consistency and harder debugging.",
          "Describe the reliability controls such as idempotency keys, DLQs, retries with backoff, and the outbox pattern when publication must be atomic with state changes.",
          "Close by saying when you would stay synchronous instead, because strong candidates know when not to reach for the event bus.",
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is event-driven architecture and when should you use it?</strong></p>
      <p>
        Event-driven architecture is a pattern where services communicate by emitting and consuming
        events (immutable facts of what happened) via an event bus, rather than direct synchronous
        calls. Use it when: work takes too long to block the user (async processing), multiple
        independent systems need to react to the same change, you want to decouple services so they
        can be modified independently, or you need resilience against temporary downstream failures.
        Avoid when strong immediate consistency is required or debugging complexity cannot be justified.
      </p>

      <p><strong>Q: What is the outbox pattern and what problem does it solve?</strong></p>
      <p>
        The outbox pattern solves the dual-write problem: how do you guarantee that both a database
        write and an event publication succeed atomically? Without it, you might save the order to
        the database but fail to publish the event, leaving downstream systems unaware. The outbox
        stores events in a database table within the same transaction as the domain change. A separate
        process reads the outbox and publishes to the event bus, retrying until success. This ensures
        the event is always published if the database write succeeded.
      </p>

      <p><strong>Q: What is the difference between Kafka and SQS?</strong></p>
      <p>
        Kafka is an event streaming platform: events are stored durably in a log, multiple independent
        consumer groups can read the same stream from any offset, and events can be replayed. SQS
        is a message queue: messages are delivered to one consumer and deleted. Kafka is better for
        event sourcing, multiple independent consumers, high-throughput ordered streams, and data
        pipelines requiring replay. SQS is simpler and better for job queuing where replay is not
        needed. In AWS, Kinesis is the managed service most similar to Kafka.
      </p>

      <p><strong>Q: How does eventual consistency manifest in event-driven systems?</strong></p>
      <p>
        After a user action (e.g., updating their profile), the API returns success and the event
        is published. Downstream consumers (search index, notification service, analytics) process
        the event asynchronously. For a brief period &mdash; milliseconds to seconds &mdash; those
        systems may reflect the old state. If a user immediately searches for themselves after
        updating, they might see old data. Mitigations: write-through update for critical paths,
        client-side optimistic updates, acceptable UX messaging (&quot;changes may take a moment to
        appear&quot;).
      </p>
    </div>
  );
}
