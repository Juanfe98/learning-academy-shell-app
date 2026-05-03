import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "beginner", title: "Beginner (10)", level: 2 },
  { id: "intermediate", title: "Intermediate (12)", level: 2 },
  { id: "advanced", title: "Advanced (8)", level: 2 },
];

interface ChallengeProps {
  number: number;
  title: string;
  concepts: string;
  problem: string;
  example: string;
  hints: string[];
  complexity: string;
  stretch?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

const diffColor = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

function Challenge({ number, title, concepts, problem, example, hints, complexity, stretch, difficulty }: ChallengeProps) {
  const color = diffColor[difficulty];
  return (
    <div style={{ marginBottom: "2rem", border: `1px solid #2a2a38`, borderLeft: `3px solid ${color}`, borderRadius: "8px", padding: "1.25rem", background: "#13131a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, color: color, fontFamily: "monospace", fontSize: "1rem" }}>
          #{number} {title}
        </h3>
        <span style={{ fontSize: "0.75rem", color: color, fontFamily: "monospace", padding: "2px 8px", border: `1px solid ${color}`, borderRadius: "4px" }}>
          {difficulty}
        </span>
      </div>
      <p style={{ fontSize: "0.8rem", color: "#818cf8", marginBottom: "0.75rem", fontFamily: "monospace" }}>
        Concepts: {concepts}
      </p>
      <p style={{ color: "#a0a0b8", marginBottom: "0.75rem" }}>{problem}</p>
      <pre style={{ marginBottom: "0.75rem" }}><code>{example}</code></pre>
      <div style={{ marginBottom: "0.75rem" }}>
        <p style={{ color: "#5a5a78", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Hints:</p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          {hints.map((h, i) => <li key={i} style={{ color: "#a0a0b8", fontSize: "0.85rem" }}>{h}</li>)}
        </ul>
      </div>
      <p style={{ color: "#5a5a78", fontSize: "0.8rem", marginBottom: stretch ? "0.5rem" : 0 }}>
        Complexity: {complexity}
      </p>
      {stretch && (
        <p style={{ color: "#6366f1", fontSize: "0.8rem", margin: 0 }}>
          Stretch: {stretch}
        </p>
      )}
    </div>
  );
}

export default function PythonCodingChallenges() {
  return (
    <div className="article-content">
      <p>
        30 challenges mapped to the Python Mastery learning path. No solutions included —
        write your own, then verify with test cases. Each challenge lists the concepts it
        tests and the expected complexity so you know what you&apos;re optimizing for.
      </p>

      <h2 id="beginner">Beginner</h2>

      <Challenge
        number={1} difficulty="beginner"
        title="Reverse a String"
        concepts="strings, slicing"
        problem="Write a function reverse_string(s: str) -> str that returns the string reversed. Do it three ways: slicing, loop, and using reversed()."
        example={`reverse_string("hello")    # "olleh"
reverse_string("Python")   # "nohtyP"
reverse_string("")          # ""`}
        hints={[
          "Slicing: s[::-1] is the one-liner.",
          "Loop: build a new string from the end.",
          "reversed() returns an iterator — join it.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Handle unicode correctly — check that emoji and multi-codepoint characters reverse properly."
      />

      <Challenge
        number={2} difficulty="beginner"
        title="Count Vowels"
        concepts="strings, iteration, sets"
        problem="Write count_vowels(s: str) -> int that returns the number of vowels (a, e, i, o, u) in s. Case-insensitive."
        example={`count_vowels("Hello World")   # 3
count_vowels("rhythm")         # 0
count_vowels("AEIOU")          # 5`}
        hints={[
          "Convert to lowercase once, then check membership.",
          "Use a set for O(1) membership: VOWELS = set('aeiou').",
          "One-liner with sum() and a generator expression.",
        ]}
        complexity="O(n) time, O(1) space."
        stretch="Return a dict of each vowel and its count."
      />

      <Challenge
        number={3} difficulty="beginner"
        title="Check Palindrome"
        concepts="strings, two pointers"
        problem="Write is_palindrome(s: str) -> bool. Ignore case and non-alphanumeric characters."
        example={`is_palindrome("racecar")       # True
is_palindrome("A man a plan a canal Panama")  # True
is_palindrome("hello")         # False`}
        hints={[
          "Clean: filter only alphanumeric, lowercase.",
          "Compare cleaned string with its reverse.",
          "Two-pointer approach: compare from both ends.",
        ]}
        complexity="O(n) time, O(n) space (O(1) with two pointers)."
        stretch="Handle strings with Unicode letters correctly."
      />

      <Challenge
        number={4} difficulty="beginner"
        title="FizzBuzz"
        concepts="loops, conditionals, modulo"
        problem="Return a list of strings for numbers 1 to n: 'FizzBuzz' for multiples of both 3 and 5, 'Fizz' for 3, 'Buzz' for 5, the number as a string otherwise."
        example={`fizzbuzz(15)
# ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz",
#  "11","Fizz","13","14","FizzBuzz"]`}
        hints={[
          "Check FizzBuzz first (both conditions) before checking individually.",
          "One-liner: list comprehension with nested ternary.",
          "Dict dispatch pattern avoids nested if chains.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Generalize to fizzbuzz(n, rules) where rules is a list of (divisor, label) tuples."
      />

      <Challenge
        number={5} difficulty="beginner"
        title="Remove Duplicates (Order-Preserving)"
        concepts="sets, dict, iteration"
        problem="Write unique(items: list) -> list that removes duplicates while preserving the original order."
        example={`unique([3, 1, 4, 1, 5, 9, 2, 6, 5, 3])
# [3, 1, 4, 5, 9, 2, 6]`}
        hints={[
          "set() removes duplicates but loses order.",
          "dict.fromkeys() preserves insertion order in Python 3.7+.",
          "Manual approach: seen set + result list.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Write a version that works for unhashable elements (e.g. lists of lists)."
      />

      <Challenge
        number={6} difficulty="beginner"
        title="Count Word Frequency"
        concepts="strings, dicts, Counter"
        problem="Write word_frequency(text: str) -> dict that returns a mapping of each word to its occurrence count. Case-insensitive. Ignore punctuation."
        example={`word_frequency("the cat sat on the mat the cat")
# {"the": 3, "cat": 2, "sat": 1, "on": 1, "mat": 1}`}
        hints={[
          "Use str.split() after lowercasing.",
          "Strip punctuation with str.strip(string.punctuation) per word, or re.sub.",
          "Counter(words) does the counting in one call.",
        ]}
        complexity="O(n) time, O(k) space (k = unique words)."
        stretch="Return the top 5 most common words sorted by frequency desc, then alphabetically."
      />

      <Challenge
        number={7} difficulty="beginner"
        title="Merge Dictionaries"
        concepts="dicts, unpacking"
        problem="Write merge_dicts(*dicts) that merges any number of dicts. Later dicts override earlier ones for duplicate keys. Do it in at least two ways."
        example={`merge_dicts({"a": 1}, {"b": 2}, {"a": 3})
# {"a": 3, "b": 2}`}
        hints={[
          "Python 3.9+: use the | operator.",
          "dict unpacking: {**d1, **d2}.",
          "Loop: result.update(d) for each d.",
        ]}
        complexity="O(total keys) time and space."
        stretch="Write a deep merge that recursively merges nested dicts instead of overwriting them."
      />

      <Challenge
        number={8} difficulty="beginner"
        title="Find Second Largest"
        concepts="sorting, sets, iteration"
        problem="Write second_largest(nums: list[int]) -> int | None that returns the second largest unique number, or None if it doesn't exist."
        example={`second_largest([3, 1, 4, 1, 5, 9, 2, 6])   # 6
second_largest([5, 5, 5])                    # None
second_largest([1])                           # None`}
        hints={[
          "Convert to set to remove duplicates, then sort.",
          "One-pass O(n): track first and second max simultaneously.",
          "Edge case: fewer than 2 unique values → return None.",
        ]}
        complexity="O(n) time, O(1) space (one-pass)."
      />

      <Challenge
        number={9} difficulty="beginner"
        title="Flatten One Level"
        concepts="list comprehension, iteration"
        problem="Write flatten(nested: list[list]) -> list that flattens exactly one level of nesting."
        example={`flatten([[1, 2], [3, 4], [5]])   # [1, 2, 3, 4, 5]
flatten([[1, [2, 3]], [4]])       # [1, [2, 3], 4]  — only one level`}
        hints={[
          "List comprehension: [x for sublist in nested for x in sublist].",
          "itertools.chain.from_iterable(nested) is the idiomatic approach.",
          "Do NOT recurse — only one level deep.",
        ]}
        complexity="O(n) time and space (n = total elements)."
        stretch="Write deep_flatten(nested) that recursively flattens to any depth."
      />

      <Challenge
        number={10} difficulty="beginner"
        title="Caesar Cipher"
        concepts="strings, ord/chr, modulo"
        problem="Write caesar(text: str, shift: int) -> str that shifts each letter by shift positions (wraps around). Preserve case and non-letter characters."
        example={`caesar("Hello, World!", 3)   # "Khoor, Zruog!"
caesar("Khoor, Zruog!", -3)  # "Hello, World!"`}
        hints={[
          "Use ord() and chr() to work with character codes.",
          "Uppercase: A=65, Z=90. Lowercase: a=97, z=122.",
          "Wrap with modulo: (ord(c) - base + shift) % 26 + base.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Implement a decode(text, shift) and auto_decode(ciphertext) that tries all 26 shifts."
      />

      <h2 id="intermediate">Intermediate</h2>

      <Challenge
        number={11} difficulty="intermediate"
        title="Group Anagrams"
        concepts="dicts, sorting, defaultdict"
        problem="Given a list of strings, group anagrams together. Return a list of groups, each group sorted alphabetically."
        example={`group_anagrams(["eat","tea","tan","ate","nat","bat"])
# [["ate","eat","tea"], ["nat","tan"], ["bat"]]`}
        hints={[
          "Key: sorted characters of each word form a canonical anagram key.",
          "Use defaultdict(list) to group by key.",
          "tuple(sorted(word)) is hashable — can be a dict key.",
        ]}
        complexity="O(n × k log k) time (k = max word length). O(nk) space."
        stretch="Solve without sorting characters — use a character frequency tuple as key."
      />

      <Challenge
        number={12} difficulty="intermediate"
        title="Valid Parentheses"
        concepts="stacks, dicts"
        problem="Given a string of brackets '()[]{}{', return True if all brackets are properly closed and nested."
        example={`valid("()")         # True
valid("()[]{}")     # True
valid("(]")         # False
valid("([)]")       # False
valid("{[]}")       # True`}
        hints={[
          "Stack: push open brackets, pop and verify on close bracket.",
          "Map close→open: {')':'(', ']':'[', '}':'{'} for O(1) lookup.",
          "Edge cases: empty string (True), string starting with close bracket.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Return the index and type of the first invalid bracket instead of just True/False."
      />

      <Challenge
        number={13} difficulty="intermediate"
        title="Two Sum"
        concepts="hash maps, one pass"
        problem="Given a list of integers and a target, return the indices of the two numbers that add up to target. Each input has exactly one solution. Do not use the same element twice."
        example={`two_sum([2, 7, 11, 15], 9)   # [0, 1]
two_sum([3, 2, 4], 6)         # [1, 2]`}
        hints={[
          "Brute force: O(n²) nested loops.",
          "Optimal: O(n) — hash map stores value→index. For each number, check if complement (target - n) is already seen.",
          "seen = {}; for i, n in enumerate(nums): if target-n in seen: return [seen[target-n], i]; seen[n] = i",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Return ALL pairs that sum to target, not just the first."
      />

      <Challenge
        number={14} difficulty="intermediate"
        title="Find First Non-Repeating Character"
        concepts="Counter, ordered iteration"
        problem="Given a string, return the first character that appears exactly once. Return '' if none exists."
        example={`first_unique("leetcode")   # "l"
first_unique("aabb")       # ""
first_unique("aabbc")      # "c"`}
        hints={[
          "Two-pass: build frequency map, then iterate string to find first with freq=1.",
          "Counter builds the frequency map in one call.",
          "Maintain insertion order by iterating the original string, not the Counter.",
        ]}
        complexity="O(n) time, O(1) space (at most 26 lowercase letters)."
        stretch="Solve in one pass using an OrderedDict."
      />

      <Challenge
        number={15} difficulty="intermediate"
        title="Merge Intervals"
        concepts="sorting, intervals"
        problem="Given a list of intervals [start, end], merge all overlapping intervals and return the result sorted."
        example={`merge([[1,3],[2,6],[8,10],[15,18]])
# [[1,6],[8,10],[15,18]]

merge([[1,4],[4,5]])
# [[1,5]]`}
        hints={[
          "Sort by start time first.",
          "Compare each interval's start with the last merged interval's end.",
          "If start <= last_end: extend (take max of ends). Else: append new interval.",
        ]}
        complexity="O(n log n) time (sort), O(n) space."
        stretch="Given two sorted interval lists, compute their intersection."
      />

      <Challenge
        number={16} difficulty="intermediate"
        title="Sliding Window Maximum Sum"
        concepts="sliding window, deque"
        problem="Given a list of integers and window size k, return the maximum sum of any contiguous subarray of size k."
        example={`max_window_sum([1,3,-1,-3,5,3,6,7], 3)   # 16  (3+6+7)
max_window_sum([2,1,5,1,3,2], 3)           # 9   (5+1+3)`}
        hints={[
          "Compute the first window sum, then slide: add right element, subtract left.",
          "Track running max as you slide.",
          "Don't recompute the sum from scratch each time — O(n) not O(nk).",
        ]}
        complexity="O(n) time, O(1) extra space."
        stretch="Return the starting index of the maximum window, not just the sum."
      />

      <Challenge
        number={17} difficulty="intermediate"
        title="Implement a Queue Using Two Stacks"
        concepts="stacks, amortized complexity"
        problem="Implement a Queue class using only two Python lists (stacks) — no deque. Support enqueue(x), dequeue() -> int, peek() -> int, is_empty() -> bool."
        example={`q = Queue()
q.enqueue(1)
q.enqueue(2)
q.enqueue(3)
q.peek()       # 1
q.dequeue()    # 1
q.dequeue()    # 2`}
        hints={[
          "inbox stack: new items always pushed here.",
          "outbox stack: pop from here. If empty, move ALL items from inbox (reverses order).",
          "Amortized O(1) per operation — each element crosses between stacks at most once.",
        ]}
        complexity="O(1) amortized per operation."
        stretch="Implement a Stack using two queues."
      />

      <Challenge
        number={18} difficulty="intermediate"
        title="Retry Decorator"
        concepts="decorators, exceptions, functools"
        problem="Write retry(times=3, delay=0, exceptions=(Exception,)) — a decorator factory that retries a function on failure up to 'times' attempts with optional delay between attempts."
        example={`@retry(times=3, delay=0.1, exceptions=(ConnectionError,))
def fetch_data(url):
    ...   # might raise ConnectionError`}
        hints={[
          "Three levels: factory(times, delay, exceptions) → decorator(func) → wrapper(*args, **kwargs).",
          "Loop with try/except; re-raise last exception if all attempts fail.",
          "Use time.sleep(delay) between attempts.",
          "Use @functools.wraps(func) on the wrapper.",
        ]}
        complexity="Depends on decorated function. Decorator overhead: O(1)."
        stretch="Add exponential backoff: delay doubles on each retry. Add on_retry callback."
      />

      <Challenge
        number={19} difficulty="intermediate"
        title="LRU Cache"
        concepts="OrderedDict, dicts, linked list concept"
        problem="Implement an LRUCache class with capacity, get(key) -> int (-1 if missing), and put(key, value). Both operations O(1). Evict least recently used when capacity is exceeded."
        example={`cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
cache.get(1)     # 1  (now 1 is most recent)
cache.put(3, 3)  # evicts key 2
cache.get(2)     # -1 (evicted)`}
        hints={[
          "Use collections.OrderedDict — it preserves insertion order and supports move_to_end().",
          "On get: move to end (most recent). On put: move to end or add; if over capacity, pop first (least recent).",
          "od.move_to_end(key), od.popitem(last=False) — the two key operations.",
        ]}
        complexity="O(1) for get and put."
        stretch="Use a raw dict + doubly linked list (no OrderedDict) to understand the underlying data structure."
      />

      <Challenge
        number={20} difficulty="intermediate"
        title="Parse and Aggregate Log Lines"
        concepts="regex, defaultdict, Counter, sorting"
        problem="Parse a list of log strings in format '[LEVEL] message'. Return a summary dict with total count per level and the 3 most common messages overall."
        example={`logs = [
    "[ERROR] disk full",
    "[INFO] server started",
    "[ERROR] disk full",
    "[WARN] high memory",
    "[ERROR] timeout",
]
# Expected:
# {
#   "by_level": {"ERROR": 3, "INFO": 1, "WARN": 1},
#   "top_messages": [("disk full", 2), ("server started", 1), ("high memory", 1)]
# }`}
        hints={[
          "re.match or str.split('[', 1) to parse level and message.",
          "Counter for message frequency, defaultdict(int) for level counts.",
          "Counter.most_common(3) for top messages.",
        ]}
        complexity="O(n) time, O(k) space (k = unique messages)."
      />

      <Challenge
        number={21} difficulty="intermediate"
        title="Flatten Arbitrarily Nested List"
        concepts="recursion, isinstance, generators"
        problem="Write deep_flatten(nested) that recursively flattens a list of any depth. Elements can be ints or nested lists."
        example={`deep_flatten([1, [2, [3, 4], 5], [6, 7]])
# [1, 2, 3, 4, 5, 6, 7]`}
        hints={[
          "isinstance(item, list) to check if an element is a list.",
          "Recursive: if list, recurse; else yield the value.",
          "Generator version uses 'yield from deep_flatten(item)'.",
        ]}
        complexity="O(n) time and space (n = total elements)."
        stretch="Support any iterable (tuple, set), not just lists. Exclude strings from flattening."
      />

      <Challenge
        number={22} difficulty="intermediate"
        title="Longest Consecutive Sequence"
        concepts="sets, O(n) thinking"
        problem="Given an unsorted list of integers, return the length of the longest consecutive sequence. Solve in O(n) time."
        example={`longest_consecutive([100,4,200,1,3,2])   # 4  (1,2,3,4)
longest_consecutive([0,3,7,2,5,8,4,6,0,1])  # 9`}
        hints={[
          "Convert to a set for O(1) lookup.",
          "Only start counting from numbers where n-1 is NOT in the set (sequence start).",
          "Extend the sequence with while n+length in num_set.",
        ]}
        complexity="O(n) time, O(n) space."
        stretch="Return the actual sequence, not just the length."
      />

      <h2 id="advanced">Advanced</h2>

      <Challenge
        number={23} difficulty="advanced"
        title="Build a Custom Iterator Class"
        concepts="iterator protocol, __iter__, __next__"
        problem="Implement a ChunkedRange iterator that yields non-overlapping chunks of size k from range(n). Support len(), indexing, and reuse."
        example={`cr = ChunkedRange(10, chunk_size=3)
list(cr)   # [[0,1,2],[3,4,5],[6,7,8],[9]]
len(cr)    # 4  (number of chunks)
cr[1]      # [3,4,5]
list(cr)   # still works — reusable iterable`}
        hints={[
          "__iter__ should return a fresh iterator (not self) so the class is reusable.",
          "Implement a separate _ChunkedRangeIter class with __next__.",
          "Or: make __iter__ a generator function — it creates a new generator each call.",
        ]}
        complexity="O(1) memory — yields chunks lazily."
        stretch="Accept any iterable, not just range(n)."
      />

      <Challenge
        number={24} difficulty="advanced"
        title="Build a Context Manager Class"
        concepts="context manager protocol, __enter__, __exit__"
        problem="Implement a Stopwatch context manager that measures elapsed time. Also implement it using @contextmanager. Both must expose elapsed seconds as an attribute after the with block."
        example={`with Stopwatch() as sw:
    time.sleep(0.1)
print(sw.elapsed)   # ~0.1

# Also implement:
@contextmanager
def stopwatch():
    ...`}
        hints={[
          "__enter__: record start time, return self.",
          "__exit__: record end time, set self.elapsed = end - start. Return False.",
          "@contextmanager: yield before timing the block, record after.",
        ]}
        complexity="O(1)."
        stretch="Add laps(): record a split time without stopping. Add __str__ that formats elapsed nicely."
      />

      <Challenge
        number={25} difficulty="advanced"
        title="Implement a Trie"
        concepts="trees, dicts, recursion"
        problem="Implement a Trie data structure with insert(word), search(word) -> bool, and starts_with(prefix) -> bool. Then add get_words_with_prefix(prefix) -> list[str]."
        example={`trie = Trie()
trie.insert("apple")
trie.insert("app")
trie.search("apple")           # True
trie.search("app")             # True
trie.search("ap")              # False
trie.starts_with("app")        # True
trie.get_words_with_prefix("app")  # ["app", "apple"]`}
        hints={[
          "Each node is a dict of children + a bool 'is_end'.",
          "Insert: traverse/create nodes char by char, mark is_end=True at last char.",
          "Search: traverse; all chars must exist, is_end must be True at last.",
          "starts_with: same traversal but don't check is_end.",
          "get_words: DFS from the prefix's last node, collect all is_end paths.",
        ]}
        complexity="Insert/search: O(m) where m = word length. Space: O(total chars)."
        stretch="Add delete(word) and count_words() methods."
      />

      <Challenge
        number={26} difficulty="advanced"
        title="BFS / DFS on a Grid"
        concepts="BFS, DFS, 2D grid traversal"
        problem="Given an m×n grid of 0s and 1s, implement: (a) count_islands() using DFS — count connected regions of 1s. (b) shortest_path(start, end) using BFS — return min steps from start to end through 0s."
        example={`grid = [
    ["1","1","0","0"],
    ["1","1","0","0"],
    ["0","0","1","0"],
    ["0","0","0","1"],
]
count_islands(grid)   # 3

grid2 = [[0,0,1],[0,0,0],[1,0,0]]
shortest_path(grid2, (0,0), (2,2))   # 4`}
        hints={[
          "4-directional neighbors: [(0,1),(0,-1),(1,0),(-1,0)].",
          "Mark visited by setting cell to '0' (in-place) or using a visited set.",
          "BFS: deque of (row, col, steps). Stop when reaching end.",
        ]}
        complexity="O(m×n) time and space."
        stretch="Implement 8-directional grid BFS. Add diagonal movement."
      />

      <Challenge
        number={27} difficulty="advanced"
        title="Async URL Fetch Simulator"
        concepts="asyncio, gather, error handling"
        problem="Write fetch_all(urls: list[str], timeout: float) -> list[dict] that fetches all URLs concurrently using asyncio. Return results as {url, status, data | error}. Never let one failure cancel the others."
        example={`results = asyncio.run(fetch_all(
    ["https://a.com", "https://b.com", "https://bad"],
    timeout=5.0
))
# [
#   {"url": "https://a.com", "status": "ok", "data": "..."},
#   {"url": "https://b.com", "status": "ok", "data": "..."},
#   {"url": "https://bad",   "status": "error", "error": "timeout"},
# ]`}
        hints={[
          "Simulate with asyncio.sleep + random failure (for testing without real HTTP).",
          "Use asyncio.wait_for(coro, timeout) to add per-URL timeout.",
          "Wrap each fetch in try/except and return error dict on failure.",
          "asyncio.gather(*coros, return_exceptions=True) or gather individual wrapped coroutines.",
        ]}
        complexity="O(n) coroutines. Wall time ≈ max(individual times) thanks to concurrency."
        stretch="Add a concurrency limit — only k URLs fetched simultaneously using asyncio.Semaphore."
      />

      <Challenge
        number={28} difficulty="advanced"
        title="Build a Simple Dependency Injection Container"
        concepts="decorators, dicts, callables, type hints"
        problem="Implement a Container class that registers factories and resolves dependencies. Support singleton and transient lifetimes."
        example={`container = Container()

@container.register(singleton=True)
def database() -> Database:
    return Database(url="sqlite:///dev.db")

@container.register()
def user_repo(db: Database) -> UserRepo:
    return UserRepo(db)

# Resolve — injects db automatically
repo = container.resolve(UserRepo)`}
        hints={[
          "Register: store factory function keyed by return type annotation.",
          "Resolve: inspect factory's parameter type hints, resolve each recursively.",
          "Singleton: cache resolved instances by type.",
          "Use typing.get_type_hints(fn) to read annotations.",
        ]}
        complexity="O(d) resolution time (d = dependency depth)."
        stretch="Add interface/implementation binding: container.bind(IRepo, SqlRepo)."
      />

      <Challenge
        number={29} difficulty="advanced"
        title="Mini Test Runner"
        concepts="decorators, exceptions, inspect"
        problem="Build a TestSuite class and @test decorator. Running the suite executes all registered tests, catches failures, and prints a summary report (passed/failed/total, failure messages with function names)."
        example={`suite = TestSuite()

@suite.test
def test_addition():
    assert 1 + 1 == 2

@suite.test
def test_will_fail():
    assert 1 + 1 == 3, "math is broken"

suite.run()
# PASS test_addition
# FAIL test_will_fail: AssertionError: math is broken
# Results: 1 passed, 1 failed, 2 total`}
        hints={[
          "@suite.test appends the function to an internal list.",
          "run() loops, calls each, wraps in try/except AssertionError.",
          "Use func.__name__ for the test name in output.",
          "Track pass/fail counts, collect failure messages.",
        ]}
        complexity="O(n) where n = number of tests."
        stretch="Add @suite.skip and @suite.expect_failure. Add timing per test."
      />

      <Challenge
        number={30} difficulty="advanced"
        title="Task Queue with Priority and Concurrency"
        concepts="asyncio, heapq, dataclasses, async generators"
        problem="Build an async PriorityTaskQueue that accepts tasks with a priority (lower = higher priority), processes them concurrently up to max_workers, and supports cancellation."
        example={`queue = PriorityTaskQueue(max_workers=2)

async def job(name, seconds):
    await asyncio.sleep(seconds)
    return f"{name} done"

await queue.submit(job("high", 0.1), priority=1)
await queue.submit(job("low",  0.5), priority=10)
await queue.submit(job("med",  0.2), priority=5)

results = await queue.run_all()
# high-priority tasks start first, max 2 at a time`}
        hints={[
          "Use heapq to store (priority, task_id, coro) tuples.",
          "asyncio.Semaphore(max_workers) limits concurrent execution.",
          "asyncio.create_task() to schedule coroutines; await asyncio.gather(*tasks) to collect.",
          "task_id (monotonic counter) as tiebreaker for equal priorities.",
        ]}
        complexity="O(log n) per submit (heap). Wall time bounded by max_workers and task durations."
        stretch="Add queue.cancel(task_id) and queue.status() methods."
      />
    </div>
  );
}
