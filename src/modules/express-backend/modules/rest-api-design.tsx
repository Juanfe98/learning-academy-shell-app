import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const resourceHierarchyDiagram = String.raw`flowchart TD
    ROOT["/"]
    ROOT --> USERS["/users"]
    ROOT --> PRODUCTS["/products"]
    USERS --> USER_ID["/users/:userId"]
    USER_ID --> ORDERS["/users/:userId/orders"]
    USER_ID --> ADDRESSES["/users/:userId/addresses"]
    ORDERS --> ORDER_ID["/users/:userId/orders/:orderId"]
    ORDER_ID --> ITEMS["/users/:userId/orders/:orderId/items"]
    PRODUCTS --> PRODUCT_ID["/products/:productId"]
    PRODUCT_ID --> REVIEWS["/products/:productId/reviews"]`;

const paginationDiagram = String.raw`flowchart LR
    OFFSET["Offset Pagination\nGET /users?page=3&limit=20\nSELECT * LIMIT 20 OFFSET 40\n\nPros: jump to any page\nCons: slow at high offset,\nduplicate/skip on mutations"]
    CURSOR["Cursor Pagination\nGET /users?after=eyJpZCI6NX0&limit=20\nWHERE id > decoded_cursor LIMIT 20\n\nPros: O(1) regardless of depth,\nno duplicates on mutations\nCons: no random page access"]`;

export const toc: TocItem[] = [
  { id: "rest-constraints", title: "REST Constraints", level: 2 },
  { id: "http-methods", title: "HTTP Methods", level: 2 },
  { id: "resource-hierarchy", title: "Resource Hierarchy & URL Design", level: 2 },
  { id: "status-codes", title: "HTTP Status Codes", level: 2 },
  { id: "response-envelope", title: "Response Envelope Design", level: 2 },
  { id: "versioning", title: "API Versioning Strategies", level: 2 },
  { id: "filtering-sorting", title: "Filtering, Sorting & Pagination", level: 2 },
  { id: "pagination-patterns", title: "Pagination Patterns", level: 2 },
];

