# Research: Academy Categories & Disney Collection

All technical context items were resolvable from the codebase; no external research was needed. Each decision below records what was chosen, why, and what was rejected.

## Decision 1 — Where `category` lives

**Decision**: Add `category: AcademyCategory` as a **required** field on the discovery types `MockAcademy` (`src/lib/mock-data.ts`) and `HubAcademy` (`src/lib/hub-academies.ts`). Do **not** add it to `AcademyManifest` (`src/lib/types/academy.ts`) or `REGISTRY`.

**Rationale**: Category is a navigation concern. The constitution's two-source rule keeps `MOCK_ACADEMIES` / `HUB_ACADEMIES` for discovery UI and `REGISTRY` for content. Making the field required means a forgotten category is a TypeScript error at `pnpm build`, which satisfies the spec edge case "a missing category must be caught before the app runs". `HUB_ACADEMIES = [...MOCK_ACADEMIES, SYSTEM_DESIGN_AWS_RELEASED]` so both interfaces must carry the field for the spread to type-check.

**Alternatives considered**: Optional field with an "Other" bucket — rejected because it silently hides mistakes and creates a dead-end pill. A separate `Record<slug, category>` map — rejected because it duplicates the slug list and drifts from the academy entries.

---

## Decision 2 — Category metadata and grouping helper

**Decision**: New module `src/lib/academy-categories.ts` exporting the `AcademyCategory` union, `ACADEMY_CATEGORIES` (ordered `{ id, label }` list), and a pure generic `groupAcademiesByCategory<T extends { category }>(items)` that returns `{ id, label, academies }[]` in display order with empty groups removed.

**Rationale**: One ordered list is the single source of truth for pill order, Home heading order, and labels. A pure helper over a structural type is testable in the node Vitest environment (constitution VI) and is reused by both Learning Paths and Home, so counts and order cannot diverge. Dropping empty groups implements "zero-count categories are not offered" in one place.

**Alternatives considered**: Inline `filter` calls in each page — rejected because order and empty-handling would be duplicated in two files. Putting the type in `types/academy.ts` — rejected because that file describes the content layer.

---

## Decision 3 — Collection model: slug references resolved at render

**Decision**: `src/lib/collections.ts` defines `Collection` with **slug arrays** (`academySlugs`, `relatedAcademySlugs`, `jobTargetSlugs`) plus `linkGroups`. A generic pure `resolveSlugs<T extends { slug }>(slugs, items)` returns matches in the requested order and silently skips unknown slugs. The page resolves against `HUB_ACADEMIES` and `JOB_TARGETS`.

**Rationale**: Slug references keep the collection record serializable and free of import cycles (`hub-academies.ts` imports `mock-data.ts`; a collection that imported academy objects and was imported by pages would be fine, but holding object references makes the record non-data and harder to author). Resolution order follows the record, satisfying "listed in the record's order". Skipping unknown slugs implements FR-016 in one tested function. A Vitest data-integrity test asserts the shipped Disney record resolves fully, so a typo is caught by `pnpm test` even though the page would degrade gracefully.

**Alternatives considered**: Deriving the Disney collection from `category === "disney"` — rejected because related paths and job targets are not categories, and the spec wants an explicit curated order. Object references in the record — rejected as above.

---

## Decision 4 — Route shape and server/client split

**Decision**: Generic dynamic route `src/app/(hub)/spaces/[slug]/page.tsx` as a Server Component (`await params`, `generateStaticParams`, `generateMetadata`, `notFound()`), rendering a single `"use client"` component `CollectionView` with plain-data props.

**Rationale**: Mirrors `jobs/[slug]/page.tsx` for the server half and `interview/page.tsx` → `TrackBrowser` for delegation to a client view. `notFound()` is the hub's standard not-found behaviour for dynamic routes. Progress must be read from the persisted store on the client with the mounted guard (constitution V), and `PathCard` is already a client component, so the whole lower page is one client island. All props are serializable: `Collection` is strings and arrays; `HubAcademy` has no functions (`routes` omit `component`); job targets are passed as a `Pick` of five scalar fields.

**Alternatives considered**: A hardcoded `/disney` page — rejected; the spec requires a generic record-driven route. A fully client page like `paths/page.tsx` — rejected because `params`, `notFound()` and metadata are server features.

---

## Decision 5 — Sidebar entry is a manual item, not derived from `COLLECTIONS`

