# Contract: UI Component Interfaces

**Feature**: 004-monaco-editor-upgrade
**Date**: 2026-05-11

---

## `MonacoPlaygroundEditor` Component Contract

**File**: `src/components/hub/playground/MonacoPlaygroundEditor.tsx`

```ts
interface Props {
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap: FileMap;
  onFileNavigate?: (path: string) => void;
}
```

**Guarantees**:
- Renders exactly one Monaco editor instance. Never remounts on file switch — uses `editor.setModel()`.
- On `fileMap` change where keys differ from current models (challenge switch): disposes all existing models, creates new ones, sets the active model to match `filename`.
- On `filename` change (same challenge, different file): switches model, editor view state (scroll/cursor) NOT preserved — use `editor.saveViewState()` / `editor.restoreViewState()` if needed.
- On `value` change while the active model already has that value: no-op (prevents cursor jump).
- `onChange` fires only for user edits, not programmatic `setValue` calls (Monaco standard behavior).

**Failure modes**:
- Monaco not available (CDN blocked): component shows a fallback `<textarea>` with identical props interface.
- React types fetch fails: IntelliSense degrades to local-identifier only. No error shown to user.
- Go-to-def target has no registered model: navigation silently ignored (`return false` from opener).

---

## `PlaygroundShell` Updated Contract

**File**: `src/components/hub/playground/PlaygroundShell.tsx`

```ts
// CodeEditor prop — updated signature
CodeEditor: React.ComponentType<{
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;              // NEW — passed through to Monaco
  onFileNavigate?: (path: string) => void;  // NEW — wires go-to-def → file switch
}>
```

`PlaygroundShell` passes `fileMap` and `onFileNavigate` verbatim when rendering `CodeEditor`. These props are ignored by the old `PlaygroundCodeEditor` (TypeScript will accept them as they're optional).

---

## `PlaygroundPage.tsx` Updated Wiring

```ts
// Dynamic import switches target
const CodeEditor = dynamic(
  () => import('@/components/hub/playground/MonacoPlaygroundEditor'),
  { ssr: false }
);

// In return JSX
<PlaygroundShell
  ...existingProps
  fileMap={fileMap}                     // NEW
  onFileNavigate={setActiveFile}        // NEW
  CodeEditor={CodeEditor}
/>
```

`PlaygroundShell` Props interface also adds:
```ts
interface Props {
  // ... existing props ...
  fileMap: FileMap;                           // NEW — forwarded to CodeEditor
  onFileNavigate: (path: string) => void;     // NEW — forwarded to CodeEditor
}
```

---

## `monaco-config.ts` Module Contract

**File**: `src/lib/editor/monaco-config.ts`

```ts
import type { Monaco } from '@monaco-editor/react';

// Call once when Monaco first loads. Idempotent (safe to call multiple times).
export function initMonacoDefaults(monaco: Monaco): void

// Returns options for the Editor component's `options` prop
export function getEditorOptions(): Record<string, unknown>

// Fetch and register @types/react + @types/react-dom. Resolves silently on failure.
export async function loadReactTypes(monaco: Monaco): Promise<void>
```

---

## `theme.ts` — No Change

`src/lib/editor/theme.ts` is unchanged. It continues to serve CodeMirror-based views (interview challenge editor). `getLanguageExtension` and `createSeHubTheme` are unaffected.

---

## Backward Compatibility

`PlaygroundCodeEditor.tsx` is NOT deleted. It continues to compile and could be re-used if the Monaco migration is rolled back. The interview editor (`ChallengeEditor.tsx`) is completely untouched.
