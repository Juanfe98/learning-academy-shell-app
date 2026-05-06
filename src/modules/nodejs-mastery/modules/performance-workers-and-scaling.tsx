import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const concurrencyVsParallelism = String.raw`flowchart TD
    subgraph CONCURRENT["Concurrency (Node.js default)"]
        CT["One JS thread"]
        CT --> IO1["→ await DB query (idle, OS waits)"]
        CT --> IO2["→ await fetch (idle, OS waits)"]
        CT --> IO3["→ await fs.readFile (idle, libuv pool)"]
        IO1 & IO2 & IO3 --> CB["Callbacks resume on same thread"]
    end
    subgraph PARALLEL["Parallelism (Workers / Cluster)"]
        T1["Thread 1 (Worker)<br/>CPU task A"]
        T2["Thread 2 (Worker)<br/>CPU task B"]
        T3["Thread 3 (Worker)<br/>CPU task C"]
        T1 & T2 & T3 --> DONE["All complete simultaneously<br/>on separate CPU cores"]
    end`;

const workerPoolDiagram = String.raw`flowchart LR
    MAIN["Main thread<br/>Event loop"]
    POOL["Worker pool<br/>(reusable workers)"]
    W1["Worker 1<br/>idle"]
    W2["Worker 2<br/>busy"]
    W3["Worker 3<br/>idle"]

    MAIN -->|"task 1"| POOL
    MAIN -->|"task 2"| POOL
    POOL --> W1
    POOL --> W2
    POOL --> W3
    W1 & W3 -->|"result"| MAIN`;

const scalingMap = String.raw`flowchart LR
    LB["Load balancer<br/>(nginx / k8s)"] --> P1["Node process 1<br/>Event loop + workers"]
    LB --> P2["Node process 2<br/>Event loop + workers"]
    LB --> P3["Node process N<br/>Event loop + workers"]
    P1 --> R["Shared external state<br/>Redis / DB / queue"]
    P2 --> R
    P3 --> R`;

export const toc: TocItem[] = [
  { id: "concurrency-vs-parallelism", title: "Concurrency vs Parallelism", level: 2 },
  { id: "measure-first", title: "Measure Before Tuning", level: 2 },
  { id: "event-loop-lag", title: "Event Loop Lag", level: 2 },
  { id: "worker-threads", title: "Worker Threads", level: 2 },
  { id: "worker-basics", title: "Basic Worker Thread Usage", level: 3 },
  { id: "worker-pool", title: "Worker Pool Pattern", level: 3 },
  { id: "shared-memory", title: "SharedArrayBuffer & Atomics", level: 3 },
  { id: "child-processes", title: "Child Processes", level: 2 },
  { id: "cluster", title: "Cluster Module", level: 2 },
  { id: "horizontal-scaling", title: "Horizontal Scaling", level: 2 },
  { id: "threadpool-tuning", title: "libuv Thread Pool Tuning", level: 2 },
  { id: "strategy-table", title: "Which Strategy to Use", level: 2 },
  { id: "perf-checklist", title: "Performance Checklist", level: 2 },
];

