# Tasks: Playground File Explorer

**Input**: Design documents from `specs/002-playground-file-explorer/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-contracts.md ✓, quickstart.md ✓

**Tests**: Unit tests for pure logic (file-tree.ts, bundler path resolver, store actions). No UI tests.

**Organization**: Tasks grouped by user story. Each story independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Create new file stubs so imports resolve during incremental development

- [x] T001 Create empty stub files: `src/lib/challenges/file-tree.ts`, `src/lib/challenges/bundler.ts`, `src/components/hub/playground/FileTreeNode.tsx`, `src/components/hub/playground/FileNameInput.tsx`, `src/components/hub/playground/ContextMenu.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that every user story depends on — types, bundler, store migration, Babel preset change

**⚠️ CRITICAL**: All Phase 3+ work blocks on this phase

- [x] T002 [P] Create `src/lib/challenges/file-tree.ts` — export: `FileEntry` interface `{ content, language, seed }`; `FileMap` type `Record<string, FileEntry>`; `TreeNode` discriminated union `{ kind:"file"|"folder", path, name, children? }`; `buildTree(fileMap: FileMap, folders: string[]): TreeNode[]` (derives folder nodes from stored folder list + file paths); `validateFileName(name: string, siblings: string[]): string | null` (returns error string or null); `normalizePath(importId: string, fromFile: string): string[]` (returns candidate paths in resolution order: `./Button` → `["./Button","./Button.jsx","./Button.js","./Button/index.jsx","./Button/index.js"]`)
- [x] T003 [P] Create `src/lib/challenges/bundler.ts` — export `buildBundle(fileMap: FileMap, entryPath: string): Promise<{ bundle: string; error?: string }>`: (1) transpile all jsx/js files with Babel presets `["react","transform-modules-commonjs"]`; (2) build registry string with `__m` (module factories), `__c` (cache), `__resolve(id, from)` (uses `normalizePath` to find first matching key in `__m`), `__req(id, from)` (cache-first factory call); (3) register each transpiled file as `__m["./path"]=function(module,exports,require){...}`; (4) append entry call: `var __e=__req("./App.jsx","."); var App=__e.default||__e; ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));`; (5) extract CSS files and return separately via `css` field
- [x] T004 Update `src/lib/store/challenge.store.ts` — replace `sessions: Record<slug,Record<filename,string>>` with `fileMaps: Record<slug, FileMap>` and `folders: Record<slug, string[]>`; add actions: `addFile(slug,path,entry)`, `deleteFile(slug,path)`, `addFolder(slug,path)`, `deleteFolder(slug,path)` (also deletes all files with that path prefix), `getFileMap(slug, seedFileMap): FileMap` (returns stored or builds from seeds); add localStorage migration: on hydration if old `sessions` key found, convert each `Record<filename,string>` to `FileMap` with `seed:true`; update `resetChallenge` to wipe user files+folders and restore only seeds
- [x] T005 Update `src/lib/challenges/transpile.ts` — change `modules: "umd"` to `"commonjs"` in Babel preset options; keep `transpileJSX` export for backward compatibility (still used by bundler internally) but note single-file path is deprecated in favour of `buildBundle`
- [x] T006 Update `src/lib/interview/build-srcdoc.ts` — remove `PLAYGROUND_MOUNT_SRC` export (mount is now inside the bundle); update `buildPlaygroundSrcdoc(bundle, css?)` to inject `bundle` directly into `<script>` without any outer IIFE or mount wrapper — the bundle already contains the registry + `ReactDOM.createRoot` mount call

**Checkpoint**: `pnpm build` passes. `buildBundle` can be imported. Store compiles. No runtime yet.

---

## Phase 3: User Story 1 — Create a New File (Priority: P1) 🎯 MVP

**Goal**: Learner can create a new file via toolbar or context menu, name it inline, and immediately edit it in the code editor.

**Independent Test**: Open `/playground/react-counter`. Click "New File" toolbar icon — inline input appears at root. Type `Button.jsx`, press Enter. Confirm file appears in tree, opens in editor, can be edited, and preview still works.

### Implementation

