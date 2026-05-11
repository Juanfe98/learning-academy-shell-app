# Contract: UI Component Changes

**Feature**: 003-typescript-playground-support  
**Date**: 2026-05-11

---

## `PlaygroundShell` — updated props

No new props needed. `challenge.environment` is already available via the existing `challenge: Challenge` prop.

**Layout change**: When `challenge.environment === 'node-ts'`:

```
Before (react-js / react-ts):
┌─────────────┬──────────────────────┬──────────────────┐
│ File        │                      │ Preview (flex-1) │
│ Explorer    │    Code Editor       ├──────────────────┤
│ +           │    (flex-1)          │ Console (220px)  │
│ Description │                      │                  │
└─────────────┴──────────────────────┴──────────────────┘

After (node-ts):
┌─────────────┬──────────────────────┬──────────────────┐
│ File        │                      │                  │
│ Explorer    │    Code Editor       │ Console (flex-1) │
│ +           │    (flex-1)          │                  │
│ Description │                      │                  │
└─────────────┴──────────────────────┴──────────────────┘
```

**Implementation**: conditional render of `<PlaygroundPreviewFrame>` + conditional `className`/`style` on the console wrapper.

---

## `PlaygroundListPage` — TypeScript badge

Each challenge card gains an environment indicator badge alongside the existing difficulty badge:

| `environment` | Badge text | Badge style |
|--------------|------------|-------------|
| `react-js`   | (no badge) | — |
| `react-ts`   | `TS`       | accent (blue-indigo) |
| `node-ts`    | `TS`       | accent (blue-indigo) |

Implementation: `challenge.environment !== 'react-js'` → render a small `TS` badge using the existing `Badge` component or an inline styled `<span>`.

---

## `PlaygroundPage.tsx` — `buildBundle` call

```ts
// Before
const { bundle, css, error } = await buildBundle(map, normalizedEntry);

// After
const { bundle, css, error } = await buildBundle(map, normalizedEntry, challenge.environment);
```

---

## `handleCreateFile` — language detection

```ts
// Before
const lang: FileEntry["language"] = ext === "css" ? "css" : ext === "js" ? "js" : "jsx";

// After
const lang: FileEntry["language"] =
  ext === "css" ? "css" :
  ext === "ts"  ? "ts"  :
  ext === "tsx" ? "tsx" :
  ext === "js"  ? "js"  : "jsx";
```
