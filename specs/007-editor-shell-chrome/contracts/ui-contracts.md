# UI Contracts: Editor Shell Chrome

## EditorTabBar

```ts
interface EditorTabBarProps {
  openTabs: string[];        // ordered list of file paths (fileMap keys)
  activeFile: string;        // currently active path
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}
```

**Must be `React.memo`** — parent `MonacoPlaygroundEditor` re-renders on every cursor move. `EditorTabBar` only needs to re-render when `openTabs` or `activeFile` change. `React.memo` with default shallow comparison handles this since `openTabs` is a stable array ref (only replaced on mutation) and `activeFile` is a string.

**`onTabSelect` / `onTabClose` must be `useCallback`** in `PlaygroundPage` — otherwise `React.memo` is bypassed every render.

**Tab list derivation — `useMemo` inside component:**
```ts
// Module-scope pure function (outside component)
function toTab(path: string, activeFile: string): Tab {
  const label = path.replace(/^\.\//, "").split("/").pop() ?? path;
  return {
    path,
    label: label.length > 18 ? label.slice(0, 17) + "…" : label,
    isActive: path === activeFile,
    language: getFileLanguage(path),  // module-scope pure fn
  };
}

// Inside component
const tabs = useMemo(
  () => openTabs.map(p => toTab(p, activeFile)),
  [openTabs, activeFile]
);
```

**Rendering rules:**
- One tab per `openTabs` entry, in order
- Active tab: accent underline (`border-bottom: 2px solid var(--accent-primary)`) + slightly brighter label
- Inactive tabs: `--text-muted` label color
- Close button (×): shown only when `openTabs.length > 1`; clicking calls `onTabClose(path)`
- Container: `overflow-x: auto`, `flex-nowrap`, hidden scrollbar
- Background: `var(--bg-surface)`, bottom border: `1px solid var(--border-subtle)`
- Height: `34px`

---

## EditorBreadcrumbs

```ts
interface EditorBreadcrumbsProps {
  filename: string;  // e.g. "./src/components/Button.tsx"
}
```

**Must be `React.memo`** — only needs to re-render when `filename` changes (tab switch), not on cursor moves.

**Segment derivation — `useMemo` inside component:**
```ts
// Module-scope pure function
function toBreadcrumbs(filename: string): BreadcrumbSegment[] {
  const parts = ["challenge", ...filename.replace(/^\.\//, "").split("/")];
  return parts.map((label, i) => ({ label, isLast: i === parts.length - 1 }));
}

// Inside component
const segments = useMemo(() => toBreadcrumbs(filename), [filename]);
```

**Rendering rules:**
- Parse into segments: strip `./`, split on `/`, prepend `"challenge"` as virtual root
- Separator: `›` character with `--text-muted` color
- Non-last segments: `--text-muted` color
- Last segment (filename): `--text-secondary` color, no separator after
- No click handlers
- Background: `var(--bg-elevated)`, bottom border: `1px solid var(--border-subtle)`
- Height: `24px`, font-size `11px`, `font-mono`

---

## EditorStatusBar

```ts
interface EditorStatusBarProps {
  line: number;
  col: number;
  language: string;   // "TypeScript" | "JavaScript" | "CSS" | "Plain Text"
  errors: number;
  warnings: number;
}
```

**Must be `React.memo`** — receives primitive props only (`number`, `string`). React.memo with default shallow comparison correctly skips re-renders when values haven't changed (e.g. cursor didn't move line/col).

**No internal memoization needed** — all props are primitives, rendering is O(1).

**Rendering rules:**
- Left: `Ln {line}, Col {col}` — `--text-muted`, font-mono
- Center-right: `{language}` — `--text-secondary`
- Right: 
  - If errors > 0: `⨯ {errors}` in `--error` color (`#ef4444`)
  - If warnings > 0: `⚠ {warnings}` in `--warning` color (`#f59e0b`)
  - If both 0: nothing shown (or `⨯ 0` dimmed — impl choice)
