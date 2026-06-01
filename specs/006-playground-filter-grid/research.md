# Research: Playground Filter Grid

## Decision 1 — Client/Server component split

**Decision**: `page.tsx` stays a Server Component. It reads `CHALLENGE_REGISTRY` and passes the full list as a `challenges: Challenge[]` prop to a new `"use client"` component (`ChallengeFilterGrid`).

**Rationale**: `useSearchParams()` and `useRouter()` are client-only hooks. The challenge registry is static data — no benefit from fetching it on the client. Keeping the Server Component as the data source follows the existing hub pattern.

**Alternatives considered**: Making `page.tsx` itself a Client Component — rejected because it loses server rendering and breaks the existing App Router convention used throughout the hub.

---

## Decision 2 — URL param encoding

**Decision**: `q` for search text, `d` for difficulty (repeated param per selected value, e.g. `?d=intermediate&d=advanced`).

**Rationale**: Repeated params are the idiomatic way to encode multi-value filters in URLs. They avoid comma-splitting edge cases and are natively parsed by `URLSearchParams.getAll('d')`. `q` is the universal convention for search queries.

**Alternatives considered**: Comma-separated `d=intermediate,advanced` — rejected because it requires manual splitting and encoding.

---

## Decision 3 — Filter state management

**Decision**: Filter state is derived directly from `useSearchParams()` on every render — no `useState` for filter values. Updates call `router.replace(newUrl)` which triggers a re-render with the new params.

**Rationale**: Single source of truth is the URL. Avoids state sync bugs between local state and URL. The data set is small (20–50 challenges) so recomputing the filtered list on every render is negligible.

**Alternatives considered**: `useState` mirrored to URL — rejected because it introduces a two-way sync problem and potential stale state.

---

## Decision 4 — Filtered list computation

**Decision**: Plain `Array.filter` + `Array.filter` chain computed inline in the Client Component render. No `useMemo` needed at this data scale.

**Rationale**: 20–50 items filtered with string operations costs microseconds. `useMemo` would add complexity for zero measurable benefit.

**Alternatives considered**: `useMemo` — deferred; can be added later if registry grows to hundreds.

---

## Decision 5 — Tag display cap

**Decision**: Show max 3 tags per card. Tags beyond 3 are silently omitted (no "+N" indicator in v1).

**Rationale**: Cards already show title + description + badges. A "+N" badge adds visual complexity for minimal value — the full tag list is visible once the challenge is opened.

---

## Decision 6 — Difficulty pill "all deselected" behaviour

**Decision**: Zero selected difficulties = no difficulty filter (show all). This is more intuitive than "zero selected = show nothing".

**Rationale**: Matches standard faceted-search conventions (e.g., e-commerce filter panels). Users who want to see everything just clear the selection.
