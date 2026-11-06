import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const spanTreeDiagram = String.raw`flowchart TD
    ROOT["Root span<br/>service: web-gateway<br/>resource: POST /checkout<br/>duration: 420ms"]
    ROOT --> CART["Span: cart-service<br/>resource: GetCart<br/>duration: 80ms"]
    ROOT --> PAY["Span: payment-service<br/>resource: ChargeCard<br/>duration: 310ms"]
    ROOT --> INV["Span: inventory-service<br/>resource: ReserveStock<br/>duration: 25ms"]
    PAY --> STRIPE["Span: payment-service<br/>resource: stripe.charge<br/>duration: 290ms<br/>ERROR: card_declined"]
    CART --> CACHE["Span: cart-service<br/>resource: redis.get<br/>duration: 4ms"]

    style STRIPE stroke:#ef4444,stroke-width:2px`;

const propagationSequence = String.raw`sequenceDiagram
    participant Client
    participant A as "Service A (web-gateway)"
    participant B as "Service B (cart-service)"
    participant C as "Service C (payment-service)"

    Client->>A: POST /checkout
    Note over A: dd-trace opens the ROOT span<br/>trace_id=8879, span_id=101
    A->>B: GET /cart
    Note over A,B: Outbound headers injected by the tracer:<br/>x-datadog-trace-id: 8879<br/>x-datadog-parent-id: 101<br/>x-datadog-sampling-priority: 1
    Note over B: dd-trace extracts the headers,<br/>opens a CHILD span_id=205, parent=101
    B-->>A: 200 OK (cart)
    A->>C: POST /charge
    Note over A,C: x-datadog-trace-id: 8879<br/>x-datadog-parent-id: 101<br/>x-datadog-sampling-priority: 1
    Note over C: child span_id=309, parent=101 —<br/>same trace_id stitches all 3 services into ONE trace
    C-->>A: 200 OK (charge)
    A-->>Client: 200 OK`;

const samplingRetentionFlow = String.raw`flowchart TD
    APP["App creates spans<br/>(every request, always)"]
    APP --> HB{"Head-based ingestion sampling<br/>decided at the ROOT span,<br/>before the outcome is known"}
    HB -->|"kept<br/>sampling_priority=1"| AGENT["Sent to Trace Agent<br/>(localhost:8126)"]
    HB -->|"dropped"| DROP["Trace body never leaves the process"]
    DROP -.->|"still counted"| RED["trace.* RED metrics<br/>(100% of traffic, always)"]
    AGENT --> INTAKE["Datadog intake"]
    INTAKE --> LIVE["Live Search<br/>100% of ingested spans, 15 min window"]
    LIVE --> RF{"Retention filters<br/>tag-based rules evaluated on the<br/>FULL trace (errors, duration, tags)"}
    RF -->|"matches a keep rule<br/>e.g. error:true OR duration>2s"| INDEX["Indexed spans<br/>stored 15 days, searchable"]
    RF -->|"no match"| EXPIRE["Expires after 15 min<br/>not indexed, not billed as indexed"]

    style RED fill:#1a1a24,stroke:#22c55e`;

const instrumentationLayers = String.raw`flowchart LR
    CODE["Application code<br/>(handlers, DB calls, HTTP clients)"]
    CODE --> LIB["dd-trace library<br/>auto-instrumentation + manual spans"]
    LIB -->|"HTTP, localhost:8126"| TA["Datadog Agent<br/>Trace Agent (APM receiver)"]
    TA -->|"batched & compressed"| INTAKE["Datadog Intake"]
    INTAKE --> UI["APM UI<br/>Service Map · Trace Explorer<br/>Flame Graphs · Profiler"]`;

