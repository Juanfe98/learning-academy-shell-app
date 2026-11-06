import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const subprocessArchDiagram = String.raw`flowchart TD
  subgraph CORE["Core Agent process (single Go binary)"]
    COL["Collector\nruns integration checks\nevery ~15s (min_collection_interval)"]
    DSD["DogStatsD server\nUDP :8125 or Unix Domain Socket"]
    LOGS["Logs tailer\n(active when logs_enabled: true)"]
    DEMUX["Demultiplexer -> Aggregator -> Tagger"]
    FWD["Forwarder\nbuffers, retries, batches HTTPS payloads"]
    COL --> DEMUX
    DSD --> DEMUX
    LOGS --> FWD
    DEMUX --> FWD
  end
  TRACE["Trace Agent\n(separate process)\nreceives spans, samples, computes RED stats"]
  PROC["Process Agent\n(separate process)\nlive process + container snapshots"]
  SEC["Security Agent\n(separate process)\nCWS runtime detection + CSPM,\ntalks to System Probe (eBPF)"]
  INTAKE["Datadog Intake\n(metrics / logs / traces / process / security endpoints)"]

  FWD -->|HTTPS| INTAKE
  TRACE -->|HTTPS| INTAKE
  PROC -->|HTTPS| INTAKE
  SEC -->|HTTPS| INTAKE`;

const dataFlowDiagram = String.raw`sequenceDiagram
  participant Check as postgres.py check
  participant Collector
  participant Demux as Demultiplexer / Aggregator
  participant Tagger
  participant Forwarder
  participant Intake as Datadog Intake

  Collector->>Check: run() every min_collection_interval (default 15s)
  Check->>Collector: self.gauge() / self.count() / self.service_check()
  Collector->>Demux: submit raw metric samples
  Demux->>Tagger: request enrichment
  Tagger-->>Demux: attach host/container/k8s tags
  Demux->>Forwarder: batched, tagged payload
  Note over Forwarder: buffers on disk/memory if network is down,\nretries with backoff — this is why brief\nnetwork blips don't drop data
  Forwarder->>Intake: HTTPS POST (gzip JSON)
  Intake-->>Forwarder: 202 Accepted`;

const autodiscoverySequence = String.raw`sequenceDiagram
  participant Kubelet
  participant Agent as Node Agent (Autodiscovery)
  participant Intake as Datadog Intake

  Note over Agent: Agent polls Kubelet's /pods endpoint every ~10s
  Kubelet->>Agent: new pod "redis-7f9c" scheduled\n(has ad.datadoghq.com/redis.checks annotation)
  Agent->>Agent: match container identifier against loaded templates
  Agent->>Agent: substitute template vars\n(%%host%% -> 10.1.2.3, %%env_REDIS_PASSWORD%% -> secret)
  Agent->>Agent: generate static config, schedule redisdb check
  Agent->>Intake: submit redis.* metrics tagged with pod/service metadata
  Note over Kubelet,Agent: pod deleted -> Agent detects removal,\nunschedules the check automatically`;

const clusterAgentDiagram = String.raw`flowchart LR
  subgraph N1["Node 1"]
    NA1["Node Agent"]
  end
  subgraph N2["Node 2"]
    NA2["Node Agent"]
  end
  CA["Cluster Agent\n(single deployment, 1-2 replicas)"]
  API["kube-apiserver"]
  DD["Datadog backend"]
  HPA["HorizontalPodAutoscaler"]

  NA1 -->|"local metrics + logs + traces"| DD
  NA2 -->|"local metrics + logs + traces"| DD
  NA1 -.->|"cluster metadata\n(read-only, via Cluster Agent)"| CA
  NA2 -.->|"cluster metadata"| CA
  CA -->|"watches Services/Endpoints/Nodes\n(RBAC scoped to one deployment)"| API
  CA -->|"dispatches Cluster Checks"| DD
  CA -->|"exposes External Metrics API"| HPA`;

