import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const clusterArchDiagram = String.raw`flowchart TD
  subgraph CP["Control Plane (master)"]
    API["kube-apiserver\n(REST gateway)"]
    ETCD["etcd\n(cluster state store)"]
    SCHED["kube-scheduler\n(Pod placement)"]
    CM["kube-controller-manager\n(reconciliation loops)"]
    CCM["cloud-controller-manager\n(cloud provider integration)"]
    API <--> ETCD
    API --> SCHED
    API --> CM
    API --> CCM
  end
  subgraph W1["Worker Node"]
    KUB1["kubelet"]
    KP1["kube-proxy"]
    CR1["container runtime\n(containerd / CRI-O)"]
    P1["Pod(s)"]
    KUB1 --> CR1
    CR1 --> P1
    KP1 --> P1
  end
  subgraph W2["Worker Node"]
    KUB2["kubelet"]
    KP2["kube-proxy"]
    CR2["container runtime"]
    P2["Pod(s)"]
    KUB2 --> CR2
    CR2 --> P2
    KP2 --> P2
  end
  API --> KUB1
  API --> KUB2`;

const reconciliationDiagram = String.raw`sequenceDiagram
  participant U as kubectl / client
  participant A as kube-apiserver
  participant E as etcd
  participant C as controller-manager
  participant S as kube-scheduler
  participant K as kubelet

  U->>A: POST /apis/apps/v1/deployments (create Deployment)
  A->>E: persist desired state
  A-->>U: 201 Created
  C->>A: watch Deployments → creates ReplicaSet + Pods (Pending)
  A->>E: persist Pod objects
  S->>A: watch unscheduled Pods → binds Pod to Node
  A->>E: update Pod.spec.nodeName
  K->>A: watch Pods for this node → pull image, start container
  K->>A: update Pod status → Running`;

const componentRoleDiagram = String.raw`flowchart LR
  subgraph "What each component owns"
    A["kube-apiserver\n▸ single source of truth\n▸ AuthN / AuthZ / Admission\n▸ all writes go through here"]
    B["etcd\n▸ Raft consensus store\n▸ all cluster state\n▸ back it up religiously"]
    C["kube-scheduler\n▸ scores nodes for each Pod\n▸ resource requests + affinity rules\n▸ pluggable scheduling framework"]
    D["controller-manager\n▸ Deployment, ReplicaSet, Job\n▸ Node lifecycle\n▸ runs reconcile loops forever"]
    E["kubelet\n▸ runs on every worker\n▸ drives container runtime (CRI)\n▸ reports node/pod health"]
    F["kube-proxy\n▸ maintains iptables / IPVS rules\n▸ implements Service ClusterIP\n▸ NOT in the data path for most CNI plugins"]
  end`;

