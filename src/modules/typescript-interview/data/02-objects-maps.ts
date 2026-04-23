import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-objects-maps",
  title: "Objects & Maps",
  icon: "🗂️",
  description: "Hash maps, frequency counters, O(1) lookup patterns, and the transformations that make interviews click.",
  accentColor: "#8b5cf6",
  challenges: [
    {
      id: "frequency-counter",
      topicId: "ts-objects-maps",
      title: "Count occurrences of each element in O(n)",
      difficulty: "easy",
      description:
        "Implement `frequencyCounter(array)` that returns an object (or Map) where each key is an element from the array and its value is the count of how many times it appears. Must be O(n) — no nested loops.",
      concepts: ["frequency counter", "objects", "O(n)"],
      starterCode: `function frequencyCounter(array) {
  // TODO: return { element: count } for each unique element
}

// frequencyCounter([1, 2, 2, 3, 3, 3]) → { 1: 1, 2: 2, 3: 3 }
// frequencyCounter(["a","b","a"])       → { a: 2, b: 1 }
// frequencyCounter([])                 → {}`,
      hints: [
        "Initialize an empty object: `const counts = {}`.",
        "For each element: `counts[el] = (counts[el] || 0) + 1`.",
        "This is O(n) — one pass through the array, O(1) object write each time.",
      ],
      tests: [
        {
          description: "counts numbers correctly",
          code: `
it("counts [1,2,2,3,3,3] correctly", () => {
  const result = frequencyCounter([1,2,2,3,3,3]);
  expect(result[1]).toBe(1);
  expect(result[2]).toBe(2);
  expect(result[3]).toBe(3);
});`,
        },
        {
          description: "returns empty object for empty array",
          code: `
it("returns {} for empty array", () => {
  expect(Object.keys(frequencyCounter([])).length).toBe(0);
});`,
        },
        {
          description: "works with strings",
          code: `
it("counts string elements", () => {
  const result = frequencyCounter(["a","b","a"]);
  expect(result["a"]).toBe(2);
  expect(result["b"]).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "two-sum-map",
      topicId: "ts-objects-maps",
      title: "Two Sum — O(n) with Map vs O(n²) brute force",
      difficulty: "medium",
      description:
        "Given an array of numbers and a `target`, return the **indices** of the two numbers that add up to `target`. There is exactly one solution. First implement the O(n²) brute-force approach, then refactor to O(n) using a `Map` that stores `value → index`.",
      concepts: ["Map", "two-pointer", "O(n) vs O(n²)", "complement lookup"],
      starterCode: `// O(n²) brute force — implement first, then optimize
function twoSumBrute(nums, target) {
  // TODO: nested loops, compare every pair
}

// O(n) optimized — use a Map
function twoSum(nums, target) {
  // TODO: for each num, check if (target - num) is already in the Map
  // If yes, return [map.get(complement), i]
  // If no, store num → i in the Map
}

// twoSum([2, 7, 11, 15], 9) → [0, 1]  (2 + 7 = 9)
// twoSum([3, 2, 4], 6)      → [1, 2]  (2 + 4 = 6)`,
      hints: [
        "**Brute force**: two nested loops `i` and `j > i`, check `nums[i] + nums[j] === target`.",
        "**Optimized**: create `const seen = new Map()`. For each `i`, compute `complement = target - nums[i]`.",
        "If `seen.has(complement)`, return `[seen.get(complement), i]`. Otherwise `seen.set(nums[i], i)`.",
      ],
      tests: [
        {
          description: "twoSum finds [0,1] for [2,7,11,15] target 9",
          code: `
it("twoSum returns [0,1] for [2,7,11,15] target 9", () => {
  const result = twoSum([2,7,11,15], 9);
  expect(result[0]).toBe(0);
  expect(result[1]).toBe(1);
});`,
        },
        {
          description: "twoSum finds [1,2] for [3,2,4] target 6",
          code: `
it("twoSum returns [1,2] for [3,2,4] target 6", () => {
  const result = twoSum([3,2,4], 6);
  expect(result[0]).toBe(1);
  expect(result[1]).toBe(2);
});`,
        },
        {
          description: "twoSumBrute produces same result",
          code: `
it("brute force also finds correct indices", () => {
  const result = twoSumBrute([2,7,11,15], 9);
  expect(result[0]).toBe(0);
  expect(result[1]).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "invert-object",
      topicId: "ts-objects-maps",
      title: "Swap keys and values of an object",
      difficulty: "easy",
      description:
        "Implement `invertObject(obj)` that returns a new object with all keys and values swapped. If multiple keys map to the same value, the last one wins. Values are converted to strings (since object keys must be strings).",
      concepts: ["objects", "Object.entries", "key-value swap"],
      starterCode: `function invertObject(obj) {
  // TODO: return { [value]: key } for each key-value pair
}

// invertObject({ a: 1, b: 2, c: 3 }) → { 1: "a", 2: "b", 3: "c" }
// invertObject({ x: "foo", y: "bar" }) → { foo: "x", bar: "y" }
// invertObject({ a: 1, b: 1 })        → { 1: "b" }  (last key wins)`,
      hints: [
        "Use `Object.entries(obj)` to get `[key, value]` pairs.",
        "Build the result with `reduce`: `acc[value] = key; return acc;`",
        "Or use `Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]))`.",
      ],
      tests: [
        {
          description: "swaps keys and values",
          code: `
it("swaps { a: 1, b: 2 } to { 1: 'a', 2: 'b' }", () => {
  const result = invertObject({ a: 1, b: 2 });
  expect(result["1"]).toBe("a");
  expect(result["2"]).toBe("b");
});`,
        },
        {
          description: "last key wins on duplicate values",
          code: `
it("last key wins when values duplicate", () => {
  const result = invertObject({ a: 1, b: 1 });
  expect(result["1"]).toBe("b");
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "library-inventory",
      topicId: "ts-objects-maps",
      title: "Book inventory with O(1) lookup, add/remove/check stock",
      difficulty: "medium",
      description:
        "You're given an array of book objects `{ id, title, stock }`. Build a `LibraryInventory` class that: (1) indexes books into a `Map` on construction for O(1) lookups, (2) implements `isAvailable(id)` → boolean, (3) `checkout(id)` → decrements stock (throws if unavailable), (4) `returnBook(id)` → increments stock, (5) `addBook(book)` → adds to inventory.",
      concepts: ["Map", "O(1) lookup", "class", "data indexing"],
      starterCode: `class LibraryInventory {
  constructor(books) {
    // TODO: index books into a Map by id for O(1) access
    // this.catalog = new Map(...)
  }

  isAvailable(id) {
    // TODO: return true if book exists and stock > 0
  }

  checkout(id) {
    // TODO: decrement stock; throw Error if not available
  }

  returnBook(id) {
    // TODO: increment stock
  }

  addBook(book) {
    // TODO: add or update book in catalog
  }
}

const books = [
  { id: "b1", title: "Clean Code", stock: 2 },
  { id: "b2", title: "The Pragmatic Programmer", stock: 0 },
];`,
      hints: [
        "In the constructor: `this.catalog = new Map(books.map(b => [b.id, { ...b }]))`.",
        "For `isAvailable`: `const book = this.catalog.get(id); return !!book && book.stock > 0`.",
        "For `checkout`: check `isAvailable` first, then `book.stock--`. Throw `new Error('Not available')` if not.",
      ],
      tests: [
        {
          description: "isAvailable returns true for book with stock",
          code: `
it("isAvailable returns true when stock > 0", () => {
  const inv = new LibraryInventory([{ id: "b1", title: "X", stock: 2 }]);
  expect(inv.isAvailable("b1")).toBe(true);
});`,
        },
        {
          description: "isAvailable returns false for book with 0 stock",
          code: `
it("isAvailable returns false when stock is 0", () => {
  const inv = new LibraryInventory([{ id: "b2", title: "Y", stock: 0 }]);
  expect(inv.isAvailable("b2")).toBe(false);
});`,
        },
        {
          description: "checkout decrements stock",
          code: `
it("checkout decrements stock", () => {
  const inv = new LibraryInventory([{ id: "b1", title: "X", stock: 2 }]);
  inv.checkout("b1");
  expect(inv.isAvailable("b1")).toBe(true); // stock is now 1
  inv.checkout("b1");
  expect(inv.isAvailable("b1")).toBe(false); // stock is now 0
});`,
        },
        {
          description: "checkout throws when not available",
          code: `
it("checkout throws when stock is 0", () => {
  const inv = new LibraryInventory([{ id: "b2", title: "Y", stock: 0 }]);
  expect(() => inv.checkout("b2")).toThrow();
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "group-anagrams",
      topicId: "ts-objects-maps",
      title: "Group anagrams together",
      difficulty: "medium",
      description:
        "Given an array of strings, group the anagrams together. Two strings are anagrams if they contain the same characters in any order. Use a sorted version of each string as the Map key for O(n·k·log k) overall.",
      concepts: ["Map", "sorting", "anagrams", "hash key pattern"],
      starterCode: `function groupAnagrams(words) {
  // TODO: group words that are anagrams of each other
  // Key insight: sort each word's characters → same key for all anagrams
}

// groupAnagrams(["eat","tea","tan","ate","nat","bat"])
// → [["eat","tea","ate"], ["tan","nat"], ["bat"]]
// (order of groups and order within groups doesn't matter)`,
      hints: [
        "Create `const map = new Map()`. For each word, compute its key: `word.split('').sort().join('')`.",
        "If `map.has(key)`, push word into that group. Otherwise `map.set(key, [word])`.",
        "Return `Array.from(map.values())`.",
      ],
      tests: [
        {
          description: "groups eat/tea/ate together",
          code: `
it("groups eat, tea, ate as anagrams", () => {
  const result = groupAnagrams(["eat","tea","tan","ate","nat","bat"]);
  const eatGroup = result.find(g => g.includes("eat"));
  expect(eatGroup).toBeTruthy();
  expect(eatGroup.includes("tea")).toBe(true);
  expect(eatGroup.includes("ate")).toBe(true);
});`,
        },
        {
          description: "bat is in its own group",
          code: `
it("bat is alone in its group", () => {
  const result = groupAnagrams(["eat","tea","bat"]);
  const batGroup = result.find(g => g.includes("bat"));
  expect(batGroup.length).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
  ],
};

export default topic;
