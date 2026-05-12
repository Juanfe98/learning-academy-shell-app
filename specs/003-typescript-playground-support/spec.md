# Feature Specification: TypeScript Playground Support

**Feature Branch**: `003-typescript-playground-support`  
**Created**: 2026-05-11  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solve a TypeScript + React Challenge (Priority: P1)

A learner opens a TSX challenge, reads the problem, writes TypeScript React code in the editor, and sees the result rendered live in the preview panel. The editor understands TypeScript syntax and React JSX — no red noise from plain JS tokens.

**Why this priority**: Enables the primary new use case. Without transpilation support for `.tsx`, none of the TypeScript challenge types work.

**Independent Test**: Load the demo TSX challenge. Write a typed React component in `App.tsx`. Confirm the preview renders correctly and TypeScript-specific syntax (interfaces, type annotations) does not block execution.

**Acceptance Scenarios**:

1. **Given** a TSX challenge is loaded, **When** the page renders, **Then** the editor correctly highlights TypeScript and JSX syntax with no false error styling on valid TS code.
2. **Given** the user writes a valid typed React component with interfaces and generics, **When** the preview auto-runs, **Then** the component renders without errors.
3. **Given** the user introduces a TypeScript syntax error (e.g., mismatched type), **When** the code runs, **Then** a readable error appears in the console panel.
4. **Given** the editor is open on a `.tsx` file, **When** the user types a known identifier, **Then** autocompletion suggestions appear for that identifier.

---

### User Story 2 - Solve a TypeScript Scripting Challenge (Priority: P1)

A learner opens a backend/scripting TypeScript challenge (OOP, data structures, algorithms). There is no DOM preview — the result is evaluated code whose output appears entirely in the console panel.

**Why this priority**: Equally core as TSX — without a console-only execution mode, half the desired challenge types (OOP, algorithms) have no way to display results.

**Independent Test**: Load the demo TS scripting challenge. Write a class with typed methods. Confirm `console.log` output appears in the console panel and no preview iframe is needed.

**Acceptance Scenarios**:

1. **Given** a scripting TS challenge is loaded, **When** the page renders, **Then** there is no live preview panel — only editor + console.
2. **Given** the user writes a TypeScript class with typed methods and logs output, **When** the code runs, **Then** all `console.log` / `console.error` output appears in the console panel.
3. **Given** the user writes a runtime error (e.g., accessing a property on `undefined`), **When** the code runs, **Then** the error message appears in the console panel.
4. **Given** the user has a multi-file TS scripting challenge, **When** they import a helper from another `.ts` file, **Then** the import resolves and executes correctly.

---

### User Story 3 - Navigate and Edit TypeScript Challenge Files (Priority: P2)

A learner browses a multi-file TypeScript challenge using the file explorer, switches between `.ts` and `.tsx` files, and edits each independently.

**Why this priority**: Required for any challenge with shared types, helpers, or component splits. Single-file challenges work without it, but realistic TS challenges need multi-file support.

**Independent Test**: Load a TSX challenge with at least two files (`App.tsx`, `types.ts`). Switch between files. Edit both. Confirm edits persist per-file for the session.

**Acceptance Scenarios**:

1. **Given** a TypeScript challenge has both `.ts` and `.tsx` files, **When** the file explorer loads, **Then** all files are listed with correct `.ts`/`.tsx` extensions shown.
2. **Given** the user edits `App.tsx` and switches to `types.ts`, **When** they return to `App.tsx`, **Then** their edits are preserved.
3. **Given** the active file is a `.ts` file, **When** the editor renders it, **Then** TypeScript-specific syntax is correctly highlighted.

---

### User Story 4 - Discover TypeScript Challenges from the Challenge List (Priority: P3)

A learner browsing the playground challenge list can identify which challenges are TypeScript-based (vs JavaScript-based) from a visible indicator on the challenge card.

**Why this priority**: Low-risk polish. Core functionality works without it; it improves discoverability.

**Independent Test**: Navigate to the playground listing page. Confirm TypeScript challenges display a visible `TS` or `TypeScript` badge, and React+TS challenges display a distinct indicator from plain JS React challenges.

**Acceptance Scenarios**:

1. **Given** the challenge list loads, **When** a TypeScript challenge is present, **Then** a `TypeScript` or `TS` badge is visible on the challenge card.
2. **Given** the challenge list loads, **When** a React+TypeScript challenge is present, **Then** it shows both a React and TypeScript indicator (or a combined `React + TS` label).

---

### Edge Cases

