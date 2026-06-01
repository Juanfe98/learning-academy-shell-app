# Developer Quickstart: Playground Filter Grid

## What changes

| File | Change type |
|---|---|
| `src/app/(hub)/playground/page.tsx` | Modify — widen container, delegate rendering to `ChallengeFilterGrid` |
| `src/components/hub/playground/ChallengeFilterGrid.tsx` | **New** — client component, owns filter state + grid |
| `src/components/hub/playground/ChallengeCard.tsx` | **New** — presentational card, extracted from current inline markup |

Nothing else changes. No new dependencies. No store changes.

---

## Key implementation notes

### 1. Server → Client boundary

`page.tsx` passes `CHALLENGE_REGISTRY` directly as a prop. `Challenge[]` is serializable (no functions in the array at the list level — `component` factory lives on individual registry entries but is not passed here; only the metadata fields needed for display are used).

Actually: `Challenge` type includes `files: ChallengeFile[]` with `content: string` — large strings. Pass a slimmed prop type or just the full array (Next.js serializes it fine, it's just JSON).

### 2. URL param helpers

```ts
// Read
const searchParams = useSearchParams();
const q = searchParams.get("q") ?? "";
const difficulties = new Set(searchParams.getAll("d"));

// Write
const router = useRouter();

function updateParams(patch: { q?: string; d?: string[] }) {
  const params = new URLSearchParams(searchParams.toString());
  if (patch.q !== undefined) {
    patch.q ? params.set("q", patch.q) : params.delete("q");
  }
  if (patch.d !== undefined) {
    params.delete("d");
    patch.d.forEach((v) => params.append("d", v));
  }
  router.replace(`?${params.toString()}`, { scroll: false });
}
```

### 3. Filter logic

```ts
const filtered = challenges.filter((c) => {
  const matchesSearch =
    !q ||
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    c.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));

  const matchesDifficulty =
    difficulties.size === 0 || difficulties.has(c.difficulty);

  return matchesSearch && matchesDifficulty;
});
```

### 4. Grid layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {filtered.map((c) => <ChallengeCard key={c.slug} challenge={c} />)}
</div>
```

### 5. ChallengeCard tag cap

```tsx
{challenge.tags.slice(0, 3).map((tag) => (
  <span key={tag} ...>{tag}</span>
))}
```

---

## Test checklist (manual)

- [ ] `/playground` loads with all challenges in 2-column grid
- [ ] Typing in search narrows cards in real time; URL updates to `?q=...`
- [ ] Clearing search restores all cards; `q` param removed from URL
- [ ] Clicking "Intermediate" pill shows only intermediate; URL `?d=intermediate`
- [ ] Clicking "Advanced" too shows both; URL `?d=intermediate&d=advanced`
- [ ] Clicking active pill deselects it; URL updates
- [ ] Zero matching filters shows empty state message
- [ ] Count label reflects filtered vs total count
- [ ] Copying URL and opening in new tab restores exact filter state
- [ ] Invalid `d` values in URL are ignored; page loads cleanly
- [ ] Each card links correctly to `/playground/[slug]`
- [ ] `pnpm build` passes with no TypeScript errors
