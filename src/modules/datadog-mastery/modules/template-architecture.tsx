import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dataPathDiagram = String.raw`flowchart TD
  subgraph BROWSER["User's browser (cgi-web)"]
    SDK["@datadog/browser-rum SDK<br/>init via @solo/observe"]
    SDK -->|"automatic"| V["view events<br/>(@view.name, loading_time)"]
    SDK -->|"trackUserInteractions"| A["action events<br/>(click on <button text>)"]
    SDK -->|"addError / console"| E["error events<br/>(@error.source, message)"]
    CTX["SetDatadogUserContext<br/>getExperimentAssignments()"] -->|"setGlobalContextProperty"| STAMP["every event stamped with<br/>@context.experiments.KEY.variantId"]
  end
  V --> DD["Datadog RUM<br/>(10% of prod sessions)"]
  A --> DD
  E --> DD
  STAMP -.-> DD
  DD --> W["dashboard widgets<br/>filter + group those facets"]
  PUP["pup CLI<br/>(dashboards get / update)"] -->|"JSON in, JSON out"| W`;

const lifecycleDiagram = String.raw`flowchart LR
  EPIC["Epic ticket<br/>(one page of the flow)"] --> BUILD["build section in TEMPLATE<br/>validated example queries"]
  BUILD --> TPL["TEMPLATE dashboard<br/>one per flow, owned & reviewed"]
  TPL -->|"new experiment launches"| CLONE["CLONE<br/>find/replace: key · variants ·<br/>region (· button copy)"]
  CLONE --> SPLIT["split touched funnel<br/>one copy per variant leg"]
  SPLIT --> WATCH["monitor experiment"]
  WATCH --> DONE["experiment ends →<br/>archive the clone"]
  DONE -.->|"template untouched"| TPL`;

const anatomyDiagram = String.raw`flowchart TD
  H["HEADER — the cloner's manual<br/>🧩 replace table + caveats"]
  H --> P1["① page section — Email<br/>views · interactions"]
  P1 --> P2["② page section — Consent<br/>views · interactions"]
  P2 --> MORE["…future page sections<br/>(one epic ticket each)"]
  MORE --> F["③ FUNNELS — one per path, route-level<br/>Q: where does the flow leak?"]
  F --> ERR["④ ERRORS — one table per page, noise-filtered<br/>Q: what exactly broke, and for which variant?"]
  ERR --> PERF["⑤ PERFORMANCE — one p75 per page<br/>Q: is any page silently slower?"]
  PERF --> REG["(future) REGIONAL — volume by region, 90d<br/>Q: which markets drive each page?"]`;

const familyDiagram = String.raw`flowchart TD
  subgraph FAMILY["XD Experimentation | Monitoring Templates"]
    DS["D+ Signup ← GREAT-1129 epic<br/>(our dashboard)"]
    DR["D+ Retention"]
    DW["D+ Welcome Back/Reconnects"]
    DA["D+ Account Mgmt/Switch"]
    DI["D+ In-Product Switch"]
    HS["Hulu Signup · Retention · WB"]
    ES["ESPN Signup · Retention · WB"]
  end
  DR -->|"conventions donor"| DS
  DW -->|"conventions donor"| DS
  DS -->|"pattern replicates"| HS
  DS -->|"pattern replicates"| ES`;

