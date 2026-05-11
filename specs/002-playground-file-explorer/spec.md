# Feature Specification: Playground File Explorer

**Feature Branch**: `002-playground-file-explorer`
**Created**: 2026-05-10
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New File (Priority: P1)

A learner working on a challenge wants to split their code across multiple files — they create a new React component file and immediately start editing it in the code editor.

**Why this priority**: Core capability — without file creation the explorer is read-only and the feature has no value.

**Independent Test**: On the challenge page, use the explorer to create a new file `Button.jsx`. Confirm the file appears in the tree, is selected, and opens in the editor with an empty stub.

**Acceptance Scenarios**:

1. **Given** the file explorer is visible, **When** the user triggers "New File" (icon or right-click menu), **Then** an inline input appears in the explorer for the user to type the filename.
2. **Given** the user types a valid filename and confirms, **When** the file is created, **Then** it appears in the explorer tree at the correct location and opens in the editor.
3. **Given** the user types a filename that already exists in the same directory, **When** they confirm, **Then** an error is shown and no file is overwritten.
4. **Given** the user presses Escape during naming, **When** the action is cancelled, **Then** no file is created and the explorer returns to its previous state.

---

### User Story 2 - Create a Folder (Priority: P2)

A learner wants to organize components in a subfolder (e.g., `components/`) and creates a folder to group related files.

**Why this priority**: Folders enable project structure but are not required to write code — US1 delivers value without them.

**Independent Test**: Create a folder named `components`. Confirm it appears in the tree with a folder icon and can be expanded/collapsed.

**Acceptance Scenarios**:

1. **Given** the file explorer is visible, **When** the user triggers "New Folder", **Then** an inline input appears to name the folder.
2. **Given** the user types a valid folder name and confirms, **When** the folder is created, **Then** it appears in the tree collapsed, with a folder icon.
3. **Given** a folder exists, **When** the user clicks it, **Then** it toggles expanded/collapsed showing or hiding its contents.
4. **Given** a folder is expanded and selected, **When** the user creates a new file, **Then** the file is created inside that folder.

---

### User Story 3 - Import Across Files (Priority: P2)

A learner creates a `Button.jsx` component and imports it into `App.jsx` — the preview updates to render the composed result.

**Why this priority**: Cross-file imports are the primary reason to create additional files; without working imports the multi-file capability is incomplete.

**Independent Test**: Create `Button.jsx` with a simple component. In `App.jsx`, write `import Button from './Button'`. Confirm the preview renders `App` using `Button`.

**Acceptance Scenarios**:

1. **Given** a second file exists in the project, **When** the user writes a relative import in another file, **Then** the preview resolves the import and renders the composed result.
2. **Given** a user imports a non-existent file, **When** the preview runs, **Then** an error appears in the console explaining the missing module.
3. **Given** a circular import exists between two files, **When** the preview runs, **Then** a readable error appears in the console rather than hanging.

---

### User Story 4 - Delete a File or Folder (Priority: P3)

A learner removes a file they no longer need to keep the project tidy.

**Why this priority**: Useful for cleanup but not blocking — a learner can work around it.

**Independent Test**: Right-click a user-created file and choose Delete. Confirm the file disappears from the tree and the editor switches to another file.

**Acceptance Scenarios**:

1. **Given** the user right-clicks a file, **When** they select "Delete", **Then** a confirmation prompt appears before removal.
2. **Given** the user confirms deletion, **When** the file is removed, **Then** it disappears from the explorer and its saved content is cleared.
3. **Given** the deleted file was active in the editor, **When** deletion completes, **Then** the editor switches to another file (or shows an empty state if none remain).
4. **Given** the user deletes a non-empty folder, **When** they confirm, **Then** the folder and all its contents are removed.
5. **Given** the user attempts to delete a challenge seed file, **When** they try, **Then** the action is blocked with a message explaining it is protected.

---

### Edge Cases

- What happens when a filename contains spaces or special characters?
- What happens when the active file's parent folder is deleted?
- What if the user creates the maximum number of files — can they still navigate?
- What if a file is imported using an incorrect extension (e.g., `./Button.jsx` vs `./Button`)?
- What if the user imports a CSS file from JSX?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the user to create a new file at the root level or inside any existing folder using a toolbar icon or right-click context menu in the explorer.
- **FR-002**: System MUST allow the user to create a new folder at the root level or inside any existing folder.
- **FR-003**: System MUST validate file and folder names — they must be non-empty, unique within their parent directory, and contain only safe characters (alphanumeric, hyphens, underscores, dots, forward slash not permitted in a single name segment).
- **FR-004**: System MUST display the project file tree with folder icons, file icons differentiated by type, and expand/collapse toggling for folders.
- **FR-005**: System MUST allow the user to delete any user-created file or folder (including all nested contents).
- **FR-006**: System MUST block deletion of the challenge's original seed files and display a clear reason when the user attempts it.
- **FR-007**: System MUST resolve relative imports between project files in the live preview — a file can import from any other file using a relative path (e.g., `./Button`, `../utils/helpers`).
- **FR-008**: System MUST display a readable error in the console when an import target cannot be found.
- **FR-009**: System MUST open a newly created file immediately in the code editor and highlight it as selected in the explorer.
- **FR-010**: System MUST persist the complete file tree (user-created files, folders, and their contents) across page visits.
- **FR-011**: System MUST use inline renaming input for new file and folder names directly within the explorer tree — no separate modal or dialog.
- **FR-012**: The playground reset action MUST restore the project to seed files only, removing all user-created files and folders.

### Key Entities

- **ProjectFile**: A file in the user's project — has a relative path, language (jsx/js/css), content, and a `seed` flag indicating it is an original challenge file.
- **ProjectFolder**: A named folder — has a relative path and a list of child entries (files or folders). Folders can be nested up to 3 levels deep.
- **FileTree**: The full project structure — a hierarchical collection of folders and files rooted at the project root.
- **FileTreeSession**: The user's persisted challenge state — stores the entire `FileTree` including all user-created files and folders, replacing the flat per-file map from Feature 001.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can create a file, write a component, import it in another file, and see the result in the preview in under 60 seconds.
- **SC-002**: The file tree responds to expand/collapse within 100ms of user interaction.
- **SC-003**: The preview re-executes with cross-file imports resolved within 2 seconds of the user stopping typing.
- **SC-004**: Filename validation feedback appears within one keystroke — no perceptible delay.
- **SC-005**: The complete file tree and all file contents are restored on return visit for 100% of sessions.
- **SC-006**: Seed files cannot be deleted under any interaction path — 0 accidental seed file deletions.

## Assumptions

- This feature extends Feature 001 (Coding Challenge Playground). The base playground must be working before this is implemented.
- The file system lives entirely in the browser — no server-side storage is used.
- Folder nesting is limited to 3 levels for v1 (root → folder → file, or root → folder → subfolder → file).
- Renaming existing files or folders is out of scope for v1.
- Maximum 20 user-created files per challenge session (excluding seed files).
- Only relative imports between project files are supported; third-party package imports (other than React) are not resolved.
- File drag-and-drop reordering or moving between folders is out of scope for v1.
- This is a personal tool — no multi-user or collaborative file editing.
