import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-pythonic", title: "What Does Pythonic Mean?", level: 2 },
  { id: "list-comprehensions", title: "List Comprehensions", level: 2 },
  { id: "dict-comprehensions", title: "Dict Comprehensions", level: 2 },
  { id: "set-comprehensions", title: "Set Comprehensions", level: 2 },
  { id: "generator-expressions", title: "Generator Expressions", level: 2 },
  { id: "useful-builtins", title: "Useful Built-ins", level: 2 },
  { id: "pep8", title: "PEP 8 Basics", level: 2 },
  { id: "when-not-to", title: "When Not to Use Comprehensions", level: 2 },
  { id: "refactoring-examples", title: "Before / After Refactoring", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function PythonicCodeAndComprehensions() {
  return (
    <div className="article-content">
      <p>
        Writing code that works is baseline. Writing <em>Pythonic</em> code means using the
        language&apos;s idioms so your code is readable, concise, and efficient. Comprehensions
        are the centerpiece of this — and they come up constantly in interviews, both as syntax
        questions and as refactoring exercises.
      </p>

      <h2 id="what-is-pythonic">What Does Pythonic Mean?</h2>

      <p>
        &quot;Pythonic&quot; code follows the conventions and idioms of the Python community,
        expressed most formally in PEP 8 (style guide) and the Zen of Python.
      </p>

      <pre><code>{`import this   # prints the Zen of Python in the REPL

# Key principles relevant to interviews:
# - Beautiful is better than ugly.
# - Explicit is better than implicit.
# - Simple is better than complex.
# - Readability counts.
# - There should be one obvious way to do it.`}</code></pre>

      <p>
        In practice, Pythonic code means: prefer comprehensions over loops for transformations,
        use built-ins instead of manual loops, leverage unpacking, avoid C-style index loops,
        and write expressive names in <code>snake_case</code>.
      </p>

      <h2 id="list-comprehensions">List Comprehensions</h2>

      <p>
        Syntax: <code>[expression for item in iterable if condition]</code>
      </p>
      <p>
        The <code>if condition</code> part is optional. The expression is evaluated for each
        item that passes the filter.
      </p>

      <h3>Basic transformation</h3>
      <pre><code>{`# Un-Pythonic
squares = []
for x in range(10):
    squares.append(x ** 2)

# Pythonic
squares = [x ** 2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]`}</code></pre>

      <h3>With filter</h3>
      <pre><code>{`# Un-Pythonic
evens = []
for x in range(20):
    if x % 2 == 0:
        evens.append(x)

# Pythonic
evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]`}</code></pre>

      <h3>Transformation + filter</h3>
      <pre><code>{`names = ["alice", "bob", "carol", "dave", "ed"]

# Names longer than 3 chars, title-cased
result = [n.title() for n in names if len(n) > 3]
# ["Alice", "Carol", "Dave"]`}</code></pre>

      <h3>Nested comprehensions</h3>
      <pre><code>{`# Flatten a 2D matrix
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [val for row in matrix for val in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Read as: for each row, for each val in that row, take val

# Cartesian product
pairs = [(x, y) for x in range(3) for y in range(3) if x != y]
# [(0,1),(0,2),(1,0),(1,2),(2,0),(2,1)]`}</code></pre>

      <h3>Comprehension with ternary (transform, not filter)</h3>
      <pre><code>{`# Use if/else in the EXPRESSION (before for) for transform
labels = ["even" if x % 2 == 0 else "odd" for x in range(6)]
# ["even", "odd", "even", "odd", "even", "odd"]

# This is different from the filter position (after for):
# [expr for x in iterable if condition]   ← filter — excludes items
# [a if cond else b for x in iterable]    ← transform — keeps all items`}</code></pre>

      <h2 id="dict-comprehensions">Dict Comprehensions</h2>

      <p>
        Syntax: <code>{"{key_expr: val_expr for item in iterable if condition}"}</code>
      </p>

      <pre><code>{`# Squares dict
squares = {x: x**2 for x in range(6)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16, 5: 25}

# Invert a dict
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
# {1: "a", 2: "b", 3: "c"}

# Filter + transform
users = [
    {"name": "Alice", "active": True},
    {"name": "Bob", "active": False},
    {"name": "Carol", "active": True},
]
active_users = {u["name"]: u for u in users if u["active"]}
# {"Alice": {...}, "Carol": {...}}

# Normalize string keys
raw = {"Name": "Juan", "AGE": 30, "Email": "j@ex.com"}
normalized = {k.lower(): v for k, v in raw.items()}
# {"name": "Juan", "age": 30, "email": "j@ex.com"}`}</code></pre>

      <h2 id="set-comprehensions">Set Comprehensions</h2>

      <p>
        Syntax: <code>{"{expression for item in iterable if condition}"}</code>
      </p>
      <p>
        Like a list comprehension but produces a set — automatically deduplicates.
      </p>

      <pre><code>{`# All unique first letters
words = ["apple", "banana", "avocado", "cherry", "blueberry"]
first_letters = {w[0] for w in words}
# {"a", "b", "c"}  — order not guaranteed

# Unique lengths
lengths = {len(w) for w in words}
# {5, 6, 7, 9}

# Words longer than 5 chars, unique
long_words = {w for w in words if len(w) > 5}
# {"banana", "avocado", "cherry", "blueberry"}`}</code></pre>

      <h2 id="generator-expressions">Generator Expressions</h2>

      <p>
        Syntax: <code>(expression for item in iterable if condition)</code> — parentheses
        instead of brackets.
      </p>
      <p>
        A generator expression is <strong>lazy</strong> — it produces values one at a time
        on demand rather than building the entire result in memory. Use it when you only need
        to iterate once and do not need to store the results.
      </p>

      <pre><code>{`# List comprehension — builds entire list in memory immediately
squares_list = [x**2 for x in range(1_000_000)]   # allocates ~8MB

# Generator expression — lazy, no immediate allocation
squares_gen = (x**2 for x in range(1_000_000))    # almost no memory

# Consume it:
next(squares_gen)           # 0
next(squares_gen)           # 1
list(squares_gen)           # rest: [4, 9, 16, ...]
# generators are exhausted after one pass`}</code></pre>

      <h3>Generator expressions with built-ins</h3>
      <pre><code>{`# sum/min/max/any/all accept any iterable — pass a generator directly
total = sum(x**2 for x in range(100))          # no extra list
maximum = max(len(w) for w in words)           # no extra list
has_admin = any(u["role"] == "admin" for u in users)

# When passing a generator as the sole argument to a function,
# the outer parens can be omitted — one set of parens is enough:
sum(x**2 for x in range(100))   # OK — not sum((x**2 for x in range(100)))`}</code></pre>

      <h3>Generator vs list comprehension — when to choose</h3>
      <pre><code>{`# Use list comprehension when:
# - You need to index into the result: result[0]
# - You need len(result)
# - You iterate more than once
# - You need to pass it to something that requires a list

# Use generator expression when:
# - You only iterate once (sum, any, all, for loop)
# - The dataset is large
# - You want memory efficiency`}</code></pre>

      <h2 id="useful-builtins">Useful Built-ins</h2>

      <p>
        These built-ins work with any iterable and pair perfectly with comprehensions and
        generator expressions.
      </p>

      <h3>any() and all()</h3>
      <pre><code>{`# any — True if at least one element is truthy
any([False, False, True])   # True
any([False, False, False])  # False
any([])                     # False  (vacuously false)

# all — True if all elements are truthy
all([True, True, True])     # True
all([True, False, True])    # False
all([])                     # True   (vacuously true — edge case!)

# With generators
nums = [2, 4, 6, 8]
all(n % 2 == 0 for n in nums)     # True — all even
any(n > 5 for n in nums)          # True — 6 and 8 are > 5

users = [{"name": "Alice", "admin": False}, {"name": "Bob", "admin": True}]
has_admin = any(u["admin"] for u in users)    # True`}</code></pre>

      <h3>sum(), min(), max()</h3>
      <pre><code>{`nums = [3, 1, 4, 1, 5, 9, 2, 6]

sum(nums)                  # 31
min(nums)                  # 1
max(nums)                  # 9
sum(nums) / len(nums)      # average: 3.875

# With key functions
words = ["banana", "fig", "apple", "kiwi"]
min(words)              # "apple"  (alphabetical)
max(words, key=len)     # "banana" (longest)
min(words, key=len)     # "fig"    (shortest)

# sum with start value
sum([[1,2],[3,4],[5,6]], [])  # [1,2,3,4,5,6]  — flattens (don't do this at scale)`}</code></pre>

      <h3>sorted()</h3>
      <pre><code>{`nums = [3, 1, 4, 1, 5, 9]

sorted(nums)                    # [1, 1, 3, 4, 5, 9]  — new list
sorted(nums, reverse=True)      # [9, 5, 4, 3, 1, 1]
nums.sort()                     # in-place, returns None

# Custom sort key
people = [
    {"name": "Charlie", "age": 30},
    {"name": "Alice", "age": 25},
    {"name": "Bob", "age": 35},
]
sorted(people, key=lambda p: p["age"])           # by age ascending
sorted(people, key=lambda p: p["name"])          # alphabetical
sorted(people, key=lambda p: -p["age"])          # by age descending
sorted(people, key=lambda p: (p["age"], p["name"]))  # multi-key sort

# Stable sort — Python's sort is stable (Timsort)
# Equal elements preserve their original order`}</code></pre>

      <h3>map() and filter()</h3>
      <pre><code>{`# map — apply function to each element, returns iterator
list(map(str.upper, ["a", "b", "c"]))   # ["A", "B", "C"]
list(map(lambda x: x * 2, [1, 2, 3]))  # [2, 4, 6]

# filter — keep elements where function returns True
list(filter(None, [0, 1, "", "hi", False, True]))  # [1, "hi", True]
list(filter(lambda x: x > 2, [1, 2, 3, 4]))       # [3, 4]

# Comprehensions are usually preferred over map/filter
[x.upper() for x in ["a", "b", "c"]]     # clearer than map
[x for x in [1, 2, 3, 4] if x > 2]      # clearer than filter`}</code></pre>

      <h2 id="pep8">PEP 8 Basics</h2>

      <p>
        PEP 8 is Python&apos;s official style guide. Interviewers notice PEP 8 violations.
        Key rules:
      </p>

      <pre><code>{`# Naming
user_name = "Juan"         # variables: snake_case
MAX_SIZE = 100             # constants: UPPER_SNAKE_CASE
class UserProfile:         # classes: PascalCase
def get_user_by_id():      # functions: snake_case
_private = True            # private (convention): leading underscore

# Spacing
x = 1                      # spaces around =
x += 1                     # spaces around augmented assignment
if x == 1:                 # spaces around comparison operators
def fn(a, b=1):            # no spaces around default param = in signature
fn(a, b=1)                 # no spaces around keyword arg =

# Line length
# Max 79 chars for code, 72 for docstrings (some teams use 88 or 99)

# Imports — one per line, grouped: stdlib, third-party, local
import os
import sys

import requests
import fastapi

from myapp import models

# Blank lines
# 2 blank lines between top-level definitions
# 1 blank line between methods in a class

# Whitespace in expressions
spam(ham[1], {eggs: 2})    # no space before (
spam(ham[1], {eggs: 2})    # no space inside [] {}
x = y + 1                  # spaces around binary operators`}</code></pre>

      <h2 id="when-not-to">When Not to Use Comprehensions</h2>

      <pre><code>{`# 1. Side effects — use a regular loop
# Bad
[print(x) for x in items]   # comprehension for side effects — confusing

# Good
for x in items:
    print(x)

# 2. Complex logic — readability drops fast
# Bad (hard to read at a glance)
result = [
    transform(x)
    for x in (item for item in source if item.valid)
    if transform(x).score > threshold
]

# Good — split it up
valid_items = [item for item in source if item.valid]
candidates = [transform(x) for x in valid_items]
result = [c for c in candidates if c.score > threshold]

# 3. Deeply nested comprehensions
# Flat comprehensions are fine. More than 2 levels = use a loop.

# 4. When you need early exit — generators help but a loop is clearer

# 5. When you need the result more than once
# Generator expressions exhaust — if you need to reuse, use a list`}</code></pre>

      <h2 id="refactoring-examples">Before / After Refactoring</h2>

      <h3>Example 1 — Filter and transform</h3>
      <pre><code>{`# Before
result = []
for user in users:
    if user["active"]:
        result.append(user["name"].upper())

# After
result = [u["name"].upper() for u in users if u["active"]]`}</code></pre>

      <h3>Example 2 — Build index dict</h3>
      <pre><code>{`# Before
user_by_id = {}
for user in users:
    user_by_id[user["id"]] = user

# After
user_by_id = {u["id"]: u for u in users}`}</code></pre>

      <h3>Example 3 — Aggregate with any/all</h3>
      <pre><code>{`# Before
has_error = False
for item in results:
    if item["status"] == "error":
        has_error = True
        break

# After
has_error = any(item["status"] == "error" for item in results)`}</code></pre>

      <h3>Example 4 — Deduplication with set</h3>
      <pre><code>{`# Before
seen = []
unique = []
for tag in tags:
    if tag not in seen:
        seen.append(tag)
        unique.append(tag)

# After (order-preserving via dict in Python 3.7+)
unique = list(dict.fromkeys(tags))
# or if order doesn't matter:
unique = list(set(tags))`}</code></pre>

      <h3>Example 5 — String building</h3>
      <pre><code>{`# Before — O(n²) due to string concatenation
result = ""
for word in words:
    result += word + ", "
result = result[:-2]  # remove trailing ", "

# After — O(n) with join
result = ", ".join(words)`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is a list comprehension?</h3>
      <p>
        A concise, readable syntax for building a list by iterating over an iterable with
        an optional filter condition. Syntax:{" "}
        <code>[expression for item in iterable if condition]</code>. Generally faster than an
        equivalent <code>for</code> loop with <code>append</code> because the loop is
        implemented in C internally.
      </p>

      <h3>2. What is the difference between a list comprehension and a generator expression?</h3>
      <p>
        A list comprehension (<code>[...]</code>) evaluates eagerly — builds the entire list
        in memory immediately. A generator expression (<code>(...)</code>) evaluates lazily —
        yields one value at a time on demand, using almost no memory. Use generators when
        iterating once over large datasets or passing directly to <code>sum</code>,{" "}
        <code>any</code>, <code>all</code>, etc.
      </p>

      <h3>3. What does <code>any([])</code> return and why?</h3>
      <p>
        <code>False</code>. With no elements, there is no truthy element, so{" "}
        <code>any</code> returns <code>False</code> (vacuously false). Conversely,{" "}
        <code>all([])</code> returns <code>True</code> (vacuously true — there is no element
        that fails the condition). This is mathematically correct but catches people off guard.
      </p>

      <h3>4. What is the difference between <code>sorted()</code> and <code>list.sort()</code>?</h3>
      <p>
        <code>sorted(iterable)</code> returns a new sorted list and works on any iterable.{" "}
        <code>list.sort()</code> sorts in place and returns <code>None</code> — a common
        mistake is assigning the result: <code>result = my_list.sort()</code> gives{" "}
        <code>None</code>. Both accept <code>key=</code> and <code>reverse=</code>.
        Python&apos;s sort algorithm is Timsort — stable, O(n log n).
      </p>

      <h3>5. When should you use <code>map()</code>/<code>filter()</code> vs comprehensions?</h3>
      <p>
        Comprehensions are preferred in most Python code — they are more readable and
        explicit. <code>map</code>/<code>filter</code> are useful when passing an existing
        named function (e.g. <code>map(str.upper, items)</code>) which avoids an extra
        lambda. Both return iterators in Python 3, so wrap with <code>list()</code> if you
        need a list.
      </p>

      <h3>6. What is a dict comprehension used for?</h3>
      <p>
        Building a dict from an iterable in one expression. Common use cases: indexing a
        list of objects by a key (<code>{"{u['id']: u for u in users}"}</code>), inverting a
        dict, normalizing keys, or filtering a dict to a subset of keys.
      </p>

      <h3>7. Can you have nested comprehensions?</h3>
      <p>
        Yes. <code>[val for row in matrix for val in row]</code> flattens a 2D list. The
        order of <code>for</code> clauses mirrors the equivalent nested loops (outer first).
        Beyond two levels, a regular loop is clearer. Never use comprehensions purely for
        side effects.
      </p>

      <h3>8. What is <code>filter(None, iterable)</code>?</h3>
      <p>
        Passing <code>None</code> as the function to <code>filter</code> uses Python&apos;s
        truthiness directly — it keeps all truthy elements and removes falsy ones (
        <code>0</code>, <code>""</code>, <code>None</code>, <code>[]</code>, etc.). Equivalent
        to <code>[x for x in iterable if x]</code>.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Transform and filter</h3>
      <p>
        Given a list of product dicts with <code>name</code>, <code>price</code>, and{" "}
        <code>in_stock</code>, write a single list comprehension that returns the names of
        all in-stock products priced under 50, title-cased.
      </p>

      <h3>Exercise 2 — Dict inversion</h3>
      <p>
        Write a function <code>invert_dict(d: dict) -&gt; dict</code> using a dict
        comprehension. Handle the case where values might not be unique by mapping each value
        to a list of keys.
      </p>

      <h3>Exercise 3 — Generator sum</h3>
      <p>
        Without building an intermediate list, compute the sum of squares of all odd numbers
        from 1 to 999 using a generator expression.
      </p>

      <h3>Exercise 4 — any/all audit</h3>
      <p>
        Given a list of order dicts with <code>status</code> field, write:
      </p>
      <ul>
        <li><code>all_shipped(orders)</code> — returns <code>True</code> if all orders have <code>status == "shipped"</code></li>
        <li><code>any_pending(orders)</code> — returns <code>True</code> if any order has <code>status == "pending"</code></li>
      </ul>
      <p>Use <code>all()</code> and <code>any()</code> with generator expressions.</p>

      <h3>Exercise 5 — Multi-key sort</h3>
      <p>
        Sort a list of employee dicts by <code>department</code> ascending, then by{" "}
        <code>salary</code> descending within the same department. Use a single{" "}
        <code>sorted()</code> call with a tuple key.
      </p>

      <h3>Exercise 6 — Flatten and deduplicate</h3>
      <p>
        Given a list of lists of tags (strings), produce a single sorted list of unique tags.
        Use a set comprehension and <code>sorted()</code>.
      </p>
      <pre><code>{`tag_groups = [["python", "backend"], ["python", "api"], ["testing", "backend"]]
# expected: ["api", "backend", "python", "testing"]`}</code></pre>

      <h3>Exercise 7 — String join vs concatenation</h3>
      <p>
        Write two versions of a function that builds a CSV row from a list of values: one
        using <code>+=</code> string concatenation, one using <code>",".join()</code>.
        Explain the time complexity difference.
      </p>

      <h3>Mini Challenge — Refactoring</h3>
      <p>
        Rewrite the following function using comprehensions and Pythonic built-ins. Do not
        change the return value — only the implementation.
      </p>
      <pre><code>{`def process_orders(orders):
    # orders: list of dicts with "amount", "status", "customer"

    completed = []
    for order in orders:
        if order["status"] == "completed":
            completed.append(order)

    totals = {}
    for order in completed:
        customer = order["customer"]
        if customer not in totals:
            totals[customer] = 0
        totals[customer] += order["amount"]

    sorted_customers = []
    for customer in totals:
        sorted_customers.append(customer)
    sorted_customers.sort(key=lambda c: totals[c], reverse=True)

    result = []
    for customer in sorted_customers:
        result.append(f"{customer}: \${totals[customer]:.2f}")

    return result`}</code></pre>
    </div>
  );
}
