# Data Model: Coding Challenge Playground

**Phase**: 1 — Design  
**Date**: 2026-05-10

---

## Entities

### Challenge

Represents a curated coding problem.

```ts
interface Challenge {
  slug: string;           // URL-safe identifier, e.g. "react-counter"
  title: string;
  description: string;    // Markdown prose — the problem statement
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];         // e.g. ["hooks", "state", "events"]
  environment: "react-js";// extensible: future "html-css-js" etc.
  files: ChallengeFile[]; // ordered; first file shown on load
  entryFile: string;      // filename of the React entry point, e.g. "App.jsx"
}
```

### ChallengeFile

A single file within a challenge.

```ts
interface ChallengeFile {
  filename: string;       // e.g. "App.jsx", "utils.js", "styles.css"
  language: "jsx" | "js" | "css";
  content: string;        // starting code — the template the user edits
  readOnly?: boolean;     // true for scaffolding files user shouldn't touch
}
```

### ChallengeSession

The user's in-progress edit state, persisted to localStorage.

```ts
interface ChallengeSession {
  // keyed by slug → filename → current content
  [slug: string]: {
    [filename: string]: string;
  };
}

// Full store shape
interface ChallengeStoreState {
  sessions: ChallengeSession;
  // actions
  setFileContent: (slug: string, filename: string, content: string) => void;
  getFileContent: (slug: string, filename: string, original: string) => string;
  resetChallenge: (slug: string, files: ChallengeFile[]) => void;
}
```

### ConsoleEntry

An in-memory entry rendered in the ConsolePanel — not persisted.

```ts
interface ConsoleEntry {
  id: string;             // crypto.randomUUID() for React keys
  method: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: number;
}
```

---

## Validation Rules

- `slug` must be URL-safe (kebab-case, alphanumeric + hyphens)
- `entryFile` must match a `filename` in `files[]`
- `files[]` must have at least one entry
- `content` may be empty string (blank starting template is valid)
- `sessions` values are overwritten on reset (no merge)

---

## State Transitions

### Challenge Session lifecycle

```
[page load]
    │
    ▼
getFileContent(slug, file, original)
    │
    ├─ session exists → return saved content
    └─ no session    → return original content (from Challenge.files)
    │
    ▼
[user edits code]
    │
    ▼
setFileContent(slug, filename, newContent)  ← debounced 500ms for preview
    │
    ▼
[persisted to localStorage]
    │
    ▼
[user clicks reset]
    │
    ▼
resetChallenge(slug, files)  ← wipes all files for this slug back to original
```

---

## Relationships

```
Challenge (1) ──────── (N) ChallengeFile
Challenge (1) ──────── (1) ChallengeSession entry [in store, keyed by slug]
ChallengeSession ────── (N) filename → content entries
PreviewFrame ──── consumes ──── ChallengeFile[].content (transpiled)
ConsolePanel ──── consumes ──── ConsoleEntry[] (in-memory, cleared on each run)
```