- Background: `var(--bg-surface)`, top border: `1px solid var(--border-subtle)`
- Height: `22px`, font-size `11px`, font-mono, `px-3`

---

## MonacoPlaygroundEditor (updated)

```ts
interface MonacoPlaygroundEditorProps {
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;
  onFileNavigate?: (path: string) => void;
  // NEW:
  openTabs: string[];
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}
```

**Internal state (new):**
```ts
const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
const [diagnostics, setDiagnostics] = useState({ errors: 0, warnings: 0 });
```

**Language label — `useMemo` (not state):**
```ts
// Module-scope pure function
function getLanguageLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return { tsx: "TypeScript", ts: "TypeScript", jsx: "JavaScript", js: "JavaScript", css: "CSS" }[ext] ?? "Plain Text";
}

// Inside MonacoPlaygroundEditor
const language = useMemo(() => getLanguageLabel(filename), [filename]);
```

**`React.memo` on sub-components** — `EditorTabBar`, `EditorBreadcrumbs`, and `EditorStatusBar` are all `React.memo`. Cursor position state updates in `MonacoPlaygroundEditor` will NOT cascade into tab/breadcrumb re-renders.

**Stable state object reads** — `cursorPos` is read destructured at render time:
```ts
// Pass primitives down — not the whole cursorPos object
<EditorStatusBar line={cursorPos.line} col={cursorPos.col} ... />
```

**Layout:**
```
┌─────────────────────────────────┐
│ EditorTabBar (34px)             │
├─────────────────────────────────┤
│ EditorBreadcrumbs (24px)        │
├─────────────────────────────────┤
│                                 │
│   Monaco Editor (flex: 1)       │
│                                 │
├─────────────────────────────────┤
│ EditorStatusBar (22px)          │
└─────────────────────────────────┘
```

---

## PlaygroundShell CodeEditor prop type (updated)

```ts
CodeEditor: React.ComponentType<{
  filename: string;
  value: string;
  onChange: (value: string) => void;
  fileMap?: FileMap;
  onFileNavigate?: (path: string) => void;
  // NEW:
  openTabs: string[];
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}>;
```

**PlaygroundShell** must also receive and thread:
```ts
openTabs: string[];
onTabSelect: (path: string) => void;
onTabClose: (path: string) => void;
```

---

## PlaygroundPage state additions

```ts
// NEW state
const [openTabs, setOpenTabs] = useState<string[]>(() => Object.keys(seedFileMap));

// handleTabClose — useCallback required (passed as prop → React.memo dependency)
const handleTabClose = useCallback((path: string) => {
  setOpenTabs(prev => {
    const idx = prev.indexOf(path);
    const next = prev.filter(p => p !== path);
    if (activeFile === path && next.length > 0) {
      setActiveFile(next[Math.max(0, idx - 1)]);
    }
    return next;
  });
}, [activeFile]);  // activeFile needed for the active-tab check

// handleCreateFile — existing useCallback, extend to also append to openTabs
setOpenTabs(prev => prev.includes(fullPath) ? prev : [...prev, fullPath]);

// handleDeleteFile — existing useCallback, extend to remove from openTabs
setOpenTabs(prev => prev.filter(p => p !== path));

// handleDeleteFolder — existing useCallback, extend to remove affected paths
setOpenTabs(prev => prev.filter(p => p !== folderPath && !p.startsWith(prefix)));

// handleReset — existing useCallback, extend to reset openTabs
setOpenTabs(Object.keys(seedFileMap));
```

**Why `useCallback` on `handleTabClose`**: `EditorTabBar` is `React.memo`. If `onTabClose` is a new function reference each render, `React.memo` is bypassed on every `PlaygroundPage` re-render. `useCallback` gives it a stable ref that only changes when `activeFile` changes.

**`onTabSelect`**: `setActiveFile` is already stable (React state setter). Pass it directly — no `useCallback` wrapper needed.
