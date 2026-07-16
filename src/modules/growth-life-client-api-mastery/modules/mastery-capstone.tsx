import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fullFlowDiagram = String.raw`flowchart TD
  REQ["Client request + Disney headers"]
  REQ --> FC["Global middleware:<br/>standardHeaders + region + experimentation + device/session → FlexContext"]
  FC --> RT["Route: Joi + flexRouteMiddleware/flexContextRouteHandler"]
  RT --> SVC["buildXScreen({ flexContext, params })"]
  SVC --> FETCH["Promise.all:<br/>getOffers (GLO→Flex),<br/>getTemplate, flags, treatment"]
  FETCH --> DECIDE["business + region + experiment decisions"]
  DECIDE --> UI["element builders + Cypher copy"]
  UI --> MET["metricsData V2 builders"]
  MET --> FILL["fillTemplate"]
  FILL --> RESP["processed { data, metadata }<br/>UI + analytics in data.content"]
  MIG["migrationConfig?<br/>mirror on platform if migrating"] -.-> SVC`;

const debugMapDiagram = String.raw`flowchart TD
  BUG["Reported symptom"]
  BUG --> Q1{"wrong VALUE or<br/>missing SECTION?"}
  Q1 -->|value| THISREPO["this repo:<br/>domain/experiment/region logic"]
  Q1 -->|section/layout| TPL["template repo (S3)"]
  BUG --> Q2{"region/experiment<br/>scoped?"}
  Q2 -->|yes| EXP["regionConfig / getExperimentTreatment"]
  BUG --> Q3{"only half of users?"}
  Q3 -->|yes| MIG["migrating screen —<br/>check the other side"]`;

