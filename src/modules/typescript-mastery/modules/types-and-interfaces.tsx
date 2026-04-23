import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "type-aliases", title: "Type Aliases", level: 2 },
  { id: "interfaces", title: "Interfaces", level: 2 },
  { id: "key-differences", title: "Key Differences", level: 2 },
  { id: "declaration-merging", title: "Declaration Merging", level: 3 },
  { id: "when-to-use-which", title: "When to Use Which", level: 3 },
  { id: "intersection-vs-extends", title: "Intersection (&) vs extends", level: 2 },
  { id: "advanced-object-shapes", title: "Advanced Object Shapes", level: 2 },
  { id: "index-signatures", title: "Index Signatures", level: 3 },
  { id: "readonly-optional", title: "Readonly and Optional Fields", level: 3 },
  { id: "discriminated-unions", title: "Discriminated Unions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypesAndInterfaces() {
  return (
    <div className="article-content">
      <p>
        Every TypeScript codebase uses two constructs to describe object shapes:{" "}
        <code>type</code> aliases and <code>interface</code> declarations. They overlap
        significantly — both can describe objects, both support generics, both can be
        extended — but they have meaningful differences that make each more appropriate
        in specific situations.
      </p>

      <h2 id="type-aliases">Type Aliases</h2>

      <p>
        A <code>type</code> alias gives a name to any type expression. That means it can
        describe objects, unions, intersections, primitives, tuples, function signatures,
        or any combination thereof.
      </p>

      <pre><code>{`// Object shape
type User = {
  id: string;
  name: string;
  email: string;
};

// Union
type Status = "pending" | "active" | "suspended";

// Tuple
type Coordinates = [number, number];

// Function signature
type Predicate<T> = (value: T) => boolean;

// Combining them
type ActiveUser = User & { status: "active" };`}</code></pre>

      <h2 id="interfaces">Interfaces</h2>

      <p>
        An <code>interface</code> declaration describes the shape of an object. It looks
        different syntactically but serves the same purpose as an object type alias for
        the most common use case. Interfaces are the conventional choice for describing
        APIs — especially when you expect the type to be implemented by a class or extended
        by other interfaces.
      </p>

      <pre><code>{`interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends User {
  permissions: string[];
  lastLogin: Date;
}

// A class can implement an interface
class UserService implements User {
  id = crypto.randomUUID();
  name = "Service Account";
  email = "service@internal.com";
}`}</code></pre>

      <h2 id="key-differences">Key Differences</h2>

      <p>
        The two constructs are nearly identical for object shapes, but there are several
        concrete distinctions you need to know.
      </p>

      <h3 id="declaration-merging">Declaration Merging</h3>

      <p>
        Interfaces support <strong>declaration merging</strong>: if you declare two
        interfaces with the same name in the same scope, TypeScript merges them into a
        single type. Type aliases cannot be redeclared — doing so is an error.
      </p>

      <pre><code>{`// Interface merging — both declarations combine
interface Config {
  host: string;
}

interface Config {
  port: number;
}

// Config is now { host: string; port: number }
const config: Config = { host: "localhost", port: 3000 }; // OK

// Type alias — redeclaration is an error
type Config2 = { host: string };
type Config2 = { port: number }; // Error: Duplicate identifier 'Config2'`}</code></pre>

      <p>
        Declaration merging is primarily useful when augmenting third-party library types.
        For example, Express&apos;s <code>Request</code> interface can be extended to add
        your own properties (like an authenticated user) without modifying the library.
      </p>

      <pre><code>{`// express.d.ts — augmenting a third-party interface
declare module "express" {
  interface Request {
    user?: { id: string; role: string };
  }
}

// Now req.user is typed everywhere
app.get("/profile", (req, res) => {
  console.log(req.user?.id); // typed, no cast needed
});`}</code></pre>

      <h3 id="when-to-use-which">When to Use Which</h3>

      <p>
        The TypeScript team&apos;s own guidance: use <code>interface</code> when you&apos;re
        describing the public API surface of objects or classes, and use <code>type</code>
        when you need unions, intersections, tuples, or conditional types — anything that
        isn&apos;t a plain object shape. In practice, many teams just pick one and stick with
        it. The most important rule is to be consistent within a codebase.
      </p>

      <pre><code>{`// Prefer interface for object shapes that describe a "thing"
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// Prefer type for unions, computed types, and non-object shapes
type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };`}</code></pre>

      <h2 id="intersection-vs-extends">Intersection (&) vs extends</h2>

      <p>
        Both combine types, but they handle conflicts differently. With{" "}
        <code>extends</code>, TypeScript errors immediately when a property in the child
        conflicts with the parent. With <code>&amp;</code>, conflicting property types
        are intersected — which often produces <code>never</code> silently.
      </p>

      <pre><code>{`// Interface extends — catches conflicts at the declaration site
interface Base { id: string | number }
interface Derived extends Base { id: string } // Error: incompatible type for 'id'

// Intersection — merges silently, conflict becomes never
type Base2 = { id: string | number };
type Derived2 = Base2 & { id: string }; // OK — id is string & (string | number) = string
type Conflicting = { id: string } & { id: number }; // id is string & number = never`}</code></pre>

      <p>
        Prefer <code>extends</code> for class-like hierarchies where catching conflicts
        early is valuable. Use <code>&amp;</code> for ad-hoc composition of object shapes
        that you own and know won&apos;t conflict.
      </p>

      <h2 id="advanced-object-shapes">Advanced Object Shapes</h2>

      <h3 id="index-signatures">Index Signatures</h3>

      <p>
        When you need an object with dynamic string keys but uniform value types, use an
        index signature. This is common for lookup tables and dictionaries.
      </p>

      <pre><code>{`interface StringMap {
  [key: string]: string;
}

const headers: StringMap = {
  "Content-Type": "application/json",
  "Authorization": "Bearer token",
};

// You can mix specific keys with an index signature,
// but specific values must be subtypes of the index signature value type
interface Config {
  [key: string]: string | number;
  timeout: number;   // OK — number is assignable to string | number
  name: string;      // OK — string is assignable to string | number
  // active: boolean; // Error — boolean is not assignable to string | number
}`}</code></pre>

      <h3 id="readonly-optional">Readonly and Optional Fields</h3>

      <p>
        <code>readonly</code> prevents reassignment after construction. <code>?</code>
        marks a field as optional (its type becomes <code>T | undefined</code>).
        These modifiers compose freely with all other type features.
      </p>

      <pre><code>{`interface DatabaseRecord {
  readonly id: string;       // can't be changed after creation
  readonly createdAt: Date;
  updatedAt?: Date;          // may not exist yet
  deletedAt?: Date;
}

const record: DatabaseRecord = {
  id: "abc-123",
  createdAt: new Date(),
};

record.id = "xyz"; // Error: Cannot assign to 'id' because it is a read-only property

// readonly on arrays prevents mutation methods
const ids: readonly string[] = ["a", "b", "c"];
ids.push("d"); // Error: Property 'push' does not exist on type 'readonly string[]'`}</code></pre>

      <h2 id="discriminated-unions">Discriminated Unions</h2>

      <p>
        Discriminated unions (also called tagged unions) are a pattern where each member
        of a union type has a literal property that uniquely identifies it. TypeScript uses
        this discriminant to narrow the type precisely inside conditionals.
      </p>

      <pre><code>{`type NetworkState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; message: string };

function render(state: NetworkState) {
  switch (state.status) {
    case "idle":
      return "Start fetching...";
    case "loading":
      return "Loading...";
    case "success":
      return state.data; // TypeScript knows data exists here
    case "error":
      return \`Error: \${state.message}\`; // and message here
  }
}`}</code></pre>

      <p>
        This pattern is far more powerful than using optional fields, because TypeScript
        can guarantee that <code>data</code> exists only when <code>status === "success"</code>
        — impossible to model with optionals alone.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Use <code>interface</code> for object shapes and class contracts; use <code>type</code> for unions, tuples, and complex computed types</li>
        <li>Declaration merging is an interface-only feature — essential for augmenting third-party types</li>
        <li><code>extends</code> catches conflicting properties immediately; <code>&amp;</code> intersects them (sometimes producing <code>never</code>)</li>
        <li>Index signatures describe dictionaries with uniform value types</li>
        <li><code>readonly</code> prevents reassignment; <code>?</code> marks fields optional</li>
        <li>Discriminated unions with a literal discriminant field enable precise, exhaustive type narrowing</li>
      </ul>

      <p>
        The next module covers <strong>generics</strong> — the mechanism that lets you
        write reusable, type-safe functions and data structures that work across any type.
      </p>
    </div>
  );
}
