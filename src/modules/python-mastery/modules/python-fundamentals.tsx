import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-python", title: "What Is Python?", level: 2 },
  { id: "running-python", title: "Running Python", level: 2 },
  { id: "indentation", title: "Indentation as Syntax", level: 2 },
  { id: "variables-and-typing", title: "Variables and Dynamic Typing", level: 2 },
  { id: "naming-conventions", title: "Naming Conventions", level: 2 },
  { id: "comments", title: "Comments", level: 2 },
  { id: "print-and-input", title: "print() and input()", level: 2 },
  { id: "main-guard", title: "if __name__ == \"__main__\"", level: 2 },
  { id: "js-ts-comparison", title: "Python vs JavaScript/TypeScript", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function PythonFundamentals() {
  return (
    <div className="article-content">
      <p>
        Python is the language you reach for when you want to stop fighting the language and
        start solving problems. If you come from JavaScript or TypeScript, Python will feel
        familiar in some ways and surprising in others. This module builds the mental model you
        need to read and write Python with confidence from day one.
      </p>

      <h2 id="what-is-python">What Is Python?</h2>

      <p>
        Python is a high-level, dynamically typed, interpreted language. It was created by Guido
        van Rossum and first released in 1991. Today it dominates data science, machine learning,
        backend development, scripting, and automation — and it is one of the most common
        languages tested in technical interviews.
      </p>

      <p>Key properties you should know for interviews:</p>

      <ul>
        <li>
          <strong>Interpreted</strong> — Python source code is executed by the CPython interpreter
          line by line. There is no separate compilation step you invoke manually (though bytecode{" "}
          <code>.pyc</code> files are generated transparently).
        </li>
        <li>
          <strong>Dynamically typed</strong> — types are checked at runtime, not at compile time.
          A variable can hold any type and can be reassigned to a different type.
        </li>
        <li>
          <strong>Garbage collected</strong> — memory is managed automatically via reference
          counting and a cyclic garbage collector.
        </li>
        <li>
          <strong>Multi-paradigm</strong> — supports procedural, object-oriented, and functional
          styles.
        </li>
        <li>
          <strong>Batteries included</strong> — the standard library is enormous. You can do
          networking, file I/O, JSON parsing, regular expressions, and much more without any
          third-party packages.
        </li>
      </ul>

      <h2 id="running-python">Running Python</h2>

      <p>Three ways you will use Python day to day:</p>

      <h3>1. Run a file directly</h3>
      <pre><code>{`# hello.py
print("Hello, world!")

# terminal
$ python hello.py
Hello, world!`}</code></pre>

      <h3>2. Interactive REPL</h3>
      <p>
        Type <code>python</code> (or <code>python3</code>) in your terminal to enter the REPL
        (Read-Eval-Print Loop). Great for quick experiments.
      </p>
      <pre><code>{`$ python
>>> 2 + 2
4
>>> name = "Juan"
>>> f"Hello, {name}"
'Hello, Juan'
>>> exit()`}</code></pre>

      <h3>3. Module execution with -m</h3>
      <pre><code>{`$ python -m pytest          # run pytest as a module
$ python -m http.server     # start a local HTTP server
$ python -m json.tool file.json  # pretty-print JSON`}</code></pre>

      <p>
        The <code>-m</code> flag runs a module as a script. You will see this constantly in
        Python tooling.
      </p>

      <h2 id="indentation">Indentation as Syntax</h2>

      <p>
        This is the most immediately jarring thing for JS/TS developers. Python uses indentation
        to delimit blocks. There are no curly braces.
      </p>

      <pre><code>{`# Python
def greet(name):
    if name:
        print(f"Hello, {name}")
    else:
        print("Hello, stranger")`}</code></pre>

      <pre><code>{`// JavaScript equivalent
function greet(name) {
  if (name) {
    console.log(\`Hello, \${name}\`);
  } else {
    console.log("Hello, stranger");
  }
}`}</code></pre>

      <p>Rules to memorize:</p>
      <ul>
        <li>Standard indentation is <strong>4 spaces</strong> (PEP 8). Never mix tabs and spaces.</li>
        <li>Every block that follows a colon (<code>:</code>) must be indented.</li>
        <li>An <code>IndentationError</code> means your whitespace is wrong.</li>
        <li>Consistent indentation within a block is all that matters — but 4 spaces is universal.</li>
      </ul>

      <pre><code>{`# IndentationError example
def bad():
    x = 1
      y = 2  # IndentationError: unexpected indent`}</code></pre>

      <h2 id="variables-and-typing">Variables and Dynamic Typing</h2>

      <p>
        Python variables are just names bound to objects. Assignment creates a binding, not a
        typed container.
      </p>

      <pre><code>{`x = 10          # int
x = "hello"     # now a str — Python allows this
x = [1, 2, 3]  # now a list

# No var, let, const — just assignment
name = "Juan"
age = 30
is_active = True
nothing = None`}</code></pre>

      <p>
        Types exist on the <em>objects</em>, not the variables. You can always check the type
        at runtime:
      </p>

      <pre><code>{`x = 42
print(type(x))       # <class 'int'>
print(isinstance(x, int))  # True

x = "hello"
print(type(x))       # <class 'str'>`}</code></pre>

      <h3>Python vs JavaScript for variable declarations</h3>
      <pre><code>{`// JavaScript
const name = "Juan";   // immutable binding
let age = 30;          // mutable binding
var x = 1;             // function-scoped (avoid)

# Python
name = "Juan"   # no keyword needed
age = 30        # all assignments are mutable bindings`}</code></pre>

      <p>
        Python has no <code>const</code>. Convention uses ALL_CAPS for constants, but nothing
        enforces it at runtime.
      </p>

      <pre><code>{`MAX_RETRY_COUNT = 3   # "constant" by convention only
PI = 3.14159`}</code></pre>

      <h2 id="naming-conventions">Naming Conventions</h2>

      <p>Python follows PEP 8 naming conventions. These are universally respected:</p>

      <pre><code>{`# Variables and functions: snake_case
user_name = "Juan"
def get_user_name(): ...

# Constants: UPPER_SNAKE_CASE
MAX_CONNECTIONS = 100

# Classes: PascalCase
class UserProfile: ...

# Private (convention only, not enforced): leading underscore
_internal_value = 42

# "Very private" (name mangling in classes): double underscore
__secret = 99

# Dunder methods: double underscore both sides
def __init__(self): ...`}</code></pre>

      <p>
        Coming from JS/TS, the main shift is <code>camelCase</code> → <code>snake_case</code>{" "}
        for everything that is not a class name.
      </p>

      <h2 id="comments">Comments</h2>

      <pre><code>{`# Single-line comment — the only comment syntax in Python

x = 42  # inline comment

# Python has no block comment syntax.
# Use consecutive single-line comments instead.

"""
This is a docstring, not a comment.
It IS stored on the object and accessible at runtime via __doc__.
Used for function/class/module documentation.
"""

def add(a, b):
    """Return the sum of a and b."""
    return a + b

print(add.__doc__)  # "Return the sum of a and b."`}</code></pre>

      <h2 id="print-and-input">print() and input()</h2>

      <h3>print()</h3>
      <pre><code>{`print("Hello")              # Hello
print("Hello", "World")     # Hello World (space-separated by default)
print("Hello", end="")      # no newline
print("a", "b", sep=", ")   # a, b

name = "Juan"
age = 30

# f-string (recommended, Python 3.6+)
print(f"Name: {name}, Age: {age}")

# .format()
print("Name: {}, Age: {}".format(name, age))

# % formatting (old, avoid)
print("Name: %s, Age: %d" % (name, age))`}</code></pre>

      <h3>input()</h3>
      <pre><code>{`name = input("Enter your name: ")  # returns a string always
age = int(input("Enter your age: "))  # must cast manually

# input() always returns str — common interview gotcha
x = input("Enter a number: ")
print(x + 1)  # TypeError: can only concatenate str (not "int") to str
print(int(x) + 1)  # correct`}</code></pre>

      <h2 id="main-guard">if __name__ == "__main__"</h2>

      <p>
        This is one of the most commonly asked Python interview questions, and it confuses many
        developers at first. Here is the full picture.
      </p>

      <p>
        Every Python file has a built-in attribute called <code>__name__</code>. Its value
        depends on <em>how the file is being run</em>:
      </p>

      <ul>
        <li>
          If the file is run <strong>directly</strong> (<code>python myfile.py</code>), Python
          sets <code>__name__ = "__main__"</code>.
        </li>
        <li>
          If the file is <strong>imported</strong> by another module, Python sets{" "}
          <code>__name__</code> to the module&apos;s name (e.g. <code>"myfile"</code>).
        </li>
      </ul>

      <pre><code>{`# utils.py
def add(a, b):
    return a + b

def main():
    print(add(2, 3))

if __name__ == "__main__":
    main()`}</code></pre>

      <p>What this means in practice:</p>

      <pre><code>{`# Run directly:
$ python utils.py
5               # main() runs because __name__ == "__main__"

# Imported by another file:
import utils
# main() does NOT run — __name__ is "utils", not "__main__"
print(utils.add(10, 20))  # 30`}</code></pre>

      <p>
        <strong>Why this matters:</strong> without the guard, any top-level code in a module
        (test runs, side effects, print statements) executes every time the module is imported.
        The guard lets you write modules that are both importable libraries <em>and</em>{" "}
        runnable scripts.
      </p>

      <pre><code>{`# Without the guard — bad pattern
def compute():
    return 42

print(compute())  # runs on import too — unexpected side effect

# With the guard — correct pattern
def compute():
    return 42

if __name__ == "__main__":
    print(compute())  # only runs when executed directly`}</code></pre>

      <h2 id="js-ts-comparison">Python vs JavaScript/TypeScript</h2>

      <pre><code>{`// JavaScript/TypeScript          # Python

// Variable declaration
const x = 10;                    x = 10
let y = 20;                      y = 20

// String interpolation
\`Hello, \${name}\`                 f"Hello, {name}"

// Null/undefined
null / undefined                  None

// Boolean literals
true / false                      True / False

// Strict equality
===                               ==  (Python has no ===)

// Type check
typeof x === "string"            isinstance(x, str)

// Console output
console.log("hello")             print("hello")

// Comments
// single line                   # single line
/* multi line */                  # consecutive # lines

// Block delimiters
{ }                               indentation + :

// Ternary
x > 0 ? "pos" : "neg"           "pos" if x > 0 else "neg"

// No operation
;                                 pass  (explicit no-op keyword)`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is Python and what makes it different from JavaScript?</h3>
      <p>
        Python is an interpreted, dynamically typed, multi-paradigm language. Key differences
        from JavaScript: Python uses indentation for blocks (not braces), has a massive standard
        library, uses <code>None</code> instead of <code>null</code>/<code>undefined</code>,
        and <code>True</code>/<code>False</code> are capitalized. Python is synchronous by default
        (async is opt-in), while JavaScript is event-loop based.
      </p>

      <h3>2. Is Python compiled or interpreted?</h3>
      <p>
        Both, technically. Python source (<code>.py</code>) is compiled to bytecode (<code>.pyc</code>)
        by CPython, then the bytecode is interpreted by the Python virtual machine. In practice,
        Python is called &quot;interpreted&quot; because the compilation step is transparent and
        automatic — you never invoke a compiler manually.
      </p>

      <h3>3. What does &quot;dynamically typed&quot; mean?</h3>
      <p>
        Types are checked at runtime, not at compile time. A variable is just a name — the type
        lives on the object it points to. You can rebind a name to a different type at any time.
        This is in contrast to statically typed languages (Java, C, TypeScript in strict mode)
        where types are checked before the program runs.
      </p>

      <h3>4. What is the purpose of <code>if __name__ == "__main__"</code>?</h3>
      <p>
        It guards top-level code from running when the module is imported. When a file is run
        directly, <code>__name__</code> is <code>"__main__"</code>. When imported, it is the
        module&apos;s name. The guard lets a file act as both a reusable module and a runnable
        script.
      </p>

      <h3>5. What does indentation mean in Python?</h3>
      <p>
        Indentation is syntax in Python — it defines code blocks. Every statement in the same
        block must be indented to the same level. An <code>IndentationError</code> means the
        whitespace structure is incorrect. PEP 8 mandates 4 spaces per level.
      </p>

      <h3>6. What is <code>None</code> in Python?</h3>
      <p>
        <code>None</code> is Python&apos;s null value — a singleton of type <code>NoneType</code>.
        It represents the absence of a value. Functions that do not explicitly return something
        return <code>None</code>. Always use <code>is None</code> / <code>is not None</code>
        for comparisons, not <code>== None</code>.
      </p>

      <pre><code>{`def no_return():
    x = 1

result = no_return()
print(result)          # None
print(result is None)  # True`}</code></pre>

      <h3>7. What is the difference between <code>=</code> and <code>==</code> in Python?</h3>
      <p>
        <code>=</code> is assignment — it binds a name to an object.{" "}
        <code>==</code> is equality comparison — it tests whether two objects have the same
        value. Python has no <code>===</code> (strict equality); use <code>is</code> for
        identity comparison (same object in memory).
      </p>

      <h3>8. What is the REPL?</h3>
      <p>
        Read-Eval-Print Loop. An interactive Python session where each expression is evaluated
        immediately and the result printed. Run with <code>python</code> in the terminal. Useful
        for quick experiments, exploring APIs, and debugging. <code>ipython</code> is a popular
        enhanced REPL.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Hello World</h3>
      <p>
        Write a Python script that prints <code>Hello, [your name]!</code> using an f-string.
        Run it from the terminal.
      </p>

      <h3>Exercise 2 — Dynamic typing exploration</h3>
      <p>
        Create a variable <code>x</code>, assign it an integer, print its type. Then reassign
        it to a string and print its type again. What does this tell you about Python variables?
      </p>

      <h3>Exercise 3 — User input</h3>
      <p>
        Write a script that asks the user for their name and age, then prints:{" "}
        <code>Hi [name], you are [age] years old and will turn [age+1] next year.</code>
      </p>
      <p>
        Watch out: <code>input()</code> always returns a string.
      </p>

      <h3>Exercise 4 — The main guard</h3>
      <p>
        Create a file <code>calculator.py</code> with a function <code>add(a, b)</code> and a
        <code>main()</code> function that calls it. Use the <code>if __name__ == "__main__"</code>{" "}
        guard so <code>main()</code> only runs when the file is executed directly. Then import{" "}
        <code>add</code> from another file and verify <code>main()</code> does not run.
      </p>

      <h3>Exercise 5 — Naming conventions</h3>
      <p>
        Rewrite the following JavaScript names in Python-correct style:
      </p>
      <pre><code>{`// JavaScript
const userName = "Juan";
const MAX_RETRIES = 3;
function getUserById(id) { ... }
class userProfile { ... }
const _privateValue = 42;`}</code></pre>

      <h3>Mini Challenge</h3>
      <p>
        Write a script <code>greeting.py</code> that:
      </p>
      <ol>
        <li>Defines a function <code>greet(name: str, loud: bool = False) -&gt; str</code> that returns a greeting string. If <code>loud</code> is <code>True</code>, return the greeting in uppercase.</li>
        <li>Uses the <code>if __name__ == "__main__"</code> guard to read a name from input and call <code>greet</code>.</li>
        <li>Prints the result.</li>
      </ol>
      <p>
        Expected output examples:
      </p>
      <pre><code>{`$ python greeting.py
Enter your name: Juan
Hello, Juan

$ python greeting.py
Enter your name: Juan
# (modify to pass loud=True)
HELLO, JUAN`}</code></pre>
    </div>
  );
}
