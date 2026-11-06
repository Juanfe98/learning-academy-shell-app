import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoTransportsDiagram = String.raw`flowchart TD
  subgraph wx["Transport A — WeaponX headers (client SDK)"]
    H["x-bamtech-weaponx-assignments (base64)"] --> MW["experimentation middleware"]
    MW --> FC["flexContext.experimentation"]
    FC --> GET["getExperimentTreatment({ flexContext, featureId })"]
  end
  subgraph jafar["Transport B — Jafar / testPersona (POP, server-side)"]
    GLO["GLO accountSharingExperienceId()"] --> ENC["testPersona (base64 string)"]
    ENC --> DEC["decode + JSON.parse → testPersona object"]
    DEC --> DIRECT["testPersona.experiments?.[featureId] === variant"]
  end
  GET --> CODE["service branches on treatment"]
  DIRECT --> CODE`;

const decodeFlowDiagram = String.raw`sequenceDiagram
  participant S as Service (getExperienceIdAndPersona)
  participant J as getExperienceIdAndPersonaForRoadblock
  participant GLO as GrowthLifeOrchestratorClient
  participant LD as pop-experiment-overrides (LD)
  S->>J: standardHeaders, useCaching
  J->>GLO: accountSharingExperienceId()
  GLO-->>J: { experienceId, testPersona: base64 }
  J->>J: Buffer.from(base64).toString() + JSON.parse
  J-->>S: { experienceId, testPersona: object }
  S->>LD: getPopExperimentOverrides() (QA only)
  LD-->>S: { featureId: variant } (or {})
  S->>S: merge overrides into testPersona.experiments
  S-->>S: return { experienceId, testPersona }`;

const gateDiagram = String.raw`flowchart TD
  TP["testPersona.experiments"]
  TP --> HELPER["getIsInCYOSPricingExperiment(testPersona)"]
  HELPER --> OR{"flag ON OR in treatment?"}
  OR -->|no + bookworm LRD| HIDE["showOfferDetails = false (control)"]
  OR -->|yes| SHOW["pricing shown (treatment)"]`;

