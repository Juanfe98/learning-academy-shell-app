# Tasks: Coding Challenge Playground

**Input**: Design documents from `specs/001-coding-challenge-playground/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-contracts.md ✓, quickstart.md ✓

**Tests**: Unit tests included for pure logic only (transpile.ts, challenge.store.ts). No UI tests — verify feature by running the dev server.

**Organization**: Tasks grouped by user story. Each story independently testable as a deployable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: User story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: Install dependencies and create directory scaffolding

- [x] T001 Install sucrase, @uiw/react-codemirror, @codemirror/lang-javascript via `pnpm add sucrase @uiw/react-codemirror @codemirror/lang-javascript`
- [x] T002 Create directory skeleton: `src/lib/challenges/`, `src/components/hub/playground/`, `src/modules/challenges/react-counter/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, transpiler, store, and challenge data that every user story depends on

**⚠️ CRITICAL**: All Phase 3+ work blocks on this phase

- [x] T003 Create Challenge, ChallengeFile, ConsoleEntry, ConsoleMessage, ErrorMessage types in `src/lib/challenges/types.ts`
- [x] T004 [P] Create `src/lib/challenges/transpile.ts` — Sucrase JSX transformer wrapper that returns `{ code, error? }` (see quickstart.md for implementation pattern)
- [x] T005 [P] Create `src/lib/store/challenge.store.ts` — Zustand persist store (`se-hub-challenges`) with `sessions` shape, `setFileContent`, `getFileContent`, `resetChallenge` actions, and `skipHydration: true` (mirrors `useProgressStore` pattern)
- [x] T006 Create first reference challenge in `src/modules/challenges/react-counter/index.ts` — exports a `Challenge` object with slug `react-counter`, a description, and 2 files: `App.jsx` (counter component) and `styles.css`
- [x] T007 Create `src/lib/challenges/registry.ts` — exports `CHALLENGE_REGISTRY: Challenge[]` array, importing from `react-counter/index.ts`

**Checkpoint**: `pnpm build` passes. Transpile wrapper unit-testable. Store shape correct.

---

## Phase 3: User Story 1 — Solve a Coding Challenge (Priority: P1) 🎯 MVP

**Goal**: Learner opens a challenge, sees all 5 panels populated, edits code, preview auto-refreshes, console shows logs and errors.

**Independent Test**: Navigate to `/playground/react-counter`. Confirm layout shows all 5 panels. Edit `App.jsx` to add `console.log("hello")` — verify it appears in the console. Introduce a syntax error — verify error appears in console. Remove the error — verify preview renders again.

### Implementation

