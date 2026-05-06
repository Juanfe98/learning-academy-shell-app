import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const offsetPaginationDiagram = String.raw`flowchart LR
    DB[("Table: 10,000 rows")]
    Q1["Page 1\nSELECT * LIMIT 20 OFFSET 0\nrows 1-20"]
    Q2["Page 2\nSELECT * LIMIT 20 OFFSET 20\nrows 21-40"]
    Q3["Page 500\nSELECT * LIMIT 20 OFFSET 9980\nDB scans 9,980 rows to skip!"]

    DB --> Q1
    DB --> Q2
    DB --> Q3`;

const cursorPaginationDiagram = String.raw`flowchart LR
    DB[("Table: 10,000 rows")]
    Q1["Page 1\nSELECT * WHERE id > 0\nORDER BY id LIMIT 20\nlast id = 20"]
    Q2["Page 2\nSELECT * WHERE id > 20\nORDER BY id LIMIT 20\nlast id = 40"]
    Q3["Page 500\nSELECT * WHERE id > 9980\nORDER BY id LIMIT 20\nDB uses index — O(1)!"]

    DB --> Q1
    DB --> Q2
    DB --> Q3`;

const rateLimitDiagram = String.raw`sequenceDiagram
    participant C as Client
    participant RL as Rate Limiter\n(middleware)
    participant H as Route Handler

    C->>RL: Request 1 (counter: 1/100)
    RL->>H: allowed
    H-->>C: 200 OK\nX-RateLimit-Remaining: 99

    C->>RL: Request 100 (counter: 100/100)
    RL->>H: allowed
    H-->>C: 200 OK\nX-RateLimit-Remaining: 0

    C->>RL: Request 101 (over limit)
    RL-->>C: 429 Too Many Requests\nRetry-After: 47`;

export const toc: TocItem[] = [
  { id: "what-is-rest", title: "What is REST?", level: 2 },
  { id: "restful-routes", title: "What are RESTful routes?", level: 2 },
  { id: "http-methods", title: "GET, POST, PUT, PATCH, DELETE differences", level: 2 },
  { id: "idempotency", title: "What is idempotency?", level: 2 },
  { id: "idempotent-methods", title: "Which HTTP methods are idempotent?", level: 2 },
  { id: "post-idempotent", title: "Is POST idempotent?", level: 2 },
  { id: "patch-idempotent", title: "Can PATCH be idempotent?", level: 2 },
  { id: "put-vs-patch", title: "PUT vs PATCH", level: 2 },
  { id: "status-codes", title: "When to return 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409 / 500", level: 2 },
  { id: "pagination", title: "What is pagination?", level: 2 },
  { id: "pagination-strategies", title: "Pagination strategies", level: 2 },
  { id: "offset-pagination", title: "What is offset pagination?", level: 2 },
  { id: "cursor-pagination", title: "What is cursor-based pagination?", level: 2 },
  { id: "cursor-vs-offset", title: "When is cursor pagination better than offset?", level: 2 },
  { id: "filtering-sorting", title: "Filtering and sorting in an API", level: 2 },
  { id: "validation-errors", title: "Handling validation errors in an API", level: 2 },
  { id: "standardize-errors", title: "Standardizing API error responses", level: 2 },
  { id: "backward-compatibility", title: "Backward compatibility in APIs", level: 2 },
  { id: "api-versioning", title: "What is API versioning?", level: 2 },
  { id: "rate-limiting", title: "What is rate limiting?", level: 2 },
];

