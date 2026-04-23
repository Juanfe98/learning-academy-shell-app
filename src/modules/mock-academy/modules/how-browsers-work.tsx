import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "browser-architecture", title: "Browser Architecture", level: 2 },
  { id: "parsing-and-rendering", title: "Parsing and Rendering", level: 2 },
  { id: "critical-rendering-path", title: "Critical Rendering Path", level: 3 },
  { id: "javascript-execution", title: "JavaScript Execution", level: 2 },
  { id: "performance-implications", title: "Performance Implications", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HowBrowsersWork() {
  return (
    <div className="article-content">
      <p>
        Browsers are extraordinarily complex pieces of software. A modern browser like
        Chrome or Firefox is a multi-process application with a networking stack, a
        JavaScript engine, a rendering engine, and a GPU compositing pipeline — all
        working together to paint pixels in under 16ms to achieve 60fps. Understanding
        the pipeline makes you a significantly better web developer.
      </p>

      <h2 id="browser-architecture">Browser Architecture</h2>

      <p>
        Modern browsers are multi-process applications. Chrome, for example, runs
        several types of processes:
      </p>

      <ul>
        <li>
          <strong>Browser process</strong> — the main process. Controls the address bar,
          bookmarks, network requests, and file access. Coordinates all other processes.
        </li>
        <li>
          <strong>Renderer process</strong> — one per tab (usually). Runs the rendering
          engine (Blink in Chrome/Edge, Gecko in Firefox, WebKit in Safari) and the JS
          engine (V8 in Chrome, SpiderMonkey in Firefox). Sandboxed for security —
          a malicious page can&apos;t escape the renderer to reach the OS.
        </li>
        <li>
          <strong>GPU process</strong> — handles compositing and drawing to the screen
          using hardware acceleration.
        </li>
        <li>
          <strong>Plugin / utility processes</strong> — extensions, PDF readers, etc.
        </li>
      </ul>

      <p>
        This isolation means a crashed tab doesn&apos;t crash the browser. It also means
        cross-origin iframes can be isolated in separate processes for security (Site
        Isolation).
      </p>

      <h2 id="parsing-and-rendering">Parsing and Rendering</h2>

      <p>
        When the renderer process receives HTML bytes, it runs through a pipeline:
      </p>

      <ol>
        <li>
          <strong>Parse HTML → DOM tree</strong> — the HTML parser converts markup
          into a tree of DOM nodes. Parsing is <em>incremental</em> — the browser starts
          rendering before the full document arrives.
        </li>
        <li>
          <strong>Parse CSS → CSSOM tree</strong> — CSS is parsed into the CSS Object
          Model, a separate tree representing all style rules.
        </li>
        <li>
          <strong>Combine → Render tree</strong> — the DOM and CSSOM are merged into the
          render tree, which contains only visible nodes with their computed styles.
          <code>display: none</code> elements are excluded entirely.
        </li>
        <li>
          <strong>Layout (Reflow)</strong> — the browser calculates the position and size
          of every render tree node. This is expensive — avoid triggering it repeatedly.
        </li>
        <li>
          <strong>Paint</strong> — fills in pixels: colors, images, borders, shadows.
        </li>
        <li>
          <strong>Compositing</strong> — layers are combined and sent to the GPU to be
          drawn on screen.
        </li>
      </ol>

      <h3 id="critical-rendering-path">Critical Rendering Path</h3>

      <p>
        The <strong>Critical Rendering Path (CRP)</strong> is the sequence of steps
        the browser must complete before it can display anything on screen. Optimizing
        it is the foundation of web performance.
      </p>

      <p>
        Two resources block rendering:
      </p>

      <ul>
        <li>
          <strong>CSS is render-blocking</strong> — the browser will not paint anything
          until all CSS is downloaded and parsed. Put critical CSS inline or in{" "}
          <code>&lt;link rel="stylesheet"&gt;</code> in <code>&lt;head&gt;</code>.
        </li>
        <li>
          <strong>Synchronous JS is both parse-blocking and render-blocking</strong> — a{" "}
          <code>&lt;script&gt;</code> without <code>defer</code> or <code>async</code>{" "}
          stops HTML parsing until the script downloads, parses, and executes. This is why
          scripts should use <code>defer</code>.
        </li>
      </ul>

      <pre>
        <code>{`<!-- Blocks HTML parsing — bad -->
<script src="analytics.js"></script>

<!-- Downloads in parallel, runs after DOM is ready — good -->
<script src="app.js" defer></script>

<!-- Downloads in parallel, runs immediately when ready — use for independent scripts -->
<script src="tracker.js" async></script>`}</code>
      </pre>

      <h2 id="javascript-execution">JavaScript Execution</h2>

      <p>
        JavaScript runs on a single thread with an <strong>event loop</strong>. This
        means only one piece of JS code runs at a time — there&apos;s no parallelism
        in the traditional sense.
      </p>

      <p>
        The event loop works like this:
      </p>

      <ol>
        <li>Execute the current <strong>call stack</strong> until empty</li>
        <li>Process all queued <strong>microtasks</strong> (Promise callbacks, <code>queueMicrotask</code>)</li>
        <li>Render if a frame is due (≈ every 16ms for 60fps)</li>
        <li>Process one <strong>macrotask</strong> (setTimeout, setInterval, I/O callbacks)</li>
        <li>Repeat</li>
      </ol>

      <p>
        This model is why long-running synchronous JavaScript (a 500ms loop) freezes the
        page — the render step can&apos;t run until the call stack is empty. Break long
        tasks up with <code>setTimeout(fn, 0)</code> or{" "}
        <code>requestIdleCallback</code> to yield back to the browser.
      </p>

      <h2 id="performance-implications">Performance Implications</h2>

      <p>
        Now that you understand the pipeline, the rules of performance fall out naturally:
      </p>

      <ul>
        <li>
          <strong>Minimize layout thrashing</strong> — reading a layout property (like{" "}
          <code>offsetHeight</code>) after writing a style forces a synchronous layout.
          Batch reads and writes.
        </li>
        <li>
          <strong>Animate with <code>transform</code> and <code>opacity</code></strong> — these
          properties are composited on the GPU and skip layout and paint entirely. Animating{" "}
          <code>width</code> or <code>top</code> triggers layout on every frame.
        </li>
        <li>
          <strong>Use <code>will-change</code> sparingly</strong> — hints to the browser that
          an element will be animated, promoting it to its own compositing layer. Overusing
          it increases memory consumption.
        </li>
        <li>
          <strong>Defer non-critical JS</strong> — use <code>defer</code> or dynamic{" "}
          <code>import()</code> to avoid blocking the critical rendering path.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Browsers are multi-process: browser process, renderer process, GPU process — each tab is sandboxed</li>
        <li>The rendering pipeline: HTML → DOM → CSSOM → Render tree → Layout → Paint → Composite</li>
        <li>CSS blocks rendering; synchronous JS blocks both parsing and rendering</li>
        <li>Use <code>defer</code> for scripts, <code>async</code> for independent third-party scripts</li>
        <li>JavaScript runs on a single thread via an event loop — long tasks freeze the UI</li>
        <li>Animate with <code>transform</code>/<code>opacity</code> to stay in the compositor and hit 60fps</li>
      </ul>
    </div>
  );
}
