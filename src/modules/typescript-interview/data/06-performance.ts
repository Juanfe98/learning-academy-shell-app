import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-performance",
  title: "Performance Patterns",
  icon: "⚡",
  description: "Big O thinking in practice: indexing for O(1) access, Set-based deduplication, and TTL caches.",
  accentColor: "#10b981",
  challenges: [
    {
      id: "index-by-id",
      topicId: "ts-performance",
      title: "Convert array to Map for O(1) access vs O(n) search",
      difficulty: "easy",
      description:
        "Given an array of user objects `{ id, name, email }`, implement two lookup functions: `findUserLinear(users, id)` that searches the array (O(n)), and `buildIndex(users)` that returns a Map keyed by id. Then implement `findUserIndexed(index, id)` that uses the Map for O(1) lookup. Show why indexing matters when you need many lookups.",
      concepts: ["Map", "O(1) vs O(n)", "indexing", "performance"],
      starterCode: `// O(n) — scans entire array each time
function findUserLinear(users, id) {
  // TODO: find and return user with matching id, or undefined
}

// Build an index once — O(n) upfront
function buildIndex(users) {
  // TODO: return a Map<id, user> for O(1) lookups
}

// O(1) — single Map lookup
function findUserIndexed(index, id) {
  // TODO: return user from Map, or undefined
}

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob",   email: "bob@example.com" },
  { id: 3, name: "Carol", email: "carol@example.com" },
];

// Without index: each call is O(n)
// findUserLinear(users, 2) → { id: 2, name: "Bob", ... }

// With index: build once O(n), each lookup is O(1)
// const index = buildIndex(users);
// findUserIndexed(index, 2) → { id: 2, name: "Bob", ... }`,
      hints: [
        "`findUserLinear`: use `users.find(u => u.id === id)`.",
        "`buildIndex`: `return new Map(users.map(u => [u.id, u]))`.",
        "`findUserIndexed`: `return index.get(id)`.",
        "The key insight: if you need 1000 lookups on an array of 1000 items, O(n) × 1000 = O(n²) total vs O(n) + O(1) × 1000 = O(n) total with indexing.",
      ],
      tests: [
        {
          description: "findUserLinear finds by id",
          code: `
it("findUserLinear returns correct user", () => {
  const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  expect(findUserLinear(users, 2).name).toBe("Bob");
  expect(findUserLinear(users, 99)).toBe(undefined);
});`,
        },
        {
          description: "buildIndex creates correct Map",
          code: `
it("buildIndex creates Map keyed by id", () => {
  const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
  const index = buildIndex(users);
  expect(index instanceof Map).toBe(true);
  expect(index.get(1).name).toBe("Alice");
  expect(index.get(2).name).toBe("Bob");
});`,
        },
        {
          description: "findUserIndexed does O(1) lookup",
          code: `
it("findUserIndexed returns correct user from Map", () => {
  const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
  const index = buildIndex(users);
  expect(findUserIndexed(index, 1).name).toBe("Alice");
  expect(findUserIndexed(index, 99)).toBe(undefined);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "on2-to-on",
      topicId: "ts-performance",
      title: "Refactor find-all-pairs from O(n²) to O(n)",
      difficulty: "medium",
      description:
        "Find all unique pairs in an array that sum to a target value. First implement the O(n²) brute force using nested loops. Then refactor to O(n) using a Set to track complements. Return pairs as `[a, b]` arrays where `a ≤ b`, no duplicate pairs.",
      concepts: ["Set", "O(n) vs O(n²)", "complement pattern", "deduplication"],
      starterCode: `// O(n²) — nested loops
function findPairsBrute(nums, target) {
  // TODO: find all pairs [a, b] where a + b === target
  // Each pair once: a <= b, no duplicates
}

// O(n) — Set-based complement lookup
function findPairs(nums, target) {
  // TODO: for each num, check if (target - num) is in a Set
  // Track seen numbers and found pairs
}

// findPairs([1, 2, 3, 4, 5, 6], 7) → [[1,6],[2,5],[3,4]]
// findPairs([1, 1, 2, 3], 3)       → [[1,2]]  (no duplicates)
// findPairs([1, 2, 3], 10)         → []`,
      hints: [
        "**Brute force**: `for i; for j > i; if nums[i]+nums[j]===target, push sorted pair`.",
        "**O(n)**: use `const seen = new Set()` and `const pairs = new Set()` (to deduplicate).",
        "For each `num`: if `seen.has(target - num)`, add the sorted pair as a string key to avoid duplicates.",
        "Pair key for deduplication: `JSON.stringify([Math.min(a,b), Math.max(a,b)])`.",
      ],
      tests: [
        {
          description: "finds all pairs summing to target",
          code: `
it("finds pairs summing to 7 from [1,2,3,4,5,6]", () => {
  const result = findPairs([1,2,3,4,5,6], 7);
  expect(result.length).toBe(3);
  const has = (a, b) => result.some(p => p.includes(a) && p.includes(b));
  expect(has(1, 6)).toBe(true);
  expect(has(2, 5)).toBe(true);
  expect(has(3, 4)).toBe(true);
});`,
        },
        {
          description: "returns empty for no pairs",
          code: `
it("returns [] when no pairs sum to target", () => {
  expect(findPairs([1,2,3], 10).length).toBe(0);
});`,
        },
        {
          description: "no duplicate pairs with duplicate inputs",
          code: `
it("no duplicate pairs even with duplicate values", () => {
  const result = findPairs([1,1,2,3], 3);
  expect(result.length).toBe(1);
});`,
        },
        {
          description: "brute force produces same count",
          code: `
it("brute force finds same number of pairs", () => {
  const r1 = findPairsBrute([1,2,3,4,5,6], 7);
  const r2 = findPairs([1,2,3,4,5,6], 7);
  expect(r1.length).toBe(r2.length);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "has-duplicate",
      topicId: "ts-performance",
      title: "Detect duplicates: Set O(n) vs sort O(n log n) vs nested O(n²)",
      difficulty: "easy",
      description:
        "Implement three versions of `hasDuplicate(array)` that returns `true` if any value appears more than once. (1) `hasDuplicateNested` — O(n²) nested loops. (2) `hasDuplicateSort` — O(n log n) sort then compare neighbors. (3) `hasDuplicateSet` — O(n) using a Set. All must return the same boolean result.",
      concepts: ["Set", "O(n) vs O(n log n) vs O(n²)", "duplicates", "Big O"],
      starterCode: `// O(n²) — nested loops
function hasDuplicateNested(array) {
  // TODO: compare every pair, return true if any match
}

// O(n log n) — sort then check neighbors
function hasDuplicateSort(array) {
  // TODO: sort a copy, then check if arr[i] === arr[i+1]
}

// O(n) — Set: stop as soon as a repeat is found
function hasDuplicateSet(array) {
  // TODO: add to Set; if already present, return true
}

// hasDuplicateSet([1, 2, 3, 2]) → true
// hasDuplicateSet([1, 2, 3, 4]) → false
// hasDuplicateSet([])           → false`,
      hints: [
        "**Nested**: `for i; for j > i; if arr[i]===arr[j] return true`. Return false at end.",
        "**Sort**: `const s = [...array].sort(); for i; if s[i]===s[i+1] return true`.",
        "**Set**: `const seen = new Set(); for (const v of array) { if (seen.has(v)) return true; seen.add(v); }`",
        "Set wins for large arrays: it short-circuits on the first duplicate and never allocates a sorted copy.",
      ],
      tests: [
        {
          description: "returns true when duplicates exist",
          code: `
it("returns true for [1,2,3,2]", () => {
  expect(hasDuplicateSet([1,2,3,2])).toBe(true);
  expect(hasDuplicateSort([1,2,3,2])).toBe(true);
  expect(hasDuplicateNested([1,2,3,2])).toBe(true);
});`,
        },
        {
          description: "returns false when all unique",
          code: `
it("returns false for [1,2,3,4]", () => {
  expect(hasDuplicateSet([1,2,3,4])).toBe(false);
  expect(hasDuplicateSort([1,2,3,4])).toBe(false);
  expect(hasDuplicateNested([1,2,3,4])).toBe(false);
});`,
        },
        {
          description: "returns false for empty array",
          code: `
it("returns false for empty array", () => {
  expect(hasDuplicateSet([])).toBe(false);
});`,
        },
        {
          description: "works with strings",
          code: `
it("detects duplicate strings", () => {
  expect(hasDuplicateSet(["a","b","a"])).toBe(true);
  expect(hasDuplicateSet(["a","b","c"])).toBe(false);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "ttl-cache",
      topicId: "ts-performance",
      title: "Build a TTL cache with per-entry expiry timestamps",
      difficulty: "medium",
      description:
        "Implement a `TTLCache` class that stores key-value pairs with a per-entry time-to-live (TTL). Methods: `set(key, value, ttlMs)` — store value, expires after `ttlMs` milliseconds; `get(key)` → value or `undefined` if missing/expired; `has(key)` → boolean (expired entries count as missing); `delete(key)` → removes entry; `size` getter → count of non-expired entries.",
      concepts: ["Map", "TTL", "timestamps", "cache expiry", "performance"],
      starterCode: `class TTLCache {
  constructor() {
    // TODO: initialize internal Map
    // Store { value, expiresAt } per entry
  }

  set(key, value, ttlMs) {
    // TODO: store value with expiry = Date.now() + ttlMs
  }

  get(key) {
    // TODO: return value if exists and not expired, else undefined
    // Clean up expired entry
  }

  has(key) {
    // TODO: return true if entry exists and has not expired
  }

  delete(key) {
    // TODO: remove entry from Map
  }

  get size() {
    // TODO: count non-expired entries
  }
}

// Usage:
// const cache = new TTLCache();
// cache.set("user:1", { name: "Alice" }, 5000); // expires in 5s
// cache.get("user:1") → { name: "Alice" }
// (after 5s) cache.get("user:1") → undefined`,
      hints: [
        "Store entries as `{ value, expiresAt: Date.now() + ttlMs }` in a `Map`.",
        "`get`: fetch entry, check `Date.now() > entry.expiresAt` → delete + return `undefined`.",
        "`has`: same expiry check without returning the value.",
        "`size` getter: iterate `this.#store.values()` and count entries where `Date.now() <= expiresAt`.",
      ],
      tests: [
        {
          description: "get returns value before expiry",
          code: `
it("get returns value before TTL expires", () => {
  const cache = new TTLCache();
  cache.set("k", "v", 10000);
  expect(cache.get("k")).toBe("v");
});`,
        },
        {
          description: "get returns undefined after expiry",
          code: `
it("get returns undefined after TTL expires", () => {
  const cache = new TTLCache();
  cache.set("k", "v", 1);
  return new Promise(resolve => {
    setTimeout(() => {
      expect(cache.get("k")).toBe(undefined);
      resolve();
    }, 10);
  });
});`,
        },
        {
          description: "has returns correct boolean",
          code: `
it("has returns true before and false after TTL", () => {
  const cache = new TTLCache();
  cache.set("k", "v", 10000);
  expect(cache.has("k")).toBe(true);
  expect(cache.has("missing")).toBe(false);
});`,
        },
        {
          description: "delete removes entry",
          code: `
it("delete removes the entry", () => {
  const cache = new TTLCache();
  cache.set("k", "v", 10000);
  cache.delete("k");
  expect(cache.has("k")).toBe(false);
  expect(cache.get("k")).toBe(undefined);
});`,
        },
        {
          description: "size counts only non-expired entries",
          code: `
it("size counts non-expired entries", () => {
  const cache = new TTLCache();
  cache.set("a", 1, 10000);
  cache.set("b", 2, 10000);
  expect(cache.size).toBe(2);
  cache.delete("a");
  expect(cache.size).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
