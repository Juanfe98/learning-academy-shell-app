# Tasks: Playground Filter Grid

**Input**: Design documents from `specs/006-playground-filter-grid/`
**Branch**: `006-playground-filter-grid`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract the reusable `ChallengeCard` component and widen the page container — unblocks all three user stories.

- [x] T001 Create `src/components/hub/playground/ChallengeCard.tsx` by extracting the existing inline card markup from `src/app/(hub)/playground/page.tsx` — accept `challenge: Challenge` prop, keep all existing visual elements (title, description line-clamp-2, tag pills max 3, env badge, difficulty Badge), export as default
- [x] T00X Update `src/app/(hub)/playground/page.tsx` to import and use `ChallengeCard` — replace the inline map markup, verify visual output is identical, widen container from `max-w-3xl` to `max-w-5xl`

**Checkpoint**: `pnpm build` passes. Page looks identical to before but uses the extracted component and is wider.

---

## Phase 2: Foundational (ChallengeFilterGrid shell)

**Purpose**: Create the client component shell with the 2-column grid layout. No filter logic yet — just proves the Server→Client boundary works.

**⚠️ CRITICAL**: Phases 3–5 all build inside `ChallengeFilterGrid.tsx`. This must exist first.

- [x] T00X Create `src/components/hub/playground/ChallengeFilterGrid.tsx` with `"use client"` directive — accept `challenges: Challenge[]` prop, render a `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` with a `ChallengeCard` for each challenge, no filter state yet
- [x] T00X Update `src/app/(hub)/playground/page.tsx` to replace the inline `CHALLENGE_REGISTRY.map(...)` with `<Suspense fallback={null}><ChallengeFilterGrid challenges={CHALLENGE_REGISTRY} /></Suspense>` — import Suspense from React; Suspense boundary is required because ChallengeFilterGrid will use `useSearchParams`

**Checkpoint**: `pnpm build` passes. `/playground` renders all challenges in a 2-column grid.

---

## Phase 3: User Story 1 — Search by keyword (Priority: P1) 🎯 MVP

**Goal**: User types in a search box and visible cards narrow in real time by matching title or tags.

**Independent Test**: Navigate to `/playground`, type "hook" — only matching challenges visible; clear input — all challenges return. Count label updates correctly.

- [x] T00X [US1] Add search input UI to `src/components/hub/playground/ChallengeFilterGrid.tsx` — add `const [search, setSearch] = useState("")` state, render `<input>` with placeholder "Search challenges..." bound to search state, style consistent with hub design tokens (`var(--bg-elevated)`, `var(--border-subtle)`, `var(--text-primary)`)
- [x] T00X [US1] Implement search filter logic in `src/components/hub/playground/ChallengeFilterGrid.tsx` — compute `filtered` array: keep challenge if `search` is empty OR `challenge.title.toLowerCase().includes(q)` OR any `challenge.tags` element lowercased includes `q`; pass `filtered` to the grid instead of `challenges`
- [x] T00X [US1] Add count label to `src/components/hub/playground/ChallengeFilterGrid.tsx` — render `"{filtered.length} of {challenges.length} challenges"` above the grid, styled `text-sm` with `var(--text-secondary)`
- [x] T00X [US1] Add empty state to `src/components/hub/playground/ChallengeFilterGrid.tsx` — when `filtered.length === 0` render a centered message `"No challenges match your filters."` instead of the grid

**Checkpoint**: Search works end-to-end. Count updates. Empty state shows. `pnpm build` passes.

---

## Phase 4: User Story 2 — Filter by difficulty (Priority: P2)

**Goal**: Three pill buttons (Beginner / Intermediate / Advanced) support multi-select OR filtering. Zero selected = show all.

**Independent Test**: Click "Intermediate" — only intermediate challenges visible. Click "Advanced" too — both visible. Click "Intermediate" to deselect — only advanced. Click "Advanced" to deselect — all challenges back.

- [x] T00X [US2] Add difficulty pills UI to `src/components/hub/playground/ChallengeFilterGrid.tsx` — add `const [difficulties, setDifficulties] = useState<Set<string>>(new Set())` state; render three pill `<button>` elements for `["beginner", "intermediate", "advanced"]`; active pill styled with `var(--accent-primary)` background + white text, inactive with `var(--bg-elevated)` + `var(--border-subtle)` border; position pills row below search input
- [x] T010 [US2] Implement difficulty toggle + filter logic in `src/components/hub/playground/ChallengeFilterGrid.tsx` — `toggleDifficulty(d)` creates new Set and adds/removes `d`; apply difficulty filter after search filter: if `difficulties.size === 0` keep all, else keep only challenges where `difficulties.has(challenge.difficulty)`

