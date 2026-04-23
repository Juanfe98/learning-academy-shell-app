import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-function-mechanics",
  title: "Function Mechanics",
  icon: "🔧",
  description: "The engine behind JavaScript functions: this binding, call/apply/bind, currying, and partial application.",
  accentColor: "#f97316",
  challenges: [
    {
      id: "this-binding",
      topicId: "ts-function-mechanics",
      title: "Fix broken this bindings in three common patterns",
      difficulty: "easy",
      description:
        "Three objects have methods that break when extracted or used as callbacks — `this` is lost. Fix each one using an arrow function, `.bind()`, or a stored reference, without changing how the methods are called from outside.",
      concepts: ["this", "bind", "arrow functions", "method extraction"],
      starterCode: `// Pattern 1: method extracted as callback loses this
const timer = {
  label: "Timer",
  start() {
    // BUG: when passed as callback, this.label is undefined
    return this.label + " started";
  }
};

// Pattern 2: method in setTimeout loses this
const logger = {
  prefix: "LOG",
  delayed() {
    return new Promise(resolve => {
      setTimeout(function() {
        // BUG: this.prefix is undefined inside regular function
        resolve(this.prefix + ": hello");
      }, 0);
    });
  }
};

// Pattern 3: method passed to array.forEach loses this
const formatter = {
  currency: "USD",
  formatAll(amounts) {
    const results = [];
    amounts.forEach(function(amount) {
      // BUG: this.currency is undefined here
      results.push(this.currency + " " + amount);
    });
    return results;
  }
};

// Do not change the call sites below — only fix the implementations above
const fn = timer.start.bind(timer);     // extracted callback`,
      hints: [
        "Pattern 1: use `.bind(timer)` when the method will be extracted, or store `const self = this`.",
        "Pattern 2: replace `function()` with `() =>` (arrow function) — arrows capture lexical `this`.",
        "Pattern 3: either use an arrow function in `forEach`, or pass `this` as the second arg: `forEach(function(){}, this)`.",
      ],
      tests: [
        {
          description: "extracted method works with bind",
          code: `
it("timer.start works when extracted with bind", () => {
  const fn = timer.start.bind(timer);
  expect(fn()).toBe("Timer started");
});`,
        },
        {
          description: "delayed method resolves with correct prefix",
          code: `
it("logger.delayed resolves with prefix", async () => {
  const result = await logger.delayed();
  expect(result).toBe("LOG: hello");
});`,
        },
        {
          description: "formatAll uses this.currency",
          code: `
it("formatter.formatAll uses this.currency", () => {
  const result = formatter.formatAll([10, 20, 30]);
  expect(result[0]).toBe("USD 10");
  expect(result[2]).toBe("USD 30");
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "implement-bind",
      topicId: "ts-function-mechanics",
      title: "Implement Function.prototype.bind from scratch",
      difficulty: "medium",
      description:
        "Implement `myBind(fn, context, ...partialArgs)` that works like `Function.prototype.bind`. The returned function: (1) always runs `fn` with `this = context`, (2) pre-fills any `partialArgs`, (3) accepts additional arguments when called. Do not use `.bind()` in your implementation.",
      concepts: ["this", "apply", "closures", "partial application"],
      starterCode: `function myBind(fn, context, ...partialArgs) {
  // TODO: return a new function that:
  // 1. calls fn with this = context
  // 2. prepends partialArgs to any args passed at call time
  // Do NOT use fn.bind()
}

// Usage:
function greet(greeting, punctuation) {
  return greeting + ", " + this.name + punctuation;
}

const user = { name: "Alice" };

// const sayHi = myBind(greet, user, "Hi");
// sayHi("!")  → "Hi, Alice!"
// sayHi("?")  → "Hi, Alice?"

// const sayHiBang = myBind(greet, user, "Hi", "!");
// sayHiBang() → "Hi, Alice!"`,
      hints: [
        "Return `function(...callArgs) { return fn.apply(context, [...partialArgs, ...callArgs]); }`.",
        "`fn.apply(context, argsArray)` calls `fn` with `this = context` and spreads the array as arguments.",
        "Partial args: concatenate `partialArgs` (from bind call) with `callArgs` (from the returned fn call).",
      ],
      tests: [
        {
          description: "binds this correctly",
          code: `
it("bound function uses the given context", () => {
  function getName() { return this.name; }
  const obj = { name: "Bob" };
  const bound = myBind(getName, obj);
  expect(bound()).toBe("Bob");
});`,
        },
        {
          description: "pre-fills partial arguments",
          code: `
it("pre-fills partial args from bind call", () => {
  function add(a, b) { return a + b; }
  const add5 = myBind(add, null, 5);
  expect(add5(3)).toBe(8);
  expect(add5(10)).toBe(15);
});`,
        },
        {
          description: "merges partial args with call args",
          code: `
it("merges partial args with call-time args", () => {
  function greet(greeting, name) { return greeting + " " + name; }
  const sayHi = myBind(greet, null, "Hi");
  expect(sayHi("Alice")).toBe("Hi Alice");
  expect(sayHi("Bob")).toBe("Hi Bob");
});`,
        },
        {
          description: "works without partial args",
          code: `
it("works without any partial args", () => {
  function multiply(a, b) { return a * b; }
  const fn = myBind(multiply, null);
  expect(fn(3, 4)).toBe(12);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "implement-call-apply",
      topicId: "ts-function-mechanics",
      title: "Implement myCall and myApply from scratch",
      difficulty: "medium",
      description:
        "Implement `myCall(fn, context, ...args)` and `myApply(fn, context, argsArray)`. Both must invoke `fn` with `this = context` without using the native `.call()`, `.apply()`, or `.bind()`. The trick: temporarily attach `fn` as a property of `context`, call it, then delete it.",
      concepts: ["call", "apply", "this", "property trick"],
      starterCode: `function myCall(fn, context, ...args) {
  // TODO: call fn with this = context
  // Trick: context.__fn = fn; const result = context.__fn(...args); delete context.__fn;
  // Do NOT use fn.call / fn.apply / fn.bind
}

function myApply(fn, context, argsArray) {
  // TODO: same as myCall but args come as an array
  // argsArray may be null/undefined → treat as []
}

// Usage:
function introduce(greeting) {
  return greeting + ", I am " + this.name;
}

// myCall(introduce, { name: "Alice" }, "Hello")  → "Hello, I am Alice"
// myApply(introduce, { name: "Bob" }, ["Hi"])    → "Hi, I am Bob"`,
      hints: [
        "Attach fn to context: `context.__temp = fn` — this makes `this` inside fn equal `context` when called as a method.",
        "Call it: `const result = context.__temp(...args)` — then `delete context.__temp` to clean up.",
        "For `myApply`: spread the array — `context.__temp(...(argsArray || []))`.",
        "Use a Symbol key instead of `'__temp'` to avoid overwriting an existing property: `const key = Symbol()`.",
      ],
      tests: [
        {
          description: "myCall sets this correctly",
          code: `
it("myCall sets this to the context object", () => {
  function getName() { return this.name; }
  expect(myCall(getName, { name: "Alice" })).toBe("Alice");
});`,
        },
        {
          description: "myCall passes arguments",
          code: `
it("myCall passes arguments to the function", () => {
  function add(a, b) { return a + b; }
  expect(myCall(add, null, 3, 4)).toBe(7);
});`,
        },
        {
          description: "myApply sets this and spreads array",
          code: `
it("myApply sets this and spreads argsArray", () => {
  function greet(g) { return g + " " + this.name; }
  expect(myApply(greet, { name: "Bob" }, ["Hi"])).toBe("Hi Bob");
});`,
        },
        {
          description: "myApply handles null argsArray",
          code: `
it("myApply handles null argsArray", () => {
  function getName() { return this.name; }
  expect(myApply(getName, { name: "Carol" }, null)).toBe("Carol");
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "curry",
      topicId: "ts-function-mechanics",
      title: "Implement curry(fn) with partial application",
      difficulty: "medium",
      description:
        "Implement `curry(fn)` that returns a curried version of `fn`. The curried function can be called with fewer arguments than `fn` expects — it returns a new function waiting for the remaining arguments. Once all arguments are provided (across one or more calls), it executes and returns the result.",
      concepts: ["currying", "partial application", "closures", "fn.length"],
      starterCode: `function curry(fn) {
  // TODO: return a curried version of fn
  // Use fn.length to know the total number of args needed
  // Accumulate args until count === fn.length, then call fn
}

// Examples:
const add = curry((a, b, c) => a + b + c);

// add(1)(2)(3)   → 6  (one arg at a time)
// add(1, 2)(3)   → 6  (partial then rest)
// add(1)(2, 3)   → 6  (one then two)
// add(1, 2, 3)   → 6  (all at once)

const multiply = curry((a, b) => a * b);
// multiply(3)(4) → 12
// multiply(3, 4) → 12`,
      hints: [
        "Use recursion: `function curried(...args) { if (args.length >= fn.length) return fn(...args); return (...more) => curried(...args, ...more); }`",
        "`fn.length` tells you how many parameters `fn` was declared with.",
        "Each partial call accumulates args via closure. When total args ≥ fn.length, call the original function.",
      ],
      tests: [
        {
          description: "one arg at a time",
          code: `
it("curry(fn)(a)(b)(c) calls fn with all args", () => {
  const add = curry((a, b, c) => a + b + c);
  expect(add(1)(2)(3)).toBe(6);
});`,
        },
        {
          description: "partial then rest",
          code: `
it("curry(fn)(a, b)(c) works", () => {
  const add = curry((a, b, c) => a + b + c);
  expect(add(1, 2)(3)).toBe(6);
});`,
        },
        {
          description: "all args at once",
          code: `
it("curry(fn)(a, b, c) calls fn immediately", () => {
  const add = curry((a, b, c) => a + b + c);
  expect(add(1, 2, 3)).toBe(6);
});`,
        },
        {
          description: "works with 2-arg function",
          code: `
it("curry works for 2-arg functions", () => {
  const multiply = curry((a, b) => a * b);
  expect(multiply(3)(4)).toBe(12);
  expect(multiply(3, 4)).toBe(12);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
  ],
};

export default topic;
