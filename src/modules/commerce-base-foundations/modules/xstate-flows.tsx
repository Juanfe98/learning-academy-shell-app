import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pairingDiagram = String.raw`flowchart LR
  subgraph pure["*-machine.ts (pure, no React)"]
    M["createMachine(...)<br/>states, events, context<br/>guards named, actions named"]
  end
  subgraph react["use-*-machine.ts (React)"]
    H["useMachine(machine, { actions, guards, services })<br/>injects implementations + router"]
  end
  subgraph view["*-flow.tsx (component)"]
    V["switch(state.value)<br/>render a view per state<br/>send(...) / sendToNext(...)"]
  end
  M --> H
  H --> V`;

const addProfileDiagram = String.raw`stateDiagram-v2
  [*] --> selectAvatar
  selectAvatar --> addProfileDetails : NEXT
  addProfileDetails --> parentalConsent : NEXT [isBelowAgeThreshold]
  addProfileDetails --> contentRating : NEXT [shouldContentOnboard]
  addProfileDetails --> createPin : NEXT
  addProfileDetails --> exit : NEXT [isKidsModeEnabled]
  parentalConsent --> exit
  contentRating --> createPin
  createPin --> exit
  exit --> [*]`;

const guardDiagram = String.raw`flowchart TD
  EVT["NEXT event received in addProfileDetails"]
  EVT --> G1{"cond: isBelowAgeThreshold?"}
  G1 -->|"true"| S1["→ parentalConsent"]
  G1 -->|"false"| G2{"cond: isKidsModeEnabled?"}
  G2 -->|"true"| S2["→ exit"]
  G2 -->|"false"| G3{"cond: shouldContentOnboard?"}
  G3 -->|"true"| S3["→ contentRating"]
  G3 -->|"false"| S4["→ createPin (default)"]`;

