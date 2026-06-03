import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const queryPriorityDiagram = String.raw`flowchart TD
  A["Start: what do you want to find?"]
  A --> B["getByRole\n(button, heading, textbox, link…)\nAccessible to everyone — prefer first"]
  B --> C["getByLabelText\n(form fields — finds by <label> association)"]
  C --> D["getByPlaceholderText\n(form fields without a label — less ideal)"]
  D --> E["getByText\n(visible text content — for non-interactive elements)"]
  E --> F["getByDisplayValue\n(current value of input/textarea/select)"]
  F --> G["getByAltText\n(images — alt attribute)"]
  G --> H["getByTitle\n(title attribute — avoid if possible)"]
  H --> I["getByTestId\n(data-testid — escape hatch ONLY,\nnot based on user-visible behavior)"]

  style A fill:#6366f1,color:#fff,stroke:none
  style B fill:#22c55e,color:#fff,stroke:none
  style I fill:#ef4444,color:#fff,stroke:none`;

const mswInterceptDiagram = String.raw`sequenceDiagram
  participant T as Test Code
  participant C as Component
  participant SW as MSW Service Worker
  participant H as MSW Handler

  T->>C: render(<UserProfile id="42" />)
  C->>SW: fetch('/api/users/42')
  SW->>H: intercept — match route handler
  H-->>SW: return mock Response { status: 200, body: {...} }
  SW-->>C: mock response delivered
  C->>C: setState(data) — re-render with user data
  T->>T: await screen.findByText('Jane Doe')
  T->>T: assert — element found, test passes`;

