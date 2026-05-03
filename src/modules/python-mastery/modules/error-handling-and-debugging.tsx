import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "exception-basics", title: "Exception Basics", level: 2 },
  { id: "try-except", title: "try / except", level: 2 },
  { id: "specific-exceptions", title: "Catching Specific Exceptions", level: 2 },
  { id: "else-finally", title: "else and finally", level: 2 },
  { id: "raise", title: "raise", level: 2 },
  { id: "exception-chaining", title: "Exception Chaining", level: 2 },
  { id: "custom-exceptions", title: "Custom Exceptions", level: 2 },
  { id: "bare-except", title: "Why Bare except Is Dangerous", level: 2 },
  { id: "exception-hierarchy", title: "Exception Hierarchy", level: 2 },
  { id: "context-managers-cleanup", title: "Cleanup with Context Managers", level: 2 },
  { id: "breakpoint", title: "Debugging with breakpoint()", level: 2 },
  { id: "logging", title: "Logging Basics", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function ErrorHandlingAndDebugging() {
  return (
    <div className="article-content">
      <p>
        Robust Python code handles failures explicitly. Python uses exceptions for all error
        conditions — there is no <code>null</code> propagation or result-type pattern by
        default. This module covers the full exception system, when to raise vs catch, how to
        design custom exception hierarchies, and the debugging tools you will reach for daily.
      </p>

      <h2 id="exception-basics">Exception Basics</h2>

      <p>
        Python distinguishes two categories of problems:
      </p>

      <ul>
        <li>
          <strong>Syntax errors</strong> — detected before execution. The interpreter cannot
          parse the code. You cannot catch these at runtime.
        </li>
        <li>
          <strong>Exceptions</strong> — occur during execution. Can be caught and handled.
        </li>
      </ul>

      <pre><code>{`# Syntax error — caught at parse time, not runtime
if True     # SyntaxError: expected ':'

# Runtime exceptions
1 / 0                      # ZeroDivisionError
int("abc")                 # ValueError
[][5]                      # IndexError
{}["missing"]              # KeyError
None.upper()               # AttributeError
open("no_file.txt")        # FileNotFoundError
import nonexistent         # ModuleNotFoundError`}</code></pre>

      <h2 id="try-except">try / except</h2>

      <pre><code>{`try:
    result = 10 / 0
except ZeroDivisionError:
    result = 0
    print("division by zero — defaulting to 0")

print(result)   # 0`}</code></pre>

      <p>
        If an exception is raised inside <code>try</code>, Python immediately jumps to the
        matching <code>except</code> block. Code after the failing line in <code>try</code>{" "}
        is skipped.
      </p>

      <pre><code>{`def parse_age(text):
    try:
        age = int(text)
        print(f"parsed age: {age}")    # skipped if int() raises
        return age
    except ValueError:
        print(f"invalid age: {text!r}")
        return None

parse_age("30")    # parsed age: 30
parse_age("abc")   # invalid age: 'abc'`}</code></pre>

      <h2 id="specific-exceptions">Catching Specific Exceptions</h2>

      <pre><code>{`# Multiple except clauses
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None
    except TypeError as e:
        print(f"type error: {e}")
        return None

# Catch multiple in one clause
try:
    value = int(user_input)
except (ValueError, TypeError) as e:
    print(f"cannot parse: {e}")

# Access the exception object with "as"
try:
    open("missing.txt")
except FileNotFoundError as e:
    print(e)              # [Errno 2] No such file or directory: 'missing.txt'
    print(e.errno)        # 2
    print(e.filename)     # 'missing.txt'
    print(type(e))        # <class 'FileNotFoundError'>

# Re-raise the same exception after logging
try:
    risky_operation()
except ValueError as e:
    log_error(e)
    raise   # re-raises the original exception, preserving traceback`}</code></pre>

      <h2 id="else-finally">else and finally</h2>

      <h3>else — runs only if no exception was raised</h3>
      <pre><code>{`def read_config(path):
    try:
        f = open(path)
    except FileNotFoundError:
        print("config not found, using defaults")
        return {}
    else:
        # only runs if open() succeeded — no exception
        data = f.read()
        f.close()
        return parse(data)

# Why use else instead of putting code in try?
# Code in else is NOT protected by the except clause.
# This prevents accidentally catching exceptions from code
# that isn't the operation you're guarding.`}</code></pre>

      <h3>finally — always runs, even on exception or return</h3>
      <pre><code>{`def connect_db():
    conn = None
    try:
        conn = open_connection()
        result = conn.query("SELECT 1")
        return result
    except DatabaseError as e:
        print(f"query failed: {e}")
        return None
    finally:
        if conn:
            conn.close()   # always runs — even if return fired above

# finally runs even if the exception is not caught
try:
    raise ValueError("boom")
finally:
    print("cleanup")   # prints "cleanup" before the ValueError propagates`}</code></pre>

      <h3>Full structure</h3>
      <pre><code>{`try:
    # risky code
    result = do_thing()
except SomeError as e:
    # handle error
    handle(e)
except (OtherError, AnotherError):
    # handle multiple
    ...
else:
    # runs only if no exception
    process(result)
finally:
    # always runs
    cleanup()`}</code></pre>

      <h2 id="raise">raise</h2>

      <pre><code>{`# Raise a new exception
def get_user(user_id):
    if user_id <= 0:
        raise ValueError(f"user_id must be positive, got {user_id}")
    return fetch_from_db(user_id)

# Raise an existing exception class (no message)
raise RuntimeError

# Raise an instance
raise RuntimeError("something went wrong")

# Re-raise current exception inside except
try:
    risky()
except ValueError:
    log("value error occurred")
    raise   # preserves original traceback

# Raise after handling — new exception
try:
    int("abc")
except ValueError as e:
    raise RuntimeError("configuration parse failed") from e`}</code></pre>

      <h2 id="exception-chaining">Exception Chaining</h2>

      <p>
        When one exception causes another, chain them explicitly with <code>from</code>. This
        preserves both tracebacks for debugging.
      </p>

      <pre><code>{`# Implicit chaining — happens automatically inside except blocks
try:
    int("bad")
except ValueError:
    raise RuntimeError("parse failed")
# RuntimeError: parse failed
# During handling of the above exception, another exception occurred:

# Explicit chaining — "raise X from Y"
try:
    load_config()
except FileNotFoundError as e:
    raise ConfigError("could not load config") from e
# ConfigError: could not load config
# The above exception was the direct cause of the following exception:

# Suppress chaining — "raise X from None"
try:
    internal_operation()
except InternalError:
    raise PublicError("operation failed") from None
# No mention of InternalError in traceback`}</code></pre>

      <h2 id="custom-exceptions">Custom Exceptions</h2>

      <p>
        Defining custom exceptions lets callers catch your errors specifically and provides
        semantic meaning beyond generic <code>ValueError</code> or <code>RuntimeError</code>.
      </p>

      <pre><code>{`# Base pattern — inherit from Exception
class AppError(Exception):
    """Base class for all application exceptions."""

class ValidationError(AppError):
    """Input validation failed."""

class NotFoundError(AppError):
    """Requested resource does not exist."""

class AuthError(AppError):
    """Authentication or authorization failure."""
    def __init__(self, message, user_id=None):
        super().__init__(message)
        self.user_id = user_id

# Usage
def get_user(user_id):
    if not isinstance(user_id, int):
        raise ValidationError(f"user_id must be int, got {type(user_id).__name__}")
    user = db.find(user_id)
    if user is None:
        raise NotFoundError(f"no user with id={user_id}")
    return user

# Callers can catch at any level in the hierarchy
try:
    user = get_user("bad_id")
except ValidationError as e:
    respond_400(str(e))
except NotFoundError as e:
    respond_404(str(e))
except AppError as e:
    respond_500(str(e))   # catch-all for app errors

# With extra context
class RateLimitError(AppError):
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window = window_seconds
        super().__init__(
            f"rate limit of {limit} requests per {window_seconds}s exceeded"
        )

try:
    check_rate_limit(user)
except RateLimitError as e:
    print(e.limit, e.window)   # access structured data`}</code></pre>

      <h2 id="bare-except">Why Bare except Is Dangerous</h2>

      <pre><code>{`# NEVER do this
try:
    do_something()
except:         # catches EVERYTHING — including SystemExit, KeyboardInterrupt
    pass        # silently swallows the error

# Why it's dangerous:
# 1. Catches SystemExit — prevents sys.exit() from working
# 2. Catches KeyboardInterrupt — user cannot Ctrl+C to stop the program
# 3. Catches MemoryError, RecursionError — masks catastrophic failures
# 4. Swallows exceptions silently — bugs disappear, never fixed

# Also avoid except Exception: pass — same problem without the fix
try:
    do_something()
except Exception:
    pass   # still swallows bugs silently

# Correct patterns:
# 1. Catch specific exceptions
try:
    value = int(user_input)
except ValueError:
    value = 0

# 2. Catch, log, re-raise
try:
    risky()
except Exception as e:
    logger.error("unexpected error: %s", e, exc_info=True)
    raise

# 3. Catch broad, but never pass
try:
    process()
except Exception as e:
    handle_gracefully(e)
    # do NOT just pass`}</code></pre>

      <h2 id="exception-hierarchy">Exception Hierarchy</h2>

      <pre><code>{`BaseException
├── SystemExit          # sys.exit() — do not catch unless you're a framework
├── KeyboardInterrupt   # Ctrl+C — do not catch without re-raising
├── GeneratorExit       # generator.close() called
└── Exception           # ← catch from here down for application code
    ├── StopIteration   # iterator exhausted
    ├── ArithmeticError
    │   ├── ZeroDivisionError
    │   └── OverflowError
    ├── AttributeError  # obj.nonexistent
    ├── ImportError
    │   └── ModuleNotFoundError
    ├── LookupError
    │   ├── IndexError  # list[99] out of range
    │   └── KeyError    # dict["missing"]
    ├── NameError
    │   └── UnboundLocalError
    ├── OSError
    │   ├── FileNotFoundError
    │   ├── PermissionError
    │   └── TimeoutError
    ├── TypeError       # wrong type for operation
    ├── ValueError      # right type, wrong value
    ├── RuntimeError
    │   └── RecursionError
    └── ...`}</code></pre>

      <h2 id="context-managers-cleanup">Cleanup with Context Managers</h2>

      <p>
        The <code>with</code> statement guarantees cleanup even if an exception occurs —
        more reliable than <code>finally</code> for resource management.
      </p>

      <pre><code>{`# File handling — automatically closes even on exception
with open("data.txt") as f:
    content = f.read()
# f is closed here regardless of what happened

# Multiple context managers
with open("input.txt") as fin, open("output.txt", "w") as fout:
    fout.write(fin.read())

# Context managers are covered in depth in the Advanced Python module.
# The short version: any object implementing __enter__ and __exit__
# can be used with "with".`}</code></pre>

      <h2 id="breakpoint">Debugging with breakpoint()</h2>

      <p>
        <code>breakpoint()</code> drops you into the Python debugger (pdb) at that line.
        Available since Python 3.7.
      </p>

      <pre><code>{`def process(items):
    result = []
    for item in items:
        breakpoint()   # execution pauses here, pdb opens
        transformed = transform(item)
        result.append(transformed)
    return result`}</code></pre>

      <h3>pdb commands</h3>
      <pre><code>{`# Inside pdb:
n          # next — execute current line, stay in current function
s          # step — step into function calls
c          # continue — run until next breakpoint or end
q          # quit — exit debugger and program
p expr     # print — evaluate and print expression
pp expr    # pretty-print
l          # list — show surrounding source code
l .        # list current position
w          # where — show call stack
u / d      # up / down — move in call stack
b line     # set breakpoint at line number
cl         # clear all breakpoints
h          # help`}</code></pre>

      <h3>Conditional breakpoints</h3>
      <pre><code>{`for i, item in enumerate(large_list):
    if i == 500:
        breakpoint()   # only pause at item 500

# Disable breakpoints in production via environment variable
# PYTHONBREAKPOINT=0 python myapp.py   — disables all breakpoint() calls`}</code></pre>

      <h3>Other debug techniques</h3>
      <pre><code>{`# Print debugging (quick but messy)
print(f"DEBUG: {variable=}")   # Python 3.8+ — prints "variable=value"

# Assert for invariants
assert len(users) > 0, "users list is empty"

# traceback module for manual traceback printing
import traceback
try:
    risky()
except Exception:
    traceback.print_exc()    # prints full traceback to stderr`}</code></pre>

      <h2 id="logging">Logging Basics</h2>

      <p>
        Use <code>logging</code> instead of <code>print</code> in production code. Logging
        has levels, destinations, formatting, and can be configured without code changes.
      </p>

      <pre><code>{`import logging

# Basic config (do this once at app startup)
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)   # best practice: use module name

# Log levels — increasing severity
logger.debug("cache miss for key: %s", key)         # DEBUG
logger.info("user %s logged in", user.id)           # INFO
logger.warning("disk usage above 80%%")             # WARNING
logger.error("payment failed: %s", error)           # ERROR
logger.critical("database connection lost!")        # CRITICAL

# Log exceptions with traceback
try:
    process_order(order)
except Exception as e:
    logger.error("order processing failed", exc_info=True)
    # exc_info=True attaches the full traceback to the log entry

# Level hierarchy: DEBUG < INFO < WARNING < ERROR < CRITICAL
# Setting level=WARNING means DEBUG and INFO are suppressed`}</code></pre>

      <h3>Logger vs root logger</h3>
      <pre><code>{`# Root logger (avoid in libraries)
logging.warning("something happened")  # uses root logger

# Module logger (correct pattern)
logger = logging.getLogger(__name__)
logger.warning("something happened")

# __name__ evaluates to the module's dotted path:
# "myapp.services.user" in myapp/services/user.py
# This lets you configure log levels per module`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is the difference between a syntax error and an exception?</h3>
      <p>
        A syntax error is detected by the Python parser before any code runs — the file
        cannot even be imported. An exception is raised at runtime during execution and can
        be caught and handled with <code>try/except</code>.
      </p>

      <h3>2. Why should you avoid bare <code>except:</code>?</h3>
      <p>
        It catches everything — including <code>SystemExit</code> (prevents{" "}
        <code>sys.exit()</code>), <code>KeyboardInterrupt</code> (prevents Ctrl+C), and
        <code>MemoryError</code>. It also silently swallows bugs when combined with{" "}
        <code>pass</code>, making failures invisible. Always catch specific exceptions or at
        least <code>except Exception</code> with a log and re-raise.
      </p>

      <h3>3. What does <code>finally</code> do?</h3>
      <p>
        The <code>finally</code> block always executes — whether the <code>try</code> block
        succeeded, raised a caught exception, raised an uncaught exception, or even hit a{" "}
        <code>return</code>. Used for guaranteed cleanup: closing files, releasing locks,
        disconnecting from services. In practice, context managers (<code>with</code>) are
        preferred for resource cleanup.
      </p>

      <h3>4. What is the purpose of the <code>else</code> clause in a try block?</h3>
      <p>
        Runs only if the <code>try</code> block completed without raising any exception. Useful
        for code that should only run on success, while keeping it outside the{" "}
        <code>try</code> so its exceptions are not accidentally caught by the{" "}
        <code>except</code> clause.
      </p>

      <h3>5. How do you create a custom exception?</h3>
      <p>
        Inherit from <code>Exception</code> (or a subclass). Define a base exception class
        for your application (<code>AppError(Exception)</code>) and specific exceptions
        below it. Add custom attributes in <code>__init__</code> by calling{" "}
        <code>super().__init__(message)</code> and storing extra data on <code>self</code>.
        This lets callers catch at the right granularity.
      </p>

      <h3>6. When should you raise an exception vs return a sentinel value?</h3>
      <p>
        Raise when the situation is genuinely exceptional — the function cannot fulfill its
        contract. Return <code>None</code> or a sentinel when absence of a value is a normal,
        expected outcome (e.g. <code>dict.get()</code> returns <code>None</code> for a
        missing key). Python prefers exceptions for errors; the standard library uses them
        consistently (e.g. <code>dict["missing"]</code> raises <code>KeyError</code>, not
        returns <code>None</code>).
      </p>

      <h3>7. What is exception chaining (<code>raise X from Y</code>)?</h3>
      <p>
        Links two exceptions so both tracebacks appear. <code>raise NewError() from original</code>{" "}
        sets the <code>__cause__</code> attribute and explicitly marks the causal chain.{" "}
        <code>raise NewError() from None</code> suppresses the original exception (useful
        when you want to hide internal implementation details from callers). Implicit chaining
        happens automatically when you raise inside an <code>except</code> block.
      </p>

      <h3>8. What is <code>breakpoint()</code> and how do you disable it in production?</h3>
      <p>
        <code>breakpoint()</code> pauses execution and opens <code>pdb</code> (the Python
        debugger) at that line, giving you an interactive shell to inspect state. Set the
        environment variable <code>PYTHONBREAKPOINT=0</code> to disable all{" "}
        <code>breakpoint()</code> calls without changing code — useful for CI and production
        environments.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Safe parser</h3>
      <p>
        Write <code>parse_int(value: str) -&gt; int | None</code> that returns the integer if
        valid, or <code>None</code> on failure — without raising. Then write a version that
        accepts a default: <code>parse_int(value, default=0)</code>.
      </p>

      <h3>Exercise 2 — finally guarantee</h3>
      <p>
        Predict the output of this code and explain why:
      </p>
      <pre><code>{`def f():
    try:
        print("try")
        return 1
    finally:
        print("finally")
        return 2

print(f())`}</code></pre>

      <h3>Exercise 3 — Exception hierarchy design</h3>
      <p>
        Design a custom exception hierarchy for a payment service. Requirements:
      </p>
      <ul>
        <li>A base <code>PaymentError</code></li>
        <li><code>InsufficientFundsError(PaymentError)</code> with <code>required</code> and <code>available</code> attributes</li>
        <li><code>CardDeclinedError(PaymentError)</code> with a <code>decline_code</code> attribute</li>
        <li><code>NetworkError(PaymentError)</code></li>
      </ul>
      <p>
        Write a <code>charge(amount, card)</code> function that raises the appropriate error.
        Show a caller that handles each case differently.
      </p>

      <h3>Exercise 4 — Retry decorator</h3>
      <p>
        Write a <code>retry(times=3, exceptions=(Exception,))</code> decorator that retries
        a function up to <code>times</code> attempts when it raises one of the listed
        exception types. If all attempts fail, re-raise the last exception.
      </p>
      <pre><code>{`@retry(times=3, exceptions=(TimeoutError, ConnectionError))
def fetch_data(url):
    ...`}</code></pre>

      <h3>Exercise 5 — Logging setup</h3>
      <p>
        Refactor this function to use <code>logging</code> instead of <code>print</code>:
      </p>
      <pre><code>{`def process_file(path):
    print(f"processing {path}")
    try:
        with open(path) as f:
            data = f.read()
        result = parse(data)
        print(f"done: {len(result)} records")
        return result
    except FileNotFoundError:
        print(f"ERROR: file not found: {path}")
        return []
    except Exception as e:
        print(f"ERROR: unexpected: {e}")
        raise`}</code></pre>

      <h3>Mini Challenge — Custom Exception with Context</h3>
      <p>
        Build a <code>ConfigLoader</code> class that loads a JSON config file. It should:
      </p>
      <ul>
        <li>Define <code>ConfigError(Exception)</code> as the base</li>
        <li>Define <code>ConfigFileNotFoundError(ConfigError)</code> raised with the missing path</li>
        <li>Define <code>ConfigParseError(ConfigError)</code> raised with the path and the line number of the parse failure (chained from the original <code>json.JSONDecodeError</code>)</li>
        <li>Define <code>MissingKeyError(ConfigError)</code> with the missing key name, raised by a <code>require(key)</code> method</li>
      </ul>
      <pre><code>{`loader = ConfigLoader("settings.json")
db_host = loader.require("database.host")  # raises MissingKeyError if absent`}</code></pre>
    </div>
  );
}
