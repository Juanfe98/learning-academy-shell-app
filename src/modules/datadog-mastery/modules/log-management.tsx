import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart TD
    AG["Agent<br/>(file / container / journald)"] --> INTAKE
    K8S["Kubernetes Autodiscovery<br/>(pod annotations)"] --> INTAKE
    API["HTTP Intake API<br/>(direct / SDK)"] --> INTAKE
    FWD["Forwarders<br/>(Lambda, cloud services)"] --> INTAKE["Log Intake<br/>(collection + envelope parsing)"]
    INTAKE --> PIPE["Log Pipeline<br/>(ordered Processors)"]
    PIPE --> METRIC["Log-Based Metrics<br/>(generated from ALL ingested logs)"]
    PIPE --> ARCHIVE["Archives<br/>(S3 / GCS / Azure Blob - 100% of logs)"]
    PIPE --> IDX{"Index Filter<br/>+ Exclusion Filter"}
    IDX -->|"matches, sampled in"| INDEX["Index<br/>(searchable, retention + daily quota)"]
    IDX -->|"excluded / sampled out"| DROP["Not indexed<br/>(still archived, still in metrics)"]`;

const grokBeforeAfterDiagram = String.raw`flowchart TD
    RAW["Raw log line:<br/>2026-08-12T14:22:03.482Z ERROR checkout-service<br/>[order_id=88214,user_id=5521]<br/>payment gateway timeout after 3002ms status=504"]
    RAW --> GROK["Grok Parser Rule:<br/>%{date(...):timestamp} %{word:level} %{notSpace:service.name}<br/>[order_id=%{integer:order.id},user_id=%{integer:usr.id}]<br/>%{data:short_message} status=%{integer:http.status_code}"]
    GROK --> OUT["Parsed attributes (nested JSON):<br/>timestamp, level, service.name,<br/>order.id, usr.id, short_message,<br/>http.status_code"]
    OUT --> REMAP["Remappers assign reserved fields:<br/>Date Remapper -> date<br/>Status Remapper -> status<br/>Service Remapper -> service<br/>Message Remapper -> message"]`;

const loggingWithoutLimitsDiagram = String.raw`flowchart TD
    LOG["Every log ingested"] --> Q1{"Matches an active<br/>Exclusion Filter?"}
    Q1 -->|"No"| INDEXED["Indexed<br/>(fully searchable, counts against quota)"]
    Q1 -->|"Yes, sampled out"| EXCLUDED["Excluded from index<br/>(not searchable, doesn't count against quota)"]
    LOG --> ARCH["Always archived<br/>(100% of logs, cheap cold storage)"]
    LOG --> METRIC2["Always eligible for<br/>Log-Based Metrics<br/>(count / distribution, even if excluded)"]
    INDEXED --> REHYDRATE["Archive Search / Rehydration<br/>brings archived logs back temporarily"]
    EXCLUDED --> REHYDRATE`;

const logsTracesCorrelationDiagram = String.raw`sequenceDiagram
    participant App as Application Code
    participant Tracer as Tracing Library
    participant Log as Log File / stdout
    participant Agent as Datadog Agent
    participant DD as Datadog Backend

    App->>Tracer: start span (checkout.charge_card)
    Tracer-->>App: active trace_id + span_id
    App->>Log: write log line
    Tracer->>Log: inject dd.trace_id / dd.span_id (DD_LOGS_INJECTION=true)
    Agent->>Log: tail file / read stdout
    Agent->>DD: forward parsed log (carries dd.trace_id)
    DD->>DD: correlate log with matching trace on trace_id`;

export const toc: TocItem[] = [
  { id: "log-pipeline-architecture", title: "The End-to-End Log Pipeline", level: 2 },
  { id: "collection-sources", title: "Collecting Logs", level: 2 },
  { id: "agent-and-file-collection", title: "The Agent: Files, Containers & stdout", level: 3 },
  { id: "kubernetes-autodiscovery", title: "Kubernetes Autodiscovery", level: 3 },
  { id: "direct-intake-and-forwarders", title: "Direct API Intake & Forwarders", level: 3 },
  { id: "processing-pipelines-and-processors", title: "Processing Pipelines & Processors", level: 2 },
  { id: "key-processors", title: "The Processors You'll Actually Use", level: 3 },
  { id: "grok-parsing-in-depth", title: "Grok Parsing In Depth", level: 2 },
  { id: "grok-syntax", title: "Grok Syntax", level: 3 },
  { id: "grok-before-after", title: "Before → After: Parsing a Raw Log Line", level: 3 },
  { id: "standard-and-reserved-attributes", title: "Standard & Reserved Attributes", level: 2 },
  { id: "indexes-retention-and-quotas", title: "Indexes, Retention & Quotas", level: 2 },
  { id: "logging-without-limits", title: "Logging Without Limits", level: 2 },
  { id: "log-based-metrics", title: "Log-Based Metrics", level: 2 },
  { id: "archives-rehydration-and-flex-logs", title: "Archives, Rehydration & Flex Logs", level: 2 },
  { id: "sensitive-data-scanner", title: "Sensitive Data Scanner", level: 2 },
  { id: "correlating-logs-and-traces", title: "Correlating Logs With Traces", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function LogManagement() {
  return (
    <div className="article-content">
      <p>
        Every team eventually hits the same wall: logs are cheap to write and expensive to store,
        search, and page on. The engineers who look like log-management experts in an interview
        (or in an incident channel) are not the ones who memorized every processor — they are the
        ones who understand that <strong>ingestion and indexing are two separate decisions</strong>.
        Datadog calls this <strong>Logging without Limits</strong>: you can ingest essentially
        everything cheaply, and then choose — deliberately, per index — what actually gets parsed,
        indexed, retained, and billed. This module builds that mental model end to end: how logs
        get collected, how pipelines turn raw text into structured attributes, and how to keep an
        index quota from ever becoming the reason an outage is invisible.
      </p>

      <h2 id="log-pipeline-architecture">The End-to-End Log Pipeline</h2>
      <p>
        A log&apos;s journey through Datadog has five distinct stages, and knowing the boundary between
        them is what lets you reason about cost and searchability independently.
        <strong> Collection</strong> happens at the source (Agent, integration, SDK, or API).{" "}
        <strong>Intake</strong> is the HTTP/TCP endpoint that receives the raw event.{" "}
        <strong>Pipelines</strong> run an ordered chain of processors that parse raw text into
        structured attributes. From there, each log is evaluated against{" "}
        <strong>index filters</strong> (does it get indexed, and into which index) and{" "}
        <strong>exclusion filters</strong> (should it be sampled out of that index). Regardless of
        that decision, the full stream can also flow to <strong>Archives</strong> and to{" "}
        <strong>log-based metrics</strong> — both operate on everything that was ingested, not just
        what was indexed.
      </p>

      <MermaidDiagram
        chart={pipelineDiagram}
        title="The Full Log Pipeline"
        caption="Notice the fork after the pipeline: Archives and Log-Based Metrics see 100% of ingested logs. Only the Index Filter + Exclusion Filter path decides what becomes searchable and billed as indexed volume."
        minHeight={560}
      />

      <p>
        The practical consequence: a log you exclude from an index is not a log you lose. It still
        gets archived, it can still feed a metric, and it can still be brought back temporarily via
        rehydration. That single fact is the foundation for almost every log cost-control decision
        later in this module.
      </p>

      <h2 id="collection-sources">Collecting Logs</h2>
      <p>
        Datadog does not have one universal log collector — it has several, and picking the right
        one depends on where your workload runs.
      </p>

      <h3 id="agent-and-file-collection">The Agent: Files, Containers & stdout</h3>
      <p>
        Log collection is off by default on the Agent and must be explicitly enabled at the
        top-level config, then configured per integration or custom source.
      </p>

      <CodeBlock
        code={`# datadog.yaml — enables the log collection pipeline on this Agent
