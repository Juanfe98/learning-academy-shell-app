# Data Model: Editor Shell Chrome

## Entities

### Tab

Represents one entry in the open tabs list.

| Field | Type | Source | Notes |
|---|---|---|---|
| `path` | `string` | `fileMap` key | e.g. `./App.tsx`, `./src/utils.ts` |
| `label` | `string` | derived from `path` | filename only (last segment), max 18 chars + ellipsis |
| `isActive` | `boolean` | `path === activeFile` | computed at render |
| `isDirty` | `boolean` | content !== seed content | optional v1 stretch goal |
| `language` | `TabLanguage` | derived from extension | drives icon color dot |

```ts
type TabLanguage = "tsx" | "ts" | "jsx" | "js" | "css" | "other";

interface Tab {
  path: string;
  label: string;
  isActive: boolean;
  language: TabLanguage;
}
```

`Tab` is a derived/view type — not persisted. Computed from `openTabs: string[]` + `activeFile`.

---

### CursorPosition

Sourced from `editor.onDidChangeCursorPosition`.

```ts
interface CursorPosition {
  line: number;   // 1-based (Monaco lineNumber)
  col: number;    // 1-based (Monaco column)
}
```

Default: `{ line: 1, col: 1 }` on mount.

---

### DiagnosticCounts

Sourced from `monaco.editor.getModelMarkers()` on `onDidChangeMarkers`.

```ts
interface DiagnosticCounts {
  errors: number;
  warnings: number;
}
```

Default: `{ errors: 0, warnings: 0 }` on mount (markers may not be ready yet).

---

### BreadcrumbSegment

Derived from `filename` prop. Pure computation — no state.

```ts
interface BreadcrumbSegment {
  label: string;
  isLast: boolean;  // true for the filename segment
}
```

Example for `./src/components/Button.tsx`:
```ts
[
  { label: "challenge", isLast: false },
  { label: "src",       isLast: false },
  { label: "components",isLast: false },
  { label: "Button.tsx",isLast: true  },
]
```

The root segment is always `"challenge"` (the virtual project root).

---

## State Ownership

```
PlaygroundPage.tsx
  ├── fileMap: FileMap                  (existing)
  ├── activeFile: string                (existing)
  ├── openTabs: string[]                (NEW — all fileMap keys initially)
  └── handlers:
       ├── handleTabClose(path)         (NEW)
       ├── handleCreateFile             (existing — must also append to openTabs)
       ├── handleDeleteFile             (existing — must also remove from openTabs)
       ├── handleDeleteFolder           (existing — must also remove affected paths)
       └── handleReset                  (existing — must reset openTabs to seedFileMap keys)

MonacoPlaygroundEditor.tsx
  ├── cursorPos: CursorPosition         (NEW local state)
  ├── diagnostics: DiagnosticCounts    (NEW local state)
  └── (renders)
       ├── EditorTabBar                 (receives openTabs, activeFile, onTabSelect, onTabClose)
       ├── EditorBreadcrumbs            (receives filename)
       ├── Monaco Editor               (existing)
       └── EditorStatusBar             (receives cursorPos, diagnostics, language)
```

---

## Sync Invariants

1. `openTabs` always contains valid paths present in `fileMap` (no stale paths after delete).
2. `activeFile` is always a member of `openTabs`.
3. `openTabs` order is stable (append-only on create; remove-in-place on close/delete).
4. When `openTabs` becomes empty — impossible by constraint: challenges always have ≥1 file in `fileMap`.