export const toc: TocItem[] = [
  { id: "goal", title: "What Mastery Looks Like", level: 2 },
  { id: "whole-flow", title: "The Whole Flow, One Diagram", level: 2 },
  { id: "add-screen", title: "Capstone I: Add a Screen End-to-End", level: 2 },
  { id: "debug", title: "Capstone II: Debug by Symptom", level: 2 },
  { id: "tradeoffs", title: "Capstone III: Architecture Tradeoffs", level: 2 },
  { id: "checklist", title: "The Pre-Push Master Checklist", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Final Challenge: The Full Loop", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function MasteryCapstone() {
  return (
    <div className="article-content">
      <p>
        You&apos;ve now walked every layer of <code>growth-life-client-api</code>. This capstone ties
        them together — not with new facts, but with the integrative reasoning that separates
        &quot;knows the parts&quot; from &quot;owns the system.&quot; We&apos;ll run the whole flow in
        one picture, then work three real scenarios: adding a screen end-to-end, debugging by symptom,
        and reasoning about a design tradeoff. If you can do these fluently, you&apos;re an expert on
        this service.
      </p>

      <h2 id="goal">What Mastery Looks Like</h2>
      <p>
        Mastery here isn&apos;t memorizing folder names. It&apos;s three abilities: (1) trace any
        request from header to response naming every layer, (2) localize a bug to the right repo and
        layer from its symptom alone, and (3) make a change that&apos;s correct <em>and</em>{" "}
        CI-clean — types regenerated, both migration sides updated, tests behavioral. Everything below
        drills those three.
      </p>

      <h2 id="whole-flow">The Whole Flow, One Diagram</h2>
      <p>
        This is the entire academy in a single picture. Every box is a module you&apos;ve completed.
      </p>
      <MermaidDiagram
        chart={fullFlowDiagram}
        title="Request → rendered screen, end to end"
        caption="Global middleware builds FlexContext before route handling; route validation delegates to service orchestration (parallel fetch, raw backend→Flex, decisions) → element/metrics builders → fillTemplate → processed response. Migration mirrors it on the platform side."
        minHeight={560}
      />

      <h2 id="add-screen">Capstone I: Add a Screen End-to-End</h2>
      <p>
        The &quot;Add a New Screen&quot; playbook, now something you can recite because you understand
        each step&apos;s <em>why</em>:
      </p>
      <ArticleTable
        caption="The end-to-end screen checklist, with the module that explains each step."
        minWidth={860}
      >
        <table>
          <thead>
            <tr><th>#</th><th>Step</th><th>Module</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td><code>constants.ts</code>: <code>SCREEN_TYPE</code>, <code>DEFAULT_TEMPLATE_CONFIGURATION</code>, <code>CONFIGURATION_REQ</code></td><td>Templates (4), Services (8)</td></tr>
            <tr><td>2</td><td>Contract type in <code>domain/models/screens/v1/&lt;screen&gt;/</code></td><td>Templates (4), Domain (7)</td></tr>
            <tr><td>3</td><td><code>&lt;screen&gt;Service.ts</code>: <code>Promise.all</code> → build → <code>fillTemplate</code></td><td>Services (8), Backends (6)</td></tr>
            <tr><td>4</td><td><code>&lt;screen&gt;MetricsDataBuilder.ts</code>: page/container/interaction V2</td><td>Metrics (10)</td></tr>
            <tr><td>5</td><td>Route with Joi + <code>flexRouteMiddleware</code> or <code>flexContextRouteHandler</code></td><td>Routes (5)</td></tr>
            <tr><td>6</td><td>Register on the parent router (<code>.use(...)</code>)</td><td>Routes (5)</td></tr>
            <tr><td>7</td><td>Add endpoint to <code>openapi.yaml</code>, <code>$ref</code> the generated schema</td><td>Routes (5), Tooling (16)</td></tr>
            <tr><td>8</td><td><code>npm run build:swagger</code></td><td>Tooling (16)</td></tr>
            <tr><td>9</td><td><code>npm run build:typeguards</code></td><td>Tooling (16)</td></tr>
            <tr><td>10</td><td>Standardized tests: <code>setupMocks</code>, factories, behavioral, matrix</td><td>Testing (15)</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="debug">Capstone II: Debug by Symptom</h2>
      <p>
        An expert routes a bug to its layer before opening a file. Use the symptom to decide{" "}
        <em>where</em> to look:
      </p>
      <MermaidDiagram
        chart={debugMapDiagram}
        title="Symptom → layer triage"
        caption="Wrong value vs missing section splits this-repo from template-repo. Region/experiment scoping points at regionConfig/treatment. Half-of-users points at a migrating screen."
        minHeight={420}
      />
      <ArticleTable
        caption="A field triage table from symptom to first place to look."
        minWidth={860}
      >
        <table>
          <thead>
            <tr><th>Symptom</th><th>Likely layer</th><th>First check</th></tr>
          </thead>
          <tbody>
            <tr><td>Wrong price/copy value</td><td>This repo: domain/experiment/region</td><td>Offer selection + region/treatment logic in the service</td></tr>
            <tr><td>Missing/extra section or wrong layout</td><td>Template repo (S3)</td><td>The screen&apos;s template JSON</td></tr>
            <tr><td>Copy shows a raw key or wrong language</td><td>Cypher / copy building</td><td><code>toCopy</code> key + dictionary; Pattern 1</td></tr>
            <tr><td>Bug only for some regions / a variant</td><td>Region config / experiment</td><td><code>regionConfig</code>, <code>getExperimentTreatment</code> (the <code>undefined</code> trap)</td></tr>
            <tr><td>Bug for ~half of users on one screen</td><td>Platform migration divergence</td><td><code>migrationConfig.ts</code> — is it <code>migrating</code>? Parity test</td></tr>
            <tr><td>Analytics funnel numbers wrong</td><td>Metrics builders</td><td><code>elementIndex</code> sequence; V2 builders</td></tr>
            <tr><td>Double charge / double cancel</td><td>Execution</td><td>Guards + idempotency in the execution service</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="tradeoffs">Capstone III: Architecture Tradeoffs</h2>
      <p>
        Owning the system means being able to defend its design — and know its costs.
      </p>
      <ArticleTable
        caption="The core design decisions and their tradeoffs."
        minWidth={860}
      >
        <table>
          <thead>
            <tr><th>Decision</th><th>Buys</th><th>Costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Template-driven (structure in S3)</td><td>UI changes without API deploys; thin clients</td><td>Two repos to reason about; runtime template failures need fallbacks</td></tr>
            <tr><td>Two type systems (GLO/Flex)</td><td>Backend churn absorbed at one boundary</td><td>Duplicate-looking types; conversion layer to maintain</td></tr>
            <tr><td>BFF centralization</td><td>Business/experiment/localization logic in one place</td><td>This service becomes critical-path; correctness bar is high</td></tr>
            <tr><td>Platform migration (dual-path)</td><td>Incremental, reversible modernization</td><td>Change-both burden; parity tests; temporary complexity</td></tr>
            <tr><td>Codegen (guards/schemas)</td><td>Runtime validation + published contracts</td><td>Extra build steps; stale-artifact CI failures</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="checklist">The Pre-Push Master Checklist</h2>
      <p>
        Everything the earlier modules taught, compressed into what you verify before opening a PR:
      </p>
      <CodeBlock
        lang="markdown"
        filename="pre-push checklist"
        code={`[ ] migrationConfig.ts checked — if migrating, both sides changed
[ ] Independent fetches use Promise.all (no sequential awaits)
[ ] Read-side backend data goes through domain wrappers (getOffers/getAgreementDetails), not raw GLO client
[ ] Copy uses toCopy(key + dictionary), never hardcoded strings (Pattern 1)
[ ] metricsData uses V2 builders; elementIndex sequential 0-based
[ ] No experiments in executions; treatment compared === 'variant', not !== 'control'
[ ] Interfaces changed → npm run build:typeguards
[ ] Route/response schema changed → npm run build:swagger
[ ] Imports: ! aliases, no ../ parents, alphabetized; addOn not addon
[ ] No per-screen function registry (use canonical domain registry)
[ ] Tests: setupMocks + factories + behavioral assertions; not in .legacy.test.ts
[ ] Mock the GLO client method, not the conversion wrapper`}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'You own this service now — where do you start on X?'"
        intro="The senior signal is triage and sequencing: locate the layer, respect the guardrails, verify with the right checks."
        steps={[
          "Restate the request as screen vs execution and read-only vs state-changing — it frames everything.",
          "Trace the layer path out loud: middleware builds FlexContext → route validates/delegates → service (parallel fetch, raw backend→Flex, decisions) → builders → fillTemplate.",
          "For a bug, triage by symptom: wrong value vs missing section (repo split), region/variant scoping (regionConfig/treatment), half-of-users (migrating screen).",
          "For a change, name the guardrails: migrationConfig, Promise.all, Cypher copy, V2 metrics, no-registry rule, and the codegen commands.",
          "Close on verification: build:typeguards / build:swagger, behavioral tests mocking the GLO client, and the CI gauntlet.",
        ]}
      />

      <h2 id="challenge">Final Challenge: The Full Loop</h2>
      <InterviewChallenge
        title="Ship a region-gated, experiment-measured promo on a migrating screen"
        scenario={
          <>
            Product wants, on the <code>billingHistory</code> screen (which is{" "}
            <code>migrating</code>), a new promo banner that: shows only in LATAM, displays a
            localized discounted price computed from the user&apos;s offer, and is A/B tested as{" "}
            <code>control</code> vs <code>variant-promo</code> to measure conversion. Walk the entire
            implementation and verification, touching every relevant layer and guardrail from this
            academy.
          </>
        }
        tasks={[
          "Data + decisions: what you fetch (in parallel), how you gate on LATAM, and how you resolve the treatment safely.",
          "UI + analytics: how you build the localized price banner and instrument it, including the elementIndex rule.",
          "Config vs code + migration: what goes in template config vs service code, and the change-both obligation.",
          "Verification: the exact codegen commands, the test approach, and which CI checks confirm you're done.",
        ]}
        pitfalls={[
          "treatment !== 'control' mis-bucketing unenrolled users.",
          "Hardcoding the discounted price string instead of toCurrencyVariable + Cypher key.",
          "Editing only the legacy billingHistory and ignoring the platform side.",
          "Forgetting build:typeguards / build:swagger after the contract change.",
          "Trying to compute the dynamic price purely in template config.",
        ]}
        signal="A strong answer fetches in parallel, gates on regionConfig, resolves the treatment via FeatureSet with === 'variant-promo', builds a localized price element, instruments it with correct elementIndex, mirrors both migration sides, runs both codegen commands, and tests behaviorally by mocking the GLO client."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Data + decisions.</strong> In the service, <code>Promise.all</code> the offer fetch
          (<code>getOffers</code> → Flex), the template, and any flags. Gate the banner on{" "}
          <code>flexContext.regionConfig</code> (LATAM). Resolve the experiment once via a detection
          helper — <code>getExperimentTreatment({"{ flexContext, featureId }"}) === 'variant-promo'</code>{" "}
          (never <code>!== 'control'</code>, or unenrolled/<code>undefined</code> users leak into the
          variant) — and store it as a boolean in the screen&apos;s FeatureSet.
        </p>
        <p>
          <strong>UI + analytics.</strong> The discounted price is runtime data, so it&apos;s{" "}
          <em>service code</em>: compute it from the <code>FlexOffer</code>, build the banner with{" "}
          <code>toInteractionElement</code> + <code>toCopy({"{ text: 'promoKey', dictionary, variables: { price: toCurrencyVariable(amount, currency) } }"})</code>.
          Instrument via the V2 metrics builders and give the banner the correct sequential{" "}
          <code>elementIndex</code> in its container so the funnel attributes the variant cleanly.
        </p>
        <p>
          <strong>Config vs code + migration.</strong> Static bits (a variant template layout, static
          keys) go in the template config under the <code>variant_id</code>; the dynamic price stays
          in service code — most experiments need both. Because <code>billingHistory</code> is{" "}
          <code>migrating</code>, make the equivalent change on the platform pipeline/assembly too —
          <code>migration-check</code> and the parity test will fail on a one-sided change.
        </p>
        <p>
          <strong>Verification.</strong> The contract type gained a field →{" "}
          <code>npm run build:typeguards</code>; the response schema changed →{" "}
          <code>npm run build:swagger</code>. Write standardized tests: mock{" "}
          <code>GrowthLifeOrchestratorClient.retrieveOffersV2</code> with a factory, set the region
          and the treatment, and assert behaviorally — banner present in LATAM+variant, absent
          otherwise, correct Cypher key and <code>elementIndex</code>. Green across{" "}
          <code>typeguards-check</code>, <code>openapi-check</code>, <code>migration-check</code>, and
          the test suite means it&apos;s actually done. That&apos;s the full loop.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Mastery = three abilities:</strong> trace any request across layers, triage a bug to
          its layer by symptom, and ship a change that&apos;s correct <em>and</em> CI-clean.
        </li>
        <li>
          <strong>The whole flow:</strong> middleware/FlexContext → route → service (parallel fetch, raw backend→Flex,
          decisions) → element/metrics builders → <code>fillTemplate</code> → response.
        </li>
        <li>
          <strong>Debug by symptom:</strong> wrong value vs missing section splits the repos;
          region/variant scoping points at config/treatment; half-of-users means a migrating screen.
        </li>
        <li>
          <strong>Know the tradeoffs</strong> behind template-driven rendering, two type systems, BFF
          centralization, the migration, and codegen.
        </li>
        <li>
          <strong>The pre-push checklist</strong> is the whole academy compressed — run it before
          every PR.
        </li>
      </ul>
    </div>
  );
}
