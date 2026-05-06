import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "compiler-options-overview", title: "Key Compiler Options", level: 2 },
  { id: "strict-mode", title: "strict Mode and What It Enables", level: 2 },
  { id: "module-resolution", title: "Module Resolution", level: 2 },
  { id: "target-and-lib", title: "target and lib", level: 2 },
  { id: "path-aliases", title: "Path Aliases", level: 2 },
  { id: "project-references", title: "Project References (Monorepos)", level: 2 },
  { id: "isolatedmodules", title: "isolatedModules", level: 2 },
  { id: "declaration-files", title: "Declaration Files (.d.ts)", level: 2 },
  { id: "backend-config", title: "Recommended Backend Config", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TsConfig() {
  return (
    <div className="article-content">
      <p>
        <code>tsconfig.json</code> is not a formality — the options you choose fundamentally
        change what TypeScript catches, how it resolves modules, and whether your code
        works at runtime. Senior backend interviews often include a "walk me through
        your tsconfig" question because it reveals whether you actually understand the
        tool or just use it as boilerplate.
      </p>

      <h2 id="compiler-options-overview">Key Compiler Options</h2>

      <p>
        These are the options that matter most for backend TypeScript. Know what each
        one does — not just its name.
      </p>

      <pre><code>{`{
  "compilerOptions": {
    // ─── Output ──────────────────────────────────────────────────────────
    "target": "ES2022",           // JS version emitted — determines polyfills needed
    "module": "NodeNext",         // Module format: CommonJS, ESNext, NodeNext
    "moduleResolution": "NodeNext", // How imports are resolved
    "outDir": "./dist",           // Where compiled files go
    "rootDir": "./src",           // Root of source files

    // ─── Type Safety ─────────────────────────────────────────────────────
    "strict": true,               // Master flag (enables 8+ checks, see below)
    "noUncheckedIndexedAccess": true, // arr[0] is T | undefined, not T
    "exactOptionalPropertyTypes": true, // { x?: number } means x: number, not x: number | undefined
    "noImplicitReturns": true,    // every code path must return a value
    "noFallthroughCasesInSwitch": true, // switch cases must break/return
    "noImplicitOverride": true,   // must mark overrides with 'override'

    // ─── Module ──────────────────────────────────────────────────────────
    "esModuleInterop": true,      // allows default import from CommonJS modules
    "allowSyntheticDefaultImports": true, // implied by esModuleInterop
    "resolveJsonModule": true,    // can import .json files
    "isolatedModules": true,      // each file must be independently compilable

    // ─── Output control ──────────────────────────────────────────────────
    "declaration": true,          // emit .d.ts files
    "declarationMap": true,       // source maps for .d.ts (go-to-definition works)
    "sourceMap": true,            // source maps for debugging
    "removeComments": false,      // keep comments in output

    // ─── Paths ───────────────────────────────────────────────────────────
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },

    // ─── Lib ─────────────────────────────────────────────────────────────
    "lib": ["ES2022"]             // built-in type definitions to include
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`}</code></pre>

      <h2 id="strict-mode">strict Mode and What It Enables</h2>

      <p>
        <code>strict: true</code> is a shorthand that enables eight individual flags.
        Know which ones — interviewers ask.
      </p>

      <pre><code>{`// strict: true enables ALL of these:

// 1. strictNullChecks — null and undefined are not in every type
let name: string = null; // ✗ Error — null not assignable to string

// 2. strictFunctionTypes — function parameter types checked contravariantly
type Handler = (event: MouseEvent) => void;
const handler: Handler = (e: Event) => {}; // ✗ Error — Event is broader than MouseEvent

// 3. strictBindCallApply — bind/call/apply are type-checked
function greet(name: string) { return \`Hello \${name}\`; }
greet.call(null, 42); // ✗ Error — 42 is not string

// 4. strictPropertyInitialization — class properties must be initialized
class User {
  name: string; // ✗ Error — not definitely assigned
  id: string;

  constructor() {
    this.id = "123"; // only id is assigned — name is not
  }
}

// Fix options:
class UserFixed {
  name: string = ""; // default value
  age: number | undefined; // | undefined (or use ?)
  email!: string; // definite assignment assertion — "trust me, it's set"
}

// 5. noImplicitAny — TypeScript must know the type
function process(data) { }   // ✗ Error — data has implicit 'any'
function process(data: unknown) { } // ✓

// 6. noImplicitThis — this must have a known type in functions
function greetUser() {
  return this.name; // ✗ Error — 'this' has implicit 'any'
}

// 7. alwaysStrict — emits "use strict" in all JS files

// 8. useUnknownInCatchVariables — catch(e) is unknown, not any
try { } catch (e) {
  e.message; // ✗ Error — must narrow first
}

// ─── Beyond strict: extra safety ─────────────────────────────────────────

// noUncheckedIndexedAccess — array indexing returns T | undefined
const arr: number[] = [1, 2, 3];
const first = arr[0]; // number | undefined (not just number)
first.toFixed(); // ✗ Error — first could be undefined

// exactOptionalPropertyTypes — ? does not add undefined to the type
type Config = { timeout?: number };
const c: Config = { timeout: undefined }; // ✗ Error with exactOptionalPropertyTypes`}</code></pre>

      <h2 id="module-resolution">Module Resolution</h2>

      <p>
        This is where most backend TypeScript confusion lives. The wrong
        <code>moduleResolution</code> causes import paths to work at compile time
        but fail at runtime — or vice versa.
      </p>

      <pre><code>{`// moduleResolution options:

// "node" (legacy) — used for CommonJS Node.js projects
// Resolves: require("foo") → node_modules/foo/index.js
// Does NOT understand package.json "exports" field

// "node16" / "nodenext" — for modern Node.js with ESM or CJS
// Understands package.json "exports", "imports", "type" fields
// Requires explicit file extensions in imports (.js for TS files)
import { User } from "./user.js"; // ✓ required with nodenext
// Note: you write .js even though the source file is .ts

// "bundler" — for Vite, webpack, etc.
// Most permissive — no extension required, understands exports
// Do NOT use with Node.js directly (no bundler at runtime)

// Choosing the right option:
// Pure Node.js backend (ESM)  → moduleResolution: "NodeNext", module: "NodeNext"
// Pure Node.js backend (CJS)  → moduleResolution: "Node" or "NodeNext"
// NestJS                      → usually module: "CommonJS", moduleResolution: "Node"
// Next.js / Vite              → moduleResolution: "Bundler"

// The "exports" field in package.json interacts with moduleResolution:
// With "node16", TypeScript resolves sub-path exports:
// package.json: { "exports": { "./utils": "./dist/utils.js" } }
// import { helper } from "mylib/utils"; // ✓ with node16, ✗ with old "node"

// esModuleInterop: true — needed for CommonJS interop
// Without it, default imports from CJS require namespace imports:
import fs from "fs"; // ✓ with esModuleInterop: true
import * as fs from "fs"; // ✓ without (old style)`}</code></pre>

      <h2 id="target-and-lib">target and lib</h2>

      <pre><code>{`// target — JS version emitted
// "ES5"     — maximum compatibility, heavy polyfills
// "ES2017"  — async/await native (no polyfill)
// "ES2020"  — nullish coalescing, optional chaining, BigInt
// "ES2022"  — class fields, top-level await, Array.at()
// "ESNext"  — latest — only use if you know your runtime supports it

// For Node.js 18+, ES2022 is safe and recommended.
// "target" does NOT add browser/DOM APIs — that's "lib"

// lib — built-in type definitions included
// ["ES2022"]               — Node.js backend (no DOM)
// ["ES2022", "DOM"]        — frontend (adds window, document, etc.)
// ["ES2022", "DOM", "DOM.Iterable"] — for iterating DOM collections

// If you don't specify lib, TypeScript defaults to target's equivalent libs.
// For Node.js, explicitly set lib: ["ES2022"] to avoid accidental DOM types.

// Types — load @types packages
"types": ["node", "jest"]  // only load these @types — not all in node_modules/@types
// vs.
"typeRoots": ["./node_modules/@types"] // where to look for @types

// Example full backend config for Node 18+ ESM:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  }
}`}</code></pre>

      <h2 id="path-aliases">Path Aliases</h2>

      <pre><code>{`// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@config": ["src/config/index.ts"]
    }
  }
}

// Usage in code:
import { UserService } from "@/services/user"; // resolves to src/services/user
import { DB_CONFIG } from "@config";            // resolves to src/config/index.ts

// ⚠️ tsconfig paths are TypeScript-only — Node.js at runtime doesn't know them
// You must also configure your bundler/runtime:

// Option 1: ts-node with tsconfig-paths
// package.json: "ts-node": { "require": ["tsconfig-paths/register"] }

// Option 2: tsc-alias (post-build path replacement)
// Converts @/... to ../... in emitted .js files

// Option 3: tsx (modern ts-node replacement) handles paths automatically

// Option 4: module alias in Node.js directly (no build tools):
import moduleAlias from "module-alias";
moduleAlias.addAlias("@", __dirname + "/src");`}</code></pre>

      <h2 id="project-references">Project References (Monorepos)</h2>

      <pre><code>{`// Project references allow incremental builds in monorepos
// Each sub-package has its own tsconfig with composite: true

// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,     // required for project references
    "declaration": true,   // required — consumers use .d.ts
    "declarationMap": true,
    "outDir": "./dist"
  }
}

// packages/api/tsconfig.json
{
  "compilerOptions": { ... },
  "references": [
    { "path": "../shared" }  // depends on shared
  ]
}

// Root tsconfig.json (build orchestration only — no compilerOptions.include)
{
  "files": [],   // empty — no direct compilation
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/api" },
    { "path": "./packages/worker" }
  ]
}

// Build: tsc --build (or tsc -b) — builds in correct dependency order
// tsc -b --watch — incremental watch across all projects
// tsc -b --clean — clean all built artifacts

// composite: true requirements:
// 1. rootDir must be set
// 2. declaration: true must be set
// 3. All input files must be included via include/files
// 4. Cannot use "references" that form a cycle`}</code></pre>

      <h2 id="isolatedmodules">isolatedModules</h2>

      <p>
        <code>isolatedModules: true</code> makes TypeScript enforce that every file
        can be transpiled independently — required for Babel, esbuild, swc, and most
        modern toolchains.
      </p>

      <pre><code>{`// isolatedModules: true forbids:

// 1. Re-exporting types without 'type' keyword
export { User } from "./user"; // ✗ Error if User is only a type
export type { User } from "./user"; // ✓

// 2. Type-only imports without 'type' keyword
import { User } from "./user"; // ✗ Error if used only as a type
import type { User } from "./user"; // ✓

// 3. const enum (inlining requires reading other files)
const enum Status { Active, Inactive } // ✗ Error with isolatedModules

// Why it matters: esbuild/swc/Babel strip types file-by-file without
// type-checking. If a file re-exports a type as a value, the bundler
// tries to include it at runtime and fails.

// Best practice: always use 'import type' for type-only imports
// This is a good habit regardless of isolatedModules:
import type { Request, Response } from "express"; // zero runtime cost`}</code></pre>

      <h2 id="declaration-files">Declaration Files (.d.ts)</h2>

      <pre><code>{`// .d.ts files describe the shape of JavaScript code without implementation

// Global augmentation — adding types to global scope
// globals.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      DATABASE_URL: string;
      JWT_SECRET: string;
      PORT?: string;
    }
  }
}

// Now process.env.DATABASE_URL is typed (not just string | undefined)
const dbUrl: string = process.env.DATABASE_URL; // ✓ typed

// Module augmentation — adding types to a third-party module
// types/express.d.ts
import type { User } from "./src/types";

declare module "express-serve-static-core" {
  interface Request {
    user?: User; // adds .user to Express Request
  }
}

// Now req.user is typed throughout the app:
app.get("/me", (req, res) => {
  if (!req.user) return res.status(401).send();
  res.json(req.user); // req.user: User | undefined
});

// Ambient module declarations — typing untyped packages
// types/some-untyped-package.d.ts
declare module "some-untyped-package" {
  export function doThing(input: string): number;
  export const VERSION: string;
}

// Or a quick escape hatch (avoid in serious projects):
declare module "some-untyped-package";
// import from it now returns 'any'`}</code></pre>

      <h2 id="backend-config">Recommended Backend Config</h2>

      <pre><code>{`// tsconfig.json for Node.js 18+ backend (ESM)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,

    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}

// tsconfig.json for NestJS (CommonJS)
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2021"],

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,

    "experimentalDecorators": true,   // required for NestJS decorators
    "emitDecoratorMetadata": true,    // required for DI reflection

    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,

    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong><code>strict: true</code></strong> enables 8 checks including{" "}
          <code>strictNullChecks</code>, <code>noImplicitAny</code>, and{" "}
          <code>strictPropertyInitialization</code>. Know each one — they catch different classes of bugs.
        </li>
        <li>
          <strong><code>moduleResolution</code></strong> is the most misunderstood option.
          Use <code>NodeNext</code> for modern Node.js (requires explicit <code>.js</code> extensions
          in imports). Use <code>Bundler</code> for Vite/webpack projects.
        </li>
        <li>
          <strong><code>noUncheckedIndexedAccess</code></strong> makes array indexing return{" "}
          <code>T | undefined</code> — this is the right default and it's NOT included in{" "}
          <code>strict</code>. Add it explicitly.
        </li>
        <li>
          <strong><code>isolatedModules: true</code></strong> is required for esbuild, Babel,
          swc. It prohibits <code>const enum</code> and requires <code>import type</code> for
          type-only imports.
        </li>
        <li>
          <strong>Path aliases in tsconfig don't work at runtime</strong> — you need a separate
          tool (tsc-alias, tsconfig-paths, or your bundler) to actually resolve them.
        </li>
        <li>
          For NestJS, add <strong><code>experimentalDecorators: true</code></strong> and{" "}
          <strong><code>emitDecoratorMetadata: true</code></strong> — both are required for the
          dependency injection system.
        </li>
      </ul>
    </div>
  );
}
