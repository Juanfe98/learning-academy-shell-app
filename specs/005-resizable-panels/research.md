# Research: Resizable Playground Panels

## Library Evaluation

### Decision: `react-resizable-panels` v4.11.0

**Rationale**:
- Zero external dependencies; gzip footprint ~10.9 kb
- Peer-compatible with the project's React 19.2.4 (`peerDependencies: "^18 || ^19"`)
- Percentage-based sizing — panels scale correctly on window resize without recalculating pixel values
- Provides `Panel`, `PanelGroup`, `PanelResizeHandle` primitives; all visual styling is opt-in (no CSS file to import)
- Written by Brian Vaughn (React DevTools), actively maintained (v4.x released 2024–2025)
- Native TypeScript types included in the package

**Alternatives considered**:

| Option | Why Rejected |
|---|---|
| Custom `pointermove` implementation | More code to maintain; tricky edge cases (drag release outside window, min-size enforcement, nested panels). Not justified when a well-tested library exists. |
| `allotment` | Designed for VS Code-style editors; heavier; harder to customize the divider style to match SE Hub's dark glassmorphism design. |
| `re-resizable` | Resizes individual elements, not panel groups. Not suitable for a coordinated 3-column layout. |
| `split.js` | Vanilla JS; needs a React wrapper; no percentage-layout out of the box; less maintained. |

---

## Layout Architecture

### Current layout (fixed widths, `PlaygroundShell.tsx`)

```
┌─ h-screen flex-col ──────────────────────────────────────────┐
│ [Top bar]                                                      │
│ ┌─ flex flex-1 min-h-0 ───────────────────────────────────┐  │
│ │ [Left 280px fixed] │ [Center flex-1] │ [Right 380px fixed]│  │
│ │                    │                 │  ┌─ preview flex-1 ┐ │
│ │                    │                 │  └─ console fixed  ─ │
│ │                    │                 │  [test panel?]     │  │
│ └────────────────────┴─────────────────┴────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Proposed layout (resizable, `react-resizable-panels`)

```
┌─ h-screen flex-col ──────────────────────────────────────────┐
│ [Top bar — unchanged]                                          │
│ ┌─ PanelGroup horizontal flex-1 min-h-0 ─────────────────┐   │
│ │ Panel(left) │handle│ Panel(editor) │handle│ Panel(right) │   │
│ │             │      │               │      │ PanelGroup   │   │
│ │             │      │               │      │   vertical   │   │
│ │             │      │               │      │ Panel(prev)  │   │
│ │             │      │               │      │ handle       │   │
│ │             │      │               │      │ Panel(cons.) │   │
│ └─────────────┘──────┘───────────────┘──────┘──────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Default panel sizes (percentage of container)

Derived from current fixed widths at a reference viewport of 1440px:

| Panel | Current px | Default % | Min % | Notes |
|---|---|---|---|---|
| Left column | 280 | 20 | 12 | File explorer + description as a unit |
| Editor | ~780 | 55 | 25 | Monaco editor — needs room for code |
| Right column | 380 | 25 | 18 | Preview + console + tests |

Vertical split within right column (react environments only):

| Panel | Default % | Min % |
|---|---|---|
| Preview iframe | 60 | 20 |
| Console (+tests) | 40 | 20 |

### node-ts environment

For `node-ts` challenges the preview is hidden and the right column only contains console + tests. No vertical resize handle is needed in that case — the right column is a single full-height panel.

---

## Drag Handle Visual Design

`PanelResizeHandle` renders as an empty element by default; all styling is provided by the consumer.

Design contract for SE Hub's dark glassmorphism theme:

- **Vertical dividers** (between columns): 4px wide, `background: transparent`, centered 2px highlight visible on hover (`rgba(255,255,255,0.08)`), cursor `col-resize`
- **Horizontal divider** (preview vs console): 4px tall, same treatment with `row-resize` cursor
- On active drag: highlight brightens to `rgba(99,102,241,0.4)` (accent-primary tint)
- No grab icons — the thin line is sufficient; cursor change is the affordance

---

## API Sketch

```tsx
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Vertical column divider
function ColHandle() {
  return (
    <PanelResizeHandle
      style={{ width: 4, cursor: "col-resize" }}
      className="group"
    >
      <div
        style={{ width: 1, margin: "0 auto", height: "100%",
                 background: "var(--border-subtle)", transition: "background 150ms" }}
        className="group-hover:!bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active]:!bg-[rgba(99,102,241,0.5)]"
      />
    </PanelResizeHandle>
  );
}

// Horizontal row divider (preview / console)
function RowHandle() {
  return (
    <PanelResizeHandle
      style={{ height: 4, cursor: "row-resize" }}
      className="group"
    >
      <div
        style={{ height: 1, width: "100%", margin: "auto",
                 background: "var(--border-subtle)", transition: "background 150ms" }}
        className="group-hover:!bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active]:!bg-[rgba(99,102,241,0.5)]"
      />
    </PanelResizeHandle>
  );
}
```

The library sets `data-resize-handle-active` on the handle element during drag — this is used for the active drag highlight.

---

## Key Findings

- **No CSS import required** — library is style-agnostic.
- **`autoSaveId`** prop on `PanelGroup` can persist sizes to `localStorage` for free; deferred to v2 per spec.
- **`onLayout`** callback fires on every size change — can be used for future analytics or persistence.
- **Monaco's `automaticLayout: true`** handles editor re-layout when panel width changes — no manual resize trigger needed.
- **iframe (preview)** also reflows naturally when its container resizes.
- The library handles pointer capture and drag release outside the window gracefully — no custom event cleanup needed.
