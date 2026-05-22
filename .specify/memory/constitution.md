<!--
SYNC IMPACT REPORT
==================
Version change: [PLACEHOLDER] → 1.0.0
Added sections:
  - Core Principles (7 principles)
  - Architecture & Stack Constraints
  - Definition of Done
  - Governance
Modified principles:
  - I. Pattern Conformity — clarified dependency approval and package/lockfile mutation rules
  - VII. Minimal, Reviewable Diffs — clarified speculative vs. real error handling
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md — Constitution Check section references SE Hub constraints
  ✅ spec-template.md — no structural changes required; existing template fits
  ✅ tasks-template.md — no structural changes required
Deferred TODOs:
  - RATIFICATION_DATE set to first commit date approximation (2026-05-21 = today per memory)
  - No E2E test tooling detected — if added in future, amend Principle VI
-->

# SE Hub Constitution

## Core Principles

### I. Pattern Conformity (NON-NEGOTIABLE)

Every code change MUST follow patterns already established in the codebase. Before implementing
anything new, read an existing analogous file and match its structure, naming, import order, and
export style. New libraries require explicit user approval before installation.

- MUST use `pnpm` as the package manager — no `npm` or `yarn` invocations
- MUST place all hub pages inside `src/app/(hub)/` — pages outside this group miss the shell layout and cause build errors
- MUST export UI primitives from `src/components/ui/index.ts` — no direct deep imports from consumers
- MUST get explicit user approval before adding any library not already in `package.json` — propose the library, state why existing packages cannot solve the problem, then wait for approval before running `pnpm add`
- If a new dependency appears beneficial but is not ticket-required, the agent MUST stop and ask for approval before modifying `package.json`, `pnpm-lock.yaml`, or workspace dependency files
- MUST NOT modify `package.json`, `pnpm-lock.yaml`, or workspace dependency files unless the ticket requires it or user approval was obtained
- SHOULD prefer editing existing files over creating new ones
- Tailwind tokens and utilities MUST be added in `src/styles/globals.css` under `@theme inline` — no `tailwind.config.ts` is used

**Rationale**: The project is a single-developer personal tool. Consistency across files is more
valuable than local cleverness. Future AI sessions read this code cold — divergent patterns create
confusion and bugs.

### II. Next.js App Router Discipline (NON-NEGOTIABLE)

The project runs Next.js 16.2.4 App Router with React 19. Breaking changes from older Next.js
versions are real and must be respected.

- MUST `await params` before accessing any property — `params` is a `Promise` in this version
- MUST NOT pass a React `ComponentType` (function reference) as a prop from Server → Client; pass the rendered `children` element instead
- MUST keep academy module root components as Server Components (no `"use client"` at the module file level) — MAY extract `"use client"` sub-components for interactive islands (e.g., embedded editors, live demos)
- All client state, interactivity, and browser APIs MUST live in Client Components
- MUST keep the two data-source split: `MOCK_ACADEMIES` for discovery/navigation UI; `REGISTRY` for the content viewer

**Rationale**: Server/Client boundary violations cause silent runtime errors or hydration mismatches
that are difficult to debug. The two-source pattern decouples navigation metadata from heavy module
content.

### III. TypeScript Strictness (NON-NEGOTIABLE)

TypeScript is configured with `strict: true`. Type errors only surface at build time via `pnpm build`.

- MUST run `pnpm build` before declaring any ticket complete — lint alone is not sufficient
- MUST NOT use `any` unless wrapping a genuinely unknown external boundary (e.g., JSON.parse output)
- MUST use structural interfaces for shell props (`ShellAcademy`, `SidebarAcademy`) — not concrete `MockAcademy` types — to allow both real and mock academies without adapters
- MUST use optional chaining on all `modules` accesses: `academies[slug]?.modules?.[id]` — stale localStorage data may have `modules: undefined`

**Rationale**: The project has no CI. `pnpm build` is the only type gate. Missing it means shipping
silent type errors.

### IV. Design System Adherence

The UI is a dark glassmorphism system. All visual decisions MUST draw from established tokens.

- MUST use CSS tokens (`--bg-base`, `--accent-primary`, etc.) and their Tailwind mappings (`bg-base`, `text-accent`, etc.) — no hardcoded hex values in components
- MUST use `bg-white/[0.04]` for glassmorphism surface fills
- MUST apply `.article-content` class on the root `<div>` of every academy module for prose styling
- Focus rings MUST use `--accent-primary` — already defined in `globals.css`; do not override per-component
- Animation constants MUST follow established conventions:
  - Page entry: `initial={{ opacity: 0, y: 18 }}`, `duration: 0.5`
  - Stagger: `staggerChildren: 0.05`
  - Easing: `[0.25, 0.46, 0.45, 0.94]`
  - Spring nav pill: `layoutId="nav-active-pill"`, `stiffness: 380, damping: 30`

**Rationale**: A consistent visual language is the primary user-facing quality of this tool. Drift
accumulates fast when tokens are bypassed.

