# Developer Quickstart: Resizable Playground Panels

## What this feature does

Replaces the fixed-width column layout in `PlaygroundShell` with draggable resizable panels using `react-resizable-panels`. No new props, stores, or API changes — pure layout refactor inside one component.

## Prerequisite

```bash
pnpm add react-resizable-panels
```

Version `4.11.0` (compatible with React 19.2.4).

## Files changed

| File | Change |
|---|---|
| `src/components/hub/playground/PlaygroundShell.tsx` | Replace flex layout with `PanelGroup` + `Panel` + `PanelResizeHandle` |

No other files change.

## Key API

```ts
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
```

| Component | Props used | Notes |
|---|---|---|
| `PanelGroup` | `direction` (`"horizontal"` / `"vertical"`) | Wraps sibling panels |
| `Panel` | `defaultSize` (%), `minSize` (%) | Sizes are percentages |
| `PanelResizeHandle` | children (visual handle UI) | Fully style-it-yourself |

## Panel size constants

See `data-model.md` for the exact default/min values. Import or inline them in `PlaygroundShell.tsx`.

## Environment-conditional vertical split

```tsx
const isReact = challenge.environment !== "node-ts";

// Right column content:
{isReact ? (
  <PanelGroup direction="vertical">
    <Panel defaultSize={60} minSize={20}>
      <PlaygroundPreviewFrame ... />
    </Panel>
    <RowHandle />
    <Panel defaultSize={40} minSize={20}>
      <ConsoleAndTests ... />
    </Panel>
  </PanelGroup>
) : (
  <div className="flex flex-col flex-1 min-h-0">
    <PlaygroundConsolePanel ... />
    {hasTests && <PlaygroundTestPanel ... />}
  </div>
)}
```

## Drag handle visual (copy-paste ready)

```tsx
function ColHandle() {
  return (
    <PanelResizeHandle style={{ width: 4, cursor: "col-resize" }} className="group flex items-stretch">
      <div
        style={{ width: 1, background: "var(--border-subtle)", transition: "background 150ms", margin: "0 auto" }}
        className="group-hover:!bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active=pointer]:!bg-[rgba(99,102,241,0.5)]"
      />
    </PanelResizeHandle>
  );
}

function RowHandle() {
  return (
    <PanelResizeHandle style={{ height: 4, cursor: "row-resize" }} className="group flex flex-col justify-center">
      <div
        style={{ height: 1, background: "var(--border-subtle)", transition: "background 150ms" }}
        className="group-hover:!bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active=pointer]:!bg-[rgba(99,102,241,0.5)]"
      />
    </PanelResizeHandle>
  );
}
```

Note: the library sets `data-resize-handle-active="pointer"` during mouse drag (not just `data-resize-handle-active`).

## Monaco editor

Monaco has `automaticLayout: true` in `getEditorOptions()`. It polls for container size changes and reflows automatically — no action needed when panel width changes.

## Preview iframe

The iframe reflows naturally when its CSS container resizes — no special handling needed.

## Verify

```bash
pnpm build   # TypeScript check
pnpm dev     # Manual test — drag dividers, check all environments
```

Manual verification checklist:
- [ ] Drag editor ↔ preview divider — preview grows, editor shrinks
- [ ] Drag file explorer ↔ editor divider — works independently
- [ ] Drag preview ↔ console divider (react challenge) — heights adjust
- [ ] Open `node-ts` challenge — no horizontal divider in right column
- [ ] Monaco editor content still editable at all panel widths
- [ ] Preview still renders at all panel widths
- [ ] Console still receives log output at all panel widths
- [ ] Navigate between challenges — panel sizes reset to defaults
