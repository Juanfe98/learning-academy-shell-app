# Data Model: Playground File Explorer

**Phase**: 1 — Design
**Date**: 2026-05-10

---

## Entities

### FileEntry

A single file in the project, stored in a flat map.

```ts
interface FileEntry {
  content: string;
  language: "jsx" | "js" | "css";
  seed: boolean;       // true = original challenge file, cannot be deleted
}
```

### FileMap

The flat storage shape for all project files. Keys are root-relative paths.

```ts
type FileMap = Record<string, FileEntry>;
// e.g.:
// {
//   "./App.jsx":                { content: "...", language: "jsx", seed: true },
//   "./styles.css":             { content: "...", language: "css", seed: true },
//   "./components/Button.jsx":  { content: "...", language: "jsx", seed: false },
// }
```

**Validation rules**:
- Path must start with `./`
- Filename segment must match `/^[a-zA-Z0-9._-]+$/`
- Max depth: 3 path segments (e.g. `./a/b/c.jsx` = 3 segments, allowed; `./a/b/c/d.jsx` = 4, blocked)
- Max 20 non-seed files per challenge
- A seed file's path cannot be overwritten or deleted

### TreeNode

Computed at render time from `FileMap` keys — never stored.

```ts
type TreeNode =
  | { kind: "file"; path: string; name: string; language: string; seed: boolean }
  | { kind: "folder"; path: string; name: string; children: TreeNode[] };
```

**Builder function** (pure, no side effects):
```ts
function buildTree(fileMap: FileMap): TreeNode[]
```

### ChallengeStoreState (extended)

Replaces the existing flat `sessions` shape from Feature 001.

```ts
interface ChallengeStoreState {
  // Keyed by challenge slug
  fileMaps: Record<string, FileMap>;

  // Actions
  setFileContent: (slug: string, path: string, content: string) => void;
  getFileContent: (slug: string, path: string, original: string) => string;
  addFile:        (slug: string, path: string, entry: FileEntry) => void;
  deleteFile:     (slug: string, path: string) => void;
  resetChallenge: (slug: string, seedFiles: FileMap) => void;
  getFileMap:     (slug: string, seedFiles: FileMap) => FileMap;
}
```

**Migration**: The old `sessions: Record<slug, Record<filename, string>>` is replaced by `fileMaps: Record<slug, FileMap>`. On first load, if old `sessions` key exists in localStorage, migrate it to `fileMaps` format.

---

## State Transitions

### FileMap lifecycle

```
[page load]
    │
    ▼
getFileMap(slug, seedFiles)
    ├─ fileMaps[slug] exists → return saved FileMap (may include user files)
    └─ no entry → return seedFiles converted to FileMap (all seed: true)
    │
    ▼
[user creates file]
    │
    ▼
addFile(slug, "./components/Button.jsx", { content: "", language: "jsx", seed: false })
    │
    ▼
[user edits code]
    │
    ▼
setFileContent(slug, "./App.jsx", newContent)
    │
    ▼
[user deletes file]
    │
    ▼
deleteFile(slug, "./components/Button.jsx")  ← blocked if seed: true
    │
    ▼
[user resets]
    │
    ▼
resetChallenge(slug, seedFiles)  ← rebuilds FileMap from seeds only, discards user files
```

---

## Bundler Pipeline

The bundler takes a `FileMap` and produces a self-contained HTML string for the iframe.

```
FileMap (all files)
    │
    ▼
transpileAll(fileMap)
  → TranspiledMap: Record<path, string>   (each file → CJS output)
    │
    ▼
buildBundle(transpiledMap, entryPath)
  → bundle string: module registry + require() + entry call
    │
    ▼
buildPlaygroundSrcdoc(bundle, css)
  → HTML string injected into iframe srcdoc
```

### Bundle string structure

```js
// 1. Module cache (prevents re-execution + handles circular imports)
var __modules = {};
var __cache = {};

// 2. Custom require() function
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var mod = { exports: {} };
  __cache[id] = mod;
  __modules[id](mod, mod.exports, __require);
  return mod.exports;
}

// 3. Module registrations (one per file)
__modules["./App.jsx"] = function(module, exports, require) {
  // ... transpiled CJS code for App.jsx ...
};
__modules["./components/Button.jsx"] = function(module, exports, require) {
  // ... transpiled CJS code for Button.jsx ...
};

// 4. Entry point execution + React mount
var __entry = __require("./App.jsx");
var App = __entry.default || __entry;
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(App)
);
```
