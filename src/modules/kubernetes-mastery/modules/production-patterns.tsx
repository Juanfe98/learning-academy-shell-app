import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cicdPipelineDiagram = String.raw`sequenceDiagram
  participant Dev as Developer
  participant CI as CI (GitHub Actions)
  participant Reg as Container Registry
  participant CD as CD (ArgoCD / Flux)
  participant K8s as Kubernetes

  Dev->>CI: git push (PR merged)
  CI->>CI: build + test
  CI->>Reg: docker push myapp:sha-abc123
  CI->>CI: update manifests (Kustomize/Helm values)
  CI->>CD: trigger sync (or CD polls git)
  CD->>K8s: kubectl apply (new image tag)
  K8s->>K8s: rolling update
  CD-->>Dev: deployment status notification`;

const multiEnvDiagram = String.raw`flowchart LR
  GIT["Git Repository\n(single source of truth)"]

  subgraph "Environments"
    DEV["dev namespace\nimage: sha-latest\nreplicas: 1"]
    STG["staging namespace\nimage: sha-rc1\nreplicas: 2"]
    PROD["production namespace\nimage: sha-v1.2.3\nreplicas: 5"]
  end

  GIT -->|"ArgoCD App\nauto-sync on commit"| DEV
  GIT -->|"ArgoCD App\nauto-sync on PR merge"| STG
  GIT -->|"ArgoCD App\nmanual sync (with approval)"| PROD`;

const upgradeStrategyDiagram = String.raw`flowchart TD
  CURRENT["Current: v1 (3 replicas)"]
  RU["RollingUpdate\nmaxSurge=1 maxUnavailable=0\nSafe, zero downtime\nBoth versions live briefly"]
  BLUE["Blue/Green\nDeploy v2 alongside v1\nSwitch Service selector\nInstant cutover, easy rollback"]
  CANARY["Canary\n10% traffic to v2\nMonitor errors+latency\nGradually increase or rollback"]

  CURRENT --> RU & BLUE & CANARY`;

