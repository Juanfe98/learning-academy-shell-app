import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const secretInjectionDiagram = String.raw`flowchart TD
  SEC["Secret\n(base64 in etcd, optionally encrypted)"]
  CM["ConfigMap\n(plaintext in etcd)"]

  subgraph "Injection Methods"
    ENV["Environment Variables\n(static at Pod start)"]
    VOL["Volume Mount\n(files in container FS)"]
    API["API call from app\n(runtime fetch)"]
  end

  SEC -->|"secretRef / secretKeyRef"| ENV
  SEC -->|"secret volume"| VOL
  CM -->|"configMapRef / configMapKeyRef"| ENV
  CM -->|"configMap volume"| VOL
  SEC -->|"K8s SDK / Vault agent"| API

  ENV -->|"restart required on change"| APP["Application"]
  VOL -->|"auto-updated on change\n(~60s kubelet sync)"| APP
  API -->|"always fresh"| APP`;

const secretEncryptionDiagram = String.raw`flowchart LR
  W["kubectl create secret"]
  A["kube-apiserver\n(receives plaintext)"]
  EP["Encryption Provider\n(AES-GCM / KMS)"]
  E["etcd\n(encrypted bytes stored)"]
  R["Read: apiserver decrypts\nbefore returning to kubelet"]

  W --> A
  A --> EP
  EP --> E
  E --> R
  R -->|"plaintext delivered\nto Pod via kubelet"| P["Pod"]`;

