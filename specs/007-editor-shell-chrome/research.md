# Research: Editor Shell — VS Code-Style Chrome

## Monaco Editor APIs

### Cursor Position

**Decision**: Use `editor.onDidChangeCursorPosition(e => e.position)` — fires synchronously on every cursor move.

```ts
editor.onDidChangeCursorPosition((e) => {
  setCursorPos({ line: e.position.lineNumber, col: e.position.column });
});
```

No polling needed. Same-frame update guaranteed.

### Diagnostics (Errors / Warnings)

**Decision**: Use `monaco.editor.onDidChangeMarkers(uris => ...)` + `monaco.editor.getModelMarkers({ resource })` on each change.

```ts
monaco.editor.onDidChangeMarkers(() => {
  const model = editor.getModel();
  if (!model) return;
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const errors   = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
  const warnings = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning).length;
  setDiagnostics({ errors, warnings });
});
```

`MarkerSeverity.Error = 8`, `MarkerSeverity.Warning = 4`. Both are stable constants.

**Alternatives considered**: Polling via `setInterval` — rejected; event-driven is cleaner and matches Monaco's own event model.

### Language Mode

**Decision**: Derive from filename extension at render time — no Monaco API call needed.

```ts
function getLanguageLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return { tsx: "TypeScript", ts: "TypeScript", jsx: "JavaScript", js: "JavaScript", css: "CSS" }[ext] ?? "Plain Text";
}
```

---

## Open Tabs State

### Where state lives

**Decision**: `openTabs: string[]` lives in `PlaygroundPage.tsx` alongside `activeFile` and `fileMap`.

**Rationale**: `PlaygroundPage` is the single source of truth for all editor state. Tab state depends on `fileMap` (must sync when files are created/deleted) and drives `activeFile` (closing active tab must switch to adjacent). Keeping all three in one place avoids cross-component effects.

**Alternatives considered**:
- State in `MonacoPlaygroundEditor` — rejected: editor component doesn't know about file creation/deletion events from `FileExplorer`
- State in `PlaygroundShell` — rejected: shell is a layout component; adding stateful logic there breaks its single responsibility

### Sync rules

| Event | `openTabs` update |
|---|---|
| File created via `handleCreateFile` | Append new path (auto-open) |
| File deleted via `handleDeleteFile` | Remove path; if was active, activate adjacent |
| Folder deleted via `handleDeleteFolder` | Remove all paths under that folder prefix |
| Reset via `handleReset` | Reset to all `seedFileMap` keys |
| User closes tab (×) | Remove path; if was active, activate adjacent |

### Adjacent tab selection on close

When the closed tab is the active file, select the tab immediately to the left, or if none, the tab to the right.

---

## Tab Bar UX

### Horizontal scroll

**Decision**: `overflow-x: auto` on tab container + `flex-nowrap`. Hide scrollbar with CSS (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`). Custom CSS in `globals.css` or inline style.

**Alternatives considered**: Tab wrapping (multiple rows) — rejected; VS Code uses horizontal scroll and this matches the mental model.

### Tab label overflow

**Decision**: Cap tab label at 18 characters with ellipsis (`…`) for very long filenames. Show full name in `title` attribute for tooltip.

### File type icons

**Decision**: Colored 8px dot (inline `div` with `border-radius: 50%`) — no external icon library. Extension → color mapping:

| Extension | Color | Rationale |
|---|---|---|
| `.tsx` | `#61DAFB` | React brand color |
| `.ts` | `#3178C6` | TypeScript brand color |
| `.js` / `.jsx` | `#F7DF1E` | JavaScript brand color |
| `.css` | `#A259FF` | CSS / purple convention |
| other | `#6B7280` | neutral gray |

**Alternatives considered**: lucide-react `FileCode`, `FileText` icons — rejected; colored dots are simpler, smaller, and visually closer to modern IDE tab bars.

---

## Status Bar

### Positioning

**Decision**: Fixed to the bottom of the editor column (`flex-col`, status bar last child). `height: 22px`, `shrink-0`.

**Alternatives considered**: Absolute positioning — rejected; flex layout handles it without z-index concerns.

### Styling

**Decision**: Dark `--bg-surface` background with a top border (`--border-subtle`), NOT the VS Code blue. Accent blue status bar would clash with the project's dark glassmorphism design system. Small accent-colored indicators instead:
- Cursor position: `--text-muted` color
- Language mode: `--text-secondary`
- Errors: `--error` (#ef4444) 
- Warnings: `--warning` (#f59e0b)

---

## Breadcrumbs

### Path parsing

**Decision**: Strip `./` prefix, split on `/`, last segment is the filename.

```ts
const parts = filename.replace(/^\.\//, "").split("/");
// ["src", "components", "Button.tsx"]
```

**Non-interactive in v1**: No click handlers. Static display. Future: clicking a folder segment could open it in file explorer.

---

## Prop Threading

### `MonacoPlaygroundEditor` new props

```ts
openTabs: string[]
onTabSelect: (path: string) => void
onTabClose: (path: string) => void
```

### `PlaygroundShell.CodeEditor` prop type

The `CodeEditor` generic type in `PlaygroundShell` must be extended to include the three new tab props. This keeps `PlaygroundShell` type-safe without making tab props optional.

### No new npm packages

All implementation uses existing dependencies: `@monaco-editor/react`, `lucide-react` (if needed for close icon), React hooks, and Tailwind v4 tokens.
