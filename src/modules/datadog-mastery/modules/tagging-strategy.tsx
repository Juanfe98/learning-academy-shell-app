import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const unifiedServiceTaggingDiagram = String.raw`flowchart TD
    SVC["env:production<br/>service:checkout-api<br/>version:1.4.2"]
    SVC --> M["Metrics<br/>DogStatsD + Agent checks"]
    SVC --> T["Traces<br/>APM spans"]
    SVC --> L["Logs<br/>app logs + Agent collection"]
    SVC --> P["Processes<br/>Live Processes"]
    M -.->|"same env / service / version"| CORR["One correlated<br/>service view"]
    T -.->|"same env / service / version"| CORR
    L -.->|"same env / service / version"| CORR
    P -.->|"same env / service / version"| CORR`;

const tagSourcesDiagram = String.raw`flowchart LR
    A["Host tags<br/>datadog.yaml tags: / DD_TAGS"] --> DP
    B["Integration / check tags<br/>instances: tags: in conf.yaml"] --> DP
    C["Autodiscovery tags<br/>pod & container labels/annotations"] --> DP
    D["Cloud integration tags<br/>AWS / GCP / Azure resource tags"] --> DP
    E["DogStatsD tags<br/>per-call tags + constant_tags"] --> DP
    F["In-app tag configuration<br/>Metrics > Configure Tags"] --> DP
    DP["request.latency<br/>(one submitted data point)"]`;

const cardinalityExplosionDiagram = String.raw`flowchart TD
    METRIC["request.latency"]
    METRIC --> E["env<br/>3 values"]
    METRIC --> S["service<br/>12 values"]
    METRIC --> EP["endpoint<br/>40 values"]
    E --> COMBO["3 x 12 x 40 = 1,440 series<br/>bounded, cheap, safe"]
    S --> COMBO
    EP --> COMBO
    COMBO --> ADD["+ user_id tag<br/>~500,000 unique values"]
    ADD --> BOOM["1,440 x 500,000 = 720,000,000 series<br/>unbounded cardinality explosion"]`;

const taxonomyDecisionDiagram = String.raw`flowchart TD
    Q1{"Is the tag value bounded?<br/>(small, known, reusable set)"}
    Q1 -->|"No — user_id, email,<br/>request_id, full URL"| LOGONLY["Keep on logs/traces only<br/>never as a custom-metric tag"]
    Q1 -->|"Yes — env, service,<br/>region, tier, instance-type"| Q2{"Needed across metrics,<br/>traces, logs and dashboards?"}
    Q2 -->|"Yes"| STANDARD["Promote to a governed<br/>standard tag key"]
    Q2 -->|"No, one-off"| SCOPED["Scope it to a single<br/>dashboard/monitor query"]`;

