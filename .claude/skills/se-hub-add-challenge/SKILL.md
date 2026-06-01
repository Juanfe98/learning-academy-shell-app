---
name: "se-hub-add-challenge"
description: "Add a new coding challenge to the SE Hub playground. Use this skill whenever the user wants to create a challenge, add a playground problem, scaffold a new coding exercise, or implement a challenge spec. Triggers on: 'add a challenge', 'create a challenge', 'new playground challenge', 'implement this challenge spec', or when the user provides a markdown spec for a playground challenge."
user-invocable: true
---

## Purpose

Scaffold a complete, working playground challenge from a markdown spec. The challenge must follow the exact patterns of existing challenges or flag inconsistencies for the user to resolve.

## Architecture Overview

Read this carefully — the playground has specific conventions that MUST be followed exactly.

### File locations

```
src/
  lib/
    challenges/
      types.ts          ← Challenge, ChallengeFile, TestResult types
      registry.ts       ← CHALLENGE_REGISTRY array — add new entries HERE
  modules/
    challenges/
      <slug>/
        index.ts        ← One file per challenge, default-exports the Challenge object
```

### The Challenge type (from `src/lib/challenges/types.ts`)

```typescript
interface ChallengeFile {
  filename: string;
  language: "jsx" | "js" | "css" | "ts" | "tsx";
  content: string;
  readOnly?: boolean;       // optional — lock file from user edits
}

interface Challenge {
  slug: string;             // kebab-case, used in URL /playground/<slug>
  title: string;
  description: string;      // shown in challenge panel — be concise
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];           // e.g. ["typescript", "hooks", "oop"]
  environment: "react-js" | "react-ts" | "node-ts";
  files: ChallengeFile[];
  entryFile: string;        // filename (no ./ prefix) of the entry point
  tests?: string;           // TypeScript test file content (describe/it/expect)
  problemStatement?: string; // full markdown spec shown in challenge panel (headings, lists, code blocks)
}
```

### Environments

| Environment | Description | Runs in | Entry file ext |
|---|---|---|---|
| `react-js` | React with plain JavaScript | iframe with React 18 CDN | `.jsx` |
| `react-ts` | React with TypeScript | iframe with React 18 CDN | `.tsx` |
| `node-ts` | Pure TypeScript, no DOM | hidden iframe (no preview pane) | `.ts` |

For `react-js` / `react-ts`: the entry file's default export must be a React component named `App`.
For `node-ts`: the entry file runs top-to-bottom; use `console.log` to emit output.

### Registry wiring (from `src/lib/challenges/registry.ts`)

```typescript
import reactCounter from "@/modules/challenges/react-counter";
import reactTypedCounter from "@/modules/challenges/react-typed-counter";
import tsOopShapes from "@/modules/challenges/ts-oop-shapes";

export const CHALLENGE_REGISTRY: Challenge[] = [reactCounter, reactTypedCounter, tsOopShapes];
```

Every new challenge needs: (1) an import line, (2) an entry in the array.

### Tests (`tests` field)

- Optional but recommended for `node-ts` challenges (no visual output to verify)
- Recommended for `react-ts` challenges with non-trivial logic
- Usually not needed for simple `react-js` challenges (visual feedback is enough)
- Content is TypeScript using `describe` / `it` / `expect`
- Import from the challenge's own files using relative paths
- The test runner has: `toBe`, `toEqual`, `toBeCloseTo`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeLessThan`, `toContain`, `toThrow`, and `not`
- Test file gets bundled separately from the main entry — it doesn't need to import from `index.ts`

Example test pattern (from `ts-oop-shapes`):
```typescript
import { Circle, Rectangle, Shape } from "./shapes";

describe("Circle", () => {
  const c = new Circle(5);

  it("area() returns π × r²", () => {
    expect(c.area()).toBeCloseTo(Math.PI * 25, 4);
  });

  it("describe() formats to 2 decimal places", () => {
    expect(c.describe()).toBe("Area: 78.54, Perimeter: 31.42");
  });
});
```

### Module file pattern

```typescript
import type { Challenge } from "@/lib/challenges/types";

const myChallenge: Challenge = {
  slug: "my-challenge",
  title: "My Challenge Title",
  description: "One-sentence description shown in the challenge panel.",
  difficulty: "beginner",
  tags: ["tag1", "tag2"],
  environment: "react-js",
  entryFile: "App.jsx",
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `function App() {
  // TODO: implement
  return <div>Hello</div>;
}
`,
    },
  ],
};

export default myChallenge;
```

Content strings use template literals. Escape backticks inside content as `\``.

---

## Execution Steps

### Step 0 — Reject unsupported languages / frameworks FIRST

Before doing anything else, check whether the requested challenge is expressible in one of the three supported environments:

| Supported | Examples |
|---|---|
| `react-js` | JavaScript, JSX, React |
| `react-ts` | TypeScript, TSX, React + TypeScript |
| `node-ts` | TypeScript (no DOM, no browser APIs) |

