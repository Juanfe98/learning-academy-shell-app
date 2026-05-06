import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const runtimeMap = String.raw`flowchart LR
    JS["JavaScript Call Stack<br/>Functions, objects, promises"]
    V8["V8 Engine<br/>Ignition bytecode → TurboFan JIT"]
    NODE["Node.js Runtime APIs<br/>fs, net, http, timers, crypto"]
    UV["libuv<br/>Event loop + thread pool"]
    OS["Operating System / Kernel<br/>Sockets, files, DNS, epoll/kqueue/IOCP"]
    POOL["Worker Pool (default 4 threads)<br/>fs, crypto, DNS, compression"]
    QUEUES["Callback + microtask queues"]

    JS --> V8
    V8 --> NODE
    NODE --> UV
    UV --> OS
    UV --> POOL
    OS --> QUEUES
    POOL --> QUEUES
    QUEUES --> JS`;

const v8PipelineDiagram = String.raw`flowchart LR
    SRC["Source code<br/>.js / .ts (transpiled)"]
    PARSE["Parser<br/>AST"]
    IGNITION["Ignition interpreter<br/>Bytecode"]
    PROFILER["Profiler<br/>Counts calls, shapes"]
    TURBOFAN["TurboFan JIT<br/>Optimized machine code"]
    DEOPT["Deoptimize<br/>Back to bytecode"]

    SRC --> PARSE --> IGNITION --> PROFILER
    PROFILER -->|"hot function"| TURBOFAN
    TURBOFAN -->|"type guard fails"| DEOPT
    DEOPT --> IGNITION`;

const gcDiagram = String.raw`flowchart TD
    HEAP["V8 Heap"]
    HEAP --> NEW["New Space (young gen)<br/>Small, collected often<br/>Cheney's semi-space scavenge"]
    HEAP --> OLD["Old Space (old gen)<br/>Long-lived objects<br/>Mark-sweep-compact"]
    HEAP --> LO["Large Object Space<br/>Objects > ~512 KB<br/>Never moved"]
    HEAP --> CODE["Code Space<br/>JIT-compiled machine code"]
    NEW -->|"survived 2+ scavenges"| OLD`;

export const toc: TocItem[] = [
  { id: "why-node", title: "Why Node.js Works", level: 2 },
  { id: "runtime-stack", title: "Runtime Stack", level: 2 },
  { id: "what-runs-where", title: "What Runs Where", level: 2 },
  { id: "v8-engine", title: "V8 Engine Internals", level: 2 },
  { id: "hidden-classes", title: "Hidden Classes & Inline Caches", level: 3 },
  { id: "v8-memory", title: "V8 Memory Model & Garbage Collection", level: 2 },
  { id: "libuv-threadpool", title: "libuv Thread Pool", level: 2 },
  { id: "single-threaded", title: "Single Threaded, Not Single Capability", level: 2 },
  { id: "when-node-fits", title: "When Node.js Is a Good Fit", level: 2 },
  { id: "startup-mental-model", title: "Startup Mental Model", level: 2 },
];

