import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const hydrationFlowDiagram = String.raw`sequenceDiagram
  participant GSSP as getServerSideProps (server)
  participant App as _app (JotaiProvider)
  participant Hyd as HydrateBaseAtoms
  participant Store as Jotai store
  participant Comp as Component

  GSSP-->>App: CommercePageProps (config, dictionary, geo, ...)
  App->>Hyd: mount inside ApplicationLayout
  Hyd->>Store: useHydrateAtoms([...]) seeds atoms once
  Comp->>Store: useAtomValue(regionAtom)
  Store-->>Comp: synchronous value (no fetch)`;

const atomTypesDiagram = String.raw`flowchart TD
  ROOT["Jotai atom kinds in commerce-base"]
  ROOT --> P["atom(default)<br/>plain state"]
  ROOT --> R["atomWithReset<br/>resettable flags"]
  ROOT --> S["atomWithStorage<br/>localStorage persistence"]
  ROOT --> D["atom((get) => ...)<br/>derived / computed"]
  D --> GUARD["guard atom:<br/>throws if not hydrated"]`;

const navUpdateDiagram = String.raw`flowchart TD
  NAV["Client-side navigation<br/>(same Jotai store reused)"]
  NAV --> NEWPROPS["new server pageProps arrive"]
  NEWPROPS --> HYDRATE{"useHydrateAtoms<br/>runs again?"}
  HYDRATE -->|"no — only sets once"| STALE["atom would be STALE"]
  STALE --> FIX["useEffect(() => setLayoutConfig(fullConfig))"]
  FIX --> FRESH["atom synced to new props"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "role", title: "Jotai's Role: Synchronous Shared State", level: 2 },
  { id: "atom-kinds", title: "The Kinds of Atoms", level: 2 },
  { id: "derived", title: "Derived Atoms and the Hydration Guard", level: 3 },
  { id: "hydration", title: "The SSR Hydration Pattern", level: 2 },
  { id: "orchestrator", title: "HydrateBaseAtoms — The Orchestrator", level: 2 },
  { id: "navigation-trap", title: "The Client-Navigation Staleness Trap", level: 2 },
  { id: "reading", title: "Reading and Writing Atoms", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Stale Config After Navigation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function JotaiAtomsAndHydration() {
  return (
    <div className="article-content">
      <p>
        commerce-base has three state systems (Jotai, React Query, XState). Jotai owns{" "}
        <strong>synchronous, app-wide client state</strong> — the config, region, dictionary, SDK
        settings, and (crucially) the data-interface implementation that every other layer reads. If
        you understand how atoms get <em>hydrated</em> from server props and the one subtle bug that
        hydration causes on client navigation, you understand the backbone that everything else hangs
        off.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Almost every hook you&apos;ll write reads an atom: <code>regionAtom</code>,{" "}
        <code>commerceAppConfigAtom</code>, <code>dataInterfaceAtom</code>. When one of those is empty
        or stale, symptoms cascade — the data interface throws, region defaults to US, copy resolves
        wrong. All of those trace back to hydration. This module makes hydration concrete so those
        bugs stop being mysterious.
      </p>

      <h2 id="role">Jotai&apos;s Role: Synchronous Shared State</h2>
      <p>
        The provider is mounted at the very top of the tree in <code>_app.page.tsx</code>:{" "}
        <code>JotaiProvider</code> wraps <code>QueryProvider</code> wraps the page. Jotai is chosen
        when state must be <strong>shared across unrelated components without prop-drilling</strong>{" "}
        and read <strong>synchronously</strong> — as opposed to React Query (async server data) or
        XState (multi-step flow state).
      </p>
      <ArticleTable
        caption="What lives in Jotai atoms in commerce-base."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Example atoms</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Server-hydrated config</td>
              <td><code>commerceAppConfigAtom</code>, dictionary atoms, geo/region atoms, layout config, SDK config</td>
            </tr>
            <tr>
              <td>The data-interface implementation</td>
              <td><code>dataInterfaceAtom</code></td>
            </tr>
            <tr>
              <td>Cross-page UI data</td>
              <td><code>currentPageDataAtom</code> (feeds the out-of-tree header)</td>
            </tr>
            <tr>
              <td>Feature-flag defaults</td>
              <td><code>featureFlagsAtom</code></td>
            </tr>
            <tr>
              <td>Ephemeral / persisted flow state</td>
              <td><code>selectedPlanCardAtom</code>, <code>isOffersInitializedAtom</code>, APM storage atom</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="atom-kinds">The Kinds of Atoms</h2>
      <MermaidDiagram
        chart={atomTypesDiagram}
        title="Atom kinds used in commerce-base"
        caption="Plain atoms for state, atomWithReset for resettable flags, atomWithStorage for persistence, derived atoms for computed values — including a 'guard' atom that throws if read before hydration."
        minHeight={340}
      />
      <p>
        Plain state — a nullable object atom (
        <code>signup/atoms/selected-plan-card/selected-plan-card.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="selected-plan-card.ts"
        code={`export const selectedPlanCardAtom = atom<OfferModel | null>(null);`}
      />
      <p>
        Resettable — <code>atomWithReset</code> (
        <code>signup/atoms/is-offers-initialized.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="is-offers-initialized.ts"
        code={`export const isOffersInitializedAtom = atomWithReset<boolean>(false);`}
      />
      <p>
        Persisted to localStorage — <code>atomWithStorage</code> + <code>createJSONStorage</code> (
        <code>payments/apm/atoms/apm-persistent-storage-data.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="apm-persistent-storage-data.ts"
        code={`const storage = createJSONStorage<APMPersistentStorageData | null>(() => localStorage);
