# Epic 1 — Web Fundamentals: Foundation + Content Architecture

## Goal

Rebuild the `web-fundamentals` academy from 5 flat prose modules into a
10-module structured learning path with real lesson content. This epic
delivers everything a user needs to browse and read — no playground, no
challenges yet.

---

## Key Architectural Decisions

### 1. Content model: data files, not TSX components

The new content model is **data-driven**, not component-driven.  
Lessons are plain TypeScript objects (`Lesson[]`) stored in static data files.
Generic React components (`LessonPage`, `ModuleOverviewPage`) consume that
data and render it. This keeps content fully editable without touching JSX.

```
src/modules/web-fundamentals/
  data/
    types.ts          ← Lesson, Challenge, LearningModule types
    01-html-foundations.ts
    02-forms-accessibility.ts
    03-css-foundations.ts
    04-display-positioning.ts
    05-flexbox.ts
    06-css-grid.ts
    07-responsive-design.ts
    08-visual-ui.ts
    09-transitions-animations.ts
    10-interview-challenges.ts
    index.ts          ← combines all modules, exports lookup fns
  manifest.ts         ← AcademyManifest (10 module-level routes)
```

Components that render this data:
```
src/components/hub/learn/wf/
  ModuleOverviewPage.tsx   ← grid of lessons + challenges for one module
  LessonPage.tsx           ← full lesson: objectives, explanation, examples, tips
  WFLearnSidebar.tsx       ← sidebar: module list + current module's lessons
```

### 2. Routing: slug dispatch in the content viewer

The existing `[...slug]` catch-all is extended. The content viewer gets a
new early-exit block for `web-fundamentals` that dispatches on `slug[0]`:

```
/learn/web-fundamentals/module/html-foundations  → slug = ["module", "html-foundations"]
/learn/web-fundamentals/lesson/block-model       → slug = ["lesson", "block-model"]
/learn/web-fundamentals/challenge/center-a-div   → slug = ["challenge", "center-a-div"]  (Epic 2)
/learn/web-fundamentals/playground               → slug = ["playground"]                 (Epic 3)
```

No new Next.js routes needed — everything flows through the existing
`/learn/[academy]/[...slug]/page.tsx`.

### 3. Registry manifest: 10 module-level routes

The manifest `component` factory for each module route is unused in this
new dispatch model, but we keep it to satisfy the `AcademyRoute` type (it
just returns an empty module object). The real rendering happens in the
dispatch block.

Alternatively: mark routes with `component: undefined` and update the
`AcademyRoute` type to `component?: ...`. This is cleaner but touches the
shared type — evaluate during implementation.

### 4. Progress tracking: lesson-level keys

Progress is tracked at the lesson slug level (`lesson/box-model`), using
the existing `markModuleVisited(academySlug, slug, title, minutes)`.
The store already supports arbitrary slug keys — no store changes needed.

### 5. `MOCK_ACADEMIES` entry for web-fundamentals

Updated to 10 module-level routes. Each route slug is `module/<id>`:
```ts
{ slug: "module/html-foundations", title: "HTML Foundations", order: 0, ... }
```
`moduleCount: 10`, `totalHours: ~14`.
`learningPath` lists the 10 module slugs in order.

`ModuleList` on the paths page shows 10 rows linking to the module overview
page for each. Soft-lock logic still applies (based on previous module
visited).

---

## Types (`src/modules/web-fundamentals/data/types.ts`)

```ts
export type Difficulty = "easy" | "medium" | "hard";

export interface CodeExample {
  title: string;
  description?: string;
  html?: string;
  css?: string;
  js?: string;
}

export interface PracticeTask {
  description: string;
  hint?: string;
}

export interface Lesson {
  id: string;               // kebab-case, unique across all lessons
  moduleId: string;         // parent module id
  title: string;
  summary: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  explanation: string;      // markdown-like prose (rendered as HTML via dangerouslySetInnerHTML with sanitization, or as JSX string blocks)
  codeExamples: CodeExample[];
  commonMistakes: string[];
  interviewTips: string[];
  practiceTasks: PracticeTask[];
}

export interface Challenge {
  id: string;
  moduleId: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  requirements: string[];
  starterHtml?: string;
  starterCss?: string;
  expectedResult: string;   // prose description of what a correct solution looks like
  hints: string[];
  bonusTasks: string[];
  conceptsCovered: string[];
}

export interface LearningModule {
  id: string;               // matches the slug suffix: "html-foundations"
  title: string;
  description: string;
  icon: string;
  order: number;
  estimatedHours: number;
  lessons: Lesson[];
  challenges: Challenge[];
}
```

> **Note on `explanation`:** Keep it as structured JSX in the data file (template literal strings with HTML tags) rendered via `dangerouslySetInnerHTML`. This avoids a markdown parser dependency while keeping content editable. Sanitize with DOMPurify on the client, or (simpler) render explanation as a React component factory in each data file — a function that returns JSX. Decide at implementation time; either works.

