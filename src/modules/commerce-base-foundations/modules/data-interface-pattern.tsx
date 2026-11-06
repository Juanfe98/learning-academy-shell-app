import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const inversionDiagram = String.raw`flowchart TD
  CONTRACT["DATA_INTERFACE type<br/>(the contract in @solo/types)"]
  CB["commerce-base<br/>depends only on the interface"]
  ATOM["dataInterfaceAtom (Jotai)"]
  subgraph impls["Concrete implementations"]
    DISNEY["data-interface-disney<br/>(SDK-based)"]
    HULU["data-interface-hulu<br/>(HTTP fetch)"]
    ESPN["data-interface-espn"]
  end
  CONTRACT --> CB
  CB -->|"reads"| ATOM
  DISNEY -->|"hydrated into"| ATOM
  HULU -->|"hydrated into"| ATOM
  ESPN -->|"hydrated into"| ATOM`;

const hydrationDiagram = String.raw`sequenceDiagram
  participant App as Brand app layout
  participant Build as buildDataInterface (brand)
  participant Hyd as useHydrateDataInterface
  participant Atom as dataInterfaceAtom
  participant Hook as query hook

  App->>Build: buildDisneyDataInterface({ sdkSession, ... })
  Build-->>Hyd: DATA_INTERFACE impl
  Hyd->>Atom: seed baseDataInterfaceAtom
  Hook->>Atom: useAtomValue(dataInterfaceAtom)
  Atom-->>Hook: impl (or throws if not hydrated)`;

