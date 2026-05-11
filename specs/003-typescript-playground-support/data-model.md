# Data Model: TypeScript Playground Support

**Feature**: 003-typescript-playground-support  
**Date**: 2026-05-11

---

## Extended Types (`src/lib/challenges/types.ts`)

### `ChallengeFile` — extended `language` union

```ts
export interface ChallengeFile {
  filename: string;
  language: "jsx" | "js" | "css" | "ts" | "tsx";  // +ts, +tsx
  content: string;
  readOnly?: boolean;
}
```

### `Challenge` — extended `environment` union

```ts
export interface Challenge {
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  environment: "react-js" | "react-ts" | "node-ts";  // +react-ts, +node-ts
  files: ChallengeFile[];
  entryFile: string;
}
```

**Environment semantics**:

| Environment | Preview Panel | TypeScript | JSX | Entry Execution |
|-------------|--------------|------------|-----|-----------------|
| `react-js`  | Visible       | No         | Yes | ReactDOM.createRoot mount |
| `react-ts`  | Visible       | Yes        | Yes | ReactDOM.createRoot mount |
| `node-ts`   | Hidden        | Yes        | No  | Plain module require, console-only |

---

## Extended Bundler API (`src/lib/challenges/bundler.ts`)

```ts
export async function buildBundle(
  fileMap: FileMap,
  entryPath: string,
  environment: "react-js" | "react-ts" | "node-ts" = "react-js"
): Promise<BundleResult>
```

Internal Babel preset selection per file:

```ts
// Derived from file path extension, not environment
const ext = path.split('.').pop() ?? '';
const presets: unknown[] = [
  ['env', { targets: { browsers: 'last 2 versions' }, modules: 'commonjs' }],
];
if (ext === 'tsx' || ext === 'jsx') presets.unshift('react');
if (ext === 'ts' || ext === 'tsx')  presets.unshift('typescript');
```

Extended module resolver (adds `.ts`/`.tsx` lookups):
```js
var exts = ["", ".jsx", ".js", ".tsx", ".ts", "/index.jsx", "/index.js", "/index.tsx", "/index.ts"];
```

---

## Demo Challenge Shapes

### `react-typed-counter` (`src/modules/challenges/react-typed-counter/index.ts`)

```ts
const challenge: Challenge = {
  slug: "react-typed-counter",
  title: "Typed React Counter",
  description: "Build a typed counter component using TypeScript interfaces for props and useState with an explicit type parameter.",
  difficulty: "beginner",
  tags: ["typescript", "hooks", "interfaces"],
  environment: "react-ts",
  entryFile: "App.tsx",
  files: [
    {
      filename: "types.ts",
      language: "ts",
      content: `export interface CounterProps {
  initialCount?: number;
  step?: number;
}
`,
    },
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState } from "react";
import type { CounterProps } from "./types";

// TODO: use CounterProps interface for the component props
// TODO: add explicit type parameter to useState

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2>Typed Counter</h2>
      <p style={{ fontSize: 32, fontWeight: "bold" }}>{count}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  );
}
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `body { margin: 0; background: #fff; color: #111; }
button { padding: 8px 20px; font-size: 18px; cursor: pointer;
  border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; }
button:hover { background: #e8e8e8; }
`,
    },
  ],
};
```

---

### `ts-oop-shapes` (`src/modules/challenges/ts-oop-shapes/index.ts`)

```ts
const challenge: Challenge = {
  slug: "ts-oop-shapes",
  title: "OOP Shapes with TypeScript",
  description: "Implement a Shape hierarchy using TypeScript abstract classes. Complete the Circle and Rectangle classes so the output matches the expected log.",
  difficulty: "intermediate",
  tags: ["typescript", "oop", "abstract-classes"],
  environment: "node-ts",
  entryFile: "index.ts",
  files: [
    {
      filename: "shapes.ts",
      language: "ts",
      content: `export abstract class Shape {
  abstract area(): number;
  abstract perimeter(): number;

  describe(): string {
    return \`Area: \${this.area().toFixed(2)}, Perimeter: \${this.perimeter().toFixed(2)}\`;
  }
}

export class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }

  // TODO: implement area() → π * r²
  area(): number {
    return 0;
  }

  // TODO: implement perimeter() → 2 * π * r
  perimeter(): number {
    return 0;
  }
}

export class Rectangle extends Shape {
  constructor(private width: number, private height: number) {
    super();
  }

  // TODO: implement area() → width * height
  area(): number {
    return 0;
  }

  // TODO: implement perimeter() → 2 * (width + height)
  perimeter(): number {
    return 0;
  }
}
`,
    },
    {
      filename: "index.ts",
      language: "ts",
      content: `import { Circle, Rectangle } from "./shapes";

const circle = new Circle(5);
const rect = new Rectangle(4, 6);

console.log("Circle:", circle.describe());
console.log("Rectangle:", rect.describe());

// Expected output:
// Circle: Area: 78.54, Perimeter: 31.42
// Rectangle: Area: 24.00, Perimeter: 20.00
`,
    },
  ],
};
```

---

## State — No New Zustand State Required

The `challenge.store.ts` stores `FileMap` and per-challenge file content keyed by slug. Adding new challenges with new environments does not require schema changes — existing `setFileContent`, `getFileMap`, `resetChallenge` work for all environments.
