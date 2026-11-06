import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const monitorStateMachine = String.raw`stateDiagram-v2
    [*] --> OK
    state "No Data" as NoData

    OK --> Warn: warning threshold breached
    OK --> Alert: alert threshold breached
    Warn --> Alert: still breaching, escalates
    Warn --> OK: recovers below warning recovery threshold
    Alert --> Warn: drops back into warning band
    Alert --> OK: recovers below alert recovery threshold

    OK --> NoData: query returns empty
    Warn --> NoData: query returns empty
    Alert --> NoData: query returns empty
    NoData --> OK: data resumes, in range
    NoData --> Alert: data resumes, still breaching
    NoData --> NoData: still missing (per on-missing-data setting)`;

const evaluationWindowDiagram = String.raw`flowchart LR
    P1["Point t-4m"] --> AGG["Aggregate over\nevaluation window\n(e.g. last_5m)"]
    P2["Point t-3m"] --> AGG
    P3["Point t-2m"] --> AGG
    P4["Point t-1m"] --> AGG
    P5["Point t (now)"] --> AGG
    AGG -->|"avg / max / min / sum"| VAL["Single reduced value"]
    VAL --> CMP{"Compare to alert\nand warning thresholds"}
    CMP -->|"breaches alert"| ALERT["Status: Alert"]
    CMP -->|"breaches warning only"| WARN["Status: Warn"]
    CMP -->|"within bounds"| OK["Status: OK"]`;

const notificationRoutingDiagram = String.raw`flowchart TD
    EVAL["Monitor evaluates query\n(every ~1 minute)"] --> CHANGED{"Status changed\nsince last evaluation?"}
    CHANGED -->|"No"| WAIT["No notification sent"]
    CHANGED -->|"Yes"| GROUP["Group by tag\n(multi alert splits per entity)"]
    GROUP --> RENDER["Render message template\n(fill in variables)"]
    RENDER --> COND{"Which conditional\nblock matches state?"}
    COND -->|"is_alert"| ALERTMSG["Alert block + @handles"]
    COND -->|"is_warning"| WARNMSG["Warning block + @handles"]
    COND -->|"is_recovery"| RECMSG["Recovery block + @handles"]
    ALERTMSG --> ROUTE{"@-handle target"}
    ROUTE -->|"@slack-channel"| SLACK["Slack"]
    ROUTE -->|"@pagerduty-Service"| PD["PagerDuty"]
    ROUTE -->|"@user@company.com"| EMAIL["Email"]
    ROUTE -->|"@webhook-name"| HOOK["Webhook"]
    PD --> STILLUP{"Still unresolved after\nrenotify_interval?"}
    STILLUP -->|"Yes"| ESCALATE["is_renotify block\nescalation message"]
    STILLUP -->|"No, recovered"| DONE["Recovery message sent"]`;

const multiAlertDiagram = String.raw`flowchart TD
    Q["avg(last_5m):avg:trace.http.request.duration\n{service:checkout} by {host} > 2"]
    Q --> SPLIT{"Grouped by {host}\n(multi alert)"}
    SPLIT --> H1["host:checkout-01 -> OK"]
    SPLIT --> H2["host:checkout-02 -> Alert"]
    SPLIT --> H3["host:checkout-03 -> OK"]
    SPLIT --> H4["host:checkout-04 -> Alert"]
    H2 --> N1["Separate notification: checkout-02"]
    H4 --> N2["Separate notification: checkout-04"]
    H1 -.->|"no threshold breach"| NONE1["No notification"]
    H3 -.->|"no threshold breach"| NONE2["No notification"]`;

