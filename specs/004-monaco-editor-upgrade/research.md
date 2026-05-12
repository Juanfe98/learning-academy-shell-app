# Research: Robust Code Editor Upgrade (Monaco)

**Feature**: 004-monaco-editor-upgrade
**Date**: 2026-05-11

---

## Decision 1: Monaco vs CodeMirror + TypeScript Language Service

**Decision**: Migrate playground editor to Monaco (`@monaco-editor/react`).

**Rationale**:
- Monaco IS the VS Code editor. TypeScript IntelliSense, go-to-definition, hover types, inline error squiggles, multi-cursor, minimap — all built in. No assembly required.
- CodeMirror + `@typescript/vfs` (Path B) would require ~2-4 days of brittle web-worker wiring, custom diagnostic display, and manual TS compiler API calls. Every feature Monaco gives for free would need manual implementation.
- Monaco bundle (~4-6MB gzipped) is auto code-split by Next.js; TypeScript worker loads lazily (~1.2MB, only when editor mounts). Impact on initial page load: zero.
- CodeMirror continues to serve interview views — no regression.

**Alternative considered**: `@valtown/codemirror-ts` (CodeMirror + TS worker wrapper). Rejected: less mature, no go-to-def across files, import path completions still require custom provider, and the web worker setup requires serving TypeScript lib files manually.

---

## Decision 2: `@monaco-editor/react` Integration Pattern

**Decision**: Dynamic import with `ssr: false` inside a `'use client'` component.

```tsx
// src/components/hub/playground/MonacoPlaygroundEditor.tsx
'use client';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
```

**Why**: Monaco requires browser APIs (`document`, `Worker`). SSR will crash. The `'use client'` boundary already exists on `PlaygroundCodeEditor.tsx` so no new boundary is needed.

**Next.js 16 / Turbopack**: No known issues. The dynamic import pattern is identical to current `CodeEditor` lazy load in `PlaygroundPage.tsx`.

---

## Decision 3: Multi-File Model Management

**Decision**: Create one `monaco.editor.ITextModel` per challenge file at mount time. Use `editor.setModel(model)` to switch active file without remounting.

**Critical requirement**: `monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)` MUST be called before models are created. Without it, TypeScript IntelliSense does not propagate across models.

**URI format**: `file:///challenge/<filename>` — e.g., `file:///challenge/App.tsx`, `file:///challenge/types.ts`. Must use `file:///` scheme. Relative import resolution works because all files share the same `file:///challenge/` prefix.

**API**:
```ts
// Create
const model = monaco.editor.createModel(content, language, monaco.Uri.parse(`file:///challenge/${filename}`));

// Switch (no remount)
editor.setModel(model);

// Update content (on external change)
if (model.getValue() !== newContent) model.setValue(newContent);

