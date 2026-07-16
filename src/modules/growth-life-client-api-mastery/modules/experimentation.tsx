import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dataFlowDiagram = String.raw`flowchart TD
  HDR["x-bamtech-weaponx-assignments<br/>(base64)<br/>or Spearmint fallback"]
  API["WeaponX Assignments API<br/>(when direct-api flag is enabled)"]
  HDR --> MW["experimentation middleware<br/>resolves assignments"]
  API --> MW
  MW --> FC["flexContext.experimentation<br/>{ experiments: { featureId: { variant_id } } }"]
  FC --> GET["getExperimentTreatment({ flexContext, featureId })"]
  GET --> RES{"assignment?"}
  RES -->|yes| VAR["Variants<T> (e.g. 'variant-a')"]
  RES -->|no| UNDEF["undefined"]
  VAR --> HELPER["isInMyExperiment() → boolean"]
  UNDEF --> HELPER`;

const threeFilesDiagram = String.raw`flowchart LR
  subgraph lib["src/lib/experiments/"]
    V["variants.ts<br/>add treatment array"]
    R["registry.ts<br/>add featureId + JSDoc"]
    T["treatment.ts<br/>shared getExperimentTreatment()"]
  end
  subgraph screen["screen/[domain]/[screen]/experiments/"]
    H["detection helpers<br/>+ variant builders"]
  end
  subgraph models["domain/models/featureSet.ts"]
    FS["experiment boolean interfaces"]
  end
  T --> H
  R --> H
  H --> FS`;

const featureSetDiagram = String.raw`flowchart TD
  SVC["Main service"]
  SVC --> RESOLVE["Resolve treatment ONCE:<br/>isInMyExperiment(flexContext)"]
  RESOLVE --> STORE["Store boolean in FeatureSet"]
  STORE --> PASS["Pass featureSet to ALL builders"]
  PASS --> B1["section builder branches"]
  PASS --> B2["metricsDataBuilder branches"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Experiments Measure, Flags Gate", level: 2 },
  { id: "data-flow", title: "How a Treatment Reaches Your Code", level: 2 },
  { id: "three-files", title: "The Three Definition Files", level: 2 },
  { id: "detection", title: "Detection Helpers", level: 2 },
  { id: "undefined", title: "The undefined Trap", level: 3 },
  { id: "featureset", title: "The FeatureSet Pattern", level: 2 },
  { id: "config-vs-code", title: "Template Config vs Service Code", level: 2 },
  { id: "lifecycle", title: "Lifecycle: Initialize, Cleanup, Productionalize", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Wire an Experiment", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function Experimentation() {
  return (
    <div className="article-content">
      <p>
        Experimentation is where Flex earns the &quot;growth&quot; in its name. WeaponX assigns users
        to treatment buckets; the service reads those assignments and serves the right variant of a
        screen. This is the most convention-heavy area of the codebase — <code>EXPERIMENTATION.md</code>{" "}
        is the single source of truth — because a botched experiment corrupts measurement or leaks a
        variant to the wrong users. This module gives you the full mental model: the data flow, the
        three definition files, the FeatureSet pattern, and the lifecycle.
      </p>

      <h2 id="why">Experiments Measure, Flags Gate</h2>
      <p>
        From the last module: a flag answers &quot;is X on?&quot;; an experiment answers &quot;which
        variant wins?&quot; Experiments are backed by <strong>WeaponX</strong>, assign users to{" "}
        <strong>treatments</strong> (e.g. <code>control</code>, <code>variant-a</code>), and exist{" "}
        <em>only</em> on the screen side — never in executions. You test what a user sees.
      </p>

      <h2 id="data-flow">How a Treatment Reaches Your Code</h2>
      <p>
        Recall from module 2 that experiment assignments historically arrive as a base64 WeaponX
        header, with Spearmint as a fallback. The current middleware can also use the WeaponX
        Assignments API as the source of truth when the direct-api feature flag is enabled, and it
        re-encodes those assignments for downstream GLO calls. Either way, the service-facing result
        is the same: <code>flexContext.experimentation</code>.
      </p>
      <MermaidDiagram
        chart={dataFlowDiagram}
        title="From WeaponX header to a treatment boolean"
        caption="The middleware decodes assignments onto flexContext.experimentation; getExperimentTreatment resolves the variant — or undefined if the user has no assignment."
        minHeight={460}
      />
      <p>
        The <code>flexContext.experimentation</code> shape is a map of feature id → assigned variant:
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/middlewares/models/WeaponX.ts"
        code={`export type WeaponXVariant = {
  variant_id: string;
  version: number;
};

