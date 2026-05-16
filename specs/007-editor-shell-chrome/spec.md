# Feature Specification: Editor Shell — VS Code-Style Chrome

**Feature Branch**: `007-editor-shell-chrome`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "Add VS Code-style editor chrome (file tabs, status bar, breadcrumbs) to the Monaco playground editor"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Navigate Between Open Files via Tabs (Priority: P1)

A developer working on a multi-file challenge wants to switch between files quickly without using the file explorer sidebar. They expect the same tab-based navigation they use in their daily IDE.

**Why this priority**: The tab bar replaces the current filename label and is the most visible structural change. Without it, multi-file navigation feels broken. All other chrome builds on top of it.

**Independent Test**: Open a challenge with multiple files (`App.tsx`, `utils.ts`, `styles.css`). Verify all three appear as tabs. Click `utils.ts` tab — editor content switches. Active tab is visually distinct. P1 value delivered even without status bar or breadcrumbs.

**Acceptance Scenarios**:

1. **Given** a challenge with 3 files is open, **When** the editor loads, **Then** all 3 files appear as tabs in the tab bar above the editor.
2. **Given** `App.tsx` is the active file, **When** user clicks the `utils.ts` tab, **Then** the editor content switches to `utils.ts` and that tab becomes visually highlighted.
3. **Given** multiple tabs are open, **When** tabs overflow the tab bar width, **Then** the tab bar scrolls horizontally without breaking layout.
4. **Given** only 1 file exists in the challenge, **When** the editor loads, **Then** no close button (×) is shown on that tab.
5. **Given** 2+ files exist, **When** user clicks × on a non-active tab, **Then** that file is removed from the open tabs list (but NOT deleted from the file tree).

---

### User Story 2 — Know Cursor Position and Error State at a Glance (Priority: P2)

A developer typing code wants to know exactly where their cursor is (line/col) and whether there are any TypeScript errors — without interrupting their flow by mousing to the file explorer.

**Why this priority**: Status bar is the primary "health" signal. Seeing `⨯ 2` errors in red tells the developer something is wrong before they try to run the preview.

**Independent Test**: Open any challenge. Move cursor to line 10, col 5 — status bar shows `Ln 10, Col 5`. Introduce a TS error — status bar shows `⨯ 1`. Fix it — count returns to 0. Fully testable with no breadcrumbs present.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** cursor moves to any position, **Then** status bar updates to reflect `Ln [N], Col [N]` within the same render frame.
2. **Given** the active file has 2 TypeScript errors and 1 warning, **When** diagnostics run, **Then** status bar shows `⨯ 2  ⚠ 1` with errors in red and warnings in amber.
3. **Given** all errors are fixed, **When** diagnostics clear, **Then** the error/warning indicators disappear or show `⨯ 0`.
4. **Given** a `.css` file is active, **When** the user opens that tab, **Then** status bar shows `CSS` as the language mode.
5. **Given** a `.tsx` file is active, **Then** status bar shows `TypeScript`.

---

### User Story 3 — Understand File Location via Breadcrumbs (Priority: P3)

A developer in a challenge with nested file paths (e.g., `./src/components/Button.tsx`) wants to see at a glance where the active file sits in the project structure.

**Why this priority**: Lowest impact — challenges mostly have flat file structures. Still improves spatial orientation for nested challenges.

**Independent Test**: Open `./src/components/Button.tsx`. Breadcrumb shows `challenge › src › components › Button.tsx`. Last segment is highlighted. Fully testable independently.

**Acceptance Scenarios**:

1. **Given** active file is `./src/components/Button.tsx`, **When** editor displays, **Then** breadcrumb shows `challenge › src › components › Button.tsx`.
2. **Given** active file is `./App.tsx` (root level), **When** editor displays, **Then** breadcrumb shows `challenge › App.tsx`.
3. **Given** user looks at breadcrumbs, **Then** the final segment (filename) is visually brighter/more prominent than parent segments.
4. **Given** user clicks a breadcrumb segment, **Then** nothing happens (static display — no navigation in v1).

---

### Edge Cases

