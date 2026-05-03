import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const trafficEntryDiagram = String.raw`flowchart TD
    INTERNET["Internet traffic"]
    DNS["Route 53 DNS<br/>latency, failover, weighted routing"]
    CDN["CloudFront CDN<br/>edge cache and TLS termination"]
    WAF["WAF rules"]
    ALB["Application Load Balancer<br/>path, host, and header routing"]
    APP["Backend services<br/>ECS, Lambda, or EC2"]

    INTERNET --> DNS --> CDN
    CDN -->|cache miss to origin| WAF --> ALB --> APP`;

export const toc: TocItem[] = [
  { id: "the-entry-layer", title: "The Traffic Entry Layer", level: 2 },
  { id: "route53", title: "Route 53: DNS + Health Checks + Routing Policies", level: 2 },
  { id: "cloudfront", title: "CloudFront: CDN at the Edge", level: 2 },
  { id: "waf", title: "WAF: Web Application Firewall", level: 2 },
  { id: "alb", title: "ALB: Application Load Balancer (Layer 7)", level: 2 },
  { id: "nlb", title: "NLB: Network Load Balancer (Layer 4)", level: 2 },
  { id: "api-gateway", title: "API Gateway: REST vs HTTP vs WebSocket", level: 2 },
  { id: "when-to-use", title: "When to Use Which: Decision Guide", level: 2 },
  { id: "request-flow", title: "Complete Request Flow Example", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function TrafficEntryLayer() {
  return (
    <div className="article-content">
      <p>
        Before a request reaches your application code, it passes through several layers of
        infrastructure that handle routing, security, caching, and distribution. Understanding these
        layers lets you design systems that are fast for global users, resilient to failures, and
        protected against attacks &mdash; without changing a line of application code.
      </p>

      <h2 id="the-entry-layer">The Traffic Entry Layer</h2>
      <MermaidDiagram
        chart={trafficEntryDiagram}
        title="Traffic Entry Layer"
        caption="This is the default front door for many AWS web systems: resolve, terminate at the edge, filter, route, and only then hand the request to application code."
        minHeight={500}
      />

      <h2 id="route53">Route 53: DNS + Health Checks + Routing Policies</h2>
      <p>
        Route 53 is AWS&apos;s DNS service with a 100% SLA. It does more than just resolve domain
        names &mdash; it can actively monitor your endpoints and change DNS responses based on health
        and routing policies.
      </p>

      <p><strong>Record types in Route 53:</strong></p>
      <ul>
        <li><strong>A record:</strong> domain &rarr; IPv4 address</li>
        <li><strong>AAAA record:</strong> domain &rarr; IPv6 address</li>
        <li><strong>CNAME:</strong> alias &rarr; another hostname (cannot use at zone apex, use Alias instead)</li>
        <li><strong>Alias:</strong> Route 53-specific, like CNAME but works at zone apex and is free (no charge for lookups to AWS resources)</li>
        <li><strong>MX/TXT/NS:</strong> mail, verification, name servers</li>
      </ul>

      <p><strong>Routing policies:</strong></p>
      <table>
        <thead>
          <tr>
            <th>Policy</th>
            <th>What it does</th>
            <th>Use case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Simple</td>
            <td>Returns one IP; no health checks</td>
            <td>Single-server (don&apos;t use in production)</td>
          </tr>
          <tr>
            <td>Failover</td>
            <td>Primary/secondary; auto-switch on health check failure</td>
            <td>Disaster recovery, active-passive multi-region</td>
          </tr>
          <tr>
            <td>Weighted</td>
            <td>Split traffic by % (e.g., 90/10)</td>
            <td>Canary deploys, gradual traffic shifting</td>
          </tr>
          <tr>
            <td>Latency-based</td>
            <td>Route to AWS region with lowest latency for user</td>
            <td>Multi-region active-active for global users</td>
          </tr>
          <tr>
            <td>Geolocation</td>
            <td>Route based on user&apos;s country/continent</td>
            <td>Data residency requirements (GDPR)</td>
          </tr>
          <tr>
            <td>Multi-value</td>
            <td>Return up to 8 IPs; filter unhealthy ones</td>
            <td>Client-side load balancing across healthy IPs</td>
          </tr>
        </tbody>
      </table>

      <p><strong>Health checks:</strong> Route 53 pings your endpoints every 30 seconds (or 10s for
        paid faster checks). If an endpoint fails a configurable threshold of checks, Route 53
        automatically stops routing to it. This is what enables automatic DNS-level failover.
      </p>

      <pre><code>{`# Route 53 health check configuration (Terraform)
resource "aws_route53_health_check" "api" {
  fqdn              = "api.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10  # seconds (fast = $0.50/month)
}

resource "aws_route53_record" "api_failover_primary" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "api.example.com"
  type            = "A"
  set_identifier  = "primary"
  failover_routing_policy { type = "PRIMARY" }
  health_check_id = aws_route53_health_check.api.id
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}`}</code></pre>

      <h2 id="cloudfront">CloudFront: CDN at the Edge</h2>
      <p>
        CloudFront is AWS&apos;s CDN with 450+ edge locations globally. It caches content at edge
        nodes closest to users, reducing latency and origin load dramatically.
      </p>
      <p>
        <strong>Key concepts:</strong>
      </p>
      <ul>
        <li><strong>Distribution:</strong> A CloudFront configuration. Has one or more origins and behaviors.</li>
        <li><strong>Origin:</strong> Where CloudFront fetches content from on a cache miss. Can be S3, ALB, API Gateway, or any HTTP server.</li>
        <li><strong>Behavior:</strong> Rules that match URL patterns to origins and caching settings. E.g., <code>/api/*</code> routes to ALB with no caching; <code>/static/*</code> routes to S3 with 1-year caching.</li>
        <li><strong>Cache behavior settings:</strong> TTL (min/default/max), which headers/cookies/query strings to include in cache key, compression settings.</li>
      </ul>

      <p><strong>Cache invalidation:</strong></p>
      <pre><code>{`# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/index.html" "/api/v1/products/*"

# Invalidate everything (expensive — $0.005 per path after first 1000/month)
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"

# Better approach: content-addressed filenames avoid invalidation
# main.abc123.js → cache for 1 year
# index.html → cache for 60 seconds or no-cache`}</code></pre>

      <p><strong>CloudFront Functions vs Lambda@Edge:</strong></p>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>CloudFront Functions</th>
            <th>Lambda@Edge</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Runtime</td>
            <td>JavaScript (ES 5.1)</td>
            <td>Node.js, Python</td>
          </tr>
          <tr>
            <td>Max execution time</td>
            <td>1ms</td>
            <td>5s (viewer), 30s (origin)</td>
          </tr>
          <tr>
            <td>Access to network/FS</td>
            <td>No</td>
            <td>Yes</td>
          </tr>
          <tr>
            <td>Use case</td>
            <td>URL rewrites, simple header manipulation, auth token check</td>
            <td>Dynamic content, auth with external calls, A/B testing</td>
          </tr>
          <tr>
            <td>Cost</td>
            <td>$0.10 per 1M invocations</td>
            <td>$0.60 per 1M invocations + duration</td>
          </tr>
        </tbody>
      </table>

      <h2 id="waf">WAF: Web Application Firewall</h2>
      <p>
        AWS WAF protects your application from common web attacks. It integrates with CloudFront
        (recommended &mdash; blocks at the edge before traffic reaches your origin) and ALB.
      </p>
      <p><strong>What WAF can do:</strong></p>
      <ul>
        <li>Block SQL injection attempts</li>
        <li>Block XSS (cross-site scripting) attempts</li>
        <li>Rate limiting: block IPs sending more than N requests per minute</li>
        <li>Geo-blocking: deny traffic from specific countries</li>
        <li>IP allow/deny lists</li>
        <li>AWS Managed Rules: pre-built rulesets for common threats (OWASP Top 10, bot protection)</li>
      </ul>
      <pre><code>{`# WAF Web ACL with rate limiting (Terraform)
resource "aws_wafv2_web_acl" "api" {
  name  = "api-web-acl"
  scope = "CLOUDFRONT"  # or "REGIONAL" for ALB

  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 1000  # requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
    }
  }
}`}</code></pre>

      <h2 id="alb">ALB: Application Load Balancer (Layer 7)</h2>
      <p>
        The ALB operates at Layer 7 (HTTP/HTTPS). It understands HTTP and can make routing decisions
        based on request content. This is what most web applications should use.
      </p>
      <p><strong>ALB capabilities:</strong></p>
      <ul>
        <li><strong>Path-based routing:</strong> Route <code>/api/*</code> to one target group, <code>/admin/*</code> to another.</li>
        <li><strong>Host-based routing:</strong> Route <code>api.example.com</code> vs <code>app.example.com</code> to different targets.</li>
        <li><strong>Header/query string routing:</strong> Route based on custom headers or query parameters.</li>
        <li><strong>WebSocket support:</strong> Supports persistent connections for real-time apps.</li>
        <li><strong>gRPC support:</strong> Native support for gRPC traffic.</li>
        <li><strong>SSL termination:</strong> Integrates with AWS Certificate Manager (free certs).</li>
        <li><strong>Sticky sessions:</strong> Route same client to same instance (usually avoid this &mdash; see stateless module).</li>
        <li><strong>Target types:</strong> EC2 instances, ECS tasks (IP), Lambda functions, IP addresses.</li>
      </ul>

      <p><strong>Health checks:</strong> ALB pings each target at a configurable path (e.g., <code>/health</code>) and
        interval. Unhealthy targets are removed from rotation within seconds. This is how zero-downtime
        deployments work: new tasks become healthy before old ones are terminated.
      </p>

      <h2 id="nlb">NLB: Network Load Balancer (Layer 4)</h2>
      <p>
        The NLB operates at Layer 4 (TCP/UDP). It does not inspect HTTP content &mdash; it just
        routes connections based on source/destination port and IP. This makes it extremely fast and
        capable of handling millions of connections per second with ultra-low latency.
      </p>
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
            <td>Routing</td>
            <td>Path, host, headers, query strings</td>
            <td>Port and protocol only</td>
          </tr>
          <tr>
            <td>Latency</td>
            <td>~400ms added</td>
            <td>~100ms added; ultra-low for TCP</td>
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
            <td>Use case</td>
            <td>Web apps, APIs (most use cases)</td>
            <td>Gaming, IoT, financial trading, VoIP, requires static IP</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>When NLB over ALB:</strong> You need a static IP for whitelisting. You handle
        non-HTTP protocols (gaming, custom TCP protocols). You need the absolute lowest possible
        latency. The NLB preserves the client&apos;s source IP address, which matters for some
        use cases.
      </p>

      <h2 id="api-gateway">API Gateway: REST vs HTTP vs WebSocket</h2>
      <p>
        AWS API Gateway is a managed service that sits in front of your backend and handles
        cross-cutting concerns: auth, throttling, request/response transformation, usage plans,
        and routing. It comes in three flavors:
      </p>
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
            <td>Full-featured REST APIs needing all features</td>
            <td>Authorizers, usage plans, response validation, caching, request transformation</td>
            <td>$3.50/1M requests</td>
          </tr>
          <tr>
            <td>HTTP API</td>
            <td>Simple HTTP proxy to Lambda or HTTP backend</td>
            <td>JWT auth, CORS, faster, lower latency</td>
            <td>$1/1M requests (71% cheaper)</td>
          </tr>
          <tr>
            <td>WebSocket API</td>
            <td>Real-time two-way communication</td>
            <td>Persistent connections, route selection, Lambda integration</td>
            <td>$1/1M messages</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>When API Gateway vs ALB:</strong> Use API Gateway when you need Lambda backends,
        built-in auth (Cognito JWT authorizer), usage plans and API keys, or response caching at the
        API level. Use ALB when you run containers (ECS/EC2), need WebSocket support without
        serverless, or want to avoid the additional cost layer.
      </p>

      <h2 id="when-to-use">When to Use Which: Decision Guide</h2>
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
            <td>Web app or REST API (ECS backend)</td>
            <td>Route 53 + CloudFront + ALB</td>
            <td>L7 routing, CDN, SSL, health checks, path routing</td>
          </tr>
          <tr>
            <td>Serverless API (Lambda backend)</td>
            <td>Route 53 + API Gateway (HTTP)</td>
            <td>Native Lambda integration, JWT auth, lower cost</td>
          </tr>
          <tr>
            <td>Static site or SPA</td>
            <td>S3 + CloudFront + Route 53</td>
            <td>Global CDN, zero servers, free SSL via ACM</td>
          </tr>
          <tr>
            <td>Real-time chat or live updates</td>
            <td>ALB (WebSocket) or API Gateway (WebSocket)</td>
            <td>Persistent connection support</td>
          </tr>
          <tr>
            <td>Game server or custom TCP protocol</td>
            <td>NLB</td>
            <td>Static IP, low latency, any TCP/UDP protocol</td>
          </tr>
          <tr>
            <td>Third-party whitelists your IP</td>
            <td>NLB with Elastic IP</td>
            <td>NLB provides static IP per AZ</td>
          </tr>
          <tr>
            <td>Protect from DDoS/bots</td>
            <td>CloudFront + WAF + Shield</td>
            <td>Edge-level protection before origin is hit</td>
          </tr>
        </tbody>
      </table>

      <h2 id="request-flow">Complete Request Flow Example</h2>
      <p>
        A user in Tokyo visits <code>https://app.example.com/dashboard</code>, which is a React SPA
        calling <code>https://api.example.com/users/me</code>:
      </p>
      <pre>{`
1. Browser resolves app.example.com via Route 53
   → Returns CloudFront IP closest to Tokyo (ap-northeast-1 edge)

2. TLS handshake with CloudFront Tokyo edge (~10ms vs 200ms to us-east-1)

3. CloudFront serves index.html (TTL 60s) + static assets (hashed, TTL 1 year)
   → React app loads and boots

4. Browser calls api.example.com/users/me
   → Route 53 returns CloudFront IP (API origin behavior: no-cache)

5. CloudFront checks behavior: /api/* → no caching → forward to origin

6. CloudFront → WAF check: no rate limit exceeded, no SQL injection

7. CloudFront → ALB in us-east-1 (or ap-northeast-1 if multi-region)
   → ALB routes to healthy ECS task

8. ECS task:
   a. Verifies JWT (local operation, ~1ms)
   b. Checks Redis for cached user profile (cache hit → 0.5ms)
   c. Returns JSON response

9. Response returns: ECS → ALB → CloudFront → Tokyo edge → Browser
   Total TTFB: ~50ms (with cache hit) vs 300ms (without CDN)
`}</pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Choose the Front Door Components"
        intro="Interviewers usually want to hear why each entry-layer component exists and what risk or latency it removes from the application layer."
        steps={[
          "Start with DNS and explain how users find the system, especially if you need failover, weighted rollout, or latency-based routing.",
          "Decide whether CloudFront belongs in front based on static assets, global latency, edge TLS termination, and DDoS protection needs.",
          "Explain where WAF sits and why blocking bad traffic at the edge is better than letting it hit your regional origin.",
          "Choose ALB when you need HTTP-aware routing, API Gateway when you need managed auth, quotas, or tight Lambda integration, and NLB when you need static IPs or raw TCP or UDP.",
          "End with one operational note about cache behavior, health checks, or failover so the design sounds production-ready rather than diagram-only.",
        ]}
      />

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Using CloudFront in front of an ALB without configuring the ALB to only accept traffic from CloudFront:</strong> Anyone can bypass CloudFront by hitting your ALB DNS directly. Fix: configure ALB security group to only accept traffic from CloudFront managed prefix list.
        </li>
        <li>
          <strong>Caching API responses that include user-specific data:</strong> If <code>/api/profile</code>
          returns the logged-in user&apos;s data and you cache it at CloudFront, one user&apos;s
          profile can be served to another user. Always use <code>Cache-Control: private, no-store</code>
          for authenticated responses.
        </li>
        <li>
          <strong>Not setting an appropriate TTL for the index.html:</strong> Too long: users see
          stale HTML with wrong JS/CSS references after a deploy. Too short: every user hits origin
          for HTML. Solution: 60 seconds or deploy-time invalidation.
        </li>
        <li>
          <strong>Forgetting WAF on new endpoints:</strong> Adding a new API endpoint and forgetting
          to apply WAF rules. Ensure WAF applies to all traffic entering via CloudFront, not per-endpoint.
        </li>
        <li>
          <strong>Using REST API Gateway when HTTP API suffices:</strong> REST API is 3.5&times;
          more expensive and has more complexity. Unless you specifically need REST API features
          (request validation, usage plans, request transformation), use HTTP API.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What happens before a request reaches your backend API?</strong></p>
      <p>
        In a typical AWS production setup: DNS resolution via Route 53, then the request hits a
        CloudFront edge node (CDN), which either serves from cache or forwards to the origin. The
        origin request passes through WAF (security rules), then hits an Application Load Balancer
        which terminates SSL and routes to a healthy backend instance based on path or host rules.
        Each layer can fail independently, so you need monitoring at every stage.
      </p>

      <p><strong>Q: What is the difference between a CDN and a load balancer?</strong></p>
      <p>
        A CDN (like CloudFront) caches content at geographically distributed edge nodes close to
        users, primarily for reducing latency for content that can be reused across requests. A load
        balancer distributes incoming requests across multiple backend instances for scalability and
        fault tolerance. They solve different problems: CDN solves geographic latency; load balancers
        solve capacity and availability. In production you often use both: CloudFront in front of
        an ALB in front of multiple backend servers.
      </p>

      <p><strong>Q: When would you choose NLB over ALB?</strong></p>
      <p>
        NLB is the right choice when: you need a static IP (for client-side whitelisting), you
        handle non-HTTP protocols (TCP/UDP for gaming, IoT, custom protocols), you need ultra-low
        latency (NLB adds ~100ms vs ALB&apos;s ~400ms overhead), or you need to preserve the client
        source IP at the backend. For everything else &mdash; standard web APIs, microservices,
        WebSocket &mdash; ALB is the right choice.
      </p>

      <p><strong>Q: How do you do a canary deployment using Route 53?</strong></p>
      <p>
        Using weighted routing: create two records for the same domain, one pointing to the stable
        version (weight 90) and one pointing to the new version (weight 10). Route 53 distributes
        traffic according to weights. You monitor the new version&apos;s error rates; if healthy,
        shift to 50/50, then 100% new. If unhealthy, shift weights back to 100% stable. This allows
        gradual rollout with easy rollback at the DNS level.
      </p>

      <p><strong>Q: How do you prevent CDN caching from serving stale content after a deploy?</strong></p>
      <p>
        Two main strategies: First, content-addressed filenames (hash the content and include it
        in the filename: <code>main.a1b2c3.js</code>). The filename changes with every deploy, so
        the CDN always serves fresh content. The HTML that references these files has a short TTL
        or is invalidated on deploy. Second, explicit CloudFront invalidation on deploy
        (<code>aws cloudfront create-invalidation</code>). The first approach is preferred because
        it does not cost money and does not have race conditions.
      </p>
    </div>
  );
}
