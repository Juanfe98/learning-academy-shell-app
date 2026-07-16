import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const metricsShapeDiagram = String.raw`flowchart TD
  SCREEN["Screen response"]
  SCREEN --> PAGE["pageView<br/>buildPageViewMetricsDataV2()"]
  SCREEN --> CONTAINER["containerView<br/>buildContainerViewMetricsDataV2()"]
  CONTAINER --> E0["element[0]"]
  CONTAINER --> E1["element[1]"]
  CONTAINER --> E2["element[2]"]
  E0 --> INT0["interaction<br/>buildInteractionMetricsDataV2({ elementIndex: 0 })"]
  E1 --> INT1["interaction<br/>elementIndex: 1"]
  E2 --> INT2["interaction<br/>elementIndex: 2"]`;

const partnerDiagram = String.raw`flowchart LR
  BUILDER["metricsDataBuilder"]
  BUILDER --> GLIMPSE["Glimpse (default)<br/>eventUrn: urn:dss:...:v2"]
  BUILDER --> ADOBE["ESPN Adobe<br/>adobeData"]
  BUILDER --> HITS["HITS"]
  BUILDER --> TEALIUM["Tealium"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Analytics Are a First-Class Output", level: 2 },
  { id: "three-events", title: "The Three Event Types", level: 2 },
  { id: "v2", title: "The V2 Builders", level: 2 },
  { id: "page", title: "Page View", level: 3 },
  { id: "container", title: "Container View & Element Indexes", level: 3 },
  { id: "interaction", title: "Interaction", level: 3 },
  { id: "indexes", title: "The Sequential Index Gotcha", level: 2 },
  { id: "partners", title: "Partner-Specific Analytics", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Instrument a Screen", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function MetricsAndAnalytics() {
  return (
    <div className="article-content">
      <p>
        Every screen this service returns carries a <code>metricsData</code> block alongside its UI.
        Analytics are not bolted on — they&apos;re a first-class part of the response contract, built
        by generic builders in <code>src/domain/metricsData/</code> and screen-specific builders
        colocated near the relevant screen service. Getting them right matters:
        analytics drive experiment measurement, funnel analysis, and the business decisions that
        justify the whole growth surface. This module covers the three event types, the V2 builders,
        the sequential-index rule that trips people up, and the partner-specific variants.
      </p>

      <h2 id="why">Analytics Are a First-Class Output</h2>
      <p>
        Recall the service&apos;s five-step shape: step 4 is &quot;build <code>metricsData</code>.&quot;
        Many screens have a colocated <code>&lt;screen&gt;MetricsDataBuilder.ts</code> that composes
        the generic metrics helpers into that screen&apos;s payload, and the service folds it into the
        <code>templateData</code> that fills the
        template. Because clients are thin, if the BFF doesn&apos;t emit an analytics event, it
        doesn&apos;t happen — so instrumentation is the service&apos;s responsibility, not the
        client&apos;s.
      </p>

      <h2 id="three-events">The Three Event Types</h2>
      <p>
        The analytics model (built for Glimpse, Disney&apos;s event platform) has three core event
        shapes that nest to describe a screen:
      </p>
      <MermaidDiagram
        chart={metricsShapeDiagram}
        title="Page → Containers → Elements → Interactions"
        caption="A page has containers; a container lists its elements; each interactive element gets an interaction event with its 0-based index."
        minHeight={440}
      />
      <ArticleTable
        caption="The three metrics event types and when each is emitted."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Represents</th>
              <th>Builder</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Page View</td>
              <td>The screen was shown</td>
              <td><code>buildPageViewMetricsDataV2()</code></td>
            </tr>
            <tr>
              <td>Container View</td>
              <td>A section/group of elements was shown</td>
              <td><code>buildContainerViewMetricsDataV2()</code></td>
            </tr>
            <tr>
              <td>Interaction</td>
              <td>A specific element can be / was interacted with</td>
              <td><code>buildInteractionMetricsDataV2()</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="v2">The V2 Builders</h2>
      <p>
        Always use the <strong>V2</strong> builders — the non-V2 variants are marked{" "}
        <code>@deprecated</code> in the source. They live in{" "}
        <code>src/domain/metricsData/metricsDataService.ts</code> and each emits a versioned{" "}
        <code>eventUrn</code>.
      </p>

      <h3 id="page">Page View</h3>
      <CodeBlock
        lang="typescript"
        filename="src/domain/metricsData/metricsDataService.ts"
        code={`export function buildPageViewMetricsDataV2({
  pageId,
  pageKey,
  pageName,
}: {
  pageId: string;
  pageKey: string;
  pageName: string;
}): GenericMetricsData<MetricsDataPageViewPayload> {
  return {
    eventUrn: 'urn:dss:event:glimpse:impression:pageView:v2',
    payload: { pageId, pageKey, pageName },
  };
}`}
      />

      <h3 id="container">Container View &amp; Element Indexes</h3>
      <p>
        A container view describes a section and lists metrics <code>elements</code> inside it, along
        with layout metadata (positions, elements-per-width). These are lightweight analytics element
        descriptors — not the UI element objects themselves — and their indexes are what connect the
        container to its interactions.
      </p>
      <CodeBlock
        lang="typescript"
        filename="buildContainerViewMetricsDataV2 (signature)"
        code={`export function buildContainerViewMetricsDataV2({
  containerKey,
  containerType,
  commerceConditions,
  elements,            // Elements[] — one per element in the container
  elementsPerWidth,
  horizontalPosition,
  verticalPosition,
  notificationType,
}: { /* ... */ }): GenericMetricsData<MetricsDataContainerViewPayload>`}
      />

      <h3 id="interaction">Interaction</h3>
      <p>
        An interaction event describes a single interactive element. The key field to get right is{" "}
        <code>elementIndex</code> — its 0-based position within its container.
      </p>
      <CodeBlock
        lang="typescript"
        filename="buildInteractionMetricsDataV2 (signature)"
        code={`export function buildInteractionMetricsDataV2({
  contentType,
  elementId,
  elementIdType,
  elementIndex,        // 0-based position in the container
  elementName,
  elementType,
  interactionType,
  programType,
  mediaFormatType,
  containerKey,
  destinationPageId,
  visuals,
}: { /* ... */ }): GenericMetricsData<MetricsDataInteractionPayload>`}
      />

      <h2 id="indexes">The Sequential Index Gotcha</h2>
      <p>
        This is the mistake reviewers catch most in analytics code:{" "}
        <strong>elements need sequential, 0-based <code>elementIndex</code> values</strong> that match
        their order in the container. If you build three buttons but index them{" "}
        <code>0, 1, 1</code> (a copy-paste slip) or <code>1, 2, 3</code> (off-by-one), the analytics
        are silently wrong — the screen still renders fine, so it won&apos;t fail a smoke test, but
        the funnel data is corrupted. Index them in the exact order they appear, starting at 0.
      </p>
      <CodeBlock
        lang="typescript"
        filename="right vs wrong indexing"
        code={`// ✅ RIGHT — sequential, 0-based, matching render order
