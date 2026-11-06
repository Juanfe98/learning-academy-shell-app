import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pillarsDiagram = String.raw`flowchart TD
  Q["A production system is misbehaving"]
  Q --> M["Metrics\n'Is something wrong RIGHT NOW?'"]
  Q --> E["Events\n'What CHANGED around this time?'"]
  Q --> L["Logs\n'What EXACTLY happened, in detail?'"]
  Q --> T["Traces\n'WHERE in the request path is time lost?'"]

  M --> M1["Numeric time series\ncounters, gauges, histograms"]
  E --> E1["Discrete occurrences\ndeploys, alerts, scaling events"]
  L --> L1["Timestamped text/JSON\nfull fidelity, per request"]
  T --> T1["Causally-linked spans\none request across services"]`;

const dataFlowDiagram = String.raw`sequenceDiagram
  participant Host as Host / Container
  participant Agent as Datadog Agent
  participant Intake as Datadog Intake
  participant Store as Storage & Indexing
  participant UI as Dashboards / Monitors / API

  Host->>Agent: App emits metrics (DogStatsD), logs (stdout), traces (tracer SDK)
  Agent->>Agent: Collect, tag, batch (Collector + Forwarder)
  Agent->>Intake: HTTPS POST (Agent always initiates — never the reverse)
  Intake->>Store: Route by product (metrics store, log index, trace store)
  Store->>UI: Query on read (dashboards, monitors evaluate, API reads)
  Note over Agent,Intake: Traffic direction is one-way: Agent to Intake.<br/>Datadog never opens a connection back to your host.`;

const incidentInvestigationDiagram = String.raw`flowchart TD
  ALERT["Monitor fires:\nP99 latency > 2s on checkout-service"]
  ALERT --> DASH["Start in Metrics\nOpen the service dashboard —\nis it latency, errors, saturation, or traffic?"]
  DASH -->|"latency isolated to one endpoint"| APM["Pivot to Traces (APM)\nService Map + Trace flame graph —\nwhich downstream span is slow?"]
  APM -->|"slow span found: checkout-service to payments-db"| LOGS["Pivot to Logs\nFilter by trace_id on that span —\nwhat error or slow query is in the log line?"]
  LOGS --> ROOT["Root cause:\nspecific log line + tag context\n(env, service, version, pod)"]
  DASH -->|"broad infra symptom"| INFRA["Pivot to Infrastructure\nHost/container map — CPU, memory, disk on the node"]
  INFRA --> ROOT`;

const tagCorrelationDiagram = String.raw`flowchart LR
  subgraph Sources["Telemetry sources"]
    HM["Host metrics"]
    CM["Custom metrics\n(DogStatsD)"]
    LG["Logs"]
    TR["APM traces"]
    SY["Synthetics"]
    RM["RUM sessions"]
  end

  TAGS["Unified tags\nenv · service · version"]

  HM --> TAGS
  CM --> TAGS
  LG --> TAGS
  TR --> TAGS
  SY --> TAGS
  RM --> TAGS

  TAGS --> VIEW["Any dashboard, monitor, or search\ncan filter/group by the SAME tag\nacross every product"]`;

