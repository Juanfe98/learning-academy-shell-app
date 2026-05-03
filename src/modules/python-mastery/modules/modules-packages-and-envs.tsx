import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "modules", title: "Modules", level: 2 },
  { id: "packages", title: "Packages", level: 2 },
  { id: "imports", title: "Import Styles", level: 2 },
  { id: "absolute-vs-relative", title: "Absolute vs Relative Imports", level: 2 },
  { id: "init-py", title: "__init__.py", level: 2 },
  { id: "import-system", title: "How the Import System Works", level: 2 },
  { id: "virtual-environments", title: "Virtual Environments", level: 2 },
  { id: "pip", title: "pip and PyPI", level: 2 },
  { id: "dependency-files", title: "requirements.txt and pyproject.toml", level: 2 },
  { id: "env-vars", title: "Environment Variables", level: 2 },
  { id: "project-structure", title: "Recommended Project Structure", level: 2 },
  { id: "common-errors", title: "Common Import Errors", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function ModulesPackagesAndEnvs() {
  return (
    <div className="article-content">
      <p>
        Understanding Python&apos;s module system is essential for working on real projects
        and for interview questions about project structure. This module covers everything
        from how <code>import</code> resolves names, to virtual environments, to the modern
        <code>pyproject.toml</code> toolchain.
      </p>

      <h2 id="modules">Modules</h2>

      <p>
        A module is any <code>.py</code> file. Its name is the filename without the extension.
        When you import a module, Python executes the file once and caches it in{" "}
        <code>sys.modules</code>.
      </p>

      <pre><code>{`# math_utils.py
PI = 3.14159

def circle_area(radius):
    return PI * radius ** 2

def circle_perimeter(radius):
    return 2 * PI * radius

# main.py
import math_utils

print(math_utils.PI)
print(math_utils.circle_area(5))

# The module is an object — inspect it
print(type(math_utils))      # <class 'module'>
print(dir(math_utils))       # lists all names in the module`}</code></pre>

      <h2 id="packages">Packages</h2>

      <p>
        A package is a directory containing Python files. It allows you to group related
        modules under a common namespace.
      </p>

      <pre><code>{`# Directory structure:
myapp/
    __init__.py          # makes this directory a package
    models/
        __init__.py
        user.py
        product.py
    services/
        __init__.py
        auth.py
        payment.py
    utils/
        __init__.py
        formatting.py
        validation.py`}</code></pre>

      <h2 id="imports">Import Styles</h2>

      <pre><code>{`# 1. Import the whole module
import os
import math
import collections

os.path.join("/home", "user")
math.sqrt(16)

# 2. Import specific names
from os.path import join, exists
from math import sqrt, pi
from typing import Optional, List

join("/home", "user")   # no prefix needed
sqrt(16)

# 3. Import with alias
import numpy as np
import pandas as pd
from datetime import datetime as dt

np.array([1, 2, 3])

# 4. Import everything (avoid in production code)
from math import *     # imports all public names into current namespace
# pollutes namespace — hard to tell where names come from

# 5. Conditional import
try:
    import ujson as json    # faster JSON library if available
except ImportError:
    import json             # fall back to stdlib

# 6. Lazy import inside function (delays import cost)
def process_image(path):
    from PIL import Image   # only imported when function is called
    return Image.open(path)`}</code></pre>

      <h2 id="absolute-vs-relative">Absolute vs Relative Imports</h2>

      <h3>Absolute imports</h3>
      <p>
        Specify the full path from the project root. Always unambiguous. Preferred in
        modern Python.
      </p>
      <pre><code>{`# From anywhere in the project:
from myapp.models.user import User
from myapp.services.auth import authenticate
from myapp.utils.validation import validate_email`}</code></pre>

      <h3>Relative imports</h3>
      <p>
        Use <code>.</code> to mean &quot;current package&quot;, <code>..</code> for parent
        package. Only valid inside a package — cannot be used in a top-level script.
      </p>
      <pre><code>{`# Inside myapp/services/auth.py:

from . import payment           # sibling module in same package
from .payment import charge     # specific name from sibling
from ..models.user import User  # go up one level, then into models

# . means current package (myapp/services/)
# .. means parent package (myapp/)
# ... means grandparent package`}</code></pre>

      <h3>When to use each</h3>
      <pre><code>{`# Prefer absolute imports:
# - Clearer — always shows full path
# - Works from scripts and packages alike
# - Standard in most codebases and style guides

# Use relative imports:
# - Inside a library/package that may be installed anywhere
# - When you want the import to work regardless of where the package is installed
# - Common in Django apps, pytest plugins, installable packages`}</code></pre>

      <h2 id="init-py">__init__.py</h2>

      <p>
        <code>__init__.py</code> marks a directory as a Python package. It runs when the
        package is first imported. Can be empty, or used to define the package&apos;s public
        API.
      </p>

      <pre><code>{`# myapp/models/__init__.py

# Option 1: empty — just marks the directory as a package

# Option 2: re-export for cleaner public API
from .user import User
from .product import Product
from .order import Order

# Now callers can do:
from myapp.models import User     # instead of:
from myapp.models.user import User  # (still works too)

# Option 3: package-level initialization
import logging
logger = logging.getLogger(__name__)
logger.debug("models package loaded")`}</code></pre>

      <h3>Namespace packages (Python 3.3+)</h3>
      <pre><code>{`# Python 3.3+ supports "namespace packages" — directories without __init__.py
# They work as packages but have different behavior (no __init__.py code runs)
# For normal application code: always include __init__.py
# It makes intent explicit and avoids subtle bugs`}</code></pre>

      <h2 id="import-system">How the Import System Works</h2>

      <p>When you write <code>import mymodule</code>, Python does this:</p>

      <ol>
        <li>Checks <code>sys.modules</code> cache — if already imported, returns cached module</li>
        <li>Searches <code>sys.path</code> for the module file</li>
        <li>Loads, compiles, and executes the module file</li>
        <li>Stores the result in <code>sys.modules</code></li>
      </ol>

      <pre><code>{`import sys

# sys.path is a list of directories searched in order
print(sys.path)
# ['', '/usr/lib/python3.11', '/usr/lib/python3.11/lib-dynload', ...]
# '' (empty string) = current working directory

# sys.modules cache — already-imported modules
print(list(sys.modules.keys())[:5])
# ['sys', 'builtins', '_frozen_importlib', ...]

# Force reimport (rarely needed)
import importlib
importlib.reload(mymodule)

# Where was a module loaded from?
import os
print(os.__file__)   # /usr/lib/python3.11/os.py`}</code></pre>

      <h2 id="virtual-environments">Virtual Environments</h2>

      <p>
        A virtual environment is an isolated Python installation with its own set of
        installed packages. This prevents dependency conflicts between projects.
      </p>

      <pre><code>{`# Create a virtual environment
python -m venv .venv            # creates .venv/ directory
python3 -m venv .venv           # on systems where python = python2

# Activate
source .venv/bin/activate       # macOS / Linux
.venv\\Scripts\\activate.bat     # Windows CMD
.venv\\Scripts\\Activate.ps1    # Windows PowerShell

# Verify — should show .venv path
which python   # /path/to/project/.venv/bin/python
pip list       # only packages installed in this venv

# Deactivate
deactivate

# The .venv directory should be in .gitignore
# Never commit it — it's large and platform-specific`}</code></pre>

      <h3>Why virtual environments matter</h3>
      <pre><code>{`# Without venv:
# - Project A needs requests==2.28
# - Project B needs requests==2.31
# - Only one version can be installed globally — conflict!

# With venv:
# - Each project has its own .venv
# - Each .venv has its own requests version
# - No conflicts

# Common tools that manage venvs for you:
# - poetry (also handles dependencies and publishing)
# - pipenv (venv + Pipfile)
# - uv (modern, very fast — written in Rust)
# - pyenv (manages Python versions themselves)`}</code></pre>

      <h2 id="pip">pip and PyPI</h2>

      <pre><code>{`# PyPI — Python Package Index — pypi.org
# The central repository for Python packages (like npm for Node)

# Install a package
pip install requests
pip install "fastapi>=0.100"          # version constraint
pip install "uvicorn[standard]"       # with extras

# Install specific version
pip install requests==2.31.0

# Upgrade
pip install --upgrade requests

# Uninstall
pip uninstall requests

# List installed packages
pip list
pip show requests   # details about a specific package

# Install from requirements.txt
pip install -r requirements.txt

# Generate requirements.txt from current environment
pip freeze > requirements.txt

# Install in editable mode (for local development)
pip install -e .    # installs current directory as editable package`}</code></pre>

      <h2 id="dependency-files">requirements.txt and pyproject.toml</h2>

      <h3>requirements.txt</h3>
      <p>
        Simple flat list of dependencies. Used by <code>pip install -r</code>.
        Common in older projects and simple scripts.
      </p>
      <pre><code>{`# requirements.txt
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
sqlalchemy>=2.0.0
pydantic>=2.0.0
python-dotenv>=1.0.0

# requirements-dev.txt (development-only deps)
pytest>=7.0.0
pytest-asyncio>=0.21.0
httpx>=0.24.0
black>=23.0.0
ruff>=0.1.0`}</code></pre>

      <h3>pyproject.toml</h3>
      <p>
        Modern, unified config file for Python projects. Replaces <code>setup.py</code>,{" "}
        <code>setup.cfg</code>, and various tool-specific config files. Defined in PEP 517/518.
      </p>
      <pre><code>{`# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-api"
version = "0.1.0"
description = "A FastAPI backend"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.23.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "httpx>=0.24.0",
    "black>=23.0.0",
]

# Tool configuration co-located in the same file
[tool.black]
line-length = 88

[tool.ruff]
line-length = 88
select = ["E", "F", "I"]

[tool.pytest.ini_options]
asyncio_mode = "auto"`}</code></pre>

      <h2 id="env-vars">Environment Variables</h2>

      <pre><code>{`import os

# Read env var — returns None if missing
db_url = os.environ.get("DATABASE_URL")

# Read with default
debug = os.environ.get("DEBUG", "false").lower() == "true"

# Read required — raises KeyError if missing
secret_key = os.environ["SECRET_KEY"]

# Set env var (only affects current process)
os.environ["MY_VAR"] = "value"

# Best practice: use python-dotenv for local development
# pip install python-dotenv

from dotenv import load_dotenv
load_dotenv()   # loads .env file into os.environ

# .env file (never commit to git!)
# DATABASE_URL=postgresql://localhost/mydb
# SECRET_KEY=dev-secret-key
# DEBUG=true

# Add .env to .gitignore
# Commit .env.example with placeholder values instead`}</code></pre>

      <h2 id="project-structure">Recommended Project Structure</h2>

      <pre><code>{`# Small script / single file
my_script.py
requirements.txt
.env
.gitignore

# Application (FastAPI / Django / CLI)
my_project/
├── .venv/                  # virtual environment (gitignored)
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── main.py         # app entry point
│       ├── config.py       # settings / env var loading
│       ├── models/
│       │   ├── __init__.py
│       │   └── user.py
│       ├── services/
│       │   ├── __init__.py
│       │   └── auth.py
│       ├── routers/        # FastAPI routers
│       │   ├── __init__.py
│       │   └── users.py
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py         # pytest fixtures
│   ├── test_auth.py
│   └── test_users.py
├── pyproject.toml
├── .env
├── .env.example
└── .gitignore

# src/ layout benefits:
# - Tests cannot accidentally import from project root
# - Forces proper installation for testing
# - Clean separation between package code and project files`}</code></pre>

      <h2 id="common-errors">Common Import Errors</h2>

      <pre><code>{`# 1. ModuleNotFoundError: No module named 'requests'
# Cause: package not installed in active environment
# Fix:
pip install requests
# Or: wrong Python / venv not activated
which python   # verify it points to venv

# 2. ImportError: cannot import name 'X' from 'Y'
# Cause: name doesn't exist or was renamed in the version installed
# Fix: check version, check spelling, check __init__.py exports
pip show library-name   # verify installed version

# 3. ModuleNotFoundError: No module named 'myapp'
# Cause: running script from wrong directory, or package not installed
# Fix:
# - Run from project root: python -m myapp.main
# - Or install in editable mode: pip install -e .
# - Or add to PYTHONPATH: export PYTHONPATH=/path/to/project

# 4. ImportError: attempted relative import with no known parent package
# Cause: running a package file directly as a script
# Fix: run as module from project root
python -m myapp.services.auth   # correct
python myapp/services/auth.py   # wrong — relative imports fail

# 5. Circular imports
# Cause: module A imports module B which imports module A
# Fix: restructure (move shared code to a third module)
# Or: use lazy import inside the function that needs it`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is a Python module?</h3>
      <p>
        Any <code>.py</code> file. When imported, Python executes the file once and stores
        the result as a module object in <code>sys.modules</code>. Subsequent imports of
        the same module return the cached object — the file does not run again.
      </p>

      <h3>2. What is the difference between a module and a package?</h3>
      <p>
        A module is a single <code>.py</code> file. A package is a directory containing
        an <code>__init__.py</code> file (and usually other modules or sub-packages). Packages
        let you organize related modules under a shared namespace.
      </p>

      <h3>3. What does <code>__init__.py</code> do?</h3>
      <p>
        Marks a directory as a Python package and runs when the package is first imported.
        Can be empty (just to mark the directory) or define the package&apos;s public API by
        re-exporting names from submodules. Python 3.3+ supports namespace packages without
        <code>__init__.py</code>, but explicit <code>__init__.py</code> is still recommended.
      </p>

      <h3>4. What is the difference between absolute and relative imports?</h3>
      <p>
        Absolute imports specify the full path from the project root and are unambiguous.
        Relative imports use <code>.</code>/<code>..</code> to reference modules relative to
        the current package. Absolute imports are preferred in application code; relative
        imports are used in installable library packages.
      </p>

      <h3>5. Why do we use virtual environments?</h3>
      <p>
        To isolate project dependencies. Without virtual environments, all Python projects
        on a machine share one set of installed packages — version conflicts between projects
        are inevitable. A virtual environment creates a self-contained Python installation
        per project.
      </p>

      <h3>6. What is the difference between <code>pip freeze</code> and writing <code>requirements.txt</code> manually?</h3>
      <p>
        <code>pip freeze</code> outputs all installed packages with pinned exact versions
        (including transitive dependencies) — good for reproducible deployments.
        A hand-written <code>requirements.txt</code> lists only direct dependencies with
        flexible version constraints — better for libraries. For applications, pinned
        versions are safer; some teams use both: one flexible and one frozen file.
      </p>

      <h3>7. What is <code>pyproject.toml</code>?</h3>
      <p>
        The modern standard configuration file for Python projects (PEP 517/518). It
        replaces <code>setup.py</code> and <code>setup.cfg</code> and consolidates all
        tool configuration (pytest, black, ruff, mypy) in one file. Supported by all
        modern build tools: Poetry, Hatchling, Flit, PDM.
      </p>

      <h3>8. What is <code>sys.path</code>?</h3>
      <p>
        A list of directory paths Python searches in order when resolving an import. Includes
        the current directory (empty string), standard library paths, and
        site-packages from the active environment. You can append to it at runtime, but
        the correct approach for project code is proper installation or{" "}
        <code>PYTHONPATH</code>.
      </p>

      <h3>9. How do you fix a circular import?</h3>
      <p>
        Three approaches: (1) refactor — move shared code to a third module that neither
        A nor B imports; (2) use a lazy import inside the function that needs it, so the
        import happens at call time rather than at module load time; (3) restructure the
        architecture so the dependency flows in one direction only.
      </p>

      <h3>10. How do you load environment variables securely in Python?</h3>
      <p>
        Use <code>os.environ.get()</code> for optional vars, <code>os.environ["KEY"]</code>{" "}
        for required vars (raises <code>KeyError</code> on startup if missing — fail fast).
        Use <code>python-dotenv</code> with a <code>.env</code> file locally. Never hardcode
        secrets in source files. Never commit <code>.env</code> — commit <code>.env.example</code>{" "}
        with placeholder values instead.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Module as script and library</h3>
      <p>
        Create a module <code>string_utils.py</code> with functions <code>reverse(s)</code>,{" "}
        <code>is_palindrome(s)</code>, and <code>word_count(s)</code>. Use the{" "}
        <code>if __name__ == "__main__"</code> guard to run a demo when executed directly.
        Then import and use the functions from a second file.
      </p>

      <h3>Exercise 2 — Package structure</h3>
      <p>
        Create the following package structure:
      </p>
      <pre><code>{`calculator/
    __init__.py     # exports: add, subtract, multiply, divide
    basic.py        # add, subtract
    advanced.py     # multiply, divide`}</code></pre>
      <p>
        Make it so <code>from calculator import add, multiply</code> works without knowing
        which submodule each lives in.
      </p>

      <h3>Exercise 3 — Virtual environment walkthrough</h3>
      <p>
        Step through these commands and explain what each one does:
      </p>
      <pre><code>{`python -m venv .venv
source .venv/bin/activate
pip install httpx
pip freeze > requirements.txt
cat requirements.txt
deactivate`}</code></pre>

      <h3>Exercise 4 — Import error diagnosis</h3>
      <p>
        For each error, identify the most likely cause and fix:
      </p>
      <pre><code>{`# Error 1
ModuleNotFoundError: No module named 'myapp'
# when running: python src/myapp/main.py

# Error 2
ImportError: attempted relative import with no known parent package
# in file: myapp/services/auth.py
# line: from ..models import User

# Error 3
ImportError: cannot import name 'UserSchema' from 'myapp.schemas'`}</code></pre>

      <h3>Exercise 5 — Environment variable loader</h3>
      <p>
        Write a <code>Settings</code> class that:
      </p>
      <ul>
        <li>Reads <code>DATABASE_URL</code>, <code>SECRET_KEY</code>, and <code>DEBUG</code> from environment variables</li>
        <li>Raises <code>ValueError</code> at instantiation if <code>DATABASE_URL</code> or <code>SECRET_KEY</code> are missing</li>
        <li>Parses <code>DEBUG</code> as a bool (default <code>False</code>)</li>
        <li>Provides a <code>@classmethod from_env()</code> constructor</li>
      </ul>

      <h3>Exercise 6 — pyproject.toml reading</h3>
      <p>
        Given the following <code>pyproject.toml</code>, answer the questions below:
      </p>
      <pre><code>{`[project]
name = "task-api"
version = "0.2.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.100",
    "sqlalchemy>=2.0",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest>=7", "httpx>=0.24", "black"]

[tool.pytest.ini_options]
testpaths = ["tests"]`}</code></pre>
      <ul>
        <li>What command installs the project with dev dependencies?</li>
        <li>What Python version does this require?</li>
        <li>Where does pytest look for tests?</li>
        <li>Which dependencies are needed at runtime vs development only?</li>
      </ul>
    </div>
  );
}
