---
name: Indeed Senior React/Next.js Academy
description: Job-specific academy for Indeed Help Center role #11802 — slug, accent, module list, and registry wiring details
type: project
---

Academy slug: `indeed-senior-react-nextjs-11802`
Accent color: `#2557d6` (Indeed blue)
Icon: 🎯
Total estimated minutes: 725
Total modules: 19

Module slugs in order:
1. headless-cms-contentstack (60m)
2. nextjs-cms-integration (45m)
3. graphql-for-cms (50m)
4. content-driven-component-architecture (50m)
5. dynamic-forms-react (40m)
6. testing-strategy-jest-playwright (50m)
7. performance-cms-sites (40m)
8. ssr-ssg-isr-decision (30m)
9. accessibility-engineering (35m)
10. css-in-js-emotion-storybook (35m)
11. nodejs-backend-integration (30m)
12. i18n-cms (30m)
13. cicd-gitlab (25m)
14. server-components-cms (30m)
15. redis-caching (25m)
16. ab-testing-feature-flags (25m)
17. docker-frontend (20m)
18. system-design-help-center (60m)
19. behavioral-senior-ic (45m)

Groups: cms-content-platform, core-engineering, production-dx, advanced-interview

Registry: added to `src/lib/registry.ts` only (not mock-data.ts — job academies go registry-only).

**Why:** This is a job-specific prep academy, not a general topic academy. It is wired into REGISTRY only so it appears in the learn/ content viewer without showing in the main discovery UI (mock-data.ts).

**How to apply:** When building future job-specific academies, follow the same pattern — registry only, no mock-data entry. Use accentColor matching the company brand color.

Also fixed a pre-existing bug in `src/app/(hub)/jobs/[slug]/page.tsx`: the Server Component had `onMouseEnter`/`onMouseLeave` event handlers on a `Link` — which fails at build time. Removed the JS-based hover handlers; the card renders without animated hover border in server context.
