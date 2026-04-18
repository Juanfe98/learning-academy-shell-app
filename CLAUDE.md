@AGENTS.md

# SE Hub — Claude Context

## What this is

A personal Software Engineer learning hub. Dark glassmorphism UI. The user builds it ticket-by-ticket in conversation with Claude. It is NOT a public product — it's a personal tool for Juan Felipe Montana.

---

## Stack (exact versions matter)

| Package | Version | Notes |
|---|---|---|
| Next.js | 16.2.4 | App Router. `params` is a `Promise` — always `await params` |
| React | 19.2.4 | |
| Tailwind CSS | ^4 | Config via CSS `@theme inline`, no `tailwind.config.ts` |
| Zustand | ^5 | `persist` middleware with `skipHydration: true` |
| Framer Motion | ^12 | `animate()` importable as imperative fn |
| lucide-react | ^1.8 | |
| TypeScript | ^5 | `strict: true`, path alias `@/*` → `src/*` |
| Vitest | ^4 | `environment: "node"`, `.test.ts` files only |
| pnpm | workspace | |

---

## Commands

```bash
pnpm dev           # start dev server
pnpm build         # production build (also runs tsc)
pnpm test          # vitest run (once)
pnpm test:watch    # vitest watch
pnpm lint          # eslint
pnpm format        # prettier --write .
pnpm sync          # pull academy modules via scripts/sync-modules.sh
```

**Always run `pnpm build` to verify before reporting a ticket complete.** TypeScript errors only surface at build time.

---

## App Router structure

```
src/app/
  layout.tsx                          ← root layout (fonts, body bg)
  (hub)/                              ← route group — applies HubLayout to all pages inside
    layout.tsx                        ← HubLayout: DesktopSidebar + MobileDrawer + TopBar + StoreHydrator + PageTransition
    page.tsx                          ← / (Home)
    dashboard/page.tsx                ← /dashboard
    paths/[slug]/page.tsx             ← /paths/:slug (Learning Path Overview)
    learn/[academy]/[...slug]/page.tsx ← /learn/:academy/:module (Content Viewer)
```

**Critical:** All hub pages MUST live inside `(hub)/`. Pages outside it don't get the shell layout and conflict with the route group, causing build errors.

The `(hub)` prefix is transparent in URLs — `/dashboard` not `/(hub)/dashboard`.

---

## Source layout

```
src/
  app/              Next.js pages (see above)
  components/
    hub/            Hub-specific components (Sidebar, TopBar, PathCard, etc.)
    hub/learn/      Content viewer components (LearnShell, LearnSidebar, etc.)
    ui/             Primitives: Button, Card, Badge, ProgressBar, Skeleton
  lib/
    types/academy.ts   AcademyManifest, AcademyRoute, AcademyModule, TocItem
    store/             Zustand stores (progress.store.ts, ui.store.ts, index.ts)
    mock-data.ts       MOCK_ACADEMIES — used by Home, Paths, Dashboard pages
    registry.ts        REGISTRY — academies with real content (used by content viewer)
    utils/index.ts     cn(), completionPercent()
  modules/
    mock-academy/      "Web Fundamentals" — the reference implementation
      manifest.ts      AcademyManifest with () => import() component factories
      modules/         One .tsx per module, exports default component + toc: TocItem[]
  styles/
    globals.css        All design tokens, Tailwind v4 @theme, @utility, .article-content
```

---

## Two data sources — understand when to use each

| Source | File | Used by | Contains |
|---|---|---|---|
| `MOCK_ACADEMIES` | `src/lib/mock-data.ts` | Home, Paths, Dashboard | All academies for discovery/UI (no `component` fn) |
| `REGISTRY` | `src/lib/registry.ts` | Content viewer | Academies with real content (`component: () => import(...)`) |

When adding a new real academy: add to BOTH. `MOCK_ACADEMIES` so it appears in navigation; `REGISTRY` so the content viewer can load its modules.

---

## Zustand store

### Progress store (`se-hub-progress` in localStorage)

```ts
academies: Record<string, AcademyProgress>
  └─ modules: Record<string, ModuleProgress>  // keyed by module slug
       └─ { visitedAt, lastVisitedAt, completed }
streak: { current, longest, lastStudiedDate }  // YYYY-MM-DD
totalMinutesStudied: number
lastVisited: { academy, moduleSlug, moduleTitle } | null
```

**Key actions:** `markModuleVisited(academySlug, moduleSlug, title, estimatedMinutes)`, `markModuleComplete(academySlug, moduleSlug)`, `getModuleStatus()` → `'not-started' | 'visited' | 'completed'`, `getAcademyProgress(slug, totalModules?)`

### Hydration pattern (SSR safety)

- `skipHydration: true` — store does NOT auto-hydrate
- `StoreHydrator` client component calls `useProgressStore.persist.rehydrate()` in `useEffect`
- `StoreHydrator` is mounted in `(hub)/layout.tsx`
- All components that read store data use `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])` and gate rendering on `mounted`

**Never** read persisted store values during SSR without the `mounted` guard — will cause hydration mismatches.

### Defensive access

