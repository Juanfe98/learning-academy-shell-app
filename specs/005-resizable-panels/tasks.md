# Tasks: Resizable Playground Panels

**Input**: Design documents from `specs/005-resizable-panels/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-contracts.md ✓, quickstart.md ✓

**Note**: This feature is a single-component refactor (`PlaygroundShell.tsx`). All implementation tasks touch the same file, so tasks within a phase are sequential. User stories are layered additively — each phase is independently testable and deployable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files or no shared state)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Install the resizable panels library before any implementation begins.

- [x] T001 Install `react-resizable-panels@4.11.0` by running `pnpm add react-resizable-panels` in the project root and verifying it appears in `package.json` dependencies

---

## Phase 2: Foundational — Base Structure

**Purpose**: Establish the building blocks that all three user stories depend on. Must complete before any user story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `PANEL_DEFAULTS` and `RIGHT_PANEL_DEFAULTS` percentage-size constants at the top of `src/components/hub/playground/PlaygroundShell.tsx` — values from `specs/005-resizable-panels/data-model.md`
- [x] T003 Define `ColHandle` internal component in `src/components/hub/playground/PlaygroundShell.tsx` — 4px-wide `PanelResizeHandle` with 1px centered visible line, `col-resize` cursor, `--border-subtle` idle color, `rgba(99,102,241,0.4)` on hover, `rgba(99,102,241,0.5)` on active drag (see `specs/005-resizable-panels/quickstart.md` for the copy-paste implementation)
- [x] T004 Define `RowHandle` internal component in `src/components/hub/playground/PlaygroundShell.tsx` — same visual as `ColHandle` but 4px-tall with `row-resize` cursor
- [x] T005 Replace `<div className="flex flex-1 min-h-0">` (the 3-column body wrapper) in `src/components/hub/playground/PlaygroundShell.tsx` with a horizontal `PanelGroup` — wrap each of the three columns in a `Panel` with its default/min sizes from `PANEL_DEFAULTS`; do NOT add any handles yet; verify `pnpm build` passes and the playground still renders at default widths

**Checkpoint**: App builds and renders correctly with `PanelGroup` wrapping; columns are at default sizes with no drag handles visible yet.

---

## Phase 3: User Story 1 — Editor ↔ Right Column Resize (Priority: P1) 🎯 MVP

**Goal**: Users can drag the divider between the code editor and the right panel (preview/console) to give more space to the preview.

**Independent Test**: Open any React challenge, drag the divider between the editor and the right column — the preview grows as the editor shrinks. Monaco editor content remains editable. Preview still renders. No visual glitches.

- [x] T006 [US1] Insert `<ColHandle />` between the editor `Panel` and the right-column `Panel` in the horizontal `PanelGroup` in `src/components/hub/playground/PlaygroundShell.tsx`
- [x] T007 [US1] Run `pnpm build` and manually verify in the browser: drag the editor↔right divider on a React challenge, confirm Monaco editor reflows and the preview iframe still renders at all widths

**Checkpoint**: User Story 1 complete and independently functional. This is the MVP — can be shipped at this point.

---

## Phase 4: User Story 2 — File Explorer ↔ Editor Resize (Priority: P2)

**Goal**: Users can drag the divider between the file explorer column and the code editor to get more room for writing code.

**Independent Test**: Drag the left divider — the file explorer column shrinks or grows while the editor adjusts. File list remains scrollable and clickable. Challenge description remains readable.

- [x] T008 [US2] Insert `<ColHandle />` between the left-column `Panel` and the editor `Panel` in the horizontal `PanelGroup` in `src/components/hub/playground/PlaygroundShell.tsx`
- [x] T009 [US2] Manually verify: drag the left↔editor divider, confirm the file explorer scrolls correctly at narrow widths and the challenge description panel remains accessible

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 — Preview ↔ Console Vertical Resize (Priority: P3)

**Goal**: Users can drag a horizontal divider between the preview iframe and the console panel to give more space to the console when debugging.

**Independent Test**: On a React challenge, drag the horizontal divider between the preview and the console — preview height decreases, console height increases. On a `node-ts` challenge, no horizontal divider is shown inside the right column.

- [x] T010 [US3] Inside the right-column `Panel` in `src/components/hub/playground/PlaygroundShell.tsx`, replace the current conditional block with an environment branch: for react (`challenge.environment !== "node-ts"`) wrap the hidden-preview div and the console div in a vertical `PanelGroup` with `RIGHT_PANEL_DEFAULTS` sizes and a `<RowHandle />` between them; for node-ts keep a plain `flex flex-col flex-1 min-h-0` wrapper (no change to the existing node-ts layout)
- [x] T011 [US3] Preview iframe stays in DOM for node-ts (hidden via display:none) so bundled code still executes; react environments use vertical PanelGroup with visible preview Panel — branched on `isReact`
- [x] T012 [US3] Run `pnpm build` and manually verify: React challenge → vertical drag works; `node-ts` challenge → no vertical handle in right column; test panel still renders correctly below the console in both environments

**Checkpoint**: All three user stories complete and functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all scenarios.

- [ ] T013 Run the full manual verification checklist in `specs/005-resizable-panels/quickstart.md` against the dev server (`pnpm dev`) — check all 8 checklist items
- [x] T014 Run `pnpm build` for final TypeScript verification — zero errors required before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (package installed) — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 complete
- **US2 (Phase 4)**: Depends on Phase 2 complete (can start after Phase 2, independent of US1)
- **US3 (Phase 5)**: Depends on Phase 2 complete (can start after Phase 2, independent of US1/US2)
- **Polish (Phase 6)**: Depends on all desired user stories complete

### User Story Dependencies

Since all three stories modify the same file, a single developer works them sequentially (P1 → P2 → P3). Each story is independently testable at its checkpoint.

### Within Each User Story

- T006 before T007 (implement then verify)
- T008 before T009 (implement then verify)
- T010 → T011 → T012 (sequential — same section of the file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Install package
2. Complete Phase 2: Base `PanelGroup` structure + handles
3. Complete Phase 3: Add editor↔right divider
4. **STOP and VALIDATE**: Drag the editor/right divider — preview usable? Monaco working?
5. Ship if satisfied

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 (US1) → editor↔right resize ✓ → **ship MVP**
3. Phase 4 (US2) → left↔editor resize ✓ → **ship increment**
4. Phase 5 (US3) → preview↔console vertical resize ✓ → **ship final**
5. Phase 6 → polish and full checklist

---

## Notes

- All implementation is in `src/components/hub/playground/PlaygroundShell.tsx` only
- `react-resizable-panels` sets `data-resize-handle-active="pointer"` during drag — use this attribute for active-drag styling
- Monaco has `automaticLayout: true` — no manual resize trigger needed
- The iframe preview reflows naturally — no special handling needed
- `pnpm build` after each phase catches TypeScript errors early
