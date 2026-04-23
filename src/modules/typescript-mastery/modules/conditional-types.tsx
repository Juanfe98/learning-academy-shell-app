import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "basic-syntax", title: "Basic Conditional Type Syntax", level: 2 },
  { id: "distributive-conditionals", title: "Distributive Conditional Types", level: 2 },
  { id: "infer-keyword", title: "The infer Keyword", level: 2 },
  { id: "re-implementing-stdlib", title: "Re-implementing Standard Utilities", level: 3 },
  { id: "recursive-conditional-types", title: "Recursive Conditional Types", level: 2 },
  { id: "noinfer", title: "NoInfer (TypeScript 5.4+)", level: 2 },
  { id: "practical-applications", title: "Practical Applications", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ConditionalTypes() {
  return (
    <div className="article-content">
      <p>
        Conditional types are the <code>if/else</code> of TypeScript&apos;s type system.
        They let you select one type or another based on whether a type relationship holds.
        This sounds abstract, but it unlocks the ability to express nuanced type logic that
        was previously impossible: &quot;if this generic parameter is a Promise, unwrap it;
        otherwise, leave it alone.&quot;
      </p>

      <h2 id="basic-syntax">Basic Conditional Type Syntax</h2>

      <p>
        The syntax mirrors JavaScript&apos;s ternary operator, but operates entirely at
        the type level: <code>T extends U ? X : Y</code>. If type <code>T</code> is
        assignable to type <code>U</code>, the expression resolves to <code>X</code>;
        otherwise, it resolves to <code>Y</code>.
      </p>

      <pre><code>{`// Is T a string?
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
type C = IsString<"hello">; // true — string literal is assignable to string

// Extract only array types
type IsArray<T> = T extends unknown[] ? "array" : "not array";

type D = IsArray<string[]>; // "array"
type E = IsArray<string>;   // "not array"

// Conditional types in function signatures
function ensureArray<T>(value: T): T extends unknown[] ? T : T[] {
  return (Array.isArray(value) ? value : [value]) as T extends unknown[] ? T : T[];
}

const a = ensureArray("hello");  // string[]
const b = ensureArray([1, 2, 3]); // number[]`}</code></pre>

      <h2 id="distributive-conditionals">Distributive Conditional Types</h2>

      <p>
        When a conditional type is applied to a naked type parameter (i.e., <code>T</code>{" "}
        directly, not <code>T[]</code> or <code>{`{ x: T }`}</code>), TypeScript distributes
        the conditional over each member of a union. This is called distributivity, and it
        is what makes <code>Exclude</code> and <code>Extract</code> work.
      </p>

      <pre><code>{`// Distributive: applied to each union member independently
type Exclude<T, U> = T extends U ? never : T;

type Result = Exclude<"a" | "b" | "c", "a" | "b">;
// Distributes as:
// ("a" extends "a" | "b" ? never : "a")  → never
// | ("b" extends "a" | "b" ? never : "b") → never
// | ("c" extends "a" | "b" ? never : "c") → "c"
// Final: "c"

// To prevent distributivity, wrap T in a tuple
type IsExactly<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

type Dist1 = IsExactly<"a" | "b", "a" | "b">; // true
type Dist2 = IsExactly<string, string | number>; // false

// Without the tuple wrap, "a" | "b" extends "a" | "b" | "c" would distribute
// and each member would be checked independently`}</code></pre>

      <h2 id="infer-keyword">The infer Keyword</h2>

      <p>
        The <code>infer</code> keyword lets you capture a type from within a conditional
        type and use it in the output. It can only appear in the <code>extends</code> clause
        and creates a local type variable that TypeScript infers from the matched type.
      </p>

      <pre><code>{`// Unwrap a Promise — infer the resolved type
type Awaited<T> = T extends Promise<infer R> ? R : T;

type StringPromise = Awaited<Promise<string>>; // string
type NumberValue = Awaited<number>;             // number — not a Promise, returns T

// Extract the element type of an array
type ElementType<T> = T extends (infer E)[] ? E : never;

type StrElem = ElementType<string[]>;  // string
type NumElem = ElementType<number[]>;  // number
type NoElem = ElementType<string>;     // never — not an array

// infer in function types — extract the return type
type MyReturnType<F> = F extends (...args: unknown[]) => infer R ? R : never;

function fetchUser(id: string): Promise<{ name: string }> {
  return Promise.resolve({ name: "Alice" });
}

type FetchResult = MyReturnType<typeof fetchUser>; // Promise<{ name: string }>`}</code></pre>

      <h3 id="re-implementing-stdlib">Re-implementing Standard Utilities</h3>

      <p>
        The standard library&apos;s <code>ReturnType</code>, <code>Parameters</code>, and{" "}
        <code>Awaited</code> are all implemented with <code>infer</code>. Building them
        yourself cements the pattern.
      </p>

      <pre><code>{`// ReturnType<F> — extract what a function returns
type MyReturnType2<F extends (...args: never) => unknown> =
  F extends (...args: never) => infer R ? R : never;

// Parameters<F> — extract the parameter tuple of a function
type MyParameters<F extends (...args: never) => unknown> =
  F extends (...args: infer P) => unknown ? P : never;

// ConstructorParameters<C> — for class constructors
type MyConstructorParameters<C extends abstract new (...args: never) => unknown> =
  C extends abstract new (...args: infer P) => unknown ? P : never;

// Awaited<T> — recursively unwrap nested Promises
type MyAwaited<T> =
  T extends null | undefined
    ? T
    : T extends object & { then(onfulfilled: infer F): unknown }
    ? F extends (value: infer V) => unknown
      ? MyAwaited<V>
      : never
    : T;

type Nested = MyAwaited<Promise<Promise<string>>>; // string`}</code></pre>

      <h2 id="recursive-conditional-types">Recursive Conditional Types</h2>

      <p>
        Since TypeScript 4.1, conditional types can reference themselves recursively.
        This is essential for operating on deeply nested types.
      </p>

      <pre><code>{`// Deep partial — make every property at every depth optional
type DeepPartial<T> =
  T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

interface AppConfig {
  server: {
    host: string;
    port: number;
    tls: { enabled: boolean; certPath: string };
  };
  database: {
    url: string;
    pool: { min: number; max: number };
  };
}

type PartialConfig = DeepPartial<AppConfig>;
// Every property at every level is optional — great for config merging

// Flatten a nested array type
type DeepFlatten<T> = T extends (infer U)[] ? DeepFlatten<U> : T;
type Flat = DeepFlatten<number[][][]>; // number`}</code></pre>

      <h2 id="noinfer">NoInfer (TypeScript 5.4+)</h2>

      <p>
        <code>NoInfer&lt;T&gt;</code> is a utility type added in TypeScript 5.4 that
        suppresses inference for a specific type argument. Without it, TypeScript sometimes
        widens inferred types in ways you don&apos;t want. It&apos;s particularly useful
        for functions where one parameter should constrain another.
      </p>

      <pre><code>{`// Without NoInfer — TypeScript widens the return type based on the default
function createState<T>(initial: T, fallback: T): T {
  return initial ?? fallback;
}

// TypeScript infers T as string | number — probably not what you want
const state = createState("active", 0);

// With NoInfer — fallback can't widen T's inference
function createState2<T>(initial: T, fallback: NoInfer<T>): T {
  return initial ?? fallback;
}

// TypeScript infers T as string from 'initial', then checks fallback against string
const state2 = createState2("active", "inactive"); // T = string, OK
const state3 = createState2("active", 0);          // Error: 0 is not a string`}</code></pre>

      <h2 id="practical-applications">Practical Applications</h2>

      <p>
        Here are conditional type patterns that appear in real-world TypeScript libraries
        and codebases.
      </p>

      <pre><code>{`// Unwrap a type if it's wrapped in a specific container
type Unbox<T> = T extends { value: infer V } ? V : T;

type Boxed = { value: string };
type Unboxed = Unbox<Boxed>; // string
type Plain = Unbox<number>;  // number

// Get the type of the first argument of a function
type FirstArgument<F> = F extends (first: infer A, ...rest: never[]) => unknown ? A : never;

function greet(name: string, greeting: string): string {
  return \`\${greeting}, \${name}\`;
}
type NameType = FirstArgument<typeof greet>; // string

// Type-safe event emitter — infer payload type from event name
type EventPayloads = {
  "user:created": { id: string; name: string };
  "user:deleted": { id: string };
  "order:completed": { orderId: string; total: number };
};

type PayloadFor<E extends keyof EventPayloads> = EventPayloads[E];

function on<E extends keyof EventPayloads>(
  event: E,
  handler: (payload: PayloadFor<E>) => void
): void {
  // implementation
}

on("user:created", (payload) => {
  console.log(payload.id, payload.name); // fully typed
});

on("user:deleted", (payload) => {
  console.log(payload.total); // Error — total doesn't exist on user:deleted payload
});`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Conditional types: <code>T extends U ? X : Y</code> — the ternary of the type system</li>
        <li>Distributivity applies when <code>T</code> is a naked type parameter — it distributes over union members</li>
        <li>Wrap in a tuple (<code>[T] extends [U]</code>) to prevent distributivity</li>
        <li><code>infer</code> captures a type from within an <code>extends</code> pattern</li>
        <li><code>ReturnType</code>, <code>Parameters</code>, and <code>Awaited</code> are all built with <code>infer</code></li>
        <li>Recursive conditional types handle arbitrarily nested structures</li>
        <li><code>NoInfer&lt;T&gt;</code> (TS 5.4+) prevents unwanted type widening in inference</li>
      </ul>

      <p>
        The final module covers <strong>advanced patterns</strong> — <code>const</code>{" "}
        assertions, the <code>satisfies</code> operator, template literal types, module
        augmentation, and branded types that complete your TypeScript mastery.
      </p>
    </div>
  );
}
