export type JobStatus = "active" | "applied" | "interviewing" | "offer" | "rejected";
export type ModulePriority = "high" | "medium" | "low";
export type ModuleType = "concept" | "challenge" | "system-design" | "behavioral";

export interface JobModule {
  id: string;
  title: string;
  type: ModuleType;
  priority: ModulePriority;
  description: string;
  estimatedMinutes: number;
  // link to existing academy content if applicable
  academySlug?: string;
  moduleSlug?: string;
}

export interface JobTarget {
  slug: string;
  company: string;
  role: string;
  level: string;
  addedAt: string; // ISO date string
  status: JobStatus;
  accentColor: string;
  techStack: string[];
  modules: JobModule[];
  jdSummary: string;
  url?: string;
  // slug of dedicated academy in REGISTRY — enables full content modules
  academySlug?: string;
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  active: "Preparing",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  active: "#6366f1",
  applied: "#3b82f6",
  interviewing: "#f59e0b",
  offer: "#22c55e",
  rejected: "#ef4444",
};

export const PRIORITY_COLORS: Record<ModulePriority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6366f1",
};

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  concept: "Concept",
  challenge: "Challenge",
  "system-design": "System Design",
  behavioral: "Behavioral",
};

export const JOB_TARGETS: JobTarget[] = [
  {
    slug: "godaddy-senior-sde-ai",
    academySlug: "godaddy-senior-sde-ai",
    company: "GoDaddy",
    role: "Senior Software Development Engineer — Care (AI)",
    level: "Senior / Staff",
    addedAt: "2026-05-14",
    status: "active",
    accentColor: "#1bdbad",
    url: undefined,
    techStack: [
      "TypeScript", "Golang", "Node.js", "AWS",
      "DynamoDB", "Lambda", "SQS", "CDK",
      "Temporal", "Bedrock", "OpenSearch", "REST APIs",
    ],
    jdSummary:
      "Senior SDE on GoDaddy's Care Team (AI) — design and build AI-powered solutions that enhance customer service. Requires 8+ years backend REST API development, expert TypeScript (Go preferred), DDD & Hexagonal Architecture, AWS (3+ years), NoSQL/RDBMS (3+ years). Key differentiators: Temporal workflow orchestration, LLM/RAG integration, fault-tolerant globally available systems. On-call rotation included.",
    modules: [
      {
        id: "ddd-and-hexagonal-architecture",
        title: "DDD & Hexagonal Architecture",
        type: "concept",
        priority: "high",
        estimatedMinutes: 80,
        description:
          "Domain Driven Design building blocks (entities, value objects, aggregates, domain events), bounded contexts, context mapping patterns, hexagonal architecture (ports & adapters), CQRS pattern, and repository pattern. Explicitly listed in the GoDaddy JD as required 'software craftsmanship' knowledge.",
      },
      {
        id: "typescript-backend-engineering",
        title: "TypeScript Backend Engineering",
        type: "concept",
        priority: "high",
        estimatedMinutes: 70,
        description:
          "Type-safe REST API design with Zod + OpenAPI, request pipeline middleware, structured error handling, composition root dependency injection pattern, testing pyramid (domain unit → application unit → API integration), Result type, and idempotency implementation.",
      },
      {
        id: "golang-for-backend",
        title: "Golang for Backend Engineers",
        type: "concept",
        priority: "high",
        estimatedMinutes: 75,
        description:
          "Go for TypeScript developers: implicit interfaces, error handling idioms (sentinel errors, typed errors, error wrapping), goroutines and channels (fan-out patterns, worker pools), context package, HTTP servers with chi, table-driven testing, and DDD patterns in Go.",
      },
      {
        id: "aws-backend-platform",
        title: "AWS Backend Platform Engineering",
        type: "concept",
        priority: "high",
        estimatedMinutes: 80,
        description:
          "Lambda patterns (cold start optimization, partial batch failure), API Gateway (HTTP vs REST API), DynamoDB single-table design (GSIs, access patterns, conditional writes), SQS + DLQ + EventBridge, CDK IaC, CloudWatch observability, IAM least privilege, Secrets Manager, and fault tolerance patterns.",
      },
      {
        id: "ai-llm-integration-patterns",
        title: "AI & LLM Integration Patterns",
        type: "concept",
        priority: "high",
        estimatedMinutes: 85,
        description:
          "LLM provider abstraction, streaming responses (SSE), RAG pipeline (chunking, embedding, hybrid search, reranking), AI agent architecture (ReAct pattern, tool use), prompt engineering for production, context window management, cost optimization (prompt caching), evaluation (LLM-as-judge), and Bedrock Guardrails.",
      },
      {
        id: "temporal-workflow-engine",
        title: "Temporal Workflow Engine",
        type: "concept",
        priority: "high",
        estimatedMinutes: 65,
        description:
          "Durable execution model, workflows vs activities (constraints and responsibilities), retry policies (four timeout types), signals and queries, Saga pattern with compensation, child workflows, Temporal for AI pipelines, Temporal vs SQS + Step Functions comparison, and testing with TestWorkflowEnvironment.",
      },
      {
        id: "system-design-godaddy-ai-care",
        title: "System Design: GoDaddy AI Care Platform",
        type: "system-design",
        priority: "high",
        estimatedMinutes: 85,
        description:
          "Full system design: conversation ingest (WebSocket + REST + email), Temporal-orchestrated AI pipeline (classify → RAG retrieve → generate → route), OpenSearch knowledge base with hybrid search, confidence-based routing, DynamoDB single-table design for support entities, observability + AI quality metrics, and on-call incident management playbook.",
      },
      {
        id: "interview-simulation",
        title: "Interview Simulation: Senior SDE AI",
        type: "challenge",
        priority: "high",
        estimatedMinutes: 90,
        description:
          "Four-round simulation with model answers: coding (idempotency, rate limiter, retry), architecture & DDD (ticket domain model, hexagonal ports), AI system design (RAG pipeline, Temporal AI pipeline justification), and leadership (code review scenario, production incident response, STAR story library).",
      },
    ],
  },
  {
    slug: "disney-staff-engineer",
    academySlug: "disney-staff-engineer",
    company: "Disney",
    role: "Staff Software Engineer — Frontend",
    level: "Staff / Principal",
    addedAt: "2026-05-14",
    status: "interviewing",
    accentColor: "#0063e5",
    url: undefined,
    techStack: [
      "JavaScript", "TypeScript", "React", "Node.js",
      "AWS", "GraphQL", "REST", "Swift", "Kotlin",
    ],
    jdSummary:
      "Staff-level frontend engineering role at Disney. Lead projects across engineering and product teams, architect and design implementations, enforce code quality through TDD, mentor senior developers, and resolve complex architectural challenges. 7+ years experience required; expert knowledge in JavaScript, TypeScript, and React. Nice-to-haves: Node.js, AWS, Swift/Kotlin, high-availability deployments.",
    modules: [
      {
        id: "react-architecture-at-scale",
        title: "React Architecture at Scale",
        type: "concept",
        priority: "high",
        estimatedMinutes: 80,
        description:
          "Compound components, render props, micro-frontend architecture with Module Federation, state management decision framework (Zustand vs Redux vs Context), memoization strategy, virtualization, and Concurrent React features. Core to every Disney interview round.",
      },
      {
        id: "typescript-for-architects",
        title: "TypeScript for Architects",
        type: "concept",
        priority: "high",
        estimatedMinutes: 70,
        description:
          "Advanced TypeScript: discriminated unions for state machines, conditional types, mapped types, template literal types, branded/nominal types, type-safe event systems, and Zod-based API contract design. Expert JS/TS is an explicit must-have in the JD.",
      },
      {
        id: "performance-and-scalability",
        title: "Performance & High-Scale Engineering",
        type: "concept",
        priority: "high",
        estimatedMinutes: 75,
        description:
          "Core Web Vitals (LCP, CLS, INP) with fix strategies, bundle optimization, code splitting, Web Workers, memory management, CDN cache hierarchy, stale-while-revalidate, circuit breaker pattern, and graceful degradation. The JD requires 'highly scalable and performant' experience.",
      },
      {
        id: "api-design-and-collaboration",
        title: "API Design & Cross-Team Collaboration",
        type: "concept",
        priority: "high",
        estimatedMinutes: 65,
        description:
          "REST maturity model, RFC 7807 error standards, GraphQL schema-first design, cursor-based pagination, Backend for Frontend (BFF) pattern, API versioning strategies, Pact contract testing, and cross-team API collaboration process. JD explicitly requires proven API specification track record.",
      },
      {
        id: "technical-leadership",
        title: "Technical Leadership for Staff Engineers",
        type: "concept",
        priority: "high",
        estimatedMinutes: 70,
        description:
          "Staff vs senior engineer scope, ADR format and when to write them, RFC process and consensus building, code review as leadership (high-signal comments, teaching principles), technical debt taxonomy, debt payoff ROI calculations, and Socratic mentoring of senior engineers.",
      },
      {
        id: "system-design-disney-platform",
        title: "System Design: Disney-Scale Web Platform",
        type: "system-design",
        priority: "high",
        estimatedMinutes: 90,
        description:
          "Full system design: requirements gathering, high-level architecture, component system design, state management at scale, Disney Account SSO flow, token storage strategy, CDN cache hierarchy, real-time features (SSE vs WebSockets vs polling), cross-platform code sharing, and observability stack.",
      },
      {
        id: "interview-simulation",
        title: "Interview Simulation: Architect Level",
        type: "challenge",
        priority: "high",
        estimatedMinutes: 90,
        description:
          "Full interview simulation across 5 rounds: live coding (CMS component registry, generic DataTable, request deduplication), architecture decisions (state migration, MFE boundaries), system design (ESPN live scoreboard at 50M users), leadership Q&A, and behavioral STAR stories with model answers.",
      },
    ],
  },
  {
    slug: "indeed-senior-react-nextjs-11802",
    academySlug: "indeed-senior-react-nextjs-11802",
    company: "Indeed",
    role: "Senior React/Next.js Engineer",
    level: "Senior",
    addedAt: "2026-05-06",
    status: "active",
    accentColor: "#2557d6",
    url: undefined,
    techStack: [
      "React", "Next.js", "TypeScript", "Contentstack",
      "GraphQL", "REST", "Node.js", "Jest", "Playwright",
      "Emotion", "Storybook", "GitLab CI/CD",
    ],
    jdSummary:
      "Build and maintain the Indeed Help Center — a content-driven app powered by Contentstack CMS and a React/Next.js frontend. Core work: scalable UI components, SSR/SSG workflows, CMS content model management, GraphQL + REST integrations, and a comprehensive test suite (Jest + Playwright). The role sits at the intersection of frontend engineering and content platform ownership.",
    modules: [
      // ── HIGH PRIORITY ─────────────────────────────────────────────────────
      {
        id: "headless-cms-contentstack",
        title: "Headless CMS Architecture & Contentstack",
        type: "concept",
        priority: "high",
        estimatedMinutes: 60,
        description:
          "Understand what headless CMS is and why it exists. Deep dive into Contentstack: stacks, content types, entries, assets, the Delivery API vs Management API, content models and schema design, editorial workflows, and preview/draft environments. Map CMS concepts to Next.js page architecture. This is the core platform — expect questions about content modeling decisions.",
      },
      {
        id: "nextjs-cms-integration",
        title: "Next.js + CMS Integration Patterns",
        type: "concept",
        priority: "high",
        estimatedMinutes: 45,
        description:
          "Fetch from Contentstack via the JS SDK or REST/GraphQL API. Pattern: SSG with generateStaticParams for static help articles, ISR for content that updates frequently without a full rebuild, Draft Mode (App Router) for editorial preview. Understand the content type → Next.js page mapping strategy. Know when each rendering mode (SSG/ISR/SSR) is correct for a Help Center use case.",
        academySlug: "nextjs-mastery",
        moduleSlug: "data-fetching-and-caching",
      },
      {
        id: "graphql-for-cms",
        title: "GraphQL Integration — Apollo Client & Contentstack GraphQL API",
        type: "concept",
        priority: "high",
        estimatedMinutes: 50,
        description:
          "Contentstack exposes a GraphQL API. Master Apollo Client: useQuery, useLazyQuery, useMutation, fragments, variables, pagination, error handling, cache normalization. Understand how to write efficient queries that match CMS content types. Know when GraphQL beats REST and vice versa. Be ready to compare fetch-based GraphQL vs Apollo Client in a Next.js Server Component context.",
        academySlug: "apollo-graphql",
        moduleSlug: "basic-query",
      },
      {
        id: "content-driven-component-architecture",
        title: "Component Architecture for Content-Driven UIs",
        type: "concept",
        priority: "high",
        estimatedMinutes: 50,
        description:
          "Design a dynamic component registry: map CMS content_type_uid values to React components. Build slot-based layouts where CMS editors control page composition. Understand the renderBlocks pattern for rich text with embedded entries. Handle unknown content types gracefully. This is the core architectural pattern for a Help Center — expect a whiteboard or coding challenge on this.",
      },
      {
        id: "dynamic-forms-react",
        title: "Dynamic Forms in React",
        type: "challenge",
        priority: "high",
        estimatedMinutes: 40,
        description:
          "Build schema-driven forms where the field definitions come from a CMS or API config. Cover controlled vs uncontrolled patterns, React Hook Form for performance, Zod for validation schemas, multi-step forms, and conditional field visibility. JD explicitly calls out dynamic forms — expect a live coding challenge. Practice building a form that renders fields from a JSON schema.",
      },
      {
        id: "testing-strategy-jest-playwright",
        title: "Testing Strategy: Jest + RTL + Playwright",
        type: "challenge",
        priority: "high",
        estimatedMinutes: 50,
        description:
          "Unit test React components with Jest + React Testing Library. Mock Contentstack SDK responses and GraphQL queries. Write integration tests for pages that depend on CMS data. E2E with Playwright: navigate Help Center flows, test search, test rich text rendering. Accessibility testing with axe-core in Playwright. JD lists Jest and Playwright as must-haves — be ready to write tests live.",
        academySlug: "nextjs-mastery",
        moduleSlug: "testing-nextjs",
      },
      {
        id: "performance-cms-sites",
        title: "Performance Optimization for CMS-Driven Sites",
        type: "concept",
        priority: "high",
        estimatedMinutes: 40,
        description:
          "Core Web Vitals (LCP, CLS, INP) — how each one is impacted by CMS-driven content. Next.js Image optimization for CMS-served images (remote domains in next.config). Font optimization with next/font. ISR cache hit rate — how to maximize it. CDN caching layers and cache invalidation on CMS publish events (webhooks → revalidatePath). Bundle analysis with @next/bundle-analyzer.",
        academySlug: "nextjs-mastery",
        moduleSlug: "nextjs-performance-and-optimization",
      },
      {
        id: "ssr-ssg-isr-decision",
        title: "SSR vs SSG vs ISR — Decision Matrix for a Help Center",
        type: "concept",
        priority: "high",
        estimatedMinutes: 30,
        description:
          "Walk through every page type in a Help Center and justify the rendering mode: static article pages (SSG + ISR), search results (SSR or Client), category listing (SSG + ISR), user-specific content (SSR or Client). Understand route segment config options. Know how to opt specific pages out of the full-route cache. This is the single most likely deep-dive topic in a Next.js interview at a content-focused company.",
        academySlug: "nextjs-mastery",
        moduleSlug: "route-segment-config",
      },

      // ── MEDIUM PRIORITY ───────────────────────────────────────────────────
      {
        id: "accessibility-engineering",
        title: "Accessibility Engineering (WCAG 2.1 AA)",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 35,
        description:
          "JD lists accessibility as a responsibility. Cover: semantic HTML for article content (article, nav, main, aside), ARIA landmarks and labels, keyboard navigation, focus management, color contrast. CMS-specific a11y: what happens when editors paste bad HTML into rich text — how to sanitize and enforce. Automated testing: axe-core, Lighthouse, and Playwright accessibility snapshots.",
      },
      {
        id: "css-in-js-emotion-storybook",
        title: "CSS-in-JS with Emotion & Storybook",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 35,
        description:
          "Emotion: styled components vs css prop, theming with ThemeProvider, global styles, SSR with Emotion's cache. Compare to Tailwind and CSS Modules — know the tradeoffs. Storybook: writing stories for CMS-fed components, using args to simulate different content shapes, visual regression testing with Chromatic. Indeed XDS (design system) — understand how to consume a design system with Emotion.",
      },
      {
        id: "nodejs-backend-integration",
        title: "Node.js Backend Integration & BFF Pattern",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 30,
        description:
          "Backend for Frontend (BFF) pattern: Next.js Route Handlers aggregate multiple CMS/backend calls into one response. Express/Koa API consumption patterns. Authentication between Next.js frontend and Node.js backend (JWT, session cookies). Understand how to proxy CMS Management API calls through your own backend to keep API keys server-side only.",
        academySlug: "express-backend",
        moduleSlug: "middleware-pipeline",
      },
      {
        id: "i18n-cms",
        title: "Internationalization for CMS-Driven Apps",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 30,
        description:
          "Contentstack has built-in i18n: locales, fallback locales, localized entries. Map CMS locale codes to Next.js routing. Middleware-based locale detection → rewrite to [lang] segment. next-intl for UI string translations alongside CMS content translations. generateStaticParams across all locales × all content entries. Hreflang alternate links via generateMetadata.",
        academySlug: "nextjs-mastery",
        moduleSlug: "internationalization",
      },
      {
        id: "cicd-gitlab",
        title: "CI/CD with GitLab Pipelines",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 25,
        description:
          "GitLab CI/CD pipeline structure: stages (lint → test → build → deploy). Cache node_modules between jobs. Parallel test jobs (split Playwright tests across runners). Environment variable management in GitLab (masked, protected). Docker image for consistent build environment. Preview environments per MR (deploy to staging, comment URL on MR). Know enough to contribute to an existing pipeline — not build from scratch.",
      },
      {
        id: "server-components-cms",
        title: "Server Components + Client Components in a CMS Context",
        type: "concept",
        priority: "medium",
        estimatedMinutes: 30,
        description:
          "CMS content fetching belongs in Server Components — no client overhead, no API key exposure. Interactive elements (search, feedback widget, collapsible sections) are Client Components. Composition pattern: Server Component fetches CMS data, passes serializable props to Client Component children. Rich text renderer: Server Component renders static content, Client Component handles interactive embedded entries. Common mistake: putting CMS fetch in useEffect.",
        academySlug: "nextjs-mastery",
        moduleSlug: "server-components-vs-client-components",
      },

      // ── LOW PRIORITY ──────────────────────────────────────────────────────
      {
        id: "redis-caching",
        title: "Redis & Cache Invalidation Strategies",
        type: "concept",
        priority: "low",
        estimatedMinutes: 25,
        description:
          "Redis as an API response cache layer between Next.js and Contentstack (avoid CMS rate limits, reduce latency). Cache-aside pattern. TTL strategy per content type. Cache invalidation on CMS publish: Contentstack webhook → invalidation endpoint → Redis DEL + Next.js revalidatePath. Nice-to-have in the JD but shows depth if you can articulate the full cache invalidation chain.",
        academySlug: "express-backend",
        moduleSlug: "caching-redis",
      },
      {
        id: "ab-testing-feature-flags",
        title: "A/B Testing & Feature Flags in Next.js",
        type: "concept",
        priority: "low",
        estimatedMinutes: 25,
        description:
          "Feature flags via Next.js middleware: read flag from cookie/header, rewrite to variant route. Edge-compatible flag evaluation (no DB calls in middleware). A/B testing: assign bucket in middleware, persist in cookie, send bucket as analytics property. Tools: LaunchDarkly, Unleash, or homegrown. JD mentions A/B testing as nice-to-have — enough to discuss the architecture, not implement from scratch.",
        academySlug: "nextjs-mastery",
        moduleSlug: "nextjs-15-and-observability",
      },
      {
        id: "docker-frontend",
        title: "Docker for Next.js Applications",
        type: "concept",
        priority: "low",
        estimatedMinutes: 20,
        description:
          "Multi-stage Dockerfile for Next.js: deps → builder → runner. next.config output: 'standalone' — copies only needed files, minimal image. .dockerignore to exclude node_modules and .next. Environment variable injection at runtime (not build time) for secrets. Health check endpoint. Know enough to read, modify, and debug an existing Dockerfile — not design from scratch.",
        academySlug: "nextjs-mastery",
        moduleSlug: "deployment-and-edge",
      },
      {
        id: "system-design-help-center",
        title: "System Design: Indeed Help Center Architecture",
        type: "system-design",
        priority: "low",
        estimatedMinutes: 60,
        description:
          "Design the full Help Center from scratch in a whiteboard interview. Cover: content model in Contentstack (article, category, tag, author content types), URL structure and routing strategy, rendering mode per page type, CDN and caching layers, search (Algolia vs Contentstack built-in search vs Elasticsearch), multi-language support, CMS preview environment, observability (error tracking, performance monitoring, analytics), and CI/CD pipeline. Practice narrating your decisions out loud.",
      },
      {
        id: "behavioral-senior-ic",
        title: "Behavioral Prep — Senior IC Stories",
        type: "behavioral",
        priority: "low",
        estimatedMinutes: 45,
        description:
          "Prepare STAR-format stories for: (1) a performance optimization you led with measurable impact, (2) a technical disagreement you navigated, (3) a time you improved DX/architecture across a team, (4) an ambiguous requirement you clarified before building, (5) a system you designed that scaled. Indeed uses structured behavioral interviews — have 5 stories ready, each adaptable to multiple question types.",
      },
    ],
  },
];
