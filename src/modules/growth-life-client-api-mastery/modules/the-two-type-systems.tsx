import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const conversionDiagram = String.raw`flowchart LR
  subgraph backend["Backend truth"]
    GLOAPI["GLO / Offers / IPSE<br/>APIs"]
    GLOT["Backend response types<br/>(GLO* and service-specific models)<br/>src/backends/.../models"]
  end

  subgraph wrappers["domain/common/ conversion wrappers"]
    W["getOffers()<br/>getAgreementDetails()<br/>convertToFlex*()"]
  end

  subgraph domain["Domain truth"]
    FLEXT["Flex* types<br/>src/domain/models"]
  end

  subgraph ui["Presentation"]
    ELEM["Element builders<br/>+ fillTemplate"]
  end

  GLOAPI --> GLOT
  GLOT --> W
  W --> FLEXT
  FLEXT --> ELEM

  style GLOT fill:#7c2d12,color:#fff
  style FLEXT fill:#113ccf,color:#fff`;

const antiCorruptionDiagram = String.raw`flowchart TD
  subgraph outside["Outside world (volatile)"]
    A["GLO schema v1"]
    B["GLO schema v2<br/>(field renamed)"]
  end

  ACL["Anti-corruption layer<br/>convertToFlexOffers()"]

  subgraph inside["Our domain (stable)"]
    F["FlexOffer<br/>(unchanged)"]
  end

  A --> ACL
  B --> ACL
  ACL --> F

  NOTE["Backend churn is absorbed here.<br/>Services above never see GLO types."]
  ACL -.-> NOTE`;

