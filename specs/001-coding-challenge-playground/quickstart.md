# Quickstart: Coding Challenge Playground

**For**: Developer implementing this feature  
**Date**: 2026-05-10

---

## New dependencies to install

```bash
pnpm add sucrase @uiw/react-codemirror @codemirror/lang-javascript
```

No other new runtime deps needed. All other requirements (React, Next.js, Zustand, Framer Motion) are already in the project.

---

## New files to create

```
src/
  app/(hub)/
    playground/
      page.tsx                                  ← challenge list page
      [slug]/
        page.tsx                                ← Server Component: loads Challenge, renders PlaygroundPage
        PlaygroundPage.tsx                      ← "use client" orchestrator
  components/
    hub/playground/
      PlaygroundShell.tsx                       ← 5-panel layout (pure layout, no state)
      FileExplorer.tsx
      ChallengeDescription.tsx
      CodeEditor.tsx                            ← "use client", loaded via dynamic + ssr:false
      ConsolePanel.tsx
      PreviewFrame.tsx                          ← "use client", manages iframe srcdoc
  lib/
    challenges/
      types.ts                                  ← Challenge, ChallengeFile, ConsoleEntry
      registry.ts                               ← CHALLENGE_REGISTRY: Challenge[]
      transpile.ts                              ← thin wrapper around sucrase.transform()
    store/
      challenge.store.ts                        ← useChallengeStore (Zustand + persist)
  modules/
    challenges/
      react-counter/
        index.ts                                ← exports Challenge object
```

---

## Key implementation notes

### Server → Client boundary

```tsx
// app/(hub)/playground/[slug]/page.tsx  — Server Component
import { CHALLENGE_REGISTRY } from "@/lib/challenges/registry";
import { PlaygroundPage } from "./PlaygroundPage";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;                          // await params — Next.js 16
  const challenge = CHALLENGE_REGISTRY.find(c => c.slug === slug);
  if (!challenge) notFound();
  return <PlaygroundPage challenge={challenge} />;
}
```

### CodeEditor dynamic import

```tsx
// PlaygroundPage.tsx
const CodeEditor = dynamic(() => import("@/components/hub/playground/CodeEditor"), { ssr: false });
```

Define CodeMirror extensions outside component to avoid re-render churn:
```tsx
// CodeEditor.tsx
const jsxExtension = [javascript({ jsx: true })];
```

### Transpilation pipeline

```ts
// lib/challenges/transpile.ts
import { transform } from "sucrase";

export function transpileJSX(code: string): { code: string; error?: string } {
  try {
    const result = transform(code, { transforms: ["jsx"] });
    return { code: result.code };
  } catch (e) {
    return { code: "", error: (e as Error).message };
  }
}
```

### Iframe HTML template

```ts
// PreviewFrame.tsx — generateIframeHtml()
function generateIframeHtml(transpiledCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <script src="https://esm.sh/react@19/umd/react.development.js"></script>
  <script src="https://esm.sh/react-dom@19/umd/react-dom.development.js"></script>
  <script>
    /* Console interceptor */
    (function(){["log","warn","error","info"].forEach(function(m){var o=console[m];console[m]=function(){var a=Array.prototype.slice.call(arguments).map(function(x){try{return typeof x==="string"?x:JSON.stringify(x);}catch(_){return String(x);}});o.apply(console,arguments);window.parent.postMessage({type:"console",method:m,args:a,timestamp:Date.now()},"*");};});window.addEventListener("error",function(e){window.parent.postMessage({type:"error",message:e.message,stack:e.error&&e.error.stack},"*");});})();
  </script>
</head>
<body>
  <div id="root"></div>
  <script>
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    ${transpiledCode}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  </script>
</body>
</html>`;
}
```

**Important**: Strip any `import React` / `import ReactDOM` lines from transpiled code before injection — they'll fail in the iframe since React is injected globally.

### Debounce code changes

In `PlaygroundPage`, debounce transpilation and iframe refresh by **500ms** after last keystroke to avoid thrashing:

```ts
const debouncedCode = useDebounce(activeFileContent, 500);
const transpiled = useMemo(() => transpileJSX(debouncedCode), [debouncedCode]);
```

### Zustand store hydration pattern

Follow the existing `useProgressStore` pattern exactly:
- `skipHydration: true` in persist config
- Mount via `StoreHydrator` (already in hub layout, or add a local effect in `PlaygroundPage`)

### Adding a new challenge

1. Create `src/modules/challenges/<slug>/index.ts` with a `Challenge` object
2. Import and add it to `CHALLENGE_REGISTRY` in `src/lib/challenges/registry.ts`
3. Add to `MOCK_ACADEMIES` or create a playground section entry in `mock-data.ts` for navigation

---

## Verification checklist

- [ ] `pnpm build` passes with no TypeScript errors
- [ ] `await params` used in all dynamic route pages
- [ ] CodeEditor wrapped in `dynamic(..., { ssr: false })`
- [ ] `mounted` guard used in `PlaygroundPage` before reading Zustand store
- [ ] Console interceptor fires before user code in iframe
- [ ] Reset restores all files, clears console entries
