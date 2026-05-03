import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "syntax", title: "Syntax Cheat Sheet", level: 2 },
  { id: "data-structures", title: "Data Structures Cheat Sheet", level: 2 },
  { id: "functions", title: "Functions Cheat Sheet", level: 2 },
  { id: "oop", title: "OOP Cheat Sheet", level: 2 },
  { id: "comprehensions", title: "Comprehensions Cheat Sheet", level: 2 },
  { id: "stdlib", title: "Standard Library Cheat Sheet", level: 2 },
  { id: "async", title: "Async Cheat Sheet", level: 2 },
  { id: "testing", title: "Testing Cheat Sheet", level: 2 },
  { id: "typing", title: "Typing Cheat Sheet", level: 2 },
  { id: "js-ts-comparison", title: "Python vs JS/TS Comparison", level: 2 },
  { id: "glossary", title: "Glossary (60+ Terms)", level: 2 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem", background: "#13131a", border: "1px solid #2a2a38", borderRadius: "8px", padding: "1rem" }}>
      <p style={{ fontFamily: "monospace", color: "#6366f1", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
      {children}
    </div>
  );
}

function Term({ term, def }: { term: string; def: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.4rem" }}>
      <code style={{ color: "#f59e0b", minWidth: "180px", flexShrink: 0, fontSize: "0.82rem" }}>{term}</code>
      <span style={{ color: "#a0a0b8", fontSize: "0.82rem" }}>{def}</span>
    </div>
  );
}

function GlossaryEntry({ term, def }: { term: string; def: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", borderBottom: "1px solid #1a1a24", paddingBottom: "0.4rem" }}>
      <strong style={{ color: "#818cf8", minWidth: "200px", flexShrink: 0, fontSize: "0.85rem", fontFamily: "monospace" }}>{term}</strong>
      <span style={{ color: "#a0a0b8", fontSize: "0.85rem" }}>{def}</span>
    </div>
  );
}

export default function PythonGlossaryAndCheatSheet() {
  return (
    <div className="article-content">
      <p>
        30-minute pre-interview review sheet. All syntax, all patterns, all gotchas — in one scannable page.
      </p>

      <h2 id="syntax">Syntax Cheat Sheet</h2>

      <Section title="Variables and Types">
        <pre><code>{`x = 10                    # int
x = 3.14                  # float
x = True / False          # bool (capitalized!)
x = "hello" / 'hello'     # str (immutable)
x = None                  # NoneType singleton

# Multiple assignment
a, b = 1, 2
a, *rest = [1, 2, 3, 4]  # a=1, rest=[2,3,4]
a, b = b, a               # swap

# Type check
type(x)                   # <class 'int'>
isinstance(x, int)        # True`}</code></pre>
      </Section>

      <Section title="Control Flow">
        <pre><code>{`if x > 0:
    ...
elif x == 0:
    ...
else:
    ...

# Ternary
val = "pos" if x > 0 else "neg"

# Walrus operator (Python 3.8+)
if (n := len(data)) > 10:
    print(n)

# match/case (Python 3.10+)
match command:
    case "quit": ...
    case "help" | "h": ...
    case _: ...`}</code></pre>
      </Section>

      <Section title="Loops">
        <pre><code>{`for i in range(10):        # 0..9
for i in range(2, 10, 2): # 2,4,6,8
for i, v in enumerate(lst, start=1):
for a, b in zip(list1, list2):
for k, v in d.items():

while condition:
    break / continue

# Loop else — runs if no break
for x in items:
    if condition: break
else:
    print("no break fired")`}</code></pre>
      </Section>

      <Section title="String Formatting">
        <pre><code>{`name, age = "Juan", 30
f"Hello {name}, age {age}"         # f-string (preferred)
f"{value:.2f}"                     # 2 decimal places
f"{value:>10}"                     # right-align width 10
f"{value:0>5}"                     # zero-pad to 5
f"{obj!r}"                         # use repr()
f"{1_000_000:,}"                   # "1,000,000"
"Hello {}".format(name)            # .format()
"Hello %s" % name                  # % (avoid)`}</code></pre>
      </Section>

      <h2 id="data-structures">Data Structures Cheat Sheet</h2>

      <Section title="List — ordered, mutable, allows duplicates">
        <pre><code>{`lst = [1, 2, 3]
lst.append(4)              # add to end       O(1)
lst.pop()                  # remove last      O(1)
lst.pop(0)                 # remove first     O(n) ← use deque!
lst.insert(i, x)           # insert at i      O(n)
lst.remove(x)              # remove value     O(n)
lst.index(x)               # find index       O(n)
x in lst                   # membership       O(n)
lst.sort() / sorted(lst)   # sort             O(n log n)
lst[::2]                   # every other
lst[::-1]                  # reversed copy
lst.extend([4,5])          # add multiple
lst.copy() / lst[:]        # shallow copy`}</code></pre>
      </Section>

      <Section title="Dict — ordered, mutable, unique keys">
        <pre><code>{`d = {"a": 1, "b": 2}
d["a"]                     # KeyError if missing
d.get("a", 0)              # safe — default 0
d["c"] = 3                 # add/update
del d["a"]                 # delete
d.pop("a", None)           # remove + return
"a" in d                   # check key        O(1)
d.keys() / .values() / .items()
d.update({"x": 9})         # merge
{**d1, **d2}               # merge (d2 wins)
d | {"x": 9}               # Python 3.9+`}</code></pre>
      </Section>

      <Section title="Set — unordered, mutable, unique, hashable elements">
        <pre><code>{`s = {1, 2, 3}
s.add(4)                   # O(1)
s.discard(x)               # remove, no error if missing
x in s                     # O(1) ← use for fast lookup!
s | t                      # union
s & t                      # intersection
s - t                      # difference
s ^ t                      # symmetric difference
set()                      # empty (NOT {})`}</code></pre>
      </Section>

      <Section title="Tuple — ordered, immutable, hashable">
        <pre><code>{`t = (1, 2, 3)
t = 1, 2, 3                # parens optional
t = (42,)                  # single element — trailing comma!
a, b, c = t                # unpack
t[0]                       # index       O(1)
x in t                     # membership  O(n)
# Can be dict key or set member (if elements hashable)`}</code></pre>
      </Section>

      <Section title="Collections module">
        <pre><code>{`from collections import Counter, defaultdict, deque, namedtuple, OrderedDict

Counter("mississippi")             # {'s':4,'i':4,'p':2,'m':1}
Counter.most_common(3)             # top 3
Counter["missing"]                 # 0 (no KeyError)

defaultdict(list)["key"].append(1) # no KeyError on first access
defaultdict(int)["key"] += 1

deque([1,2,3], maxlen=5)           # sliding window
deque.appendleft(x) / popleft()   # O(1) both ends

Point = namedtuple("Point", ["x","y"])
p = Point(1, 2); p.x`}</code></pre>
      </Section>

      <h2 id="functions">Functions Cheat Sheet</h2>

      <Section title="Function signatures">
        <pre><code>{`def fn(a, b, c=10, *args, kw_only, **kwargs) -> int:
#       ^pos  ^default ^extra pos  ^kw-only   ^extra kw

# Positional-only (before /)
def fn(pos_only, /, normal): ...

# Call with unpacking
fn(*[1,2,3])        # unpack list as positional args
fn(**{"a":1,"b":2}) # unpack dict as keyword args`}</code></pre>
      </Section>

      <Section title="Lambda and built-ins">
        <pre><code>{`square = lambda x: x**2
sorted(people, key=lambda p: p["age"])
sorted(people, key=lambda p: (-p["age"], p["name"]))  # multi-key

map(fn, iterable)           # apply fn to each
filter(fn, iterable)        # keep where fn returns True
filter(None, iterable)      # keep truthy values
zip(a, b)                   # pair elements, stops at shortest
enumerate(lst, start=1)     # (1,item), (2,item)...
any(gen) / all(gen)         # short-circuit boolean`}</code></pre>
      </Section>

      <h2 id="oop">OOP Cheat Sheet</h2>

      <Section title="Class anatomy">
        <pre><code>{`class Animal:
    count = 0                        # class attribute (shared)

    def __init__(self, name: str):   # constructor
        self.name = name             # instance attribute
        Animal.count += 1

    def speak(self) -> str:          # instance method
        return f"{self.name} speaks"

    @classmethod
    def get_count(cls) -> int:       # class method — factory/alt constructor
        return cls.count

    @staticmethod
    def is_valid(name: str) -> bool: # static method — no self/cls
        return bool(name.strip())

    @property
    def upper_name(self) -> str:     # getter
        return self.name.upper()

    @upper_name.setter
    def upper_name(self, v: str):    # setter
        self.name = v.lower()

    def __repr__(self) -> str:       # unambiguous — for devs
        return f"Animal({self.name!r})"

    def __str__(self) -> str:        # readable — for users
        return self.name

    def __eq__(self, other) -> bool:
        return self.name == other.name

    def __len__(self) -> int:
        return len(self.name)`}</code></pre>
      </Section>

      <Section title="Inheritance and dataclasses">
        <pre><code>{`class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)        # call parent
        self.breed = breed

    def speak(self):
        return f"{self.name}: Woof!"

# Dataclass (auto __init__, __repr__, __eq__)
from dataclasses import dataclass, field

@dataclass
class User:
    name: str
    email: str
    tags: list[str] = field(default_factory=list)
    active: bool = True

@dataclass(frozen=True)               # immutable + hashable
class Point:
    x: float
    y: float`}</code></pre>
      </Section>

      <h2 id="comprehensions">Comprehensions Cheat Sheet</h2>

      <Section title="All comprehension forms">
        <pre><code>{`# List
[x**2 for x in range(10)]
[x for x in nums if x > 0]
["even" if x%2==0 else "odd" for x in nums]  # ternary IN expression
[x for row in matrix for x in row]           # flatten (outer→inner)

# Dict
{k: v for k, v in d.items() if v > 0}
{u["id"]: u for u in users}                  # index by field

# Set
{word.lower() for word in words}

# Generator (lazy — use with sum/any/all/for)
(x**2 for x in range(1_000_000))             # O(1) memory
sum(x**2 for x in range(100))                # pass directly — one set of parens`}</code></pre>
      </Section>

      <h2 id="stdlib">Standard Library Cheat Sheet</h2>

      <Section title="Essential modules">
        <pre><code>{`import os, sys, re, json, csv, pathlib, datetime, functools, itertools

# pathlib
Path("src") / "app" / "main.py"    # join
Path("f.txt").read_text()           # read
Path("f.txt").write_text("hi")      # write
Path(".").rglob("*.py")             # recursive glob

# json
json.loads(string) / json.load(file)       # parse
json.dumps(obj, indent=2) / json.dump(...)  # serialize

# datetime
datetime.now() / datetime.utcnow()
datetime.strptime("2024-01-15", "%Y-%m-%d")
now.strftime("%Y-%m-%d %H:%M:%S")
now + timedelta(days=7)

# functools
@lru_cache(maxsize=128)             # memoize
partial(fn, arg1)                   # pre-fill args
reduce(fn, iterable)                # fold

# itertools
chain([1,2],[3,4])                  # flatten
islice(gen, 5)                      # lazy slice
groupby(sorted_data, key=fn)        # group consecutive
product([1,2],["a","b"])            # cartesian product

# heapq
heapq.heappush(h, x) / heappop(h)  # min-heap
heapq.nlargest(k, iterable)         # top k
heapq.heapify(list)                 # O(n) in-place

# bisect
bisect.bisect_left(sorted_list, x)  # insertion index
bisect.insort(sorted_list, x)       # insert keeping sorted`}</code></pre>
      </Section>

      <h2 id="async">Async Cheat Sheet</h2>

      <Section title="Core async patterns">
        <pre><code>{`import asyncio

async def fetch(url: str) -> str:   # coroutine function
    await asyncio.sleep(1)          # yield to event loop
    return "data"

# Run from sync context
asyncio.run(fetch("url"))

# Sequential — 2s total
a = await fetch("url_a")
b = await fetch("url_b")

# Concurrent — ~1s total
a, b = await asyncio.gather(fetch("url_a"), fetch("url_b"))

# With error isolation
results = await asyncio.gather(f1(), f2(), return_exceptions=True)

# Background task
task = asyncio.create_task(fetch("url"))
# ... do other work ...
result = await task

# Timeout
result = await asyncio.wait_for(fetch("url"), timeout=5.0)

# Semaphore — limit concurrency
sem = asyncio.Semaphore(10)
async def limited():
    async with sem:
        return await fetch("url")

# Async context manager
async with aiofiles.open("f.txt") as f:
    data = await f.read()

# Async generator
async def stream():
    for i in range(10):
        yield i
        await asyncio.sleep(0.1)

async for item in stream():
    print(item)`}</code></pre>
      </Section>

      <h2 id="testing">Testing Cheat Sheet</h2>

      <Section title="pytest essentials">
        <pre><code>{`# Run
pytest                              # all tests
pytest tests/test_users.py          # file
pytest tests/ -v -x -s -k "auth"   # verbose, stop-on-fail, show print, filter

# Assertions
assert result == expected
assert result == approx(3.14)       # float
assert "error" in message
assert isinstance(result, list)

# Fixtures
@pytest.fixture
def user():
    return {"name": "Juan"}

@pytest.fixture
def db():
    conn = setup_db()
    yield conn                      # test runs here
    conn.close()                    # teardown

@pytest.fixture(scope="session")    # shared across all tests

# Parametrize
@pytest.mark.parametrize("n,exp", [(2, True), (3, False)])
def test_even(n, exp):
    assert is_even(n) == exp

# Exceptions
with pytest.raises(ValueError, match="must be positive"):
    create_user(age=-1)

# Mocking
from unittest.mock import Mock, patch

mock = Mock()
mock.get_user.return_value = {"id": 1}
mock.get_user.assert_called_with(1)

@patch("myapp.services.send_email")
def test_signup(mock_send):
    signup("juan@ex.com")
    mock_send.assert_called_once()

# pytest-mock
def test_fn(mocker):
    mock = mocker.patch("myapp.module.fn")
    mock.return_value = 42`}</code></pre>
      </Section>

      <h2 id="typing">Typing Cheat Sheet</h2>

      <Section title="Type annotations">
        <pre><code>{`from typing import Optional, Union, Literal, TypeVar, Protocol, TypedDict, Callable, Any

# Basic
x: int = 5
name: str | None = None              # Python 3.10+
items: list[int] = []
mapping: dict[str, int] = {}
pair: tuple[int, str] = (1, "a")
any_ints: tuple[int, ...] = (1,2,3) # variable length

# Old style (3.8 and below)
from typing import List, Dict, Tuple, Optional
name: Optional[str] = None           # = str | None

# Special forms
Status = Literal["ok", "error", "pending"]
MAX: Final[int] = 100

# Protocol — structural typing
class Drawable(Protocol):
    def draw(self) -> None: ...

# TypedDict
class UserDict(TypedDict):
    name: str
    email: str

# TypeVar
T = TypeVar("T")
def first(lst: list[T]) -> T: return lst[0]

# Callable
Handler = Callable[[str, int], bool]

# Function return
def fn() -> None: ...               # returns nothing
def fn() -> NoReturn: raise ...     # never returns`}</code></pre>
      </Section>

      <h2 id="js-ts-comparison">Python vs JS/TS Comparison</h2>

      <Section title="Side-by-side reference">
        <pre><code>{`// JavaScript / TypeScript          # Python

// Variables
const x = 10                        x = 10
let y = 20                          y = 20
null / undefined                    None
true / false                        True / False

// String interpolation
\`Hello \${name}\`                    f"Hello {name}"

// Equality
===                                 ==  (Python has no ===)
!==                                 !=
obj1 === obj2                        obj1 is obj2  (identity)

// Types
string / number / boolean           str / int|float / bool
Array<string>                       list[str]
Record<string,number>               dict[str, int]
string | null                       str | None
interface Drawable { draw(): void } class Drawable(Protocol): def draw()->None: ...
type Status = "ok" | "error"        Status = Literal["ok","error"]
readonly x: number                  Final[int]
enum Direction { Up, Down }          class Direction(Enum): UP="up"

// Functions
function add(a: number): number {}  def add(a: int) -> int:
const add = (a) => a + 1           add = lambda a: a + 1
function fn(...args) {}             def fn(*args):
function fn({ a, b }) {}            def fn(**kwargs):
async function fn() {}             async def fn():
await Promise.all([f1(), f2()])     await asyncio.gather(f1(), f2())

// Classes
class Dog extends Animal           class Dog(Animal):
  constructor() { super() }            def __init__(self): super().__init__()
  static create() {}                   @classmethod / @staticmethod
  get name() {}                        @property
  #private                             self.__private  (name-mangled)

// Error handling
try {} catch(e) {} finally {}       try: ... except E as e: ... finally:
throw new Error("msg")              raise ValueError("msg")
class AppError extends Error        class AppError(Exception):

// Modules
import { fn } from './mod'          from mod import fn
import * as mod from './mod'        import mod
export default fn                   # no default export — just import by name
package.json dependencies           pyproject.toml / requirements.txt
npm install package                  pip install package
node_modules/                        .venv/

// Testing
jest.fn()                           Mock()
jest.spyOn(obj, "method")           patch.object(obj, "method")
jest.mock("./module")               @patch("myapp.module")
expect(x).toBe(y)                   assert x == y
expect(fn).toHaveBeenCalledWith(1)  mock.assert_called_with(1)
beforeEach(() => setup())           @pytest.fixture (function scope)
beforeAll(() => setup())            @pytest.fixture(scope="session")`}</code></pre>
      </Section>

      <h2 id="glossary">Glossary (60+ Terms)</h2>

      <GlossaryEntry term="__dunder__" def="Double-underscore methods (magic/special methods) — define Python operator/built-in behaviour. __init__, __repr__, __add__." />
      <GlossaryEntry term="__init__" def="Constructor — called when an instance is created. Initialises instance attributes via self." />
      <GlossaryEntry term="__repr__" def="Unambiguous string representation for developers. Used in REPL, inside containers. Falls back to __str__ if missing." />
      <GlossaryEntry term="__str__" def="Human-readable string. Used by print(), str(), f-strings." />
      <GlossaryEntry term="__name__" def="'__main__' when a file is run directly; the module's dotted name when imported." />
      <GlossaryEntry term="__all__" def="List of names exported when 'from module import *' is used." />
      <GlossaryEntry term="ASGI" def="Asynchronous Server Gateway Interface — async successor to WSGI. Protocol for Python async web apps. FastAPI is ASGI; Uvicorn is an ASGI server." />
      <GlossaryEntry term="callable" def="Any object that can be called with (). Functions, methods, classes, and objects with __call__ are callable." />
      <GlossaryEntry term="classmethod" def="Method that receives the class (cls) as first arg. Used for factory/alternative constructors. Decorator: @classmethod." />
      <GlossaryEntry term="closure" def="Function that captures variables from its enclosing scope. Captured vars live in __closure__ cells and persist after outer function returns." />
      <GlossaryEntry term="comprehension" def="Concise syntax for building a list/dict/set/generator: [expr for x in iterable if cond]." />
      <GlossaryEntry term="context manager" def="Object with __enter__ and __exit__ methods. Used with 'with' statement to guarantee setup/teardown." />
      <GlossaryEntry term="coroutine" def="Function defined with async def. Calling it returns a coroutine object (doesn't run). Must be awaited or scheduled as a Task." />
      <GlossaryEntry term="CPython" def="The reference Python interpreter (written in C). The standard implementation. Others: PyPy, Jython, MicroPython." />
      <GlossaryEntry term="dataclass" def="Class decorated with @dataclass that auto-generates __init__, __repr__, __eq__ from field type annotations." />
      <GlossaryEntry term="decorator" def="Function that takes a function and returns a replacement. @syntax is sugar for fn = decorator(fn)." />
      <GlossaryEntry term="defaultdict" def="dict subclass that calls a factory function for missing keys instead of raising KeyError." />
      <GlossaryEntry term="deque" def="Double-ended queue from collections. O(1) append/pop from both ends. Use for BFS queues instead of list.pop(0)." />
      <GlossaryEntry term="descriptor" def="Object implementing __get__/__set__/__delete__ that controls attribute access on another class. Properties, classmethods, staticmethods are descriptors." />
      <GlossaryEntry term="duck typing" def="'If it walks like a duck and quacks like a duck, it's a duck.' Python checks capabilities (methods), not class hierarchy." />
      <GlossaryEntry term="event loop" def="Scheduler for async coroutines. Picks from the ready queue, runs until await, switches. Start with asyncio.run()." />
      <GlossaryEntry term="f-string" def="Format string: f'Hello {name}'. Evaluates expressions inside {}. Python 3.6+. Preferred over .format() and %." />
      <GlossaryEntry term="Final" def="Type annotation marking a variable as immutable — static checkers prevent reassignment. From typing import Final." />
      <GlossaryEntry term="frozenset" def="Immutable set. Hashable — can be a dict key or set member." />
      <GlossaryEntry term="GIL" def="Global Interpreter Lock. CPython mutex allowing only one thread to execute bytecode at a time. Threading = I/O concurrency, not CPU parallelism." />
      <GlossaryEntry term="generator" def="Function with yield. Lazy iterator — produces values on demand, O(1) memory. Pauses at yield, resumes on next()." />
      <GlossaryEntry term="heapq" def="Min-heap module. heappush/heappop are O(log n). Negate values for max-heap. heapify converts list in O(n)." />
      <GlossaryEntry term="identity map" def="SQLAlchemy session cache: querying the same PK twice returns the same Python object." />
      <GlossaryEntry term="iterable" def="Object that can return an iterator — implements __iter__. Lists, dicts, strings, ranges. Can be iterated multiple times." />
      <GlossaryEntry term="iterator" def="Object with __iter__ and __next__. Single-use — raises StopIteration when exhausted." />
      <GlossaryEntry term="LEGB" def="Scope resolution order: Local → Enclosing → Global → Built-in." />
      <GlossaryEntry term="Literal" def="Type annotation constraining to specific values: Literal['ok','error']. Like TypeScript string unions." />
      <GlossaryEntry term="lru_cache" def="Least Recently Used cache decorator. Memoizes function results. @functools.lru_cache(maxsize=128)." />
      <GlossaryEntry term="metaclass" def="Class whose instances are classes. type is the default metaclass. Advanced — used in ORMs, frameworks." />
      <GlossaryEntry term="mixin" def="Small class providing specific functionality meant to be mixed into other classes via multiple inheritance, not used standalone." />
      <GlossaryEntry term="monkey patching" def="Replacing a method or attribute of a class/module at runtime. Used in testing (patch) or hot-fixing libraries." />
      <GlossaryEntry term="MRO" def="Method Resolution Order — C3 linearization. Order Python searches class hierarchy for a method. See ClassName.__mro__." />
      <GlossaryEntry term="mutable" def="Object whose state can be changed after creation. list, dict, set, user-defined objects are mutable." />
      <GlossaryEntry term="name mangling" def="__attr on a class becomes _ClassName__attr. Prevents accidental override in subclasses. Not true privacy." />
      <GlossaryEntry term="namedtuple" def="Immutable tuple with named fields. collections.namedtuple('Point', ['x','y']). Lighter than dataclass." />
      <GlossaryEntry term="namespace" def="Mapping from names to objects. Each module, class, and function call has its own namespace." />
      <GlossaryEntry term="None" def="Singleton null value, type NoneType. Functions without explicit return return None. Compare with 'is None'." />
      <GlossaryEntry term="NoReturn" def="Return type annotation for functions that never return (always raise or loop forever)." />
      <GlossaryEntry term="Optional[X]" def="Shorthand for Union[X, None]. Value is X or None. Python 3.10+: X | None." />
      <GlossaryEntry term="partial" def="functools.partial — creates a new function with some args pre-filled: partial(fn, arg1)." />
      <GlossaryEntry term="pickle" def="Python's binary serialisation protocol. Can serialise most Python objects. NOT secure with untrusted data." />
      <GlossaryEntry term="Protocol" def="Structural subtyping from typing. A class satisfies a Protocol by having the right methods — no inheritance required. Like TypeScript interfaces." />
      <GlossaryEntry term="Pydantic" def="Runtime validation library using type annotations. BaseModel subclasses validate, coerce, and serialise data. Standard in FastAPI." />
      <GlossaryEntry term="PyPI" def="Python Package Index — pypi.org. Central repository for Python packages. Installed with pip." />
      <GlossaryEntry term="reference counting" def="Primary memory management. Each object tracks how many references point to it. Count → 0 = immediate deallocation." />
      <GlossaryEntry term="REPL" def="Read-Eval-Print Loop. Interactive Python session. Run with 'python' in terminal." />
      <GlossaryEntry term="repository pattern" def="Abstraction layer between business logic and data access. Exposes CRUD interface — caller doesn't know DB type." />
      <GlossaryEntry term="semaphore" def="asyncio.Semaphore(n) — limits concurrent access to n. async with sem: ... to acquire/release." />
      <GlossaryEntry term="sentinel" def="Special value signalling absence or end-of-sequence. None is a common sentinel. StopIteration is the iterator sentinel." />
      <GlossaryEntry term="session" def="SQLAlchemy unit-of-work. Tracks objects and flushes changes on commit. One per request in web apps." />
      <GlossaryEntry term="shallow copy" def="New container, shared nested object references. b = a.copy() or b = a[:]. Mutations to nested objects affect both." />
      <GlossaryEntry term="staticmethod" def="Method with no self or cls. Plain function scoped to the class namespace. @staticmethod." />
      <GlossaryEntry term="StopIteration" def="Exception raised by next() when an iterator is exhausted. for loops catch it automatically." />
      <GlossaryEntry term="TypedDict" def="Type-annotates a plain dict's key/value shape. No runtime enforcement — type checking only." />
      <GlossaryEntry term="TypeVar" def="Placeholder type for generics: T = TypeVar('T'). Used in generic functions and classes." />
      <GlossaryEntry term="unpacking" def="Extracting values from sequences/dicts: a, b = (1, 2). Star unpacking: a, *rest = [1,2,3,4]." />
      <GlossaryEntry term="venv" def="Virtual environment — isolated Python installation with its own packages. python -m venv .venv." />
      <GlossaryEntry term="walrus operator" def=":= assigns and returns a value in an expression. if (n := len(data)) > 10: — avoids computing twice." />
      <GlossaryEntry term="weakref" def="Reference that doesn't increment reference count. Object can still be garbage collected. weakref.ref(obj)." />
      <GlossaryEntry term="yield" def="Suspends a generator function, returns a value to the caller, and resumes on next next() call." />
      <GlossaryEntry term="yield from" def="Delegates to a sub-iterable: yield from iterable. Forwards send() and throw() correctly." />
    </div>
  );
}
