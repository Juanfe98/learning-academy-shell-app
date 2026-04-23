import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "const-assertions", title: "const Assertions", level: 2 },
  { id: "satisfies-operator", title: "The satisfies Operator (TS 4.9+)", level: 2 },
  { id: "satisfies-vs-annotation", title: "satisfies vs Type Annotation", level: 3 },
  { id: "template-literal-types", title: "Template Literal Types", level: 2 },
  { id: "intrinsic-string-types", title: "Intrinsic String Manipulation Types", level: 3 },
  { id: "module-augmentation", title: "Module Augmentation", level: 2 },
  { id: "branded-types", title: "Branded / Opaque Types", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AdvancedPatterns() {
  return (
    <div className="article-content">
      <p>
        This final module covers a set of advanced TypeScript features that don&apos;t fit
        neatly into a single conceptual category but appear consistently in serious
        TypeScript codebases. Mastering them separates engineers who use TypeScript
        from engineers who understand it deeply enough to make architectural decisions
        about type safety.
      </p>

      <h2 id="const-assertions">const Assertions</h2>

      <p>
        By default, TypeScript widens literal types when you initialize a variable. A
        string <code>"active"</code> becomes <code>string</code>, and an array{" "}
        <code>[1, 2, 3]</code> becomes <code>number[]</code>. The <code>as const</code>{" "}
        assertion prevents this widening, locking the type to the exact shape of the value.
      </p>

      <pre><code>{`// Without as const — types are widened
const config = {
  env: "production",
  port: 3000,
  features: ["auth", "payments"],
};
// config.env: string — not "production"
// config.port: number — not 3000
// config.features: string[] — not ["auth", "payments"]

// With as const — types are the narrowest possible
const config2 = {
  env: "production",
  port: 3000,
  features: ["auth", "payments"],
} as const;
// config2.env: "production" (literal)
// config2.port: 3000 (literal)
// config2.features: readonly ["auth", "payments"] (readonly tuple)

// Practical use: derive union types from constant arrays
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number]; // "admin" | "editor" | "viewer"

const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  settings: "/settings",
} as const;
type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]; // "/" | "/dashboard" | "/settings"

// Validate against the union — the array is the single source of truth
function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}`}</code></pre>

      <h2 id="satisfies-operator">The satisfies Operator (TS 4.9+)</h2>

      <p>
        The <code>satisfies</code> operator validates that a value conforms to a type
        while preserving the value&apos;s inferred type. This solves a long-standing
        problem: type annotations give you validation but lose the specific literal types;
        no annotation preserves the literals but loses the validation.
      </p>

      <pre><code>{`type Theme = {
  colors: Record<string, string | [number, number, number]>;
};

// With type annotation — theme is typed as Theme, literals are lost
const theme1: Theme = {
  colors: {
    primary: "#6366f1",
    accent: [99, 102, 241],
  },
};
// theme1.colors.primary is string, not "#6366f1"
// theme1.colors.accent is string | [number, number, number], not [number, number, number]

// With satisfies — TypeScript validates against Theme AND keeps specific types
const theme2 = {
  colors: {
    primary: "#6366f1",
    accent: [99, 102, 241],
  },
} satisfies Theme;
// theme2.colors.primary is string (a string value — correct)
// theme2.colors.accent is [number, number, number] — preserved!

theme2.colors.accent.map((n) => n / 255); // works — TypeScript knows it's an array`}</code></pre>

      <h3 id="satisfies-vs-annotation">satisfies vs Type Annotation</h3>

      <p>
        The rule of thumb: use a type annotation when you want to work with the object
        through the declared type&apos;s interface. Use <code>satisfies</code> when you
        need the compile-time validation of a type but also want to preserve the specific
        inferred type of the value for downstream use.
      </p>

      <pre><code>{`// Use annotation: you'll pass this to functions expecting Theme
const theme: Theme = buildTheme();

// Use satisfies: you need precise types AND type validation
const PALETTE = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
} satisfies Record<string, string>;

// This works — PALETTE.red is still string, but TypeScript
// knows the exact keys via the inferred type
const red = PALETTE.red;           // string
const missing = PALETTE.purple;    // Error — "purple" is not a key

// With annotation, PALETTE.purple would also be valid (Record<string, string> allows any key)`}</code></pre>

      <h2 id="template-literal-types">Template Literal Types</h2>

      <p>
        Template literal types let you construct new string literal types using template
        syntax. They can produce unions from cross-products of other union types, enabling
        type-safe string construction patterns.
      </p>

      <pre><code>{`type Direction = "top" | "right" | "bottom" | "left";
type Axis = "x" | "y";

// Cross-product — all combinations of two unions
type DirectionAxis = \`\${Direction}-\${Axis}\`;
// "top-x" | "top-y" | "right-x" | "right-y" | ...

// CSS margin/padding shorthand types
type SpacingProperty = "margin" | "padding";
type Side = "top" | "right" | "bottom" | "left";
type SpacingKey = \`\${SpacingProperty}-\${Side}\`;
// "margin-top" | "margin-right" | ... | "padding-bottom" | "padding-left"

// Type-safe event names with namespacing
type AppEvent = \`\${"user" | "order" | "payment"}:\${"created" | "updated" | "deleted"}\`;
// "user:created" | "user:updated" | ... | "payment:deleted"

function emit(event: AppEvent, payload: unknown): void {
  // implementation
}

emit("user:created", { id: "123" }); // OK
emit("user:purchased", {});           // Error — not a valid AppEvent`}</code></pre>

      <h3 id="intrinsic-string-types">Intrinsic String Manipulation Types</h3>

      <p>
        TypeScript provides four built-in types that transform string literal types:
        <code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>, and{" "}
        <code>Uncapitalize</code>. These are implemented in the compiler itself and
        are commonly combined with template literals.
      </p>

      <pre><code>{`type EventName = "click" | "focus" | "blur";

type HandlerName = \`on\${Capitalize<EventName>}\`;
// "onClick" | "onFocus" | "onBlur"

// Generate CSS custom property names
type CSSVar<T extends string> = \`--\${Lowercase<T>}\`;
type ColorToken = CSSVar<"Primary" | "Secondary" | "Accent">;
// "--primary" | "--secondary" | "--accent"

// Screaming snake case for constants
type ToConstant<T extends string> = Uppercase<T>;
type DBTable = ToConstant<"users" | "products" | "orders">;
// "USERS" | "PRODUCTS" | "ORDERS"`}</code></pre>

      <h2 id="module-augmentation">Module Augmentation</h2>

      <p>
        Module augmentation lets you add new declarations to existing modules without
        modifying their source. This is the correct way to extend third-party types —
        used heavily in frameworks like Express, Next.js, and Fastify.
      </p>

      <pre><code>{`// Extend Express Request with authentication context
// types/express.d.ts
declare module "express" {
  interface Request {
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
    correlationId?: string;
  }
}

// Now in your route handlers:
app.get("/me", requireAuth, (req, res) => {
  // req.user is typed — no cast needed
  res.json({ name: req.user?.email });
});

// Extend process.env for type-safe environment variables
// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    JWT_SECRET: string;
    PORT?: string;
    NODE_ENV: "development" | "production" | "test";
  }
}

// process.env.DATABASE_URL is now string (not string | undefined)
const dbUrl: string = process.env.DATABASE_URL;`}</code></pre>

      <h2 id="branded-types">Branded / Opaque Types</h2>

      <p>
        TypeScript&apos;s structural type system means that two types with the same
        shape are interchangeable. This creates a problem when you have semantically
        distinct values of the same underlying type — like user IDs, product IDs, and
        session tokens, all of which are <code>string</code>. A branded type wraps the
        primitive in a nominal tag, making it impossible to accidentally pass one kind
        of ID where another is expected.
      </p>

      <pre><code>{`// The branding pattern — declare a brand property that never exists at runtime
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

// Create distinct branded types
type UserId = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;
type OrderId = Brand<string, "OrderId">;

// Constructor functions that "cast" plain strings to branded types
function UserId(id: string): UserId {
  return id as UserId;
}

function ProductId(id: string): ProductId {
  return id as ProductId;
}

// Functions that require specific branded types
async function getUser(id: UserId): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then((r) => r.json());
}

async function getProduct(id: ProductId): Promise<Product> {
  return fetch(\`/api/products/\${id}\`).then((r) => r.json());
}

const userId = UserId("user-abc-123");
const productId = ProductId("prod-xyz-456");

getUser(userId);     // OK
getUser(productId);  // Error — Argument of type 'ProductId' is not assignable to type 'UserId'

// Validation at the boundary — parse and brand together
function parseUserId(raw: string): UserId {
  if (!raw.startsWith("user-")) throw new Error("Invalid user ID format");
  return raw as UserId;
}`}</code></pre>

      <p>
        Branded types add zero runtime overhead — the brand property exists only in the
        type system and is completely erased in the compiled JavaScript. The safety is
        purely compile-time.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>as const</code> prevents type widening — all values become their exact literal types</li>
        <li>Derive union types from <code>as const</code> arrays with <code>(typeof ARRAY)[number]</code></li>
        <li><code>satisfies</code> validates a value against a type while preserving the inferred type — use it over annotations when you need both</li>
        <li>Template literal types construct new string literal types from cross-products of union types</li>
        <li><code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>, <code>Uncapitalize</code> transform string literals</li>
        <li>Module augmentation extends third-party types without modifying their source</li>
        <li>Branded types add nominal typing to primitive values — zero runtime cost, compile-time safety</li>
      </ul>

      <p>
        You&apos;ve completed TypeScript Mastery. You now have a solid understanding of
        the type system from first principles through advanced meta-programming techniques.
        The patterns you&apos;ve learned — generics, utility types, narrowing, mapped types,
        conditional types, and branded types — are the same ones used in production at scale
        across the industry.
      </p>
    </div>
  );
}
