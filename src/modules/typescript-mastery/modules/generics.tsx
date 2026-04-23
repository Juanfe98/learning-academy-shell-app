import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-generics", title: "Why Generics?", level: 2 },
  { id: "generic-functions", title: "Generic Functions", level: 2 },
  { id: "multiple-type-parameters", title: "Multiple Type Parameters", level: 3 },
  { id: "type-constraints", title: "Type Constraints with extends", level: 2 },
  { id: "generic-interfaces", title: "Generic Interfaces", level: 2 },
  { id: "generic-classes", title: "Generic Classes", level: 2 },
  { id: "default-type-parameters", title: "Default Type Parameters", level: 2 },
  { id: "generic-utilities", title: "Building Generic Utilities", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Generics() {
  return (
    <div className="article-content">
      <p>
        Generics are the mechanism that makes TypeScript genuinely powerful rather than
        just a type-annotated version of JavaScript. They let you write functions,
        interfaces, and classes that are parameterized by type — reusable across many
        data shapes without sacrificing type safety. If you find yourself using{" "}
        <code>any</code> to make a function flexible, generics are almost always the
        right answer.
      </p>

      <h2 id="why-generics">Why Generics?</h2>

      <p>
        Consider a function that wraps a value in an array. Without generics, you either
        lose type information or duplicate the function for every type you need.
      </p>

      <pre><code>{`// Option 1: uses any — loses type information
function wrapAny(value: any): any[] {
  return [value];
}
const result = wrapAny(42); // result is any[], not number[]

// Option 2: overloads for every type — brittle and repetitive
function wrapNumber(value: number): number[] { return [value]; }
function wrapString(value: string): string[] { return [value]; }

// Option 3: generic — reusable and type-safe
function wrap<T>(value: T): T[] {
  return [value];
}
const nums = wrap(42);       // inferred as number[]
const strs = wrap("hello");  // inferred as string[]`}</code></pre>

      <p>
        The <code>T</code> in <code>wrap&lt;T&gt;</code> is a type parameter — a placeholder
        that TypeScript fills in based on the argument you pass. The compiler infers it
        automatically in most cases; you only need to provide it explicitly when inference
        fails.
      </p>

      <h2 id="generic-functions">Generic Functions</h2>

      <p>
        Type parameters are declared in angle brackets before the parameter list. By
        convention, single-parameter generics use <code>T</code>; when there are
        multiple, use descriptive names or sequential letters.
      </p>

      <pre><code>{`// Identity function — returns whatever it receives
function identity<T>(value: T): T {
  return value;
}

// Get the first element of an array
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const head = first([1, 2, 3]); // head: number | undefined
const name = first(["Alice", "Bob"]); // name: string | undefined

// Explicit type argument when inference needs help
const empty = first<string>([]); // empty: string | undefined`}</code></pre>

      <h3 id="multiple-type-parameters">Multiple Type Parameters</h3>

      <p>
        Functions can have any number of type parameters. A <code>zip</code> function that
        pairs two arrays is a classic example — it needs two independent type parameters to
        track what&apos;s in each array.
      </p>

      <pre><code>{`function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  const length = Math.min(as.length, bs.length);
  return Array.from({ length }, (_, i) => [as[i], bs[i]]);
}

const pairs = zip(["a", "b", "c"], [1, 2, 3]);
// pairs: [string, number][]
// [["a", 1], ["b", 2], ["c", 3]]

// Map an object's values to a new shape
function mapValues<K extends string, V, R>(
  obj: Record<K, V>,
  fn: (value: V, key: K) => R
): Record<K, R> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fn(v as V, k as K)])
  ) as Record<K, R>;
}

const doubled = mapValues({ a: 1, b: 2 }, (n) => n * 2);
// doubled: Record<"a" | "b", number> = { a: 2, b: 4 }`}</code></pre>

      <h2 id="type-constraints">Type Constraints with extends</h2>

      <p>
        By default, a type parameter <code>T</code> can be anything. When your
        implementation needs to access specific properties, you constrain the type
        parameter with <code>extends</code>. This tells TypeScript &quot;T must have at
        least these properties.&quot;
      </p>

      <pre><code>{`// Without constraint — accessing .length would be an error
function logLength<T extends { length: number }>(value: T): T {
  console.log(\`Length: \${value.length}\`);
  return value;
}

logLength("hello");    // OK — strings have .length
logLength([1, 2, 3]);  // OK — arrays have .length
logLength(42);         // Error — numbers don't have .length

// Constraining to keys of another type
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "123", name: "Alice", age: 30 };
const name = getProperty(user, "name"); // name: string
const age = getProperty(user, "age");   // age: number
getProperty(user, "email");             // Error — "email" is not a key of user`}</code></pre>

      <h2 id="generic-interfaces">Generic Interfaces</h2>

      <p>
        Interfaces can be parameterized too. This is how you define reusable contracts
        for data structures like repositories, caches, and event emitters.
      </p>

      <pre><code>{`interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

// Concrete implementations are fully typed
class UserRepository implements Repository<User> {
  async findById(id: string): Promise<User | null> {
    return null; // database call goes here
  }
  async findAll(): Promise<User[]> { return []; }
  async save(user: User): Promise<User> { return user; }
  async delete(id: string): Promise<void> {}
}`}</code></pre>

      <h2 id="generic-classes">Generic Classes</h2>

      <p>
        Generic classes are useful for data structures that need to work with arbitrary
        types — stacks, queues, caches, result wrappers.
      </p>

      <pre><code>{`class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
const top = numberStack.pop(); // top: number | undefined

const stringStack = new Stack<string>();
stringStack.push("first");
stringStack.push(42); // Error — Argument of type 'number' is not assignable to 'string'`}</code></pre>

      <h2 id="default-type-parameters">Default Type Parameters</h2>

      <p>
        Like function parameters, type parameters can have defaults. This is useful when
        you have a sensible fallback but still want to allow customization.
      </p>

      <pre><code>{`interface ApiResponse<T = unknown, E = Error> {
  data: T | null;
  error: E | null;
  status: number;
}

// Without type argument — uses defaults
function handleResponse(res: ApiResponse) {
  if (res.data) {
    // data: unknown — must narrow before use
  }
}

// With explicit type argument — fully typed
function handleUserResponse(res: ApiResponse<User>) {
  if (res.data) {
    console.log(res.data.name); // data: User — no narrowing needed
  }
}`}</code></pre>

      <h2 id="generic-utilities">Building Generic Utilities</h2>

      <p>
        Generic functions shine when building utilities that abstract over repetitive
        type-safe patterns. Here are a few that appear in real codebases.
      </p>

      <pre><code>{`// Safe getter with a fallback
function get<T, K extends keyof T>(obj: T, key: K, fallback: T[K]): T[K] {
  return obj[key] ?? fallback;
}

// Group an array by a key
function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    (groups[key] ??= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

const users = [
  { name: "Alice", role: "admin" },
  { name: "Bob", role: "user" },
  { name: "Carol", role: "admin" },
];

const byRole = groupBy(users, (u) => u.role);
// byRole: Record<"admin" | "user", { name: string; role: string }[]>

// Async queue processor with typed callbacks
async function processAll<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  return Promise.all(items.map(processor));
}`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Generics let you write code that is both reusable and type-safe — without reaching for <code>any</code></li>
        <li>TypeScript infers type arguments from the values you pass; explicit arguments are rarely needed</li>
        <li>Use <code>extends</code> to constrain what a type parameter can be</li>
        <li><code>keyof T</code> combined with generics enables safe property access patterns</li>
        <li>Generic interfaces define reusable contracts; generic classes define reusable data structures</li>
        <li>Default type parameters let callers opt into specificity without requiring it</li>
      </ul>

      <p>
        The next module covers <strong>utility types</strong> — the built-in generic types
        that TypeScript ships with for transforming and deriving new types from existing ones.
      </p>
    </div>
  );
}
