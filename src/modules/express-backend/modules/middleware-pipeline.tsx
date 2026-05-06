import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const middlewareChainDiagram = String.raw`flowchart TD
    REQ["Incoming Request"]
    REQ --> MW1["Middleware 1: json()"]
    MW1 -->|"next()"| MW2["Middleware 2: cors()"]
    MW2 -->|"next()"| MW3["Middleware 3: morgan()"]
    MW3 -->|"next()"| MW4["Middleware 4: authenticate()"]
    MW4 -->|"next()"| HANDLER["Route Handler"]
    HANDLER --> RES["Response sent"]

    MW4 -->|"401 Unauthorized"| ERR_RES["Error Response (no next())"]
    HANDLER -->|"throw error"| ERR_MW["Error Middleware (err, req, res, next)"]
    ERR_MW --> ERR_RES2["500 Error Response"]`;

const routerLevelDiagram = String.raw`flowchart LR
    APP["app.use('/api', apiRouter)"]
    APP --> RR1["apiRouter.use(authenticate)"]
    RR1 --> RR2["GET /api/users → listUsers"]
    RR1 --> RR3["POST /api/users → createUser"]
    RR1 --> RR4["GET /api/orders → listOrders"]

    APP2["app.use('/public', publicRouter)"]
    APP2 --> PR1["GET /public/docs → getDocs"]
    APP2 --> PR2["GET /public/health → healthCheck"]`;

export const toc: TocItem[] = [
  { id: "what-is-middleware", title: "What Middleware Is", level: 2 },
  { id: "middleware-chain", title: "The Middleware Chain", level: 2 },
  { id: "order-matters", title: "Order Matters", level: 2 },
  { id: "middleware-types", title: "Types of Middleware", level: 2 },
  { id: "error-middleware", title: "Error-Handling Middleware", level: 2 },
  { id: "essential-packages", title: "Essential Third-Party Packages", level: 2 },
  { id: "custom-middleware", title: "Custom Middleware Patterns", level: 2 },
  { id: "router-middleware", title: "Router-Level Middleware", level: 2 },
];

