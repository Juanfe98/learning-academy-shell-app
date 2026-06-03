import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock, ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dnsResolutionDiagram = String.raw`sequenceDiagram
    participant U as Browser (Tokyo)
    participant R as Resolver (ISP)
    participant Root as Root server
    participant TLD as .com server
    participant R53 as Route 53 (your zone)
    U->>R: app.example.com?
    R->>Root: where is .com?
    Root-->>R: ask the .com servers
    R->>TLD: where is example.com?
    TLD-->>R: ask Route 53 (your name servers)
    R->>R53: app.example.com?
    R53-->>R: 13.225.x.x (CloudFront edge)
    R-->>U: 13.225.x.x
    Note over U,R: resolver caches the answer for TTL seconds`;

const failoverDiagram = String.raw`stateDiagram-v2
    [*] --> Primary
    Primary --> Primary: health check passes
    Primary --> Secondary: 3 failed checks in a row
    Secondary --> Secondary: primary still unhealthy
    Secondary --> Primary: primary recovers
    note right of Secondary
      Route 53 stops returning the
      primary IP automatically.
      No human, no redeploy.
    end note`;

const weightedDiagram = String.raw`flowchart LR
    U["Incoming users"]
    R53{"Route 53<br/>weighted record"}
    STABLE["Stable stack<br/>weight 90"]
    CANARY["New version<br/>weight 10"]
    U --> R53
    R53 -->|90% of lookups| STABLE
    R53 -->|10% of lookups| CANARY
    CANARY -. errors spike .-> ROLLBACK["Set weight to 0<br/>instant rollback"]`;