export default function PerformanceWorkersAndScaling() {
  return (
    <div className="article-content">
      <p>
        Node performance work is less about magical flags and more about knowing what is saturated:
        CPU, memory, event loop responsiveness, DB pools, downstream APIs, or the network. Once you
        know the bottleneck, the right scaling move becomes much clearer. This module covers the
        concurrency model, worker strategies, and the tools to diagnose each.
      </p>

      <h2 id="concurrency-vs-parallelism">Concurrency vs Parallelism</h2>
      <p>
        These two terms are often conflated, but they describe fundamentally different things — and
        mixing them up leads to wrong architectural decisions.
      </p>
      <p>
        <strong>Concurrency</strong> is about <em>dealing with</em> multiple things at once. Node.js
        is concurrent by default: one JS thread can have thousands of in-flight I/O operations
        because it hands the waiting off to the OS and libuv. The thread stays free to pick up
        whichever callback resolves next. No CPU cores are added. No threads multiply.
      </p>
      <p>
        <strong>Parallelism</strong> is about <em>doing</em> multiple things at once — on separate
        CPU cores simultaneously. JavaScript running in a Worker Thread is truly parallel with the
        main thread. Three Worker Threads can execute three CPU-heavy functions at the same time,
        one per core.
      </p>

      <MermaidDiagram
        chart={concurrencyVsParallelism}
        title="Concurrency vs Parallelism in Node.js"
        caption="Concurrency (left): one thread manages many I/O operations by letting the OS wait. Parallelism (right): multiple threads execute CPU work simultaneously on separate cores."
        minHeight={480}
      />

      <ArticleTable
        caption="The right question: Is the bottleneck waiting on I/O (concurrency fixes it) or burning CPU (parallelism fixes it)?"
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Problem type</th>
              <th>Solution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>High-volume API with many DB queries</td>
              <td>I/O-bound (concurrency)</td>
              <td>Node.js event loop handles this natively — tune DB pool size</td>
            </tr>
            <tr>
              <td>JSON serialization of 50 MB responses</td>
              <td>CPU-bound (parallelism)</td>
              <td>Worker Thread or dedicated serialization service</td>
            </tr>
            <tr>
              <td>Image resizing per upload</td>
              <td>CPU-bound (parallelism)</td>
              <td>Worker Thread pool or separate worker process</td>
            </tr>
            <tr>
              <td>Realtime WebSocket server</td>
              <td>I/O-bound (concurrency)</td>
              <td>Event loop excels — no workers needed unless emitting CPU-heavy events</td>
            </tr>
            <tr>
              <td>CPU-heavy regex on every request</td>
              <td>CPU-bound (parallelism)</td>
              <td>Offload to Worker Thread or rewrite the regex</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="measure-first">Measure Before Tuning</h2>
      <p>
        Start with latency percentiles, throughput, heap usage, CPU, GC behavior, and event loop
        lag. A fast average latency can still hide a terrible p99. A low CPU service can still be
        slow because it is queueing on the database pool. Tuning without measurements is folklore.
      </p>

      <pre>
        <code>{`// Heap and process stats
import { memoryUsage, cpuUsage } from "node:process";

setInterval(() => {
  const { heapUsed, heapTotal, rss } = memoryUsage();
  const cpu = cpuUsage(); // { user, system } in microseconds
  console.log({
    heapUsedMB: Math.round(heapUsed / 1e6),
    heapTotalMB: Math.round(heapTotal / 1e6),
    rssMB: Math.round(rss / 1e6),
    cpuUserMs: Math.round(cpu.user / 1000),
  });
}, 10_000);`}</code>
      </pre>

      <h2 id="event-loop-lag">Event Loop Lag</h2>
      <p>
        Event loop lag is the delay between when a callback should run and when it actually gets CPU
        time. It is one of the cleanest signals that your main thread is overloaded with synchronous
        work or stalled by huge microtask chains. A p99 lag above 100ms means requests are
        visibly queueing.
      </p>

      <pre>
        <code>{`import { monitorEventLoopDelay } from "node:perf_hooks";

const histogram = monitorEventLoopDelay({ resolution: 20 }); // sample every 20ms
histogram.enable();

setInterval(() => {
  const p50 = histogram.percentile(50) / 1e6;   // ns → ms
  const p99 = histogram.percentile(99) / 1e6;
  const max = histogram.max / 1e6;
  console.log({ eventLoopLag: { p50, p99, max } });
  histogram.reset();
}, 5_000);

// Ship this metric to Datadog / Prometheus in production
// Alert when p99 > 100ms — that's when users start noticing`}</code>
      </pre>

      <h2 id="worker-threads">Worker Threads</h2>
      <p>
        Worker Threads are Node&apos;s mechanism for true parallelism within one process. Each worker
        runs in its own V8 isolate with its own event loop and heap. Workers communicate with the
        main thread via message passing (<code>postMessage</code>) or shared memory (
        <code>SharedArrayBuffer</code>). They are the right tool for CPU-bound JavaScript work.
      </p>
      <p>
        Workers are <strong>not</strong> lightweight goroutines — each has a meaningful startup
        cost (new V8 isolate, new heap). Spin them up once at startup, not per request.
      </p>

      <h3 id="worker-basics">Basic Worker Thread Usage</h3>
      <pre>
        <code>{`// worker.ts — runs on a separate thread
import { parentPort, workerData } from "node:worker_threads";

// workerData: data passed from main at creation time (deep cloned)
const { numbers } = workerData as { numbers: number[] };

// CPU-bound work — runs on its own core, doesn't block the main event loop
const sum = numbers.reduce((acc, n) => acc + n, 0);
const mean = sum / numbers.length;
const stdDev = Math.sqrt(
  numbers.reduce((acc, n) => acc + (n - mean) ** 2, 0) / numbers.length
);

// Send result back to main thread
parentPort!.postMessage({ sum, mean, stdDev });`}</code>
      </pre>

      <pre>
        <code>{`// main.ts — spawns the worker
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function runStats(numbers: number[]): Promise<{ sum: number; mean: number; stdDev: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolve(__dirname, "worker.js"), {
      workerData: { numbers }, // deep cloned — no shared ref
    });

    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(\`Worker exited with code \${code}\`));
    });
  });
}

// Main thread stays unblocked while worker crunches
const stats = await runStats(Array.from({ length: 1_000_000 }, (_, i) => i));
console.log(stats); // { sum: ..., mean: ..., stdDev: ... }`}</code>
      </pre>

      <h3 id="worker-pool">Worker Pool Pattern</h3>
      <p>
        Creating a new Worker per request is expensive. In production, maintain a pool of reusable
        workers. Use a third-party library like <code>workerpool</code> or <code>piscina</code> for
        production-ready pools. Here is the mental model behind the pattern:
      </p>

      <MermaidDiagram
        chart={workerPoolDiagram}
        title="Worker Pool Architecture"
        caption="The main thread queues tasks into the pool. Idle workers pick them up. Results are posted back. The pool avoids worker startup overhead per task."
        minHeight={360}
      />

      <pre>
        <code>{`// Using piscina — production-ready worker pool
import Piscina from "piscina";
import { resolve } from "node:path";

const pool = new Piscina({
  filename: resolve("./worker.js"),
  minThreads: 2,    // always-warm threads
  maxThreads: os.cpus().length - 1, // leave one core for the event loop
  idleTimeout: 30_000, // retire idle threads after 30s
});

// Calling the pool returns a Promise — main thread never blocks
app.post("/compute", async (req, res) => {
  try {
    const result = await pool.run({ numbers: req.body.data });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Computation failed" });
  }
});`}</code>
      </pre>

      <h3 id="shared-memory">SharedArrayBuffer & Atomics</h3>
      <p>
        Worker threads normally communicate by copying data (structured clone). For high-frequency
        updates or large binary data, copying is too expensive. <code>SharedArrayBuffer</code> lets
        threads share raw memory. <code>Atomics</code> provides thread-safe read-modify-write
        operations on that memory.
      </p>

      <pre>
        <code>{`// main.ts — shared counter example
import { Worker } from "node:worker_threads";

// Allocate shared memory: 4 bytes for a 32-bit integer
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);

// Spawn two workers that both increment the counter
const w1 = new Worker("./increment-worker.js", { workerData: { sharedBuffer, iterations: 1000 } });
const w2 = new Worker("./increment-worker.js", { workerData: { sharedBuffer, iterations: 1000 } });

await Promise.all([
  new Promise((r) => w1.once("exit", r)),
  new Promise((r) => w2.once("exit", r)),
]);

// Result is 2000 — no race conditions because workers used Atomics
console.log(Atomics.load(counter, 0)); // 2000`}</code>
      </pre>

      <pre>
        <code>{`// increment-worker.js
import { workerData } from "node:worker_threads";

const { sharedBuffer, iterations } = workerData;
const counter = new Int32Array(sharedBuffer);

for (let i = 0; i < iterations; i++) {
  // Atomics.add is atomic — thread-safe increment
  // Without Atomics: two threads could read same value, both add 1, both write same result
  Atomics.add(counter, 0, 1);
}
// worker exits — main thread will see Atomics.load(counter, 0) === correct value`}</code>
      </pre>

      <p>
        When to use <code>SharedArrayBuffer</code>: streaming large binary data between threads
        without copying (video frames, sensor data), implementing shared ring buffers, or very
        high-frequency stat updates. For most use cases, message passing with{" "}
        <code>postMessage</code> and structured clone is simpler and safe enough.
      </p>

      <h2 id="child-processes">Child Processes</h2>
      <p>
        Child processes run in fully separate Node.js processes — separate heap, separate event
        loop, separate address space. Communication goes through IPC or stdio. Use child processes
        when you need true process isolation, need to execute a non-JS binary, or need to protect
        the parent from potential crashes.
      </p>

      <pre>
        <code>{`import { fork, execFile, spawn } from "node:child_process";

// fork: spawns another Node.js script, sets up IPC channel automatically
const child = fork("./worker-process.js");
child.send({ type: "compute", data: [1, 2, 3] }); // via IPC
child.on("message", (result) => console.log("Result:", result));
child.on("exit", (code) => console.log("Exited:", code));

// execFile: run an external binary, buffer all output
execFile("ffmpeg", ["-i", "input.mp4", "output.webm"], (err, stdout, stderr) => {
  if (err) throw err;
  console.log("done");
});

// spawn: streaming output — better for long-running or large-output commands
const proc = spawn("cat", ["large-file.log"]);
proc.stdout.pipe(res); // stream output directly to HTTP response`}</code>
      </pre>

      <h2 id="cluster">Cluster Module</h2>
      <p>
        One Node.js process uses one main JavaScript thread — so it can only max out one CPU core.
        The cluster module forks multiple worker processes that all listen on the same port. The OS
        distributes incoming connections among them. This is the simplest way to use all CPU cores
        for request handling without a separate process manager.
      </p>

      <pre>
        <code>{`import cluster from "node:cluster";
import { cpus } from "node:os";
import process from "node:process";

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(\`Primary \${process.pid} forking \${numCPUs} workers\`);

  // Fork one worker per CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart workers that crash
  cluster.on("exit", (worker, code) => {
    if (code !== 0) {
      console.warn(\`Worker \${worker.process.pid} died with code \${code} — restarting\`);
      cluster.fork();
    }
  });
} else {
  // Each worker runs a full Express server on the same port
  // The OS load-balances connections between workers
  const app = express();
  app.use(express.json());
  app.get("/", (_req, res) => {
    res.json({ pid: process.pid, cpus: numCPUs });
  });

  const server = app.listen(3000, () => {
    console.log(\`Worker \${process.pid} listening on :3000\`);
  });

  // Graceful shutdown: stop accepting new connections before exiting
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}`}</code>
      </pre>

      <p>
        Cluster limitations: workers do not share memory, so session state, in-process caches, and
        rate-limit counters must live in external systems (Redis). PM2 is a popular production
        process manager that wraps this pattern and adds zero-downtime reload:{" "}
        <code>pm2 start server.js -i max</code>.
      </p>

      <h2 id="horizontal-scaling">Horizontal Scaling</h2>
      <MermaidDiagram
        chart={scalingMap}
        title="Horizontal Scaling Architecture"
        caption="Multiple Node processes (containers or VMs) behind a load balancer. All shared state lives externally — never in process memory."
        minHeight={420}
      />

      <p>
        The golden rule of horizontal scaling: <strong>nothing important lives only in process
        memory</strong>. Sessions, caches, rate-limit counters, and queues need an external home
        (Redis, Postgres, a message broker). Any replica that cannot see the same state will
        produce inconsistent behavior.
      </p>

      <h2 id="threadpool-tuning">libuv Thread Pool Tuning</h2>
      <p>
        As covered in the Runtime Architecture module, libuv&apos;s default thread pool has 4
        threads. This is a frequent hidden bottleneck in apps doing heavy{" "}
        <code>fs</code>, <code>crypto</code>, or <code>zlib</code> work — all of which go through
        the pool.
      </p>

      <pre>
        <code>{`// Diagnose pool saturation: time a known-pool operation under load
// If fs.readFile latency spikes with concurrency, the pool is saturated

// Increase pool size (must be set before any libuv call — do it at top of entry file)
process.env.UV_THREADPOOL_SIZE = String(require("os").cpus().length);
// or in shell: UV_THREADPOOL_SIZE=16 node server.js

// Prefer dns.resolve() over dns.lookup() to skip the pool:
import { resolve4 } from "node:dns/promises";
const [ip] = await resolve4("api.example.com"); // uses c-ares, not getaddrinfo

// Use crypto.subtle (Web Crypto API) for operations that may bypass the pool:
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"]
);`}</code>
      </pre>

      <h2 id="strategy-table">Which Strategy to Use</h2>
      <ArticleTable
        caption="Choose based on the problem: CPU-bound vs I/O-bound, isolation requirements, and operational complexity tolerance."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Best for</th>
              <th>Memory model</th>
              <th>Startup cost</th>
              <th>Tradeoff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Event loop (default)</td>
              <td>I/O-bound concurrency</td>
              <td>Shared heap</td>
              <td>None</td>
              <td>Blocked by any CPU-intensive sync work</td>
            </tr>
            <tr>
              <td>Worker Threads</td>
              <td>CPU-bound JS work in one service</td>
              <td>Separate heap + optional SharedArrayBuffer</td>
              <td>Medium (~30ms per worker)</td>
              <td>Coordination overhead; pool to amortize startup</td>
            </tr>
            <tr>
              <td>Child processes</td>
              <td>Process isolation, external binaries</td>
              <td>Fully separate process address space</td>
              <td>High (new Node.js runtime)</td>
              <td>IPC cost; stronger crash isolation</td>
            </tr>
            <tr>
              <td>Cluster</td>
              <td>Multi-core request handling</td>
              <td>Separate processes, external state required</td>
              <td>High (N new processes)</td>
              <td>No shared in-process state — must use Redis etc.</td>
            </tr>
            <tr>
              <td>Separate queue worker service</td>
              <td>Long-running or bursty background jobs</td>
              <td>Fully separate deployment</td>
              <td>Operational overhead</td>
              <td>Architecturally cleanest at scale; independent deploys</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="perf-checklist">Performance Checklist</h2>
      <ul>
        <li>
          <strong>Profile first</strong> — flamegraphs (<code>clinic flame</code>,{" "}
          <code>--prof</code>) before changing code. Know the actual bottleneck.
        </li>
        <li>
          <strong>Remove synchronous CPU work from request handlers</strong> — JSON.parse of huge
          payloads, regex with catastrophic backtracking, bcrypt on the main thread.
        </li>
        <li>
          <strong>Batch independent I/O with <code>Promise.all()</code></strong> — and cap
          concurrency with <code>p-limit</code> to protect downstream systems.
        </li>
        <li>
          <strong>Stream large payloads</strong> — avoid buffering full request/response bodies
          when size is unbounded.
        </li>
        <li>
          <strong>Monitor event loop lag p99</strong> — alert at 100ms. Anything above 200ms is
          visible to users.
        </li>
        <li>
          <strong>Size libuv thread pool</strong> — if using heavy <code>fs</code>/<code>crypto</code>/
          <code>zlib</code>, set <code>UV_THREADPOOL_SIZE</code> to match concurrency needs.
        </li>
        <li>
          <strong>Use a Worker pool for CPU tasks</strong> — <code>piscina</code> for production;
          pre-warm at startup, not per request.
        </li>
        <li>
          <strong>Keep process-local state disposable</strong> — so horizontal scaling stays easy
          and deploys don&apos;t drain sessions.
        </li>
        <li>
          <strong>Tune cluster/container count to <code>os.cpus().length - 1</code></strong> — one
          core reserved for OS and I/O work.
        </li>
      </ul>

      <InterviewPlaybook
        title="How to answer: 'How do you scale a Node.js service?'"
        intro="Interviewers want to see you distinguish the problem types before naming solutions."
        steps={[
          "Distinguish I/O-bound from CPU-bound first. I/O-bound services scale naturally with Node's event loop — the problem is usually connection pool limits, not Node itself.",
          "For CPU-bound work: Worker Threads for in-process parallelism, a separate worker service for architectural clarity at scale.",
          "For multi-core utilization of request handling: Cluster module or container replicas (PM2, Kubernetes). Either way, shared state moves to Redis.",
          "Name the observability signals you'd watch: event loop lag p99, heap growth rate, libuv thread pool saturation (measured by timing fs/crypto operations under concurrency), and downstream latency.",
          "Close with: 'The first step is always profiling — I wouldn't tune worker thread counts or pool sizes without a flamegraph showing where time is actually going.'",
        ]}
      />
    </div>
  );
}
