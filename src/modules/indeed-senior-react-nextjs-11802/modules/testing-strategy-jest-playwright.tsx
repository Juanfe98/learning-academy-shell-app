import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const testingPyramidDiagram = String.raw`flowchart TD
    E2E["E2E Tests (Playwright)\nFull user journeys: search, read article, submit feedback\nSlowest — run in CI only\nAxe-core accessibility scans"]
    INT["Integration Tests (Jest + RTL)\nPage with mocked CMS data\nMocked Apollo Provider\nTest: renders, navigates, submits"]
    UNIT["Unit Tests (Jest + RTL)\nIndividual component logic\nRich text renderer output\nForm validation rules\nFastest — run in watch mode"]

    UNIT -->|"build on"| INT
    INT -->|"build on"| E2E`;

const playwrightArchDiagram = String.raw`flowchart LR
    TEST["Playwright Test\narticle.spec.ts"]
    POM["Page Object\nHelpArticlePage"]
    BR["Browser\n(Chromium / Firefox / WebKit)"]
    APP["Next.js App\n(started by webServer config)"]
    MOCK["Mocked Contentstack\n(MSW or test fixture server)"]

    TEST --> POM
    POM --> BR
    BR --> APP
    APP --> MOCK`;

export const toc: TocItem[] = [
  { id: "testing-philosophy", title: "Testing Philosophy for CMS Apps", level: 2 },
  { id: "jest-rtl-setup", title: "Jest + React Testing Library Setup", level: 2 },
  { id: "mocking-contentstack", title: "Mocking Contentstack SDK", level: 3 },
  { id: "mocking-apollo", title: "Mocking Apollo Client with MockedProvider", level: 3 },
  { id: "mocking-next-navigation", title: "Mocking next/navigation", level: 3 },
  { id: "testing-rich-text", title: "Testing Rich Text Rendering", level: 3 },
  { id: "testing-forms", title: "Testing Dynamic Forms", level: 2 },
  { id: "playwright-setup", title: "Playwright Setup for Next.js", level: 2 },
  { id: "playwright-tests", title: "Writing Playwright Tests for Help Center", level: 3 },
  { id: "accessibility-testing", title: "Accessibility Testing with axe-core", level: 3 },
  { id: "ci-integration", title: "CI Integration with GitLab", level: 2 },
  { id: "what-to-test", title: "What to Test at Each Level", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function TestingStrategyJestPlaywright() {
  return (
    <div className="article-content">
      <p>
        Testing a CMS-driven Next.js application requires different strategies at different levels.
        You cannot test real Contentstack API calls in unit tests, but you must test that your
        rendering code handles all possible CMS data shapes. This module covers the complete testing
        stack: Jest + React Testing Library for units and integration, Playwright for E2E journeys,
        and axe-core for automated accessibility validation.
      </p>

      <h2 id="testing-philosophy">Testing Philosophy for CMS Apps</h2>
      <MermaidDiagram
        chart={testingPyramidDiagram}
        title="Testing Pyramid for a CMS-Driven Next.js App"
        caption="Most tests are fast unit and integration tests with mocked CMS data. E2E tests cover the critical user journeys and accessibility scans."
        minHeight={400}
      />

      <p>
        The key insight for CMS testing: <strong>the CMS is an external dependency, not your code</strong>.
        Your tests verify that your rendering code handles the data shapes the CMS can return —
        including empty fields, missing optional data, and maximum content lengths. The CMS API
        reliability is the CMS vendor's responsibility, not yours to test.
      </p>

      <h2 id="jest-rtl-setup">Jest + React Testing Library Setup</h2>

      <pre>
        <code>{`// jest.config.ts — Next.js compatible Jest configuration
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);

// jest.setup.ts
import "@testing-library/jest-dom";
// @testing-library/jest-dom adds matchers like toBeInTheDocument, toHaveTextContent

// Install required packages:
// pnpm add -D jest @testing-library/react @testing-library/user-event
//   @testing-library/jest-dom jest-environment-jsdom next/jest
//   @types/jest jest-axe @types/jest-axe`}</code>
      </pre>

      <h3 id="mocking-contentstack">Mocking Contentstack SDK</h3>

      <pre>
        <code>{`// __mocks__/@contentstack/delivery-sdk.ts — automatic mock via moduleNameMapper
// OR use jest.mock() per test file

// Per-test mock approach (more explicit)
import { getArticle } from "@/lib/contentstack";

jest.mock("@/lib/contentstack", () => ({
  getArticle: jest.fn(),
  getAllArticleSlugs: jest.fn(),
}));

const mockGetArticle = getArticle as jest.MockedFunction<typeof getArticle>;

// In beforeEach or each test:
const mockArticle = {
  uid: "blt123",
  title: "How to update your billing information",
  url: "/help/billing/update-billing",
  body: {
    type: "doc",
    children: [
      { type: "paragraph", children: [{ text: "Follow these steps to update your billing." }] }
    ]
  },
  author: {
    uid: "blt456",
    name: "Support Team",
    avatar: { url: "https://example.com/avatar.jpg" },
  },
  category: {
    uid: "blt789",
    title: "Billing",
    url: "/help/billing",
  },
};

test("renders article title and author", async () => {
  mockGetArticle.mockResolvedValueOnce(mockArticle);

  render(<ArticlePage params={Promise.resolve({ category: "billing", slug: "update-billing" })} />);

  // Article pages are async — use findBy to wait for content
  expect(await screen.findByRole("heading", { name: "How to update your billing information" })).toBeInTheDocument();
  expect(await screen.findByText("Support Team")).toBeInTheDocument();
});

test("renders 404 when article not found", async () => {
  mockGetArticle.mockResolvedValueOnce(null);

  // next/navigation's notFound() throws a special error
  // The test should expect the component to throw (or render the not-found component)
  // In Next.js App Router testing, mock notFound from next/navigation instead
  expect(await screen.findByText(/not found/i)).toBeInTheDocument();
});`}</code>
      </pre>

      <h3 id="mocking-apollo">Mocking Apollo Client with MockedProvider</h3>

      <pre>
        <code>{`import { MockedProvider } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";

// Define the typed mock — must match query and variables exactly
const relatedArticlesMock = {
  request: {
    query: GET_RELATED_ARTICLES,
    variables: { uids: ["blt111", "blt222"] },
  },
  result: {
    data: {
      all_article: {
        items: [
          { uid: "blt111", title: "Related Article One", url: "/help/billing/related-one" },
          { uid: "blt222", title: "Related Article Two", url: "/help/billing/related-two" },
        ],
      },
    },
  },
};

test("renders related articles from Apollo query", async () => {
  render(
    <MockedProvider mocks={[relatedArticlesMock]} addTypename={false}>
      <RelatedArticles articleUids={["blt111", "blt222"]} />
    </MockedProvider>
  );

  // Apollo loading state renders skeleton first
  expect(screen.getByTestId("related-skeleton")).toBeInTheDocument();

  // Wait for the query to resolve
  await waitFor(() => {
    expect(screen.getByText("Related Article One")).toBeInTheDocument();
    expect(screen.getByText("Related Article Two")).toBeInTheDocument();
  });
});

// Test error state
const errorMock = {
  request: { query: GET_RELATED_ARTICLES, variables: { uids: ["blt111"] } },
  error: new Error("Network error"),
};

test("renders nothing when Apollo query fails", async () => {
  render(
    <MockedProvider mocks={[errorMock]} addTypename={false}>
      <RelatedArticles articleUids={["blt111"]} />
    </MockedProvider>
  );

  await waitFor(() => {
    // Component returns null on error — graceful degradation
    expect(screen.queryByTestId("related-articles")).not.toBeInTheDocument();
  });
});`}</code>
      </pre>

      <h3 id="mocking-next-navigation">Mocking next/navigation</h3>

      <pre>
        <code>{`// next/navigation hooks require mocking in tests — they use React context internally
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    pathname: "/help/billing",
  }),
  usePathname: () => "/help/billing",
  useSearchParams: () => new URLSearchParams("q=invoice"),
  notFound: jest.fn(), // mock notFound so it doesn't throw in tests
  redirect: jest.fn(),
}));

// For testing Link components:
// @testing-library/user-event simulates clicks, which fire the mocked router.push
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/help",
}));

test("navigates to article on link click", async () => {
  render(<ArticleCard article={mockArticle} />);
  await userEvent.click(screen.getByRole("link", { name: "How to update billing" }));
  // Next.js Link navigates via useRouter in some implementations
  // Or just verify the href attribute:
  expect(screen.getByRole("link", { name: "How to update billing" })).toHaveAttribute(
    "href",
    "/help/billing/update-billing"
  );
});`}</code>
      </pre>

      <h3 id="testing-rich-text">Testing Rich Text Rendering</h3>

      <pre>
        <code>{`test("renders rich text body correctly", () => {
  const body = {
    type: "doc",
    children: [
      {
        type: "heading-2",
        children: [{ text: "Step 1: Sign in to your account" }],
      },
      {
        type: "paragraph",
        children: [
          { text: "Go to " },
          { text: "indeed.com/account", bold: true },
          { text: " and click Sign In." },
        ],
      },
      {
        type: "unordered-list",
        children: [
          { type: "list-item", children: [{ text: "Click your name in the top right" }] },
          { type: "list-item", children: [{ text: "Select Account Settings" }] },
        ],
      },
    ],
  };

  render(<RichTextRenderer body={body} />);

  expect(screen.getByRole("heading", { level: 2, name: "Step 1: Sign in to your account" })).toBeInTheDocument();
  expect(screen.getByText("indeed.com/account")).toBeInTheDocument();
  // Bold text renders as <strong>
  expect(screen.getByText("indeed.com/account").tagName).toBe("STRONG");

  const listItems = screen.getAllByRole("listitem");
  expect(listItems).toHaveLength(2);
  expect(listItems[0]).toHaveTextContent("Click your name in the top right");
});

// Snapshot test for complex rich text (catches unintentional rendering changes)
test("rich text renderer matches snapshot", () => {
  const { container } = render(<RichTextRenderer body={complexBody} />);
  expect(container.firstChild).toMatchSnapshot();
});`}</code>
      </pre>

      <h2 id="testing-forms">Testing Dynamic Forms</h2>

      <pre>
        <code>{`import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

const testFields: FieldConfig[] = [
  { id: "email", type: "email", label: "Email", required: true },
  { id: "role", type: "select", label: "Role", required: true,
    options: [{ value: "individual", label: "Individual" }, { value: "business", label: "Business" }] },
  { id: "company", type: "text", label: "Company", required: false,
    showWhen: { field: "role", value: "business" } },
];

test("shows validation errors on empty submit", async () => {
  render(<DynamicForm fields={testFields} onSubmit={jest.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
  expect(await screen.findByText("Please select an option")).toBeInTheDocument();
});

test("conditionally shows company field when role is business", async () => {
  render(<DynamicForm fields={testFields} onSubmit={jest.fn()} />);

  // Company field should NOT be visible initially
  expect(screen.queryByLabelText("Company")).not.toBeInTheDocument();

  // Select "Business" role
  await userEvent.selectOptions(screen.getByLabelText("Role"), "business");

  // Company field should now appear
  expect(screen.getByLabelText("Company")).toBeInTheDocument();
});

test("calls onSubmit with form data on valid submission", async () => {
  const mockSubmit = jest.fn().mockResolvedValue(undefined);
  render(<DynamicForm fields={testFields} onSubmit={mockSubmit} />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.selectOptions(screen.getByLabelText("Role"), "individual");
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      role: "individual",
    });
  });
});`}</code>
      </pre>

      <h2 id="playwright-setup">Playwright Setup for Next.js</h2>
      <MermaidDiagram
        chart={playwrightArchDiagram}
        title="Playwright Test Architecture"
        caption="Page Objects abstract browser interactions. The webServer config starts the Next.js dev server before tests run."
        minHeight={360}
      />

      <pre>
        <code>{`// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // retry flaky tests in CI only
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry", // capture trace on failure for debugging
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  // Start the Next.js dev server before tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});`}</code>
      </pre>

      <h3 id="playwright-tests">Writing Playwright Tests for Help Center</h3>

      <pre>
        <code>{`// e2e/pages/help-article.page.ts — Page Object Model
import { Page, Locator, expect } from "@playwright/test";

export class HelpArticlePage {
  readonly heading: Locator;
  readonly authorName: Locator;
  readonly feedbackWidget: Locator;
  readonly helpfulButton: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { level: 1 });
    this.authorName = page.getByTestId("author-name");
    this.feedbackWidget = page.getByTestId("feedback-widget");
    this.helpfulButton = page.getByRole("button", { name: "Yes, this was helpful" });
  }

  async goto(slug: string) {
    await this.page.goto(\`/help/billing/\${slug}\`);
  }

  async title() {
    return this.heading.textContent();
  }
}

// e2e/help-article.spec.ts
import { test, expect } from "@playwright/test";
import { HelpArticlePage } from "./pages/help-article.page";

test.describe("Help Center article page", () => {
  test("displays article title and matches document title", async ({ page }) => {
    const articlePage = new HelpArticlePage(page);
    await articlePage.goto("update-billing");

    const heading = await articlePage.title();
    expect(heading).toBe("How to update your billing information");

    // Page title must match the article title for SEO
    await expect(page).toHaveTitle(/How to update your billing information/);
  });

  test("feedback widget submits successfully", async ({ page }) => {
    const articlePage = new HelpArticlePage(page);
    await articlePage.goto("update-billing");

    await expect(articlePage.feedbackWidget).toBeVisible();
    await articlePage.helpfulButton.click();

    // After submission, show a thank-you message
    await expect(page.getByText("Thank you for your feedback")).toBeVisible();
  });

  test("navigating to non-existent article shows 404", async ({ page }) => {
    await page.goto("/help/billing/this-article-does-not-exist");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
    expect(page.url()).toContain("/not-found");
  });
});`}</code>
      </pre>

      <h3 id="accessibility-testing">Accessibility Testing with axe-core</h3>

      <pre>
        <code>{`// Jest unit test with jest-axe
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("ArticlePage has no accessibility violations", async () => {
  const { container } = render(
    <ArticlePage article={mockArticle} />
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Playwright E2E test with @axe-core/playwright
// pnpm add -D @axe-core/playwright
import { checkA11y, injectAxe } from "axe-playwright";

test("article page passes axe accessibility scan", async ({ page }) => {
  await page.goto("/help/billing/update-billing");

  // Inject axe-core into the page
  await injectAxe(page);

  // Check accessibility — fails test if violations found
  await checkA11y(page, undefined, {
    axeOptions: {
      runOnly: ["wcag2a", "wcag2aa"], // WCAG 2.1 AA — Indeed's expected standard
    },
    includedImpacts: ["critical", "serious"], // only fail on critical/serious violations
  });
});

// Run axe scan on every page in CI — add to a separate accessibility spec
const pagesToScan = [
  "/help",
  "/help/billing",
  "/help/billing/update-billing",
  "/help/search?q=invoice",
];

for (const path of pagesToScan) {
  test(\`\${path} passes WCAG 2.1 AA scan\`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page);
  });
}`}</code>
      </pre>

      <h2 id="ci-integration">CI Integration with GitLab</h2>

      <pre>
        <code>{`# .gitlab-ci.yml — testing stages for a Next.js app

stages:
  - install
  - lint
  - test
  - e2e
  - build

install:
  stage: install
  image: node:22-alpine
  script:
    - npm install -g pnpm
    - pnpm install --frozen-lockfile
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/
      - .pnpm-store/

lint:
  stage: lint
  needs: [install]
  script:
    - pnpm lint
    - pnpm tsc --noEmit
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths: [node_modules/]
    policy: pull

unit-tests:
  stage: test
  needs: [install]
  script:
    - pnpm test --ci --coverage
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths: [node_modules/]
    policy: pull

playwright-e2e:
  stage: e2e
  needs: [unit-tests]
  image: mcr.microsoft.com/playwright:v1.48.0-jammy
  # Shard across 3 parallel runners for faster CI
  parallel:
    matrix:
      - SHARD_INDEX: [1, 2, 3]
  script:
    - pnpm build
    - pnpm playwright test --shard=$SHARD_INDEX/3
  artifacts:
    when: on_failure
    paths: [playwright-report/]`}</code>
      </pre>

      <h2 id="what-to-test">What to Test at Each Level</h2>

      <ArticleTable caption="Testing at the wrong level wastes time — unit test what units control, E2E test what users experience." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>What to Test</th>
              <th>What It Catches</th>
              <th>What It Misses</th>
              <th>Maintenance Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Unit (Jest)</strong></td>
              <td>Rich text renderer nodes, registry lookup, Zod validation rules, date formatting</td>
              <td>Logic errors in individual functions</td>
              <td>Component integration, routing, real browser behavior</td>
              <td>Low — tests are isolated, break only when the tested logic changes</td>
            </tr>
            <tr>
              <td><strong>Integration (Jest + RTL)</strong></td>
              <td>Page renders with mocked CMS data, form submission flows, navigation between components</td>
              <td>Component wiring errors, prop mismatches, missing error states</td>
              <td>CSS rendering, real network, cross-browser behavior</td>
              <td>Medium — must update mocks when API contracts change</td>
            </tr>
            <tr>
              <td><strong>E2E (Playwright)</strong></td>
              <td>Critical user journeys: read article, search, submit feedback, navigate categories</td>
              <td>Full-stack integration failures, hydration issues, real rendering bugs</td>
              <td>Edge case data shapes (covered by unit tests)</td>
              <td>High — brittle to UI changes, slow to run</td>
            </tr>
            <tr>
              <td><strong>Accessibility (jest-axe + Playwright axe)</strong></td>
              <td>WCAG violations on rendered components and full pages</td>
              <td>Missing labels, color contrast, missing alt text, heading hierarchy</td>
              <td>Cognitive accessibility, UX quality</td>
              <td>Low — axe violations are clear and actionable</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you test a Next.js page that fetches from a headless CMS?'"
        intro="This question tests your understanding of the server/client boundary, external dependency mocking, and where different testing levels add value."
        steps={[
          "Start with the mocking strategy: the CMS is an external dependency. I never hit the real Contentstack API in tests — that would make tests slow, flaky, and require real credentials in CI. Instead, I mock at the boundary where my code calls the CMS: jest.mock('@/lib/contentstack') for the SDK layer.",
          "Describe the three test levels: unit tests verify the rendering logic with fixture data — can the rich text renderer handle headings, lists, embedded entries, and missing optional fields? Integration tests verify the full page component renders correctly with mocked CMS data, shows loading state, and handles the null (not found) case. E2E tests verify the complete user journey against a running Next.js server.",
          "Explain Apollo-specific mocking: MockedProvider from @apollo/client/testing wraps client components in tests. Mocks must match the query and variables exactly. I test both success and error states.",
          "Address next/navigation: hooks like useRouter, usePathname, and useSearchParams require jest.mock('next/navigation'). Without this, tests using these hooks throw errors because the navigation context isn't available in test environments.",
          "Close with accessibility: jest-axe runs axe-core on rendered components and fails the test if WCAG violations are found. Combined with Playwright's @axe-core/playwright for full-page scans in CI, this gives continuous accessibility regression protection without manual audits.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Write the Test Suite for a Help Center Article Page"
        scenario={
          <span>
            You have a <code>HelpArticlePage</code> component that: fetches article data using a
            <code>getArticle(slug)</code> function from <code>@/lib/contentstack</code>, renders
            the article title as an <code>&lt;h1&gt;</code>, renders the author name and avatar,
            renders the rich text body, calls Next.js <code>notFound()</code> when
            <code>getArticle</code> returns null, and has a client-side feedback widget that uses
            Apollo <code>useMutation</code> to submit a thumbs up/down rating.
          </span>
        }
        tasks={[
          "Write a Jest test that mocks getArticle to return a fixture article object and asserts the title renders in an h1 and the author name is visible in the document",
          "Write a Jest test that mocks getArticle to return null and verifies that notFound() was called (use jest.mock('next/navigation'))",
          "Write a Jest test for the feedback widget using MockedProvider: clicking 'Helpful' triggers the mutation and shows a success message",
          "Write a Playwright E2E test that navigates to a real article URL, asserts the page title matches the document <title>, and runs an axe accessibility scan on the page",
          "Describe what you would NOT test with unit/integration tests and why — what belongs in E2E only?",
        ]}
        pitfalls={[
          "Testing against the real Contentstack API — introduces network flakiness and requires real credentials in CI",
          "Not testing the null case (notFound) — this is one of the most common production bugs in CMS apps",
          "Using screen.getByText for the article heading instead of screen.getByRole('heading', { level: 1 }) — the role-based query is more aligned with how accessibility tools and users experience the page",
          "Forgetting to await async operations — RTL's findBy* queries wait for elements to appear; getBy* queries fail if the element is not immediately present",
        ]}
        signal="A strong answer correctly mocks at the module boundary (not the fetch level), uses findBy* for async renders, tests both success and not-found states, and explains that Playwright E2E tests belong to critical user journeys — not every component state."
      />
    </div>
  );
}
