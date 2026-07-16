import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const schedulingPipelineDiagram = String.raw`flowchart TD
  QUEUE["Priority Queue\n(unscheduled Pods)"]
  FILTER["Filter Phase\n▸ NodeSelector\n▸ NodeAffinity (required)\n▸ Taints/Tolerations\n▸ Resource fit\n▸ Pod affinity\n▸ Volume topology"]
  SCORE["Score Phase\n▸ NodeAffinity (preferred)\n▸ Pod affinity (preferred)\n▸ LeastAllocated\n▸ ImageLocality\n▸ TopologySpreadConstraints"]
  BEST["Select highest-score node"]
  BIND["Bind: set Pod.spec.nodeName"]

  QUEUE --> FILTER
  FILTER -->|"feasible nodes"| SCORE
  SCORE --> BEST
  BEST --> BIND
  FILTER -->|"zero nodes pass"| PENDING["Pod stays Pending\n(check Events for reason)"]`;

const taintTolerationDiagram = String.raw`flowchart LR
  subgraph "Node: gpu-node-1"
    T1["Taint: nvidia.com/gpu=present:NoSchedule"]
    G["GPU workloads (tolerate the taint)"]
    NG["Regular Pods (no toleration) — BLOCKED"]
    T1 --> G
    T1 -. "rejected" .-> NG
  end
  subgraph "Node: spot-node-2"
    T2["Taint: spot=true:NoExecute"]
    SP["Pods with spot toleration"]
    NSP["Pods without toleration — EVICTED"]
    T2 --> SP
    T2 -. "evicted if running" .-> NSP
  end`;

const affinityVsNodeSelectorDiagram = String.raw`flowchart TD
  Q["Where should this Pod run?"]
  Q --> NS["NodeSelector\nHard requirement by label\ne.g. disktype=ssd"]
  Q --> RNA["requiredDuringSchedulingIgnoredDuringExecution\n(required affinity)\nRicher label expressions\nfails scheduling if not matched"]
  Q --> PNA["preferredDuringSchedulingIgnoredDuringExecution\n(preferred affinity)\nSoft preference with weight\nnever blocks scheduling"]
  NS -->|"upgrade path"| RNA`;

