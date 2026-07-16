import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const serviceRoutingDiagram = String.raw`flowchart TD
  Client["Client Pod\n10.244.1.5"]
  SVC["Service: api-svc\nClusterIP: 10.96.42.100:80\n(virtual IP — no process listens here)"]
  EP["EndpointSlice\n10.244.2.3:8080\n10.244.3.7:8080\n10.244.1.9:8080"]
  KP["kube-proxy\n(iptables / IPVS rules on each node)"]
  P1["Pod: api-7f9d4\n10.244.2.3:8080"]
  P2["Pod: api-3b8c1\n10.244.3.7:8080"]
  P3["Pod: api-6e2fa\n10.244.1.9:8080"]

  Client -->|"DNS: api-svc → 10.96.42.100"| SVC
  SVC -->|"iptables DNAT"| KP
  KP --> EP
  EP -->|"load balance"| P1
  EP -->|"load balance"| P2
  EP -->|"load balance"| P3`;

const dnsResolutionDiagram = String.raw`sequenceDiagram
  participant P as Pod
  participant D as CoreDNS
  participant S as kube-apiserver

  Note over P: needs to reach "api-svc"
  P->>D: DNS query: api-svc.default.svc.cluster.local
  D->>S: watch Services (cached)
  D-->>P: 10.96.42.100 (ClusterIP)
  Note over P: kernel hits iptables rule
  P->>P: DNAT: 10.96.42.100:80 → 10.244.2.3:8080
  P->>P: packet reaches backend Pod directly`;

const serviceTypesDiagram = String.raw`flowchart LR
  subgraph "Exposure Level"
    CI["ClusterIP\n(cluster-internal only)"]
    NP["NodePort\nClusterIP + host port on every node\n30000-32767"]
    LB["LoadBalancer\nNodePort + cloud LB with external IP"]
    EXT["ExternalName\nCNAME alias to external hostname"]
  end
  CI -->|"extends"| NP
  NP -->|"extends"| LB`;

