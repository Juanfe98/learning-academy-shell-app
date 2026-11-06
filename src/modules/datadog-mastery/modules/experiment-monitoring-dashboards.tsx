import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const ticketWorkflow = String.raw`flowchart TD
  A["GREAT-1131: Email Screen widgets"] --> B["Scope pages with owning PM<br/>(Sami / Charles / Krysta)"]
  B --> C["Open the template dashboard<br/>XD Experimentation | D+ Signup"]
  C --> D["Add Email Screen widgets<br/>(RUM/logs facets)"]
  D --> E["Wire breakdowns:<br/>variant (control vs treatment) + region"]
  E --> F["Validate every facet returns data<br/>in RUM Explorer"]
  F --> G{"Facets populated?"}
  G -- "no" --> H["Fix facet / check app instrumentation"]
  H --> F
  G -- "yes" --> I["Peer review, then finalize"]`;

const rumToWidget = String.raw`flowchart LR
  subgraph Browser["Disney+ Signup app (browser)"]
    V["RUM view event<br/>@view.name = email screen"]
    A2["RUM action event<br/>email submitted"]
    ER["RUM error event"]
  end
  V --> ATTR["Attributes become<br/>facets + measures"]
  A2 --> ATTR
  ER --> ATTR
  ATTR --> Q["Widget query:<br/>measure + agg + filter + group by"]
  Q --> W["Timeseries / Top List / Table widget"]`;

const variantFlow = String.raw`flowchart LR
  X["Experiment SDK<br/>assigns a variant"] --> Y["App reports it to RUM<br/>addFeatureFlagEvaluation(flag, variant)"]
  Y --> Z["Every RUM event tagged<br/>@feature_flags.&lt;flag&gt; = control | treatment"]
  Z --> G["Widget: group by @feature_flags.&lt;flag&gt;"]
  G --> S1["Series: control"]
  G --> S2["Series: treatment"]`;

const validationFlow = String.raw`flowchart TD
  A["Pick a facet for the widget<br/>(e.g. @feature_flags.signup_email_test)"] --> B["Search it in RUM Explorer<br/>over the experiment's live window"]
  B --> C{"Rows returned?"}
  C -- "yes, with values" --> D["Safe to build the widget"]
  C -- "no such facet" --> E["Attribute exists on events but<br/>facet not created yet"]
  E --> F["Create the facet in RUM Explorer"]
  F --> B
  C -- "facet exists, 0 rows" --> H["App isn't emitting it<br/>OR wrong time range / filter"]
  H --> I["Widen time range, check app<br/>instrumentation with owning eng"]
  I --> B`;

const dashboardLayout = String.raw`flowchart TD
  T["Template variables: $env  $region  $variant"] --> R1
  subgraph R1["Row 1 — Traffic"]
    A["Email Screen views (count)"]
    B["Views by variant (timeseries)"]
  end
  subgraph R2["Row 2 — Performance (Core Web Vitals)"]
    C["LCP p75 by variant"]
    D["INP p75 by variant"]
    E["CLS p75 by variant"]
  end
  subgraph R3["Row 3 — Reliability"]
    F["Error rate by variant"]
    G["Top errors (table)"]
  end
  subgraph R4["Row 4 — Funnel"]
    H["Email submitted action count by variant"]
    I["Continue-rate: submits / views"]
  end
  R1 --> R2 --> R3 --> R4`;

