import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestFlow = String.raw`sequenceDiagram
    autonumber
    actor C as Client
    participant S as Node HTTP Server
    participant R as Router / Handler
    participant D as Downstream APIs / DB

    C->>S: TCP connection + HTTP request
    S->>R: Parse headers, route, stream body
    R->>D: Async I/O
    D-->>R: Data or error
    R-->>S: Headers + response body
    S-->>C: Streamed response`;

export const toc: TocItem[] = [
  { id: "http-lifecycle", title: "HTTP Lifecycle", level: 2 },
  { id: "native-http", title: "Native HTTP Server", level: 2 },
  { id: "streaming-bodies", title: "Streaming Bodies", level: 2 },
  { id: "protocol-choices", title: "REST, SSE, WebSockets", level: 2 },
  { id: "timeouts-retries", title: "Timeouts and Retries", level: 2 },
  { id: "api-checklist", title: "API Design Checklist", level: 2 },
];

export default function NetworkingHttpAndApis() {
  return (
    <div className="article-content">
      <p>
        Node.js earned its reputation on networking. The runtime is excellent at
        accepting connections, parsing requests, talking to downstream services,
        and streaming responses without tying up threads per socket. This module
        focuses on the primitives behind API servers, not just framework sugar.
      </p>

      <h2 id="http-lifecycle">HTTP Lifecycle</h2>
      <MermaidDiagram
        chart={requestFlow}
        title="Node Request Lifecycle"
        caption="A Node HTTP server parses the request, routes it, performs async work, and can stream the response progressively."
        minHeight={420}
      />

      <h2 id="native-http">Native HTTP Server</h2>
      <p>
        Frameworks like Express and Fastify add ergonomics, but under the hood
        there is still an HTTP server, sockets, headers, body parsing, and
        response streaming. Understanding the built-in <code>node:http</code>{" "}
        layer makes framework behavior much easier to debug.
      </p>

      <pre>
        <code>{`import http from "node:http";

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000);`}</code>
      </pre>

      <p>
        Even if you never ship handlers at this level, it teaches the right
        model: one socket can carry multiple requests with keep-alive, request
        bodies may arrive as streams, and response headers must be decided
        before the body is sent.
      </p>

      <h2 id="streaming-bodies">Streaming Bodies</h2>
      <p>
        Requests and responses are streams. That matters for uploads, downloads,
        proxied APIs, and any large payload. If you buffer first, latency grows
        and memory climbs. If you stream, work begins earlier and memory remains
        bounded.
      </p>

      <pre>
        <code>{`res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
res.write("Starting report...\\n");

for (const chunk of ["Collecting sales", "Aggregating totals", "Formatting output"]) {
  res.write(chunk + "\\n");
}

res.end("Done\\n");`}</code>
      </pre>

      <h2 id="protocol-choices">REST, SSE, WebSockets</h2>
      <ArticleTable
        caption="Choose the lightest transport that satisfies the interaction pattern."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Best fit</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CRUD APIs</td>
              <td>REST over HTTP</td>
              <td>Simple semantics, cacheability, ecosystem maturity</td>
            </tr>
            <tr>
              <td>Server-to-client event feed</td>
              <td>SSE</td>
              <td>
                One-way streaming with less operational weight than WebSockets
              </td>
            </tr>
            <tr>
              <td>Bidirectional realtime collaboration</td>
              <td>WebSockets</td>
              <td>Low-latency two-way messaging</td>
            </tr>
            <tr>
              <td>Internal service calls</td>
              <td>HTTP or gRPC</td>
              <td>Depends on ecosystem and contract needs</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="timeouts-retries">Timeouts and Retries</h2>
      <p>
        Production APIs need deadlines. A Node service that waits forever on a
        downstream dependency is not resilient; it is contagious. Set connection
        and response timeouts, propagate cancellation, and only retry operations
        that are safe or explicitly idempotent.
      </p>

      <pre>
        <code>{`const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 1000);

try {
  const response = await fetch("https://api.example.com/orders", {
    signal: controller.signal,
    headers: { "x-request-id": requestId },
  });
  if (!response.ok) throw new Error("Downstream failure");
} finally {
  clearTimeout(timeout);
}`}</code>
      </pre>

      <h2 id="api-checklist">API Design Checklist</h2>
      <ul>
        <li>Validate inputs before expensive downstream calls.</li>
        <li>Return consistent error envelopes and appropriate status codes.</li>
        <li>Propagate correlation IDs for tracing.</li>
        <li>Use streaming when payloads are large or progress matters.</li>
        <li>
          Define retry policy deliberately instead of &quot;try again on
          everything.&quot;
        </li>
      </ul>
    </div>
  );
}
