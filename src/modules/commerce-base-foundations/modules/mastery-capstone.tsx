import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fullStackDiagram = String.raw`flowchart TD
  REQ["Request: /es-419/commerce/plans (Hulu, region MX)"]
  REQ --> GSSP["buildGetServerSideProps<br/>loads config + dictionary, composes props"]
  GSSP --> APP["_app: JotaiProvider > QueryProvider"]
  APP --> LAYOUT["getPageLayout → ApplicationLayout"]
  LAYOUT --> HYD["HydrateBaseAtoms<br/>config, region, dictionary, dataInterface"]
  HYD --> PAGE["PlansPage"]
  PAGE --> RQ["useQuery → dataInterface.getFlexScreen"]
  RQ --> FLEX["Flex BFF computes offers/experiments"]
  FLEX --> RENDER["render sections + copy (useDictionary)"]
  RENDER --> EXP["experiment hooks + region logic gate variants"]`;

const triageDiagram = String.raw`flowchart TD
  SYMPTOM["Symptom"]
  SYMPTOM --> S1{"wrong value?<br/>(price/offer/copy)"}
  S1 -->|"yes"| FLEXDICT["Flex (value) or dictionary (copy)"]
  S1 -->|"no"| S2{"data not loading?"}
  S2 -->|"yes"| ENABLED["check enabled gate +<br/>dataInterface hydration"]
  S2 -->|"no"| S3{"wrong per region/brand/flag?"}
  S3 -->|"yes"| DIM["find the dimension:<br/>regionAtom / partnerName / wpnx flag"]
  S3 -->|"no"| S4{"stale after navigation?"}
  S4 -->|"yes"| HYDRATE["atom hydrate-once trap"]
  S4 -->|"no"| RENDER["render/interaction → component"]`;

