import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const syncVsAsyncDiagram = String.raw`flowchart LR
    subgraph SYNC["Synchronous: one task blocks the thread"]
        direction TB
        S1["Task A: CPU work"]
        S2["Task A: waiting on network"]
        S3["Task A: finish response"]
        S4["Task B: starts only after A ends"]
        S1 --> S2 --> S3 --> S4
        SN["Wall time = sum of waits and work"]
        S4 --> SN
    end

    subgraph ASYNC["Asynchronous: waiting tasks yield the loop"]
        direction TB
        A1["Task A starts"]
        A2["Task A awaits I/O"]
        B1["Task B runs while A waits"]
        B2["Task B awaits I/O"]
        A3["Task A resumes when ready"]
        B3["Task B resumes when ready"]
        AN["Wall time trends toward the longest path, not the sum"]
        A1 --> A2 --> B1 --> B2
        A2 -. yields control .-> B1
        B2 -. event loop resumes A .-> A3
        A3 --> B3 --> AN
    end`;

const concurrencyVsParallelismDiagram = String.raw`flowchart LR
    subgraph CONCURRENCY["Concurrency: one worker interleaves tasks"]
        direction TB
        C0["Single thread / event loop"]
        C1["Task A slice"]
        C2["Task B slice"]
        C3["Task C slice"]
        C4["Great for I/O-bound workloads"]
        C0 --> C1 --> C2 --> C3 --> C1
        C3 --> C4
    end

    subgraph PARALLEL["Parallelism: multiple workers run at once"]
        direction TB
        P0["Multiple CPU cores or processes"]
        P1["Core 1 executes Task A"]
        P2["Core 2 executes Task B"]
        P3["Core 3 executes Task C"]
        P4["Great for CPU-bound workloads"]
        P0 --> P1
        P0 --> P2
        P0 --> P3
        P1 --> P4
        P2 --> P4
        P3 --> P4
    end`;

const eventLoopDiagram = String.raw`flowchart TB
    RQ["Ready queue<br/>coroutines ready to run"]
    LOOP(("Event loop"))
    RUN["Running coroutine<br/>exactly one Python coroutine at a time"]
    WAIT["I/O waiting<br/>network, sleep, file, DB"]
    CB["Completed I/O / callback ready"]

    RQ --> LOOP
    LOOP --> RUN
    RUN -->|await| WAIT
    WAIT -->|socket/timer finished| CB
    CB --> RQ
    RUN -->|returns| LOOP
    LOOP -->|pick next ready task| RQ`;

