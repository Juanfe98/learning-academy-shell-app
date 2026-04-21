# React Interview Challenges — Ticket Breakdown

Derived from `EPIC-REACT-INTERVIEW-CHALLENGES.md`.
Each ticket is a focused session. Dependencies are listed so you know what must
land first.

---

## Dependency graph

```
RIC-01 ──► RIC-02 ──┐
       ──► RIC-03 ──┼──► RIC-05 ──► RIC-10 ──► RIC-11
       ──► RIC-04 ──┘              └──► RIC-12
                                         ▲
RIC-06 ──► RIC-07 ──► RIC-08 ──► RIC-09 ┘
                              └──► RIC-12

RIC-13  (no deps — do any time)
RIC-14  (final integration — depends on all)
```

---

## RIC-01 — Types & data model
**Size:** S | **Depends on:** nothing

### Scope
Create `src/modules/react-interview/data/types.ts`.

### Types to define
```ts
export type Difficulty = "easy" | "medium" | "hard";

export interface ChallengeTest {
  description: string;   // shown in results panel: "renders initial count of 0"
  code: string;          // JSX test body — transpiled at runtime by Babel
}

export interface ReactChallenge {
  id: string;            // kebab-case, globally unique
  topicId: string;
  title: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  description: string;   // markdown prose — the problem statement
  concepts: string[];    // ["useState", "closures"] — shown as tags
  starterCode: string;   // JSX the user starts with
  hints: string[];       // progressive reveal (same pattern as ChallengePage)
  tests: ChallengeTest[];
}

export interface ChallengeTopic {
  id: string;
  title: string;
  icon: string;          // emoji
  description: string;
  accentColor: string;   // hex
  challenges: ReactChallenge[];
}
```

### Acceptance criteria
- `pnpm build` passes (types-only file, no runtime code)
- All fields are typed — no `any`

---

## RIC-02 — Challenge data: Rendering, Hooks, State & Props (14 challenges)
**Size:** M | **Depends on:** RIC-01

### Scope
Create:
- `src/modules/react-interview/data/01-rendering.ts` — 4 challenges
- `src/modules/react-interview/data/02-hooks.ts` — 6 challenges
- `src/modules/react-interview/data/03-state-props.ts` — 4 challenges

### Challenge list

**01-rendering.ts**
| id | title | difficulty |
|---|---|---|
| `memo-child-component` | Stop a child from re-rendering on every parent update | easy |
| `fix-stale-key` | Fix a list that loses input state on reorder (key prop bug) | easy |
| `memo-with-callback` | Memoize a child + stabilize its callback prop | medium |
| `why-did-it-render` | Identify and fix 3 unnecessary re-renders in a dashboard | hard |

**02-hooks.ts**
| id | title | difficulty |
|---|---|---|
| `use-debounce` | Build a `useDebounce(value, delay)` custom hook | easy |
| `use-previous` | Build a `usePrevious(value)` custom hook | easy |
| `use-local-storage` | Build a `useLocalStorage(key, initialValue)` hook | medium |
| `fix-stale-closure` | Fix a `useEffect` with a stale closure bug | medium |
| `use-async` | Build a `useAsync(fn)` hook returning `{ data, loading, error }` | medium |
| `use-reducer-cart` | Implement a shopping cart with `useReducer` | hard |

**03-state-props.ts**
| id | title | difficulty |
|---|---|---|
| `lift-state-up` | Sync two sibling components by lifting state | easy |
| `controlled-input` | Convert an uncontrolled input to a controlled one | easy |
| `context-provider` | Replace prop drilling 3 levels deep with Context | medium |
| `derive-from-state` | Eliminate redundant state by deriving it | medium |