const cta       = buildInteraction({ elementIndex: 0, /* ... */ });
const secondary = buildInteraction({ elementIndex: 1, /* ... */ });
const link      = buildInteraction({ elementIndex: 2, /* ... */ });

// ❌ WRONG — duplicated / off-by-one indexes silently corrupt funnels
const cta       = buildInteraction({ elementIndex: 1 });
const secondary = buildInteraction({ elementIndex: 1 });
const link      = buildInteraction({ elementIndex: 3 });`}
      />

      <h2 id="partners">Partner-Specific Analytics</h2>
      <p>
        Glimpse is the default (the <code>eventUrn</code> payloads above), but some surfaces emit to
        additional systems. The <code>metricsData</code> layer has partner-specific builders —{" "}
        <strong>ESPN Adobe</strong> (the optional <code>adobeData</code> field you saw on{" "}
        <code>InteractionElement</code>), <strong>HITS</strong>, and <strong>Tealium</strong>. A
        screen serving ESPN, for instance, may attach Adobe analytics data in addition to the Glimpse
        events.
      </p>
      <MermaidDiagram
        chart={partnerDiagram}
        title="One builder, multiple analytics destinations"
        caption="Glimpse V2 events are the baseline; ESPN Adobe, HITS, and Tealium are additional partner destinations attached where required."
        minHeight={300}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does this service handle analytics?'"
        intro="Show that analytics are a first-class output with a nested event model and a strict indexing rule."
        steps={[
          "State that metricsData is part of the response contract, usually composed in a screen-specific MetricsDataBuilder using generic helpers and folded into templateData.",
          "Describe the three nested events: page view → container view (lists elements) → interaction (per element).",
          "Insist on the V2 builders (non-V2 are deprecated) emitting versioned Glimpse eventUrns.",
          "Call out the sequential 0-based elementIndex rule and why a wrong index silently corrupts funnels without failing rendering.",
          "Mention partner destinations — ESPN Adobe, HITS, Tealium — layered on top of Glimpse where required.",
        ]}
      />

      <h2 id="challenge">Challenge: Instrument a Screen</h2>
      <InterviewChallenge
        title="Add analytics to a two-button screen"
        scenario={
          <>
            A screen shows a header and a container with two buttons: &quot;Keep plan&quot; (primary)
            and &quot;Cancel anyway&quot; (destructive). It currently emits only a page view. Add the
            container and interaction analytics correctly, and explain the one mistake most likely to
            pass review-by-eyeball but corrupt the data.
          </>
        }
        tasks={[
          "Emit the page view with buildPageViewMetricsDataV2 for the screen.",
          "Build the container view listing both buttons via buildContainerViewMetricsDataV2.",
          "Build an interaction event per button with correct elementIndex values.",
          "Name the silent-corruption mistake and how you'd guard against it in tests.",
        ]}
        pitfalls={[
          "Reusing elementIndex: 0 for both buttons (copy-paste), corrupting the funnel.",
          "Starting elementIndex at 1 instead of 0.",
          "Using the deprecated non-V2 builders.",
          "Forgetting the interaction elements must match the container's element order.",
        ]}
        signal="A strong answer emits page + container + two interactions with elementIndex 0 and 1, uses V2 builders, and asserts the indexes in a behavioral test."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          lang="typescript"
          code={`const pageView = buildPageViewMetricsDataV2({
  pageId: 'cancel_landing',
  pageKey: 'cancel_landing',
  pageName: 'cancel_landing',
});

