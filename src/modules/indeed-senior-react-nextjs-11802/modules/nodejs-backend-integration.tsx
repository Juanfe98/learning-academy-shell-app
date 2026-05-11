import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bffPatternDiagram = String.raw`flowchart TD
    CLIENT["Browser (React Client Components)"]
    RH["Next.js Route Handler\n/api/personalized-content"]
    CS["Contentstack CDN\n(CMS content)"]
    NB["Node.js Backend API\n(user account data)"]
    REDIS["Redis Cache\n(5-min TTL)"]

    CLIENT --> RH
    RH -->|"parallel"| CS
    RH -->|"parallel"| NB
    RH --> REDIS
    CS --> RH
    NB --> RH
    RH -->|"aggregated response"| CLIENT`;

const authFlowDiagram = String.raw`sequenceDiagram
    participant BR as Browser
    participant NX as Next.js Route Handler
    participant NB as Node.js Backend

    BR->>NX: GET /api/user/saved-articles\nCookie: session=JWT...
    NX->>NX: Verify JWT\n(server-side, key never leaves server)
    NX->>NB: GET /internal/user/123/saved\nX-Internal-Auth: internal-service-token
    NB->>NB: Trusts internal auth header\n(not exposed externally)
    NB-->>NX: User's saved article UIDs
    NX->>NX: Fetch CMS entries for those UIDs
    NX-->>BR: Aggregated response`;

