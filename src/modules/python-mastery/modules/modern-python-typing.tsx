import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-type-hints", title: "Why Type Hints?", level: 2 },
  { id: "basic-annotations", title: "Basic Annotations", level: 2 },
  { id: "collection-types", title: "Collection Types", level: 2 },
  { id: "optional-union", title: "Optional and Union", level: 2 },
  { id: "literal-final", title: "Literal and Final", level: 2 },
  { id: "typeddict", title: "TypedDict", level: 2 },
  { id: "protocol", title: "Protocol", level: 2 },
  { id: "generics", title: "Generics and TypeVar", level: 2 },
  { id: "callable-types", title: "Callable Types", level: 2 },
  { id: "type-aliases", title: "Type Aliases", level: 2 },
  { id: "mypy-pyright", title: "mypy and pyright", level: 2 },
  { id: "pydantic", title: "Pydantic", level: 2 },
  { id: "python-vs-typescript", title: "Python Typing vs TypeScript", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function ModernPythonTyping() {
  return (
    <div className="article-content">
      <p>
        Python&apos;s type system is optional, gradual, and checked statically — not at
        runtime. If you know TypeScript, you will find the concepts familiar but the
        mechanics different. This module covers everything interviewers ask about Python
        typing: from basic annotations to <code>Protocol</code>, <code>TypedDict</code>,
        and the runtime-enforcing power of Pydantic.
      </p>

      <h2 id="why-type-hints">Why Type Hints?</h2>

      <p>
        Python added type hints in PEP 484 (Python 3.5). They are entirely optional —
        the interpreter ignores them at runtime. Their value is tooling:
      </p>

      <ul>
        <li><strong>Static analysis</strong> — mypy/pyright catch type errors before you run the code</li>
        <li><strong>IDE support</strong> — autocomplete, inline errors, refactoring</li>
        <li><strong>Documentation</strong> — function signatures become self-documenting</li>
        <li><strong>Runtime validation</strong> — libraries like Pydantic use annotations to enforce types</li>
      </ul>

      <pre><code>{`# Without type hints
def process(items, limit):
    return [x for x in items if x > limit]

# With type hints — instantly clearer
def process(items: list[int], limit: int) -> list[int]:
    return [x for x in items if x > limit]

# Type hints are stored as __annotations__
print(process.__annotations__)
# {'items': list[int], 'limit': <class 'int'>, 'return': list[int]}

# They are NOT enforced at runtime
def add(a: int, b: int) -> int:
    return a + b

add("hello", "world")   # "helloworld" — no error at runtime!
# Only a static checker (mypy/pyright) catches this`}</code></pre>

      <h2 id="basic-annotations">Basic Annotations</h2>

      <pre><code>{`# Variable annotations
name: str = "Juan"
age: int = 30
price: float = 9.99
active: bool = True
nothing: None = None

# Annotation without assignment (declares intent)
user_id: int   # no value yet

# Function annotations
def greet(name: str) -> str:
    return f"Hello, {name}!"

def process(items: list) -> None:
    for item in items:
        print(item)

# Class annotations
class User:
    name: str
    age: int
    active: bool = True   # with default

    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age = age`}</code></pre>

      <h2 id="collection-types">Collection Types</h2>

      <h3>Python 3.9+ — built-in generics</h3>
      <pre><code>{`# Python 3.9+ — use built-in types directly as generics
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 95, "Bob": 87}
coords: tuple[int, int] = (10, 20)
unique_ids: set[int] = {1, 2, 3}
frozen: frozenset[str] = frozenset(["a", "b"])

# Variable-length tuple
items: tuple[int, ...] = (1, 2, 3, 4, 5)   # any number of ints

# Nested
matrix: list[list[int]] = [[1, 2], [3, 4]]
config: dict[str, list[str]] = {"tags": ["a", "b"]}`}</code></pre>

      <h3>Python 3.8 and earlier — typing module</h3>
      <pre><code>{`from typing import List, Dict, Tuple, Set, FrozenSet

# Identical meaning, older syntax
names: List[str] = ["Alice", "Bob"]
scores: Dict[str, int] = {"Alice": 95}
coords: Tuple[int, int] = (10, 20)

# As of Python 3.9, List/Dict/Tuple from typing are deprecated
# Prefer the built-in forms in new code`}</code></pre>

      <h2 id="optional-union">Optional and Union</h2>

      <pre><code>{`from typing import Optional, Union

# Optional[X] — the value is X or None
# Equivalent to: Union[X, None] or X | None (Python 3.10+)
def find_user(user_id: int) -> Optional[dict]:
    return db.get(user_id)   # returns dict or None

# Union[X, Y] — value can be X or Y
def parse(value: Union[str, int]) -> int:
    return int(value)

# Python 3.10+ — use | syntax (cleaner, like TypeScript)
def find_user(user_id: int) -> dict | None:
    return db.get(user_id)

def parse(value: str | int) -> int:
    return int(value)

# Practical usage — always annotate nullable returns
def get_env(key: str, default: str | None = None) -> str | None:
    import os
    return os.environ.get(key, default)

# Optional in parameters — common interview topic
def greet(name: str, title: str | None = None) -> str:
    if title is not None:
        return f"Hello, {title} {name}!"
    return f"Hello, {name}!"`}</code></pre>

      <h2 id="literal-final">Literal and Final</h2>

      <pre><code>{`from typing import Literal, Final

# Literal — constrains to specific values (like TypeScript string unions)
def set_log_level(level: Literal["DEBUG", "INFO", "WARNING", "ERROR"]) -> None:
    ...

set_log_level("DEBUG")    # OK
set_log_level("VERBOSE")  # type error — not in Literal

# Union of Literals
Status = Literal["pending", "active", "cancelled", "completed"]

def update_order(order_id: int, status: Status) -> None:
    ...

# Literal with multiple types
def move(direction: Literal["left", "right", "up", "down", 1, -1]) -> None:
    ...

# Final — marks a variable as immutable (like TypeScript's const)
MAX_RETRIES: Final = 3
BASE_URL: Final[str] = "https://api.example.com"

MAX_RETRIES = 5   # type error — cannot reassign Final`}</code></pre>

      <h2 id="typeddict">TypedDict</h2>

      <p>
        <code>TypedDict</code> lets you type-annotate dicts with specific key/value shapes.
        Think of it as TypeScript&apos;s interface applied to a Python dict.
      </p>

      <pre><code>{`from typing import TypedDict, Required, NotRequired

class UserDict(TypedDict):
    name: str
    email: str
    age: int

# Use it like a regular dict — TypedDict is just for type checking
def create_user(data: UserDict) -> UserDict:
    return data

user: UserDict = {"name": "Juan", "email": "j@ex.com", "age": 30}
create_user(user)   # OK
create_user({"name": "Juan"})   # type error — missing email, age

# Optional fields (Python 3.11+)
class ProfileDict(TypedDict):
    name: str
    email: str
    bio: NotRequired[str]   # optional key

# Inheritance
class AdminDict(UserDict):
    role: Literal["admin", "superadmin"]
    permissions: list[str]

# total=False — all keys optional
class PartialUser(TypedDict, total=False):
    name: str
    email: str
    age: int`}</code></pre>

      <h2 id="protocol">Protocol</h2>

      <p>
        <code>Protocol</code> defines structural subtyping — &quot;duck typing with
        type checking.&quot; If an object has the required methods/attributes, it satisfies
        the protocol regardless of its class hierarchy.
      </p>

      <pre><code>{`from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...
    def resize(self, factor: float) -> None: ...

class Circle:
    def draw(self) -> None:
        print("drawing circle")
    def resize(self, factor: float) -> None:
        self.radius *= factor

class Square:
    def draw(self) -> None:
        print("drawing square")
    def resize(self, factor: float) -> None:
        self.side *= factor

# Both Circle and Square satisfy Drawable
# without explicitly inheriting from it
def render(shape: Drawable) -> None:
    shape.draw()

render(Circle())   # OK
render(Square())   # OK

# Compare to TypeScript interface — same concept
# interface Drawable {
#   draw(): void;
#   resize(factor: number): void;
# }

# Protocol vs ABC (Abstract Base Class)
# Protocol — structural ("has the right shape") — no inheritance needed
# ABC      — nominal  ("explicitly inherits")  — must subclass`}</code></pre>

      <h3>runtime_checkable</h3>
      <pre><code>{`from typing import Protocol, runtime_checkable

@runtime_checkable
class Sized(Protocol):
    def __len__(self) -> int: ...

isinstance([1, 2, 3], Sized)   # True — list has __len__
isinstance(42, Sized)          # False — int has no __len__
# Only works with runtime_checkable protocols`}</code></pre>

      <h2 id="generics">Generics and TypeVar</h2>

      <pre><code>{`from typing import TypeVar, Generic

T = TypeVar("T")   # T can be any type
K = TypeVar("K")
V = TypeVar("V")

# Generic function — type preserved through function
def first(items: list[T]) -> T:
    return items[0]

first([1, 2, 3])       # return type inferred as int
first(["a", "b"])      # return type inferred as str

# Constrained TypeVar — T must be int or float
Number = TypeVar("Number", int, float)

def double(x: Number) -> Number:
    return x * 2

double(5)     # OK
double(3.14)  # OK
double("hi")  # type error

# Bound TypeVar — T must be a subtype of a class
from datetime import date
DateLike = TypeVar("DateLike", bound=date)

# Generic class (Python 3.9+)
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

    def peek(self) -> T:
        return self._items[-1]

int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
top = int_stack.pop()   # type inferred as int

# Python 3.12+ — new syntax
def first[T](items: list[T]) -> T:   # cleaner syntax
    return items[0]

class Stack[T]:
    def push(self, item: T) -> None: ...`}</code></pre>

      <h2 id="callable-types">Callable Types</h2>

      <pre><code>{`from typing import Callable

# Callable[[arg_types], return_type]
def apply(fn: Callable[[int], int], value: int) -> int:
    return fn(value)

apply(lambda x: x * 2, 5)   # OK
apply(str.upper, 5)          # type error — str.upper takes str, not int

# Multiple args
Transformer = Callable[[str, int], str]

def run(fn: Callable[..., int]) -> int:   # any args, returns int
    return fn()

# Higher-order function
def make_adder(n: int) -> Callable[[int], int]:
    def add(x: int) -> int:
        return x + n
    return add

add5 = make_adder(5)
add5(3)   # 8 — type inferred as int`}</code></pre>

      <h2 id="type-aliases">Type Aliases</h2>

      <pre><code>{`from typing import TypeAlias   # Python 3.10+

# Simple alias
UserId: TypeAlias = int
Email: TypeAlias = str
JsonDict: TypeAlias = dict[str, object]

def get_user(user_id: UserId) -> JsonDict: ...

# Complex alias
Coordinates: TypeAlias = tuple[float, float]
Matrix: TypeAlias = list[list[float]]

# NewType — distinct type for type checking (not just alias)
from typing import NewType

UserId = NewType("UserId", int)
ProductId = NewType("ProductId", int)

user_id = UserId(42)
product_id = ProductId(42)

def get_user(uid: UserId) -> None: ...
get_user(user_id)    # OK
get_user(product_id) # type error — ProductId is not UserId
get_user(42)         # type error — plain int is not UserId`}</code></pre>

      <h2 id="mypy-pyright">mypy and pyright</h2>

      <pre><code>{`# mypy — the original Python type checker
pip install mypy

# Run on a file
mypy myapp.py

# Run on a package
mypy src/

# mypy config in pyproject.toml
# [tool.mypy]
# python_version = "3.11"
# strict = true
# ignore_missing_imports = true

# pyright — Microsoft's type checker (faster, used by Pylance in VSCode)
pip install pyright
pyright src/

# Common type: ignore comments
x: int = "hello"  # type: ignore[assignment]
result = untyped_lib()  # type: ignore

# Strict mode flags
# --strict enables:
# --disallow-untyped-defs      — all functions must be annotated
# --disallow-any-generics      — no bare list, dict (must be list[int] etc.)
# --warn-return-any            — no implicit Any returns
# --no-implicit-optional       — None not silently allowed

# Type narrowing — both tools understand these
def process(value: str | int) -> str:
    if isinstance(value, str):
        return value.upper()   # checker knows value is str here
    return str(value)          # checker knows value is int here`}</code></pre>

      <h2 id="pydantic">Pydantic</h2>

      <p>
        Pydantic uses Python type annotations to validate data <em>at runtime</em>. It is
        the standard for FastAPI request/response models, config loading, and anywhere you
        need validated structured data.
      </p>

      <pre><code>{`from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    age: int
    bio: Optional[str] = None

# Parse and validate — raises ValidationError on bad data
user = UserCreate(name="Juan", email="j@ex.com", age=30)
print(user.name)    # "Juan"
print(user.model_dump())   # {"name": "Juan", "email": "j@ex.com", "age": 30, "bio": None}

# From dict
data = {"name": "Juan", "email": "j@ex.com", "age": "30"}  # age as string
user = UserCreate(**data)   # pydantic coerces "30" → 30

# Bad data raises ValidationError
try:
    UserCreate(name="Juan", email="j@ex.com", age="not-a-number")
except Exception as e:
    print(e)   # age: value is not a valid integer`}</code></pre>

      <h3>Field validation</h3>
      <pre><code>{`from pydantic import BaseModel, Field, field_validator

class Product(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, description="Price in USD")
    tags: list[str] = Field(default_factory=list)
    sku: str = Field(pattern=r"^[A-Z]{3}-\\d{4}$")

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("name cannot be blank")
        return v.strip()

# Model config
class Settings(BaseModel):
    model_config = {"env_prefix": "APP_", "case_sensitive": False}

    database_url: str
    debug: bool = False
    max_connections: int = 10`}</code></pre>

      <h3>Pydantic vs dataclasses vs TypedDict</h3>
      <pre><code>{`# TypedDict — type hints only, no runtime validation, plain dict
class UserDict(TypedDict):
    name: str
    age: int

# dataclass — lightweight, some validation via __post_init__
@dataclass
class User:
    name: str
    age: int

# Pydantic BaseModel — full runtime validation, coercion, serialization
class User(BaseModel):
    name: str
    age: int

# Choose:
# TypedDict   → annotating existing dicts, no validation needed
# dataclass   → simple data containers, fast, stdlib only
# Pydantic    → API input/output, config loading, any boundary data`}</code></pre>

      <h2 id="python-vs-typescript">Python Typing vs TypeScript</h2>

      <pre><code>{`// TypeScript                          # Python

// Basic types
string                                str
number                                int | float
boolean                               bool
null / undefined                      None
any                                   Any (from typing)
unknown                               object
never                                 NoReturn

// Optional
name?: string                         name: str | None = None
string | null                         str | None  or  Optional[str]

// Union
string | number                       str | int  or  Union[str, int]

// Literal
"pending" | "active"                  Literal["pending", "active"]

// Array / list
string[]                              list[str]
Array<string>                         list[str]

// Object / dict
{ name: string; age: number }         TypedDict or dataclass or Pydantic
Record<string, number>                dict[str, int]

// Interface (structural)
interface Drawable { draw(): void }   class Drawable(Protocol):
                                          def draw(self) -> None: ...

// Generic
function first<T>(arr: T[]): T        T = TypeVar("T")
                                      def first(arr: list[T]) -> T: ...

// Readonly
readonly name: string                 Final[str]  or  frozen=True dataclass

// Enum
enum Direction { Up, Down }           from enum import Enum
                                      class Direction(Enum):
                                          UP = "up"
                                          DOWN = "down"

// Key differences:
// TypeScript types are erased at compile time — same in Python (ignored at runtime)
// TypeScript checks at build time — Python needs explicit tool run (mypy/pyright)
// Python type hints don't enforce at runtime — Pydantic does
// TypeScript has narrowing built in — Python uses isinstance()/type guards`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain Python Typing in an Interview"
        intro="The best answer balances pragmatism and correctness: Python typing is a tool for maintainability, not a religion."
        steps={[
          "Start with the boundary: Python type hints are optional and ignored by the interpreter, but they unlock static analysis, IDE support, and safer refactors.",
          "Separate static typing from runtime validation clearly: mypy or pyright catch mistakes before execution, while Pydantic enforces contracts at system boundaries.",
          "Use the right vocabulary: Protocol for structural typing, TypedDict for shaped dictionaries, TypeVar for generics, and Any only when you intentionally opt out.",
          "Acknowledge tradeoffs honestly: over-annotating everything can add noise, but under-typing service boundaries and shared utilities usually makes teams slower over time.",
          "Close with a practical example, such as FastAPI request models plus pyright in CI, to show you know how typing helps real teams rather than toy scripts."
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. Does Python enforce type hints at runtime?</h3>
      <p>
        No. The interpreter ignores type annotations — they are stored in{" "}
        <code>__annotations__</code> but never checked when the code runs. Type errors are
        only caught by static analysis tools (mypy, pyright) or runtime-validation libraries
        like Pydantic. You can pass a string where an <code>int</code> is annotated and
        Python will not raise.
      </p>

      <h3>2. What is the difference between Python typing and TypeScript?</h3>
      <p>
        Both are optional and erased/ignored at runtime. The difference: TypeScript enforces
        types at compile time (the TS compiler rejects code with type errors). Python requires
        you to explicitly run mypy or pyright — the Python interpreter never checks types.
        Python also has Pydantic for runtime enforcement at data boundaries.
      </p>

      <h3>3. What is <code>Optional[X]</code>?</h3>
      <p>
        Shorthand for <code>Union[X, None]</code> — the value is either <code>X</code> or{" "}
        <code>None</code>. In Python 3.10+ you can write <code>X | None</code> directly,
        which is preferred. Common use: function parameters with default <code>None</code>{" "}
        and nullable return values.
      </p>

      <h3>4. What is a <code>Protocol</code>?</h3>
      <p>
        Structural subtyping for type checking — &quot;duck typing with verification.&quot;
        A class satisfies a Protocol if it has the required methods/attributes, regardless
        of whether it inherits from the Protocol. No explicit inheritance needed. Equivalent
        to TypeScript&apos;s structural interfaces. Add <code>@runtime_checkable</code> to
        use with <code>isinstance()</code>.
      </p>

      <h3>5. What is <code>TypedDict</code>?</h3>
      <p>
        A way to type-annotate dicts with specific key/value shapes. The dict still behaves
        as a normal Python dict at runtime — TypedDict only provides static type information.
        Use it when you must work with plain dicts (e.g. JSON responses, legacy APIs). For
        new code that needs validation, prefer Pydantic.
      </p>

      <h3>6. What is Pydantic used for?</h3>
      <p>
        Runtime data validation using Python type annotations. Define a model by inheriting
        from <code>BaseModel</code>; Pydantic validates, coerces, and serializes data
        automatically. Used in FastAPI for request/response models, config loading, and
        anywhere you need validated structured data at system boundaries.
      </p>

      <h3>7. What is <code>TypeVar</code>?</h3>
      <p>
        A placeholder for a type in generic functions and classes. When the function is
        called, the type checker infers the concrete type. Use <code>bound=X</code> to
        constrain to subtypes of X, or pass explicit types to constrain to a specific set.
        Python 3.12 introduced cleaner syntax: <code>def fn[T](x: T) -&gt; T</code>.
      </p>

      <h3>8. What is the difference between <code>Any</code> and <code>object</code>?</h3>
      <p>
        <code>Any</code> disables type checking — the type checker treats it as compatible
        with every type in both directions. <code>object</code> is the base class of all
        Python objects — it is compatible as a supertype (anything is an object) but you
        cannot call specific methods on it without narrowing. Avoid <code>Any</code>;
        use <code>object</code> or generics instead.
      </p>

      <h3>9. What is <code>NewType</code>?</h3>
      <p>
        Creates a distinct type for the type checker without any runtime overhead — it is
        a thin wrapper that type checkers treat as a separate type. Example:{" "}
        <code>UserId = NewType("UserId", int)</code> — <code>UserId</code> is an{" "}
        <code>int</code> at runtime, but the type checker prevents mixing it with plain{" "}
        <code>int</code> or other NewType wrappers.
      </p>

      <h3>10. How do you handle a function that never returns?</h3>
      <p>
        Annotate the return type as <code>NoReturn</code>. Used for functions that always
        raise an exception or run an infinite loop. Example:{" "}
        <code>def fail(msg: str) -&gt; NoReturn: raise RuntimeError(msg)</code>. The type
        checker then knows code after calling such a function is unreachable.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Annotate a module</h3>
      <p>
        Take the following untyped code and add complete type annotations. Use{" "}
        <code>str | None</code> syntax (Python 3.10+):
      </p>
      <pre><code>{`def find_user(users, user_id):
    for user in users:
        if user["id"] == user_id:
            return user
    return None

def format_name(first, last, title=None):
    if title:
        return f"{title} {first} {last}"
    return f"{first} {last}"`}</code></pre>

      <h3>Exercise 2 — TypedDict vs Pydantic</h3>
      <p>
        Define a <code>UserDict</code> (TypedDict) and a <code>UserModel</code> (Pydantic)
        for the same shape: <code>id: int</code>, <code>name: str</code>,{" "}
        <code>email: str</code>, <code>role: Literal["admin", "viewer"]</code>. Show what
        happens when you try to create each with <code>age="not-a-number"</code>
        as an extra field.
      </p>

      <h3>Exercise 3 — Protocol design</h3>
      <p>
        Define a <code>Repository</code> Protocol with methods:
      </p>
      <ul>
        <li><code>get(id: int) -&gt; dict | None</code></li>
        <li><code>save(data: dict) -&gt; int</code></li>
        <li><code>delete(id: int) -&gt; bool</code></li>
      </ul>
      <p>
        Implement two classes that satisfy it — <code>InMemoryRepo</code> and a stub{" "}
        <code>DatabaseRepo</code> — without inheriting from the Protocol. Write a function
        that accepts any <code>Repository</code>.
      </p>

      <h3>Exercise 4 — Generic Stack</h3>
      <p>
        Write a fully typed generic <code>Stack[T]</code> class with <code>push</code>,{" "}
        <code>pop</code>, <code>peek</code>, <code>is_empty</code>, and <code>__len__</code>.
        Use <code>TypeVar</code>. The type checker should infer that popping from a{" "}
        <code>Stack[str]</code> gives a <code>str</code>.
      </p>

      <h3>Exercise 5 — Pydantic model with validation</h3>
      <p>
        Create a Pydantic model <code>CreateOrderRequest</code> with:
      </p>
      <ul>
        <li><code>product_id: int</code> — must be positive</li>
        <li><code>quantity: int</code> — must be between 1 and 100</li>
        <li><code>discount_code: str | None</code> — optional, must be uppercase if provided</li>
        <li><code>shipping_address: str</code> — min length 10</li>
      </ul>
      <p>
        Add a <code>@field_validator</code> that normalizes <code>discount_code</code> to
        uppercase automatically.
      </p>

      <h3>Exercise 6 — Callable typing</h3>
      <p>
        Write a <code>Pipeline</code> class that holds a list of{" "}
        <code>Callable[[T], T]</code> transforms and applies them in order:
      </p>
      <pre><code>{`p = Pipeline[str]([str.strip, str.lower, lambda s: s.replace(" ", "_")])
p.run("  Hello World  ")   # "hello_world"`}</code></pre>

      <h3>Exercise 7 — Literal status machine</h3>
      <p>
        Define <code>OrderStatus = Literal["pending", "confirmed", "shipped", "delivered", "cancelled"]</code>.
        Write a function <code>can_transition(from_status: OrderStatus, to_status: OrderStatus) -&gt; bool</code>{" "}
        that validates allowed transitions using a dict of allowed next states.
      </p>

      <h3>Exercise 8 — TypedDict to Pydantic migration</h3>
      <p>
        You have this legacy TypedDict:
      </p>
      <pre><code>{`class EventDict(TypedDict):
    event_type: str
    user_id: int
    timestamp: str
    metadata: dict`}</code></pre>
      <p>
        Migrate it to a Pydantic model where <code>timestamp</code> is parsed as{" "}
        <code>datetime</code>, <code>event_type</code> is a{" "}
        <code>Literal["click", "view", "purchase"]</code>, and <code>metadata</code> is
        a <code>dict[str, str]</code>.
      </p>
    </div>
  );
}