export const toc: TocItem[] = [
  { id: "why-kubernetes", title: "Why Kubernetes Exists", level: 2 },
  { id: "cluster-anatomy", title: "Cluster Anatomy", level: 2 },
  { id: "control-plane-components", title: "Control Plane Components", level: 3 },
  { id: "worker-node-components", title: "Worker Node Components", level: 3 },
  { id: "reconciliation-loop", title: "The Reconciliation Loop", level: 2 },
  { id: "desired-vs-actual", title: "Desired State vs Actual State", level: 3 },
  { id: "api-machinery", title: "API Machinery: How kubectl Actually Works", level: 2 },
  { id: "etcd-deep-dive", title: "etcd: The Brain of the Cluster", level: 2 },
  { id: "component-comparison", title: "Component Role Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ArchitectureAndControlPlane() {
  return (
    <div className="article-content">
      <p>
        Kubernetes is a <strong>declarative cluster operating system</strong>. You describe the
        world you want — three replicas of my API, exposed on port 80 — and a fleet of control
        loops works continuously to make reality match that description. Every confusing kubectl
        behavior, every mysterious Pod restart, every networking quirk traces back to one of the
        components in this module. Build this mental model first and everything else clicks.
      </p>
      <p>
        This module targets <strong>Kubernetes v1.36</strong> (stable as of May 2026). API versions
        noted where there have been recent changes (e.g., <code>batch/v1</code> for CronJob, which
        was promoted from <code>batch/v1beta1</code> in v1.21).
      </p>

      <h2 id="why-kubernetes">Why Kubernetes Exists</h2>
      <p>
        Before Kubernetes, teams ran containers with Docker and wrote Bash scripts to restart failed
        containers, balance traffic, manage secrets, and roll out updates. Each team reinvented the
        wheel. Google open-sourced Kubernetes in 2014 based on learnings from Borg, their internal
        cluster manager that had run production workloads at planetary scale for a decade.
      </p>
      <p>
        The core insight is that <strong>infrastructure management is a control problem</strong>, not
        a scripting problem. Instead of imperatively telling machines what to do, you declare what
        you want and let software reconcile the gap forever. This model handles failures, scaling,
        and upgrades uniformly — the same reconcile loop that starts a Pod also restarts a crashed
        one.
      </p>

      <h2 id="cluster-anatomy">Cluster Anatomy</h2>
      <p>
        A Kubernetes cluster has two kinds of machines: the <strong>control plane</strong> (formerly
        called the master) which holds all cluster intelligence, and <strong>worker nodes</strong>{" "}
        which run your actual workloads. In production you run multiple control plane nodes (usually
        3 or 5) for HA; in development a single-node cluster (e.g., kind, minikube) runs everything
        on one machine.
      </p>

      <MermaidDiagram
        chart={clusterArchDiagram}
        title="Kubernetes Cluster Architecture"
        caption="The control plane components communicate exclusively through the kube-apiserver — no component talks directly to etcd except the API server. Worker nodes only talk upward to the API server, never sideways to each other via the control plane."
        minHeight={500}
      />

      <h3 id="control-plane-components">Control Plane Components</h3>
      <p>
        Each control plane component has a single, well-defined responsibility. This separation is
        what makes Kubernetes extensible — you can swap the scheduler, write custom controllers, or
        add admission webhooks without touching anything else.
      </p>

      <MermaidDiagram
        chart={componentRoleDiagram}
        title="What Each Component Owns"
        caption="Notice etcd is only reachable by the API server — this is by design. Every other component is a client of the API server, never a direct reader of etcd. This is the 'API server as single source of truth' invariant."
        minHeight={300}
      />

      <p>
        <strong>kube-apiserver</strong> is the only component that reads from and writes to etcd.
        It validates requests, runs admission webhooks, enforces RBAC, and exposes the Kubernetes
        REST API. When people say &quot;the API server is the heart of Kubernetes&quot; they mean
        it literally: every component is a client of the API server, even other control plane
        components.
      </p>
      <p>
        <strong>etcd</strong> is a distributed key-value store using the Raft consensus algorithm.
        It holds every object in the cluster — Pods, Services, ConfigMaps, Secrets, RBAC policies,
        everything. Loss of etcd without a backup means loss of the entire cluster state. In
        production, etcd runs on dedicated nodes with fast SSDs (etcd is latency-sensitive).
      </p>
      <p>
        <strong>kube-scheduler</strong> watches for Pods that have no{" "}
        <code>spec.nodeName</code> set and assigns them to nodes. It runs a scoring pipeline:
        filter nodes that cannot run the Pod (resource requests, taints, affinity rules), then score
        the remaining nodes, then pick the highest scorer. The default scheduler is pluggable via
        the scheduling framework.
      </p>
      <p>
        <strong>kube-controller-manager</strong> runs dozens of controllers in a single binary:
        the Deployment controller, ReplicaSet controller, Job controller, Node lifecycle controller,
        and many more. Each controller watches one or more resource types and reconciles actual
        state toward desired state.
      </p>

      <h3 id="worker-node-components">Worker Node Components</h3>
      <p>
        Every worker node runs three components: <strong>kubelet</strong>,{" "}
        <strong>kube-proxy</strong>, and a <strong>container runtime</strong>.
      </p>
      <p>
        <strong>kubelet</strong> is the node agent. It watches the API server for Pods scheduled
        to its node, calls the container runtime (via the Container Runtime Interface, CRI) to pull
        images and start/stop containers, and reports node and Pod status back to the API server.
        If the kubelet dies, the node goes <code>NotReady</code> and its Pods eventually get
        evicted.
      </p>
      <p>
        <strong>kube-proxy</strong> maintains the network rules (iptables or IPVS) that implement
        Service ClusterIP routing on each node. Important: most modern CNI plugins (Cilium, for
        example) bypass kube-proxy entirely using eBPF, so kube-proxy is optional in some
        configurations.
      </p>
      <p>
        <strong>Container runtime</strong>: Kubernetes removed the built-in Docker shim in v1.24.
        The standard today is <code>containerd</code> (which Docker itself uses under the hood)
        or <code>CRI-O</code>. The CRI interface means Kubernetes does not care which runtime
        you use.
      </p>

      <h2 id="reconciliation-loop">The Reconciliation Loop</h2>
      <p>
        The reconciliation loop is the most important concept in Kubernetes. Every controller
        follows the same pattern: watch resources, compute the diff between desired and actual
        state, take action to close the gap, repeat. This is why Kubernetes self-heals: the loop
        runs forever, not just at creation time.
      </p>

      <MermaidDiagram
        chart={reconciliationDiagram}
        title="What Happens When You kubectl apply a Deployment"
        caption="Notice how no single component does everything end-to-end. The Deployment controller, scheduler, and kubelet each take one step. If any step fails, it retries — the loop is designed for partial failure."
        minHeight={480}
      />

      <h3 id="desired-vs-actual">Desired State vs Actual State</h3>
      <p>
        When you <code>kubectl apply</code> a manifest, you are writing <em>desired state</em> to
        etcd via the API server. The controllers and kubelet then work asynchronously to make{" "}
        <em>actual state</em> match. This async gap is why:
      </p>
      <ul>
        <li>
          A Pod can be <code>Pending</code> for a while after you create a Deployment (scheduler
          hasn&apos;t run yet, or image is pulling)
        </li>
        <li>
          Deleting a Deployment does not instantly kill Pods — the controller sets a deletion
          timestamp and the kubelet terminates containers gracefully
        </li>
        <li>
          <code>kubectl get pods</code> can show stale state — the API server returns what&apos;s
          in etcd, which the kubelet updates on its own schedule
        </li>
      </ul>

      <CodeBlock
        code={`# The reconcile loop expressed as pseudocode (what every controller does)
for {
    desired := apiServer.get(ResourceType, name)  // read desired state from etcd
    actual  := observe()                           // observe real world (running containers, etc.)

    if desired == actual {
        continue  // nothing to do, sleep briefly
    }

    actions := diff(desired, actual)  // compute what needs to change
    for _, action := range actions {
        apply(action)  // create/update/delete resources
    }
}`}
        lang="go"
        filename="controller-pseudocode.go"
      />

      <h2 id="api-machinery">API Machinery: How kubectl Actually Works</h2>
      <p>
        <code>kubectl</code> is just an HTTP client. Every command translates to one or more REST
        calls to the API server. Understanding this demystifies a lot of Kubernetes behavior.
      </p>

      <CodeBlock
        code={`# See the actual HTTP requests kubectl makes
kubectl get pods -v=8

# kubectl apply is: GET (does it exist?) then POST (create) or PUT/PATCH (update)
# kubectl delete sets a deletionTimestamp — it does NOT immediately remove from etcd

# The API is versioned and grouped:
# /api/v1                  → core resources (Pod, Service, ConfigMap, Namespace)
# /apis/apps/v1            → Deployment, ReplicaSet, DaemonSet, StatefulSet
# /apis/batch/v1           → Job, CronJob (v1beta1 removed in 1.25)
# /apis/networking.k8s.io/v1 → Ingress, NetworkPolicy

# Check all available API groups and versions in your cluster:
kubectl api-resources
kubectl api-versions`}
        lang="bash"
      />

      <p>
        The API server enforces a strict object lifecycle: objects have a{" "}
        <strong>metadata.resourceVersion</strong> (an etcd version number) used for optimistic
        concurrency. If two clients update the same object simultaneously, one gets a 409 Conflict
        and must re-fetch before retrying. This is why controllers use the{" "}
        <code>watch</code> + <code>list</code> pattern with server-side informers rather than
        polling.
      </p>

      <h2 id="etcd-deep-dive">etcd: The Brain of the Cluster</h2>
      <p>
        etcd deserves special attention because its health directly determines cluster health.
        Production Kubernetes clusters follow the{" "}
        <strong>3-node or 5-node etcd quorum</strong> rule: you need a majority of nodes alive to
        accept writes. A 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2.
      </p>

      <CodeBlock
        code={`# Check etcd cluster health (run from a control plane node)
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

# Backup etcd (do this before any cluster upgrade!)
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key`}
        lang="bash"
        filename="etcd-ops.sh"
      />

      <p>
        etcd stores all Kubernetes objects under the <code>/registry/</code> key prefix. The values
        are protobuf-encoded by default (not JSON), so you cannot simply read them with{" "}
        <code>etcdctl get</code> without decoding. The API server handles all the encoding/decoding.
      </p>

      <h2 id="component-comparison">Component Role Comparison</h2>

      <ArticleTable
        caption="Control plane component responsibilities — understand what breaks when each one is unavailable."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Primary responsibility</th>
              <th>What breaks if it goes down</th>
              <th>Talks to</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>kube-apiserver</code></td>
              <td>REST gateway, AuthN/AuthZ, admission, state storage</td>
              <td>Everything — no changes accepted, kubectl stops working</td>
              <td>etcd (writes), all other components (they call it)</td>
            </tr>
            <tr>
              <td><code>etcd</code></td>
              <td>Persistent cluster state store</td>
              <td>API server goes read-only without quorum; cluster state lost on total failure</td>
              <td>API server only</td>
            </tr>
            <tr>
              <td><code>kube-scheduler</code></td>
              <td>Assign Pods to nodes</td>
              <td>New Pods stay Pending indefinitely; existing Pods unaffected</td>
              <td>API server (watch + update)</td>
            </tr>
            <tr>
              <td><code>controller-manager</code></td>
              <td>Reconciliation loops for all built-in resources</td>
              <td>Deployments stop reconciling; crashed Pods not replaced; scale changes ignored</td>
              <td>API server (watch + update)</td>
            </tr>
            <tr>
              <td><code>kubelet</code></td>
              <td>Run containers on the node, report status</td>
              <td>Node goes NotReady; Pods on that node eventually evicted and rescheduled</td>
              <td>API server + container runtime (CRI)</td>
            </tr>
            <tr>
              <td><code>kube-proxy</code></td>
              <td>Maintain Service routing rules (iptables/IPVS)</td>
              <td>New Service endpoints not reachable; existing connections may continue</td>
              <td>API server (watches Services, Endpoints)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Walk me through what happens when you kubectl apply a Deployment'"
        intro="This is the most common Kubernetes architecture question. A weak answer lists components; a strong answer traces the exact flow and explains the async nature."
        steps={[
          "Start with the API server: kubectl serializes the manifest and sends a POST/PUT to the API server. The API server validates it, runs admission webhooks, and writes to etcd.",
          "Name the Deployment controller: it watches for Deployment objects, computes the desired number of ReplicaSets, and creates/updates them — which in turn creates Pod objects in Pending state.",
          "Name the scheduler: it watches for Pods with no nodeName, scores nodes, and writes nodeName onto the Pod spec in etcd.",
          "Name the kubelet: it watches the API server for Pods assigned to its node, calls containerd/CRI-O to pull the image and start the container, then updates Pod status to Running.",
          "Close with the async insight: none of this is synchronous. kubectl returns immediately after the API server accepts the write. The rest happens asynchronously via watch loops.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'What is etcd and why does it matter for cluster reliability?'"
        intro="Interviewers want to know you understand the quorum model and the consequences of etcd loss."
        steps={[
          "State what it is: a distributed key-value store using Raft consensus that stores all Kubernetes object state.",
          "Explain the quorum rule: you need (n/2)+1 nodes alive to accept writes. A 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2.",
          "Name the production implication: if etcd loses quorum, the cluster goes read-only — existing Pods keep running but no changes can be made. Total etcd loss without a backup means losing the entire cluster definition.",
          "Mention backup: always snapshot etcd before cluster upgrades. etcdctl snapshot save is the standard tool.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Diagnose a Broken Control Plane"
        scenario={
          <>
            You have a 3-node Kubernetes cluster. A teammate reports that{" "}
            <code>kubectl get pods</code> returns stale data and new Deployments are not rolling
            out. However, existing Pods are still serving traffic. Your task is to diagnose and
            explain the failure.
          </>
        }
        tasks={[
          "Which component is most likely unhealthy, and why do existing Pods continue running while new changes are blocked?",
          "Write the kubectl / shell commands you would run to confirm your diagnosis.",
          "Explain the difference between a kube-scheduler failure and a controller-manager failure in terms of observable symptoms.",
          "If etcd had lost quorum entirely, how would the symptoms differ from a kube-apiserver failure?",
        ]}
      />
      <SolutionReveal>
        <p>
          <strong>Most likely cause:</strong> The <strong>kube-controller-manager</strong> or{" "}
          <strong>kube-scheduler</strong> is down, or the <strong>kube-apiserver</strong> is
          partially degraded.
        </p>
        <p>
          Existing Pods continue running because the <strong>kubelet</strong> on each worker node
          manages containers independently. The kubelet only needs the API server to sync state,
          not to keep containers alive. Once a Pod is running, the container runtime keeps it
          running regardless of control plane health.
        </p>
        <CodeBlock
          code={`# Check control plane Pod health (static Pods in kube-system)
kubectl get pods -n kube-system
kubectl describe pod kube-controller-manager-<node> -n kube-system

# Check component status (deprecated but still works for quick checks)
kubectl get componentstatuses

# Check API server logs (on the control plane node)
journalctl -u kube-apiserver
# or if running as a static Pod:
crictl logs $(crictl ps --name kube-apiserver -q)

# Check etcd health
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key`}
          lang="bash"
          filename="diagnose-control-plane.sh"
        />
        <p>
          <strong>Scheduler down:</strong> New Pods stay in <code>Pending</code> state permanently.
          Existing Pods are unaffected. Rollouts do not proceed because new Pods cannot be
          scheduled.
        </p>
        <p>
          <strong>Controller-manager down:</strong> Deployments do not reconcile — a crashed Pod
          is not replaced, a scale change has no effect, rolling updates stall. Existing Pods
          remain running.
        </p>
        <p>
          <strong>etcd quorum loss vs API server failure:</strong> If the API server is down,
          <code>kubectl</code> fails immediately with a connection error. If etcd loses quorum but
          the API server is up, <code>kubectl get</code> may still return cached/stale data but
          writes (apply, delete, scale) return 500 errors. Total etcd failure causes the API server
          to crash or return errors on all reads too.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Kubernetes is a <strong>declarative, self-healing system</strong>: every component runs a
          reconcile loop that continuously closes the gap between desired and actual state.
        </li>
        <li>
          The <strong>kube-apiserver is the only component that talks to etcd</strong>. All other
          components are API server clients. This is the single source of truth invariant.
        </li>
        <li>
          <strong>etcd health = cluster health</strong>. A 3-node etcd cluster requires 2 nodes
          alive for writes. Always back up etcd before cluster upgrades.
        </li>
        <li>
          <strong>kubelet independence</strong>: existing Pods continue running even when the
          control plane is completely down, because the kubelet drives containers directly via CRI.
        </li>
        <li>
          The Docker shim was removed in <strong>v1.24</strong>; the standard runtimes are
          containerd and CRI-O. Kubernetes talks to runtimes via the CRI interface.
        </li>
        <li>
          Understanding which component is responsible for which action (scheduler vs
          controller-manager vs kubelet) is the foundation for debugging every Kubernetes issue.
        </li>
      </ul>
    </div>
  );
}
