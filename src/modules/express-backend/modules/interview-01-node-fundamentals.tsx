import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const runtimeStackDiagram = String.raw`flowchart TD
    YOU["Your JavaScript Code"]
    V8["V8 Engine\nParses + compiles + executes JS\nManages memory (GC)"]
    NODECORE["Node.js Core APIs\nfs · http · net · crypto · timers · stream"]
    LIBUV["libuv\nEvent loop + async I/O + thread pool"]
    OS["Operating System\nLinux · macOS · Windows\nepoll · kqueue · IOCP"]

    YOU --> V8 --> NODECORE --> LIBUV --> OS`;

const concurrencyDiagram = String.raw`sequenceDiagram
    participant EL as Event Loop (1 thread)
    participant OS as OS / libuv
    participant DB as Database

    Note over EL: Request A arrives
    EL->>OS: fs.readFile() → hand off, don't wait
    Note over EL: Request B arrives (thread is FREE)
    EL->>DB: db.query() → hand off, don't wait
    Note over EL: Request C arrives (thread is FREE)
    OS-->>EL: file ready → callback queued
    DB-->>EL: rows ready → callback queued
    Note over EL: Process A's callback
    Note over EL: Process B's callback`;

const parallelismDiagram = String.raw`flowchart LR
    subgraph CONCURRENT["Concurrency — Node.js default"]
        T1["1 JS Thread"]
        T1 --> IO1["await DB query\n(OS waits, thread FREE)"]
        T1 --> IO2["await fetch\n(OS waits, thread FREE)"]
        T1 --> IO3["await readFile\n(pool waits, thread FREE)"]
    end
    subgraph PARALLEL["Parallelism — Worker Threads"]
        W1["Worker 1\nCPU task"]
        W2["Worker 2\nCPU task"]
        W3["Worker 3\nCPU task"]
    end`;

const v8Pipeline = String.raw`flowchart LR
    SRC["JS Source\nfunction add(a,b)"]
    AST["AST\nAbstract Syntax Tree"]
    BC["Bytecode\nIgnition interpreter\n(runs immediately)"]
    JIT["Optimized Machine Code\nTurboFan JIT\n(hot functions)"]
    DEOPT["Deoptimize\nback to bytecode\n(if type assumptions fail)"]

    SRC --> AST --> BC -->|"called many times"| JIT
    JIT -->|"unexpected type"| DEOPT --> BC`;

export const toc: TocItem[] = [
  { id: "what-is-nodejs", title: "What is Node.js?", level: 2 },
  { id: "why-nodejs", title: "Why choose Node.js?", level: 2 },
  { id: "single-threaded", title: "Is Node.js single-threaded?", level: 2 },
  { id: "concurrent-requests", title: "How does it handle concurrent requests?", level: 2 },
  { id: "libuv", title: "What is libuv?", level: 2 },
  { id: "concurrency-vs-parallelism", title: "Concurrency vs Parallelism", level: 2 },
  { id: "good-fit", title: "Good fit for Node.js", level: 2 },
  { id: "bad-fit", title: "Not a good fit for Node.js", level: 2 },
  { id: "node-vs-browser", title: "Node.js vs Browser JavaScript", level: 2 },
  { id: "v8-role", title: "Role of the V8 Engine", level: 2 },
  { id: "global-process-window", title: "global vs process vs window", level: 2 },
  { id: "process-env", title: "What is process.env?", level: 2 },
  { id: "deps-devdeps", title: "dependencies vs devDependencies", level: 2 },
  { id: "cjs-esm", title: "CommonJS vs ES Modules", level: 2 },
  { id: "env-config", title: "Config across environments", level: 2 },
];

