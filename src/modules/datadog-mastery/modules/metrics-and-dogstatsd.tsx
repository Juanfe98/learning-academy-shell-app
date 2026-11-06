import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const metricAnatomyDiagram = String.raw`flowchart TD
    M["custom.checkout.request_duration"]
    M --> NAME["Name<br/>lowercase, dot-namespaced<br/>namespace.subnamespace.name"]
    M --> TYPE["Type<br/>COUNT · GAUGE · RATE<br/>HISTOGRAM · DISTRIBUTION · SET"]
    M --> TAGS["Tags<br/>key:value pairs<br/>env:prod, service:checkout, route:/cart"]
    M --> SERIES["Series of points<br/>one (timestamp, value) pair<br/>per flush interval"]
    SERIES --> P1["(10:00:00, 42)"]
    SERIES --> P2["(10:00:10, 47)"]
    SERIES --> P3["(10:00:20, 51)"]`;

const countGaugeRateDiagram = String.raw`flowchart LR
    EVENTS["5 checkout requests land<br/>in a single 10s flush window<br/>raw values: [1,1,1,1,1]"]
    EVENTS --> COUNT["COUNT<br/>sum of the interval = 5<br/>submitted raw via API/Agent check"]
    EVENTS --> RATE["RATE<br/>5 events / 10s = 0.5 / s<br/>already normalized"]
    EVENTS --> GAUGE["GAUGE (wrong tool here)<br/>keeps only the LAST value = 1<br/>the other 4 requests vanish"]
    COUNT -.->|"via DogStatsD c"| STORED_RATE["stored in-app as RATE<br/>(normalized so hosts with<br/>different flush intervals compare)"]`;

const dogstatsdPathDiagram = String.raw`sequenceDiagram
    participant App as Application code
    participant Client as DogStatsD client library
    participant Agent as Agent DogStatsD server
    participant Fwd as Agent Forwarder
    participant Intake as Datadog Intake (HTTPS)

    App->>Client: statsd.histogram("request.duration", 42, tags)
    Client->>Client: Buffer and batch datagrams
    Client->>Agent: UDP :8125 or UDS datagram<br/>request.duration:42|h|#route:/cart
    Agent->>Agent: Aggregate per flush interval (default 10s)<br/>compute .avg .count .median .max .95percentile
    Agent->>Fwd: Aggregated payload
    Fwd->>Intake: HTTPS POST (compressed, batched)
    Intake-->>Fwd: 202 Accepted`;

const histogramVsDistributionDiagram = String.raw`flowchart TD
    subgraph HIST["HISTOGRAM — local, per-Agent aggregation"]
        H1["Host A Agent<br/>aggregates its own values<br/>computes its own .95percentile"]
        H2["Host B Agent<br/>aggregates its own values<br/>computes its own .95percentile"]
        H1 --> HQ["Query layer combines<br/>per-host percentiles"]
        H2 --> HQ
        HQ --> HR["Result: NOT a true global p95<br/>(a percentile-of-percentiles)"]
    end

    subgraph DIST["DISTRIBUTION — global sketch aggregation"]
        D1["Host A Agent<br/>forwards raw values as a DDSketch"]
        D2["Host B Agent<br/>forwards raw values as a DDSketch"]
        D1 --> DQ["Datadog backend merges sketches<br/>from every host, every tag slice"]
        D2 --> DQ
        DQ --> DR["Result: globally accurate p95<br/>across the whole fleet"]
    end`;

