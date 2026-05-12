# Feature Specification: Resizable Playground Panels

**Feature Branch**: `005-resizable-panels`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "In the playground the layout that we currently have is splitted into the preview or console and tests panel which is perfect. As part of this spec the idea is to research and investigate the best way for implementing resizable panels so that users can modify the width. Key part is the editor panel with the preview in react challenges. As currently visualizing the UI in that small side panel is hard."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Resize Editor vs Preview (Priority: P1)

A user working on a React challenge finds the preview panel too small to see their rendered UI clearly. They drag a divider between the code editor and the preview panel to give more space to the preview, allowing them to interact with their component while still seeing their code on the left.

**Why this priority**: The preview panel is the primary pain point — React challenges have a visual output that needs enough room to be usable. This is the most direct quality-of-life improvement.

**Independent Test**: A user can drag the divider between the editor and the right panel (preview + console) horizontally and see the editor shrink while the preview grows, without any other panel resizing feature being implemented.

**Acceptance Scenarios**:

1. **Given** a React challenge is open with default panel widths, **When** the user drags the divider between the editor and the right column to the left, **Then** the preview gains width and the editor loses width proportionally.
2. **Given** a React challenge is open, **When** the user drags the editor-preview divider, **Then** the resize is smooth with no layout flicker or content overflow.
3. **Given** a user has resized the editor, **When** they open a different challenge, **Then** the layout returns to default widths (no persistent state required for P1).

---

### User Story 2 — Resize File Explorer vs Editor (Priority: P2)

A user with many files in their challenge wants to collapse or narrow the file explorer panel to give more room to the code editor. They drag the divider between the file explorer and the editor.

**Why this priority**: Secondary pain point — the file explorer is fixed-width and some users may want more editor space, but it is less critical than the preview resize.

**Independent Test**: A user can drag the divider between the left panel (file explorer + description) and the editor column, independently of the editor-preview divider.

**Acceptance Scenarios**:

1. **Given** a challenge is open, **When** the user drags the left divider, **Then** the file explorer column grows or shrinks while the editor adjusts accordingly.
2. **Given** the user narrows the left panel significantly, **When** the file explorer content overflows, **Then** overflow is clipped or scrollable — no broken layout.

---

### User Story 3 — Resize Console vs Preview Height (Priority: P3)

A user debugging a React challenge wants to see more console output. They drag a horizontal divider between the preview and the console panel to give the console more vertical space.

**Why this priority**: Useful for debugging sessions but the least urgent — the existing fixed heights work adequately for most scenarios.

**Independent Test**: A user can drag a horizontal divider between the preview iframe and the console/test panel to adjust their relative heights within the right column.

**Acceptance Scenarios**:

1. **Given** a React challenge is open, **When** the user drags the horizontal divider between the preview and console, **Then** the preview height decreases and the console height increases.
2. **Given** a `node-ts` challenge is open (no preview), **Then** no horizontal divider is shown in the right column (only console + tests panel, no resize needed there for P3).

---

### Edge Cases

- What happens when the user drags a panel below its minimum usable width? → A minimum width must be enforced so panels never collapse to zero or become unusable (editor, preview, and file explorer each need a minimum).
- What happens when the browser window is resized after the user has adjusted panels? → The layout should remain proportionally consistent; absolute pixel positions should not cause overflow.
- What happens on very small screens or narrow viewports? → Default widths should be used; resizing may be limited by minimum constraints.
- What happens when the user switches between challenge environments (react-js vs node-ts)? → The right-column layout changes (preview hidden for node-ts); resize state should not bleed across environment types.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to drag a vertical divider between the code editor column and the right panel column to adjust their relative widths.
- **FR-002**: Users MUST be able to drag a vertical divider between the file explorer column and the code editor column to adjust their relative widths.
- **FR-003**: Users MUST be able to drag a horizontal divider between the preview iframe and the console panel to adjust their relative heights within the right column.
- **FR-004**: Each resizable panel MUST enforce a minimum width/height so that no panel can be dragged to a size that makes its content completely unusable.
- **FR-005**: Resize interactions MUST be smooth and responsive — no lag or layout thrashing during drag.
- **FR-006**: The resize dividers MUST provide a clear visual affordance (e.g., a handle or highlighted zone) so users know they are draggable.
- **FR-007**: FR-003 (vertical console/preview resize) MUST only appear when both a preview and a console are visible (i.e., React environments). For `node-ts` challenges the right column has no preview, so no vertical resize divider is needed there.
- **FR-008**: Panel sizes MUST NOT be persisted between sessions (stateless for v1) — layout resets to defaults when navigating to a different challenge or reloading.

### Key Entities

- **Panel**: A distinct UI region (file explorer, editor, preview, console/tests) with a width or height that can be adjusted.
- **Divider**: The draggable boundary between two adjacent panels.
- **Minimum size**: A per-panel lower bound (in pixels or percentage) below which the panel cannot be resized.
- **Default size**: The initial panel size when a challenge loads.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can resize the editor and preview panels with a single drag interaction — no multi-step workflow required.
- **SC-002**: No panel can be resized below a minimum that leaves it unusable (content not visible or interactive).
- **SC-003**: Resize interactions complete with no visual stutter — the divider tracks the cursor in real time.
- **SC-004**: The playground remains fully functional (file editing, preview rendering, console output, test running) at any valid panel size combination.
- **SC-005**: The layout renders correctly at all standard desktop viewport widths (1280px and above).

---

## Assumptions

- Resizable panels are desktop-only — the playground is not designed for mobile/touch viewports.
- Panel size state is not persisted between sessions or challenges in v1; defaults reset on navigation.
- The file explorer and challenge description share the left column and are not individually resizable from each other (they resize as a unit).
- The console and test panels in the right column are not individually resizable from each other in v1 (they resize as a unit vertically against the preview).
- An off-the-shelf drag-based panel splitting library or a lightweight custom implementation using `pointermove` events are both valid implementation approaches; the plan phase will determine the best fit for this codebase.
- Minimum panel widths will be defined during planning based on content requirements (e.g., file explorer needs at least ~150px, editor ~300px, preview ~250px).