### V. State Management Safety

Zustand is used with `persist` middleware and `skipHydration: true`. SSR safety is non-negotiable.

- MUST use the `mounted` guard pattern for any component that reads persisted store state:
  ```ts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Skeleton />;
  ```
- MUST NOT read persisted store values during SSR — causes hydration mismatches
- `StoreHydrator` MUST remain in `(hub)/layout.tsx` — if a new route group or nested layout needs hydration, propose the approach to the user before acting
- Prefer objects indexed by ID over arrays when data is keyed by a unique field (e.g., `Record<string, AcademyProgress>`) — avoids linear scans

**Rationale**: `skipHydration: true` means the store is empty on first render server-side. Without
the mounted guard, components flash incorrect state or throw on stale data shapes.

### VI. Testing Standards

Tests are written with Vitest v4 in a pure Node environment. No DOM, no E2E tooling exists.

- MUST place test files at `src/**/*.test.ts` (TypeScript only — no `.test.tsx`)
- MUST keep tests pure logic (store logic, pure functions) — no DOM rendering
- MUST NOT mock the Zustand store internals — test exported pure functions (`computeStreak`, etc.) directly
- SHOULD use `vi.useFakeTimers()` + `vi.setSystemTime()` for date-dependent streak logic
- Run `pnpm test` before reporting a ticket complete when store/utility logic changed

**Rationale**: The environment is `"node"` — JSDOM is not configured. Any component-level test
would fail silently or require an environment change. Keep tests at the pure logic boundary.

### VII. Minimal, Reviewable Diffs (NON-NEGOTIABLE)

Each change MUST be the smallest correct implementation of the requirement. No scope creep.

- MUST NOT refactor surrounding code while implementing a feature unless the feature requires it
- MUST NOT add speculative error handling, fallbacks, or validation for impossible states; handle states proven possible by data, user input, network, persistence, or external APIs
- MUST NOT add comments explaining WHAT the code does — only WHY when non-obvious (hidden constraint, workaround, subtle invariant)
- MUST NOT add features for hypothetical future requirements (YAGNI)
- Three similar lines is better than a premature abstraction

**Rationale**: This is a personal tool built ticket-by-ticket. Over-engineering compounds across
sessions and makes future AI-assisted changes harder to reason about.

## Architecture & Stack Constraints

### Locked Stack

The following are locked and MUST NOT be changed or replaced without explicit user instruction:

| Concern | Tool | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.4 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| State | Zustand + persist | ^5 |
| Animation | Framer Motion | ^12 |
| Icons | lucide-react | ^1.8 |
| Code Editors | Monaco Editor + CodeMirror | pinned |
| Diagrams | Mermaid | ^11 |
| Tests | Vitest | ^4 |
| Package Mgr | pnpm | workspace |

### Academy Module Content Standards

All `src/modules/<academy>/modules/*.tsx` files MUST:

- Export `default` function component (Server Component — no `"use client"`)
- Export `toc: TocItem[]` with IDs that exactly match heading `id` attributes
- Use `className="article-content"` on root `<div>`
- Contain ≥ 2 `MermaidDiagram` usages, ≥ 1 `ArticleTable`, ≥ 1 `InterviewPlaybook`,
  ≥ 1 `InterviewChallenge`, ≥ 1 code block per major concept
- Be 300–500 lines of TSX content

### Loading / Empty / Error States

- Components reading persisted store data MUST render `<Skeleton />` while `!mounted`
- `ErrorBoundary` is available at `src/components/hub/learn/ErrorBoundary.tsx` — use it
  around content viewer subtrees
- `comingSoon` academies MUST have `routes.length === 0` — shell components use
  `learningPath.length`, not `moduleCount`, to avoid the mismatch

## Definition of Done

A ticket is complete when ALL of the following are true:

1. `pnpm build` passes with zero TypeScript errors
2. `pnpm lint` passes with zero errors
3. `pnpm test` passes (when store or utility logic was changed)
4. All hub pages added during the ticket live inside `src/app/(hub)/`
5. New library (if any): user approval obtained before `pnpm add` was run
6. No `mounted` guard omitted for any component reading persisted store state
7. New academy added to BOTH `MOCK_ACADEMIES` (mock-data.ts) AND `REGISTRY` (registry.ts)
8. Diff is minimal — no incidental refactors, cleanups, or unrelated changes

## Governance

- This constitution supersedes all other practices for the SE Hub project
- It is read by AI agents at the start of every planning and implementation session
- Amendments require: identifying the violated principle, proposing the updated rule,
  bumping the version per semantic versioning (MAJOR: removal/redefinition, MINOR: new
  principle, PATCH: clarification), and running `pnpm build` after any code changes
- All `specs/###-feature/plan.md` Constitution Check sections MUST reference this document
- When a rule here conflicts with a CLAUDE.md instruction, the more specific rule wins;
  flag the conflict if ambiguous

**Version**: 1.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21
