import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const validationFlowDiagram = String.raw`flowchart TD
    REQ["Incoming Request\nPOST /users { name, email }"]
    REQ --> PARSE["express.json() parses body"]
    PARSE --> VALIDATE["validate(userSchema) middleware\nZod.safeParse(req.body)"]
    VALIDATE -->|"parse fails"| ERR400["400 Bad Request\n{ error: { code, message, details } }"]
    VALIDATE -->|"parse succeeds"| HANDLER["Route Handler\nreq.body is typed and validated"]
    HANDLER --> DB["Database operation"]
    DB -->|"success"| RES201["201 Created\n{ data: user }"]
    DB -->|"unique constraint"| ERR409["409 Conflict\n{ error: 'Email already exists' }"]
    DB -->|"unexpected error"| ERR_MW["Error Middleware\nnext(err)"]
    ERR_MW --> ERR500["500 Internal Server Error"]`;

const errorHierarchyDiagram = String.raw`classDiagram
    class Error {
        +message string
        +stack string
    }
    class AppError {
        +statusCode number
        +code string
        +isOperational boolean
    }
    class ValidationError {
        +details ZodIssue[]
    }
    class NotFoundError {
        +resource string
    }
    class UnauthorizedError {
    }
    class ForbiddenError {
    }
    class ConflictError {
    }

    Error <|-- AppError
    AppError <|-- ValidationError
    AppError <|-- NotFoundError
    AppError <|-- UnauthorizedError
    AppError <|-- ForbiddenError
    AppError <|-- ConflictError`;

export const toc: TocItem[] = [
  { id: "why-boundary-validation", title: "Why Validate at the Boundary", level: 2 },
  { id: "zod-validation", title: "Zod Schema Validation", level: 2 },
  { id: "validate-middleware", title: "Validation Middleware Factory", level: 2 },
  { id: "validation-flow", title: "Validation Flow", level: 2 },
  { id: "error-hierarchy", title: "Custom Error Hierarchy", level: 2 },
  { id: "async-handler", title: "Async Error Wrapper", level: 2 },
  { id: "global-error-handler", title: "Global Error Handler", level: 2 },
  { id: "error-types-table", title: "Error Types Reference", level: 2 },
];

