import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const testPyramidDiagram = String.raw`flowchart TD
    subgraph E2E["End-to-End Tests — Few, Slow, High Confidence"]
        T3["Full user flows: login → create post → verify in UI\nCypress, Playwright\nHit real DB, real services"]
    end
    subgraph INT["Integration Tests — Many, Medium Speed, High Value"]
        T2["API endpoint tests with supertest\nReal Express app, real or test DB\nTest: routing, middleware, validation, DB interaction"]
    end
    subgraph UNIT["Unit Tests — Most, Fast, Isolated"]
        T1["Pure functions: validators, business logic, utilities\nMock all I/O: DB, Redis, HTTP calls\nVitest or Jest"]
    end

    E2E --> INT --> UNIT`;

export const toc: TocItem[] = [
  { id: "test-pyramid", title: "Testing Pyramid for Backends", level: 2 },
  { id: "supertest-setup", title: "Integration Testing with supertest", level: 2 },
  { id: "test-setup", title: "Test Setup & Database Strategy", level: 2 },
  { id: "mocking", title: "Mocking Dependencies", level: 2 },
  { id: "testing-middleware", title: "Testing Middleware in Isolation", level: 2 },
  { id: "testing-error-paths", title: "Testing Error Paths", level: 2 },
  { id: "test-comparison", title: "Unit vs Integration vs E2E", level: 2 },
  { id: "coverage", title: "Code Coverage", level: 2 },
  { id: "contract-testing", title: "Contract Testing with Zod", level: 2 },
];

