import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const layerDiagram = String.raw`flowchart TD
  subgraph ext["@solo/dictionary (external package)"]
    INT["useDictionaryInternal<br/>useDictionaryQuery<br/>useHydrateDictionary<br/>dictionaryAtom"]
  end
  subgraph cb["commerce-base wrappers"]
    CFG["useGetDefaultDictionaryConfig()"]
    Q["useDictionaryQuery()"]
    HOOK["useDictionary()"]
  end
  COMP["A component<br/>getDictionaryValue('key')"]

  CFG --> Q
  CFG --> HOOK
  Q -->|"onSuccess merges<br/>remote dictionaries"| INT
  HOOK --> INT
  COMP --> HOOK`;

const fetchSequenceDiagram = String.raw`sequenceDiagram
  participant SSR as getDictionaryServerProps (server)
  participant Hyd as HydrateBaseAtoms
  participant Loc as useLocationInfo (SDK)
  participant Q as useDictionaryQuery
  participant Atom as dictionaryAtom
  participant Comp as Component

  SSR->>Hyd: dictionary, language, locale, remoteDictionariesToLoad
  Hyd->>Atom: useHydrateDictionary(...) seeds atom
  Loc-->>Q: isLocationDataReady === true
  Q->>Q: fetch remote dictionaries (react-query)
  Q->>Atom: onSuccess → merge fetched dicts
  Comp->>Atom: getDictionaryValue('key', { dictionary })
  Atom-->>Comp: localized string (or undefined → Datadog)`;

const lookupDiagram = String.raw`flowchart LR
  KEY["getDictionaryValue('welcome_hero_cta')"]
  KEY --> OVR{"copy override<br/>for this key?"}
  OVR -->|"yes (A/B test)"| SWAP["use featureCopy[key]"]
  OVR -->|"no"| ORIG["use original key"]
  SWAP --> LOOK["getDictionaryCallback(copyKey, { dictionary })"]
  ORIG --> LOOK
  LOOK --> FOUND{"value found?"}
  FOUND -->|"yes"| RET["return string"]
  FOUND -->|"no"| ERR["datadogRum.addError<br/>MISSING_CYPHER_KEY_IN_DICTIONARY"]
  ERR --> RETU["return undefined"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "cypher-keys", title: "Copy Is Cypher Keys, Not Hardcoded Strings", level: 2 },
  { id: "layers", title: "The Layer Cake: External Package + Thin Wrappers", level: 2 },
  { id: "use-dictionary", title: "useDictionary — The Lookup Hook", level: 2 },
  { id: "config", title: "Where Config Comes From", level: 3 },
  { id: "fetch", title: "How Copy Gets Fetched and Merged", level: 2 },
  { id: "location-gate", title: "The Location Gate", level: 3 },
  { id: "hydration", title: "SSR Hydration: The Server → Client Bridge", level: 2 },
  { id: "usage", title: "Using It in a Component", level: 2 },
  { id: "pitfalls", title: "Pitfalls", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Missing Copy", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function DictionaryAndI18n() {
  return (
    <div className="article-content">
      <p>
        Every visible word in a commerce screen — button labels, headers, error banners, legal copy —
        is localized. Disney+, Hulu, and ESPN+ ship in dozens of languages across dozens of regions,
        and none of that text is hardcoded in <code>commerce-base</code>. Instead the codebase looks
        up <strong>keys</strong> against a <strong>dictionary</strong> that is fetched at runtime for
        the user&apos;s locale. This module explains how a string like{" "}
        <code>error_mdw_wallet_banner_clear_card_history</code> becomes the right words in the right
        language, and — just as important — what happens when a key is missing.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        The single most common i18n bug is &quot;the screen shows a raw key&quot; or &quot;the screen
        shows English to a French user.&quot; Both trace back to the same pipeline: config → location
        → fetch → merge → lookup. If you understand that pipeline you can diagnose any localization
        defect in seconds. And because <code>commerce-base</code> is a thin wrapper over the external{" "}
        <code>@solo/dictionary</code> package, knowing which layer owns what tells you which repo to
        open.
      </p>

      <h2 id="cypher-keys">Copy Is Cypher Keys, Not Hardcoded Strings</h2>
      <p>
        A &quot;cypher key&quot; is the string identifier for a piece of copy — e.g.{" "}
        <code>settings_disney_linktext_link_1_url</code>. The component never contains the words; it
        contains the key, and the dictionary resolves the key to words for the active locale. This is
        why a missing key error is literally named{" "}
        <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code>.
      </p>
      <p>
        Copy is grouped into named remote dictionaries. The default set loaded by commerce-base is
        declared in <code>common/dictionary/index.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/dictionary/index.ts"
        code={`export { getDictionaryServerProps } from '@solo/dictionary';
