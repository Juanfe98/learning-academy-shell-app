import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const corsPreflight = String.raw`sequenceDiagram
  participant B as Browser
  participant S as Route Handler (server)

  Note over B,S: First request to a cross-origin endpoint
  B->>S: OPTIONS /api/data<br/>Origin: https://app.example.com<br/>Access-Control-Request-Method: POST
  S->>B: 204 No Content<br/>Access-Control-Allow-Origin: https://app.example.com<br/>Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS<br/>Access-Control-Allow-Headers: Content-Type, Authorization

  Note over B,S: Browser is now satisfied — sends the real request
  B->>S: POST /api/data<br/>Origin: https://app.example.com<br/>Content-Type: application/json
  S->>B: 200 OK<br/>Access-Control-Allow-Origin: https://app.example.com<br/>{"result": "ok"}`;

const requestLifecycle = String.raw`sequenceDiagram
  participant C as Client
  participant CDN as CDN / Edge Cache
  participant RH as Route Handler (Node.js)
  participant DB as Database / External API

  C->>CDN: GET /api/public-data
  alt Cached response (GET + static)
    CDN->>C: 200 Cached response
  else Cache miss or dynamic
    CDN->>RH: Forward request
    RH->>RH: Auth check (read cookies / JWT)
    RH->>RH: Rate limit check (Upstash Redis)
    alt Rate limited
      RH->>C: 429 Too Many Requests
    else Allowed
      RH->>DB: Query data
      DB->>RH: Data
      RH->>C: 200 JSON response
    end
  end`;

