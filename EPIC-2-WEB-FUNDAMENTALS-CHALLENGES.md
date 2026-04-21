# Epic 2 — Web Fundamentals: Challenges

## Depends on
Epic 1 complete (types, data files, routing dispatch, module/lesson pages exist).

## Goal

Build the challenge experience: a detail page that presents a structured
challenge (requirements, hints, expected result) alongside a static code
reference block. No live execution yet — that's Epic 3. The focus here is
content and UX: how challenges are browsed, presented, and marked complete.

---

## New Components

### `ChallengePage`
Route: `/learn/web-fundamentals/challenge/[id]`  
Dispatch: `slug = ["challenge", "center-a-div"]`

Layout:
```
┌─────────────┬────────────────────────────────────┐
│ WFLearnSide │  Challenge Header                  │
│ bar         │  ─────────────────────────────────  │
│             │  Description + Requirements        │
│             │  ─────────────────────────────────  │
│             │  Starter Code (read-only block)    │
│             │  ─────────────────────────────────  │
│             │  Expected Result (prose + visual)  │
│             │  ─────────────────────────────────  │
│             │  Hints (collapsed by default)      │
│             │  ─────────────────────────────────  │
│             │  Bonus Tasks                       │
│             │  ─────────────────────────────────  │
│             │  "Open in Playground" (Epic 3)     │
│             │  "Mark Complete" button            │
└─────────────┴────────────────────────────────────┘
```

**Hint UX:** Each hint is hidden behind a "Reveal Hint N" button. Clicking
reveals it with a subtle animation. Once revealed it stays visible (no
re-hide needed). State is local (`useState`) — hints don't need persistence.

**Mark Complete:** Calls `markModuleComplete(academySlug, challengeId)` from
the progress store. Visual feedback: button turns green + checkmark.

**"Open in Playground" button:** Rendered but disabled in Epic 2, with a
tooltip "Coming in the next update." Enabled in Epic 3.

---

## Challenge Content (Epic 2 fills these in)

### Module 1 — HTML Foundations
- `semantic-blog-post` (easy) — Mark up a blog post using correct semantic elements

### Module 2 — Forms & Accessibility  
- `accessible-login-form` (medium) — Build a login form meeting WCAG AA basics

### Module 3 — CSS Foundations
- `specificity-debugger` (easy) — Fix a broken stylesheet by correcting specificity conflicts

### Module 4 — Display & Positioning
- `sticky-header` (medium) — Build a sticky nav that stays at the top while content scrolls

### Module 5 — Flexbox
- `navbar-layout` (easy) — Logo left, links center/right using flexbox only
- `card-row` (medium) — Equal-height cards that wrap gracefully

### Module 6 — CSS Grid
- `dashboard-layout` (hard) — Sidebar + main content + footer using CSS Grid
- `responsive-card-grid` (medium) — Auto-fitting card grid with `auto-fill` + `minmax`

### Module 7 — Responsive Design
- `mobile-first-hero` (medium) — Hero section that looks good at 375px and 1280px

### Module 8 — Visual UI
- `button-system` (easy) — Three button variants (primary, secondary, danger) with hover/focus states

### Module 9 — Transitions & Animations
- `smooth-modal` (medium) — Modal that fades in/slides up on open, reverses on close

### Module 10 — Interview Challenges (all challenges, no lessons)
- `center-a-div` (easy)
- `two-column-sidebar` (easy)
- `full-bleed-section` (medium)
- `sticky-footer` (medium)
- `tooltip` (medium)
- `pricing-cards` (medium)
- `holy-grail-layout` (hard)
- `responsive-table` (hard)
- `custom-checkbox` (medium)
- `image-gallery-grid` (hard)

---

## `ModuleOverviewPage` updates (from Epic 1)

In Epic 1, challenge cards on the module overview page are disabled stubs.
In Epic 2, they become live links to the challenge detail page.

Challenge card shows:
- Title
- Difficulty badge (color-coded: green/yellow/red)
- `conceptsCovered` tags (first 3, overflow hidden)
- "Start Challenge" button

---

## Progress tracking for challenges

`markModuleComplete("web-fundamentals", "challenge/center-a-div")` — uses
the existing store. The module overview page computes:
```
completedChallenges = challenges.filter(c => isCompleted(`challenge/${c.id}`))
```

A "Challenges completed" counter is shown on each module card on the paths
page sidebar (optional — can be a simple `X/Y` badge).

---

## Files to Create/Modify

### New files
1. `src/components/hub/learn/wf/ChallengePage.tsx`
2. Fill all 10 `src/modules/web-fundamentals/data/XX-*.ts` files with full challenge content

### Modified files
3. `src/components/hub/learn/wf/ModuleOverviewPage.tsx` — enable challenge cards
4. `src/app/(hub)/learn/[academy]/[...slug]/page.tsx` — add `challenge` case to dispatch

---

## Implementation Steps

1. Fill challenge data in all 10 module data files
2. Write `ChallengePage.tsx` with hint reveal + mark complete
3. Update dispatch in content viewer — add `challenge` case
4. Enable challenge cards on `ModuleOverviewPage`
5. `pnpm build` — zero errors
6. Verify: challenge opens, hints reveal one at a time, mark complete persists across reload
