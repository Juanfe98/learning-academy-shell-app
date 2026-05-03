import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const sqlAlchemyLayersDiagram = String.raw`flowchart TD
    APP["Application code<br/>select(User), session.get(...), relationships"]
    ORM["ORM layer<br/>mapped classes, Session, identity map"]
    CORE["Core layer<br/>Table, Column, select(), insert(), text()"]
    SQL["SQL expression language<br/>builds dialect-aware SQL AST"]
    DRV["DB driver / DBAPI<br/>psycopg2, sqlite3, asyncpg"]

    APP --> ORM
    APP --> CORE
    ORM --> SQL
    CORE --> SQL
    SQL --> DRV`;

const sessionLifecycleDiagram = String.raw`stateDiagram-v2
    [*] --> Transient
    Transient --> Pending: session.add()
    Pending --> Persistent: flush()/commit()
    Pending --> Transient: rollback()
    Persistent --> Detached: session.close()/expunge()
    Persistent --> Deleted: session.delete()
    Deleted --> [*]: commit()
    Detached --> Persistent: session.merge()

    note right of Persistent
      Object is tracked by the identity map.
      Same primary key => same Python object
      inside one active session.
    end note`;

const repositoryPatternDiagram = String.raw`flowchart TD
    API["Route handler / API layer"]
    SERVICE["Service layer<br/>business rules + orchestration"]
    REPO["Repository interface"]
    MEMORY["InMemory repository<br/>tests"]
    SQLA["SQLAlchemy repository<br/>production"]
    DB["Database"]

    API --> SERVICE --> REPO
    REPO --> MEMORY
    REPO --> SQLA
    SQLA --> DB`;

export const toc: TocItem[] = [
  { id: "python-and-databases", title: "Python and Databases", level: 2 },
  { id: "sqlalchemy-layers", title: "SQLAlchemy: Core vs ORM", level: 2 },
  { id: "orm-models", title: "ORM Models", level: 2 },
  { id: "session-lifecycle", title: "Session Lifecycle", level: 2 },
  { id: "queries", title: "Queries", level: 2 },
  { id: "relationships", title: "Relationships", level: 2 },
  { id: "transactions", title: "Transactions", level: 2 },
  { id: "alembic", title: "Migrations with Alembic", level: 2 },
  { id: "repository-pattern", title: "Repository Pattern", level: 2 },
  { id: "fastapi-integration", title: "FastAPI + SQLAlchemy", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "mini-challenge", title: "Mini Challenge", level: 2 },
];

