import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const macroMicroDiagram = String.raw`flowchart TD
    START["Synchronous code runs (call stack)"]
    START --> MICRO1["Drain nextTick queue<br/>process.nextTick callbacks"]
    MICRO1 --> MICRO2["Drain Promise microtask queue<br/>Promise.then / queueMicrotask"]
    MICRO2 --> PICK["Event loop picks next macrotask<br/>(timers / I/O / setImmediate / close)"]
    PICK --> EXEC["Execute macrotask callback"]
    EXEC --> MICRO1
    EXEC -->|"queue empty"| IDLE["Event loop idles<br/>(waiting for I/O or timers)"]
    IDLE --> PICK`;

const eventLoopPhases = String.raw`flowchart LR
    T["① Timers<br/>setTimeout<br/>setInterval"]
    PC["② Pending callbacks<br/>OS error callbacks<br/>(TCP errors etc)"]
    IP["③ Idle/prepare<br/>(internal only)"]
    PO["④ Poll<br/>Block for I/O<br/>Execute I/O callbacks"]
    CH["⑤ Check<br/>setImmediate"]
    CC["⑥ Close callbacks<br/>socket.on('close')"]

    T --> PC --> IP --> PO --> CH --> CC --> T

    MQ["nextTick + Promise microtasks"] -. run after EACH callback .-> T`;