**Checkpoint**: Difficulty filter works combined with search. `pnpm build` passes.

---

## Phase 5: User Story 3 — URL-persisted filter state (Priority: P3)

**Goal**: Filter state (search + selected difficulties) is encoded in URL params (`q`, `d[]`) so the filtered view is shareable and survives page refresh.

**Independent Test**: Set search "api" + difficulty "Advanced" → copy URL → open new tab → same filtered state loads. Refresh page → state preserved. Invalid `d` param → silently ignored.

- [x] T011 [US3] Add `useSearchParams` and `useRouter` to `src/components/hub/playground/ChallengeFilterGrid.tsx` — replace `useState` for `search` and `difficulties` with values derived from `useSearchParams()`: `const q = searchParams.get("q") ?? ""` and `const difficulties = new Set(searchParams.getAll("d").filter(v => ["beginner","intermediate","advanced"].includes(v)))`
- [x] T012 [US3] Implement `updateParams` helper in `src/components/hub/playground/ChallengeFilterGrid.tsx` — function takes `{ q?: string; d?: string[] }` patch, builds new `URLSearchParams` from current params, applies patch (delete+re-add for `d`, set/delete for `q`), calls `router.replace("?" + params.toString(), { scroll: false })`
- [x] T013 [US3] Wire search input to URL in `src/components/hub/playground/ChallengeFilterGrid.tsx` — change search `<input>` `value` to `q` (from searchParams), `onChange` calls `updateParams({ q: e.target.value, d: [...difficulties] })`
- [x] T014 [US3] Wire difficulty pills to URL in `src/components/hub/playground/ChallengeFilterGrid.tsx` — pill `onClick` computes next Set (toggle), calls `updateParams({ q, d: [...nextDifficulties] })`

**Checkpoint**: Copy URL with active filters → open new tab → identical state. Refresh preserves filters. `pnpm build` passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, visual consistency, and final build gate.

- [x] T015 Verify invalid URL params are silently ignored in `src/components/hub/playground/ChallengeFilterGrid.tsx` — the `.filter(v => ["beginner","intermediate","advanced"].includes(v))` guard from T011 handles this; confirm with a manual test of `?d=nonsense`
- [x] T016 [P] Verify `ChallengeCard.tsx` tag cap at 3 — confirm `challenge.tags.slice(0, 3)` is used and no "+N" badge renders
- [x] T017 [P] Run full manual checklist from `specs/006-playground-filter-grid/quickstart.md` — tick off all 11 items
- [x] T018 Run `pnpm build` — confirm zero TypeScript errors and clean production build

**Checkpoint**: Feature complete. All checklist items pass. Build clean.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately — no dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — `ChallengeCard` must exist before `ChallengeFilterGrid` imports it
- **Phase 3 (US1)**: Depends on Phase 2 — `ChallengeFilterGrid` shell must exist
- **Phase 4 (US2)**: Depends on Phase 3 — difficulty filter builds on the same filtered array established in US1
- **Phase 5 (US3)**: Depends on Phase 4 — replaces local state with URL-derived state; both filters must work first
- **Phase 6 (Polish)**: Depends on Phase 5 — final validation

### Within Each Phase

- T001 before T002 (card extracted before page uses it)
- T003 before T004 (component created before page imports it)
- T005 → T006 → T007 → T008 sequential (each builds on previous)
- T009 → T010 sequential
- T011 → T012 → T013 → T014 sequential (URL state replaces local state)

---

## Implementation Strategy

### MVP (US1 only — Phases 1–3)

1. Phase 1: Extract `ChallengeCard` + widen page
2. Phase 2: Create `ChallengeFilterGrid` shell (2-col grid)
3. Phase 3: Add search + count + empty state
4. **STOP and VALIDATE**: Search works, grid layout correct, build passes

### Full delivery (all stories — sequential)

Complete Phases 1 → 2 → 3 → 4 → 5 → 6 in order. Each phase is a testable increment.

---

## Notes

- No new npm dependencies — only Next.js built-ins (`useSearchParams`, `useRouter`) and existing UI primitives
- `<Suspense>` wrapper in T004 is required by Next.js App Router when a child uses `useSearchParams` — omitting it causes a build warning/error
- T011 fully replaces `useState` for filter values — do not keep both local state and URL state in sync; URL is the single source of truth after Phase 5
- Run `pnpm build` after each phase checkpoint, not just at the end