export const toc: TocItem[] = [
  { id: "why-services", title: "Why Services Exist", level: 2 },
  { id: "service-types", title: "Service Types", level: 2 },
  { id: "clusterip-deep-dive", title: "ClusterIP: How It Actually Works", level: 3 },
  { id: "dns-in-kubernetes", title: "DNS in Kubernetes", level: 2 },
  { id: "headless-services", title: "Headless Services", level: 3 },
  { id: "ingress", title: "Ingress & IngressClass", level: 2 },
  { id: "network-policies", title: "Network Policies: Zero-Trust Networking", level: 2 },
  { id: "service-comparison", title: "Service Type Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ServicesAndNetworking() {
  return (
    <div className="article-content">
      <p>
        Kubernetes networking is the source of more production incidents than almost any other
        area. Pods come and go with ephemeral IPs, yet your application needs a stable address.
        Services solve the discovery problem; kube-proxy solves the routing problem; CoreDNS
        solves the naming problem. Understanding all three — and their failure modes — is what
        separates engineers who can debug network issues from those who just restart Pods and hope.
      </p>

      <h2 id="why-services">Why Services Exist</h2>
      <p>
        Pod IPs are ephemeral. When a Pod is replaced (rolling update, node failure, scale event),
        it gets a new IP. Any client that cached the old IP breaks. A{" "}
        <strong>Service</strong> gives you a stable virtual IP (ClusterIP) and DNS name that
        routes to healthy Pods via label selectors. The Service IP never changes for the
        lifetime of the Service object.
      </p>
      <p>
        The mechanism is <strong>not a load balancer process</strong>. The ClusterIP is a virtual
        address — no process listens on it. Instead, kube-proxy programs iptables (or IPVS) rules
        on every node so that traffic to the ClusterIP is DNAT&apos;ed to one of the healthy
        backend Pod IPs. The packet never hits a proxy; it goes directly from the client Pod to
        the backend Pod after the kernel rewrites the destination IP.
      </p>

      <MermaidDiagram
        chart={serviceRoutingDiagram}
        title="How Service Routing Actually Works"
        caption="The ClusterIP (10.96.42.100) is a virtual address — no process listens on it. kube-proxy installs iptables/IPVS rules that DNAT the destination to a real Pod IP. Traffic flows directly between Pods after the kernel rewrite."
        minHeight={460}
      />

      <h2 id="service-types">Service Types</h2>

      <MermaidDiagram
        chart={serviceTypesDiagram}
        title="Service Type Hierarchy"
        caption="Each Service type builds on the previous: LoadBalancer = NodePort + cloud load balancer, NodePort = ClusterIP + host port. You pay for everything in the hierarchy when you use a higher-level type."
        minHeight={200}
      />

      <CodeBlock
        code={`# ClusterIP — default, internal only
apiVersion: v1
kind: Service
metadata:
  name: api-svc
spec:
  selector:
    app: api           # routes to Pods with this label
  ports:
    - port: 80         # Service port (what clients connect to)
      targetPort: 8080 # Container port
  type: ClusterIP      # default if omitted
---
# NodePort — accessible from outside the cluster via any node IP
apiVersion: v1
kind: Service
metadata:
  name: api-nodeport
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080  # optional: omit to get a random port in 30000-32767
  type: NodePort
---
# LoadBalancer — provisions a cloud LB (GCP, AWS, Azure)
apiVersion: v1
kind: Service
metadata:
  name: api-lb
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer`}
        lang="yaml"
        filename="service-types.yaml"
      />

      <h3 id="clusterip-deep-dive">ClusterIP: How It Actually Works</h3>
      <p>
        When you create a Service, the API server creates an <strong>EndpointSlice</strong> object
        (or legacy Endpoints object) that lists the IPs of all Pods matching the selector. kube-proxy
        watches EndpointSlice objects and updates the iptables/IPVS rules on every node. When a Pod
        fails its readiness probe, it is removed from the EndpointSlice — traffic stops going to
        it automatically.
      </p>
      <p>
        The most common networking bug in Kubernetes: <strong>your Service selector does not match
        your Pod labels</strong>. If <code>kubectl get endpoints api-svc</code> shows{" "}
        <code>&lt;none&gt;</code>, check that the label on the Pod spec matches the Service selector
        exactly (including case).
      </p>
      <CodeBlock
        code={`# Debugging Service connectivity
kubectl get endpoints api-svc          # should list Pod IPs; "<none>" = selector mismatch
kubectl describe service api-svc       # check selector, ports, endpoints
kubectl get endpointslices             # newer API (v1.21+), more scalable than Endpoints

# Test connectivity from inside the cluster
kubectl run debug --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://api-svc.default.svc.cluster.local/health

# Check kube-proxy iptables rules (on a node)
iptables-save | grep api-svc`}
        lang="bash"
        filename="service-debug.sh"
      />

      <h2 id="dns-in-kubernetes">DNS in Kubernetes</h2>
      <p>
        Kubernetes runs <strong>CoreDNS</strong> as a cluster add-on (Pods in{" "}
        <code>kube-system</code>). Every Pod is configured to use CoreDNS as its DNS resolver
        (via <code>/etc/resolv.conf</code>). The DNS name for a Service follows the pattern:
      </p>
      <CodeBlock
        code={`# Full DNS name format:
# <service-name>.<namespace>.svc.cluster.local

# Examples:
api-svc.default.svc.cluster.local       # from any namespace
api-svc.production.svc.cluster.local    # Service in 'production' namespace

# Within the same namespace you can use just the service name:
curl http://api-svc/health

# Pod DNS (less used, but available for StatefulSets):
# <pod-ip-dashes>.<namespace>.pod.cluster.local
# 10-244-1-5.default.pod.cluster.local

# StatefulSet Pod DNS (stable, via headless Service):
# <pod-name>.<headless-service>.<namespace>.svc.cluster.local
# postgres-0.postgres-headless.default.svc.cluster.local`}
        lang="bash"
        filename="kubernetes-dns.sh"
      />

      <MermaidDiagram
        chart={dnsResolutionDiagram}
        title="DNS Resolution in Kubernetes"
        caption="CoreDNS watches Services via the API server and builds its DNS responses from the cached state. The lookup returns the ClusterIP, then iptables DNAT handles the rest — DNS never returns Pod IPs directly (except for headless Services)."
        minHeight={340}
      />

      <h3 id="headless-services">Headless Services</h3>
      <p>
        A headless Service (<code>clusterIP: None</code>) does not get a virtual IP. Instead,
        DNS returns the actual Pod IPs. This is what StatefulSets use — each Pod gets its own
        DNS entry. It is also used for service discovery patterns where the client wants to
        talk to specific Pod instances (e.g., a database client that needs the primary, not
        any replica).
      </p>
      <CodeBlock
        code={`apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None       # headless — no virtual IP assigned
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
# DNS lookup for postgres-headless returns individual Pod IPs:
# nslookup postgres-headless.default.svc.cluster.local
# → 10.244.2.5 (postgres-0)
# → 10.244.3.8 (postgres-1)
# → 10.244.1.4 (postgres-2)`}
        lang="yaml"
        filename="headless-service.yaml"
      />

      <h2 id="ingress">Ingress & IngressClass</h2>
      <p>
        A <strong>Service of type LoadBalancer</strong> creates one cloud load balancer per
        Service — expensive at scale. <strong>Ingress</strong> solves this by routing HTTP/HTTPS
        traffic from a single external load balancer to multiple Services based on hostname and
        path rules. An <strong>Ingress controller</strong> (nginx, Traefik, AWS ALB, GKE) is
        a separate deployment that watches Ingress objects and programs the actual load balancer.
      </p>
      <p>
        The <strong>IngressClass</strong> resource (GA since v1.18) replaced the{" "}
        <code>kubernetes.io/ingress.class</code> annotation. If you have multiple Ingress
        controllers, use IngressClass to specify which one handles each Ingress.
      </p>
      <CodeBlock
        code={`apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx   # which IngressClass (controller) handles this
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls   # TLS cert stored in a Secret
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1-svc
                port:
                  number: 80
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2-svc
                port:
                  number: 80`}
        lang="yaml"
        filename="ingress.yaml"
      />

      <h2 id="network-policies">Network Policies: Zero-Trust Networking</h2>
      <p>
        By default, all Pods in a Kubernetes cluster can communicate with all other Pods — no
        firewall rules. <strong>NetworkPolicy</strong> objects implement L3/L4 firewall rules
        that restrict ingress and egress traffic for a set of Pods. The enforcement is done by
        the CNI plugin (Calico, Cilium, Weave) — the default CNI in many clusters (flannel,
        kubenet) does not enforce NetworkPolicies.
      </p>
      <CodeBlock
        code={`# A deny-all ingress policy (default deny for a namespace)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}       # empty = select all Pods in namespace
  policyTypes:
    - Ingress
  # no ingress rules = deny all ingress
---
# Allow only the frontend to reach the api
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080`}
        lang="yaml"
        filename="network-policy.yaml"
      />

      <h2 id="service-comparison">Service Type Comparison</h2>

      <ArticleTable
        caption="Choose the right Service type — the wrong choice either over-exposes your service or creates unnecessary cloud costs."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Accessible from</th>
              <th>IP assigned</th>
              <th>Cost</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ClusterIP</strong></td>
              <td>Inside cluster only</td>
              <td>Virtual cluster IP</td>
              <td>Free</td>
              <td>Internal microservice communication (default choice)</td>
            </tr>
            <tr>
              <td><strong>NodePort</strong></td>
              <td>Any node IP + port 30000–32767</td>
              <td>ClusterIP + node port</td>
              <td>Free (but port range is limited)</td>
              <td>Dev/testing, on-prem without cloud LB</td>
            </tr>
            <tr>
              <td><strong>LoadBalancer</strong></td>
              <td>External IP via cloud LB</td>
              <td>ClusterIP + NodePort + external IP</td>
              <td>Cloud LB per service ($$$)</td>
              <td>Single service that needs a dedicated external IP</td>
            </tr>
            <tr>
              <td><strong>ExternalName</strong></td>
              <td>Inside cluster only</td>
              <td>None (CNAME)</td>
              <td>Free</td>
              <td>Alias an external service (database.example.com) inside the cluster</td>
            </tr>
            <tr>
              <td><strong>Headless</strong></td>
              <td>Inside cluster only</td>
              <td>None (returns Pod IPs via DNS)</td>
              <td>Free</td>
              <td>StatefulSets, direct Pod addressing, custom load balancing</td>
            </tr>
            <tr>
              <td><strong>Ingress</strong></td>
              <td>External (HTTP/HTTPS)</td>
              <td>External IP (one LB for many services)</td>
              <td>One cloud LB regardless of number of services</td>
              <td>HTTP routing for many services — the cost-effective external exposure</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How does a ClusterIP Service work under the hood?'"
        intro="Most candidates say 'it load balances traffic' without explaining the mechanism. The strong answer explains virtual IPs and iptables/IPVS DNAT."
        steps={[
          "State that ClusterIP is a virtual IP — no process listens on it. It only exists in iptables rules.",
          "Explain kube-proxy: it watches EndpointSlice objects and programs iptables DNAT rules on every node. When a packet hits the ClusterIP, the kernel rewrites the destination to a real Pod IP.",
          "Connect to readiness probes: when a Pod fails its readiness probe, the kubelet removes it from the EndpointSlice. kube-proxy picks up the change and removes it from iptables rules — traffic stops going to it.",
          "Name the failure mode: if the Service selector does not match any Pod labels, EndpointSlice is empty and kubectl get endpoints shows <none>. All connections to the ClusterIP will fail.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'What is the difference between Ingress and a LoadBalancer Service?'"
        intro="This is a cost and architecture question as much as a technical one."
        steps={[
          "LoadBalancer Service creates one cloud load balancer per Service. At scale (10 services = 10 LBs), this is expensive and unwieldy.",
          "Ingress uses a single load balancer and routes HTTP/HTTPS traffic to multiple backend Services based on hostname and path rules.",
          "The Ingress controller (nginx, Traefik, AWS ALB Controller) is a Deployment that watches Ingress objects and programs the actual LB. The IngressClass resource specifies which controller handles each Ingress.",
          "Production recommendation: use Ingress for all HTTP/HTTPS traffic. Use LoadBalancer only for TCP/UDP services that cannot go through an HTTP router (databases, gRPC streams, etc.).",
        ]}
      />

      <h2 id="challenge">Challenge</h2>

      <InterviewChallenge
        title="Debug a Service Connectivity Failure"
        scenario={
          <>
            Your team deployed a new microservice. The Deployment shows 3 running Pods. However,
            another service calling it by DNS name (<code>payment-svc.default.svc.cluster.local</code>)
            gets connection refused. The Ingress rule for the service also returns 502 Bad Gateway
            from the nginx Ingress controller.
          </>
        }
        tasks={[
          "List the exact kubectl commands you would run to diagnose the issue, in order.",
          "Name at least 4 distinct root causes that could produce this symptom (connected Pods, connection refused at Service).",
          "Explain why a 502 from the Ingress controller specifically suggests the Service backend is unreachable, not the Ingress rule itself.",
          "Write a NetworkPolicy that would allow only the payment-svc to receive traffic from the checkout-svc in the same namespace, and deny all other ingress.",
        ]}
      />
      <SolutionReveal>
        <CodeBlock
          code={`# Step 1: Check Service endpoints — most common issue
kubectl get endpoints payment-svc
# If output is "<none>", the selector doesn't match any Pod labels

# Step 2: Verify the Service selector matches Pod labels
kubectl describe service payment-svc     # look at Selector:
kubectl get pods --show-labels           # compare Pod labels

# Step 3: Check if Pods are actually ready
kubectl get pods -l app=payment          # check READY column
# If 0/1 Ready, the Pod is running but failing readiness probe

# Step 4: Check Pod readiness probe logs
kubectl describe pod <payment-pod>       # look at Events and readiness probe config

# Step 5: Test DNS resolution from inside the cluster
kubectl run debug --image=curlimages/curl --rm -it --restart=Never -- \
  sh -c "nslookup payment-svc && curl payment-svc:8080/health"

# Step 6: Check Ingress configuration
kubectl describe ingress payment-ingress  # verify backend service name and port`}
          lang="bash"
          filename="debug-service.sh"
        />
        <p><strong>4 root causes for connected Pods + connection refused:</strong></p>
        <ol>
          <li><strong>Selector mismatch:</strong> Service selector label does not match Pod labels (e.g., <code>app: payments</code> vs <code>app: payment</code>)</li>
          <li><strong>Wrong targetPort:</strong> Service targetPort does not match the container port the app actually listens on</li>
          <li><strong>All Pods failing readiness:</strong> Pods are Running but not Ready, so EndpointSlice is empty</li>
          <li><strong>NetworkPolicy blocking traffic:</strong> A default-deny policy is installed and no allow rule permits the traffic</li>
        </ol>
        <p>
          <strong>Why 502 from Ingress = Service unreachable:</strong> The nginx Ingress controller
          returns 502 when it can successfully reach the backend Service (the rule is valid, DNS
          resolves) but the Service returns no healthy endpoints or connection is refused at the
          Pod. A 404 would indicate the Ingress path rule is not matched. A 503 indicates the
          upstream is temporarily unavailable.
        </p>
        <CodeBlock
          code={`apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-checkout-to-payment
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: payment          # applies to payment Pods
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: checkout  # only allow from checkout Pods
      ports:
        - protocol: TCP
          port: 8080`}
          lang="yaml"
          filename="network-policy-payment.yaml"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>ClusterIP is a virtual IP</strong> with no listening process. kube-proxy programs
          iptables DNAT rules on every node to route traffic to real Pod IPs.
        </li>
        <li>
          <strong>Empty EndpointSlice = selector mismatch</strong>. Always check{" "}
          <code>kubectl get endpoints</code> first when a Service is unreachable.
        </li>
        <li>
          <strong>CoreDNS resolves Service names</strong> to ClusterIPs. Pod DNS names follow
          <code>&lt;svc&gt;.&lt;ns&gt;.svc.cluster.local</code>. Within a namespace, the bare
          service name works.
        </li>
        <li>
          <strong>Ingress routes HTTP(S) from a single load balancer</strong> to many Services.
          Use it instead of multiple LoadBalancer Services to save cloud costs.
        </li>
        <li>
          <strong>NetworkPolicy requires a CNI that enforces it</strong> (Calico, Cilium). The
          default networking in many clusters does not enforce policies — verify your CNI supports
          them before relying on policies for security.
        </li>
        <li>
          <strong>Headless Services</strong> return individual Pod IPs via DNS (no virtual IP).
          Essential for StatefulSets where clients need stable, direct Pod addresses.
        </li>
      </ul>
    </div>
  );
}
