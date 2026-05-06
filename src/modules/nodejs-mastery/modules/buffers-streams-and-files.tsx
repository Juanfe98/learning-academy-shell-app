import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const streamPipeline = String.raw`flowchart LR
    SRC["Readable<br/>File, socket, request body"] --> TR1["Transform<br/>parse / compress / filter"]
    TR1 --> TR2["Transform<br/>enrich / validate"]
    TR2 --> DEST["Writable<br/>Response, file, DB sink"]
    BP["Backpressure signal"] -. slows producer .-> SRC`;

export const toc: TocItem[] = [
  { id: "buffers", title: "Buffers", level: 2 },
  { id: "stream-model", title: "The Stream Model", level: 2 },
  { id: "pipeline", title: "Pipeline and Backpressure", level: 2 },
  { id: "filesystem", title: "File System Patterns", level: 2 },
  { id: "large-files", title: "Large File Scenarios", level: 2 },
];

export default function BuffersStreamsAndFiles() {
  return (
    <div className="article-content">
      <p>
        If Node.js has a signature superpower beyond the event loop, it is
        stream-oriented I/O. Buffers let you work with raw bytes. Streams let
        you process those bytes incrementally. That combination is why Node
        feels so natural for proxies, uploads, downloads, ETL jobs, and any
        workflow where &quot;load the whole thing into memory&quot; would be
        careless.
      </p>

      <h2 id="buffers">Buffers</h2>
      <p>
        JavaScript strings are text. Buffers are bytes. Whenever you deal with
        files, network data, compression, hashing, or binary protocols, bytes
        matter. Node&apos;s <code>Buffer</code> type is a specialized view over
        binary memory and is heavily optimized for these scenarios.
      </p>

      <pre>
        <code>{`const text = "Node";
const buf = Buffer.from(text, "utf8");

console.log(buf);           // <Buffer 4e 6f 64 65>
console.log(buf.length);    // 4 bytes
console.log(buf.toString("utf8"));`}</code>
      </pre>

      <h2 id="stream-model">The Stream Model</h2>
      <MermaidDiagram
        chart={streamPipeline}
        title="Readable -> Transform -> Writable"
        caption="Streams are about moving data progressively instead of waiting for the entire payload to exist in memory first."
        minHeight={430}
      />

      <ArticleTable
        caption="Knowing the four stream types is table-stakes Node.js knowledge."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Can read</th>
              <th>Can write</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Readable</td>
              <td>Yes</td>
              <td>No</td>
              <td>File reads, HTTP request body, socket input</td>
            </tr>
            <tr>
              <td>Writable</td>
              <td>No</td>
              <td>Yes</td>
              <td>HTTP response, file writes, stdout</td>
            </tr>
            <tr>
              <td>Duplex</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>TCP sockets, TLS sockets</td>
            </tr>
            <tr>
              <td>Transform</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>Compression, parsing, line splitting</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="pipeline">Pipeline and Backpressure</h2>
      <p>
        Backpressure is the reason streams scale. If the consumer cannot keep
        up, the producer is told to slow down. Without that signal, fast
        producers overwhelm memory and downstream services. In Node, the safe
        high-level API is usually <code>pipeline()</code>.
      </p>

      <pre>
        <code>{`import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

await pipeline(
  createReadStream("app.log"),
  createGzip(),
  createWriteStream("app.log.gz"),
);`}</code>
      </pre>

      <p>
        <code>pipeline()</code> wires error propagation and teardown correctly.
        Manual
        <code>streamA.pipe(streamB).pipe(streamC)</code> is fine for simple
        cases, but the promise based pipeline API is easier to reason about in
        production code.
      </p>

      <h2 id="filesystem">File System Patterns</h2>
      <p>
        Use <code>node:fs/promises</code> when you want whole-file async
        operations and streams when data is large, unbounded, or should begin
        processing before the full payload arrives. Avoid the synchronous APIs
        in request handlers, queue consumers, or other shared-path server code.
      </p>

      <ArticleTable
        caption="Pick the access pattern that matches the data size and lifetime."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Need</th>
              <th>Preferred API</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Small config file at startup</td>
              <td>
                <code>readFile()</code>
              </td>
              <td>Simple, one-time load, acceptable memory cost</td>
            </tr>
            <tr>
              <td>Serving a large video</td>
              <td>
                <code>createReadStream()</code>
              </td>
              <td>Stream progressively, preserve memory</td>
            </tr>
            <tr>
              <td>Appending logs</td>
              <td>
                <code>createWriteStream()</code> or logger transport
              </td>
              <td>Incremental writes, continuous flow</td>
            </tr>
            <tr>
              <td>High-throughput file transform</td>
              <td>
                <code>pipeline()</code>
              </td>
              <td>Backpressure-aware and fault-tolerant</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="large-files">Large File Scenarios</h2>
      <p>
        The classic mistake is loading a 2GB file into memory just to send it
        back out. Stream it. The second classic mistake is parsing a huge NDJSON
        or CSV file as one string. Build a transform pipeline so processing
        starts immediately, failures surface early, and memory stays bounded
        even under concurrency.
      </p>
    </div>
  );
}
