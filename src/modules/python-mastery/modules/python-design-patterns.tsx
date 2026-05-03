import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const patternCategoriesDiagram = String.raw`flowchart LR
    CRE["Creational<br/>Singleton, Factory, Builder<br/>object creation"] --> MID["Pattern families"]
    STR["Structural<br/>Adapter, Decorator, Facade<br/>object composition"] --> MID
    BEH["Behavioral<br/>Observer, Strategy, Command<br/>coordination and control flow"] --> MID`;

export const toc: TocItem[] = [
  { id: "why-patterns", title: "Why Design Patterns in Python?", level: 2 },
  { id: "creational", title: "Creational Patterns", level: 2 },
  { id: "structural", title: "Structural Patterns", level: 2 },
  { id: "behavioral", title: "Behavioral Patterns", level: 2 },
  { id: "pythonic-alternatives", title: "Pythonic Alternatives to Patterns", level: 2 },
  { id: "anti-patterns", title: "Anti-Patterns to Avoid", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function PythonDesignPatterns() {
  return (
    <div className="article-content">
      <p>
        Design patterns in Python are often simpler than their Java/C++ equivalents —
        Python&apos;s first-class functions, decorators, and dynamic typing replace
        several patterns entirely. This module covers the patterns that matter for
        interviews, their Pythonic implementations, and when to skip the pattern in
        favour of a simpler Python idiom.
      </p>

      <h2 id="why-patterns">Why Design Patterns in Python?</h2>

      <MermaidDiagram
        chart={patternCategoriesDiagram}
        title="Design Pattern Categories"
        caption="In Python, the pattern family still matters, but the implementation is often smaller because the language already gives you first-class functions, decorators, and flexible objects."
        minHeight={360}
      />

      <pre><code>{`# Python-specific reality:
# Many "classic" patterns from Gang of Four are built into Python already:
#
# Iterator   → for loops + __iter__/__next__ + generators
# Observer   → simple with first-class functions / callbacks
# Decorator  → the @decorator syntax IS the decorator pattern
# Strategy   → just pass a function (first-class)
# Command    → just pass a function or lambda
# Template   → use inheritance OR higher-order functions
#
# Patterns that remain genuinely useful in Python:
# Singleton, Factory, Abstract Factory, Builder,
# Adapter, Facade, Proxy, Composite,
# Observer (event system), Strategy (clean interface)`}</code></pre>

      <h2 id="creational">Creational Patterns</h2>

      <h3>Singleton</h3>
      <p>
        Ensure a class has only one instance. In Python, the simplest approach is a
        module-level variable — modules are singletons by nature.
      </p>
      <pre><code>{`# Option 1: Module-level singleton (Pythonic — preferred)
# settings.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_url: str
    debug: bool = False

settings = Settings()  # one instance, imported wherever needed
# from settings import settings

# Option 2: Class-based singleton
class Singleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

s1 = Singleton()
s2 = Singleton()
assert s1 is s2   # True

# Option 3: Thread-safe singleton
import threading

class ThreadSafeSingleton:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:   # double-checked locking
                    cls._instance = super().__new__(cls)
        return cls._instance

# Option 4: Using a decorator
def singleton(cls):
    instances = {}
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance

@singleton
class Database:
    def __init__(self): ...`}</code></pre>

      <h3>Factory</h3>
      <pre><code>{`# Factory — create objects without specifying the exact class

# Simple factory function (most Pythonic)
def create_parser(format: str):
    parsers = {
        "json": JsonParser,
        "csv":  CsvParser,
        "xml":  XmlParser,
    }
    cls = parsers.get(format)
    if cls is None:
        raise ValueError(f"unknown format: {format!r}")
    return cls()

parser = create_parser("json")

# Factory Method — let subclasses decide which class to instantiate
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str) -> None: ...

    @classmethod
    @abstractmethod
    def create(cls, **config) -> "Notification": ...

class EmailNotification(Notification):
    def __init__(self, smtp_host: str):
        self.smtp_host = smtp_host

    @classmethod
    def create(cls, **config) -> "EmailNotification":
        return cls(smtp_host=config["smtp_host"])

    def send(self, message: str) -> None:
        print(f"Email via {self.smtp_host}: {message}")

class SlackNotification(Notification):
    @classmethod
    def create(cls, **config) -> "SlackNotification":
        return cls()

    def send(self, message: str) -> None:
        print(f"Slack: {message}")`}</code></pre>

      <h3>Builder</h3>
      <pre><code>{`# Builder — construct complex objects step by step

class QueryBuilder:
    def __init__(self, table: str):
        self._table = table
        self._conditions: list[str] = []
        self._columns = "*"
        self._limit: int | None = None
        self._order: str | None = None

    def select(self, *columns: str) -> "QueryBuilder":
        self._columns = ", ".join(columns)
        return self   # return self enables chaining

    def where(self, condition: str) -> "QueryBuilder":
        self._conditions.append(condition)
        return self

    def order_by(self, column: str, desc: bool = False) -> "QueryBuilder":
        self._order = f"{column} {'DESC' if desc else 'ASC'}"
        return self

    def limit(self, n: int) -> "QueryBuilder":
        self._limit = n
        return self

    def build(self) -> str:
        sql = f"SELECT {self._columns} FROM {self._table}"
        if self._conditions:
            sql += " WHERE " + " AND ".join(self._conditions)
        if self._order:
            sql += f" ORDER BY {self._order}"
        if self._limit:
            sql += f" LIMIT {self._limit}"
        return sql

# Fluent interface via method chaining
query = (
    QueryBuilder("users")
    .select("id", "name", "email")
    .where("active = true")
    .where("age > 18")
    .order_by("created_at", desc=True)
    .limit(10)
    .build()
)
# SELECT id, name, email FROM users WHERE active = true AND age > 18
# ORDER BY created_at DESC LIMIT 10`}</code></pre>

      <h2 id="structural">Structural Patterns</h2>

      <h3>Adapter</h3>
      <pre><code>{`# Adapter — make incompatible interfaces work together

# Legacy payment processor with old interface
class LegacyPaymentAPI:
    def do_payment(self, amount_cents: int, cc_number: str) -> dict:
        return {"status": "ok", "amount": amount_cents}

# New interface your app expects
class PaymentProcessor:
    def charge(self, amount_usd: float, card_token: str) -> bool:
        raise NotImplementedError

# Adapter wraps the legacy class
class LegacyPaymentAdapter(PaymentProcessor):
    def __init__(self, legacy: LegacyPaymentAPI):
        self._legacy = legacy

    def charge(self, amount_usd: float, card_token: str) -> bool:
        amount_cents = int(amount_usd * 100)
        result = self._legacy.do_payment(amount_cents, card_token)
        return result["status"] == "ok"

# Usage — caller only sees PaymentProcessor interface
processor = LegacyPaymentAdapter(LegacyPaymentAPI())
processor.charge(29.99, "tok_abc123")`}</code></pre>

      <h3>Facade</h3>
      <pre><code>{`# Facade — simplified interface to a complex subsystem

class OrderFacade:
    """Single entry point for the entire order process."""

    def __init__(self):
        self._inventory = InventoryService()
        self._payment   = PaymentService()
        self._shipping  = ShippingService()
        self._email     = EmailService()

    def place_order(self, user_id: int, items: list, card_token: str) -> dict:
        # 1. Check inventory
        for item in items:
            if not self._inventory.is_available(item["id"], item["qty"]):
                raise OutOfStockError(item["id"])

        # 2. Charge payment
        total = sum(i["price"] * i["qty"] for i in items)
        if not self._payment.charge(total, card_token):
            raise PaymentError()

        # 3. Reserve inventory
        self._inventory.reserve(items)

        # 4. Create shipment
        tracking = self._shipping.create(user_id, items)

        # 5. Send confirmation
        self._email.send_order_confirmation(user_id, tracking)

        return {"order_id": tracking, "total": total}

# Caller uses ONE method instead of coordinating 5 services
facade = OrderFacade()
result = facade.place_order(user_id=1, items=[...], card_token="tok_x")`}</code></pre>

      <h3>Proxy</h3>
      <pre><code>{`# Proxy — control access to an object (lazy init, caching, auth, logging)

from typing import Protocol

class DataService(Protocol):
    def get_report(self, report_id: int) -> dict: ...

class RealDataService:
    def get_report(self, report_id: int) -> dict:
        # expensive DB query
        return db.fetch_report(report_id)

# Caching proxy
class CachedDataService:
    def __init__(self, real: RealDataService):
        self._real = real
        self._cache: dict[int, dict] = {}

    def get_report(self, report_id: int) -> dict:
        if report_id not in self._cache:
            self._cache[report_id] = self._real.get_report(report_id)
        return self._cache[report_id]

# Auth proxy
class AuthenticatedDataService:
    def __init__(self, real: RealDataService, required_role: str):
        self._real = real
        self._role = required_role

    def get_report(self, report_id: int, user: User) -> dict:
        if user.role != self._role:
            raise PermissionError("insufficient permissions")
        return self._real.get_report(report_id)`}</code></pre>

      <h3>Decorator (structural — not Python @decorator)</h3>
      <pre><code>{`# The structural Decorator pattern adds behaviour to an object
# Python's @decorator syntax implements this automatically

# Without Python syntax — wrapping objects
class Logger:
    def __init__(self, wrapped):
        self._wrapped = wrapped

    def get_report(self, report_id: int) -> dict:
        print(f"fetching report {report_id}")
        result = self._wrapped.get_report(report_id)
        print(f"report {report_id} fetched")
        return result

# Stack decorators (same interface, composable)
service = RealDataService()
service = CachedDataService(service)     # add caching
service = Logger(service)               # add logging

service.get_report(42)   # logs → checks cache → fetches if needed`}</code></pre>

      <h2 id="behavioral">Behavioral Patterns</h2>

      <h3>Observer</h3>
      <pre><code>{`# Observer — one object notifies many dependents on state change

from typing import Callable

class EventEmitter:
    def __init__(self):
        self._handlers: dict[str, list[Callable]] = {}

    def on(self, event: str, handler: Callable) -> None:
        self._handlers.setdefault(event, []).append(handler)

    def off(self, event: str, handler: Callable) -> None:
        self._handlers.get(event, []).remove(handler)

    def emit(self, event: str, *args, **kwargs) -> None:
        for handler in self._handlers.get(event, []):
            handler(*args, **kwargs)

# Usage
emitter = EventEmitter()

def on_user_created(user):
    send_welcome_email(user)

def on_user_created_audit(user):
    audit_log.record("user_created", user.id)

emitter.on("user.created", on_user_created)
emitter.on("user.created", on_user_created_audit)

user = create_user("Juan")
emitter.emit("user.created", user)   # fires both handlers

# Typed observer with dataclasses
from dataclasses import dataclass

@dataclass
class UserCreatedEvent:
    user_id: int
    email: str

class UserService:
    def __init__(self):
        self._listeners: list[Callable[[UserCreatedEvent], None]] = []

    def subscribe(self, listener: Callable[[UserCreatedEvent], None]) -> None:
        self._listeners.append(listener)

    def create(self, name: str, email: str) -> User:
        user = User(...)
        event = UserCreatedEvent(user.id, email)
        for listener in self._listeners:
            listener(event)
        return user`}</code></pre>

      <h3>Strategy</h3>
      <pre><code>{`# Strategy — swap algorithms at runtime

# Pythonic: just pass a function
def sort_by_price(items): return sorted(items, key=lambda x: x["price"])
def sort_by_date(items):  return sorted(items, key=lambda x: x["date"])
def sort_by_name(items):  return sorted(items, key=lambda x: x["name"])

def list_products(items, sort_strategy=sort_by_price):
    return sort_strategy(items)

# With a Protocol for type safety
from typing import Protocol

class SortStrategy(Protocol):
    def __call__(self, items: list[dict]) -> list[dict]: ...

def list_products(items: list[dict], sort: SortStrategy = sort_by_price) -> list[dict]:
    return sort(items)

# Class-based (when strategy needs state)
class PaginatedSort:
    def __init__(self, page: int, per_page: int):
        self.page = page
        self.per_page = per_page

    def __call__(self, items: list[dict]) -> list[dict]:
        sorted_items = sorted(items, key=lambda x: x["price"])
        start = self.page * self.per_page
        return sorted_items[start:start + self.per_page]

list_products(items, sort=PaginatedSort(page=0, per_page=10))`}</code></pre>

      <h3>Command</h3>
      <pre><code>{`# Command — encapsulate a request as an object (enables undo, queue, log)

from dataclasses import dataclass
from typing import Protocol

class Command(Protocol):
    def execute(self) -> None: ...
    def undo(self) -> None: ...

@dataclass
class CreateUserCommand:
    name: str
    email: str
    _created_id: int | None = None

    def execute(self) -> None:
        self._created_id = db.create_user(self.name, self.email)

    def undo(self) -> None:
        if self._created_id:
            db.delete_user(self._created_id)

class CommandHistory:
    def __init__(self):
        self._history: list[Command] = []

    def execute(self, cmd: Command) -> None:
        cmd.execute()
        self._history.append(cmd)

    def undo_last(self) -> None:
        if self._history:
            self._history.pop().undo()

history = CommandHistory()
history.execute(CreateUserCommand("Juan", "j@ex.com"))
history.undo_last()  # deletes the user`}</code></pre>

      <h3>Template Method</h3>
      <pre><code>{`# Template Method — define skeleton of an algorithm, let subclasses fill steps

from abc import ABC, abstractmethod

class DataPipeline(ABC):
    """Template: extract → transform → load"""

    def run(self) -> None:
        data = self.extract()
        transformed = self.transform(data)
        self.load(transformed)
        self.notify(len(transformed))   # hook with default

    @abstractmethod
    def extract(self) -> list: ...

    @abstractmethod
    def transform(self, data: list) -> list: ...

    @abstractmethod
    def load(self, data: list) -> None: ...

    def notify(self, count: int) -> None:   # optional hook
        print(f"pipeline completed: {count} records")

class CSVToPostgresPipeline(DataPipeline):
    def extract(self): return read_csv("data.csv")
    def transform(self, data): return [clean(row) for row in data]
    def load(self, data): db.bulk_insert(data)

class ApiToRedisPipeline(DataPipeline):
    def extract(self): return fetch_api_data()
    def transform(self, data): return [serialize(row) for row in data]
    def load(self, data): redis.mset({r["id"]: r for r in data})

CSVToPostgresPipeline().run()
ApiToRedisPipeline().run()`}</code></pre>

      <h3>Chain of Responsibility</h3>
      <pre><code>{`# Chain — pass request through handlers until one handles it
# Pythonic version: list of handlers + early return

from typing import Callable

Handler = Callable[[dict], dict | None]

def auth_middleware(request: dict) -> dict | None:
    if "token" not in request:
        return {"error": "unauthorized", "status": 401}
    return None   # pass to next

def rate_limit_middleware(request: dict) -> dict | None:
    if is_rate_limited(request["ip"]):
        return {"error": "too many requests", "status": 429}
    return None

def validate_middleware(request: dict) -> dict | None:
    if not request.get("body"):
        return {"error": "empty body", "status": 400}
    return None

def handle_request(request: dict) -> dict:
    middlewares = [auth_middleware, rate_limit_middleware, validate_middleware]
    for middleware in middlewares:
        result = middleware(request)
        if result is not None:
            return result   # short-circuit
    return process_request(request)   # all passed`}</code></pre>

      <h2 id="pythonic-alternatives">Pythonic Alternatives to Patterns</h2>

      <pre><code>{`# Many patterns exist to work around limitations of static OOP languages.
# Python has better native tools for several of them.

# Strategy → pass a function
# (no need for a Strategy interface + ConcreteStrategy classes)
sorted(items, key=lambda x: x["price"])

# Command → use a partial or lambda
from functools import partial
commands = [partial(send_email, user) for user in users]
for cmd in commands: cmd()

# Iterator → generator function
def read_chunks(path, size=1024):
    with open(path, "rb") as f:
        while chunk := f.read(size):
            yield chunk

# Decorator (structural) → Python @decorator
# Instead of wrapping objects manually, use @decorator

# Observer → just a list of callbacks
on_created: list[Callable] = []
on_created.append(send_welcome_email)
on_created.append(log_creation)
for handler in on_created: handler(user)

# Null Object → Optional + walrus or "or" default
user = db.get(id) or GuestUser()

# Prototype → copy.deepcopy()
import copy
cloned = copy.deepcopy(original)

# Flyweight → @lru_cache or class-level dict
from functools import lru_cache

@lru_cache(maxsize=None)
def get_config(key: str) -> str:
    return expensive_config_fetch(key)`}</code></pre>

      <h2 id="anti-patterns">Anti-Patterns to Avoid</h2>

      <pre><code>{`# ── God Object ────────────────────────────────────────────────────────
# One class that knows and does everything — impossible to test or extend
class App:  # bad
    def connect_db(self): ...
    def send_email(self): ...
    def process_payment(self): ...
    def render_template(self): ...

# Fix: separate responsibilities into focused classes

# ── Premature Abstraction ──────────────────────────────────────────────
# Creating base classes, interfaces, factories before you need them
class AbstractBaseUserCreatorFactory(ABC):  # bad — YAGNI
    @abstractmethod
    def create_creator(self) -> AbstractUserCreator: ...

# Fix: write the concrete class first; extract when you actually have 2+ implementations

# ── Mutable Default Argument ───────────────────────────────────────────
def add(item, lst=[]):   # classic Python gotcha
    lst.append(item)
    return lst

# Fix: use None default
def add(item, lst=None):
    if lst is None: lst = []
    lst.append(item)
    return lst

# ── Singleton Overuse ─────────────────────────────────────────────────
# Making everything a singleton makes testing impossible
# Fix: use dependency injection instead — pass dependencies, don't fetch them

# ── Anemic Domain Model ───────────────────────────────────────────────
# Data classes with no behaviour — all logic in service layer
@dataclass
class Order:
    items: list
    status: str

class OrderService:
    def calculate_total(self, order): ...   # logic lives in service
    def can_cancel(self, order): ...        # logic that belongs in Order

# Better: put behaviour on the model
@dataclass
class Order:
    items: list
    status: str

    @property
    def total(self) -> float:
        return sum(i.price * i.qty for i in self.items)

    def can_cancel(self) -> bool:
        return self.status not in ("shipped", "delivered")`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is the Singleton pattern and when is it appropriate?</h3>
      <p>
        Ensures a class has only one instance. Appropriate for: configuration, logging,
        connection pools, caches. In Python, the simplest singleton is a module-level
        variable — modules are singletons by nature. Overuse of Singleton is an
        anti-pattern because it hides dependencies and makes testing hard. Prefer
        dependency injection.
      </p>

      <h3>2. How does the Strategy pattern differ from just passing a function?</h3>
      <p>
        In Python they are the same thing. A function IS a strategy. The Strategy pattern
        from Java/C++ exists to simulate first-class functions in languages that lack them.
        In Python, pass a callable directly. Use a <code>Protocol</code> annotation if
        you want type-checked strategy signatures.
      </p>

      <h3>3. What is the difference between Adapter and Facade?</h3>
      <p>
        Adapter makes one interface match another — it adapts an incompatible class to
        a different interface without changing either. Facade provides a simplified
        interface to a complex subsystem — it hides complexity behind a single class.
        Adapter = translation. Facade = simplification.
      </p>

      <h3>4. What is the Observer pattern?</h3>
      <p>
        An object (subject/emitter) maintains a list of dependents (observers/listeners)
        and notifies them on state changes. In Python this is commonly implemented as a
        list of callbacks. Useful for event systems, domain events, and decoupling
        side-effects (email sending, logging) from core logic.
      </p>

      <h3>5. What is the Builder pattern and when do you use it?</h3>
      <p>
        Constructs a complex object step by step using method chaining. Use when an object
        has many optional parameters or a complex construction sequence. Avoids
        telescoping constructors. Common in query builders, HTTP client builders,
        and test data factories.
      </p>

      <h3>6. What is the Factory pattern?</h3>
      <p>
        Creates objects without specifying the exact class. Centralises creation logic
        and decouples callers from concrete types. In Python, a factory is usually just a
        function that returns different types based on input. Use a <code>@classmethod</code>{" "}
        for alternative constructors on the same class.
      </p>

      <h3>7. What is the Proxy pattern?</h3>
      <p>
        A proxy object has the same interface as the real object but adds behaviour —
        caching, logging, access control, lazy initialisation. The caller cannot
        distinguish the proxy from the real object. In Python, a proxy can be an explicit
        wrapper class or implemented via <code>__getattr__</code> delegation.
      </p>

      <h3>8. What is an anti-pattern? Give two Python-specific examples.</h3>
      <p>
        An anti-pattern is a commonly used solution that seems helpful but causes more
        problems than it solves. Python-specific examples: (1) mutable default arguments
        (<code>def fn(items=[])</code>) — the list is shared across calls; (2) God Object
        — one class handling everything, impossible to test; (3) overusing Singleton
        instead of dependency injection, making tests hard.
      </p>
    </div>
  );
}
