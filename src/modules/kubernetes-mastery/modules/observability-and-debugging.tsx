import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const debugDecisionDiagram = String.raw`flowchart TD
  START["Pod/Service not working"]
  Q1{"kubectl get pods\nstatus?"}
  PEND["Pending\n→ Scheduling issue"]
  CRASH["CrashLoopBackOff\n→ App crash / bad config"]
  TERM["Error / OOMKilled\n→ App error or memory limit"]
  RUN["Running but\nservice unreachable\n→ Networking issue"]

  START --> Q1
  Q1 --> PEND & CRASH & TERM & RUN

  PEND --> P1["kubectl describe pod\nCheck Events:\n• Insufficient resources\n• Taint/affinity mismatch\n• Volume pending"]
  CRASH --> C1["kubectl logs --previous\nCheck exit code in\nkubectl describe pod"]
  TERM --> T1["Exit 137 = OOMKilled\nExit 1 = App error\nExit 143 = SIGTERM (graceful)"]
  RUN --> R1["kubectl get endpoints\nCheck EndpointSlice\nTest with kubectl exec curl"]`;

const metricsStackDiagram = String.raw`flowchart TD
  subgraph "Metrics Pipeline"
    APP["Application\n(Prometheus metrics endpoint\n/metrics on :9090)"]
    PROM["Prometheus\n(scrapes + stores metrics)"]
    GRAF["Grafana\n(dashboards + alerts)"]
    AM["Alertmanager\n(routes alerts → PagerDuty/Slack)"]
    APP -->|"scrape every 15s"| PROM
    PROM --> GRAF
    PROM --> AM
  end
  subgraph "Logs Pipeline"
    STDOUT["Container stdout/stderr"]
    FB["Fluent Bit DaemonSet\n(collects node logs)"]
    ES["Elasticsearch /\nLoki / CloudWatch"]
    KIB["Kibana / Grafana\n(query + dashboards)"]
    STDOUT --> FB --> ES --> KIB
  end`;

const tracingFlowDiagram = String.raw`sequenceDiagram
  participant Client
  participant API as api-service
  participant Auth as auth-service
  participant DB as database

  Client->>API: GET /orders (traceId: abc123, spanId: 001)
  API->>Auth: validateToken (parentSpan: 001, spanId: 002)
  Auth-->>API: valid (2ms)
  API->>DB: SELECT orders (parentSpan: 001, spanId: 003)
  DB-->>API: rows (45ms) ← latency problem here
  API-->>Client: 200 OK (total: 52ms)
  Note over API,DB: Distributed tracing reveals DB span is 87% of total latency`;

