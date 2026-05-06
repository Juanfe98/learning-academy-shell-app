import { ArticleTable, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "node-event-loop", title: "Node.js & Event Loop", level: 2 },
  { id: "express-middleware-q", title: "Express & Middleware", level: 2 },
  { id: "rest-http-q", title: "REST & HTTP", level: 2 },
  { id: "auth-jwt-q", title: "Authentication & JWT", level: 2 },
  { id: "sessions-cookies-q", title: "Sessions & Cookies", level: 2 },
  { id: "authz-q", title: "Authorization", level: 2 },
  { id: "security-q", title: "Security", level: 2 },
  { id: "database-q", title: "Database & ORM", level: 2 },
  { id: "caching-q", title: "Caching", level: 2 },
  { id: "testing-q", title: "Testing", level: 2 },
  { id: "performance-q", title: "Performance & Production", level: 2 },
  { id: "code-challenges", title: "Code Challenges", level: 2 },
  { id: "challenge-async-handler", title: "1. asyncHandler Wrapper", level: 3 },
  { id: "challenge-rate-limiter", title: "2. Sliding Window Rate Limiter", level: 3 },
  { id: "challenge-jwt-middleware", title: "3. JWT Auth Middleware", level: 3 },
  { id: "challenge-require-role", title: "4. requireRole Guard", level: 3 },
  { id: "challenge-error-handler", title: "5. Global Error Handler", level: 3 },
  { id: "challenge-cache-aside", title: "6. Cache-Aside with Redis", level: 3 },
  { id: "challenge-validate", title: "7. Zod Validation Middleware", level: 3 },
  { id: "challenge-cursor-pagination", title: "8. Cursor Pagination", level: 3 },
  { id: "challenge-graceful-shutdown", title: "9. Graceful Shutdown", level: 3 },
  { id: "challenge-retry", title: "10. Retry with Exponential Backoff", level: 3 },
];

