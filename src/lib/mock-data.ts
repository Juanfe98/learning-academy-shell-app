import type { AcademyManifest, AcademyRoute } from "./types/academy";

export type MockAcademyRoute = Omit<AcademyRoute, "component">;

export interface MockAcademy
  extends Omit<AcademyManifest, "routes" | "totalEstimatedMinutes"> {
  comingSoon?: boolean;
  moduleCount: number;
  totalHours: number;
  routes: MockAcademyRoute[];
}

export const MOCK_ACADEMIES: MockAcademy[] = [
  {
    slug: "apollo-graphql",
    title: "Apollo GraphQL",
    description:
      "Master the Apollo ecosystem — client, server, caching, federation, and production patterns for modern GraphQL APIs.",
    version: "1.0.0",
    icon: "⚡",
    accentColor: "#e535ab",
    moduleCount: 12,
    totalHours: 9,
    comingSoon: false,
    routes: [
      {
        slug: "intro",
        title: "Introduction to GraphQL",
        order: 0,
        estimatedMinutes: 25,
        tags: ["fundamentals"],
      },
      {
        slug: "schema-design",
        title: "Schema Design Principles",
        order: 1,
        estimatedMinutes: 35,
        tags: ["schema", "design"],
      },
      {
        slug: "queries-mutations",
        title: "Queries & Mutations",
        order: 2,
        estimatedMinutes: 40,
        tags: ["core"],
      },
      {
        slug: "apollo-client-setup",
        title: "Apollo Client Setup",
        order: 3,
        estimatedMinutes: 30,
        tags: ["client"],
      },
      {
        slug: "caching",
        title: "Caching & Normalization",
        order: 4,
        estimatedMinutes: 45,
        tags: ["client", "performance"],
      },
      {
        slug: "subscriptions",
        title: "Real-time with Subscriptions",
        order: 5,
        estimatedMinutes: 35,
        tags: ["realtime"],
      },
      {
        slug: "apollo-server",
        title: "Apollo Server Fundamentals",
        order: 6,
        estimatedMinutes: 40,
        tags: ["server"],
      },
      {
        slug: "resolvers",
        title: "Resolver Patterns",
        order: 7,
        estimatedMinutes: 50,
        tags: ["server", "patterns"],
      },
      {
        slug: "dataloaders",
        title: "DataLoaders & N+1",
        order: 8,
        estimatedMinutes: 35,
        tags: ["performance", "server"],
      },
      {
        slug: "auth",
        title: "Authentication & Authorization",
        order: 9,
        estimatedMinutes: 45,
        tags: ["security"],
      },
      {
        slug: "federation",
        title: "Apollo Federation",
        order: 10,
        estimatedMinutes: 60,
        tags: ["advanced", "federation"],
      },
      {
        slug: "production",
        title: "Production Best Practices",
        order: 11,
        estimatedMinutes: 40,
        tags: ["production"],
      },
    ],
    learningPath: [
      "intro",
      "schema-design",
      "queries-mutations",
      "apollo-client-setup",
      "caching",
      "subscriptions",
      "apollo-server",
      "resolvers",
      "dataloaders",
      "auth",
      "federation",
      "production",
    ],
  },
  {
    slug: "web-fundamentals",
    title: "Web Fundamentals",
    description:
      "A ground-up tour of the web platform — HTTP, HTML, CSS, JavaScript, and how browsers turn bytes into pixels.",
    version: "1.0.0",
    icon: "🌐",
    accentColor: "#0ea5e9",
    moduleCount: 5,
    totalHours: 1.5,
    comingSoon: false,
    routes: [
      { slug: "intro", title: "Introduction to the Web", order: 0, estimatedMinutes: 10, tags: ["fundamentals", "http"] },
      { slug: "html-structure", title: "HTML Structure", order: 1, estimatedMinutes: 15, tags: ["html", "semantics"] },
      { slug: "css-fundamentals", title: "CSS Fundamentals", order: 2, estimatedMinutes: 20, tags: ["css", "layout"] },
      { slug: "javascript-basics", title: "JavaScript Basics", order: 3, estimatedMinutes: 25, tags: ["javascript", "dom"] },
      { slug: "how-browsers-work", title: "How Browsers Work", order: 4, estimatedMinutes: 15, tags: ["browser", "performance"] },
    ],
    learningPath: ["intro", "html-structure", "css-fundamentals", "javascript-basics", "how-browsers-work"],
  },
  {
    slug: "graphql-core",
    title: "GraphQL Core",
    description:
      "Deep dive into the GraphQL specification — type system, execution model, introspection, and language internals.",
    version: "0.1.0",
    icon: "◈",
    accentColor: "#e10098",
    moduleCount: 8,
    totalHours: 6,
    comingSoon: true,
    routes: [],
    learningPath: [],
  },
  {
    slug: "typescript",
    title: "TypeScript Mastery",
    description:
      "From structural typing and generics to advanced type inference, decorators, and compiler internals.",
    version: "0.1.0",
    icon: "Ts",
    accentColor: "#3178c6",
    moduleCount: 15,
    totalHours: 12,
    comingSoon: true,
    routes: [],
    learningPath: [],
  },
];