export const toc: TocItem[] = [
  { id: "why-monitors-matter", title: "Why Monitors Matter", level: 2 },
  { id: "monitor-anatomy", title: "Anatomy of a Monitor", level: 2 },
  { id: "the-query", title: "The Query", level: 3 },
  { id: "thresholds-and-recovery", title: "Alert, Warning & Recovery Thresholds", level: 3 },
  { id: "the-notification-message", title: "The Notification Message", level: 3 },
  { id: "monitor-state-machine", title: "Monitor State Machine", level: 2 },
  { id: "evaluation-semantics", title: "Evaluation Semantics", level: 2 },
  { id: "aggregation-and-alert-conditions", title: "Aggregation & Alert Conditions", level: 3 },
  {
    id: "full-window-and-evaluation-delay",
    title: "Full Window, Evaluation Delay & New Group Delay",
    level: 3,
  },
  { id: "no-data-behavior", title: "The No Data Trap", level: 3 },
  { id: "monitor-types", title: "Monitor Types", level: 2 },
  { id: "anomaly-vs-outlier-vs-forecast", title: "Anomaly vs Outlier vs Forecast", level: 3 },
  { id: "multi-alert-and-grouping", title: "Multi Alert & Grouping", level: 2 },
  { id: "notifications-and-routing", title: "Notifications & Routing", level: 2 },
  { id: "template-variables", title: "Template Variables & Conditional Messages", level: 3 },
  { id: "renotify-and-escalation", title: "Renotify & Escalation", level: 3 },
  { id: "downtimes-and-muting", title: "Downtimes & Muting", level: 2 },
  { id: "alert-fatigue", title: "Alert Fatigue & Good Alerting", level: 2 },
  { id: "monitors-as-code", title: "Monitors as Code", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "checkout-challenge", title: "Challenge: Alerting for a Checkout Service", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function MonitorsAndAlerting() {
  return (
    <div className="article-content">
      <p>
        A dashboard tells you something is wrong only if a human happens to be looking at it. A{" "}
        <strong>monitor</strong> is the thing that looks at the graph for you, 24/7, and tells the
        right person the moment a query crosses a line you defined in advance. Everything else in
        Datadog — metrics, logs, traces, tags — exists so that monitors have good signal to alert
        on. Get monitors wrong and you get one of two failure modes senior engineers dread
        equally: silence during a real outage, or so much noise that the on-call engineer starts
        muting Slack. This module builds the complete mental model — query, thresholds, evaluation
        window, grouping, notification routing, and muting — so you can design alerting that pages
        the right person, only when it matters.
      </p>

      <h2 id="why-monitors-matter">Why Monitors Matter</h2>
      <p>
        Observability data (metrics, logs, traces) is only useful if someone or something acts on
        it. Monitors are Datadog&apos;s alerting primitive: each one runs a query on a schedule,
        reduces the result to a single comparable value, and compares it against thresholds you
        configure. When the comparison crosses a line, the monitor changes state and — if you have
        configured notifications — sends a message to a person, a channel, or an incident tool.
      </p>
      <p>
        Every other Datadog surface (dashboards, SLOs, Watchdog, downtimes) either feeds monitors,
        consumes monitors, or exists to reduce how many monitors you need to hand-configure. If you
        understand monitors deeply, the rest of Datadog&apos;s alerting story falls into place
        quickly.
      </p>

      <h2 id="monitor-anatomy">Anatomy of a Monitor</h2>
      <p>
        Every monitor, regardless of type, is built from the same five pieces: a{" "}
        <strong>query</strong>, an <strong>alert threshold</strong> (and optionally a{" "}
        <strong>warning threshold</strong>), an <strong>evaluation window</strong> with an{" "}
        <strong>aggregation</strong> method, optional <strong>recovery thresholds</strong>, and a{" "}
        <strong>notification message</strong>. Knowing these five pieces cold is the difference
        between reading a monitor config fluently and squinting at it in confusion during an
        incident review.
      </p>

      <h3 id="the-query">The Query</h3>
      <p>
        The query defines <em>what</em> Datadog measures. For a metric monitor, it looks like a
        dashboard query with a comparison operator appended:
      </p>
      <CodeBlock
        code={`avg(last_5m):avg:trace.http.request.duration{service:checkout,env:prod} by {host} > 2`}
        lang="text"
        filename="monitor-query.txt"
      />
      <p>
        Reading it left to right: <code>avg(last_5m)</code> is the evaluation window and how
        points inside it are reduced to one value; <code>avg:trace.http.request.duration{"{...}"}</code>{" "}
        is the metric and scope filter; <code>by {"{host}"}</code> groups results so each host gets
        its own evaluation (this is what makes it a <strong>multi alert</strong>); and{" "}
        <code>{"> 2"}</code> is the comparison against the alert threshold. The comparison embedded
        in the query string is always the <strong>critical/alert</strong> threshold — warning and
        recovery thresholds are configured as separate monitor options, not encoded in the query
        text itself.
      </p>

      <h3 id="thresholds-and-recovery">Alert, Warning & Recovery Thresholds</h3>
      <p>
        Datadog exposes four distinct threshold values. Only the alert threshold is required — the
        rest are optional refinements that most beginners skip and most senior engineers use to
        kill flapping.
      </p>
      <ArticleTable
        caption="Recovery thresholds exist specifically to prevent a monitor from flapping OK / Alert / OK when a metric hovers right at the line."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Threshold</th>
              <th>Required</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alert threshold</td>
              <td>Yes</td>
              <td>The value that triggers the ALERT (critical) status.</td>
            </tr>
            <tr>
              <td>Warning threshold</td>
              <td>No</td>
              <td>The value that triggers the WARN status, a step before ALERT.</td>
            </tr>
            <tr>
              <td>Alert recovery threshold</td>
              <td>No</td>
              <td>
                An additional, usually looser, condition the metric must satisfy before the
                monitor drops out of ALERT. Without it, the monitor simply recovers once the
                metric crosses back over the alert threshold.
              </td>
            </tr>
            <tr>
              <td>Warning recovery threshold</td>
              <td>No</td>
              <td>Same idea as above, but for leaving the WARN status.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Example: alert threshold <code>{"> 3"}</code>, no recovery threshold specified — the
        monitor recovers to OK the instant the value drops back to <code>3</code> or below.
        Set an alert recovery threshold of <code>2</code> instead, and the metric has to drop
        meaningfully below the alert line — to <code>2</code> or lower — before the monitor
        recovers, which absorbs noise right around the boundary.
      </p>

      <h3 id="the-notification-message">The Notification Message</h3>
      <p>
        The message field is Markdown plus Datadog&apos;s template language. It supports plain
        variables that get substituted with real values (<code>{"{{value}}"}</code>,{" "}
        <code>{"{{host.name}}"}</code>) and conditional blocks that render different text depending
        on monitor state (<code>{"{{#is_alert}}"}</code>…<code>{"{{/is_alert}}"}</code>). Anything{" "}
        <em>outside</em> a conditional block is sent on every state transition; anything{" "}
        <em>inside</em> one is sent only when that condition is true. Getting this backwards is a
        common cause of on-call engineers receiving a PagerDuty page with no actual context.
      </p>

      <h2 id="monitor-state-machine">Monitor State Machine</h2>
      <p>
        Every monitor (or every group, for a multi alert) is always in exactly one of four states:
        OK, WARN, ALERT, or NO DATA. Understanding the legal transitions between them explains
        almost every &quot;why did I get paged twice&quot; question you will ever debug.
      </p>
      <MermaidDiagram
        chart={monitorStateMachine}
        title="Monitor Status Transitions"
        caption="Recovery thresholds control the Alert/Warn to OK edges; the on-missing-data setting controls every edge into and out of No Data."
        minHeight={420}
      />

      <h2 id="evaluation-semantics">Evaluation Semantics</h2>
      <p>
        A monitor does not look at a single data point. On every evaluation cycle (by default,
        every 1 minute for windows under 24 hours) it pulls all the raw points inside the
        evaluation window, reduces them to one number, and compares that number to the thresholds.
      </p>
      <MermaidDiagram
        chart={evaluationWindowDiagram}
        title="From Raw Points to a Status"
        caption="The aggregation method decides how five raw points become one number — this single decision changes what &quot;crossing the threshold&quot; actually means."
        minHeight={340}
      />

      <h3 id="aggregation-and-alert-conditions">Aggregation & Alert Conditions</h3>
      <p>
        The evaluation window can be a <strong>rolling</strong> window (last 5 minutes, last 1
        hour, up to 1 month for metric monitors) or a <strong>cumulative</strong> window that
        resets on a schedule (current hour, current day, current month — useful for things like a
        daily log-indexing quota). Whichever window you pick, Datadog needs one reducer function to
        turn the series into a single comparable value:
      </p>
      <ArticleTable
        caption="These four aggregation options are exactly what engineers mean when they say &quot;alert on average&quot; vs &quot;alert at least once&quot; vs &quot;alert at all times&quot; vs &quot;alert in total&quot; — the docs call them average / max / min / sum, but the plain-English framing is how most teams actually talk about them."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Aggregation</th>
              <th>Plain-English condition</th>
              <th>Behavior (alerting above a threshold)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>average</code>
              </td>
              <td>&quot;on average&quot;</td>
              <td>The window is averaged into one value, then compared. Smooths spikes.</td>
            </tr>
            <tr>
              <td>
                <code>max</code>
              </td>
              <td>&quot;at least once&quot;</td>
              <td>Alerts if any single point in the window crossed the threshold.</td>
            </tr>
            <tr>
              <td>
                <code>min</code>
              </td>
              <td>&quot;at all times&quot;</td>
              <td>Alerts only if every point in the window crossed the threshold.</td>
            </tr>
            <tr>
              <td>
                <code>sum</code>
              </td>
              <td>&quot;in total&quot;</td>
              <td>Sums every point in the window, then compares the total to the threshold.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Note:</strong> for monitors that alert when the metric goes <em>below</em> a
        threshold, the max/min behavior is reversed — <code>min</code> becomes &quot;at least once
        below&quot; and <code>max</code> becomes &quot;at all times below.&quot; Always sanity-check
        the direction, not just the aggregation name.
      </p>

      <h3 id="full-window-and-evaluation-delay">
        Full Window, Evaluation Delay & New Group Delay
      </h3>
      <p>
        Three advanced options quietly control how trustworthy your monitor is, and all three are
        commonly misconfigured:
      </p>
      <ul>
        <li>
          <strong>Require full window</strong> — off by default. When enabled, the monitor will not
          evaluate at all until the evaluation window is considered &quot;filled&quot; with data
          (the window is split into buckets; at least the earliest bucket must have data and no
          more than three buckets total may be empty). Use this for sparse or infrequent metrics
          where you specifically want to know if data stopped arriving over the <em>whole</em>{" "}
          window, not just be evaluated on a single stray point.
        </li>
        <li>
          <strong>Evaluation delay</strong> — pushes the evaluation window back in time by N
          seconds so slow-to-arrive metrics have time to land before the monitor evaluates. Datadog
          recommends at least a 900-second (15-minute) delay for AWS CloudWatch and other
          backfilled cloud metrics — without it, you get false ALERT-then-recover flapping every
          time CloudWatch is a few minutes behind.
        </li>
        <li>
          <strong>New group delay</strong> — defaults to 60 seconds. Delays evaluation for a{" "}
          <em>newly seen</em> group (for example a container that just started) so it has time to
          boot before its resource usage is judged. Without it, autoscaled containers can trip a
          CPU or latency monitor purely because they have not finished starting up yet.
        </li>
      </ul>

      <h3 id="no-data-behavior">The No Data Trap</h3>
      <p>
        &quot;No data&quot; is not the same as &quot;zero&quot; and Datadog does not assume it is.
        If a monitor&apos;s query returns nothing for the evaluation window, you must explicitly
        tell Datadog what that means:
      </p>
      <ArticleTable
        caption="The most dangerous default is silence: if you never configure on-missing-data, a service that stops reporting entirely can sit invisible instead of paging anyone."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Resulting status</th>
              <th>Notifies?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Evaluate as zero</td>
              <td>Empty result treated as 0, compared to thresholds normally</td>
              <td>Only if 0 breaches a threshold</td>
            </tr>
            <tr>
              <td>Show last known status</td>
              <td>Keeps whatever status the group last had</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Show NO DATA</td>
              <td>NO DATA</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Show NO DATA and notify</td>
              <td>NO DATA</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Show OK</td>
              <td>OK</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The failure mode to remember: a monitor cannot notify on missing data for a service that
        was <em>never</em> reporting in the first place — Datadog needs at least one successful
        evaluation with data before &quot;stopped reporting&quot; means anything. For a brand-new
        service, pair a data-driven monitor with a simple heartbeat check instead of relying on
        no-data detection alone.
      </p>

      <h2 id="monitor-types">Monitor Types</h2>
      <p>
        &quot;Metric monitor&quot; is the default mental model most engineers reach for, but
        Datadog ships a dedicated monitor type for almost every data source it collects. Picking
        the right type means less query gymnastics and better default alert conditions.
      </p>
      <ArticleTable
        caption="Every monitor type reduces to the same anatomy (query, thresholds, window, message) — what changes is what data source it reads and what &quot;detection method&quot; options it exposes."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Monitor type</th>
              <th>What it detects</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Metric</strong>
              </td>
              <td>
                Any metric crossing a threshold. Detection methods: threshold, change (%
                or absolute delta over N minutes), anomaly, outlier, forecast.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Log</strong>
              </td>
              <td>
                Count (or faceted aggregate) of indexed logs matching a search query over a window,
                up to a 2-day rolling window maximum.
              </td>
            </tr>
            <tr>
              <td>
                <strong>APM</strong>
              </td>
              <td>
                Service-level hits, error rate, and latency percentiles from trace metrics
                (works like a metric monitor with APM-specific controls); Analytics monitors alert
                on indexed spans directly (trace analytics).
              </td>
            </tr>
            <tr>
              <td>
                <strong>Live Process</strong>
              </td>
              <td>Whether one or more expected processes are running on a host.</td>
            </tr>
            <tr>
              <td>
                <strong>Network</strong>
              </td>
              <td>
                TCP, HTTP, or SSL check status against an endpoint — per-check alerts or a
                cluster-wide percentage-failing alert.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Integration</strong>
              </td>
              <td>
                Health/service-check status reported by an installed integration (for example
                Postgres connection failures).
              </td>
            </tr>
            <tr>
              <td>
                <strong>Composite</strong>
              </td>
              <td>
                Boolean expression combining other monitors&apos; IDs, e.g. <code>1234 &amp;&amp; 5678</code>{" "}
                — alerts only when the combined condition is true.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Watchdog</strong>
              </td>
              <td>
                Automatic, unconfigured anomaly detection across error rate, latency, and hits for
                every APM service, using at least two weeks of history as a baseline.
              </td>
            </tr>
            <tr>
              <td>
                <strong>SLO Alert</strong>
              </td>
              <td>
                Alerts on an SLO&apos;s remaining error budget or burn rate rather than on a raw
                metric.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Event</strong>
              </td>
              <td>
                Count (or faceted aggregate) of ingested events matching a search query — deploys,
                config changes, third-party alerts. Cannot alert on monitor-generated events (would
                create a loop).
              </td>
            </tr>
            <tr>
              <td>
                <strong>Audit Trail</strong>
              </td>
              <td>Count of audit log entries of a given type exceeding a threshold.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="anomaly-vs-outlier-vs-forecast">Anomaly vs Outlier vs Forecast</h3>
      <p>
        These three &quot;smart&quot; detection methods get confused constantly because they all
        sound like &quot;machine learning finds the weird thing.&quot; They answer genuinely
        different questions, and picking the wrong one either misses real problems or floods you
        with false positives.
      </p>
      <ul>
        <li>
          <strong>Anomaly</strong> asks: <em>is this metric behaving differently than its own
          past?</em> It builds an expected range from historical trend, day-of-week, and
          time-of-day seasonality, then alerts when the live value falls outside that band for a
          configured percentage of the trigger window. Best for metrics with strong recurring
          patterns — traffic that is naturally low at 3am but should not be low at 3pm.
        </li>
        <li>
          <strong>Outlier</strong> asks: <em>is one member of a group behaving differently than its
          peers, right now?</em> It requires a metric grouped by something with three or more
          uniform members (hosts, availability zones, pods) and uses a clustering algorithm
          (DBSCAN by default, or MAD) to find the member that has diverged from the pack. There is
          no historical baseline involved — it is a peer comparison at a single point in time.
        </li>
        <li>
          <strong>Forecast</strong> asks: <em>will this metric cross a threshold in the future if
          the current trend continues?</em> It projects the series forward and its confidence
          bounds, then alerts when the projected bound would cross your threshold — giving you lead
          time (e.g. &quot;disk fills up in 6 days&quot;) instead of an alert only once the disk is
          already full.
        </li>
      </ul>

      <h2 id="multi-alert-and-grouping">Multi Alert & Grouping</h2>
      <p>
        Add a <code>by {"{tag}"}</code> clause to a query and Datadog evaluates the query{" "}
        <em>separately for every value of that tag</em> — this is a <strong>multi alert</strong>.
        Instead of one giant &quot;something, somewhere is slow&quot; monitor, you get one
        independent alert per host, per service, per pod.
      </p>
      <MermaidDiagram
        chart={multiAlertDiagram}
        title="One Query, Grouped Into Per-Entity Alerts"
        caption="Only the groups that actually breach the threshold notify — the other groups stay OK silently, which is exactly what keeps a multi alert from becoming spam."
        minHeight={360}
      />
      <p>
        The double-edged sword: grouping by a high-cardinality tag (host, pod) on a monitor that
        watches hundreds of entities produces hundreds of independent notification streams during a
        cluster-wide event — the classic &quot;500 pages in 5 minutes&quot; incident. Datadog&apos;s
        fix is <strong>notification grouping</strong>: keep the query grouped by{" "}
        <code>{"{service, host}"}</code> for troubleshooting granularity, but restrict which
        dimensions actually <em>trigger</em> a notification (for example, notify per{" "}
        <code>service</code> only, not per <code>service</code> + <code>host</code>). The
        non-notifying dimensions become sub-groups you can still drill into from the alert.
      </p>

      <h2 id="notifications-and-routing">Notifications & Routing</h2>
      <p>
        A state change alone does nothing until it is routed to a human or a system. Datadog routes
        notifications through <strong>@-handles</strong> written directly in the message body —
        Slack channels, PagerDuty services, email addresses, webhooks, Jira, ServiceNow, Teams, or
        a Datadog Team handle.
      </p>
      <MermaidDiagram
        chart={notificationRoutingDiagram}
        title="From State Change to a Page"
        caption="Everything above the @-handle routing step is Datadog logic; everything at or below it depends entirely on how you wrote the message template."
        minHeight={560}
      />

      <h3 id="template-variables">Template Variables & Conditional Messages</h3>
      <p>
        Two kinds of variables make notification messages dynamic instead of static boilerplate:
      </p>
      <ul>
        <li>
          <strong>Attribute variables</strong> substitute real values —{" "}
          <code>{"{{value}}"}</code> for the metric value that triggered the alert,{" "}
          <code>{"{{host.name}}"}</code> or <code>{"{{host.ip}}"}</code> for tag values, and
          monitor-type-specific variables like <code>{"{{log.attributes.key}}"}</code> for a log
          monitor or <code>{"{{rum.attributes.key}}"}</code> for a RUM monitor.
        </li>
        <li>
          <strong>Conditional variables</strong> show or hide a block of text based on monitor
          state: <code>{"{{#is_alert}}"}</code>, <code>{"{{#is_warning}}"}</code>,{" "}
          <code>{"{{#is_recovery}}"}</code>, and <code>{"{{#is_no_data}}"}</code>, each with a
          matching <code>{"{{/...}}"}</code> closing tag. A monitor is only ever in one state, so
          these blocks cannot be nested inside each other — but you can nest an{" "}
          <code>{"{{#is_match}}"}</code> tag-matching block inside any of them to route a subset of
          triggering entities to a different team.
        </li>
      </ul>
      <CodeBlock
        code={`{{#is_alert}}
Checkout error rate is critical: {{value}}% on {{host.name}}.

Runbook: https://runbooks.internal/checkout-error-rate
@pagerduty-Checkout @slack-checkout-incidents
{{/is_alert}}

{{#is_warning}}
Checkout error rate is elevated: {{value}}%. Watching, no page yet.
@slack-checkout-eng
{{/is_warning}}

{{#is_recovery}}
Checkout error rate recovered: {{value}}%.
@slack-checkout-incidents
{{/is_recovery}}

{{#is_match "host.role.name" "db"}}
This host also serves the checkout DB tier — check replication lag too.
@db-oncall@company.com
{{/is_match}}`}
        lang="text"
        filename="checkout-monitor-message.txt"
      />

      <h3 id="renotify-and-escalation">Renotify & Escalation</h3>
      <p>
        A monitor sends one notification on each state <em>transition</em> — it does not repeat
        itself just because the problem is ongoing. If a checkout outage sits in ALERT for 40
        minutes and nobody acknowledges it, silence is the default. <strong>Renotify</strong>{" "}
        (<code>renotify_interval</code>, in minutes) fixes this by re-sending the message on a
        schedule while the monitor remains unresolved, and{" "}
        <code>{"{{#is_renotify}}"}</code> lets the re-sent message say something different from the
        first page — typically a shorter, more urgent escalation instead of the full original
        context.
      </p>

      <h2 id="downtimes-and-muting">Downtimes & Muting</h2>
      <p>
        A <strong>downtime</strong> silences notifications for a monitor (or a scope of monitors)
        without disabling evaluation — the monitor keeps running and its status keeps changing, it
        simply does not notify anyone while the downtime is active. This distinction matters: after
        the downtime ends, the monitor&apos;s history and status are exactly what they would have
        been anyway, so nothing is &quot;lost,&quot; only the paging is suppressed.
      </p>
      <ul>
        <li>
          <strong>One-time (ad-hoc) downtimes</strong> — mute now, or schedule a start/end window,
          typically wrapped around a planned deploy or maintenance operation.
        </li>
        <li>
          <strong>Recurring downtimes</strong> — defined with an RRULE (start time, repeat
          frequency, duration), useful for a weekly maintenance window or muting a batch job&apos;s
          expected resource spike every night.
        </li>
        <li>
          <strong>Downtime scope</strong> — beyond picking specific monitors, a group scope (e.g.{" "}
          <code>{"service:checkout"}</code>) mutes only the matching groups of a multi alert,
          leaving every other service&apos;s notifications flowing normally. This is the standard
          pattern for &quot;mute this one service during its deploy without going deaf to
          everything else.&quot;
        </li>
      </ul>

      <h2 id="alert-fatigue">Alert Fatigue & Good Alerting</h2>
      <p>
        The single biggest predictor of whether an on-call rotation actually works is whether
        people trust their pages. Once an engineer has been paged twice for something that
        self-resolved in 90 seconds, they start treating every page as probably-nothing — and that
        is exactly the mental state you do not want them in during a real outage.
      </p>
      <p>
        The highest-leverage fix is architectural, not tuning: prefer{" "}
        <strong>symptom-based</strong> alerts (is the user-facing behavior broken — error rate,
        latency, an SLO burning its error budget) over <strong>cause-based</strong> alerts (is CPU
        at 80%, is a specific pod restarting). Cause-based signals are excellent for{" "}
        <em>diagnosis</em> once you are already investigating, but they make poor page triggers
        because a system can run a cause-level metric hot for hours with zero user impact.
        Multi-window, multi-burn-rate SLO alerting takes this further by pairing a fast/short window
        (catches fast burns quickly) with a slow/long window (filters out noise) — that pattern gets
        a full treatment in the SLO module, but the seed of it is right here: alert on the thing the
        user experiences, not the thing that happens to precede it.
      </p>
      <InterviewPlaybook
        title="How do you prevent alert fatigue?"
        intro="A strong answer names the architectural fix first, then the tuning knobs, then how you would prove it worked."
        steps={[
          "Lead with symptom-based over cause-based: page on SLO burn / error rate / latency the user feels, not every underlying resource metric.",
          "Use recovery thresholds and a require-full-window or evaluation-delay setting to stop flapping right at the threshold line, instead of tightening the threshold itself and losing sensitivity.",
          "Restrict multi-alert notification grouping to the dimension that matters (service) instead of every dimension (service + host + pod), so one incident produces one page, not fifty.",
          "Prefer a composite monitor (error rate AND latency both degraded) over two separate pages for what is really one incident.",
          "Route by severity: warning-level goes to a Slack channel for visibility, only alert-level pages PagerDuty, and renotify/escalate if it stays unresolved.",
          "Close the loop: track pages that were acknowledged with no action taken and either delete, retune, or downgrade those monitors — a monitor nobody ever acts on is actively harmful.",
        ]}
      />

      <h2 id="monitors-as-code">Monitors as Code</h2>
      <p>
        Click-configuring monitors does not scale past a handful of services, and it leaves no
        review trail. Both the Terraform provider and the raw API expose every option covered
        above as plain fields, which means monitors can be code-reviewed, versioned, and rolled
        out consistently across services.
      </p>
      <CodeBlock
        code={`resource "datadog_monitor" "checkout_error_rate" {
  name    = "[checkout] error rate above SLO burn threshold"
  type    = "metric alert"
  message = <<-EOT
    {{#is_alert}}
    Checkout error rate is critical: {{value}}%.
    Runbook: https://runbooks.internal/checkout-error-rate
    @pagerduty-Checkout
    {{/is_alert}}

    {{#is_warning}}
    Checkout error rate is elevated: {{value}}%.
    @slack-checkout-eng
    {{/is_warning}}

    {{#is_recovery}}
    Checkout error rate recovered.
    @slack-checkout-incidents
    {{/is_recovery}}
  EOT

  escalation_message = "Still unresolved — escalating. @pagerduty-Checkout-Escalation"

  query = "avg(last_5m):avg:trace.http.request.error_rate{service:checkout,env:prod} by {service} > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  notify_no_data   = true
  no_data_timeframe = 10
  evaluation_delay  = 60
  require_full_window = false

  renotify_interval  = 30
  renotify_statuses  = ["alert"]

  notify_by = ["service"]

  tags = ["service:checkout", "team:payments", "env:prod"]
}`}
        lang="hcl"
        filename="checkout_monitor.tf"
      />
      <p>
        The same monitor as a raw API call — useful when a CI pipeline or an internal tool manages
        monitors without going through Terraform:
      </p>
      <CodeBlock
        code={`curl -X POST "https://api.datadoghq.com/api/v1/monitor" \\
  -H "DD-API-KEY: \${DD_API_KEY}" \\
  -H "DD-APPLICATION-KEY: \${DD_APP_KEY}" \\
  -H "Content-Type: application/json" \\
  -d @checkout-monitor.json`}
        lang="bash"
        filename="create-monitor.sh"
      />
      <CodeBlock
        code={`{
  "name": "[checkout] error rate above SLO burn threshold",
  "type": "metric alert",
  "query": "avg(last_5m):avg:trace.http.request.error_rate{service:checkout,env:prod} by {service} > 5",
  "message": "{{#is_alert}}Checkout error rate critical: {{value}}%. @pagerduty-Checkout{{/is_alert}}",
  "tags": ["service:checkout", "team:payments", "env:prod"],
  "options": {
    "thresholds": { "critical": 5, "warning": 2 },
    "notify_no_data": true,
    "no_data_timeframe": 10,
    "evaluation_delay": 60,
    "require_full_window": false,
    "renotify_interval": 30,
    "renotify_statuses": ["alert"],
    "notify_by": ["service"]
  }
}`}
        lang="json"
        filename="checkout-monitor.json"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="Anomaly vs outlier vs forecast — when do you reach for each?"
        intro="Interviewers use this question to check whether you understand what data each algorithm actually compares against — past-self, peers, or a projected future — not just that all three are &quot;smart alerts.&quot;"
        steps={[
          "Anomaly compares a metric against its own history and seasonality — use it for traffic, throughput, or latency that has a normal daily/weekly rhythm and where a static threshold would either miss night-time issues or false-alarm every morning rush.",
          "Outlier compares members of a group against each other right now, with no history required — use it when you have a fleet of interchangeable things (hosts, pods, shards) and want to catch the one that diverged, even if the whole fleet is trending up together.",
          "Forecast projects the current trend forward and alerts on a predicted future breach — use it for anything that fills up or drains down gradually (disk space, connection pool exhaustion, quota consumption) where you want lead time to act, not just a reactive alert once the resource is already exhausted.",
          "Name the shared risk: all three need enough clean historical data (anomaly and forecast especially) or enough uniform peers (outlier) to be reliable — a service two days old or a group of one will produce noisy or meaningless results from any of them.",
          "Close with the fallback: when you do not have the history or peer group these need, a well-tuned static threshold with a sane evaluation window beats a misconfigured smart monitor every time.",
        ]}
      />

      <h2 id="checkout-challenge">Challenge: Alerting for a Checkout Service</h2>
      <InterviewChallenge
        title="Design the alerting strategy for a checkout service"
        scenario={
          <>
            You own alerting for <code>checkout</code>, a payments-critical service that runs as a
            multi-instance deployment behind a load balancer, calls out to a third-party payment
            processor, and writes to a Postgres database. The service currently has zero monitors.
            Leadership wants confidence that a real checkout outage pages someone within minutes,
            without burning out the on-call rotation with noise from routine autoscaling, single
            slow requests, or a single instance restart.
          </>
        }
        tasks={[
          "Decide which monitor types you would create (metric, APM, log, composite, SLO alert, anomaly) and what each one specifically watches.",
          "For your primary error-rate and latency monitors, choose the aggregation (average/max/min/sum), evaluation window, and justify why a recovery threshold is or is not needed.",
          "Decide the grouping strategy: what would you group by in the query, and what would you restrict notification grouping to, so one real incident does not produce dozens of separate pages.",
          "Design the routing: what goes to Slack only, what pages PagerDuty, and how renotify/escalation behaves if it stays unresolved.",
          "Explain how you would avoid paging on noise: new instances booting during autoscaling, a single transient timeout to the payment processor, and a planned deploy.",
        ]}
        pitfalls={[
          "Grouping a fleet-wide monitor by host without restricting notification grouping — one bad deploy across 40 instances becomes 40 pages instead of 1.",
          "Alerting on CPU or memory (cause-based) as the primary page instead of checkout error rate or latency (symptom-based) — the service can run hot for hours with zero customer impact.",
          "Forgetting a downtime around deploys, so every rolling restart pages on-call for expected, momentary error blips.",
          "Using max() aggregation on a noisy metric with a short window — a single slow request pages the whole team even though nothing is actually broken.",
        ]}
        signal="A strong answer leads with symptom-based monitors (error rate, latency, SLO burn), uses a composite monitor to require both error rate AND latency to be bad before paging, restricts multi-alert notification grouping to service-level, routes WARN to Slack and ALERT to PagerDuty with renotify on unresolved criticals, and pairs the deploy pipeline with an automatic downtime instead of expecting humans to remember to mute manually."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Monitors to create:</strong>
        </p>
        <ul>
          <li>
            <strong>APM metric monitor</strong> on <code>trace.http.request.error_rate</code>{" "}
            scoped to <code>service:checkout</code>, grouped <code>by {"{service}"}</code>,
            average aggregation over <code>last_5m</code>, alert threshold ~5%, warning ~2%. This
            is the primary symptom-based signal.
          </li>
          <li>
            <strong>APM latency monitor</strong> on p95 or p99 latency for the same service,
            same window, alert threshold set from historical baseline plus headroom, not an
            arbitrary round number.
          </li>
          <li>
            <strong>Composite monitor</strong> combining the error-rate and latency monitor IDs
            with <code>&amp;&amp;</code> for the PagerDuty page — requiring both signals to be bad
            filters out the case where latency alone blips from one slow query.
          </li>
          <li>
            <strong>Log monitor</strong> on payment-processor failure logs (
            <code>status:error service:checkout source:payment-processor</code>) with a{" "}
            <code>below 1</code> no-logs-at-all condition as a secondary heartbeat-style check —
            catches the case where the processor integration goes fully silent rather than
            erroring loudly.
          </li>
          <li>
            <strong>SLO alert</strong> on a checkout-availability SLO for the leadership-facing
            &quot;are we meeting our reliability target&quot; signal, separate from the
            operational pages above.
          </li>
          <li>
            <strong>Anomaly monitor</strong> on checkout request volume (hits) to catch a silent
            traffic drop — for example a broken client-side integration that stops calling
            checkout entirely, which a threshold-based error-rate monitor would never see because
            there is no traffic to error on.
          </li>
        </ul>
        <p>
          <strong>Grouping:</strong> query grouped by <code>{"{service, host}"}</code> for
          drill-down visibility, but <code>notify_by</code> restricted to{" "}
          <code>{"[\"service\"]"}</code> — one notification per service breach, not one per
          instance. This is what turns a 40-instance rolling failure into 1 page instead of 40.
        </p>
        <p>
          <strong>Routing:</strong> WARN state routes to a{" "}
          <code>@slack-checkout-eng</code> channel only, for visibility without interrupting
          anyone. ALERT state on the composite monitor routes to{" "}
          <code>@pagerduty-Checkout</code>, with <code>renotify_interval</code> set (e.g. 30
          minutes) and <code>renotify_statuses = [&quot;alert&quot;]</code> so an unresolved
          critical escalates instead of paging once and going silent for hours.
        </p>
        <p>
          <strong>Avoiding noise:</strong> a <code>new_group_delay</code> of 60+ seconds absorbs
          instances still booting during autoscale events; the error-rate monitor&apos;s{" "}
          <code>average</code> aggregation over a 5-minute window absorbs a single transient
          timeout without alerting on it; and deploys trigger an automatic, scoped downtime (
          <code>service:checkout</code>) created by the deploy pipeline itself for the duration of
          the rollout, rather than relying on a human to remember to mute manually.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Every monitor reduces to the same five parts: query, alert/warning thresholds,
          evaluation window + aggregation, optional recovery thresholds, and the notification
          message — learn these once and every monitor type reads the same way.
        </li>
        <li>
          The aggregation method (average/max/min/sum) is what &quot;on average,&quot; &quot;at
          least once,&quot; &quot;at all times,&quot; and &quot;in total&quot; actually mean under
          the hood — the direction of the threshold (above vs below) can flip max/min behavior.
        </li>
        <li>
          Anomaly compares a metric to its own past and seasonality, outlier compares peers to each
          other right now, forecast projects the trend forward — pick based on what question you
          are actually asking, not which one sounds smartest.
        </li>
        <li>
          &quot;No data&quot; must be handled explicitly — the default can mean total silence for a
          service that has gone completely dark, which is the opposite of what you want from
          alerting.
        </li>
        <li>
          Grouping by a tag creates a multi alert; restricting <em>notification</em> grouping
          separately from query grouping is what prevents one incident from becoming dozens of
          pages.
        </li>
        <li>
          Alert fatigue is solved architecturally, not by tuning thresholds tighter — prefer
          symptom-based monitors, composite monitors for multi-signal confirmation, and scoped
          downtimes wired into your deploy pipeline over manual muting.
        </li>
      </ul>
    </div>
  );
}
