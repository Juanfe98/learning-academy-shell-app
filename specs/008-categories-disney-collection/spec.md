# Feature Specification: Academy Categories & Disney Collection

**Feature Branch**: `008-categories-disney-collection`
**Created**: 2026-11-06
**Status**: Draft
**Input**: User description: "Organize the hub: add an academy category taxonomy to the Learning Paths page and introduce a data-driven collection section with Disney as the first collection."

---

## Context

The hub catalogue has grown to 19 academies shown in one flat grid whose only filter is All / Available / Coming Soon. Five of those academies were built from Disney's real codebases and are a different kind of content from general technology courses, yet they sit beside them with no distinction. There is no notion of category anywhere in the catalogue, and there is no single place that gathers everything Disney-related (academies, the Disney job target, related general paths, external work systems).

This feature does two things that solve two different problems:

1. **Categories** organize the whole catalogue so every academy belongs to one of five groups.
2. **Collections** give a curated front door to a theme. Disney is the first and only collection in this feature, but the mechanism is generic so a future collection is a data entry, not a new page.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Learning Paths by category (Priority: P1)

Juan opens Learning Paths and sees a row of category pills: All, Fundamentals, Frontend, Backend & Systems, Platform & Ops, Disney, each with a count. He taps Disney and the grid narrows to the five Disney academies. He taps Frontend and sees only frontend academies. Coming-soon academies still show their coming-soon state on their card wherever they appear.

**Why this priority**: This is the direct fix for "my items are not categorized". It touches every academy and is valuable on its own even if nothing else ships.

**Independent Test**: Open `/paths`, click each pill in turn, and confirm the visible cards match the category table in Assumptions. The counts on the pills add up to the All count.

**Acceptance Scenarios**:

1. **Given** Learning Paths is open with no pill selected, **When** the page loads, **Then** the All pill is active and every catalogue academy is shown.
2. **Given** the All pill is active, **When** Juan clicks Disney, **Then** exactly the five Disney academies are shown and the Disney pill reads 5.
3. **Given** the Disney pill is active, **When** Juan clicks All, **Then** every academy is shown again.
4. **Given** a category contains a coming-soon academy, **When** that category is selected, **Then** the academy is listed with its coming-soon state visible on the card.
5. **Given** any pill is active, **When** Juan types in the search box, **Then** the pills hide and search results span all academies regardless of the previously selected pill, exactly as search behaves today.
6. **Given** search is cleared, **When** the pills reappear, **Then** the previously selected pill is still active.

---

### User Story 2 — Open the Disney collection from the sidebar (Priority: P1)

Juan sees a Disney entry in the sidebar. He clicks it and lands on a Disney page with a header (icon, title, description, summary counts) and the five Disney academies in a deliberate order, each showing his progress.

**Why this priority**: This is the "new option for Disney resources" that Juan asked for. Together with Story 1 it is the minimum viable release.

**Independent Test**: From any hub page, click Disney in the sidebar. Confirm the page shows the five Disney academies in the order defined in Assumptions, with the same progress percentage each academy shows on Learning Paths.

**Acceptance Scenarios**:

1. **Given** any hub page, **When** Juan clicks Disney in the sidebar, **Then** the Disney collection page opens and the Disney sidebar entry is highlighted as active.
2. **Given** the Disney page is open, **When** it renders, **Then** the five Disney academies appear in the defined order with title, icon, module count, hours and progress.
3. **Given** Juan has completed modules in growth-life-client-api Mastery, **When** he opens the Disney page, **Then** the progress shown for that academy equals the progress shown on Learning Paths and Dashboard.
4. **Given** the sidebar is collapsed to icons, **When** Juan hovers the Disney icon, **Then** its label is shown as a tooltip, matching the other entries.
5. **Given** the mobile drawer is open, **When** Juan taps Disney, **Then** the collection page opens and the drawer closes.
6. **Given** Juan clicks an academy card on the Disney page, **Then** he lands on that academy's path overview, the same destination as from Learning Paths.

---

### User Story 3 — Reach the Disney job target and related paths from the collection (Priority: P2)

Below the academies, Juan sees a card for the Disney Staff Engineer job target showing its current status, and a "Related paths" rail with Kubernetes Mastery and Datadog Mastery, which are general academies he studies because of Disney work.

**Why this priority**: These make the Disney page a complete front door rather than a filtered list, but the page is already useful without them.

**Independent Test**: On the Disney page, click the job target card and confirm it opens the existing Disney Staff Engineer page. Confirm the related rail shows exactly Kubernetes and Datadog with progress, and that they are not counted among the Disney academies.

**Acceptance Scenarios**:

1. **Given** the Disney page is open, **When** Juan clicks the job target card, **Then** he lands on the existing Disney Staff Engineer job target page.
2. **Given** the Disney page is open, **When** it renders, **Then** the job target card shows company, role and the same status label shown on the Job Targets page.
3. **Given** the Disney page is open, **When** it renders, **Then** a section titled "Related paths" lists Kubernetes Mastery and Datadog Mastery with progress, visually separated from the Disney academies.
4. **Given** the Disney pill on Learning Paths is active, **Then** Kubernetes and Datadog are not included, because related paths do not change an academy's category.

