# Data Model: Academy Categories & Disney Collection

## Entities

### AcademyCategory (new, `src/lib/academy-categories.ts`)

A closed union of five identifiers. Display metadata lives in one ordered list.

```ts
export type AcademyCategory =
  | "fundamentals"
  | "frontend"
  | "backend-systems"
  | "platform-ops"
  | "disney";

export interface AcademyCategoryMeta {
  id: AcademyCategory;
  label: string;
}

export const ACADEMY_CATEGORIES: AcademyCategoryMeta[] = [
  { id: "fundamentals", label: "Fundamentals" },
  { id: "frontend", label: "Frontend" },
  { id: "backend-systems", label: "Backend & Systems" },
  { id: "platform-ops", label: "Platform & Ops" },
  { id: "disney", label: "Disney" },
];
```

**Validation**: the array order is the display order everywhere (pills, Home headings). Adding a category means adding to the union and to this list; TypeScript does not enforce that every union member is listed, so the test file asserts the list covers the union by grouping a fixture with one academy per category.

---

### Academy (existing, modified)

`MockAcademy` (`src/lib/mock-data.ts`) and `HubAcademy` (`src/lib/hub-academies.ts`) each gain one required field:

| Field | Type | Notes |
|---|---|---|
| `category` | `AcademyCategory` | Required. Exactly one per academy. Drives pills, Home grouping. |

No change to `AcademyManifest`, `REGISTRY`, routes, groups, or progress.

**Assignment** (19 entries):

| Slug | Category |
|---|---|
| `web-fundamentals` | fundamentals |
| `typescript-mastery` | fundamentals |
| `python-mastery` | fundamentals |
| `react-deep-dive` | frontend |
| `nextjs-mastery` | frontend |
| `web-components` | frontend |
| `design-systems` | frontend |
| `apollo-graphql` | frontend |
| `graphql-core` (coming soon) | frontend |
| `nodejs-mastery` | backend-systems |
| `express-backend` | backend-systems |
| `system-design-aws` (in `hub-academies.ts`) | backend-systems |
| `kubernetes-mastery` | platform-ops |
| `datadog-mastery` | platform-ops |
| `growth-life-client-api-mastery` | disney |
| `commerce-base-foundations` | disney |
| `hulu-architecture` | disney |
| `espn-architecture` | disney |
| `server-driven-ui-lab` | disney |

---

### CategoryGroup (derived, not stored)

```ts
export interface CategoryGroup<T> {
  id: AcademyCategory;
  label: string;
  academies: T[];
}

export function groupAcademiesByCategory<T extends { category: AcademyCategory }>(
  academies: T[],
): CategoryGroup<T>[];
```

**Rules**: groups appear in `ACADEMY_CATEGORIES` order; a group with zero academies is omitted; academies keep their input order within a group; every input item appears in exactly one group.

---

### Collection (new, `src/lib/collections.ts`)

```ts
export interface CollectionLink {
  title: string;
  url: string;
  description?: string;
}

export interface CollectionLinkGroup {
  id: string;        // stable key, e.g. "jira"
  label: string;     // heading, e.g. "Jira"
  links: CollectionLink[];
}

export interface Collection {
  slug: string;                  // route segment, unique
  title: string;
  icon: string;                  // emoji, like academies
  accentColor: string;           // hex, data-driven like academies
  description: string;
  academySlugs: string[];        // ordered; resolved against HUB_ACADEMIES
  relatedAcademySlugs: string[]; // ordered; resolved against HUB_ACADEMIES
  jobTargetSlugs: string[];      // resolved against JOB_TARGETS
  linkGroups: CollectionLinkGroup[];
}

export const COLLECTIONS: Collection[];
export function findCollection(slug: string): Collection | undefined;
export function resolveSlugs<T extends { slug: string }>(slugs: string[], items: T[]): T[];
```

**Validation rules**
- `slug` unique across `COLLECTIONS`.
- `resolveSlugs` returns items in the order of `slugs`; a slug with no match is skipped (FR-016).
- Rendering hides: the job-target section when `jobTargetSlugs` resolves to nothing; the related rail when `relatedAcademySlugs` resolves to nothing; any link group with zero links; the whole links section when every group is empty (FR-015).
- Test-enforced: every slug in the shipped Disney record resolves; `academySlugs` and `relatedAcademySlugs` are disjoint.

**Relationships**
- Collection → Academy: many-to-many by slug (an academy may appear in several collections; a collection lists many academies). Category is independent of collection membership.
- Collection → JobTarget: many-to-many by slug.
- Collection → Progress: none stored; progress is looked up per academy slug at render.

---

### Disney collection (seed record)

| Field | Value |
|---|---|
| slug | `disney` |
| title | Disney |
| icon | 🏰 |
| accentColor | `#0063e5` (matches the Disney job target accent) |
| description | Everything built from Disney's streaming stack: the Flex BFF, the shared commerce library, and how Hulu and ESPN diverge from Disney+. |
| academySlugs | `growth-life-client-api-mastery`, `commerce-base-foundations`, `hulu-architecture`, `espn-architecture`, `server-driven-ui-lab` |
| relatedAcademySlugs | `kubernetes-mastery`, `datadog-mastery` |
| jobTargetSlugs | `disney-staff-engineer` |
| linkGroups | Jira (GCIEX project, GREAT project); Confluence (CGI space); Repos (growth-life-client-api, growth-life-client-templates, cgi-web, Growth-Life-Orchestrator, modh, asgard); Dashboards (Datadog dashboards referenced in Juan's GREAT notes; Datadog dashboard list) |

Exact URLs are entered in `src/lib/collections.ts` during implementation from Juan's repo remotes and notes. Destinations that are not known (the commerce-base repository) are omitted.

---

### CollectionJobTarget (view prop, derived)

```ts
type CollectionJobTarget = Pick<JobTarget, "slug" | "company" | "role" | "status" | "accentColor">;
```

The page maps resolved `JobTarget` records to this shape so the client view receives only what the card renders.

---

### Filter state on Learning Paths (component state, not stored)

| State | Type | Default |
|---|---|---|
| `filter` | `"all" \| AcademyCategory` | `"all"` |
| `query` | `string` (existing) | `""` |

`CATEGORY_FILTERS` is computed once at module scope from `groupAcademiesByCategory(HUB_ACADEMIES)` and prefixed with the All entry; it therefore never contains a zero-count category.

---

## State transitions

```
Learning Paths
  load ──────────────▶ filter = "all", all academies shown
  click pill X ──────▶ filter = X, academies where category === X
  type in search ────▶ pills hidden, results span all academies (filter retained)
  clear search ──────▶ pills shown, filter still X

Collection page
  request /spaces/:slug
    ├─ findCollection(slug) undefined ──▶ notFound()
    └─ found ──▶ resolveSlugs ×3 ──▶ CollectionView
                                       ├─ !mounted ──▶ header + Skeleton grids
                                       └─ mounted ──▶ progress read ──▶ PathCards
```
