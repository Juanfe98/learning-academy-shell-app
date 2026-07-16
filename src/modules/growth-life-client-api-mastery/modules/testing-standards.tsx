import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const mockBoundaryDiagram = String.raw`flowchart LR
  TEST["Test"]
  TEST -->|mocks| CLIENT["GLO client method<br/>retrieveOffersV2()"]
  CLIENT --> WRAP["getOffers()<br/>(runs REAL conversion)"]
  WRAP --> SVC["buildXScreen()<br/>(runs REAL)"]
  SVC --> ASSERT["behavioral assertions<br/>on the output"]
  style CLIENT fill:#7c2d12,color:#fff
  style WRAP fill:#113ccf,color:#fff`;

const threeTierDiagram = String.raw`flowchart TD
  NEW["New test case"]
  NEW --> Q{"existing test file?"}
  Q -->|legacy .legacy.test.ts| RENAME["Add to sibling .test.ts<br/>NEVER the legacy file"]
  Q -->|standardized .test.ts| ADD["Add with setupMocks + factories"]
  Q -->|none| CREATE["Create .test.ts<br/>setupMocks + MockOverrides"]`;

export const toc: TocItem[] = [
  { id: "mandatory", title: "Read TESTING.md First", level: 2 },
  { id: "integration", title: "Screen Tests Are Integration Tests", level: 2 },
  { id: "mock-what", title: "What to Mock: The Golden Rule", level: 2 },
  { id: "setupmocks", title: "setupMocks() + MockOverrides", level: 2 },
  { id: "factories", title: "Factory Functions, Not Fixtures", level: 2 },
  { id: "behavioral", title: "Behavioral Assertions, Not Snapshots", level: 2 },
  { id: "matrix", title: "The Behavior Matrix", level: 3 },
  { id: "legacy", title: "The Legacy Test Policy", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Write a Correct Test", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TestingStandards() {
  return (
    <div className="article-content">
      <p>
        This repo has strict, opinionated testing standards, and they are enforced — by reviewers, by
        CI checks, and by a whole document (<code>TESTING.md</code>) that is <strong>mandatory
        reading before you touch any test</strong>. The standards aren&apos;t arbitrary: each one
        exists to keep tests catching real bugs instead of locking in whatever the code happened to
        output. This module distills the rules that matter most — what to mock, how to set up mocks,
        factories over fixtures, behavioral assertions over snapshots, and the legacy-file policy.
      </p>

      <h2 id="mandatory">Read TESTING.md First</h2>
      <p>
        <code>CLAUDE.md</code> is blunt: read <code>TESTING.md</code> before writing or modifying{" "}
        <em>any</em> test code, and after finishing, audit your new/modified lines against its Common
        Pitfalls. The gold-standard reference named by the current <code>TESTING.md</code> is{" "}
        <code>src/domain/screen/subscription/success/signupSuccess.test.ts</code>. Everything below is
        the essence — the document itself is the source of truth.
      </p>

      <h2 id="integration">Screen Tests Are Integration Tests</h2>
      <p>
        A test for <code>buildXYZScreen()</code> <em>looks</em> like a unit test — one function, one
        call — but each screen builder orchestrates multiple backend calls, feature flags, template
        rendering, and conversions. So it needs 6+ mocked modules. <strong>That&apos;s normal, not a
        smell.</strong> The <code>setupMocks()</code> pattern exists precisely because this level of
        mocking is expected.
      </p>

      <h2 id="mock-what">What to Mock: The Golden Rule</h2>
      <p>
        The most-repeated rule in the whole codebase: <strong>mock the GLO client method, not the
        conversion wrapper.</strong> Mock <code>GrowthLifeOrchestratorClient.retrieveOffersV2()</code>{" "}
        and <code>.agreementDetails()</code> — let <code>getOffers()</code> and{" "}
        <code>getAgreementDetails()</code> run for real.
      </p>
      <MermaidDiagram
        chart={mockBoundaryDiagram}
        title="Mock at the client edge, assert on real output"
        caption="Mocking the client (red) lets the real conversion (blue) and the real service run — so the test exercises the code most likely to have bugs."
        minHeight={320}
      />
      <p>
        You met the <em>why</em> in module 3: mocking the wrapper skips the conversion layer, the part
        most likely to break. <code>TESTING.md</code> has a full &quot;What to Mock&quot; decision
        guide — feature flags (<code>getEnable*</code>) are mocked; the GLO client is mocked;
        conversion wrappers are <em>not</em>.
      </p>

      <h2 id="setupmocks">setupMocks() + MockOverrides</h2>
      <p>
        Every standardized test file has a <code>setupMocks()</code> function that configures{" "}
        <strong>all</strong> mocks, taking a typed <code>MockOverrides</code> object so each test
        passes only what it cares about. This replaces module-level mock mutation and kills
        test-ordering bugs.
      </p>
      <CodeBlock
        lang="typescript"
        filename="the setupMocks pattern"
        code={`interface MockOverrides {
  offers?: GLORetrieveOffersResponse;
  agreementDetails?: GLOAgreementDetailsResponse;
  enableSomeFlag?: boolean;
  // ...one per dependency
}

// Comment block above setupMocks: what each mock serves and why.
function setupMocks(overrides: MockOverrides = {}) {
  jest.mocked(GrowthLifeOrchestratorClient.retrieveOffersV2)
    .mockResolvedValue(overrides.offers ?? buildRetrieveOffersResponse());
  jest.mocked(getEnableSomeFlag)
    .mockResolvedValue(overrides.enableSomeFlag ?? false);
  // ...
}

// In a test — pass ONLY the override that matters:
setupMocks({ offers: buildRetrieveOffersResponse({ eligibleOffers: [] }) });`}
      />
      <p>
        Design rules: call <code>jest.clearAllMocks()</code> in <code>beforeEach</code> and{" "}
        <code>jest.restoreAllMocks()</code> in <code>afterEach</code> (skip both for pure-function
        files), and use one mock strategy per mock — prefer{" "}
        <code>setupMocks()</code> with <code>.mockResolvedValue()</code>.
      </p>

      <h2 id="factories">Factory Functions, Not Fixtures</h2>
      <p>
        New tests build inputs with <strong>factory functions</strong>, not imported fixture files.
        Factories (<code>buildRetrieveOffersResponse()</code>, <code>buildFlexAgreementDetails()</code>,{" "}
        <code>buildEligibleOffer()</code>, <code>buildSubscription()</code>, …) produce valid default
        objects you override with a partial. A CI <strong>Fixture Check</strong> blocks new files in{" "}
        <code>src/__fixtures__/</code> (except <code>templates/</code>) to keep this honest.
      </p>
      <ArticleTable
        caption="Factories replace fixtures — and traits/date helpers keep them realistic."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Category</th><th>Examples</th></tr>
          </thead>
          <tbody>
            <tr><td>GLO backend factories</td><td><code>buildRetrieveOffersResponse()</code>, <code>buildAgreementDetailsResponse()</code>, <code>buildEligibleOffer()</code></td></tr>
            <tr><td>Flex request factories</td><td><code>buildFlexAgreementDetails()</code>, <code>buildFlexOffer()</code>, <code>buildFlexSubscription()</code></td></tr>
            <tr><td>Traits</td><td><code>promoOfferTrait</code>, <code>disneyPremiumTrait</code>, <code>klarnaPaymentConfigTrait</code></td></tr>
            <tr><td>Dates</td><td><code>futureDateISO(days)</code> / <code>pastDateISO(days)</code> — never hardcode dates</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Two gotchas: <code>deepMerge</code> replaces arrays wholesale (it doesn&apos;t concatenate)
        and ignores <code>undefined</code>; and dates must use the helpers, never a hardcoded ISO
        string, so tests don&apos;t rot as time passes.
      </p>

      <h2 id="behavioral">Behavioral Assertions, Not Snapshots</h2>
      <p>
        Assert specific fields and behavior, not full-object equality. A snapshot passes as long as
        the output doesn&apos;t change — which means it happily locks in a bug and then guards it.
        Behavioral assertions state intent: &quot;the CTA label uses this Cypher key,&quot; &quot;when
        there are no eligible offers, the upsell section is absent,&quot; &quot;the second button&apos;s{" "}
        <code>elementIndex</code> is 1.&quot;
      </p>
      <CodeBlock
        lang="typescript"
        filename="behavioral vs snapshot"
        code={`// ✅ behavioral — states intent, survives unrelated changes
const content = result.data.content;
expect(content.cta.copy.text).toBe('cancel_keep_plan');
expect(content.upsell).toBeUndefined();

// ❌ snapshot — locks in whatever came out, bug and all
expect(result).toMatchSnapshot();`}
      />

      <h3 id="matrix">The Behavior Matrix</h3>
      <p>
        Standardized test files open with a <strong>behavior matrix</strong>: a comment block mapping
        conditions to expected screen effects. It doubles as documentation and a coverage checklist —
        every row should have a corresponding test, so gaps are visible at a glance.
      </p>

      <h2 id="legacy">The Legacy Test Policy</h2>
      <p>
        Old tests were renamed <code>*.legacy.test.ts</code>. The policy: <strong>never add to a
        legacy file</strong> — new tests always go in a standardized <code>.test.ts</code>, even for
        &quot;small&quot; changes, to stop old patterns spreading. This is the three-tier rule.
      </p>
      <MermaidDiagram
        chart={threeTierDiagram}
        title="Where a new test goes"
        caption="Never the .legacy.test.ts file. Add to (or create) a standardized .test.ts with setupMocks + factories."
        minHeight={300}
      />
      <p>
        A <strong>Legacy Test Check</strong> CI workflow warns (non-blocking) when a{" "}
        <code>.legacy.test.ts</code> is modified, and when a migrated <code>.test.ts</code> still has
        a legacy counterpart ready to delete. Full migrations follow a checklist (catalog cases →{" "}
        <code>setupMocks</code> → factories → behavioral assertions → verify parity → delete legacy in
        a follow-up PR). And per <code>CLAUDE.md</code>, migrate-on-touch: substantially modifying a
        service means migrating its test file to the standardized pattern.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What are the testing standards here?'"
        intro="Lead with the golden mocking rule, then setupMocks, factories, behavioral assertions, and the legacy policy."
        steps={[
          "Golden rule: mock the GLO client method (retrieveOffersV2/agreementDetails), never the getOffers/getAgreementDetails wrappers — so real conversion runs.",
          "Screen service tests are integration-style tests: 6+ mocks is normal; setupMocks() configures all of them with a typed MockOverrides so tests pass only what they care about.",
          "Use factory functions (buildRetrieveOffersResponse, buildFlexAgreementDetails) not fixtures; date helpers not hardcoded dates; deepMerge replaces arrays.",
          "Assert behaviorally on specific fields, never toMatchSnapshot; open files with a behavior matrix that doubles as a coverage checklist.",
          "Never add to .legacy.test.ts files; new tests go in standardized .test.ts; migrate-on-touch when substantially changing a service.",
        ]}
      />

      <h2 id="challenge">Challenge: Write a Correct Test</h2>
      <InterviewChallenge
        title="Test that an empty-offers cancel screen hides the save section"
        scenario={
          <>
            You need a test asserting that when GLO returns no eligible offers, the cancel
            screen&apos;s &quot;save&quot; upsell section is absent. A colleague&apos;s draft imports a
            saved fixture JSON, mocks <code>getOffers()</code> to return it, and asserts with{" "}
            <code>toMatchSnapshot()</code>. Rewrite it to standard and justify each change.
          </>
        }
        tasks={[
          "Replace the mock target correctly and explain why.",
          "Replace the fixture import with a factory call producing empty offers.",
          "Replace the snapshot with a behavioral assertion on the save section.",
          "Explain where this test file lives relative to any .legacy.test.ts and the setupMocks structure you'd use.",
        ]}
        pitfalls={[
          "Mocking getOffers() instead of GrowthLifeOrchestratorClient.retrieveOffersV2().",
          "Importing a fixture instead of buildRetrieveOffersResponse({ eligibleOffers: [] }).",
          "Using toMatchSnapshot, which would lock in whatever renders today.",
          "Adding the test to the .legacy.test.ts file.",
        ]}
        signal="A strong answer mocks the client with an empty-offers factory, asserts the save section is undefined, uses setupMocks in a standardized .test.ts, and avoids snapshots/fixtures/legacy files."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          lang="typescript"
          code={`// In cancelLandingService.test.ts (standardized, NOT the .legacy file)
it('hides the save section when there are no eligible offers', async () => {
  setupMocks({
    // Mock the CLIENT with an empty-offers factory; real conversion runs.
    offers: buildRetrieveOffersResponse({ eligibleOffers: [] }),
  });

  const result = await buildCancelLanding({ flexContext, params });

  // Behavioral assertion — states intent, not a frozen blob.
  expect(result.data.content.save).toBeUndefined();
});`}
        />
        <p>
          Mock <code>GrowthLifeOrchestratorClient.retrieveOffersV2</code> (via the{" "}
          <code>offers</code> override in <code>setupMocks</code>), not <code>getOffers()</code> — so
          the real conversion + partitioning logic runs, which is exactly the code that decides
          whether a save section exists. Build the input with{" "}
          <code>buildRetrieveOffersResponse({"{ eligibleOffers: [] }"})</code> instead of a fixture
          (the Fixture Check would block a new fixture anyway). Assert{" "}
          <code>result.data.content.save</code> is <code>undefined</code> rather than snapshotting the
          whole response — a snapshot would pass even if the save section wrongly rendered, defeating
          the point. And it goes in the standardized <code>cancelLandingService.test.ts</code>, never
          the <code>.legacy.test.ts</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Read <code>TESTING.md</code> before any test change</strong> — current gold standard:{" "}
          <code>signupSuccess.test.ts</code>.
        </li>
        <li>
          <strong>Golden rule: mock the GLO client method, not the wrapper</strong> — so real
          conversion runs.
        </li>
        <li>
          <strong>Screen service tests are integration-style tests</strong>; <code>setupMocks()</code> +{" "}
          <code>MockOverrides</code> configure all mocks, overriding only what matters.
        </li>
        <li>
          <strong>Factories over fixtures</strong> (<code>build*()</code>), date helpers over
          hardcoded dates; <code>deepMerge</code> replaces arrays wholesale.
        </li>
        <li>
          <strong>Behavioral assertions over snapshots</strong>; open with a behavior matrix as a
          coverage checklist.
        </li>
        <li>
          <strong>Never add to <code>.legacy.test.ts</code></strong>; new tests go in standardized{" "}
          files; migrate-on-touch. CI (Fixture Check, Legacy Test Check) enforces this.
        </li>
      </ul>
    </div>
  );
}