export default function NodeRuntimeArchitecture() {
  return (
    <div className="article-content">
      <p>
        Node.js is not just &quot;JavaScript on the server.&quot; It is a runtime that combines the
        V8 engine, Node core APIs, and libuv&apos;s event-driven I/O model so one process can juggle
        thousands of connections without blocking on every file read or network call. If you
        understand that runtime boundary — where V8 ends and libuv begins — the rest of Node starts
        making sense.
      </p>

      <h2 id="why-node">Why Node.js Works</h2>
      <p>
        The core idea is simple: keep the JavaScript thread free for coordination work and offload
        waiting to the operating system or libuv&apos;s worker pool. Instead of spinning up one
        thread per request, Node lets one event loop resume whichever task becomes ready next. That
        is why it shines at API servers, gateways, BFFs, realtime apps, and job coordinators — all
        workloads where a request spends most of its time waiting on I/O, not burning CPU.
      </p>

      <h2 id="runtime-stack">Runtime Stack</h2>
      <MermaidDiagram
        chart={runtimeMap}
        title="Node.js Runtime Map"
        caption="Node.js sits between your JavaScript and the operating system. V8 executes code, Node exposes APIs, and libuv coordinates async I/O through the event loop and a default 4-thread worker pool."
        minHeight={500}
      />

      <p>
        V8 parses and executes JavaScript. Node layers server-side APIs on top:{" "}
        <code>fs</code>, <code>http</code>, <code>net</code>, <code>stream</code>,{" "}
        <code>crypto</code>, <code>timers</code>, and more. Underneath, libuv manages the event
        loop and a worker pool for operations that cannot be handled purely by non-blocking OS
        primitives (more on that below).
      </p>

      <h2 id="what-runs-where">What Runs Where</h2>
      <ArticleTable
        caption="This table is the quickest way to stop mixing up V8, Node core, libuv, and the operating system."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Responsibility</th>
              <th>Examples</th>
              <th>Common confusion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>V8</td>
              <td>Executes JavaScript, manages JS heap and GC</td>
              <td>Functions, closures, promises, garbage collection, JIT</td>
              <td>V8 does not open sockets or read files for you</td>
            </tr>
            <tr>
              <td>Node core</td>
              <td>Exposes server-side APIs to JavaScript</td>
              <td>
                <code>fs</code>, <code>http</code>, <code>stream</code>,{" "}
                <code>process</code>
              </td>
              <td>Node APIs are not part of the ECMAScript language</td>
            </tr>
            <tr>
              <td>libuv</td>
              <td>Event loop, async handles, worker pool coordination</td>
              <td>Timers, DNS, file system callbacks, worker queue</td>
              <td>libuv is not executing your JS business logic</td>
            </tr>
            <tr>
              <td>Operating system</td>
              <td>Actual sockets, file descriptors, kernel scheduling</td>
              <td>TCP, epoll (Linux), kqueue (macOS), IOCP (Windows)</td>
              <td>
                Node cannot outsmart the OS if disk or network is slow
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="v8-engine">V8 Engine Internals</h2>
      <p>
        Understanding V8 helps you write code that performs well — and helps you debug when it
        unexpectedly does not. The pipeline from source to execution has two stages: an interpreter
        that starts fast, and a JIT compiler that kicks in for hot code.
      </p>
      <MermaidDiagram
        chart={v8PipelineDiagram}
        title="V8 Compilation Pipeline"
        caption="Ignition interprets bytecode immediately. TurboFan compiles hot functions to native machine code. Type assumption failures trigger deoptimization back to bytecode."
        minHeight={420}
      />

      <p>
        <strong>Ignition</strong> is V8&apos;s bytecode interpreter. When a JavaScript file loads,
        V8 parses it into an AST (Abstract Syntax Tree), then compiles the AST to compact bytecode.
        Bytecode starts running immediately — no wait for full compilation. The tradeoff is that
        bytecode is slower than native machine code.
      </p>
      <p>
        <strong>TurboFan</strong> is V8&apos;s optimizing JIT compiler. While Ignition executes
        bytecode, a profiler tracks which functions are called frequently (&quot;hot paths&quot;) and
        what types their arguments actually are. When a function is hot enough, TurboFan compiles it
        to optimized native machine code with speculative type assumptions baked in. This is why
        a function that processes thousands of objects can be as fast as C code — until you hand it
        an unexpected type.
      </p>
      <p>
        <strong>Deoptimization</strong> happens when TurboFan&apos;s type assumptions break. If
        TurboFan compiled a function assuming the first argument is always a number, and you pass a
        string, V8 throws away the optimized code and falls back to bytecode. Repeated
        deoptimization in a hot loop is a real performance problem, often invisible in heap profiles
        but visible in CPU flame graphs.
      </p>

      <pre>
        <code>{`// Optimization-friendly: stable types
function addNumbers(a: number, b: number): number {
  return a + b;
}

for (let i = 0; i < 1_000_000; i++) {
  addNumbers(i, i + 1); // TurboFan sees: always number + number → optimize
}

// Optimization-hostile: polymorphic types
function addPolymorphic(a: unknown, b: unknown) {
  return (a as any) + (b as any); // number sometimes, string sometimes
}
// V8 must keep bytecode fallback — can't speculate on type`}</code>
      </pre>

      <h3 id="hidden-classes">Hidden Classes & Inline Caches</h3>
      <p>
        JavaScript objects are dynamic — you can add or remove properties at any time. To make
        property access fast despite this, V8 uses <strong>hidden classes</strong> (also called
        &quot;shapes&quot; or &quot;maps&quot;). When you create an object, V8 assigns it a hidden
        class describing its property layout. As long as objects are created in the same shape,
        property lookups can be as fast as a struct field access in C.
      </p>

      <pre>
        <code>{`// Good: same shape — V8 creates one hidden class for all these objects
const p1 = { x: 1, y: 2 };
const p2 = { x: 3, y: 4 };
const p3 = { x: 5, y: 6 };
// V8 sees: all points have shape {x, y} → single hidden class → IC hit → fast

// Bad: different shapes — V8 creates new hidden classes mid-stream
const users = [];
users.push({ id: 1, name: "Alice" });
users.push({ id: 2, name: "Bob", role: "admin" }); // different shape!
users.push({ id: 3 });                              // another shape!
// Inline cache goes polymorphic or megamorphic → much slower property access

// Bad: adding properties after construction transitions hidden classes
const obj: Record<string, number> = {};
obj.x = 1; // hidden class A → B
obj.y = 2; // hidden class B → C
// Build the full object up-front: { x: 1, y: 2 } instead`}</code>
      </pre>

      <p>
        <strong>Inline caches (ICs)</strong> are V8&apos;s mechanism for remembering where a
        property lives relative to a hidden class. A monomorphic IC (one hidden class seen) is
        fastest. A polymorphic IC (2–4 hidden classes seen) is slower but still fast. A megamorphic
        IC (more than 4 hidden classes) disables the cache entirely and falls back to slow general
        lookup. Keeping objects shape-stable is the single easiest V8 optimization most engineers
        can do.
      </p>

      <h2 id="v8-memory">V8 Memory Model & Garbage Collection</h2>
      <MermaidDiagram
        chart={gcDiagram}
        title="V8 Heap Layout"
        caption="V8 uses a generational GC strategy. New space is collected frequently and fast. Old space is collected less often but pauses longer. Large objects are never moved."
        minHeight={420}
      />

      <p>
        V8&apos;s garbage collector is <strong>generational</strong> — based on the observation that
        most objects die young. The heap is split into zones that GC handles differently:
      </p>

      <ArticleTable caption="Understanding which zone an object lives in helps you reason about GC pressure and pause durations." minWidth={960}>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Typical size</th>
              <th>Algorithm</th>
              <th>Pause duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>New space (young gen)</td>
              <td>1–8 MB</td>
              <td>Scavenge (Cheney&apos;s semi-space copy)</td>
              <td>Very short (~1ms)</td>
            </tr>
            <tr>
              <td>Old space (old gen)</td>
              <td>Hundreds of MB</td>
              <td>Mark-sweep-compact (incremental + concurrent)</td>
              <td>Longer, mostly concurrent</td>
            </tr>
            <tr>
              <td>Large object space</td>
              <td>Per-object &gt;~512 KB</td>
              <td>Mark-sweep, never moved</td>
              <td>Same as old space</td>
            </tr>
            <tr>
              <td>Code space</td>
              <td>Varies</td>
              <td>JIT-compiled code, executable pages</td>
              <td>N/A — managed separately</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        <strong>Scavenge</strong> (minor GC) runs very frequently on new space. It copies surviving
        objects to a &quot;to-space&quot;, then flips to/from-space. Objects that survive two
        scavenges are promoted to old space. The entire scavenge is stop-the-world but fast — the
        small heap size keeps pause times well under 5ms.
      </p>
      <p>
        <strong>Mark-sweep-compact</strong> (major GC) runs on old space. V8&apos;s modern GC does
        most marking concurrently with your JavaScript execution. Still, a major GC on a large heap
        can cause visible pauses. In production, watch for sudden p99 latency spikes — they are
        often major GC pauses.
      </p>

      <pre>
        <code>{`// Watch GC behavior at startup
// NODE_OPTIONS='--expose-gc' node --trace-gc server.js
// Or programmatically:

if (global.gc) {
  global.gc(); // force minor + major GC — only works with --expose-gc
}

// Heap snapshot in production (connect Chrome DevTools to the node process):
// node --inspect server.js
// Then: chrome://inspect → Memory tab → Heap Snapshot

// Monitor heap from inside the process
import { memoryUsage } from "node:process";
const { heapUsed, heapTotal, external, rss } = memoryUsage();
// rss = resident set size (total process memory)
// heapUsed = JS objects currently alive
// external = C++ objects (Buffers, ArrayBuffers) referenced from JS`}</code>
      </pre>

      <p>
        Common GC pressure sources: accumulating large request/response objects in closures,
        appending to very long arrays in loops, creating many short-lived RegExp or Date objects
        in hot paths, and keeping references to old objects from long-lived caches (preventing
        promotion to old space from ever being collected).
      </p>

      <h2 id="libuv-threadpool">libuv Thread Pool</h2>
      <p>
        A common misconception: &quot;Node is single-threaded&quot; means all I/O is
        non-blocking at the OS level. That is not true. Many operations cannot be handled via
        non-blocking system calls on all platforms, so libuv executes them on a thread pool and
        converts the completion to an event loop callback. The default pool size is{" "}
        <strong>4 threads</strong>.
      </p>

      <ArticleTable caption="Not all Node I/O is non-blocking at the kernel level. This distinction matters when tuning UV_THREADPOOL_SIZE." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Mechanism</th>
              <th>Uses thread pool?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TCP / UDP sockets</td>
              <td>epoll / kqueue / IOCP (kernel async)</td>
              <td>No — true non-blocking kernel I/O</td>
            </tr>
            <tr>
              <td>HTTP requests (via <code>fetch</code> / <code>http</code>)</td>
              <td>Kernel sockets</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>fs.*</code> (file system)</td>
              <td>Thread pool (file I/O is not truly async on all OS)</td>
              <td><strong>Yes</strong></td>
            </tr>
            <tr>
              <td><code>crypto.pbkdf2</code>, <code>crypto.scrypt</code></td>
              <td>Thread pool (CPU-intensive hash functions)</td>
              <td><strong>Yes</strong></td>
            </tr>
            <tr>
              <td><code>dns.lookup()</code></td>
              <td>Thread pool (getaddrinfo is blocking)</td>
              <td><strong>Yes</strong></td>
            </tr>
            <tr>
              <td><code>dns.resolve()</code></td>
              <td>libuv async DNS resolver (not getaddrinfo)</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>zlib</code> compress/decompress</td>
              <td>Thread pool</td>
              <td><strong>Yes</strong></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        With the default pool size of 4, if 5 file system reads are initiated simultaneously, the
        5th queues behind the first 4. In apps that make heavy parallel <code>fs</code> or{" "}
        <code>crypto</code> calls, this is a real bottleneck — and it shows up as mysterious
        latency that does not look like event loop lag.
      </p>

      <pre>
        <code>{`// Increase pool size for I/O-heavy workloads
// Must be set BEFORE any libuv call — typically at process startup
process.env.UV_THREADPOOL_SIZE = "16"; // max 128

// Or set it in the environment before launching:
// UV_THREADPOOL_SIZE=16 node server.js

// Diagnose pool saturation by comparing:
// 1. Concurrent fs/crypto call count
// 2. UV_THREADPOOL_SIZE
// If concurrent calls > pool size, you're queueing

// Use dns.resolve() instead of dns.lookup() to skip the pool:
import { resolve4 } from "node:dns/promises";
const [ip] = await resolve4("api.example.com"); // no thread pool — uses async c-ares resolver`}</code>
      </pre>

      <h2 id="single-threaded">Single Threaded, Not Single Capability</h2>
      <p>
        People often say &quot;Node is single-threaded&quot; as if that means it can only do one
        thing at a time. More precisely: your <em>JavaScript</em> executes on one main thread per
        process, but that process can coordinate many in-flight operations. When a request waits on
        the network, the JS thread is free to handle other requests. When you run CPU-heavy work
        synchronously, that freedom disappears and every request pays the price.
      </p>

      <pre>
        <code>{`import http from "node:http";

const server = http.createServer(async (_req, res) => {
  // Good: mostly waiting on I/O — the event loop can serve other requests
  const user = await fetch("https://api.example.com/user/123").then((r) => r.json());
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(user));
});

// Bad: synchronous CPU burn — blocks ALL other requests for 300ms
const serverBlocking = http.createServer((_req, res) => {
  const start = Date.now();
  while (Date.now() - start < 300) {} // 300ms of blocking — event loop dead
  res.end("done");
});

server.listen(3000);`}</code>
      </pre>

      <p>
        The server above scales well because the hot path is I/O-bound. Replace that{" "}
        <code>fetch()</code> with a synchronous 300ms CPU loop and the event loop is blocked for
        the full duration — every other request queues behind it. The distinction between
        I/O-bound and CPU-bound workloads is one of the most important architectural choices in Node.
        CPU-bound work belongs in a Worker Thread or a separate process (see the Performance module).
      </p>

      <h2 id="when-node-fits">When Node.js Is a Good Fit</h2>
      <ArticleTable
        caption="Use this decision table when choosing whether Node should sit in the critical path."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Node.js fit</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>REST or GraphQL APIs</td>
              <td>Excellent</td>
              <td>Mostly network-bound, high concurrency, fast iteration</td>
            </tr>
            <tr>
              <td>Realtime chat / presence</td>
              <td>Excellent</td>
              <td>Long-lived connections and evented I/O are natural fits</td>
            </tr>
            <tr>
              <td>Queue consumers orchestrating downstream services</td>
              <td>Strong</td>
              <td>Great for workflow coordination and external API fan-out</td>
            </tr>
            <tr>
              <td>Server-side rendering (Next.js, Remix)</td>
              <td>Strong</td>
              <td>Mostly rendering + DB calls, Node ecosystem advantage</td>
            </tr>
            <tr>
              <td>Image encoding or video transcoding</td>
              <td>Weak on main thread</td>
              <td>CPU-heavy work should move to worker threads or another service</td>
            </tr>
            <tr>
              <td>ML inference / numerical compute</td>
              <td>Usually weak</td>
              <td>Better served by Python (PyTorch) or a purpose-built runtime</td>
            </tr>
            <tr>
              <td>Low-latency native compute kernels</td>
              <td>Usually weak</td>
              <td>Use a language/runtime optimized for tight CPU loops (Rust, Go, C++)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="startup-mental-model">Startup Mental Model</h2>
      <p>
        Keep this in your head: JavaScript describes work, Node exposes server primitives, libuv
        waits efficiently, and the event loop resumes ready callbacks. Whenever performance feels
        mysterious, ask four questions in order:
      </p>
      <ol>
        <li>
          <strong>What is the JS thread doing?</strong> — Is it blocked on synchronous work, or
          free to pick up new callbacks?
        </li>
        <li>
          <strong>What is waiting?</strong> — How many callbacks are queued at the OS or pool level?
        </li>
        <li>
          <strong>What is saturating first?</strong> — Event loop? libuv thread pool? DB
          connection pool? Network?
        </li>
        <li>
          <strong>What is V8 doing with the hot path?</strong> — Is the code JIT-optimized, or
          is it deoptimizing because of shape instability?
        </li>
      </ol>
      <p>
        Those four questions cover the vast majority of Node.js performance investigations. The
        Event Loop &amp; Async Patterns module goes deeper into the callback scheduling model.
      </p>
    </div>
  );
}
