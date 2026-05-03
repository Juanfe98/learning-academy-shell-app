import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const authFlowDiagram = String.raw`sequenceDiagram
    autonumber
    actor B as Browser
    participant API as API Server
    participant COG as Cognito User Pool
    participant DB as DynamoDB

    Note over B,DB: Login flow
    B->>API: POST /auth/login with email and password
    API->>COG: Authenticate user
    COG-->>API: idToken, accessToken, refreshToken
    API-->>B: 200 tokens response
    Note over B,API: Store access token in memory and refresh token in an HttpOnly cookie

    Note over B,DB: Authenticated API request
    B->>API: GET /api/cvs with Bearer accessToken
    API->>API: Verify JWT signature using JWKS
    API->>API: Extract userId and role claims
    API->>DB: Query CV records
    DB-->>API: Matching CV items
    API-->>B: 200 cvs payload`;

export const toc: TocItem[] = [
  { id: "authn-vs-authz", title: "Authentication vs Authorization", level: 2 },
  { id: "session-cookies", title: "Sessions and Cookies", level: 2 },
  { id: "jwt", title: "JWT: Structure, Signing, Tradeoffs", level: 2 },
  { id: "oauth2", title: "OAuth 2.0: Authorization Code Flow", level: 2 },
  { id: "oidc", title: "OIDC: Identity on Top of OAuth2", level: 2 },
  { id: "tokens", title: "Access Tokens vs Refresh Tokens", level: 2 },
  { id: "rbac-abac", title: "RBAC vs ABAC", level: 2 },
  { id: "api-keys", title: "API Keys", level: 2 },
  { id: "service-to-service", title: "Service-to-Service Auth with IAM Roles", level: 2 },
  { id: "cognito", title: "AWS Cognito: User Pools vs Identity Pools", level: 2 },
  { id: "login-flow", title: "Login and API Auth Flows", level: 2 },
  { id: "comparison-table", title: "Session vs JWT Comparison", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "common-mistakes", title: "Common Security Mistakes", level: 2 },
  { id: "interview-questions", title: "Interview Questions", level: 2 },
];

