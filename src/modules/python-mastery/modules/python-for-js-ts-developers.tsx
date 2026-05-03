import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const mentalModelDiagram = String.raw`flowchart LR
    subgraph JS["JavaScript / TypeScript habits"]
        J1["Event loop always present"]
        J2["Promises auto-schedule work"]
        J3["Braces define blocks"]
        J4["null and undefined both exist"]
        J5["npm / package.json mindset"]
    end

    subgraph PY["Python habits"]
        P1["Event loop is opt-in"]
        P2["Coroutines are lazy until awaited"]
        P3["Indentation defines blocks"]
        P4["None is the only null-like value"]
        P5["pip / pyproject.toml mindset"]
    end`;

export const toc: TocItem[] = [
  { id: "mental-model", title: "Shifting the Mental Model", level: 2 },
  { id: "syntax-differences", title: "Syntax Differences", level: 2 },
  { id: "type-mapping", title: "Type Mapping", level: 2 },
  { id: "collections-mapping", title: "Collections Mapping", level: 2 },
  { id: "functions", title: "Functions", level: 2 },
  { id: "classes", title: "Classes and OOP", level: 2 },
  { id: "modules", title: "Modules and Packages", level: 2 },
  { id: "error-handling", title: "Error Handling", level: 2 },
  { id: "async", title: "Async", level: 2 },
  { id: "typing-systems", title: "Typing Systems", level: 2 },
  { id: "testing", title: "Testing", level: 2 },
  { id: "toolchain", title: "Toolchain", level: 2 },
  { id: "mental-model-mistakes", title: "Common Mental Model Mistakes", level: 2 },
  { id: "js-habits-to-break", title: "JS Habits to Break", level: 2 },
];