export type WeaponXExperiment = {
  experiments: {
    [featureId: string]: WeaponXVariant;
  };
};`}
      />

      <h2 id="three-files">The Three Definition Files</h2>
      <p>
        Experiment definitions are centralized under <code>src/lib/experiments/</code>. When you
        initialize an experiment, you usually add entries to two files — <code>variants.ts</code> and
        <code>registry.ts</code> — while using the shared resolver in <code>treatment.ts</code>. This
        is the skeleton you follow when initializing an experiment.
      </p>
      <MermaidDiagram
        chart={threeFilesDiagram}
        title="Where an experiment is defined"
        caption="lib/experiments declares treatments and feature IDs; treatment.ts provides the shared resolver; the screen's experiments/ folder holds detection + variant builders; featureSet.ts holds boolean interfaces."
        minHeight={360}
      />
      <ArticleTable
        caption="The src/lib/experiments files and what each contributes."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>File</th><th>Declares</th></tr>
          </thead>
          <tbody>
            <tr><td><code>variants.ts</code></td><td>Add the treatment array: <code>['control', 'variant-a'] as const</code></td></tr>
            <tr><td><code>registry.ts</code></td><td>Add the feature id constant + JSDoc (dev name, WeaponX Prod/Staging links, product owner)</td></tr>
            <tr><td><code>treatment.ts</code></td><td>Shared <code>getExperimentTreatment()</code> resolver — normally used, not edited per experiment</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <CodeBlock
        lang="typescript"
        filename="variants.ts + registry.ts"
        code={`// variants.ts
/** FeatureIds: [wpnx-my-experiment]. */
export const MyExperimentTreatments = ['control', 'variant-a'] as const;

// registry.ts
/**
 * Dev: Name.
 * Experiment: wpnx-my-experiment.
 * WeaponXLink Prod: {@link https://weaponx.disneystreaming.com/experiments/UUID/details}
 * WeaponXLink Staging: {@link https://weaponx.disneystreaming.com/experiments/UUID/details}
 * Product Owner: Name.
 */
export const MyExperiment = 'wpnx-my-experiment';`}
      />

      <h2 id="detection">Detection Helpers</h2>
      <p>
        Business logic doesn&apos;t live in <code>lib/experiments/</code> — that only <em>defines</em>{" "}
        experiments. The <em>detection helpers</em> and <em>variant builders</em> live in the
        screen&apos;s own <code>experiments/</code> folder (<code>screen/[domain]/[screen]/experiments/</code>,
        or <code>screen/common/experiments/</code> for shared ones like <code>lowerForLonger.ts</code>).
        A detection helper turns a treatment into a boolean:
      </p>
      <CodeBlock
        lang="typescript"
        filename="screen/[domain]/[screen]/experiments/[experimentFile].ts"
        code={`import { getExperimentTreatment } from '!lib/experiments';
import { MyExperiment } from '!lib/experiments/registry';

// TODO TICKET-123: Cleanup MyExperiment
/** Checks whether user is in MyExperiment. */
export const isInMyExperiment = (flexContext: FlexContext): boolean =>
  getExperimentTreatment({ flexContext, featureId: MyExperiment }) ===
  'variant-a';`}
      />
      <p>
        Note the <code>// TODO TICKET-123: Cleanup</code> marker — like flags, experiments are
        expected to be removed, and the cleanup ticket is tagged at every touch point so nothing gets
        orphaned.
      </p>

      <h3 id="undefined">The undefined Trap</h3>
      <p>
        <code>getExperimentTreatment()</code> returns <code>Variants&lt;T&gt; | undefined</code> — and{" "}
        <strong>it returns <code>undefined</code> when the user has no assignment at all</strong>{" "}
        (not enrolled). This is the single most common experiment bug: if your detection helper does{" "}
        <code>treatment !== 'control'</code>, an unenrolled user (<code>undefined</code>) wrongly
        counts as &quot;in a variant.&quot; Always compare against the specific treatment you want
        (<code>=== 'variant-a'</code>), so <code>undefined</code> correctly falls through to control
        behavior.
      </p>

      <h2 id="featureset">The FeatureSet Pattern</h2>
      <p>
        The canonical way to carry experiment state through a service is the <strong>FeatureSet
        pattern</strong>: resolve the treatment <em>once</em> into a boolean, store it in the
        screen&apos;s FeatureSet, and pass that FeatureSet to every builder. Builders branch on the
        boolean — they never re-resolve the treatment. This keeps the &quot;am I in the
        experiment?&quot; decision in exactly one place.
      </p>
      <MermaidDiagram
        chart={featureSetDiagram}
        title="FeatureSet: resolve once, pass everywhere"
        caption="The main service resolves the treatment into a boolean and threads the FeatureSet through all builders — no builder calls getExperimentTreatment itself."
        minHeight={380}
      />
      <CodeBlock
        lang="typescript"
        filename="the FeatureSet pattern (3 steps)"
        code={`// 1. Interface in models/featureSet.ts
