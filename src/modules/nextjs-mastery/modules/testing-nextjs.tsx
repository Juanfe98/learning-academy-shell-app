import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const testingPyramidDiagram = String.raw`flowchart TD
  E2E["E2E Tests (Playwright)<br/>Full user flows<br/>Slowest, most realistic<br/>Few of these"]
  INT["Integration Tests<br/>Route Handlers, Client Components<br/>with RTL + navigation mocks<br/>Medium speed"]
  UNIT["Unit Tests<br/>Pure functions, Server Actions,<br/>utility logic, business rules<br/>Fastest, most of these"]

  UNIT --> INT --> E2E

  note1["Next.js specific: Server Components<br/>tested via async function calls or renderToString"]
  note2["Route Handlers tested directly<br/>with Request constructor — no HTTP server needed"]

  UNIT -.-> note1
  INT -.-> note2`;

const architectureCoverageDiagram = String.raw`flowchart LR
  SC["Server Components<br/>async function → renderToString<br/>or test as async fn"]
  CC["Client Components<br/>React Testing Library<br/>mock next/navigation hooks"]
  RH["Route Handlers<br/>new Request() constructor<br/>call handler directly"]
  SA["Server Actions<br/>call as async function<br/>mock database layer"]
  MW["Middleware<br/>NextRequest / NextResponse<br/>test matching + rewrites"]
  E2E["Full Pages<br/>Playwright E2E<br/>real browser, real server"]

  SC --> CC --> RH --> SA --> MW --> E2E`;

