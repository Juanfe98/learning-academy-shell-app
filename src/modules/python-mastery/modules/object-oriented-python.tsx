import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "classes-and-objects", title: "Classes and Objects", level: 2 },
  { id: "self", title: "self", level: 2 },
  { id: "instance-vs-class-attrs", title: "Instance vs Class Attributes", level: 2 },
  { id: "methods", title: "Instance, Class, and Static Methods", level: 2 },
  { id: "properties", title: "Properties", level: 2 },
  { id: "inheritance", title: "Inheritance", level: 2 },
  { id: "composition", title: "Composition", level: 2 },
  { id: "dunder-methods", title: "Dunder Methods", level: 2 },
  { id: "repr-vs-str", title: "__repr__ vs __str__", level: 2 },
  { id: "dataclasses", title: "dataclasses", level: 2 },
  { id: "real-world-examples", title: "Real-World Use Cases", level: 2 },
  { id: "js-comparison", title: "Python vs JavaScript Classes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function ObjectOrientedPython() {
  return (
    <div className="article-content">
      <p>
        Python&apos;s OOP is more flexible than Java or C++ but less rigid than TypeScript
        classes. The key concepts interviewers test: the role of <code>self</code>, the
        difference between instance and class attributes, <code>@classmethod</code> vs{" "}
        <code>@staticmethod</code>, dunder methods, and when to use composition over
        inheritance.
      </p>

      <h2 id="classes-and-objects">Classes and Objects</h2>

      <pre><code>{`class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed

    def bark(self):
        return f"{self.name} says: Woof!"

# Instantiation — no "new" keyword in Python
rex = Dog("Rex", "Labrador")
buddy = Dog("Buddy", "Poodle")

print(rex.name)     # "Rex"
print(rex.bark())   # "Rex says: Woof!"

# Everything is an object
print(type(rex))         # <class '__main__.Dog'>
print(isinstance(rex, Dog))  # True`}</code></pre>

      <h2 id="self">self</h2>

      <p>
        <code>self</code> is a reference to the current instance. It is passed automatically
        by Python when calling an instance method — you declare it as the first parameter but
        never pass it explicitly.
      </p>

      <pre><code>{`class Counter:
    def __init__(self):
        self.count = 0         # instance attribute set on self

    def increment(self):
        self.count += 1        # access instance attribute via self

    def reset(self):
        self.count = 0

c = Counter()
c.increment()
c.increment()
print(c.count)   # 2

# self is just a convention — any name works, but always use self
class Counter:
    def increment(this):       # technically valid
        this.count += 1        # but never do this

# Python passes the instance automatically:
# c.increment()  is equivalent to  Counter.increment(c)`}</code></pre>

      <h2 id="instance-vs-class-attrs">Instance vs Class Attributes</h2>

      <pre><code>{`class Employee:
    company = "Acme Corp"       # class attribute — shared by all instances
    headcount = 0               # class attribute

    def __init__(self, name, role):
        self.name = name        # instance attribute — unique per instance
        self.role = role
        Employee.headcount += 1

    @classmethod
    def get_headcount(cls):
        return cls.headcount

e1 = Employee("Alice", "Engineer")
e2 = Employee("Bob", "Designer")

print(e1.company)        # "Acme Corp"  — found on class
print(e2.company)        # "Acme Corp"  — same class attribute
print(Employee.company)  # "Acme Corp"  — accessed directly on class

# Instance attribute shadows class attribute
e1.company = "NewCo"     # creates instance attribute on e1
print(e1.company)        # "NewCo"      — instance attribute wins
print(e2.company)        # "Acme Corp"  — e2 still uses class attribute
print(Employee.company)  # "Acme Corp"  — class attribute unchanged

# Mutation of mutable class attribute — shared side effect
class Team:
    members = []   # shared list!

    def add(self, name):
        self.members.append(name)   # modifies the SHARED list

t1 = Team()
t2 = Team()
t1.add("Alice")
print(t2.members)   # ["Alice"] — surprise! same list

# Fix: initialize in __init__
class Team:
    def __init__(self):
        self.members = []   # each instance gets its own list`}</code></pre>

      <h2 id="methods">Instance, Class, and Static Methods</h2>

      <h3>Instance methods</h3>
      <pre><code>{`class Circle:
    def __init__(self, radius):
        self.radius = radius

    def area(self):            # instance method — receives self
        return 3.14159 * self.radius ** 2

    def scale(self, factor):
        self.radius *= factor  # mutates the instance`}</code></pre>

      <h3>@classmethod</h3>
      <p>
        Receives the <strong>class</strong> as the first argument (<code>cls</code>), not the
        instance. Used for alternative constructors and factory methods.
      </p>
      <pre><code>{`class Date:
    def __init__(self, year, month, day):
        self.year = year
        self.month = month
        self.day = day

    @classmethod
    def from_string(cls, date_str):
        year, month, day = map(int, date_str.split("-"))
        return cls(year, month, day)   # creates an instance of cls

    @classmethod
    def today(cls):
        import datetime
        d = datetime.date.today()
        return cls(d.year, d.month, d.day)

d1 = Date(2024, 1, 15)
d2 = Date.from_string("2024-01-15")    # alternative constructor
d3 = Date.today()`}</code></pre>

      <h3>@staticmethod</h3>
      <p>
        Receives neither <code>self</code> nor <code>cls</code>. Behaves like a regular
        function but lives in the class namespace. Used for utility functions logically
        related to the class but not needing instance or class state.
      </p>
      <pre><code>{`class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @staticmethod
    def celsius_to_fahrenheit(c):
        return c * 9/5 + 32

    @staticmethod
    def fahrenheit_to_celsius(f):
        return (f - 32) * 5/9

    def to_fahrenheit(self):
        return Temperature.celsius_to_fahrenheit(self.celsius)

# Call on class or instance — both work
Temperature.celsius_to_fahrenheit(100)   # 212.0
t = Temperature(100)
t.celsius_to_fahrenheit(100)             # 212.0`}</code></pre>

      <h3>Summary table</h3>
      <pre><code>{`# Method type    First arg    Decorator         Use case
# instance       self         (none)            access/mutate instance state
# class          cls          @classmethod      factory methods, alt constructors
# static         (none)       @staticmethod     utility — no self or cls needed`}</code></pre>

      <h2 id="properties">Properties</h2>

      <p>
        Properties let you expose attributes with getter/setter logic while keeping the
        call site clean — no <code>get_x()</code>/<code>set_x()</code> methods needed.
      </p>

      <pre><code>{`class BankAccount:
    def __init__(self, balance):
        self._balance = balance   # _ prefix: "internal use" convention

    @property
    def balance(self):
        return self._balance

    @balance.setter
    def balance(self, value):
        if value < 0:
            raise ValueError("Balance cannot be negative")
        self._balance = value

    @balance.deleter
    def balance(self):
        del self._balance

account = BankAccount(100)
print(account.balance)      # 100 — calls getter
account.balance = 200       # calls setter
account.balance = -50       # raises ValueError

# Read-only property — omit the setter
class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return 3.14159 * self.radius ** 2

c = Circle(5)
print(c.area)     # 78.53975
# c.area = 10    # AttributeError — no setter defined`}</code></pre>

      <h2 id="inheritance">Inheritance</h2>

      <pre><code>{`class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError("subclass must implement speak()")

    def __repr__(self):
        return f"{self.__class__.__name__}({self.name!r})"

class Dog(Animal):
    def speak(self):
        return f"{self.name} says: Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says: Meow!"

dog = Dog("Rex")
cat = Cat("Whiskers")
print(dog.speak())   # "Rex says: Woof!"
print(cat.speak())   # "Whiskers says: Meow!"

# isinstance checks the whole hierarchy
print(isinstance(dog, Dog))     # True
print(isinstance(dog, Animal))  # True
print(isinstance(dog, Cat))     # False`}</code></pre>

      <h3>super()</h3>
      <pre><code>{`class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name, "Woof")   # call parent __init__
        self.breed = breed               # then extend

dog = Dog("Rex", "Labrador")
print(dog.name)    # "Rex"
print(dog.sound)   # "Woof"
print(dog.breed)   # "Labrador"`}</code></pre>

      <h3>Multiple inheritance and MRO</h3>
      <pre><code>{`class Flyable:
    def fly(self):
        return "flying"

class Swimmable:
    def swim(self):
        return "swimming"

class Duck(Flyable, Swimmable):
    pass

duck = Duck()
duck.fly()    # "flying"
duck.swim()   # "swimming"

# Method Resolution Order — left-to-right, depth-first
print(Duck.__mro__)
# (<class 'Duck'>, <class 'Flyable'>, <class 'Swimmable'>, <class 'object'>)`}</code></pre>

      <h2 id="composition">Composition</h2>

      <p>
        Composition means building objects that <em>contain</em> other objects rather than
        inheriting from them. Prefer composition when the &quot;is-a&quot; relationship is not
        genuinely true — many class hierarchies that use inheritance should use composition.
      </p>

      <pre><code>{`# Inheritance (is-a): a Dog IS AN Animal
class Dog(Animal): ...

# Composition (has-a): a Car HAS AN Engine
class Engine:
    def __init__(self, horsepower):
        self.horsepower = horsepower

    def start(self):
        return f"Engine ({self.horsepower}hp) started"

class Car:
    def __init__(self, make, horsepower):
        self.make = make
        self.engine = Engine(horsepower)   # Car HAS AN Engine

    def start(self):
        return self.engine.start()   # delegate to engine

car = Car("Toyota", 150)
print(car.start())   # "Engine (150hp) started"

# Benefits of composition over inheritance:
# - More flexible — swap components at runtime
# - Avoids fragile base class problem
# - Easier to test — mock components independently`}</code></pre>

      <h2 id="dunder-methods">Dunder Methods</h2>

      <p>
        Dunder (double underscore) methods let you define how Python operators and built-in
        functions behave with your objects.
      </p>

      <pre><code>{`class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    # Readable representation for developers
    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    # Human-readable string
    def __str__(self):
        return f"({self.x}, {self.y})"

    # + operator
    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    # == operator
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    # len()
    def __len__(self):
        return 2

    # Indexing: v[0]
    def __getitem__(self, index):
        return (self.x, self.y)[index]

    # bool() / truthiness
    def __bool__(self):
        return bool(self.x or self.y)

    # Iteration
    def __iter__(self):
        yield self.x
        yield self.y

v1 = Vector(1, 2)
v2 = Vector(3, 4)

print(v1 + v2)    # Vector(4, 6)
print(v1 == v2)   # False
print(len(v1))    # 2
print(v1[0])      # 1
x, y = v1         # unpacking via __iter__`}</code></pre>

      <h3>Common dunders reference</h3>
      <pre><code>{`# Lifecycle
__init__      # constructor
__del__       # destructor (avoid — GC is unpredictable)
__new__       # object creation (before __init__, rarely needed)

# String / repr
__repr__      # unambiguous, for developers: repr(obj)
__str__       # readable, for users: str(obj), print(obj)
__format__    # f"{obj:spec}"

# Comparison
__eq__        # ==
__ne__        # !=
__lt__        # <
__le__        # <=
__gt__        # >
__ge__        # >=

# Arithmetic
__add__       # +
__sub__       # -
__mul__       # *
__truediv__   # /
__floordiv__  # //
__mod__       # %
__pow__       # **
__neg__       # unary -

# Container protocol
__len__       # len(obj)
__getitem__   # obj[key]
__setitem__   # obj[key] = value
__delitem__   # del obj[key]
__contains__  # item in obj
__iter__      # iter(obj), for loops
__next__      # next(obj)

# Context manager
__enter__     # with obj as x:
__exit__      # end of with block

# Callable
__call__      # obj()  — makes instance callable

# Hashing
__hash__      # hash(obj) — needed if used in set/dict
              # Note: if you define __eq__, Python sets __hash__ = None`}</code></pre>

      <h2 id="repr-vs-str">__repr__ vs __str__</h2>

      <pre><code>{`class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        # Goal: unambiguous, should look like constructor call
        # Used in: repr(obj), in REPL, inside containers
        return f"Point({self.x!r}, {self.y!r})"

    def __str__(self):
        # Goal: readable human-friendly string
        # Used in: print(obj), str(obj), f-strings
        return f"({self.x}, {self.y})"

p = Point(1, 2)
repr(p)       # "Point(1, 2)"  — __repr__
str(p)        # "(1, 2)"       — __str__
print(p)      # "(1, 2)"       — __str__
f"{p}"        # "(1, 2)"       — __str__
[p]           # [Point(1, 2)]  — __repr__ (inside containers)

# Rule: always define __repr__. Define __str__ only if you need
# a different user-facing format.
# If only __repr__ is defined, __str__ falls back to __repr__.`}</code></pre>

      <h2 id="dataclasses">dataclasses</h2>

      <p>
        <code>@dataclass</code> auto-generates <code>__init__</code>, <code>__repr__</code>,
        and <code>__eq__</code> from class-level type annotations. Less boilerplate for
        data-holding classes.
      </p>

      <pre><code>{`from dataclasses import dataclass, field

@dataclass
class User:
    name: str
    email: str
    age: int
    tags: list = field(default_factory=list)   # mutable default — use field()
    active: bool = True                         # immutable default — fine as-is

# Auto-generated __init__, __repr__, __eq__
u1 = User("Juan", "juan@example.com", 30)
u2 = User("Juan", "juan@example.com", 30)

print(u1)           # User(name='Juan', email='juan@example.com', age=30, tags=[], active=True)
print(u1 == u2)     # True — __eq__ compares all fields

u1.tags.append("admin")   # still mutable — dataclass doesn't enforce immutability`}</code></pre>

      <h3>frozen=True — immutable dataclass</h3>
      <pre><code>{`@dataclass(frozen=True)
class Point:
    x: float
    y: float

p = Point(1.0, 2.0)
# p.x = 3.0   # FrozenInstanceError

# frozen dataclasses are hashable — can be used in sets/dicts
{Point(0, 0), Point(1, 1)}`}</code></pre>

      <h3>order=True — comparison operators</h3>
      <pre><code>{`@dataclass(order=True)
class Version:
    major: int
    minor: int
    patch: int

v1 = Version(1, 2, 3)
v2 = Version(1, 3, 0)
print(v1 < v2)   # True — compares field by field in declaration order`}</code></pre>

      <h3>post_init for derived fields</h3>
      <pre><code>{`from dataclasses import dataclass

@dataclass
class Rectangle:
    width: float
    height: float
    area: float = field(init=False)   # not in __init__

    def __post_init__(self):
        self.area = self.width * self.height

r = Rectangle(3.0, 4.0)
print(r.area)   # 12.0`}</code></pre>

      <h2 id="real-world-examples">Real-World Use Cases</h2>

      <p>
        These are the examples to reach for in interviews when asked &quot;give me an
        example of X.&quot; Each section explains <strong>what problem the concept solves</strong>,
        <strong>how the code works step by step</strong>, and includes heavily commented
        production-grade code.
      </p>

      <h3>Classes and Objects → Domain models</h3>
      <p>
        <strong>The problem:</strong> your application needs to represent real-world
        things (products, users, orders) with both data <em>and</em> behaviour.
        Without classes you end up with loose dicts and scattered functions — hard to
        maintain and test.
      </p>
      <p>
        <strong>The solution:</strong> a class bundles the data (attributes) and the
        operations on that data (methods) into one unit. The key insight:{" "}
        <code>apply_discount</code> returns a <em>new</em> Product instead of mutating
        the existing one — this is intentional. The original product object is unchanged,
        making this safe to call anywhere without side effects.
      </p>
      <pre><code>{`class Product:
    def __init__(self, name: str, price: float, stock: int):
        # Each instance stores its own independent data
        self.name = name
        self.price = price
        self.stock = stock

    def is_available(self, qty: int = 1) -> bool:
        # Business rule lives ON the object — not scattered in a helper function
        return self.stock >= qty

    def apply_discount(self, percent: float) -> "Product":
        # Returns a NEW product — does not mutate self
        # This is called an "immutable update" pattern — safe for concurrent code
        # "Product" in quotes = forward reference (class not fully defined yet)
        return Product(self.name, self.price * (1 - percent / 100), self.stock)

    def __repr__(self) -> str:
        return f"Product({self.name!r}, \${self.price:.2f}, stock={self.stock})"

laptop = Product("MacBook Pro", 2499.99, 5)

# is_available reads instance data via self.stock
if laptop.is_available(qty=2):
    discounted = laptop.apply_discount(10)   # laptop itself is unchanged
    print(laptop.price)      # 2499.99 — original untouched
    print(discounted.price)  # 2249.99 — new object with discount applied`}</code></pre>

      <h3>Instance vs Class Attributes → Plugin / registry pattern</h3>
      <p>
        <strong>The problem:</strong> you want to send notifications via different
        channels (email, Slack, SMS). The channel is chosen at runtime from a config
        string — you cannot hardcode which class to use.
      </p>
      <p>
        <strong>Why a class attribute?</strong> <code>_registry</code> is defined on the
        class body, not on <code>self</code>. This means{" "}
        <strong>one single dict is shared by all instances and the class itself</strong>.
        Think of it as a global lookup table that lives inside the class namespace.
      </p>
      <p>
        <strong>What is <code>__init_subclass__</code>?</strong> Python calls this hook
        automatically on the <em>parent class</em> whenever a new subclass is defined —
        not when an instance is created. The moment Python reads{" "}
        <code>class EmailChannel(NotificationChannel, channel_name="email")</code>, it
        calls <code>NotificationChannel.__init_subclass__(cls=EmailChannel, channel_name="email")</code>.
        You never call this yourself — Python does it for you.
      </p>
      <pre><code>{`class NotificationChannel:
    # Class attribute: ONE dict shared by NotificationChannel AND all subclasses
    # Visualise it as: NotificationChannel._registry = {}
    _registry: dict[str, type] = {}

    def __init_subclass__(cls, channel_name: str, **kwargs):
        # Python calls this AUTOMATICALLY when a subclass is DEFINED (not instantiated)
        # cls = the subclass being defined (e.g. EmailChannel)
        # channel_name = the keyword arg passed in the class definition
        super().__init_subclass__(**kwargs)

        # Registers the subclass in the shared dict
        # After EmailChannel is defined: _registry = {"email": EmailChannel}
        # After SlackChannel is defined: _registry = {"email": EmailChannel, "slack": SlackChannel}
        NotificationChannel._registry[channel_name] = cls

    @classmethod
    def get(cls, name: str) -> type:
        # Returns the CLASS (not an instance) — caller must still instantiate it
        return cls._registry[name]

    def send(self, message: str) -> None:
        raise NotImplementedError   # forces subclasses to implement this

# When Python reads this line, __init_subclass__ fires automatically
# Result: _registry["email"] = EmailChannel
class EmailChannel(NotificationChannel, channel_name="email"):
    def send(self, message: str) -> None:
        print(f"[EMAIL] {message}")

# When Python reads this line, __init_subclass__ fires again
# Result: _registry["slack"] = SlackChannel
class SlackChannel(NotificationChannel, channel_name="slack"):
    def send(self, message: str) -> None:
        print(f"[SLACK] {message}")

# At this point _registry = {"email": EmailChannel, "slack": SlackChannel}
# No manual registration needed — subclasses register themselves

# From a config file: channel_name = "slack"
channel_name = "slack"
channel_cls = NotificationChannel.get(channel_name)  # → SlackChannel (the class)
channel_cls().send("Deploy successful")               # → [SLACK] Deploy successful
# channel_cls() creates an instance of SlackChannel, then calls .send()

# Why this matters: you can add a new channel (e.g. SMS) without changing
# ANY existing code — just define the subclass, it auto-registers itself.
# Django's model registry, FastAPI's router, Celery's task registry all work this way.`}</code></pre>

      <h3>@classmethod → Alternative constructors in real APIs</h3>
      <p>
        <strong>The problem:</strong> a <code>DatabaseConfig</code> object can be built
        from several different data sources: individual env vars, a single URL string, or
        hardcoded dev defaults. If you put all this logic in <code>__init__</code>, the
        signature becomes messy with optional/conditional parameters.
      </p>
      <p>
        <strong>The solution:</strong> multiple <code>@classmethod</code> constructors —
        one per data source. Each reads its input, extracts the values, and calls{" "}
        <code>cls(...)</code> which is identical to <code>DatabaseConfig(...)</code>. The
        reason to use <code>cls</code> instead of the class name directly: if a subclass
        inherits this method, <code>cls</code> will be the subclass, not the parent.
      </p>
      <pre><code>{`import os
from urllib.parse import urlparse

class DatabaseConfig:
    # __init__ accepts INDIVIDUAL fields — this is the single authoritative constructor
    def __init__(self, host: str, port: int, name: str, user: str, password: str, ssl: bool = False):
        self.host = host
        self.port = port
        self.name = name
        self.user = user
        self.password = password
        self.ssl = ssl

    # @classmethod receives 'cls' = the class itself (DatabaseConfig or a subclass)
    # It reads env vars, then calls cls(...) to build the instance
    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        # os.environ["KEY"] raises KeyError if missing — fail fast on startup
        return cls(
            host=os.environ["DB_HOST"],
            port=int(os.environ.get("DB_PORT", "5432")),  # .get = optional with default
            name=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            ssl=os.environ.get("DB_SSL", "false").lower() == "true",
        )

    @classmethod
    def from_url(cls, url: str) -> "DatabaseConfig":
        # Heroku/Railway provide a single DATABASE_URL = "postgresql://user:pass@host/db"
        # urlparse splits it into components
        p = urlparse(url)
        return cls(
            host=p.hostname,
            port=p.port or 5432,
            name=p.path.lstrip("/"),  # "/mydb" → "mydb"
            user=p.username,
            password=p.password,
        )

    @classmethod
    def local(cls) -> "DatabaseConfig":
        # Shorthand for local development — no env vars needed
        return cls("localhost", 5432, "dev_db", "postgres", "postgres")

    @property
    def url(self) -> str:
        # Computed property — always builds from current state, never stored
        scheme = "postgresql+asyncpg" if self.ssl else "postgresql"
        return f"{scheme}://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

# Each environment uses the most natural constructor
config = DatabaseConfig.from_env()         # CI/production — reads env vars
config = DatabaseConfig.from_url(os.environ["DATABASE_URL"])  # Heroku/Railway
config = DatabaseConfig.local()            # local dev — no setup needed
print(config.url)   # postgresql://postgres:postgres@localhost:5432/dev_db`}</code></pre>

      <h3>@staticmethod → Validation utilities bound to a class</h3>
      <p>
        <strong>The problem:</strong> you need validation functions for a <code>User</code>{" "}
        (check username format, validate email, hash passwords). These do not need any
        instance state — they only operate on the input they receive.
      </p>
      <p>
        <strong>Why not plain functions?</strong> You <em>could</em> put these in a
        separate <code>user_utils.py</code>. Static methods are preferred when the logic
        is tightly coupled to one class conceptually — they live in the class namespace,
        appear in <code>dir(User)</code>, and signal to readers &quot;this is User-related
        logic.&quot; Call them on the class (<code>User.is_valid_email(...)</code>) or on
        an instance — both work identically.
      </p>
      <pre><code>{`import re, hashlib, secrets

class User:
    def __init__(self, username: str, email: str, password_hash: str):
        self.username = username
        self.email = email
        self.password_hash = password_hash

    # @staticmethod: no self, no cls — pure input → output function
    # Lives here because it IS "User validation logic"
    @staticmethod
    def is_valid_username(username: str) -> bool:
        # ^ = start, $ = end, [a-zA-Z0-9_] = allowed chars, {3,20} = length range
        return bool(re.match(r"^[a-zA-Z0-9_]{3,20}$", username))

    @staticmethod
    def is_valid_email(email: str) -> bool:
        return bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", email))

    @staticmethod
    def hash_password(plain: str) -> str:
        # secrets.token_hex generates a cryptographically random salt
        # The salt prevents identical passwords from having identical hashes
        # In production use bcrypt: pwd_context.hash(plain)
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256(f"{salt}{plain}".encode()).hexdigest()
        return f"{salt}:{hashed}"   # store salt + hash together

    @staticmethod
    def verify_password(plain: str, stored_hash: str) -> bool:
        salt, expected = stored_hash.split(":")
        actual = hashlib.sha256(f"{salt}{plain}".encode()).hexdigest()
        return actual == expected   # use hmac.compare_digest in production!

    @classmethod  # classmethod can call staticmethod
    def create(cls, username: str, email: str, password: str) -> "User":
        # Validate BEFORE creating the object
        if not cls.is_valid_username(username):
            raise ValueError(f"invalid username: {username!r}")
        if not cls.is_valid_email(email):
            raise ValueError(f"invalid email: {email!r}")
        return cls(username, email, cls.hash_password(password))

# Static methods called without instantiation — this is the key benefit
if not User.is_valid_username("ju"):   # "ju" is only 2 chars
    raise ValueError("username too short")

user = User.create("juan_dev", "juan@example.com", "secret123")`}</code></pre>

      <h3>Properties → Order status machine with validation</h3>
      <p>
        <strong>The problem:</strong> an Order has a <code>status</code> field, but not
        all transitions are valid — you cannot jump from <code>"pending"</code> straight
        to <code>"delivered"</code>. You also want <code>total</code> to always be
        correct without storing a value that can get out of sync.
      </p>
      <p>
        <strong>Why properties?</strong> Without them you would need{" "}
        <code>order.get_total()</code> and <code>order.set_status("confirmed")</code>{" "}
        — verbose and un-Pythonic. Properties keep the clean attribute syntax (
        <code>order.total</code>, <code>order.status = "confirmed"</code>) while running
        logic invisibly on access/assignment.
      </p>
      <pre><code>{`from datetime import datetime

class Order:
    def __init__(self, items: list[dict]):
        self._items = items           # _ prefix = "don't access directly"
        self._status = "pending"      # real data stored in _status, not status
        self._created_at = datetime.now()

    # @property makes this a READ-ONLY getter
    # order.total calls this function — caller sees it as a plain attribute
    @property
    def total(self) -> float:
        # Computed on the fly — always correct, never stale
        # No risk of forgetting to update a stored "total" field after adding items
        return sum(item["price"] * item["qty"] for item in self._items)

    @property
    def item_count(self) -> int:
        return sum(item["qty"] for item in self._items)

    # @property defines the GETTER
    @property
    def status(self) -> str:
        return self._status   # reads from the private _status

    # @status.setter — runs when you write: order.status = "confirmed"
    # Without this, assignment would raise AttributeError
    @status.setter
    def status(self, new_status: str) -> None:
        # Business rule: only certain transitions are allowed
        # pending → confirmed or cancelled
        # confirmed → shipped or cancelled
        # shipped → delivered (only)
        # delivered and cancelled are terminal — cannot change further
        TRANSITIONS = {
            "pending":   {"confirmed", "cancelled"},
            "confirmed": {"shipped",   "cancelled"},
            "shipped":   {"delivered"},
            "delivered": set(),   # terminal
            "cancelled": set(),   # terminal
        }
        allowed = TRANSITIONS.get(self._status, set())
        if new_status not in allowed:
            raise ValueError(
                f"cannot transition from {self._status!r} to {new_status!r}. "
                f"Allowed: {allowed or 'none (terminal state)'}"
            )
        self._status = new_status   # only store if valid

    # Read-only — no setter defined, so assignment raises AttributeError
    @property
    def created_at(self) -> datetime:
        return self._created_at

order = Order([{"price": 10.0, "qty": 2}, {"price": 5.0, "qty": 1}])
print(order.total)        # 25.0 — computed on the fly, no stored field
print(order.item_count)   # 3

order.status = "confirmed"   # OK — setter validates transition
order.status = "shipped"     # OK
order.status = "pending"     # ValueError: cannot transition from 'shipped' to 'pending'
# order.created_at = datetime.now()  # AttributeError — no setter`}</code></pre>

      <h3>Inheritance → HTTP exception hierarchy</h3>
      <p>
        <strong>The problem:</strong> your FastAPI app needs to raise errors from service
        code and have them automatically return the right HTTP status code. You want one
        global handler instead of 404/401/422 logic scattered everywhere.
      </p>
      <p>
        <strong>How inheritance helps:</strong> all exceptions inherit from{" "}
        <code>AppError</code>. Each subclass <em>overrides</em> the class attribute
        <code>status_code</code>. The global FastAPI handler catches the base class —
        because <code>isinstance(NotFoundError(), AppError)</code> is <code>True</code>,
        the handler fires for any subclass. <code>super().__init__(message)</code> passes
        the message up to Python&apos;s built-in <code>Exception</code> so standard
        exception machinery (tracebacks, logging) works normally.
      </p>
      <pre><code>{`class AppError(Exception):
    # Class attribute — shared default, subclasses override it
    status_code: int = 500
    default_message: str = "internal server error"

    def __init__(self, message: str | None = None):
        # Allow subclasses to pass no message and use their default
        self.message = message or self.default_message
        super().__init__(self.message)   # passes message to Exception.__init__

class ClientError(AppError):
    # Overrides status_code — all 4xx errors inherit from this
    status_code = 400

class NotFoundError(ClientError):
    status_code = 404   # overrides ClientError's 400
    def __init__(self, resource: str, id: int | str):
        # Builds a standard message, passes it to ClientError → AppError → Exception
        super().__init__(f"{resource} {id!r} not found")

class ValidationError(ClientError):
    status_code = 422
    def __init__(self, field: str, reason: str):
        super().__init__(f"{field}: {reason}")
        self.field = field   # extra context — callers can read exc.field

class AuthError(ClientError):
    status_code = 401
    default_message = "authentication required"   # no custom __init__ needed

class ForbiddenError(ClientError):
    status_code = 403
    default_message = "insufficient permissions"

# ONE handler catches ALL AppError subclasses
# isinstance(NotFoundError(), AppError) → True (walks the hierarchy)
@app.exception_handler(AppError)
async def handle_app_error(request, exc: AppError):
    # exc.status_code is 404 for NotFoundError, 401 for AuthError, etc.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

def get_user(user_id: int) -> User:
    user = db.find(user_id)
    if user is None:
        raise NotFoundError("user", user_id)  # → 404 JSON response, no try/except here

# Callers can catch at different levels of specificity
try:
    user = get_user(42)
except NotFoundError:        # catches ONLY 404s
    return empty_state()
except ClientError:          # catches ALL 4xx (400, 401, 403, 404, 409, 422)
    return client_error_response()
except AppError:             # catches EVERYTHING including 500s
    return server_error_response()`}</code></pre>

      <h3>Composition → Service + Repository</h3>
      <p>
        <strong>The problem:</strong> <code>UserService</code> needs to save users to a
        database and send welcome emails. If it directly imports{" "}
        <code>PostgresUserRepository</code> and <code>SendGridEmailService</code>, tests
        require a real database and real SMTP server — slow and fragile.
      </p>
      <p>
        <strong>How composition fixes this:</strong> instead of inheriting from a
        repository (&quot;is-a&quot;), the service <em>holds a reference</em> to one
        (&quot;has-a&quot;). The type is declared as a <code>Protocol</code> (structural
        interface) — any object with the right methods satisfies it. In tests, pass a
        fake. In production, pass the real implementation.{" "}
        <strong>UserService never changes — only the wiring does.</strong>
      </p>
      <pre><code>{`from typing import Protocol

# Protocol = "any object with these methods is acceptable"
# No inheritance required — structural typing (duck typing + type checking)
class UserRepository(Protocol):
    def get_by_email(self, email: str) -> dict | None: ...
    def save(self, data: dict) -> dict: ...

class EmailService(Protocol):
    def send_welcome(self, email: str, name: str) -> None: ...

class UserService:
    # __init__ accepts ANY object satisfying the Protocol — doesn't care about the class name
    def __init__(self, repo: UserRepository, email: EmailService):
        self._repo = repo       # composition: HAS-A repository
        self._email = email     # composition: HAS-A email service

    def register(self, name: str, email: str) -> dict:
        # Business rule: no duplicate emails
        if self._repo.get_by_email(email):
            raise ConflictError(f"{email} already registered")

        # Delegate to injected dependencies — service doesn't know HOW they work
        user = self._repo.save({"name": name, "email": email})
        self._email.send_welcome(email, name)
        return user

# PRODUCTION: real database, real email
prod_service = UserService(
    repo=PostgresUserRepository(db_session),    # talks to real PostgreSQL
    email=SendGridEmailService(api_key),        # sends real emails
)

# TESTS: fake implementations — no network, no database, instant
class FakeUserRepo:
    def __init__(self): self._store = {}
    def get_by_email(self, email): return self._store.get(email)
    def save(self, data): self._store[data["email"]] = data; return data

class FakeEmailService:
    def __init__(self): self.sent = []
    def send_welcome(self, email, name): self.sent.append(email)

test_service = UserService(repo=FakeUserRepo(), email=FakeEmailService())
# Tests run instantly with zero external dependencies`}</code></pre>

      <h3>Dunder Methods → A QuerySet-like builder</h3>
      <p>
        <strong>The problem:</strong> you want a chainable query builder that feels like
        a native Python collection — you can iterate it, check its length, index into it,
        and use it in <code>if</code> conditions — without the caller knowing it is a
        custom class.
      </p>
      <p>
        <strong>How dunders make this possible:</strong> when Python sees{" "}
        <code>len(qs)</code> it calls <code>qs.__len__()</code>. When it sees{" "}
        <code>for x in qs</code> it calls <code>qs.__iter__()</code>. When it sees{" "}
        <code>if qs:</code> it calls <code>qs.__bool__()</code>. Defining these methods
        lets your object plug into Python&apos;s entire operator and built-in system.
        This is exactly how Django&apos;s ORM QuerySet works.
      </p>
      <pre><code>{`class QuerySet:
    def __init__(self, data: list[dict]):
        self._data = data
        self._filters: list = []
        self._order_by: str | None = None

    def filter(self, **kwargs) -> "QuerySet":
        # Returns a NEW QuerySet with the filter added — original is unchanged
        # This is method chaining — each call returns self (or a new instance)
        qs = QuerySet(self._data)
        qs._filters = self._filters + [kwargs]
        qs._order_by = self._order_by
        return qs

    def order_by(self, field: str) -> "QuerySet":
        qs = QuerySet(self._data)
        qs._filters = self._filters[:]
        qs._order_by = field
        return qs

    def _evaluate(self) -> list[dict]:
        # Apply all accumulated filters — this runs the actual query
        result = self._data
        for f in self._filters:
            result = [r for r in result if all(r.get(k) == v for k, v in f.items())]
        if self._order_by:
            result = sorted(result, key=lambda x: x.get(self._order_by, ""))
        return result

    # len(qs) — Python calls qs.__len__()
    def __len__(self) -> int:
        return len(self._evaluate())

    # for x in qs — Python calls qs.__iter__()
    def __iter__(self):
        return iter(self._evaluate())

    # qs[0] or qs[1:3] — Python calls qs.__getitem__(index)
    def __getitem__(self, index):
        return self._evaluate()[index]

    # if qs: — Python calls qs.__bool__()
    # Empty QuerySet is falsy, non-empty is truthy
    def __bool__(self) -> bool:
        return len(self) > 0

    # repr(qs) or REPL display
    def __repr__(self) -> str:
        return f"QuerySet({self._evaluate()!r})"

users = QuerySet([
    {"name": "Alice", "role": "admin", "age": 30},
    {"name": "Bob",   "role": "viewer", "age": 25},
    {"name": "Carol", "role": "admin", "age": 28},
])

# Chain methods — each returns a new QuerySet, nothing runs until we consume it
admins = users.filter(role="admin").order_by("age")

print(len(admins))     # 2  — calls __len__
if admins:             # calls __bool__ — True because len > 0
    for user in admins:    # calls __iter__ — yields Carol then Alice (age order)
        print(user["name"])
print(admins[0])       # calls __getitem__(0) → youngest admin`}</code></pre>

      <h3>Dataclasses → Domain events and value objects</h3>
      <p>
        <strong>The problem:</strong> you have many small data-holding classes that need
        <code>__init__</code>, <code>__repr__</code>, and <code>__eq__</code> but no
        complex behaviour. Writing these manually is tedious and error-prone.
      </p>
      <p>
        <strong>Domain events with <code>frozen=True</code>:</strong> events represent
        things that <em>happened</em> — they are facts, not mutable state. Making them
        immutable (<code>frozen=True</code>) enforces this at runtime and as a side effect
        makes them <strong>hashable</strong> (can be used in sets and as dict keys).
      </p>
      <p>
        <strong>Value objects with dunder methods:</strong> a <code>Money</code> class
        with <code>__add__</code> and <code>__mul__</code> lets you write{" "}
        <code>price + tax</code> instead of <code>price.add(tax)</code>. Combined with{" "}
        <code>frozen=True</code>, each arithmetic operation produces a new object — the
        originals are never mutated.
      </p>
      <pre><code>{`from dataclasses import dataclass, field
from datetime import datetime

# ── Domain events ─────────────────────────────────────────────────────
# frozen=True means:
# 1. Attributes cannot be changed after creation (immutable)
# 2. __hash__ is auto-generated → can be used in sets and dict keys
# 3. FrozenInstanceError if you try to assign: event.order_id = 99

@dataclass(frozen=True)
class OrderPlacedEvent:
    order_id: int
    customer_id: int
    total: float
    # field(default_factory=...) runs datetime.now() at INSTANTIATION time
    # (not at class definition time — avoids the mutable default pitfall)
    occurred_at: datetime = field(default_factory=datetime.now)

@dataclass(frozen=True)
class PaymentFailedEvent:
    order_id: int
    reason: str
    occurred_at: datetime = field(default_factory=datetime.now)

# Events are hashable → store in a set to avoid duplicates
event_log: set[OrderPlacedEvent] = set()
event_log.add(OrderPlacedEvent(order_id=1, customer_id=42, total=99.99))
event_log.add(OrderPlacedEvent(order_id=1, customer_id=42, total=99.99))  # duplicate → set ignores it
print(len(event_log))   # 1 — deduplication works because frozen dataclass is hashable

# ── Value object: Money ────────────────────────────────────────────────
# A "value object" is defined by its VALUE, not its identity
# Two Money(10, "USD") objects ARE equal — regardless of which variable holds them

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str = "USD"

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"cannot add {self.currency} and {other.currency}")
        # Returns a NEW Money — self and other are unchanged (immutable)
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, factor: float) -> "Money":
        return Money(round(self.amount * factor, 2), self.currency)

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:.2f}"

price = Money(29.99)     # USD 29.99
tax   = price * 0.20     # USD 6.00  (new object — price unchanged)
total = price + tax      # USD 35.99 (new object)
print(total)             # USD 35.99
print(price)             # USD 29.99 — immutable: original never changed

# Equality by value — this is what @dataclass generates for __eq__
print(Money(10.0, "USD") == Money(10.0, "USD"))   # True — same value
print(Money(10.0, "USD") is Money(10.0, "USD"))   # False — different objects`}</code></pre>

      <h2 id="js-comparison">Python vs JavaScript Classes</h2>

      <pre><code>{`// JavaScript                         # Python

// Class definition
class Dog {                           class Dog:
  constructor(name) {                     def __init__(self, name):
    this.name = name;                         self.name = name
  }

  bark() {                                def bark(self):
    return \`\${this.name}: Woof!\`;            return f"{self.name}: Woof!"
  }
}

// Static method
static create(name) { ... }           @staticmethod
                                      def create(name): ...

// Class method (no direct equiv)     @classmethod
                                      def from_dict(cls, d): ...

// Private fields (JS #)
#secret = 42;                         self.__secret = 42   # name-mangled
                                      self._secret = 42    # convention only

// Getters/setters
get balance() { ... }                 @property
set balance(v) { ... }                def balance(self): ...
                                      @balance.setter
                                      def balance(self, v): ...

// Inheritance
class Poodle extends Dog {            class Poodle(Dog):
  constructor(name) {                     def __init__(self, name):
    super(name);                              super().__init__(name)
  }
}

// No equivalent                      @dataclass
                                      class User:
                                          name: str
                                          age: int`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is <code>self</code>?</h3>
      <p>
        A reference to the current instance, passed automatically by Python as the first
        argument to instance methods. It is a convention (any name works) but always use{" "}
        <code>self</code>. It gives you access to instance attributes and other methods.
        Calling <code>obj.method()</code> is syntactic sugar for{" "}
        <code>ClassName.method(obj)</code>.
      </p>

      <h3>2. What is the difference between an instance attribute and a class attribute?</h3>
      <p>
        A class attribute is defined directly on the class body and shared by all instances.
        An instance attribute is set on <code>self</code> (usually in <code>__init__</code>)
        and unique to each instance. When you access an attribute on an instance, Python looks
        at the instance first, then the class — so instance attributes shadow class attributes
        of the same name.
      </p>

      <h3>3. What is the difference between <code>@staticmethod</code> and <code>@classmethod</code>?</h3>
      <p>
        A <code>@staticmethod</code> receives neither the instance nor the class — it behaves
        like a plain function scoped to the class namespace. A <code>@classmethod</code>{" "}
        receives the class (<code>cls</code>) as the first argument, allowing it to create
        instances, access class attributes, and work correctly with subclasses. The most
        common use of <code>@classmethod</code> is alternative constructors (factory methods).
      </p>

      <h3>4. What are dunder methods?</h3>
      <p>
        Methods with double-underscore prefix and suffix (e.g. <code>__init__</code>,{" "}
        <code>__repr__</code>, <code>__add__</code>). They define how Python operators and
        built-in functions behave with your objects. Implementing <code>__add__</code> lets
        you use <code>+</code>; <code>__len__</code> lets you use <code>len()</code>;{" "}
        <code>__iter__</code> makes your object iterable. Also called &quot;magic methods&quot;
        or &quot;special methods&quot;.
      </p>

      <h3>5. What is a dataclass?</h3>
      <p>
        A class decorated with <code>@dataclass</code> that auto-generates{" "}
        <code>__init__</code>, <code>__repr__</code>, and <code>__eq__</code> from field
        annotations. Reduces boilerplate for data-holding classes. Use{" "}
        <code>field(default_factory=list)</code> for mutable defaults.{" "}
        <code>frozen=True</code> makes instances immutable and hashable.{" "}
        <code>order=True</code> generates comparison operators.
      </p>

      <h3>6. What is the difference between inheritance and composition?</h3>
      <p>
        Inheritance (&quot;is-a&quot;): a subclass extends a parent and inherits all its
        behaviour. Good when the relationship is genuinely hierarchical. Composition
        (&quot;has-a&quot;): an object contains references to other objects and delegates
        to them. Generally preferred because it is more flexible, easier to test, and avoids
        the fragile base class problem. Rule of thumb: if you cannot say &quot;X is a Y&quot;,
        use composition.
      </p>

      <h3>7. What is <code>super()</code>?</h3>
      <p>
        Returns a proxy object that delegates method calls to a parent class in the MRO
        (Method Resolution Order). Most common use: calling <code>super().__init__(...)</code>{" "}
        in a subclass constructor to run the parent&apos;s initialization. In Python 3,{" "}
        <code>super()</code> needs no arguments (unlike Python 2 where you passed the class
        and instance explicitly).
      </p>

      <h3>8. What happens if you define <code>__eq__</code> without <code>__hash__</code>?</h3>
      <p>
        Python automatically sets <code>__hash__ = None</code>, making the class unhashable.
        You cannot use instances in sets or as dict keys. If you need both equality comparison
        and hashability, define <code>__hash__</code> explicitly, or use{" "}
        <code>@dataclass(frozen=True)</code> which handles both.
      </p>

      <h3>9. What is the MRO (Method Resolution Order)?</h3>
      <p>
        The order Python searches through a class hierarchy when looking up a method or
        attribute. Uses the C3 linearization algorithm. With multiple inheritance, Python
        checks left-to-right through the parent classes listed. Inspect with{" "}
        <code>ClassName.__mro__</code>. Important with multiple inheritance and{" "}
        <code>super()</code> — super follows the MRO, not just the direct parent.
      </p>

      <h3>10. What is name mangling in Python?</h3>
      <p>
        Attributes with a double-underscore prefix (but not double-underscore suffix) are
        name-mangled — Python rewrites <code>self.__x</code> to{" "}
        <code>self._ClassName__x</code>. This prevents accidental overriding in subclasses,
        not true encapsulation. Single-underscore <code>self._x</code> is the convention for
        &quot;internal use&quot; (no enforcement). Python has no truly private attributes.
      </p>

      <h3>11. What is a property and why use it instead of getters/setters?</h3>
      <p>
        A <code>@property</code> lets you define getter/setter logic that is invoked when
        accessing or assigning an attribute — the call site looks like plain attribute access
        (<code>obj.value</code>, <code>obj.value = x</code>). It keeps the API clean without{" "}
        <code>get_value()</code>/<code>set_value()</code> methods. Use it to add validation,
        computed values, or lazy initialization while maintaining a simple interface.
      </p>

      <h3>12. What is the difference between <code>__repr__</code> and <code>__str__</code>?</h3>
      <p>
        <code>__repr__</code> should return an unambiguous string — ideally one that looks
        like the constructor call and can recreate the object. Used in the REPL, inside
        containers, and by <code>repr()</code>. <code>__str__</code> should return a
        human-readable string. Used by <code>print()</code>, <code>str()</code>, and
        f-strings. Always define <code>__repr__</code>; define <code>__str__</code> only
        if you need a different user-facing format. If only <code>__repr__</code> is defined,
        <code>str()</code> falls back to it.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Class attribute trap</h3>
      <p>
        Predict the output and explain what happens:
      </p>
      <pre><code>{`class Config:
    settings = {}

    def set(self, key, value):
        self.settings[key] = value

a = Config()
b = Config()
a.set("debug", True)
print(b.settings)`}</code></pre>
      <p>Then fix the class so each instance gets its own settings dict.</p>

      <h3>Exercise 2 — @classmethod factory</h3>
      <p>
        Add a <code>@classmethod</code> named <code>from_csv_row</code> to a{" "}
        <code>Product</code> class that takes a CSV string like{" "}
        <code>"laptop,1299.99,true"</code> and returns a <code>Product(name, price, in_stock)</code>.
      </p>

      <h3>Exercise 3 — Property validation</h3>
      <p>
        Write a <code>Temperature</code> class with a <code>celsius</code> property that
        raises <code>ValueError</code> for values below -273.15 (absolute zero). The property
        should also expose a read-only <code>fahrenheit</code> computed property.
      </p>

      <h3>Exercise 4 — Dunder arithmetic</h3>
      <p>
        Implement a <code>Money</code> class that supports:
      </p>
      <ul>
        <li><code>Money(10, "USD") + Money(5, "USD")</code> → <code>Money(15, "USD")</code></li>
        <li><code>Money(10, "USD") * 3</code> → <code>Money(30, "USD")</code></li>
        <li><code>repr(Money(10, "USD"))</code> → <code>Money(10, 'USD')</code></li>
        <li>Raise <code>ValueError</code> when adding different currencies</li>
      </ul>

      <h3>Exercise 5 — Inheritance chain</h3>
      <p>
        Create a <code>Shape</code> base class with an abstract <code>area()</code> method
        (raise <code>NotImplementedError</code>). Implement <code>Circle</code>,{" "}
        <code>Rectangle</code>, and <code>Triangle</code> subclasses. Add a module-level
        function <code>total_area(shapes)</code> that works polymorphically.
      </p>

      <h3>Exercise 6 — Callable class</h3>
      <p>
        Implement a <code>RateLimiter</code> class that:
      </p>
      <ul>
        <li>Takes <code>max_calls</code> in its constructor</li>
        <li>Is callable via <code>__call__</code></li>
        <li>Tracks how many times it has been called</li>
        <li>Raises <code>RuntimeError("rate limit exceeded")</code> after <code>max_calls</code></li>
      </ul>

      <h3>Exercise 7 — dataclass with validation</h3>
      <p>
        Create a <code>@dataclass</code> named <code>UserProfile</code> with fields{" "}
        <code>username: str</code>, <code>age: int</code>, and{" "}
        <code>tags: list[str]</code>. Use <code>__post_init__</code> to validate that age
        is between 0 and 150 and username is non-empty.
      </p>

      <h3>Mini Project — Course and Student System</h3>
      <p>
        Build a small OOP model with the following requirements:
      </p>
      <pre><code>{`# Classes to implement:

class Student:
    # Fields: name, student_id, enrolled_courses (list)
    # Methods:
    #   enroll(course) — add course to enrolled_courses
    #   drop(course)   — remove course from enrolled_courses
    #   __repr__

class Course:
    # Fields: title, course_id, max_capacity, enrolled_students (list)
    # Class attribute: all_courses = {} (course_id -> Course)
    # Methods:
    #   @classmethod get(cls, course_id) — look up by id
    #   enroll_student(student) — add student, check capacity
    #   @property is_full
    #   @property enrollment_count
    #   __repr__

class Enrollment:
    # Composition: links Student + Course
    # Fields: student, course, grade (None by default)
    # Methods:
    #   set_grade(grade) — validates A/B/C/D/F
    #   @property passed   — True if grade not None and not "F"
    #   __repr__

# Expected usage:
cs101 = Course("Intro to CS", "CS101", max_capacity=3)
juan = Student("Juan", "S001")
ana = Student("Ana", "S002")

juan.enroll(cs101)
ana.enroll(cs101)
print(cs101.enrollment_count)   # 2
print(cs101.is_full)            # False

e = Enrollment(juan, cs101)
e.set_grade("A")
print(e.passed)   # True`}</code></pre>
    </div>
  );
}
