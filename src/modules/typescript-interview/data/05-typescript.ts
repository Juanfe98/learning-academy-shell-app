import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-essentials",
  title: "TypeScript Essentials",
  icon: "🔷",
  description: "Practical TypeScript: type guards, generics, discriminated unions, and typed utility functions.",
  accentColor: "#3b82f6",
  challenges: [
    {
      id: "type-guard",
      topicId: "ts-essentials",
      title: "Write type guard functions to narrow a union type",
      difficulty: "easy",
      description:
        "You have a union type `Animal = Cat | Dog | Bird`. Each has a discriminant field or unique property. Implement three type guard functions: `isCat`, `isDog`, `isBird` using the `is` keyword, and a `speak(animal)` function that uses them to return the right sound.",
      concepts: ["type guards", "union types", "is keyword", "type narrowing"],
      starterCode: `// Type definitions
function isCat(animal) {
  // TODO: return true if animal is a Cat (has a "meow" method)
}

function isDog(animal) {
  // TODO: return true if animal is a Dog (has a "bark" method)
}

function isBird(animal) {
  // TODO: return true if animal is a Bird (has a "tweet" method)
}

function speak(animal) {
  if (isCat(animal)) return animal.meow();
  if (isDog(animal)) return animal.bark();
  if (isBird(animal)) return animal.tweet();
  return "unknown";
}

const cat = { meow: () => "meow!", type: "cat" };
const dog = { bark: () => "woof!", type: "dog" };
const bird = { tweet: () => "tweet!", type: "bird" };`,
      hints: [
        "A type guard function checks a property: `isCat(a)` → `typeof a.meow === 'function'`.",
        "In TypeScript you'd write `function isCat(a: Animal): a is Cat { return typeof (a as Cat).meow === 'function'; }`.",
        "The `speak` function uses the guards to narrow the type before calling the method.",
      ],
      tests: [
        {
          description: "isCat returns true for cat object",
          code: `
it("isCat returns true for cat", () => {
  const cat = { meow: () => "meow!", type: "cat" };
  expect(isCat(cat)).toBe(true);
  expect(isDog(cat)).toBe(false);
});`,
        },
        {
          description: "speak returns correct sound for each animal",
          code: `
it("speak returns correct sound", () => {
  const cat = { meow: () => "meow!" };
  const dog = { bark: () => "woof!" };
  const bird = { tweet: () => "tweet!" };
  expect(speak(cat)).toBe("meow!");
  expect(speak(dog)).toBe("woof!");
  expect(speak(bird)).toBe("tweet!");
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "generic-stack",
      topicId: "ts-essentials",
      title: "Implement a typed generic Stack<T> class",
      difficulty: "medium",
      description:
        "Implement a `Stack` class with these methods: `push(item)`, `pop()` → T | undefined, `peek()` → T | undefined (top without removing), `isEmpty()` → boolean, `size` getter. Write it in TypeScript using generics so it's type-safe for any element type.",
      concepts: ["generics", "class", "Stack", "TypeScript"],
      starterCode: `class Stack {
  // TODO: implement a generic Stack
  // push(item): void
  // pop(): T | undefined
  // peek(): T | undefined
  // isEmpty(): boolean
  // size: number (getter)
}

// Usage:
const numStack = new Stack();
numStack.push(1);
numStack.push(2);
numStack.push(3);
// numStack.peek() → 3
// numStack.pop()  → 3
// numStack.size   → 2

const strStack = new Stack();
strStack.push("hello");
strStack.push("world");`,
      hints: [
        "Use a private array `#items = []` (or `private items: T[] = []` in TS) as the underlying storage.",
        "`push(item)`: call `this.#items.push(item)`.",
        "`pop()`: call `this.#items.pop()` — returns `undefined` on empty stack.",
        "`peek()`: return `this.#items[this.#items.length - 1]`.",
        "Size getter: `get size() { return this.#items.length; }`",
      ],
      tests: [
        {
          description: "push and pop work correctly",
          code: `
it("push and pop in LIFO order", () => {
  const s = new Stack();
  s.push(1);
  s.push(2);
  s.push(3);
  expect(s.pop()).toBe(3);
  expect(s.pop()).toBe(2);
});`,
        },
        {
          description: "peek does not remove the top item",
          code: `
it("peek returns top without removing it", () => {
  const s = new Stack();
  s.push("a");
  s.push("b");
  expect(s.peek()).toBe("b");
  expect(s.size).toBe(2);
});`,
        },
        {
          description: "isEmpty returns correct state",
          code: `
it("isEmpty is true for empty stack", () => {
  const s = new Stack();
  expect(s.isEmpty()).toBe(true);
  s.push(1);
  expect(s.isEmpty()).toBe(false);
});`,
        },
        {
          description: "pop on empty stack returns undefined",
          code: `
it("pop on empty stack returns undefined", () => {
  const s = new Stack();
  expect(s.pop()).toBe(undefined);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "discriminated-union",
      topicId: "ts-essentials",
      title: "Model and process shapes with a discriminated union",
      difficulty: "medium",
      description:
        "Define a discriminated union `Shape = Circle | Rectangle | Triangle`, each with a `kind` discriminant. Implement `area(shape)` that returns the correct area for each shape. The `kind` field is what TypeScript (and your code) uses to narrow the type.",
      concepts: ["discriminated unions", "switch on kind", "type safety"],
      starterCode: `// Each shape has a "kind" discriminant field
// Circle:    { kind: "circle",    radius: number }
// Rectangle: { kind: "rectangle", width: number, height: number }
// Triangle:  { kind: "triangle",  base: number, height: number }

function area(shape) {
  // TODO: switch on shape.kind, return the correct area formula
  // Circle:    Math.PI * r²
  // Rectangle: width * height
  // Triangle:  0.5 * base * height
}

const circle    = { kind: "circle",    radius: 5 };
const rectangle = { kind: "rectangle", width: 4, height: 6 };
const triangle  = { kind: "triangle",  base: 3, height: 8 };`,
      hints: [
        "Use a `switch (shape.kind)` statement — each `case` narrows the type automatically in TypeScript.",
        "Circle area: `Math.PI * shape.radius ** 2`.",
        "Add a `default` that throws `new Error('Unknown shape')` — this ensures exhaustive checking.",
      ],
      tests: [
        {
          description: "calculates circle area correctly",
          code: `
it("circle area = PI * r^2", () => {
  const circle = { kind: "circle", radius: 5 };
  const result = area(circle);
  expect(Math.abs(result - Math.PI * 25)).toBeLessThan(0.001);
});`,
        },
        {
          description: "calculates rectangle area correctly",
          code: `
it("rectangle area = width * height", () => {
  expect(area({ kind: "rectangle", width: 4, height: 6 })).toBe(24);
});`,
        },
        {
          description: "calculates triangle area correctly",
          code: `
it("triangle area = 0.5 * base * height", () => {
  expect(area({ kind: "triangle", base: 3, height: 8 })).toBe(12);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "generic-utilities",
      topicId: "ts-essentials",
      title: "Implement typed pick, omit, and groupBy utility functions",
      difficulty: "medium",
      description:
        "Implement three generic utility functions: `pick(obj, keys)` — returns a new object with only the specified keys; `omit(obj, keys)` — returns a new object without the specified keys; `groupBy(array, keyFn)` — groups array items by the return value of `keyFn`.",
      concepts: ["generics", "utility types", "pick", "omit", "groupBy"],
      starterCode: `function pick(obj, keys) {
  // TODO: return new object with only the listed keys
}

function omit(obj, keys) {
  // TODO: return new object without the listed keys
}

function groupBy(array, keyFn) {
  // TODO: return object grouped by keyFn(item)
}

// Examples:
const user = { id: 1, name: "Alice", age: 30, role: "admin" };

// pick(user, ["id", "name"])  → { id: 1, name: "Alice" }
// omit(user, ["age", "role"]) → { id: 1, name: "Alice" }

const nums = [1, 2, 3, 4, 5, 6];
// groupBy(nums, n => n % 2 === 0 ? "even" : "odd")
// → { odd: [1,3,5], even: [2,4,6] }`,
      hints: [
        "`pick`: use `Object.fromEntries(keys.map(k => [k, obj[k]]))`.",
        "`omit`: use `Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)))`.",
        "`groupBy`: same as the `groupBy` from the Arrays topic, but using `keyFn(item)` instead of `item[key]`.",
      ],
      tests: [
        {
          description: "pick returns only specified keys",
          code: `
it("pick returns only specified keys", () => {
  const user = { id: 1, name: "Alice", age: 30 };
  const result = pick(user, ["id", "name"]);
  expect(result.id).toBe(1);
  expect(result.name).toBe("Alice");
  expect(result.age).toBe(undefined);
});`,
        },
        {
          description: "omit excludes specified keys",
          code: `
it("omit excludes specified keys", () => {
  const user = { id: 1, name: "Alice", age: 30 };
  const result = omit(user, ["age"]);
  expect(result.id).toBe(1);
  expect(result.age).toBe(undefined);
});`,
        },
        {
          description: "groupBy groups by keyFn result",
          code: `
it("groupBy groups odd and even numbers", () => {
  const result = groupBy([1,2,3,4], n => n % 2 === 0 ? "even" : "odd");
  expect(result.odd.length).toBe(2);
  expect(result.even.length).toBe(2);
  expect(result.odd.includes(1)).toBe(true);
  expect(result.even.includes(2)).toBe(true);
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
