import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const authFlowDiagram = String.raw`flowchart TD
  REQ["Incoming Request\n(kubectl, kubelet, Pod)"]
  AUTHN["Authentication\n▸ Who are you?\n▸ Certificates, Bearer tokens,\n   OIDC, ServiceAccount tokens"]
  AUTHZ["Authorization (RBAC)\n▸ Can you do this?\n▸ verb + resource + namespace"]
  ADMIT["Admission Control\n▸ Should we allow this?\n▸ Validating & Mutating webhooks\n▸ ResourceQuota, LimitRange, PSA"]
  ETCD["Write to etcd / Execute"]

  REQ --> AUTHN
  AUTHN -->|"authenticated identity"| AUTHZ
  AUTHZ -->|"authorized"| ADMIT
  ADMIT -->|"admitted"| ETCD
  AUTHN -->|"401 Unauthorized"| REJECT1["Rejected"]
  AUTHZ -->|"403 Forbidden"| REJECT2["Rejected"]
  ADMIT -->|"400/422"| REJECT3["Rejected"]`;

const rbacModelDiagram = String.raw`flowchart LR
  subgraph "RBAC Building Blocks"
    SA["ServiceAccount\n(identity for Pods)"]
    U["User / Group\n(kubectl users, CI systems)"]
    ROLE["Role\n(namespace-scoped)\nrules: verbs + resources"]
    CR["ClusterRole\n(cluster-scoped)\nrules: verbs + resources"]
    RB["RoleBinding\n(subject → Role in namespace)"]
    CRB["ClusterRoleBinding\n(subject → ClusterRole)"]
  end
  SA -->|"bound via"| RB
  U -->|"bound via"| RB
  RB -->|"references"| ROLE
  RB -->|"or references"| CR
  U -->|"bound via"| CRB
  CRB -->|"references"| CR`;

const podSecurityDiagram = String.raw`flowchart TD
  NS["Namespace label\npod-security.kubernetes.io/enforce: restricted"]
  PSA["Pod Security Admission\n(built-in since v1.25)"]
  PRIV["privileged\n(anything goes)"]
  BASE["baseline\n(no privilege escalation,\nno host namespaces,\nlimited capabilities)"]
  REST["restricted\n(most secure:\nrunAsNonRoot,\ndrop ALL capabilities,\nseccompProfile required)"]

  NS --> PSA
  PSA --> PRIV
  PSA --> BASE
  PSA --> REST`;

