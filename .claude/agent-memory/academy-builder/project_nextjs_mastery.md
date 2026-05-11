---
name: Next.js Mastery Academy
description: nextjs-mastery slug, #171717 accent, 16 modules, interview-focused for senior Next.js roles, wired into registry and mock-data
type: project
---

Next.js Mastery academy is complete and wired into both REGISTRY and MOCK_ACADEMIES.

**Slug:** nextjs-mastery  
**Accent color:** #171717 (Next.js black)  
**Icon:** ▲  
**Total modules:** 16  
**Total estimated minutes:** 650  

**Modules:**
1. app-router-fundamentals (40 min)
2. server-components-vs-client-components (45 min)
3. routing-advanced (40 min)
4. data-fetching-and-caching (50 min)
5. server-actions (40 min)
6. nextjs-performance-and-optimization (40 min)
7. metadata-and-seo (25 min)
8. authentication-and-middleware (45 min)
9. deployment-and-edge (35 min)
10. pages-router-and-migration (50 min)
11. route-segment-config (35 min) ← added 2026-05-06
12. navigation-hooks (30 min) ← added 2026-05-06
13. testing-nextjs (45 min) ← added 2026-05-06
14. internationalization (35 min) ← added 2026-05-06
15. nextjs-15-and-observability (35 min) ← added 2026-05-06
16. nextjs-interview-questions (60 min)

**Groups:** app-router-foundations, data-and-caching, production-patterns, legacy-and-migration, advanced-patterns-modern-nextjs, testing, interview-prep

**Why:** User is preparing for a senior Next.js job interview. Content is deliberately interview-focused with Q&A, code examples, and explicit "interview framing" sections.

**Key Next.js 15 specifics covered accurately:**
- params and searchParams are Promises (must await)
- cookies() and headers() are Promises
- useFormState renamed to useActionState in React 19
- fetch() no longer cached by default in Next.js 15 (was force-cache, now no-store)
- GET Route Handlers no longer cached by default in Next.js 15
- after() API for post-response work (Node.js runtime only, not Edge)
- forbidden() and unauthorized() throw internally — do not catch
- instrumentation.ts register() runs once at startup; onRequestError for error tracking
- Turbopack stable with --turbopack flag

**Build status:** Clean pass (TypeScript, all pages generated) — verified 2026-05-06