export const toc: TocItem[] = [
  { id: "why-tags-matter", title: "Why Tags Matter", level: 2 },
  { id: "tag-syntax-and-rules", title: "Tag Syntax and Rules", level: 2 },
  { id: "reserved-tags", title: "Reserved Tag Keys", level: 3 },
  { id: "unified-service-tagging", title: "Unified Service Tagging", level: 2 },
  { id: "configuring-ust", title: "Configuring env / service / version", level: 3 },
  { id: "where-tags-come-from", title: "Where Tags Come From", level: 2 },
  { id: "tag-precedence", title: "Tag Precedence and Inheritance", level: 3 },
  { id: "cardinality", title: "Cardinality: The Hidden Cost Driver", level: 2 },
  { id: "safe-vs-dangerous", title: "Safe vs Dangerous Tag Dimensions", level: 3 },
  { id: "designing-a-taxonomy", title: "Designing a Tag Taxonomy", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "tagging-challenge", title: "Challenge: Fix a Runaway Tagging Scheme", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TaggingStrategy() {
  return (
    <div className="article-content">
      <p>
        Every other Datadog feature — dashboards, monitors, SLOs, the service catalog, cost
        attribution — is built on top of tags. A metric without tags is a single opaque line on a
        graph. The same metric with <code>env</code>, <code>service</code>, and <code>region</code>{" "}
        tags becomes something you can slice by team, compare across deploys, and page the right
        person about. Get tagging wrong at the start and you do not just lose a &quot;nice to
        have&quot; — you end up with metrics, traces, and logs that describe the same incident but
        cannot be joined together, and a custom-metrics bill that grows for reasons nobody can
        explain. This module treats tagging as the load-bearing concept it is.
      </p>

      <h2 id="why-tags-matter">Why Tags Matter</h2>
      <p>
        A <strong>tag</strong> is a dimension attached to a piece of telemetry — a metric point, a
        trace span, a log line, a running process — so it can be filtered, grouped, and compared.
        Without tags, Datadog only knows &quot;here is a number called{" "}
        <code>request.latency</code>&quot;. With tags, it knows{" "}
        <code>request.latency</code> for <code>service:checkout-api</code> in{" "}
        <code>env:production</code> in <code>region:us-east-1</code>, which is the actual question
        an on-call engineer asks during an incident.
      </p>
      <p>
        The failure mode senior engineers are expected to name immediately: teams that tag
        ad-hoc — one service uses <code>environment:prod</code>, another uses{" "}
        <code>env:Production</code>, a third does not tag <code>service</code> at all — end up with{" "}
        <strong>fragmented, un-joinable telemetry</strong>. You cannot build one dashboard across
        three services, you cannot correlate a trace with the logs it emitted, and every new
        engineer re-invents the tagging convention for their corner of the system. Tagging strategy
        is not decoration on top of observability — it <em>is</em> the mechanism that makes
        cross-cutting observability possible at all.
      </p>

      <h2 id="tag-syntax-and-rules">Tag Syntax and Rules</h2>
      <p>
        A tag is either a bare <code>&lt;value&gt;</code> or, more usefully, a{" "}
        <code>&lt;key&gt;:&lt;value&gt;</code> pair. Datadog recommends the key:value form because
        it is semantically clearer and lets you group by key (<code>service</code>) instead of
        matching on opaque strings. The key is always everything before the{" "}
        <strong>first</strong> colon — <code>env:staging:east</code> has key <code>env</code> and
        value <code>staging:east</code>, not key <code>env:staging</code>.
      </p>

      <ul>
        <li>
          Tag strings <strong>must start with a letter</strong> — this applies to both the{" "}
          <code>key</code> in a <code>key:value</code> pair and to bare <code>value</code>-only
          tags.
        </li>
        <li>
          After the first letter, allowed characters are Unicode letters, numbers, underscores,
          minuses, colons, periods, and forward slashes. Everything else — commas, spaces, emoji,
          backslashes — is silently <strong>converted to an underscore</strong>. Leading/trailing
          underscores are stripped and repeated underscores collapse into one.
        </li>
        <li>
          Tags can be <strong>up to 200 characters</strong> long. For a <code>key:value</code> tag,
          the key, the colon, and the value all count toward that limit.
        </li>
        <li>
          Span tags and metric tags are <strong>normalized to lowercase</strong>. Avoid camelCase
          tag keys — cloud providers even normalize case inconsistently across each other (AWS
          turns <code>TestTag</code> into <code>testtag</code>; other providers turn it into{" "}
          <code>test_tag</code>), so lowercase-with-underscores from the start avoids surprises.
        </li>
        <li>
          A tag can be <strong>value-less</strong> — just <code>beta</code> or{" "}
          <code>internal</code> with no colon — useful as a boolean marker, but it loses the
          ability to group by key that <code>key:value</code> gives you.
        </li>
      </ul>

      <CodeBlock
        code={`# Good — starts with a letter, lowercase, key:value
service:checkout-api
env:production
region:us-east-1
tier:critical

# Gets silently mangled — do not rely on this working the way you expect
"Checkout Team"          →  checkout_team   (spaces → underscore, case not preserved on span/metric tags)
9lives                    →  9lives          (leading digit tolerated in some contexts, but avoid it)
env:staging:east          →  key="env", value="staging:east"  (only the FIRST colon splits key/value)

# DD_TAGS is whitespace-separated — a value containing a space breaks into multiple tags
DD_TAGS="test:this is a test"
# → produces FOUR separate tags: test:this, is, a, test  (NOT one tag with a space in the value)`}
        lang="text"
      />

      <h3 id="reserved-tags">Reserved Tag Keys</h3>
      <p>
        A handful of tag keys are <strong>reserved</strong> by Datadog because the platform uses
        them to bind different telemetry types together. Reusing one of these keys for something
        unrelated to its intended purpose will produce confusing correlation behavior across your
        entire account, not just in one dashboard.
      </p>

      <ArticleTable
        caption="These seven keys are treated specially by Datadog — setting them wires up cross-product correlation instead of just adding a label."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Tag key</th>
              <th>What it enables</th>
              <th>Typically set via</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>host</code>
              </td>
              <td>Correlation between metrics, traces, processes, and logs for one machine</td>
              <td>Agent hostname detection, or explicit <code>hostname</code> config</td>
            </tr>
            <tr>
              <td>
                <code>device</code>
              </td>
              <td>Segregation of metrics/traces/processes/logs by device or disk</td>
              <td>System/disk integrations (e.g. the disk check)</td>
            </tr>
            <tr>
              <td>
                <code>source</code>
              </td>
              <td>Span filtering and automated log pipeline creation</td>
              <td>Integration name, or explicit <code>source</code> attribute on log intake</td>
            </tr>
            <tr>
              <td>
                <code>service</code>
              </td>
              <td>Scoping application-specific data across metrics, traces, and logs</td>
              <td>
                <code>DD_SERVICE</code> / unified service tagging
              </td>
            </tr>
            <tr>
              <td>
                <code>env</code>
              </td>
              <td>Scoping application-specific data across metrics, traces, and logs</td>
              <td>
                <code>DD_ENV</code> / unified service tagging
              </td>
            </tr>
            <tr>
              <td>
                <code>version</code>
              </td>
              <td>Scoping application-specific data across metrics, traces, and logs</td>
              <td>
                <code>DD_VERSION</code> / unified service tagging
              </td>
            </tr>
            <tr>
              <td>
                <code>team</code>
              </td>
              <td>Assigning ownership to any resource</td>
              <td>Manual convention, or the Service Catalog / Teams product</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="unified-service-tagging">Unified Service Tagging</h2>
      <p>
        This is the single most important tagging concept in Datadog, and the one interviewers
        probe hardest. <strong>Unified service tagging</strong> is the practice of setting the same
        three reserved tags — <code>env</code>, <code>service</code>, and <code>version</code> —
        consistently across every telemetry type your service emits. When the values line up
        exactly, Datadog automatically treats the metrics, traces, logs, and running processes for
        that service and deploy as <em>one correlated entity</em> instead of four disconnected data
        sets.
      </p>

      <MermaidDiagram
        chart={unifiedServiceTaggingDiagram}
        title="Unified Service Tagging: One Trio, Four Telemetry Types"
        caption="Because every signal carries the identical env / service / version values, Datadog can pivot from a trace straight to its logs, from a metric spike straight to the process that caused it — with no manual query stitching."
        minHeight={420}
      />

      <p>
        Without unified service tagging, an engineer investigating a latency spike has to guess
        which logs belong to which trace, or manually build a query that filters logs by a
        differently-spelled service name. With it, the APM service page, the log explorer, and the
        infrastructure list all pivot on the exact same three values — click a trace, see its
        logs, see the process, see the host, with zero manual correlation.
      </p>

      <h3 id="configuring-ust">Configuring env / service / version</h3>
      <p>
        The mechanism is always the same three environment variables —{" "}
        <code>DD_ENV</code>, <code>DD_SERVICE</code>, <code>DD_VERSION</code> — read by the tracer,
        the DogStatsD client, and (where supported) the Agent. How you set those variables changes
        by deployment target.
      </p>

      <CodeBlock
        code={`# Non-containerized host — set once, scoped to a single process
export DD_ENV="production"
export DD_SERVICE="checkout-api"
export DD_VERSION="1.4.2"

node server.js`}
        lang="bash"
        filename="start.sh"
      />

      <CodeBlock
        code={`# Docker — env vars for the tracer/DogStatsD client, plus labels
# so the Agent's Autodiscovery can tag infrastructure-level data too
docker run -d \\
  --name checkout-api \\
  -e DD_ENV="production" \\
  -e DD_SERVICE="checkout-api" \\
  -e DD_VERSION="1.4.2" \\
  --label com.datadoghq.tags.service="checkout-api" \\
  --label com.datadoghq.tags.version="1.4.2" \\
  checkout-api:1.4.2`}
        lang="bash"
      />

      <CodeBlock
        code={`FROM node:20-slim

# service/version are static per image build, so they can live in the Dockerfile
ENV DD_SERVICE=checkout-api
ENV DD_VERSION=1.4.2

LABEL com.datadoghq.tags.service="checkout-api"
LABEL com.datadoghq.tags.version="1.4.2"

# env is usually injected at deploy time instead — it changes per environment,
# not per image, so baking it into the Dockerfile would defeat "build once, deploy many"
COPY . .
CMD ["node", "server.js"]`}
        lang="docker"
        filename="Dockerfile"
      />

      <p>
        In Kubernetes, apply the standard <code>tags.datadoghq.com/*</code> labels to{" "}
        <strong>both</strong> the workload metadata and the pod template — the Agent reads pod
        labels, so a label only on the Deployment (and not the pod template underneath) will not
        tag the running pod. If APM is enabled and the Cluster Agent&apos;s Admission Controller is
        active, it automatically injects the matching <code>DD_ENV</code>/<code>DD_SERVICE</code>/
        <code>DD_VERSION</code> environment variables into the pod for you — it maps{" "}
        <code>tags.datadoghq.com/version → DD_VERSION</code>, and the equivalent for{" "}
        <code>env</code> and <code>service</code>, but only if those variables are not already set
        on the container.
      </p>

      <CodeBlock
        code={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  labels:
    tags.datadoghq.com/env: "production"
    tags.datadoghq.com/service: "checkout-api"
    tags.datadoghq.com/version: "1.4.2"
spec:
  template:
    metadata:
      labels:
        tags.datadoghq.com/env: "production"
        tags.datadoghq.com/service: "checkout-api"
        tags.datadoghq.com/version: "1.4.2"
    spec:
      containers:
        - name: checkout-api
          image: checkout-api:1.4.2
          env:
            # Explicit downward-API wiring — do this if the Admission
            # Controller is not deployed, or you want it version-controlled
            - name: DD_ENV
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['tags.datadoghq.com/env']
            - name: DD_SERVICE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['tags.datadoghq.com/service']
            - name: DD_VERSION
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['tags.datadoghq.com/version']`}
        lang="yaml"
        filename="checkout-api-deployment.yaml"
      />

      <p>
        For a multi-container pod, target one container specifically with{" "}
        <code>tags.datadoghq.com/&lt;container-name&gt;.env</code> (and{" "}
        <code>.service</code> / <code>.version</code>) instead of the pod-wide label — this is how
        Autodiscovery tags a third-party sidecar like Redis independently of your application
        container in the same pod.
      </p>

      <h2 id="where-tags-come-from">Where Tags Come From</h2>
      <p>
        A single metric data point rarely gets its tags from one place. The Agent merges tags from
        many independent sources before a data point is submitted, which is powerful — and is
        exactly why an untracked source (a rogue label, a misconfigured integration) can quietly
        inject a high-cardinality tag nobody remembers adding.
      </p>

      <MermaidDiagram
        chart={tagSourcesDiagram}
        title="Tag Sources Merge Onto Every Data Point"
        caption="Six independent sources can each contribute tags to the same metric point. There is no single 'source of truth' file to grep — tagging bugs require checking all six."
        minHeight={360}
      />

      <ul>
        <li>
          <strong>Host-level tags</strong> — the <code>tags:</code> list in{" "}
          <code>datadog.yaml</code>, or the <code>DD_TAGS</code> environment variable (space
          separated: <code>DD_TAGS=&quot;team:checkout region:us-east-1&quot;</code>). These apply
          to every metric, log, and trace associated with that host, via{" "}
          <strong>tag inheritance</strong>.
        </li>
        <li>
          <strong>Integration / check tags</strong> — the <code>tags:</code> list under an
          instance in a check&apos;s <code>conf.yaml</code> (e.g. the Postgres integration tagging
          a specific database instance with <code>db:orders-primary</code>).
        </li>
        <li>
          <strong>Autodiscovery-derived tags</strong> — container and pod labels/annotations that
          the Agent picks up automatically as containers churn, including the{" "}
          <code>tags.datadoghq.com/*</code> unified service tagging labels.
        </li>
        <li>
          <strong>Cloud integration tags</strong> — when you connect the AWS/GCP/Azure integration,
          Datadog imports the cloud resource&apos;s own tags (an EC2 <code>Name</code> tag, a GCP
          label) and applies them to the corresponding host or resource automatically.
        </li>
        <li>
          <strong>DogStatsD per-metric tags</strong> — tags passed directly in application code at
          the call site, plus any <code>constant_tags</code> configured once on the client and
          applied to everything it emits.
        </li>
        <li>
          <strong>In-app tag configuration</strong> — tags added or overridden from the Datadog UI
          (Metrics → Configure Tags), useful for retroactively tagging a metric you do not control
          the submission code for.
        </li>
      </ul>

      <CodeBlock
        code={`from datadog import statsd

# Per-call tags — specific to this one submission
statsd.increment(
    "orders.created",
    tags=["payment_method:card", "endpoint:/v1/orders"],
)

# Constant tags — applied to every metric this client instance ever emits,
# so env/service/version don't have to be repeated at every call site
statsd.constant_tags = [
    "env:production",
    "service:checkout-api",
    "version:1.4.2",
]`}
        lang="python"
        filename="orders_service.py"
      />

      <h3 id="tag-precedence">Tag Precedence and Inheritance</h3>
      <p>
        Here is the detail that surprises most engineers the first time it bites them:{" "}
        <strong>the Agent does not enforce a precedence order between tag sources.</strong> It
        collects tags from every available source and keeps <em>every unique value</em> it sees for
        a given key, then emits all of them. If <code>service</code> is set to{" "}
        <code>payments</code> in an environment variable, <code>checkout</code> in the Agent{" "}
        YAML, and <code>orders</code> in a tracing client config, your telemetry can end up
        carrying <code>service:payments</code>, <code>service:checkout</code>, and{" "}
        <code>service:orders</code> simultaneously on the same host.
      </p>
      <p>
        This is precisely the mechanism behind &quot;un-joinable dashboards&quot; — a dashboard
        widget filtered to <code>service:checkout-api</code> silently excludes data tagged{" "}
        <code>service:checkout_api</code> or <code>service:Checkout-API</code> from a
        differently-configured source, and nobody sees an error; the data just quietly does not
        show up. The fix is not a Datadog setting — it is <strong>governance</strong>: one
        canonical spelling per key, enforced at CI/config-review time, not discovered after an
        incident.
      </p>
      <p>
        Related to precedence is <strong>tag inheritance</strong>: every metric, log, and trace
        associated with a host inherits that host&apos;s host-level tags automatically. This is
        convenient, but it is also a common source of accidental duplicate keys — if a host has{" "}
        <code>service:my-host</code> and a pod on it independently sets{" "}
        <code>service:my-service</code>, telemetry from that pod inherits both. Datadog&apos;s own
        guidance here is to pick more specific key names (<code>infra_service</code> vs{" "}
        <code>service</code>) when two layers legitimately need different values for a
        conceptually similar tag.
      </p>

      <h2 id="cardinality">Cardinality: The Hidden Cost Driver</h2>
      <p>
        <strong>Cardinality</strong> is the number of unique combinations a tag (or set of tags)
        can produce. This matters because of how Datadog defines a billable custom metric:{" "}
        <strong>
          a custom metric is identified by a unique combination of a metric&apos;s name and its tag
          values, including the host tag.
        </strong>{" "}
        Every new combination of tag values is a new time series that Datadog has to store,
        index, and bill for — not a new row in an existing series.
      </p>

      <MermaidDiagram
        chart={cardinalityExplosionDiagram}
        title="Cardinality Explosion: Multiplicative, Not Additive"
        caption="Bounded tags multiply into a manageable series count. One unbounded tag added to the same metric multiplies that count by its own cardinality — the growth is multiplicative, not a small addition."
        minHeight={420}
      />

      <p>
        This is why a single careless tag can turn a cheap metric into an expensive one overnight.{" "}
        <code>env</code> (3 values) × <code>service</code> (12 values) × <code>endpoint</code> (40
        values) is 1,440 series — trivial. Add <code>user_id</code> with half a million distinct
        values and the same metric becomes hundreds of millions of series. Datadog&apos;s own
        guidance is explicit: tags should not originate from unbounded sources like epoch
        timestamps, user IDs, or request IDs, because doing so causes unbounded growth in your
        number of metrics.
      </p>

      <CodeBlock
        code={`metric: request.latency
tags:   env (3) x service (12) x endpoint (40)
      = 1,440 unique series   ← bounded, cheap, safe to keep forever

+ user_id tag added (≈500,000 distinct values seen per month)
      = 1,440 x 500,000
      = 720,000,000 series   ← runaway cardinality, drives custom-metrics cost
                                and slows every query that touches this metric`}
        lang="text"
      />

      <h3 id="safe-vs-dangerous">Safe vs Dangerous Tag Dimensions</h3>
      <p>
        The reason this only bites <em>custom metrics</em> hard, and not logs or traces the same
        way, comes down to how each product stores data. Metrics pre-aggregate into a continuously
        updated time series keyed by the exact tag combination — a new combination means a
        permanent new series that exists whether or not anyone ever queries it. Logs and traces are
        stored per-event: a <code>user_id</code> on a single log line or span is one field on one
        already-stored document, not a new always-on series. That is why{" "}
        <code>user_id</code> is a perfectly reasonable log or span attribute to search on, but a
        dangerous choice as a <em>metric</em> tag.
      </p>

      <ArticleTable
        caption="The same dimension can be safe on one telemetry type and expensive on another — the deciding factor is whether it becomes a metric tag."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>On custom metrics</th>
              <th>On logs / traces</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>env</code>, <code>service</code>, <code>version</code>
              </td>
              <td>Safe — small, bounded, reused everywhere</td>
              <td>Safe — same reasoning, plus enables correlation</td>
            </tr>
            <tr>
              <td>
                <code>region</code>, <code>availability-zone</code>, <code>instance-type</code>
              </td>
              <td>Safe — bounded by your infrastructure footprint</td>
              <td>Safe</td>
            </tr>
            <tr>
              <td>
                <code>tier</code>, <code>team</code>
              </td>
              <td>Safe — governed, small vocabulary</td>
              <td>Safe</td>
            </tr>
            <tr>
              <td>
                <code>user_id</code>, <code>session_id</code>
              </td>
              <td>Dangerous — one series per user, unbounded growth</td>
              <td>Fine — searchable attribute on individual events</td>
            </tr>
            <tr>
              <td>
                <code>request_id</code>, full request URL, email address
              </td>
              <td>Dangerous — effectively infinite cardinality</td>
              <td>Fine, and often exactly what you want to grep for</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="designing-a-taxonomy">Designing a Tag Taxonomy</h2>
      <p>
        A tag taxonomy is the small, governed vocabulary an org agrees to use consistently — not a
        free-for-all where every team invents its own keys. The goal is that any engineer can guess
        the right tag for a new service without asking, and that dashboards built by one team work
        unmodified for another.
      </p>

      <MermaidDiagram
        chart={taxonomyDecisionDiagram}
        title="Should This Become a Standard Tag?"
        caption="Run every proposed tag through this check before it ships. The two failure modes it prevents: unbounded metric cardinality, and one-off tags that never get reused."
        minHeight={320}
      />

      <ul>
        <li>
          <strong>Start from the reserved trio.</strong> Every service gets{" "}
          <code>env</code>, <code>service</code>, <code>version</code> via unified service tagging
          before anything else — this is non-negotiable baseline, not an optional nicety.
        </li>
        <li>
          <strong>Add a small, fixed set of org-wide dimensions</strong> on top: <code>team</code>{" "}
          (ownership), <code>region</code> or <code>availability-zone</code> (infra), <code>tier</code>{" "}
          (criticality — e.g. <code>tier:critical</code> for paging routing). Keep this list short
          enough that it fits in a README, not a wiki maze.
        </li>
        <li>
          <strong>Govern spelling, not just intent.</strong> Precedence problems (
          <code>service:checkout</code> vs <code>service:checkout-api</code>) are a governance
          failure, not a Datadog limitation — enforce canonical values via a shared config
          template, linting on Agent/IaC config, or a service catalog that validates tags at
          registration time.
        </li>
        <li>
          <strong>Use tags to drive cost attribution.</strong> Once <code>team</code> and{" "}
          <code>service</code> are consistent, cloud cost management and custom-metrics usage can
          both be sliced by team — turning &quot;why did the bill go up&quot; from a forensic
          exercise into a filtered dashboard.
        </li>
        <li>
          <strong>Design monitors around tags, not individual resources.</strong> A single
          multi-alert monitor grouped <code>by service, env</code> scales to every current and
          future service automatically; one monitor per service does not.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to explain unified service tagging"
        intro="A strong answer names the mechanism, not just the buzzword — and connects it to a concrete debugging workflow."
        steps={[
          "Define it precisely: unified service tagging is setting the same env, service, and version values consistently across metrics, traces, logs, and processes for one service.",
          "Name the mechanism: DD_ENV / DD_SERVICE / DD_VERSION are read by the tracer, the Agent, and DogStatsD clients; in Kubernetes the same values are set as tags.datadoghq.com/env|service|version labels on both the workload and pod template.",
          "Explain what breaks without it: without matching values, investigating an incident means manually guessing which logs belong to which trace — there is no automatic pivot between products.",
          "Give the production payoff: click a trace in APM, land directly on its correlated logs and the host's process list, with zero manual query stitching — because all four signals share the exact same three tag values.",
          "Mention the gotcha: env/service/version must match EXACTLY (including case, since tags are lowercased) across every source — one differently-spelled service tag silently breaks the correlation for that instance.",
        ]}
      />

      <InterviewPlaybook
        title="How to design a tag taxonomy — and how tags cause runaway cost"
        intro="This question tests whether you understand tagging as a governance problem, not just a syntax one."
        steps={[
          "Start with the baseline: every service gets env/service/version from unified service tagging, non-negotiably, before any custom tags are added.",
          "Add a short, fixed org-wide vocabulary on top — team, region, tier — and explicitly reject unbounded, ad-hoc keys invented per-team.",
          "Explain the cost mechanism precisely: a custom metric is billed per unique combination of metric name and tag values including host. Adding a high-cardinality tag (user_id, request_id) multiplies the series count by that tag's cardinality — it's multiplicative, not additive.",
          "Contrast with logs/traces: high-cardinality fields are fine there because they're stored per-event, not pre-aggregated into an always-on time series — so user_id belongs on a log line, never on a metric tag.",
          "Close with governance: precedence problems (the same key set to different values in different config layers) are the real-world cause of 'un-joinable dashboards', and the fix is a canonical config template plus review, not a Datadog setting.",
        ]}
      />

      <h2 id="tagging-challenge">Challenge: Fix a Runaway Tagging Scheme</h2>

      <InterviewChallenge
        title="The Ad-Hoc Tagging Bill Spike"
        scenario={
          <>
            You join a mid-size org running ~40 services on Datadog. Finance flags that the custom
            metrics bill has tripled in two months with no corresponding traffic growth. Digging
            in, you find: the <code>checkout</code> team tags metrics with{" "}
            <code>environment:prod</code>, the <code>payments</code> team uses{" "}
            <code>env:Production</code>, and a newer service tags every DogStatsD call with{" "}
            <code>user_id:&lt;uuid&gt;</code> &quot;for debugging&quot;. On top of that, three
            different dashboards built by three different teams all claim to show{" "}
            &quot;checkout latency by service&quot; and all three show different numbers, because
            each one filters on a differently-spelled <code>service</code> tag. Nobody can say with
            confidence which dashboard is right, and nobody remembers approving the{" "}
            <code>user_id</code> tag.
          </>
        }
        tasks={[
          "Identify the specific tag(s) responsible for the cardinality-driven cost spike, and explain the mechanism (custom metric = unique combination of name + tag values) that makes it expensive.",
          "Propose where the user_id data should live instead, given it's still valuable for debugging a specific request.",
          "Design the canonical tag taxonomy this org should adopt, including how env/service/version get set consistently across teams (pick a concrete mechanism, not just 'agree on it').",
          "Explain why three different-looking dashboards can show three different numbers even though nobody sees an error — tie this to how the Agent merges tags from multiple sources with no precedence order.",
          "Describe a rollout plan that fixes the taxonomy without silently breaking the monitors and dashboards that already query the old (inconsistent) tag values.",
        ]}
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>Root cause of the cost spike:</strong> the <code>user_id</code> tag on a
          DogStatsD metric. A custom metric is billed per unique combination of metric name and tag
          values — adding a tag with hundreds of thousands of distinct values multiplies the series
          count by that same factor. This is a metrics-specific problem: the same{" "}
          <code>user_id</code> field on a log line or trace span costs nothing extra, because logs
          and traces are stored per-event rather than pre-aggregated into an always-on time series.
          The fix is to remove <code>user_id</code> from the metric submission entirely and rely on
          it being present on the correlated trace/log for that request instead — APM and log
          correlation via unified service tagging already gives you the per-request drill-down
          without paying a metrics cardinality tax for it.
        </p>
        <p>
          <strong>Why the three dashboards disagree:</strong> the Agent does not enforce precedence
          between tag sources — it keeps every unique value it sees for a key and emits all of
          them. <code>environment:prod</code>, <code>env:Production</code>, and (presumably) a
          correctly-cased <code>env:production</code> somewhere are three distinct tag values as
          far as Datadog is concerned. Each dashboard&apos;s filter only matches the spelling its
          author happened to use, silently excluding the other two-thirds of the fleet — with no
          error, just missing data.
        </p>
        <p>
          <strong>Taxonomy fix:</strong> adopt unified service tagging as the mandatory baseline —{" "}
          <code>env</code>, <code>service</code>, <code>version</code> set via{" "}
          <code>DD_ENV</code>/<code>DD_SERVICE</code>/<code>DD_VERSION</code> (or the equivalent{" "}
          <code>tags.datadoghq.com/*</code> Kubernetes labels), enforced through a shared deployment
          template or Helm chart so individual teams cannot deviate on spelling. Add a short,
          governed set of org-wide tags on top (<code>team</code>, <code>region</code>,{" "}
          <code>tier</code>), and explicitly document that unbounded identifiers (user, request,
          session IDs, full URLs) are never metric tags — they belong on logs and spans only.
        </p>
        <p>
          <strong>Rollout without breakage:</strong> introduce the new canonical tags{" "}
          <em>alongside</em> the old ones first (both <code>environment:prod</code> and{" "}
          <code>env:production</code> present simultaneously via host-level config), migrate
          dashboards and monitors to the canonical <code>env</code> key on your own timeline, verify
          parity, and only then remove the legacy key from the submission source. Cutting the old
          key immediately would blank out every existing dashboard and silently mute every monitor
          still filtering on it — a self-inflicted incident on top of the one you were fixing.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Tags are the mechanism that makes every other Datadog feature work — dashboards,
          monitors, SLOs, and cost attribution all pivot on consistent tag values, not on the raw
          metric/log/trace data alone.
        </li>
        <li>
          Tag strings must start with a letter, allow letters/numbers/underscore/minus/colon/
          period/slash (everything else becomes an underscore), cap at 200 characters, and are
          lowercased for spans and metrics — plan naming conventions around those constraints.
        </li>
        <li>
          Unified service tagging — matching <code>env</code>, <code>service</code>, and{" "}
          <code>version</code> across metrics, traces, logs, and processes — is the single highest-
          leverage tagging decision you can make, and it is configured the same way everywhere:{" "}
          <code>DD_ENV</code>/<code>DD_SERVICE</code>/<code>DD_VERSION</code>, or the equivalent{" "}
          Kubernetes <code>tags.datadoghq.com/*</code> labels.
        </li>
        <li>
          Tags merge from many independent sources (host config, integrations, Autodiscovery, cloud
          integrations, DogStatsD, in-app) with <strong>no enforced precedence</strong> — the Agent
          keeps every unique value it sees, which is exactly how differently-spelled tags silently
          fragment dashboards.
        </li>
        <li>
          A custom metric is billed as a unique combination of metric name and tag values — high-
          cardinality tags (<code>user_id</code>, <code>request_id</code>, full URLs) multiply
          series count and cost, while the same fields are safe and useful on logs and traces
          because those are stored per-event, not as an always-on aggregated series.
        </li>
        <li>
          A good tag taxonomy is small, governed, and starts from the reserved trio before adding
          org-wide dimensions like <code>team</code>, <code>region</code>, and <code>tier</code> —
          treat it as a config-review problem, not a documentation problem.
        </li>
      </ul>
    </div>
  );
}
