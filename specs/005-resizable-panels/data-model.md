# Data Model: Resizable Playground Panels

## Overview

No new persisted data types are introduced in v1. The feature operates on **layout configuration constants** and **React component structure** only. Panel sizes are ephemeral — held in library-managed state and reset on page navigation.

---

## Panel Configuration Constants

Defined once, co-located with `PlaygroundShell`.

```ts
/** Percentage sizes for the horizontal PanelGroup (left | editor | right). */
export const PANEL_DEFAULTS = {
  left:   { default: 20, min: 12 },   // file explorer + description
  editor: { default: 55, min: 25 },   // Monaco editor
  right:  { default: 25, min: 18 },   // preview + console + tests
} as const;

/** Percentage sizes for the vertical PanelGroup inside the right column.
 *  Only rendered for react-js / react-ts environments (preview is visible). */
export const RIGHT_PANEL_DEFAULTS = {
  preview: { default: 60, min: 20 },
  console: { default: 40, min: 20 },  // console + test panel as a unit
} as const;
```

## Panel Identity

| ID | Direction | Content | Resizable |
|---|---|---|---|
| `left` | horizontal | FileExplorer + ChallengeDescription | ✓ |
| `editor` | horizontal | MonacoPlaygroundEditor | ✓ |
| `right` | horizontal | Preview + Console + Tests | ✓ |
| `preview` | vertical (inside `right`) | PlaygroundPreviewFrame | ✓ react only |
| `console` | vertical (inside `right`) | PlaygroundConsolePanel + PlaygroundTestPanel | ✓ react only |

## Environment-Conditional Layout

| Environment | Horizontal resize | Vertical resize in right column |
|---|---|---|
| `react-js` | ✓ (all 3 columns) | ✓ (preview vs console) |
| `react-ts` | ✓ (all 3 columns) | ✓ (preview vs console) |
| `node-ts` | ✓ (all 3 columns) | ✗ (right column is single panel: console+tests) |

## State Lifecycle

- Panel sizes are owned by `react-resizable-panels` internal state.
- Sizes reset to defaults when `PlaygroundPage` remounts (which happens on challenge navigation due to `key={challenge.slug}`).
- No interaction with Zustand stores.
- `autoSaveId` is intentionally NOT set in v1 — persistence deferred.
