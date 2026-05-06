import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const attackSurfaceDiagram = String.raw`flowchart TD
    INTERNET["Internet / Clients"]
    INTERNET --> RL["Rate Limiter\nexpress-rate-limit"]
    RL --> CORS["CORS\nAccess-Control headers"]
    CORS --> HELMET["Helmet\nSecurity headers"]
    HELMET --> AUTH["Authentication\nJWT / Session middleware"]
    AUTH --> VALID["Input Validation\nZod schema"]
    VALID --> BL["Business Logic"]
    BL --> DB["Database\nParameterized queries"]
    DB --> RES["Response\nSanitized output"]

    RL -->|"429"| BLOCK1["Block excessive requests"]
    CORS -->|"403"| BLOCK2["Block unauthorized origins"]
    AUTH -->|"401"| BLOCK3["Block unauthenticated"]
    VALID -->|"400"| BLOCK4["Block malformed input"]`;

export const toc: TocItem[] = [
  { id: "attack-surface", title: "Express Attack Surface", level: 2 },
  { id: "helmet", title: "helmet — Security Headers", level: 2 },
  { id: "cors", title: "CORS", level: 2 },
  { id: "rate-limiting", title: "Rate Limiting", level: 2 },
  { id: "sql-injection", title: "SQL Injection & NoSQL Injection", level: 2 },
  { id: "owasp-top10", title: "OWASP Top 10 for Express", level: 2 },
  { id: "env-secrets", title: "Environment Variables & Secrets", level: 2 },
  { id: "dependency-security", title: "Dependency Security", level: 2 },
  { id: "https-hsts", title: "HTTPS & HSTS", level: 2 },
  { id: "error-leakage", title: "Error Message Leakage", level: 2 },
];