export const toc: TocItem[] = [
  { id: "one-tick", title: "The Single-Tick Execution Model", level: 2 },
  { id: "macro-micro", title: "Macrotasks vs Microtasks", level: 2 },
  { id: "nexttick-microtask", title: "nextTick Queue vs Promise Microtask Queue", level: 3 },
  { id: "execution-order", title: "Execution Order: Step-by-Step", level: 3 },
  { id: "phase-map", title: "Event Loop Phases", level: 2 },
  { id: "poll-phase", title: "The Poll Phase (Most Misunderstood)", level: 3 },
  { id: "setimmediate-vs-timeout", title: "setImmediate vs setTimeout(fn, 0)", level: 3 },
  { id: "async-patterns", title: "Async Patterns That Scale", level: 2 },
  { id: "bounded-concurrency", title: "Bounded Concurrency", level: 3 },
  { id: "backpressure", title: "Backpressure and Cancellation", level: 2 },
  { id: "common-bugs", title: "Common Event Loop Bugs", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function EventLoopAndAsyncPatterns() {
  return (
    <div className="article-content">
      <p>
        The event loop is where most Node.js myths come from. Senior engineers do not memorize
        every internal detail, but they can explain the major phases, when microtasks run, why{" "}
        <code>process.nextTick()</code> is special, and how to prevent one request from starving
        all the others. This module builds the correct mental model from first principles.
      </p>

      <h2 id="one-tick">The Single-Tick Execution Model</h2>
      <p>
        Node.js runs JavaScript on a single main thread. &quot;Single thread&quot; means one call
        stack — only one chunk of JavaScript executes at a time. &quot;Event loop&quot; means
        the runtime repeatedly picks the next queued callback and runs it to completion before
        picking the next one.
      </p>
      <p>
        This is <strong>cooperative multitasking</strong>, not preemptive: Node never interrupts
        your JavaScript mid-function to run something else. You get the whole thread until you
        return or <code>await</code> something. That is why a 500ms synchronous loop blocks every
        other request — there is no preemption to save them.
      </p>

      <pre>
        <code>{`// This is what one "tick" looks like from Node's perspective:
// 1. Pick a callback off the queue
// 2. Execute it to completion (synchronous portion)
// 3. Drain microtask queues (nextTick + Promises)
// 4. Pick the next callback

// "Awaiting" does not pause the thread — it schedules the rest as a microtask
// and returns control to the event loop immediately

async function handleRequest(req: Request): Promise<Response> {
  // synchronous: runs on the call stack
  const userId = req.headers.get("x-user-id");

  // await: suspends this function, puts the continuation in the microtask queue,
  // returns control to the event loop — other callbacks can run here
  const user = await db.user.findUnique({ where: { id: userId } });

  // resumes here when the db promise resolves (as a microtask)
  return Response.json({ user });
}`}</code>
      </pre>

      <h2 id="macro-micro">Macrotasks vs Microtasks</h2>
      <p>
        Not all scheduled work is equal. Node.js has two fundamentally different queuing layers,
        and they drain at different times. Getting this wrong leads to subtle ordering bugs.
      </p>

      <MermaidDiagram
        chart={macroMicroDiagram}
        title="Macrotask / Microtask Execution Model"
        caption="After every macrotask callback finishes, Node drains ALL microtasks (nextTick first, then Promises) before picking the next macrotask. Microtasks never wait for the next event loop tick."
        minHeight={520}
      />

      <ArticleTable
        caption="The most important distinction: microtasks run BETWEEN macrotasks, not in a future loop tick."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>API</th>
              <th>When it runs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Macrotask</strong>
              </td>
              <td>
                <code>setTimeout</code>, <code>setInterval</code>
              </td>
              <td>Timers phase — after the timer delay elapses</td>
            </tr>
            <tr>
              <td>
                <strong>Macrotask</strong>
              </td>
              <td>I/O callbacks (fs, net)</td>
              <td>Poll phase — when the OS signals completion</td>
            </tr>
            <tr>
              <td>
                <strong>Macrotask</strong>
              </td>
              <td>
                <code>setImmediate</code>
              </td>
              <td>Check phase — after poll, before next timers phase</td>
            </tr>
            <tr>
              <td>
                <strong>Microtask</strong>
              </td>
              <td>
                <code>process.nextTick()</code>
              </td>
              <td>nextTick queue — after current callback, before Promises</td>
            </tr>
            <tr>
              <td>
                <strong>Microtask</strong>
              </td>
              <td>
                <code>Promise.then()</code>, <code>queueMicrotask()</code>
              </td>
              <td>Promise microtask queue — after nextTick queue drains</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="nexttick-microtask">nextTick Queue vs Promise Microtask Queue</h3>
      <p>
        There are actually <strong>two separate microtask queues</strong>, not one. Node always
        drains them in order: first all <code>process.nextTick()</code> callbacks, then all Promise
        microtasks. This matters more than it sounds.
      </p>

      <pre>
        <code>{`// Both run "before the next I/O event" but nextTick always runs first

Promise.resolve().then(() => console.log("promise 1"));
process.nextTick(() => console.log("nextTick 1"));
Promise.resolve().then(() => console.log("promise 2"));
process.nextTick(() => console.log("nextTick 2"));

// Output:
// nextTick 1
// nextTick 2
// promise 1
// promise 2

// Danger: recursive nextTick starves everything
// function bad() { process.nextTick(bad); }  ← event loop never moves forward
// The nextTick queue must fully drain before the event loop moves to I/O`}</code>
      </pre>

      <h3 id="execution-order">Execution Order: Step-by-Step</h3>
      <p>
        This is the classic interview question. Work through it systematically:
      </p>

      <pre>
        <code>{`console.log("1");                              // sync

setTimeout(() => console.log("2: timeout"), 0); // macrotask (timers phase)
setImmediate(() => console.log("3: immediate")); // macrotask (check phase)

Promise.resolve()
  .then(() => console.log("4: promise"));        // microtask (Promise queue)

process.nextTick(() => console.log("5: tick")); // microtask (nextTick queue)

queueMicrotask(() => console.log("6: micro"));  // microtask (Promise queue)

console.log("7");                               // sync

// Execution order:
// 1  ← sync
// 7  ← sync (same call stack)
// 5: tick   ← nextTick queue drains first
// 4: promise ← Promise microtask queue
// 6: micro   ← still in Promise microtask queue
// 2: timeout OR 3: immediate ← macrotask (order of 2 vs 3 is non-deterministic at top level)
//                               Inside an I/O callback, setImmediate ALWAYS runs before setTimeout`}</code>
      </pre>

      <pre>
        <code>{`// Inside an I/O callback, setImmediate wins over setTimeout(fn, 0)
import { readFile } from "node:fs";

readFile("./package.json", () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
  // Output (always):
  // immediate   ← check phase comes right after poll
  // timeout     ← timers phase is the next full loop iteration
});`}</code>
      </pre>

      <h2 id="phase-map">Event Loop Phases</h2>
      <MermaidDiagram
        chart={eventLoopPhases}
        title="Event Loop Phases (libuv)"
        caption="The event loop cycles through six phases. Microtasks (nextTick + Promises) drain after EVERY individual callback within any phase — not just between phases."
        minHeight={380}
      />

      <p>
        The important ordering rules:
      </p>
      <ol>
        <li>
          <strong>Timers phase</strong> — runs all <code>setTimeout</code> and{" "}
          <code>setInterval</code> callbacks whose delay has elapsed. Not guaranteed to fire exactly
          at the delay — OS scheduling adds jitter.
        </li>
        <li>
          <strong>Pending callbacks</strong> — system error callbacks (e.g. TCP ECONNREFUSED
          delivered on the next tick after the error).
        </li>
        <li>
          <strong>Idle / prepare</strong> — internal libuv use. Your code never runs here.
        </li>
        <li>
          <strong>Poll phase</strong> — retrieve new I/O events. Block if nothing is ready and no
          timers are due soon (saves CPU). Execute I/O callbacks as they arrive.
        </li>
        <li>
          <strong>Check phase</strong> — run all <code>setImmediate()</code> callbacks.
        </li>
        <li>
          <strong>Close callbacks</strong> — fire <code>close</code> events (e.g.{" "}
          <code>socket.on(&apos;close&apos;)</code>).
        </li>
      </ol>

      <h3 id="poll-phase">The Poll Phase (Most Misunderstood)</h3>
      <p>
        The poll phase is the most important phase for typical Node.js I/O servers. It has two
        jobs: execute I/O callbacks that have been queued, and then block waiting for new I/O
        events (using the OS's async notification mechanism — epoll on Linux, kqueue on macOS,
        IOCP on Windows).
      </p>
      <p>
        The poll phase will block for as long as there are no pending timers and no{" "}
        <code>setImmediate</code> callbacks. This is not a bug — it is how Node achieves low CPU
        usage while idle. When a network packet arrives or a file read completes, the OS wakes the
        poll phase immediately.
      </p>

      <h3 id="setimmediate-vs-timeout">setImmediate vs setTimeout(fn, 0)</h3>
      <ArticleTable
        caption="These scheduling APIs solve different problems. Mixing them casually is where production surprises start."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>API</th>
              <th>Runs when</th>
              <th>Best use</th>
              <th>Main danger</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>process.nextTick()</code>
              </td>
              <td>Before normal microtasks, before next event loop phase</td>
              <td>Very small deferrals for API consistency (e.g. emit after constructor returns)</td>
              <td>Can starve I/O if abused recursively</td>
            </tr>
            <tr>
              <td>
                <code>Promise.then()</code> / <code>queueMicrotask()</code>
              </td>
              <td>After nextTick queue, still before next macrotask</td>
              <td>Async composition and promise chaining</td>
              <td>Large microtask chains can delay visible work</td>
            </tr>
            <tr>
              <td>
                <code>setImmediate()</code>
              </td>
              <td>Check phase — after current poll cycle, before next timers</td>
              <td>Continue work after an I/O callback without delaying I/O further</td>
              <td>Often confused with <code>setTimeout(fn, 0)</code></td>
            </tr>
            <tr>
              <td>
                <code>setTimeout(fn, 0)</code>
              </td>
              <td>Timers phase on a future loop iteration (minimum ~1ms actual delay)</td>
              <td>Yielding control when you want at least one full loop tick to pass</td>
              <td>Not guaranteed to be &quot;immediate&quot; — min delay is OS-dependent</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="async-patterns">Async Patterns That Scale</h2>
      <p>
        Good Node code is explicit about concurrency. Starting independent I/O together is usually
        faster than awaiting each call sequentially. But &quot;start everything at once&quot; is
        not the same as &quot;unlimited fan-out&quot; — downstream services, DB pools, and rate
        limits still need backpressure.
      </p>

      <pre>
        <code>{`// ❌ Slow: waterfall — each await blocks until the previous resolves
const user = await getUser(id);
const orders = await getOrders(id);
const settings = await getSettings(id);

// ✅ Better: concurrent — all three fire together
const [user, orders, settings] = await Promise.all([
  getUser(id),
  getOrders(id),
  getSettings(id),
]);

// ✅ Partial failure tolerance: allSettled doesn't reject on first failure
const results = await Promise.allSettled([
  getUser(id),
  getOrders(id),
  getSettings(id),
]);
const successful = results
  .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
  .map((r) => r.value);

// ✅ Race: use the fastest result (e.g. cache-vs-network)
const data = await Promise.race([
  cache.get(key),
  fetchFromAPI(key),
]);`}</code>
      </pre>

      <h3 id="bounded-concurrency">Bounded Concurrency</h3>
      <p>
        Unlimited fan-out is how healthy services turn into denial-of-service against their own
        dependencies. When processing an array of IDs, never fire all requests simultaneously.
        Use a semaphore or batching strategy to cap in-flight operations.
      </p>

      <pre>
        <code>{`// ❌ Unlimited: fires all 10,000 requests simultaneously
const users = await Promise.all(ids.map((id) => fetchUser(id)));

// ✅ Bounded concurrency: p-limit (or manual semaphore)
import pLimit from "p-limit";

const limit = pLimit(10); // max 10 in-flight at once
const users = await Promise.all(
  ids.map((id) => limit(() => fetchUser(id)))
);

// Manual semaphore without a library:
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((r) => { results.push(r); });
    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing); // wait for any one to finish
      executing.splice(executing.findIndex((e) => e === p), 1);
    }
  }
  await Promise.all(executing);
  return results;
}

// Async generator for processing large datasets without loading all into memory:
async function* fetchPagedUsers(pageSize: number) {
  let cursor: string | undefined;
  do {
    const page = await db.user.findMany({ take: pageSize, cursor });
    yield* page;
    cursor = page.at(-1)?.id;
  } while (page.length === pageSize);
}

for await (const user of fetchPagedUsers(100)) {
  await processUser(user); // backpressure: only one page in memory at a time
}`}</code>
      </pre>

      <h2 id="backpressure">Backpressure and Cancellation</h2>
      <p>
        Async systems need stop signals. In modern Node, <code>AbortController</code> is the
        standard cancellation primitive for <code>fetch()</code>, streams, timers, and many APIs.
        If a client disconnects or a request times out, your downstream work should stop too —
        uncancelled work consumes DB pool slots, memory, and downstream rate limit budget.
      </p>

      <pre>
        <code>{`// Timeout a fetch with AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(new Error("timeout")), 1500);

try {
  const response = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  return await response.json();
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    throw new Error("Request timed out after 1500ms");
  }
  throw err;
} finally {
  clearTimeout(timeoutId);
}

// Express: cancel downstream work when client disconnects
app.get("/slow", async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => controller.abort()); // client hung up

  try {
    const data = await fetchHeavyData({ signal: controller.signal });
    res.json(data);
  } catch {
    if (!res.headersSent) res.status(499).json({ error: "Client disconnected" });
  }
});`}</code>
      </pre>

      <h2 id="common-bugs">Common Event Loop Bugs</h2>
      <ul>
        <li>
          <strong>Recursive <code>nextTick()</code></strong> — prevents I/O from ever getting a
          turn. Symptoms: server accepts connections but never processes them.
        </li>
        <li>
          <strong>Synchronous CPU work in request handlers</strong> — huge JSON parsing, regex
          backtracking, bcrypt on the main thread. Every other request waits.
        </li>
        <li>
          <strong>Sequential awaits for independent work</strong> — waterfalling calls that could
          run in parallel. Use <code>Promise.all()</code>.
        </li>
        <li>
          <strong>Unbounded fan-out</strong> — firing thousands of concurrent DB queries or HTTP
          calls. Destroys connection pools and hits rate limits.
        </li>
        <li>
          <strong>Ignoring cancellation</strong> — timed-out requests keep running downstream,
          consuming pool slots. Wire <code>AbortController</code> to request timeout.
        </li>
        <li>
          <strong>Confusing concurrency with parallelism</strong> — concurrent I/O reuses one JS
          thread; actual parallel CPU execution needs Worker Threads or multiple processes.
        </li>
        <li>
          <strong>Assuming <code>setTimeout(fn, 0)</code> fires immediately</strong> — real minimum
          is ~1–4ms due to OS scheduling. Use <code>setImmediate()</code> or{" "}
          <code>queueMicrotask()</code> if you need sub-tick scheduling.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain the event loop in an interview"
        intro="A strong answer sounds operational, not textbook-heavy. Walk through the model, name a real failure mode, and close with a production implication."
        steps={[
          "Start with the one-thread main idea: JavaScript runs on one main thread. I/O is delegated to the OS (via kernel async I/O) or libuv's worker pool. When I/O completes, a callback is queued.",
          "Explain the two-layer queue: microtasks (nextTick, Promises) drain completely after every callback before the event loop picks the next macrotask. This is the most commonly misunderstood ordering rule.",
          "Name the six phases: timers, pending callbacks, idle/prepare, poll (where I/O blocks), check (setImmediate), close callbacks.",
          "Call out the failure mode: synchronous CPU work blocks all other requests because there is no preemption. A 300ms synchronous loop means 300ms of dead event loop.",
          "Close with the production fix: CPU-bound work goes to Worker Threads or a separate process. I/O-bound concurrency stays on the main thread and uses Promise.all + bounded concurrency.",
        ]}
      />
    </div>
  );
}
