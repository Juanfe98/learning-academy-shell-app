import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-closures",
  title: "Closures & Scope",
  icon: "🔒",
  description: "Factory functions, memoization, single-execution guards, and functional composition — all powered by closures.",
  accentColor: "#06b6d4",
  challenges: [
    {
      id: "counter-factory",
      topicId: "ts-closures",
      title: "Closure counter with increment, decrement, reset, getValue",
      difficulty: "easy",
      description:
        "Implement `createCounter(initialValue = 0)` that returns an object with four methods: `increment()`, `decrement()`, `reset()`, and `getValue()`. The count is private — only accessible through these methods.",
      concepts: ["closures", "factory functions", "encapsulation"],
      starterCode: `function createCounter(initialValue = 0) {
  // TODO: return { increment, decrement, reset, getValue }
  // The counter value should be private (not directly accessible)
}

const counter = createCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.decrement(); // 11
counter.getValue();  // 11
counter.reset();     // back to 10
counter.getValue();  // 10`,
      hints: [
        "Declare `let count = initialValue` inside the function — this is the private state.",
        "Return an object with four methods, each referencing `count` via closure.",
        "`reset()` should set `count = initialValue`, not 0.",
      ],
      tests: [
        {
          description: "getValue returns initial value",
          code: `
it("getValue returns initial value", () => {
  const c = createCounter(5);
  expect(c.getValue()).toBe(5);
});`,
        },
        {
          description: "increment adds 1",
          code: `
it("increment adds 1 each call", () => {
  const c = createCounter(0);
  c.increment();
  c.increment();
  expect(c.getValue()).toBe(2);
});`,
        },
        {
          description: "decrement subtracts 1",
          code: `
it("decrement subtracts 1", () => {
  const c = createCounter(10);
  c.decrement();
  expect(c.getValue()).toBe(9);
});`,
        },
        {
          description: "reset returns to initial value",
          code: `
it("reset returns to initialValue", () => {
  const c = createCounter(5);
  c.increment();
  c.increment();
  c.reset();
  expect(c.getValue()).toBe(5);
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "memoize-fn",
      topicId: "ts-closures",
      title: "Implement memoize(fn) — cache results by serialized args",
      difficulty: "medium",
      description:
        "Implement `memoize(fn)` that returns a new function. On each call, if the arguments have been seen before, return the cached result. Otherwise call `fn`, cache the result, and return it. Use `JSON.stringify(args)` as the cache key.",
      concepts: ["closures", "memoization", "caching", "Map"],
      starterCode: `function memoize(fn) {
  // TODO: return a memoized version of fn
  // Cache key: JSON.stringify(arguments)
}

// Example: memoized fibonacci
const fib = memoize(function(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});

// Example: expensive computation tracking
let callCount = 0;
const expensive = memoize((x, y) => {
  callCount++;
  return x + y;
});`,
      hints: [
        "Create `const cache = new Map()` inside `memoize` — this is closed over by the returned function.",
        "In the returned function: `const key = JSON.stringify(Array.from(arguments))`.",
        "If `cache.has(key)` return `cache.get(key)`. Otherwise compute, store, and return.",
      ],
      tests: [
        {
          description: "returns correct result",
          code: `
it("memoized fn returns correct result", () => {
  const add = memoize((a, b) => a + b);
  expect(add(2, 3)).toBe(5);
});`,
        },
        {
          description: "caches — original fn only called once for same args",
          code: `
it("original fn called only once for same args", () => {
  let calls = 0;
  const fn = memoize((x) => { calls++; return x * 2; });
  fn(5);
  fn(5);
  fn(5);
  expect(calls).toBe(1);
});`,
        },
        {
          description: "different args each invoke original fn",
          code: `
it("different args invoke original fn each time", () => {
  let calls = 0;
  const fn = memoize((x) => { calls++; return x; });
  fn(1);
  fn(2);
  fn(3);
  expect(calls).toBe(3);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "once-fn",
      topicId: "ts-closures",
      title: "once(fn) — executes only on first call",
      difficulty: "easy",
      description:
        "Implement `once(fn)` that returns a new function. The first time the returned function is called, it executes `fn` and stores the result. All subsequent calls return the same stored result **without** calling `fn` again.",
      concepts: ["closures", "flags", "single-execution"],
      starterCode: `function once(fn) {
  // TODO: return a function that only calls fn once
}

// Example:
let initCount = 0;
const initialize = once(() => {
  initCount++;
  return "initialized";
});

initialize(); // calls fn, returns "initialized", initCount = 1
initialize(); // returns "initialized", initCount still 1
initialize(); // returns "initialized", initCount still 1`,
      hints: [
        "Use two closed-over variables: `let called = false` and `let result`.",
        "In the returned function: if `!called`, set `called = true`, call `fn`, store in `result`.",
        "Always return `result`.",
      ],
      tests: [
        {
          description: "calls fn only once",
          code: `
it("calls fn only once", () => {
  let count = 0;
  const fn = once(() => { count++; return count; });
  fn();
  fn();
  fn();
  expect(count).toBe(1);
});`,
        },
        {
          description: "returns the same result every call",
          code: `
it("returns the same result on every call", () => {
  const fn = once(() => Math.random());
  const first = fn();
  expect(fn()).toBe(first);
  expect(fn()).toBe(first);
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "compose-pipe",
      topicId: "ts-closures",
      title: "Implement compose (right-to-left) and pipe (left-to-right)",
      difficulty: "medium",
      description:
        "Implement `compose(...fns)` that applies functions **right-to-left**: `compose(f, g, h)(x) === f(g(h(x)))`. Also implement `pipe(...fns)` that applies functions **left-to-right**: `pipe(f, g, h)(x) === h(g(f(x)))`. Each function takes one argument.",
      concepts: ["function composition", "reduce", "closures", "functional programming"],
      starterCode: `function compose(...fns) {
  // TODO: return a function that applies fns right-to-left
}

function pipe(...fns) {
  // TODO: return a function that applies fns left-to-right
}

// compose examples:
const double = x => x * 2;
const addOne = x => x + 1;
const square = x => x * x;

// compose(square, addOne, double)(3)
// → square(addOne(double(3)))
// → square(addOne(6))
// → square(7)
// → 49

// pipe(double, addOne, square)(3) → same result`,
      hints: [
        "For `compose`: use `reduceRight` — `fns.reduceRight((acc, fn) => fn(acc), x)`.",
        "For `pipe`: use `reduce` — `fns.reduce((acc, fn) => fn(acc), x)`.",
        "Both return a new function that accepts the initial value `x`.",
      ],
      tests: [
        {
          description: "compose applies right-to-left",
          code: `
it("compose(square, addOne, double)(3) = 49", () => {
  const double = x => x * 2;
  const addOne = x => x + 1;
  const square = x => x * x;
  expect(compose(square, addOne, double)(3)).toBe(49);
});`,
        },
        {
          description: "pipe applies left-to-right",
          code: `
it("pipe(double, addOne, square)(3) = 49", () => {
  const double = x => x * 2;
  const addOne = x => x + 1;
  const square = x => x * x;
  expect(pipe(double, addOne, square)(3)).toBe(49);
});`,
        },
        {
          description: "single function compose returns same value",
          code: `
it("compose with single fn behaves like that fn", () => {
  const double = x => x * 2;
  expect(compose(double)(5)).toBe(10);
  expect(pipe(double)(5)).toBe(10);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
  ],
};

export default topic;