export const APM_STORAGE_DATA_ATOM_KEY = 'apmStorageInfo';
export const apmPersistentStorageDataAtom = atomWithStorage<APMPersistentStorageData | null>(
  APM_STORAGE_DATA_ATOM_KEY,
  null,
  storage,
);`}
      />

      <h3 id="derived">Derived Atoms and the Hydration Guard</h3>
      <p>
        Derived (read-only) atoms compose other atoms. The region atom you met in the region module
        is derived with a priority fallback. A cleverer variant is the{" "}
        <strong>hydration guard</strong>: a private base atom holds <code>null</code>, and the
        exported derived atom <em>throws</em> if read before hydration (
        <code>common/data-interface/atoms.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/data-interface/atoms.ts"
        code={`const baseDataInterfaceAtom = atom<DATA_INTERFACE | null>(null);

export const dataInterfaceAtom = atom((get) => {
  const dataInterface = get(baseDataInterfaceAtom);
  if (dataInterface === null) {
    throw new Error('The data interface must be hydrated before usage.');
  }
  return dataInterface;
});`}
      />
      <p>
        This is a deliberate design: rather than every query hook null-checking the data interface,
        the atom guarantees it&apos;s present or fails loudly. This is the seam between Jotai and
        React Query — every query/mutation hook does{" "}
        <code>useAtomValue(dataInterfaceAtom)</code> to get the tenant-specific API.
      </p>

      <h2 id="hydration">The SSR Hydration Pattern</h2>
      <p>
        The convention: <strong>each atom (or group) ships a <code>useHydrate*</code> hook</strong>{" "}
        that calls <code>useHydrateAtoms</code> from <code>jotai/utils</code>, seeded with a helper
        from <code>@solo/commerce-utils</code> (<code>buildInitialValue</code> or{" "}
        <code>createInitialValuesHelper</code>). Example — the data-interface hydrate hook:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/data-interface/atoms.ts"
        code={`export function useHydrateDataInterface(dataInterface: DATA_INTERFACE) {
  useHydrateAtoms([buildInitialValue(baseDataInterfaceAtom, dataInterface)]);
}`}
      />
      <MermaidDiagram
        chart={hydrationFlowDiagram}
        title="Server props → atoms → components"
        caption="getServerSideProps returns serializable props; _app passes them down; HydrateBaseAtoms seeds the Jotai store once; components read synchronously with no fetch."
        minHeight={420}
      />

      <h2 id="orchestrator">HydrateBaseAtoms — The Orchestrator</h2>
      <p>
        One component calls all the hydrate hooks:{" "}
        <code>common/layouts/__internal__/hydrate-base-atoms.tsx</code>. It renders an empty fragment
        and exists purely to run hydration, synchronizing client atoms with server props. It&apos;s
        mounted early inside <code>ApplicationLayout</code>, before <code>{"{children}"}</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="hydrate-base-atoms.tsx"
        code={`export function HydrateBaseAtoms({ ... }): JSX.Element {
  useHydrateCommerceAppConfig(commerceAppConfig);
  useHydrateIsSDKEnabledAtom(!commerceAppConfig['feature-flags'].general.disableBAMTechSDK);
  useHydrateDictionary({ dictionary, language, locale, remoteDictionariesToLoad, ... });
  useHydrateGeo({ regionFromCDN, regionFromUserOverride, languageDirection });
  useHydrateLayoutConfig(layoutConfig);
  useHydratehardcodedQueriesConfig(...);
  return <></>;
}`}
      />
      <p>
        Note what this buys you: because config, region, dictionary, and SDK settings are all seeded
        synchronously before children render, a component can read{" "}
        <code>useAtomValue(regionAtom)</code> on its very first render and get the correct
        server-computed value — no loading state, no flash.
      </p>

      <h2 id="navigation-trap">The Client-Navigation Staleness Trap</h2>
      <p>
        Here is the subtle bug that every commerce engineer eventually hits.{" "}
        <code>useHydrateAtoms</code> only sets a value <strong>once</strong> — on the first render of
        the Jotai store. But in the Pages Router, client-side navigation{" "}
        <strong>reuses the same store</strong> while the server sends <em>new</em> props for the new
        page. So a naive hydrate-only hook would leave the atom showing the <em>previous</em>{" "}
        page&apos;s value.
      </p>
      <MermaidDiagram
        chart={navUpdateDiagram}
        title="Why hydrate-once is not enough"
        caption="After a client navigation the store is reused; useHydrateAtoms won't re-seed. Hooks that must track per-page props therefore ALSO write the atom in a useEffect."
        minHeight={360}
      />
      <p>
        The fix, shown in <code>use-hydrate-layout-config.ts</code>, is to do{" "}
        <strong>both</strong>: hydrate once, and update on navigation via a{" "}
        <code>useEffect</code> + <code>useSetAtom</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/layouts/__internal__/utils/use-hydrate-layout-config.ts"
        code={`export function useHydrateLayoutConfig(layoutConfig?: PartialLayoutConfig) {
  const fullConfig = mergeWithDefaultLayoutConfig(layoutConfig);
  const initialValues = createInitialValuesHelper();
  initialValues.setInitialValue(layoutConfigAtom, fullConfig);
  useHydrateAtoms(initialValues.getInitialValues()); // seed once

  const setLayoutConfig = useSetAtom(layoutConfigAtom);
  useEffect(() => {
    // after a page navigation, sync the atom with the new pageProps
    setLayoutConfig(fullConfig);
  }, [fullConfig, setLayoutConfig]);
}`}
      />
      <p>
        <strong>The rule:</strong> if an atom must reflect per-page server props, its hydrate hook
        needs the hydrate-once <em>and</em> the update-on-navigation halves. Config that never changes
        between pages can hydrate once and stop.
      </p>

      <h2 id="reading">Reading and Writing Atoms</h2>
      <ArticleTable
        caption="The three Jotai access hooks."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Hook</th>
              <th>Use when</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useAtomValue(atom)</code></td>
              <td>Read only</td>
              <td><code>const region = useAtomValue(regionAtom)</code></td>
            </tr>
            <tr>
              <td><code>useSetAtom(atom)</code></td>
              <td>Write only</td>
              <td><code>const set = useSetAtom(layoutConfigAtom)</code></td>
            </tr>
            <tr>
              <td><code>useAtom(atom)</code></td>
              <td>Read + write</td>
              <td><code>const [v, setV] = useAtom(selectedPlanCardAtom)</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Prefer <code>useAtomValue</code>/<code>useSetAtom</code> over <code>useAtom</code> when you
        only need one direction — a write-only component using <code>useSetAtom</code> won&apos;t
        re-render when the atom value changes, which matters for the many components that only set
        state.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does Jotai state work in commerce-base?'"
        intro="Lead with Jotai's role, then the hydration pattern, then the client-navigation trap that shows real depth."
        steps={[
          "Jotai owns synchronous, app-wide shared state: config, region, dictionary, SDK settings, and the dataInterfaceAtom. JotaiProvider is the outermost provider in _app.",
          "Atoms come in flavors: plain atom(), atomWithReset, atomWithStorage (localStorage), and derived atoms — including a guard atom that throws if the data interface isn't hydrated.",
          "Server props are seeded into atoms by HydrateBaseAtoms via per-atom useHydrate* hooks calling useHydrateAtoms — so components read correct values synchronously on first render.",
          "The subtle part: useHydrateAtoms only sets once, but Pages Router reuses the store across client navigations, so per-page atoms ALSO update in a useEffect + useSetAtom (see useHydrateLayoutConfig).",
          "Reading: useAtomValue (read), useSetAtom (write, avoids re-render), useAtom (both).",
        ]}
      />

      <h2 id="challenge">Challenge: The Stale Config After Navigation</h2>
      <InterviewChallenge
        title="A layout setting is correct on hard refresh but wrong after client navigation"
        scenario={
          <>
            The header shows the correct type on a full page load, but after the user clicks a link
            and navigates client-side to another commerce page, the header keeps the <em>previous</em>{" "}
            page&apos;s configuration. Hard-refreshing the new page fixes it. Diagnose the root cause
            using what you know about Jotai hydration.
          </>
        }
        tasks={[
          "Explain why hard refresh works but client navigation doesn't.",
          "Identify which half of the hydrate pattern is missing.",
          "Write the fix for the atom's hydrate hook.",
          "State which atoms need this treatment vs which can hydrate once.",
        ]}
        pitfalls={[
          "Blaming React Query or the server — the server IS sending correct new props.",
          "Adding a full re-mount hack instead of the update-on-navigation effect.",
          "Applying the update effect to atoms that never change between pages (unnecessary writes).",
        ]}
        signal="A strong answer identifies that useHydrateAtoms only seeds once while the Pages Router reuses the store, so the fix is to also setAtom(fullConfig) in a useEffect keyed on the new props — exactly the useHydrateLayoutConfig pattern — and limits it to per-page atoms."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Hard refresh works because it creates a <strong>fresh Jotai store</strong>, so{" "}
          <code>useHydrateAtoms</code> seeds it with the new page&apos;s props. Client navigation{" "}
          <strong>reuses the existing store</strong>, and <code>useHydrateAtoms</code> only sets a
          value once — so the atom keeps the first page&apos;s value even though the server sent fresh{" "}
          <code>pageProps</code>.
        </p>
        <p>
          The missing half is the update-on-navigation write. Fix the hydrate hook to also sync the
          atom in an effect:
        </p>
        <CodeBlock
          lang="typescript"
          filename="fix"
          code={`useHydrateAtoms(initialValues.getInitialValues()); // seed once (first store render)

