import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const eventLoopCycleDiagram = String.raw`flowchart TD
    START["Synchronous code runs\n(call stack)"]
    START --> NT["Drain nextTick queue\nprocess.nextTick callbacks"]
    NT --> PM["Drain Promise microtask queue\nPromise.then · queueMicrotask"]
    PM --> PICK["Event loop picks next macrotask\n(timer / I/O / setImmediate / close)"]
    PICK --> EXEC["Execute macrotask callback"]
    EXEC --> NT
    EXEC -->|"no more macrotasks"| IDLE["Poll phase: wait for I/O\n(OS signals when ready)"]
    IDLE --> PICK`;

const eventLoopPhasesDiagram = String.raw`flowchart LR
    T["① Timers\nsetTimeout\nsetInterval"]
    PC["② Pending callbacks\nOS errors\n(TCP ECONNREFUSED)"]
    IP["③ Idle/prepare\ninternal only"]
    PO["④ Poll\nblock for I/O\nrun I/O callbacks"]
    CH["⑤ Check\nsetImmediate"]
    CC["⑥ Close\nsocket.on('close')"]

    T --> PC --> IP --> PO --> CH --> CC --> T
    MQ["nextTick + Promise microtasks\nrun after EACH callback"] -. always drain first .-> T`;

const macroMicroDiagram = String.raw`flowchart TD
    subgraph MICRO["Microtasks (run between every macrotask)"]
        NT2["nextTick queue\nprocess.nextTick"]
        PM2["Promise microtask queue\nPromise.then · queueMicrotask · await"]
        NT2 --> PM2
    end
    subgraph MACRO["Macrotasks (one per event loop turn)"]
        TM["Timers\nsetTimeout · setInterval"]
        IO["I/O callbacks\nfs · net · http"]
        IM["setImmediate"]
        CL["Close callbacks"]
    end
    MACRO -->|"after each macrotask"| MICRO
    MICRO -->|"when empty"| MACRO`;

const workerDiagram = String.raw`flowchart LR
    MAIN["Main thread\n(Event loop)\nHandles HTTP requests"]
    WORKER["Worker Thread\n(Separate V8 isolate)\nRuns CPU-heavy JS"]
    SHARED["SharedArrayBuffer\n(optional shared memory)"]

    MAIN -->|"postMessage(data)"| WORKER
    WORKER -->|"postMessage(result)"| MAIN
    MAIN <-->|"Atomics"| SHARED
    WORKER <-->|"Atomics"| SHARED`;

const clusterDiagram = String.raw`flowchart TD
    PRIMARY["Primary Process\n(cluster.isPrimary)\nForks workers, restarts on crash"]
    W1["Worker 1\nExpress server\nPort 3000"]
    W2["Worker 2\nExpress server\nPort 3000"]
    W3["Worker N\nExpress server\nPort 3000"]
    LB["OS round-robin\n(or nginx load balancer)"]
    CLIENT["Incoming requests"]

    PRIMARY --> W1
    PRIMARY --> W2
    PRIMARY --> W3
    CLIENT --> LB
    LB --> W1
    LB --> W2
    LB --> W3`;

const fsInternalDiagram = String.raw`sequenceDiagram
    participant JS as JS Thread
    participant UV as libuv
    participant TP as Thread Pool (4 threads)
    participant OS as OS / kernel

    JS->>UV: fs.readFile("data.json", cb)
    UV->>TP: assign to available thread
    Note over JS: JS thread FREE — handles other requests
    TP->>OS: open + read syscalls
    OS-->>TP: file data
    TP-->>UV: done, data ready
    UV-->>JS: queue callback
    JS->>JS: execute callback with data`;

