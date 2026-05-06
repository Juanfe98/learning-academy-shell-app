import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const appArchitectureDiagram = String.raw`flowchart TD
    HTTP["Node.js http.createServer()"]
    HTTP --> APP["Express Application\napp = express()"]
    APP --> MW1["Middleware: json parser"]
    MW1 --> MW2["Middleware: cors"]
    MW2 --> MW3["Middleware: logger"]
    MW3 --> ROUTER["Router\napp.use('/users', usersRouter)"]
    ROUTER --> H1["GET /users → listUsers()"]
    ROUTER --> H2["POST /users → createUser()"]
    ROUTER --> H3["GET /users/:id → getUser()"]
    H1 --> RES["res.json({ data })"]
    H2 --> RES
    H3 --> RES`;

const requestLifecycleDiagram = String.raw`sequenceDiagram
    participant C as Client
    participant E as Express
    participant M1 as json()
    participant M2 as cors()
    participant M3 as authGuard
    participant H as Route Handler
    participant DB as Database

    C->>E: POST /api/users { name, email }
    E->>M1: parse JSON body
    M1->>M2: req.body is populated
    M2->>M3: CORS headers set
    M3->>H: user authenticated
    H->>DB: INSERT user row
    DB-->>H: { id, name, email }
    H-->>C: 201 { data: { id, name, email } }`;

export const toc: TocItem[] = [
  { id: "what-is-express", title: "What Express Is", level: 2 },
  { id: "app-architecture", title: "App Architecture", level: 2 },
  { id: "app-methods", title: "app.listen, app.use, app.METHOD", level: 2 },
  { id: "request-response", title: "Request and Response Objects", level: 2 },
  { id: "routing-params", title: "Route Parameters, Query Strings, Body", level: 2 },
  { id: "typescript-generics", title: "TypeScript Generics for Request & Response", level: 2 },
  { id: "request-lifecycle", title: "Request Lifecycle", level: 2 },
  { id: "static-files", title: "Serving Static Files", level: 2 },
  { id: "router-composition", title: "Router Composition", level: 2 },
  { id: "crud-example", title: "CRUD Routes: /users Resource", level: 2 },
];

