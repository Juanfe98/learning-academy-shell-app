# Tasks: Robust Code Editor Upgrade (Monaco)

**Input**: Design documents from `specs/004-monaco-editor-upgrade/`
**Branch**: `004-monaco-editor-upgrade`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Install the one new dependency and verify it resolves correctly before any code is written.

- [ ] T001 Install `@monaco-editor/react` via `pnpm add @monaco-editor/react` and verify `pnpm build` still passes (package.json + pnpm-lock.yaml updated)

**Checkpoint**: `pnpm build` passes with new package installed. `node_modules/@monaco-editor/react` exists.

---

## Phase 2: Foundational — Monaco Configuration Module

**Purpose**: Create the shared Monaco config module that all subsequent tasks depend on. Every other task calls `initMonacoDefaults` and `getEditorOptions` from here.

**⚠️ CRITICAL**: T003–T007 all import from this module. Must be complete and type-safe before building the editor component.

- [ ] T002 Create `src/lib/editor/monaco-config.ts` — export `initMonacoDefaults(monaco: Monaco): void` (calls `setEagerModelSync(true)`, sets TypeScript compiler options for React TSX, defines and applies the `se-hub-dark` theme matching CSS tokens: `editor.background: #1a1a24`, `editorGutter.background: #13131a`, `editorLineNumber.foreground: #5a5a78`, `editor.selectionBackground: #6366f130`, `editorCursor.foreground: #0ea5e9`, `editorError.foreground: #ef4444`, `editorWarning.foreground: #f59e0b`)
- [ ] T003 Add `getEditorOptions(): Record<string, unknown>` to `src/lib/editor/monaco-config.ts` — returns Monaco editor construction options: `minimap: { enabled: false }`, `fontSize: 14`, `fontFamily: "ui-monospace, monospace"`, `automaticLayout: true`, `scrollBeyondLastLine: false`, `padding: { top: 8 }`, `bracketPairColorization: { enabled: true }`, `cursorBlinking: "smooth"`, `smoothScrolling: true`
- [ ] T004 Add `loadReactTypes(monaco: Monaco): Promise<void>` to `src/lib/editor/monaco-config.ts` — fetches `https://unpkg.com/@types/react@18/index.d.ts`, calls `typescriptDefaults.addExtraLib(content, 'file:///node_modules/@types/react/index.d.ts')`, silently swallows fetch errors (degraded but no crash)

**Checkpoint**: `pnpm build` passes. `monaco-config.ts` exports three functions with correct TypeScript types.

---

## Phase 3: User Story 1 — TypeScript-Aware Editing (Priority: P1) 🎯 MVP

**Goal**: Learner sees hover types, inline error squiggles, and type-aware autocomplete when editing `.ts`/`.tsx` files.

**Independent Test**: Install dev server (`pnpm dev`). Open `/playground/react-typed-counter`. Hover over `useState` → tooltip shows type. Assign a string to a number-typed variable → red squiggle appears within 1s without running code. Type `count.` → object method suggestions appear.