export {
  dictionaryAtom,
  useHydrateDictionary,
  languageAtom,
  localeAtom,
} from '@solo/dictionary';
export { useDictionary, useGetDefaultDictionaryConfig, useDictionaryQuery } from './context/';

export const mockRemoteDictionariesToLoad =
  'identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding';`}
      />
      <p>
        Note the shape of the module: it <strong>re-exports</strong> the primitives from{" "}
        <code>@solo/dictionary</code> (the atom, the hydrate hook, the language/locale atoms, the
        server-props helper) and adds the commerce-specific wrapper hooks from{" "}
        <code>./context/</code>. That re-export barrel is the seam between the shared package and this
        repo.
      </p>

      <h2 id="layers">The Layer Cake: External Package + Thin Wrappers</h2>
      <p>
        The mental model that unlocks everything: <strong>the heavy lifting lives in{" "}
        <code>@solo/dictionary</code></strong>. commerce-base contributes three thin wrappers that
        inject commerce config and layer on A/B copy overrides and Datadog error reporting.
      </p>
      <MermaidDiagram
        chart={layerDiagram}
        title="Dictionary layer cake"
        caption="commerce-base wrappers (config, query, lookup) all delegate to @solo/dictionary internals. If a bug is in fetching/merging/atoms, it's likely the external package; if it's in overrides or missing-key reporting, it's here."
        minHeight={400}
      />
      <ArticleTable
        caption="Who owns what in the dictionary system."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Owner</th>
              <th>Symbol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>The atom holding merged copy</td>
              <td><code>@solo/dictionary</code></td>
              <td><code>dictionaryAtom</code></td>
            </tr>
            <tr>
              <td>Low-level lookup + fetch + hydrate</td>
              <td><code>@solo/dictionary</code></td>
              <td><code>useDictionaryInternal</code>, <code>useDictionaryQuery</code>, <code>useHydrateDictionary</code></td>
            </tr>
            <tr>
              <td>Build the commerce <code>DictionaryConfig</code></td>
              <td>commerce-base</td>
              <td><code>useGetDefaultDictionaryConfig()</code></td>
            </tr>
            <tr>
              <td>Fetch + merge with location gating</td>
              <td>commerce-base</td>
              <td><code>useDictionaryQuery()</code></td>
            </tr>
            <tr>
              <td>Lookup + A/B override + missing-key error</td>
              <td>commerce-base</td>
              <td><code>useDictionary()</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="use-dictionary">useDictionary — The Lookup Hook</h2>
      <p>
        This is the hook you will call 95% of the time. It returns a{" "}
        <em>function</em> — <code>getDictionaryValue(key, options)</code> — not a string. Read the
        real implementation in <code>common/dictionary/context/use-dictionary.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/dictionary/context/use-dictionary.ts"
        code={`export function useDictionary() {
  const config = useGetDefaultDictionaryConfig();
  const getDictionaryCallback = useDictionaryInternal(config);
  const featureCopy = useExperimentalCopyOverrides();

  return (
    key: string,
    { dictionary = 'unified-commerce' }: { dictionary?: DictionaryNames } = {},
  ) => {
    const copyKey = featureCopy[key] || key;          // A/B copy override swap
    const dictionaryValue = getDictionaryCallback(copyKey, { dictionary });
    if (!dictionaryValue) {
      datadogRum.addError(new Error('MISSING_CYPHER_KEY_IN_DICTIONARY'), {
        /* owner, errorCode, key, dictionary */
      });
    }
    return dictionaryValue;
  };
}`}
      />
      <p>
        Three things are happening here that matter for teaching:
      </p>
      <ul>
        <li>
          <strong>Default dictionary is <code>&apos;unified-commerce&apos;</code>.</strong> If you
          don&apos;t pass a <code>dictionary</code> option, that&apos;s where the key is looked up.
        </li>
        <li>
          <strong>A/B copy overrides are transparent.</strong>{" "}
          <code>useExperimentalCopyOverrides()</code> can remap a key to a different key for an
          experiment — so the <em>same call site</em> renders different copy under a treatment,
          without the component knowing.
        </li>
        <li>
          <strong>Missing keys report to Datadog, then return <code>undefined</code>.</strong> The UI
          doesn&apos;t crash — it renders nothing (or a raw key upstream), and an error fires. That
          error name is your grep target when copy goes missing.
        </li>
      </ul>
      <MermaidDiagram
        chart={lookupDiagram}
        title="A single getDictionaryValue call"
        caption="The override swap is invisible to the caller. A missing value is a soft failure: Datadog error + undefined return, never a throw."
        minHeight={340}
      />

      <h3 id="config">Where Config Comes From</h3>
      <p>
        <code>useGetDefaultDictionaryConfig()</code> assembles the{" "}
        <code>DictionaryConfig</code> from the app-wide config atom and injects the user&apos;s
        location. Crucially it exposes <code>isLocationDataReady</code> so the fetch can wait for the
        correct region.
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/dictionary/context/use-get-default-dictionary-config.ts"
        code={`const dictionaryConfig: DictionaryConfig = {
  dictionaryTenant: commerceAppConfig['feature-configuration'].dictionary.dictionaryTenant,
  dictionaryURL: commerceAppConfig.paths.paths.dictionaryUrl,
  dictionaryVersions: commerceAppConfig['feature-configuration'].dictionary.dictionaryVersions,
  enableDictionaryDraftState: Boolean(
    commerceAppConfig['feature-flags'].general.enableDictionaryDraftState,
  ),
  dictionaryURLInternal: commerceAppConfig.paths.paths.dictionaryUrlInternal,
  supportedLangsMap,
};

