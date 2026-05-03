import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const tlsHandshakeDiagram = String.raw`sequenceDiagram
    autonumber
    participant C as Client
    participant S as Server

    C->>S: ClientHello with supported TLS versions and cipher suites
    S-->>C: ServerHello with selected cipher suite
    S-->>C: Certificate chain
    S-->>C: Finished
    C->>S: Finished
    Note over C,S: Encrypted HTTP application data can now flow
    Note over C,S: TLS 1.3 usually completes in 1 RTT; resumed sessions can use 0-RTT with replay caveats`;

const dnsResolutionDiagram = String.raw`flowchart TD
    OS["Your OS cache"]
    ISP["Router or ISP recursive resolver"]
    ROOT["Root name servers"]
    TLD[".com TLD name servers"]
    AUTH["example.com authoritative name servers<br/>Route 53"]
    ANSWER["Return api.app.example.com = 52.12.34.56"]

    OS --> ISP --> ROOT --> TLD --> AUTH --> ANSWER`;

export const toc: TocItem[] = [
  { id: "why-networking", title: "Why Networking Matters for Architects", level: 2 },
  { id: "http-versions", title: "HTTP/1.1 vs HTTP/2 vs HTTP/3", level: 2 },
  { id: "https-tls", title: "HTTPS and TLS", level: 2 },
  { id: "tcp-vs-udp", title: "TCP vs UDP", level: 2 },
  { id: "dns-deep", title: "DNS Deep Dive", level: 2 },
  { id: "ports", title: "Ports and What They Mean", level: 2 },
  { id: "headers", title: "Important HTTP Headers", level: 2 },
  { id: "status-codes", title: "Status Codes You Must Know", level: 2 },
  { id: "latency-throughput", title: "Latency vs Throughput", level: 2 },
  { id: "debugging", title: "Debugging Networking Issues", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function NetworkingFundamentals() {
  return (
    <div className="article-content">
      <p>
        Networking is the plumbing of distributed systems. You do not need to implement TCP/IP, but
        you absolutely need to understand what happens when two services communicate, why requests
        fail, and what knobs you can turn to make them faster and more reliable. Most production
        incidents have a networking dimension, and engineers who understand the protocol stack debug
        them faster.
      </p>

      <h2 id="why-networking">Why Networking Matters for Architects</h2>
      <p>
        Every architectural decision you make has networking implications. Choosing between
        microservices and a monolith changes network call frequency. Choosing a database in a
        different availability zone adds 1&ndash;2ms to every query. Choosing HTTP vs gRPC changes
        your serialization overhead. These tradeoffs only make sense if you understand the underlying
        protocol behavior.
      </p>

      <h2 id="http-versions">HTTP/1.1 vs HTTP/2 vs HTTP/3</h2>
      <p>
        HTTP is the application protocol that powers the web. Its evolution has been driven by one
        primary goal: reducing latency.
      </p>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Year</th>
            <th>Key Feature</th>
            <th>Limitation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HTTP/1.1</td>
            <td>1997</td>
            <td>Persistent connections (keep-alive), pipelining</td>
            <td>Head-of-line blocking: one response blocks the next in a pipeline</td>
          </tr>
          <tr>
            <td>HTTP/2</td>
            <td>2015</td>
            <td>Multiplexing over one TCP connection, header compression (HPACK), server push</td>
            <td>Still has TCP-level head-of-line blocking on packet loss</td>
          </tr>
          <tr>
            <td>HTTP/3</td>
            <td>2022</td>
            <td>Built on QUIC (UDP-based), eliminates TCP head-of-line blocking, faster connection setup</td>
            <td>UDP blocked in some corporate networks, still maturing in tooling</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>HTTP/2 multiplexing explained:</strong> HTTP/1.1 required one request per connection
        (or complex pipelining). Browsers worked around this by opening 6&ndash;8 connections per
        origin. HTTP/2 lets a single connection carry many concurrent request/response streams. This
        eliminates the need for connection hacking and reduces overhead.
      </p>

      <p>
        <strong>When HTTP/3 matters:</strong> Mobile networks have high packet loss and changing IP
        addresses (e.g., WiFi to cellular). QUIC handles this better than TCP because QUIC
        connections are identified by connection ID, not IP:port tuple, so connections survive
        network changes. CloudFront supports HTTP/3 by default.
      </p>

      <pre><code>{`# Check which HTTP version a server uses
curl -I --http2 https://api.example.com
# Look for: HTTP/2 200

# Or use verbose output
curl -v https://api.example.com 2>&1 | grep "HTTP/"

# In Chrome DevTools: Network tab → Protocol column
# Values: h2 (HTTP/2), h3 (HTTP/3), http/1.1`}</code></pre>

      <h2 id="https-tls">HTTPS and TLS</h2>
      <p>
        HTTPS = HTTP + TLS (Transport Layer Security). TLS provides: confidentiality (encryption),
        integrity (data has not been tampered with), and authentication (server identity is verified
        via certificate).
      </p>
      <p>
        <strong>TLS handshake (simplified TLS 1.3):</strong>
      </p>
      <MermaidDiagram
        chart={tlsHandshakeDiagram}
        title="TLS 1.3 Handshake"
        caption="Focus on the order: negotiate, prove identity with the certificate, finish the key exchange, then send encrypted HTTP data."
        minHeight={460}
      />

      <p>
        <strong>Certificates:</strong> Issued by Certificate Authorities (CAs) like Let&apos;s
        Encrypt, DigiCert, or AWS Certificate Manager (ACM). ACM provides free certificates that
        auto-renew, integrated with CloudFront and ALB. Never manage certificates manually in
        production &mdash; use ACM.
      </p>
      <p>
        <strong>Certificate pinning:</strong> Mobile apps sometimes pin the expected certificate to
        prevent man-in-the-middle attacks. This makes certificate rotation painful. Generally
        avoided unless the threat model specifically requires it.
      </p>

      <h2 id="tcp-vs-udp">TCP vs UDP</h2>
      <p>
        The transport layer sits below HTTP. TCP and UDP are the two dominant protocols, and they
        make fundamentally different tradeoffs.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>TCP</th>
            <th>UDP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Connection</td>
            <td>Connection-oriented (3-way handshake)</td>
            <td>Connectionless</td>
          </tr>
          <tr>
            <td>Reliability</td>
            <td>Guaranteed delivery, ordering, retransmission</td>
            <td>Best-effort, no guarantee</td>
          </tr>
          <tr>
            <td>Overhead</td>
            <td>Higher (headers, ACKs, flow control)</td>
            <td>Lower (minimal headers)</td>
          </tr>
          <tr>
            <td>Use cases</td>
            <td>HTTP, HTTPS, databases, file transfer, SSH</td>
            <td>DNS, video streaming, gaming, VOIP, QUIC</td>
          </tr>
          <tr>
            <td>Latency</td>
            <td>Higher (retransmission on loss)</td>
            <td>Lower (no waiting for retransmit)</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>When UDP wins:</strong> When losing a packet is better than waiting for retransmission.
        A video call dropping a frame is better than freezing for 50ms waiting for it. DNS uses UDP
        because queries are small, fast, and can be retried by the application.
      </p>
      <p>
        <strong>QUIC (HTTP/3):</strong> Runs on UDP but implements its own reliability, congestion
        control, and multiplexing in the application layer. It gets the latency benefits of UDP
        while solving the reliability problems &mdash; a significant engineering achievement.
      </p>

      <h2 id="dns-deep">DNS Deep Dive</h2>
      <p>
        DNS is hierarchical. When you look up <code>api.app.example.com</code>:
      </p>
      <MermaidDiagram
        chart={dnsResolutionDiagram}
        title="DNS Resolution Chain"
        caption="A resolver only climbs the hierarchy until it reaches the authoritative answer, then caches that answer for the record TTL to avoid repeating the full walk."
        minHeight={480}
      />
      <p>
        <strong>TTL matters:</strong> each record has a time to live. The resolver caches the result
        for that many seconds before re-querying. Low TTLs improve failover speed but increase lookup
        traffic. High TTLs reduce lookup cost but slow down traffic shifts during incidents.
      </p>

      <p><strong>Common DNS record types:</strong></p>
      <table>
        <thead>
          <tr>
            <th>Record</th>
            <th>Purpose</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>Maps hostname to IPv4 address</td>
            <td>app.example.com &rarr; 52.12.34.56</td>
          </tr>
          <tr>
            <td>AAAA</td>
            <td>Maps hostname to IPv6 address</td>
            <td>app.example.com &rarr; 2001:db8::1</td>
          </tr>
          <tr>
            <td>CNAME</td>
            <td>Alias: maps hostname to another hostname</td>
            <td>www.example.com &rarr; app.example.com</td>
          </tr>
          <tr>
            <td>MX</td>
            <td>Mail server for domain</td>
            <td>example.com &rarr; mail.google.com</td>
          </tr>
          <tr>
            <td>TXT</td>
            <td>Arbitrary text (SPF, DKIM, verification)</td>
            <td>v=spf1 include:amazonses.com ~all</td>
          </tr>
          <tr>
            <td>NS</td>
            <td>Name servers for domain</td>
            <td>example.com &rarr; ns1.route53.com</td>
          </tr>
          <tr>
            <td>SOA</td>
            <td>Start of Authority (zone metadata)</td>
            <td>Primary NS, refresh interval, TTL</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Route 53 routing policies</strong> (crucial for system design):
      </p>
      <ul>
        <li><strong>Simple:</strong> Returns one IP. No health checks.</li>
        <li><strong>Weighted:</strong> Split traffic by percentage (e.g., 90/10 for canary deploys).</li>
        <li><strong>Latency-based:</strong> Route to the AWS region with lowest latency for the user.</li>
        <li><strong>Failover:</strong> Primary/secondary. Route 53 monitors health; switches automatically.</li>
        <li><strong>Geolocation:</strong> Route based on user&apos;s geographic location.</li>
        <li><strong>Multi-value:</strong> Return multiple IPs; client picks one; dead ones filtered out by health checks.</li>
      </ul>

      <h2 id="ports">Ports and What They Mean</h2>
      <p>
        Ports allow multiple services to run on the same IP address. A server listens on a port; a
        client connects to that IP:port combination.
      </p>
      <table>
        <thead>
          <tr>
            <th>Port</th>
            <th>Protocol</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80</td>
            <td>HTTP</td>
            <td>Should redirect to 443 in production</td>
          </tr>
          <tr>
            <td>443</td>
            <td>HTTPS</td>
            <td>All production traffic</td>
          </tr>
          <tr>
            <td>22</td>
            <td>SSH</td>
            <td>Should be restricted to known IPs; use bastion or SSM in AWS</td>
          </tr>
          <tr>
            <td>3306</td>
            <td>MySQL</td>
            <td>Should never be public; private subnet only</td>
          </tr>
          <tr>
            <td>5432</td>
            <td>PostgreSQL</td>
            <td>Same as above</td>
          </tr>
          <tr>
            <td>6379</td>
            <td>Redis</td>
            <td>Internal only</td>
          </tr>
          <tr>
            <td>8080 / 3000</td>
            <td>App servers</td>
            <td>ALB routes port 443 to your app&apos;s internal port</td>
          </tr>
        </tbody>
      </table>

      <h2 id="headers">Important HTTP Headers</h2>
      <p>Headers carry metadata about requests and responses. These are the ones that matter most for system design:</p>
      <table>
        <thead>
          <tr>
            <th>Header</th>
            <th>Direction</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Authorization</code></td>
            <td>Request</td>
            <td>Bearer &lt;JWT&gt; or Basic credentials</td>
          </tr>
          <tr>
            <td><code>Content-Type</code></td>
            <td>Both</td>
            <td>application/json, multipart/form-data, text/html</td>
          </tr>
          <tr>
            <td><code>Cache-Control</code></td>
            <td>Response</td>
            <td>max-age=3600, no-cache, no-store, private, public</td>
          </tr>
          <tr>
            <td><code>ETag</code></td>
            <td>Response</td>
            <td>Hash of response; client sends in If-None-Match for conditional GET</td>
          </tr>
          <tr>
            <td><code>X-Request-ID</code></td>
            <td>Both</td>
            <td>Unique ID for tracing a request across services</td>
          </tr>
          <tr>
            <td><code>X-Forwarded-For</code></td>
            <td>Request</td>
            <td>Client&apos;s real IP (set by load balancers/proxies)</td>
          </tr>
          <tr>
            <td><code>Access-Control-Allow-Origin</code></td>
            <td>Response</td>
            <td>CORS: which origins can call this API</td>
          </tr>
          <tr>
            <td><code>Content-Encoding</code></td>
            <td>Response</td>
            <td>gzip or br (brotli) indicating compression</td>
          </tr>
          <tr>
            <td><code>Retry-After</code></td>
            <td>Response</td>
            <td>With 429 (rate limit) or 503; tells client when to retry</td>
          </tr>
          <tr>
            <td><code>Strict-Transport-Security</code></td>
            <td>Response</td>
            <td>HSTS: force HTTPS for future requests</td>
          </tr>
        </tbody>
      </table>

      <pre><code>{`# Inspect all headers from a request/response
curl -D - https://api.example.com/health -o /dev/null

# Send JSON with auth header
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGci..." \
  -d '{"name": "Alice"}'

# Check CORS headers
curl -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://api.example.com/data`}</code></pre>

      <h2 id="status-codes">Status Codes You Must Know</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Meaning</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>200 OK</td>
            <td>Success</td>
            <td>GET/PUT/PATCH success with body</td>
          </tr>
          <tr>
            <td>201 Created</td>
            <td>Resource created</td>
            <td>POST that creates a resource</td>
          </tr>
          <tr>
            <td>204 No Content</td>
            <td>Success, no body</td>
            <td>DELETE success</td>
          </tr>
          <tr>
            <td>301 Moved Permanently</td>
            <td>Redirect</td>
            <td>HTTP &rarr; HTTPS redirect, old URLs</td>
          </tr>
          <tr>
            <td>304 Not Modified</td>
            <td>Use cache</td>
            <td>ETag match, client can use cached version</td>
          </tr>
          <tr>
            <td>400 Bad Request</td>
            <td>Client error</td>
            <td>Validation failure, malformed request</td>
          </tr>
          <tr>
            <td>401 Unauthorized</td>
            <td>Not authenticated</td>
            <td>Missing or invalid auth token</td>
          </tr>
          <tr>
            <td>403 Forbidden</td>
            <td>Not authorized</td>
            <td>Authenticated but no permission</td>
          </tr>
          <tr>
            <td>404 Not Found</td>
            <td>Resource missing</td>
            <td>Resource does not exist</td>
          </tr>
          <tr>
            <td>409 Conflict</td>
            <td>State conflict</td>
            <td>Duplicate creation, version conflict</td>
          </tr>
          <tr>
            <td>422 Unprocessable Entity</td>
            <td>Semantic error</td>
            <td>Structurally valid but semantically wrong request</td>
          </tr>
          <tr>
            <td>429 Too Many Requests</td>
            <td>Rate limited</td>
            <td>Client is sending too many requests</td>
          </tr>
          <tr>
            <td>500 Internal Server Error</td>
            <td>Server bug</td>
            <td>Unhandled exception</td>
          </tr>
          <tr>
            <td>502 Bad Gateway</td>
            <td>Upstream error</td>
            <td>ALB cannot reach backend (backend down)</td>
          </tr>
          <tr>
            <td>503 Service Unavailable</td>
            <td>Overloaded/down</td>
            <td>Server intentionally rejecting (overloaded, deploying)</td>
          </tr>
          <tr>
            <td>504 Gateway Timeout</td>
            <td>Upstream timeout</td>
            <td>ALB reached backend but backend took too long</td>
          </tr>
        </tbody>
      </table>

      <h2 id="latency-throughput">Latency vs Throughput</h2>
      <p>
        These are two different dimensions of performance. A common mistake is conflating them or
        optimizing for one without understanding the impact on the other.
      </p>
      <ul>
        <li>
          <strong>Latency:</strong> Time to complete one request (ms). Measured as p50, p95, p99.
          The average is misleading &mdash; p99 latency is what your worst 1% of users experience.
          If p99 is 2 seconds, 1 in 100 requests is terrible.
        </li>
        <li>
          <strong>Throughput:</strong> Requests per second (RPS) the system can handle. You can
          often increase throughput by processing requests in parallel or batching them, but this
          may increase individual request latency.
        </li>
      </ul>
      <p>
        <strong>Relationship:</strong> Little&apos;s Law states that concurrency = throughput &times;
        latency. If your service handles 1000 req/s and each request takes 100ms, it is handling
        ~100 concurrent requests. If latency doubles to 200ms, you need to handle ~200 concurrent
        requests for the same throughput &mdash; which requires more server capacity.
      </p>

      <h2 id="debugging">Debugging Networking Issues</h2>
      <pre><code>{`# Full verbose request (shows handshake, headers, body)
curl -v https://api.example.com/endpoint

# Just the HTTP status code
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health

# Timing breakdown
curl -w "\\nDNS: %{time_namelookup}s\\nConnect: %{time_connect}s\\nTLS: %{time_appconnect}s\\nTTFB: %{time_starttransfer}s\\nTotal: %{time_total}s\\n" \
  -o /dev/null -s https://api.example.com

# Follow redirects
curl -L https://api.example.com

# DNS resolution only
dig api.example.com
nslookup api.example.com

# Route to server (latency per hop)
traceroute api.example.com
mtr api.example.com

# Open connections on your server
ss -s                  # summary
ss -tnp | grep ESTAB   # established TCP connections

# Test if port is open
nc -zv api.example.com 443
telnet api.example.com 443`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between HTTP/1.1 and HTTP/2?</strong></p>
      <p>
        HTTP/2 multiplexes multiple requests and responses over a single TCP connection, eliminating
        the need for browsers to open multiple parallel connections. It also adds header compression
        (HPACK) which reduces overhead for repeated headers. HTTP/1.1 with keep-alive can pipeline
        requests, but responses must be returned in order (head-of-line blocking). HTTP/2 solves this
        at the HTTP layer, though TCP-level head-of-line blocking remains.
      </p>

      <p><strong>Q: What is the difference between 401 and 403?</strong></p>
      <p>
        401 Unauthorized means the request is not authenticated &mdash; the server does not know who
        you are. The client should authenticate (provide credentials). 403 Forbidden means the request
        is authenticated (the server knows who you are) but you do not have permission to perform the
        action. The client should not retry &mdash; different credentials are needed.
      </p>

      <p><strong>Q: What happens when you set Cache-Control: no-cache?</strong></p>
      <p>
        Counterintuitively, <code>no-cache</code> does not mean &quot;do not cache.&quot; It means
        the cache must revalidate with the server before serving the cached response. The server can
        respond with 304 Not Modified (serve the cached copy) or a new response. To completely prevent
        caching, you need <code>no-store</code>. This is a common source of confusion.
      </p>

      <p><strong>Q: What is CORS and why does it exist?</strong></p>
      <p>
        CORS (Cross-Origin Resource Sharing) is a browser security mechanism that prevents web pages
        from making requests to a different origin than the one that served the page. It protects
        users from malicious sites that try to make requests to other sites on their behalf. The
        server controls which origins are allowed via <code>Access-Control-Allow-Origin</code> headers.
        CORS is enforced by browsers, not servers &mdash; server-to-server calls bypass it entirely.
      </p>

      <p><strong>Q: When would you use UDP over TCP?</strong></p>
      <p>
        When low latency matters more than guaranteed delivery: real-time gaming (a stale position
        update is worse than a missing one), voice/video calls (dropping a frame is better than
        freezing), live streaming, DNS queries (small, retriable), and QUIC/HTTP/3 (which implements
        its own reliability on top of UDP). The application layer handles reliability concerns
        rather than the transport layer.
      </p>

      <p><strong>Q: Why does p99 latency matter more than average latency?</strong></p>
      <p>
        The average hides outliers. If 99% of requests take 10ms but 1% take 5 seconds, your average
        might be 60ms &mdash; which sounds acceptable. But 1 in 100 users is waiting 5 seconds.
        At scale, 1% of a million daily requests is 10,000 terrible experiences per day. p99 latency
        represents the worst experience your users commonly encounter. SLOs (Service Level Objectives)
        are almost always defined in terms of percentiles.
      </p>
    </div>
  );
}
