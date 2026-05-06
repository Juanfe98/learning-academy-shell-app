import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "promise-types", title: "Typing Promises", level: 2 },
  { id: "awaited-type", title: "The Awaited<T> Utility Type", level: 2 },
  { id: "async-error-handling", title: "Typed Error Handling in Async Code", level: 2 },
  { id: "result-pattern", title: "The Result Pattern", level: 3 },
  { id: "async-generators", title: "Async Generators & AsyncIterable", level: 2 },
  { id: "promise-combinators", title: "Typing Promise Combinators", level: 2 },
  { id: "callbacks-to-promises", title: "Promisifying Callbacks", level: 2 },
  { id: "real-world-patterns", title: "Real-World Async Patterns", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AsyncTypeScript() {
  return (
    <div className="article-content">
      <p>
        Backend systems are asynchronous by nature — database queries, HTTP calls,
        file I/O, message queues. TypeScript's async type system is rich but has
        subtle gotchas around error typing, nested promises, and the interaction
        between <code>Promise&lt;T&gt;</code> and the <code>Awaited</code> utility type.
        Interviewers expect you to handle async code without losing type safety,
        especially in error paths.
      </p>

      <h2 id="promise-types">Typing Promises</h2>

      <p>
        <code>Promise&lt;T&gt;</code> is generic over its resolved value. TypeScript
        infers <code>T</code> from the return statement of an <code>async</code> function.
        Understanding what TypeScript infers — and when it doesn't — matters for writing
        correct signatures.
      </p>

      <pre><code>{`// TypeScript infers Promise<string> from the return
async function fetchUserName(id: string): Promise<string> {
  const user = await db.users.findById(id);
  return user.name; // inferred as string
}

// Explicit return type is good practice for public API functions
// — it's checked against the actual return, preventing drift
async function createUser(data: CreateUserDto): Promise<User> {
  const hashed = await bcrypt.hash(data.password, 10);
  return db.users.create({ ...data, password: hashed });
  // ✗ Error if the return type doesn't match User
}

// async functions always return Promise — even if you return a plain value
async function getCount(): Promise<number> {
  return 42; // wrapped in Promise.resolve(42) automatically
}

// Returning void from async functions
async function sendEmail(to: string, body: string): Promise<void> {
  await mailer.send({ to, body });
  // no return value needed — Promise<void>
}

// async arrow functions
const fetchData = async (url: string): Promise<Response> => {
  return fetch(url);
};

// Typing a function that accepts async callbacks
function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
): Promise<T> {
  return fn().catch((err) => {
    if (attempts <= 1) throw err;
    return retry(fn, attempts - 1);
  });
}`}</code></pre>

      <h2 id="awaited-type">The Awaited&lt;T&gt; Utility Type</h2>

      <p>
        <code>Awaited&lt;T&gt;</code> (TypeScript 4.5+) unwraps nested Promises
        recursively — it's what TypeScript uses internally when you <code>await</code>.
        Before 4.5, you had to manually unwrap, which caused type errors with
        double-wrapped promises.
      </p>

      <pre><code>{`// Awaited unwraps Promise<T> → T, recursively
type A = Awaited<Promise<string>>;           // string
type B = Awaited<Promise<Promise<number>>>; // number (recursive)
type C = Awaited<string>;                   // string (non-Promise passthrough)

// Practical use: extracting the return type of an async function
async function getUserWithOrders(userId: string) {
  const user = await db.users.findById(userId);
  const orders = await db.orders.findByUserId(userId);
  return { user, orders };
}

// Extract the resolved type without duplicating the return annotation
type UserWithOrders = Awaited<ReturnType<typeof getUserWithOrders>>;
// { user: User; orders: Order[] }

// This is more maintainable than annotating the return type explicitly —
// the type stays in sync automatically if the function changes

// Useful with mapped types to make all properties async:
type AsyncRecord<T> = {
  [K in keyof T]: Promise<T[K]>;
};

type AsyncUser = AsyncRecord<User>;
// { id: Promise<string>; name: Promise<string>; ... }

// And to unwrap all async properties:
type ResolvedRecord<T> = {
  [K in keyof T]: Awaited<T[K]>;
};

type ResolvedAsyncUser = ResolvedRecord<AsyncUser>; // back to User`}</code></pre>

      <h2 id="async-error-handling">Typed Error Handling in Async Code</h2>

      <p>
        TypeScript 4.0 changed <code>catch</code> clause variables to type{" "}
        <code>unknown</code> instead of <code>any</code> when{" "}
        <code>useUnknownInCatchVariables: true</code> (implied by <code>strict</code>).
        This forces explicit type narrowing before using the error — and it's the right
        behavior.
      </p>

      <pre><code>{`// Before TS 4.0 with strict: false — error was 'any'
try {
  await riskyOperation();
} catch (err) {
  console.log(err.message); // ✓ no error — but unsafe
}

// With strict: true — error is 'unknown'
try {
  await riskyOperation();
} catch (err) {
  // err.message; // ✗ Error: 'err' is of type 'unknown'

  // Must narrow first:
  if (err instanceof Error) {
    console.log(err.message); // ✓ now typed as Error
  }

  // For typed custom errors:
  if (err instanceof DatabaseError) {
    console.log(err.query); // ✓ DatabaseError has .query
  }
}

// Custom error classes — define your error hierarchy
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Required for instanceof to work with transpiled classes:
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields: Record<string, string>,
  ) {
    super("VALIDATION_ERROR", message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", \`\${resource} with id \${id} not found\`, 404);
  }
}

// Type guard for AppError hierarchy
function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

// Using it in express error handler:
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      error: err.code,
      fields: err.fields,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code });
  }

  // Unknown error — don't expose internals
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});`}</code></pre>

      <h2 id="result-pattern">The Result Pattern</h2>

      <p>
        Instead of throwing and catching, the Result pattern makes errors part of the
        function's return type. Callers are forced to handle both success and failure
        paths — no silent swallowing of errors.
      </p>

      <pre><code>{`// Discriminated union Result type
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper constructors
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Usage
async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.users.findById(id);
  if (!user) return err(new NotFoundError("User", id));
  return ok(user);
}

async function handler(req: Request, res: Response) {
  const result = await findUser(req.params.id);

  if (!result.ok) {
    // result.error is typed as NotFoundError here
    return res.status(404).json({ message: result.error.message });
  }

  // result.value is typed as User here
  res.json(result.value);
}

// Chaining results
async function processOrder(orderId: string): Promise<Result<Invoice, AppError>> {
  const orderResult = await findOrder(orderId);
  if (!orderResult.ok) return orderResult;

  const paymentResult = await processPayment(orderResult.value);
  if (!paymentResult.ok) return paymentResult;

  return generateInvoice(paymentResult.value);
}`}</code></pre>

      <h2 id="async-generators">Async Generators & AsyncIterable</h2>

      <p>
        Async generators are underused in Node.js backends. They're perfect for
        streaming data from databases or APIs without loading everything into memory.
        TypeScript types them with <code>AsyncGenerator&lt;T&gt;</code> and{" "}
        <code>AsyncIterable&lt;T&gt;</code>.
      </p>

      <pre><code>{`// Async generator — yields values lazily from an async source
async function* streamUsers(
  batchSize = 100,
): AsyncGenerator<User[], void, unknown> {
  let page = 0;
  while (true) {
    const batch = await db.users.findMany({
      skip: page * batchSize,
      take: batchSize,
    });
    if (batch.length === 0) break;
    yield batch;
    page++;
  }
}

// Consuming with for-await-of
async function processAllUsers(): Promise<void> {
  for await (const batch of streamUsers(50)) {
    // batch: User[]
    await Promise.all(batch.map(sendWelcomeEmail));
  }
}

// AsyncIterable as a function parameter type
async function consume<T>(source: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of source) {
    results.push(item);
  }
  return results;
}

// Type: AsyncGenerator<T, TReturn, TNext>
// T        — type of each yielded value
// TReturn  — type of the final return value (void for infinite generators)
// TNext    — type of values passed into next() via yield expression`}</code></pre>

      <h2 id="promise-combinators">Typing Promise Combinators</h2>

      <p>
        <code>Promise.all</code>, <code>Promise.allSettled</code>,{" "}
        <code>Promise.race</code>, and <code>Promise.any</code> all have precise
        TypeScript types. Know what each returns.
      </p>

      <pre><code>{`// Promise.all — resolves when ALL resolve, rejects if ANY rejects
// Returns a tuple type preserving each element's type
const [user, orders, preferences] = await Promise.all([
  fetchUser(id),       // Promise<User>
  fetchOrders(id),     // Promise<Order[]>
  fetchPrefs(id),      // Promise<UserPreferences>
]);
// user: User, orders: Order[], preferences: UserPreferences

// Promise.allSettled — never rejects, returns status for each
const results = await Promise.allSettled([
  fetchUser(id),
  fetchOrders(id),
]);
// results: PromiseSettledResult<User | Order[]>[]
// Each item: { status: "fulfilled", value: T } | { status: "rejected", reason: unknown }

for (const result of results) {
  if (result.status === "fulfilled") {
    console.log(result.value); // typed as User | Order[]
  } else {
    console.error(result.reason); // unknown
  }
}

// Promise.race — resolves/rejects with the FIRST settled promise
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(\`Timeout after \${ms}ms\`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Promise.any (ES2021) — resolves with FIRST fulfilled, rejects if ALL reject
const fastestMirror = await Promise.any([
  fetch("https://mirror1.example.com/file"),
  fetch("https://mirror2.example.com/file"),
  fetch("https://mirror3.example.com/file"),
]); // fastestMirror: Response`}</code></pre>

      <h2 id="callbacks-to-promises">Promisifying Callbacks</h2>

      <p>
        Node.js APIs still use callbacks. <code>util.promisify</code> converts them to
        Promises. TypeScript types this correctly for standard Node.js error-first
        callbacks.
      </p>

      <pre><code>{`import { promisify } from "util";
import { readFile, writeFile } from "fs";

// promisify wraps Node-style (err, result) callbacks
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

async function copyFile(src: string, dest: string): Promise<void> {
  const content = await readFileAsync(src); // Buffer
  await writeFileAsync(dest, content);
}

// Manual promisification with type safety
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Promisify a custom callback-style function
function fetchDataCallback(
  url: string,
  callback: (err: Error | null, data: string | null) => void,
): void {
  // ...
}

const fetchDataAsync = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fetchDataCallback(url, (err, data) => {
      if (err) reject(err);
      else resolve(data!);
    });
  });`}</code></pre>

      <h2 id="real-world-patterns">Real-World Async Patterns</h2>

      <pre><code>{`// Pattern 1: Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; baseDelay?: number },
): Promise<T> {
  const { maxAttempts, baseDelay = 100 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = baseDelay * 2 ** (attempt - 1); // exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("unreachable"); // satisfies the return type
}

// Pattern 2: Throttle concurrent promises
async function throttle<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(fn));
  }
}

// Pattern 3: Deferred promise (for coordinating async init)
class Deferred<T> {
  readonly promise: Promise<T>;
  resolve!: (value: T) => void;
  reject!: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }
}

class DatabaseConnection {
  private ready = new Deferred<void>();

  async connect(): Promise<void> {
    await db.connect();
    this.ready.resolve();
  }

  async query<T>(sql: string): Promise<T> {
    await this.ready.promise; // wait until connected
    return db.query(sql);
  }
}`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong><code>async</code> functions always return <code>Promise&lt;T&gt;</code></strong> —
          even if you return a plain value. The return type is inferred from the resolved value.
        </li>
        <li>
          <strong><code>Awaited&lt;T&gt;</code></strong> unwraps nested Promises recursively.
          Use <code>Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code> to extract async
          function return types without duplicating annotations.
        </li>
        <li>
          With <strong><code>strict: true</code></strong>, <code>catch</code> clause variables
          are <code>unknown</code> — always narrow with <code>instanceof</code> before
          accessing properties. Use <code>Object.setPrototypeOf(this, new.target.prototype)</code>
          in custom Error classes so <code>instanceof</code> works correctly after transpilation.
        </li>
        <li>
          <strong>Result pattern</strong> encodes errors in the return type — callers can't
          accidentally ignore failures. It trades thrown exceptions for explicit handling.
        </li>
        <li>
          <strong><code>Promise.all</code></strong> preserves tuple types; <strong>
          <code>Promise.allSettled</code></strong> never rejects — use it when partial
          failure is acceptable.
        </li>
        <li>
          <strong>Async generators</strong> (<code>async function*</code>) return{" "}
          <code>AsyncGenerator&lt;T&gt;</code> — ideal for streaming large datasets without
          loading everything into memory.
        </li>
      </ul>
    </div>
  );
}
