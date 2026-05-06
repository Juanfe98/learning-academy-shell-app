import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "runtime", title: "Runtime Fundamentals", level: 2 },
  { id: "async", title: "Async and Event Loop", level: 2 },
  { id: "modules", title: "Modules and Packages", level: 2 },
  { id: "streams", title: "Streams, Buffers, Files", level: 2 },
  { id: "http", title: "HTTP and Backend APIs", level: 2 },
  { id: "production", title: "Production and Architecture", level: 2 },
];

function Q({
  q,
  ideal,
  example,
}: {
  q: string;
  ideal: string;
  example: string;
}) {
  return (
    <div
      style={{
        marginBottom: "1.4rem",
        paddingLeft: "1rem",
        borderLeft: "2px solid #2a2a38",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#f0f0f5" }}>
        Q: {q}
      </p>
      <p style={{ marginBottom: "0.45rem", color: "#a0a0b8" }}>
        <strong style={{ color: "#f0f0f5" }}>Ideal response:</strong> {ideal}
      </p>
      <pre style={{ marginTop: 0 }}>
        <code>{example}</code>
      </pre>
    </div>
  );
}

export default function NodeMostCommonInterviewQuestions() {
  return (
    <div className="article-content">
      <p>
        This is the dedicated Node.js interview bank. Each question includes the
        ideal answer shape and a concrete example because interviewers are
        usually testing two things at once: whether you know the concept and
        whether you can anchor it in real code or production behavior.
      </p>

      <ArticleTable
        caption="Use this map to see the coverage quickly before drilling the detailed answers below."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Focus</th>
              <th>What a strong candidate shows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Runtime fundamentals</td>
              <td>V8, libuv, process model</td>
              <td>Correct mental model of where work actually happens</td>
            </tr>
            <tr>
              <td>Async and event loop</td>
              <td>Scheduling, concurrency, cancellation</td>
              <td>Can prevent starvation and reason about I/O</td>
            </tr>
            <tr>
              <td>Modules and packages</td>
              <td>ESM, CommonJS, package boundaries</td>
              <td>Can ship code that loads reliably</td>
            </tr>
            <tr>
              <td>Streams and files</td>
              <td>Binary data, streaming, backpressure</td>
              <td>Can handle large payloads without memory waste</td>
            </tr>
            <tr>
              <td>HTTP and APIs</td>
              <td>Servers, status codes, timeouts</td>
              <td>Can build and operate backend services</td>
            </tr>
            <tr>
              <td>Production architecture</td>
              <td>Scaling, workers, resilience</td>
              <td>Can explain how Node runs safely at scale</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="runtime">Runtime Fundamentals</h2>

      <Q
        q="What is Node.js?"
        ideal="Node.js is a JavaScript runtime built on V8. It adds server-side APIs like fs, net, and http plus libuv for event-driven asynchronous I/O, which makes it strong for high-concurrency network applications."
        example={`// Node can run server-side JavaScript directly
import http from "node:http";

http.createServer((_req, res) => res.end("hello")).listen(3000);`}
      />
      <Q
        q="Is Node.js single-threaded?"
        ideal="JavaScript execution is single-threaded per process, but Node is not single-capability. It uses the OS and libuv worker pool to handle asynchronous I/O, so many operations can be in flight while one main thread coordinates them."
        example={`// One JS thread coordinates async work
const [user, orders] = await Promise.all([
  fetchUser(),
  fetchOrders(),
]);`}
      />
      <Q
        q="What is libuv responsible for?"
        ideal="libuv powers the event loop, async handles, and worker pool used by Node for operations like file I/O, some DNS work, and other tasks that need coordination outside the main JavaScript call stack."
        example={`// readFile is exposed by Node, coordinated under the hood by libuv
import { readFile } from "node:fs/promises";
const text = await readFile("notes.txt", "utf8");`}
      />
      <Q
        q="When is Node.js a bad fit?"
        ideal="Node is a weaker fit when the main workload is CPU-heavy and latency-sensitive on the request path, like video transcoding or large numerical computation. In those cases you move work to worker threads, queues, or another service."
        example={`// Bad on the request path if this is large and synchronous
function expensiveHashLoop() {
  for (let i = 0; i < 5e8; i += 1) {}
}`}
      />

      <h2 id="async">Async and Event Loop</h2>

      <Q
        q="What is the event loop?"
        ideal="The event loop is the scheduler that lets Node process callbacks from timers, I/O, and other async sources. It keeps the main thread busy with ready work instead of blocking while waiting on the network or filesystem."
        example={`setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("microtask"));`}
      />
      <Q
        q="What is the difference between process.nextTick and Promise.then?"
        ideal="Both defer work, but nextTick runs before the normal microtask queue and before the event loop proceeds to the next phase. It should be used sparingly because recursive nextTick calls can starve I/O."
        example={`process.nextTick(() => console.log("nextTick"));
Promise.resolve().then(() => console.log("promise"));`}
      />
      <Q
        q="How do you explain concurrency vs parallelism in Node?"
        ideal="Concurrency means many tasks can make progress over time, especially I/O-bound work coordinated by the event loop. Parallelism means tasks literally run at the same time on multiple CPU cores, which in Node usually requires multiple processes or worker threads."
        example={`// Concurrent I/O
await Promise.all([fetchA(), fetchB(), fetchC()]);

// Parallel CPU work usually needs worker_threads`}
      />
      <Q
        q="Why can async code still block the app?"
        ideal="Async APIs do not magically make synchronous code disappear. If your callback does heavy CPU work, huge JSON parsing, or long microtask chains, the main thread is still blocked while executing that JavaScript."
        example={`app.get("/report", async (_req, res) => {
  const data = await loadData();
  const parsed = JSON.parse(veryLargeString); // still blocks here
  res.json({ ok: true, parsed });
});`}
      />
      <Q
        q="How do you cancel async work in modern Node?"
        ideal="Use AbortController where supported. It gives you a consistent cancellation signal for fetch, streams, and other APIs so timeouts and disconnects stop downstream work rather than letting it run indefinitely."
        example={`const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await fetch(url, { signal: controller.signal });`}
      />

      <h2 id="modules">Modules and Packages</h2>

      <Q
        q="What is the difference between CommonJS and ESM?"
        ideal="CommonJS uses require and module.exports with runtime loading. ESM uses import and export with a statically analyzable graph and supports features like top-level await. ESM is the preferred default for new Node projects."
        example={`// ESM
import { readFile } from "node:fs/promises";

// CommonJS
const fs = require("node:fs");`}
      />
      <Q
        q="What does the package.json type field do?"
        ideal="The type field tells Node how to interpret .js files. type: module means .js is treated as ESM. Without it, .js defaults to CommonJS unless you use .mjs."
        example={`{
  "type": "module"
}`}
      />
      <Q
        q="Why use the exports field?"
        ideal="The exports field defines the public entrypoints consumers are allowed to import. It prevents deep internal imports and gives you tighter control over runtime and type entry files."
        example={`{
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli.js"
  }
}`}
      />
      <Q
        q="How do you handle environment variables safely?"
        ideal="Read and validate them at startup, fail fast if required values are missing, and expose a single config object rather than spreading process.env reads across the app."
        example={`if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

export const config = { databaseUrl: process.env.DATABASE_URL };`}
      />

      <h2 id="streams">Streams, Buffers, Files</h2>

      <Q
        q="What is a Buffer?"
        ideal="A Buffer is Node's binary data type. It represents raw bytes and is used for files, network payloads, hashing, compression, and any non-text data."
        example={`const buf = Buffer.from("Node", "utf8");
console.log(buf.toString("hex"));`}
      />
      <Q
        q="What problem do streams solve?"
        ideal="Streams let you process data incrementally instead of loading the entire payload into memory first. That improves latency and keeps memory usage bounded for large or unbounded data sources."
        example={`import { createReadStream } from "node:fs";
const stream = createReadStream("large-video.mp4");`}
      />
      <Q
        q="What is backpressure?"
        ideal="Backpressure is the mechanism that slows a producer down when the consumer cannot keep up. It prevents memory blowups and keeps pipelines stable under load."
        example={`import { pipeline } from "node:stream/promises";
await pipeline(sourceStream, transformStream, destinationStream);`}
      />
      <Q
        q="When should you avoid readFile?"
        ideal="Avoid readFile for large files or high-concurrency paths where loading the whole file at once would waste memory or delay processing. In those cases use streams."
        example={`// Better for large files than await readFile(...)
createReadStream("archive.zip").pipe(res);`}
      />

      <h2 id="http">HTTP and Backend APIs</h2>

      <Q
        q="Can Node build HTTP servers without Express?"
        ideal="Yes. Node ships with the http module, so frameworks are optional ergonomics layers on top of the core networking primitives."
        example={`import http from "node:http";
http.createServer((_req, res) => res.end("ok")).listen(3000);`}
      />
      <Q
        q="Why do timeouts matter in Node backends?"
        ideal="Without deadlines, slow downstream calls tie up memory, sockets, and concurrency budget. Timeouts keep failure bounded and prevent one unhealthy dependency from dragging the whole service down."
        example={`const controller = new AbortController();
setTimeout(() => controller.abort(), 1500);
await fetch(serviceUrl, { signal: controller.signal });`}
      />
      <Q
        q="What is the difference between 401 and 403?"
        ideal="401 means the client is not authenticated, such as a missing or invalid token. 403 means the client is authenticated but not allowed to perform that action."
        example={`if (!token) return res.status(401).json({ error: "missing token" });
if (!user.isAdmin) return res.status(403).json({ error: "forbidden" });`}
      />
      <Q
        q="Why is streaming responses useful?"
        ideal="Streaming lets the client receive data progressively, reduces peak memory, and starts delivery sooner. It is useful for large downloads, generated reports, and proxied upstream responses."
        example={`res.write("starting\\n");
res.write("still working\\n");
res.end("done\\n");`}
      />

      <h2 id="production">Production and Architecture</h2>

      <Q
        q="How do you scale Node across CPU cores?"
        ideal="Run multiple processes or containers behind a load balancer, or use worker threads for CPU-bound work. Because processes do not share memory safely by default, important shared state must live in Redis, a database, or another external system."
        example={`// PM2 or container replicas are common ways to scale
// Each process gets its own event loop and memory`}
      />
      <Q
        q="When would you use worker threads?"
        ideal="Use worker threads for CPU-heavy JavaScript tasks that should not block the main request thread, such as image transforms, parsing, scoring, or batch computation."
        example={`import { Worker } from "node:worker_threads";

const worker = new Worker(new URL("./image-worker.js", import.meta.url));`}
      />
      <Q
        q="Why is keeping important state in process memory risky?"
        ideal="Processes restart, replicas scale horizontally, and requests can land on any instance. If critical state only exists in RAM inside one process, it is fragile and inconsistent."
        example={`// Fine: request-scoped data
const requestStart = Date.now();

// Risky: shared sessions only in local memory
const sessions = new Map();`}
      />
      <Q
        q="What does graceful shutdown mean?"
        ideal="Graceful shutdown means the process stops accepting new work, lets in-flight work finish within a deadline, cleans up resources, and then exits cleanly so deploys and autoscaling do not drop requests unnecessarily."
        example={`process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});`}
      />
      <Q
        q="How would you answer 'Why choose Node for this service?'"
        ideal="I would choose Node when the workload is I/O-heavy, needs high concurrency, benefits from a fast feedback loop, and shares language or model code with frontend teams. I would not choose it by default for CPU-dominant workloads on the hot path."
        example={`// Strong fit: API gateway, BFF, webhook processor, realtime service
// Weaker fit: large synchronous media transcoding on request path`}
      />
    </div>
  );
}