---

## Content Plan (Epic 1 scope)

All 10 modules are defined with metadata. The following have **full lesson content** in Epic 1:

| Module | Lessons (full) | Challenges (stub — Epic 2) |
|---|---|---|
| 1 — HTML Foundations | 3 | 1 stub |
| 2 — Forms & Accessibility | 2 | 1 stub |
| 3 — CSS Foundations | 3 | 1 stub |
| 4 — Display & Positioning | 2 | 1 stub |
| 5 — Flexbox | 3 | 1 stub |
| 6 — CSS Grid | 2 | 1 stub |
| 7 — Responsive Design | 2 | 1 stub |
| 8 — Visual UI Fundamentals | 1 | 1 stub |
| 9 — Transitions & Animations | 1 | 1 stub |
| 10 — Interview Challenges | 0 lessons | 10 challenge stubs |

Each full lesson includes: summary, objectives, explanation (~400 words),
2 code examples, 3 common mistakes, 3 interview tips, 2 practice tasks.

Module 10 is challenge-only — no lessons. Its content becomes Epic 2's
primary delivery.

---

## New Components

### `WFLearnSidebar`
- Lists all 10 modules in the sidebar
- When inside a module: shows that module's lessons + challenges as sub-items
- Highlights the current active lesson
- Replaces `LearnSidebar` for the web-fundamentals academy

### `ModuleOverviewPage`
- Hero: module title, description, estimated time, lesson count
- Lesson cards grid: title, summary, estimated minutes, "Start" button
- Challenge cards grid: title, difficulty badge, "Open Challenge" button (disabled in Epic 1 — Epic 2)
- Progress indicator: X of Y lessons visited (driven by progress store)

### `LessonPage`
- Left: `WFLearnSidebar`
- Center: lesson content in sections
  - Header: title, summary, estimated time
  - Learning objectives (checklist style)
  - Explanation (prose + inline code)
  - Code examples (syntax-highlighted blocks — plain `<pre><code>`)
  - Common mistakes (warning cards)
  - Interview tips (tip cards with accent color)
  - Practice tasks (checklist items, no interactivity in Epic 1)
- Right: ToC (using existing `TocItem` mechanism) — optional, can omit for Epic 1

---

## Files to Create/Modify

### New files
1. `src/modules/web-fundamentals/data/types.ts`
2. `src/modules/web-fundamentals/data/01-html-foundations.ts`
3. `src/modules/web-fundamentals/data/02-forms-accessibility.ts`
4. `src/modules/web-fundamentals/data/03-css-foundations.ts`
5. `src/modules/web-fundamentals/data/04-display-positioning.ts`
6. `src/modules/web-fundamentals/data/05-flexbox.ts`
7. `src/modules/web-fundamentals/data/06-css-grid.ts`
8. `src/modules/web-fundamentals/data/07-responsive-design.ts`
9. `src/modules/web-fundamentals/data/08-visual-ui.ts`
10. `src/modules/web-fundamentals/data/09-transitions-animations.ts`
11. `src/modules/web-fundamentals/data/10-interview-challenges.ts`
12. `src/modules/web-fundamentals/data/index.ts`
13. `src/modules/web-fundamentals/manifest.ts`
14. `src/components/hub/learn/wf/WFLearnSidebar.tsx`
15. `src/components/hub/learn/wf/ModuleOverviewPage.tsx`
16. `src/components/hub/learn/wf/LessonPage.tsx`

### Modified files
17. `src/lib/registry.ts` — swap mock-academy for new web-fundamentals manifest
18. `src/lib/mock-data.ts` — update web-fundamentals entry: 10 module routes
19. `src/app/(hub)/learn/[academy]/[...slug]/page.tsx` — add wf dispatch block

---

## Implementation Steps

1. Write `types.ts`
2. Write all 10 data files (metadata first, then lesson content for modules 1–7)
3. Write `index.ts` with `getModule(id)`, `getLesson(id)`, `getChallenge(id)` lookup fns
4. Write `manifest.ts` — 10 routes (one per module)
5. Update `registry.ts` — point web-fundamentals at new manifest
6. Update `mock-data.ts` — web-fundamentals entry with 10 module-level routes
7. Write `WFLearnSidebar.tsx`
8. Write `ModuleOverviewPage.tsx`
9. Write `LessonPage.tsx`
10. Update content viewer page — add dispatch block for web-fundamentals
11. `pnpm build` — zero errors
12. Verify: `/paths/web-fundamentals` shows 10 modules, each links to module overview, lessons render correctly

---

## Out of Scope (deferred to later epics)

- Live playground (Epic 3)
- Challenge detail pages (Epic 2)
- Hint reveal, solution toggle (Epic 2)
- Progress toast / completion animation (existing system handles basic progress)
- Mobile sidebar drawer for WF sidebar (can reuse existing MobileDrawer pattern)
