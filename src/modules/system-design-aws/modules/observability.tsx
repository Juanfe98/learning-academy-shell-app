import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "three-pillars", title: "The Three Pillars of Observability", level: 2 },
  { id: "structured-logging", title: "Structured Logging", level: 2 },
  { id: "correlation-ids", title: "Correlation IDs: Tracing Across Services", level: 2 },
  { id: "metrics", title: "Metrics: What to Measure", level: 2 },
  { id: "percentile-alerting", title: "Alerts: Static Thresholds vs Anomaly Detection", level: 2 },
  { id: "sli-slo-sla", title: "SLI, SLO, and SLA", level: 2 },
  { id: "distributed-tracing", title: "Distributed Tracing: Spans and Trace IDs", level: 2 },
  { id: "aws-cloudwatch", title: "AWS CloudWatch: Logs, Metrics, Alarms, Insights", level: 2 },
  { id: "other-tools", title: "Datadog, Grafana, Prometheus", level: 2 },
  { id: "debugging-playbook", title: "Debugging Playbooks: 500 Spike and High Latency", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function Observability() {
  return (
    <div className="article-content">
      <p>
        You cannot operate what you cannot observe. A system without observability is a black box:
        when something goes wrong (and it will), you are debugging blind. Observability is not a
        nice-to-have &mdash; it is a prerequisite for operating production software responsibly.
        This module covers the patterns that turn your system from a black box into a transparent
        system you can reason about at any time.
      </p>

      <h2 id="three-pillars">The Three Pillars of Observability</h2>
      <table>
        <thead>
          <tr>
            <th>Pillar</th>
            <th>What it answers</th>
            <th>AWS service</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Logs</td>
            <td>What happened? (events, errors, transactions)</td>
            <td>CloudWatch Logs</td>
            <td>Error stack trace, payment record, debug output</td>
          </tr>
          <tr>
            <td>Metrics</td>
            <td>How much? How fast? (counts, rates, durations)</td>
            <td>CloudWatch Metrics</td>
            <td>Request rate, error rate, latency percentiles, CPU</td>
          </tr>
          <tr>
            <td>Traces</td>
            <td>Where did the time go? (request path across services)</td>
            <td>AWS X-Ray</td>
            <td>API call split: 5ms auth, 2ms cache miss, 40ms DB query</td>
          </tr>
        </tbody>
      </table>
      <p>
        The three pillars complement each other. A metric alert tells you something is wrong. Logs
        tell you what the errors were. Traces tell you where in the system the time was spent. You
        need all three to effectively debug production issues.
      </p>

      <h2 id="structured-logging">Structured Logging</h2>
      <p>
        Plain text logs are nearly unqueryable at scale. Structured logging emits JSON (or other
        parseable format), making logs filterable, queryable, and processable programmatically.
      </p>
      <pre><code>{`// BAD: plain text log
console.log('User alice uploaded CV cv123, size 245760, status success');
// Impossible to query by status or size without regex

// GOOD: structured log
const logger = {
  info: (message: string, context: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: 'cv-api',
      ...context
    }));
  },
  error: (message: string, error: unknown, context: Record<string, unknown> = {}) => {
    const err = error as Error;
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      service: 'cv-api',
      error: { message: err.message, stack: err.stack, name: err.name },
      ...context
    }));
  }
};

// Usage
logger.info('CV uploaded', {
  userId: 'user-alice',
  cvId: 'cv-123',
  fileSize: 245760,
  contentType: 'application/pdf',
  requestId: req.headers['x-request-id'],
  durationMs: Date.now() - startTime
});

// CloudWatch Logs Insights query on structured logs
fields @timestamp, userId, durationMs, @message
| filter level = "error" and service = "cv-api"
| sort @timestamp desc
| limit 100`}</code></pre>

      <p><strong>Essential log fields:</strong></p>
      <ul>
        <li><code>timestamp</code>: ISO 8601 UTC</li>
        <li><code>level</code>: debug, info, warn, error</li>
        <li><code>service</code>: which service emitted this</li>
        <li><code>requestId</code> / <code>traceId</code>: correlation ID for tracing across services</li>
        <li><code>userId</code>: when available (not in auth-before-parse situations)</li>
        <li><code>durationMs</code>: how long the operation took</li>
        <li><code>error</code>: structured error object for errors</li>
      </ul>

      <h2 id="correlation-ids">Correlation IDs: Tracing Across Services</h2>
      <p>
        When a request flows through multiple services (API &rarr; Lambda worker &rarr; DB &rarr;
        external API), a single correlation ID (also called trace ID or request ID) ties all log
        entries for that request together across all services. Without it, correlating logs across
        services requires hunting through timestamps.
      </p>
      <pre><code>{`// Middleware: generate or propagate correlation ID
import { v4 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<{ requestId: string }>();

app.use((req, res, next) => {
  // Accept correlation ID from upstream (CDN, API Gateway) or generate new one
  const requestId = req.headers['x-request-id'] as string || uuid();
  res.setHeader('x-request-id', requestId);  // return to client for debugging

  asyncLocalStorage.run({ requestId }, () => {
    next();
  });
});

// Logger reads requestId from context automatically
const logger = {
  info: (message: string, context = {}) => {
    const { requestId } = asyncLocalStorage.getStore() || {};
    console.log(JSON.stringify({ level: 'info', message, requestId, ...context }));
  }
};

// When publishing to SQS, include the correlation ID in the message
await sqs.sendMessage({
  QueueUrl: QUEUE_URL,
  MessageBody: JSON.stringify({
    cvId: 'cv-123',
    correlationId: requestId  // ← pass through to worker
  })
});

// Worker logs with the original request's correlation ID
const { cvId, correlationId } = JSON.parse(message.body);
logger.info('Processing CV', { cvId, requestId: correlationId });`}</code></pre>

      <h2 id="metrics">Metrics: What to Measure</h2>
      <p>
        <strong>The Golden Signals (Google SRE Book):</strong>
      </p>
      <ul>
        <li><strong>Latency:</strong> Time to respond to requests. Track p50, p95, p99. Distinguish success vs error latency.</li>
        <li><strong>Traffic:</strong> Requests per second, messages per second, concurrent users.</li>
        <li><strong>Errors:</strong> Error rate as a percentage of total requests. Track by error type (5xx, timeouts, specific error codes).</li>
        <li><strong>Saturation:</strong> How &quot;full&quot; is the system? CPU %, memory %, connection pool usage, queue depth.</li>
      </ul>
      <p>
        <strong>Infrastructure metrics to track per ECS service:</strong>
      </p>
      <ul>
        <li>CPU utilization (alert at 80%)</li>
        <li>Memory utilization (alert at 80%)</li>
        <li>ALB: TargetResponseTime p99, RequestCount, HTTPCode_ELB_5XX_Count</li>
        <li>DynamoDB: ConsumedReadCapacityUnits, ThrottledRequests</li>
        <li>SQS: ApproximateAgeOfOldestMessage (queue depth growth), NumberOfMessagesFailed</li>
        <li>Redis: CacheHits, CacheMisses, Evictions, CurrConnections</li>
      </ul>
      <pre><code>{`// Custom metric: emit from application code
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

async function emitMetric(name: string, value: number, unit: string = 'Count') {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'CV-App/API',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Environment', Value: process.env.NODE_ENV || 'production' }
      ]
    }]
  }));
}

// Emit custom metrics
await emitMetric('CVParsingDuration', processingTimeMs, 'Milliseconds');
await emitMetric('CVParseSuccess', 1, 'Count');
await emitMetric('AIProviderErrors', 1, 'Count');`}</code></pre>

      <h2 id="percentile-alerting">Alerts: Static Thresholds vs Anomaly Detection</h2>
      <p>
        <strong>Static threshold alerts:</strong> Alert when a metric exceeds a fixed value.
        Simple and predictable. Works well for metrics with stable baselines.
      </p>
      <p>
        <strong>Anomaly detection:</strong> CloudWatch learns the normal pattern (including time-of-day
        and day-of-week variations) and alerts when behavior deviates significantly. Better for
        metrics with seasonal patterns (higher traffic on weekday mornings).
      </p>
      <pre><code>{`# CloudWatch alarm: alert on high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "api-error-rate-high" \
  --alarm-description "API error rate exceeds 1%" \
  --metric-name "HTTPCode_ELB_5XX_Count" \
  --namespace "AWS/ApplicationELB" \
  --dimensions "Name=LoadBalancer,Value=app/my-alb/xxxxx" \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123:on-call"

# Alert on p99 latency > 1 second
aws cloudwatch put-metric-alarm \
  --alarm-name "api-p99-latency" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --extended-statistic "p99" \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --period 300 \
  --evaluation-periods 2`}</code></pre>

      <h2 id="sli-slo-sla">SLI, SLO, and SLA</h2>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Definition</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SLI (Service Level Indicator)</td>
            <td>A metric that measures a specific aspect of service quality</td>
            <td>API p99 latency = 180ms, Error rate = 0.02%</td>
          </tr>
          <tr>
            <td>SLO (Service Level Objective)</td>
            <td>The target value for an SLI that you commit to internally</td>
            <td>API p99 latency &lt; 500ms, 99.9% of the time. Error rate &lt; 0.1%.</td>
          </tr>
          <tr>
            <td>SLA (Service Level Agreement)</td>
            <td>A contractual commitment to customers with consequences for breaches</td>
            <td>99.9% availability per month; credits if breached</td>
          </tr>
          <tr>
            <td>Error budget</td>
            <td>The allowed amount of unreliability per SLO period</td>
            <td>99.9% SLO = 0.1% error budget = 43.8 min/month of downtime allowed</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Error budget:</strong> If you have a 99.9% availability SLO and have already used
        80% of your monthly error budget by the 20th of the month, you slow down risky deployments
        and focus on reliability. If the budget is healthy, you can take more risk (deploy more
        aggressively). Error budgets make reliability a shared engineering concern, not just ops.
      </p>

      <h2 id="distributed-tracing">Distributed Tracing: Spans and Trace IDs</h2>
      <p>
        Distributed tracing records the path of a request across multiple services as a tree of
        spans. Each span represents one operation (HTTP call, DB query, cache lookup) with a start
        time, duration, and metadata.
      </p>
      <pre>{`
Trace: req-abc123 (total: 250ms)
├── API handler (250ms)
│   ├── JWT verify (1ms)
│   ├── Redis cache check (2ms) → MISS
│   ├── DynamoDB Query (45ms) → 3 items
│   ├── AI service call (180ms)
│   │   ├── HTTP request (5ms)
│   │   ├── AI processing (170ms)
│   │   └── Response parsing (5ms)
│   └── Redis cache write (2ms)

→ Bottleneck clearly visible: AI service took 180ms of 250ms total
→ Without tracing: "API is slow" — no idea why
→ With tracing: "AI provider call is the bottleneck"
`}</pre>
      <pre><code>{`// AWS X-Ray with OpenTelemetry
import { NodeTracerProvider } from '@opentelemetry/node';
import { XRayIdGenerator } from '@aws-xray-sdk-node';

// Automatic instrumentation: wraps Express, HTTP, pg automatically
// Manual instrumentation for custom spans
const tracer = opentelemetry.trace.getTracer('cv-api');

async function processCV(cvId: string) {
  const span = tracer.startSpan('process-cv', {
    attributes: { 'cv.id': cvId }
  });

  try {
    const dbSpan = tracer.startSpan('dynamodb.get');
    const cv = await db.cvs.findById(cvId);
    dbSpan.end();

    const aiSpan = tracer.startSpan('ai.parse', {
      attributes: { 'ai.provider': 'openai', 'cv.size': cv.content.length }
    });
    const parsed = await aiProvider.parse(cv.content);
    aiSpan.end();

    span.setStatus({ code: SpanStatusCode.OK });
    return parsed;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}`}</code></pre>

      <h2 id="aws-cloudwatch">AWS CloudWatch: Logs, Metrics, Alarms, Insights</h2>
      <p>
        CloudWatch is AWS&apos;s primary observability service. It integrates natively with all
        AWS services &mdash; no additional setup needed for infrastructure metrics.
      </p>
      <ul>
        <li><strong>CloudWatch Logs:</strong> Log storage and search. ECS containers emit logs via awslogs driver. Lambda writes to CloudWatch automatically.</li>
        <li><strong>CloudWatch Metrics:</strong> Time-series data. AWS services emit metrics automatically. You can emit custom metrics from your application.</li>
        <li><strong>CloudWatch Alarms:</strong> Alert on metric thresholds. Trigger SNS notification, auto-scaling, EC2 actions.</li>
        <li><strong>CloudWatch Logs Insights:</strong> SQL-like query language for searching and aggregating logs. Essential for ad-hoc debugging.</li>
        <li><strong>CloudWatch Dashboards:</strong> Visualize metrics and alarms in one view.</li>
        <li><strong>Container Insights:</strong> Enhanced monitoring for ECS/EKS (container-level metrics).</li>
        <li><strong>Application Signals:</strong> Automatic SLO monitoring for services instrumented with OpenTelemetry.</li>
      </ul>
      <pre><code>{`# CloudWatch Logs Insights: find errors for a specific user
fields @timestamp, userId, @message, error.message
| filter level = "error" and userId = "user-alice"
| sort @timestamp desc
| limit 50

# Find slowest API endpoints
fields @timestamp, path, durationMs
| filter level = "info" and durationMs > 1000
| stats avg(durationMs) as avgDuration, count() as requestCount by path
| sort avgDuration desc

# Error rate over time (for dashboard widget)
fields @timestamp
| filter level = "error"
| stats count() as errorCount by bin(5m)
| sort @timestamp asc`}</code></pre>

      <h2 id="other-tools">Datadog, Grafana, Prometheus</h2>
      <p>
        <strong>Prometheus:</strong> Open-source metrics collection. Services expose a
        <code>/metrics</code> endpoint; Prometheus scrapes them. Powerful query language (PromQL).
        Grafana for visualization. Typically self-hosted but available as managed service.
      </p>
      <p>
        <strong>Grafana:</strong> Visualization layer. Connects to CloudWatch, Prometheus, Elasticsearch,
        and many other data sources. Rich dashboards. Alert management. Often used as the visualization
        layer on top of CloudWatch or Prometheus.
      </p>
      <p>
        <strong>Datadog:</strong> All-in-one SaaS observability platform. Logs, metrics, traces,
        dashboards, alerts, APM, RUM (real user monitoring). More expensive than CloudWatch but
        more powerful out-of-the-box, especially for distributed tracing (Datadog APM is
        excellent). Common in larger orgs.
      </p>

      <h2 id="debugging-playbook">Debugging Playbooks: 500 Spike and High Latency</h2>
      <p><strong>Playbook: API 500 error rate spike</strong></p>
      <pre>{`
1. DETECT: CloudWatch alarm fires → API 5xx count elevated

2. SCOPE: How widespread?
   - Check ALB metrics: which target groups are affected?
   - Check ECS task count: are tasks healthy?
   - Is it all endpoints or specific ones?
   - When did it start? Any recent deployments?

3. TRIAGE: Look at logs
   CloudWatch Logs Insights:
   fields @timestamp, requestId, path, error.message, error.stack
   | filter level = "error" and @timestamp > ...
   | sort @timestamp desc | limit 50

4. IDENTIFY: What is the root error?
   - DB connection failures → RDS overloaded, connection pool exhausted
   - Timeout → downstream service slow
   - Unhandled exception → code bug (look at stack trace)
   - OOM kill → task ran out of memory

5. MITIGATE:
   - Code bug → rollback or feature flag off
   - DB overload → read replica, scale DB, reduce queries
   - Downstream timeout → circuit breaker, fallback
   - OOM → scale up task memory, investigate memory leak

6. RESOLVE: Verify metrics return to baseline

7. POSTMORTEM: Document timeline, root cause, action items
`}</pre>

      <p><strong>Playbook: High latency investigation</strong></p>
      <pre>{`
1. DETECT: p99 latency alert fires

2. SCOPE: Which endpoint? All or subset?

3. CHECK X-Ray / Traces:
   - Where is the time being spent?
   - DB slow? Cache miss? Downstream API slow?

4. CHECK DB metrics:
   - RDS CPUUtilization → CPU-bound queries?
   - pg_stat_statements → which queries are slowest?
   - Missing index? N+1 pattern?

5. CHECK Cache:
   - Redis CacheMisses elevated → cache warming issue? Evictions?

6. CHECK Downstream APIs:
   - AI provider latency? External API latency?
   - Rate limiting? Throttling?

7. FIX: Add index, fix N+1, add caching, circuit breaker for slow dependency
`}</pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Sound Senior When Debugging"
        intro="Observability answers are strongest when they move from symptom to scope to evidence instead of jumping straight to the guessed cause."
        steps={[
          "Start with the symptom and scope it quickly: what is broken, who is affected, when it started, and whether it is global or isolated.",
          "Name the three pillars you would use together: metrics for blast radius, logs for concrete errors, and traces for where time is spent.",
          "Explain how you narrow the layer next, such as edge, load balancer, application, cache, database, or downstream dependency.",
          "Say what evidence would change your mind, because good debugging is about ruling out layers, not defending a first guess.",
          "End with mitigation plus prevention: restore service first, then add the alert, trace, test, or guardrail that would catch it earlier next time.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Plain text logs:</strong> &quot;Error processing CV 12345&quot; — unsearchable,
          unqueryable, cannot correlate with other log lines. Use structured JSON logging from
          the start.
        </li>
        <li>
          <strong>No correlation IDs:</strong> When a request fails after passing through 3 services,
          you cannot find the related log entries without a shared request ID. Add correlation ID
          propagation on day one.
        </li>
        <li>
          <strong>Logging sensitive data:</strong> Logging passwords, JWTs, API keys, or PII in
          request/response logs. Audit log fields regularly; use log scrubbing.
        </li>
        <li>
          <strong>Only alerting on errors, not on latency degradation:</strong> A service with
          0 errors but 5-second response times is broken for users. Alert on p99 latency.
        </li>
        <li>
          <strong>No SLOs defined:</strong> Without defined SLOs, you cannot know if your service
          is meeting expectations. &quot;The site is up&quot; is not a SLO. &quot;99.9% of API
          requests complete in &lt;500ms&quot; is a SLO.
        </li>
        <li>
          <strong>Alerts that wake you up for non-actionable conditions:</strong> Alert fatigue
          leads to alerts being ignored. Every alert should require human action. Informational
          conditions should be dashboards, not alarms.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What are the three pillars of observability?</strong></p>
      <p>
        Logs (what happened &mdash; events and errors with context), metrics (how much/how fast &mdash;
        numeric measurements over time like latency, error rate, throughput), and traces (where time
        was spent &mdash; request path across services showing which component is the bottleneck).
        Logs help you debug specific incidents. Metrics help you detect and alert on patterns.
        Traces help you understand performance across service boundaries.
      </p>

      <p><strong>Q: What is the difference between an SLI, SLO, and SLA?</strong></p>
      <p>
        SLI (Service Level Indicator) is the metric: p99 latency = 180ms. SLO (Service Level
        Objective) is your internal target: p99 latency must be &lt;500ms 99.9% of the time. SLA
        (Service Level Agreement) is a contractual commitment to customers with financial
        consequences for breach: 99.9% uptime or credits issued. SLOs should be stricter than SLAs
        to give you a buffer.
      </p>

      <p><strong>Q: How do you debug a production incident where an API is returning 500 errors?</strong></p>
      <p>
        Start by scoping: is it all endpoints or specific ones? All users or specific users or regions?
        When did it start &mdash; correlate with recent deploys. Check CloudWatch Logs Insights for
        error stack traces. Check ECS task health and recent restarts. Check downstream dependencies:
        database CPU and connections, Redis availability, external API error rates. Find the common
        thread in the error logs. Decide: rollback (fastest) or fix-forward (if rollback not possible
        or would not help).
      </p>

      <p><strong>Q: Why are correlation IDs important in distributed systems?</strong></p>
      <p>
        When a request flows through multiple services, the log entries for one request are spread
        across multiple services&apos; log streams. Without a shared correlation ID, finding all
        logs related to a failing request requires matching on timestamps and content &mdash; fragile
        and error-prone. With a correlation ID propagated through HTTP headers and message bodies,
        you can filter all service logs for a single request ID and see the complete story in one
        query.
      </p>
    </div>
  );
}