logs_enabled: true`}
        lang="yaml"
        filename="datadog.yaml"
      />

      <p>
        Each log source (an app, an integration) gets its own config block under{" "}
        <code>conf.d/&lt;SOURCE&gt;.d/conf.yaml</code>. At minimum you set the file path, and you
        should always set <code>service</code> and <code>source</code> explicitly — for
        file-based collection there is no automatic default for either.
      </p>

      <CodeBlock
        code={`# /etc/datadog-agent/conf.d/checkout-service.d/conf.yaml
logs:
  - type: file
    path: "/var/log/checkout-service/app.log"
    service: "checkout-service"
    source: "java"
    tags:
      - "team:payments"`}
        lang="yaml"
        filename="conf.yaml"
      />

      <p>
        For containers, the Agent reads <strong>stdout/stderr</strong> directly — you do not need a
        Docker logging driver. The Docker/container check auto-attaches container and orchestrator
        metadata as tags, which is why a log from a Kubernetes pod already arrives with{" "}
        <code>pod_name</code>, <code>kube_namespace</code>, and similar tags without extra
        configuration.
      </p>

      <h3 id="kubernetes-autodiscovery">Kubernetes Autodiscovery</h3>
      <p>
        On Kubernetes, you rarely hand-write a <code>conf.yaml</code> per service. Instead you
        annotate the pod, and Autodiscovery wires up log collection automatically. The annotation
        key must match the container name exactly: <code>ad.datadoghq.com/&lt;CONTAINER_NAME&gt;.logs</code>.
      </p>

      <CodeBlock
        code={`apiVersion: v1