export const toc: TocItem[] = [
  { id: "why-the-agent-exists", title: "Why a Local Agent Exists", level: 2 },
  { id: "agent-vs-agentless", title: "Agent-Based vs Agentless Collection", level: 3 },
  { id: "internal-architecture", title: "Inside the Agent: Subprocess Architecture", level: 2 },
  { id: "subprocess-table", title: "What Each Subprocess Does", level: 3 },
  { id: "data-flow", title: "From Check to Intake: The Data Flow", level: 2 },
  { id: "installing-the-agent", title: "Installing the Agent", level: 2 },
  { id: "host-install", title: "Host Install", level: 3 },
  { id: "docker-install", title: "Docker", level: 3 },
  { id: "kubernetes-install", title: "Kubernetes: Helm and the Datadog Operator", level: 3 },
  { id: "core-configuration", title: "Core Configuration", level: 2 },
  { id: "datadog-yaml", title: "datadog.yaml", level: 3 },
  { id: "integration-config", title: "Per-Integration conf.d", level: 3 },
  { id: "env-var-overrides", title: "Environment Variable Overrides", level: 3 },
  { id: "integrations-and-checks", title: "Integrations & Writing a Custom Check", level: 2 },
  { id: "autodiscovery", title: "Autodiscovery", level: 2 },
  { id: "cluster-agent", title: "The Cluster Agent for Kubernetes", level: 2 },
  { id: "operating-the-agent", title: "Operating & Debugging the Agent", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheDatadogAgent() {
  return (
    <div className="article-content">
      <p>
        Every Datadog product you will use later in this academy — dashboards, monitors, APM,
        logs — is downstream of one thing: a small, resilient process running on every host,
        container, or Kubernetes node you care about. That process is the{" "}
        <strong>Datadog Agent</strong>. Before you can reason about tags, monitors, or SLOs, you
        need a correct mental model of what the Agent actually is, what it is made of internally,
        and how it moves data from &quot;something happened on this box&quot; to &quot;a metric
        you can graph.&quot; Get this module wrong and every later module — tagging, dashboards,
        APM — will feel like memorized trivia instead of a coherent system.
      </p>

      <h2 id="why-the-agent-exists">Why a Local Agent Exists</h2>
      <p>
        Datadog can monitor plenty of things without any software running on your infrastructure
        — cloud integrations like AWS, Azure, and GCP work by polling provider APIs directly (an{" "}
        <strong>agentless</strong> integration). So why does Datadog ship a full-blown local
        Agent at all?
      </p>
      <p>
        Because a lot of the telemetry that matters most is only visible <em>from inside the
        box</em>. Custom application metrics, process-level resource usage, log files sitting on
        disk, in-process APM spans, kernel-level security events — none of that is reachable by an
        external API poller. The Agent exists to sit locally, collect this data cheaply and at
        high resolution, and ship it to Datadog reliably even when the network between your host
        and Datadog is having a bad day.
      </p>

      <h3 id="agent-vs-agentless">Agent-Based vs Agentless Collection</h3>
      <p>
        The distinction is not &quot;which one is better&quot; — it is which one is even{" "}
        <em>possible</em> for a given signal:
      </p>
      <ul>
        <li>
          <strong>Agentless</strong> (cloud integrations, API-based checks): Datadog&apos;s
          backend calls out to a provider API (e.g. CloudWatch, Azure Monitor) on a schedule.
          Zero footprint on your infrastructure, but resolution and latency are bounded by what
          the provider API exposes — often 1–5 minute granularity.
        </li>
        <li>
          <strong>Agent-based</strong> (this module): a local process collects at whatever
          resolution you configure (often every 15s or faster for DogStatsD), buffers locally if
          the network drops, and can see things no external API ever will — process trees, local
          log files, application-emitted custom metrics, and in-process trace spans.
        </li>
      </ul>
      <p>
        In production, most systems run both: agentless integrations for cloud infrastructure
        metadata and metrics, and the Agent everywhere you need custom metrics, logs, APM, or
        sub-minute resolution.
      </p>

      <h2 id="internal-architecture">Inside the Agent: Subprocess Architecture</h2>
      <p>
        &quot;The Datadog Agent&quot; is not one process — it is a small fleet of cooperating
        processes, most enabled by default and some opt-in via <code>datadog.yaml</code>. The core
        Agent process bundles the pieces you almost always want (metric collection, DogStatsD,
        logs, forwarding); APM, live process collection, and security monitoring run as separate
        processes so they can be resourced, scaled, and disabled independently.
      </p>

      <MermaidDiagram
        chart={subprocessArchDiagram}
        title="Datadog Agent Subprocess Architecture"
        caption="The Collector, DogStatsD server, Logs tailer, and Forwarder all live inside one core Go process. Trace Agent, Process Agent, and Security Agent are separate processes — each ships its own payloads to Datadog over HTTPS rather than routing through the core Forwarder."
        minHeight={480}
      />

      <h3 id="subprocess-table">What Each Subprocess Does</h3>
      <ArticleTable
        caption="Seven names come up constantly in Datadog docs and support tickets — know what each one is responsible for and whether it's enabled by default."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Subprocess</th>
              <th>Responsibility</th>
              <th>Enabled by default?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Collector</strong>
              </td>
              <td>
                Runs integration checks (Python or Go) on a schedule, gathering standard
                infrastructure metrics, events, and service checks.
              </td>
              <td>Yes — part of the core process</td>
            </tr>
            <tr>
              <td>
                <strong>Forwarder</strong>
              </td>
              <td>
                Buffers, batches, and retries HTTPS payloads to Datadog intake. Absorbs brief
                network outages so metrics aren&apos;t lost.
              </td>
              <td>Yes — part of the core process</td>
            </tr>
            <tr>
              <td>
                <strong>DogStatsD</strong>
              </td>
              <td>
                A StatsD-compatible server that accepts custom application metrics over UDP (port{" "}
                <code>8125</code>) or a Unix Domain Socket.
              </td>
              <td>Yes — part of the core process</td>
            </tr>
            <tr>
              <td>
                <strong>Logs tailer</strong>
              </td>
              <td>
                Tails log files / container stdout and ships log lines. Lives inside the core
                process, not a separate binary.
              </td>
              <td>No — requires <code>logs_enabled: true</code></td>
            </tr>
            <tr>
              <td>
                <strong>Trace Agent</strong>
              </td>
              <td>
                Receives APM spans from instrumented application libraries, samples them, computes
                RED (rate/errors/duration) stats, and forwards traces to Datadog.
              </td>
              <td>Yes — enabled by default (separate process)</td>
            </tr>
            <tr>
              <td>
                <strong>Process Agent</strong>
              </td>
              <td>
                Collects live process and container information for the Live Processes /
                Containers views.
              </td>
              <td>Partial — container collection on by default if the container socket is
                available; full process collection is opt-in</td>
            </tr>
            <tr>
              <td>
                <strong>Security Agent</strong>
              </td>
              <td>
                Drives Cloud Workload Security (runtime threat detection) and Cloud Security
                Posture Management (compliance benchmarks), working with the eBPF-based System
                Probe.
              </td>
              <td>No — opt-in, separate process</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="data-flow">From Check to Intake: The Data Flow</h2>
      <p>
        It helps to trace one metric all the way through the pipeline. Here is what happens when a
        standard integration check (say, the PostgreSQL check) runs and submits a gauge:
      </p>
      <MermaidDiagram
        chart={dataFlowDiagram}
        title="Metric Lifecycle: Check to Datadog Intake"
        caption="The Forwarder is the resilience boundary — it buffers on disk/memory and retries with backoff, so a flaky link between your host and Datadog does not silently drop metrics."
        minHeight={440}
      />
      <p>
        The same shape applies to DogStatsD-submitted custom metrics and to logs — collect, tag,
        batch, forward. The one structural difference: APM traces, process snapshots, and security
        events skip the core Forwarder entirely and are shipped directly by their own subprocess,
        which is why disabling the core Agent&apos;s logs collection does not affect APM, and vice
        versa.
      </p>

      <h2 id="installing-the-agent">Installing the Agent</h2>
      <p>
        The Agent ships for hosts, containers, and Kubernetes. Every install surface needs the
        same two pieces of information: your <strong>API key</strong> (identifies your Datadog
        org) and your <strong>site</strong> (which Datadog region your data goes to — e.g.,{" "}
        <code>datadoghq.com</code>, <code>datadoghq.eu</code>, <code>us3.datadoghq.com</code>).
        Getting the site wrong is one of the most common &quot;my data isn&apos;t showing
        up&quot; causes — the Agent reports successfully, just to the wrong regional intake.
      </p>

      <h3 id="host-install">Host Install</h3>
      <p>
        For a single Linux host, Datadog provides a one-line install script that detects your
        package manager and installs Agent 7:
      </p>
      <CodeBlock
        code={`DD_API_KEY=<DATADOG_API_KEY> DD_SITE="datadoghq.com" \\
  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"`}
        lang="bash"
        filename="install-host-agent.sh"
      />
      <p>
        This writes the initial <code>datadog.yaml</code>, registers the systemd unit, and starts
        the Agent. The script only seeds config on first install — rerunning it does not overwrite
        an existing <code>datadog.yaml</code>.
      </p>

      <h3 id="docker-install">Docker</h3>
      <p>
        For a single Docker host, run the Agent as a privileged sibling container with access to
        the Docker socket and host <code>/proc</code> and cgroup filesystems so it can see every
        other container:
      </p>
      <CodeBlock
        code={`docker run -d --cgroupns host --pid host --name dd-agent \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v /proc/:/host/proc/:ro \\
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \\
  -e DD_SITE=<DATADOG_SITE> \\
  -e DD_API_KEY=<DATADOG_API_KEY> \\
  registry.datadoghq.com/agent:7`}
        lang="bash"
      />

      <h3 id="kubernetes-install">Kubernetes: Helm and the Datadog Operator</h3>
      <p>
        On Kubernetes you have three install paths: the <strong>Datadog Operator</strong>{" "}
        (Datadog&apos;s recommended path — a CRD-driven controller that reports deployment health
        and reduces misconfiguration risk), the <strong>Helm chart</strong>, or a manual{" "}
        <code>DaemonSet</code>. Helm and the Operator both deploy a node Agent as a DaemonSet plus
        a Cluster Agent Deployment (covered later in this module).
      </p>
      <CodeBlock
        code={`helm repo add datadog https://helm.datadoghq.com
helm repo update

kubectl create secret generic datadog-secret \\
  --from-literal api-key=<DATADOG_API_KEY>

helm install datadog-agent -f values.yaml datadog/datadog`}
        lang="bash"
      />
      <CodeBlock
        code={`# values.yaml
datadog:
  apiKeyExistingSecret: datadog-secret
  site: datadoghq.com
  logs:
    enabled: true
    containerCollectAll: true
  apm:
    portEnabled: true
  processAgent:
    enabled: true
    processCollection: true

clusterAgent:
  enabled: true   # default since Helm chart v2.7.0+`}
        lang="yaml"
        filename="values.yaml"
      />
      <p>
        With the Datadog Operator, the same intent is expressed as a <code>DatadogAgent</code>{" "}
        custom resource instead of Helm values:
      </p>
      <CodeBlock
        code={`apiVersion: datadoghq.com/v2alpha1
kind: DatadogAgent
metadata:
  name: datadog
spec:
  global:
    site: <DATADOG_SITE>
    credentials:
      apiSecretName: datadog-secret
  features:
    logCollection:
      enabled: true
    apm:
      enabled: true
    liveProcessCollection:
      enabled: true`}
        lang="yaml"
        filename="datadog-agent.yaml"
      />
      <p>
        The <code>DatadogAgent</code> CRD&apos;s API version has moved forward across Operator
        releases (currently <code>v2alpha1</code> at the time of writing) — always check the{" "}
        <code>datadog-operator</code> chart&apos;s installed CRD version before copying examples
        from older blog posts.
      </p>

      <h2 id="core-configuration">Core Configuration</h2>

      <h3 id="datadog-yaml">datadog.yaml</h3>
      <p>
        The main configuration file lives at <code>/etc/datadog-agent/datadog.yaml</code> on
        Linux (<code>/opt/datadog-agent/etc/datadog.yaml</code> on macOS,{" "}
        <code>%ProgramData%\Datadog\datadog.yaml</code> on Windows). It controls everything the
        core process and its sibling processes do:
      </p>
      <CodeBlock
        code={`api_key: <DATADOG_API_KEY>
site: datadoghq.com

tags:
  - env:production
  - team:checkout

hostname: checkout-api-01

logs_enabled: true

apm_config:
  enabled: true

process_config:
  process_collection:
    enabled: false   # container collection stays on even when this is false`}
        lang="yaml"
        filename="datadog.yaml"
      />

      <h3 id="integration-config">Per-Integration conf.d</h3>
      <p>
        Each integration has its own subdirectory under{" "}
        <code>/etc/datadog-agent/conf.d/&lt;CHECK_NAME&gt;.d/</code>. A shipped{" "}
        <code>conf.yaml.example</code> file documents every option — rename it to{" "}
        <code>conf.yaml</code> to actually enable the check:
      </p>
      <CodeBlock
        code={`# /etc/datadog-agent/conf.d/postgres.d/conf.yaml
init_config:

instances:
  - host: localhost
    port: 5432
    username: datadog
    password: '<UNIQUEPASSWORD>'
    dbname: postgres
    tags:
      - service:orders-db
    min_collection_interval: 15`}
        lang="yaml"
        filename="conf.d/postgres.d/conf.yaml"
      />

      <h3 id="env-var-overrides">Environment Variable Overrides</h3>
      <p>
        Every meaningful <code>datadog.yaml</code> key has a <code>DD_*</code> environment
        variable equivalent, which is what containerized and Kubernetes deployments use instead of
        mounting a config file. Environment variables take precedence over the file on the same
        setting — useful for per-environment overrides without maintaining separate YAML files:
      </p>
      <CodeBlock
        code={`DD_API_KEY=<DATADOG_API_KEY>
DD_SITE=datadoghq.com
DD_TAGS="env:production team:checkout"
DD_LOGS_ENABLED=true
DD_APM_ENABLED=true
DD_PROCESS_CONFIG_PROCESS_COLLECTION_ENABLED=true
DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true   # accept DogStatsD packets from other containers`}
        lang="ini"
        filename=".env"
      />

      <h2 id="integrations-and-checks">Integrations & Writing a Custom Check</h2>
      <p>
        A <strong>check</strong> is a small Python (or Go) class the Collector runs on an
        interval. A check&apos;s <code>check()</code> method can submit three kinds of telemetry:
        metrics (<code>gauge</code>, <code>count</code>, <code>rate</code>, <code>histogram</code>
        , …), events, and service checks (an OK / WARNING / CRITICAL / UNKNOWN status). Datadog
        ships 700+ official integrations built exactly this way — Postgres, Redis, Nginx, Kafka,
        and hundreds more are just checks that Datadog maintains for you.
      </p>
      <p>
        When nothing off-the-shelf fits, you write your own. The minimal shape, straight from
        Datadog&apos;s own docs:
      </p>
      <CodeBlock
        code={`try:
    # Agent 6.6.0+
    from datadog_checks.base import AgentCheck
except ImportError:
    # older Agent versions
    from checks import AgentCheck

__version__ = "1.0.0"

class HelloCheck(AgentCheck):
    def check(self, instance):
        self.gauge('hello.world', 1, tags=['TAG_KEY:TAG_VALUE'] + self.instance.get('tags', []))`}
        lang="python"
        filename="checks.d/custom_hello.py"
      />
      <CodeBlock
        code={`# conf.d/custom_hello.yaml
init_config:

instances:
  [{}]`}
        lang="yaml"
        filename="conf.d/custom_hello.yaml"
      />
      <p>
        A more realistic check polls an internal HTTP endpoint, reports a service check for
        connectivity, and only fires an event above a threshold — the pattern you&apos;ll actually
        reach for in production:
      </p>
      <CodeBlock
        code={`from datadog_checks.base import AgentCheck

class QueueDepthCheck(AgentCheck):
    __version__ = "1.0.0"

    def check(self, instance):
        url = instance.get("url")
        tags = instance.get("tags", [])

        try:
            response = self.http.get(url)
            response.raise_for_status()
            depth = response.json()["queue_depth"]
        except Exception as e:
            self.service_check("queue.can_connect", self.CRITICAL, tags=tags, message=str(e))
            return

        self.service_check("queue.can_connect", self.OK, tags=tags)
        self.gauge("queue.depth", depth, tags=tags)

        if depth > 1000:
            self.event({
                "title": "Queue depth critical",
                "text": f"queue.depth is {depth}, above the 1000 threshold",
                "alert_type": "error",
                "tags": tags,
            })`}
        lang="python"
        filename="checks.d/custom_queue_depth.py"
      />
      <p>
        Naming convention matters here: prefix custom checks with <code>custom_</code> so they
        never collide with an official integration of the same name, and keep the{" "}
        <code>.py</code> and <code>.yaml</code> file names identical.
      </p>

      <h2 id="autodiscovery">Autodiscovery</h2>
      <p>
        Static <code>conf.d</code> files assume a service lives at a fixed host and port forever.
        In a containerized world that assumption is false — pods get rescheduled, IPs change,
        replicas scale up and down. <strong>Autodiscovery</strong> solves this: instead of a fixed
        config, you attach a <em>template</em> to a pod (via annotations) or container (via
        labels), and the Agent resolves the template against each container&apos;s real runtime
        values the moment it appears.
      </p>
      <MermaidDiagram
        chart={autodiscoverySequence}
        title="Autodiscovery: New Pod to Scheduled Check"
        caption="The Agent polls the Kubelet's /pods endpoint roughly every 10 seconds. When a container matches a loaded template, the Agent substitutes template variables with that container's real values and schedules the check — no restart, no manual conf.yaml edit."
        minHeight={420}
      />
      <p>
        A real Kubernetes example — a Redis pod annotated so the Agent auto-configures the{" "}
        <code>redisdb</code> check and log collection for it:
      </p>
      <CodeBlock
        code={`labels:
  tags.datadoghq.com/redis.env: "prod"
  tags.datadoghq.com/redis.service: "my-redis"
  tags.datadoghq.com/redis.version: "6.0.3"
annotations:
  ad.datadoghq.com/redis.checks: |
    {
      "redisdb": {
        "init_config": {},
        "instances": [
          {
            "host": "%%host%%",
            "port": "6379",
            "password": "%%env_REDIS_PASSWORD%%"
          }
        ]
      }
    }
  ad.datadoghq.com/redis.logs: '[{"source":"redis"}]'`}
        lang="yaml"
        filename="redis-pod.yaml"
      />
      <p>
        The annotation key format is <code>ad.datadoghq.com/&lt;container_identifier&gt;.checks</code>{" "}
        — <code>redis</code> here is the container name inside the pod spec, which is how the
        Agent matches the annotation to the right container when a pod runs multiple containers.
        Template variables like <code>%%host%%</code> (the container&apos;s IP) and{" "}
        <code>%%env_REDIS_PASSWORD%%</code> (pulled from that container&apos;s own environment)
        get substituted at match time — nothing is hardcoded.
      </p>

      <h2 id="cluster-agent">The Cluster Agent for Kubernetes</h2>
      <p>
        Every node Agent could, in theory, watch the Kubernetes API server directly for cluster
        metadata. At scale that is a problem: hundreds of node Agents all issuing watch requests
        hammer the API server, and each one needs broad RBAC permissions just to read cluster-wide
        state. The <strong>Cluster Agent</strong> exists to centralize that: it is a single
        Deployment (not a DaemonSet) that talks to the API server on behalf of every node Agent.
      </p>
      <MermaidDiagram
        chart={clusterAgentDiagram}
        title="Node Agent vs Cluster Agent"
        caption="Node Agents keep sending their own metrics/logs/traces directly to Datadog — the Cluster Agent doesn't proxy telemetry. It proxies cluster metadata reads and centralizes anything that only needs to happen once per cluster: cluster checks and the External Metrics API for HPA."
        minHeight={420}
      />
      <p>
        Concretely, the Cluster Agent gives you four things:
      </p>
      <ul>
        <li>
          <strong>Reduced API server load</strong> — node Agents read cluster metadata from the
          Cluster Agent instead of watching the API server themselves.
        </li>
        <li>
          <strong>Tighter RBAC</strong> — node Agents only need permission to read from their own
          kubelet; only the single Cluster Agent deployment needs broader API server access.
        </li>
        <li>
          <strong>Cluster Checks</strong> — for a service fronted by a Kubernetes{" "}
          <code>Service</code> (e.g., an external database, a load-balanced API), running the same
          check from every node is redundant. The Cluster Agent dispatches cluster-level checks to
          exactly one node Agent instead of all of them.
        </li>
        <li>
          <strong>HPA on Datadog metrics</strong> — the Cluster Agent exposes Datadog metrics
          through the Kubernetes External Metrics API, so a <code>HorizontalPodAutoscaler</code>{" "}
          can scale on anything Datadog knows, not just CPU/memory.
        </li>
      </ul>
      <p>
        If you installed via Helm chart v2.7.0+ or Datadog Operator v1.0.0+, the Cluster Agent is
        deployed and enabled by default alongside the node Agent DaemonSet.
      </p>

      <h2 id="operating-the-agent">Operating & Debugging the Agent</h2>
      <p>
        The Agent ships a CLI with subcommands you will reach for constantly. On a host, invoke
        the binary directly; in a container, exec into it first:
      </p>
      <CodeBlock
        code={`# Linux host
sudo datadog-agent status
sudo datadog-agent check postgres
sudo datadog-agent configcheck
sudo datadog-agent health
sudo datadog-agent flare

# Docker
sudo docker exec -it dd-agent agent status

# Kubernetes
kubectl exec -it <POD_NAME> -- agent status

# Cluster Agent
datadog-cluster-agent status`}
        lang="bash"
      />
      <ul>
        <li>
          <code>status</code> — the single most useful command. Shows every loaded check, whether
          it ran successfully, how many metric samples it submitted, and any errors or warnings.
        </li>
        <li>
          <code>check &lt;name&gt;</code> — runs one check a single time and prints exactly what it
          would submit, without waiting for the next scheduled run. The fastest way to test a
          config change.
        </li>
        <li>
          <code>configcheck</code> — prints every configuration the running Agent has actually
          loaded and resolved, including Autodiscovery-generated configs. Answers &quot;is my
          conf.yaml even being picked up?&quot;
        </li>
        <li>
          <code>health</code> — a lightweight liveness signal, useful for scripted checks.
        </li>
        <li>
          <code>flare</code> — packages logs, config (with secrets redacted), and diagnostic info
          into an archive and can send it straight to a Datadog support case. This is what
          support asks for first on almost every ticket.
        </li>
      </ul>
      <p>
        A healthy check shows up under <strong>Running Checks</strong> with a nonzero{" "}
        <code>Metric Samples</code> count and no errors:
      </p>
      <CodeBlock
        code={`Running Checks
==============
  network (1.6.0)
  ---------------
    Total Runs: 5
    Metric Samples: 26, Total: 130
    Events: 0, Total: 0
    Service Checks: 0, Total: 0
    Average Execution Time : 0ms`}
        lang="text"
      />
      <p>
        On Linux, Agent logs live at <code>/var/log/datadog/</code> — check{" "}
        <code>agent.log</code> first, and <code>trace-agent.log</code> /{" "}
        <code>process-agent.log</code> for their respective subprocesses. Logs rotate at 10MB with
        one backup kept by default.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How does the Datadog Agent collect and ship data?'"
        intro="A strong answer names the actual subprocesses and traces one metric end-to-end, rather than describing the Agent as a black box."
        steps={[
          "Start with the shape: the Agent is a fleet of cooperating processes, not one binary — a core process (Collector, Forwarder, DogStatsD, Logs) plus separate Trace, Process, and Security Agent processes.",
          "Name the collection paths: the Collector runs scheduled integration checks (default 15s interval), DogStatsD accepts custom application metrics over UDP/UDS, and the Logs tailer streams log files or container stdout.",
          "Explain enrichment: the Demultiplexer routes samples to the Aggregator, and the Tagger attaches host/container/Kubernetes metadata before anything ships.",
          "Call out the resilience boundary: the Forwarder buffers and retries with backoff, so a brief network outage between the host and Datadog doesn't drop metrics.",
          "Close with the exception: APM, process, and security data bypass the core Forwarder and ship independently from their own subprocess — a production implication when you're debugging why traces are flowing but metrics aren't (or vice versa).",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'Node Agent vs Cluster Agent — what's the difference?'"
        intro="Interviewers are checking whether you understand this is about centralizing cluster-wide concerns, not about splitting telemetry collection."
        steps={[
          "State the deployment shape: the node Agent runs as a DaemonSet (one per node); the Cluster Agent runs as a single Deployment for the whole cluster.",
          "Clarify what does NOT change: node Agents still ship their own local metrics, logs, and traces directly to Datadog — the Cluster Agent is not a telemetry proxy.",
          "Name what the Cluster Agent centralizes: API server watches (so RBAC and load stay scoped to one deployment instead of every node), Cluster Checks for services that shouldn't be checked redundantly from every node, and the External Metrics API for HPA.",
          "Give the production payoff: without a Cluster Agent, every node Agent needs API server RBAC and adds watch load; with one, only a single deployment does, which is why it's enabled by default on modern Helm/Operator installs.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="A Custom Metric Isn't Showing Up in Datadog"
        scenario={
          <>
            A teammate added a new integration check for an internal caching service. They wrote a{" "}
            <code>conf.d/cache_stats.d/conf.yaml</code>, restarted the Agent, and confirmed the
            service itself is healthy — but 20 minutes later, <code>cache.hit_rate</code> is
            nowhere to be found in Datadog&apos;s Metrics Explorer. Your job is to walk through the
            diagnosis methodically, from the Agent outward toward Datadog.
          </>
        }
        tasks={[
          "Which single Agent CLI command would you run first, and what two things in its output would you look at specifically?",
          "If the check doesn't appear under Running Checks at all, which command tells you whether the Agent even loaded the conf.yaml — and what misconfiguration would explain it not loading?",
          "If the check runs but shows an error, how do you get a fast, single-run test of just that check without waiting for the next scheduled interval?",
          "Assuming everything on the Agent looks clean, what is your next hypothesis, and what evidence would confirm or rule it out?",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Step 1 — start with `status`:</strong> it's the fastest way to see whether the
          check is even loaded, and if so, whether it's producing metric samples.
        </p>
        <CodeBlock code={`sudo datadog-agent status`} lang="bash" />
        <p>
          Look specifically at two things under <strong>Running Checks</strong>: whether{" "}
          <code>cache_stats</code> is listed at all, and its <code>Metric Samples</code> count. A
          check with 0 samples and no errors usually means the check ran but the code path never
          called <code>self.gauge()</code> — a logic bug, not a config bug.
        </p>
        <p>
          <strong>Step 2 — if the check isn't listed at all, run `configcheck`:</strong> this
          prints every configuration the Agent actually resolved, independent of what files exist
          on disk.
        </p>
        <CodeBlock code={`sudo datadog-agent configcheck`} lang="bash" />
        <p>
          The most common reason a check silently doesn&apos;t load: the file is still named{" "}
          <code>conf.yaml.example</code> instead of <code>conf.yaml</code>, or it has invalid YAML
          (the Agent skips malformed files rather than crashing). A close second: the file is
          non-empty-but-zero-length after a bad templating step — the Agent silently ignores
          zero-length files.
        </p>
        <p>
          <strong>Step 3 — force a single run to test fast:</strong> don&apos;t wait for the
          scheduled interval while iterating on a fix.
        </p>
        <CodeBlock code={`sudo datadog-agent check cache_stats`} lang="bash" />
        <p>
          This prints exactly what the check would submit (or the Python traceback if it&apos;s
          erroring), which is the fastest feedback loop for fixing the check itself.
        </p>
        <p>
          <strong>Step 4 — if the Agent side is clean, suspect submission-side filtering:</strong>{" "}
          two likely culprits are the API key/site pointing at the wrong org or region (metrics
          land in a different Datadog org than you're looking at), or the metric being blocked by
          a metrics filter/exclusion rule server-side. Confirm the site/API key in{" "}
          <code>datadog.yaml</code> or <code>DD_SITE</code>/<code>DD_API_KEY</code> match the org
          you're checking, and as a last resort, run <code>flare</code> and open a support case —
          it packages the exact config and logs Datadog support needs without you manually
          collecting them.
        </p>
        <CodeBlock code={`sudo datadog-agent flare`} lang="bash" />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The Agent is a <strong>fleet of processes</strong>, not one binary: Collector, Forwarder,
          DogStatsD, and the Logs tailer share a core process; Trace, Process, and Security Agents
          run separately and ship independently to Datadog.
        </li>
        <li>
          The <strong>Forwarder is the resilience boundary</strong> — it buffers and retries so
          brief network outages don&apos;t silently drop metrics, logs, or events.
        </li>
        <li>
          Every install surface — host script, Docker, Helm, Datadog Operator — needs the same two
          inputs: <code>DD_API_KEY</code> and <code>DD_SITE</code>. A wrong site is a top cause of
          &quot;my data isn't showing up.&quot;
        </li>
        <li>
          <strong>Autodiscovery</strong> replaces static <code>conf.d</code> files in dynamic
          environments — annotations define a template, and the Agent resolves it against real
          container values (<code>%%host%%</code>, <code>%%port%%</code>, <code>%%env_*%%</code>)
          the moment a matching container appears.
        </li>
        <li>
          The <strong>Cluster Agent</strong> centralizes API server access, Cluster Checks, and the
          External Metrics API for HPA — it does not proxy node Agents&apos; own telemetry.
        </li>
        <li>
          When something isn&apos;t showing up in Datadog, the diagnostic order is always the same:{" "}
          <code>status</code> → <code>configcheck</code> → <code>check &lt;name&gt;</code> →{" "}
          <code>flare</code> if all else fails.
        </li>
      </ul>
    </div>
  );
}