export default function ExpressFundamentals() {
  return (
    <div className="article-content">
      <p>
        Express is a minimal, unopinionated HTTP framework for Node.js. It sits as a thin layer
        above Node&apos;s built-in <code>http</code> module, adding routing, middleware composition,
        and a cleaner API for request/response handling. Everything else — auth, validation, ORM,
        logging — you bring yourself. That is a feature, not a bug: Express lets you compose exactly
        what your application needs without inheriting framework opinions about the rest.
      </p>
      <p>
        Express&apos;s market dominance comes from its simplicity and its age. Most Node.js
        backend patterns — middleware pipelines, router modules, error handlers — were codified by
        the Express community and are now replicated across Fastify, Koa, and Hono. Understanding
        Express is understanding the mental model shared by virtually all Node.js HTTP frameworks.
      </p>

      <h2 id="what-is-express">What Express Is</h2>
      <p>
        Node.js ships with <code>http.createServer((req, res) =&gt; ...)</code>. That callback
        receives raw <code>IncomingMessage</code> and <code>ServerResponse</code> objects. Parsing
        JSON bodies, routing by path, reading URL params — you implement all of it yourself. Express
        wraps that callback with:
      </p>
      <ul>
        <li>A <strong>router</strong> that dispatches requests to handlers based on method and path pattern</li>
        <li>A <strong>middleware pipeline</strong> that processes every request through an ordered chain of functions</li>
        <li>Enhanced <code>Request</code> and <code>Response</code> objects with convenience methods (<code>req.params</code>, <code>res.json()</code>, etc.)</li>
        <li>A <strong>sub-router</strong> system for composing large apps from smaller route modules</li>
      </ul>
      <pre><code>{`// Without Express
import http from "http";
const server = http.createServer((req, res) => {
  if (req.url === "/users" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ users: [] }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// With Express
import express from "express";
const app = express();
app.use(express.json());

app.get("/users", (req, res) => {
  res.json({ users: [] });
});`}</code></pre>

      <h2 id="app-architecture">App Architecture</h2>
      <MermaidDiagram
        chart={appArchitectureDiagram}
        title="Express Application Architecture"
        caption="Every incoming HTTP request passes through the middleware stack before reaching its route handler. Routers are mounted at a base path and handle only matching sub-paths."
        minHeight={400}
      />

      <h2 id="app-methods">app.listen, app.use, app.METHOD</h2>
      <p>
        These three are the core of Express. Understanding when each one applies prevents a large
        category of beginner bugs.
      </p>
      <pre><code>{`import express, { Request, Response, NextFunction } from "express";

const app = express();

// app.listen — binds to a TCP port and starts accepting connections
// Returns an http.Server instance — use it for graceful shutdown
const server = app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});

// app.use(path?, handler) — mounts middleware (or a sub-router) at path
// If no path given, matches ALL requests
// If path given, matches any request whose URL starts with that path
app.use(express.json());             // applies to ALL requests
app.use("/api", apiRouter);         // applies to /api, /api/users, /api/v1/... etc
app.use("/static", express.static("public")); // serve static files at /static

// app.METHOD(path, ...handlers) — registers a route for a specific HTTP method
// path must match exactly (unlike app.use which does prefix matching)
app.get("/users", listUsers);               // GET /users only
app.post("/users", createUser);             // POST /users only
app.get("/users/:id", getUser);             // GET /users/123, /users/abc, etc

// Multiple handlers on one route (each must call next() or end the response)
app.get("/users/:id",
  authenticate,    // middleware: verify JWT
  authorize,       // middleware: check permission
  getUser          // handler: fetch from DB, respond
);

// app.all — matches any HTTP method
app.all("/api/*", logRequest);`}</code></pre>

      <p>
        The critical difference: <code>app.use(&quot;/api&quot;)</code> matches <em>any</em> request
        starting with <code>/api</code>. <code>app.get(&quot;/api&quot;)</code> matches only
        <code>GET /api</code> exactly (no trailing path segments unless the pattern includes them).
      </p>

      <h2 id="request-response">Request and Response Objects</h2>
      <p>
        Express augments Node&apos;s raw objects. The properties you will use most:
      </p>
      <pre><code>{`// Request (req) — important properties
req.method          // "GET", "POST", "PUT", "DELETE", etc
req.url             // full URL string: "/users/123?include=email"
req.path            // path only: "/users/123"
req.params          // route params: { id: "123" } for /users/:id
req.query           // parsed query string: { include: "email" }
req.body            // parsed request body (requires express.json() middleware)
req.headers         // HTTP headers object
req.get("header")   // case-insensitive header lookup: req.get("Authorization")
req.ip              // client IP address
req.cookies         // parsed cookies (requires cookie-parser middleware)

// Response (res) — important methods
res.status(201)             // set status code (chainable)
res.json({ data: user })    // serialize to JSON + set Content-Type: application/json
res.send("ok")              // send string/buffer/object
res.sendStatus(204)         // send status code with default message body
res.set("X-Custom", "val")  // set response header
res.redirect(301, "/new")   // redirect
res.end()                   // end response with no body

// Chaining
res.status(201).json({ data: user });
res.status(400).json({ error: "Invalid input", details: errors });`}</code></pre>

      <h2 id="routing-params">Route Parameters, Query Strings, Body</h2>
      <pre><code>{`// Route parameters — named segments starting with :
// GET /users/:userId/posts/:postId
app.get("/users/:userId/posts/:postId", (req, res) => {
  const { userId, postId } = req.params;
  // userId and postId are always strings — parse if you need numbers
  const userIdNum = parseInt(userId, 10);
  res.json({ userId: userIdNum, postId });
});

// Query string — everything after ?
// GET /users?role=admin&page=2&limit=20
app.get("/users", (req, res) => {
  const { role, page = "1", limit = "20" } = req.query;
  const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
  // Use validated/typed versions in production — raw query values are always strings
  res.json({ role, offset, limit });
});

// Request body — requires express.json() middleware
// POST /users with Content-Type: application/json
app.post("/users", express.json(), (req, res) => {
  const { name, email, role } = req.body; // body is parsed as JS object
  // Never trust req.body without validation — validate with zod or similar
  res.status(201).json({ id: "new-id", name, email, role });
});

// express.urlencoded for form submissions (HTML forms)
app.use(express.urlencoded({ extended: true }));`}</code></pre>

      <h2 id="typescript-generics">TypeScript Generics for Request & Response</h2>
      <p>
        Express ships with TypeScript typings that accept four generic parameters on{" "}
        <code>Request</code>. Using them gives you full type safety without casting. This is one
        of the most commonly overlooked patterns in Express + TypeScript codebases.
      </p>
      <pre><code>{`import { Request, Response, NextFunction } from "express";

// Request<Params, ResBody, ReqBody, Query>
// All four are optional — use only the ones you need

// 1. Typed route params
interface UserParams { id: string }

app.get(
  "/users/:id",
  (req: Request<UserParams>, res: Response) => {
    const { id } = req.params; // TypeScript knows: id is string
    res.json({ id });
  }
);

// 2. Typed request body
interface CreateUserBody {
  name: string;
  email: string;
  role?: "admin" | "user";
}

app.post(
  "/users",
  (req: Request<Record<string, never>, unknown, CreateUserBody>, res: Response) => {
    const { name, email, role = "user" } = req.body; // fully typed
    res.status(201).json({ id: crypto.randomUUID(), name, email, role });
  }
);

// 3. Typed query string
interface UsersQuery {
  role?: string;
  page?: string;
  limit?: string;
  search?: string;
}

app.get(
  "/users",
  (req: Request<Record<string, never>, unknown, unknown, UsersQuery>, res: Response) => {
    const { role, page = "1", limit = "20", search } = req.query;
    // All values typed as string | undefined — correct, since query strings are always strings
    res.json({ role, page, limit, search });
  }
);

// 4. Typed response body — enforces what you send back
interface UserResponse { id: string; name: string; email: string }
interface ErrorResponse { error: string; code?: string }

app.get(
  "/users/:id",
  async (
    req: Request<{ id: string }>,
    res: Response<UserResponse | ErrorResponse>
  ) => {
    const user = await db.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: "User not found" }); // TypeScript: must match ErrorResponse
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email }); // must match UserResponse
  }
);`}</code></pre>

      <p>
        The most common pattern in real codebases: type <code>ReqBody</code> and leave the others
        as defaults. Use Zod to validate first, then trust the types inside the handler.
      </p>
      <pre><code>{`// Practical pattern: typed body + Zod validation
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
});

type CreateUserBody = z.infer<typeof CreateUserSchema>;

// Route handler: body is fully typed AFTER validation
app.post(
  "/users",
  validate({ body: CreateUserSchema }), // validation middleware (see Validation module)
  async (req: Request<Record<string, never>, unknown, CreateUserBody>, res: Response) => {
    // At this point, req.body is guaranteed to match CreateUserBody
    const user = await db.user.create({ data: req.body });
    res.status(201).json({ data: user });
  }
);

// Module augmentation: add custom fields to req without casting
// In src/types/express.d.ts:
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "admin" | "user" };
      requestId?: string;
      startTime?: bigint;
    }
  }
}

// Now req.user is typed everywhere with no casting:
app.get("/me", authenticate, (req, res) => {
  const { id, role } = req.user!; // TypeScript knows the shape
  res.json({ id, role });
});`}</code></pre>

      <h2 id="request-lifecycle">Request Lifecycle</h2>
      <MermaidDiagram
        chart={requestLifecycleDiagram}
        title="Request Lifecycle Through Middleware to Handler"
        caption="Each middleware either transforms req/res and calls next(), or ends the request by calling res.json()/res.send(). A middleware that neither calls next() nor ends the response will cause the request to hang."
        minHeight={450}
      />

      <h2 id="static-files">Serving Static Files</h2>
      <pre><code>{`// express.static serves files from a directory
// GET /logo.png → serves public/logo.png
app.use(express.static("public"));

// Mount at a URL prefix
// GET /assets/style.css → serves public/style.css
app.use("/assets", express.static("public"));

// Options for production
app.use(express.static("public", {
  maxAge: "1d",        // Cache-Control: max-age=86400
  etag: true,          // ETag header for conditional requests
  lastModified: true,  // Last-Modified header
  index: "index.html", // Serve index.html for directory requests
}));

// In production, serve static files from nginx or a CDN instead
// Node.js is single-threaded — serving many large static files blocks the event loop`}</code></pre>

      <h2 id="router-composition">Router Composition</h2>
      <p>
        Large Express apps compose multiple <code>express.Router()</code> instances, each owning
        one resource or domain. The main <code>app</code> mounts routers at their base paths.
        This keeps each file focused and testable in isolation.
      </p>
      <pre><code>{`// src/routers/users.router.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/authz";

const router = Router();

// Middleware applied to ALL routes in this file
router.use(authenticate);

// Resource-level routes
router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", requireRole("admin"), deleteUser); // extra role check on delete

export default router;

// src/routers/index.ts — single mount point
import { Router } from "express";
import usersRouter from "./users.router";
import ordersRouter from "./orders.router";
import authRouter from "./auth.router"; // no authenticate middleware inside

const apiRouter = Router();

// Nest routers at sub-paths
apiRouter.use("/users", usersRouter);
apiRouter.use("/orders", ordersRouter);

export { apiRouter, authRouter };

// src/app.ts — wire everything together
import express from "express";
import { apiRouter, authRouter } from "./routers";
import { errorHandler } from "./middleware/error";
import { requestId, requestTiming } from "./middleware/telemetry";

const app = express();

// Global middleware (runs for every request)
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(helmet());
app.use(requestId);
app.use(requestTiming);

// Public routes — no authentication
app.get("/health", healthCheck);
app.get("/ready", readinessCheck);
app.use("/auth", authRouter);

// Protected API routes — authentication enforced inside apiRouter
app.use("/api/v1", apiRouter);

// Error handler must be LAST
app.use(errorHandler);

export default app;`}</code></pre>

      <h2 id="crud-example">CRUD Routes: /users Resource</h2>
      <p>
        A complete, minimal CRUD implementation showing the Express patterns you will use in every
        real project. This uses an in-memory store for clarity — in production, replace with DB calls.
      </p>
      <pre><code>{`import express, { Request, Response, NextFunction } from "express";

const router = express.Router();

// In-memory store for illustration
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
const users = new Map<string, User>();

// GET /users — list all users with optional filtering
router.get("/", (req: Request, res: Response) => {
  const { limit = "20", offset = "0" } = req.query;
  const all = Array.from(users.values());
  const page = all.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

  res.json({
    data: page,
    meta: { total: all.length, limit: parseInt(limit as string), offset: parseInt(offset as string) },
  });
});

// GET /users/:id — get single user
router.get("/:id", (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ data: user });
});

// POST /users — create user
router.post("/", (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }

  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    createdAt: new Date(),
  };
  users.set(user.id, user);
  res.status(201).json({ data: user });
});

// PATCH /users/:id — partial update
router.patch("/:id", (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { name, email } = req.body;
  const updated: User = {
    ...user,
    ...(name && { name }),
    ...(email && { email }),
  };
  users.set(user.id, updated);
  res.json({ data: updated });
});

// DELETE /users/:id — delete user
router.delete("/:id", (req: Request, res: Response) => {
  if (!users.has(req.params.id)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  users.delete(req.params.id);
  res.sendStatus(204); // 204 No Content — no body on delete
});

// Mount in the main app
const app = express();
app.use(express.json());
app.use("/users", router);
app.listen(3000);`}</code></pre>
    </div>
  );
}