---

### User Story 4 — Jump to Disney work systems from the collection (Priority: P2)

At the bottom of the Disney page, Juan sees external links grouped by kind: Jira, Confluence, Repos, Dashboards. Each link opens in a new tab so the hub stays open.

**Why this priority**: Replaces browser bookmarks with a curated list in context. Low effort, modest value, and the page is complete without it.

**Independent Test**: Click each link and confirm a new tab opens with the hub page still present. Confirm groups with no links are not rendered.

**Acceptance Scenarios**:

1. **Given** the Disney page is open, **When** it renders, **Then** links are shown under their group heading with a title and an optional one-line description.
2. **Given** any link, **When** Juan clicks it, **Then** it opens in a new tab and the hub page remains unchanged.
3. **Given** a link group has no links, **When** the page renders, **Then** that group heading is not shown.
4. **Given** the collection has no links at all, **When** the page renders, **Then** the links section is absent and the layout has no empty gap.

---

### User Story 5 — See the Home page grouped by category (Priority: P3)

The Home page's academy section shows academies under category headings in the same order as the Learning Paths pills, instead of one undifferentiated grid.

**Why this priority**: Consistency with Story 1. Nice to have; Home remains usable without it.

**Independent Test**: Open Home and confirm the academies section shows one heading per non-empty category, in pill order, with the same academy membership as Learning Paths.

**Acceptance Scenarios**:

1. **Given** Home is open, **When** the academies section renders, **Then** academies are grouped under category headings in pill order.
2. **Given** a category has no academies, **When** Home renders, **Then** that heading is omitted.

---

### Edge Cases

- Every academy in the catalogue must belong to exactly one category; a missing category must be caught before the app runs, never shown as an uncategorized card.
- A category with zero academies is not offered as a pill and has no Home heading, so there are no dead-end views.
- The sum of per-category counts always equals the All count; a coming-soon academy counts once in its category.
- A collection that references an academy or job target that does not exist must skip that entry and still render the rest of the page.
- A collection slug that does not exist must show the hub's standard not-found behaviour, not a blank page.
- Progress values must appear only once local progress has loaded; a card must not briefly show a wrong value and then correct itself.
- Stale progress data from older versions of the hub (missing module records) must not break the collection page.
- Academies that already live only under Job Targets (the job-prep academies) are not part of the catalogue and are unaffected by categories.
- The Disney academies remain searchable from Learning Paths; adding them to a collection does not remove them from anywhere.

---

## Requirements *(mandatory)*

### Functional Requirements

**Categories**

- **FR-001**: Every academy in the discovery catalogue MUST belong to exactly one category from the fixed set: Fundamentals, Frontend, Backend & Systems, Platform & Ops, Disney.
- **FR-002**: Learning Paths MUST show a filter row with an All pill followed by one pill per category that has at least one academy, in the fixed order above, each pill showing its academy count.
- **FR-003**: Selecting a category pill MUST show only that category's academies; All MUST show every catalogue academy. All is the default on page load.
- **FR-004**: The Available and Coming Soon tabs MUST be removed. Coming-soon academies MUST remain visible in All and in their category with their coming-soon state shown on the card.
- **FR-005**: Search on Learning Paths MUST behave as today: typing hides the pills and searches every academy; clearing restores the pills with the previously selected pill still active.
- **FR-006**: The summary counts in the Learning Paths header (paths, modules, hours) MUST continue to reflect the whole catalogue, not the selected pill.
- **FR-007**: The Home page academies section MUST group academies under category headings in pill order, omitting empty categories.

**Collections**

- **FR-008**: A collection MUST be a data record with: slug, title, icon, accent colour, description, an ordered list of academy slugs, an ordered list of related academy slugs, a list of job target slugs, and a list of link groups. Each link group has a label and a list of links; each link has a title, a destination, and an optional description.
- **FR-009**: Collections MUST render through one generic collection page addressed by the collection slug. Adding a new collection MUST require only a new data record and a sidebar entry; no new page or component.
- **FR-010**: Requesting a collection slug that does not exist MUST produce the hub's standard not-found response.
- **FR-011**: The collection page MUST show a header with the collection's icon, title, description, and summary counts of academies, modules and hours for the collection's own academies.
- **FR-012**: The collection page MUST list the collection's academies in the record's order using the same card treatment as Learning Paths, including progress, and each card MUST link to the academy's path overview.
- **FR-013**: When the collection lists job targets, the page MUST show one card per job target with company, role and current status label, linking to that job target's existing page.
- **FR-014**: When the collection lists related academies, the page MUST show them in a section titled "Related paths", visually separated from the collection's own academies, with the same card treatment and progress.
- **FR-015**: When the collection lists links, the page MUST show them grouped under their group label; every link MUST open in a new tab and be visibly marked as external. Empty groups and an empty links section MUST not render.
- **FR-016**: References to academies or job targets that cannot be resolved MUST be skipped silently without breaking the page.
- **FR-017**: Progress shown on the collection page MUST be read from the existing progress data and MUST match what Learning Paths and Dashboard show for the same academy. The stored progress shape MUST NOT change.

