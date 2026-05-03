import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestLifecycleSequence = String.raw`sequenceDiagram
    autonumber
    actor USER as User / Browser
    participant DNS as DNS Chain
    participant CDN as CloudFront Edge
    participant ALB as AWS ALB
    participant APP as ECS Service
    participant CACHE as Redis Cache
    participant DB as Primary Database

    Note over USER,DNS: Step 1 • DNS resolution • 20-100 ms cold, ~0 ms cached
    USER->>DNS: Resolve app.example.com
    DNS-->>USER: Return edge IP address

    Note over USER,CDN: Step 2-3 • TCP + TLS handshake • 10-100 ms
    USER->>CDN: SYN
    CDN-->>USER: SYN-ACK
    USER->>CDN: ACK
    USER->>CDN: ClientHello
    CDN-->>USER: ServerHello + certificate
    USER->>CDN: Key exchange / finished
    CDN-->>USER: Secure session established

    Note over USER,CDN: Step 4 • CDN cache evaluation
    USER->>CDN: GET /dashboard

    alt CDN cache hit
        CDN-->>USER: Return cached HTML or API payload
        Note over USER,CDN: Total response can land in 10-50 ms
    else CDN cache miss
        CDN->>ALB: Forward origin request

        Note over ALB,APP: Step 5-7 • Routing, auth, and business logic
        ALB->>APP: Route to healthy task + forward headers
        APP->>APP: Validate session / JWT
        APP->>APP: Start business logic

        Note over APP,DB: Step 8 • Data access path
        APP->>CACHE: Lookup user data

        alt Cache hit
            CACHE-->>APP: Return cached object
        else Cache miss
            CACHE-->>APP: Miss
            APP->>DB: Query indexed records
            DB-->>APP: Return rows or document
            APP->>CACHE: Populate cache
        end

        Note over APP,USER: Step 9 • Response assembly and return
        APP-->>ALB: JSON or HTML response
        ALB-->>CDN: Origin response
        CDN-->>USER: Compressed response
        Note over USER,DB: Full cache-miss trip usually lands in 100-300 ms
    end`;

