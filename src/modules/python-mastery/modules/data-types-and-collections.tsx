import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "primitive-types", title: "Primitive Types", level: 2 },
  { id: "lists", title: "Lists", level: 2 },
  { id: "tuples", title: "Tuples", level: 2 },
  { id: "sets", title: "Sets", level: 2 },
  { id: "dictionaries", title: "Dictionaries", level: 2 },
  { id: "mutability", title: "Mutability vs Immutability", level: 2 },
  { id: "copying", title: "References, Shallow Copy, Deep Copy", level: 2 },
  { id: "slicing", title: "Slicing", level: 2 },
  { id: "string-operations", title: "String Operations", level: 2 },
  { id: "truthy-falsy", title: "Truthy and Falsy Values", level: 2 },
  { id: "js-comparison", title: "Python Collections vs JavaScript", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function DataTypesAndCollections() {
  return (
    <div className="article-content">
      <p>
        Data types are where Python interviews live or die. Questions about{" "}
        <code>list</code> vs <code>tuple</code>, mutability, shallow copy, and dict behavior
        come up constantly. This module builds a precise mental model of how Python&apos;s core
        types work — including the parts that trip up experienced engineers.
      </p>

      <h2 id="primitive-types">Primitive Types</h2>

      <h3>int</h3>
      <pre><code>{`x = 42
y = -7
big = 10_000_000   # underscores allowed for readability

# Python ints are arbitrary precision — no overflow
print(2 ** 100)    # works fine

# Type check
print(type(42))         # <class 'int'>
print(isinstance(42, int))  # True`}</code></pre>

      <h3>float</h3>
      <pre><code>{`x = 3.14
y = 1.0e-4    # scientific notation

# Floating point imprecision — same as every language
print(0.1 + 0.2)   # 0.30000000000000004

# Use decimal for precise arithmetic
from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2"))  # 0.3`}</code></pre>

      <h3>bool</h3>
      <pre><code>{`# bool is a subclass of int in Python
print(True + True)   # 2
print(True * 5)      # 5
print(int(False))    # 0
print(int(True))     # 1

# bool literals are capitalized (common mistake for JS devs)
active = True   # not true
flag = False    # not false`}</code></pre>

      <h3>str</h3>
      <pre><code>{`name = "Juan"
name = 'Juan'    # single or double quotes — both valid
name = """Juan   # triple quotes for multi-line strings
Felipe"""

# Strings are immutable sequences of Unicode characters
greeting = "hello"
# greeting[0] = "H"  # TypeError: 'str' object does not support item assignment

# f-strings (Python 3.6+) — preferred way to interpolate
age = 30
msg = f"Name: {name}, Age: {age}"
msg = f"Result: {2 + 2}"        # expressions work
msg = f"{name.upper()!r}"       # method calls and conversions`}</code></pre>

      <h3>None</h3>
      <pre><code>{`result = None
print(type(None))   # <class 'NoneType'>

# None is a singleton — always use "is" for comparison
if result is None:
    print("no value")

if result is not None:
    print("has value")

# Never use == None — it works but is un-Pythonic and can be wrong
# with custom __eq__ implementations`}</code></pre>

      <h2 id="lists">Lists</h2>

      <p>
        A <code>list</code> is an ordered, mutable sequence of any objects. It is Python&apos;s
        most versatile collection — equivalent to a JavaScript array, but more flexible.
      </p>

      <pre><code>{`# Creation
nums = [1, 2, 3]
mixed = [1, "hello", True, None, [2, 3]]  # any types

# Access
nums[0]    # 1
nums[-1]   # 3  (negative index from end)
nums[-2]   # 2

# Mutation
nums.append(4)       # [1, 2, 3, 4]
nums.insert(0, 0)    # [0, 1, 2, 3, 4]
nums.pop()           # removes and returns last: 4
nums.pop(0)          # removes and returns index 0: 0
nums.remove(2)       # removes first occurrence of value 2
del nums[1]          # delete by index

# Length
len(nums)   # number of elements

# Membership
3 in nums    # True
9 in nums    # False
9 not in nums  # True

# Sorting
nums.sort()             # in-place, returns None
sorted(nums)            # returns new sorted list
nums.sort(reverse=True) # descending
sorted(words, key=str.lower)  # custom sort key

# Common methods
nums.extend([10, 11])   # append multiple
nums.index(2)           # index of first occurrence of 2
nums.count(2)           # how many times 2 appears
nums.reverse()          # reverse in-place
nums.copy()             # shallow copy`}</code></pre>

      <h2 id="tuples">Tuples</h2>

      <p>
        A <code>tuple</code> is an ordered, <strong>immutable</strong> sequence. Once created,
        you cannot add, remove, or change elements. This is the key difference from a list.
      </p>

      <pre><code>{`# Creation
point = (1, 2)
single = (42,)    # trailing comma required for single-element tuple
empty = ()

# Parentheses are optional — the comma makes it a tuple
point = 1, 2      # same as (1, 2)
a, b = point      # tuple unpacking

# Access (same as list)
point[0]    # 1
point[-1]   # 2

# Immutable — this raises TypeError
# point[0] = 99  # TypeError: 'tuple' object does not support item assignment

# Membership
1 in point    # True

# Tuples are hashable (if all elements are hashable) — can be dict keys or set members
coords = {(0, 0): "origin", (1, 0): "right"}

# Tuple unpacking
x, y = (10, 20)
first, *rest = (1, 2, 3, 4)  # first=1, rest=[2, 3, 4]
a, b, c = "xyz"              # works on any iterable`}</code></pre>

      <h3>When to use tuple vs list?</h3>
      <ul>
        <li>
          Use <strong>tuple</strong> for fixed collections of heterogeneous data (a point, a
          record, a return value of multiple items). The immutability signals intent.
        </li>
        <li>
          Use <strong>list</strong> for homogeneous sequences that will grow or change.
        </li>
        <li>
          Tuples are slightly more memory-efficient and can be used as dict keys or set members.
          Lists cannot.
        </li>
      </ul>

      <h2 id="sets">Sets</h2>

      <p>
        A <code>set</code> is an unordered collection of <strong>unique, hashable</strong>{" "}
        elements. No duplicates, no guaranteed order, O(1) membership testing.
      </p>

      <pre><code>{`# Creation
tags = {"python", "backend", "api"}
empty = set()   # NOT {} — that creates an empty dict

# From iterable (deduplication)
nums = set([1, 2, 2, 3, 3, 3])   # {1, 2, 3}

# Mutation
tags.add("testing")
tags.discard("api")    # remove if present, no error if missing
tags.remove("api")     # remove — raises KeyError if missing

# Membership — O(1) average
"python" in tags    # True

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

a | b    # union: {1, 2, 3, 4, 5, 6}
a & b    # intersection: {3, 4}
a - b    # difference: {1, 2}
a ^ b    # symmetric difference: {1, 2, 5, 6}

a.issubset(b)     # is a ⊆ b?
a.issuperset(b)   # is a ⊇ b?`}</code></pre>

      <h3>frozenset</h3>
      <pre><code>{`# Immutable set — can be used as dict key or set member
fs = frozenset([1, 2, 3])
# fs.add(4)  # AttributeError`}</code></pre>

      <h2 id="dictionaries">Dictionaries</h2>

      <p>
        A <code>dict</code> is an ordered (Python 3.7+) mapping of unique, hashable keys to
        values. It is Python&apos;s primary hash map structure.
      </p>

      <pre><code>{`# Creation
user = {"name": "Juan", "age": 30, "active": True}
empty = {}

# Access
user["name"]          # "Juan" — KeyError if missing
user.get("name")      # "Juan" — None if missing
user.get("email", "")  # "" — default if missing

# Mutation
user["email"] = "juan@example.com"  # add or update
del user["active"]                  # delete key

# Membership (checks keys only)
"name" in user    # True
"Juan" in user    # False

# Iteration
for key in user:              # iterate keys
    print(key)

for value in user.values():   # iterate values
    print(value)

for key, value in user.items():   # iterate pairs
    print(key, value)

# Common methods
user.keys()     # dict_keys view
user.values()   # dict_values view
user.items()    # dict_items view
user.pop("age")           # remove and return value
user.update({"role": "admin"})  # merge another dict

# Dict merge (Python 3.9+)
merged = user | {"role": "admin"}

# setdefault — set key if missing, return value
user.setdefault("score", 0)   # sets score=0 if not present`}</code></pre>

      <h3>Dict comprehensions</h3>
      <pre><code>{`squares = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

inverted = {v: k for k, v in user.items()}`}</code></pre>

      <h2 id="mutability">Mutability vs Immutability</h2>

      <p>
        This is the most important conceptual distinction in Python — and the most common source
        of bugs for developers new to the language.
      </p>

      <ArticleTable caption="The most common Python bugs in this topic come from forgetting which values can be mutated in place and which ones create a brand-new object." minWidth={640}>
        <table>
          <thead>
            <tr>
              <th>Immutable</th>
              <th>Mutable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>int</code>, <code>float</code>, <code>bool</code></td>
              <td><code>list</code></td>
            </tr>
            <tr>
              <td><code>str</code></td>
              <td><code>dict</code></td>
            </tr>
            <tr>
              <td><code>tuple</code></td>
              <td><code>set</code></td>
            </tr>
            <tr>
              <td><code>frozenset</code></td>
              <td>most user-defined objects</td>
            </tr>
            <tr>
              <td><code>None</code></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        Immutable means the object&apos;s value cannot change after creation. When you do{" "}
        <code>x = x + 1</code>, you are not modifying the integer — you are creating a new
        integer object and rebinding the name <code>x</code> to it.
      </p>

      <pre><code>{`# Integers are immutable
x = 10
y = x
x += 1
print(x)  # 11
print(y)  # 10 — y still points to the original 10

# Lists are mutable
a = [1, 2, 3]
b = a           # b and a point to the SAME list
b.append(4)
print(a)  # [1, 2, 3, 4] — a is affected!
print(b)  # [1, 2, 3, 4]`}</code></pre>

      <h2 id="copying">References, Shallow Copy, Deep Copy</h2>

      <p>
        In Python, assignment copies a <em>reference</em>, not the value. For mutable objects,
        this means multiple names can point to the same object.
      </p>

      <h3>Reference (assignment)</h3>
      <pre><code>{`a = [1, 2, 3]
b = a        # both point to same list object
b[0] = 99
print(a)     # [99, 2, 3]  — same object!`}</code></pre>

      <h3>Shallow copy</h3>
      <p>
        Creates a new container but does not recursively copy nested objects — nested objects
        are still shared references.
      </p>
      <pre><code>{`import copy

a = [[1, 2], [3, 4]]
b = a.copy()         # shallow copy
# also: b = list(a) or b = a[:]

b.append([5, 6])
print(a)  # [[1, 2], [3, 4]] — outer list unchanged

b[0].append(99)
print(a)  # [[1, 2, 99], [3, 4]] — inner list IS shared!
print(b)  # [[1, 2, 99], [3, 4], [5, 6]]`}</code></pre>

      <h3>Deep copy</h3>
      <p>
        Recursively copies all nested objects. Fully independent from the original.
      </p>
      <pre><code>{`import copy

a = [[1, 2], [3, 4]]
b = copy.deepcopy(a)

b[0].append(99)
print(a)  # [[1, 2], [3, 4]] — completely independent
print(b)  # [[1, 2, 99], [3, 4]]`}</code></pre>

      <h2 id="slicing">Slicing</h2>

      <p>
        Slicing creates a new list/string/tuple from a subset. Syntax:{" "}
        <code>sequence[start:stop:step]</code>. The <code>stop</code> index is exclusive.
      </p>

      <pre><code>{`nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

nums[2:5]    # [2, 3, 4]      start=2, stop=5 (exclusive)
nums[:3]     # [0, 1, 2]      start defaults to 0
nums[7:]     # [7, 8, 9]      stop defaults to end
nums[:]      # [0, 1, 2, ..., 9]  full copy (shallow)
nums[::2]    # [0, 2, 4, 6, 8]   every other element
nums[::-1]   # [9, 8, 7, ..., 0] reversed

# Negative indices
nums[-3:]    # [7, 8, 9]
nums[:-2]    # [0, 1, 2, 3, 4, 5, 6, 7]

# Works on strings too
s = "hello"
s[1:4]      # "ell"
s[::-1]     # "olleh"  (common interview trick)

# Slicing never raises IndexError
nums[100:200]   # [] — safe, returns empty`}</code></pre>

      <h2 id="string-operations">String Operations</h2>

      <p>Strings are immutable sequences. All string methods return new strings.</p>

      <pre><code>{`s = "  Hello, World!  "

# Case
s.upper()          # "  HELLO, WORLD!  "
s.lower()          # "  hello, world!  "
s.title()          # "  Hello, World!  "
s.capitalize()     # first char upper, rest lower

# Whitespace
s.strip()          # "Hello, World!"   both sides
s.lstrip()         # "Hello, World!  " left only
s.rstrip()         # "  Hello, World!" right only

# Search
s.find("World")    # index of first match, -1 if missing
s.index("World")   # like find, but raises ValueError if missing
s.count("l")       # count occurrences
"World" in s       # True — membership test

# Replace / split
s.replace("World", "Python")
parts = "a,b,c".split(",")    # ["a", "b", "c"]
",".join(["a", "b", "c"])     # "a,b,c"

# Predicates
"123".isdigit()       # True
"abc".isalpha()       # True
"abc123".isalnum()    # True
"  ".isspace()        # True
"hello".startswith("he")   # True
"hello".endswith("lo")     # True

# Padding
"42".zfill(5)            # "00042"
"hi".ljust(10, "-")      # "hi--------"
"hi".rjust(10, "-")      # "--------hi"
"hi".center(10, "-")     # "----hi----"

# Multiline strings
text = """line one
line two
line three"""
lines = text.splitlines()   # ["line one", "line two", "line three"]`}</code></pre>

      <h2 id="truthy-falsy">Truthy and Falsy Values</h2>

      <p>
        Every Python object has a boolean value. This is evaluated in <code>if</code>,{" "}
        <code>while</code>, and boolean expressions.
      </p>

      <p>
        <strong>Falsy values</strong> (evaluate to <code>False</code>):
      </p>
      <pre><code>{`False
None
0          # int zero
0.0        # float zero
""         # empty string
[]         # empty list
()         # empty tuple
{}         # empty dict
set()      # empty set`}</code></pre>

      <p>
        <strong>Everything else is truthy</strong>, including <code>"0"</code>,{" "}
        <code>[0]</code>, <code>-1</code>, non-empty strings, etc.
      </p>

      <pre><code>{`# Idiomatic checks
if user_list:            # instead of: if len(user_list) > 0
    process(user_list)

if name:                 # instead of: if name != ""
    greet(name)

if result is not None:   # prefer this over: if result
    use(result)          # because 0, "", [] are valid results

# or/and with truthy/falsy
name = user_input or "Anonymous"     # default if falsy
# Gotcha: 0 or 10 → 10  (0 is falsy)
# Gotcha: [] or [1, 2] → [1, 2]`}</code></pre>

      <h2 id="js-comparison">Python Collections vs JavaScript</h2>

      <pre><code>{`// JavaScript                     # Python

// Array
const arr = [1, 2, 3];           arr = [1, 2, 3]
arr.push(4);                      arr.append(4)
arr.pop();                        arr.pop()
arr.length;                       len(arr)
arr.includes(2);                  2 in arr
arr.indexOf(2);                   arr.index(2)
arr.slice(1, 3);                  arr[1:3]
arr.concat([4, 5]);               arr + [4, 5]  or  arr.extend([4, 5])
[...arr];                         arr.copy()  or  arr[:]
arr.map(fn);                      [fn(x) for x in arr]
arr.filter(fn);                   [x for x in arr if fn(x)]
arr.find(fn);                     next((x for x in arr if fn(x)), None)

// Object / Map
const obj = {a: 1, b: 2};        d = {"a": 1, "b": 2}
obj.a;                            d["a"]  or  d.get("a")
obj["a"];                         d["a"]
Object.keys(obj);                 d.keys()
Object.values(obj);               d.values()
Object.entries(obj);              d.items()
{...obj, c: 3};                   {**d, "c": 3}  or  d | {"c": 3}
"a" in obj;                       "a" in d  (checks keys)

// Set
const s = new Set([1, 2, 3]);     s = {1, 2, 3}
s.add(4);                         s.add(4)
s.has(2);                         2 in s
s.size;                           len(s)

// Tuple (no JS equivalent)
//                                 point = (1, 2)  — immutable, hashable`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is the difference between a list and a tuple?</h3>
      <p>
        Both are ordered sequences, but lists are mutable (elements can be added, removed,
        changed) and tuples are immutable (cannot be changed after creation). Tuples are
        hashable (if all elements are hashable) so they can be dict keys or set members. Lists
        cannot. Tuples are slightly more memory-efficient. Use tuples for fixed heterogeneous
        data, lists for homogeneous sequences that change.
      </p>

      <h3>2. What is the difference between a set and a list?</h3>
      <p>
        A list is ordered, allows duplicates, and has O(n) membership testing. A set is
        unordered, stores only unique elements, and has O(1) average membership testing (hash
        table). Use a set when you need fast membership checks or deduplication. Elements in a
        set must be hashable (immutable) — you cannot have a set of lists.
      </p>

      <h3>3. What is a dictionary in Python?</h3>
      <p>
        A hash map mapping unique, hashable keys to values. Keys must be hashable (strings,
        ints, tuples). As of Python 3.7+, dicts preserve insertion order. Average O(1) for
        get, set, and delete. Use <code>.get(key, default)</code> for safe access without{" "}
        <code>KeyError</code>.
      </p>

      <h3>4. What does it mean that strings are immutable?</h3>
      <p>
        Once a string is created, its characters cannot be changed. Any string method (
        <code>.upper()</code>, <code>.replace()</code>, etc.) returns a <em>new</em> string
        rather than modifying the original. This means string concatenation in a loop is
        O(n²) — use <code>"".join(list)</code> instead.
      </p>

      <h3>5. What are truthy and falsy values in Python?</h3>
      <p>
        Every object has a boolean interpretation. Falsy: <code>None</code>, <code>False</code>,
        zero (<code>0</code>, <code>0.0</code>), and empty containers (<code>""</code>,{" "}
        <code>[]</code>, <code>{"{}"}</code>, <code>set()</code>, <code>()</code>). Everything
        else is truthy. This enables idiomatic checks like <code>if my_list:</code> instead of{" "}
        <code>if len(my_list) &gt; 0</code>.
      </p>

      <h3>6. How does slicing work?</h3>
      <p>
        <code>seq[start:stop:step]</code>. Start is inclusive, stop is exclusive. Negative
        indices count from the end. Omitting start/stop defaults to beginning/end. Slicing
        always returns a new object and never raises <code>IndexError</code>. <code>s[::-1]</code>{" "}
        reverses any sequence.
      </p>

      <h3>7. How do you safely copy a list?</h3>
      <p>
        For a shallow copy: <code>b = a.copy()</code>, <code>b = list(a)</code>, or{" "}
        <code>b = a[:]</code>. All create a new list but share references to nested objects.
        For a fully independent copy including nested objects, use{" "}
        <code>import copy; b = copy.deepcopy(a)</code>.
      </p>

      <h3>8. Can a tuple contain mutable objects?</h3>
      <p>
        Yes, and this is a common interview trap. A tuple holding a list is still a tuple —
        you cannot reassign the tuple&apos;s elements. But the list <em>inside</em> the tuple
        can still be mutated. Also, a tuple containing a list is not hashable, so it cannot be
        used as a dict key.
      </p>
      <pre><code>{`t = ([1, 2], [3, 4])
t[0].append(99)   # valid — mutating the list inside
print(t)          # ([1, 2, 99], [3, 4])

# t[0] = [9, 9]  # TypeError — cannot reassign tuple slot`}</code></pre>

      <h3>9. What is the difference between <code>dict.get()</code> and <code>dict[key]</code>?</h3>
      <p>
        <code>dict[key]</code> raises <code>KeyError</code> if the key is missing.{" "}
        <code>dict.get(key)</code> returns <code>None</code> by default, or a custom default
        with <code>dict.get(key, default)</code>. Prefer <code>.get()</code> when the key may
        be absent and you want to avoid try/except boilerplate.
      </p>

      <h3>10. Why is <code>bool</code> a subclass of <code>int</code> in Python?</h3>
      <p>
        Historical design decision for numeric compatibility. <code>True == 1</code> and{" "}
        <code>False == 0</code> evaluate to <code>True</code>. This means you can do things
        like <code>sum([True, False, True, True])</code> → <code>3</code> to count booleans, and{" "}
        <code>True + True</code> → <code>2</code>. Useful for counting, but can be surprising.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — List mutation trap</h3>
      <p>
        Predict the output before running:
      </p>
      <pre><code>{`a = [1, 2, 3]
b = a
b += [4, 5]
print(a)
print(b)
print(a is b)

# Now try with:
a = [1, 2, 3]
b = a
b = b + [4, 5]  # note: = not +=
print(a)
print(b)
print(a is b)`}</code></pre>

      <h3>Exercise 2 — Dict safe access</h3>
      <p>
        Write a function <code>get_user_email(user: dict) -&gt; str</code> that returns the
        user&apos;s email if present, or <code>"no-email@example.com"</code> if not. Do not
        use try/except.
      </p>

      <h3>Exercise 3 — Deduplication</h3>
      <p>
        Given a list of integers with duplicates, return a new list with duplicates removed
        while preserving original order. Do not use a library. Hint: <code>set</code> does
        not preserve order, so you need a different approach.
      </p>
      <pre><code>{`nums = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
# expected: [3, 1, 4, 5, 9, 2, 6]`}</code></pre>

      <h3>Exercise 4 — Shallow vs deep copy</h3>
      <p>
        Write code that demonstrates the difference between a shallow copy and a deep copy of{" "}
        <code>[[1, 2], [3, 4]]</code>. Show a mutation that affects the shallow copy&apos;s
        source but not the deep copy&apos;s source.
      </p>

      <h3>Exercise 5 — String reversal</h3>
      <p>
        Using slicing, write a one-liner that checks if a string is a palindrome (reads the
        same forwards and backwards). Ignore case.
      </p>
      <pre><code>{`# is_palindrome("racecar") → True
# is_palindrome("hello")   → False
# is_palindrome("Madam")   → True`}</code></pre>

      <h3>Exercise 6 — Truthy gotcha</h3>
      <p>
        Explain the difference in behavior between these two functions and when each is correct:
      </p>
      <pre><code>{`def process_a(items):
    if items:
        return sum(items)
    return 0

def process_b(items):
    if items is not None:
        return sum(items)
    return 0`}</code></pre>
      <p>What happens if <code>items = []</code>? What happens if <code>items = None</code>?</p>

      <h3>Exercise 7 — Word frequency</h3>
      <p>
        Write a function <code>word_count(text: str) -&gt; dict</code> that returns a dictionary
        mapping each word to how many times it appears. Case-insensitive. Ignore punctuation.
      </p>
      <pre><code>{`word_count("the cat sat on the mat the cat")
# {"the": 3, "cat": 2, "sat": 1, "on": 1, "mat": 1}`}</code></pre>

      <h3>Exercise 8 — Tuple as dict key</h3>
      <p>
        Build a function <code>build_adjacency(edges: list) -&gt; dict</code> that takes a
        list of <code>(from_node, to_node)</code> tuples and returns a dict mapping each node
        to a list of its neighbors.
      </p>
      <pre><code>{`edges = [(1, 2), (1, 3), (2, 4), (3, 4)]
# {1: [2, 3], 2: [4], 3: [4], 4: []}`}</code></pre>
    </div>
  );
}
