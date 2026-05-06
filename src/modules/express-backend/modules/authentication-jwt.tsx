import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const jwtAuthFlowDiagram = String.raw`sequenceDiagram
    actor C as Client
    participant S as Express Server
    participant DB as Database

    Note over C,DB: Login
    C->>S: POST /auth/login { email, password }
    S->>DB: SELECT user WHERE email = ?
    DB-->>S: user { id, email, passwordHash, role }
    S->>S: bcrypt.compare(password, passwordHash)
    S->>S: jwt.sign({ sub: userId, role }) — 15min access token
    S->>S: create refresh token — store hash in DB
    S-->>C: 200 { accessToken }\nSet-Cookie: refreshToken=...; HttpOnly; Secure

    Note over C,DB: Authenticated Request
    C->>S: GET /api/profile\nAuthorization: Bearer accessToken
    S->>S: jwt.verify(token, publicKey)
    S->>S: Extract sub, role from payload
    S->>DB: SELECT user WHERE id = sub
    DB-->>S: user profile data
    S-->>C: 200 { data: profile }`;

const refreshFlowDiagram = String.raw`sequenceDiagram
    actor C as Client
    participant S as Express Server
    participant DB as Database

    Note over C,S: Access token has expired (exp < now)
    C->>S: GET /api/data\nAuthorization: Bearer expiredToken
    S->>S: jwt.verify() — throws TokenExpiredError
    S-->>C: 401 { error: "TOKEN_EXPIRED" }

    Note over C,S: Client detects 401, initiates refresh
    C->>S: POST /auth/refresh\nCookie: refreshToken=xyz (HttpOnly)
    S->>S: Read refresh token from cookie
    S->>DB: SELECT WHERE tokenHash = hash(xyz) AND revoked = false
    DB-->>S: { userId, email, role, expiresAt }
    S->>S: Check expiresAt > now
    S->>DB: UPDATE SET revoked=true WHERE id = tokenId
    S->>DB: INSERT new refresh token record
    S->>S: jwt.sign({ sub: userId, role }) — new 15min access token
    S-->>C: 200 { accessToken }\nSet-Cookie: refreshToken=new; HttpOnly; Secure

    Note over C,S: Client retries original request with new token
    C->>S: GET /api/data\nAuthorization: Bearer newAccessToken
    S-->>C: 200 { data: ... }`;

export const toc: TocItem[] = [
  { id: "jwt-structure", title: "JWT Structure", level: 2 },
  { id: "signing-algorithms", title: "HS256 vs RS256", level: 2 },
  { id: "jwt-auth-flow", title: "JWT Auth Flow", level: 2 },
  { id: "access-refresh-tokens", title: "Access + Refresh Token Strategy", level: 2 },
  { id: "refresh-flow", title: "Refresh Token Flow", level: 2 },
  { id: "token-storage", title: "Token Storage Strategies", level: 2 },
  { id: "implementation", title: "Implementation with jsonwebtoken", level: 2 },
  { id: "token-blacklist", title: "Token Blacklisting with Redis", level: 2 },
  { id: "jwt-pitfalls", title: "JWT Pitfalls", level: 2 },
];