const { isSuccess, data: locationData = {} } = useLocationInfo();

return {
  dictionaryConfig,
  locationData,
  enableDraftStateClient: isDraftStateEnabled,
  shouldLoadFallbackDictionary: true,
  isLocationDataReady: isSuccess,
};`}
      />
      <p>
        The config comes from <code>commerceAppConfigAtom</code> (the central per-brand config
        object), and location comes from <code>useLocationInfo()</code>, which we&apos;ll meet again
        in the region module — it&apos;s the same SDK-backed source that feeds the geo atoms.
      </p>

      <h2 id="fetch">How Copy Gets Fetched and Merged</h2>
      <p>
        <code>useDictionaryQuery()</code> is the commerce wrapper over the package&apos;s react-query
        fetch. It wires an <code>onSuccess</code> handler that <em>merges</em> the fetched remote
        dictionaries into the atom, and gates the whole query on location readiness.
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/dictionary/context/use-dictionary-query.ts"
        code={`const { isLocationDataReady, ...config } = useGetDefaultDictionaryConfig();
const options = useGetDefaultQueryOptions(config);
const onSuccess = useDictionaryMergeHandler({
  dictionaryConfig: config.dictionaryConfig,
  shouldLoadFallbackDictionary: config.shouldLoadFallbackDictionary,
});