export const toc: TocItem[] = [
  { id: "auth-pipeline", title: "The Authentication → Authorization → Admission Pipeline", level: 2 },
  { id: "rbac-model", title: "RBAC: The Model", level: 2 },
  { id: "roles-vs-clusterroles", title: "Roles vs ClusterRoles", level: 3 },
  { id: "serviceaccounts", title: "ServiceAccounts: Identity for Pods", level: 3 },
  { id: "rbac-patterns", title: "Production RBAC Patterns", level: 2 },
  { id: "pod-security", title: "Pod Security: PSA and Security Contexts", level: 2 },
  { id: "security-contexts", title: "Security Contexts", level: 3 },
  { id: "network-security", title: "Network Security", level: 2 },
  { id: "rbac-comparison", title: "RBAC Object Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RbacAndSecurity() {
  return (
    <div className="article-content">
      <p>
        A misconfigured Kubernetes cluster is a full-cluster compromise vector — not a single
        VM. The same primitives that make Kubernetes powerful (Pods running arbitrary containers,
        ServiceAccounts with API access, wildcard RBAC rules) are what attackers exploit.
        This module covers the security model from first principles: how requests are
        authenticated and authorized, how to write least-privilege RBAC, and how to harden
        Pod security to reduce blast radius.
      </p>

      <h2 id="auth-pipeline">The Authentication → Authorization → Admission Pipeline</h2>
      <p>
        Every request to the Kubernetes API server — whether from kubectl, a kubelet, or a
        Pod calling the API — passes through three sequential gates. Failing any gate stops
        the request.
      </p>

      <MermaidDiagram
        chart={authFlowDiagram}
        title="Kubernetes API Server Request Pipeline"
        caption="Authentication answers WHO. Authorization (RBAC) answers CAN THEY. Admission answers SHOULD WE. All three must pass before a resource is created or modified. Admission is where enforcement of security policies happens."
        minHeight={440}
      />

      <p>
        <strong>Authentication</strong>: Kubernetes does not have a built-in user database.
        Human users authenticate via client certificates (in kubeconfig), OIDC tokens
        (from an identity provider like Okta/Dex), or static bearer tokens. Pods authenticate
        using projected ServiceAccount tokens (JWT, validated against the API server).
      </p>
      <p>
        <strong>Admission Controllers</strong>: After authorization, admission controllers
        run. Mutating controllers run first (they can modify the object — e.g., inject sidecars,
        set defaults). Validating controllers run second (they can reject but not modify).
        The Pod Security Admission controller runs here to enforce pod security standards.
      </p>

      <h2 id="rbac-model">RBAC: The Model</h2>
      <p>
        RBAC has four object types: <strong>Role</strong> (namespace-scoped rules),{" "}
        <strong>ClusterRole</strong> (cluster-scoped rules), <strong>RoleBinding</strong>{" "}
        (binds a subject to a Role in a namespace), and{" "}
        <strong>ClusterRoleBinding</strong> (binds a subject to a ClusterRole globally).
        A subject is a User, Group, or ServiceAccount.
      </p>

      <MermaidDiagram
        chart={rbacModelDiagram}
        title="RBAC Object Relationships"
        caption="A RoleBinding can reference either a Role (namespace-local) or a ClusterRole (reusing cluster-wide rules but scoped to a namespace). This avoids duplicating common role definitions across namespaces."
        minHeight={340}
      />

      <h3 id="roles-vs-clusterroles">Roles vs ClusterRoles</h3>

      <CodeBlock
        code={`# Role: grants permissions within a single namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]          # "" = core API group (Pods, Services, ConfigMaps)
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
---
# ClusterRole: grants permissions cluster-wide (used for cluster-scoped resources)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
  - apiGroups: [""]
    resources: ["nodes"]     # nodes are cluster-scoped, not namespace-scoped
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]`}
        lang="yaml"
        filename="role-examples.yaml"
      />

      <h3 id="serviceaccounts">ServiceAccounts: Identity for Pods</h3>
      <p>
        Every Pod runs as a ServiceAccount. If you do not specify one, it runs as the{" "}
        <code>default</code> ServiceAccount in its namespace. The{" "}
        <code>default</code> ServiceAccount typically has no RBAC permissions, but in older
        clusters it may have been given broad access by mistake.
      </p>
      <p>
        Since Kubernetes v1.24, the API server no longer automatically creates non-expiring
        Secret tokens for ServiceAccounts. Instead, the token controller issues short-lived
        projected tokens (valid 1 hour by default) that are automatically rotated. This is
        more secure than the legacy long-lived Secrets.
      </p>

      <CodeBlock
        code={`# Create a ServiceAccount with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
automountServiceAccountToken: false   # disable auto-mount if app doesn't need K8s API
---
# Bind the ServiceAccount to a Role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: my-app
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
---
# Use the ServiceAccount in the Pod
spec:
  serviceAccountName: my-app
  automountServiceAccountToken: true  # mount the projected token at runtime`}
        lang="yaml"
        filename="serviceaccount-rbac.yaml"
      />

      <h2 id="rbac-patterns">Production RBAC Patterns</h2>
      <p>
        The most critical RBAC principle is <strong>least privilege</strong>: grant only
        the verbs and resources the workload actually needs, scoped to the namespace it
        operates in. Common production patterns:
      </p>

      <CodeBlock
        code={`# ANTI-PATTERN: wildcard RBAC (do not do this)
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
# This gives the ServiceAccount full admin access — equivalent to cluster-admin.

# PATTERN: grant only what's needed
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["my-app-config"]  # restrict to a specific ConfigMap
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["my-app-secrets"]  # restrict to a specific Secret
    verbs: ["get"]

# PATTERN: check what permissions a ServiceAccount has (audit)
kubectl auth can-i list pods --as=system:serviceaccount:production:my-app -n production
kubectl auth can-i create deployments --as=system:serviceaccount:production:my-app

# Check all permissions for a ServiceAccount (requires kubectl-who-can plugin or RBAC lookup)
kubectl get rolebindings,clusterrolebindings -A -o json | \
  jq '.items[] | select(.subjects[]?.name=="my-app")'`}
        lang="bash"
        filename="rbac-audit.sh"
      />

      <ArticleTable
        caption="Common RBAC verbs — grant only what your workload actually calls via the Kubernetes API."
        minWidth={700}
      >
        <table>
          <thead>
            <tr>
              <th>Verb</th>
              <th>HTTP method</th>
              <th>What it allows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>get</code></td>
              <td>GET (single)</td>
              <td>Read a specific named resource</td>
            </tr>
            <tr>
              <td><code>list</code></td>
              <td>GET (collection)</td>
              <td>Read all resources of a type in a namespace</td>
            </tr>
            <tr>
              <td><code>watch</code></td>
              <td>GET with ?watch=true</td>
              <td>Stream changes to resources (used by controllers)</td>
            </tr>
            <tr>
              <td><code>create</code></td>
              <td>POST</td>
              <td>Create a new resource</td>
            </tr>
            <tr>
              <td><code>update</code></td>
              <td>PUT</td>
              <td>Replace a resource entirely</td>
            </tr>
            <tr>
              <td><code>patch</code></td>
              <td>PATCH</td>
              <td>Partially update a resource</td>
            </tr>
            <tr>
              <td><code>delete</code></td>
              <td>DELETE</td>
              <td>Delete a specific resource</td>
            </tr>
            <tr>
              <td><code>deletecollection</code></td>
              <td>DELETE (collection)</td>
              <td>Delete all matching resources — high-risk, rarely needed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="pod-security">Pod Security: PSA and Security Contexts</h2>
      <p>
        <strong>Pod Security Standards (PSS)</strong> are built-in policies (stable since
        v1.25, replacing the deprecated PodSecurityPolicy). They are enforced by the{" "}
        <strong>Pod Security Admission (PSA)</strong> controller via namespace labels.
        Three policy levels: <code>privileged</code> (no restrictions),{" "}
        <code>baseline</code> (reasonable defaults), <code>restricted</code> (maximum security).
      </p>

      <MermaidDiagram
        chart={podSecurityDiagram}
        title="Pod Security Standards Levels"
        caption="Apply 'restricted' to all application namespaces. Reserve 'privileged' only for system namespaces (kube-system). Use 'warn' mode first to identify violations before switching to 'enforce'."
        minHeight={300}
      />

      <CodeBlock
        code={`# Apply Pod Security Standards to a namespace (enforcement labels)
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.36 \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted

# The three modes:
# enforce: rejects non-compliant Pods
# warn: allows but logs a user-facing warning
# audit: allows and logs to audit log only

# Start with warn/audit, then switch to enforce after fixing violations`}
        lang="bash"
        filename="pod-security-admission.sh"
      />

      <h3 id="security-contexts">Security Contexts</h3>
      <p>
        A <strong>securityContext</strong> configures security parameters for a Pod or container:
        which Linux user/group runs the process, whether the container is privileged, what
        capabilities are dropped, and whether the root filesystem is read-only.
      </p>

      <CodeBlock
        code={`spec:
  # Pod-level security context
  securityContext:
    runAsNonRoot: true           # refuse to run as UID 0
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000                # volume ownership
    seccompProfile:
      type: RuntimeDefault       # required for 'restricted' PSA level

  containers:
    - name: app
      image: my-app:v2
      # Container-level security context (overrides Pod-level)
      securityContext:
        allowPrivilegeEscalation: false  # required for 'restricted' level
        readOnlyRootFilesystem: true     # prevent writes to container FS
        capabilities:
          drop:
            - ALL                        # drop all Linux capabilities
          add:
            - NET_BIND_SERVICE           # add back only what's needed (bind to port < 1024)

      volumeMounts:
        # If readOnlyRootFilesystem=true, mount writable dirs explicitly
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache

  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir: {}`}
        lang="yaml"
        filename="security-context.yaml"
      />

      <h2 id="network-security">Network Security</h2>
      <p>
        Default Kubernetes networking is fully permissive — any Pod can reach any other Pod
        across all namespaces. NetworkPolicies (covered in the Services module) provide
        L3/L4 segmentation. For mTLS and L7 policies, a service mesh (Istio, Linkerd) is
        the standard approach in production.
      </p>

      <CodeBlock
        code={`# Minimum network security: default-deny all ingress and egress per namespace
# Then add explicit allow rules for what the app actually needs

# Default deny all ingress in production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # all Pods
  policyTypes:
    - Ingress
    - Egress
  # No rules = deny all ingress AND egress

---
# Allow DNS egress (required for any Pod that does DNS lookups)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP`}
        lang="yaml"
        filename="network-security.yaml"
      />

      <h2 id="rbac-comparison">RBAC Object Comparison</h2>

      <ArticleTable
        caption="RBAC object types and when to use each — the most common mistake is creating ClusterRoleBindings when a RoleBinding would suffice."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Object</th>
              <th>Scope</th>
              <th>Use for</th>
              <th>Production note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Role</strong></td>
              <td>Single namespace</td>
              <td>App-level permissions within a namespace</td>
              <td>Preferred for application RBAC</td>
            </tr>
            <tr>
              <td><strong>ClusterRole</strong></td>
              <td>All namespaces + cluster resources</td>
              <td>Cluster-wide operators, viewing nodes, RBAC templates</td>
              <td>High-risk — grants access everywhere. Audit regularly.</td>
            </tr>
            <tr>
              <td><strong>RoleBinding</strong></td>
              <td>Single namespace</td>
              <td>Grant Role or ClusterRole permissions in one namespace</td>
              <td>ClusterRole + RoleBinding = cluster-wide rules, namespace scope</td>
            </tr>
            <tr>
              <td><strong>ClusterRoleBinding</strong></td>
              <td>All namespaces</td>
              <td>Global operators, cluster-admin, monitoring agents</td>
              <td>Very high-risk. Minimize these. Use RoleBinding + ClusterRole instead.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Explain Kubernetes RBAC and how you would implement least privilege'"
        intro="This question tests security depth. The strong answer covers the object model, common mistakes, and practical enforcement."
        steps={[
          "Describe the model: Role (namespace-scoped rules) + ClusterRole (cluster-wide) bound to subjects (ServiceAccounts, Users, Groups) via RoleBinding or ClusterRoleBinding.",
          "Name the least-privilege principles: use Role over ClusterRole where possible. Use RoleBinding over ClusterRoleBinding. Use resourceNames to restrict to specific objects. Disable automountServiceAccountToken for Pods that don't call the K8s API.",
          "Name the most dangerous anti-patterns: wildcard rules (verbs/resources: [*]), binding to cluster-admin ClusterRole, giving ServiceAccounts the ability to create Pods or manage RBAC (privilege escalation paths).",
          "Explain enforcement: kubectl auth can-i lets you test permissions as any ServiceAccount. In CI/CD, use tools like kube-score or Polaris to detect over-permissive RBAC. Regularly audit ClusterRoleBindings — these are the highest-risk objects.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How would you harden Pod security in Kubernetes?'"
        intro="This is a multi-layer question. Structure your answer as layers: container runtime, OS, networking."
        steps={[
          "Start with Pod Security Standards: apply 'restricted' to application namespaces via PSA labels. This enforces runAsNonRoot, drop ALL capabilities, no privilege escalation, and seccomp profiles.",
          "Security context per container: readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, drop: [ALL], seccompProfile: RuntimeDefault.",
          "Network layer: NetworkPolicy default-deny in each namespace, allow-list only necessary ingress/egress. For mTLS, use a service mesh.",
          "Secrets hygiene: use External Secrets Operator to avoid storing secrets in etcd. Scope RBAC so Pods can only read their own Secrets. Enable etcd encryption at rest.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Audit and Fix an Insecure Kubernetes Configuration"
        scenario={
          <>
            You join a team that has been running a Kubernetes cluster for 6 months. A security
            audit reveals: (1) an application&apos;s ServiceAccount has a ClusterRoleBinding to{" "}
            <code>cluster-admin</code>, (2) Pods in the <code>production</code> namespace run
            as root with no security context, (3) all namespaces allow unrestricted Pod-to-Pod
            traffic. You need to remediate all three issues without breaking the application.
          </>
        }
        tasks={[
          "How would you discover the exact permissions the application actually uses, to replace the cluster-admin binding with a minimal Role?",
          "Write the corrected RBAC — a scoped Role and RoleBinding that replaces the ClusterRoleBinding.",
          "Write the security context to make the application Pod comply with the 'restricted' Pod Security Standard.",
          "Write the NetworkPolicy configuration to implement default-deny for the production namespace while allowing the application to receive traffic from an nginx Ingress controller and make outbound DNS lookups.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# Step 1: Audit what the application actually calls
# Enable audit logging, then filter for ServiceAccount API calls
# OR: check audit logs for the ServiceAccount name over the past 7 days

# kubectl auth can-i (check specific permissions)
kubectl auth can-i list pods \
  --as=system:serviceaccount:production:my-app \
  -n production

# Use rbac-audit or kube-rbac-proxy to see all calls the SA makes
# Check application code: search for client-go / kubernetes SDK usage`}
          lang="bash"
          filename="audit-permissions.sh"
        />
        <CodeBlock
          code={`# Minimal Role replacing cluster-admin (example: app only reads ConfigMaps and Pods)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["my-app-config"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: my-app
    namespace: production
roleRef:
  kind: Role
  name: my-app-role
  apiGroup: rbac.authorization.k8s.io`}
          lang="yaml"
          filename="minimal-rbac.yaml"
        />
        <CodeBlock
          code={`# Restricted-compliant security context
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
---
# Label namespace to enforce restricted PSA
# kubectl label namespace production pod-security.kubernetes.io/enforce=restricted`}
          lang="yaml"
          filename="restricted-pod.yaml"
        />
        <CodeBlock
          code={`# Default deny all + allow ingress from nginx + allow DNS egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-nginx
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - ports:
        - port: 53
          protocol: UDP`}
          lang="yaml"
          filename="network-policies-production.yaml"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Every API request passes authentication → authorization → admission.</strong>{" "}
          RBAC is the authorization layer. Admission controllers enforce policy constraints
          after authorization.
        </li>
        <li>
          <strong>Prefer Role + RoleBinding over ClusterRole + ClusterRoleBinding.</strong>{" "}
          Cluster-level bindings grant access to all namespaces. Minimize them and audit
          them regularly.
        </li>
        <li>
          <strong>Wildcard RBAC (<code>*</code>) is a critical security risk.</strong> It grants
          full API access including the ability to create Pods (container escape risk) and
          manage RBAC (privilege escalation).
        </li>
        <li>
          <strong>Pod Security Standards (PSA) enforce container hardening</strong> at the
          namespace level. Use <code>restricted</code> for all application namespaces. Start
          with <code>warn</code> mode to identify violations before enforcing.
        </li>
        <li>
          <strong>Default-deny NetworkPolicy + explicit allow rules</strong> implement
          zero-trust networking inside the cluster. Remember to explicitly allow DNS egress
          (port 53/UDP) — without it, all DNS lookups fail.
        </li>
        <li>
          <strong>automountServiceAccountToken: false</strong> should be set on any Pod that
          does not call the Kubernetes API. The mounted token is a credential that can be
          exfiltrated by a compromised container.
        </li>
      </ul>
    </div>
  );
}