export default function AuthenticationJwt() {
  return (
    <div className="article-content">
      <p>
        JWT (JSON Web Token) is the dominant stateless authentication mechanism for REST APIs.
        Instead of storing session state on the server, a JWT encodes the user&apos;s identity in
        a cryptographically signed token that the client sends with every request. The server
        verifies the signature — no database lookup needed. This is the source of both JWT&apos;s
        main advantage (stateless, horizontally scalable) and its main limitation
        (tokens cannot be revoked before they expire).
      </p>

      <h2 id="jwt-structure">JWT Structure</h2>
      <p>
        A JWT is three base64url-encoded JSON objects joined by dots: <code>header.payload.signature</code>.
        All three are visible to anyone who holds the token — JWTs are NOT encrypted by default,
        only signed. Never put secrets in JWT claims.
      </p>
      <pre><code>{`// A JWT looks like this (truncated for readability)
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDFI...SflKxwRJSMeKKF2QT...

// Decoded header — algorithm and token type
{
  "alg": "RS256",  // signing algorithm
  "typ": "JWT"
}

// Decoded payload — registered + custom claims
{
  "sub": "usr_01HXYZ",    // subject: unique user identifier (registered claim)
  "iat": 1706844400,      // issued at (Unix timestamp) (registered claim)
  "exp": 1706845300,      // expires at (Unix timestamp) (registered claim)
  "jti": "tok_abc123",    // JWT ID — unique per token, used for blacklisting

  // Custom claims — application-specific
  "email": "alice@example.com",
  "role": "admin",
  "permissions": ["users:read", "users:write"]
}

// Signature — cryptographic proof the payload was not tampered with
// RS256: RSASSA-PKCS1-v1_5(SHA-256)(privateKey, base64url(header) + "." + base64url(payload))

// NEVER store sensitive data in JWT claims
// The payload is BASE64URL encoded, NOT encrypted
// Anyone with the token can decode and read the payload
// Only the signature prevents tampering`}</code></pre>

      <h2 id="signing-algorithms">HS256 vs RS256</h2>
      <pre><code>{`// HS256 — HMAC with SHA-256 (symmetric)
// Same secret is used to SIGN and VERIFY
// Problem: every service that verifies tokens needs the secret
// If one service is compromised, attacker can forge tokens

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!; // same secret everywhere

const token = jwt.sign({ sub: userId, role }, SECRET, { expiresIn: "15m" });
const payload = jwt.verify(token, SECRET); // any service with SECRET can verify

// Use HS256 for: single-service apps, internal tools, prototypes

// RS256 — RSASSA with SHA-256 (asymmetric)
// Private key signs, public key verifies
// Only the auth service has the private key
// Any service can verify using the PUBLIC key (freely distributable)
// Compromise of a verifying service cannot forge tokens

import fs from "fs";
const privateKey = fs.readFileSync("private.pem");
const publicKey = fs.readFileSync("public.pem");

// Auth service — signs with private key
const token = jwt.sign({ sub: userId, role }, privateKey, {
  algorithm: "RS256",
  expiresIn: "15m",
});

// Any service — verifies with public key
const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

// Generating RS256 keys
// openssl genrsa -out private.pem 4096
// openssl rsa -in private.pem -pubout -out public.pem

// In production: publish public keys at /.well-known/jwks.json (JWKS endpoint)
// Verifying services fetch the public key automatically and rotate on key change
// Use jsonwebtoken + jwks-rsa package for JWKS-based verification`}</code></pre>

      <h2 id="jwt-auth-flow">JWT Auth Flow</h2>
      <MermaidDiagram
        chart={jwtAuthFlowDiagram}
        title="JWT Authentication Flow"
        caption="Login issues a short-lived access token (in response body) and a long-lived refresh token (in HttpOnly cookie). Every subsequent request verifies the access token locally without a database lookup."
        minHeight={500}
      />

      <h2 id="access-refresh-tokens">Access + Refresh Token Strategy</h2>
      <p>
        A single long-lived JWT is a security liability — if stolen, it works until it expires
        (could be hours or days). The access + refresh token pattern minimizes the damage window:
      </p>
      <ul>
        <li><strong>Access token:</strong> Short-lived (5–15 minutes). Sent with every API request. Cannot be revoked (stateless). If stolen, it expires soon.</li>
        <li><strong>Refresh token:</strong> Long-lived (days to weeks). Used only to get a new access token. Stored server-side (hashed), so it CAN be revoked. Rotated on every use (refresh token rotation).</li>
      </ul>
      <pre><code>{`// Creating both tokens at login
async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await db.users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Access token — short-lived, contains claims needed for auth decisions
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    privateKey,
    { algorithm: "RS256", expiresIn: "15m" }
  );

  // Refresh token — opaque random string, stored hashed in DB
  const rawRefreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  await db.refreshTokens.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Refresh token in HttpOnly cookie (not accessible to JavaScript)
  res.cookie("refreshToken", rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/auth", // only sent to /auth/* endpoints
  });

  // Access token in response body — client stores in memory (not localStorage)
  res.json({ accessToken, expiresIn: 900 }); // expiresIn in seconds
}`}</code></pre>

      <h2 id="refresh-flow">Refresh Token Flow</h2>
      <MermaidDiagram
        chart={refreshFlowDiagram}
        title="Refresh Token Rotation Flow"
        caption="When the access token expires, the client sends the refresh token cookie to /auth/refresh. The server validates it, immediately revokes the used token, issues a new refresh token (rotation), and returns a new access token. This prevents refresh token replay attacks."
        minHeight={580}
      />

      <h2 id="token-storage">Token Storage Strategies</h2>
      <ArticleTable caption="Token storage strategies — security tradeoffs for browser clients" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Storage</th>
              <th>XSS Risk</th>
              <th>CSRF Risk</th>
              <th>Persistent</th>
              <th>Recommended</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>JS Memory (variable)</td>
              <td>Low — JS can read it, but only while injected in same execution context</td>
              <td>None — not sent automatically</td>
              <td>No — lost on tab close</td>
              <td>Yes — for access tokens</td>
            </tr>
            <tr>
              <td>localStorage</td>
              <td>High — any JS on the page can read it (XSS steals the token)</td>
              <td>None — not sent automatically</td>
              <td>Yes</td>
              <td>No — avoid for auth tokens</td>
            </tr>
            <tr>
              <td>sessionStorage</td>
              <td>High — same as localStorage, only cleared on tab close</td>
              <td>None</td>
              <td>No</td>
              <td>No</td>
            </tr>
            <tr>
              <td>HttpOnly Cookie</td>
              <td>None — JS cannot read HttpOnly cookies</td>
              <td>Medium — mitigate with SameSite=Strict + CSRF token</td>
              <td>Controlled by Max-Age</td>
              <td>Yes — for refresh tokens</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="implementation">Implementation with jsonwebtoken</h2>
      <pre><code>{`// authenticate.middleware.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import fs from "fs";

const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH!);

interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Bearer token required");
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    }) as TokenPayload;

    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expired"); // client should refresh
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid token");
    }
    next(err); // unexpected error
  }
}

// Optional: attach jti to payload and check blacklist
export async function authenticateWithBlacklist(req: Request, res: Response, next: NextFunction) {
  // ... verify signature ...
  const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as TokenPayload;

  // Check if token has been revoked (e.g., user logged out)
  const isBlacklisted = await redis.exists(\`blacklist:\${payload.jti}\`);
  if (isBlacklisted) {
    throw new UnauthorizedError("Token has been revoked");
  }

  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}`}</code></pre>

      <h2 id="token-blacklist">Token Blacklisting with Redis</h2>
      <pre><code>{`// When a user logs out, blacklist their current access token
// so it cannot be reused for its remaining TTL
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// logout endpoint
async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    const payload = jwt.decode(token) as TokenPayload;
    if (payload?.jti && payload?.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        // Store jti in Redis with TTL equal to remaining token lifetime
        // After that, the token would have expired anyway
        await redis.setEx(\`blacklist:\${payload.jti}\`, ttl, "1");
      }
    }
  }

  // Clear refresh token cookie
  res.clearCookie("refreshToken", { path: "/auth" });

  // Revoke refresh token in DB
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await db.refreshTokens.updateMany({
      where: { tokenHash: hash },
      data: { revoked: true },
    });
  }

  res.sendStatus(204);
}

// Trade-off: blacklisting adds state to an otherwise stateless system
// For most apps: accept the ~15 minute window instead of adding Redis
// For high-security apps (banking, medical): always blacklist on logout`}</code></pre>

      <h2 id="jwt-pitfalls">JWT Pitfalls</h2>
      <pre><code>{`// Pitfall 1: The "none" algorithm attack
// Some old libraries accept { "alg": "none" } — unsigned token
// An attacker strips the signature and sets alg to "none"
// FIX: always explicitly specify allowed algorithms
jwt.verify(token, publicKey, { algorithms: ["RS256"] }); // ✓
jwt.verify(token, publicKey); // ✗ — allows any algorithm the library supports

// Pitfall 2: Missing expiry
const token = jwt.sign({ sub: userId }, secret);          // ✗ — never expires!
const token = jwt.sign({ sub: userId }, secret, { expiresIn: "15m" }); // ✓
// jwt.verify automatically checks exp claim — throws TokenExpiredError

// Pitfall 3: Decoding instead of verifying
const payload = jwt.decode(token); // ✗ — no signature check, trusts anything
const payload = jwt.verify(token, publicKey); // ✓ — cryptographic verification

// Pitfall 4: Storing too much in the payload
// JWT payload is sent with EVERY request — keep it small
const BAD_TOKEN = jwt.sign({
  sub: userId,
  user: { ...fullUserObject }, // ✗ — all user data, permissions, etc
  permissions: allUserPermissions, // ✗ — can be 10kb+ for complex RBAC
}, secret);

const GOOD_TOKEN = jwt.sign({
  sub: userId,
  role: user.role, // ✓ — just what you need for auth decisions
}, secret);

// Pitfall 5: Clock skew
// Servers may have slightly different clocks — a token that expires at t
// may fail verification on a server 5 seconds behind
jwt.verify(token, key, { clockTolerance: 30 }); // allow 30 second clock skew

// Pitfall 6: Not rotating refresh tokens
// If a refresh token leaks, an attacker can keep getting new access tokens indefinitely
// Refresh token rotation: revoke old refresh token on every use, issue a new one
// If the old token is used again after rotation → detect replay attack, revoke all tokens`}</code></pre>
    </div>
  );
}
