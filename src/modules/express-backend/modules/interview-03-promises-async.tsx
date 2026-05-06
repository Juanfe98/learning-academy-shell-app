import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const promiseStateDiagram = String.raw`flowchart LR
    P["Promise\n(pending)"]
    F["fulfilled\n.then() runs"]
    R["rejected\n.catch() runs"]
    S["settled\n(terminal state)"]

    P -->|"resolve(value)"| F
    P -->|"reject(error)"| R
    F --> S
    R --> S`;

const promiseAllDiagram = String.raw`flowchart TD
    subgraph ALL["Promise.all — fails fast"]
        A1["P1 ✅"] & A2["P2 ❌"] & A3["P3 ✅"]
        A2 -->|"first rejection"| AFAIL["reject immediately\n(P1 and P3 still run but results discarded)"]
    end
    subgraph SETTLED["Promise.allSettled — waits for all"]
        B1["P1 ✅"] & B2["P2 ❌"] & B3["P3 ✅"]
        B1 & B2 & B3 --> BDONE["resolve with array of\n{ status, value/reason }"]
    end
    subgraph RACE["Promise.race — first to settle wins"]
        C1["P1 (slow)"] & C2["P2 (fast ✅)"] & C3["P3 (slow)"]
        C2 -->|"resolves first"| CWIN["resolve with P2's value"]
    end
    subgraph ANY["Promise.any — first to FULFILL wins"]
        D1["P1 ❌"] & D2["P2 ❌"] & D3["P3 ✅"]
        D3 -->|"first fulfillment"| DWIN["resolve with P3's value\n(ignores rejections)"]
    end`;

const errorHierarchyDiagram = String.raw`classDiagram
    class Error {
        +message string
        +stack string
        +name string
    }
    class AppError {
        +statusCode number
        +code string
        +isOperational boolean
    }
    class ValidationError {
        +details object[]
        +statusCode = 400
    }
    class NotFoundError {
        +resource string
        +statusCode = 404
    }
    class UnauthorizedError {
        +statusCode = 401
    }
    class ForbiddenError {
        +statusCode = 403
    }
    class ConflictError {
        +statusCode = 409
    }

    Error <|-- AppError
    AppError <|-- ValidationError
    AppError <|-- NotFoundError
    AppError <|-- UnauthorizedError
    AppError <|-- ForbiddenError
    AppError <|-- ConflictError`;

const errorFlowDiagram = String.raw`flowchart TD
    REQ["HTTP Request"]
    REQ --> H["Route Handler\nasync (req, res) => { ... }"]
    H -->|"throws or rejects"| AH["asyncHandler wrapper\ncatches and calls next(err)"]
    AH --> GM["Global Error Middleware\n(err, req, res, next)"]
    GM -->|"instanceof AppError"| KNOWN["Send err.statusCode\n+ err.message"]
    GM -->|"unknown error"| UNKNOWN["Log full error\nSend 500 (no internals)"]
    H -->|"success"| RES["res.json(data)"]`;

export const toc: TocItem[] = [
  { id: "callbacks-vs-promises", title: "Callbacks vs promises", level: 2 },
  { id: "what-problem-promises-solve", title: "What problem do promises solve?", level: 2 },
  { id: "callback-hell", title: "What is callback hell?", level: 2 },
  { id: "promise-chaining", title: "What is promise chaining?", level: 2 },
  { id: "promise-combinators", title: "Promise.all vs allSettled vs race vs any", level: 2 },
  { id: "when-allsettled", title: "When to use Promise.allSettled?", level: 2 },
  { id: "promise-all-failure", title: "What happens when one fails in Promise.all?", level: 2 },
  { id: "async-await-errors", title: "Error handling with async/await", level: 2 },
  { id: "why-try-catch", title: "Why is try/catch needed around await?", level: 2 },
  { id: "unhandled-rejection", title: "What is an unhandled promise rejection?", level: 2 },
  { id: "prevent-rejections", title: "How to prevent unhandled promise rejections", level: 2 },
  { id: "throw-vs-return-error", title: "Throwing vs returning an error", level: 2 },
  { id: "custom-error-classes", title: "How to create custom error classes", level: 2 },
  { id: "why-extend-error", title: "Why extend the native Error class?", level: 2 },
  { id: "centralized-error-handling", title: "Centralized error handling in a backend API", level: 2 },
];

