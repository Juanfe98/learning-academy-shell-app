import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fastApiRequestLifecycleDiagram = String.raw`flowchart TD
    CLIENT["Client"] --> UVI["Uvicorn / ASGI server"]
    UVI --> MW["Middleware stack<br/>CORS, auth, logging"]
    MW --> ROUTER["Router matches path + method"]
    ROUTER --> DEP["Resolve dependencies<br/>db session, auth, services"]
    DEP --> VALIDATE["Pydantic parses and validates inputs"]
    VALIDATE --> HANDLER["Route handler<br/>async def endpoint(...)"]
    HANDLER --> SERIALIZE["Serialize + filter response_model"]
    SERIALIZE --> CLIENT
    HANDLER -. raises .-> ERR["HTTPException / app error handler"]
    ERR --> CLIENT`;

const httpMethodsDiagram = String.raw`flowchart LR
    GET["GET<br/>read or list<br/>idempotent"] --> RES["/users resource"]
    POST["POST<br/>create<br/>not idempotent"] --> RES
    PUT["PUT<br/>replace entire resource<br/>idempotent"] --> RES
    PATCH["PATCH<br/>partial update<br/>usually not idempotent"] --> RES
    DELETE["DELETE<br/>remove resource<br/>idempotent"] --> RES`;

const dependencyTreeDiagram = String.raw`flowchart TB
    ROUTE["Route handler: GET /users/me"]
    AUTH["get_current_user"]
    DB["get_db"]
    SETTINGS["get_settings"]
    TOKEN["verify_token"]

    ROUTE --> AUTH
    ROUTE --> DB
    ROUTE --> SETTINGS
    AUTH --> TOKEN
    AUTH --> DB`;

