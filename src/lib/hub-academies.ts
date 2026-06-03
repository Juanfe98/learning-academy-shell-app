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
    keywords: ["scalability", "availability", "reliability", "CAP theorem", "trade-offs", "requirements gathering", "back of envelope estimation", "NFR"],
  },
  {
    slug: "request-lifecycle",
    title: "The Full Request Lifecycle",
    order: 1,
    estimatedMinutes: 35,
    tags: ["networking", "dns", "http", "architecture"],
    keywords: ["browser to server", "HTTP request", "TCP handshake", "TLS", "DNS resolution", "load balancer", "response", "round trip"],
  },
  {
    slug: "networking-fundamentals",
    title: "Networking Fundamentals",
    order: 2,
    estimatedMinutes: 40,
    tags: ["networking", "http", "tcp", "dns", "tls"],
    keywords: ["OSI model", "IP", "port", "UDP", "TCP vs UDP", "subnet", "CIDR", "packet", "latency", "bandwidth", "SSL"],
  },
  {
    slug: "aws-cloud-networking",
    title: "AWS Cloud Networking (VPC)",
    order: 3,
    estimatedMinutes: 40,
    tags: ["aws", "vpc", "networking", "security-groups"],
    keywords: ["VPC", "subnet", "NACL", "security group", "internet gateway", "NAT gateway", "VPN", "peering", "private subnet", "public subnet", "route table"],
  },
  {
    slug: "dns-and-route53",
    title: "DNS & Route 53",
    order: 4,
    estimatedMinutes: 25,
    tags: ["aws", "dns", "route53", "failover", "routing"],
    keywords: ["Route 53", "DNS resolution", "A record", "CNAME", "Alias record", "weighted routing", "failover routing", "latency-based routing", "health check", "TTL", "canary"],
  },
  {
    slug: "cdn-and-cloudfront",
    title: "CDN & CloudFront",
    order: 5,
    estimatedMinutes: 25,
    tags: ["aws", "cdn", "cloudfront", "caching", "edge"],
    keywords: ["what is a CDN", "CloudFront", "edge location", "cache hit", "cache miss", "cache hit ratio", "origin", "distribution", "behavior", "TTL", "invalidation", "Lambda@Edge", "CloudFront Functions"],
  },
  {
    slug: "load-balancers-and-api-gateway",
    title: "Load Balancers, API Gateway & WAF",
    order: 6,
    estimatedMinutes: 30,
    tags: ["aws", "load-balancer", "alb", "nlb", "api-gateway", "waf"],
    keywords: ["ALB", "NLB", "Layer 7", "Layer 4", "path routing", "host routing", "target group", "health check", "zero downtime deploy", "API Gateway", "HTTP API", "REST API", "WebSocket API", "WAF", "rate limiting"],
  },
  {
    slug: "stateless-horizontal-scaling",
    title: "Stateless Services & Horizontal Scaling",
    order: 7,
    estimatedMinutes: 30,
    tags: ["architecture", "scaling", "stateless", "ecs", "lambda"],
    keywords: ["horizontal vs vertical", "auto-scaling", "ECS task", "Lambda concurrency", "stateless service", "session externalization", "scale out"],
  },
  {
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL: Choosing the Right Database",
    order: 8,
    estimatedMinutes: 40,
    tags: ["databases", "sql", "nosql", "dynamodb", "postgres"],
    keywords: ["relational", "ACID", "BASE", "RDS", "Aurora", "MongoDB", "when to use NoSQL", "schema design", "normalization", "denormalization"],
  },
  {
    slug: "dynamodb-deep-dive",
    title: "DynamoDB Deep Dive",
    order: 9,
    estimatedMinutes: 45,
    tags: ["aws", "dynamodb", "nosql", "databases"],
    keywords: ["partition key", "sort key", "GSI", "LSI", "DynamoDB streams", "single table design", "read consistency", "WCU", "RCU", "hot partition"],
  },
  {
    slug: "s3-object-storage",
    title: "S3 & Object Storage",
    order: 10,
    estimatedMinutes: 30,
    tags: ["aws", "s3", "storage", "object-storage"],
    keywords: ["bucket", "presigned URL", "multipart upload", "S3 lifecycle", "versioning", "static hosting", "object storage vs block", "S3 event notification"],
  },
  {
    slug: "caching-strategies",
    title: "Caching Strategies",
    order: 11,
    estimatedMinutes: 35,
    tags: ["caching", "redis", "performance", "architecture"],
    keywords: ["ElastiCache", "Redis cluster", "cache hit", "cache miss", "write-through", "write-behind", "read-through", "cache eviction", "LRU", "TTL", "Memcached"],
  },
  {
    slug: "performance-engineering",
    title: "Performance Engineering",
    order: 12,
    estimatedMinutes: 35,
    tags: ["performance", "latency", "throughput", "optimization"],
    keywords: ["P99", "P95", "percentile latency", "bottleneck", "profiling", "X-Ray", "slow query", "connection pooling", "flame graph", "benchmarking"],
  },
  {
    slug: "queues-background-workers",
    title: "Queues & Background Workers",
    order: 13,
    estimatedMinutes: 35,
    tags: ["aws", "sqs", "queues", "async", "workers"],
    keywords: ["SQS", "visibility timeout", "dead letter queue", "FIFO queue", "at-least-once delivery", "idempotency", "Lambda trigger", "batch processing", "job queue"],
  },
  {
    slug: "event-driven-architecture",
    title: "Event-Driven Architecture",
    order: 14,
    estimatedMinutes: 40,
    tags: ["events", "pub-sub", "kafka", "eventbridge", "architecture"],
    keywords: ["EventBridge", "SNS", "Kafka", "consumer group", "topic", "offset", "at-least-once", "exactly-once", "choreography vs orchestration", "event sourcing"],
  },
  {
    slug: "reliability-availability",
    title: "Reliability, Availability & Fault Tolerance",
    order: 15,
    estimatedMinutes: 35,
    tags: ["reliability", "availability", "aws", "multi-az", "failover"],
    keywords: ["SLA", "SLO", "SLI", "uptime", "multi-AZ", "multi-region", "failover", "RTO", "RPO", "disaster recovery", "99.9%", "nines"],
  },
  {
    slug: "resilience-patterns",
    title: "Resilience Patterns: Retries, Circuit Breakers & Idempotency",
    order: 16,
    estimatedMinutes: 35,
    tags: ["resilience", "circuit-breaker", "retries", "idempotency", "distributed-systems"],
    keywords: ["circuit breaker", "retry with backoff", "jitter", "timeout", "bulkhead", "idempotency key", "exponential backoff", "fallback"],
  },
  {
    slug: "auth-architecture",
    title: "Authentication & Authorization Architecture",
    order: 17,
    estimatedMinutes: 40,
    tags: ["auth", "jwt", "oauth2", "cognito", "iam", "security"],
    keywords: ["OAuth 2.0", "OIDC", "Cognito", "IAM roles", "access token", "authorization code flow", "API Gateway authorizer", "OpenID Connect"],
  },
  {
    slug: "cloud-security",
    title: "Cloud Security Fundamentals",
    order: 18,
    estimatedMinutes: 35,
    tags: ["security", "aws", "iam", "encryption", "secrets"],
    keywords: ["IAM policy", "least privilege", "KMS", "Secrets Manager", "Parameter Store", "encryption at rest", "encryption in transit", "VPC endpoint", "CloudTrail"],
  },
  {
    slug: "observability",
    title: "Observability: Logs, Metrics & Traces",
    order: 19,
    estimatedMinutes: 35,
    tags: ["observability", "logs", "metrics", "traces", "cloudwatch"],
    keywords: ["CloudWatch", "X-Ray", "distributed tracing", "structured logs", "dashboard", "alarm", "anomaly detection", "correlation ID", "OpenTelemetry"],
  },
  {
    slug: "incident-response",
    title: "Incident Response & Production Debugging",
    order: 20,
    estimatedMinutes: 30,
    tags: ["incidents", "debugging", "production", "runbooks", "postmortem"],
    keywords: ["runbook", "postmortem", "MTTD", "MTTR", "on-call", "alerting", "escalation", "rollback", "feature flag", "blameless"],
  },
  {
    slug: "cicd-deployment",
    title: "CI/CD & Deployment Strategies",
    order: 21,
    estimatedMinutes: 35,
    tags: ["ci-cd", "deployment", "docker", "github-actions", "aws"],
    keywords: ["blue-green", "canary", "rolling", "CodePipeline", "GitHub Actions", "artifact", "deployment strategy", "rollback", "zero downtime deploy"],
  },
  {
    slug: "containers-orchestration",
    title: "Docker, ECS & Container Orchestration",
    order: 22,
    estimatedMinutes: 40,
    tags: ["docker", "containers", "ecs", "kubernetes", "lambda"],
    keywords: ["Dockerfile", "image", "container", "ECS task definition", "Fargate", "ECR", "Kubernetes comparison", "auto-scaling", "health check", "k8s"],
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
        "dns-and-route53",
        "cdn-and-cloudfront",
        "load-balancers-and-api-gateway",
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
