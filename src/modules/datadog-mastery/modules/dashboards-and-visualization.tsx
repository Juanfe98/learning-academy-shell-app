import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dashboardHierarchyDiagram = String.raw`flowchart TD
    DASH["Dashboard<br/>layout_type: ordered | free"]
    DASH --> W1["Widget: Timeseries<br/>'Request Rate'"]
    DASH --> W2["Widget: Query Value<br/>'P99 Latency'"]
    DASH --> W3["Widget: Group<br/>'Payments Service'"]
    W3 --> W3A["Widget: Top List<br/>'Errors by Endpoint'"]
    W3 --> W3B["Widget: SLO<br/>'Availability SLO'"]
    W1 --> Q1["Query: sum:trace.express.request.hits{service:payments-api} by {resource_name}.as_rate()"]
    W2 --> Q2["Query: p99:trace.express.request.duration{service:payments-api}"]
    Q1 --> F1["Formula (optional)<br/>query2 / query1 * 100"]`;

const layoutComparisonDiagram = String.raw`flowchart LR
    subgraph ORDERED["Ordered Layout — layout_type: ordered"]
        direction TB
        O1["Row 1 widget<br/>auto width, stacks top-to-bottom"] --> O2["Row 2 widget<br/>reflows automatically as you add/remove"]
    end
    subgraph FREE["Free Layout — layout_type: free"]
        direction TB
        F1["Widget at x:0 y:0 w:32 h:16"] -.->|"no forced order"| F2["Widget at x:40 y:0 w:20 h:30<br/>manually positioned, can overlap"]
    end`;

const templateVariableFlowDiagram = String.raw`flowchart TD
    SEL["$service selector<br/>default: payments-api"]
    SEL -->|"scopes"| T1["Timeseries: Request Rate<br/>service:$service.value"]
    SEL -->|"scopes"| T2["Query Value: Error Rate<br/>service:$service.value"]
    SEL -->|"scopes"| T3["Top List: Slowest Endpoints<br/>service:$service.value"]
    SEL -->|"scopes"| T4["SLO Widget<br/>filtered by $service"]
    URL["Dashboard URL param<br/>&tpl_var_service=checkout-api"] -.->|"sets on load/share"| SEL`;

const redLayoutDiagram = String.raw`flowchart TD
    SLO["Row 0 — SLO Widget<br/>Availability &amp; latency SLO status"]
    SLO --> RATE["Row 1 — Traffic (Rate)<br/>Timeseries: requests/sec by endpoint"]
    RATE --> ERR["Row 2 — Errors<br/>Timeseries + Top List: error rate % by endpoint"]
    ERR --> DUR["Row 3 — Duration (Latency)<br/>Timeseries p50/p90/p99 + Distribution widget"]
    DUR --> SAT["Row 4 — Saturation (USE, downstream)<br/>Host Map / DB pool + queue utilization"]`;