export default function InterviewRestApiDesign() {
  return (
    <div className="article-content">
      <p>
        Section 5 of 18 — REST API design. Senior engineers are expected to know HTTP semantics
        deeply — not just which verb to use, but why, and what happens when you get it wrong.
        These questions separate engineers who use REST from engineers who design it well.
      </p>

      {/* ─── Q1 ─── */}
      <h2 id="what-is-rest">What is REST?</h2>
      <p>
        REST (Representational State Transfer) is an architectural style for distributed
        hypermedia systems, defined by Roy Fielding in 2000. It is not a protocol or a standard
        — it is a set of constraints. An API that follows these constraints is called RESTful.
      </p>
      <p>
        The two constraints that matter day-to-day:
      </p>
      <ul>
        <li>
          <strong>Statelessness:</strong> every request contains all the information the server
          needs to process it. No server-side session state between requests. Auth credentials
          (JWT, API key) travel with every request. This is what makes horizontal scaling simple
          — any server can handle any request.
        </li>
        <li>
          <strong>Uniform interface:</strong> resources are identified by URIs (<code>/users/123</code>),
          interactions happen via standard HTTP methods (GET, POST, PUT, PATCH, DELETE), and
          responses use standard HTTP status codes and Content-Type headers.
        </li>
      </ul>
      <p>
        <strong>Practical note:</strong> most APIs called &quot;REST&quot; are actually just
        HTTP APIs — they use HTTP verbs and JSON but don&apos;t implement all REST constraints
        (particularly HATEOAS). That is fine for most use cases. What interviewers mean when
        they ask about REST is: correct HTTP semantics, consistent URL structure, and meaningful
        status codes.
      </p>

      {/* ─── Q2 ─── */}
      <h2 id="restful-routes">What are RESTful routes?</h2>
      <p>
        RESTful routes map HTTP methods to CRUD operations on resources. Resources are nouns
        (plural), never verbs. The combination of method + path describes the operation.
      </p>
      <ArticleTable caption="The standard RESTful route pattern — every senior engineer should know this cold" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Operation</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET</code></td>
              <td><code>/users</code></td>
              <td>List all users (with filtering/pagination)</td>
              <td>200 + array</td>
            </tr>
            <tr>
              <td><code>POST</code></td>
              <td><code>/users</code></td>
              <td>Create a new user</td>
              <td>201 + created resource</td>
            </tr>
            <tr>
              <td><code>GET</code></td>
              <td><code>/users/:id</code></td>
              <td>Get a specific user by ID</td>
              <td>200 + resource, or 404</td>
            </tr>
            <tr>
              <td><code>PUT</code></td>
              <td><code>/users/:id</code></td>
              <td>Replace a user entirely (full update)</td>
              <td>200 + updated resource</td>
            </tr>
            <tr>
              <td><code>PATCH</code></td>
              <td><code>/users/:id</code></td>
              <td>Partially update a user (only provided fields)</td>
              <td>200 + updated resource</td>
            </tr>
            <tr>
              <td><code>DELETE</code></td>
              <td><code>/users/:id</code></td>
              <td>Delete a user</td>
              <td>204 (no body)</td>
            </tr>
            <tr>
              <td><code>GET</code></td>
              <td><code>/users/:id/orders</code></td>
              <td>List orders for a specific user (nested resource)</td>
              <td>200 + array</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// ❌ Non-RESTful — verbs in URLs
GET  /getUser?id=123
POST /createUser
POST /deleteUser/123
POST /updateUserEmail

// ✅ RESTful — nouns + HTTP methods carry the meaning
GET    /users/123
POST   /users
DELETE /users/123
PATCH  /users/123     { "email": "new@example.com" }

// Nested resources — keep max 2 levels deep
GET  /users/:userId/orders          // user's orders
POST /users/:userId/orders          // create order for user
GET  /users/:userId/orders/:orderId // specific order
// Deeper than 2 levels: /users/:id/orders/:id/items/:id → use query params instead
GET  /items?orderId=123             // cleaner for 3+ levels`}</code>
      </pre>

      {/* ─── Q3 ─── */}
      <h2 id="http-methods">What is the difference between GET, POST, PUT, PATCH, and DELETE?</h2>
      <ArticleTable caption="HTTP methods — semantics, idempotency, and safety" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Purpose</th>
              <th>Idempotent</th>
              <th>Safe (read-only)</th>
              <th>Has body</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET</code></td>
              <td>Retrieve resource(s)</td>
              <td>✅ Yes</td>
              <td>✅ Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>POST</code></td>
              <td>Create a new resource or trigger an action</td>
              <td>❌ No</td>
              <td>❌ No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code>PUT</code></td>
              <td>Replace a resource entirely (full update)</td>
              <td>✅ Yes</td>
              <td>❌ No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code>PATCH</code></td>
              <td>Partial update — only provided fields change</td>
              <td>⚠️ Usually yes, not guaranteed</td>
              <td>❌ No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code>DELETE</code></td>
              <td>Delete a resource</td>
              <td>✅ Yes</td>
              <td>❌ No</td>
              <td>Rarely</td>
            </tr>
            <tr>
              <td><code>HEAD</code></td>
              <td>Like GET but returns headers only (no body)</td>
              <td>✅ Yes</td>
              <td>✅ Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>OPTIONS</code></td>
              <td>Return allowed methods (used by CORS preflight)</td>
              <td>✅ Yes</td>
              <td>✅ Yes</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q4 ─── */}
      <h2 id="idempotency">What is idempotency?</h2>
      <p>
        An operation is idempotent if calling it multiple times produces the same result as
        calling it once. The state of the server after N identical requests is the same as after
        1 request. This matters for reliability: if a network timeout means you don&apos;t know
        whether a request succeeded, you can safely retry an idempotent request without causing
        duplicate side effects.
      </p>
      <pre>
        <code>{`// Idempotent: DELETE /users/123
// First call:  deletes user 123, returns 204
// Second call: user already gone, returns 404 (or 204 with no-op)
// Server state after both calls: user 123 is gone — same result

// Idempotent: PUT /users/123 { name: "Alice", email: "alice@example.com" }
// Call it 10 times: user 123 always ends up with name=Alice, email=alice@example.com
// Server state is the same regardless of how many times you called it

// NOT idempotent: POST /orders
// First call:  creates order #1, charges card
// Second call: creates order #2, charges card again!
// Retrying on timeout = duplicate order = very bad

// This is why safe retrying of POST requires idempotency keys:
POST /orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
// Server stores the key + result — duplicate key = return cached result, no double charge`}</code>
      </pre>

      {/* ─── Q5 ─── */}
      <h2 id="idempotent-methods">Which HTTP methods are idempotent?</h2>
      <ArticleTable caption="Idempotency is about server state, not status codes — DELETE returning 404 on second call is still idempotent" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Idempotent?</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET</code></td>
              <td>✅ Yes</td>
              <td>Read-only — no server state changes</td>
            </tr>
            <tr>
              <td><code>HEAD</code></td>
              <td>✅ Yes</td>
              <td>Read-only headers — no state changes</td>
            </tr>
            <tr>
              <td><code>OPTIONS</code></td>
              <td>✅ Yes</td>
              <td>Read-only — returns allowed methods</td>
            </tr>
            <tr>
              <td><code>PUT</code></td>
              <td>✅ Yes</td>
              <td>Full replacement — same body = same end state</td>
            </tr>
            <tr>
              <td><code>DELETE</code></td>
              <td>✅ Yes</td>
              <td>Resource gone after first call — subsequent calls: already gone</td>
            </tr>
            <tr>
              <td><code>POST</code></td>
              <td>❌ No</td>
              <td>Creates new resources — each call can produce a new side effect</td>
            </tr>
            <tr>
              <td><code>PATCH</code></td>
              <td>⚠️ Depends</td>
              <td><code>{"{ email: 'x' }"}</code> is idempotent; <code>{"{ views: views + 1 }"}</code> is not</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q6 ─── */}
      <h2 id="post-idempotent">Is POST idempotent?</h2>
      <p>
        <strong>No.</strong> POST is explicitly non-idempotent by the HTTP specification. Each
        POST request is treated as a new operation — the server is not required to detect or
        deduplicate them. That is why browsers show &quot;Are you sure you want to resubmit?&quot;
        when you refresh a POST response.
      </p>
      <pre>
        <code>{`// POST is not idempotent by default
POST /payments { amount: 100, to: "alice" }
// Call 1: payment created — $100 sent to Alice
// Call 2 (retry on timeout): ANOTHER payment — $100 sent to Alice again!

// Making POST effectively idempotent: Idempotency Keys
// Client generates a unique key per logical operation (UUID v4)
// Server stores key → result mapping (in Redis or DB)
// Duplicate key → return stored result without re-executing

app.post("/payments", asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"] as string;
  if (!idempotencyKey) throw new ValidationError("Idempotency-Key header required");

  // Check if we've seen this key before
  const cached = await redis.get(\`idempotency:\${idempotencyKey}\`);
  if (cached) {
    res.status(200).json(JSON.parse(cached)); // return stored result
    return;
  }

  // Process the payment
  const payment = await paymentService.create(req.body);

  // Store result for 24h
  await redis.setex(\`idempotency:\${idempotencyKey}\`, 86400, JSON.stringify(payment));

  res.status(201).json(payment);
}));`}</code>
      </pre>

      {/* ─── Q7 ─── */}
      <h2 id="patch-idempotent">Can PATCH be idempotent?</h2>
      <p>
        Yes — but it depends on the patch semantics. If the patch describes an absolute state
        (<em>&quot;set email to x&quot;</em>), it is idempotent. If it describes a relative
        change (<em>&quot;increment views by 1&quot;</em>), it is not.
      </p>
      <pre>
        <code>{`// ✅ Idempotent PATCH — sets an absolute value
PATCH /users/123 { "email": "alice@example.com" }
// Call 1: email = alice@example.com
// Call 2: email = alice@example.com (same — idempotent)

// ❌ Non-idempotent PATCH — relative change
PATCH /posts/456 { "views": "+1" }
// Call 1: views = 1
// Call 2: views = 2 — NOT idempotent

// ❌ Non-idempotent PATCH — append to array
PATCH /lists/789 { "op": "append", "item": "task 1" }
// Each call adds another item — NOT idempotent

// In practice: most REST APIs use idempotent PATCH semantics
// (merge provided fields into the existing resource)`}</code>
      </pre>

      {/* ─── Q8 ─── */}
      <h2 id="put-vs-patch">What is the difference between PUT and PATCH?</h2>
      <pre>
        <code>{`// Current state: { id: 1, name: "Alice", email: "alice@example.com", role: "user" }

// PUT — FULL replacement. Fields not included are removed/nulled.
PUT /users/1 { "name": "Alice Updated", "email": "alice@example.com" }
// Result:       { id: 1, name: "Alice Updated", email: "alice@example.com", role: null }
//                                                                            ^^^^ GONE!
// Client must send ALL fields even if only changing one.

// PATCH — PARTIAL update. Only provided fields are changed. Others untouched.
PATCH /users/1 { "name": "Alice Updated" }
// Result:       { id: 1, name: "Alice Updated", email: "alice@example.com", role: "user" }
//                                               ^^^^ untouched     ^^^^ untouched

// In practice: most APIs use PATCH for updates — safer, simpler for clients
// PUT is useful when you want to enforce clients send complete representations

// Express implementation:
// PUT: replace entire object
router.put("/:id", asyncHandler(async (req, res) => {
  const { name, email, role } = req.body; // ALL fields required
  const user = await userService.replace(req.params.id, { name, email, role });
  res.json({ data: user });
}));

// PATCH: merge into existing object
router.patch("/:id", asyncHandler(async (req, res) => {
  const updates = UpdateUserSchema.parse(req.body); // all fields optional
  const user = await userService.update(req.params.id, updates);
  res.json({ data: user });
}));`}</code>
      </pre>

      {/* ─── Q9 ─── */}
      <h2 id="status-codes">When should you return 200, 201, 204, 400, 401, 403, 404, 409, and 500?</h2>
      <ArticleTable caption="Status codes are part of the contract — wrong codes break client logic and observability" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Meaning</th>
              <th>When to use</th>
              <th>Common mistake</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>200</strong></td>
              <td>OK</td>
              <td>Successful GET, PUT, PATCH — returns a body</td>
              <td>Returning 200 for everything (including errors)</td>
            </tr>
            <tr>
              <td><strong>201</strong></td>
              <td>Created</td>
              <td>Successful POST that created a resource — include the new resource in body + <code>Location</code> header</td>
              <td>Returning 200 on POST — loses create semantics</td>
            </tr>
            <tr>
              <td><strong>204</strong></td>
              <td>No Content</td>
              <td>Successful DELETE or action with no response body</td>
              <td>Returning 200 with empty body instead of 204</td>
            </tr>
            <tr>
              <td><strong>400</strong></td>
              <td>Bad Request</td>
              <td>Client sent invalid data — missing field, wrong type, failed validation</td>
              <td>Using 400 for auth errors (use 401/403)</td>
            </tr>
            <tr>
              <td><strong>401</strong></td>
              <td>Unauthorized</td>
              <td>Missing or invalid credentials — &quot;we don&apos;t know who you are&quot;</td>
              <td>Using 401 when you mean 403 — different client actions!</td>
            </tr>
            <tr>
              <td><strong>403</strong></td>
              <td>Forbidden</td>
              <td>Authenticated but not permitted — &quot;we know who you are, but you can&apos;t do this&quot;</td>
              <td>Using 401 for permission errors (wrong — client won&apos;t re-login)</td>
            </tr>
            <tr>
              <td><strong>404</strong></td>
              <td>Not Found</td>
              <td>Resource does not exist, or route doesn&apos;t exist</td>
              <td>Returning 404 for forbidden resources (leaks existence — use 403)</td>
            </tr>
            <tr>
              <td><strong>409</strong></td>
              <td>Conflict</td>
              <td>State conflict — duplicate email, concurrent update, version mismatch</td>
              <td>Using 400 for conflicts — loses specificity</td>
            </tr>
            <tr>
              <td><strong>500</strong></td>
              <td>Internal Server Error</td>
              <td>Unexpected server error — your code crashed</td>
              <td>Leaking stack traces or DB errors in the response body</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre>
        <code>{`// 401 vs 403 — the most commonly confused pair
// 401: "Who are you? Send credentials."
// Client should: redirect to login, refresh token, attach credentials
if (!req.user) throw new UnauthorizedError(); // → 401

// 403: "I know who you are. You're not allowed."
// Client should: show "Access denied" UI, don't retry with same credentials
if (req.user.role !== "admin") throw new ForbiddenError(); // → 403

// 404 for existence leak — sometimes you want 403 even when resource exists
// Example: GET /users/123/private-data
// If you return 404 when user exists but is private → reveals user doesn't have access
// If the goal is to not reveal existence → return 404 for both cases
// If revealing existence is fine → return 403

// 201 with Location header (best practice, often skipped)
app.post("/users", asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res
    .status(201)
    .set("Location", \`/api/v1/users/\${user.id}\`)
    .json({ data: user });
}));`}</code>
      </pre>

      {/* ─── Q10 ─── */}
      <h2 id="pagination">What is pagination?</h2>
      <p>
        Pagination is the practice of returning large datasets in smaller chunks rather than
        all at once. Without pagination, a <code>GET /users</code> on a table with 1 million
        rows would load all 1M rows from the database, serialize them all to JSON, and send a
        response that could be hundreds of megabytes — crashing both server memory and client
        parsing time.
      </p>
      <pre>
        <code>{`// Without pagination — dangerous
app.get("/users", async (req, res) => {
  const users = await db.user.findMany(); // 1M rows = OOM crash
  res.json(users);
});

// With pagination — safe and predictable
app.get("/users", async (req, res) => {
  const { page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, parseInt(limit as string, 10)); // cap at 100

  const [users, total] = await Promise.all([
    db.user.findMany({ take: limitNum, skip: (pageNum - 1) * limitNum }),
    db.user.count(),
  ]);

  res.json({
    data: users,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum * limitNum < total,
    },
  });
});`}</code>
      </pre>

      {/* ─── Q11 ─── */}
      <h2 id="pagination-strategies">What pagination strategies do you know?</h2>
      <ArticleTable caption="Three main strategies — each has tradeoffs" minWidth={880}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>How it works</th>
              <th>Best for</th>
              <th>Main weakness</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Offset / Page</strong></td>
              <td><code>LIMIT 20 OFFSET 40</code></td>
              <td>Admin dashboards, small datasets, random access</td>
              <td>Slow at high offsets; items shift if data mutates</td>
            </tr>
            <tr>
              <td><strong>Cursor-based</strong></td>
              <td><code>WHERE id &gt; cursor LIMIT 20</code></td>
              <td>Feeds, timelines, large datasets, stable ordering</td>
              <td>No random page access; must keep cursor state</td>
            </tr>
            <tr>
              <td><strong>Keyset / Seek</strong></td>
              <td>Multi-column cursor: <code>WHERE (created_at, id) &gt; (ts, id)</code></td>
              <td>Complex sort orders with stable pagination</td>
              <td>More complex query; index design critical</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q12 ─── */}
      <h2 id="offset-pagination">What is offset pagination?</h2>
      <MermaidDiagram
        chart={offsetPaginationDiagram}
        title="Offset Pagination — DB Must Scan to Skip"
        caption="Offset pagination is simple but becomes slow at high page numbers. Getting page 500 requires the DB to scan 9,980 rows just to skip them."
        minHeight={300}
      />
      <pre>
        <code>{`// Request: GET /users?page=3&limit=20
const page = 3;
const limit = 20;
const offset = (page - 1) * limit; // 40

const users = await db.user.findMany({
  take: limit,
  skip: offset,
  orderBy: { createdAt: "desc" },
});

// Response envelope
res.json({
  data: users,
  meta: {
    page,
    limit,
    total: await db.user.count(),
    totalPages: Math.ceil(total / limit),
  },
});

// Problems:
// 1. Performance: SELECT * LIMIT 20 OFFSET 9980 scans 10,000 rows to return 20
// 2. Drift: if a user is inserted between page 1 and page 2 request,
//    the last item of page 1 now appears as the first item of page 2 (duplicate)
//    or items shift and you miss some (skip)`}</code>
      </pre>

      {/* ─── Q13 ─── */}
      <h2 id="cursor-pagination">What is cursor-based pagination?</h2>
      <MermaidDiagram
        chart={cursorPaginationDiagram}
        title="Cursor Pagination — O(1) Regardless of Page Depth"
        caption="Cursor pagination uses a WHERE clause on an indexed column. The DB jumps directly to the right row via the index — no scanning. Performance is constant regardless of how deep you paginate."
        minHeight={300}
      />
      <pre>
        <code>{`// First page — no cursor
GET /users?limit=20

// Response includes cursor pointing to last item
{
  "data": [...20 users...],
  "meta": {
    "nextCursor": "eyJpZCI6MjB9",  // base64("{"id":20}") — opaque to client
    "hasNextPage": true
  }
}

// Next page — client sends cursor back
GET /users?limit=20&cursor=eyJpZCI6MjB9

// Server implementation:
const cursor = req.query.cursor
  ? JSON.parse(Buffer.from(req.query.cursor as string, "base64").toString())
  : undefined;

const users = await db.user.findMany({
  take: limit + 1,  // fetch one extra to check if there's a next page
  where: cursor ? { id: { gt: cursor.id } } : undefined,
  orderBy: { id: "asc" },
});

const hasNextPage = users.length > limit;
if (hasNextPage) users.pop(); // remove the extra item

const nextCursor = hasNextPage
  ? Buffer.from(JSON.stringify({ id: users.at(-1)!.id })).toString("base64")
  : null;

res.json({ data: users, meta: { nextCursor, hasNextPage } });`}</code>
      </pre>

      {/* ─── Q14 ─── */}
      <h2 id="cursor-vs-offset">When is cursor pagination better than offset pagination?</h2>
      <ArticleTable caption="Use cursor for feeds and large data; offset for admin tables and small data" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Offset Pagination</th>
              <th>Cursor Pagination</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Performance at depth</strong></td>
              <td>O(offset) — gets slower as page number grows</td>
              <td>O(1) — always fast regardless of depth (uses index)</td>
            </tr>
            <tr>
              <td><strong>Data consistency</strong></td>
              <td>Items can appear twice or be skipped if data mutates between pages</td>
              <td>Stable — cursor anchors to a specific row</td>
            </tr>
            <tr>
              <td><strong>Random access</strong></td>
              <td>Yes — jump to page 50 directly</td>
              <td>No — must iterate sequentially from the start</td>
            </tr>
            <tr>
              <td><strong>UI pattern</strong></td>
              <td>Numbered pages: 1, 2, 3...</td>
              <td>Infinite scroll / &quot;load more&quot; button</td>
            </tr>
            <tr>
              <td><strong>Use when</strong></td>
              <td>Admin dashboards, reports, small datasets (&lt;10K rows)</td>
              <td>Activity feeds, timelines, large tables, mobile apps</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      {/* ─── Q15 ─── */}
      <h2 id="filtering-sorting">How do you design filtering and sorting in an API?</h2>
      <pre>
        <code>{`// Filtering — use query params, always validate with Zod
// GET /users?role=admin&status=active&createdAfter=2024-01-01

const FiltersSchema = z.object({
  role: z.enum(["admin", "user", "moderator"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  search: z.string().max(100).optional(),          // full-text search term
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

const filters = FiltersSchema.parse(req.query);

const where = {
  ...(filters.role && { role: filters.role }),
  ...(filters.status && { status: filters.status }),
  ...(filters.search && {
    OR: [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ],
  }),
  ...(filters.createdAfter && { createdAt: { gte: filters.createdAfter } }),
};

// Sorting — whitelist allowed fields to prevent arbitrary column exposure
// GET /users?sortBy=name&sortOrder=desc

const SortSchema = z.object({
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const { sortBy, sortOrder } = SortSchema.parse(req.query);

const users = await db.user.findMany({
  where,
  orderBy: { [sortBy]: sortOrder },
  take: limit,
  skip: offset,
});

// ❌ Never: orderBy: { [req.query.sortBy]: req.query.sortOrder }
// ← allows sorting by ANY column including sensitive computed fields`}</code>
      </pre>

      {/* ─── Q16 ─── */}
      <h2 id="validation-errors">How do you handle validation errors in an API?</h2>
      <pre>
        <code>{`// Validation should happen at the boundary — before business logic runs
// Use Zod for schema validation and produce structured error responses

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Must be a valid email"),
  age: z.number().int().min(18, "Must be at least 18"),
  role: z.enum(["admin", "user"]).default("user"),
});

// Validation middleware factory — reusable
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }
    req.body = result.data; // replace with parsed + transformed data
    next();
  };
}

// Usage
app.post("/users", validate(CreateUserSchema), createUser);

// Error response clients receive:
// {
//   "error": {
//     "message": "Validation failed",
//     "code": "VALIDATION_ERROR",
//     "details": [
//       { "field": "email", "message": "Must be a valid email" },
//       { "field": "age", "message": "Must be at least 18" }
//     ]
//   }
// }`}</code>
      </pre>

      {/* ─── Q17 ─── */}
      <h2 id="standardize-errors">How do you standardize API error responses?</h2>
      <p>
        Pick one error envelope and use it everywhere. Inconsistent error shapes are the most
        common API usability complaint from frontend teams. The key fields: a machine-readable
        <code>code</code>, a human-readable <code>message</code>, and optional <code>details</code>{" "}
        for validation errors.
      </p>
      <pre>
        <code>{`// Standard error envelope — use this shape for every error response
interface ApiErrorResponse {
  error: {
    message: string;     // human-readable, safe to show to users
    code: string;        // machine-readable, for client logic
    details?: Array<{    // only for validation errors
      field: string;
      message: string;
    }>;
    requestId?: string;  // for support/debugging correlation
  };
}

// Examples:
// 400 Validation error:
{ "error": { "message": "Validation failed", "code": "VALIDATION_ERROR",
  "details": [{ "field": "email", "message": "Invalid email" }] } }

// 401 Auth error:
{ "error": { "message": "Authentication required", "code": "UNAUTHORIZED" } }

// 404 Not found:
{ "error": { "message": "User not found", "code": "NOT_FOUND" } }

// 409 Conflict:
{ "error": { "message": "Email already registered", "code": "CONFLICT" } }

// 500 Server error (NEVER expose internals):
{ "error": { "message": "Internal server error", "code": "INTERNAL_ERROR" } }

// Also standardize success envelopes:
// Single resource:  { "data": { ...user } }
// List:             { "data": [...users], "meta": { total, page, limit } }
// Action (no data): 204 No Content (no body)`}</code>
      </pre>

      {/* ─── Q18 ─── */}
      <h2 id="backward-compatibility">How do you handle backward compatibility in APIs?</h2>
      <p>
        Backward compatibility means existing clients continue to work after you deploy changes.
        Breaking changes force all clients to update simultaneously — very painful when you have
        mobile apps, third-party integrations, or public APIs.
      </p>
      <pre>
        <code>{`// ✅ Non-breaking changes — safe to deploy without a new version
// - Adding a new optional field to a response
// - Adding a new optional query parameter
// - Adding a new endpoint entirely
// - Loosening validation (accepting more values)

// ❌ Breaking changes — require a new API version
// - Removing a field from a response
// - Renaming a field
// - Changing a field's type (string → number)
// - Making an optional parameter required
// - Changing the meaning of an existing field
// - Changing status codes

// Strategy 1: Additive changes (prefer this)
// Old response: { id, name, email }
// New response: { id, name, email, role }  ← clients ignore unknown fields (safe)

// Strategy 2: Sunset headers — give clients time to migrate
app.use("/api/v1", (req, res, next) => {
  res.set("Sunset", "Sat, 31 Dec 2025 23:59:59 GMT");
  res.set("Deprecation", \`"2025-01-01"\`); // RFC 8594
  res.set("Link", '</api/v2/docs>; rel="successor-version"');
  next();
}, v1Router);

// Strategy 3: Field expansion — never remove, just add new preferred field
// Old: { "userId": "123" }          ← deprecated but kept
// New: { "userId": "123", "id": "123" } ← new preferred field added alongside

// Strategy 4: Transform layer — map old shape to new internally
// Store data in new shape, serve old shape to v1 clients via a mapper
function toV1UserDto(user: User): V1UserDto {
  return { userId: user.id, userName: user.name }; // old field names
}
function toV2UserDto(user: User): V2UserDto {
  return { id: user.id, name: user.name }; // new field names
}`}</code>
      </pre>

      {/* ─── Q19 ─── */}
      <h2 id="api-versioning">What is API versioning?</h2>
      <p>
        API versioning is the practice of maintaining multiple versions of an API simultaneously
        so clients can migrate at their own pace rather than all at once. It is necessary when
        you need to make breaking changes.
      </p>
      <pre>
        <code>{`// The three strategies:

// 1. URL path versioning (most common — clear, cacheable, testable)
app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);
// GET /api/v1/users → old behavior
// GET /api/v2/users → new behavior

// 2. Request header versioning (cleaner URLs, harder to test)
app.use("/api", versionRouter);
// Client sends: API-Version: 2025-01-01
const version = req.headers["api-version"] ?? "latest";

// 3. Accept header (content negotiation — most "correct" per REST, rarely used)
// Client sends: Accept: application/vnd.myapi.v2+json

// Managing multiple versions without duplication:
// v2Router reuses v1 handlers that haven't changed
import { getUser, listUsers } from "../v1/users.controller";  // unchanged
import { createUser } from "./users.controller";               // new v2 version

v2Router.get("/users", listUsers);      // same as v1
v2Router.get("/users/:id", getUser);    // same as v1
v2Router.post("/users", createUser);    // new v2 behavior only`}</code>
      </pre>

      {/* ─── Q20 ─── */}
      <h2 id="rate-limiting">What is rate limiting?</h2>
      <p>
        Rate limiting caps how many requests a client can make in a time window. Without it, a
        single client can overwhelm your server with requests — whether from a bug, a scraper,
        or an attacker — degrading service for everyone.
      </p>
      <MermaidDiagram
        chart={rateLimitDiagram}
        title="Rate Limiting — 429 After Limit Exceeded"
        caption="The rate limiter middleware checks a counter (in Redis for multi-instance deployments) before each request reaches your route handlers."
        minHeight={380}
      />
      <pre>
        <code>{`import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "./lib/redis";

// Basic rate limit — in-memory (fine for single instance)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,     // send X-RateLimit-* headers
  legacyHeaders: false,
  message: { error: { message: "Too many requests", code: "RATE_LIMITED" } },
});

// Production: Redis store — works across multiple processes/pods
const productionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60,             // 60 requests per minute
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  keyGenerator: (req) => req.user?.id ?? req.ip, // rate limit by user ID (not IP)
});

// Different limits for different routes
app.use("/api", productionLimiter);

// Stricter limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,   // only 10 login attempts per 15 min
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
app.use("/auth/login", authLimiter);

// Response headers clients receive:
// X-RateLimit-Limit: 60
// X-RateLimit-Remaining: 45
// X-RateLimit-Reset: 1703980800 (Unix timestamp when window resets)
// Retry-After: 47  (seconds until retry allowed — only on 429)`}</code>
      </pre>
    </div>
  );
}