### Each challenge must include
- `description`: 2–4 sentence problem statement explaining what's broken or what to build
- `starterCode`: working JSX that either has a bug or is incomplete (the user's canvas)
- `hints`: 2–3 strings, progressively more specific
- `tests`: 3–5 `ChallengeTest` objects. Each has:
  - `description`: one sentence ("should return debounced value after delay")
  - `code`: JSX test body using the mini runner API (describe/it/expect, render, fireEvent)
- `concepts`: 2–4 tags

### Acceptance criteria
- All 14 challenges have non-trivial starter code (not just empty stubs)
- Each challenge has ≥ 3 tests
- `pnpm build` passes

---

## RIC-03 — Challenge data: Data Structures (5 challenges) ⭐
**Size:** L | **Depends on:** RIC-01

### Scope
Create `src/modules/react-interview/data/04-data-structures.ts`.

### Challenge list
| id | title | difficulty |
|---|---|---|
| `render-tree` | Recursively render a nested comment tree from a flat array (parentId links) | medium |
| `flatten-to-tree` | Given `[{id, parentId, label}]`, build and render a tree component | medium |
| `trie-autocomplete` | Build a search autocomplete backed by a Trie — O(k) lookup | hard |
| `lru-cache-hook` | Implement a `useLRUCache(capacity)` hook with get/set + LRU eviction | hard |
| `virtual-list` | Render only visible rows in a 10 000-item list (no library, basic windowing) | hard |

### Special requirements for this topic
- `render-tree` starter: provide a `const data = [{id, parentId, content, author}]` array
  with 8–10 nodes; user must write the recursive component
- `trie-autocomplete` starter: a `Trie` class skeleton with empty `insert` / `search` methods
  + a React component shell; user implements both
- `lru-cache-hook` starter: hook signature + empty `Map` + `head/tail` doubly-linked list
  skeleton; user implements the eviction logic
- `virtual-list` starter: the data array + the container div with fixed height + `onScroll`;
  user implements the windowing math (startIndex, endIndex, offsetY)

### Acceptance criteria
- Data structure challenges test both the algorithm correctness AND the React rendering
- `trie-autocomplete`: tests check O(k) lookup (exact number of nodes visited)
- `lru-cache-hook`: tests check capacity eviction (oldest key removed when full)
- `virtual-list`: tests check that only N visible items are in the DOM (not all 10 000)
- `pnpm build` passes

---

## RIC-04 — Challenge data: Performance, Patterns, Async, Forms, Error Handling (18 challenges)
**Size:** L | **Depends on:** RIC-01

### Scope
Create:
- `src/modules/react-interview/data/05-performance.ts` — 4 challenges
- `src/modules/react-interview/data/06-patterns.ts` — 4 challenges
- `src/modules/react-interview/data/07-async-effects.ts` — 4 challenges
- `src/modules/react-interview/data/08-forms.ts` — 3 challenges
- `src/modules/react-interview/data/09-error-handling.ts` — 3 challenges

### Challenge list

**05-performance.ts**
| id | title | difficulty |
|---|---|---|
| `usememo-derived-data` | Memoize an expensive sort+filter on a large list | easy |
| `stable-references` | Fix a `useEffect` that fires every render due to unstable object dep | medium |
| `memo-context-split` | Split a context so not all consumers re-render on every value change | hard |
| `batch-state-updates` | Identify why two `setState` calls cause two renders; batch them | medium |

**06-patterns.ts**
| id | title | difficulty |
|---|---|---|
| `compound-tabs` | Build `<Tabs>`, `<Tab>`, `<TabPanel>` compound components | medium |
| `render-props-toggle` | `<Toggle renderOn={…} renderOff={…} />` render prop component | medium |
| `hoc-auth-guard` | `withAuth(Component)` HOC that redirects when `isAuthenticated` false | medium |
| `hook-composition` | Compose `useSearch` + `useSort` + `usePagination` into `useFilteredList` | hard |

**07-async-effects.ts**
| id | title | difficulty |
|---|---|---|
| `cleanup-interval` | Fix a memory leak — `setInterval` not cleared on unmount | easy |
| `abort-fetch` | Cancel a fetch on unmount using `AbortController` | medium |
| `fix-race-condition` | Fix stale results on fast typing (fetch responses arriving out of order) | medium |
| `optimistic-update` | Optimistic UI: update state immediately, rollback on API error | hard |

**08-forms.ts**
| id | title | difficulty |
|---|---|---|
| `inline-validation` | Form with per-field validation, errors shown on blur | easy |
| `multi-step-form` | 3-step wizard with back/next and accumulated state | medium |
| `field-array` | Dynamic form: add/remove rows, each row has its own fields | hard |

**09-error-handling.ts**
| id | title | difficulty |
|---|---|---|
| `error-boundary` | Build a class-based `ErrorBoundary` with fallback UI | easy |
| `async-error-state` | Catch and display errors from an async `useEffect` fetch | easy |
| `retry-on-error` | `useRetry(fn, maxAttempts)` hook with exponential backoff | hard |

### Acceptance criteria
- Each challenge: description, starterCode, ≥ 2 hints, ≥ 3 tests
- `pnpm build` passes

---

## RIC-05 — Data index & lookup functions
**Size:** S | **Depends on:** RIC-02, RIC-03, RIC-04

### Scope
Create `src/modules/react-interview/data/index.ts`.

### Exports
```ts
export { ReactChallenge, ChallengeTopic, ChallengeTest, Difficulty } from "./types";

export const ALL_TOPICS: ChallengeTopic[]       // ordered array
export const ALL_CHALLENGES: ReactChallenge[]   // flat, for fast id lookup

// Lookup functions
export function getTopic(id: string): ChallengeTopic | undefined
export function getChallenge(id: string): ReactChallenge | undefined

// Indexed by id for O(1) access (object, not array search)
const CHALLENGE_MAP: Record<string, ReactChallenge>
const TOPIC_MAP: Record<string, ChallengeTopic>
```

`CHALLENGE_MAP` and `TOPIC_MAP` are module-level constants — built once at import
time, never rebuilt on re-render. Pattern matches `getModule()` / `getLesson()` in
`src/modules/web-fundamentals/data/index.tsx`.

### Acceptance criteria
- `getChallenge("use-debounce")` returns the correct challenge object
- `getTopic("hooks")` returns the correct topic
- `ALL_CHALLENGES.length === 37`
- `pnpm build` passes

---

## RIC-06 — Browser execution infrastructure
**Size:** L | **Depends on:** nothing (pure infrastructure)

### Scope
Install dependency:
```bash
pnpm add @babel/standalone
pnpm add -D @types/babel__standalone
```

Create three files:

**`src/lib/interview/babel-worker.ts`** — Web Worker
```ts
// Wraps @babel/standalone. Receives { code: string }, returns { result: string } or { error: string }
// Presets: ["react"] — transpiles JSX + modern JS
// importScripts or dynamic import of @babel/standalone inside the worker
```

**`src/lib/interview/test-runner-src.ts`** — Browser-native test runner
```ts
// Exports a string constant: the full source of the mini test runner
// that gets injected into every iframe.
// API: describe / it / expect + matchers:
//   .toBe .toEqual .toBeTruthy .toBeFalsy .toBeNull
//   .toContain .toHaveLength .toBeGreaterThan .toThrow .not.*
// DOM helpers (mounted into hidden #test-root div):
//   render(<Component />) → container HTMLElement
//   screen.getByText(str) / screen.getByRole(role) / screen.queryByText(str)
//   fireEvent.click(el) / fireEvent.change(el, { target: { value } })
// After all tests: window.parent.postMessage({ type: "TEST_RESULTS", results }, "*")
// Results shape: Array<{ description: string, passed: boolean, error?: string }>
```

**`src/lib/interview/build-srcdoc.ts`** — iframe HTML assembler
```ts
export function buildTestSrcdoc(
  userCode: string,       // already transpiled by Babel worker
  testCode: string,       // already transpiled by Babel worker
): string
// Returns full srcdoc HTML:
// 1. React 18 + ReactDOM from esm.sh CDN (UMD build via <script> tags)
// 2. Mini test runner source (inlined from test-runner-src.ts)
// 3. user code via <script>
// 4. test code via <script>
// 5. testRunner.run() call
```

### Acceptance criteria
- Babel worker correctly transpiles `const C = () => <div>Hello</div>` to valid JS
- `buildTestSrcdoc` produces valid HTML that, when loaded in an iframe, runs tests
  and posts `TEST_RESULTS` to the parent window
- Manual smoke test: inject srcdoc into an iframe in the browser console, verify
  `window.addEventListener("message", ...)` receives results

---

## RIC-07 — JSX code editor
**Size:** S | **Depends on:** nothing (extends existing CodeEditor)

### Scope
Install:
```bash
pnpm add @codemirror/lang-javascript
```

Extend `src/components/hub/learn/wf/CodeEditor.tsx`:
- Add `"javascript"` (with JSX enabled) to the `Language` type
- Add `javascript({ jsx: true })` to `langExtension`

```ts
// Before
type Language = "html" | "css";

// After
type Language = "html" | "css" | "javascript";

import { javascript } from "@codemirror/lang-javascript";

const langExtension: Record<Language, Extension> = {
  html: html(),
  css: css(),
  javascript: javascript({ jsx: true }),
};
```

No other changes to `CodeEditor.tsx`.

### Acceptance criteria
- `<CodeEditor language="javascript" />` renders with JSX syntax highlighting
- Existing `html` and `css` modes unaffected
- `pnpm build` passes

---

## RIC-08 — TestRunner component
**Size:** M | **Depends on:** RIC-06

### Scope
Create `src/components/hub/interview/TestRunner.tsx`.

### Behaviour
- Receives: `userCode: string` (raw JSX), `tests: ChallengeTest[]`
- On `onRun()` call (triggered externally by "Run Tests" button):
  1. Show loading spinner (estimated ~500ms)
  2. Transpile `userCode` + each `test.code` via Babel worker
  3. If transpile error: show error panel with Babel message, abort
  4. Call `buildTestSrcdoc(transpiledUser, transpiledTests)`
  5. Inject srcdoc into hidden `<iframe>`
  6. Listen for `message` event → parse `TEST_RESULTS`
  7. Render results
- Hidden iframe (0×0, `aria-hidden`)
- Results panel states:
  - **Idle**: "Click Run Tests to check your solution" (muted text)
  - **Running**: spinner + "Running tests…"
  - **Pass**: green header "All N tests passed ✓" + individual rows
  - **Fail**: red/amber header "N/M tests passed" + individual rows
  - **Error**: red "Syntax error" + Babel error message
- Each result row: `✓` or `✗` + `test.description` + (on fail) collapsed error detail
- Uses `AnimatePresence` for results entrance (same pattern as ChallengePage hints)

### Interface
```ts
export interface TestRunnerRef {
  run: () => void;   // called by "Run Tests" button in parent
}

interface TestRunnerProps {
  userCode: string;
  tests: ChallengeTest[];
  onComplete?: () => void;  // called when all tests pass (for auto-suggest complete)
}
```

### Acceptance criteria
- All 5 result states render correctly
- Babel syntax error shows readable message (not raw stack trace)
- `onComplete` fires when every test passes
- Hidden iframe does not affect page layout

---

## RIC-09 — ChallengeEditor component
**Size:** L | **Depends on:** RIC-07, RIC-08

### Scope
Create `src/components/hub/interview/ChallengeEditor.tsx`.

### Layout
```
┌────────────────────────────────────────────────────────────┐
│ [← Topic]  Challenge Title  [difficulty badge]  [Xm timer] │
├─────────────────────┬──────────────────────────────────────┤
│  LEFT (380px fixed) │  RIGHT (flex-1)                      │
│                     │                                      │
│  Description prose  │  ┌─ JSX Editor (CodeMirror) ──────┐  │
│  ─────────────────  │  │  language="javascript"         │  │
│  Hints (reveal)     │  │  flex: ~60% of right height    │  │
│  ─────────────────  │  └────────────────────────────────┘  │
│  Concepts tags      │  ┌─ Test panel ───────────────────┐  │
│                     │  │  [▶ Run Tests]  [✓ Complete]   │  │
│                     │  │  TestRunner results            │  │
│                     │  └────────────────────────────────┘  │
└─────────────────────┴──────────────────────────────────────┘
```

### Behaviour
- `"use client"` component
- Timer: elapsed seconds since mount, formatted as `mm:ss`, cosmetic only
- Left panel: scrollable independently; description + hints (AnimatePresence, same
  ChallengePage pattern) + concepts as badge chips
- Code editor (right top): `CodeEditor language="javascript"`, full starter code
  pre-loaded from `challenge.starterCode`
- "Run Tests" button: calls `testRunnerRef.current.run()`
- "Mark Complete" button: `markModuleComplete("react-interview", "challenge/${id}")`
  — shown only when `mounted && !completed`; replaced by badge when done
- Progress store: `markModuleVisited` on mount (same pattern as LessonPage)
- Back link: `← Topic name` → `/interview`

### Acceptance criteria
- Layout holds at 1280px and 1440px without overflow
- Code editor fills available height (flex layout, no fixed px heights)
- Hint reveal animates correctly
- Completed state persists across page refresh

---

## RIC-10 — TopicCard component
**Size:** S | **Depends on:** RIC-05

### Scope
Create `src/components/hub/interview/TopicCard.tsx`.

### Appearance (matches PathCard visual language)
- Glassmorphism card: `rgba(255,255,255,0.04)` background, left border in `accentColor`
- Ambient glow on hover (same radial gradient pattern as PathCard)
- Content:
  - Icon + title
  - Description (1 sentence)
  - Difficulty breakdown: "2 easy · 3 medium · 1 hard" (computed from `topic.challenges`)
  - Completed count badge: "X / N done" (from progress store, mounted-guarded)
  - `whileInView` fade-up animation (same as PathCard)
- Links to `/interview?topic=${topic.id}` (scroll/filter to topic section)

### Acceptance criteria
- Visually consistent with PathCard on the `/paths` page
- Completed count updates after marking a challenge complete (store subscription)
- `pnpm build` passes

---

## RIC-11 — Interview landing page
**Size:** M | **Depends on:** RIC-05, RIC-10

### Scope
Create `src/app/(hub)/interview/page.tsx`.

### Layout
```
Interview Prep                          ← h1
37 challenges · 9 topics               ← stats row

[All (37)]  [Easy (12)]  [Medium (18)]  [Hard (7)]   ← filter tabs (by difficulty)

──── Topics ─────────────────────────────────────────
Grid of 9 TopicCards  (3 col desktop, 2 col tablet, 1 col mobile)

──── Challenges ─────────────────────────────────────
Flat challenge list, filtered by active difficulty tab
Each row: icon · title · topic tag · difficulty badge · "→ Start" link
```

### Behaviour
- `"use client"` (needs store for completion counts)
- Difficulty filter: `"all" | "easy" | "medium" | "hard"` — same pill tab pattern
  as `/paths` page
- Challenge list items: sorted by topic order then by challenge order within topic
- Completed challenges: ~~strikethrough~~ title + green checkmark (mounted-guarded)
- Progress summary: "X / 37 challenges completed" below the h1
- Empty state per filter: "No {difficulty} challenges found" (future-proof)

### Acceptance criteria
- All 9 topic cards render
- Filtering by difficulty correctly shows/hides challenge rows
- Completion state reflects store data after hydration
- `pnpm build` passes

---

## RIC-12 — Challenge detail page + routing
**Size:** S | **Depends on:** RIC-05, RIC-09

### Scope
Create `src/app/(hub)/interview/[challengeId]/page.tsx`.

```tsx
// Server Component
export default async function InterviewChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = getChallenge(challengeId);
  if (!challenge) return <NotFound message={`Challenge "${challengeId}" not found.`} />;
  return <ChallengeEditor challenge={challenge} />;
}
```

`NotFound` component: reuse the same pattern from
`src/app/(hub)/learn/[academy]/[...slug]/page.tsx` (icon + heading + back link).

### Acceptance criteria
- `/interview/use-debounce` loads the correct challenge
- `/interview/nonexistent` renders NotFound (not a 404)
- No TypeScript errors
- `pnpm build` passes

---

## RIC-13 — Sidebar navigation entry
**Size:** XS | **Depends on:** nothing

### Scope
Edit `src/components/hub/Sidebar.tsx`.

```ts
// Add to navItems array (between "Learning Paths" and "Dashboard"):
{ href: "/interview", label: "Interview Prep", icon: BrainCircuit }

// Add to imports:
import { House, Map, LayoutDashboard, Settings, Zap, BrainCircuit } from "lucide-react";
```

Active state: `pathname === "/interview" || pathname.startsWith("/interview/")`.
The current `active={pathname === href}` check won't cover `/interview/[challengeId]`
sub-routes — update the `NavItem` active prop for this entry to:
```ts
active={href === "/interview"
  ? pathname === "/interview" || pathname.startsWith("/interview/")
  : pathname === href}
```

### Acceptance criteria
- "Interview Prep" appears in sidebar between Learning Paths and Dashboard
- Active highlight shows on both `/interview` and `/interview/[challengeId]`
- `pnpm build` passes

---

## RIC-14 — Integration & end-to-end verification
**Size:** S | **Depends on:** all tickets

### Checklist
- [ ] `pnpm build` — zero TypeScript errors, zero lint warnings
- [ ] Sidebar shows "Interview Prep" item; active state works on sub-routes
- [ ] `/interview` loads: 9 topic cards, challenge list, filter tabs work
- [ ] TopicCard completed counts update after marking a challenge complete
- [ ] `/interview/use-debounce` opens with correct description + starter code
- [ ] Timer starts on page load
- [ ] Hint reveal animates correctly
- [ ] "Run Tests" on unmodified starter code: some tests fail (expected)
- [ ] Correct solution: all tests pass, `onComplete` fires, "Mark Complete" appears
- [ ] "Mark Complete": button becomes badge, persists on refresh
- [ ] `/interview/nonexistent` shows NotFound, not a crash
- [ ] Babel syntax error (delete `const` from starter) shows readable error message
- [ ] Progress carries over to dashboard "Learning Paths" section under
  a `react-interview` entry (if added to MOCK_ACADEMIES) or shows in Recent Activity

---

## Effort summary

| Ticket | Description | Size |
|---|---|---|
| RIC-01 | Types & data model | XS |
| RIC-02 | Challenge data: Rendering, Hooks, State/Props | M |
| RIC-03 | Challenge data: Data Structures ⭐ | L |
| RIC-04 | Challenge data: Performance, Patterns, Async, Forms, Errors | L |
| RIC-05 | Data index & lookup functions | XS |
| RIC-06 | Browser execution infrastructure (Babel + test runner + srcdoc) | L |
| RIC-07 | JSX code editor | XS |
| RIC-08 | TestRunner component | M |
| RIC-09 | ChallengeEditor component | L |
| RIC-10 | TopicCard component | S |
| RIC-11 | Interview landing page | M |
| RIC-12 | Challenge detail page + routing | S |
| RIC-13 | Sidebar navigation entry | XS |
| RIC-14 | Integration & end-to-end verification | S |

**Recommended session order:**
- Session 1: RIC-01 → RIC-13 (types + nav, fast wins)
- Session 2: RIC-06 (infrastructure — most technically complex, do early)
- Session 3: RIC-07 → RIC-08 (editor + test runner UI)
- Session 4: RIC-02 (content: rendering, hooks, state)
- Session 5: RIC-03 (content: data structures — needs most thought)
- Session 6: RIC-04 (content: remaining 5 topics)
- Session 7: RIC-05 → RIC-09 (index + challenge editor)
- Session 8: RIC-10 → RIC-11 → RIC-12 (landing page + routing)
- Session 9: RIC-14 (verification + polish)