**Disney collection and navigation**

- **FR-018**: The hub MUST ship one collection with slug `disney`, titled "Disney", whose academies are, in order: growth-life-client-api Mastery, commerce-base Foundations, Hulu Architecture, ESPN Architecture, Server-Driven UI Lab; whose related academies are Kubernetes Mastery and Datadog Mastery; whose job target is Disney Staff Engineer; and whose link groups are Jira, Confluence, Repos and Dashboards.
- **FR-019**: The sidebar MUST include an entry labelled "Disney" in both the desktop sidebar and the mobile drawer, opening the Disney collection page and highlighted as active while on that page.
- **FR-020**: The five Disney academies MUST keep their place in Learning Paths under the Disney category and in search.

### Key Entities

- **Academy Category**: one of five fixed values with a display label and a display order. Every catalogue academy carries exactly one.
- **Academy** (existing): gains a category. No other change.
- **Collection**: a curated theme. Attributes: slug, title, icon, accent colour, description, ordered academy slugs, ordered related academy slugs, job target slugs, link groups.
- **Link Group**: a label (for example "Jira") and an ordered list of external links.
- **External Link**: title, destination, optional one-line description.
- **Job Target** (existing, read-only here): referenced by slug for the job target card.
- **Progress** (existing, read-only here): academy and module completion used for progress display. Shape unchanged.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From Learning Paths, Juan can isolate the Disney academies in one click, and the result contains exactly those five academies.
- **SC-002**: From any hub page, the Disney collection is reachable in one click from the sidebar on desktop and in two taps on mobile (open drawer, tap Disney).
- **SC-003**: Every one of the 19 catalogue academies appears under exactly one category pill, and the category counts sum to the All count.
- **SC-004**: For an academy with completed modules, the progress percentage is identical on Learning Paths, Dashboard and the Disney collection page.
- **SC-005**: A second collection can be added by writing one data record and one sidebar entry, with no new page or component; demonstrated by adding a throwaway record during review and removing it.
- **SC-006**: Every external link on the Disney page opens in a new tab with the hub page still open behind it.
- **SC-007**: No existing page changes behaviour outside the academies section of Home, the filter row of Learning Paths, and the sidebar entry list.

---

## Assumptions

- **Category assignment** for the current catalogue:

  | Category | Academies |
  |---|---|
  | Fundamentals | Web Fundamentals, TypeScript Mastery, Python Mastery |
  | Frontend | React Deep Dive, Next.js Mastery, Web Components, Design Systems, Apollo GraphQL, GraphQL Core (coming soon) |
  | Backend & Systems | Node.js Mastery, Express.js & Backend Engineering, System Design & AWS |
  | Platform & Ops | Kubernetes Mastery, Datadog Mastery |
  | Disney | growth-life-client-api Mastery, commerce-base Foundations, Hulu Architecture, ESPN Architecture, Server-Driven UI Lab |

- "Disney" means built from Disney code or about Disney's stack. Kubernetes and Datadog were studied for Disney work but are general skills, so they stay in Platform & Ops and appear on the Disney page only as related paths.
- The job-prep academies (Disney Staff Engineer, GoDaddy, Indeed) are reachable only through Job Targets today and that does not change.
- The Disney sidebar entry sits directly below Learning Paths. The grouped sidebar (Home/Dashboard, Learn, Work, Career) is a separate later feature and may move it.
- The collection page lives under a generic path keyed by collection slug (for example `/spaces/disney`). The exact path segment is an implementation choice.
- The initial link list is seeded with the systems Juan uses (Jira boards for GCIEX and GREAT, the Confluence space, the growth-life-client-api, cgi-web, growth-life-client-templates, Growth-Life-Orchestrator and commerce-base repositories, Datadog dashboards) and finalized by Juan during implementation. Links whose destination is not yet known are left out rather than shown broken.
- Link destinations are Disney-internal addresses. The hub repository is assumed private; Juan confirms this before internal addresses are committed.
- Category pills on Learning Paths are single-select. Multi-select is not needed with five categories.
- Selected category is page state only; it is not persisted or encoded in the address.
- Progress display reuses the existing progress data and mounted-guard conventions; nothing new is stored.

## Out of Scope

- Hosting, copying, or serving local HTML research pages from the Disney repositories. If a topic from those pages is ever wanted in the hub, it is rebuilt as proper academy content.
- Rendering markdown notes (glossary, ticket dossiers).
- Ticket lists or Jira-backed data.
- The grouped sidebar reorganization.
- Changes to the progress data shape, the content viewer, Playground, Interview Prep, or Job Targets.
