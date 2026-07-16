import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const domainMapDiagram = String.raw`flowchart TD
  subgraph common["src/domain/common/ (conversion + shared logic)"]
    OFF["offers/"]
    AGR["agreements/"]
    PAY["payment/"]
    INV["invoices/"]
    OTHER["identity/, giftCard/,<br/>planSwitch/, unifiedWallet/…"]
  end
  subgraph models["src/domain/models/ (Flex types)"]
    FO["FlexOffer / FlexOffers"]
    FA["FlexAgreementDetails"]
    SCR["screens/v1/*Data (contracts)"]
  end
  BACKENDS["src/backends/*<br/>(raw backend types)"] --> common
  common --> models
  models --> SVC["screen & execution services"]`;

const wrapperAnatomyDiagram = String.raw`flowchart LR
  IN["Backend call<br/>GLO client"] --> STEP1["1. fetch GLO* data"]
  STEP1 --> STEP2["2. resolve flags<br/>Promise.all"]
  STEP2 --> STEP3["3. convertToFlex*()"]
  STEP3 --> OUT["Flex* type<br/>(defensive defaults)"]`;

export const toc: TocItem[] = [
  { id: "what", title: "What the Domain Layer Owns", level: 2 },
  { id: "map", title: "Mapping domain/common and domain/models", level: 2 },
  { id: "wrappers", title: "Conversion Wrappers, Anatomically", level: 2 },
  { id: "getagreement", title: "getAgreementDetails: A Second Wrapper", level: 2 },
  { id: "shared-logic", title: "Shared Domain Logic Lives Here Too", level: 2 },
  { id: "defensive", title: "Defensive Conversion & Optional Fields", level: 3 },
  { id: "models", title: "Flex Models and Screen Contracts", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Place the Logic Correctly", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function DomainLayerAndConversion() {
  return (
    <div className="article-content">
      <p>
        Between the raw backend clients and the screen services sits the domain layer — the heart of
        the service&apos;s business logic. This is where raw backend data, especially <code>GLO*</code>
        data, becomes <code>Flex*</code>,
        where shared rules like &quot;find the active agreement for this subscription&quot; live, and
        where the screen contract types are defined. If backends are the plumbing and services are the
        assembly line, the domain layer is the machine shop that turns raw parts into usable
        components. This module gives you a working map of it.
      </p>

      <h2 id="what">What the Domain Layer Owns</h2>
      <p>
        <code>src/domain/</code> is the largest area of the repo by file count for a reason: it owns
        conversion, shared business logic, the Flex type definitions, screen services, executions,
        metrics, and template rendering. This module focuses on the two pieces that everything else
        depends on: <code>domain/common/</code> (conversion + shared logic) and{" "}
        <code>domain/models/</code> (the Flex types and screen contracts).
      </p>

      <h2 id="map">Mapping domain/common and domain/models</h2>
      <MermaidDiagram
        chart={domainMapDiagram}
        title="The domain layer's two foundational folders"
        caption="domain/common converts raw backend data → Flex* and holds shared rules; domain/models defines the Flex types and per-screen contract types."
        minHeight={440}
      />
      <p>
        <code>domain/common/</code> is organized by concern — one subfolder each for{" "}
        <code>offers/</code>, <code>agreements/</code>, <code>payment/</code>,{" "}
        <code>invoices/</code>, <code>identity/</code>, <code>giftCard/</code>,{" "}
        <code>planSwitch/</code>, <code>unifiedWallet/</code>, and more. Each holds the conversion
        functions and shared helpers for that concern. The wrappers you already met —{" "}
        <code>getOffers()</code> in <code>offers/offerConversion.ts</code> and{" "}
        <code>getAgreementDetails()</code> in <code>agreements/agreementsDetailsConversion.ts</code>{" "}
        — live here.
      </p>

      <h2 id="wrappers">Conversion Wrappers, Anatomically</h2>
      <p>
        Most read wrappers follow the same anatomy. Internalize it and you can read or write the
        common GLO-backed wrappers confidently; simpler wrappers may skip feature flags, and
        non-GLO integrations may have service-specific conversion details.
      </p>
      <MermaidDiagram
        chart={wrapperAnatomyDiagram}
        title="The anatomy of a conversion wrapper"
        caption="Fetch raw GLO data → resolve any flags needed to convert (in parallel) → convert to a Flex type with defensive defaults."
        minHeight={300}
      />
      <ArticleTable
        caption="The two kinds of functions in domain/common and how they differ."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Wrapper (e.g. <code>getOffers</code>)</th>
              <th>Pure converter (e.g. <code>convertToFlexOffer</code>)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Does I/O?</td>
              <td>Yes — calls the backend client</td>
              <td>No — pure data transform</td>
            </tr>
            <tr>
              <td>Input</td>
              <td>Request params + headers</td>
              <td>Already-fetched GLO* data</td>
            </tr>
            <tr>
              <td>Output</td>
              <td><code>Flex*</code> type</td>
              <td><code>Flex*</code> type</td>
            </tr>
            <tr>
              <td>Used by</td>
              <td>Services (the common entry point)</td>
              <td>Wrappers, and other converters</td>
            </tr>
            <tr>
              <td>Tested by</td>
              <td>Mocking the GLO client method</td>
              <td>Direct unit test with GLO-shaped input</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="getagreement">getAgreementDetails: A Second Wrapper</h2>
      <p>
        The agreements wrapper mirrors <code>getOffers()</code> exactly — it calls the GLO client&apos;s{" "}
        <code>agreementDetails()</code> and converts to <code>FlexAgreementDetails</code>. You already
        saw it used from a V2 route to decide whether to redirect an already-entitled user:
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/routes/screens/v2/subscription/deviceReacquisition.ts (excerpt)"
        code={`const agreementDetails = await getAgreementDetails({
  standardHeaders,
  agreementDetailsRequestData: { includeOffer: true },
});

const hasActiveAgreement = hasBaseEntitledAgreement({
  agreementDetails,
  baseEntitlement: 'disney',
  subscriptionStates: [...ENTITLED_SUBSCRIPTION_STATES, 'STACKED'],
});`}
      />
      <p>
        Two things to notice. First, the caller works entirely in Flex terms —{" "}
        <code>FlexAgreementDetails</code>, <code>ENTITLED_SUBSCRIPTION_STATES</code> — never a GLO
        shape. Second, <code>hasBaseEntitledAgreement</code> is a piece of{" "}
        <em>shared domain logic</em>, not conversion: a reusable rule about entitlement that many
        screens need.
      </p>

      <h2 id="shared-logic">Shared Domain Logic Lives Here Too</h2>
      <p>
        <code>domain/common/</code> isn&apos;t only converters. It holds the reusable business
        predicates and selectors that would otherwise be copy-pasted across screens — things like{" "}
        <code>getActiveAgreementBySubscriptionId</code>, <code>getSubscriptionBySubscriptionId</code>,{" "}
        <code>hasExtraMemberInSubscription</code>, <code>partitionOffersByCurrentAndAvailable</code>,{" "}
        <code>filterIneligiblePlans</code>. When you find yourself writing a rule that another screen
        will plausibly need, this is where it belongs — not inline in a service.
      </p>
      <CodeBlock
        lang="typescript"
        filename="shared selectors imported by the cancel service"
        code={`import {
  filterIneligiblePlans,
  getOffers,
  partitionOffersByCurrentAndAvailable,
} from '!domain/common/offers/offerConversion';
import {
  getActiveAgreementBySubscriptionId,
  getSubscriptionBySubscriptionId,
  hasExtraMemberInSubscription,
} from '!domain/common/util';`}
      />

      <h3 id="defensive">Defensive Conversion &amp; Optional Fields</h3>
      <p>
        Backend fields are frequently optional or nullable, so converters are defensive by habit. You
        saw it in <code>getOffers()</code>: <code>agreementEligibleForOffers: gloOffers.agreementEligibleForOffers ?? ''</code>,{" "}
        <code>evaluationId: gloOffers.evaluationId ?? undefined</code>. The converter is the right
        place to decide the fallback, because it&apos;s the one place that knows the backend&apos;s
        quirks. Services downstream then get clean, predictable Flex types and don&apos;t have to
        null-check everything.
      </p>

      <h2 id="models">Flex Models and Screen Contracts</h2>
      <p>
        <code>src/domain/models/</code> is where the <code>Flex*</code> types are declared — the
        stable domain vocabulary. It also contains <code>models/screens/v1/&lt;screen&gt;/</code>,
        the per-screen <strong>contract types</strong> from module 4 that mirror processed screen
        content. V2 screen contracts live under <code>models/screens/v2/</code>. So the
        domain layer owns both ends of the pipeline: the input types (Flex offers, agreements) that
        services read, and the output contract types that services must produce.
      </p>
      <ArticleTable
        caption="What lives under domain/models."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Contains</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>models/flexOffer.ts</code>, <code>flexAgreementDetails.ts</code>…</td><td>Core Flex domain types</td></tr>
            <tr><td><code>models/screens/v1/&lt;screen&gt;/</code>, <code>models/screens/v2/&lt;screen&gt;/</code></td><td>Per-screen template contract types</td></tr>
            <tr><td><code>models/cypher/</code></td><td>Cypher key definitions</td></tr>
            <tr><td><code>models/featureSet</code></td><td>FeatureSet types (experiment inputs)</td></tr>
            <tr><td><code>models/template</code></td><td>Template &amp; templateData types</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Because these are the types the generated type guards validate, remember the rule: after
        changing any interface in <code>models/</code> (or <code>elements/</code>), run{" "}
        <code>npm run build:typeguards</code> or CI breaks.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Where does business logic live in this service?'"
        intro="The interviewer wants the domain layer, with a clear split between conversion, shared logic, and types."
        steps={[
          "Locate it: src/domain/common holds conversion + shared business logic; src/domain/models holds Flex types and screen contracts.",
          "Explain the common wrapper anatomy: fetch raw backend/GLO data → resolve independent flags in parallel → convert to a Flex type with defensive defaults.",
          "Distinguish wrappers (do I/O) from pure converters (transform already-fetched data) and how each is tested.",
          "Note that reusable predicates/selectors (getActiveAgreementBySubscriptionId, filterIneligiblePlans) live in common, not inline in services.",
          "Close with models: the same layer defines both the Flex input types and the per-screen contract output types, guarded by build:typeguards.",
        ]}
      />

      <h2 id="challenge">Challenge: Place the Logic Correctly</h2>
      <InterviewChallenge
        title="Two screens need the same 'is this offer a promo?' rule"
        scenario={
          <>
            You&apos;re building the cancel screen and need to decide whether the current offer is a
            promotional offer. While writing it you realize the reacquisition screen needs the exact
            same determination. A colleague suggests just writing an <code>isPromo()</code> helper
            inside <code>cancelLandingService.ts</code> and importing it into the reacquisition
            service. Evaluate that and propose the correct placement.
          </>
        }
        tasks={[
          "Explain why putting shared domain logic inside a screen service is a design smell.",
          "State where the rule belongs and why (which folder, and what it should operate on — GLO* or Flex*).",
          "Describe how the two services should consume it.",
          "Explain how you'd unit-test the rule independently of either screen.",
        ]}
        pitfalls={[
          "Housing shared logic in one screen service and cross-importing it into another.",
          "Making the rule operate on GLO* types, leaking backend shapes into the domain.",
          "Testing the rule only indirectly through a screen service test.",
        ]}
        signal="A strong answer moves the rule into domain/common (offers), has it operate on Flex types, and unit-tests it directly."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Cross-importing between two screen services couples them and buries a reusable rule in a
          feature file — the next screen that needs it will either duplicate it or import from an
          unrelated service. The rule belongs in <code>domain/common/offers/</code> (alongside the
          other offer logic like <code>partitionOffersByCurrentAndAvailable</code> and{" "}
          <code>filterIneligiblePlans</code>), operating on the <strong>Flex</strong> offer type so no
          GLO shape leaks upward.
        </p>
        <p>
          Both services then import it from <code>!domain/common/offers/...</code> — symmetric, no
          service-to-service dependency. And because it&apos;s a pure predicate over a Flex type, you
          unit-test it directly by passing Flex offers built with factory functions and asserting the
          boolean, with no screen, template, or backend mock involved. That&apos;s the whole point of
          keeping shared logic pure and in <code>common</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>The domain layer is the machine shop.</strong>{" "}
          <code>domain/common</code> = conversion + shared logic; <code>domain/models</code> = Flex
          types + screen contracts.
        </li>
        <li>
          <strong>Wrappers have a recognizable anatomy:</strong> fetch raw backend/GLO data → resolve
          independent flags in parallel → convert to Flex with defensive defaults.
        </li>
        <li>
          <strong>Wrappers do I/O; converters are pure.</strong> Test wrappers by mocking the client;
          test converters directly.
        </li>
        <li>
          <strong>Reusable predicates/selectors live in <code>common</code></strong>, operating on
          Flex types — never buried inside one screen service.
        </li>
        <li>
          <strong><code>domain/models</code> owns both ends:</strong> Flex input types and per-screen
          contract types — guarded by <code>build:typeguards</code>.
        </li>
      </ul>
    </div>
  );
}
