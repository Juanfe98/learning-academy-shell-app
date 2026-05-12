# Research: TypeScript Playground Support

**Feature**: 003-typescript-playground-support  
**Date**: 2026-05-11

---

## 1. Babel Standalone TypeScript Transpilation

**Decision**: Use `@babel/standalone`'s built-in `typescript` preset (already bundled — no new dependency).

**How to use**:

For `.tsx` files (React + TypeScript):
```js
Babel.transform(source, {
  presets: [
    'react',
    'typescript',
    ['env', { targets: { browsers: 'last 2 versions' }, modules: 'commonjs' }],
  ],
  filename: 'file.tsx',
});
```

For `.ts` files (TypeScript only, no JSX):
```js
Babel.transform(source, {
  presets: [
    'typescript',
    ['env', { targets: { browsers: 'last 2 versions' }, modules: 'commonjs' }],
  ],
  filename: 'file.ts',
});
```

**Key behavior**:
- TypeScript preset strips all type annotations, interfaces, enums, generics, and `import type` statements.
- Does **not** type-check — transpilation succeeds even with type errors.
- `import type { Foo }` is stripped cleanly (no runtime impact).
- `as const`, `!` non-null assertion, decorators all handled.
- Generics in JSX (e.g., `<T>`) are disambiguated correctly because the `react` preset is loaded alongside.

**Rationale**: Zero new dependencies. `@babel/standalone` already ships the TypeScript plugin; it just needs to be activated in the preset list based on file extension.

**Alternative considered**: `sucrase` for faster transpilation. Rejected because it is not already in the bundle and adds ~80kb; Babel standalone is already loaded.

---

## 2. CodeMirror TypeScript Language Support

**Decision**: `@codemirror/lang-javascript` with `{ jsx: true, typescript: true }` — already wired in `getLanguageExtension` for `.ts`/`.tsx` extensions. No additional package needed.

**Current state** (`src/lib/editor/theme.ts`):
```ts
return javascript({ jsx: true, typescript: ext === 'ts' || ext === 'tsx' });
```
This is already correct and complete. When TypeScript mode is active:
- Type annotations, interfaces, generics, enums highlighted
- `import type` recognized
- TSX (`<Component>` syntax) parsed correctly alongside `typescript: true` + `jsx: true`

**Autocompletion**: `basicSetup: { autocompletion: true }` in `PlaygroundCodeEditor` enables local identifier completion (variables, functions defined in the same file). This is sufficient for the spec requirement ("at minimum: local identifiers").

**Full LSP/IntelliSense** (out of scope): Would require `@typescript/vfs` + web worker running the TypeScript compiler. This is excluded per spec assumptions.

**Rationale**: The editor already handles TypeScript correctly. Zero changes needed to `theme.ts` or `PlaygroundCodeEditor.tsx`.

---

## 3. `node-ts` Execution Model

**Decision**: Reuse existing `buildExecSrcdoc` from `src/lib/interview/build-srcdoc.ts`.

**`buildExecSrcdoc` behavior** (already exists):
- No React/ReactDOM script tags
- No `<div id="root">`
- Patches `console.log/warn/error/info` to postMessage `CONSOLE_OUTPUT` type
- Wraps execution in try/catch, postMessages errors
- Posts `EXEC_DONE` when complete

**Note**: `buildPlaygroundSrcdoc` uses message type `PLAYGROUND_CONSOLE`; `buildExecSrcdoc` uses `CONSOLE_OUTPUT`. The `PlaygroundPreviewFrame` only listens for `PLAYGROUND_CONSOLE`. Therefore for `node-ts`, `PlaygroundPage.tsx` must either:
  - **Option A**: Use `buildExecSrcdoc` and update `PlaygroundPreviewFrame` to also listen for `CONSOLE_OUTPUT`
  - **Option B**: Use `buildPlaygroundSrcdoc` for `node-ts` too (since console patching is the same) and just skip the React mount in the bundle entry

**Decision**: Option B — simpler. The `bundler.ts` for `node-ts` environment outputs a bundle that calls `__req(entry, '.')` without `ReactDOM.createRoot`. The `buildPlaygroundSrcdoc` wraps it — console capture already works, and no change to `PlaygroundPreviewFrame` message type handling is needed.