- What happens when a challenge has only 1 file? → Tab bar shows 1 tab, no close button, no scroll.
- What happens if Monaco diagnostics haven't loaded yet? → Status bar shows `⨯ 0` or blank error count until first marker scan.
- What happens when the tab bar overflows? → Horizontal scroll, no wrapping, no tab truncation unless the tab label itself is very long (cap at ~20 chars with ellipsis).
- What happens when a file is renamed in the file explorer? → Tab updates its label to match the new filename.
- What happens when a file is added via file explorer? → New tab appears in tab bar.
- What happens when a file is deleted via file explorer? → Its tab is removed; if it was active, adjacent tab becomes active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST display a horizontal tab bar above the code area showing one tab per file in `fileMap`.
- **FR-002**: The active tab MUST be visually distinct (accent color underline or background highlight).
- **FR-003**: Each tab MUST show a file-type icon (colored dot or small icon) based on extension (`.tsx`, `.ts`, `.js`, `.css`).
- **FR-004**: Clicking a non-active tab MUST switch the editor to that file without page reload.
- **FR-005**: When 2 or more files exist, each tab MUST show a close (×) button that removes it from the open tabs list.
- **FR-006**: When only 1 file exists, the close button MUST NOT be shown.
- **FR-007**: The tab bar MUST scroll horizontally when tabs overflow the available width.
- **FR-008**: The editor MUST display a status bar pinned to the bottom of the editor column.
- **FR-009**: The status bar MUST update the cursor position (`Ln N, Col N`) on every cursor move event.
- **FR-010**: The status bar MUST show the language mode derived from the active file's extension.
- **FR-011**: The status bar MUST show error (⨯) and warning (⚠) counts from Monaco diagnostics, updating as the user types.
- **FR-012**: Errors MUST be styled in red, warnings in amber, in the status bar.
- **FR-013**: The editor MUST display a breadcrumb bar between the tab bar and the code area.
- **FR-014**: Breadcrumbs MUST show the active file path split into segments separated by `›`.
- **FR-015**: The final breadcrumb segment (filename) MUST be visually brighter than parent segments.
- **FR-016**: Breadcrumb segments MUST be non-interactive in v1 (no click navigation).
- **FR-017**: All three chrome components MUST match the existing dark design system tokens.
- **FR-018**: No new npm packages MAY be introduced — lucide-react covers icon needs.

### Key Entities

- **Tab**: Represents one open file. Has a path (key from `fileMap`), a display label (filename), active state, and dirty state.
- **CursorPosition**: `{ lineNumber: number; column: number }` — sourced from Monaco `onDidChangeCursorPosition` event.
- **DiagnosticCounts**: `{ errors: number; warnings: number }` — sourced from `monaco.editor.getModelMarkers()` filtered by severity.
- **BreadcrumbSegment**: One path part of the active file path, with a flag for whether it is the last (filename) segment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Switching between files via tabs takes under 100ms (no perceivable lag — tab click to editor content update).
- **SC-002**: Cursor position in the status bar updates within the same frame as cursor movement — no visible delay.
- **SC-003**: Error/warning counts in the status bar reflect Monaco diagnostics within 500ms of a code change.
- **SC-004**: All three chrome components are visible simultaneously without any layout overflow or clipping on a 1280px-wide viewport.
- **SC-005**: The editor chrome adds no horizontal scrollbar to the overall playground layout.
- **SC-006**: A developer can identify the active file, cursor position, language, and error count without moving the mouse — all visible in a single glance at the editor column.

## Assumptions

- Challenges with deeply nested file structures (3+ levels) are uncommon; breadcrumbs will handle them but the primary use case is 1–2 levels deep.
- The `fileMap` prop is the source of truth for which files exist — tab bar mirrors it exactly.
- Closing a tab does not delete the file from `fileMap`; it only removes the tab from the "open tabs" UI list. The file remains accessible via the file explorer.
- Initial open tabs on challenge load = all files in `fileMap` (all files open by default, matching current behavior).
- Monaco's `getModelMarkers()` is polled or triggered via editor events — no separate lint process is needed.
- The dirty indicator (unsaved dot) is optional for v1; the spec includes it as a stretch goal but acceptance does not require it.
- `fileMap` keys are always relative paths starting with `./` (e.g., `./App.tsx`).
- The existing `onFileNavigate` callback in `PlaygroundShell` is sufficient for tab switching — no new prop required.
