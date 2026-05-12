# UI Contracts: Resizable Playground Panels

## Affected Components

Only `PlaygroundShell` changes. All child components (`MonacoPlaygroundEditor`, `PlaygroundPreviewFrame`, `PlaygroundConsolePanel`, `PlaygroundTestPanel`, `FileExplorer`, `ChallengeDescription`) are **unchanged** — they receive the same props as before.

---

## `PlaygroundShell` — Updated Layout Contract

### Props Interface (unchanged)

The `Props` interface of `PlaygroundShell` does **not** change. No new props are added; the layout change is internal.

### Layout Behaviour Contract

**Before (fixed widths)**:
- Left column: always `280px`
- Right column: always `380px`
- Editor: remaining space

**After (resizable)**:
- Left column: `20%` default, `12%` minimum, draggable
- Editor: `55%` default, `25%` minimum, draggable
- Right column: `25%` default, `18%` minimum, draggable
- Preview (within right, react envs): `60%` default, `20%` minimum, draggable
- Console+tests (within right, react envs): `40%` default, `20%` minimum, draggable

### Visual Divider Contract

```
Divider state      │ Width/Height │ Line color
───────────────────┼──────────────┼──────────────────────────
Idle               │ 4px / 4px    │ var(--border-subtle)
Hover              │ 4px / 4px    │ rgba(99,102,241,0.4)
Active drag        │ 4px / 4px    │ rgba(99,102,241,0.5)
```

- Cursor: `col-resize` for vertical dividers, `row-resize` for horizontal
- The clickable/draggable zone is 4px wide but the visible line is 1px (centered)
- No icons, labels, or collapse buttons in v1

### Vertical Divider (right column, react environments)

- Shown **only** when `challenge.environment !== "node-ts"`
- The right column wraps its contents in a vertical `PanelGroup`
- The hidden preview div (currently `display: none`) is replaced by a `Panel` that is conditionally excluded from the group for node-ts

### Environment Handling (right column)

```
react-js / react-ts:
  PanelGroup(vertical)
    Panel(preview)   ← PlaygroundPreviewFrame (visible)
    RowHandle
    Panel(console)   ← PlaygroundConsolePanel + PlaygroundTestPanel

node-ts:
  <div flex-1>       ← single unsplit container
    PlaygroundConsolePanel (flex-1)
    PlaygroundTestPanel (shrink-0, if hasTests)
```

---

## `ResizeHandle` Components

Two new thin presentational components, no props:

### `ColHandle`
- Renders a `PanelResizeHandle` with a 4px-wide hit area and a 1px visible line
- Used between left↔editor and editor↔right

### `RowHandle`
- Renders a `PanelResizeHandle` with a 4px-tall hit area and a 1px visible line
- Used between preview↔console inside the right column

Both components are co-located in `PlaygroundShell.tsx` (not exported — internal only).

---

## Dependency

```
pnpm add react-resizable-panels
```

Required before any implementation tasks begin.