- What happens when a `.ts` file imports a type-only export (`import type { Foo }`)? Should be stripped at transpile time without error.
- What happens when a user writes TypeScript generics with `<T>` syntax inside JSX? Parser must not misinterpret `<T>` as a JSX tag.
- What if the user writes `as const` or non-null assertion (`!`) — uncommon TS syntax — does transpilation succeed?
- What happens when a scripting challenge has no `console.log` output? Console panel should show an empty state, not an error.
- What if the user imports a type from a file that only exists as a `.d.ts` declaration? Should fail gracefully with a readable error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support `.ts` and `.tsx` as valid file types in challenges, alongside the existing `.js`, `.jsx`, and `.css` types.
- **FR-002**: System MUST transpile TypeScript and TSX files before execution, stripping type annotations and converting TypeScript-specific syntax to valid JavaScript.
- **FR-003**: System MUST support a `react-ts` challenge environment where `.tsx`/`.ts` files are transpiled and the entry component is rendered in the live preview panel.
- **FR-004**: System MUST support a `node-ts` challenge environment where `.ts` files are transpiled and executed with output visible only in the console panel — no live preview is shown.
- **FR-005**: The code editor MUST display TypeScript-aware syntax highlighting for `.ts` and `.tsx` files (types, interfaces, generics, decorators, type assertions).
- **FR-006**: The code editor MUST provide identifier autocompletion for TypeScript and TSX files (at minimum: local identifiers within the file; React hooks and JSX element names for `.tsx`).
- **FR-007**: System MUST display transpilation errors (type syntax errors) and runtime errors in the console panel with readable messages.
- **FR-008**: The challenge registry MUST include at least one `react-ts` demo challenge (`App.tsx` entry, at minimum one `.ts` types file) and one `node-ts` demo challenge (OOP with a class using typed properties and methods).
- **FR-009**: Challenge cards in the playground listing MUST display a visible TypeScript indicator for challenges with a `react-ts` or `node-ts` environment.
- **FR-010**: The `node-ts` execution environment MUST capture and display `console.log`, `console.warn`, and `console.error` output in the console panel.
- **FR-011**: The `node-ts` environment layout MUST hide the live preview panel and give the reclaimed space to the editor or console panel.
- **FR-012**: Existing `react-js` challenges MUST continue to work without any regression after TypeScript support is added.

### Key Entities

- **Challenge** (extended): Adds `environment: "react-ts" | "node-ts"` to the existing `"react-js"` union. Each environment governs layout (preview visible or not) and transpilation pipeline.
- **ChallengeFile** (extended): Adds `language: "ts" | "tsx"` to the existing `"jsx" | "js" | "css"` union.
- **Demo Challenge — React TS**: Slug `react-typed-counter` (or similar). TSX entry file with an interface-typed prop and state. Demonstrates typed components.
- **Demo Challenge — Node TS**: Slug `ts-shape-calculator` (or similar). A `.ts` file with an abstract class or interface hierarchy, solved with typed methods and `console.log` output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open a `react-ts` challenge and see a working React component rendered in the preview within 3 seconds of page load on a standard connection.
- **SC-002**: A user can open a `node-ts` challenge, write a TypeScript class, and see `console.log` output in the console panel within 2 seconds of the last keystroke.
- **SC-003**: TypeScript type syntax (interfaces, generics, type annotations) does not produce false errors in the editor or console for valid TypeScript code.
- **SC-004**: All existing `react-js` challenges continue to function without regression — zero broken challenges after the feature ships.
- **SC-005**: The two demo challenges (one `react-ts`, one `node-ts`) are completable from start to finish with no dead-end errors.
- **SC-006**: TypeScript challenge type is identifiable from the challenge listing page without opening the challenge.

## Assumptions

- The existing CodeMirror-based editor remains in use; this feature extends its language configuration rather than replacing the editor.
- TypeScript type-checking (compiler errors shown as inline squiggles) is out of scope. The editor provides syntax highlighting and local autocompletion only — not full LSP-level diagnostics.
- `node-ts` challenges run in the same sandboxed iframe environment as `react-js` challenges; they do not execute in an actual Node.js runtime. "Node-like" means console-only output, not access to Node.js built-in modules (`fs`, `http`, etc.).
- Challenges with `.d.ts` type declaration files are not supported in v1 — all types must be inline or co-located in `.ts` files included in the challenge file list.
- Third-party type definitions (e.g., `@types/react`) are not bundled; the transpiler strips types without checking them, so missing `@types` packages do not cause runtime errors.
- The `react-ts` environment makes `React` and `ReactDOM` available globally in the same way the existing `react-js` environment does.
- Mobile layout is not in scope for this feature.