export const toc: TocItem[] = [
  { id: "anatomy-of-a-metric", title: "The Anatomy of a Metric", level: 2 },
  { id: "metric-naming", title: "Naming Conventions", level: 3 },
  { id: "metric-types", title: "The Metric Types", level: 2 },
  { id: "count-rate-gauge", title: "COUNT, RATE, and GAUGE", level: 3 },
  { id: "histogram-type", title: "HISTOGRAM: Agent-Side Percentiles", level: 3 },
  { id: "set-type", title: "SET: Counting Unique Values", level: 3 },
  { id: "histogram-vs-distribution", title: "Histogram vs Distribution — The Big One", level: 2 },
  { id: "submitting-custom-metrics", title: "Three Ways to Submit Custom Metrics", level: 2 },
  { id: "dogstatsd-app-code", title: "1. DogStatsD From Application Code", level: 3 },
  { id: "custom-agent-check", title: "2. A Custom Agent Check", level: 3 },
  { id: "http-metrics-api", title: "3. The HTTP Metrics API", level: 3 },
  { id: "as-count-as-rate", title: "as_count() vs as_rate()", level: 2 },
  { id: "cardinality-and-cost", title: "Cardinality and Custom Metric Cost", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "practice-challenge", title: "Practice Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function MetricsAndDogStatsd() {
  return (
    <div className="article-content">
      <p>
        Every dashboard, monitor, and SLO in Datadog is built on top of one decision made at
        submission time: <strong>what type is this metric?</strong> Get it wrong and you don&apos;t
        get an error — you get a graph that quietly lies. A GAUGE used for something that happens
        five times a second silently drops four out of five events. A HISTOGRAM used for a
        latency SLO across fifty hosts gives you a percentile-of-percentiles, not the number your
        SLA actually promises. This module builds the mental model for metric types, the DogStatsD
        protocol that carries most custom metrics into Datadog, and the cardinality math that
        determines whether your metrics bill stays flat or explodes.
      </p>

      <h2 id="anatomy-of-a-metric">The Anatomy of a Metric</h2>
      <p>
        A Datadog metric is not just a number — it is four things bound together: a{" "}
        <strong>name</strong>, a set of <strong>tags</strong>, a <strong>type</strong>, and a{" "}
        <strong>series</strong> of <code>(timestamp, value)</code> points, one point produced per
        submission interval (10 seconds by default for DogStatsD). The type is not display
        metadata — it tells the Agent and the Datadog backend <em>how to aggregate</em> the raw
        values you send before they ever become a graph.
      </p>

      <MermaidDiagram
        chart={metricAnatomyDiagram}
        title="Anatomy of a Metric"
        caption="Name and tags identify what the metric is; type determines how raw submissions get aggregated into the series of points you eventually query."
        minHeight={340}
      />

      <h3 id="metric-naming">Naming Conventions</h3>
      <p>
        Datadog enforces real constraints on metric names, and convention fills in the rest:
      </p>
      <ul>
        <li>Metric names must start with a letter.</li>
        <li>
          Only ASCII alphanumerics, underscores, and periods are allowed — spaces and other
          characters are silently converted to underscores. Unicode is not supported.
        </li>
        <li>
          Names must not exceed 200 characters (under 100 is preferred for UI readability). Names
          are <strong>case-sensitive</strong>.
        </li>
        <li>
          A name is claimed by its first submitted type. Reusing <code>checkout.duration</code> as
          a GAUGE after it already exists as a DISTRIBUTION creates a silent naming conflict —
          always check the Metrics Summary page before reusing a name.
        </li>
      </ul>
      <p>
        The community convention layered on top: <code>namespace.subnamespace.name</code>, all
        lowercase, with a unit suffix when the unit isn&apos;t obvious from context.
      </p>

      <CodeBlock
        code={`# Good — namespaced, lowercase, unit-suffixed where it matters
checkout.request.duration_seconds
checkout.queue.depth
checkout.payment.attempts

# Bad — no namespace, mixed case, ambiguous unit
Duration
paymentAttempts
queue_depth   # depth of what? messages? bytes? unclear`}
        lang="text"
        filename="metric-naming.txt"
      />

      <h2 id="metric-types">The Metric Types</h2>
      <p>
        There are six metric types, and a distinction that trips up almost everyone new to
        Datadog: the <strong>submission type</strong> (what you tell DogStatsD or the API you are
        sending) is not always the same as the <strong>in-app type</strong> (what Datadog actually
        stores and lets you query). A COUNT submitted through DogStatsD, for example, is stored as
        a RATE.
      </p>

      <ArticleTable
        caption="What each metric type measures, how it's submitted over DogStatsD, and what it becomes in-app. This table is the one to memorize."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>What it measures</th>
              <th>DogStatsD symbol</th>
              <th>Datadog in-app type</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>COUNT</strong>
              </td>
              <td>Total event occurrences in the interval (up or down, not monotonic)</td>
              <td>
                <code>c</code>
              </td>
              <td>
                RATE (via DogStatsD) · COUNT (via API or Agent check)
              </td>
              <td>DB connections opened, orders placed</td>
            </tr>
            <tr>
              <td>
                <strong>RATE</strong>
              </td>
              <td>Event occurrences per second, already normalized by the caller</td>
              <td>— (no direct DogStatsD function; use COUNT or HISTOGRAM)</td>
              <td>RATE (via API) · GAUGE (via Agent check)</td>
              <td>Requests/sec pre-computed by an external system</td>
            </tr>
            <tr>
              <td>
                <strong>GAUGE</strong>
              </td>
              <td>A snapshot — the last value reported during the interval</td>
              <td>
                <code>g</code>
              </td>
              <td>GAUGE</td>
              <td>Memory used, queue depth, temperature</td>
            </tr>
            <tr>
              <td>
                <strong>HISTOGRAM</strong>
              </td>
              <td>Statistical distribution of values, aggregated Agent-side, per host</td>
              <td>
                <code>h</code> (or <code>ms</code> for the TIMER alias)
              </td>
              <td>
                GAUGE (<code>.avg</code>/<code>.median</code>/<code>.max</code>/
                <code>.95percentile</code>) + RATE (<code>.count</code>)
              </td>
              <td>Response time on a single host</td>
            </tr>
            <tr>
              <td>
                <strong>DISTRIBUTION</strong>
              </td>
              <td>
                Statistical distribution of values across your <em>entire</em> infrastructure,
                aggregated server-side from raw sketches
              </td>
              <td>
                <code>d</code>
              </td>
              <td>
                GAUGE (avg/max/min) + COUNT (count/sum) — metric itself stays typed DISTRIBUTION
              </td>
              <td>Response time with a globally accurate p99, sliced by any tag</td>
            </tr>
            <tr>
              <td>
                <strong>SET</strong>
              </td>
              <td>Count of unique values submitted during the interval</td>
              <td>
                <code>s</code>
              </td>
              <td>GAUGE</td>
              <td>Unique users, unique IP addresses seen this minute</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="count-rate-gauge">COUNT, RATE, and GAUGE</h3>
      <p>
        These three are the &quot;simple&quot; types, and picking the wrong one is the single most
        common metrics mistake. The difference is entirely about what happens to repeated values
        inside one flush interval.
      </p>

      <MermaidDiagram
        chart={countGaugeRateDiagram}
        title="COUNT vs RATE vs GAUGE on the Same Raw Events"
        caption="COUNT and RATE both account for all five events — they only differ by a division. GAUGE keeps just the last value, silently discarding the other four."
        minHeight={320}
      />

      <p>
        The gotcha worth memorizing: when you submit a <strong>COUNT</strong> through DogStatsD
        (<code>dog.count()</code>, <code>dog.increment()</code>, <code>dog.decrement()</code>), the
        Agent normalizes it and stores it in-app as a <strong>RATE</strong> — not a COUNT. This
        keeps counts comparable across Agents with different flush intervals, but it means the
        graph you see by default is &quot;events per second,&quot; not a raw total. To recover the
        raw total, apply the <a href="#as-count-as-rate"><code>as_count()</code></a> modifier or a
        cumulative sum function on the dashboard widget.
      </p>

      <h3 id="histogram-type">HISTOGRAM: Agent-Side Percentiles</h3>
      <p>
        HISTOGRAM is Datadog&apos;s extension of the classic StatsD timing metric. Submit one
        value per event (a response time, a payload size), and the Agent aggregates every value it
        received in the flush interval, producing up to five separate metrics by default:
      </p>

      <CodeBlock
        code={`// Submitting 8 values in a 10-second flush window: [1,1,1,2,2,2,3,3]
// The Agent produces these metrics automatically:

request.duration.avg           // 1.875  — GAUGE
request.duration.count         // 0.8    — RATE (8 values / 10s interval)
request.duration.median        // 2      — GAUGE
request.duration.95percentile  // 3      — GAUGE
request.duration.max           // 3      — GAUGE`}
        lang="text"
        filename="histogram-aggregations.txt"
      />

      <p>
        <code>TIMER</code> (the DogStatsD <code>ms</code> type) is not a separate metric type — it
        is an alias for HISTOGRAM specifically intended for timing data. Whether you call{" "}
        <code>statsd.histogram()</code> or <code>statsd.timing()</code>, the same aggregation
        pipeline runs. Which aggregates get sent — and which percentiles, beyond the default 95th
        — is configurable via <code>histogram_aggregates</code> and{" "}
        <code>histogram_percentiles</code> in <code>datadog.yaml</code>.
      </p>

      <h3 id="set-type">SET: Counting Unique Values</h3>
      <p>
        SET is the one type built specifically to answer &quot;how many distinct X did I see?&quot;
        without you doing the deduplication yourself. Submit the same DogStatsD SET metric with a
        user ID as the <em>value</em> (not a tag) from every request, and the Agent counts unique
        values per flush interval, storing the result as a GAUGE.
      </p>

      <CodeBlock
        code={`# Each call submits a value to dedupe against — the Agent counts uniques, not raw hits
statsd.set('checkout.unique_users', user_id, tags=["env:prod"])

# 1,000 requests from 240 distinct user_ids in one flush interval
# → checkout.unique_users reports 240, not 1000`}
        lang="python"
        filename="unique_users.py"
      />
      <p>
        This is the safe way to get a &quot;unique count&quot; without the cardinality explosion
        you would get from putting <code>user_id</code> in a tag — more on that in{" "}
        <a href="#cardinality-and-cost">Cardinality and Custom Metric Cost</a>.
      </p>

      <h2 id="histogram-vs-distribution">Histogram vs Distribution — The Big One</h2>
      <p>
        This is the distinction interviewers ask about most, because it has a real production
        failure mode attached to it. Both types describe &quot;the shape of a set of values,&quot;
        but they compute percentiles in fundamentally different places.
      </p>
      <p>
        <strong>HISTOGRAM</strong> aggregates <em>Agent-side</em>: each host&apos;s Agent computes
        its own <code>.95percentile</code> from only the values that host saw, then discards the
        raw data. <strong>DISTRIBUTION</strong> ships the raw values from every host as a{" "}
        <a href="https://www.datadoghq.com/blog/engineering/computing-accurate-percentiles-with-ddsketch/">
          DDSketch
        </a>{" "}
        — a compact, mergeable sketch data structure — and Datadog&apos;s backend merges sketches
        from the entire fleet before computing a percentile.
      </p>

      <MermaidDiagram
        chart={histogramVsDistributionDiagram}
        title="Local Aggregation (Histogram) vs Global Aggregation (Distribution)"
        caption="Histograms throw away raw data at the Agent, so a fleet-wide percentile can only ever be a percentile-of-percentiles. Distributions preserve raw shape via sketches, so the backend computes one true global percentile."
        minHeight={480}
      />

      <p>
        The practical consequence: put a checkout service behind 50 hosts, and a HISTOGRAM-based
        &quot;p95 across all hosts&quot; is really an aggregate of 50 independently computed
        per-host p95s — a single host with one catastrophically slow outlier request can get
        smoothed away entirely, because that host&apos;s own <code>.95percentile</code> may not
        even reflect that outlier if the host handled hundreds of other fast requests in the same
        window. DISTRIBUTION avoids this because the outlier value itself — not a pre-computed
        summary of it — reaches the backend.
      </p>
      <p>
        The tradeoff is cost and configuration surface: distributions carry more data per flush
        (raw sketches vs five pre-aggregated numbers) and percentile-enabled distributions are
        billed differently than a plain custom metric — check current Datadog pricing before
        enabling percentiles broadly across every metric. Distributions also unlock query features
        histograms don&apos;t have, like threshold queries (&quot;count how many raw values
        exceeded 2s&quot;) and metric-based SLOs. The rule of thumb: use{" "}
        <strong>DISTRIBUTION</strong> for anything customer-facing where a percentile is part of
        an SLA or SLO — request latency, checkout duration. Use <strong>HISTOGRAM</strong> for
        cheap, per-host operational signals nobody needs a fleet-wide percentile for, like GC
        pause time on one JVM.
      </p>

      <h2 id="submitting-custom-metrics">Three Ways to Submit Custom Metrics</h2>
      <p>
        A <strong>custom metric</strong> is any metric that doesn&apos;t come from one of
        Datadog&apos;s 1,000+ built-in integrations. There are three ways to get one into Datadog,
        and each fits a different situation.
      </p>

      <MermaidDiagram
        chart={dogstatsdPathDiagram}
        title="The DogStatsD Path: App to Intake"
        caption="Most custom metrics take this route. The client library batches and sends UDP or UDS datagrams to the Agent's local DogStatsD server, which aggregates per flush interval before the Forwarder ships the result to Datadog over HTTPS."
        minHeight={420}
      />

      <h3 id="dogstatsd-app-code">1. DogStatsD From Application Code</h3>
      <p>
        The lowest-friction path: your application talks to the Agent&apos;s local DogStatsD
        server over UDP (default port <code>8125</code>) or a Unix Domain Socket (lower overhead,
        avoids UDP packet loss, supports container origin detection). The raw protocol is a plain
        text datagram:
      </p>

      <CodeBlock
        code={`# <METRIC_NAME>:<VALUE>|<TYPE>|@<SAMPLE_RATE>|#<TAG_KEY>:<TAG_VALUE>,<TAG_KEY_2>:<TAG_VALUE_2>

echo -n "checkout.requests:1|c|#route:/cart,env:prod" | nc -u -w0 127.0.0.1 8125

# type letters: c=count  g=gauge  h=histogram  ms=timer(alias of h)  s=set  d=distribution`}
        lang="bash"
        filename="raw-dogstatsd.sh"
      />

      <p>In practice you almost always go through a client library instead of hand-crafting datagrams:</p>

      <CodeBlock
        code={`from datadog import initialize, statsd

initialize(statsd_host="127.0.0.1", statsd_port=8125)

# COUNT — total occurrences; stored as RATE in-app
statsd.increment("checkout.requests", tags=["route:/cart", "env:prod"])

# GAUGE — last-value snapshot
statsd.gauge("checkout.queue.depth", queue.size(), tags=["env:prod"])

# HISTOGRAM — per-host statistical distribution (.avg/.count/.median/.max/.95percentile)
statsd.histogram("checkout.request.duration", elapsed_ms, tags=["route:/cart"])

# DISTRIBUTION — globally accurate percentiles via DDSketch
statsd.distribution("checkout.request.duration.dist", elapsed_ms, tags=["route:/cart"])

# SET — unique count
statsd.set("checkout.unique_users", user_id, tags=["env:prod"])`}
        lang="python"
        filename="app_metrics.py"
      />

      <CodeBlock
        code={`// hot-shots — the most common Node.js DogStatsD client
const StatsD = require("hot-shots");
const client = new StatsD({
  host: "127.0.0.1",
  port: 8125,
  globalTags: { env: process.env.NODE_ENV },
  errorHandler: (err) => console.error("dogstatsd error", err),
});

// COUNT
client.increment("checkout.requests", ["route:/cart"]);

// GAUGE
client.gauge("checkout.queue.depth", queueSize);

// HISTOGRAM
client.histogram("checkout.request.duration", elapsedMs, ["route:/cart"]);

// DISTRIBUTION
client.distribution("checkout.request.duration.dist", elapsedMs, ["route:/cart"]);

// SET (alias: client.unique)
client.set("checkout.unique_users", userId);

// If the service already runs dd-trace for APM, it exposes a DogStatsD
// client on the tracer so you don't need a second dependency:
// const tracer = require("dd-trace").init();
// tracer.dogstatsd.increment("checkout.requests", 1, { route: "/cart" });`}
        lang="javascript"
        filename="app-metrics.js"
      />

      <CodeBlock
        code={`package main

import (
	"log"

	"github.com/DataDog/datadog-go/v5/statsd"
)

func main() {
	client, err := statsd.New("127.0.0.1:8125")
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	tags := []string{"route:/cart", "env:prod"}

	client.Count("checkout.requests", 1, tags, 1)
	client.Gauge("checkout.queue.depth", float64(queueSize), tags, 1)
	client.Histogram("checkout.request.duration", elapsedMs, tags, 1)
	client.Distribution("checkout.request.duration.dist", elapsedMs, tags, 1)
	client.Set("checkout.unique_users", userID, tags, 1)
}`}
        lang="go"
        filename="app_metrics.go"
      />

      <h3 id="custom-agent-check">2. A Custom Agent Check</h3>
      <p>
        When the thing you want to measure isn&apos;t inside your own request path — polling a
        queue depth from an external system, checking a file&apos;s age on disk — a custom Agent
        check runs on the Agent&apos;s own schedule instead of piggybacking on request handling.
      </p>

      <CodeBlock
        code={`from datadog_checks.base import AgentCheck

class QueueDepthCheck(AgentCheck):
    def check(self, instance):
        depth = self._fetch_queue_depth(instance["queue_url"])
        self.gauge("checkout.queue.depth", depth, tags=["env:prod"])

        errors = self._fetch_error_count(instance["queue_url"])
        self.count("checkout.queue.errors", errors, tags=["env:prod"])`}
        lang="python"
        filename="checks.d/custom_checkout_queue.py"
      />

      <CodeBlock
        code={`init_config:

instances:
  - queue_url: "https://internal-queue.example.com/checkout"
    min_collection_interval: 30`}
        lang="yaml"
        filename="conf.d/custom_checkout_queue.yaml"
      />

      <h3 id="http-metrics-api">3. The HTTP Metrics API</h3>
      <p>
        For server-side jobs, batch pipelines, or anything without a local Agent to talk to,
        submit directly over HTTPS to the v2 series endpoint. Note this endpoint only accepts
        COUNT, RATE, and GAUGE — HISTOGRAM values can only be produced by an Agent aggregating raw
        submissions, and DISTRIBUTION points go through a separate distribution-points endpoint.
      </p>

      <CodeBlock
        code={`{
  "series": [
    {
      "metric": "checkout.batch.processed",
      "type": 3,
      "points": [{ "timestamp": 1735689600, "value": 842 }],
      "tags": ["env:prod", "job:nightly-reconciliation"]
    }
  ]
}
// type: 0 = unspecified, 1 = count, 2 = rate, 3 = gauge`}
        lang="json"
        filename="series-payload.json"
      />

      <CodeBlock
        code={`curl -X POST "https://api.datadoghq.com/api/v2/series" \\
  -H "Content-Type: application/json" \\
  -H "DD-API-KEY: \${DD_API_KEY}" \\
  -d @series-payload.json`}
        lang="bash"
        filename="submit-metric.sh"
      />

      <h2 id="as-count-as-rate">as_count() vs as_rate()</h2>
      <p>
        These are <strong>query-time modifiers</strong>, not submission types — they change how an
        already-stored metric is displayed, and they exist precisely because DogStatsD&apos;s COUNT
        normalization (above) is not always what you want to see on a graph.
      </p>
      <ArticleTable
        caption="Both disable interpolation and set the time aggregator to SUM — the difference is the final division by the sampling interval."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Modifier</th>
              <th>What it shows</th>
              <th>Behavior</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>as_count()</code>
              </td>
              <td>The absolute variation of a metric over the selected rollup interval</td>
              <td>
                Sums raw values within each rollup bucket. Because it depends on the rollup
                interval, zooming a graph out to a wider timeframe changes its shape.
              </td>
            </tr>
            <tr>
              <td>
                <code>as_rate()</code>
              </td>
              <td>The absolute variation of a metric per second</td>
              <td>
                Sums within the bucket, then divides by the sampling interval to normalize. Example:
                values <code>[1,1,1,1]</code> submitted every second, with a 20s rollup, produce{" "}
                <code>[0.05, 0.05, 0.05, 0.05]</code>.
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Practically: a COUNT submitted via DogStatsD already renders as RATE by default. Apply{" "}
        <code>as_count()</code> on the widget when you want the raw total back, or layer a
        cumulative sum function on top for a running total across the visible time window.
      </p>

      <h2 id="cardinality-and-cost">Cardinality and Custom Metric Cost</h2>
      <p>
        A <strong>custom metric</strong> is billed per unique combination of{" "}
        <strong>metric name + tag values</strong> (including the automatically-added host tag).
        Metric name alone does not determine cost — every distinct set of tag values on that
        metric name is a separate billed custom metric.
      </p>

      <ArticleTable
        caption="Adding a tag multiplies, it doesn't add. A metric with two low-cardinality tags stays cheap; one unbounded tag turns it into millions of custom metrics."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Tag combination</th>
              <th>Unique tag values</th>
              <th>Resulting custom metrics</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>route</code> (5 values) × <code>status</code> (4 values) × 20 hosts
              </td>
              <td>Bounded</td>
              <td>5 × 4 × 20 = 400 custom metrics</td>
            </tr>
            <tr>
              <td>Same, plus a <code>user_id</code> tag (2,000,000 distinct users/day)</td>
              <td>Unbounded</td>
              <td>Up to 400 × 2,000,000 = 800,000,000 custom metrics</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        That second row is not a hypothetical — it is the single most common way teams blow past
        their custom metrics budget and degrade dashboard/monitor query performance across the
        entire org, not just their own metric. Never tag a metric with an identifier whose
        cardinality is effectively unbounded: <code>user_id</code>, <code>request_id</code>,{" "}
        <code>session_id</code>, <code>trace_id</code>, a raw URL with query parameters, or a raw
        IP address. If you need per-user or per-request granularity, that&apos;s what{" "}
        <strong>traces</strong> (APM spans, tagged at the span level) and <strong>logs</strong> are
        built for — both are designed to carry high-cardinality data efficiently; metrics are not.
      </p>
      <p>
        Two different things both get called &quot;cardinality&quot; in Datadog, and it&apos;s
        worth not conflating them: the <strong>tag cardinality</strong> above (how many unique
        tag-value combinations exist on a metric name) is a cost and performance concern. The
        client-library <code>cardinality</code> parameter (<code>none</code>/<code>low</code>/
        <code>orchestrator</code>/<code>high</code>) controls a separate thing — how many
        container/pod-level infrastructure tags the Agent&apos;s origin detection automatically
        attaches to a metric. Setting that parameter to <code>high</code> does not itself create
        the cardinality explosion described above; putting an unbounded identifier in your own
        explicit tags does.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What's the difference between count, gauge, and rate?'"
        intro="A strong answer defines all three precisely, then names the DogStatsD gotcha that trips up almost everyone the first time they graph a counter."
        steps={[
          "Define each: COUNT is the total number of occurrences in the interval — not normalized. RATE is occurrences per second — already normalized. GAUGE is a last-value snapshot; it isn't an aggregate of events at all.",
          "Point at the practical tell: COUNT and RATE differ from each other only by a division by the interval length. GAUGE is structurally different — it silently drops every value except the last one seen in the flush window.",
          "Name the real gotcha: a COUNT submitted through DogStatsD is stored in-app as a RATE, not a COUNT, so hosts with different flush intervals stay comparable. Use as_count() or a cumulative sum function to see the raw total again.",
          "Close with the production implication: picking GAUGE for something that happens multiple times per interval — like 'requests handled' — is a bug that never throws an error. The dashboard still renders a smooth line; it's just wrong.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'Histogram vs distribution, and why can percentiles lie?'"
        intro="This is the question that separates candidates who've read the metric-types doc from candidates who've operated Datadog at scale."
        steps={[
          "State what each optimizes for: HISTOGRAM computes percentiles Agent-side, per host, per flush interval. DISTRIBUTION ships raw values as a DDSketch and lets Datadog's backend compute percentiles globally, across every host and any tag slice.",
          "Name the concrete failure mode: behind 50 hosts, a HISTOGRAM's fleet-wide 'p95' is really an aggregate of 50 independently-computed per-host p95s — a percentile-of-percentiles, not the true p95 a user experienced.",
          "Explain the mechanism: histogram aggregation discards the raw values at the Agent before they leave the host. Once that data is gone, there's no way to recompute a mathematically correct global percentile from the summaries alone.",
          "Give the tradeoff honestly: distributions cost more — more data per flush, and percentile-enabled distributions are billed differently than a plain custom metric — so reserve them for anything customer-facing tied to an SLO, not every single metric in the system.",
          "Close with the one-line definition an interviewer wants to hear: distribution means globally accurate percentiles via server-side sketch aggregation — it is not simply 'a fancier histogram.'",
        ]}
      />

      <h2 id="practice-challenge">Practice Challenge</h2>
      <InterviewChallenge
        title="Pick the Right Metric Type"
        scenario={
          <>
            You are instrumenting a checkout service that runs across a 40-host fleet, and your
            team has committed to a p99 latency SLO for the <code>/checkout</code> endpoint. You
            need to add four measurements: the total number of requests received by{" "}
            <code>/checkout</code>; the current depth of the payment-processing queue; the
            end-to-end response time of <code>/checkout</code> requests, which must support an
            accurate p99 across the entire fleet for the SLO; and the number of distinct users who
            complete checkout each day.
          </>
        }
        tasks={[
          "For each of the four measurements, name the metric type you'd submit it as, and explain why the other five types would be the wrong choice for that specific measurement.",
          "A teammate proposes tagging the response-time metric with user_id so support can instantly pull up any customer's checkout latency. Explain concretely why this is dangerous at 40 hosts and 2 million daily users, and what you'd use instead to get the same lookup capability.",
          "A different teammate wants to alert only when queue depth has been above 500 for five straight minutes, not on a single momentary spike. Explain whether that requires changing the queue-depth metric's type, and if not, where the fix actually belongs.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Metric type choices:</strong>
        </p>
        <ul>
          <li>
            <strong>Requests received</strong> → COUNT. It&apos;s a total of discrete events in an
            interval. RATE would also be defensible if you specifically want per-second framing
            without ever needing the raw total; GAUGE is wrong because it would drop all but the
            last request seen per flush window.
          </li>
          <li>
            <strong>Queue depth</strong> → GAUGE. It&apos;s a continuously-varying snapshot, not a
            count of discrete events — exactly what GAUGE is for.
          </li>
          <li>
            <strong>Response time with a fleet-wide p99 SLO</strong> → DISTRIBUTION, not
            HISTOGRAM. HISTOGRAM would give a percentile-of-percentiles across the 40 hosts, which
            is not the true p99 the SLO promises. DISTRIBUTION sends raw values as sketches so the
            backend computes one globally accurate p99.
          </li>
          <li>
            <strong>Distinct users completing checkout</strong> → SET. Submit the user ID as the
            metric&apos;s value (never as a tag) and let the Agent deduplicate for you.
          </li>
        </ul>
        <p>
          <strong>2. The user_id tag:</strong> this is the classic cardinality explosion. A single
          metric name × 2,000,000 distinct daily user_id values (multiplied further by every other
          tag already on the metric, across 40 hosts) can generate tens of millions of billed
          custom metrics from one instrumentation line — blowing past account custom-metric
          limits, wrecking dashboard and monitor query performance org-wide, and spiking cost. The
          correct tool for &quot;look up this one customer&apos;s checkout latency&quot; is APM
          traces (tag the span with <code>user_id</code> — spans are built for high-cardinality
          data) or logs, not a metric tag.
        </p>
        <p>
          <strong>3. The queue-depth alert:</strong> no, this doesn&apos;t require changing the
          metric type. GAUGE is still correct — queue depth is genuinely a snapshot value.
          &quot;Sustained above threshold for 5 minutes&quot; is a monitor evaluation-window
          concern: configure the monitor to evaluate the average (or all values) over a trailing
          5-minute window and only fire when that condition holds, rather than alerting on every
          single data point that crosses 500. Metric type answers &quot;how do raw submissions get
          aggregated;&quot; monitor configuration answers &quot;how do I decide this is worth
          paging someone.&quot; Conflating the two is a common mistake.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A metric is name + tags + type + a series of <code>(timestamp, value)</code> points —
          type determines how the Agent and backend <em>aggregate</em> raw submissions, not just
          how the graph gets styled.
        </li>
        <li>
          COUNT, RATE, and GAUGE cover the simple cases; pick based on whether you&apos;re
          counting discrete events, normalizing to per-second, or snapshotting a current value.
          Remember: DogStatsD stores COUNT submissions in-app as RATE.
        </li>
        <li>
          HISTOGRAM aggregates percentiles Agent-side, per host — cheap, but not globally
          accurate across a fleet. Never trust a HISTOGRAM&apos;s percentile for an SLO spanning
          multiple hosts.
        </li>
        <li>
          DISTRIBUTION ships raw values as DDSketch data and lets the backend compute one globally
          accurate percentile across every host and any tag slice — use it for latency SLOs and
          anything customer-facing, at a higher cost than a plain custom metric.
        </li>
        <li>
          A custom metric is billed per unique combination of metric name + tag values (including
          the host tag) — one unbounded tag like <code>user_id</code> can turn a single metric
          name into millions of billed custom metrics. Use SET for uniques, and push
          high-cardinality lookups to traces or logs instead.
        </li>
        <li>
          Submit custom metrics via DogStatsD (lowest friction, from app code), a custom Agent
          check (best for polling external systems on the Agent&apos;s schedule), or the HTTP API
          (server-side/batch jobs) — but remember the v2 series API only accepts COUNT, RATE, and
          GAUGE; HISTOGRAM can only ever be produced Agent-side.
        </li>
      </ul>
    </div>
  );
}
