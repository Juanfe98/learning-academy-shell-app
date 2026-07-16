import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const executionFlowDiagram = String.raw`flowchart TD
  REQ["POST /execution/... + body"]
  REQ --> VAL["Route: Joi validate body"]
  VAL --> SVC["Execution service"]
  SVC --> GUARD["Guard / preconditions<br/>(fetch agreement, validate state)"]
  GUARD --> OK{"valid?"}
  OK -->|no| INVALID["build invalid response<br/>(no mutation)"]
  OK -->|yes| EXEC["GLO *Execution call<br/>(state change!)"]
  EXEC --> RESULT["build result payload"]
  RESULT --> BODY["ctx.body = result"]`;

const screenVsExecDiagram = String.raw`flowchart LR
  subgraph screen["Screen (read)"]
    S1["fetch → build → fillTemplate"]
    S2["idempotent, cacheable-ish"]
    S3["retry = safe"]
  end
  subgraph exec["Execution (write)"]
    E1["guard → GLO *Execution → result"]
    E2["side effects: cancel, charge, switch"]
    E3["retry = DANGEROUS"]
  end`;

export const toc: TocItem[] = [
  { id: "recap", title: "The Other Request Family", level: 2 },
  { id: "layout", title: "How Executions Are Organized", level: 2 },
  { id: "shape", title: "The Shape of an Execution", level: 2 },
  { id: "glo-exec", title: "GLO *Execution Methods", level: 2 },
  { id: "guards", title: "Guards & Preconditions", level: 2 },
  { id: "no-experiments", title: "No Experiments in Executions", level: 3 },
  { id: "idempotency", title: "Why Executions Are Dangerous to Retry", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Reason About a Mutation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ActionExecutions() {
  return (
    <div className="article-content">
      <p>
        Screens describe UI; <strong>executions change the world.</strong> When a subscriber actually
        cancels, switches plans, updates a card, or consents, that action is an <em>execution</em> —
        a POST that mutates state through GLO. Executions live in <code>src/domain/execution/</code>,
        run on a different mental model than screens, and carry the risks that come with side
        effects. This module maps the execution layer and drills the discipline that keeps a
        double-tap from double-charging a customer.
      </p>

      <h2 id="recap">The Other Request Family</h2>
      <p>
        Back in module 1 you learned the screens-vs-executions split. Everything through Group 2 was
        the screen side. Now the write side. The contrast is the whole point:
      </p>
      <MermaidDiagram
        chart={screenVsExecDiagram}
        title="Screens read; executions write"
        caption="A screen can be re-fetched safely; an execution has side effects, so retries and idempotency are real concerns."
        minHeight={320}
      />

      <h2 id="layout">How Executions Are Organized</h2>
      <p>
        <code>src/domain/execution/</code> is grouped by domain, mirroring the kinds of actions a
        subscriber can take. Each holds service files (and their <code>models/</code>).
      </p>
      <ArticleTable
        caption="The execution domains under src/domain/execution/."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Folder</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr><td><code>subscription/</code></td><td>cancel, switch, pause, unpause, restart, signup, consent, optIn, retryPayment, extraMember, zipcode, verify</td></tr>
            <tr><td><code>payments/</code></td><td>changePayment, creditCard, paypal, ideal, klarna, roku, giftCard, comcast, apm, enrollPayment, verifyPaymentMethod</td></tr>
            <tr><td><code>wallet/</code></td><td>unified wallet bulk consent, remove card</td></tr>
            <tr><td><code>offers/</code></td><td>third-party SKUs, redemption</td></tr>
            <tr><td><code>onetrust/</code></td><td>save &amp; log consent</td></tr>
            <tr><td><code>account/</code></td><td>cohorts, device out-of-household, login-redirect</td></tr>
            <tr><td><code>notifications/</code></td><td>upsell email</td></tr>
            <tr><td><code>commerce/</code>, <code>segment/</code></td><td>redirect, segment verification</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Routes for these live under <code>src/routes/execution/v1/</code>, <code>v2/</code>,{" "}
        <code>v3/</code>. Most mutation endpoints are <code>POST</code>, matching their
        state-changing nature. A few execution-route files are read/redirect helpers that use{" "}
        <code>GET</code> (for example commerce redirect, withdrawal, or 3DS helper endpoints), so
        don&apos;t infer the verb from the folder name alone — inspect the route.
      </p>

      <h2 id="shape">The Shape of an Execution</h2>
      <p>
        An execution service has a recognizable shape distinct from a screen: validate the request,
        check preconditions (often by fetching the current agreement), then call the GLO{" "}
        <code>*Execution</code> method, and build a result payload. Critically, it may decide{" "}
        <em>not</em> to mutate — returning an &quot;invalid&quot; response if preconditions
        fail.
      </p>
      <MermaidDiagram
        chart={executionFlowDiagram}
        title="The execution shape: guard, then mutate"
        caption="The mutation only happens after preconditions pass. A failed guard returns an invalid response with no side effect."
        minHeight={460}
      />
      <CodeBlock
        lang="typescript"
        filename="src/domain/execution/subscription/cancel/cancelSubscriptionService.ts (imports)"
        code={`import GrowthLifeOrchestratorClient from '!backends/growthLifeOrchestrator';
import { GLOCancelSubscriptionResponse } from '!backends/growthLifeOrchestrator/models';
import { getAgreementDetails } from '!domain/common/agreements/agreementsDetailsConversion';
import { getAgreementBySubscriptionId } from '!domain/common/util';
// ...buildInvalidResponse etc.`}
      />
      <p>
        Notice: the execution imports the GLO client <em>directly</em> for the mutating call, but
        still uses the <code>getAgreementDetails</code> wrapper for the read it needs to guard. Reads
        go through Flex wrappers; the write is the one place the raw client is legitimately called.
      </p>

      <h2 id="glo-exec">GLO *Execution Methods</h2>
      <p>
        Many mutating GLO calls are <code>GrowthLifeOrchestratorClient</code> methods ending in{" "}
        <code>Execution</code>, but not all mutation method names use that suffix (for example{" "}
        <code>redeemGiftCard()</code>). Each corresponds to a real state change:
      </p>
      <ArticleTable
        caption="A sample of GLO *Execution methods and the mutation each performs."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Method</th><th>Mutation</th></tr>
          </thead>
          <tbody>
            <tr><td><code>cancelSubscriptionExecution()</code></td><td>Cancels a subscription</td></tr>
            <tr><td><code>switchSubmissionExecution()</code></td><td>Switches the plan</td></tr>
            <tr><td><code>consentExecution()</code></td><td>Records consent</td></tr>
            <tr><td><code>redeemGiftCard()</code></td><td>Redeems a gift card (charges/credits)</td></tr>
            <tr><td><code>paypalPaymentMethodExecution()</code></td><td>Attaches a PayPal method</td></tr>
            <tr><td><code>zipcodeExecution()</code></td><td>Submits zipcode/tax info</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="guards">Guards &amp; Preconditions</h2>
      <p>
        Because a mutation is irreversible-ish, execution services guard hard before calling GLO. The
        cancel service, for example, fetches the agreement and locates the one matching the requested
        subscription (<code>getAgreementBySubscriptionId</code>) before it will submit a
        cancellation — if the subscription doesn&apos;t exist or isn&apos;t in a cancellable state, it
        returns an invalid response instead of blindly calling GLO. Guards are not optional
        politeness; they are how the service avoids acting on stale or malformed input.
      </p>

      <h3 id="no-experiments">No Experiments in Executions</h3>
      <p>
        A rule worth memorizing, straight from <code>EXPERIMENTATION.md</code>:{" "}
        <strong>experiments apply only to screen presentation/configuration
        (<code>src/domain/screen/</code>). No experiments exist in execution flows
        (<code>src/domain/execution/</code>).</strong> This makes sense: you A/B test what a user{" "}
        <em>sees</em>, not the correctness of a state change. If you ever feel tempted to branch an
        execution on a treatment, stop — the variation belongs on the screen that led to it, not the
        mutation itself.
      </p>

      <h2 id="idempotency">Why Executions Are Dangerous to Retry</h2>
      <p>
        The defining risk of the write side: a screen fetch can be retried freely, but retrying an
        execution can double-cancel, double-charge, or double-consent. This is why guards, precise
        request modeling, and clear invalid-response paths matter so much more here than on a screen.
        When you touch an execution, always ask: <em>&quot;what happens if this runs twice?&quot;</em>
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do executions differ from screens here?'"
        intro="Show you understand the write-side mental model, guards, and the no-experiments rule."
        steps={[
          "Define executions as state-changing actions in src/domain/execution/ (usually POST routes), backed by mutating GLO methods such as *Execution calls — the write counterpart to read-only screens.",
          "Describe the shape: validate → guard on preconditions (often fetch the agreement) → call GLO *Execution → build result, with a no-mutation invalid path when guards fail.",
          "Note reads still go through Flex wrappers (getAgreementDetails); the raw GLO client is called directly only for the mutating step.",
          "State the rule: no experiments in executions — A/B testing lives on screens, not mutations.",
          "Close with the retry/idempotency risk that makes guards and precise modeling non-negotiable on the write side.",
        ]}
      />

      <h2 id="challenge">Challenge: Reason About a Mutation</h2>
      <InterviewChallenge
        title="Harden a plan-switch execution"
        scenario={
          <>
            You&apos;re reviewing a new <code>switch</code> execution service. The draft calls{" "}
            <code>switchSubmissionExecution()</code> immediately from the request body, with no reads
            first, and has a treatment check that picks a different target plan when the user is in an
            experiment. Identify what&apos;s wrong and describe the correct structure.
          </>
        }
        tasks={[
          "Explain what precondition/guard is missing before the GLO mutation and why it matters.",
          "Identify the rule the treatment check violates and where that variation belongs instead.",
          "Describe the invalid-response path and when it should be taken (no mutation).",
          "Explain the retry concern and one way the service reduces double-submit risk.",
        ]}
        pitfalls={[
          "Calling the GLO *Execution method before validating the agreement/subscription state.",
          "Branching the mutation on an experiment treatment (executions have no experiments).",
          "Mutating and only then discovering the input was invalid.",
        ]}
        signal="A strong answer adds an agreement guard before the mutation, removes the experiment branch (moves any variation to the screen), and reasons about idempotency."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Two defects. First, it mutates blind: it must first read the agreement (via{" "}
          <code>getAgreementDetails</code>) and locate the target subscription
          (<code>getAgreementBySubscriptionId</code>), confirm it&apos;s in a switchable state, and
          only then call <code>switchSubmissionExecution()</code>. If the guard fails, return an
          invalid response — <strong>no GLO call</strong>. Second, the treatment check breaks the{" "}
          &quot;no experiments in executions&quot; rule: which plan is offered is a{" "}
          <em>screen</em> decision (the plan-select/preview screen the user came from), not something
          the mutation re-derives. Remove it; the execution should faithfully submit the plan the
          user actually chose.
        </p>
        <p>
          For retries: because a double-submit could switch twice or produce conflicting state, the
          service leans on preconditions (a second submit for an already-switched agreement should
          fail the guard and return invalid) and precise request modeling so the same intent
          isn&apos;t ambiguously re-executed. The mental test is always &quot;what if this runs
          twice?&quot;
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Executions are the write side</strong> — state-changing actions in{" "}
          <code>src/domain/execution/</code>, grouped by domain (subscription, payments, wallet…),
          and usually exposed as POST routes.
        </li>
        <li>
          <strong>Shape: validate → guard → GLO <code>*Execution</code> → result</strong>, with a
          no-mutation invalid path when guards fail.
        </li>
        <li>
          <strong>Reads via Flex wrappers; the raw GLO client is called directly only for the
          mutation.</strong>
        </li>
        <li>
          <strong>No experiments in executions.</strong> A/B testing is a screen concern, not a
          mutation concern.
        </li>
        <li>
          <strong>Retries are dangerous.</strong> Guards, precise request modeling, and invalid-
          response paths protect against double-mutation.
        </li>
      </ul>
    </div>
  );
}
