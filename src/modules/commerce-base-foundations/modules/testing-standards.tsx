import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const layersDiagram = String.raw`flowchart TD
  UNIT["Jest + RTL (unit)<br/>1,318 co-located *.test.tsx<br/>100% coverage enforced"]
  MSW["MSW (network mocking)<br/>node server for Jest,<br/>browser worker for dev/Playwright"]
  E2E["Playwright (E2E)<br/>driven from brand apps"]
  VRT["Storybook + Sauce Labs<br/>visual regression"]
  UNIT --> MSW
  E2E --> MSW`;

const renderDiagram = String.raw`flowchart LR
  TEST["renderWithProviders(ui, options)"]
  TEST --> WRAP["generateProviderWrapper()"]
  WRAP --> Q["QueryProvider (fresh QueryClient)"]
  WRAP --> J["Jotai Provider<br/>~30 pre-seeded atoms"]
  J --> CFG["sparrowConfig, region, dictionary,<br/>featureFlags, SDK config..."]`;

const mswDiagram = String.raw`sequenceDiagram
  participant Test as test
  participant Server as MSW setupServer
  participant Handler as feature handler
  Note over Server: beforeAll: server.listen({ onUnhandledRequest })
  Test->>Server: component fires a request
  Server->>Handler: match URL (wildcards *)
  Handler-->>Test: HttpResponse.json(fixture)
  Note over Server: afterEach: server.resetHandlers()
  Note over Server: unhandled request → test FAILS`;