export default function TestingExpress() {
  return (
    <div className="article-content">
      <p>
        Backend testing is different from frontend testing. A route handler&apos;s behavior is defined
        by what HTTP response it produces — status code, headers, body shape. The most valuable test
        for an Express API exercises the full stack: real routing, real middleware, real validation,
        real business logic, against a real (or realistic) database. Unit tests catch pure logic bugs.
        Integration tests catch the wiring bugs that matter in production.
      </p>

      <h2 id="test-pyramid">Testing Pyramid for Backends</h2>
      <MermaidDiagram
        chart={testPyramidDiagram}
        title="Backend Testing Pyramid"
        caption="Invest most in integration tests for Express APIs. They run fast enough (100-500ms per test with supertest), exercise the actual middleware and routing, and catch real wiring bugs. E2E tests are valuable for critical user journeys but slow to run and maintain."
        minHeight={380}
      />

      <h2 id="supertest-setup">Integration Testing with supertest</h2>
      <pre><code>{`// supertest makes HTTP requests to your Express app without starting a server
// It binds the Express app to an ephemeral port and sends real HTTP requests
// This exercises: routing, middleware, request parsing, response serialization

// Install: npm install -D supertest @types/supertest vitest

// src/app.ts — export the Express app WITHOUT starting the server
import express from "express";
import { userRouter } from "./routes/users";
import { errorHandler } from "./middleware/error";

const app = express();
app.use(express.json());
app.use("/users", userRouter);
app.use(errorHandler);

export default app; // do NOT call app.listen() here

// src/server.ts — start the server (only imported in production entry point)
import app from "./app";
app.listen(process.env.PORT ?? 3000);

// src/routes/users.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

describe("POST /users", () => {
  it("creates a user with valid data", async () => {
    const response = await request(app)
      .post("/users")
      .send({ name: "Alice", email: "alice@example.com" })
      .set("Accept", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      data: {
        name: "Alice",
        email: "alice@example.com",
        id: expect.any(String),
      },
    });
  });

  it("returns 400 when email is missing", async () => {
    const response = await request(app)
      .post("/users")
      .send({ name: "Alice" }); // missing email

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
      ])
    );
  });

  it("returns 409 when email already exists", async () => {
    // Create user first
    await request(app).post("/users").send({ name: "Alice", email: "alice@example.com" });

    // Try to create again with same email
    const response = await request(app)
      .post("/users")
      .send({ name: "Alice 2", email: "alice@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });
});`}</code></pre>

      <h2 id="test-setup">Test Setup & Database Strategy</h2>
      <pre><code>{`// Strategy 1: Real test database (recommended for integration tests)
// Use a separate DATABASE_URL_TEST pointing to a test database
// Reset between test suites to prevent interference

// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./src/test/global-setup.ts",
    setupFiles: ["./src/test/setup.ts"],
    sequence: {
      concurrent: false, // run tests sequentially to avoid DB conflicts
    },
  },
});

// src/test/global-setup.ts — runs once per test run
import { execSync } from "child_process";

export async function setup() {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST!;
  // Apply migrations to test DB
  execSync("npx prisma migrate deploy", { env: process.env });
}

// src/test/setup.ts — runs before each test file
import { prisma } from "../lib/prisma";
import { afterEach, afterAll } from "vitest";

// Clean up after each test to maintain isolation
afterEach(async () => {
  // Order matters due to foreign key constraints
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Strategy 2: In-memory SQLite for unit speed
// Replace PostgreSQL-specific features (e.g., no ILIKE, no enums)
// Good for: simple CRUD without complex queries

// Strategy 3: Docker test database
// Spin up a fresh PostgreSQL container for each test run
// Tools: @testcontainers/postgresql, docker compose up -d in CI
// Cleanest isolation, no shared state between runs`}</code></pre>

      <h2 id="mocking">Mocking Dependencies</h2>
      <pre><code>{`import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the DB module — for unit tests of route handlers
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";
import app from "../app";

describe("GET /users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset mock state between tests
  });

  it("returns the user when found", async () => {
    const mockUser = { id: "usr_123", name: "Alice", email: "alice@example.com" };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const response = await request(app)
      .get("/users/usr_123")
      .set("Authorization", \`Bearer \${validToken}\`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "usr_123" },
    });
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .get("/users/nonexistent")
      .set("Authorization", \`Bearer \${validToken}\`);

    expect(response.status).toBe(404);
  });
});

// Mocking external HTTP calls (e.g., Stripe, Sendgrid)
vi.mock("../services/email.service", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
}));

// Mocking time-sensitive logic
import { vi } from "vitest";
vi.useFakeTimers();
vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
// ... test time-sensitive code ...
vi.useRealTimers();`}</code></pre>

      <h2 id="testing-middleware">Testing Middleware in Isolation</h2>
      <pre><code>{`import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorization";

// Create minimal mock objects — only what the middleware uses
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const mockNext: NextFunction = vi.fn();

describe("authenticate middleware", () => {
  it("calls next() when token is valid", () => {
    const validToken = generateTestToken({ sub: "user-123", role: "user" });
    const req = mockReq({ headers: { authorization: \`Bearer \${validToken}\` } });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called with no args = success
    expect(req.user).toEqual({ id: "user-123", role: "user" });
  });

  it("calls next with error when token is missing", () => {
    const req = mockReq(); // no authorization header
    const res = mockRes();
    const next = vi.fn();

    authenticate(req, res, next);

    // next called with an UnauthorizedError
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("calls next with error when token is expired", () => {
    const expiredToken = generateExpiredToken({ sub: "user-123" });
    const req = mockReq({ headers: { authorization: \`Bearer \${expiredToken}\` } });

    authenticate(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token expired" })
    );
  });
});

describe("requireRole middleware", () => {
  it("allows user with required role", () => {
    const req = mockReq();
    (req as any).user = { id: "u1", role: "admin" };
    const next = vi.fn();

    requireRole("admin")(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks user without required role", () => {
    const req = mockReq();
    (req as any).user = { id: "u1", role: "viewer" };
    const next = vi.fn();

    requireRole("admin")(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});`}</code></pre>

      <h2 id="testing-error-paths">Testing Error Paths</h2>
      <pre><code>{`import request from "supertest";
import app from "../app";

describe("Error handling", () => {
  // Test 400 — validation error
  it("returns 400 with validation details on invalid body", async () => {
    const response = await request(app)
      .post("/users")
      .send({ email: "not-an-email", name: "" }); // invalid email, empty name

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({ field: "email" }),
          expect.objectContaining({ field: "name" }),
        ]),
      },
    });
  });

  // Test 401 — unauthenticated
  it("returns 401 on protected routes without token", async () => {
    const response = await request(app).get("/users/me");
    // No Authorization header

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  // Test 403 — authenticated but forbidden
  it("returns 403 when accessing another user's resource", async () => {
    const alice = await createTestUser("alice@test.com");
    const bob = await createTestUser("bob@test.com");
    const aliceToken = generateTestToken({ sub: alice.id, role: "user" });
    const bobPost = await createTestPost(bob.id);

    const response = await request(app)
      .delete(\`/posts/\${bobPost.id}\`)
      .set("Authorization", \`Bearer \${aliceToken}\`);

    expect(response.status).toBe(403);
  });

  // Test 404 — not found
  it("returns 404 for non-existent resources", async () => {
    const token = generateTestToken({ sub: "u1", role: "admin" });
    const response = await request(app)
      .get("/users/nonexistent-id-12345")
      .set("Authorization", \`Bearer \${token}\`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  // Test 500 — unhandled error
  it("returns 500 without exposing internals in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    // Force an unexpected error
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB connection lost"));

    const response = await request(app)
      .get("/users/any-id")
      .set("Authorization", \`Bearer \${validToken}\`);

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe("Internal server error"); // generic
    expect(response.body.error.stack).toBeUndefined(); // no stack trace

    process.env.NODE_ENV = originalEnv;
  });
});`}</code></pre>

      <h2 id="test-comparison">Unit vs Integration vs E2E</h2>
      <ArticleTable caption="Test layer comparison — when to use each, tooling, and confidence level" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Speed</th>
              <th>Isolation</th>
              <th>Confidence</th>
              <th>When to Use</th>
              <th>Tooling</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Unit</strong></td>
              <td>Very fast (&lt;1ms)</td>
              <td>Full — all I/O mocked</td>
              <td>Low — tests units in isolation, misses wiring bugs</td>
              <td>Pure functions, business logic, validators, transformers</td>
              <td>Vitest, Jest</td>
            </tr>
            <tr>
              <td><strong>Integration</strong></td>
              <td>Medium (100–500ms)</td>
              <td>Partial — real app, real DB, mock external APIs</td>
              <td>High — exercises routing, middleware, validation, DB together</td>
              <td>API endpoints, middleware chains, repository logic</td>
              <td>supertest + Vitest</td>
            </tr>
            <tr>
              <td><strong>E2E</strong></td>
              <td>Slow (seconds)</td>
              <td>None — real everything including browser</td>
              <td>Very high — tests exactly what users experience</td>
              <td>Critical user journeys: signup, checkout, auth flows</td>
              <td>Cypress, Playwright</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="coverage">Code Coverage</h2>
      <pre><code>{`// vitest coverage setup
// npm install -D @vitest/coverage-v8

// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});

// Run: npx vitest --coverage

// What coverage measures:
// Line coverage: were these lines executed?
// Branch coverage: were both sides of conditions tested?
// Function coverage: was this function called at all?

// What coverage does NOT measure:
// Correctness of assertions — 100% coverage with wrong assertions is worthless
// Error handling of external services — if mocked, the real error path isn't exercised
// Race conditions and timing bugs

// A file with 100% line coverage and no assertions tests nothing.
// A file with 60% coverage and strong assertions is more valuable.
// Use coverage to find UNTESTED code, not to measure test quality.`}</code></pre>

      <h2 id="contract-testing">Contract Testing with Zod</h2>
      <pre><code>{`// Contract testing: verify that your API responses match the schema your clients expect
// Prevents: adding optional fields that become required on the client side
// Prevents: changing field types that break client deserializers

import { z } from "zod";
import request from "supertest";
import app from "../app";

// Define the response schema (your API contract)
const UserResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["USER", "EDITOR", "ADMIN"]),
    createdAt: z.string().datetime(),
  }),
});

const UserListResponseSchema = z.object({
  data: z.array(UserResponseSchema.shape.data),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

describe("API contract tests", () => {
  it("GET /users/:id response matches contract", async () => {
    const user = await createTestUser();
    const token = generateAdminToken();

    const response = await request(app)
      .get(\`/users/\${user.id}\`)
      .set("Authorization", \`Bearer \${token}\`);

    expect(response.status).toBe(200);

    // Validate the response body against the schema
    const result = UserResponseSchema.safeParse(response.body);
    if (!result.success) {
      // Pretty-print validation errors for debugging
      throw new Error(
        "Response does not match contract:\\n" +
        result.error.issues.map((i) => \`  \${i.path.join(".")}: \${i.message}\`).join("\\n")
      );
    }
  });

  it("GET /users response matches contract", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", \`Bearer \${generateAdminToken()}\`);

    expect(response.status).toBe(200);
    const result = UserListResponseSchema.safeParse(response.body);
    expect(result.success).toBe(true);
  });
});`}</code></pre>
    </div>
  );
}
