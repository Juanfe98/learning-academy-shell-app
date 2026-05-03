import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "python-basics", title: "Python Basics", level: 2 },
  { id: "data-types", title: "Data Types and Collections", level: 2 },
  { id: "mutability", title: "Mutability and Memory", level: 2 },
  { id: "functions-scope", title: "Functions and Scope", level: 2 },
  { id: "oop", title: "OOP", level: 2 },
  { id: "modules-packages", title: "Modules and Packages", level: 2 },
  { id: "exceptions", title: "Exceptions", level: 2 },
  { id: "iterators-generators", title: "Iterators and Generators", level: 2 },
  { id: "decorators", title: "Decorators", level: 2 },
  { id: "context-managers", title: "Context Managers", level: 2 },
  { id: "typing", title: "Typing", level: 2 },
  { id: "testing", title: "Testing", level: 2 },
  { id: "async", title: "Async", level: 2 },
  { id: "backend", title: "Backend with FastAPI", level: 2 },
  { id: "algorithms", title: "Algorithms and Data Structures", level: 2 },
  { id: "performance", title: "Performance and Debugging", level: 2 },
];

function Q({ q, a, code, gotcha }: { q: string; a: string; code?: string; gotcha?: string }) {
  return (
    <div style={{ marginBottom: "1.5rem", paddingLeft: "1rem", borderLeft: "2px solid #2a2a38" }}>
      <p style={{ fontWeight: "bold", color: "#f0f0f5", marginBottom: "0.4rem" }}>Q: {q}</p>
      <p style={{ color: "#a0a0b8", marginBottom: code || gotcha ? "0.4rem" : "0" }}>{a}</p>
      {code && <pre style={{ marginTop: "0.4rem" }}><code>{code}</code></pre>}
      {gotcha && (
        <p style={{ color: "#f59e0b", fontSize: "0.85rem", marginTop: "0.4rem" }}>
          ⚠ Gotcha: {gotcha}
        </p>
      )}
    </div>
  );
}