Old localStorage data may have `modules: undefined` (pre-migration shape). All `modules` accesses use optional chaining:
```ts
academies[slug]?.modules?.[moduleSlug]   // ✓
academies[slug]?.modules ?? {}           // ✓
academies[slug]?.modules[moduleSlug]     // ✗ crashes on stale data
```

---

## Content viewer — server/client boundary

The content viewer page (`learn/[academy]/[...slug]/page.tsx`) is a Server Component that:
1. Looks up academy in `REGISTRY` (falls back to `MOCK_ACADEMIES`)
2. `await route.component()` — runs the dynamic import on the server
3. Renders `<Content />` and passes it as **children** to `LearnShell`

```tsx
// Server Component — this is legal
const mod = await route.component();
const Content = mod.default;
const toc = mod.toc ?? [];

<LearnShell academy={...} route={...} toc={toc}>
  <Content />   {/* Server renders this, passes JSX element to client */}
</LearnShell>
```

**Never** pass a React `ComponentType` (function reference) as a prop from Server → Client. Pass the rendered element as `children` instead. Plain serializable objects (`toc: TocItem[]`) can be passed as props.

---

## Adding a new academy module (content file)

Each module file in `src/modules/<academy>/modules/` must:

```tsx
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "section-id", title: "Section Title", level: 2 },  // matches <h2 id="section-id">
  { id: "sub-section", title: "Sub Section", level: 3 },
];

export default function ModuleName() {
  return (
    <div className="article-content">
      <h2 id="section-id">Section Title</h2>
      {/* ... */}
    </div>
  );
}
```

- No `"use client"` — these are Server Components (pure static content)
- `toc` IDs must exactly match the `id` attributes on heading elements
- Use `className="article-content"` on the root `<div>` for prose styling
- Use plain `<pre><code>{...}</code></pre>` for code blocks (backtick template literals work well)
- Use `.tok-*` span classes only if you want VS Code Dark+ syntax highlighting

---

## Design system

### CSS tokens (all in `globals.css`)

```css
--bg-base: #0c0c0f          --text-primary: #f0f0f5
--bg-surface: #13131a       --text-secondary: #a0a0b8
--bg-elevated: #1a1a24      --text-muted: #5a5a78
--accent-primary: #6366f1   --success: #22c55e
--accent-secondary: #818cf8 --warning: #f59e0b
--accent-glow: rgba(...)    --error: #ef4444
```

### Tailwind v4 notes

- No `tailwind.config.ts` — everything lives in `globals.css` under `@theme inline`
- Custom utilities: `@utility glass`, `@utility glow`, `@utility gradient-hero`, `@utility animate-blob-a/b/c`
- Tokens map to Tailwind classes: `bg-base`, `text-primary`, `text-accent`, `text-muted`, `border-border-subtle`, etc.
- `bg-white/[0.04]` for glassmorphism surface fill

### UI primitives (`src/components/ui/`)

`Button`, `Card`, `Badge`, `ProgressBar`, `Skeleton` — all exported from `@/components/ui`.

- `Card` — accepts `hover`, `accent` (left border + radial glow), forwards all `HTMLMotionProps`
- `ProgressBar` — animated with Framer Motion, `value` 0–100, `color` hex, `size` sm/md
- `Badge` — variants: `default`, `accent`, `success`, `warning`

---

## Component patterns

### Shell components accept minimal structural interfaces, not concrete types

`LearnShell` and `LearnSidebar` accept minimal structural interfaces (`ShellAcademy`, `SidebarAcademy`) — not `MockAcademy`. This lets both real registry academies and mock academies pass without adapters.

### Animation conventions

- Page animations: `initial={{ opacity: 0, y: 18 }}` + `animate={{ opacity: 1, y: 0 }}`, `duration: 0.5`
- Stagger lists: `variants` container + item, `staggerChildren: 0.05`
- InView sections: `whileInView`, `viewport: { once: true, margin: "-60px" }`
- Easing: `[0.25, 0.46, 0.45, 0.94]` (custom ease-out)
- Spring nav active pill: `layoutId="nav-active-pill"`, `stiffness: 380, damping: 30`

---

## Testing

Vitest tests live alongside store code: `src/lib/store/progress.store.test.ts`

- `environment: "node"` — no DOM, pure logic only
- `vi.useFakeTimers()` + `vi.setSystemTime()` for streak date logic
- `computeStreak` is exported as a pure function specifically for testability
- Run: `pnpm test`

---

## Known gotchas

1. **`params` is a Promise** — `const { slug } = await params;` not `params.slug`
2. **Tailwind v4** — no config file, add tokens/utilities in `globals.css` only
3. **`moduleCount` vs `routes.length`** — `MockAcademy.moduleCount` may differ from `routes.length` (e.g. `comingSoon` academies have 0 routes but non-zero `moduleCount`). Shell components use `learningPath.length` to avoid this.
4. **`MOCK_TOC` stays in `MockModuleContent.tsx`** — re-exported as `export type { TocItem }` for backward compat; canonical `TocItem` type lives in `src/lib/types/academy.ts`
5. **Framer Motion `animate` import** — `import { animate } from "framer-motion"` (imperative, not the component)
6. **`skipHydration: true`** — without `StoreHydrator`, the store is always empty on first render
