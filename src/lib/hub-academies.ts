import type { AcademyGroup, AcademyRoute } from "./types/academy";
import { MOCK_ACADEMIES } from "./mock-data";

export type HubAcademyRoute = Omit<AcademyRoute, "component">;

export interface HubAcademy {
  slug: string;
  title: string;
  description: string;
  version: string;
  icon: string;
  accentColor: string;
  learningPath: string[];
  groups?: AcademyGroup[];
  routes: HubAcademyRoute[];
  moduleCount: number;
  totalHours: number;
  comingSoon?: boolean;
  externalUrl?: string;
}

const SYSTEM_DESIGN_AWS_RELEASED_ROUTES: HubAcademyRoute[] = [
  {
    slug: "what-is-system-design",
    title: "What Is System Design?",
    order: 0,
    estimatedMinutes: 30,
    tags: ["fundamentals", "architecture", "overview"],
  },
  {
    slug: "request-lifecycle",
    title: "The Full Request Lifecycle",
    order: 1,
    estimatedMinutes: 35,
    tags: ["networking", "dns", "http", "architecture"],
  },
  {
    slug: "networking-fundamentals",
    title: "Networking Fundamentals",
    order: 2,
    estimatedMinutes: 40,
    tags: ["networking", "http", "tcp", "dns", "tls"],
  },
  {
    slug: "aws-cloud-networking",
    title: "AWS Cloud Networking (VPC)",
    order: 3,
    estimatedMinutes: 40,
    tags: ["aws", "vpc", "networking", "security-groups"],
  },
  {
    slug: "traffic-entry-layer",
    title: "DNS, CDN, Load Balancers & API Gateway",
    order: 4,
    estimatedMinutes: 35,
    tags: ["aws", "cdn", "load-balancer", "api-gateway", "route53"],
  },
  {
    slug: "stateless-horizontal-scaling",
    title: "Stateless Services & Horizontal Scaling",
    order: 5,
    estimatedMinutes: 30,
    tags: ["architecture", "scaling", "stateless", "ecs", "lambda"],
  },
  {
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL: Choosing the Right Database",
    order: 6,
    estimatedMinutes: 40,
    tags: ["databases", "sql", "nosql", "dynamodb", "postgres"],
  },
  {
    slug: "dynamodb-deep-dive",
    title: "DynamoDB Deep Dive",
    order: 7,
    estimatedMinutes: 45,
    tags: ["aws", "dynamodb", "nosql", "databases"],
  },
  {
    slug: "s3-object-storage",
    title: "S3 & Object Storage",
    order: 8,
    estimatedMinutes: 30,
    tags: ["aws", "s3", "storage", "object-storage"],
  },
  {
    slug: "caching-strategies",
    title: "Caching Strategies",
    order: 9,
    estimatedMinutes: 35,
    tags: ["caching", "redis", "performance", "architecture"],
  },
  {
    slug: "performance-engineering",
    title: "Performance Engineering",
    order: 10,
    estimatedMinutes: 35,
    tags: ["performance", "latency", "throughput", "optimization"],
  },
  {
    slug: "queues-background-workers",
    title: "Queues & Background Workers",
    order: 11,
    estimatedMinutes: 35,
    tags: ["aws", "sqs", "queues", "async", "workers"],
  },
  {
    slug: "event-driven-architecture",
    title: "Event-Driven Architecture",
    order: 12,
    estimatedMinutes: 40,
    tags: ["events", "pub-sub", "kafka", "eventbridge", "architecture"],
  },
  {
    slug: "reliability-availability",
    title: "Reliability, Availability & Fault Tolerance",
    order: 13,
    estimatedMinutes: 35,
    tags: ["reliability", "availability", "aws", "multi-az", "failover"],
  },
  {
    slug: "resilience-patterns",
    title: "Resilience Patterns: Retries, Circuit Breakers & Idempotency",
    order: 14,
    estimatedMinutes: 35,
    tags: ["resilience", "circuit-breaker", "retries", "idempotency", "distributed-systems"],
  },
  {
    slug: "auth-architecture",
    title: "Authentication & Authorization Architecture",
    order: 15,
    estimatedMinutes: 40,
    tags: ["auth", "jwt", "oauth2", "cognito", "iam", "security"],
  },
  {
    slug: "cloud-security",
    title: "Cloud Security Fundamentals",
    order: 16,
    estimatedMinutes: 35,
    tags: ["security", "aws", "iam", "encryption", "secrets"],
  },
  {
    slug: "observability",
    title: "Observability: Logs, Metrics & Traces",
    order: 17,
    estimatedMinutes: 35,
    tags: ["observability", "logs", "metrics", "traces", "cloudwatch"],
  },
  {
    slug: "incident-response",
    title: "Incident Response & Production Debugging",
    order: 18,
    estimatedMinutes: 30,
    tags: ["incidents", "debugging", "production", "runbooks", "postmortem"],
  },
  {
    slug: "cicd-deployment",
    title: "CI/CD & Deployment Strategies",
    order: 19,
    estimatedMinutes: 35,
    tags: ["ci-cd", "deployment", "docker", "github-actions", "aws"],
  },
  {
    slug: "containers-orchestration",
    title: "Docker, ECS & Container Orchestration",
    order: 20,
    estimatedMinutes: 40,
    tags: ["docker", "containers", "ecs", "kubernetes", "lambda"],
  },
];

const SYSTEM_DESIGN_AWS_RELEASED: HubAcademy = {
  slug: "system-design-aws",
  title: "System Design & AWS",
  description:
    "Master system design from first principles through AWS-powered production architecture. Built for senior engineers preparing for architecture interviews and real-world cloud design.",
  version: "1.0.0",
  icon: "🏗️",
  accentColor: "#f59e0b",
  moduleCount: SYSTEM_DESIGN_AWS_RELEASED_ROUTES.length,
  totalHours: Math.round(
    SYSTEM_DESIGN_AWS_RELEASED_ROUTES.reduce(
      (sum, route) => sum + route.estimatedMinutes,
      0,
    ) / 60,
  ),
  routes: SYSTEM_DESIGN_AWS_RELEASED_ROUTES,
  learningPath: SYSTEM_DESIGN_AWS_RELEASED_ROUTES.map((route) => route.slug),
  groups: [
    {
      id: "request-path-compute",
      title: "Request Path & Compute Foundations",
      description: "The end-to-end request lifecycle, cloud networking, and stateless service architecture.",
      routeSlugs: [
        "what-is-system-design",
        "request-lifecycle",
        "networking-fundamentals",
        "aws-cloud-networking",
        "traffic-entry-layer",
        "stateless-horizontal-scaling",
      ],
    },
    {
      id: "data-storage-performance",
      title: "Data, Storage & Performance",
      description: "Databases, object storage, caching, and performance fundamentals.",
      routeSlugs: [
        "sql-vs-nosql",
        "dynamodb-deep-dive",
        "s3-object-storage",
        "caching-strategies",
        "performance-engineering",
      ],
    },
    {
      id: "async-reliability-ops",
      title: "Async Systems, Reliability & Operations",
      description: "Queues, events, resilience, security, observability, and operational readiness.",
      routeSlugs: [
        "queues-background-workers",
        "event-driven-architecture",
        "reliability-availability",
        "resilience-patterns",
        "auth-architecture",
        "cloud-security",
        "observability",
        "incident-response",
        "cicd-deployment",
        "containers-orchestration",
      ],
    },
  ],
};

export const HUB_ACADEMIES: HubAcademy[] = [
  ...MOCK_ACADEMIES,
  SYSTEM_DESIGN_AWS_RELEASED,
];
