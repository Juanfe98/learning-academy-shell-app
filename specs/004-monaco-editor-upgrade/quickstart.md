# Developer Quickstart: Monaco Editor Integration

**Feature**: 004-monaco-editor-upgrade

---

## Installation

```bash
pnpm add @monaco-editor/react
```

That's the only new dependency.

---

## How Monaco is initialized

`MonacoPlaygroundEditor.tsx` uses `useMonaco()` from `@monaco-editor/react` to access the Monaco instance. On first availability, it calls `initMonacoDefaults(monaco)` from `monaco-config.ts`, which:

1. Sets `typescriptDefaults.setEagerModelSync(true)` — MUST happen before any models are created
2. Sets TypeScript compiler options (ES2020, React JSX, strict mode)
3. Defines the `se-hub-dark` theme and calls `monaco.editor.setTheme('se-hub-dark')`
4. Calls `loadReactTypes(monaco)` (async, non-blocking) to fetch and register `@types/react`

---

## How models are managed

Every file in the challenge has a corresponding Monaco `ITextModel`:

```
FileMap key     →    Monaco URI
./App.tsx       →    file:///challenge/App.tsx
./types.ts      →    file:///challenge/types.ts
./styles.css    →    file:///challenge/styles.css
```

On challenge load (or `fileMap` keys change):
- All existing models are disposed
- New models created for every `fileMap` entry
- Active model set to match `filename` prop

On file switch (only `filename` prop changes):
- `editor.setModel(models.get(uri))` — no remount

On user edit:
- `onChange(value)` called → `PlaygroundPage` updates `fileMap` state → debounced rebuild
- The model itself already has the latest content; no need to call `setValue`

On code reset (`handleReset`):
- `fileMap` is replaced with seed data → `MonacoPlaygroundEditor` detects key change → disposes + recreates all models

---

## How go-to-definition works

After editor mounts, `registerEditorOpener` intercepts F12 / Cmd+Click:

```
User: Cmd+Click on "CounterProps"
  → Monaco TS worker resolves definition to file:///challenge/types.ts, line 1
  → registerEditorOpener fires with resource = Uri("file:///challenge/types.ts")
  → Editor switches model to types.ts
  → onFileNavigate("./types.ts") called
  → PlaygroundPage sets activeFile → file explorer highlights types.ts
```

---

## How import completions work

Custom `CompletionItemProvider` registered for `typescript` and `javascript`:

```
User types: import { } from "./"
  → Provider fires on trigger char "/"
  → Detects cursor inside import string
  → Resolves current file directory from model URI
  → Computes relative paths to all other models
  → Returns completions: ["./types", "./styles.css"]
```

---

## Theming reference

The `se-hub-dark` theme maps to CSS tokens:

| Monaco color key | Value | SE Hub token |
|-----------------|-------|--------------|
| `editor.background` | `#1a1a24` | `--bg-elevated` |
| `editorGutter.background` | `#13131a` | `--bg-surface` |
| `editorLineNumber.foreground` | `#5a5a78` | `--text-muted` |
| `editor.selectionBackground` | `#6366f130` | accent primary (30% opacity) |
| `editorCursor.foreground` | `#0ea5e9` | sky blue (matches CodeMirror caret) |
| `editorError.foreground` | `#ef4444` | `--error` |
| `editorWarning.foreground` | `#f59e0b` | `--warning` |

---

## Testing the editor

Run `pnpm dev` and:

1. `/playground/react-typed-counter` → hover over `useState` → should show type tooltip
2. Introduce a type error in `App.tsx` → red squiggle appears within 1s
3. Cmd+Click on `CounterProps` import → editor navigates to `types.ts`
4. Type `import {} from "./"` → file completion dropdown appears
5. `/playground/react-counter` (JS) → confirm no TypeScript-specific features, no regressions
6. `/playground/ts-oop-shapes` → confirm node-ts layout (no preview), console output works

---

## Fallback behavior

If Monaco fails to load (unlikely, CDN blocked, etc.):
- The `dynamic` import will hang; a `loading` spinner is shown indefinitely
- No crash, but editor is unusable
- Mitigation: wrap `dynamic` in an error boundary (optional, out of scope for v1)