export const toc: TocItem[] = [
  { id: "gitops-overview", title: "GitOps: The Production Standard", level: 2 },
  { id: "argocd-flux", title: "ArgoCD vs Flux", level: 3 },
  { id: "helm-kustomize", title: "Helm vs Kustomize: Packaging Your Apps", level: 2 },
  { id: "deployment-strategies", title: "Deployment Strategies", level: 2 },
  { id: "multi-environment", title: "Multi-Environment Patterns", level: 3 },
  { id: "graceful-shutdown", title: "Graceful Shutdown and Zero-Downtime Deploys", level: 2 },
  { id: "namespaces-tenancy", title: "Namespaces and Multi-Tenancy", level: 2 },
  { id: "resource-quotas", title: "Resource Quotas", level: 3 },
  { id: "production-checklist", title: "Production Readiness Checklist", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ProductionPatterns() {
  return (
    <div className="article-content">
      <p>
        Everything in the previous modules is building blocks. This module is about how you
        put them together into a production system that your team can operate, that survives
        incidents, and that can be changed safely at speed. GitOps, deployment strategies,
        multi-environment management, and graceful shutdown are not optional niceties — they
        are the practices that determine whether your Kubernetes cluster is an asset or a
        liability.
      </p>

      <h2 id="gitops-overview">GitOps: The Production Standard</h2>
      <p>
        <strong>GitOps</strong> means your Git repository is the authoritative source of truth
        for cluster state. A GitOps operator (ArgoCD, Flux) continuously reconciles what is in
        Git with what is in the cluster. Any drift — whether caused by a <code>kubectl</code>{" "}
        command, an incident patch, or an errant automation — is detected and can be
        auto-corrected.
      </p>
      <p>
        The production benefit is auditable, reviewable, rollback-able deployments. A bad
        deployment is a git revert — no special tooling, no tribal knowledge. Every change to
        production has a PR, a review, and a timestamp.
      </p>

      <MermaidDiagram
        chart={cicdPipelineDiagram}
        title="GitOps CI/CD Pipeline"
        caption="CI builds and tests; CD (ArgoCD/Flux) owns the deployment. The image tag commit in Git is the deployment artifact — ArgoCD syncs the cluster to match Git state, not imperative kubectl commands."
        minHeight={380}
      />

      <h3 id="argocd-flux">ArgoCD vs Flux</h3>
      <p>
        Both ArgoCD and Flux implement GitOps; they have different operational models.
        ArgoCD provides a rich UI and is application-centric (each Application CRD maps one
        Git path to one cluster namespace). Flux is more GitOps-native (everything is a CRD
        synced from Git), has a lighter footprint, and is better for multi-cluster and
        multi-tenant setups.
      </p>

      <ArticleTable
        caption="ArgoCD vs Flux — both are production-ready. Choose based on team workflow and multi-cluster needs."
        minWidth={720}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>ArgoCD</th>
              <th>Flux</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>UI</td>
              <td>Rich web UI with sync status, app graph</td>
              <td>CLI-first; optional Weave GitOps UI</td>
            </tr>
            <tr>
              <td>Config source</td>
              <td>Application CRD points to Git path</td>
              <td>GitRepository + Kustomization CRDs</td>
            </tr>
            <tr>
              <td>Multi-cluster</td>
              <td>Central ArgoCD instance manages multiple clusters</td>
              <td>Each cluster runs its own Flux controllers</td>
            </tr>
            <tr>
              <td>Multi-tenancy</td>
              <td>App-level RBAC, Projects for team isolation</td>
              <td>Multi-tenancy via multiple Flux instances or tenant scoping</td>
            </tr>
            <tr>
              <td>Helm support</td>
              <td>First-class HelmRelease CRD</td>
              <td>HelmRelease CRD</td>
            </tr>
            <tr>
              <td>CNCF status</td>
              <td>Graduated</td>
              <td>Graduated</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="helm-kustomize">Helm vs Kustomize: Packaging Your Apps</h2>
      <p>
        <strong>Helm</strong> is a package manager — it templatizes Kubernetes manifests and
        bundles them as charts with versioned releases. Use it for deploying third-party
        software (nginx ingress, cert-manager, Prometheus) and for packaging your own apps
        with clean, parameterized configuration.
      </p>
      <p>
        <strong>Kustomize</strong> is a configuration layer — it overlays patches and
        transformations on base Kubernetes manifests without templating. Use it for managing
        environment-specific differences (production needs 5 replicas; staging needs 2) over
        a shared base.
      </p>

      <CodeBlock
        code={`# Kustomize: base + environment overlays pattern
# base/deployment.yaml — shared configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1   # overridden per environment
  template:
    spec:
      containers:
        - name: api
          image: my-api    # image tag patched by CI
---
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - target:
      kind: Deployment
      name: api
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests: {cpu: "500m", memory: "512Mi"}
          limits: {cpu: "1000m", memory: "1Gi"}
images:
  - name: my-api
    newTag: "sha-abc123"   # set by CI pipeline`}
        lang="yaml"
        filename="kustomize-overlays.yaml"
      />

      <h2 id="deployment-strategies">Deployment Strategies</h2>

      <MermaidDiagram
        chart={upgradeStrategyDiagram}
        title="Kubernetes Deployment Strategies"
        caption="RollingUpdate is the default and safe for most cases. Blue/Green gives instant rollback with no in-flight version mixing. Canary reduces blast radius by directing a small percentage to the new version first."
        minHeight={280}
      />

      <CodeBlock
        code={`# Blue/Green deployment: deploy v2 alongside v1, switch Service selector
# Step 1: Deploy v2 as a separate Deployment with different labels
kubectl apply -f deployment-v2.yaml   # spec.template.labels.version: v2

# Step 2: Verify v2 is healthy
kubectl rollout status deployment/api-v2

# Step 3: Switch the Service to v2 (instant cutover)
kubectl patch service api-svc \
  -p '{"spec":{"selector":{"app":"api","version":"v2"}}}'

# Step 4: Monitor; rollback is instant — patch selector back to v1
# kubectl patch service api-svc -p '{"spec":{"selector":{"app":"api","version":"v1"}}}'

# Step 5: Delete v1 Deployment when satisfied
kubectl delete deployment api-v1

---
# Canary: Nginx Ingress canary annotation (simple approach)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"  # 10% of traffic
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-v2-svc
                port:
                  number: 80`}
        lang="yaml"
        filename="deployment-strategies.yaml"
      />

      <h3 id="multi-environment">Multi-Environment Patterns</h3>

      <MermaidDiagram
        chart={multiEnvDiagram}
        title="Multi-Environment GitOps Pattern"
        caption="Each environment is an ArgoCD Application pointing to a different overlay path in Git. Promotion is a Git operation (merge/PR), not an imperative kubectl command. Production requires manual approval."
        minHeight={260}
      />

      <h2 id="graceful-shutdown">Graceful Shutdown and Zero-Downtime Deploys</h2>
      <p>
        One of the most common production issues in Kubernetes is requests failing during
        rolling updates. This happens because the container receives a <code>SIGTERM</code>{" "}
        but keeps accepting connections while the load balancer still routes to it, or the
        app exits too fast before in-flight requests complete. Fixing this requires both
        Kubernetes-side and application-side configuration.
      </p>

      <CodeBlock
        code={`# Kubernetes-side: add a preStop hook to delay container termination
spec:
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"]
      # Why sleep 5? The Service endpoint removal is asynchronous. By sleeping 5s,
      # we give the EndpointSlice controller time to remove this Pod from the load balancer
      # before we start rejecting connections.

  terminationGracePeriodSeconds: 60  # default 30s; give app time to drain requests
  # The shutdown sequence:
  # 1. SIGTERM sent to container
  # 2. preStop hook runs (sleep 5)
  # 3. SIGTERM sent again (if preStop used exec)
  # 4. App drains in-flight requests
  # 5. App exits 0
  # 6. After terminationGracePeriodSeconds: SIGKILL (forced kill)`}
        lang="yaml"
        filename="graceful-shutdown.yaml"
      />

      <CodeBlock
        code={`# Application-side: handle SIGTERM gracefully (Node.js example)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Wait for in-flight requests to complete (max 30s)
  const deadline = Date.now() + 30_000;
  while (server.listening && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Close database connections
  await db.disconnect();

  console.log('Graceful shutdown complete');
  process.exit(0);
});`}
        lang="javascript"
        filename="graceful-shutdown.js"
      />

      <h2 id="namespaces-tenancy">Namespaces and Multi-Tenancy</h2>
      <p>
        Namespaces provide a soft isolation boundary: RBAC, NetworkPolicy, ResourceQuota,
        and LimitRange are all scoped to namespaces. They do not provide hard multi-tenancy
        (different teams cannot share a cluster without trusting each other) — for true
        isolation, use separate clusters or virtual cluster tools (vCluster).
      </p>
      <p>
        Standard namespace patterns: <code>kube-system</code> (cluster infrastructure),{" "}
        <code>default</code> (avoid using — always deploy to named namespaces),{" "}
        environment namespaces (<code>dev</code>, <code>staging</code>,{" "}
        <code>production</code>), or team namespaces (<code>team-checkout</code>,{" "}
        <code>team-payments</code>).
      </p>

      <h3 id="resource-quotas">Resource Quotas</h3>
      <p>
        <strong>ResourceQuota</strong> limits total resource consumption per namespace —
        preventing one team from consuming all cluster capacity. Combine with{" "}
        <strong>LimitRange</strong> (sets defaults and max per container) to ensure every
        Pod has requests/limits set.
      </p>

      <CodeBlock
        code={`# ResourceQuota: namespace-level resource cap
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"          # total CPU requests in namespace <= 20 cores
    requests.memory: 40Gi       # total memory requests <= 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    count/pods: "100"           # max 100 Pods
    count/services: "20"
    count/persistentvolumeclaims: "30"
    requests.storage: 500Gi     # total PVC storage requests

---
# LimitRange: per-container defaults and maximums
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:                  # applied if container has no limits
        cpu: "500m"
        memory: 256Mi
      defaultRequest:           # applied if container has no requests
        cpu: "100m"
        memory: 128Mi
      max:                      # hard ceiling per container
        cpu: "4"
        memory: 4Gi
      min:                      # minimum allowed
        cpu: "50m"
        memory: 64Mi`}
        lang="yaml"
        filename="resource-quota-limitrange.yaml"
      />

      <h2 id="production-checklist">Production Readiness Checklist</h2>

      <ArticleTable
        caption="These are the minimum configurations for a production-ready Kubernetes workload. Missing any of these creates an operational risk."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Required configuration</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Availability</strong></td>
              <td>replicas ≥ 2, PodDisruptionBudget, TopologySpreadConstraints</td>
              <td>Single replica = single point of failure; no PDB = full outage during node drain</td>
            </tr>
            <tr>
              <td><strong>Resources</strong></td>
              <td>requests AND limits for CPU + memory on every container</td>
              <td>Without requests, HPA doesn't work; without limits, memory leak = node OOM</td>
            </tr>
            <tr>
              <td><strong>Health probes</strong></td>
              <td>readinessProbe + livenessProbe (different endpoints, tuned delays)</td>
              <td>Without readiness, traffic goes to initializing Pods; without liveness, hung Pods accumulate</td>
            </tr>
            <tr>
              <td><strong>Graceful shutdown</strong></td>
              <td>preStop sleep hook + application SIGTERM handler</td>
              <td>Without it, in-flight requests fail on every rolling update</td>
            </tr>
            <tr>
              <td><strong>Security</strong></td>
              <td>Non-root user, drop ALL capabilities, readOnlyRootFilesystem, minimal RBAC</td>
              <td>Running as root = container escape risk; wildcard RBAC = full cluster access</td>
            </tr>
            <tr>
              <td><strong>Autoscaling</strong></td>
              <td>HPA with CPU target (or KEDA for queue-based) + Cluster Autoscaler</td>
              <td>Fixed replicas = over-provisioned at night, under-provisioned during spikes</td>
            </tr>
            <tr>
              <td><strong>Observability</strong></td>
              <td>Prometheus metrics endpoint, structured logging, OTel traces</td>
              <td>Without metrics/logs/traces, debugging incidents takes 10x longer</td>
            </tr>
            <tr>
              <td><strong>GitOps</strong></td>
              <td>All manifests in Git, ArgoCD or Flux for deployment</td>
              <td>kubectl apply in CI = no audit trail, no drift detection, no rollback</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is GitOps and how does it improve Kubernetes operations?'"
        intro="GitOps is a team process question as much as a technical one. The strong answer covers the operational benefits, not just the tooling."
        steps={[
          "Define it: GitOps means Git is the single source of truth for cluster state. An operator (ArgoCD, Flux) continuously reconciles the cluster toward what Git declares.",
          "Name the operational benefits: every production change has a PR (review, approval, audit trail). Rollback is git revert. Drift detection catches manual kubectl commands that bypass the pipeline.",
          "Contrast with push-based CD: kubectl apply in CI is imperative and stateless — no drift detection, no convergence loop, no audit trail of who changed what.",
          "Name the tradeoff: GitOps requires discipline to never use kubectl in production (tempting during incidents). Teams often need a break-glass procedure for emergency patches that bypass GitOps (then backfill the change in Git).",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How do you achieve zero-downtime deployments in Kubernetes?'"
        intro="This requires knowing both the Kubernetes-side and application-side configuration. Many engineers only know half."
        steps={[
          "Rolling update strategy: set maxUnavailable: 0 and maxSurge: 1 so new Pods are created before old ones are terminated.",
          "Readiness probe: the rolling update waits until new Pods pass their readiness probe before terminating old ones. Without a readiness probe, traffic is sent to Pods that may not be ready.",
          "Graceful shutdown (this is the part most miss): add a preStop sleep hook (5-15s) to give the EndpointSlice controller time to remove the Pod from the load balancer before the container starts shutting down. Then the app should handle SIGTERM by draining in-flight requests before exiting.",
          "terminationGracePeriodSeconds: set to longer than your longest expected request duration. The default 30s is often too short for long-running requests.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Design a Production-Ready Deployment for a New Service"
        scenario={
          <>
            You are onboarding a new payment processing microservice. It handles sensitive
            financial transactions, must have zero downtime during deployments, and will
            receive 100-500 RPM with occasional spikes to 2000 RPM. It talks to a PostgreSQL
            database and an external payment gateway API.
          </>
        }
        tasks={[
          "Write the Deployment manifest skeleton covering: replicas, rolling update strategy, readiness/liveness probes, resource requests/limits, security context, and graceful shutdown hook.",
          "What RBAC and namespace configuration would you set up for this service?",
          "Design the autoscaling configuration: which metric would you use for HPA, what min/max replicas, and what PodDisruptionBudget?",
          "List the top 3 observability instrumentation requirements you would mandate for this service before it goes to production.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: payments
spec:
  replicas: 3       # min for HA; HPA will scale above this
  selector:
    matchLabels:
      app: payment-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # never reduce below 3 ready replicas
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      serviceAccountName: payment-api
      automountServiceAccountToken: false

      # Graceful shutdown
      terminationGracePeriodSeconds: 60

      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile:
          type: RuntimeDefault

      # Spread across nodes and AZs
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-api
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-api

      containers:
        - name: payment-api
          image: payment-api:latest
          ports:
            - containerPort: 8080

          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]

          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"

          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3

          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3

          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]

          volumeMounts:
            - name: tmp
              mountPath: /tmp

      volumes:
        - name: tmp
          emptyDir: {}`}
          lang="yaml"
          filename="payment-deployment.yaml"
        />
        <CodeBlock
          code={`# HPA: scale on CPU (payments API is CPU-bound per transaction)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-api-hpa
  namespace: payments
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0   # scale up fast for payment spikes
    scaleDown:
      stabilizationWindowSeconds: 300

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-api-pdb
  namespace: payments
spec:
  minAvailable: 2   # always keep 2 available during node maintenance
  selector:
    matchLabels:
      app: payment-api`}
          lang="yaml"
          filename="payment-scaling.yaml"
        />
        <p><strong>Top 3 observability requirements before production:</strong></p>
        <ol>
          <li>
            <strong>Structured JSON logs</strong> with <code>traceId</code>,{" "}
            <code>transactionId</code>, <code>userId</code>, and error details. Financial
            services require audit logs that are immutable and retained for regulatory periods.
          </li>
          <li>
            <strong>Prometheus metrics</strong> including: request rate by status code,
            P50/P95/P99 latency, payment gateway call latency and error rate, and database
            connection pool utilization. Alert on payment gateway error rate &gt; 0.1%.
          </li>
          <li>
            <strong>Distributed tracing (OpenTelemetry)</strong> with 100% sampling for
            failed transactions. For financial services, every failed transaction should have
            a complete trace for audit purposes. For successful transactions, sample at 5-10%.
          </li>
        </ol>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>GitOps (ArgoCD/Flux) is the production standard</strong> for Kubernetes
          deployments. Git is the source of truth; every change has a PR, a review, and
          a rollback path.
        </li>
        <li>
          <strong>Zero-downtime deployments require both sides:</strong> Kubernetes needs
          <code>maxUnavailable: 0</code> and a readiness probe; the application needs a
          SIGTERM handler and a preStop sleep hook.
        </li>
        <li>
          <strong>Kustomize for environment-specific config</strong> (base + overlays);
          Helm for packaging third-party and reusable charts. Both work with GitOps.
        </li>
        <li>
          <strong>ResourceQuota + LimitRange</strong> protect shared clusters from noisy
          neighbors and ensure all Pods have requests/limits set.
        </li>
        <li>
          Use <strong>namespace-per-environment or namespace-per-team</strong> for soft
          isolation. For true isolation between untrusted tenants, use separate clusters
          or vCluster.
        </li>
        <li>
          The production readiness checklist (replicas, probes, resources, security,
          PDB, HPA, observability, GitOps) is what distinguishes a Kubernetes workload
          that is operationally sound from one that will create incidents.
        </li>
      </ul>
    </div>
  );
}
