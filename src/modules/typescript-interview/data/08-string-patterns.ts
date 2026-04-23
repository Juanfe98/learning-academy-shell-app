import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-string-patterns",
  title: "String Patterns",
  icon: "🔤",
  description: "Palindromes, sliding windows, compression, and the string manipulation patterns that show up in every interview.",
  accentColor: "#14b8a6",
  challenges: [
    {
      id: "is-palindrome",
      topicId: "ts-string-patterns",
      title: "Check if a string is a palindrome (ignore non-alphanumeric)",
      difficulty: "easy",
      description:
        "Implement `isPalindrome(s)` that returns `true` if the string reads the same forwards and backwards, ignoring spaces, punctuation, and case. `'A man, a plan, a canal: Panama'` → `true`.",
      concepts: ["string manipulation", "two pointers", "regex"],
      starterCode: `function isPalindrome(s) {
  // TODO: normalize (lowercase, remove non-alphanumeric), then check palindrome
  // "A man, a plan, a canal: Panama" → true
  // "race a car" → false
  // "" → true
}`,
      hints: [
        "Normalize: `s.toLowerCase().replace(/[^a-z0-9]/g, '')`.",
        "Two-pointer: `let l = 0, r = clean.length - 1; while (l < r) { if (clean[l] !== clean[r]) return false; l++; r--; }`",
        "Or simply: `clean === clean.split('').reverse().join('')`.",
      ],
      tests: [
        {
          description: "classic palindrome with spaces/punctuation",
          code: `
it("'A man, a plan, a canal: Panama' is palindrome", () => {
  expect(isPalindrome("A man, a plan, a canal: Panama")).toBe(true);
});`,
        },
        {
          description: "non-palindrome returns false",
          code: `
it("'race a car' is not a palindrome", () => {
  expect(isPalindrome("race a car")).toBe(false);
});`,
        },
        {
          description: "empty string is palindrome",
          code: `
it("empty string is palindrome", () => {
  expect(isPalindrome("")).toBe(true);
});`,
        },
        {
          description: "single character is palindrome",
          code: `
it("single character is palindrome", () => {
  expect(isPalindrome("a")).toBe(true);
});`,
        },
        {
          description: "simple word palindrome",
          code: `
it("'racecar' is palindrome", () => {
  expect(isPalindrome("racecar")).toBe(true);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "reverse-words",
      topicId: "ts-string-patterns",
      title: "Reverse words in a sentence",
      difficulty: "easy",
      description:
        "Implement `reverseWords(s)` that reverses the order of words in the string. Words are separated by spaces. Leading/trailing spaces should be removed, and multiple spaces between words should collapse to one.",
      concepts: ["split", "reverse", "join", "string normalization"],
      starterCode: `function reverseWords(s) {
  // TODO: reverse the order of words, handle multiple/trailing spaces
  // "the sky is blue"   → "blue is sky the"
  // "  hello world  "  → "world hello"
  // "a good   example" → "example good a"
}`,
      hints: [
        "Split on whitespace, filter empty strings: `s.trim().split(/\\s+/)`.",
        "Reverse the array and join with a single space.",
        "One liner: `s.trim().split(/\\s+/).reverse().join(' ')`.",
      ],
      tests: [
        {
          description: "reverses words in normal sentence",
          code: `
it("reverses 'the sky is blue'", () => {
  expect(reverseWords("the sky is blue")).toBe("blue is sky the");
});`,
        },
        {
          description: "handles leading and trailing spaces",
          code: `
it("trims leading/trailing spaces", () => {
  expect(reverseWords("  hello world  ")).toBe("world hello");
});`,
        },
        {
          description: "collapses multiple spaces between words",
          code: `
it("collapses multiple spaces", () => {
  expect(reverseWords("a good   example")).toBe("example good a");
});`,
        },
        {
          description: "single word returns same word",
          code: `
it("single word returns itself", () => {
  expect(reverseWords("hello")).toBe("hello");
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "string-compression",
      topicId: "ts-string-patterns",
      title: "Run-length encode a string",
      difficulty: "easy",
      description:
        "Implement `compress(s)` that applies run-length encoding: consecutive repeated characters are replaced by the character followed by its count. If the compressed string is not shorter than the original, return the original. `'aabcccdddd'` → `'a2bc3d4'` (single chars don't get a '1').",
      concepts: ["string traversal", "run-length encoding", "counting"],
      starterCode: `function compress(s) {
  // TODO: run-length encode the string
  // "aabcccdddd"   → "a2bc3d4"
  // "abcd"         → "abcd"    (compressed not shorter, return original)
  // "aabb"         → "a2b2"
  // ""             → ""
}`,
      hints: [
        "Walk the string, counting consecutive equal characters.",
        "When the character changes (or end of string), append `char + (count > 1 ? count : '')`.",
        "At the end, compare lengths: `result.length < s.length ? result : s`.",
      ],
      tests: [
        {
          description: "compresses repeated characters",
          code: `
it("compresses 'aabcccdddd' to 'a2bc3d4'", () => {
  expect(compress("aabcccdddd")).toBe("a2bc3d4");
});`,
        },
        {
          description: "returns original when compressed is not shorter",
          code: `
it("returns original if compression doesn't help", () => {
  expect(compress("abcd")).toBe("abcd");
});`,
        },
        {
          description: "handles all-same characters",
          code: `
it("'aaaa' compresses to 'a4'", () => {
  expect(compress("aaaa")).toBe("a4");
});`,
        },
        {
          description: "empty string returns empty",
          code: `
it("empty string returns empty", () => {
  expect(compress("")).toBe("");
});`,
        },
        {
          description: "single chars get no count",
          code: `
it("single chars have no count suffix", () => {
  const result = compress("aabb");
  expect(result).toBe("a2b2");
});`,
        },
      ],
      estimatedMinutes: 12,
    },
    {
      id: "longest-no-repeat",
      topicId: "ts-string-patterns",
      title: "Longest substring without repeating characters (sliding window)",
      difficulty: "medium",
      description:
        "Implement `lengthOfLongestSubstring(s)` that returns the length of the longest substring that contains no repeating characters. Use the sliding window technique for O(n) time.",
      concepts: ["sliding window", "Set", "O(n)", "substring"],
      starterCode: `function lengthOfLongestSubstring(s) {
  // TODO: sliding window with a Set tracking current window's characters
  // Move right pointer forward, adding chars to Set
  // When a repeat is found, shrink from the left until the repeat is removed
  // Track the max window size seen
  // "abcabcbb" → 3  ("abc")
  // "bbbbb"    → 1  ("b")
  // "pwwkew"   → 3  ("wke")
  // ""         → 0
}`,
      hints: [
        "Use `let left = 0` and a `Set` for the current window. Iterate `right` from 0 to end.",
        "If `s[right]` is already in the Set: remove `s[left]` from Set and advance `left++` until it's gone.",
        "After each step: `max = Math.max(max, right - left + 1)`.",
        "This is O(n) because each character is added and removed from the Set at most once.",
      ],
      tests: [
        {
          description: "returns 3 for 'abcabcbb'",
          code: `
it("lengthOfLongestSubstring('abcabcbb') = 3", () => {
  expect(lengthOfLongestSubstring("abcabcbb")).toBe(3);
});`,
        },
        {
          description: "returns 1 for all same characters",
          code: `
it("lengthOfLongestSubstring('bbbbb') = 1", () => {
  expect(lengthOfLongestSubstring("bbbbb")).toBe(1);
});`,
        },
        {
          description: "returns 3 for 'pwwkew'",
          code: `
it("lengthOfLongestSubstring('pwwkew') = 3", () => {
  expect(lengthOfLongestSubstring("pwwkew")).toBe(3);
});`,
        },
        {
          description: "returns 0 for empty string",
          code: `
it("returns 0 for empty string", () => {
  expect(lengthOfLongestSubstring("")).toBe(0);
});`,
        },
        {
          description: "returns full length for all unique chars",
          code: `
it("returns full length when all chars unique", () => {
  expect(lengthOfLongestSubstring("abcde")).toBe(5);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "anagram-check",
      topicId: "ts-string-patterns",
      title: "Check if two strings are anagrams",
      difficulty: "easy",
      description:
        "Implement `isAnagram(s, t)` that returns `true` if `t` is an anagram of `s` — both strings contain the exact same characters with the same frequencies, only the order differs. Ignore case. `'listen'` and `'silent'` → `true`.",
      concepts: ["frequency counter", "string sorting", "Map"],
      starterCode: `function isAnagram(s, t) {
  // TODO: return true if s and t are anagrams (same chars, same counts)
  // Ignore case
  // "listen"  / "silent"  → true
  // "hello"   / "world"   → false
  // "Astronomer" / "Moon starer" → true (spaces ignored? up to you)
}`,
      hints: [
        "Quick check: if lengths differ after normalization, return false.",
        "Approach 1: sort both strings and compare — `s.split('').sort().join('') === t.split('').sort().join('')`.",
        "Approach 2: build a frequency map from `s`, then decrement for each char in `t`. Any non-zero count → false.",
      ],
      tests: [
        {
          description: "listen and silent are anagrams",
          code: `
it("'listen' and 'silent' are anagrams", () => {
  expect(isAnagram("listen", "silent")).toBe(true);
});`,
        },
        {
          description: "non-anagrams return false",
          code: `
it("'hello' and 'world' are not anagrams", () => {
  expect(isAnagram("hello", "world")).toBe(false);
});`,
        },
        {
          description: "different lengths return false",
          code: `
it("different length strings are not anagrams", () => {
  expect(isAnagram("abc", "ab")).toBe(false);
});`,
        },
        {
          description: "case insensitive",
          code: `
it("isAnagram is case-insensitive", () => {
  expect(isAnagram("Listen", "Silent")).toBe(true);
});`,
        },
        {
          description: "same string is anagram of itself",
          code: `
it("a string is an anagram of itself", () => {
  expect(isAnagram("hello", "hello")).toBe(true);
});`,
        },
      ],
      estimatedMinutes: 10,
    },
  ],
};

export default topic;