- [x] T008 [P] [US1] Create `src/components/hub/playground/PlaygroundShell.tsx` — 5-panel desktop layout per `contracts/ui-contracts.md`; accepts `PlaygroundShellProps`; panels: FileExplorer (left ~200px), ChallengeDescription (left scrollable below explorer), CodeEditor (center flex-grow), PreviewFrame (right flex-grow), ConsolePanel (right ~200px fixed bottom)
- [x] T009 [P] [US1] Create `src/components/hub/playground/ChallengeDescription.tsx` — read-only panel; renders `description` as formatted markdown prose; shows `title`, `difficulty` badge, `tags`; accepts `ChallengeDescriptionProps`
- [x] T010 [P] [US1] Create `src/components/hub/playground/FileExplorer.tsx` — renders flat file list from `ChallengeFile[]`; highlights `activeFile`; fires `onFileSelect` on click; accepts `FileExplorerProps` (display-only for US1 — wiring comes in US2)
- [x] T011 [P] [US1] Create `src/components/hub/playground/ConsolePanel.tsx` — renders `ConsoleEntry[]` in order; `log`=default, `warn`=yellow, `error`=red styling; `onClear` button empties list; accepts `ConsolePanelProps`
- [x] T012 [US1] Create `src/components/hub/playground/CodeEditor.tsx` — `"use client"` component; controlled via `value`/`onChange`; uses `@uiw/react-codemirror` with `javascript({ jsx: true })`; define `extensions` array outside component with `useMemo`; accepts `CodeEditorProps`
- [x] T013 [US1] Create `src/components/hub/playground/PreviewFrame.tsx` — `"use client"` component; manages sandboxed `<iframe sandbox="allow-scripts">`; on `code` prop change regenerates `srcdoc` via `generateIframeHtml(code)` (see quickstart.md for iframe HTML template including console interceptor and React/ReactDOM from esm.sh CDN); strips bare `import React`/`import ReactDOM` lines from transpiled code before injection; listens for `message` events and routes to `onConsoleMessage`/`onError`; accepts `PreviewFrameProps`
- [x] T014 [US1] Create `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — `"use client"` orchestrator; owns `activeFile` (useState), `consoleEntries` (useState), per-file edit map (useState); calls `transpileJSX` on active file content debounced 500ms (`useDebounce` hook or inline); renders `PlaygroundShell` with all required props; clears console on each new transpile attempt; mounts with `useEffect` + `mounted` guard before reading store
- [x] T015 [US1] Create `src/app/(hub)/playground/[slug]/page.tsx` — Server Component; `await params`; looks up challenge by slug in `CHALLENGE_REGISTRY`; calls `notFound()` if absent; passes `challenge` to `<PlaygroundPage>`; load `CodeEditor` via `dynamic(..., { ssr: false })`
- [x] T016 [US1] Create `src/app/(hub)/playground/page.tsx` — challenge list page inside `(hub)/`; imports `CHALLENGE_REGISTRY`; renders challenge cards linking to `/playground/[slug]` using existing `Card` and `Badge` UI primitives; matches hub design system
- [x] T017 [US1] Add "Playground" navigation link to `src/components/hub/DesktopSidebar.tsx` and `src/components/hub/MobileDrawer.tsx` pointing to `/playground`

**Checkpoint**: `pnpm build` passes. Dev server: `/playground` lists challenges; `/playground/react-counter` shows all 5 panels; editing code refreshes preview; `console.log` lines appear in console panel; syntax errors show in console.

---

## Phase 4: User Story 2 — Navigate Challenge Files (Priority: P2)

**Goal**: Learner switches between challenge files via the file explorer; edits to each file are preserved while switching.

**Independent Test**: Open a challenge with 2+ files. Click `styles.css` in explorer — editor switches to that file's content. Click back to `App.jsx` — edits are intact. Active file is visually highlighted in explorer.

### Implementation

- [x] T018 [US2] Update `src/components/hub/playground/PlaygroundShell.tsx` to wire `onFileSelect` callback down to `FileExplorer` (previously no-op in US1)
- [x] T019 [US2] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` to maintain `fileEdits: Record<filename, string>` map in state; `onFileSelect` switches `activeFile` and loads correct content from map (falls back to original); `onCodeChange` updates map entry for `activeFile`; transpiler always reads from `fileEdits[activeFile]`
- [x] T020 [US2] Update `src/modules/challenges/react-counter/index.ts` challenge definition to include at least 2 files (`App.jsx` and `styles.css`) so file switching can be verified

**Checkpoint**: `pnpm build` passes. Dev server: switching files in explorer shows correct content per file; edits to one file are not lost when switching to another.

---

## Phase 5: User Story 3 — Resume a Challenge (Priority: P3)

**Goal**: User's edited code survives page close/reopen. Reset action restores original starting code.

**Independent Test**: Edit `App.jsx`, close the browser tab, reopen `/playground/react-counter` — edits are restored. Click reset — original starting code is restored across all files.

### Implementation

- [x] T021 [US3] Update `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` to read initial file content from `useChallengeStore.getFileContent(slug, filename, original)` on mount (after `mounted` guard); call `useChallengeStore.setFileContent(slug, filename, content)` on every `onCodeChange`
- [x] T022 [US3] Add reset button to `src/components/hub/playground/PlaygroundShell.tsx` (top bar area); on click calls `onReset` prop which calls `useChallengeStore.resetChallenge(slug, challenge.files)` and resets local `fileEdits` state back to originals; also clears `consoleEntries`
- [x] T023 [US3] Add `StoreHydrator`-equivalent hydration call for `useChallengeStore` in `PlaygroundPage.tsx` using `useEffect` → `useChallengeStore.persist.rehydrate()` (mirrors existing `StoreHydrator` pattern in hub layout)