**Decision**: Add `{ href: "/spaces/disney", label: "Disney", icon: Castle, matchPrefix: true }` to `navItems` in `Sidebar.tsx`, directly after Learning Paths.

**Rationale**: Nav items carry a lucide icon component; collection records carry an emoji string for the page header. Deriving nav items from `COLLECTIONS` would require storing a component in the data record (non-serializable) or an icon-name lookup table — a premature abstraction for one collection (constitution VII). The spec explicitly allows "a new data record and a sidebar entry". `matchPrefix: true` keeps the item active on the collection page. `Castle` is present in the installed lucide-react.

**Alternatives considered**: Icon-name map — deferred until a second collection exists.

---

## Decision 6 — Learning Paths filter: component state, single-select, no URL params

**Decision**: Replace `type Filter = "all" | "available" | "soon"` with `"all" | AcademyCategory`. Build `CATEGORY_FILTERS` at module scope from `groupAcademiesByCategory(HUB_ACADEMIES)` so counts are static and zero-count pills never exist. Keep `useState<Filter>("all")`, keep the existing pill markup, hide pills during search exactly as today.

**Rationale**: The spec states selection is page state only, single-select, and that search behaviour is unchanged. The existing `filter` state already survives a search-and-clear cycle, which satisfies "previously selected pill is still active". This deliberately differs from feature 006 (URL-encoded filters) because the spec for this feature asks for page state only.

**Alternatives considered**: Multi-select — rejected; five categories make it unnecessary. URL params — rejected per spec assumption.

---

## Decision 7 — Home grouping

**Decision**: `PathsSection` iterates `groupAcademiesByCategory(HUB_ACADEMIES)` (computed once at module scope) and renders a small heading row (label + count) and a grid per group, reusing `PathCard` with the stagger `index` restarting at 0 per group.

**Rationale**: Reuses the single helper, so Home and Learning Paths cannot disagree. Restarting the index per group keeps the existing entry animation from accumulating a long delay on the last group.

---

## Decision 8 — Progress on the collection page

**Decision**: `CollectionView` reads `useProgressStore((s) => s.academies)` behind the mounted guard and computes `Math.round(completed / moduleCount * 100)` with `academies[slug]?.modules ?? {}`, the same formula and defensive access used by `paths/page.tsx`. While not mounted it renders `Skeleton` placeholders in place of the academy grids.

**Rationale**: SC-004 requires identical percentages across Learning Paths, Dashboard and the collection page; reusing the formula guarantees it. The skeleton satisfies the constitution's loading-state rule and the spec's "no wrong value then correct itself" edge case.

---

## Decision 9 — Tests

**Decision**: Two pure-logic test files. `academy-categories.test.ts`: display order, empty groups omitted, each item appears exactly once, counts sum to input length. `collections.test.ts`: `resolveSlugs` preserves requested order and skips unknown slugs; the shipped Disney collection resolves every academy, related academy and job target slug; `academySlugs` and `relatedAcademySlugs` do not overlap.

**Rationale**: Constitution VI limits tests to pure logic in node. These tests cover FR-002/FR-007 (ordering, empties), FR-016 (unknown slugs skipped) and FR-018 (Disney record integrity), which are the parts most likely to break silently when data is edited later.

---

## Decision 10 — Seed links for the Disney collection

**Decision**: Seed the four groups with destinations already present in Juan's notes and repo remotes: Jira projects GCIEX and GREAT on `deept.atlassian.net`; the CGI Confluence space on `confluence.disney.com`; the growth-life-client-api, growth-life-client-templates, cgi-web, Growth-Life-Orchestrator, modh and asgard repositories on `github.twdcgrid.net`; and the Datadog dashboards referenced in the GREAT dashboards notes on `disneystreaming.datadoghq.com`. The commerce-base repository address is not known and is omitted rather than guessed.

**Rationale**: The spec seeds known systems and leaves unknown destinations out. All destinations are Disney-internal; nothing is committed by this work, and the final report asks Juan to confirm the GitHub repository is private before he commits.

**Alternatives considered**: Placeholder URLs — rejected; a broken link is worse than no link.

---

## Decision 11 — External link affordance

**Decision**: Links render as `<a target="_blank" rel="noopener noreferrer">` with the lucide `ExternalLink` icon (already used on `jobs/[slug]`), title, optional description, and a hover treatment matching the Learning Paths search-result rows.

**Rationale**: FR-015 requires a new tab and a visible external marker. `rel="noopener noreferrer"` is the standard safety attribute for `_blank` links.