export interface IsInMyExperiment { isInMyExperiment: boolean; }

// 2. Compose into the screen's FeatureSet
export interface MyScreenFeatureSet
  extends ShowStepperFeature, EnableDisplayPrice, IsInMyExperiment {}

// 3. Populate in the main service (async flags via Promise.all)
const [enableSomeFlag] = await Promise.all([getSomeFlagValue(flexContext)]);
const featureSet: MyScreenFeatureSet = {
  enableSomeFlag,
  isInMyExperiment: isInMyExperiment(flexContext),  // resolved ONCE
};

// 4. Pass featureSet to builders; they branch on the boolean
const section = featureSet.isInMyExperiment
  ? buildVariantSection(flexContext, offer)
  : buildControlSection(offer);`}
      />

      <h2 id="config-vs-code">Template Config vs Service Code</h2>
      <p>
        A key judgment call: not every experiment needs service code. <code>EXPERIMENTATION.md</code>{" "}
        says to <strong>prioritize template configuration</strong> when the variation is purely
        static.
      </p>
      <ArticleTable
        caption="Template config alone vs service code required."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Template config is enough</th><th>Service code is required</th></tr>
          </thead>
          <tbody>
            <tr><td>Swapping static Cypher keys</td><td>Runtime data: offer prices, subscription state, entitlements</td></tr>
            <tr><td>Different template layouts</td><td>Dynamic Cypher variables (<code>toCurrencyVariable</code>, <code>toDateVariable</code>)</td></tr>
            <tr><td>Static data overlays (copy, structure)</td><td>Region/country gating; conditional show/hide on business data</td></tr>
            <tr><td></td><td>Programmatic elements (badges, strikethrough prices)</td></tr>
            <tr><td></td><td>Combined experiment + flag logic</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        In config, you add the experiment&apos;s feature id to <code>experimentFeatureIds</code> and
        add variant entries under <code>templates</code> (v1) or <code>templatesV2</code> (v2), keyed
        by WeaponX <code>variant_id</code>. Most real experiments need <strong>both</strong>: config
        for the static differences, service code for the dynamic behavior.
      </p>

      <h2 id="lifecycle">Lifecycle: Initialize, Cleanup, Productionalize</h2>
      <p>
        Experiments have three playbooks in <code>EXPERIMENTATION.md</code>. Knowing which one
        you&apos;re running keeps you from leaving orphans.
      </p>
      <ArticleTable
        caption="The three experiment lifecycle playbooks."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Playbook</th><th>When</th><th>End state</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Initialize</strong></td>
              <td>Starting an experiment</td>
              <td>3 lib files + screen experiments/ + FeatureSet + template config variants</td>
            </tr>
            <tr>
              <td><strong>Cleanup</strong></td>
              <td>Experiment failed / control won</td>
              <td>All experiment code removed; revert to control behavior</td>
            </tr>
            <tr>
              <td><strong>Productionalize</strong></td>
              <td>A non-control variant won</td>
              <td>Winning variant inlined as unconditional default; experiment scaffolding removed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Both cleanup and productionalize start the same way: <strong>find all references</strong>{" "}
        (experiment name, FeatureSet field, interface, ticket TODOs) and remove from{" "}
        <code>registry.ts</code> + <code>variants.ts</code>. The difference is whether you revert to
        control (cleanup) or make the winner the new unconditional path (productionalize). In both,
        the code should end up reading <em>as if the experiment never existed</em>.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does experimentation work in this service?'"
        intro="Show the data flow, the FeatureSet pattern, the undefined trap, and the config-vs-code judgment."
        steps={[
          "Trace the data: WeaponX header/Spearmint fallback or WeaponX Assignments API → middleware resolves onto flexContext.experimentation → getExperimentTreatment resolves the variant (or undefined).",
          "Name the lib/experiments pieces: add treatments in variants.ts and feature ID/JSDoc in registry.ts, use shared treatment.ts, plus the screen's experiments/ folder for detection helpers and variant builders.",
          "Explain the FeatureSet pattern: resolve the treatment once into a boolean, store it, pass featureSet to all builders which branch on it.",
          "Call out the undefined trap: compare against the specific treatment (=== 'variant-a'), so unenrolled users fall through to control.",
          "Distinguish template config (static swaps) from service code (dynamic data), note most need both, and mention the initialize/cleanup/productionalize lifecycle — experiments only exist on screens.",
        ]}
      />

      <h2 id="challenge">Challenge: Wire an Experiment</h2>
      <InterviewChallenge
        title="Add a 'strikethrough pricing' experiment to the cancel screen"
        scenario={
          <>
            Product wants to test showing a strikethrough original price next to the promo price on
            the cancel screen, measured as <code>control</code> vs{" "}
            <code>variant-strikethrough</code>. Outline the full wiring, and specifically address:
            where the treatment is resolved, why the strikethrough needs service code, and the one
            comparison mistake that would mis-bucket unenrolled users.
          </>
        }
        tasks={[
          "List the lib/experiments changes: treatment array in variants.ts, feature ID/JSDoc in registry.ts, and use of shared treatment.ts.",
          "Write the detection helper and explain the correct treatment comparison (and the undefined trap).",
          "Explain why strikethrough pricing needs service code, not just template config.",
          "Describe the FeatureSet wiring: resolve once, store, pass to builders + metricsDataBuilder.",
        ]}
        pitfalls={[
          "Using treatment !== 'control', so unenrolled (undefined) users count as variant.",
          "Trying to do it in template config alone when the strikethrough price is runtime data.",
          "Re-resolving the treatment inside each builder instead of storing one boolean in FeatureSet.",
          "Forgetting the cleanup TODO/ticket markers.",
        ]}
        signal="A strong answer resolves the treatment once via a detection helper (=== 'variant-strikethrough'), stores it in FeatureSet, uses service code for the dynamic price, and threads featureSet to all builders."
      />
      <SolutionReveal difficulty="hard">
        <p>
          Define <code>CancelStrikethroughTreatments = ['control', 'variant-strikethrough'] as const</code>{" "}
          in <code>variants.ts</code>, the <code>wpnx-...</code> id + JSDoc in <code>registry.ts</code>,
          and rely on the shared <code>getExperimentTreatment</code> in <code>treatment.ts</code>. In{" "}
          <code>screen/account/cancel/experiments/</code> write:
        </p>
        <CodeBlock
          lang="typescript"
          code={`// TODO GCIEX-XXXX: Cleanup CancelStrikethrough