export default function DatabasesAndOrmBasics() {
  return (
    <div className="article-content">
      <p>
        SQLAlchemy is the standard Python ORM — used in Flask, FastAPI, and standalone
        scripts. Understanding the session lifecycle, how ORM queries translate to SQL,
        and the repository pattern are the three things interviewers probe most on
        Python backend topics.
      </p>

      <h2 id="python-and-databases">Python and Databases</h2>

      <pre><code>{`# Install
pip install sqlalchemy          # ORM
pip install psycopg2-binary     # PostgreSQL driver
pip install aiosqlite           # async SQLite driver

# Raw SQL with sqlite3 (stdlib — good for understanding)
import sqlite3

conn = sqlite3.connect("dev.db")          # creates file if missing
conn = sqlite3.connect(":memory:")        # in-memory (testing)
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    )
""")

cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Juan", "j@ex.com"))
conn.commit()

rows = cursor.execute("SELECT * FROM users").fetchall()
print(rows)   # [(1, "Juan", "j@ex.com")]

conn.close()

# ? placeholders prevent SQL injection — NEVER use f-strings for SQL values`}</code></pre>

      <h2 id="sqlalchemy-layers">SQLAlchemy: Core vs ORM</h2>

      <MermaidDiagram
        chart={sqlAlchemyLayersDiagram}
        title="SQLAlchemy Architecture"
        caption="ORM and Core are two entry points into the same SQL expression engine. Strong engineers know when to stay high-level and when to drop lower."
        minHeight={420}
      />

      <pre><code>{`from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session

# Engine — connection pool to the database
engine = create_engine(
    "sqlite:///dev.db",          # SQLite
    # "postgresql://user:pass@localhost/mydb",  # PostgreSQL
    echo=True,                   # log generated SQL (useful for learning)
)

# Test connection
with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print(result.fetchone())   # (1,)

# Base class for ORM models
class Base(DeclarativeBase):
    pass`}</code></pre>

      <h2 id="orm-models">ORM Models</h2>

      <pre><code>{`from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    # Mapped[T] + mapped_column() — modern SQLAlchemy 2.0 syntax
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationship to posts (defined below)
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, email={self.email!r})"

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    author: Mapped["User"] = relationship("User", back_populates="posts")

# Create all tables
Base.metadata.create_all(engine)

# Drop all tables
# Base.metadata.drop_all(engine)`}</code></pre>

      <h2 id="session-lifecycle">Session Lifecycle</h2>

      <MermaidDiagram
        chart={sessionLifecycleDiagram}
        title="Session Lifecycle"
        caption="Interviewers often ask about object states because they reveal whether you understand flush, commit, rollback, and why stale or detached objects happen."
        minHeight={420}
      />

      <pre><code>{`from sqlalchemy.orm import Session, sessionmaker

# Session factory
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Use as context manager (recommended)
with Session(engine) as session:
    # --- Transient → Pending ---
    user = User(name="Juan", email="j@ex.com")   # transient
    session.add(user)                             # pending — in session, not in DB yet

    # --- Pending → Persistent ---
    session.commit()                              # INSERT executed, user.id populated
    print(user.id)   # 1 — populated after commit

    # --- Query — returns Persistent objects ---
    found = session.get(User, 1)                 # by primary key — uses identity map
    print(found is user)   # True — same object!

    # --- Modify ---
    user.name = "Juan Felipe"    # SQLAlchemy tracks this (dirty)
    session.commit()             # UPDATE executed automatically

    # --- Delete ---
    session.delete(user)
    session.commit()             # DELETE executed

# Session closed — objects become Detached

# Rollback on error
with Session(engine) as session:
    try:
        session.add(User(name="Alice", email="alice@ex.com"))
        session.add(User(name="Alice", email="alice@ex.com"))  # duplicate email!
        session.commit()
    except Exception:
        session.rollback()   # undo pending changes
        raise`}</code></pre>

      <h2 id="queries">Queries</h2>

      <pre><code>{`from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import Session

with Session(engine) as session:

    # --- Get by primary key ---
    user = session.get(User, 1)           # returns None if not found

    # --- Select all ---
    stmt = select(User)
    users = session.scalars(stmt).all()   # list[User]

    # --- Filter ---
    stmt = select(User).where(User.active == True)
    stmt = select(User).where(User.name == "Juan")

    # --- Multiple conditions ---
    stmt = select(User).where(
        and_(User.active == True, User.name.startswith("J"))
    )
    stmt = select(User).where(
        or_(User.role == "admin", User.role == "editor")
    )

    # --- IN / NOT IN ---
    stmt = select(User).where(User.id.in_([1, 2, 3]))
    stmt = select(User).where(User.email.not_in(blocked_emails))

    # --- LIKE ---
    stmt = select(User).where(User.email.like("%@example.com"))
    stmt = select(User).where(User.name.ilike("juan%"))  # case-insensitive

    # --- ORDER, LIMIT, OFFSET ---
    stmt = (
        select(User)
        .where(User.active == True)
        .order_by(desc(User.created_at))
        .limit(10)
        .offset(20)
    )

    # --- COUNT ---
    count = session.scalar(select(func.count(User.id)))

    # --- Aggregate ---
    stmt = select(func.count(User.id), User.role).group_by(User.role)
    rows = session.execute(stmt).all()
    for count, role in rows:
        print(f"{role}: {count}")

    # --- First / one ---
    user = session.scalar(select(User).where(User.email == "j@ex.com"))
    # scalar() returns first column of first row, or None`}</code></pre>

      <h2 id="relationships">Relationships</h2>

      <pre><code>{`# One-to-many: User has many Posts
# (defined earlier via relationship())

with Session(engine) as session:
    user = session.get(User, 1)
    print(user.posts)   # lazy-loads posts on first access — SELECT issued here

    # Eager loading — load posts in same query (avoids N+1)
    from sqlalchemy.orm import selectinload, joinedload

    stmt = select(User).options(selectinload(User.posts))
    users = session.scalars(stmt).all()
    # Single query: SELECT users + SELECT posts WHERE user_id IN (...)

    stmt = select(User).options(joinedload(User.posts))
    # Single JOIN query — good for one-to-one, careful with one-to-many (duplicates)

    # Create related objects
    user = session.get(User, 1)
    post = Post(title="Hello", body="World", author=user)
    session.add(post)
    session.commit()

    # Or via collection
    user.posts.append(Post(title="Second post", body="..."))
    session.commit()

    # Many-to-many (association table)
    from sqlalchemy import Table, Column, ForeignKey

    post_tags = Table(
        "post_tags", Base.metadata,
        Column("post_id", ForeignKey("posts.id"), primary_key=True),
        Column("tag_id",  ForeignKey("tags.id"),  primary_key=True),
    )

    class Tag(Base):
        __tablename__ = "tags"
        id: Mapped[int] = mapped_column(primary_key=True)
        name: Mapped[str] = mapped_column(String(50), unique=True)
        posts: Mapped[list["Post"]] = relationship("Post", secondary=post_tags, back_populates="tags")`}</code></pre>

      <h2 id="transactions">Transactions</h2>

      <pre><code>{`# SQLAlchemy sessions are transactional by default (autocommit=False)

# Explicit transaction control
with Session(engine) as session:
    with session.begin():             # opens transaction, commits on exit, rolls back on error
        user = User(name="Alice", email="alice@ex.com")
        session.add(user)
        account = Account(user=user, balance=1000)
        session.add(account)
    # commit happens automatically here

# Nested transactions (savepoints)
with Session(engine) as session:
    session.begin()
    user = User(name="Alice", email="alice@ex.com")
    session.add(user)

    with session.begin_nested():      # SAVEPOINT
        post = Post(title="Draft", body="...", author=user)
        session.add(post)
        # if this fails, only the savepoint rolls back
        # outer transaction continues

    session.commit()

# Transfer example — atomic operation
def transfer(session, from_id, to_id, amount):
    sender = session.get(Account, from_id)
    receiver = session.get(Account, to_id)

    if sender.balance < amount:
        raise ValueError("insufficient funds")

    sender.balance -= amount
    receiver.balance += amount
    # both updates happen in one transaction — either both commit or both rollback`}</code></pre>

      <h2 id="alembic">Migrations with Alembic</h2>

      <pre><code>{`# pip install alembic

# Initialize Alembic in your project
alembic init alembic

# Project structure after init:
# alembic/
#   env.py          ← configure DB URL, import Base
#   versions/       ← migration files live here
# alembic.ini       ← config file

# Configure env.py to point at your models:
# from myapp.models import Base
# target_metadata = Base.metadata

# Generate a migration from model changes (autogenerate)
alembic revision --autogenerate -m "add users table"
# Creates: alembic/versions/abc123_add_users_table.py

# Apply pending migrations
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history --verbose

# Example generated migration file:
def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

def downgrade() -> None:
    op.drop_table("users")`}</code></pre>

      <h2 id="repository-pattern">Repository Pattern</h2>

      <MermaidDiagram
        chart={repositoryPatternDiagram}
        title="Repository Pattern"
        caption="The repository abstraction pays off when you need to test business logic without a real database or swap persistence details without rewriting your routes."
        minHeight={420}
      />

      <pre><code>{`from abc import ABC, abstractmethod
from typing import Protocol

# Define interface with Protocol (no ABC needed)
class UserRepository(Protocol):
    def get(self, user_id: int) -> User | None: ...
    def get_by_email(self, email: str) -> User | None: ...
    def list(self, skip: int = 0, limit: int = 100) -> list[User]: ...
    def create(self, data: dict) -> User: ...
    def update(self, user_id: int, data: dict) -> User | None: ...
    def delete(self, user_id: int) -> bool: ...

# SQLAlchemy implementation
class SQLUserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.session.scalar(
            select(User).where(User.email == email)
        )

    def list(self, skip: int = 0, limit: int = 100) -> list[User]:
        return list(self.session.scalars(
            select(User).offset(skip).limit(limit)
        ))

    def create(self, data: dict) -> User:
        user = User(**data)
        self.session.add(user)
        self.session.flush()    # INSERT without commit — populates user.id
        return user

    def update(self, user_id: int, data: dict) -> User | None:
        user = self.get(user_id)
        if user is None:
            return None
        for key, value in data.items():
            setattr(user, key, value)
        return user

    def delete(self, user_id: int) -> bool:
        user = self.get(user_id)
        if user is None:
            return False
        self.session.delete(user)
        return True

# In-memory implementation for tests
class InMemoryUserRepository:
    def __init__(self):
        self._store: dict[int, User] = {}
        self._next_id = 1

    def get(self, user_id: int) -> User | None:
        return self._store.get(user_id)

    def create(self, data: dict) -> User:
        user = User(id=self._next_id, **data)
        self._store[self._next_id] = user
        self._next_id += 1
        return user

    # ... other methods`}</code></pre>

      <h2 id="fastapi-integration">FastAPI + SQLAlchemy</h2>

      <pre><code>{`from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

app = FastAPI()

# DB session dependency
def get_db():
    with Session(engine) as session:
        yield session

# Repository dependency
def get_user_repo(db: Session = Depends(get_db)) -> SQLUserRepository:
    return SQLUserRepository(db)

# Route using repository
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    repo: SQLUserRepository = Depends(get_user_repo),
):
    user = repo.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user

@app.post("/users", status_code=201)
async def create_user(
    data: UserCreate,
    repo: SQLUserRepository = Depends(get_user_repo),
    db: Session = Depends(get_db),
):
    existing = repo.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=409, detail="email already registered")

    user = repo.create(data.model_dump())
    db.commit()    # commit happens in route, not in repo
    return user

# Testing — override with InMemoryUserRepository
app.dependency_overrides[get_user_repo] = lambda: InMemoryUserRepository()`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Talk About SQLAlchemy Like a Senior Backend Engineer"
        intro="Interviewers are usually checking whether you understand lifecycle and tradeoffs, not whether you memorized every ORM API."
        steps={[
          "Start with the layers: application code uses ORM or Core, both flow into the SQL expression engine and then the driver.",
          "Explain the session clearly: it is a unit of work, identity map, and transaction boundary, not just a connection handle.",
          "Mention the production pitfalls that matter: N+1 queries, detached objects, transaction scope leaks, and lazy loading in the wrong place.",
          "Defend repository or service boundaries only when they buy you something concrete such as cleaner tests or business rules outside route handlers.",
          "Close by showing you can drop down a level when needed, for example using Core or raw SQL for bulk operations or performance-sensitive queries."
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is an ORM?</h3>
      <p>
        Object-Relational Mapper — a library that maps database rows to Python objects and
        vice versa. You write Python classes instead of raw SQL. The ORM generates SQL from
        your operations and maps result rows back to objects. SQLAlchemy is Python&apos;s
        primary ORM; Django has its own built-in ORM.
      </p>

      <h3>2. What is a SQLAlchemy Session?</h3>
      <p>
        The unit of work pattern — a transaction-scoped object that tracks Python objects
        (added, modified, deleted) and flushes changes to the DB on commit. It maintains
        an identity map: querying the same primary key twice returns the same Python object.
        Always use one session per request in web applications; never share sessions across
        threads.
      </p>

      <h3>3. What is the difference between <code>flush()</code> and <code>commit()</code>?</h3>
      <p>
        <code>flush()</code> sends pending SQL to the DB within the current transaction
        — changes are visible within the transaction but not yet committed. Useful to get
        auto-generated IDs before committing. <code>commit()</code> persists the transaction
        to disk, making changes visible to other connections, and starts a new transaction.
      </p>

      <h3>4. What is the N+1 query problem?</h3>
      <p>
        Loading a list of objects (1 query) then accessing a relationship on each object
        (N queries). Example: load 100 users, then access <code>user.posts</code> for each
        → 101 queries. Fix with eager loading: <code>selectinload</code> (2 queries) or
        <code>joinedload</code> (1 JOIN query). SQLAlchemy&apos;s <code>echo=True</code>
        makes N+1 visible.
      </p>

      <h3>5. What is a database migration?</h3>
      <p>
        A versioned script that modifies the database schema (add table, add column, rename
        column). Alembic manages Python migrations — it compares your SQLAlchemy models to
        the current DB schema and auto-generates migration files. Run{" "}
        <code>alembic upgrade head</code> to apply all pending migrations.
      </p>

      <h3>6. What is the Repository pattern?</h3>
      <p>
        An abstraction layer between business logic and data access. Repositories expose
        CRUD methods (<code>get</code>, <code>create</code>, <code>update</code>,{" "}
        <code>delete</code>) — the caller does not know or care whether the data comes from
        a SQL database, an API, or in-memory storage. This makes testing trivial: swap the
        production repo for an in-memory one.
      </p>

      <h3>7. What is a transaction and why does it matter?</h3>
      <p>
        A sequence of operations that execute atomically — either all succeed or all are
        rolled back. Critical for data integrity: transferring money between accounts must
        debit one and credit the other in one atomic operation. SQLAlchemy sessions are
        transactional by default; always commit explicitly or use <code>session.begin()</code>{" "}
        as a context manager.
      </p>

      <h3>8. When would you use SQLAlchemy Core instead of ORM?</h3>
      <p>
        Core is better for bulk operations (insert thousands of rows), complex queries
        that are hard to express in the ORM, or when you need full control over generated
        SQL. The ORM adds overhead per-object for tracking. Core skips the identity map
        and object-tracking machinery — it just constructs and executes SQL expressions.
      </p>

      <h2 id="mini-challenge">Mini Challenge</h2>

      <p>Build a complete <strong>User Repository</strong> with the following spec:</p>

      <pre><code>{`# Schema: users table
# id, name, email (unique), role (admin|viewer|editor), active, created_at

# Implement SQLUserRepository with:
class SQLUserRepository:
    def get(self, user_id: int) -> User | None
    def get_by_email(self, email: str) -> User | None
    def list(self, skip=0, limit=100, active_only=False) -> list[User]
    def create(self, name: str, email: str, role: str = "viewer") -> User
    def update(self, user_id: int, **fields) -> User | None
    def delete(self, user_id: int) -> bool
    def count(self) -> int
    def search_by_name(self, query: str) -> list[User]   # ILIKE

# Implement InMemoryUserRepository with the same interface (for tests)

# Write pytest tests that:
# 1. Test each repository method
# 2. Use InMemoryUserRepository (no real DB needed)
# 3. Test edge cases: missing user, duplicate email, empty results
# 4. Use a fixture that provides a fresh repo per test

# Bonus:
# Wire it into a FastAPI app with these endpoints:
# GET    /users           (query param: active_only, search)
# GET    /users/{id}
# POST   /users
# PATCH  /users/{id}
# DELETE /users/{id}`}</code></pre>
    </div>
  );
}
