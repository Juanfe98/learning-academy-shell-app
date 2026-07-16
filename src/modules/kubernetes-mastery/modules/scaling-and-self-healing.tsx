import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const hpaLoopDiagram = String.raw`sequenceDiagram
  participant MS as metrics-server
  participant HPA as HPA controller
  participant API as kube-apiserver
  participant D as Deployment

  loop every 15s (default)
    HPA->>MS: fetch currentMetrics for target Pods
    MS-->>HPA: avg CPU = 75%
    HPA->>HPA: desiredReplicas = ceil(current * (75/50)) = 3→4
    HPA->>API: patch Deployment replicas: 4
    API->>D: scale up
  end
  Note over HPA: scale-down delayed by stabilizationWindowSeconds (300s default)
  Note over HPA: scale-up delayed by stabilizationWindowSeconds (0s default = immediate)`;

const scalingDecisionDiagram = String.raw`flowchart TD
  Q["What needs to scale?"]
  Q --> CPU["CPU / Memory\n→ HPA with metrics-server"]
  Q --> CUSTOM["Custom / external metrics\n(request queue depth, Kafka lag)\n→ HPA with custom metrics adapter\nor KEDA"]
  Q --> SCHEDULE["Predictable traffic spikes\n(known peak times)\n→ KEDA CronScaler\nor pre-scale before event"]
  Q --> NODES["Node shortage\n(Pods stuck Pending)\n→ Cluster Autoscaler / Karpenter"]
  Q --> ZERO["Scale to zero (event-driven)\n→ KEDA or Knative"]`;

const pdbDiagram = String.raw`flowchart LR
  subgraph "Without PDB"
    D1["Deployment: 3 replicas"]
    M1["kubectl drain node-1"]
    M2["kubectl drain node-2"]
    R1["All 3 Pods evicted simultaneously\nService is DOWN"]
    D1 --> M1 --> R1
    M2 --> R1
  end
  subgraph "With PDB minAvailable: 2"
    D2["Deployment: 3 replicas\nPDB: minAvailable=2"]
    M3["kubectl drain node-1"]
    M4["kubectl drain node-2\n(blocked until node-1 drain done)"]
    R2["Always 2+ Pods available\nService stays UP"]
    D2 --> M3 --> R2
    M4 --> R2
  end`;

