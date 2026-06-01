import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestPipelineDiagram = String.raw`flowchart LR
  REQ["HTTP Request"]
  REQ --> AUTH["Auth Middleware\nJWT validation\nExtract claims"]
  AUTH --> RATE["Rate Limit Middleware\nPer-IP / per-user\nToken bucket"]
  RATE --> VALID["Validation Middleware\nZod schema parse\nEarly reject bad input"]
  VALID --> LOG["Logging Middleware\nCorrelation ID\nRequest context"]
  LOG --> CTRL["Controller\nRoute handler\nCalls use case"]
  CTRL --> USECASE["Application Layer\nUse case / service"]
  USECASE --> DOM["Domain Layer"]
  DOM --> INFRA["Infrastructure Layer"]
  INFRA --> CTRL
  CTRL --> ERR["Error Handler Middleware\nMaps domain errors to HTTP\nStructured error response"]
  ERR --> RES["HTTP Response"]`;

const dependencyInjectionDiagram = String.raw`flowchart TD
  COMP["Composition Root\n(app startup)\nWires all dependencies together"]
  COMP --> REPO["DynamoDbTicketRepository\n(implements TicketRepository)"]
  COMP --> BUS["SqsEventBus\n(implements DomainEventBus)"]
  COMP --> AI["BedrockClassifier\n(implements AiClassificationPort)"]
  COMP --> UC["EscalateTicketUseCase\nreceives: TicketRepository, DomainEventBus"]
  COMP --> CTRL["TicketController\nreceives: EscalateTicketUseCase"]
  TEST["Test Composition Root\nReplaces with InMemory adapters"]
  TEST --> IN_REPO["InMemoryTicketRepository"]
  TEST --> IN_BUS["InMemoryEventBus"]
  TEST --> IN_AI["StubAiClassifier"]`;