export const toc: TocItem[] = [
  { id: "dashboard-model", title: "The Dashboard Model: Ordered vs Free Layout", level: 2 },
  { id: "timeboards-vs-screenboards", title: "Timeboards vs Screenboards: Where the Model Came From", level: 3 },
  { id: "widget-catalog", title: "The Widget Catalog: What to Use When", level: 2 },
  { id: "group-widgets", title: "Group Widgets: Organizing at Scale", level: 3 },
  { id: "query-editor", title: "The Query Editor: Metric, Aggregation, Filter, Rollup", level: 2 },
  { id: "formulas-and-functions", title: "Multiple Queries, Formulas & Functions", level: 3 },
  { id: "display-types", title: "Display Types: Line, Bar, Area", level: 3 },
  { id: "template-variables", title: "Template Variables: One Selector, Every Widget", level: 2 },
  { id: "notebooks", title: "Notebooks: Narrative Investigations, Not Dashboards", level: 2 },
  { id: "reusability-and-scale", title: "Reusability & Scale", level: 2 },
  { id: "powerpacks", title: "Powerpacks: Reusable Widget Groups", level: 3 },
  { id: "cloning-json-sharing", title: "Cloning, JSON, and Sharing", level: 3 },
  { id: "dashboards-as-code", title: "Dashboards-as-Code: Terraform and the API", level: 3 },
  { id: "design-best-practices", title: "Design Best Practices: RED, USE, and Top-Down Layout", level: 2 },
  { id: "avoiding-clutter", title: "Avoiding Clutter and Vanity Metrics", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "dashboard-design-challenge", title: "Hands-On Challenge: Payments API Dashboard", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DashboardsAndVisualization() {
  return (
    <div className="article-content">
      <p>
        A dashboard is the interface between telemetry and human judgment. Collecting perfect
        metrics, logs, and traces is worthless if the person on call cannot glance at a screen
        during an incident and know, in five seconds, whether the problem is traffic, errors,
        latency, or a downstream resource running out of headroom. This module is about building
        that five-second dashboard &mdash; not a wall of graphs nobody reads, but a deliberately
        designed instrument panel. It covers the dashboard model, the widget catalog, the query
        editor that powers every widget, template variables for reuse across services, notebooks
        for investigations, and the Dashboards-as-Code workflow senior engineers are expected to
        own.
      </p>

      <h2 id="dashboard-model">The Dashboard Model: Ordered vs Free Layout</h2>
      <p>
        Every Datadog dashboard you create today asks one structural question up front: pick a{" "}
        <strong>layout</strong>. That single choice determines how widgets are arranged and how
        much manual positioning you sign up for.
      </p>
      <ul>
        <li>
          <strong>Ordered layout</strong> (<code>layout_type: ordered</code>) &mdash; widgets stack
          into automatic rows and reflow as you add, remove, or resize them. You do not manage
          pixel coordinates. This is the default for new dashboards and the right choice for the
          vast majority of service and infrastructure dashboards.
        </li>
        <li>
          <strong>Free layout</strong> (<code>layout_type: free</code>) &mdash; every widget carries
          explicit <code>x</code>, <code>y</code>, <code>width</code>, and <code>height</code>{" "}
          coordinates. Nothing reflows automatically, and widgets can overlap on purpose. This is
          the right choice for TV status boards, executive summaries, or any layout where visual
          composition matters more than maintainability.
        </li>
      </ul>

      <MermaidDiagram
        chart={layoutComparisonDiagram}
        title="Ordered vs Free Layout"
        caption="Ordered layout trades visual control for maintainability — widgets reflow automatically as the dashboard evolves. Free layout trades maintainability for visual control — every widget is pinned by coordinates."
        minHeight={320}
      />

      <p>
        Underneath every dashboard is the same three-level structure: a dashboard contains
        widgets, and each widget contains one or more queries (optionally combined with a
        formula). Understanding this hierarchy is what lets you read &mdash; and write &mdash; a
        dashboard&apos;s JSON definition without guessing.
      </p>

      <MermaidDiagram
        chart={dashboardHierarchyDiagram}
        title="Dashboard → Widgets → Queries Hierarchy"
        caption="A Group widget is itself a container for other widgets, which is how you build named rows or sections inside an ordered-layout dashboard without leaving the dashboard model."
        minHeight={420}
      />

      <h3 id="timeboards-vs-screenboards">
        Timeboards vs Screenboards: Where the Model Came From
      </h3>
      <p>
        The ordered/free split is not new &mdash; it is the modern name for a distinction Datadog
        has had since its earliest dashboard product. Before the unified &quot;Dashboard&quot;
        object, Datadog had two separate object types:
      </p>
      <ArticleTable
        caption="Timeboard and Screenboard are the legacy names for what ordered and free layout dashboards do today. You will still hear both terms in older docs, runbooks, and interviews."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Legacy type</th>
              <th>Behavior</th>
              <th>Typical use</th>
              <th>Modern equivalent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Timeboard</strong>
              </td>
              <td>
                Automatic layout, every widget synchronized to a single shared time window
                (fixed or live).
              </td>
              <td>Troubleshooting, correlation, general data exploration.</td>
              <td>
                Dashboard with <code>layout_type: ordered</code>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Screenboard</strong>
              </td>
              <td>
                Free-form layout, images/graphs/logs placed anywhere, can mix time windows per
                widget.
              </td>
              <td>Status boards, TV walls, storytelling views.</td>
              <td>
                Dashboard with <code>layout_type: free</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The practical takeaway: default to ordered layout for anything an engineer will actively
        work from during an incident. Reach for free layout only when the dashboard&apos;s job is
        to be looked at, not interacted with &mdash; a lobby TV, a leadership summary, a fixed
        report.
      </p>

      <h2 id="widget-catalog">The Widget Catalog: What to Use When</h2>
      <p>
        Datadog ships dozens of widget types, but production dashboards lean on a much smaller
        working set. Picking the wrong widget for the data is one of the most common reasons
        dashboards go unread &mdash; a Top List crammed with forty rows is unreadable; a Timeseries
        trying to show a single point-in-time SLA number is the wrong tool entirely.
      </p>

      <ArticleTable
        caption="Match the widget to the shape of the question you're answering: trend over time, current value, ranking, distribution, or relationship."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Widget</th>
              <th>Best for</th>
              <th>Avoid when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Timeseries</strong>
              </td>
              <td>Trends over time &mdash; request rate, latency, error percentage.</td>
              <td>You need a single current number at a glance (use Query Value instead).</td>
            </tr>
            <tr>
              <td>
                <strong>Query Value</strong>
              </td>
              <td>
                One number right now, optionally with conditional-formatting color thresholds
                (e.g. p99 latency, current error rate).
              </td>
              <td>Trend or history matters &mdash; a single number hides regressions.</td>
            </tr>
            <tr>
              <td>
                <strong>Top List</strong>
              </td>
              <td>Ranking many series by one metric &mdash; slowest endpoints, noisiest hosts.</td>
              <td>The list is unbounded and unsorted &mdash; cap it and sort explicitly.</td>
            </tr>
            <tr>
              <td>
                <strong>Table</strong>
              </td>
              <td>
                Multi-column detail per entity &mdash; per-endpoint hits, errors, and p99 side
                by side.
              </td>
              <td>You only need one metric &mdash; a table adds visual weight for nothing.</td>
            </tr>
            <tr>
              <td>
                <strong>Heat Map</strong>
              </td>
              <td>Density of a metric across many hosts/tags over time (e.g. CPU per host).</td>
              <td>Fewer than ~5 series &mdash; a Timeseries reads more clearly.</td>
            </tr>
            <tr>
              <td>
                <strong>Distribution</strong>
              </td>
              <td>
                Histogram of latency or size &mdash; shows the shape of a metric, not just its
                average. Choose &quot;histogram of points&quot; for raw measurements, or
                &quot;histogram of groups&quot; to see the spread of per-group aggregates.
              </td>
              <td>You already show percentiles in a Timeseries &mdash; don&apos;t duplicate.</td>
            </tr>
            <tr>
              <td>
                <strong>Treemap</strong>
              </td>
              <td>Proportions of a whole &mdash; cost by team, traffic share by endpoint.</td>
              <td>The data isn&apos;t naturally part-of-a-whole.</td>
            </tr>
            <tr>
              <td>
                <strong>Geomap</strong>
              </td>
              <td>Geographic distribution &mdash; RUM traffic or errors by country/region.</td>
              <td>Data has no location dimension.</td>
            </tr>
            <tr>
              <td>
                <strong>Host Map</strong>
              </td>
              <td>Fleet-wide view of infrastructure health, colored by a metric per host.</td>
              <td>Fewer than a handful of hosts &mdash; a Table is more precise.</td>
            </tr>
            <tr>
              <td>
                <strong>Service Map</strong>
              </td>
              <td>Visualizing APM service dependencies and request flow between services.</td>
              <td>You need exact numbers &mdash; pair it with a Table, don&apos;t rely on it alone.</td>
            </tr>
            <tr>
              <td>
                <strong>Log Stream</strong>
              </td>
              <td>Live-tailing raw log lines matching a query, in context next to metrics.</td>
              <td>You need aggregated counts &mdash; use a log-based Timeseries instead.</td>
            </tr>
            <tr>
              <td>
                <strong>List / Event Stream</strong>
              </td>
              <td>
                Chronological feed from a specific source &mdash; deploy events, audit trail, CI
                pipeline runs, RUM or security issues.
              </td>
              <td>You need trend analysis, not a raw feed.</td>
            </tr>
            <tr>
              <td>
                <strong>SLO</strong>
              </td>
              <td>Current error budget, burn rate, or status of a defined Service Level Objective.</td>
              <td>You haven&apos;t defined an SLO yet &mdash; this widget has nothing to show.</td>
            </tr>
            <tr>
              <td>
                <strong>Note / Free Text</strong>
              </td>
              <td>
                Annotate context, link to runbooks, or add section headers a viewer needs to
                interpret the data correctly.
              </td>
              <td>Overused &mdash; more than a couple of notes per dashboard signals the layout
                itself isn&apos;t self-explanatory.</td>
            </tr>
            <tr>
              <td>
                <strong>Group</strong>
              </td>
              <td>Bundling related widgets into a collapsible, titled section (see below).</td>
              <td>The dashboard is already small &mdash; grouping one or two widgets adds noise.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="group-widgets">Group Widgets: Organizing at Scale</h3>
      <p>
        A <strong>Group widget</strong> is a container: it holds a list of other widget
        definitions and renders them as a titled, collapsible section. This is the mechanism
        behind &quot;rows&quot; on a well-organized ordered-layout dashboard &mdash; a Traffic row,
        an Errors row, a Latency row &mdash; each one a Group widget a viewer can collapse when
        they don&apos;t need it.
      </p>
      <CodeBlock
        code={`{
  "type": "group",
  "layout_type": "ordered",
  "title": "Payments API — Errors",
  "show_title": true,
  "background_color": "vivid_orange",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Error rate %",
        "requests": [
          {
            "formulas": [{ "formula": "query2 / query1 * 100" }],
            "queries": [
              {
                "data_source": "metrics",
                "name": "query1",
                "query": "sum:trace.express.request.hits{service:payments-api,env:$env.value}.as_count()"
              },
              {
                "data_source": "metrics",
                "name": "query2",
                "query": "sum:trace.express.request.errors{service:payments-api,env:$env.value}.as_count()"
              }
            ],
            "response_format": "timeseries",
            "style": { "palette": "warm" }
          }
        ]
      }
    }
  ]
}`}
        lang="json"
        filename="group-widget.json"
      />
      <p>
        Note the required <code>layout_type: &quot;ordered&quot;</code> on the Group widget
        itself &mdash; groups always auto-flow their children, even on a free-layout dashboard.
        The parent dashboard&apos;s layout choice governs where the group sits; the group governs
        how its own contents stack.
      </p>

      <h2 id="query-editor">The Query Editor: Metric, Aggregation, Filter, Rollup</h2>
      <p>
        Every graphing widget in Datadog &mdash; Timeseries, Query Value, Top List, Table &mdash;
        is powered by the same underlying query editor. Learn it once and every widget type
        becomes a formatting decision on top of the same query. A metric query has four moving
        parts:
      </p>
      <ol>
        <li>
          <strong>Metric</strong> &mdash; the metric name, e.g. <code>trace.express.request.duration</code>.
        </li>
        <li>
          <strong>Space aggregation</strong> &mdash; how values across multiple sources collapse
          into one line: <code>avg</code>, <code>sum</code>, <code>min</code>, <code>max</code>,{" "}
          <code>p99</code>, and others.
        </li>
        <li>
          <strong>Filter</strong> &mdash; scope by tags in curly braces, e.g.{" "}
          <code>{`{service:payments-api,env:prod}`}</code>, with boolean support for{" "}
          <code>AND</code>/<code>OR</code>/<code>NOT</code>/<code>IN</code>.
        </li>
        <li>
          <strong>Group by</strong> &mdash; a <code>by {`{tag}`}</code> clause that draws one
          series per tag value instead of collapsing everything into a single line.
        </li>
      </ol>
      <p>
        A fifth concept, <strong>rollup</strong>, controls time aggregation. Datadog automatically
        rolls up high-resolution data into roughly 300 points per graph so a 4-hour window and a
        30-day window render at the same visual density. You rarely need to touch this &mdash;
        but when you do, the <code>.rollup(method, interval_seconds)</code> function gives you
        manual control:
      </p>
      <CodeBlock
        code={`avg:system.disk.free{*}.rollup(avg, 60)
// Roll up to one-minute buckets, averaging within each bucket,
// regardless of how the graph's time window would auto-rollup otherwise.`}
        lang="text"
        filename="rollup-query.txt"
      />

      <h3 id="formulas-and-functions">Multiple Queries, Formulas & Functions</h3>
      <p>
        The modern query editor lets you define several named queries (<code>query1</code>,{" "}
        <code>query2</code>, &hellip;) against different data sources, then combine them with a{" "}
        <strong>formula</strong> &mdash; arithmetic, ratios, or built-in functions. This is how you
        compute derived signals, like an error rate, that don&apos;t exist as a single raw metric:
      </p>
      <CodeBlock
        code={`{
  "formulas": [
    { "formula": "query2 / query1 * 100" }
  ],
  "queries": [
    {
      "data_source": "metrics",
      "name": "query1",
      "query": "sum:trace.express.request.hits{service:payments-api}.as_count()"
    },
    {
      "data_source": "metrics",
      "name": "query2",
      "query": "sum:trace.express.request.errors{service:payments-api}.as_count()"
    }
  ],
  "response_format": "timeseries"
}
// formula result: error rate % = errors / total requests * 100`}
        lang="json"
        filename="formula-example.json"
      />
      <p>
        Beyond arithmetic, Datadog&apos;s function library covers rate conversion, smoothing,
        rank, interpolation, exclusion, and regression &mdash; available from the same editor
        (click the sigma icon in the UI). The one every engineer should know first is{" "}
        <code>.as_rate()</code> for turning a raw counter into a per-second rate, since submitting
        the wrong aggregation type on a COUNT metric is one of the most common dashboard-reading
        mistakes (a summed counter graphed without rate conversion looks like a hockey stick that
        never comes down).
      </p>

      <h3 id="display-types">Display Types: Line, Bar, Area</h3>
      <ArticleTable
        caption="The display type is a rendering choice on top of the same query — it doesn't change what data is fetched, only how it reads visually."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Display type</th>
              <th>Reads best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>line</code>
              </td>
              <td>Continuous trends &mdash; latency, rates, gauges. The default and most common choice.</td>
            </tr>
            <tr>
              <td>
                <code>bars</code>
              </td>
              <td>Discrete, per-interval counts &mdash; deploys per day, jobs completed per hour.</td>
            </tr>
            <tr>
              <td>
                <code>area</code>
              </td>
              <td>Emphasizing magnitude or stacked composition &mdash; total traffic split by status code.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="template-variables">Template Variables: One Selector, Every Widget</h2>
      <p>
        A dashboard hard-coded to <code>service:payments-api</code> only works for one service.{" "}
        <strong>Template variables</strong> turn a single dashboard definition into a reusable
        template &mdash; one <code>$service</code> or <code>$env</code> dropdown at the top of the
        page that every widget on the dashboard reads from.
      </p>

      <MermaidDiagram
        chart={templateVariableFlowDiagram}
        title="One Template Variable, Many Widgets"
        caption="Changing $service in the dropdown re-scopes every widget wired to it simultaneously — the widgets never hard-code the service name."
        minHeight={340}
      />

      <p>A template variable is defined by four properties:</p>
      <ul>
        <li>
          <strong>Tag or Attribute</strong> &mdash; the tag key (e.g. <code>service</code>) or a
          log/APM/RUM facet.
        </li>
        <li>
          <strong>Name</strong> &mdash; how it&apos;s referenced in queries, e.g.{" "}
          <code>$service</code>.
        </li>
        <li>
          <strong>Default Value</strong> &mdash; what&apos;s selected when the dashboard first
          loads. Defaults to <code>*</code> (all values) if unset.
        </li>
        <li>
          <strong>Available Values</strong> &mdash; which values appear in the dropdown. Defaults
          to <code>(all)</code>, which always includes <code>*</code>.
        </li>
      </ul>
      <p>
        Once defined, a widget references the variable in its <code>from</code> filter (UI) or
        with the <code>$&lt;name&gt;.value</code> syntax inside a raw query string (JSON/API).
        Changing the dropdown updates the dashboard URL as{" "}
        <code>&amp;tpl_var_service=checkout-api</code> &mdash; which is also how you deep-link a
        pre-filtered dashboard from an alert notification straight to the affected service.
      </p>
      <CodeBlock
        code={`{
  "title": "Service Health — $service",
  "layout_type": "ordered",
  "template_variables": [
    { "name": "env", "prefix": "env", "default": "prod" },
    { "name": "service", "prefix": "service", "default": "payments-api" }
  ],
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Request rate",
        "requests": [
          {
            "queries": [
              {
                "data_source": "metrics",
                "name": "query1",
                "query": "sum:trace.express.request.hits{service:$service.value,env:$env.value}.as_rate()"
              }
            ],
            "formulas": [{ "formula": "query1" }],
            "response_format": "timeseries"
          }
        ]
      }
    }
  ]
}`}
        lang="json"
        filename="templated-dashboard.json"
      />
      <p>
        This is the pattern behind every &quot;one dashboard per service&quot; setup at scale: you
        build the dashboard once against <code>$service</code>, clone it zero times, and every
        team just changes the dropdown &mdash; or bookmarks a URL with their service pre-filled.
      </p>

      <h2 id="notebooks">Notebooks: Narrative Investigations, Not Dashboards</h2>
      <p>
        A dashboard answers &quot;what is the current state&quot; and is built to be reused
        indefinitely. A <strong>Notebook</strong> answers &quot;what happened, in what order, and
        why&quot; for one specific investigation &mdash; and is built to be written once and read
        as a story.
      </p>
      <p>
        Notebooks are collaborative rich-text documents that embed live Datadog graphs inline with
        prose, timestamps, and screenshots. Multiple people can edit the same notebook together,
        which makes them the natural home for:
      </p>
      <ul>
        <li>
          <strong>Live incident investigation</strong> &mdash; drop in a graph, write what you
          notice, drop in the next graph that the first one led you to check.
        </li>
        <li>
          <strong>Postmortems</strong> &mdash; the timeline of an incident with the actual graphs
          from the actual window, not paraphrased after the fact.
        </li>
        <li>
          <strong>Runbooks</strong> &mdash; step-by-step operational docs with live graphs
          embedded so the runbook is never stale.
        </li>
      </ul>
      <ArticleTable caption="Same underlying graphing engine, different job." minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Dashboard</th>
              <th>Notebook</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Structure</td>
              <td>Grid of widgets</td>
              <td>Linear rich-text document (supports Markdown shortcuts)</td>
            </tr>
            <tr>
              <td>Lifespan</td>
              <td>Long-lived, reused daily</td>
              <td>Written once for a specific investigation or event</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Monitoring current state</td>
              <td>Explaining a sequence of past events</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="reusability-and-scale">Reusability & Scale</h2>
      <p>
        Once you own more than a handful of dashboards, the problem shifts from &quot;build a good
        dashboard&quot; to &quot;don&apos;t rebuild the same rows forty times.&quot; Datadog gives
        you four escape hatches, in increasing order of rigor.
      </p>

      <h3 id="powerpacks">Powerpacks: Reusable Widget Groups</h3>
      <p>
        A <strong>Powerpack</strong> is a templated group of widgets you save once and drop into
        any number of dashboards as a single reusable building block &mdash; think of it as a
        component library for graphs. Powerpacks are either <strong>preset</strong> (authored by
        Datadog, available to every customer) or <strong>custom</strong> (authored by your org,
        available only internally). A powerpack keeps its own template variables, which can be
        controlled by the powerpack itself or handed off to whatever dashboard it&apos;s dropped
        into.
      </p>
      <CodeBlock
        code={`{
  "type": "powerpack",
  "powerpack_id": "3f9c1e2a-...-b7d4",
  "show_title": true,
  "template_variables": {
    "controlled_externally": [
      { "name": "service", "prefix": "service", "values": ["payments-api"] }
    ]
  }
}`}
        lang="json"
        filename="powerpack-widget.json"
      />
      <p>
        One gotcha worth remembering: <strong>Powerpack widgets are not supported on
        screenboards</strong> &mdash; i.e. not on free-layout dashboards. If a TV status board
        needs the same widget set as your service dashboards, you copy the widgets in directly
        rather than reaching for a Powerpack.
      </p>

      <h3 id="cloning-json-sharing">Cloning, JSON, and Sharing</h3>
      <p>
        For a one-off &quot;I need something like that other dashboard,&quot; the fastest path is
        cloning &mdash; every dashboard list includes preset, out-of-the-box dashboards for your
        installed integrations, and cloning one gives you a fully editable starting point instead
        of a blank canvas.
      </p>
      <p>
        For anything you want to inspect or hand-edit precisely, every widget&apos;s graphing
        editor has a <strong>JSON tab</strong> alongside the visual editor &mdash; the JSON you see
        there mirrors the request body of the Dashboards API exactly, so what you learn editing
        JSON in the UI transfers directly to automation.
      </p>
      <p>
        For distribution to people without Datadog accounts, dashboards support{" "}
        <strong>sharing</strong> as a read-only public link, separate from{" "}
        <code>restricted_roles</code>, which controls who can <em>edit</em> the dashboard inside
        your org. Keep these two access controls distinct in your head: sharing controls external
        read access; restricted roles control internal write access.
      </p>

      <h3 id="dashboards-as-code">Dashboards-as-Code: Terraform and the API</h3>
      <p>
        Clicking through the UI does not scale past a handful of dashboards, and it leaves no
        history of who changed what. Production Datadog setups manage dashboards as code, most
        commonly through the official Terraform provider&apos;s <code>datadog_dashboard</code>{" "}
        resource.
      </p>
      <CodeBlock
        code={`resource "datadog_dashboard" "payments_api" {
  title       = "Payments API — Service Health"
  description = "Managed by Terraform. See runbooks/payments-api.md."
  layout_type = "ordered"
  reflow_type = "auto"

  tags = ["team:payments"]

  template_variable {
    name    = "env"
    default = "prod"
  }

  template_variable {
    name    = "service"
    default = "payments-api"
  }

  widget {
    group_definition {
      title       = "Traffic & Errors"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Request rate"
          request {
            q            = "sum:trace.express.request.hits{service:$service,env:$env}.as_rate()"
            display_type = "line"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Error rate %"
          request {
            q            = "sum:trace.express.request.errors{service:$service,env:$env}.as_count() / sum:trace.express.request.hits{service:$service,env:$env}.as_count() * 100"
            display_type = "bars"
          }
        }
      }
    }
  }
}`}
        lang="hcl"
        filename="payments-api-dashboard.tf"
      />
      <p>
        The required arguments are just <code>title</code> and <code>layout_type</code>{" "}
        (<code>ordered</code> or <code>free</code>); everything else &mdash; <code>tags</code>{" "}
        (only <code>team:&lt;name&gt;</code> tags are accepted), <code>notify_list</code>,{" "}
        <code>restricted_roles</code>, and <code>reflow_type</code> &mdash; is optional. Set{" "}
        <code>reflow_type</code> only on ordered dashboards: <code>auto</code> means widgets
        reflow without explicit positions (what you want almost always), while{" "}
        <code>fixed</code> means every widget must carry its own layout block, which is really
        only useful when migrating a legacy Timeboard verbatim.
      </p>
      <p>
        The same shape is available directly through the Dashboards API for teams not using
        Terraform &mdash; useful for a bootstrap script, a CI job that provisions a dashboard per
        new service, or a homegrown internal tool:
      </p>
      <CodeBlock
        code={`curl -X POST "https://api.datadoghq.com/api/v1/dashboard" \\
  -H "DD-API-KEY: $DD_API_KEY" \\
  -H "DD-APPLICATION-KEY: $DD_APP_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payments-api-dashboard.json`}
        lang="bash"
        filename="create-dashboard.sh"
      />

      <h2 id="design-best-practices">Design Best Practices: RED, USE, and Top-Down Layout</h2>
      <p>
        A dashboard with the right widgets in the wrong order is still a bad dashboard. Two
        naming conventions from the SRE world give you a default row order so you stop
        re-deciding layout from scratch every time:
      </p>
      <ArticleTable
        caption="RED is for anything that serves requests. USE is for anything that consumes a finite resource. A payments API dashboard usually needs both — RED for the service, USE for what it depends on."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Stands for</th>
              <th>Applies to</th>
              <th>Watch for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>RED</strong>
              </td>
              <td>Rate, Errors, Duration</td>
              <td>Request-driven services (APIs, microservices)</td>
              <td>Sudden rate drop, rising error %, latency percentile creep</td>
            </tr>
            <tr>
              <td>
                <strong>USE</strong>
              </td>
              <td>Utilization, Saturation, Errors</td>
              <td>Finite resources (hosts, DB connection pools, queues, disks)</td>
              <td>High utilization with rising saturation &mdash; the resource is about to become the bottleneck</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        Combine them into a <strong>top-down layout</strong>: start with the SLO &mdash; is the
        service meeting its objective right now &mdash; then work down through symptoms (RED) to
        root causes (USE on dependencies). Anyone opening the dashboard during an incident reads
        top to bottom and narrows in, instead of scanning forty equally-weighted graphs looking
        for the one that matters.
      </p>

      <MermaidDiagram
        chart={redLayoutDiagram}
        title="A RED-Method Service Dashboard, Top to Bottom"
        caption="Every row answers one question and, if the answer is bad, points you at the next row down. The SLO widget at the top is the single glance that tells you whether to keep scrolling at all."
        minHeight={420}
      />

      <h3 id="avoiding-clutter">Avoiding Clutter and Vanity Metrics</h3>
      <ul>
        <li>
          <strong>Cap Top List and Table widgets.</strong> An unbounded ranking widget with 200
          rows is not a ranking &mdash; it&apos;s a database dump. Limit to the top 10&ndash;20 and
          sort explicitly.
        </li>
        <li>
          <strong>Cut vanity metrics.</strong> Total lifetime request count on an operational
          dashboard tells you nothing actionable during an incident &mdash; it never changes fast
          enough to matter. If a widget can&apos;t change someone&apos;s next action, remove it.
        </li>
        <li>
          <strong>One dashboard, one audience.</strong> A dashboard trying to serve on-call
          engineers and executive leadership at once usually serves neither &mdash; build two.
        </li>
        <li>
          <strong>Prefer rate over raw counters.</strong> A raw COUNT metric graphed without{" "}
          <code>.as_rate()</code> or <code>.as_count()</code> normalization is the single most
          common source of a dashboard that looks alarming but is actually just correctly
          accumulating.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How would you design a service health dashboard?"
        intro="Strong answers describe a layout decision process, not a list of widgets. Weak answers just name widget types."
        steps={[
          "Open with the audience and the question the dashboard must answer in five seconds — usually 'is this service healthy right now, and if not, why.'",
          "Lead with an SLO widget or the closest proxy if no formal SLO exists yet — this is the single glance that decides whether anyone needs to keep reading.",
          "Apply RED for the service itself: a traffic row, an errors row, a duration row with percentiles (not just averages — averages hide p99 pain).",
          "Extend into USE for anything the service depends on that can saturate: DB connection pool, queue depth, downstream API rate limits.",
          "Close by naming reuse: wire $env and $service as template variables so the same dashboard definition works for every service on the team instead of forking one per repo.",
        ]}
      />
      <InterviewPlaybook
        title="Timeboard vs Screenboard, ordered vs free — what's the actual difference?"
        intro="This tests whether the candidate understands Datadog's dashboard model or is just repeating product names."
        steps={[
          "State the mapping plainly: Timeboard is the legacy name for what an ordered-layout dashboard does today; Screenboard is the legacy name for free layout.",
          "Explain the mechanical difference: ordered widgets reflow automatically in a grid; free-layout widgets carry explicit x/y/width/height and never auto-reposition.",
          "Give the decision rule: ordered for anything actively maintained and used for troubleshooting; free for status boards, TV walls, or curated reports where visual composition is the point.",
          "Mention the gotcha: some widget types and features — Powerpacks, for example — are explicitly unsupported on free-layout (screenboard-style) dashboards, which can surprise a team mid-build.",
        ]}
      />

      <h2 id="dashboard-design-challenge">Hands-On Challenge: Payments API Dashboard</h2>
      <InterviewChallenge
        title="Design a RED-Method Dashboard for the Payments API"
        scenario={
          <>
            You own <code>payments-api</code>, a Node/Express service that processes checkout
            requests across <code>staging</code> and <code>prod</code>. It calls a Postgres
            database and a downstream fraud-scoring service. Your team wants one Datadog
            dashboard, reusable across environments, that an on-call engineer can open during an
            incident and immediately understand service health.
          </>
        }
        tasks={[
          "List the widgets you'd include, grouped into rows, and justify the order top-to-bottom.",
          "Write the metric query (metric, space aggregation, filter, group-by) for at least the traffic and error-rate widgets.",
          "Define the template variables you'd add, their names, and their default values — explain how they let this one dashboard cover both staging and prod.",
          "Identify one USE-method widget for a downstream dependency, and explain what saturation signal it should surface.",
          "Name one thing you would deliberately leave off this dashboard, and why including it would be clutter.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Layout (top to bottom, each row a Group widget):</strong>
        </p>
        <ol>
          <li>
            <strong>Row 0 &mdash; SLO:</strong> an SLO widget bound to a &quot;99.9% of checkout
            requests succeed under 500ms&quot; objective. This is the first thing anyone reads.
          </li>
          <li>
            <strong>Row 1 &mdash; Traffic:</strong> Timeseries, request rate by endpoint.
          </li>
          <li>
            <strong>Row 2 &mdash; Errors:</strong> Timeseries for error rate % (formula query), plus
            a Top List of endpoints ranked by error count, capped to the top 10.
          </li>
          <li>
            <strong>Row 3 &mdash; Duration:</strong> Timeseries with p50/p90/p99 overlaid, plus a
            Distribution widget (histogram of points) to see the full latency shape, not just the
            percentile lines.
          </li>
          <li>
            <strong>Row 4 &mdash; Saturation (USE, downstream):</strong> a Query Value for Postgres
            connection pool utilization %, and a Timeseries for fraud-scoring-service queue depth
            &mdash; the two resources most likely to become the bottleneck before the service itself
            fails.
          </li>
        </ol>
        <CodeBlock
          code={`{
  "title": "Payments API — Service Health ($env)",
  "layout_type": "ordered",
  "template_variables": [
    { "name": "env", "prefix": "env", "default": "prod" },
    { "name": "service", "prefix": "service", "default": "payments-api" }
  ],
  "widgets": [
    {
      "definition": {
        "type": "slo",
        "title": "Checkout availability & latency SLO",
        "slo_id": "abc123-slo-id",
        "view_type": "detail"
      }
    },
    {
      "definition": {
        "type": "group",
        "title": "Traffic",
        "layout_type": "ordered",
        "widgets": [
          {
            "definition": {
              "type": "timeseries",
              "title": "Request rate by endpoint",
              "requests": [
                {
                  "queries": [
                    {
                      "data_source": "metrics",
                      "name": "query1",
                      "query": "sum:trace.express.request.hits{service:$service.value,env:$env.value} by {resource_name}.as_rate()"
                    }
                  ],
                  "formulas": [{ "formula": "query1" }],
                  "response_format": "timeseries"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "definition": {
        "type": "group",
        "title": "Errors",
        "layout_type": "ordered",
        "widgets": [
          {
            "definition": {
              "type": "timeseries",
              "title": "Error rate %",
              "requests": [
                {
                  "queries": [
                    {
                      "data_source": "metrics",
                      "name": "hits",
                      "query": "sum:trace.express.request.hits{service:$service.value,env:$env.value}.as_count()"
                    },
                    {
                      "data_source": "metrics",
                      "name": "errors",
                      "query": "sum:trace.express.request.errors{service:$service.value,env:$env.value}.as_count()"
                    }
                  ],
                  "formulas": [{ "formula": "errors / hits * 100" }],
                  "response_format": "timeseries"
                }
              ]
            }
          }
        ]
      }
    }
  ]
}`}
          lang="json"
          filename="payments-api-solution.json"
        />
        <p>
          <strong>Template variables:</strong> <code>$env</code> (default <code>prod</code>) and{" "}
          <code>$service</code> (default <code>payments-api</code>). Every query filters on{" "}
          <code>env:$env.value</code>, so flipping the dropdown to <code>staging</code> re-scopes
          the entire dashboard without touching a single widget definition &mdash; and because{" "}
          <code>$service</code> is also templated, the same dashboard JSON becomes the starting
          Powerpack or clone target for every other service the team owns.
        </p>
        <p>
          <strong>Deliberately left off:</strong> total lifetime request count and a raw log
          stream. Lifetime count is a vanity metric &mdash; it never moves fast enough to inform an
          on-call decision. A full log stream belongs in a Notebook opened during investigation,
          not pinned permanently on a dashboard meant to answer &quot;is it healthy&quot; in five
          seconds.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Every dashboard picks a layout &mdash; <code>ordered</code> (the modern Timeboard,
          auto-flowing, for active use) or <code>free</code> (the modern Screenboard, manually
          positioned, for status boards).
        </li>
        <li>
          Every widget is a query editor in disguise: metric + space aggregation + tag filter +
          group-by, with optional formulas across multiple named queries for derived signals like
          error rate.
        </li>
        <li>
          Template variables (<code>$env</code>, <code>$service</code>) turn one dashboard
          definition into a reusable template instead of one dashboard per service &mdash; wire
          them from day one.
        </li>
        <li>
          Notebooks are for narrating what happened once; dashboards are for monitoring what is
          happening continuously. Don&apos;t use one to do the other&apos;s job.
        </li>
        <li>
          Powerpacks, cloning, and Dashboards-as-Code (Terraform&apos;s{" "}
          <code>datadog_dashboard</code> or the raw API) are how reuse survives past your third
          dashboard &mdash; know that Powerpacks specifically don&apos;t work on free-layout
          dashboards.
        </li>
        <li>
          Layout follows RED (Rate, Errors, Duration) for the service, then USE (Utilization,
          Saturation, Errors) for what it depends on, arranged top-down from SLO to symptom to
          cause &mdash; and every widget that can&apos;t change someone&apos;s next action during an
          incident is clutter.
        </li>
      </ul>
    </div>
  );
}