export default function SecurityBestPractices() {
  return (
    <div className="article-content">
      <p>
        Security is not a feature you add at the end. Every layer of an Express app has its own
        attack vectors, and defending them requires understanding each one. This module goes through
        the concrete vulnerabilities in Express backends and the specific mitigations — not generic
        advice, but code you can deploy.
      </p>

      <h2 id="attack-surface">Express Attack Surface</h2>
      <MermaidDiagram
        chart={attackSurfaceDiagram}
        title="Defense-in-Depth for an Express Application"
        caption="Each middleware layer represents a defense. Rate limiting stops brute force and DDoS. CORS prevents unauthorized browser origins. Helmet sets secure defaults. Auth middleware rejects unauthenticated access. Input validation stops malformed and malicious payloads before they reach business logic."
        minHeight={440}
      />

      <h2 id="helmet">helmet — Security Headers</h2>
      <pre><code>{`import helmet from "helmet";

// helmet() sets ~15 security headers with sensible defaults
app.use(helmet());

// What each header does:
// Content-Security-Policy: restricts sources for scripts, styles, images
//   Prevents XSS by blocking inline scripts and unknown script sources
//   Default: restrictive policy — configure for your specific needs

// X-Frame-Options: DENY
//   Prevents your site from being embedded in iframes (clickjacking)

// X-Content-Type-Options: nosniff
//   Prevents browser from MIME-sniffing response content type
//   Stops content-type confusion attacks

// Referrer-Policy: no-referrer
//   Controls how much referrer info is sent with requests
//   Prevents leaking private URLs

// Strict-Transport-Security: max-age=15552000; includeSubDomains
//   Forces HTTPS for 6 months — browser refuses HTTP connections

// X-DNS-Prefetch-Control: off
//   Prevents DNS prefetching that can leak site information

// Configuring specific headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.example.com"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.example.com"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true, // submit to browser preload list
    },
  })
);`}</code></pre>

      <h2 id="cors">CORS</h2>
      <pre><code>{`import cors from "cors";

// CORS — Cross-Origin Resource Sharing
// Same-origin policy: browsers block JS from reading responses from different origins
// CORS allows servers to explicitly permit specific origins

// Permissive (development only — never in production)
app.use(cors()); // ✗ allows ALL origins

// Configured CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true); // allow
    } else {
      callback(new Error(\`CORS: origin '\${origin}' not allowed\`)); // block
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  credentials: true,  // allow cookies (required for session auth from browser)
  maxAge: 86400,      // preflight cache duration (seconds)
}));

// CORS preflight — browsers send OPTIONS before POST/PUT/DELETE with custom headers
// Express cors() handles this automatically
// Manual preflight handler (if not using cors package):
app.options("*", cors()); // handle all OPTIONS requests

// What is NOT CORS-protected:
// - Server-to-server requests (no browser, no same-origin policy)
// - Mobile app HTTP requests (no same-origin policy)
// CORS is a browser mechanism — it does not protect your API from direct HTTP clients

// Safe vs. unsafe headers (simple requests don't trigger preflight)
// Safe methods: GET, HEAD, POST
// Safe headers: Accept, Accept-Language, Content-Language, Content-Type (limited)
// Everything else triggers a preflight OPTIONS request`}</code></pre>

      <h2 id="rate-limiting">Rate Limiting</h2>
      <pre><code>{`import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

// Basic in-memory rate limit (single server only)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per IP per window
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,     // Return rate limit info in Retry-After header
  legacyHeaders: false,
});

app.use("/api", limiter);

// Redis-backed rate limit (multi-instance, persistent across restarts)
const limiterWithRedis = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
});

// Strict limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,          // only 10 login attempts per 15 min per IP
  skipSuccessfulRequests: true, // only count failed attempts
  message: { error: "Too many login attempts" },
});

app.post("/auth/login", authLimiter, loginHandler);
app.post("/auth/register", authLimiter, registerHandler);

// Per-user rate limiting (after authentication)
function perUserRateLimit(max: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id ?? req.ip ?? "anonymous";
    const now = Date.now();
    const record = store.get(key);

    if (!record || record.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    record.count++;
    next();
  };
}

app.get("/api/expensive-operation", authenticate, perUserRateLimit(5, 60_000), handler);`}</code></pre>

      <h2 id="sql-injection">SQL Injection & NoSQL Injection</h2>
      <pre><code>{`// SQL Injection — attacker injects SQL syntax through user input
// VULNERABLE
const userId = req.query.id; // attacker sends: "1 OR 1=1"
const users = await pool.query(
  \`SELECT * FROM users WHERE id = \${userId}\` // ✗ string interpolation!
);
// Query becomes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users instead of one

// SAFE — parameterized queries (also called prepared statements)
const { rows } = await pool.query(
  "SELECT * FROM users WHERE id = $1", // $1 is a parameter placeholder
  [req.query.id] // user input is treated as DATA, never as SQL syntax
);

// With Prisma — always parameterized automatically
const user = await prisma.user.findUnique({
  where: { id: req.query.id as string }, // ✓ Prisma parameterizes this
});

// Raw query in Prisma — use tagged template literal (sql-tagged)
import { Prisma } from "@prisma/client";
const searchTerm = req.query.q as string;
const users = await prisma.$queryRaw(
  Prisma.sql\`SELECT * FROM users WHERE name ILIKE \${\`%\${searchTerm}%\`}\`
);
// Prisma.sql ensures the value is parameterized even in raw queries

// NoSQL Injection — MongoDB-specific
// VULNERABLE — attacker sends { "$gt": "" } as password
const { username, password } = req.body;
const user = await db.users.findOne({ username, password }); // ✗
// If password = { "$gt": "" }, query becomes: WHERE username='alice' AND password > ''
// Bypasses password check!

// SAFE — validate input types, reject operator objects
import { z } from "zod";
const LoginSchema = z.object({
  username: z.string(),  // enforces string — rejects { "$gt": "" }
  password: z.string(),
});
// After zod validation, username and password are guaranteed strings`}</code></pre>

      <h2 id="owasp-top10">OWASP Top 10 for Express</h2>
      <ArticleTable caption="OWASP Top 10 vulnerabilities relevant to Express backends — what they are and how to mitigate" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Vulnerability</th>
              <th>What It Is</th>
              <th>Express Mitigation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Broken Access Control</td>
              <td>User accesses resources or actions they shouldn&apos;t be permitted</td>
              <td>requireRole middleware, resource ownership checks, test all endpoints</td>
            </tr>
            <tr>
              <td>Cryptographic Failures</td>
              <td>Sensitive data transmitted or stored without proper encryption</td>
              <td>HTTPS always, bcrypt for passwords, never store plaintext secrets</td>
            </tr>
            <tr>
              <td>Injection</td>
              <td>Attacker-controlled data executed as code or command</td>
              <td>Parameterized queries, Zod validation, never use eval()</td>
            </tr>
            <tr>
              <td>Insecure Design</td>
              <td>Architectural flaws — rate limits missing, auth gaps</td>
              <td>Threat model early, add rate limiting, enforce auth on all endpoints</td>
            </tr>
            <tr>
              <td>Security Misconfiguration</td>
              <td>Default credentials, debug endpoints in prod, verbose errors</td>
              <td>helmet(), remove debug routes, suppress stack traces in prod</td>
            </tr>
            <tr>
              <td>Vulnerable Components</td>
              <td>Outdated npm packages with known CVEs</td>
              <td>npm audit, Snyk, Dependabot, lock files (package-lock.json)</td>
            </tr>
            <tr>
              <td>Auth Failures</td>
              <td>Weak passwords, no brute-force protection, insecure session management</td>
              <td>Rate limit login, bcrypt min cost 12, session fixation prevention</td>
            </tr>
            <tr>
              <td>Software Integrity Failures</td>
              <td>Unverified dependencies, insecure CI/CD pipelines</td>
              <td>npm ci (respects lock file), signed commits, verified pipeline steps</td>
            </tr>
            <tr>
              <td>Security Logging Failures</td>
              <td>No audit log of security events, no alerting on failures</td>
              <td>Log auth failures, rate limit hits, and permission denials with pino</td>
            </tr>
            <tr>
              <td>SSRF</td>
              <td>App fetches URLs specified by user — attacker points to internal services</td>
              <td>Validate and allowlist URLs, block private IP ranges in HTTP clients</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="env-secrets">Environment Variables & Secrets</h2>
      <pre><code>{`// Never commit secrets to git — use environment variables
// .env file for local development (add to .gitignore)
DATABASE_URL=postgresql://user:pass@localhost/mydb
JWT_PRIVATE_KEY_PATH=./keys/private.pem
REDIS_URL=redis://localhost:6379
SESSION_SECRET=very-long-random-string-minimum-32-chars

// Load with dotenv in development only
import "dotenv/config"; // loads .env into process.env

// Validate env variables at startup with Zod — fail fast
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  REDIS_URL: z.string(),
  SESSION_SECRET: z.string().min(32, "Session secret must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
});

const env = EnvSchema.parse(process.env); // throws if any variable is missing or invalid
export { env }; // use env.DATABASE_URL instead of process.env.DATABASE_URL

// In production (Docker, Kubernetes, ECS):
// - Inject secrets via environment variables at runtime
// - Use AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets
// - Never bake secrets into Docker images

// Check for accidentally committed secrets
// Tools: git-secrets, trufflehog, GitHub secret scanning (automatic on push)

// Rotate secrets regularly
// JWT signing keys: rotate every 90 days, support old key during transition
// Database passwords: rotate when team changes, use short-lived DB credentials
// API keys: per-client, revokable individually`}</code></pre>

      <h2 id="dependency-security">Dependency Security</h2>
      <pre><code>{`# Check for known vulnerabilities in installed packages
npm audit

# Fix automatically (minor/patch updates)
npm audit fix

# View all vulnerabilities with details
npm audit --json | jq '.vulnerabilities | keys[]'

# Lock file integrity — npm ci uses package-lock.json exactly (no range resolution)
npm ci  # use in CI/CD, Docker builds — never npm install in production

# Snyk — continuous vulnerability monitoring
npm install -g snyk
snyk test          # scan current project
snyk monitor       # register project for ongoing monitoring
snyk fix           # apply fixes where possible

# Keep dependencies up to date
npm outdated                           # see what's behind
npx npm-check-updates -u              # update package.json versions
npm install && npm audit               # install and verify

# Use Dependabot (GitHub) or Renovate for automated PRs on dependency updates

// In Express: minimize what you import
// "The best dependency is no dependency" — every package is an attack surface
// Before adding a package: check npm download counts, last publish date, known issues
// Prefer packages from the Express ecosystem (express-*, well-maintained, audited)

// Specific packages with known security considerations:
// express-session: set strong SESSION_SECRET, use Redis store
// multer (file upload): limit file size, validate MIME type, scan for malware
// express-validator / zod: always validate before processing`}</code></pre>

      <h2 id="https-hsts">HTTPS & HSTS</h2>
      <pre><code>{`// Force HTTPS redirect (should be done at load balancer/nginx level in production)
// But Express can also enforce it
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    // req.secure: Express reads X-Forwarded-Proto header from proxy
    return res.redirect(301, \`https://\${req.headers.host}\${req.url}\`);
  }
  next();
});

// Trust the proxy (for req.ip, req.secure, req.hostname to work correctly behind nginx/ALB)
app.set("trust proxy", 1); // trust one level of proxy (nginx, ALB)
// app.set("trust proxy", "loopback, linklocal, uniquelocal"); // more specific

// HSTS — Strict-Transport-Security (done by helmet)
// Tells browsers to always use HTTPS for this domain for max-age seconds
// Even if user types http://, browser automatically uses https://
// preload: browser ships with your domain in its HSTS preload list — strongest

app.use(helmet({
  hsts: {
    maxAge: 31536000,      // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Certificate management in production
// Use Let's Encrypt (free, automated renewal via certbot)
// Or AWS Certificate Manager (ACM) with ALB — managed TLS, auto-renewal
// Never use self-signed certs in production (browser warnings, no HSTS)`}</code></pre>

      <h2 id="error-leakage">Error Message Leakage</h2>
      <pre><code>{`// Error messages leak information about your stack to attackers
// Stack traces reveal: file paths, library versions, internal logic
// DB errors reveal: table names, column names, query structure

// VULNERABLE — exposing internal error details
app.use((err: Error, req, res, next) => {
  res.status(500).json({
    error: err.message,  // ✗ "column 'passwordHash' does not exist" — leaks schema
    stack: err.stack,    // ✗ "at /app/src/db/users.ts:45:15" — leaks file structure
  });
});

// SAFE — different behavior per environment
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== "production";

  if (err instanceof AppError) {
    // Operational errors: safe to expose message and code
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // Unexpected errors: log fully, expose minimally
  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,    // ✓ logged to your logging system, not sent to client
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isDev
        ? err.message  // helpful in dev
        : "Internal server error", // generic in production
    },
  });
});

// Never include in error responses:
// - Stack traces (file paths)
// - SQL error messages (table/column names)
// - Internal server hostnames or IPs
// - Library version information
// - Business logic details (e.g., "user found but password wrong" vs "invalid credentials")`}</code></pre>
    </div>
  );
}