export default function ValidationErrorHandling() {
  return (
    <div className="article-content">
      <p>
        Input validation and error handling are the reliability foundation of any production API.
        Every unvalidated input is a potential crash, a security hole, or corrupt data. Every
        unhandled error is a 500 that leaks internals or a hanging request that wastes connections.
        The patterns in this module eliminate both classes of problem systematically.
      </p>

      <h2 id="why-boundary-validation">Why Validate at the Boundary</h2>
      <p>
        The HTTP boundary is the only place where you control what data enters your system. Once
        <code>req.body</code> passes validation and flows into your business logic, your code should
        be able to trust the shape and types of its inputs. Without validation:
      </p>
      <ul>
        <li>A missing required field causes a cryptic DB error (not-null constraint) that leaks schema details</li>
        <li>An unexpected field type causes a runtime crash or silent data corruption</li>
        <li>A maliciously crafted payload triggers SQL injection, prototype pollution, or ReDoS</li>
        <li>TypeScript&apos;s types are erased at runtime — <code>req.body.age</code> is always a string from JSON parsing, never a number</li>
      </ul>
      <p>
        Validate everything from <code>req.body</code>, <code>req.params</code>, and
        <code>req.query</code>. Never trust client input, even from your own frontend.
      </p>

      <h2 id="zod-validation">Zod Schema Validation</h2>
      <p>
        Zod is the preferred validation library for TypeScript backends — it provides runtime
        validation with automatic TypeScript type inference from the schema.
      </p>
      <pre><code>{`import { z } from "zod";

// Define schema — this is your single source of truth for the shape
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Must be a valid email"),
  age: z.number().int().min(18, "Must be 18 or older").optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

// Infer TypeScript type from schema — no duplication
type CreateUserInput = z.infer<typeof CreateUserSchema>;
// Equivalent to: { name: string; email: string; age?: number; role: "user" | "admin" }

// Parse — throws ZodError if invalid
const input = CreateUserSchema.parse(req.body);      // throws on failure
const input2 = CreateUserSchema.safeParse(req.body); // returns { success, data } or { success, error }

// Reusable schema parts
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),   // coerce: "2" → 2
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const IdParamSchema = z.object({
  id: z.string().uuid("Must be a valid UUID"),
});

// Schema for PATCH — all fields optional
const UpdateUserSchema = CreateUserSchema.partial();

// Pick specific fields from a schema
const LoginSchema = CreateUserSchema.pick({ email: true }).extend({
  password: z.string().min(8),
});`}</code></pre>

      <h2 id="validate-middleware">Validation Middleware Factory</h2>
      <pre><code>{`import { z, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

type ValidateTarget = "body" | "params" | "query";

// Generic middleware factory — validate any part of the request
function validate<T>(schema: ZodSchema<T>, target: ValidateTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details,
        },
      });
      return;
    }

    // Replace the target with the parsed, coerced, defaulted value
    // This is the key benefit: downstream code gets typed, safe data
    req[target] = result.data;
    next();
  };
}

// Usage — compose validation middleware with route handler
import { Router } from "express";

const router = Router();

// Validate body for POST
router.post(
  "/users",
  validate(CreateUserSchema, "body"),
  createUser
);

// Validate params for GET /:id
router.get(
  "/users/:id",
  validate(IdParamSchema, "params"),
  getUser
);

// Validate query for list endpoints
router.get(
  "/users",
  validate(PaginationSchema, "query"),
  listUsers
);

// Handler is now typed and safe — no need to re-validate inside
async function createUser(req: Request, res: Response) {
  // req.body is typed as CreateUserInput — schema has already validated it
  const { name, email, role } = req.body as CreateUserInput;
  const user = await db.users.create({ data: { name, email, role } });
  res.status(201).json({ data: user });
}`}</code></pre>

      <h2 id="validation-flow">Validation Flow</h2>
      <MermaidDiagram
        chart={validationFlowDiagram}
        title="Request Validation and Error Flow"
        caption="Validation happens before the route handler. Invalid requests are rejected with 400 before any business logic runs. Database errors are caught and routed to the global error handler via next(err)."
        minHeight={440}
      />

      <h2 id="error-hierarchy">Custom Error Hierarchy</h2>
      <MermaidDiagram
        chart={errorHierarchyDiagram}
        title="AppError Hierarchy"
        caption="All application-level errors extend AppError. The isOperational flag distinguishes expected errors (user not found, validation failure) from unexpected bugs (null pointer, DB connection lost). Operational errors get user-friendly messages; non-operational errors get generic 500 responses."
        minHeight={360}
      />
      <pre><code>{`// Base error class
class AppError extends Error {
  public readonly isOperational: boolean = true; // expected, user-facing errors

  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types — each maps to an HTTP status code
class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details: Array<{ field: string; message: string }>,
  ) {
    super(400, message, "VALIDATION_ERROR");
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? \`\${resource} \${id} not found\` : \`\${resource} not found\`, "NOT_FOUND");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, message, "FORBIDDEN");
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

// Usage in route handlers — throw instead of res.status(...)
async function getUser(req: Request, res: Response) {
  const user = await db.users.findById(req.params.id);
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json({ data: user });
}

async function registerUser(req: Request, res: Response) {
  const existing = await db.users.findByEmail(req.body.email);
  if (existing) throw new ConflictError("Email already registered");
  const user = await db.users.create(req.body);
  res.status(201).json({ data: user });
}`}</code></pre>

      <h2 id="async-handler">Async Error Wrapper</h2>
      <p>
        Express 4 does not catch promise rejections automatically. An unhandled rejection in an async
        route handler crashes the process. The <code>asyncHandler</code> wrapper fixes this.
        Express 5 (currently in beta) handles async errors natively.
      </p>
      <pre><code>{`// The problem: async errors in Express 4 are NOT caught automatically
app.get("/users/:id", async (req, res) => {
  const user = await db.users.findById(req.params.id); // throws → UNHANDLED REJECTION
  res.json({ data: user });
});

// Manual try/catch — works but verbose in every handler
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await db.users.findById(req.params.id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// asyncHandler — wraps a handler and routes any rejection to next(err)
function asyncHandler<P = {}, ResBody = unknown, ReqBody = unknown, ReqQuery = {}>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Clean handlers — no try/catch noise
app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await db.users.findById(req.params.id);
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json({ data: user });
}));

// Alternative: use express-async-errors package
// import "express-async-errors"; // patches Express to handle async automatically
// Then all async handlers work without wrapping`}</code></pre>

      <h2 id="global-error-handler">Global Error Handler</h2>
      <pre><code>{`import { Request, Response, NextFunction } from "express";

// Must be the LAST app.use() call — Express identifies error middleware by 4 parameters
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction, // required even if unused — 4 params is the signal to Express
) {
  // Handle known, operational errors
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // ValidationError has extra detail
    if (err instanceof ValidationError) {
      (body.error as Record<string, unknown>).details = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Handle Zod errors that escaped the validate() middleware
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  // Unexpected errors — log fully, expose minimally
  console.error("Unhandled error:", err);

  const isDev = process.env.NODE_ENV === "development";
  const message = err instanceof Error ? err.message : "Unknown error";

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isDev ? message : "Internal server error",
      ...(isDev && err instanceof Error && { stack: err.stack }),
    },
  });
}

// Wire it in app.ts — last middleware
app.use(router);
app.use(errorHandler); // ← always last`}</code></pre>

      <h2 id="error-types-table">Error Types Reference</h2>
      <ArticleTable caption="Error type mapping — class, HTTP status, and response shape" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Error Class</th>
              <th>HTTP Status</th>
              <th>Code</th>
              <th>When to Throw</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ValidationError</code></td>
              <td>400</td>
              <td>VALIDATION_ERROR</td>
              <td>req.body / params / query fails schema validation</td>
            </tr>
            <tr>
              <td><code>UnauthorizedError</code></td>
              <td>401</td>
              <td>UNAUTHORIZED</td>
              <td>No token, expired token, invalid signature</td>
            </tr>
            <tr>
              <td><code>ForbiddenError</code></td>
              <td>403</td>
              <td>FORBIDDEN</td>
              <td>Authenticated but lacks permission</td>
            </tr>
            <tr>
              <td><code>NotFoundError</code></td>
              <td>404</td>
              <td>NOT_FOUND</td>
              <td>Resource doesn&apos;t exist (or hiding existence)</td>
            </tr>
            <tr>
              <td><code>ConflictError</code></td>
              <td>409</td>
              <td>CONFLICT</td>
              <td>Unique constraint violation, optimistic lock failure</td>
            </tr>
            <tr>
              <td>Raw <code>Error</code></td>
              <td>500</td>
              <td>INTERNAL_ERROR</td>
              <td>Unexpected crash — DB down, null reference, bug</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
    </div>
  );
}
