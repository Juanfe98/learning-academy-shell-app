# UI Contracts: Playground File Explorer

**Phase**: 1 — Design
**Date**: 2026-05-10

---

## FileExplorer (replaces existing)

```ts
interface FileExplorerProps {
  fileMap: FileMap;
  activeFile: string;                         // currently open file path
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, filename: string) => void;
  onCreateFolder: (parentPath: string, foldername: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (folderPath: string) => void;
}
```

**Behaviour**:
- Renders `buildTree(fileMap)` as a collapsible tree
- Toolbar icons: New File, New Folder (scoped to root or selected folder)
- Right-click on any item shows context menu with Delete (blocked for seed files)
- New file/folder triggers an inline `FileNameInput` row at the correct tree position
- Active file highlighted; active folder auto-expanded

---

## FileTreeNode (internal, recursive)

```ts
interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  activeFile: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  creatingIn: string | null;                  // folder path where inline input is shown
  onCreateConfirm: (name: string) => void;
  onCreateCancel: () => void;
}
```

---

## FileNameInput (inline)

```ts
interface FileNameInputProps {
  type: "file" | "folder";
  depth: number;
  existingNames: string[];                    // sibling names for duplicate validation
  onConfirm: (name: string) => void;
  onCancel: () => void;
}
```

**Behaviour**: Auto-focused on mount; Enter = confirm (if valid); Escape = cancel; blur = cancel. Shows inline error if name is invalid or duplicate.

---

## ContextMenu (floating overlay)

```ts
interface ContextMenuProps {
  x: number;
  y: number;
  node: TreeNode;
  onDelete: () => void;
  onClose: () => void;
}
```

**Items**:
- "New File Here" (folders only)
- "New Folder Here" (folders only)
- "Delete" (files: always shown; seed files: shown but disabled with tooltip "Seed file — cannot be deleted")

---

## PlaygroundPage changes

`PlaygroundPage` orchestrates the extended store:

```ts
// NEW: fileMap replaces flat fileEdits
const fileMap = useChallengeStore(s => s.getFileMap(slug, seedFileMap));

// NEW: pass fileMap to shell instead of flat files object
<PlaygroundShell
  fileMap={fileMap}
  ...
/>
```

---

## Bundler API

```ts
// src/lib/challenges/bundler.ts

interface BundleResult {
  bundle: string;      // ready-to-inject JS string
  error?: string;
}

async function buildBundle(
  fileMap: FileMap,
  entryPath: string
): Promise<BundleResult>
```

**Contract**:
- Transpiles all `jsx`/`js` files in `fileMap` with Babel (CommonJS output)
- Builds the module registry string (see data-model.md)
- Returns `bundle` string + optional `error`
- CSS files: extracted separately and passed to `buildPlaygroundSrcdoc(bundle, css)`
- Import resolution: `./Button` → tries `./Button`, `./Button.jsx`, `./Button.js` in order

---

## Page-level data flow (updated)

```
/playground/[slug]/page.tsx  (Server Component)
    │  challenge: Challenge
    ▼
PlaygroundPage  ("use client")
    │
    ├─ builds seedFileMap from challenge.files
    ├─ reads fileMap from useChallengeStore.getFileMap(slug, seedFileMap)
    ├─ owns: activeFile, consoleEntries (useState)
    ├─ on code change: debounce 500ms → buildBundle(fileMap, entryFile) → setSrcdoc
    │
    └─ renders PlaygroundShell
           ├─ FileExplorer (fileMap, callbacks)
           ├─ PlaygroundCodeEditor (activeFile content)
           ├─ PlaygroundPreviewFrame (srcdoc)
           └─ PlaygroundConsolePanel (consoleEntries)
```
