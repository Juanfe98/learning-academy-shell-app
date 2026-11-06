import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const twoReposDiagram = String.raw`flowchart LR
  subgraph fe["cgi-web (this repo)"]
    CB["commerce-base<br/>renders screens"]
  end
  subgraph be["growth-life-client-api (Flex BFF)"]
    FLEX["template-driven Koa BFF<br/>computes screens + executions"]
  end
  TPL["growth-life-client-templates (S3)"]
  CB -->|"getFlexScreen / flexExecution"| FLEX
  TPL -.->|"JSON templates"| FLEX
  FLEX -->|"{ data, metadata }"| CB`;

const screenExecDiagram = String.raw`flowchart TD
  UI["commerce-base component"]
  UI --> Q{"read or write?"}
  Q -->|"render a screen"| SCREEN["getFlexScreen<T>({ key, version })<br/>GET-like, read-only"]
  Q -->|"perform an action"| EXEC["flexExecution<T>({ key, requestBody })<br/>POST-like, mutates state"]
  SCREEN --> RENDER["render data.content sections"]
  EXEC --> RESULT["handle action result"]`;

const boundaryDiagram = String.raw`flowchart TD
  BUG["Something looks wrong on a screen"]
  BUG --> KIND{"what kind of wrong?"}
  KIND -->|"a value (price, copy, offer)"| FLEX["likely Flex BFF<br/>(it computes values)"]
  KIND -->|"a section missing / layout"| TPL["likely templates repo (S3)"]
  KIND -->|"how it's rendered / interaction"| CB["likely commerce-base<br/>(it renders + handles UI)"]`;

