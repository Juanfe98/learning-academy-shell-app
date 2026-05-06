import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const testPyramidDiagram = String.raw`flowchart TD
    E2E["E2E Tests\n(few, slow, expensive)\nBrowser or full API flows"]
    INT["Integration Tests\n(moderate)\nReal DB, real HTTP, real middleware"]
    UNIT["Unit Tests\n(many, fast, cheap)\nPure functions, services with mocks"]

    E2E --> INT --> UNIT

    style E2E fill:#ef4444,color:#fff
    style INT fill:#f59e0b,color:#000
    style UNIT fill:#22c55e,color:#fff`;

const supertestFlowDiagram = String.raw`sequenceDiagram
    participant T as Test
    participant ST as Supertest
    participant A as Express App
    participant DB as Database

    T->>ST: request(app).get("/users/1")
    ST->>A: HTTP request (no port needed)
    A->>DB: prisma.user.findUnique(...)
    DB-->>A: user row
    A-->>ST: 200 { id: 1, email: "..." }
    ST-->>T: response object
    T->>T: expect(res.status).toBe(200)`;

const mockDecisionDiagram = String.raw`flowchart TD
    Q{Is it a unit test?} -->|Yes| M[Mock all external deps\nDB, HTTP, email, time]
    Q -->|No - integration| R{What is slow or flaky?}
    R -->|External HTTP API| MH[Mock HTTP with MSW or nock]
    R -->|Email / queue| ME[Mock email/queue adapter]
    R -->|Database| D{Test strategy?}
    D -->|Fast unit-style| MI[In-memory repository]
    D -->|Real data behavior| RD[Real test DB + seed + cleanup]`;

export const toc: TocItem[] = [
  { id: "testing-backend", title: "How do you test a Node.js backend?", level: 2 },
  { id: "test-types", title: "Unit, integration, and E2E tests", level: 2 },
  { id: "what-to-unit-test", title: "What should you unit test?", level: 2 },
  { id: "what-to-integration-test", title: "What should you integration test?", level: 2 },
  { id: "test-express-routes", title: "How do you test Express routes?", level: 2 },
  { id: "supertest", title: "What is Supertest?", level: 2 },
  { id: "mock-dependencies", title: "How do you mock dependencies?", level: 2 },
  { id: "test-services", title: "Testing services without a real database", level: 2 },
  { id: "test-db-queries", title: "How do you test database queries?", level: 2 },
  { id: "test-auth-middleware", title: "How do you test authentication middleware?", level: 2 },
  { id: "test-error-handling", title: "How do you test error handling?", level: 2 },
  { id: "test-async", title: "How do you test async code?", level: 2 },
  { id: "flaky-tests", title: "How do you avoid flaky tests?", level: 2 },
  { id: "seed-data", title: "How do you seed test data?", level: 2 },
  { id: "isolate-db", title: "How do you isolate test databases?", level: 2 },
  { id: "test-external-apis", title: "How do you test external API calls?", level: 2 },
  { id: "contract-testing", title: "What is contract testing?", level: 2 },
  { id: "test-coverage", title: "What is test coverage?", level: 2 },
  { id: "coverage-100", title: "Is 100% test coverage always good?", level: 2 },
  { id: "what-to-mock", title: "How do you decide what to mock?", level: 2 },
];

