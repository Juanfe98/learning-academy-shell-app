import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "input-boundary", title: "Treat Input as Hostile", level: 2 },
  { id: "secrets", title: "Secrets and Configuration", level: 2 },
  {
    id: "dependency-risk",
    title: "Dependency and Supply-Chain Risk",
    level: 2,
  },
  { id: "shutdown", title: "Graceful Shutdown", level: 2 },
  { id: "prod-checklist", title: "Production Hardening Checklist", level: 2 },
];

export default function SecurityAndProductionHardening() {
  return (
    <div className="article-content">
      <p>
        Node security is mostly application security expressed through a dynamic
        runtime and a very large package ecosystem. The biggest wins come from
        disciplined boundaries: validate inputs, manage secrets safely, reduce
        dependency surface area, and make process lifecycle behavior predictable
        under deploys and incidents.
      </p>

      <h2 id="input-boundary">Treat Input as Hostile</h2>
      <p>
        Every request body, header, query string, file upload, and downstream
        response is untrusted input. Validation is not a developer convenience
        layer; it is a security boundary. This is how you reduce injection,
        prototype pollution exposure, path traversal, and logic abuse.
      </p>

      <ArticleTable
        caption="These are the recurring Node backend risks teams should actively defend against."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Risk</th>
              <th>Typical cause</th>
              <th>Defensive move</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prototype pollution</td>
              <td>Merging untrusted objects deeply without guards</td>
              <td>Use safe merge libraries and validate keys</td>
            </tr>
            <tr>
              <td>Path traversal</td>
              <td>Using user input directly in file paths</td>
              <td>Resolve against allowlisted roots and sanitize names</td>
            </tr>
            <tr>
              <td>SSRF</td>
              <td>Server fetches attacker-controlled URLs</td>
              <td>
                Allowlist destinations, block private CIDRs, validate schemes
              </td>
            </tr>
            <tr>
              <td>DoS via payload size</td>
              <td>Unbounded bodies or expensive parsing</td>
              <td>Set body limits, timeouts, and request budgets</td>
            </tr>
            <tr>
              <td>Secret leakage</td>
              <td>Logging env vars or embedding credentials in code</td>
              <td>Use secret managers and scrub logs</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="secrets">Secrets and Configuration</h2>
      <p>
        Secrets should come from dedicated secret storage or deployment
        environment injection, never from source control. Rotate them, scope
        them tightly, and avoid printing them in error output. Your config
        module should fail fast on startup when required values are missing.
      </p>

      <h2 id="dependency-risk">Dependency and Supply-Chain Risk</h2>
      <p>
        Node&apos;s ecosystem is powerful precisely because so much
        functionality is one install away. That is also why supply-chain
        discipline matters. Prefer maintained packages, review update cadence,
        lock versions, and be suspicious of tiny convenience dependencies in
        security-sensitive code paths.
      </p>

      <h2 id="shutdown">Graceful Shutdown</h2>
      <p>
        A production process must know how to stop. During deploys or
        autoscaling, new traffic should stop entering, in-flight requests should
        finish within a deadline, background workers should stop accepting new
        jobs, and connections should close cleanly.
      </p>

      <pre>
        <code>{`const server = app.listen(3000);

async function shutdown(signal) {
  console.log(\`Received \${signal}\`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));`}</code>
      </pre>

      <h2 id="prod-checklist">Production Hardening Checklist</h2>
      <ul>
        <li>Validate all external input at the boundary.</li>
        <li>Use least-privilege credentials and managed secret storage.</li>
        <li>Lock dependency versions and review high-risk packages.</li>
        <li>Set body limits, timeouts, and concurrency limits.</li>
        <li>Implement graceful shutdown and health endpoints.</li>
      </ul>
    </div>
  );
}
