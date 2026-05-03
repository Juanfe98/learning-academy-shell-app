import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const capstoneArchitectureDiagram = String.raw`flowchart TD
    CLIENT["HTTP client"] --> ROUTERS["FastAPI routers<br/>candidates, interviews, feedback"]
    ROUTERS --> SERVICES["Service layer<br/>status transitions, scheduling rules, validation"]
    SERVICES --> REPOS["Repository layer<br/>candidate, interview, feedback repos"]
    REPOS --> DB["SQLite / PostgreSQL via SQLAlchemy"]
    ROUTERS -. depends .-> CONFIG["Settings + dependency injection"]
    ROUTERS -. maps .-> ERR["Global exception handlers"]`;

export const toc: TocItem[] = [
  { id: "overview", title: "Project Overview", level: 2 },
  { id: "learning-goals", title: "Learning Goals", level: 2 },
  { id: "architecture", title: "Architecture", level: 2 },
  { id: "project-structure", title: "Project Structure", level: 2 },
  { id: "data-models", title: "Data Models", level: 2 },
  { id: "api-endpoints", title: "API Endpoints", level: 2 },
  { id: "validation-rules", title: "Validation Rules", level: 2 },
  { id: "implementation-guide", title: "Implementation Guide", level: 2 },
  { id: "testing-requirements", title: "Testing Requirements", level: 2 },
  { id: "stretch-goals", title: "Stretch Goals", level: 2 },
  { id: "talking-points", title: "Interview Talking Points", level: 2 },
  { id: "delivery-playbook", title: "Interview Delivery Playbook", level: 2 },
  { id: "rubric", title: "Self-Evaluation Rubric", level: 2 },
];

