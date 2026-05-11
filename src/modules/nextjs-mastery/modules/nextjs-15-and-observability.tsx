import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const afterApiDiagram = String.raw`flowchart LR
  REQUEST["Incoming request"]
  HANDLER["Route Handler / Server Action<br/>runs request logic"]
  RESPONSE["Response sent to client<br/>✓ User sees result immediately"]
  AFTER["after() callbacks execute<br/>log analytics, cleanup tasks,<br/>send webhooks, update metrics"]
  DONE["Done — client already has response"]

  REQUEST --> HANDLER --> RESPONSE --> AFTER --> DONE

  BLOCKING["❌ Without after():<br/>Response waits for analytics call<br/>User sees extra latency"]

  style RESPONSE fill:#1a3a2a,color:#86efac
  style AFTER fill:#1e3a5f,color:#93c5fd
  style BLOCKING fill:#3a1a1a,color:#fca5a5`;

const instrumentationDiagram = String.raw`flowchart TD
  START["Next.js server process starts"]
  START --> REGISTER["instrumentation.ts → register() runs once<br/>Set up OpenTelemetry SDK<br/>Initialize Sentry/Datadog SDK<br/>Connect to tracing backend"]
  REGISTER --> READY["Server ready for requests"]
  READY --> REQUEST["Request received"]
  REQUEST --> HANDLER["Request handler runs<br/>(Page, Route Handler, Server Action)"]
  HANDLER --> SUCCESS["200 OK — tracing data exported automatically"]
  HANDLER --> ERROR["Unhandled error occurs"]
  ERROR --> ON_ERROR["onRequestError(err, request, context)<br/>Send to Sentry / Datadog / Bugsnag<br/>Available in instrumentation.ts"]
  ON_ERROR --> ERROR_RESP["Error response sent to client"]`;