const requestDiagram = String.raw`sequenceDiagram
  participant Page as PlansPage (commerce-base)
  participant DI as dataInterface (brand)
  participant Flex as Flex BFF
  Page->>DI: getFlexScreen({ key: 'landingPlans', version: 'v1', headers })
  DI->>Flex: request with Disney headers
  Flex->>Flex: fetch data, fill template, resolve copy/offers/experiments
  Flex-->>DI: { data: { content, ... }, metadata }
  DI-->>Page: typed model
  Page->>Page: select + render sections`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "what-is-flex", title: "What Flex Is", level: 2 },
  { id: "two-repos", title: "Three Repos, One Screen", level: 2 },
  { id: "server-driven", title: "Server-Driven UI: commerce-base Renders, Flex Decides", level: 2 },
  { id: "screens-executions", title: "Screens vs Executions", level: 2 },
  { id: "request", title: "A Screen Request End to End", level: 2 },
  { id: "boundary", title: "The Debugging Boundary: Which Repo?", level: 2 },
  { id: "experiments", title: "Where Experiments Live", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Route the Bug to the Right Repo", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function CommerceBaseAndFlex() {
  return (
    <div className="article-content">
      <p>
        commerce-base does not compute most of what it shows. It is the <strong>rendering half</strong>{" "}
        of a server-driven-UI system whose thinking half is a separate service: the Flex BFF (
        <code>growth-life-client-api</code>). The single most valuable skill in commerce work is
        knowing <em>which repo owns a given behavior</em> — because a bug that looks visual is often a
        value computed upstream in Flex, or a layout defined in a third repo of templates. This module
        draws that boundary precisely so you never again fix the wrong codebase.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        You will lose hours if you assume every screen bug lives in commerce-base. Prices, eligible
        offers, experiment treatments, and localized copy are largely decided by Flex; section layout
        lives in a templates repo; commerce-base renders the result and owns the interaction. Getting
        this boundary right is the difference between a 10-minute fix and a day of chasing the wrong
        code.
      </p>

      <h2 id="what-is-flex">What Flex Is</h2>
      <p>
        Flex (<code>growth-life-client-api</code>) is a <strong>template-driven Koa Backend-for-
        Frontend</strong> that serves UI screens and action executions for Disney+, Hulu, and ESPN+
        subscription/commerce flows. It fetches business data from backend services, injects it into
        JSON UI templates, and returns a processed <code>{"{ data, metadata }"}</code> object whose{" "}
        <code>data.content</code> describes UI sections plus analytics payloads. Critically, it{" "}
        <strong>does not render pixels</strong> — it returns <em>data that describes</em> a screen,
        and commerce-base turns that into UI.
      </p>

      <h2 id="two-repos">Three Repos, One Screen</h2>
      <MermaidDiagram
        chart={twoReposDiagram}
        title="The three repos behind a commerce screen"
        caption="commerce-base (renders) calls Flex (computes screens/executions), which fills JSON templates authored in a separate templates repo deployed to S3. Three repos, three responsibilities."
        minHeight={340}
      />
      <ArticleTable
        caption="What each repo owns."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Repo</th>
              <th>Owns</th>
              <th>Example change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>cgi-web</code> / commerce-base (this repo)</td>
              <td>Rendering the screen data into UI, interactions, client state</td>
              <td>Change how a CTA behaves when tapped</td>
            </tr>
            <tr>
              <td><code>growth-life-client-api</code> (Flex BFF)</td>
              <td>Which offer is eligible, price, experiment logic, copy-key composition</td>
              <td>Change which price shows for AU/NZ in a promo</td>
            </tr>
            <tr>
              <td><code>growth-life-client-templates</code> (S3)</td>
              <td>Screen layout, which sections exist, static copy-key slots</td>
              <td>Add a new banner slot to the cancel screen</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="server-driven">Server-Driven UI: commerce-base Renders, Flex Decides</h2>
      <p>
        The relationship is <strong>server-driven UI</strong>: the server (Flex) sends a description
        of the screen — sections, values, CTAs, analytics — and the client (commerce-base) is a
        capable renderer that turns that description into native UI and wires up interactions. The
        thin-client principle is why business/region/experiment logic is centralized in Flex: every
        client stays &quot;dumb,&quot; and the rules live in one place.
      </p>
      <p>
        This is exactly why the <code>getFlexScreen</code> data-interface method returns a typed
        model that commerce-base then <code>select</code>s and renders — you saw the call in the
        data-interface module:
      </p>
      <CodeBlock
        lang="tsx"
        filename="plans-page.tsx (recap)"
        code={`const dataInterface = useAtomValue(dataInterfaceAtom);

const { data } = useQuery({
  queryKey: ['flexApi.getScreen.planSelector'],
  queryFn: () =>
    dataInterface.getFlexScreen<FlexPlansPageContentModel>({
      key: 'landingPlans',
      version: 'v1',
      queryParams,
      headers: generateFlexHeaders({ salesPlatform }),
    }),
  select,
});`}
      />

      <h2 id="screens-executions">Screens vs Executions</h2>
      <p>
        Flex has two request families, and the data interface mirrors them exactly:
      </p>
      <MermaidDiagram
        chart={screenExecDiagram}
        title="The two request families"
        caption="Screens are read-only UI descriptions (getFlexScreen). Executions perform state-changing actions (flexExecution). Confusing the two — treating a screen as if it mutates — is a classic mistake."
        minHeight={360}
      />
      <ArticleTable
        caption="Screens vs executions, mapped to the data interface."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Family</th>
              <th>Data-interface method</th>
              <th>Semantics</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Screen</td>
              <td><code>getFlexScreen&lt;T&gt;</code></td>
              <td>Read-only UI description (plans, billing, cancel landing)</td>
            </tr>
            <tr>
              <td>Execution</td>
              <td><code>flexExecution&lt;T&gt;</code></td>
              <td>State-changing action (create payment, cancel, redeem, switch)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="request">A Screen Request End to End</h2>
      <MermaidDiagram
        chart={requestDiagram}
        title="A plans screen request"
        caption="commerce-base calls getFlexScreen through the brand data interface; Flex fetches data, fills a template, resolves offers/copy/experiments, and returns { data, metadata }; commerce-base selects and renders the sections."
        minHeight={400}
      />
      <p>
        Note the header <code>generateFlexHeaders</code> — Flex needs the Disney unified headers
        (account, partner, region, experiment assignments) to compute the right screen. Those headers
        carry the very dimensions (brand, region, flags) from the multi-tenancy module. The response
        is not HTML; it&apos;s a processed template with <code>data.content</code> holding sections and{" "}
        <code>metricsData</code>.
      </p>

      <h2 id="boundary">The Debugging Boundary: Which Repo?</h2>
      <p>
        This is the decision that saves you the most time:
      </p>
      <MermaidDiagram
        chart={boundaryDiagram}
        title="Routing a screen bug to the right repo"
        caption="A wrong VALUE (price/copy/offer) → Flex computes values. A missing SECTION or layout → the templates repo. A rendering/interaction defect → commerce-base. Classify the symptom first."
        minHeight={340}
      />
      <ArticleTable
        caption="Symptom → likely repo."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>Likely owner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wrong price / wrong eligible offer</td>
              <td>Flex BFF (offer/price selection)</td>
            </tr>
            <tr>
              <td>Wrong experiment behavior / treatment</td>
              <td>Flex (server-side experiment) or commerce-base (client experiment hook)</td>
            </tr>
            <tr>
              <td>Missing section / wrong layout slots</td>
              <td>Templates repo (S3)</td>
            </tr>
            <tr>
              <td>Untranslated copy / raw key shown</td>
              <td>Dictionary content (Cypher), surfaced via commerce-base</td>
            </tr>
            <tr>
              <td>Button does nothing / wrong navigation</td>
              <td>commerce-base (interaction, routing, state)</td>
            </tr>
            <tr>
              <td>Loading/error state broken</td>
              <td>commerce-base (React Query wiring)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="experiments">Where Experiments Live</h2>
      <p>
        Experiments are a special case worth calling out because they can live on <em>either</em>{" "}
        side. Some are <strong>client-side</strong> in commerce-base (the <code>wpnx-*</code> hooks
        from the experiments module, read from the SDK). Others are <strong>server-side</strong> in
        Flex (the screen it returns already reflects the treatment — e.g. a different eligible offer).
        When an experiment behaves wrong, your first question is <em>which side owns this treatment</em>:
        if the returned <code>data.content</code> is already wrong, it&apos;s Flex; if commerce-base
        gates UI on a hook, it&apos;s here. (There is a dedicated Flex academy — the{" "}
        <code>growth-life-client-api</code> Mastery track — that goes deep on the server side.)
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does commerce-base relate to Flex?'"
        intro="Lead with server-driven UI, then the three repos, then the debugging boundary."
        steps={[
          "It's server-driven UI: Flex (growth-life-client-api), a template-driven Koa BFF, computes a description of the screen; commerce-base is the renderer that turns { data, metadata } into native UI and handles interactions.",
          "Three repos: commerce-base renders; Flex computes screens/executions and fills templates; a separate templates repo (S3) owns layout and which sections exist.",
          "Two request families mirrored in the data interface: getFlexScreen (read-only screens) and flexExecution (state-changing actions).",
          "Debugging boundary: a wrong value (price/offer/copy) points at Flex; a missing section/layout points at the templates repo; a rendering/interaction/loading bug points at commerce-base.",
          "Experiments can be client-side (wpnx-* hooks here) or server-side (Flex returns the treated screen) — identify which side owns the treatment. A dedicated Flex academy covers the server side.",
        ]}
      />

      <h2 id="challenge">Challenge: Route the Bug to the Right Repo</h2>
      <InterviewChallenge
        title="Triage four screen defects across the three repos"
        scenario={
          <>
            Four reports land: (1) the cancel screen is missing its retention-offer section entirely;
            (2) the plan price is wrong for users in Turkey; (3) tapping &quot;Keep my plan&quot; does
            nothing; (4) a button label renders as a raw key. For each, name the most likely repo and
            explain your reasoning from the render-vs-compute-vs-layout boundary.
          </>
        }
        tasks={[
          "Classify each defect: commerce-base, Flex BFF, templates repo, or dictionary content.",
          "Justify (1) using the 'missing section vs wrong value' distinction.",
          "Justify (2) using the 'value is computed upstream' principle.",
          "Justify (3) and (4) — one is interaction, one is copy content.",
        ]}
        pitfalls={[
          "Assuming a visible defect is always a commerce-base change.",
          "Editing templates for a wrong-value bug, or Flex for a missing-section bug.",
          "Treating a raw-key render as a code bug rather than missing dictionary content.",
        ]}
        signal="A strong answer sends (1) missing section → templates repo, (2) wrong Turkey price → Flex offer/price logic, (3) dead button → commerce-base interaction/state, (4) raw key → dictionary content (Cypher), surfaced by commerce-base's missing-key path — classifying each by whether it's layout, value, interaction, or content."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(1) Missing retention-offer section →</strong> the <strong>templates repo</strong>.
          Which sections exist in a screen is layout, authored in{" "}
          <code>growth-life-client-templates</code> (S3). A whole section absent is structural, not a
          bad value.
        </p>
        <p>
          <strong>(2) Wrong Turkey price →</strong> the <strong>Flex BFF</strong>. Eligible offer and
          price are <em>computed</em> upstream; a region-scoped wrong value points at Flex&apos;s
          offer/price/experiment logic, not the renderer.
        </p>
        <p>
          <strong>(3) &quot;Keep my plan&quot; does nothing →</strong> <strong>commerce-base</strong>.
          Interaction, routing, and client state are the renderer&apos;s job — the button&apos;s
          handler or navigation is broken here.
        </p>
        <p>
          <strong>(4) Raw key rendered →</strong> <strong>dictionary content</strong>. The key exists
          in code but is untranslated/missing in the relevant dictionary; commerce-base&apos;s{" "}
          <code>useDictionary</code> surfaces the miss (and fires{" "}
          <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code>), but the fix is content in Cypher, not code.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>commerce-base renders; Flex decides.</strong> It&apos;s server-driven UI —{" "}
          Flex returns a screen description, commerce-base turns it into UI.
        </li>
        <li>
          <strong>Three repos.</strong> commerce-base (render), Flex/growth-life-client-api (compute),
          templates repo on S3 (layout).
        </li>
        <li>
          <strong>Two families.</strong> <code>getFlexScreen</code> (read-only screens),{" "}
          <code>flexExecution</code> (state-changing actions).
        </li>
        <li>
          <strong>The debugging boundary.</strong> Wrong value → Flex; missing section → templates;
          interaction/loading → commerce-base; raw key → dictionary content.
        </li>
        <li>
          <strong>Experiments span both sides.</strong> Client-side <code>wpnx-*</code> hooks here, or
          server-side treatment baked into the Flex screen — identify which.
        </li>
      </ul>
    </div>
  );
}