export const toc: TocItem[] = [
  { id: "intro", title: "Two Ways an Experiment Reaches Flex", level: 2 },
  { id: "what-is", title: "What testPersona Actually Is", level: 2 },
  { id: "the-type", title: "The TestPersona Type", level: 3 },
  { id: "lifecycle", title: "Lifecycle: From GLO to a JS Object", level: 2 },
  { id: "decode", title: "Decoding the base64 Blob", level: 3 },
  { id: "overrides", title: "QA Overrides Merge In", level: 3 },
  { id: "reading", title: "Reading testPersona in a Service", level: 2 },
  { id: "undefined", title: "Why Optional Chaining Matters", level: 3 },
  { id: "two-worlds", title: "The Parallel WeaponX World", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function JafarTestPersonaExperiments() {
  return (
    <div className="article-content">
      <p>
        The generic experimentation module teaches the WeaponX-header path:
        assignments arrive as a request header, land on{" "}
        <code>flexContext.experimentation</code>, and you read them with{" "}
        <code>getExperimentTreatment</code>. But the Paid Sharing (POP)
        experiments — the ones that gate the CYOS interstitial, hard-block
        layouts, and offer pricing on Bookworm living-room devices — use a
        completely different transport called <strong>Jafar / testPersona</strong>.
        Confusing the two is the single most common mistake when wiring a POP
        experiment. This module traces the testPersona flow end to end, grounded
        in the real code.
      </p>

      <h2 id="intro">Two Ways an Experiment Reaches Flex</h2>
      <p>
        Both transports use the same WeaponX feature IDs and the same variant
        strings. What differs is <em>how the assignment travels</em> to the
        service. Getting this wrong means your detection helper compiles, passes
        review at a glance, and silently never matches in production.
      </p>
      <MermaidDiagram
        chart={twoTransportsDiagram}
        title="WeaponX headers vs Jafar testPersona"
        caption="Same feature IDs, two transports. POP experiments arrive on the GLO response's testPersona — not on request headers — so they are read directly, not via getExperimentTreatment."
        minHeight={420}
      />
      <ArticleTable
        caption="The two transports side by side — same feature IDs, different plumbing."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th></th>
              <th>WeaponX headers</th>
              <th>Jafar / testPersona</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Who assigns</td>
              <td>Client SDK / WeaponX</td>
              <td>Jafar cohort service (server-side)</td>
            </tr>
            <tr>
              <td>How it arrives</td>
              <td>
                Request header → <code>flexContext.experimentation</code>
              </td>
              <td>Encoded on the GLO account-sharing response</td>
            </tr>
            <tr>
              <td>How you read it</td>
              <td>
                <code>getExperimentTreatment(...)</code>
              </td>
              <td>
                <code>testPersona.experiments?.[featureId] === variant</code>
              </td>
            </tr>
            <tr>
              <td>Typical users</td>
              <td>Most screen experiments</td>
              <td>POP: CYOS, hard block, LRD pricing</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="what-is">What testPersona Actually Is</h2>
      <p>
        <code>testPersona</code> is the blob of per-user data that Jafar decides
        for this request. It rides back inside the GLO account-sharing response,
        base64-encoded. Its most important field is <code>experiments</code>: a
        map of <strong>featureId → variant string</strong>. Jafar computes cohort
        membership server-side (account-based), then hands Flex the resulting
        assignments through this object.
      </p>

      <h3 id="the-type">The TestPersona Type</h3>
      <p>
        The type lives in{" "}
        <code>src/domain/screen/common/experiments/experimentUtils.ts</code>. Two
        things to notice: <code>experiments</code> is optional, and the index
        signature keeps the object open so Jafar can add other fields (like{" "}
        <code>borrowerRepeatBlocked</code>) without a type change.
      </p>
      <CodeBlock
        code={`export type TestPersona = {
  // featureId → variant, e.g. { "wpnx-POP-CYOS-LRD-Pricing---Ads": "show-pricing" }
  experiments?: Record<string, string>;
  // Jafar can attach other per-user fields; the type stays open.
  [key: string]: string | boolean | Record<string, string> | undefined;
};`}
        lang="typescript"
        filename="experimentUtils.ts"
      />

      <h2 id="lifecycle">Lifecycle: From GLO to a JS Object</h2>
      <p>
        A single GLO call returns two sibling things: <code>experienceId</code>{" "}
        (the block type — <code>HARD</code>, <code>NO_BLOCK</code>, etc.) and{" "}
        <code>testPersona</code> (everything else, including experiment
        assignments). The service decodes the blob, optionally merges QA
        overrides, and passes the resulting object down to the feature-set
        builder.
      </p>
      <MermaidDiagram
        chart={decodeFlowDiagram}
        title="testPersona lifecycle"
        caption="One GLO call yields experienceId + an encoded testPersona. The roadblock helper decodes it; the caller merges any LaunchDarkly QA overrides before returning."
        minHeight={440}
      />

      <h3 id="decode">Decoding the base64 Blob</h3>
      <p>
        The decode is deliberately defensive. A malformed blob does not crash the
        request — <code>testPersona</code> simply stays an empty object, and the
        user falls through to control behavior. This is why every detection helper
        must tolerate a missing <code>experiments</code> map.
      </p>
      <CodeBlock
        code={`// experienceIdConversion.ts
const gloResponse =
  await GrowthLifeOrchestratorClient.accountSharingExperienceId(
    standardHeaders,
    useCaching
  );

let testPersona = {};
const encodedTestPersona = gloResponse.testPersona ?? "";

try {
  const buff = Buffer.from(encodedTestPersona, "base64"); // base64 → bytes
  testPersona = JSON.parse(buff.toString());              // bytes → object
} catch (error) {
  // Bad blob → testPersona stays {} → user gets control. No throw.
  logger.error("Unable to parse testPersona from GLO", { encodedTestPersona, error });
}

return { experienceId: gloResponse.experienceId, testPersona };`}
        lang="typescript"
        filename="experienceIdConversion.ts"
      />

      <h3 id="overrides">QA Overrides Merge In</h3>
      <p>
        Real Jafar enrollment is slow to set up for QA, so there is a shortcut:
        the LaunchDarkly flag <code>pop-experiment-overrides</code> maps
        featureId → variant for a targeted test user. The service spreads those
        overrides into <code>testPersona.experiments</code>, so downstream code
        cannot tell the difference between a real Jafar assignment and a QA
        override — exactly the point.
      </p>
      <CodeBlock
        code={`// deviceOutOfHouseholdService.ts — getExperienceIdAndPersona
const [{ experienceId, testPersona }, experimentOverrides] = await Promise.all([
  getExperienceIdAndPersonaForRoadblock({ standardHeaders, useCaching }),
  getPopExperimentOverrides(flexContext).catch(() => ({})),
]);

let testPersonaForRoadblock = testPersona;

if (Object.keys(experimentOverrides).length > 0) {
  testPersonaForRoadblock = {
    ...testPersonaForRoadblock,
    experiments: {
      ...testPersonaForRoadblock.experiments,
      ...experimentOverrides, // QA override wins
    },
  };
}`}
        lang="typescript"
        filename="deviceOutOfHouseholdService.ts"
      />

      <h2 id="reading">Reading testPersona in a Service</h2>
      <p>
        By the time the object reaches a service, it is a plain decoded map. A POP
        detection helper reads it directly — no <code>getExperimentTreatment</code>
        , no <code>flexContext.experimentation</code>. Here is the real helper for
        the CYOS LRD pricing experiment: two legs (Ads / No-Ads) OR together
        because they render identically and the split exists only for measurement.
      </p>
      <CodeBlock
        code={`// experiments/deviceOutOfHouseholdInterstitialService.ts
export function getIsInCYOSPricingExperiment(
  testPersona: TestPersona
): boolean {
  return (
    testPersona.experiments?.[CYOSLRDPricingAds] === "show-pricing" ||
    testPersona.experiments?.[CYOSLRDPricingNoAds] === "show-pricing"
  );
}`}
        lang="typescript"
        filename="deviceOutOfHouseholdInterstitialService.ts"
      />
      <p>
        The boolean then ORs with the existing feature flag in the one gate that
        suppresses pricing — treatment users behave exactly as if the flag were
        ON, without disturbing the mobile or device guards around it.
      </p>
      <CodeBlock
        code={`const showPricing = showPricingOnBookwormLRDs || isInCYOSPricingExperiment;
if (!showPricing && isGoogleBookworm && isBookworm(device)) {
  showOfferDetails = false; // suppress only when neither flag nor experiment wants pricing
}`}
        lang="typescript"
        filename="deviceOutOfHouesholdInterstitialService.ts"
      />
      <MermaidDiagram
        chart={gateDiagram}
        title="testPersona → detection helper → gate"
        caption="The decoded map drives a boolean, which ORs with the flag. Any single 'yes' keeps pricing on; suppression fires only when both are 'no' on a Bookworm LRD."
        minHeight={360}
      />

      <h3 id="undefined">Why Optional Chaining Matters</h3>
      <p>
        <code>experiments</code> is optional, and a failed decode leaves{" "}
        <code>testPersona</code> as <code>{"{}"}</code>. So{" "}
        <code>testPersona.experiments?.[featureId]</code> can be{" "}
        <code>undefined</code>, and <code>undefined === "show-pricing"</code> is{" "}
        <code>false</code>. That is the safe default: no assignment, bad blob, or
        un-enrolled user all fall cleanly to control. Dropping the <code>?.</code>{" "}
        would throw <code>Cannot read properties of undefined</code> on any user
        without an experiments map — which is most users.
      </p>

      <h2 id="two-worlds">The Parallel WeaponX World</h2>
      <p>
        There is a bridge between the two transports. So that template
        configuration (which only understands the WeaponX shape) can also react to
        Jafar assignments, <code>mapJafarSDKAssignmentsToWeaponXExperiments</code>{" "}
        reshapes <code>testPersona.experiments</code> (
        <code>featureId → &quot;variant&quot;</code>) into the WeaponX shape (
        <code>featureId → {"{ variant_id, version }"}</code>) and merges it into{" "}
        <code>flexContext.experimentation</code>. Service code still reads the raw{" "}
        <code>testPersona</code>; the bridge only exists for template selection.
      </p>
      <CodeBlock
        code={`export function mapJafarSDKAssignmentsToWeaponXExperiments({
  experimentation,
  testPersona,
}: {
  experimentation: WeaponXExperiment | undefined;
  testPersona: Record<string, any>;
}): WeaponXExperiment {
  const jafarExperiments: Record<string, WeaponXVariant> = {};

  if (testPersona.experiments) {
    Object.keys(testPersona.experiments).forEach((featureId) => {
      jafarExperiments[featureId] = {
        variant_id: testPersona.experiments[featureId],
        version: 1,
      };
    });
  }

  return {
    experiments: { ...experimentation?.experiments, ...jafarExperiments },
  };
}`}
        lang="typescript"
        filename="experimentUtils.ts"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          POP experiments use the <strong>Jafar / testPersona</strong> transport,
          not the WeaponX-header transport. Read them with{" "}
          <code>testPersona.experiments?.[featureId] === variant</code> — never{" "}
          <code>getExperimentTreatment</code>.
        </li>
        <li>
          <code>testPersona</code> is a base64 blob on the GLO account-sharing
          response, decoded to a JS object. Its <code>experiments</code> field is
          a <code>featureId → variant</code> map.
        </li>
        <li>
          Decoding is defensive: a bad blob leaves <code>{"{}"}</code>, so users
          fall through to control instead of crashing.
        </li>
        <li>
          The LaunchDarkly flag <code>pop-experiment-overrides</code> merges into{" "}
          <code>testPersona.experiments</code> for QA — indistinguishable from a
          real assignment downstream.
        </li>
        <li>
          Always use optional chaining (<code>?.</code>) — <code>experiments</code>{" "}
          is optional, and <code>undefined === variant</code> is a safe{" "}
          <code>false</code>.
        </li>
        <li>
          <code>mapJafarSDKAssignmentsToWeaponXExperiments</code> bridges Jafar
          assignments into the WeaponX shape only so template config can select a
          variant; service code reads the raw <code>testPersona</code>.
        </li>
      </ul>
    </div>
  );
}
