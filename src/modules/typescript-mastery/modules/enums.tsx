import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "numeric-enums", title: "Numeric Enums", level: 2 },
  { id: "string-enums", title: "String Enums", level: 2 },
  { id: "const-enums", title: "const Enums", level: 2 },
  { id: "enum-pitfalls", title: "Enum Pitfalls", level: 2 },
  { id: "union-types-vs-enums", title: "Union Types vs Enums", level: 2 },
  { id: "when-to-use-enums", title: "When Enums Are Actually Right", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Enums() {
  return (
    <div className="article-content">
      <p>
        Enums are one of TypeScript's most controversial features — they exist in
        JavaScript as a concept but TypeScript compiles them into real runtime objects,
        which creates surprising behavior. Interviewers ask about enums specifically to
        see whether you understand these traps and when to reach for union types instead.
        The answer "I prefer union types" without knowing <em>why</em> is as weak as
        blindly using enums everywhere.
      </p>

      <h2 id="numeric-enums">Numeric Enums</h2>

      <p>
        Numeric enums auto-increment from 0 by default. Each member maps to a number,
        and TypeScript also creates a reverse mapping (number → name).
      </p>

      <pre><code>{`enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right, // 3
}

enum StatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalError = 500,
}

// Numeric enums have a reverse mapping at runtime:
console.log(Direction.Up);       // 0
console.log(Direction[0]);       // "Up"   ← reverse mapping
console.log(StatusCode.OK);      // 200
console.log(StatusCode[200]);    // "OK"

// The compiled JavaScript:
var Direction;
(function (Direction) {
  Direction[Direction["Up"] = 0] = "Up";
  Direction[Direction["Down"] = 1] = "Down";
  Direction[Direction["Left"] = 2] = "Left";
  Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));

// The dangerous hole: TypeScript accepts any number where a numeric enum is expected
function move(dir: Direction): void { }
move(Direction.Up);  // ✓
move(999);           // ✓ — no error! TypeScript doesn't narrow numeric enums`}</code></pre>

      <h2 id="string-enums">String Enums</h2>

      <p>
        String enums require explicit initialization. They don't have a reverse mapping,
        they serialize readably, and they don't have the "any number is valid" hole.
        They're significantly safer than numeric enums.
      </p>

      <pre><code>{`enum Role {
  Admin = "ADMIN",
  Editor = "EDITOR",
  Viewer = "VIEWER",
}

enum Environment {
  Development = "development",
  Staging = "staging",
  Production = "production",
}

// String enums are opaque at the type level
function deployTo(env: Environment): void {
  console.log(\`Deploying to \${env}\`);
}

deployTo(Environment.Production);   // ✓
// deployTo("production");           // ✗ Error — string is not assignable to Environment
// ^ This is intentional: string enums are nominal, not structural

// No reverse mapping in emitted JS:
// var Role;
// (function (Role) {
//   Role["Admin"] = "ADMIN";
//   Role["Editor"] = "EDITOR";
// })(Role || (Role = {}));

// Iterating enum values
const roles = Object.values(Role); // ["ADMIN", "EDITOR", "VIEWER"]
const envs = Object.values(Environment); // ["development", "staging", "production"]`}</code></pre>

      <h2 id="const-enums">const Enums</h2>

      <p>
        <code>const enum</code> is inlined at compile time — no runtime object is emitted.
        This is the most efficient form but comes with a significant caveat: it doesn't
        work with{" "}<code>isolatedModules</code> (which Vite, esbuild, and most modern
        toolchains use), and it breaks when enums are in separate packages.
      </p>

      <pre><code>{`const enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

function request(url: string, method: HttpMethod): void { }

request("/users", HttpMethod.GET);
request("/users", HttpMethod.POST);

// Compiled output — the enum is completely gone, values are inlined:
// request("/users", "GET");
// request("/users", "POST");

// Contrast with regular enum which emits a full object:
// const HttpMethod = { GET: "GET", POST: "POST", ... };

// ⚠️ const enum gotchas:
// 1. Can't iterate values — there's no runtime object
// 2. Breaks with isolatedModules: true (required by Babel/esbuild/Vite)
// 3. Breaks if enum is in a .d.ts file consumed by external packages
// 4. Debugging is harder — source maps show inlined strings, not member names

// Safe alternative when you need the inlining behavior:
const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;
type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];`}</code></pre>

      <h2 id="enum-pitfalls">Enum Pitfalls</h2>

      <p>
        These are the gotchas interviewers probe. Know all of them.
      </p>

      <pre><code>{`// Pitfall 1: Numeric enums accept any number
enum Status { Active = 1, Inactive = 2 }
function setStatus(s: Status) { }
setStatus(999);        // ✓ no error — this is a type hole
setStatus(Status.Active); // ✓

// Pitfall 2: Enums are NOT structurally typed — even if values match
enum A { X = "x" }
enum B { X = "x" }
let a: A = A.X;
// let a2: A = B.X; // ✗ Error — A and B are distinct types

// Pitfall 3: Heterogeneous enums — mixing string and number (avoid)
enum Mixed {
  No = 0,
  Yes = "YES", // technically valid, practically confusing
}

// Pitfall 4: Enum members are not narrowed in switch without default
enum Color { Red, Green, Blue }
function paint(c: Color): string {
  switch (c) {
    case Color.Red: return "red";
    case Color.Green: return "green";
    // If Blue is added later and we forget to add it here,
    // TypeScript won't warn us (no exhaustiveness check without never trick)
  }
  return "unknown"; // required, compiler doesn't know we've covered all cases
}

// Fix with never exhaustiveness:
function paintSafe(c: Color): string {
  switch (c) {
    case Color.Red: return "red";
    case Color.Green: return "green";
    case Color.Blue: return "blue";
    default: {
      const _: never = c; // ✗ Error if Color gets a new member we haven't handled
      return _;
    }
  }
}`}</code></pre>

      <h2 id="union-types-vs-enums">Union Types vs Enums</h2>

      <p>
        This is the question. Union types are the idiomatic TypeScript answer to most
        enum use cases. They're structural, they serialize naturally, they work with
        all toolchains, and they produce no runtime overhead.
      </p>

      <pre><code>{`// Enum approach
enum Direction { Up = "UP", Down = "DOWN", Left = "LEFT", Right = "RIGHT" }

function move(dir: Direction): void { }
move(Direction.Up);    // must use enum member
// move("UP");         // ✗ Error

// Union type approach
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

function move(dir: Direction): void { }
move("UP");            // ✓ direct string literal
move(Direction.Up);    // ✗ Direction doesn't exist

// Winner for most cases: union types
// - No runtime object emitted
// - Works with isolatedModules
// - Structural — compatible with string literals directly
// - Serializes to plain strings (no [object Object] surprises)
// - as const arrays let you iterate AND derive the union:

const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;
type Direction = (typeof DIRECTIONS)[number]; // "UP" | "DOWN" | "LEFT" | "RIGHT"

function isDirection(s: string): s is Direction {
  return (DIRECTIONS as readonly string[]).includes(s);
}

// Exhaustiveness with union types using never:
type Status = "pending" | "active" | "cancelled";

function handleStatus(status: Status): string {
  switch (status) {
    case "pending": return "Waiting...";
    case "active": return "Running";
    case "cancelled": return "Stopped";
    default: {
      const _exhaustive: never = status;
      throw new Error(\`Unhandled status: \${_exhaustive}\`);
    }
  }
}`}</code></pre>

      <h2 id="when-to-use-enums">When Enums Are Actually Right</h2>

      <p>
        Despite the preference for union types, enums have legitimate use cases —
        knowing when to use them demonstrates nuance.
      </p>

      <pre><code>{`// ✓ Use enums when you need runtime iteration AND named access:
enum Permission {
  Read = "read",
  Write = "write",
  Delete = "delete",
  Admin = "admin",
}

const allPermissions = Object.values(Permission);
// ["read", "write", "delete", "admin"] — iterate at runtime

function hasPermission(user: User, required: Permission): boolean {
  return user.permissions.includes(required);
}

// ✓ Use enums with bit flags (numeric) for permission systems:
enum FileAccess {
  None    = 0,
  Read    = 1 << 0, // 1
  Write   = 1 << 1, // 2
  Execute = 1 << 2, // 4
}

const access = FileAccess.Read | FileAccess.Write; // 3
const canRead = (access & FileAccess.Read) !== 0;  // true

// ✓ Use enums when interfacing with external systems that use numeric codes:
enum ErrorCode {
  InvalidInput     = 1001,
  Unauthorized     = 1002,
  NotFound         = 1003,
  DatabaseError    = 2001,
  ExternalApiError = 3001,
}

class AppError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

// ✗ Don't use enums for:
// - Simple string discriminators (use union types)
// - Config values (use as const objects)
// - Anything with isolatedModules: true (const enum will fail)`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Numeric enums have a type hole</strong> — any <code>number</code> is
          assignable. String enums are safer; they don't have a reverse mapping and reject
          plain strings.
        </li>
        <li>
          <strong><code>const enum</code></strong> is inlined (no runtime object) but breaks
          with <code>isolatedModules: true</code> — which most modern toolchains require.
          Prefer <code>as const</code> objects instead.
        </li>
        <li>
          <strong>Enums are nominal</strong> — two enums with identical values are not
          interchangeable. Union string literals are structural.
        </li>
        <li>
          <strong>Default to union types</strong> for discriminators, status values, and
          direction/state machines. Reach for enums only when you need runtime iteration
          of member names or bit-flag operations.
        </li>
        <li>
          <strong>Exhaustiveness checking</strong> works the same way for both: the
          <code>never</code> trick in a <code>default</code> branch catches unhandled cases
          at compile time.
        </li>
      </ul>
    </div>
  );
}
