# Feature Specification: Robust Code Editor Upgrade

**Feature Branch**: `004-monaco-editor-upgrade`
**Created**: 2026-05-11
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — TypeScript-Aware Editing (Priority: P1)

A learner works on a TypeScript challenge and the editor actively assists them — showing type information on hover, underlining type errors inline, and completing identifiers with their correct types — exactly like working in a real IDE.

**Why this priority**: This is the core gap between the current editor and a real IDE experience. TypeScript challenges without type awareness feel like plain text editing.

**Independent Test**: Open a TypeScript challenge. Hover over a typed variable — a tooltip showing its type appears. Introduce a type error — a red underline appears inline without running the code. Accept an autocomplete suggestion — it includes type-aware options (e.g., object properties, method signatures).

**Acceptance Scenarios**:

1. **Given** the learner is editing a `.tsx` or `.ts` file, **When** they hover over a typed identifier, **Then** a tooltip shows the type annotation.
2. **Given** the learner writes code that violates a type constraint, **When** they finish typing, **Then** the offending token is underlined in red with a readable error message — no manual run required.
3. **Given** the learner types a partially complete expression, **When** the autocomplete dropdown opens, **Then** it shows type-aware suggestions including object properties and method names.
4. **Given** the learner starts a JSX component name, **When** autocomplete triggers, **Then** available component names from the current scope appear as suggestions.

---

### User Story 2 — Go-to-Definition Navigation (Priority: P1)

A learner reads an identifier they don't recognise — an imported type, a helper function, a component — and navigates directly to its definition with a single keyboard shortcut or click, without manually searching through files.

**Why this priority**: Multi-file TypeScript challenges become significantly harder to navigate without this. It mirrors how developers actually work.

**Independent Test**: In a multi-file TypeScript challenge, place the cursor on an imported symbol and press the go-to-definition shortcut (or Cmd+click). The editor switches to the file containing the definition and places the cursor on it.

**Acceptance Scenarios**:

1. **Given** the learner's cursor is on an imported identifier, **When** they invoke go-to-definition, **Then** the editor opens the source file at the correct line.
2. **Given** the definition is in a different file within the challenge, **When** navigation occurs, **Then** the file explorer reflects the newly active file.
3. **Given** the definition is in the same file, **When** go-to-definition is invoked, **Then** the cursor jumps to the declaration site within the same file.
4. **Given** the symbol has no resolvable definition (e.g., a built-in), **When** go-to-definition is invoked, **Then** nothing unexpected happens — the editor stays stable.

---

### User Story 3 — Import Path Autocomplete (Priority: P2)

A learner types an import statement and the editor suggests relative file paths from the challenge's file structure — no manual path lookup needed.

**Why this priority**: Reduces friction in multi-file challenges. Without it, learners must remember exact filenames and relative paths.

**Independent Test**: In a challenge with `helpers.ts` and `types.ts`, type `import { } from "./`. The autocomplete dropdown shows `helpers` and `types` as valid path completions.

**Acceptance Scenarios**:

1. **Given** the learner types `from "./"` in an import statement, **When** autocomplete triggers, **Then** all challenge files in the same directory appear as completions.
2. **Given** the learner types a partial filename after `from "./`, **When** autocomplete triggers, **Then** the list is filtered to matching filenames.
3. **Given** the challenge has files in subdirectories, **When** the learner types `from "./"`, **Then** subdirectory names also appear as completions.

---

### User Story 4 — General IDE Comfort (Priority: P3)

A learner uses familiar IDE shortcuts and features — bracket matching, find-in-file, multi-cursor, minimap — making the playground feel like a professional editing environment.

**Why this priority**: Quality of life. Doesn't block learning, but significantly improves the feeling of the tool.

**Independent Test**: Use Cmd+D to select the next occurrence of a word (multi-cursor). Use Cmd+F to open find-in-file. Observe bracket pair highlighting when cursor is adjacent to `{` or `(`.