export const toc: TocItem[] = [
  { id: "configmaps", title: "ConfigMaps: Externalizing Configuration", level: 2 },
  { id: "secrets", title: "Secrets: Sensitive Data", level: 2 },
  { id: "base64-is-not-encryption", title: "base64 Is Not Encryption", level: 3 },
  { id: "injection-methods", title: "Injection Methods: env vs Volume", level: 2 },
  { id: "env-vars", title: "Environment Variables", level: 3 },
  { id: "volume-mounts", title: "Volume Mounts", level: 3 },
  { id: "encryption-at-rest", title: "Encryption at Rest", level: 2 },
  { id: "external-secrets", title: "External Secrets: Production Pattern", level: 2 },
  { id: "comparison-table", title: "Comparison: When to Use Which", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ConfigAndSecrets() {
  return (
    <div className="article-content">
      <p>
        Kubernetes separates configuration from container images through ConfigMaps and Secrets.
        This sounds simple until you hit production: Secrets are not actually encrypted by default,
        live ConfigMap updates require careful handling, and the standard Kubernetes Secret pattern
        fails most enterprise security audits. This module covers the mechanics and the production
        patterns that actually hold up.
      </p>

      <h2 id="configmaps">ConfigMaps: Externalizing Configuration</h2>
      <p>
        A <strong>ConfigMap</strong> holds arbitrary key-value pairs or file contents — anything
        that is not sensitive. Use it for feature flags, application configuration files, nginx
        configs, database connection strings (non-password parts), environment-specific settings.
        ConfigMaps are plaintext — do not put passwords or API keys here.
      </p>

      <CodeBlock
        code={`# Create a ConfigMap from literal values
kubectl create configmap app-config \
  --from-literal=DATABASE_HOST=postgres.default.svc.cluster.local \
  --from-literal=CACHE_TTL=300 \
  --from-literal=LOG_LEVEL=info

# Create a ConfigMap from a file (useful for nginx.conf, application.yaml, etc.)
kubectl create configmap nginx-config --from-file=nginx.conf

# The equivalent manifest
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  CACHE_TTL: "300"
  LOG_LEVEL: "info"
  # Multi-line values (e.g., full config file)
  application.yaml: |
    server:
      port: 8080
    database:
      host: postgres.default.svc.cluster.local
      maxConnections: 20`}
        lang="yaml"
        filename="configmap.yaml"
      />

      <h2 id="secrets">Secrets: Sensitive Data</h2>
      <p>
        A <strong>Secret</strong> is structurally similar to a ConfigMap but intended for
        sensitive data: passwords, TLS certificates, OAuth tokens, API keys. The data values
        are base64-encoded in the YAML/JSON representation.
      </p>

      <CodeBlock
        code={`# Create a Secret from literals (kubectl handles base64 encoding)
kubectl create secret generic db-credentials \
  --from-literal=DB_PASSWORD=supersecret \
  --from-literal=DB_USER=myapp

# Create a TLS Secret from cert files
kubectl create secret tls api-tls \
  --cert=tls.crt \
  --key=tls.key

# The equivalent manifest (values must be base64-encoded)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque   # generic; other types: kubernetes.io/tls, kubernetes.io/dockerconfigjson
data:
  DB_PASSWORD: c3VwZXJzZWNyZXQ=  # echo -n "supersecret" | base64
  DB_USER: bXlhcHA=               # echo -n "myapp" | base64

# Or use stringData (Kubernetes base64-encodes it for you)
stringData:
  DB_PASSWORD: supersecret  # plaintext → Kubernetes stores as base64`}
        lang="yaml"
        filename="secret.yaml"
      />

      <h3 id="base64-is-not-encryption">base64 Is Not Encryption</h3>
      <p>
        This is the most important thing to understand about Kubernetes Secrets:{" "}
        <strong>base64 encoding is trivially reversible</strong>. Anyone with read access to the
        Secret object (via RBAC) or read access to the etcd backup can decode the value in
        seconds. Kubernetes Secrets stored in etcd are stored as base64-encoded plaintext by
        default.
      </p>
      <CodeBlock
        code={`# Anyone with kubectl access can decode a Secret trivially:
kubectl get secret db-credentials -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
# Output: supersecret

# In etcd (without encryption at rest), the value is readable:
# /registry/secrets/default/db-credentials
# → {..."DB_PASSWORD":"c3VwZXJzZWNyZXQ="}
# base64 decode → supersecret`}
        lang="bash"
        filename="decode-secret.sh"
      />

      <p>
        The implication: Secret security comes from <strong>RBAC</strong> (who can read Secret
        objects), <strong>encryption at rest</strong> (encrypting etcd data), and ideally from
        an <strong>external secrets manager</strong> (Vault, AWS Secrets Manager, GCP Secret
        Manager) so secrets never live in etcd at all.
      </p>

      <h2 id="injection-methods">Injection Methods: env vs Volume</h2>

      <MermaidDiagram
        chart={secretInjectionDiagram}
        title="ConfigMap and Secret Injection Methods"
        caption="Volume-mounted Secrets auto-update when the Secret changes (~60s kubelet sync cycle). Environment variable injection does not — the Pod must be restarted to pick up Secret changes."
        minHeight={420}
      />

      <h3 id="env-vars">Environment Variables</h3>
      <CodeBlock
        code={`spec:
  containers:
    - name: app
      image: my-app:v2
      env:
        # Inject a single key from a Secret
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_PASSWORD
        # Inject a single key from a ConfigMap
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
      envFrom:
        # Inject ALL keys from a ConfigMap as env vars
        - configMapRef:
            name: app-config
        # Inject ALL keys from a Secret as env vars
        - secretRef:
            name: db-credentials`}
        lang="yaml"
        filename="env-injection.yaml"
      />

      <h3 id="volume-mounts">Volume Mounts</h3>
      <p>
        Volume-mounted Secrets are written as files in the container&apos;s filesystem.
        The kubelet updates them automatically (within ~60s) when the Secret changes —
        <em>without restarting the Pod</em>. This is the preferred pattern for TLS certificates
        (which rotate on a schedule) and any config the application can reload without restart.
      </p>
      <CodeBlock
        code={`spec:
  volumes:
    - name: db-creds
      secret:
        secretName: db-credentials
        defaultMode: 0400   # read-only for owner, no access for group/other
    - name: app-config-vol
      configMap:
        name: app-config
  containers:
    - name: app
      image: my-app:v2
      volumeMounts:
        - name: db-creds
          mountPath: /run/secrets/db
          readOnly: true
        - name: app-config-vol
          mountPath: /etc/app
          readOnly: true
# Result: /run/secrets/db/DB_PASSWORD contains the secret value
#         /etc/app/LOG_LEVEL contains the config value`}
        lang="yaml"
        filename="volume-injection.yaml"
      />

      <h2 id="encryption-at-rest">Encryption at Rest</h2>
      <p>
        To encrypt Secrets in etcd, you configure the API server with an{" "}
        <code>EncryptionConfiguration</code>. The API server encrypts data before writing to
        etcd and decrypts when reading. The kubelet never sees encrypted data — it receives
        plaintext from the API server.
      </p>

      <MermaidDiagram
        chart={secretEncryptionDiagram}
        title="Secret Encryption at Rest Flow"
        caption="Encryption at rest protects against an attacker who gains direct access to etcd or its backups. It does NOT protect against someone with kubectl Secret read access via RBAC — they receive plaintext from the API server."
        minHeight={250}
      />

      <CodeBlock
        code={`# /etc/kubernetes/encryption-config.yaml (on control plane node)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:                     # AES-CBC with PKCS#7 padding
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}                # fallback: read unencrypted existing secrets`}
        lang="yaml"
        filename="encryption-config.yaml"
      />

      <h2 id="external-secrets">External Secrets: Production Pattern</h2>
      <p>
        For production workloads in regulated environments, storing secrets in etcd is often
        not acceptable even with encryption at rest. The industry standard pattern is to use an
        <strong>external secrets manager</strong> and synchronize secrets into Kubernetes at
        runtime. Two common approaches:
      </p>
      <ol>
        <li>
          <strong>External Secrets Operator (ESO)</strong>: a Kubernetes operator that watches
          <code>ExternalSecret</code> CRDs and syncs secrets from AWS Secrets Manager, GCP
          Secret Manager, HashiCorp Vault, or Azure Key Vault into Kubernetes Secrets. The
          Kubernetes Secret is a short-lived cache — ESO refreshes it on a schedule.
        </li>
        <li>
          <strong>Vault Agent Injector</strong>: a mutating admission webhook that injects a
          Vault sidecar into Pods. The sidecar authenticates to Vault, fetches secrets, and
          writes them to a shared volume. Secrets never touch etcd at all.
        </li>
      </ol>

      <CodeBlock
        code={`# External Secrets Operator example: sync from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials          # creates/updates this Kubernetes Secret
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD      # key in the Kubernetes Secret
      remoteRef:
        key: production/myapp/db  # path in AWS Secrets Manager
        property: password        # property within the secret JSON`}
        lang="yaml"
        filename="external-secret.yaml"
      />

      <h2 id="comparison-table">Comparison: When to Use Which</h2>

      <ArticleTable
        caption="Choose the right mechanism for each type of configuration data — using the wrong one creates either security gaps or operational friction."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>For</th>
              <th>Security</th>
              <th>Live reload</th>
              <th>Production verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ConfigMap (env var)</strong></td>
              <td>Non-sensitive config flags</td>
              <td>Plaintext in etcd</td>
              <td>No (restart required)</td>
              <td>Fine for non-sensitive data. Do not use for secrets.</td>
            </tr>
            <tr>
              <td><strong>ConfigMap (volume)</strong></td>
              <td>Config files (nginx.conf, app.yaml)</td>
              <td>Plaintext in etcd</td>
              <td>Yes (~60s)</td>
              <td>Best for config files that apps can hot-reload.</td>
            </tr>
            <tr>
              <td><strong>Secret (env var)</strong></td>
              <td>Passwords, API keys</td>
              <td>base64 in etcd (not encrypted by default)</td>
              <td>No (restart required)</td>
              <td>Acceptable in non-regulated environments with tight RBAC.</td>
            </tr>
            <tr>
              <td><strong>Secret (volume)</strong></td>
              <td>TLS certs, rotating credentials</td>
              <td>base64 in etcd</td>
              <td>Yes (~60s)</td>
              <td>Preferred for certs. Still needs RBAC and encryption at rest.</td>
            </tr>
            <tr>
              <td><strong>Encryption at rest</strong></td>
              <td>Secrets in etcd</td>
              <td>AES-GCM / KMS encrypted in etcd</td>
              <td>Transparent</td>
              <td>Required for production. Add to all clusters.</td>
            </tr>
            <tr>
              <td><strong>External Secrets (ESO/Vault)</strong></td>
              <td>All sensitive credentials</td>
              <td>Never written to etcd</td>
              <td>On rotation schedule</td>
              <td>Gold standard for regulated environments and large teams.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Are Kubernetes Secrets actually secure?'"
        intro="The honest answer is 'it depends on how you configure them.' This question tests whether you know the nuances beyond 'yes we use Secrets.'"
        steps={[
          "Lead with the base64 caveat: by default, Secrets are base64-encoded in etcd — trivially reversible. Anyone with RBAC access to read the Secret object gets the plaintext value.",
          "Name the three layers of Secret security: RBAC (who can read Secret objects), encryption at rest (configuring EncryptionConfiguration on the API server), and external secrets managers (Vault, ESO) that keep secrets out of etcd entirely.",
          "Distinguish volume mount vs env var: volume-mounted Secrets are live-updated; env var Secrets require Pod restart. For rotating credentials (TLS, short-lived tokens), volume mounts are the better pattern.",
          "Close with production recommendation: use encryption at rest as a baseline, external secrets operators for regulated environments, and tight RBAC to limit who can read Secret objects.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'When would you use a volume mount vs environment variable for a ConfigMap?'"
        intro="This reveals whether you understand the live-reload behavior that separates the two patterns."
        steps={[
          "Environment variables: injected at Pod start, static for the lifetime of the Pod. Use for simple flags and values that the app reads once at startup.",
          "Volume mounts: written as files, auto-updated by the kubelet within ~60s when the ConfigMap changes. Use when the app can watch and reload its config file (nginx, Envoy, most 12-factor apps with config watchers).",
          "The critical gotcha: if you inject an nginx.conf as an env var and update the ConfigMap, nothing changes until you restart the Pod. Inject it as a volume and nginx can be sent SIGHUP to reload without downtime.",
          "Production pattern: use volumes for configuration files that can be hot-reloaded, env vars for simple scalar values that only change with releases.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Secure a Multi-Environment Configuration"
        scenario={
          <>
            You are deploying a web application to both staging and production namespaces.
            The app needs: a database connection string (host is environment-specific, password
            is sensitive), an nginx configuration file (must hot-reload without Pod restart
            when changed), and an API key for an external payment service.
          </>
        }
        tasks={[
          "Design the ConfigMap and Secret structure. Which values go in ConfigMap vs Secret, and why?",
          "Write the volume and env var injection configuration for the app container that satisfies the hot-reload requirement for nginx.conf.",
          "Explain why you would or would not use envFrom to inject all ConfigMap keys as env vars.",
          "What RBAC rules would you add to ensure the application Pod can only read its own Secret, not all Secrets in the namespace?",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# ConfigMap: non-sensitive, environment-specific values
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_HOST: "postgres.production.svc.cluster.local"
  DATABASE_PORT: "5432"
  # nginx config as a file (hot-reloadable via volume)
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://localhost:8080;
      }
    }
---
# Secret: sensitive credentials
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "production-password-here"
  PAYMENT_API_KEY: "sk_live_..."
---
# Pod spec
spec:
  volumes:
    - name: nginx-conf
      configMap:
        name: app-config
        items:
          - key: nginx.conf
            path: nginx.conf  # only mount the nginx.conf key, not all keys
  containers:
    - name: nginx
      image: nginx:1.25
      volumeMounts:
        - name: nginx-conf
          mountPath: /etc/nginx/conf.d
          readOnly: true
    - name: app
      image: my-app:v2
      env:
        # Scalar non-sensitive values as env vars (fine for static values)
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
        # Sensitive values individually injected from Secret
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        - name: PAYMENT_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: PAYMENT_API_KEY`}
          lang="yaml"
          filename="config-solution.yaml"
        />
        <p>
          <strong>Why not envFrom for the whole ConfigMap:</strong> <code>envFrom</code> injects
          all keys, including <code>nginx.conf</code> (the multi-line file). This pollutes the
          env with a multi-line nginx config blob and is confusing. Inject individual scalar keys
          explicitly; mount the file key as a volume.
        </p>
        <CodeBlock
          code={`# RBAC: ServiceAccount that can only read the specific Secret
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: read-app-secrets
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["app-secrets"]  # restrict to exactly this Secret
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-reads-secrets
  namespace: production
subjects:
  - kind: ServiceAccount
    name: my-app
    namespace: production
roleRef:
  kind: Role
  name: read-app-secrets
  apiGroup: rbac.authorization.k8s.io`}
          lang="yaml"
          filename="rbac-secret-access.yaml"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>base64 is encoding, not encryption</strong>. Kubernetes Secrets in etcd are
          readable by anyone with etcd or kubectl Secret read access. Security comes from RBAC,
          encryption at rest, and external secrets managers.
        </li>
        <li>
          <strong>Volume-mounted ConfigMaps and Secrets auto-update</strong> within ~60s. Env
          var injection is static — the Pod must restart to pick up changes.
        </li>
        <li>
          Use <strong>ConfigMap volumes</strong> for config files that applications can
          hot-reload (nginx, Envoy, custom file watchers). Use <strong>env vars</strong> for
          scalar values read once at startup.
        </li>
        <li>
          <strong>stringData</strong> in a Secret manifest lets you write plaintext — Kubernetes
          base64-encodes it during storage. Use it to avoid manual encoding mistakes.
        </li>
        <li>
          For production, enable <strong>encryption at rest</strong> via
          <code>EncryptionConfiguration</code> on the API server. For regulated environments,
          use <strong>External Secrets Operator or Vault Agent Injector</strong> to keep secrets
          out of etcd entirely.
        </li>
        <li>
          Scope Secret access with <strong>RBAC resourceNames</strong> so a ServiceAccount can
          only read its own Secrets, not all Secrets in the namespace.
        </li>
      </ul>
    </div>
  );
}
