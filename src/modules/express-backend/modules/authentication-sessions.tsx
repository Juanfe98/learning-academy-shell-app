import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const sessionLifecycleDiagram = String.raw`sequenceDiagram
    actor B as Browser
    participant S as Express Server
    participant R as Redis
    participant DB as Database

    Note over B,DB: Login
    B->>S: POST /auth/login { email, password }
    S->>DB: SELECT user WHERE email = ?
    DB-->>S: user { id, email, passwordHash }
    S->>S: bcrypt.compare(password, hash) — OK
    S->>S: req.session.regenerate() — new session ID (prevent fixation)
    S->>S: req.session.userId = user.id
    S->>R: SETEX session:sid { userId } 86400
    R-->>S: OK
    S-->>B: 200 { user }\nSet-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Strict

    Note over B,DB: Authenticated Request
    B->>S: GET /api/profile\nCookie: sid=abc123
    S->>R: GET session:abc123
    R-->>S: { userId: "usr_01H..." }
    S->>DB: SELECT user WHERE id = userId
    DB-->>S: user data
    S-->>B: 200 { data: profile }

    Note over B,S: Logout
    B->>S: POST /auth/logout\nCookie: sid=abc123
    S->>S: req.session.destroy()
    S->>R: DEL session:abc123
    S-->>B: 204\nSet-Cookie: sid=; Max-Age=0`;

const csrfFlowDiagram = String.raw`sequenceDiagram
    actor A as Attacker Site
    actor V as Victim Browser
    participant S as Your Server

    Note over A,S: CSRF Attack (without protection)
    V->>A: Visits attacker.com
    A->>V: Returns page with hidden form\nPOST your-bank.com/transfer { to: attacker, amount: 1000 }
    V->>S: POST /transfer { to: attacker, amount: 1000 }\nCookie: session=abc (automatically sent!)
    S->>S: Valid session cookie — processes transfer!

    Note over A,S: With SameSite=Strict (modern defense)
    V->>A: Visits attacker.com
    A->>V: Returns page with form targeting your server
    V->>S: POST /transfer — Cookie NOT sent (cross-site request + SameSite=Strict)
    S-->>V: 401 No session`;

export const toc: TocItem[] = [
  { id: "session-model", title: "Session Authentication Model", level: 2 },
  { id: "session-lifecycle", title: "Session Lifecycle", level: 2 },
  { id: "cookie-attributes", title: "Cookie Attributes", level: 2 },
  { id: "csrf", title: "CSRF Attacks and Prevention", level: 2 },
  { id: "express-session-setup", title: "express-session with Redis", level: 2 },
  { id: "session-fixation", title: "Session Fixation Attack", level: 2 },
  { id: "session-vs-jwt", title: "Sessions vs JWT", level: 2 },
];

