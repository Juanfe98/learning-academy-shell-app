import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const awsArchDiagram = String.raw`flowchart TD
  CLIENT["API Client\n(Web / Mobile / Agent)"]
  CLIENT --> APIGW["API Gateway\nAuth (Cognito JWT)\nRate limiting\nRequest validation"]
  APIGW --> LAMBDA["Lambda Functions\nstateless handlers\nNode.js / Go runtimes"]
  LAMBDA --> DYNAMO["DynamoDB\nTickets, Conversations\nSingle-table design"]
  LAMBDA --> SQS["SQS Queues\nAI classification jobs\nEvent fan-out"]
  LAMBDA --> SECRETS["Secrets Manager\nLLM API keys\nDB credentials"]
  SQS --> WORKER["Lambda Workers\nConsume SQS messages\nCall Bedrock / OpenAI"]
  WORKER --> DYNAMO
  WORKER --> EVENTBRIDGE["EventBridge\nDomain event routing\nCross-service fan-out"]
  LAMBDA --> CLOUDWATCH["CloudWatch\nStructured logs\nMetrics + Alarms\nX-Ray traces"]`;

const dynamoDesignDiagram = String.raw`flowchart LR
  subgraph SINGLE["Single Table Design"]
    PK["PK (partition key)"]
    SK["SK (sort key)"]
    PK --> T1["CUSTOMER#cust-123\nPROFILE\n→ Customer entity"]
    PK --> T2["CUSTOMER#cust-123\nTICKET#2026-05-14#tkt-abc\n→ Ticket by customer + date"]
    PK --> T3["TICKET#tkt-abc\nMETADATA\n→ Ticket entity (all fields)"]
    PK --> T4["TICKET#tkt-abc\nMSG#2026-05-14T10:00:00\n→ Message by ticket + time"]
  end
  GSI["GSI1 (Global Secondary Index)\npk: status + category\nsk: createdAt\n→ Query: all open billing tickets"]`;