- [x] T007 [P] [US1] Create `src/components/hub/playground/FileNameInput.tsx` — `"use client"`; props: `{ type: "file"|"folder", depth: number, existingNames: string[], onConfirm: (name:string)=>void, onCancel: ()=>void }`; auto-focuses on mount via `useRef`; Enter: validate with `validateFileName`, call `onConfirm` if valid else show inline error span; Escape or blur: call `onCancel`; renders indented to match tree depth
- [x] T008 [P] [US1] Create `src/components/hub/playground/ContextMenu.tsx` — `"use client"`; props: `{ x:number, y:number, node:TreeNode, isSeed:boolean, onNewFile:()=>void, onNewFolder:()=>void, onDelete:()=>void, onClose:()=>void }`; renders fixed-position overlay at `{x,y}`; items: "New File Here" + "New Folder Here" (show only for folder nodes); "Delete" (always shown, disabled with `title="Seed file — cannot be deleted"` if `isSeed`); click-outside closes via `useEffect` + `mousedown` listener on `document`
- [x] T009 [US1] Create `src/components/hub/playground/FileTreeNode.tsx` — `"use client"`; recursive component; props match `FileTreeNodeProps` from contracts; file row: icon + name, click → `onFileSelect`, right-click → `onContextMenu`; folder row: chevron + folder icon + name, click → `onToggleFolder`, right-click → `onContextMenu`; if `creatingIn === node.path` and node is folder and expanded: render `<FileNameInput>` as first child; indent rows by `depth * 12px`; active file highlighted
- [x] T010 [US1] Rewrite `src/components/hub/playground/FileExplorer.tsx` — `"use client"`; owns `expandedFolders: Set<string>`, `creatingIn: {path:string; type:"file"|"folder"}|null`, `contextMenu: {x:number;y:number;node:TreeNode}|null`; toolbar: "New File" icon (targets root or last selected folder), "New Folder" icon; renders `buildTree(fileMap, folders)` using `<FileTreeNode>`; `onCreateConfirm` calls `onCreateFile` or `onCreateFolder` prop with correct parent path + name; `onContextMenu` sets contextMenu state and renders `<ContextMenu>`; props: `FileExplorerProps` per contracts/ui-contracts.md
- [x] T011 [US1] Update `src/components/hub/playground/PlaygroundShell.tsx` — replace `files: Record<string,string>` prop with `fileMap: FileMap` + `folders: string[]`; add props `onCreateFile`, `onCreateFolder`, `onDeleteFile`, `onDeleteFolder`; pass them to `<FileExplorer>`; update `CodeEditor` value lookup to `fileMap[activeFile]?.content ?? ""`
- [x] T012 [US1] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — build `seedFileMap: FileMap` from `challenge.files`; read `fileMap` from `useChallengeStore.getFileMap(slug, seedFileMap)` and `folders` from store; replace `transpileJSX` + debounce with `buildBundle(fileMap, entryFile)`; extract CSS from fileMap and pass to `buildPlaygroundSrcdoc(bundle, css)`; implement `handleCreateFile(parentPath, filename)` → `addFile`; implement `handleDeleteFile(path)` → `deleteFile`; update `handleReset` to use new `resetChallenge` API; remove `PLAYGROUND_MOUNT_SRC` import

**Checkpoint**: `pnpm build` passes. Dev server: new file creation works, inline input validates names, file appears in tree and editor, preview still renders.

---

## Phase 4: User Story 2 — Create a Folder (Priority: P2)

**Goal**: Learner can create named folders, expand/collapse them, and create files inside them.

**Independent Test**: Create folder `components`. Confirm it appears in tree with folder icon. Click to expand (empty). Create `Button.jsx` inside it (via "New File Here" from context menu on the folder). Confirm path is `./components/Button.jsx`.

### Implementation