export default function InterviewNodeFundamentals() {
  return (
    <div className="article-content">
      <p>
        Section 1 of 18 — Node.js fundamentals questions you <strong>will</strong> get asked in
        any backend interview. Read the question, form your answer, then read the explanation.
        Focus on being able to explain each answer conversationally — not reciting a definition.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="what-is-nodejs">What is Node.js?</h2>
      <p>
        Node.js is a <strong>JavaScript runtime</strong> — it lets you run JavaScript outside the
        browser, on a server or your local machine. It is built on three layers:
      </p>
      <MermaidDiagram
        chart={runtimeStackDiagram}
        title="What Node.js is made of"
        caption="Your code runs on V8. Node.js adds server APIs (fs, http, crypto). libuv handles async I/O. The OS does the actual work."
        minHeight={440}
      />
      <p>
        <strong>One-sentence interview answer:</strong> &quot;Node.js is a JavaScript runtime
        built on Chrome&apos;s V8 engine that uses an event-driven, non-blocking I/O model,
        making it well-suited for building scalable network applications.&quot;
      </p>

      {/* ─── Q2 ─── */}
      <h2 id="why-nodejs">Why would you choose Node.js for a backend service?</h2>
      <ArticleTable caption="Node.js strengths for backend development" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Reason</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Non-blocking I/O by default</td>
              <td>Handles thousands of concurrent connections on a single thread — ideal for APIs and gateways</td>
            </tr>
            <tr>
              <td>JavaScript everywhere</td>
              <td>Same language on frontend and backend — shared types, shared validation, smaller context switch</td>
            </tr>
            <tr>
              <td>Massive npm ecosystem</td>
              <td>Best-in-class HTTP, auth, DB, queue, and observability libraries</td>
            </tr>
            <tr>
              <td>JSON native</td>
              <td>No serialization friction — JS objects map directly to JSON payloads</td>
            </tr>
            <tr>
              <td>Fast startup time</td>
              <td>Great for serverless / containers that spin up and down frequently</td>
            </tr>
            <tr>
              <td>Large talent pool</td>
              <td>JavaScript is the most widely known language — easier to hire</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>When NOT to choose it:</strong> CPU-heavy work (ML, video encoding, heavy math).
        Those workloads block the event loop and hurt every other request. See questions 7 and 8.
      </p>

      {/* ─── Q3 ─── */}
      <h2 id="single-threaded">Is Node.js single-threaded?</h2>
      <p>
        <strong>Partially yes.</strong> Your JavaScript code executes on a single thread — the
        main event loop thread. Only one piece of your JS runs at a time. But Node.js as a whole
        is <em>not</em> single-threaded: libuv manages a thread pool (default 4 threads) for
        operations that can&apos;t be done with non-blocking OS primitives, like file system
        reads, crypto hashing, and DNS lookups.
      </p>
      <pre>
        <code>{`// This runs on the main JS thread — blocks everything
const data = fs.readFileSync("big-file.txt"); // ← synchronous, blocks the event loop

// This delegates to libuv's thread pool — main thread stays free
fs.readFile("big-file.txt", (err, data) => {
  // callback runs on main thread when file is ready
});

// Or with promises:
const data = await fs.promises.readFile("big-file.txt"); // non-blocking`}</code>
      </pre>
      <p>
        <strong>Interview framing:</strong> &quot;Node.js has one JavaScript thread, but the
        underlying platform is multi-threaded — libuv offloads blocking operations to a pool and
        notifies the event loop when they complete.&quot;
      </p>

      {/* ─── Q4 ─── */}
      <h2 id="concurrent-requests">If Node.js is single-threaded, how can it handle many concurrent requests?</h2>
      <p>
        Because &quot;handling&quot; a request is mostly <strong>waiting</strong>. Waiting for
        the database to respond. Waiting for a network call. Waiting for a file read. Node.js
        delegates all that waiting to the OS and libuv — the JS thread is free to pick up the
        next request while dozens of other requests are in-flight waiting for I/O.
      </p>
      <MermaidDiagram
        chart={concurrencyDiagram}
        title="How one thread handles multiple concurrent requests"
        caption="The event loop never waits. It hands I/O off to the OS, processes the next request, and resumes each previous request when its I/O completes."
        minHeight={440}
      />
      <pre>
        <code>{`// Express handles 3 concurrent requests — all in-flight at once
// The JS thread is NOT blocked on any of them

app.get("/user/:id", async (req, res) => {
  // ← thread free while waiting for DB
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  // ← thread resumes here when DB responds
  res.json(user);
});

// If 100 requests arrive simultaneously:
// - 100 db queries fire at once (if DB pool allows)
// - The JS thread is only busy when processing each response
// - Total time ≈ slowest DB query, not 100 × query time`}</code>
      </pre>
      <p>
        <strong>The catch:</strong> this only works for I/O-bound work. A synchronous CPU loop
        (e.g. bcrypt with many rounds, huge JSON parse) blocks the thread and all 100 requests
        wait behind it.
      </p>

      {/* ─── Q5 ─── */}
      <h2 id="libuv">What is libuv?</h2>
      <p>
        libuv is the C library that gives Node.js its async superpowers. It provides:
      </p>
      <ul>
        <li>
          <strong>The event loop</strong> — the core loop that picks up ready callbacks and runs
          them on the JS thread.
        </li>
        <li>
          <strong>Async I/O abstraction</strong> — uses <code>epoll</code> on Linux,{" "}
          <code>kqueue</code> on macOS, <code>IOCP</code> on Windows. You write one Node.js API;
          libuv maps it to the right OS primitive.
        </li>
        <li>
          <strong>Thread pool</strong> — 4 threads by default (configurable via{" "}
          <code>UV_THREADPOOL_SIZE</code>) for operations that can&apos;t use kernel async
          I/O: <code>fs</code>, <code>crypto</code>, <code>dns.lookup</code>, <code>zlib</code>.
        </li>
      </ul>
      <pre>
        <code>{`// libuv thread pool in action — these all use the pool:
import fs from "node:fs/promises";
import { pbkdf2 } from "node:crypto";
import { promisify } from "node:util";

// File reads → libuv thread pool
const file = await fs.readFile("data.json");

// Crypto hashing → libuv thread pool (CPU-heavy)
const hash = await promisify(pbkdf2)("password", "salt", 100_000, 64, "sha256");

// If you fire 10 crypto operations simultaneously with pool size 4:
// → 4 run, 6 queue and wait. This is a common hidden bottleneck.
process.env.UV_THREADPOOL_SIZE = "16"; // increase before any I/O calls`}</code>
      </pre>

      {/* ─── Q6 ─── */}
      <h2 id="concurrency-vs-parallelism">What is the difference between concurrency and parallelism in Node.js?</h2>
      <MermaidDiagram
        chart={parallelismDiagram}
        title="Concurrency vs Parallelism"
        caption="Concurrency: one thread, many in-flight I/O operations. Parallelism: multiple threads/cores executing CPU work simultaneously."
        minHeight={340}
      />
      <ArticleTable caption="The key difference that interviewers want to hear" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Concurrency</th>
              <th>Parallelism</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Definition</strong></td>
              <td>Dealing with many things at once (interleaving)</td>
              <td>Doing many things at once (simultaneous)</td>
            </tr>
            <tr>
              <td><strong>Threads needed</strong></td>
              <td>1 (the event loop)</td>
              <td>Multiple (Worker Threads / processes)</td>
            </tr>
            <tr>
              <td><strong>Best for</strong></td>
              <td>I/O-bound work: DB queries, HTTP calls, file reads</td>
              <td>CPU-bound work: image processing, crypto, ML</td>
            </tr>
            <tr>
              <td><strong>Node.js default</strong></td>
              <td>Yes — event loop is concurrent by nature</td>
              <td>No — requires <code>worker_threads</code> or <code>cluster</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// Concurrency: 3 DB queries fire simultaneously — one thread, 3 in-flight
const [users, orders, settings] = await Promise.all([
  db.user.findMany(),     // I/O — thread free
  db.order.findMany(),    // I/O — thread free
  db.setting.findMany(),  // I/O — thread free
]);
// Total time ≈ slowest query (parallel I/O), not sum of all 3

// Parallelism: CPU work on separate cores via Worker Threads
import { Worker } from "node:worker_threads";
// Worker 1 encodes video on core 1
// Worker 2 encodes video on core 2
// Both run truly simultaneously`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="good-fit">What kind of applications are a good fit for Node.js?</h2>
      <ArticleTable caption="Node.js excels at I/O-bound, high-concurrency workloads" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Application type</th>
              <th>Why Node.js fits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>REST and GraphQL APIs</td>
              <td>Mostly waiting on DB/network — event loop thrives, fast iteration</td>
            </tr>
            <tr>
              <td>Realtime apps (chat, presence, notifications)</td>
              <td>Long-lived WebSocket connections are native to the event model</td>
            </tr>
            <tr>
              <td>API gateways / BFF (Backend for Frontend)</td>
              <td>Fan-out to multiple services, aggregate, transform — pure I/O orchestration</td>
            </tr>
            <tr>
              <td>Microservices</td>
              <td>Lightweight, fast startup, great for containers and serverless</td>
            </tr>
            <tr>
              <td>Server-side rendering (Next.js, Remix)</td>
              <td>Rendering + DB calls — I/O-bound, strong Node.js ecosystem</td>
            </tr>
            <tr>
              <td>Queue workers / job processors</td>
              <td>Orchestrate async jobs, call downstream services — I/O coordination</td>
            </tr>
            <tr>
              <td>CLI tools and build scripts</td>
              <td>Familiar language, huge ecosystem, fast execution</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q8 ─── */}
      <h2 id="bad-fit">What kind of applications are not a good fit for Node.js?</h2>
      <ArticleTable caption="CPU-bound workloads fight against the single-threaded model" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Application type</th>
              <th>Why Node.js struggles</th>
              <th>Better alternative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Video / audio encoding</td>
              <td>CPU-saturating — blocks event loop, starves all requests</td>
              <td>FFmpeg as child process, or Go/Rust service</td>
            </tr>
            <tr>
              <td>Machine learning / inference</td>
              <td>Matrix operations need native BLAS/CUDA — Python wins here</td>
              <td>Python (PyTorch, TensorFlow)</td>
            </tr>
            <tr>
              <td>Scientific computing / simulations</td>
              <td>Tight numerical loops are slow in V8 vs compiled languages</td>
              <td>Python (NumPy), Fortran, C++</td>
            </tr>
            <tr>
              <td>High-throughput binary protocol servers</td>
              <td>GC pauses and single-thread limits hurt raw throughput</td>
              <td>Go, Rust</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Nuance interviewers appreciate:</strong> you can do CPU work in Node.js using
        Worker Threads — but if most of your app is CPU-bound, you are fighting the runtime.
        Choose Node.js when I/O is the bottleneck.
      </p>

      {/* ─── Q9 ─── */}
      <h2 id="node-vs-browser">What is the difference between Node.js and JavaScript in the browser?</h2>
      <ArticleTable caption="Same language, completely different runtime environments" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Browser</th>
              <th>Node.js</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Global object</td>
              <td><code>window</code></td>
              <td><code>global</code> (or <code>globalThis</code> in both)</td>
            </tr>
            <tr>
              <td>DOM / Web APIs</td>
              <td>Yes — <code>document</code>, <code>fetch</code>, <code>localStorage</code></td>
              <td>No — but <code>fetch</code> added in Node 18+</td>
            </tr>
            <tr>
              <td>File system access</td>
              <td>Restricted (sandboxed)</td>
              <td>Full access via <code>fs</code> module</td>
            </tr>
            <tr>
              <td>Network</td>
              <td>Subject to CORS — browser enforces origin policy</td>
              <td>No CORS — it IS the server</td>
            </tr>
            <tr>
              <td>Modules</td>
              <td>ES Modules (native in modern browsers)</td>
              <td>CommonJS (default) or ES Modules (<code>"type": "module"</code>)</td>
            </tr>
            <tr>
              <td>Process control</td>
              <td>None</td>
              <td><code>process.exit()</code>, <code>process.env</code>, signals</td>
            </tr>
            <tr>
              <td>Security context</td>
              <td>Sandboxed — can&apos;t access OS</td>
              <td>Full OS access — must secure your own app</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q10 ─── */}
      <h2 id="v8-role">What is the role of the V8 engine?</h2>
      <p>
        V8 is Google&apos;s JavaScript engine — originally built for Chrome, now also powering
        Node.js. Its job is to take your JavaScript source code and <strong>execute it as fast
        as possible</strong> on the CPU.
      </p>
      <MermaidDiagram
        chart={v8Pipeline}
        title="V8 Compilation Pipeline"
        caption="V8 starts fast with bytecode (Ignition), then compiles hot functions to native machine code (TurboFan). If type assumptions break, it deoptimizes back to bytecode."
        minHeight={320}
      />
      <ul>
        <li>
          <strong>Parsing:</strong> Converts JS source → AST (Abstract Syntax Tree)
        </li>
        <li>
          <strong>Ignition (interpreter):</strong> Compiles AST → bytecode and executes it
          immediately. Startup is fast even for large files.
        </li>
        <li>
          <strong>TurboFan (JIT compiler):</strong> Detects &quot;hot&quot; functions (called
          many times) and compiles them to optimized native machine code. Can be as fast as C.
        </li>
        <li>
          <strong>Garbage collector:</strong> Manages JS heap memory — frees objects no longer
          referenced. Uses generational GC (fast scavenges for short-lived objects, slower
          mark-sweep for long-lived ones).
        </li>
      </ul>
      <pre>
        <code>{`// V8 optimization tip: keep object shapes consistent
// V8 assigns "hidden classes" to objects. Same shape = faster property access.

// Good: all objects have the same shape
const p1 = { x: 1, y: 2 };
const p2 = { x: 3, y: 4 }; // same hidden class → fast

// Bad: different shapes → V8 can't optimize property access
const users = [];
users.push({ id: 1, name: "Alice" });
users.push({ id: 2, name: "Bob", role: "admin" }); // different shape → slow`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="global-process-window">What is the difference between global, process, and window?</h2>
      <pre>
        <code>{`// window — browser only
// The global object in browsers. Holds: document, fetch, localStorage, setTimeout, etc.
// Does NOT exist in Node.js (accessing window throws ReferenceError)

// global — Node.js only
// The global object in Node.js. Like window but for the server.
global.myVar = 42; // accessible from any file (avoid — use module exports instead)
console.log(global.process === process); // true — process lives on global

// process — Node.js only (a property of global)
// Gives you information and control over the current Node.js process
process.env.PORT;           // environment variables
process.argv;               // command-line arguments: ['node', 'server.js', '--port', '3000']
process.pid;                // process ID (useful for logging in cluster mode)
process.exit(0);            // exit cleanly (0 = success, 1 = error)
process.uptime();           // seconds since process started
process.memoryUsage();      // heap usage stats
process.on("SIGTERM", fn);  // handle OS signals (graceful shutdown)
process.nextTick(fn);       // schedule a microtask (runs before I/O)
process.cwd();              // current working directory

// globalThis — works in BOTH browser and Node.js
// The universal way to reference the global object
globalThis === window; // true in browser
globalThis === global; // true in Node.js`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="process-env">What is process.env used for?</h2>
      <p>
        <code>process.env</code> is an object containing all environment variables available to
        the current process. It is the standard way to inject configuration into a Node.js
        app without hardcoding values in source code.
      </p>
      <pre>
        <code>{`// process.env in practice
const port = process.env.PORT ?? "3000";
const dbUrl = process.env.DATABASE_URL; // throws if undefined — catch this at startup
const nodeEnv = process.env.NODE_ENV;   // "development" | "test" | "production"

// In development: load from .env file
// npm install dotenv
import "dotenv/config"; // must be first import — loads .env into process.env

// .env file (never commit to git!)
// DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
// JWT_SECRET=super-secret-key
// PORT=3000

// Best practice: validate at startup so the app fails fast if config is missing
import { z } from "zod";
const env = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).parse(process.env); // throws on startup if required vars missing

export const config = env;`}</code>
      </pre>
      <p>
        <strong>Key rule:</strong> secrets go in <code>.env</code>, which is in{" "}
        <code>.gitignore</code>. Never commit <code>DATABASE_URL</code>, <code>JWT_SECRET</code>,
        API keys, or passwords to Git.
      </p>

      {/* ─── Q13 ─── */}
      <h2 id="deps-devdeps">What is the difference between dependencies and devDependencies?</h2>
      <ArticleTable caption="The distinction matters for production Docker image size and npm install time" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>dependencies</th>
              <th>devDependencies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Needed at</strong></td>
              <td>Runtime (production server)</td>
              <td>Build / test only (your machine, CI)</td>
            </tr>
            <tr>
              <td><strong>Install flag</strong></td>
              <td><code>npm install express</code> (default)</td>
              <td><code>npm install -D vitest</code> (<code>--save-dev</code>)</td>
            </tr>
            <tr>
              <td><strong>Examples</strong></td>
              <td><code>express</code>, <code>zod</code>, <code>prisma</code>, <code>pino</code></td>
              <td><code>typescript</code>, <code>vitest</code>, <code>eslint</code>, <code>@types/*</code></td>
            </tr>
            <tr>
              <td><strong>Production install</strong></td>
              <td>Installed by <code>npm ci --omit=dev</code></td>
              <td>Skipped in production install</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// In Dockerfile — skip devDependencies in production image
RUN npm ci --omit=dev  # only installs "dependencies", not "devDependencies"
# Result: smaller image, faster build, no test code in production

// How they appear in package.json:
{
  "dependencies": {
    "express": "^4.18.2",
    "zod": "^3.22.0",
    "prisma": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/express": "^4.17.0"
  }
}`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="cjs-esm">What is the difference between CommonJS and ES Modules?</h2>
      <ArticleTable caption="The two module systems that coexist (sometimes awkwardly) in the Node.js ecosystem" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>CommonJS (CJS)</th>
              <th>ES Modules (ESM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Syntax</strong></td>
              <td><code>require()</code> / <code>module.exports</code></td>
              <td><code>import</code> / <code>export</code></td>
            </tr>
            <tr>
              <td><strong>Loading</strong></td>
              <td>Synchronous — <code>require()</code> blocks until loaded</td>
              <td>Asynchronous — parsed statically before execution</td>
            </tr>
            <tr>
              <td><strong>Default in Node.js</strong></td>
              <td>Yes — <code>.js</code> files are CJS by default</td>
              <td>Opt-in via <code>"type": "module"</code> in package.json or <code>.mjs</code></td>
            </tr>
            <tr>
              <td><strong>Tree shaking</strong></td>
              <td>No — bundlers can&apos;t statically analyze <code>require()</code></td>
              <td>Yes — static imports enable dead code elimination</td>
            </tr>
            <tr>
              <td><strong>Top-level await</strong></td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><strong>Interop</strong></td>
              <td>CJS can <code>require()</code> ESM with workarounds</td>
              <td>ESM can <code>import</code> CJS easily</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// CommonJS — still the default in most Node.js projects
const express = require("express");
const { readFile } = require("fs/promises");
module.exports = { createServer };
module.exports.default = app; // named export

// ES Modules — opt in via "type": "module" in package.json
import express from "express";
import { readFile } from "node:fs/promises";
export { createServer };
export default app;

// Mixing: require() an ESM package from CJS (Node 22+ handles this better)
// Older Node.js: use dynamic import() — returns a Promise
const { default: chalk } = await import("chalk"); // chalk v5 is ESM-only

// package.json: make the whole project ESM
{
  "type": "module"  // now .js files are treated as ESM
}

// Practical note: TypeScript with "module": "NodeNext" handles both cleanly
// Most new projects use ESM; many existing ones are CJS — know both`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="env-config">How do you handle configuration across environments?</h2>
      <p>
        The correct pattern is: <strong>one schema, multiple .env files, validate at startup</strong>.
        This gives you type safety, early failure if config is wrong, and no scattered{" "}
        <code>process.env</code> access throughout the codebase.
      </p>
      <pre>
        <code>{`// File structure:
// .env               ← local dev (in .gitignore)
// .env.test          ← test overrides (in .gitignore)
// .env.example       ← template with dummy values (committed to git)

// src/config.ts — the ONLY place that reads process.env
import "dotenv/config"; // load .env before anything else
import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ALLOWED_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim())),
});

const result = ConfigSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid config:");
  for (const issue of result.error.issues) {
    console.error(\`  \${issue.path.join(".")}: \${issue.message}\`);
  }
  process.exit(1); // fail fast — better than a cryptic error 10 minutes later
}

export const config = result.data;
// All values are typed: config.PORT is number, config.ALLOWED_ORIGINS is string[]

// Usage everywhere else — no process.env scattered around
import { config } from "./config";
app.listen(config.PORT);
const isProduction = config.NODE_ENV === "production";`}</code>
      </pre>
      <p>
        <strong>In production:</strong> environment variables are injected by the platform
        (Kubernetes secrets, AWS Secrets Manager, Railway, Render, Fly.io env vars). The app
        never reads from a file in production — only from <code>process.env</code>.
      </p>
    </div>
  );
}
