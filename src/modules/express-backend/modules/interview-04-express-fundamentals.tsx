import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const middlewareChainDiagram = String.raw`flowchart TD
    REQ["Incoming HTTP Request"]
    MW1["express.json()\nparse body"]
    MW2["cors()\nset CORS headers"]
    MW3["helmet()\nset security headers"]
    MW4["authenticate()\nverify JWT"]
    HANDLER["Route Handler\nasync (req, res) => { }"]
    RES["Response sent"]
    ERR["Error Middleware\n(err, req, res, next)"]

    REQ --> MW1 -->|next()| MW2 -->|next()| MW3 -->|next()| MW4
    MW4 -->|"next() — authenticated"| HANDLER --> RES
    MW4 -->|"401 — no next()"| RES
    HANDLER -->|"throw / next(err)"| ERR --> RES`;

const requestLifecycleDiagram = String.raw`sequenceDiagram
    participant C as Client
    participant EX as Express
    participant MW as Middleware Stack
    participant RH as Route Handler
    participant SVC as Service / DB

    C->>EX: POST /api/users { name, email }
    EX->>MW: express.json() — parse body
    MW->>MW: cors() — set headers
    MW->>MW: authenticate() — verify JWT
    MW->>RH: req.body, req.user populated
    RH->>SVC: userService.create(req.body)
    SVC-->>RH: { id, name, email }
    RH-->>C: 201 { data: { id, name, email } }`;

const layeredArchDiagram = String.raw`flowchart TD
    HTTP["HTTP Layer\nExpress routes · controllers"]
    SVC["Service Layer\nBusiness logic · validation · orchestration"]
    REPO["Repository Layer\nDB queries · data access · ORM"]
    DB[("Database\nPostgreSQL · MongoDB")]

    HTTP -->|"calls"| SVC
    SVC -->|"calls"| REPO
    REPO -->|"queries"| DB
    DB -->|"data"| REPO
    REPO -->|"entities"| SVC
    SVC -->|"DTOs"| HTTP`;

const versioningDiagram = String.raw`flowchart LR
    subgraph URL["URL Versioning (most common)"]
        U1["GET /api/v1/users"]
        U2["GET /api/v2/users"]
    end
    subgraph HEADER["Header Versioning"]
        H1["GET /api/users\nAPI-Version: 1"]
        H2["GET /api/users\nAPI-Version: 2"]
    end
    subgraph QUERY["Query Param Versioning"]
        Q1["GET /api/users?version=1"]
        Q2["GET /api/users?version=2"]
    end`;

export const toc: TocItem[] = [
  { id: "what-is-express", title: "What is Express.js?", level: 2 },
  { id: "what-is-middleware", title: "What is middleware in Express?", level: 2 },
  { id: "app-use", title: "What does app.use() do?", level: 2 },
  { id: "app-vs-route-middleware", title: "Application-level vs route-level middleware", level: 2 },
  { id: "error-middleware", title: "What is error-handling middleware?", level: 2 },
  { id: "why-4-args", title: "Why does error middleware receive 4 arguments?", level: 2 },
  { id: "next", title: "What does next() do?", level: 2 },
  { id: "next-error", title: "What happens when you call next(error)?", level: 2 },
  { id: "request-lifecycle", title: "Request/response lifecycle in Express", level: 2 },
  { id: "params-query-body", title: "req.params vs req.query vs req.body", level: 2 },
  { id: "express-json", title: "What does express.json() do?", level: 2 },
  { id: "body-size-limit", title: "Why limit request body size?", level: 2 },
  { id: "organize-routes", title: "Organizing routes in a large project", level: 2 },
  { id: "controller", title: "What should go in a controller?", level: 2 },
  { id: "service", title: "What should go in a service?", level: 2 },
  { id: "repository", title: "What should go in a repository?", level: 2 },
  { id: "fat-controllers", title: "How to avoid fat controllers", level: 2 },
  { id: "project-structure", title: "Express project structure for maintainability", level: 2 },
  { id: "api-versioning", title: "How to version APIs in Express", level: 2 },
  { id: "handle-404", title: "How to handle 404 routes", level: 2 },
];

