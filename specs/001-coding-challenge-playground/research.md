# Research: Coding Challenge Playground

**Phase**: 0 — Research  
**Date**: 2026-05-10  
**Branch**: `001-coding-challenge-playground`

---

## Decision 1: In-Browser JSX Transpilation

**Decision**: Use **Sucrase** for JSX → JavaScript transpilation in the browser.

**Rationale**:
- ~70KB bundle — far lighter than @babel/standalone (~1.8MB)
- ~20× faster than Babel at runtime
- Supports React 19's automatic JSX transform via `react-jsx` mode
- Simple API: `transform(code, { transforms: ['jsx'] }).code`

**Caveat**: Sucrase does not resolve module imports — it leaves `import` statements as-is. For the challenge sandbox, React and ReactDOM must be injected from a CDN (esm.sh) into the iframe HTML, and user imports for those libraries must be stripped or replaced before injection. This is acceptable since challenges are controlled content.

**Alternatives rejected**:
- `@babel/standalone`: 1.8MB, slower, overkill for JSX-only transpilation
- `esbuild-wasm`: 40KB gzipped but adds WASM loading complexity; useful if we ever need full bundling
- `SWC WASM`: heavier, less mature browser integration

---

## Decision 2: Code Sandbox / Execution

**Decision**: **Sandboxed `<iframe>` with `srcdoc`** + `postMessage` API for communication.

**Rationale**:
- Built-in browser sandbox via `sandbox="allow-scripts"` — no external libraries needed
- Full DOM isolation; user code runs in a separate browsing context
- `srcdoc` attribute lets the parent inject arbitrary HTML/JS without any server round-trip
- `postMessage` provides a well-understood two-way channel for console messages and errors

**Flow**:
1. User edits code → debounced (500ms) → parent transpiles with Sucrase
2. Parent generates iframe HTML: React/ReactDOM from CDN + console interceptor + user code
3. Parent sets `iframe.srcdoc = htmlString` to reload sandbox
4. Iframe runs code; console calls and errors fire `window.parent.postMessage()`
5. Parent collects messages → renders in ConsolePanel

**Alternatives rejected**:
- Web Workers: cannot render React DOM, no iframe-equivalent isolation for preview
- Cloud VMs (WebContainers): massive complexity for a personal tool

---

## Decision 3: Code Editor

**Decision**: **CodeMirror 6** via `@uiw/react-codemirror`.

**Rationale**:
- ~300KB core with modular extensions (vs. Monaco's 5–10MB)
- SSR-safe with `next/dynamic` + `ssr: false`
- React-first API — controlled via `value` / `onChange`
- First-class JSX syntax highlighting via `@codemirror/lang-javascript` with `jsx: true`
- Tree-shaking: unused extensions don't ship

**Integration pattern**:
```tsx
// components/hub/playground/CodeEditor.tsx  — "use client"
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { useMemo } from "react";

const extensions = [javascript({ jsx: true })];  // defined outside render
```
Loaded via `dynamic(() => import('./CodeEditor'), { ssr: false })` in the shell.

**Alternatives rejected**:
- Monaco Editor: 5–10MB, complex SSR setup, overkill for a personal tool

---

## Decision 4: Console Output Capture

**Decision**: Inject a console interceptor script into the iframe `<head>`, relay via `postMessage`.

**Message format**:
```ts
interface ConsoleMessage {
  type: "console";
  method: "log" | "warn" | "error" | "info";
  args: string[];       // serialized with String() or JSON.stringify
  timestamp: number;
}

interface ErrorMessage {
  type: "error";
  message: string;
  stack?: string;
}
```

**Interceptor injected into iframe** (before user code):
```js
(function () {
  ["log", "warn", "error", "info"].forEach(function (method) {
    var orig = console[method];
    console[method] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        try { return typeof a === "string" ? a : JSON.stringify(a); }
        catch (_) { return String(a); }
      });
      orig.apply(console, arguments);
      window.parent.postMessage({ type: "console", method: method, args: args, timestamp: Date.now() }, "*");
    };
  });
  window.addEventListener("error", function (e) {
    window.parent.postMessage({ type: "error", message: e.message, stack: e.error && e.error.stack }, "*");
  });
})();
```

**Alternatives rejected**:
- `console-feed` library: 200KB, more than needed for structured log display

---

## Decision 5: Challenge Data Storage

**Decision**: Static TypeScript objects (challenge registry) for challenge definitions; Zustand `persist` store for user session state (edited code per file per challenge).

**Rationale**: Matches existing patterns in the codebase (`MOCK_ACADEMIES`, `REGISTRY`, `useProgressStore`). No new infrastructure. Challenges are curated, not user-generated.

**New store**: `useChallengeStore` — mirrors pattern of `useProgressStore`:
- `skipHydration: true`
- `persist` with key `se-hub-challenges`
- Shape: `{ sessions: Record<challengeSlug, Record<filename, string>> }`