export const toc: TocItem[] = [
  { id: "nextjs-15-overview", title: "What Changed in Next.js 15", level: 2 },
  { id: "params-as-promise", title: "Breaking Change: params as Promise", level: 2 },
  { id: "caching-defaults-changed", title: "Breaking Change: Caching Defaults Flipped", level: 2 },
  { id: "after-api", title: "The after() API", level: 2 },
  { id: "forbidden-unauthorized", title: "forbidden() and unauthorized()", level: 2 },
  { id: "connection-api", title: "The connection() API", level: 2 },
  { id: "instrumentation-ts", title: "instrumentation.ts and Observability", level: 2 },
  { id: "turbopack", title: "Turbopack Stable", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Nextjs15AndObservability() {
  return (
    <div className="article-content">
      <p>
        Next.js 15 shipped several breaking changes alongside major new APIs. The two most
        impactful changes for existing applications are the <code>params</code>-as-Promise
        change (affects every dynamic page) and the caching default flip (affects every{" "}
        <code>fetch()</code> call in the codebase). This module covers what changed, the new
        APIs, and how to upgrade safely.
      </p>
      <p>
        <strong>Version note:</strong> This module covers Next.js 15 (stable release, November 2024)
        with React 19 stable. Verify your project version with{" "}
        <code>pnpm list next</code> before applying these patterns.
      </p>

      <h2 id="nextjs-15-overview">What Changed in Next.js 15</h2>

      <ArticleTable caption="Next.js 14 vs Next.js 15 — key behavior changes that affect existing codebases." minWidth={920}>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Next.js 14</th>
              <th>Next.js 15</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>params</code> / <code>searchParams</code></td>
              <td>Plain objects, accessed synchronously</td>
              <td>Now Promises — must <code>await params</code></td>
              <td>Breaking — every dynamic page, layout, and route handler</td>
            </tr>
            <tr>
              <td><code>fetch()</code> default caching</td>
              <td><code>force-cache</code> — cached by default</td>
              <td><code>no-store</code> — not cached by default</td>
              <td>Breaking — apps relying on default caching will over-fetch</td>
            </tr>
            <tr>
              <td>GET Route Handler caching</td>
              <td>Cached by default for static routes</td>
              <td>Not cached by default — must opt in</td>
              <td>Breaking — route handlers that expected caching now always run</td>
            </tr>
            <tr>
              <td><code>useFormState</code></td>
              <td>From <code>react-dom</code></td>
              <td>Renamed to <code>useActionState</code> in React 19</td>
              <td>Deprecation warning — both still work during transition</td>
            </tr>
            <tr>
              <td>React version</td>
              <td>React 18</td>
              <td>React 19 stable</td>
              <td>New APIs: <code>use()</code>, <code>useOptimistic</code>, Actions</td>
            </tr>
            <tr>
              <td>Turbopack</td>
              <td>Experimental (<code>--turbo</code>)</td>
              <td>Stable (<code>--turbopack</code>)</td>
              <td>Significantly faster dev server startup and HMR</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="params-as-promise">Breaking Change: params as Promise</h2>
      <p>
        This is the most pervasive breaking change in Next.js 15. All dynamic route parameters —{" "}
        <code>params</code>, <code>searchParams</code>, and <code>cookies()</code>,{" "}
        <code>headers()</code>, <code>draftMode()</code> — are now asynchronous. They return
        Promises and must be awaited.
      </p>
      <pre>
        <code>{`// Next.js 14 (synchronous) — BREAKS in Next.js 15
export default function BlogPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page: string };
}) {
  const slug = params.slug;        // ❌ TypeScript error in Next.js 15
  const page = searchParams.page;  // ❌ TypeScript error in Next.js 15
  return <div>{slug}</div>;
}

// Next.js 15 (async) — CORRECT
export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page: string }>;
}) {
  const { slug } = await params;        // ✅ await the Promise
  const { page } = await searchParams;  // ✅ await the Promise
  return <div>{slug} — page {page}</div>;
}

// Route Handlers — same change
// Next.js 14:
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id; // ❌ Next.js 15 TypeScript error
}

// Next.js 15:
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅
  return Response.json({ id });
}

// Layouts and generateMetadata — same change
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ✅
  return { title: slug };
}`}</code>
      </pre>

      <p>
        <strong>Migration tip:</strong> Run <code>npx @next/codemod@canary upgrade latest</code>{" "}
        to automatically migrate most <code>params</code> and <code>searchParams</code> usages.
        The codemod does not cover all cases — review the diff carefully.
      </p>

      <h2 id="caching-defaults-changed">Breaking Change: Caching Defaults Flipped</h2>
      <p>
        This is the biggest footgun in the Next.js 14 → 15 migration. In Next.js 14,{" "}
        <code>fetch()</code> calls were cached by default (<code>force-cache</code>). In Next.js
        15, they are <strong>not cached by default</strong> (<code>no-store</code>). Applications
        that relied on implicit caching will now make fresh network requests on every render.
      </p>
      <pre>
        <code>{`// Next.js 14: implicitly cached
// This was equivalent to fetch(url, { cache: 'force-cache' })
const data = await fetch("https://api.example.com/products").then((r) => r.json());

// Next.js 15: NOT cached by default
// This is now equivalent to fetch(url, { cache: 'no-store' })
// Same code — different behavior!
const data = await fetch("https://api.example.com/products").then((r) => r.json());

// To cache in Next.js 15 — you must be explicit:
const data = await fetch("https://api.example.com/products", {
  cache: "force-cache",                    // Cache indefinitely (until revalidated)
  // OR
  next: { revalidate: 3600 },              // Cache for 1 hour (ISR)
  // OR
  next: { tags: ["products"] },            // Cache until revalidateTag("products") is called
}).then((r) => r.json());

// GET Route Handlers: also no longer cached by default in Next.js 15
// Next.js 14: GET handlers were cached if no dynamic functions were used
// Next.js 15: GET handlers always run dynamically
// To cache a GET handler, add:
export const dynamic = "force-static"; // or export const revalidate = 3600;`}</code>
      </pre>

      <h2 id="after-api">The after() API</h2>
      <p>
        <code>after()</code> is a new API in Next.js 15 that lets you schedule work to run after
        the response has been sent to the client. Use it for logging, analytics, cleanup, and
        webhook delivery — tasks that should not block the user-visible response.
      </p>

      <MermaidDiagram
        chart={afterApiDiagram}
        title="after() Execution Timeline"
        caption="Without after(), analytics calls block the response. With after(), the response is sent immediately and the analytics work runs after the client already has the data."
        minHeight={380}
      />

      <pre>
        <code>{`// app/api/orders/route.ts
import { after } from "next/server";
import { db } from "@/lib/db";
import { analytics } from "@/lib/analytics";

export async function POST(request: Request) {
  const body = await request.json();
  const order = await db.order.create({ data: body });

  // Schedule post-response work — runs AFTER the response is sent
  // The user does not wait for these
  after(async () => {
    await analytics.track("order_created", { orderId: order.id });
    await sendOrderConfirmationEmail(order);
  });

  // Response is sent immediately
  return Response.json(order, { status: 201 });
}

// Server Action with after()
"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const data = Object.fromEntries(formData);
  await db.user.update({ where: { id: data.id as string }, data });
  revalidatePath("/profile");

  // Log the change after the action resolves
  after(async () => {
    await auditLog.create({
      action: "profile_updated",
      userId: data.id,
      timestamp: new Date(),
    });
  });
}

// IMPORTANT CONSTRAINT:
// after() is NOT available in Edge Runtime
// It requires the Node.js runtime
// Using after() in a route with runtime = 'edge' will throw`}</code>
      </pre>

      <h2 id="forbidden-unauthorized">forbidden() and unauthorized()</h2>
      <p>
        Next.js 15 added typed HTTP error-throwing functions for 403 and 401 responses:{" "}
        <code>forbidden()</code> and <code>unauthorized()</code>. They work like{" "}
        <code>notFound()</code> — they throw internally to halt rendering and render a special
        error file.
      </p>

      <ArticleTable caption="Error-throwing functions — status code, handling file, when to use." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Status code</th>
              <th>Handled by file</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>notFound()</code></td>
              <td>404</td>
              <td><code>not-found.tsx</code></td>
              <td>Resource does not exist (e.g. blog post not in DB)</td>
            </tr>
            <tr>
              <td><code>unauthorized()</code></td>
              <td>401</td>
              <td><code>unauthorized.tsx</code></td>
              <td>User is not authenticated — no session</td>
            </tr>
            <tr>
              <td><code>forbidden()</code></td>
              <td>403</td>
              <td><code>forbidden.tsx</code></td>
              <td>User is authenticated but does not have permission</td>
            </tr>
            <tr>
              <td><code>redirect()</code></td>
              <td>307/308</td>
              <td>None — redirects to a URL</td>
              <td>Redirect to another page (login, home, etc.)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// app/admin/page.tsx
import { forbidden, unauthorized } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    unauthorized(); // 401 — throws internally, renders unauthorized.tsx
  }

  if (session.role !== "admin") {
    forbidden(); // 403 — throws internally, renders forbidden.tsx
  }

  return <div>Admin panel</div>;
}

// CRITICAL: Do NOT wrap these in try/catch — they throw to signal control flow
// ❌ WRONG:
try {
  if (!session) unauthorized();
} catch {
  // This will catch the internal throw and break the redirect
}

// ✅ CORRECT: Call them directly, let them throw
if (!session) unauthorized();

// app/unauthorized.tsx — customize the 401 page
export default function UnauthorizedPage() {
  return (
    <div>
      <h1>401 — Authentication Required</h1>
      <p>Please sign in to access this page.</p>
      <a href="/login">Sign in</a>
    </div>
  );
}

// app/forbidden.tsx — customize the 403 page
export default function ForbiddenPage() {
  return (
    <div>
      <h1>403 — Access Denied</h1>
      <p>You do not have permission to view this page.</p>
    </div>
  );
}`}</code>
      </pre>

      <h2 id="connection-api">The connection() API</h2>
      <p>
        <code>connection()</code> is a new API from <code>next/server</code> that forces a route
        to be dynamic. It is the cleaner replacement for the workaround of calling{" "}
        <code>cookies()</code> or <code>headers()</code> just to force dynamic rendering.
      </p>
      <pre>
        <code>{`// Before Next.js 15: forcing dynamic rendering required a hack
import { cookies } from "next/headers";

export default async function MyPage() {
  // Hack: calling cookies() just to force dynamic rendering
  cookies(); // side effect only — we don't actually use the cookies
  return <div>Always dynamic</div>;
}

// Next.js 15: use connection() instead — semantically clear
import { connection } from "next/server";

export default async function MyPage() {
  await connection(); // waits for an actual request, forcing dynamic rendering
  return <div>Always dynamic</div>;
}

// connection() is also useful for components that generate random values,
// read the current timestamp, or perform work that must be request-specific`}</code>
      </pre>

      <h2 id="instrumentation-ts">instrumentation.ts and Observability</h2>
      <p>
        <code>instrumentation.ts</code> (or <code>instrumentation.js</code>) is a special file at
        the root of your project (or inside <code>src/</code>) that Next.js loads once when the
        server starts. It is the correct place to initialize OpenTelemetry, connect to a tracing
        backend, and set up error reporting.
      </p>

      <MermaidDiagram
        chart={instrumentationDiagram}
        title="instrumentation.ts Lifecycle"
        caption="register() runs once at server startup — not per request. onRequestError is the hook for sending uncaught errors to your observability platform."
        minHeight={520}
      />

      <pre>
        <code>{`// instrumentation.ts (at project root or src/)
export async function register() {
  // This runs ONCE when the server starts — not per request
  // Perfect for SDK initialization that is expensive to set up

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // OpenTelemetry initialization (Node.js only)
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge-compatible observability setup (if needed)
  }
}

// onRequestError: the correct hook for sending errors to Sentry / Datadog
export function onRequestError(
  error: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "App Router" | "Pages Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
    revalidateReason?: "on-demand" | "stale" | "build";
  }
): void | Promise<void> {
  // This is called for every unhandled request error
  // Use it to send errors to your observability platform
  console.error("Request error", {
    message: error.message,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });

  // Example: send to Sentry
  // Sentry.captureException(error, {
  //   tags: { routeType: context.routeType, path: request.path },
  // });
}

// IMPORTANT: register() must be enabled in next.config.ts
// This is enabled by default in Next.js 15
// In older versions it required: experimental: { instrumentationHook: true }`}</code>
      </pre>

      <h2 id="turbopack">Turbopack Stable</h2>
      <p>
        Turbopack is Next.js&apos;s new Rust-based bundler that replaces webpack in the development
        server. It became stable in Next.js 15.
      </p>
      <pre>
        <code>{`# Enable Turbopack for development (stable in Next.js 15)
pnpm dev --turbopack

# Or add to package.json scripts:
# "dev": "next dev --turbopack"

# Turbopack improvements over webpack in dev:
# - Up to 76% faster cold start (measured on large Next.js apps)
# - Up to 96% faster hot module replacement (HMR)
# - Incremental compilation — only re-bundles changed modules

# Important: Turbopack is the dev bundler only
# Production builds still use webpack (or SWC for code transformation)
# A Turbopack production build is on the roadmap but not yet stable

# Known incompatibilities (check next.js docs for current list):
# - Some webpack plugins have no Turbopack equivalent
# - Custom webpack loaders from next.config.ts may not work
# - Some Babel plugins not yet supported

// next.config.ts — verify Turbopack compatibility
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // If you have custom webpack config, it may not work with Turbopack
  // webpack: (config) => { ... } — test this with --turbopack before deploying
};

export default nextConfig;`}</code>
      </pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="What breaking changes should you watch for when upgrading from Next.js 14 to 15?"
        intro="Frame your answer around the most impactful changes, not just a list. Show you understand WHY these were breaking and HOW to migrate safely."
        steps={[
          "Lead with the two biggest footguns: the params-as-Promise change and the caching defaults flip. These affect every dynamic route and every fetch() call respectively.",
          "For params: every page, layout, and route handler that reads params.slug or searchParams.page must add await. The TypeScript errors guide you, but the codemod can automate most of it.",
          "For caching: any fetch() that relied on being cached by default now makes fresh requests. This is actually more correct behavior — you must now be explicit about what should be cached. Review all fetch() calls and add next.revalidate or cache: 'force-cache' where you want caching.",
          "Mention the React 19 upgrade: useFormState was renamed to useActionState. Both work during the transition, but expect deprecation warnings.",
          "GET Route Handlers are no longer cached by default — if you had a static GET handler that was being served from cache, it will now run on every request until you add export const revalidate.",
          "Close with the new APIs worth knowing: after() for post-response work, forbidden() and unauthorized() for typed HTTP errors, and instrumentation.ts for observability.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: Upgrade a Next.js 14 App to Next.js 15"
        scenario={
          <span>
            You are upgrading a Next.js 14 production application to Next.js 15. During the upgrade
            review, you find the following patterns in the codebase:
            <br />
            <br />
            1. A product page: <code>{"export default function Page({ params }) { const { id } = params; }"}</code>
            <br />
            2. A data fetch: <code>{"const products = await fetch('/api/products').then(r => r.json())"}</code>{" "}
            (no cache option — was relying on default caching)
            <br />
            3. A form component using: <code>{"import { useFormState } from 'react-dom'"}</code>
            <br />
            4. A logging call inside a Server Action that makes a slow analytics HTTP request,
            blocking the action response
            <br />
            5. An admin page that does: <code>{"if (!session.isAdmin) { throw new Error('Forbidden') }"}</code>
          </span>
        }
        tasks={[
          "For each of the 5 patterns, identify what breaks in Next.js 15 and write the correct Next.js 15 version.",
          "The caching change (pattern 2) could cause a performance regression. What should you check before adding cache: 'force-cache', and what caching strategy is most appropriate for a product list?",
          "Pattern 4 blocks the Server Action. What Next.js 15 API fixes this and how do you use it?",
          "Pattern 5 uses a generic Error throw for 403. What is the Next.js 15 idiomatic replacement?",
        ]}
        pitfalls={[
          "Forgetting to add async to the Page component — you cannot await params in a synchronous function.",
          "Adding cache: 'force-cache' to everything as a quick fix — some data should not be cached (user-specific data, real-time prices). Think about each case individually.",
          "Wrapping forbidden() in a try/catch — it throws internally as a control flow signal and must not be caught.",
          "Moving the analytics call to a separate awaited function rather than using after() — the user still waits.",
        ]}
        signal="A strong answer fixes all 5 patterns: adds async/await params, adds explicit cache options to fetch, replaces useFormState with useActionState, wraps the analytics call in after(), and replaces the generic throw with forbidden() from next/navigation. Bonus points for explaining that cache: 'force-cache' on the product list should also use next.tags so it can be invalidated on-demand with revalidateTag."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>params is now a Promise</strong> — every dynamic page, layout, route handler,
          and <code>generateMetadata</code> must <code>await params</code> in Next.js 15.
        </li>
        <li>
          <strong>fetch() no longer caches by default</strong> — you must be explicit:{" "}
          <code>cache: &apos;force-cache&apos;</code> or <code>next: {'{ revalidate: N }'}</code> to
          cache. This is the most common source of performance regressions when upgrading.
        </li>
        <li>
          <strong><code>after()</code></strong> schedules work after the response is sent —
          analytics, logging, webhooks. Node.js runtime only, not Edge Runtime.
        </li>
        <li>
          <strong><code>forbidden()</code> and <code>unauthorized()</code></strong> are typed
          error-throwing functions for 403 and 401. Pair with <code>forbidden.tsx</code> /
          <code>unauthorized.tsx</code> files. Do not catch them in try/catch.
        </li>
        <li>
          <strong><code>instrumentation.ts register()</code></strong> runs once at server startup —
          the correct place for OpenTelemetry and observability SDK initialization.{" "}
          <code>onRequestError</code> is the hook for sending unhandled errors to Sentry/Datadog.
        </li>
        <li>
          <strong>Turbopack is stable</strong> — use <code>next dev --turbopack</code> for
          significantly faster HMR. Production builds still use webpack.
        </li>
      </ul>
    </div>
  );
}
