# Research: Playground File Explorer

**Phase**: 0 — Research
**Date**: 2026-05-10
**Branch**: `002-playground-file-explorer`

---

## Decision 1: In-Browser Multi-File Import Resolution

**Decision**: **Manual CommonJS registry** — transpile all files to CommonJS, wrap each in a factory function, build a synchronous `require()` map, inject into iframe.

**Rationale**:
- Zero new dependencies — Babel standalone is already installed and used
- Synchronous and deterministic — perfect for <20 files
- Circular imports handled naturally by a module cache map
- esbuild-wasm (~1.2MB WASM) is overkill; Import Maps + Blob URLs have circular import edge cases

**How it works**:
1. Starting from `entryFile`, collect ALL project files (we send all of them, not just reachable ones — simpler for <20 files)
2. Transpile each file with `presets: ["react", "transform-modules-commonjs"]` — produces `require()`/`exports` style output instead of UMD
3. Build a module registry object keyed by normalized path
4. Inject a custom `require()` function into the iframe that resolves paths against the registry, with a cache to handle circular imports
5. Call `require('./App')` (or whatever the entry file is) to kick off execution

**Path resolution rules**:
- `./Button` → try `./Button`, `./Button.jsx`, `./Button.js`, `./Button/index.jsx`, `./Button/index.js`
- Paths are normalized relative to the importing file's directory
- Paths that don't resolve → throw with "Module not found: X"

**Alternatives rejected**:
- `esbuild-wasm`: 1.2MB WASM load; overkill for a personal tool
- Import maps + Blob URLs: No native circular import protection; less browser support

---

## Decision 2: File Tree Storage Shape

**Decision**: **Flat `Record<path, FileEntry>` map** stored in Zustand. Display tree is computed from paths at render time.

**Rationale**:
- Simple to serialize/deserialize (plain object)
- Easy to add/remove/update any file by its path key
- Tree display logic is a pure function: `pathsToTree(Object.keys(map))`
- No risk of nested object mutation bugs

**Shape**:
```ts
type FileMap = Record<string, FileEntry>;
// e.g. { "./App.jsx": { content: "...", language: "jsx", seed: true },
//        "./components/Button.jsx": { content: "...", language: "jsx", seed: false } }
```

**Computed display tree** (pure fn, not stored):
```ts
function buildTree(fileMap: FileMap): TreeNode[]
```

**Alternatives rejected**:
- Nested tree object: complex to update deeply nested nodes; harder to serialize

---

## Decision 3: Inline File/Folder Creation UX

**Decision**: **Inline input row** inserted into the tree at the target location, dismissed on Enter or Escape. No modal.

**Rationale**: Matches VS Code UX (FR-011). Keeps user's eyes on the file tree. Simpler to implement than a modal.

**Pattern**: When "New File" is triggered, insert a temporary `<input>` row at the top of the target folder. On blur, Enter: create file; Escape or empty: cancel.

---

## Decision 4: Context Menu for Delete

**Decision**: **Custom right-click context menu** rendered as a floating overlay via a `contextmenu` event listener. No library needed — 2–4 items max.

**Rationale**: Minimal, matches VS Code pattern. Framer Motion already in project for animation. Simple absolute-positioned div.

---

## Decision 5: Transpilation Change (UMD → CommonJS)

**Decision**: Change `modules` Babel option from `"umd"` to `"commonjs"` for playground transpilation.

**Impact**: This affects `src/lib/challenges/transpile.ts`. The `PLAYGROUND_MOUNT_SRC` pattern in `build-srcdoc.ts` needs to change — with CommonJS output, the entry file will set `exports.default = App` or just `var App = function...` depending on the code. The mount code must call `require('./App')` and read `.default` from the exports.

**Rationale**: CommonJS output is compatible with the manual registry pattern and is simpler than UMD for in-browser use.