export const toc: TocItem[] = [
  { id: "debugging-overview", title: "The Kubernetes Debugging Mindset", level: 2 },
  { id: "pod-debugging", title: "Pod-Level Debugging", level: 2 },
  { id: "event-driven-debugging", title: "Event-Driven Debugging", level: 3 },
  { id: "network-debugging", title: "Network Debugging", level: 2 },
  { id: "metrics-stack", title: "Metrics: Prometheus and Grafana", level: 2 },
  { id: "logging", title: "Structured Logging in Kubernetes", level: 2 },
  { id: "tracing", title: "Distributed Tracing with OpenTelemetry", level: 2 },
  { id: "observability-comparison", title: "Observability Pillar Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ObservabilityAndDebugging() {
  return (
    <div className="article-content">
      <p>
        Debugging Kubernetes issues is a skill that separates senior engineers from the rest.
        The failure modes are non-obvious — a Pod can be Running while its service is
        unreachable; a Deployment can have 3 replicas while zero serve traffic; a node can
        have free CPU while Pods stay Pending. This module gives you the systematic debugging
        toolkit and the observability stack that prevents issues from being surprises in the
        first place.
      </p>

      <h2 id="debugging-overview">The Kubernetes Debugging Mindset</h2>
      <p>
        Kubernetes debugging follows a layered approach: start at the Pod level (is it running?),
        then the networking layer (can it be reached?), then the application layer (is it
        returning the right responses?). Most issues fall into three buckets: scheduling
        failures (Pod never starts), runtime failures (Pod starts but crashes), and networking
        failures (Pod runs but cannot be reached or cannot reach others).
      </p>

      <MermaidDiagram
        chart={debugDecisionDiagram}
        title="Kubernetes Debugging Decision Tree"
        caption="Always start with kubectl get pods and kubectl describe pod. The Events section of describe pod is the most information-dense starting point for any Kubernetes issue."
        minHeight={440}
      />

      <h2 id="pod-debugging">Pod-Level Debugging</h2>

      <CodeBlock
        code={`# The essential debugging toolkit, in order of use

# 1. Get high-level status
kubectl get pods -n <namespace> -o wide   # add -o wide for node name and IP

# 2. Events are the most useful first signal
kubectl describe pod <pod-name> -n <namespace>
# Look for Events at the bottom — they show what Kubernetes attempted and what failed

# 3. Application logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> -c <container>  # multi-container Pod
kubectl logs <pod-name> -n <namespace> --previous       # last crash instance
kubectl logs <pod-name> -n <namespace> -f               # follow (tail -f equivalent)

# 4. Shell into a running container
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
kubectl exec -it <pod-name> -n <namespace> -c <container> -- bash

# 5. Ephemeral debug container (for distroless/minimal images that have no shell)
kubectl debug -it <pod-name> \
  --image=busybox \
  --target=<container-name> \
  -n <namespace>

# 6. Copy of Pod with modified image for debugging
kubectl debug <pod-name> \
  --copy-to=debug-pod \
  --set-image=app=busybox \
  -it -- sh`}
        lang="bash"
        filename="pod-debugging.sh"
      />

      <h3 id="event-driven-debugging">Event-Driven Debugging</h3>
      <p>
        Kubernetes Events are the most underused debugging tool. Every significant action
        (scheduling attempt, image pull, probe failure, eviction) creates an Event. Events
        are ephemeral — they are deleted after 1 hour by default — so check them early
        in an incident.
      </p>

      <CodeBlock
        code={`# Get all events in a namespace, sorted by time
kubectl get events -n production --sort-by='.lastTimestamp'

# Watch events in real-time during a deployment
kubectl get events -n production -w

# Filter events for a specific object
kubectl get events -n production \
  --field-selector involvedObject.name=my-pod

# Common event messages and what they mean:
# "Pulling image" / "Failed to pull image" → registry auth or image name issue
# "Back-off restarting failed container" → CrashLoopBackOff
# "Insufficient cpu/memory" → resource requests exceed node capacity
# "0/3 nodes are available" → scheduling constraint not satisfiable
# "Readiness probe failed" → app not ready, removed from Service endpoints
# "OOMKilled" → container exceeded memory limit`}
        lang="bash"
        filename="events-debugging.sh"
      />

      <h2 id="network-debugging">Network Debugging</h2>

      <CodeBlock
        code={`# Service connectivity debugging checklist

# 1. Verify Service exists and has correct port
kubectl get service my-svc -n production
kubectl describe service my-svc -n production

# 2. Check EndpointSlice (empty = selector mismatch or no ready Pods)
kubectl get endpointslices -n production
kubectl get endpoints my-svc -n production

# 3. Check that backend Pods are Ready (not just Running)
kubectl get pods -l app=my-app -n production
# Look at READY column: 0/1 = not ready, endpoints won't include this Pod

# 4. Test DNS resolution from inside the cluster
kubectl run dns-test --image=curlimages/curl --rm -it --restart=Never -- \
  nslookup my-svc.production.svc.cluster.local

# 5. Test HTTP connectivity from inside the cluster
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -v http://my-svc.production.svc.cluster.local/health

# 6. Check NetworkPolicy — is traffic blocked?
# If CNI enforces NetworkPolicy, verify allow rules exist
kubectl get networkpolicies -n production

# 7. Debug with network tools in a privileged ephemeral container
kubectl debug node/<node-name> -it --image=nicolaka/netshoot`}
        lang="bash"
        filename="network-debugging.sh"
      />

      <h2 id="metrics-stack">Metrics: Prometheus and Grafana</h2>
      <p>
        The de facto Kubernetes metrics stack is <strong>Prometheus</strong> (time-series
        storage + query language) + <strong>Grafana</strong> (visualization) +{" "}
        <strong>Alertmanager</strong> (alert routing). The{" "}
        <strong>kube-prometheus-stack</strong> Helm chart installs all three plus
        pre-built dashboards for Kubernetes cluster metrics.
      </p>

      <MermaidDiagram
        chart={metricsStackDiagram}
        title="Kubernetes Observability Stack"
        caption="Prometheus scrapes application and infrastructure metrics. Fluent Bit (or Fluentd) collects container logs. Both feed separate visualization tools. In production, add OpenTelemetry Collector to unify all three signals."
        minHeight={400}
      />

      <CodeBlock
        code={`# Key Prometheus metrics for Kubernetes workloads
# (PromQL examples)

# CPU throttling rate (high value = limits set too low)
rate(container_cpu_cfs_throttled_seconds_total[5m]) /
  rate(container_cpu_cfs_periods_total[5m])

# Memory usage vs limit (approach 1.0 = OOMKill risk)
container_memory_usage_bytes /
  container_spec_memory_limit_bytes

# Pod restart count (high = CrashLoopBackOff or recurring failures)
sum(kube_pod_container_status_restarts_total) by (pod, namespace)

# Pods not ready
kube_deployment_status_replicas_unavailable > 0

# Node memory pressure
kube_node_status_condition{condition="MemoryPressure", status="true"} == 1

# HPA current vs desired replicas (scaling lag)
kube_horizontalpodautoscaler_status_current_replicas vs
kube_horizontalpodautoscaler_status_desired_replicas`}
        lang="text"
        filename="prometheus-queries.promql"
      />

      <h2 id="logging">Structured Logging in Kubernetes</h2>
      <p>
        Kubernetes captures anything written to container <strong>stdout/stderr</strong>.
        The kubelet writes these streams to files on the node. Log aggregators (Fluent Bit,
        Fluentd, Vector) run as DaemonSets, read these files, and ship them to your log
        store (Elasticsearch, Loki, CloudWatch, Datadog).
      </p>
      <p>
        <strong>Structured logging (JSON)</strong> is the standard for Kubernetes workloads.
        Log aggregators can parse JSON fields for filtering, grouping, and alerting. Always
        include <code>traceId</code>, <code>requestId</code>, and <code>namespace</code> in
        log entries for cross-service correlation.
      </p>

      <CodeBlock
        code={`# Structured log example from a Go service (using zap)
{
  "level": "error",
  "timestamp": "2026-05-15T10:23:45.678Z",
  "caller": "handlers/order.go:42",
  "message": "failed to process order",
  "traceId": "abc123def456",
  "orderId": "ord-789",
  "userId": "usr-456",
  "error": "database connection timeout after 5s",
  "namespace": "production",
  "pod": "order-processor-7f9d4b-xyz"
}

# Fluent Bit DaemonSet config: parse JSON and add Kubernetes metadata
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    multiline.parser  docker, cri

[FILTER]
    Name              kubernetes
    Match             *
    Kube_URL          https://kubernetes.default.svc:443
    Merge_Log         On     # parse JSON log into structured fields
    Keep_Log          Off

[OUTPUT]
    Name              opensearch
    Match             *
    Host              opensearch.logging.svc.cluster.local`}
        lang="text"
        filename="structured-logging.json"
      />

      <h2 id="tracing">Distributed Tracing with OpenTelemetry</h2>
      <p>
        In a microservices architecture, a single user request may traverse 5+ services.
        When latency spikes, logs from individual services cannot tell you which service
        is the bottleneck. <strong>Distributed tracing</strong> solves this by propagating
        a trace ID through all services and assembling a timeline of spans.
      </p>
      <p>
        <strong>OpenTelemetry (OTel)</strong> is the CNCF standard for instrumenting
        applications. You instrument your code once with the OTel SDK; the data can be
        sent to Jaeger, Tempo, Datadog, or any OTel-compatible backend.
      </p>

      <MermaidDiagram
        chart={tracingFlowDiagram}
        title="Distributed Tracing: Identifying the Slow Span"
        caption="Without tracing, you see the total 52ms from the client side. With tracing, you see that the DB span takes 45ms (87% of total) — the optimization target is immediately clear."
        minHeight={360}
      />

      <CodeBlock
        code={`# OpenTelemetry Collector config (deployed as DaemonSet or Deployment)
# Collects traces, metrics, and logs in the cluster

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:                # batch before export for efficiency
  memory_limiter:       # prevent OOM on the collector
    limit_mib: 512

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
  prometheus:           # expose metrics for Prometheus scraping
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]`}
        lang="yaml"
        filename="otel-collector.yaml"
      />

      <h2 id="observability-comparison">Observability Pillar Comparison</h2>

      <ArticleTable
        caption="The three observability pillars answer different questions — you need all three for production-grade observability."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Pillar</th>
              <th>Answers</th>
              <th>Tool</th>
              <th>Collection method</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Metrics</strong></td>
              <td>Is the system healthy? What are the numbers?</td>
              <td>Prometheus + Grafana</td>
              <td>Pull (scrape /metrics endpoint)</td>
              <td>Days to months (aggregate, lossy)</td>
            </tr>
            <tr>
              <td><strong>Logs</strong></td>
              <td>What happened? What was the error message?</td>
              <td>Fluent Bit → Loki / Elasticsearch</td>
              <td>Push from DaemonSet (tail node log files)</td>
              <td>Days to years (full text, expensive)</td>
            </tr>
            <tr>
              <td><strong>Traces</strong></td>
              <td>Where was time spent? Which service is slow?</td>
              <td>OTel SDK → Jaeger / Tempo</td>
              <td>Push from application (instrumented code)</td>
              <td>Hours to days (sampled, high cardinality)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Walk me through how you debug a service that is returning 502 errors in production'"
        intro="This is the most common Kubernetes SRE interview question. The strong answer is systematic and covers all layers."
        steps={[
          "Start at the load balancer / Ingress: check Ingress controller logs for 502 source. If the controller returns 502, the backend Service is unreachable.",
          "Check the Service endpoints: kubectl get endpoints <svc>. If empty, the selector mismatch or all Pods are failing readiness.",
          "Check Pod readiness: kubectl get pods -l app=<name> — look at the READY column. kubectl describe pod for readiness probe failure details.",
          "Check application logs: kubectl logs <pod> --previous if CrashLoopBackOff. Look for startup errors, configuration failures, database connection issues.",
          "Check recent changes: kubectl rollout history deployment/<name>. Recent rollout may have introduced a bad config. kubectl rollout undo if confirmed.",
          "Escalate to tracing if the 502 is intermittent: look at distributed traces during the failure window to identify which downstream call is failing.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How do you monitor a Kubernetes cluster in production?'"
        intro="This is a systems design question with no single right answer. Show you know the full observability stack and how the pieces fit."
        steps={[
          "Metrics: kube-prometheus-stack (Prometheus + Grafana + Alertmanager). Key dashboards: cluster resource utilization, Pod restart rate, HPA scaling events, node pressure.",
          "Logs: Fluent Bit DaemonSet to ship container stdout/stderr to Loki or Elasticsearch. Structured JSON logs with traceId for correlation.",
          "Traces: OpenTelemetry SDK in services, OTel Collector as a sidecar or DaemonSet, Jaeger or Grafana Tempo as the backend. Sample at 1% in production, 100% for errors.",
          "Alerting: alert on Pod restart rate > 2/hour, HPA at maxReplicas for 5+ minutes, node memory/CPU > 85%, PVC usage > 80%, etcd latency > 50ms.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Incident Investigation: Latency Spike Under Load"
        scenario={
          <>
            Production alert fires: P99 latency for the checkout API jumped from 200ms to
            2500ms over 5 minutes. Error rate is low (0.2%). The Deployment has 5 replicas,
            all showing Running/Ready. HPA is at maxReplicas (20). Load is 3x normal. No
            recent deployments.
          </>
        }
        tasks={[
          "List the first 5 kubectl commands you run, in order, and explain what you're looking for with each one.",
          "HPA is at maxReplicas and cannot scale further. What are two ways to address this without changing the application?",
          "The latency spike correlates with a database connection exhaustion event. What Kubernetes configuration change would help, and what application change would help?",
          "After the incident, what observability improvements would you put in place to detect this earlier next time?",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# 1. Check Pod resource usage — are Pods CPU/memory constrained?
kubectl top pods -n production -l app=checkout --containers

# 2. Check for recent restarts or failed Pods
kubectl get pods -n production -l app=checkout

# 3. Check HPA status — why is it at max? What metric is driving it?
kubectl describe hpa checkout-hpa -n production

# 4. Check node resource pressure
kubectl top nodes
kubectl describe nodes | grep -A5 "Allocated resources"

# 5. Check application logs during the spike window
kubectl logs -l app=checkout -n production --since=10m | grep -i "error\|timeout\|slow"`}
          lang="bash"
          filename="incident-commands.sh"
        />
        <p>
          <strong>Two ways to address HPA maxReplicas without changing the app:</strong>
        </p>
        <ol>
          <li>
            <strong>Increase maxReplicas</strong> on the HPA (immediate, simple — but you
            need node capacity). Coordinate with Cluster Autoscaler / Karpenter to add nodes.
          </li>
          <li>
            <strong>Add a NodePool or ASG with more capacity</strong> so Cluster Autoscaler
            can scale nodes to support the additional Pods. Without more nodes, increasing
            maxReplicas only helps if existing nodes have free capacity.
          </li>
        </ol>
        <p>
          <strong>Database connection exhaustion — fixes:</strong>
        </p>
        <ul>
          <li>
            <strong>Kubernetes change:</strong> Add a connection pooler (PgBouncer, ProxySQL)
            as a Service in front of the database. The connection pooler maintains a fixed
            pool to the DB while accepting many connections from the app.
          </li>
          <li>
            <strong>Application change:</strong> Reduce the per-Pod max connection pool size
            (e.g., <code>maxConnections: 5</code> per Pod with 20 Pods = 100 connections total,
            within DB limits). Expose this as a ConfigMap value so it can be tuned without
            redeployment.
          </li>
        </ul>
        <p>
          <strong>Observability improvements:</strong> Alert on DB connection pool saturation
          (metric: <code>db_pool_connections_used / db_pool_connections_max &gt; 0.9</code>),
          add distributed tracing to see which calls are slow, alert when HPA reaches 80%
          of maxReplicas (early warning vs. hard limit), and create a Grafana dashboard
          showing connection pool usage vs. latency correlation.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>kubectl describe pod is always the first debugging step.</strong> The Events
          section contains the failure reason. kubectl logs --previous recovers logs from the
          last crash instance.
        </li>
        <li>
          <strong>Empty endpoints = selector mismatch or no ready Pods.</strong> Check
          <code>kubectl get endpoints</code> whenever a Service is unreachable.
        </li>
        <li>
          <strong>Metrics answer "what," logs answer "why," traces answer "where."</strong>{" "}
          All three are required for production observability. None replaces the others.
        </li>
        <li>
          <strong>Kubernetes Events are ephemeral</strong> (default 1-hour TTL). Check them
          early in an incident. Use a log aggregator that captures Events for retention.
        </li>
        <li>
          <strong>kube-prometheus-stack</strong> is the production-standard Kubernetes metrics
          stack. Install it in every cluster. Alert on Pod restart rate, HPA at max, and
          node resource pressure.
        </li>
        <li>
          <strong>Ephemeral debug containers</strong> (<code>kubectl debug -it</code>) let you
          attach debugging tools to distroless or minimal containers without modifying the
          production image.
        </li>
      </ul>
    </div>
  );
}
