import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-async-promises",
  title: "Async & Promises",
  icon: "⏳",
  description: "Implement Promise utilities from scratch and master sequential vs parallel execution, retries, and timeouts.",
  accentColor: "#ec4899",
  challenges: [
    {
      id: "promise-all-impl",
      topicId: "ts-async-promises",
      title: "Implement Promise.all from scratch",
      difficulty: "medium",
      description:
        "Implement `promiseAll(promises)` that behaves like `Promise.all`: resolves with an array of results **in the same order** as the input when all promises resolve, or rejects immediately if any promise rejects.",
      concepts: ["Promise", "Promise.all", "async patterns"],
      starterCode: `function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    // TODO: resolve with array of results in order
    // Reject immediately if any promise rejects
    // Handle empty array
  });
}

// Usage:
// promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
//   .then(results => console.log(results)) // [1, 2, 3]
//
// promiseAll([Promise.resolve(1), Promise.reject("oops")])
//   .catch(err => console.log(err)) // "oops"`,
      hints: [
        "Track a `results` array and a `resolvedCount` counter. When `resolvedCount === promises.length`, call `resolve(results)`.",
        "For each promise: `.then(val => { results[i] = val; if (++resolvedCount === promises.length) resolve(results); })`. Keep the **index** `i` to preserve order.",
        "Empty array: if `promises.length === 0`, resolve with `[]` immediately.",
      ],
      tests: [
        {
          description: "resolves with results in order",
          code: `
it("resolves with all results in order", async () => {
  const result = await promiseAll([
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3),
  ]);
  expect(result[0]).toBe(1);
  expect(result[1]).toBe(2);
  expect(result[2]).toBe(3);
});`,
        },
        {
          description: "rejects when any promise rejects",
          code: `
it("rejects when any promise rejects", async () => {
  let caught = null;
  try {
    await promiseAll([Promise.resolve(1), Promise.reject("oops")]);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe("oops");
});`,
        },
        {
          description: "resolves with empty array for empty input",
          code: `
it("resolves with [] for empty input", async () => {
  const result = await promiseAll([]);
  expect(result.length).toBe(0);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "sequential-async",
      topicId: "ts-async-promises",
      title: "Execute async functions sequentially and accumulate results",
      difficulty: "medium",
      description:
        "Implement `runSequential(tasks)` where `tasks` is an array of functions that each return a Promise. Execute them **one after another** (not in parallel) and return a Promise that resolves with an array of all results in order.",
      concepts: ["async/await", "sequential execution", "reduce", "Promise chaining"],
      starterCode: `async function runSequential(tasks) {
  // TODO: run each task one after another, collect results in order
  // tasks is an array of () => Promise functions
}

// Example:
const delay = (ms, val) => new Promise(res => setTimeout(() => res(val), ms));

const tasks = [
  () => delay(100, "first"),
  () => delay(50,  "second"),  // faster but runs after first
  () => delay(10,  "third"),
];

// runSequential(tasks) → ["first", "second", "third"] (in order, sequential)`,
      hints: [
        "Use a `for...of` loop with `await`: `for (const task of tasks) { results.push(await task()); }`.",
        "Alternatively, use `reduce` with promise chaining: `tasks.reduce((acc, task) => acc.then(...), Promise.resolve([]))`.",
        "The key difference from `Promise.all`: each task only starts after the previous one completes.",
      ],
      tests: [
        {
          description: "returns results in order",
          code: `
it("returns results in task order", async () => {
  const tasks = [
    () => Promise.resolve("a"),
    () => Promise.resolve("b"),
    () => Promise.resolve("c"),
  ];
  const result = await runSequential(tasks);
  expect(result[0]).toBe("a");
  expect(result[1]).toBe("b");
  expect(result[2]).toBe("c");
});`,
        },
        {
          description: "runs sequentially (second task starts after first)",
          code: `
it("runs tasks one after another", async () => {
  const order = [];
  const tasks = [
    () => new Promise(res => setTimeout(() => { order.push(1); res(1); }, 20)),
    () => new Promise(res => { order.push(2); res(2); }),
  ];
  await runSequential(tasks);
  expect(order[0]).toBe(1);
  expect(order[1]).toBe(2);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "retry-promise",
      topicId: "ts-async-promises",
      title: "Retry a failing async function N times with delay",
      difficulty: "medium",
      description:
        "Implement `retry(fn, maxAttempts, delayMs)` that calls `fn()`. If it rejects, wait `delayMs` milliseconds and try again, up to `maxAttempts` total attempts. If all attempts fail, reject with the last error.",
      concepts: ["async/await", "retry", "recursion", "error handling"],
      starterCode: `async function retry(fn, maxAttempts, delayMs = 0) {
  // TODO: try fn() up to maxAttempts times
  // Wait delayMs between attempts
  // Reject with last error if all attempts fail
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

// Example: flaky API that fails twice then succeeds
let attempt = 0;
const flaky = () => {
  attempt++;
  if (attempt < 3) return Promise.reject(new Error("not yet"));
  return Promise.resolve("success!");
};

// retry(flaky, 5, 0) → "success!" (succeeds on 3rd attempt)`,
      hints: [
        "Use a loop: `for (let i = 1; i <= maxAttempts; i++) { try { return await fn(); } catch (err) { if (i === maxAttempts) throw err; } }`.",
        "Add a sleep between retries: `if (delayMs > 0) await sleep(delayMs)`.",
        "Recursive approach also works: `try { return await fn(); } catch(e) { if (maxAttempts <= 1) throw e; return retry(fn, maxAttempts - 1, delayMs); }`",
      ],
      tests: [
        {
          description: "resolves on eventual success",
          code: `
it("resolves when fn eventually succeeds", async () => {
  let calls = 0;
  const fn = () => {
    calls++;
    if (calls < 3) return Promise.reject(new Error("fail"));
    return Promise.resolve("ok");
  };
  const result = await retry(fn, 5, 0);
  expect(result).toBe("ok");
});`,
        },
        {
          description: "rejects after all attempts fail",
          code: `
it("rejects after all attempts fail", async () => {
  const fn = () => Promise.reject(new Error("always fails"));
  let caught = null;
  try {
    await retry(fn, 3, 0);
  } catch(e) {
    caught = e;
  }
  expect(caught).toBeTruthy();
  expect(caught.message).toBe("always fails");
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "timeout-promise",
      topicId: "ts-async-promises",
      title: "Race a promise against a timeout",
      difficulty: "medium",
      description:
        "Implement `withTimeout(promise, ms)` that races `promise` against a timeout of `ms` milliseconds. If `promise` resolves first, return its value. If `ms` elapses first, reject with a `new Error('Timeout after Xms')`.",
      concepts: ["Promise.race", "setTimeout", "async patterns"],
      starterCode: `function withTimeout(promise, ms) {
  // TODO: race promise against a timeout
  // If timeout wins, reject with Error(\`Timeout after \${ms}ms\`)
}

// Usage:
// const slow = new Promise(res => setTimeout(() => res("done"), 1000));
// withTimeout(slow, 500) → rejects with "Timeout after 500ms"
// withTimeout(slow, 2000) → resolves with "done"`,
      hints: [
        "Create a timeout promise: `const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(\`Timeout after \${ms}ms\`)), ms))`.",
        "Use `Promise.race([promise, timeout])` — whichever settles first wins.",
        "No cleanup of the timer is needed for the basic implementation.",
      ],
      tests: [
        {
          description: "resolves when promise finishes before timeout",
          code: `
it("resolves when promise finishes before timeout", async () => {
  const fast = new Promise(res => setTimeout(() => res("done"), 10));
  const result = await withTimeout(fast, 500);
  expect(result).toBe("done");
});`,
        },
        {
          description: "rejects when timeout elapses first",
          code: `
it("rejects with timeout error when slow", async () => {
  const slow = new Promise(res => setTimeout(() => res("done"), 500));
  let caught = null;
  try {
    await withTimeout(slow, 20);
  } catch(e) {
    caught = e;
  }
  expect(caught).toBeTruthy();
  expect(caught.message).toContain("Timeout");
});`,
        },
      ],
      estimatedMinutes: 15,
    },
  ],
};

export default topic;