export const toc: TocItem[] = [
  { id: "type-safe-rest", title: "Type-Safe REST API Design", level: 2 },
  { id: "openapi-zod", title: "OpenAPI + Zod as Contract", level: 3 },
  { id: "request-pipeline", title: "Request Pipeline & Middleware", level: 2 },
  { id: "error-handling", title: "Structured Error Handling", level: 3 },
  { id: "dependency-injection", title: "Dependency Injection in TypeScript", level: 2 },
  { id: "composition-root", title: "Composition Root Pattern", level: 3 },
  { id: "testing-strategy", title: "Testing Strategy", level: 2 },
  { id: "unit-tests", title: "Unit Tests — Domain Logic", level: 3 },
  { id: "integration-tests", title: "Integration Tests — API Layer", level: 3 },
  { id: "advanced-patterns", title: "Advanced TypeScript Patterns", level: 2 },
  { id: "result-type", title: "Result Type for Error Handling", level: 3 },
  { id: "decorators", title: "Decorators for Clean Code", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Backend Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypescriptBackendEngineering() {
  return (
    <div className="article-content">
      <p>
        GoDaddy&apos;s JD requires 8+ years of backend REST API development with strong
        TypeScript proficiency. At the senior level, the bar is not &quot;can you write
        TypeScript&quot; — it is &quot;can you design a type-safe, testable, maintainable
        backend service from scratch.&quot; This module covers the patterns that separate
        a good TypeScript backend from a great one.
      </p>

      <h2 id="type-safe-rest">Type-Safe REST API Design</h2>
      <p>
        The most common failure mode in TypeScript backends: types that exist only on paper.
        Controllers accept <code>req.body: any</code>, pass it through the stack, and crash
        at the database layer with a runtime type error. The solution is end-to-end type safety
        from the HTTP contract to the domain layer.
      </p>

      <h3 id="openapi-zod">OpenAPI + Zod as Contract</h3>
      <p>
        Zod schemas serve as the single source of truth for both runtime validation and
        TypeScript types. By generating OpenAPI specs from Zod, the API documentation stays
        in sync automatically — no manual spec maintenance.
      </p>
      <pre><code>{`import { z } from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";  // or similar

// Zod schema = runtime validator + TypeScript type + OpenAPI schema
const CreateTicketRequestSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(["billing", "technical", "account", "domain", "hosting"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  attachments: z.array(z.string().url()).max(5).default([]),
});

const CreateTicketResponseSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.literal("open"),
  estimatedResponseTime: z.string(),  // ISO duration: "PT4H"
  createdAt: z.string().datetime(),
});

// TypeScript types derived — zero duplication
type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;
type CreateTicketResponse = z.infer<typeof CreateTicketResponseSchema>;

// Route definition — types flow from schema to handler automatically
const createTicketRoute = createRoute({
  method: "post",
  path: "/api/v1/tickets",
  request: {
    body: { content: { "application/json": { schema: CreateTicketRequestSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: CreateTicketResponseSchema } }, description: "Created" },
    422: { content: { "application/json": { schema: ValidationErrorSchema } }, description: "Validation error" },
  },
});

// Handler: body is fully typed — no any, no casting
app.openapi(createTicketRoute, async (c) => {
  const body = c.req.valid("json");  // type: CreateTicketRequest — guaranteed valid
  const ticket = await createTicketUseCase.execute(body);
  return c.json(CreateTicketResponseSchema.parse(ticket), 201);
});`}</code></pre>

      <h2 id="request-pipeline">Request Pipeline & Middleware</h2>

      <MermaidDiagram
        chart={requestPipelineDiagram}
        title="TypeScript Backend Request Pipeline"
        caption="Each middleware has a single responsibility. The error handler is the last middleware — it translates domain errors to HTTP status codes without leaking internals to the caller."
        minHeight={200}
      />

      <pre><code>{`// Correlation ID middleware — thread request context through all logs
import { AsyncLocalStorage } from "async_hooks";

const requestContext = new AsyncLocalStorage<{ correlationId: string; userId?: string }>();

function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers["x-correlation-id"] as string ?? crypto.randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  requestContext.run({ correlationId }, next);
}

// Logger always includes correlationId — no manual passing required
const logger = {
  info: (msg: string, meta?: object) =>
    console.log(JSON.stringify({ level: "info", msg, ...requestContext.getStore(), ...meta })),
  error: (msg: string, meta?: object) =>
    console.error(JSON.stringify({ level: "error", msg, ...requestContext.getStore(), ...meta })),
};

// Auth middleware with typed JWT payload
interface JwtPayload {
  sub: string;         // userId
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = await verifyJwt<JwtPayload>(token, process.env.JWT_SECRET!);
    res.locals.user = payload;    // typed attachment
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}`}</code></pre>

      <h3 id="error-handling">Structured Error Handling</h3>
      <p>
        All domain errors must flow through a single error handler that maps them to HTTP
        responses. Never let infrastructure exceptions (DynamoDB errors, network failures)
        leak through to the API response — they expose internals and confuse clients.
      </p>
      <pre><code>{`// Domain error hierarchy — rich types, HTTP-agnostic
abstract class DomainError extends Error {
  abstract readonly code: string;
}

class TicketNotFoundError extends DomainError {
  readonly code = "TICKET_NOT_FOUND";
  constructor(readonly ticketId: string) {
    super(\`Ticket \${ticketId} not found\`);
  }
}

class TicketAlreadyClosedError extends DomainError {
  readonly code = "TICKET_ALREADY_CLOSED";
  constructor(readonly ticketId: string) {
    super(\`Ticket \${ticketId} is already closed and cannot be modified\`);
  }
}

class InsufficientPermissionsError extends DomainError {
  readonly code = "INSUFFICIENT_PERMISSIONS";
  constructor(readonly resource: string, readonly requiredRole: string) {
    super(\`Requires role: \${requiredRole} to access \${resource}\`);
  }
}

// Global error handler — single place for HTTP mapping
function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  logger.error("Request error", { error: err instanceof Error ? err.message : String(err) });

  if (err instanceof TicketNotFoundError) {
    return res.status(404).json({ code: err.code, message: err.message });
  }
  if (err instanceof TicketAlreadyClosedError) {
    return res.status(409).json({ code: err.code, message: err.message });
  }
  if (err instanceof InsufficientPermissionsError) {
    return res.status(403).json({ code: err.code, message: err.message });
  }
  if (err instanceof z.ZodError) {
    return res.status(422).json({ code: "VALIDATION_FAILED", violations: err.errors });
  }

  // Unknown error — do NOT leak the original error to the client
  res.status(500).json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
}`}</code></pre>

      <h2 id="dependency-injection">Dependency Injection in TypeScript</h2>
      <p>
        Dependency injection makes the hexagonal architecture operational. Every use case
        receives its dependencies through the constructor — it never instantiates concrete
        implementations. This is what makes swapping DynamoDB for an in-memory adapter
        during testing a one-line change.
      </p>

      <MermaidDiagram
        chart={dependencyInjectionDiagram}
        title="Composition Root — Wiring the Dependency Graph"
        caption="The Composition Root is the only place that knows about concrete implementations. Everything else depends on interfaces. Tests provide a separate Composition Root with in-memory adapters."
        minHeight={340}
      />

      <h3 id="composition-root">Composition Root Pattern</h3>
      <pre><code>{`// Manual DI (preferred for clarity over decorator-heavy containers)
// src/composition-root.ts — the ONLY place that imports concrete implementations

import { DynamoDbTicketRepository } from "@/infra/dynamo/DynamoDbTicketRepository";
import { SqsEventBus } from "@/infra/aws/SqsEventBus";
import { BedrockAiClassifier } from "@/infra/ai/BedrockAiClassifier";
import { CreateTicketUseCase } from "@/app/use-cases/CreateTicketUseCase";
import { EscalateTicketUseCase } from "@/app/use-cases/EscalateTicketUseCase";
import { TicketController } from "@/presentation/TicketController";

export function buildDependencies(config: AppConfig) {
  // Infrastructure layer (adapters)
  const ticketRepo = new DynamoDbTicketRepository(config.dynamoClient, config.ticketsTable);
  const eventBus = new SqsEventBus(config.sqsClient, config.eventQueueUrl);
  const aiClassifier = new BedrockAiClassifier(config.bedrockClient, config.modelId);

  // Application layer (use cases receive interfaces, not implementations)
  const createTicket = new CreateTicketUseCase(ticketRepo, eventBus, aiClassifier);
  const escalateTicket = new EscalateTicketUseCase(ticketRepo, eventBus);

  // Presentation layer (controllers receive use cases)
  const ticketController = new TicketController(createTicket, escalateTicket);

  return { ticketController };
}

// src/test/composition-root.ts — identical shape, all in-memory
export function buildTestDependencies() {
  const ticketRepo = new InMemoryTicketRepository();
  const eventBus = new InMemoryEventBus();
  const aiClassifier = new StubAiClassifier();

  const createTicket = new CreateTicketUseCase(ticketRepo, eventBus, aiClassifier);
  const escalateTicket = new EscalateTicketUseCase(ticketRepo, eventBus);
  const ticketController = new TicketController(createTicket, escalateTicket);

  return { ticketController, ticketRepo, eventBus }; // expose repos for test assertions
}`}</code></pre>

      <h2 id="testing-strategy">Testing Strategy</h2>

      <ArticleTable caption="Test types for a TypeScript backend — scope, dependencies, speed." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Test type</th>
              <th>Dependencies</th>
              <th>Speed</th>
              <th>What it validates</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Domain</td>
              <td>Unit test</td>
              <td>None — pure TypeScript</td>
              <td>&lt; 1ms per test</td>
              <td>Business rules, invariants, domain events emitted correctly</td>
            </tr>
            <tr>
              <td>Application</td>
              <td>Unit test</td>
              <td>In-memory adapters</td>
              <td>&lt; 5ms per test</td>
              <td>Use case orchestration, correct adapter calls, error propagation</td>
            </tr>
            <tr>
              <td>Presentation</td>
              <td>Integration test</td>
              <td>Test HTTP server + in-memory adapters</td>
              <td>~50ms per test</td>
              <td>HTTP routing, auth middleware, validation, response shapes</td>
            </tr>
            <tr>
              <td>Infrastructure</td>
              <td>Integration test</td>
              <td>Real DynamoDB (local/testcontainers)</td>
              <td>~200ms per test</td>
              <td>Query correctness, mapper accuracy, index behavior</td>
            </tr>
            <tr>
              <td>End-to-End</td>
              <td>E2E test</td>
              <td>Deployed staging environment</td>
              <td>~2s per test</td>
              <td>Full flow: API → domain → DB → events</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="unit-tests">Unit Tests — Domain Logic</h3>
      <pre><code>{`// Pure domain unit test — no mocks, no stubs, no DI containers
describe("SupportTicket", () => {
  describe("escalate", () => {
    it("transitions open ticket to escalated and emits domain event", () => {
      const ticket = SupportTicket.create({
        subject: "Domain not resolving",
        customerId: CustomerId.of("cust-123"),
        category: TicketCategory.Domain,
      });

      ticket.escalate("Customer escalated via phone");

      expect(ticket.status).toBe(TicketStatus.Escalated);
      const events = ticket.pullEvents();
      expect(events).toHaveLength(2);  // TicketCreated + TicketEscalated
      expect(events[1]).toMatchObject({
        eventType: "ticket.escalated",
        reason: "Customer escalated via phone",
      });
    });

    it("throws DomainError when escalating a closed ticket", () => {
      const ticket = SupportTicket.reconstitute({ status: TicketStatus.Closed, /* ... */ });
      expect(() => ticket.escalate("reason")).toThrow(TicketAlreadyClosedError);
    });
  });
});

// Application layer unit test — in-memory adapters, no network
describe("EscalateTicketUseCase", () => {
  it("escalates ticket and publishes event", async () => {
    const { createTicket, escalateTicket, ticketRepo, eventBus } = buildTestDependencies();

    // Arrange
    const created = await createTicket.execute({
      subject: "Domain problem", customerId: "cust-123", category: "domain"
    });

    // Act
    await escalateTicket.execute({ ticketId: created.ticketId, reason: "Urgent" });

    // Assert
    const ticket = await ticketRepo.findById(TicketId.of(created.ticketId));
    expect(ticket?.status).toBe(TicketStatus.Escalated);
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({ eventType: "ticket.escalated" })
    );
  });
});`}</code></pre>

      <h3 id="integration-tests">Integration Tests — API Layer</h3>
      <pre><code>{`import supertest from "supertest";
import { buildApp } from "@/app";
import { buildTestDependencies } from "@/test/composition-root";

describe("POST /api/v1/tickets", () => {
  let app: Express;
  let deps: TestDependencies;

  beforeEach(() => {
    deps = buildTestDependencies();
    app = buildApp(deps);  // injects test dependencies into real Express app
  });

  it("returns 201 with ticketId on valid request", async () => {
    const res = await supertest(app)
      .post("/api/v1/tickets")
      .set("Authorization", \`Bearer \${testJwt({ sub: "user-123", roles: ["customer"] })}\`)
      .send({
        subject: "My domain is not resolving",
        description: "I transferred my domain and it's been 48 hours...",
        category: "domain",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ticketId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      status: "open",
    });
  });

  it("returns 422 on invalid category", async () => {
    const res = await supertest(app)
      .post("/api/v1/tickets")
      .set("Authorization", \`Bearer \${testJwt()}\`)
      .send({ subject: "test", description: "desc", category: "invalid_category" });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("returns 401 without authorization header", async () => {
    const res = await supertest(app).post("/api/v1/tickets").send({ /* ... */ });
    expect(res.status).toBe(401);
  });
});`}</code></pre>

      <h2 id="advanced-patterns">Advanced TypeScript Patterns</h2>

      <h3 id="result-type">Result Type for Error Handling</h3>
      <p>
        Using exceptions for control flow is an anti-pattern — thrown errors are invisible
        in function signatures. The Result type makes all possible outcomes explicit in the
        return type, forcing callers to handle both success and failure paths.
      </p>
      <pre><code>{`// Result type — no exceptions for domain errors
type Result<T, E extends Error = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E extends Error>(error: E): Result<never, E> => ({ ok: false, error });

// Use case that returns Result instead of throwing
class CreateTicketUseCase {
  async execute(
    command: CreateTicketCommand
  ): Promise<Result<CreatedTicketDto, DuplicateTicketError | QuotaExceededError>> {
    const openCount = await this.ticketRepo.countOpenByCustomer(command.customerId);
    if (openCount >= 10) {
      return err(new QuotaExceededError(command.customerId, 10));
    }

    const ticket = SupportTicket.create(command);
    await this.ticketRepo.save(ticket);
    return ok({ ticketId: ticket.id.value, status: "open" });
  }
}

// Caller MUST handle both outcomes — compiler enforces it
const result = await createTicket.execute(command);
if (!result.ok) {
  // TypeScript narrows: result.error is DuplicateTicketError | QuotaExceededError
  if (result.error instanceof QuotaExceededError) {
    return res.status(429).json({ code: "QUOTA_EXCEEDED", limit: result.error.limit });
  }
  return res.status(409).json({ code: "DUPLICATE_TICKET" });
}
// TypeScript narrows: result.value is CreatedTicketDto
return res.status(201).json(result.value);`}</code></pre>

      <h3 id="decorators">Decorators for Clean Code</h3>
      <pre><code>{`// TypeScript decorator for automatic transaction management
function Transactional() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const tx = await this.dbClient.beginTransaction();
      try {
        const result = await original.apply(this, [...args, tx]);
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    };
    return descriptor;
  };
}

// Decorator for idempotency — prevents duplicate processing
function Idempotent(keyFn: (...args: any[]) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const key = keyFn(...args);
      const cached = await this.idempotencyStore.get(key);
      if (cached) return cached;  // return previous result

      const result = await original.apply(this, args);
      await this.idempotencyStore.set(key, result, { ttlSeconds: 3600 });
      return result;
    };
  };
}

class PaymentController {
  @Idempotent((req) => req.headers["idempotency-key"])
  async chargeCustomer(req: Request): Promise<ChargeResult> {
    // This will only execute once per idempotency key
  }
}`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Walk me through how you design a backend REST API service.'"
        intro="GoDaddy evaluates engineering craftsmanship — not just 'it works.' Show that you think about types, testability, error handling, and observability from the start."
        steps={[
          "Start with the contract: 'Before writing a handler, I define the Zod schema. That schema becomes my TypeScript type, my runtime validator, and my OpenAPI documentation automatically. No manual sync needed.'",
          "Name the layering: 'I structure the service in layers: Presentation (controllers, middleware), Application (use cases), Domain (business logic), Infrastructure (adapters). Dependencies always point inward — domain never imports infrastructure.'",
          "Explain error handling: 'Domain errors are typed classes — TicketNotFoundError, QuotaExceededError. A single global error handler maps these to HTTP status codes. Infrastructure errors never reach the client.'",
          "Close with testability: 'I test each layer independently: domain in pure unit tests with no mocks needed, application layer with in-memory adapters, presentation layer with supertest against a real HTTP server but in-memory backend. This gives me fast, reliable tests with no cloud dependencies.'",
        ]}
      />

      <InterviewChallenge
        title="Backend Challenge: Idempotent Ticket Creation API"
        scenario={
          <>
            GoDaddy&apos;s mobile app sometimes sends the same ticket creation request twice
            when network connections are flaky. Customers end up with duplicate support tickets.
            Design and implement an idempotent ticket creation endpoint. The client sends an
            <code>Idempotency-Key</code> header (UUID) with every request.
          </>
        }
        tasks={[
          "Define the HTTP contract: method, path, headers, request body schema, and all possible response codes.",
          "Implement the idempotency logic: where does it live (middleware, use case, repository)? How do you store and look up idempotency keys?",
          "What happens if the same key is sent with a different request body? Define the behavior.",
          "How long should idempotency keys be stored? What's the tradeoff between storage cost and safety window?",
          "Write the unit test for the idempotency scenario: same key sent twice should return the same result both times.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Zod as the single source of truth</strong> — schema → TypeScript type → OpenAPI spec → runtime validation. One definition, no drift.</li>
        <li><strong>Composition Root</strong> is the only place that knows about concrete implementations. Tests swap the entire dependency graph with one line.</li>
        <li><strong>Typed error hierarchy</strong> + a single global error handler makes HTTP status code mapping explicit, testable, and centralized.</li>
        <li><strong>Result type</strong> makes all possible outcomes explicit in function signatures — forces callers to handle both success and failure paths at compile time.</li>
        <li>Test pyramid: domain → pure unit tests; application → in-memory adapters; presentation → supertest + in-memory adapters. No cloud dependencies until integration tests.</li>
        <li>The GoDaddy bar: code quality is evaluated through code reviews and design discussions — be ready to articulate WHY each pattern exists, not just that you use it.</li>
      </ul>
    </div>
  );
}