export default function MiddlewarePipeline() {
  return (
    <div className="article-content">
      <p>
        Middleware is the central organizing principle of Express. Everything that happens between
        receiving a request and sending a response — parsing bodies, checking auth, logging, rate
        limiting, attaching request IDs — is implemented as middleware. Master the middleware model
        and you understand 80% of Express architecture.
      </p>

      <h2 id="what-is-middleware">What Middleware Is</h2>
      <p>
        A middleware function is any function with the signature <code>(req, res, next)</code>. It
        can read and modify <code>req</code> and <code>res</code>, and it must either call
        <code>next()</code> to pass control to the next middleware, or end the response
        (<code>res.json()</code>, <code>res.send()</code>, etc.). A middleware that does neither
        will hang the request indefinitely.
      </p>
      <pre><code>{`import { Request, Response, NextFunction } from "express";

// The fundamental middleware shape
function myMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Do something before the route handler runs
  console.log(\`\${req.method} \${req.path}\`);

  // 2a. Call next() to pass to the next middleware/handler
  next();

  // 2b. Or end the response and skip remaining middleware
  // res.status(401).json({ error: "Unauthorized" });
  // Do NOT call next() after ending the response
}

// Attaching data to req — use TypeScript module augmentation
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
      requestId?: string;
    }
  }
}

// Now middleware can set req.user and TypeScript knows about it
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return; // important: stop execution after sending response
  }

  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}`}</code></pre>

      <h2 id="middleware-chain">The Middleware Chain</h2>
      <MermaidDiagram
        chart={middlewareChainDiagram}
        title="Middleware Chain — next() Threading"
        caption="next() passes control to the next registered middleware. If a middleware sends a response without calling next(), the chain stops there. Error middleware (4 arguments) is only invoked when next(err) is called or an error is thrown."
        minHeight={420}
      />

      <h2 id="order-matters">Order Matters</h2>
      <p>
        Express registers middleware in the order <code>app.use()</code> and <code>app.METHOD()</code>
        are called. A request flows through them top-to-bottom. This has real consequences:
      </p>
      <pre><code>{`const app = express();

// WRONG order — body parser after route that reads req.body
app.post("/users", (req, res) => {
  console.log(req.body); // undefined! Parser not registered yet
  res.json({ ok: true });
});
app.use(express.json()); // Too late

// CORRECT order — body parser before any route that needs it
app.use(express.json());        // 1. Parse body
app.use(cors());                // 2. CORS headers
app.use(morgan("dev"));         // 3. Log request
app.use("/api", router);        // 4. Route handlers

// Order also determines which middleware applies to which routes:
app.use(express.json());        // applies to all routes below this line
app.get("/health", healthCheck); // doesn't need json body anyway

app.use(authenticate);           // applies only to routes below this line
app.get("/users", listUsers);    // protected
app.post("/users", createUser);  // protected

// But routes above authenticate are NOT protected:
// GET /health is publicly accessible`}</code></pre>

      <h2 id="middleware-types">Types of Middleware</h2>
      <p>
        Express recognizes five categories. The distinction matters for how you register them and
        what scope they affect:
      </p>
      <pre><code>{`// 1. Application-level middleware — app.use() or app.METHOD()
// Runs for all requests (or those matching the path) on the main app
app.use(express.json());
app.use("/api", rateLimit({ windowMs: 60_000, max: 100 }));

// 2. Router-level middleware — router.use() or router.METHOD()
// Same as application-level but scoped to an express.Router() instance
const router = express.Router();
router.use(authenticate);       // only runs for routes on this router
router.get("/profile", getProfile);

// 3. Error-handling middleware — EXACTLY 4 arguments: (err, req, res, next)
// Only invoked when next(err) is called or an uncaught error is thrown in async code
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// 4. Built-in middleware — ships with Express
app.use(express.json());           // parse application/json bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form data
app.use(express.static("public")); // serve static files

// 5. Third-party middleware — npm packages
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(morgan("combined"));`}</code></pre>

      <h2 id="error-middleware">Error-Handling Middleware</h2>
      <p>
        Error middleware has exactly 4 parameters. Express identifies it by parameter count — if
        you write <code>(err, req, res)</code> with only 3, Express treats it as regular middleware
        and the <code>err</code> is treated as <code>req</code>. Always include <code>next</code>
        even if you never call it.
      </p>
      <pre><code>{`// Triggering error middleware
// Method 1: call next with an error argument
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await db.users.findById(req.params.id);
    res.json({ data: user });
  } catch (err) {
    next(err); // Express routes this to error middleware
  }
});

// Method 2: asyncHandler wrapper (avoid try/catch in every route)
// Uncaught promise rejections are automatically passed to next(err)
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await db.users.findById(req.params.id); // throws → caught → next(err)
  res.json({ data: user });
}));

// Custom AppError class for typed error handling
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Global error handler — MUST be the last app.use() call
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Unknown errors — don't leak internals in production
  const isDev = process.env.NODE_ENV === "development";
  res.status(500).json({
    error: {
      message: isDev ? err.message : "Internal server error",
      ...(isDev && { stack: err.stack }),
    },
  });
});`}</code></pre>

      <h2 id="essential-packages">Essential Third-Party Packages</h2>
      <ArticleTable caption="Common Express middleware packages — what they do and when to use them" minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Purpose</th>
              <th>Example Config</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>helmet</code></td>
              <td>Sets security HTTP headers (X-Frame-Options, CSP, HSTS, etc.)</td>
              <td><code>app.use(helmet())</code></td>
              <td>Use always — sensible defaults, configurable per-header</td>
            </tr>
            <tr>
              <td><code>cors</code></td>
              <td>Cross-Origin Resource Sharing headers + preflight handling</td>
              <td><code>cors({'{'} origin: allowedOrigin, credentials: true {'}'})</code></td>
              <td>Required for any browser-facing API called from a different domain</td>
            </tr>
            <tr>
              <td><code>morgan</code></td>
              <td>HTTP request logger — dev/combined/tiny formats</td>
              <td><code>morgan("combined")</code></td>
              <td>Use <code>pino-http</code> in production for structured JSON logs</td>
            </tr>
            <tr>
              <td><code>compression</code></td>
              <td>Gzip/deflate response bodies</td>
              <td><code>app.use(compression())</code></td>
              <td>Reduces bandwidth; use nginx for static files instead</td>
            </tr>
            <tr>
              <td><code>express-rate-limit</code></td>
              <td>Rate limiting by IP (in-memory or Redis store)</td>
              <td><code>rateLimit({'{'} windowMs: 60_000, max: 100 {'}'})</code></td>
              <td>Use Redis store for multi-instance deployments</td>
            </tr>
            <tr>
              <td><code>cookie-parser</code></td>
              <td>Populates <code>req.cookies</code> and <code>req.signedCookies</code></td>
              <td><code>cookieParser(secret)</code></td>
              <td>Required for session and cookie-based auth</td>
            </tr>
            <tr>
              <td><code>express-session</code></td>
              <td>Server-side session management with pluggable stores</td>
              <td>Configure with Redis store for production</td>
              <td>Session ID sent as cookie, data stored server-side</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="custom-middleware">Custom Middleware Patterns</h2>
      <pre><code>{`import { v4 as uuidv4 } from "uuid";
import pino from "pino";

const logger = pino();

// Request ID — attach a unique ID to each request for tracing
function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.headers["x-request-id"] as string ?? uuidv4();
  res.set("X-Request-ID", req.requestId);
  next();
}

// Request timing — measure how long each request takes
function requestTiming(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
    });
  });

  next();
}

// Middleware factory — parameterized middleware
// Usage: app.use("/admin", requireRole("admin", "superadmin"))
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

// Usage
app.use(requestId);
app.use(requestTiming);
app.use("/admin", authenticate, requireRole("admin"), adminRouter);`}</code></pre>

      <h2 id="router-middleware">Router-Level Middleware</h2>
      <MermaidDiagram
        chart={routerLevelDiagram}
        title="Router-Level Middleware Scoping"
        caption="Router-level middleware only runs for routes mounted on that router. The public router can skip authentication entirely while the API router enforces it for all its routes."
        minHeight={280}
      />
      <pre><code>{`// users.router.ts
import { Router } from "express";

const router = Router();

// This authenticate call applies to ALL routes in this file
router.use(authenticate);

// The authenticate middleware runs before every handler below
router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;

// app.ts — mount routers at their prefixes
import usersRouter from "./users.router";
import authRouter from "./auth.router"; // no auth middleware inside

app.use(express.json());
app.use(cors());
app.use(requestId);
app.use(requestTiming);

app.use("/auth", authRouter);   // public — login, register, refresh
app.use("/users", usersRouter); // protected — authenticate runs inside router
app.use("/health", healthRouter); // public — health check endpoint

// Global error handler — always last
app.use(errorHandler);`}</code></pre>
    </div>
  );
}
