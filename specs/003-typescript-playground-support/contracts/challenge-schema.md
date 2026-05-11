# Contract: Challenge Schema

**Feature**: 003-typescript-playground-support  
**File**: `src/lib/challenges/types.ts`

---

## `ChallengeFile`

```ts
interface ChallengeFile {
  filename: string;          // e.g. "App.tsx", "shapes.ts", "styles.css"
  language: "jsx" | "js" | "css" | "ts" | "tsx";
  content: string;           // initial/seed source code
  readOnly?: boolean;        // default false
}
```

### Language → Transpilation mapping

| `language` | Babel presets used |
|------------|-------------------|
| `jsx`      | `react`, `env`    |
| `js`       | `env`             |
| `css`      | (no transpilation, collected into CSS string) |
| `tsx`      | `react`, `typescript`, `env` |
| `ts`       | `typescript`, `env` |

---

## `Challenge`

```ts
interface Challenge {
  slug: string;              // unique, kebab-case, URL-safe
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];            // lowercase, concise labels
  environment: "react-js" | "react-ts" | "node-ts";
  files: ChallengeFile[];
  entryFile: string;         // filename of the module to execute first (no "./" prefix)
}
```

### Environment → Layout mapping

| `environment` | Preview panel | Console panel | Execution |
|---------------|--------------|---------------|-----------|
| `react-js`    | Visible (flex-1) | Fixed 220px | React mount |
| `react-ts`    | Visible (flex-1) | Fixed 220px | React mount |
| `node-ts`     | Hidden | Fills right column | Script only |

### Validation rules

- `entryFile` MUST exist in `files` array by `filename` match.
- `node-ts` challenges MUST NOT have `.tsx` or `.jsx` entry files.
- `react-ts` challenges MUST have a `.tsx` entry file.
- `react-js` challenges MUST have a `.jsx` entry file.
- All `slug` values across `CHALLENGE_REGISTRY` must be unique.

---

## `buildBundle` function

```ts
function buildBundle(
  fileMap: FileMap,
  entryPath: string,                                          // e.g. "./index.ts"
  environment?: "react-js" | "react-ts" | "node-ts"          // default: "react-js"
): Promise<BundleResult>
```

```ts
interface BundleResult {
  bundle: string;   // executable JS bundle
  css: string;      // concatenated CSS (empty string if none)
  error?: string;   // set only on transpilation failure; bundle is "" when set
}
```

**Callers** must check `error` before using `bundle`. When `error` is set, display it in the console panel and skip preview update.
