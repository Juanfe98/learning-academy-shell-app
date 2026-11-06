import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const queryPipelineDiagram = String.raw`flowchart LR
  RAW["Raw submitted points\nper series (host, container, tags)"]
  RAW --> FILTER["Filter\n{env:prod, service:checkout-service}\nonly matching series are considered"]
  FILTER --> SPACE["Space aggregation\nleading avg / sum / min / max\ncombines series sharing the same\n'by' tag values into one line"]
  SPACE --> ROLLUP["Time aggregation (rollup)\navg / sum / min / max / count\nbuckets each line's points\nover the chosen interval"]
  ROLLUP --> FUNC["Functions\nrate, ewma, top, fill,\ntimeshift, anomalies..."]
  FUNC --> DISPLAY["Displayed line(s)\none per unique 'by' group"]`;

const sloTypeDecisionDiagram = String.raw`flowchart TD
  Q["What does 'good' mean for this SLI?"]
  Q -->|"Countable events:\nsuccessful vs total requests"| METRIC["Metric-based SLO\nSLI = sum(good events) / sum(total events)"]
  Q -->|"Wrap an EXISTING or new\nmonitor's uptime"| MONITOR["Monitor-based SLO\nSLI = time NOT in ALERT / total time"]
  Q -->|"Custom uptime threshold,\nno monitor to maintain"| SLICE["Time Slice SLO\nSLI = time meeting a custom\nthreshold / total time"]
  METRIC --> USE1["request success rate,\nerror rate, count-based reliability"]
  MONITOR --> USE2["you already trust a threshold\nmonitor and want to formalize it"]
  SLICE --> USE3["uptime SLIs without\nmaintaining a separate monitor"]`;

const burnRateDiagram = String.raw`flowchart TD
  BUDGET["30-day error budget\n= 100% - 99.9% target = 0.1%\n(~43 minutes of bad behavior allowed)"]
  BUDGET --> RATE["Observed error rate,\nmeasured continuously"]
  RATE -->|"long_window 1h, short_window 5m\nburn_rate > 14.4"| FAST["FAST-BURN alert\n2% of budget consumed in 1 hour\nPAGE on-call now"]
  RATE -->|"long_window 24h, short_window 120m\nburn_rate > 3"| SLOW["SLOW-BURN alert\n10% of budget consumed in 24 hours\nFILE a ticket"]
  FAST --> DEPLETED["Budget fully consumed\nbefore the 30-day window resets"]
  SLOW --> DEPLETED
  DEPLETED --> POLICY["Error budget policy:\nfreeze risky releases,\nreprioritize reliability work"]`;

const incidentLifecycleDiagram = String.raw`stateDiagram-v2
  [*] --> Declared
  Declared --> Investigating: assign Incident Commander,\nresponders, severity
  Investigating --> Identified: root cause hypothesis found\n(pivot: metrics to traces to logs)
  Identified --> Monitoring: fix shipped,\nwatching for recurrence
  Monitoring --> Resolved: signals hold steady\nfor a sustained period
  Monitoring --> Investigating: signals regress
  Resolved --> Postmortem: generate Postmortem Notebook\nfrom the template gallery
  Postmortem --> [*]`;

