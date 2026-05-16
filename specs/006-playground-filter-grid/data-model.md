# Data Model: Playground Filter Grid

## Entities

### Challenge (read-only, from existing `Challenge` type in `src/lib/challenges/types.ts`)

No new fields. The existing type is the source of truth.

Relevant fields consumed by this feature:

| Field | Type | Used for |
|---|---|---|
| `slug` | `string` | Card href → `/playground/[slug]` |
| `title` | `string` | Card heading + search match |
| `description` | `string` | Card body (2-line clamp) |
| `difficulty` | `"beginner" \| "intermediate" \| "advanced"` | Difficulty filter + badge |
| `environment` | `"react-js" \| "react-ts" \| "node-ts"` | Env badge (TS/JS label) |
| `tags` | `string[]` | Tag pills (max 3 shown) + search match |

---

### FilterState (derived, not stored — lives in URL params)

| Param | Type | URL encoding | Default |
|---|---|---|---|
| `q` | `string` | `?q=search+text` | `""` (no search) |
| `d` | `string[]` | `?d=intermediate&d=advanced` | `[]` (all difficulties shown) |

Computed from `useSearchParams()` on every render. Written via `router.replace()` on user interaction.

---

### FilteredList (derived, not stored)

Computed inline from `Challenge[]` + `FilterState`:

1. **Search filter**: keep challenges where `title.toLowerCase()` or any `tag.toLowerCase()` includes `q.toLowerCase()`. Skip if `q` is empty.
2. **Difficulty filter**: keep challenges where `difficulty` is in the `d` set. Skip if `d` is empty (show all).
3. No sort — registry insertion order is the display order (most recently added challenges appear last).

---

## State transitions

```
URL loads / param changes
        │
        ▼
useSearchParams() → { q, d[] }
        │
        ▼
Filter Challenge[] → FilteredList
        │
        ▼
Render ChallengeCard for each item

User types in search input
        │
        ▼
router.replace(?q=new+value&d=...)
        │
        ▼  (re-render, back to top)

User clicks difficulty pill
        │
        ▼
Toggle d value → router.replace(...)
        │
        ▼  (re-render, back to top)
```