export const toc: TocItem[] = [
  { id: "why", title: "The Problem This Architecture Solves", level: 2 },
  { id: "the-model", title: "The Model: Template per Flow, Clone per Experiment", level: 2 },
  { id: "plumbing", title: "The Plumbing: Base Plugins & Where Data Comes From", level: 2 },
  { id: "rum-sdk", title: "The RUM SDK (@solo/observe)", level: 3 },
  { id: "experiment-stamp", title: "How Experiments Get Into Every Event", level: 3 },
  { id: "glimpse-vs-rum", title: "Glimpse vs RUM (Two Instrumentation Layers)", level: 3 },
  { id: "pup", title: "pup: Dashboards as Code", level: 3 },
  { id: "anatomy", title: "The Anatomy: One Question per Section", level: 2 },
  { id: "conventions", title: "The Conventions — and the Intent Behind Each", level: 2 },
  { id: "ecosystem", title: "The Ecosystem: Family, Epic, Ownership", level: 2 },
  { id: "philosophy", title: "The Philosophy Underneath", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TemplateArchitecture() {
  return (
    <div className="article-content">
      <p>
        The two case studies in this academy tell journeys — what happened on GREAT-1131 and
        GREAT-1132. This page is the map: the template architecture itself, explained decision by
        decision, so that when someone asks &quot;why is this dashboard built this way?&quot; you
        can answer from intent, not from memory of steps. Nothing here is accidental; every
        convention exists because a specific failure mode would happen without it.
      </p>

      <h2 id="why">The Problem This Architecture Solves</h2>
      <p>
        Growth teams launch experiments constantly — pricing tests, copy tests, flow changes —
        across three brands and dozens of markets. Every experiment needs monitoring from day one:
        did it break the page? Did progression drop? Only for one variant? Before this
        architecture, each experiment owner faced a blank Datadog canvas. Three predictable
        failures followed:
      </p>
      <ul>
        <li>
          <strong>Monitoring arrived late or never.</strong> Building a good dashboard takes a day
          of query archaeology; experiments shipped without one and problems surfaced via user
          complaints instead of widgets.
        </li>
        <li>
          <strong>Every dashboard was a snowflake.</strong> Different layouts, different filters,
          different definitions of &quot;views&quot; — reviewers had to relearn each one, and
          nobody could compare experiment A&apos;s health to experiment B&apos;s.
        </li>
        <li>
          <strong>Queries were unproven.</strong> A widget that shows zero might mean &quot;no
          errors&quot; or &quot;wrong facet name&quot; — and with no validation discipline, nobody
          knew which.
        </li>
      </ul>
      <p>
        The architecture answers all three with one move: <strong>build the monitoring once per
        flow, correctly, with proof — then let every experiment copy it in minutes.</strong>
      </p>

      <h2 id="the-model">The Model: Template per Flow, Clone per Experiment</h2>
      <p>
        The unit of construction is the <strong>flow</strong>, not the experiment and not the
        page. One template dashboard covers D+ Signup end to end; Retention, Welcome Back, and the
        others each get their own. Why the flow? Because that&apos;s the unit users experience and
        the unit experiments disturb — an experiment on the consent page can hurt conversion two
        pages later, and only a flow-scoped dashboard sees that.
      </p>
      <MermaidDiagram
        chart={lifecycleDiagram}
        title="Template → Clone Lifecycle"
        caption="Epic tickets grow the template one page-section at a time. Experiments never touch the template — they clone it, monitor, and archive. The template stays pristine for the next clone."
        minHeight={380}
      />
      <p>
        The clone ritual is deliberately tiny — find/replace the example experiment key, the
        variant IDs, the region (and on identity pages, the button copy), optionally split a
        funnel per variant leg. Five minutes. That number is the whole product: if cloning took an
        hour, people would skip monitoring again and the architecture would have failed at its one
        job.
      </p>

      <h2 id="plumbing">The Plumbing: Base Plugins &amp; Where Data Comes From</h2>
      <p>
        None of the widgets work without the instrumentation underneath. Three layers feed them,
        all living in the cgi-web codebase:
      </p>
      <MermaidDiagram
        chart={dataPathDiagram}
        title="From Browser to Widget"
        caption="The RUM SDK emits views, actions, and errors automatically; a context provider stamps every event with the user's experiment assignments; pup reads and writes the dashboards that query it all."
        minHeight={520}
      />

      <h3 id="rum-sdk">The RUM SDK (@solo/observe)</h3>
      <p>
        The base plugin is Datadog&apos;s browser SDK, <code>@datadog/browser-rum</code>, wrapped
        by the in-house <code>@solo/observe</code> package which initializes it identically for
        every brand app:
      </p>
      <CodeBlock
        code={`// cgi-web · packages/observe/src/observe.ts (abridged)
datadogRum.init({
  defaultPrivacyLevel: 'mask',          // session replay masks user content
  sessionReplaySampleRate: 10,          // prod: replay for 10% of sessions
  sessionSampleRate: isNonProd ? 100 : 10,  // prod: RUM records 10% of sessions
  trackUserInteractions: true,          // ← auto-captures clicks as action events
  trackLongTasks: true,
  trackResources: true,
  service: initConfig.service,          // per brand: web-solo-commerce-disneyplus
  env, version,
});`}
        lang="typescript"
        filename="packages/observe/src/observe.ts"
      />
      <p>
        Three lines matter enormously for dashboard work:
      </p>
      <ul>
        <li>
          <code>trackUserInteractions: true</code> is why click widgets exist at all — the SDK
          auto-captures every click as an action event, named after the button&apos;s visible
          text. That single config line is the origin of both the convenience (no manual
          instrumentation needed) and the localized-button-name trap (the name changes per
          language and per copy edit).
        </li>
        <li>
          <code>sessionSampleRate: 10</code> in production means <strong>RUM sees roughly 1 in 10
          sessions</strong>. Every number on the dashboard is a sample, not a census. That&apos;s
          fine — the dashboards compare variants against each other and today against yesterday,
          and sampling hits both sides equally. Just never quote a widget number as &quot;total
          users&quot;.
        </li>
        <li>
          <code>service</code> is per brand — <code>web-solo-commerce-disneyplus</code> for D+ —
          which is why every widget query carries a <code>service:</code> filter and why Hulu and
          ESPN get their own template dashboards instead of a shared one.
        </li>
      </ul>

      <h3 id="experiment-stamp">How Experiments Get Into Every Event</h3>
      <p>
        The heart of the whole system is one small provider. On app load, it asks the data
        interface for the user&apos;s WeaponX experiment assignments and writes them into the RUM
        global context — after which <em>every</em> view, action, and error that session emits
        carries them:
      </p>
      <CodeBlock
        code={`// cgi-web · packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx
const getAndSetExperiments = async () => {
  const experiments = await dataInterface.getExperimentAssignments();
  if (experiments) {
    datadogRum.setGlobalContextProperty('experiments', experiments);
  }
};
// → every RUM event now carries:
//   @context.experiments.wpnx-some-experiment.variantId: "control" | "treatment" | ...`}
        lang="typescript"
        filename="datadog.tsx — SetDatadogUserContext"
      />
      <p>
        This explains two things you&apos;ve seen on the dashboards. First, the universal variant
        facet grammar — <code>@context.experiments.&lt;KEY&gt;.variantId:&lt;variant&gt;</code> —
        works on any event type, because the stamp is global. Second, users carry a{" "}
        <em>backpack</em> of assignments: sampling events on any page shows every experiment that
        user is enrolled in anywhere, which is why picking an example experiment for a page means
        checking which keys actually appear in that page&apos;s traffic, not assuming.
      </p>

      <h3 id="glimpse-vs-rum">Glimpse vs RUM (Two Instrumentation Layers)</h3>
      <p>
        In the page code you&apos;ll see components like <code>GlimpsePageView</code> and{" "}
        <code>InteractionMetricsData</code> wrapping the same screens. Don&apos;t confuse the
        layers: <strong>Glimpse is the business-analytics pipeline</strong> (page views and
        interactions with rich metrics payloads, built by Flex and consumed by data teams), while{" "}
        <strong>RUM is the operational pipeline</strong> these dashboards run on. One click on
        &quot;Concordar e Continuar&quot; produces both: a Glimpse interaction event for
        analytics, and a RUM action event (via <code>trackUserInteractions</code>) for us. Same
        click, two audiences. Dashboard questions → RUM; business-funnel questions → Glimpse.
      </p>

      <h3 id="pup">pup: Dashboards as Code</h3>
      <p>
        The build tool is <strong>pup</strong>, the Datadog API CLI. The workflow treats a
        dashboard as a JSON document, never as something you click together in the UI:
      </p>
      <CodeBlock
        code={`# 1. Validate every query with live data BEFORE building anything
pup rum aggregate --query '@type:view @view.name:"/identity/subscriber-agreement" ...' --compute count

# 2. Backup the current dashboard (a shared prod asset!) — every time, no exceptions
pup dashboards get 73r-7qq-9r3   > backup-<date>.json

# 3. Apply changes as full-document updates, one piece at a time, eyeballing each in the UI
pup dashboards update 73r-7qq-9r3 --file step1-divider.json
pup dashboards update 73r-7qq-9r3 --file step2-w1-views.json  # = step1 + one more widget`}
        lang="bash"
        filename="the dashboards-as-code loop"
      />
      <p>
        Why this instead of the UI editor? Three reasons. Widgets are cloned from{" "}
        <em>donors</em> (existing approved widgets) by copying JSON and swapping values — style
        can&apos;t drift and mistakes can only hide in the swapped values, which step 1 already
        validated. Every step file is a full restore point, so a bad apply is a one-command
        rollback. And the step files become the ticket&apos;s audit trail — a reviewer can replay
        the entire build.
      </p>

      <h2 id="anatomy">The Anatomy: One Question per Section</h2>
      <p>
        The dashboard&apos;s shape follows a single rule: <strong>every section answers exactly
        one monitoring question.</strong> Page sections answer &quot;is this page alive and doing
        its job?&quot; — so they hold only views and interactions. Everything that compares{" "}
        <em>across</em> pages is grouped by type at the bottom:
      </p>
      <MermaidDiagram
        chart={anatomyDiagram}
        title="The Dashboard's Shape"
        caption="Slim page sections on top, cross-cutting sections below. When something feels wrong, the section you scroll to IS the question you're asking."
        minHeight={560}
      />
      <p>
        This shape was a mid-build correction, and the reasoning is worth keeping: the naive
        layout repeats all five widget types in every page section. At two pages it&apos;s fine;
        at eight it&apos;s a 40-widget wall where answering &quot;is any page slow?&quot; means
        scrolling past seven unrelated funnels. Grouping by type keeps every question one-scroll
        answerable — which is what the flow owner asked for, and what the older Retention and
        Welcome Back templates already proved out.
      </p>

      <h2 id="conventions">The Conventions — and the Intent Behind Each</h2>
      <ArticleTable
        caption="Every rule exists because of a specific failure it prevents."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Convention</th>
              <th>What it says</th>
              <th>The failure it prevents</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fixed variant columns</td>
              <td>hand-written query per column (c0=Control, c1=T1) with clean aliases</td>
              <td>auto group-by gives machine labels, random order, and a giant N/A row</td>
            </tr>
            <tr>
              <td>Crash-dummy example</td>
              <td>every template widget uses a real, live experiment as its example key</td>
              <td>empty/fake examples can&apos;t prove the queries work (an explicit AC)</td>
            </tr>
            <tr>
              <td>Anchor market per page</td>
              <td>example region = a market where the page actually renders</td>
              <td>US-anchored queries on a regional page show zero and read as an outage</td>
            </tr>
            <tr>
              <td>Route-level funnels, one per path</td>
              <td>no variant/geo filter; separate funnel per branch</td>
              <td>one giant strict funnel zeroes out at regional steps; variant splits belong to clones</td>
            </tr>
            <tr>
              <td>Noise-filtered errors</td>
              <td><code>@error.source:(custom OR report OR console)</code>, top-10 messages</td>
              <td>ad-blocker and extension junk buries real bugs on row 47</td>
            </tr>
            <tr>
              <td>Validate before building</td>
              <td>every widget query runs as a pup count first; zero = fix the facet</td>
              <td>&quot;is zero good news or a typo?&quot; ambiguity, forever</td>
            </tr>
            <tr>
              <td>Backup before update</td>
              <td>fresh <code>dashboards get</code> saved before any write</td>
              <td>the template is a shared prod asset owned by someone else</td>
            </tr>
            <tr>
              <td>Header as manual</td>
              <td>replace-table + caveats live at the top of the dashboard itself</td>
              <td>cloners shouldn&apos;t need a wiki page to use the template correctly</td>
            </tr>
            <tr>
              <td>Human-readable copy</td>
              <td>no query syntax, placeholders, or obscure symbols in headers/titles</td>
              <td>the first reader is always a stranger; labels must self-explain</td>
            </tr>
            <tr>
              <td>Scope annotations in titles</td>
              <td>&quot;(· Brazil)&quot;, &quot;(regional page, all geo)&quot;, &quot;(pt-BR copy)&quot;</td>
              <td>a widget whose scope differs from its neighbors misleads silently</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="ecosystem">The Ecosystem: Family, Epic, Ownership</h2>
      <p>
        The D+ Signup template is one of a family — &quot;XD Experimentation | Monitoring
        Templates&quot; — with one dashboard per flow per brand: Signup, Retention, Welcome
        Back/Reconnects, Account Management, In-Product Switch, across D+, Hulu, and ESPN. The
        older Retention and Welcome Back templates are the convention donors; the Signup build
        (epic GREAT-1129, eight tickets, one page-section each) both follows them and, where
        justified by evidence, improves on them — a real A/B as the example experiment, noise
        filters on identity pages.
      </p>
      <MermaidDiagram
        chart={familyDiagram}
        title="The Template Family"
        caption="Conventions flow from the mature templates into the Signup build; the refined pattern then replicates to the Hulu and ESPN counterparts."
        minHeight={420}
      />
      <p>
        Ownership matters to the working style: the templates belong to the flow&apos;s
        experimentation owner, who is also the reviewer. Practical consequences — backup before
        every write, deviations from donor conventions are presented as reasoned decisions with
        evidence (never silently), and structural direction (like the flow-level regrouping) comes
        from review comments and gets implemented promptly while the dashboard is still small.
      </p>

      <h2 id="philosophy">The Philosophy Underneath</h2>
      <ul>
        <li>
          <strong>Optimize for strangers.</strong> The author reads a dashboard once; cloners and
          reviewers read it forever. Every choice — fixed column aliases, header manual, human
          copy, scope annotations — spends author effort to save stranger effort.
        </li>
        <li>
          <strong>Prove, don&apos;t assume.</strong> Facets are validated with live counts before
          a widget exists; button names come from data, not translation guesses; reference
          conventions are read from exported JSON, not screenshots. Twice in one ticket the data
          contradicted a reasonable assumption — the discipline is the point.
        </li>
        <li>
          <strong>Baselines plus asymmetry, not absolutes.</strong> A 16% funnel can be healthy
          (login diverts) and a 91% funnel can be sick tomorrow. Errors at 900/day can be baseline
          noise while 3-vs-16 between variants is the interesting shape at scale. The dashboards
          are built so the <em>comparisons</em> — variant vs variant, today vs baseline — are
          effortless, because those carry the signal.
        </li>
        <li>
          <strong>Config over code, template over build.</strong> Regional behavior lives in
          per-country config (flip a market, no deploy); monitoring lives in a template (clone an
          experiment, no query archaeology). Both are the same idea: make the recurring operation
          cheap and reviewable, and put the expensive care into the one artifact everyone copies.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          One template per <strong>flow</strong>, cloned per experiment, archived after — the
          template stays pristine and the clone ritual is deliberately a five-minute find/replace.
        </li>
        <li>
          The base plugin stack: <code>@datadog/browser-rum</code> (via{" "}
          <code>@solo/observe</code>) auto-emits views/actions/errors at 10% prod sampling;{" "}
          <code>SetDatadogUserContext</code> stamps every event with{" "}
          <code>@context.experiments.*</code>; Glimpse is the parallel business-analytics layer;
          pup drives everything as JSON.
        </li>
        <li>
          <code>trackUserInteractions: true</code> gives click widgets for free — and is also the
          root cause of the localized-button-name trap on identity pages.
        </li>
        <li>
          Dashboard shape = one question per section: slim page sections, then flow-level
          Funnels, Errors, Performance.
        </li>
        <li>
          Every convention maps to a failure it prevents — if you can&apos;t name the failure,
          question the convention.
        </li>
        <li>
          All numbers are sampled, relative signals. The dashboards exist to make variant-vs-variant
          and today-vs-baseline comparisons effortless, because that&apos;s where experiment risk
          shows up.
        </li>
      </ul>
    </div>
  );
}
