import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const podLifecycleDiagram = String.raw`stateDiagram-v2
  [*] --> Pending : Pod created (written to etcd)
  Pending --> Running : containers started by kubelet
  Running --> Succeeded : all containers exit 0 (Job)
  Running --> Failed : container exits non-zero, no restartPolicy
  Running --> Unknown : node lost contact with API server
  Pending --> Failed : image pull error / unschedulable timeout
  Succeeded --> [*]
  Failed --> [*]
  Running --> Terminating : deletionTimestamp set
  Terminating --> [*] : containers stopped, finalizers cleared`;

const workloadHierarchyDiagram = String.raw`flowchart TD
  D["Deployment\n(stateless, rolling updates)"]
  RS["ReplicaSet\n(maintains N replicas)"]
  P1["Pod"] & P2["Pod"] & P3["Pod"]
  D -->|"owns / manages"| RS
  RS -->|"owns / manages"| P1
  RS -->|"owns / manages"| P2
  RS -->|"owns / manages"| P3

  SS["StatefulSet\n(ordered, stable identity)"]
  SP1["Pod-0\n(stable hostname)"]
  SP2["Pod-1\n(stable hostname)"]
  SS --> SP1
  SS --> SP2

  DS["DaemonSet\n(one Pod per node)"]
  DP1["Pod on node-a"]
  DP2["Pod on pod-b"]
  DS --> DP1
  DS --> DP2`;

const containerStartupDiagram = String.raw`sequenceDiagram
  participant K as kubelet
  participant CR as containerd
  participant R as Registry
  participant C as Container

  K->>CR: CreateContainer (spec)
  CR->>R: pull image (if not cached)
  R-->>CR: image layers
  CR-->>K: image ready
  K->>CR: StartContainer
  CR->>C: run entrypoint
  C-->>K: process running (PID 1)
  K->>K: run liveness probe (after initialDelaySeconds)
  Note over K,C: if probe fails repeatedly → container restart`;

