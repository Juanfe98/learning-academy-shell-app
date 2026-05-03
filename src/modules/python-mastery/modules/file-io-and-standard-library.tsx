import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "file-reading", title: "Reading Files", level: 2 },
  { id: "file-writing", title: "Writing Files", level: 2 },
  { id: "context-managers", title: "with open() and Context Managers", level: 2 },
  { id: "json", title: "JSON Handling", level: 2 },
  { id: "csv", title: "CSV Handling", level: 2 },
  { id: "pathlib", title: "pathlib", level: 2 },
  { id: "os-module", title: "os Module", level: 2 },
  { id: "datetime", title: "datetime", level: 2 },
  { id: "collections", title: "collections: Counter, defaultdict, deque", level: 2 },
  { id: "itertools", title: "itertools", level: 2 },
  { id: "functools", title: "functools", level: 2 },
  { id: "regex", title: "Regular Expressions with re", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function FileIoAndStandardLibrary() {
  return (
    <div className="article-content">
      <p>
        Python&apos;s standard library is enormous — &quot;batteries included&quot; is the
        motto. This module covers the parts you will use on almost every project and that
        appear in interviews: file handling, JSON/CSV, path manipulation, datetime, and the
        power tools in <code>collections</code>, <code>itertools</code>, and{" "}
        <code>functools</code>.
      </p>

      <h2 id="file-reading">Reading Files</h2>

      <pre><code>{`# Read entire file as string
with open("data.txt") as f:
    content = f.read()         # entire file as one string

# Read line by line (memory efficient for large files)
with open("data.txt") as f:
    for line in f:             # f is iterable
        print(line.strip())    # strip() removes trailing newline

# Read all lines into a list
with open("data.txt") as f:
    lines = f.readlines()      # list of strings, newlines included
    lines = [l.strip() for l in f.readlines()]  # stripped

# Read one line at a time
with open("data.txt") as f:
    first = f.readline()       # one line including \n
    second = f.readline()

# Encoding — always specify for non-ASCII content
with open("data.txt", encoding="utf-8") as f:
    content = f.read()`}</code></pre>

      <h2 id="file-writing">Writing Files</h2>

      <pre><code>{`# Write — creates file or overwrites existing
with open("output.txt", "w") as f:
    f.write("Hello, world\n")
    f.write("Second line\n")

# Append — adds to existing file
with open("output.txt", "a") as f:
    f.write("Appended line\n")

# Write multiple lines at once
lines = ["line 1\n", "line 2\n", "line 3\n"]
with open("output.txt", "w") as f:
    f.writelines(lines)   # no separator added — include \n yourself

# File modes
# "r"  — read (default)
# "w"  — write (truncates existing file)
# "a"  — append
# "x"  — exclusive create (fails if file exists)
# "b"  — binary mode (combine: "rb", "wb")
# "+"  — read+write (combine: "r+", "w+")

# Binary files
with open("image.png", "rb") as f:
    data = f.read()   # bytes object

with open("copy.png", "wb") as f:
    f.write(data)`}</code></pre>

      <h2 id="context-managers">with open() and Context Managers</h2>

      <p>
        Always use <code>with open()</code>. It guarantees the file is closed even if an
        exception occurs — no manual <code>f.close()</code> needed.
      </p>

      <pre><code>{`# Without context manager — risky
f = open("data.txt")
content = f.read()
# If read() raises, f.close() never runs → file handle leak
f.close()

# With context manager — safe
with open("data.txt") as f:
    content = f.read()
# f.close() always called here, even on exception

# Multiple files in one with block
with open("in.txt") as fin, open("out.txt", "w") as fout:
    fout.write(fin.read().upper())

# How it works:
# open() returns a file object that implements __enter__ and __exit__
# __enter__ returns the file
# __exit__ closes the file (and handles exceptions)
# "with X as Y" calls X.__enter__() and assigns result to Y`}</code></pre>

      <h2 id="json">JSON Handling</h2>

      <pre><code>{`import json

# Parse JSON string → Python object
data = json.loads('{"name": "Juan", "age": 30}')
print(data["name"])   # "Juan"
print(type(data))     # <class 'dict'>

# Serialize Python object → JSON string
user = {"name": "Juan", "age": 30, "active": True}
json_str = json.dumps(user)
json_str = json.dumps(user, indent=2)   # pretty-printed

# Read JSON file
with open("config.json") as f:
    config = json.load(f)   # load() reads from file object

# Write JSON file
with open("output.json", "w") as f:
    json.dump(user, f, indent=2)   # dump() writes to file object

# Type mapping: Python ↔ JSON
# dict      ↔  object {}
# list      ↔  array  []
# str       ↔  string
# int/float ↔  number
# True      ↔  true
# False     ↔  false
# None      ↔  null

# Custom serialization
import json
from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

json.dumps({"ts": datetime.now()}, cls=DateTimeEncoder)`}</code></pre>

      <h2 id="csv">CSV Handling</h2>

      <pre><code>{`import csv

# Read CSV
with open("users.csv", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)        # first row as list
    for row in reader:
        print(row)               # each row is a list of strings

# Read as dicts (header row becomes keys)
with open("users.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["email"])   # access by column name

# Write CSV
rows = [["Alice", "alice@ex.com"], ["Bob", "bob@ex.com"]]
with open("output.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "email"])   # header
    writer.writerows(rows)

# Write dicts
users = [{"name": "Alice", "email": "alice@ex.com"}]
with open("output.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "email"])
    writer.writeheader()
    writer.writerows(users)

# newline="" is required on Windows to prevent double newlines`}</code></pre>

      <h2 id="pathlib">pathlib</h2>

      <p>
        <code>pathlib.Path</code> is the modern way to work with filesystem paths. Cleaner
        than string manipulation or <code>os.path</code>.
      </p>

      <pre><code>{`from pathlib import Path

# Create path objects
p = Path("/home/user/documents")
p = Path(".")                     # current directory
p = Path.home()                   # home directory
p = Path.cwd()                    # current working directory

# Build paths with /  (overloaded operator)
config = Path.home() / ".config" / "app" / "settings.json"

# Path properties
p = Path("/home/user/data/report.csv")
p.name        # "report.csv"
p.stem        # "report"
p.suffix      # ".csv"
p.suffixes    # [".csv"]
p.parent      # Path("/home/user/data")
p.parents[1]  # Path("/home/user")

# Checks
p.exists()    # True/False
p.is_file()   # True if it's a file
p.is_dir()    # True if it's a directory

# Read / write (shorthand)
text = Path("data.txt").read_text(encoding="utf-8")
Path("output.txt").write_text("hello", encoding="utf-8")
bytes_data = Path("image.png").read_bytes()

# Create / delete
Path("new_dir").mkdir(parents=True, exist_ok=True)
Path("file.txt").unlink(missing_ok=True)   # delete file

# List directory contents
for f in Path(".").iterdir():
    print(f)

# Glob patterns
for py_file in Path("src").rglob("*.py"):   # recursive
    print(py_file)

for test in Path("tests").glob("test_*.py"):  # non-recursive
    print(test)

# os.path equivalent (older style)
import os.path
os.path.join("/home", "user", "file.txt")   # use Path("/home") / "user" / "file.txt"
os.path.exists("/home/user")                # use Path("/home/user").exists()`}</code></pre>

      <h2 id="os-module">os Module</h2>

      <pre><code>{`import os

# Environment
os.environ.get("HOME")
os.getcwd()             # current working directory
os.chdir("/tmp")        # change directory

# File system operations
os.listdir(".")         # list directory (prefer Path.iterdir())
os.makedirs("a/b/c", exist_ok=True)
os.remove("file.txt")
os.rename("old.txt", "new.txt")

# Process info
os.getpid()             # current process ID
os.cpu_count()          # number of CPUs

# Path operations (use pathlib instead in new code)
os.path.join("dir", "file.txt")
os.path.exists("file.txt")
os.path.dirname("/home/user/file.txt")  # "/home/user"
os.path.basename("/home/user/file.txt") # "file.txt"
os.path.splitext("report.csv")          # ("report", ".csv")

# Walk directory tree
for dirpath, dirnames, filenames in os.walk("."):
    for filename in filenames:
        print(os.path.join(dirpath, filename))`}</code></pre>

      <h2 id="datetime">datetime</h2>

      <pre><code>{`from datetime import datetime, date, time, timedelta

# Current time
now = datetime.now()        # local time
utc = datetime.utcnow()     # UTC (naive)

# Create specific datetime
dt = datetime(2024, 1, 15, 9, 30, 0)   # year, month, day, hour, min, sec

# Date only
today = date.today()
d = date(2024, 1, 15)

# Format datetime → string
now.strftime("%Y-%m-%d %H:%M:%S")   # "2024-01-15 09:30:00"
now.strftime("%d/%m/%Y")            # "15/01/2024"
now.isoformat()                     # "2024-01-15T09:30:00"

# Parse string → datetime
dt = datetime.strptime("2024-01-15", "%Y-%m-%d")
dt = datetime.fromisoformat("2024-01-15T09:30:00")

# Arithmetic with timedelta
tomorrow = today + timedelta(days=1)
next_week = now + timedelta(weeks=1)
two_hours_ago = now - timedelta(hours=2)

diff = datetime(2024, 12, 31) - datetime.now()
print(diff.days)        # days until end of year

# Common strftime codes
# %Y — 4-digit year       %m — 2-digit month   %d — 2-digit day
# %H — 24h hour           %M — minutes         %S — seconds
# %I — 12h hour           %p — AM/PM
# %A — weekday name       %B — month name`}</code></pre>

      <h2 id="collections">collections: Counter, defaultdict, deque</h2>

      <p>
        The <code>collections</code> module provides specialized container types that solve
        common problems more elegantly than plain dicts and lists.
      </p>

      <h3>Counter</h3>
      <pre><code>{`from collections import Counter

# Count occurrences of elements
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counts = Counter(words)
# Counter({'apple': 3, 'banana': 2, 'cherry': 1})

counts["apple"]          # 3
counts["missing"]        # 0 — no KeyError!

# Most common
counts.most_common(2)    # [('apple', 3), ('banana', 2)]

# Arithmetic
a = Counter("hello")
b = Counter("world")
a + b   # combined counts
a - b   # subtract (drops negatives)
a & b   # intersection (min of counts)
a | b   # union (max of counts)

# Count characters
Counter("mississippi")
# Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})

# Count from any iterable
Counter(x % 3 for x in range(10))
# Counter({0: 4, 1: 3, 2: 3})`}</code></pre>

      <h3>defaultdict</h3>
      <pre><code>{`from collections import defaultdict

# Like a dict, but provides a default value for missing keys
groups = defaultdict(list)   # default factory: list()

for item in [("a", 1), ("b", 2), ("a", 3), ("b", 4)]:
    key, val = item
    groups[key].append(val)  # no KeyError on first access

print(dict(groups))   # {"a": [1, 3], "b": [2, 4]}

# Compare to manual approach:
groups = {}
for key, val in items:
    if key not in groups:
        groups[key] = []
    groups[key].append(val)  # 3 lines → 1 line with defaultdict

# Other default factories
word_count = defaultdict(int)    # default 0
for word in words:
    word_count[word] += 1        # no need to initialize

nested = defaultdict(dict)       # default empty dict
nested["user"]["name"] = "Juan"

# defaultdict(lambda: "N/A")     # custom default with lambda`}</code></pre>

      <h3>deque</h3>
      <pre><code>{`from collections import deque

# Double-ended queue — O(1) append and pop from both ends
# (list.insert(0, x) and list.pop(0) are O(n) — deque is better for queues)

q = deque([1, 2, 3])
q.append(4)        # add to right
q.appendleft(0)    # add to left
q.pop()            # remove from right
q.popleft()        # remove from left — O(1)!

# Fixed-size sliding window
recent = deque(maxlen=5)
for i in range(10):
    recent.append(i)
    print(list(recent))   # always last 5 items

# Rotate
d = deque([1, 2, 3, 4, 5])
d.rotate(2)    # [4, 5, 1, 2, 3]  — rotate right by 2
d.rotate(-1)   # rotate left by 1

# Use as a BFS queue
from collections import deque
def bfs(graph, start):
    visited = set()
    queue = deque([start])
    while queue:
        node = queue.popleft()   # O(1) — critical for BFS performance
        if node not in visited:
            visited.add(node)
            queue.extend(graph[node])`}</code></pre>

      <h3>Other useful collections</h3>
      <pre><code>{`from collections import OrderedDict, namedtuple, ChainMap

# namedtuple — immutable record with named fields
Point = namedtuple("Point", ["x", "y"])
p = Point(1, 2)
p.x   # 1
p.y   # 2
x, y = p   # unpacking works

# OrderedDict — dict that remembers insertion order (redundant in Python 3.7+)
# Still useful for .move_to_end() method

# ChainMap — search multiple dicts as one
defaults = {"color": "blue", "size": "medium"}
overrides = {"color": "red"}
merged = ChainMap(overrides, defaults)
merged["color"]   # "red"   — overrides wins
merged["size"]    # "medium" — from defaults`}</code></pre>

      <h2 id="itertools">itertools</h2>

      <pre><code>{`import itertools

# chain — flatten multiple iterables
list(itertools.chain([1, 2], [3, 4], [5]))   # [1, 2, 3, 4, 5]
list(itertools.chain.from_iterable([[1,2],[3,4]]))  # flatten one level

# islice — lazy slicing of any iterable
list(itertools.islice(range(100), 5))    # [0, 1, 2, 3, 4]
list(itertools.islice(range(100), 2, 8, 2))  # [2, 4, 6]

# groupby — group consecutive elements by key
from itertools import groupby
data = [("a", 1), ("a", 2), ("b", 3), ("b", 4), ("a", 5)]
for key, group in groupby(data, key=lambda x: x[0]):
    print(key, list(group))
# a [('a', 1), ('a', 2)]
# b [('b', 3), ('b', 4)]
# a [('a', 5)]  ← restarts! data must be pre-sorted for full grouping

# product — Cartesian product (like nested for loops)
list(itertools.product([1, 2], ["a", "b"]))
# [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')]

# combinations and permutations
list(itertools.combinations([1, 2, 3], 2))
# [(1, 2), (1, 3), (2, 3)]

list(itertools.permutations([1, 2, 3], 2))
# [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]

# repeat — repeat a value n times
list(itertools.repeat(0, 5))   # [0, 0, 0, 0, 0]

# takewhile / dropwhile
list(itertools.takewhile(lambda x: x < 5, [1, 3, 5, 2, 1]))  # [1, 3]
list(itertools.dropwhile(lambda x: x < 5, [1, 3, 5, 2, 1]))  # [5, 2, 1]

# accumulate — running totals
import operator
list(itertools.accumulate([1, 2, 3, 4], operator.add))  # [1, 3, 6, 10]`}</code></pre>

      <h2 id="functools">functools</h2>

      <pre><code>{`import functools

# reduce — fold sequence with binary function
functools.reduce(lambda acc, x: acc + x, [1, 2, 3, 4])  # 10
functools.reduce(lambda acc, x: acc * x, [1, 2, 3, 4])  # 24

# partial — pre-fill some arguments of a function
def power(base, exp):
    return base ** exp

square = functools.partial(power, exp=2)
cube   = functools.partial(power, exp=3)
square(5)   # 25
cube(3)     # 27

# lru_cache — memoization decorator
@functools.lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

fibonacci(50)   # instant — cached results
fibonacci.cache_info()   # CacheInfo(hits=48, misses=51, ...)
fibonacci.cache_clear()  # clear the cache

# @cache — unbounded LRU cache (Python 3.9+)
@functools.cache
def fib(n):
    if n < 2: return n
    return fib(n-1) + fib(n-2)

# total_ordering — fill in comparison methods from __eq__ + one of __lt__/__le__/__gt__/__ge__
@functools.total_ordering
class Version:
    def __init__(self, major, minor):
        self.major = major
        self.minor = minor

    def __eq__(self, other):
        return (self.major, self.minor) == (other.major, other.minor)

    def __lt__(self, other):
        return (self.major, self.minor) < (other.major, other.minor)

    # Python generates __le__, __gt__, __ge__ automatically

# wraps — preserve function metadata in decorators
def my_decorator(func):
    @functools.wraps(func)   # copies __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper`}</code></pre>

      <h2 id="regex">Regular Expressions with re</h2>

      <pre><code>{`import re

text = "Contact us at support@example.com or sales@company.org"

# Search — find first match anywhere in string
match = re.search(r"\\w+@\\w+\\.\\w+", text)
if match:
    print(match.group())    # "support@example.com"
    print(match.start())    # start index
    print(match.end())      # end index

# Match — only matches at the START of string
re.match(r"\\d+", "123abc")   # match
re.match(r"\\d+", "abc123")   # None

# Findall — all non-overlapping matches
emails = re.findall(r"\\w+@\\w+\\.\\w+", text)
# ["support@example.com", "sales@company.org"]

# Finditer — iterator of match objects
for m in re.finditer(r"\\w+@\\w+\\.\\w+", text):
    print(m.group(), m.start())

# Sub — replace matches
cleaned = re.sub(r"\\s+", " ", "hello   world")  # "hello world"
masked  = re.sub(r"\\w+@\\w+\\.\\w+", "[REDACTED]", text)

# Split
parts = re.split(r"[,;\\s]+", "one, two; three  four")
# ["one", "two", "three", "four"]

# Compile for reuse (performance)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
EMAIL_RE.findall(text)

# Groups
m = re.search(r"(\\w+)@(\\w+)\\.(\\w+)", text)
m.group(0)   # full match
m.group(1)   # first group
m.group(2)   # second group
m.groups()   # ("support", "example", "com")

# Named groups
m = re.search(r"(?P<user>\\w+)@(?P<domain>\\w+\\.\\w+)", text)
m.group("user")    # "support"
m.group("domain")  # "example.com"

# Common patterns
r"\\d+"        # one or more digits
r"\\w+"        # word characters (letters, digits, _)
r"\\s+"        # whitespace
r"[A-Za-z]+"   # letters only
r"^\\d{4}-\\d{2}-\\d{2}$"   # date: YYYY-MM-DD`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. Why use <code>with open()</code>?</h3>
      <p>
        It guarantees the file is closed via the context manager protocol (<code>__exit__</code>)
        even if an exception occurs inside the block. Without it, a failed read/write could
        leave file handles open, leading to resource leaks — especially critical in
        long-running processes.
      </p>

      <h3>2. What is the difference between <code>os.path</code> and <code>pathlib</code>?</h3>
      <p>
        <code>os.path</code> works with strings and requires function calls for every operation.
        <code>pathlib.Path</code> is object-oriented — paths are objects with methods and the{" "}
        <code>/</code> operator for joining. <code>pathlib</code> is cleaner, more readable,
        and the modern choice. <code>os.path</code> is still common in older codebases.
      </p>

      <h3>3. How do you parse JSON in Python?</h3>
      <p>
        <code>json.loads(string)</code> parses a JSON string into a Python object.{" "}
        <code>json.load(file)</code> reads from a file object. The reverse:
        <code>json.dumps(obj)</code> serializes to string, <code>json.dump(obj, file)</code>{" "}
        writes to a file. Use <code>indent=2</code> for human-readable output.
      </p>

      <h3>4. What is <code>collections.Counter</code>?</h3>
      <p>
        A dict subclass for counting hashable objects. Pass any iterable to get a frequency
        map. Missing keys return <code>0</code> instead of raising <code>KeyError</code>.
        <code>.most_common(n)</code> returns the <code>n</code> most frequent elements.
        Supports arithmetic operations (add, subtract, intersect, union counts).
      </p>

      <h3>5. What is <code>defaultdict</code> and when do you use it?</h3>
      <p>
        A dict subclass that calls a factory function to provide default values for missing
        keys instead of raising <code>KeyError</code>. Use <code>defaultdict(list)</code>
        to group items, <code>defaultdict(int)</code> to count. Cleaner than the{" "}
        <code>if key not in d: d[key] = []</code> pattern.
      </p>

      <h3>6. Why is <code>deque</code> better than a list for queues?</h3>
      <p>
        <code>list.pop(0)</code> and <code>list.insert(0, x)</code> are O(n) because all
        elements must shift. <code>deque.popleft()</code> and <code>deque.appendleft()</code>
        are O(1). For BFS, task queues, and sliding window problems, <code>deque</code> is
        the correct data structure.
      </p>

      <h3>7. What does <code>@functools.lru_cache</code> do?</h3>
      <p>
        Memoizes function results — caches the return value keyed by arguments, so identical
        calls skip re-computation. LRU (Least Recently Used) evicts the oldest entries when
        the cache reaches <code>maxsize</code>. The function&apos;s arguments must be
        hashable. Essential for dynamic programming and expensive pure functions.
      </p>

      <h3>8. What is <code>functools.partial</code>?</h3>
      <p>
        Creates a new function with some arguments pre-filled. Useful when you need to pass
        a function to a higher-order function but want to fix some of its parameters.
        Example: <code>partial(sorted, key=str.lower)</code> creates a case-insensitive
        sort function.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — File line processor</h3>
      <p>
        Write <code>count_lines(path: str) -&gt; dict</code> that reads a text file and
        returns a dict with keys <code>total</code>, <code>empty</code>, and{" "}
        <code>non_empty</code> line counts. Use a context manager. Handle{" "}
        <code>FileNotFoundError</code> gracefully.
      </p>

      <h3>Exercise 2 — JSON config roundtrip</h3>
      <p>
        Write two functions: <code>save_config(config: dict, path: str)</code> and{" "}
        <code>load_config(path: str) -&gt; dict</code>. Save with <code>indent=2</code>.
        On load, if the file does not exist, return an empty dict instead of raising.
      </p>

      <h3>Exercise 3 — Counter frequency analysis</h3>
      <p>
        Given a list of log level strings (<code>["INFO", "ERROR", "DEBUG", "ERROR", ...]</code>),
        use <code>Counter</code> to print the top 3 most frequent levels and the total
        number of ERROR entries. Do not use a manual loop to count.
      </p>

      <h3>Exercise 4 — defaultdict grouping</h3>
      <p>
        Given a list of <code>(student_name, subject)</code> tuples, use{" "}
        <code>defaultdict(list)</code> to build a dict mapping each student to all their
        subjects. Then find students taking more than 2 subjects.
      </p>

      <h3>Exercise 5 — pathlib file tree</h3>
      <p>
        Using <code>pathlib</code>, write a function <code>find_python_files(root: str) -&gt; list[Path]</code>{" "}
        that recursively finds all <code>.py</code> files under <code>root</code>, sorted
        by file size descending.
      </p>

      <h3>Exercise 6 — lru_cache memoization</h3>
      <p>
        Implement a memoized <code>nth_tribonacci(n)</code> function (where each number is
        the sum of the three preceding ones: 0, 0, 1, 1, 2, 4, 7, 13...). Use{" "}
        <code>@functools.lru_cache</code>. Compare performance with and without the cache
        for <code>n=35</code>.
      </p>

      <h3>Mini Challenge — CSV Aggregator</h3>
      <p>
        Read a CSV file with columns <code>date</code>, <code>category</code>,{" "}
        <code>amount</code>. Using <code>csv.DictReader</code>, <code>defaultdict</code>,
        and <code>Counter</code>:
      </p>
      <ul>
        <li>Compute total amount per category</li>
        <li>Find the most common category</li>
        <li>Find the day with the highest total spend</li>
        <li>Print a summary report</li>
      </ul>
      <p>
        Do not use pandas. Use only the standard library.
      </p>
    </div>
  );
}