export const toc: TocItem[] = [
  { id: "query-anatomy", title: "The Metric Query Anatomy", level: 2 },
  { id: "filtering-and-space-aggregation", title: "Filtering & Space Aggregation", level: 3 },
  { id: "time-aggregation-and-rollup", title: "Time Aggregation & Rollup", level: 3 },
  { id: "as-count-vs-as-rate", title: "as_count() vs as_rate()", level: 3 },
  { id: "query-functions", title: "Query Functions: The Real Power", level: 2 },
  { id: "arithmetic-and-rate-functions", title: "Arithmetic & Rate Functions", level: 3 },
  { id: "smoothing-rank-fill-and-exclusion", title: "Smoothing, Rank, Fill & Exclusion", level: 3 },
  { id: "timeshift-and-algorithmic-functions", title: "Timeshift & Algorithmic Functions", level: 3 },
  { id: "slos", title: "SLOs: SLI, SLO, SLA, and the Error Budget", level: 2 },
  { id: "slo-types", title: "Metric-Based, Monitor-Based, and Time Slice SLOs", level: 3 },
  { id: "error-budget-and-burn-rate", title: "Error Budget & Burn Rate", level: 3 },
  {
    id: "multi-window-multi-burn-rate-alerting",
    title: "Multi-Window, Multi-Burn-Rate Alerting",
    level: 3,
  },
  { id: "incident-management", title: "Incident Management", level: 2 },
  { id: "watchdog", title: "Watchdog: ML-Based Anomaly Detection", level: 2 },
  { id: "cost-and-governance", title: "Cost & Governance", level: 2 },
  { id: "cost-drivers", title: "The Cost Drivers", level: 3 },
  { id: "cost-levers", title: "The Levers That Control Them", level: 3 },
  { id: "best-practices", title: "Best Practices Synthesis", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Capstone Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function QuerySlosAndBestPractices() {
  return (
    <div className="article-content">
      <p>
        Every earlier module in this academy taught you how to get telemetry <em>into</em>{" "}
        Datadog — the Agent, DogStatsD, tags, log pipelines, APM. This module is about what you do
        with it once it&apos;s there: how to actually read a query, how to turn a query into a
        promise you make to the business (an SLO), how to alert on that promise <em>before</em>{" "}
        you&apos;ve already broken it, how to run the incident when you do, and how to keep the
        bill from becoming someone else&apos;s incident. This is the module that gets asked about
        in senior and staff interviews, because it&apos;s the module that separates &quot;I know
        how to use Datadog&quot; from &quot;I know how to run a production system with Datadog.&quot;
      </p>

      <h2 id="query-anatomy">The Metric Query Anatomy</h2>
      <p>
        Every dashboard widget, every monitor threshold, and every SLO numerator/denominator
        eventually compiles down to the same underlying grammar. If you can read this shape
        fluently, you can read almost anything in the product:
      </p>

      <CodeBlock
        code={`avg:trace.http.request{env:prod} by {service}.rollup(avg, 60)

# avg:                     <- SPACE aggregator: combines every series that
#                             shares the same "by" tag values into one line
# trace.http.request       <- the metric name
# {env:prod}                <- FILTER: only series matching this tag are considered
# by {service}              <- GROUP BY: one output line per unique service tag value
# .rollup(avg, 60)          <- TIME aggregator: bucket each output line's points
#                             into 60-second intervals, averaging within each bucket`}
        lang="text"
        filename="query-anatomy.txt"
      />

      <MermaidDiagram
        chart={queryPipelineDiagram}
        title="Metric Query Evaluation Pipeline"
        caption="Filtering narrows which raw series are in play. Space aggregation (the leading avg/sum/min/max) combines series that share the same 'by' tags into fewer output lines. Time aggregation (rollup) then buckets each output line's points over the chosen interval. Functions transform the result last, right before it's drawn."
        minHeight={280}
      />

      <h3 id="filtering-and-space-aggregation">Filtering & Space Aggregation</h3>
      <p>
        <strong>Space aggregation</strong> splits a single metric into multiple timeseries by tags
        such as host, container, or region, then combines them back down using an aggregator.
        There are four space aggregators: <code>sum</code>, <code>min</code>, <code>max</code>, and{" "}
        <code>avg</code>. If your hosts are spread across four regions and you query{" "}
        <code>avg:aws.ec2.cpuutilization{"{*}"} by {"{region}"}</code>, Datadog combines every
        host within a region using <code>avg</code> — you get one line per region, not one line
        per host. Choosing <code>max</code> instead answers a very different question: &quot;what
        is the worst host doing in each region&quot; rather than &quot;what is the typical host
        doing.&quot;
      </p>
      <p>
        The most common production mistake here is confusing the <em>filter</em> (
        <code>{"{env:prod}"}</code>) with the <em>group by</em> (<code>by {"{service}"}</code>).
        The filter narrows which raw series are eligible at all. The group by determines how many
        output lines you get and which aggregator collapses the leftover cardinality. Omit the{" "}
        <code>by</code> clause entirely and every matching series collapses into a single line —
        which is exactly right for an SLO&apos;s overall status, and exactly wrong for a dashboard
        meant to spot one bad pod among a thousand.
      </p>

      <h3 id="time-aggregation-and-rollup">Time Aggregation & Rollup</h3>
      <p>
        <strong>Time aggregation is always applied</strong>, on every query, whether you write a{" "}
        <code>.rollup()</code> or not — Datadog cannot draw more datapoints than there are pixels,
        so it buckets raw points into time intervals and combines each bucket with an aggregator.
        There are five time aggregators: <code>sum</code>, <code>min</code>, <code>max</code>,{" "}
        <code>avg</code>, and <code>count</code> (space aggregation only offers four — no{" "}
        <code>count</code> — which is a genuinely useful distinction to remember under pressure).
      </p>
      <p>
        The default rollup interval scales with the time window you&apos;re viewing so the graph
        never exceeds roughly 1,500 points: the past hour rolls up to 20-second buckets, the past
        day to 5-minute buckets, the past week to 1-hour buckets. This is also why zooming out
        smooths a graph that looked spiky up close — you are not seeing less noise, you are seeing
        wider buckets. Appending <code>.rollup(&lt;aggregator&gt;, &lt;interval&gt;)</code>{" "}
        overrides the default so you can force a specific granularity (up to the 1,500-point
        ceiling — about one point per minute over a full day).
      </p>

      <h3 id="as-count-vs-as-rate">as_count() vs as_rate()</h3>
      <p>
        These two in-application modifiers exist for the same reason and get confused constantly.
        Both apply to <code>COUNT</code> and <code>RATE</code> type metrics, both force the time
        aggregator to <code>sum</code>, and both disable interpolation — but they answer different
        questions.
      </p>

      <CodeBlock
        code={`# Same underlying COUNT metric, two different questions:

sum:orders.completed{*}.as_count()
# -> "How many orders completed in each rollup interval?"
# Absolute count per bucket. Zoom out to a wider time range and the bucket
# size changes, so the SAME graph shape shows bigger numbers per bar.

sum:orders.completed{*}.as_rate()
# -> "How many orders per SECOND is the system completing?"
# Divided by the sampling interval to normalize. The shape stays
# comparable no matter what time range or rollup interval you're viewing.`}
        lang="text"
        filename="as-count-vs-as-rate.txt"
      />
      <p>
        The failure mode worth naming in an interview: using <code>as_count()</code> in a monitor
        query without accounting for how the count scales with the evaluation window. A query like{" "}
        <code>sum(last_5m):sum:errors{"{*}"}.as_count() &gt; 100</code> means something completely
        different from the same threshold over <code>last_1h</code> — the raw count grows with the
        window, the threshold does not. This is exactly the kind of query that pages fine in
        staging and either never fires or never stops firing in production.
      </p>

      <h2 id="query-functions">Query Functions: The Real Power</h2>
      <p>
        Aggregation gets you a line. Functions turn that line into an answer. Datadog organizes
        dozens of functions into families — you do not need to memorize all of them, but you do
        need to recognize the family a problem belongs to, because that tells you where to look.
      </p>

      <ArticleTable
        caption="The function families that come up constantly in real dashboards, monitors, and interviews — not an exhaustive list, but the ones worth having cold."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Family</th>
              <th>Example functions</th>
              <th>What it does</th>
              <th>Reach for it when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Arithmetic</td>
              <td>
                <code>+ - * /</code>, <code>minimum()</code>, <code>maximum()</code>
              </td>
              <td>Combines two or more queries into one formula</td>
              <td>Computing an error rate as errors / total</td>
            </tr>
            <tr>
              <td>Rate</td>
              <td>
                <code>diff()</code>, <code>derivative()</code>, <code>monotonic_diff()</code>,{" "}
                <code>per_second()</code>
              </td>
              <td>Turns a raw or counter series into a rate of change</td>
              <td>Graphing throughput or the slope of a growing counter</td>
            </tr>
            <tr>
              <td>Smoothing</td>
              <td>
                <code>ewma()</code>, <code>ewma_3()</code> … <code>ewma_20()</code>
              </td>
              <td>Exponentially weighted moving average to cut noise</td>
              <td>Spotting a real trend under a spiky metric</td>
            </tr>
            <tr>
              <td>Rank</td>
              <td>
                <code>top()</code>, <code>bottom()</code>, e.g. <code>top5_mean()</code>
              </td>
              <td>Keeps only the N highest or lowest series</td>
              <td>Isolating the noisiest hosts on a high-cardinality graph</td>
            </tr>
            <tr>
              <td>Count / Exclusion</td>
              <td>
                <code>count_nonzero()</code>, <code>exclude_null()</code>
              </td>
              <td>Counts non-zero groups, or drops N/A tag groups</td>
              <td>Cleaning up a grouped graph or top list</td>
            </tr>
            <tr>
              <td>Interpolation</td>
              <td>
                <code>fill()</code>, <code>default_zero()</code>
              </td>
              <td>Fills gaps in sparse data — linear, last, zero, or none</td>
              <td>Avoiding false gaps on a sparsely-reporting GAUGE metric</td>
            </tr>
            <tr>
              <td>Timeshift</td>
              <td>
                <code>hour_before()</code>, <code>week_before()</code>
              </td>
              <td>Overlays a value from earlier in time as a reference line</td>
              <td>Week-over-week or day-over-day comparisons</td>
            </tr>
            <tr>
              <td>Algorithms</td>
              <td>
                <code>anomalies()</code>, <code>outliers()</code>, <code>forecast()</code>,{" "}
                <code>robust_trend()</code>
              </td>
              <td>ML-assisted bands, clustering, and projections</td>
              <td>Anomaly monitors, outlier hosts, capacity forecasting</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="arithmetic-and-rate-functions">Arithmetic & Rate Functions</h3>
      <p>
        Arithmetic functions let you combine multiple queries into a single formula using{" "}
        <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>minimum()</code>, and{" "}
        <code>maximum()</code> — this is how nearly every error-rate or ratio graph you have ever
        looked at is actually built. The rate family answers &quot;how fast is this changing&quot;:{" "}
        <code>diff()</code> graphs the delta between intervals, <code>derivative()</code> graphs{" "}
        <code>diff/dt</code>, <code>monotonic_diff()</code> is the same as <code>diff()</code> but
        skips resets (essential for counters that reset to zero on restart), and{" "}
        <code>per_second()</code> normalizes the rate of change per second regardless of interval.
      </p>

      <h3 id="smoothing-rank-fill-and-exclusion">Smoothing, Rank, Fill & Exclusion</h3>
      <p>
        <code>ewma()</code> (exponentially weighted moving average) trades responsiveness for
        noise reduction — <code>ewma_3()</code> reacts quickly and is comparable to a 3-period
        rolling average, <code>ewma_20()</code> (the default span) smooths much harder. Use a
        shorter span when you need to see a real trend fast; use a longer span when you are
        eyeballing a graph for a slow drift and the noise is drowning it out.
      </p>
      <p>
        <code>top()</code> and <code>bottom()</code> keep only the N highest or lowest series by a
        chosen aggregation (<code>max</code>, <code>mean</code>, <code>min</code>, <code>sum</code>
        , <code>last</code>, <code>l2norm</code>, or <code>area</code>) and direction — this is the
        single most useful function for turning an unreadable 200-line graph into &quot;show me
        the 5 worst offenders.&quot; <code>fill()</code> interpolates gaps (<code>linear</code>,{" "}
        <code>last</code>, <code>zero</code>, or <code>null</code> to disable it) and{" "}
        <code>default_zero()</code> is the common shortcut for &quot;treat missing GAUGE data as
        zero.&quot; <code>exclude_null()</code> and <code>count_nonzero()</code> clean up grouped
        graphs where some tag combinations legitimately have no data.
      </p>

      <h3 id="timeshift-and-algorithmic-functions">Timeshift & Algorithmic Functions</h3>
      <p>
        Timeshift functions like <code>hour_before()</code> and <code>week_before()</code> overlay
        a past value on the same graph — the bread-and-butter of &quot;is this Black Friday spike
        normal for a Friday&quot; comparisons. The algorithmic family is where Datadog&apos;s ML
        surfaces directly in a query: <code>anomalies()</code> overlays a gray expected-behavior
        band from historical data, <code>outliers()</code> clusters grouped series and flags the
        ones that do not fit (DBSCAN by default, MAD as an alternative), and <code>forecast()</code>{" "}
        projects a series forward using a <code>linear</code> or <code>seasonal</code> algorithm.
        These same algorithms power the Anomaly, Outlier, and Forecast monitor types — the query
        function is the same math, just usable inline on any graph.
      </p>

      <CodeBlock
        code={`# 1. Formula: error rate as a percentage, built from two queries
(sum:http.requests{status:5xx}.as_count() /
 sum:http.requests{*}.as_count()) * 100

# 2. Smooth a noisy latency series before eyeballing a trend
ewma_10(avg:trace.http.request.duration{service:checkout-service})

# 3. Isolate the 5 noisiest hosts on a high-cardinality graph
top(avg:system.cpu.user{*} by {host}, 5, 'mean', 'desc')

# 4. Forecast next week's traffic from a linear trend, 2 standard deviations wide
forecast(sum:http.requests{*}.as_count(), 'linear', 2)`}
        lang="text"
        filename="query-functions.txt"
      />

      <h2 id="slos">SLOs: SLI, SLO, SLA, and the Error Budget</h2>
      <p>
        Three letters get thrown around interchangeably and shouldn&apos;t be. An{" "}
        <strong>SLI</strong> (Service Level Indicator) is the actual measurement — a query, a
        number. An <strong>SLO</strong> (Service Level Objective) is the internal target for that
        SLI over a time window — &quot;99.9% of requests succeed over 30 days.&quot; An{" "}
        <strong>SLA</strong> (Service Level Agreement) is the external, often contractual, promise
        — usually looser than your SLO on purpose, so you have room to miss internally before you
        breach externally.
      </p>

      <h3 id="slo-types">Metric-Based, Monitor-Based, and Time Slice SLOs</h3>
      <MermaidDiagram
        chart={sloTypeDecisionDiagram}
        title="Choosing an SLO Type"
        caption="Metric-based SLOs are count-based (good events over total events) — use them for anything you can count, like requests. Monitor-based SLOs are time-based, derived from a monitor's uptime — use them to formalize a threshold monitor you already trust."
        minHeight={300}
      />
      <p>
        A <strong>metric-based SLO</strong> calculates its SLI as the sum of good events divided
        by the sum of total events — this is what you want for &quot;percentage of requests that
        succeeded.&quot; A <strong>monitor-based SLO</strong> calculates its SLI as the amount of
        time an underlying monitor was <em>not</em> in the ALERT state, divided by total time —
        useful when you already have a trusted threshold monitor and want to wrap an SLO around
        its uptime rather than building a new query. A <strong>Time Slice SLO</strong> is also
        time-based but does not require a monitor at all — you define a custom good/bad threshold
        directly on the SLO. All three support a <strong>rolling window</strong> (7, 30, or 90
        days, which most teams use) or a <strong>calendar window</strong> (week-to-date,
        previous week, month-to-date, previous month — useful for SLAs that reset with a billing
        cycle).
      </p>
      <p>
        A sharp, easy-to-miss detail: a 99.999% target on a 7-day window leaves an error budget of
        only about 6 seconds. Monitors evaluate once a minute, so a single alert can fully consume
        and overspend that budget in one evaluation cycle. This is exactly why Datadog caps the
        decimal precision it displays and why picking an unrealistically strict target is a real
        production mistake, not just a vanity metric.
      </p>

      <CodeBlock
        code={`{
  "name": "Checkout API availability",
  "type": "metric",
  "description": "Percentage of checkout requests that return a 2xx status",
  "query": {
    "numerator": "sum:http.requests{service:checkout-service,status_class:2xx}.as_count()",
    "denominator": "sum:http.requests{service:checkout-service}.as_count()"
  },
  "thresholds": [
    { "timeframe": "30d", "target": 99.9, "warning": 99.95 }
  ],
  "tags": ["service:checkout-service", "team:payments"]
}`}
        lang="json"
        filename="slo.json"
      />

      <h3 id="error-budget-and-burn-rate">Error Budget & Burn Rate</h3>
      <p>
        Your <strong>error budget</strong> is simply <code>100% - target</code> — for a 99.9%
        target, that&apos;s 0.1% of allowed bad behavior. It is the entire point of setting an SLO
        in the first place: it converts &quot;be reliable&quot; from a vague aspiration into a
        finite, spendable resource that product and reliability work compete for on equal footing.
      </p>
      <p>
        <strong>Burn rate</strong> is a unitless multiplier — coined by Google&apos;s SRE
        workbook — that measures how fast you&apos;re consuming that budget relative to the SLO&apos;s
        target length. A burn rate of 1 means &quot;consume the entire budget in exactly the target
        window if this rate holds.&quot; A burn rate of 14.4 on a 30-day target means the whole
        30-day budget would be gone in about 50 hours if sustained. The formula:
      </p>
      <CodeBlock
        code={`error rate (over a period) = 1 - (good behavior / total behavior)
time until budget exhausted = SLO target length / burn rate

# Example: 30-day target, burn rate 14.4
# 30 days / 14.4 ≈ 50 hours until the entire monthly budget is gone
# if that error rate holds steady`}
        lang="text"
        filename="burn-rate-formula.txt"
      />

      <h3 id="multi-window-multi-burn-rate-alerting">Multi-Window, Multi-Burn-Rate Alerting</h3>
      <p>
        Alerting the instant your SLI dips below target is too slow — by the time it fires, the
        budget is already gone. Alerting on any single burn-rate threshold has the opposite
        problem: a short, sharp spike triggers a page for something that self-resolves in seconds,
        while a slow, sustained leak never crosses a threshold high enough to fire quickly. The
        fix — the pattern senior SRE teams are expected to know — is running <strong>two burn-rate
        alerts in parallel</strong>: a <strong>fast-burn</strong> alert with a high threshold over a
        short window that pages immediately, and a <strong>slow-burn</strong> alert with a lower
        threshold over a long window that files a ticket instead of waking anyone up.
      </p>

      <MermaidDiagram
        chart={burnRateDiagram}
        title="Fast-Burn vs Slow-Burn Alerting on the Same Budget"
        caption="Both alerts watch the same underlying error rate but at different sensitivities. Fast-burn catches a severe outage in about an hour and pages immediately; slow-burn catches a quiet leak that would otherwise exhaust the budget unnoticed near the end of the 30-day window."
        minHeight={420}
      />

      <p>
        Datadog&apos;s own recommended values for a 30-day, 99.9% target: a burn rate of{" "}
        <strong>14.4</strong> over a <strong>1-hour long window / 5-minute short window</strong>{" "}
        (2% of the budget consumed — page), and a burn rate of <strong>3</strong> over a{" "}
        <strong>24-hour long window / 120-minute short window</strong> (10% of the budget consumed
        — ticket). The short window exists to confirm the burn is still actively happening right
        now, not just a historical blip inside the long window. Datadog constrains the long window
        to a maximum of 48 hours and auto-derives the short window as{" "}
        <code>1/12 × long window</code> in the UI — both are overridable via the API or Terraform.
      </p>

      <CodeBlock
        code={`# Fast-burn: pages on-call -- consumes 2% of the 30-day budget in ~1 hour
resource "datadog_monitor" "checkout_slo_fast_burn" {
  name = "[SLO] checkout-service fast burn rate"
  type = "slo alert"

  query = <<EOT
    burn_rate("abc123-slo-id").over("30d").long_window("1h").short_window("5m") > 14.4
  EOT

  message = "Fast burn on checkout-service SLO -- page on-call. {{#is_alert}}@pagerduty-checkout{{/is_alert}}"
  monitor_thresholds {
    critical = 14.4
  }
  tags = ["service:checkout-service", "team:payments"]
}

# Slow-burn: files a ticket -- consumes 10% of the 30-day budget in 24 hours
resource "datadog_monitor" "checkout_slo_slow_burn" {
  name = "[SLO] checkout-service slow burn rate"
  type = "slo alert"

  query = <<EOT
    burn_rate("abc123-slo-id").over("30d").long_window("24h").short_window("120m") > 3
  EOT

  message = "Slow burn on checkout-service SLO -- file a ticket, investigate before it compounds. @jira-payments-team"
  monitor_thresholds {
    critical = 3
  }
  tags = ["service:checkout-service", "team:payments"]
}`}
        lang="hcl"
        filename="burn_rate_alerts.tf"
      />

      <h2 id="incident-management">Incident Management</h2>
      <p>
        Burn-rate alerts and Watchdog exist to shorten the gap between &quot;something is wrong&quot;
        and &quot;a human knows.&quot; Incident Management is what happens in the gap between
        &quot;a human knows&quot; and &quot;it&apos;s fixed and we&apos;ve learned from it.&quot;
        Incidents can be declared manually or automatically from a monitor alert, a security
        signal, or an event — the essential elements of a declaration are a title, a severity
        level, and at least one incident commander.
      </p>

      <MermaidDiagram
        chart={incidentLifecycleDiagram}
        title="The Practical Incident Lifecycle"
        caption="Datadog doesn't force this exact state machine on you, but this is the shape almost every team ends up walking through: declare, investigate by pivoting across pillars, identify root cause, watch the fix hold, resolve, then write it down so it doesn't happen the same way twice."
        minHeight={340}
      />

      <p>
        Severity is typically configured as a scale from <strong>SEV-1</strong> (most severe,
        full outage, all-hands) down through lower numbers for progressively smaller-blast-radius
        issues, often with an <strong>Unknown</strong> option for before triage is complete — the
        exact set of levels is configurable per organization in Incident Settings, so treat the
        number itself as a convention your team agrees on rather than a fixed product constant.
        Datadog supports custom <strong>responder roles</strong> beyond the default set — Incident
        Commander (owns the response) and Communications Lead (owns stakeholder updates) are the
        two that show up in almost every team&apos;s process. Throughout the incident, Datadog
        captures a <strong>timeline</strong> of status changes, notes, and linked monitors and
        graphs automatically, which becomes the raw material for the postmortem. After resolution,
        you can generate a <strong>Postmortem Notebook</strong> straight from a template in the
        Notebook Template Gallery — the same gallery that holds Incident Report and SLO
        Specification templates — pre-populated with the incident&apos;s timeline and linked
        signals so nobody is reconstructing the story from memory a week later.
      </p>

      <h2 id="watchdog">Watchdog: ML-Based Anomaly Detection</h2>
      <p>
        Every monitor you have built so far requires you to have already suspected what could go
        wrong. <strong>Watchdog</strong> is Datadog&apos;s answer to the failure modes nobody wrote
        a monitor for — it continuously computes a baseline of expected behavior across metrics,
        APM, and logs, using the same seasonal anomaly, outlier, and forecast algorithms that power
        hand-built Anomaly, Outlier, and Forecast monitors, and proactively surfaces deviations
        without you configuring a single threshold.
      </p>
      <p>
        <strong>Watchdog Insights</strong> is the recommendation layer that shows up throughout the
        product — in explorers and search results — surfacing two kinds of findings:{" "}
        <strong>anomalies</strong> (pre-calculated Watchdog alerts matching your current view) and{" "}
        <strong>outliers</strong> (tags that appear too frequently in error events, or that are
        disproportionately driving a continuous metric like latency upward). <strong>Watchdog
        Explains</strong> goes a step further during investigation: point it at a timeseries graph
        and it identifies which specific tag values are contributing most to an anomaly&apos;s
        shape or scale — doing the &quot;which of these 400 pods is actually the problem&quot;
        legwork for you.
      </p>
      <p>
        This is the practical answer to the known-unknowns vs. unknown-unknowns framing from the
        first module of this academy: hand-built monitors and SLO burn-rate alerts cover the
        known-unknowns you deliberately instrumented. Watchdog is the layer that gives you a fighting
        chance against the unknown-unknowns — it does not replace your monitors, it catches what
        they were never written to catch.
      </p>

      <h2 id="cost-and-governance">Cost & Governance</h2>
      <p>
        This is the section that gets a mid-level engineer promoted to senior, because it is the
        section most engineers never think about until finance emails the team. Every product in
        Datadog bills on a different dimension, and the instrumentation decisions you make in code
        review — an extra tag here, a debug log there — compound directly into that bill.
      </p>

      <h3 id="cost-drivers">The Cost Drivers</h3>
      <ArticleTable
        caption="What each product actually bills on, and the specific instrumentation choice that tends to blow it up without anyone deciding that on purpose."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Billed on</th>
              <th>What drives it up unintentionally</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Custom Metrics</td>
              <td>Unique metric name × tag-value combinations (distinct timeseries)</td>
              <td>
                High-cardinality tags (<code>user_id</code>, <code>request_id</code>,{" "}
                <code>pod_name</code>); DISTRIBUTION metrics multiply volume 5x per combination,
                10x if percentile aggregations are added
              </td>
            </tr>
            <tr>
              <td>Log Management</td>
              <td>
                Ingestion (every log sent, even discarded ones) plus indexing (logs kept
                searchable), scaled by index retention
              </td>
              <td>Verbose debug-level logging shipped at full volume with long index retention</td>
            </tr>
            <tr>
              <td>APM</td>
              <td>
                Per-host APM charge, plus ingested span volume and indexed span count beyond the
                per-host allotment
              </td>
              <td>
                Every instrumented service host; broad trace retention filters that index far more
                than errors and slow traces
              </td>
            </tr>
            <tr>
              <td>Hosts / Containers</td>
              <td>Per-host or per-container infrastructure monitoring</td>
              <td>Autoscaling bursts billed at high-water-mark; short-lived CI containers</td>
            </tr>
            <tr>
              <td>Synthetics / RUM</td>
              <td>Per test run (browser tests cost more than API tests) / per session</td>
              <td>High-frequency browser checks across many locations; unsampled RUM sessions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="cost-levers">The Levers That Control Them</h3>
      <p>
        The single most important idea in this section: for custom metrics and logs, Datadog lets
        you <strong>decouple ingestion from indexing</strong>. You do not have to choose between
        &quot;send everything&quot; and &quot;pay for everything&quot; — <strong>Metrics without
        Limits™</strong> lets every tag reach Datadog (fully ingested) while you allow-list only
        the tags that need to stay queryable (indexed), and log <strong>exclusion filters</strong>{" "}
        let you keep a log flowing into Live Tail and log-based metrics while sampling it out of
        the searchable index entirely — from 0% to 100%, either per individual log or per group of
        logs sharing an attribute value.
      </p>
      <ul>
        <li>
          <strong>Custom metrics:</strong> audit for unbounded-cardinality tags before they ship,
          not after the bill spikes; use Metrics without Limits to keep raw data flowing without
          indexing every tag combination.
        </li>
        <li>
          <strong>Logs:</strong> exclusion filters with sampling on low-value, high-volume sources
          (health checks, debug logs); shorter retention windows on indexes that don&apos;t need
          30–90 days; route repetitive log patterns to log-based metrics instead of indexing the
          raw text forever.
        </li>
        <li>
          <strong>APM:</strong> tune the tracer&apos;s ingestion sampling rate and configure
          retention filters so the trace explorer indexes errors, slow traces, and a representative
          baseline — trace-derived metrics (App Analytics) still reflect 100% of traffic regardless
          of sampling, so you don&apos;t lose accuracy on the numbers that matter most.
        </li>
        <li>
          <strong>Governance:</strong> use Usage Attribution and the Cost Details page to see which
          team, service, or tag is actually driving each product line — this is the tool that turns
          &quot;the Datadog bill went up&quot; into &quot;team X&apos;s new distribution metric with
          percentiles added 40 custom metrics per unique combination.&quot;
        </li>
      </ul>

      <h2 id="best-practices">Best Practices Synthesis</h2>
      <ul>
        <li>
          <strong>Alert on symptoms, not causes.</strong> Burn-rate SLO alerts tell you the user
          experience is degrading; a thousand individual resource-threshold monitors tell you a
          thousand things that may or may not matter to a user right now. Prefer the former as your
          paging tier and use the latter for diagnosis, not paging.
        </li>
        <li>
          <strong>Unified service tagging is not optional.</strong> Every technique in this module —
          pivoting an incident across pillars, scoping an SLO to a service, attributing cost to a
          team — depends on <code>env</code>, <code>service</code>, and <code>version</code> being
          applied consistently everywhere, from the first line of instrumentation.
        </li>
        <li>
          <strong>Dashboards and monitors as code.</strong> The Terraform examples in this module
          are not a novelty — SLOs, burn-rate monitors, and dashboards defined in version control
          are reviewable, diffable, and survive the person who built them leaving the team.
        </li>
        <li>
          <strong>Cost-aware instrumentation is a code review concern, not a finance concern.</strong>{" "}
          A high-cardinality tag added to a hot-path metric is a production decision with a dollar
          amount attached — review it the same way you&apos;d review a query without an index.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Explain SLOs, error budgets, and burn-rate alerting'"
        intro="Weak answers stop at defining SLO. Strong answers show you understand why naive threshold alerting on the SLO itself is insufficient, and name the actual pattern that fixes it."
        steps={[
          "Define the hierarchy fast: SLI is the measurement, SLO is the internal target over a window, SLA is the external contractual promise — usually looser than the SLO on purpose.",
          "Define error budget as 100% minus the target — the finite, spendable amount of unreliability you're allowed, which reframes reliability work as competing for budget against feature work rather than being an abstract goal.",
          "Define burn rate as a multiplier on how fast that budget depletes relative to the SLO's target window — burn rate 1 means 'exhaust the budget exactly on schedule.'",
          "Explain why a single alert isn't enough: alerting only when the SLO is already breached is too late, and a single burn-rate threshold can't be both sensitive to sudden outages and tolerant of brief noise.",
          "Close with the actual pattern: multi-window, multi-burn-rate alerting — a fast-burn alert (high threshold, short window) pages immediately for severe issues, a slow-burn alert (lower threshold, long window) files a ticket for a slow leak. This is the detail that signals real SRE experience, not textbook knowledge.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How would you get a runaway Datadog bill under control?'"
        intro="Weak answers jump straight to 'turn things off.' Strong answers start with attribution, because you cannot fix what you haven't diagnosed, and every fix has a specific product-level lever."
        steps={[
          "Start with Usage Attribution and the Cost Details page — find which product and which team, service, or tag is actually driving the spike before touching any instrumentation.",
          "If it's custom metrics: hunt for unbounded-cardinality tags (user_id, request_id, pod name) and either stop tagging by them or apply Metrics without Limits to keep the data flowing without indexing every combination.",
          "If it's logs: audit index inclusion, add exclusion filters with sampling on low-value high-volume sources, and shorten retention on indexes that don't need 30-90 days.",
          "If it's APM: tighten the tracer's ingestion sampling and configure retention filters so only errors, slow traces, and a representative baseline get indexed — trace-derived metrics still reflect 100% of traffic regardless.",
          "Close with governance, not a one-time fix: put usage monitors on your own Datadog usage metrics and review Cost Details on a cadence so cardinality creep gets caught in code review, not in an invoice.",
        ]}
      />

      <h2 id="challenge">Capstone Challenge</h2>

      <InterviewChallenge
        title="Design End-to-End Observability for a New Payments Service"
        scenario={
          <>
            Your team is launching <code>payments-service</code> — a new Node.js service running
            on Kubernetes that handles checkout payment authorization for a fast-growing
            e-commerce platform. Leadership wants &quot;full Datadog observability&quot; in place
            before launch. Finance has separately asked that this service&apos;s Datadog footprint
            stay within a fixed monthly budget as traffic scales — they do not want to find out
            about a cost problem from an invoice. You have access to every product covered in this
            academy: the Agent, custom metrics via DogStatsD, dashboards, monitors, log
            management, APM, infrastructure monitoring, synthetics, RUM, SLOs, and Incident
            Management.
          </>
        }
        tasks={[
          "Define the unified service tags you'd apply everywhere, and the golden-signal metrics (traffic, errors, latency, saturation) you'd track for this service and why each one matters for a payments path specifically.",
          "Describe at least one dashboard: what it shows, who it's for (on-call vs. leadership), and which widgets/queries populate it.",
          "Define one SLO (state the type, target, and time window) with a concrete metric-based or monitor-based SLI, and design a two-alert fast-burn/slow-burn burn-rate alerting scheme for it with real numbers.",
          "Define your log and trace strategy: what gets indexed vs. excluded or sampled, and why — tie this explicitly to keeping cost proportional to value.",
          "Propose a monthly cost budget broken down by product (custom metrics, indexed logs, APM) and name the specific lever you'd use to keep each one in check as traffic grows 10x.",
        ]}
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>1. Tags and golden signals.</strong> Apply <code>env:production</code>,{" "}
          <code>service:payments-service</code>, and <code>version:&lt;git-sha-or-semver&gt;</code>{" "}
          everywhere — metrics, logs, and traces — plus <code>team:payments</code> for cost
          attribution. Golden signals for a payment path specifically: request rate and success
          rate by <code>provider</code> tag (you likely call multiple payment providers, and one
          degrading shouldn&apos;t look identical to the whole service degrading), p99 authorization
          latency (payments are latency-sensitive at checkout — averages hide the tail that loses
          sales), and saturation on the downstream connection pool to the payments database, since
          a payments service exhausting its DB pool fails silently and expensively.
        </p>
        <p>
          <strong>2. Dashboard.</strong> One on-call dashboard scoped to{" "}
          <code>service:payments-service</code> template-variable, top row showing the four golden
          signals as timeseries, a request-rate-by-provider breakdown to isolate a single
          provider&apos;s outage, and a trace-latency widget linking straight into APM&apos;s
          service map — built so the first 10 seconds of an incident answer &quot;is this us or a
          provider.&quot;
        </p>
        <CodeBlock
          code={`{
  "name": "Payments authorization success rate",
  "type": "metric",
  "description": "Percentage of payment authorization attempts that succeed",
  "query": {
    "numerator": "sum:payments.authorize{service:payments-service,outcome:success}.as_count()",
    "denominator": "sum:payments.authorize{service:payments-service}.as_count()"
  },
  "thresholds": [
    { "timeframe": "30d", "target": 99.95, "warning": 99.97 }
  ],
  "tags": ["service:payments-service", "team:payments"]
}`}
          lang="json"
          filename="payments-slo.json"
        />
        <p>
          <strong>3. SLO and burn-rate alerts.</strong> A metric-based SLO, 30-day rolling window,
          99.95% target (stricter than the 99.9% example earlier, because a failed payment
          authorization is direct revenue loss, not just a slow page). Fast-burn: burn rate{" "}
          <code>14.4</code>, <code>long_window(&quot;1h&quot;)</code>,{" "}
          <code>short_window(&quot;5m&quot;)</code> — pages the on-call payments engineer
          immediately, since a fast burn here means live transactions are failing right now.
          Slow-burn: burn rate <code>3</code>, <code>long_window(&quot;24h&quot;)</code>,{" "}
          <code>short_window(&quot;120m&quot;)</code> — files a ticket for a slow degradation, such
          as a provider whose success rate has quietly drifted from 99.9% to 99.7%.
        </p>
        <p>
          <strong>4. Log and trace strategy.</strong> Index every log tagged{" "}
          <code>status:error</code> and every log carrying a <code>trace_id</code> at DEBUG or
          above with 15-day retention (enough to correlate against an incident, not enough to pay
          for logs nobody queries after two weeks). Add an exclusion filter sampling routine{" "}
          <code>status:info</code> health-check and heartbeat logs down to 5% — they still flow to
          Live Tail and can back a &quot;heartbeat received&quot; log-based metric, but the raw
          text is not worth indexing at 100%. For APM, keep ingestion sampling high (trace-derived
          metrics need full traffic to be trustworthy) but set a retention filter that indexes 100%
          of error traces, all traces above the p95 latency threshold, and a 10% baseline sample of
          everything else.
        </p>
        <p>
          <strong>5. Cost budget and levers.</strong> Custom metrics: cap the budget by explicitly
          NOT tagging <code>payments.authorize</code> by <code>user_id</code> or transaction ID —
          tag by <code>provider</code>, <code>outcome</code>, and <code>region</code> only, and put
          Metrics without Limits on any DogStatsD metric a developer adds later so ingestion never
          silently costs indexing dollars. Indexed logs: the exclusion-filter sampling above keeps
          the indexed volume proportional to what&apos;s actually diagnostic, not proportional to
          raw request volume. APM: the retention filter keeps indexed spans bounded even as total
          traffic grows 10x, because &quot;100% of errors plus a fixed 10% baseline&quot; scales
          sub-linearly with traffic while &quot;index everything&quot; scales linearly and blows
          the budget on schedule. Finally, put a usage monitor on this service&apos;s own custom
          metric and indexed-log volume in Datadog&apos;s Usage Metrics, so the team gets paged by
          its own bill before finance does.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A metric query is always two layers of aggregation — space (the leading avg/sum/min/max
          combining series via the <code>by</code> clause) and time (the <code>.rollup()</code>{" "}
          bucketing) — plus whatever functions run after both.
        </li>
        <li>
          <code>as_count()</code> and <code>as_rate()</code> both force a <code>sum</code> time
          aggregator, but only <code>as_rate()</code> normalizes per second — mixing them up in a
          monitor threshold is a classic false-alarm bug.
        </li>
        <li>
          SLOs turn &quot;be reliable&quot; into a spendable error budget; burn rate measures how
          fast that budget is being spent relative to the SLO&apos;s window.
        </li>
        <li>
          Multi-window, multi-burn-rate alerting — a fast-burn pager alert plus a slow-burn ticket
          alert on the same SLO — is the modern standard for SLO-based paging, not a single
          threshold on the SLI itself.
        </li>
        <li>
          Watchdog and Incident Management are the two sides of the unknown-unknowns coin: Watchdog
          catches what nobody instrumented for, and Incident Management gives the team a repeatable
          process once something is caught.
        </li>
        <li>
          Cost control is a tagging and sampling discipline, not a finance-team problem — Metrics
          without Limits, log exclusion filters, and APM retention filters are the specific levers
          that keep ingestion cheap while indexing stays proportional to actual value.
        </li>
      </ul>
    </div>
  );
}