export const isInCancelStrikethrough = (flexContext: FlexContext): boolean =>
  getExperimentTreatment({ flexContext, featureId: CancelStrikethrough }) ===
  'variant-strikethrough';   // NOT !== 'control'`}
        />
        <p>
          The <code>=== 'variant-strikethrough'</code> comparison is the key: an unenrolled user
          resolves to <code>undefined</code>, which is not equal to the variant, so they correctly
          get control. Using <code>!== 'control'</code> would bucket every unenrolled user into the
          variant and poison the measurement.
        </p>
        <p>
          It needs <strong>service code</strong> because the strikethrough is a real runtime price —
          you compute it from <code>FlexOffer</code> data and build a strikethrough price element with{" "}
          <code>toCurrencyVariable</code>; template config only stores static keys, not a calculated
          price. Wire it via FeatureSet: add <code>IsInCancelStrikethrough</code> to{" "}
          <code>featureSet.ts</code>, compose it into the cancel screen&apos;s FeatureSet, populate{" "}
          <code>isInCancelStrikethrough: isInCancelStrikethrough(flexContext)</code> once in the
          service, and pass <code>featureSet</code> to both the section builder and the
          metricsDataBuilder so analytics can attribute the variant. Static parts (a variant template
          layout) go in the template config&apos;s <code>templates</code> keyed by the{" "}
          <code>variant_id</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Experiments measure variants (WeaponX)</strong>; they live only on screens, never
          in executions.
        </li>
        <li>
          <strong>Data flow:</strong> base64 header → middleware → <code>flexContext.experimentation</code>{" "}
          → <code>getExperimentTreatment()</code> → variant or <code>undefined</code>.
        </li>
        <li>
          <strong>Experiment definitions live in <code>lib/experiments/</code>:</strong> add
          treatments in <code>variants.ts</code>, feature IDs in <code>registry.ts</code>, and use the
          shared resolver in <code>treatment.ts</code>; detection helpers + variant builders live in
          the screen&apos;s <code>experiments/</code> folder.
        </li>
        <li>
          <strong>The undefined trap:</strong> compare <code>=== 'variant-x'</code>, never{" "}
          <code>!== 'control'</code>, or unenrolled users get mis-bucketed.
        </li>
        <li>
          <strong>FeatureSet pattern:</strong> resolve the treatment once into a boolean, store it,
          pass <code>featureSet</code> to all builders.
        </li>
        <li>
          <strong>Config vs code:</strong> template config for static swaps, service code for dynamic
          data — most experiments need both.
        </li>
        <li>
          <strong>Three lifecycle playbooks:</strong> initialize, cleanup (revert to control),
          productionalize (inline the winner). End state reads as if the experiment never existed.
        </li>
      </ul>
    </div>
  );
}