- [ ] T005 [US1] Create `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — `'use client'` component; import `Editor` and `useMonaco` from `@monaco-editor/react`; declare `MonacoPlaygroundEditorProps` interface: `{ filename: string; value: string; onChange: (value: string) => void; fileMap: FileMap; onFileNavigate?: (path: string) => void }`; import `FileMap` from `@/lib/challenges/file-tree`; import `initMonacoDefaults`, `getEditorOptions`, `loadReactTypes` from `@/lib/editor/monaco-config`
- [ ] T006 [US1] Implement Monaco initialization in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — use `useMonaco()` hook; in `useEffect` when `monaco` is available: call `initMonacoDefaults(monaco)`, then `loadReactTypes(monaco)` (non-blocking); use a module-level `let initialized = false` guard so initialization runs exactly once per page lifetime
- [ ] T007 [US1] Implement model management in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — maintain `modelsRef: React.MutableRefObject<Map<string, monaco.editor.ITextModel>>` and `editorRef`; in `useEffect` watching `fileMap` and `monaco`: if fileMap keys differ from current model set, dispose all existing models and create new ones using `monaco.editor.createModel(content, language, monaco.Uri.parse('file:///challenge/' + filename))` where language is derived from extension (`.tsx`/`.ts` → `'typescript'`, `.jsx`/`.js` → `'javascript'`, `.css` → `'css'`); set active model to match current `filename` prop
- [ ] T008 [US1] Implement file switch on `filename` prop change in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — in `useEffect` watching `filename`: if `editorRef.current` and model for new filename URI exists, call `editor.setModel(model)`; if model content differs from `value` prop, call `model.setValue(value)` to sync external resets
- [ ] T009 [US1] Wire `onChange` in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — in `onMount` callback: store `editor` in `editorRef`; register `editor.onDidChangeModelContent(() => onChange(editor.getValue()))` listener; return JSX: `<Editor height="100%" theme="se-hub-dark" options={getEditorOptions()} onMount={handleMount} />`

**Checkpoint**: Load `/playground/react-typed-counter`. TypeScript hover tooltips visible. Introduce `const x: number = "hello"` → red squiggle appears inline. No console errors.

---

## Phase 4: User Story 2 — Go-to-Definition (Priority: P1)

**Goal**: Cmd+Click or F12 on an imported symbol navigates the editor to its definition file and updates the active file in the file explorer.

**Independent Test**: In `react-typed-counter`, Cmd+Click on `CounterProps` in `App.tsx`. Editor switches to `types.ts`, cursor lands on the `CounterProps` interface definition. File explorer highlights `types.ts`.

- [ ] T010 [US2] Implement `registerEditorOpener` in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — inside the `onMount` handler after `editorRef` is set: call `monaco.editor.registerEditorOpener({ openCodeEditor: (source, resource, selectionOrPosition) => { ... } })`; in the handler: extract `uri = resource.toString()`; if `modelsRef.current.has(uri)`, call `editor.setModel(model)`, resolve position from `selectionOrPosition`, call `editor.setPosition` + `editor.revealLineInCenter`; call `onFileNavigate?.('./' + uri.replace('file:///challenge/', ''))` to sync file explorer; `return true`; if no model found, `return false`; store disposable and clean up on unmount

**Checkpoint**: Cmd+Click `CounterProps` in `App.tsx` → editor shows `types.ts` at line 1. `PlaygroundPage` `activeFile` state updates → file explorer selection changes.

---

## Phase 5: User Story 3 — Import Path Autocomplete (Priority: P2)

**Goal**: Typing `from "./"` inside an import statement shows relative path suggestions for all challenge files.

**Independent Test**: In `App.tsx`, delete the existing import and retype `import type { CounterProps } from "./`. Dropdown shows `types` and `styles.css` as completions. Selecting `types` inserts `./types`.

- [ ] T011 [US3] Implement custom `CompletionItemProvider` in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — inside `onMount`, register for both `'typescript'` and `'javascript'`; trigger characters: `['.', '/']`; in `provideCompletionItems`: get `lineContent` from model at current position; match against `/from\s+["']([^"']*)/` or `/import\s*\(\s*["']([^"']*)/`; if no match, return `{ suggestions: [] }`; compute current file directory from `model.uri`; iterate `modelsRef.current` entries; compute relative path from current dir to each model URI; filter by partial path already typed; return `CompletionItem[]` with `kind: monaco.languages.CompletionItemKind.File`; strip `.ts`/`.tsx` extension from suggestions (matches Node/TS import convention); store disposable and clean up on unmount

**Checkpoint**: Type `from "./"` in a `.tsx` file → dropdown shows other challenge files. Tab/Enter inserts correct relative path.

---

## Phase 6: User Story 4 — IDE Comfort Features (Priority: P3)

**Goal**: Bracket matching, find-in-file (Cmd+F), and multi-cursor (Cmd+D) work out of the box.

**Independent Test**: Open any challenge. Place cursor beside `{` → matching `}` highlighted. Press Cmd+F → find bar opens. Select a word, press Cmd+D → next occurrence selected.

