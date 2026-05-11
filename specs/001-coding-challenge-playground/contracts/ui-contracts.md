# UI Contracts: Coding Challenge Playground

**Phase**: 1 — Design  
**Date**: 2026-05-10

These contracts define the props interface for each major component. They are the boundary between the page (data orchestration) and the UI panels (display/interaction).

---

## PlaygroundShell

Top-level layout component. Owns the 5-panel split layout. Receives all data as props; delegates events to parent page via callbacks.

```ts
interface PlaygroundShellProps {
  challenge: Challenge;
  activeFile: string;                          // currently selected filename
  files: Record<string, string>;               // filename → current content (editable)
  consoleEntries: ConsoleEntry[];
  onFileSelect: (filename: string) => void;
  onCodeChange: (filename: string, content: string) => void;
  onReset: () => void;
}
```

**Layout contract**: 5 panels always visible simultaneously on desktop:
- Left column: FileExplorer (fixed ~200px) + ChallengeDescription (scrollable)
- Center: CodeEditor (flex-grow)
- Right column: PreviewFrame (flex-grow) stacked over ConsolePanel (fixed ~200px)

---

## FileExplorer

```ts
interface FileExplorerProps {
  files: ChallengeFile[];    // ordered list from challenge definition
  activeFile: string;        // currently selected filename (highlighted)
  onFileSelect: (filename: string) => void;
}
```

**Contract**: Renders a flat list (tree for v1 is single-level). Click fires `onFileSelect`. Active file is visually distinguished.

---

## ChallengeDescription

```ts
interface ChallengeDescriptionProps {
  title: string;
  description: string;       // markdown string rendered as prose
  difficulty: Challenge["difficulty"];
  tags: string[];
}
```

**Contract**: Read-only panel. Renders `description` as formatted prose (markdown). No user input.

---

## CodeEditor

```ts
interface CodeEditorProps {
  filename: string;          // shown in editor header/tab
  value: string;             // current content — controlled
  language: ChallengeFile["language"];
  onChange: (newValue: string) => void;
}
```

**Contract**: Controlled editor. Every keystroke fires `onChange`. Component is loaded with `ssr: false`.

---

## PreviewFrame

```ts
interface PreviewFrameProps {
  code: string;              // transpiled JS string ready to inject
  entryFile: string;         // filename of entry point (for labeling only)
  onConsoleMessage: (entry: ConsoleEntry) => void;
  onError: (entry: ConsoleEntry) => void;
}
```

**Contract**: Manages the sandboxed iframe lifecycle. On `code` change, regenerates `srcdoc` and reloads the iframe. Listens for `message` events and routes to `onConsoleMessage` / `onError`. Does NOT run transpilation — receives pre-compiled code.

---

## ConsolePanel

```ts
interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}
```

**Contract**: Read-only log display. Renders entries in order with method-appropriate styling (warn = yellow, error = red, log/info = default). `onClear` empties the entries list (state owned by parent).

---

## Page-level data flow

```
/playground/[slug]/page.tsx  (Server Component)
    │
    ├─ looks up Challenge from registry by slug
    ├─ passes Challenge as prop to PlaygroundPage (Client Component)
    │
    └─ PlaygroundPage  ("use client")
           │
           ├─ reads/writes ChallengeStore (Zustand)
           ├─ owns: activeFile, consoleEntries (useState)
           ├─ transpiles active file with Sucrase on code change (debounced)
           │
           └─ renders PlaygroundShell (pure layout)
```

**Key rule**: Transpilation happens in `PlaygroundPage`, not inside `PreviewFrame`. `PreviewFrame` receives already-compiled code and is a dumb iframe manager.
