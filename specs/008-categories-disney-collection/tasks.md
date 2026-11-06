# Tasks: Academy Categories & Disney Collection

**Input**: Design documents from `specs/008-categories-disney-collection/`
**Branch**: `008-categories-disney-collection`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included. The plan lists two pure-logic Vitest files as deliverables (constitution VI: node environment, pure functions only).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1–US5 from spec.md)

---

## Phase 1: Setup (new pure data modules)

**Purpose**: Create the two new lib modules every story depends on. No UI yet.

- [X] T001 [P] Create `src/lib/academy-categories.ts` exporting `type AcademyCategory = "fundamentals" | "frontend" | "backend-systems" | "platform-ops" | "disney"`, `interface AcademyCategoryMeta { id; label }`, `const ACADEMY_CATEGORIES` in display order with labels Fundamentals / Frontend / Backend & Systems / Platform & Ops / Disney, `interface CategoryGroup<T> { id; label; academies: T[] }`, and `function groupAcademiesByCategory<T extends { category: AcademyCategory }>(academies: T[]): CategoryGroup<T>[]` that maps `ACADEMY_CATEGORIES` to groups and filters out groups with zero academies (see quickstart.md §1)
- [X] T002 [P] Create `src/lib/collections.ts` exporting `CollectionLink`, `CollectionLinkGroup`, `Collection` interfaces (fields per data-model.md), `function resolveSlugs<T extends { slug: string }>(slugs, items): T[]` (flatMap find, skip unknown, preserve order — quickstart.md §2), `function findCollection(slug)`, and `const COLLECTIONS: Collection[]` holding the Disney record: slug `disney`, title `Disney`, icon `🏰`, accentColor `#0063e5`, description "Everything built from Disney's streaming stack: the Flex BFF, the shared commerce library, and how Hulu and ESPN diverge from Disney+.", academySlugs `["growth-life-client-api-mastery","commerce-base-foundations","hulu-architecture","espn-architecture","server-driven-ui-lab"]`, relatedAcademySlugs `["kubernetes-mastery","datadog-mastery"]`, jobTargetSlugs `["disney-staff-engineer"]`, linkGroups: **jira** "Jira" → GCIEX project `https://deept.atlassian.net/projects/GCIEX`, GREAT project `https://deept.atlassian.net/projects/GREAT`; **confluence** "Confluence" → CGI space `https://confluence.disney.com/spaces/CGI`; **repos** "Repos" → growth-life-client-api `https://github.twdcgrid.net/flex/growth-life-client-api`, growth-life-client-templates `https://github.twdcgrid.net/flex/growth-life-client-templates`, cgi-web `https://github.twdcgrid.net/cgi-client/cgi-web`, Growth-Life-Orchestrator `https://github.twdcgrid.net/glo/Growth-Life-Orchestrator`, modh `https://github.twdcgrid.net/cgi-client/modh`, asgard `https://github.twdcgrid.net/CGX/asgard`; **dashboards** "Dashboards" → D+ Signup monitoring `https://disneystreaming.datadoghq.com/dashboard/73r-7qq-9r3`, D+ In-Product Switch `https://disneystreaming.datadoghq.com/dashboard/rhp-h4y-n36`, ESPN Signup `https://disneystreaming.datadoghq.com/dashboard/spg-pqf-s6u`, ESPN Retention `https://disneystreaming.datadoghq.com/dashboard/3nt-d4v-t4m`, Hulu Retention `https://disneystreaming.datadoghq.com/dashboard/md9-8xp-cww`, Hulu Account Management / Switch `https://disneystreaming.datadoghq.com/dashboard/mwx-bru-hm7`. Each link gets a short one-line `description`.

**Checkpoint**: Both files compile in isolation (`pnpm build` still passes because nothing imports them yet).

---

## Phase 2: Foundational (category on every academy + tests)

**Purpose**: Make `category` a required field and prove the data with tests. BLOCKS all user stories.

**⚠️ CRITICAL**: T003 and T004 must both land before `pnpm build` passes again (the spread `[...MOCK_ACADEMIES, SYSTEM_DESIGN_AWS_RELEASED]` requires both interfaces to carry `category`).