export const toc: TocItem[] = [
  { id: "why-observability", title: "Why Observability Matters", level: 2 },
  { id: "monitoring-vs-observability", title: "Monitoring vs Observability", level: 2 },
  { id: "three-pillars", title: "The Three Pillars (and MELT)", level: 2 },
  { id: "pillar-tradeoffs", title: "Cost & Cardinality Tradeoffs", level: 3 },
  { id: "what-is-datadog", title: "What Is Datadog?", level: 2 },
  { id: "product-families", title: "Product Families at a Glance", level: 3 },
  { id: "architecture-data-flow", title: "Architecture & Data Flow", level: 2 },
  { id: "cross-cutting-concepts", title: "Cross-Cutting Concepts", level: 2 },
  { id: "hosts-and-tags", title: "Hosts and Tags", level: 3 },
  { id: "retention-ingestion-indexing", title: "Retention, Ingestion, and Indexing", level: 3 },
  { id: "org-model", title: "The Datadog Org Model", level: 2 },
  { id: "sites", title: "Sites: Where Your Data Lives", level: 3 },
  { id: "api-vs-app-keys", title: "API Keys vs Application Keys", level: 3 },
  { id: "unifying-idea", title: "The Unifying Idea: Everything Is Correlated by Tags", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ObservabilityAndDatadogFundamentals() {
  return (
    <div className="article-content">
      <p>
        Every engineer who has been paged at 3am for a system they cannot explain already
        understands why observability matters. The question is never &quot;do we have
        monitoring&quot; — it&apos;s &quot;can we answer a question about our system that we
        did not think to ask in advance.&quot; That distinction is the entire reason a platform
        like Datadog exists, and it is the mental model this whole academy is built on: every
        later module — the Agent, custom metrics, tagging, dashboards, monitors, log pipelines,
        APM — is a deeper look at one piece of the picture this module draws first.
      </p>

      <h2 id="why-observability">Why Observability Matters</h2>
      <p>
        Modern systems fail in combinatorial ways. A single request might touch a dozen
        services, three databases, a cache layer, a message queue, and a third-party API — any
        one of which can degrade without the others noticing directly. Traditional{" "}
        <strong>monitoring</strong> (dashboards for CPU, memory, uptime) assumes you already
        know which failure modes matter and builds a check for each one. That works for{" "}
        <strong>known-unknowns</strong>: things you know can go wrong, so you instrument them in
        advance (disk fills up, a queue backs up, a health check fails).
      </p>
      <p>
        <strong>Observability</strong> is what lets you investigate{" "}
        <strong>unknown-unknowns</strong> — failure modes nobody wrote a dashboard for, because
        nobody predicted them. The practical test: when a novel incident happens, can you ask
        arbitrary new questions of your system&apos;s telemetry after the fact (&quot;show me
        every request from this one customer&apos;s API key that touched the new pricing
        service in the last 20 minutes&quot;) without having pre-built that exact view? If yes,
        you have observability. If you can only look at the dashboards someone built in advance,
        you have monitoring.
      </p>

      <h2 id="monitoring-vs-observability">Monitoring vs Observability</h2>
      <p>
        These terms get used interchangeably in casual conversation, but the distinction is a
        real interview topic and it drives real architecture decisions — it&apos;s the reason
        Datadog ships high-cardinality tooling (traces, log search, faceted RUM) alongside
        low-cardinality dashboards, instead of just dashboards.
      </p>

      <ArticleTable
        caption="Monitoring answers questions you already thought to ask. Observability lets you ask new ones after the fact."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Monitoring</th>
              <th>Observability</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Question type</td>
              <td>Known-unknowns — predefined failure modes</td>
              <td>Unknown-unknowns — questions you didn&apos;t anticipate</td>
            </tr>
            <tr>
              <td>Interaction model</td>
              <td>Passive — watch dashboards, wait for a threshold alert</td>
              <td>Active — explore, filter, drill down, correlate freely</td>
            </tr>
            <tr>
              <td>Data shape</td>
              <td>Pre-aggregated, low cardinality (avg CPU, error rate)</td>
              <td>High cardinality, per-request context (user_id, trace_id)</td>
            </tr>
            <tr>
              <td>Typical tooling</td>
              <td>Dashboards, uptime checks, threshold alerts</td>
              <td>Distributed tracing, structured log search, exploratory queries</td>
            </tr>
            <tr>
              <td>Datadog analogue</td>
              <td>A dashboard widget + a Monitor with a static threshold</td>
              <td>APM trace explorer, Log Explorer facets, Notebooks</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        In practice you need both, and Datadog is built on that premise: it is not &quot;a
        monitoring tool&quot; or &quot;an observability tool&quot; — it is a platform that
        collects the telemetry observability requires, and layers monitoring (dashboards,
        alerting) on top of the same data.
      </p>

      <h2 id="three-pillars">The Three Pillars (and MELT)</h2>
      <p>
        Observability data is usually described as three pillars — <strong>metrics</strong>,{" "}
        <strong>logs</strong>, and <strong>traces</strong> — plus a fourth signal that Datadog
        treats as a first-class citizen: <strong>events</strong>. Together these four are often
        abbreviated <strong>MELT</strong> (Metrics, Events, Logs, Traces). Each answers a
        different question, at a different granularity, and each has a different cost profile —
        which is why reaching for the right pillar for the right question is a real skill, not
        just terminology.
      </p>

      <MermaidDiagram
        chart={pillarsDiagram}
        title="What Each Pillar Answers"
        caption="Metrics tell you something is wrong. Events tell you what changed. Traces tell you where. Logs tell you exactly what — in that order, most incidents move left to right."
        minHeight={420}
      />

      <ul>
        <li>
          <strong>Metrics</strong> — numeric measurements sampled over time (a counter, gauge,
          rate, or histogram). Cheap to store, cheap to query, aggregate well. They tell you{" "}
          <em>that</em> something is wrong (error rate spiked, latency crossed a threshold) but
          not <em>why</em>.
        </li>
        <li>
          <strong>Events</strong> — discrete, timestamped occurrences: a deploy, a
          config change, an autoscaling action, another monitor firing. Events are what let you
          answer &quot;what changed right before this started?&quot; — Datadog overlays events
          directly on metric graphs for exactly this reason.
        </li>
        <li>
          <strong>Logs</strong> — full-fidelity, timestamped text or structured (JSON) records
          emitted by your application. Highest detail, highest volume, highest cost. They answer{" "}
          <em>what exactly happened</em> for one specific request or error.
        </li>
        <li>
          <strong>Traces</strong> — a tree of causally-linked <strong>spans</strong> that follow
          one request as it moves through multiple services. They answer{" "}
          <em>where</em> time was spent and which downstream dependency is the bottleneck.
        </li>
      </ul>

      <h3 id="pillar-tradeoffs">Cost & Cardinality Tradeoffs</h3>
      <p>
        <strong>Cardinality</strong> — the number of unique combinations of tag/label values — is
        the single biggest cost and design lever across all three pillars. A metric tagged only
        by <code>env</code> and <code>service</code> stays cheap forever. The same metric tagged
        by <code>user_id</code> can silently create millions of unique time series, because every
        distinct tag combination on a metric is billed and stored as its own series. Logs and
        traces don&apos;t have this exact custom-metrics cardinality problem, but they have their
        own cost lever: <strong>volume</strong> (logs) and <strong>sampling rate</strong>
        (traces) — full-fidelity data at scale is expensive, so both pillars give you knobs to
        keep everything or keep only a representative slice.
      </p>

      <ArticleTable
        caption="Same incident, four different lenses — the question you're asking should decide which pillar (or which two) you open first."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Pillar</th>
              <th>Question answered</th>
              <th>Granularity</th>
              <th>Typical cost driver</th>
              <th>Typical retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Metrics</strong>
              </td>
              <td>Is something wrong, and how bad, right now?</td>
              <td>Aggregated time series (per tag combination)</td>
              <td>Custom metric cardinality (unique tag combinations)</td>
              <td>Up to 15 months, standard default</td>
            </tr>
            <tr>
              <td>
                <strong>Logs</strong>
              </td>
              <td>What exactly happened for this one event/request?</td>
              <td>Per-event, full text/JSON</td>
              <td>Ingested GB + indexed events/day (index vs archive split)</td>
              <td>3–30+ days indexed (configurable per index); archives indefinitely in your own storage</td>
            </tr>
            <tr>
              <td>
                <strong>Traces</strong>
              </td>
              <td>Where in the request path did time or errors originate?</td>
              <td>Per-span, causally linked into one trace</td>
              <td>Ingested spans + retained (indexed) spans after sampling</td>
              <td>15 days searchable by default for indexed spans</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="what-is-datadog">What Is Datadog?</h2>
      <p>
        Datadog is a unified, SaaS observability and security platform: instead of running
        separate tools for metrics, logs, tracing, uptime checks, and frontend monitoring — each
        with its own agent, its own query language, and no shared context — Datadog collects all
        of it through one Agent and one tagging model, and lets you pivot between products
        without re-authenticating context. That &quot;pivot without losing context&quot;
        property is the actual product; the individual charts are almost secondary.
      </p>

      <h3 id="product-families">Product Families at a Glance</h3>
      <ArticleTable
        caption="Every product below emits or consumes telemetry tagged the same way — that shared tag surface is what makes them feel like one platform instead of nine."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Product family</th>
              <th>What it does</th>
              <th>Covered in module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Infrastructure Monitoring</td>
              <td>Host, container, and cloud resource metrics; the Live Containers and Live Processes views</td>
              <td>Infrastructure &amp; Container Monitoring</td>
            </tr>
            <tr>
              <td>Metrics</td>
              <td>Time-series storage for out-of-the-box and custom (DogStatsD) metrics</td>
              <td>Metrics &amp; DogStatsD</td>
            </tr>
            <tr>
              <td>APM / Distributed Tracing</td>
              <td>Request-level traces, the Service Map, Continuous Profiler, Deployment Tracking</td>
              <td>APM &amp; Distributed Tracing</td>
            </tr>
            <tr>
              <td>Log Management</td>
              <td>Log collection, processing pipelines, indexes, log-based metrics</td>
              <td>Log Management</td>
            </tr>
            <tr>
              <td>Synthetic Monitoring</td>
              <td>Scripted API and browser tests that simulate user traffic from outside your network</td>
              <td>Synthetic Monitoring &amp; RUM</td>
            </tr>
            <tr>
              <td>Real User Monitoring (RUM)</td>
              <td>Actual end-user session data from browsers and mobile apps, plus Session Replay</td>
              <td>Synthetic Monitoring &amp; RUM</td>
            </tr>
            <tr>
              <td>Cloud Security</td>
              <td>Cloud Security Management (posture + workload protection) and related security signals</td>
              <td>Referenced throughout; not a dedicated module in v1</td>
            </tr>
            <tr>
              <td>CI Visibility</td>
              <td>Pipeline and test execution performance for CI/CD systems</td>
              <td>Referenced throughout; not a dedicated module in v1</td>
            </tr>
            <tr>
              <td>Watchdog</td>
              <td>Built-in anomaly detection that surfaces issues without manually authored monitors</td>
              <td>Query Language, SLOs &amp; Best Practices</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        You will notice every row above emits data that carries the same tags. That is not a
        coincidence — it is the design principle the next few modules build on directly.
      </p>

      <h2 id="architecture-data-flow">Architecture & Data Flow</h2>
      <p>
        At a high level, Datadog&apos;s data path has four stages: something on your
        infrastructure collects telemetry, the <strong>Agent</strong> forwards it to Datadog,
        Datadog stores and indexes it per product, and you consume it back through dashboards,
        monitors, or the API. The critical architectural detail — worth remembering for both
        security review and troubleshooting — is that traffic flows in <strong>one
        direction only</strong>.
      </p>

      <MermaidDiagram
        chart={dataFlowDiagram}
        title="End-to-End Data Flow: Host to Platform"
        caption="The Agent always initiates the connection outward over HTTPS. Datadog never opens an inbound connection to your infrastructure — this is why the Agent works behind NAT and in locked-down VPCs with only an egress rule."
        minHeight={420}
      />

      <p>
        The <strong>Datadog Agent</strong> is a lightweight piece of software you install on each
        host, or run as a container/DaemonSet in orchestrated environments. Internally, it is
        composed of a <strong>Collector</strong> (runs checks and gathers metrics, on a default
        15-second collection interval) and a <strong>Forwarder</strong> (batches and buffers
        payloads, then sends them over HTTPS to Datadog&apos;s intake). Optional components — the
        APM Agent (trace collection) and the Process Agent (live process data) — run alongside
        the main Agent process and are enabled independently. The next module in this academy,{" "}
        <strong>The Datadog Agent</strong>, goes deep on installation, configuration
        (<code>datadog.yaml</code>), Autodiscovery, and integrations; this module only needs you
        to know that the Agent is the thing standing between &quot;telemetry exists on a host&quot;
        and &quot;telemetry exists in Datadog.&quot;
      </p>

      <CodeBlock
        code={`# Once installed, the Agent exposes its own health/status view locally —
# this is the very first command to run when data isn't showing up in Datadog
sudo datadog-agent status

# Key sections to check in the output:
# - "Forwarder" -> are payloads being sent, and is Datadog acknowledging (200s)?
# - "Collector" -> are checks running without errors?
# - "DogStatsD" -> is the Agent receiving custom metrics on port 8125?
# - "Logs Agent" -> is log tailing enabled and are files being read?`}
        lang="bash"
        filename="agent-status.sh"
      />

      <h2 id="cross-cutting-concepts">Cross-Cutting Concepts</h2>
      <p>
        A handful of concepts show up in every single Datadog product, and getting them right
        here saves confusion in every module that follows.
      </p>

      <h3 id="hosts-and-tags">Hosts and Tags</h3>
      <p>
        A <strong>host</strong> is any machine, VM, or container running an Agent — it is
        Datadog&apos;s base unit of infrastructure identity, and it is also a billing dimension
        (Infrastructure Monitoring is priced per host). A <strong>tag</strong> is a
        <code>key:value</code> label (like <code>env:production</code> or{" "}
        <code>service:checkout-api</code>) attached to a host, a metric submission, a log line,
        or a span. Tags are how you slice and filter <em>everything</em> in Datadog — every
        dashboard widget, every monitor query, every log search is, underneath, a filter over
        tags. The dedicated <strong>Tagging Strategy</strong> module covers unified service
        tagging and cardinality limits in depth; for now, the mental model is: tags are the
        join key across your entire observability data.
      </p>

      <h3 id="retention-ingestion-indexing">Retention, Ingestion, and Indexing</h3>
      <p>
        Two words that sound similar but mean very different things — and mixing them up is a
        classic source of &quot;why is my Datadog bill so high&quot; surprises:
      </p>
      <ul>
        <li>
          <strong>Ingestion</strong> — bringing raw telemetry into Datadog at all. For logs,
          ingestion happens as soon as the Agent (or a log forwarder) ships a log line to
          Datadog&apos;s intake — regardless of whether you ever search for it.
        </li>
        <li>
          <strong>Indexing</strong> — making that data searchable and retained for a period of
          time. Datadog&apos;s log platform decouples these two steps deliberately (marketed as
          &quot;Logging without Limits&quot;): you can ingest 100% of your logs cheaply, then
          choose — via index filters — which subset actually gets indexed (searchable,
          retained, and billed per indexed event) versus archived to your own cold storage
          (S3, GCS, Azure Blob) for cheap long-term compliance retention without being
          searchable in the UI.
        </li>
      </ul>
      <p>
        <strong>Retention</strong> is simply how long indexed (searchable) data stays queryable.
        Defaults vary by product and plan — commonly 15 days for indexed log data and up to 15
        months for metrics — and retention is one of the primary cost/detail tradeoffs you tune
        per data type. The <strong>Log Management</strong> module covers index configuration and
        exclusion filters in depth.
      </p>

      <h2 id="org-model">The Datadog Org Model</h2>
      <p>
        Before touching any product, it&apos;s worth understanding the account structure Datadog
        wraps around all of this data, because it affects where your data physically lives and
        how automation authenticates.
      </p>

      <h3 id="sites">Sites: Where Your Data Lives</h3>
      <p>
        A Datadog <strong>organization</strong> lives on exactly one <strong>site</strong> — a
        region-specific deployment of the platform with its own intake endpoint, its own web app
        URL, and (for most sites) full data residency in that region. Picking the wrong site when
        configuring the Agent or an integration is a very common &quot;my data isn&apos;t
        showing up&quot; bug, because the Agent will happily and silently send data to the wrong
        region&apos;s intake if misconfigured.
      </p>

      <ArticleTable
        caption="The site determines the intake endpoint your Agent, integrations, and API calls must target — get this wrong and telemetry vanishes with no error."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Region</th>
              <th>App URL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>US1</td>
              <td>United States (default)</td>
              <td>app.datadoghq.com</td>
            </tr>
            <tr>
              <td>US3</td>
              <td>United States</td>
              <td>app.us3.datadoghq.com</td>
            </tr>
            <tr>
              <td>US5</td>
              <td>United States</td>
              <td>app.us5.datadoghq.com</td>
            </tr>
            <tr>
              <td>EU1</td>
              <td>European Union</td>
              <td>app.datadoghq.eu</td>
            </tr>
            <tr>
              <td>AP1</td>
              <td>Asia-Pacific (Japan)</td>
              <td>app.ap1.datadoghq.com</td>
            </tr>
            <tr>
              <td>AP2</td>
              <td>Asia-Pacific (Australia)</td>
              <td>app.ap2.datadoghq.com</td>
            </tr>
            <tr>
              <td>US1-FED</td>
              <td>US Government (FedRAMP High)</td>
              <td>app.ddog-gov.com</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="api-vs-app-keys">API Keys vs Application Keys</h3>
      <p>
        Datadog has two distinct credential types, and confusing them is one of the most common
        first-week mistakes:
      </p>
      <ul>
        <li>
          <strong>API key</strong> — identifies your organization. It is what the Agent, a
          log forwarder, or any process <em>submitting</em> data uses to prove &quot;this data
          belongs to org X.&quot; API keys are organization-scoped, not user-scoped.
        </li>
        <li>
          <strong>Application key</strong> — identifies a user (or, for service accounts, a
          scoped identity) and is required for most <em>read and management</em> API calls —
          querying data, creating dashboards or monitors programmatically, managing
          configuration via Terraform. Application keys can carry granular scopes to limit what
          the calling application is allowed to do.
        </li>
      </ul>
      <p>
        A useful shorthand: <strong>API key = data goes in.</strong>{" "}
        <strong>Application key = data (and config) comes out, or gets managed.</strong> Most
        non-Agent integrations — Terraform, CI pipelines managing monitors-as-code, custom
        scripts pulling metrics — need both.
      </p>

      <CodeBlock
        code={`# The Agent's main config file always needs an API key to submit data
api_key: "<DATADOG_API_KEY>"
site: "datadoghq.com"   # must match your org's actual site — see the Sites table above

# An Application key is separate, and only needed for API calls that
# read or manage resources (dashboards, monitors, SLOs) — not for the Agent itself
# Example: fetching a monitor's config via the API requires BOTH headers
# DD-API-KEY: <api_key>
# DD-APPLICATION-KEY: <application_key>`}
        lang="yaml"
        filename="datadog.yaml"
      />

      <h2 id="unifying-idea">The Unifying Idea: Everything Is Correlated by Tags</h2>
      <p>
        Here is the concept every later module in this academy assumes you already have: three
        tags — <code>env</code>, <code>service</code>, and <code>version</code> — form what
        Datadog calls <strong>unified service tagging</strong>. Apply those same three tags
        consistently across a service&apos;s metrics, logs, and traces (and RUM, if you have a
        frontend), and Datadog automatically links them — clicking a trace shows you the exact
        logs for that request; clicking a service on a dashboard filters straight to its traces
        and its error logs, without you writing a single join query.
      </p>

      <MermaidDiagram
        chart={tagCorrelationDiagram}
        title="Tags Are the Join Key Across Every Product"
        caption="Six completely different data sources become navigable as one system the moment they share the same env/service/version tags — this is the payoff of tagging discipline, and it's why the Tagging Strategy module exists."
        minHeight={340}
      />

      <p>
        This is why investigating a real incident rarely means picking one pillar and staying
        there — it means starting where the alert put you, and pivoting through the others using
        the shared tags as the thread that connects them.
      </p>

      <MermaidDiagram
        chart={incidentInvestigationDiagram}
        title="One Incident, Investigated Across Three Pillars"
        caption="Metrics tell you WHERE to look first. Traces narrow WHICH downstream call is slow. Logs, filtered by that trace's ID, give you the exact error. The tags carried through every step are what make the pivot instant instead of a manual correlation exercise."
        minHeight={420}
      />

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What's the difference between monitoring and observability?'"
        intro="Weak answers recite the buzzwords. Strong answers ground the distinction in a concrete example and connect it to a real tooling choice."
        steps={[
          "Define monitoring first, simply: watching predefined signals for predefined failure modes — dashboards and threshold alerts for things you already knew could go wrong.",
          "Define observability as the ability to answer NEW questions after the fact, without having pre-built the exact view — this is the known-unknowns vs unknown-unknowns framing.",
          "Give a concrete example: a CPU dashboard is monitoring; being able to filter traces by a specific customer's user_id during an incident nobody predicted is observability.",
          "Connect it to tooling: this is why platforms like Datadog ship high-cardinality tools (trace search, log facets) alongside low-cardinality dashboards — you need both, not one or the other.",
          "Close with the practical takeaway: you build monitoring in advance; you rely on observability during an incident you didn't see coming.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'When do you reach for a trace vs a metric vs a log?'"
        intro="This tests whether a candidate actually investigates incidents methodically, or just says 'check the logs' for everything."
        steps={[
          "Start with metrics when you need to know IF something is wrong and roughly how bad — they're cheap, pre-aggregated, and the first thing a monitor evaluates.",
          "Reach for traces once a metric points at a specific service or endpoint and you need to know WHERE in the request path the time or error is coming from.",
          "Reach for logs once you have a specific trace_id, request, or timestamp and need the exact error message, stack trace, or payload — the full-fidelity detail metrics and traces don't carry.",
          "Name the anti-pattern explicitly: starting with 'grep the logs' on a system doing 10,000 requests/sec is slow and unfocused compared to metrics-to-trace-to-log pivoting — mention this to show production experience, not just theory.",
          "Close with the connective tissue: none of this pivoting works without consistent tagging (env/service/version) across all three pillars — that's the actual enabler.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Incident: Checkout Errors Spike, No Recent Deploy"
        scenario={
          <>
            You&apos;re on call. A Datadog monitor pages you: the error rate on{" "}
            <code>checkout-service</code> jumped from 0.1% to 8% over the last 10 minutes. The
            team&apos;s deploy log shows no deploys in the last 6 hours. Traffic volume looks
            normal on the overview dashboard. You have full access to Metrics, APM, Logs, and
            Infrastructure Monitoring, all correctly tagged with{" "}
            <code>env:production</code>, <code>service:checkout-service</code>, and{" "}
            <code>version</code>.
          </>
        }
        tasks={[
          "Which pillar do you open FIRST, and what specific question are you trying to answer with it? Justify why that's the right starting point given what you already know from the alert.",
          "Describe the next pivot: what would you look for that tells you whether to go to Traces next vs. Infrastructure Monitoring next?",
          "Assume the traces show every failing request timing out on a call to a third-party fraud-detection API. What's the fastest way to confirm this against logs, and what specific tag would you filter by?",
          "The root cause turns out to be the third-party API's own outage, not your code. What would you add to your Datadog setup so this exact failure mode pages someone faster next time?",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Start with Metrics — specifically the service&apos;s dashboard, not a
          generic overview.</strong> The alert already told you WHAT (error rate) and roughly
          WHEN. The open question is WHERE the errors are concentrated: is it every endpoint on
          checkout-service, or one specific one? Breaking the error rate down by{" "}
          <code>resource_name</code> (endpoint) and by downstream dependency tag, if available,
          answers that in seconds — faster than opening logs and scrolling.
        </p>
        <p>
          <strong>2. The pivot decision hinges on whether the errors correlate with a resource
          symptom or a code-path symptom.</strong> If Infrastructure Monitoring shows the host
          or container is under memory/CPU pressure at the same timestamp, go to Infrastructure
          next — it might be a noisy-neighbor or scaling problem, not application logic. If
          resource metrics look flat and the errors are isolated to specific endpoints, go to
          APM/Traces next — that isolates which service call in the request path is actually
          failing.
        </p>
        <CodeBlock
          code={`# Conceptually, the trace query you'd run in APM's trace explorer:
service:checkout-service status:error @http.status_code:5*
# Then group the flame graph by the failing span's resource name —
# if every failing trace bottoms out on the same downstream span
# (e.g. "fraud-api.check"), that span is your suspect.`}
          lang="text"
          filename="apm-trace-query.txt"
        />
        <p>
          <strong>3. Filter logs by the specific failing trace&apos;s <code>trace_id</code></strong>{" "}
          (Datadog surfaces a &quot;view related logs&quot; link directly from a trace span when
          unified service tagging and log-trace correlation are set up correctly) rather than
          searching logs broadly. This is the entire payoff of unified tagging: you don&apos;t
          construct a manual log query from scratch — you pivot from the exact span that failed.
          The logs would likely show a timeout or connection-refused error naming the
          fraud-detection API host.
        </p>
        <p>
          <strong>4. Prevention:</strong> add a dedicated monitor on the specific outbound call —
          e.g. an APM-based monitor on error rate or latency for the{" "}
          <code>fraud-api.check</code> span/resource specifically, not just the service-level
          error rate — so a third-party dependency failure pages with the dependency named in
          the alert title, instead of a generic &quot;checkout-service errors&quot; page that
          requires this whole investigation to identify the actual cause. This is exactly the
          kind of monitor design covered in the <strong>Monitors &amp; Alerting</strong> module.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Monitoring answers questions you already thought to ask; observability lets
          you ask new ones after the fact.</strong> You need both — Datadog provides low-cardinality
          dashboards for the former and high-cardinality trace/log exploration for the latter.
        </li>
        <li>
          <strong>Metrics, Events, Logs, and Traces (MELT)</strong> each answer a different
          question at a different cost. Metrics tell you IF and HOW BAD; events tell you WHAT
          CHANGED; traces tell you WHERE; logs tell you the EXACT detail.
        </li>
        <li>
          <strong>Cardinality drives metric cost; volume and indexing drive log cost; sampling
          drives trace cost.</strong> All three pillars trade detail for cost, in different ways.
        </li>
        <li>
          <strong>Data flows one direction only: Agent to Datadog.</strong> The Agent (Collector
          + Forwarder) always initiates outbound HTTPS; Datadog never opens an inbound connection
          to your infrastructure.
        </li>
        <li>
          <strong>Ingestion and indexing are different steps with different costs</strong> — you
          can ingest everything cheaply and choose a subset to index (search + retain) versus
          archive to your own cold storage.
        </li>
        <li>
          <strong>Everything is correlated by tags</strong> — specifically unified service
          tagging (<code>env</code>, <code>service</code>, <code>version</code>). Get this
          consistent across every product from day one; it is the single decision that determines
          whether Datadog feels like one platform or nine disconnected tools.
        </li>
      </ul>
    </div>
  );
}
