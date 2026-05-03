import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-resilience", title: "Why Resilience Patterns Matter", level: 2 },
  { id: "timeout", title: "Timeout", level: 2 },
  { id: "retry", title: "Retry with Exponential Backoff and Jitter", level: 2 },
  { id: "circuit-breaker", title: "Circuit Breaker", level: 2 },
  { id: "bulkhead", title: "Bulkhead", level: 2 },
  { id: "rate-limiting", title: "Rate Limiting vs Throttling", level: 2 },
  { id: "idempotency-keys", title: "Idempotency Keys and Upsert Patterns", level: 2 },
  { id: "deduplication", title: "Deduplication", level: 2 },
  { id: "poison-messages", title: "Poison Messages and DLQ", level: 2 },
  { id: "real-examples", title: "Patterns in Practice", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function ResiliencePatterns() {
  return (
    <div className="article-content">
      <p>
        Distributed systems fail in partial, unpredictable ways. A downstream service is slow. A
        database is briefly overloaded. A third-party API has a 30-second outage. A queue delivers
        a message twice. These are not edge cases &mdash; they are the normal operating environment
        for any production system at scale. Resilience patterns are the standard techniques for
        handling these failures gracefully rather than propagating them or amplifying them.
      </p>

      <h2 id="why-resilience">Why Resilience Patterns Matter</h2>
      <p>
        <strong>Analogy:</strong> Your home has circuit breakers. If a short circuit occurs in one
        room, the breaker trips &mdash; protecting the rest of the house. You do not need to shut down
        the entire electrical system; just that circuit. Resilience patterns are the circuit breakers,
        fuses, and safety valves of distributed systems.
      </p>
      <p>
        Without resilience patterns: a slow downstream service causes your API threads to pile up
        waiting for responses. The API becomes slow. The load balancer sees unhealthy instances.
        Your service goes down because another service was slow. This cascading failure is one of
        the most common causes of production outages.
      </p>

      <h2 id="timeout">Timeout</h2>
      <p>
        The most basic resilience pattern: always set a timeout on any external call. No timeout
        means a thread waits indefinitely, consuming resources forever.
      </p>
      <pre><code>{`// NEVER do this in production
const data = await externalApi.getData(id);  // what if it never returns?

// ALWAYS set timeouts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('https://api.external.com/data', {
    signal: controller.signal
  });
  const data = await response.json();
  clearTimeout(timeoutId);
  return data;
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('External API timeout after 5s');
  }
  throw error;
}

// With axios
const response = await axios.get('https://api.external.com/data', {
  timeout: 5000  // 5 seconds connection + read timeout
});

// With database (pg)
const result = await pool.query({
  text: 'SELECT * FROM products WHERE id = $1',
  values: [id],
  // PostgreSQL statement_timeout:
  // SET LOCAL statement_timeout = '5000';
});`}</code></pre>
      <p>
        <strong>Setting the right timeout:</strong> Too short and you get false failures on slow-but-healthy
        operations. Too long and you hold resources for stuck operations. Rule of thumb: set your timeout
        to the 99.9th percentile of healthy response time + 50% buffer. For third-party APIs, check
        their SLA and double it.
      </p>

      <h2 id="retry">Retry with Exponential Backoff and Jitter</h2>
      <p>
        Transient failures &mdash; brief overloads, network glitches, 503 responses &mdash; often
        resolve if you wait briefly and try again. But naive retries can make problems worse: if
        10,000 clients all retry simultaneously every second, they amplify the load on an already
        struggling service.
      </p>
      <pre><code>{`// Exponential backoff with jitter
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number; maxDelayMs: number }
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry non-transient errors
      if (error.status === 400 || error.status === 403 || error.status === 404) {
        throw error;  // client error, retrying won't help
      }

      if (attempt === maxRetries) throw error;

      // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      // Cap at maxDelayMs
      const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
      // Add jitter: random 0-25% of delay
      const jitter = Math.random() * cappedDelay * 0.25;
      const delay = cappedDelay + jitter;

      console.log(\`Attempt \${attempt + 1} failed. Retrying in \${Math.round(delay)}ms\`);
      await sleep(delay);
    }
  }
  throw new Error('Should never reach here');
}

// Usage
const result = await retryWithBackoff(
  () => aiProvider.parse(cvText),
  { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
);`}</code></pre>
      <p>
        <strong>When NOT to retry:</strong> Never retry non-idempotent operations without idempotency
        keys. Retrying a payment charge without confirming the first attempt failed may double-charge
        the customer. Retrying a database INSERT without checking if it already succeeded may create
        duplicates.
      </p>

      <h2 id="circuit-breaker">Circuit Breaker</h2>
      <p>
        <strong>Analogy:</strong> An electrical circuit breaker trips when current exceeds safe levels,
        opening the circuit to protect the system. It can be reset (closed) once the problem is fixed.
        Software circuit breakers work the same way.
      </p>
      <p>
        The circuit breaker has three states:
      </p>
      <ul>
        <li><strong>Closed:</strong> Normal operation. Requests flow through.</li>
        <li><strong>Open:</strong> Too many failures detected. Circuit is &quot;tripped.&quot; Requests fail immediately without calling the downstream service (fast failure, no timeout wait).</li>
        <li><strong>Half-open:</strong> After a cooldown period, the circuit allows a test request. If it succeeds, circuit closes. If it fails, circuit opens again.</li>
      </ul>
      <pre><code>{`// Simple circuit breaker implementation
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,    // failures to open
    private readonly timeout: number = 30000   // ms before trying again
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if cooldown has elapsed
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN — service unavailable');
      }
    }

    try {
      const result = await operation();
      // Success: reset the circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        console.error(\`Circuit breaker OPENED after \${this.failureCount} failures\`);
      }
      throw error;
    }
  }
}

// Usage
const aiCircuitBreaker = new CircuitBreaker(5, 30000);

async function parseCV(cvText: string) {
  try {
    return await aiCircuitBreaker.execute(() => aiProvider.parse(cvText));
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      // Fallback: basic extraction without AI
      return extractBasicInfo(cvText);
    }
    throw error;
  }
}

// In production, use a library: opossum (Node.js), Hystrix (Java), Polly (.NET)`}</code></pre>

      <p>
        <strong>Why circuit breakers prevent cascading failures:</strong> Without a circuit breaker,
        every request to your API waits the full timeout for the downstream service. With 100 concurrent
        requests and a 30-second timeout, you accumulate 3000 blocked connections. With a circuit
        breaker, after 5 failures the circuit opens and subsequent requests fail immediately in
        microseconds &mdash; keeping your own service responsive.
      </p>

      <h2 id="bulkhead">Bulkhead</h2>
      <p>
        <strong>Analogy:</strong> A ship&apos;s hull is divided into watertight compartments. If one
        compartment floods, the rest of the ship stays afloat. The ship degrades (sits lower) but
        does not sink.
      </p>
      <p>
        In software, bulkheads isolate resources so a failure in one area cannot exhaust resources
        for others. Common implementation: separate connection pools for different downstream services,
        or separate thread pools for different API endpoints.
      </p>
      <pre><code>{`// Bulkhead: separate connection pools per service
// Prevents one slow service from starving others
const dbPool = new Pool({ max: 20 });           // 20 connections for DB
const cachePool = createClient({ connectionTimeout: 1000 });
const aiPool = new Pool({ max: 5 });             // limited pool for AI calls

// Without bulkhead: one slow AI call fills all 20 DB connections
// With bulkhead: AI gets max 5 connections; DB always has at least 15

// AWS implementation: Lambda reserved concurrency per function
// Prevents one Lambda from consuming all regional concurrency
resource "aws_lambda_function" "cv_parser" {
  reserved_concurrent_executions = 50  // max 50 concurrent AI calls
  // Other Lambdas are not affected even if cv_parser is at limit
}`}</code></pre>

      <h2 id="rate-limiting">Rate Limiting vs Throttling</h2>
      <p>
        <strong>Rate limiting:</strong> Limits how many requests a client can make in a time window.
        Protects your service from overload by any single client.
      </p>
      <p>
        <strong>Throttling:</strong> Limits how fast a client consumes resources. Can be applied at
        the service level (how fast you process work) regardless of request rate.
      </p>
      <pre><code>{`// Rate limiter with Redis (sliding window)
async function checkRateLimit(identifier: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const key = \`rl:\${identifier}\`;

  const pipeline = redis.pipeline();
  // Remove timestamps outside the window
  pipeline.zremrangebyscore(key, '-inf', windowStart);
  // Count requests in window
  pipeline.zcard(key);
  // Add current request timestamp
  pipeline.zadd(key, now, \`\${now}-\${Math.random()}\`);
  // Set expiry
  pipeline.expire(key, windowSeconds * 2);

  const results = await pipeline.exec();
  const requestCount = results[1][1] as number;

  return {
    allowed: requestCount < limit,
    count: requestCount,
    limit,
    retryAfter: requestCount >= limit ? windowSeconds : 0
  };
}

// Middleware
app.use(async (req, res, next) => {
  const { allowed, retryAfter } = await checkRateLimit(
    req.ip, 100, 60  // 100 requests per minute per IP
  );
  if (!allowed) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  next();
});`}</code></pre>

      <h2 id="idempotency-keys">Idempotency Keys and Upsert Patterns</h2>
      <pre><code>{`// Idempotency key: client generates unique key per operation
// Server checks if it was already processed

// Client side: generate idempotency key once, use for all retries
const idempotencyKey = crypto.randomUUID();  // generated once before first attempt

async function createPayment(amount: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,  // same key on retry
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
    } catch (e) {
      if (attempt < 2) await sleep(1000 * Math.pow(2, attempt));
    }
  }
}

// Server side: check idempotency key before processing
app.post('/api/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (idempotencyKey) {
    // Check if we've already processed this request
    const existing = await db.idempotencyKeys.findOne({
      where: { key: idempotencyKey, userId: req.user.id }
    });

    if (existing) {
      // Return the same response as the first successful call
      return res.status(200).json(existing.response);
    }
  }

  // Process the payment
  const payment = await processPayment(req.body);

  // Store idempotency result
  if (idempotencyKey) {
    await db.idempotencyKeys.create({
      key: idempotencyKey,
      userId: req.user.id,
      response: payment,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24h retention
    });
  }

  res.json(payment);
});`}</code></pre>

      <h2 id="deduplication">Deduplication</h2>
      <p>
        Message deduplication prevents processing the same message twice when a queue delivers it
        multiple times (at-least-once delivery guarantee).
      </p>
      <pre><code>{`// Redis-based deduplication for queue consumers
async function processWithDedup(messageId: string, process: () => Promise<void>) {
  const dedupKey = \`processed:\${messageId}\`;

  // SETNX = SET if Not eXists — atomic operation
  const isNew = await redis.setnx(dedupKey, '1');
  if (!isNew) {
    console.log(\`Message \${messageId} already processed, skipping\`);
    return;  // idempotent: return success
  }

  // Set expiry on the dedup key (e.g., 24 hours)
  await redis.expire(dedupKey, 86400);

  try {
    await process();
  } catch (error) {
    // If processing fails, remove the dedup key so it can be retried
    await redis.del(dedupKey);
    throw error;
  }
}`}</code></pre>

      <h2 id="poison-messages">Poison Messages and DLQ</h2>
      <p>
        A poison message is a message that always fails to process (malformed data, impossible
        business state). Without protection, it loops forever: receive, fail, become visible again,
        receive, fail... burning cost and blocking the queue.
      </p>
      <pre><code>{`// Detection: SQS tracks approximate receive count
// After maxReceiveCount, SQS moves to DLQ automatically

// Monitoring DLQ
const alarm = new aws.cloudwatch.MetricAlarm({
  name: "cv-dlq-alarm",
  namespace: "AWS/SQS",
  metricName: "ApproximateNumberOfMessagesVisible",
  dimensions: { QueueName: "cv-processing-dlq" },
  statistic: "Maximum",
  period: 60,
  evaluationPeriods: 1,
  threshold: 1,
  comparisonOperator: "GreaterThanOrEqualToThreshold",
  alarmActions: [snsAlertTopicArn]
});

// Redriving from DLQ after fixing the root cause
aws sqs start-message-move-task \
  --source-arn "arn:aws:sqs:us-east-1:123:cv-dlq" \
  --destination-arn "arn:aws:sqs:us-east-1:123:cv-processing"`}</code></pre>

      <h2 id="real-examples">Patterns in Practice</h2>
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Patterns applied</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Calling AI provider for CV parsing</td>
            <td>Timeout + Retry with backoff + Circuit breaker + Fallback</td>
            <td>AI APIs can be slow, rate-limited, or down. Circuit breaker prevents cascade when AI is degraded.</td>
          </tr>
          <tr>
            <td>SQS message processing</td>
            <td>Idempotency + Deduplication + DLQ + Retry</td>
            <td>At-least-once delivery means duplicates. DLQ catches poison messages.</td>
          </tr>
          <tr>
            <td>Payment charge</td>
            <td>Idempotency key + Timeout + Retry (safe only with idempotency key)</td>
            <td>Network failures between success and acknowledgment require safe retries.</td>
          </tr>
          <tr>
            <td>CV upload to S3</td>
            <td>Retry with backoff + Timeout</td>
            <td>S3 SDK handles retries automatically; add timeout for overall operation.</td>
          </tr>
          <tr>
            <td>Database write under load</td>
            <td>Retry + Bulkhead + Rate limiting</td>
            <td>Transient timeouts under high load; bulkhead prevents DB exhaustion.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Retrying non-idempotent operations:</strong> Retrying a POST that creates a
          resource without an idempotency key may create duplicates. Always check if the operation
          is safe to retry before adding retry logic.
        </li>
        <li>
          <strong>Retrying client errors (4xx):</strong> A 400 or 404 will not resolve by retrying
          &mdash; you are sending the same bad request. Only retry on server errors (5xx) and
          network failures.
        </li>
        <li>
          <strong>No jitter on backoff:</strong> All callers retry on the same schedule, creating
          synchronized retry storms that overwhelm the recovering service. Add random jitter.
        </li>
        <li>
          <strong>Circuit breaker that never closes:</strong> Circuit breaker opens on failures
          but the service recovers. The half-open test probe timeout is too long and traffic never
          returns to the service. Tune the circuit breaker recovery window appropriately.
        </li>
        <li>
          <strong>Timeout too long:</strong> A 60-second timeout on an external API call holds a
          thread for 60 seconds on failure. With 100 concurrent users, you accumulate 6000 thread-seconds
          per second of failure. Set timeouts based on what the user can reasonably wait, not on the
          theoretical maximum response time of the downstream service.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is a circuit breaker and why do you need it?</strong></p>
      <p>
        A circuit breaker prevents cascading failures by detecting that a downstream service is
        failing and short-circuiting subsequent calls (failing fast instead of waiting for timeout).
        It has three states: closed (normal), open (downstream failing &mdash; fail immediately),
        and half-open (testing if downstream recovered). Without it, a slow downstream causes your
        threads to pile up waiting for timeouts, potentially taking down your service due to resource
        exhaustion.
      </p>

      <p><strong>Q: What is exponential backoff with jitter and why is jitter important?</strong></p>
      <p>
        Exponential backoff increases the wait time between retries exponentially (e.g., 100ms,
        200ms, 400ms, 800ms) to avoid overwhelming a struggling service. Jitter adds random variation
        to the delay. Jitter is critical because without it, all clients that experienced failures at
        the same time will retry at exactly the same intervals, creating synchronized retry storms
        that re-flood the recovering service at each retry wave. Jitter desynchronizes retries,
        spreading the load.
      </p>

      <p><strong>Q: How do you handle a payment API that may be called twice on network failure?</strong></p>
      <p>
        Use idempotency keys. The client generates a unique idempotency key before the first attempt
        and includes it in every retry. The server checks if a request with that key has already
        been processed. If yes, it returns the cached result without re-executing the charge. If no,
        it processes and stores the result indexed by the key. This allows unlimited safe retries
        because subsequent requests are no-ops that return the original response.
      </p>

      <p><strong>Q: What is the difference between timeout, retry, and circuit breaker?</strong></p>
      <p>
        Timeout bounds how long you will wait for one attempt. Retry decides whether to try again
        after a failure, with delay between attempts. Circuit breaker tracks failure patterns across
        many attempts and stops calling a failing service entirely for a period, allowing it to
        recover. They work together: timeout detects a hung call, retry handles transient failures,
        and circuit breaker prevents sustained retry storms against a failing dependency.
      </p>
    </div>
  );
}
