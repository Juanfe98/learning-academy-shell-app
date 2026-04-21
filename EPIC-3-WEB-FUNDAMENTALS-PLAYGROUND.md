# Epic 3 — Web Fundamentals: Live Coding Playground

## Depends on
Epic 1 + Epic 2 complete.

## Goal

A live coding environment embedded in se-hub. Phase 1 (this epic): HTML +
CSS. Phase 2 (future): TypeScript/JavaScript with a transpiler. The
architecture is designed from day one to support both.

---

## Editor Technology Decision

### Why CodeMirror 6 (not a plain textarea, not Monaco)

| Option | Bundle | TS support later | Setup |
|---|---|---|---|
| Plain `<textarea>` | ~0 KB | Requires full rewrite | Trivial |
| Monaco Editor | ~2 MB | Native, first-class | Complex (workers, loader) |
| **CodeMirror 6** | **~500 KB** | Via `@codemirror/lang-javascript` | Moderate |

CodeMirror 6 is the right call:
- React wrapper: `@uiw/react-codemirror` (well-maintained, Next.js compatible)
- Language support packages: `@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-javascript`
- Adding TypeScript later = install `@codemirror/lang-javascript` with `typescript: true` option — no rewrite
- The dark theme slots cleanly into se-hub's design tokens

---

## Architecture

### Playground as a client component

The entire playground is one large `"use client"` component tree. It should
NOT be a server component (no dynamic imports, no `await` on content).

The playground page in the content viewer dispatch:
```ts
case "playground": {
  const challengeId = slug[1]; // optional: pre-load a challenge's starter
  return <PlaygroundPage challengeId={challengeId} />;
}
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│  TopBar: [Challenge picker dropdown]  [Run]  [Reset]│
├────────────────┬──────────────────┬─────────────────┤
│  HTML editor   │   CSS editor     │  Live Preview   │
│  (CodeMirror)  │   (CodeMirror)   │  (iframe)       │
│                │                  │                 │
│                │                  │                 │
└────────────────┴──────────────────┴─────────────────┘
```

Three equal panels (CSS Grid: `grid-cols-3`). On mobile: stacked vertically
(HTML → CSS → Preview). On tablet+: side by side.

A panel resize handle is a nice-to-have but out of scope for MVP.

### Preview mechanism

The preview iframe renders `srcdoc` — no server needed, entirely client-side:

```ts
const combinedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>${cssValue}</style>
</head>
<body>${htmlValue}</body>
</html>
`;

// Debounced: update srcdoc 300ms after last keystroke
```

`sandbox="allow-scripts"` is safe here — user is running their OWN code,
not untrusted third-party content. No `allow-same-origin` needed (prevents
iframe from accessing parent document).

### State

```ts
// Local component state — no Zustand needed for editor content
const [html, setHtml] = useState(starterHtml ?? DEFAULT_HTML);
const [css, setCss] = useState(starterCss ?? DEFAULT_CSS);
const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
```

The "Reset" button restores `html`/`css` to the current challenge's starter
values (or to `DEFAULT_HTML`/`DEFAULT_CSS` if in free-form mode).

"Mark Complete" calls the progress store — same as in `ChallengePage`.

---

## Components

### `PlaygroundPage.tsx` (client)
- Mounts CodeMirror editors + iframe
- Manages HTML/CSS state + debounced preview
- Challenge picker: dropdown of all challenges across all modules
- Optional: split-pane resize (CSS Grid with drag handle — can defer)

### `CodeEditor.tsx` (client)
- Thin wrapper around `@uiw/react-codemirror`
- Props: `language`, `value`, `onChange`, `className`
- Applies se-hub dark theme (maps `--bg-surface`, `--accent-primary`, etc.)
- Ready for Phase 2: just pass `lang={javascript({ typescript: true })}`

### Challenge detail page update (`ChallengePage.tsx`)
- "Open in Playground" button navigates to
  `/learn/web-fundamentals/playground/${challenge.id}` and pre-loads
  `starterHtml` + `starterCss` from challenge data

---

## Phase 2: TypeScript/JavaScript Support (future)

When the learning path grows to TypeScript or JS topics:

1. Add a `js` panel to the layout (optional 3rd editor)
2. Install `@codemirror/lang-javascript` (already the same package, just
   enable the `typescript: true` option)
3. For execution: inject the JS into the preview iframe's `<script>` tag
4. For TypeScript: run `@typescript/transpiler` (the lightweight browser
   build) in a `Web Worker` — output is plain JS, inject as above
5. Add a console output panel (capture `console.log` via `window.postMessage`
   from inside the iframe)

No architectural rewrite required. `CodeEditor` already supports it.
The iframe `srcdoc` approach handles JS execution natively.

---

## New Dependencies

```bash
pnpm add @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css
```

These are the ONLY new dependencies for Epic 3.  
(Future: `@codemirror/lang-javascript` for JS/TS support — same ecosystem.)

---

## Files to Create/Modify

### New files
1. `src/components/hub/learn/wf/PlaygroundPage.tsx`
2. `src/components/hub/learn/wf/CodeEditor.tsx`

### Modified files
3. `src/app/(hub)/learn/[academy]/[...slug]/page.tsx` — add `playground` case to dispatch
4. `src/components/hub/learn/wf/ChallengePage.tsx` — enable "Open in Playground" button

---

## Implementation Steps

1. `pnpm add @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css`
2. Write `CodeEditor.tsx` — themed, language-aware wrapper
3. Write `PlaygroundPage.tsx` — 3-panel layout, iframe preview, challenge picker
4. Add `playground` case to dispatch in content viewer
5. Enable "Open in Playground" in `ChallengePage`
6. `pnpm build` — zero errors (watch for SSR issues: CodeMirror must be client-only)
7. Verify: free-form mode works, loading a challenge pre-fills starters,
   live preview updates as you type, reset restores starters

---

## SSR Gotcha

CodeMirror accesses DOM APIs at import time — it will crash on the server.
Use `dynamic` import with `{ ssr: false }` for the playground page:

```ts
// In content viewer dispatch (server component):
const PlaygroundPage = dynamic(
  () => import("@/components/hub/learn/wf/PlaygroundPage"),
  { ssr: false }
);
```

This is the standard Next.js App Router pattern for client-only components
that touch the DOM.