export default function InterviewPromisesAsync() {
  return (
    <div className="article-content">
      <p>
        Section 3 of 18 — Promises, async/await, and error handling. Every senior backend
        engineer needs these cold. Error handling in particular separates engineers who write
        working code from engineers who write <em>reliable</em> code.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="callbacks-vs-promises">What is the difference between callbacks and promises?</h2>
      <ArticleTable caption="Both are patterns for async results — promises are the modern standard" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Callbacks</th>
              <th>Promises</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Shape</strong></td>
              <td>Function passed as argument: <code>fn(err, result)</code></td>
              <td>Object returned that represents a future value</td>
            </tr>
            <tr>
              <td><strong>Error handling</strong></td>
              <td>Manual — check <code>if (err)</code> in every callback</td>
              <td>Built-in — <code>.catch()</code> or <code>try/catch</code> with await</td>
            </tr>
            <tr>
              <td><strong>Composability</strong></td>
              <td>Hard — nesting gets deep fast (callback hell)</td>
              <td>Easy — chain <code>.then()</code> or sequence with <code>await</code></td>
            </tr>
            <tr>
              <td><strong>Concurrent operations</strong></td>
              <td>Painful — must track all in-flight manually</td>
              <td>Built-in: <code>Promise.all()</code>, <code>Promise.race()</code></td>
            </tr>
            <tr>
              <td><strong>Still used?</strong></td>
              <td>Old Node.js APIs (fs, http core), EventEmitter</td>
              <td>All modern Node.js APIs and libraries</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// Callback style — classic Node.js
fs.readFile("data.json", "utf8", (err, data) => {
  if (err) {
    console.error("Failed:", err);
    return; // must return manually — no automatic error propagation
  }
  const parsed = JSON.parse(data);
  // success path here
});

// Promise style
fs.promises.readFile("data.json", "utf8")
  .then((data) => JSON.parse(data))
  .catch((err) => console.error("Failed:", err));

// async/await style (most readable)
try {
  const data = await fs.promises.readFile("data.json", "utf8");
  const parsed = JSON.parse(data);
} catch (err) {
  console.error("Failed:", err);
}

// Convert any callback-style API to a promise with promisify
import { promisify } from "node:util";
const readFile = promisify(fs.readFile);
const data = await readFile("data.json", "utf8");`}</code>
      </pre>

      {/* ─── Q2 ─── */}
      <h2 id="what-problem-promises-solve">What problem do promises solve?</h2>
      <p>
        Promises solve three problems with callbacks:
      </p>
      <ol>
        <li>
          <strong>Callback hell</strong> — deeply nested callbacks become unreadable. Promises
          flatten async sequences.
        </li>
        <li>
          <strong>Error propagation</strong> — with callbacks, you must manually check and pass
          errors at every level. Promise rejections propagate automatically to the nearest
          <code>.catch()</code>.
        </li>
        <li>
          <strong>Inversion of control</strong> — with callbacks, you hand your function to a
          library and trust it calls it once, correctly. With promises, you get the result object
          back and control what happens with it.
        </li>
      </ol>
      <MermaidDiagram
        chart={promiseStateDiagram}
        title="Promise State Machine"
        caption="A promise starts pending. It settles exactly once — either fulfilled (resolve called) or rejected (reject called). Settled state is final."
        minHeight={260}
      />

      {/* ─── Q3 ─── */}
      <h2 id="callback-hell">What is callback hell?</h2>
      <p>
        Callback hell (also called the &quot;pyramid of doom&quot;) is what happens when you
        nest async operations inside each other. Each level adds indentation, error handling
        becomes repetitive, and the flow is nearly impossible to follow.
      </p>
      <pre>
        <code>{`// ❌ Callback hell — 3 async operations chained
getUserById(userId, (err, user) => {
  if (err) return handleError(err);

  getOrdersByUser(user.id, (err, orders) => {
    if (err) return handleError(err);

    getProductsForOrders(orders, (err, products) => {
      if (err) return handleError(err);

      // Finally do something with the data
      // Now imagine 2 more levels deep...
      res.json({ user, orders, products });
    });
  });
});

// ✅ Same logic with async/await — reads top-to-bottom like synchronous code
try {
  const user = await getUserById(userId);
  const orders = await getOrdersByUser(user.id);
  const products = await getProductsForOrders(orders);
  res.json({ user, orders, products });
} catch (err) {
  handleError(err); // ONE catch for all three operations
}`}</code>
      </pre>
      <p>
        <strong>Note:</strong> the sequential await version above is still correct — but if{" "}
        <code>orders</code> and <code>products</code> don&apos;t depend on each other, use{" "}
        <code>Promise.all()</code> to run them concurrently.
      </p>

      {/* ─── Q4 ─── */}
      <h2 id="promise-chaining">What is promise chaining?</h2>
      <p>
        Promise chaining is using <code>.then()</code> sequentially. Each <code>.then()</code>{" "}
        receives the resolved value of the previous one and can return a new promise — creating a
        pipeline. A single <code>.catch()</code> at the end catches any rejection in the chain.
      </p>
      <pre>
        <code>{`// Promise chaining
fetchUser(userId)
  .then((user) => fetchOrders(user.id))    // returns a new Promise
  .then((orders) => enrichOrders(orders))  // receives the orders
  .then((enriched) => {
    res.json({ orders: enriched });
  })
  .catch((err) => {
    // catches ANY rejection from fetchUser, fetchOrders, or enrichOrders
    res.status(500).json({ error: err.message });
  })
  .finally(() => {
    // always runs — whether resolved or rejected (cleanup)
    logger.info("Request complete");
  });

// Equivalent with async/await (more readable for sequences)
try {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(user.id);
  const enriched = await enrichOrders(orders);
  res.json({ orders: enriched });
} catch (err) {
  res.status(500).json({ error: err.message });
} finally {
  logger.info("Request complete");
}

// Common chaining mistake: forgetting to RETURN the inner promise
fetchUser(userId)
  .then((user) => {
    fetchOrders(user.id); // ❌ missing return — chain doesn't wait for this!
  })
  .then((orders) => {
    console.log(orders); // undefined — the previous then resolved with undefined
  });`}</code>
      </pre>

      {/* ─── Q5 ─── */}
      <h2 id="promise-combinators">What is the difference between Promise.all, Promise.allSettled, Promise.race, and Promise.any?</h2>
      <MermaidDiagram
        chart={promiseAllDiagram}
        title="Promise Combinators — Behavior Comparison"
        caption="Each combinator handles failure differently. Pick the one that matches your failure tolerance."
        minHeight={620}
      />
      <pre>
        <code>{`// Promise.all — run concurrently, ALL must succeed
// Rejects immediately if ANY promise rejects (fail-fast)
const [user, orders, settings] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchSettings(id),
]);
// If fetchOrders rejects → Promise.all rejects → you get no data at all

