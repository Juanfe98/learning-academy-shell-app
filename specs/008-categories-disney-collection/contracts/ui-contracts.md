# UI & Module Contracts: Academy Categories & Disney Collection

## `src/lib/academy-categories.ts` (new)

```ts
export type AcademyCategory = "fundamentals" | "frontend" | "backend-systems" | "platform-ops" | "disney";
export interface AcademyCategoryMeta { id: AcademyCategory; label: string }
export const ACADEMY_CATEGORIES: AcademyCategoryMeta[];          // display order
export interface CategoryGroup<T> { id: AcademyCategory; label: string; academies: T[] }
export function groupAcademiesByCategory<T extends { category: AcademyCategory }>(academies: T[]): CategoryGroup<T>[];
```

Pure. No React, no imports from pages. Consumed by `paths/page.tsx`, `(hub)/page.tsx`, and tests.

---

## `src/lib/mock-data.ts` / `src/lib/hub-academies.ts` (modified)

- `MockAcademy` and `HubAcademy` gain `category: AcademyCategory` (required).
- Every entry in `MOCK_ACADEMIES` and `SYSTEM_DESIGN_AWS_RELEASED` sets it per data-model.md.
- No other field changes. `HUB_ACADEMIES` composition unchanged.

---

## `src/lib/collections.ts` (new)

```ts
export interface CollectionLink { title: string; url: string; description?: string }
export interface CollectionLinkGroup { id: string; label: string; links: CollectionLink[] }
export interface Collection {
  slug: string; title: string; icon: string; accentColor: string; description: string;
  academySlugs: string[]; relatedAcademySlugs: string[]; jobTargetSlugs: string[];
  linkGroups: CollectionLinkGroup[];
}
export const COLLECTIONS: Collection[];                           // [disney]
export function findCollection(slug: string): Collection | undefined;
export function resolveSlugs<T extends { slug: string }>(slugs: string[], items: T[]): T[];
```

Pure data + two pure functions. Imports nothing from pages or components.

---

## Route: `src/app/(hub)/spaces/[slug]/page.tsx` (new, Server Component)

```ts
interface Props { params: Promise<{ slug: string }> }
export async function generateStaticParams(): Promise<{ slug: string }[]>;   // COLLECTIONS slugs
export async function generateMetadata({ params }: Props);                   // `${title} — SE Hub`
export default async function CollectionPage({ params }: Props);
```

**Behaviour**
- `const { slug } = await params;` then `findCollection(slug)`; `notFound()` when undefined.
- Resolves `academies`, `relatedAcademies` via `resolveSlugs(…, HUB_ACADEMIES)` and `jobTargets` via `resolveSlugs(…, JOB_TARGETS)` mapped to `CollectionJobTarget`.
- Renders `<CollectionView … />` only. No store access, no hooks.

---

## `src/components/hub/collections/CollectionView.tsx` (new, `"use client"`)

```ts
export type CollectionJobTarget = Pick<JobTarget, "slug" | "company" | "role" | "status" | "accentColor">;

interface CollectionViewProps {
  collection: Collection;
  academies: HubAcademy[];
  relatedAcademies: HubAcademy[];
  jobTargets: CollectionJobTarget[];
}
```

**Renders, top to bottom**
1. **Header** — same card treatment as the Learning Paths header (gradient surface, icon box, title, description) using `collection.accentColor` for the tint; stats row: `academies.length` academies, sum of `moduleCount` modules, sum of `totalHours` hours (own academies only).
2. **Academies grid** — `grid grid-cols-1 sm:grid-cols-2 gap-4` of `PathCard` in `academies` order with `progress` from the store. Before `mounted`, renders one `Skeleton` per academy instead of cards.
3. **Job targets** — section heading "Job target" (singular when one); one row card per item: company initial box, company, role, status `Badge` using `STATUS_LABELS` / `STATUS_COLORS`; `Link` to `/jobs/${slug}`. Section omitted when `jobTargets` is empty.
4. **Related paths** — heading "Related paths" with subtitle "General skills you study because of this work."; same `PathCard` grid with progress. Omitted when empty.
5. **Links** — for each group with `links.length > 0`: group label heading and a list of rows; each row is `<a href target="_blank" rel="noopener noreferrer">` with title, optional description, and an `ExternalLink` icon. Whole section omitted when no group has links.

**Store access**: `useProgressStore((s) => s.academies)` behind `mounted` guard; progress = `Math.round(completed / moduleCount * 100)` with `academies[slug]?.modules ?? {}`; `0` when `moduleCount === 0`.

**Animations**: page-entry `initial={{ opacity: 0, y: 18 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration: 0.5`, easing `[0.25, 0.46, 0.45, 0.94]`; grids use the existing `PathCard` in-view animation.

---

## `src/components/hub/Sidebar.tsx` (modified)

`navItems` gains, immediately after Learning Paths:

```ts
{ href: "/spaces/disney", label: "Disney", icon: Castle, matchPrefix: true },
```

Desktop sidebar and mobile drawer both render `navItems`, so the entry appears in both; collapsed mode shows the icon with the label as `title`, as for every other item.

---

## `src/app/(hub)/paths/page.tsx` (modified)

```ts
type Filter = "all" | AcademyCategory;
const CATEGORY_FILTERS: { id: Filter; label: string; count: number }[] = [
  { id: "all", label: "All", count: HUB_ACADEMIES.length },
  ...groupAcademiesByCategory(HUB_ACADEMIES).map((g) => ({ id: g.id, label: g.label, count: g.academies.length })),
];
```

- Pills render from `CATEGORY_FILTERS`; `counts` lookup and the `FILTERS` constant are replaced by the `count` field.
- `filtered = filter === "all" ? HUB_ACADEMIES : HUB_ACADEMIES.filter((a) => a.category === filter)`.
- Everything else (header totals, search, search results list, empty state, animations, `role="tablist"`) unchanged.

---

## `src/app/(hub)/page.tsx` (modified, `PathsSection` only)

- `const HOME_GROUPS = groupAcademiesByCategory(HUB_ACADEMIES);` at module scope.
- For each group: a heading row (`group.label`, count in muted text) followed by the existing 2-column grid of `PathCard`, `index` restarting per group.
- Section title/subtitle and all other Home sections unchanged.

---

## Tests (new, node environment)

- `src/lib/academy-categories.test.ts` — `groupAcademiesByCategory`: order follows `ACADEMY_CATEGORIES`; empty groups omitted; every input appears once; group sizes sum to input length; one fixture per category proves the list covers the union.
- `src/lib/collections.test.ts` — `resolveSlugs`: order preserved, unknown skipped, duplicates honoured; Disney record: all `academySlugs` / `relatedAcademySlugs` resolve in `HUB_ACADEMIES`, all `jobTargetSlugs` resolve in `JOB_TARGETS`, academy and related sets are disjoint, `findCollection("disney")` is defined and `findCollection("nope")` is undefined.