export default function InterviewExpressFundamentals() {
  return (
    <div className="article-content">
      <p>
        Section 4 of 18 — Express.js fundamentals. These questions test whether you understand
        how Express actually works, not just how to use it. Interviewers want to see you explain
        middleware, error flow, and architecture — not just syntax.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="what-is-express">What is Express.js?</h2>
      <p>
        Express is a minimal, unopinionated HTTP framework for Node.js. It wraps Node&apos;s
        built-in <code>http</code> module with three things: a <strong>router</strong> that
        dispatches requests by method and path, a <strong>middleware pipeline</strong> for
        processing each request through an ordered chain of functions, and an enhanced{" "}
        <strong>Request/Response API</strong> with convenience methods like{" "}
        <code>req.params</code>, <code>res.json()</code>, and <code>res.status()</code>.
      </p>
      <p>
        Everything else — auth, validation, ORM, logging — you bring yourself. That is a
        deliberate design choice: Express composes with any library rather than imposing opinions.
        Understanding Express means understanding the mental model that Fastify, Koa, and Hono
        all share.
      </p>

      {/* ─── Q2 ─── */}
      <h2 id="what-is-middleware">What is middleware in Express?</h2>
      <p>
        Middleware is any function with the signature <code>(req, res, next)</code>. It sits
        between receiving a request and sending a response, and it must do one of two things:
        call <code>next()</code> to pass control to the next middleware, or end the request by
        sending a response. A middleware that does neither will hang the request indefinitely.
      </p>
      <MermaidDiagram
        chart={middlewareChainDiagram}
        title="The Express Middleware Chain"
        caption="Every request flows through the middleware stack in registration order. Any middleware can short-circuit the chain by sending a response. Throwing or calling next(err) routes to error middleware."
        minHeight={480}
      />
      <pre>
        <code>{`import { Request, Response, NextFunction } from "express";

// Basic middleware shape
function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log(\`\${req.method} \${req.path}\`);
  next(); // ← must call next() or the request hangs
}

// Middleware that can end the chain
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "No token" }); // ← ends here, next() NOT called
    return; // ← return to prevent fallthrough
  }
  req.user = verifyToken(token);
  next(); // ← pass to next middleware
}`}</code>
      </pre>

      {/* ─── Q3 ─── */}
      <h2 id="app-use">What does app.use() do?</h2>
      <p>
        <code>app.use()</code> registers middleware or a router on the application. Without a
        path argument it matches every request. With a path it matches any request whose URL
        starts with that prefix — including sub-paths. This is different from route methods like{" "}
        <code>app.get()</code> which match exact paths only.
      </p>
      <pre>
        <code>{`const app = express();

// No path — runs on EVERY request
app.use(express.json());
app.use(helmet());
app.use(cors());

// With path — runs on any request starting with /api
// Matches: /api, /api/users, /api/v1/orders/123
app.use("/api", apiRouter);

// app.get() only matches exact path with exact method
app.get("/health", healthCheck); // only GET /health — not GET /health/live

// Difference between app.use("/api") and app.get("/api"):
// app.use("/api") → matches GET /api, POST /api/users, DELETE /api/v1/users/123
// app.get("/api") → matches ONLY GET /api (exact, no sub-paths)

// Order matters — middleware runs top-to-bottom in registration order
app.use(express.json());      // 1 — parse body first
app.use(requestId);           // 2 — attach request ID
app.use("/auth", authRouter); // 3 — public auth routes (no auth check)
app.use(authenticate);        // 4 — auth check for everything below this line
app.use("/api", apiRouter);   // 5 — protected routes
app.use(errorHandler);        // always last`}</code>
      </pre>

      {/* ─── Q4 ─── */}
      <h2 id="app-vs-route-middleware">What is the difference between application-level and route-level middleware?</h2>
      <ArticleTable caption="Same function signature — different scope" minWidth={820}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Application-level</th>
              <th>Router-level</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Registered on</strong></td>
              <td><code>app.use()</code> on the main Express app</td>
              <td><code>router.use()</code> on an <code>express.Router()</code> instance</td>
            </tr>
            <tr>
              <td><strong>Scope</strong></td>
              <td>Applies to all routes on the app (or path-matched subset)</td>
              <td>Applies only to routes on that router instance</td>
            </tr>
            <tr>
              <td><strong>Best for</strong></td>
              <td>Global concerns: logging, CORS, body parsing, security headers</td>
              <td>Domain-specific concerns: authenticate all users routes, rate-limit this router</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// Application-level — runs for ALL requests
const app = express();
app.use(express.json());    // global — every request
app.use(helmet());          // global — every request

// Router-level — only runs for routes on this router
const usersRouter = express.Router();
usersRouter.use(authenticate);      // only for /users/* routes
usersRouter.use(rateLimitPerUser);  // only for /users/* routes

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.get("/:id", getUser);

// Mount the router — router's middleware only runs when /users is matched
app.use("/users", usersRouter);

// Route-level — only runs for this specific route
app.get("/admin/reset",
  authenticate,            // only for this route
  requireRole("admin"),    // only for this route
  resetDatabase
);`}</code>
      </pre>

      {/* ─── Q5 ─── */}
      <h2 id="error-middleware">What is error-handling middleware?</h2>
      <p>
        Error-handling middleware is a special middleware with exactly 4 parameters:{" "}
        <code>(err, req, res, next)</code>. Express routes to it automatically when{" "}
        <code>next(err)</code> is called or when an error is thrown inside an async handler
        (with <code>asyncHandler</code>). It must be registered <strong>last</strong> — after
        all routes and other middleware.
      </p>
      <pre>
        <code>{`// Error middleware MUST have exactly 4 params — Express identifies it by arity
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Unknown error — don't leak stack traces in production
  res.status(500).json({ error: { message: "Internal server error" } });
});