export const toc: TocItem[] = [
  { id: "what-is-event-loop", title: "What is the event loop?", level: 2 },
  { id: "event-loop-phases", title: "Event loop phases", level: 2 },
  { id: "microtasks-macrotasks", title: "Microtasks vs macrotasks", level: 2 },
  { id: "settimeout-setimmediate-nexttick", title: "setTimeout vs setImmediate vs nextTick", level: 2 },
  { id: "execution-order", title: "What runs first: Promise, setTimeout, nextTick?", level: 2 },
  { id: "what-blocks-event-loop", title: "What can block the event loop?", level: 2 },
  { id: "detect-blocking", title: "How to detect event loop blocking", level: 2 },
  { id: "avoid-blocking", title: "How to avoid blocking the event loop", level: 2 },
  { id: "readfilesync-api", title: "fs.readFileSync in an API route", level: 2 },
  { id: "async-io-vs-cpu", title: "Async I/O vs CPU-bound work", level: 2 },
  { id: "cpu-intensive", title: "Handling CPU-intensive tasks", level: 2 },
  { id: "worker-threads", title: "What are worker threads?", level: 2 },
  { id: "cluster-module", title: "What is the cluster module?", level: 2 },
  { id: "workers-vs-processes", title: "Worker threads vs multiple processes", level: 2 },
  { id: "fs-internally", title: "How Node.js handles file system operations internally", level: 2 },
];