- [X] T003 Add `category: AcademyCategory` (import type from `./academy-categories`) to the `MockAcademy` interface in `src/lib/mock-data.ts` and set it on all 18 entries per the data-model.md table: fundamentals → web-fundamentals, typescript-mastery, python-mastery; frontend → react-deep-dive, nextjs-mastery, web-components, design-systems, apollo-graphql, graphql-core; backend-systems → nodejs-mastery, express-backend; platform-ops → kubernetes-mastery, datadog-mastery; disney → growth-life-client-api-mastery, commerce-base-foundations, hulu-architecture, espn-architecture, server-driven-ui-lab. Place the field directly after `slug`/`title` block for readability; touch nothing else in each entry.
- [X] T004 Add `category: AcademyCategory` to the `HubAcademy` interface and `category: "backend-systems"` to `SYSTEM_DESIGN_AWS_RELEASED` in `src/lib/hub-academies.ts`
- [X] T005 [P] Create `src/lib/academy-categories.test.ts` (Vitest, node): groups follow `ACADEMY_CATEGORIES` order; groups with zero academies are omitted; every input appears in exactly one group; group sizes sum to input length; a fixture with one item per category yields five groups (proves the list covers the union)
- [X] T006 [P] Create `src/lib/collections.test.ts` (Vitest, node): `resolveSlugs` preserves requested order, skips unknown slugs, honours duplicates; `findCollection("disney")` defined and `findCollection("nope")` undefined; for every collection in `COLLECTIONS`: all `academySlugs` and `relatedAcademySlugs` resolve against `HUB_ACADEMIES`, all `jobTargetSlugs` resolve against `JOB_TARGETS`, and `academySlugs` ∩ `relatedAcademySlugs` is empty

**Checkpoint**: `pnpm test` passes (new + existing tests); `pnpm build` passes. No visible change yet.

---

## Phase 3: User Story 1 — Browse Learning Paths by category (Priority: P1) 🎯 MVP

**Goal**: Category pills (All + one per non-empty category, with counts) replace the Available / Coming Soon tabs on `/paths`.

**Independent Test**: Open `/paths`, click each pill, confirm visible cards match the category table and counts sum to All. Search still hides pills and spans all academies; clearing search restores the previously selected pill.

- [X] T007 [US1] In `src/app/(hub)/paths/page.tsx`: import `AcademyCategory` and `groupAcademiesByCategory` from `@/lib/academy-categories`; replace `type Filter = "all" | "available" | "soon"` with `type Filter = "all" | AcademyCategory`; replace the `FILTERS` constant with a module-scope `CATEGORY_FILTERS: { id: Filter; label: string; count: number }[]` built from `{ id: "all", label: "All", count: HUB_ACADEMIES.length }` plus `groupAcademiesByCategory(HUB_ACADEMIES)` mapped to `{ id, label, count: academies.length }`; delete the per-render `counts` object; set `filtered = filter === "all" ? HUB_ACADEMIES : HUB_ACADEMIES.filter((a) => a.category === filter)`; render pills from `CATEGORY_FILTERS` using `count` in the badge. Keep header totals, search, search results, empty state, animations and `role="tablist"` unchanged.

**Checkpoint**: `pnpm build` passes. `/paths` shows six pills; Disney pill lists exactly five academies; GraphQL Core shows its Coming soon badge under Frontend.

---

## Phase 4: User Story 2 — Open the Disney collection from the sidebar (Priority: P1)

**Goal**: A Disney sidebar entry opens `/spaces/disney`, which shows the collection header and the five Disney academies with progress.

**Independent Test**: Click Disney in the sidebar (desktop expanded, desktop collapsed, mobile drawer). The page shows the five academies in record order with the same progress percentages as `/paths`. `/spaces/does-not-exist` shows the not-found page.