// Must be registered after all routes:
app.use("/api", apiRouter);
app.use(errorHandler);    // ← last

// Triggering it:
// Method 1: next(err)
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // → routes to error middleware
  }
});

// Method 2: asyncHandler (wraps catch → next automatically)
app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id); // throw → next(err) automatically
  res.json(user);
}));`}</code>
      </pre>

      {/* ─── Q6 ─── */}
      <h2 id="why-4-args">Why does Express error middleware receive 4 arguments?</h2>
      <p>
        Express identifies error-handling middleware purely by the number of parameters (arity).
        If your function has 4 parameters, Express treats it as an error handler. If it has 3,
        Express treats it as regular middleware — even if the first parameter is named{" "}
        <code>err</code>. This means you <strong>must always include <code>next</code></strong>{" "}
        as the 4th argument, even if you never call it.
      </p>
      <pre>
        <code>{`// ✅ Correct — 4 params — Express recognizes this as error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err.message });
});

// ❌ Wrong — 3 params — Express treats this as regular middleware
// "err" becomes req, "req" becomes res, "res" becomes next
app.use((err: Error, req: Request, res: Response) => {
  // TypeScript will complain, but JS won't — this is a silent bug
  res.status(500).json({ error: err.message }); // res is actually next here!
});

// Why? Express checks fn.length at registration time:
// fn.length === 4 → error handler
// fn.length === 3 or less → regular middleware or route handler

// Practical implication: even if you never call next, include it:
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // next is never called here — but must be declared
  logger.error(err);
  res.status(500).json({ error: "Internal server error" });
});`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="next">What does next() do?</h2>
      <p>
        <code>next()</code> passes control to the next matching middleware or route handler.
        Without calling it, the request hangs — no response is ever sent and the client
        times out. It has three forms:
      </p>
      <pre>
        <code>{`// next() — pass to next middleware/handler