// Promise.allSettled — run concurrently, wait for ALL regardless of outcome
// Always resolves with an array of { status, value/reason }
const results = await Promise.allSettled([fetchUser(id), fetchOrders(id), fetchSettings(id)]);
for (const result of results) {
  if (result.status === "fulfilled") console.log("Got:", result.value);
  else console.error("Failed:", result.reason);
}

// Promise.race — first to SETTLE (resolve OR reject) wins, rest are ignored
const data = await Promise.race([
  fetchFromPrimaryDB(id),
  fetchFromReplicaDB(id),   // race between primary and replica — fastest wins
]);

// Timeout pattern with Promise.race:
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(\`Timed out after \${ms}ms\`)), ms)
    ),
  ]);

// Promise.any — first to FULFILL wins (ignores rejections)
// Only rejects if ALL promises reject (AggregateError)
const fastestResult = await Promise.any([
  fetchFromCDN1(resource),
  fetchFromCDN2(resource),
  fetchFromCDN3(resource),
]); // uses whichever CDN responds first successfully`}</code>
      </pre>
      <ArticleTable caption="Quick decision guide" minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Combinator</th>
              <th>Use when</th>
              <th>Rejects when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Promise.all</code></td>
              <td>All results required — if any fail, the whole operation fails</td>
              <td>First rejection</td>
            </tr>
            <tr>
              <td><code>Promise.allSettled</code></td>
              <td>Want all results regardless of individual failures</td>
              <td>Never (always resolves)</td>
            </tr>
            <tr>
              <td><code>Promise.race</code></td>
              <td>Want the fastest result — or implement timeouts</td>
              <td>First rejection (if that comes first)</td>
            </tr>
            <tr>
              <td><code>Promise.any</code></td>
              <td>Any one success is enough (redundant sources, CDN fallback)</td>
              <td>All reject (AggregateError)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q6 ─── */}
      <h2 id="when-allsettled">When would you use Promise.allSettled instead of Promise.all?</h2>
      <p>
        Use <code>Promise.allSettled</code> when partial failure is acceptable — you want to
        collect as much data as possible and handle each failure individually. Use{" "}
        <code>Promise.all</code> when all results are required and a single failure should abort
        the entire operation.
      </p>
      <pre>
        <code>{`// Example: dashboard that shows user + orders + notifications
// If notifications fail, still show user and orders
const [userResult, ordersResult, notifResult] = await Promise.allSettled([
  fetchUser(id),
  fetchOrders(id),
  fetchNotifications(id), // optional — allowed to fail
]);

const response = {
  user: userResult.status === "fulfilled" ? userResult.value : null,
  orders: ordersResult.status === "fulfilled" ? ordersResult.value : [],
  notifications: notifResult.status === "fulfilled" ? notifResult.value : [],
  errors: [userResult, ordersResult, notifResult]
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message),
};

// Promise.all would be wrong here — one failing notification service
// would cause the ENTIRE dashboard to return an error

// Type helper for allSettled results:
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

const values = results.filter(isFulfilled).map((r) => r.value);`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="promise-all-failure">What happens if one promise fails inside Promise.all?</h2>
      <p>
        <code>Promise.all</code> <strong>rejects immediately</strong> with the first rejection
        reason. The other promises are NOT cancelled — they keep running — but their results are
        discarded. This is the most important behaviour to understand about <code>Promise.all</code>.
      </p>
      <pre>
        <code>{`// One failure → whole Promise.all rejects
try {
  const [a, b, c] = await Promise.all([
    resolveAfter(100, "A"),
    rejectAfter(50, new Error("B failed")),  // fails first
    resolveAfter(200, "C"),
  ]);
} catch (err) {
  console.log(err.message); // "B failed"
  // "A" and "C" are still computing in the background but results are gone
}

// Real consequence: cleanup problem
// If promise 1 creates a DB record and promise 2 fails,
// the record from promise 1 is created but you have no result to use
// → use database transactions to roll back on failure instead

// Workaround: wrap each promise so it never rejects
const safePromise = <T>(p: Promise<T>) =>
  p.then((value) => ({ ok: true as const, value }))
   .catch((error) => ({ ok: false as const, error }));

const [a, b, c] = await Promise.all([
  safePromise(fetchA()),
  safePromise(fetchB()),
  safePromise(fetchC()),
]);
// Now Promise.all always resolves — check .ok on each result individually`}</code>
      </pre>

      {/* ─── Q8 ─── */}
      <h2 id="async-await-errors">How do you handle errors with async/await?</h2>
      <pre>
        <code>{`// Pattern 1: try/catch — most readable for sequential operations
async function getUser(id: string) {
  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("User");
    return user;
  } catch (err) {
    if (err instanceof NotFoundError) throw err; // re-throw known errors
    throw new Error(\`Failed to fetch user: \${err}\`); // wrap unknown errors
  }
}

// Pattern 2: .catch() on the promise — useful for inline defaults
const user = await db.user.findUnique({ where: { id } }).catch(() => null);
if (!user) return res.status(404).json({ error: "Not found" });

// Pattern 3: Result tuple — Go-style, no try/catch needed in callers
async function safeAsync<T>(p: Promise<T>): Promise<[Error | null, T | null]> {
  try {
    return [null, await p];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}

const [err, user] = await safeAsync(fetchUser(id));
if (err) return res.status(500).json({ error: err.message });
// user is now typed as User (non-null guaranteed)

// Pattern 4: asyncHandler — wrap route handlers to auto-catch
// (most important for Express — covered in Q15)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await fetchUser(req.params.id); // throws → caught → next(err)
  res.json(user);
}));`}</code>
      </pre>

      {/* ─── Q9 ─── */}
      <h2 id="why-try-catch">Why is try/catch needed around await?</h2>
      <p>
        <code>await</code> unwraps a promise. If the promise rejects, <code>await</code> throws
        the rejection reason as a synchronous error at that point in the function. Without{" "}
        <code>try/catch</code>, that thrown error becomes an unhandled promise rejection —
        which in Node.js 15+ crashes the process.
      </p>
      <pre>
        <code>{`// What await does under the hood:
// This:
const user = await fetchUser(id);

// Is roughly equivalent to:
fetchUser(id).then((user) => {
  // continue here on success
}).catch((err) => {
  // throw err at the await point — becomes unhandled if no try/catch
  throw err;
});

// Without try/catch — rejection becomes unhandled:
async function getUser(id: string) {
  const user = await fetchUser(id); // if fetchUser rejects → unhandled rejection
  return user;
}

// With try/catch — rejection is handled:
async function getUser(id: string) {
  try {
    const user = await fetchUser(id);
    return user;
  } catch (err) {
    throw new AppError(500, "Could not fetch user");
  }
}

// In Express without asyncHandler: must try/catch in every handler
app.get("/user/:id", async (req, res, next) => {
  try {
    const user = await fetchUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // manually pass to error middleware
  }
});

// With asyncHandler: no try/catch needed — wrapper does it
app.get("/user/:id", asyncHandler(async (req, res) => {
  const user = await fetchUser(req.params.id); // throws → asyncHandler catches → next(err)
  res.json(user);
}));`}</code>
      </pre>

      {/* ─── Q10 ─── */}
      <h2 id="unhandled-rejection">What is an unhandled promise rejection?</h2>
      <p>
        An unhandled promise rejection occurs when a promise rejects and no <code>.catch()</code>{" "}
        or <code>try/catch</code> handles it. In Node.js 15+, this <strong>crashes the
        process</strong> (exits with code 1). This is intentional — silently swallowing errors
        leads to corrupted state and invisible bugs.
      </p>
      <pre>
        <code>{`// ❌ Creates an unhandled rejection — process crashes in Node.js 15+
async function bad() {
  throw new Error("Something went wrong");
}
bad(); // called but not awaited, rejection goes nowhere

// ❌ Promise chain with no .catch()
fetch("https://api.example.com/data")
  .then((res) => res.json()); // if fetch rejects → no catch → unhandled

// ❌ Forgotten await in Express handler
app.get("/users", async (req, res) => {
  const users = getUsers(); // ← missing await — returns Promise, not users
  res.json(users); // sends the Promise object, not the data
  // if getUsers() rejects internally → unhandled rejection
});

// What happens in Node.js:
// - Node.js 14: prints warning, keeps running (dangerous — silent failure)
// - Node.js 15+: prints error, exits process (process.exit(1))
// - Both: emits 'unhandledRejection' event on process

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
  // Log to Sentry/Datadog here
  process.exit(1); // explicit crash is better than silent corruption
});`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="prevent-rejections">How do you prevent unhandled promise rejections?</h2>
      <pre>
        <code>{`// Prevention rule: every promise must either be awaited or have a .catch()

// ✅ Always await async calls in route handlers
app.get("/users", asyncHandler(async (req, res) => {
  const users = await getUsers(); // awaited — rejection caught by asyncHandler
  res.json(users);
}));

// ✅ asyncHandler wrapper — the most important pattern for Express
function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
    //                                         ^^^^ passes rejection to error middleware
  };
}

// ✅ Fire-and-forget with explicit error handling
// When you can't await (e.g., background work during a request):
sendWelcomeEmail(user.email).catch((err) => {
  logger.error({ err, userId: user.id }, "Failed to send welcome email");
  // Don't crash the request — email is non-critical
});

// ✅ Process-level last resort (not a replacement for proper handling)
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  process.exit(1); // crash fast — let process manager restart
});

// ✅ Run Node with --unhandled-rejections=throw (default in Node 15+)
// Makes unhandled rejections throw even in older Node versions`}</code>
      </pre>

      {/* ─── Q12 ─── */}
      <h2 id="throw-vs-return-error">What is the difference between throwing an error and returning an error?</h2>
      <pre>
        <code>{`// THROWING — transfers control to the nearest catch handler
// Use in async functions, route handlers, and service methods
async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User"); // exits function immediately
  return user; // only reached if user exists
}

// Caller handles it with try/catch or asyncHandler:
try {
  const user = await getUser(id);
  res.json(user);
} catch (err) {
  if (err instanceof NotFoundError) res.status(404).json({ error: err.message });
  else next(err);
}

// RETURNING AN ERROR OBJECT — caller must check explicitly
// Common in Go/Rust-style Result patterns
async function getUser(id: string): Promise<{ user: User | null; error: Error | null }> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { user: null, error: new NotFoundError("User") };
  return { user, error: null };
}

// Caller:
const { user, error } = await getUser(id);
if (error) return res.status(404).json({ error: error.message });
res.json(user);

// When to use which:
// throw: Express route handlers, service methods — integrates with error middleware
// return error: utility functions where caller needs to make complex decisions,
//               or when using the Result tuple pattern for explicit control flow`}</code>
      </pre>

      {/* ─── Q13 ─── */}
      <h2 id="custom-error-classes">How do you create custom error classes?</h2>
      <MermaidDiagram
        chart={errorHierarchyDiagram}
        title="Custom Error Hierarchy"
        caption="AppError is the base for all operational errors. Each subclass sets a default HTTP status code. Error middleware checks instanceof to decide how to respond."
        minHeight={540}
      />
      <pre>
        <code>{`// Base class — all your application errors extend this
class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean; // false = programmer bug, true = expected error

  constructor(statusCode: number, message: string, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name; // "NotFoundError", "ValidationError", etc.
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor); // clean stack trace
  }
}

// Subclasses — one per HTTP error type
class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, \`\${resource} not found\`, "NOT_FOUND");
  }
}

class ValidationError extends AppError {
  public readonly details: unknown[];
  constructor(message: string, details: unknown[] = []) {
    super(400, message, "VALIDATION_ERROR");
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, message, "FORBIDDEN");
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

// Usage in service methods:
async function createUser(email: string) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError("Email already registered");
  return db.user.create({ data: { email } });
}

async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User");
  return user;
}`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="why-extend-error">Why would you extend the native Error class?</h2>
      <p>
        Three reasons — all practical:
      </p>
      <pre>
        <code>{`// Reason 1: instanceof checks work correctly
// You can't do this reliably with plain objects or error codes
const err = new NotFoundError("User");
if (err instanceof NotFoundError) { /* ✅ true */ }
if (err instanceof AppError) { /* ✅ true — catches all app errors */ }
if (err instanceof Error) { /* ✅ true — works with any error handler */ }

// Reason 2: Stack traces are preserved and correct
// Error.captureStackTrace(this, this.constructor) removes the constructor
// from the stack — the trace starts where you threw, not inside the class
throw new NotFoundError("User");
// Stack: at getUser (user.service.ts:12) ← clear and useful
// Without captureStackTrace: at new NotFoundError (errors.ts:8) ← noise

// Reason 3: Extra properties alongside message and stack
const err = new ValidationError("Invalid input", [
  { field: "email", message: "must be a valid email" },
]);
err.statusCode; // 400
err.code;       // "VALIDATION_ERROR"
err.details;    // [{ field, message }]
err.stack;      // full stack trace (inherited from Error)

// In error middleware: check isOperational to decide how much to expose
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    // Safe to show to client — this is an expected error
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
  } else {
    // Unknown error — might be a bug. Log fully, show nothing to client.
    logger.error({ err }, "Unexpected error");
    res.status(500).json({ error: { message: "Internal server error" } });
  }
});`}</code>
      </pre>

      {/* ─── Q15 ─── */}
      <h2 id="centralized-error-handling">How would you design centralized error handling in a backend API?</h2>
      <MermaidDiagram
        chart={errorFlowDiagram}
        title="Centralized Error Handling Flow in Express"
        caption="Every async route is wrapped with asyncHandler. Errors flow to one global middleware. Known AppErrors get clean responses; unknown errors get logged fully and return 500."
        minHeight={420}
      />
      <pre>
        <code>{`// Step 1: asyncHandler — eliminates try/catch in every route
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Step 2: throw AppError subclasses from anywhere in your stack
// service.ts
export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User"); // ← just throw, middleware handles the rest
  return user;
}

// Step 3: routes stay clean — no error logic
app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  res.json({ data: user });
}));

// Step 4: one global error middleware (MUST be the last app.use)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log everything — even errors we show to users
  const isOperational = err instanceof AppError && err.isOperational;
  const logLevel = isOperational ? "warn" : "error";
  logger[logLevel]({ err, req: { method: req.method, url: req.url } }, err.message);

  // Known application error — safe to expose
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: { message: err.message, code: err.code },
    };
    if (err instanceof ValidationError) body.error = { ...body.error as object, details: err.details };
    res.status(err.statusCode).json(body);
    return;
  }

  // Prisma / DB constraint errors — map to 409
  if (err.message.includes("Unique constraint")) {
    res.status(409).json({ error: { message: "Resource already exists", code: "CONFLICT" } });
    return;
  }

  // Unknown error — could be a bug. Never leak internals.
  const isDev = process.env.NODE_ENV === "development";
  res.status(500).json({
    error: {
      message: isDev ? err.message : "Internal server error",
      ...(isDev && { stack: err.stack }),
    },
  });
});

// Step 5: handle 404 for unmatched routes (BEFORE the error middleware)
app.use((req, res) => {
  res.status(404).json({
    error: { message: \`Route \${req.method} \${req.path} not found\`, code: "NOT_FOUND" },
  });
});

// The result:
// - Routes contain zero error handling boilerplate
// - All errors route to one place for consistent logging and responses
// - AppErrors produce clean, predictable JSON
// - Unknown errors are logged fully but never expose internals to clients`}</code>
      </pre>
    </div>
  );
}