export const toc: TocItem[] = [
  { id: "trace-and-span-model", title: "The Trace & Span Data Model", level: 2 },
  { id: "span-anatomy", title: "Anatomy of a Span", level: 3 },
  {
    id: "distributed-tracing-and-context-propagation",
    title: "Distributed Tracing & Context Propagation",
    level: 2,
  },
  { id: "propagation-headers", title: "What Actually Goes Over the Wire", level: 3 },
  { id: "instrumentation-auto-and-manual", title: "Instrumentation: Auto & Manual", level: 2 },
  { id: "auto-instrumentation", title: "Auto-Instrumentation", level: 3 },
  { id: "manual-spans-and-tags", title: "Manual Spans & Custom Tags", level: 3 },
  { id: "unified-service-tagging", title: "Unified Service Tagging", level: 3 },
  { id: "the-data-path", title: "The Data Path: App → Agent → Intake", level: 2 },
  {
    id: "service-catalog-and-service-map",
    title: "Service Catalog, Service Map & Trace Explorer",
    level: 2,
  },
  {
    id: "ingestion-sampling-and-retention-filters",
    title: "Ingestion Sampling & Retention Filters",
    level: 2,
  },
  { id: "head-based-vs-tail-based", title: "Head-Based vs Tail-Based, Mapped to Datadog", level: 3 },
  { id: "apm-metrics-red", title: "APM Metrics: RED, Independent of Sampling", level: 2 },
  { id: "continuous-profiler", title: "Continuous Profiler", level: 2 },
  {
    id: "correlating-logs-metrics-and-errors",
    title: "Correlating Logs, Metrics & Errors",
    level: 2,
  },
  { id: "trace-log-correlation", title: "Trace ↔ Log Correlation", level: 3 },
  { id: "error-tracking", title: "Error Tracking for APM", level: 3 },
  { id: "common-pitfalls", title: "Common Pitfalls & Failure Modes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "hands-on-challenge", title: "Hands-On Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ApmAndDistributedTracing() {
  return (
    <div className="article-content">
      <p>
        Metrics tell you <em>that</em> something is slow. Logs tell you <em>what happened</em> at
        one point. APM traces tell you <strong>where the time actually went</strong>, hop by hop,
        across every service a single request touched. That&apos;s the mental model this module
        builds: a trace is not a log line — it&apos;s a causal tree of timed work, stitched
        together across process and network boundaries by a shared identifier that every
        instrumented service agrees to pass forward. Once that stitching breaks — a queue that
        doesn&apos;t forward headers, a Lambda that drops context — you get orphaned traces and a
        blind spot exactly where you needed visibility most. This is the deepest module in the
        academy because APM is where most production incidents actually get diagnosed.
      </p>

      <h2 id="trace-and-span-model">The Trace & Span Data Model</h2>
      <p>
        A <strong>trace</strong> represents one logical request as it moves through your system —
        for example, a single <code>POST /checkout</code>. A trace is not one row of data; it is a{" "}
        <strong>tree of spans</strong> that all share the same <code>trace_id</code>. Every span
        except the first has a <code>parent_id</code> pointing at the span that caused it to
        start. The span with no parent is the <strong>root span</strong> — the entry point of the
        whole request.
      </p>

      <MermaidDiagram
        chart={spanTreeDiagram}
        title="A Trace Is a Tree of Spans"
        caption="The root span (web-gateway) fans out into child spans across three services. The stripe.charge span is a grandchild — nested inside payment-service's own ChargeCard span — and it's the one carrying the error."
        minHeight={480}
      />

      <p>
        Reading this tree top to bottom is exactly how you debug latency in production: the root
        span&apos;s 420ms duration is the sum of its children&apos;s critical path, not their sum
        — spans that ran concurrently overlap in time. The flame graph in the APM UI renders this
        same tree horizontally, width proportional to duration, so a wide bar immediately draws
        your eye to the span burning the most wall-clock time.
      </p>

      <h3 id="span-anatomy">Anatomy of a Span</h3>
      <p>Every span carries the same core fields, whether it was created automatically by an integration or manually by you:</p>
      <ul>
        <li>
          <strong>service</strong> — the logical unit of deployment the span belongs to (e.g.{" "}
          <code>checkout-service</code>), set via <code>DD_SERVICE</code> or per-span.
        </li>
        <li>
          <strong>resource</strong> — the normalized operation within that service, with variable
          parts stripped (e.g. <code>POST /checkout</code>, not{" "}
          <code>POST /checkout/id/48213</code>; <code>SELECT orders WHERE id = ?</code>, not the
          literal query). Resource is what APM groups latency and error rate by.
        </li>
        <li>
          <strong>operation name</strong> — a low-cardinality name for the kind of work (e.g.{" "}
          <code>payment.charge_card</code>, <code>redis.get</code>), used for grouping across
          resources.
        </li>
        <li>
          <strong>start time &amp; duration</strong> — when the span began and how long it took,
          in nanoseconds internally.
        </li>
        <li>
          <strong>tags / metadata</strong> — arbitrary key-value attributes (e.g.{" "}
          <code>order.id</code>, <code>http.status_code</code>) attached via automatic
          instrumentation or <code>span.setTag()</code> / <code>span.set_tag()</code>.
        </li>
        <li>
          <strong>error info</strong> — when a span fails, it carries <code>error.type</code>,{" "}
          <code>error.msg</code>, and <code>error.stack</code>, and is flagged as an error span in
          the UI.
        </li>
        <li>
          <strong>span links</strong> — optional references to spans in <em>other</em> traces
          (e.g. linking a Kafka consumer span back to the producer&apos;s trace) when a strict
          parent/child relationship doesn&apos;t apply, such as batched or fanned-in async work.
        </li>
      </ul>

      <ArticleTable
        caption="Four terms that sound interchangeable in conversation but mean very different things in the Datadog data model."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Concept</th>
              <th>Definition</th>
              <th>Example</th>
              <th>Where you see it in the UI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Trace</strong>
              </td>
              <td>End-to-end record of one request — the full tree of spans sharing one trace_id</td>
              <td>One <code>POST /checkout</code> flowing through 4 services</td>
              <td>Trace flame graph / waterfall view</td>
            </tr>
            <tr>
              <td>
                <strong>Span</strong>
              </td>
              <td>One unit of work with its own timing, tags, and optional error info</td>
              <td>The <code>payment-service</code> → <code>ChargeCard</code> call</td>
              <td>A single bar/row inside the flame graph</td>
            </tr>
            <tr>
              <td>
                <strong>Service</strong>
              </td>
              <td>Logical deployable unit spans are grouped under, set via <code>DD_SERVICE</code></td>
              <td><code>payment-service</code></td>
              <td>Service Catalog entry, node in the Service Map</td>
            </tr>
            <tr>
              <td>
                <strong>Resource</strong>
              </td>
              <td>Normalized name of the specific operation within a service — the endpoint or query, variables stripped</td>
              <td><code>POST /checkout</code>, <code>SELECT orders WHERE id = ?</code></td>
              <td>Resource page, per-endpoint latency table</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="distributed-tracing-and-context-propagation">
        Distributed Tracing & Context Propagation
      </h2>
      <p>
        None of the tree in the diagram above happens automatically just because five services
        each run <code>dd-trace</code>. Each service&apos;s tracer only knows about spans it
        creates locally. What stitches five separate local traces into one distributed trace is{" "}
        <strong>context propagation</strong>: the calling service injects trace identifiers into
        the outbound request (usually HTTP headers), and the receiving service extracts them and
        uses them as the parent context for its own new span.
      </p>

      <MermaidDiagram
        chart={propagationSequence}
        title="Context Propagation Across Three Services"
        caption="Every hop carries trace_id forward unchanged and passes its own span_id as the next hop's parent_id. Drop this header on any hop — an unsupported queue, a hand-rolled proxy — and the trace fractures into disconnected fragments."
        minHeight={520}
      />

      <h3 id="propagation-headers">What Actually Goes Over the Wire</h3>
      <p>
        By default, <code>dd-trace</code> libraries inject and extract Datadog&apos;s native
        headers: <code>x-datadog-trace-id</code>, <code>x-datadog-parent-id</code>, and{" "}
        <code>x-datadog-sampling-priority</code> (the sampling decision travels with the trace so
        every downstream service makes the same keep/drop call). Datadog tracers also support the{" "}
        <strong>W3C Trace Context</strong> standard — <code>traceparent</code> and{" "}
        <code>tracestate</code> headers — which matters when some of your services use OpenTelemetry
        SDKs instead of <code>dd-trace</code>. You control which header formats a tracer emits and
        accepts with <code>DD_TRACE_PROPAGATION_STYLE</code>.
      </p>

      <CodeBlock
        code={`# Accept and inject BOTH formats — useful in a mixed fleet where some
# services run dd-trace and others run a vendor-neutral OTel SDK
export DD_TRACE_PROPAGATION_STYLE="datadog,tracecontext"

# What actually leaves the process on the outbound call from the diagram above:
curl -X POST https://cart-service.internal/cart \\
  -H "x-datadog-trace-id: 8879" \\
  -H "x-datadog-parent-id: 101" \\
  -H "x-datadog-sampling-priority: 1" \\
  -H "traceparent: 00-000000000000000000000000000022af-0000000000000065-01"`}
        lang="bash"
        filename="propagation-headers.sh"
      />
      <p>
        Note the two formats encode the same information differently: Datadog&apos;s headers use
        decimal, W3C&apos;s <code>traceparent</code> packs a 128-bit trace ID and 64-bit span ID as
        hex into one field. A tracer configured for both formats translates between them so a
        request can cross a boundary using either without breaking the chain.
      </p>

      <h2 id="instrumentation-auto-and-manual">Instrumentation: Auto & Manual</h2>
      <p>
        You get traces two ways: <strong>auto-instrumentation</strong>, where the{" "}
        <code>dd-trace</code> library patches known frameworks and clients (HTTP servers, ORMs,
        Redis, gRPC) to create spans without you writing tracing code, and{" "}
        <strong>manual instrumentation</strong>, where you explicitly open a span around business
        logic the library can&apos;t see into — a batch job step, a pricing calculation, a
        third-party SDK call. Production services use both.
      </p>

      <h3 id="auto-instrumentation">Auto-Instrumentation</h3>
      <p>
        In Node.js, the tracer has to load and monkey-patch modules{" "}
        <em>before your application code requires them</em>, which is why it&apos;s loaded via{" "}
        <code>--require</code> rather than a normal top-of-file import:
      </p>
      <CodeBlock
        code={`# Install the tracer
npm install dd-trace --save

# Load dd-trace BEFORE any other module — this is what makes
# auto-instrumentation for http, express, pg, ioredis, etc. work.
# Without --require dd-trace/init loading first, patched modules may
# already be cached by the time the tracer tries to instrument them.
export NODE_OPTIONS="--require dd-trace/init"

# Unified service tagging (see below) — ties this process's traces,
# logs, and infra metrics together
export DD_ENV="production"
export DD_SERVICE="checkout-service"
export DD_VERSION="1.4.2"
export DD_AGENT_HOST="localhost"

node server.js`}
        lang="bash"
        filename="start-node.sh"
      />
      <p>
        Python takes the same &quot;wrap the entrypoint&quot; approach with{" "}
        <code>ddtrace-run</code>, which patches supported libraries at process startup before your
        code runs:
      </p>
      <CodeBlock
        code={`pip install ddtrace

DD_ENV=production \\
DD_SERVICE=checkout-service \\
DD_VERSION=1.4.2 \\
DD_AGENT_HOST=localhost \\
ddtrace-run python app.py`}
        lang="bash"
        filename="start-python.sh"
      />
      <p>
        Go has no runtime monkey-patching (Go doesn&apos;t allow it), so{" "}
        <strong><code>dd-trace-go</code> has no auto-instrumentation equivalent</strong> — every
        service call must be wrapped explicitly, either by hand or via <code>contrib</code>{" "}
        packages that wrap common frameworks (<code>net/http</code>, <code>gin</code>,{" "}
        <code>grpc</code>, <code>database/sql</code>) with a few lines of setup.
      </p>

      <h3 id="manual-spans-and-tags">Manual Spans & Custom Tags</h3>
      <p>
        Auto-instrumentation gives you the shape of the tree — which service called which. Manual
        spans are how you make a span mean something to <em>your</em> domain: attach the order ID,
        the customer tier, the number of retries. This is the single highest-leverage thing you can
        do to make a trace debuggable instead of just visible.
      </p>
      <CodeBlock
        code={`import tracer from "dd-trace";

// tracer.init() already ran via --require dd-trace/init;
// this file just uses the already-initialized singleton.
export async function chargeCard(orderId: string, amountCents: number) {
  const span = tracer.startSpan("payment.charge_card", {
    tags: {
      "resource.name": "ChargeCard",
      "order.id": orderId,
      "order.amount_cents": amountCents,
    },
  });

  try {
    const result = await stripe.charges.create({ amount: amountCents });
    span.setTag("stripe.charge_id", result.id);
    return result;
  } catch (err) {
    span.setTag("error", err); // marks the span as an error, captures the stack
    throw err;
  } finally {
    span.finish();
  }
}`}
        lang="typescript"
        filename="payments.ts"
      />
      <CodeBlock
        code={`from ddtrace import tracer

def charge_card(order_id: str, amount_cents: int) -> dict:
    with tracer.trace(
        "payment.charge_card", service="checkout-service", resource="ChargeCard"
    ) as span:
        span.set_tag("order.id", order_id)
        span.set_tag("order.amount_cents", amount_cents)

        # If this raises, ddtrace automatically flags the span as an
        # error and captures error.type / error.msg / error.stack —
        # no manual except/finally bookkeeping required.
        result = stripe.Charge.create(amount=amount_cents)

        span.set_tag("stripe.charge_id", result["id"])
        return result`}
        lang="python"
        filename="payments.py"
      />
      <CodeBlock
        code={`package payments

import (
	"context"

	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func ChargeCard(ctx context.Context, orderID string, amountCents int) error {
	span, ctx := tracer.StartSpanFromContext(ctx, "payment.charge_card",
		tracer.ResourceName("ChargeCard"),
	)
	defer span.Finish()

	span.SetTag("order.id", orderID)
	span.SetTag("order.amount_cents", amountCents)

	result, err := stripeClient.ChargeCard(ctx, amountCents)
	if err != nil {
		span.SetTag("error", err) // marks the span as an error span
		return err
	}

	span.SetTag("stripe.charge_id", result.ID)
	return nil
}`}
        lang="go"
        filename="payments.go"
      />

      <h3 id="unified-service-tagging">Unified Service Tagging</h3>
      <p>
        <strong>Unified service tagging</strong> is the convention that makes traces, logs, and
        infrastructure metrics pivotable into each other: every telemetry source from the same
        process carries the same <code>env</code>, <code>service</code>, and <code>version</code>{" "}
        tags, set once via <code>DD_ENV</code>, <code>DD_SERVICE</code>, and{" "}
        <code>DD_VERSION</code>. Skip this and you get a Service Catalog full of near-duplicate
        service names, and logs that can&apos;t be filtered down to &quot;just this deploy.&quot;
      </p>

      <h2 id="the-data-path">The Data Path: App → Agent → Intake</h2>
      <p>
        Your instrumented process never talks to Datadog&apos;s backend directly. Spans are
        buffered in memory and flushed over HTTP to the <strong>Trace Agent</strong> — a component
        of the Datadog Agent running on the same host or as a sidecar — which listens on{" "}
        <strong>port 8126</strong> by default. The Agent batches, compresses, and forwards to
        Datadog&apos;s intake.
      </p>
      <MermaidDiagram
        chart={instrumentationLayers}
        title="Instrumentation Layers"
        caption="Four distinct layers, each with its own failure mode: a bug in your code, a tracer misconfiguration, an unreachable Agent (wrong DD_AGENT_HOST), or an intake-side ingestion/retention decision."
        minHeight={260}
      />
      <p>
        This local hop matters operationally: if the Agent isn&apos;t running or{" "}
        <code>DD_AGENT_HOST</code> points at the wrong address, your application keeps running
        fine — spans just silently queue up and get dropped when the tracer&apos;s buffer fills.
        There&apos;s no request-path failure, only a monitoring blind spot, which is exactly why
        it&apos;s worth alerting on Agent connectivity separately from application health.
      </p>

      <h2 id="service-catalog-and-service-map">
        Service Catalog, Service Map & Trace Explorer
      </h2>
      <p>
        Once services are tagged and traces are flowing, Datadog builds three views on top of the
        same span data, each answering a different question:
      </p>
      <ul>
        <li>
          <strong>Service Catalog</strong> — the inventory of every service Datadog has seen
          traces for, with ownership, dependencies, and health rolled up per service.
        </li>
        <li>
          <strong>Service Map</strong> — a live dependency graph built purely from observed
          parent/child span relationships. No YAML, no manually maintained architecture diagram —
          if a service called another service in the last time window, an edge exists.
        </li>
        <li>
          <strong>Trace Explorer / span analytics</strong> — a search and aggregation surface over
          indexed spans, letting you query by tag (e.g. <code>@http.status_code:500</code>) and
          build metrics or facets on the fly, instead of hunting through individual flame graphs.
        </li>
      </ul>

      <h2 id="ingestion-sampling-and-retention-filters">
        Ingestion Sampling & Retention Filters
      </h2>
      <p>
        Tracing every single request at full detail, forever, does not scale — a busy service can
        generate more span data per second than is economical to store and index. Datadog splits
        the cost/visibility tradeoff into two independent controls that fire at different points in
        the pipeline.
      </p>

      <MermaidDiagram
        chart={samplingRetentionFlow}
        title="Ingestion Sampling → Retention Filters"
        caption="Two separate decisions, at two separate stages: ingestion sampling (head-based, at the tracer) decides what gets sent at all; retention filters (evaluated on the full ingested trace) decide what stays searchable for 15 days. RED metrics bypass both — they're always computed from 100% of traffic."
        minHeight={520}
      />

      <h3 id="head-based-vs-tail-based">Head-Based vs Tail-Based, Mapped to Datadog</h3>
      <p>
        These are the two classic strategies in any distributed tracing system, and Datadog&apos;s
        pipeline uses both, at different stages:
      </p>
      <ul>
        <li>
          <strong>Head-based sampling</strong> — the keep/drop decision is made at the{" "}
          <em>root span</em>, before the request has finished and before you know if it errored or
          ran slow. This is what <strong>ingestion sampling</strong> is: the Agent continuously
          computes per-service sampling rates aimed at a target throughput (tunable via{" "}
          <code>DD_APM_TARGET_TPS</code> on the Agent), and the tracer can also be forced to a fixed
          rate with <code>DD_TRACE_SAMPLE_RATE</code> or per-service/per-resource with{" "}
          <code>DD_TRACE_SAMPLING_RULES</code>. Cheap to run, but blind to outcome — a rare,
          expensive, failing request can get dropped by pure bad luck.
        </li>
        <li>
          <strong>Tail-based sampling</strong> — the decision is deferred until the full trace (or
          enough of it) is known, so you can decide based on outcome: keep it if it errored, keep
          it if it was slow. Datadog&apos;s <strong>retention filters</strong> play this role: they
          evaluate tag-based rules against the complete ingested trace (available in the 15-minute
          Live Search window) and decide what gets <em>indexed</em> for 15-day retention —
          independent of whatever the head-based ingestion decision already was.
        </li>
      </ul>
      <p>
        In practice you combine both: a modest head-based ingestion rate keeps volume — and cost —
        under control, and a small set of well-designed retention filters (always keep errors,
        always keep anything over your SLO threshold, always keep traces from your highest-tier
        customers) guarantees the traces that actually matter for an incident are never the ones
        that got sampled away.
      </p>
      <CodeBlock
        code={`# Retention filter (Trace Retention page) — always index error traces
# and anything slower than 2s, so on-call has full context even when
# head-based ingestion is sampled down to 20% of total traffic:

@http.status_code:>=500 OR error:true OR @duration:>2s`}
        lang="text"
        filename="retention-filter-query.txt"
      />
      <p>
        Datadog also ships an <strong>Intelligent Retention Filter</strong> by default, which keeps
        a diverse cross-section of traces (across services, resources, and error status) without
        counting against your indexed-spans usage — so even a service with no custom retention
        filters configured yet isn&apos;t flying completely blind.
      </p>

      <h2 id="apm-metrics-red">APM Metrics: RED, Independent of Sampling</h2>
      <p>
        The most commonly missed nuance in interviews: Datadog computes{" "}
        <strong>RED metrics</strong> — <strong>R</strong>equests (<code>trace.*.hits</code>),{" "}
        <strong>E</strong>rrors (<code>trace.*.errors</code>), and{" "}
        <strong>D</strong>uration (<code>trace.*.duration</code>, including percentiles like p50,
        p95, p99) — from <strong>100% of application traffic</strong>, regardless of the head-based
        ingestion sampling rate. Sampling decides which trace <em>bodies</em> get stored and are
        replayable as flame graphs; it does not decide whether a request counted toward your
        latency percentiles or error rate. This is what lets you sample aggressively for cost
        without ever losing accurate SLO/alerting signal.
      </p>

      <h2 id="continuous-profiler">Continuous Profiler</h2>
      <p>
        A trace tells you <em>which span</em> was slow. It does not tell you{" "}
        <em>which line of code inside that span</em> was slow — that&apos;s a different resolution
        of data entirely, and it&apos;s what the <strong>Continuous Profiler</strong> provides.
        It&apos;s an always-on, low-overhead sampling profiler (CPU time, allocations, lock
        contention, depending on runtime) that runs continuously in production, not just when you
        remember to attach a debugger.
      </p>
      <p>
        The payoff is the correlation: from a slow span in a trace, you can jump into{" "}
        <strong>Code Hotspots</strong> and see the exact stack frames that were executing during
        that span&apos;s window — down to the function, sometimes the line. Tracing narrows the
        search from &quot;the whole request&quot; to &quot;this one span&quot;; the profiler
        narrows it from &quot;this span&quot; to &quot;this function call.&quot; Neither
        replaces the other.
      </p>

      <h2 id="correlating-logs-metrics-and-errors">Correlating Logs, Metrics & Errors</h2>

      <h3 id="trace-log-correlation">Trace ↔ Log Correlation</h3>
      <p>
        To pivot from a slow or failing span straight to the exact log lines it produced, your logs
        need to carry <code>dd.trace_id</code> and <code>dd.span_id</code> attributes. Most{" "}
        <code>dd-trace</code> libraries can inject these automatically into structured loggers
        (e.g. Node&apos;s <code>pino</code>/<code>winston</code>/<code>bunyan</code>, Python&apos;s{" "}
        standard <code>logging</code>) once log injection is enabled — the logger doesn&apos;t need
        to know anything about tracing, it just emits JSON and the tracer stamps the active
        span&apos;s IDs onto it. Combined with unified service tagging (<code>env</code>,{" "}
        <code>service</code>, <code>version</code> on both sides), you get a one-click path from
        &quot;this span errored&quot; to &quot;here&apos;s the exact log line that explains why.&quot;
      </p>

      <h3 id="error-tracking">Error Tracking for APM</h3>
      <p>
        Individual error spans are useful one at a time, but at scale you want them{" "}
        <em>grouped</em>. Error Tracking for APM deduplicates spans that failed with the same{" "}
        <code>error.type</code> and stack signature into a single issue, so &quot;500 payment
        failures overnight&quot; shows up as one actionable item with an occurrence count and
        trend, not 500 identical-looking flame graphs to click through individually.
      </p>

      <h2 id="common-pitfalls">Common Pitfalls & Failure Modes</h2>
      <ul>
        <li>
          <strong>Async boundaries silently break propagation</strong> — a message queue, a
          fire-and-forget background job, or a Lambda invocation that doesn&apos;t forward or
          extract the trace headers produces a brand-new, disconnected trace instead of a
          continuation. The symptom is a service that looks slow in isolation with no visible
          upstream cause.
        </li>
        <li>
          <strong>Skipping unified service tagging</strong> — without consistent{" "}
          <code>DD_ENV</code>/<code>DD_SERVICE</code>/<code>DD_VERSION</code>, staging and
          production traffic for &quot;the same&quot; service shows up as different Service Map
          nodes, and trace-log correlation breaks.
        </li>
        <li>
          <strong>Confusing &quot;ingested&quot; with &quot;indexed&quot;</strong> — a span that
          was sent to Datadog but didn&apos;t match a retention filter is only queryable for 15
          minutes (Live Search), then gone. &quot;I can&apos;t find that trace from yesterday&quot;
          almost always means it was ingested but never indexed.
        </li>
        <li>
          <strong>High-cardinality span tags used for custom metrics</strong> — tagging spans with
          something like a raw user ID or request ID is fine for search, but generating a custom
          metric from a span dimension with unbounded cardinality creates a metrics explosion.
          Reserve metric generation for low-cardinality tags.
        </li>
        <li>
          <strong>Trusting a low-traffic service&apos;s default sampling rate</strong> — the
          Agent&apos;s target-TPS sampling assumes steady volume. A rarely-called but critical
          internal service can get under-sampled relative to how much you actually need to see from
          it; give it an explicit sampling rule instead of the default.
        </li>
        <li>
          <strong>Manual span leaks</strong> — forgetting to call <code>span.finish()</code> (Node)
          in every code path, including error paths, leaves spans open indefinitely and can corrupt
          the trace tree&apos;s timing.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="Explain distributed tracing and context propagation"
        intro="A strong answer names the mechanism (shared trace_id, header propagation), not just the outcome (a pretty flame graph)."
        steps={[
          "Define the shape: a trace is a tree of spans sharing one trace_id; each non-root span has a parent_id pointing at the span that caused it.",
          "Explain propagation concretely: on every outbound call, the tracer injects trace_id, its own span_id (as the next hop's parent_id), and the sampling decision into request headers — Datadog's x-datadog-* headers by default, or W3C traceparent/tracestate when interoperating with OpenTelemetry.",
          "Explain the receiving side: the callee's tracer extracts those headers and opens its own span using the extracted trace_id and parent_id — that's the entire mechanism that stitches independent services into one trace.",
          "Name a real failure mode: an unsupported message queue, a fire-and-forget job, or a hand-rolled proxy that doesn't forward headers produces a disconnected, orphaned trace — the visible symptom is a service that looks slow with no upstream context.",
          "Close with the production implication: every async boundary in the architecture needs either library support for header passthrough or manual extract/inject — skipping this creates permanent blind spots exactly at your riskiest integration points.",
        ]}
      />

      <InterviewPlaybook
        title="How does trace sampling work, and how do you keep the traces that matter?"
        intro="The nuance interviewers are listening for is the two-stage pipeline — most candidates only know about one stage."
        steps={[
          "State why 100% ingestion isn't the default: span volume at scale is expensive to transmit, store, and index; sampling trades some trace-body visibility for cost control.",
          "Explain head-based (ingestion) sampling: the keep/drop decision happens at the root span, before the outcome is known — driven by Agent-computed per-service rates (target TPS) or a forced DD_TRACE_SAMPLE_RATE / DD_TRACE_SAMPLING_RULES.",
          "Immediately add the nuance most people miss: RED metrics (requests, errors, duration/percentiles) are computed from 100% of traffic regardless of the sampling decision — dropping a trace body never loses you accurate latency or error-rate signal.",
          "Explain retention filters as the second stage: tag-based rules evaluated on the full ingested trace (errors, duration, customer tier) decide what gets indexed for 15-day retention, independent of the earlier ingestion decision — this is functionally a tail-based mechanism layered on top of head-based ingestion.",
          "Close with the operational answer: combine a modest ingestion rate for cost with retention filters that always keep errors and SLO-breaching traces — that combination is what guarantees the important 1% is never the part that got randomly sampled away.",
        ]}
      />

      <h2 id="hands-on-challenge">Hands-On Challenge</h2>
      <InterviewChallenge
        title="Diagnosing a p99 Latency Spike"
        scenario={
          <>
            On-call gets paged: <code>checkout-service</code>&apos;s p99 latency has jumped from
            180ms to 2.4s over the last 20 minutes, but the error rate and overall request volume
            look normal. Nothing in the deploy log changed in that window. You have full APM
            (traces + Continuous Profiler), unified service tagging, and log correlation configured
            across the fleet.
          </>
        }
        tasks={[
          "Describe where you'd look first (Service Map or the Service page) and why p99-specific investigation starts there rather than in raw logs.",
          "Explain how you'd narrow from 'checkout-service is slow' down to the specific resource (endpoint) responsible, using per-resource latency breakdowns rather than the service-wide average.",
          "Walk through opening a slow trace's flame graph: which span width tells you the story, and how do you distinguish 'this span is slow' from 'this span is waiting on a slow child span'.",
          "Explain how the Continuous Profiler's Code Hotspots view adds information the flame graph alone can't give you, once you've identified the offending span.",
          "Explain why this entire workflow depends on decisions made earlier in the pipeline: unified service tagging, and a retention filter that guarantees slow traces in this exact time window are still indexed and not just gone after 15 minutes.",
        ]}
        pitfalls={[
          "Jumping straight to logs before narrowing to a resource — logs alone can't show you the causal, cross-service shape of the slowness.",
          "Assuming the widest bar in the flame graph is always the root cause — a wide parent span can just be waiting on a narrow but serial chain of children.",
          "Forgetting that if ingestion sampling is aggressive and no retention filter targets high-latency traces, the exact slow traces from the incident window may simply not be there to inspect.",
        ]}
        signal="Strong candidates narrow top-down (service → resource → trace → span → code) instead of guessing, and explicitly connect the sampling/retention configuration to whether the investigation is even possible after the fact."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Start at the Service page, not logs.</strong> The Service Map confirms{" "}
          <code>checkout-service</code>&apos;s dependencies didn&apos;t change, and the Service
          page&apos;s latency distribution shows the p99 shift is real and isolated to this service
          — not a fleet-wide network issue.
        </p>
        <p>
          <strong>2. Break down by resource.</strong> The service-wide p99 is an aggregate across
          every endpoint. The per-resource table shows <code>POST /checkout</code> spiking while{" "}
          <code>GET /cart</code> and others are flat — the problem is localized to one code path,
          not the whole service (e.g. a shared connection pool or CPU starvation would show up
          everywhere).
        </p>
        <p>
          <strong>3. Open a representative slow trace.</strong> In the flame graph, the root span
          is ~2.4s, but its direct children (cart lookup, inventory check) are still fast — the
          width sits almost entirely inside the <code>payment.charge_card</code> span, and within
          that, inside a <code>stripe.charge</code> child span. That nesting tells you the root
          span isn&apos;t itself doing slow work — it&apos;s waiting on a specific downstream call.
        </p>
        <p>
          <strong>4. Use Code Hotspots on that span&apos;s time window.</strong> The trace alone
          says &quot;the Stripe call took 2.2s.&quot; Code Hotspots correlated to that span shows
          the profiler samples were dominated by JSON serialization of an oversized retry payload
          in the charge-building code — not network latency to Stripe at all. That&apos;s the
          fix: a client-side bug, not a third-party outage, which the trace duration alone could
          not distinguish.
        </p>
        <p>
          <strong>5. None of this works without the pipeline decisions made in advance.</strong>{" "}
          Unified service tagging is what let you pivot cleanly from the Service Map to this
          specific version&apos;s traces. And because a retention filter already indexes anything
          over the SLO threshold, the exact slow traces from the incident window are still
          searchable — if ingestion sampling had been left at a low fixed rate with no retention
          filter, this trace might have been dropped at the root before anyone knew to look for it.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A trace is a tree of spans sharing one <code>trace_id</code>; context propagation
          (header injection/extraction on every hop) is the only thing that stitches independent
          services into that single tree — breaking it at any async boundary creates a blind spot.
        </li>
        <li>
          Auto-instrumentation (loaded via <code>--require dd-trace/init</code> in Node,{" "}
          <code>ddtrace-run</code> in Python) gives you the shape of the tree for free; manual
          spans and tags are what make a trace meaningful to your domain, and Go requires manual
          wiring throughout since it has no runtime patching.
        </li>
        <li>
          Unified service tagging (<code>DD_ENV</code>/<code>DD_SERVICE</code>/<code>DD_VERSION</code>
          ) is the glue that ties traces, logs, and infrastructure metrics into one pivotable view
          — skip it and every other correlation feature degrades.
        </li>
        <li>
          Ingestion sampling (head-based, at the root span) and retention filters (evaluated on
          the full trace, functionally tail-based) are two independent stages — combine a modest
          ingestion rate for cost control with retention filters that always keep errors and
          SLO-breaching traces.
        </li>
        <li>
          RED metrics (<code>trace.*</code> requests/errors/duration) are always computed from
          100% of traffic regardless of sampling — you never lose accurate alerting signal, only
          individual trace bodies.
        </li>
        <li>
          Tracing narrows a problem to a span; the Continuous Profiler narrows it further to a
          function or line via Code Hotspots — use both together rather than treating either as a
          replacement for the other.
        </li>
      </ul>
    </div>
  );
}
