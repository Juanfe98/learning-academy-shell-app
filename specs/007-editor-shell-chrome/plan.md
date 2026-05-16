# Implementation Plan: Editor Shell — VS Code-Style Chrome

**Branch**: `007-editor-shell-chrome` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/007-editor-shell-chrome/spec.md`

## Summary

Add VS Code-style editor chrome to the Monaco playground: a file tab bar (open file switching), breadcrumbs (path context), and a status bar (cursor position, language mode, error/warning counts). Three new presentational components wired into the existing `MonacoPlaygroundEditor` + prop threading through `PlaygroundShell` and `PlaygroundPage`.

## Technical Context

**Language/Version**: TypeScript 5 (strict)  
**Primary Dependencies**: `@monaco-editor/react`, React 19, Tailwind v4, lucide-react  
**Storage**: N/A — all UI state in React component memory  
**Testing**: Vitest (node environment) — no new test files needed (pure UI components, no logic to unit test beyond what Monaco provides)  
**Target Platform**: Browser, desktop viewport ≥1280px  
**Project Type**: Next.js 16.2.4 App Router, `"use client"` components  
**Performance Goals**: Tab switch <100ms, cursor update same-frame, diagnostics <500ms  
**Constraints**: No new npm packages; Tailwind v4 (CSS-only config); `"use client"` for Monaco-dependent components  
**Scale/Scope**: Single playground page; 3 new components + 3 file edits

## Constitution Check

Constitution file is an empty template — no project-specific gates defined. Proceeding under CLAUDE.md constraints:
- ✅ No new npm packages
- ✅ All components `"use client"` (Monaco event wiring)
- ✅ Tailwind v4 tokens only (no tailwind.config.ts)
- ✅ TypeScript strict mode — all props fully typed

## Project Structure

### Documentation (this feature)

```text
specs/007-editor-shell-chrome/
├── plan.md              ← this file
├── research.md          ← Phase 0: Monaco APIs, state decisions, tab UX
├── data-model.md        ← Phase 1: entity shapes, state ownership
├── quickstart.md        ← Phase 1: dev guide + implementation order
├── contracts/
│   └── ui-contracts.md  ← component prop interfaces + layout contract
└── tasks.md             ← Phase 2 output (from /speckit-tasks, not yet created)
```

### Source Code

```text
src/
  components/hub/playground/
    EditorTabBar.tsx          ← NEW: file tabs with colored dots, close button, scroll
    EditorBreadcrumbs.tsx     ← NEW: path segments separated by ›
    EditorStatusBar.tsx       ← NEW: Ln/Col + language + error/warning counts
    MonacoPlaygroundEditor.tsx ← MODIFIED: add chrome components + Monaco events + new props
    PlaygroundShell.tsx       ← MODIFIED: thread openTabs / onTabSelect / onTabClose
  app/(hub)/playground/[slug]/
    PlaygroundPage.tsx        ← MODIFIED: add openTabs state + sync handlers
```

## Phase 0: Research (complete)

See [research.md](./research.md).

Key decisions:
- **`openTabs` state** → `PlaygroundPage.tsx` (owns all editor state)
- **Cursor events** → `editor.onDidChangeCursorPosition` (wired in `handleMount`)
- **Diagnostics** → `monaco.editor.onDidChangeMarkers` + `getModelMarkers({ resource })`
- **File icons** → colored 8px dots (no new icons library)
- **Status bar style** → dark (`--bg-surface`), NOT accent blue (clashes with glassmorphism design)
- **Horizontal tab scroll** → `overflow-x: auto` + hidden scrollbar CSS

## Phase 1: Design (complete)

See [data-model.md](./data-model.md) and [contracts/ui-contracts.md](./contracts/ui-contracts.md).

### Component layout (MonacoPlaygroundEditor)

```
┌─────────────────────────────────┐  34px — EditorTabBar
├─────────────────────────────────┤  24px — EditorBreadcrumbs
│                                 │
│       Monaco Editor             │  flex: 1
│                                 │
├─────────────────────────────────┤  22px — EditorStatusBar
└─────────────────────────────────┘
```

### New props added to MonacoPlaygroundEditor

```ts
openTabs: string[]
onTabSelect: (path: string) => void
onTabClose: (path: string) => void
```

### New state added to PlaygroundPage

```ts
const [openTabs, setOpenTabs] = useState<string[]>(() => Object.keys(seedFileMap));
```

Synced in `handleCreateFile`, `handleDeleteFile`, `handleDeleteFolder`, `handleReset`, + new `handleTabClose`.

## Implementation Order

1. `EditorBreadcrumbs.tsx` — pure presentational, no deps
2. `EditorStatusBar.tsx` — pure presentational, receives props
3. `EditorTabBar.tsx` — presentational + scroll behavior
4. `MonacoPlaygroundEditor.tsx` — integrate 3 components, wire Monaco events, add props
5. `PlaygroundShell.tsx` — extend `CodeEditor` prop type, thread new props
6. `PlaygroundPage.tsx` — add `openTabs` state + `handleTabClose` + sync in mutation handlers