- [X] T008 [US2] Create `src/components/hub/collections/CollectionView.tsx` (`"use client"`): props `{ collection: Collection; academies: HubAcademy[]; relatedAcademies: HubAcademy[]; jobTargets: CollectionJobTarget[] }` where `export type CollectionJobTarget = Pick<JobTarget, "slug" | "company" | "role" | "status" | "accentColor">`; `mounted` guard + `useProgressStore((s) => s.academies)` + `getProgress(slug, moduleCount)` exactly as quickstart.md §4; render (a) a header card styled like the `/paths` header (gradient tinted with `collection.accentColor`, icon box with `collection.icon`, `h1` title, description, stats row: academies count, modules sum, hours sum) with the page-entry animation `initial={{ opacity: 0, y: 18 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.5`, ease `[0.25, 0.46, 0.45, 0.94]`; (b) an "Academies" section: `grid grid-cols-1 sm:grid-cols-2 gap-4` of `PathCard` with `progress`, or one `Skeleton` (`height={220}`, `rounded="xl"`) per academy while `!mounted`. Leave placeholders (no markup) for job targets, related paths and links; those arrive in T011–T013. Container `max-w-7xl mx-auto px-6 py-10`.
- [X] T009 [US2] Create `src/app/(hub)/spaces/[slug]/page.tsx` (Server Component): `interface Props { params: Promise<{ slug: string }> }`; `generateStaticParams` from `COLLECTIONS`; `generateMetadata` returning `{ title: \`${collection.title} — SE Hub\` }` or `{}`; default export awaits `params`, calls `findCollection`, `notFound()` when undefined, resolves `academies` and `relatedAcademies` with `resolveSlugs(…, HUB_ACADEMIES)`, resolves job targets with `resolveSlugs(…, JOB_TARGETS)` mapped to the five `CollectionJobTarget` fields, and renders `<CollectionView … />` (quickstart.md §3)
- [X] T010 [US2] In `src/components/hub/Sidebar.tsx`: import `Castle` from `lucide-react` and insert `{ href: "/spaces/disney", label: "Disney", icon: Castle, matchPrefix: true }` into `navItems` immediately after the Learning Paths item

**Checkpoint**: `pnpm build` passes. Sidebar shows Disney in desktop and mobile; `/spaces/disney` renders header + five academies with progress; unknown slug → not found.

---

## Phase 5: User Story 3 — Reach the Disney job target and related paths (Priority: P2)

**Goal**: The collection page shows a job target card linking to `/jobs/disney-staff-engineer` and a "Related paths" rail with Kubernetes and Datadog.

**Independent Test**: On `/spaces/disney`, the job target card shows Disney / role / status label identical to `/jobs` and opens the job page; Related paths shows exactly Kubernetes and Datadog with progress, visually separated; neither appears under the Disney pill on `/paths`.

- [X] T011 [US3] In `src/components/hub/collections/CollectionView.tsx` add a job targets section rendered only when `jobTargets.length > 0`: heading "Job target" (plural "Job targets" when more than one); one row per item modelled on the `/jobs` list row (company-initial box tinted with `accentColor`, company, role, status `Badge` using `STATUS_LABELS` / `STATUS_COLORS` from `@/lib/job-targets`, `ArrowRight`), wrapped in `Link` to `/jobs/${slug}`; use CSS `group-hover` classes rather than mouse handlers
- [X] T012 [US3] In `src/components/hub/collections/CollectionView.tsx` add a "Related paths" section rendered only when `relatedAcademies.length > 0`: heading "Related paths", subtitle "General skills you study because of this work.", separated from the academies grid by a top border / extra spacing, same `PathCard` grid with `getProgress` and the same `Skeleton` fallback while `!mounted`

**Checkpoint**: `pnpm build` passes; both sections visible on `/spaces/disney`; status label matches `/jobs`.

---

## Phase 6: User Story 4 — Jump to Disney work systems (Priority: P2)

**Goal**: Grouped external links at the bottom of the collection page, each opening in a new tab.

**Independent Test**: Every link opens a new tab with the hub still open; empty groups and an empty section do not render (verify by temporarily emptying a group in the data, then restoring it).