export default function InterviewPrep() {
  return (
    <div className="article-content">
      <p>
        This module is pure interview preparation. First: every theory question a backend
        interviewer is likely to ask, with the answer you should give. Then: ten code
        challenges of the type that appear in live coding rounds — read the problem, attempt
        it yourself, then reveal the solution. The code challenges are what interviewers
        actually run in front of you. Know all of them cold.
      </p>

      {/* ─── THEORY QUESTIONS ─────────────────────────────────────────────────── */}

      <h2 id="node-event-loop">Node.js & Event Loop</h2>

      <h3>Q: What is the Node.js event loop and how does it let a single-threaded process handle concurrent I/O?</h3>
      <p>
        Node.js runs JavaScript on a single thread but offloads I/O (file reads, network,
        DNS) to the OS via libuv. When I/O completes, its callback is queued. The event loop
        continuously checks: are there microtasks (Promise callbacks, <code>queueMicrotask</code>,{" "}
        <code>process.nextTick</code>)? Run all of them. Then check the macrotask queue
        (timers, I/O callbacks, <code>setImmediate</code>). This lets thousands of concurrent
        connections share one thread because the thread is never blocked waiting — it's always
        processing or idle.
      </p>
      <p>
        <strong>Key implication for Express:</strong> never run CPU-intensive work (crypto,
        image processing, heavy computation) in a route handler synchronously — it blocks the
        loop and makes every other request wait. Offload to a worker thread (<code>worker_threads</code>)
        or a separate process.
      </p>

      <h3>Q: What is the difference between <code>process.nextTick</code>, <code>setImmediate</code>, and <code>setTimeout(fn, 0)</code>?</h3>
      <pre><code>{`// Execution order:
process.nextTick(() => console.log("1 - nextTick"));       // after current op, before I/O
Promise.resolve().then(() => console.log("2 - microtask")); // same queue as nextTick (after)
setImmediate(() => console.log("3 - setImmediate"));        // after I/O callbacks
setTimeout(() => console.log("4 - setTimeout"), 0);         // after timers phase

// Output: 1 → 2 → 4 → 3 (order of 3/4 can vary slightly by OS timer resolution)

// Rule: nextTick > Promise microtasks > setTimeout ≈ setImmediate
// Use nextTick for: deferring within same event loop turn (error emission pattern)
// Use setImmediate for: yielding to I/O before continuing CPU work`}</code></pre>

      <h3>Q: How do uncaught exceptions and unhandled rejections differ? How do you handle them?</h3>
      <pre><code>{`// Uncaught synchronous exception — crashes the process by default
process.on("uncaughtException", (err) => {
  console.error("Uncaught:", err);
  // Log to monitoring (Sentry, etc.)
  // Gracefully shut down — process is in undefined state, do not continue
  process.exit(1);
});

// Unhandled promise rejection — Node 15+ exits by default
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Best practice: always handle errors in async code
// In Express: use asyncHandler wrapper + global error middleware
// uncaughtException is a last resort, not a try/catch replacement`}</code></pre>

      <h3>Q: What is clustering and why does a Node.js backend need it in production?</h3>
      <p>
        Node.js runs on one CPU core by default. A server with 8 cores runs 7 idle cores.
        The <code>cluster</code> module (or PM2 cluster mode) forks the process once per core,
        with the OS distributing incoming connections across all workers via round-robin. Each
        worker has its own event loop and memory — they don't share state. This means session
        state, rate limit counters, and caches must live in Redis (not process memory) when
        clustering.
      </p>

      <h2 id="express-middleware-q">Express & Middleware</h2>

      <h3>Q: What happens if middleware doesn't call <code>next()</code> and doesn't send a response?</h3>
      <p>
        The request hangs. The client waits until its timeout fires. No error is thrown —
        Express has no way to know middleware is stuck. This is one of the most common Express bugs.
        Every middleware must either call <code>next()</code>, call <code>next(err)</code>, or
        send a response via <code>res.send()</code> / <code>res.json()</code> / etc.
      </p>

      <h3>Q: What is the signature of error-handling middleware and why must it have exactly 4 parameters?</h3>
      <pre><code>{`// Regular middleware: 3 params
app.use((req, res, next) => { });

// Error middleware: EXACTLY 4 params — Express detects this by function.length
// If you only declare 3, Express will NOT treat it as an error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// Consequence: if you accidentally write (err, req, res) => {} (3 params),
// it becomes a regular middleware that ignores its first argument
// This is a silent bug — no warning, errors just fall through`}</code></pre>

      <h3>Q: What is the difference between <code>app.use('/api', router)</code> and defining routes directly on <code>app</code>?</h3>
      <p>
        <code>express.Router()</code> creates a mini-application with its own middleware stack.
        Benefits: isolate middleware (e.g. auth applied only to protected routes), organize code
        by domain, apply a path prefix once. Routes on <code>app</code> directly share the same
        middleware stack. Routers can also be composed — a router can mount another router.
      </p>

      <h3>Q: How does Express route matching work? What is the difference between <code>app.use</code> and <code>app.get</code> for path matching?</h3>
      <p>
        <code>app.use('/api')</code> matches any path that <em>starts with</em> <code>/api</code>
        — including <code>/api/users</code>, <code>/api/orders/123</code>. It's a prefix match.{" "}
        <code>app.get('/api')</code> matches the exact path <code>/api</code> (no trailing segments).
        Route order matters: Express uses the first matching route. Once a response is sent,
        subsequent routes are skipped (unless you call <code>next()</code> from a route handler,
        which is unusual).
      </p>

      <h2 id="rest-http-q">REST & HTTP</h2>

      <h3>Q: What is idempotency? Which HTTP methods must be idempotent?</h3>
      <p>
        An operation is idempotent if calling it N times has the same effect as calling it once.
        GET, PUT, DELETE, HEAD, OPTIONS must be idempotent. POST is not (repeated POST /orders
        creates multiple orders). PATCH is usually not idempotent (though can be designed to be).
        Idempotency matters for retries: a client can safely retry a PUT or DELETE on timeout;
        retrying a POST risks duplication. For POST idempotency, use an idempotency key header.
      </p>

      <ArticleTable caption="HTTP method semantics — know these cold" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Purpose</th>
              <th>Idempotent</th>
              <th>Safe (read-only)</th>
              <th>Request body</th>
              <th>Success status</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>GET</td><td>Read resource or list</td><td>✓</td><td>✓</td><td>No</td><td>200</td></tr>
            <tr><td>POST</td><td>Create resource</td><td>✗</td><td>✗</td><td>Yes</td><td>201</td></tr>
            <tr><td>PUT</td><td>Replace entire resource</td><td>✓</td><td>✗</td><td>Yes</td><td>200</td></tr>
            <tr><td>PATCH</td><td>Partial update</td><td>Usually ✗</td><td>✗</td><td>Yes</td><td>200</td></tr>
            <tr><td>DELETE</td><td>Remove resource</td><td>✓</td><td>✗</td><td>Rarely</td><td>204</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3>Q: When do you return 400 vs 422 vs 404 vs 409?</h3>

      <ArticleTable caption="Status codes — the answer matters in interviews" minWidth={640}>
        <table>
          <thead>
            <tr><th>Code</th><th>Meaning</th><th>When to use</th></tr>
          </thead>
          <tbody>
            <tr><td>400</td><td>Bad Request</td><td>Malformed JSON, missing required fields, invalid types</td></tr>
            <tr><td>401</td><td>Unauthorized</td><td>Not authenticated — no token, expired token, bad credentials</td></tr>
            <tr><td>403</td><td>Forbidden</td><td>Authenticated but not authorized — valid token, wrong role</td></tr>
            <tr><td>404</td><td>Not Found</td><td>Resource doesn't exist (or exists but you're hiding it for security)</td></tr>
            <tr><td>409</td><td>Conflict</td><td>Duplicate — email already registered, optimistic lock collision</td></tr>
            <tr><td>422</td><td>Unprocessable</td><td>Semantically invalid — structurally valid JSON but business rule fails</td></tr>
            <tr><td>429</td><td>Too Many Requests</td><td>Rate limit exceeded — include Retry-After header</td></tr>
            <tr><td>500</td><td>Internal Server Error</td><td>Unexpected error — never expose details</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="auth-jwt-q">Authentication & JWT</h2>

      <h3>Q: Describe the structure of a JWT. What does each part contain?</h3>
      <pre><code>{`// JWT = base64url(header) + "." + base64url(payload) + "." + signature

// Header:
{ "alg": "HS256", "typ": "JWT" }
// or for asymmetric:
{ "alg": "RS256", "typ": "JWT", "kid": "key-id-2024" }

// Payload (claims):
{
  "sub": "user-123",        // subject — who this token is about
  "iss": "api.myapp.com",  // issuer
  "aud": "myapp-client",   // audience
  "iat": 1714000000,       // issued at (Unix timestamp)
  "exp": 1714003600,       // expiry (Unix timestamp)
  "role": "admin",         // custom claim
  "email": "alice@x.com"  // custom claim
}

// Signature (for HS256):
HMACSHA256(base64url(header) + "." + base64url(payload), SECRET_KEY)

// ⚠️ The payload is BASE64 ENCODED, NOT ENCRYPTED — anyone can read it
// Never put sensitive data (passwords, SSNs, PII) in the payload`}</code></pre>

      <h3>Q: What is the difference between HS256 and RS256? When do you use each?</h3>
      <p>
        HS256 uses a single shared secret (symmetric) — the same key signs and verifies.
        RS256 uses a private/public key pair (asymmetric) — the server signs with the private key,
        anyone can verify with the public key. Use HS256 for monoliths where only one service
        verifies tokens. Use RS256 when multiple services or third parties need to verify tokens
        — they get the public key but never the private key. RS256 is the industry standard for
        OAuth 2.0 / OIDC. Key rotation is also cleaner with RS256 (rotate the keypair, publish
        new JWK).
      </p>

      <h3>Q: Where should you store JWTs on the client and why?</h3>

      <ArticleTable caption="Token storage strategies — security tradeoffs" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>XSS risk</th>
              <th>CSRF risk</th>
              <th>Persistent</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>localStorage</td>
              <td>High — any script can read it</td>
              <td>None — not auto-sent</td>
              <td>Yes</td>
              <td>Never for auth tokens</td>
            </tr>
            <tr>
              <td>sessionStorage</td>
              <td>High — same XSS exposure</td>
              <td>None</td>
              <td>No (tab lifetime)</td>
              <td>Avoid for auth tokens</td>
            </tr>
            <tr>
              <td>Memory (JS var)</td>
              <td>Low — XSS can't persist it</td>
              <td>None</td>
              <td>No (page refresh loses it)</td>
              <td>Good for access token</td>
            </tr>
            <tr>
              <td>HttpOnly cookie</td>
              <td>None — JS cannot read it</td>
              <td>High — auto-sent with requests</td>
              <td>Yes (configurable)</td>
              <td>Good for refresh token + SameSite=Strict</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        <strong>Best practice:</strong> access token in memory (short-lived, 15 min), refresh
        token in HttpOnly + Secure + SameSite=Strict cookie (longer-lived, 7–30 days). On page
        load, call a <code>/auth/refresh</code> endpoint with the cookie to get a new access token.
        SameSite=Strict prevents CSRF because the cookie won't be sent on cross-site requests.
      </p>

      <h3>Q: How do you invalidate a JWT before it expires?</h3>
      <p>
        JWTs are stateless — the server cannot "delete" them. Options:
        (1) <strong>Token blocklist in Redis</strong> — on logout, store the JWT ID (<code>jti</code>
        claim) in Redis with TTL equal to token expiry. Check blocklist on every request.
        (2) <strong>Short expiry + refresh token rotation</strong> — access tokens expire in 15 min,
        so damage window is limited. Invalidate by deleting the refresh token from the DB.
        (3) <strong>Version counter</strong> — store a <code>tokenVersion</code> in the user record.
        Embed the version in the JWT. On logout or password change, increment the counter. Verify
        token version matches DB on every request (reintroduces statefulness).
      </p>

      <h3>Q: What is the <code>alg: none</code> attack on JWTs?</h3>
      <p>
        An attacker crafts a JWT with <code>{'"alg": "none"'}</code> in the header and removes
        the signature. Early JWT libraries accepted this as "unsigned = valid." Prevention: always
        specify accepted algorithms explicitly in your <code>jwt.verify()</code> call —
        never let the library honor the <code>alg</code> from the token itself. Modern libraries
        reject <code>none</code> by default when a secret is provided.
      </p>
      <pre><code>{`// ✗ DANGEROUS — honors alg from token
jwt.verify(token, secret);

// ✓ SAFE — only accepts HS256, ignores alg in header
jwt.verify(token, secret, { algorithms: ["HS256"] });`}</code></pre>

      <h2 id="sessions-cookies-q">Sessions & Cookies</h2>

      <h3>Q: Explain the difference between session auth and JWT auth. When do you choose one?</h3>

      <ArticleTable caption="Session vs JWT — the tradeoffs interviewers expect you to know" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Sessions</th>
              <th>JWT</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>State</td><td>Server-side (Redis/DB)</td><td>Stateless (self-contained)</td></tr>
            <tr><td>Revocation</td><td>Instant — delete session record</td><td>Hard — need blocklist or short TTL</td></tr>
            <tr><td>Scalability</td><td>Needs shared session store (Redis)</td><td>Stateless — any server verifies</td></tr>
            <tr><td>Mobile / Native apps</td><td>Cookie management is complex</td><td>Natural — Bearer header</td></tr>
            <tr><td>Microservices</td><td>All services need session store access</td><td>Services verify independently with public key</td></tr>
            <tr><td>Data freshness</td><td>Always current (DB lookup per request)</td><td>Stale until expiry (claims baked in)</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3>Q: What are CSRF attacks and how do you prevent them?</h3>
      <p>
        Cross-Site Request Forgery: a malicious site tricks an authenticated user's browser into
        making a request to your API (e.g. a form POST to <code>/transfer-funds</code>). The
        browser auto-sends cookies, so the request looks authenticated.
        Prevention: (1) <code>SameSite=Strict</code> cookie attribute — browser won't send the
        cookie on cross-origin requests. This alone prevents most CSRF. (2) CSRF token — server
        issues a random token in a readable cookie or response header; client must echo it back in
        a header (<code>X-CSRF-Token</code>). Since JS on another origin can't read your cookies,
        the attacker can't forge the token. (3) Verify <code>Origin</code> header on state-changing
        requests.
      </p>

      <h3>Q: What does <code>HttpOnly</code> prevent? What does it NOT prevent?</h3>
      <p>
        <strong>Prevents:</strong> JavaScript (<code>document.cookie</code>) reading the cookie —
        XSS attacks cannot steal it. <strong>Does NOT prevent:</strong> CSRF — the browser still
        sends it automatically on same-site requests. Use <code>SameSite</code> to prevent CSRF.
        Does not encrypt the cookie — use <code>Secure</code> to force HTTPS-only transmission.
      </p>

      <h2 id="authz-q">Authorization</h2>

      <h3>Q: What is RBAC? What is ABAC? When do you use each?</h3>
      <p>
        <strong>RBAC (Role-Based Access Control):</strong> permissions are assigned to roles, users
        are assigned roles. Simple, fast — check if <code>user.role</code> is in the allowed set.
        Scales well for coarse-grained access. Limitation: can't express "user can only edit their
        own posts." Use for: admin panels, tiered subscription features.
      </p>
      <p>
        <strong>ABAC (Attribute-Based Access Control):</strong> access decisions based on attributes
        of the subject (user), resource, action, and environment. More expressive: "user can UPDATE
        order IF order.userId === user.id AND order.status === 'pending'." More complex to implement.
        Use for: fine-grained data ownership, multi-tenant SaaS, compliance-heavy systems.
      </p>

      <h3>Q: A user is authenticated but tries to access another user's resource. What do you return and how do you implement the check?</h3>
      <pre><code>{`// Return 403 Forbidden (not 404, unless you're hiding resource existence for security)

// Ownership check pattern:
async function getOrder(req: Request, res: Response) {
  const order = await db.orders.findById(req.params.id);

  if (!order) {
    throw new NotFoundError("Order", req.params.id);
  }

  // Ownership check — 403, not 404 (we confirmed it exists)
  if (order.userId !== req.user.id && req.user.role !== "admin") {
    throw new ForbiddenError("You do not own this order");
  }

  res.json(order);
}

// Security note: returning 404 instead of 403 prevents resource enumeration
// (attacker can't tell if the resource exists). Prefer 404 when exposing
// existence itself is a security concern (private profiles, DMs).`}</code></pre>

      <h2 id="security-q">Security</h2>

      <h3>Q: What is SQL injection? How do you prevent it?</h3>
      <pre><code>{`// Attack: user input is interpolated directly into SQL
const userId = req.params.id; // attacker sends: "1 OR 1=1"
const query = \`SELECT * FROM users WHERE id = \${userId}\`;
// Executes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users!

// Prevention 1: parameterized queries (always)
const { rows } = await pool.query(
  "SELECT * FROM users WHERE id = $1",
  [userId]  // value is escaped by the driver, never interpolated
);

// Prevention 2: ORM (Prisma, TypeORM) — parameterizes automatically
const user = await prisma.user.findUnique({ where: { id: userId } });

// Prevention 3: if you MUST use raw SQL, never interpolate user input
// Use tagged template literals with pg (pg-format, or Prisma's Prisma.sql)
import { Prisma } from "@prisma/client";
const users = await prisma.$queryRaw\`SELECT * FROM users WHERE id = \${userId}\`;`}</code></pre>

      <h3>Q: What does <code>helmet</code> actually do?</h3>
      <pre><code>{`import helmet from "helmet";
app.use(helmet());

// helmet sets/removes these headers on every response:
// Content-Security-Policy      — restricts sources of scripts, styles, etc.
// X-Content-Type-Options: nosniff — prevents MIME type sniffing
// X-Frame-Options: SAMEORIGIN  — prevents clickjacking via iframes
// Strict-Transport-Security    — forces HTTPS (HSTS)
// X-XSS-Protection: 0          — disables outdated XSS filter (modern CSP is better)
// Referrer-Policy              — controls how much referer info is sent
// Cross-Origin-Opener-Policy   — prevents Spectre-style cross-origin attacks
// Removes X-Powered-By: Express — removes fingerprinting

// Most important for APIs: Content-Security-Policy + HSTS + nosniff`}</code></pre>

      <h3>Q: What is a timing attack and how do you prevent it in password comparison?</h3>
      <pre><code>{`// Timing attack: attacker measures response time to infer information
// String comparison short-circuits — "abc" vs "xyz" exits at first char
// Attacker can guess chars one by one based on response time deltas

// ✗ Vulnerable — time varies with how many chars match
if (storedHash === computedHash) { }

// ✓ Safe — crypto.timingSafeEqual compares in constant time regardless of match
import { timingSafeEqual } from "crypto";

const a = Buffer.from(storedHash);
const b = Buffer.from(computedHash);
if (a.length === b.length && timingSafeEqual(a, b)) {
  // authenticated
}

// Better: use bcrypt.compare() — it uses constant-time comparison internally
import bcrypt from "bcrypt";
const valid = await bcrypt.compare(req.body.password, user.hashedPassword);`}</code></pre>

      <h2 id="database-q">Database & ORM</h2>

      <h3>Q: What is the N+1 query problem? Show an example and the fix.</h3>
      <pre><code>{`// N+1: fetching a list, then making one query per item for related data
// Result: 1 query for N users + N queries for their orders = N+1 total

// ✗ N+1 — 101 queries for 100 users
const users = await db.users.findMany();         // 1 query
for (const user of users) {
  user.orders = await db.orders.findByUserId(user.id); // 100 queries
}

// ✓ Fix 1: JOIN / include (ORM eager loading) — 1 or 2 queries
const users = await prisma.user.findMany({
  include: { orders: true }  // Prisma: 1 extra query with WHERE userId IN (...)
});

// ✓ Fix 2: DataLoader (batching) — useful in GraphQL resolvers
import DataLoader from "dataloader";
const orderLoader = new DataLoader(async (userIds: readonly string[]) => {
  const orders = await db.orders.findByUserIds(userIds);
  return userIds.map(id => orders.filter(o => o.userId === id));
});

// Each call is batched into one DB query per tick
const orders = await orderLoader.load(user.id);`}</code></pre>

      <h3>Q: When do you use a database transaction? Show the Prisma pattern.</h3>
      <pre><code>{`// Transactions: when multiple operations must ALL succeed or ALL fail
// Classic example: transfer money between accounts

// ✗ Without transaction — if second update fails, first is committed
await prisma.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
await prisma.account.update({ where: { id: to }, data: { balance: { increment: amount } } });

// ✓ With transaction — atomic: either both succeed or neither does
await prisma.$transaction([
  prisma.account.update({ where: { id: from }, data: { balance: { decrement: amount } } }),
  prisma.account.update({ where: { id: to }, data: { balance: { increment: amount } } }),
]);

// Interactive transaction (when you need results from step 1 in step 2):
await prisma.$transaction(async (tx) => {
  const sender = await tx.account.findUnique({ where: { id: from } });
  if (sender.balance < amount) throw new Error("Insufficient funds");

  await tx.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
  await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
});`}</code></pre>

      <h3>Q: What is a connection pool and how do you tune it?</h3>
      <p>
        A pool maintains N open database connections and reuses them across requests, avoiding
        the TCP handshake + auth cost on every query (typically 10–50ms). Default pool size in
        Prisma is 5 + cpuCount. Rule of thumb: <code>pool_size = (core_count × 2) + effective_spindle_count</code>.
        Too small: requests queue waiting for a connection. Too large: overwhelms the DB with
        concurrent connections (PostgreSQL default max is 100). With clustering (e.g. 4 workers),
        each worker has its own pool — multiply accordingly and stay under DB max.
      </p>

      <h2 id="caching-q">Caching</h2>

      <h3>Q: What is cache-aside? How does it differ from read-through?</h3>
      <p>
        <strong>Cache-aside (lazy loading):</strong> app checks cache first, on miss fetches from
        DB and populates cache. App manages both cache and DB. Most common for Express + Redis.
        <strong>Read-through:</strong> cache sits in front of DB — on miss, the cache itself fetches
        from DB. App only talks to the cache. Read-through caches exist as libraries/services
        (e.g. AWS ElastiCache with DAX for DynamoDB). Cache-aside gives more control; read-through
        simplifies app code.
      </p>

      <h3>Q: What is a cache stampede and how do you prevent it?</h3>
      <p>
        When a cached value expires, multiple concurrent requests all miss and simultaneously
        query the DB, spiking load. Prevention:
        (1) <strong>Mutex/lock</strong> — first requester acquires a Redis lock, others wait and
        then read the freshly-populated cache.
        (2) <strong>Probabilistic early expiration</strong> — randomly refresh the cache slightly
        before expiry.
        (3) <strong>Background refresh</strong> — a cron or worker refreshes the cache before it
        expires (proactive). Good for high-traffic keys with predictable TTL.
      </p>

      <h3>Q: When should you NOT cache?</h3>
      <p>
        (1) User-specific sensitive data — risk of cache key collision serving another user's data.
        (2) Highly mutated data — cache hit rate will be too low to justify the complexity.
        (3) When data consistency is critical — financial balances, inventory counts.
        (4) When the DB query is fast enough (under 5ms) — caching adds latency if Redis call is
        also a network hop.
      </p>

      <h2 id="testing-q">Testing</h2>

      <h3>Q: What is the difference between unit and integration tests for an Express API?</h3>

      <ArticleTable caption="Test types — what each covers and when to use" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>What runs</th>
              <th>DB?</th>
              <th>Speed</th>
              <th>Confidence</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unit</td>
              <td>Single function / service</td>
              <td>Mocked</td>
              <td>Fastest</td>
              <td>Low (isolated)</td>
              <td>Business logic, utilities, validators</td>
            </tr>
            <tr>
              <td>Integration</td>
              <td>Full request through Express</td>
              <td>Real (test DB)</td>
              <td>Slow</td>
              <td>High</td>
              <td>Route handlers, auth, DB interaction</td>
            </tr>
            <tr>
              <td>E2E</td>
              <td>Real client → real server</td>
              <td>Real</td>
              <td>Slowest</td>
              <td>Highest</td>
              <td>Critical user flows</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3>Q: How does <code>supertest</code> work without starting a real HTTP server?</h3>
      <pre><code>{`import request from "supertest";
import { app } from "../app"; // Express app — NOT app.listen()'d

// supertest binds the app to a random ephemeral port internally
// No actual port conflict, no process cleanup needed
const res = await request(app)
  .post("/api/users")
  .set("Authorization", \`Bearer \${token}\`)
  .send({ email: "test@example.com", password: "Password1!" })
  .expect(201);

expect(res.body).toMatchObject({ id: expect.any(String), email: "test@example.com" });

// Key: export app separately from the listen() call
// app.ts: export const app = express(); // configure routes
// server.ts: import { app } from "./app"; app.listen(PORT);
// This lets supertest import app without starting the server`}</code></pre>

      <h2 id="performance-q">Performance & Production</h2>

      <h3>Q: How does graceful shutdown work and why is it important?</h3>
      <p>
        When a container or process receives <code>SIGTERM</code> (Kubernetes, PM2, systemd
        stopping the service), it should: stop accepting new connections, wait for in-flight
        requests to complete, then close DB/Redis connections and exit. Without this, requests
        mid-flight get dropped — 502 errors for users. The load balancer should be configured
        to wait for the drain period (typically 30s).
      </p>

      <h3>Q: Why use <code>pino</code> instead of <code>console.log</code>?</h3>
      <p>
        <code>console.log</code> is synchronous — it blocks the event loop.
        <code>pino</code> writes to a fast asynchronous stream, is 5–10x faster than Winston,
        and outputs structured JSON (log aggregators like CloudWatch, Datadog, Splunk can parse
        and index fields). Structured logs let you query: all errors for user X, P99 latency by
        route, error rate by status code — impossible with unstructured strings.
      </p>

      {/* ─── CODE CHALLENGES ──────────────────────────────────────────────────── */}

      <h2 id="code-challenges">Code Challenges</h2>

      <p>
        These are the type of coding problems that appear in live backend interviews.
        Attempt each one before revealing the solution — that's the only way it actually
        prepares you. Each solution is production-quality TypeScript.
      </p>

      {/* ─── Challenge 1 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-async-handler">1. asyncHandler Wrapper</h3>
      <p>
        <strong>Problem:</strong> Every async route handler needs a try/catch to pass errors to
        Express. That's boilerplate. Implement <code>asyncHandler(fn)</code> — a wrapper that
        catches any rejection from an async route and forwards it to <code>next(err)</code>
        automatically. It must preserve the correct TypeScript types.
      </p>
      <pre><code>{`// Usage:
app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await db.users.findById(req.params.id); // if this throws, Express catches it
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json(user);
}));
// No try/catch in the route. If the async fn throws, Express error middleware gets it.`}</code></pre>

      <SolutionReveal difficulty="easy">
        <pre><code>{`import type { Request, Response, NextFunction, RequestHandler } from "express";

// Overload to preserve correct typing for route handlers
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Wrap in Promise.resolve() to handle both async functions and
    // functions that accidentally return a non-promise
    Promise.resolve(fn(req, res, next)).catch(next);
    // .catch(next) is equivalent to .catch((err) => next(err))
    // This forwards any rejection to Express error middleware
  };
}

// How it works:
// 1. asyncHandler returns a normal (sync) RequestHandler
// 2. That handler calls fn() — the async route
// 3. If fn() rejects, .catch(next) calls next(err)
// 4. Express sees next called with an argument → routes to error middleware

// Usage with typed req:
interface AuthRequest extends Request {
  user: { id: string; role: string };
}

app.get("/me", asyncHandler(async (req: AuthRequest, res) => {
  const profile = await userService.getProfile(req.user.id);
  res.json(profile);
}));`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 2 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-rate-limiter">2. Sliding Window Rate Limiter</h3>
      <p>
        <strong>Problem:</strong> Implement a rate limiter middleware using Redis and a sliding
        window algorithm. It should accept <code>{`{ windowMs, max }`}</code> options. If a
        client exceeds <code>max</code> requests in the window, respond with 429 and a
        <code>Retry-After</code> header. Use the client IP as the key.
      </p>
      <pre><code>{`// Usage:
app.use("/api/auth/login", rateLimiter({ windowMs: 60_000, max: 5 }));
// Max 5 login attempts per minute per IP`}</code></pre>

      <SolutionReveal difficulty="medium">
        <pre><code>{`import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis"; // ioredis client

interface RateLimiterOptions {
  windowMs: number; // window size in milliseconds
  max: number;      // max requests per window
}

export function rateLimiter({ windowMs, max }: RateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = \`rl:\${req.path}:\${ip}\`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Sliding window with Redis sorted set:
    // score = timestamp, member = unique request ID
    const pipeline = redis.pipeline();

    // Remove entries outside the current window
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Add current request (score = now, member = unique id)
    pipeline.zadd(key, now, \`\${now}-\${Math.random()}\`);
    // Count requests in current window
    pipeline.zcard(key);
    // Set TTL so key auto-expires
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    // results[2] is the ZCARD result: [error, count]
    const count = results?.[2]?.[1] as number;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
    res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));

    if (count > max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Try again later.",
      });
      return;
    }

    next();
  };
}

// Why sorted sets?
// - Each request is a member with score = timestamp
// - zremrangebyscore removes stale entries → true sliding window
// - zcard counts only recent entries
// Fixed window alternative (simpler but burstable at window boundary):
// const count = await redis.incr(key);
// if (count === 1) await redis.expire(key, windowMs / 1000);`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 3 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-jwt-middleware">3. JWT Auth Middleware</h3>
      <p>
        <strong>Problem:</strong> Implement an <code>authenticate</code> Express middleware that:
        reads a Bearer token from the <code>Authorization</code> header, verifies it, attaches
        the decoded payload to <code>req.user</code>, and throws 401 for missing or invalid tokens.
        Use TypeScript — extend the Express Request type to include <code>user</code>.
      </p>

      <SolutionReveal difficulty="easy">
        <pre><code>{`import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

interface JwtPayload {
  sub: string;   // userId
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization header",
    });
    return;
  }

  const token = authHeader.slice(7); // remove "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],      // never allow 'none'
      issuer: "api.myapp.com",    // validate iss claim
      audience: "myapp-client",   // validate aud claim
    }) as JwtPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "TOKEN_EXPIRED", message: "Access token has expired" });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "INVALID_TOKEN", message: "Token signature is invalid" });
      return;
    }
    next(err); // unexpected error → 500
  }
}

// Usage:
// app.use("/api", authenticate); // all /api routes require auth
// router.get("/me", authenticate, getProfile); // specific route`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 4 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-require-role">4. requireRole Guard</h3>
      <p>
        <strong>Problem:</strong> Implement <code>requireRole(...roles)</code> — a middleware
        factory that checks the authenticated user has one of the allowed roles. Must come after
        <code>authenticate</code>. Return 403 if the role doesn't match, 401 if there's no user
        (auth middleware wasn't run). Support multiple allowed roles.
      </p>
      <pre><code>{`// Usage:
router.delete("/users/:id", authenticate, requireRole("admin"), deleteUser);
router.post("/articles", authenticate, requireRole("admin", "editor"), createArticle);`}</code></pre>

      <SolutionReveal difficulty="easy">
        <pre><code>{`import type { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Guard: authenticate must run first
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: \`Role '\${userRole}' is not allowed. Required: \${allowedRoles.join(" | ")}\`,
      });
      return;
    }

    next();
  };
}

// Composing multiple guards:
const adminOnly = requireRole("admin");
const editorsAndAbove = requireRole("admin", "editor");
const anyAuthenticated = requireRole("admin", "editor", "viewer");

// Resource ownership check — combine with role guard:
export function requireOwnership(getResourceUserId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    // Admins bypass ownership check
    if (req.user.role === "admin") {
      next();
      return;
    }

    const resourceUserId = await getResourceUserId(req);

    if (resourceUserId === null) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (resourceUserId !== req.user.sub) {
      res.status(403).json({ error: "FORBIDDEN", message: "You do not own this resource" });
      return;
    }

    next();
  };
}

// Usage:
router.patch(
  "/orders/:id",
  authenticate,
  requireOwnership(async (req) => {
    const order = await db.orders.findById(req.params.id);
    return order?.userId ?? null;
  }),
  updateOrder,
);`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 5 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-error-handler">5. Global Error Handler</h3>
      <p>
        <strong>Problem:</strong> Implement a typed global error handler middleware for Express.
        It must: handle a custom <code>AppError</code> hierarchy and use their status codes, never
        expose stack traces in production, log unexpected errors, and always return a consistent
        JSON structure.
      </p>

      <SolutionReveal difficulty="medium">
        <pre><code>{`import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger"; // pino instance

// ─── Error hierarchy ──────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Required so instanceof works correctly after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: Record<string, string[]>) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, "NOT_FOUND", id ? \`\${resource} '\${id}' not found\` : \`\${resource} not found\`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

// ─── Global error handler ─────────────────────────────────────────────────

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction, // must declare even if unused — 4-param signature required
): void {
  const requestId = req.headers["x-request-id"] as string | undefined;
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof AppError) {
    // Known, intentional errors — log at warn level
    logger.warn({ err, requestId, path: req.path }, "AppError");

    const body: ErrorResponse = {
      error: err.code,
      message: err.message,
      ...(requestId && { requestId }),
    };

    if (err.details !== undefined) {
      body.details = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown errors — log at error level with full context
  logger.error(
    { err, requestId, path: req.path, method: req.method },
    "Unhandled error",
  );

  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: isProd
      ? "An unexpected error occurred"
      : (err instanceof Error ? err.message : String(err)),
    ...(requestId && { requestId }),
    // Never send stack trace in production
    ...(!isProd && err instanceof Error && { stack: err.stack }),
  });
}

// Register LAST, after all routes:
// app.use(globalErrorHandler);`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 6 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-cache-aside">6. Cache-Aside with Redis</h3>
      <p>
        <strong>Problem:</strong> Implement a generic <code>cacheAside&lt;T&gt;(key, ttlSeconds, fn)</code>
        utility that checks Redis for a cached value, returns it on hit, or calls <code>fn()</code>
        on a miss and stores the result. Must handle JSON serialization. Include a{" "}
        <code>invalidate(key)</code> helper.
      </p>

      <SolutionReveal difficulty="medium">
        <pre><code>{`import { redis } from "../lib/redis";

export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  // 1. Check cache
  const cached = await redis.get(key);

  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  // 2. Cache miss — fetch from source
  const value = await fn();

  // 3. Store in cache (fire-and-forget is fine — don't await to avoid blocking)
  redis.setex(key, ttlSeconds, JSON.stringify(value)).catch((err) => {
    console.error("Cache write failed:", err); // non-fatal
  });

  return value;
}

export async function invalidate(key: string): Promise<void> {
  await redis.del(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  // Scan instead of KEYS to avoid blocking Redis on large keyspaces
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

// Usage:
async function getUserById(id: string): Promise<User> {
  return cacheAside(
    \`user:\${id}\`,
    300, // 5 minutes TTL
    () => prisma.user.findUniqueOrThrow({ where: { id } }),
  );
}

// On update — invalidate the cache:
async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
  const updated = await prisma.user.update({ where: { id }, data });
  await invalidate(\`user:\${id}\`);
  return updated;
}

// Cache stampede prevention with lock:
export async function cacheAsideWithLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached) as T;

  const lockKey = \`lock:\${key}\`;
  const lockTtl = 10; // 10 second lock timeout

  // Try to acquire lock (NX = only set if not exists)
  const acquired = await redis.set(lockKey, "1", "EX", lockTtl, "NX");

  if (acquired === "OK") {
    try {
      const value = await fn();
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Another process is fetching — poll briefly then read
  await new Promise((resolve) => setTimeout(resolve, 50));
  const afterWait = await redis.get(key);
  if (afterWait !== null) return JSON.parse(afterWait) as T;

  // Fallback: fetch directly if lock expired before value was set
  return fn();
}`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 7 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-validate">7. Zod Validation Middleware Factory</h3>
      <p>
        <strong>Problem:</strong> Implement a <code>validate(schema)</code> middleware factory
        using Zod. It should validate <code>req.body</code> against the schema, replace{" "}
        <code>req.body</code> with the parsed (type-safe) data on success, and return 400 with
        field-level error details on failure.
      </p>

      <SolutionReveal difficulty="easy">
        <pre><code>{`import { z, ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors into { field: [messages] } shape
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }

      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Request body is invalid",
        details: fieldErrors,
      });
      return;
    }

    // Replace req.body with the parsed, coerced, type-safe value
    req.body = result.data;
    next();
  };
}

// You can also validate query params or path params:
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: "INVALID_QUERY", details: result.error.flatten() });
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

// Usage:
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;

router.post(
  "/users",
  authenticate,
  requireRole("admin"),
  validate(CreateUserSchema),
  asyncHandler(async (req, res) => {
    // req.body is typed as CreateUserDto here (after validation)
    const user = await userService.create(req.body as CreateUserDto);
    res.status(201).json(user);
  }),
);`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 8 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-cursor-pagination">8. Cursor-Based Pagination</h3>
      <p>
        <strong>Problem:</strong> Implement cursor-based pagination for a <code>GET /users</code>
        endpoint. It should accept <code>?cursor=&lt;encoded&gt;</code> and <code>?limit=&lt;number&gt;</code>
        query params and return <code>{`{ data, nextCursor, hasMore }`}</code>. The cursor must be
        opaque (base64 encoded) and encode the last item's ID. Explain why cursor pagination is
        better than offset for large datasets.
      </p>

      <SolutionReveal difficulty="medium">
        <pre><code>{`// Why cursor > offset:
// Offset: SELECT * LIMIT 20 OFFSET 1000 — DB scans 1020 rows, discards 1000
// Cursor: SELECT * WHERE id > lastId LIMIT 20 — uses index, O(1) regardless of page

// ─── Cursor utilities ────────────────────────────────────────────────────

interface CursorData {
  id: string;
  // Add more fields if sorting by something other than id
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorData;
  } catch {
    return null;
  }
}

// ─── Pagination query builder ─────────────────────────────────────────────

interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getPaginatedUsers(
  options: PaginationOptions,
): Promise<PaginatedResult<User>> {
  const limit = Math.min(options.limit ?? 20, 100); // cap at 100
  const cursorData = options.cursor ? decodeCursor(options.cursor) : null;

  // Fetch limit + 1 to detect if there's a next page without a separate COUNT query
  const users = await prisma.user.findMany({
    where: cursorData
      ? { id: { gt: cursorData.id } }  // cursor filter
      : undefined,
    orderBy: { id: "asc" },            // must match cursor field
    take: limit + 1,                   // one extra to detect hasMore
  });

  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, limit) : users;
  const lastItem = data[data.length - 1];

  return {
    data,
    hasMore,
    nextCursor: hasMore && lastItem ? encodeCursor({ id: lastItem.id }) : null,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  "/users",
  authenticate,
  validateQuery(PaginationQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await getPaginatedUsers({
      cursor: req.query.cursor as string | undefined,
      limit: Number(req.query.limit),
    });
    res.json(result);
  }),
);

// Response shape:
// {
//   "data": [...20 users...],
//   "hasMore": true,
//   "nextCursor": "eyJpZCI6InVzZXItMTIzIn0"
// }
// Client: if hasMore, fetch /users?cursor=eyJpZCI6InVzZXItMTIzIn0&limit=20`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 9 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-graceful-shutdown">9. Graceful Shutdown</h3>
      <p>
        <strong>Problem:</strong> Implement graceful shutdown for an Express server. On{" "}
        <code>SIGTERM</code> or <code>SIGINT</code>, it should: stop accepting new connections,
        wait for in-flight requests to finish (with a forced timeout), then close DB and Redis
        connections and exit cleanly. In-flight requests must complete successfully.
      </p>

      <SolutionReveal difficulty="medium">
        <pre><code>{`import http from "http";
import { app } from "./app";         // Express app
import { prisma } from "./lib/db";   // Prisma client
import { redis } from "./lib/redis"; // ioredis client
import { logger } from "./lib/logger";

const PORT = process.env.PORT ?? 3000;
const SHUTDOWN_TIMEOUT_MS = 30_000; // 30 seconds max for in-flight requests

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Server started");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received — starting graceful shutdown");

  // 1. Stop accepting new connections
  // server.close() prevents new connections but waits for existing ones
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        logger.error({ err }, "Error closing server");
        reject(err);
        return;
      }
      logger.info("HTTP server closed — no new connections accepted");
      resolve();
    });

    // 2. Force shutdown after timeout — don't wait forever
    setTimeout(() => {
      logger.warn("Shutdown timeout reached — forcing close");
      resolve(); // proceed anyway
    }, SHUTDOWN_TIMEOUT_MS);
  });

  // 3. Close infrastructure connections
  try {
    await Promise.allSettled([
      prisma.$disconnect().then(() => logger.info("Prisma disconnected")),
      redis.quit().then(() => logger.info("Redis disconnected")),
    ]);
  } catch (err) {
    logger.error({ err }, "Error during infrastructure cleanup");
  }

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

// Register signal handlers — run shutdown once only
let isShuttingDown = false;

function handleSignal(signal: string) {
  return () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    shutdown(signal).catch((err) => {
      logger.error({ err }, "Shutdown failed");
      process.exit(1);
    });
  };
}

process.on("SIGTERM", handleSignal("SIGTERM")); // Kubernetes, systemd, PM2
process.on("SIGINT", handleSignal("SIGINT"));   // Ctrl+C

// Health check endpoint — important for load balancers
// Return 503 during shutdown so LB stops routing to this instance
app.get("/health", (_req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: "shutting_down" });
    return;
  }
  res.json({ status: "ok", uptime: process.uptime() });
});`}</code></pre>
      </SolutionReveal>

      {/* ─── Challenge 10 ─────────────────────────────────────────────────────── */}
      <h3 id="challenge-retry">10. Retry with Exponential Backoff</h3>
      <p>
        <strong>Problem:</strong> Implement <code>withRetry(fn, options)</code> for retrying
        failed external API calls. Requirements: exponential backoff with jitter, configurable max
        attempts, only retry transient errors (5xx, network errors) — not client errors (4xx),
        and support an optional <code>onRetry</code> callback for logging.
      </p>

      <SolutionReveal difficulty="hard">
        <pre><code>{`interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;      // default: 100ms
  maxDelayMs?: number;       // default: 30_000ms
  onRetry?: (attempt: number, error: unknown) => void;
}

class ClientError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

function isTransientError(err: unknown): boolean {
  // Network errors (no response)
  if (err instanceof TypeError && err.message.includes("fetch")) return true;

  // Our ClientError (4xx) — do NOT retry
  if (err instanceof ClientError) return false;

  // HTTP errors with status codes
  if (err instanceof Error && "statusCode" in err) {
    const status = (err as { statusCode: number }).statusCode;
    return status >= 500; // retry 5xx, not 4xx
  }

  // Axios error shape:
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { status?: number } }).response?.status === "number"
  ) {
    const status = (err as { response: { status: number } }).response.status;
    return status >= 500;
  }

  return true; // unknown errors — assume transient
}

function computeDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: base * 2^attempt
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  // Add jitter (±25%) to prevent synchronized retries (thundering herd)
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.min(exponential + jitter, maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs = 100,
    maxDelayMs = 30_000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Never retry client errors (4xx)
      if (!isTransientError(err)) {
        throw err;
      }

      // Last attempt — don't delay, just throw
      if (attempt === maxAttempts) {
        break;
      }

      onRetry?.(attempt, err);

      const delay = computeDelay(attempt, baseDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage — calling an external payment API:
const charge = await withRetry(
  () => paymentGateway.charge({ amount, currency, token }),
  {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 5_000,
    onRetry: (attempt, err) => {
      logger.warn({ attempt, err }, "Payment API call failed, retrying");
    },
  },
);

// Usage — with fetch:
async function fetchWithRetry(url: string): Promise<unknown> {
  return withRetry(
    async () => {
      const res = await fetch(url);
      if (res.status >= 400 && res.status < 500) {
        throw new ClientError(res.status, \`Client error: \${res.status}\`);
      }
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res.json();
    },
    { maxAttempts: 4, baseDelayMs: 150 },
  );
}`}</code></pre>
      </SolutionReveal>
    </div>
  );
}
