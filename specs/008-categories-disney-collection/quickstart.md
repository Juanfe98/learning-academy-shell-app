# Developer Quickstart: Academy Categories & Disney Collection

## What changes

| File | Change |
|---|---|
| `src/lib/academy-categories.ts` | **New** — category union, ordered labels, `groupAcademiesByCategory()` |
| `src/lib/academy-categories.test.ts` | **New** — grouping tests |
| `src/lib/collections.ts` | **New** — collection types, Disney record, `findCollection()`, `resolveSlugs()` |
| `src/lib/collections.test.ts` | **New** — resolver tests + Disney data integrity |
| `src/lib/mock-data.ts` | Modify — `category` on `MockAcademy` and on all 18 entries |
| `src/lib/hub-academies.ts` | Modify — `category` on `HubAcademy` and on System Design & AWS |
| `src/app/(hub)/paths/page.tsx` | Modify — category pills replace Available / Coming Soon tabs |
| `src/app/(hub)/page.tsx` | Modify — `PathsSection` grouped by category |
| `src/app/(hub)/spaces/[slug]/page.tsx` | **New** — Server Component route |
| `src/components/hub/collections/CollectionView.tsx` | **New** — client view |
| `src/components/hub/Sidebar.tsx` | Modify — add Disney nav item |
| `CLAUDE.md` | Modify — SPECKIT block points at feature 008 |

No new dependencies. No store changes. Dashboard, content viewer, Playground, Interview Prep, Job Targets untouched.

---

## Key implementation notes

### 1. Grouping helper (shared by Paths and Home)

```ts
export function groupAcademiesByCategory<T extends { category: AcademyCategory }>(
  academies: T[],
): CategoryGroup<T>[] {
  return ACADEMY_CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    academies: academies.filter((a) => a.category === id),
  })).filter((group) => group.academies.length > 0);
}
```

### 2. Resolver (collections)

```ts
export function resolveSlugs<T extends { slug: string }>(slugs: string[], items: T[]): T[] {
  return slugs.flatMap((slug) => {
    const match = items.find((item) => item.slug === slug);
    return match ? [match] : [];
  });
}
```

### 3. Route page (Server Component)

```tsx
export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) notFound();

  return (
    <CollectionView
      collection={collection}
      academies={resolveSlugs(collection.academySlugs, HUB_ACADEMIES)}
      relatedAcademies={resolveSlugs(collection.relatedAcademySlugs, HUB_ACADEMIES)}
      jobTargets={resolveSlugs(collection.jobTargetSlugs, JOB_TARGETS).map(
        ({ slug, company, role, status, accentColor }) => ({ slug, company, role, status, accentColor }),
      )}
    />
  );
}
```

### 4. Progress in the client view

```ts
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
const progressByAcademy = useProgressStore((s) => s.academies);

function getProgress(slug: string, moduleCount: number): number {
  if (!mounted || moduleCount === 0) return 0;
  const mods = Object.values(progressByAcademy[slug]?.modules ?? {});
  return Math.round((mods.filter((m) => m.completed).length / moduleCount) * 100);
}
```

Render `Skeleton` cards while `!mounted`.

### 5. Learning Paths pills

```ts
type Filter = "all" | AcademyCategory;
const CATEGORY_FILTERS = [
  { id: "all" as const, label: "All", count: HUB_ACADEMIES.length },
  ...groupAcademiesByCategory(HUB_ACADEMIES).map((g) => ({
    id: g.id, label: g.label, count: g.academies.length,
  })),
];
```

### 6. Sidebar

```ts
import { Castle } from "lucide-react";
// after Learning Paths:
{ href: "/spaces/disney", label: "Disney", icon: Castle, matchPrefix: true },
```

---

## Commands

```bash
pnpm test     # academy-categories + collections tests, plus existing store tests
pnpm lint
pnpm build    # type gate — required field forces every academy to carry a category
pnpm dev      # manual checklist below
```

---

## Manual test checklist

- [ ] `/paths` shows pills All · Fundamentals · Frontend · Backend & Systems · Platform & Ops · Disney with counts that sum to All
- [ ] Clicking Disney shows exactly the five Disney academies; clicking All restores everything
- [ ] GraphQL Core shows its "Coming soon" badge under Frontend and under All
- [ ] Typing in search hides the pills; clearing restores them with the previously selected pill still active
- [ ] Header totals on `/paths` do not change when a pill is selected
- [ ] Home academies section shows headings in pill order with no empty headings
- [ ] Sidebar shows Disney below Learning Paths on desktop (expanded and collapsed) and in the mobile drawer; drawer closes on tap
- [ ] `/spaces/disney` shows header, five academies in order (glca, commerce-base, Hulu, ESPN, Server-Driven UI Lab), each with progress
- [ ] Progress for an academy with completed modules matches `/paths` and `/dashboard`
- [ ] Job target card opens `/jobs/disney-staff-engineer` and shows the same status label as `/jobs`
- [ ] Related paths shows Kubernetes and Datadog, visually separated; they are not under the Disney pill on `/paths`
- [ ] Every link opens a new tab; the hub page stays open; external icon visible
- [ ] `/spaces/does-not-exist` renders the not-found page
- [ ] Add a throwaway second collection record to `COLLECTIONS`, confirm `/spaces/<its-slug>` renders with no new code, then remove it (SC-005)
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` all pass