export default function RestApiDesign() {
  return (
    <div className="article-content">
      <p>
        REST is an architectural style, not a protocol. Most APIs called &quot;REST&quot; are
        actually just HTTP APIs — they use HTTP methods and status codes but don&apos;t comply with
        all REST constraints. That is fine for most use cases. What matters in practice: consistent
        URL structure, correct HTTP semantics, meaningful status codes, and a response format your
        clients can depend on.
      </p>

      <h2 id="rest-constraints">REST Constraints</h2>
      <p>
        Roy Fielding defined six constraints in his 2000 dissertation. Two have the most day-to-day
        relevance for API design:
      </p>
      <ul>
        <li>
          <strong>Statelessness:</strong> Every request contains all information needed to process it.
          The server holds no client session state between requests. Authentication credentials
          (JWT, API key) are sent with every request. This enables horizontal scaling — any server
          instance can handle any request.
        </li>
        <li>
          <strong>Uniform Interface:</strong> Resources are identified by URIs. Interactions are via
          representations (JSON). Self-descriptive messages (HTTP methods + headers). HATEOAS
          (hypermedia links in responses) is rarely implemented in practice.
        </li>
      </ul>
      <p>
        The other four — client-server separation, layered system, cacheable responses, optional
        code on demand — are either assumed by HTTP or rarely relevant to API design decisions.
      </p>

      <h2 id="http-methods">HTTP Methods</h2>
      <ArticleTable caption="HTTP methods — semantics, idempotency, and when to use each" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Purpose</th>
              <th>Idempotent</th>
              <th>Safe</th>
              <th>Request Body</th>
              <th>Success Code</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET</code></td>
              <td>Retrieve resource(s). Never mutate on GET.</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>No</td>
              <td>200 OK</td>
            </tr>
            <tr>
              <td><code>POST</code></td>
              <td>Create a new resource. Also for actions that don&apos;t fit CRUD.</td>
              <td>No</td>
              <td>No</td>
              <td>Yes</td>
              <td>201 Created</td>
            </tr>
            <tr>
              <td><code>PUT</code></td>
              <td>Replace a resource entirely. Client sends the full representation.</td>
              <td>Yes</td>
              <td>No</td>
              <td>Yes</td>
              <td>200 OK</td>
            </tr>
            <tr>
              <td><code>PATCH</code></td>
              <td>Partial update. Only send the fields you want to change.</td>
              <td>Usually no</td>
              <td>No</td>
              <td>Yes</td>
              <td>200 OK</td>
            </tr>
            <tr>
              <td><code>DELETE</code></td>
              <td>Remove a resource.</td>
              <td>Yes</td>
              <td>No</td>
              <td>No</td>
              <td>204 No Content</td>
            </tr>
            <tr>
              <td><code>HEAD</code></td>
              <td>Same as GET but response body omitted. Check existence, get headers.</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>No</td>
              <td>200 OK</td>
            </tr>
            <tr>
              <td><code>OPTIONS</code></td>
              <td>Describe supported methods. Browsers send automatically for CORS preflight.</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>No</td>
              <td>204 No Content</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Idempotent</strong> means calling the same request N times has the same effect as
        calling it once. <code>DELETE /users/123</code> is idempotent — calling it twice still
        results in the user being gone (the second call returns 404, but the system state is the same).
        <code>POST /users</code> is not idempotent — each call creates a new user.
      </p>
      <p>
        <strong>Safe</strong> means the request does not modify server state. Safe methods can be
        cached and bookmarked. Use <code>GET</code> for any read operation, never for mutations
        (breaks caching, breaks idempotency, shows data in browser history and server logs).
      </p>

      <h2 id="resource-hierarchy">Resource Hierarchy & URL Design</h2>
      <MermaidDiagram
        chart={resourceHierarchyDiagram}
        title="REST Resource Hierarchy"
        caption="Resources form a tree. Nested routes express ownership (a user's orders). Keep nesting to at most 2 levels deep — deeper hierarchies make URLs unwieldy. Use query parameters for filtering instead."
        minHeight={380}
      />
      <pre><code>{`// URL design rules

// Use plural nouns for collections
GET /users          // ✓ collection
GET /user           // ✗ singular is confusing

// Use :id for specific resources
GET /users/:id      // ✓
GET /users/get/:id  // ✗ verb in URL — use HTTP method, not URL

// Nested resources — use for clear ownership relationships
GET /users/:userId/orders          // orders owned by a user
GET /users/:userId/orders/:orderId // specific order for a user

// But avoid deep nesting
GET /users/:userId/orders/:orderId/items/:itemId/reviews/:reviewId // ✗ too deep
GET /order-items/:itemId/reviews // ✓ flatten with a resource identifier

// Actions that don't map to CRUD — use noun + verb as sub-resource
POST /users/:id/deactivate   // ✓ action as sub-resource
POST /orders/:id/cancel      // ✓
POST /payments/:id/refund    // ✓
PATCH /users/:id?deactivate=true  // ✗ don't use query params for actions

// Non-resource endpoints — search is a common exception
GET /search?q=term&type=user  // ✓ search is not a CRUD resource

// Versioning in URL — covered later
GET /v1/users
GET /v2/users`}</code></pre>

      <h2 id="status-codes">HTTP Status Codes</h2>
      <ArticleTable caption="HTTP status codes grouped by class — when to use each" minWidth={700}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Meaning</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>200</strong></td>
              <td>OK</td>
              <td>Successful GET, PUT, PATCH. Default success code.</td>
            </tr>
            <tr>
              <td><strong>201</strong></td>
              <td>Created</td>
              <td>Successful POST that created a resource. Include Location header with new resource URL.</td>
            </tr>
            <tr>
              <td><strong>204</strong></td>
              <td>No Content</td>
              <td>Successful DELETE or PUT with no response body.</td>
            </tr>
            <tr>
              <td><strong>301</strong></td>
              <td>Moved Permanently</td>
              <td>Resource has a new permanent URL. Clients should update bookmarks.</td>
            </tr>
            <tr>
              <td><strong>304</strong></td>
              <td>Not Modified</td>
              <td>ETag/Last-Modified conditional request — use cached response.</td>
            </tr>
            <tr>
              <td><strong>400</strong></td>
              <td>Bad Request</td>
              <td>Malformed request, validation failure, invalid JSON.</td>
            </tr>
            <tr>
              <td><strong>401</strong></td>
              <td>Unauthorized</td>
              <td>Not authenticated — no credentials or invalid credentials.</td>
            </tr>
            <tr>
              <td><strong>403</strong></td>
              <td>Forbidden</td>
              <td>Authenticated but not authorized for this resource/action.</td>
            </tr>
            <tr>
              <td><strong>404</strong></td>
              <td>Not Found</td>
              <td>Resource does not exist. Also use when hiding existence for security (vs 403).</td>
            </tr>
            <tr>
              <td><strong>409</strong></td>
              <td>Conflict</td>
              <td>State conflict — duplicate email on registration, optimistic concurrency failure.</td>
            </tr>
            <tr>
              <td><strong>422</strong></td>
              <td>Unprocessable Entity</td>
              <td>Semantically invalid request body — request was parsed but business rules failed.</td>
            </tr>
            <tr>
              <td><strong>429</strong></td>
              <td>Too Many Requests</td>
              <td>Rate limit exceeded. Include Retry-After header.</td>
            </tr>
            <tr>
              <td><strong>500</strong></td>
              <td>Internal Server Error</td>
              <td>Unexpected server error. Never expose internals in the response.</td>
            </tr>
            <tr>
              <td><strong>503</strong></td>
              <td>Service Unavailable</td>
              <td>Server temporarily overloaded or in maintenance. Include Retry-After header.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="response-envelope">Response Envelope Design</h2>
      <p>
        A consistent JSON shape across all endpoints allows clients to handle responses generically
        without per-endpoint parsing logic. Adopt a pattern and enforce it via middleware.
      </p>
      <pre><code>{`// Consistent response envelope
// Success — single resource
{
  "data": {
    "id": "usr_01H...",
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

// Success — collection with pagination metadata
{
  "data": [
    { "id": "usr_01H...", "name": "Alice" },
    { "id": "usr_02H...", "name": "Bob" }
  ],
  "meta": {
    "total": 150,
    "page": 2,
    "limit": 20,
    "hasNext": true,
    "hasPrev": true
  }
}

// Error response — consistent shape for all error types
{
  "error": {
    "code": "VALIDATION_ERROR",      // machine-readable code
    "message": "Invalid request",    // human-readable message
    "details": [                     // optional: field-level errors
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "name", "message": "Required" }
    ]
  }
}

// Helper functions in Express
function successResponse<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ data });
}

function paginatedResponse<T>(res: Response, data: T[], meta: PaginationMeta) {
  res.json({ data, meta });
}

function errorResponse(res: Response, statusCode: number, code: string, message: string, details?: unknown[]) {
  res.status(statusCode).json({ error: { code, message, ...(details && { details }) } });
}`}</code></pre>

      <h2 id="versioning">API Versioning Strategies</h2>
      <pre><code>{`// 1. URL path versioning — most common, most explicit
// GET /v1/users  →  GET /v2/users
// Pros: obvious in URLs, easy to route, cacheable
// Cons: "v1" in URL is technically not RESTful (URI should identify resource, not version)

app.use("/v1", v1Router);
app.use("/v2", v2Router);

// 2. Accept header versioning
// GET /users
// Accept: application/vnd.myapp.v2+json
// Pros: URLs don't change, semantically clean
// Cons: harder to test (must set header), not cacheable by CDN by default

app.get("/users", (req, res) => {
  const version = req.accepts(["application/vnd.myapp.v2+json", "application/vnd.myapp.v1+json"]);
  if (version === "application/vnd.myapp.v2+json") {
    return listUsersV2(req, res);
  }
  return listUsersV1(req, res);
});

// 3. Query parameter versioning
// GET /users?version=2
// Pros: easy to test, visible
// Cons: pollutes query string, can be accidentally stripped by proxies

// Recommendation: URL path versioning for public APIs.
// It is not perfectly RESTful, but it is the most pragmatic choice —
// explicit, cacheable, easy to document, and understood by every developer.

// When to version: when you make breaking changes
// Breaking changes: removing fields, changing field types, changing behavior
// Non-breaking: adding optional fields, adding endpoints`}</code></pre>

      <h2 id="filtering-sorting">Filtering, Sorting & Pagination</h2>
      <pre><code>{`// All via query parameters — never in the URL path

// Filtering — resource-specific fields as query params
GET /users?role=admin&status=active
GET /orders?minTotal=100&maxTotal=500&status=pending
GET /products?category=electronics&inStock=true

// Express handler
app.get("/users", async (req, res) => {
  const { role, status, minAge, maxAge } = req.query;
  // Validate and sanitize query params (use zod)
  const filters = {
    ...(role && { role: role as string }),
    ...(status && { status: status as string }),
  };
  const users = await userService.findMany(filters);
  res.json({ data: users });
});

// Sorting — sort field + direction
GET /users?sortBy=createdAt&order=desc
GET /products?sortBy=price&order=asc

// Multiple sort keys
GET /products?sort=-price,name  // - prefix for descending (common convention)

// Sparse fieldsets — return only specified fields
GET /users?fields=id,name,email  // don't return password hash, internal fields
`}</code></pre>

      <h2 id="pagination-patterns">Pagination Patterns</h2>
      <MermaidDiagram
        chart={paginationDiagram}
        title="Offset vs Cursor Pagination"
        caption="Offset pagination is simple and allows random page access but degrades at high offsets and produces inconsistent results when data is mutated between pages. Cursor pagination is O(1) at any depth and handles mutations correctly but doesn't support jumping to an arbitrary page."
        minHeight={260}
      />
      <pre><code>{`// Offset/page-based pagination
// Simple, supports random access, degrades with large offsets
GET /users?page=5&limit=20
// SQL: SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 80

app.get("/users", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = Math.min(100, parseInt(req.query.limit as string ?? "20", 10));
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.users.findMany({ take: limit, skip: offset, orderBy: { id: "asc" } }),
    db.users.count(),
  ]);

  res.json({
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    },
  });
});

// Cursor-based pagination — for large datasets, real-time feeds
// Use the last item's id (or createdAt) as the cursor
GET /users?after=eyJpZCI6MTIzfQ&limit=20  // cursor is base64(JSON)

app.get("/users", async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit as string ?? "20", 10));
  const afterCursor = req.query.after as string | undefined;

  let cursor: { id: string } | undefined;
  if (afterCursor) {
    cursor = JSON.parse(Buffer.from(afterCursor, "base64").toString("utf8"));
  }

  const users = await db.users.findMany({
    take: limit + 1, // fetch one extra to detect if there's a next page
    ...(cursor && { cursor: { id: cursor.id }, skip: 1 }),
    orderBy: { id: "asc" },
  });

  const hasNext = users.length > limit;
  const items = hasNext ? users.slice(0, -1) : users;
  const lastItem = items[items.length - 1];
  const nextCursor = hasNext && lastItem
    ? Buffer.from(JSON.stringify({ id: lastItem.id })).toString("base64")
    : null;

  res.json({
    data: items,
    meta: { hasNext, nextCursor, limit },
  });
});`}</code></pre>
    </div>
  );
}
