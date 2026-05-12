# Tasks: TypeScript Playground Support

**Input**: Design documents from `specs/003-typescript-playground-support/`
**Branch**: `003-typescript-playground-support`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: No new dependencies or project structure needed — `@babel/standalone` already bundles TypeScript support, CodeMirror already handles `.ts`/`.tsx`. Phase 1 is a no-op for this feature.

_No tasks — proceed directly to Phase 2._

---

## Phase 2: Foundational — Type System Extensions

**Purpose**: Extend core type unions in `types.ts`. Every subsequent task (bundler, challenges, UI) depends on these types compiling cleanly.

**⚠️ CRITICAL**: No user story work can begin until T001–T002 pass `pnpm build` without TypeScript errors.

- [x] T001 Extend `ChallengeFile.language` union to include `"ts" | "tsx"` in `src/lib/challenges/types.ts`
- [x] T002 Extend `Challenge.environment` union to include `"react-ts" | "node-ts"` in `src/lib/challenges/types.ts`

**Checkpoint**: `pnpm build` passes with updated type unions. TypeScript errors downstream (bundler, PlaygroundPage) are expected at this point.

---

## Phase 3: Foundational — Transpilation Engine

**Purpose**: Update `bundler.ts` to detect file extensions and apply the correct Babel presets. Also add `environment` param to drive `node-ts` vs React execution. This phase unblocks both US1 and US2.

**⚠️ CRITICAL**: Both US1 and US2 depend on this phase being complete.

- [x] T003 Add TypeScript Babel preset selection by file extension in `src/lib/challenges/bundler.ts`: for `.ts`/`.tsx` files add `'typescript'` to the presets array; for `.tsx`/`.jsx` add `'react'`; for `.js` use only `'env'`
- [x] T004 Extend the inline module resolver string in `buildResolverFn()` in `src/lib/challenges/bundler.ts` to try `.tsx` and `.ts` extensions in addition to `.jsx` and `.js`
- [x] T005 Add optional `environment: "react-js" | "react-ts" | "node-ts"` parameter (default `"react-js"`) to `buildBundle` in `src/lib/challenges/bundler.ts`
- [x] T006 Add `node-ts` entry execution block in `buildBundle` in `src/lib/challenges/bundler.ts`: when `environment === "node-ts"`, emit `__req(entry, ".")` without `ReactDOM.createRoot`; keep existing React mount path for `"react-js"` and `"react-ts"`
- [x] T007 Pass `challenge.environment` as third argument to the `buildBundle` call in `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx`

**Checkpoint**: `pnpm build` passes. Bundler correctly compiles a `.tsx` or `.ts` source string without error (verify via unit test or manual console check).

---

## Phase 4: User Story 1 — React+TS Challenge (Priority: P1) 🎯 MVP

**Goal**: A learner can open a TSX challenge, write typed React code, and see it rendered in the live preview.

**Independent Test**: Navigate to `/playground/react-typed-counter`. Verify `App.tsx` (with `import type { CounterProps }` and `useState<number>`) renders a working counter. Confirm the TypeScript-specific import does not cause a console error.

- [x] T008 [P] [US1] Create `src/modules/challenges/react-typed-counter/index.ts` — define the `react-typed-counter` challenge with `environment: "react-ts"`, entry file `App.tsx`, and three files: `types.ts` (exports `CounterProps` interface), `App.tsx` (typed counter component), `styles.css`
- [x] T009 [US1] Register `react-typed-counter` in `src/lib/challenges/registry.ts` — import and add to `CHALLENGE_REGISTRY` array

**Checkpoint**: Load `/playground/react-typed-counter`. Counter renders. No console errors. TypeScript syntax in `App.tsx` (type annotations, generics) does not block execution.

---

## Phase 5: User Story 2 — Node-TS Scripting Challenge (Priority: P1)

**Goal**: A learner can open a TypeScript OOP challenge, implement typed methods, and see `console.log` output in the console panel — no preview panel shown.

**Independent Test**: Navigate to `/playground/ts-oop-shapes`. Verify the preview panel is hidden. Implement `area()` and `perimeter()` on `Circle` and `Rectangle`. Confirm output appears in the console panel.

- [x] T010 [US2] Update `PlaygroundShell.tsx` in `src/components/hub/playground/PlaygroundShell.tsx` — read `challenge.environment`; when `"node-ts"`, skip rendering `<PlaygroundPreviewFrame>` and change the right column's console wrapper from `h-[220px] shrink-0` to `flex-1` (fills the full right column)
- [x] T011 [P] [US2] Create `src/modules/challenges/ts-oop-shapes/index.ts` — define the `ts-oop-shapes` challenge with `environment: "node-ts"`, entry file `index.ts`, and two files: `shapes.ts` (abstract `Shape` class with concrete `Circle`/`Rectangle` stubs) and `index.ts` (creates instances and logs `describe()` output)
- [x] T012 [US2] Register `ts-oop-shapes` in `src/lib/challenges/registry.ts` — import and add to `CHALLENGE_REGISTRY` array after `react-typed-counter`

**Checkpoint**: Load `/playground/ts-oop-shapes`. Preview panel absent. Implement `area()` and `perimeter()`. Console panel shows `Circle: Area: 78.54, Perimeter: 31.42` and `Rectangle: Area: 24.00, Perimeter: 20.00`.

---

## Phase 6: User Story 3 — Multi-file TypeScript Navigation (Priority: P2)