function requestTimer(req: Request, res: Response, next: NextFunction) {
  req.startTime = Date.now();
  next(); // continue normally
}

// next(err) — skip to error middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    req.user = verifyToken(req.headers.authorization);
    next(); // ← success path
  } catch (err) {
    next(err); // ← error path — jumps to (err, req, res, next) handler
  }
}

// next("router") — skip remaining middleware in THIS router, back to parent
const adminRouter = express.Router();
adminRouter.use((req, res, next) => {
  if (!req.user?.isAdmin) {
    next("router"); // skip all admin routes, fall through to next app.use
    return;
  }
  next();
});

// Important: calling next() AFTER res.send() is a common bug
function badMiddleware(req: Request, res: Response, next: NextFunction) {
  res.json({ ok: true }); // response sent
  next();                 // ❌ still calls next — can cause "headers already sent" error
}

function goodMiddleware(req: Request, res: Response, next: NextFunction) {
  res.json({ ok: true });
  return; // ← stop execution after sending response
}`}</code>
      </pre>

      {/* ─── Q8 ─── */}
      <h2 id="next-error">What happens when you call next(error)?</h2>
      <p>
        Calling <code>next(err)</code> with any truthy argument skips all remaining regular
        middleware and routes, and jumps directly to the next error-handling middleware (the
        one with 4 parameters). If no error middleware is registered, Express sends a default
        error response.
      </p>
      <pre>
        <code>{`// next(err) flow:
app.use(middlewareA);   // ← runs
app.use(middlewareB);   // ← runs
app.get("/users", async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    next(err); // ← error thrown here
  }
});
app.use(middlewareC);           // ← SKIPPED — error bypasses this
app.use(middlewareD);           // ← SKIPPED
app.use(errorHandler);          // ← runs directly — this is where next(err) lands

// next(err) vs throwing inside asyncHandler:
// Both achieve the same result — asyncHandler converts throw to next(err)

// asyncHandler source (understand this):
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next); // catch → next(err)
};

// These are equivalent:
app.get("/users/:id", async (req, res, next) => {
  try { res.json(await getUser(req.params.id)); }
  catch (err) { next(err); }
});

app.get("/users/:id", asyncHandler(async (req, res) => {
  res.json(await getUser(req.params.id)); // throw auto-routes to next(err)
}));`}</code>
      </pre>

      {/* ─── Q9 ─── */}
      <h2 id="request-lifecycle">What is the request/response lifecycle in Express?</h2>
      <MermaidDiagram
        chart={requestLifecycleDiagram}
        title="Express Request/Response Lifecycle"
        caption="A request flows through the middleware stack in order, hits the route handler, which calls a service, which hits the database. The response travels back the same path."
        minHeight={440}
      />
      <pre>
        <code>{`// The lifecycle step by step:
// 1. Node.js http server receives the TCP packet
// 2. Express creates enhanced req/res objects from Node's IncomingMessage/ServerResponse
// 3. Request flows through app.use() middleware in registration order
//    - express.json() parses the body
//    - cors() sets CORS headers
//    - authenticate() verifies JWT, sets req.user
// 4. Express router matches method + path → finds the route handler
// 5. Route handler runs → calls services/DB
// 6. res.json() / res.send() serializes the response, sets Content-Type, sends bytes
// 7. Express emits 'finish' on res — logging middleware can record duration here

// Complete minimal example:
import express from "express";
const app = express();

// Step 1: parse body (must come before routes that read req.body)
app.use(express.json());

// Step 2: your middleware
app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

// Step 3: route
app.post("/users", async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json({ data: user }); // lifecycle ends here
  } catch (err) {
    next(err); // lifecycle continues to error middleware
  }
});