export const toc: TocItem[] = [
  { id: "problem", title: "The Problem Two Type Systems Solve", level: 2 },
  { id: "glo-vs-flex", title: "GLO Types vs Flex Types", level: 2 },
  { id: "where-they-live", title: "Where Each Type System Lives", level: 3 },
  { id: "conversion", title: "The Conversion Layer", level: 2 },
  { id: "getoffers", title: "A Real Wrapper: getOffers()", level: 2 },
  { id: "anti-corruption", title: "Why This Is an Anti-Corruption Layer", level: 2 },
  { id: "testing-implication", title: "The Testing Implication You Must Know", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Absorb a Backend Change", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheTwoTypeSystems() {
  return (
    <div className="article-content">
      <p>
        The first time you open a service in this repo you will see two families of types with
        confusingly similar names: <code>GLOOffer</code> and <code>FlexOffer</code>,{" "}
        <code>GLOAgreement</code> and <code>FlexAgreement</code>. This is not accidental duplication
        — it is a deliberate <strong>anti-corruption layer</strong>. Understanding why it exists, and
        exactly where the boundary is, is the difference between writing changes that survive backend
        churn and writing changes that break every time an upstream team renames a field.
      </p>

      <h2 id="problem">The Problem Two Type Systems Solve</h2>
      <p>
        This service depends on many backends — GLO (the Growth Life Orchestrator), the Offers
        Service, IPSE, and more — each owned by other teams, each free to evolve its schema. If your
        screen services consumed those backend shapes directly, then every upstream rename, every
        new optional field, every reshuffle would ripple straight into your UI-building code. The
        domain would be at the mercy of the network.
      </p>
      <p>
        The fix is a classic Domain-Driven Design move: define your <em>own</em> stable domain types
        (<code>Flex*</code>) and translate the backend&apos;s types (<code>GLO*</code>) into them at
        a single boundary. Above that boundary, the codebase speaks only Flex.
      </p>

      <h2 id="glo-vs-flex">GLO Types vs Flex Types</h2>
      <ArticleTable
        caption="The two type systems and what each represents."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th></th>
              <th><code>GLO*</code> types</th>
              <th><code>Flex*</code> types</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Represents</td>
              <td>Raw backend responses</td>
              <td>Our stable domain model</td>
            </tr>
            <tr>
              <td>Owned by</td>
              <td>Upstream backend teams</td>
              <td>The Flex team (us)</td>
            </tr>
            <tr>
              <td>Lives in</td>
              <td><code>src/backends/&lt;service&gt;/models/</code></td>
              <td><code>src/domain/models/</code></td>
            </tr>
            <tr>
              <td>Volatility</td>
              <td>Changes when the backend changes</td>
              <td>Changes only when the domain changes</td>
            </tr>
            <tr>
              <td>Used by</td>
              <td>Backend clients + conversion wrappers</td>
              <td>Services, element builders, metrics</td>
            </tr>
            <tr>
              <td>Example</td>
              <td><code>GLOOffer</code>, <code>GLOAgreement</code></td>
              <td><code>FlexOffer</code>, <code>FlexAgreement</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="where-they-live">Where Each Type System Lives</h3>
      <p>
        The directory layout enforces the boundary. GLO models sit under{" "}
        <code>src/backends/growthLifeOrchestrator/models/</code>; other integrations keep their own
        service-specific response models under <code>src/backends/&lt;service&gt;/</code>. Flex models
        sit under <code>src/domain/models/</code>. The conversion functions that bridge backend
        shapes to Flex shapes live under <code>src/domain/common/</code> — one subfolder per concern
        (<code>offers/</code>, <code>agreements/</code>, <code>payment/</code>,{" "}
        <code>invoices/</code>, and more).
      </p>

      <h2 id="conversion">The Conversion Layer</h2>
      <MermaidDiagram
        chart={conversionDiagram}
        title="Data flows one way: GLO → conversion → Flex → UI"
        caption="Backend response types (red) are contained at the client/conversion boundary. Screen services should consume Flex domain types (blue), not raw backend shapes."
        minHeight={420}
      />
      <p>
        The conversion functions are named by intent. <code>convertToFlexOffers()</code> takes GLO
        offers and returns <code>FlexOffer[]</code>. Higher-level <em>wrappers</em> like{" "}
        <code>getOffers()</code> and <code>getAgreementDetails()</code> combine a backend call{" "}
        <em>and</em> the conversion into one function, so a service simply asks for &quot;the Flex
        offers&quot; and never touches a GLO shape.
      </p>

      <h2 id="getoffers">A Real Wrapper: getOffers()</h2>
      <p>
        Here is the real <code>getOffers()</code> from{" "}
        <code>src/domain/common/offers/offerConversion.ts</code>. Read it as the canonical shape of a
        wrapper: <strong>call the GLO client, resolve any flags needed for conversion in parallel,
        convert, and return a Flex type.</strong>
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/domain/common/offers/offerConversion.ts"
        code={`export async function getOffers({
  standardHeaders,
  retrieveOffersRequest,
  flexContext,
}: {
  standardHeaders: StandardHeaders | Partial<StandardHeaders>;
  retrieveOffersRequest: RetrieveOffersRequest;
  flexContext?: FlexContext;
}): Promise<FlexOffers> {
  // 1. Call the real GLO client — returns GLO* types.
  const gloOffers = await GrowthLifeOrchestratorClient.retrieveOffersV2({
    standardHeaders,
    retrieveOffersRequest,
  });

  // 2. Resolve conversion-time flags in PARALLEL (never sequential awaits).
  const [
    enablePromoOfferLabelLogic,
    enablePluralization,
    presentationCadenceParsing,
    cadenceMode,
  ] = await Promise.all([
    getEnablePromoOfferLabelLogic(standardHeaders as StandardHeaders),
    getEnablePluralization(),
    getEnablePresentationCadenceParsing(flexContext),
    getPresentationCadenceMode(flexContext),
  ]);

  // 3. Convert GLO* → Flex*.
  const eligibleOffers = convertToFlexOffers(
    gloOffers,
    enablePromoOfferLabelLogic,
    enablePluralization,
    presentationCadenceParsing,
    cadenceMode
  );

  // 4. Return a Flex domain type — callers never see GLO.
  return {
    agreementEligibleForOffers: gloOffers.agreementEligibleForOffers ?? '',
    eligibleOffers,
    billingSource: convertToFlexOfferBillingSource(gloOffers.billingSource),
    nboOffers: convertToFlexNBOOffers(eligibleOffers, gloOffers.offerRecos),
    contentReco: convertToFlexContentReco(gloOffers.contentReco),
    evaluationId: gloOffers.evaluationId ?? undefined,
  };
}`}
      />
      <p>
        Three things this teaches you about the whole codebase: (1) wrappers hide the GLO client
        entirely; (2) independent async work uses <code>Promise.all</code>, never a chain of{" "}
        <code>await</code>s — a hard rule here; (3) the return type is a <code>Flex*</code> type
        assembled field-by-field, with defensive <code>?? ''</code> / <code>?? undefined</code>{" "}
        fallbacks because backend fields are frequently optional.
      </p>

      <h2 id="anti-corruption">Why This Is an Anti-Corruption Layer</h2>
      <MermaidDiagram
        chart={antiCorruptionDiagram}
        title="The conversion layer absorbs backend change"
        caption="When GLO renames a field, only the converter changes. FlexOffer — and every service built on it — stays put."
        minHeight={380}
      />
      <p>
        This is the payoff. When the GLO team ships a schema v2 that renames a field or restructures
        a nested object, the blast radius is <em>one converter function</em>. <code>FlexOffer</code>{" "}
        stays identical, so the cancel service, the signup service, the metrics builders — none of
        them change. The volatile outside world is quarantined at the boundary. This is why you
        should resist the temptation to &quot;just use the GLO type directly, it&apos;s simpler&quot;:
        it trades a five-minute shortcut for permanent coupling to another team&apos;s schema.
      </p>

      <h2 id="testing-implication">The Testing Implication You Must Know</h2>
      <p>
        This boundary dictates a testing rule that the repo enforces strictly, and it is one of the
        most common mistakes new engineers make. <strong>Mock the GLO client, not the conversion
        wrapper.</strong>
      </p>
      <ArticleTable
        caption="What to mock — the rule that keeps conversion logic actually tested."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th></th>
              <th>❌ Wrong</th>
              <th>✅ Right</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>What you mock</td>
              <td><code>getOffers()</code> / <code>getAgreementDetails()</code></td>
              <td><code>GrowthLifeOrchestratorClient.retrieveOffersV2()</code> / <code>.agreementDetails()</code></td>
            </tr>
            <tr>
              <td>Conversion code</td>
              <td>Skipped — never exercised</td>
              <td>Runs for real in the test</td>
            </tr>
            <tr>
              <td>What you catch</td>
              <td>Only what you hand-rolled</td>
              <td>Real conversion bugs, missing fields, bad fallbacks</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <CodeBlock
        lang="typescript"
        filename="the correct mock pattern"
        code={`// Mock the CLIENT (backend edge). getOffers() then runs real conversion code.
jest
  .mocked(GrowthLifeOrchestratorClient.retrieveOffersV2)
  .mockResolvedValue(buildRetrieveOffersResponse());

// Build the GLO-shaped input with factories, not raw fixtures.
// buildRetrieveOffersResponse() returns GLO* data; getOffers converts it.`}
      />
      <p>
        If you mock <code>getOffers()</code> directly, you hand the test a pre-made{" "}
        <code>FlexOffers</code> object and the entire conversion layer — the part most likely to have
        a bug — never executes. Mocking at the client edge means every test of a screen service is
        also, implicitly, a test of the conversion.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Why are there GLO and Flex versions of everything?'"
        intro="This question probes whether you understand anti-corruption layers, not just that you noticed duplicate types."
        steps={[
          "Name the pattern: it's an anti-corruption layer / DDD boundary between volatile backend schemas and our stable domain model.",
          "Locate the three zones: raw backend response types in src/backends/*/models, Flex* types in src/domain/models, converters/wrappers in src/domain/common.",
          "Explain the payoff: a backend schema change is absorbed in one converter; services built on Flex types don't change.",
          "Describe a wrapper like getOffers(): call the client → resolve flags with Promise.all → convert → return Flex.",
          "Land the testing consequence: mock the GLO client, not the wrapper, so conversion is exercised by every service test.",
        ]}
      />

      <h2 id="challenge">Challenge: Absorb a Backend Change</h2>
      <InterviewChallenge
        title="GLO renames a field — contain the blast radius"
        scenario={
          <>
            The GLO team announces that in the next release, the offer response field previously
            called <code>evaluationId</code> will be nested under a new{" "}
            <code>metadata</code> object as <code>metadata.evalId</code>. Five screen services read
            offers today. Describe exactly what you change — and, crucially, what you do{" "}
            <em>not</em> change.
          </>
        }
        tasks={[
          "Identify the single function that must change to absorb the rename.",
          "Explain why none of the five screen services need edits.",
          "State what the FlexOffers return type looks like before and after (hint: unchanged).",
          "Describe how you'd update the tests, and why mocking the client (not getOffers) is what makes the change safe.",
        ]}
        pitfalls={[
          "Editing each service to read the new nested field — that defeats the whole boundary.",
          "Changing FlexOffers' shape when only the GLO shape changed.",
          "Updating tests that mocked getOffers directly and thinking you verified the conversion.",
        ]}
        signal="A strong answer changes only the converter/wrapper and the GLO factory, leaves Flex types and services untouched, and explains the boundary is precisely what makes that possible."
      />
      <SolutionReveal difficulty="medium">
        <p>
          You change exactly one place: the conversion inside{" "}
          <code>getOffers()</code> (and/or <code>convertToFlexOffers</code>) so it reads{" "}
          <code>gloOffers.metadata?.evalId</code> instead of <code>gloOffers.evaluationId</code>{" "}
          when populating <code>FlexOffers.evaluationId</code>. The <code>FlexOffers</code> type is{" "}
          <strong>unchanged</strong> — its <code>evaluationId</code> field still exists and still
          means the same thing — so all five services, which only ever see <code>FlexOffers</code>,
          need no edits. That is the anti-corruption layer earning its keep.
        </p>
        <p>
          For tests: update the GLO factory (<code>buildRetrieveOffersResponse</code>) to produce
          the new nested shape, keep mocking{" "}
          <code>GrowthLifeOrchestratorClient.retrieveOffersV2</code>, and assert that{" "}
          <code>getOffers()</code> still returns the right <code>evaluationId</code>. Because the
          real conversion runs in the test, a mistake in the new mapping fails loudly. Any test that
          mocked <code>getOffers()</code> directly would have passed while the mapping was broken —
          which is exactly why the repo forbids that pattern.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two type systems by design.</strong> <code>GLO*</code> = raw backend truth;{" "}
          <code>Flex*</code> = our stable domain model.
        </li>
        <li>
          <strong>The boundary has an address:</strong> GLO models in{" "}
          <code>src/backends/*/models</code>, Flex models in <code>src/domain/models</code>,
          converters in <code>src/domain/common</code>.
        </li>
        <li>
          <strong>Wrappers hide the client.</strong> <code>getOffers()</code> calls GLO, resolves
          flags with <code>Promise.all</code>, converts, and returns a <code>Flex*</code> type.
        </li>
        <li>
          <strong>It&apos;s an anti-corruption layer.</strong> Backend schema churn is absorbed in
          one converter; the domain and services stay stable.
        </li>
        <li>
          <strong>Mock the client, not the wrapper.</strong> Mocking{" "}
          <code>getOffers()</code> skips the conversion layer — the code most likely to break.
        </li>
      </ul>
    </div>
  );
}
