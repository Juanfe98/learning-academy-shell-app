import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "iterables-vs-iterators", title: "Iterables vs Iterators", level: 2 },
  { id: "generators", title: "Generators and yield", level: 2 },
  { id: "generator-pipelines", title: "Generator Pipelines", level: 2 },
  { id: "decorators", title: "Decorators", level: 2 },
  { id: "decorator-patterns", title: "Decorator Patterns", level: 2 },
  { id: "context-managers", title: "Context Managers", level: 2 },
  { id: "contextlib", title: "contextlib", level: 2 },
  { id: "descriptors", title: "Descriptors", level: 2 },
  { id: "memory-references", title: "Memory and References", level: 2 },
  { id: "garbage-collection", title: "Garbage Collection", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function AdvancedPythonConcepts() {
  return (
    <div className="article-content">
      <p>
        This module covers the Python concepts that separate competent developers from
        senior ones in interviews: the iterator protocol, generators, decorators, context
        managers, and how Python manages memory. Each of these appears in senior-level
        interviews — not just &quot;what is it&quot; but &quot;implement one from scratch.&quot;
      </p>

      <h2 id="iterables-vs-iterators">Iterables vs Iterators</h2>

      <p>These two terms are often confused. The distinction is precise:</p>

      <ul>
        <li>
          An <strong>iterable</strong> is any object that can return an iterator — it
          implements <code>__iter__</code>. Lists, strings, dicts, sets, ranges are all
          iterables.
        </li>
        <li>
          An <strong>iterator</strong> is an object that produces values one at a time —
          it implements both <code>__iter__</code> and <code>__next__</code>. Calling{" "}
          <code>next()</code> on it returns the next value; when exhausted it raises{" "}
          <code>StopIteration</code>.
        </li>
      </ul>

      <pre><code>{`# Iterable — has __iter__ but not necessarily __next__
my_list = [1, 2, 3]
hasattr(my_list, "__iter__")    # True
hasattr(my_list, "__next__")    # False — list is NOT an iterator

# Get an iterator from an iterable
it = iter(my_list)              # calls my_list.__iter__()
hasattr(it, "__next__")         # True — iterator IS an iterator

# Consume the iterator manually
next(it)    # 1
next(it)    # 2
next(it)    # 3
next(it)    # StopIteration — exhausted

# What "for x in obj" actually does:
# 1. calls iter(obj) to get an iterator
# 2. repeatedly calls next(iterator)
# 3. stops when StopIteration is raised

# An iterator is its own iterable — iter(iterator) returns self
it = iter([1, 2, 3])
it is iter(it)   # True`}</code></pre>

      <h3>Custom iterator</h3>
      <pre><code>{`class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self   # iterator returns itself

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

for n in Countdown(5):
    print(n)   # 5, 4, 3, 2, 1

# Downside: single-use — once exhausted, cannot restart
# Iterables (with __iter__ returning a fresh iterator) are reusable`}</code></pre>

      <h2 id="generators">Generators and yield</h2>

      <p>
        A generator function uses <code>yield</code> instead of <code>return</code>. Calling
        it returns a generator object — a lazy iterator that produces values one at a time.
        The function body is paused at each <code>yield</code> and resumed on the next{" "}
        <code>next()</code> call.
      </p>

      <pre><code>{`def countdown(n):
    while n > 0:
        yield n       # pause here, return n to caller
        n -= 1        # resume here on next next()

gen = countdown(3)
print(type(gen))      # <class 'generator'>

next(gen)   # 3
next(gen)   # 2
next(gen)   # 1
next(gen)   # StopIteration

# In a for loop
for n in countdown(5):
    print(n)   # 5, 4, 3, 2, 1`}</code></pre>

      <h3>return vs yield</h3>
      <pre><code>{`# return — exits the function, returns one value
def get_items():
    return [1, 2, 3]   # builds entire list in memory, returns it

# yield — pauses the function, returns a value lazily
def gen_items():
    yield 1    # pauses, returns 1
    yield 2    # resumes, pauses, returns 2
    yield 3    # resumes, pauses, returns 3
               # function returns → StopIteration

# Practical difference — memory
def read_all_lines(path):
    return open(path).readlines()   # loads entire file into memory

def read_lines_lazy(path):
    with open(path) as f:
        for line in f:
            yield line              # one line at a time — O(1) memory`}</code></pre>

      <h3>yield from</h3>
      <pre><code>{`# Delegate to a sub-generator
def chain(*iterables):
    for it in iterables:
        yield from it   # equivalent to: for item in it: yield item

list(chain([1, 2], [3, 4], [5]))   # [1, 2, 3, 4, 5]

# Recursive generator
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)   # recurse
        else:
            yield item

list(flatten([1, [2, [3, 4]], 5]))   # [1, 2, 3, 4, 5]`}</code></pre>

      <h3>send() — two-way communication</h3>
      <pre><code>{`# Generators can receive values via send()
def accumulator():
    total = 0
    while True:
        value = yield total   # yield current total, receive next value
        if value is None:
            break
        total += value

gen = accumulator()
next(gen)         # prime the generator (advance to first yield) → 0
gen.send(10)      # send 10 → 10
gen.send(20)      # send 20 → 30
gen.send(5)       # send 5  → 35`}</code></pre>

      <h2 id="generator-pipelines">Generator Pipelines</h2>

      <p>
        Generators compose naturally into processing pipelines — each stage is lazy, so
        the entire pipeline uses O(1) memory regardless of data size.
      </p>

      <pre><code>{`def read_lines(path):
    with open(path) as f:
        yield from f

def strip_lines(lines):
    for line in lines:
        yield line.strip()

def filter_empty(lines):
    for line in lines:
        if line:
            yield line

def parse_csv(lines):
    for line in lines:
        yield line.split(",")

# Compose into a pipeline — nothing runs until you iterate
pipeline = parse_csv(
    filter_empty(
        strip_lines(
            read_lines("data.csv")
        )
    )
)

for row in pipeline:
    process(row)   # processes one row at a time, O(1) memory`}</code></pre>

      <h2 id="decorators">Decorators</h2>

      <p>
        A decorator is a function that takes a function and returns a replacement function.
        The <code>@decorator</code> syntax is sugar for <code>fn = decorator(fn)</code>.
      </p>

      <pre><code>{`# Minimal decorator
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("before")
        result = func(*args, **kwargs)
        print("after")
        return result
    return wrapper

@my_decorator
def greet(name):
    print(f"Hello, {name}!")

greet("Juan")
# before
# Hello, Juan!
# after

# @my_decorator is exactly equivalent to:
# greet = my_decorator(greet)`}</code></pre>

      <h3>Preserving metadata with @wraps</h3>
      <pre><code>{`import functools

def my_decorator(func):
    @functools.wraps(func)    # preserves __name__, __doc__, __module__
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def add(a, b):
    """Return the sum."""
    return a + b

print(add.__name__)   # "add"  — not "wrapper"
print(add.__doc__)    # "Return the sum."

# Without @wraps:
# add.__name__  → "wrapper"
# add.__doc__   → None
# This breaks help(), logging, and debugging tools`}</code></pre>

      <h3>Decorator with arguments</h3>
      <pre><code>{`# Decorator factory — a function that returns a decorator
def repeat(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def say_hi():
    print("Hi!")

say_hi()
# Hi!
# Hi!
# Hi!

# @repeat(times=3) is:
# say_hi = repeat(times=3)(say_hi)`}</code></pre>

      <h2 id="decorator-patterns">Decorator Patterns</h2>

      <h3>Timing decorator</h3>
      <pre><code>{`import time
import functools

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(0.1)

slow_function()   # slow_function took 0.1003s`}</code></pre>

      <h3>Retry decorator</h3>
      <pre><code>{`def retry(times=3, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    print(f"attempt {attempt} failed: {e}")
            raise last_exc
        return wrapper
    return decorator

@retry(times=3, exceptions=(TimeoutError, ConnectionError))
def fetch_data(url):
    ...`}</code></pre>

      <h3>Class-based decorator</h3>
      <pre><code>{`class memoize:
    def __init__(self, func):
        self.func = func
        self.cache = {}
        functools.update_wrapper(self, func)

    def __call__(self, *args):
        if args not in self.cache:
            self.cache[args] = self.func(*args)
        return self.cache[args]

@memoize
def expensive(n):
    return n ** 2

expensive(5)   # computed
expensive(5)   # cached`}</code></pre>

      <h2 id="context-managers">Context Managers</h2>

      <p>
        A context manager controls resource acquisition and release via <code>__enter__</code>
        and <code>__exit__</code>. The <code>with</code> statement guarantees{" "}
        <code>__exit__</code> runs even if an exception occurs.
      </p>

      <pre><code>{`# How "with" works step by step:
#
# with EXPR as VAR:
#     BODY
#
# 1. Evaluate EXPR → cm
# 2. Call cm.__enter__() → assign return value to VAR
# 3. Execute BODY
# 4. Call cm.__exit__(exc_type, exc_val, exc_tb) — always
#    - If body succeeded: all three args are None
#    - If exception raised: args describe the exception
#    - Return truthy from __exit__ to suppress the exception

class ManagedResource:
    def __enter__(self):
        print("acquiring resource")
        return self   # value bound to "as" variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        print("releasing resource")
        if exc_type is ValueError:
            print(f"suppressing ValueError: {exc_val}")
            return True    # suppress the exception
        return False       # let other exceptions propagate

with ManagedResource() as r:
    print("using resource")
# acquiring resource
# using resource
# releasing resource

with ManagedResource() as r:
    raise ValueError("oops")
# acquiring resource
# releasing resource
# suppressing ValueError: oops
# (no exception propagates)`}</code></pre>

      <h3>Timer context manager</h3>
      <pre><code>{`import time

class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed = time.perf_counter() - self.start
        print(f"elapsed: {self.elapsed:.4f}s")
        return False   # never suppress exceptions

with Timer() as t:
    time.sleep(0.1)
# elapsed: 0.1003s
print(t.elapsed)   # 0.1003...`}</code></pre>

      <h3>Database transaction context manager</h3>
      <pre><code>{`class Transaction:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        self.conn.begin()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.conn.commit()    # success — commit
        else:
            self.conn.rollback()  # error — rollback
        return False   # propagate exceptions after rollback

with Transaction(db_connection) as conn:
    conn.execute("INSERT INTO users ...")
    conn.execute("UPDATE accounts ...")`}</code></pre>

      <h2 id="contextlib">contextlib</h2>

      <p>
        <code>contextlib</code> provides utilities to create context managers without
        writing a class.
      </p>

      <pre><code>{`from contextlib import contextmanager, suppress, closing

# @contextmanager — generator-based context manager
@contextmanager
def timer():
    import time
    start = time.perf_counter()
    try:
        yield                  # body of the "with" block runs here
    finally:
        elapsed = time.perf_counter() - start
        print(f"elapsed: {elapsed:.4f}s")

with timer():
    time.sleep(0.1)   # elapsed: 0.1003s

# @contextmanager with yielded value
@contextmanager
def temp_directory():
    import tempfile, shutil
    path = tempfile.mkdtemp()
    try:
        yield path             # path bound to "as" variable
    finally:
        shutil.rmtree(path)    # cleanup

with temp_directory() as tmp:
    # do work in tmp directory
    pass   # tmp is cleaned up automatically

# suppress — swallow specific exceptions
from contextlib import suppress
with suppress(FileNotFoundError):
    os.remove("maybe_exists.txt")   # no exception if file missing

# closing — calls .close() on objects that don't support context manager
from contextlib import closing
import urllib.request
with closing(urllib.request.urlopen("http://example.com")) as page:
    content = page.read()`}</code></pre>

      <h2 id="descriptors">Descriptors</h2>

      <p>
        A descriptor is an object that defines how attribute access works on another class.
        It implements one or more of <code>__get__</code>, <code>__set__</code>,{" "}
        <code>__delete__</code>. Properties, classmethods, and staticmethods are all
        implemented as descriptors.
      </p>

      <pre><code>{`# Data descriptor — implements __get__ and __set__
class Positive:
    """Descriptor that enforces positive values."""

    def __set_name__(self, owner, name):
        self.name = name                  # called when class is defined

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                   # accessed on class, not instance
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be positive, got {value}")
        obj.__dict__[self.name] = value

class Circle:
    radius = Positive()   # descriptor instance as class attribute
    area = Positive()

c = Circle()
c.radius = 5      # calls Positive.__set__(c, 5)
c.radius          # calls Positive.__get__(c, Circle) → 5
c.radius = -1     # ValueError

# How @property is implemented under the hood — as a descriptor`}</code></pre>

      <h2 id="memory-references">Memory and References</h2>

      <pre><code>{`import sys

# id() — memory address of an object
x = [1, 2, 3]
y = x
print(id(x) == id(y))   # True — same object

y = [1, 2, 3]           # new object
print(id(x) == id(y))   # False — different objects

# sys.getrefcount() — number of references to an object
x = [1, 2, 3]
print(sys.getrefcount(x))   # 2 — x + the argument to getrefcount itself

y = x
print(sys.getrefcount(x))   # 3 — x, y, argument

del y
print(sys.getrefcount(x))   # 2 — back to x, argument

# Object size
print(sys.getsizeof([]))           # 56 bytes (empty list on 64-bit)
print(sys.getsizeof([1, 2, 3]))    # 88 bytes

# Small integer cache — Python caches -5 to 256
a = 256
b = 256
a is b   # True — same object (cached)

a = 257
b = 257
a is b   # False — separate objects (not cached)
a == b   # True — same value`}</code></pre>

      <h2 id="garbage-collection">Garbage Collection</h2>

      <p>
        Python manages memory with two mechanisms:
      </p>

      <ol>
        <li>
          <strong>Reference counting</strong> — every object has a count of how many
          references point to it. When the count drops to zero, the object is immediately
          deallocated. This handles most cases.
        </li>
        <li>
          <strong>Cyclic garbage collector</strong> — handles reference cycles that reference
          counting cannot (e.g. <code>a.ref = b; b.ref = a</code>). Runs periodically.
        </li>
      </ol>

      <pre><code>{`import gc

# Reference counting in action
class MyObj:
    def __del__(self):
        print(f"{self} being destroyed")

a = MyObj()    # refcount = 1
b = a          # refcount = 2
del a          # refcount = 1 — NOT destroyed yet
del b          # refcount = 0 — destroyed immediately

# Reference cycles — a problem for reference counting alone
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

a = Node(1)
b = Node(2)
a.next = b     # a → b
b.next = a     # b → a — cycle!

del a
del b
# Neither is freed by reference counting — both still have refcount=1
# The cyclic GC will find and free them

# weakref — reference that doesn't increment refcount
import weakref

class Cache:
    def __init__(self, obj):
        self.ref = weakref.ref(obj)   # weak reference

    def get(self):
        return self.ref()   # returns obj or None if it was garbage collected

# GC control (rarely needed)
gc.disable()       # disable cyclic GC
gc.enable()
gc.collect()       # force a collection cycle
gc.get_count()     # (gen0, gen1, gen2) object counts`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is an iterator?</h3>
      <p>
        An object implementing <code>__iter__</code> and <code>__next__</code>. Calling{" "}
        <code>next()</code> on it returns the next value; when exhausted it raises{" "}
        <code>StopIteration</code>. Iterators are single-use — once exhausted they cannot
        restart. An iterable only needs <code>__iter__</code> and returns a fresh iterator
        each time.
      </p>

      <h3>2. What is a generator?</h3>
      <p>
        A function using <code>yield</code> instead of <code>return</code>. Calling it
        returns a generator object — a lazy iterator that produces values on demand. The
        function body is suspended at each <code>yield</code> and resumes on the next{" "}
        <code>next()</code> call. Uses O(1) memory regardless of how many values it
        produces.
      </p>

      <h3>3. What is the difference between <code>return</code> and <code>yield</code>?</h3>
      <p>
        <code>return</code> exits the function immediately and returns one value.{" "}
        <code>yield</code> suspends the function, returns a value to the caller, and
        resumes from that point on the next <code>next()</code> call. A function with any{" "}
        <code>yield</code> is a generator function — calling it never executes the body
        immediately.
      </p>

      <h3>4. What is a decorator?</h3>
      <p>
        A function that takes a function and returns a replacement function. The{" "}
        <code>@decorator</code> syntax is sugar for <code>fn = decorator(fn)</code>. Used
        to add cross-cutting behaviour (logging, timing, retrying, auth checks) without
        modifying the original function. Always use <code>@functools.wraps</code> to
        preserve the original function&apos;s metadata.
      </p>

      <h3>5. How does a context manager work?</h3>
      <p>
        The <code>with</code> statement calls <code>__enter__</code> on entry and{" "}
        <code>__exit__</code> on exit — always, even if an exception occurs.{" "}
        <code>__exit__</code> receives the exception info; returning a truthy value
        suppresses it. Used for resource management: files, locks, database transactions.
        Create them with a class or with <code>@contextmanager</code>.
      </p>

      <h3>6. What is garbage collection in Python?</h3>
      <p>
        Python primarily uses reference counting — when an object&apos;s reference count
        reaches zero, it is freed immediately. A supplementary cyclic garbage collector
        handles reference cycles (where two objects reference each other, preventing
        reference counts from reaching zero). The GC runs automatically but can be
        controlled via the <code>gc</code> module.
      </p>

      <h3>7. What is reference counting?</h3>
      <p>
        Every Python object tracks how many names/containers point to it. When you assign{" "}
        <code>b = a</code>, the count increases. When you <code>del a</code>, it decreases.
        At zero, the object is freed. This is why Python memory is predictable for simple
        cases. The main limitation: reference cycles keep counts above zero even when objects
        are unreachable.
      </p>

      <h3>8. What is <code>yield from</code>?</h3>
      <p>
        Delegates iteration to a sub-iterable. <code>yield from iterable</code> is
        equivalent to <code>for item in iterable: yield item</code> but also correctly
        forwards <code>send()</code> and <code>throw()</code> calls into the sub-generator.
        Used for flattening, recursive generators, and coroutine composition.
      </p>

      <h3>9. What is a descriptor?</h3>
      <p>
        An object that defines attribute access on another class by implementing{" "}
        <code>__get__</code>, <code>__set__</code>, or <code>__delete__</code>. When a
        descriptor instance is a class attribute, Python calls these methods instead of
        doing normal attribute lookup. <code>@property</code>, <code>@classmethod</code>,
        and <code>@staticmethod</code> are all built on descriptors.
      </p>

      <h3>10. Why use <code>@contextmanager</code> instead of a class?</h3>
      <p>
        Less boilerplate. A generator function with <code>yield</code> in a{" "}
        <code>try/finally</code> block replaces a full class with <code>__enter__</code>{" "}
        and <code>__exit__</code>. The code before <code>yield</code> is the setup,
        the code after (in <code>finally</code>) is the teardown. Use a class when you
        need to store state or support multiple use.
      </p>

      <h3>11. What is the small integer cache?</h3>
      <p>
        CPython pre-allocates and caches integers from -5 to 256. Two variables holding
        the same integer in that range will point to the same object (<code>is</code>{" "}
        returns <code>True</code>). Outside that range, each integer literal creates a
        new object. This is why you should never use <code>is</code> to compare integer
        values — always use <code>==</code>.
      </p>

      <h3>12. What happens to an object when its reference count drops to zero?</h3>
      <p>
        CPython immediately calls its <code>__del__</code> method (if defined) and frees
        its memory. This is deterministic — unlike Java&apos;s garbage collector, Python
        frees objects the moment the last reference is removed. The exception: objects in
        reference cycles are not freed by reference counting alone — they wait for the
        cyclic GC.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Custom iterator</h3>
      <p>
        Implement a <code>Range</code> class that replicates the behaviour of Python&apos;s
        built-in <code>range</code> — it should support <code>for x in Range(start, stop, step)</code>,
        work with <code>len()</code>, and be reusable (iterating it twice should work).
      </p>

      <h3>Exercise 2 — Infinite generator</h3>
      <p>
        Write a generator <code>fibonacci()</code> that yields Fibonacci numbers
        indefinitely. Then write <code>take(n, gen)</code> that returns the first{" "}
        <code>n</code> values from any generator without loading all of them.
      </p>
      <pre><code>{`list(take(8, fibonacci()))   # [0, 1, 1, 2, 3, 5, 8, 13]`}</code></pre>

      <h3>Exercise 3 — Generator pipeline</h3>
      <p>
        Build a lazy log processing pipeline using generators:
      </p>
      <ul>
        <li><code>read_log(path)</code> — yields raw lines</li>
        <li><code>parse_log(lines)</code> — yields dicts with <code>level</code>, <code>message</code>, <code>timestamp</code></li>
        <li><code>filter_level(entries, level)</code> — yields only entries matching level</li>
        <li><code>format_entry(entries)</code> — yields formatted strings</li>
      </ul>
      <p>Compose them into a pipeline that prints all ERROR lines, formatted.</p>

      <h3>Exercise 4 — @timer decorator</h3>
      <p>
        Write a <code>@timer</code> decorator that prints how long a function took. Make
        it also work as <code>@timer(label="my function")</code> where the label is printed
        instead of the function name.
      </p>

      <h3>Exercise 5 — @validate decorator</h3>
      <p>
        Write a <code>@validate(**type_checks)</code> decorator factory that validates
        argument types at call time:
      </p>
      <pre><code>{`@validate(name=str, age=int)
def create_user(name, age):
    return {"name": name, "age": age}

create_user("Juan", 30)     # works
create_user("Juan", "30")   # raises TypeError: age must be int, got str`}</code></pre>

      <h3>Exercise 6 — Context manager class</h3>
      <p>
        Implement a <code>DatabaseTransaction</code> context manager (mock the DB) that:
      </p>
      <ul>
        <li>Begins a transaction on <code>__enter__</code></li>
        <li>Commits on clean exit</li>
        <li>Rolls back if any exception is raised, then re-raises it</li>
        <li>Logs each action</li>
      </ul>

      <h3>Exercise 7 — @contextmanager version</h3>
      <p>
        Rewrite Exercise 6 using <code>@contextmanager</code> from <code>contextlib</code>.
        Compare the two implementations — same behaviour, different structure.
      </p>

      <h3>Mini Challenge — Timer Decorator + Context Manager</h3>
      <p>
        Build a unified <code>Profiler</code> that works both as a decorator and as a
        context manager:
      </p>
      <pre><code>{`# As decorator
@Profiler(label="compute")
def heavy_computation():
    ...

# As context manager
with Profiler(label="data load"):
    load_data()

# Both should print:
# [compute] took 0.0234s
# [data load] took 1.2341s`}</code></pre>
      <p>
        Hint: implement <code>__enter__</code>/<code>__exit__</code> on the class, and
        make <code>__call__</code> wrap the function.
      </p>
    </div>
  );
}
