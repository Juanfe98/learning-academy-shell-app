import type { AcademyManifest } from "@/lib/types/academy";

const manifest: AcademyManifest = {
  slug: "disney-staff-engineer",
  title: "Disney — Staff Engineer Interview Prep",
  description:
    "Tailored prep for the Disney Staff Software Engineer role. Covers React architecture at scale, advanced TypeScript, high-availability performance, API design leadership, technical leadership patterns, Disney-scale system design, and a full interview simulation with architect-level Q&A.",
  version: "1.0.0",
  icon: "🏰",
  accentColor: "#0063e5",
  totalEstimatedMinutes: 540,
  routes: [
    {
      slug: "react-architecture-at-scale",
      title: "React Architecture at Scale",
      order: 0,
      estimatedMinutes: 80,
      tags: ["react", "architecture", "micro-frontends", "state-management", "patterns"],
      component: () => import("./modules/react-architecture-at-scale"),
    },
    {
      slug: "typescript-for-architects",
      title: "TypeScript for Architects",
      order: 1,
      estimatedMinutes: 70,
      tags: ["typescript", "advanced-types", "generics", "type-safety", "api-contracts"],
      component: () => import("./modules/typescript-for-architects"),
    },
    {
      slug: "performance-and-scalability",
      title: "Performance & High-Scale Engineering",
      order: 2,
      estimatedMinutes: 75,
      tags: ["performance", "core-web-vitals", "cdn", "caching", "high-availability"],
      component: () => import("./modules/performance-and-scalability"),
    },
    {
      slug: "api-design-and-collaboration",
      title: "API Design & Cross-Team Collaboration",
      order: 3,
      estimatedMinutes: 65,
      tags: ["api", "rest", "graphql", "contract-testing", "bff", "collaboration"],
      component: () => import("./modules/api-design-and-collaboration"),
    },
    {
      slug: "technical-leadership",
      title: "Technical Leadership for Staff Engineers",
      order: 4,
      estimatedMinutes: 70,
      tags: ["leadership", "adr", "rfc", "mentoring", "technical-debt", "code-review"],
      component: () => import("./modules/technical-leadership"),
    },
    {
      slug: "system-design-disney-platform",
      title: "System Design: Disney-Scale Web Platform",
      order: 5,
      estimatedMinutes: 90,
      tags: ["system-design", "disney", "architecture", "streaming", "cdn", "auth"],
      component: () => import("./modules/system-design-disney-platform"),
    },
    {
      slug: "interview-simulation",
      title: "Interview Simulation: Architect Level",
      order: 6,
      estimatedMinutes: 90,
      tags: ["interview", "simulation", "coding", "system-design", "behavioral", "disney"],
      component: () => import("./modules/interview-simulation"),
    },
  ],
  learningPath: [
    "react-architecture-at-scale",
    "typescript-for-architects",
    "performance-and-scalability",
    "api-design-and-collaboration",
    "technical-leadership",
    "system-design-disney-platform",
    "interview-simulation",
  ],
  groups: [
    {
      id: "core-engineering",
      title: "Core Engineering Excellence",
      description:
        "React architecture patterns, advanced TypeScript, and performance engineering at the scale Disney requires.",
      routeSlugs: [
        "react-architecture-at-scale",
        "typescript-for-architects",
        "performance-and-scalability",
      ],
    },
    {
      id: "leadership-design",
      title: "Leadership & System Design",
      description:
        "API design across teams, staff engineer leadership patterns, and full Disney-scale system design.",
      routeSlugs: [
        "api-design-and-collaboration",
        "technical-leadership",
        "system-design-disney-platform",
      ],
    },
    {
      id: "interview-ready",
      title: "Interview Ready",
      description:
        "Full interview simulation with architect-level coding challenges, system design walkthroughs, and behavioral Q&A.",
      routeSlugs: ["interview-simulation"],
    },
  ],
};

export default manifest;