- [x] T013 [US2] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` to implement `handleCreateFolder(parentPath, foldername)` → calls `useChallengeStore.addFolder(slug, fullFolderPath)`; ensure `folders` state from store is passed to `PlaygroundShell` → `FileExplorer` → `buildTree`
- [x] T014 [US2] Update `src/components/hub/playground/FileExplorer.tsx` — when `creatingIn` has `type:"folder"`, `onCreateConfirm` calls `onCreateFolder` prop instead of `onCreateFile`; "New Folder Here" in context menu on a folder node sets `creatingIn` to that folder's path with `type:"folder"`; enforce max 3-level nesting: disable "New Folder Here" at depth ≥ 2

**Checkpoint**: `pnpm build` passes. Dev server: creating a folder shows it in tree; creating a file inside it uses correct path prefix.

---

## Phase 5: User Story 3 — Import Across Files (Priority: P2)

**Goal**: Files created by the learner can import from each other using relative paths; the preview resolves them correctly.

**Independent Test**: Create `components/Button.jsx` with `export default function Button(){ return <span>Hi</span>; }`. In `App.jsx`, add `import Button from './components/Button'; function App(){ return <Button />; }`. Preview renders "Hi".

### Implementation

- [x] T015 [P] [US3] Write unit tests for `normalizePath` and `__resolve` logic in `src/lib/challenges/file-tree.test.ts` — test: `./Button`→candidates include `./Button.jsx`; `../utils`→candidates include `../utils/index.jsx`; absolute path rejected; path from subfolder resolves correctly relative to importer's directory
- [x] T016 [US3] Update `src/modules/challenges/react-counter/index.ts` — add a third file `components/Counter.jsx` that exports a component, and update `App.jsx` starter code to import from `./components/Counter` so the bundler's import resolution is exercised in the reference challenge
- [x] T017 [US3] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — in `rebuildPreview`, catch bundler errors of type "Module not found" and push them as console entries with `method:"error"` instead of crashing the preview; ensure `consoleEntries` are cleared before each rebuild attempt

**Checkpoint**: Dev server: multi-file import resolves in preview. Missing import shows error in console, not blank page.

---

## Phase 6: User Story 4 — Delete a File or Folder (Priority: P3)

**Goal**: Learner can delete user-created files and non-empty folders; seed files are protected.

**Independent Test**: Create `Temp.jsx`. Right-click → Delete → confirm. File disappears from tree. Right-click `App.jsx` (seed) → Delete → action is blocked with message. Create folder `utils` with a file inside; right-click folder → Delete → both folder and file removed.

### Implementation

- [x] T018 [US4] Update `src/components/hub/playground/ContextMenu.tsx` — "Delete" item: if `isSeed`, show disabled button with tooltip; otherwise, on click call `onDelete()`; parent (`FileExplorer`) implements delete handler that calls `onDeleteFile(path)` or `onDeleteFolder(path)` prop after `window.confirm("Delete X? This cannot be undone.")`
- [x] T019 [US4] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — implement `handleDeleteFolder(folderPath)` → calls `useChallengeStore.deleteFolder(slug, folderPath)` (which removes folder entry + all files with `path.startsWith(folderPath+"/")` from store); if `activeFile` is inside deleted folder, switch active file to `challenge.entryFile`

**Checkpoint**: `pnpm build` passes. Dev server: delete works for user files/folders; seed files blocked.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Write unit tests for `src/lib/challenges/file-tree.ts` in `src/lib/challenges/file-tree.test.ts` — test: `buildTree` produces correct nested structure; `validateFileName` rejects empty/duplicate/invalid-chars; `normalizePath` returns correct candidate list
- [x] T021 [P] Write unit tests for new store actions in `src/lib/store/challenge.store.test.ts` — test: `addFile` stores entry; `deleteFile` removes entry; `addFolder` stores folder path; `deleteFolder` removes folder + child files; `resetChallenge` removes user files, restores seeds; migration from old `sessions` format
- [x] T022 Enforce max 20 user files in `src/components/hub/playground/FileExplorer.tsx` — count non-seed entries in `fileMap`; disable "New File" toolbar icon and "New File Here" context item when count ≥ 20; show tooltip "File limit reached (20 max)"
- [x] T023 Run `pnpm build` — fix all TypeScript errors before marking feature complete
- [x] T024 Run `pnpm test` — all tests pass including new unit tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — all 6 tasks can start after T006
- **US2 (Phase 4)**: Depends on US1 (extends FileExplorer + PlaygroundPage)
- **US3 (Phase 5)**: Depends on Foundational (bundler must exist); T015 can start after T002; T016/T017 need US1 complete
- **US4 (Phase 6)**: Depends on US1 (ContextMenu component must exist)
- **Polish (Phase 7)**: T020/T021 can start after Foundational; T022 needs US1; T023/T024 need all stories

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational — MVP
- **US2 (P2)**: Builds on US1's FileExplorer — implement after US1
- **US3 (P2)**: Bundler is Foundational; UI parts need US1 complete
- **US4 (P3)**: ContextMenu from US1 — implement after US1

### Within Phase 3 (US1)

- T007 (FileNameInput) + T008 (ContextMenu): fully parallel
- T009 (FileTreeNode): needs T007 (renders FileNameInput)
- T010 (FileExplorer): needs T008 + T009
- T011 (PlaygroundShell): parallel with T010 (different file)
- T012 (PlaygroundPage): needs T010 + T011

---

## Parallel Example: Phase 2 (Foundational)

```
# Can run together:
T002  file-tree.ts        (types + helpers)
T003  bundler.ts          (multi-file bundler)

# Sequential after T002+T003:
T004  challenge.store.ts  (uses FileMap from T002)
T005  transpile.ts        (Babel preset change, independent)
T006  build-srcdoc.ts     (remove PLAYGROUND_MOUNT_SRC)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T006)
3. Phase 3: US1 (T007–T012)
4. **STOP and VALIDATE**: Create file, confirm it appears in tree, opens in editor, preview still works
5. Users can create and edit new files — core value delivered

### Incremental Delivery

1. Setup + Foundational → bundler + store ready
2. US1 → file creation works (MVP)
3. US2 → folder creation works
4. US3 → cross-file imports resolve in preview
5. US4 → delete works
6. Polish → tests green, build clean

---

## Notes

- [P] = different files, no dependency on incomplete tasks in same phase
- `buildTree` must always receive `folders` array from store so empty folders persist
- Seed files: check `fileMap[path]?.seed === true` before allowing delete
- `buildBundle` must handle the case where `fileMap` has only seed files (single-file scenario) — should still produce valid bundle
- `normalizePath` is the critical function — test it thoroughly (T015, T020)
- Migration from Feature 001's `sessions` shape is a one-time on-rehydrate transform; test it (T021)
- `pnpm build` must pass after T023 before closing feature
