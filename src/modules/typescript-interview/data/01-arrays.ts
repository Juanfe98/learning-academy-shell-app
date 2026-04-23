import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-arrays",
  title: "Arrays",
  icon: "🟦",
  description: "Core array transformations: chunking, flattening, grouping, deduplication, and set operations.",
  accentColor: "#f59e0b",
  challenges: [
    {
      id: "chunk-array",
      topicId: "ts-arrays",
      title: "Split array into chunks of size n",
      difficulty: "easy",
      description:
        "Implement `chunk(array, size)` that splits an array into groups of `size`. The last chunk may be smaller if the array doesn't divide evenly. Do not use any external libraries.",
      concepts: ["arrays", "slice", "Math.ceil"],
      starterCode: `function chunk(array, size) {
  // TODO: return an array of arrays, each of length \`size\`
}

// Examples:
// chunk([1, 2, 3, 4, 5], 2) → [[1,2], [3,4], [5]]
// chunk([1, 2, 3], 3)       → [[1,2,3]]
// chunk([], 2)              → []`,
      hints: [
        "Use a loop with step `size`: `for (let i = 0; i < array.length; i += size)`.",
        "In each iteration, push `array.slice(i, i + size)` to your result array.",
        "No need for `Math.ceil` — `slice` handles the last partial chunk automatically.",
      ],
      tests: [
        {
          description: "splits evenly",
          code: `
it("splits [1..4] into chunks of 2", () => {
  expect(JSON.stringify(chunk([1,2,3,4], 2))).toBe("[[1,2],[3,4]]");
});`,
        },
        {
          description: "last chunk is smaller when uneven",
          code: `
it("last chunk is smaller when uneven", () => {
  const result = chunk([1,2,3,4,5], 2);
  expect(result.length).toBe(3);
  expect(JSON.stringify(result[2])).toBe("[5]");
});`,
        },
        {
          description: "returns empty array for empty input",
          code: `
it("returns [] for empty array", () => {
  expect(chunk([], 3).length).toBe(0);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "flatten-array",
      topicId: "ts-arrays",
      title: "Flatten a nested array to any depth",
      difficulty: "medium",
      description:
        "Implement `flatten(array, depth)` that flattens a nested array. `depth` defaults to `Infinity` (fully flat). Do not use `Array.prototype.flat`.",
      concepts: ["recursion", "reduce", "arrays"],
      starterCode: `function flatten(array, depth = Infinity) {
  // TODO: recursively flatten up to \`depth\` levels
}

// Examples:
// flatten([1, [2, [3, [4]]]]) → [1, 2, 3, 4]
// flatten([1, [2, [3]]], 1)   → [1, 2, [3]]
// flatten([1, 2, 3])          → [1, 2, 3]`,
      hints: [
        "Use `reduce` and spread: for each element, if it's an array and `depth > 0`, recursively flatten it with `depth - 1`.",
        "Base case: if the element is not an array, push it as-is.",
        "`[].concat(...arr)` or `Array.isArray(el)` are useful helpers.",
      ],
      tests: [
        {
          description: "fully flattens by default",
          code: `
it("fully flattens nested array", () => {
  expect(JSON.stringify(flatten([1,[2,[3,[4]]]]))).toBe("[1,2,3,4]");
});`,
        },
        {
          description: "respects depth limit",
          code: `
it("flattens only 1 level when depth=1", () => {
  expect(JSON.stringify(flatten([1,[2,[3]]], 1))).toBe("[1,2,[3]]");
});`,
        },
        {
          description: "returns flat array unchanged",
          code: `
it("leaves already-flat array unchanged", () => {
  expect(JSON.stringify(flatten([1,2,3]))).toBe("[1,2,3]");
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "group-by",
      topicId: "ts-arrays",
      title: "Group array of objects by a key property",
      difficulty: "medium",
      description:
        "Implement `groupBy(array, key)` that groups an array of objects by the value of a given key. Returns an object where each key maps to an array of matching items.",
      concepts: ["reduce", "objects", "grouping"],
      starterCode: `function groupBy(array, key) {
  // TODO: return an object grouped by the value at \`key\`
}

const people = [
  { name: "Alice", dept: "eng" },
  { name: "Bob",   dept: "design" },
  { name: "Carol", dept: "eng" },
];

// groupBy(people, "dept")
// → { eng: [{name:"Alice",...}, {name:"Carol",...}], design: [{name:"Bob",...}] }`,
      hints: [
        "Use `reduce` with an empty object `{}` as the accumulator.",
        "For each item: `const groupKey = item[key]`. If `acc[groupKey]` doesn't exist, initialize it as `[]`.",
        "Push `item` into `acc[groupKey]`, then return `acc`.",
      ],
      tests: [
        {
          description: "groups by dept correctly",
          code: `
it("groups people by dept", () => {
  const people = [
    { name: "Alice", dept: "eng" },
    { name: "Bob",   dept: "design" },
    { name: "Carol", dept: "eng" },
  ];
  const result = groupBy(people, "dept");
  expect(result.eng.length).toBe(2);
  expect(result.design.length).toBe(1);
});`,
        },
        {
          description: "each group contains the correct items",
          code: `
it("eng group contains Alice and Carol", () => {
  const people = [
    { name: "Alice", dept: "eng" },
    { name: "Bob",   dept: "design" },
    { name: "Carol", dept: "eng" },
  ];
  const result = groupBy(people, "dept");
  const names = result.eng.map(p => p.name).sort();
  expect(names[0]).toBe("Alice");
  expect(names[1]).toBe("Carol");
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "dedupe-by-key",
      topicId: "ts-arrays",
      title: "Remove duplicate objects by a unique key",
      difficulty: "easy",
      description:
        "Implement `dedupeByKey(array, key)` that removes duplicate objects from an array, keeping only the **first** occurrence of each unique value at `key`. Use a `Map` for O(n) performance.",
      concepts: ["Map", "deduplication", "O(n)"],
      starterCode: `function dedupeByKey(array, key) {
  // TODO: return array with duplicates removed (keep first occurrence)
  // Use Map for O(n) — not filter+findIndex which is O(n²)
}

const items = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 1, name: "Apple (dup)" },
  { id: 3, name: "Cherry" },
];

// dedupeByKey(items, "id") → items with id 1,2,3 (first Apple kept)`,
      hints: [
        "Create a `new Map()`. Loop through the array.",
        "For each item, check `if (!map.has(item[key]))` — if not seen, `map.set(item[key], item)`.",
        "Return `Array.from(map.values())` at the end.",
      ],
      tests: [
        {
          description: "removes duplicates by id",
          code: `
it("keeps first occurrence of duplicate id", () => {
  const items = [
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
    { id: 1, name: "Dup" },
  ];
  const result = dedupeByKey(items, "id");
  expect(result.length).toBe(2);
  expect(result.find(i => i.id === 1).name).toBe("Apple");
});`,
        },
        {
          description: "returns all items when no duplicates",
          code: `
it("returns all items when no duplicates exist", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  expect(dedupeByKey(items, "id").length).toBe(3);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "array-intersection",
      topicId: "ts-arrays",
      title: "Find intersection of two arrays efficiently",
      difficulty: "easy",
      description:
        "Implement `intersection(a, b)` that returns an array of values present in **both** arrays. No duplicates in the result. Use a `Set` for O(n + m) time instead of nested loops O(n × m).",
      concepts: ["Set", "intersection", "O(n)"],
      starterCode: `function intersection(a, b) {
  // TODO: return values in both a and b, no duplicates
  // Hint: build a Set from one array, filter the other
}

// intersection([1, 2, 3], [2, 3, 4]) → [2, 3]
// intersection([1, 2], [3, 4])       → []
// intersection([1, 1, 2], [1, 2, 2]) → [1, 2]`,
      hints: [
        "Build `const setA = new Set(a)`.",
        "Filter array `b`: `b.filter(v => setA.has(v))`.",
        "Wrap result in `new Set(...)` and spread to eliminate duplicates from `b`.",
      ],
      tests: [
        {
          description: "finds common elements",
          code: `
it("returns [2,3] for [1,2,3] and [2,3,4]", () => {
  const result = intersection([1,2,3], [2,3,4]);
  expect(result.includes(2)).toBe(true);
  expect(result.includes(3)).toBe(true);
  expect(result.includes(1)).toBe(false);
});`,
        },
        {
          description: "returns empty for disjoint arrays",
          code: `
it("returns [] for disjoint arrays", () => {
  expect(intersection([1,2], [3,4]).length).toBe(0);
});`,
        },
        {
          description: "no duplicates in result",
          code: `
it("no duplicates even if inputs have repeats", () => {
  const result = intersection([1,1,2], [1,2,2]);
  expect(result.length).toBe(2);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
  ],
};

export default topic;
