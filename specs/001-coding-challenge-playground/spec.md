# Feature Specification: Coding Challenge Playground

**Feature Branch**: `001-coding-challenge-playground`  
**Created**: 2026-05-10  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solve a Coding Challenge (Priority: P1)

A learner opens a coding challenge, reads the problem description, writes their solution in the code editor, and verifies it works by watching the live preview and checking console output.

**Why this priority**: Core value of the feature — without this, the page has no purpose. Everything else supports this journey.

**Independent Test**: Can be fully tested by loading a single pre-defined challenge, writing code in the editor, and confirming the preview reflects the output.

**Acceptance Scenarios**:

1. **Given** the user navigates to a challenge page, **When** the page loads, **Then** the challenge description, file explorer, code editor, console, and preview are all visible and populated with the challenge's starting content.
2. **Given** the user has the editor open, **When** they modify code, **Then** the preview updates to reflect the current code without requiring a manual refresh.
3. **Given** the user adds a console statement in their code, **When** the preview runs, **Then** the output appears in the console panel.
4. **Given** the user introduces a syntax or runtime error, **When** the preview attempts to run, **Then** the error is displayed in the console panel with a readable message.

---

### User Story 2 - Navigate Challenge Files (Priority: P2)

A learner uses the file explorer to browse the files that make up the challenge, switching between files to understand the project structure before editing.

**Why this priority**: Multi-file challenges require file navigation to be usable. Without it, learners cannot understand the challenge structure.

**Independent Test**: Load a challenge with multiple files. Confirm the file explorer lists all files and clicking each one loads its content in the editor.

**Acceptance Scenarios**:

1. **Given** the challenge has multiple files, **When** the page loads, **Then** the file explorer lists all challenge files in a tree structure.
2. **Given** the file explorer is visible, **When** the user clicks a file, **Then** the code editor switches to display that file's content.
3. **Given** the user has edited a file, **When** they switch to another file and return, **Then** their edits to the first file are preserved in the current session.

---

### User Story 3 - Resume a Challenge (Priority: P3)

A learner who previously worked on a challenge returns to the page and finds their last code state restored, so they can continue without starting over.

**Why this priority**: Valuable for continuity but not blocking — the core solve experience works without it.

**Independent Test**: Edit code in a challenge, close the page, reopen it, and confirm the edited code is restored.

**Acceptance Scenarios**:

1. **Given** the user has edited code in a challenge and closed the page, **When** they return to the same challenge, **Then** their last code state is restored automatically.
2. **Given** the user wants a clean slate, **When** they trigger a reset action, **Then** the editor returns to the challenge's original starting code.

---

### Edge Cases

- What happens when a challenge file is empty (blank starting template)?
- How does the preview handle code that runs an infinite loop or causes the page to hang?
- What happens if the user clears all code from the editor and tries to run?
- How does the console handle a very large number of log messages?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a split-panel layout containing: file explorer, challenge description, code editor, console, and live preview — all visible simultaneously on a single page.
- **FR-002**: System MUST populate the challenge page with a pre-defined challenge's files, description, and starting code on load.
- **FR-003**: System MUST execute the user's current code and display the result in the preview panel whenever the code changes.
- **FR-004**: System MUST capture and display console output (logs, warnings, errors) produced by the running code in the console panel.
- **FR-005**: System MUST display runtime and syntax errors in the console panel with human-readable messages.
- **FR-006**: System MUST allow the user to browse and switch between challenge files using the file explorer.
- **FR-007**: System MUST preserve per-file edits within the same session when the user switches between files.
- **FR-008**: System MUST persist the user's code edits across page visits so they can resume where they left off.
- **FR-009**: System MUST provide a reset action that restores all files to the challenge's original starting state.
- **FR-010**: System MUST support challenges that use React with JavaScript as the authoring environment. Plain HTML/CSS/JS support is explicitly out of scope for this version; however, the challenge format and page architecture must not prevent adding a second environment type in a future iteration.

### Key Entities

- **Challenge**: A named coding problem with a description, an ordered list of files (each with a name and starting content), and metadata (title, difficulty, tags).
- **ChallengeFile**: A single file within a challenge — has a filename, language, and content. One file is designated as the entry point.
- **ChallengeSession**: The user's in-progress state for a challenge — stores per-file edits keyed by challenge ID and filename.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can open a challenge, read the description, write code, and see a live preview in under 30 seconds from page load.
- **SC-002**: Code changes are reflected in the preview within 2 seconds of the user stopping typing.
- **SC-003**: Console output appears within 1 second of the preview executing.
- **SC-004**: The file explorer correctly lists all files in a challenge with no missing entries.
- **SC-005**: Code edits are restored correctly on return visit for 100% of challenges that have been previously edited.
- **SC-006**: The reset action restores original starting code within 1 second.

## Assumptions

- This is a personal learning tool; no multi-user or collaborative editing is required.
- Challenges are pre-defined, curated content stored in the application — there is no challenge authoring or admin UI in this scope.
- The initial set of challenges will be small (fewer than 20); performance at scale is not a concern for v1.
- The live preview runs entirely in the browser — no server-side code execution is required.
- The layout is optimized for desktop use; mobile layout is out of scope for v1.
- The existing progress tracking system will be extended to handle challenge session state — no new persistence infrastructure is needed.
- Only React with JavaScript is supported as the challenge environment for this feature version.