const dataFlowDiagram = String.raw`flowchart TD
  RQ["React Query hooks<br/>(useSwitchProfile, useProfileViewData...)"]
  JOTAI["Jotai config atoms<br/>(serverProvidedLanguageAtom, region)"]
  RQ --> HOOK["use-*-machine hook"]
  JOTAI --> HOOK
  HOOK -->|"services + actions"| MACHINE["XState machine<br/>(which step & why)"]
  MACHINE --> COMP["component: switch(state.value)"]
  COMP -->|"sendToNext(data)"| MACHINE`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "when", title: "When XState Is the Right Tool", level: 2 },
  { id: "pairing", title: "The Machine + Hook Pairing Convention", level: 2 },
  { id: "machine", title: "Anatomy of a Machine", level: 2 },
  { id: "guards", title: "Guarded Transitions", level: 3 },
  { id: "hook", title: "The use-*-machine Hook: Injecting Implementations", level: 2 },
  { id: "services", title: "Services (Actors) for Async Steps", level: 3 },
  { id: "component", title: "Consuming the Machine in a Component", level: 2 },
  { id: "interop", title: "How XState, React Query, and Jotai Interoperate", level: 2 },
  { id: "typegen", title: "The .typegen.ts Pattern", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Step to a Flow", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function XStateFlows() {
  return (
    <div className="article-content">
      <p>
        Some commerce journeys are not one screen — they&apos;re a branching sequence: add a profile,
        select a profile, transfer a profile, verify an age, set up a PIN. The next screen depends on
        business rules (is the user below the age threshold? is kids mode on?) and must cooperate with
        the browser back button. Modeling that with a pile of booleans and{" "}
        <code>useEffect</code>s is how bugs breed. commerce-base uses <strong>XState state
        machines</strong> for exactly these flows — most densely in <code>profiles/</code>. This
        module teaches the machine + hook + component convention that makes them testable and
        predictable.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        A state machine makes the illegal states unrepresentable and the transitions explicit. When
        you own <em>which step comes next and why</em> in one declarative place, you can reason about
        the whole flow at a glance — and test it with zero React. The profiles domain has 17+ machines;
        recognizing the pattern lets you read any of them immediately.
      </p>

      <h2 id="when">When XState Is the Right Tool</h2>
      <ArticleTable
        caption="Choosing between the three state systems."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Need</th>
              <th>Tool</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Shared synchronous client/config state</td>
              <td>Jotai</td>
              <td>Read anywhere without prop-drilling</td>
            </tr>
            <tr>
              <td>Server data (fetch/mutate)</td>
              <td>React Query</td>
              <td>Caching, gating, retries via the data interface</td>
            </tr>
            <tr>
              <td>Branching multi-screen navigation</td>
              <td>XState</td>
              <td>Explicit states, guarded transitions, browser history</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Reach for XState when a plain component would need a tangle of booleans and effects to model{" "}
        <em>step order</em>, <em>back/forward</em>, and <em>conditional branches</em>. The machine
        owns navigation; React Query hooks own the data; Jotai supplies shared config the flow reads.
      </p>

      <h2 id="pairing">The Machine + Hook Pairing Convention</h2>
      <p>
        Every flow splits into <strong>two co-located files</strong>: a pure machine and a React hook.
      </p>
      <MermaidDiagram
        chart={pairingDiagram}
        title="The three-file structure of a flow"
        caption="The machine is pure (no React) so it's testable in isolation. The hook injects side-effecting implementations + the router. The component renders a view per state."
        minHeight={340}
      />
      <ArticleTable
        caption="The files that make up a profiles flow."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Owns</th>
              <th>React?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>*-machine.ts</code></td>
              <td>States, events, context, named guards/actions, <code>initialContext</code></td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>update-context.ts</code></td>
              <td><code>assign(...)</code> action creators</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>use-*-machine.ts</code></td>
              <td><code>useMachine(...)</code> with injected actions/guards/services + router</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code>*-flow.tsx</code></td>
              <td><code>switch(state.value)</code> → a view per state</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="machine">Anatomy of a Machine</h2>
      <p>
        Take <code>profiles/add-profiles/flows/add-profile-machine.ts</code>. Its context carries the
        draft profile, avatar, age flags, and the current localized pathname; its events are{" "}
        <code>BACK | EXIT | NEXT</code> (with optional <code>data</code>); its states run from{" "}
        <code>selectAvatar</code> to a <code>final</code> <code>exit</code> state.
      </p>
      <MermaidDiagram
        chart={addProfileDiagram}
        title="add-profile machine states"
        caption="A NEXT event from addProfileDetails branches four ways depending on guards (age threshold, kids mode, content onboarding). exit is a final state."
        minHeight={420}
      />
      <p>
        The machine is created with the modern options and predictable-action settings:
      </p>
      <CodeBlock
        lang="typescript"
        filename="add-profile-machine.ts (shape)"
        code={`export const addProfileMachine = createMachine(
  {
    predictableActionArguments: true,
    preserveActionOrder: true,
    // context: AddProfileMachineContext (draftProfile, avatar, isBelowAgeThreshold,
    //   needsContentOnboarding, stateGlobalizedPathname, ...)
    // states: selectAvatar (initial) -> addProfileDetails -> ... -> exit (final)
    states: {
      addProfileDetails: {
        entry: assign({ /* set stateGlobalizedPathname */ }),
        on: {
          NEXT: [
            { actions: setDraftProfileData, cond: 'isBelowAgeThreshold', target: 'parentalConsent' },
            { actions: setAdultProfileData, cond: 'isKidsModeEnabled', target: 'exit' },
            { actions: setAdultProfileData, cond: 'shouldContentOnboard', target: 'contentRating' },
            { actions: setAdultProfileData, target: 'createPin' },
          ],
        },
      },
      // ...
      exit: { entry: ['sendToExitURL'], type: 'final' },
    },
  },
  {
    guards: {
      isBelowAgeThreshold: (_, event) => event.data?.isBelowAgeThreshold ?? false,
      // ...more guards
    },
  },
);`}
      />

      <h3 id="guards">Guarded Transitions</h3>
      <p>
        The <code>NEXT</code> transition is an <strong>array</strong> — XState evaluates each entry&apos;s{" "}
        <code>cond</code> in order and takes the <strong>first match</strong>. This is how one event
        produces four different next steps:
      </p>
      <MermaidDiagram
        chart={guardDiagram}
        title="First-match guard evaluation"
        caption="Guarded transition arrays are evaluated top-to-bottom; the first cond that returns true wins. The final entry with no cond is the default. Order matters."
        minHeight={380}
      />
      <p>
        Guards are pure functions defined in the machine&apos;s second argument, reading from{" "}
        <code>event.data</code> or <code>context</code> — never from React. That purity is what lets
        the whole branching logic be unit-tested without rendering anything.
      </p>

      <h2 id="hook">The use-*-machine Hook: Injecting Implementations</h2>
      <p>
        The machine names actions like <code>sendToExitURL</code> and <code>updateURL</code> but
        leaves them <em>unimplemented</em>. The hook supplies them — this is where the router and side
        effects live. From <code>use-add-profile-machine.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-add-profile-machine.ts"
        code={`const [state, send] = useMachine(addProfileMachine, {
  actions: { sendToExitURL, updateURL },
});

const sendToNext = useCallback(
  (data?: AddProfileNextData) => {
    send(data ? { type: 'NEXT', data } : { type: 'NEXT' });
  },
  [send],
);

useEffect(() => {
  window.addEventListener('popstate', sendToBack);
  return () => window.removeEventListener('popstate', sendToBack);
}, [sendToBack]);

return { sendToBack, sendToExit, sendToNext, state };`}
      />
      <p>
        Two conventions worth noting: the hook wraps <code>send</code> in typed callbacks (
        <code>sendToNext</code>, <code>sendToBack</code>, <code>sendToExit</code>) so components
        never construct raw event objects, and it wires the browser <code>popstate</code> event to a
        machine event so the back button drives the machine. The shared{" "}
        <code>profiles/common/hooks/use-machine-common-setup.tsx</code> provides the{" "}
        <code>updateURL</code>/<code>replaceURL</code> implementations.
      </p>

      <h3 id="services">Services (Actors) for Async Steps</h3>
      <p>
        When a final step must <em>do</em> something async (call a mutation, then redirect), the
        machine uses <code>invoke</code> with a named service rather than a fire-and-forget action.
        From <code>select-profile-machine.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="select-profile-machine.ts"
        code={`exit: {
  invoke: { src: 'switchProfileAndRedirect' },
  type: 'final',
},`}
      />
      <p>
        The hook (<code>use-select-profile-machine.ts</code>) supplies{" "}
        <code>switchProfileAndRedirect</code> as an async function that composes React Query
        mutations (<code>useSwitchProfile</code>, <code>useOnboardProfileToGemini</code>,{" "}
        <code>useLinkHuluAccount</code>) and then redirects. This is the clean seam: the machine
        declares &quot;on exit, run this service&quot;; the hook decides what the service actually
        does with real data.
      </p>

      <h2 id="component">Consuming the Machine in a Component</h2>
      <p>
        The component calls the hook, feeds React Query results into the machine via typed{" "}
        <code>send</code> callbacks, and renders a view per state with a{" "}
        <code>switch (state.value)</code>. From <code>add-profile-flow.tsx</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="add-profile-flow.tsx (shape)"
        code={`const { sendToBack, sendToExit, sendToNext, state } = useAddProfileMachine(router, exitActions);

switch (state.value) {
  case 'selectAvatar':
    return <SelectAvatarView onNext={sendToNext} /* reads state.context.* */ />;
  case 'addProfileDetails':
    return <AddProfileView onNext={sendToNext} onBack={sendToBack} />;
  case 'contentRating':
    return <ContentRatingView onNext={sendToNext} />;
  // ...
}`}
      />
      <p>
        Note what the component does <strong>not</strong> do: it doesn&apos;t decide the next step
        (the machine does), and it reads flow data through <code>state.context.*</code> rather than
        local state. The profiles components use <code>switch(state.value)</code> — not{" "}
        <code>useActor</code>/<code>useSelector</code>.
      </p>

      <h2 id="interop">How XState, React Query, and Jotai Interoperate</h2>
      <MermaidDiagram
        chart={dataFlowDiagram}
        title="The three systems working together in a flow"
        caption="The machine owns 'which step & why'. React Query hooks (composed inside the use-machine hook) own the data/mutations. Jotai supplies shared config the flow reads. They are complementary, not competing."
        minHeight={380}
      />
      <p>
        This is the key integration insight: they don&apos;t compete, they layer. A flow&apos;s hook
        <em> consumes</em> React Query mutations and passes them into the machine as services;{" "}
        query hooks themselves read the Jotai <code>dataInterfaceAtom</code>; and the flow reads
        hydrated config atoms (<code>serverProvidedLanguageAtom</code>, region) for localization and
        branching.
      </p>

      <h2 id="typegen">The .typegen.ts Pattern</h2>
      <p>
        XState can generate TypeScript types for a machine&apos;s event→implementation maps. In
        commerce-base only <strong>one</strong> machine currently commits a{" "}
        <code>.typegen.ts</code> (the ad-hoc-profile-transfer-invitation flow). It opts in via{" "}
        <code>tsTypes</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="ad-hoc-profile-transfer-invitation-machine.ts"
        code={`tsTypes: {} as import('./ad-hoc-profile-transfer-invitation-machine.typegen').Typegen0,`}
      />
      <p>
        The generated file forces the hook to supply any{" "}
        <code>missingImplementations</code> — e.g. <code>actions: &apos;updateURL&apos;</code> — at
        compile time. Most machines instead use the older{" "}
        <code>createMachine&lt;Context, Event, Typestate&gt;</code> generics form (add-profile,
        select-profile). Both are valid; recognize each when you see it.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How are multi-step flows built in commerce-base?'"
        intro="Lead with why XState, then the machine+hook+component split, then the interop with React Query and Jotai."
        steps={[
          "XState models branching multi-screen flows (profiles: add/select/transfer/setup/age-verification) where the next step depends on business rules and browser history.",
          "Each flow is three files: a pure *-machine.ts (states, events, context, named guards/actions — no React), a use-*-machine.ts hook that injects implementations + router via useMachine, and a *-flow.tsx that renders per state with switch(state.value).",
          "Branching is done with guarded transition arrays (first matching cond wins); guards are pure functions reading event.data/context.",
          "Async final steps use invoke + a named service, whose implementation (composed from React Query mutations) is supplied by the hook.",
          "The three systems layer: machine owns 'which step & why', React Query owns data (via dataInterfaceAtom), Jotai supplies shared config. Mention the single .typegen.ts vs the generics form.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Step to a Flow</h2>
      <InterviewChallenge
        title="Insert a consent screen into the add-profile flow"
        scenario={
          <>
            A new requirement: after <code>addProfileDetails</code>, users in a specific region must
            see a data-consent screen before continuing to <code>createPin</code>. Describe exactly
            what you&apos;d change across the machine, the hook, and the component — and how you&apos;d
            keep the browser back button working.
          </>
        }
        tasks={[
          "Name the machine changes: new state, new guarded transition, and where the guard reads its condition.",
          "Explain whether the region check belongs in a guard (context/event) or in the hook, and why.",
          "Describe the component change and how state.context flows into the new view.",
          "Explain how the popstate wiring keeps back/forward correct for the new step.",
        ]}
        pitfalls={[
          "Putting the branching decision in the component instead of a machine guard.",
          "Reading region directly in the pure machine (it can't call React hooks) instead of passing it via event.data or context set by the hook.",
          "Forgetting to add the new state to the switch(state.value) render, leaving a blank screen.",
        ]}
        signal="A strong answer adds a consent state + a guarded transition (cond reads event.data/context, not a hook), sets the region-derived flag from the hook into context, adds the view to the switch, and relies on the existing popstate→machine wiring so back/forward just works."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Machine:</strong> add a <code>consent</code> state between{" "}
          <code>addProfileDetails</code> and <code>createPin</code>, and insert a guarded entry into
          the <code>NEXT</code> transition array: <code>{"{ cond: 'requiresConsent', target: 'consent' }"}</code>{" "}
          before the default <code>createPin</code> entry (order matters — place it where you want it
          to win). Add a pure guard <code>requiresConsent</code> that reads{" "}
          <code>event.data?.requiresConsent</code> (or a context flag).
        </p>
        <p>
          <strong>Where the region check lives:</strong> the pure machine can&apos;t call{" "}
          <code>useAtomValue(regionAtom)</code>. So the <strong>hook</strong> reads the region and
          passes <code>requiresConsent</code> into the machine via <code>sendToNext(data)</code> (or
          seeds it into context). The guard stays pure; the impurity lives in the hook — exactly the
          boundary the pattern enforces.
        </p>
        <p>
          <strong>Component:</strong> add a <code>case &apos;consent&apos;</code> to the{" "}
          <code>switch(state.value)</code> rendering a <code>&lt;ConsentView&gt;</code> that reads any
          needed data from <code>state.context</code> and calls <code>sendToNext</code> to continue.
          Back/forward already work: the hook&apos;s <code>popstate</code> listener sends a{" "}
          <code>BACK</code> event and each state&apos;s <code>entry</code> updates the URL, so the new
          step participates in browser history automatically.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>XState is for branching multi-screen flows.</strong> Densely used in{" "}
          <code>profiles/</code> (add/select/transfer/setup/age-verification).
        </li>
        <li>
          <strong>Three files.</strong> Pure <code>*-machine.ts</code>, React{" "}
          <code>use-*-machine.ts</code> (injects implementations + router), and{" "}
          <code>*-flow.tsx</code> (<code>switch(state.value)</code>).
        </li>
        <li>
          <strong>Guarded transition arrays.</strong> First matching <code>cond</code> wins; guards
          are pure functions.
        </li>
        <li>
          <strong>Services for async.</strong> <code>invoke</code> a named service; the hook composes
          it from React Query mutations.
        </li>
        <li>
          <strong>The systems layer.</strong> Machine = which step &amp; why; React Query = data;
          Jotai = shared config.
        </li>
      </ul>
    </div>
  );
}
