import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import type { TocItem } from "@/lib/types/academy";

const defenseInDepthDiagram = String.raw`flowchart TD
    NET["Network / infrastructure<br/>HTTPS, firewall, CDN, DDoS controls"]
    AUTHN["Authentication<br/>JWT, OAuth2, session validation"]
    AUTHZ["Authorization<br/>RBAC, scopes, object-level checks"]
    INPUT["Input validation<br/>Pydantic, schema checks, sanitisation"]
    LOGIC["Business logic protections<br/>rate limiting, audit logs, output encoding"]

    NET --> AUTHN --> AUTHZ --> INPUT --> LOGIC`;

export const toc: TocItem[] = [
  { id: "security-mindset", title: "Security Mindset for Python APIs", level: 2 },
  { id: "injection", title: "Injection Attacks", level: 2 },
  { id: "auth-jwt", title: "Authentication with JWT", level: 2 },
  { id: "authorization", title: "Authorization Patterns", level: 2 },
  { id: "secrets", title: "Secrets Management", level: 2 },
  { id: "input-validation", title: "Input Validation as Defence", level: 2 },
  { id: "https-cors", title: "HTTPS, CORS, and Security Headers", level: 2 },
  { id: "rate-limiting", title: "Rate Limiting", level: 2 },
  { id: "crypto", title: "Cryptography Basics", level: 2 },
  { id: "owasp", title: "OWASP Top 10 for Python APIs", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function PythonSecurity() {
  return (
    <div className="article-content">
      <p>
        Security is not a module you add later — it is a set of habits you apply from
        the start. This module covers the vulnerabilities that appear most often in Python
        backend interviews and code reviews: injection, broken auth, insecure secrets,
        and the OWASP Top 10 in a Python/FastAPI context.
      </p>

      <h2 id="security-mindset">Security Mindset for Python APIs</h2>

      <MermaidDiagram
        chart={defenseInDepthDiagram}
        title="Defence in Depth"
        caption="A secure Python API does not rely on one control. Each layer should still provide value even if another one fails."
        minHeight={440}
      />

      <pre><code>{`# Core security principles for Python APIs:
# 1. Never trust input — validate everything at the boundary
# 2. Least privilege — give each token/user only what they need
# 3. Fail securely — on error, deny access and log
# 4. Defence in depth — multiple layers; one breach ≠ full compromise
# 5. Keep secrets out of code — env vars, secret managers
# 6. Parameterise queries — never string-format SQL
# 7. Hash passwords properly — bcrypt, not MD5/SHA1`}</code></pre>

      <h2 id="injection">Injection Attacks</h2>

      <h3>SQL Injection</h3>
      <pre><code>{`# ❌ VULNERABLE — string formatting in SQL
def get_user_bad(username: str):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query)

# Attack: username = "' OR '1'='1"
# Executes: SELECT * FROM users WHERE username = '' OR '1'='1'
# Returns ALL users — authentication bypass!

# ✓ SAFE — parameterised queries (always use these)
# sqlite3
cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

# SQLAlchemy ORM (safe by design — never builds raw SQL strings)
session.query(User).filter(User.username == username).first()

# SQLAlchemy Core (safe with bound parameters)
stmt = select(User).where(User.username == username)
session.execute(stmt)

# SQLAlchemy raw SQL — use text() with bound params
from sqlalchemy import text
result = session.execute(
    text("SELECT * FROM users WHERE username = :username"),
    {"username": username}
)

# Django ORM (safe by design)
User.objects.filter(username=username).first()

# Rule: NEVER use f-strings, % formatting, or .format() for SQL values
# The ORM/driver handles escaping — trust it`}</code></pre>

      <h3>Command Injection</h3>
      <pre><code>{`import subprocess

# ❌ VULNERABLE — user input in shell command
def convert_image_bad(filename: str):
    os.system(f"convert {filename} output.png")
    # Attack: filename = "img.jpg; rm -rf /"

# ✓ SAFE — use list form, never shell=True with user input
def convert_image_safe(filename: str):
    # Validate first
    if not filename.endswith((".jpg", ".png", ".webp")):
        raise ValueError("invalid file type")

    subprocess.run(
        ["convert", filename, "output.png"],  # list — no shell interpolation
        check=True,
        timeout=30,
    )

# shell=True is dangerous with any user-controlled input
# subprocess.run("ls " + user_input, shell=True)  ← NEVER DO THIS`}</code></pre>

      <h3>Path Traversal</h3>
      <pre><code>{`from pathlib import Path

UPLOAD_DIR = Path("/var/uploads")

# ❌ VULNERABLE
def read_file_bad(filename: str):
    return open(f"/var/uploads/{filename}").read()
    # Attack: filename = "../../etc/passwd"

# ✓ SAFE — resolve and verify path is inside allowed directory
def read_file_safe(filename: str):
    safe_path = (UPLOAD_DIR / filename).resolve()
    if not str(safe_path).startswith(str(UPLOAD_DIR)):
        raise ValueError("path traversal detected")
    return safe_path.read_text()`}</code></pre>

      <h2 id="auth-jwt">Authentication with JWT</h2>

      <pre><code>{`# pip install python-jose[cryptography] passlib[bcrypt]

from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

# ── Password hashing ──────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)          # bcrypt — slow by design

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# NEVER store plain text passwords
# NEVER use MD5 or SHA1 for passwords (too fast — brute-forceable)
# bcrypt/argon2 are slow by design — makes brute force expensive

# ── JWT creation ──────────────────────────────────────────────────────
SECRET_KEY = os.environ["JWT_SECRET_KEY"]   # 256-bit random secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),               # subject — who the token is for
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),           # issued at
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── JWT verification ──────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="invalid token")
        return {"user_id": int(user_id), "role": payload.get("role")}
    except JWTError:
        raise HTTPException(status_code=401, detail="could not validate token")

# ── Login endpoint ─────────────────────────────────────────────────────
from fastapi import FastAPI
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI()

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = db.get_by_email(form.username)
    if user is None or not verify_password(form.password, user.password_hash):
        # Same error message for both — don't reveal which one failed
        raise HTTPException(status_code=401, detail="invalid credentials")

    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer"}

# ── Protected route ───────────────────────────────────────────────────
@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# JWT security notes:
# - Store tokens in httpOnly cookies (web) or secure storage (mobile)
# - Never store in localStorage (XSS risk)
# - Short expiry (15-60 min) + refresh token pattern for long sessions
# - Add token revocation (store revoked JTIs in Redis) for logout`}</code></pre>

      <h2 id="authorization">Authorization Patterns</h2>

      <pre><code>{`from typing import Annotated
from fastapi import Depends, HTTPException

# ── Role-based access control (RBAC) ─────────────────────────────────
def require_role(*roles: str):
    """Factory that returns a dependency checking for required roles."""
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"role {current_user['role']!r} not allowed"
            )
        return current_user
    return checker

AdminUser  = Annotated[dict, Depends(require_role("admin"))]
EditorUser = Annotated[dict, Depends(require_role("admin", "editor"))]

@app.delete("/users/{user_id}")
def delete_user(user_id: int, _: AdminUser):   # only admins
    db.delete(user_id)

@app.patch("/posts/{post_id}")
def update_post(post_id: int, user: EditorUser):  # admins + editors
    ...

# ── Resource ownership check ──────────────────────────────────────────
@app.delete("/posts/{post_id}")
def delete_post(post_id: int, current_user: dict = Depends(get_current_user)):
    post = db.get_post(post_id)
    if post is None:
        raise HTTPException(404, "post not found")

    # Only owner or admin can delete
    if post.author_id != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(403, "not authorised")

    db.delete(post)

# ── Scope-based (OAuth2 style) ────────────────────────────────────────
def require_scope(scope: str):
    def checker(token: str = Depends(oauth2_scheme)) -> dict:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        scopes = payload.get("scopes", [])
        if scope not in scopes:
            raise HTTPException(403, f"scope {scope!r} required")
        return payload
    return checker

@app.get("/reports")
def get_reports(_: dict = Depends(require_scope("reports:read"))):
    ...`}</code></pre>

      <h2 id="secrets">Secrets Management</h2>

      <pre><code>{`# ── Environment variables — minimum viable secrets ───────────────────
import os
from dotenv import load_dotenv

load_dotenv()  # reads .env in development

DATABASE_URL = os.environ["DATABASE_URL"]      # raises KeyError if missing — fail fast
SECRET_KEY   = os.environ["SECRET_KEY"]
DEBUG        = os.environ.get("DEBUG", "false").lower() == "true"

# .env (never commit — add to .gitignore)
# DATABASE_URL=postgresql://user:pass@localhost/mydb
# SECRET_KEY=super-secret-key-change-me
# DEBUG=true

# .env.example (DO commit — placeholder values)
# DATABASE_URL=postgresql://user:pass@localhost/mydb
# SECRET_KEY=change-me-in-production
# DEBUG=false

# ── pydantic-settings — validated config ────────────────────────────
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env"}

settings = Settings()   # fails with ValidationError on missing required vars

# ── Python's secrets module for token generation ─────────────────────
import secrets

token = secrets.token_hex(32)          # 64-char hex string (256 bits)
token = secrets.token_urlsafe(32)      # URL-safe base64 (for tokens in URLs)
otp   = secrets.randbelow(1_000_000)   # secure 6-digit OTP

# NEVER use random.random() or random.randint() for security tokens
# random is deterministic — secrets uses the OS CSPRNG

# ── What NOT to do ────────────────────────────────────────────────────
SECRET_KEY = "mysecret"                # ❌ hardcoded in source code
SECRET_KEY = "mysecret"  # type: ignore  # ❌ still wrong
password_hash = hashlib.md5(password.encode()).hexdigest()  # ❌ MD5 is broken for passwords
password_hash = hashlib.sha256(password.encode()).hexdigest()  # ❌ SHA256 is too fast — use bcrypt`}</code></pre>

      <h2 id="input-validation">Input Validation as Defence</h2>

      <pre><code>{`from pydantic import BaseModel, Field, field_validator
import re

# Pydantic rejects malformed input BEFORE it reaches business logic
# This is your first line of defence against injection and unexpected data

class CreateUserRequest(BaseModel):
    name:     str = Field(min_length=1, max_length=100)
    email:    str = Field(max_length=254)
    age:      int = Field(ge=0, le=150)
    bio:      str | None = Field(default=None, max_length=500)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Simple pattern — use email-validator library for production
        pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v):
            raise ValueError("invalid email format")
        return v.lower()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        # Prevent script injection in name fields
        if re.search(r"[<>\"'&;]", v):
            raise ValueError("invalid characters in name")
        return v.strip()

# FastAPI returns 422 Unprocessable Entity on validation failure
# with structured error details — no stack trace exposed to client

# ── Output encoding (prevent XSS) ─────────────────────────────────────
import html

# If rendering user content in HTML templates:
safe_name = html.escape(user.name)   # escapes <, >, &, ", '

# FastAPI returns JSON — JSON encoding naturally prevents XSS in API responses
# The XSS risk is in the FRONTEND that renders the data, not the API

# ── File upload validation ─────────────────────────────────────────────
from fastapi import UploadFile
import magic   # python-magic — check actual file type, not extension

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024   # 5MB

async def validate_upload(file: UploadFile) -> bytes:
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "file too large")
    mime = magic.from_buffer(content[:2048], mime=True)  # check magic bytes
    if mime not in ALLOWED_TYPES:
        raise HTTPException(415, f"unsupported file type: {mime}")
    return content`}</code></pre>

      <h2 id="https-cors">HTTPS, CORS, and Security Headers</h2>

      <pre><code>{`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

app = FastAPI()

# ── CORS — control which origins can call your API ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],    # ❌ NEVER use ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── HTTPS redirect in production ───────────────────────────────────────
if not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)

# ── Security headers middleware ────────────────────────────────────────
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Remove version info
        del response.headers["server"]
        return response

app.add_middleware(SecurityHeadersMiddleware)`}</code></pre>

      <h2 id="rate-limiting">Rate Limiting</h2>

      <pre><code>{`# ── In-memory rate limiting (single instance, dev/small apps) ──────────
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request, call_next):
        client_ip = request.client.host
        now = time.time()

        # Keep only requests in the last 60 seconds
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < 60
        ]

        if len(self.requests[client_ip]) >= self.rpm:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"detail": "rate limit exceeded"},
                status_code=429,
                headers={"Retry-After": "60"},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)

# ── Redis-based rate limiting (distributed, production) ─────────────────
# pip install redis
import redis

r = redis.Redis(host="localhost", port=6379)

def check_rate_limit(user_id: int, limit: int = 100, window: int = 60) -> bool:
    key = f"rate:{user_id}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()
    return count <= limit

@app.get("/api/data")
def get_data(current_user = Depends(get_current_user)):
    if not check_rate_limit(current_user["user_id"]):
        raise HTTPException(429, "rate limit exceeded")
    return fetch_data()

# ── slowapi — FastAPI rate limiting library ──────────────────────────────
# pip install slowapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/search")
@limiter.limit("10/minute")
async def search(request: Request, q: str):
    return search_db(q)`}</code></pre>

      <h2 id="crypto">Cryptography Basics</h2>

      <pre><code>{`import hashlib
import hmac
import secrets
from cryptography.fernet import Fernet

# ── Hashing (one-way, for integrity) ─────────────────────────────────
hashlib.sha256(b"data").hexdigest()          # content integrity
hashlib.sha256(b"data").digest()             # raw bytes

# ── HMAC (authenticated hash — verify data + sender) ──────────────────
key = secrets.token_bytes(32)
message = b"important data"
signature = hmac.new(key, message, hashlib.sha256).hexdigest()

# Verify (timing-safe comparison!)
def verify_hmac(key, message, provided_sig):
    expected = hmac.new(key, message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, provided_sig)   # constant-time!

# NEVER use == for comparing hashes/tokens — timing attack vulnerability
# hmac.compare_digest() always takes the same time regardless of where mismatch is

# ── Symmetric encryption (Fernet — AES-128-CBC + HMAC) ───────────────
key = Fernet.generate_key()                  # save this securely!
f = Fernet(key)

encrypted = f.encrypt(b"secret data")
decrypted = f.decrypt(encrypted)

# ── Token generation ──────────────────────────────────────────────────
# Password reset token
reset_token = secrets.token_urlsafe(32)      # store hash in DB, send raw to user

# API key
api_key = f"sk_{secrets.token_urlsafe(32)}"  # prefix helps identify leaked keys

# OTP
otp = f"{secrets.randbelow(1_000_000):06d}"  # zero-padded 6 digits`}</code></pre>

      <h2 id="owasp">OWASP Top 10 for Python APIs</h2>

      <pre><code>{`# A1 — Broken Access Control
# ❌ Only checking authentication, not authorisation
# ✓ Check ownership/role on every resource operation
# ✓ Use Depends(require_role("admin")) on sensitive routes

# A2 — Cryptographic Failures
# ❌ MD5/SHA1 for passwords, storing plain-text secrets
# ✓ bcrypt/argon2 for passwords, env vars for secrets
# ✓ HTTPS everywhere, never log sensitive data

# A3 — Injection
# ❌ f-string SQL, shell=True with user input
# ✓ ORM or parameterised queries, subprocess list form

# A4 — Insecure Design
# ❌ No rate limiting on login, no account lockout
# ✓ Rate limit auth endpoints, implement lockout after N failures
# ✓ Log and alert on suspicious patterns

# A5 — Security Misconfiguration
# ❌ DEBUG=True in production, default credentials, verbose error messages
# ✓ Separate configs per environment, remove debug endpoints
# ✓ Return generic errors to clients, log details server-side only

# A6 — Vulnerable Components
# ❌ Outdated packages with known CVEs
# ✓ pip audit / safety check in CI, pin versions, update regularly

# A7 — Identity and Authentication Failures
# ❌ Weak passwords allowed, no MFA, long JWT expiry
# ✓ Enforce password strength, short-lived tokens, refresh token rotation

# A8 — Software and Data Integrity Failures
# ❌ Deserialising untrusted pickle data
# ✓ NEVER unpickle untrusted data — use JSON/Pydantic instead
# pickle.loads(untrusted_data)  ← arbitrary code execution!

# A9 — Security Logging Failures
# ❌ No logs, logging passwords/tokens
# ✓ Log auth events, failed attempts, permission denials
# ✓ Never log: passwords, tokens, credit cards, PII

# A10 — SSRF (Server-Side Request Forgery)
# ❌ Fetching URLs provided by users without validation
# ✓ Whitelist allowed domains, block internal IPs (169.254.x.x, 10.x, 127.x)
import ipaddress, urllib.parse

def is_safe_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
    except ValueError:
        pass   # hostname, not IP — additional DNS validation needed
    return True`}</code></pre>

      <h2 id="interview-questions">Interview Questions</h2>

      <h3>1. What is SQL injection and how do you prevent it in Python?</h3>
      <p>
        SQL injection occurs when user input is concatenated into a SQL query, allowing
        an attacker to modify the query logic. Prevention: always use parameterised
        queries (<code>cursor.execute("... WHERE id = ?", (id,))</code>) or an ORM
        (SQLAlchemy, Django ORM) which parameterises automatically. Never use f-strings,
        <code>.format()</code>, or <code>%</code> to build SQL queries.
      </p>

      <h3>2. How do you store passwords securely in Python?</h3>
      <p>
        Use <code>passlib</code> with <code>bcrypt</code> or <code>argon2</code>. These
        are slow hash functions specifically designed for passwords — they resist brute
        force by making each hash computation expensive. Never store plain text. Never use
        MD5, SHA1, or SHA256 for passwords — they are too fast. Use{" "}
        <code>pwd_context.hash(plain)</code> to store and{" "}
        <code>pwd_context.verify(plain, hash)</code> to check.
      </p>

      <h3>3. What is a JWT and how does it work?</h3>
      <p>
        JSON Web Token — a signed, base64-encoded token containing a payload (user ID,
        role, expiry). The server signs it with a secret key; clients include it in every
        request. The server verifies the signature without a database lookup. Key security
        rules: short expiry (15-60 min), store in httpOnly cookies (not localStorage),
        never put sensitive data in the payload (it is base64-encoded, not encrypted).
      </p>

      <h3>4. Why use <code>hmac.compare_digest()</code> instead of <code>==</code> for comparing tokens?</h3>
      <p>
        String equality (<code>==</code>) short-circuits — it returns as soon as it finds
        a mismatch. An attacker can measure response time to determine how many characters
        match, gradually guessing the correct value. <code>hmac.compare_digest()</code>{" "}
        always takes the same time regardless of where the mismatch is — this eliminates
        the timing attack.
      </p>

      <h3>5. What is CORS and why does it matter for APIs?</h3>
      <p>
        Cross-Origin Resource Sharing — a browser mechanism that restricts which origins
        can make requests to your API. Without proper CORS configuration, your API could
        be called by malicious websites using a victim&apos;s browser credentials.{" "}
        <code>allow_origins=["*"]</code> disables the protection. Always specify exact
        allowed origins in production.
      </p>

      <h3>6. Why should you never <code>pickle.loads()</code> untrusted data?</h3>
      <p>
        Pickle deserialisation executes arbitrary Python code — it calls{" "}
        <code>__reduce__</code> on objects, which can invoke any callable including{" "}
        <code>os.system</code>. An attacker who can control the pickled bytes achieves
        remote code execution. Use JSON (via <code>json.loads()</code>) or Pydantic to
        deserialise untrusted data — they only construct data structures.
      </p>

      <h3>7. What is SSRF?</h3>
      <p>
        Server-Side Request Forgery — an attacker tricks your server into making HTTP
        requests to internal services (AWS metadata API, Redis, internal databases) by
        providing a URL as input. Prevent by whitelisting allowed domains, validating
        URLs before fetching, and blocking requests to private/loopback IP ranges.
      </p>

      <h3>8. How do you handle secrets in a Python application?</h3>
      <p>
        Environment variables are the minimum — read with <code>os.environ["KEY"]</code>{" "}
        (fails fast on missing) and never hardcode in source. Use <code>python-dotenv</code>{" "}
        locally, environment variables in CI/CD. For production, use a secrets manager
        (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager). Never commit{" "}
        <code>.env</code> — commit <code>.env.example</code> with placeholders.
      </p>
    </div>
  );
}
