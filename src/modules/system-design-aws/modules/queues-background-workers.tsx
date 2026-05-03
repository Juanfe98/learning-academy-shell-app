import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const queueModelDiagram = String.raw`flowchart TD
    P["Producer API"]
    M["Message: CV_UPLOADED<br/>cvId = 123, userId = alice"]
    Q["SQS Queue<br/>msg-1, msg-2, msg-3 ... msg-N"]
    A["Consumer A<br/>ECS task or Lambda"]
    B["Consumer B<br/>ECS task or Lambda"]
    DONE["Delete message on success"]
    RETRY["If processing fails,<br/>message becomes visible again"]

    P --> M --> Q
    Q -->|poll| A
    Q -->|poll| B
    A --> DONE
    B --> DONE
    A -. failure or timeout .-> RETRY -.-> Q
    B -. failure or timeout .-> RETRY`;

export const toc: TocItem[] = [
  { id: "why-queues", title: "Why Queues Exist", level: 2 },
  { id: "producer-consumer", title: "Producer, Queue, Consumer Model", level: 2 },
  { id: "message-concepts", title: "Visibility Timeout, DLQ, and Retries", level: 2 },
  { id: "idempotency", title: "Idempotency: Why It Matters in Queues", level: 2 },
  { id: "delivery-guarantees", title: "At-Least-Once vs Exactly-Once", level: 2 },
  { id: "ordering", title: "Message Ordering: FIFO vs Standard", level: 2 },
  { id: "fanout", title: "Fanout: SNS to Multiple SQS Queues", level: 2 },
  { id: "aws-sqs", title: "AWS SQS: Standard and FIFO", level: 2 },
  { id: "aws-sns", title: "AWS SNS", level: 2 },
  { id: "aws-eventbridge", title: "AWS EventBridge", level: 2 },
  { id: "lambda-workers", title: "Lambda Workers", level: 2 },
  { id: "real-examples", title: "Real-World Examples", level: 2 },
  { id: "failure-scenarios", title: "Failure Scenarios and DLQ Alerting", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function QueuesBackgroundWorkers() {
  return (
    <div className="article-content">
      <p>
        Queues are one of the most important architectural tools for building resilient, scalable
        systems. They decouple the component that produces work from the component that processes
        it, absorb traffic spikes without data loss, enable automatic retry on failure, and allow
        independent scaling of producers and consumers. Any work that does not need to complete
        synchronously in the user&apos;s request path should go through a queue.
      </p>

      <h2 id="why-queues">Why Queues Exist</h2>
      <p>
        <strong>Analogy:</strong> A restaurant kitchen has a ticket rail (queue). Waiters clip
        orders to the rail (produce) and cooks take them in order (consume). The rail decouples
        the dining room from the kitchen: if the kitchen is backed up, orders wait on the rail
        instead of waiters standing idle or customers being turned away. The kitchen can process
        at its own pace without the dining room knowing.
      </p>
      <p>
        <strong>Three problems queues solve:</strong>
      </p>
      <ol>
        <li>
          <strong>Decoupling:</strong> The producer does not need to know about the consumer.
          You can change the consumer independently, scale it differently, or replace it entirely
          without touching the producer.
        </li>
        <li>
          <strong>Traffic absorption:</strong> If the producer sends 1000 messages in 1 second but
          the consumer processes 10/second, the queue holds the backlog. The consumer works through
          it steadily. Without a queue, the spike would either overload the consumer or require the
          producer to wait.
        </li>
        <li>
          <strong>Resilience:</strong> If the consumer crashes while processing, the message is not
          lost &mdash; it returns to the queue and is retried by another consumer.
        </li>
      </ol>

      <h2 id="producer-consumer">Producer, Queue, Consumer Model</h2>
      <MermaidDiagram
        chart={queueModelDiagram}
        title="Producer, Queue, Consumer Model"
        caption="A queue absorbs the burst, workers pull at their own pace, and failures return work to the queue instead of dropping it."
        minHeight={520}
      />

      <h2 id="message-concepts">Visibility Timeout, DLQ, and Retries</h2>
      <p>
        <strong>Visibility timeout:</strong> When a consumer receives a message, SQS hides it from
        other consumers for the visibility timeout period (default 30 seconds). If the consumer
        successfully processes the message and deletes it before timeout, it is gone. If the consumer
        crashes or fails, the timeout expires and the message becomes visible again for another
        consumer to process.
      </p>
      <p>
        Set the visibility timeout to be longer than your expected processing time. If processing
        takes up to 5 minutes, set the timeout to 10 minutes. If the timeout is too short, messages
        get processed twice (the consumer is still working when SQS makes the message visible to
        a second consumer).
      </p>
      <p>
        <strong>Dead Letter Queue (DLQ):</strong> After a message has been received and failed
        N times (the <code>maxReceiveCount</code>), SQS moves it to a DLQ instead of retrying
        indefinitely. A DLQ is just another SQS queue. You monitor it for messages and alert when
        they arrive. This prevents a &quot;poison message&quot; (malformed data that always fails)
        from blocking queue processing forever.
      </p>
      <p>
        <strong>Retries with exponential backoff:</strong> When processing fails, the consumer should
        not immediately retry &mdash; it waits increasingly long intervals. This prevents a transient
        overload from being amplified by retry storms.
      </p>
      <pre><code>{`// SQS consumer with exponential backoff retry logic
async function processMessage(message: SQSMessage) {
  const body = JSON.parse(message.Body);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await processCV(body.cvId);
      // Success: delete message from queue
      await sqs.deleteMessage({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle
      });
      return;
    } catch (error) {
      if (attempt < 2) {
        // Exponential backoff with jitter: 1s, 2s, 4s (+ random 0-1s)
        const delay = (Math.pow(2, attempt) * 1000) + Math.random() * 1000;
        await sleep(delay);
      }
    }
  }
  // All retries exhausted: don't delete → SQS will retry
  // After maxReceiveCount failures, SQS moves to DLQ
  throw new Error(\`Failed to process message \${body.cvId}\`);
}

// SQS configuration
{
  "QueueName": "cv-processing",
  "VisibilityTimeout": "300",  // 5 minutes
  "RedrivePolicy": {
    "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123:cv-processing-dlq",
    "maxReceiveCount": "3"
  }
}`}</code></pre>

      <h2 id="idempotency">Idempotency: Why It Matters in Queues</h2>
      <p>
        <strong>Idempotent operation:</strong> An operation that can be applied multiple times
        without changing the result beyond the first application. <code>SET x = 5</code> is
        idempotent; <code>INCR x</code> is not.
      </p>
      <p>
        SQS uses at-least-once delivery. Your consumer <em>will</em> receive some messages more
        than once. This is not an edge case &mdash; it happens in normal operation. Every message
        handler must be designed to handle duplicate delivery safely.
      </p>
      <pre><code>{`// NON-IDEMPOTENT: dangerous with duplicate messages
async function processPayment(message) {
  const { paymentId, amount, userId } = message;
  await db.payments.create({ id: paymentId, amount, userId });
  await chargeCard(userId, amount);  // ← double-charge on duplicate!
  await sendReceipt(userId, amount);
}

// IDEMPOTENT: safe with duplicate messages
async function processPayment(message) {
  const { paymentId, amount, userId } = message;

  // Idempotency key: check if already processed
  const existing = await db.payments.findById(paymentId);
  if (existing?.status === 'completed') {
    console.log(\`Payment \${paymentId} already processed, skipping\`);
    return;  // Safe to return — already done
  }

  // Use upsert or conditional write to prevent race conditions
  const payment = await db.payments.upsert({
    id: paymentId,  // unique constraint: duplicate will update, not insert
    amount,
    userId,
    status: 'processing'
  });

  if (payment.status === 'completed') return;  // another worker beat us

  await chargeCard(userId, amount);
  await db.payments.update(paymentId, { status: 'completed' });
  await sendReceipt(userId, amount);
}`}</code></pre>

      <h2 id="delivery-guarantees">At-Least-Once vs Exactly-Once</h2>
      <table>
        <thead>
          <tr>
            <th>Guarantee</th>
            <th>Meaning</th>
            <th>SQS type</th>
            <th>Reality</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>At-most-once</td>
            <td>Message delivered 0 or 1 time (may be lost)</td>
            <td>N/A in SQS</td>
            <td>Acceptable only for non-critical events</td>
          </tr>
          <tr>
            <td>At-least-once</td>
            <td>Message delivered at least once (may be duplicated)</td>
            <td>SQS Standard</td>
            <td>Most queue systems offer this; requires idempotent consumers</td>
          </tr>
          <tr>
            <td>Exactly-once</td>
            <td>Message delivered exactly once</td>
            <td>SQS FIFO</td>
            <td>Possible within a deduplication window; expensive to implement correctly</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>The practical take:</strong> Design your consumers to be idempotent. This lets you
        use at-least-once delivery (cheaper, simpler, more available) while handling the rare
        duplicate safely. Exactly-once delivery comes with tradeoffs: SQS FIFO has lower throughput
        (3,000 vs 120,000 messages/second for Standard), and exactly-once is only guaranteed within
        a 5-minute deduplication window.
      </p>

      <h2 id="ordering">Message Ordering: FIFO vs Standard</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>SQS Standard</th>
            <th>SQS FIFO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ordering</td>
            <td>Best-effort (not guaranteed)</td>
            <td>Guaranteed FIFO within message group</td>
          </tr>
          <tr>
            <td>Throughput</td>
            <td>Nearly unlimited (120k+ msg/s)</td>
            <td>3,000 msg/s (or 300 msg/s without batching)</td>
          </tr>
          <tr>
            <td>Delivery</td>
            <td>At-least-once (duplicates possible)</td>
            <td>Exactly-once (5-minute deduplication window)</td>
          </tr>
          <tr>
            <td>Use case</td>
            <td>Background jobs, email sending, analytics events</td>
            <td>Financial transactions, state machine transitions requiring order</td>
          </tr>
          <tr>
            <td>Cost</td>
            <td>$0.40/million messages</td>
            <td>$0.50/million messages</td>
          </tr>
        </tbody>
      </table>

      <h2 id="fanout">Fanout: SNS to Multiple SQS Queues</h2>
      <p>
        Fanout is the pattern of sending one message to multiple consumers independently. SNS
        (Simple Notification Service) is the AWS pub/sub service that enables this. One SNS topic
        can have multiple SQS queue subscriptions; each subscription receives every message.
      </p>
      <pre>{`
CV Upload event
      |
      v
  SNS Topic: "cv-events"
      |
  ┌───┼────────────────┐
  |   |                |
  v   v                v
SQS     SQS          SQS
CV      Search       Analytics
Parser  Indexer      Writer
Queue   Queue        Queue
  |       |            |
  v       v            v
Lambda  Lambda       Lambda
(parse) (index)     (metrics)

Each worker receives every CV upload event independently.
Adding a new consumer requires only subscribing to the SNS topic.
No producer code change needed.
`}</pre>
      <pre><code>{`// Publish to SNS (producer only knows about SNS topic)
await sns.publish({
  TopicArn: 'arn:aws:sns:us-east-1:123:cv-events',
  Message: JSON.stringify({
    type: 'CV_UPLOADED',
    cvId: 'cv-123',
    userId: 'user-alice',
    s3Key: 'uploads/alice/cv.pdf'
  })
});

// Each SQS queue subscriber receives an envelope with the SNS message
// SNS adds metadata: TopicArn, Subject, MessageId
// Consumer parses: JSON.parse(sqsMessage.Body).Message
// Then: JSON.parse(snsBody) → your original payload`}</code></pre>

      <h2 id="aws-sqs">AWS SQS: Standard and FIFO</h2>
      <pre><code>{`// Create a queue with DLQ (AWS CLI)
aws sqs create-queue \
  --queue-name cv-processing \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "86400",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{
      \\"deadLetterTargetArn\\": \\"arn:aws:sqs:us-east-1:123:cv-dlq\\",
      \\"maxReceiveCount\\": \\"3\\"
    }"
  }'

// Long polling (20 seconds) reduces empty responses and cost
// Without long polling: consumer polls every second → thousands of empty requests
// With long polling: consumer waits up to 20s for a message → 99% fewer API calls

// Send a message
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123/cv-processing \
  --message-body '{"cvId": "cv-123", "userId": "alice"}'

// Receive and process messages (polling loop)
while true; do
  MESSAGES=$(aws sqs receive-message \
    --queue-url $QUEUE_URL \
    --max-number-of-messages 10 \
    --wait-time-seconds 20)
  # Process each message and delete on success
done`}</code></pre>

      <h2 id="aws-sns">AWS SNS</h2>
      <p>
        SNS is the pub/sub service. A topic receives messages and fans them out to subscribers.
        Subscribers can be: SQS queues, Lambda functions, HTTP/HTTPS endpoints, email, SMS.
      </p>
      <p>
        <strong>Message filtering:</strong> SNS supports subscription filter policies. A subscriber
        can specify that it only wants messages where a specific attribute matches. This allows
        fine-grained routing without adding a router layer.
      </p>
      <pre><code>{`// SNS subscription filter: CV parser only wants PDF uploads
{
  "fileType": ["application/pdf", "application/msword"]
}

// Analytics queue wants ALL events
// (no filter policy = receives everything)`}</code></pre>

      <h2 id="aws-eventbridge">AWS EventBridge</h2>
      <p>
        EventBridge is the evolution of SNS for AWS-native events. It offers: structured event
        routing with pattern matching, integration with 90+ AWS services as event sources, schema
        registry for event discovery, and cross-account/cross-region event delivery.
      </p>
      <p>
        Use EventBridge when: you are building event-driven architectures that need complex routing
        rules, you want to react to AWS service events (EC2 state changes, S3 events, CodePipeline
        state changes), or you need cross-account event delivery.
      </p>

      <h2 id="lambda-workers">Lambda Workers</h2>
      <p>
        Lambda can be triggered directly by SQS. When messages arrive in the queue, Lambda
        automatically invokes your function with a batch of messages. Lambda handles scaling
        automatically: it increases concurrency as the queue depth grows.
      </p>
      <pre><code>{`// Lambda SQS event handler
export const handler = async (event: SQSEvent) => {
  const failures: SQSBatchItemFailure[] = [];

  // Process each message in the batch
  await Promise.allSettled(event.Records.map(async (record) => {
    try {
      const body = JSON.parse(record.body);
      await processCV(body);
    } catch (error) {
      console.error(\`Failed to process \${record.messageId}:\`, error);
      // Report this message as failed
      failures.push({ itemIdentifier: record.messageId });
    }
  }));

  // SQS partial batch response: only failed messages are retried
  // Successfully processed messages are automatically deleted
  return { batchItemFailures: failures };
};

// Lambda SQS trigger configuration
{
  "EventSourceArn": "arn:aws:sqs:us-east-1:123:cv-processing",
  "BatchSize": 10,
  "FunctionResponseTypes": ["ReportBatchItemFailures"],  // partial retry
  "MaximumBatchingWindowInSeconds": 5  // wait up to 5s to fill batch
}`}</code></pre>

      <h2 id="real-examples">Real-World Examples</h2>
      <table>
        <thead>
          <tr>
            <th>Use case</th>
            <th>Queue type</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CV parsing and AI analysis</td>
            <td>SQS Standard + Lambda</td>
            <td>Variable processing time (2&ndash;60s), needs retry on AI provider rate limit</td>
          </tr>
          <tr>
            <td>Welcome email on signup</td>
            <td>SQS Standard + Lambda (SES)</td>
            <td>Decouples email from signup flow; retry on email provider errors</td>
          </tr>
          <tr>
            <td>PDF generation</td>
            <td>SQS Standard + ECS worker</td>
            <td>CPU-intensive; separate scaling from API; needs persistent containers for warmup</td>
          </tr>
          <tr>
            <td>Payment processing</td>
            <td>SQS FIFO</td>
            <td>Exactly-once required; ordering matters (charge before refund)</td>
          </tr>
          <tr>
            <td>Search index update</td>
            <td>SQS Standard (fanout from SNS)</td>
            <td>Multiple consumers (search + analytics); order does not matter</td>
          </tr>
          <tr>
            <td>Audit log</td>
            <td>SQS Standard + Kinesis</td>
            <td>High-volume events; Kinesis for replay capability</td>
          </tr>
        </tbody>
      </table>

      <h2 id="failure-scenarios">Failure Scenarios and DLQ Alerting</h2>
      <p>
        Set up CloudWatch alarms on your DLQ:
      </p>
      <pre><code>{`# CloudWatch alarm: alert when DLQ has messages
aws cloudwatch put-metric-alarm \
  --alarm-name "cv-dlq-has-messages" \
  --alarm-description "CV processing DLQ has unprocessed messages" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --dimensions Name=QueueName,Value=cv-processing-dlq \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123:on-call-alerts"

# Also monitor queue depth growth (backlog)
# ApproximateAgeOfOldestMessage: how long the oldest message has been waiting
# If this grows → consumer is falling behind → needs more capacity`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain Queues and Workers"
        intro="A queue answer lands best when it sounds like load-shaping and failure isolation, not just 'make it async.'"
        steps={[
          "Start with why the work should leave the request path: it is slow, bursty, retryable, or independent of the user waiting.",
          "Describe the producer, the queue, and the consumer separately so responsibilities and scaling boundaries are obvious.",
          "Name the delivery guarantee and what it implies for your handler design, especially at-least-once delivery and the need for idempotency.",
          "Explain visibility timeout, retries, and the DLQ as one coherent failure-handling system rather than isolated features.",
          "Mention the operational metric you would watch first, such as queue depth or age of oldest message, to show that you can run the design too.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Non-idempotent message handlers:</strong> The most dangerous mistake. SQS
          at-least-once delivery guarantees your handler will receive some messages twice.
          Every handler must be idempotent.
        </li>
        <li>
          <strong>Visibility timeout shorter than processing time:</strong> If processing takes
          2 minutes but visibility timeout is 30 seconds, the message becomes visible while being
          processed, causing multiple concurrent workers to handle the same message.
        </li>
        <li>
          <strong>No DLQ configured:</strong> Poison messages (malformed data that always fails)
          loop forever in the queue, blocking processing and running up costs.
        </li>
        <li>
          <strong>Deleting messages before confirming success:</strong> Deleting the message from
          the queue as soon as it is received, before processing completes. If processing fails,
          the message is lost.
        </li>
        <li>
          <strong>Not monitoring DLQ:</strong> DLQ receives messages but no one is alerted. Failed
          messages accumulate silently. Always alert on DLQ depth &gt; 0.
        </li>
        <li>
          <strong>Using SQS FIFO for high-throughput workloads:</strong> FIFO has a 3,000 msg/s
          limit (with batching). Standard handles 120,000+ msg/s. If ordering is not truly required,
          use Standard.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between a queue and a pub/sub system?</strong></p>
      <p>
        A queue is a point-to-point channel: each message is consumed by exactly one consumer. It
        is used when you want exactly one worker to handle each job. A pub/sub (publish/subscribe)
        system delivers each message to all subscribers independently. It is used for fanout &mdash;
        when multiple systems need to react to the same event. In AWS: SQS is a queue, SNS is pub/sub.
        They are often combined: SNS fans out to multiple SQS queues for independent processing.
      </p>

      <p><strong>Q: What is idempotency and why is it required for queue consumers?</strong></p>
      <p>
        An idempotent operation produces the same result whether executed once or many times.
        Queue consumers must be idempotent because all major queue systems (SQS Standard) guarantee
        at-least-once delivery &mdash; messages can and will be delivered multiple times due to
        network issues or consumer failures. A consumer that is not idempotent will double-process
        work (double-charge customers, send duplicate emails). The standard pattern is to use an
        idempotency key (a unique ID from the message) and check if the work was already completed
        before proceeding.
      </p>

      <p><strong>Q: What is a Dead Letter Queue and when do messages end up there?</strong></p>
      <p>
        A DLQ is a separate queue that receives messages that failed to process successfully after
        a configured number of attempts (maxReceiveCount). Messages end up there when: the
        consumer throws an unhandled exception repeatedly, the message is malformed (unparseable JSON),
        or a downstream dependency is consistently unavailable. The DLQ stores these &quot;poison
        messages&quot; for investigation without blocking the main queue. You should alert on DLQ
        depth and have a process for inspecting, fixing, and redriving DLQ messages.
      </p>

      <p><strong>Q: How do you scale a queue consumer?</strong></p>
      <p>
        For ECS worker: auto-scale the ECS service based on SQS
        <code>ApproximateNumberOfMessagesVisible</code> metric. When queue depth exceeds a threshold,
        increase task count; when empty, scale in. For Lambda workers: Lambda auto-scales concurrency
        based on queue depth automatically (up to reserved concurrency limit). Key consideration:
        your downstream dependencies (database, external APIs) must handle the increased concurrent
        load from more workers.
      </p>
    </div>
  );
}