const callDiagram = String.raw`flowchart LR
  PAGE["PlansPage"]
  PAGE --> READ["useAtomValue(dataInterfaceAtom)"]
  READ --> RQ["useQuery(queryFn)"]
  RQ --> CALL["dataInterface.getFlexScreen({ key: 'landingPlans' })"]
  CALL --> BRAND{"which brand?"}
  BRAND -->|"Disney"| SDK["SDK session call"]
  BRAND -->|"Hulu"| HTTP["fetch(edge URL)"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "inversion", title: "Dependency Inversion in One Picture", level: 2 },
  { id: "contract", title: "The Contract: DATA_INTERFACE", level: 2 },
  { id: "atom", title: "The Atom: A Hydration Guard", level: 2 },
  { id: "impls", title: "Two Implementations, One Interface", level: 2 },
  { id: "hydration", title: "How the Brand Injects Its Implementation", level: 2 },
  { id: "calling", title: "Calling a Method: Screens vs Executions", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Data-Interface Method", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function DataInterfacePattern() {
  return (
    <div className="article-content">
      <p>
        How does one shared <code>PlansPage</code> fetch data for Disney+ (via the client SDK) and
        Hulu (via raw HTTP) without containing a single brand-specific line? The answer is the{" "}
        <strong>data-interface pattern</strong> — a textbook dependency inversion built on a shared
        type, a Jotai atom, and per-brand implementations. This is the mechanism that makes
        commerce-base genuinely brand-agnostic, and it&apos;s worth understanding precisely because it
        touches every single data fetch.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Every query and mutation in commerce-base goes through the data interface. When you add a new
        backend call, you&apos;re extending this contract across brands. When data fails to load, the
        interface hydration is one of the first things to check. And in interviews, &quot;how is this
        multi-tenant?&quot; is answered precisely by this pattern.
      </p>

      <h2 id="inversion">Dependency Inversion in One Picture</h2>
      <MermaidDiagram
        chart={inversionDiagram}
        title="The data-interface inversion"
        caption="commerce-base depends on the DATA_INTERFACE type, not on any brand. Each brand implements the type and injects it into dataInterfaceAtom. Shared code reads the atom — it never imports a brand package."
        minHeight={420}
      />
      <p>
        The principle: <strong>the shared code depends on an abstraction; the concrete details depend
        on the abstraction too.</strong> Neither the page nor the brand package depends on the other
        directly — they meet at the <code>DATA_INTERFACE</code> type and the atom.
      </p>

      <h2 id="contract">The Contract: DATA_INTERFACE</h2>
      <p>
        The contract is the <code>DATA_INTERFACE</code> type (from <code>@solo/types</code>) — a
        record of async methods every brand must implement:
      </p>
      <CodeBlock
        lang="typescript"
        filename="DATA_INTERFACE (shape)"
        code={`export type DATA_INTERFACE = {
  getFlexScreen: <T>(opts: FlexScreenOptions) => Promise<FlexResponse<T>>;
  flexExecution: <T>(opts: FlexExecutionOptions) => Promise<FlexExecutionResponse<T>>;
  isLoggedIn: () => Promise<boolean>;
  logout: () => Promise<boolean>;
  getPersonalInfo: () => Promise<GetPersonalInfoResult>;
  getSubscriberInfo: () => Promise<{ /* ... */ }>;
  createCardPaymentMethod: (/* ... */) => /* ... */;
  // ...avatarCollections, getSubscriptions, activations, experimentation, etc.
};`}
      />
      <p>
        Two methods dominate: <code>getFlexScreen</code> (read a UI screen) and{" "}
        <code>flexExecution</code> (perform a state-changing action). This mirrors the Flex BFF&apos;s
        own screens-vs-executions split — a distinction that recurs throughout commerce.
      </p>

      <h2 id="atom">The Atom: A Hydration Guard</h2>
      <p>
        The interface is held in a Jotai atom with a guard: a private base atom holds <code>null</code>,
        and the exported derived atom <strong>throws if read before hydration</strong> (
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
});

export function useHydrateDataInterface(dataInterface: DATA_INTERFACE) {
  useHydrateAtoms([buildInitialValue(baseDataInterfaceAtom, dataInterface)]);
}`}
      />
      <p>
        Why a throwing guard? Because a silently-null data interface would produce confusing failures
        deep in query hooks. The guard makes the failure mode <strong>loud and early</strong>: if you
        see &quot;The data interface must be hydrated before usage,&quot; you know the brand layout
        didn&apos;t call <code>useHydrateDataInterface</code> before something tried to fetch.
      </p>

      <h2 id="impls">Two Implementations, One Interface</h2>
      <p>
        Each brand implements the contract via a <code>buildDataInterface</code> that composes
        per-domain slices. Disney is SDK-based (takes <code>sdkSession</code>); Hulu is HTTP-based
        (takes base URLs + userAgent):
      </p>
      <CodeBlock
        lang="typescript"
        filename="data-interface-disney/src/data-interface.ts"
        code={`export function buildDataInterface({ sdkSession, observability, queryClient }) {
  const dataInterface: DATA_INTERFACE = {
    ...getFlexDataInterface(sdkSession),
    ...getIdentityDataInterface({ sdkSession, queryClient, observability }),
    ...getPaymentDataInterface(sdkSession),
    ...getActivationsDataInterface(sdkSession),
    ...getExperimentationDataInterface(sdkSession),
  };
  return dataInterface;
}`}
      />
      <p>
        The Hulu <code>getFlexScreen</code> shows the concrete transport — it maps a logical key like{" "}
        <code>landingPlans</code> to a URL path and <code>fetch</code>es:
      </p>
      <CodeBlock
        lang="typescript"
        filename="data-interface-hulu/src/flex/flex-data-interface.ts"
        code={`const flexScreenKeysToUrls = { landingPlans: 'landing/plans', /* ... */ };

export const getFlexDataInterface = ({ edgeBaseUrl, userAgent }) => ({
  getFlexScreen: async <T>(flexScreenOptions) => {
    const endpoint = getEndpoint({ edgeBaseUrl, key, type: 'screens', flexOptions: flexScreenOptions });
    const response = await fetch(\`\${endpoint}?\${searchParameters}\`, {
      headers: { 'x-bamsdk-platform': getCachedPlatformHeader(userAgent), ...headers },
      method,
      credentials: 'include',
    });
    const { data } = await response.json();
    return data as T;
  },
  flexExecution: async <T>(/* ... */) => { /* ... */ },
});`}
      />
      <p>
        Same method signature, completely different transport. commerce-base calls{" "}
        <code>getFlexScreen({"{ key: 'landingPlans' }"})</code> and gets data — it never learns
        whether an SDK or a <code>fetch</code> served it.
      </p>

      <h2 id="hydration">How the Brand Injects Its Implementation</h2>
      <p>
        The brand app builds its implementation and hydrates it into the atom, typically gated on SDK
        readiness (<code>apps/commerce/disneyPlus/src/layout/hydrate-data-interface.tsx</code>):
      </p>
      <CodeBlock
        lang="tsx"
        filename="hydrate-data-interface.tsx"
        code={`import { useHydrateDataInterface } from '@solo/commerce-base/src/common/data-interface';
import { buildDataInterface as buildDisneyDataInterface } from '@solo/data-interface-disney/src/data-interface';

const dataInterface = buildDisneyDataInterface({ sdkSession, queryClient, observability });
useHydrateDataInterface(dataInterface);`}
      />
      <MermaidDiagram
        chart={hydrationDiagram}
        title="Brand injects, shared code reads"
        caption="The brand layout builds its DATA_INTERFACE and hydrates it into the atom. Query hooks read the atom. If hydration hasn't happened, the guard throws — a clear, early signal."
        minHeight={400}
      />

      <h2 id="calling">Calling a Method: Screens vs Executions</h2>
      <p>
        A page reads the atom and calls a method inside a React Query <code>queryFn</code>. From{" "}
        <code>signup/pages/plans-page.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="plans-page.tsx"
        code={`const dataInterface = useAtomValue(dataInterfaceAtom);

const { data, isLoading } = useQuery({
  queryKey: ['flexApi.getScreen.planSelector'],
  queryFn: () =>
    dataInterface.getFlexScreen<FlexPlansPageContentModel>({
      key: 'landingPlans',
      version: 'v1',
      queryParams,
      headers: generateFlexHeaders({ salesPlatform }),
    }),
  select,
  useErrorBoundary: true,
});`}
      />
      <MermaidDiagram
        chart={callDiagram}
        title="One call, two transports"
        caption="getFlexScreen for reads, flexExecution for writes. The same call dispatches to the SDK on Disney and to fetch on Hulu, decided entirely by which impl was hydrated."
        minHeight={300}
      />
      <ArticleTable
        caption="Screens vs executions in the data interface."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Purpose</th>
              <th>Side effects</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>getFlexScreen&lt;T&gt;</code></td>
              <td>Read a UI screen (plans, billing, cancel)</td>
              <td>None — read-only</td>
            </tr>
            <tr>
              <td><code>flexExecution&lt;T&gt;</code></td>
              <td>Perform an action (create payment, cancel, redeem)</td>
              <td>Yes — mutates state</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How is commerce-base multi-tenant at the data layer?'"
        intro="Lead with dependency inversion, then the three pieces (contract, atom, impls), then the runtime injection."
        steps={[
          "It's dependency inversion: commerce-base depends on the DATA_INTERFACE type (from @solo/types), not on any brand package.",
          "The implementation lives in a Jotai atom (dataInterfaceAtom) that throws if read before hydration — a loud guard against a null interface.",
          "Each brand implements DATA_INTERFACE via buildDataInterface, composing per-domain slices; Disney is SDK-based, Hulu is HTTP fetch — same signatures, different transport.",
          "The brand app layout builds its impl and injects it via useHydrateDataInterface, usually gated on SDK readiness.",
          "Shared pages read useAtomValue(dataInterfaceAtom) and call getFlexScreen (reads) / flexExecution (writes) inside React Query — never knowing the brand.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Data-Interface Method</h2>
      <InterviewChallenge
        title="Expose a new backend endpoint to shared pages"
        scenario={
          <>
            A new feature needs to read a &quot;loyalty status&quot; endpoint that exists for Disney+
            and ESPN+ but not Hulu. You must make it callable from a shared commerce-base page.
            Describe every place you&apos;d touch and how you&apos;d handle the brand that lacks the
            endpoint.
          </>
        }
        tasks={[
          "List the files/layers you'd change: the contract, each brand impl, and the consuming hook.",
          "Explain how you keep the interface consistent across brands when one brand can't implement it.",
          "Describe the consuming React Query hook and how it reads the atom.",
          "State how you'd prevent a runtime crash on Hulu where the endpoint doesn't exist.",
        ]}
        pitfalls={[
          "Calling the backend directly from a component instead of going through the data interface.",
          "Adding the method to only one brand impl, so the type no longer matches on others.",
          "Letting Hulu throw at runtime instead of returning a safe default / being gated.",
        ]}
        signal="A strong answer adds the method to the DATA_INTERFACE type, implements it in every brand (Disney/ESPN real, Hulu a safe no-op or feature-gated stub so the type still matches), writes a useQuery hook that reads dataInterfaceAtom and calls it with meta.owner, and gates the feature so Hulu never calls it — no direct backend calls from components."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Touch three layers. <strong>(1) The contract:</strong> add{" "}
          <code>getLoyaltyStatus: () =&gt; Promise&lt;LoyaltyStatus&gt;</code> to{" "}
          <code>DATA_INTERFACE</code>. Because the type is shared, <em>every</em> brand&apos;s{" "}
          <code>buildDataInterface</code> must now provide it or TypeScript fails —{" "}
          <strong>that&apos;s the safety net</strong>, not a burden. <strong>(2) Each brand impl:</strong>{" "}
          Disney and ESPN implement it for real; Hulu provides a safe stub (a no-op returning a
          default, or a version that throws only if actually called) so the type still matches.
        </p>
        <p>
          <strong>(3) The consuming hook:</strong> a <code>useQuery</code> that reads{" "}
          <code>useAtomValue(dataInterfaceAtom)</code>, calls <code>getLoyaltyStatus()</code> in{" "}
          <code>queryFn</code>, and sets <code>meta.owner</code>. Finally, <strong>gate the
          feature</strong> so it never runs on Hulu — e.g. <code>enabled: partnerName !== 'hulu'</code>{" "}
          (or a commerce config flag), so the Hulu stub is never invoked. The rule throughout: shared
          code goes through the data interface; no component calls a backend directly.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Dependency inversion.</strong> commerce-base depends on the{" "}
          <code>DATA_INTERFACE</code> type; brands depend on it too. They meet at the type + atom.
        </li>
        <li>
          <strong>The contract is <code>DATA_INTERFACE</code>.</strong> Dominated by{" "}
          <code>getFlexScreen</code> (reads) and <code>flexExecution</code> (writes).
        </li>
        <li>
          <strong>The atom is a guard.</strong> <code>dataInterfaceAtom</code> throws if read before
          hydration — a loud, early failure signal.
        </li>
        <li>
          <strong>Per-brand implementations.</strong> Disney SDK-based, Hulu HTTP — same signatures,
          different transport, injected via <code>useHydrateDataInterface</code>.
        </li>
        <li>
          <strong>Shared pages stay blind to brand.</strong> They read the atom and call methods
          inside React Query; adding a method means extending the type across all brands.
        </li>
      </ul>
    </div>
  );
}
