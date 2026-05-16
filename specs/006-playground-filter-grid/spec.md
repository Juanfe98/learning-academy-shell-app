# Feature Specification: Playground Listing Page — Filter Grid

**Feature Branch**: `006-playground-filter-grid`
**Created**: 2026-05-15
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Find a challenge by keyword (Priority: P1)

A user lands on the Playground page with 20+ challenges visible. They know they want to practice something related to "hooks" or "search" but don't know the exact challenge name. They type in the search box and the visible cards narrow in real time.

**Why this priority**: Search is the most universal navigation tool when a list grows beyond ~10 items. Delivers immediate value with no setup.

**Independent Test**: Navigate to `/playground`, type "hook" in the search input — only challenges whose title or tags include "hook" should be visible. Clearing the input restores all cards.

**Acceptance Scenarios**:

1. **Given** the user is on `/playground`, **When** they type "hook" in the search input, **Then** only challenges with "hook" in title or tags are shown, and the count label updates.
2. **Given** active search "hook", **When** the user clears the input, **Then** all challenges are shown again.
3. **Given** search produces zero matches, **When** filters are applied, **Then** an empty state message reads "No challenges match your filters."

---

### User Story 2 — Filter by difficulty (Priority: P2)

A user is preparing for a junior-level interview and wants to see only Beginner and Intermediate challenges. They tap two difficulty pills to enable both, and the grid immediately shows only matching challenges.

**Why this priority**: Difficulty is the primary signal for "what is appropriate for me right now." Multi-select pill UI is fast to operate and visually communicates active state clearly.

**Independent Test**: On `/playground`, click the "Intermediate" pill — only intermediate challenges visible. Click "Advanced" as well — both intermediate and advanced challenges visible. Click "Intermediate" again to deselect — only advanced visible.

**Acceptance Scenarios**:

1. **Given** no difficulty filter active, **When** the user clicks "Beginner", **Then** only beginner challenges are shown.
2. **Given** "Beginner" is active, **When** the user also clicks "Advanced", **Then** beginner AND advanced challenges are shown (multi-select OR logic).
3. **Given** all three pills active, **When** the user clicks one to deselect, **Then** that difficulty is removed from the filter.
4. **Given** all pills deselected, **When** no difficulty filter is active, **Then** all challenges are shown (same as no filter).

---

### User Story 3 — Share a filtered view via URL (Priority: P3)

A user has found a useful filtered view (e.g., search="search", difficulty=intermediate+advanced) and wants to share it with a colleague. They copy the URL and send it. The colleague opens it and sees the same filtered state immediately.

**Why this priority**: URL persistence makes the tool collaborative. It also allows bookmarking personal study lists. Valuable but not blocking the core filtering experience.

**Independent Test**: Apply search "api" and select "Advanced". Copy the URL. Open a new tab and paste it. The new tab should show the same filtered state with search "api" and difficulty "Advanced" active.

**Acceptance Scenarios**:

1. **Given** search "api" and difficulty "Advanced" active, **When** the user copies the page URL, **Then** the URL contains query params encoding both filters.
2. **Given** a URL with encoded filters, **When** opened in a new tab, **Then** the search input is pre-filled and the correct difficulty pills are highlighted on load.
3. **Given** a URL with a filter that matches no challenges, **When** opened, **Then** the empty state message is shown (filters load correctly even with zero results).
4. **Given** a URL with invalid/unknown filter values, **When** opened, **Then** invalid params are silently ignored and the page loads with no filter active.

---

### Edge Cases

- Search with special characters (e.g., `+`, `#`) must not break the URL encoding or cause errors.
- Navigating away and pressing Back must restore the filtered state (browser history handles this naturally with URL params).
- When all difficulty pills are deselected, behavior is equivalent to "show all" — not "show none".
- Challenge count label must reflect the filtered count, not the total registry size.
- If a challenge has no tags, it can still match via title search; absence of tags does not exclude it.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Playground listing page MUST display challenges in a responsive 2-column card grid. Cards include a description snippet so taller card height makes 3 columns too cramped.
- **FR-002**: Each challenge card MUST display: title, a truncated description (max 2 lines, clipped with ellipsis), difficulty badge, environment badge (TS / JS), and a maximum of 3 tag pills. Additional tags beyond 3 are not shown.
- **FR-003**: The page MUST include a text search input that filters visible cards in real time by matching the challenge title or any of its tags (case-insensitive).
- **FR-004**: The page MUST include difficulty filter pills for "Beginner", "Intermediate", and "Advanced" supporting multi-select. When multiple pills are active, challenges matching any selected difficulty are shown (OR logic).
- **FR-005**: When no difficulty pills are active, all challenges are shown regardless of difficulty.
- **FR-006**: Active filter state (search query and selected difficulties) MUST be encoded in the page URL as query parameters so the filtered view can be shared or bookmarked.
- **FR-007**: On page load, filter state MUST be initialised from URL query parameters. Unknown or malformed parameter values MUST be silently ignored.
- **FR-008**: A count label MUST be visible showing "X of Y challenges" where X is the filtered count and Y is the total.
- **FR-009**: When filters produce zero results, an empty state message MUST be displayed ("No challenges match your filters.") instead of a blank grid.
- **FR-010**: Each card MUST remain a navigable link to the individual challenge page (`/playground/[slug]`).
- **FR-011**: Clearing all filters (empty search + no difficulty selected) MUST restore the full challenge list and update the URL to remove filter params.

### Key Entities

- **Challenge** (read-only, from registry): slug, title, difficulty (`beginner | intermediate | advanced`), environment (`react-js | react-ts | node-ts`), tags (string array).
- **FilterState**: search (string), difficulties (set of selected difficulty values). Derived from and synced to URL query params.
- **FilteredList**: computed view of the challenge registry after applying FilterState — derived, never stored separately.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can locate a specific challenge by typing a keyword and see results within the same render cycle (no debounce required at this data scale).
- **SC-002**: A user can apply difficulty filters and share the resulting URL — the recipient sees an identical filtered view on first load.
- **SC-003**: The grid layout shows 2 challenges per row on a standard laptop screen (≥1024px viewport), with cards tall enough to display truncated description without clipping other elements.
- **SC-004**: Applying or clearing any filter updates the URL without a full page reload (no navigation flash).
- **SC-005**: Empty state message appears correctly when filters exclude all challenges — no broken layout or invisible grid.

---

## Assumptions

- Challenge data is static at page load time — no real-time updates or server-side search needed; all filtering is client-side.
- The hub shell layout (sidebar + top bar) remains unchanged; this feature only affects the content area of `/playground`.
- URL query parameter names are: `q` for search text, `d` for difficulty (comma-separated or repeated params for multi-select).
- Description is shown truncated to 2 lines on the card to help users judge relevance before opening a challenge.
- Tag overflow beyond 3 visible pills shows nothing (no "+N more" badge required in v1 — tags are supplementary).
- 2-column layout chosen over 3-column because cards include a description snippet, making taller cards necessary. 3 columns at that height would produce unreadable narrow cards.
- Mobile layout (single column) is acceptable out of scope; primary target is desktop/laptop viewport.
- The environment badge ("TS" pill) is retained from the current design and is not a filter control in this version.