export const toc: TocItem[] = [
  { id: "rtl-mental-model", title: "RTL Mental Model", level: 2 },
  { id: "query-priority", title: "Query Priority", level: 3 },
  { id: "core-testing-patterns", title: "Core Testing Patterns", level: 2 },
  { id: "query-types", title: "Query Types: getBy vs queryBy vs findBy", level: 3 },
  { id: "userevent-vs-fireevent", title: "userEvent vs fireEvent", level: 3 },
  { id: "async-queries", title: "Async Queries: waitFor and findBy", level: 3 },
  { id: "testing-custom-hooks", title: "Testing Custom Hooks", level: 2 },
  { id: "testing-async-data", title: "Testing Async and Data Fetching", level: 2 },
  { id: "msw-setup", title: "MSW Setup and Interception Flow", level: 3 },
  { id: "testing-states", title: "Testing Loading, Error, and Success States", level: 3 },
  { id: "testing-error-boundaries", title: "Testing Error Boundaries and Context", level: 2 },
  { id: "what-not-to-test", title: "What NOT to Test", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge: Data-Fetching Component", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TestingReactApplications() {
  return (
    <div className="article-content">
      <p>
        Most React bugs do not come from misconfigured bundlers or wrong versions — they come from
        components that behave differently than you expect when users interact with them. Testing
        fills that gap, but only if you test the right things. React Testing Library (RTL) was
        built around a single guiding philosophy: <strong>test what the user sees and does, not
        how your component is implemented internally</strong>. That distinction separates tests
        that catch real bugs from tests that break every time you refactor.
      </p>

      <h2 id="rtl-mental-model">RTL Mental Model</h2>

      <p>
        The guiding principle from the RTL docs is: &ldquo;The more your tests resemble the way
        your software is used, the more confidence they can give you.&rdquo; In practice, this
        means every query, every assertion, and every interaction should be written from the
        perspective of a user with a browser — not a developer with access to component internals.
      </p>

      <p>
        The practical consequence: you never reach into a component&apos;s state or props to
        assert on them. You assert on what appears in the DOM. You simulate what a user would do
        — type, click, tab, submit — not what code does internally. This makes tests resilient
        to refactors: if you rename a state variable but the UI output is identical, no test
        breaks. That is the entire point.
      </p>

      <h3 id="query-priority">Query Priority</h3>

      <p>
        RTL provides many ways to find elements. Using the wrong one makes tests brittle or
        inaccessible. The recommended order mirrors how both users and assistive technology
        interact with the page — start with semantic, accessible queries and use{" "}
        <code>data-testid</code> only as a last resort.
      </p>

      <MermaidDiagram
        chart={queryPriorityDiagram}
        title="RTL Query Priority (use top-down)"
        caption="Always reach for getByRole first. It queries by the ARIA role the browser exposes, which means your tests double as an accessibility check. Reserve getByTestId for elements with no accessible name or visible text."
        minHeight={480}
      />

      <p>
        The most common mistake is reaching for <code>getByTestId</code> first because it feels
        precise and explicit. In practice, it couples your test to markup structure rather than
        user-visible behavior. A button that changes from <code>&lt;button&gt;</code> to{" "}
        <code>&lt;div role="button"&gt;</code> should not break your test — but a{" "}
        <code>data-testid</code> rename would.
      </p>

      <h2 id="core-testing-patterns">Core Testing Patterns</h2>

      <p>
        Every RTL test follows the same skeleton: render a component into a virtual DOM, query
        for elements the user would see, simulate what the user would do, and assert on the
        resulting DOM. The library re-exports everything you need from a single entry point.
      </p>

      <pre>
        <code>{`import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

test("submits with email and password", async () => {
  const onSubmit = vi.fn();
  // 1. Render the component into jsdom
  render(<LoginForm onSubmit={onSubmit} />);

  // 2. Query by role — what a screen reader would announce
  const emailInput = screen.getByRole("textbox", { name: /email/i });
  const passwordInput = screen.getByLabelText(/password/i);
  const submitButton = screen.getByRole("button", { name: /sign in/i });

  // 3. Simulate real user interaction (dispatches real browser events)
  const user = userEvent.setup();
  await user.type(emailInput, "jane@example.com");
  await user.type(passwordInput, "secret");
  await user.click(submitButton);

  // 4. Assert on observable outcomes
  expect(onSubmit).toHaveBeenCalledWith({
    email: "jane@example.com",
    password: "secret",
  });
});`}</code>
      </pre>

      <h3 id="query-types">Query Types: getBy vs queryBy vs findBy</h3>

      <ArticleTable
        caption="Choose the query variant based on whether the element should exist and whether it appears asynchronously."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Returns</th>
              <th>When element is absent</th>
              <th>Async?</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>getBy*</code></td>
              <td>The element</td>
              <td>Throws immediately</td>
              <td>No</td>
              <td>Element must be present right now — the default choice</td>
            </tr>
            <tr>
              <td><code>queryBy*</code></td>
              <td>Element or <code>null</code></td>
              <td>Returns <code>null</code></td>
              <td>No</td>
              <td>Asserting an element is <em>not</em> present (<code>expect(...).toBeNull()</code>)</td>
            </tr>
            <tr>
              <td><code>findBy*</code></td>
              <td>Promise → element</td>
              <td>Rejects after timeout (1 s default)</td>
              <td>Yes — <code>await</code></td>
              <td>Element appears after an async event (fetch, animation, timeout)</td>
            </tr>
            <tr>
              <td><code>getAllBy*</code></td>
              <td>Array of elements</td>
              <td>Throws if none found</td>
              <td>No</td>
              <td>Multiple matching elements expected</td>
            </tr>
            <tr>
              <td><code>queryAllBy*</code></td>
              <td>Array (may be empty)</td>
              <td>Returns <code>[]</code></td>
              <td>No</td>
              <td>Testing a list that may have zero items</td>
            </tr>
            <tr>
              <td><code>findAllBy*</code></td>
              <td>Promise → array</td>
              <td>Rejects after timeout</td>
              <td>Yes — <code>await</code></td>
              <td>Multiple elements that appear asynchronously</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="userevent-vs-fireevent">userEvent vs fireEvent</h3>

      <p>
        <code>fireEvent</code> dispatches a single synthetic DOM event. <code>userEvent</code>{" "}
        simulates the full sequence of events a real browser fires — for a click that means{" "}
        <code>pointerover</code>, <code>pointerenter</code>, <code>mouseover</code>,{" "}
        <code>mouseenter</code>, <code>pointermove</code>, <code>mousemove</code>,{" "}
        <code>pointerdown</code>, <code>mousedown</code>, <code>focus</code>, <code>pointerup</code>,{" "}
        <code>mouseup</code>, <code>click</code>. For typing it also fires <code>keydown</code>,{" "}
        <code>keypress</code>, <code>input</code>, <code>keyup</code> per character. This matters
        when components use <code>onMouseEnter</code>, <code>onFocus</code>, or input masks.
        <strong> Always prefer <code>userEvent</code></strong>; reach for <code>fireEvent</code>
        only when you need to trigger a very specific event that <code>userEvent</code> does not
        cover.
      </p>

      <h3 id="async-queries">Async Queries: waitFor and findBy</h3>

      <pre>
        <code>{`import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("shows error message on failed submission", async () => {
  render(<NewsletterSignup />);
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: /subscribe/i }));

  // waitFor polls the callback until it stops throwing (or times out).
  // Use it when the DOM change happens after a promise resolves or a state update.
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(/email is required/i);
  });

  // Equivalent shorthand — findBy* wraps a getBy* inside waitFor:
  // const alert = await screen.findByRole("alert");
  // expect(alert).toHaveTextContent(/email is required/i);
});`}</code>
      </pre>

      <p>
        The most common mistake with <code>waitFor</code> is wrapping multiple assertions inside
        a single callback. If the first assertion passes but the second fails, <code>waitFor</code>{" "}
        retries — but by then, the DOM may have moved on. Put one assertion per <code>waitFor</code>{" "}
        call, or use <code>findBy*</code> to wait for the key element, then assert synchronously
        on related DOM nodes after.
      </p>

      <h2 id="testing-custom-hooks">Testing Custom Hooks</h2>

      <p>
        Custom hooks cannot be called outside a React component. Before RTL shipped{" "}
        <code>renderHook</code>, the workaround was writing a throwaway wrapper component.{" "}
        <code>renderHook</code> does exactly that internally — it gives you a clean API to test
        the hook in isolation.
      </p>

      <pre>
        <code>{`import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

test("increments the count", () => {
  const { result } = renderHook(() => useCounter(0));

  // result.current is the hook's return value.
  // Reads are synchronous — no await needed for initial state.
  expect(result.current.count).toBe(0);

  // State updates triggered outside React's render cycle require act().
  // act() flushes the update and re-renders before you assert.
  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

test("async hook: fetches user data", async () => {
  // Wrap provider dependencies in the options.wrapper
  const { result } = renderHook(() => useUser("42"), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  // Initial state before fetch resolves
  expect(result.current.isLoading).toBe(true);

  // Wait for the async state transition
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data?.name).toBe("Jane Doe");
});`}</code>
      </pre>

      <p>
        <code>act()</code> is the mechanism React uses to ensure all state updates and effects
        are flushed before you assert. RTL wraps most of its APIs in <code>act()</code>{" "}
        automatically — you only need to call it explicitly when triggering state changes
        imperatively (calling a function from a hook, advancing timers, etc.).
      </p>

      <InterviewPlaybook
        title="How to answer: When would you use renderHook vs just writing a component test?"
        intro="Interviewers use this to check if you understand when hook isolation is useful versus when it creates unnecessary indirection."
        steps={[
          "Open with the purpose: renderHook is for testing hook logic in isolation, without needing to exercise a real UI.",
          "Name the right use case: logic-heavy hooks with many edge cases — useDebounce, useAsync, useForm field state — benefit from direct testing because you can enumerate inputs and outputs without rendering UI.",
          "Name the wrong use case: if the hook's primary value is its effect on the DOM (like a hook that manages focus), a component test is more valuable because it tests the actual user experience.",
          "Close with the production implication: hooks that are tested in isolation tend to stay pure and composable; hooks tested only via component tests can accumulate hidden coupling to specific UI contexts.",
        ]}
      />

      <h2 id="testing-async-data">Testing Async and Data Fetching</h2>

      <p>
        Mocking <code>fetch</code> by monkeypatching the global is the most common approach and
        the most common source of flaky tests. The network layer is complex — you want to test
        at the HTTP boundary, not the JavaScript API boundary. <strong>Mock Service Worker
        (MSW)</strong> intercepts requests at the service worker level (in the browser) or via
        Node.js interceptors (in tests), returning realistic responses without mocking fetch
        itself.
      </p>

      <h3 id="msw-setup">MSW Setup and Interception Flow</h3>

      <MermaidDiagram
        chart={mswInterceptDiagram}
        title="MSW Request Interception in Tests"
        caption="MSW intercepts at the network layer — your component calls fetch normally. The service worker (or Node interceptor in tests) catches the outbound request and returns the mock response before it leaves the process. This means you test the component exactly as it runs in production."
        minHeight={400}
      />

      <pre>
        <code>{`// src/mocks/handlers.ts — shared between tests and browser dev
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    if (params.id === "404") {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json({
      id: params.id,
      name: "Jane Doe",
      email: "jane@example.com",
    });
  }),
];

// src/mocks/server.ts — Node.js test environment
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// vitest.setup.ts (or jest.setup.ts)
import { server } from "./src/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers()); // clean per-test overrides
afterAll(() => server.close());`}</code>
      </pre>

      <h3 id="testing-states">Testing Loading, Error, and Success States</h3>

      <pre>
        <code>{`import { render, screen } from "@testing-library/react";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { UserProfile } from "./UserProfile";

// Success state — default handler returns the user
test("renders user name on success", async () => {
  render(<UserProfile userId="42" />);

  // Loading state appears synchronously
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);

  // Wait for data to appear — findBy* retries until found or timeout
  expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

// Error state — override the handler for this test only
test("renders error message on 500", async () => {
  server.use(
    http.get("/api/users/:id", () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    )
  );

  render(<UserProfile userId="42" />);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/something went wrong/i);
});

// Empty state
test("renders not-found message on 404", async () => {
  render(<UserProfile userId="404" />);

  expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
});`}</code>
      </pre>

      <p>
        The pattern of testing all three states (loading, error, success) for every async
        component is the minimum bar. The most common omission in production codebases is the
        error state test — it is the one that matters most when your app hits a 500 at 2 AM.
      </p>

      <h2 id="testing-error-boundaries">Testing Error Boundaries and Context</h2>

      <p>
        Components that depend on context or that need an error boundary require a wrapper.
        RTL&apos;s <code>render</code> accepts a <code>wrapper</code> option — use it to compose
        providers rather than duplicating boilerplate in every test file.
      </p>

      <pre>
        <code>{`// test-utils.tsx — custom render that wraps all providers
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./ThemeProvider";
import type { ReactNode } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },   // don't retry on error in tests
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme="dark">{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

// Drop-in replacement for RTL's render — same API, all providers included
export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Testing that an error boundary catches a render error
test("shows error fallback when component throws", () => {
  // Suppress expected console.error from React's error boundary machinery
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  const BrokenComponent = () => { throw new Error("Boom"); };

  renderWithProviders(
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <BrokenComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText("Something went wrong")).toBeInTheDocument();

  spy.mockRestore();
});`}</code>
      </pre>

      <h2 id="what-not-to-test">What NOT to Test</h2>

      <p>
        Implementation-detail tests are the primary source of maintenance burden in React
        test suites. They break when you refactor even though behavior is identical, and they
        give false confidence by passing even when behavior is broken.
      </p>

      <ArticleTable
        caption="The implementation-detail trap: these patterns look thorough but test the wrong things."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Test this</th>
              <th>Not this</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>The DOM element that appears after a button click</td>
              <td>The state variable that changes after the click (<code>component.state.open</code>)</td>
              <td>State is private. The DOM is the contract.</td>
            </tr>
            <tr>
              <td>The text / ARIA content a user reads</td>
              <td>The class names applied to an element</td>
              <td>Class names are styling details. Renaming them is not a bug.</td>
            </tr>
            <tr>
              <td>The network request that fires (via MSW)</td>
              <td>That a specific function or method was called internally</td>
              <td>Internal function names change on every refactor.</td>
            </tr>
            <tr>
              <td>Snapshot of a stable, semantically meaningful component</td>
              <td>Snapshot of the entire component tree including all children</td>
              <td>Large snapshots break on any change and are never reviewed carefully.</td>
            </tr>
            <tr>
              <td>Accessible label and keyboard navigation</td>
              <td>Exact pixel dimensions or CSS values</td>
              <td>Layout is a browser concern; accessibility is a product concern.</td>
            </tr>
            <tr>
              <td>What the user sees when data loads or an error occurs</td>
              <td>The internal error object or loading boolean in state</td>
              <td>Users experience UI states, not state machine internals.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        On snapshots specifically: inline snapshots on small, stable components (like a Button
        with a known prop set) are defensible. Full-tree snapshots on complex pages are noise.
        They fail on every legitimate change, get updated without review, and provide no signal
        about whether the behavior is correct.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How do you approach testing in React?"
        intro="This is the most common React testing question. Interviewers are checking whether you test for the right reasons, understand RTL's philosophy, and know where to draw tool boundaries."
        steps={[
          "Open with the philosophy: I test from the user's perspective using React Testing Library. That means querying by role, label, or visible text — never by class names or internal state.",
          "Describe the default stack: RTL for component tests, MSW for mocking network requests, Vitest (or Jest) as the runner. For E2E, Playwright or Cypress at the feature boundary.",
          "Explain what gets tested: every async component gets three states — loading, error, success. Forms get validation paths. Custom hooks get renderHook tests for logic-heavy edge cases.",
          "Name what does NOT get tested: implementation details — state variables, method calls, class names. Also: third-party library internals, pure presentational components with no logic.",
          "Close with the confidence argument: tests should give you confidence to refactor. If a test breaks when you rename a state variable but the UI is unchanged, it was testing the wrong thing.",
        ]}
      />

      <InterviewPlaybook
        title="How do you handle flaky tests in a React test suite?"
        intro="Flakiness is a senior engineer concern. Interviewers want to know if you understand the root causes — not just that you retry or skip flaky tests."
        steps={[
          "Name the most common cause: async assertion timing — not waiting for the DOM to settle before asserting. Fix: use findBy* or waitFor instead of getBy* after async operations.",
          "Second most common: shared state between tests — a global MSW handler mutated in one test bleeds into the next. Fix: server.resetHandlers() in afterEach.",
          "Third: test order dependency — tests that pass in isolation but fail when run in sequence. Fix: each test should set up all its own state. Never share mutable state at module scope.",
          "On snapshot flakiness: if a snapshot breaks on every PR, delete it. Snapshots that nobody reviews are liability, not coverage.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge: Data-Fetching Component</h2>

      <InterviewChallenge
        title="Write tests for UserProfile: loading, error, and success states"
        scenario={
          <>
            You are given this component that fetches a user by ID from <code>/api/users/:id</code>:
            <pre style={{ marginTop: "0.75rem" }}>
              <code>{`// UserProfile.tsx
import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string };
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: User }
  | { status: "error"; message: string };

export function UserProfile({ userId }: { userId: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });
    fetch(\`/api/users/\${userId}\`)
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json() as Promise<User>;
      })
      .then((user) => setState({ status: "success", user }))
      .catch((err) => setState({ status: "error", message: err.message }));
  }, [userId]);

  if (state.status === "loading") return <p role="status">Loading…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;
  if (state.status === "success") return <h1>{state.user.name}</h1>;
  return null;
}`}</code>
            </pre>
            Write a full test file using RTL v14 and MSW v2 that covers all three observable states.
          </>
        }
        tasks={[
          "Set up an MSW server with a handler for GET /api/users/:id — one happy-path handler returning a user object.",
          "Write a test that asserts the loading state appears immediately on render.",
          "Write a test that asserts the user name appears after the fetch resolves (findBy*).",
          "Override the handler to return a 500 and assert the error role element appears.",
          "Explain what server.resetHandlers() does and why it belongs in afterEach.",
        ]}
      />

      <SolutionReveal difficulty="medium">
        <pre>
          <code>{`// UserProfile.test.tsx
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { UserProfile } from "./UserProfile";

const server = setupServer(
  http.get("/api/users/:id", () =>
    HttpResponse.json({ id: "42", name: "Jane Doe", email: "jane@example.com" })
  )
);

// Global lifecycle for the MSW server
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
// CRITICAL: reset per-test handler overrides so they don't bleed
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("shows loading state immediately", () => {
  render(<UserProfile userId="42" />);
  // Synchronous — loading is shown before the fetch promise resolves
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
});

test("renders the user name on successful fetch", async () => {
  render(<UserProfile userId="42" />);
  // findByText waits for the element to appear (polls until found or timeout)
  expect(await screen.findByRole("heading", { name: "Jane Doe" })).toBeInTheDocument();
  // Loading indicator should be gone after success
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("renders error message when fetch returns 500", async () => {
  // Override just for this test — server.resetHandlers() will clean it up
  server.use(
    http.get("/api/users/:id", () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    )
  );

  render(<UserProfile userId="42" />);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/http 500/i);
});

// server.resetHandlers() in afterEach ensures the override above
// doesn't affect any subsequent tests — each test starts from the
// baseline handlers defined in setupServer(). Without it, handler
// overrides from one test silently corrupt the next test's network layer.`}</code>
        </pre>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Test behavior, not implementation.</strong> Query by role, label, and visible
          text. Never assert on class names, internal state variables, or method call counts.
        </li>
        <li>
          <strong>Follow query priority rigorously.</strong> <code>getByRole</code> first — it
          doubles as an accessibility check. <code>getByTestId</code> is an escape hatch, not a
          default.
        </li>
        <li>
          <strong>Use MSW for async tests.</strong> It intercepts at the network layer and makes
          your tests test the real fetch path. Never monkeypatch <code>global.fetch</code>.
        </li>
        <li>
          <strong>Cover all async states.</strong> Every component that fetches data must have
          tests for loading, success, and error — the error test is the one that saves you at 2 AM.
        </li>
        <li>
          <strong>Always <code>server.resetHandlers()</code> in afterEach.</strong> Per-test
          handler overrides silently corrupt subsequent tests if not cleaned up.
        </li>
        <li>
          <strong>Prefer <code>userEvent</code> over <code>fireEvent</code>.</strong> It fires
          the full browser event sequence and catches bugs that single synthetic events miss.
        </li>
      </ul>
    </div>
  );
}
