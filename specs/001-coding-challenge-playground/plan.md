# Implementation Plan: Coding Challenge Playground

**Branch**: `001-coding-challenge-playground` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)

## Summary

Build a HackerRank-style in-browser coding challenge page. The page shows a 5-panel split layout: file explorer, challenge description, code editor, live preview (sandboxed iframe), and console output. Supports React/JavaScript challenges only for v1. User code is transpiled in-browser with Sucrase, executed in a sandboxed iframe, and console output is relayed via postMessage. Challenge session state (edited code) is persisted to localStorage via Zustand.

## Technical Context

**Language/Version**: TypeScript ^5, JavaScript (React JSX)  
**Primary Dependencies**: Next.js 16.2.4, React 19.2.4, Zustand ^5, sucrase, @uiw/react-codemirror, @codemirror/lang-javascript  
**Storage**: localStorage via Zustand `persist` (key: `se-hub-challenges`)  
**Testing**: Vitest ^4 (unit tests for transpile.ts and challenge.store.ts)  
**Target Platform**: Desktop browser (Chromium/Firefox/Safari)  
**Project Type**: Next.js App Router page + components  
**Performance Goals**: Preview refresh < 2s after user stops typing; page load < 3s  
**Constraints**: Desktop-only for v1; no server-side code execution; React/JS challenges only  
**Scale/Scope**: < 20 pre-defined challenges, single user

## Constitution Check

Constitution is an unfilled template — no active principles or gates. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-coding-challenge-playground/
├── plan.md              ← this file
├── research.md          ← Phase 0: technical decisions
├── data-model.md        ← Phase 1: entities & state shape
├── quickstart.md        ← Phase 1: developer guide
├── contracts/
│   └── ui-contracts.md  ← Phase 1: component prop interfaces
└── tasks.md             ← Phase 2: /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
  app/(hub)/
    playground/
      page.tsx                          ← /playground — challenge list
      [slug]/
        page.tsx                        ← /playground/:slug — Server Component
        PlaygroundPage.tsx              ← "use client" orchestrator
  components/
    hub/playground/
      PlaygroundShell.tsx               ← 5-panel split layout
      FileExplorer.tsx
      ChallengeDescription.tsx
      CodeEditor.tsx                    ← "use client", dynamic ssr:false
      ConsolePanel.tsx
      PreviewFrame.tsx                  ← "use client", iframe srcdoc manager
  lib/
    challenges/
      types.ts                          ← Challenge, ChallengeFile, ConsoleEntry
      registry.ts                       ← CHALLENGE_REGISTRY: Challenge[]
      transpile.ts                      ← sucrase.transform() wrapper
    store/
      challenge.store.ts                ← useChallengeStore (Zustand + persist)
  modules/
    challenges/
      react-counter/                    ← first reference challenge
        index.ts

tests/
  lib/
    challenges/
      transpile.test.ts
    store/
      challenge.store.test.ts
```

**Structure Decision**: Single Next.js app (Option 1 variant). New route group pages inside existing `(hub)/`. New `components/hub/playground/` following existing hub component conventions. New `lib/challenges/` following existing `lib/mock-data.ts` / `lib/registry.ts` patterns.

## Complexity Tracking

> No constitution violations.
