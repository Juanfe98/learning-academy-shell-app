import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-pytest", title: "Why pytest?", level: 2 },
  { id: "naming-conventions", title: "Naming Conventions", level: 2 },
  { id: "assertions", title: "Assertions", level: 2 },
  { id: "fixtures", title: "Fixtures", level: 2 },
  { id: "fixture-scope", title: "Fixture Scope", level: 2 },
  { id: "parametrize", title: "Parametrized Tests", level: 2 },
  { id: "mocking", title: "Mocking with unittest.mock", level: 2 },
  { id: "testing-exceptions", title: "Testing Exceptions", level: 2 },
  { id: "conftest", title: "conftest.py", level: 2 },
  { id: "markers", title: "Markers", level: 2 },
  { id: "coverage", title: "Coverage", level: 2 },
  { id: "project-structure", title: "Test Project Structure", level: 2 },
  { id: "jest-comparison", title: "pytest vs Jest / Vitest", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "exercises", title: "Exercises", level: 2 },
];

export default function TestingWithPytest() {
  return (
    <div className="article-content">
      <p>
        pytest is the de facto standard testing framework in Python. It has no boilerplate,
        produces clear failure messages, and scales from simple unit tests to full integration
        test suites. If you know Jest or Vitest, you will feel at home quickly — but the
        fixture system is more powerful than anything in the JavaScript ecosystem.
      </p>

      <h2 id="why-pytest">Why pytest?</h2>

      <pre><code>{`# Install
pip install pytest

# Run all tests
pytest

# Run specific file
pytest tests/test_users.py

# Run specific test
pytest tests/test_users.py::test_create_user

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Show print output
pytest -s

# Run tests matching a keyword
pytest -k "user or auth"`}</code></pre>

      <h2 id="naming-conventions">Naming Conventions</h2>

      <p>pytest discovers tests by convention — no registration needed:</p>

      <pre><code>{`# Files must be named:
test_*.py        # test_users.py, test_auth.py
*_test.py        # users_test.py

# Functions must be named:
def test_*():    # test_create_user, test_login_fails

# Classes must be named:
class Test*:     # TestUserService, TestAuthFlow
    def test_*   # methods inside must still start with test_

# Example
# tests/test_users.py

def test_create_user():
    user = create_user("Juan", "j@ex.com")
    assert user["name"] == "Juan"

def test_create_user_invalid_email():
    with pytest.raises(ValueError):
        create_user("Juan", "not-an-email")

class TestUserService:
    def test_find_existing(self):
        ...

    def test_find_missing_returns_none(self):
        ...`}</code></pre>

      <h2 id="assertions">Assertions</h2>

      <p>
        pytest uses plain <code>assert</code> — no special assertion library needed. pytest
        rewrites assertions to produce detailed failure messages.
      </p>

      <pre><code>{`# Basic assertions
assert result == 42
assert name == "Juan"
assert items == [1, 2, 3]
assert user is not None
assert "error" in message
assert value > 0

# pytest shows the actual values on failure:
# AssertionError: assert 41 == 42
#  +  where 41 = compute()

# Approx — float comparison
from pytest import approx
assert 0.1 + 0.2 == approx(0.3)
assert result == approx(3.14159, rel=1e-3)   # 0.1% tolerance
assert result == approx(3.14, abs=0.01)      # absolute tolerance

# Membership
assert 42 in [1, 42, 99]
assert "hello" in response.text
assert "key" in my_dict

# Type check
assert isinstance(result, list)
assert isinstance(user, User)

# Negation
assert result != 0
assert "error" not in response
assert user is None

# Long diffs — pytest shows them inline
expected = {"name": "Juan", "age": 30, "role": "admin"}
actual   = {"name": "Juan", "age": 30, "role": "viewer"}
assert actual == expected
# AssertionError: assert {'role': 'viewer', ...} == {'role': 'admin', ...}
# Diff: {'role': ('viewer', 'admin')}`}</code></pre>

      <h2 id="fixtures">Fixtures</h2>

      <p>
        Fixtures are reusable setup functions. Declare with <code>@pytest.fixture</code>,
        inject by parameter name. pytest resolves them automatically — no explicit calls.
      </p>

      <pre><code>{`import pytest

# Simple fixture
@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Juan", "email": "j@ex.com", "role": "admin"}

# Use by parameter name
def test_user_name(sample_user):
    assert sample_user["name"] == "Juan"

def test_user_is_admin(sample_user):
    assert sample_user["role"] == "admin"

# Fixture that sets up and tears down
@pytest.fixture
def db_connection():
    conn = create_test_db()     # setup
    yield conn                  # test runs here — conn is injected
    conn.close()                # teardown — always runs

def test_save_user(db_connection):
    db_connection.execute("INSERT INTO users ...")
    assert db_connection.count("users") == 1

# Fixture using another fixture
@pytest.fixture
def auth_client(sample_user):
    client = TestClient()
    client.login(sample_user)
    return client

# Fixtures are composable — build complex setup from simple pieces`}</code></pre>

      <h2 id="fixture-scope">Fixture Scope</h2>

      <p>
        Scope controls how often the fixture is created. The default is{" "}
        <code>"function"</code> — fresh for every test.
      </p>

      <pre><code>{`# scope="function" (default) — new fixture per test
@pytest.fixture
def user():
    return User(name="Juan")

# scope="class" — shared within a test class
@pytest.fixture(scope="class")
def db():
    return connect_to_test_db()

# scope="module" — shared across the entire file
@pytest.fixture(scope="module")
def heavy_resource():
    resource = load_large_dataset()
    yield resource
    resource.cleanup()

# scope="session" — shared across entire test run
@pytest.fixture(scope="session")
def app_client():
    app = create_app(testing=True)
    return TestClient(app)

# Rule: use the widest scope that is safe
# session/module for expensive setup (DB migrations, app startup)
# function for anything stateful (avoid test pollution)`}</code></pre>

      <h2 id="parametrize">Parametrized Tests</h2>

      <p>
        Run the same test with multiple inputs — one test function, many cases.
      </p>

      <pre><code>{`import pytest

# Single parameter
@pytest.mark.parametrize("n,expected", [
    (0, True),
    (1, False),
    (2, True),
    (17, False),
    (100, True),
])
def test_is_even(n, expected):
    assert is_even(n) == expected

# Multiple parameters
@pytest.mark.parametrize("text,cleaned", [
    ("  hello  ",  "hello"),
    ("\thello\n", "hello"),
    ("hello",     "hello"),
    ("",          ""),
])
def test_strip(text, cleaned):
    assert strip_text(text) == cleaned

# IDs for readable output
@pytest.mark.parametrize("status,valid", [
    pytest.param("active",    True,  id="active-is-valid"),
    pytest.param("pending",   True,  id="pending-is-valid"),
    pytest.param("deleted",   False, id="deleted-is-invalid"),
    pytest.param("",          False, id="empty-is-invalid"),
])
def test_valid_status(status, valid):
    assert is_valid_status(status) == valid

# Stacked parametrize — cartesian product
@pytest.mark.parametrize("fmt", ["json", "xml"])
@pytest.mark.parametrize("method", ["GET", "POST"])
def test_endpoint(method, fmt):
    # runs 4 times: (GET,json) (GET,xml) (POST,json) (POST,xml)
    ...`}</code></pre>

      <h2 id="mocking">Mocking with unittest.mock</h2>

      <pre><code>{`from unittest.mock import Mock, MagicMock, patch, call

# Mock — create a fake object
mock_service = Mock()
mock_service.get_user.return_value = {"id": 1, "name": "Juan"}

result = mock_service.get_user(1)
assert result["name"] == "Juan"

# Verify calls
mock_service.get_user.assert_called_once_with(1)
mock_service.get_user.assert_called_with(1)
mock_service.get_user.call_count   # 1
mock_service.get_user.call_args    # call(1)

# Mock side effects
mock_service.get_user.side_effect = ValueError("not found")

# Mock raising an exception
mock_service.delete.side_effect = PermissionError("denied")

# MagicMock — like Mock but supports dunder methods (__len__, __iter__, etc.)
mock_list = MagicMock()
mock_list.__len__.return_value = 5
len(mock_list)   # 5`}</code></pre>

      <h3>patch — replace real objects in tests</h3>
      <pre><code>{`from unittest.mock import patch

# patch as decorator — replaces during the test, restores after
@patch("myapp.services.user.send_email")
def test_create_user_sends_email(mock_send_email):
    create_user("Juan", "j@ex.com")
    mock_send_email.assert_called_once_with("j@ex.com", "Welcome!")

# patch as context manager
def test_process():
    with patch("myapp.db.get_connection") as mock_conn:
        mock_conn.return_value = FakeConnection()
        result = process_data()
    assert result is not None

# patch.object — patch a specific attribute on an object
def test_order_service():
    with patch.object(PaymentGateway, "charge") as mock_charge:
        mock_charge.return_value = {"status": "success"}
        order = create_order(total=100)
    mock_charge.assert_called_once_with(amount=100)

# patch multiple
@patch("myapp.services.email.send")
@patch("myapp.services.sms.send")
def test_notify(mock_sms, mock_email):   # decorators apply bottom-up
    notify_user(user)
    mock_email.assert_called_once()
    mock_sms.assert_called_once()`}</code></pre>

      <h3>pytest-mock (cleaner API)</h3>
      <pre><code>{`# pip install pytest-mock
# Provides mocker fixture — cleaner than @patch decorators

def test_send_welcome(mocker):
    mock_send = mocker.patch("myapp.email.send")
    mock_send.return_value = True

    create_user("Juan", "j@ex.com")

    mock_send.assert_called_once_with(
        to="j@ex.com",
        subject="Welcome!"
    )
# mocker automatically cleans up after the test`}</code></pre>

      <h2 id="testing-exceptions">Testing Exceptions</h2>

      <pre><code>{`import pytest

# Test that exception is raised
def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

# Check the exception message
def test_invalid_age():
    with pytest.raises(ValueError, match="age must be positive"):
        create_user(name="Juan", age=-1)

# match uses re.search — partial string or regex
with pytest.raises(ValueError, match=r"\\d+ is not valid"):
    parse_id("abc")

# Inspect the exception
def test_custom_error():
    with pytest.raises(PaymentError) as exc_info:
        charge_card(amount=-50)

    assert exc_info.value.error_code == "INVALID_AMOUNT"
    assert "negative" in str(exc_info.value)

# Test that NO exception is raised
def test_valid_input():
    try:
        result = parse_config(valid_config)
    except Exception as e:
        pytest.fail(f"unexpected exception: {e}")`}</code></pre>

      <h2 id="conftest">conftest.py</h2>

      <p>
        Fixtures and hooks in <code>conftest.py</code> are automatically available to all
        tests in the same directory and subdirectories — no import needed.
      </p>

      <pre><code>{`# tests/conftest.py — fixtures available to all tests

import pytest
from myapp import create_app
from myapp.db import get_db

@pytest.fixture(scope="session")
def app():
    app = create_app(testing=True)
    return app

@pytest.fixture(scope="session")
def client(app):
    return app.test_client()

@pytest.fixture
def db(app):
    with app.app_context():
        get_db().create_all()    # create tables
        yield get_db()
        get_db().drop_all()      # clean up

@pytest.fixture
def admin_user(db):
    user = User(name="Admin", role="admin")
    db.session.add(user)
    db.session.commit()
    return user

# tests/users/conftest.py — only for user tests
@pytest.fixture
def viewer_user(db):
    user = User(name="Viewer", role="viewer")
    db.session.add(user)
    db.session.commit()
    return user`}</code></pre>

      <h2 id="markers">Markers</h2>

      <pre><code>{`import pytest

# Built-in markers
@pytest.mark.skip(reason="not implemented yet")
def test_future_feature():
    ...

@pytest.mark.skipif(sys.platform == "win32", reason="linux only")
def test_unix_permissions():
    ...

@pytest.mark.xfail(reason="known bug in v2.1")
def test_broken_thing():
    ...

# Custom markers — declare in pyproject.toml
# [tool.pytest.ini_options]
# markers = [
#   "slow: marks tests as slow",
#   "integration: marks integration tests",
# ]

@pytest.mark.slow
def test_heavy_computation():
    ...

@pytest.mark.integration
def test_real_database():
    ...

# Run only fast tests (exclude slow)
# pytest -m "not slow"

# Run only integration tests
# pytest -m integration`}</code></pre>

      <h2 id="coverage">Coverage</h2>

      <pre><code>{`# pip install pytest-cov

# Run with coverage report
pytest --cov=myapp

# With line-by-line detail
pytest --cov=myapp --cov-report=term-missing

# HTML report
pytest --cov=myapp --cov-report=html
# open htmlcov/index.html

# Fail if coverage drops below threshold
pytest --cov=myapp --cov-fail-under=80

# .coveragerc or pyproject.toml
# [tool.coverage.run]
# source = ["src/myapp"]
# omit = ["*/tests/*", "*/migrations/*"]
#
# [tool.coverage.report]
# fail_under = 80
# show_missing = true`}</code></pre>

      <h2 id="project-structure">Test Project Structure</h2>

      <pre><code>{`my_project/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── models.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── user_service.py
│       │   └── payment_service.py
│       └── utils.py
├── tests/
│   ├── conftest.py          ← shared fixtures
│   ├── test_models.py
│   ├── services/
│   │   ├── conftest.py      ← service-specific fixtures
│   │   ├── test_user_service.py
│   │   └── test_payment_service.py
│   └── test_utils.py
├── pyproject.toml
└── .coveragerc

# pyproject.toml test config
# [tool.pytest.ini_options]
# testpaths = ["tests"]
# addopts = "-v --cov=src/myapp --cov-report=term-missing"`}</code></pre>

      <h2 id="jest-comparison">pytest vs Jest / Vitest</h2>

      <pre><code>{`// Jest / Vitest                       # pytest

// Test function
test("adds numbers", () => {          def test_adds_numbers():
  expect(add(1, 2)).toBe(3);              assert add(1, 2) == 3
});

// describe block
describe("UserService", () => {       class TestUserService:
  test("create user", () => {             def test_create_user(self):
    ...                                       ...
  });
});

// Setup / teardown
beforeEach(() => { setup(); });       @pytest.fixture (per-test)
afterEach(() => { teardown(); });     yield in fixture (teardown after yield)
beforeAll(() => { setupOnce(); });    @pytest.fixture(scope="module")

// Mocking
jest.fn()                             Mock()
jest.spyOn(obj, "method")             patch.object(obj, "method")
jest.mock("./module")                 @patch("myapp.module")

// Mock return value
mockFn.mockReturnValue(42);           mock.return_value = 42

// Verify calls
expect(mockFn).toHaveBeenCalledWith(1); mock.assert_called_with(1)
expect(mockFn).toHaveBeenCalledTimes(1); assert mock.call_count == 1

// Expect exception
expect(() => fn()).toThrow(Error);    with pytest.raises(ValueError):
                                          fn()

// Parametrize
test.each([[1, true], [2, false]])(  @pytest.mark.parametrize("n,exp", [
  "n=%i", (n, exp) => { ... }            (1, True), (2, False)
);                                   ])
                                     def test_fn(n, exp): ...

// Skip
test.skip("todo", () => {});         @pytest.mark.skip(reason="todo")

// Coverage
jest --coverage                      pytest --cov=myapp`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Talk About Testing Like a Senior Engineer"
        intro="Strong testing answers are about confidence and system boundaries, not just saying “I write unit tests.”"
        steps={[
          "Start by naming the test pyramid you want: unit tests for core logic, integration tests for boundaries, and only a small number of end-to-end flows.",
          "Explain why pytest scales well: fixtures model setup explicitly, composition keeps tests DRY, and parametrization turns edge cases into readable coverage.",
          "Mention isolation strategy clearly, such as dependency overrides, fake repositories, temporary DB transactions, or network mocking at the edge.",
          "Call out what you do not mock when correctness matters, because over-mocking is one of the easiest ways to create false confidence.",
          "Close with the signals you care about: fast feedback, deterministic tests, useful failure messages, and coverage that follows risk rather than vanity percentages."
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is pytest and why is it preferred over unittest?</h3>
      <p>
        pytest is a third-party test framework that requires less boilerplate than
        Python&apos;s built-in <code>unittest</code>. No test class required, plain{" "}
        <code>assert</code> instead of <code>assertEqual</code>/<code>assertTrue</code>,
        automatic test discovery, a powerful fixture system, rich plugins ecosystem.{" "}
        <code>unittest</code> tests still run under pytest — they are compatible.
      </p>

      <h3>2. What is a pytest fixture?</h3>
      <p>
        A reusable setup function decorated with <code>@pytest.fixture</code>. Tests declare
        fixtures as parameters — pytest injects them automatically. Fixtures can yield
        (setup before yield, teardown after). Composable: fixtures can depend on other
        fixtures. Scope controls how often they are created: function, class, module,
        or session.
      </p>

      <h3>3. What is the difference between <code>scope="function"</code> and <code>scope="session"</code>?</h3>
      <p>
        <code>scope="function"</code> (default) creates a fresh fixture for every test —
        safe for stateful objects. <code>scope="session"</code> creates one fixture for the
        entire test run — used for expensive setup like starting a database or creating an
        app instance. Session-scoped fixtures must be side-effect-free or restore state
        after each test.
      </p>

      <h3>4. What is <code>@pytest.mark.parametrize</code>?</h3>
      <p>
        Runs one test function with multiple sets of inputs. Each parameter set is an
        independent test case with its own pass/fail. Cleaner than duplicating test
        functions. Accepts an ID parameter for readable output. Can be stacked for
        Cartesian product of inputs.
      </p>

      <h3>5. What is <code>patch</code> and when do you use it?</h3>
      <p>
        <code>unittest.mock.patch</code> temporarily replaces an object in the target
        module with a <code>Mock</code> during a test, then restores the original. Use it
        to isolate units from their dependencies — external APIs, databases, file system,
        time. The key: patch where the name is <em>used</em>, not where it is{" "}
        <em>defined</em>.
      </p>

      <h3>6. How do you test that a function raises an exception?</h3>
      <p>
        Use <code>pytest.raises(ExceptionType)</code> as a context manager. The test
        passes if the exception is raised, fails if it is not. Use the <code>match</code>{" "}
        parameter to check the error message with a regex. Inspect{" "}
        <code>exc_info.value</code> to access the exception object&apos;s attributes.
      </p>

      <h3>7. What is <code>conftest.py</code>?</h3>
      <p>
        A special file where pytest automatically looks for fixtures, hooks, and plugins.
        Fixtures defined here are available to all tests in the same directory and its
        subdirectories without importing. Multiple <code>conftest.py</code> files can exist
        at different levels of the test tree, each scoping its fixtures appropriately.
      </p>

      <h3>8. What does &quot;patch where it is used, not where it is defined&quot; mean?</h3>
      <p>
        When you import <code>from myapp.email import send</code> and then patch{" "}
        <code>"myapp.email.send"</code>, the patch only affects the original module. Code
        in <code>myapp.users</code> that already imported <code>send</code> holds a direct
        reference — it won&apos;t see the patch. You must patch{" "}
        <code>"myapp.users.send"</code> — the name as used in the module under test.
      </p>

      <h2 id="exercises">Exercises</h2>

      <h3>Exercise 1 — Basic test suite</h3>
      <p>
        Write tests for a <code>Calculator</code> class with <code>add</code>,{" "}
        <code>subtract</code>, <code>multiply</code>, <code>divide</code>. Include tests
        for normal cases and edge cases (<code>divide(x, 0)</code> should raise{" "}
        <code>ZeroDivisionError</code>).
      </p>

      <h3>Exercise 2 — Fixtures with teardown</h3>
      <p>
        Write a <code>temp_file</code> fixture that creates a temporary text file with
        known content, yields its path, and deletes the file in teardown. Write tests
        that read from this file and verify the fixture cleans up.
      </p>

      <h3>Exercise 3 — Parametrize edge cases</h3>
      <p>
        Write a parametrized test for a <code>is_valid_email(email: str) -&gt; bool</code>{" "}
        function covering at least 8 cases: valid emails, missing @, missing domain,
        empty string, None handling, subdomains.
      </p>

      <h3>Exercise 4 — Mock external API</h3>
      <p>
        You have a function <code>get_weather(city: str) -&gt; dict</code> that calls an
        external HTTP API. Write tests using <code>patch</code> that:
      </p>
      <ul>
        <li>Mock the HTTP call to return a fake response</li>
        <li>Test the happy path (valid city)</li>
        <li>Test that a <code>requests.Timeout</code> is handled and returns <code>None</code></li>
        <li>Verify the correct URL was called</li>
      </ul>

      <h3>Exercise 5 — Test exception message</h3>
      <p>
        Write a function <code>parse_date(text: str) -&gt; date</code> that raises{" "}
        <code>{"ValueError(f\"invalid date format: {text!r}, expected YYYY-MM-DD\")"}</code>.
        Write parametrized tests with <code>pytest.raises(match=...)</code> for 5
        invalid inputs.
      </p>

      <h3>Exercise 6 — Session-scoped fixture</h3>
      <p>
        Simulate a slow database setup: create a <code>scope="session"</code> fixture that
        initializes an in-memory SQLite DB with some test data. Write 3 tests that all
        share this one DB instance. Use a <code>scope="function"</code> fixture for
        per-test transaction rollback so tests don&apos;t affect each other.
      </p>

      <h3>Exercise 7 — mocker / pytest-mock</h3>
      <p>
        Rewrite Exercise 4 using <code>pytest-mock</code>&apos;s <code>mocker</code>{" "}
        fixture instead of <code>@patch</code> decorators. Compare the two styles.
      </p>

      <h3>Mini Challenge — Service Test Suite</h3>
      <p>
        Build a complete test suite for a <code>UserService</code>:
      </p>
      <pre><code>{`class UserService:
    def __init__(self, repo, email_service):
        self.repo = repo
        self.email_service = email_service

    def create(self, name: str, email: str) -> dict:
        if not name.strip():
            raise ValueError("name required")
        if "@" not in email:
            raise ValueError("invalid email")
        user = self.repo.save({"name": name, "email": email})
        self.email_service.send_welcome(email)
        return user

    def get(self, user_id: int) -> dict | None:
        return self.repo.find(user_id)

    def deactivate(self, user_id: int) -> bool:
        user = self.repo.find(user_id)
        if user is None:
            return False
        self.repo.update(user_id, {"active": False})
        return True`}</code></pre>
      <p>Requirements:</p>
      <ul>
        <li>Fixture for <code>UserService</code> with mocked <code>repo</code> and <code>email_service</code></li>
        <li>Test <code>create</code> happy path — verify repo.save and email called</li>
        <li>Test <code>create</code> with invalid name and email — parametrized</li>
        <li>Test <code>get</code> returns user when found, <code>None</code> when not</li>
        <li>Test <code>deactivate</code> both cases</li>
        <li>At least 10 test functions total</li>
      </ul>
    </div>
  );
}
