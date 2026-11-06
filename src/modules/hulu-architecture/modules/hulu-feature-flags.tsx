import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const flagSystemsDiagram = String.raw`flowchart TD
  subgraph FLEX["Flex (growth-life-client-api) — server"]
    LD["LaunchDarkly<br/>project growthLifeClientAPI"] --> FF["featureFlags/constants.ts (definitions)<br/>featureFlags.ts (async getters)"]
    FF --> SVC["Screen services via Promise.all<br/>→ FeatureSet booleans"]
  end
  subgraph CGI["cgi-web — client"]
    SPW["Sparrow remote config (S3)<br/>workspace commerce-hulu"] --> CAC["commerceAppConfigAtom<br/>countries[region].featureFlags"]
    CAC --> UCF["useCommerceFeatureFlag<br/>region + parentCountry inheritance"]
    MYS["Mystique (BAM SDK)<br/>INERT for Hulu — hardcoded fallback"] -.-> X["not a real flag source for Hulu"]
  end
  note["No LaunchDarkly anywhere in cgi-web<br/>(repo-wide grep: zero matches)"]
  CGI --- note`;

const inheritanceDiagram = String.raw`flowchart TD
  A["useCommerceFeatureFlag({featureName, fallbackValue, region})"] --> B["useCommerceRegionFeatureFlags(region)"]
  B --> C{"region has parentCountry?<br/>(is a territory)"}
  C -->|no| D["countries[region].featureFlags"]
  C -->|"yes + shouldInheritFromParent"| E["copy parent featureFlags,<br/>overlay territory's own keys"]
  C -->|"yes + !shouldInheritFromParent"| D
  D --> F["flagValue ?? fallbackValue"]
  E --> F`;