export const toc: TocItem[] = [
  { id: "why-this-matters", title: "Why Every Engineer Should Know This", level: 2 },
  { id: "scope-of-this-lesson", title: "Scope: Server Path vs Browser Render Path", level: 2 },
  { id: "sequence-diagram", title: "The Full Sequence", level: 2 },
  { id: "dns-resolution", title: "Step 1: DNS Resolution", level: 3 },
  { id: "tcp-connect", title: "Step 2: TCP Connection", level: 3 },
  { id: "tls-handshake", title: "Step 3: TLS Handshake", level: 3 },
  { id: "cdn-check", title: "Step 4: CDN Cache Check", level: 3 },
  { id: "load-balancer", title: "Step 5: Load Balancer", level: 3 },
  { id: "api-gateway", title: "Step 6: API Gateway / Reverse Proxy", level: 3 },
  { id: "backend-handler", title: "Step 7: Backend Application Handler", level: 3 },
  { id: "db-cache", title: "Step 8: Database & Cache", level: 3 },
  { id: "response-return", title: "Step 9: Response Return", level: 3 },
  { id: "browser-render", title: "Step 10: Browser Render Path", level: 3 },
  { id: "cold-vs-warm", title: "Cold Request vs Warm Request", level: 2 },
  { id: "static-vs-dynamic", title: "Static Asset vs Dynamic Page", level: 2 },
  { id: "latency-budget", title: "Latency Budget: Numbers Every Engineer Should Know", level: 2 },
  { id: "production-issues", title: "10 Common Production Issues by Stage", level: 2 },
  { id: "observability-map", title: "Observability Map", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "debugging-tools", title: "Debugging Tools", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function RequestLifecycle() {
  return (
    <div className="article-content">
      <p>
        Understanding what happens between a user clicking a button and seeing a response is not
        academic trivia &mdash; it is the foundation of every performance investigation, every
        infrastructure design, and every &quot;why is this slow?&quot; conversation you will ever have.
        Engineers who can mentally trace a request through the full stack diagnose issues in minutes.
        Engineers who cannot waste hours in the wrong layer.
      </p>

      <h2 id="why-this-matters">Why Every Engineer Should Know This</h2>
      <p>
        A slow page load could be caused by DNS misconfiguration, a missing CDN cache, an oversaturated
        load balancer, a slow database query, a missing index, an over-large payload, or a broken
        compression setting. Without a mental model of the full lifecycle, you cannot reason about
        which layer to investigate first. This module gives you that model.
      </p>

      <h2 id="scope-of-this-lesson">Scope: Server Path vs Browser Render Path</h2>
      <p>
        This lesson focuses on the <strong>network and origin request path</strong>: DNS, connection
        setup, CDN, load balancing, application logic, cache, database, and response return. That is
        only part of what a user perceives as a page load. After the response arrives, the browser
        still has to parse HTML, download scripts, execute JavaScript, hydrate components, lay out the
        page, and paint pixels. If the backend is fast but the bundle is huge, the user can still think
        the app is slow. Keep these as two related but distinct mental models.
      </p>

      <h2 id="sequence-diagram">The Full Sequence</h2>
      <MermaidDiagram
        chart={requestLifecycleSequence}
        title="Request Lifecycle Sequence Map"
        caption="Follow the request from the browser to DNS, through CloudFront and the load balancer, into the app, then through the cache and database branches before the response returns."
        minHeight={620}
      />

      <h3 id="dns-resolution">Step 1: DNS Resolution</h3>
      <p>
        DNS (Domain Name System) translates <code>app.example.com</code> into an IP address. Think of
        it as the internet&apos;s phone book. DNS is hierarchical: your OS checks its local cache first,
        then the router, then your ISP&apos;s resolver, and finally the authoritative name server (Route
        53 in AWS).
      </p>
      <p>
        <strong>What can go wrong:</strong> DNS TTL set too low (causes unnecessary lookups and
        higher latency on every cold request), DNS TTL set too high (failover to a new IP takes too
        long during outages), DNS misconfiguration (wrong A record causes complete outage for all
        users), DNS hijacking (security attack).
      </p>
      <p>
        <strong>Key numbers:</strong> Cold DNS lookup is 20&ndash;100ms. After caching (TTL typically
        60&ndash;300 seconds), it costs ~0ms. AWS Route 53 has 100% SLA and supports health-check-based
        failover &mdash; if your primary server is unhealthy, Route 53 automatically returns the IP of
        your standby.
      </p>
      <pre><code>{`# Debug DNS resolution
dig app.example.com
dig app.example.com @8.8.8.8  # force Google's resolver

# Check TTL of a record
dig app.example.com | grep -A1 "ANSWER SECTION"
# example output: app.example.com.  60  IN  A  52.12.34.56
#                                   ^TTL in seconds`}</code></pre>

      <h3 id="tcp-connect">Step 2: TCP Connection</h3>
      <p>
        TCP (Transmission Control Protocol) establishes a reliable, ordered connection before any data
        is sent. The three-way handshake (SYN, SYN-ACK, ACK) ensures both sides are ready. This costs
        one round trip (RTT) &mdash; typically 10&ndash;50ms depending on geographic distance between
        client and server.
      </p>
      <p>
        <strong>Why this matters for design:</strong> Each new TCP connection costs an RTT. This is why
        HTTP keep-alive and connection pooling exist &mdash; to reuse existing connections instead of
        paying the handshake cost on every request. HTTP/2 multiplexes multiple requests over a single
        TCP connection. HTTP/3 over QUIC reduces connection setup latency and avoids TCP head-of-line
        blocking, but it does not make connection establishment disappear.
      </p>

      <h3 id="tls-handshake">Step 3: TLS Handshake</h3>
      <p>
        HTTPS = HTTP + TLS. TLS (Transport Layer Security) encrypts the connection and authenticates
        the server. The handshake negotiates the cipher suite, exchanges keys, and verifies the server
        certificate. TLS 1.3 (modern standard) completes in one round trip. TLS 1.2 takes two.
      </p>
      <p>
        <strong>Termination point matters:</strong> TLS can be terminated at the CDN (CloudFront),
        at the load balancer (ALB), or at the backend. Terminating at the CDN is most common for
        performance. Traffic between the CDN and your origin should still be encrypted (end-to-end TLS),
        but the client&apos;s TLS session terminates at the nearest edge node. Inside the VPC, some teams
        terminate TLS at the ALB and use private-network HTTP to the service for simplicity, while
        regulated or zero-trust environments often keep TLS all the way to the application. The right
        choice depends on your threat model and compliance requirements.
      </p>

      <h3 id="cdn-check">Step 4: CDN Cache Check</h3>
      <p>
        A CDN (Content Delivery Network) like CloudFront has edge nodes distributed globally. When a
        request arrives, the CDN checks its cache. A <strong>cache hit</strong> returns the response
        immediately &mdash; often in under 5ms &mdash; without contacting your origin servers. A
        <strong>cache miss</strong> forwards the request to your origin (the ALB or S3 bucket).
      </p>
      <p>
        <strong>What can be cached:</strong> Static assets (JS, CSS, images), API responses with
        appropriate Cache-Control headers, HTML for public pages. Shared CDN caching is usually a poor
        fit for authenticated or highly personalized responses, but that does <em>not</em> mean those
        responses are never cacheable. Browser-private caching, carefully designed cache keys, edge-side
        fragment caching, and application-level caching are all common patterns.
      </p>
      <p>
        <strong>Cache invalidation:</strong> One of the hardest problems in computing. If you deploy
        a new version, CloudFront may still serve the old version until TTL expires. Solutions:
        content-addressed filenames (hash in filename), explicit invalidation via CloudFront API,
        short TTLs for HTML + long TTLs for hashed assets.
      </p>

      <h3 id="load-balancer">Step 5: Load Balancer</h3>
      <p>
        The Application Load Balancer (ALB) distributes incoming requests across multiple backend
        instances. It operates at Layer 7 (HTTP), so it can route based on URL path, hostname, or
        HTTP headers. It also performs health checks &mdash; if an instance stops responding, the ALB
        stops sending it traffic within seconds.
      </p>
      <p>
        <strong>SSL termination:</strong> The ALB can handle TLS termination, so your backend servers
        may communicate over plain HTTP internally in some architectures, which offloads cryptographic
        work from your application servers. But do not treat that as a universal best practice: many
        teams still use TLS from the ALB to the service for defense in depth.
      </p>

      <h3 id="api-gateway">Step 6: API Gateway / Reverse Proxy</h3>
      <p>
        Depending on architecture, there may be an API Gateway (AWS API Gateway, Kong, nginx) sitting
        between the load balancer and backend services. It handles cross-cutting concerns: authentication,
        rate limiting, request transformation, routing to microservices, logging. For a simple
        architecture, the ALB routes directly to backend containers without a separate API Gateway.
      </p>

      <h3 id="backend-handler">Step 7: Backend Application Handler</h3>
      <p>
        Your application code finally runs here. For a Node.js API, this is the Express/Fastify route
        handler. It parses the request, validates inputs, checks authentication (verify JWT signature,
        look up session), executes business logic, and calls downstream services (databases, caches,
        third-party APIs).
      </p>
      <p>
        <strong>Common performance mistakes here:</strong> Missing input validation (causes unnecessary
        DB calls), N+1 queries (a loop that makes one DB query per item), calling synchronous
        operations that should be async/queued, not timing internal operations (makes profiling impossible).
      </p>

      <h3 id="db-cache">Step 8: Database &amp; Cache</h3>
      <p>
        This is the most common bottleneck in production systems. The application checks the cache
        first (Redis/ElastiCache) &mdash; if the data is there, return it in ~0.5ms. On a cache miss,
        query the database (DynamoDB, PostgreSQL, MySQL), which takes 5&ndash;100ms depending on query
        complexity and whether indexes are being used. After a cache miss, populate the cache so future
        requests are fast.
      </p>
      <p>
        <strong>Why databases are the bottleneck:</strong> Disks are ~100&times; slower than RAM.
        Network round trips to a database are 10&times; slower than local memory. Correct indexing is
        the single highest-leverage optimization in most production systems.
      </p>

      <h3 id="response-return">Step 9: Response Return</h3>
      <p>
        The response travels back the same path: backend &rarr; ALB &rarr; CloudFront &rarr; browser.
        Key decisions here: compression (gzip or brotli reduces payload size 60&ndash;80%), correct
        Cache-Control headers (tell the CDN and browser how long to cache), Content-Type header
        (essential for correct parsing), and CORS headers if the request is cross-origin.
      </p>

      <h3 id="browser-render">Step 10: Browser Render Path</h3>
      <p>
        The request lifecycle is not fully done when the first byte arrives. The browser still has to
        parse the response, fetch linked assets, execute JavaScript, hydrate interactive UI, calculate
        layout, and paint the page. For modern SPAs and React apps, this client-side phase can dominate
        user-perceived latency even when the backend is healthy.
      </p>
      <p>
        <strong>Common frontend slowdowns:</strong> oversized JavaScript bundles, client-side waterfalls
        that wait for one API call before starting the next, hydration mismatches, render-blocking CSS,
        large images, and expensive main-thread work. This is why a great backend latency number does
        not automatically mean a fast product experience.
      </p>

      <h2 id="cold-vs-warm">Cold Request vs Warm Request</h2>
      <ArticleTable
        caption="Warm paths win because they avoid repeated setup work and reduce load on deeper layers."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Condition</th>
              <th>What Happens</th>
              <th>Typical Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">First visit from a user</th>
              <td>Fresh DNS lookup, new connection, full TLS, likely cold browser cache</td>
              <td>Highest latency path</td>
            </tr>
            <tr>
              <th scope="row">Repeat visit shortly after</th>
              <td>DNS cache hit, keep-alive or pooled connection, TLS resumption possible</td>
              <td>Lower setup overhead</td>
            </tr>
            <tr>
              <th scope="row">CDN warm cache</th>
              <td>CloudFront serves content without touching origin</td>
              <td>Huge latency and cost reduction</td>
            </tr>
            <tr>
              <th scope="row">Application cache warm</th>
              <td>Redis hit avoids database query</td>
              <td>Protects origin latency under load</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="static-vs-dynamic">Static Asset vs Dynamic Page</h2>
      <p>
        Not every request should be reasoned about the same way. A hashed JavaScript bundle, a public
        marketing page, and an authenticated <code>/dashboard</code> API call have different caching,
        routing, and invalidation strategies.
      </p>
      <ArticleTable caption="These request classes look similar in a browser, but they behave very differently in caching and origin load.">
        <table>
          <thead>
            <tr>
              <th>Request Type</th>
              <th>Best Caching Strategy</th>
              <th>Typical Origin Behavior</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hashed static asset</td>
              <td>Very long CDN and browser TTL</td>
              <td>Should rarely reach origin</td>
            </tr>
            <tr>
              <td>Public HTML page</td>
              <td>Short CDN TTL or revalidation</td>
              <td>Occasional origin fetch acceptable</td>
            </tr>
            <tr>
              <td>Authenticated API response</td>
              <td>Usually app cache or private cache, not broad shared CDN cache</td>
              <td>Often reaches origin by design</td>
            </tr>
            <tr>
              <td>Personalized dashboard shell</td>
              <td>Mix of cached static assets plus dynamic data fetches</td>
              <td>Backend latency matters, but frontend render path also matters</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="latency-budget">Latency Budget: Numbers Every Engineer Should Know</h2>
      <ArticleTable caption="Use these numbers as order-of-magnitude guidance when you build a latency budget or debug where time is going.">
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Typical Latency</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DNS lookup (cold)</td>
              <td>20&ndash;100ms</td>
              <td>Cached: ~0ms</td>
            </tr>
            <tr>
              <td>TCP handshake</td>
              <td>10&ndash;50ms</td>
              <td>One RTT; geographic distance matters</td>
            </tr>
            <tr>
              <td>TLS handshake (TLS 1.3)</td>
              <td>10&ndash;30ms</td>
              <td>One RTT with TLS 1.3 resumption</td>
            </tr>
            <tr>
              <td>CDN cache hit</td>
              <td>1&ndash;5ms</td>
              <td>Response from edge node</td>
            </tr>
            <tr>
              <td>CDN &rarr; origin (cache miss)</td>
              <td>10&ndash;50ms</td>
              <td>Network to your region</td>
            </tr>
            <tr>
              <td>Load balancer routing</td>
              <td>1&ndash;2ms</td>
              <td>Negligible</td>
            </tr>
            <tr>
              <td>Application code</td>
              <td>1&ndash;20ms</td>
              <td>Depends on complexity</td>
            </tr>
            <tr>
              <td>Redis cache read</td>
              <td>0.5&ndash;2ms</td>
              <td>Sub-ms in same AZ</td>
            </tr>
            <tr>
              <td>DynamoDB GetItem</td>
              <td>1&ndash;10ms</td>
              <td>Single-digit ms SLA</td>
            </tr>
            <tr>
              <td>PostgreSQL simple query</td>
              <td>1&ndash;5ms</td>
              <td>With index; 50&ndash;500ms without</td>
            </tr>
            <tr>
              <td>Response return (same region)</td>
              <td>10&ndash;30ms</td>
              <td>Network RTT</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="production-issues">10 Common Production Issues by Stage</h2>
      <ol>
        <li>
          <strong>DNS TTL too low:</strong> Millions of users all performing DNS lookups on every
          request, adding 20&ndash;100ms to every page load. Fix: set TTL to 60&ndash;300 seconds for
          most records.
        </li>
        <li>
          <strong>DNS failover delay:</strong> TTL set to 3600 seconds (1 hour). Primary server goes
          down. Users are stuck for an hour even though a healthy standby exists. Fix: use Route 53
          health checks with TTL 30&ndash;60 seconds.
        </li>
        <li>
          <strong>No CDN for static assets:</strong> Every user downloads 2MB of JavaScript from
          your origin server in Virginia, even users in Tokyo. Fix: CloudFront with long TTL for
          hashed assets.
        </li>
        <li>
          <strong>CDN serving stale HTML:</strong> You deploy a new version but old users see the
          old app for 24 hours because HTML was cached. Fix: short TTL for HTML (60s or use
          invalidation), content-addressed hashes for JS/CSS.
        </li>
        <li>
          <strong>ALB health check too slow:</strong> An unhealthy backend instance keeps receiving
          traffic for 30 seconds because health checks are too infrequent. Fix: health check interval
          10s, threshold 2 failures.
        </li>
        <li>
          <strong>No connection pooling to database:</strong> Each backend request opens a new
          database connection (takes 5&ndash;20ms and limited by max_connections). Fix: use a
          connection pool (pg-pool, SQLAlchemy connection pool, RDS Proxy).
        </li>
        <li>
          <strong>N+1 database queries:</strong> Fetching a list of 100 users and then making 100
          individual queries to get their profile data. 5ms × 100 = 500ms for what should be 5ms.
          Fix: batch queries, DataLoader pattern, or join.
        </li>
        <li>
          <strong>Missing cache headers:</strong> API returns JSON without Cache-Control header.
          Neither the CDN nor browser can cache it. Every user hits the origin. Fix: add
          <code>Cache-Control: public, max-age=60</code> for appropriate endpoints.
        </li>
        <li>
          <strong>Uncompressed responses:</strong> API returns 500KB of JSON instead of 50KB
          compressed. 10&times; the data transfer cost and latency. Fix: enable gzip/brotli at the
          application layer or load balancer.
        </li>
        <li>
          <strong>Missing timeout on backend calls:</strong> Third-party API call hangs for 30
          seconds with no timeout. All your backend threads are blocked waiting. Fix: always set
          connection and read timeouts on every external call.
        </li>
      </ol>

      <h2 id="observability-map">Observability Map</h2>
      <ArticleTable caption="A useful debugging habit is mapping each symptom to the layer that can actually explain it.">
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>What to Measure</th>
              <th>Useful Signals</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Browser</td>
              <td>Navigation timing, TTFB, asset waterfalls, render timing</td>
              <td>DevTools waterfall, Largest Contentful Paint, bundle size</td>
            </tr>
            <tr>
              <td>CDN</td>
              <td>Cache hit rate, origin latency, response status mix</td>
              <td><code>x-cache</code>, CloudFront hit ratio, origin fetch count</td>
            </tr>
            <tr>
              <td>Load balancer</td>
              <td>Target response time, healthy host count, 4xx/5xx</td>
              <td>ALB target latency, surge queue, unhealthy targets</td>
            </tr>
            <tr>
              <td>Application</td>
              <td>Handler latency, downstream call timing, error rate</td>
              <td>Tracing spans, structured logs, p95 by endpoint</td>
            </tr>
            <tr>
              <td>Cache and database</td>
              <td>Hit rate, query latency, connection count, slow queries</td>
              <td>Redis hit ratio, DB p95, lock waits, pool saturation</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain a Request Path Under Pressure"
        intro="Interviewers are usually checking whether you can reason in layers and isolate latency, not whether you can recite every packet detail from memory."
        steps={[
          "Start with the outer path: DNS, connection setup, TLS, CDN, load balancer, application, cache or database, and response return.",
          "Say which parts are often cached, which parts are usually dynamic, and where a cache hit can terminate the request early.",
          "Call out the dominant latency contributors: network round trips, TLS, CDN miss, database query time, and client-side render work after the response arrives.",
          "Name the key observability signals you would inspect at each layer such as DNS timing, TTFB, cache hit rate, ALB latency, app traces, and DB p95.",
          "Finish with one or two common failure modes such as stale CDN content, N+1 queries, or missing compression to show production instincts.",
        ]}
      />

      <h2 id="debugging-tools">Debugging Tools</h2>
      <p>
        When debugging, try to map each timing signal back to a layer. For example,
        <code>time_namelookup</code> points to DNS, <code>time_connect</code> and
        <code>time_appconnect</code> point to network and TLS setup, and a high
        <code>time_starttransfer</code> with normal setup timings usually points to CDN miss,
        origin latency, application work, or database time.
      </p>
      <pre><code>{`# Trace full request including DNS, TLS, TTFB
curl -v --trace-time https://app.example.com/api/health

# Get just timing breakdown
curl -w "@curl-format.txt" -s -o /dev/null https://app.example.com
# curl-format.txt contains:
#   time_namelookup: %{time_namelookup}s
#   time_connect: %{time_connect}s
#   time_appconnect: %{time_appconnect}s  (TLS)
#   time_starttransfer: %{time_starttransfer}s  (TTFB)
#   time_total: %{time_total}s

# DNS lookup details
dig app.example.com +trace   # full resolution chain

# Check route to server (network hops + latency)
traceroute app.example.com
mtr app.example.com          # continuous traceroute

# Check what's listening on a port
netstat -tlnp | grep 3000
ss -tlnp | grep 3000

# Check TLS certificate details
openssl s_client -connect app.example.com:443 -servername app.example.com`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: Walk me through what happens when a user visits https://app.example.com.</strong></p>
      <p>
        The browser resolves the domain via DNS (checking local cache, then ISP resolver, then the
        authoritative name server). It then establishes a TCP connection and negotiates TLS with the
        nearest CDN edge node. If the CDN has the response cached, it returns immediately. Otherwise,
        the CDN forwards to the origin load balancer, which routes the request to an available backend
        instance. The backend authenticates the request, checks the cache, queries the database if
        needed, and returns a response. The response travels back through the CDN (which may cache it
        for future requests) to the browser.
      </p>

      <p><strong>Q: A user reports that the app is slow. How do you start debugging?</strong></p>
      <p>
        I start by narrowing down the layer: is it slow globally or for one user? (Rules out geographic
        routing issues.) Is it slow for all endpoints or one? (Rules out application-wide issues.) Then
        I look at metrics: TTFB (Time to First Byte) tells me if the issue is server-side or network.
        I check CloudWatch latency metrics for the ALB and application, look at database query times,
        and check cache hit rates. The goal is to find where in the lifecycle the time is being spent
        before writing a single line of code.
      </p>

      <p><strong>Q: What is TTFB and what causes it to be high?</strong></p>
      <p>
        Time to First Byte (TTFB) is the time from a browser sending a request to receiving the first
        byte of the response. A high TTFB indicates a server-side or network issue &mdash; not client-side
        rendering. Common causes: slow database queries, missing caching, overloaded backend, cold start
        (Lambda), or geographic distance between user and server. A CDN with a warm cache brings TTFB
        below 50ms. A cache-miss round trip to a busy origin can be 500ms+.
      </p>

      <p><strong>Q: Why does connection pooling matter at scale?</strong></p>
      <p>
        Databases have a hard limit on concurrent connections (PostgreSQL defaults to 100). Each
        connection takes memory on the database server. Without a pool, each backend thread opens its
        own connection, and you can exhaust the limit quickly. With connection pooling, a small number
        of connections are kept open and reused across many requests, reducing connection overhead and
        database memory usage. At scale this is not optional.
      </p>

      <p><strong>Q: What are the tradeoffs of terminating TLS at the CDN vs the load balancer?</strong></p>
      <p>
        Terminating at the CDN is better for end-user latency: the TLS handshake completes at the
        nearest edge node (10&ndash;30ms) rather than traveling to your region (100&ndash;200ms).
        The tradeoff is that traffic between CDN and origin must be separately secured. Best practice:
        terminate TLS at the CDN for the client, but still enforce HTTPS between CDN and origin with
        a separate certificate to ensure end-to-end encryption.
      </p>

      <p><strong>Q: What is the difference between a CDN cache hit and a cache miss, and why does it matter?</strong></p>
      <p>
        A cache hit means the CDN has the response stored at its edge node and returns it directly,
        typically in 1&ndash;5ms regardless of where your servers are. A cache miss means the CDN
        must forward the request to your origin server, paying the full round-trip latency plus
        server processing time. The cache hit rate is a key metric: a 95% hit rate means only 5% of
        requests reach your origin, dramatically reducing origin load and cost.
      </p>
    </div>
  );
}