**Acceptance Scenarios**:

1. **Given** the learner places their cursor next to a bracket, **When** they look at the editor, **Then** the matching closing bracket is highlighted.
2. **Given** the learner invokes find-in-file, **When** they type a search term, **Then** matching occurrences are highlighted in the editor.
3. **Given** the learner selects a word and invokes multi-cursor selection, **When** they type, **Then** all occurrences update simultaneously.

---

### Edge Cases

- What happens when a TypeScript error is in a read-only file? Errors should still display but editing should be blocked.
- What happens when the challenge has only one file? Go-to-definition for built-ins should degrade gracefully (no crash, no navigation).
- What happens when the editor is showing a CSS file? TypeScript features should not activate for `.css` files.
- What happens when a challenge is in `react-js` (JavaScript only)? Type-checking should not activate; standard JS autocomplete only.
- What happens when the learner switches between files? Editor state (cursor position, scroll) should be preserved per file within the session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST display inline type error diagnostics for TypeScript and TSX files without requiring the learner to run the code.
- **FR-002**: The editor MUST show type information tooltips on hover for typed identifiers in TypeScript and TSX files.
- **FR-003**: The editor MUST provide type-aware autocompletion (object properties, method signatures, local identifiers) for TypeScript and TSX files.
- **FR-004**: The editor MUST support go-to-definition navigation for symbols defined within the challenge's file set.
- **FR-005**: The editor MUST suggest relative import paths from the challenge's file structure when the learner is writing an import statement.
- **FR-006**: The editor MUST preserve the existing VS Code Dark+ colour theme or an equivalent dark theme that matches the hub's design system.
- **FR-007**: The editor MUST support bracket pair highlighting, find-in-file, and multi-cursor editing.
- **FR-008**: TypeScript IDE features (FR-001 through FR-004) MUST be inactive for `.js`, `.jsx`, and `.css` files — those files use standard completions only.
- **FR-009**: Existing challenges (`react-js`, `react-ts`, `node-ts`) MUST continue to function with zero regression after the editor is replaced.
- **FR-010**: The editor MUST remain performant — no visible input lag when typing in a challenge with 5 or fewer files.

### Key Entities

- **Editor Instance**: One editor per active file. Switching files replaces the model but preserves editor state (scroll, cursor, theme) per file.
- **Challenge File Set**: The set of files in the current challenge, used as the source of truth for import path completions and go-to-definition resolution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner sees a type error underline appear within 1 second of introducing a type violation — no manual action required.
- **SC-002**: Go-to-definition navigation resolves correctly for 100% of symbols defined within the challenge's own files (cross-file and same-file).
- **SC-003**: Import path autocomplete suggests the correct relative path for every file in the challenge on first trigger.
- **SC-004**: No existing challenge (JavaScript or TypeScript) breaks or shows degraded behaviour after the editor replacement.
- **SC-005**: Input latency is imperceptible — the editor responds to keystrokes without noticeable lag on a standard developer laptop.
- **SC-006**: The editor's visual appearance is consistent with the hub's dark theme — no jarring light backgrounds or mismatched colours.

## Assumptions

- TypeScript IDE features (IntelliSense, diagnostics, go-to-definition) apply only to `.ts` and `.tsx` files within the challenge. JavaScript files receive enhanced JS completions only.
- Go-to-definition resolves symbols within the challenge's own file set only. Navigation to external library definitions (e.g., React internals) is out of scope.
- Standard TypeScript library types (`lib.dom.d.ts`, `lib.es2020.d.ts`) are available to the editor's type-checking engine so built-in types (e.g., `Array`, `Promise`, `HTMLElement`) are understood without extra configuration.
- The editor replaces the current editor component only — all surrounding layout (file explorer, console, preview) remains unchanged.
- Mobile experience is out of scope; the editor targets desktop/laptop viewports only.
- The editor must work entirely in the browser — no server-side language server process.