// Dispose (on challenge change)
model.dispose();
```

**Language detection** from filename:
- `.tsx` → `'typescript'` (Monaco auto-enables JSX when filename ends in `.tsx`)
- `.ts` → `'typescript'`
- `.jsx` → `'javascript'`
- `.js` → `'javascript'`
- `.css` → `'css'`

---

## Decision 4: TypeScript Language Service Configuration

**Decision**: Set compiler options once at initialization. Fetch React type definitions from unpkg on first use and cache in module scope.

**Compiler options**:
```ts
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  module: monaco.languages.typescript.ModuleKind.CommonJS,
  jsx: monaco.languages.typescript.JsxEmit.React,
  jsxFactory: 'React.createElement',
  jsxFragmentFactory: 'React.Fragment',
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  allowNonTsExtensions: true,
  allowJs: true,
});
```

**React types**: Fetch `@types/react` declaration file from unpkg once, cache in memory, register via `addExtraLib`. Failure (offline) degrades gracefully — IntelliSense works for non-React types, React-specific hover info missing.

```ts
const reactTypesUrl = 'https://unpkg.com/@types/react@18/index.d.ts';
const content = await fetch(reactTypesUrl).then(r => r.text());
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  content,
  'file:///node_modules/@types/react/index.d.ts'
);
```

**Worker**: Starts automatically when `setCompilerOptions` is called. No manual configuration.

---

## Decision 5: Go-to-Definition Cross-File

**Decision**: Register a custom `monaco.editor.registerEditorOpener` that intercepts navigation events and calls an `onFileNavigate` callback passed from `PlaygroundPage.tsx`.

```ts
const disposable = monaco.editor.registerEditorOpener({
  openCodeEditor: (source, resource, selectionOrPosition) => {
    const uri = resource.toString(); // e.g. 'file:///challenge/types.ts'
    const filename = uri.replace('file:///challenge/', '');
    const model = modelsRef.current.get(uri);
    if (!model) return false;

    editor.setModel(model);
    if (selectionOrPosition) {
      const pos = 'startLineNumber' in selectionOrPosition
        ? { lineNumber: selectionOrPosition.startLineNumber, column: selectionOrPosition.startColumn }
        : selectionOrPosition;
      editor.setPosition(pos);
      editor.revealLineInCenter(pos.lineNumber);
    }
    onFileNavigate?.('./' + filename);
    return true;
  },
});
```

This automatically handles F12, Cmd+Click, and right-click → Go to Definition.

---

## Decision 6: Import Path Autocomplete

**Decision**: Custom `CompletionItemProvider` registered for `'typescript'` and `'javascript'` that reads from `modelsRef` to suggest relative paths.

**Why custom**: Monaco's TypeScript service doesn't automatically resolve model URIs to relative path suggestions in import strings. It does complete _type_ names from imported modules, but not the file path strings themselves.

**Trigger**: Fires when cursor is inside a string following `from ` or `import(`.

---

## Decision 7: Theming

**Decision**: Define a custom Monaco theme named `se-hub-dark` that maps the existing design token values from `globals.css`.

```ts
monaco.editor.defineTheme('se-hub-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#1a1a24',        // --bg-elevated
    'editorGutter.background': '#13131a',  // --bg-surface
    'editorLineNumber.foreground': '#5a5a78', // --text-muted
    'editor.selectionBackground': '#6366f130',
    'editor.lineHighlightBackground': '#ffffff08',
    'editorCursor.foreground': '#0ea5e9',
    'editorError.foreground': '#ef4444',   // --error
    'editorWarning.foreground': '#f59e0b', // --warning
  },
});
```

---

## Architecture: Component Interface Changes

**Problem**: The current `PlaygroundShell` CodeEditor prop type is:
```ts
CodeEditor: React.ComponentType<{ filename: string; value: string; onChange: (value: string) => void }>
```
Monaco needs `fileMap` and `onFileNavigate` to manage models and handle go-to-def.

**Decision**: Extend `PlaygroundShell`'s `CodeEditor` prop type with two optional extra props. `PlaygroundPage.tsx` passes these; `PlaygroundShell` forwards them transparently. This keeps backward compat if the CodeEditor slot is ever replaced back.

Extended type:
```ts
CodeEditor: React.ComponentType<{
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;
  onFileNavigate?: (path: string) => void;
}>
```

---

## Files Changed Summary

| File | Action | Reason |
|------|--------|--------|
| `src/components/hub/playground/MonacoPlaygroundEditor.tsx` | **CREATE** | New Monaco-backed editor component |
| `src/lib/editor/monaco-config.ts` | **CREATE** | TS compiler options + theme definition |
| `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` | **UPDATE** | Use Monaco editor; pass `fileMap` + `onFileNavigate` |
| `src/components/hub/playground/PlaygroundShell.tsx` | **UPDATE** | Extend CodeEditor prop type |
| `src/lib/editor/theme.ts` | **NO CHANGE** | Stays for interview editor (CodeMirror) |
| `src/components/hub/playground/PlaygroundCodeEditor.tsx` | **NO CHANGE** | Kept but no longer used by playground; interview views unaffected |
| `package.json` | **UPDATE** | Add `@monaco-editor/react` |

---

## Bundle Impact

| Asset | Size (gzipped) | Load time |
|-------|---------------|-----------|
| Monaco core (lazy) | ~3.5–4.5 MB | On first editor mount |
| TypeScript worker (lazy) | ~1.2–1.5 MB | On first `.ts`/`.tsx` edit |
| `@types/react` (CDN fetch) | ~300 KB | On first TS challenge load, cached |
| Current CodeMirror (removed from playground) | ~0.8 MB saved | — |
| **Net delta** | +~4–5 MB | Lazy, zero impact on initial load |