export const toc: TocItem[] = [
  { id: "pod-fundamentals", title: "Pod Fundamentals", level: 2 },
  { id: "pod-lifecycle", title: "Pod Lifecycle", level: 3 },
  { id: "multi-container-patterns", title: "Multi-Container Pod Patterns", level: 3 },
  { id: "deployments", title: "Deployments & ReplicaSets", level: 2 },
  { id: "rolling-updates", title: "Rolling Updates & Rollback", level: 3 },
  { id: "statefulsets", title: "StatefulSets: When Order Matters", level: 2 },
  { id: "daemonsets-jobs", title: "DaemonSets, Jobs & CronJobs", level: 2 },
  { id: "workload-comparison", title: "Workload Comparison Matrix", level: 2 },
  { id: "resource-limits", title: "Resource Requests & Limits", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PodsAndWorkloads() {
  return (
    <div className="article-content">
      <p>
        A Pod is the smallest deployable unit in Kubernetes — not a container, but a Pod. That
        distinction is not pedantic: it shapes how you design multi-process applications, how
        networking works, and why certain patterns (sidecar, init container) exist. This module
        covers Pods deeply, then walks up the workload hierarchy to Deployments, StatefulSets,
        DaemonSets, and Jobs.
      </p>

      <h2 id="pod-fundamentals">Pod Fundamentals</h2>
      <p>
        A Pod is a group of one or more containers that share the same{" "}
        <strong>network namespace</strong> (they communicate over <code>localhost</code>),{" "}
        <strong>UTS namespace</strong> (same hostname), and optionally the same{" "}
        <strong>storage volumes</strong>. They are always co-scheduled — they land on the same
        node. Think of a Pod as a logical host.
      </p>
      <p>
        In practice, most Pods have a single application container. Multi-container Pods arise
        when you need a sidecar (logging agent, service mesh proxy), an init container
        (database migration, secret fetch), or an ambassador (local proxy). The shared network
        namespace is the mechanism that makes sidecars possible without any configuration.
      </p>

      <CodeBlock
        code={`apiVersion: v1
kind: Pod
metadata:
  name: web-app
  labels:
    app: web
    version: v2
spec:
  # Init containers run to completion before app containers start
  initContainers:
    - name: migrate-db
      image: my-app:v2
      command: ["python", "manage.py", "migrate"]
      envFrom:
        - secretRef:
            name: db-credentials

  containers:
    # Primary application container
    - name: web
      image: my-app:v2
      ports:
        - containerPort: 8080
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5

    # Sidecar: shares localhost with web container
    - name: log-shipper
      image: fluent/fluent-bit:3.0
      volumeMounts:
        - name: app-logs
          mountPath: /var/log/app

  volumes:
    - name: app-logs
      emptyDir: {}

  restartPolicy: Always        # default; use Never for Jobs`}
        lang="yaml"
        filename="pod-with-sidecar.yaml"
      />

      <h3 id="pod-lifecycle">Pod Lifecycle</h3>
      <p>
        Understanding Pod lifecycle is critical for debugging. A Pod is never &quot;updated
        in-place&quot; — when a Deployment rolls out a new version, it creates new Pods and
        terminates old ones. The Pod object itself is immutable for most fields.
      </p>

      <MermaidDiagram
        chart={podLifecycleDiagram}
        title="Pod Lifecycle States"
        caption="The Pending phase covers two distinct waits: scheduler assignment and image pull. A Pod stuck in Pending is either unschedulable (check Events with kubectl describe pod) or waiting for a slow image pull."
        minHeight={400}
      />

      <p>
        The <code>Unknown</code> phase means the kubelet on the node stopped reporting. This
        usually means a network partition or node failure. After{" "}
        <code>node.kubernetes.io/unreachable</code> tolerationSeconds expires (default 300s),
        the node lifecycle controller evicts the Pods so they can be rescheduled elsewhere.
      </p>

      <CodeBlock
        code={`# The most useful debugging commands for Pod issues
kubectl describe pod <name>          # Shows Events — always check this first
kubectl logs <pod> -c <container>    # Logs from a specific container
kubectl logs <pod> --previous        # Logs from the last crashed container instance
kubectl get pod <name> -o yaml       # Full object — check status.conditions
kubectl exec -it <pod> -- sh         # Shell into a running container

# Common patterns in Events that indicate the issue:
# "0/3 nodes are available: 3 Insufficient memory" → resource requests too high
# "Back-off pulling image" → image not found or registry auth failure
# "OOMKilled" in lastState → memory limit too low
# "CrashLoopBackOff" → container exits immediately, check --previous logs`}
        lang="bash"
        filename="pod-debug.sh"
      />

      <h3 id="multi-container-patterns">Multi-Container Pod Patterns</h3>
      <p>
        The three canonical multi-container patterns are worth knowing by name because interviewers
        ask about them and the Kubernetes ecosystem (especially service meshes) uses them heavily.
      </p>

      <ArticleTable
        caption="Multi-container Pod patterns — each solves a different cross-cutting concern without modifying the application container."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Container role</th>
              <th>How containers interact</th>
              <th>Real-world example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sidecar</strong></td>
              <td>Augments the main container with a supporting service</td>
              <td>Shared volume or localhost network</td>
              <td>Envoy proxy (Istio), Filebeat log shipper, secrets sync agent</td>
            </tr>
            <tr>
              <td><strong>Ambassador</strong></td>
              <td>Proxies outbound requests on behalf of the main container</td>
              <td>localhost (app connects to 127.0.0.1:port)</td>
              <td>Redis proxy with connection pooling, database circuit breaker</td>
            </tr>
            <tr>
              <td><strong>Adapter</strong></td>
              <td>Transforms or normalizes output from the main container</td>
              <td>Shared volume or localhost</td>
              <td>Prometheus exporter that converts app metrics to Prometheus format</td>
            </tr>
            <tr>
              <td><strong>Init container</strong></td>
              <td>Runs to completion before app containers start</td>
              <td>Shared volumes (init writes, app reads)</td>
              <td>DB migration, secret injection, waiting for a dependency to be ready</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="deployments">Deployments & ReplicaSets</h2>
      <p>
        You almost never create Pods directly in production. A <strong>Deployment</strong> manages
        a <strong>ReplicaSet</strong> which manages Pods. This two-level hierarchy is intentional:
        Deployments own update history (each rollout creates a new ReplicaSet), which is what
        enables rollback.
      </p>

      <MermaidDiagram
        chart={workloadHierarchyDiagram}
        title="Workload Ownership Hierarchy"
        caption="A Deployment does not own Pods directly — it owns ReplicaSets, which own Pods. After a rollout, the old ReplicaSet is kept with 0 replicas, enabling rollback by scaling it back up."
        minHeight={500}
      />

      <CodeBlock
        code={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # allow 1 extra Pod during rollout (4 total momentarily)
      maxUnavailable: 0  # never reduce below 3 ready Pods during rollout
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: my-app:v2
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 3`}
        lang="yaml"
        filename="deployment.yaml"
      />

      <h3 id="rolling-updates">Rolling Updates & Rollback</h3>
      <p>
        A rolling update creates new Pods before terminating old ones (controlled by{" "}
        <code>maxSurge</code> and <code>maxUnavailable</code>). The critical insight:{" "}
        <strong>the readiness probe gates promotion</strong>. Kubernetes only marks a Pod ready
        (and thus starts sending it traffic) once the readiness probe passes. If all new Pods
        fail readiness, the rollout stalls — it does not roll forward and does not roll back
        automatically. You must intervene.
      </p>

      <CodeBlock
        code={`# Rollout management
kubectl rollout status deployment/web-app        # watch rollout progress
kubectl rollout history deployment/web-app       # see all revisions
kubectl rollout undo deployment/web-app          # rollback to previous revision
kubectl rollout undo deployment/web-app --to-revision=3  # rollback to specific revision

# Pause/resume a rollout (useful for canary-style control)
kubectl rollout pause deployment/web-app
kubectl rollout resume deployment/web-app

# Scale a deployment
kubectl scale deployment web-app --replicas=5`}
        lang="bash"
        filename="rollout-commands.sh"
      />

      <h2 id="statefulsets">StatefulSets: When Order Matters</h2>
      <p>
        StatefulSets manage Pods that need <strong>stable network identity</strong> and{" "}
        <strong>stable storage</strong>. Each Pod gets a predictable hostname
        (<code>pod-0</code>, <code>pod-1</code>, ...) and its own PersistentVolumeClaim. This is
        what databases, message brokers (Kafka, RabbitMQ), and distributed caches need.
      </p>
      <p>
        The most important behavioral differences from Deployments: Pods are created and deleted
        <em>in order</em> (0, 1, 2... not all at once), and the PVC for a Pod is{" "}
        <em>not deleted</em> when the StatefulSet is deleted — this prevents accidental data loss.
        You must manually delete PVCs if you want to clean up storage.
      </p>

      <CodeBlock
        code={`apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless   # required: headless Service for stable DNS
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
# Resulting Pod DNS: postgres-0.postgres-headless.default.svc.cluster.local
#                    postgres-1.postgres-headless.default.svc.cluster.local`}
        lang="yaml"
        filename="statefulset-postgres.yaml"
      />

      <h2 id="daemonsets-jobs">DaemonSets, Jobs & CronJobs</h2>
      <p>
        <strong>DaemonSets</strong> ensure exactly one Pod runs on every node (or a node subset
        matching a selector). Use them for node-level agents: log collectors (Fluentd, Filebeat),
        monitoring agents (node-exporter, Datadog agent), CNI plugins, and device plugins.
      </p>
      <p>
        <strong>Jobs</strong> run Pods to completion and track success/failure. Unlike a Deployment,
        a Job does not restart Pods on success — only on failure (controlled by{" "}
        <code>restartPolicy: OnFailure</code> or <code>Never</code>). Use Jobs for database
        migrations, batch data processing, or any one-off task.
      </p>
      <p>
        <strong>CronJobs</strong> create Jobs on a schedule. The API is{" "}
        <code>batch/v1</code> (promoted from <code>batch/v1beta1</code> in Kubernetes v1.21;
        the beta version was removed in v1.25). Key production concern: set{" "}
        <code>concurrencyPolicy: Forbid</code> to prevent overlapping runs if a Job takes longer
        than the schedule interval.
      </p>

      <CodeBlock
        code={`apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"           # 2 AM UTC every day
  concurrencyPolicy: Forbid       # skip if previous run hasn't finished
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 2             # retry up to 2 times on failure
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: my-reports:latest
              command: ["python", "generate_report.py"]`}
        lang="yaml"
        filename="cronjob.yaml"
      />

      <h2 id="workload-comparison">Workload Comparison Matrix</h2>

      <ArticleTable
        caption="Choose the right workload type before writing any YAML — the wrong choice leads to complex workarounds."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Workload</th>
              <th>Pod identity</th>
              <th>Storage</th>
              <th>Runs until</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Deployment</strong></td>
              <td>Ephemeral (random hash)</td>
              <td>Shared or none</td>
              <td>Indefinitely</td>
              <td>Stateless services: web apps, APIs, workers</td>
            </tr>
            <tr>
              <td><strong>StatefulSet</strong></td>
              <td>Stable (pod-0, pod-1)</td>
              <td>Per-Pod PVC</td>
              <td>Indefinitely</td>
              <td>Databases, message brokers, distributed caches</td>
            </tr>
            <tr>
              <td><strong>DaemonSet</strong></td>
              <td>One per node</td>
              <td>HostPath or none</td>
              <td>Indefinitely</td>
              <td>Node agents: logging, monitoring, CNI, device plugins</td>
            </tr>
            <tr>
              <td><strong>Job</strong></td>
              <td>Ephemeral</td>
              <td>Shared or none</td>
              <td>Completion (or failure limit)</td>
              <td>Batch tasks, migrations, one-off scripts</td>
            </tr>
            <tr>
              <td><strong>CronJob</strong></td>
              <td>Ephemeral (per run)</td>
              <td>Shared or none</td>
              <td>Per schedule</td>
              <td>Scheduled reports, cleanup tasks, periodic ETL</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="resource-limits">Resource Requests & Limits</h2>
      <p>
        <strong>Requests</strong> are what the scheduler uses to find a node with enough capacity.
        <strong>Limits</strong> are what the kernel enforces at runtime. If a container exceeds its
        memory limit, it is OOMKilled (exit code 137). If it exceeds its CPU limit, it is throttled
        (not killed). This asymmetry is critical to understand.
      </p>

      <MermaidDiagram
        chart={containerStartupDiagram}
        title="Container Startup & Health Probe Flow"
        caption="The readiness probe fires before the liveness probe matters — a container not passing readiness is removed from Service endpoints but not killed. A container failing liveness is killed and restarted per restartPolicy."
        minHeight={380}
      />

      <CodeBlock
        code={`# Resources in context: QoS classes matter for eviction order
# Guaranteed: requests == limits for ALL containers (safest, highest priority)
# Burstable: requests < limits (can burst; evicted before Guaranteed)
# BestEffort: no requests or limits set (evicted first under pressure)

# Check QoS class of a Pod:
kubectl get pod my-pod -o jsonpath='{.status.qosClass}'

# A common production mistake: setting limits without requests
# This creates a BestEffort-ish pod that gets evicted under memory pressure
# Always set both requests AND limits for production workloads

# Find pods that have been OOMKilled:
kubectl get pods -A | grep OOMKilled
kubectl describe pod <name> | grep -A5 "Last State"`}
        lang="bash"
        filename="resource-debugging.sh"
      />

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is the difference between a Deployment and a StatefulSet?'"
        intro="This is a fundamental Kubernetes question. The weak answer focuses on syntax differences; the strong answer explains identity, storage, and ordering semantics."
        steps={[
          "Lead with Pod identity: Deployments create Pods with random names and treat them as interchangeable. StatefulSets assign stable ordinal names (pod-0, pod-1) that persist across restarts.",
          "Storage: Deployments typically share a volume or use ephemeral storage. StatefulSets use volumeClaimTemplates — each Pod gets its own PVC that persists even if the Pod is deleted.",
          "Ordering: StatefulSets create Pods sequentially (0 before 1 before 2) and delete in reverse order. This matters for leader election and replica initialization in databases.",
          "Close with the rule: use Deployment for stateless workloads (web servers, API services). Use StatefulSet when the application cares about its own identity — primarily databases, message brokers, and distributed consensus systems.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'What is a CrashLoopBackOff and how do you debug it?'"
        intro="CrashLoopBackOff is one of the most common issues in Kubernetes. Interviewers want to hear a systematic debugging approach."
        steps={[
          "Explain what it means: the container is starting, crashing, and Kubernetes is backing off exponentially (10s, 20s, 40s... up to 5m) before restarting it.",
          "The primary tool: kubectl logs <pod> --previous — this shows logs from the last crashed instance, not the current (possibly not-yet-started) one.",
          "Common causes: application startup error (bad config, missing env var), failing health probe with too-low initialDelaySeconds, OOMKill (container exits 137), missing binary or wrong entrypoint.",
          "Check kubectl describe pod for the exit code in lastState.terminated. Exit code 1 = application error. Exit code 137 = OOMKilled. Exit code 143 = graceful SIGTERM. Exit code 127 = command not found.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Design a Resilient Stateless API Deployment"
        scenario={
          <>
            You need to deploy a stateless REST API that currently runs 2 replicas in production.
            The team has had two incidents: (1) a bad release took down all replicas simultaneously,
            and (2) a memory leak caused OOMKills every few hours. You need to harden the
            Deployment manifest to prevent both issues.
          </>
        }
        tasks={[
          "Fix the rolling update strategy so at least 2 replicas are always available during a rollout.",
          "Add a readiness probe that gates traffic until the app is truly ready (endpoint: GET /ready, port 8080), and a liveness probe that triggers a restart if the app becomes unresponsive.",
          "Set resource requests and limits to classify the Pod as Guaranteed QoS, and explain why this matters for the OOMKill scenario.",
          "Explain the difference between the readiness probe failing vs the liveness probe failing in terms of what Kubernetes does next.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3           # increase to 3 so we can afford maxUnavailable: 1
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # never take a replica out before a new one is ready
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: my-api:v3
          ports:
            - containerPort: 8080
          # Readiness: gates Service traffic
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          # Liveness: triggers container restart if app hangs
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 30   # give app time to start before liveness kicks in
            periodSeconds: 10
            failureThreshold: 3
          resources:
            # Guaranteed QoS: requests == limits
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"`}
          lang="yaml"
          filename="hardened-deployment.yaml"
        />
        <p>
          <strong>Why Guaranteed QoS for the OOMKill problem:</strong> With a memory limit set,
          the kernel OOMKills the container when it hits the limit (rather than the whole node
          going down). The liveness probe then restarts it. With Guaranteed QoS (requests ==
          limits), the Pod is last in eviction order under node memory pressure — it will not be
          evicted before BestEffort or Burstable Pods.
        </p>
        <p>
          <strong>Readiness vs Liveness failure:</strong> A failing readiness probe removes the
          Pod from the Service endpoint slice — no new traffic is routed to it, but the container
          keeps running. A failing liveness probe kills the container and restarts it per{" "}
          <code>restartPolicy</code>. This is why <code>initialDelaySeconds</code> on the liveness
          probe must be longer than startup time — a liveness probe that fires too early will
          restart a healthy container that is still initializing.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A <strong>Pod is a logical host</strong>: all containers share localhost and can share
          volumes. The sidecar, ambassador, and adapter patterns exploit this.
        </li>
        <li>
          <strong>Never create Pods directly</strong> in production — always use Deployment,
          StatefulSet, DaemonSet, or Job so a controller can manage lifecycle.
        </li>
        <li>
          The <strong>readiness probe gates traffic</strong>; the <strong>liveness probe
          triggers restarts</strong>. They solve different problems and need different
          tuning.
        </li>
        <li>
          <strong>Memory limit exceeded = OOMKill (exit 137)</strong>;{" "}
          <strong>CPU limit exceeded = throttling</strong>. Always set both requests and limits;
          Guaranteed QoS (requests == limits) gives highest eviction protection.
        </li>
        <li>
          <strong>StatefulSets preserve Pod identity and PVCs</strong> across restarts. PVCs are
          not deleted when a StatefulSet is deleted — you must clean them up manually.
        </li>
        <li>
          <strong>CronJob API is <code>batch/v1</code></strong> (not <code>batch/v1beta1</code>,
          which was removed in v1.25). Set <code>concurrencyPolicy: Forbid</code> for idempotent
          safety.
        </li>
      </ul>
    </div>
  );
}