export const toc: TocItem[] = [
  { id: "why-dns", title: "Why DNS Is the First Layer", level: 2 },
  { id: "how-resolution-works", title: "How a Name Becomes an IP", level: 2 },
  { id: "record-types", title: "Record Types You Must Know", level: 2 },
  { id: "routing-policies", title: "Routing Policies: DNS as a Traffic Controller", level: 2 },
  { id: "health-checks", title: "Health Checks & Automatic Failover", level: 2 },
  { id: "canary", title: "Canary Deploys with Weighted Routing", level: 2 },
  { id: "ttl", title: "TTL: The Hidden Lever", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "challenge", title: "Challenge: Design Multi-Region Failover", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "portability", title: "Generic Concept vs AWS Implementation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function DnsAndRoute53() {
  return (
    <div className="article-content">
      <p>
        Every request to your system starts with a question: <em>&ldquo;what is the IP address
        behind this domain name?&rdquo;</em> DNS answers it. But DNS is not just a phone book &mdash;
        in AWS, <strong>Route 53</strong> turns DNS into an active traffic controller that can route
        users to the nearest region, shift traffic gradually during a deploy, and fail over to a
        backup automatically when a server dies. Understanding this layer lets you build global,
        resilient systems <em>before a single line of application code runs</em>.
      </p>

      <h2 id="why-dns">Why DNS Is the First Layer</h2>
      <p>
        Computers talk in IP addresses (<code>13.225.x.x</code>), but humans use names
        (<code>app.example.com</code>). DNS is the translation layer between the two. It is the very
        first thing that happens on any request &mdash; before TLS, before the CDN, before your load
        balancer. That position is powerful: whoever controls the DNS answer controls
        <em>where the request goes next</em>. Route 53 exploits this by returning different IPs
        depending on the user&apos;s location, the health of your servers, or a rollout weight you set.
      </p>

      <h2 id="how-resolution-works">How a Name Becomes an IP</h2>
      <p>
        When a browser in Tokyo needs <code>app.example.com</code>, it does not ask AWS directly. It
        asks its <strong>resolver</strong> (usually run by the ISP), which walks a hierarchy of
        servers: the <strong>root</strong> servers point to the <code>.com</code> servers, which
        point to <em>your</em> name servers (Route 53), which finally return the IP. The resolver
        then caches that answer for a number of seconds called the <strong>TTL</strong>.
      </p>
      <MermaidDiagram
        chart={dnsResolutionDiagram}
        title="DNS Resolution Walk"
        caption="Notice the last hop: Route 53 is the authoritative server for your zone, so it gets the final say on which IP to return — and it can make that decision dynamically."
        minHeight={460}
      />
      <p>
        The key insight: because the resolver <strong>caches</strong> the answer for the TTL, a
        change you make in Route 53 is not seen by users until their cached entry expires. TTL is the
        difference between &ldquo;failover in 60 seconds&rdquo; and &ldquo;failover in an hour.&rdquo;
      </p>

      <h2 id="record-types">Record Types You Must Know</h2>
      <p>
        A DNS <strong>record</strong> maps a name to a value. The type of record decides what kind of
        value it holds.
      </p>
      <ul>
        <li><strong>A record:</strong> name &rarr; IPv4 address (<code>13.225.1.2</code>).</li>
        <li><strong>AAAA record:</strong> name &rarr; IPv6 address.</li>
        <li><strong>CNAME:</strong> name &rarr; another <em>name</em> (alias). Cannot be used at the
          zone apex (the bare <code>example.com</code>).</li>
        <li><strong>Alias:</strong> Route 53&apos;s own record type. Behaves like a CNAME but
          <em>works at the zone apex</em> and is <strong>free</strong> for lookups to AWS resources
          (CloudFront, ALB, S3). Use this to point <code>example.com</code> at a load balancer.</li>
        <li><strong>MX / TXT / NS:</strong> mail routing, domain verification, and which name servers
          are authoritative.</li>
      </ul>
      <p>
        The most common interview trap: <em>&ldquo;why can&apos;t you put a CNAME on the bare
        domain?&rdquo;</em> Because the apex must also hold required records like NS and SOA, and a
        CNAME forbids any other record on the same name. Route 53&apos;s Alias record sidesteps this
        limitation entirely.
      </p>

      <h2 id="routing-policies">Routing Policies: DNS as a Traffic Controller</h2>
      <p>
        This is where Route 53 stops being a phone book. A <strong>routing policy</strong> tells
        Route 53 <em>how to choose</em> which value to return when multiple records share a name.
      </p>
      <ArticleTable
        caption="Each policy answers a different question: 'who is healthy?', 'who is closest?', or 'what fraction should go here?'"
        minWidth={820}
      >
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
              <td><code>Simple</code></td>
              <td>Returns one value, no health checks</td>
              <td>Single server (avoid in production)</td>
            </tr>
            <tr>
              <td><code>Failover</code></td>
              <td>Primary/secondary; auto-switch on health failure</td>
              <td>Active-passive disaster recovery</td>
            </tr>
            <tr>
              <td><code>Weighted</code></td>
              <td>Split traffic by percentage (e.g. 90/10)</td>
              <td>Canary deploys, gradual shifting</td>
            </tr>
            <tr>
              <td><code>Latency-based</code></td>
              <td>Route to the AWS region with lowest latency for the user</td>
              <td>Active-active for global users</td>
            </tr>
            <tr>
              <td><code>Geolocation</code></td>
              <td>Route by the user&apos;s country/continent</td>
              <td>Data residency (GDPR)</td>
            </tr>
            <tr>
              <td><code>Multi-value</code></td>
              <td>Return up to 8 healthy IPs</td>
              <td>Cheap client-side load balancing</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="health-checks">Health Checks &amp; Automatic Failover</h2>
      <p>
        A <strong>health check</strong> is a probe Route 53 runs against your endpoint every 30
        seconds (or every 10s for a small fee). If the endpoint fails a configurable number of checks
        in a row, Route 53 <em>stops returning its IP</em>. Combined with the failover policy, this
        gives you automatic, DNS-level failover with no human and no redeploy.
      </p>
      <MermaidDiagram
        chart={failoverDiagram}
        title="Failover State Machine"
        caption="The whole point: the transition from Primary to Secondary happens because health checks failed, not because someone got paged at 3am."
        minHeight={420}
      />
      <CodeBlock code={`# Route 53 health check + failover record (Terraform)
resource "aws_route53_health_check" "api" {
  fqdn              = "api.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10  # seconds (fast = $0.50/month)
}

resource "aws_route53_record" "api_primary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "primary"
  failover_routing_policy { type = "PRIMARY" }
  health_check_id = aws_route53_health_check.api.id
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}`} lang="hcl" />

      <h2 id="canary">Canary Deploys with Weighted Routing</h2>
      <p>
        Weighted routing lets you ship a new version to a small slice of real traffic. Create two
        records for the same name: one pointing at the stable stack with weight 90, one at the new
        version with weight 10. Route 53 hands out the new IP to roughly 10% of lookups. Watch the
        new version&apos;s error rate; if it is healthy, shift to 50/50, then 100%. If it misbehaves,
        set its weight to 0 and traffic drains back to stable &mdash; a rollback at the DNS layer.
      </p>
      <MermaidDiagram
        chart={weightedDiagram}
        title="Weighted Canary Rollout"
        caption="Rollback is just a weight change — no rebuild, no redeploy, and it takes effect as cached entries expire."
        minHeight={360}
      />

      <h2 id="ttl">TTL: The Hidden Lever</h2>
      <p>
        TTL (time to live) is how long resolvers cache your answer. It is a direct tradeoff:
      </p>
      <ul>
        <li><strong>Low TTL (60s):</strong> failover and canary changes take effect fast, but
          resolvers query Route 53 more often (slightly higher cost, more lookups).</li>
        <li><strong>High TTL (1 hour+):</strong> fewer lookups and faster average resolution, but a
          failover or rollback can take up to an hour to fully propagate.</li>
      </ul>
      <p>
        Rule of thumb: keep TTL low (60&ndash;120s) on records you plan to fail over or shift, and
        high on records that never change. A classic outage cause is a 24-hour TTL on a record you
        suddenly need to fail over &mdash; you are stuck until caches expire.
      </p>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Reason About DNS in a System Design"
        intro="Interviewers want to hear that DNS is an active routing tool, not a static lookup — and that you understand the TTL tradeoff."
        steps={[
          "Start by saying users find the system through Route 53, and DNS is the first place you can make a routing decision.",
          "Name the policy that fits the requirement: failover for active-passive, latency-based for global active-active, weighted for canary, geolocation for data residency.",
          "Tie failover to health checks — DNS stops returning unhealthy IPs automatically once checks fail a threshold.",
          "Mention TTL explicitly: low TTL on records you fail over, and explain that a high TTL slows propagation of any change.",
          "Close with the apex/Alias detail to show depth: you cannot CNAME the bare domain, so you use Route 53 Alias records to point it at an ALB or CloudFront.",
        ]}
      />

      <h2 id="challenge">Challenge: Design Multi-Region Failover</h2>
      <InterviewChallenge
        title="Active-Passive Across Two Regions"
        scenario={
          <>
            Your API runs an ALB in <code>us-east-1</code> (primary) and an identical standby ALB in
            <code>eu-west-1</code>. You must serve <code>api.example.com</code> so that if the primary
            region goes fully down, European and US users automatically hit the standby within ~1
            minute &mdash; with no human intervention.
          </>
        }
        tasks={[
          "Choose the routing policy and explain why it fits active-passive.",
          "Describe the health check that decides when failover happens, including the path it probes.",
          "Pick a TTL and justify it against the ~1 minute recovery requirement.",
          "Explain what record type points api.example.com at each ALB and why CNAME would not work at the apex.",
        ]}
        pitfalls={[
          "Setting a 1-hour TTL — failover would take up to an hour, breaking the requirement.",
          "Health-checking the ALB DNS only, not a real /health endpoint that proves the app works.",
        ]}
        signal="A strong answer connects policy + health check + TTL into one coherent, automatic failover story."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Use a <strong>failover routing policy</strong> with two records sharing the name
          <code>api.example.com</code>: PRIMARY pointing (via Alias) at the
          <code>us-east-1</code> ALB, SECONDARY pointing at the <code>eu-west-1</code> ALB. Attach a
          Route 53 <strong>health check</strong> to the primary that probes
          <code>https://api.example.com/health</code> (a route that exercises the app, not just a TCP
          port) every 10 seconds with <code>failure_threshold = 3</code>. Set <strong>TTL to
          60s</strong> so resolvers pick up the switch within about a minute. Use <strong>Alias
          records</strong> because the apex-adjacent hostname must resolve directly to AWS resources
          and Alias is free and apex-safe; a plain CNAME at an apex is illegal. When the primary
          fails 3 checks (~30s), Route 53 stops returning it and serves the secondary; once cached
          entries expire (~60s), all users land on <code>eu-west-1</code>.
        </p>
      </SolutionReveal>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>High TTL on a failover record:</strong> the policy switches instantly server-side,
          but users keep hitting the dead IP until their cached answer expires.
        </li>
        <li>
          <strong>Health-checking a TCP port instead of a real route:</strong> the port is open but
          the app is broken. Always probe a <code>/health</code> path that touches the real code path.
        </li>
        <li>
          <strong>CNAME at the zone apex:</strong> illegal. Use Route 53 Alias records for the bare
          domain.
        </li>
        <li>
          <strong>Forgetting <code>evaluate_target_health</code>:</strong> without it, an Alias to an
          ALB will not reflect the ALB&apos;s own target health.
        </li>
      </ul>

      <h2 id="portability">Generic Concept vs AWS Implementation</h2>
      <p>
        The <em>concepts</em> here are portable to any DNS provider; the <em>names</em> are Route
        53&apos;s. Know both, so an interview at a non-AWS shop still lands.
      </p>
      <ArticleTable
        caption="The left column is what you actually reason about; the right two are vocabulary that changes per vendor."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Generic concept</th>
              <th>AWS (Route 53)</th>
              <th>Equivalent elsewhere</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Authoritative DNS / hosted zone</td>
              <td>Route 53 Hosted Zone</td>
              <td>Cloudflare / NS1 / Azure DNS zones (standard DNS)</td>
            </tr>
            <tr>
              <td>A / AAAA / CNAME / MX / TXT records</td>
              <td>Same (RFC standard)</td>
              <td>Identical everywhere</td>
            </tr>
            <tr>
              <td>Alias at the zone apex</td>
              <td>Alias record</td>
              <td>CNAME flattening (Cloudflare), ANAME / ALIAS (others)</td>
            </tr>
            <tr>
              <td>Active-passive failover by health</td>
              <td>Failover routing policy</td>
              <td>Cloudflare Load Balancing failover, NS1 filter chains</td>
            </tr>
            <tr>
              <td>Percentage / canary traffic split</td>
              <td>Weighted routing policy</td>
              <td>Weighted pools (Cloudflare), Azure Traffic Manager weighted</td>
            </tr>
            <tr>
              <td>Nearest-region / geo routing</td>
              <td>Latency-based &amp; Geolocation policies</td>
              <td>GeoDNS, Azure Traffic Manager performance/geographic</td>
            </tr>
            <tr>
              <td>Health-check-driven DNS failover</td>
              <td>Route 53 health checks</td>
              <td>GSLB health probes (any global load balancer)</td>
            </tr>
            <tr>
              <td>TTL / propagation tradeoff</td>
              <td>Record TTL</td>
              <td>Identical everywhere</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>DNS is the <strong>first</strong> routing decision point; Route 53 makes it dynamic.</li>
        <li>Routing policies map to requirements: <strong>failover</strong> (DR),
          <strong>latency</strong> (global), <strong>weighted</strong> (canary),
          <strong>geolocation</strong> (residency).</li>
        <li><strong>Health checks</strong> drive automatic failover &mdash; probe a real route, not a
          port.</li>
        <li><strong>TTL</strong> is the lever between fast propagation and fewer lookups; keep it low
          on records you fail over.</li>
        <li>Use <strong>Alias</strong> records (not CNAME) at the zone apex to point at AWS resources
          for free.</li>
      </ul>
    </div>
  );
}