kind: Pod
metadata:
  name: checkout-service
  annotations:
    ad.datadoghq.com/checkout-service.logs: |
      [{
        "source": "java",
        "service": "checkout-service",
        "tags": ["team:payments"]
      }]
spec:
  containers:
    - name: checkout-service
      image: registry.internal/checkout-service:1.4.2`}
        lang="yaml"
        filename="checkout-service-pod.yaml"
      />

      <p>
        The annotation value is a JSON array (one object per log config for that container) even
        though the surrounding file is YAML. If you&apos;re collecting from a file inside the
        container rather than stdout, add <code>&quot;type&quot;: &quot;file&quot;</code> and{" "}
        <code>&quot;path&quot;</code> — and, same rule as bare-metal, <code>source</code> and{" "}
        <code>service</code> have no default in that case and must be set.
      </p>

      <h3 id="direct-intake-and-forwarders">Direct API Intake & Forwarders</h3>
      <p>
        Not every log comes from the Agent. Serverless workloads typically ship logs via the{" "}
        <strong>Datadog Forwarder</strong> (an AWS Lambda function that reads CloudWatch/S3 events
        and forwards them), and anything can submit directly to the{" "}
        <strong>Logs Intake API</strong> over HTTP. Prefer HTTP over the legacy TCP intake — TCP
        has no delivery guarantees.
      </p>

      <CodeBlock
        code={`curl -X POST "https://http-intake.logs.datadoghq.com/api/v2/logs" \\
  -H "Content-Type: application/json" \\
  -H "DD-API-KEY: \${DD_API_KEY}" \\
  -d '[{
    "ddsource": "checkout-service",
    "service": "checkout-service",
    "message": "payment gateway timeout after 3002ms",
    "status": "error"
  }]'`}
        lang="bash"
        filename="submit-log.sh"
      />

      <h2 id="processing-pipelines-and-processors">Processing Pipelines & Processors</h2>
      <p>
        A <strong>pipeline</strong> is an ordered, named list of processors that runs against logs
        matching a filter (usually by <code>source</code>). Datadog auto-installs a read-only
        integration pipeline for well-known sources (nginx, postgres, and so on); anything custom
        needs a pipeline you build yourself. Processors execute <strong>top to bottom</strong>, each
        one reading and writing attributes on the log — Datadog&apos;s own guidance caps this at roughly
        20 processors per pipeline before it becomes unmaintainable.
      </p>
      <p>
        The single most important idea here: <strong>raw log text is not searchable structure</strong>.
        A processor&apos;s job is to turn <code>&quot;order_id=88214 status=504&quot;</code> from an
        opaque string into <code>order.id = 88214</code> and <code>http.status_code = 504</code> —
        attributes you can facet, filter, and alert on.
      </p>

      <h3 id="key-processors">The Processors You&apos;ll Actually Use</h3>
      <ArticleTable
        caption="Most real pipelines are built from a small, repeated subset of Datadog's processor library."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Processor</th>
              <th>What it does</th>
              <th>Typical use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Grok Parser</code></td>
              <td>Extracts structured attributes from raw or semi-structured text using named pattern matchers</td>
              <td>Turning a raw app log line into <code>order.id</code>, <code>http.status_code</code>, etc.</td>
            </tr>
            <tr>
              <td><code>Log Date Remapper</code></td>
              <td>Assigns a parsed attribute as the log&apos;s official timestamp</td>
              <td>Making a parsed <code>timestamp</code> field the log&apos;s real, searchable date</td>
            </tr>
            <tr>
              <td><code>Log Status Remapper</code></td>
              <td>Assigns a parsed attribute as the log&apos;s official status (severity)</td>
              <td>Mapping parsed <code>level</code> (INFO/WARN/ERROR) to the reserved status facet</td>
            </tr>
            <tr>
              <td><code>Service Remapper</code></td>
              <td>Assigns a parsed attribute as the log&apos;s official service</td>
              <td>Standardizing <code>service.name</code> into the reserved service facet</td>
            </tr>
            <tr>
              <td><code>Log Message Remapper</code></td>
              <td>Assigns a parsed attribute as the log&apos;s official, displayed message</td>
              <td>Showing a clean <code>short_message</code> instead of a raw JSON blob in Log Explorer</td>
            </tr>
            <tr>
              <td><code>Trace Remapper</code></td>
              <td>Assigns a parsed attribute as the log&apos;s official trace ID</td>
              <td>Wiring a log line to the exact APM trace/span that produced it</td>
            </tr>
            <tr>
              <td><code>Category Processor</code></td>
              <td>Buckets a log into a new attribute by matching it against several queries, in order</td>
              <td>Turning HTTP status codes into a <code>status_category</code> facet (2xx/4xx/5xx)</td>
            </tr>
            <tr>
              <td><code>Arithmetic Processor</code></td>
              <td>Computes a new numeric attribute from existing numeric attributes</td>
              <td>Deriving <code>duration_ms</code> from <code>end_time - start_time</code></td>
            </tr>
            <tr>
              <td><code>String Builder Processor</code></td>
              <td>Concatenates existing attributes and literal text into a new attribute</td>
              <td>Building a composite <code>request_signature</code> from method + path</td>
            </tr>
            <tr>
              <td><code>GeoIP Parser</code></td>
              <td>Enriches an IP attribute with continent, country, subdivision, and city</td>
              <td>Mapping <code>network.client.ip</code> to <code>network.client.geoip.country.name</code></td>
            </tr>
            <tr>
              <td><code>Lookup Processor</code></td>
              <td>Maps an attribute value to a human-readable value via a reference table</td>
              <td>Turning an internal <code>error_code</code> into a readable <code>error_description</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Two more worth knowing by name even though they don&apos;t make most pipelines:{" "}
        <strong>URL Parser</strong> (breaks a URL into host/path/query attributes) and{" "}
        <strong>User-Agent Parser</strong> (breaks a user-agent string into browser/OS/device
        attributes).
      </p>

      <h2 id="grok-parsing-in-depth">Grok Parsing In Depth</h2>
      <p>
        If you learn one thing from this module, make it Grok. Every other processor operates on
        attributes that already exist — Grok is what creates them in the first place from raw text.
      </p>

      <h3 id="grok-syntax">Grok Syntax</h3>
      <p>
        Every Grok rule is built from matchers of the form <code>%{"{"}MATCHER:EXTRACT:FILTER{"}"}</code>:
      </p>

      <CodeBlock
        code={`%{MATCHER:EXTRACT:FILTER}

MATCHER   the built-in (or helper) pattern that matches a chunk of text
EXTRACT   the attribute name the matched value is written to
          (dots create nested attributes, e.g. http.status_code)
FILTER    optional type coercion applied after extraction
          (integer, number, date(...), json, keyvalue(...), csv(...))

Common matchers:
  %{date("MMM dd HH:mm:ss")}   parses a timestamp using a custom pattern
  %{word}                      one whitespace-delimited token (letters/digits/underscore)
  %{notSpace}                  any run of non-whitespace characters
  %{number} / %{integer}       numeric tokens
  %{data}                      greedy match, anything including whitespace — use sparingly
  %{regex("...")}              a custom regular expression
  %{ip} / %{ipv4} / %{ipv6}    IP address literals

Rules can also be composed from named "Helper Rules" — smaller sub-patterns
defined once and referenced by name inside the main parsing rule, which keeps
long rules readable and reusable across pipelines.`}
        lang="text"
        filename="grok-syntax-reference.txt"
      />

      <h3 id="grok-before-after">Before → After: Parsing a Raw Log Line</h3>
      <p>
        Here is a realistic example: an application emits a plain-text error line, and a single
        Grok rule turns it into queryable attributes.
      </p>

      <MermaidDiagram
        chart={grokBeforeAfterDiagram}
        title="Grok Parser: Raw Text to Structured Attributes"
        caption="The Grok Parser only creates attributes — it takes downstream remappers (Date/Status/Service/Message) to promote the right ones into Datadog's reserved fields."
        minHeight={420}
      />

      <CodeBlock
        code={`2026-08-12T14:22:03.482Z ERROR checkout-service [order_id=88214,user_id=5521] payment gateway timeout after 3002ms status=504`}
        lang="text"
        filename="raw-log-line.txt"
      />

      <CodeBlock
        code={`checkout_error_rule %{date("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"):timestamp} %{word:level} %{notSpace:service.name} \\[order_id=%{integer:order.id},user_id=%{integer:usr.id}\\] %{data:short_message} status=%{integer:http.status_code}`}
        lang="text"
        filename="grok-parsing-rule.txt"
      />

      <p>Which produces these parsed attributes (dotted names become nested JSON):</p>

      <CodeBlock
        code={`{
  "timestamp": "2026-08-12T14:22:03.482Z",
  "level": "ERROR",
  "service": { "name": "checkout-service" },
  "order": { "id": 88214 },
  "usr": { "id": 5521 },
  "short_message": "payment gateway timeout after 3002ms",
  "http": { "status_code": 504 }
}`}
        lang="json"
        filename="parsed-attributes.json"
      />

      <p>
        Parsing the timestamp does <strong>not</strong> make it the log&apos;s official date — that
        still requires a Log Date Remapper pointed at <code>timestamp</code>. Same story for{" "}
        <code>level</code> → status, <code>service.name</code> → service, and{" "}
        <code>short_message</code> → message. Grok structures the data; remappers make it official.
      </p>

      <h2 id="standard-and-reserved-attributes">Standard & Reserved Attributes</h2>
      <p>
        Datadog treats a small set of attributes as <strong>reserved</strong>: <code>host</code>,{" "}
        <code>source</code>, <code>status</code>, <code>service</code>, <code>trace_id</code>, and{" "}
        <code>message</code>. These power the built-in facets, the Log Explorer columns, and the
        cross-referencing with APM and Infrastructure. The remapper processors from the table above
        exist specifically to populate these fields from whatever your team&apos;s raw logs happen
        to call them.
      </p>
      <p>
        Beyond the reserved set, Datadog offers <strong>Standard Attributes</strong> — an
        org-level naming convention table (Logs → Pipelines → Standard Attributes) that lets you
        declare, for example, that <code>usr.id</code> is the canonical field for a user
        identifier across every service, even if one team&apos;s logs originally called it{" "}
        <code>userId</code> and another called it <code>user_id</code>. This is what makes a
        single dashboard or monitor work uniformly across services owned by different teams.
      </p>

      <CodeBlock
        code={`{
  "date": "2026-08-12T14:22:03.482Z",
  "host": "ip-10-0-4-212",
  "service": "checkout-service",
  "status": "error",
  "message": "payment gateway timeout after 3002ms",
  "trace_id": "6934218950284861602",
  "order": { "id": 88214 },
  "usr": { "id": 5521 }
}`}
        lang="json"
        filename="well-formed-log.json"
      />

      <h2 id="indexes-retention-and-quotas">Indexes, Retention & Quotas</h2>
      <p>
        <strong>Indexing</strong> is what makes a log searchable in Log Explorer and usable by
        monitors and dashboards — it is also the expensive part of log management, unlike
        ingestion. Every account has at least one index, and most mature setups have several, each
        with its own <strong>index filter</strong> (a search query). When a log arrives, it is
        tested against each index&apos;s filter in order, and it lands in the{" "}
        <strong>first index whose filter matches</strong> — index order matters.
      </p>
      <p>
        Each index has its own <strong>retention</strong> window (how long indexed logs stay
        searchable — the exact options available depend on your contract, so don&apos;t assume a
        fixed universal list) and its own <strong>daily quota</strong>: a hard cap on how many log
        events that index will accept per day, reset on a fixed daily schedule, with an optional
        warning threshold you can set (for example, alert at 50% of quota). Quota is evaluated{" "}
        <strong>after</strong> exclusion filters have already dropped logs from consideration.
      </p>
      <p>
        Critically, hitting the daily quota does not lose the log entirely — it just stops being
        indexed for the rest of that day. It still reaches Archives and still feeds any log-based
        metric built off the raw stream. This is exactly the failure mode in the challenge at the
        end of this module: a noisy deploy blows through quota, and the team needs to know their
        options don&apos;t start and end with &quot;raise the number.&quot;
      </p>

      <h2 id="logging-without-limits">Logging Without Limits</h2>
      <p>
        <strong>Logging without Limits</strong> is Datadog&apos;s name for decoupling ingestion
        from indexing: ingest broadly and cheaply, then use{" "}
        <strong>exclusion filters</strong> to decide — per index — which logs are worth paying to
        index. An exclusion filter is a query plus a sampling percentage (0–100%, defaulting to
        &quot;exclude 100%&quot; of matches) and an active/inactive toggle. Only the{" "}
        <strong>first active matching exclusion filter</strong> applies to a given log, and
        sampling can be keyed on an attribute (like a trace ID or a user ID) so that, for example,
        every log tied to the same trace is consistently kept or dropped together rather than
        sampled independently.
      </p>

      <MermaidDiagram
        chart={loggingWithoutLimitsDiagram}
        title="Ingest vs Index vs Exclude"
        caption="Exclusion is not deletion. Excluded logs are simply not indexed — they still flow to Archives and to any log-based metric built on the full stream."
        minHeight={420}
      />

      <p>
        The pattern that shows up in almost every mature Datadog setup: keep <code>ERROR</code> and{" "}
        <code>WARN</code> logs at 0% exclusion (fully indexed, because you need to search them
        during incidents), and aggressively exclude high-volume <code>DEBUG</code>/health-check
        noise — while still capturing its trend as a log-based metric so you don&apos;t lose
        visibility, just searchability.
      </p>

      <h2 id="log-based-metrics">Log-Based Metrics</h2>
      <p>
        A <strong>log-based metric</strong> converts a filtered slice of the log stream into a
        real Datadog metric — a <strong>count</strong> (how many logs matched a query) or a{" "}
        <strong>distribution</strong> (aggregating a numeric attribute into count/min/max/sum/avg,
        optionally with percentiles like p95/p99). This is configured under Logs → Pipelines →
        Generate Metrics, and the key detail that makes it powerful for cost control: it operates
        on the <strong>full ingested stream</strong>, before indexing decisions are applied — so a
        log excluded by an exclusion filter can still generate a metric.
      </p>

      <CodeBlock
        code={`{
  "data": {
    "type": "logs_metrics",
    "id": "checkout.payment_timeouts.count",
    "attributes": {
      "filter": {
        "query": "service:checkout-service status:error \\"payment gateway timeout\\""
      },
      "compute": { "aggregation_type": "count" },
      "group_by": [
        { "path": "@service.name", "tag_name": "service_name" }
      ]
    }
  }
}`}
        lang="json"
        filename="logs-to-metric-payload.json"
      />

      <p>
        Log-based metrics are billed as custom metrics, so the same cardinality discipline from
        DogStatsD applies: group by low-cardinality attributes like <code>service_name</code> or a
        bounded <code>error_code</code>, never by something unbounded like a raw{" "}
        <code>order.id</code> or <code>user.id</code>.
      </p>

      <h2 id="archives-rehydration-and-flex-logs">Archives, Rehydration & Flex Logs</h2>
      <p>
        <strong>Archives</strong> forward 100% of ingested logs — indexed or not — to cold cloud
        storage (S3, Azure Blob Storage, or GCS) that you own. This is the safety net behind
        exclusion filters and the mechanism for long-term compliance retention that would be far
        too expensive to keep fully indexed.
      </p>
      <p>
        When an investigation needs logs that were excluded or have aged out of an index,{" "}
        <strong>Rehydration</strong> (accessed today via Archive Search) pulls events from an
        archive back into the search-optimized Log Explorer, temporarily, without being subject to
        the exclusion filters that kept them out the first time — up to very large event volumes
        per historical view.
      </p>
      <p>
        For logs that are high-volume and infrequently queried but still need to be queryable
        occasionally (security, network, or transaction logs), <strong>Flex Logs</strong> sits
        between full indexing and Archives: storage and compute are decoupled for a much cheaper
        cost profile than standard indexing, at the cost of some feature support (Monitors and
        Watchdog aren&apos;t available on Flex Logs).
      </p>

      <h2 id="sensitive-data-scanner">Sensitive Data Scanner</h2>
      <p>
        <strong>Sensitive Data Scanner</strong> discovers and classifies sensitive data — PII,
        credit card numbers, API keys, IP addresses — across logs, APM spans, RUM events, and more,
        using a library of predefined rules or custom regex rules. Per rule you choose an action:{" "}
        <strong>Redact</strong> (replace with a token), <strong>Partially redact</strong> (keep a
        few characters visible), or <strong>Mask</strong> (reversible obfuscation for permissioned
        users). This runs before data is indexed, which is the right layer to catch accidental PII
        leakage from a poorly-scrubbed log line before it becomes a compliance incident.
      </p>

      <h2 id="correlating-logs-and-traces">Correlating Logs With Traces</h2>
      <p>
        The payoff for structuring your logs well is that you can pivot directly from a slow or
        failing trace in APM to the exact log lines that request produced. Datadog&apos;s tracing
        libraries can automatically inject <code>dd.trace_id</code> and <code>dd.span_id</code>{" "}
        into your application&apos;s log output — historically gated behind the{" "}
        <code>DD_LOGS_INJECTION=true</code> environment variable, with some newer tracer versions
        defaulting it on. Setting <code>DD_ENV</code>, <code>DD_SERVICE</code>, and{" "}
        <code>DD_VERSION</code> alongside it ties the correlation into unified service tagging too.
      </p>

      <MermaidDiagram
        chart={logsTracesCorrelationDiagram}
        title="How a Log Line Gets Linked to a Trace"
        caption="The tracer injects the active trace_id/span_id into whatever the app logs — the Agent just forwards those fields as-is, which is what lets Datadog join a log to a trace after the fact."
        minHeight={320}
      />

      <CodeBlock
        code={`{
  "timestamp": "2026-08-12T14:22:05.101Z",
  "level": "ERROR",
  "logger.name": "com.checkout.PaymentService",
  "message": "payment gateway timeout after 3002ms",
  "dd.trace_id": "6934218950284861602",
  "dd.span_id": "1104822093885671022",
  "dd.env": "production",
  "dd.service": "checkout-service",
  "dd.version": "1.4.2"
}`}
        lang="json"
        filename="trace-correlated-log.json"
      />

      <p>
        Note that traces and logs can sample independently — a log carrying a{" "}
        <code>dd.trace_id</code> that points to a trace which wasn&apos;t retained isn&apos;t a
        bug, it&apos;s expected. This correlation model is the connective tissue between this
        module and the APM & Distributed Tracing module later in this academy.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="Explain the Datadog log pipeline"
        intro="A strong answer treats ingestion and indexing as two separate concerns from the first sentence, then walks the pipeline in order."
        steps={[
          "Open with the core mental model: ingestion is decoupled from indexing — you can ingest broadly and cheaply, and choose separately what gets indexed. That's the whole point of Logging without Limits.",
          "Name the stages in order: collection (Agent, integration, or direct API) → intake → pipeline (an ordered chain of processors) → index filter and exclusion filter → indexed or not, plus archive and log-based metrics off the raw stream regardless.",
          "Explain what a pipeline actually does: processors run top to bottom, parsing raw text into structured attributes (Grok Parser) and then promoting the right ones into Datadog's reserved fields via remappers (date/status/service/message).",
          "Call out the two outputs that happen even for excluded logs: Archives (100% of logs, cold storage) and log-based metrics (count/distribution off the full stream) — nothing is silently lost when a log is excluded from an index.",
          "Close with the operational payoff: this is why searching logs stays fast and affordable at scale instead of degrading into 'store everything and grep it.'",
        ]}
      />

      <InterviewPlaybook
        title="How would you cut log costs without losing signal"
        intro="The trap here is proposing to 'log less.' The stronger answer keeps ingestion volume intact and gets surgical about indexing."
        steps={[
          "Identify what actually drives the bill: indexed volume × retention, not ingestion. Ingestion is comparatively cheap and can stay broad.",
          "Apply exclusion filters at the index level to sample out high-volume, low-value logs (health checks, verbose DEBUG output) while keeping ERROR/WARN at 0% exclusion — fully indexed.",
          "Convert whatever pattern you just excluded into a log-based count or distribution metric, so the trend and any alerting built on it survives even though the raw logs are no longer indexed.",
          "Rely on Archives as the safety net: since 100% of ingested logs are archived, nothing excluded is gone forever — it can be rehydrated for a specific investigation window.",
          "For high-volume categories that are rarely queried but must stay available (security/audit logs), consider Flex Logs instead of full indexing, and tighten retention on lower-value indexes.",
        ]}
      />

      <InterviewChallenge
        title="Design Log Cost Controls for a Noisy Payment Service"
        scenario={
          <>
            <code>checkout-service</code> shipped a bad deploy overnight that made its request
            logger emit a <code>DEBUG</code> line for every single card-authorization retry
            attempt. Log volume jumped roughly 12x, and by 10:00 UTC the service&apos;s index
            daily quota was fully consumed. Now a genuine <code>ERROR</code>-level outage that
            started at 10:30 UTC isn&apos;t indexed either — the quota is exhausted for the day —
            and on-call can&apos;t search anything to diagnose it. Leadership wants this fixed
            without losing the ability to alert on real payment failures.
          </>
        }
        tasks={[
          "Design the pipeline processors needed to structure the raw retry log into attributes — at minimum, parse it with a Grok rule and remap the correct fields into the reserved status and service attributes.",
          "Write an index-level exclusion filter that removes the noisy DEBUG retry logs from indexing while leaving ERROR and WARN logs fully indexed (0% exclusion).",
          "Design a log-based metric that preserves visibility into retry volume even though those logs are no longer indexed.",
          "Explain what happens to the excluded logs: are they gone, and how would on-call retrieve them if the retries turn out to matter for the outage investigation?",
          "Propose a longer-term fix so a single noisy deploy from one service can't starve real ERROR logs of index capacity again.",
        ]}
        pitfalls={[
          "Writing the exclusion filter to match on message text alone — matching on the parsed status attribute (once Grok + Status Remapper are in place) is far more robust than string-matching the raw message body.",
          "Forgetting that daily quota is evaluated after exclusion filters — an under-tuned exclusion filter still lets quota get blown even if it excludes 'most' of the noise.",
          "Building the log-based metric's group_by on a high-cardinality field like order_id — that's the same cardinality-explosion mistake as high-cardinality DogStatsD tags, just billed as custom metrics instead.",
        ]}
        signal="Strong candidates treat the exhausted quota as a symptom, not the root cause — the fix is selective indexing (Logging without Limits), not just raising the quota number. They also correctly reason that excluding a log from an index never deletes it: Archives and log-based metrics still see it, so nothing about the retry noise is actually lost."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Pipeline processors.</strong> Add a Grok Parser rule that extracts the retry
          attempt into structured fields, for example matching the raw{" "}
          <code>DEBUG checkout-service retry_attempt=N order_id=...</code> line into{" "}
          <code>level</code>, <code>service.name</code>, <code>retry.attempt</code>, and{" "}
          <code>order.id</code>. Follow it with a <code>Log Status Remapper</code> pointed at{" "}
          <code>level</code> and a <code>Service Remapper</code> pointed at{" "}
          <code>service.name</code>, so the reserved <code>status</code> and <code>service</code>{" "}
          facets are populated and queryable — this is what makes the exclusion filter reliable in
          the next step.
        </p>
        <p>
          <strong>2. Exclusion filter.</strong> On the index checkout-service&apos;s logs land in,
          add an exclusion filter with query <code>service:checkout-service status:debug</code>{" "}
          set to exclude 100% of matches. Because exclusion filters key off the parsed{" "}
          <code>status</code> facet rather than message text, it keeps working even if the retry
          message wording changes in a future deploy. Leave <code>status:error</code> and{" "}
          <code>status:warn</code> for this service with no matching exclusion filter (0%
          exclusion, i.e. fully indexed) — since exclusion filters are evaluated in order and only
          the first match applies, put the DEBUG rule first and make sure no broader rule
          shadows ERROR/WARN traffic.
        </p>
        <p>
          <strong>3. Log-based metric.</strong> Before finalizing the exclusion filter, define a
          count metric on the same query (<code>service:checkout-service status:debug</code>)
          grouped by a bounded dimension like <code>retry.attempt</code> (small, fixed range) —
          never <code>order.id</code>. This keeps a dashboard/monitor-usable signal on retry
          volume alive even though the raw DEBUG logs stop being indexed.
        </p>
        <p>
          <strong>4. Nothing is lost.</strong> The excluded DEBUG logs still flow to Archives
          (100% of ingested logs, indexed or not) at essentially storage cost. If the outage
          investigation later needs the exact retry log lines, on-call can rehydrate that specific
          time window from the archive into Log Explorer temporarily — the exclusion filter never
          applied to ingestion, only to indexing.
        </p>
        <p>
          <strong>5. Longer-term fix.</strong> Two changes prevent recurrence: give
          checkout-service (or noisy services generally) their own index with its own tuned daily
          quota and a warning threshold (e.g. alert at 50%) so one bad deploy can&apos;t consume
          quota shared with unrelated services, and fix it at the source — roll back the logger
          change or gate retry-attempt logging behind a sampled or rate-limited log statement so
          the ingestion volume itself doesn&apos;t spike 12x in the first place.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Ingestion and indexing are separate decisions — Logging without Limits lets you ingest
          broadly and cheaply, then choose deliberately what gets indexed.
        </li>
        <li>
          Pipelines run an ordered chain of processors; Grok Parser plus the remapper processors
          (Date/Status/Service/Message) are what turn raw text into the reserved attributes
          Datadog actually searches, facets, and alerts on.
        </li>
        <li>
          Grok&apos;s <code>%{"{"}MATCHER:EXTRACT:FILTER{"}"}</code> syntax with dotted attribute
          names for nesting is the highest-leverage skill in this module — most parsing problems
          reduce to picking the right matcher and filter chain.
        </li>
        <li>
          Exclusion filters are evaluated per index, first-match-wins, and run{" "}
          <strong>before</strong> the daily quota is checked — tune exclusion filters before you
          tune quota numbers.
        </li>
        <li>
          Log-based metrics and Archives both operate on the full ingested stream, not just the
          indexed subset — a log excluded from an index is not a log that&apos;s gone.
        </li>
        <li>
          <code>dd.trace_id</code> / <code>dd.span_id</code> injection (via{" "}
          <code>DD_LOGS_INJECTION</code> or default-on tracer behavior) is the connective tissue
          that lets you pivot from a trace straight to its exact log lines in APM.
        </li>
      </ul>
    </div>
  );
}