export default function InterviewEventLoop() {
  return (
    <div className="article-content">
      <p>
        Section 2 of 18 — Event loop and async behavior. These are the most common senior Node.js
        interview questions. Every answer here connects back to one core idea: the JS thread never
        waits, it delegates. Master that and the rest follows.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="what-is-event-loop">What is the event loop?</h2>
      <p>
        The event loop is the mechanism that lets Node.js perform non-blocking I/O using a single
        thread. It is a continuous loop that checks: are there callbacks ready to run? If yes, run
        them. If no, wait for I/O to complete.
      </p>
      <MermaidDiagram
        chart={eventLoopCycleDiagram}
        title="The Event Loop Cycle"
        caption="After every callback, Node drains ALL microtasks (nextTick first, then Promises) before picking the next macrotask. The poll phase blocks when idle — saving CPU until I/O arrives."
        minHeight={500}
      />
      <p>
        <strong>Interview one-liner:</strong> &quot;The event loop continuously picks queued
        callbacks and runs them one at a time on the JS thread. Between each callback, it drains
        all microtasks. I/O never blocks — the OS signals Node when data is ready.&quot;
      </p>

      {/* ─── Q2 ─── */}
      <h2 id="event-loop-phases">Explain the phases of the Node.js event loop.</h2>
      <MermaidDiagram
        chart={eventLoopPhasesDiagram}
        title="The 6 Phases of the libuv Event Loop"
        caption="The event loop cycles through these phases in order. Microtasks drain after every individual callback — not just between phases."
        minHeight={360}
      />
      <ArticleTable caption="What happens in each phase — know these for senior interviews" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Phase</th>
              <th>What runs</th>
              <th>Key detail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>① Timers</strong></td>
              <td><code>setTimeout</code> and <code>setInterval</code> callbacks whose delay has elapsed</td>
              <td>Not guaranteed to fire exactly at the delay — OS scheduling adds jitter</td>
            </tr>
            <tr>
              <td><strong>② Pending callbacks</strong></td>
              <td>OS-level error callbacks deferred to next tick (e.g. TCP <code>ECONNREFUSED</code>)</td>
              <td>Rarely relevant in application code</td>
            </tr>
            <tr>
              <td><strong>③ Idle/prepare</strong></td>
              <td>Internal libuv use only</td>
              <td>Your code never runs here</td>
            </tr>
            <tr>
              <td><strong>④ Poll</strong></td>
              <td>Retrieve and execute new I/O callbacks (file reads, network, etc.)</td>
              <td><strong>Most important phase.</strong> Blocks here waiting for I/O if nothing else is scheduled</td>
            </tr>
            <tr>
              <td><strong>⑤ Check</strong></td>
              <td><code>setImmediate</code> callbacks</td>
              <td>Always runs after poll — more predictable than <code>setTimeout(fn, 0)</code></td>
            </tr>
            <tr>
              <td><strong>⑥ Close callbacks</strong></td>
              <td><code>socket.destroy()</code>, <code>socket.on('close')</code></td>
              <td>Cleanup phase for abruptly closed handles</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q3 ─── */}
      <h2 id="microtasks-macrotasks">What is the difference between microtasks and macrotasks?</h2>
      <MermaidDiagram
        chart={macroMicroDiagram}
        title="Microtasks vs Macrotasks"
        caption="Microtasks drain completely after EVERY macrotask. This means Promise callbacks always run before the next setTimeout — even if the timeout delay is 0."
        minHeight={400}
      />
      <ArticleTable caption="The key rule: microtasks always run before the next macrotask, no exceptions" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Microtasks</th>
              <th>Macrotasks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>APIs</strong></td>
              <td><code>process.nextTick</code>, <code>Promise.then</code>, <code>queueMicrotask</code>, <code>await</code></td>
              <td><code>setTimeout</code>, <code>setInterval</code>, <code>setImmediate</code>, I/O callbacks</td>
            </tr>
            <tr>
              <td><strong>When they run</strong></td>
              <td>After EVERY callback — all of them drain before the loop moves on</td>
              <td>One per event loop turn — loop picks the next one after microtasks drain</td>
            </tr>
            <tr>
              <td><strong>Priority</strong></td>
              <td>Higher — always runs first</td>
              <td>Lower — waits until microtask queue is empty</td>
            </tr>
            <tr>
              <td><strong>Danger</strong></td>
              <td>Infinite microtask loop (recursive <code>nextTick</code>) starves I/O forever</td>
              <td>Long-running callback blocks the event loop</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q4 ─── */}
      <h2 id="settimeout-setimmediate-nexttick">What is the difference between setTimeout, setImmediate, and process.nextTick?</h2>
      <pre>
        <code>{`// process.nextTick — runs BEFORE any I/O, before Promises
// Use for: deferring within the current operation without losing your place in the queue
process.nextTick(() => console.log("nextTick"));

// Promise.then — runs after nextTick queue drains, still before any macrotask
Promise.resolve().then(() => console.log("promise"));

// setImmediate — runs in the CHECK phase, after I/O callbacks
// Use for: continuing work after I/O without blocking the poll phase
setImmediate(() => console.log("setImmediate"));

// setTimeout(fn, 0) — runs in the TIMERS phase on the next loop iteration
// The actual delay is at least 1ms (OS minimum) — not truly "immediate"
// Use for: yielding to the event loop when you want a full tick to pass
setTimeout(() => console.log("setTimeout"), 0);`}</code>
      </pre>
      <ArticleTable caption="Pick the right scheduling API — they solve different problems" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>API</th>
              <th>Runs when</th>
              <th>Best use case</th>
              <th>Danger</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>process.nextTick()</code></td>
              <td>After current op, before any I/O or Promises</td>
              <td>Emit events after a constructor returns; ensure callback is always async</td>
              <td>Recursive use starves I/O — loop never moves forward</td>
            </tr>
            <tr>
              <td><code>Promise.then()</code> / <code>await</code></td>
              <td>After nextTick queue drains, before next macrotask</td>
              <td>Async composition, chaining async operations</td>
              <td>Deep chains can delay visible work</td>
            </tr>
            <tr>
              <td><code>setImmediate()</code></td>
              <td>Check phase — after current poll cycle</td>
              <td>Continue after I/O without blocking further I/O</td>
              <td>Confused with <code>setTimeout(fn, 0)</code> — they are different</td>
            </tr>
            <tr>
              <td><code>setTimeout(fn, 0)</code></td>
              <td>Timers phase — minimum ~1ms later</td>
              <td>Yield to the event loop when timing precision is unimportant</td>
              <td>Not actually immediate — OS timer granularity applies</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q5 ─── */}
      <h2 id="execution-order">What runs first: Promise.then, setTimeout, or process.nextTick?</h2>
      <p>
        <strong>Order: <code>nextTick</code> → <code>Promise.then</code> → <code>setTimeout</code> / <code>setImmediate</code></strong>
      </p>
      <pre>
        <code>{`console.log("1 — sync");

setTimeout(() => console.log("5 — setTimeout"), 0);
setImmediate(() => console.log("6 — setImmediate"));

Promise.resolve().then(() => console.log("3 — Promise.then"));
Promise.resolve().then(() => console.log("4 — Promise.then 2"));

process.nextTick(() => console.log("2 — nextTick"));

console.log("1b — sync");

// Output (always):
// 1 — sync
// 1b — sync
// 2 — nextTick          ← nextTick queue drains first
// 3 — Promise.then      ← Promise microtask queue drains second
// 4 — Promise.then 2    ← still microtasks, all drain before macrotasks
// 5 — setTimeout        ← macrotask (timers phase)
// 6 — setImmediate      ← macrotask (check phase)
// Note: order of 5 and 6 can vary at the top level.
// Inside an I/O callback, setImmediate ALWAYS runs before setTimeout(fn, 0)

// Nested example — microtasks spawn microtasks
Promise.resolve().then(() => {
  console.log("A");
  process.nextTick(() => console.log("B — nextTick inside promise"));
  // B runs before the next Promise.then below — nextTick drains first even inside promises
}).then(() => console.log("C"));
// Output: A → B → C`}</code>
      </pre>
      <p>
        <strong>Why this matters in interviews:</strong> Interviewers use execution-order puzzles
        to test whether you truly understand the two-queue model. The answer to memorize:{" "}
        <em>nextTick → Promise microtasks → macrotasks</em>.
      </p>

      {/* ─── Q6 ─── */}
      <h2 id="what-blocks-event-loop">What can block the event loop?</h2>
      <p>
        Anything that keeps the JS thread busy synchronously. During that time, every other
        request, timer, and callback waits. For a server handling 500 req/s, a 100ms block
        means every request in that window experiences 100ms extra latency.
      </p>
      <ArticleTable caption="Common event loop blockers — know all of these" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Blocker</th>
              <th>Example</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Synchronous file I/O</td>
              <td><code>fs.readFileSync()</code>, <code>fs.writeFileSync()</code></td>
              <td>Use <code>fs.promises.readFile()</code> / async versions</td>
            </tr>
            <tr>
              <td>Heavy JSON operations</td>
              <td><code>JSON.parse()</code> on a 50 MB payload</td>
              <td>Stream + parse incrementally, or offload to Worker Thread</td>
            </tr>
            <tr>
              <td>Synchronous crypto</td>
              <td><code>crypto.pbkdf2Sync()</code>, <code>bcrypt.hashSync()</code> with high rounds</td>
              <td>Use async versions: <code>crypto.pbkdf2()</code>, <code>bcrypt.hash()</code></td>
            </tr>
            <tr>
              <td>Tight CPU loops</td>
              <td>Fibonacci, sorting, regex with catastrophic backtracking</td>
              <td>Worker Thread for JS, or dedicated service in another language</td>
            </tr>
            <tr>
              <td>Synchronous child processes</td>
              <td><code>execSync()</code>, <code>spawnSync()</code></td>
              <td>Use async: <code>exec()</code>, <code>spawn()</code></td>
            </tr>
            <tr>
              <td>Recursive <code>process.nextTick()</code></td>
              <td><code>function bad() {'{'} process.nextTick(bad); {'}'}</code></td>
              <td>Use <code>setImmediate()</code> to yield to I/O between iterations</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// ❌ Blocks the event loop — every request waits during this