const setLayoutConfig = useSetAtom(layoutConfigAtom);
useEffect(() => {
  setLayoutConfig(fullConfig); // keep in sync on every navigation
}, [fullConfig, setLayoutConfig]);`}
        />
        <p>
          Apply this only to atoms that carry <em>per-page</em> server props (layout config, page
          data). Atoms holding config that&apos;s constant across the session (e.g. the data
          interface, SDK settings) can hydrate once and skip the effect.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Jotai = synchronous shared state.</strong> Config, region, dictionary, SDK, and the
          <code> dataInterfaceAtom</code>. Outermost provider in <code>_app</code>.
        </li>
        <li>
          <strong>Atom flavors.</strong> <code>atom()</code>, <code>atomWithReset</code>,{" "}
          <code>atomWithStorage</code>, derived — including a guard atom that throws if unhydrated.
        </li>
        <li>
          <strong>Hydration convention.</strong> Per-atom <code>useHydrate*</code> hooks call{" "}
          <code>useHydrateAtoms</code>; <code>HydrateBaseAtoms</code> runs them all inside{" "}
          <code>ApplicationLayout</code>.
        </li>
        <li>
          <strong>The navigation trap.</strong> <code>useHydrateAtoms</code> seeds once; the store is
          reused across client navigations, so per-page atoms also update in a{" "}
          <code>useEffect</code>.
        </li>
        <li>
          <strong>Read minimally.</strong> <code>useAtomValue</code> to read,{" "}
          <code>useSetAtom</code> to write without re-rendering.
        </li>
      </ul>
    </div>
  );
}
