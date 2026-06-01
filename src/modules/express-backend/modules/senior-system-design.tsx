import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "interview-framework", title: "Backend System Design Framework", level: 2 },
  { id: "rate-limiter", title: "Design a Distributed Rate Limiter", level: 2 },
  { id: "multi-tenant-auth", title: "Design Multi-Tenant Auth", level: 2 },
  { id: "audit-log", title: "Design an Audit Log", level: 2 },
  { id: "notifications", title: "Design a Notification System", level: 2 },
  { id: "high-throughput-api", title: "Design a High-Throughput API", level: 2 },
  { id: "senior-rubric", title: "What Senior Interviewers Look For", level: 2 },
];

export default function SeniorSystemDesign() {
  return (
    <div className="article-content">
      <p>
        Senior Node.js interviews usually include architecture and system design. The interviewer is
        not only checking if you know Express; they want to see how you reason about scale, failure,
        consistency, observability, security, and tradeoffs.
      </p>

      <h2 id="interview-framework">Backend System Design Framework</h2>
      <ol>
        <li><strong>Clarify requirements</strong>: users, endpoints, SLAs, consistency, security, data retention.</li>
        <li><strong>Estimate scale</strong>: QPS, data size, write/read ratio, peak traffic, payload size.</li>
        <li><strong>Define API contracts</strong>: request/response shape, status codes, idempotency, auth.</li>
        <li><strong>Model data</strong>: entities, indexes, uniqueness, retention, migrations.</li>
        <li><strong>Choose architecture</strong>: sync request path, async workers, caches, queues, storage.</li>
        <li><strong>Discuss failure modes</strong>: retries, timeouts, partial failure, DLQs, graceful degradation.</li>
        <li><strong>Operationalize</strong>: logs, metrics, traces, dashboards, alerts, runbooks.</li>
      </ol>

      <h2 id="rate-limiter">Design a Distributed Rate Limiter</h2>
      <p>
        A senior answer covers algorithm, storage, identity, deployment topology, and abuse cases.
      </p>
      <ul>
        <li><strong>Algorithm</strong>: fixed window is simple but bursty; sliding window/log is precise but memory-heavy; token bucket allows controlled bursts.</li>
        <li><strong>Storage</strong>: Redis with atomic Lua script or sorted sets for sliding windows.</li>
        <li><strong>Identity</strong>: user ID for authenticated traffic, API key for partners, IP as fallback.</li>
        <li><strong>Headers</strong>: return <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>, and <code>Retry-After</code>.</li>
        <li><strong>Scale</strong>: local in-memory limiters fail across multiple pods; use shared storage or edge gateways.</li>
      </ul>

      <h2 id="multi-tenant-auth">Design Multi-Tenant Auth</h2>
      <p>
        Model organizations, memberships, roles, permissions, invitations, and tenant-aware resources.
        Every query must be tenant-scoped. Consider tenant isolation level: shared schema, separate
        schema, or separate database. Discuss role hierarchy, custom permissions, audit logs, and SSO.
      </p>
      <pre><code>{`// Defense-in-depth: application check + database uniqueness/indexing
// users(id, email)
// organizations(id, slug)
// memberships(user_id, org_id, role)
// projects(id, org_id, name)
// unique(org_id, name)

await prisma.project.findFirst({
  where: { id: projectId, orgId: req.user.orgId },
});`}</code></pre>

      <h2 id="audit-log">Design an Audit Log</h2>
      <p>
        Audit logs should be append-only, tamper-evident when required, searchable, and safe for PII.
        Capture actor, action, resource, timestamp, request ID, IP/user-agent where appropriate, before
        and after summaries, and authorization decision metadata.
      </p>
      <ul>
        <li>Write audit entries in the same transaction as the sensitive change when possible.</li>
        <li>Use outbox/events when forwarding to analytics or compliance storage.</li>
        <li>Define retention and redaction policy upfront.</li>
      </ul>

      <h2 id="notifications">Design a Notification System</h2>
      <p>
        Separate notification intent from delivery. Store preferences, templates, channels, provider
        responses, retries, and dedupe keys. Email/SMS/push delivery should run in workers, not inside
        the API request path.
      </p>

      <h2 id="high-throughput-api">Design a High-Throughput API</h2>
      <ul>
        <li>Keep Node request handlers non-blocking and lightweight.</li>
        <li>Use connection pools sized for the database, not just the number of pods.</li>
        <li>Add caching only where invalidation is clear.</li>
        <li>Use pagination, compression, ETags, and response size limits.</li>
        <li>Protect dependencies with timeouts, bulkheads, circuit breakers, and load shedding.</li>
      </ul>

      <h2 id="senior-rubric">What Senior Interviewers Look For</h2>
      <ul>
        <li>You ask clarifying questions before designing.</li>
        <li>You state assumptions and tradeoffs explicitly.</li>
        <li>You design for failure, not only the happy path.</li>
        <li>You know when Express is not the bottleneck: database, network, queue, cache, or architecture often is.</li>
        <li>You include security and observability as first-class requirements.</li>
      </ul>
    </div>
  );
}
