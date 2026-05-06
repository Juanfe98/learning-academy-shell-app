import type { AcademyManifest } from "@/lib/types/academy";

const manifest: AcademyManifest = {
  slug: "nodejs-mastery",
  title: "Node.js Mastery",
  description:
    "Master Node.js from runtime internals to production architecture. Learn the event loop, async patterns, streams, networking, observability, performance, security, and interview-ready backend scenarios.",
  version: "1.0.0",
  icon: "🟢",
  accentColor: "#22c55e",
  totalEstimatedMinutes: 435,
  routes: [
    {
      slug: "node-runtime-architecture",
      title: "Node.js Runtime Architecture",
      order: 0,
      estimatedMinutes: 35,
      tags: ["node", "runtime", "v8", "libuv"],
      component: () => import("./modules/node-runtime-architecture"),
    },
    {
      slug: "event-loop-and-async-patterns",
      title: "Event Loop & Async Patterns",
      order: 1,
      estimatedMinutes: 45,
      tags: ["node", "event-loop", "async", "promises"],
      component: () => import("./modules/event-loop-and-async-patterns"),
    },
    {
      slug: "modules-packages-and-tooling",
      title: "Modules, Packages & Tooling",
      order: 2,
      estimatedMinutes: 40,
      tags: ["node", "esm", "commonjs", "npm"],
      component: () => import("./modules/modules-packages-and-tooling"),
    },
    {
      slug: "buffers-streams-and-files",
      title: "Buffers, Streams & File Systems",
      order: 3,
      estimatedMinutes: 45,
      tags: ["node", "buffers", "streams", "fs"],
      component: () => import("./modules/buffers-streams-and-files"),
    },
    {
      slug: "networking-http-and-apis",
      title: "Networking, HTTP & APIs",
      order: 4,
      estimatedMinutes: 45,
      tags: ["node", "http", "fetch", "apis"],
      component: () => import("./modules/networking-http-and-apis"),
    },
    {
      slug: "testing-debugging-and-observability",
      title: "Testing, Debugging & Observability",
      order: 5,
      estimatedMinutes: 40,
      tags: ["node", "testing", "debugging", "observability"],
      component: () => import("./modules/testing-debugging-and-observability"),
    },
    {
      slug: "performance-workers-and-scaling",
      title: "Performance, Workers & Scaling",
      order: 6,
      estimatedMinutes: 45,
      tags: ["node", "performance", "worker-threads", "scaling"],
      component: () => import("./modules/performance-workers-and-scaling"),
    },
    {
      slug: "security-and-production-hardening",
      title: "Security & Production Hardening",
      order: 7,
      estimatedMinutes: 40,
      tags: ["node", "security", "production", "secrets"],
      component: () => import("./modules/security-and-production-hardening"),
    },
    {
      slug: "node-architecture-patterns",
      title: "Node.js Architecture Patterns",
      order: 8,
      estimatedMinutes: 40,
      tags: ["node", "architecture", "queues", "services"],
      component: () => import("./modules/node-architecture-patterns"),
    },
    {
      slug: "nodejs-most-common-interview-questions",
      title: "Node.js Most Common Interview Questions",
      order: 9,
      estimatedMinutes: 60,
      tags: ["node", "interview", "questions", "backend"],
      component: () =>
        import("./modules/nodejs-most-common-interview-questions"),
    },
  ],
  learningPath: [
    "node-runtime-architecture",
    "event-loop-and-async-patterns",
    "modules-packages-and-tooling",
    "buffers-streams-and-files",
    "networking-http-and-apis",
    "testing-debugging-and-observability",
    "performance-workers-and-scaling",
    "security-and-production-hardening",
    "node-architecture-patterns",
    "nodejs-most-common-interview-questions",
  ],
  groups: [
    {
      id: "node-foundations",
      title: "Runtime Foundations",
      description:
        "How Node.js actually runs JavaScript: V8, libuv, the event loop, packages, and async control flow.",
      routeSlugs: [
        "node-runtime-architecture",
        "event-loop-and-async-patterns",
        "modules-packages-and-tooling",
      ],
    },
    {
      id: "io-networking",
      title: "I/O, Data Flow & Networking",
      description:
        "Buffers, streams, files, sockets, HTTP servers, and modern API-building primitives.",
      routeSlugs: ["buffers-streams-and-files", "networking-http-and-apis"],
    },
    {
      id: "engineering-production",
      title: "Engineering for Production",
      description:
        "Testing, observability, performance tuning, worker strategies, security, and production readiness.",
      routeSlugs: [
        "testing-debugging-and-observability",
        "performance-workers-and-scaling",
        "security-and-production-hardening",
      ],
    },
    {
      id: "architecture-interview",
      title: "Architecture & Interview Prep",
      description:
        "Service boundaries, queues, background jobs, and the interview answers senior Node.js engineers are expected to know.",
      routeSlugs: [
        "node-architecture-patterns",
        "nodejs-most-common-interview-questions",
      ],
    },
  ],
};

export default manifest;