export const toc: TocItem[] = [
  { id: "scheduling-overview", title: "How the Scheduler Decides", level: 2 },
  { id: "scheduling-pipeline", title: "Filter and Score Pipeline", level: 3 },
  { id: "resource-requests-limits", title: "Resource Requests and Limits in Depth", level: 2 },
  { id: "qos-classes", title: "QoS Classes and Eviction", level: 3 },
  { id: "node-selector-affinity", title: "NodeSelector and Node Affinity", level: 2 },
  { id: "pod-affinity", title: "Pod Affinity and Anti-Affinity", level: 3 },
  { id: "taints-tolerations", title: "Taints and Tolerations", level: 2 },
  { id: "topology-spread", title: "Topology Spread Constraints", level: 2 },
  { id: "priority-preemption", title: "Priority and Preemption", level: 2 },
  { id: "comparison-table", title: "Placement Controls Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SchedulingAndResourceManagement() {
  return (
    <div className="article-content">
      <p>
        The scheduler is where Kubernetes&apos; economics play out. Set resource requests too
        low and you overcommit nodes until they OOMKill your Pods. Set them too high and you
        waste capacity. Choose the wrong affinity rules and your three-replica Deployment lands
        all Pods on the same node, defeating redundancy. This module gives you the mental model
        to make scheduling work for your workloads rather than against them.
      </p>

      <h2 id="scheduling-overview">How the Scheduler Decides</h2>
      <p>
        The default Kubernetes scheduler runs as a control plane component and watches for Pods
        with no <code>spec.nodeName</code>. For each such Pod, it runs a two-phase pipeline:
        filter (eliminate nodes that cannot run the Pod) then score (rank remaining nodes and
        pick the best). The scheduler is extensible via the Scheduling Framework — you can write
        custom filter/score plugins.
      </p>

      <MermaidDiagram
        chart={schedulingPipelineDiagram}
        title="Kubernetes Scheduling Pipeline"
        caption="A Pod stuck in Pending always means it failed the Filter phase — zero nodes passed all constraints. Run kubectl describe pod to see the specific filter that rejected all nodes (usually resource exhaustion, taint mismatch, or affinity conflict)."
        minHeight={420}
      />

      <h3 id="scheduling-pipeline">Filter and Score Pipeline</h3>
      <p>
        The <strong>Filter phase</strong> is binary — a node either passes or fails. Common
        filter plugins: NodeResourcesFit (do requests fit?), TaintToleration (does the Pod
        tolerate all node taints?), NodeAffinity (required rules), VolumeTopology (can the
        volume attach to this node?), PodAffinity (required inter-Pod constraints).
      </p>
      <p>
        The <strong>Score phase</strong> runs only on nodes that passed filtering. Each plugin
        assigns a score 0–100 and weights are applied. Plugins include: LeastAllocated
        (prefer nodes with more free resources), NodeAffinity (preferred rules), ImageLocality
        (prefer nodes that already have the container image cached), and
        TopologySpreadConstraints (preferred spread).
      </p>

      <h2 id="resource-requests-limits">Resource Requests and Limits in Depth</h2>
      <p>
        <strong>Requests</strong> are used by the scheduler to find a fitting node. The
        scheduler sums up all container requests on a node and checks if the new Pod&apos;s
        requests fit within the node&apos;s allocatable capacity. Requests are a scheduling
        hint, not a hard runtime enforcement.
      </p>
      <p>
        <strong>Limits</strong> are enforced at runtime by the Linux kernel (via cgroups). CPU
        limits are enforced by CPU bandwidth control — the container is throttled when it
        exceeds its limit. Memory limits are enforced by the OOM killer — the container is
        killed when it exceeds its limit.
      </p>

      <CodeBlock
        code={`# Node allocatable capacity is not the same as total capacity
# Allocatable = Total - Reserved (kube-reserved + system-reserved + eviction threshold)
kubectl describe node <node-name> | grep -A10 "Allocatable"

# Check actual resource usage vs requests
kubectl top nodes
kubectl top pods --containers

# Find pods that have been throttled (high CPU throttling = requests set too low relative to real usage)
# Check CPU throttling in container metrics (requires metrics-server or Prometheus)

# A useful resource sizing heuristic:
# Set requests to P50 usage under normal load
# Set limits to P99 usage under peak load
# Avoid setting CPU limits too tight — CPU throttling is invisible and causes latency spikes

# Namespaced defaults via LimitRange (prevents BestEffort Pods)
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:           # applied when no limits are set
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:    # applied when no requests are set
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "4Gi"`}
        lang="yaml"
        filename="resource-management.yaml"
      />

      <h3 id="qos-classes">QoS Classes and Eviction</h3>
      <p>
        Kubernetes assigns a <strong>Quality of Service class</strong> to each Pod based on
        its resource configuration. This class determines eviction priority when a node is
        under memory pressure — lower QoS Pods are evicted first.
      </p>

      <ArticleTable
        caption="QoS classes determine eviction order — Guaranteed Pods are last to be evicted under node memory pressure."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>QoS Class</th>
              <th>Condition</th>
              <th>Eviction priority</th>
              <th>Production guidance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Guaranteed</strong></td>
              <td>requests == limits for all containers (CPU + memory)</td>
              <td>Last (highest priority)</td>
              <td>Use for critical workloads, databases, low-latency services</td>
            </tr>
            <tr>
              <td><strong>Burstable</strong></td>
              <td>requests &lt; limits (at least one container)</td>
              <td>Middle</td>
              <td>Most web services — can burst during traffic spikes</td>
            </tr>
            <tr>
              <td><strong>BestEffort</strong></td>
              <td>No requests or limits set on any container</td>
              <td>First (lowest priority)</td>
              <td>Avoid in production — evicted under any memory pressure</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="node-selector-affinity">NodeSelector and Node Affinity</h2>
      <p>
        <strong>NodeSelector</strong> is the simplest placement constraint: a map of labels
        that the target node must have. It is an exact match and uses AND semantics (all labels
        must match). Use it for simple cases; <strong>nodeAffinity</strong> replaces it for
        anything more complex.
      </p>

      <MermaidDiagram
        chart={affinityVsNodeSelectorDiagram}
        title="NodeSelector vs Node Affinity"
        caption="Use nodeAffinity over nodeSelector for any real production constraint — it supports In, NotIn, Exists, DoesNotExist operators and allows preferred (soft) rules that never block scheduling."
        minHeight={320}
      />

      <CodeBlock
        code={`spec:
  affinity:
    nodeAffinity:
      # REQUIRED: Pod won't schedule if no node matches
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values: ["us-east-1a", "us-east-1b"]  # must be in one of these AZs
              - key: node.kubernetes.io/instance-type
                operator: NotIn
                values: ["t3.micro", "t3.small"]        # exclude cheap instances

      # PREFERRED: soft hint, Pod still schedules if not satisfied
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 80    # higher weight = stronger preference
          preference:
            matchExpressions:
              - key: disktype
                operator: In
                values: ["ssd"]
        - weight: 20
          preference:
            matchExpressions:
              - key: cloud.google.com/gke-spot
                operator: DoesNotExist  # prefer non-spot nodes`}
        lang="yaml"
        filename="node-affinity.yaml"
      />

      <h3 id="pod-affinity">Pod Affinity and Anti-Affinity</h3>
      <p>
        Pod affinity allows you to co-locate Pods (e.g., a web server near its cache) or
        spread them apart (anti-affinity to ensure replicas land on different nodes/AZs).
        The <code>topologyKey</code> defines the boundary — <code>kubernetes.io/hostname</code>{" "}
        means same node; <code>topology.kubernetes.io/zone</code> means same AZ.
      </p>

      <CodeBlock
        code={`spec:
  affinity:
    podAntiAffinity:
      # REQUIRED anti-affinity: no two replicas on the same node
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: api          # same label as this Deployment
          topologyKey: kubernetes.io/hostname   # node-level separation

      # PREFERRED anti-affinity: try to spread across AZs
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: api
            topologyKey: topology.kubernetes.io/zone`}
        lang="yaml"
        filename="pod-anti-affinity.yaml"
      />

      <h2 id="taints-tolerations">Taints and Tolerations</h2>
      <p>
        <strong>Taints</strong> are placed on nodes to repel Pods. A Pod must have a matching
        <strong>toleration</strong> to be scheduled on a tainted node. This is the inverse of
        affinity: affinity attracts, taints repel.
      </p>
      <p>
        Taint effects: <code>NoSchedule</code> (prevent new Pods without toleration),{" "}
        <code>PreferNoSchedule</code> (soft, try to avoid), <code>NoExecute</code> (evict
        existing Pods without toleration + prevent new ones).
      </p>

      <MermaidDiagram
        chart={taintTolerationDiagram}
        title="Taints Repel Pods Without Matching Tolerations"
        caption="NoExecute taints evict existing Pods that lack the toleration. This is how node conditions (NotReady, DiskPressure) trigger eviction — the node lifecycle controller adds NoExecute taints when the node is unhealthy."
        minHeight={300}
      />

      <CodeBlock
        code={`# Taint a node (reserve it for GPU workloads)
kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule

# Remove a taint
kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule-

# Pod that can be scheduled on the GPU node:
spec:
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: present
      effect: NoSchedule

# Tolerate spot node eviction (common AWS pattern)
spec:
  tolerations:
    - key: spot
      operator: Equal
      value: "true"
      effect: NoExecute
      tolerationSeconds: 60  # stay for 60s after taint is applied (graceful drain)`}
        lang="yaml"
        filename="taints-tolerations.yaml"
      />

      <h2 id="topology-spread">Topology Spread Constraints</h2>
      <p>
        <strong>TopologySpreadConstraints</strong> (GA since v1.19) is the modern way to spread
        Pods evenly across zones or nodes. It replaces complex anti-affinity rules with a
        declarative spread specification. The <code>maxSkew</code> parameter controls how much
        imbalance is allowed between topology domains.
      </p>

      <CodeBlock
        code={`spec:
  topologySpreadConstraints:
    # Spread Pods evenly across zones (max 1 difference between zones)
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule  # hard: block if spread can't be satisfied
      labelSelector:
        matchLabels:
          app: api

    # Also spread evenly across nodes within zones
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: ScheduleAnyway  # soft: prefer spread but don't block
      labelSelector:
        matchLabels:
          app: api
# whenUnsatisfiable: DoNotSchedule = hard constraint (like required affinity)
# whenUnsatisfiable: ScheduleAnyway = soft constraint (like preferred affinity)`}
        lang="yaml"
        filename="topology-spread.yaml"
      />

      <h2 id="priority-preemption">Priority and Preemption</h2>
      <p>
        <strong>PriorityClasses</strong> assign a numeric priority to Pods. When a high-priority
        Pod cannot be scheduled (no fitting node), the scheduler may{" "}
        <strong>preempt</strong> (evict) lower-priority Pods to make room. This is the mechanism
        that lets critical system components jump the queue.
      </p>

      <CodeBlock
        code={`# Create a PriorityClass
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000    # higher value = higher priority
globalDefault: false
description: "For critical production services"
---
# Use it in a Pod
spec:
  priorityClassName: high-priority
  containers:
    - name: critical-service
      image: my-service:v2

# Built-in system priority classes (do not use for your workloads):
# system-cluster-critical (value: 2000000000) — coredns, kube-proxy
# system-node-critical (value: 2000001000) — kubelet, kube-apiserver static pods`}
        lang="yaml"
        filename="priority-class.yaml"
      />

      <h2 id="comparison-table">Placement Controls Comparison</h2>

      <ArticleTable
        caption="Use the right placement primitive for your goal — combining multiple constraints unnecessarily makes scheduling complex and hard to debug."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>Direction</th>
              <th>Hardness</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>NodeSelector</strong></td>
              <td>Pod → Node</td>
              <td>Hard</td>
              <td>Simple label matching (prefer nodeAffinity for new code)</td>
            </tr>
            <tr>
              <td><strong>NodeAffinity (required)</strong></td>
              <td>Pod → Node</td>
              <td>Hard</td>
              <td>Pin to specific instance types, AZs, or hardware features</td>
            </tr>
            <tr>
              <td><strong>NodeAffinity (preferred)</strong></td>
              <td>Pod → Node</td>
              <td>Soft</td>
              <td>Prefer SSDs, prefer on-demand over spot</td>
            </tr>
            <tr>
              <td><strong>PodAffinity</strong></td>
              <td>Pod → Pod</td>
              <td>Hard or soft</td>
              <td>Co-locate web server with its Redis cache</td>
            </tr>
            <tr>
              <td><strong>PodAntiAffinity</strong></td>
              <td>Pod ≠ Pod</td>
              <td>Hard or soft</td>
              <td>Spread replicas across nodes/AZs</td>
            </tr>
            <tr>
              <td><strong>Taints/Tolerations</strong></td>
              <td>Node → Pod (repel)</td>
              <td>Hard or evict</td>
              <td>Reserve GPU nodes, isolate spot nodes, cordon for maintenance</td>
            </tr>
            <tr>
              <td><strong>TopologySpreadConstraints</strong></td>
              <td>Pod spread</td>
              <td>Hard or soft</td>
              <td>Even zone/node spread for HA — modern replacement for anti-affinity</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is the difference between taints/tolerations and affinity?'"
        intro="These are often confused. The key is the direction: affinity is a Pod saying where it wants to go; taints are a node saying who is allowed."
        steps={[
          "Lead with direction: affinity is a Pod expressing a preference or requirement for nodes (or other Pods). Taints are a node expressing a repulsion — 'do not schedule here unless you tolerate this.'",
          "Explain the use cases: taints are used to dedicate nodes (GPU nodes, spot nodes, control plane nodes). Affinity is used to express workload requirements (I need SSD, I need to be in us-east-1a).",
          "Give the common combined pattern: taint a GPU node with NoSchedule, then use required nodeAffinity to pin GPU workloads to those nodes. Taint keeps general workloads off; affinity brings GPU workloads specifically to those nodes.",
          "Name the NoExecute effect: unlike NoSchedule, NoExecute evicts running Pods that lack the toleration. This is how Kubernetes handles node failures — it taints the node NotReady:NoExecute and evicts Pods that cannot tolerate it.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'My 3-replica Deployment has all 3 Pods on the same node. How do I fix it?'"
        intro="This is a common production incident question — all replicas on one node defeats the purpose of having replicas."
        steps={[
          "Explain why it happens: the scheduler&apos;s default behavior prefers balanced resource usage but does not guarantee Pod spread across nodes. If one node has a lot of free capacity, all Pods can land there.",
          "First fix (modern): use TopologySpreadConstraints with maxSkew: 1 and topologyKey: kubernetes.io/hostname with whenUnsatisfiable: DoNotSchedule. This is the cleanest solution.",
          "Alternative: requiredDuringSchedulingIgnoredDuringExecution podAntiAffinity with topologyKey: kubernetes.io/hostname. This is harder — if you only have 2 nodes but 3 replicas, scheduling fails.",
          "Zone spread: for HA, add a second TopologySpreadConstraint for topology.kubernetes.io/zone with whenUnsatisfiable: DoNotSchedule to spread across AZs.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Design a HA Scheduling Configuration"
        scenario={
          <>
            You have a 6-node Kubernetes cluster spread across 3 AZs (2 nodes per AZ). You
            need to deploy a stateless API with 6 replicas. Requirements: (1) no two replicas
            on the same node, (2) at least 2 replicas per AZ, (3) prefer nodes with SSD
            storage, (4) never schedule on nodes reserved for batch workloads (tainted with{" "}
            <code>batch=true:NoSchedule</code>).
          </>
        }
        tasks={[
          "Write the complete affinity/spread/toleration configuration that satisfies all four requirements.",
          "Explain what happens if one of the 6 nodes fails. Will all 6 replicas still be schedulable?",
          "If you changed the replica count to 7, what would happen with your current configuration?",
          "How would you verify that your spread constraints are working after deployment?",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`spec:
  replicas: 6
  template:
    spec:
      # Requirement 3: prefer SSD nodes (soft)
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: disktype
                    operator: In
                    values: ["ssd"]

        # Requirement 1: no two replicas on same node (hard)
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: api
              topologyKey: kubernetes.io/hostname

      # Requirement 2: at least 2 replicas per AZ (maxSkew 1 across 3 AZs with 6 pods = 2 per AZ)
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api

      # Requirement 4: no toleration = won't be scheduled on batch nodes
      # (batch nodes have NoSchedule taint — without toleration, Pods are rejected)
      # No tolerations needed — the absence of toleration is sufficient`}
          lang="yaml"
          filename="ha-scheduling.yaml"
        />
        <p>
          <strong>Node failure scenario:</strong> If 1 node fails, you have 5 nodes across 3 AZs
          (one AZ has 1 node, two AZs have 2 nodes). With 6 replicas and maxSkew: 1 across 3 AZs,
          the constraint allows a 2-2-2 or 2-2-1 distribution. However, podAntiAffinity requires
          1 Pod per node — with only 5 nodes and 6 replicas, one Pod will be Pending. The fifth node
          in the failed AZ cannot accommodate 2 Pods on 1 node due to the anti-affinity rule.
        </p>
        <p>
          <strong>7 replicas:</strong> With 6 nodes and hard podAntiAffinity (one per node), a
          7th replica cannot be scheduled — it would stay Pending forever. The anti-affinity
          constraint is a hard limit.
        </p>
        <CodeBlock
          code={`# Verify spread after deployment
kubectl get pods -l app=api -o wide   # shows which node each Pod is on
# Check zone distribution:
kubectl get pods -l app=api -o jsonpath='{range .items[*]}{.spec.nodeName}{"\n"}{end}' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}'`}
          lang="bash"
          filename="verify-spread.sh"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Requests drive scheduling; limits drive runtime enforcement.</strong> CPU limits
          cause throttling (not kill). Memory limits cause OOMKill. Set both deliberately.
        </li>
        <li>
          <strong>QoS class determines eviction order:</strong> Guaranteed (last) → Burstable →
          BestEffort (first). Use Guaranteed for critical services.
        </li>
        <li>
          <strong>Taints repel; affinity attracts.</strong> They solve complementary problems.
          Combined (taint GPU node + GPU Pod affinity), they create dedicated node pools.
        </li>
        <li>
          <strong>TopologySpreadConstraints is the modern spread mechanism</strong> — more
          declarative and predictable than podAntiAffinity for HA spreading across nodes/AZs.
        </li>
        <li>
          <strong>Hard constraints can cause Pending Pods</strong> — required affinity, hard
          podAntiAffinity, and DoNotSchedule spread can all prevent scheduling if no node
          satisfies all constraints simultaneously. Use preferred (soft) rules when in doubt.
        </li>
        <li>
          <strong>NoExecute taints evict running Pods.</strong> This is how Kubernetes responds
          to node health conditions — avoid setting long tolerationSeconds on critical Pods.
        </li>
      </ul>
    </div>
  );
}