- [ ] T012 [P] [US4] Verify Monaco default keyboard bindings in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` — confirm `getEditorOptions()` does NOT include `readOnly: true` or any keymap override that disables Cmd+F or Cmd+D; add `matchBrackets: 'always'` to options in `src/lib/editor/monaco-config.ts`

**Note**: Monaco provides bracket matching, find-in-file, and multi-cursor by default. T012 is a validation + config task, not a feature implementation.

**Checkpoint**: All three shortcuts work without additional code.

---

## Phase 7: Wiring — Shell and Page Updates

**Purpose**: Connect the new Monaco editor component into the existing playground layout.

**⚠️**: Both T013 and T014 must complete before smoke testing. T013 (PlaygroundShell) must be done before T014 (PlaygroundPage) compiles cleanly.

- [ ] T013 Update `src/components/hub/playground/PlaygroundShell.tsx` — extend the `Props` interface: add `fileMap: FileMap` and `onFileNavigate: (path: string) => void`; extend the `CodeEditor` prop's component type to include `fileMap?: FileMap` and `onFileNavigate?: (path: string) => void`; in the JSX where `<CodeEditor>` is rendered, pass `fileMap={fileMap}` and `onFileNavigate={onFileNavigate}`; add `import type { FileMap } from "@/lib/challenges/file-tree"` at top
- [ ] T014 Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — change the `dynamic` import from `PlaygroundCodeEditor` to `MonacoPlaygroundEditor`; add `fileMap={fileMap}` and `onFileNavigate={setActiveFile}` to the `<PlaygroundShell>` JSX; no other logic changes needed

**Checkpoint**: `pnpm build` passes. Playground pages load Monaco editor.

---

## Phase 8: Polish & Verification

**Purpose**: Confirm build health, zero regression, and all user stories work end-to-end.

- [ ] T015 Run `pnpm build` — all files must compile with zero TypeScript errors
- [ ] T016 [P] Smoke test US1 (TypeScript-aware editing) — open `/playground/react-typed-counter`; hover over `useState` → type tooltip; introduce type error → red squiggle within 1s; autocomplete shows method suggestions
- [ ] T017 [P] Smoke test US2 (go-to-definition) — Cmd+Click `CounterProps` in `App.tsx` → editor shows `types.ts` at definition; file explorer updates
- [ ] T018 [P] Smoke test US3 (import path autocomplete) — type `from "./"` → dropdown shows `types`, `styles.css`; select completion → correct path inserted
- [ ] T019 [P] Smoke test US4 (IDE comfort) — Cmd+F opens find bar; Cmd+D selects next occurrence; bracket beside `{` highlights matching `}`
- [ ] T020 [P] Regression test `react-counter` (JS challenge) — open `/playground/react-counter`; editor loads; live preview renders; no TypeScript-specific features active; no console errors
- [ ] T021 [P] Regression test `ts-oop-shapes` (node-ts) — open `/playground/ts-oop-shapes`; Monaco loads; preview panel absent; console output works; no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (package installed)
- **Phase 3 (US1)**: Depends on Phase 2 (monaco-config.ts complete)
- **Phase 4 (US2)**: Depends on Phase 3 (editor component exists with `editorRef` + `modelsRef`)
- **Phase 5 (US3)**: Depends on Phase 3 (same `modelsRef` used in completion provider)
- **Phase 6 (US4)**: Depends on Phase 2 (just config options — no dep on US1 editor impl)
- **Phase 7 (Wiring)**: Depends on Phase 3 complete (`MonacoPlaygroundEditor` exportable)
- **Phase 8 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2
- **US2 (P1)**: Depends on US1 (needs `editorRef` and `modelsRef` from US1 tasks)
- **US3 (P2)**: Depends on US1 (needs `modelsRef`)
- **US4 (P3)**: Depends only on Phase 2 (config options)

### Parallel Opportunities

```bash
# After Phase 2 completes:
- T005–T009 (US1 editor component) — sequential within same file
- T012 (US4 config options) — different file, can run in parallel with US1

# After Phase 3 (US1 editor component) completes:
- T010 (US2 go-to-def)  ← depends on editorRef/modelsRef from US1
- T011 (US3 completions) ← depends on modelsRef from US1
# T010 and T011 can run in parallel (both add to same file, different sections)

# Phase 7 wiring runs after Phase 3 (component exportable):
- T013 (PlaygroundShell) → then T014 (PlaygroundPage) — sequential

# Phase 8 smoke tests all parallel:
- T016–T021 run in parallel
```

---

## Implementation Strategy

### MVP First (US1 + Wiring — 11 tasks)

1. T001: Install package
2. T002–T004: `monaco-config.ts`
3. T005–T009: `MonacoPlaygroundEditor.tsx` (US1 only — no go-to-def, no completions yet)
4. T013–T014: Wire into PlaygroundShell + PlaygroundPage
5. T015: `pnpm build`
6. **STOP and VALIDATE**: TypeScript IntelliSense works; challenges load

### Full Delivery (all 21 tasks)

1. T001 (setup) → T002–T004 (config) → T005–T009 (US1 editor)
2. T010 (US2) ∥ T011 (US3) — both extend same component, can be done together
3. T012 (US4) — tiny config change
4. T013 → T014 (wiring)
5. T015 → T016–T021 (parallel smoke tests)

---

## Notes

- Monaco's `automaticLayout: true` is CRITICAL — without it, the editor won't resize when the panel resizes
- `setEagerModelSync(true)` MUST be called before any model is created — order matters
- Module-level `initialized` flag prevents double-initialization across hot reloads in dev
- `onFileNavigate` receiving `./types.ts` (not just `types.ts`) must match the `activeFile` format in `PlaygroundPage` (all keys use `./` prefix)
- `@monaco-editor/react` peer dep `monaco-editor` is auto-installed by pnpm — no separate `pnpm add monaco-editor` needed
- `PlaygroundCodeEditor.tsx` is NOT deleted — interview views may still reference it indirectly