const coverageDiagram = String.raw`flowchart TD
  RUN["PRODUCT=disneyPlus jest --coverage"]
  RUN --> SHARD{"--shard flag?"}
  SHARD -->|"yes"| NOTHRESH["threshold disabled (CI shards)"]
  SHARD -->|"no"| THRESH["global 100%: branches, functions, lines, statements"]
  THRESH --> EXCL["excludes: __browser-mocks__, __fixtures__,<br/>models, *.stories, test/, storybook/"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "layers", title: "The Four Testing Layers", level: 2 },
  { id: "render", title: "renderWithProviders — Never Bare render", level: 2 },
  { id: "structure", title: "The Standard Test Structure", level: 2 },
  { id: "product", title: "PRODUCT=disneyPlus and Tenant Defaults", level: 3 },
  { id: "msw", title: "MSW: Network Mocking That Fails Loudly", level: 2 },
  { id: "handlers", title: "Handler and Fixture Conventions", level: 3 },
  { id: "loading-gate", title: "Testing Loading States", level: 3 },
  { id: "coverage", title: "100% Coverage Enforcement", level: 2 },
  { id: "gotchas", title: "Test Gotchas Baked Into the Config", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Test a Gated Query Component", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TestingStandards() {
  return (
    <div className="article-content">
      <p>
        commerce-base enforces <strong>100% unit-test coverage</strong> across ~1,318 co-located test
        files. That constraint shapes how everything is written — you cannot merge code you
        can&apos;t fully exercise. This module teaches the testing system: the custom render wrapper
        that every test uses, the MSW network-mocking layer that fails loudly on unmocked requests,
        the coverage config, and the gotchas the setup deliberately bakes in. Get fluent here and
        writing tests stops being the slow part of a ticket.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Because coverage is enforced at 100%, <em>every</em> branch you add needs a test — including
        the region branches, experiment treatments, and error paths from earlier modules. Knowing the
        shared helpers (custom render, provider wrapper, MSW handlers, mock session/dictionary) is the
        difference between a test that takes five minutes and one that takes an afternoon.
      </p>

      <h2 id="layers">The Four Testing Layers</h2>
      <MermaidDiagram
        chart={layersDiagram}
        title="The testing stack"
        caption="Jest + RTL for units (100% coverage), MSW for network mocking (shared by Jest and the browser worker), Playwright for E2E (run from the brand apps), Storybook + Sauce Labs for visual regression."
        minHeight={360}
      />
      <ArticleTable
        caption="The four layers and where they live."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Tool</th>
              <th>Runs where</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unit / component</td>
              <td>Jest + React Testing Library</td>
              <td>In commerce-base (<code>*.test.tsx</code> co-located)</td>
            </tr>
            <tr>
              <td>Network mocking</td>
              <td>MSW</td>
              <td>Node server (Jest) + browser worker (dev/Playwright/Storybook)</td>
            </tr>
            <tr>
              <td>End-to-end</td>
              <td>Playwright</td>
              <td>Driven from the brand apps (<code>PRODUCT=hulu playwright test</code>)</td>
            </tr>
            <tr>
              <td>Visual regression</td>
              <td>Storybook + Sauce Labs</td>
              <td>Tagged stories via the Storybook test-runner</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note: there&apos;s no Playwright config <em>inside</em> commerce-base — E2E is driven from the
        brand apps, while commerce-base ships the shared <code>src/test/playwright-utils/</code>{" "}
        helpers those apps consume.
      </p>

      <h2 id="render">renderWithProviders — Never Bare render</h2>
      <p>
        Because every component reads atoms and query state, tests never call RTL&apos;s bare{" "}
        <code>render</code>. They use <code>renderWithProviders</code> (
        <code>src/test/testing-library.tsx</code>), which wraps the UI in the full provider stack:
      </p>
      <CodeBlock
        lang="tsx"
        filename="src/test/testing-library.tsx"
        code={`export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'queries'>,
): RenderResult {
  return render(ui, { wrapper: generateProviderWrapper(), ...options });
}`}
      />
      <MermaidDiagram
        chart={renderDiagram}
        title="What the provider wrapper seeds"
        caption="generateProviderWrapper composes QueryProvider (a FRESH QueryClient) + Jotai with ~30 pre-seeded atoms (config, region, dictionary, flags, SDK). Tests tweak these via the InitialValues argument."
        minHeight={320}
      />
      <p>
        <code>generateProviderWrapper(initialValues, enableDataInterface, optionalJotaiAtoms)</code>{" "}
        is the heart of the system — it pre-seeds ~30 atoms so components render as they would in the
        app. Tests pass an <code>InitialValues</code> object to override specifics:{" "}
        <code>sparrowConfig</code>, <code>featureFlags</code>, <code>dictionary</code>,{" "}
        <code>region</code>, <code>locale</code>, <code>paymentFormType</code>, and more. For
        components that hit the data interface, use{" "}
        <code>generateDataInterfaceProviderWrapper()</code> or the async{" "}
        <code>renderWithDataInterfaceAsync</code>, which awaits a &quot;Data Interface Hydrated&quot;
        sentinel before returning (the SDK must init before hydration).
      </p>

      <h2 id="structure">The Standard Test Structure</h2>
      <p>
        Tests mock hooks/modules at the top level with <code>jest.mock(...)</code>, then use a{" "}
        <code>describe</code>/<code>beforeEach</code> tree that wires mock return values. From{" "}
        <code>payments-container.test.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="payments-container.test.tsx"
        code={`jest.mock('./../../../../common/hooks/use-session-info');
jest.mock('./../../../../common/hooks/use-mystique-feature-flags');
jest.mock('./../../../../signup/opt-in', () => ({
  OptIn: ({ currentOfferId }: { currentOfferId?: string }) => (
    <div data-testid="opt-in" data-offer-id={currentOfferId}>opt-in-mock</div>
  ),
}));