export const toc: TocItem[] = [
  { id: "hpa-overview", title: "Horizontal Pod Autoscaling", level: 2 },
  { id: "hpa-algorithm", title: "HPA Algorithm and Behavior", level: 3 },
  { id: "hpa-custom-metrics", title: "Scaling on Custom Metrics with KEDA", level: 3 },
  { id: "vpa", title: "Vertical Pod Autoscaling (VPA)", level: 2 },
  { id: "cluster-autoscaler", title: "Cluster Autoscaler and Karpenter", level: 2 },
  { id: "pod-disruption-budgets", title: "Pod Disruption Budgets", level: 2 },
  { id: "scaling-decision-tree", title: "Scaling Decision Tree", level: 2 },
  { id: "scaling-comparison", title: "Scaling Mechanism Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ScalingAndSelfHealing() {
  return (
    <div className="article-content">
      <p>
        Kubernetes&apos; scaling story is layered: HPA scales Pods horizontally based on
        metrics, VPA adjusts resource requests over time, and the Cluster Autoscaler or
        Karpenter adds nodes when Pods cannot be scheduled. Getting all three working together
        correctly — without fighting each other — is a senior engineering challenge. This module
        covers the mechanisms, the tuning knobs, and the failure modes.
      </p>

      <h2 id="hpa-overview">Horizontal Pod Autoscaling</h2>
      <p>
        The <strong>Horizontal Pod Autoscaler (HPA)</strong> automatically scales a Deployment
        (or StatefulSet, ReplicaSet) by adjusting the replica count based on observed metrics.
        The most common metric is CPU utilization, but HPA also supports memory, custom metrics
        (via the custom.metrics.k8s.io API), and external metrics (via external.metrics.k8s.io).
      </p>

      <CodeBlock
        code={`# Simple HPA on CPU utilization
apiVersion: autoscaling/v2    # v2 is stable since Kubernetes 1.23
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50   # scale when avg CPU > 50% of requests
  # Scaling behavior tuning (v2 feature)
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0    # scale up immediately
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60            # add at most 4 Pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300  # wait 5 min before scaling down
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60            # remove at most 10% of Pods per minute`}
        lang="yaml"
        filename="hpa.yaml"
      />

      <h3 id="hpa-algorithm">HPA Algorithm and Behavior</h3>

      <MermaidDiagram
        chart={hpaLoopDiagram}
        title="HPA Control Loop"
        caption="The HPA runs every 15 seconds by default. Scale-up is immediate by default; scale-down has a 300s stabilization window to prevent flapping. Always set CPU requests on your Pods — without requests, the HPA cannot compute utilization percentage."
        minHeight={380}
      />

      <p>
        The HPA formula: <code>desiredReplicas = ceil(currentReplicas * (currentMetric / desiredMetric))</code>
      </p>
      <p>
        The most common HPA mistake: <strong>not setting CPU requests on containers</strong>.
        HPA computes CPU utilization as <em>actual usage / request</em>. Without a request, there
        is no denominator and HPA cannot function — it reports{" "}
        <code>&lt;unknown&gt;</code> for CPU utilization and does not scale.
      </p>

      <CodeBlock
        code={`# Check HPA status — always do this when investigating scaling issues
kubectl describe hpa api-hpa

# Key fields to check:
# Conditions: AbleToScale, ScalingActive, ScalingLimited
# Events: why it scaled up/down or why it didn't

# ScalingActive=False usually means:
# - No metrics available (metrics-server not running)
# - Pod has no CPU requests set
# - Target Deployment has no Pods

# Check if metrics-server is running
kubectl get pods -n kube-system | grep metrics-server
kubectl top pods   # if this works, metrics-server is healthy`}
        lang="bash"
        filename="hpa-debug.sh"
      />

      <h3 id="hpa-custom-metrics">Scaling on Custom Metrics with KEDA</h3>
      <p>
        CPU and memory are lagging indicators — traffic has already hit before CPU spikes.
        For event-driven workloads, <strong>KEDA (Kubernetes Event-Driven Autoscaling)</strong>
        lets you scale on leading indicators: Kafka consumer lag, SQS queue depth, Redis list
        length, HTTP request rate, Prometheus queries, cron schedules, and 50+ other sources.
      </p>

      <CodeBlock
        code={`# KEDA ScaledObject: scale Deployment based on Kafka consumer lag
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0      # scale to zero when no messages
  maxReplicaCount: 50
  pollingInterval: 30     # check every 30s
  cooldownPeriod: 300     # wait 5m before scaling to zero
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka:9092
        consumerGroup: order-processor
        topic: orders
        lagThreshold: "100"   # 1 Pod per 100 messages of lag`}
        lang="yaml"
        filename="keda-scaledobject.yaml"
      />

      <h2 id="vpa">Vertical Pod Autoscaling (VPA)</h2>
      <p>
        <strong>VPA (Vertical Pod Autoscaler)</strong> automatically adjusts the CPU and memory
        requests of Pods based on historical usage. This solves the &quot;I don&apos;t know
        what to set for requests&quot; problem at the cost of Pod restarts (VPA in{" "}
        <code>Auto</code> mode evicts and recreates Pods with new resource values).
      </p>
      <p>
        <strong>Critical constraint:</strong> You cannot run HPA on CPU/memory AND VPA on the
        same Deployment simultaneously — they will fight each other. Use VPA in{" "}
        <code>Off</code> mode (recommendations only) to inform your HPA targets, then switch
        to HPA for actual scaling. Or use HPA on custom metrics + VPA for resource rightsizing.
      </p>

      <CodeBlock
        code={`apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"   # Off = recommendations only, no auto-eviction
    # Auto = evict and recreate Pods with new requests (causes restarts)
    # Initial = only set on new Pods, not existing ones
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 4
          memory: 4Gi
# Check VPA recommendations:
# kubectl describe vpa api-vpa
# Look for: Recommendation → Container Recommendations → Target`}
        lang="yaml"
        filename="vpa.yaml"
      />

      <h2 id="cluster-autoscaler">Cluster Autoscaler and Karpenter</h2>
      <p>
        When Pods are stuck in Pending due to insufficient node resources, the{" "}
        <strong>Cluster Autoscaler (CA)</strong> or <strong>Karpenter</strong> adds new nodes.
        Cluster Autoscaler watches for unschedulable Pods and scales up pre-defined node groups
        (ASGs on AWS, MIGs on GCP). Karpenter is a newer alternative that provisions nodes
        directly without pre-defined node groups, choosing the optimal instance type for each
        batch of Pods.
      </p>

      <CodeBlock
        code={`# Check why Cluster Autoscaler is not scaling up
kubectl describe configmap cluster-autoscaler-status -n kube-system

# Common CA scale-up blockers:
# 1. Node group max size reached (--max-nodes exceeded)
# 2. Pod has requiredAffinity/taint that no node group can satisfy
# 3. PodDisruptionBudget blocks scale-down, preventing node reuse
# 4. Pod uses hostPort or hostNetwork (cannot share nodes)

# Karpenter: check NodeClaim and NodePool status
kubectl get nodeclaims
kubectl get nodepools
kubectl describe nodepool default   # check limits and provisioner`}
        lang="bash"
        filename="cluster-autoscaler-debug.sh"
      />

      <h2 id="pod-disruption-budgets">Pod Disruption Budgets</h2>
      <p>
        A <strong>PodDisruptionBudget (PDB)</strong> limits how many Pods in a set can be
        simultaneously unavailable during voluntary disruptions: node drains (for upgrades,
        maintenance), Cluster Autoscaler scale-downs, and manual evictions. PDBs do not
        protect against involuntary disruptions (node failure, OOMKill).
      </p>

      <MermaidDiagram
        chart={pdbDiagram}
        title="PodDisruptionBudget in Action"
        caption="Without a PDB, kubectl drain can evict all Pods simultaneously. With minAvailable: 2, Kubernetes blocks the second drain until the first draining node's Pods are rescheduled and ready — maintaining service availability."
        minHeight={300}
      />

      <CodeBlock
        code={`# PDB: at least 2 Pods must always be available
apiVersion: policy/v1    # policy/v1 stable since Kubernetes 1.21
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2        # OR: maxUnavailable: 1 (equivalent for 3 replicas)
  selector:
    matchLabels:
      app: api

# minAvailable: 2 → drain is blocked if it would bring available count below 2
# maxUnavailable: 1 → at most 1 Pod can be unavailable at any time

# Check PDB status
kubectl get pdb
# ALLOWED DISRUPTIONS column: how many Pods can currently be evicted

# A PDB with ALLOWED DISRUPTIONS = 0 blocks all drains!
# This happens when replicas == minAvailable (no room to drain)
# Fix: increase replicas or relax the PDB during maintenance`}
        lang="yaml"
        filename="pdb.yaml"
      />

      <h2 id="scaling-decision-tree">Scaling Decision Tree</h2>

      <MermaidDiagram
        chart={scalingDecisionDiagram}
        title="Which Scaling Mechanism to Use"
        caption="Start with HPA on CPU for most web services. Upgrade to custom metrics (KEDA) when CPU is a lagging indicator. Add Cluster Autoscaler / Karpenter for node-level scaling. VPA is for rightsizing resource requests, not reactive scaling."
        minHeight={320}
      />

      <h2 id="scaling-comparison">Scaling Mechanism Comparison</h2>

      <ArticleTable
        caption="Scaling mechanisms operate at different levels — combine them; do not pick just one."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>Scales what</th>
              <th>Metric source</th>
              <th>Use for</th>
              <th>Gotcha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>HPA (CPU/mem)</strong></td>
              <td>Pod replicas</td>
              <td>metrics-server</td>
              <td>Stateless web services, CPU-bound workloads</td>
              <td>Requires CPU requests; lags behind traffic spikes</td>
            </tr>
            <tr>
              <td><strong>HPA + KEDA</strong></td>
              <td>Pod replicas</td>
              <td>Kafka, SQS, Prometheus, cron, etc.</td>
              <td>Event-driven, queue-based, scheduled workloads</td>
              <td>KEDA must be installed; triggers need external access</td>
            </tr>
            <tr>
              <td><strong>VPA</strong></td>
              <td>CPU/memory requests per Pod</td>
              <td>Historical usage</td>
              <td>Rightsizing, batch jobs with variable resource needs</td>
              <td>Auto mode causes Pod restarts; conflicts with HPA on same metric</td>
            </tr>
            <tr>
              <td><strong>Cluster Autoscaler</strong></td>
              <td>Node count</td>
              <td>Unschedulable Pods</td>
              <td>Cloud clusters with node groups (EKS, GKE, AKS)</td>
              <td>Pre-defined node groups; slow to provision new nodes (~2-5min)</td>
            </tr>
            <tr>
              <td><strong>Karpenter</strong></td>
              <td>Node count + type</td>
              <td>Unschedulable Pods</td>
              <td>AWS EKS; selects optimal instance type per workload</td>
              <td>AWS-first (GCP/Azure support experimental); newer, smaller community</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How does HPA work and what are its limitations?'"
        intro="The strong answer covers the algorithm, the metrics pipeline dependency, and the scenarios where HPA is insufficient."
        steps={[
          "Explain the loop: HPA polls metrics every 15s (configurable), computes desired replicas as ceil(current * actualMetric/targetMetric), and patches the Deployment's replica count.",
          "Name the dependency chain: HPA → metrics-server → kubelet → cAdvisor. If metrics-server is down or Pods lack CPU requests, HPA shows <unknown> and stops scaling.",
          "Cover the stabilization window: scale-down has a 300s stabilization window by default. This prevents flapping but means your cluster is overprovisioned for 5 minutes after a traffic spike ends. Tune this based on your cost vs latency tradeoff.",
          "Name limitations: CPU is a lagging indicator; you've already been impacted before CPU spikes. For event-driven workloads (queues, streams), use KEDA on queue depth instead. HPA also cannot scale StatefulSets well — each Pod has its own state, so adding a replica doesn't always help immediately.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'What is a PodDisruptionBudget and when do you need one?'"
        intro="PDBs are often overlooked until a node upgrade takes down a service. Interviewers want to see you think proactively about availability."
        steps={[
          "Define it: a PDB specifies the minimum number of Pods (or max unavailable) that must be available during voluntary disruptions — node drains, Cluster Autoscaler scale-downs.",
          "Distinguish voluntary vs involuntary: PDBs only protect against voluntary disruptions (kubectl drain, eviction API). Node crashes bypass PDBs — those are involuntary.",
          "Give the production scenario: during cluster upgrades, nodes are drained one by one. Without a PDB, a 2-replica Deployment could have both Pods evicted simultaneously, causing a brief outage. With minAvailable: 1, the drain waits until the second Pod is Running before evicting the first.",
          "Gotcha: a PDB with ALLOWED DISRUPTIONS=0 blocks all drains and can prevent cluster upgrades. Always ensure replicas > minAvailable so there is room to drain.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Design a Complete Scaling Strategy"
        scenario={
          <>
            You run an e-commerce API on Kubernetes. Traffic is 100 RPM at night, 2000 RPM
            during business hours, and spikes to 10,000 RPM during flash sales (predictable,
            announced in advance). The API is backed by a Redis queue; your processing workers
            consume from the queue. Your cluster currently has 5 nodes with room for 20 more.
          </>
        }
        tasks={[
          "Design the HPA configuration for the API tier. What metric would you use and why? What min/max replicas?",
          "Design the scaling strategy for the queue workers. Why is HPA on CPU insufficient here, and what would you use instead?",
          "How would you handle the flash sale scenario where you need capacity 10 minutes before traffic hits (before CPU spikes)?",
          "Write the PDB configuration for the API tier to survive cluster node upgrades.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# API tier: HPA on CPU (CPU correlates with RPM for stateless API)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3    # survive 2 node failures during low traffic
  maxReplicas: 100  # headroom for 10x traffic spike
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60  # scale before saturation
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0   # react immediately to traffic spikes
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60           # can double every minute
    scaleDown:
      stabilizationWindowSeconds: 300  # don't scale down for 5min after spike`}
          lang="yaml"
          filename="api-hpa.yaml"
        />
        <CodeBlock
          code={`# Queue workers: KEDA on Redis queue depth
# CPU is wrong here — workers can be idle (zero CPU) with 10,000 queued messages
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
spec:
  scaleTargetRef:
    name: queue-worker
  minReplicaCount: 0      # scale to zero when queue is empty (saves cost overnight)
  maxReplicaCount: 200
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: order-queue
        listLength: "10"   # 1 worker per 10 queued items`}
          lang="yaml"
          filename="worker-keda.yaml"
        />
        <p>
          <strong>Flash sale pre-scaling:</strong> Use KEDA&apos;s CronScaler trigger to
          pre-scale 10 minutes before the announced sale. This bypasses the CPU lag problem
          entirely. Also ensure Cluster Autoscaler or Karpenter can provision nodes fast enough
          — pre-warm the node pool by keeping a few extra nodes as warm spares or use Karpenter
          with fast instance provisioning.
        </p>
        <CodeBlock
          code={`# PDB: API tier must always have 2 Pods available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api`}
          lang="yaml"
          filename="api-pdb.yaml"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>HPA requires CPU requests</strong> on containers to compute utilization.
          Without requests, HPA shows <code>&lt;unknown&gt;</code> and does not scale.
        </li>
        <li>
          <strong>CPU is a lagging metric</strong>. For queue-based and event-driven workloads,
          use KEDA to scale on queue depth or stream lag — you scale before load hits.
        </li>
        <li>
          <strong>VPA and HPA conflict on the same metric.</strong> Use VPA in{" "}
          <code>Off</code> mode for recommendations, HPA for actual scaling. Or use HPA on
          custom metrics + VPA for resource rightsizing.
        </li>
        <li>
          <strong>PodDisruptionBudgets prevent outages during node maintenance.</strong> Without
          a PDB, node drains can evict all replicas simultaneously.
        </li>
        <li>
          <strong>Cluster Autoscaler / Karpenter scale nodes</strong> when Pods are Pending.
          Always configure both Pod autoscaling and node autoscaling together.
        </li>
        <li>
          <strong>Scale-down stabilization (300s default)</strong> prevents flapping but means
          over-provisioning for 5 minutes after traffic subsides. Tune based on your
          cost vs latency tradeoff.
        </li>
      </ul>
    </div>
  );
}