const keepInteraction = buildInteractionMetricsDataV2({
  contentType: 'button', elementId: 'keep-plan', elementIdType: 'cta',
  elementIndex: 0, elementType: 'button', interactionType: 'tap',
  programType: 'n/a', containerKey: 'cancel-actions',
});
const cancelInteraction = buildInteractionMetricsDataV2({
  contentType: 'button', elementId: 'cancel-anyway', elementIdType: 'cta',
  elementIndex: 1, elementType: 'button', interactionType: 'tap',
  programType: 'n/a', containerKey: 'cancel-actions',
});

const containerView = buildContainerViewMetricsDataV2({
  containerKey: 'cancel-actions', containerType: 'buttonGroup',
  elements: [/* element[0] */, /* element[1] */],
  elementsPerWidth: 1, horizontalPosition: 0, verticalPosition: 1,
});`}
        />
        <p>
          The silent-corruption mistake is duplicating <code>elementIndex</code> (both buttons at{" "}
          <code>0</code>) or starting at <code>1</code> — the screen renders identically, so a visual
          check passes, but the funnel can no longer distinguish the two buttons. Guard it with a{" "}
          <em>behavioral</em> test: assert the built interactions have <code>elementIndex</code> 0 and
          1 in render order — not a snapshot, which would happily lock in the wrong indexes.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Analytics are first-class output.</strong> Built in a colocated
          MetricsDataBuilder, folded into <code>templateData</code>; if the BFF doesn&apos;t emit it,
          it doesn&apos;t happen.
        </li>
        <li>
          <strong>Three nested events:</strong> page view → container view (lists elements) →
          interaction (per element).
        </li>
        <li>
          <strong>Use the V2 builders</strong> (<code>buildPageViewMetricsDataV2</code>,{" "}
          <code>buildContainerViewMetricsDataV2</code>, <code>buildInteractionMetricsDataV2</code>) —
          non-V2 are deprecated.
        </li>
        <li>
          <strong>Sequential 0-based <code>elementIndex</code></strong> matching render order — a
          wrong index silently corrupts funnels. Test it behaviorally.
        </li>
        <li>
          <strong>Partner destinations</strong> — ESPN Adobe, HITS, Tealium — layer on top of Glimpse
          where required.
        </li>
      </ul>
    </div>
  );
}
