# Epic — React Interview Challenges

## Goal

A dedicated coding challenge environment focused on senior React interview questions.
Not a learning path — a practice arena. The user reads a problem, edits code in a
live React sandbox, clicks "Run Tests", and sees pass/fail results backed by real
unit tests. Closest analogy: LeetCode + CodeSandbox, scoped to React.

---

## Key Architectural Decisions

### 1. Browser-based React execution via Babel Standalone + iframe srcdoc

The challenge editor needs to transpile JSX and run it inside a sandboxed context.

**Stack:**
- `@babel/standalone` — transpiles JSX + modern JS to browser-compatible code.
  Loaded dynamically on first use (~350 KB gzipped). Runs in the main thread via
  a Web Worker to avoid blocking the editor.
- `React 18 + ReactDOM` — loaded from CDN (`esm.sh`) inside the iframe at
  srcdoc generation time. No bundling needed.
- `iframe srcdoc` — same pattern as the existing Playground (`PlaygroundPage.tsx`).
  `sandbox="allow-scripts"` keeps it isolated.

**Execution flow (on "Run Tests" click):**
```
User code (JSX) ──► Babel Worker ──► transpiled JS
Test file (JSX)  ──► Babel Worker ──► transpiled JS
                                           │
                          ┌────────────────┘
                          ▼
                  Build srcdoc HTML:
                    - React + ReactDOM CDN scripts
                    - Mini test runner script
                    - User's transpiled code
                    - Transpiled test file
                    - Auto-run: testRunner.run()
                          │
                  Inject into <iframe srcdoc>
                          │
                  iframe posts results via
                  window.parent.postMessage
                          │
                  Parent captures ──► render results UI
```

### 2. Mini test runner (browser-native, no Jest/Vitest)

A ~100-line custom test runner injected into every iframe. Provides:
```js
describe(label, fn)     // group
it(label, fn)           // test case (sync or async)
expect(value)           // assertion chain

// Matchers:
.toBe(v)           .not.toBe(v)
.toEqual(v)        .toContain(v)
.toBeTruthy()      .toBeFalsy()
.toBeNull()        .toBeGreaterThan(n)
.toThrow()         .toHaveLength(n)

// DOM helpers (injected alongside runner):
render(<Component />) → HTMLElement   // mounts into a hidden div
screen.getByText(str) → Element
screen.getByRole(role) → Element
screen.queryByText(str) → Element | null
fireEvent.click(el)
fireEvent.change(el, { target: { value } })
```

After all tests run, results are posted to the parent:
```js
window.parent.postMessage({ type: "TEST_RESULTS", results: [...] }, "*");
```

### 3. Data model

```
src/modules/react-interview/
  data/
    types.ts
    01-rendering.ts
    02-hooks.ts
    03-state-props.ts
    04-data-structures.ts
    05-performance.ts
    06-patterns.ts
    07-async-effects.ts
    08-forms.ts
    09-error-handling.ts
    index.ts
```

**Types (`types.ts`):**
```ts
export type Difficulty = "easy" | "medium" | "hard";

export interface ChallengeTest {
  description: string;    // "renders with initial count of 0"
  code: string;           // full JSX test body (transpiled at runtime)
}

export interface ReactChallenge {
  id: string;             // kebab-case, unique
  topicId: string;        // parent topic
  title: string;
  difficulty: Difficulty;
  description: string;    // markdown prose — problem statement
  concepts: string[];     // ["useState", "closures", "memoization"]
  starterCode: string;    // JSX the user begins with
  hints: string[];        // progressive reveal, same pattern as ChallengePage
  tests: ChallengeTest[]; // 3-6 tests per challenge
  estimatedMinutes: number;
}

export interface ChallengeTopic {
  id: string;
  title: string;
  icon: string;
  description: string;
  accentColor: string;
  challenges: ReactChallenge[];
}
```

### 4. Routing

```
/interview                          ← landing: topic grid + challenge browser
/interview/[challengeId]            ← coding environment for one challenge
```

No nested topic route needed — topic context comes from challenge data.

### 5. Progress tracking

Uses the existing Zustand progress store with a new `"react-interview"` academy key:
```ts
markModuleVisited("react-interview", `challenge/${id}`, title, estimatedMinutes)
markModuleComplete("react-interview", `challenge/${id}`)
```
No store changes needed — the store accepts arbitrary academy/module keys.

### 6. Navigation

Add `{ href: "/interview", label: "Interview Prep", icon: BrainCircuit }` to
`navItems` in `src/components/hub/Sidebar.tsx`. BrainCircuit is already in
`lucide-react` (v1.8+). This is the only sidebar change.

---

## Challenge Content

### Topic 1 — React Rendering (4 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `memo-child-component` | Stop a child from re-rendering on every parent update | easy |
| `fix-stale-key` | Fix a list that loses input state on reorder (key prop bug) | easy |
| `memo-with-callback` | Memoize a child + stabilize its callback prop | medium |
| `why-did-it-render` | Identify and fix 3 unnecessary re-renders in a dashboard | hard |