export const toc: TocItem[] = [
  { id: "sync-vs-async", title: "Sync vs Async Execution", level: 2 },
  { id: "concurrency-vs-parallelism", title: "Concurrency vs Parallelism", level: 2 },
  { id: "event-loop", title: "The Event Loop", level: 2 },
  { id: "coroutines", title: "Coroutines: async def and await", level: 2 },
  { id: "asyncio", title: "asyncio Basics", level: 2 },
  { id: "gather-tasks", title: "gather() and Tasks", level: 2 },
  { id: "blocking-io", title: "Blocking vs Non-blocking I/O", level: 2 },
  { id: "async-patterns", title: "Async Patterns", level: 2 },
  { id: "async-in-fastapi", title: "Async in FastAPI", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "js-comparison", title: "Python Async vs JavaScript", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function AsyncPython() {
  return (
    <div className="article-content">
      <p>
        Python&apos;s async model is built on the same concept as JavaScript&apos;s — a
        single-threaded event loop that switches between tasks during I/O waits. If you
        understand <code>async/await</code> in JS, the mental model transfers directly.
        The difference is that Python&apos;s event loop is <em>opt-in</em> and the GIL
        (Global Interpreter Lock) shapes what parallelism is actually possible.
      </p>

      <h2 id="sync-vs-async">Sync vs Async Execution</h2>

      <p>
        In synchronous code, tasks run one after another — each blocks the thread until
        it completes. In asynchronous code, a task that is <em>waiting</em> (for network,
        disk, a timer) yields control back to the event loop so other tasks can run.
      </p>

      <MermaidDiagram
        chart={syncVsAsyncDiagram}
        title="Sync vs Async Execution"
        caption="Synchronous code pays every wait serially. Async code gives the thread back to the event loop whenever it awaits I/O."
        minHeight={520}
      />

      <pre><code>{`# Sync — each request blocks until done
import time

def fetch_sync(url):
    time.sleep(1)   # simulate network I/O
    return f"data from {url}"

def main_sync():
    start = time.time()
    results = [fetch_sync(u) for u in ["a", "b", "c"]]
    print(f"sync: {time.time() - start:.1f}s")   # ~3.0s

# Async — all requests run concurrently
import asyncio

async def fetch_async(url):
    await asyncio.sleep(1)   # yields control during wait
    return f"data from {url}"

async def main_async():
    start = time.time()
    results = await asyncio.gather(
        fetch_async("a"), fetch_async("b"), fetch_async("c")
    )
    print(f"async: {time.time() - start:.1f}s")  # ~1.0s

asyncio.run(main_async())`}</code></pre>

      <h2 id="concurrency-vs-parallelism">Concurrency vs Parallelism</h2>

      <MermaidDiagram
        chart={concurrencyVsParallelismDiagram}
        title="Concurrency vs Parallelism"
        caption="Concurrency is about scheduling and overlap. Parallelism is about simultaneously burning multiple cores."
        minHeight={420}
      />

      <pre><code>{`# Concurrency — one thread, tasks interleave during waits
# → asyncio, threading
# → good for: HTTP calls, DB queries, file I/O

# Parallelism — multiple CPUs run simultaneously
# → multiprocessing, ProcessPoolExecutor
# → good for: image processing, ML training, number crunching

# Python's GIL (Global Interpreter Lock):
# Only ONE thread executes Python bytecode at a time.
# Threading gives concurrency for I/O but NOT true parallelism for CPU.
# Multiprocessing bypasses the GIL — each process has its own interpreter.

# I/O-bound → asyncio or threading (GIL doesn't matter during waits)
# CPU-bound → multiprocessing or ProcessPoolExecutor`}</code></pre>

      <h2 id="event-loop">The Event Loop</h2>

      <MermaidDiagram
        chart={eventLoopDiagram}
        title="Event Loop"
        caption="The loop repeatedly pulls ready work, runs one coroutine, and puts it back aside the moment that coroutine has to wait on external I/O."
        minHeight={440}
      />

      <pre><code>{`# The event loop is the scheduler
# It maintains a queue of coroutines and runs them cooperatively

import asyncio

# Get the running loop
loop = asyncio.get_event_loop()

# asyncio.run() — start the event loop (Python 3.7+)
async def main():
    print("start")
    await asyncio.sleep(1)
    print("end")

asyncio.run(main())   # creates loop, runs main, closes loop

# Each await point is where the event loop can switch to another task`}</code></pre>

      <h2 id="coroutines">Coroutines: async def and await</h2>

      <pre><code>{`# async def — defines a coroutine function
async def fetch(url: str) -> str:
    # await — suspends this coroutine until the awaitable completes
    # event loop runs other coroutines while waiting
    response = await http_get(url)
    return response.text

# Calling a coroutine function returns a coroutine object — does NOT run it
coro = fetch("https://api.example.com")   # nothing happens yet
type(coro)   # <class 'coroutine'>

# Run it with await (inside another async function)
async def main():
    result = await fetch("https://api.example.com")
    print(result)

# Run it with asyncio.run (from sync code)
asyncio.run(main())

# await works with:
# - coroutines (async def functions)
# - asyncio.Task objects
# - asyncio.Future objects
# - anything implementing __await__`}</code></pre>

      <h2 id="asyncio">asyncio Basics</h2>

      <pre><code>{`import asyncio

# sleep — async version of time.sleep
# yields control to event loop for the duration
async def demo():
    await asyncio.sleep(1)   # other tasks can run during this

# Run coroutine sequentially (awaiting each)
async def sequential():
    a = await fetch("url_a")   # waits for a before starting b
    b = await fetch("url_b")   # total: time_a + time_b
    return a, b

# Run coroutine concurrently (gather)
async def concurrent():
    a, b = await asyncio.gather(
        fetch("url_a"),   # both start immediately
        fetch("url_b"),   # total: max(time_a, time_b)
    )
    return a, b

# asyncio.sleep vs time.sleep
async def bad():
    time.sleep(1)       # BLOCKS the event loop — no other tasks can run!

async def good():
    await asyncio.sleep(1)   # yields — other tasks run during wait

# Queue for producer-consumer
async def producer(queue):
    for i in range(5):
        await queue.put(i)
        await asyncio.sleep(0.1)

async def consumer(queue):
    while True:
        item = await queue.get()
        print(f"consumed: {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue()
    await asyncio.gather(producer(queue), consumer(queue))`}</code></pre>

      <h2 id="gather-tasks">gather() and Tasks</h2>

      <pre><code>{`import asyncio

# asyncio.gather — run multiple coroutines concurrently, wait for all
async def main():
    results = await asyncio.gather(
        fetch("url_a"),
        fetch("url_b"),
        fetch("url_c"),
    )
    # results is a list in the same order as the arguments
    print(results)   # ["data_a", "data_b", "data_c"]

# gather with error handling
results = await asyncio.gather(
    fetch("url_a"),
    fetch("bad_url"),
    return_exceptions=True   # exceptions returned as values, not raised
)
for r in results:
    if isinstance(r, Exception):
        print(f"failed: {r}")
    else:
        print(f"success: {r}")

# asyncio.create_task — schedule a coroutine as a background Task
async def main():
    # Task starts immediately, runs concurrently
    task_a = asyncio.create_task(fetch("url_a"), name="fetch_a")
    task_b = asyncio.create_task(fetch("url_b"), name="fetch_b")

    # Do other work while tasks run in background
    print("tasks started, doing other work...")

    # Await the results when needed
    result_a = await task_a
    result_b = await task_b

# asyncio.wait — more control than gather
done, pending = await asyncio.wait(
    [task_a, task_b, task_c],
    timeout=5.0,                              # cancel after 5s
    return_when=asyncio.FIRST_COMPLETED       # or ALL_COMPLETED, FIRST_EXCEPTION
)

# asyncio.timeout (Python 3.11+)
async def fetch_with_timeout(url):
    async with asyncio.timeout(5.0):
        return await fetch(url)   # TimeoutError if > 5s

# asyncio.wait_for (older API)
result = await asyncio.wait_for(fetch(url), timeout=5.0)`}</code></pre>

      <h2 id="blocking-io">Blocking vs Non-blocking I/O</h2>

      <pre><code>{`# The golden rule: never call blocking code in an async function
# It freezes the event loop — all other coroutines pause

# WRONG — blocks the event loop
async def process():
    data = open("big_file.txt").read()    # sync file I/O — blocks!
    result = requests.get("https://...")  # sync HTTP — blocks!
    time.sleep(1)                         # sync sleep — blocks!

# RIGHT — use async equivalents
import aiofiles
import httpx

async def process():
    async with aiofiles.open("big_file.txt") as f:
        data = await f.read()             # async file I/O

    async with httpx.AsyncClient() as client:
        resp = await client.get("https://...")  # async HTTP

    await asyncio.sleep(1)                # async sleep

# If you MUST call blocking code (e.g. a sync library),
# run it in a thread pool so it doesn't block the event loop
import asyncio

def sync_heavy_task():
    time.sleep(2)   # blocking
    return "done"

async def main():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, sync_heavy_task)
    # None = default ThreadPoolExecutor`}</code></pre>

      <h2 id="async-patterns">Async Patterns</h2>

      <h3>Async context manager</h3>
      <pre><code>{`# __aenter__ and __aexit__ for async with
class AsyncDBConnection:
    async def __aenter__(self):
        self.conn = await connect_db()
        return self.conn

    async def __aexit__(self, *args):
        await self.conn.close()

async def main():
    async with AsyncDBConnection() as conn:
        result = await conn.fetch("SELECT 1")

# @asynccontextmanager
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_connection():
    conn = await connect_db()
    try:
        yield conn
    finally:
        await conn.close()`}</code></pre>

      <h3>Async iterator</h3>
      <pre><code>{`# __aiter__ and __anext__ for async for
class AsyncRange:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.i >= self.n:
            raise StopAsyncIteration
        await asyncio.sleep(0.01)   # simulate async work
        value = self.i
        self.i += 1
        return value

async def main():
    async for n in AsyncRange(5):
        print(n)

# async generator (simpler)
async def async_range(n):
    for i in range(n):
        await asyncio.sleep(0.01)
        yield i

async def main():
    async for n in async_range(5):
        print(n)`}</code></pre>

      <h2 id="async-in-fastapi">Async in FastAPI</h2>

      <pre><code>{`from fastapi import FastAPI
import httpx

app = FastAPI()

# async route handler — handles many concurrent requests efficiently
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.example.com/users/{user_id}")
    return resp.json()

# sync route handler — FastAPI runs it in a threadpool automatically
@app.get("/slow")
def slow_endpoint():
    time.sleep(1)   # blocking — FastAPI handles this correctly for sync routes
    return {"status": "done"}

# Rule: use async def when you await async operations
#       use def when you call blocking sync code (FastAPI uses a threadpool)
#       don't mix: never call time.sleep() or requests.get() in async def routes`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>

      <pre><code>{`# 1. Forgetting await — coroutine never runs
async def bad():
    result = fetch("url")   # returns coroutine object, not data!
    print(result)           # <coroutine object fetch at 0x...>

async def good():
    result = await fetch("url")   # actually runs

# 2. Sequential awaits when gather is possible
# Slow:
a = await fetch("url_a")   # 1s
b = await fetch("url_b")   # 1s
# total: 2s

# Fast:
a, b = await asyncio.gather(fetch("url_a"), fetch("url_b"))
# total: ~1s

# 3. Mixing sync and async — blocking the event loop
async def bad():
    response = requests.get("https://...")  # BLOCKS loop
    # Use httpx.AsyncClient or aiohttp instead

# 4. Running asyncio.run() inside an already-running loop
# (common in Jupyter notebooks)
# asyncio.run(main())  # RuntimeError: event loop already running
# Fix: use await directly, or use nest_asyncio

# 5. Creating tasks without awaiting them
async def bad():
    asyncio.create_task(background_job())   # task created but never awaited
    # may never complete or exceptions are silently lost

async def good():
    task = asyncio.create_task(background_job())
    # ... do other work ...
    await task   # ensure completion`}</code></pre>

      <h2 id="js-comparison">Python Async vs JavaScript</h2>

      <pre><code>{`// JavaScript                              # Python

// Async function
async function fetch(url) {               async def fetch(url: str) -> str:
  return await httpGet(url);                  return await http_get(url)
}

// Promise / coroutine
fetch("url")                              fetch("url")
// returns Promise                        # returns coroutine (not started)

// Await
const result = await fetch("url");        result = await fetch("url")

// Promise.all / gather
await Promise.all([f("a"), f("b")]);      await asyncio.gather(f("a"), f("b"))

// Promise.allSettled
await Promise.allSettled([...]);          await asyncio.gather(..., return_exceptions=True)

// setTimeout / sleep
await new Promise(r => setTimeout(r, 1000)); await asyncio.sleep(1)

// Event loop
// Built into JS runtime (browser / Node)  # Must start explicitly: asyncio.run()
// Always running                           # Or use async framework (FastAPI, etc.)

// Key differences:
// JS event loop runs automatically        Python event loop is explicit
// JS Promises auto-schedule              Python coroutines are lazy (must await)
// JS has no GIL                          Python GIL limits threading
// JS: async everywhere (callbacks, events) Python: async is opt-in`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain Python Async in a Senior Interview"
        intro="Strong answers separate the scheduling model from the performance model instead of saying “async is faster.”"
        steps={[
          "Start by naming the workload: asyncio is best for I/O-bound concurrency, not CPU-bound parallelism.",
          "Explain the event loop precisely: coroutines run until they hit await, then yield control so another ready task can run.",
          "Call out the GIL tradeoff directly: threading helps overlap waits, but multiprocessing is still the right tool for real CPU parallelism.",
          "Mention failure modes that show experience: blocking calls inside async def, forgetting await, orphaned tasks, and missing timeout or cancellation handling.",
          "Close with a production example such as FastAPI calling several upstream services concurrently with asyncio.gather and bounded timeouts."
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is a coroutine?</h3>
      <p>
        A function defined with <code>async def</code> that can suspend its execution at{" "}
        <code>await</code> points and yield control to the event loop. Calling a coroutine
        function returns a coroutine object — the body does not run until you{" "}
        <code>await</code> it or schedule it as a task.
      </p>

      <h3>2. What does <code>await</code> do?</h3>
      <p>
        Suspends the current coroutine and gives control back to the event loop until the
        awaitable completes. The event loop runs other ready coroutines in the meantime.
        When the awaitable finishes, the suspended coroutine resumes from where it left off
        with the result.
      </p>

      <h3>3. What is the event loop?</h3>
      <p>
        The scheduler that manages coroutines. It maintains a queue of ready coroutines,
        picks one, runs it until it hits an <code>await</code>, then picks the next ready
        one. When an I/O operation completes, the event loop moves the waiting coroutine
        back to the ready queue.
      </p>

      <h3>4. What is the difference between async and threading?</h3>
      <p>
        Async uses a single thread with cooperative multitasking — tasks voluntarily yield
        at <code>await</code> points. Threading uses multiple threads with preemptive
        switching managed by the OS. Async has lower overhead and avoids race conditions.
        Threading works with blocking libraries. For I/O-bound Python code, async is
        generally preferred.
      </p>

      <h3>5. What is the difference between concurrency and parallelism?</h3>
      <p>
        Concurrency means dealing with multiple tasks that can make progress — but not
        necessarily at the same instant (one CPU, tasks interleave). Parallelism means
        tasks literally run at the same time on multiple CPUs. Python&apos;s asyncio and
        threading give concurrency. Only <code>multiprocessing</code> and{" "}
        <code>ProcessPoolExecutor</code> give true parallelism (bypassing the GIL).
      </p>

      <h3>6. When should you use async Python?</h3>
      <p>
        For I/O-bound work: HTTP requests, database queries, file I/O, waiting for
        external services. Async shines when you have many concurrent I/O operations and
        want to handle them with minimal thread overhead. Do not use async for CPU-bound
        work — it will not help because the GIL is still held and there is no real
        parallelism.
      </p>

      <h3>7. What happens if you call a blocking function inside an async function?</h3>
      <p>
        The entire event loop blocks — no other coroutines can run until the blocking
        call returns. This defeats the purpose of async. Use async equivalents (
        <code>httpx</code>, <code>aiofiles</code>, <code>asyncpg</code>) or run the
        blocking call in a thread pool with{" "}
        <code>loop.run_in_executor(None, blocking_fn)</code>.
      </p>

      <h3>8. What is the GIL and how does it affect async code?</h3>
      <p>
        The Global Interpreter Lock is a mutex in CPython that allows only one thread to
        execute Python bytecode at a time. For asyncio, the GIL is irrelevant — async
        code runs on a single thread anyway. For <code>threading</code>, the GIL means
        threads cannot achieve CPU parallelism in Python, but they can run concurrently
        during I/O waits (the GIL is released during I/O).
      </p>

      <h3>9. What is <code>asyncio.gather()</code> vs <code>asyncio.create_task()</code>?</h3>
      <p>
        <code>gather()</code> takes coroutines or awaitables, schedules them concurrently,
        and returns a single awaitable that resolves to a list of results.{" "}
        <code>create_task()</code> schedules a single coroutine as a background Task that
        starts immediately. Use <code>gather</code> when you want results from a group of
        coroutines. Use <code>create_task</code> when you want to fire and continue,
        collecting the result later.
      </p>

      <h3>10. What is <code>asyncio.run()</code>?</h3>
      <p>
        The top-level entry point for running async code from synchronous context. Creates
        a new event loop, runs the given coroutine until it completes, then closes the
        loop. Call it once, at the top level — not inside an already-running event loop.
        Introduced in Python 3.7.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Sequential vs concurrent timing</h3>
      <p>
        Write two versions of a function that &quot;fetches&quot; 5 URLs (simulate with{" "}
        <code>asyncio.sleep(1)</code> each): one sequential (awaiting each), one concurrent
        (using <code>gather</code>). Time both and confirm the speedup.
      </p>

      <h3>Exercise 2 — Async context manager</h3>
      <p>
        Implement <code>AsyncTimer</code> as an async context manager (using{" "}
        <code>__aenter__</code>/<code>__aexit__</code>) that records elapsed time. Then
        rewrite it using <code>@asynccontextmanager</code>.
      </p>

      <h3>Exercise 3 — Task with timeout</h3>
      <p>
        Write <code>fetch_with_fallback(url, timeout_sec, fallback)</code> that tries to
        fetch a URL asynchronously. If it times out, return the fallback value instead of
        raising. Use <code>asyncio.wait_for</code>.
      </p>

      <h3>Exercise 4 — gather with error handling</h3>
      <p>
        Fetch a list of 10 URLs concurrently. Some will &quot;fail&quot; (raise an
        exception). Use <code>return_exceptions=True</code> to collect results, then
        separate successful responses from failures. Print a summary.
      </p>

      <h3>Exercise 5 — Async generator pipeline</h3>
      <p>
        Build an async data pipeline:
      </p>
      <ul>
        <li><code>async def produce(n)</code> — yields integers 0..n with a small delay</li>
        <li><code>async def transform(source)</code> — yields each value doubled</li>
        <li><code>async def consume(source)</code> — collects results into a list</li>
      </ul>
      <p>Compose and run the pipeline.</p>

      <h3>Exercise 6 — run_in_executor</h3>
      <p>
        You have a synchronous <code>parse_csv(path: str) -&gt; list</code> function that
        takes ~2 seconds. Call it from an async context without blocking the event loop
        using <code>run_in_executor</code>. Run 3 CSV files concurrently and time the
        total.
      </p>
    </div>
  );
}
