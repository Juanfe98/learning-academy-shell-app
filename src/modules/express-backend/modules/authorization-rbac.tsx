import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const rbacModelDiagram = String.raw`flowchart TD
    U1["User: alice"] --> R1["Role: admin"]
    U2["User: bob"] --> R2["Role: editor"]
    U3["User: carol"] --> R3["Role: viewer"]

    R1 --> P1["Permission: users:read"]
    R1 --> P2["Permission: users:write"]
    R1 --> P3["Permission: users:delete"]
    R1 --> P4["Permission: posts:*"]

    R2 --> P1
    R2 --> P5["Permission: posts:read"]
    R2 --> P6["Permission: posts:write"]

    R3 --> P1
    R3 --> P5`;

const authzDecisionDiagram = String.raw`flowchart TD
    REQ["Incoming Request\nDELETE /posts/:id"]
    REQ --> EXTRACT["Extract identity from JWT\nreq.user = { id, role, permissions }"]
    EXTRACT --> AUTHN{"Is user authenticated?\nreq.user exists?"}
    AUTHN -->|"No"| U401["401 Unauthorized"]
    AUTHN -->|"Yes"| ROLE{"Has required role?\nrequireRole('admin', 'editor')"}
    ROLE -->|"No"| U403["403 Forbidden"]
    ROLE -->|"Yes"| OWNER{"Owns resource?\npost.authorId === req.user.id\nOR role === 'admin'"}
    OWNER -->|"No"| U403B["403 Forbidden"]
    OWNER -->|"Yes"| HANDLER["Route Handler\nawait post.delete()"]
    HANDLER --> RES["204 No Content"]`;

export const toc: TocItem[] = [
  { id: "authn-vs-authz", title: "Authentication vs Authorization", level: 2 },
  { id: "rbac-model", title: "RBAC Model", level: 2 },
  { id: "authz-decision", title: "Authorization Decision Flow", level: 2 },
  { id: "role-middleware", title: "requireRole Middleware Factory", level: 2 },
  { id: "permission-middleware", title: "Permission-Based Middleware", level: 2 },
  { id: "resource-ownership", title: "Resource Ownership Checks", level: 2 },
  { id: "abac", title: "Attribute-Based Access Control (ABAC)", level: 2 },
  { id: "rbac-vs-abac", title: "RBAC vs ABAC", level: 2 },
  { id: "jwt-claims", title: "Embedding Roles in JWT Claims", level: 2 },
];