**Goal**: A learner can browse `.ts`/`.tsx` files in the file explorer and create new `.ts`/`.tsx` files within a TypeScript challenge session.

**Independent Test**: In either TypeScript challenge, click `types.ts` in the file explorer, make an edit, switch to `App.tsx`/`index.ts`, return to `types.ts` — confirm edit persists. Optionally, create a new `.ts` file via the file explorer and confirm it opens with TypeScript syntax highlighting.

- [x] T013 [US3] Extend `handleCreateFile` language detection in `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` — add `ext === "ts" ? "ts" : ext === "tsx" ? "tsx" :` cases before the existing `ext === "js"` case so new `.ts`/`.tsx` files get the correct `FileEntry.language`

**Checkpoint**: Create a new file named `utils.ts` inside a TypeScript challenge. Editor shows TypeScript syntax highlighting. File persists in the session.

---

## Phase 7: User Story 4 — Discovery Badge (Priority: P3)

**Goal**: TypeScript challenges are visually distinguishable from JavaScript challenges on the playground listing page.

**Independent Test**: Navigate to `/playground`. Confirm `react-typed-counter` and `ts-oop-shapes` cards each display a `TS` badge. Confirm `react-counter` card does not display a `TS` badge.

- [x] T014 [US4] Add TypeScript indicator badge to challenge cards in `src/app/(hub)/playground/page.tsx` — when `challenge.environment !== "react-js"`, render a small `TS` badge inline with the difficulty badge (use existing `Badge` component with `variant="accent"` or an inline `<span>` styled with `--accent-secondary` color)

**Checkpoint**: `/playground` page shows `TS` badge on TypeScript challenges only.

---

## Phase 8: Polish & Verification

**Purpose**: Confirm zero regression and both demo challenges complete end-to-end.

- [x] T015 Run `pnpm build` — resolve any TypeScript errors introduced during implementation. All 8 changed files must compile cleanly.
- [ ] T016 [P] Smoke test `react-typed-counter` — load `/playground/react-typed-counter`, verify TypeScript syntax compiles, preview renders, counter increments/decrements correctly
- [ ] T017 [P] Smoke test `ts-oop-shapes` — load `/playground/ts-oop-shapes`, implement the two methods, verify console output matches expected values, preview panel absent
- [ ] T018 [P] Regression test `react-counter` — load `/playground/react-counter` (existing JS challenge), verify no regression in behavior or layout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Type Extensions)**: No dependencies — start immediately
- **Phase 3 (Transpilation Engine)**: Depends on Phase 2 (types must compile)
- **Phase 4 (US1 — React+TS)**: Depends on Phase 3
- **Phase 5 (US2 — Node-TS)**: Depends on Phase 3; T010 (PlaygroundShell) is independent of T011/T012
- **Phase 6 (US3 — Navigation)**: Depends on Phase 3 (needs `FileEntry.language` types)
- **Phase 7 (US4 — Badge)**: Depends on Phase 4+5 (needs new challenges registered)
- **Phase 8 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 + Phase 3 only
- **US2 (P1)**: Depends on Phase 2 + Phase 3 only; T010 (shell layout) is independent of T011/T012 (challenge module)
- **US3 (P2)**: Depends on Phase 2 + Phase 3 (for FileEntry type)
- **US4 (P3)**: Depends on US1 + US2 (challenges must exist in registry before badge is useful)

### Within Each User Story

- Models/types → bundler → challenge module → registry → UI
- T001/T002 are sequential (same file)
- T003–T006 are sequential (same file)
- T008 and T010 are parallel (different files)
- T016/T017/T018 are parallel (different challenge slugs)

### Parallel Opportunities

```bash
# After Phase 2 completes, Phase 3 is sequential (same file)
# After Phase 3 completes, these can run in parallel:
- T008  (react-typed-counter challenge)
- T010  (PlaygroundShell node-ts layout)
- T011  (ts-oop-shapes challenge)
- T013  (handleCreateFile extension)

# After T009 and T012:
- T014  (badge — needs challenges registered)

# Final polish (all parallel):
- T015 pnpm build
- T016 smoke test react-typed-counter
- T017 smoke test ts-oop-shapes
- T018 regression react-counter
```

---

## Implementation Strategy

### MVP First (US1 Only — 9 tasks)

1. T001 + T002: Extend types
2. T003–T007: Transpilation engine
3. T008 + T009: react-typed-counter challenge
4. **STOP and VALIDATE**: Load `/playground/react-typed-counter`, confirm TSX renders
5. T015: `pnpm build`

### Full Delivery (all 18 tasks)

1. Phase 2: T001–T002
2. Phase 3: T003–T007
3. Phase 4+5 in parallel: T008–T009 (US1) ∥ T010–T012 (US2)
4. Phase 6: T013 (US3 — small, 1 task)
5. Phase 7: T014 (US4 — small, 1 task)
6. Phase 8: T015–T018 (parallel smoke tests)

---

## Notes

- No new npm packages required — zero `package.json` changes
- `pnpm build` is the primary correctness gate (TypeScript strict mode surfaces all type errors)
- Both demo challenges are self-contained; they can be iterated independently after initial registration
- `PlaygroundShell.tsx` layout change (T010) does not affect `react-js`/`react-ts` challenges at all — purely additive conditional
- The `bundler.ts` node-ts entry block (T006) reuses the existing `buildPlaygroundSrcdoc` — no srcdoc builder changes needed
