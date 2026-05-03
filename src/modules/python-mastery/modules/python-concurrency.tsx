import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const concurrencyModelsDiagram = String.raw`flowchart LR
    ASYNC["asyncio<br/>1 thread, 1 process<br/>best for I/O with async libraries"] --> DECIDE["Choose by bottleneck"]
    THREADS["threading<br/>shared memory, blocking libs<br/>not true CPU parallelism"] --> DECIDE
    PROC["multiprocessing<br/>separate memory, true CPU parallelism"] --> DECIDE`;

const concurrencyDecisionDiagram = String.raw`flowchart TD
    START["What is the bottleneck?"]
    IO["I/O-bound"]
    CPU["CPU-bound"]
    ASYNCLIB["Can you use async-native libraries?"]
    CEXT["Does the hot path release the GIL?"]
    ARES["Use asyncio"]
    TRES["Use ThreadPoolExecutor / threads"]
    PRES["Use ProcessPoolExecutor / multiprocessing"]

    START --> IO
    START --> CPU
    IO --> ASYNCLIB
    ASYNCLIB -->|Yes| ARES
    ASYNCLIB -->|No| TRES
    CPU --> CEXT
    CEXT -->|Yes| TRES
    CEXT -->|No| PRES`;

export const toc: TocItem[] = [
  { id: "concurrency-models", title: "Python's Three Concurrency Models", level: 2 },
  { id: "gil", title: "The GIL — What It Really Means", level: 2 },
  { id: "threading", title: "Threading", level: 2 },
  { id: "multiprocessing", title: "Multiprocessing", level: 2 },
  { id: "concurrent-futures", title: "concurrent.futures", level: 2 },
  { id: "asyncio-recap", title: "asyncio vs Threading vs Multiprocessing", level: 2 },
  { id: "sync-primitives", title: "Synchronisation Primitives", level: 2 },
  { id: "patterns", title: "Common Concurrency Patterns", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function PythonConcurrency() {
  return (
    <div className="article-content">
      <p>
        Concurrency is one of the most common senior Python interview topics — and one
        of the most misunderstood. The GIL does not mean Python cannot do concurrent work.
        It means you need to choose the <em>right</em> model for your workload. This module
        builds the complete mental model.
      </p>

      <h2 id="concurrency-models">Python&apos;s Three Concurrency Models</h2>

      <MermaidDiagram
        chart={concurrencyModelsDiagram}
        title="Three Concurrency Models"
        caption="Each model solves a different problem. Strong Python engineers decide from the bottleneck first, then choose the primitive."
        minHeight={400}
      />

      <h2 id="gil">The GIL — What It Really Means</h2>

      <pre><code>{`# GIL = Global Interpreter Lock
# A mutex in CPython that allows only ONE thread to execute Python
# bytecode at any given time.

# What the GIL DOES cause:
# - Threading cannot achieve CPU parallelism in Python
# - Two threads cannot execute Python code simultaneously on two CPUs

# What the GIL does NOT prevent:
# - Concurrency via async (single-threaded — irrelevant)
# - Threads running I/O concurrently (GIL released during I/O syscalls)
# - Threads running C extensions in parallel (NumPy, etc. release GIL)
# - Multiprocessing (each process has its own GIL)

# Demo: threads are limited for CPU work
import threading, time

def count(n):
    while n > 0: n -= 1

# Single-threaded
start = time.time()
count(50_000_000)
count(50_000_000)
print(f"sequential: {time.time()-start:.2f}s")   # ~4s

# Multi-threaded — NOT faster for CPU work (GIL!)
start = time.time()
t1 = threading.Thread(target=count, args=(50_000_000,))
t2 = threading.Thread(target=count, args=(50_000_000,))
t1.start(); t2.start()
t1.join();  t2.join()
print(f"threaded:   {time.time()-start:.2f}s")   # ~4s (same or slower)

# GIL is released during:
# - I/O operations (file read, network, sleep)
# - C extension code that explicitly releases it (NumPy, hashlib)
# - time.sleep()`}</code></pre>

      <h2 id="threading">Threading</h2>

      <pre><code>{`import threading
import time

# Basic thread
def worker(name, delay):
    time.sleep(delay)   # GIL released — other threads run
    print(f"{name} done")

t = threading.Thread(target=worker, args=("Task A", 1), daemon=True)
t.start()
t.join()   # wait for thread to complete

# daemon=True: thread dies when main program exits

# Thread with result (use a list to share — no return value from thread)
results = []
def fetch(url, results):
    data = requests.get(url).text   # GIL released during network I/O
    results.append(data)

threads = []
for url in urls:
    t = threading.Thread(target=fetch, args=(url, results))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

# ThreadLocal — per-thread storage (no sharing)
local = threading.local()

def worker():
    local.connection = create_connection()  # each thread gets its own
    do_work(local.connection)

# Thread pool (manual)
from queue import Queue

def worker(q):
    while True:
        task = q.get()
        if task is None: break
        process(task)
        q.task_done()

q = Queue()
workers = [threading.Thread(target=worker, args=(q,)) for _ in range(4)]
for w in workers: w.start()
for task in tasks: q.put(task)
q.join()
for _ in workers: q.put(None)  # signal workers to stop`}</code></pre>

      <h2 id="multiprocessing">Multiprocessing</h2>

      <pre><code>{`import multiprocessing as mp
import time

# Basic process — separate memory space, separate GIL
def cpu_task(n):
    return sum(i * i for i in range(n))

p = mp.Process(target=cpu_task, args=(10_000_000,))
p.start()
p.join()

# Process Pool — parallel CPU work
with mp.Pool(processes=mp.cpu_count()) as pool:
    results = pool.map(cpu_task, [10_000_000] * 4)   # runs 4 tasks in parallel
    # pool.map blocks until all done
    # pool.map_async for non-blocking

# ProcessPoolExecutor (cleaner API — see concurrent.futures section)

# Shared state — processes have SEPARATE memory
# To share data across processes:

# 1. Queue — safe inter-process communication
q = mp.Queue()
def producer(q):
    q.put("data")
def consumer(q):
    item = q.get()

# 2. Value / Array — shared memory
from multiprocessing import Value, Array
counter = Value('i', 0)   # 'i' = int

def increment(counter):
    with counter.get_lock():
        counter.value += 1

# 3. Manager — proxy objects for dicts, lists (slower but flexible)
with mp.Manager() as manager:
    shared_dict = manager.dict()
    shared_list = manager.list()

# Pickling requirement:
# All args passed to a process MUST be picklable (serialisable)
# Lambdas, local functions, file handles cannot be pickled — use top-level functions

# Startup overhead: each process spawns a Python interpreter (~100ms)
# Don't use multiprocessing for small/short tasks — use thread pool or asyncio`}</code></pre>

      <h2 id="concurrent-futures">concurrent.futures</h2>

      <p>
        The high-level interface for both threading and multiprocessing. Prefer this
        over raw <code>threading.Thread</code> or <code>mp.Pool</code> in most cases.
      </p>

      <pre><code>{`from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

# ThreadPoolExecutor — I/O-bound tasks
def fetch(url):
    return requests.get(url).text

urls = ["https://a.com", "https://b.com", "https://c.com"]

with ThreadPoolExecutor(max_workers=10) as executor:
    # map — same order as input, blocks until all done
    results = list(executor.map(fetch, urls))

    # submit — returns Future objects, process as completed
    futures = {executor.submit(fetch, url): url for url in urls}
    for future in as_completed(futures):
        url = futures[future]
        try:
            data = future.result()
        except Exception as e:
            print(f"{url} failed: {e}")

# ProcessPoolExecutor — CPU-bound tasks
def compress(data):
    import zlib
    return zlib.compress(data)

chunks = [b"data" * 10000 for _ in range(8)]

with ProcessPoolExecutor(max_workers=mp.cpu_count()) as executor:
    compressed = list(executor.map(compress, chunks))

# timeout on individual tasks
future = executor.submit(heavy_task)
try:
    result = future.result(timeout=5.0)
except TimeoutError:
    future.cancel()

# Combine with asyncio — run sync blocking code in thread pool
import asyncio

async def main():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, blocking_fn)  # None = default ThreadPoolExecutor
    # or with ProcessPoolExecutor:
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_bound_fn)`}</code></pre>

      <h2 id="asyncio-recap">asyncio vs Threading vs Multiprocessing</h2>

      <MermaidDiagram
        chart={concurrencyDecisionDiagram}
        title="Which Concurrency Model?"
        caption="This decision path is the answer interviewers want when they ask ‘would you use asyncio, threads, or processes here?’"
        minHeight={460}
      />

      <h2 id="sync-primitives">Synchronisation Primitives</h2>

      <pre><code>{`import threading

# ── Lock — mutual exclusion ────────────────────────────────────────────
lock = threading.Lock()

def safe_increment(counter, lock):
    with lock:           # acquire on entry, release on exit (even if exception)
        counter[0] += 1  # critical section — only one thread at a time

# RLock — reentrant lock (same thread can acquire multiple times)
rlock = threading.RLock()

# ── Event — signal between threads ────────────────────────────────────
event = threading.Event()

def producer():
    time.sleep(1)
    event.set()        # signal consumers

def consumer():
    event.wait()       # blocks until event is set
    print("got signal")

# ── Semaphore — limit concurrent access ───────────────────────────────
sem = threading.Semaphore(5)   # max 5 threads in critical section

def limited_worker():
    with sem:
        do_work()      # at most 5 workers at a time

# ── Condition — wait for a condition ──────────────────────────────────
condition = threading.Condition()
buffer = []

def producer():
    with condition:
        buffer.append("item")
        condition.notify()     # wake up one waiting thread

def consumer():
    with condition:
        while not buffer:
            condition.wait()   # release lock and sleep until notify
        item = buffer.pop()

# ── Queue — thread-safe data exchange ─────────────────────────────────
from queue import Queue

q = Queue(maxsize=10)   # bounded queue — blocks producer when full

def producer(q):
    q.put(item)         # blocks if queue full

def consumer(q):
    item = q.get()      # blocks if queue empty
    q.task_done()       # signal task complete

q.join()    # wait until all items have been processed

# ── asyncio Locks ─────────────────────────────────────────────────────
import asyncio
lock = asyncio.Lock()          # use in async functions
sem  = asyncio.Semaphore(10)   # limit concurrent coroutines
event = asyncio.Event()

async def worker():
    async with lock:
        await do_async_work()

async def limited():
    async with sem:
        await fetch("url")`}</code></pre>

      <h2 id="patterns">Common Concurrency Patterns</h2>

      <pre><code>{`# ── Producer-Consumer ─────────────────────────────────────────────────
from queue import Queue
import threading

def producer(q, items):
    for item in items:
        q.put(item)
    q.put(None)   # poison pill to stop consumer

def consumer(q, results):
    while True:
        item = q.get()
        if item is None:
            break
        results.append(process(item))

q = Queue()
results = []
t_prod = threading.Thread(target=producer, args=(q, data))
t_cons = threading.Thread(target=consumer, args=(q, results))
t_prod.start(); t_cons.start()
t_prod.join();  t_cons.join()

# ── Fan-out / Fan-in with ThreadPoolExecutor ──────────────────────────
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch(url):
    return requests.get(url).json()

with ThreadPoolExecutor(max_workers=20) as pool:
    future_to_url = {pool.submit(fetch, url): url for url in urls}
    results = {}
    for future in as_completed(future_to_url):
        url = future_to_url[future]
        try:
            results[url] = future.result()
        except Exception as e:
            results[url] = {"error": str(e)}

# ── Parallel map with ProcessPool ─────────────────────────────────────
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

def process_chunk(chunk):
    return [heavy_computation(item) for item in chunk]

def parallel_map(fn, items, n_workers=None):
    n_workers = n_workers or multiprocessing.cpu_count()
    chunk_size = max(1, len(items) // n_workers)
    chunks = [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]
    with ProcessPoolExecutor(max_workers=n_workers) as pool:
        results = pool.map(process_chunk, chunks)
    return [item for chunk in results for item in chunk]

# ── Async + thread pool for mixed workloads ───────────────────────────
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def mixed_pipeline(urls, files):
    loop = asyncio.get_running_loop()

    # Async HTTP (I/O, no threads needed)
    async with httpx.AsyncClient() as client:
        http_tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*http_tasks)

    # Blocking file I/O (offload to thread pool)
    file_tasks = [
        loop.run_in_executor(executor, read_large_file, path)
        for path in files
    ]
    file_data = await asyncio.gather(*file_tasks)

    return responses, file_data`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is the GIL and why does Python have it?</h3>
      <p>
        The Global Interpreter Lock is a mutex in CPython that ensures only one thread
        executes Python bytecode at a time. It exists for memory safety — CPython&apos;s
        memory management (reference counting) is not thread-safe without it. The GIL
        simplifies CPython internals and makes single-threaded Python fast, but prevents
        multi-core CPU parallelism in threads.
      </p>

      <h3>2. Does the GIL mean threading is useless in Python?</h3>
      <p>
        No. The GIL is released during I/O operations (network, disk, <code>time.sleep</code>)
        and C extensions that explicitly release it (NumPy, hashlib). Threading is very
        effective for I/O-bound workloads — multiple threads can wait for I/O
        concurrently. It only prevents CPU parallelism for pure Python code.
      </p>

      <h3>3. When would you use multiprocessing over threading?</h3>
      <p>
        CPU-bound work where you need true parallelism: data processing, image
        manipulation, compression, ML inference without a C extension. Each process gets
        its own GIL so they run on separate CPU cores simultaneously. The trade-off:
        process startup overhead (~100ms), separate memory spaces (data must be pickled
        to pass between processes), and no shared state without explicit IPC.
      </p>

      <h3>4. What is <code>concurrent.futures</code> and when should you use it?</h3>
      <p>
        A high-level interface over both threading and multiprocessing.{" "}
        <code>ThreadPoolExecutor</code> for I/O-bound tasks,{" "}
        <code>ProcessPoolExecutor</code> for CPU-bound tasks. Prefer it over raw{" "}
        <code>threading.Thread</code> or <code>mp.Pool</code> — it manages the pool
        lifecycle, returns <code>Future</code> objects, and handles exceptions cleanly
        via <code>future.result()</code>.
      </p>

      <h3>5. How do you run blocking code in an async application?</h3>
      <p>
        Use <code>loop.run_in_executor(None, blocking_fn)</code> — this runs the function
        in the default thread pool without blocking the event loop. For CPU-bound work,
        pass a <code>ProcessPoolExecutor</code> instead of <code>None</code>. This is the
        bridge between sync blocking libraries and an async FastAPI application.
      </p>

      <h3>6. What is a race condition? Give a Python example.</h3>
      <p>
        When two threads read-modify-write shared state and the result depends on timing.
        Example: <code>counter += 1</code> is three operations (read, add, write). If two
        threads execute it simultaneously, one write can be lost. Fix with a{" "}
        <code>threading.Lock</code> around the critical section.
      </p>

      <h3>7. What is a deadlock?</h3>
      <p>
        Two (or more) threads each hold a lock the other needs — both wait forever.
        Example: Thread A holds Lock1 and waits for Lock2; Thread B holds Lock2 and waits
        for Lock1. Prevention: always acquire locks in the same order, use timeouts on
        <code>lock.acquire(timeout=5)</code>, or use a single lock when possible.
      </p>

      <h3>8. How is asyncio different from threading for concurrency?</h3>
      <p>
        asyncio uses cooperative multitasking on a single thread — coroutines explicitly
        yield at <code>await</code> points. Threading uses preemptive multitasking managed
        by the OS — threads can be interrupted at any time. asyncio has lower overhead
        (no thread creation, no context switching overhead) and avoids race conditions
        (single-threaded). Threading works with blocking libraries without modification.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — GIL verification</h3>
      <p>
        Write a CPU-bound function (count down from 50M). Time it running: (a)
        sequentially, (b) with two threads, (c) with two processes. Confirm threads are
        no faster but processes are. Explain the result.
      </p>

      <h3>Exercise 2 — Thread-safe counter</h3>
      <p>
        Start 100 threads, each incrementing a shared counter 1000 times. First, do it
        without a lock — observe the lost updates. Then add a <code>threading.Lock</code>
        and verify the final value is exactly 100,000.
      </p>

      <h3>Exercise 3 — ThreadPoolExecutor fetch</h3>
      <p>
        Simulate fetching 20 URLs (use <code>time.sleep(random.uniform(0.1, 0.5))</code>
        to simulate I/O). Use <code>ThreadPoolExecutor(max_workers=5)</code> and{" "}
        <code>as_completed</code>. Print each result as it arrives. Time total vs
        sequential.
      </p>

      <h3>Exercise 4 — ProcessPool CPU benchmark</h3>
      <p>
        Write <code>is_prime(n)</code>. Check all numbers in range(10_000, 15_000) for
        primality. Compare sequential, <code>ThreadPoolExecutor</code>, and{" "}
        <code>ProcessPoolExecutor</code>. Which wins and why?
      </p>

      <h3>Exercise 5 — Producer-consumer with Queue</h3>
      <p>
        Build a pipeline: 1 producer thread generates 50 work items with a small delay.
        3 consumer threads process items and write results to a shared list (protected
        by a Lock). Use a <code>Queue</code> for hand-off. Use a poison pill to stop
        consumers cleanly.
      </p>

      <h3>Exercise 6 — run_in_executor bridge</h3>
      <p>
        You have a sync blocking function <code>parse_large_file(path)</code> that takes
        ~1 second. Write an async FastAPI route that calls it for 5 files concurrently
        using <code>run_in_executor</code> without blocking the event loop. Verify with
        timing.
      </p>
    </div>
  );
}
