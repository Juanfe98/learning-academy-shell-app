import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const k8sMonitoringArchDiagram = String.raw`flowchart TB
  subgraph NODE["Every Worker Node"]
    NA["Node Agent (DaemonSet)<br/>core + process-agent + system-probe"]
    KUBELET["kubelet"]
    PODS["Pods & Containers"]
    NA -->|"reads cgroups, container<br/>runtime stats, /proc"| PODS
    NA -->|"local pod metadata"| KUBELET
  end
  API["kube-apiserver"]
  CA["Cluster Agent (Deployment,<br/>1-2 replicas for HA)"]
  KSM["kubernetes_state_core check<br/>(runs INSIDE the Cluster Agent)"]
  AC["Admission Controller<br/>(mutating + validating webhook)"]
  HPA["HorizontalPodAutoscaler"]
  INTAKE["Datadog Intake"]

  API <-->|"watches Deployments, Nodes,<br/>Services, Pods (caches metadata)"| CA
  CA --> KSM
  NA -->|"asks Cluster Agent for pod/service<br/>metadata instead of hitting API server directly"| CA
  NA -->|"host + container + pod metrics"| INTAKE
  CA -->|"cluster-level + control-plane checks"| INTAKE
  KSM -->|"kubernetes_state.* metrics"| INTAKE
  CA -->|"External Metrics API"| HPA
  API -->|"Pod CREATE/UPDATE<br/>admission review"| AC
  AC -->|"injects APM tracer, DD_ENV/SERVICE/VERSION,<br/>DogStatsD socket config"| PODS`;

const awsIntegrationDiagram = String.raw`flowchart LR
  subgraph AGENTPATH["Agent-based (EC2 / self-managed EKS node)"]
    EC2["EC2 instance<br/>Datadog Agent installed"]
    EC2 -->|"real-time push, ~15-60s<br/>host + process + container metrics"| INTAKE1["Datadog Intake"]
  end
  subgraph CLOUDPATH["AWS Integration (agentless)"]
    IAM["Read-only IAM role<br/>(sts:AssumeRole)"]
    CW["CloudWatch API crawler<br/>ListMetrics / GetMetricData<br/>(polling)"]
    STREAM["CloudWatch Metric Streams<br/>+ Kinesis Data Firehose<br/>(push)"]
    RES["Resource APIs<br/>(EC2, RDS, Lambda tags &amp; config)"]
    IAM --> CW
    IAM --> STREAM
    IAM --> RES
    CW -->|"~15-20 min delay<br/>(poll interval + CloudWatch lag)"| INTAKE2["Datadog Intake"]
    STREAM -->|"~2-3 min delay"| INTAKE2
    RES -->|"tags &amp; metadata only"| INTAKE2
  end`;

const hierarchyDiagram = String.raw`flowchart TD
  HOST["Host<br/>tags: host, availability-zone, instance-type"]
  CONTAINER["Container<br/>tags: image_name, container_name,<br/>docker_image, short_image"]
  POD["Pod<br/>tags: pod_name, kube_namespace,<br/>kube_deployment, kube_service"]
  NODE["Kubernetes Node<br/>tags: kube_cluster_name, host"]
  ORCH["Orchestrator Explorer<br/>tags: kube_cluster_name, kube_namespace,<br/>kube_condition_*"]

  HOST -->|"runs"| CONTAINER
  CONTAINER -->|"belongs to"| POD
  POD -->|"scheduled on"| NODE
  NODE -->|"member of"| ORCH
  HOST -.->|"host tags auto-inherited<br/>by every container it runs"| CONTAINER
  POD -.->|"pod labels/annotations<br/>auto-imported as tags"| ORCH`;

const autodiscoverySeqDiagram = String.raw`sequenceDiagram
  participant Agent as Node Agent
  participant Kubelet as kubelet /pods
  participant Templates as Config sources
  participant Check as Integration Check

  loop every ~10s
    Agent->>Kubelet: list running pods/containers on this node
    Kubelet-->>Agent: pod specs (labels, annotations, image)
    Agent->>Agent: derive container identifier<br/>(image name or ad.datadoghq.com annotation)
    Agent->>Templates: resolve config template<br/>(annotation over auto_conf.yaml over defaults)
    Templates-->>Agent: check config (instance, tags)
    Agent->>Check: schedule or unschedule check
  end`;