export const toc: TocItem[] = [
  { id: "what-this-ticket-is", title: "What GREAT-1131 Actually Is", level: 2 },
  { id: "the-workflow", title: "The Execution Workflow", level: 2 },
  { id: "rum-for-dashboards", title: "RUM as Dashboard Fuel", level: 2 },
  { id: "facets-vs-measures", title: "Facets vs Measures", level: 3 },
  { id: "the-facets-you-need", title: "The Facets You'll Actually Use", level: 3 },
  { id: "experiment-variant-breakdowns", title: "Control vs Treatment: Experiment Breakdowns", level: 2 },
  { id: "how-variant-data-arrives", title: "How Variant Data Reaches RUM", level: 3 },
  { id: "grouping-by-variant", title: "Grouping a Widget by Variant", level: 3 },
  { id: "regional-variations", title: "Regional Variations", level: 2 },
  { id: "building-the-widgets", title: "Building the Email Screen Widgets", level: 2 },
  { id: "widget-plan", title: "The Widget Plan", level: 3 },
  { id: "template-variables", title: "Template Variables", level: 3 },
  { id: "widget-json", title: "Widget as Code (JSON)", level: 3 },
  { id: "team-conventions", title: "Team Conventions (XD / CUP / Per-Brand Service)", level: 2 },
  { id: "validating-facets", title: "Validating Facets Return Data", level: 2 },
  { id: "interview-framing", title: "How to Approach a 'Build a Dashboard' Ticket", level: 2 },
  { id: "challenge", title: "Challenge: Execute GREAT-1131", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ExperimentMonitoringDashboards() {
  return (
    <div className="article-content">
      <p>
        This module is scoped to a specific piece of work:{" "}
        <strong>
          GREAT-1131 — Build DataDog Dashboards for Experiment Monitoring · D+ Signup · Email
          Screen
        </strong>
        . It is deliberately practical. By the end you should be able to walk up to the template
        dashboard, add the Email Screen widgets, split them by experiment variant and region, and
        prove every facet returns data before you call it done. Everything here maps back to the
        acceptance criteria on the ticket.
      </p>
      <p>
        The mental model to hold: <strong>you are not shipping new instrumentation</strong>. The
        Disney+ Signup app already emits Real User Monitoring (RUM) events. Your job is the{" "}
        <em>read</em> side — turning attributes the app already sends into widgets that let a PM or
        engineer answer &ldquo;is the treatment hurting the Email Screen for any region?&rdquo; at a
        glance.
      </p>

      <h2 id="what-this-ticket-is">What GREAT-1131 Actually Is</h2>
      <p>
        The ticket is one leaf of a larger effort. Parent <code>GREAT-1129</code> is the umbrella
        &ldquo;Build DataDog Dashboards for Experiment Monitoring&rdquo;; each child ticket covers
        one page of the Signup flow. GREAT-1131 is the <strong>Email Screen</strong> page. The work
        is copy-and-extend, not greenfield: there is a{" "}
        <strong>template dashboard</strong> already —{" "}
        <em>XD Experimentation | Monitoring Templates | D+ Signup</em> — and you add the Email Screen
        widgets into it following the pattern the other pages establish.
      </p>
      <p>The acceptance criteria, restated as things you must be able to point at:</p>
      <ul>
        <li>Widgets exist in Datadog using the relevant RUM/logs facets for the Email Screen.</li>
        <li>
          Each widget can break down by <strong>experiment variant</strong> (control vs treatment).
        </li>
        <li>
          <strong>Regional variations</strong> are accounted for (Disney+ ships different flows per
          region).
        </li>
        <li>
          It follows <strong>team conventions</strong> — the XD Team RUM facets, the CUP application,
          and the per-brand service.
        </li>
        <li>
          You have <strong>validated that facets return data</strong> before finalizing. Empty
          widgets that <em>look</em> plausible are the classic failure here.
        </li>
      </ul>
      <p>
        Before touching Datadog, the ticket tells you to scope which pages fall under the Signup
        flow with the owning PM (Sami Morgan, Charles Goon, or Krysta Smith). Do that first — it
        prevents you from building the wrong page&rsquo;s widgets or duplicating a peer&rsquo;s work.
      </p>

      <h2 id="the-workflow">The Execution Workflow</h2>
      <p>
        The order of operations matters. Scoping and facet-validation bookend the actual widget
        building — skipping either is where these tickets go sideways.
      </p>
      <MermaidDiagram
        chart={ticketWorkflow}
        title="GREAT-1131 end-to-end"
        caption="Scope with the PM first, validate facets last — the two steps engineers skip and then have to redo."
        minHeight={460}
      />

      <h2 id="rum-for-dashboards">RUM as Dashboard Fuel</h2>
      <p>
        Every widget you build is a query against RUM data. RUM emits a hierarchy of events —{" "}
        <strong>sessions</strong> contain <strong>views</strong> (page loads / route changes), and
        views contain <strong>actions</strong>, <strong>resources</strong>, <strong>errors</strong>,
        and <strong>long tasks</strong>. The Email Screen is a <em>view</em>; a user tapping
        &ldquo;Continue&rdquo; is an <em>action</em>; a failed request or JS exception is an{" "}
        <em>error</em>. A widget picks an event type, a metric, a filter, and a grouping.
      </p>
      <MermaidDiagram
        chart={rumToWidget}
        title="From RUM event to widget"
        caption="Attributes on RUM events become the facets you filter/group by and the measures you aggregate."
        minHeight={340}
      />

      <h3 id="facets-vs-measures">Facets vs Measures</h3>
      <p>
        This distinction decides how you can use an attribute, so get it right:
      </p>
      <ul>
        <li>
          A <strong>facet</strong> is a <em>qualitative</em> dimension — a string/enum you{" "}
          <strong>filter</strong> and <strong>group by</strong>. Examples:{" "}
          <code>@view.name</code>, <code>@feature_flags.&lt;flag&gt;</code>,{" "}
          <code>@geo.country</code>.
        </li>
        <li>
          A <strong>measure</strong> is a <em>quantitative</em> facet — a number you{" "}
          <strong>aggregate</strong> (avg, p75, max, …). Examples:{" "}
          <code>@view.largest_contentful_paint</code>,{" "}
          <code>@view.loading_time</code>.
        </li>
      </ul>
      <p>
        &ldquo;Break down by variant&rdquo; means <em>group by the variant facet</em>. &ldquo;p75
        LCP&rdquo; means <em>aggregate the LCP measure at the 75th percentile</em>. You will combine
        both in almost every widget.
      </p>

      <h3 id="the-facets-you-need">The Facets You&apos;ll Actually Use</h3>
      <p>
        These are the standard RUM attributes for a funnel page. Confirm the exact names against the
        template dashboard and the XD team&apos;s facet list — custom attributes (like the experiment
        flag) are named by whoever instrumented them.
      </p>
      <ArticleTable
        caption="The RUM building blocks for the Email Screen widgets — verify custom ones in the RUM Explorer."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Facet or measure</th>
              <th>Use in this dashboard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>@view.name</code>
              </td>
              <td>Facet</td>
              <td>Filter to the Email Screen page</td>
            </tr>
            <tr>
              <td>
                <code>@application.id</code> / name
              </td>
              <td>Facet</td>
              <td>Scope to the CUP RUM application</td>
            </tr>
            <tr>
              <td>
                <code>service</code>
              </td>
              <td>Facet</td>
              <td>Per-brand service (e.g. the Disney+ signup service)</td>
            </tr>
            <tr>
              <td>
                <code>@feature_flags.&lt;flag_key&gt;</code>
              </td>
              <td>Facet</td>
              <td>
                Control vs treatment — <strong>group by</strong> this
              </td>
            </tr>
            <tr>
              <td>
                <code>@geo.country</code> / <code>@geo.country_iso_code</code>
              </td>
              <td>Facet</td>
              <td>Regional breakdown / template variable</td>
            </tr>
            <tr>
              <td>
                <code>@view.largest_contentful_paint</code>
              </td>
              <td>Measure</td>
              <td>Load performance (p75)</td>
            </tr>
            <tr>
              <td>
                <code>@view.interaction_to_next_paint</code>
              </td>
              <td>Measure</td>
              <td>Responsiveness (INP, p75)</td>
            </tr>
            <tr>
              <td>
                <code>@view.cumulative_layout_shift</code>
              </td>
              <td>Measure</td>
              <td>Visual stability (CLS, p75)</td>
            </tr>
            <tr>
              <td>
                <code>@action.target.name</code>
              </td>
              <td>Facet</td>
              <td>Count the &ldquo;email submitted&rdquo; action</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="experiment-variant-breakdowns">Control vs Treatment: Experiment Breakdowns</h2>
      <p>
        This is the heart of the ticket. &ldquo;Experiment monitoring&rdquo; means every performance
        and reliability number must be viewable <strong>per variant</strong>, so a regression
        introduced by the treatment is obvious. In Datadog RUM the mechanism is{" "}
        <strong>Feature Flag Tracking</strong>.
      </p>

      <h3 id="how-variant-data-arrives">How Variant Data Reaches RUM</h3>
      <p>
        When the app evaluates an experiment, it reports the assignment to the RUM SDK. Datadog then
        stamps <strong>every RUM event in that session</strong> with the flag and its value, exposed
        as the facet <code>@feature_flags.&lt;flag_key&gt;</code>. The value is the variant —{" "}
        <code>control</code>, <code>treatment</code>, or whatever the experiment names them.
      </p>
      <p>
        You almost certainly won&apos;t write this code for GREAT-1131 (it&apos;s a dashboard
        ticket), but you must understand it so you can debug an empty facet. Browser setup looks like
        this:
      </p>
      <CodeBlock
        code={`import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: '<CUP_APPLICATION_ID>',
  clientToken: '<CLIENT_TOKEN>',
  service: 'disneyplus-signup',      // per-brand service
  env: 'prod',
  // Feature flag tracking (Browser SDK >= 4.25.0)
  enableExperimentalFeatures: ['feature_flags'],
});

// When the experiment SDK assigns a variant, report it to RUM.
// key   = the experiment/flag key, value = the variant (control | treatment)
datadogRum.addFeatureFlagEvaluation('signup_email_screen_test', variant);`}
        lang="javascript"
        filename="rum-init.js"
      />
      <p>
        Report the evaluation <strong>as early as possible</strong> in the view&apos;s life. If the
        app calls <code>addFeatureFlagEvaluation</code> after the view has already been sent, the
        early events for that view won&apos;t carry the flag and your per-variant counts will be
        undercounted. This is the single most common reason an experiment dashboard shows fewer
        &ldquo;treatment&rdquo; views than reality — flag it to the owning engineer if you see it.
      </p>
      <MermaidDiagram
        chart={variantFlow}
        title="Variant assignment → RUM facet → widget series"
        caption="One group-by on the feature-flag facet splits any widget into control and treatment series."
        minHeight={300}
      />

      <h3 id="grouping-by-variant">Grouping a Widget by Variant</h3>
      <p>
        On the widget side there is nothing exotic: set the RUM query, then add a{" "}
        <strong>group by</strong> on the feature-flag facet. In the RUM Explorer the equivalent
        search that proves the data exists looks like:
      </p>
      <CodeBlock
        code={`@type:view @view.name:"email screen" @feature_flags.signup_email_screen_test:*`}
        lang="text"
        filename="rum-explorer-query"
      />
      <p>
        If that returns rows grouped into <code>control</code> and <code>treatment</code>, your
        widget will too. If <code>@feature_flags.signup_email_screen_test:*</code> returns nothing,
        stop — no group-by can rescue a facet with no data. Go to the validation section.
      </p>

      <h2 id="regional-variations">Regional Variations</h2>
      <p>
        Disney+ runs different Signup flows per region, so a treatment can be a win in one market and
        a regression in another. Aggregating globally hides that. Two complementary techniques:
      </p>
      <ul>
        <li>
          <strong>Region as a template variable</strong> (<code>$region</code>) so a reviewer can
          scope the entire dashboard to one market from a dropdown.
        </li>
        <li>
          <strong>Region as a group-by</strong> on the highest-signal widgets (e.g. a table of
          error rate by <em>variant × region</em>) so cross-region regressions surface without
          clicking.
        </li>
      </ul>
      <p>
        Use whatever region dimension the template dashboard already uses — it may be a Datadog geo
        facet like <code>@geo.country</code>/<code>@geo.country_iso_code</code>, or a custom region
        attribute the app sends. Match the template; don&apos;t invent a parallel scheme, or the
        Email Screen page won&apos;t line up with the rest of the Signup dashboard. Check &ldquo;Disney+
        Regional Variations&rdquo; (referenced on the ticket) for the canonical region list so you
        don&apos;t silently drop a market.
      </p>

      <h2 id="building-the-widgets">Building the Email Screen Widgets</h2>

      <h3 id="widget-plan">The Widget Plan</h3>
      <p>
        A funnel-page monitoring section answers four questions in order:{" "}
        <em>are people arriving? is it fast? is it breaking? are they advancing?</em> Every widget
        filters to the Email Screen view and groups by the variant facet.
      </p>
      <MermaidDiagram
        chart={dashboardLayout}
        title="Email Screen widget layout"
        caption="Traffic → performance → reliability → funnel, each split by variant and scoped by the region/env template variables."
        minHeight={520}
      />
      <ArticleTable
        caption="Concrete widget spec for the Email Screen — each row is one widget to add to the template."
        minWidth={940}
      >
        <table>
          <thead>
            <tr>
              <th>Widget</th>
              <th>Type</th>
              <th>Measure / aggregation</th>
              <th>Filter</th>
              <th>Group by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email Screen views</td>
              <td>Timeseries</td>
              <td>count of <code>@type:view</code></td>
              <td><code>@view.name:&quot;email screen&quot;</code></td>
              <td>feature-flag facet</td>
            </tr>
            <tr>
              <td>LCP p75</td>
              <td>Timeseries</td>
              <td>p75 <code>@view.largest_contentful_paint</code></td>
              <td>Email Screen view</td>
              <td>feature-flag facet</td>
            </tr>
            <tr>
              <td>INP / CLS p75</td>
              <td>Timeseries</td>
              <td>p75 of each measure</td>
              <td>Email Screen view</td>
              <td>feature-flag facet</td>
            </tr>
            <tr>
              <td>Error rate</td>
              <td>Timeseries</td>
              <td>
                count <code>@type:error</code> ÷ count <code>@type:view</code>
              </td>
              <td>Email Screen scope</td>
              <td>feature-flag facet</td>
            </tr>
            <tr>
              <td>Top errors</td>
              <td>Top List / Table</td>
              <td>count of <code>@type:error</code></td>
              <td>Email Screen scope</td>
              <td><code>@error.message</code>, variant</td>
            </tr>
            <tr>
              <td>Email submitted</td>
              <td>Query Value / Timeseries</td>
              <td>count of the submit action</td>
              <td>
                <code>@action.target.name</code> for the submit button
              </td>
              <td>feature-flag facet</td>
            </tr>
            <tr>
              <td>Variant × region matrix</td>
              <td>Table</td>
              <td>error rate + LCP p75</td>
              <td>Email Screen scope</td>
              <td>variant, region</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="template-variables">Template Variables</h3>
      <p>
        A template variable dynamically filters or groups every widget from a dropdown. Define one
        from a <strong>tag</strong> (key of a <code>key:value</code> tag) or from a RUM{" "}
        <strong>facet/measure</strong>. For this dashboard add at least <code>$env</code>,{" "}
        <code>$region</code>, and <code>$variant</code>, then reference them in each widget query so
        the whole page reacts to one selection. Set sensible defaults (e.g.{" "}
        <code>$env = prod</code>) so the dashboard isn&apos;t empty or misleading on first load.
      </p>

      <h3 id="widget-json">Widget as Code (JSON)</h3>
      <p>
        You can build widgets in the UI, but reading the JSON makes the moving parts obvious — and
        the XD team may keep the dashboard in code. A single RUM timeseries request for &ldquo;LCP
        p75 by variant&rdquo; is essentially:
      </p>
      <CodeBlock
        code={`{
  "title": "Email Screen — LCP p75 by variant",
  "type": "timeseries",
  "requests": [
    {
      "response_format": "timeseries",
      "queries": [
        {
          "data_source": "rum",
          "name": "lcp_p75",
          "search": {
            "query": "@type:view @view.name:\\"email screen\\" @application.id:$cup_app service:$service $region"
          },
          "compute": {
            "aggregation": "percentile",
            "metric": "@view.largest_contentful_paint",
            "percentile": 75
          },
          "group_by": [
            { "facet": "@feature_flags.signup_email_screen_test", "limit": 10, "sort": { "order": "desc" } }
          ]
        }
      ],
      "formulas": [{ "formula": "lcp_p75" }]
    }
  ]
}`}
        lang="json"
        filename="lcp-by-variant.widget.json"
      />
      <p>
        Note the pieces that satisfy the acceptance criteria in one object:{" "}
        <code>data_source: rum</code>, the Email Screen <code>search</code>, the{" "}
        <code>percentile</code> compute over the LCP measure, and the <code>group_by</code> on the
        feature-flag facet for the variant split. Swap the compute/metric to reuse the same shape for
        INP, CLS, and counts.
      </p>

      <h2 id="team-conventions">Team Conventions (XD / CUP / Per-Brand Service)</h2>
      <p>
        The acceptance criterion &ldquo;follows team conventions&rdquo; is not decoration — a
        dashboard that ignores them won&apos;t line up with sibling pages and will get bounced in
        review. Concretely:
      </p>
      <ul>
        <li>
          <strong>XD Team RUM facets</strong> — the team maintains a canonical set of facets. Use
          those exact facets rather than creating near-duplicates; a one-off facet with a slightly
          different name fragments the data and breaks shared template variables.
        </li>
        <li>
          <strong>CUP app</strong> — scope every query to the correct RUM application
          (<code>@application.id</code>/name). Pulling from the wrong app is a silent way to show
          real-looking-but-wrong numbers.
        </li>
        <li>
          <strong>Per-brand service</strong> — filter on the brand&apos;s <code>service</code> tag so
          Disney+ Signup data isn&apos;t mixed with other brands sharing the app.
        </li>
        <li>
          <strong>Work inside the template</strong> — clone/extend{" "}
          <em>XD Experimentation | Monitoring Templates | D+ Signup</em> and copy an existing
          page&apos;s widget group as your starting point. Consistency with the other Signup pages is
          the goal.
        </li>
      </ul>
      <p>
        Where you don&apos;t know the exact value — the CUP application id, the brand service string,
        the experiment flag key — <strong>read it off the template dashboard&apos;s existing widgets</strong>{" "}
        or ask in the team channel. Don&apos;t guess; a wrong service filter produces a confident,
        empty, wrong widget.
      </p>

      <h2 id="validating-facets">Validating Facets Return Data</h2>
      <p>
        The last acceptance criterion — <em>validated that facets return data before finalizing</em>{" "}
        — is the one most people fake by eyeballing the graph. Do it deliberately. A facet only
        exists once Datadog has ingested events carrying that attribute, and a{" "}
        <strong>custom</strong> facet (like an experiment flag) may need to be <em>created</em> in the
        RUM Explorer before it&apos;s selectable in a widget, even though the data is already flowing.
      </p>
      <MermaidDiagram
        chart={validationFlow}
        title="Facet validation decision tree"
        caption="Distinguish 'facet not created yet' (fixable in the Explorer) from 'app isn't emitting it' (needs engineering)."
        minHeight={480}
      />
      <p>The checklist before you mark GREAT-1131 done:</p>
      <ul>
        <li>
          For every widget, run its query in the RUM Explorer over the experiment&apos;s{" "}
          <strong>live window</strong> (not a stale default) and confirm non-empty results.
        </li>
        <li>
          Confirm the feature-flag facet resolves to <strong>both</strong> <code>control</code> and{" "}
          <code>treatment</code> — a variant with zero rows usually means the flag isn&apos;t being
          reported for that path, not that the treatment has no traffic.
        </li>
        <li>
          Confirm each region in the &ldquo;Regional Variations&rdquo; list actually appears; a
          missing region is a silent coverage gap.
        </li>
        <li>
          Watch for <strong>null/empty groups</strong> in group-bys — they signal events missing the
          attribute (often the early-view timing issue from the variant section).
        </li>
        <li>
          Sanity-check magnitudes against a known number (e.g. total Email Screen views) so a wrong
          app/service filter can&apos;t hide as &ldquo;low traffic.&rdquo;
        </li>
      </ul>

      <h2 id="interview-framing">How to Approach a &ldquo;Build a Dashboard&rdquo; Ticket</h2>
      <p>
        This generalizes well beyond GREAT-1131 — the same shape recurs for every observability
        ticket, and it&apos;s exactly what a senior engineer is expected to do unprompted.
      </p>
      <InterviewPlaybook
        title="Executing a monitoring-dashboard ticket cleanly"
        intro="A strong answer front-loads scoping and back-loads validation; a weak one jumps straight to dragging widgets."
        steps={[
          "Clarify scope with the owner before building — which pages/flows, which experiment, which regions. Ambiguity here costs the most rework.",
          "Anchor to an existing template so your work is consistent and reviewable, and reuse the team's canonical facets rather than inventing new ones.",
          "Model the data first: decide event type, filter, measure vs facet, and the group-by dimensions (here: variant and region) for each widget.",
          "Build the smallest representative widget, prove its facets return real data in the Explorer, then replicate the pattern.",
          "Validate every facet and every group (both variants, every region) over the live window before finalizing — empty-but-plausible widgets are the failure mode.",
          "Get a peer/PM review against the acceptance criteria, not against 'does it look nice.'",
        ]}
      />
      <InterviewPlaybook
        title="Showing control vs treatment in Datadog"
        intro="The interviewer wants to hear the mechanism, not just 'group by variant.'"
        steps={[
          "The app reports each experiment assignment to RUM via feature flag tracking (addFeatureFlagEvaluation), so events carry @feature_flags.<key> = the variant.",
          "On the widget, group by that feature-flag facet to split any metric into control and treatment series.",
          "Add region as a second group-by or a template variable, because a treatment can win globally but regress in one market.",
          "Guard against undercounting: the flag must be reported early in the view, or a variant's counts will be low.",
          "Prove it in the RUM Explorer first — if the facet returns no rows, the dashboard can't either.",
        ]}
      />

      <h2 id="challenge">Challenge: Execute GREAT-1131</h2>
      <InterviewChallenge
        title="Build the Email Screen experiment-monitoring widgets"
        scenario={
          <>
            You&apos;ve confirmed with the PM that the Email Screen is the address-capture step of the
            Disney+ Signup flow, running an A/B test <code>signup_email_screen_test</code> with{" "}
            <code>control</code> and <code>treatment</code> variants across US, UK, and LATAM. The
            template dashboard already has widgets for the previous page. You open the RUM Explorer
            and <code>@feature_flags.signup_email_screen_test:*</code> returns rows for{" "}
            <code>control</code> but <strong>zero</strong> for <code>treatment</code>.
          </>
        }
        tasks={[
          "List the widgets you'll add for the Email Screen and, for each, the event type, filter, measure/aggregation, and group-by.",
          "Explain how you wire control-vs-treatment and regional breakdowns, including which dimensions become template variables.",
          "Diagnose the missing 'treatment' rows: what are the likely causes, and how do you tell 'no traffic' apart from 'flag not reported'?",
          "State exactly what you check to satisfy 'validated that facets return data' before finalizing.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Widgets.</strong> Filter every widget to{" "}
          <code>@type:view @view.name:&quot;email screen&quot;</code> scoped to the CUP app and the
          brand service, then: (1) views count timeseries, (2) LCP/INP/CLS p75 timeseries, (3) error
          rate = errors ÷ views, (4) top errors table by <code>@error.message</code>, (5) email-submit
          action count, (6) a variant × region table. Each groups by{" "}
          <code>@feature_flags.signup_email_screen_test</code>.
        </p>
        <p>
          <strong>Breakdowns.</strong> Group performance/reliability widgets by the feature-flag
          facet for control vs treatment. Add <code>$env</code>, <code>$region</code>, and{" "}
          <code>$variant</code> template variables; keep region as a group-by on the summary table so
          a per-market regression shows without changing the dropdown.
        </p>
        <p>
          <strong>Missing treatment rows.</strong> Almost certainly instrumentation, not traffic. The
          treatment variant isn&apos;t reporting the flag to RUM — either{" "}
          <code>addFeatureFlagEvaluation</code> isn&apos;t called on the treatment code path, or it
          fires after the view is sent. Confirm by searching treatment users another way (a
          treatment-only element/route) and seeing views with no flag. Distinguish from &ldquo;no
          traffic&rdquo; by checking whether the experiment is actually allocating to treatment in
          those regions. This is an engineering fix — raise it; don&apos;t ship a dashboard that
          silently drops the treatment.
        </p>
        <p>
          <strong>Validation.</strong> Run each widget&apos;s query in the RUM Explorer over the live
          experiment window; confirm both variants and all three regions return rows; check for
          null/empty groups; and sanity-check totals against overall Email Screen views. Only then
          finalize.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          GREAT-1131 is a <strong>read-side</strong> task: turn RUM attributes the Signup app already
          emits into Email Screen widgets on the existing D+ Signup template dashboard.
        </li>
        <li>
          <strong>Facets</strong> are filtered/grouped; <strong>measures</strong> are aggregated.
          &ldquo;By variant&rdquo; = group by the <code>@feature_flags.&lt;flag&gt;</code> facet;
          &ldquo;p75 LCP&rdquo; = percentile of a measure.
        </li>
        <li>
          Control vs treatment works because the app reports experiment assignments via{" "}
          <strong>feature flag tracking</strong>; if a variant is empty, suspect instrumentation
          timing, not traffic.
        </li>
        <li>
          Account for <strong>regional variations</strong> with a <code>$region</code> template
          variable <em>and</em> a variant × region breakdown — global averages hide per-market
          regressions.
        </li>
        <li>
          Follow team conventions (XD facets, CUP app, per-brand service) and read unknown values off
          the template rather than guessing.
        </li>
        <li>
          The final gate is <strong>validating every facet returns data</strong> in the RUM Explorer
          — both variants, every region, over the live window. Empty-but-plausible widgets are the
          defect to hunt.
        </li>
      </ul>
    </div>
  );
}