export default function PythonForJsTsDevelopers() {
  return (
    <div className="article-content">
      <p>
        You already know how to program. This module is not about learning programming
        from scratch — it is about translating what you already know in JavaScript and
        TypeScript into Python. Every section is side-by-side: what you write in JS/TS,
        what the Python equivalent is, and where the mental models diverge.
      </p>

      <h2 id="mental-model">Shifting the Mental Model</h2>

      <MermaidDiagram
        chart={mentalModelDiagram}
        title="Mental Model Shift"
        caption="The fastest way to get good at Python is to notice which JavaScript assumptions no longer hold, especially around async, nullability, and syntax boundaries."
        minHeight={420}
      />

      <h2 id="syntax-differences">Syntax Differences</h2>

      <pre><code>{`// JavaScript / TypeScript               # Python

// Variable declaration
const x = 10;                            x = 10
let y = 20;                              y = 20
var z = 30;   // avoid                   # no var equivalent

// No statement terminator
const a = 1;                             a = 1         # no semicolon
                                         # line continuation:
                                         result = (a + b +
                                                   c + d)

// Block delimiters
if (x > 0) {                             if x > 0:
  doSomething();                             do_something()
}                                        # 4 spaces, no braces

// Null/undefined
const name = null;                       name = None
if (name === null) {}                    if name is None:
if (name === undefined) {}               if name is None:   # same!
if (name != null) {}                     if name is not None:

// Boolean literals
const flag = true;                       flag = True
const off = false;                       off = False

// Ternary
const label = x > 0 ? "pos" : "neg";   label = "pos" if x > 0 else "neg"

// String types
const s = \`Hello \${name}\`;             s = f"Hello {name}"
const s = "hello";                       s = "hello"   # single or double, same
const s = \`multi
line\`;                                   s = """multi
                                         line"""

// typeof / type check
typeof x === "string"                    isinstance(x, str)
Array.isArray(x)                         isinstance(x, list)

// Logical operators
&&                                        and
||                                        or
!                                         not

// Short-circuit default
const name = input || "Anonymous";      name = user_input or "Anonymous"
# Gotcha: 0 and "" are falsy in both — but Python also treats [] and {} as falsy

// Nullish coalescing
const name = input ?? "Anonymous";      # no ?? — use: name = input if input is not None else "Anonymous"
                                         # or:         name = input or "Anonymous"  (if 0/"" also means missing)

// Optional chaining
user?.profile?.avatar                    # no ?. — use:  getattr(user, "profile", None)
                                         # or:           user and user.profile and user.profile.avatar`}</code></pre>

      <h2 id="type-mapping">Type Mapping</h2>

      <pre><code>{`// TypeScript                            # Python

string                                   str
number                                   int  or  float
boolean                                  bool
null                                     None
undefined                                None  (no undefined!)
any                                      Any  (from typing)
unknown                                  object
never                                    NoReturn  (from typing)
void                                     None  (return type)

// Type narrowing
if (typeof x === "string") { ... }       if isinstance(x, str): ...
if (x instanceof User) { ... }           if isinstance(x, User): ...

// Non-null assertion
user!.name                               user.name  # Python trusts you — no !
                                         # or add a runtime check: assert user is not None`}</code></pre>

      <h2 id="collections-mapping">Collections Mapping</h2>

      <pre><code>{`// JavaScript                            # Python

// Array → list
const arr = [1, 2, 3];                  arr = [1, 2, 3]
arr.push(4);                            arr.append(4)
arr.pop();                              arr.pop()
arr.length;                             len(arr)
arr[0];                                 arr[0]
arr.slice(1, 3);                        arr[1:3]
arr.includes(x);                        x in arr
arr.indexOf(x);                         arr.index(x)
arr.findIndex(fn);                      next((i for i,v in enumerate(arr) if fn(v)), -1)
arr.find(fn);                           next((v for v in arr if fn(v)), None)
arr.map(fn);                            [fn(x) for x in arr]
arr.filter(fn);                         [x for x in arr if fn(x)]
arr.reduce(fn, init);                   functools.reduce(fn, arr, init)
arr.every(fn);                          all(fn(x) for x in arr)
arr.some(fn);                           any(fn(x) for x in arr)
arr.flat(1);                            [x for sub in arr for x in sub]
[...arr1, ...arr2];                     arr1 + arr2  or  [*arr1, *arr2]
arr.sort((a,b) => a-b);                arr.sort()  or  sorted(arr)

// Object → dict
const obj = { a: 1, b: 2 };            obj = {"a": 1, "b": 2}
obj.a;                                  obj["a"]  or  obj.get("a")
obj["a"];                               obj["a"]
delete obj.a;                           del obj["a"]
Object.keys(obj);                       obj.keys()
Object.values(obj);                     obj.values()
Object.entries(obj);                    obj.items()
{ ...obj, c: 3 };                       {**obj, "c": 3}  or  obj | {"c": 3}
"a" in obj;                             "a" in obj   # checks keys
Object.assign({}, obj);                 obj.copy()  or  {**obj}

// Map → dict (usually)
const m = new Map();                    d = {}
m.set("key", val);                      d["key"] = val
m.get("key");                           d.get("key")
m.has("key");                           "key" in d
m.size;                                 len(d)

// Set → set
const s = new Set([1,2,3]);             s = {1, 2, 3}
s.add(4);                               s.add(4)
s.has(x);                               x in s
s.size;                                 len(s)

// Tuple (no JS equivalent)
//                                      point = (1, 2)  — immutable, hashable`}</code></pre>

      <h2 id="functions">Functions</h2>

      <pre><code>{`// JavaScript / TypeScript               # Python

// Declaration
function add(a, b) { return a + b; }    def add(a, b): return a + b

// Arrow / lambda
const add = (a, b) => a + b;           add = lambda a, b: a + b
const double = x => x * 2;             double = lambda x: x * 2

// Default parameters
function greet(name = "World") {}       def greet(name="World"):

// Rest / *args
function sum(...nums) {                 def total(*args):
  return nums.reduce((a,b)=>a+b, 0);       return sum(args)
}

// Destructuring / **kwargs
function fn({ a, b, c }) {}            def fn(a, b, c):  # explicit
function fn(options = {}) {}            def fn(**kwargs):  # catch-all

// Keyword-only args (no JS equivalent)
                                        def fn(a, b, *, admin=False):
                                        # admin MUST be passed as keyword

// Positional-only (no JS equivalent)
                                        def fn(a, b, /):
                                        # a and b cannot be passed as keyword

// IIFE
(function() { ... })();                (lambda: ...)()   # rare in Python
                                        # usually just define a function or use if __name__

// Hoisting — JS hoists function declarations
sayHi();                                # NameError — Python does NOT hoist
function sayHi() {}                     def say_hi(): ...  # must define first

// Closures — both support them
function counter() {                    def make_counter():
  let count = 0;                            count = 0
  return () => count++;                     def increment():
}                                               nonlocal count  # required!
                                                count += 1
                                                return count
                                            return increment

// Generator functions
function* range(n) {                    def countdown(n):
  for (let i = 0; i < n; i++)              while n > 0:
    yield i;                                   yield n
}                                               n -= 1`}</code></pre>

      <h2 id="classes">Classes and OOP</h2>

      <pre><code>{`// TypeScript                            # Python

class Animal {                           class Animal:
  static count = 0;                          count = 0           # class attribute

  constructor(name: string) {                def __init__(self, name: str):
    this.name = name;                            self.name = name
    Animal.count++;                              Animal.count += 1
  }

  speak(): string {                          def speak(self) -> str:
    return \`\${this.name} speaks\`;                return f"{self.name} speaks"
  }

  static create(name: string) {              @classmethod
    return new Animal(name);                 def create(cls, name: str):
  }                                              return cls(name)

  static validate(n: string) {              @staticmethod
    return n.length > 0;                    def validate(n: str) -> bool:
  }                                             return len(n) > 0

  get upperName() {                         @property
    return this.name.toUpperCase();         def upper_name(self) -> str:
  }                                             return self.name.upper()

  set upperName(v: string) {               @upper_name.setter
    this.name = v.toLowerCase();            def upper_name(self, v: str):
  }                                             self.name = v.lower()
}

class Dog extends Animal {                  class Dog(Animal):
  breed: string;                                breed: str

  constructor(name: string, breed: string) {    def __init__(self, name: str, breed: str):
    super(name);                                    super().__init__(name)
    this.breed = breed;                             self.breed = breed
  }
}

// Private fields
class User {                                class User:
  #password: string;                            def __init__(self, pwd: str):
  constructor(pwd: string) {                        self.__password = pwd  # name-mangled
    this.#password = pwd;                     # Python has no true private
  }                                           # Single _ = "please don't touch"
}                                             # Double __ = name-mangled

// Interface (structural)
interface Drawable {                        from typing import Protocol
  draw(): void;                             class Drawable(Protocol):
}                                               def draw(self) -> None: ...

// Type alias
type Status = "ok" | "error";              from typing import Literal
                                            Status = Literal["ok", "error"]`}</code></pre>

      <h2 id="modules">Modules and Packages</h2>

      <pre><code>{`// JavaScript / TypeScript               # Python

// Named import
import { fn, Cls } from './module';      from module import fn, Cls

// Default import (no Python equivalent)
import Module from './module';           import module  # then: module.fn()

// Namespace import
import * as utils from './utils';        import utils  # then: utils.fn()

// Re-export (index file pattern)
// index.ts: export { fn } from './fn'   # __init__.py: from .fn import fn

// Dynamic import
const mod = await import('./heavy');     # lazy import inside function:
                                         def use_heavy():
                                             import heavy_module
                                             return heavy_module.process()

// No default export in Python
// Everything is imported by name

// Circular imports
// JS: usually works (partial loading)   # Python: often causes ImportError
                                         # Fix: move shared code to a third module

// package.json vs pyproject.toml
{                                        [project]
  "name": "my-app",                      name = "my-app"
  "version": "1.0.0",                    version = "1.0.0"
  "dependencies": {                      dependencies = [
    "express": "^4.18.0"                    "fastapi>=0.100",
  },                                     ]
  "devDependencies": {                   [project.optional-dependencies]
    "jest": "^29.0.0"                    dev = ["pytest>=7"]
  }
}

// npm vs pip
npm install express                      pip install fastapi
npm install --save-dev jest              pip install pytest  (or in pyproject.toml dev deps)
npm run build                            python -m build
npx tsc                                  python -m mypy src/`}</code></pre>

      <h2 id="error-handling">Error Handling</h2>

      <pre><code>{`// JavaScript                            # Python

// try/catch/finally
try {                                    try:
  doSomething();                             do_something()
} catch (e) {                            except ValueError as e:
  console.error(e);                          print(e)
} finally {                              except (TypeError, KeyError) as e:
  cleanup();                                 print(e)
}                                        else:
                                             # only if no exception
                                         finally:
                                             cleanup()

// Throw
throw new Error("message");              raise ValueError("message")
throw new TypeError("bad type");         raise TypeError("bad type")

// Custom error
class AppError extends Error {          class AppError(Exception):
  constructor(msg, code) {                  def __init__(self, msg, code=400):
    super(msg);                                 super().__init__(msg)
    this.code = code;                           self.code = code
  }
}

// Re-throw
try {                                    try:
  ...                                        ...
} catch (e) {                            except Exception as e:
  log(e);                                    log(e)
  throw e;                                   raise   # re-raises with original traceback
}

// Error types comparison
Error → Exception
TypeError → TypeError
RangeError → ValueError
ReferenceError → NameError / UnboundLocalError
SyntaxError → SyntaxError
// JS has no:                            FileNotFoundError (OSError subclass)
                                         KeyError (dict missing key)
                                         IndexError (list out of range)
                                         AttributeError (no such attribute)`}</code></pre>

      <h2 id="async">Async</h2>

      <pre><code>{`// JavaScript                            # Python

// The big difference:
// JS: event loop ALWAYS running         # Python: event loop is opt-in
// JS: async/await for callback ergonomics # Python: async = actual concurrency model

// async function
async function fetchUser(id) {           async def fetch_user(id: int) -> dict:
  const data = await getUser(id);           data = await get_user(id)
  return data;                              return data
}

// Calling
fetchUser(1);                            fetch_user(1)
// returns Promise (auto-scheduled)      # returns coroutine (NOT running)
await fetchUser(1);                      await fetch_user(1)  # actually runs it
                                         asyncio.run(fetch_user(1))  # from sync code

// Promise.all
await Promise.all([f1(), f2()]);         await asyncio.gather(f1(), f2())

// Promise.allSettled
await Promise.allSettled([f1(),f2()]);   await asyncio.gather(f1(),f2(), return_exceptions=True)

// Promise.race
await Promise.race([f1(), f2()]);        done, _ = await asyncio.wait(
                                             [asyncio.create_task(f1()),
                                              asyncio.create_task(f2())],
                                             return_when=asyncio.FIRST_COMPLETED)

// setTimeout
await new Promise(r => setTimeout(r, 1000)); await asyncio.sleep(1)

// Concurrent tasks
const [a, b] = await Promise.all([      a, b = await asyncio.gather(
  fetchA(), fetchB()                         fetch_a(), fetch_b()
]);                                      )

// Background task
fetch("url");                            asyncio.create_task(fetch("url"))
// fire and forget                       # but await the task later!

// Async iteration
for await (const item of stream) {}      async for item in stream:
                                             ...`}</code></pre>

      <h2 id="typing-systems">Typing Systems</h2>

      <pre><code>{`// TypeScript                            # Python

// Both are optional at runtime — only static tools check them

// Key difference:
// TypeScript: enforced at BUILD time by tsc
// Python: NEVER enforced by the interpreter — mypy/pyright only

// Basic annotations
const name: string = "Juan";            name: str = "Juan"
let age: number = 30;                   age: int = 30
const flag: boolean = true;             flag: bool = True

// Optional
name?: string                           name: str | None = None

// Union
string | number                         str | int  or  Union[str, int]

// Interface (structural)
interface User {                         from typing import Protocol
  name: string;                          class User(Protocol):
  greet(): string;                           name: str
}                                            def greet(self) -> str: ...

// Generics
function first<T>(arr: T[]): T         T = TypeVar("T")
                                        def first(arr: list[T]) -> T:

// Readonly / Final
readonly name: string                   name: Final[str]

// Enum
enum Status { Ok, Error }               from enum import Enum
                                        class Status(Enum):
                                            OK = "ok"
                                            ERROR = "error"

// Record
Record<string, number>                  dict[str, int]

// Partial<T>
Partial<User>                           # no built-in; use Optional fields or TypedDict(total=False)

// Non-null assertion
user!.name                              # no equivalent — add assert or check

// Runtime validation
// zod / yup                            # pydantic BaseModel`}</code></pre>

      <h2 id="testing">Testing</h2>

      <pre><code>{`// Jest / Vitest                         # pytest

// File naming
*.test.ts / *.spec.ts                   test_*.py / *_test.py

// Test function
test("name", () => {                    def test_name():
  expect(add(1,2)).toBe(3);                assert add(1, 2) == 3
});

// describe
describe("UserService", () => {         class TestUserService:
  test("create", () => { ... });            def test_create(self): ...
});

// Setup/teardown
beforeEach(() => { setup(); });         @pytest.fixture  (function scope)
afterEach(() => { teardown(); });       yield in fixture (after yield = teardown)
beforeAll(() => { setup(); });          @pytest.fixture(scope="session")

// Mock
const mockFn = jest.fn();              mock_fn = Mock()
mockFn.mockReturnValue(42);            mock_fn.return_value = 42
expect(mockFn).toHaveBeenCalledWith(1); mock_fn.assert_called_with(1)
jest.spyOn(service, "method");         patch.object(service, "method")
jest.mock("./module");                  @patch("myapp.module")

// Assertions
expect(x).toBe(y);                     assert x == y
expect(x).toEqual(y);                  assert x == y  (same — Python == is deep)
expect(x).toBeTruthy();                assert x
expect(arr).toHaveLength(3);           assert len(arr) == 3
expect(fn).toThrow(Error);             with pytest.raises(ValueError):

// Parametrize
test.each([[1,true],[2,false]])(        @pytest.mark.parametrize("n,exp", [
  "test %i", (n, exp) => { ... }           (1, True), (2, False)
);                                      ])
                                        def test_fn(n, exp): ...

// Coverage
jest --coverage                         pytest --cov=myapp --cov-report=term-missing`}</code></pre>

      <h2 id="toolchain">Toolchain</h2>

      <ArticleTable caption="This is the quickest way to translate your JavaScript toolchain instincts into the Python ecosystem without forcing a fake one-to-one mapping." minWidth={920}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>JavaScript / TypeScript</th>
              <th>Python</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Runtime</strong></td><td>Node.js / Deno / Bun</td><td>CPython 3.11+</td></tr>
            <tr><td><strong>Package manager</strong></td><td>npm / pnpm / yarn</td><td>pip / uv / poetry</td></tr>
            <tr><td><strong>Config file</strong></td><td><code>package.json</code></td><td><code>pyproject.toml</code></td></tr>
            <tr><td><strong>Lock file</strong></td><td><code>package-lock.json</code> / <code>pnpm-lock.yaml</code></td><td><code>poetry.lock</code> / <code>uv.lock</code></td></tr>
            <tr><td><strong>Env isolation</strong></td><td><code>node_modules/</code> per project</td><td><code>.venv/</code> via <code>python -m venv</code></td></tr>
            <tr><td><strong>Type checker</strong></td><td><code>tsc</code> enforced at build</td><td><code>mypy</code> / <code>pyright</code> optional</td></tr>
            <tr><td><strong>Linter</strong></td><td>ESLint / Biome</td><td>ruff / flake8</td></tr>
            <tr><td><strong>Formatter</strong></td><td>Prettier / Biome</td><td>black / ruff format</td></tr>
            <tr><td><strong>Test runner</strong></td><td>Jest / Vitest / Playwright</td><td>pytest</td></tr>
            <tr><td><strong>Web framework</strong></td><td>Express / Fastify / Next.js</td><td>FastAPI / Django / Flask</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="mental-model-mistakes">Common Mental Model Mistakes</h2>

      <h3>1. Forgetting that assignment creates a reference, not a copy</h3>
      <pre><code>{`// JS — objects are by reference too, but primitives are by value
const a = [1, 2, 3];
const b = a;
b.push(4);
console.log(a); // [1, 2, 3, 4] — same in JS!

# Python — identical behaviour for mutables
a = [1, 2, 3]
b = a
b.append(4)
print(a)  # [1, 2, 3, 4]

# Fix: b = a.copy()  or  b = a[:]`}</code></pre>

      <h3>2. Using == where you expect ===</h3>
      <pre><code>{`// JS: 0 == false → true (coercion), 0 === false → false
// Python: no coercion
0 == False   # True  — bool IS a subclass of int in Python
0 is False   # False — different objects
"" == False  # False — no coercion in Python

# Python == compares values, no type coercion EXCEPT for numeric types
1 == 1.0     # True  — int and float compare numerically
1 == "1"     # False — no coercion`}</code></pre>

      <h3>3. Treating None like null and undefined separately</h3>
      <pre><code>{`// JS has BOTH null (intentional absence) and undefined (unset)
let x;        // undefined
let y = null; // null
if (x == null) { ... }  // catches both

# Python has ONLY None
x = None
if x is None: ...   # always use "is" for None comparison
# "is" not "==" — although == None works, it's un-Pythonic`}</code></pre>

      <h3>4. Expecting coroutines to auto-start like Promises</h3>
      <pre><code>{`// JS Promise — starts immediately when created
fetch("url");  // network request fires!

# Python coroutine — does NOTHING until awaited
fetch("url")   # returns coroutine object, no network call!

# Must await:
await fetch("url")
# Or schedule as a task:
asyncio.create_task(fetch("url"))`}</code></pre>

      <h3>5. Chaining like Array methods</h3>
      <pre><code>{`// JS — method chaining is idiomatic
const result = arr
  .filter(x => x > 0)
  .map(x => x * 2)
  .reduce((a, b) => a + b, 0);

# Python — no chaining; write as separate steps or comprehensions
positives = [x for x in arr if x > 0]
doubled = [x * 2 for x in positives]
total = sum(doubled)

# Or in one expression:
total = sum(x * 2 for x in arr if x > 0)   # generator — clean and efficient`}</code></pre>

      <h3>6. Using camelCase naming</h3>
      <pre><code>{`// JavaScript
const getUserById = (userId) => {};
class userProfile {}

# Python — always snake_case for functions/vars, PascalCase for classes
def get_user_by_id(user_id): ...
class UserProfile: ...

# Violation is not a syntax error but is noticed immediately by Python developers`}</code></pre>

      <h3>7. Destructuring instead of unpacking</h3>
      <pre><code>{`// JS destructuring
const { name, email } = user;
const [first, ...rest] = arr;

# Python unpacking (different syntax, same concept)
name = user["name"]
email = user["email"]
# Or use dataclass/Pydantic for dot access: user.name

first, *rest = arr               # star unpacking
a, b = b, a                      # swap (no temp variable needed)
x, y = point                     # unpack any 2-element sequence
for key, value in d.items(): ... # unpack tuples in loops`}</code></pre>

      <h3>8. Array spread vs list concatenation</h3>
      <pre><code>{`// JS
const combined = [...arr1, ...arr2, extra];

# Python
combined = arr1 + arr2 + [extra]   # creates new list
combined = [*arr1, *arr2, extra]   # also valid (3.5+)
arr1.extend(arr2)                   # in-place (mutates arr1)

# Dict spread
// const merged = { ...obj1, ...obj2 };
merged = {**obj1, **obj2}          # Python 3.5+
merged = obj1 | obj2               # Python 3.9+`}</code></pre>

      <h2 id="js-habits-to-break">JS Habits to Break</h2>

      <pre><code>{`# ❌ Semicolons at end of lines
x = 10;        # valid Python but un-Pythonic — remove them

# ❌ Curly braces around single-line blocks
if x > 0: { print(x) }   # SyntaxError in Python

# ❌ Checking truthiness with === false or === null
if (result === null) { ... }    # JS
if result is None: ...          # Python — use "is", not ==

# ❌ String concatenation in loops
result = ""
for word in words:
    result += word   # O(n²) — creates new string each time
# Fix:
result = "".join(words)   # O(n)

# ❌ Using list.pop(0) as a queue
queue = [1, 2, 3]
item = queue.pop(0)   # O(n) — shifts all elements
# Fix:
from collections import deque
queue = deque([1, 2, 3])
item = queue.popleft()   # O(1)

# ❌ Forgetting indentation scope
def outer():
    x = 1
    def inner():
        x += 1   # UnboundLocalError! Python sees assignment → treats x as local
    # Fix:
    def inner():
        nonlocal x
        x += 1

# ❌ Mutable default arguments
def fn(items=[]):   # shared across ALL calls
    items.append(1)
    return items
# Fix: def fn(items=None): if items is None: items = []

# ❌ Using type() instead of isinstance()
if type(x) == int: ...   # doesn't match subclasses
if isinstance(x, int): ...  # correct — matches subclasses too

# ❌ Not using context managers for file I/O
f = open("file.txt")
data = f.read()
f.close()   # if read() raises, close() never called!
# Fix:
with open("file.txt") as f:
    data = f.read()   # always closed

# ❌ dict["key"] when key might be missing
user["email"]   # KeyError if missing
# Fix:
user.get("email", "")   # returns "" if missing`}</code></pre>
    </div>
  );
}
