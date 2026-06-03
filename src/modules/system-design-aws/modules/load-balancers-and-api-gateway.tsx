import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock, ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const entryDiagram = String.raw`flowchart TD
    CDN["CloudFront edge<br/>(cache miss → origin)"]
    WAF["WAF<br/>filter bad traffic"]
    ALB["Application Load Balancer<br/>path / host routing (L7)"]
    TG1["Target group: /api/*<br/>ECS tasks"]
    TG2["Target group: /admin/*<br/>ECS tasks"]
    CDN --> WAF --> ALB
    ALB -->|"/api/*"| TG1
    ALB -->|"/admin/*"| TG2`;

const layerDiagram = String.raw`flowchart LR
    subgraph L7["ALB — Layer 7 (HTTP)"]
      A1["Reads URL, host, headers"]
      A2["Routes /api vs /admin"]
    end
    subgraph L4["NLB — Layer 4 (TCP/UDP)"]
      N1["Sees only IP + port"]
      N2["Forwards the connection"]
    end
    REQ["Incoming connection"] --> L7
    REQ --> L4`;

const healthDiagram = String.raw`stateDiagram-v2
    [*] --> Registering
    Registering --> Healthy: passes health checks
    Healthy --> Unhealthy: fails threshold checks
    Unhealthy --> Healthy: passes again
    Unhealthy --> Draining: being replaced
    Healthy --> Draining: deploy / scale-in
    Draining --> [*]: connections finished
    note right of Healthy
      Only Healthy targets
      receive traffic.
    end note`;

const wafDiagram = String.raw`flowchart TD
    REQ["Request at CloudFront edge"]
    R1{"Rate limit exceeded?"}
    R2{"Matches SQLi / XSS pattern?"}
    R3{"Blocked country / IP?"}
    BLOCK["Block (403) at the edge"]
    PASS["Forward to ALB origin"]
    REQ --> R1
    R1 -->|yes| BLOCK
    R1 -->|no| R2
    R2 -->|yes| BLOCK
    R2 -->|no| R3
    R3 -->|yes| BLOCK
    R3 -->|no| PASS`;