**Checkpoint**: `pnpm build` passes. Dev server: code edits survive page reload; reset restores all files to originals and clears console.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tests for pure logic, edge case handling, and build validation

- [x] T024 [P] Write unit tests for `src/lib/challenges/transpile.ts` in `src/lib/challenges/transpile.test.ts` — test: valid JSX compiles, syntax error returns `error` field, empty string returns empty code
- [x] T025 [P] Write unit tests for `src/lib/store/challenge.store.ts` in `src/lib/store/challenge.store.test.ts` — test: `getFileContent` returns original when no session, `setFileContent` persists, `resetChallenge` restores originals
- [x] T026 Handle iframe edge cases in `src/components/hub/playground/PreviewFrame.tsx`: (a) cap `ConsoleEntry[]` at 200 entries (drop oldest) to prevent runaway log flooding; (b) document in code that v1 has no infinite-loop protection — the iframe naturally reloads on the next edit cycle, which terminates any hanging code; (c) add unit test for `generateIframeHtml` import-stripping logic (strips bare `import React` / `import ReactDOM` lines before injection) — this belongs here, not in `transpile.test.ts`
- [x] T027 Add a `useDebounce` hook to `src/lib/utils/index.ts` (or inline in PlaygroundPage) if one doesn't already exist; verify 500ms debounce prevents thrashing on fast typing
- [x] T028 Run `pnpm build` — fix all TypeScript errors before marking feature complete
- [x] T029 Run `pnpm test` — confirm existing tests still pass alongside new unit tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — all 10 tasks can start after T007
- **US2 (Phase 4)**: Depends on US1 completion (updates existing files)
- **US3 (Phase 5)**: Depends on US2 completion (extends PlaygroundPage state)
- **Polish (Phase 6)**: Depends on all user stories; T024/T025 can start after Foundational

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational
- **US2 (P2)**: Builds on US1's PlaygroundShell + PlaygroundPage — implement after US1
- **US3 (P3)**: Builds on US2's per-file edit state — implement after US2

### Within Phase 3 (US1)

- T008–T011 are pure UI components — fully parallel
- T012 (CodeEditor) depends only on T001 (dep install)
- T013 (PreviewFrame) depends only on T003 (types)
- T014 (PlaygroundPage) depends on T012, T013
- T015 (route page) depends on T014
- T016 (list page) depends on T007
- T017 (nav wiring) depends on T015

---

## Parallel Example: Phase 3 (US1)

```
# Can launch together immediately after Foundational:
T008 PlaygroundShell.tsx      (layout only, no logic)
T009 ChallengeDescription.tsx (read-only display)
T010 FileExplorer.tsx         (display-only)
T011 ConsolePanel.tsx         (display-only)

# Then in parallel:
T012 CodeEditor.tsx           (needs dep from T001)
T013 PreviewFrame.tsx         (needs types from T003)

# Sequential after T012 + T013:
T014 PlaygroundPage.tsx       (orchestrates T012 + T013)
T015 route page               (wraps T014)

# Parallel with T015:
T016 list page                (independent)
T017 sidebar wiring           (after T015)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T007)
3. Phase 3: US1 (T008–T017)
4. **STOP and VALIDATE**: Dev server confirms all 5 panels work, preview runs, console captures output
5. Ship MVP — learner can open and solve a single-file challenge

### Incremental Delivery

1. Setup + Foundational → working transpiler and store
2. US1 complete → learner can solve challenges (MVP)
3. US2 complete → learner can work with multi-file challenges
4. US3 complete → learner can resume challenges across sessions
5. Polish → tests green, build clean

---

## Notes

- [P] = different files, no dependency on incomplete tasks in same phase
- All Next.js pages inside `(hub)/` or they won't get the hub shell layout
- `await params` required in every dynamic route page (Next.js 16 breaking change)
- `CodeEditor` must always be loaded with `dynamic(..., { ssr: false })`
- `mounted` guard required in `PlaygroundPage` before reading Zustand store
- Console interceptor must run before user code in iframe `<head>`
- Verify `pnpm build` passes after T028 before closing feature