export const toc: TocItem[] = [
  { id: "bff-pattern", title: "BFF Pattern in Next.js", level: 2 },
  { id: "consuming-express-apis", title: "Consuming Node.js Backend APIs", level: 2 },
  { id: "api-key-security", title: "API Key Security: Server-Side Only", level: 2 },
  { id: "authentication-flow", title: "Authentication Between Next.js and Node.js", level: 2 },
  { id: "request-proxying", title: "Request Proxying for CORS", level: 3 },
  { id: "koa-vs-express", title: "Koa vs Express Differences", level: 2 },
  { id: "where-to-place", title: "Where to Place API Calls", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function NodejsBackendIntegration() {
  return (
    <div className="article-content">
      <p>
        The Indeed Help Center is not a pure CMS frontend — it integrates with internal Node.js
        backend services for user accounts, saved articles, personalized recommendations, and
        feedback submission. This module covers the BFF pattern (Backend for Frontend), secure
        API integration from Next.js Server Components and Route Handlers, and the authentication
        flow between Next.js and Node.js services.
      </p>

      <h2 id="bff-pattern">BFF Pattern in Next.js</h2>
      <MermaidDiagram
        chart={bffPatternDiagram}
        title="BFF Pattern: Next.js Route Handler Aggregates Multiple Services"
        caption="The Route Handler is the BFF — it aggregates Contentstack and the Node.js backend into one response. The client makes one request instead of two, and sensitive API keys never leave the server."
        minHeight={420}
      />

      <pre>
        <code>{`// src/app/api/personalized-content/route.ts — BFF Route Handler
// Aggregates: CMS article data + user personalization from Node.js backend
// Caches the combined response for 5 minutes in Redis

import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { getArticlesByUids } from "@/lib/contentstack";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = \`personalized:\${userId}\`;
  const redis = getRedisClient();

  // Check cache first — 5 minute TTL for personalized content
  const cached = await redis.get(cacheKey);
  if (cached) {
    return Response.json(JSON.parse(cached), {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    // Fetch from both sources in parallel — don't waterfall
    const [personalizationData, featuredArticle] = await Promise.allSettled([
      // Node.js backend: user's recommendation history
      fetch(\`\${process.env.INTERNAL_API_URL}/users/\${userId}/recommendations\`, {
        headers: {
          // Internal service auth — never exposed to the client
          "X-Internal-Auth": process.env.INTERNAL_SERVICE_TOKEN!,
        },
        signal: AbortSignal.timeout(2000), // 2s timeout — don't let slow backend block response
      }).then((r) => r.json()),

      // Contentstack: today's featured article
      getArticlesByUids({ tag: "featured", limit: 1 }),
    ]);

    // Handle partial failures gracefully
    const recommendations =
      personalizationData.status === "fulfilled"
        ? personalizationData.value
        : { articleUids: [] }; // fall back to no personalization

    const featured =
      featuredArticle.status === "fulfilled" ? featuredArticle.value : null;

    const response = { recommendations, featured };

    // Cache the successful response
    await redis.setex(cacheKey, 300, JSON.stringify(response)); // 5 minutes

    return Response.json(response, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("BFF error:", error);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}`}</code>
      </pre>

      <h2 id="consuming-express-apis">Consuming Node.js Backend APIs</h2>

      <pre>
        <code>{`// Fetching from Node.js backend in a Server Component
// Key rules:
// 1. Use from Server Components or Route Handlers — never from client components
// 2. Always set a timeout — never let a slow backend block Next.js rendering
// 3. Handle errors gracefully — degrade, don't crash

async function getUserSavedArticles(userId: string) {
  try {
    const response = await fetch(
      \`\${process.env.INTERNAL_API_URL}/users/\${userId}/saved-articles\`,
      {
        headers: {
          "X-Internal-Auth": process.env.INTERNAL_SERVICE_TOKEN!,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
        // Do NOT cache user-specific data
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) return []; // user has no saved articles
      throw new Error(\`Backend API error: \${response.status}\`);
    }

    return response.json() as Promise<SavedArticle[]>;
  } catch (error) {
    // Log and degrade — never crash the page over a non-critical feature
    console.error("Failed to fetch saved articles:", error);
    return [];
  }
}

// Retry logic for critical data (non-idempotent — use carefully)
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError!;
}`}</code>
      </pre>

      <h2 id="api-key-security">API Key Security: Server-Side Only</h2>

      <pre>
        <code>{`// The golden rule: secrets never touch the client bundle

// WRONG — this key will be bundled into the client JavaScript
const api = fetch("https://internal.indeed.com/api", {
  headers: { "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY }, // ❌ NEVER
});

// RIGHT — keep secrets in server-only code
// Environment variables WITHOUT NEXT_PUBLIC_ prefix are server-only
const api = fetch("https://internal.indeed.com/api", {
  headers: { "X-API-Key": process.env.INTERNAL_API_KEY }, // ✓ server-only
});

// How to make TypeScript enforce server-only imports:
// Add 'server-only' package import at the top of files that must not be bundled to client
import "server-only"; // This package throws at bundle time if imported from a client component

// src/lib/internal-api.ts
import "server-only";

export async function getInternalUserData(userId: string) {
  // Safe — this file cannot be accidentally imported in a client component
  return fetch(\`\${process.env.INTERNAL_API_URL}/users/\${userId}\`, {
    headers: { "X-Internal-Auth": process.env.INTERNAL_SERVICE_TOKEN! },
  }).then((r) => r.json());
}

// What goes in NEXT_PUBLIC_ vs server-only:
// NEXT_PUBLIC_: Contentstack DELIVERY token (read-only, not a secret)
//               CDN domain names, feature flag endpoints
// Server-only:  Contentstack MANAGEMENT token, internal API keys, JWT secrets,
//               database connection strings, service-to-service auth tokens`}</code>
      </pre>

      <h2 id="authentication-flow">Authentication Between Next.js and Node.js</h2>
      <MermaidDiagram
        chart={authFlowDiagram}
        title="Authentication Flow: Next.js → Node.js Backend"
        caption="Next.js verifies the user's JWT before forwarding the request to the backend. The backend trusts an internal service token, not the user's JWT — internal communication stays inside the service boundary."
        minHeight={440}
      />

      <pre>
        <code>{`// Next.js Route Handler verifying JWT and forwarding to Node.js backend

import { NextRequest } from "next/server";
import { jwtVerify } from "jose"; // lightweight JWT library for Edge/Node

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyUserSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
    return payload as { userId: string; email: string; exp: number };
  } catch {
    throw new Response("Invalid session", { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  // Verify user session — throws Response if invalid
  const user = await verifyUserSession(request);

  // Forward to internal backend with service-level auth (not user JWT)
  const response = await fetch(
    \`\${process.env.INTERNAL_API_URL}/users/\${user.userId}/account\`,
    {
      headers: {
        // Internal auth — backend trusts this, not the user's session token
        "X-Internal-Auth": process.env.INTERNAL_SERVICE_TOKEN!,
        "X-User-ID": user.userId,         // Backend knows who the user is
        "X-User-Email": user.email,       // Without exposing their JWT
      },
    }
  );

  if (!response.ok) {
    return Response.json({ error: "Failed to load account" }, { status: response.status });
  }

  const accountData = await response.json();
  return Response.json(accountData);
}`}</code>
      </pre>

      <h3 id="request-proxying">Request Proxying for CORS</h3>

      <pre>
        <code>{`// Some backend APIs are CORS-restricted — only accept requests from allowed origins
// Solution: proxy through a Next.js Route Handler, which makes server-to-server calls

// src/app/api/submit-feedback/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate input before proxying
  if (!body.articleUid || !body.rating) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Server-to-server call — no CORS restrictions
  const backendResponse = await fetch(
    \`\${process.env.INTERNAL_API_URL}/help-center/feedback\`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": process.env.INTERNAL_SERVICE_TOKEN!,
      },
      body: JSON.stringify({
        articleUid: body.articleUid,
        rating: body.rating,
        comment: body.comment,
        userAgent: request.headers.get("user-agent"),
      }),
    }
  );

  if (!backendResponse.ok) {
    return Response.json({ error: "Failed to submit feedback" }, { status: 500 });
  }

  return Response.json({ success: true });
}`}</code>
      </pre>

      <h2 id="koa-vs-express">Koa vs Express Differences</h2>
      <p>
        The Indeed backend may use Koa (common in companies that moved past Express). The key
        differences you need to know to read and contribute to the backend codebase:
      </p>

      <pre>
        <code>{`// Express: callback-based middleware, req/res objects
// app.use((req, res, next) => { ... })
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (error) {
    next(error); // pass to error handler
  }
});

// Koa: async middleware, single ctx object, no next() for errors
// app.use(async (ctx, next) => { await next(); ... })
router.get("/users/:id", async (ctx) => {
  const user = await User.findById(ctx.params.id);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: "Not found" };
    return; // just return — no res.json() needed
  }

  ctx.body = user; // Koa serializes to JSON automatically
});

// Key Koa concepts to know:
// ctx.request — incoming request (headers, body, params)
// ctx.response — outgoing response
// ctx.params — URL parameters
// ctx.query — query string parameters
// ctx.body — set to return a response (replaces res.json())
// ctx.status — set HTTP status (replaces res.status())
// ctx.state — request-scoped state (like res.locals in Express)

// Koa error handling — unlike Express's (err, req, res, next) pattern:
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});`}</code>
      </pre>

      <h2 id="where-to-place">Where to Place API Calls</h2>

      <ArticleTable caption="The placement of an API call determines security, caching, and streaming behavior." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Security</th>
              <th>Caching</th>
              <th>Streaming</th>
              <th>When to Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Server Component (direct fetch)</strong></td>
              <td>Excellent — keys never reach client</td>
              <td>Next.js fetch cache, ISR, tags</td>
              <td>Yes — Suspense streaming</td>
              <td>Article content, category listings — public, cacheable CMS data</td>
            </tr>
            <tr>
              <td><strong>Route Handler (API route)</strong></td>
              <td>Excellent — server-side only</td>
              <td>Manual — Redis, headers, or none</td>
              <td>No (unless using streaming response)</td>
              <td>User-specific data, form submissions, BFF aggregation</td>
            </tr>
            <tr>
              <td><strong>Client Component (fetch/Apollo)</strong></td>
              <td>Poor — call must go to a public endpoint</td>
              <td>Browser cache, Apollo InMemoryCache</td>
              <td>No</td>
              <td>Search results, user-triggered queries, real-time widgets</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you integrate a Next.js frontend with an existing Node.js backend?'"
        intro="The key insight interviewers want: you understand that Next.js is not just a frontend — Route Handlers can act as a backend layer that keeps sensitive operations server-side."
        steps={[
          "Start with the architecture decision: the integration point matters. I use Server Components for public, cacheable data that doesn't need user context. I use Route Handlers (the BFF pattern) when I need to: aggregate multiple services, keep API keys server-side, authenticate the user before forwarding to the backend, or proxy CORS-restricted APIs.",
          "Describe the auth flow: the browser sends a session cookie. The Route Handler verifies the JWT using a server-only secret. Once verified, it makes a server-to-server call to the Node.js backend using a separate internal service token. The user's JWT never reaches the internal backend directly — the Route Handler acts as a trusted intermediary.",
          "Address API key security: I never put internal API keys or service tokens in NEXT_PUBLIC_ environment variables. Anything starting with NEXT_PUBLIC_ is embedded in the client JavaScript bundle. Internal service tokens go in server-only env vars and are only accessed from Route Handlers and Server Components.",
          "Mention error handling: I always set a timeout on backend calls using AbortSignal.timeout(). Internal backends can be slow, and I don't want a slow user account service to block the entire article page from rendering. Non-critical features degrade gracefully; I log errors to Sentry.",
          "Close with Koa awareness: if the backend uses Koa instead of Express, the middleware model is async/await with a single ctx object instead of req/res. The patterns are the same — routing, middleware, error handling — just different syntax. I can contribute to either.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design a Route Handler that Aggregates CMS and Backend Data"
        scenario={
          <span>
            The Help Center needs a personalized article feed for logged-in users. The feed
            combines: (1) the user&apos;s saved articles from a Node.js backend
            at <code>INTERNAL_API_URL/users/:id/saved-articles</code> requiring an
            internal service token, and (2) Contentstack article entries for those UIDs fetched
            from the CMS. The response should be cached for 5 minutes per user in Redis. The
            feature should degrade gracefully if the backend is unavailable.
          </span>
        }
        tasks={[
          "Design the Route Handler endpoint path and HTTP method, then write the JWT verification step using a server-only environment variable",
          "Implement the parallel fetch: call the Node.js backend and Contentstack simultaneously using Promise.allSettled — handle partial failures where one source is down",
          "Show the Redis caching pattern: check cache first, set cache after successful fetch, use a user-specific cache key",
          "Handle the timeout: set a 2-second AbortSignal timeout on the Node.js backend call and explain what happens to the response if it times out",
          "Explain why this data cannot be fetched directly from a Client Component, and what security problem that would introduce",
        ]}
        pitfalls={[
          "Using Promise.all instead of Promise.allSettled — if the backend is down, Promise.all rejects immediately and the user gets a 500 error instead of a degraded response",
          "Not setting an AbortSignal timeout — a 10-second backend response blocks the Next.js response handler, degrading the experience for all concurrent requests",
          "Caching per-user data with a shared cache key — one user's personalized feed appears for another user",
          "Exposing the internal service token in a NEXT_PUBLIC_ env var so the client component can call the backend directly — this is a security vulnerability",
        ]}
        signal="A strong answer uses Promise.allSettled for partial failure tolerance, a per-user Redis key with 5-minute TTL, AbortSignal.timeout on the backend call, JWT verification before any data access, and correctly explains that the internal service token must never leave the server."
      />
    </div>
  );
}