export const toc: TocItem[] = [
  { id: "testing-landscape", title: "The Next.js Testing Landscape", level: 2 },
  { id: "testing-client-components", title: "Testing Client Components", level: 2 },
  { id: "mocking-next-navigation", title: "Mocking next/navigation Hooks", level: 2 },
  { id: "testing-server-components", title: "Testing Server Components", level: 2 },
  { id: "testing-route-handlers", title: "Testing Route Handlers", level: 2 },
  { id: "testing-server-actions", title: "Testing Server Actions", level: 2 },
  { id: "testing-middleware", title: "Testing Middleware", level: 2 },
  { id: "e2e-with-playwright", title: "E2E Testing with Playwright", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TestingNextjs() {
  return (
    <div className="article-content">
      <p>
        Testing Next.js applications requires different strategies for each primitive: Server
        Components, Client Components, Route Handlers, Server Actions, and middleware all have
        distinct testing approaches. The good news is that most Next.js primitives can be tested
        without a running HTTP server — you can call handlers and actions directly as functions.
        This module covers the exact patterns that work.
      </p>

      <h2 id="testing-landscape">The Next.js Testing Landscape</h2>

      <MermaidDiagram
        chart={testingPyramidDiagram}
        title="Testing Pyramid for Next.js"
        caption="Most tests should be fast unit tests on pure logic and Server Actions. Integration tests cover Route Handlers and client components with mocked navigation. E2E tests cover full user flows with a real browser."
        minHeight={500}
      />

      <MermaidDiagram
        chart={architectureCoverageDiagram}
        title="What Each Test Type Covers"
        caption="Each Next.js primitive maps to a specific testing approach. None require an actual running HTTP server except E2E."
        minHeight={360}
      />

      <ArticleTable caption="Test approach per Next.js primitive." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Primitive</th>
              <th>Test approach</th>
              <th>Key tool</th>
              <th>Needs HTTP server?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Server Component</td>
              <td>Call as async function, assert on JSX output or use renderToString</td>
              <td>Vitest + react-dom/server</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Client Component</td>
              <td>React Testing Library, mock next/navigation</td>
              <td>Vitest + @testing-library/react</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Route Handler</td>
              <td>Construct a Request, call the exported GET/POST/etc. directly</td>
              <td>Vitest</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Server Action</td>
              <td>Call as async function, mock the DB layer</td>
              <td>Vitest</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Middleware</td>
              <td>Construct NextRequest, call middleware function directly</td>
              <td>Vitest + next/server</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Full page flow</td>
              <td>E2E with real browser and running server</td>
              <td>Playwright</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="testing-client-components">Testing Client Components</h2>
      <p>
        Client Components are the most familiar to test — they are standard React components and
        work with React Testing Library (RTL). The main difference from a plain React app is that
        many components use Next.js navigation hooks which need to be mocked.
      </p>
      <pre>
        <code>{`// src/components/AddToCartButton.tsx
"use client";
import { useState } from "react";

interface Props {
  productId: string;
  onAdd: (id: string) => Promise<void>;
}

export function AddToCartButton({ productId, onAdd }: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleClick() {
    setLoading(true);
    await onAdd(productId);
    setLoading(false);
    setAdded(true);
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {added ? "Added!" : loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}

// src/components/AddToCartButton.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddToCartButton } from "./AddToCartButton";
import { describe, it, expect, vi } from "vitest";

describe("AddToCartButton", () => {
  it("shows loading state while adding", async () => {
    const mockOnAdd = vi.fn(() => new Promise<void>((r) => setTimeout(r, 50)));
    render(<AddToCartButton productId="123" onAdd={mockOnAdd} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Adding...")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Added!")).toBeInTheDocument());
    expect(mockOnAdd).toHaveBeenCalledWith("123");
  });
});`}</code>
      </pre>

      <h2 id="mocking-next-navigation">Mocking next/navigation Hooks</h2>
      <p>
        Components that use <code>useRouter</code>, <code>usePathname</code>, or{" "}
        <code>useSearchParams</code> will throw in tests unless you mock{" "}
        <code>next/navigation</code>. This is the exact mock pattern that works with both Vitest
        and Jest.
      </p>
      <pre>
        <code>{`// In your test file or a vitest setup file
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams("page=1&sort=desc"),
  useParams: () => ({ slug: "test-post" }),
  useSelectedLayoutSegment: () => null,
  redirect: vi.fn(),
}));

// Test a component that uses navigation hooks
import { render, screen } from "@testing-library/react";
import { NavLink } from "./NavLink";

describe("NavLink", () => {
  it("marks the dashboard link as active when on /dashboard", () => {
    // usePathname mock returns /dashboard by default above
    render(<NavLink href="/dashboard">Dashboard</NavLink>);
    const link = screen.getByText("Dashboard");
    expect(link).toHaveClass("active");
  });
});

// Override mocks per-test if you need different values
import * as NextNavigation from "next/navigation";

it("marks home link as active when on /home", () => {
  vi.spyOn(NextNavigation, "usePathname").mockReturnValue("/home");
  render(<NavLink href="/home">Home</NavLink>);
  expect(screen.getByText("Home")).toHaveClass("active");
});`}</code>
      </pre>

      <h2 id="testing-server-components">Testing Server Components</h2>
      <p>
        React Server Components are async functions, so you can test them by calling the function
        directly. For simple cases, render the awaited result with React Testing Library. For more
        complex cases with streaming, use <code>react-dom/server</code>'s{" "}
        <code>renderToString</code>.
      </p>
      <pre>
        <code>{`// src/app/blog/page.tsx
import { db } from "@/lib/db";

export default async function BlogPage() {
  const posts = await db.post.findMany({ take: 10 });
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

// src/app/blog/page.test.tsx
import { renderToString } from "react-dom/server";
import { vi, describe, it, expect } from "vitest";
import BlogPage from "./page";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn().mockResolvedValue([
        { id: "1", title: "Hello World" },
        { id: "2", title: "Second Post" },
      ]),
    },
  },
}));

describe("BlogPage", () => {
  it("renders a list of posts", async () => {
    // Server Component is an async function — await it to get the JSX
    const jsx = await BlogPage();
    const html = renderToString(jsx);
    expect(html).toContain("Hello World");
    expect(html).toContain("Second Post");
  });
});

// Alternative: use React Testing Library with async rendering
import { render, screen } from "@testing-library/react";

it("renders posts with RTL", async () => {
  const jsx = await BlogPage();
  render(jsx);
  expect(screen.getByText("Hello World")).toBeInTheDocument();
});`}</code>
      </pre>

      <h2 id="testing-route-handlers">Testing Route Handlers</h2>
      <p>
        Route Handlers are plain functions that accept a <code>Request</code> and return a{" "}
        <code>Response</code>. You can test them by constructing a <code>Request</code> object and
        calling the handler directly — no HTTP server, no supertest, no test environment needed
        beyond Node.js with Web API support (which Vitest provides).
      </p>
      <pre>
        <code>{`// src/app/api/users/route.ts
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const users = await db.user.findMany({ skip: (page - 1) * 10, take: 10 });
  return Response.json({ users, page });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.email) {
    return Response.json({ error: "Name and email required" }, { status: 400 });
  }
  const user = await db.user.create({ data: body });
  return Response.json(user, { status: 201 });
}

// src/app/api/users/route.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: "1", name: "Alice", email: "alice@example.com" },
      ]),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "2",
        ...data,
      })),
    },
  },
}));

describe("GET /api/users", () => {
  it("returns paginated users", async () => {
    const request = new Request("http://localhost/api/users?page=1");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.page).toBe(1);
  });
});

describe("POST /api/users", () => {
  it("creates a user with valid data", async () => {
    const request = new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ name: "Bob", email: "bob@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const user = await response.json();
    expect(user.name).toBe("Bob");
  });

  it("returns 400 for missing fields", async () => {
    const request = new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ name: "Bob" }), // missing email
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});`}</code>
      </pre>

      <h2 id="testing-server-actions">Testing Server Actions</h2>
      <p>
        Server Actions are also plain async functions — you can import and call them directly in
        tests. Mock the database or external services at the module level.
      </p>
      <pre>
        <code>{`// src/app/actions/user.ts
"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name || !email) {
    return { error: "Name and email are required" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email already registered" };
  }

  const user = await db.user.create({ data: { name, email } });
  revalidatePath("/users");
  return { user };
}

// src/app/actions/user.test.ts
import { vi, describe, it, expect } from "vitest";
import { createUser } from "./user";

// Mock DB and Next.js cache
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";

describe("createUser", () => {
  it("returns error for missing fields", async () => {
    const formData = new FormData();
    formData.append("name", "Alice");
    // no email

    const result = await createUser(formData);
    expect(result.error).toBe("Name and email are required");
  });

  it("returns error if email already exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "1",
      name: "Existing",
      email: "alice@example.com",
    });

    const formData = new FormData();
    formData.append("name", "Alice");
    formData.append("email", "alice@example.com");

    const result = await createUser(formData);
    expect(result.error).toBe("Email already registered");
  });

  it("creates user and returns it", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "2",
      name: "Bob",
      email: "bob@example.com",
    });

    const formData = new FormData();
    formData.append("name", "Bob");
    formData.append("email", "bob@example.com");

    const result = await createUser(formData);
    expect(result.user?.name).toBe("Bob");
  });
});`}</code>
      </pre>

      <h2 id="testing-middleware">Testing Middleware</h2>
      <p>
        Middleware can be tested by constructing a <code>NextRequest</code> and calling the
        middleware function directly. Check the response headers, status, and redirect location.
      </p>
      <pre>
        <code>{`// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard");

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// src/middleware.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

describe("auth middleware", () => {
  it("redirects unauthenticated users from /dashboard", async () => {
    const request = new NextRequest("http://localhost/dashboard");
    // No auth-token cookie

    const response = await middleware(request);
    expect(response.status).toBe(307); // redirect status
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows authenticated users through", async () => {
    const request = new NextRequest("http://localhost/dashboard", {
      headers: { Cookie: "auth-token=valid-token" },
    });

    const response = await middleware(request);
    // NextResponse.next() returns a 200
    expect(response.status).toBe(200);
  });

  it("allows unauthenticated users on public pages", async () => {
    const request = new NextRequest("http://localhost/login");
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});`}</code>
      </pre>

      <h2 id="e2e-with-playwright">E2E Testing with Playwright</h2>
      <p>
        Playwright is the recommended E2E testing tool for Next.js applications. It runs a real
        browser against a real (or test) server. Use it for critical user flows: login, checkout,
        form submission with real validation, and navigation.
      </p>
      <pre>
        <code>{`// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm dev",    // or "pnpm build && pnpm start" for production build tests
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});

// e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test("user can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "secret");
  await page.click('button[type="submit"]');

  // After successful login, expect redirect to dashboard
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("Welcome back")).toBeVisible();
});

test("shows error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "wrong@example.com");
  await page.fill('input[name="password"]', "wrong");
  await page.click('button[type="submit"]');

  await expect(page.getByText("Invalid credentials")).toBeVisible();
  await expect(page).toHaveURL("/login"); // stays on login page
});`}</code>
      </pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How do you test a Next.js application?"
        intro="Walk through your strategy by layer. Interviewers want to see you have a clear mental model for what to test at each level and know the specific tools and patterns."
        steps={[
          "Start with the testing pyramid: most tests are unit tests on pure logic — utility functions, business rules, Server Actions with mocked dependencies. Fast and plentiful.",
          "Client Components use React Testing Library. The key Next.js-specific concern is mocking next/navigation — useRouter, usePathname, useSearchParams all need to be mocked with vi.mock.",
          "Route Handlers can be tested by calling them directly with a new Request() object. No supertest, no running server. Assert on response.status and await response.json().",
          "Server Actions are async functions — import them directly and call them. Mock the database layer at the module level.",
          "Middleware is tested with NextRequest construction and calling the middleware function. Assert on the response headers, status, or redirect URL.",
          "E2E tests with Playwright cover critical user flows end-to-end. Use sparingly — these are the slowest tests. Focus on login, checkout, and other high-value, high-risk flows.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: Test Strategy for a Server Action + Component Pair"
        scenario={
          <span>
            Your application has this feature: a Server Component page{" "}
            <code>app/products/page.tsx</code> that fetches a product list from the database and
            renders it. Below the list is a Client Component form that calls a Server Action{" "}
            <code>createProduct(formData)</code> which validates input, writes to the database,
            and calls <code>revalidatePath(&apos;/products&apos;)</code> to refresh the page.
          </span>
        }
        tasks={[
          "Describe the full test strategy: what do you test at the unit level, integration level, and E2E level for this feature?",
          "Write pseudocode (or real code) for a unit test of the createProduct Server Action that covers: missing required fields, duplicate product name, and successful creation.",
          "Write pseudocode for a test of the page's Server Component that asserts the product list renders correctly.",
          "What do you mock in each test and why? What would you NOT mock?",
        ]}
        pitfalls={[
          "Testing the Server Action through the UI only — you miss logic edge cases and make tests brittle.",
          "Trying to test the Server Component with a running server — it's an async function, call it directly.",
          "Forgetting to mock revalidatePath — it will throw in test environment if not mocked.",
          "Not testing the missing-field and duplicate-name error paths — these are the most likely real bugs.",
        ]}
        signal="A strong answer separates concerns: the Server Action is unit-tested directly with mocked DB and mocked revalidatePath, covering all error and success paths. The Server Component is tested by awaiting the function and rendering with renderToString. The E2E test covers the full user flow: fill form, submit, see new product appear in list."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Route Handlers are testable as plain functions — construct a <code>Request</code> object
          and call the exported handler directly. No HTTP server needed.
        </li>
        <li>
          Server Actions are plain async functions — import and call them in tests. Mock the
          database and <code>revalidatePath</code>/<code>revalidateTag</code>.
        </li>
        <li>
          Mock <code>next/navigation</code> with <code>vi.mock(&apos;next/navigation&apos;, ...)</code>{" "}
          for any Client Component that uses navigation hooks.
        </li>
        <li>
          Server Components are async functions — <code>await ComponentFn()</code> to get the JSX,
          then render with React Testing Library or <code>renderToString</code>.
        </li>
        <li>
          Middleware is testable by constructing a <code>NextRequest</code> and calling the
          middleware function. Assert on the returned response.
        </li>
        <li>
          Use Playwright for E2E. Configure <code>webServer</code> in <code>playwright.config.ts</code>{" "}
          to start the Next.js dev server automatically before tests run.
        </li>
      </ul>
    </div>
  );
}