**Hard stop — do NOT proceed** if the challenge requires any of the following:
- A language other than JavaScript or TypeScript (Python, Java, Go, Rust, C++, Ruby, etc.)
- A runtime not supported by the bundler (Node.js native APIs, file system, child_process, etc.)
- A framework with no existing pattern in the codebase (Vue, Svelte, Angular, etc.)
- A CSS-only or HTML-only challenge with no JS entry point
- Any package that requires a real `npm install` (the bundler has no package registry — only React 18 is available via CDN for React environments)

When rejecting, be explicit about WHY and what would need to change for support to exist:

```
❌ Cannot create this challenge.

The playground only supports three environments:
  • react-js  — JavaScript + React 18
  • react-ts  — TypeScript + React 18
  • node-ts   — Pure TypeScript (no DOM)

"[requested language/framework]" has no existing runtime or bundler support in the codebase.
Adding support would require changes to the bundler, srcdoc builder, and possibly the editor —
that's a separate infrastructure task, not a challenge creation task.

If you want to add [language] support to the playground first, let's plan that as its own feature.
```

Do not attempt to approximate the challenge in a different language or framework than requested. Do not "make it work somehow." Reject clearly and stop.

### Step 1 — Read and parse the spec

Read the provided markdown spec. Extract:
- **slug** (kebab-case, from title if not given)
- **title**
- **description**
- **difficulty**
- **tags**
- **environment** (infer from tech stack — TypeScript-only → `node-ts`, React+TS → `react-ts`, React+JS → `react-js`)
- **files** — each file needs filename, language, and seed content (incomplete starter code with TODOs)
- **entryFile**
- **tests** — whether tests are appropriate (see rules above)
- **problemStatement** — full markdown spec for the challenge panel (always populate from the spec MD)

### Step 2 — Check for inconsistencies

Before writing any code, verify:
1. Does the spec's environment match the tech described? (e.g., spec says "TypeScript" but environment inferred as `react-js` → flag)
2. Are all imports in the seed files resolvable within the file list?
3. Does the entryFile exist in the files array?
4. For `react-js`/`react-ts`: does the entry file export a default `App` function?
5. For `node-ts`: does the entry file have meaningful `console.log` output to show the user something works?

If any inconsistency is found, **stop and ask the user** before proceeding. Show the inconsistency clearly:

```
⚠️ Inconsistency found: [describe the problem]
Options:
  A. [first resolution]
  B. [second resolution]
Which do you prefer, or do you want to handle it differently?
```

### Step 3 — Write the challenge module

Create `src/modules/challenges/<slug>/index.ts`.

Rules for seed file content:
- Include enough structure for the user to understand what they need to implement
- Mark incomplete parts with `// TODO: implement X → expected result`
- Include working boilerplate (imports, component shell, class structure) so the file is syntactically valid even before the user edits it
- For `node-ts`: seed files should be syntactically valid TypeScript; methods return stub values (0, "", [], etc.) with TODO comments
- For React: the component should render something minimal but visible (not blank) before the user implements the logic

### Step 4 — Write tests (if applicable)

Write the `tests` string following the pattern above. Tests should:
- Cover the primary success cases (correct output given valid input)
- Cover at least one edge case if meaningful
- Use `toBeCloseTo` for floating-point values
- Use `toBe` for exact string/integer/boolean comparisons
- Import only from files that exist in the challenge's `files` array (not from `index.ts` unless it exports the logic)

### Step 5 — Wire into the registry

Edit `src/lib/challenges/registry.ts`:
1. Add an import line at the top (keep imports grouped alphabetically or by addition order — match the existing style)
2. Add the challenge variable to `CHALLENGE_REGISTRY`

### Step 6 — Verify build

Run:
```bash
pnpm build
```

Fix any TypeScript errors before proceeding. Common issues:
- Template literal escaping (backticks in content strings)
- Missing `export default` on the module
- Incorrect language field (must match the filename extension exactly)
- Import path typos in registry

### Step 7 — Confirm with user

After a clean build, tell the user:
1. What was created (file path, slug, environment)
2. The URL to test: `http://localhost:3000/playground/<slug>`
3. Ask them to run `pnpm dev`, open the URL, and confirm the challenge loads correctly
4. If the challenge has tests, remind them to click "Run Tests" and verify they fail on the stub (before implementing) — this confirms the tests are wired up correctly

Wait for explicit user confirmation that the challenge is working before declaring the task complete.

---

## Known Patterns to Preserve

- **Always populate `problemStatement`** — convert the full spec markdown into the field. The panel renderer supports: `#` title, `##`/`###` headings, `- ` lists, ` ```code blocks``` `, `**bold**`, `` `inline code` ``, and `---` dividers. Escape backticks inside the template literal as `\``. **Tables are NOT supported** — they render as raw text. Convert any spec tables to `- ` bullet lists instead.
- **No `readOnly` unless the spec explicitly calls for locked files** — users should be able to edit all files by default
- **Keep seed files syntactically valid** — broken TypeScript in seed files causes bundler errors before the user can even start
- **`entryFile` has no `./` prefix** — e.g., `"App.tsx"` not `"./App.tsx"`
- **`content` strings end with `\n`** — trailing newline after the last line
- **Slug must be globally unique** — check `CHALLENGE_REGISTRY` to avoid collisions
- **Tests import from implementation files, not from `__tests__`** — the test runner bundles them together; no circular imports
