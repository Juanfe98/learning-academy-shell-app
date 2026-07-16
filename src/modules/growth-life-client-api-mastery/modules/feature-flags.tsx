import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoFileDiagram = String.raw`flowchart LR
  subgraph def["constants.ts"]
    KEY["1. Add key to FlagKeys union"]
    OBJ["2. Define FeatureFlag object<br/>{ key, defaultValue } + JSDoc"]
  end
  subgraph get["featureFlags.ts"]
    GETTER["3. Add getter<br/>getFeatureFlagValue({ ...flagObject, flexContext })"]
  end
  subgraph use["service"]
    CONSUME["4. Consume in Promise.all"]
  end
  KEY --> OBJ --> GETTER --> CONSUME
  LD["LaunchDarkly"] -.->|resolves value| GETTER`;

const flagVsExpDiagram = String.raw`flowchart TD
  Q{"Rolling out a<br/>capability or<br/>measuring a variant?"}
  Q -->|capability on/off| FLAG["Feature Flag<br/>LaunchDarkly<br/>boolean gate"]
  Q -->|measure variants| EXP["Experiment<br/>WeaponX<br/>treatment buckets"]
  FLAG --> F2["defaultValue when unresolved"]
  EXP --> E2["getExperimentTreatment"]`;

export const toc: TocItem[] = [
  { id: "why", title: "What Feature Flags Are For", level: 2 },
  { id: "two-file", title: "The Two-File Pattern", level: 2 },
  { id: "define", title: "1–2. Define the Flag", level: 3 },
  { id: "getter", title: "3. Add the Getter", level: 3 },
  { id: "consume", title: "4. Consume in a Service", level: 3 },
  { id: "jsdoc", title: "The JSDoc Is Not Optional", level: 2 },
  { id: "flag-vs-exp", title: "Flags vs Experiments", level: 2 },
  { id: "testing", title: "Testing With Flags", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Flag Cleanly", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function FeatureFlags() {
  return (
    <div className="article-content">
      <p>
        Feature flags are how this service ships code dark, rolls out gradually, and kills a feature
        instantly without a deploy. They&apos;re backed by LaunchDarkly and follow a strict two-file
        pattern that keeps every flag typed, documented, and cleanup-tracked. This module teaches you
        to add and consume a flag correctly — and, just as importantly, when a flag is the wrong tool
        and you actually want an experiment.
      </p>

      <h2 id="why">What Feature Flags Are For</h2>
      <p>
        A feature flag is a runtime boolean (occasionally a richer value) that gates a capability. It
        answers &quot;is feature X on for this request?&quot; The value is resolved from LaunchDarkly,
        with a <strong>default</strong> baked into the code so the service behaves sanely even if
        LaunchDarkly is unreachable. Flags let product turn things on/off per region, per rollout
        percentage, per anything LaunchDarkly can target — no code change required.
      </p>

      <h2 id="two-file">The Two-File Pattern</h2>
      <p>
        <code>CLAUDE.md</code> is explicit: adding a flag touches exactly two files. Skip either and
        it won&apos;t work.
      </p>
      <MermaidDiagram
        chart={twoFileDiagram}
        title="The two-file flag pattern"
        caption="Define the key + FeatureFlag object in constants.ts; add a getter in featureFlags.ts; consume it in a service's Promise.all."
        minHeight={360}
      />

      <h3 id="define">1–2. Define the Flag</h3>
      <p>
        In <code>src/lib/featureFlags/constants.ts</code>, first add the string key to the{" "}
        <code>FlagKeys</code> union (a big union of every allowed flag key — this is what makes flag
        keys typo-proof), then define the <code>FeatureFlag</code> object with its key, default, and
        the mandatory JSDoc.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/lib/featureFlags/constants.ts"
        code={`// 1. Add to the FlagKeys union
export type FlagKeys =
  | 'bookworm'
  | 'enable-get-invoices-v2'
  | 'my-flag-key';            // <-- your new key

// 2. Define the FeatureFlag object with required JSDoc
/** Description of the feature.
 * Expected expiration date: YYYY-MM-DD
 * Expected final state: true/false.
 * Cleanup ticket: GREAT-XXXX.
 * Launch Darkly: {@link https://app.launchdarkly.com/projects/growthLifeClientAPI/flags/my-flag-key}.
 */
export const myFlagKey: FeatureFlag<boolean> = {
  key: 'my-flag-key',
  defaultValue: false,
};`}
      />

      <h3 id="getter">3. Add the Getter</h3>
      <p>
        In <code>src/lib/featureFlags/featureFlags.ts</code>, add a getter that wraps{" "}
        <code>getFeatureFlagValue()</code>. For new flags, pass <code>flexContext</code> rather than
        raw headers — older getters still use headers/user ids, but comments in the real file say not
        to create new flags that way because request context gives richer targeting.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/lib/featureFlags/featureFlags.ts"
        code={`export const getMyFlag = (flexContext: FlexContext): Promise<boolean> =>
  getFeatureFlagValue<boolean>({
    ...myFlagKey,
    flexContext,
  });`}
      />
      <p>
        The generic on <code>getFeatureFlagValue&lt;T&gt;</code> matches the flag&apos;s value type —
        most are <code>boolean</code>, but some resolve richer types (you saw{" "}
        <code>getFeatureFlagValue&lt;NonTieringUnifiedCountries&gt;</code> in the source).
      </p>

      <h3 id="consume">4. Consume in a Service</h3>
      <p>
        Services read flags alongside their other fetches — <strong>in the same{" "}
        <code>Promise.all</code></strong>, never as an extra sequential await. The flag value then
        drives a branch or is stashed in the screen&apos;s FeatureSet.
      </p>
      <CodeBlock
        lang="typescript"
        filename="consuming a flag in a service"
        code={`const [offers, template, enableMyFeature] = await Promise.all([
  getOffers({ standardHeaders, retrieveOffersRequest, flexContext }),
  getTemplate({ templateConfiguration }),
  getMyFlag(flexContext),
]);

if (enableMyFeature) {
  // new path
}`}
      />

      <h2 id="jsdoc">The JSDoc Is Not Optional</h2>
      <p>
        That JSDoc block is a real convention, not decoration. It records the{" "}
        <strong>expected expiration date</strong>, the <strong>expected final state</strong> (will
        this flag end up permanently true or false?), the <strong>cleanup ticket</strong>, and a
        direct <strong>LaunchDarkly link</strong>. This is how the team prevents flag rot — the
        graveyard of stale flags nobody dares delete. When you add a flag you are also committing to
        its removal.
      </p>

      <h2 id="flag-vs-exp">Flags vs Experiments</h2>
      <p>
        Flags and experiments look similar (both gate behavior) but answer different questions. Using
        the wrong one is a design mistake, so be deliberate.
      </p>
      <MermaidDiagram
        chart={flagVsExpDiagram}
        title="Feature flag vs experiment — different questions"
        caption="Flags gate a capability (on/off, backed by LaunchDarkly). Experiments measure variants (treatment buckets, backed by WeaponX)."
        minHeight={340}
      />
      <ArticleTable
        caption="When to reach for a feature flag vs an experiment."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th></th><th>Feature Flag</th><th>Experiment</th></tr>
          </thead>
          <tbody>
            <tr><td>Question</td><td>&quot;Is X on?&quot;</td><td>&quot;Which variant performs better?&quot;</td></tr>
            <tr><td>Backed by</td><td>LaunchDarkly</td><td>WeaponX</td></tr>
            <tr><td>Value</td><td>boolean (usually) + default</td><td>treatment bucket</td></tr>
            <tr><td>Lives in</td><td><code>lib/featureFlags/</code></td><td><code>lib/experiments/</code> + screen <code>experiments/</code></td></tr>
            <tr><td>Goal</td><td>Rollout / kill-switch</td><td>Measurement</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The next module covers experiments in full. The two even combine — a service can read a flag{" "}
        <em>and</em> a treatment in the same <code>Promise.all</code> and branch on both.
      </p>

      <h2 id="testing">Testing With Flags</h2>
      <p>
        Flags are globally mocked to their defaults in <code>jest.setup.ts</code>, so tests start
        from the default state. To exercise the on-path, override the specific getter:
      </p>
      <CodeBlock
        lang="typescript"
        filename="overriding a flag in a test"
        code={`jest.mocked(getMyFlag).mockResolvedValue(true);
// now the service takes the enabled branch`}
      />
      <p>
        This is why you write a getter per flag rather than calling{" "}
        <code>getFeatureFlagValue</code> inline in services — the getter is the mockable seam.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do feature flags work in this service?'"
        intro="Show the two-file pattern, the default-value safety, the cleanup discipline, and the flag-vs-experiment distinction."
        steps={[
          "Two files: define the key in the FlagKeys union + a FeatureFlag object (key, defaultValue, JSDoc) in constants.ts; add a getter using getFeatureFlagValue({ ...flagObject, flexContext }) in featureFlags.ts.",
          "Explain defaultValue: the service behaves sanely if LaunchDarkly is unreachable.",
          "Consume flags inside the service's Promise.all — never a trailing await — and branch or store in FeatureSet.",
          "Stress the mandatory JSDoc (expiration, final state, cleanup ticket, LaunchDarkly link) as anti-rot discipline.",
          "Distinguish flags (LaunchDarkly, capability on/off) from experiments (WeaponX, measure variants) and note they can combine.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Flag Cleanly</h2>
      <InterviewChallenge
        title="Gate a new billing section behind a flag"
        scenario={
          <>
            Product wants a new billing-breakdown section shown only while it&apos;s being rolled
            out, killable instantly if it misbehaves. Walk through adding the flag end-to-end and
            consuming it in the billing screen service, and name what you&apos;re committing to
            beyond just turning it on.
          </>
        }
        tasks={[
          "List the two files you touch and exactly what goes in each.",
          "Show the getter and how the service consumes the flag (with the parallelism rule).",
          "Explain the role of defaultValue for a kill-switch-style rollout flag.",
          "State what the JSDoc commits you to, and how you'd test both the on and off paths.",
        ]}
        pitfalls={[
          "Adding the FeatureFlag object but forgetting the FlagKeys union entry (or vice versa).",
          "Consuming the flag as a trailing await instead of inside Promise.all.",
          "Omitting the cleanup JSDoc, creating a future stale flag.",
          "Calling getFeatureFlagValue inline instead of via a getter, losing the mock seam.",
        ]}
        signal="A strong answer touches both files, uses a getter consumed in Promise.all, sets a sane defaultValue, writes the cleanup JSDoc, and tests both paths by overriding the getter."
      />
      <SolutionReveal difficulty="easy">
        <CodeBlock
          lang="typescript"
          code={`// constants.ts — 1) union, 2) object + JSDoc
export type FlagKeys = /* ... */ | 'enable-billing-breakdown';

/** Show the new billing breakdown section during rollout.
 * Expected expiration date: 2026-10-01
 * Expected final state: true.
 * Cleanup ticket: GREAT-1234.
 * Launch Darkly: {@link https://app.launchdarkly.com/projects/growthLifeClientAPI/flags/enable-billing-breakdown}.
 */
export const enableBillingBreakdown: FeatureFlag<boolean> = {
  key: 'enable-billing-breakdown',
  defaultValue: false,   // off by default = safe kill-switch state
};

// featureFlags.ts — 3) getter
export const getEnableBillingBreakdown = (flexContext: FlexContext) =>
  getFeatureFlagValue<boolean>({ ...enableBillingBreakdown, flexContext });

// billingService.ts — 4) consume in Promise.all
const [invoices, template, enableBreakdown] = await Promise.all([
  getInvoices({ standardHeaders }),
  getTemplate({ templateConfiguration }),
  getEnableBillingBreakdown(flexContext),
]);`}
        />
        <p>
          <code>defaultValue: false</code> means if LaunchDarkly is down, the section stays off — the
          safe state for a rollout. The JSDoc commits you to an expiration date, a final state, and a
          cleanup ticket, so this flag doesn&apos;t become permanent debt. Test both paths: the
          default (off) comes free from <code>jest.setup.ts</code>; for the on-path, add{" "}
          <code>jest.mocked(getEnableBillingBreakdown).mockResolvedValue(true)</code> and assert the
          section is present.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two-file pattern:</strong> key in the <code>FlagKeys</code> union +{" "}
          <code>FeatureFlag</code> object in <code>constants.ts</code>; getter in{" "}
          <code>featureFlags.ts</code>.
        </li>
        <li>
          <strong><code>defaultValue</code> is the safety net</strong> — the service behaves sanely
          if LaunchDarkly is unreachable.
        </li>
        <li>
          <strong>Consume flags inside <code>Promise.all</code></strong>, then branch or store in
          FeatureSet.
        </li>
        <li>
          <strong>The cleanup JSDoc is mandatory</strong> (expiration, final state, ticket, LD link)
          — it prevents flag rot.
        </li>
        <li>
          <strong>Flags ≠ experiments.</strong> Flags gate capability (LaunchDarkly); experiments
          measure variants (WeaponX). They can combine.
        </li>
        <li>
          <strong>Getters are the mock seam</strong> — defaults come from{" "}
          <code>jest.setup.ts</code>; override the getter to test the on-path.
        </li>
      </ul>
    </div>
  );
}