app.post("/upload", (req, res) => {
  const content = fs.readFileSync("/uploads/huge-file.csv"); // synchronous!
  const parsed = JSON.parse(content.toString());
  res.json({ rows: parsed.length });
});

// ✅ Non-blocking — event loop stays free
app.post("/upload", async (req, res) => {
  const content = await fs.promises.readFile("/uploads/huge-file.csv");
  const parsed = JSON.parse(content.toString()); // still sync, but on smaller data
  res.json({ rows: parsed.length });
});`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="detect-blocking">How do you detect event loop blocking?</h2>
      <p>
        Measure <strong>event loop lag</strong> — the gap between when a callback was scheduled
        and when it actually ran. High lag = the thread was busy with other work. A p99 lag above
        100ms is user-visible.
      </p>
      <pre>
        <code>{`import { monitorEventLoopDelay } from "node:perf_hooks";

// Sample event loop delay every 20ms
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  const p50 = (histogram.percentile(50) / 1e6).toFixed(2);  // ns → ms
  const p99 = (histogram.percentile(99) / 1e6).toFixed(2);
  const max = (histogram.max / 1e6).toFixed(2);

  if (parseFloat(p99) > 100) {
    console.warn({ eventLoopLag: { p50, p99, max } }, "⚠️ High event loop lag");
  }

  histogram.reset();
}, 5_000);

