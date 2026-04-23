import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "keyof-operator", title: "The keyof Operator", level: 2 },
  { id: "mapped-type-syntax", title: "Mapped Type Syntax", level: 2 },
  { id: "modifiers", title: "Modifiers: Adding and Removing", level: 2 },
  { id: "re-implementing-utilities", title: "Re-implementing Utility Types", level: 2 },
  { id: "value-transformations", title: "Transforming Values", level: 3 },
  { id: "key-remapping", title: "Key Remapping with as", level: 2 },
  { id: "template-literal-mapped", title: "Template Literal Types in Mapped Types", level: 3 },
  { id: "practical-patterns", title: "Practical Patterns", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function MappedTypes() {
  return (
    <div className="article-content">
      <p>
        Mapped types are the meta-programming layer of TypeScript&apos;s type system. They
        let you transform one type into another by iterating over its keys and applying
        transformations to each property. Every utility type you used in the previous module —
        <code>Partial</code>, <code>Readonly</code>, <code>Pick</code> — is built with mapped
        types. Understanding them unlocks the ability to build your own.
      </p>

      <h2 id="keyof-operator">The keyof Operator</h2>

      <p>
        Before mapped types, you need <code>keyof</code>. Applied to an object type,{" "}
        <code>keyof T</code> produces a union of all its property names as string literal
        types.
      </p>

      <pre><code>{`interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
}

type UserKeys = keyof User; // "id" | "name" | "email" | "role"

// Combined with generics for type-safe property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: "1", name: "Alice", email: "a@b.com", role: "admin" };
const name = getProperty(user, "name"); // string — TypeScript infers T[K]
const id = getProperty(user, "id");     // string
getProperty(user, "password");          // Error — "password" is not in keyof User`}</code></pre>

      <h2 id="mapped-type-syntax">Mapped Type Syntax</h2>

      <p>
        A mapped type uses a <code>for...in</code>-like syntax in the type position. The
        key variable iterates over a union of string literals, and you define what the
        value type should be for each key.
      </p>

      <pre><code>{`// The fundamental form:
// { [K in SomeUnion]: ValueType }

// Make all properties of T optional
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Make all properties of T required (remove the ?)
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Make all properties of T readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Identity mapped type — produces an equivalent type
type Identity<T> = {
  [K in keyof T]: T[K];
};

// All of these are just like the built-in utility types
type PartialUser = MyPartial<User>;
// { id?: string; name?: string; email?: string; role?: "admin" | "viewer" }`}</code></pre>

      <h2 id="modifiers">Modifiers: Adding and Removing</h2>

      <p>
        Mapped types can add or remove the <code>readonly</code> and <code>?</code>
        modifiers from properties. Prefix a modifier with <code>-</code> to remove it,
        or <code>+</code> to add it (the <code>+</code> is optional — adding is the default).
      </p>

      <pre><code>{`// -? removes the optional modifier — makes all properties required
type AllRequired<T> = {
  [K in keyof T]-?: T[K];
};

// -readonly removes the readonly modifier — makes all properties mutable
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

interface FrozenPoint {
  readonly x: number;
  readonly y: number;
  label?: string;
}

type MutablePoint = Mutable<FrozenPoint>;
// { x: number; y: number; label?: string }

type RequiredPoint = AllRequired<FrozenPoint>;
// { readonly x: number; readonly y: number; label: string }

// You can combine: remove readonly and optional simultaneously
type MutableRequired<T> = {
  -readonly [K in keyof T]-?: T[K];
};`}</code></pre>

      <h2 id="re-implementing-utilities">Re-implementing Utility Types</h2>

      <p>
        The standard library&apos;s utility types are simple mapped types. Re-implementing
        them is the best way to confirm you understand the syntax.
      </p>

      <pre><code>{`// Pick<T, K> — keep only keys K from T
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit<T, K> — remove keys K from T
// (uses Exclude to compute the keys to keep)
type MyOmit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

// Record<K, V> — object with keys K and values V
type MyRecord<K extends string | number | symbol, V> = {
  [P in K]: V;
};

// Verify they produce the same shapes as the built-ins
type A = MyPick<User, "id" | "name">;    // { id: string; name: string }
type B = Pick<User, "id" | "name">;      // { id: string; name: string }
// A and B are structurally identical`}</code></pre>

      <h3 id="value-transformations">Transforming Values</h3>

      <p>
        Mapped types can transform the value type, not just copy it. This is how you build
        validators, form state types, and other derived structures.
      </p>

      <pre><code>{`// Turn all values into validators (functions that check validity)
type Validators<T> = {
  [K in keyof T]: (value: T[K]) => boolean;
};

type UserValidators = Validators<User>;
// {
//   id: (value: string) => boolean;
//   name: (value: string) => boolean;
//   email: (value: string) => boolean;
//   role: (value: "admin" | "viewer") => boolean;
// }

const validators: UserValidators = {
  id: (v) => v.length > 0,
  name: (v) => v.trim().length >= 2,
  email: (v) => v.includes("@"),
  role: (v) => ["admin", "viewer"].includes(v),
};

// Turn all values into React state setters
type StateSetter<T> = {
  [K in keyof T]: (newValue: T[K]) => void;
};`}</code></pre>

      <h2 id="key-remapping">Key Remapping with as</h2>

      <p>
        TypeScript 4.1+ supports key remapping via the <code>as</code> clause. This lets
        you transform the key name itself, not just the value type. Combined with template
        literal types, it enables powerful API generation patterns.
      </p>

      <pre><code>{`// Rename all keys by adding a prefix
type Prefixed<T, Prefix extends string> = {
  [K in keyof T as \`\${Prefix}\${Capitalize<string & K>}\`]: T[K];
};

interface Point { x: number; y: number }
type PrefixedPoint = Prefixed<Point, "initial">;
// { initialX: number; initialY: number }

// Filter out keys using never — remapping to never removes the key
type NonNullableProps<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};

interface MixedShape {
  id: string;
  name: string | null;
  value: number;
  description: null;
}

type CleanShape = NonNullableProps<MixedShape>;
// { id: string; value: number }
// name and description were remapped to never (removed)`}</code></pre>

      <h3 id="template-literal-mapped">Template Literal Types in Mapped Types</h3>

      <p>
        Template literal types let you construct new string literal types from existing
        ones. Combined with mapped types, they can generate entire APIs from a single
        source type.
      </p>

      <pre><code>{`// Generate getter methods from an object type
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};

interface Config { host: string; port: number; timeout: number }
type ConfigGetters = Getters<Config>;
// {
//   getHost: () => string;
//   getPort: () => number;
//   getTimeout: () => number;
// }

// Generate event handler names
type EventHandlers<T extends string> = {
  [K in T as \`on\${Capitalize<K>}\`]?: () => void;
};

type ButtonHandlers = EventHandlers<"click" | "focus" | "blur">;
// { onClick?: () => void; onFocus?: () => void; onBlur?: () => void }`}</code></pre>

      <h2 id="practical-patterns">Practical Patterns</h2>

      <p>
        Here are two mapped type patterns that appear regularly in production TypeScript
        and are worth having in your toolkit.
      </p>

      <pre><code>{`// Deep Readonly — recursively make every nested property readonly
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface AppState {
  user: { id: string; preferences: { theme: "dark" | "light" } };
  cart: { items: { id: string; quantity: number }[] };
}

type FrozenState = DeepReadonly<AppState>;
// Every nested property is readonly, including array elements

// Flatten — remove one level of nesting from intersections
// Useful for displaying types clearly in hover tooltips
type Flatten<T> = { [K in keyof T]: T[K] };

type Combined = Flatten<{ a: string } & { b: number }>;
// Displays as { a: string; b: number } instead of the intersection`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li><code>keyof T</code> produces a union of all string literal property names in <code>T</code></li>
        <li>Mapped type syntax: <code>{`{ [K in keyof T]: T[K] }`}</code></li>
        <li>Add <code>?</code> or <code>readonly</code> to add modifiers; prefix with <code>-</code> to remove them</li>
        <li>Value types can be transformed, not just copied — enabling validators, setters, and more</li>
        <li>Key remapping with <code>as</code> allows renaming keys — remapping to <code>never</code> removes them</li>
        <li>Template literal types combined with <code>Capitalize</code> generate API patterns from object shapes</li>
      </ul>

      <p>
        The next module goes deeper into the type algebra with <strong>conditional types</strong> —
        the <code>if/else</code> of the type system that powers <code>ReturnType</code>,{" "}
        <code>Parameters</code>, and many other advanced transformations.
      </p>
    </div>
  );
}
