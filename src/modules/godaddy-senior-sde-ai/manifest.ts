import type { AcademyManifest } from "@/lib/types/academy";

const manifest: AcademyManifest = {
  slug: "godaddy-senior-sde-ai",
  title: "GoDaddy — Senior SDE (AI Care) Prep",
  description:
    "Tailored prep for the GoDaddy Senior Software Development Engineer — Care Team (AI) role. Covers Domain Driven Design, Hexagonal Architecture, TypeScript & Go backend engineering, AWS platform, LLM/AI integration patterns, Temporal workflow orchestration, system design for AI customer care, and a full interview simulation.",
  version: "1.0.0",
  icon: "🤖",
  accentColor: "#1bdbad",
  totalEstimatedMinutes: 600,
  routes: [
    {
      slug: "ddd-and-hexagonal-architecture",
      title: "DDD & Hexagonal Architecture",
      order: 0,
      estimatedMinutes: 80,
      tags: ["ddd", "hexagonal", "clean-architecture", "cqrs", "design-patterns", "bounded-context"],
      component: () => import("./modules/ddd-and-hexagonal-architecture"),
    },
    {
      slug: "typescript-backend-engineering",
      title: "TypeScript Backend Engineering",
      order: 1,
      estimatedMinutes: 70,
      tags: ["typescript", "nodejs", "rest-api", "dependency-injection", "testing", "zod"],
      component: () => import("./modules/typescript-backend-engineering"),
    },
    {
      slug: "golang-for-backend",
      title: "Golang for Backend Engineers",
      order: 2,
      estimatedMinutes: 75,
      tags: ["golang", "go", "goroutines", "channels", "concurrency", "http", "testing"],
      component: () => import("./modules/golang-for-backend"),
    },
    {
      slug: "aws-backend-platform",
      title: "AWS Backend Platform Engineering",
      order: 3,
      estimatedMinutes: 80,
      tags: ["aws", "lambda", "dynamodb", "sqs", "cdk", "cloudwatch", "iam", "terraform"],
      component: () => import("./modules/aws-backend-platform"),
    },
    {
      slug: "ai-llm-integration-patterns",
      title: "AI & LLM Integration Patterns",
      order: 4,
      estimatedMinutes: 85,
      tags: ["ai", "llm", "rag", "vector-db", "agents", "prompt-engineering", "bedrock", "openai"],
      component: () => import("./modules/ai-llm-integration-patterns"),
    },
    {
      slug: "temporal-workflow-engine",
      title: "Temporal Workflow Engine",
      order: 5,
      estimatedMinutes: 65,
      tags: ["temporal", "workflows", "activities", "saga", "durable-execution", "orchestration"],
      component: () => import("./modules/temporal-workflow-engine"),
    },
    {
      slug: "system-design-godaddy-ai-care",
      title: "System Design: GoDaddy AI Care Platform",
      order: 6,
      estimatedMinutes: 85,
      tags: ["system-design", "ai", "customer-care", "chatbot", "rag", "aws", "scalability"],
      component: () => import("./modules/system-design-godaddy-ai-care"),
    },
    {
      slug: "interview-simulation",
      title: "Interview Simulation: Senior SDE AI",
      order: 7,
      estimatedMinutes: 90,
      tags: ["interview", "simulation", "coding", "system-design", "behavioral", "godaddy"],
      component: () => import("./modules/interview-simulation"),
    },
  ],
  learningPath: [
    "ddd-and-hexagonal-architecture",
    "typescript-backend-engineering",
    "golang-for-backend",
    "aws-backend-platform",
    "ai-llm-integration-patterns",
    "temporal-workflow-engine",
    "system-design-godaddy-ai-care",
    "interview-simulation",
  ],
  groups: [
    {
      id: "architecture-foundations",
      title: "Architecture Foundations",
      description:
        "Domain Driven Design, Hexagonal Architecture, TypeScript and Golang backend engineering — the software craftsmanship core GoDaddy evaluates heavily.",
      routeSlugs: [
        "ddd-and-hexagonal-architecture",
        "typescript-backend-engineering",
        "golang-for-backend",
      ],
    },
    {
      id: "aws-and-platform",
      title: "AWS & Platform Engineering",
      description:
        "AWS services (Lambda, DynamoDB, SQS, CDK), observability, security, and the infrastructure patterns behind fault-tolerant, globally available systems.",
      routeSlugs: ["aws-backend-platform"],
    },
    {
      id: "ai-engineering",
      title: "AI Engineering",
      description:
        "LLM integration, RAG pipelines, vector databases, AI agent architecture, and Temporal for orchestrating complex AI workflows.",
      routeSlugs: ["ai-llm-integration-patterns", "temporal-workflow-engine"],
    },
    {
      id: "interview-ready",
      title: "Interview Ready",
      description:
        "Full system design for GoDaddy's AI care platform plus a complete interview simulation with model answers.",
      routeSlugs: ["system-design-godaddy-ai-care", "interview-simulation"],
    },
  ],
};

export default manifest;
