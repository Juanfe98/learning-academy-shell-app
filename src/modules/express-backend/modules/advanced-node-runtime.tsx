import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const backpressureDiagram = String.raw`flowchart LR
  Source[Readable stream\nfile/socket/db cursor] --> Buffer[Internal buffer]
  Buffer --> Transform[Transform stream\nparse/compress/encrypt]
  Transform --> Sink[Writable stream\nHTTP response/S3/file]
  Sink -- slow consumer --> Buffer
  Buffer -- highWaterMark reached --> Source`;

export const toc: TocItem[] = [
  { id: "streams-backpressure", title: "Streams and Backpressure", level: 2 },
  { id: "buffers", title: "Buffers and Binary Data", level: 2 },
  { id: "abort-controller", title: "AbortController and Cancellation", level: 2 },
  { id: "threadpool", title: "libuv Thread Pool Tuning", level: 2 },
  { id: "worker-threads", title: "Worker Threads for CPU Work", level: 2 },
  { id: "memory-model", title: "Memory, GC, and Leak Signals", level: 2 },
  { id: "senior-interview-checklist", title: "Senior Interview Checklist", level: 2 },
];

export default function AdvancedNodeRuntime() {
  return (
    <div className="article-content">
      <p>
        Senior Node.js interviews often move beyond Express syntax into runtime behavior: what blocks
        the event loop, how streams protect memory, when worker threads are appropriate, and how to
        cancel slow downstream calls. This lesson fills that runtime gap.
      </p>

      <h2 id="streams-backpressure">Streams and Backpressure</h2>
      <MermaidDiagram chart={backpressureDiagram} title="Stream Backpressure" minHeight={320} />
      <p>
        Streams process data incrementally instead of loading the entire payload into memory. They are
        essential for large files, CSV imports, proxying HTTP responses, video, logs, and database
        exports. <strong>Backpressure</strong> is the signal that the consumer is slower than the producer.
      </p>
      <pre><code>{`import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import zlib from "node:zlib";

app.get("/download", async (req, res, next) => {
  try {
    res.setHeader("content-encoding", "gzip");
    await pipeline(
      createReadStream("./large-report.csv"),
      zlib.createGzip(),
      res,
    );
  } catch (err) {
    next(err);
  }
});

// Prefer pipeline() over manual .pipe() chains because it forwards errors
// and cleans up all streams when one stage fails.`}</code></pre>

      <h2 id="buffers">Buffers and Binary Data</h2>
      <p>
        <code>Buffer</code> represents raw bytes outside normal JavaScript strings. Use it for cryptography,
        uploads, binary protocols, and encoding conversions. Interview trap: <code>Buffer.byteLength(str)</code>
        can differ from <code>str.length</code> because UTF-8 characters may use multiple bytes.
      </p>

      <h2 id="abort-controller">AbortController and Cancellation</h2>
      <p>
        Production APIs should not wait forever on downstream services. Use <code>AbortController</code>
        with native <code>fetch</code>, database/query timeouts, and job cancellation semantics.
      </p>
      <pre><code>{`const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 2_000);

try {
  const response = await fetch("https://payments.internal/charge", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  return await response.json();
} finally {
  clearTimeout(timeout);
}`}</code></pre>

      <h2 id="threadpool">libuv Thread Pool Tuning</h2>
      <p>
        Node offloads some operations to libuv&apos;s thread pool: file system work, DNS lookup variants,
        compression, and expensive crypto such as bcrypt/pbkdf2. The default pool size is small. If
        many password hashes or zlib tasks run concurrently, unrelated file operations may queue.
      </p>
      <pre><code>{`# Must be set before Node starts
UV_THREADPOOL_SIZE=16 node dist/server.js

# Do not blindly max it out. More threads can increase context switching
# and memory pressure. Measure latency and event loop utilization first.`}</code></pre>

      <h2 id="worker-threads">Worker Threads for CPU Work</h2>
      <p>
        Async I/O does not make CPU-heavy JavaScript non-blocking. JSON transformations, image work,
        report generation, and cryptographic loops can block the event loop. Move CPU-heavy work to
        worker threads, separate services, or background queues.
      </p>

      <h2 id="memory-model">Memory, GC, and Leak Signals</h2>
      <p>
        A healthy Node process has stable heap usage after garbage collection. Warning signs are rising
        old-space heap, growing listeners, unbounded maps/caches, retained request objects, and queues
        that grow faster than workers consume them.
      </p>
      <ul>
        <li>Use bounded caches with TTL/size limits.</li>
        <li>Remove event listeners and intervals on shutdown.</li>
        <li>Avoid storing <code>req</code>/<code>res</code> objects in long-lived closures.</li>
        <li>Capture heap snapshots before and after load to compare retaining paths.</li>
      </ul>

      <h2 id="senior-interview-checklist">Senior Interview Checklist</h2>
      <ul>
        <li>Explain backpressure and why <code>pipeline()</code> is safer than ad-hoc piping.</li>
        <li>Know when async I/O is enough and when worker threads/background jobs are required.</li>
        <li>Discuss cancellation, timeouts, and resource cleanup.</li>
        <li>Describe how you would investigate a memory leak or event loop stall.</li>
      </ul>
    </div>
  );
}