export default function InterviewTesting() {
  return (
    <div className="article-content">
      <p>
        Section 10 of 18 — Testing. Senior engineers are expected to write tests as a matter of
        course, not as an afterthought. This section covers the full testing strategy for a Node.js
        backend: what to test, how to test it, what to mock, and how to keep the test suite fast
        and trustworthy.
      </p>

      {/* ── 1 ── */}
      <h2 id="testing-backend">How do you test a Node.js backend?</h2>
      <p>
        A Node.js backend test suite typically has three layers, each with a different scope and
        speed:
      </p>
      <ul>
        <li>
          <strong>Unit tests</strong> — test individual functions or classes in isolation with all
          dependencies mocked. Run in milliseconds with no I/O.
        </li>
        <li>
          <strong>Integration tests</strong> — test a slice of the system end-to-end (HTTP request
          → middleware → controller → service → real or in-memory DB). Slower but catch wiring bugs
          unit tests miss.
        </li>
        <li>
          <strong>E2E tests</strong> — test the full deployed system from the outside, often via a
          real browser or HTTP client. Slowest, fewest in number.
        </li>
      </ul>
      <p>
        The most common stack for Node.js backend testing: <strong>Vitest</strong> (fast, native
        ESM, great TypeScript support) + <strong>Supertest</strong> (Express integration) +{" "}
        <strong>MSW</strong> (mock external HTTP) + a real test database for integration tests.
      </p>

      {/* ── 2 ── */}
      <h2 id="test-types">Unit, integration, and E2E tests</h2>
      <MermaidDiagram chart={testPyramidDiagram} />
      <ArticleTable caption="Test type comparison — scope, speed, and when each is most valuable" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Scope</th>
              <th>Speed</th>
              <th>Best for</th>
              <th>Misses</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Unit</strong></td>
              <td>Single function / class</td>
              <td>Sub-millisecond</td>
              <td>Business logic, edge cases, error paths</td>
              <td>Wiring bugs, middleware interactions</td>
            </tr>
            <tr>
              <td><strong>Integration</strong></td>
              <td>Full request pipeline + real DB</td>
              <td>10–500ms per test</td>
              <td>Route behaviour, auth, DB queries, error middleware</td>
              <td>External service failures, browser-specific issues</td>
            </tr>
            <tr>
              <td><strong>E2E</strong></td>
              <td>Entire deployed system</td>
              <td>Seconds per flow</td>
              <td>Critical user journeys, regression catches</td>
              <td>Edge cases (too slow to cover exhaustively)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Aim for a pyramid: many unit tests, fewer integration tests, very few E2E tests. An
        inverted pyramid (lots of E2E, few unit) gives slow, brittle CI.
      </p>

      {/* ── 3 ── */}
      <h2 id="what-to-unit-test">What should you unit test?</h2>
      <p>
        Unit test anything with meaningful logic that can be exercised without real I/O:
      </p>
      <ul>
        <li>Service methods — business rules, conditional logic, error throwing</li>
        <li>Pure utility functions — formatting, parsing, calculation</li>
        <li>Mapper functions — toDomain, toResponse conversions</li>
        <li>Validation schemas — Zod schemas with valid and invalid inputs</li>
        <li>Domain entities — methods that enforce invariants</li>
        <li>Middleware logic that can be tested with mock req/res objects</li>
      </ul>
      <pre><code>{`// Unit test — service with mocked repository
import { describe, it, expect, vi } from "vitest";
import { UserService } from "./user.service";
import { NotFoundError } from "@/lib/errors";

describe("UserService.getUser", () => {
  const mockRepo = {
    findById: vi.fn(),
    create: vi.fn(),
  };
  const service = new UserService(mockRepo);

  it("throws NotFoundError when user does not exist", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getUser(99)).rejects.toThrow(NotFoundError);
  });

  it("returns user when found", async () => {
    const fakeUser = { id: 1, email: "a@b.com", role: "user" };
    mockRepo.findById.mockResolvedValue(fakeUser);
    const result = await service.getUser(1);
    expect(result).toEqual(fakeUser);
    expect(mockRepo.findById).toHaveBeenCalledWith(1);
  });
});`}</code></pre>

      {/* ── 4 ── */}
      <h2 id="what-to-integration-test">What should you integration test?</h2>
      <p>
        Integration test the full HTTP request pipeline — routes, middleware, controllers, and real
        (or near-real) data access:
      </p>
      <ul>
        <li>Every route — happy path + key error paths</li>
        <li>Authentication and authorization (valid token, missing token, wrong role)</li>
        <li>Input validation (missing fields, wrong types, constraint violations)</li>
        <li>Error middleware (correct status codes and error shapes)</li>
        <li>Database writes and reads that span multiple tables (transactions, relations)</li>
        <li>Pagination, filtering, sorting correctness</li>
      </ul>
      <p>
        Don&apos;t test every business-rule edge case here — unit tests do that faster. Integration
        tests verify the plumbing works end-to-end.
      </p>

      {/* ── 5 ── */}
      <h2 id="test-express-routes">How do you test Express routes?</h2>
      <MermaidDiagram chart={supertestFlowDiagram} />
      <pre><code>{`// app.ts — export the Express app WITHOUT calling listen()
import express from "express";
import { userRouter } from "./modules/users/user.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();
app.use(express.json());
app.use("/users", userRouter);
app.use(errorMiddleware);

// server.ts — import app and bind to a port
import { app } from "./app";
app.listen(3000);

// user.routes.test.ts — integration test
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/db";

beforeAll(async () => {
  await prisma.user.deleteMany(); // clean slate
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /users/:id", () => {
  it("returns 404 when user does not exist", async () => {
    const res = await request(app).get("/users/9999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns user when found", async () => {
    const user = await prisma.user.create({
      data: { email: "test@example.com", name: "Test" },
    });
    const res = await request(app).get(\`/users/\${user.id}\`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("test@example.com");
  });
});`}</code></pre>

      {/* ── 6 ── */}
      <h2 id="supertest">What is Supertest?</h2>
      <p>
        Supertest is a library that lets you make HTTP requests directly to an Express app without
        binding to a port. You pass the Express app instance to <code>request(app)</code> and it
        opens an in-process connection. This makes integration tests:
      </p>
      <ul>
        <li>Port-free — no conflicts between parallel test runs</li>
        <li>Fast — no TCP round-trip overhead, in-process</li>
        <li>Self-contained — no server process to start and stop</li>
      </ul>
      <pre><code>{`import request from "supertest";
import { app } from "@/app";

// GET with query params
const res = await request(app)
  .get("/users")
  .query({ page: 1, limit: 10 })
  .set("Authorization", "Bearer " + token);

// POST with body
const res = await request(app)
  .post("/users")
  .send({ email: "a@b.com", name: "Alice" })
  .expect(201); // shorthand assertion

// PATCH with auth
await request(app)
  .patch(\`/users/\${id}\`)
  .set("Authorization", \`Bearer \${adminToken}\`)
  .send({ role: "admin" })
  .expect(200);

// File upload
await request(app)
  .post("/upload")
  .set("Authorization", \`Bearer \${token}\`)
  .attach("file", Buffer.from("hello"), "test.txt")
  .expect(200);`}</code></pre>

      {/* ── 7 ── */}
      <h2 id="mock-dependencies">How do you mock dependencies?</h2>
      <p>
        Vitest provides <code>vi.fn()</code> for function mocks and <code>vi.mock()</code> for
        module-level mocking.
      </p>
      <pre><code>{`import { vi, describe, it, expect, beforeEach } from "vitest";

// 1. vi.fn() — mock a single function
const sendEmail = vi.fn().mockResolvedValue({ messageId: "abc" });

// 2. vi.mock() — replace an entire module
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: "abc" }),
}));

// 3. Spy on a method of an existing object
import { emailService } from "@/lib/email";
vi.spyOn(emailService, "send").mockResolvedValue(undefined);

// Assert calls
expect(sendEmail).toHaveBeenCalledOnce();
expect(sendEmail).toHaveBeenCalledWith({
  to: "user@example.com",
  subject: "Welcome",
});

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks(); // resets calls + instances but keeps mock implementation
  // vi.resetAllMocks(); // also resets implementations
});`}</code></pre>
      <p>
        Prefer injecting mocks via constructor (dependency injection) over <code>vi.mock()</code>
        where possible — it makes mocking explicit and avoids module-level side effects.
      </p>

      {/* ── 8 ── */}
      <h2 id="test-services">Testing services without a real database</h2>
      <p>
        Inject an in-memory repository that implements the same interface as the real one. No
        Prisma, no database connection, runs instantly.
      </p>
      <pre><code>{`// In-memory repository for tests
class InMemoryUserRepository implements IUserRepository {
  private store = new Map<number, User>();
  private nextId = 1;

  async findById(id: number) {
    return this.store.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.store.values()].find(u => u.email === email) ?? null;
  }
  async create(data: CreateUserData): Promise<User> {
    const user: User = { id: this.nextId++, ...data, createdAt: new Date() };
    this.store.set(user.id, user);
    return user;
  }
  async delete(id: number) {
    this.store.delete(id);
  }
  // Helper for tests — inspect internal state
  all() { return [...this.store.values()]; }
}

// Test
describe("UserService.createUser", () => {
  let repo: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    service = new UserService(repo);
  });

  it("persists new user", async () => {
    await service.createUser({ email: "a@b.com", name: "Alice" });
    expect(repo.all()).toHaveLength(1);
    expect(repo.all()[0].email).toBe("a@b.com");
  });

  it("throws ConflictError when email already exists", async () => {
    await service.createUser({ email: "a@b.com", name: "Alice" });
    await expect(
      service.createUser({ email: "a@b.com", name: "Alice 2" })
    ).rejects.toThrow(ConflictError);
  });
});`}</code></pre>

      {/* ── 9 ── */}
      <h2 id="test-db-queries">How do you test database queries?</h2>
      <p>
        For queries that are complex enough to warrant testing (joins, aggregations, cursor
        pagination), test the repository directly against a real test database — not with mocks.
        Mocking a Prisma query to return fake data tells you nothing about whether your query
        actually works.
      </p>
      <pre><code>{`// repository.test.ts — test the real repository against test DB
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "./user.repository";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});
const repo = new PrismaUserRepository(prisma);

beforeEach(async () => {
  await prisma.user.deleteMany(); // isolate each test
});

afterAll(async () => {
  await prisma.$disconnect();
});

it("findByEmail returns null when not found", async () => {
  const result = await repo.findByEmail("missing@example.com");
  expect(result).toBeNull();
});

it("findMany with cursor pagination returns correct page", async () => {
  // Seed 5 users
  await prisma.user.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      email: \`user\${i}@example.com\`,
      name: \`User \${i}\`,
    })),
  });
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });

  const page1 = await repo.findMany({ limit: 2 });
  expect(page1.data).toHaveLength(2);

  const page2 = await repo.findMany({ cursor: page1.nextCursor, limit: 2 });
  expect(page2.data[0].id).toBeGreaterThan(page1.data[1].id);
});`}</code></pre>

      {/* ── 10 ── */}
      <h2 id="test-auth-middleware">How do you test authentication middleware?</h2>
      <pre><code>{`// Unit test — test the middleware function directly
import { vi, it, expect, describe } from "vitest";
import { authMiddleware } from "./auth.middleware";
import type { Request, Response, NextFunction } from "express";

function mockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as Partial<Request>;
}
const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext: NextFunction = vi.fn();

describe("authMiddleware", () => {
  it("calls next() with valid token", async () => {
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET!);
    const req = mockReq({ authorization: \`Bearer \${token}\` });
    await authMiddleware(req as Request, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(); // no error argument
    expect((req as any).user).toMatchObject({ userId: 1 });
  });

  it("returns 401 with no token", async () => {
    const res = mockRes();
    await authMiddleware(mockReq() as Request, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// Integration test — test auth via real HTTP
it("GET /protected returns 401 without token", async () => {
  const res = await request(app).get("/protected");
  expect(res.status).toBe(401);
});

it("GET /protected returns 200 with valid token", async () => {
  const token = generateToken({ userId: 1, role: "user" });
  const res = await request(app)
    .get("/protected")
    .set("Authorization", \`Bearer \${token}\`);
  expect(res.status).toBe(200);
});`}</code></pre>

      {/* ── 11 ── */}
      <h2 id="test-error-handling">How do you test error handling?</h2>
      <pre><code>{`// Test that error middleware returns correct shape
it("returns 404 with error envelope on missing resource", async () => {
  const res = await request(app).get("/users/99999");
  expect(res.status).toBe(404);
  expect(res.body).toMatchObject({
    error: {
      code: "NOT_FOUND",
      message: expect.any(String),
    },
  });
});

it("returns 400 with validation errors on bad input", async () => {
  const res = await request(app)
    .post("/users")
    .send({ email: "not-an-email" }); // missing name, bad email
  expect(res.status).toBe(400);
  expect(res.body.error.details).toBeInstanceOf(Array);
});

it("does not leak stack trace in production", async () => {
  process.env.NODE_ENV = "production";
  const res = await request(app).get("/users/trigger-crash");
  expect(res.status).toBe(500);
  expect(res.body.error.stack).toBeUndefined(); // no stack in prod
  process.env.NODE_ENV = "test";
});

// Unit test — verify service throws the right error class
it("createOrder throws BusinessError on insufficient stock", async () => {
  mockProductRepo.findById.mockResolvedValue({ id: 1, stock: 0, price: 10 });
  await expect(
    orderService.createOrder({ userId: 1, items: [{ productId: 1, quantity: 5 }] })
  ).rejects.toThrow(BusinessError);
});`}</code></pre>

      {/* ── 12 ── */}
      <h2 id="test-async">How do you test async code?</h2>
      <pre><code>{`// Always return or await — never forget this
it("resolves correctly", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");
});

// Testing that a promise rejects
it("rejects with specific error", async () => {
  await expect(asyncFunction()).rejects.toThrow("expected message");
  await expect(asyncFunction()).rejects.toBeInstanceOf(NotFoundError);
});

// Testing with fake timers (delays, debounce, TTL)
import { vi, it, expect } from "vitest";

it("cache expires after TTL", async () => {
  vi.useFakeTimers();
  const cache = createCache({ ttlSeconds: 60 });

  cache.set("key", "value");
  expect(cache.get("key")).toBe("value");

  vi.advanceTimersByTime(61_000); // jump 61 seconds
  expect(cache.get("key")).toBeNull(); // expired

  vi.useRealTimers();
});

// Testing events / callbacks
it("emits event after processing", async () => {
  const handler = vi.fn();
  emitter.on("processed", handler);

  await processItem(item);

  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: item.id }));
});`}</code></pre>

      {/* ── 13 ── */}
      <h2 id="flaky-tests">How do you avoid flaky tests?</h2>
      <p>
        Flaky tests pass sometimes and fail other times — they erode trust in the entire suite.
        Common causes and fixes:
      </p>
      <ArticleTable caption="Flaky test causes and fixes" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Cause</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Shared database state between tests</td>
              <td>Clean up in <code>beforeEach</code> / <code>afterEach</code>; use transactions that roll back</td>
            </tr>
            <tr>
              <td>Real timers / <code>setTimeout</code> in assertions</td>
              <td>Use <code>vi.useFakeTimers()</code> to control time deterministically</td>
            </tr>
            <tr>
              <td>Test order dependency (test A sets up state test B needs)</td>
              <td>Each test is fully self-contained — no shared state, no ordering assumptions</td>
            </tr>
            <tr>
              <td>Network calls to real external APIs</td>
              <td>Mock external HTTP with MSW or nock — never call real APIs in tests</td>
            </tr>
            <tr>
              <td>Race conditions in async code</td>
              <td>Always <code>await</code> async operations; use <code>waitFor</code> utilities</td>
            </tr>
            <tr>
              <td>Port conflicts in parallel test runners</td>
              <td>Use Supertest (no port needed) or assign random ports with <code>server.listen(0)</code></td>
            </tr>
            <tr>
              <td>Date/time-sensitive logic with <code>Date.now()</code></td>
              <td>Inject a clock or use <code>vi.setSystemTime()</code> to fix the date</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ── 14 ── */}
      <h2 id="seed-data">How do you seed test data?</h2>
      <pre><code>{`// Option 1: inline seed in each test (preferred for isolation)
it("returns paginated users", async () => {
  // Arrange — seed directly in the test
  await prisma.user.createMany({
    data: [
      { email: "a@b.com", name: "Alice" },
      { email: "b@b.com", name: "Bob" },
      { email: "c@b.com", name: "Carol" },
    ],
  });

  // Act
  const res = await request(app).get("/users?page=1&limit=2");

  // Assert
  expect(res.body.data).toHaveLength(2);
  expect(res.body.meta.total).toBe(3);
});

// Option 2: factory helpers for complex data
// test/factories/user.factory.ts
let counter = 0;
export function buildUser(overrides: Partial<CreateUserData> = {}): CreateUserData {
  counter++;
  return {
    email: \`user\${counter}@test.com\`,
    name: \`Test User \${counter}\`,
    role: "user",
    ...overrides,
  };
}

export async function createTestUser(overrides: Partial<CreateUserData> = {}) {
  return prisma.user.create({ data: buildUser(overrides) });
}

// Usage
const admin = await createTestUser({ role: "admin" });
const token = generateToken({ userId: admin.id, role: admin.role });`}</code></pre>

      {/* ── 15 ── */}
      <h2 id="isolate-db">How do you isolate test databases?</h2>
      <p>Three strategies, in order of preference:</p>
      <pre><code>{`// Strategy 1: deleteMany in beforeEach (simple, works for most cases)
beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  // Must delete in foreign-key order (children first)
});

// Strategy 2: wrap each test in a transaction that rolls back
// Works with pg directly; Prisma doesn't support savepoints in $transaction
const client = await pool.connect();
beforeEach(async () => { await client.query("BEGIN"); });
afterEach(async () => { await client.query("ROLLBACK"); });
afterAll(async () => { client.release(); });

// Strategy 3: separate database per test file (parallel CI)
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: "./test/global-setup.ts", // create test DB
    teardownTimeout: 10_000,
  },
});

// global-setup.ts
export async function setup() {
  const dbName = \`test_\${process.env.VITEST_WORKER_ID ?? "0"}\`;
  await createDatabase(dbName); // run migrations
  process.env.TEST_DATABASE_URL = \`postgres://localhost/\${dbName}\`;
}
export async function teardown() {
  await dropDatabase(process.env.TEST_DATABASE_URL!);
}`}</code></pre>

      {/* ── 16 ── */}
      <h2 id="test-external-apis">How do you test external API calls?</h2>
      <p>
        Never call real external APIs in tests — they are slow, unreliable, rate-limited, and can
        cause side effects (charges, emails sent). Use MSW (Mock Service Worker) to intercept HTTP
        at the network level, or <code>vi.mock</code> to replace the HTTP client.
      </p>
      <pre><code>{`// MSW — intercepts fetch/axios at the node level
// test/msw-handlers.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer(
  http.post("https://api.stripe.com/v1/charges", () => {
    return HttpResponse.json({
      id: "ch_test_123",
      status: "succeeded",
      amount: 1000,
    });
  }),

  http.get("https://api.github.com/users/:username", ({ params }) => {
    return HttpResponse.json({ login: params.username, id: 1 });
  }),
);

// Setup in vitest
import { beforeAll, afterAll, afterEach } from "vitest";
import { server } from "./msw-handlers";
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers()); // reset per-test overrides
afterAll(() => server.close());

// In a specific test — override the default handler
it("handles Stripe API failure", async () => {
  server.use(
    http.post("https://api.stripe.com/v1/charges", () => {
      return new HttpResponse(null, { status: 500 });
    })
  );
  const res = await request(app).post("/payments").send({ amount: 100 });
  expect(res.status).toBe(502);
});`}</code></pre>

      {/* ── 17 ── */}
      <h2 id="contract-testing">What is contract testing?</h2>
      <p>
        Contract testing verifies that two services (consumer and provider) agree on the interface
        between them — without requiring both to be deployed at the same time. The consumer defines
        a contract (expected request/response shape); the provider verifies it can fulfil that
        contract.
      </p>
      <p>
        <strong>Pact</strong> is the most widely used contract testing framework. It generates a
        pact file (JSON) from consumer tests that the provider can verify independently.
      </p>
      <pre><code>{`// Consumer test (order-service consuming user-service)
import { PactV3, MatchersV3 } from "@pact-foundation/pact";

const provider = new PactV3({
  consumer: "order-service",
  provider: "user-service",
});

it("gets user by ID", async () => {
  await provider
    .given("user 1 exists")
    .uponReceiving("a request for user 1")
    .withRequest({ method: "GET", path: "/users/1" })
    .willRespondWith({
      status: 200,
      body: {
        id: MatchersV3.integer(1),
        email: MatchersV3.string("a@b.com"),
      },
    })
    .executeTest(async (mockServer) => {
      const client = new UserServiceClient(mockServer.url);
      const user = await client.getUser(1);
      expect(user.id).toBe(1);
    });
});
// Publishes pact file → user-service runs provider verification against it`}</code></pre>
      <p>
        Contract testing is most valuable in microservice architectures where integration tests
        across services are expensive. In a monorepo or monolith, integration tests against a real
        DB are usually sufficient.
      </p>

      {/* ── 18 ── */}
      <h2 id="test-coverage">What is test coverage?</h2>
      <p>
        Test coverage measures what percentage of your code is executed during the test run.
        Istanbul / c8 (used by Vitest) tracks:
      </p>
      <ArticleTable caption="Coverage metric types — what each measures" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>What it measures</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Statement</strong></td>
              <td>Percentage of statements executed</td>
            </tr>
            <tr>
              <td><strong>Branch</strong></td>
              <td>Percentage of if/else branches taken (both true and false paths)</td>
            </tr>
            <tr>
              <td><strong>Function</strong></td>
              <td>Percentage of functions called at least once</td>
            </tr>
            <tr>
              <td><strong>Line</strong></td>
              <td>Percentage of source lines executed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre><code>{`# vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",          // or "istanbul"
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
      },
      exclude: [
        "src/db/**",            // migration files
        "src/**/*.dto.ts",      // pure type definitions
        "src/**/*.mapper.ts",   // tested indirectly
      ],
    },
  },
});

# Run
pnpm vitest run --coverage`}</code></pre>

      {/* ── 19 ── */}
      <h2 id="coverage-100">Is 100% test coverage always good?</h2>
      <p>
        No. 100% coverage is a metric that can be gamed and does not equal quality. Problems with
        chasing 100%:
      </p>
      <ul>
        <li>
          <strong>Tests that cover but don&apos;t assert</strong> — calling a function with no
          <code>expect()</code> hits the line but verifies nothing.
        </li>
        <li>
          <strong>Over-testing trivial code</strong> — testing that a getter returns a value, or
          that a DTO type is correct, adds maintenance burden without catching real bugs.
        </li>
        <li>
          <strong>Diminishing returns</strong> — the last 20% of coverage often covers defensive
          error paths and one-off edge cases that are unlikely to break.
        </li>
        <li>
          <strong>False confidence</strong> — 100% line coverage does not mean all business rules
          are correct. A test can execute every line of an authorization check without ever
          verifying the check actually rejects unauthorized users.
        </li>
      </ul>
      <p>
        A practical target: <strong>80% line coverage, 70% branch coverage</strong> for most
        backends. Focus coverage budget on services (business logic), error middleware, and auth
        middleware. Don&apos;t chase coverage in generated code, type files, or migration scripts.
      </p>

      {/* ── 20 ── */}
      <h2 id="what-to-mock">How do you decide what to mock?</h2>
      <MermaidDiagram chart={mockDecisionDiagram} />
      <p>The rule of thumb:</p>
      <ArticleTable caption="Mock vs real — the decision matrix" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Dependency</th>
              <th>Unit test</th>
              <th>Integration test</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Database (Prisma / pg)</td>
              <td>Mock (in-memory repo or vi.mock)</td>
              <td>Real test DB</td>
            </tr>
            <tr>
              <td>External HTTP API (Stripe, SendGrid, GitHub)</td>
              <td>Mock (vi.fn / vi.mock)</td>
              <td>Mock with MSW (never call real)</td>
            </tr>
            <tr>
              <td>Email / SMS service</td>
              <td>Mock</td>
              <td>Mock (use a test inbox like Mailtrap for E2E only)</td>
            </tr>
            <tr>
              <td>Redis / cache</td>
              <td>Mock</td>
              <td>Real Redis (Docker) or mock with fakeredis</td>
            </tr>
            <tr>
              <td>Job queue (BullMQ)</td>
              <td>Mock</td>
              <td>Real Redis or mock queue adapter</td>
            </tr>
            <tr>
              <td>File system</td>
              <td>Mock (<code>vi.mock("node:fs")</code>)</td>
              <td>Temp directory (<code>os.tmpdir()</code>), clean up after</td>
            </tr>
            <tr>
              <td>Date / time</td>
              <td><code>vi.useFakeTimers()</code></td>
              <td><code>vi.setSystemTime()</code></td>
            </tr>
            <tr>
              <td>Other services in the same codebase</td>
              <td>Mock (inject via interface)</td>
              <td>Real (shared in-process)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Mock what makes tests slow, non-deterministic, or causes side effects. Keep real what needs
        to prove behaviour that mocking would hide — especially database query semantics and
        middleware ordering.
      </p>
    </div>
  );
}
