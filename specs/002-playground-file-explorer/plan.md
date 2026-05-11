# Implementation Plan: Playground File Explorer

**Branch**: `002-playground-file-explorer` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the playground's file explorer from a read-only file list to a full VS Code-style interactive explorer: create/delete files and folders, inline naming, right-click context menu, and cross-file import resolution via a custom in-browser CommonJS bundler. No new dependencies required.

## Technical Context

**Language/Version**: TypeScript ^5, JavaScript (React JSX)
**Primary Dependencies**: Next.js 16.2.4, React 19.2.4, Zustand ^5, @babel/standalone (already installed), Framer Motion ^12, lucide-react ^1.8
**Storage**: localStorage via Zustand persist (key: `se-hub-challenges`, extends Feature 001 store)
**Testing**: Vitest ^4 (unit tests for file-tree.ts, bundler path resolution, store actions)
**Target Platform**: Desktop browser
**Project Type**: Extension of existing Next.js playground page
**Performance Goals**: Preview refresh <2s; tree interactions <100ms
**Constraints**: Max 20 user files, max 3-level nesting, relative imports only; no rename/drag-drop
**Scale/Scope**: Personal tool, <20 files per challenge

## Constitution Check

Constitution is an unfilled template — no active principles. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-playground-file-explorer/
├── plan.md              ← this file
├── research.md          ← Phase 0: module resolution decision
├── data-model.md        ← Phase 1: FileMap, FileEntry, bundler pipeline
├── quickstart.md        ← Phase 1: implementation guide
├── contracts/
│   └── ui-contracts.md  ← Phase 1: component interfaces
└── tasks.md             ← Phase 2: /speckit-tasks output
```

### Source Code changes

```text
src/
  lib/
    challenges/
      file-tree.ts          ← NEW: FileMap/FileEntry types, buildTree(), path helpers
      bundler.ts            ← NEW: buildBundle() — CommonJS registry bundler
      transpile.ts          ← CHANGE: switch modules preset "umd" → "commonjs"
    store/
      challenge.store.ts    ← CHANGE: sessions→fileMaps; add addFile/deleteFile; migration
  components/
    hub/playground/
      FileExplorer.tsx      ← REWRITE: tree render, toolbar, context menu wiring
      FileTreeNode.tsx      ← NEW: recursive tree node (file + folder rows)
      FileNameInput.tsx     ← NEW: inline create/name input row
      ContextMenu.tsx       ← NEW: floating right-click overlay
  app/(hub)/playground/[slug]/
    PlaygroundPage.tsx      ← CHANGE: fileMap from store; buildBundle() call; drop transpileJSX
  lib/
    interview/
      build-srcdoc.ts       ← MINOR: remove PLAYGROUND_MOUNT_SRC export (no longer needed)
```

## Complexity Tracking

> No constitution violations.
