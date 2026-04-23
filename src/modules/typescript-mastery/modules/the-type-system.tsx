import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-typescript-adds", title: "What TypeScript Adds Over JavaScript", level: 2 },
  { id: "structural-typing", title: "Structural Typing (Duck Typing)", level: 2 },
  { id: "nominal-vs-structural", title: "Nominal vs Structural: A Real Distinction", level: 3 },
  { id: "assignability-rules", title: "Type Assignability Rules", level: 2 },
  { id: "the-special-types", title: "The Special Types: any, unknown, never, void", level: 2 },
  { id: "any", title: "any — the escape hatch", level: 3 },
  { id: "unknown", title: "unknown — the safe any", level: 3 },
  { id: "never", title: "never — the impossible type", level: 3 },
  { id: "void", title: "void — functions that return nothing", level: 3 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheTypeSystem() {
  return (
    <div className="article-content">
      <p>
        TypeScript is not just &quot;JavaScript with types sprinkled on top.&quot; It represents
        a fundamentally different way of thinking about code — one where the shape of data
        is explicit, verifiable, and constrainable at edit time rather than at runtime.
        Understanding the type system at a conceptual level is what separates engineers who
        fight TypeScript from engineers who wield it.
      </p>

      <h2 id="what-typescript-adds">What TypeScript Adds Over JavaScript</h2>

      <p>
        JavaScript is dynamically typed: variables can hold any value, functions accept any
        argument, and type mismatches only surface when the code actually runs. TypeScript
        layers a static type system on top — a second pass that runs at compile time, before
        any JavaScript is executed.
      </p>

      <p>
        This gives you three concrete benefits: (1) the compiler catches whole classes of bugs
        before they reach production, (2) your editor can provide accurate autocomplete and
        refactoring tools because it knows what every value is, and (3) types serve as
        machine-checked documentation that never goes stale.
      </p>

      <pre><code>{`// JavaScript — no warning until runtime
function getUserName(user) {
  return user.name.toUpperCase(); // crashes if user is null
}

// TypeScript — error at compile time
function getUserName(user: { name: string } | null): string {
  if (!user) return "Anonymous";
  return user.name.toUpperCase(); // safe: null checked above
}`}</code></pre>

      <h2 id="structural-typing">Structural Typing (Duck Typing)</h2>

      <p>
        TypeScript uses <strong>structural typing</strong>: compatibility between types is
        determined by their shape (the properties and methods they have), not by their name
        or declaration. If value <code>A</code> has at least the properties that type{" "}
        <code>B</code> requires, then <code>A</code> is assignable to <code>B</code>. This
        is often summarized as &quot;if it walks like a duck and quacks like a duck, it is a duck.&quot;
      </p>

      <pre><code>{`interface Point {
  x: number;
  y: number;
}

// This object was never declared to be a Point...
const origin = { x: 0, y: 0, label: "origin" };

// ...but it satisfies the Point shape, so this works.
function distanceFromOrigin(p: Point): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2);
}

distanceFromOrigin(origin); // valid — origin has x and y`}</code></pre>

      <p>
        Extra properties (like <code>label</code> above) are allowed when assigning through
        a variable. They are disallowed in <strong>object literals</strong> passed directly
        as arguments — TypeScript calls this excess property checking, and it catches common
        typos like passing <code>{`{ titl: "..." }`}</code> when the function expects{" "}
        <code>{`{ title: "..." }`}</code>.
      </p>

      <h3 id="nominal-vs-structural">Nominal vs Structural: A Real Distinction</h3>

      <p>
        In nominal type systems (Java, C#, Swift), two types are compatible only if one
        explicitly declares that it extends or implements the other. In TypeScript, no such
        declaration is needed — only shape matters. This is a deliberate design choice that
        makes TypeScript much easier to adopt in existing JavaScript codebases where you
        cannot retroactively annotate third-party objects.
      </p>

      <pre><code>{`// In a nominal system, this would be a type error.
// In TypeScript's structural system, it compiles fine.
class Cat {
  meow() { return "meow"; }
}

class Dog {
  meow() { return "woof (confusingly)"; }
}

function speak(animal: Cat) {
  animal.meow();
}

speak(new Dog()); // TypeScript: OK — Dog has the same shape as Cat`}</code></pre>

      <h2 id="assignability-rules">Type Assignability Rules</h2>

      <p>
        A type <code>A</code> is assignable to type <code>B</code> when every value of type
        <code>A</code> is also a valid value of type <code>B</code>. Think of types as sets
        of values, and assignability as subset relationships.
      </p>

      <pre><code>{`// Widening: narrow type assigned to wider type — allowed
let count: number = 42;
let value: number | string = count; // OK

// Narrowing: wider type assigned to narrower type — blocked
let input: number | string = "hello";
let counter: number = input; // Error: string is not assignable to number

// Literal types are narrower than their base types
let status: "active" | "inactive" = "active";
let anyString: string = status; // OK: literal type assigns to string
let status2: "active" | "inactive" = anyString; // Error: string is too wide`}</code></pre>

      <h2 id="the-special-types">The Special Types: any, unknown, never, void</h2>

      <p>
        TypeScript has four types that don&apos;t map cleanly to JavaScript values but exist
        to model specific relationships in the type system. Using them correctly is a
        hallmark of production-quality TypeScript.
      </p>

      <h3 id="any">any — the escape hatch</h3>

      <p>
        <code>any</code> turns off type checking entirely for that value. It is assignable
        to every type, and every type is assignable to it. It&apos;s the TypeScript equivalent
        of writing plain JavaScript — useful when migrating legacy code, but a red flag in
        new code because it propagates: any operation on an <code>any</code> value produces
        another <code>any</code>, silently spreading the hole in your type coverage.
      </p>

      <pre><code>{`let data: any = fetchFromLegacyApi();
data.nonExistent.deeply.nested; // no error — runtime crash waiting to happen
const result: number = data;    // no error — TypeScript just trusts you`}</code></pre>

      <h3 id="unknown">unknown — the safe any</h3>

      <p>
        <code>unknown</code> is the type-safe counterpart to <code>any</code>. Like{" "}
        <code>any</code>, it can hold any value. Unlike <code>any</code>, you cannot do
        anything with an <code>unknown</code> value until you narrow it to a more specific
        type. This forces you to handle whatever shape the data might have.
      </p>

      <pre><code>{`function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

const result = parseJSON('{"count": 3}');

// Error: Object is of type 'unknown'.
console.log(result.count);

// Correct: narrow first
if (typeof result === "object" && result !== null && "count" in result) {
  console.log((result as { count: number }).count); // safe
}`}</code></pre>

      <p>
        Prefer <code>unknown</code> over <code>any</code> for function return types when
        the shape is genuinely unpredictable (parsed JSON, deserialized data, network
        responses). It documents the uncertainty without silencing type checking.
      </p>

      <h3 id="never">never — the impossible type</h3>

      <p>
        <code>never</code> is the bottom type: the empty set. No value can ever have type{" "}
        <code>never</code>. It appears in two practical scenarios: (1) the return type of
        functions that never return (they throw or loop infinitely), and (2) as the residual
        type in exhaustive checks after all union members have been narrowed away.
      </p>

      <pre><code>{`// A function that always throws never returns
function assertNever(x: never): never {
  throw new Error("Unexpected value: " + x);
}

type Shape = "circle" | "square" | "triangle";

function area(shape: Shape): number {
  switch (shape) {
    case "circle": return Math.PI;
    case "square": return 1;
    case "triangle": return 0.5;
    default:
      // If you add a new Shape variant and forget to handle it,
      // TypeScript will error here because shape is no longer never.
      return assertNever(shape);
  }
}`}</code></pre>

      <h3 id="void">void — functions that return nothing</h3>

      <p>
        <code>void</code> represents the absence of a return value. It is the conventional
        return type for functions that perform side effects but don&apos;t produce a value.
        Unlike <code>never</code>, a function returning <code>void</code> does return — it
        just returns <code>undefined</code> implicitly.
      </p>

      <pre><code>{`// void: function returns, but caller shouldn't use the return value
function logError(message: string): void {
  console.error("[ERROR]", message);
}

// never: function never reaches a return statement
function crash(message: string): never {
  throw new Error(message);
}

// Practical difference: void is assignable to undefined
const result: void = logError("test"); // OK
const result2: undefined = logError("test"); // Error: void is not undefined`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>TypeScript&apos;s type checking runs at compile time — zero runtime cost</li>
        <li>Structural typing means compatibility is based on shape, not name</li>
        <li>Excess property checking only applies to object literals, not variable assignments</li>
        <li>Assignability follows subset relationships: narrower types assign to wider types</li>
        <li>Prefer <code>unknown</code> over <code>any</code> — it forces narrowing before use</li>
        <li><code>never</code> is the empty set: the type of values that can never exist</li>
        <li><code>void</code> is for functions with no return value; <code>never</code> is for functions that don&apos;t return at all</li>
      </ul>

      <p>
        With the type system&apos;s foundations in place, the next module covers the two
        tools you&apos;ll use to define types: <strong>type aliases and interfaces</strong> —
        when to use each, and how they differ.
      </p>
    </div>
  );
}