// In Express: expose as a metric
app.get("/metrics/event-loop", (_req, res) => {
  res.json({
    p50ms: histogram.percentile(50) / 1e6,
    p99ms: histogram.percentile(99) / 1e6,
  });
});

// Tools:
// clinic doctor -- node server.js    → diagnoses blocking, memory, I/O issues
// clinic flame -- node server.js     → CPU flame graph
// node --prof server.js              → V8 profiler output
// 0x -o -- node server.js            → interactive flame graph`}</code>
      </pre>

      {/* ─── Q8 ─── */}
      <h2 id="avoid-blocking">How do you avoid blocking the event loop?</h2>
      <pre>
        <code>{`// Rule 1: Always use async I/O
// ❌
const data = fs.readFileSync("file.json");
// ✅
const data = await fs.promises.readFile("file.json");

// Rule 2: Use async crypto
// ❌
const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha256");
// ✅
const hash = await promisify(crypto.pbkdf2)(password, salt, 100_000, 64, "sha256");

// Rule 3: Break up long synchronous loops with setImmediate
async function processLargeArray(items: string[]) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);

    // Yield every 1000 items — lets other callbacks run
    if (i % 1000 === 0) {
      await new Promise((r) => setImmediate(r));
    }
  }
}

// Rule 4: Offload CPU work to Worker Threads
import { Worker } from "node:worker_threads";

app.post("/compress", async (req, res) => {
  const result = await runInWorker("./compress-worker.js", req.body.data);
  res.json(result);
});

// Rule 5: Use streams for large data instead of buffering
app.get("/large-file", (req, res) => {
  const stream = fs.createReadStream("large-file.csv");
  stream.pipe(res); // never loads entire file into memory
});`}</code>
      </pre>

      {/* ─── Q9 ─── */}
      <h2 id="readfilesync-api">What happens when you use fs.readFileSync in an API route?</h2>
      <p>
        The JS thread <strong>blocks completely</strong> for the duration of the file read. Every
        other pending request, timer, and callback waits. If the file takes 200ms to read and
        your server is handling 100 concurrent requests, all 100 experience at least 200ms of
        extra latency — and requests that arrive during the read don&apos;t even start processing.
      </p>
      <pre>
        <code>{`// What happens with readFileSync in production:
// → Server receives 50 concurrent requests
// → Request 1 hits readFileSync on a 500ms file read
// → Requests 2-50 sit in the callback queue, frozen
// → ALL 50 requests take at least 500ms even though only one needed the file

// ❌ This is a production incident waiting to happen
app.get("/config", (req, res) => {
  const config = fs.readFileSync("./config.json", "utf8"); // blocks for ~50ms
  res.json(JSON.parse(config));
});

// ✅ Fix: async or cache at startup
// Option A: async read
app.get("/config", async (req, res) => {
  const config = await fs.promises.readFile("./config.json", "utf8");
  res.json(JSON.parse(config));
});

// Option B: cache at startup (best — file read happens once, not per request)
import config from "./config.json"; // static import — parsed once at startup
app.get("/config", (req, res) => {
  res.json(config); // instant — from memory
});`}</code>
      </pre>
      <p>
        <strong>When <code>readFileSync</code> IS acceptable:</strong> at startup, before the
        server begins accepting connections. Reading config files, loading TLS certs, seeding in-memory
        data. Once the event loop starts serving requests, all I/O must be async.
      </p>

      {/* ─── Q10 ─── */}
      <h2 id="async-io-vs-cpu">What is the difference between async I/O and CPU-bound work?</h2>
      <ArticleTable caption="This distinction determines whether Node.js is the right tool — and how to fix performance problems" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Async I/O</th>
              <th>CPU-bound work</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>What it is</strong></td>
              <td>Waiting for external systems — database, network, filesystem</td>
              <td>Executing computation — hashing, encoding, parsing, sorting</td>
            </tr>
            <tr>
              <td><strong>Where time is spent</strong></td>
              <td>Inside the OS or libuv — JS thread is FREE</td>
              <td>On the JS thread — event loop is BLOCKED</td>
            </tr>
            <tr>
              <td><strong>Node.js handles it</strong></td>
              <td>Natively — event loop is designed for this</td>
              <td>Poorly by default — needs Worker Threads or a separate process</td>
            </tr>
            <tr>
              <td><strong>Examples</strong></td>
              <td>DB query, HTTP call, file read, Redis get</td>
              <td>bcrypt hash, image resize, JSON.parse(5MB), zip compression</td>
            </tr>
            <tr>
              <td><strong>Scale with concurrency</strong></td>
              <td>Yes — 1000 simultaneous DB queries barely affect each other</td>
              <td>No — one CPU task blocks all other requests</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// I/O-bound: thread is free, scales fine
