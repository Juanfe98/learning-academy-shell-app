import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "conditionals", title: "if / elif / else", level: 2 },
  { id: "comparison-operators", title: "Comparison and Logical Operators", level: 2 },
  { id: "for-loops", title: "for Loops", level: 2 },
  { id: "range", title: "range()", level: 2 },
  { id: "enumerate", title: "enumerate()", level: 2 },
  { id: "zip", title: "zip()", level: 2 },
  { id: "while-loops", title: "while Loops", level: 2 },
  { id: "break-continue", title: "break and continue", level: 2 },
  { id: "loop-else", title: "Loop else", level: 2 },
  { id: "match-case", title: "match / case (Python 3.10+)", level: 2 },
  { id: "js-comparison", title: "Python vs JavaScript Control Flow", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function ControlFlowAndLoops() {
  return (
    <div className="article-content">
      <p>
        Python&apos;s control flow is clean but has several behaviors that trip up JS/TS
        developers: <code>range</code> is not an array, <code>enumerate</code> replaces index
        tracking, loop <code>else</code> does something genuinely surprising, and{" "}
        <code>match/case</code> is more powerful than a JavaScript switch. This module covers
        all of it with interview-focused depth.
      </p>

      <h2 id="conditionals">if / elif / else</h2>

      <pre><code>{`score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(grade)  # "B"`}</code></pre>

      <p>Rules:</p>
      <ul>
        <li>No parentheses required around conditions (allowed but un-Pythonic).</li>
        <li>The colon <code>:</code> is mandatory.</li>
        <li>Body must be indented (4 spaces).</li>
        <li>
          Python has no <code>else if</code> — it is <code>elif</code> (one keyword).
        </li>
      </ul>

      <h3>Ternary expression</h3>
      <pre><code>{`# Python ternary: value_if_true if condition else value_if_false
status = "active" if user.is_active else "inactive"

# Equivalent to JS: user.isActive ? "active" : "inactive"

# Ternary works in assignments and expressions
label = "even" if n % 2 == 0 else "odd"
items = [x for x in data if x > 0]  # ternary inside comprehension
result = compute() if flag else default`}</code></pre>

      <h2 id="comparison-operators">Comparison and Logical Operators</h2>

      <h3>Comparison operators</h3>
      <pre><code>{`x = 5

x == 5    # equal
x != 5    # not equal
x > 3     # greater than
x < 10    # less than
x >= 5    # greater than or equal
x <= 5    # less than or equal

# Python allows chaining comparisons — very Pythonic
1 < x < 10      # True  (equivalent to: 1 < x and x < 10)
0 <= x <= 100   # True
a < b < c < d   # chains as many as you want

# Identity vs equality
a = [1, 2, 3]
b = [1, 2, 3]
a == b    # True  — same value
a is b    # False — different objects in memory

c = a
a is c    # True  — same object

# Only use "is" for None, True, False — not for value comparison
x is None       # correct
x is not None   # correct
x == None       # works but un-Pythonic`}</code></pre>

      <h3>Logical operators</h3>
      <pre><code>{`# Python uses words, not symbols
True and False   # False
True or False    # True
not True         # False

# JS equivalent: && || !

# Short-circuit evaluation
False and expensive_call()  # expensive_call never runs
True or expensive_call()    # expensive_call never runs

# and/or return operands, not just True/False
"Juan" or "Anonymous"    # "Juan"  (first truthy)
None or "Anonymous"      # "Anonymous" (first truthy)
"Juan" and "active"      # "active" (last truthy if all truthy)
None and "active"        # None    (first falsy)

# Common patterns
name = user_input or "Guest"         # default if falsy
valid = name and len(name) < 50      # guard + check`}</code></pre>

      <h2 id="for-loops">for Loops</h2>

      <p>
        Python <code>for</code> loops iterate over any iterable — lists, strings, dicts, sets,
        ranges, generators. There is no C-style <code>for (i=0; i&lt;n; i++)</code>.
      </p>

      <pre><code>{`# Iterate list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)

# Iterate string (character by character)
for ch in "hello":
    print(ch)

# Iterate dict — iterates keys by default
user = {"name": "Juan", "age": 30}
for key in user:
    print(key)          # "name", "age"

for value in user.values():
    print(value)        # "Juan", 30

for key, value in user.items():
    print(f"{key}: {value}")   # "name: Juan", "age: 30"

# Iterate set — unordered
for tag in {"python", "backend", "api"}:
    print(tag)   # any order`}</code></pre>

      <h2 id="range">range()</h2>

      <p>
        <code>range</code> generates integers lazily — it is not a list. It is memory-efficient
        even for huge ranges.
      </p>

      <pre><code>{`range(5)          # 0, 1, 2, 3, 4
range(2, 7)       # 2, 3, 4, 5, 6
range(0, 10, 2)   # 0, 2, 4, 6, 8   (step=2)
range(10, 0, -1)  # 10, 9, 8, ..., 1  (countdown)
range(5, -1, -1)  # 5, 4, 3, 2, 1, 0

for i in range(3):
    print(i)   # 0, 1, 2

# Common patterns
for i in range(len(items)):        # index-based (prefer enumerate)
    print(items[i])

for _ in range(5):                 # _ means "unused variable"
    do_something()

list(range(5))   # [0, 1, 2, 3, 4]  — convert to list if needed`}</code></pre>

      <h2 id="enumerate">enumerate()</h2>

      <p>
        When you need both the index and the value, use <code>enumerate</code> instead of{" "}
        <code>range(len(...))</code>. This is the Pythonic way.
      </p>

      <pre><code>{`fruits = ["apple", "banana", "cherry"]

# Un-Pythonic (JS style)
for i in range(len(fruits)):
    print(i, fruits[i])

# Pythonic
for i, fruit in enumerate(fruits):
    print(i, fruit)
# 0 apple
# 1 banana
# 2 cherry

# Start index at 1
for i, fruit in enumerate(fruits, start=1):
    print(i, fruit)
# 1 apple
# 2 banana
# 3 cherry

# enumerate returns (index, value) tuples
list(enumerate(["a", "b"]))   # [(0, "a"), (1, "b")]`}</code></pre>

      <h2 id="zip">zip()</h2>

      <p>
        <code>zip</code> pairs elements from multiple iterables. Stops at the shortest one.
      </p>

      <pre><code>{`names = ["Alice", "Bob", "Carol"]
scores = [95, 87, 92]

for name, score in zip(names, scores):
    print(f"{name}: {score}")
# Alice: 95
# Bob: 87
# Carol: 92

# zip stops at shortest
a = [1, 2, 3]
b = ["x", "y"]
list(zip(a, b))   # [(1, "x"), (2, "y")]  — 3 is dropped

# zip_longest to keep all (fill missing with None or a default)
from itertools import zip_longest
list(zip_longest(a, b, fillvalue=0))   # [(1, "x"), (2, "y"), (3, 0)]

# Unzipping — transpose a list of pairs
pairs = [(1, "a"), (2, "b"), (3, "c")]
nums, letters = zip(*pairs)
# nums = (1, 2, 3)
# letters = ("a", "b", "c")

# Build a dict from two lists
keys = ["a", "b", "c"]
vals = [1, 2, 3]
d = dict(zip(keys, vals))   # {"a": 1, "b": 2, "c": 3}`}</code></pre>

      <h2 id="while-loops">while Loops</h2>

      <pre><code>{`count = 0
while count < 5:
    print(count)
    count += 1

# Infinite loop with break
while True:
    user_input = input("Enter 'q' to quit: ")
    if user_input == "q":
        break
    print(f"You entered: {user_input}")

# While with condition
stack = [1, 2, 3, 4, 5]
while stack:          # loops while stack is non-empty (truthy)
    item = stack.pop()
    print(item)`}</code></pre>

      <h2 id="break-continue">break and continue</h2>

      <pre><code>{`# break — exit the loop immediately
for n in range(10):
    if n == 5:
        break
    print(n)   # prints 0, 1, 2, 3, 4

# continue — skip to next iteration
for n in range(10):
    if n % 2 == 0:
        continue
    print(n)   # prints 1, 3, 5, 7, 9

# Nested loops — break only exits innermost loop
for i in range(3):
    for j in range(3):
        if j == 1:
            break      # only breaks inner loop
        print(i, j)

# To break out of nested loops — use a flag or a function
def find_target(matrix, target):
    for row in matrix:
        for val in row:
            if val == target:
                return True   # return exits all loops
    return False`}</code></pre>

      <h2 id="loop-else">Loop else</h2>

      <p>
        Python loops can have an <code>else</code> clause. This surprises most developers — it
        is one of the most commonly asked Python interview questions about control flow.
      </p>

      <p>
        <strong>The rule:</strong> the <code>else</code> block runs when the loop completes
        normally (without hitting a <code>break</code>). If <code>break</code> fires, the{" "}
        <code>else</code> is skipped.
      </p>

      <pre><code>{`# for...else
for n in [2, 3, 5, 7, 11]:
    if n % 2 == 0:
        print(f"{n} is even")
        break
else:
    print("no even numbers found")
# prints: "2 is even"  — else is skipped because break fired

for n in [1, 3, 5, 7]:
    if n % 2 == 0:
        print(f"{n} is even")
        break
else:
    print("no even numbers found")
# prints: "no even numbers found"  — loop completed, no break`}</code></pre>

      <h3>Classic use case: search with fallback</h3>
      <pre><code>{`def find_prime_factor(n):
    for i in range(2, n):
        if n % i == 0:
            print(f"found factor: {i}")
            break
    else:
        print(f"{n} is prime")

find_prime_factor(12)   # found factor: 2
find_prime_factor(13)   # 13 is prime`}</code></pre>

      <h3>while...else</h3>
      <pre><code>{`# Same rule: else runs if loop ended without break
attempts = 0
while attempts < 3:
    pwd = input("Password: ")
    if pwd == "secret":
        print("access granted")
        break
    attempts += 1
else:
    print("too many failed attempts")`}</code></pre>

      <h2 id="match-case">match / case (Python 3.10+)</h2>

      <p>
        Python 3.10 introduced <em>structural pattern matching</em>. It is more powerful than
        a JavaScript switch — it can match on structure, types, and values simultaneously.
      </p>

      <h3>Basic value matching</h3>
      <pre><code>{`command = "quit"

match command:
    case "quit":
        print("quitting")
    case "help":
        print("showing help")
    case "start" | "run":    # OR pattern
        print("starting")
    case _:                  # default / wildcard
        print(f"unknown command: {command}")`}</code></pre>

      <h3>Matching on type and structure</h3>
      <pre><code>{`def process(event):
    match event:
        case {"type": "click", "x": x, "y": y}:
            print(f"click at {x}, {y}")
        case {"type": "keypress", "key": key}:
            print(f"key pressed: {key}")
        case {"type": str(t)}:
            print(f"unknown event type: {t}")
        case _:
            print("unrecognized event")`}</code></pre>

      <h3>Matching sequences</h3>
      <pre><code>{`def describe_list(lst):
    match lst:
        case []:
            return "empty"
        case [x]:
            return f"one item: {x}"
        case [x, y]:
            return f"two items: {x}, {y}"
        case [first, *rest]:
            return f"starts with {first}, {len(rest)} more"

describe_list([])           # "empty"
describe_list([1])          # "one item: 1"
describe_list([1, 2])       # "two items: 1, 2"
describe_list([1, 2, 3, 4]) # "starts with 1, 3 more"`}</code></pre>

      <h2 id="js-comparison">Python vs JavaScript Control Flow</h2>

      <pre><code>{`// JavaScript                         # Python

// if/else if/else
if (x > 0) { ... }                   if x > 0:
else if (x < 0) { ... }                  ...
else { ... }                         elif x < 0:
                                         ...
                                     else:
                                         ...

// Ternary
x > 0 ? "pos" : "neg"                "pos" if x > 0 else "neg"

// for loop
for (let i = 0; i < 5; i++) { ... }  for i in range(5):
                                         ...

// for...of (iterate values)
for (const x of arr) { ... }         for x in arr:
                                         ...

// for...in (iterate keys — keys in JS, items in Python!)
for (const k in obj) { ... }         for k in d:          # keys
                                     for k, v in d.items():  # pairs

// while
while (condition) { ... }            while condition:
                                         ...

// switch (no equivalent before 3.10)
switch (cmd) {                       match cmd:
  case "quit": ...                       case "quit": ...
  default: ...                           case _: ...
}

// break / continue
break;                               break
continue;                            continue

// No loop else in JavaScript        for/while ... else: ...`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. How does <code>range()</code> work?</h3>
      <p>
        <code>range(stop)</code>, <code>range(start, stop)</code>, or{" "}
        <code>range(start, stop, step)</code>. Returns a lazy range object (not a list) that
        generates integers on demand. Memory-efficient regardless of size.{" "}
        <code>range(10)</code> produces 0–9. Stop is always exclusive. Negative step creates
        a countdown: <code>range(5, 0, -1)</code> → 5, 4, 3, 2, 1.
      </p>

      <h3>2. What is <code>enumerate()</code> used for?</h3>
      <p>
        When you need both index and value in a loop. <code>enumerate(iterable)</code> yields
        <code>(index, value)</code> pairs. More Pythonic than <code>range(len(...))</code>.
        Accepts an optional <code>start</code> parameter to set the starting index.
      </p>

      <h3>3. What is the difference between <code>break</code> and <code>continue</code>?</h3>
      <p>
        <code>break</code> exits the loop entirely — no more iterations. <code>continue</code>{" "}
        skips the rest of the current iteration and moves to the next one. Both only affect
        the innermost enclosing loop. To escape nested loops, use a function with{" "}
        <code>return</code>, or a flag variable.
      </p>

      <h3>4. Does Python have switch/case?</h3>
      <p>
        Python 3.10+ has <code>match/case</code> (structural pattern matching). It is more
        powerful than a switch — it can match on data types, values, sequence structure, and
        dict shape simultaneously. Before Python 3.10, the idiomatic alternative was a dict
        dispatch or if/elif/else chain.
      </p>

      <h3>5. What is loop <code>else</code> in Python?</h3>
      <p>
        The <code>else</code> block on a <code>for</code> or <code>while</code> loop runs
        only if the loop finished <em>without</em> hitting a <code>break</code>. If{" "}
        <code>break</code> fires, the <code>else</code> is skipped. Classic use case: search
        loops where you want a &quot;not found&quot; path without a boolean flag variable.
      </p>

      <h3>6. What does <code>zip()</code> do when iterables have different lengths?</h3>
      <p>
        It stops at the shortest one — extra elements from longer iterables are silently
        dropped. Use <code>itertools.zip_longest(fillvalue=...)</code> to keep all elements
        and fill missing values with a default.
      </p>

      <h3>7. How do you iterate a dict and get both key and value?</h3>
      <p>
        Use <code>dict.items()</code>: <code>for key, value in d.items()</code>. Iterating
        a dict directly gives keys only. <code>dict.values()</code> gives values only.
        All three (<code>keys()</code>, <code>values()</code>, <code>items()</code>) return
        view objects that reflect live changes to the dict.
      </p>

      <h3>8. What is the <code>_</code> variable convention in loops?</h3>
      <p>
        Underscore is a valid Python identifier conventionally used to signal that a variable
        is intentionally unused. In <code>for _ in range(5)</code>, the loop count variable
        is irrelevant. Also used in tuple unpacking: <code>_, value = (0, 42)</code>.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — FizzBuzz</h3>
      <p>
        Classic. Print numbers 1–100. For multiples of 3 print <code>Fizz</code>, multiples
        of 5 print <code>Buzz</code>, multiples of both print <code>FizzBuzz</code>.
        Write it two ways: with if/elif/else, and with a ternary expression chain.
      </p>

      <h3>Exercise 2 — Loop else: search</h3>
      <p>
        Write <code>find_first_negative(nums: list) -&gt; int</code> that returns the first
        negative number or prints &quot;none found&quot; using loop <code>else</code> (not a
        flag variable).
      </p>

      <h3>Exercise 3 — enumerate usage</h3>
      <p>
        Given a list of strings, print each item with its 1-based position:
        <code>1. apple</code>, <code>2. banana</code>, etc. Use <code>enumerate</code> with{" "}
        <code>start=1</code>.
      </p>

      <h3>Exercise 4 — zip to merge</h3>
      <p>
        Given two lists of equal length — one of student names, one of their scores — use{" "}
        <code>zip</code> to build a dict mapping name → score. Then print each name and
        whether they passed (score &gt;= 60).
      </p>

      <h3>Exercise 5 — range countdown</h3>
      <p>
        Using <code>range</code> with a negative step, print a countdown from 10 to 1 on a
        single line separated by spaces. Then print &quot;Liftoff!&quot;.
      </p>

      <h3>Exercise 6 — while with retry</h3>
      <p>
        Simulate a login system: give the user 3 attempts to enter the password
        <code>&quot;secret123&quot;</code>. If they succeed, print &quot;Welcome!&quot;.
        If they fail all 3, print &quot;Account locked.&quot;. Use <code>while</code> and{" "}
        <code>break</code> with loop <code>else</code>.
      </p>

      <h3>Exercise 7 — Nested loop with break</h3>
      <p>
        Given a 2D list (matrix), write a function that finds the first occurrence of a
        target value and returns its <code>(row, col)</code> coordinates. Return{" "}
        <code>None</code> if not found. Use a <code>return</code> to escape the nested loops
        cleanly.
      </p>

      <h3>Mini Challenge — Inventory Aggregator</h3>
      <p>
        You have two parallel lists:
      </p>
      <pre><code>{`items  = ["apple", "banana", "apple", "cherry", "banana", "apple"]
prices = [1.0,     0.5,      1.0,     2.0,       0.5,      1.0]`}</code></pre>
      <p>Using a loop and a dict, build a summary that maps each item to:</p>
      <ul>
        <li>total quantity</li>
        <li>total cost</li>
      </ul>
      <pre><code>{`# expected output:
# {
#   "apple":  {"qty": 3, "total": 3.0},
#   "banana": {"qty": 2, "total": 1.0},
#   "cherry": {"qty": 1, "total": 2.0},
# }`}</code></pre>
      <p>
        Constraint: use <code>zip</code> to pair the two lists. Do not use{" "}
        <code>collections.Counter</code> or <code>defaultdict</code> — those come later.
      </p>
    </div>
  );
}
