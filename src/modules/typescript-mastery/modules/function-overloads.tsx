import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-are-overloads", title: "What Are Overloads?", level: 2 },
  { id: "overload-syntax", title: "Overload Syntax", level: 2 },
  { id: "implementation-signature", title: "The Implementation Signature", level: 2 },
  { id: "method-overloads", title: "Method Overloads in Classes", level: 2 },
  { id: "overloads-vs-union", title: "Overloads vs Union Types", level: 2 },
  { id: "practical-patterns", title: "Practical Overload Patterns", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function FunctionOverloads() {
  return (
    <div className="article-content">
      <p>
        Function overloads let you describe functions that behave differently based on
        their argument types — with TypeScript tracking which overload applies in each
        call site. They're more nuanced than they first appear: the implementation
        signature is invisible to callers, and overloads have specific rules about when
        to use them versus simpler alternatives. Interviewers ask about overloads both
        because they test type system knowledge and because they reveal whether you
        reach for them appropriately or overuse them.
      </p>

      <h2 id="what-are-overloads">What Are Overloads?</h2>

      <p>
        Some functions legitimately have different input-output type relationships
        depending on what they receive. A single union-type signature often can't
        express this relationship precisely. Overloads solve it by providing multiple
        signatures that TypeScript checks independently.
      </p>

      <pre><code>{`// Problem: a function that behaves differently based on input type
// This union signature doesn't capture the relationship between input and output:
function processInput(input: string | number): string | number {
  if (typeof input === "string") return input.toUpperCase(); // string → string
  return input * 2;                                           // number → number
}

const result = processInput("hello"); // inferred as string | number — NOT string
result.toUpperCase();                 // ✗ Error — result could be number

// Fix with overloads:
function processInput(input: string): string;
function processInput(input: number): number;
function processInput(input: string | number): string | number {
  if (typeof input === "string") return input.toUpperCase();
  return input * 2;
}

const r1 = processInput("hello"); // string ✓
const r2 = processInput(42);      // number ✓
r1.toUpperCase();                 // ✓ TypeScript knows r1 is string`}</code></pre>

      <h2 id="overload-syntax">Overload Syntax</h2>

      <p>
        Overload signatures are listed first, followed by a single implementation signature.
        The overload signatures are visible to callers. The implementation is not.
      </p>

      <pre><code>{`// Multiple overload signatures — these are what callers see
function createElement(tag: "div"): HTMLDivElement;
function createElement(tag: "span"): HTMLSpanElement;
function createElement(tag: "input"): HTMLInputElement;
function createElement(tag: "canvas"): HTMLCanvasElement;
// Implementation — NOT visible to callers, must be compatible with all overloads
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

// Calling:
const div = createElement("div");     // HTMLDivElement ✓
const span = createElement("span");   // HTMLSpanElement ✓
// createElement("aside");            // ✗ Error — no matching overload

// Multiple parameters with overloads
function formatDate(date: Date): string;
function formatDate(date: Date, format: "iso"): string;
function formatDate(date: Date, format: "unix"): number;
function formatDate(date: Date, format?: "iso" | "unix"): string | number {
  if (format === "unix") return date.getTime();
  if (format === "iso") return date.toISOString();
  return date.toLocaleDateString();
}

const s1 = formatDate(new Date());           // string
const s2 = formatDate(new Date(), "iso");    // string
const n1 = formatDate(new Date(), "unix");   // number ✓ — not string | number`}</code></pre>

      <h2 id="implementation-signature">The Implementation Signature</h2>

      <p>
        The implementation signature is the one function body that handles all overloads.
        It must accept every combination that the overload signatures describe — it's
        typically the "widest" version. Callers never see it; TypeScript prevents calling
        the function in a way that matches only the implementation but not any overload.
      </p>

      <pre><code>{`function makeArray<T>(value: T): T[];
function makeArray<T>(value: T, count: number): T[];
// Implementation — handles both signatures
function makeArray<T>(value: T, count?: number): T[] {
  return count !== undefined ? Array(count).fill(value) : [value];
}

makeArray("x");     // string[]   ✓ (first overload)
makeArray("x", 3);  // string[]   ✓ (second overload)

// ─── What the implementation signature can't do ──────────────────────────

// 1. You cannot call the function with ONLY the implementation signature's types
//    if they don't match any overload:
function padLeft(value: string, padding: number): string;
function padLeft(value: string, padding: string): string;
function padLeft(value: string, padding: string | number): string {
  if (typeof padding === "number") return " ".repeat(padding) + value;
  return padding + value;
}

// padLeft("hello", " ".repeat(3)); // works — matches second overload (string)
// There is no overload that accepts string | number — so this would error:
// const p: string | number = 3;
// padLeft("hello", p); // ✗ No overload matches — even though implementation accepts it

// 2. Overloads must be compatible with the implementation
function bad(x: number): string;      // overload promises to return string
function bad(x: number): number {     // ✗ Error — implementation returns number
  return x;
}`}</code></pre>

      <h2 id="method-overloads">Method Overloads in Classes</h2>

      <p>
        Classes support method overloads with the same syntax — overload signatures
        before the implementation, no duplicate bodies.
      </p>

      <pre><code>{`class EventEmitter {
  private handlers: Map<string, Function[]> = new Map();

  // Method overloads
  on(event: "data", handler: (data: Buffer) => void): this;
  on(event: "error", handler: (error: Error) => void): this;
  on(event: "end", handler: () => void): this;
  on(event: "connect", handler: () => void): this;
  // Implementation
  on(event: string, handler: Function): this {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const handlers = this.handlers.get(event);
    if (!handlers?.length) return false;
    handlers.forEach((h) => h(...args));
    return true;
  }
}

const emitter = new EventEmitter();
emitter
  .on("data", (data) => console.log(data.toString())) // data: Buffer ✓
  .on("error", (err) => console.error(err.message))   // err: Error ✓
  .on("end", () => console.log("done"));              // no args ✓

// ─── Constructor overloads ───────────────────────────────────────────────
class Point {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number);
  constructor(x: number, y: number, z: number);
  constructor(coords: { x: number; y: number; z?: number });
  constructor(
    xOrCoords: number | { x: number; y: number; z?: number },
    y?: number,
    z?: number,
  ) {
    if (typeof xOrCoords === "object") {
      this.x = xOrCoords.x;
      this.y = xOrCoords.y;
      this.z = xOrCoords.z ?? 0;
    } else {
      this.x = xOrCoords;
      this.y = y!;
      this.z = z ?? 0;
    }
  }
}

new Point(1, 2);              // ✓
new Point(1, 2, 3);           // ✓
new Point({ x: 1, y: 2 });   // ✓`}</code></pre>

      <h2 id="overloads-vs-union">Overloads vs Union Types</h2>

      <p>
        Overloads are often reached for when simpler alternatives work. Know when each
        is appropriate — and default to the simpler option.
      </p>

      <pre><code>{`// ─── When union types are enough ───────────────────────────────────────

// If output type doesn't depend on input type — use union, not overloads:
function greet(name: string | string[]): string {
  return Array.isArray(name) ? name.join(", ") : name;
}
// No need for overloads — return type is always string regardless of input

// ─── When overloads are necessary ───────────────────────────────────────

// Output type is determined by input type:
function parse(input: string): ParsedJson;
function parse(input: Buffer): ParsedJson;
function parse(input: string | Buffer): ParsedJson {
  const str = Buffer.isBuffer(input) ? input.toString("utf8") : input;
  return JSON.parse(str);
}

// Different parameters based on first argument (discriminated):
function query(sql: string): Promise<QueryResult[]>;
function query(sql: string, params: unknown[]): Promise<QueryResult[]>;
function query(sql: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult[]>;
function query(
  sql: string | TemplateStringsArray,
  ...args: unknown[]
): Promise<QueryResult[]> {
  // ...
  return Promise.resolve([]);
}

// ─── The conditional types alternative ──────────────────────────────────
// Sometimes conditional return types can replace overloads cleanly:

type Output<T extends string | number> = T extends string ? string[] : number[];

function split<T extends string | number>(
  input: T,
  separator: T extends string ? string : number,
): Output<T> {
  if (typeof input === "string") {
    return (input as string).split(separator as string) as Output<T>;
  }
  // ... numeric logic
  return [] as Output<T>;
}`}</code></pre>

      <h2 id="practical-patterns">Practical Overload Patterns</h2>

      <pre><code>{`// Pattern 1: Optional callback → Promise or void
function fetchUser(id: string, callback: (user: User) => void): void;
function fetchUser(id: string): Promise<User>;
function fetchUser(
  id: string,
  callback?: (user: User) => void,
): Promise<User> | void {
  const promise = db.users.findById(id);
  if (callback) {
    promise.then(callback);
    return;
  }
  return promise;
}

// Pattern 2: Narrow return type based on options object
interface FindOptions {
  includeDeleted?: boolean;
  throwIfNotFound?: boolean;
}

function findUser(id: string, options: { throwIfNotFound: true }): Promise<User>;
function findUser(id: string, options?: FindOptions): Promise<User | null>;
async function findUser(
  id: string,
  options: FindOptions = {},
): Promise<User | null> {
  const user = await db.users.findById(id);
  if (!user && options.throwIfNotFound) {
    throw new Error(\`User \${id} not found\`);
  }
  return user ?? null;
}

const u1 = await findUser("123", { throwIfNotFound: true }); // User (not null)
const u2 = await findUser("123");                            // User | null

// Pattern 3: Type-safe event system with overloads
type EventMap = {
  "user:created": { id: string; email: string };
  "order:placed": { orderId: string; total: number };
  "payment:failed": { orderId: string; reason: string };
};

class TypedEventBus {
  private handlers = new Map<string, Function[]>();

  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void,
  ): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

const bus = new TypedEventBus();
bus.on("user:created", ({ id, email }) => {
  // id: string, email: string — fully typed ✓
});
bus.emit("user:created", { id: "1", email: "a@b.com" }); // ✓
// bus.emit("user:created", { id: "1" }); // ✗ Error — missing email`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Overload signatures are what callers see</strong> — the implementation
          signature is invisible. Callers cannot call the function with types that only match
          the implementation.
        </li>
        <li>
          <strong>Default to union types</strong> when the output type is the same regardless of input.
          Use overloads when the output type is directly determined by the input type.
        </li>
        <li>
          <strong>The implementation signature must be compatible with all overloads</strong> —
          it's always a superset (wider types, more optional params).
        </li>
        <li>
          <strong>Method and constructor overloads</strong> follow the same rules as function
          overloads — overload signatures first, one implementation body.
        </li>
        <li>
          <strong>Generics with conditional return types</strong> can sometimes replace overloads
          more cleanly — especially when the logic is parameterized rather than variant.
        </li>
        <li>
          <strong>Typed event buses with mapped types</strong> are a practical use of generics
          that often eliminates the need for overloads entirely — prefer them over manually
          overloading <code>on(event, handler)</code> per event type.
        </li>
      </ul>
    </div>
  );
}
