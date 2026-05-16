# UI Component Contracts: Playground Filter Grid

## ChallengeFilterGrid

**File**: `src/components/hub/playground/ChallengeFilterGrid.tsx`
**Directive**: `"use client"`

```ts
interface ChallengeFilterGridProps {
  challenges: Challenge[];  // full registry list, passed from Server Component
}
```

**Responsibilities**:
- Reads `q` and `d[]` from `useSearchParams()`
- Computes `filteredChallenges` inline
- Renders search input, difficulty pills, count label, and 2-column grid
- On filter change: calls `router.replace()` with updated URL params
- Renders `ChallengeCard` for each filtered challenge

**Does NOT own**:
- Navigation to individual challenges (delegated to `ChallengeCard`)
- Data fetching (data comes in as prop)

---

## ChallengeCard

**File**: `src/components/hub/playground/ChallengeCard.tsx`
**Directive**: none (Server-compatible, no hooks)

```ts
interface ChallengeCardProps {
  challenge: Challenge;
}
```

**Renders**:
- `<Link href="/playground/[slug]">` wrapper
- Title (`font-semibold`, `text-sm`)
- Description (`line-clamp-2`, `text-xs`)
- Right-side badges: env badge (TS/JS) + difficulty `<Badge>`
- Up to 3 tag pills using existing inline style from current `page.tsx`

**Does NOT own**:
- Filter state or interaction
- Active/selected visual state

---

## DifficultyPills (inline, no separate file needed)

Rendered inline inside `ChallengeFilterGrid`. Three pill buttons:

```ts
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
```

- Active state: `d` array from URL contains the value
- Click: toggle value in `d` array → `router.replace()`
- Visual: active pill uses `--accent-primary` background, inactive uses `--bg-elevated` border

---

## page.tsx (updated)

**File**: `src/app/(hub)/playground/page.tsx`
**Remains**: Server Component

```ts
// Passes serializable challenge list to client component
<ChallengeFilterGrid challenges={CHALLENGE_REGISTRY} />
```

Container width changes from `max-w-3xl` → `max-w-5xl`.

---

## URL contract

| Param | Values | Example |
|---|---|---|
| `q` | any string, URL-encoded | `?q=api+fetching` |
| `d` | repeated, one of `beginner\|intermediate\|advanced` | `?d=intermediate&d=advanced` |

Unknown `d` values are silently ignored on parse. Empty `q` param is treated the same as absent `q`.
