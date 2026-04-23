import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "overview", title: "Overview", level: 2 },
  { id: "object-modifiers", title: "Object Modifiers", level: 2 },
  { id: "partial-required-readonly", title: "Partial, Required, and Readonly", level: 3 },
  { id: "picking-and-omitting", title: "Pick and Omit", level: 2 },
  { id: "record", title: "Record", level: 2 },
  { id: "set-operations", title: "Set Operations: Exclude and Extract", level: 2 },
  { id: "nonnullable", title: "NonNullable", level: 3 },
  { id: "function-utilities", title: "Function Utilities", level: 2 },
  { id: "returntype-parameters", title: "ReturnType and Parameters", level: 3 },
  { id: "instancetype", title: "InstanceType", level: 3 },
  { id: "combining-utilities", title: "Combining Utilities", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function UtilityTypes() {
  return (
    <div className="article-content">
      <p>
        TypeScript ships with a library of built-in generic types — called utility types —
        that transform one type into another. They are the standard vocabulary for expressing
        common type transformations: &quot;I want all the fields of this type, but optional&quot;
        or &quot;I want only these specific keys.&quot; Knowing them saves you from re-inventing
        the wheel and makes your intent immediately clear to other developers.
      </p>

      <h2 id="overview">Overview</h2>

      <p>
        All utility types are generic: they take one or more type arguments and produce
        a new type. They are implemented using the same mapped type and conditional type
        machinery covered in later modules — but you don&apos;t need to understand the
        implementation to use them effectively.
      </p>

      <pre><code>{`interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
}

// We'll use User throughout this module as the base type`}</code></pre>

      <h2 id="object-modifiers">Object Modifiers</h2>

      <h3 id="partial-required-readonly">Partial, Required, and Readonly</h3>

      <p>
        These three utilities modify the optionality and mutability of every field in an
        object type. They are inverses of each other in pairs.
      </p>

      <pre><code>{`// Partial<T> — makes every field optional
// Common use case: update payloads where you only send changed fields
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; role?: ...; createdAt?: Date }

async function updateUser(id: string, changes: Partial<User>): Promise<User> {
  const existing = await db.users.findById(id);
  return db.users.save({ ...existing, ...changes, id });
}

// Required<T> — makes every optional field required
// Common use case: after validation, you know all fields are present
interface DraftConfig {
  host?: string;
  port?: number;
  timeout?: number;
}

type ResolvedConfig = Required<DraftConfig>;
// { host: string; port: number; timeout: number }

function validateConfig(draft: DraftConfig): ResolvedConfig {
  if (!draft.host || !draft.port || !draft.timeout) {
    throw new Error("Config is incomplete");
  }
  return draft as ResolvedConfig;
}

// Readonly<T> — makes every field non-reassignable
// Common use case: configuration objects, frozen state
type FrozenUser = Readonly<User>;

function processUser(user: FrozenUser): void {
  user.name = "Hacked"; // Error: Cannot assign to 'name' — it is a read-only property
}`}</code></pre>

      <h2 id="picking-and-omitting">Pick and Omit</h2>

      <p>
        <code>Pick</code> and <code>Omit</code> let you carve out a subset of an object
        type. They are complementary: <code>Pick</code> says &quot;keep only these keys&quot;;
        <code>Omit</code> says &quot;keep everything except these keys.&quot;
      </p>

      <pre><code>{`// Pick<T, K> — keep only the specified keys
// Common use case: DTO / API response shapes
type UserPreview = Pick<User, "id" | "name">;
// { id: string; name: string }

type UserProfile = Pick<User, "name" | "email" | "role">;
// { name: string; email: string; role: "admin" | "editor" | "viewer" }

// Omit<T, K> — remove the specified keys
// Common use case: removing server-generated fields before creation
type CreateUserPayload = Omit<User, "id" | "createdAt">;
// { name: string; email: string; role: "admin" | "editor" | "viewer" }

async function createUser(payload: CreateUserPayload): Promise<User> {
  return db.users.insert({
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  });
}`}</code></pre>

      <p>
        Pick and Omit are especially valuable with large interfaces — they let you derive
        narrow types without duplicating field declarations that would drift out of sync.
      </p>

      <h2 id="record">Record</h2>

      <p>
        <code>Record&lt;K, V&gt;</code> constructs an object type with keys of type <code>K</code>
        and values of type <code>V</code>. It is the correct type for lookup tables and maps.
      </p>

      <pre><code>{`// Simple lookup table
type RolePermissions = Record<"admin" | "editor" | "viewer", string[]>;

const permissions: RolePermissions = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"],
};

// Record over a union type — ensures all cases are handled
type HttpStatusMessage = Record<200 | 201 | 400 | 401 | 404 | 500, string>;

const statusMessages: HttpStatusMessage = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  500: "Internal Server Error",
  // Forgetting any key here would be a compile error
};

// Dynamic key sets
function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}`}</code></pre>

      <h2 id="set-operations">Set Operations: Exclude and Extract</h2>

      <p>
        <code>Exclude</code> and <code>Extract</code> operate on union types the way{" "}
        <code>Omit</code> and <code>Pick</code> operate on object keys. They remove or
        keep members of a union based on assignability.
      </p>

      <pre><code>{`type EventType =
  | "click"
  | "keydown"
  | "keyup"
  | "focus"
  | "blur"
  | "submit";

// Exclude<T, U> — remove union members assignable to U
type NonKeyboardEvents = Exclude<EventType, "keydown" | "keyup">;
// "click" | "focus" | "blur" | "submit"

// Extract<T, U> — keep only union members assignable to U
type KeyboardEvents = Extract<EventType, "keydown" | "keyup">;
// "keydown" | "keyup"

// Real use case: extract only the string members from a mixed union
type StringsOnly = Extract<string | number | boolean | null, string>;
// string

// Extract object types from a union (using a structural constraint)
type ApiPayload =
  | { type: "user"; user: User }
  | { type: "error"; code: number }
  | string
  | null;

type ObjectPayloads = Extract<ApiPayload, object>;
// { type: "user"; user: User } | { type: "error"; code: number }`}</code></pre>

      <h3 id="nonnullable">NonNullable</h3>

      <p>
        <code>NonNullable&lt;T&gt;</code> removes <code>null</code> and <code>undefined</code>
        from a type. It&apos;s shorthand for <code>Exclude&lt;T, null | undefined&gt;</code>
        and is useful after performing null checks.
      </p>

      <pre><code>{`type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>; // User

// Useful with mapped types and conditional logic
function compact<T>(arr: (T | null | undefined)[]): NonNullable<T>[] {
  return arr.filter((x): x is NonNullable<T> => x != null);
}

const ids = ["abc", null, "def", undefined, "ghi"];
const validIds = compact(ids); // string[]`}</code></pre>

      <h2 id="function-utilities">Function Utilities</h2>

      <h3 id="returntype-parameters">ReturnType and Parameters</h3>

      <p>
        These utilities extract type information from function types — useful when you
        need to derive types from functions you don&apos;t control.
      </p>

      <pre><code>{`function fetchUser(id: string, options?: { cache: boolean }): Promise<User> {
  return Promise.resolve({} as User);
}

// ReturnType<F> — the type returned by function F
type FetchUserReturn = ReturnType<typeof fetchUser>;
// Promise<User>

type UserPromise = Awaited<ReturnType<typeof fetchUser>>;
// User — Awaited unwraps the Promise

// Parameters<F> — a tuple of the parameter types of function F
type FetchUserParams = Parameters<typeof fetchUser>;
// [id: string, options?: { cache: boolean } | undefined]

// Real use case: wrapping a function with the same signature
function withLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    console.log(\`Calling \${name}\`);
    return fn(...args) as ReturnType<T>;
  };
}

const loggedFetch = withLogging(fetchUser, "fetchUser");
loggedFetch("abc", { cache: true }); // fully typed`}</code></pre>

      <h3 id="instancetype">InstanceType</h3>

      <p>
        <code>InstanceType&lt;C&gt;</code> extracts the instance type of a constructor
        function. It&apos;s useful when working with class constructors as values.
      </p>

      <pre><code>{`class UserRepository {
  findById(id: string): User | null { return null; }
}

class ProductRepository {
  findById(id: string): Product | null { return null; }
}

// When you have the class itself, not an instance
type UserRepo = InstanceType<typeof UserRepository>;
// equivalent to: UserRepository (the instance type)

// Real use case: factory functions that accept class constructors
function createRepository<T extends new (...args: unknown[]) => unknown>(
  Repo: T
): InstanceType<T> {
  return new Repo() as InstanceType<T>;
}

const userRepo = createRepository(UserRepository); // UserRepository
userRepo.findById("123"); // typed correctly`}</code></pre>

      <h2 id="combining-utilities">Combining Utilities</h2>

      <p>
        The real power of utility types comes from composing them. Real-world types are
        often derived from multiple transformations.
      </p>

      <pre><code>{`interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Creation payload: omit server-generated fields, make publishedAt optional
type CreatePostPayload = Omit<BlogPost, "id" | "createdAt" | "updatedAt">;

// Update payload: only the editable fields, all optional
type UpdatePostPayload = Partial<Pick<BlogPost, "title" | "content" | "tags" | "publishedAt">>;

// Search index entry: only what's needed for search
type PostSearchEntry = Pick<BlogPost, "id" | "title" | "tags"> & {
  excerpt: string; // derived field not in the original type
};`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>Partial</code>, <code>Required</code>, <code>Readonly</code> — modify every field&apos;s optionality/mutability</li>
        <li><code>Pick</code> and <code>Omit</code> — carve subsets from object types without duplication</li>
        <li><code>Record&lt;K, V&gt;</code> — the correct type for lookup tables and dictionaries</li>
        <li><code>Exclude</code> and <code>Extract</code> — remove or keep members from union types</li>
        <li><code>NonNullable</code> — strips <code>null</code> and <code>undefined</code></li>
        <li><code>ReturnType</code> and <code>Parameters</code> — extract types from function signatures</li>
        <li>Compose utilities to derive complex types from simpler ones — avoid duplication</li>
      </ul>

      <p>
        The next module covers <strong>type narrowing</strong> — the mechanism TypeScript
        uses to refine types within conditional branches.
      </p>
    </div>
  );
}