### Topic 2 — Hooks (6 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `use-debounce` | Build a `useDebounce(value, delay)` custom hook | easy |
| `use-previous` | Build a `usePrevious(value)` custom hook | easy |
| `use-local-storage` | Build a `useLocalStorage(key, initialValue)` hook | medium |
| `fix-stale-closure` | Fix a `useEffect` with a stale closure bug | medium |
| `use-async` | Build a `useAsync(fn)` hook: `{ data, loading, error }` | medium |
| `use-reducer-cart` | Implement a shopping cart with `useReducer` | hard |

### Topic 3 — State & Props (4 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `lift-state-up` | Sync two sibling components by lifting state | easy |
| `controlled-input` | Convert an uncontrolled input to controlled | easy |
| `context-provider` | Replace prop drilling 3 levels deep with Context | medium |
| `derive-from-state` | Eliminate redundant state by deriving it from a single source of truth | medium |

### Topic 4 — Data Structures (5 challenges) ⭐ Priority topic

| ID | Title | Difficulty |
|---|---|---|
| `render-tree` | Recursively render a nested comment tree from a flat array (parentId) | medium |
| `flatten-to-tree` | Given `[{id, parentId, label}]`, build and render a tree | medium |
| `trie-autocomplete` | Build an autocomplete using a Trie. O(k) lookup where k = query length | hard |
| `lru-cache-hook` | Implement a `useLRUCache(capacity)` hook (get/set with eviction) | hard |
| `virtual-list` | Render only visible rows in a 10,000-item list (basic windowing) | hard |

### Topic 5 — Performance (4 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `usememo-derived-data` | Memoize an expensive sort+filter on a large list | easy |
| `stable-references` | Fix a component where `useEffect` fires on every render due to unstable deps | medium |
| `memo-context-split` | Prevent all consumers from re-rendering when one context value changes | hard |
| `batch-state-updates` | Identify why two `setState` calls cause two renders and batch them | medium |

### Topic 6 — Patterns (4 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `compound-tabs` | Build a `<Tabs>` / `<Tab>` / `<TabPanel>` compound component | medium |
| `render-props-toggle` | Implement a `<Toggle renderOn={…} renderOff={…} />` render prop component | medium |
| `hoc-auth-guard` | Build a `withAuth(Component)` HOC that redirects if `isAuthenticated` is false | medium |
| `hook-composition` | Compose `useSearch` + `useSort` + `usePagination` into `useFilteredList` | hard |

### Topic 7 — Async & Effects (4 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `cleanup-interval` | Fix a component that causes a memory leak (setInterval not cleared) | easy |
| `abort-fetch` | Cancel a fetch request on component unmount using AbortController | medium |
| `fix-race-condition` | Fix a useEffect data fetch that shows stale results on fast typing | medium |
| `optimistic-update` | Implement optimistic UI: update state immediately, rollback on error | hard |

### Topic 8 — Forms (3 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `inline-validation` | Build a form with per-field validation that shows errors on blur | easy |
| `multi-step-form` | Wizard form with 3 steps, back/next, and accumulated state | medium |
| `field-array` | Dynamic form: add/remove rows, each with its own fields | hard |

### Topic 9 — Error Handling (3 challenges)

| ID | Title | Difficulty |
|---|---|---|
| `error-boundary` | Build a class-based `ErrorBoundary` component with fallback UI | easy |
| `async-error-state` | Catch and display errors from an async `useEffect` fetch | easy |
| `retry-on-error` | Implement a `useRetry(fn, maxAttempts)` hook with exponential backoff | hard |

**Total: 37 challenges across 9 topics**

---

## Components

### `ChallengeBrowser` (`src/components/hub/interview/ChallengeBrowser.tsx`)
- Grid of `TopicCard` components (9 cards, 3-col on desktop)
- Each card: icon, title, description, challenge count, difficulty distribution bar
- Clicking a card scrolls/filters to that topic's challenge list
- Below the grid: a flat challenge list filterable by topic + difficulty
- Each row links to `/interview/[challengeId]`

### `TopicCard` (`src/components/hub/interview/TopicCard.tsx`)
- Reuses `PathCard` visual style (accentColor left border, ambient glow)
- Shows: icon, title, `N challenges`, mini difficulty breakdown (e.g. "2 easy · 3 medium · 1 hard")
- Completed count badge (from progress store)

### `ChallengeEditor` (`src/components/hub/interview/ChallengeEditor.tsx`)
The main coding environment. Layout:

```
┌────────────────────────────────────────────────────────────┐
│ TopBar: [← Back]  [Challenge title]  [difficulty]  [timer] │
├──────────────────────────┬─────────────────────────────────┤
│ Left panel               │ Right panel                     │
│                          │                                 │
│ ┌── Description ──────┐  │  ┌── Code Editor ───────────┐  │
│ │ Problem statement   │  │  │  CodeMirror (JSX)        │  │
│ │ Requirements        │  │  │  lang: javascript+jsx    │  │
│ │ ─────────────────── │  │  └─────────────────────────┘  │
│ │ Hints (progressive) │  │                                 │
│ │ ─────────────────── │  │  ┌── Test Results ──────────┐  │
│ │ Concepts covered    │  │  │  [Run Tests ▶]           │  │
│ └─────────────────────┘  │  │  ● pass  describe block  │  │
│                          │  │    ✓ renders correctly    │  │
│                          │  │    ✗ handles edge case    │  │
│                          │  │  [Mark Complete ✓]        │  │
│                          │  └─────────────────────────┘  │
└──────────────────────────┴─────────────────────────────────┘
```

- Left panel: scrollable, fixed width ~380px
- Right panel: CodeMirror (top, ~60% height) + test results (bottom, ~40% height)
- No live preview — React challenges are logic/structure focused, not visual
- "Run Tests" button: transpiles code → builds iframe srcdoc → captures results
- Timer: elapsed time since page load (cosmetic, not scored)

### `TestRunner` (`src/components/hub/interview/TestRunner.tsx`)
- Hidden `<iframe>` that receives srcdoc on test execution
- Listens for `message` events from the iframe
- Parses `TEST_RESULTS` message and renders pass/fail UI
- Shows: test description, pass (✓ green) or fail (✗ red + error message)
- Loading state while tests run (spinner, ~500ms typical)
- Error state if transpilation fails (shows Babel syntax error)

### `BabelWorker` (`src/lib/interview/babel-worker.ts`)
- Web Worker that imports `@babel/standalone`
- Receives raw JSX string, returns transpiled JS
- Loaded lazily on first challenge open

---

## New Dependencies

```bash
pnpm add @babel/standalone
pnpm add -D @types/babel__standalone
```

These are the **only** new dependencies. React/ReactDOM come from CDN inside the
iframe — no new npm packages for React itself.

---

## File Structure

```
src/
  app/(hub)/
    interview/
      page.tsx                        ← ChallengeBrowser (server shell + client grid)
      [challengeId]/
        page.tsx                      ← ChallengeEditor page (looks up challenge by id)
  modules/
    react-interview/
      data/
        types.ts
        01-rendering.ts               ← 4 challenges
        02-hooks.ts                   ← 6 challenges
        03-state-props.ts             ← 4 challenges
        04-data-structures.ts         ← 5 challenges ⭐
        05-performance.ts             ← 4 challenges
        06-patterns.ts                ← 4 challenges
        07-async-effects.ts           ← 4 challenges
        08-forms.ts                   ← 3 challenges
        09-error-handling.ts          ← 3 challenges
        index.ts                      ← getChallenge(), getTopic(), ALL_TOPICS
  components/
    hub/
      interview/
        ChallengeBrowser.tsx
        TopicCard.tsx
        ChallengeEditor.tsx
        TestRunner.tsx
  lib/
    interview/
      babel-worker.ts                 ← Web Worker for Babel transpilation
      test-runner-src.ts              ← Mini test runner source (injected into iframe)
      build-srcdoc.ts                 ← Assembles iframe HTML from parts
```

### Modified files
- `src/components/hub/Sidebar.tsx` — add "Interview Prep" nav item
- `src/lib/mock-data.ts` — optionally add a `react-interview` entry for progress tracking (not required — progress store accepts any slug key)

---

## Implementation Steps

1. **Types + data** — Write `types.ts`, then all 9 data files with starter code + tests
2. **`index.ts`** — `getChallenge(id)`, `getTopic(id)`, `ALL_TOPICS`, `ALL_CHALLENGES`
3. **Mini test runner** — Write `test-runner-src.ts` (the browser-native runner + DOM helpers)
4. **Babel worker** — Write `babel-worker.ts`
5. **`build-srcdoc.ts`** — Assembles the full iframe HTML: CDN scripts + runner + user code + tests
6. **`TestRunner.tsx`** — Hidden iframe + message listener + results UI
7. **`ChallengeEditor.tsx`** — Full coding environment (layout + CodeMirror + TestRunner)
8. **`TopicCard.tsx`** — Topic grid card
9. **`ChallengeBrowser.tsx`** — Landing page grid + challenge list
10. **`interview/page.tsx`** — Landing route
11. **`interview/[challengeId]/page.tsx`** — Challenge route
12. **`Sidebar.tsx`** — Add nav item
13. `pnpm build` — zero errors
14. Verify: browse topics → open challenge → edit code → run tests → pass/fail displayed correctly

---

## Out of Scope (future epics)

- TypeScript challenges (requires ts-morph or TypeScript Language Server in browser)
- System design questions (no code, whiteboard-style)
- Timed/mock interview mode (countdown, locked editor)
- Leaderboard / sharing solutions
- AI hint generation via Claude API
- Solution comparison (show reference solution after completing)
