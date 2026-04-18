# Academy Module Contract

Each academy that integrates with `se-hub` must export the following from its root `src/index.ts`:

```ts
export { manifest } from './manifest'; // AcademyManifest
export { routes } from './routes';     // AcademyRoute[]
```

---

## TypeScript Interfaces

```ts
import type { ComponentType } from 'react';

export interface AcademyManifest {
  slug: string;           // URL-safe identifier, e.g. "apollo-graphql"
  title: string;          // Display name, e.g. "Apollo GraphQL"
  description: string;    // Short description shown on path cards
  version: string;        // Semver, e.g. "1.0.0"
  icon: string;           // Path to SVG/PNG relative to academy root
  accentColor: string;    // Hex color used for path card theming, e.g. "#E10098"
  routes: AcademyRoute[];
  learningPath: string[]; // Ordered list of route slugs
}

export interface AcademyRoute {
  slug: string;                    // URL-safe, unique within the academy
  title: string;                   // Display name
  component: ComponentType;        // React component that renders the content
  estimatedMinutes?: number;       // Optional time estimate
  tags?: string[];                 // Optional topic tags
  order: number;                   // Position in the route list (0-indexed)
}
```

---

## Constraints

- Academies **must not** assume they are the root of the URL tree.
- Academies **must not** control top-level layout or navigation.
- Academies **must not** use absolute `<Link href="/...">` paths — use relative slugs only.
- Slugs must be globally unique across all loaded academies (validated at build time).

---

## Adding a New Academy

1. Build the academy as a standalone app first (confirm it works independently).
2. Add a `src/index.ts` that exports `manifest` and `routes` per the contract above.
3. Add the repo URL and target commit SHA to `scripts/sync-modules.sh`.
4. Run `pnpm sync` to pull it into `src/modules/`.
5. The hub picks it up automatically on the next build.