// Step 4: error handler (only runs if next(err) was called)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000);`}</code>
      </pre>

      {/* ─── Q10 ─── */}
      <h2 id="params-query-body">What is the difference between req.params, req.query, and req.body?</h2>
      <ArticleTable caption="Three different ways data arrives in an HTTP request" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th><code>req.params</code></th>
              <th><code>req.query</code></th>
              <th><code>req.body</code></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Source</strong></td>
              <td>URL path segments: <code>/users/:id</code></td>
              <td>Query string: <code>?page=2&limit=20</code></td>
              <td>Request body (JSON, form, etc.)</td>
            </tr>
            <tr>
              <td><strong>Example URL</strong></td>
              <td><code>/users/123</code> → <code>{'{ id: "123" }'}</code></td>
              <td><code>/users?role=admin</code> → <code>{'{ role: "admin" }'}</code></td>
              <td><code>POST /users</code> with <code>{'{ "name": "Alice" }'}</code></td>
            </tr>
            <tr>
              <td><strong>Type</strong></td>
              <td>Always <code>string</code></td>
              <td>Always <code>string | string[]</code></td>
              <td>Parsed by middleware (object for JSON)</td>
            </tr>
            <tr>
              <td><strong>Requires middleware?</strong></td>
              <td>No — Express parses automatically</td>
              <td>No — Express parses automatically</td>
              <td>Yes — <code>express.json()</code> or <code>express.urlencoded()</code></td>
            </tr>
            <tr>
              <td><strong>Used for</strong></td>
              <td>Resource identifiers: <code>/users/:id</code>, <code>/orders/:orderId</code></td>
              <td>Filtering, sorting, pagination: <code>?sort=name&page=2</code></td>
              <td>Creating/updating resources, sending structured data</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// All three in one route example:
// GET /users/123/orders?status=pending&page=2
// with body: { "notes": "urgent" }

app.get("/users/:userId/orders", async (req, res) => {
  const { userId } = req.params;         // "123" (string — parse if you need number)
  const { status, page = "1" } = req.query; // "pending", "2" (always strings!)
  const { notes } = req.body;            // "urgent" (undefined unless body middleware present)

  // Always parse numeric values from params and query:
  const userIdNum = parseInt(userId, 10);
  const pageNum = parseInt(page as string, 10);

  // With Zod for type safety:
  const params = z.object({ userId: z.coerce.number() }).parse(req.params);
  const query = z.object({
    status: z.enum(["pending", "shipped", "delivered"]).optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().max(100).default(20),
  }).parse(req.query);
});`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="express-json">What does express.json() do?</h2>
      <p>
        <code>express.json()</code> is built-in middleware that reads the raw request body
        bytes, parses them as JSON, and sets the result on <code>req.body</code>. Without it,
        <code>req.body</code> is <code>undefined</code> for JSON requests.
      </p>
      <pre>
        <code>{`// express.json() reads the stream, buffers, parses
app.use(express.json({
  limit: "100kb",       // ← reject bodies larger than this (default is "100kb")
  strict: true,         // only accept objects and arrays (default: true)
  type: "application/json", // only parse when Content-Type matches (default)
}));

// What it does internally:
// 1. Checks Content-Type: application/json header
// 2. Buffers the request stream into memory
// 3. Calls JSON.parse() on the buffered string
// 4. Sets req.body = parsed result
// 5. Calls next()

