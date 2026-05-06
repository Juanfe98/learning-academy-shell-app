import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const architectureDiagram = String.raw`flowchart LR
    CLIENT["Client / Frontend"] --> API["Node API / BFF"]
    API --> SERVICE["Service layer"]
    SERVICE --> CACHE["Redis cache"]
    SERVICE --> DB["Primary database"]
    SERVICE --> QUEUE["Queue / broker"]
    QUEUE --> WORKER["Background worker"]
    WORKER --> EMAIL["Email / external APIs"]
    WORKER --> DB`;

export const toc: TocItem[] = [
  { id: "layering", title: "Layering the Service", level: 2 },
  { id: "async-boundaries", title: "Async Boundaries", level: 2 },
  { id: "state-placement", title: "Where State Should Live", level: 2 },
  {
    id: "service-shapes",
    title: "Monolith, BFF, Worker, Microservice",
    level: 2,
  },
  { id: "architecture-heuristics", title: "Architecture Heuristics", level: 2 },
];

export default function NodeArchitecturePatterns() {
  return (
    <div className="article-content">
      <p>
        Good Node architecture is mostly about separating request-time work from
        background work, process-local state from shared state, and transport
        concerns from business rules. Node makes it easy to ship a fast first
        version. Architecture decides whether the fifth version is still
        readable, testable, and scalable.
      </p>

      <h2 id="layering">Layering the Service</h2>
      <MermaidDiagram
        chart={architectureDiagram}
        title="Common Node Service Shape"
        caption="A healthy Node backend keeps HTTP concerns, business logic, storage, cache, and background jobs in distinct layers."
        minHeight={470}
      />

      <p>
        A simple and durable layering model is: transport layer for HTTP or
        messaging, service layer for business rules, repository or gateway layer
        for external systems, and background workers for slow or retryable work.
        The point is not ceremony. The point is isolation. If your email
        provider changes, your route handlers should not need surgery.
      </p>

      <h2 id="async-boundaries">Async Boundaries</h2>
      <p>
        One of the best architectural moves in Node is deciding what does not
        belong on the request path. Sending emails, generating PDFs, syncing
        third-party CRMs, retrying flaky webhooks, and large fan-out workflows
        usually belong behind a queue. The API can acknowledge quickly while a
        worker handles the long tail safely.
      </p>

      <h2 id="state-placement">Where State Should Live</h2>
      <ArticleTable
        caption="If a Node process can restart at any time, only some state is safe to keep locally."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>State type</th>
              <th>Good home</th>
              <th>Avoid</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Request-scoped values</td>
              <td>In-memory for that request only</td>
              <td>Global variables</td>
            </tr>
            <tr>
              <td>Shared sessions or auth state</td>
              <td>Redis / DB / external IdP</td>
              <td>Single-process memory</td>
            </tr>
            <tr>
              <td>Long-running jobs</td>
              <td>Queue + worker</td>
              <td>Detached promises inside API handlers</td>
            </tr>
            <tr>
              <td>Durable business data</td>
              <td>Database</td>
              <td>In-memory caches as source of truth</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="service-shapes">Monolith, BFF, Worker, Microservice</h2>
      <p>
        Node works well in all four shapes, but the constraints differ. A
        modular monolith is often the best default because it keeps complexity
        local. A BFF excels when frontend-specific data composition is needed.
        Worker services handle retries and long-running jobs. Microservices are
        only worth it when team boundaries, scaling profiles, or domain
        separation justify the extra operational cost.
      </p>

      <h2 id="architecture-heuristics">Architecture Heuristics</h2>
      <InterviewPlaybook
        title="Five heuristics that keep Node systems healthy"
        steps={[
          "Keep request handlers thin and business rules centralized in services.",
          "Move slow or retryable workflows behind queues instead of hiding them in detached async work.",
          "Treat in-process memory as disposable unless the data is strictly request-scoped.",
          "Prefer modular monoliths until clear pressure demands service splits.",
          "Design for observability and idempotency before scaling pain forces it later.",
        ]}
      />
    </div>
  );
}
