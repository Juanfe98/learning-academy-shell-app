import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-narrowing", title: "What Is Narrowing?", level: 2 },
  { id: "typeof-guards", title: "typeof Guards", level: 2 },
  { id: "instanceof-guards", title: "instanceof Guards", level: 2 },
  { id: "in-operator", title: "The in Operator", level: 2 },
  { id: "truthiness-narrowing", title: "Truthiness Narrowing", level: 2 },
  { id: "type-predicates", title: "User-Defined Type Predicates", level: 2 },
  { id: "discriminated-unions-switch", title: "Discriminated Unions with switch", level: 2 },
  { id: "exhaustive-checks", title: "Exhaustive Checks with never", level: 3 },
  { id: "control-flow-analysis", title: "Control Flow Analysis", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypeNarrowing() {
  return (
    <div className="article-content">
      <p>
        TypeScript tracks the type of every variable through every branch of your code.
        When you check whether a value is a string, or test if an error is an instance of
        a particular class, the compiler narrows the type in that branch — giving you access
        to properties that were previously inaccessible. Understanding narrowing is what
        turns union types from a nuisance into one of TypeScript&apos;s most powerful features.
      </p>

      <h2 id="what-is-narrowing">What Is Narrowing?</h2>

      <p>
        Narrowing is TypeScript&apos;s ability to refine the type of a variable within a
        specific code path. Given a value typed as <code>string | number</code>, inside
        an <code>if (typeof x === "string")</code> block, TypeScript knows it&apos;s a{" "}
        <code>string</code>. Outside that block, it&apos;s back to <code>string | number</code>.
      </p>

      <pre><code>{`function formatValue(value: string | number): string {
  if (typeof value === "string") {
    // value: string — string methods available
    return value.toUpperCase();
  }
  // value: number — number methods available
  return value.toFixed(2);
}`}</code></pre>

      <h2 id="typeof-guards">typeof Guards</h2>

      <p>
        The <code>typeof</code> operator returns one of: <code>"string"</code>,{" "}
        <code>"number"</code>, <code>"bigint"</code>, <code>"boolean"</code>,{" "}
        <code>"symbol"</code>, <code>"undefined"</code>, <code>"object"</code>, or{" "}
        <code>"function"</code>. TypeScript uses these checks to narrow union types.
      </p>

      <pre><code>{`type Primitive = string | number | boolean | null | undefined;

function serialize(value: Primitive): string {
  if (typeof value === "string") return \`"\${value}"\`;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null) return "null";
  return "undefined";
}

// typeof "object" includes null — a well-known JavaScript quirk
function isObject(x: unknown): boolean {
  return typeof x === "object" && x !== null; // null check is essential
}`}</code></pre>

      <h2 id="instanceof-guards">instanceof Guards</h2>

      <p>
        <code>instanceof</code> checks the prototype chain. TypeScript narrows to the
        class type in the branch where the check passes. This is the standard way to
        differentiate between error subtypes.
      </p>

      <pre><code>{`class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public fields: string[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function handleError(error: unknown): string {
  if (error instanceof NetworkError) {
    // error: NetworkError — statusCode is accessible
    return \`Network failure (\${error.statusCode}): \${error.message}\`;
  }
  if (error instanceof ValidationError) {
    // error: ValidationError — fields is accessible
    return \`Validation failed on: \${error.fields.join(", ")}\`;
  }
  if (error instanceof Error) {
    return \`Error: \${error.message}\`;
  }
  return "Unknown error";
}`}</code></pre>

      <h2 id="in-operator">The in Operator</h2>

      <p>
        The <code>in</code> operator checks whether a property exists on an object. When
        the object is a union type, TypeScript narrows to the union members that have that
        property.
      </p>

      <pre><code>{`type Cat = { meow(): void; purr(): void };
type Dog = { bark(): void; fetch(): void };
type Animal = Cat | Dog;

function makeSound(animal: Animal): void {
  if ("meow" in animal) {
    // animal: Cat
    animal.meow();
  } else {
    // animal: Dog
    animal.bark();
  }
}

// Useful for discriminating plain objects without a discriminant field
type SuccessResponse = { data: unknown; requestId: string };
type ErrorResponse = { error: string; code: number };
type ApiResponse = SuccessResponse | ErrorResponse;

function processResponse(res: ApiResponse): void {
  if ("data" in res) {
    console.log("Success:", res.data);
  } else {
    console.error(\`[\${res.code}] \${res.error}\`);
  }
}`}</code></pre>

      <h2 id="truthiness-narrowing">Truthiness Narrowing</h2>

      <p>
        TypeScript narrows based on truthiness checks. Falsy values (<code>false</code>,
        <code>0</code>, <code>""</code>, <code>null</code>, <code>undefined</code>,{" "}
        <code>NaN</code>) are excluded from the type in a truthy branch.
      </p>

      <pre><code>{`function greet(name: string | null | undefined): string {
  if (name) {
    // name: string — null and undefined excluded
    return \`Hello, \${name.trim()}\`;
  }
  return "Hello, stranger";
}

// The negation branch narrows too
function processIfPresent(value: string | undefined): void {
  if (!value) return; // early return narrows everything below
  // value: string — undefined excluded
  console.log(value.toUpperCase());
}

// Truthiness narrowing can be surprising with 0 and ""
function processCount(count: number | undefined): string {
  if (count) {
    // count: number — but 0 won't reach this branch!
    return \`Count: \${count}\`;
  }
  // count: number | undefined — 0 is here too
  return "No count";
}
// Prefer: count !== undefined ? ... : ...`}</code></pre>

      <h2 id="type-predicates">User-Defined Type Predicates</h2>

      <p>
        Sometimes TypeScript can&apos;t infer the narrowing from a check function — it just
        sees a <code>boolean</code> return value. Type predicates let you tell the compiler
        &quot;if this function returns true, narrow the argument to this type.&quot;
      </p>

      <pre><code>{`// Without type predicate — caller gets boolean, no narrowing
function isString(value: unknown): boolean {
  return typeof value === "string";
}

const x: unknown = "hello";
if (isString(x)) {
  x.toUpperCase(); // Error: Object is of type 'unknown'
}

// With type predicate — caller gets narrowing
function isString2(value: unknown): value is string {
  return typeof value === "string";
}

if (isString2(x)) {
  x.toUpperCase(); // OK: x is string in this branch
}

// Real use case: filtering arrays with type safety
interface User { id: string; name: string }

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    typeof (value as User).id === "string" &&
    typeof (value as User).name === "string"
  );
}

const mixedData: unknown[] = [{ id: "1", name: "Alice" }, null, { id: "2", name: "Bob" }];
const users: User[] = mixedData.filter(isUser);
// users is User[], not (User | null)[]`}</code></pre>

      <h2 id="discriminated-unions-switch">Discriminated Unions with switch</h2>

      <p>
        When a union has a literal discriminant property, a <code>switch</code> statement
        on that property provides exhaustive, precise narrowing for each case.
      </p>

      <pre><code>{`type Action =
  | { type: "INCREMENT"; amount: number }
  | { type: "DECREMENT"; amount: number }
  | { type: "RESET" }
  | { type: "SET_USER"; user: { id: string; name: string } };

interface State {
  count: number;
  user: { id: string; name: string } | null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + action.amount };
    case "DECREMENT":
      return { ...state, count: state.count - action.amount };
    case "RESET":
      return { count: 0, user: null };
    case "SET_USER":
      return { ...state, user: action.user };
  }
}`}</code></pre>

      <h3 id="exhaustive-checks">Exhaustive Checks with never</h3>

      <p>
        Adding a <code>default</code> case that calls a function expecting <code>never</code>
        turns the switch into a compile-time exhaustiveness check. If you add a new action
        type and forget to handle it, the compiler will error on the <code>default</code> branch.
      </p>

      <pre><code>{`function assertExhaustive(value: never, message: string): never {
  throw new Error(\`\${message}: \${JSON.stringify(value)}\`);
}

function reducer2(state: State, action: Action): State {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + action.amount };
    case "DECREMENT":
      return { ...state, count: state.count - action.amount };
    case "RESET":
      return { count: 0, user: null };
    case "SET_USER":
      return { ...state, user: action.user };
    default:
      // If Action gains a new variant, TypeScript errors here
      return assertExhaustive(action, "Unhandled action");
  }
}`}</code></pre>

      <h2 id="control-flow-analysis">Control Flow Analysis</h2>

      <p>
        TypeScript&apos;s narrowing isn&apos;t limited to <code>if</code> statements — it
        tracks type refinements through assignments, early returns, throw statements, and
        loops. This is called control flow analysis.
      </p>

      <pre><code>{`function processInput(input: string | null): string {
  // After this check, TypeScript knows input is non-null for the rest
  if (input === null) throw new Error("Input required");

  // input: string — TypeScript tracks that the null path threw
  return input.trim().toUpperCase();
}

// Assignments reset the narrowed type
let value: string | number = "hello";
value.toUpperCase(); // OK: value is string

value = 42;
value.toFixed(2); // OK: value is now number
value.toUpperCase(); // Error: toUpperCase doesn't exist on number

// Loops re-widen the type on each iteration
function findFirst(values: (string | null)[]): string | null {
  let found: string | null = null;
  for (const v of values) {
    if (v !== null) {
      found = v; // found: string (narrowed within this branch)
      break;
    }
  }
  return found; // found: string | null (widened again after loop)
}`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Narrowing refines union types within specific code branches — no casts needed</li>
        <li><code>typeof</code> narrows primitives; <code>instanceof</code> narrows class instances</li>
        <li>The <code>in</code> operator narrows based on property presence</li>
        <li>Truthiness narrowing excludes falsy values — be careful with <code>0</code> and <code>""</code></li>
        <li>Type predicates (<code>value is T</code>) extend narrowing to custom check functions</li>
        <li>Discriminated union + <code>switch</code> + <code>assertNever</code> = compile-time exhaustiveness</li>
        <li>TypeScript tracks narrowing through assignments, returns, and throws — not just conditionals</li>
      </ul>

      <p>
        The next module covers <strong>mapped types</strong> — the mechanism that powers
        utility types like <code>Partial</code> and <code>Readonly</code>, which you can
        now build yourself.
      </p>
    </div>
  );
}