describe('payments-container @tap', () => {
  beforeEach(() => {
    jest.mocked(useSessionInfo).mockImplementation(mockUseSessionInfo());
    jest.mocked(useMystiqueFeatureFlags).mockReturnValue(createFeatureFlagsMock({}));
  });
  // it(...) cases
});`}
      />
      <p>
        Two conventions to note: the <code>@tap</code> suffix in the describe title is a{" "}
        <strong>team-ownership tag</strong> (an ESLint rule, <code>require-owner-tag</code>, expects
        it), used by the Datadog test reporter. And factories like{" "}
        <code>mockUseSessionInfo()</code> (<code>payments/payment-forms/test/</code>) return a{" "}
        <code>jest.fn()</code> implementation you can drop into <code>mockImplementation</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="mock-use-session-info.ts"
        code={`export const mockUseSessionInfo = (partner = 'disney') =>
  jest.fn().mockImplementation(() => ({
    data: { account: { id: '123-456' }, isSubscriber: true, partnerName: partner },
    isSuccess: true,
    isLoading: false,
  }));`}
      />
      <p>
        The dictionary is globally mocked in setup (<code>jest.mock-dictionary.ts</code>) so{" "}
        <code>useDictionary</code> returns <code>{"`${dictionary}:${key}`"}</code> — that&apos;s why
        assertions look for strings like{" "}
        <code>&apos;unified-commerce-onboarding:mandatory_check_box_1_korea&apos;</code> rather than
        real copy.
      </p>

      <h3 id="product">PRODUCT=disneyPlus and Tenant Defaults</h3>
      <p>
        The coverage script runs <code>PRODUCT=disneyPlus jest --coverage</code>. The{" "}
        <code>PRODUCT</code> env var flows through{" "}
        <code>common/lib/get-product-name-for-mocks.ts</code> and selects which tenant&apos;s config /
        dictionary fixtures MSW serves. The platform is tenant-agnostic, but tests{" "}
        <strong>default to the Disney+ tenant</strong> (the MSW server is seeded with{" "}
        <code>{"getSparrowMergedConfigHandler({ productName: 'disneyPlus' })"}</code>).
      </p>

      <h2 id="msw">MSW: Network Mocking That Fails Loudly</h2>
      <p>
        A single MSW <code>setupServer(...)</code> (<code>src/test/setup/jest.setup-msw.ts</code>)
        composes handler arrays from ~20 feature <code>__browser-mocks__/</code> dirs plus SDK/session
        handlers, and — importantly — <strong>fails any test that makes an unmocked request</strong>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="jest.setup-msw.ts"
        code={`const server = setupServer(
  getSparrowMergedConfigHandler({ productName: 'disneyPlus' }),
  ...sdkSessionHttpHandlers, ...dictionaryHandlers, ...paymentsHandlers, /* ... */
);

beforeAll(() => { server.listen({ onUnhandledRequest }); });
beforeEach(() => { mockIsLoggedInTrue(); });
afterEach(() => { server.resetHandlers(); });  // per-test isolation
afterAll(() => server.close());

export { server };`}
      />
      <MermaidDiagram
        chart={mswDiagram}
        title="MSW request lifecycle in a test"
        caption="Handlers match by URL (with wildcards for cross-brand hosts). resetHandlers() after each test isolates overrides. An unhandled request triggers onUnhandledRequest, which fails the test — no silent real network calls."
        minHeight={360}
      />
      <p>
        Tests override per-case with <code>server.use(handler)</code>. The{" "}
        <code>onUnhandledRequest</code> hook (combined with <code>jest.fail-on-console.ts</code>)
        turns any unmocked request into a failure — so &quot;my test hit the real network&quot; is
        impossible.
      </p>

      <h3 id="handlers">Handler and Fixture Conventions</h3>
      <p>
        Handlers are plain <code>http.get/put/post(url, resolver)</code> returning{" "}
        <code>HttpResponse.json(...)</code>, with URL wildcards so both Disney and Hulu hosts match (
        <code>payments/payment-forms/__browser-mocks__/apm.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="apm.ts"
        code={`export const createBraintreeTokenHandler = http.put(
  '*/execution/v1/payments/paypal/client-token',
  () => HttpResponse.json({
    data: { success: true, successData: { clientToken: 'mockedBraintreeClientToken' }, metricsData: {} },
  }),
);`}
      />
      <p>
        Fixtures (<code>__fixtures__/</code>) hold static response bodies; browser-mocks (
        <code>__browser-mocks__/</code>) hold the handlers that serve them. Both are{" "}
        <strong>excluded from coverage</strong>. A fixture is typed for safety, e.g.{" "}
        <code>common/hooks/__fixtures__/hulu/session-info.json</code> wrapped as{" "}
        <code>export const sessionInfoFixture = sessionInfoJSON as SessionInfo</code>.
      </p>

      <h3 id="loading-gate">Testing Loading States</h3>
      <p>
        Under RTL v14, <code>render()</code> is wrapped in <code>act()</code>, which flushes MSW
        responses during render — so you can&apos;t observe a loading state normally. The{" "}
        <code>src/test/msw.ts</code> helper <code>withLoadingGate(handler)</code> wraps a handler so
        the request stays <em>pending</em> until you call <code>release()</code>, letting you assert
        the loading UI, then resolve and assert the success UI.
      </p>

      <h2 id="coverage">100% Coverage Enforcement</h2>
      <p>
        <code>jest.config.js</code> (using <code>next/jest</code>) enforces 100% on all four metrics,
        disabled only when sharding in CI:
      </p>
      <CodeBlock
        lang="javascript"
        filename="jest.config.js"
        code={`const isSharded = process.argv.some((arg) => arg.startsWith('--shard'));

