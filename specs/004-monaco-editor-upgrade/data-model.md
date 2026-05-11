# Data Model: Robust Code Editor Upgrade

**Feature**: 004-monaco-editor-upgrade
**Date**: 2026-05-11

---

## New Component: `MonacoPlaygroundEditor`

`src/components/hub/playground/MonacoPlaygroundEditor.tsx`

```ts
interface MonacoPlaygroundEditorProps {
  filename: string;            // active file e.g. "./App.tsx"
  value: string;               // current content of active file
  onChange: (value: string) => void;
  fileMap: FileMap;            // ALL challenge files (for model sync)
  onFileNavigate?: (path: string) => void;  // go-to-def callback
}
```

**Internal state**:
- `modelsRef: Map<string, monaco.editor.ITextModel>` — keyed by `file:///challenge/<filename>`
- `editorRef: monaco.editor.IStandaloneCodeEditor | null`
- `monacoRef: Monaco | null` — the monaco instance (from `useMonaco()`)

**Lifecycle**:
1. On `monaco` ready: call `initMonaco(monaco)` — sets compiler options, theme, `setEagerModelSync`
2. On `fileMap` change (challenge switch): dispose all existing models, create new models for all files
3. On `filename` change (file switch): call `editor.setModel(modelsRef.get(uri))`
4. On `value` change (external edit, e.g. reset): call `model.setValue(value)` on active model only
5. On `onChange` callback: propagated from Monaco's `onDidChangeModelContent`
6. On unmount: dispose all models, dispose editor opener registration

---

## New Lib: `monaco-config.ts`

`src/lib/editor/monaco-config.ts`

```ts
export function getCompilerOptions(monaco: Monaco): monaco.languages.typescript.CompilerOptions
export function getThemeData(): monaco.editor.IStandaloneThemeData
export async function loadReactTypes(monaco: Monaco): Promise<void>  // fetches + registers @types/react
export function getEditorOptions(): monaco.editor.IStandaloneEditorConstructionOptions
```

**`getEditorOptions()` returns**:
```ts
{
  minimap: { enabled: false },  // save space in narrow layout
  fontSize: 14,
  fontFamily: 'ui-monospace, monospace',
  lineNumbers: 'on',
  folding: true,
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  automaticLayout: true,       // IMPORTANT: resizes editor when container resizes
  padding: { top: 8 },
  renderLineHighlight: 'line',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  bracketPairColorization: { enabled: true },
}
```

---

## Updated: `PlaygroundShell` CodeEditor prop type

`src/components/hub/playground/PlaygroundShell.tsx`

```ts
// Before
CodeEditor: React.ComponentType<{
  filename: string;
  value: string;
  onChange: (value: string) => void;
}>

// After
CodeEditor: React.ComponentType<{
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;
  onFileNavigate?: (path: string) => void;
}>
```

`PlaygroundShell` passes `fileMap` and `onFileNavigate` as props when rendering `CodeEditor`.

---

## Updated: `PlaygroundPage.tsx`

New props passed to `PlaygroundShell`:
```ts
// New prop wiring in PlaygroundShell call
fileMap={fileMap}
onFileNavigate={setActiveFile}
```

`CodeEditor` dynamic import switches from `PlaygroundCodeEditor` to `MonacoPlaygroundEditor`:
```ts
const CodeEditor = dynamic(
  () => import('@/components/hub/playground/MonacoPlaygroundEditor'),
  { ssr: false }
);
```

---

## Language Map (filename → Monaco language ID)

| Extension | Monaco language |
|-----------|----------------|
| `.tsx`    | `typescript`   |
| `.ts`     | `typescript`   |
| `.jsx`    | `javascript`   |
| `.js`     | `javascript`   |
| `.css`    | `css`          |

Monaco auto-enables JSX for `.tsx`/`.jsx` based on filename. Explicit `typescript` language + `.tsx` filename = TSX mode automatically.

---

## Model URI Convention

| File path in challenge | Monaco model URI |
|----------------------|-----------------|
| `./App.tsx`          | `file:///challenge/App.tsx` |
| `./types.ts`         | `file:///challenge/types.ts` |
| `./index.ts`         | `file:///challenge/index.ts` |
| `./styles.css`       | `file:///challenge/styles.css` |
| `./utils/helpers.ts` | `file:///challenge/utils/helpers.ts` |

**Conversion**:
```ts
// fileMap key → Monaco URI
const toUri = (path: string) => `file:///challenge/${path.replace(/^\.\//, '')}`;

// Monaco URI → fileMap key
const toPath = (uri: string) => './' + uri.replace('file:///challenge/', '');
```
