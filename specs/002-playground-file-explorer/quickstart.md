# Quickstart: Playground File Explorer

**Date**: 2026-05-10

---

## No new dependencies

All required packages (`@babel/standalone`, `zustand`, `framer-motion`, `lucide-react`) are already installed.

---

## New / changed files

```
src/
  lib/
    challenges/
      file-tree.ts              ← NEW: FileMap/FileEntry types, buildTree(), validation helpers
      bundler.ts                ← NEW: buildBundle() — multi-file CommonJS bundler
      transpile.ts              ← CHANGE: switch to "commonjs" modules preset
    store/
      challenge.store.ts        ← CHANGE: replace sessions with fileMaps; add addFile/deleteFile
  components/
    hub/playground/
      FileExplorer.tsx          ← REWRITE: tree with context menu, inline input
      FileTreeNode.tsx          ← NEW: recursive tree node component
      FileNameInput.tsx         ← NEW: inline create input
      ContextMenu.tsx           ← NEW: floating right-click menu
  app/(hub)/playground/[slug]/
    PlaygroundPage.tsx          ← CHANGE: use fileMap from store; call buildBundle
```

---

## Key implementation notes

### 1. FileMap types (`src/lib/challenges/file-tree.ts`)

```ts
export interface FileEntry {
  content: string;
  language: "jsx" | "js" | "css";
  seed: boolean;
}
export type FileMap = Record<string, FileEntry>;

export function buildTree(fileMap: FileMap): TreeNode[] { ... }
export function validateFileName(name: string, siblings: string[]): string | null { ... }
export function normalizePath(importPath: string, fromFile: string): string { ... }
```

### 2. Bundler (`src/lib/challenges/bundler.ts`)

```ts
export async function buildBundle(fileMap: FileMap, entryPath: string): Promise<BundleResult> {
  const Babel = await import("@babel/standalone");
  const modules: Record<string, string> = {};

  // Transpile all JS/JSX files
  for (const [path, entry] of Object.entries(fileMap)) {
    if (entry.language === "css") continue;
    const result = Babel.transform(entry.content, {
      presets: ["react", "transform-modules-commonjs"],
      filename: path,
    });
    modules[path] = result.code ?? "";
  }

  // Build registry
  let registry = `var __m={};var __c={};\n`;
  registry += `function __req(id,from){`;
  registry += `var r=__resolve(id,from);`;
  registry += `if(__c[r])return __c[r].exports;`;
  registry += `var mod={exports:{}};__c[r]=mod;`;
  registry += `if(!__m[r])throw new Error("Module not found: "+id);`;
  registry += `__m[r](mod,mod.exports,function(i){return __req(i,r);});`;
  registry += `return mod.exports;}\n`;

  // Path resolver (handles ./Button → ./Button.jsx etc.)
  registry += `function __resolve(id,from){ ... }\n`;

  for (const [path, code] of Object.entries(modules)) {
    registry += `__m[${JSON.stringify(path)}]=function(module,exports,require){${code}};\n`;
  }

  // Entry + mount
  registry += `var __e=__req(${JSON.stringify(entryPath)},".");`;
  registry += `var App=__e.default||__e;`;
  registry += `ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));`;

  return { bundle: registry };
}
```

### 3. Change Babel preset in transpile.ts

The single-file `transpileJSX` function should switch from `modules: "umd"` to `"commonjs"`. The `PLAYGROUND_MOUNT_SRC` appended to source (Feature 001 fix) is **no longer needed** — mounting is now handled inside `buildBundle`'s entry call.

### 4. Store migration

`challenge.store.ts` changes `sessions` → `fileMaps`. On hydration, check if old `sessions` key exists and migrate:
```ts
// In persist.onRehydrateStorage or a migration function
if (state.sessions && !state.fileMaps) {
  state.fileMaps = {};
  for (const [slug, files] of Object.entries(state.sessions)) {
    state.fileMaps[slug] = {};
    for (const [filename, content] of Object.entries(files)) {
      state.fileMaps[slug][`./${filename}`] = {
        content: content as string,
        language: filename.endsWith(".css") ? "css" : "jsx",
        seed: true,
      };
    }
  }
  delete state.sessions;
}
```

### 5. FileExplorer context menu

Use a `useState` for `{ x, y, node }` — set on `contextmenu` event, clear on click-outside.

### 6. Inline file creation

In `FileExplorer`, maintain `creatingIn: string | null` state — the folder path where the input row should appear (`"."` for root). Insert a `<FileNameInput>` at the top of that folder's children.

---

## Verification checklist

- [ ] `pnpm build` passes
- [ ] `./Button` import resolves when `Button.jsx` exists
- [ ] Importing missing file shows console error, not crash
- [ ] Seed files: delete blocked, content preserved after reset
- [ ] User files: persist across page reload, removed on reset
- [ ] Creating file in folder puts it at correct path
- [ ] Max 20 user files enforced
