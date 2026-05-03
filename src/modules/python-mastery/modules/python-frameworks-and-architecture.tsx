import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const frameworkSpectrumDiagram = String.raw`flowchart LR
    FLASK["Flask<br/>micro framework<br/>maximum flexibility"] --> FAST["FastAPI<br/>modern async APIs<br/>type-driven contracts"] --> DJ["Django<br/>full-stack batteries included<br/>ORM, admin, auth"]`;

const djangoMtvDiagram = String.raw`flowchart LR
    BROWSER["Browser"] --> URLS["urls.py<br/>routing"]
    URLS --> VIEW["View<br/>request handling and orchestration"]
    VIEW --> MODEL["Model<br/>ORM + domain data"]
    VIEW --> TEMPLATE["Template<br/>HTML presentation"]
    MODEL --> DB["Database"]
    TEMPLATE --> BROWSER`;

const cleanArchitectureDiagram = String.raw`flowchart TD
    OUTER["Interface adapters<br/>HTTP controllers, CLI, workers"] --> INFRA["Infrastructure<br/>repos, DB, cache, email"]
    INFRA --> APP["Application<br/>use cases and services"]
    APP --> DOMAIN["Domain<br/>entities and value objects"]`;

export const toc: TocItem[] = [
  { id: "ecosystem", title: "Python Web Framework Ecosystem", level: 2 },
  { id: "framework-comparison", title: "Django vs FastAPI vs Flask", level: 2 },
  { id: "django-architecture", title: "Django Architecture (MTV)", level: 2 },
  { id: "fastapi-architecture", title: "FastAPI Architecture", level: 2 },
  { id: "flask-basics", title: "Flask Basics", level: 2 },
  { id: "rest-design", title: "REST API Design Principles", level: 2 },
  { id: "layered-architecture", title: "Layered / Clean Architecture", level: 2 },
  { id: "project-structures", title: "Real-World Project Structures", level: 2 },
  { id: "di-patterns", title: "Dependency Injection Patterns", level: 2 },
  { id: "middleware-patterns", title: "Middleware Patterns", level: 2 },
  { id: "config-patterns", title: "Configuration Patterns", level: 2 },
  { id: "monolith-vs-micro", title: "Monolith vs Microservices", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function PythonFrameworksAndArchitecture() {
  return (
    <div className="article-content">
      <p>
        Knowing how to write Python is not enough for a backend role — interviewers want
        to know how you <em>structure</em> Python applications. This module covers the
        three major web frameworks, when to choose each, and the architectural patterns
        (layered, clean, DI, middleware) that appear in every serious Python backend.
      </p>

      <h2 id="ecosystem">Python Web Framework Ecosystem</h2>

      <p>Three frameworks dominate Python web development:</p>

      <MermaidDiagram
        chart={frameworkSpectrumDiagram}
        title="Python Web Framework Spectrum"
        caption="A useful interview framing is that Flask optimizes for flexibility, FastAPI for modern API speed and contracts, and Django for strong full-stack conventions."
        minHeight={320}
      />

      <h2 id="framework-comparison">Django vs FastAPI vs Flask</h2>

      <ArticleTable caption="Framework choice is mostly a tradeoff between convention, control, and API ergonomics. Interviewers want to hear the tradeoff, not just your favorite logo." minWidth={980}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Django</th>
              <th>FastAPI</th>
              <th>Flask</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Philosophy</strong></td><td>Batteries included</td><td>API-first, type-driven</td><td>Minimal, bring your own</td></tr>
            <tr><td><strong>Async</strong></td><td>Partial support</td><td>Native <code>async/await</code></td><td>Limited support</td></tr>
            <tr><td><strong>ORM</strong></td><td>Built-in Django ORM</td><td>Usually SQLAlchemy</td><td>Usually SQLAlchemy</td></tr>
            <tr><td><strong>Auth</strong></td><td>Built-in auth system</td><td>External JWT / OAuth libs</td><td>External extensions</td></tr>
            <tr><td><strong>Admin UI</strong></td><td>Built-in admin panel</td><td>None by default</td><td>External extensions</td></tr>
            <tr><td><strong>Validation</strong></td><td>Forms / serializers</td><td>Pydantic contracts</td><td>External libraries</td></tr>
            <tr><td><strong>API docs</strong></td><td>Usually DRF plugins</td><td>Auto OpenAPI + Swagger</td><td>External libraries</td></tr>
            <tr><td><strong>Use case</strong></td><td>Full-stack web apps</td><td>REST, async services, ML APIs</td><td>Prototypes and smaller services</td></tr>
            <tr><td><strong>Learning curve</strong></td><td>Steeper</td><td>Medium</td><td>Gentle</td></tr>
            <tr><td><strong>Performance</strong></td><td>Good</td><td>Excellent for I/O-heavy APIs</td><td>Good</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3>When to choose each</h3>
      <pre><code>{`# Choose Django when:
# - Building a full web app with templates, auth, admin
# - Team needs batteries-included conventions (less decision fatigue)
# - Content management, e-commerce, internal tools
# - Working with existing Django codebase

# Choose FastAPI when:
# - Building a REST/GraphQL/WebSocket API
# - You want automatic OpenAPI docs with zero config
# - Your codebase is type-annotated and async
# - You need high throughput with async I/O
# - Microservices, ML model serving, modern API backends

# Choose Flask when:
# - Small prototype or simple API
# - You want full control over every component
# - Embedding a web server in a larger app
# - Learning web fundamentals without magic`}</code></pre>

      <h2 id="django-architecture">Django Architecture (MTV)</h2>

      <MermaidDiagram
        chart={djangoMtvDiagram}
        title="Django MTV Pattern"
        caption="Django’s View behaves more like a controller, but the MTV naming still matters because interviewers will expect you to map the terminology correctly."
        minHeight={420}
      />

      <pre><code>{`# Django project structure
mysite/
├── manage.py              # CLI: runserver, migrate, createsuperuser
├── mysite/
│   ├── settings.py        # DB, installed apps, middleware, auth
│   ├── urls.py            # root URL dispatcher
│   ├── wsgi.py / asgi.py  # server entry point
├── users/                 # Django "app" — reusable unit
│   ├── models.py          # ORM models (extend Django's or your own)
│   ├── views.py           # request handlers (FBV or CBV)
│   ├── urls.py            # app-level URL patterns
│   ├── admin.py           # register models in admin UI
│   ├── serializers.py     # DRF serializers (if using REST framework)
│   ├── forms.py           # HTML form validation
│   ├── tests.py
│   └── migrations/        # Alembic equivalent — Django generates these
└── templates/             # HTML templates

# Key Django concepts
# App = self-contained Django module (auth, blog, shop...)
# Project = collection of apps + config
# INSTALLED_APPS = list of active apps in settings.py
# migrations = schema version control (python manage.py makemigrations/migrate)
# admin = auto-generated CRUD UI for all registered models`}</code></pre>

      <h3>Django REST Framework (DRF)</h3>
      <pre><code>{`# pip install djangorestframework

# settings.py
INSTALLED_APPS = [..., "rest_framework"]

# serializers.py — like Pydantic models for DRF
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email"]
        read_only_fields = ["id"]

# views.py — class-based views
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

# urls.py
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("users", UserViewSet)
urlpatterns = router.urls   # auto-generates CRUD endpoints`}</code></pre>

      <h2 id="fastapi-architecture">FastAPI Architecture</h2>

      <pre><code>{`# FastAPI is a thin ASGI framework — architecture is YOUR decision
# Best practice: use layered architecture

# Entry point
# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routers import users, products
from app.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)   # startup
    yield
    # teardown

app = FastAPI(lifespan=lifespan)
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(products.router, prefix="/products", tags=["products"])

# routers/users.py
from fastapi import APIRouter, Depends
router = APIRouter()

@router.get("/{user_id}")
async def get_user(user_id: int, service = Depends(get_user_service)):
    return service.get(user_id)

# Dependency chain: route → service → repository → DB session
# Each layer is injected — not imported directly`}</code></pre>

      <h2 id="flask-basics">Flask Basics</h2>

      <pre><code>{`from flask import Flask, request, jsonify
from flask import Blueprint

app = Flask(__name__)

# Basic route
@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = db.get(user_id)
    if user is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(user)

# Blueprint — Flask's module/router equivalent
users_bp = Blueprint("users", __name__, url_prefix="/users")

@users_bp.route("/")
def list_users():
    return jsonify(db.list_all())

app.register_blueprint(users_bp)

# Application factory pattern (recommended for larger apps)
def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(config or "config.DevelopmentConfig")
    db.init_app(app)
    app.register_blueprint(users_bp)
    return app

# run.py
app = create_app()
if __name__ == "__main__":
    app.run(debug=True)

# Flask extensions (the "batteries" you bring yourself)
# Flask-SQLAlchemy  — ORM integration
# Flask-Migrate     — Alembic migrations wrapper
# Flask-Login       — session-based auth
# Flask-JWT-Extended — JWT auth
# Flask-CORS        — CORS headers`}</code></pre>

      <h2 id="rest-design">REST API Design Principles</h2>

      <pre><code>{`# Resources are nouns, HTTP methods are verbs

# Good REST design:
GET    /users              # list users
POST   /users              # create user
GET    /users/{id}         # get one user
PUT    /users/{id}         # replace user
PATCH  /users/{id}         # partial update
DELETE /users/{id}         # delete user

GET    /users/{id}/orders  # nested resource
POST   /users/{id}/orders  # create for user

# Status codes — use them correctly
200 OK            # default success
201 Created       # POST success (with Location header)
204 No Content    # DELETE or action with no body
400 Bad Request   # client sent malformed data
401 Unauthorized  # missing/invalid auth
403 Forbidden     # authenticated but no permission
404 Not Found     # resource doesn't exist
409 Conflict      # duplicate, state conflict
422 Unprocessable # validation failed (FastAPI default)
429 Too Many      # rate limited
500 Internal      # unhandled server error

# Versioning strategies
/api/v1/users         # URL versioning (most common)
Accept: application/vnd.myapi.v1+json  # header versioning

# Pagination
GET /users?page=2&per_page=20
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20   # cursor (better for large datasets)

# Response envelope (optional, common pattern)
{
  "data": [...],
  "meta": {"total": 1000, "page": 2, "per_page": 20},
  "links": {"next": "/users?page=3", "prev": "/users?page=1"}
}

# HATEOAS — links in responses (rarely required but worth knowing)
{
  "id": 1,
  "name": "Juan",
  "_links": {
    "self": "/users/1",
    "orders": "/users/1/orders"
  }
}`}</code></pre>

      <h2 id="layered-architecture">Layered / Clean Architecture</h2>

      <MermaidDiagram
        chart={cleanArchitectureDiagram}
        title="Clean / Layered Architecture"
        caption="The dependency rule is the real point: outer layers depend inward, and the domain stays free of framework and database details."
        minHeight={360}
      />

      <pre><code>{`# Clean architecture in Python — the dependency rule:
# Inner layers know NOTHING about outer layers
# Domain → Application → Infrastructure → Interface (HTTP/CLI)

# Domain layer — pure Python, zero framework imports
# app/domain/user.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: int
    name: str
    email: str
    created_at: datetime

    def is_active_for_days(self, days: int) -> bool:
        return (datetime.now() - self.created_at).days < days

# Application layer — use cases, depends only on domain
# app/application/user_service.py
from app.domain.user import User
from app.application.interfaces import UserRepository  # Protocol

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    def create_user(self, name: str, email: str) -> User:
        if self.repo.get_by_email(email):
            raise ConflictError(f"email {email} already registered")
        return self.repo.create(name=name, email=email)

# Infrastructure layer — DB, email, cache
# app/infrastructure/db/user_repo.py
from sqlalchemy.orm import Session
from app.application.interfaces import UserRepository
from app.domain.user import User

class SqlUserRepository:  # implements UserRepository Protocol
    def __init__(self, session: Session): ...
    def get_by_email(self, email: str) -> User | None: ...
    def create(self, name: str, email: str) -> User: ...

# Interface layer — HTTP (FastAPI), CLI, workers
# app/interfaces/http/user_router.py
from fastapi import APIRouter, Depends
router = APIRouter()

@router.post("/users")
async def create_user(body: UserCreate, service = Depends(get_user_service)):
    return service.create_user(body.name, body.email)`}</code></pre>

      <h2 id="project-structures">Real-World Project Structures</h2>

      <pre><code>{`# ── Simple FastAPI (small team, 1–2 devs) ──────────────────────────────
app/
├── main.py          # FastAPI app
├── config.py        # settings
├── database.py      # engine, SessionLocal
├── models.py        # ALL SQLAlchemy models
├── schemas.py       # ALL Pydantic schemas
├── crud.py          # ALL repository functions
└── routers/
    ├── users.py
    └── products.py

# ── Feature-based (medium app, 5–10 devs) ────────────────────────────
app/
├── main.py
├── config.py
├── database.py
├── users/
│   ├── model.py     # SQLAlchemy User
│   ├── schema.py    # Pydantic UserCreate, UserResponse
│   ├── repo.py      # UserRepository
│   ├── service.py   # UserService
│   └── router.py    # /users routes
├── products/
│   └── ... same structure
└── shared/
    ├── exceptions.py
    └── deps.py      # shared Depends

# ── Domain-driven (large app, strict boundaries) ─────────────────────
src/
├── domain/          # zero dependencies — entities, value objects, events
├── application/     # use cases, interfaces (Protocols), DTOs
├── infrastructure/  # DB, email, cache, external APIs
│   ├── db/
│   │   ├── models.py    # SQLAlchemy models (infrastructure detail)
│   │   └── repos/
│   └── email/
├── interfaces/      # HTTP, CLI, workers
│   ├── http/
│   │   └── routers/
│   └── cli/
└── main.py

# ── Django (feature apps) ─────────────────────────────────────────────
project/
├── config/          # settings, urls, wsgi/asgi
├── apps/
│   ├── users/       # Django app
│   │   ├── models.py
│   │   ├── views.py / viewsets.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── admin.py
│   └── products/
├── templates/
└── static/`}</code></pre>

      <h2 id="di-patterns">Dependency Injection Patterns</h2>

      <pre><code>{`# ── FastAPI Depends — most common Python DI ──────────────────────────
from fastapi import Depends
from typing import Annotated
from sqlalchemy.orm import Session

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_repo(db: Session = Depends(get_db)) -> UserRepository:
    return SqlUserRepository(db)

def get_user_service(repo = Depends(get_user_repo)) -> UserService:
    return UserService(repo)

# Annotated shorthand (Python 3.9+)
DB = Annotated[Session, Depends(get_db)]
UserRepo = Annotated[UserRepository, Depends(get_user_repo)]
UserSvc = Annotated[UserService, Depends(get_user_service)]

@router.get("/{id}")
async def get_user(id: int, service: UserSvc):
    return service.get(id)

# ── Manual DI (no framework) ──────────────────────────────────────────
# Compose your dependency tree at startup

# main.py
engine = create_engine(DATABASE_URL)
session_factory = sessionmaker(bind=engine)

def build_container():
    session = session_factory()
    user_repo = SqlUserRepository(session)
    user_service = UserService(user_repo)
    return {"user_service": user_service}

# ── Testing — override dependencies ───────────────────────────────────
app.dependency_overrides[get_db] = lambda: FakeSession()
app.dependency_overrides[get_user_service] = lambda: FakeUserService()`}</code></pre>

      <h2 id="middleware-patterns">Middleware Patterns</h2>

      <pre><code>{`# Middleware intercepts every request/response
# Order matters: registered last runs first (LIFO for requests)

# ── FastAPI ───────────────────────────────────────────────────────────
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_per_minute=60):
        super().__init__(app)
        self.limits: dict[str, list] = defaultdict(list)
        self.max = max_per_minute

    async def dispatch(self, request, call_next):
        ip = request.client.host
        now = time.time()
        self.limits[ip] = [t for t in self.limits[ip] if now - t < 60]
        if len(self.limits[ip]) >= self.max:
            return JSONResponse({"detail": "rate limit exceeded"}, status_code=429)
        self.limits[ip].append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware, max_per_minute=100)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# ── Django middleware ─────────────────────────────────────────────────
# settings.py
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # your custom middleware:
    "myapp.middleware.RequestLoggingMiddleware",
]

# Custom Django middleware
class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        elapsed = time.time() - start
        logger.info(f"{request.method} {request.path} → {response.status_code} ({elapsed:.3f}s)")
        return response`}</code></pre>

      <h2 id="config-patterns">Configuration Patterns</h2>

      <pre><code>{`# ── pydantic-settings (recommended for FastAPI) ────────────────────────
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Reads from env vars automatically (case-insensitive)
    database_url: str
    secret_key: str
    debug: bool = False
    allowed_hosts: list[str] = ["*"]
    log_level: str = "INFO"

    # Multiple environments via env_prefix
    model_config = {"env_file": ".env", "case_sensitive": False}

@lru_cache   # singleton — only reads env once
def get_settings() -> Settings:
    return Settings()

# Usage in FastAPI
@app.get("/config")
def read_config(settings: Settings = Depends(get_settings)):
    return {"debug": settings.debug}

# ── Django settings per environment ────────────────────────────────────
# settings/
#   base.py     — common config
#   dev.py      — overrides for development (DEBUG=True, local DB)
#   prod.py     — overrides for production (security settings, real DB)

# manage.py (dev):   --settings=mysite.settings.dev
# manage.py (prod):  DJANGO_SETTINGS_MODULE=mysite.settings.prod

# base.py
from decouple import config   # reads .env
SECRET_KEY = config("SECRET_KEY")
DATABASE_URL = config("DATABASE_URL")

# dev.py
from .base import *
DEBUG = True
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", ...}}`}</code></pre>

      <h2 id="monolith-vs-micro">Monolith vs Microservices</h2>

      <pre><code>{`# ── Monolith ─────────────────────────────────────────────────────────
# One deployable Python app with all features
# Django or FastAPI with multiple feature modules

# Pros:
# - Simple local dev (one process)
# - No network latency between features
# - Shared DB transactions
# - Easy refactoring

# Cons:
# - Single deployment — one bug can take down everything
# - Harder to scale individual features
# - Codebase grows large over time

# ── Microservices ─────────────────────────────────────────────────────
# Multiple FastAPI/Flask apps, each owning its domain
# Communicate via HTTP or message queue (Celery, RabbitMQ, Kafka)

# user-service   → FastAPI app, owns users table
# order-service  → FastAPI app, owns orders table
# email-service  → FastAPI app, sends emails

# Inter-service communication patterns:
# Sync HTTP:  httpx.AsyncClient to call other service APIs
# Async:      Celery tasks, RabbitMQ, Kafka topics

# Pros:
# - Independent deployment and scaling
# - Technology flexibility per service
# - Fault isolation

# Cons:
# - Distributed systems complexity
# - No cross-service ACID transactions
# - Network latency + partial failure handling
# - Much harder to debug and trace

# ── Practical recommendation ─────────────────────────────────────────
# Start with a modular monolith (clean boundaries but one deploy)
# Extract services only when:
#   - A specific feature needs independent scaling
#   - A team needs to deploy independently
#   - Traffic patterns are very different per feature`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. When would you choose Django over FastAPI?</h3>
      <p>
        Django when: building a full web application with auth, admin panel, and
        template-rendered HTML; when the team wants convention over configuration with
        an established pattern; or for content-heavy apps (CMS, e-commerce). FastAPI
        when: building a REST/async API, the codebase uses type hints throughout, OpenAPI
        docs are needed, or high concurrency is required.
      </p>

      <h3>2. What is the Django MTV pattern?</h3>
      <p>
        Model-Template-View — Django&apos;s version of MVC. Model handles data and ORM.
        Template handles presentation (HTML). View handles business logic and glues Model
        and Template together (what other frameworks call a Controller). Note the naming
        inversion: Django&apos;s View = MVC&apos;s Controller.
      </p>

      <h3>3. What is the difference between a Django migration and Alembic?</h3>
      <p>
        Both version-control database schema changes as code files. Django generates
        migrations automatically from model changes (<code>makemigrations</code>) and applies
        them with <code>migrate</code>. Alembic is standalone — used with SQLAlchemy in
        FastAPI/Flask. Both support autogenerate, upgrade, and downgrade. Django&apos;s
        migration system is tighter (knows your models); Alembic requires explicit
        configuration of the target metadata.
      </p>

      <h3>4. What is the dependency rule in clean architecture?</h3>
      <p>
        Dependencies always point inward — outer layers depend on inner layers, never the
        reverse. The domain layer has zero external dependencies. The application layer
        depends only on domain. Infrastructure implements interfaces (Protocols) defined
        in the application layer. This means you can swap the database, HTTP framework,
        or email provider without touching business logic.
      </p>

      <h3>5. How does FastAPI&apos;s dependency injection differ from Django&apos;s?</h3>
      <p>
        FastAPI uses explicit <code>Depends(fn)</code> annotations — dependencies are
        declared at the function signature level and the framework resolves and injects
        them per request. Django uses a more implicit approach: middleware, signals, and
        <code>request.user</code> set by middleware. FastAPI&apos;s model is more testable
        — override dependencies with <code>app.dependency_overrides</code> without
        patching.
      </p>

      <h3>6. What is the application factory pattern in Flask?</h3>
      <p>
        Instead of creating the Flask app at module level, wrap creation in a{" "}
        <code>create_app(config)</code> function. This enables: multiple app instances
        (testing uses a different config), deferred initialisation of extensions,
        and clear configuration injection. The pattern is also used in pytest — create
        a test app with <code>TESTING=True</code> and in-memory DB.
      </p>

      <h3>7. What is middleware and when do you use it?</h3>
      <p>
        Middleware intercepts every request before it reaches your route and every
        response before it returns to the client. Use it for cross-cutting concerns that
        apply to all routes: authentication headers, CORS, request logging, request IDs,
        rate limiting, compression. Do not put business logic in middleware — it runs
        for every request, not just relevant ones.
      </p>

      <h3>8. What is the monolith vs microservices trade-off?</h3>
      <p>
        Monoliths are simpler to develop, deploy, and debug — one codebase, shared
        transactions, no network calls between features. Microservices enable independent
        deployment and scaling of individual services but introduce distributed system
        complexity: partial failures, eventual consistency, no cross-service ACID
        transactions, and distributed tracing requirements. Start with a modular monolith;
        extract services only when there is a concrete reason (scale, team autonomy).
      </p>

      <h3>9. How do you handle configuration across environments (dev/staging/prod)?</h3>
      <p>
        Use environment variables — never commit secrets. In FastAPI/Flask, use{" "}
        <code>pydantic-settings</code> (<code>BaseSettings</code> reads from env and
        <code>.env</code> files). In Django, use <code>python-decouple</code> or separate
        settings files per environment (<code>settings/dev.py</code>,{" "}
        <code>settings/prod.py</code>) that import from a shared base. Always fail fast
        on startup if required vars are missing.
      </p>

      <h3>10. What is Django REST Framework (DRF)?</h3>
      <p>
        A third-party package that adds REST API capabilities to Django:{" "}
        <code>Serializer</code> for input/output validation (similar to Pydantic),{" "}
        <code>ViewSet</code> for CRUD endpoints from a queryset with one class,{" "}
        <code>Router</code> for automatic URL generation, authentication classes, and
        permission classes. The standard way to build REST APIs in Django before FastAPI
        became popular.
      </p>
    </div>
  );
}