export const toc: TocItem[] = [
  { id: "two-flag-systems", title: "Two Real Flag Systems (and One Decoy)", level: 2 },
  { id: "flex-hulu-flags", title: "The Six Hulu LaunchDarkly Flags", level: 2 },
  { id: "flex-flag-pattern", title: "The Flex Flag Pattern", level: 2 },
  { id: "cgi-region-flags", title: "cgi-web: Region Flags via Sparrow", level: 2 },
  { id: "which-system-when", title: "Which System for Which Job", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Flag Archaeology", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluFeatureFlags() {
  return (
    <div className="article-content">
      <p>
        &quot;Is there a flag for this?&quot; has a brand-dependent answer, and
        Hulu&apos;s is the trickiest: two real flag systems (Flex&apos;s
        LaunchDarkly server-side, Sparrow region config client-side) plus one
        decoy (Mystique flags, which for Hulu are hardcoded fallbacks
        masquerading as flags). Knowing which system owns which lever — and
        where each is defined — turns day-long hunts into two-minute lookups.
      </p>

      <h2 id="two-flag-systems">Two Real Flag Systems (and One Decoy)</h2>
      <MermaidDiagram
        chart={flagSystemsDiagram}
        title="Flag Sources for Hulu Behavior"
        caption="Server levers live in LaunchDarkly via Flex; client levers live in Sparrow region config. Mystique looks like a third system but is inert for Hulu."
        minHeight={480}
      />
      <ArticleTable caption="The three 'flag-shaped' systems a Hulu engineer encounters.">
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th>Side</th>
              <th>Defined in</th>
              <th>Hulu reality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LaunchDarkly</td>
              <td>Flex (server)</td>
              <td>
                <code>src/lib/featureFlags/constants.ts</code> + getters in{" "}
                <code>featureFlags.ts</code>
              </td>
              <td>
                Fully live — project <code>growthLifeClientAPI</code>; six
                hulu-keyed flags (below)
              </td>
            </tr>
            <tr>
              <td>Sparrow region config</td>
              <td>cgi-web (client)</td>
              <td>
                S3 workspace <code>commerce-hulu</code> →{" "}
                <code>commerceAppConfigAtom</code>
              </td>
              <td>
                Fully live — read via <code>useCommerceFeatureFlag</code> with
                territory inheritance
              </td>
            </tr>
            <tr>
              <td>Mystique (WeaponX flags)</td>
              <td>cgi-web (client)</td>
              <td>
                BAM SDK bootstrap → <code>useMystiqueFeatureFlags</code>
              </td>
              <td>
                <strong>Decoy for Hulu</strong> — SDK never boots; values come
                from the hardcoded fallback object
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Also verified as an absence: <strong>cgi-web has no LaunchDarkly at
        all</strong> (repo-wide grep for <code>launchdarkly</code>/<code>LDClient</code>:
        zero matches). If someone says &quot;flip the LD flag for the
        frontend&quot;, the sentence contains a category error.
      </p>

      <h2 id="flex-hulu-flags">The Six Hulu LaunchDarkly Flags</h2>
      <ArticleTable
        caption="Every flag in Flex whose key contains 'hulu' (constants.ts, verified 2026-08-27). All default false; all read as long-lived operational flags — none carries an expiration/cleanup-ticket JSDoc."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Line</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>enable-hulu-account-extra-member-section</code></td>
              <td>:1354</td>
              <td>Extra Member section on Hulu Account Home</td>
            </tr>
            <tr>
              <td><code>enable-hulu-events-section</code></td>
              <td>:1581</td>
              <td>Hulu Events section on Account Home</td>
            </tr>
            <tr>
              <td><code>enable-bundle-hulu-activation-bypass</code></td>
              <td>:2790</td>
              <td>
                Trio-bundle redemption/fixed-term subscribers link straight to
                hulu.com instead of the activation page
              </td>
            </tr>
            <tr>
              <td><code>enable-delta-transact-hulu-upsell</code></td>
              <td>:2878</td>
              <td>Delta Transact cross-tenant banner, Hulu upsell variant</td>
            </tr>
            <tr>
              <td><code>enable-bundle-hulu-login-on-success</code></td>
              <td>:2914</td>
              <td>
                Success-screen Hulu link → Hulu login for ACP bundle subs
                (&quot;Hulu is auto-activated and no longer requires
                /commerce/activate/hulu&quot;)
              </td>
            </tr>
            <tr>
              <td><code>enable-legacy-hulu-subscription-details</code></td>
              <td>:2936</td>
              <td>
                Show legacy (non-D2C) Hulu subscriptions on Account Home —
                the ACP-migration widening
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        A full definition, for the shape:
      </p>
      <CodeBlock
        code={`// src/lib/featureFlags/constants.ts:2785-2793
/**
 * Feature flag for enabling bundle Hulu activation bypass.
 * When enabled, Disney trio bundle subscribers (redemption without payment / fixed-term)
 * are linked to hulu.com instead of the activation page.
 * Expected final state: true.
 */
export const enableBundleHuluActivationBypass: FeatureFlag<boolean> = {
  key: 'enable-bundle-hulu-activation-bypass',
  defaultValue: false,
};`}
        lang="typescript"
        filename="featureFlags/constants.ts"
      />
      <p>
        Beyond the six, Hulu appears in other flags&apos; JSDoc prose without
        being in the key — e.g. comments like &quot;Expected final state: true
        (for Hulu ONLY)&quot; (<code>constants.ts:2117,2128,2180</code>) —
        so key-grep alone under-counts Hulu-affecting flags. Grep descriptions
        too.
      </p>

      <h2 id="flex-flag-pattern">The Flex Flag Pattern</h2>
      <p>
        The repo&apos;s two-file pattern (define in <code>constants.ts</code>,
        async getter via <code>getFeatureFlagValue()</code> in{" "}
        <code>featureFlags.ts</code>, key added to the <code>FlagKeys</code>{" "}
        union) with consumption via <code>Promise.all</code> alongside other
        fetches, resolved into <strong>FeatureSet booleans</strong>:
      </p>
      <CodeBlock
        code={`// consumption shape in a screen service
const [enableHuluEvents, enableEMSection] = await Promise.all([
  getEnableHuluEventsSection(flexContext),
  getEnableHuluAccountExtraMemberSection(flexContext),
]);

const featureSet: AccountHomeFeatureSet = {
  enableHuluEventsSubSection: enableHuluEvents,   // interface EnableHuluEventsSubSection (featureSet.ts:690)
  // ...
};`}
        lang="typescript"
        filename="flag consumption → FeatureSet"
      />
      <p>
        Tests: flags are globally mocked to their defaults in{" "}
        <code>jest.setup.ts</code>; override per test with{" "}
        <code>jest.mocked(getEnableHuluEventsSection).mockResolvedValue(true)</code>.
        And after touching any FeatureSet interface:{" "}
        <code>npm run build:typeguards</code>.
      </p>

      <h2 id="cgi-region-flags">cgi-web: Region Flags via Sparrow</h2>
      <MermaidDiagram
        chart={inheritanceDiagram}
        title="useCommerceFeatureFlag Resolution"
        caption="Flags are keyed by region inside the Sparrow-served app config; territories inherit the parent country's flags unless opted out, with territory keys overriding."
        minHeight={440}
      />
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/components/localized/feature-flag/hooks/use-commerce-feature-flag.tsx:14-33
export function useCommerceFeatureFlag<T = unknown>({
  featureName,
  fallbackValue,
  region,
  shouldInheritFromParent = true,
}: {
  featureName: string;
  fallbackValue: T;
  region?: RegionSubtag;
  shouldInheritFromParent?: boolean;
}) {
  const commerceRegionFeatureFlags = useCommerceRegionFeatureFlags(
    region,
    shouldInheritFromParent
  );
  const flagValue = commerceRegionFeatureFlags[featureName] as T;
  return flagValue ?? fallbackValue;
}`}
        lang="tsx"
        filename="use-commerce-feature-flag.tsx"
      />
      <p>
        The data source is the Sparrow-served app config
        (<code>commerceAppConfigAtom</code> from{" "}
        <code>@solo/commerce-utils</code>): a JSON keyed by region, each region
        carrying a <code>featureFlags</code> map and an optional{" "}
        <code>parentCountry</code>. The inheritance helper
        (<code>use-commerce-region-feature-flags.tsx:23-40</code>) deep-copies
        the parent&apos;s flags and overlays the territory&apos;s own keys.
        Hulu&apos;s workspace is <code>commerce-hulu</code>, and its{" "}
        <code>countries</code> scope is small (US + territories), so
        inheritance matters mostly for US territories. Hulu consumes the same
        cross-brand hooks as everyone (subscriber-agreement checkbox, Nielsen
        item, delete-account modal, license-plate region scope) — no Hulu fork
        found.
      </p>

      <h2 id="which-system-when">Which System for Which Job</h2>
      <ArticleTable caption="Decision table: where a new Hulu lever belongs.">
        <table>
          <thead>
            <tr>
              <th>You want to...</th>
              <th>System</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gate a section/behavior of a Flex-rendered screen</td>
              <td>LaunchDarkly flag in Flex</td>
              <td>
                Server owns screen composition; getter + FeatureSet boolean
              </td>
            </tr>
            <tr>
              <td>Vary behavior by country/territory client-side</td>
              <td>Sparrow region flag</td>
              <td>
                <code>useCommerceFeatureFlag</code> + parentCountry
                inheritance exists for exactly this
              </td>
            </tr>
            <tr>
              <td>Run a percentage split on Hulu users</td>
              <td>Spearmint experiment (previous module)</td>
              <td>Flags don&apos;t randomize; Mystique can&apos;t reach Hulu</td>
            </tr>
            <tr>
              <td>Gate a whole route client-side for Hulu</td>
              <td>Sparrow (route enablement in app config)</td>
              <td>Route gating is config-driven in commerce apps</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"Where do feature flags live for Hulu?"`}
        intro={
          <>
            The strong answer is a two-system map with the Mystique decoy
            called out — most people miss that cgi-web has no LaunchDarkly at
            all.
          </>
        }
        steps={[
          "Split by side: server levers are LaunchDarkly flags in Flex (constants.ts definitions + async getters + FeatureSet booleans); client levers are Sparrow region-config flags read via useCommerceFeatureFlag.",
          "Name the six hulu-keyed LD flags and what family they form: two Account Home sections (Events, Extra Member), two ACP-migration behaviors (activation bypass, login-on-success), legacy-subscription display, and the Delta Transact upsell banner.",
          "Call out the decoy: Mystique flags exist in code but Hulu never boots the SDK, so those values are hardcoded fallbacks — not remotely controllable for Hulu.",
          "Explain region inheritance: Sparrow flags are keyed per region with parentCountry inheritance; territory keys override parent copies.",
          "Close with the decision rule: gate = flag (LD server / Sparrow client); randomize = Spearmint; and note that key-grep under-counts — some flags are Hulu-scoped only in their JSDoc prose.",
        ]}
      />

      <h2 id="challenge">Challenge: Flag Archaeology</h2>
      <InterviewChallenge
        title="Three levers, three systems"
        scenario={
          <>
            You inherit three vague asks: (a) &quot;turn on the Hulu Events
            row for everyone&quot;; (b) &quot;the student-verification flow
            should be off for Hulu&quot;; (c) &quot;puerto-rico users of the
            Hulu app should see the Nielsen opt-out item that US users
            see.&quot;
          </>
        }
        tasks={[
          "For each ask, identify the owning flag system and the exact place the value lives.",
          "For (b), explain what you find when you look at the code, and why 'turning it off' is not a dashboard operation for Hulu.",
          "For (c), explain the mechanism that likely already makes it work, and what to check before writing any code.",
        ]}
        pitfalls={[
          "Searching LaunchDarkly for a client-side route gate.",
          "Assuming wpnx-student-verification is remotely controllable for Hulu — it is a hardcoded fallback value.",
          "Writing a territory-specific code branch when parentCountry inheritance already covers it.",
          "Forgetting that turning a Flex flag 'on for everyone' still leaves cleanup/productionalization work.",
        ]}
        signal="A strong answer routes each lever to LD / hardcoded-fallback / Sparrow-inheritance respectively, and treats (b) as a code change."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a)</strong> LaunchDarkly, project{" "}
          <code>growthLifeClientAPI</code>, key{" "}
          <code>enable-hulu-events-section</code> — flip in the LD dashboard;
          code already consumes it via FeatureSet
          (<code>EnableHuluEventsSubSection</code>). Follow-up: once stable at
          true, productionalize (remove flag + make unconditional).
        </p>
        <p>
          <strong>(b)</strong> In <code>use-mystique-feature-flags.ts</code>{" "}
          you find <code>&apos;wpnx-student-verification&apos;: true</code>{" "}
          hardcoded with the comment &quot;hardcoded true here because Hulu is
          US-only and does not use the SDK or WeaponX.&quot; For Hulu this is
          not a flag — it is a constant. &quot;Turning it off&quot; = a code
          change to the fallback object (with cross-brand care: the fallback
          also serves local dev for other brands).
        </p>
        <p>
          <strong>(c)</strong> Sparrow region flags with{" "}
          <code>parentCountry</code> inheritance: if PR is modeled as a US
          territory in the <code>commerce-hulu</code> workspace, it already
          inherits US flags unless overridden. Check the workspace&apos;s{" "}
          <code>countries</code> config first — the fix is likely a config
          edit (or nothing), not code. The Nielsen item itself reads{" "}
          <code>useCommerceFeatureFlag</code> (seen in{" "}
          <code>manage-nielsen-item.tsx</code>).
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Two real systems: Flex LaunchDarkly (server screen levers) and
          Sparrow region config (client levers, workspace{" "}
          <code>commerce-hulu</code>); Mystique is a decoy for Hulu.
        </li>
        <li>
          Six hulu-keyed LD flags, all default-false, all long-lived
          operational (no cleanup JSDoc) — two Account Home sections, two ACP
          behaviors, legacy-sub display, Delta upsell.
        </li>
        <li>
          Flag consumption in Flex: <code>Promise.all</code> getters →
          FeatureSet booleans; tests override the globally-mocked getters;{" "}
          <code>build:typeguards</code> after FeatureSet edits.
        </li>
        <li>
          <code>useCommerceFeatureFlag</code>: region-keyed with
          parentCountry inheritance and territory override.
        </li>
        <li>
          No LaunchDarkly exists in cgi-web; key-grep under-counts Hulu flags
          — read JSDoc prose too.
        </li>
        <li>Gate = flag; randomize = Spearmint. Never confuse the two.</li>
      </ul>
    </div>
  );
}