return useDictionaryQueryInternal(options, {
  ...params,
  enabled: isLocationDataReady && (params?.enabled ?? true),
  onSuccess,
});`}
      />
      <MermaidDiagram
        chart={fetchSequenceDiagram}
        title="End-to-end copy resolution"
        caption="Server props seed the atom first (fast first paint), then the client fetch merges the full remote dictionaries once location is known. The atom is the single source both paths write to."
        minHeight={420}
      />

      <h3 id="location-gate">The Location Gate</h3>
      <p>
        Notice <code>enabled: isLocationDataReady && ...</code>. This is not incidental. Copy can
        differ by region (different legal text, different provider names), so the fetch{" "}
        <strong>waits until the user&apos;s location is resolved</strong> before requesting
        dictionaries. If you ever see copy briefly wrong then correcting itself, this gate — and the
        server-seeded-atom-then-client-merge sequence — is why.
      </p>

      <h2 id="hydration">SSR Hydration: The Server → Client Bridge</h2>
      <p>
        Commerce apps are server-rendered (Next.js Pages Router). To avoid a flash of missing copy,
        the server computes dictionary props and the client hydrates the atom from them before the
        client fetch runs. That bridge is <code>HydrateBaseAtoms</code>.
      </p>
      <CodeBlock
        lang="tsx"
        filename="common/layouts/__internal__/hydrate-base-atoms.tsx"
        code={`useHydrateDictionary({
  dictionary,
  language,
  locale,
  remoteDictionariesToLoad,
  yellowPagesId,
  pinnedPlatformOptions,
  debuggingOptions: {
    shouldShowDictionaryKey: getIsDebugToolingEnabled() && getEnableDictionaryDebugging(),
  },
  sensitiveSecretsApiKey: dapiSensitiveSecretsApiKey,
});

useHydrateGeo({ regionFromCDN, regionFromUserOverride, languageDirection });`}
      />
      <p>
        The props (<code>dictionary</code>, <code>language</code>, <code>locale</code>,{" "}
        <code>remoteDictionariesToLoad</code>) originate from{" "}
        <code>getDictionaryServerProps</code> on the server side. A useful debugging affordance lives
        here too: <code>shouldShowDictionaryKey</code> renders the raw keys instead of the copy when
        debug tooling is enabled — the fastest way to see exactly which key a piece of UI is using.
      </p>

      <h2 id="usage">Using It in a Component</h2>
      <p>
        A real consumer from the wallet flow —{" "}
        <code>payments/wallet/components/wallet-modal/rejection-confirmation/rejection-confirmation.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="rejection-confirmation.tsx"
        code={`const getDictionaryValue = useDictionary();

// ...

