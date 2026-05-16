# Developer Quickstart: Editor Shell Chrome

## What's being built

3 new components + prop threading across 3 existing files. No new packages.

```
NEW:
  src/components/hub/playground/EditorTabBar.tsx
  src/components/hub/playground/EditorBreadcrumbs.tsx
  src/components/hub/playground/EditorStatusBar.tsx

MODIFIED:
  src/components/hub/playground/MonacoPlaygroundEditor.tsx   (add chrome, new props)
  src/components/hub/playground/PlaygroundShell.tsx          (thread new props)
  src/app/(hub)/playground/[slug]/PlaygroundPage.tsx         (add openTabs state)
```

## Implementation order (dependency-driven)

```
1. EditorBreadcrumbs       — no deps, pure presentational
2. EditorStatusBar         — no deps, receives props from parent
3. EditorTabBar            — no deps, receives props from parent
4. MonacoPlaygroundEditor  — wire all 3 new components, add Monaco events, new props
5. PlaygroundShell         — thread new props through to CodeEditor
6. PlaygroundPage          — add openTabs state + sync logic
```

## Key file paths

| File | Role |
|---|---|
| `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` | State owner for `openTabs` |
| `src/components/hub/playground/PlaygroundShell.tsx` | Layout shell — threads props |
| `src/components/hub/playground/MonacoPlaygroundEditor.tsx` | Editor chrome host |
| `src/lib/editor/monaco-config.ts` | Monaco theme/options (read-only for this feature) |

## React performance rules (non-negotiable)

### Why this matters here
`MonacoPlaygroundEditor` re-renders on **every cursor move** (cursor state update). Without memoization, `EditorTabBar` and `EditorBreadcrumbs` re-render hundreds of times per second while the user types.

### Rules

| What | How | Why |
|---|---|---|
| `EditorTabBar` | `export default React.memo(EditorTabBar)` | Skips re-render when `openTabs`/`activeFile` unchanged |
| `EditorBreadcrumbs` | `export default React.memo(EditorBreadcrumbs)` | Only re-renders on tab switch |
| `EditorStatusBar` | `export default React.memo(EditorStatusBar)` | Skips when `line`/`col` unchanged (same position) |
| Tab list derivation | `useMemo(() => openTabs.map(...), [openTabs, activeFile])` | Array rebuilt only when tabs change |
| Breadcrumb segments | `useMemo(() => toBreadcrumbs(filename), [filename])` | Parsed only on tab switch |
| Language label | `useMemo(() => getLanguageLabel(filename), [filename])` | Not recomputed on cursor move |
| `handleTabClose` | `useCallback(..., [activeFile])` in `PlaygroundPage` | Stable ref → `React.memo` works |
| `onTabSelect` | Pass `setActiveFile` directly | React state setters are already stable |

### Pure utility functions — define at module scope

```ts
// Outside components — no closure, no recreation
function getFileLanguage(path: string): TabLanguage { ... }
function getLanguageLabel(filename: string): string { ... }
function toTab(path: string, activeFile: string): Tab { ... }
function toBreadcrumbs(filename: string): BreadcrumbSegment[] { ... }
```

Defining these inside components would recreate them every render even with `useCallback`.

### Pass primitives to status bar, not objects

```ts
// ✓ primitives — React.memo shallow comparison works
<EditorStatusBar line={cursorPos.line} col={cursorPos.col} ... />

// ✗ object — new reference every render, defeats React.memo
<EditorStatusBar cursorPos={cursorPos} ... />
```

---

## Monaco event wiring (inside `handleMount`)

```ts
// Cursor position
disposablesRef.current.push(
  editor.onDidChangeCursorPosition((e) => {
    setCursorPos({ line: e.position.lineNumber, col: e.position.column });
  })
);

// Diagnostics
disposablesRef.current.push(
  monacoInstance.editor.onDidChangeMarkers(() => {
    const model = editor.getModel();
    if (!model) return;
    const markers = monacoInstance.editor.getModelMarkers({ resource: model.uri });
    setDiagnostics({
      errors:   markers.filter(m => m.severity === monacoInstance.MarkerSeverity.Error).length,
      warnings: markers.filter(m => m.severity === monacoInstance.MarkerSeverity.Warning).length,
    });
  })
);
```

Both go into `disposablesRef` — auto-cleaned on unmount (existing pattern).

## openTabs sync in PlaygroundPage

```ts
// Initial value
const [openTabs, setOpenTabs] = useState<string[]>(() => Object.keys(seedFileMap));

// Needed in each mutation handler — see contracts/ui-contracts.md for exact diffs
```

## Verify

```bash
pnpm build    # TypeScript — no errors
pnpm dev      # Open /playground/[any-slug], verify:
              #   - tabs appear for all files
              #   - clicking tabs switches file
              #   - status bar shows Ln/Col + errors
              #   - breadcrumbs update on tab switch
```
