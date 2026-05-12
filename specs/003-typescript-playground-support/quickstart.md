# Developer Quickstart: TypeScript Playground Support

**Feature**: 003-typescript-playground-support

---

## How to add a new TypeScript challenge

### 1. Create the challenge module

```
src/modules/challenges/<your-slug>/
  index.ts
```

### 2. Choose your environment

| Goal | Use environment |
|------|----------------|
| React component with TypeScript | `react-ts` |
| OOP, algorithms, scripting, data structures | `node-ts` |

### 3. `react-ts` challenge template

```ts
import type { Challenge } from "@/lib/challenges/types";

const challenge: Challenge = {
  slug: "my-react-ts-challenge",
  title: "My Challenge",
  description: "...",
  difficulty: "beginner",
  tags: ["typescript", "react"],
  environment: "react-ts",
  entryFile: "App.tsx",       // MUST be .tsx
  files: [
    {
      filename: "types.ts",
      language: "ts",
      content: `export interface MyProps { value: number }`,
    },
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import type { MyProps } from "./types";
function App() { return <div>Hello</div>; }
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `body { margin: 0; }`,
    },
  ],
};

export default challenge;
```

### 4. `node-ts` challenge template

```ts
import type { Challenge } from "@/lib/challenges/types";

const challenge: Challenge = {
  slug: "my-node-ts-challenge",
  title: "My TS Challenge",
  description: "...",
  difficulty: "intermediate",
  tags: ["typescript", "oop"],
  environment: "node-ts",
  entryFile: "index.ts",      // MUST be .ts
  files: [
    {
      filename: "helpers.ts",
      language: "ts",
      content: `export function add(a: number, b: number): number { return a + b; }`,
    },
    {
      filename: "index.ts",
      language: "ts",
      content: `import { add } from "./helpers";
console.log(add(2, 3)); // Expected: 5
`,
    },
  ],
};

export default challenge;
```

### 5. Register the challenge

In `src/lib/challenges/registry.ts`:
```ts
import myChallenge from "@/modules/challenges/my-slug";

export const CHALLENGE_REGISTRY: Challenge[] = [
  reactCounter,
  reactTypedCounter,
  tsOopShapes,
  myChallenge,   // add here
];
```

---

## How transpilation works

The `buildBundle` function in `src/lib/challenges/bundler.ts` processes each file in the `FileMap`:

1. CSS files → concatenated into `css` string (not transpiled)
2. `.js` files → Babel with `env` preset only
3. `.jsx` files → Babel with `react` + `env` presets
4. `.ts` files → Babel with `typescript` + `env` presets
5. `.tsx` files → Babel with `react` + `typescript` + `env` presets

All JS/TS files are wrapped in a CommonJS-compatible module closure. Imports are resolved via the built-in `__resolve` function (handles relative paths, `.tsx`/`.ts`/`.jsx`/`.js` extensions).

---

## Layout behavior

### `react-ts` (same as `react-js`)

```
Left column: File Explorer + Challenge Description
Center:      Code Editor (flex)
Right column: Preview (flex) + Console (220px fixed)
```

### `node-ts`

```
Left column: File Explorer + Challenge Description
Center:      Code Editor (flex)
Right column: Console (flex — fills full right column, no preview)
```

---

## TypeScript limitations (in-scope)

- Type annotations are stripped at transpile time — no type errors shown
- No IntelliSense-level type checking (e.g., no red squiggles for `string` assigned to `number`)
- Autocompletion is local-identifier only (variables/functions in the same file)
- No `@types/*` package support — type imports from node_modules will fail

These are intentional scope constraints for v1. Full LSP integration is a future concern.