export default function AuthorizationRbac() {
  return (
    <div className="article-content">
      <p>
        Authorization answers &quot;what can this verified identity do?&quot; — a distinct question from
        authentication (&quot;who is this?&quot;). An authenticated request can still fail authorization. The
        distinction matters because the HTTP status codes differ (401 vs 403), the failure handling
        differs (retry with credentials vs request a different role), and the security model differs
        entirely. Conflating them creates bugs and security holes.
      </p>

      <h2 id="authn-vs-authz">Authentication vs Authorization</h2>
      <pre><code>{`// 401 Unauthorized — missing or invalid credentials
// "We don't know who you are. Prove your identity."
// Client action: refresh token, re-login, attach credentials

// 403 Forbidden — authenticated but not permitted
// "We know who you are. You're not allowed to do this."
// Client action: request access, contact admin, show "access denied" UI

// Common mistake: returning 401 when you mean 403
app.delete("/posts/:id", authenticate, async (req, res) => {
  const post = await db.posts.findById(req.params.id);
  if (!post) throw new NotFoundError("Post");

  if (post.authorId !== req.user!.id) {
    // ✗ Wrong: res.status(401) — "you need to log in" is incorrect
    // ✓ Correct: 403 — you are logged in, but this is not your post
    throw new ForbiddenError("Cannot delete another user's post");
  }

  await db.posts.delete(post.id);
  res.sendStatus(204);
});`}</code></pre>

      <h2 id="rbac-model">RBAC Model</h2>
      <MermaidDiagram
        chart={rbacModelDiagram}
        title="Role-Based Access Control Model"
        caption="Users are assigned roles. Roles are granted permissions. A user's effective permissions are the union of all permissions granted to their roles. Changing a role's permissions immediately affects all users with that role."
        minHeight={400}
      />

      <h2 id="authz-decision">Authorization Decision Flow</h2>
      <MermaidDiagram
        chart={authzDecisionDiagram}
        title="Authorization Decision Flow"
        caption="Authorization decisions cascade: first check authentication, then role, then resource ownership. Each layer can short-circuit the request. Separating these checks into composable middleware keeps route handlers focused on business logic."
        minHeight={460}
      />

      <h2 id="role-middleware">requireRole Middleware Factory</h2>
      <pre><code>{`import { Request, Response, NextFunction } from "express";

// Middleware factory — returns a middleware that checks role membership
// Usage: router.delete("/posts/:id", authenticate, requireRole("admin", "editor"), deletePost)
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // authenticate middleware must run first — req.user must be set
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        \`Role '\${req.user.role}' cannot perform this action. Required: \${roles.join(", ")}\`
      );
    }

    next();
  };
}

// Role hierarchy — higher roles inherit lower role permissions
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  superadmin: 3,
};

// requireMinimumRole — user must have AT LEAST this role level
export function requireMinimumRole(minimumRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;

    if (userLevel < requiredLevel) {
      throw new ForbiddenError(\`Minimum role '\${minimumRole}' required\`);
    }

    next();
  };
}

// Route composition
router.get("/users", authenticate, requireMinimumRole("viewer"), listUsers);
router.post("/users", authenticate, requireMinimumRole("admin"), createUser);
router.delete("/users/:id", authenticate, requireRole("admin", "superadmin"), deleteUser);`}</code></pre>

      <h2 id="permission-middleware">Permission-Based Middleware</h2>
      <pre><code>{`// Fine-grained permission checks — more flexible than role checks
// Permissions are strings like "users:read", "posts:write", "billing:*"

// Permissions can be embedded in JWT claims or loaded from DB per request
// JWT claims approach: no DB lookup but stale (until token refresh)
// DB approach: always fresh but one extra query per request

// JWT-based permissions (common for stable permission sets)
// In the JWT payload: { sub, role, permissions: ["users:read", "posts:write"] }
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.permissions) {
      throw new UnauthorizedError("No permissions on token");
    }

    const hasPermission =
      req.user.permissions.includes(permission) ||
      req.user.permissions.includes(permission.split(":")[0] + ":*") || // wildcard: "users:*"
      req.user.permissions.includes("*"); // superadmin wildcard

    if (!hasPermission) {
      throw new ForbiddenError(\`Permission '\${permission}' required\`);
    }

    next();
  };
}

// DB-backed permissions (for dynamic permission assignment)
export function requirePermissionFromDb(permission: string) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) throw new UnauthorizedError();

    const userPermissions = await db.permissions.findMany({
      where: { userId: req.user.id },
      select: { name: true },
    });

    const names = userPermissions.map((p) => p.name);
    const hasPermission =
      names.includes(permission) ||
      names.includes(permission.split(":")[0] + ":*") ||
      names.includes("*");

    if (!hasPermission) throw new ForbiddenError();
    next();
  });
}

// Usage
router.get("/users", authenticate, requirePermission("users:read"), listUsers);
router.post("/users", authenticate, requirePermission("users:write"), createUser);
router.delete("/billing/:id", authenticate, requirePermission("billing:delete"), deleteBilling);`}</code></pre>

      <h2 id="resource-ownership">Resource Ownership Checks</h2>
      <pre><code>{`// Role checks are coarse-grained: "can this role type do this action?"
// Ownership checks are fine-grained: "can THIS user act on THIS specific resource?"

// Pattern: load the resource first, then check ownership
async function deletePost(req: Request, res: Response) {
  const post = await db.posts.findById(req.params.id);
  if (!post) throw new NotFoundError("Post", req.params.id);

  // Admin can delete anything. Author can only delete their own posts.
  const isOwner = post.authorId === req.user!.id;
  const isAdmin = req.user!.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("Cannot delete another user's post");
  }

  await db.posts.delete(post.id);
  res.sendStatus(204);
}

// Ownership middleware factory — load resource and attach to req
function requireOwnership<T extends { userId: string }>(
  loadResource: (id: string) => Promise<T | null>,
  resourceName: string,
) {
  return asyncHandler(async (req, res, next) => {
    const resource = await loadResource(req.params.id);
    if (!resource) throw new NotFoundError(resourceName, req.params.id);

    (req as Request & { resource?: T }).resource = resource;

    const isOwner = resource.userId === req.user!.id;
    const isAdmin = req.user!.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError(\`Cannot access another user's \${resourceName}\`);
    }

    next();
  });
}

// Usage: load post, check ownership, then handler can use req.resource
router.delete(
  "/posts/:id",
  authenticate,
  requireOwnership(db.posts.findById.bind(db.posts), "post"),
  async (req, res) => {
    const post = (req as Request & { resource: Post }).resource;
    await db.posts.delete(post.id);
    res.sendStatus(204);
  }
);`}</code></pre>

      <h2 id="abac">Attribute-Based Access Control (ABAC)</h2>
      <pre><code>{`// ABAC: access decisions based on attributes of user, resource, and environment
// More flexible than RBAC — can express complex policies

// Example policy: "Users can edit posts IF they are the author OR
// they are an editor in the same organization AND the post is in draft status"

interface AbacContext {
  user: { id: string; role: string; orgId: string };
  resource: { authorId: string; orgId: string; status: "draft" | "published" };
  action: "read" | "edit" | "delete" | "publish";
  environment: { timestamp: Date };
}

function canPerformAction(ctx: AbacContext): boolean {
  const { user, resource, action } = ctx;

  // Admin can do anything
  if (user.role === "admin") return true;

  // Must be in same organization
  if (user.orgId !== resource.orgId) return false;

  switch (action) {
    case "read":
      return true; // any org member can read

    case "edit":
      return (
        resource.authorId === user.id || // author can always edit their own
        (user.role === "editor" && resource.status === "draft") // editors can edit drafts
      );

    case "delete":
      return resource.authorId === user.id; // only author can delete

    case "publish":
      return user.role === "editor" && resource.status === "draft";

    default:
      return false;
  }
}

// ABAC middleware
function requireAbacPermission(action: AbacContext["action"], loadResource: (id: string) => Promise<AbacContext["resource"] | null>) {
  return asyncHandler(async (req, res, next) => {
    const resource = await loadResource(req.params.id);
    if (!resource) throw new NotFoundError("Resource");

    const allowed = canPerformAction({
      user: req.user as AbacContext["user"],
      resource,
      action,
      environment: { timestamp: new Date() },
    });

    if (!allowed) throw new ForbiddenError();
    next();
  });
}`}</code></pre>

      <h2 id="rbac-vs-abac">RBAC vs ABAC</h2>
      <ArticleTable caption="RBAC vs ABAC — tradeoffs and when to use each" minWidth={740}>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>RBAC</th>
              <th>ABAC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Complexity</td>
              <td>Low — roles are easy to reason about</td>
              <td>High — policy logic can become complex</td>
            </tr>
            <tr>
              <td>Flexibility</td>
              <td>Low — can&apos;t express resource-specific or context-specific rules easily</td>
              <td>High — any attribute combination is expressible</td>
            </tr>
            <tr>
              <td>Performance</td>
              <td>Fast — role check is a string comparison</td>
              <td>Slower — may require loading resource and evaluating policies</td>
            </tr>
            <tr>
              <td>Auditability</td>
              <td>Easy — "user has admin role, admin can delete"</td>
              <td>Harder — "policy P evaluated to true for these attribute values"</td>
            </tr>
            <tr>
              <td>Use case</td>
              <td>Apps with clear role boundaries (SaaS, admin panels)</td>
              <td>Complex multi-tenant systems, document-level permissions, regulatory compliance</td>
            </tr>
            <tr>
              <td>Example</td>
              <td>admin/editor/viewer roles with static permissions</td>
              <td>&quot;Users can read documents in their department during business hours&quot;</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="jwt-claims">Embedding Roles in JWT Claims</h2>
      <pre><code>{`// Option 1: Embed roles/permissions in JWT (stateless authorization)
// Pros: no DB lookup on every request, fast
// Cons: stale until token refresh — role changes take up to token TTL to propagate

const token = jwt.sign({
  sub: user.id,
  role: user.role,
  permissions: user.permissions, // ["posts:read", "posts:write"]
}, privateKey, { expiresIn: "15m" });

// Option 2: Load roles from DB on every request (fresh authorization)
// Pros: always current — revocation and role changes take effect immediately
// Cons: extra DB query per request — use Redis cache to mitigate

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const payload = verifyJwt(req.headers.authorization);

  // Load fresh permissions from DB (or Redis cache)
  const permissions = await permissionCache.get(payload.sub) ??
    await db.permissions.findByUser(payload.sub);

  req.user = { id: payload.sub, role: payload.role, permissions };
  next();
}

// Hybrid: embed role in JWT, load fine-grained permissions from Redis
// Best of both: role checks are instant, permission changes propagate quickly
// with a short Redis TTL (e.g., 1 minute)`}</code></pre>
    </div>
  );
}