export default function PythonInterviewQuestionBank() {
  return (
    <div className="article-content">
      <p>
        100+ questions grouped by topic. Use this for last-minute review. Each answer is
        concise and interview-scoped — expand on the linked module for deeper coverage.
      </p>

      <h2 id="python-basics">Python Basics</h2>

      <Q q="Is Python compiled or interpreted?"
        a="Both. CPython compiles .py source to bytecode (.pyc) transparently, then the Python VM interprets the bytecode. Practically called 'interpreted' because there's no manual compile step."
      />
      <Q q="What does 'dynamically typed' mean?"
        a="Types are checked at runtime, not at parse time. A variable is a name pointing to an object; the type lives on the object. You can rebind a name to a different type at any time."
      />
      <Q q="What is the purpose of if __name__ == '__main__'?"
        a="Guards top-level code from running when the file is imported. When run directly, __name__ is '__main__'. When imported, __name__ is the module's name. Lets a file work as both a script and importable module."
      />
      <Q q="What is None in Python?"
        a="The singleton null value, type NoneType. Functions that don't return explicitly return None. Always compare with 'is None' / 'is not None', not == None."
      />
      <Q q="What is the difference between == and is?"
        a="== compares values (calls __eq__). is compares identity — same object in memory (same id()). Use is only for None, True, False. Never use is for strings or integers outside the small-int cache."
        gotcha="a = 256; b = 256; a is b → True (cached). a = 257; b = 257; a is b → False. Always use == for value comparison."
      />
      <Q q="What is Python's indentation rule?"
        a="Indentation defines code blocks — no curly braces. PEP 8 mandates 4 spaces. Mixing tabs and spaces raises TabError. IndentationError means whitespace is inconsistent."
      />
      <Q q="What is a docstring?"
        a="A string literal as the first statement of a module, class, or function. Stored in __doc__. Used by help() and documentation tools. Triple quotes allow multiline. Different from comments — docstrings are runtime objects."
      />
      <Q q="What are Python's truthy and falsy values?"
        a="Falsy: None, False, 0, 0.0, '', [], (), {}, set(). Everything else is truthy. This powers idioms like 'if my_list:' instead of 'if len(my_list) > 0:'."
        gotcha="'0' (string) is truthy. [0] is truthy. all([]) → True (vacuously). any([]) → False."
      />

      <h2 id="data-types">Data Types and Collections</h2>

      <Q q="What is the difference between list and tuple?"
        a="Lists are mutable ordered sequences. Tuples are immutable ordered sequences. Tuples are hashable (if elements are hashable) so they can be dict keys or set members. Lists cannot. Tuples are slightly more memory-efficient."
      />
      <Q q="What is the difference between set and list?"
        a="Sets are unordered, store only unique elements, and have O(1) average membership testing. Lists are ordered, allow duplicates, and have O(n) membership testing. Set elements must be hashable."
      />
      <Q q="What is a dictionary in Python?"
        a="A hash map: ordered (Python 3.7+), mutable mapping of unique hashable keys to values. Average O(1) get/set/delete. Keys must be hashable — strings, ints, tuples work; lists do not."
      />
      <Q q="What does it mean that strings are immutable?"
        a="You cannot change a character in place — s[0] = 'x' raises TypeError. All string methods return new strings. String concatenation in a loop is O(n²) — use ''.join(list) instead."
      />
      <Q q="How does slicing work?"
        a="seq[start:stop:step] — start inclusive, stop exclusive. Negative indices count from end. Missing start/stop defaults to beginning/end. Never raises IndexError. s[::-1] reverses any sequence."
      />
      <Q q="What is the difference between dict[key] and dict.get(key)?"
        a="dict[key] raises KeyError if missing. dict.get(key) returns None by default, or dict.get(key, default) returns the default. Prefer .get() when the key may be absent."
      />
      <Q q="Can a tuple contain mutable objects?"
        a="Yes. A tuple holding a list is still a tuple — you cannot reassign tuple slots. But the list inside can still be mutated. Also: a tuple containing a list is not hashable."
        code={`t = ([1, 2], [3, 4])
t[0].append(99)   # valid — [1, 2, 99]
# t[0] = [9]       # TypeError`}
      />
      <Q q="What is frozenset?"
        a="An immutable set. Hashable — can be used as a dict key or set member. Supports all non-mutating set operations. Created with frozenset([1, 2, 3])."
      />
      <Q q="How do you safely copy a list?"
        a="Shallow copy: b = a.copy() or b = list(a) or b = a[:]. All create a new list but share references to nested objects. Deep copy: import copy; b = copy.deepcopy(a) — fully independent."
        gotcha="b = a is NOT a copy — it's the same list. Mutations via b affect a."
      />
      <Q q="What are Python's integer limits?"
        a="Python integers have arbitrary precision — no overflow. 2**1000 works fine. This is unlike most languages where integers have fixed bit widths."
      />

      <h2 id="mutability">Mutability and Memory</h2>

      <Q q="What is the difference between shallow and deep copy?"
        a="Shallow copy creates a new container but nested objects are still shared references — mutations to nested objects affect both copies. Deep copy recursively creates independent copies of all nested objects."
      />
      <Q q="What does 'pass by object reference' mean?"
        a="Functions receive a reference to the same object. Mutating a mutable argument (list, dict) is visible to the caller. Rebinding the parameter name inside the function is not visible — the caller's variable still points to the original."
      />
      <Q q="Why is 'def f(x=[]):' dangerous?"
        a="Default argument values are evaluated once at function definition, not each call. The list [] is shared across all calls. Mutations persist between calls. Fix: use None as default and create a fresh object inside."
        code={`# Bug
def add(x, items=[]):
    items.append(x)
    return items

add(1)  # [1]
add(2)  # [1, 2]  ← same list!

# Fix
def add(x, items=None):
    if items is None:
        items = []
    items.append(x)
    return items`}
      />
      <Q q="What is the small integer cache?"
        a="CPython caches integers from -5 to 256. Variables with these values share the same object in memory. Outside this range, new objects are created. Never use 'is' to compare integers — always use ==."
      />
      <Q q="What is Python's reference counting?"
        a="Every object has a count of references pointing to it. When the count drops to zero, the object is freed immediately. Augmented by a cyclic garbage collector for reference cycles (a → b → a)."
      />
      <Q q="What is id() in Python?"
        a="Returns the memory address of an object. Two variables with the same id() are the same object. id() changes when an object is garbage collected and a new one takes its address."
      />

      <h2 id="functions-scope">Functions and Scope</h2>

      <Q q="What is the LEGB rule?"
        a="The name resolution order: Local → Enclosing function scopes → Global (module) → Built-in. Python searches each scope in order and uses the first match."
      />
      <Q q="What is a closure?"
        a="A function that captures and retains variables from its enclosing scope, even after the outer function returns. The captured variables live in __closure__ cells."
        code={`def make_adder(n):
    def add(x):
        return x + n   # n captured from enclosing scope
    return add

add5 = make_adder(5)
add5(3)   # 8`}
      />
      <Q q="What are *args and **kwargs?"
        a="*args collects extra positional arguments into a tuple. **kwargs collects extra keyword arguments into a dict. Names are convention — the * and ** are the actual syntax."
      />
      <Q q="What is the difference between global and nonlocal?"
        a="'global x' declares x refers to the module-level variable. 'nonlocal x' declares x refers to the nearest enclosing function scope (not global). Used to rebind variables in outer scopes."
      />
      <Q q="What is a lambda?"
        a="An anonymous single-expression function. Cannot contain statements. Used primarily as sort keys or short callbacks. For anything complex, use a named def."
      />
      <Q q="What are keyword-only arguments?"
        a="Parameters after * in a function signature that must be passed by keyword. Example: def fn(a, *, b) — b must be called as fn(1, b=2). Prevents positional confusion with boolean flags."
      />
      <Q q="Can a Python function return multiple values?"
        a="Syntactically yes — return a, b packs them into a tuple. The caller can unpack: x, y = fn(). It's one tuple, not multiple values, but idiomatic Python treats it as multiple returns."
      />

      <h2 id="oop">OOP</h2>

      <Q q="What is self?"
        a="A reference to the current instance, passed automatically as the first argument to instance methods. It's a convention — any name works but always use self. obj.method() is equivalent to Class.method(obj)."
      />
      <Q q="What is the difference between instance and class attributes?"
        a="Class attributes are shared by all instances (defined in the class body). Instance attributes are unique per instance (set on self, usually in __init__). Instance attributes shadow class attributes of the same name."
        gotcha="Mutable class attributes (like class-level lists) are shared — mutations via one instance affect all instances."
      />
      <Q q="What is the difference between @staticmethod and @classmethod?"
        a="@staticmethod gets neither self nor cls — it's a plain function in the class namespace. @classmethod gets cls (the class) as first argument. Used for alternative constructors (factory methods)."
      />
      <Q q="What are dunder methods?"
        a="Methods with double-underscore prefix and suffix (__init__, __repr__, __add__). They define how Python operators and built-ins behave with your objects. Also called 'magic methods' or 'special methods'."
      />
      <Q q="What is the difference between __repr__ and __str__?"
        a="__repr__ should be unambiguous, ideally reconstructable. Used in REPL and inside containers. __str__ is human-readable. Used by print() and f-strings. If only __repr__ is defined, str() falls back to it."
      />
      <Q q="What is a dataclass?"
        a="A class decorated with @dataclass that auto-generates __init__, __repr__, and __eq__ from type-annotated fields. Use field(default_factory=list) for mutable defaults. frozen=True makes it immutable and hashable."
      />
      <Q q="What is name mangling?"
        a="Attributes with double-underscore prefix (self.__x) are renamed to _ClassName__x by Python. Prevents accidental override in subclasses. Not true encapsulation — still accessible via the mangled name."
      />
      <Q q="What is MRO?"
        a="Method Resolution Order — the order Python searches the class hierarchy for a method. Uses C3 linearization. Inspect with ClassName.__mro__. super() follows the MRO, not just the direct parent."
      />
      <Q q="What is the difference between inheritance and composition?"
        a="Inheritance ('is-a'): subclass extends parent, inherits all behaviour. Composition ('has-a'): object contains references to other objects and delegates. Prefer composition — more flexible, easier to test."
      />
      <Q q="What happens if you define __eq__ without __hash__?"
        a="Python sets __hash__ = None, making instances unhashable — they cannot be used in sets or as dict keys. Define __hash__ explicitly if you need both, or use @dataclass(frozen=True)."
      />

      <h2 id="modules-packages">Modules and Packages</h2>

      <Q q="What is the difference between a module and a package?"
        a="A module is a single .py file. A package is a directory with __init__.py (and usually other modules). Packages let you organise related modules under a shared namespace."
      />
      <Q q="What does __init__.py do?"
        a="Marks a directory as a Python package. Runs when the package is first imported. Can be empty or define the package's public API by re-exporting names from submodules."
      />
      <Q q="What is sys.path?"
        a="A list of directory paths Python searches when resolving imports. Includes current directory (empty string), stdlib paths, and site-packages. You can append to it but proper installation via pip is preferred."
      />
      <Q q="What is the difference between absolute and relative imports?"
        a="Absolute imports specify the full path from project root — unambiguous, preferred. Relative imports use . (current package) and .. (parent) — common in installable libraries."
      />
      <Q q="How do you fix a circular import?"
        a="Three options: (1) move shared code to a third module, (2) use a lazy import inside the function that needs it, (3) restructure so dependencies flow one direction."
      />

      <h2 id="exceptions">Exceptions</h2>

      <Q q="Why should you avoid bare except:?"
        a="It catches everything including SystemExit (prevents sys.exit()), KeyboardInterrupt (prevents Ctrl+C), MemoryError, and recursion errors. Combined with pass it silently swallows bugs."
      />
      <Q q="What is the purpose of else in a try block?"
        a="Runs only if the try block completed without raising an exception. Useful for code that should only run on success, while keeping it outside the try so its exceptions aren't accidentally caught."
      />
      <Q q="What does finally do?"
        a="Always executes — whether try succeeded, an exception was caught, an exception propagated, or even if return fired. Used for guaranteed cleanup. Context managers (with) are usually preferred."
      />
      <Q q="What is raise X from Y?"
        a="Exception chaining — links two exceptions so both tracebacks appear. Sets __cause__ on the new exception. 'raise X from None' suppresses the original (hides implementation details from callers)."
      />
      <Q q="When should you raise vs return a sentinel value?"
        a="Raise when the function cannot fulfil its contract — truly exceptional. Return None when absence is a normal expected outcome (like dict.get()). Python idioms prefer exceptions for errors."
      />

      <h2 id="iterators-generators">Iterators and Generators</h2>

      <Q q="What is the difference between an iterable and an iterator?"
        a="An iterable implements __iter__ and returns an iterator. An iterator implements both __iter__ and __next__. Iterators are single-use — once exhausted they raise StopIteration. Iterables (like lists) can be iterated multiple times."
      />
      <Q q="What is the difference between return and yield?"
        a="return exits the function and returns one value. yield suspends the function, returns a value to the caller, and resumes from that point on the next next() call. A function with any yield is a generator function."
      />
      <Q q="What is the difference between a list comprehension and a generator expression?"
        a="List comprehension [x for x in ...] builds the full list in memory eagerly. Generator expression (x for x in ...) is lazy — yields one value at a time. Use generators for large datasets or single-pass iteration."
      />
      <Q q="What is yield from?"
        a="Delegates iteration to a sub-iterable. Equivalent to 'for item in iterable: yield item' but also correctly forwards send() and throw() into the sub-generator. Used for flattening and recursive generators."
      />
      <Q q="What does next() do when the iterator is exhausted?"
        a="Raises StopIteration. You can provide a default: next(iterator, default) returns the default instead of raising. for loops catch StopIteration automatically."
      />

      <h2 id="decorators">Decorators</h2>

      <Q q="What is a decorator?"
        a="A function that takes a function and returns a replacement function. @decorator syntax is sugar for fn = decorator(fn). Used to add cross-cutting behaviour — logging, timing, retry, auth — without modifying the original."
      />
      <Q q="Why use @functools.wraps?"
        a="Copies __name__, __doc__, and other metadata from the wrapped function to the wrapper. Without it, decorated functions lose their identity — help(), logging, and debugging tools see 'wrapper' instead of the original name."
      />
      <Q q="How do you make a decorator accept arguments?"
        a="Add an outer factory function that returns the actual decorator."
        code={`def repeat(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def greet(): print("hi")`}
      />
      <Q q="Can a class be used as a decorator?"
        a="Yes. Implement __init__ to accept the function and __call__ to execute the wrapper logic. Use functools.update_wrapper(self, func) to preserve metadata."
      />

      <h2 id="context-managers">Context Managers</h2>

      <Q q="How does a context manager work?"
        a="The with statement calls __enter__ on entry (assigns result to 'as' variable) and __exit__ on exit — always, even on exception. __exit__ receives exc_type, exc_val, exc_tb. Return truthy to suppress the exception."
      />
      <Q q="What is @contextmanager?"
        a="A decorator from contextlib that turns a generator function into a context manager. Code before yield is setup (__enter__). Code after yield (in finally) is teardown (__exit__). Simpler than writing a class."
      />
      <Q q="What is contextlib.suppress?"
        a="A context manager that silently ignores specified exceptions. 'with suppress(FileNotFoundError): os.remove(path)' — no exception if file missing. Cleaner than try/except/pass."
      />
      <Q q="Why is 'with open()' preferred over manual open/close?"
        a="Guarantees the file is closed via __exit__ even if an exception occurs inside the block. Without it, a failed read/write could leave file handles open — a resource leak in long-running processes."
      />

      <h2 id="typing">Typing</h2>

      <Q q="Does Python enforce type hints at runtime?"
        a="No. The interpreter ignores annotations — they're stored in __annotations__ but never checked. Only static tools (mypy, pyright) or runtime libraries (Pydantic) act on them."
      />
      <Q q="What is Optional[X]?"
        a="Shorthand for Union[X, None]. In Python 3.10+ write X | None directly. Used for nullable parameters and return types."
      />
      <Q q="What is Protocol?"
        a="Structural subtyping — a class satisfies a Protocol if it has the required methods/attributes, without inheriting from it. Equivalent to TypeScript's structural interfaces. Use @runtime_checkable for isinstance() support."
      />
      <Q q="What is TypedDict?"
        a="Type-annotates dicts with specific key/value shapes. No runtime enforcement — type checking only. Use when working with plain dicts (JSON APIs, legacy code). For new code with validation, prefer Pydantic."
      />
      <Q q="What is the difference between Any and object?"
        a="Any disables type checking — compatible with everything bidirectionally. object is the base class — a supertype of everything but you can't call specific methods on it without narrowing. Avoid Any; use object or generics."
      />
      <Q q="What is Pydantic?"
        a="Runtime data validation using type annotations. BaseModel subclasses validate, coerce, and serialize data automatically. Standard for FastAPI request/response models, config loading, and API boundary data."
      />

      <h2 id="testing">Testing</h2>

      <Q q="What is a pytest fixture?"
        a="A reusable setup function decorated with @pytest.fixture. Tests declare fixtures as parameters — pytest injects them automatically. Can yield for teardown. Composable and scoped (function/class/module/session)."
      />
      <Q q="What does scope='session' mean on a fixture?"
        a="The fixture is created once for the entire test run and shared across all tests. Used for expensive setup like DB migration or app startup. Must be side-effect-free or restore state."
      />
      <Q q="What is @pytest.mark.parametrize?"
        a="Runs one test function with multiple input sets. Each set is an independent test case. Cleaner than duplicating test functions. Stacking two parametrize decorators produces a cartesian product."
      />
      <Q q="What does 'patch where it is used, not where it is defined' mean?"
        a="If myapp.users imports 'from myapp.email import send', patch 'myapp.users.send' — not 'myapp.email.send'. The users module already holds a direct reference. Patching the original module doesn't affect existing bindings."
      />
      <Q q="What is dependency_overrides in FastAPI testing?"
        a="A dict on the app object that maps original dependency functions to replacement functions. Used to inject fakes (in-memory DB, fake current user) during tests without modifying production code."
      />

      <h2 id="async">Async</h2>

      <Q q="What is a coroutine?"
        a="A function defined with async def that can suspend at await points. Calling it returns a coroutine object — the body does not run until you await it or schedule it as a Task."
      />
      <Q q="What does await do?"
        a="Suspends the current coroutine and gives control to the event loop until the awaitable completes. Other ready coroutines run in the meantime. The suspended coroutine resumes with the result."
      />
      <Q q="What is the event loop?"
        a="The scheduler that manages coroutines. Maintains a ready queue, picks one coroutine, runs it until it awaits, then switches to the next ready one. asyncio.run() creates and runs the loop."
      />
      <Q q="What is the difference between concurrency and parallelism in Python?"
        a="Concurrency: one thread, tasks interleave during I/O waits (asyncio, threading). Parallelism: multiple CPUs run simultaneously (multiprocessing). Python's GIL prevents CPU parallelism in threads."
      />
      <Q q="What happens if you call time.sleep() in an async function?"
        a="The entire event loop blocks — no other coroutines can run. Use await asyncio.sleep() instead. Same for requests.get() — use httpx.AsyncClient or aiohttp."
      />
      <Q q="What is asyncio.gather()?"
        a="Runs multiple coroutines concurrently and waits for all of them. Returns a list of results in the same order as the arguments. Pass return_exceptions=True to collect exceptions as values instead of raising."
      />
      <Q q="What is the GIL?"
        a="Global Interpreter Lock — a mutex in CPython allowing only one thread to execute bytecode at a time. Irrelevant for asyncio (single-threaded). Threading gives I/O concurrency but not CPU parallelism. Use multiprocessing for CPU-bound parallelism."
      />

      <h2 id="backend">Backend with FastAPI</h2>

      <Q q="How does FastAPI handle request validation?"
        a="Reads type annotations on route parameters. Path/query params are coerced and validated automatically. Request body — declare a Pydantic BaseModel; FastAPI deserializes JSON, validates, passes typed object. Invalid → 422."
      />
      <Q q="What is dependency injection in FastAPI?"
        a="Route functions declare dependencies as parameters annotated with Depends(fn). FastAPI resolves the tree before calling the handler. Enables clean separation: auth, DB sessions, settings, feature flags. Easy to override in tests."
      />
      <Q q="What is the difference between async def and def routes in FastAPI?"
        a="async def runs in the event loop — use when awaiting async operations. def routes are automatically run in a threadpool by FastAPI — use when calling blocking sync libraries. Never call blocking code in async def routes."
      />
      <Q q="What is a response_model?"
        a="A Pydantic model declared on a route that filters and validates the response. Fields not in the model are excluded — passwords, internal IDs never leak. Also drives OpenAPI schema generation."
      />
      <Q q="How does FastAPI generate OpenAPI docs?"
        a="Automatically from code: route decorators, parameter types, Pydantic models, summary/description/tags arguments. Available at /docs (Swagger UI) and /redoc without any configuration."
      />

      <h2 id="algorithms">Algorithms and Data Structures</h2>

      <Q q="What is the time complexity of dict/set operations in Python?"
        a="Average O(1) for get, set, delete, and membership testing (key in dict/set). Worst case O(n) due to hash collisions, but extremely rare in practice."
      />
      <Q q="Why is list.pop(0) slow?"
        a="O(n) — removing the first element requires shifting every remaining element left by one position. Use collections.deque.popleft() for O(1) front removal."
      />
      <Q q="When should you use a heap?"
        a="When you repeatedly need the minimum (or maximum) element. k-smallest/k-largest problems, priority queues, Dijkstra's algorithm. Python's heapq is a min-heap; negate values for max-heap."
      />
      <Q q="What is the two-pointer technique?"
        a="Use two indices (left/right or slow/fast) moving through a data structure. Reduces O(n²) nested loop solutions to O(n). Classic uses: sorted two-sum, removing duplicates, palindrome check, sliding window."
      />
      <Q q="What is the difference between BFS and DFS?"
        a="BFS uses a queue, explores level by level, finds shortest path in unweighted graphs. DFS uses a stack (or recursion), explores depth-first. BFS is better for shortest path; DFS for cycle detection, topological sort, exhaustive search."
      />
      <Q q="What is dynamic programming?"
        a="Breaking a problem into overlapping subproblems and caching results to avoid redundant computation. Top-down: recursion + memoization (@lru_cache). Bottom-up: tabulation (dp array, no recursion)."
      />
      <Q q="What Python tools are most useful in coding interviews?"
        a="Counter (frequency), defaultdict (grouping), deque (BFS queue, O(1) popleft), heapq (priority queue), bisect (sorted insertion/search), sorted() with key, enumerate(), zip()."
      />

      <h2 id="performance">Performance and Debugging</h2>

      <Q q="How do you profile Python code?"
        a="cProfile: python -m cProfile script.py. timeit: timeit.timeit('expr', number=1000). line_profiler for line-by-line. memory_profiler for memory usage. For quick checks: time.perf_counter() around a block."
      />
      <Q q="Why is ''.join(list) faster than string concatenation in a loop?"
        a="String concatenation (+=) creates a new string object each iteration — O(n²) total. join() builds the result in one pass — O(n). Always use join() to build strings from a list."
      />
      <Q q="What is @functools.lru_cache and when should you use it?"
        a="Memoizes function results keyed by arguments. Subsequent calls with the same args return cached results. Use for pure functions with expensive computation or repeated identical calls. Arguments must be hashable."
      />
      <Q q="What is the difference between list and tuple in terms of performance?"
        a="Tuple creation is faster and uses slightly less memory. Tuple iteration is marginally faster. For fixed data that won't change, tuple is slightly more efficient. For most code, the difference is negligible."
      />
      <Q q="How do you find where a function was loaded from?"
        a="import inspect; inspect.getfile(fn) — returns the file path. Or: import mymodule; print(mymodule.__file__). Useful when debugging which version of a library is installed."
      />
      <Q q="What is breakpoint() and how do you disable it in production?"
        a="Pauses execution and opens pdb (Python debugger). Set PYTHONBREAKPOINT=0 environment variable to disable all breakpoint() calls without changing code — standard for CI and production."
      />
    </div>
  );
}
