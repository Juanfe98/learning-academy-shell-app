import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const telemetryDiagram = String.raw`sequenceDiagram
  participant C as Client
  participant API as Express API
  participant DB as PostgreSQL
  participant R as Redis
  participant O as Observability Backend
  C->>API: GET /orders traceparent=...
  API->>DB: query orders span
  DB-->>API: rows
  API->>R: cache write span
  API-->>C: 200
  API-->>O: logs + metrics + traces`;

export const toc: TocItem[] = [
  { id: "three-pillars", title: "Logs, Metrics, and Traces", level: 2 },
  { id: "request-context", title: "AsyncLocalStorage Request Context", level: 2 },
  { id: "structured-logging", title: "Structured Logging Standards", level: 2 },
  { id: "metrics", title: "Metrics, SLOs, and Alerting", level: 2 },
  { id: "opentelemetry", title: "OpenTelemetry Tracing", level: 2 },
  { id: "profiling", title: "Profiling CPU, Heap, and Event Loop", level: 2 },
  { id: "incident-debugging", title: "Senior Incident Debugging Playbook", level: 2 },
];

export default function ObservabilityDiagnostics() {
  return (
    <div className="article-content">
      <p>
        Senior backend engineers are expected to operate what they build. Observability is how you
        answer: Is the system healthy? What changed? Which dependency is slow? Which customer is
        impacted? This lesson adds the diagnostics layer often missing from Express tutorials.
      </p>

      <h2 id="three-pillars">Logs, Metrics, and Traces</h2>
      <MermaidDiagram chart={telemetryDiagram} title="Telemetry from One Request" minHeight={360} />
      <ul>
        <li><strong>Logs</strong>: discrete events with context, useful for forensic debugging.</li>
        <li><strong>Metrics</strong>: numeric time series, useful for alerting and dashboards.</li>
        <li><strong>Traces</strong>: request journeys across services, useful for latency attribution.</li>
      </ul>

      <h2 id="request-context">AsyncLocalStorage Request Context</h2>
      <p>
        <code>AsyncLocalStorage</code> keeps request-specific values available across awaits without
        manually passing them to every function. Use it for request IDs, trace IDs, tenant IDs, and
        authenticated user IDs. Do not use it as a hidden dependency for core business logic.
      </p>
      <pre><code>{`import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";

export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
}>();

app.use((req, res, next) => {
  const requestId = req.get("x-request-id") ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  requestContext.run({ requestId }, next);
});

export function logInfo(message: string, extra = {}) {
  logger.info({ ...requestContext.getStore(), ...extra }, message);
}`}</code></pre>

      <h2 id="structured-logging">Structured Logging Standards</h2>
      <p>
        Logs should be JSON and machine-queryable. Include request ID, method, path, status, duration,
        user/tenant IDs when safe, error code, and dependency name. Never log passwords, tokens,
        session cookies, raw authorization headers, or sensitive PII.
      </p>

      <h2 id="metrics">Metrics, SLOs, and Alerting</h2>
      <p>
        Alert on user-impacting symptoms, not just server internals. Useful API metrics include request
        rate, error rate, duration percentiles, saturation, event loop lag, heap usage, DB pool usage,
        queue depth, retry count, and rate-limit rejections.
      </p>
      <pre><code>{`// Senior answer pattern:
// SLI: 99% of GET /checkout requests complete under 300ms and error rate < 0.5%.
// SLO: meet that target over 30 days.
// Alert: burn-rate alert when the error budget is being consumed too quickly.`}</code></pre>

      <h2 id="opentelemetry">OpenTelemetry Tracing</h2>
      <p>
        OpenTelemetry standardizes traces, metrics, and context propagation. Instrument Express,
        PostgreSQL/Prisma, Redis, HTTP clients, and queues. Propagate <code>traceparent</code> headers
        so one request can be followed across services.
      </p>

      <h2 id="profiling">Profiling CPU, Heap, and Event Loop</h2>
      <ul>
        <li><strong>CPU spike</strong>: capture a CPU profile/flamegraph and find hot functions.</li>
        <li><strong>Memory leak</strong>: compare heap snapshots and inspect retained objects.</li>
        <li><strong>Latency spike</strong>: check event loop lag, DB pool saturation, slow queries, and downstream traces.</li>
        <li><strong>Throughput collapse</strong>: inspect queue depth, connection limits, retry storms, and rate limiting.</li>
      </ul>

      <h2 id="incident-debugging">Senior Incident Debugging Playbook</h2>
      <ol>
        <li>Confirm user impact with SLIs: errors, latency, availability.</li>
        <li>Identify blast radius: endpoint, tenant, region, dependency, release version.</li>
        <li>Check recent changes: deploys, config, migrations, traffic shape.</li>
        <li>Use traces to locate slow or failing spans.</li>
        <li>Mitigate first: rollback, disable feature flag, shed load, increase capacity.</li>
        <li>Afterward: write a blameless postmortem with prevention actions.</li>
      </ol>
    </div>
  );
}