export default function AuthArchitecture() {
  return (
    <div className="article-content">
      <p>
        Authentication and authorization are among the most critical and most misunderstood parts of
        a production system. Get them wrong and you have a security vulnerability. Over-engineer them
        and you have an unmaintainable mess. This module covers the real-world auth architecture that
        senior engineers design: JWTs, OAuth 2.0, RBAC, service-to-service auth with IAM roles, and
        AWS Cognito.
      </p>

      <h2 id="authn-vs-authz">Authentication vs Authorization</h2>
      <p>
        These are distinct concepts that are frequently conflated:
      </p>
      <ul>
        <li>
          <strong>Authentication (AuthN):</strong> Who are you? The process of verifying identity.
          You enter your username and password; the server confirms you are who you claim to be.
          Result: a verified identity.
        </li>
        <li>
          <strong>Authorization (AuthZ):</strong> What can you do? Given a verified identity, what
          actions are permitted? A verified user might not have permission to delete resources or
          access admin endpoints.
          Result: an access decision (allow/deny).
        </li>
      </ul>
      <p>
        A request fails auth in two different ways: 401 Unauthorized means not authenticated (prove
        who you are first). 403 Forbidden means authenticated but not authorized (we know who you
        are, but you cannot do this).
      </p>

      <h2 id="session-cookies">Sessions and Cookies</h2>
      <p>
        The classic web auth model: on successful login, the server creates a session record
        (stored in database or Redis), generates a unique session ID, and sends it to the browser
        as a cookie.
      </p>
      <pre><code>{`// Session auth flow
// 1. Login
POST /auth/login
Body: { email, password }
→ Server verifies credentials
→ Creates session: sessions.set(sessionId, { userId, expiresAt, ... })
→ Response: Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict

// 2. Subsequent requests
GET /api/profile
Cookie: session=abc123
→ Server looks up session: sessions.get('abc123') → { userId: 'alice', ... }
→ Loads user permissions
→ Returns profile

// Cookie attributes explained
HttpOnly     → JavaScript cannot read this cookie (XSS protection)
Secure       → Only sent over HTTPS
SameSite=Strict → Not sent with cross-origin requests (CSRF protection)
Path=/       → Sent with all requests to this domain
Max-Age=3600 → Cookie expires in 1 hour

// Session storage options
// In-memory (single server only):
const sessions = new Map();  // breaks with horizontal scaling

// Redis (correct for multi-instance):
await redis.setEx(\`session:\${sessionId}\`, 3600, JSON.stringify(session));`}</code></pre>

      <h2 id="jwt">JWT: Structure, Signing, Tradeoffs</h2>
      <p>
        JWT (JSON Web Token) stores the auth state in the token itself, eliminating the need for
        server-side session storage. The token is cryptographically signed so its contents cannot
        be tampered with.
      </p>
      <pre><code>{`// JWT structure: header.payload.signature (all base64url-encoded)
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9    // header
.eyJzdWIiOiJ1c2VyLWFsaWNlIiwicm9sZSI6InVzZXIiLCJleHAiOjE3MDY4NDgwMDB9  // payload
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  // signature

// Decoded header
{ "alg": "RS256", "typ": "JWT" }

// Decoded payload
{
  "sub": "user-alice",       // subject: user ID
  "email": "alice@...",      // custom claims
  "role": "user",
  "iat": 1706844400,         // issued at (Unix timestamp)
  "exp": 1706848000          // expires at (Unix timestamp)
}

// Signing algorithms
// HS256: symmetric (same secret signs and verifies)
//   Simple but: secret must be shared with every service that verifies tokens
// RS256: asymmetric (private key signs, public key verifies)
//   Recommended for production: only auth service has private key
//   Any service can verify tokens using the public key from JWKS endpoint

// Creating a JWT (Node.js)
const token = jwt.sign(
  { sub: user.id, email: user.email, role: user.role },
  privateKey,  // or process.env.JWT_SECRET for HS256
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Verifying a JWT
const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
// payload.sub is trusted — cryptographic proof of identity
// payload.exp checked automatically (throws if expired)

// JWT disadvantages
// 1. Cannot be revoked before expiry (no server-side state to delete)
// Solution: short TTL (15 min access tokens) + refresh tokens
// Solution: token blacklist in Redis (adds state, reduces stateless benefit)
// 2. Size: JWTs are larger than session IDs (bandwidth overhead)
// 3. Claims embedded: role changes take up to TTL to propagate`}</code></pre>

      <h2 id="oauth2">OAuth 2.0: Authorization Code Flow</h2>
      <p>
        OAuth 2.0 is an authorization framework for allowing one application to act on behalf of
        a user in another application, without sharing the user&apos;s credentials.
      </p>
      <pre>{`
Authorization Code Flow (used by Google Login, GitHub Login, etc.):

User visits your app → clicks "Login with Google"

1. Your app redirects to Google:
   GET https://accounts.google.com/oauth/authorize
   ?client_id=YOUR_CLIENT_ID
   &redirect_uri=https://yourapp.com/callback
   &response_type=code
   &scope=openid email profile
   &state=random-csrf-token

2. Google authenticates the user and shows consent screen
   "YourApp wants to access your profile"

3. User approves → Google redirects back:
   GET https://yourapp.com/callback
   ?code=AUTH_CODE_XYZ
   &state=random-csrf-token

4. Your server exchanges the code for tokens:
   POST https://accounts.google.com/oauth/token
   Body: { code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }
   → Response: { access_token, id_token, refresh_token, expires_in }

5. Your server verifies the state parameter (CSRF protection)
   Uses access_token to call Google API if needed
   Extracts user identity from id_token (JWT)
   Creates your own session or JWT for the user

Key security points:
- Code is single-use and short-lived (10 minutes)
- client_secret never goes to the browser (server-to-server exchange)
- state parameter prevents CSRF (forge-request-on-behalf-of-user attack)
- PKCE (Proof Key for Code Exchange) for mobile apps instead of client_secret
`}</pre>

      <h2 id="oidc">OIDC: Identity on Top of OAuth2</h2>
      <p>
        OAuth 2.0 is an authorization protocol (grants access to resources). OpenID Connect (OIDC)
        extends OAuth 2.0 to be an authentication protocol (verifies identity). OIDC adds:
      </p>
      <ul>
        <li><strong>ID Token:</strong> A JWT containing the user&apos;s identity (sub, email, name, etc.). Standard claims defined by the spec.</li>
        <li><strong>UserInfo endpoint:</strong> Fetch additional user claims with the access token.</li>
        <li><strong>Discovery document:</strong> <code>/.well-known/openid-configuration</code> &mdash; JSON describing the provider&apos;s endpoints and capabilities.</li>
      </ul>

      <h2 id="tokens">Access Tokens vs Refresh Tokens</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Access Token</th>
            <th>Refresh Token</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>TTL</td>
            <td>Short: 5&ndash;60 minutes</td>
            <td>Long: hours to months</td>
          </tr>
          <tr>
            <td>Storage</td>
            <td>Memory (JavaScript variable)</td>
            <td>HttpOnly cookie or secure storage</td>
          </tr>
          <tr>
            <td>Purpose</td>
            <td>Sent with every API request in Authorization header</td>
            <td>Used to get a new access token when current one expires</td>
          </tr>
          <tr>
            <td>Revocable</td>
            <td>Not easily (wait for expiry)</td>
            <td>Yes (blacklist in database)</td>
          </tr>
          <tr>
            <td>XSS risk</td>
            <td>In memory = not accessible from JS if stored in memory</td>
            <td>HttpOnly cookie = not accessible from JS</td>
          </tr>
        </tbody>
      </table>
      <pre><code>{`// Token refresh flow
// 1. API request with expired access token → 401
// 2. Client detects 401, calls refresh endpoint
// 3. Server validates refresh token, issues new access token (and optionally rotates refresh token)

app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;  // HttpOnly cookie

  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  // Verify refresh token (check DB blacklist, verify signature)
  const session = await db.refreshTokens.findOne({ token: refreshToken, revoked: false });
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Issue new access token
  const accessToken = jwt.sign(
    { sub: session.userId, email: session.email, role: session.role },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );

  // Rotate refresh token (security best practice)
  await db.refreshTokens.update(session.id, { revoked: true });
  const newRefreshToken = await createRefreshToken(session.userId);

  res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
  res.json({ accessToken });
});`}</code></pre>

      <h2 id="rbac-abac">RBAC vs ABAC</h2>
      <p>
        <strong>RBAC (Role-Based Access Control):</strong> Users are assigned roles (admin, editor,
        viewer). Permissions are assigned to roles. Simple to understand and implement. Works well
        for most applications.
      </p>
      <p>
        <strong>ABAC (Attribute-Based Access Control):</strong> Access decisions are based on
        attributes of the user, resource, and environment. More flexible but more complex.
        Example: &quot;Allow access if user.department == resource.department AND
        environment.time is weekday business hours.&quot;
      </p>
      <pre><code>{`// RBAC: role-based middleware
const permissions = {
  admin:  ['read', 'write', 'delete', 'admin'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

function authorize(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = permissions[req.user.role] || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.delete('/api/cvs/:id', authenticate, authorize('delete'), async (req, res) => {
  // Only admins and users with 'delete' permission reach here
});

// Resource-level check: user can only delete THEIR OWN cvs
app.delete('/api/cvs/:id', authenticate, async (req, res) => {
  const cv = await db.cvs.findById(req.params.id);
  if (cv.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot delete another user\\'s CV' });
  }
  await db.cvs.delete(req.params.id);
});`}</code></pre>

      <h2 id="api-keys">API Keys</h2>
      <p>
        API keys are simple shared secrets for authenticating machine-to-machine API access. They
        are appropriate for: B2B integrations where a company authenticates as itself (not as a user),
        webhook endpoint authentication, SDK access.
      </p>
      <pre><code>{`// Generating and storing API keys
// Never store raw API keys — store hash
const rawKey = \`sk_live_\${crypto.randomBytes(32).toString('hex')}\`;
const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

await db.apiKeys.create({
  keyPrefix: rawKey.substring(0, 10),   // for identification: "sk_live_ab"
  keyHash: hashedKey,
  name: "Production API Key",
  userId: req.user.id,
  createdAt: new Date()
});

// Return raw key ONCE to user (cannot be retrieved later)
res.json({ apiKey: rawKey, warning: "Store this key safely — it will not be shown again" });

// Middleware: verify API key
app.use('/api/v1', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyRecord = await db.apiKeys.findOne({ keyHash: hashedKey, revoked: false });
  if (!keyRecord) return res.status(401).json({ error: 'Invalid API key' });

  req.apiKeyUser = await db.users.findById(keyRecord.userId);
  next();
});`}</code></pre>

      <h2 id="service-to-service">Service-to-Service Auth with IAM Roles</h2>
      <p>
        When your ECS task needs to call AWS APIs (S3, DynamoDB, SQS), <strong>never hardcode
        credentials in code or environment variables</strong>. Instead, attach an IAM role to
        the ECS task. AWS automatically provides temporary credentials to the task, which the
        SDK retrieves transparently.
      </p>
      <pre><code>{`// WRONG: hardcoded credentials
const s3 = new S3Client({
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',   // ← security nightmare
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG'  // ← never do this
  }
});

// RIGHT: IAM role (credentials are automatically injected by ECS)
const s3 = new S3Client({ region: 'us-east-1' });
// SDK automatically gets credentials from EC2 metadata endpoint
// Credentials are temporary (rotate every ~15 minutes)
// No credentials in code, no credentials in environment variables

// ECS task role: define what the task CAN do
// task-role.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-bucket/uploads/*"
  }, {
    "Effect": "Allow",
    "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
    "Resource": "arn:aws:dynamodb:us-east-1:123:table/cvs"
  }]
}`}</code></pre>

      <h2 id="cognito">AWS Cognito: User Pools vs Identity Pools</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>User Pool</th>
            <th>Identity Pool</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Purpose</td>
            <td>User directory + authentication</td>
            <td>Federated identity → AWS credentials</td>
          </tr>
          <tr>
            <td>Provides</td>
            <td>JWT tokens (ID token, access token, refresh token)</td>
            <td>Temporary AWS IAM credentials</td>
          </tr>
          <tr>
            <td>Use case</td>
            <td>Sign-up/sign-in for your application</td>
            <td>Allow users to directly call AWS services (S3, DynamoDB)</td>
          </tr>
          <tr>
            <td>Features</td>
            <td>MFA, password policies, email verification, social login (Google, Facebook)</td>
            <td>Assumes IAM role based on user pool group or custom rules</td>
          </tr>
          <tr>
            <td>Example</td>
            <td>User logs in → gets JWT → sends JWT with API requests</td>
            <td>User logs in → gets AWS credentials → uploads directly to S3</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>For most web applications:</strong> Use a User Pool for authentication. Your API
        validates the Cognito JWT. User Pool handles password storage, MFA, social login, and
        email verification for you. Identity Pools are for when users need to call AWS services
        directly (less common).
      </p>

      <h2 id="login-flow">Login and API Auth Flows</h2>
      <MermaidDiagram
        chart={authFlowDiagram}
        title="JWT + Cognito Request Path"
        caption="The login step issues tokens, and every later API request becomes a token verification plus an authorization decision before the data lookup."
        minHeight={560}
      />

      <h2 id="comparison-table">Session vs JWT Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Server-Side Session</th>
            <th>JWT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Storage</td>
            <td>Server-side (Redis/DB)</td>
            <td>Client-side (cookie or memory)</td>
          </tr>
          <tr>
            <td>Revocation</td>
            <td>Delete session from Redis (immediate)</td>
            <td>Wait for expiry (or blacklist, adding state)</td>
          </tr>
          <tr>
            <td>Size</td>
            <td>Small cookie (session ID only)</td>
            <td>Larger (claims embedded)</td>
          </tr>
          <tr>
            <td>Stateless</td>
            <td>No (requires Redis)</td>
            <td>Yes (verified without external call)</td>
          </tr>
          <tr>
            <td>Scaling</td>
            <td>Requires shared session store</td>
            <td>Works across any server (stateless)</td>
          </tr>
          <tr>
            <td>Security</td>
            <td>Session ID in cookie; rotate on sensitive actions</td>
            <td>Signature prevents tampering; short expiry limits damage</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>Traditional web apps, need immediate revocation</td>
            <td>APIs, microservices, mobile apps, third-party auth</td>
          </tr>
        </tbody>
      </table>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain an Auth Architecture"
        intro="Strong auth answers separate identity, tokens, transport, and authorization decisions instead of mixing them into one blurry security story."
        steps={[
          "Start by separating authentication from authorization so the interviewer hears a clean mental model immediately.",
          "Choose the session model deliberately: server-side session when immediate revocation is critical, JWT when stateless verification across services matters more.",
          "Explain token storage and transport clearly, especially the difference between in-memory access tokens and HttpOnly refresh cookies for browser apps.",
          "Describe how the API verifies identity on every request and where roles or permissions are enforced after identity is established.",
          "Name one concrete failure mode such as JWT theft via XSS, over-privileged IAM roles, or unverifiable refresh token rotation and how you mitigate it.",
        ]}
      />

      <h2 id="common-mistakes">Common Security Mistakes</h2>
      <ul>
        <li>
          <strong>Storing JWT in localStorage:</strong> XSS attacks can steal JWTs from localStorage.
          Store access tokens in memory (JavaScript variable) and refresh tokens in HttpOnly cookies.
        </li>
        <li>
          <strong>Using HS256 for JWTs when multiple services verify tokens:</strong> HS256 requires
          sharing the secret key with every service. If any service is compromised, the secret is
          exposed. Use RS256: only the auth service has the private key; other services use the
          public key.
        </li>
        <li>
          <strong>Long-lived access tokens without refresh tokens:</strong> A 24-hour access token
          cannot be revoked if the user&apos;s permissions change or they log out. Use 15-minute
          access tokens with refresh token rotation.
        </li>
        <li>
          <strong>Not verifying JWT signature:</strong> Decoding a JWT without verifying the
          signature trusts the payload blindly. Anyone can construct a JWT claiming admin role.
          Always verify before trusting claims.
        </li>
        <li>
          <strong>Credentials in code or environment variables for AWS service calls:</strong>
          Use IAM roles for ECS tasks, Lambda, and EC2 instances. AWS automatically provides
          temporary credentials. Never hardcode AWS credentials.
        </li>
        <li>
          <strong>Returning 401 when authorization fails:</strong> If the user is authenticated
          but not authorized, return 403 Forbidden. Returning 401 tells them to authenticate
          again, which will not help &mdash; the problem is authorization, not authentication.
        </li>
      </ul>

      <h2 id="interview-questions">Interview Questions</h2>

      <p><strong>Q: What is the difference between a JWT and a session cookie?</strong></p>
      <p>
        A session cookie contains a session ID. The server stores session data externally (Redis,
        database) keyed by this ID. JWTs are self-contained: all auth data is encoded in the token
        itself, cryptographically signed. Sessions require a server-side store but allow immediate
        revocation. JWTs are stateless and work across services without shared state, but cannot
        be easily revoked before expiry. Use sessions when you need immediate revocation. Use JWTs
        for APIs, microservices, and stateless authentication.
      </p>

      <p><strong>Q: How does OAuth 2.0 work? Walk me through the authorization code flow.</strong></p>
      <p>
        The user clicks &quot;Login with Google.&quot; Your app redirects to Google with your
        client_id, redirect_uri, and a random state parameter. Google authenticates the user and
        shows a consent screen. On approval, Google redirects back with a short-lived authorization
        code. Your server (not the browser) exchanges the code for tokens by calling Google with
        the code and your client_secret. Google returns access tokens and an ID token. You verify
        the state parameter (CSRF prevention) and extract user identity from the ID token. The
        client_secret never touches the browser, and the authorization code is single-use.
      </p>

      <p><strong>Q: Why should you use RS256 instead of HS256 for JWTs?</strong></p>
      <p>
        HS256 uses a shared secret to both sign and verify tokens. Every service that needs to
        verify tokens must have the secret, creating multiple places where it could be compromised.
        RS256 uses asymmetric keys: the auth service signs with its private key (kept secret),
        other services verify with the public key (freely shareable). If a service is compromised,
        the attacker can verify tokens but cannot create new ones. RS256 also allows publishing
        public keys via a JWKS endpoint for automatic key discovery and rotation.
      </p>

      <p><strong>Q: How does service-to-service authentication work in AWS?</strong></p>
      <p>
        AWS services (ECS tasks, Lambda functions, EC2 instances) should use IAM roles rather than
        static credentials. You attach an IAM role to the resource with the minimum required
        permissions. AWS provides temporary, automatically-rotating credentials via the instance
        metadata service. The AWS SDK retrieves these automatically &mdash; no credential management
        in application code. This follows the principle of least privilege and eliminates the risk
        of credential leaks.
      </p>
    </div>
  );
}