// Without it:
app.post("/users", (req, res) => {
  console.log(req.body); // undefined — body not parsed

// With it:
app.use(express.json());
app.post("/users", (req, res) => {
  console.log(req.body); // { name: "Alice", email: "alice@example.com" }
});

// For HTML form submissions (Content-Type: application/x-www-form-urlencoded):
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// For file uploads: use multer or busboy — express.json() doesn't handle multipart`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="body-size-limit">Why should you limit request body size?</h2>
      <p>
        Without a limit, a malicious client can send a 10 GB request body, forcing your server
        to buffer it all in memory before processing — exhausting heap and crashing the process.
        This is a trivial denial-of-service attack.
      </p>
      <pre>
        <code>{`// Default limit in express.json() is "100kb" — fine for most JSON APIs
app.use(express.json({ limit: "100kb" }));

// For file uploads, set a specific limit based on your use case
app.use(express.raw({ limit: "10mb", type: "application/octet-stream" }));

// What happens when limit is exceeded:
// Express rejects the request with 413 Payload Too Large before your handler runs
// You can catch this in error middleware:
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  next(err);
});

// Size limit recommendations:
// JSON APIs: 100kb–1mb (most REST payloads are <10kb)
// File uploads: set explicitly based on max file size you accept
// Webhooks (Stripe, GitHub): match their documented payload sizes (usually <1mb)`}</code>
      </pre>

      {/* ─── Q13 ─── */}
      <h2 id="organize-routes">How do you organize routes in a large Express project?</h2>
      <p>
        Split by domain/resource. Each domain gets a router file. All routers mount into a
        central index, which mounts into the app. This keeps each file focused and independently
        testable.
      </p>
      <pre>
        <code>{`// src/
// ├── app.ts                  ← Express app setup (no listen here)
// ├── server.ts               ← http.createServer + listen + graceful shutdown
// ├── routers/
// │   ├── index.ts            ← mounts all routers
// │   ├── users.router.ts     ← /users routes
// │   ├── orders.router.ts    ← /orders routes
// │   ├── auth.router.ts      ← /auth routes (public)
// │   └── admin.router.ts     ← /admin routes (admin only)
// ├── controllers/
// │   ├── users.controller.ts
// │   └── orders.controller.ts
// ├── services/
// │   ├── users.service.ts
// │   └── orders.service.ts
// ├── repositories/
// │   ├── users.repository.ts
// │   └── orders.repository.ts
// ├── middleware/
// │   ├── authenticate.ts
// │   ├── authorize.ts
// │   └── validate.ts
// └── errors/
//     └── index.ts

// routers/users.router.ts
const router = express.Router();
router.use(authenticate);             // all routes in this file require auth
router.get("/",        listUsers);
router.post("/",       createUser);
router.get("/:id",     getUser);
router.patch("/:id",   updateUser);
router.delete("/:id",  requireRole("admin"), deleteUser);
export default router;

// routers/index.ts
const apiRouter = express.Router();
apiRouter.use("/users",  usersRouter);
apiRouter.use("/orders", ordersRouter);
export { apiRouter };

// app.ts
app.use("/auth", authRouter);
app.use("/api/v1", apiRouter);
app.use(errorHandler);`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="controller">What should go in a controller?</h2>
      <p>
        A controller is the HTTP layer. It handles the request/response protocol and nothing
        else. It reads input from <code>req</code>, calls a service, and sends a response. It
        contains <strong>no business logic</strong>.
      </p>
      <pre>
        <code>{`// ✅ Thin controller — only HTTP concerns
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const dto = CreateUserSchema.parse(req.body);   // 1. parse + validate input
  const user = await userService.create(dto);      // 2. delegate to service
  res.status(201).json({ data: toUserDto(user) }); // 3. format + send response
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userService.getById(id);      // service handles not-found throws
  res.json({ data: toUserDto(user) });
});

// Controller knows:
// - req, res, next
// - Input validation (schema parsing)
// - HTTP status codes
// - Response formatting / DTO mapping

// Controller does NOT know:
// - Database queries
// - Business rules ("user can only have 5 orders")
// - Email sending
// - Any downstream service details`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="service">What should go in a service?</h2>
      <p>
        A service contains business logic — the rules and orchestration that make your
        application do what it does. It is independent of HTTP: no <code>req</code>, no{" "}
        <code>res</code>, no Express imports. This makes it unit-testable without a running server.
      </p>
      <pre>
        <code>{`// ✅ Service — business logic, HTTP-agnostic
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Business rule: email must be unique
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictError("Email already registered");

    // Business rule: hash password before storing
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepo.create({ ...dto, passwordHash });

    // Orchestration: send welcome email after creation
    await this.emailService.sendWelcome(user.email, user.name);

    return user;
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("User");
    return user;
  }
}

// Service knows:
// - Business rules and invariants
// - Orchestration of multiple repositories/services
// - Domain validation (beyond schema shape)
// - What errors to throw

// Service does NOT know:
// - HTTP status codes
// - req/res objects
// - How the data is stored (delegates to repository)`}</code>
      </pre>

      {/* ─── Q16 ─── */}
      <h2 id="repository">What should go in a repository?</h2>
      <p>
        A repository is the data access layer. It translates between your domain model and your
        database. It contains all queries — finds, creates, updates, deletes. It knows about
        Prisma/TypeORM/pg. Nothing above it does.
      </p>
      <pre>
        <code>{`// ✅ Repository — data access only
export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.db.user.create({ data });
  }

  async updateById(id: string, data: Partial<UpdateUserData>): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  async findMany(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.db.$transaction([
      this.db.user.findMany({ where: filters, take: filters.limit, skip: filters.offset }),
      this.db.user.count({ where: filters }),
    ]);
    return { users, total };
  }
}

// Repository knows:
// - SQL/ORM queries
// - Database schema
// - Pagination, filtering, ordering at the DB level

// Repository does NOT know:
// - Business rules
// - Whether the caller is an HTTP handler or a background job
// - Email sending or any side effects`}</code>
      </pre>
      <MermaidDiagram
        chart={layeredArchDiagram}
        title="Controller → Service → Repository → DB"
        caption="Each layer only knows about the layer directly below it. This makes each layer independently testable and swappable."
        minHeight={440}
      />

      {/* ─── Q17 ─── */}
      <h2 id="fat-controllers">How do you avoid fat controllers?</h2>
      <p>
        A fat controller is one that contains business logic, database queries, or orchestration.
        The fix is always the same: move that logic down to a service or repository.
      </p>
      <pre>
        <code>{`// ❌ Fat controller — does everything
export const createOrder = asyncHandler(async (req, res) => {
  const { userId, items } = req.body;

  // DB query in controller — wrong layer
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Business logic in controller — wrong layer
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (total > user.creditLimit) return res.status(400).json({ error: "Over credit limit" });

  // Email sending in controller — wrong layer
  await sendOrderConfirmationEmail(user.email, items);

  const order = await prisma.order.create({ data: { userId, items, total } });
  res.status(201).json({ data: order });
});

// ✅ Thin controller — delegates everything
export const createOrder = asyncHandler(async (req, res) => {
  const dto = CreateOrderSchema.parse(req.body);
  const order = await orderService.create(req.user!.id, dto); // ← service handles all logic
  res.status(201).json({ data: toOrderDto(order) });
});

// All the logic moved to orderService.create():
// - fetch user, check credit limit → business rule
// - create order → repository call
// - send email → service orchestration
// Controller: parse input, call service, format response. Nothing else.`}</code>
      </pre>

      {/* ─── Q18 ─── */}
      <h2 id="project-structure">How do you structure an Express project for maintainability?</h2>
      <pre>
        <code>{`src/
├── app.ts                    // Express app factory (no listen) — importable in tests
├── server.ts                 // createServer + listen + graceful shutdown signals
├── config.ts                 // validated env config with Zod (single source of truth)
│
├── routers/                  // HTTP routing layer
│   ├── index.ts              // mounts all routers into apiRouter
│   ├── users.router.ts
│   └── orders.router.ts
│
├── controllers/              // HTTP handlers — input/output only, no logic
│   ├── users.controller.ts
│   └── orders.controller.ts
│
├── services/                 // Business logic — no HTTP, no DB details
│   ├── users.service.ts
│   └── orders.service.ts
│
├── repositories/             // Data access — all DB queries live here
│   ├── users.repository.ts
│   └── orders.repository.ts
│
├── middleware/               // Reusable middleware functions
│   ├── authenticate.ts       // JWT verification
│   ├── authorize.ts          // role/permission checks
│   ├── validate.ts           // Zod validation factory
│   └── async-handler.ts
│
├── errors/                   // Custom error classes
│   └── index.ts
│
├── lib/                      // Infrastructure singletons
│   ├── prisma.ts             // PrismaClient instance
│   └── redis.ts              // Redis client instance
│
├── schemas/                  // Zod schemas and inferred types
│   ├── user.schema.ts
│   └── order.schema.ts
│
└── types/
    └── express.d.ts          // Module augmentation: req.user, req.requestId`}</code>
      </pre>

      {/* ─── Q19 ─── */}
      <h2 id="api-versioning">How do you version APIs in Express?</h2>
      <MermaidDiagram
        chart={versioningDiagram}
        title="Three API Versioning Strategies"
        caption="URL versioning is the most widely used — it is explicit, cacheable, and easy to route. Header versioning is cleaner but harder to test and cache. Query param versioning is rare."
        minHeight={300}
      />
      <pre>
        <code>{`// Strategy 1: URL versioning (recommended for most APIs)
// Simple, explicit, easy to test in a browser/curl
app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);

// v2Router can import and reuse v1 handlers it hasn't changed:
import { listUsers } from "../v1/users.controller";
v2Router.get("/users", listUsers);         // unchanged — reuse v1
v2Router.post("/users", createUserV2);    // changed — new handler

// Strategy 2: Header versioning
// Cleaner URLs but harder to test / cache
app.use("/api", (req, res, next) => {
  const version = req.headers["api-version"] ?? "1";
  req.apiVersion = version;
  next();
});

app.get("/api/users", (req, res, next) => {
  if (req.apiVersion === "2") return getUsersV2(req, res, next);
  return getUsersV1(req, res, next);
});

// Strategy 3: Deprecation pattern — version routes but signal sunset date
app.use("/api/v1", (req, res, next) => {
  res.set("Sunset", "2025-12-31"); // RFC 8594 — tells clients when v1 dies
  res.set("Deprecation", "true");
  next();
}, v1Router);

app.use("/api/v2", v2Router); // current version — no headers`}</code>
      </pre>

      {/* ─── Q20 ─── */}
      <h2 id="handle-404">How do you handle 404 routes?</h2>
      <p>
        Register a catch-all middleware <strong>after all your routes</strong> but{" "}
        <strong>before the error handler</strong>. Express only reaches it if no route matched.
      </p>
      <pre>
        <code>{`// app.ts — order matters!

// 1. All routes registered first
app.use("/auth", authRouter);
app.use("/api/v1", apiRouter);

// 2. 404 handler — after all routes, before error handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: \`Route \${req.method} \${req.path} not found\`,
      code: "NOT_FOUND",
    },
  });
});

// 3. Error handler — always last
app.use(errorHandler);

// Why this order matters:
// If a real route throws, it goes to errorHandler (not the 404 handler)
// If no route matches at all, it falls through to the 404 handler
// If the 404 handler called next(err), it would hit the error handler

// For REST APIs: always return JSON for 404, not HTML
// Express's default 404 page sends HTML — useless for API clients

// Bonus: differentiate resource 404 from route 404
// Route not found → 404 in the catch-all above (route doesn't exist)
// Resource not found → throw new NotFoundError("User") in the service
//                      → caught by asyncHandler → errorHandler → 404 JSON response
// Both return 404 but for different reasons — track them separately in monitoring`}</code>
      </pre>
    </div>
  );
}