export default function FinalPythonInterviewProject() {
  return (
    <div className="article-content">
      <p>
        This is the capstone project for the Python Mastery path. It combines every major
        concept covered: FastAPI, Pydantic, SQLAlchemy, pytest, async, typing, OOP, and
        error handling — in a realistic, interview-ready backend application.
      </p>

      <h2 id="overview">Project Overview</h2>

      <p>
        Build an <strong>Interview Tracker API</strong> — a backend system for managing
        job candidates and their interview pipeline.
      </p>

      <p>
        The system allows you to:
      </p>
      <ul>
        <li>Create and manage candidates</li>
        <li>Schedule interviews with dates, types, and interviewers</li>
        <li>Submit interview feedback</li>
        <li>Track interview status through a defined pipeline</li>
        <li>Query candidates by status, role, and date range</li>
      </ul>

      <p>
        This is a realistic scope for a take-home interview project or a portfolio piece.
        Expect to spend 6–10 hours building it properly.
      </p>

      <h2 id="learning-goals">Learning Goals</h2>

      <p>By completing this project you will demonstrate:</p>
      <ul>
        <li>FastAPI route design with proper HTTP semantics</li>
        <li>Pydantic models for request/response separation</li>
        <li>SQLAlchemy ORM models with relationships</li>
        <li>Repository and Service patterns</li>
        <li>pytest test suite with fixtures and mocks</li>
        <li>Custom exception hierarchy with proper HTTP mapping</li>
        <li>Async route handlers</li>
        <li>Environment-based configuration</li>
        <li>Type hints throughout</li>
      </ul>

      <h2 id="architecture">Architecture</h2>

      <MermaidDiagram
        chart={capstoneArchitectureDiagram}
        title="Interview Tracker Architecture"
        caption="The strongest version of this project keeps HTTP concerns in routers, business rules in services, and persistence details in repositories."
        minHeight={440}
      />

      <h2 id="project-structure">Project Structure</h2>

      <pre><code>{`interview_tracker/
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py              # FastAPI app, lifespan, router registration
│       ├── config.py            # Settings via pydantic-settings + .env
│       ├── database.py          # Engine, SessionLocal, Base, get_db dependency
│       ├── exceptions.py        # AppError, CandidateNotFoundError, etc.
│       │
│       ├── models/              # SQLAlchemy ORM models
│       │   ├── __init__.py
│       │   ├── candidate.py
│       │   ├── interview.py
│       │   └── feedback.py
│       │
│       ├── schemas/             # Pydantic request/response models
│       │   ├── __init__.py
│       │   ├── candidate.py
│       │   ├── interview.py
│       │   └── feedback.py
│       │
│       ├── repositories/        # DB access layer
│       │   ├── __init__.py
│       │   ├── base.py          # Optional: generic CRUD base
│       │   ├── candidate.py
│       │   ├── interview.py
│       │   └── feedback.py
│       │
│       ├── services/            # Business logic
│       │   ├── __init__.py
│       │   ├── candidate.py
│       │   ├── interview.py
│       │   └── feedback.py
│       │
│       └── routers/             # FastAPI route handlers
│           ├── __init__.py
│           ├── candidates.py
│           ├── interviews.py
│           └── feedback.py
│
├── tests/
│   ├── conftest.py              # app fixture, db fixture, test client
│   ├── test_candidates.py
│   ├── test_interviews.py
│   └── test_feedback.py
│
├── alembic/                     # Migrations (optional)
├── pyproject.toml
├── .env
└── .env.example`}</code></pre>

      <h2 id="data-models">Data Models</h2>

      <pre><code>{`# ── Candidate ─────────────────────────────────────────────────────────
# Fields:
#   id           int, PK, auto
#   name         str, required, max 200 chars
#   email        str, unique, required
#   role         str, required (e.g. "Senior Frontend Engineer")
#   status       enum: "applied" | "screening" | "interviewing" | "offer" | "rejected" | "hired"
#   source       str, optional (e.g. "LinkedIn", "Referral", "Job Board")
#   notes        str, optional
#   created_at   datetime, server default
#   updated_at   datetime, updated on change

# ── Interview ──────────────────────────────────────────────────────────
# Fields:
#   id             int, PK, auto
#   candidate_id   int, FK → candidates.id
#   type           enum: "phone_screen" | "technical" | "system_design" | "behavioral" | "final"
#   interviewer    str, required
#   scheduled_at   datetime, required
#   status         enum: "scheduled" | "completed" | "cancelled" | "no_show"
#   notes          str, optional
#   created_at     datetime

# ── Feedback ───────────────────────────────────────────────────────────
# Fields:
#   id             int, PK, auto
#   interview_id   int, FK → interviews.id (unique — one feedback per interview)
#   rating         int, 1–5
#   recommendation enum: "strong_yes" | "yes" | "neutral" | "no" | "strong_no"
#   strengths      str, optional
#   concerns       str, optional
#   submitted_by   str, required
#   created_at     datetime`}</code></pre>

      <h2 id="api-endpoints">API Endpoints</h2>

      <ArticleTable caption="Treat the endpoint surface as part of the project design. A good capstone shows clear resource boundaries, status semantics, and business workflow endpoints." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>GET</strong></td>
              <td><code>/candidates</code></td>
              <td>List candidates with filters for status, role, and search terms.</td>
              <td><code>200</code></td>
            </tr>
            <tr>
              <td><strong>POST</strong></td>
              <td><code>/candidates</code></td>
              <td>Create a new candidate record.</td>
              <td><code>201</code></td>
            </tr>
            <tr>
              <td><strong>GET</strong></td>
              <td><code>/candidates/{`{id}`}</code></td>
              <td>Fetch one candidate plus related interviews.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>PATCH</strong></td>
              <td><code>/candidates/{`{id}`}</code></td>
              <td>Update candidate fields partially.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>DELETE</strong></td>
              <td><code>/candidates/{`{id}`}</code></td>
              <td>Delete a candidate and cascade related interviews if that is your rule.</td>
              <td><code>204</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>POST</strong></td>
              <td><code>/candidates/{`{id}`}/advance</code></td>
              <td>Advance the candidate through the interview pipeline.</td>
              <td><code>200</code> / <code>409</code></td>
            </tr>
            <tr>
              <td><strong>GET</strong></td>
              <td><code>/candidates/{`{id}`}/interviews</code></td>
              <td>List interviews for a candidate.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>POST</strong></td>
              <td><code>/candidates/{`{id}`}/interviews</code></td>
              <td>Schedule a new interview for that candidate.</td>
              <td><code>201</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>PATCH</strong></td>
              <td><code>/interviews/{`{id}`}</code></td>
              <td>Reschedule, annotate, or change interview status.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>DELETE</strong></td>
              <td><code>/interviews/{`{id}`}</code></td>
              <td>Cancel an interview.</td>
              <td><code>204</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>POST</strong></td>
              <td><code>/interviews/{`{id}`}/feedback</code></td>
              <td>Submit feedback for a completed interview.</td>
              <td><code>201</code> / <code>404</code> / <code>409</code></td>
            </tr>
            <tr>
              <td><strong>GET</strong></td>
              <td><code>/interviews/{`{id}`}/feedback</code></td>
              <td>Fetch feedback for one interview.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>PATCH</strong></td>
              <td><code>/feedback/{`{id}`}</code></td>
              <td>Update feedback before the process is finalized.</td>
              <td><code>200</code> / <code>404</code></td>
            </tr>
            <tr>
              <td><strong>GET</strong></td>
              <td><code>/stats</code></td>
              <td>Return pipeline counts, conversion rates, and throughput signals.</td>
              <td><code>200</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="validation-rules">Validation Rules</h2>

      <pre><code>{`# Candidate validation
name:      1–200 chars, strip whitespace
email:     valid format, unique across all candidates
role:      1–100 chars
status:    must be one of the defined enum values
           advance() only allows: applied→screening→interviewing→offer→hired
           rejected/hired are terminal states — cannot advance further

# Interview validation
candidate_id:   candidate must exist and not be rejected/hired
type:           must be valid enum value
interviewer:    1–100 chars
scheduled_at:   must be in the future (on creation)
                cannot create new interview for rejected/hired candidate

# Feedback validation
interview_id:   interview must exist and have status "completed"
                only ONE feedback allowed per interview (409 if already exists)
rating:         integer 1–5 inclusive
recommendation: must be valid enum value
submitted_by:   1–100 chars

# Status transition diagram:
# applied → screening → interviewing → offer → hired
#                  ↘           ↘          ↘      ↑
#                 rejected   rejected   rejected
# Any status can go to "rejected"`}</code></pre>

      <h2 id="implementation-guide">Implementation Guide</h2>

      <h3>Step 1 — Project scaffold</h3>
      <pre><code>{`# Create virtual environment and install deps
python -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn[standard] sqlalchemy pydantic-settings \
            python-dotenv alembic pytest pytest-asyncio httpx

# .env
DATABASE_URL=sqlite:///./interview_tracker.db
TESTING=false

# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    testing: bool = False

    model_config = {"env_file": ".env"}

settings = Settings()`}</code></pre>

      <h3>Step 2 — Database setup</h3>
      <pre><code>{`# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite only
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()`}</code></pre>

      <h3>Step 3 — ORM models</h3>
      <pre><code>{`# models/candidate.py
from sqlalchemy import String, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum

class CandidateStatus(str, enum.Enum):
    applied       = "applied"
    screening     = "screening"
    interviewing  = "interviewing"
    offer         = "offer"
    rejected      = "rejected"
    hired         = "hired"

class Candidate(Base):
    __tablename__ = "candidates"

    id:         Mapped[int]              = mapped_column(primary_key=True)
    name:       Mapped[str]              = mapped_column(String(200))
    email:      Mapped[str]              = mapped_column(String(255), unique=True)
    role:       Mapped[str]              = mapped_column(String(100))
    status:     Mapped[CandidateStatus]  = mapped_column(default=CandidateStatus.applied)
    source:     Mapped[str | None]       = mapped_column(String(100))
    notes:      Mapped[str | None]
    created_at: Mapped[DateTime]         = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime]         = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    interviews: Mapped[list["Interview"]] = relationship("Interview", back_populates="candidate", cascade="all, delete-orphan")`}</code></pre>

      <h3>Step 4 — Exception hierarchy</h3>
      <pre><code>{`# exceptions.py
class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class NotFoundError(AppError):
    def __init__(self, resource: str, id: int):
        super().__init__(f"{resource} {id} not found", status_code=404)

class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(message, status_code=409)

class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)

# In main.py — register global handler
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})`}</code></pre>

      <h3>Step 5 — Service with status transitions</h3>
      <pre><code>{`# services/candidate.py
VALID_TRANSITIONS = {
    "applied":      ["screening", "rejected"],
    "screening":    ["interviewing", "rejected"],
    "interviewing": ["offer", "rejected"],
    "offer":        ["hired", "rejected"],
    "hired":        [],
    "rejected":     [],
}

class CandidateService:
    def __init__(self, repo: CandidateRepository):
        self.repo = repo

    def advance(self, candidate_id: int, new_status: str) -> Candidate:
        candidate = self.repo.get(candidate_id)
        if candidate is None:
            raise NotFoundError("candidate", candidate_id)

        allowed = VALID_TRANSITIONS.get(candidate.status.value, [])
        if new_status not in allowed:
            raise ConflictError(
                f"cannot transition from {candidate.status.value!r} to {new_status!r}. "
                f"Allowed: {allowed}"
            )

        return self.repo.update(candidate_id, {"status": new_status})`}</code></pre>

      <h2 id="testing-requirements">Testing Requirements</h2>

      <pre><code>{`# conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, get_db

@pytest.fixture(scope="session")
def engine():
    # In-memory SQLite — fast, isolated
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()   # each test gets clean state
    connection.close()

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides = {}

# Required test coverage:
# test_candidates.py
# - POST /candidates — happy path, duplicate email, missing fields
# - GET /candidates — empty list, filter by status, search
# - GET /candidates/{id} — found, not found
# - PATCH /candidates/{id} — partial update, not found
# - DELETE /candidates/{id} — success, not found, cascade check
# - POST /candidates/{id}/advance — valid transition, invalid transition, terminal state

# test_interviews.py
# - POST interview — success, candidate not found, rejected candidate
# - PATCH interview — reschedule, cancel, update notes
# - DELETE interview

# test_feedback.py
# - POST feedback — success, duplicate (409), interview not completed
# - GET feedback — found, not found
# - PATCH feedback

# Minimum: 25 test functions total`}</code></pre>

      <h2 id="stretch-goals">Stretch Goals</h2>

      <ul>
        <li>
          <strong>Pagination</strong> — add <code>skip</code>, <code>limit</code>, and total count to list responses
        </li>
        <li>
          <strong>Async SQLAlchemy</strong> — migrate to <code>asyncpg</code> + async sessions for fully async routes
        </li>
        <li>
          <strong>Alembic migrations</strong> — replace <code>Base.metadata.create_all()</code> with proper migration files
        </li>
        <li>
          <strong>Auth layer</strong> — add a simple API key header dependency on write operations
        </li>
        <li>
          <strong>Webhook simulation</strong> — fire a background task on status change (log to file, or send to a mock endpoint)
        </li>
        <li>
          <strong>Export endpoint</strong> — <code>GET /candidates/export.csv</code> — stream a CSV of all candidates using <code>StreamingResponse</code>
        </li>
        <li>
          <strong>Docker</strong> — add a <code>Dockerfile</code> and <code>docker-compose.yml</code> with PostgreSQL
        </li>
        <li>
          <strong>OpenAPI tags + descriptions</strong> — document every endpoint with summary, description, and response examples
        </li>
      </ul>

      <h2 id="talking-points">Interview Talking Points</h2>

      <p>
        When discussing this project in an interview, be ready to answer:
      </p>

      <h3>Architecture decisions</h3>
      <ul>
        <li>
          <strong>Why separate routers, services, and repositories?</strong> — Each layer has one responsibility. Routes handle HTTP. Services enforce business rules. Repositories handle DB access. This makes each testable in isolation and replaceable.
        </li>
        <li>
          <strong>Why use a repository pattern instead of querying directly in routes?</strong> — The route handler doesn&apos;t know if the data comes from SQLite, PostgreSQL, or an in-memory store. We swap the repository in tests without changing any business logic.
        </li>
        <li>
          <strong>Why define both input (Create) and output (Response) Pydantic models?</strong> — Response models act as a contract — we guarantee what fields are returned (and exclude sensitive ones). Input models validate and document what callers must send.
        </li>
      </ul>

      <h3>Python-specific decisions</h3>
      <ul>
        <li>
          <strong>Why use Enum for status fields?</strong> — Enum enforces valid values at the type level, generates the OpenAPI schema automatically, and is stored as a string in SQLite so it&apos;s human-readable.
        </li>
        <li>
          <strong>Why use a custom exception hierarchy?</strong> — Callers catch at the granularity they need. The global handler maps exception classes to HTTP status codes once, keeping route handlers free of HTTP concerns.
        </li>
        <li>
          <strong>Why use yield in the get_db() dependency?</strong> — The try/finally structure in a generator guarantees the session is closed even if the request handler raises. This is the standard FastAPI pattern for resource cleanup.
        </li>
      </ul>

      <h3>Testing decisions</h3>
      <ul>
        <li>
          <strong>Why use an in-memory SQLite for tests?</strong> — Fast (no disk I/O), isolated (each session), no setup required. Each test rolls back its transaction so tests never affect each other.
        </li>
        <li>
          <strong>Why use dependency_overrides instead of patching?</strong> — Overrides are cleaner and more explicit. The production code path runs unchanged — only the dependency resolution is redirected.
        </li>
      </ul>

      <h2 id="delivery-playbook">Interview Delivery Playbook</h2>
      <InterviewPlaybook
        title="How to Present This Capstone Like a Senior Candidate"
        intro="The project matters less than your ability to explain why the shape of the system makes future changes safer."
        steps={[
          "Open with the domain and the hardest rule: candidate status transitions and feedback timing drive the design.",
          "Walk the architecture from HTTP layer to persistence, naming what each layer owns and what it deliberately does not own.",
          "Point out one place where you enforced business correctness, such as preventing duplicate feedback or invalid state transitions.",
          "Highlight test strategy as a design decision: clean fixtures, dependency overrides, and isolated service or repository tests.",
          "Close with one concrete extension you would build next, such as auth, async DB sessions, pagination, or metrics."
        ]}
      />

      <h2 id="rubric">Self-Evaluation Rubric</h2>
      <ArticleTable caption="Aim for at least proficient across the board before using this as an interview story or portfolio proof point." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Passing</th>
              <th>Proficient</th>
              <th>Excellent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Project structure</strong></td>
              <td>Single file or minimal structure</td>
              <td>Routers / services / repos separated</td>
              <td>Clean <code>src/</code> layout, config, and exceptions</td>
            </tr>
            <tr>
              <td><strong>FastAPI usage</strong></td>
              <td>Basic routes work</td>
              <td>Correct status codes, response models, and <code>Depends</code></td>
              <td>Proper error handling, OpenAPI docs, and async routes</td>
            </tr>
            <tr>
              <td><strong>Pydantic models</strong></td>
              <td>Basic models</td>
              <td>Separate Create/Response models and field validation</td>
              <td><code>field_validator</code>, custom errors, and model examples</td>
            </tr>
            <tr>
              <td><strong>SQLAlchemy</strong></td>
              <td>Models work</td>
              <td>Relationships and proper session management</td>
              <td>Eager loading, transactions, and ORM 2.0 style</td>
            </tr>
            <tr>
              <td><strong>Business logic</strong></td>
              <td>Status stored</td>
              <td>Status transitions enforced</td>
              <td>Full transition matrix, cascades, and conflict rules</td>
            </tr>
            <tr>
              <td><strong>Testing</strong></td>
              <td>A few tests</td>
              <td>Happy paths plus error cases and a clean DB fixture</td>
              <td>25+ tests, edge cases, cascades, and transition rules</td>
            </tr>
            <tr>
              <td><strong>Type hints</strong></td>
              <td>Some annotations</td>
              <td>Full function signatures annotated</td>
              <td>Strict typing with mypy or pyright passing</td>
            </tr>
            <tr>
              <td><strong>Code quality</strong></td>
              <td>Works</td>
              <td>PEP 8, meaningful names, and low duplication</td>
              <td>Clear abstractions, no magic numbers, and strong consistency</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p style={{ marginTop: "1.5rem" }}>
        <strong>Aim for Proficient across all areas before an interview.</strong> Excellent
        in 2–3 areas is more impressive than Passing across all. Focus on FastAPI usage,
        business logic, and testing — those are what interviewers probe most.
      </p>
    </div>
  );
}