const errorMessage = getDictionaryValue('error_mdw_wallet_banner_clear_card_history', {
  dictionary: walletDictionary,
});`}
      />
      <p>
        And a dynamic-key example from the cancel flow (
        <code>retention/cancel/hooks/use-cancel-contract-auth-redirect.ts</code>), showing keys can be
        composed at runtime — here from the subscription&apos;s provider:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-cancel-contract-auth-redirect.ts"
        code={`const providerLinkUrl = getDictionaryValue(
  \`settings_\${sourceProvider.toLowerCase()}_linktext_link_1_url\`,
);`}
      />

      <h2 id="pitfalls">Pitfalls</h2>
      <ArticleTable
        caption="Common localization mistakes and how to avoid them."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Pitfall</th>
              <th>Symptom</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hardcoding a user-facing string</td>
              <td>English leaks to non-English users</td>
              <td>Add a cypher key + use <code>getDictionaryValue</code></td>
            </tr>
            <tr>
              <td>Wrong <code>dictionary</code> option</td>
              <td>Key missing though it exists elsewhere</td>
              <td>Pass the correct remote dictionary name; default is <code>unified-commerce</code></td>
            </tr>
            <tr>
              <td>Rendering copy before location resolves</td>
              <td>Flash of wrong-region copy</td>
              <td>Copy fetch is already gated on <code>isLocationDataReady</code> — don&apos;t bypass it</td>
            </tr>
            <tr>
              <td>Ignoring the Datadog error</td>
              <td>Silent blank UI in prod</td>
              <td>Alert on <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does localization work in commerce-base?'"
        intro="Lead with keys-not-strings, then the pipeline, then the boundary between the shared package and this repo."
        steps={[
          "State the model: components hold cypher keys, not words; a dictionary resolves keys to copy for the active locale.",
          "Give the pipeline: config (commerceAppConfigAtom) → location (useLocationInfo) gate → react-query fetch → onSuccess merges remote dictionaries into dictionaryAtom → useDictionary() reads it.",
          "Name the boundary: @solo/dictionary owns the atom, fetch, and hydrate; commerce-base adds config injection, A/B copy overrides, and missing-key Datadog reporting.",
          "Mention SSR: getDictionaryServerProps + HydrateBaseAtoms seed the atom on the server so there's no flash before the client fetch.",
          "Close with failure behavior: a missing key is a soft failure — Datadog error + undefined return, never a throw.",
        ]}
      />

      <h2 id="challenge">Challenge: The Missing Copy</h2>
      <InterviewChallenge
        title="A button label is blank in production — only for French users"
        scenario={
          <>
            QA reports that on the Hulu billing page, a CTA button renders with no text, but only for
            users in France. English users see the button fine. You have access to Datadog and the
            code. Walk through how you&apos;d localize the root cause using the pipeline from this
            module.
          </>
        }
        tasks={[
          "Name the Datadog error you'd search for first and what fields it carries.",
          "List the pipeline stages where 'blank for one locale only' could originate.",
          "Explain how you'd confirm which cypher key the button uses (hint: a debug affordance exists).",
          "Decide whether the fix is in commerce-base, @solo/dictionary, or the copy source (Cypher/dictionary content).",
        ]}
        pitfalls={[
          "Assuming it's a code bug when the key may simply be untranslated in the French dictionary.",
          "Forgetting that an A/B copy override could remap the key to one that's missing in fr.",
          "Editing @solo/dictionary when the fix is dictionary content, not code.",
        ]}
        signal="A strong answer starts at MISSING_CYPHER_KEY_IN_DICTIONARY, uses shouldShowDictionaryKey to identify the key, checks the copy override, and concludes the fix is most likely a missing translation in the content, not the code."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Start in Datadog with <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> — its payload carries
          the <code>key</code> and <code>dictionary</code>. Because the failure is scoped to French
          users, the key almost certainly <em>exists</em> in the code and English dictionary but is{" "}
          <strong>untranslated in the French dictionary</strong>: the lookup returns{" "}
          <code>undefined</code>, fires the error, and renders nothing.
        </p>
        <p>
          Confirm the exact key by enabling the debug affordance (<code>shouldShowDictionaryKey</code>{" "}
          via debug tooling) so the UI prints the raw key. Also check{" "}
          <code>useExperimentalCopyOverrides()</code> — if an experiment remapped this key to a
          variant key, that variant may be missing in <code>fr</code>. If the key and override are
          both correct, the fix is <strong>content, not code</strong>: the French entry needs to be
          added to the relevant remote dictionary (Cypher), not a change in{" "}
          <code>commerce-base</code> or <code>@solo/dictionary</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Copy is keys, not strings.</strong> Components call{" "}
          <code>getDictionaryValue(&apos;cypher_key&apos;)</code>; the dictionary resolves it per
          locale.
        </li>
        <li>
          <strong>Thin wrappers over <code>@solo/dictionary</code>.</strong> commerce-base owns
          config injection, A/B overrides, and missing-key reporting; the package owns the atom,
          fetch, and hydrate.
        </li>
        <li>
          <strong>The location gate is real.</strong> Copy fetch waits for{" "}
          <code>isLocationDataReady</code> so region-specific copy is correct.
        </li>
        <li>
          <strong>SSR seeds, client merges.</strong> <code>HydrateBaseAtoms</code> +{" "}
          <code>useHydrateDictionary</code> avoid a flash of missing copy.
        </li>
        <li>
          <strong>Missing keys are soft failures.</strong> Grep{" "}
          <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> — the default dictionary is{" "}
          <code>unified-commerce</code>.
        </li>
      </ul>
    </div>
  );
}
