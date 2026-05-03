import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "defining-functions", title: "Defining Functions", level: 2 },
  { id: "return-values", title: "Return Values", level: 2 },
  { id: "arguments", title: "Positional and Keyword Arguments", level: 2 },
  { id: "default-parameters", title: "Default Parameters", level: 2 },
  { id: "args-kwargs", title: "*args and **kwargs", level: 2 },
  { id: "argument-order", title: "Argument Order Rules", level: 2 },
  { id: "lambda", title: "Lambda Functions", level: 2 },
  { id: "scope-legb", title: "Scope and the LEGB Rule", level: 2 },
  { id: "closures", title: "Closures", level: 2 },
  { id: "mutable-default-args", title: "Mutable Default Argument Pitfall", level: 2 },
  { id: "passing-model", title: "How Python Passes Arguments", level: 2 },
  { id: "js-comparison", title: "Python vs JavaScript Functions", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function FunctionsScopeAndArguments() {
  return (
    <div className="article-content">
      <p>
        Functions in Python are first-class objects — they can be passed as arguments,
        returned from other functions, and stored in data structures. This module covers
        everything from basic syntax to the LEGB scope chain, closures, and the mutable
        default argument trap that trips up experienced engineers in interviews.
      </p>

      <h2 id="defining-functions">Defining Functions</h2>

      <pre><code>{`def greet(name):
    print(f"Hello, {name}!")

greet("Juan")   # Hello, Juan!

# Functions are objects — can be assigned, passed, stored
say_hello = greet
say_hello("World")   # Hello, World!

# Type annotations (optional but encouraged)
def add(a: int, b: int) -> int:
    return a + b

# Docstring (first statement, accessible via __doc__)
def multiply(a, b):
    """Return the product of a and b."""
    return a * b

print(multiply.__doc__)   # "Return the product of a and b."`}</code></pre>

      <h2 id="return-values">Return Values</h2>

      <pre><code>{`# Explicit return
def square(n):
    return n ** 2

# No return statement → returns None implicitly
def log(msg):
    print(msg)

result = log("hi")
print(result)   # None

# Return multiple values — actually returns a tuple
def min_max(nums):
    return min(nums), max(nums)

low, high = min_max([3, 1, 4, 1, 5, 9])
print(low, high)   # 1 9

# Early return pattern
def find(items, target):
    for item in items:
        if item == target:
            return item
    return None   # explicit None for clarity`}</code></pre>

      <h2 id="arguments">Positional and Keyword Arguments</h2>

      <pre><code>{`def connect(host, port, timeout):
    print(f"connecting to {host}:{port} (timeout={timeout}s)")

# Positional — order matters
connect("localhost", 5432, 30)

# Keyword — order doesn't matter
connect(port=5432, timeout=30, host="localhost")

# Mix: positional first, keyword after
connect("localhost", timeout=30, port=5432)

# Positional-only parameters (Python 3.8+) — before /
def log(message, /, level="INFO"):
    print(f"[{level}] {message}")

log("starting", level="DEBUG")
# log(message="starting")  # TypeError — message is positional-only

# Keyword-only parameters — after *
def create_user(name, *, admin=False, active=True):
    pass

create_user("Juan", admin=True)
# create_user("Juan", True)  # TypeError — admin must be keyword`}</code></pre>

      <h2 id="default-parameters">Default Parameters</h2>

      <pre><code>{`def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Juan")            # "Hello, Juan!"
greet("Juan", "Hi")      # "Hi, Juan!"
greet("Juan", greeting="Hey")  # "Hey, Juan!"

# Defaults are evaluated ONCE at function definition time
# (see Mutable Default Arguments section for why this matters)

# Idiomatic: use None as default for mutable defaults
def append_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items`}</code></pre>

      <h2 id="args-kwargs">*args and **kwargs</h2>

      <h3>*args — variable positional arguments</h3>
      <pre><code>{`def total(*args):
    return sum(args)

total(1, 2, 3)        # 6
total(1, 2, 3, 4, 5)  # 15

# args is a tuple inside the function
def show(*args):
    print(type(args))   # <class 'tuple'>
    for arg in args:
        print(arg)

# Unpacking into *args with *
nums = [1, 2, 3]
total(*nums)   # equivalent to total(1, 2, 3)`}</code></pre>

      <h3>**kwargs — variable keyword arguments</h3>
      <pre><code>{`def configure(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")

configure(host="localhost", port=5432, debug=True)
# host = localhost
# port = 5432
# debug = True

# kwargs is a dict inside the function
def show(**kwargs):
    print(type(kwargs))   # <class 'dict'>

# Unpacking into **kwargs with **
options = {"host": "localhost", "port": 5432}
configure(**options)   # equivalent to configure(host="localhost", port=5432)`}</code></pre>

      <h3>Combining both</h3>
      <pre><code>{`def log(level, *args, **kwargs):
    print(f"[{level}]", *args, **kwargs)

log("INFO", "server started", "port=8080", end="\n")

# Classic forwarding pattern
def wrapper(*args, **kwargs):
    print("before")
    result = original(*args, **kwargs)
    print("after")
    return result`}</code></pre>

      <h2 id="argument-order">Argument Order Rules</h2>

      <p>Python enforces a strict order for parameter types in function signatures:</p>

      <pre><code>{`# Order: positional-only | regular | *args | keyword-only | **kwargs
def full_example(pos_only, /, regular, *args, kw_only, **kwargs):
    pass

# Real-world example
def make_request(url, method="GET", /, *, timeout=30, headers=None, **extra):
    pass

# Summary table:
# def f(a, b, /, c, d, *args, e, f, **kwargs)
#         ^        ^         ^
#   pos-only   regular   kw-only`}</code></pre>

      <h2 id="lambda">Lambda Functions</h2>

      <p>
        Lambdas are anonymous single-expression functions. Use them for short, throwaway
        functions — primarily as arguments to <code>sorted</code>, <code>map</code>,{" "}
        <code>filter</code>.
      </p>

      <pre><code>{`# Syntax: lambda params: expression
square = lambda x: x ** 2
square(5)   # 25

add = lambda a, b: a + b
add(3, 4)   # 7

# Primary use: sort key
people = [{"name": "Carlos", "age": 30}, {"name": "Ana", "age": 25}]
sorted(people, key=lambda p: p["age"])    # sort by age
sorted(people, key=lambda p: p["name"])   # sort by name

# Secondary use: map/filter (comprehensions are usually cleaner)
nums = [1, 2, 3, 4, 5]
list(map(lambda x: x * 2, nums))         # [2, 4, 6, 8, 10]
list(filter(lambda x: x % 2 == 0, nums)) # [2, 4]

# Same with comprehensions (preferred)
[x * 2 for x in nums]
[x for x in nums if x % 2 == 0]

# Lambdas cannot contain statements — only one expression
# lambda x: if x > 0: return x  # SyntaxError`}</code></pre>

      <h2 id="scope-legb">Scope and the LEGB Rule</h2>

      <p>
        Python resolves names using the LEGB rule — it searches scopes in this order:
      </p>
      <ol>
        <li>
          <strong>L — Local</strong>: inside the current function
        </li>
        <li>
          <strong>E — Enclosing</strong>: enclosing function scopes (for closures)
        </li>
        <li>
          <strong>G — Global</strong>: module-level scope
        </li>
        <li>
          <strong>B — Built-in</strong>: Python built-ins (<code>len</code>, <code>print</code>, etc.)
        </li>
      </ol>

      <pre><code>{`x = "global"           # G

def outer():
    x = "enclosing"    # E (for inner)

    def inner():
        x = "local"    # L
        print(x)       # "local"

    inner()
    print(x)           # "enclosing"

outer()
print(x)               # "global"`}</code></pre>

      <h3>global and nonlocal</h3>
      <pre><code>{`# global — modify a module-level variable from inside a function
counter = 0

def increment():
    global counter
    counter += 1

increment()
print(counter)   # 1

# Without "global", assigning inside a function creates a LOCAL variable
def bad_increment():
    counter += 1   # UnboundLocalError — Python sees assignment, treats counter as local

# nonlocal — modify a variable in the enclosing (not global) scope
def make_counter():
    count = 0

    def increment():
        nonlocal count
        count += 1
        return count

    return increment

counter = make_counter()
counter()   # 1
counter()   # 2
counter()   # 3`}</code></pre>

      <h3>Name shadowing — a common gotcha</h3>
      <pre><code>{`# Shadowing a built-in
list = [1, 2, 3]    # now "list" refers to this variable, not the built-in
list([1, 2])        # TypeError — you just broke the built-in

# Fix: don't name variables after built-ins
# Bad: list, dict, str, id, type, input, open, sum, min, max, filter, map
# Good: items, users, user_id, data_type`}</code></pre>

      <h2 id="closures">Closures</h2>

      <p>
        A closure is a function that captures variables from its enclosing scope. The captured
        variables persist even after the outer function returns.
      </p>

      <pre><code>{`def make_multiplier(factor):
    def multiply(n):
        return n * factor   # "factor" is captured from enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

double(5)   # 10
triple(5)   # 15

# Each closure has its own captured environment
print(double.__closure__[0].cell_contents)   # 2
print(triple.__closure__[0].cell_contents)   # 3`}</code></pre>

      <h3>Classic closure loop gotcha</h3>
      <pre><code>{`# Bug: all closures share the SAME variable
funcs = []
for i in range(5):
    funcs.append(lambda: i)   # captures variable i, not its current value

[f() for f in funcs]   # [4, 4, 4, 4, 4] — all see i=4 (loop's final value)

# Fix 1: default argument captures current value
funcs = []
for i in range(5):
    funcs.append(lambda i=i: i)   # default arg evaluated at definition time

[f() for f in funcs]   # [0, 1, 2, 3, 4]

# Fix 2: factory function
def make_fn(val):
    return lambda: val

funcs = [make_fn(i) for i in range(5)]
[f() for f in funcs]   # [0, 1, 2, 3, 4]`}</code></pre>

      <h2 id="mutable-default-args">Mutable Default Argument Pitfall</h2>

      <p>
        This is one of the most common Python gotchas and a near-certain interview topic.
        Default argument values are evaluated <strong>once</strong> when the function is{" "}
        <em>defined</em>, not each time it is called.
      </p>

      <pre><code>{`# Bug
def add_item(item, items=[]):
    items.append(item)
    return items

add_item("a")   # ["a"]
add_item("b")   # ["a", "b"]  ← same list! persists between calls
add_item("c")   # ["a", "b", "c"]  ← still the same list

# The default [] is created once and reused every call.
print(add_item.__defaults__)   # (["a", "b", "c"],)`}</code></pre>

      <pre><code>{`# Fix: use None as default, create fresh object inside the function
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

add_item("a")   # ["a"]
add_item("b")   # ["b"]  ← fresh list each time
add_item("c")   # ["c"]  ← fresh list each time

add_item("b", add_item("a"))   # ["a", "b"]  ← explicit accumulation works`}</code></pre>

      <p>Same trap exists with dict and set defaults:</p>
      <pre><code>{`# Bug
def register(name, cache={}):
    cache[name] = True
    return cache

register("alice")   # {"alice": True}
register("bob")     # {"alice": True, "bob": True}  ← shared cache!

# Fix
def register(name, cache=None):
    if cache is None:
        cache = {}
    cache[name] = True
    return cache`}</code></pre>

      <h2 id="passing-model">How Python Passes Arguments</h2>

      <p>
        Python is neither &quot;pass by value&quot; nor &quot;pass by reference&quot; — it is
        <strong>pass by object reference</strong> (sometimes called &quot;pass by assignment&quot;).
      </p>

      <p>What this means:</p>
      <ul>
        <li>The function receives a reference to the same object as the caller.</li>
        <li>
          If the object is <strong>mutable</strong> (list, dict), the function can mutate
          it in place — the caller sees the change.
        </li>
        <li>
          If the object is <strong>immutable</strong> (int, str, tuple), the function cannot
          change it — rebinding the name inside the function only affects the local name.
        </li>
      </ul>

      <pre><code>{`# Mutable argument — mutation visible to caller
def append_zero(lst):
    lst.append(0)

nums = [1, 2, 3]
append_zero(nums)
print(nums)   # [1, 2, 3, 0]  ← mutated!

# Immutable argument — rebinding not visible to caller
def try_to_change(n):
    n = 100   # rebinds local name only

x = 42
try_to_change(x)
print(x)   # 42  ← unchanged

# Rebinding a mutable argument — not visible to caller
def rebind(lst):
    lst = [99, 99]   # creates a new list, rebinds local name

nums = [1, 2, 3]
rebind(nums)
print(nums)   # [1, 2, 3]  ← unchanged (rebind only affected local name)

# Rule: mutation = visible. Rebinding = not visible.`}</code></pre>

      <h2 id="js-comparison">Python vs JavaScript Functions</h2>

      <pre><code>{`// JavaScript                          # Python

// Declaration
function add(a, b) { return a + b; }  def add(a, b): return a + b

// Arrow / lambda
const add = (a, b) => a + b;         add = lambda a, b: a + b

// Default parameters
function greet(name = "World") {}     def greet(name="World"):

// Rest / *args
function sum(...nums) {}              def total(*args):

// Spread / **kwargs
function fn({ a, b }) {}             def fn(**kwargs):  # or explicit

// No equivalent                      def fn(a, b, /, *, c):  # pos-only / kw-only

// Hoisting — JS hoists function declarations
hello();                              # NameError — Python does NOT hoist
function hello() {}                   def hello(): ...

// Closures
function outer() {                    def outer():
  let x = 10;                             x = 10
  return () => x;                         def inner(): return x
}                                         return inner

// IIFE (no direct equivalent)
(function() { ... })();               (lambda: ...)()  # works but rare

// Arguments object (JS only)        # Python uses *args instead
function f() { console.log(arguments); }`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What are <code>*args</code> and <code>**kwargs</code>?</h3>
      <p>
        <code>*args</code> collects extra positional arguments into a tuple.{" "}
        <code>**kwargs</code> collects extra keyword arguments into a dict. Both let
        functions accept a variable number of arguments. The names <code>args</code> and{" "}
        <code>kwargs</code> are convention — <code>*items</code> or <code>**options</code>{" "}
        work the same way. They are also used to forward arguments: <code>fn(*args, **kwargs)</code>.
      </p>

      <h3>2. What is the LEGB rule?</h3>
      <p>
        The order Python searches for a name: <strong>L</strong>ocal → <strong>E</strong>nclosing
        function scopes → <strong>G</strong>lobal (module) → <strong>B</strong>uilt-in. The
        first match wins. Use <code>global</code> to write to module scope from a function,{" "}
        <code>nonlocal</code> to write to an enclosing function&apos;s scope.
      </p>

      <h3>3. What is a closure?</h3>
      <p>
        A function that captures and remembers variables from its enclosing scope, even after
        the outer function has returned. The captured variables live in the closure&apos;s{" "}
        <code>__closure__</code> cells. Used in factory functions, decorators, and callbacks.
      </p>

      <h3>4. What is wrong with mutable default arguments?</h3>
      <p>
        Default values are evaluated once at function definition time, not at each call.
        A mutable default (like <code>[]</code> or <code>{"{}"}</code>) is shared across all
        calls that use the default. Mutations persist between calls. Fix: use{" "}
        <code>None</code> as the default and create a fresh object at the start of the function.
      </p>

      <h3>5. Are Python arguments passed by value or by reference?</h3>
      <p>
        Neither — Python passes object references (pass by assignment). The function gets a
        reference to the same object. Mutating a mutable argument (list, dict) is visible to
        the caller. But rebinding the parameter name inside the function only affects the local
        name — the caller&apos;s variable still points to the original object. Immutable types
        (int, str, tuple) cannot be mutated, so they effectively behave like pass-by-value.
      </p>

      <h3>6. What is the difference between <code>global</code> and <code>nonlocal</code>?</h3>
      <p>
        <code>global</code> declares that a name refers to the module-level variable, allowing
        the function to rebind or mutate it. <code>nonlocal</code> declares that a name refers
        to the nearest enclosing function scope (not global). <code>nonlocal</code> is used
        inside nested functions to modify a closure variable.
      </p>

      <h3>7. What is a lambda function and when should you use it?</h3>
      <p>
        A lambda is an anonymous single-expression function. Use it for short throwaway
        functions as arguments to <code>sorted</code>, <code>map</code>, <code>filter</code>.
        For anything more complex than a single expression, use a named <code>def</code> for
        readability. Lambdas cannot contain statements, assignments, or multiple expressions.
      </p>

      <h3>8. What happens when you shadow a built-in like <code>list = []</code>?</h3>
      <p>
        The name <code>list</code> in that scope now refers to your list object, not the
        built-in type. Any subsequent call to <code>list(...)</code> will raise a{" "}
        <code>TypeError</code> (calling a list, not the constructor). The fix is to avoid
        naming variables after built-ins. The built-in is still accessible via{" "}
        <code>__builtins__</code>.
      </p>

      <h3>9. What are keyword-only arguments?</h3>
      <p>
        Parameters placed after <code>*</code> (or after <code>*args</code>) in the signature
        must be passed as keyword arguments — they cannot be passed positionally. Example:{" "}
        <code>def fn(a, *, b)</code> — here <code>b</code> must be called as{" "}
        <code>fn(1, b=2)</code>. Useful for enforcing clarity at the call site and avoiding
        positional confusion with boolean flags.
      </p>

      <h3>10. Can a Python function return multiple values?</h3>
      <p>
        Syntactically yes, but mechanically it returns a single tuple. <code>return a, b</code>{" "}
        is equivalent to <code>return (a, b)</code>. The caller can unpack it:{" "}
        <code>x, y = fn()</code>. This is idiomatic Python — use it freely instead of wrapping
        in a list or dict when returning two or three related values.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Keyword-only enforcement</h3>
      <p>
        Write a function <code>create_user(name, email, *, role="viewer", active=True)</code>.
        Verify that calling <code>create_user("Juan", "j@example.com", "admin")</code> raises
        a <code>TypeError</code>. Explain why.
      </p>

      <h3>Exercise 2 — *args accumulator</h3>
      <p>
        Write <code>running_total(*nums)</code> that returns a list where each element is the
        cumulative sum up to that index.
      </p>
      <pre><code>{`running_total(1, 2, 3, 4)  # [1, 3, 6, 10]`}</code></pre>

      <h3>Exercise 3 — **kwargs config</h3>
      <p>
        Write <code>build_url(host, **params)</code> that constructs a URL query string from
        the kwargs:
      </p>
      <pre><code>{`build_url("example.com", page=2, limit=10, sort="asc")
# "example.com?page=2&limit=10&sort=asc"`}</code></pre>

      <h3>Exercise 4 — LEGB trace</h3>
      <p>Predict the output of this code before running it:</p>
      <pre><code>{`x = "global"

def outer():
    x = "outer"
    def inner():
        print(x)
    inner()
    x = "outer-modified"
    inner()

outer()
print(x)`}</code></pre>

      <h3>Exercise 5 — Closure factory</h3>
      <p>
        Write <code>make_validator(min_len, max_len)</code> that returns a function which
        takes a string and returns <code>True</code> if its length is within the range.
      </p>
      <pre><code>{`validate_password = make_validator(8, 64)
validate_password("short")     # False
validate_password("longenough") # True`}</code></pre>

      <h3>Exercise 6 — Loop closure bug</h3>
      <p>
        Explain why the following code prints <code>[4, 4, 4, 4, 4]</code> and fix it two ways
        (default argument and factory function):
      </p>
      <pre><code>{`funcs = [lambda: i for i in range(5)]
print([f() for f in funcs])`}</code></pre>

      <h3>Exercise 7 — Argument passing trace</h3>
      <p>Predict the output and explain the difference:</p>
      <pre><code>{`def modify_a(lst):
    lst.append(99)

def modify_b(lst):
    lst = lst + [99]

a = [1, 2, 3]
b = [1, 2, 3]

modify_a(a)
modify_b(b)

print(a)
print(b)`}</code></pre>

      <h3>Mini Challenge — Mutable Default Bug Hunt</h3>
      <p>
        The following class has a subtle bug caused by a mutable default argument. Find it,
        explain exactly why it happens, and fix it without changing the public API:
      </p>
      <pre><code>{`class EventBus:
    def subscribe(self, event, handlers=[]):
        handlers.append(event)
        return handlers

bus = EventBus()
login_handlers = bus.subscribe("user.login")
logout_handlers = bus.subscribe("user.logout")

print(login_handlers)
print(logout_handlers)
print(login_handlers is logout_handlers)  # what does this print?`}</code></pre>
      <p>
        After fixing, make sure <code>login_handlers is logout_handlers</code> returns{" "}
        <code>False</code> and each list contains only its own event.
      </p>
    </div>
  );
}
