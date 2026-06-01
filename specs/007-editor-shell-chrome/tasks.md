# Tasks: Editor Shell — VS Code-Style Chrome

**Input**: Design documents from `/specs/007-editor-shell-chrome/`  
**Branch**: `007-editor-shell-chrome`  
**No tests requested** — UI components, verified manually via `pnpm dev`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files, no shared deps)
- **[Story]**: User story this task serves (US1 = tabs, US2 = status bar, US3 = breadcrumbs)

---

## Phase 1: Setup (Remove Old Chrome)

**Purpose**: Remove the existing filename label from `MonacoPlaygroundEditor` before new chrome is added. One task — unblocks all phases.

- [x] T001 Remove the 4-line filename `<div>` (lines 246–253) in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` that displays `{filename.replace(/^\.\//, "")}` — this is replaced by EditorTabBar

**Checkpoint**: Editor renders without the filename label strip. Monaco editor fills the column.

---

## Phase 2: Foundational (openTabs State + Prop Threading)

**Purpose**: Add `openTabs` state to `PlaygroundPage` and thread tab props through `PlaygroundShell` into `MonacoPlaygroundEditor`. Required before US1 can be implemented. US2 and US3 do NOT depend on this phase — they can proceed in parallel after Phase 1.

⚠️ **CRITICAL**: US1 blocks on T002–T005. US2 and US3 can start at T006/T009/T013 immediately after T001.

- [x] T002 Add `openTabs: string[]` state (initialized from `Object.keys(seedFileMap)`) and `handleTabClose` as `useCallback` to `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — see contracts/ui-contracts.md for exact code
- [x] T003 Extend the 4 existing `useCallback` handlers in `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` to sync `openTabs`: `handleCreateFile` (append), `handleDeleteFile` (remove), `handleDeleteFolder` (remove prefix), `handleReset` (reset to seedFileMap keys)
- [x] T004 Extend `PlaygroundShell` props interface and `CodeEditor` prop type in `src/components/hub/playground/PlaygroundShell.tsx` with `openTabs: string[]`, `onTabSelect: (path: string) => void`, `onTabClose: (path: string) => void`; pass all three into the `<CodeEditor ... />` call
- [x] T005 Extend `Props` interface in `src/components/hub/playground/MonacoPlaygroundEditor.tsx` with `openTabs: string[]`, `onTabSelect: (path: string) => void`, `onTabClose: (path: string) => void`

**Checkpoint**: `pnpm build` passes with no type errors. Playground page still works (tabs not visible yet).

---

## Phase 3: User Story 1 — File Tab Bar (Priority: P1) 🎯 MVP

**Goal**: Replace filename label with a horizontal tab bar. Clicking tabs switches files. Close button removes tabs.

**Independent Test**: Open any multi-file challenge → see tabs for all files → click a tab → editor content switches → active tab is highlighted → `×` removes non-active tab → status bar and breadcrumbs are NOT required for this to work.

- [x] T006 [P] [US1] Create `src/components/hub/playground/EditorTabBar.tsx` — define module-scope pure functions: `getFileLanguage(path): TabLanguage` (maps extension to `tsx/ts/jsx/js/css/other`) and `getTabLabel(path): string` (extracts filename, caps at 18 chars with `…`); define `Tab` interface and `toTab(path, activeFile): Tab`
- [x] T007 [US1] Implement `EditorTabBar` component body in `src/components/hub/playground/EditorTabBar.tsx`: `useMemo` to derive `tabs` from `openTabs`+`activeFile`; render horizontal flex container with `overflow-x: auto` + hidden scrollbar; one tab per entry with colored 8px dot (cyan=tsx, blue=ts, yellow=js/jsx, purple=css, gray=other), label, active underline (`border-bottom: 2px solid var(--accent-primary)`), and `×` button when `openTabs.length > 1`; export as `React.memo(EditorTabBar)`
- [x] T008 [US1] Wire `EditorTabBar` as first child inside the root `<div>` of `src/components/hub/playground/MonacoPlaygroundEditor.tsx`, passing `openTabs`, `activeFile` (= `filename` prop with `./` prefix restored), `onTabSelect`, `onTabClose`

**Checkpoint**: `pnpm dev` → open playground → all files appear as tabs → tab switching works → close button removes tab.

---

## Phase 4: User Story 2 — Status Bar (Priority: P2)

**Goal**: Persistent bottom strip showing cursor position, language mode, error and warning counts from Monaco diagnostics.

**Independent Test**: Open any challenge → move cursor to line 5, col 3 → status bar shows `Ln 5, Col 3` → introduce a TS type error → `⨯ 1` appears in red → fix it → count clears. No tabs or breadcrumbs required.

- [x] T009 [P] [US2] Create `src/components/hub/playground/EditorStatusBar.tsx` — define module-scope pure function `getLanguageLabel(filename: string): string` (maps `.tsx/.ts` → `"TypeScript"`, `.js/.jsx` → `"JavaScript"`, `.css` → `"CSS"`, default `"Plain Text"`); define `EditorStatusBarProps` interface with `line`, `col`, `language`, `errors`, `warnings`
- [x] T010 [US2] Implement `EditorStatusBar` component body in `src/components/hub/playground/EditorStatusBar.tsx`: `height: 22px`, `font-size: 11px`, `font-mono`, `px-3`; left: `Ln {line}, Col {col}` in `--text-muted`; center-right: `{language}` in `--text-secondary`; right: `⨯ {errors}` in `--error` when errors > 0, `⚠ {warnings}` in `--warning` when warnings > 0; `background: var(--bg-surface)`, `border-top: 1px solid var(--border-subtle)`; export as `React.memo(EditorStatusBar)`
- [x] T011 [US2] Add `cursorPos` state (`{ line: 1, col: 1 }`) and `diagnostics` state (`{ errors: 0, warnings: 0 }`) to `src/components/hub/playground/MonacoPlaygroundEditor.tsx`; inside `handleMount`, add two disposables: `editor.onDidChangeCursorPosition` → `setCursorPos({ line: e.position.lineNumber, col: e.position.column })` and `monacoInstance.editor.onDidChangeMarkers` → read `getModelMarkers({ resource: model.uri })` + count by `MarkerSeverity.Error` / `MarkerSeverity.Warning`
- [x] T012 [US2] Add `language` derivation via `useMemo(() => getLanguageLabel(filename), [filename])` in `src/components/hub/playground/MonacoPlaygroundEditor.tsx`; wire `EditorStatusBar` as last child in root `<div>`, passing `line={cursorPos.line}`, `col={cursorPos.col}`, `language`, `errors={diagnostics.errors}`, `warnings={diagnostics.warnings}`

**Checkpoint**: `pnpm dev` → move cursor → `Ln N, Col N` updates → introduce TS error → `⨯ 1` appears → fix → clears.

---

## Phase 5: User Story 3 — Breadcrumbs (Priority: P3)

**Goal**: Thin bar between tab bar and editor showing the active file's path split into `challenge › src › App.tsx` segments.

**Independent Test**: Open `./src/components/Button.tsx` → breadcrumb shows `challenge › src › components › Button.tsx` with last segment brighter → switch to `./App.tsx` → breadcrumb updates to `challenge › App.tsx`. No tabs or status bar required.

- [x] T013 [P] [US3] Create `src/components/hub/playground/EditorBreadcrumbs.tsx` — define module-scope pure function `toBreadcrumbs(filename: string): BreadcrumbSegment[]` (strips `./`, splits on `/`, prepends `"challenge"`, marks last as `isLast: true`); define `BreadcrumbSegment` and `EditorBreadcrumbsProps` interfaces
- [x] T014 [US3] Implement `EditorBreadcrumbs` component body in `src/components/hub/playground/EditorBreadcrumbs.tsx`: `useMemo(() => toBreadcrumbs(filename), [filename])` for segments; render segments separated by `›` (gray); non-last segments in `--text-muted`, last in `--text-secondary`; `height: 24px`, `font-size: 11px`, `font-mono`, `px-3`; `background: var(--bg-elevated)`, `border-bottom: 1px solid var(--border-subtle)`; no click handlers; export as `React.memo(EditorBreadcrumbs)`
- [x] T015 [US3] Wire `EditorBreadcrumbs` between `EditorTabBar` and the Monaco `<Editor>` wrapper `<div>` in `src/components/hub/playground/MonacoPlaygroundEditor.tsx`, passing `filename` prop directly

**Checkpoint**: `pnpm dev` → breadcrumb updates on tab switch → segments visible → last segment is brighter.

---

## Phase 6: Polish & Verification

**Purpose**: Build-time type check + manual end-to-end verification.

- [x] T016 Run `pnpm build` in repo root — zero TypeScript errors, zero lint errors; fix any issues found
- [x] T017 Manual E2E verification in `pnpm dev` against all acceptance scenarios from spec.md: (1) all files appear as tabs on load, (2) tab switching works, (3) overflow tabs scroll horizontally, (4) single-file challenge = no close button, (5) `Ln/Col` updates on cursor move, (6) `⨯ N` appears on TS errors and clears on fix, (7) language mode shows correctly per file extension, (8) breadcrumbs update on tab switch, (9) nested path shows full chain, (10) no layout overflow at 1280px viewport

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (T001): No deps — start immediately
- **Phase 2** (T002–T005): Requires T001 — blocks **US1 only**
- **Phase 3 / US1** (T006–T008): Requires T001–T005
- **Phase 4 / US2** (T009–T012): Requires T001 only — can start in parallel with Phase 2
- **Phase 5 / US3** (T013–T015): Requires T001 only — can start in parallel with Phases 2 and 4
- **Phase 6** (T016–T017): Requires all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (openTabs + prop threading)
- **US2 (P2)**: Depends on T001 only — internal to `MonacoPlaygroundEditor`, no new props from PlaygroundPage
- **US3 (P3)**: Depends on T001 only — `filename` prop already flows through

### Within Each Phase (sequential order)

- T002 → T003 → T004 → T005 (each step depends on previous within Phase 2)
- T006 → T007 → T008 (utils before component before wiring)
- T009 → T010 → T011 → T012 (utils before component before state before wiring)
- T013 → T014 → T015 (utils before component before wiring)

### Parallel Opportunities

After T001, three tracks can proceed concurrently:
- **Track A**: T002 → T003 → T004 → T005 → T006 → T007 → T008 (US1 full chain)
- **Track B**: T009 → T010 → T011 → T012 (US2 full chain, self-contained in MonacoPlaygroundEditor)
- **Track C**: T013 → T014 → T015 (US3 full chain, self-contained in MonacoPlaygroundEditor)

T006, T009, T013 — all create different new files, can run in parallel (marked [P]).  
T007, T010, T014 — all implement different new files, can run in parallel (marked [P]).

---

## Parallel Example: After T001 (3 parallel tracks)

```text
Track A (US1):  T002 → T003 → T004 → T005 → T006 → T007 → T008
Track B (US2):  T009 → T010 → T011 → T012
Track C (US3):  T013 → T014 → T015

All converge → T016 (build) → T017 (E2E)
```

---

## Implementation Strategy

### MVP (US1 only — file tabs)

1. T001 — remove old chrome
2. T002 → T003 → T004 → T005 — foundational
3. T006 → T007 → T008 — tab bar
4. T016 — build check
5. **Validate**: Tab switching works. Stop here if tabs are sufficient.

### Full Delivery

Complete all 3 tracks after Phase 2, then T016 + T017.

---

## Notes

- All new components must export as `React.memo(ComponentName)` — see quickstart.md for rationale
- All new handlers in PlaygroundPage must use `useCallback` — see contracts/ui-contracts.md
- Module-scope pure functions (utils) must NOT be defined inside components
- `onTabSelect` = pass `setActiveFile` directly (React state setters are already stable refs)
- Existing `disposablesRef` pattern in `MonacoPlaygroundEditor.handleMount` handles cleanup — reuse it for new Monaco events (T011)
- `filename` prop in `MonacoPlaygroundEditor` is the path WITHOUT `./` prefix (see current code line 174); restore `./` prefix when passing to `EditorTabBar` as `activeFile`