coverageThreshold: isSharded
  ? undefined
  : {
      global: { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
coverageDirectory: 'coverage/jest',`}
      />
      <MermaidDiagram
        chart={coverageDiagram}
        title="Coverage enforcement"
        caption="100% on branches/functions/lines/statements for local/non-sharded runs; disabled when CI shards. Test scaffolding (mocks, fixtures, models, stories, test/) is excluded from collection."
        minHeight={360}
      />
      <p>
        <code>collectCoverageFrom</code> includes <code>src/**</code> but excludes{" "}
        <code>__browser-mocks__</code>, <code>__fixtures__</code>, <code>models/**</code>, all{" "}
        <code>*.{"{test,stories}"}.*</code>, <code>test/**</code>, and <code>storybook/**</code> — so
        scaffolding never counts. The practical rule: every real branch needs a test, and an
        uncovered line fails the build.
      </p>

      <h2 id="gotchas">Test Gotchas Baked Into the Config</h2>
      <ArticleTable
        caption="Conventions enforced by setup/config/lint."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Where</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Never import the singleton <code>queryClient</code> in tests</td>
              <td>ESLint rule</td>
              <td>Prevents cross-suite cache pollution — use <code>createQueryClient()</code></td>
            </tr>
            <tr>
              <td>Every describe carries a team tag (<code>@tap</code>, etc.)</td>
              <td><code>require-owner-tag</code></td>
              <td>Datadog test reporter routing</td>
            </tr>
            <tr>
              <td>Unmocked request fails the test</td>
              <td><code>onUnhandledRequest</code></td>
              <td>No accidental real network calls</td>
            </tr>
            <tr>
              <td>Unexpected console output fails the test</td>
              <td><code>jest.fail-on-console.ts</code></td>
              <td>Catches warnings/errors (curated allow-list)</td>
            </tr>
            <tr>
              <td>Fixed timezone <code>America/Los_Angeles</code></td>
              <td><code>jest.global-setup.ts</code></td>
              <td>Deterministic date output</td>
            </tr>
            <tr>
              <td>Single React version</td>
              <td><code>src/__mocks__/react.js</code></td>
              <td>Avoids &quot;Invalid hook call&quot; from duplicate React in pnpm</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How is commerce-base tested?'"
        intro="Lead with the coverage constraint, then the render wrapper, then MSW's fail-loud behavior."
        steps={[
          "Four layers: Jest + RTL units (100% coverage, ~1,318 co-located tests), MSW network mocking, Playwright E2E (from the brand apps), Storybook + Sauce Labs VRT.",
          "Never bare render — renderWithProviders wraps a fresh QueryClient + Jotai with ~30 pre-seeded atoms; tests override via an InitialValues object; data-interface tests use the async hydrated wrapper.",
          "Tests jest.mock hooks at top level, wire returns in beforeEach, tag the describe with the owning team; the dictionary mock returns `${dictionary}:${key}` so assertions match keys.",
          "MSW composes ~20 feature handler arrays into one setupServer; resetHandlers() isolates per test; an unhandled request FAILS the test (onUnhandledRequest). withLoadingGate lets you observe loading states.",
          "Coverage is 100% on all four metrics (disabled only when CI shards); scaffolding is excluded. Gotchas: no singleton queryClient in tests, fail-on-console, fixed TZ, single React mock.",
        ]}
      />

      <h2 id="challenge">Challenge: Test a Gated Query Component</h2>
      <InterviewChallenge
        title="Fully cover a component whose query is gated on login and region"
        scenario={
          <>
            You&apos;ve written a component that renders subscription data from a{" "}
            <code>useQuery</code> gated on <code>enabled: isLoggedIn</code>, shows a loading skeleton
            while pending, an error fallback on failure, and branches its content for{" "}
            <code>region === &apos;DE&apos;</code>. You need 100% coverage. Describe your test plan.
          </>
        }
        tasks={[
          "Enumerate the branches you must exercise to hit 100% (loading, success, error, region DE vs non-DE, logged-in vs not).",
          "Explain how you'd seed region and login state through the provider wrapper / mocks.",
          "Describe how you'd assert the loading state given RTL flushes MSW during render.",
          "Explain how you'd force the error path without hitting a real network.",
        ]}
        pitfalls={[
          "Forgetting the not-logged-in branch where the query never runs (enabled false).",
          "Trying to catch the loading state without withLoadingGate.",
          "Letting an unmocked request slip through and fail the whole suite.",
        ]}
        signal="A strong answer lists every branch (loading via withLoadingGate, success + error via server.use handlers, region DE/non-DE via InitialValues region, logged-in/not via the useIsLoggedIn mock), seeds state through generateProviderWrapper/mocks, and never lets a request go unmocked."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Enumerate the branches:</strong> (a) logged-out → query disabled, renders the
          empty/gated state; (b) logged-in + pending → loading skeleton; (c) success → content, split
          into (c1) <code>region === &apos;DE&apos;</code> and (c2) non-DE; (d) error → fallback. That&apos;s
          roughly five tests.
        </p>
        <p>
          <strong>Seed state:</strong> control login via the <code>useIsLoggedIn</code> mock (or the
          MSW <code>mockIsLoggedInTrue/False</code>), and region via{" "}
          <code>{"generateProviderWrapper({ region: 'DE' })"}</code> vs a non-DE region in{" "}
          <code>renderWithProviders</code>&apos;s wrapper. <strong>Loading:</strong> wrap the endpoint
          with <code>withLoadingGate</code>, assert the skeleton, then <code>release()</code> and
          assert content — otherwise RTL&apos;s <code>act()</code> flushes the response before you can
          see it. <strong>Error:</strong> use <code>server.use(...)</code> with a handler returning an
          error status; the query&apos;s error path renders the fallback. Every case goes through MSW,
          so no request is ever unmocked and the suite stays green at 100%.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>100% coverage is enforced.</strong> Every branch needs a test; an uncovered line
          fails the build (threshold off only when CI shards).
        </li>
        <li>
          <strong>Always <code>renderWithProviders</code>.</strong> It seeds a fresh QueryClient +
          ~30 Jotai atoms; override via <code>InitialValues</code>.
        </li>
        <li>
          <strong>MSW fails loudly.</strong> One <code>setupServer</code>, per-test{" "}
          <code>resetHandlers</code>, unmocked requests fail; <code>withLoadingGate</code> for loading
          states.
        </li>
        <li>
          <strong>Conventions matter.</strong> Team-tag the describe, mock the dictionary as{" "}
          <code>{"`${dictionary}:${key}`"}</code>, use factories like <code>mockUseSessionInfo</code>.
        </li>
        <li>
          <strong>Config-level gotchas.</strong> No singleton <code>queryClient</code> in tests,
          fail-on-console, fixed TZ, single React version.
        </li>
      </ul>
    </div>
  );
}