- [X] T013 [US4] In `src/components/hub/collections/CollectionView.tsx` add a links section: `const linkGroups = collection.linkGroups.filter((g) => g.links.length > 0)`; render nothing when `linkGroups.length === 0`; otherwise heading "Links" and, per group, the group label and a list of rows: `<a href={url} target="_blank" rel="noopener noreferrer">` styled like the `/paths` search-result rows, showing title, optional description (muted, truncated), and an `ExternalLink` icon from `lucide-react`

**Checkpoint**: `pnpm build` passes; four groups render on `/spaces/disney`; links open in new tabs.

---

## Phase 7: User Story 5 — Home grouped by category (Priority: P3)

**Goal**: The Home academies section shows category headings in pill order, omitting empty categories.

**Independent Test**: Open `/`; the academies section shows one heading per non-empty category in the same order as the `/paths` pills, with identical membership.

- [X] T014 [US5] In `src/app/(hub)/page.tsx`: import `groupAcademiesByCategory` from `@/lib/academy-categories`; add module-scope `const HOME_GROUPS = groupAcademiesByCategory(HUB_ACADEMIES);`; in `PathsSection` replace the single grid with one block per group: a heading row (`h3` with `group.label`, muted count span) using the existing `inView()` animation, followed by the existing `grid grid-cols-1 md:grid-cols-2 gap-4` of `PathCard` with `index` restarting at 0 per group; keep the section title and subtitle unchanged

**Checkpoint**: `pnpm build` passes; Home shows five headed groups.

---

## Phase 8: Polish & Verification

- [X] T015 Run `pnpm test`, `pnpm lint`, `pnpm build` from the repo root and fix anything they report without widening scope — test and build pass; lint reports the pre-existing `react-hooks/set-state-in-effect` baseline (36 errors on `main`) plus the same constitution-mandated mounted-guard pattern once in `CollectionView.tsx`; not fixable without an ESLint config change or diverging from the constitution, left for Juan's decision
- [ ] T016 Run the manual checklist in `specs/008-categories-disney-collection/quickstart.md` against `pnpm dev` (browser) and record results in the final report; any item that cannot be verified is listed as a follow-up for Juan — PARTIAL: server-rendered HTML verified over HTTP on the running dev server (pills and counts, old tabs gone, coming-soon badge, sidebar entry, Disney page title/sections/order/job card/status/links/stats, 404 for unknown slug, Home headings, SC-005 throwaway collection); browser-only items (pill clicks, progress after mount, collapsed-sidebar tooltip, mobile drawer, new-tab behaviour) remain for Juan

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 are independent of each other and of existing code.
- **Foundational (Phase 2)**: T003 and T004 depend on T001; T005 depends on T001; T006 depends on T002, T003, T004. BLOCKS all user stories.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on Phase 2; T009 depends on T008; T010 is independent of T008/T009.
- **US3 (Phase 5)**: depends on T008 (same file).
- **US4 (Phase 6)**: depends on T008 (same file).
- **US5 (Phase 7)**: depends on Phase 2 only; independent of US2–US4.
- **Polish (Phase 8)**: after all stories.

### User Story Dependencies

- US1, US2 and US5 are mutually independent once Phase 2 lands.
- US3 and US4 extend the `CollectionView` created in US2 and must follow T008 sequentially (single file).

### Parallel Opportunities

- T001 ‖ T002
- T005 ‖ T006 (after T003/T004)
- T007 ‖ T010 ‖ T014 (three different files, after Phase 2)
- T008 → T009 sequential; T011 → T012 → T013 sequential (same file as T008)

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 → Phase 2 → `pnpm test` + `pnpm build` green.
2. Phase 3 (pills) → validate on `/paths`.
3. Phase 4 (Disney page + sidebar) → validate on `/spaces/disney`.
4. Stop here if needed: the catalogue is categorized and Disney has its front door.

### Incremental Delivery

5. Phase 5 (job target + related) → Phase 6 (links) → Phase 7 (Home) → Phase 8 (verify).

---

## Notes

- No commits are made by the implementing agent; Juan reviews the diff on branch `008-categories-disney-collection`.
- Link destinations in T002 are Disney-internal; confirm the GitHub repository is private before committing.
- Constitution VII: no refactors beyond the listed edits; `paths/page.tsx` keeps its structure and only swaps the filter model.