export const toc: TocItem[] = [
  { id: "where-this-sits", title: "Where This Layer Sits", level: 2 },
  { id: "what-is-lb", title: "What a Load Balancer Does", level: 2 },
  { id: "alb", title: "ALB: Application Load Balancer (L7)", level: 2 },
  { id: "nlb", title: "NLB: Network Load Balancer (L4)", level: 2 },
  { id: "alb-vs-nlb", title: "ALB vs NLB: Choosing", level: 2 },
  { id: "health-checks", title: "Health Checks & Zero-Downtime Deploys", level: 2 },
  { id: "api-gateway", title: "API Gateway: Managed Front Door", level: 2 },
  { id: "waf", title: "WAF: Blocking Bad Traffic at the Edge", level: 2 },
  { id: "decision-guide", title: "Decision Guide", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "challenge", title: "Challenge: Pick the Right Front Door", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "portability", title: "Generic Concept vs AWS Implementation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function LoadBalancersAndApiGateway() {
  return (
    <div className="article-content">
      <p>
        Once DNS has resolved and the request has passed the CDN, it still has to be <em>routed to a
        healthy backend</em> &mdash; and ideally have malicious traffic filtered out first. That is
        the job of <strong>load balancers</strong> (ALB and NLB), the <strong>API Gateway</strong>,
        and the <strong>WAF</strong>. Getting these right is what makes a system scale horizontally,
        deploy with zero downtime, and survive attacks &mdash; without touching application code.
      </p>

      <h2 id="where-this-sits">Where This Layer Sits</h2>
      <p>
        This module covers the final hops before your code runs: filter (WAF), then route to a
        healthy instance (load balancer or API Gateway).
      </p>
      <MermaidDiagram
        chart={entryDiagram}
        title="From Edge to Backend"
        caption="The WAF filters first; the ALB then inspects the HTTP request and routes it to the right pool of healthy targets."
        minHeight={420}
      />

      <h2 id="what-is-lb">What a Load Balancer Does</h2>
      <p>
        A <strong>load balancer</strong> sits in front of multiple backend instances and spreads
        incoming requests across them. This buys two things: <strong>scalability</strong> (add more
        instances to handle more load) and <strong>availability</strong> (if one instance dies, the
        balancer routes around it). The fundamental decision is <em>which OSI layer</em> the balancer
        operates at &mdash; that determines what it can &ldquo;see&rdquo; about each request.
      </p>
      <MermaidDiagram
        chart={layerDiagram}
        title="Layer 7 vs Layer 4"
        caption="An ALB understands HTTP and can route on URL or host; an NLB only sees IP and port, which makes it faster but blind to content."
        minHeight={360}
      />

      <h2 id="alb">ALB: Application Load Balancer (L7)</h2>
      <p>
        The <strong>ALB</strong> operates at <strong>Layer 7 (HTTP/HTTPS)</strong>. Because it
        understands HTTP, it can make routing decisions based on request content. This is what most
        web applications should use.
      </p>
      <ul>
        <li><strong>Path-based routing:</strong> <code>/api/*</code> to one target group,
          <code>/admin/*</code> to another.</li>
        <li><strong>Host-based routing:</strong> <code>api.example.com</code> vs
          <code>app.example.com</code> to different targets.</li>
        <li><strong>Header / query routing:</strong> route on custom headers or query params.</li>
        <li><strong>WebSocket &amp; gRPC:</strong> native support for persistent and streaming
          connections.</li>
        <li><strong>SSL termination:</strong> integrates with AWS Certificate Manager (free certs).</li>
        <li><strong>Target types:</strong> EC2, ECS tasks (IP), Lambda functions, raw IPs.</li>
      </ul>

      <h2 id="nlb">NLB: Network Load Balancer (L4)</h2>
      <p>
        The <strong>NLB</strong> operates at <strong>Layer 4 (TCP/UDP)</strong>. It does not inspect
        HTTP &mdash; it routes connections by source/destination IP and port. That makes it
        extremely fast, capable of millions of connections per second at ultra-low latency, and able
        to carry any TCP/UDP protocol. It can also expose a <strong>static IP</strong> per
        availability zone and preserve the client&apos;s source IP.
      </p>

      <h2 id="alb-vs-nlb">ALB vs NLB: Choosing</h2>
      <ArticleTable
        caption="Default to ALB for web apps; reach for NLB only when you need a static IP, raw TCP/UDP, or the absolute lowest latency."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>ALB</th>
              <th>NLB</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Layer</td>
              <td>7 (HTTP/HTTPS)</td>
              <td>4 (TCP/UDP/TLS)</td>
            </tr>
            <tr>
              <td>Routing on</td>
              <td>Path, host, headers, query</td>
              <td>Port and protocol only</td>
            </tr>
            <tr>
              <td>Latency added</td>
              <td>Higher (HTTP parsing)</td>
              <td>Ultra-low</td>
            </tr>
            <tr>
              <td>Protocols</td>
              <td>HTTP, HTTPS, WebSocket, gRPC</td>
              <td>TCP, UDP, TLS</td>
            </tr>
            <tr>
              <td>Static IP</td>
              <td>No (DNS name only)</td>
              <td>Yes (Elastic IP per AZ)</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Web apps, APIs (most cases)</td>
              <td>Gaming, IoT, trading, VoIP, IP whitelisting</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="health-checks">Health Checks &amp; Zero-Downtime Deploys</h2>
      <p>
        The load balancer pings each target at a configurable path (e.g. <code>/health</code>) on an
        interval. Targets that fail are pulled from rotation within seconds; targets that pass are
        added. This is the machinery behind <strong>zero-downtime deploys</strong>: new tasks must
        become <em>healthy</em> before old ones are <em>drained</em> and terminated, so there is
        never a moment without capacity.
      </p>
      <MermaidDiagram
        chart={healthDiagram}
        title="Target Lifecycle"
        caption="Traffic only flows to Healthy targets. During a deploy, new targets reach Healthy before old ones drain — that overlap is what makes it zero-downtime."
        minHeight={440}
      />
      <CodeBlock code={`# ALB target group health check (Terraform)
resource "aws_lb_target_group" "api" {
  name        = "api-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"          # ECS Fargate tasks
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
    matcher             = "200"
  }

  deregistration_delay = 30   # drain in-flight requests before kill
}`} lang="hcl" />

      <h2 id="api-gateway">API Gateway: Managed Front Door</h2>
      <p>
        <strong>API Gateway</strong> is a managed service that fronts your backend and handles
        cross-cutting concerns &mdash; auth, throttling, request/response transformation, usage
        plans, API keys &mdash; so your code does not have to. It is especially natural in front of
        Lambda. It comes in three flavors:
      </p>
      <ArticleTable
        caption="HTTP API is the cheaper, lower-latency default; reach for REST API only when you need its richer feature set."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Use case</th>
              <th>Features</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>REST API</td>
              <td>Full-featured REST needing every knob</td>
              <td>Authorizers, usage plans, request validation, caching, transformation</td>
              <td>$3.50 / 1M</td>
            </tr>
            <tr>
              <td>HTTP API</td>
              <td>Simple proxy to Lambda or an HTTP backend</td>
              <td>JWT auth, CORS, faster, lower latency</td>
              <td>$1 / 1M (71% cheaper)</td>
            </tr>
            <tr>
              <td>WebSocket API</td>
              <td>Real-time two-way comms</td>
              <td>Persistent connections, route selection, Lambda integration</td>
              <td>$1 / 1M messages</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>API Gateway vs ALB:</strong> choose API Gateway for Lambda backends, built-in auth
        (Cognito JWT authorizer), usage plans/API keys, or API-level caching. Choose ALB when you run
        containers (ECS/EC2), need WebSocket without serverless, or want to avoid an extra cost layer.
      </p>

      <h2 id="waf">WAF: Blocking Bad Traffic at the Edge</h2>
      <p>
        <strong>AWS WAF</strong> (Web Application Firewall) inspects requests and blocks common
        attacks before they reach your origin. Attach it to CloudFront (recommended &mdash; blocks at
        the edge) or to an ALB (regional).
      </p>
      <MermaidDiagram
        chart={wafDiagram}
        title="WAF Rule Evaluation"
        caption="Each request runs the rule chain; anything matching a block rule is rejected at the edge with a 403, so your origin never sees the attack."
        minHeight={460}
      />
      <ul>
        <li>Block SQL injection and XSS attempts.</li>
        <li><strong>Rate limiting:</strong> block IPs exceeding N requests per window.</li>
        <li>Geo-blocking and IP allow/deny lists.</li>
        <li><strong>AWS Managed Rules:</strong> prebuilt rulesets for OWASP Top 10 and bots.</li>
      </ul>
      <CodeBlock code={`# WAF rate-limit rule (Terraform)
resource "aws_wafv2_web_acl" "api" {
  name  = "api-web-acl"
  scope = "CLOUDFRONT"   # or "REGIONAL" for an ALB

  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 1000   # requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
    }
  }
}`} lang="hcl" />

      <h2 id="decision-guide">Decision Guide</h2>
      <ArticleTable
        caption="Map the workload to the right combination of entry-layer components."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Recommended</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Web app / REST API (ECS backend)</td>
              <td>CloudFront + WAF + ALB</td>
              <td>L7 routing, SSL, health checks, edge protection</td>
            </tr>
            <tr>
              <td>Serverless API (Lambda backend)</td>
              <td>API Gateway (HTTP)</td>
              <td>Native Lambda integration, JWT auth, lower cost</td>
            </tr>
            <tr>
              <td>Real-time chat / live updates</td>
              <td>ALB (WebSocket) or API Gateway (WebSocket)</td>
              <td>Persistent connection support</td>
            </tr>
            <tr>
              <td>Game server / custom TCP</td>
              <td>NLB</td>
              <td>Static IP, low latency, any TCP/UDP</td>
            </tr>
            <tr>
              <td>Third party whitelists your IP</td>
              <td>NLB with Elastic IP</td>
              <td>Provides a static IP per AZ</td>
            </tr>
            <tr>
              <td>Defend against DDoS / bots</td>
              <td>CloudFront + WAF + Shield</td>
              <td>Edge-level filtering before the origin</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Choose Between ALB, NLB, and API Gateway"
        intro="Interviewers want to hear that you default to ALB for HTTP, justify NLB only for specific needs, and know when a managed gateway beats a load balancer."
        steps={[
          "Default to ALB for HTTP/HTTPS workloads — it routes on path and host and supports WebSocket and gRPC.",
          "Reach for NLB only when you need a static IP for whitelisting, raw TCP/UDP, or the lowest possible latency.",
          "Pick API Gateway when the backend is Lambda or you want managed auth, throttling, usage plans, or API-level caching.",
          "Always place WAF at the edge (with CloudFront) so attacks are blocked before they reach the origin.",
          "Close with health checks: explain how new targets reach healthy before old ones drain, which is what makes deploys zero-downtime.",
        ]}
      />

      <h2 id="challenge">Challenge: Pick the Right Front Door</h2>
      <InterviewChallenge
        title="Three Workloads, One Architecture"
        scenario={
          <>
            You are designing the entry layer for three services in one company: (1) a containerized
            REST API on ECS, (2) a serverless image-processing API on Lambda, and (3) a multiplayer
            game server speaking a custom UDP protocol that a partner firewall must whitelist by IP.
            Choose the routing component for each and where WAF fits.
          </>
        }
        tasks={[
          "Pick the entry component for each of the three workloads and justify it.",
          "Explain which workloads sit behind CloudFront + WAF and which cannot.",
          "Describe how the ECS API achieves zero-downtime deploys.",
          "State why the game server cannot use an ALB.",
        ]}
        pitfalls={[
          "Putting the UDP game server behind an ALB — the ALB is HTTP-only and has no static IP.",
          "Forgetting WAF cannot meaningfully inspect the raw UDP game traffic the way it inspects HTTP.",
        ]}
        signal="A strong answer matches each protocol to the right layer and explains the static-IP and zero-downtime mechanics."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>ECS REST API:</strong> CloudFront + WAF + ALB. The ALB does L7 path/host routing to
          ECS target groups; WAF at the edge blocks SQLi/XSS and rate-limits; zero-downtime deploys
          come from the target group health check &mdash; new tasks must reach <em>healthy</em>
          before old tasks <em>drain</em> (via <code>deregistration_delay</code>) and terminate.
          <strong> Lambda image API:</strong> API Gateway (HTTP API) &mdash; native Lambda
          integration, JWT auth, lower cost than REST API; it can also sit behind CloudFront + WAF.
          <strong> Game server:</strong> NLB with an Elastic IP &mdash; it speaks raw UDP (ALB is
          HTTP-only) and the static IP satisfies the partner&apos;s firewall whitelist. The game
          traffic does not go through CloudFront/WAF in the same way, since WAF inspects HTTP, not an
          arbitrary UDP protocol; protect it with security groups, NLB, and AWS Shield instead.
        </p>
      </SolutionReveal>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>ALB reachable directly, bypassing CloudFront/WAF:</strong> restrict the ALB
          security group to CloudFront&apos;s managed prefix list so traffic must go through the edge.
        </li>
        <li>
          <strong>Using NLB for a standard web app:</strong> you lose path/host routing for no
          benefit. Default to ALB unless you specifically need L4.
        </li>
        <li>
          <strong>REST API Gateway when HTTP API suffices:</strong> 3.5&times; the cost and more
          complexity for features you likely do not need.
        </li>
        <li>
          <strong>Health check on a trivial path:</strong> probing <code>/</code> that always returns
          200 hides a broken app. Probe a <code>/health</code> route that exercises real dependencies.
        </li>
        <li>
          <strong>Forgetting WAF on new endpoints:</strong> apply WAF to all traffic entering via
          CloudFront, not per-endpoint, so new routes are covered automatically.
        </li>
      </ul>

      <h2 id="portability">Generic Concept vs AWS Implementation</h2>
      <p>
        This is the <strong>most AWS-coupled</strong> layer of the entry path. Other stacks fold L4
        and L7 into a single box (nginx, HAProxy, Envoy do both) instead of splitting them into ALB
        and NLB, and &ldquo;API Gateway&rdquo; as a distinct managed service is a cloud framing
        &mdash; on-prem you reach for Kong or Envoy. The mechanics (L4 vs L7, health checks,
        draining, rate limiting) are universal.
      </p>
      <ArticleTable
        caption="Reason in the left column; the AWS column is one vendor's packaging of those same load-balancing and gateway primitives."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Generic concept</th>
              <th>AWS</th>
              <th>Equivalent elsewhere</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>L7 (HTTP-aware) load balancer</td>
              <td>ALB</td>
              <td>GCP HTTP(S) LB, nginx, HAProxy, Envoy, Traefik</td>
            </tr>
            <tr>
              <td>L4 (TCP/UDP) load balancer</td>
              <td>NLB</td>
              <td>GCP Network LB, nginx stream, HAProxy (TCP mode)</td>
            </tr>
            <tr>
              <td>Pool of backends behind the LB</td>
              <td>Target group</td>
              <td>Upstream (nginx), backend pool, cluster (Envoy)</td>
            </tr>
            <tr>
              <td>Managed API front door</td>
              <td>API Gateway (REST / HTTP / WS)</td>
              <td>Kong, Apigee, Azure API Management, nginx + plugins</td>
            </tr>
            <tr>
              <td>Health checks + connection draining</td>
              <td>Target group health checks, deregistration delay</td>
              <td>Universal (every LB has equivalents)</td>
            </tr>
            <tr>
              <td>Web application firewall</td>
              <td>AWS WAF</td>
              <td>Cloudflare WAF, ModSecurity, Akamai Kona</td>
            </tr>
            <tr>
              <td>Rate limiting / SQLi / XSS blocking</td>
              <td>WAF rules (rate-based, managed rule groups)</td>
              <td>Same primitives, different rule syntax</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>A load balancer buys <strong>scalability</strong> and <strong>availability</strong>; the
          layer it runs at decides what it can route on.</li>
        <li><strong>ALB (L7)</strong> routes on HTTP path/host/headers &mdash; the default for web.
          <strong>NLB (L4)</strong> is for static IPs, raw TCP/UDP, and lowest latency.</li>
        <li><strong>API Gateway</strong> wins for Lambda backends and managed auth/throttling; HTTP
          API is the cheaper default.</li>
        <li><strong>Health checks</strong> + draining = zero-downtime deploys; probe a real route.</li>
        <li><strong>WAF</strong> at the edge blocks attacks before the origin; lock the ALB to
          CloudFront so it cannot be bypassed.</li>
      </ul>
    </div>
  );
}