export const toc: TocItem[] = [
  { id: "why-infra-monitoring", title: "Why Infrastructure Monitoring Is the Foundation", level: 2 },
  { id: "host-level-monitoring", title: "Host-Level Monitoring", level: 2 },
  { id: "host-map-infra-list", title: "The Host Map and Infrastructure List", level: 3 },
  { id: "core-checks", title: "System, Network, and Disk Core Checks", level: 3 },
  { id: "live-processes", title: "Live Processes", level: 2 },
  { id: "container-monitoring", title: "Container Monitoring", level: 2 },
  { id: "live-containers", title: "Live Containers and Container Metrics", level: 3 },
  { id: "autodiscovery", title: "Autodiscovery: How the Agent Finds Containers", level: 3 },
  { id: "kubernetes-monitoring", title: "Kubernetes Monitoring — The Centerpiece", level: 2 },
  { id: "daemonset-vs-cluster-agent", title: "Node Agent (DaemonSet) vs Cluster Agent", level: 3 },
  { id: "kube-state-metrics", title: "kube-state-metrics and the Orchestrator Explorer", level: 3 },
  { id: "external-metrics-hpa", title: "External Metrics and the Admission Controller", level: 3 },
  { id: "control-plane-monitoring", title: "Control Plane and Tag Enrichment", level: 3 },
  { id: "helm-install", title: "Installing With Helm", level: 3 },
  { id: "cloud-integrations", title: "Cloud Integrations: AWS, GCP, Azure", level: 2 },
  { id: "aws-integration", title: "The AWS Integration", level: 3 },
  { id: "gcp-azure", title: "GCP and Azure Integrations", level: 3 },
  { id: "agent-vs-agentless", title: "Agent-Based vs Agentless: The Real Tradeoff", level: 3 },
  { id: "network-monitoring", title: "Network Performance Monitoring and DNS", level: 2 },
  { id: "serverless-nod", title: "A Brief Nod to Serverless", level: 2 },
  { id: "surface-comparison", title: "Monitoring Surface Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function InfrastructureAndContainers() {
  return (
    <div className="article-content">
      <p>
        Every dashboard, monitor, and APM trace in Datadog sits on top of one layer that has to be
        rock solid first: knowing what infrastructure exists, whether it is healthy, and how it
        relates to everything else. A trace is useless if you cannot pivot from &quot;this span is
        slow&quot; to &quot;this pod, on this node, in this AWS account, is starved for CPU.&quot;
        Infrastructure and container monitoring is that connective tissue — and in a Kubernetes
        shop, it is also the single most interview-tested part of the Datadog product surface.
      </p>
      <p>
        This module covers bare hosts, Docker, and Kubernetes — then layers in the cloud provider
        integrations (AWS, GCP, Azure) that fill the gaps the Agent physically cannot reach. Facts
        here are verified against the official docs at{" "}
        <code>docs.datadoghq.com</code> and the current{" "}
        <code>DataDog/helm-charts</code> chart source; Helm keys are quoted exactly as they appear
        in the chart, with their documented defaults called out explicitly, since several of them
        (metrics provider, log collection, process collection) are <strong>opt-in, not
        automatic</strong>.
      </p>

      <h2 id="why-infra-monitoring">Why Infrastructure Monitoring Is the Foundation</h2>
      <p>
        Application performance problems are almost always infrastructure problems wearing a
        disguise. A slow checkout endpoint might be a bad query — or it might be a node under
        memory pressure evicting pods, a noisy neighbor container stealing CPU shares, or a DNS
        resolver silently retrying. Without host, container, and orchestrator visibility, APM traces
        tell you <em>what</em> is slow but not <em>why</em>. Infrastructure monitoring is what lets
        you correlate a latency spike with a specific node&apos;s <code>system.cpu.iowait</code> or
        a specific pod hitting its memory limit and getting OOMKilled.
      </p>

      <h2 id="host-level-monitoring">Host-Level Monitoring</h2>
      <p>
        Host monitoring is the oldest and simplest layer: install the Agent on a machine, and it
        immediately starts reporting system metrics with zero extra configuration.
      </p>

      <CodeBlock
        code={`# Official one-line Linux install (Agent 7.x, US1 site)
DD_API_KEY=<YOUR_DD_API_KEY> DD_SITE="datadoghq.com" \\
  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"

# Assign host tags at install time
DD_API_KEY=<YOUR_DD_API_KEY> DD_SITE="datadoghq.com" DD_HOST_TAGS="env:prod,team:payments" \\
  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"`}
        lang="bash"
        filename="install-agent.sh"
      />

      <p>
        Host tags can also be set permanently in the Agent&apos;s config file. Tags set here apply
        to <strong>every</strong> metric, log, and trace the Agent forwards from that host — this is
        how a slow trace on a host inherits that host&apos;s <code>availability-zone</code> or{" "}
        <code>team</code> tag without any application code changes.
      </p>

      <CodeBlock
        code={`# /etc/datadog-agent/datadog.yaml
api_key: <YOUR_DD_API_KEY>
site: datadoghq.com
tags:
  - "env:prod"
  - "team:payments"
  - "availability-zone:us-east-1a"`}
        lang="yaml"
        filename="datadog.yaml"
      />

      <h3 id="host-map-infra-list">The Host Map and Infrastructure List</h3>
      <p>
        The <strong>Host Map</strong> renders every reporting host as a tile, sized and colored by a
        metric you choose (CPU, memory, a custom metric) — it is the fastest way to spot &quot;the
        one host that is different&quot; in a fleet of thousands. The{" "}
        <strong>Infrastructure List</strong> is the tabular counterpart: filterable by cloud
        provider, region, instance type, OS, Agent version, and any tag, with quick filters for
        common pivots. Both views are driven by the same host tag data — a host with incomplete
        tags is a host that is hard to find later, which is why tagging discipline at install time
        pays off during every incident that follows.
      </p>

      <h3 id="core-checks">System, Network, and Disk Core Checks</h3>
      <p>
        Three checks ship inside the Agent package with no extra configuration and start running
        the moment the Agent starts:
      </p>
      <ul>
        <li>
          <strong>System check</strong> — CPU (<code>system.cpu.user</code>,{" "}
          <code>system.cpu.system</code>, <code>system.cpu.iowait</code>), memory (
          <code>system.mem.used</code>, <code>system.mem.free</code>), load average, and uptime.
        </li>
        <li>
          <strong>Network check</strong> — <code>system.net.bytes_rcvd</code>,{" "}
          <code>system.net.bytes_sent</code>, TCP retransmits, connection counts, tagged per
          network device.
        </li>
        <li>
          <strong>Disk check</strong> — <code>system.disk.used</code>,{" "}
          <code>system.disk.free</code>, inode usage, tagged with <code>device:&lt;NAME&gt;</code>{" "}
          for every mounted volume.
        </li>
      </ul>
      <p>
        All system metrics are automatically tagged with <code>host:&lt;HOSTNAME&gt;</code>, which
        is exactly the tag that lets every other layer — containers, pods, traces — inherit host
        identity for free.
      </p>

      <h2 id="live-processes">Live Processes</h2>
      <p>
        <strong>Live Processes</strong> gives you a real-time, per-process view of resource usage on
        a host — CPU, memory, and open file descriptors per PID, with an automatically generated{" "}
        <code>command</code> tag (e.g. <code>command:mongod</code>) so you can filter for a specific
        workload across the whole fleet. This is the layer that answers &quot;something on this box
        is eating all the CPU — which process, exactly?&quot; without SSHing in and running{" "}
        <code>top</code>.
      </p>
      <p>
        In the Helm chart, process collection is <strong>not enabled by default</strong> — you have
        to opt in explicitly:
      </p>
      <CodeBlock
        code={`datadog:
  processAgent:
    enabled: true            # runs the process agent at all
    processCollection: true  # actually collects and reports live process data (default: false)`}
        lang="yaml"
        filename="values.yaml"
      />
      <p>
        Live Processes is also the layer that stitches a process to its container: a process
        running inside a container carries that container&apos;s tags, which carry that pod&apos;s
        tags, which carry that node&apos;s tags — the hierarchy explored later in this module.
      </p>

      <h2 id="container-monitoring">Container Monitoring</h2>
      <p>
        Once workloads move into containers, &quot;the host is healthy&quot; stops being a useful
        signal — a host can look fine in aggregate while one container on it is throttled,
        restarting, or leaking memory. Container monitoring exists to give each container its own
        identity, metrics, and lifecycle.
      </p>

      <h3 id="live-containers">Live Containers and Container Metrics</h3>
      <p>
        <strong>Live Containers</strong> is the real-time view: every running container across your
        fleet, with CPU, memory, network I/O, and restart counts refreshed roughly every two
        seconds. Metrics are read directly from the container runtime — the Docker Engine API or
        containerd&apos;s CRI metrics endpoint — so no instrumentation inside the container image is
        required. Container CPU is reported both as a percentage of the container&apos;s own limit
        and as a share of total host CPU, which is the distinction that catches people: a container
        can be at 100% of <em>its own</em> CPU limit while the host is nearly idle, and that&apos;s
        throttling, not a host capacity problem.
      </p>

      <h3 id="autodiscovery">Autodiscovery: How the Agent Finds Containers</h3>
      <p>
        Containers are ephemeral — a fixed <code>datadog.yaml</code> listing every service to
        monitor would be stale within minutes. <strong>Autodiscovery</strong> solves this: a
        containerized Agent polls its container runtime (or the kubelet&apos;s <code>/pods</code>{" "}
        endpoint in Kubernetes) roughly every 10 seconds, derives an identifier for each container
        (its image name by default, or an explicit override), and matches that identifier against a
        config template to decide which integration check to run and which tags to attach.
      </p>

      <MermaidDiagram
        chart={autodiscoverySeqDiagram}
        title="Autodiscovery Poll Loop"
        caption="The Agent re-scans running containers on a short interval — new containers get checks scheduled automatically, and checks for containers that disappeared are torn down just as automatically."
        minHeight={340}
      />

      <p>
        Config templates can come from four places, and precedence matters — it is the first thing
        to check when a check silently isn&apos;t running:
      </p>
      <ol>
        <li>
          <strong>Kubernetes pod annotations</strong> or <strong>Docker labels</strong> (highest
          precedence — attached directly to the workload)
        </li>
        <li>
          <strong><code>auto_conf.yaml</code> templates</strong> shipped with the Agent for common
          integrations (Redis, Postgres, nginx, etc. — matched by image name automatically)
        </li>
        <li>
          A mounted config file, ConfigMap, or ConfigMap-backed template
        </li>
        <li>
          Defaults set in the Datadog Operator or Helm chart values (lowest precedence)
        </li>
      </ol>

      <CodeBlock
        code={`apiVersion: v1
kind: Pod
metadata:
  name: redis-cache
  annotations:
    ad.datadoghq.com/redis.checks: |
      {
        "redisdb": {
          "instances": [
            {"host": "%%host%%", "port": "6379"}
          ]
        }
      }
    ad.datadoghq.com/redis.logs: |
      [{"source": "redis", "service": "redis-cache"}]
spec:
  containers:
    - name: redis  # must match the container name used in the annotation key
      image: redis:7`}
        lang="yaml"
        filename="redis-pod-annotations.yaml"
      />

      <p>
        The annotation key is <code>ad.datadoghq.com/&lt;CONTAINER_NAME&gt;.checks</code> — note
        that <code>&lt;CONTAINER_NAME&gt;</code> must exactly match a container name in{" "}
        <code>spec.containers</code>. In a multi-container pod, a rename of the container that
        isn&apos;t mirrored in the annotation is a classic, silent cause of &quot;the check just
        stopped running&quot; — the Agent doesn&apos;t error, it simply finds no matching container
        and schedules nothing.
      </p>
      <p>
        Every metric, log, and trace collected from a container is automatically tagged with{" "}
        <code>container_name</code>, <code>image_name</code>, <code>short_image</code>, and (in
        Kubernetes) <code>pod_name</code> and <code>kube_namespace</code> — this is what makes it
        possible to go from &quot;this trace is slow&quot; to &quot;this container, in this pod, on
        this node&quot; in one click.
      </p>

      <h2 id="kubernetes-monitoring">Kubernetes Monitoring — The Centerpiece</h2>
      <p>
        Kubernetes is where infrastructure monitoring gets genuinely architectural. A single Agent
        design doesn&apos;t scale: if every node in a 500-node cluster independently queried the
        Kubernetes API server for pod and service metadata, the API server — the single most
        sensitive component in the control plane — would buckle under redundant read traffic.
        Datadog&apos;s answer is a <strong>two-tier agent architecture</strong>.
      </p>

      <MermaidDiagram
        chart={k8sMonitoringArchDiagram}
        title="Kubernetes Monitoring Architecture"
        caption="Node Agents (DaemonSet) never talk to the API server directly for metadata — they ask the Cluster Agent, which watches and caches on their behalf. The Cluster Agent also owns cluster-scoped responsibilities no individual node can own: the state check, external metrics, and the admission webhook."
        minHeight={560}
      />

      <h3 id="daemonset-vs-cluster-agent">Node Agent (DaemonSet) vs Cluster Agent</h3>
      <p>
        These are two different Kubernetes objects with two different jobs:
      </p>
      <ul>
        <li>
          <strong>Node Agent — DaemonSet.</strong> One pod per node, guaranteed by the DaemonSet
          controller. Collects host metrics for that node, discovers and monitors every
          container/pod scheduled on that node via Autodiscovery, and runs the process-agent and
          system-probe (for Live Processes and Network Monitoring) locally.
        </li>
        <li>
          <strong>Cluster Agent — Deployment (typically 1–2 replicas for HA).</strong> The single
          point of contact with <code>kube-apiserver</code> for cluster-wide state. It watches
          Deployments, Nodes, Services, and Pods once, caches the result, and serves metadata to
          every node Agent that asks — turning N-nodes-times-API-calls into one watch. It also owns
          everything that is inherently cluster-scoped rather than node-scoped: the cluster state
          check, the External Metrics API, and the Admission Controller.
        </li>
      </ul>
      <p>
        The reason to memorize this split: <strong>&quot;why does a Cluster Agent even exist&quot;</strong>{" "}
        is one of the most common Datadog-on-Kubernetes interview questions, and &quot;it reduces
        load on the API server by centralizing metadata collection&quot; is the correct one-sentence
        answer.
      </p>

      <h3 id="kube-state-metrics">kube-state-metrics and the Orchestrator Explorer</h3>
      <p>
        Raw container metrics (CPU, memory) tell you resource usage, but not <em>object state</em> —
        how many replicas a Deployment wants versus has, whether a Job succeeded, how many Pods are
        stuck <code>Pending</code>. That&apos;s the job of{" "}
        <strong>kube-state-metrics</strong>, the standard Kubernetes project that turns the API
        server&apos;s object state into Prometheus-style metrics.
      </p>
      <p>
        Datadog does not require you to deploy a separate kube-state-metrics pod. The Cluster Agent
        runs an internal <code>kubernetes_state_core</code> check that talks to the API server
        directly and reports <code>kubernetes_state.*</code> metrics itself — this is enabled by
        default (<code>datadog.kubeStateMetricsCore.enabled: true</code> in the Helm chart, requires
        Cluster Agent 1.12.0+) and is the recommended path over running the community
        kube-state-metrics Deployment separately.
      </p>
      <p>
        The <strong>Orchestrator Explorer</strong> goes a layer further: it collects and visualizes
        the live spec and status of Kubernetes resources themselves — Pods, Deployments, ReplicaSets,
        Nodes — so you can inspect a failed Pod&apos;s resource spec, see restart history, and
        correlate object state with node activity and logs, all inside Datadog instead of{" "}
        <code>kubectl describe</code>. It requires both{" "}
        <code>processAgent.enabled</code> and <code>clusterAgent.enabled</code> to be true, and is
        enabled by default via Helm or the Datadog Operator. Every resource it collects is tagged
        with <code>kube_cluster_name</code>, and namespaced resources additionally get{" "}
        <code>kube_namespace</code>; boolean conditions (e.g. a Deployment&apos;s{" "}
        <code>Available</code> condition) surface as <code>kube_condition_available:true|false</code>{" "}
        style tags.
      </p>

      <h3 id="external-metrics-hpa">External Metrics and the Admission Controller</h3>
      <p>
        Two Cluster Agent features are easy to forget are opt-in, because so much of the rest of the
        chart works out of the box:
      </p>
      <p>
        <strong>External Metrics Provider.</strong> The Cluster Agent can register itself as a
        Kubernetes <code>external.metrics.k8s.io</code> APIService, letting a{" "}
        <code>HorizontalPodAutoscaler</code> scale on an arbitrary Datadog metric — request latency,
        queue depth, a business metric — instead of just CPU/memory. This is{" "}
        <strong>disabled by default</strong> (<code>clusterAgent.metricsProvider.enabled: false</code>);
        forgetting to flip it on is a common reason an HPA referencing a Datadog metric silently
        fails to scale.
      </p>
      <p>
        <strong>Admission Controller.</strong> A mutating (and validating) webhook hosted by the
        Cluster Agent that intercepts Pod creation to automatically inject the APM tracing library,
        unified service tags (<code>DD_ENV</code>, <code>DD_SERVICE</code>, <code>DD_VERSION</code>),
        and DogStatsD connection config — no Dockerfile or manifest changes required. It{" "}
        <strong>is enabled by default</strong> (<code>clusterAgent.admissionController.enabled: true</code>),
        but injection itself is opt-in per workload via a label (
        <code>mutateUnlabelled: false</code> by default), so a namespace or pod has to explicitly
        request it.
      </p>

      <CodeBlock
        code={`apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    admission.datadoghq.com/enabled: "true"   # opt this namespace into auto-instrumentation
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments-api
  namespace: payments
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: External
      external:
        metric:
          name: datadogmetric@payments:requests_per_second   # requires metricsProvider.enabled: true
        target:
          type: AverageValue
          averageValue: "500"`}
        lang="yaml"
        filename="admission-and-hpa.yaml"
      />

      <h3 id="control-plane-monitoring">Control Plane and Tag Enrichment</h3>
      <p>
        On self-managed clusters where you can reach <code>etcd</code>, <code>kube-scheduler</code>,
        and <code>kube-controller-manager</code> directly (not typically possible on fully managed
        control planes like EKS/GKE/AKS, where the cloud provider hides these components), the
        Agent can run dedicated integrations against each for latency, leader election, and request
        rate metrics — useful for catching control plane degradation before it manifests as
        scheduling delays or API timeouts cluster-wide.
      </p>
      <p>
        Tag enrichment is the thread that ties every layer together. Pod labels and annotations flow
        into Datadog as tags automatically — a pod labeled <code>app: payments-api</code> and{" "}
        <code>team: checkout</code> carries those tags onto every container metric, log line, and
        trace span it produces, which then inherit the node&apos;s host tags on top.
      </p>

      <MermaidDiagram
        chart={hierarchyDiagram}
        title="Host → Container → Pod → Orchestrator Tag Hierarchy"
        caption="Tags flow downward automatically: a host tag is visible on every container it runs, and a pod's labels are visible on the Orchestrator Explorer resource for that pod — this is the mechanism that lets you pivot across every layer with one tag filter."
        minHeight={420}
      />

      <h3 id="helm-install">Installing With Helm</h3>
      <p>
        The official Helm chart (<code>datadog/datadog</code>) installs the node Agent as a
        DaemonSet and the Cluster Agent as a Deployment in one release. The Cluster Agent has been
        enabled by default since chart v2.7.0.
      </p>

      <CodeBlock
        code={`helm repo add datadog https://helm.datadoghq.com
helm repo update

helm install datadog-agent datadog/datadog \\
  -f values.yaml \\
  --set datadog.apiKey=<YOUR_DD_API_KEY> \\
  --set datadog.site=datadoghq.com \\
  --create-namespace -n datadog`}
        lang="bash"
        filename="install-datadog-agent.sh"
      />

      <CodeBlock
        code={`# values.yaml — the subset of keys that matter most for this module
datadog:
  apiKey: <YOUR_DD_API_KEY>
  site: datadoghq.com
  clusterName: prod-payments

  kubeStateMetricsCore:
    enabled: true              # default: true — kubernetes_state_core check inside the Cluster Agent

  orchestratorExplorer:
    enabled: true               # default: true — requires processAgent.enabled + clusterAgent.enabled

  processAgent:
    enabled: true                # default: true — runs the process agent
    processCollection: false     # default: false — opt in for Live Processes

  logs:
    enabled: false                # default: false — opt in for log collection
    containerCollectAll: false    # default: false — collect logs from every container

  apm:
    portEnabled: false            # default: false — APM over TCP :8126
    socketEnabled: true           # default: true — APM over Unix socket

clusterAgent:
  enabled: true                   # default: true (since chart v2.7.0)

  metricsProvider:
    enabled: false                 # default: false — flip this on for HPA-on-Datadog-metric

  admissionController:
    enabled: true                  # default: true — webhook is deployed
    mutateUnlabelled: false        # default: false — injection is opt-in per namespace/pod label`}
        lang="yaml"
        filename="values.yaml"
      />

      <h2 id="cloud-integrations">Cloud Integrations: AWS, GCP, Azure</h2>
      <p>
        Not everything you run has a place to install an Agent. Managed services — RDS, DynamoDB,
        Lambda, Cloud SQL, Azure SQL — have no host you control. Cloud integrations close that gap
        by connecting Datadog to the provider&apos;s own monitoring API using a read-only,
        cross-account role instead of an installed process.
      </p>

      <h3 id="aws-integration">The AWS Integration</h3>
      <p>
        The AWS integration works through a scoped, read-only IAM role that Datadog assumes to pull
        two things: resource metadata (EC2 instance tags, RDS instance configuration, Lambda
        function names) and CloudWatch metrics. Metrics arrive one of two ways:
      </p>

      <MermaidDiagram
        chart={awsIntegrationDiagram}
        title="Agent-on-EC2 vs the AWS Cloud Integration"
        caption="The Agent path is real-time and process-level, but only reaches machines you can install software on. The integration path reaches everything IAM can see, at the cost of either polling latency or Firehose infrastructure for streaming."
        minHeight={420}
      />

      <ArticleTable
        caption="Three ways AWS metrics reach Datadog — pick per namespace based on what you can install and how much latency you can tolerate."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Typical latency</th>
              <th>Best for</th>
              <th>Cost consideration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Agent on EC2 / EKS node</td>
              <td>~15–60 seconds, real-time push</td>
              <td>Anything you control the host for — full process, container, and log visibility</td>
              <td>No CloudWatch API cost; host is billed as an Agent host</td>
            </tr>
            <tr>
              <td>CloudWatch crawler (polling)</td>
              <td>
                ~15–20 min for 5-minute metrics (CloudWatch lag + Datadog poll interval)
              </td>
              <td>Managed services with no installable Agent (RDS, DynamoDB, Lambda, ELB)</td>
              <td>
                <code>GetMetricData</code>/<code>ListMetrics</code> API cost, scales with metric
                volume
              </td>
            </tr>
            <tr>
              <td>CloudWatch Metric Streams</td>
              <td>~2–3 min, pushed via Kinesis Data Firehose</td>
              <td>
                High-value namespaces where the crawler&apos;s ~15 min delay is unacceptable (e.g.
                autoscaling signals)
              </td>
              <td>
                Firehose + data volume cost; scope with namespace/tag filters instead of streaming
                everything
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        Datadog&apos;s own guidance is to <strong>prefer the Agent wherever you can install
        it</strong> — it is cheaper, lower latency, and gives per-process detail the CloudWatch
        crawler never will — and reserve the CloudWatch-based paths for what the Agent physically
        cannot reach, using Metric Streams selectively rather than streaming every namespace to
        control cost.
      </p>

      <h3 id="gcp-azure">GCP and Azure Integrations</h3>
      <p>
        The same shape repeats for the other major clouds, each with its own resource-collection
        toggle and its own billing nuance:
      </p>
      <ul>
        <li>
          <strong>GCP.</strong> Configured via a service account; enable resource collection in the
          Google Cloud Platform integration tile&apos;s Resource Collection tab. Google Cloud hosts
          reporting data are billed as hosts unless excluded via metric exclusion tags — worth
          auditing on large GCP estates.
        </li>
        <li>
          <strong>Azure.</strong> Connected via an app registration / service principal. Standard
          resource metrics (Azure SQL DB, Redis Cache, Load Balancer, etc.) do not affect monthly
          billing on their own, but enabling collection of custom metrics — for example everything
          written to an Application Insights instance — brings those in as Datadog custom metrics,
          which can materially change cost if enabled broadly.
        </li>
      </ul>

      <h3 id="agent-vs-agentless">Agent-Based vs Agentless: The Real Tradeoff</h3>
      <p>
        This isn&apos;t really an either/or choice in a real AWS/GCP/Azure account — it&apos;s a
        per-resource-type decision, and most production environments run both simultaneously: Agent
        on every EC2/EKS/GCE node for deep, real-time, per-process visibility, plus the cloud
        integration layered on top for the managed services that have no host to install anything
        on. The failure mode to watch for is defaulting to the cloud integration out of convenience
        for resources you <em>do</em> control — you pay in both latency and missed process-level
        detail for no real benefit.
      </p>

      <h2 id="network-monitoring">Network Performance Monitoring and DNS</h2>
      <p>
        <strong>Cloud Network Monitoring</strong> (Datadog&apos;s current name for Network
        Performance Monitoring) gives visibility into traffic <em>between</em> services, containers,
        availability zones, and any other tag in Datadog — not just whether a host is up, but which
        services are calling which, how much data is flowing, and where latency or packet loss is
        concentrated. On Linux, the Agent&apos;s <code>system-probe</code> component captures this
        using eBPF to observe socket syscalls and TCP/UDP traffic with minimal overhead, then
        aggregates raw connection data (IP, port, PID) into application-layer dependencies you can
        explore on the Network Map.
      </p>
      <p>
        <strong>DNS Monitoring</strong> rides on the same <code>system-probe</code> data path,
        surfacing flow-level DNS metrics: which pods or services are issuing the most DNS queries,
        which DNS servers are handling them, response-time spikes, and error rates by type. In
        Kubernetes specifically, DNS is a disproportionately common root cause of intermittent
        latency — CoreDNS under load or a misbehaving <code>ndots</code> setting causing extra
        lookups — and this is often the fastest way to confirm or rule it out.
      </p>

      <h2 id="serverless-nod">A Brief Nod to Serverless</h2>
      <p>
        Serverless compute — AWS Lambda chief among them — doesn&apos;t fit the host/container model
        at all: there&apos;s no long-lived process to install a background Agent on. Datadog&apos;s
        answer is the <strong>Datadog Lambda Extension</strong>, a lightweight companion process
        distributed as a Lambda Layer (or a container image dependency for image-based functions)
        that runs alongside your function code within the execution environment and submits metrics,
        traces, and logs directly — without a separate log-forwarding hop. It has effectively
        superseded the older Forwarder-based approach, which Datadog still supports but no longer
        extends with new features. This module is scoped to infrastructure and containers; Lambda
        and serverless get their own dedicated treatment elsewhere in this academy.
      </p>

      <h2 id="surface-comparison">Monitoring Surface Comparison</h2>
      <ArticleTable
        caption="Five monitoring surfaces, how you actually get data out of each, and the mistake that trips people up most often."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Surface</th>
              <th>How you monitor it</th>
              <th>Main gotcha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bare host (VM / bare metal)</td>
              <td>Agent installed directly — system, network, disk core checks</td>
              <td>
                Host Map / Infrastructure List usefulness lives or dies on tag discipline at install
                time
              </td>
            </tr>
            <tr>
              <td>Docker (standalone)</td>
              <td>
                Containerized Agent + Autodiscovery via the Docker socket, matched on image name or
                labels
              </td>
              <td>
                Forgetting to mount the Docker socket means Live Containers reports nothing, silently
              </td>
            </tr>
            <tr>
              <td>Kubernetes</td>
              <td>
                Node Agent DaemonSet + Cluster Agent + <code>kubernetes_state_core</code> check +
                Orchestrator Explorer
              </td>
              <td>
                A workload can look &quot;dark&quot; from DaemonSet gaps, stale Autodiscovery
                annotations, or RBAC that fails closed with no alert
              </td>
            </tr>
            <tr>
              <td>Serverless (Lambda)</td>
              <td>Datadog Lambda Extension deployed as a Layer, reporting directly from the runtime</td>
              <td>
                Extension version must track the runtime; too many layers adds cold-start overhead
              </td>
            </tr>
            <tr>
              <td>Cloud-managed (RDS, DynamoDB, S3, Azure SQL)</td>
              <td>Cloud integration (CloudWatch/Azure Monitor crawler or streaming) — no Agent possible</td>
              <td>
                Coarser resolution and poll latency; unfiltered custom metric collection can inflate
                billing
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How do you monitor a Kubernetes cluster with Datadog?"
        intro="A strong answer names the two-agent architecture by role, explains why the split exists, and covers autoscaling and auto-instrumentation without being asked — those are the parts that separate 'used it' from 'understands it'."
        steps={[
          "Open with the two-tier model: a node Agent DaemonSet (one pod per node, host + container + pod metrics via Autodiscovery) plus a Cluster Agent Deployment for everything cluster-scoped.",
          "Explain the WHY: without the Cluster Agent, every node would query kube-apiserver directly for pod/service metadata — that doesn't scale past a handful of nodes. The Cluster Agent watches once and caches for everyone.",
          "Name what the Cluster Agent uniquely owns: the kubernetes_state_core check (no separate kube-state-metrics deployment needed), the Orchestrator Explorer for object-level state, and — on self-managed clusters — control plane component checks.",
          "Cover autoscaling: the Cluster Agent can expose Datadog metrics to a HorizontalPodAutoscaler via the external.metrics.k8s.io API — call out that this is off by default (clusterAgent.metricsProvider.enabled: false) and has to be explicitly enabled.",
          "Cover auto-instrumentation: the Admission Controller mutating webhook injects APM libraries and unified service tags into pods at creation time, opt-in per namespace or pod via a label.",
          "Close on tags: pod labels and annotations flow automatically into Datadog tags, which is the mechanism that lets you pivot from a slow trace straight to the Deployment, node, and AWS account it ran in.",
        ]}
      />

      <InterviewPlaybook
        title="Agent on the host vs the AWS cloud integration — when do you use which?"
        intro="Interviewers are testing whether you understand this as a cost/latency/coverage tradeoff, not a binary choice. Name the default, name the exception, then name the hybrid reality."
        steps={[
          "State the default: if you can install the Agent — EC2, self-managed EKS nodes, ECS on EC2 — do it. Real-time, per-process, and one collector for metrics, logs, and traces together.",
          "Name where you cannot: fully managed services with no host — RDS, Lambda, DynamoDB, S3, ELB. The AWS integration's IAM role + CloudWatch is the only option there.",
          "Explain the latency layer within the integration itself: the default CloudWatch API crawler polls (~15–20 min delay for 5-min metrics) versus CloudWatch Metric Streams pushed via Firehose (~2–3 min) — recommend streams selectively, for the namespaces where that delay actually matters operationally.",
          "Name the cost failure mode: streaming every namespace, or enabling unfiltered custom metric collection on the Azure/GCP side, quietly inflates custom-metrics billing — scope with tag and namespace filters.",
          "Close with the realistic answer: most production AWS accounts run both at once — Agent on every host you control, integration layered on top for what you don't.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="The Deployment That Went Dark"
        scenario={
          <>
            A 40-node EKS cluster reports cleanly into Datadog — the Host Map is full, and Live
            Containers shows CPU/memory for nearly every workload. One exception:{" "}
            <code>payments-worker</code>, a Deployment with 3 replicas, shows{" "}
            <strong>zero container metrics</strong> and does not appear in Live Containers or the
            Orchestrator Explorer at all. <code>kubectl get pods -n payments</code> shows all three
            replicas <code>Running</code> and healthy, scheduled across three different nodes. The
            pod is a two-container pod: the <code>worker</code> application container plus an{" "}
            <code>istio-proxy</code> sidecar.
          </>
        }
        tasks={[
          "Rule out DaemonSet coverage first: confirm a Datadog node Agent pod is actually Running on each of the three nodes payments-worker is scheduled on — a taint the DaemonSet doesn't tolerate, a nodeSelector mismatch after a recent Helm values change, or a resource-starved node can silently exclude the Agent pod from one node without failing loudly.",
          "Check the Cluster Agent logs for RBAC errors — a stale ClusterRole/ClusterRoleBinding after an upgrade can cause 403s when the Cluster Agent or node Agent reads Pod/Node objects, and this fails closed: metrics simply don't appear, with no alert fired.",
          "Inspect the payments-worker pod spec for Autodiscovery annotations targeting the wrong container name — in a multi-container pod, an ad.datadoghq.com/<container>.checks annotation only takes effect if <container> exactly matches a name under spec.containers, and a container rename that isn't mirrored in the annotation silently stops the check.",
          "Confirm which container is actually expected to report default container metrics versus which one needs the custom annotation — default container CPU/memory collection needs no annotation at all, so distinguish 'no container metrics whatsoever' (points at DaemonSet/RBAC) from 'metrics for one container in the pod are missing' (points at Autodiscovery annotation targeting).",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          Work outward from the widest possible cause to the narrowest, because &quot;zero
          metrics&quot; for a normally-healthy pod almost always traces to one of three layers:
        </p>
        <CodeBlock
          code={`# 1. Confirm DaemonSet coverage on the exact nodes payments-worker runs on
kubectl get pods -n payments -o wide | grep payments-worker
# note the NODE column, e.g. ip-10-0-4-12, ip-10-0-7-9, ip-10-0-2-31

kubectl get pods -n datadog -l app=datadog-agent -o wide
# is there a Running datadog-agent pod on EACH of those three nodes?

kubectl get daemonset datadog-agent -n datadog -o jsonpath='{.spec.template.spec.tolerations}'
kubectl describe node ip-10-0-4-12 | grep -A3 Taints
# a taint added by a recent autoscaler/spot-node change, with no matching
# toleration in the DaemonSet, silently excludes the Agent from that node

# 2. Check Cluster Agent logs for RBAC failures (fails closed, no alert)
kubectl logs -n datadog deploy/datadog-cluster-agent | grep -i "forbidden\\|rbac\\|unauthorized"

# 3. Inspect the pod's Autodiscovery annotations for a container-name mismatch
kubectl get pod -n payments -l app=payments-worker -o jsonpath='{.items[0].metadata.annotations}' | jq .
kubectl get pod -n payments -l app=payments-worker -o jsonpath='{.items[0].spec.containers[*].name}'
# compare: does "ad.datadoghq.com/<name>.checks" reference a name that
# actually appears in the container list above?`}
          lang="bash"
          filename="diagnose.sh"
        />
        <p>
          In this scenario the likely root cause is the third check: the pod was recently updated to
          add the <code>istio-proxy</code> sidecar, and during that change the application
          container was renamed from <code>payments-worker</code> to <code>worker</code> without
          updating the Autodiscovery annotation, which still targets{" "}
          <code>ad.datadoghq.com/payments-worker.checks</code>. Default container-level CPU/memory
          collection needs no annotation and would still work fine — so &quot;zero metrics at
          all&quot; that also excludes the pod from Live Containers points further upstream, at
          DaemonSet coverage or Cluster Agent RBAC, which is why ruling those out first (steps 1–2)
          before chasing the annotation (step 3) is the right order: it prevents fixing a real but
          secondary annotation bug while missing a node that has no Agent running on it at all.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Host, container, and orchestrator visibility is the layer every other Datadog product
          (APM, logs, RUM) leans on for correlation — tag discipline at this layer determines how
          useful everything built on top of it is.
        </li>
        <li>
          The node Agent (DaemonSet) and Cluster Agent (Deployment) split exists specifically to
          stop N nodes from hammering <code>kube-apiserver</code> independently for the same
          metadata — the Cluster Agent centralizes and caches.
        </li>
        <li>
          The Cluster Agent replaces a standalone kube-state-metrics deployment with its own{" "}
          <code>kubernetes_state_core</code> check, and powers the Orchestrator Explorer, External
          Metrics for HPA, and the Admission Controller — but the External Metrics Provider and
          Live Process collection are both <strong>opt-in</strong>, not automatic.
        </li>
        <li>
          Autodiscovery re-scans the container runtime every ~10 seconds and resolves config via a
          strict precedence order — annotation/label first, then <code>auto_conf.yaml</code>, then
          chart defaults — and a container-name mismatch in a multi-container pod is a common,
          silent way for a check to stop running.
        </li>
        <li>
          Prefer the Agent wherever you can install it — real-time, per-process, and one collector
          for metrics/logs/traces. Reserve cloud integrations (AWS/GCP/Azure) for managed services
          with no host, and choose CloudWatch polling vs Metric Streams per namespace based on how
          much the ~15–20 min crawler delay actually costs you operationally.
        </li>
        <li>
          Network Performance Monitoring and DNS Monitoring share the same eBPF-based{" "}
          <code>system-probe</code> data path, and are frequently the fastest way to confirm or rule
          out DNS as the root cause of intermittent Kubernetes latency.
        </li>
      </ul>
    </div>
  );
}