export const toc: TocItem[] = [
  { id: "rh-mental-model", title: "Mental Model: Route Handlers vs Server Actions", level: 2 },
  { id: "cors-setup", title: "CORS Configuration", level: 2 },
  { id: "streaming-sse", title: "Streaming Responses and Server-Sent Events", level: 2 },
  { id: "webhook-patterns", title: "Webhook Patterns", level: 2 },
  { id: "rate-limiting", title: "Rate Limiting", level: 2 },
  { id: "route-handler-caching", title: "Route Handler Caching Gotcha", level: 2 },
  { id: "auth-in-route-handlers", title: "Auth in Route Handlers", level: 2 },
  { id: "pages-vs-app-api-routes", title: "Pages Router vs App Router Migration", level: 2 },
  { id: "rh-comparison-table", title: "Side-by-Side Comparison", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RouteHandlersAdvanced() {
  return (
    <div className="article-content">
      <p>
        The basics of Route Handlers — file location, HTTP method exports, reading params — are
        covered in the Routing module. This module goes deeper: CORS for external consumers,
        Server-Sent Events for streaming, robust webhook signature verification, edge-compatible
        rate limiting, the caching behaviour that silently serves stale user-specific data, and
        a clear mental model for when Route Handlers are the right tool versus Server Actions.
        These are the topics that separate engineers who have shipped production APIs in Next.js
        from those who have only read the docs.
      </p>

      <h2 id="rh-mental-model">Mental Model: Route Handlers vs Server Actions</h2>
      <p>
        Both Route Handlers and Server Actions run on the server. The difference is who calls them
        and how. Getting the mental model right prevents security mistakes, not just architectural
        ones.
      </p>
      <p>
        Use a <strong>Route Handler</strong> (<code>app/api/.../route.ts</code>) when:
      </p>
      <ul>
        <li>An external service calls your endpoint — Stripe webhooks, GitHub webhooks, third-party integrations.</li>
        <li>A mobile app, another frontend, or a non-Next.js client needs your API.</li>
        <li>You need precise control over HTTP semantics: status codes, response headers, content-type, streaming.</li>
        <li>You are building a public REST API or a Server-Sent Events stream.</li>
        <li>You need CORS support — Server Actions do not support cross-origin calls.</li>
      </ul>
      <p>
        Use a <strong>Server Action</strong> when:
      </p>
      <ul>
        <li>A React component in your own app triggers a mutation.</li>
        <li>You want automatic revalidation, progressive enhancement, and React transition integration.</li>
        <li>The caller is a <code>{`<form>`}</code> or a <code>startTransition</code> block inside your UI.</li>
      </ul>
      <p>
        The security difference matters: Server Actions are tied to a CSRF-safe internal transport
        that Next.js manages. Route Handlers are raw HTTP endpoints — you own the auth, CORS, and
        CSRF protection.
      </p>

      <h2 id="cors-setup">CORS Configuration</h2>
      <p>
        CORS only applies when a browser makes a request to a different origin than the page it
        is on. The browser automatically sends a preflight <code>OPTIONS</code> request for
        &quot;non-simple&quot; requests (anything with a non-default Content-Type, Authorization
        header, or non-GET/POST method). Your server must respond to that preflight before the
        browser will send the real request.
      </p>

      <MermaidDiagram
        chart={corsPreflight}
        title="CORS Preflight Flow"
        caption="The browser issues an OPTIONS request before every non-simple cross-origin request. Missing or incorrect CORS headers on the OPTIONS response blocks the real request entirely — the server never even sees it."
        minHeight={480}
      />

      <p>
        The most common production mistake is handling CORS only on <code>POST</code> and
        forgetting to export an <code>OPTIONS</code> handler. The browser preflight always
        hits <code>OPTIONS</code> first. Without it, all cross-origin requests fail.
      </p>

      <pre>
        <code>{`// src/app/api/data/route.ts

import { NextResponse } from "next/server";

// List allowed origins from env — never hardcode in source
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];

function corsHeaders(origin: string | null): Record<string, string> {
  // Only echo back origins that are explicitly allowed
  // Echoing the request origin (instead of "*") is required when credentials are sent
  const allowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (ALLOWED_ORIGINS[0] ?? ""),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // preflight cached for 24h
  };
}

// ── OPTIONS must be exported, or preflight requests return 405 ──
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const data = await fetchPublicData();
  return NextResponse.json(data, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const body = await request.json();
  const result = await processData(body);
  return NextResponse.json(result, {
    status: 201,
    headers: corsHeaders(origin),
  });
}

// ── .env.local ──
// ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com`}</code>
      </pre>

      <p>
        If you need credentials (cookies) in cross-origin requests, add{" "}
        <code>&quot;Access-Control-Allow-Credentials&quot;: &quot;true&quot;</code> to the
        headers and use the specific origin — <code>*</code> is incompatible with{" "}
        <code>credentials: &quot;include&quot;</code> on the browser side.
      </p>

      <h2 id="streaming-sse">Streaming Responses and Server-Sent Events</h2>
      <p>
        Route Handlers return a Web <code>Response</code>, which accepts a{" "}
        <code>ReadableStream</code> as the body. This is the primitive for both streaming JSON
        (AI token-by-token output) and SSE (real-time event feeds). The runtime keeps the
        connection open and flushes data as it is enqueued into the stream.
      </p>
      <p>
        The two common patterns are:
      </p>
      <ul>
        <li>
          <strong>SSE (<code>text/event-stream</code>)</strong> — standardised protocol the browser
          handles natively via <code>EventSource</code>. Automatic reconnection, named events,
          event IDs. One-directional: server to client only.
        </li>
        <li>
          <strong>Raw streaming (<code>application/octet-stream</code> or{" "}
          <code>text/plain</code>)</strong> — consumed via{" "}
          <code>fetch + response.body.getReader()</code>. Useful for AI streaming where you want
          full control over chunked JSON parsing.
        </li>
      </ul>

      <pre>
        <code>{`// Server: SSE stream from a Route Handler
// src/app/api/events/route.ts

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Wire up AbortController so the stream stops when the client disconnects
      const signal = request.signal;
      signal.addEventListener("abort", () => controller.close());

      try {
        for await (const event of subscribeToEvents()) {
          if (signal.aborted) break;

          // SSE wire format: each "message" is "data: ...\\n\\n"
          // Named events: "event: update\\ndata: ...\\n\\n"
          // IDs for reconnection: "id: 42\\ndata: ...\\n\\n"
          controller.enqueue(
            encoder.encode(\`data: \${JSON.stringify(event)}\\n\\n\`)
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Client: EventSource (built-in browser API)
const source = new EventSource("/api/events");
source.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log("received:", event);
};
source.onerror = () => {
  // EventSource reconnects automatically after network errors
  console.log("connection lost, reconnecting...");
};
source.close(); // stop when done

// Client: fetch + ReadableStream (for non-SSE streaming, e.g. AI tokens)
const response = await fetch("/api/ai/generate", {
  method: "POST",
  body: JSON.stringify({ prompt }),
  headers: { "Content-Type": "application/json" },
  signal: AbortSignal.timeout(30_000),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // SSE lines come as "data: {...}\\n\\n" — parse accordingly
  appendToUI(chunk);
}`}</code>
      </pre>

      <h2 id="webhook-patterns">Webhook Patterns</h2>
      <p>
        Webhooks have one cardinal rule: <strong>respond 200 immediately, process async</strong>.
        Stripe retries if it does not receive a 200 within 30 seconds. GitHub has similar timeouts.
        If your handler awaits a slow database write or email send before returning, you will
        receive duplicate events on any hiccup.
      </p>
      <p>
        The second rule: <strong>always verify the signature</strong>. Webhook endpoints are
        unauthenticated HTTP POST endpoints — anyone on the internet can hit them. The signature
        is the only proof that the payload came from the legitimate source.
      </p>
      <p>
        Signature verification requires the <strong>raw request body as a string or buffer</strong>,
        not the parsed JSON. This is why you must use <code>request.text()</code> rather than{" "}
        <code>request.json()</code> — JSON re-serialisation changes whitespace and may not produce
        the identical byte sequence the sender signed.
      </p>

      <pre>
        <code>{`// Stripe webhook — src/app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { after } from "next/server"; // Next.js 15: run work after response is sent

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  // 1. Read raw body — must NOT be request.json()
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    // Invalid signature — reject immediately
    return new Response(\`Webhook signature verification failed: \${err}\`, {
      status: 400,
    });
  }

  // 2. Respond 200 immediately — do NOT await the handler
  // after() runs after the response is flushed to the client
  after(async () => {
    await handleStripeEvent(event);
  });

  return new Response("OK", { status: 200 });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.order.update({
        where: { stripeSessionId: session.id },
        data: { status: "paid" },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await cancelUserSubscription(sub.customer as string);
      break;
    }
  }
}

// GitHub webhook — HMAC-SHA256 verification
// src/app/api/webhooks/github/route.ts
import { createHmac, timingSafeEqual } from "crypto";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const expected = "sha256=" + createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  // timingSafeEqual prevents timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  const isValid =
    sigBuffer.length === expectedBuffer.length &&
    timingSafeEqual(sigBuffer, expectedBuffer);

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  after(async () => {
    await processGitHubEvent(request.headers.get("x-github-event")!, payload);
  });

  return new Response("OK", { status: 200 });
}`}</code>
      </pre>

      <h2 id="rate-limiting">Rate Limiting</h2>
      <p>
        Rate limiting in Route Handlers needs to be edge-compatible and horizontally scalable.
        An in-memory counter does not work across multiple server instances. The standard
        production solution is <strong>Upstash Redis</strong> with the{" "}
        <code>@upstash/ratelimit</code> library — it is an HTTP-based Redis client that works
        on both Node.js and the Edge Runtime.
      </p>
      <p>
        The sliding window algorithm is preferable to a fixed window because it prevents the
        &quot;boundary burst&quot; problem: with a fixed 10-requests-per-minute window, a client
        can fire 10 requests at 0:59 and 10 more at 1:01 — 20 requests in 2 seconds. A sliding
        window smooths this out.
      </p>

      <pre>
        <code>{`// src/lib/ratelimit.ts — singleton so the Redis client isn't recreated per request
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10-second window
  prefix: "api", // Redis key prefix — avoids collisions with other keys
});

// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  // Use the real client IP — x-forwarded-for is set by Vercel/load balancers
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: Math.ceil((reset - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // Attach rate limit headers to successful responses too — good API hygiene
  const data = await expensiveOperation(request);
  return NextResponse.json(data, {
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}

// For authenticated endpoints, rate limit by user ID instead of IP
// to prevent IP-based evasion (VPNs, shared IPs)
const identifier = userId ?? ip;
const { success } = await ratelimit.limit(identifier);`}</code>
      </pre>

      <h2 id="route-handler-caching">Route Handler Caching Gotcha</h2>
      <p>
        This is one of the most dangerous defaults in Next.js App Router. <strong>GET Route
        Handlers are statically cached by default</strong> — the same way static pages are. At
        build time, Next.js may execute your GET handler once and cache the result forever, serving
        the same response to every user.
      </p>
      <p>
        The most common mistake: a <code>GET /api/me</code> endpoint that returns the current
        user&apos;s profile. Without opting out of caching, all users receive the same cached
        response — whichever user hit the endpoint first.
      </p>

      <pre>
        <code>{`// ❌ DANGEROUS — this GET response may be cached at build time
export async function GET(request: Request) {
  const user = await getCurrentUser(); // session-dependent!
  return Response.json(user);
}

// ✅ Option 1: force-dynamic — disables caching entirely for this route
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  return Response.json(user);
}

// ✅ Option 2: Reading request.headers auto-opts out of static rendering
// Next.js detects header access and treats the route as dynamic
export async function GET(request: Request) {
  const token = request.headers.get("authorization"); // opts out automatically
  const user = await getUserFromToken(token);
  return Response.json(user);
}

// ✅ Option 3: Time-based revalidation for non-user-specific data
// Good for public endpoints where data changes, but not per-user
export const revalidate = 60; // re-run at most once every 60 seconds

export async function GET() {
  const products = await db.product.findMany({ where: { featured: true } });
  return Response.json(products);
}

// Caching behaviour cheat sheet:
// GET + no access to request = STATIC (cached at build)
// GET + reads request.headers / request.cookies = DYNAMIC (per request)
// GET + dynamic = "force-dynamic" = DYNAMIC
// GET + revalidate = N = ISR (re-validated every N seconds)
// POST, PUT, DELETE, PATCH = always DYNAMIC (never cached)`}</code>
      </pre>

      <h2 id="auth-in-route-handlers">Auth in Route Handlers</h2>
      <p>
        Route Handlers do not automatically have access to the authenticated user — unlike Server
        Components, which can read cookies server-side during React rendering. In a Route Handler,
        you must explicitly read the session cookie and verify it.
      </p>

      <pre>
        <code>{`// Reading cookies in a Route Handler — Next.js 15
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // cookies() returns a Promise in Next.js 15 — must await
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session-token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await validateSessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  return NextResponse.json({ userId: session.userId });
}

// JWT verification pattern — stateless auth
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;

    const data = await getUserData(userId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// Extracting auth into a reusable helper
// src/lib/auth/route-auth.ts
export async function requireAuth(request: Request) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload.sub as string; // userId
}

// Usage in any route handler
export async function GET(request: Request) {
  const userId = await requireAuth(request).catch((res) => {
    return res; // re-throw the Response to short-circuit
  });
  if (userId instanceof Response) return userId;

  const profile = await getUserProfile(userId);
  return Response.json(profile);
}`}</code>
      </pre>

      <p>
        The key difference from Server Actions: Server Actions run in the React request context
        and can read <code>cookies()</code> directly. Route Handlers are plain HTTP handlers —
        they must read cookies from the request explicitly, making auth boilerplate slightly more
        verbose but also more transparent.
      </p>

      <h2 id="pages-vs-app-api-routes">Pages Router vs App Router Migration</h2>
      <p>
        If you are migrating a Next.js 12/13 codebase, the API layer changes significantly. The
        mental model shifts from a Node.js request/response model (<code>req</code>,{" "}
        <code>res</code>) to the Web Fetch API (<code>Request</code>, <code>Response</code>).
      </p>

      <pre>
        <code>{`// ── Pages Router (pages/api/users/index.ts) ──
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // body is auto-parsed for JSON and form
    const { page = "1" } = req.query;
    const users = await db.user.findMany({ skip: (parseInt(page as string) - 1) * 10 });
    res.status(200).json(users);
    return;
  }

  if (req.method === "POST") {
    const { name, email } = req.body; // auto-parsed
    const user = await db.user.create({ data: { name, email } });
    res.status(201).json(user);
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end("Method Not Allowed");
}

// ── App Router equivalent (app/api/users/route.ts) ──
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1");
  const users = await db.user.findMany({ skip: (page - 1) * 10 });
  return NextResponse.json(users); // no status needed for 200
}

export async function POST(request: NextRequest) {
  const { name, email } = await request.json(); // must parse manually
  const user = await db.user.create({ data: { name, email } });
  return NextResponse.json(user, { status: 201 });
}
// 405 for unsupported methods is automatic — no default export needed`}</code>
      </pre>

      <h3 id="rh-comparison-table">Side-by-Side Comparison</h3>

      <MermaidDiagram
        chart={requestLifecycle}
        title="Route Handler Request Lifecycle"
        caption="A Route Handler request passes through CDN caching, then auth and rate limiting checks before reaching the database. Correctly opting out of caching is what separates a secure API from one that leaks data across users."
        minHeight={520}
      />

      <ArticleTable
        caption="Pages Router API Routes vs App Router Route Handlers — every meaningful difference at a glance."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Pages Router (<code>pages/api/</code>)</th>
              <th>App Router (<code>app/.../route.ts</code>)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Request object</td>
              <td>Node.js <code>IncomingMessage</code> (<code>req</code>)</td>
              <td>Web Fetch <code>Request</code> / <code>NextRequest</code></td>
            </tr>
            <tr>
              <td>Response object</td>
              <td>Node.js <code>ServerResponse</code> (<code>res</code>)</td>
              <td>Web Fetch <code>Response</code> / <code>NextResponse</code></td>
            </tr>
            <tr>
              <td>Body parsing</td>
              <td>Auto-parsed JSON and form by default</td>
              <td>Manual: <code>await request.json()</code></td>
            </tr>
            <tr>
              <td>Method routing</td>
              <td><code>req.method</code> switch inside one <code>default</code> export</td>
              <td>Named exports per method: <code>export async function GET</code></td>
            </tr>
            <tr>
              <td>Streaming support</td>
              <td>Limited — must write to <code>res</code> manually</td>
              <td>Native: return a <code>ReadableStream</code> as the response body</td>
            </tr>
            <tr>
              <td>Edge Runtime</td>
              <td>Not supported</td>
              <td><code>export const runtime = &quot;edge&quot;</code></td>
            </tr>
            <tr>
              <td>Static caching</td>
              <td>Never cached</td>
              <td>GET cached by default — must opt out with <code>dynamic = &quot;force-dynamic&quot;</code></td>
            </tr>
            <tr>
              <td>Middleware access</td>
              <td>Separate <code>_middleware.ts</code> (deprecated)</td>
              <td><code>middleware.ts</code> at project root, runs before all routes</td>
            </tr>
            <tr>
              <td>File location</td>
              <td><code>pages/api/users/index.ts</code></td>
              <td><code>app/api/users/route.ts</code></td>
            </tr>
            <tr>
              <td>Dynamic segments</td>
              <td><code>pages/api/users/[id].ts</code> → <code>req.query.id</code></td>
              <td><code>app/api/users/[id]/route.ts</code> → <code>await params</code> (second arg)</td>
            </tr>
            <tr>
              <td>CORS / OPTIONS</td>
              <td>Handle inside <code>default</code> export with <code>if (req.method === &quot;OPTIONS&quot;)</code></td>
              <td>Export a dedicated <code>OPTIONS</code> function</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How would you implement a Stripe webhook in Next.js App Router?"
        intro="A strong answer demonstrates understanding of three non-obvious constraints: raw body access for signature verification, immediate 200 response to prevent retries, and idempotent event processing."
        steps={[
          "Start with the signature check: use request.text() — not request.json() — because Stripe signs the raw byte sequence. Re-serialising JSON changes whitespace and breaks the HMAC. Verify with stripe.webhooks.constructEvent() before doing anything else.",
          "Explain the retry problem: Stripe marks a delivery as failed if no 200 arrives within 30 seconds. Any awaited slow work (DB writes, email sends) risks a timeout and duplicate delivery. The fix is to return 200 immediately and use next/server's after() to run the handler post-response.",
          "Address idempotency: Stripe can deliver the same event more than once (at-least-once delivery). Store processed event IDs and check before acting — a payment should never be applied twice.",
          "Close with the security implication: without signature verification, any party can POST to your webhook URL with a fabricated payload and trigger order fulfilment, subscription changes, or refunds.",
        ]}
      />

      <InterviewPlaybook
        title="When would you use a Route Handler vs a Server Action?"
        intro="The distinction is about the caller, not just the location. Senior engineers explain the security model difference, not just the syntax difference."
        steps={[
          "Route Handler when the caller is external: webhooks, mobile apps, third-party integrations, other services. They call a standard HTTP endpoint and cannot invoke Server Actions.",
          "Route Handler when you need HTTP semantics: custom status codes, response headers, CORS, streaming, content-type negotiation. Server Actions always respond with React's internal protocol.",
          "Server Action when the caller is your own React UI: form submissions, button mutations, any action triggered by a React component in the same app. You get progressive enhancement, automatic revalidation, and React's useActionState integration for free.",
          "Security difference: Server Actions have CSRF protection built into Next.js's internal transport. Route Handlers are plain HTTP — you are responsible for auth, CORS, and CSRF. Treating a Route Handler as a Server Action boundary (e.g. not checking auth) is a real vulnerability.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Design a Production-Ready API Endpoint"
        scenario={
          <>
            You are building a <code>POST /api/ai/generate</code> endpoint for a SaaS product.
            The endpoint accepts a JSON body with a <code>prompt</code> field and streams an
            AI-generated response token by token. It must be callable from a separate frontend
            app hosted on a different domain. Authenticated users get a higher rate limit than
            anonymous ones. Unauthenticated users are still allowed but are limited to 3 requests
            per minute. Authenticated users get 30 per minute. The endpoint should not accidentally
            serve cached responses to different users.
          </>
        }
        tasks={[
          "Implement CORS so the endpoint is only callable from https://app.example.com. The preflight request must be handled correctly.",
          "Add rate limiting using Upstash Redis: 3 req/min for anonymous (by IP), 30 req/min for authenticated (by user ID). Include correct Retry-After and X-RateLimit-* headers.",
          "Stream the AI response using ReadableStream and text/event-stream. Wire up AbortController so the stream stops if the client disconnects.",
          "Ensure the GET variant (for health checks) is not accidentally cached and does not serve stale data across users.",
        ]}
      />

      <SolutionReveal>
        <pre>
          <code>{`// src/app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { jwtVerify } from "jose";

// ── CORS ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ["https://app.example.com"];

function corsHeaders(origin: string | null) {
  const allowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

// ── Rate Limiting ──────────────────────────────────────────────────────
const redis = Redis.fromEnv();
const anonLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  prefix: "rl:anon",
});
const authLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "rl:auth",
});

// ── Auth helper ────────────────────────────────────────────────────────
async function tryGetUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload.sub as string;
  } catch {
    return null;
  }
}

// ── Opt out of static caching (user-specific streaming endpoint) ──────
export const dynamic = "force-dynamic";

// ── Main handler ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // 1. Identify caller
  const userId = await tryGetUserId(request);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const identifier = userId ?? ip;
  const limiter = userId ? authLimit : anonLimit;

  // 2. Rate limit check
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 3. Parse body
  const { prompt } = await request.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400, headers }
    );
  }

  // 4. Stream AI response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const signal = request.signal;
      signal.addEventListener("abort", () => controller.close());

      try {
        for await (const token of streamFromAI(prompt)) {
          if (signal.aborted) break;
          controller.enqueue(
            encoder.encode(\`data: \${JSON.stringify({ token })}\\n\\n\`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}

// Health check — force-dynamic at the top ensures this is never cached
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json(
    { status: "ok" },
    { headers: corsHeaders(origin) }
  );
}

// Stub — replace with your actual AI SDK call
async function* streamFromAI(prompt: string) {
  const words = \`Response to: \${prompt}\`.split(" ");
  for (const word of words) {
    await new Promise((r) => setTimeout(r, 50));
    yield word + " ";
  }
}`}</code>
        </pre>
        <p>
          Key design decisions: a single <code>corsHeaders()</code> helper applied to every
          response (including errors and the OPTIONS preflight) ensures no response leaks through
          without CORS headers. The rate limiter instances are module-level singletons — creating
          them per request would open a new Redis connection on every call.{" "}
          <code>dynamic = &quot;force-dynamic&quot;</code> at the module level opts the entire
          file out of static rendering, protecting both <code>GET</code> and <code>POST</code>.
          The AbortController wiring in the stream means the AI call stops consuming tokens if
          the user closes the browser tab.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Always export an <code>OPTIONS</code> handler for CORS.</strong> Forgetting it
          means the browser preflight gets a 405 and blocks all cross-origin requests before they
          start.
        </li>
        <li>
          <strong>GET Route Handlers are statically cached by default.</strong> Any user-specific
          or session-dependent GET endpoint must use <code>dynamic = &quot;force-dynamic&quot;</code>{" "}
          or read from <code>request.headers</code> to opt out automatically.
        </li>
        <li>
          <strong>Webhooks: return 200 first, process after.</strong> Use <code>after()</code>{" "}
          from <code>next/server</code> to run post-response work. Always verify the signature
          with the raw body (<code>request.text()</code>), never re-parsed JSON.
        </li>
        <li>
          <strong>Rate limit by user ID for authenticated endpoints.</strong> IP-based limits
          are trivially bypassed with VPNs. Per-user limits with a sliding window algorithm prevent
          both boundary bursts and evasion.
        </li>
        <li>
          <strong>Stream with <code>ReadableStream</code> and wire <code>AbortController</code>.</strong>{" "}
          Without the abort signal, a disconnected client keeps your stream running and consuming
          AI tokens, DB connections, or downstream rate limit budget.
        </li>
        <li>
          <strong>Route Handlers own their own security.</strong> Unlike Server Actions, which
          get CSRF protection from Next.js&apos;s internal transport, Route Handlers are plain
          HTTP. Auth, CORS, and input validation are entirely your responsibility.
        </li>
      </ul>
    </div>
  );
}