export const toc: TocItem[] = [
  { id: "lambda-patterns", title: "AWS Lambda Patterns", level: 2 },
  { id: "cold-start", title: "Cold Start Optimization", level: 3 },
  { id: "api-gateway", title: "API Gateway", level: 2 },
  { id: "dynamo-design", title: "DynamoDB — Single Table Design", level: 2 },
  { id: "access-patterns", title: "Access Patterns & GSIs", level: 3 },
  { id: "sqs-sns", title: "SQS & SNS — Event-Driven Patterns", level: 2 },
  { id: "eventbridge", title: "EventBridge for Domain Events", level: 3 },
  { id: "iac", title: "Infrastructure as Code — CDK", level: 2 },
  { id: "observability", title: "Observability — CloudWatch & X-Ray", level: 2 },
  { id: "security", title: "Security — IAM, Secrets Manager, VPC", level: 2 },
  { id: "fault-tolerance", title: "Fault Tolerance Patterns", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "AWS Architecture Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AwsBackendPlatform() {
  return (
    <div className="article-content">
      <p>
        GoDaddy requires 3+ years of AWS experience with IaC proficiency. Their AI care
        platform runs on AWS — Lambda for compute, DynamoDB for persistence, SQS for async
        processing, and Bedrock for AI. This module covers the AWS patterns you will encounter
        and that GoDaddy specifically evaluates: fault tolerance, observability, security, and
        the IaC practices that make infrastructure reproducible.
      </p>

      <MermaidDiagram
        chart={awsArchDiagram}
        title="GoDaddy AI Care Platform — AWS Architecture"
        caption="API Gateway handles auth and rate limiting. Lambda handles stateless request processing. SQS decouples the AI classification workload from the synchronous API path. EventBridge routes domain events to downstream consumers."
        minHeight={440}
      />

      <h2 id="lambda-patterns">AWS Lambda Patterns</h2>
      <p>
        Lambda is the compute backbone of GoDaddy&apos;s serverless backend. The mental model:
        Lambda is a stateless function that runs in a managed container. The container may be
        reused between invocations (warm start) or provisioned fresh (cold start).
      </p>
      <pre><code>{`// Lambda handler — Node.js/TypeScript pattern
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { buildDependencies } from "@/composition-root";

// Module-level initialization: runs ONCE on cold start, reused across warm invocations
// Put expensive initialization here: DB connections, SDK clients
const deps = buildDependencies({
  dynamoClient: new DynamoDBClient({ region: process.env.AWS_REGION }),
  sqsClient: new SQSClient({}),
});

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  // context.callbackWaitsForEmptyEventLoop = false  // important for connection pooling
  const correlationId = event.requestContext.requestId;

  try {
    const body = JSON.parse(event.body ?? "{}");
    const result = await deps.createTicketUseCase.execute(body);

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return mapErrorToResponse(err);
  }
};

// SQS consumer Lambda — processes AI classification jobs
import { SQSHandler } from "aws-lambda";

export const classificationHandler: SQSHandler = async (event) => {
  const failures: SQSBatchItemFailure[] = [];

  await Promise.allSettled(
    event.Records.map(async (record) => {
      try {
        const job = JSON.parse(record.body) as ClassificationJob;
        await deps.classifyTicketUseCase.execute(job);
      } catch (err) {
        console.error("Classification failed", { messageId: record.messageId, err });
        // Report partial failure — SQS will retry ONLY the failed messages
        failures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures: failures };
};`}</code></pre>

      <h3 id="cold-start">Cold Start Optimization</h3>
      <pre><code>{`// Cold start sources and mitigations:

// 1. Large bundle size → long initialization
// Fix: Use esbuild to bundle and tree-shake — target < 5MB zipped
// In CDK:
const ticketFunction = new nodejs.NodejsFunction(this, "TicketHandler", {
  entry: "src/handlers/ticket.ts",
  bundling: {
    externalModules: ["@aws-sdk/*"],  // AWS SDK v3 is provided by Lambda runtime
    minify: true,
    sourceMap: true,
  },
  memorySize: 512,
  timeout: Duration.seconds(30),
});

// 2. Provisioned concurrency — keeps N containers warm, eliminating cold starts
//    for latency-sensitive paths (customer-facing ticket creation)
const alias = ticketFunction.addAlias("live");
new lambda.CfnProvisionedConcurrencyConfig(this, "ProvisionedConcurrency", {
  functionName: ticketFunction.functionName,
  qualifier: alias.aliasName,
  provisionedConcurrentExecutions: 10,  // 10 warm containers always ready
});

// 3. Lazy-load heavy dependencies inside the handler, not at module level
// Bad: imports at module level always run on cold start
import { SomeMassiveLibrary } from "some-massive-library";  // ~3MB

// Good: lazy import — only loaded when the code path is reached
async function handleSpecialCase() {
  const { SomeMassiveLibrary } = await import("some-massive-library");
}`}</code></pre>

      <h2 id="api-gateway">API Gateway</h2>
      <pre><code>{`// CDK: HTTP API (v2) — lower latency, lower cost than REST API (v1)
const api = new apigw.HttpApi(this, "CareApi", {
  description: "GoDaddy AI Care API",
  corsPreflight: {
    allowOrigins: ["https://care.godaddy.com"],
    allowMethods: [apigw.CorsHttpMethod.ANY],
    allowHeaders: ["Content-Type", "Authorization"],
  },
  defaultAuthorizer: new apigwAuth.HttpJwtAuthorizer("CognitoAuth", jwtIssuer, {
    jwtAudience: [cognitoClientId],
  }),
});

// Route with specific auth scope
api.addRoutes({
  path: "/api/v1/tickets",
  methods: [apigw.HttpMethod.POST],
  integration: new apigwInt.HttpLambdaIntegration("CreateTicket", ticketFunction),
});

// Rate limiting: use AWS WAF + API Gateway throttling
// Per-route throttling in CDK:
new apigw.CfnRoute(this, "CreateTicketRoute", {
  // Default account-level throttle: 10,000 req/s, burst 5,000
  // Override per-route:
  routeId: createTicketRoute.routeId,
});

// Request validation: validate body and params before Lambda invocation
// Saves Lambda invocations for malformed requests`}</code></pre>

      <h2 id="dynamo-design">DynamoDB — Single Table Design</h2>
      <p>
        DynamoDB is GoDaddy&apos;s likely choice for the support platform — fully managed,
        scales infinitely, single-digit millisecond reads. The single table design pattern
        is critical for DynamoDB — unlike relational databases, you design access patterns
        first, schema second.
      </p>

      <MermaidDiagram
        chart={dynamoDesignDiagram}
        title="DynamoDB Single Table Design — GoDaddy Support"
        caption="All entities live in one table. The partition key + sort key combination encodes the entity type and relationships. GSIs enable additional query patterns without a full table scan."
        minHeight={320}
      />

      <h3 id="access-patterns">Access Patterns & GSIs</h3>
      <pre><code>{`// Single table design: define access patterns FIRST

// Access patterns:
// 1. Get customer profile → PK: CUSTOMER#{id}, SK: PROFILE
// 2. Get ticket by ID → PK: TICKET#{id}, SK: METADATA
// 3. List tickets by customer (sorted by date) → PK: CUSTOMER#{id}, SK: begins_with(TICKET#)
// 4. List messages in a ticket (sorted by time) → PK: TICKET#{id}, SK: begins_with(MSG#)
// 5. Query open tickets by category → GSI1: PK: STATUS#OPEN#CATEGORY#{cat}, SK: createdAt

// DynamoDB adapter implementation
class DynamoTicketRepository implements TicketRepository {
  async save(ticket: SupportTicket): Promise<void> {
    // Write two items in a transaction: TICKET#{id}#METADATA + CUSTOMER#{cid}#TICKET#{id}
    await this.client.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.table,
            Item: {
              pk: { S: \`TICKET#\${ticket.id}\` },
              sk: { S: "METADATA" },
              id: { S: ticket.id },
              customerId: { S: ticket.customerId },
              subject: { S: ticket.subject },
              status: { S: ticket.status },
              category: { S: ticket.category },
              createdAt: { S: ticket.createdAt.toISOString() },
              // GSI1 key — enables access pattern 5
              gsi1pk: { S: \`STATUS#\${ticket.status}#CATEGORY#\${ticket.category}\` },
              gsi1sk: { S: ticket.createdAt.toISOString() },
            },
            // Optimistic locking: fail if version changed since we read it
            ConditionExpression: "attribute_not_exists(pk) OR version = :v",
            ExpressionAttributeValues: { ":v": { N: String(ticket.version - 1) } },
          },
        },
        {
          Put: {
            TableName: this.table,
            Item: {
              pk: { S: \`CUSTOMER#\${ticket.customerId}\` },
              sk: { S: \`TICKET#\${ticket.createdAt.toISOString()}#\${ticket.id}\` },
              ticketId: { S: ticket.id },
            },
          },
        },
      ],
    }));
  }

  async findOpenByCategory(category: string): Promise<SupportTicket[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.table,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: \`STATUS#OPEN#CATEGORY#\${category}\` },
      },
      ScanIndexForward: false,  // newest first
    }));
    return (result.Items ?? []).map(TicketMapper.toDomain);
  }
}`}</code></pre>

      <h2 id="sqs-sns">SQS & SNS — Event-Driven Patterns</h2>
      <pre><code>{`// SQS: reliable async processing — AI classification decoupled from API response
// When a ticket is created:
// 1. API responds immediately (201 Created) — no waiting for AI
// 2. Domain event TicketCreated is published to SQS
// 3. Classification Lambda consumes the SQS message, calls Bedrock
// 4. Classification result updates DynamoDB

// Sending domain events to SQS
class SqsDomainEventBus implements DomainEventBus {
  async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.sqsClient.send(new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: events.map((event, i) => ({
        Id: String(i),
        MessageBody: JSON.stringify(event),
        // Message deduplication via content-based deduplication (FIFO queue)
        // or explicit MessageDeduplicationId
        MessageGroupId: event.eventType,  // FIFO queue: group by event type
      })),
    }));
  }
}

// Dead Letter Queue: messages that fail after max retries go here
// CDK:
const dlq = new sqs.Queue(this, "ClassificationDlq", {
  retentionPeriod: Duration.days(14),
});

const classificationQueue = new sqs.Queue(this, "ClassificationQueue", {
  visibilityTimeout: Duration.seconds(300),  // 5 min — must exceed Lambda timeout
  deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },  // 3 retries then DLQ
});

// CloudWatch alarm on DLQ depth — alert on-call when messages pile up
new cloudwatch.Alarm(this, "DlqDepthAlarm", {
  metric: dlq.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,    // any DLQ message = alert
  evaluationPeriods: 1,
});`}</code></pre>

      <h3 id="eventbridge">EventBridge for Domain Events</h3>
      <pre><code>{`// EventBridge: routes domain events to multiple consumers
// When TicketEscalated fires → notify manager service AND analytics service

// CDK: event bus and rules
const careEventBus = new events.EventBus(this, "CareEventBus", {
  eventBusName: "godaddy-care-events",
});

// Rule: route TicketEscalated to notification Lambda
new events.Rule(this, "EscalationNotificationRule", {
  eventBus: careEventBus,
  eventPattern: {
    detailType: ["ticket.escalated"],
  },
  targets: [new eventsTargets.LambdaFunction(notificationFunction)],
});

// Rule: route all ticket events to analytics
new events.Rule(this, "TicketAnalyticsRule", {
  eventBus: careEventBus,
  eventPattern: {
    detailType: [{ prefix: "ticket." }],  // matches all ticket.* events
  },
  targets: [new eventsTargets.KinesisStream(analyticsStream)],
});

// Publishing to EventBridge from Lambda
await eventBridgeClient.send(new PutEventsCommand({
  Entries: [{
    EventBusName: "godaddy-care-events",
    Source: "godaddy.support",
    DetailType: "ticket.escalated",
    Detail: JSON.stringify(ticketEscalatedEvent),
    Time: new Date(),
  }],
}));`}</code></pre>

      <h2 id="iac">Infrastructure as Code — CDK</h2>
      <pre><code>{`// AWS CDK (TypeScript): define infrastructure as code
// The key benefit: the same language as your application code,
// full TypeScript type safety for resource configuration

export class CareStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CareStackProps) {
    super(scope, id, props);

    // DynamoDB table — single table design
    const table = new dynamodb.Table(this, "CareTable", {
      tableName: \`godaddy-care-\${props.env}\`,
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,  // scales automatically
      pointInTimeRecovery: true,   // enables PITR for disaster recovery
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI for open tickets by category
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
    });

    // Lambda function with least-privilege IAM
    const ticketFunction = new nodejs.NodejsFunction(this, "TicketHandler", {
      entry: "src/handlers/ticket.ts",
      environment: {
        TABLE_NAME: table.tableName,
        QUEUE_URL: classificationQueue.queueUrl,
      },
    });

    // Grant only what's needed — principle of least privilege
    table.grantReadWriteData(ticketFunction);
    classificationQueue.grantSendMessages(ticketFunction);
  }
}`}</code></pre>

      <h2 id="observability">Observability — CloudWatch & X-Ray</h2>
      <pre><code>{`// Structured logging — every log line is JSON, searchable in CloudWatch Insights
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
  serviceName: "ticket-service",
  logLevel: "INFO",
});

// PowerTools auto-injects correlationId, requestId, environment
export const handler = middy(rawHandler)
  .use(injectLambdaContext(logger))     // adds Lambda context to every log
  .use(captureLambdaHandler(tracer));   // X-Ray trace for every invocation

// CloudWatch Metrics — custom business metrics
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";

const metrics = new Metrics({ namespace: "GoDaddy/Care", serviceName: "ticket-service" });

async function createTicket(command: CreateTicketCommand) {
  const ticket = await useCase.execute(command);

  // Emit business metric — searchable in CloudWatch dashboards
  metrics.addMetric("TicketCreated", MetricUnit.Count, 1);
  metrics.addMetadata("category", ticket.category);
  metrics.publishStoredMetrics();

  return ticket;
}

// CloudWatch Insights query for SLA monitoring:
// fields @timestamp, ticketId, status, category
// | filter eventType = "ticket.escalated"
// | stats count() as escalations by bin(1h)
// | sort @timestamp desc`}</code></pre>

      <h2 id="security">Security — IAM, Secrets Manager, VPC</h2>
      <pre><code>{`// IAM: least privilege — grant only what the function needs
// Bad: AdministratorAccess on a Lambda function
// Good: explicit grants

// CDK automatic grants (preferred):
table.grantReadData(readOnlyFunction);        // read-only Lambda gets read-only grant
table.grantReadWriteData(writeFunction);      // write Lambda gets read-write grant
queue.grantConsumeMessages(consumerFunction); // consumer gets receive + delete only

// Secrets Manager: never hardcode API keys — rotate without redeployment
const bedrockApiKey = secretsmanager.Secret.fromSecretNameV2(
  this, "BedrockKey", "godaddy/care/bedrock-api-key"
);
bedrockApiKey.grantRead(classificationFunction);

// In Lambda: retrieve secret at cold start (cached for warm invocations)
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

let cachedApiKey: string | undefined;

async function getBedrockApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const client = new SecretsManagerClient({});
  const result = await client.send(new GetSecretValueCommand({
    SecretId: process.env.BEDROCK_API_KEY_SECRET_ARN,
  }));
  cachedApiKey = result.SecretString!;
  return cachedApiKey;
}

// VPC: Lambda in VPC for RDS access
// Note: VPC Lambda has higher cold start — use ProvisionedConcurrency
const ticketFunction = new nodejs.NodejsFunction(this, "TicketHandler", {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
});`}</code></pre>

      <h2 id="fault-tolerance">Fault Tolerance Patterns</h2>

      <ArticleTable caption="Fault tolerance patterns for AWS backend services." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Problem it solves</th>
              <th>AWS implementation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dead Letter Queue</td>
              <td>Failed messages are not lost</td>
              <td>SQS DLQ on classification queue — retry 3× then park</td>
            </tr>
            <tr>
              <td>Idempotent consumers</td>
              <td>SQS delivers at-least-once — duplicates happen</td>
              <td>Idempotency key in DynamoDB — conditional write rejects duplicate</td>
            </tr>
            <tr>
              <td>Circuit breaker</td>
              <td>Cascading failures when Bedrock degrades</td>
              <td>PowerTools IdempotencyConfig + fallback to rule-based classification</td>
            </tr>
            <tr>
              <td>Exponential backoff</td>
              <td>Thundering herd on retry storms</td>
              <td>SQS visibility timeout + Lambda retry backoff</td>
            </tr>
            <tr>
              <td>Blue/Green deployment</td>
              <td>Zero-downtime releases</td>
              <td>Lambda aliases with traffic shifting (5% → 100%)</td>
            </tr>
            <tr>
              <td>Multi-AZ / Global</td>
              <td>AZ failure takes down service</td>
              <td>DynamoDB global tables, API Gateway regional endpoints</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Design a fault-tolerant, highly available AI backend on AWS.'"
        intro="GoDaddy's JD says 'secure, highly available, fault-tolerant, globally performant.' These are not buzzwords — they are engineering requirements with specific AWS implementation patterns."
        steps={[
          "Start with availability targets: 'What SLA are we targeting? 99.9% = 8.7 hours/year downtime. 99.99% = 52 minutes/year. The answer determines whether I need multi-region, active-active vs active-passive.'",
          "Name the fault domains: 'I design for: single AZ failure (DynamoDB multi-AZ is automatic; Lambda spans AZs automatically), dependency failure (Bedrock down → fallback to rule-based classification), and message delivery failure (SQS DLQ + CloudWatch alarm + on-call page).'",
          "Explain the async AI path: 'AI classification is async — tickets are created synchronously, classification happens via SQS consumer. This decouples the customer-facing API from LLM latency. If Bedrock is slow, tickets still get created and classified eventually.'",
          "Close with observability: 'No fault tolerance design is complete without the detection layer. I instrument: DLQ depth alarm, Lambda error rate alarm, P99 latency alarm, and Bedrock API error rate. These page on-call before customers notice.'",
        ]}
      />

      <InterviewChallenge
        title="AWS Architecture Challenge: SQS Consumer with Partial Failure"
        scenario={
          <>
            Your SQS Lambda consumer processes batches of 10 AI classification jobs per
            invocation. Occasionally 1-2 jobs in a batch fail (Bedrock timeout, malformed
            payload). The current implementation returns an error, causing SQS to retry the
            entire batch — including the 8 jobs that succeeded, causing duplicate classification.
            How do you fix this?
          </>
        }
        tasks={[
          "Explain what SQS partial batch response is and how to implement it in Lambda.",
          "How do you make the successful jobs idempotent — safe to re-process if retried?",
          "After 3 retries, failed jobs go to the DLQ. Design the DLQ remediation process — who gets paged, and how does an engineer replay DLQ messages?",
          "The current handler has no observability. What metrics and alarms do you add?",
          "Show the CDK code for: the SQS queue, the DLQ, and the CloudWatch alarm on DLQ depth.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Single table DynamoDB design</strong> — access patterns drive the schema, not the entity model. Define all access patterns before choosing PK/SK structure.</li>
        <li><strong>DLQ on every SQS queue</strong> — messages that fail after max retries must be parked, not lost. CloudWatch alarm on DLQ depth pages on-call immediately.</li>
        <li><strong>Least privilege IAM</strong> — Lambda functions get only the specific DynamoDB actions they need (<code>grantReadData</code> vs <code>grantReadWriteData</code>), never AdministratorAccess.</li>
        <li><strong>Secrets Manager over env vars</strong> — LLM API keys rotate without redeployment. Cached at cold start, refreshed on expiry.</li>
        <li><strong>Async AI path</strong> — never block the synchronous API on LLM latency. Create the ticket, queue the classification job, respond immediately. SQS consumer processes asynchronously.</li>
        <li><strong>CDK in TypeScript</strong> — infrastructure and application code share the same language, type system, and toolchain. Infrastructure bugs surface at compile time.</li>
      </ul>
    </div>
  );
}