**node-ts bundle entry** (different from react-js entry):
```js
// react-js: mounts App component
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

// node-ts: just executes the module, capturing console side-effects
try {
  __req("./index.ts", ".");
} catch(e) {
  window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:[e.message],...},"*");
}
```

**Rationale**: Reuses existing srcdoc builder and console postMessage infrastructure. No new message type handling required.

---

## 4. Bundler Extension Strategy

**Decision**: Extend `buildBundle` in `bundler.ts` to accept an optional `environment` parameter. File-level transpilation already branches on extension; a minimal environment flag drives the entry-execution code.

**Exact changes to `bundler.ts`**:

1. Add TypeScript to Babel preset list when file extension is `.ts` or `.tsx`:
   ```ts
   const isTS = path.endsWith('.ts') || path.endsWith('.tsx');
   const presets = [
     ...(path.endsWith('.tsx') || path.endsWith('.jsx') ? ['react'] : []),
     ...(isTS ? ['typescript'] : []),
     ['env', { targets: { browsers: 'last 2 versions' }, modules: 'commonjs' }],
   ];
   ```

2. Add `environment` param to `buildBundle` signature:
   ```ts
   export async function buildBundle(
     fileMap: FileMap,
     entryPath: string,
     environment: 'react-js' | 'react-ts' | 'node-ts' = 'react-js'
   ): Promise<BundleResult>
   ```

3. Branch the entry execution code:
   - `react-js` / `react-ts` → existing ReactDOM.createRoot code
   - `node-ts` → plain `__req(entry, ".")` call with error forwarding

4. Extend file extension resolver to also try `.ts`/`.tsx`:
   ```ts
   var exts=["",".jsx",".js",".tsx",".ts","/index.jsx","/index.js","/index.tsx","/index.ts"];
   ```

---

## 5. `PlaygroundPage.tsx` — `handleCreateFile` Language Detection

**Decision**: Extend the `lang` detection switch to handle `.ts` and `.tsx`:

```ts
const lang: FileEntry['language'] =
  ext === 'css' ? 'css' :
  ext === 'ts' ? 'ts' :
  ext === 'tsx' ? 'tsx' :
  ext === 'js' ? 'js' : 'jsx';
```

Pass `challenge.environment` through to `buildBundle` call.

---

## 6. PlaygroundShell Layout for `node-ts`

**Decision**: Pass `environment` as a prop to `PlaygroundShell`. When `environment === 'node-ts'`, hide the preview panel and expand the console panel to fill the right column.

**Simpler alternative**: Derive from `challenge.environment` directly (challenge is already passed as prop). No new prop needed — read `challenge.environment` inside `PlaygroundShell`.

---

## 7. Demo Challenges

### `react-typed-counter` (react-ts)

Files: `App.tsx` (entry), `types.ts`

**`types.ts`**: Exports `CounterProps` interface.  
**`App.tsx`**: Imports `CounterProps`, uses `useState<number>`, renders typed counter.

Demonstrates: interface import, typed state, typed props.

### `ts-oop-shapes` (node-ts)

Files: `index.ts` (entry), `shapes.ts`

**`shapes.ts`**: Abstract class `Shape` with abstract `area(): number` and `perimeter(): number`. Concrete classes `Circle` and `Rectangle`.  
**`index.ts`**: Creates instances, logs output.

Demonstrates: abstract classes, interfaces, typed methods, `console.log` output.

---

## Summary of Changes per File

| File | Change |
|------|--------|
| `src/lib/challenges/types.ts` | Add `"ts" \| "tsx"` to `ChallengeFile.language`; add `"react-ts" \| "node-ts"` to `Challenge.environment` |
| `src/lib/challenges/bundler.ts` | Add TypeScript preset; add `environment` param; add `node-ts` entry execution; extend extension resolver |
| `src/app/(hub)/playground/[slug]/PlaygroundPage.tsx` | Pass `environment` to `buildBundle`; extend `handleCreateFile` lang detection |
| `src/components/hub/playground/PlaygroundShell.tsx` | Hide preview panel when `challenge.environment === 'node-ts'`; expand console |
| `src/app/(hub)/playground/page.tsx` | Add TypeScript badge to challenge cards |
| `src/modules/challenges/react-typed-counter/index.ts` | New demo challenge (react-ts) |
| `src/modules/challenges/ts-oop-shapes/index.ts` | New demo challenge (node-ts) |
| `src/lib/challenges/registry.ts` | Register both new challenges |