export default function AuthenticationSessions() {
  return (
    <div className="article-content">
      <p>
        Sessions are the original web authentication mechanism. Instead of embedding identity in
        the token itself (JWT approach), the server stores session data externally and sends the
        client an opaque session ID. Every request carries that ID in a cookie, and the server
        looks up the session to identify the user. This centralized state is both session
        auth&apos;s limitation (requires a shared store for multi-instance deployments) and its
        most powerful feature: sessions can be invalidated instantly.
      </p>

      <h2 id="session-model">Session Authentication Model</h2>
      <pre><code>{`// Conceptually, a session store is just a key-value map
// Key: random session ID (opaque to the client)
// Value: arbitrary session data (userId, cart, preferences, etc.)

// Session ID lifecycle:
// 1. Client sends no session cookie → server creates new session + sends Set-Cookie
// 2. Client sends session cookie → server looks up session → loads data
// 3. Session expires or is destroyed → cookie becomes invalid

// Why the session ID is opaque:
// It's a random 128-bit token — no information about the user embedded
// Even if stolen, attacker can only act within the session lifetime
// Rotate it on privilege escalation to prevent fixation attacks

// Redis as session store
// In-memory session store (built-in): works but breaks with multiple servers
//   → All requests must go to the same server (sticky sessions) OR
//   → Sessions are lost on server restart
// Redis session store: shared across all instances, survives restarts
//   → Required for any horizontally scaled deployment`}</code></pre>

      <h2 id="session-lifecycle">Session Lifecycle</h2>
      <MermaidDiagram
        chart={sessionLifecycleDiagram}
        title="Session Authentication Lifecycle with Redis"
        caption="The session ID in the cookie is an opaque pointer to session data stored in Redis. Logout destroys the server-side data, immediately invalidating the session regardless of the cookie's Max-Age."
        minHeight={560}
      />

      <h2 id="cookie-attributes">Cookie Attributes</h2>
      <p>
        Cookie security is almost entirely controlled by attributes in the <code>Set-Cookie</code>
        header. Getting these wrong is a session security vulnerability.
      </p>
      <pre><code>{`// Full secure cookie configuration
res.cookie("sessionId", sessionId, {
  // Security attributes
  httpOnly: true,       // JavaScript cannot access — prevents XSS token theft
  secure: true,         // Only sent over HTTPS — never send session cookies over HTTP
  sameSite: "strict",   // Only sent for same-site requests — prevents CSRF
                        // Options: "strict" | "lax" | "none"

  // Lifetime attributes
  maxAge: 24 * 60 * 60 * 1000,  // 24 hours in ms — after which cookie is deleted
  // expires: new Date(Date.now() + ...) — same as maxAge but as absolute date
  // Without maxAge/expires → session cookie (deleted when browser closes)

  // Scope attributes
  domain: "example.com",  // Sent to example.com AND all subdomains
                           // Omit to limit to exact host only (more secure)
  path: "/",               // Only sent with requests to paths starting with /
                           // Use "/auth" to limit refresh token cookie to auth routes
});

// SameSite values explained:
// "strict": Cookie not sent for any cross-site request (navigation OR fetch)
//           Best security, but breaks OAuth redirects (user arrives with no session)
// "lax":    Cookie sent for cross-site top-level navigation (link clicks) but not fetches
//           Default in modern browsers when SameSite not specified
//           Good balance — use for session cookies on regular web apps
// "none":   Cookie always sent cross-site. REQUIRES secure: true
//           Use for third-party widgets, cross-site API calls (rare)

// Signed cookies — detect tampering
// cookieParser(secret) signs cookies with HMAC
// Stored as s:value.signature in cookie
// req.signedCookies[name] — undefined if signature invalid
import cookieParser from "cookie-parser";
app.use(cookieParser(process.env.COOKIE_SECRET));

res.cookie("pref", "darkMode", { signed: true });
// Later:
const pref = req.signedCookies.pref; // "darkMode" or false if tampered`}</code></pre>

      <h2 id="csrf">CSRF Attacks and Prevention</h2>
      <MermaidDiagram
        chart={csrfFlowDiagram}
        title="CSRF Attack and SameSite Defense"
        caption="Cross-Site Request Forgery exploits the fact that browsers automatically send cookies with requests, including those initiated by malicious pages. SameSite=Strict prevents the session cookie from being sent on cross-site requests, neutralizing the attack."
        minHeight={400}
      />
      <pre><code>{`// CSRF defense strategies — use at least one

// 1. SameSite=Strict (primary modern defense)
// Set on session cookie — browser won't send it for cross-site requests
// Limitation: breaks login redirects from third-party sites (OAuth returns to your site
// but the return request is cross-site, so session cookie is not sent)
// Solution: use SameSite=Lax for login-redirect flows

// 2. SameSite=Lax + CSRF token (belt and suspenders)
// For actions that change state (POST, PUT, DELETE, PATCH)
// Generate a CSRF token at login, store it in the session
// Client reads it from a non-HttpOnly cookie or meta tag
// Client sends it in a custom header (e.g., X-CSRF-Token)
// Server validates it matches the session's token

import crypto from "crypto";

// On login, generate CSRF token and store in session
req.session.csrfToken = crypto.randomBytes(32).toString("hex");

// Also set it in a readable cookie (NOT HttpOnly — client needs to read it)
res.cookie("csrf", req.session.csrfToken, {
  httpOnly: false,  // client reads this to send in header
  secure: true,
  sameSite: "strict",
});

// CSRF validation middleware for state-changing routes
function validateCsrf(req: Request, res: Response, next: NextFunction) {
  const methods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!methods.includes(req.method)) return next();

  const headerToken = req.headers["x-csrf-token"];
  const sessionToken = req.session?.csrfToken;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    res.status(403).json({ error: "CSRF validation failed" });
    return;
  }
  next();
}

// 3. Double-submit cookie pattern
// No server-side state — sign the CSRF token instead
// Useful when you can't use express-session (stateless architecture)`}</code></pre>

      <h2 id="express-session-setup">express-session with Redis</h2>
      <pre><code>{`import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

// Set up Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000), // backoff
  },
});
await redisClient.connect();

// Configure express-session with Redis store
app.use(session({
  store: new RedisStore({ client: redisClient, prefix: "sess:" }),
  secret: process.env.SESSION_SECRET!, // used to sign session ID cookie
  name: "sid",          // cookie name (don't use default "connect.sid" — reveals Express)
  resave: false,        // don't save session if unmodified (better performance)
  saveUninitialized: false, // don't create session until something stored (GDPR friendly)
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// TypeScript: extend session data type
declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
    csrfToken: string;
  }
}

// Login handler
app.post("/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Regenerate session ID after successful login (session fixation prevention)
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({ user: { id: user.id, email: user.email, role: user.role } });
}));

// Session auth middleware
async function sessionAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    throw new UnauthorizedError("Login required");
  }
  req.user = { id: req.session.userId, role: req.session.role };
  next();
}

// Logout
app.post("/auth/logout", asyncHandler(async (req, res) => {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
  res.clearCookie("sid");
  res.sendStatus(204);
}));`}</code></pre>

      <h2 id="session-fixation">Session Fixation Attack</h2>
      <pre><code>{`// Session fixation: attacker tricks victim into using a known session ID
// 1. Attacker visits site, gets a session ID: sid=attacker-known-id
// 2. Attacker sends victim a URL with that session ID embedded
// 3. Victim logs in using that session ID
// 4. Attacker now has an authenticated session with the victim's identity

// Prevention: ALWAYS call req.session.regenerate() after successful login
// This creates a NEW session ID — the old (pre-login) one is invalidated

// WRONG — session ID is the same before and after login
app.post("/auth/login", async (req, res) => {
  // ...verify password...
  req.session.userId = user.id; // ✗ attacker knows this session ID
  res.json({ ok: true });
});

// CORRECT — generate new session ID after authentication
app.post("/auth/login", async (req, res) => {
  // ...verify password...

  // regenerate() creates a new session, copies data from old session
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => err ? reject(err) : resolve());
  });

  // NOW set user data on the new session
  req.session.userId = user.id; // ✓ new session ID, attacker's link is dead
  res.json({ ok: true });
});

// Also regenerate on privilege escalation
// e.g., user logs into admin panel from a regular session
app.post("/auth/elevate", sessionAuth, async (req, res) => {
  // verify admin password or 2FA
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => err ? reject(err) : resolve());
  });
  req.session.userId = req.user!.id;
  req.session.role = "admin";
  res.json({ ok: true });
});`}</code></pre>

      <h2 id="session-vs-jwt">Sessions vs JWT</h2>
      <ArticleTable caption="Sessions vs JWT — choose based on your deployment model and revocation requirements" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Server-Side Sessions</th>
              <th>JWT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>State</td>
              <td>Stateful — session data in Redis</td>
              <td>Stateless — all data in token</td>
            </tr>
            <tr>
              <td>Revocation</td>
              <td>Immediate — delete session from Redis</td>
              <td>Wait for expiry (or add Redis blacklist, defeating statelessness)</td>
            </tr>
            <tr>
              <td>Scalability</td>
              <td>Requires shared Redis — ops overhead</td>
              <td>Any server can verify — naturally horizontal</td>
            </tr>
            <tr>
              <td>Mobile apps</td>
              <td>Cookie handling is complex on mobile</td>
              <td>Bearer token in header — simple on mobile</td>
            </tr>
            <tr>
              <td>Microservices</td>
              <td>All services need access to Redis</td>
              <td>Each service verifies independently with public key</td>
            </tr>
            <tr>
              <td>Data freshness</td>
              <td>Always fresh — load from DB each request</td>
              <td>Stale until token expires (role changes don&apos;t propagate immediately)</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Traditional web apps, admin panels, any app needing instant revocation</td>
              <td>REST APIs, microservices, mobile backends, third-party OAuth</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
    </div>
  );
}
