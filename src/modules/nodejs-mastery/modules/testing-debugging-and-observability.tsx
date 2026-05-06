import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "testing-pyramid", title: "Testing Strategy", level: 2 },
  { id: "node-test", title: "node:test Basics", level: 2 },
  { id: "debugging", title: "Debugging Workflow", level: 2 },
  { id: "logs-metrics-traces", title: "Logs, Metrics, Traces", level: 2 },
  { id: "failure-investigation", title: "Failure Investigation", level: 2 },
];

export default function TestingDebuggingAndObservability() {
  return (
    <div className="article-content">
      <p>
        A Node.js service is only production-ready when you can prove it works,
        understand why it fails, and localize issues quickly under pressure.
        Testing, debugging, and observability are three views of the same
        question: can the team trust this service when reality gets messy?
      </p>

      <h2 id="testing-pyramid">Testing Strategy</h2>
      <ArticleTable
        caption="Healthy Node test suites mix fast unit feedback with realistic integration coverage."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>What it proves</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unit tests</td>
              <td>Business logic behaves correctly in isolation</td>
              <td>Pure validator, mapper, policy function</td>
            </tr>
            <tr>
              <td>Integration tests</td>
              <td>Boundaries between modules really work</td>
              <td>HTTP route + DB + auth middleware</td>
            </tr>
            <tr>
              <td>Contract tests</td>
              <td>Expected API shape stays stable</td>
              <td>Consumer-provider schema verification</td>
            </tr>
            <tr>
              <td>Smoke tests</td>
              <td>Deployment is minimally alive</td>
              <td>Health endpoint, DB reachability, startup check</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="node-test">node:test Basics</h2>
      <p>
        Modern Node ships with a built-in test runner. It will not replace every
        ecosystem tool, but it covers a lot of backend testing cleanly and keeps
        your baseline stack small.
      </p>

      <pre>
        <code>{`import test from "node:test";
import assert from "node:assert/strict";

function sum(a, b) {
  return a + b;
}

test("sum adds two numbers", () => {
  assert.equal(sum(2, 3), 5);
});`}</code>
      </pre>

      <h2 id="debugging">Debugging Workflow</h2>
      <p>
        Strong debugging starts with narrowing the scope: is the failure
        deterministic, data-shaped, load-shaped, or timing-shaped? From there,
        use breakpoints, request IDs, structured logs, trace spans, and
        reproductions with the smallest possible surface area.
      </p>

      <pre>
        <code>{`node --inspect-brk dist/server.js

// Useful runtime probes:
console.time("dbCall");
const result = await loadUser();
console.timeEnd("dbCall");`}</code>
      </pre>

      <h2 id="logs-metrics-traces">Logs, Metrics, Traces</h2>
      <ArticleTable
        caption="Observability works best when each signal answers a different class of question."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Best question it answers</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Logs</td>
              <td>What exactly happened in this request?</td>
              <td>Request ID, user ID, error name, downstream target</td>
            </tr>
            <tr>
              <td>Metrics</td>
              <td>Is the system healthy overall?</td>
              <td>P95 latency, error rate, queue depth, event loop lag</td>
            </tr>
            <tr>
              <td>Traces</td>
              <td>Where did the time go across services?</td>
              <td>Span tree across gateway, service, DB, cache</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        Structured JSON logs beat ad-hoc text logs in production because they
        can be indexed and filtered reliably. Metrics should track throughput,
        latency, error rate, and saturation. For Node specifically, event loop
        lag and heap usage are especially valuable saturation signals.
      </p>

      <h2 id="failure-investigation">Failure Investigation</h2>
      <InterviewPlaybook
        title="Five-step production investigation loop"
        steps={[
          "Confirm scope first: one request, one customer segment, one AZ, or the full service?",
          "Check the golden signals: latency, traffic, errors, saturation.",
          "Correlate with deploys, config changes, dependency incidents, and queue growth.",
          "Use request IDs or traces to isolate the slow or failing branch.",
          "Capture the learning in a regression test or monitor so the same issue is easier next time.",
        ]}
      />
    </div>
  );
}