const [user, orders] = await Promise.all([
  db.user.findUnique({ where: { id } }),   // waiting on PostgreSQL — thread free
  db.order.findMany({ where: { userId: id } }), // waiting on PostgreSQL — thread free
]);

// CPU-bound: thread is busy, blocks everything else
const hash = crypto.pbkdf2Sync(password, salt, 200_000, 64, "sha256"); // 400ms CPU
// During those 400ms: NO other request can be processed

// Same operation done right: off the main thread
const hash = await promisify(crypto.pbkdf2)(password, salt, 200_000, 64, "sha256");
// libuv thread pool handles it — main thread free`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="cpu-intensive">How would you handle CPU-intensive tasks in Node.js?</h2>
      <pre>
        <code>{`// Strategy 1: Use async versions of built-in CPU APIs (easiest)
// Many Node.js built-ins have async variants that use the libuv thread pool
import { promisify } from "node:util";
import { pbkdf2, scrypt } from "node:crypto";

const hash = await promisify(pbkdf2)(password, salt, 100_000, 64, "sha512");
// libuv thread pool — main thread stays free

// Strategy 2: Worker Threads (for custom CPU-heavy JS)
// worker.js
import { parentPort, workerData } from "node:worker_threads";
const result = heavyCPUWork(workerData.input); // runs on its own core
parentPort.postMessage(result);

// main.ts
import { Worker } from "node:worker_threads";
function runWorker(input: unknown) {
  return new Promise((resolve, reject) => {
    const w = new Worker("./worker.js", { workerData: { input } });
    w.once("message", resolve);
    w.once("error", reject);
  });
}
app.post("/process", async (req, res) => {
  const result = await runWorker(req.body.data); // main thread free while worker runs
  res.json(result);
});

// Strategy 3: Use piscina (production worker pool — reuses workers)
import Piscina from "piscina";
const pool = new Piscina({ filename: "./worker.js", maxThreads: 4 });
app.post("/process", async (req, res) => {
  const result = await pool.run(req.body.data);
  res.json(result);
});

// Strategy 4: Separate microservice (best for very heavy or non-JS work)
// Route CPU work to a Python/Go/Rust service via HTTP or a queue
// Node.js stays as the orchestrator, not the compute engine`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="worker-threads">What are worker threads?</h2>
      <p>
        Worker threads are Node.js&apos;s mechanism for true multi-threaded JavaScript. Each
        worker runs in its own V8 isolate with its own event loop and heap — completely independent
        from the main thread. They communicate via message passing (<code>postMessage</code>) or
        shared memory (<code>SharedArrayBuffer</code>).
      </p>
      <MermaidDiagram
        chart={workerDiagram}
        title="Main Thread ↔ Worker Thread Communication"
        caption="Workers run CPU-heavy code on a separate core. The main thread stays free for HTTP requests. Communication is via messages (deep-cloned) or SharedArrayBuffer (zero-copy)."
        minHeight={360}
      />
      <pre>
        <code>{`// worker.ts — runs on a separate thread/core
import { parentPort, workerData } from "node:worker_threads";

// workerData: passed from main at worker creation (deep cloned)
const { numbers } = workerData as { numbers: number[] };

// CPU-heavy computation — doesn't block the main event loop
const result = numbers.reduce((sum, n) => sum + n ** 2, 0);

// Send result back to main thread
parentPort!.postMessage({ result });

// main.ts
import { Worker } from "node:worker_threads";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function computeInWorker(numbers: number[]): Promise<{ result: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolve(__dirname, "worker.js"), {
      workerData: { numbers },
    });
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(\`Worker exited: \${code}\`));
    });
  });
}

const { result } = await computeInWorker([1, 2, 3, 4, 5]);
// Main thread was never blocked during computation`}</code>
      </pre>
      <p>
        <strong>Important:</strong> Creating a worker has overhead (~30ms). Never create a worker
        per request — use a pool (e.g. <code>piscina</code>) that keeps workers warm and reuses
        them.
      </p>

      {/* ─── Q13 ─── */}
      <h2 id="cluster-module">What is the cluster module?</h2>
      <p>
        The cluster module lets you fork multiple Node.js processes that all share the same port.
        Each process has its own event loop and heap. The OS distributes incoming connections
        among them. This is how you use multiple CPU cores for handling HTTP requests.
      </p>
      <MermaidDiagram
        chart={clusterDiagram}
        title="Node.js Cluster: One Port, Multiple Processes"
        caption="The primary process forks N workers (one per CPU core). The OS load-balances connections. If a worker crashes, the primary restarts it."
        minHeight={460}
      />
      <pre>
        <code>{`import cluster from "node:cluster";
import { cpus } from "node:os";

if (cluster.isPrimary) {
  const numCPUs = cpus().length;
  console.log(\`Forking \${numCPUs} workers\`);

  for (let i = 0; i < numCPUs; i++) cluster.fork();

  // Auto-restart crashed workers
  cluster.on("exit", (worker, code) => {
    if (code !== 0) {
      console.error(\`Worker \${worker.process.pid} died — restarting\`);
      cluster.fork();
    }
  });
} else {
  // Each worker: full Express app, same port
  const app = express();
  app.listen(3000, () => {
    console.log(\`Worker \${process.pid} ready\`);
  });
}

// ⚠️ Critical implication: workers don't share memory
// Sessions, rate limit counters, caches → must live in Redis
// Any in-process state is per-worker — requests can hit different workers

// Alternative to manual clustering: PM2
// pm2 start server.js -i max  ← cluster mode, one worker per CPU`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="workers-vs-processes">When would you use worker threads vs multiple processes?</h2>
      <ArticleTable caption="The right tool depends on isolation needs and what you're computing" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Worker Threads</th>
              <th>Child Processes / Cluster</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Memory model</strong></td>
              <td>Separate heaps, but can share memory via <code>SharedArrayBuffer</code></td>
              <td>Fully separate — no shared memory at all</td>
            </tr>
            <tr>
              <td><strong>Isolation</strong></td>
              <td>Less isolated — a crash in a worker can destabilize the process</td>
              <td>Strong — a crashed child process doesn&apos;t affect the parent</td>
            </tr>
            <tr>
              <td><strong>Startup cost</strong></td>
              <td>Lower (~30ms per worker)</td>
              <td>Higher (~100-200ms — new OS process, new Node runtime)</td>
            </tr>
            <tr>
              <td><strong>Use for</strong></td>
              <td>CPU-heavy JS work within one service (image processing, parsing, compression)</td>
              <td>Multi-core request handling (cluster), external binaries (child_process), full isolation</td>
            </tr>
            <tr>
              <td><strong>Communication</strong></td>
              <td><code>postMessage</code> (copies) or <code>SharedArrayBuffer</code> (zero-copy)</td>
              <td>IPC (inter-process communication) — serialized messages via stdio or IPC channel</td>
            </tr>
            <tr>
              <td><strong>Example</strong></td>
              <td>Resize 10 images in parallel within your API service</td>
              <td>Run your API on all 8 CPU cores (cluster), or spawn FFmpeg (child_process)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// Worker Thread: CPU-heavy JS — stays inside your process
import Piscina from "piscina";
const imagePool = new Piscina({ filename: "./resize-worker.js", maxThreads: 4 });
const resized = await imagePool.run({ buffer: req.file.buffer, width: 800 });

// Child Process: run an external binary (FFmpeg, ImageMagick, Python script)
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const { stdout } = await exec("ffmpeg", ["-i", "input.mp4", "-vcodec", "h264", "output.mp4"]);

// Cluster: use all CPU cores for HTTP request handling
// → each request is handled by whichever worker is free
// → no sharing needed since each request is independent`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="fs-internally">How does Node.js handle file system operations internally?</h2>
      <MermaidDiagram
        chart={fsInternalDiagram}
        title="How fs.readFile Works Internally"
        caption="The JS thread registers the I/O request and immediately moves on. libuv assigns a thread pool thread to execute the blocking OS syscalls. When done, the result is queued as a callback on the main thread."
        minHeight={440}
      />
      <p>
        Unlike network I/O (TCP/HTTP), which uses the OS&apos;s native async mechanisms (epoll,
        kqueue, IOCP), <strong>file system operations go through libuv&apos;s thread pool</strong>.
        This is because true async file I/O is not uniformly available or reliable across all
        operating systems.
      </p>
      <pre>
        <code>{`// What fs.readFile actually does:
// 1. JS thread calls fs.readFile() — registers the operation and returns immediately
// 2. libuv picks an available thread from its pool (default 4 threads)
// 3. That thread executes blocking OS syscalls: open(), read(), close()
// 4. When done, libuv queues the callback on the main thread
// 5. Main thread picks it up in the Poll phase and runs your callback

// The thread pool bottleneck:
// Default pool size = 4 threads
// If 5 simultaneous fs.readFile() calls → 4 run, 1 queues

// Increase pool size for heavy file-I/O services:
process.env.UV_THREADPOOL_SIZE = "16"; // must be set before any I/O

// This also affects: crypto (pbkdf2, scrypt), dns.lookup(), zlib

// DNS lookup is particularly subtle:
import { lookup, resolve4 } from "node:dns";

// Uses thread pool (getaddrinfo blocking syscall) — can saturate pool:
lookup("api.example.com", callback);

// Uses libuv's async c-ares resolver — NO thread pool:
resolve4("api.example.com", callback); // preferred for high-concurrency DNS`}</code>
      </pre>
    </div>
  );
}