const ticketDiagram = String.raw`flowchart LR
  READ["Read the ticket:<br/>which dimension(s)?"]
  READ --> LOCATE["Locate: which repo + folder + owner"]
  LOCATE --> CHANGE["Change: smallest safe edit"]
  CHANGE --> TEST["Test: cover every branch (100%)"]
  TEST --> VERIFY["Verify: other brands/regions unaffected"]
  VERIFY --> PR["PR: check CODEOWNERS + change-control"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "full-picture", title: "The Whole System in One Diagram", level: 2 },
  { id: "layer-map", title: "The Layer Map", level: 2 },
  { id: "triage", title: "Debug-by-Symptom Triage", level: 2 },
  { id: "ticket-workflow", title: "The Ticket Workflow", level: 2 },
  { id: "worked-example", title: "A Worked Example: Productionalize a Price Test", level: 2 },
  { id: "pre-pr", title: "The Pre-PR Checklist", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Capstone Challenge: End-to-End Debugging", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function MasteryCapstone() {
  return (
    <div className="article-content">
      <p>
        You now have every layer: the architecture, the page-flow pipeline, the data interface,
        Jotai/React Query/XState, i18n/region, flags/experiments, testing, and tooling. This capstone
        ties them into one mental model and one workflow — so that when a real ticket lands, you can
        trace it top to bottom, locate the exact layer that owns it, make the smallest safe change,
        and ship it with confidence. This is the module you&apos;ll return to when you&apos;re actually
        working.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Mastery isn&apos;t knowing each layer in isolation — it&apos;s knowing how they compose and
        which one owns a given problem. The engineers who move fastest aren&apos;t the ones who read
        the most code; they&apos;re the ones who <em>route</em> a symptom to the right layer in
        seconds and ignore the rest.
      </p>

      <h2 id="full-picture">The Whole System in One Diagram</h2>
      <MermaidDiagram
        chart={fullStackDiagram}
        title="A full request through every layer"
        caption="One request touches every module in this academy: GSSP composes props → providers + hydration seed atoms → the page reads the data interface → Flex computes → commerce-base renders with dictionary/region/experiment logic layered on."
        minHeight={520}
      />

      <h2 id="layer-map">The Layer Map</h2>
      <p>
        Every concern in commerce-base maps to a layer with a clear owner and a home module. Keep this
        table in your head:
      </p>
      <ArticleTable
        caption="The layer map — concern → mechanism → module."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Mechanism</th>
              <th>Module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>What the package is / boundaries</td>
              <td>CUP V2 source library, deep <code>src/</code> imports</td>
              <td>What is commerce-base</td>
            </tr>
            <tr>
              <td>Multi-brand, versions</td>
              <td>pnpm/Turbo, catalogs, <code>PRODUCT</code>/<code>partnerName</code></td>
              <td>Monorepo &amp; multi-tenancy</td>
            </tr>
            <tr>
              <td>How a page loads</td>
              <td>GSSP → <code>getPageLayout</code> → hydration</td>
              <td>Page flow &amp; layouts</td>
            </tr>
            <tr>
              <td>Multi-brand data</td>
              <td><code>dataInterfaceAtom</code> + <code>DATA_INTERFACE</code></td>
              <td>Data-interface pattern</td>
            </tr>
            <tr>
              <td>Server-driven UI source</td>
              <td>Flex BFF (screens/executions)</td>
              <td>commerce-base &amp; Flex</td>
            </tr>
            <tr>
              <td>Server state</td>
              <td>React Query (<code>enabled</code>, <code>select</code>, <code>meta.owner</code>)</td>
              <td>React Query</td>
            </tr>
            <tr>
              <td>Client state</td>
              <td>Jotai atoms + hydration</td>
              <td>Jotai atoms &amp; hydration</td>
            </tr>
            <tr>
              <td>Multi-step flows</td>
              <td>XState machine + hook + <code>switch(state.value)</code></td>
              <td>XState flows</td>
            </tr>
            <tr>
              <td>Localized copy</td>
              <td><code>useDictionary</code> + cypher keys</td>
              <td>Dictionary &amp; i18n</td>
            </tr>
            <tr>
              <td>Region behavior</td>
              <td><code>regionAtom</code> vs <code>model.metadata?.region</code></td>
              <td>Region &amp; globalization</td>
            </tr>
            <tr>
              <td>Flags / experiments</td>
              <td>Mystique <code>wpnx-*</code> + commerce config</td>
              <td>Feature flags / Experiments</td>
            </tr>
            <tr>
              <td>Tests</td>
              <td>Jest/RTL, MSW, 100% coverage</td>
              <td>Testing standards</td>
            </tr>
            <tr>
              <td>Run / build</td>
              <td>Turbo, <code>PRODUCT</code>, API mocking</td>
              <td>Dev &amp; build tooling</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="triage">Debug-by-Symptom Triage</h2>
      <p>
        When something is wrong, don&apos;t start reading code — <strong>classify the symptom</strong>{" "}
        and let it route you:
      </p>
      <MermaidDiagram
        chart={triageDiagram}
        title="Symptom-first triage"
        caption="Wrong value → Flex/dictionary. Not loading → enabled gate + hydration. Wrong per dimension → find the dimension. Stale after navigation → the hydrate-once trap. Rendering/interaction → the component."
        minHeight={460}
      />
      <ArticleTable
        caption="The triage table you'll use most."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>First suspect</th>
              <th>Confirm by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wrong price / offer</td>
              <td>Flex BFF (offer selection)</td>
              <td>Format is correct but amount wrong → value, not rendering</td>
            </tr>
            <tr>
              <td>Raw key / missing copy</td>
              <td>Dictionary content</td>
              <td><code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> in Datadog</td>
            </tr>
            <tr>
              <td>Data never loads (no error)</td>
              <td>React Query <code>enabled</code> gate</td>
              <td>No network request fired; trace upstream query</td>
            </tr>
            <tr>
              <td>&quot;Data interface must be hydrated&quot;</td>
              <td>Missing <code>useHydrateDataInterface</code></td>
              <td>The guard atom threw</td>
            </tr>
            <tr>
              <td>Wrong only in one region</td>
              <td><code>regionAtom</code> vs <code>model.metadata?.region</code></td>
              <td>Which region source the code reads</td>
            </tr>
            <tr>
              <td>Wrong only for one brand</td>
              <td><code>partnerName</code> branch</td>
              <td>Runtime session brand</td>
            </tr>
            <tr>
              <td>Wrong only under a treatment</td>
              <td><code>wpnx-*</code> hook or Flex server experiment</td>
              <td>Which side owns the treatment</td>
            </tr>
            <tr>
              <td>Correct on refresh, wrong after navigation</td>
              <td>Atom hydrate-once trap</td>
              <td>Missing update-on-navigation effect</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="ticket-workflow">The Ticket Workflow</h2>
      <MermaidDiagram
        chart={ticketDiagram}
        title="Read → Locate → Change → Test → Verify → PR"
        caption="Start by identifying which dimension(s) the ticket touches, locate the owning repo/folder, make the smallest safe change, cover every branch, verify other brands/regions are unaffected, and check CODEOWNERS + change-control before the PR."
        minHeight={300}
      />

      <h2 id="worked-example">A Worked Example: Productionalize a Price Test</h2>
      <p>
        A ticket: &quot;The welcome-back price experiment won in EMEA; make the treatment the default
        and clean up the flag.&quot; Trace it with the workflow:
      </p>
      <ol>
        <li>
          <strong>Read → dimensions.</strong> Brand: all. Region: EMEA. Flag: a{" "}
          <code>wpnx-skip-wb-landing-page-emea</code>-style experiment. This is the experiments +
          region dimensions.
        </li>
        <li>
          <strong>Locate.</strong> Is the treatment client-side (a <code>wpnx-*</code> hook in{" "}
          <code>common/hooks/experiments/</code>) or server-side (Flex returns the treated screen)?
          If the price itself is chosen upstream, part of the work is in the <strong>Flex repo</strong>;
          the commerce-base part is removing the client hook and its branch. Grep the{" "}
          <code>FEATURE_ID</code> and flag key across <code>src/</code>, fixtures, and tests.
        </li>
        <li>
          <strong>Change.</strong> Replace the flag read with the deterministic outcome (for EMEA,
          the winning treatment becomes the default), delete the hook + <code>FEATURE_ID</code>, and
          remove the now-dead branch — exactly the productionalization pattern.
        </li>
        <li>
          <strong>Test.</strong> Some tests that asserted the control branch get deleted, not edited.
          Run <code>jest --coverage</code>; an uncovered line reveals a branch you missed.
        </li>
        <li>
          <strong>Verify.</strong> Confirm non-EMEA regions and other brands are unaffected, and that
          the flag key is removed from WeaponX (dead config otherwise).
        </li>
        <li>
          <strong>PR.</strong> Check CODEOWNERS (this likely spans Merch + Experimentation), and note
          any fixture/test deletions clearly.
        </li>
      </ol>
      <p>
        This is the shape of a large fraction of real commerce tickets — recognizing it means you
        already know the moves.
      </p>

      <h2 id="pre-pr">The Pre-PR Checklist</h2>
      <ArticleTable
        caption="Run this before opening a commerce-base PR."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>All branches covered (<code>jest --coverage</code> green)</td>
              <td>100% coverage is enforced; uncovered lines fail the build</td>
            </tr>
            <tr>
              <td>Type-check clean (<code>tsc --noEmit</code>)</td>
              <td>Separate from build — TS errors don&apos;t surface otherwise</td>
            </tr>
            <tr>
              <td>Lint clean (eslint + stylelint, logical CSS)</td>
              <td>RTL-friendly + owner-tag rules enforced</td>
            </tr>
            <tr>
              <td>Other brands/regions unaffected</td>
              <td>Shared code serves three brands and many regions</td>
            </tr>
            <tr>
              <td>CODEOWNERS reviewers correct</td>
              <td>Granular ownership; wrong folder pulls the wrong team</td>
            </tr>
            <tr>
              <td>Dead flags/keys/fixtures removed</td>
              <td>Productionalization must clean up, not just switch</td>
            </tr>
            <tr>
              <td>No hardcoded secrets; PII out of logs/analytics</td>
              <td>SCRAAP + security conventions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through debugging a production commerce issue.'"
        intro="Show a symptom-first method, not a code-first one. Route, then read."
        steps={[
          "Classify the symptom: wrong value, not loading, wrong-per-dimension, stale-after-navigation, or rendering/interaction.",
          "Route it: wrong value → Flex/dictionary; not loading → React Query enabled gate + data-interface hydration; wrong per dimension → identify region (regionAtom vs model.metadata), brand (partnerName), or flag (wpnx-*); stale after nav → the atom hydrate-once trap.",
          "Confirm the layer with a signal (Datadog MISSING_CYPHER_KEY, guard-atom throw, no network request, correct-on-refresh) before reading code.",
          "Make the smallest safe change in the owning repo/folder; cover every branch to satisfy 100% coverage.",
          "Verify other brands/regions are unaffected and run the pre-PR checklist (coverage, types, lint, CODEOWNERS, dead-flag cleanup, security).",
        ]}
      />

      <h2 id="challenge">Capstone Challenge: End-to-End Debugging</h2>
      <InterviewChallenge
        title="Plans page shows the wrong copy and never loads offers — Hulu MX only"
        scenario={
          <>
            Production report: on the Hulu plans page, Mexican users see English button labels AND the
            offer cards never load (infinite skeleton). Disney+ MX is fine; Hulu US is fine. You have
            code and Datadog. Produce a full triage plan that uses every relevant layer from this
            academy.
          </>
        }
        tasks={[
          "Separate the two symptoms (wrong copy vs offers-not-loading) and triage each independently.",
          "For the copy issue, name the dimension, the likely root cause, and the Datadog signal.",
          "For the offers issue, explain the most likely cause of 'infinite skeleton, no error' and how brand/region gating could produce it.",
          "State how you'd confirm each root cause and which repo(s)/layer(s) own the fixes.",
        ]}
        pitfalls={[
          "Treating the two symptoms as one bug — they likely have different root causes.",
          "Assuming offers-not-loading is a backend outage when no request fired (an enabled gate).",
          "Fixing English copy in code when it's untranslated dictionary content for es-419.",
        ]}
        signal="A strong answer splits the symptoms: the copy issue is the language/dictionary dimension (es-419 keys untranslated → MISSING_CYPHER_KEY_IN_DICTIONARY, fix is content not code), and the offers issue is a React Query enabled gate or data-interface hydration issue scoped to Hulu MX (no request fired, no error) — confirming each with a Datadog/network signal and routing fixes to dictionary content, Flex, or commerce-base accordingly."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Split the symptoms.</strong> They almost certainly have different causes.
        </p>
        <p>
          <strong>Wrong copy (English to MX):</strong> this is the <em>language</em> dimension. Copy
          is rendered from cypher keys via <code>useDictionary</code>; English leaking to Spanish
          users means the <code>es-419</code> entries are missing/untranslated, so lookups return{" "}
          <code>undefined</code> and fall back. Confirm with{" "}
          <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> in Datadog (it carries the key + dictionary),
          and use the <code>shouldShowDictionaryKey</code> debug affordance to see the keys. The fix
          is <strong>dictionary content</strong> (Cypher), not commerce-base code — unless a copy
          override remapped the key to one missing in es-419.
        </p>
        <p>
          <strong>Offers never load (infinite skeleton, no error):</strong> &quot;no request, no
          error, stuck loading&quot; is the signature of a React Query <code>enabled</code> gate that
          never becomes true — trace what the offers query depends on (session, location readiness).
          Because it&apos;s scoped to <strong>Hulu MX</strong>, suspect a brand/region-gated condition
          or a Hulu-specific data-interface path (recall Hulu is HTTP-based and SDK-disabled defaults
          to US — so an MX-specific gate may misbehave). Confirm no network request fired (rules out a
          backend outage) and that <code>dataInterfaceAtom</code> is hydrated (else the guard would
          have thrown). The fix lives in <strong>commerce-base</strong> (the gate/hydration) or{" "}
          <strong>Flex</strong> if the screen it returns is empty for Hulu MX. Two symptoms, two
          layers — routed in minutes without reading unrelated code.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>One request touches every layer.</strong> GSSP → providers/hydration → data
          interface → Flex → render with dictionary/region/experiment logic.
        </li>
        <li>
          <strong>Triage by symptom, not by code.</strong> Wrong value → Flex/dictionary; not loading
          → <code>enabled</code>/hydration; wrong-per-dimension → find the dimension; stale-after-nav
          → hydrate-once trap.
        </li>
        <li>
          <strong>Know the four dimensions.</strong> Brand, region, language, flags — scope every bug
          to the right one.
        </li>
        <li>
          <strong>Follow the workflow.</strong> Read → Locate → Change → Test → Verify → PR, smallest
          safe change, 100% coverage.
        </li>
        <li>
          <strong>Clean up and check ownership.</strong> Productionalization removes dead flags;
          CODEOWNERS + change-control before every PR.
        </li>
      </ul>
    </div>
  );
}