export const toc: TocItem[] = [
  { id: "what-is-fastapi", title: "What Is FastAPI?", level: 2 },
  { id: "request-lifecycle", title: "Request Lifecycle", level: 2 },
  { id: "basic-setup", title: "Basic Setup", level: 2 },
  { id: "routing", title: "Routes and HTTP Methods", level: 2 },
  { id: "path-query-params", title: "Path and Query Parameters", level: 2 },
  { id: "request-body", title: "Request Body", level: 2 },
  { id: "response-models", title: "Response Models", level: 2 },
  { id: "pydantic-models", title: "Pydantic Models", level: 2 },
  { id: "dependency-injection", title: "Dependency Injection", level: 2 },
  { id: "error-handling", title: "Error Handling", level: 2 },
  { id: "middleware", title: "Middleware", level: 2 },
  { id: "openapi", title: "OpenAPI Docs", level: 2 },
  { id: "testing", title: "Testing FastAPI", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
  { id: "mini-project", title: "Mini Project: Task API", level: 2 },
];

export default function BackendWithFastapi() {
  return (
    <div className="article-content">
      <p>
        FastAPI is the fastest-growing Python web framework — it is async-first, generates
        OpenAPI docs automatically, and uses Pydantic for request/response validation. If
        you know Express.js or Next.js API routes, FastAPI will feel immediately productive.
        This module covers everything you need to build and discuss a Python backend API
        in interviews.
      </p>

      <h2 id="what-is-fastapi">What Is FastAPI?</h2>

      <pre><code>{`# FastAPI key properties:
# - Built on Starlette (ASGI framework) and Pydantic
# - Automatic OpenAPI + JSON Schema generation
# - Native async support
# - Type-hint driven — annotate parameters, FastAPI validates automatically
# - Fast: comparable to Node.js and Go for I/O-bound workloads

pip install fastapi uvicorn[standard]

# uvicorn — the ASGI server that runs FastAPI
# uvicorn[standard] includes websocket and http/2 extras`}</code></pre>

      <h2 id="request-lifecycle">Request Lifecycle</h2>

      <MermaidDiagram
        chart={fastApiRequestLifecycleDiagram}
        title="FastAPI Request Lifecycle"
        caption="A FastAPI request passes through the ASGI server and middleware, resolves dependencies, validates data, runs your handler, and then serializes the response contract."
        minHeight={500}
      />

      <h2 id="basic-setup">Basic Setup</h2>

      <pre><code>{`# main.py
from fastapi import FastAPI

app = FastAPI(
    title="My API",
    description="A sample FastAPI backend",
    version="0.1.0",
)

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

# Run:
# uvicorn main:app --reload
# --reload: auto-restart on code changes (development only)
# main:app → module "main", variable "app"

# Production:
# uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`}</code></pre>

      <h2 id="routing">Routes and HTTP Methods</h2>

      <MermaidDiagram
        chart={httpMethodsDiagram}
        title="HTTP Methods in FastAPI"
        caption="The method is not just syntax sugar. It communicates caching, retry, and client expectations, so interviewers expect you to defend these choices."
        minHeight={420}
      />

      <pre><code>{`from fastapi import FastAPI

app = FastAPI()

# GET — read
@app.get("/users")
async def list_users():
    return [{"id": 1, "name": "Juan"}]

# POST — create
@app.post("/users", status_code=201)
async def create_user(user: UserCreate):
    return save_user(user)

# PUT — replace
@app.put("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    return replace_user(user_id, user)

# PATCH — partial update
@app.patch("/users/{user_id}")
async def patch_user(user_id: int, data: UserPatch):
    return partial_update(user_id, data)

# DELETE — remove
@app.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int):
    remove_user(user_id)

# Router — group related routes
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
async def list_users(): ...

@router.get("/{user_id}")
async def get_user(user_id: int): ...

app.include_router(router)   # mount on the app`}</code></pre>

      <h2 id="path-query-params">Path and Query Parameters</h2>

      <pre><code>{`from fastapi import FastAPI, Query, Path
from typing import Optional

app = FastAPI()

# Path parameter — part of the URL
@app.get("/users/{user_id}")
async def get_user(user_id: int):   # FastAPI converts string → int automatically
    return {"user_id": user_id}

# Multiple path parameters
@app.get("/orgs/{org_id}/users/{user_id}")
async def get_org_user(org_id: int, user_id: int):
    return {"org_id": org_id, "user_id": user_id}

# Path with validation using Path()
@app.get("/items/{item_id}")
async def get_item(
    item_id: int = Path(ge=1, le=1000, description="Item ID between 1-1000")
):
    return {"item_id": item_id}

# Query parameters — come after ? in the URL
# GET /users?skip=0&limit=10&active=true
@app.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 10,
    active: Optional[bool] = None,
):
    return {"skip": skip, "limit": limit, "active": active}

# Query with validation using Query()
@app.get("/search")
async def search(
    q: str = Query(min_length=2, max_length=100, description="Search term"),
    tags: list[str] = Query(default=[]),   # ?tags=python&tags=fastapi
):
    return {"q": q, "tags": tags}`}</code></pre>

      <h2 id="request-body">Request Body</h2>

      <pre><code>{`from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    age: int = Field(ge=0, le=150)
    role: str = "viewer"

@app.post("/users", status_code=201)
async def create_user(user: UserCreate):
    # user is already validated by Pydantic
    saved = db.create(user.model_dump())
    return saved

# Mix body + path + query
@app.put("/users/{user_id}")
async def update_user(
    user_id: int,               # from path
    user: UserCreate,           # from request body (JSON)
    notify: bool = False,       # from query string
):
    updated = db.update(user_id, user.model_dump())
    if notify:
        send_notification(user.email)
    return updated

# Multiple body parameters
from fastapi import Body

@app.post("/items/{item_id}/review")
async def add_review(
    item_id: int,
    review: ReviewCreate,
    author: UserCreate = Body(embed=True),   # embed wraps in {"author": {...}}
):
    ...`}</code></pre>

      <h2 id="response-models">Response Models</h2>

      <pre><code>{`from pydantic import BaseModel

# Separate input and output models — best practice
class UserCreate(BaseModel):
    name: str
    email: str
    password: str               # received on create

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: str
    # no password field — never returned!

# response_model filters the output to only include declared fields
@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    db_user = db.create(user)
    return db_user   # even if db_user has password, it won't be in response

# response_model_exclude — exclude specific fields
@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    response_model_exclude={"created_at"},
)
async def get_user(user_id: int):
    return db.get(user_id)

# List response
@app.get("/users", response_model=list[UserResponse])
async def list_users():
    return db.list_users()

# Custom status codes
from fastapi import status
@app.post("/users", status_code=status.HTTP_201_CREATED)
@app.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
@app.get("/users/{id}", status_code=status.HTTP_200_OK)`}</code></pre>

      <h2 id="pydantic-models">Pydantic Models</h2>

      <pre><code>{`from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    admin = "admin"
    viewer = "viewer"
    editor = "editor"

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100, example="Juan")
    email: str = Field(example="juan@example.com")
    age: int = Field(ge=18, le=120)
    role: Role = Role.viewer
    bio: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("invalid email")
        return v.lower()   # normalize

    @field_validator("name")
    @classmethod
    def name_strip(cls, v: str) -> str:
        return v.strip()

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Juan Montana",
                "email": "juan@example.com",
                "age": 30,
                "role": "admin",
            }
        }
    }

# Nested models
class Address(BaseModel):
    street: str
    city: str
    country: str = "US"

class UserWithAddress(UserCreate):
    address: Address`}</code></pre>

      <h2 id="dependency-injection">Dependency Injection</h2>

      <MermaidDiagram
        chart={dependencyTreeDiagram}
        title="Dependency Injection Tree"
        caption="FastAPI resolves the leaves first, then reuses scoped dependency results when the handler needs them."
        minHeight={440}
      />

      <pre><code>{`from fastapi import Depends, FastAPI, HTTPException, status
from typing import Annotated

app = FastAPI()

# Simple dependency — provide a value
def get_settings():
    return {"db_url": "postgresql://...", "debug": False}

@app.get("/config")
async def read_config(settings = Depends(get_settings)):
    return settings

# Database session dependency (common pattern)
from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()
    try:
        yield db        # yield makes it a generator — teardown after yield runs after request
    finally:
        db.close()

# Auth dependency
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="invalid token")
    return user

# Use with Annotated (Python 3.9+, cleaner)
CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]

@app.get("/users/me")
async def get_me(current_user: CurrentUser, db: DB):
    return current_user

# Dependency for authorization
def require_admin(current_user: CurrentUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")
    return current_user

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    _: User = Depends(require_admin),   # _ means "we don't need the return value"
    db: DB = Depends(get_db),
):
    db.delete(user_id)`}</code></pre>

      <h2 id="error-handling">Error Handling</h2>

      <pre><code>{`from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

# HTTPException — raise for expected errors
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = db.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"user {user_id} not found",
        )
    return user

# Custom exception class
class AppError(Exception):
    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code

# Global exception handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.code,
        content={"error": exc.message},
    )

# Validation error handler (Pydantic validation failures → 422 by default)
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# HTTP status codes
# 200 OK          — default GET success
# 201 Created     — POST success
# 204 No Content  — DELETE success (no body)
# 400 Bad Request — client sent wrong data
# 401 Unauthorized — missing/invalid auth
# 403 Forbidden   — authenticated but not authorized
# 404 Not Found   — resource doesn't exist
# 422 Unprocessable Entity — validation failed
# 500 Internal Server Error — unexpected server error`}</code></pre>

      <h2 id="middleware">Middleware</h2>

      <pre><code>{`from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import time

# CORS — allow browser requests from other origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware — request timing
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)   # run the rest of the stack
        elapsed = time.perf_counter() - start
        response.headers["X-Process-Time"] = str(elapsed)
        return response

app.add_middleware(TimingMiddleware)

# Middleware order: added last runs first (stack/LIFO)
# Request:  CORS → Timing → Your handler
# Response: Your handler → Timing → CORS`}</code></pre>

      <h2 id="openapi">OpenAPI Docs</h2>

      <pre><code>{`# FastAPI generates docs automatically from your code

# Swagger UI  — http://localhost:8000/docs
# ReDoc       — http://localhost:8000/redoc
# OpenAPI JSON — http://localhost:8000/openapi.json

# Add metadata to routes
@app.get(
    "/users/{user_id}",
    summary="Get a user by ID",
    description="Returns a single user. Raises 404 if not found.",
    response_description="The user object",
    tags=["users"],
)
async def get_user(user_id: int):
    ...

# Tags group routes in the docs UI
@app.post("/users", tags=["users"])
@app.get("/products", tags=["products"])

# Deprecate a route
@app.get("/old-endpoint", deprecated=True)
async def old():
    ...

# Exclude from docs
@app.get("/internal", include_in_schema=False)
async def internal():
    ...`}</code></pre>

      <h2 id="testing">Testing FastAPI</h2>

      <pre><code>{`from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Basic test
def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}

# POST with body
def test_create_user():
    response = client.post(
        "/users",
        json={"name": "Juan", "email": "j@ex.com", "age": 30},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Juan"
    assert "id" in data

# Test 404
def test_get_missing_user():
    response = client.get("/users/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

# Override dependencies in tests
from fastapi.testclient import TestClient

def fake_get_db():
    return FakeDB()

def fake_current_user():
    return User(id=1, name="TestUser", role="admin")

app.dependency_overrides[get_db] = fake_get_db
app.dependency_overrides[get_current_user] = fake_current_user

client = TestClient(app)

# Reset after test
app.dependency_overrides = {}

# With pytest fixture
import pytest

@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: FakeDB()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}`}</code></pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Defend a FastAPI Design in an Interview"
        intro="Senior answers connect Python syntax to API contracts, operational safety, and maintainability."
        steps={[
          "Start with the request path: ASGI server, middleware, router, dependencies, handler, serialization.",
          "Explain why type hints matter here: FastAPI turns them into validation, docs, and safer refactors.",
          "Describe where you keep business logic: routes stay thin, dependencies inject infrastructure, services own real decisions.",
          "Call out correctness details that show maturity: response models, explicit status codes, consistent error envelopes, and testable dependencies.",
          "Mention when you would choose async def versus def, and be explicit that blocking code inside async routes is a production footgun."
        ]}
      />

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is FastAPI and why is it popular?</h3>
      <p>
        FastAPI is an async Python web framework built on Starlette and Pydantic. It is
        popular because it auto-generates OpenAPI docs, uses type hints for automatic
        validation, has performance comparable to Node.js for I/O-bound workloads, and
        requires minimal boilerplate. It combines the ergonomics of Flask with the power
        of async and the safety of Pydantic.
      </p>

      <h3>2. How does FastAPI handle request validation?</h3>
      <p>
        FastAPI reads the type annotations on route function parameters. For path/query
        params it coerces and validates the values automatically. For request bodies, you
        declare a Pydantic <code>BaseModel</code> — FastAPI deserializes the JSON, validates
        it against the model, and passes the typed object to your handler. Invalid requests
        return a <code>422 Unprocessable Entity</code> with structured error details.
      </p>

      <h3>3. What is dependency injection in FastAPI?</h3>
      <p>
        A system where route functions declare their dependencies as parameters annotated
        with <code>Depends(fn)</code>. FastAPI resolves the dependency tree before calling
        the handler — calling each dependency function, injecting their results. Dependencies
        can depend on other dependencies. Common uses: database sessions, authentication,
        settings, feature flags. Enables easy testing via <code>dependency_overrides</code>.
      </p>

      <h3>4. What is the difference between <code>async def</code> and <code>def</code> routes in FastAPI?</h3>
      <p>
        <code>async def</code> routes run in the event loop — use when you call async
        operations (async DB, httpx, asyncpg). <code>def</code> routes are automatically
        run in a thread pool by FastAPI — use when you call blocking sync libraries (SQLAlchemy
        sync, <code>requests</code>). Never call blocking code in <code>async def</code> routes.
      </p>

      <h3>5. What is a response model and why use it?</h3>
      <p>
        A Pydantic model declared as <code>response_model=UserResponse</code> on a route.
        FastAPI filters the handler&apos;s return value to only include fields declared in
        the model — sensitive fields (passwords, internal IDs) are automatically excluded.
        It also validates the response and contributes to the OpenAPI schema.
      </p>

      <h3>6. How do you handle 404 errors in FastAPI?</h3>
      <p>
        Raise <code>HTTPException(status_code=404, detail="message")</code>. FastAPI catches
        it and returns a JSON error response. For custom error structures, register a global
        exception handler with <code>@app.exception_handler(HTTPException)</code>.
      </p>

      <h3>7. What is CORS and how do you configure it?</h3>
      <p>
        Cross-Origin Resource Sharing — a browser security mechanism that blocks JavaScript
        from making requests to a different origin. Configure with{" "}
        <code>CORSMiddleware</code>, specifying allowed origins, methods, and headers. In
        development you may allow all origins; in production, restrict to your frontend
        domain.
      </p>

      <h3>8. How do you test FastAPI endpoints?</h3>
      <p>
        Use <code>TestClient</code> from <code>fastapi.testclient</code> (wraps the ASGI app
        with a sync HTTP client). Override dependencies via <code>app.dependency_overrides</code>{" "}
        to inject fakes (fake DB, fake current user). No server needs to be running —
        TestClient calls the ASGI app directly.
      </p>

      <h3>9. How does FastAPI generate OpenAPI documentation?</h3>
      <p>
        Automatically, from your code. Route decorators, parameter types, Pydantic models,
        <code>summary</code>/<code>description</code> arguments, and <code>tags</code> all
        contribute. Available at <code>/docs</code> (Swagger UI) and <code>/redoc</code>
        (ReDoc) without any extra configuration.
      </p>

      <h3>10. What is the ASGI interface?</h3>
      <p>
        Asynchronous Server Gateway Interface — the async successor to WSGI. An ASGI app
        is a callable that receives a <code>scope</code>, <code>receive</code>, and{" "}
        <code>send</code> coroutine. FastAPI is an ASGI app; Uvicorn is the ASGI server
        that calls it. This enables long-lived connections (WebSockets) and async I/O
        throughout the stack.
      </p>

      <h2 id="mini-project">Mini Project: Task API</h2>

      <p>
        Build a complete task management API with the following spec:
      </p>

      <pre><code>{`# Models
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: Literal["low", "medium", "high"] | None = None
    completed: bool | None = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None
    priority: str
    completed: bool
    created_at: str

# Endpoints to implement:
# GET    /tasks              list all tasks (query params: completed, priority)
# POST   /tasks              create a task (body: TaskCreate, status: 201)
# GET    /tasks/{task_id}    get one task (404 if missing)
# PATCH  /tasks/{task_id}    partial update (404 if missing)
# DELETE /tasks/{task_id}    delete (204 if success, 404 if missing)
# GET    /tasks/stats        total, completed count, by priority breakdown

# Requirements:
# - In-memory storage (dict keyed by id, no DB needed)
# - Proper response models — never expose internal fields
# - Proper status codes
# - HTTPException 404 when task not found
# - At least one dependency (e.g. get_task_or_404)
# - Full test suite with TestClient`}</code></pre>
    </div>
  );
}
