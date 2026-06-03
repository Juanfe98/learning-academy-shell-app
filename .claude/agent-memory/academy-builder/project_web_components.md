---
name: project-web-components
description: Web Components academy — slug, accent color, module list, and key implementation notes
metadata:
  type: project
---

Web Components academy fully built and wired into registry and mock-data.

**Why:** Juan wanted a zero-to-productive Web Components course for a senior React developer who is a visual learner.

**How to apply:** When referencing or updating this academy, check `src/modules/web-components/`.

## Key facts

- Slug: `web-components`
- Accent color: `#f97316` (orange — distinct from all existing academies)
- Icon: 🧩
- 6 modules, ~165 estimated minutes total
- Wired into both `REGISTRY` (registry.ts) and `MOCK_ACADEMIES` (mock-data.ts)

## Module list (order 0–5)

1. `what-are-web-components` — 20 min — The 4 specs, platform vs framework layer
2. `custom-elements` — 35 min — Lifecycle callbacks, observedAttributes, upgrade mechanism
3. `shadow-dom` — 35 min — Style encapsulation, ::part(), CSS custom properties, :host
4. `html-templates-and-slots` — 30 min — template.cloneNode(), named slots, ::slotted(), slotchange
5. `web-components-and-react` — 30 min — React 18 vs React 19 interop, wrapper pattern, ReactDOM.createRoot(shadowRoot)
6. `web-components-in-practice` — 35 min — Lit, design system layer cake, ElementInternals, accessibility

## Groups

- `wc-foundations`: modules 0–2 (Platform Foundations)
- `wc-advanced`: modules 3–5 (Composition & Integration)

## Implementation note

`SolutionReveal` must be placed OUTSIDE `InterviewChallenge` (as a sibling), NOT as a child. `InterviewChallenge` does not accept `children`. This caused a TypeScript error on first build.

[[project-react-deep-dive]]
