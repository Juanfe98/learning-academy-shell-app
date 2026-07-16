import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const orchestrationDiagram = String.raw`flowchart TD
  START["buildXScreen({ flexContext, params })"]
  START --> FETCH["1. Promise.all:<br/>getOffers, getAgreementDetails,<br/>getTemplate, feature flags"]
  FETCH --> DECIDE["2. Business decisions:<br/>eligibility, experiment,<br/>region branching"]
  DECIDE --> BUILD["3. Build UI sections:<br/>element builders (toInteractionElement…)"]
  BUILD --> METRICS["4. Build metricsData:<br/>page/container/interaction V2"]
  METRICS --> FILL["5. fillTemplate({ template, templateData })"]
  FILL --> RET["return processed template"]`;

const fileLayoutDiagram = String.raw`flowchart LR
  C["constants.ts<br/>SCREEN_TYPE,<br/>DEFAULT_TEMPLATE_CONFIGURATION"]
  T["screenData.ts<br/>contract type"]
  S["screenService.ts<br/>orchestration"]
  M["screenMetricsDataBuilder.ts<br/>analytics"]
  R["route.ts<br/>Joi + handler"]
  C --> S
  T --> S
  S --> M
  R --> S`;

export const toc: TocItem[] = [
  { id: "role", title: "The Service Is the Orchestrator", level: 2 },
  { id: "five-steps", title: "The Five-Step Shape", level: 2 },
  { id: "anatomy", title: "Reading a Real Service", level: 2 },
  { id: "files", title: "The Files That Make a Screen", level: 2 },
  { id: "registries", title: "Function Registries: A Hard Rule", level: 2 },
  { id: "migration-note", title: "Migrating Screens Run Twice", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Orchestrate a Screen", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ScreenServices() {
  return (
    <div className="article-content">
      <p>
        The screen service is where everything you&apos;ve learned converges. It is the function a
        route delegates to, and its job is <strong>orchestration</strong>: fetch the data in
        parallel, apply the business rules, build the UI sections with element builders, assemble the
        analytics, and fill the template. Master the shape of a service and you can build or modify
        any screen in the codebase. This module dissects that shape using the real cancel-landing
        service as the reference.
      </p>

      <h2 id="role">The Service Is the Orchestrator</h2>
      <p>
        A screen service normally exposes an exported <code>buildXScreen()</code>-style entrypoint
        (for example <code>buildCancelLandingScreen</code>). It receives <code>flexContext</code> and
        request params, and it returns a processed template — <code>{"{ data, metadata }"}</code>,
        with UI + analytics under <code>data.content</code>. It calls into every other layer —
        backends via domain wrappers, domain logic, element builders, metrics builders, the template
        engine — but it owns none of them. It is the conductor, not the orchestra.
      </p>

      <h2 id="five-steps">The Five-Step Shape</h2>
      <p>
        Nearly every service follows the same five steps in order. The <code>CLAUDE.md</code> screen
        service pattern is exactly this skeleton.
      </p>
      <MermaidDiagram
        chart={orchestrationDiagram}
        title="The five-step orchestration shape"
        caption="Fetch in parallel → decide → build UI → build metrics → fill template. Every screen service is a variation on this."
        minHeight={480}
      />
      <CodeBlock
        lang="typescript"
        filename="the canonical service skeleton (CLAUDE.md)"
        code={`// 1. Fetch everything independent in parallel.
const [offers, template, flag] = await Promise.all([
  getOffers({ standardHeaders, retrieveOffersRequest, flexContext }),
  getTemplate({ templateConfiguration }),
  getEnableX(flexContext),
]);

// 2. (business decisions on the fetched data happen here)

// 3. Build UI sections with element builders.
const cta = toInteractionElement({
  key: 'x',
  copy: toCopy({ text: 'cypher_key', dictionary: 'unified-commerce' }),
  // ...action, style, metricsData
});

// 4. Build metricsData (next module goes deep on this).

// 5. Fill the template and return.
return fillTemplate({ template, templateData: { data: { cta, metricsData } } });`}
      />

      <h2 id="anatomy">Reading a Real Service</h2>
      <p>
        The cancel-landing service (<code>src/domain/screen/account/cancel/cancelLandingService.ts</code>)
        is a production example of the shape. Its imports alone tell the story of the five steps —
        domain wrappers for data, shared selectors for decisions, element builders for UI, metrics
        builders for analytics, and the template engine to finish:
      </p>
      <CodeBlock
        lang="typescript"
        filename="cancelLandingService.ts — imports, annotated"
        code={`// DATA (step 1): domain wrappers + shared selectors
import {
  filterIneligiblePlans,
  getOffers,
  partitionOffersByCurrentAndAvailable,
} from '!domain/common/offers/offerConversion';
import {
  getActiveAgreementBySubscriptionId,
  getSubscriptionBySubscriptionId,
  hasExtraMemberInSubscription,
} from '!domain/common/util';

// UI (step 3): element builders + actions
import {
  InteractionElement,
  toBackAction,
  toCancelSubscriptionAction,
  toNextTemplateAction,
} from '!elements/v1/types';

// ANALYTICS (step 4): metrics builders for this screen
import {
  buildCancelLandingCancelInteractionMetricsData,
  buildCancelLandingInteractionListContainerViewMetrics,
} from '!domain/screen/account/cancel/cancelLandingMetricsDataBuilder';

// TEMPLATE (step 5): the engine + config
import { fillTemplate, getTemplate } from '!domain/template/templateService';
import {
  CANCEL_LANDING_DEFAULT_TEMPLATE_CONFIGURATION,
  CANCEL_LANDING_TEMPLATE_CONFIGURATION_REQ,
} from '!domain/screen/account/cancel/Constants';`}
      />
      <p>
        Notice the discipline: the service imports <em>wrappers and builders</em>, never a raw GLO
        client, never an inline copy string. Every concern is delegated to the layer that owns it.
        The service&apos;s own code is mostly &quot;which section do I build, and how do I decide its
        contents.&quot;
      </p>

      <h2 id="files">The Files That Make a Screen</h2>
      <p>
        A screen is not one file — it&apos;s a small, predictable set. The &quot;Add a New
        Screen&quot; playbook in <code>CLAUDE.md</code> lists them, and recognizing the set lets you
        navigate any screen instantly.
      </p>
      <MermaidDiagram
        chart={fileLayoutDiagram}
        title="The files that constitute a screen"
        caption="constants + contract type feed the service; the service produces metrics; the route delegates to the service."
        minHeight={320}
      />
      <ArticleTable
        caption="The standard file set for a screen and each file's job."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Owns</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>constants.ts</code></td><td><code>SCREEN_TYPE</code>, <code>DEFAULT_TEMPLATE_CONFIGURATION</code>, <code>CONFIGURATION_REQ</code></td></tr>
            <tr><td><code>models/screens/v1/&lt;screen&gt;/&lt;screen&gt;Data.ts</code></td><td>The template contract type</td></tr>
            <tr><td><code>&lt;screen&gt;Service.ts</code></td><td>The <code>buildXScreen()</code> orchestration</td></tr>
            <tr><td><code>&lt;screen&gt;MetricsDataBuilder.ts</code></td><td>Analytics builders for the screen</td></tr>
            <tr><td><code>routes/.../&lt;screen&gt;.ts</code></td><td>Joi validation + handler delegating to the service</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="registries">Function Registries: A Hard Rule</h2>
      <p>
        When a screen needs orchestration functions registered (for the platform pipeline or shared
        dispatch), there is a hard rule enforced by an ESLint rule
        (<code>local-rules/no-screen-function-registry</code>): <strong>do not create a
        screen-specific function registry</strong> like <code>heroFunctionRegistry.ts</code>. Instead
        register functions in a canonical <em>domain</em> registry —{" "}
        <code>subscriptions</code>, <code>offers</code>, <code>payments</code>,{" "}
        <code>invoices</code>, or <code>ledger</code>. This keeps orchestration functions discoverable
        by domain rather than scattered per-screen. Violating it is a build error, not a style nit.
      </p>

      <h3 id="migration-note">Migrating Screens Run Twice</h3>
      <p>
        Before you modify a screen&apos;s behavior, check{" "}
        <code>src/platform/migrationConfig.ts</code>. If the screen is listed as{" "}
        <code>migrating</code>, both the legacy service (<code>domain/screen/</code>) and the platform
        pipeline (<code>src/platform/</code>) are live behind a feature flag, and{" "}
        <strong>the same behavioral change must be made on both sides</strong>. We devote a whole
        module to the platform migration later; for now, treat it as a mandatory pre-flight check
        before editing a service.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through how a screen is built.'"
        intro="This is the integrative question. Show the five-step shape and the delegation discipline."
        steps={[
          "Frame the service as the orchestrator a route delegates to: buildXScreen({ flexContext, params }) returning a processed { data, metadata } template.",
          "Walk the five steps: parallel fetch (Promise.all) → business decisions → build UI sections with element builders → build metricsData → fillTemplate.",
          "Stress delegation: the service imports domain wrappers and builders, never raw clients or hardcoded copy.",
          "Name the file set: constants, contract type, service, metrics builder, route — the predictable anatomy of any screen.",
          "Close with the two guardrails: no per-screen function registries (ESLint), and check migrationConfig for migrating screens that must change on both sides.",
        ]}
      />

      <h2 id="challenge">Challenge: Orchestrate a Screen</h2>
      <InterviewChallenge
        title="Build a 'pause confirmation' screen"
        scenario={
          <>
            You must build a new <code>pause-confirmation</code> screen. It needs the user&apos;s
            agreement details and the available offers, shows a localized headline and a single
            &quot;Confirm pause&quot; CTA, and emits page + interaction analytics. Outline the service
            using the five-step shape, and call out every place you&apos;d delegate rather than inline.
          </>
        }
        tasks={[
          "Write the step-1 Promise.all fetching agreement details, offers, and the template together.",
          "Show building the CTA with toInteractionElement + toCopy using a Cypher key, not English.",
          "Describe where the headline copy and the analytics come from (which builders/layers).",
          "State the pre-flight check before editing/adding this screen and the registry rule you must not break.",
        ]}
        pitfalls={[
          "Sequential awaits for the three independent fetches.",
          "Hardcoding the headline/CTA text instead of Cypher keys.",
          "Calling the GLO client directly instead of getAgreementDetails/getOffers.",
          "Creating a pause-specific function registry instead of using a canonical domain registry.",
        ]}
        signal="A strong answer fetches in parallel, builds localized elements via builders, delegates data to wrappers, and respects migrationConfig + the registry rule."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          lang="typescript"
          code={`export async function buildPauseConfirmation({ flexContext, params }) {
  const { standardHeaders } = flexContext;

  // Step 1 — parallel fetch.
  const [agreement, offers, template] = await Promise.all([
    getAgreementDetails({ standardHeaders, agreementDetailsRequestData: {} }),
    getOffers({ standardHeaders, retrieveOffersRequest, flexContext }),
    getTemplate({ templateConfiguration: PAUSE_TEMPLATE_CONFIGURATION_REQ }),
  ]);

  // Step 2 — decisions (eligibility/region) using shared domain selectors.

  // Step 3 — build UI with element builders + Cypher keys.
  const confirmCta = toInteractionElement({
    key: 'pause-confirm',
    style: 'primaryButton',
    copy: toCopy({ text: 'pauseConfirmCta', dictionary: 'unified-commerce' }),
    action: /* toPauseAction(...) */,
    metricsData: buildPauseInteractionMetrics(),
  });

  // Step 4 — analytics.
  const metricsData = { pageView: buildPausePage('pause_confirmation') };

  // Step 5 — fill.
  return fillTemplate({
    template,
    templateData: { data: { confirmCta, metricsData } },
  });
}`}
        />
        <p>
          The headline is a <code>toCopy</code> with a Cypher key + dictionary (localized, never
          English). Data comes from <code>getAgreementDetails</code>/<code>getOffers</code> wrappers,
          not raw clients. Analytics come from a colocated{" "}
          <code>pauseConfirmationMetricsDataBuilder.ts</code>. Before adding it, check{" "}
          <code>migrationConfig.ts</code> — if pause is <code>migrating</code>, mirror the change in
          the platform pipeline; and if it needs registered orchestration functions, register them in
          a canonical domain registry (<code>subscriptions</code>), never a{" "}
          <code>pauseFunctionRegistry.ts</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>The service orchestrates; it owns nothing.</strong>{" "}
          <code>buildXScreen({"{ flexContext, params }"})</code> returns a processed{" "}
          <code>{"{ data, metadata }"}</code> template.
        </li>
        <li>
          <strong>Five steps, in order:</strong> parallel fetch → decide → build UI sections → build
          metrics → <code>fillTemplate</code>.
        </li>
        <li>
          <strong>Delegate everything:</strong> domain wrappers for data, element builders for UI,
          metrics builders for analytics — never raw clients or hardcoded copy.
        </li>
        <li>
          <strong>A screen is a file set:</strong> constants, contract type, service, metrics
          builder, route.
        </li>
        <li>
          <strong>No per-screen function registries</strong> (ESLint-enforced) — register in a
          canonical domain registry.
        </li>
        <li>
          <strong>Check <code>migrationConfig.ts</code> first</strong> — migrating screens change on
          both legacy and platform sides.
        </li>
      </ul>
    </div>
  );
}
