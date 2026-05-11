import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "dynamic-routes", title: "Dynamic Routes", level: 2 },
  { id: "catch-all", title: "Catch-All and Optional Catch-All", level: 3 },
  { id: "params-promise", title: "params is a Promise in Next.js 15", level: 3 },
  { id: "parallel-routes", title: "Parallel Routes", level: 2 },
  { id: "parallel-use-cases", title: "Parallel Route Use Cases", level: 3 },
  { id: "intercepting-routes", title: "Intercepting Routes", level: 2 },
  { id: "route-handlers", title: "Route Handlers (API Routes)", level: 2 },
  { id: "route-handler-patterns", title: "Route Handler Patterns", level: 3 },
  { id: "middleware", title: "middleware.ts", level: 2 },
  { id: "middleware-patterns", title: "Common Middleware Patterns", level: 3 },
  { id: "middleware-edge", title: "Edge Runtime Constraints", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function RoutingAdvanced() {
  return (
    <div className="article-content">
      <p>
        This module covers the routing features that separate basic Next.js knowledge from
        production-grade understanding: dynamic segments, the full catch-all syntax, parallel
        and intercepting routes for advanced UI patterns, route handlers as a proper API layer,
        and middleware for request-level logic.
      </p>

      <h2 id="dynamic-routes">Dynamic Routes</h2>
      <p>
        Dynamic route segments are folder names wrapped in square brackets. They match any value
        at that position in the URL and expose the matched value via the <code>params</code> prop.
      </p>

      <pre><code>{`// src/app/blog/[slug]/page.tsx → matches /blog/hello-world, /blog/nextjs-15, etc.
// src/app/user/[id]/settings/page.tsx → matches /user/123/settings

// In Next.js 15, params is a Promise — you MUST await it
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ← must await in Next.js 15+
  const post = await getPostBySlug(slug);
  return <article>{post.content}</article>;
}

// searchParams is also a Promise in Next.js 15:
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const results = await search(q, parseInt(page));
  return <SearchResults results={results} />;
}`}</code></pre>

      <h3 id="catch-all">Catch-All and Optional Catch-All</h3>
      <p>
        Dynamic segments match exactly one segment. Catch-all segments match one or more segments.
        Optional catch-all matches zero or more.
      </p>

      <ArticleTable caption="Dynamic segment syntax and what each matches." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Syntax</th>
              <th>Folder name</th>
              <th>Matches</th>
              <th>params shape</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dynamic</td>
              <td><code>[slug]</code></td>
              <td><code>/a</code> (one segment)</td>
              <td><code>&#123; slug: "a" &#125;</code></td>
            </tr>
            <tr>
              <td>Catch-all</td>
              <td><code>[...slug]</code></td>
              <td><code>/a/b/c</code> (one or more segments)</td>
              <td><code>&#123; slug: ["a", "b", "c"] &#125;</code></td>
            </tr>
            <tr>
              <td>Optional catch-all</td>
              <td><code>[[...slug]]</code></td>
              <td><code>/</code> or <code>/a/b/c</code></td>
              <td><code>&#123; slug: undefined &#125;</code> or <code>&#123; slug: ["a", "b", "c"] &#125;</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// src/app/docs/[...slug]/page.tsx
// Matches: /docs/getting-started, /docs/api/reference/fetch, /docs/a/b/c/d

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // slug is always an array: ["getting-started"] or ["api", "reference", "fetch"]
  const breadcrumb = slug.join(" > ");
  const content = await getDocContent(slug);
  return (
    <div>
      <nav>{breadcrumb}</nav>
      <main>{content}</main>
    </div>
  );
}

// generateStaticParams — pre-render dynamic routes at build time
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug, // or slug: post.path.split("/") for catch-all
  }));
}`}</code></pre>

      <h3 id="params-promise">params is a Promise in Next.js 15</h3>
      <p>
        This is a breaking change from Next.js 14. In 14, <code>params</code> was a plain object
        you could access synchronously. In 15, it is a <code>Promise</code> that must be awaited.
        Interviewers specifically test for this because it trips up developers coming from older
        Next.js projects.
      </p>

      <pre><code>{`// Next.js 14 (OLD — breaks in 15)
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params; // synchronous access — works in 14, wrong in 15
}

// Next.js 15 (CORRECT)
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // must await
}

// The same applies to cookies() and headers() from next/headers:
import { cookies, headers } from "next/headers";

// Next.js 14
const cookieStore = cookies(); // synchronous

// Next.js 15
const cookieStore = await cookies(); // must await
const headerStore = await headers(); // must await`}</code></pre>

      <h2 id="parallel-routes">Parallel Routes</h2>
      <p>
        Parallel routes let you render multiple pages simultaneously in the same layout. Slots are
        defined using the <code>@folderName</code> convention and injected as props into the layout.
      </p>

      <pre><code>{`// Directory structure:
// src/app/
//   layout.tsx        ← receives { children, team, analytics }
//   page.tsx          → rendered as props.children
//   @team/
//     page.tsx        → rendered as props.team
//   @analytics/
//     page.tsx        → rendered as props.analytics

// src/app/layout.tsx
export default function DashboardLayout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside>{team}</aside>
      <section>{analytics}</section>
    </div>
  );
}

// Each slot is independently navigable and can have its own loading/error states
// src/app/@team/loading.tsx — only shows while the team slot is loading
// src/app/@team/error.tsx — only catches errors in the team slot`}</code></pre>

      <h3 id="parallel-use-cases">Parallel Route Use Cases</h3>
      <ul>
        <li>
          <strong>Dashboard panels</strong> — render team stats and analytics panels
          side-by-side, each loading independently.
        </li>
        <li>
          <strong>Tab views</strong> — render a tab bar where each tab is its own route with
          its own data and loading state, but no full-page navigation.
        </li>
        <li>
          <strong>Modal + content</strong> — combined with intercepting routes to show a modal
          overlay while the background page remains visible.
        </li>
      </ul>

      <pre><code>{`// The default.tsx fallback — required when navigating directly to a route
// that does not match a slot's sub-page.

// Without default.tsx, hard-navigating to /team-slug will 404 because
// the @analytics slot has no matching sub-page for that URL.

// src/app/@analytics/default.tsx
export default function AnalyticsDefault() {
  return null; // render nothing for this slot when it doesn't have a specific match
}`}</code></pre>

      <h2 id="intercepting-routes">Intercepting Routes</h2>
      <p>
        Intercepting routes show a different UI when navigating to a URL from within the app,
        compared to loading that URL directly. The canonical use case is a photo feed where
        clicking a photo shows a modal, but navigating directly to the photo URL shows the
        full photo page.
      </p>

      <pre><code>{`// Intercepting route conventions:
// (.)  — intercept a route at the same level
// (..) — intercept a route one level up
// (..)(..) — two levels up
// (...) — intercept from the root

// Example: /photos/[id] shows the full photo page when navigated to directly.
// Clicking a photo from the feed shows a modal instead (intercepted).

// src/app/
//   feed/
//     page.tsx                    → /feed (shows the photo grid)
//   photos/
//     [id]/
//       page.tsx                  → /photos/123 (full page, direct navigation)
//   (.)photos/                    ← intercepts /photos/* when coming from the same level
//     [id]/
//       page.tsx                  → modal UI shown instead of full page

// In the feed layout, both the feed and the modal slot coexist:
// src/app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}  {/* The intercepted modal renders here when active */}
    </>
  );
}`}</code></pre>

      <h2 id="route-handlers">Route Handlers (API Routes)</h2>
      <p>
        Route Handlers replace <code>pages/api/</code> from the Pages Router. They live in{" "}
        <code>app/</code> as <code>route.ts</code> files and export named HTTP method functions.
      </p>

      <pre><code>{`// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}

// src/app/api/users/[id]/route.ts
// Dynamic route handler — params are the second argument
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // params is a Promise in Next.js 15
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = await db.user.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}`}</code></pre>

      <h3 id="route-handler-patterns">Route Handler Patterns</h3>

      <pre><code>{`// Reading query params from a Route Handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const users = await db.user.findMany({ skip: (page - 1) * limit, take: limit });
  return NextResponse.json(users);
}

// Setting response headers and cookies
export async function GET() {
  const response = NextResponse.json({ data: "value" });
  response.headers.set("Cache-Control", "public, s-maxage=60");
  response.cookies.set("session", "abc123", { httpOnly: true });
  return response;
}

// Streaming a response
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 5; i++) {
        controller.enqueue(encoder.encode(\`data: chunk \${i}\\n\\n\`));
        await new Promise((r) => setTimeout(r, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// Accessing request body as different formats
export async function POST(request: NextRequest) {
  const json = await request.json();        // JSON
  const text = await request.text();        // plain text
  const form = await request.formData();    // multipart form
  const blob = await request.blob();        // binary
}`}</code></pre>

      <h2 id="middleware">middleware.ts</h2>
      <p>
        Middleware runs before every request that matches the matcher config. It runs on the
        <strong> Edge Runtime</strong> — not Node.js — which means it starts faster but has a
        limited API surface. It is the right place for auth redirects, A/B testing flags,
        geolocation routing, and request rewriting.
      </p>

      <pre><code>{`// middleware.ts — lives at the project root (src/middleware.ts or middleware.ts)
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth protection: redirect unauthenticated users to login
  const token = request.cookies.get("session-token")?.value;

  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rewrite: serve /blog content from a different path transparently
  if (pathname.startsWith("/blog")) {
    return NextResponse.rewrite(new URL("/content" + pathname, request.url));
  }

  // Add headers to the response
  const response = NextResponse.next();
  response.headers.set("X-Custom-Header", "my-value");
  return response;
}

// Matcher config: which routes the middleware runs on
export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};`}</code></pre>

      <h3 id="middleware-patterns">Common Middleware Patterns</h3>

      <pre><code>{`// Pattern 1: JWT validation without a database hit
// The edge runtime cannot access a database, but it CAN verify a JWT
import { jwtVerify } from "jose"; // edge-compatible JWT library

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("access-token")?.value;

  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret); // fast, edge-compatible
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Pattern 2: Internationalization routing
export function middleware(request: NextRequest) {
  const locale = request.cookies.get("locale")?.value
    ?? request.headers.get("accept-language")?.split(",")[0].split("-")[0]
    ?? "en";

  if (!request.nextUrl.pathname.startsWith("/" + locale)) {
    return NextResponse.redirect(new URL("/" + locale + request.nextUrl.pathname, request.url));
  }
  return NextResponse.next();
}

// Pattern 3: Propagate user context to Server Components via headers
export function middleware(request: NextRequest) {
  const token = request.cookies.get("session-token")?.value;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-token", token ?? "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Then in a Server Component:
import { headers } from "next/headers";
const headerStore = await headers();
const userToken = headerStore.get("x-user-token");`}</code></pre>

      <h3 id="middleware-edge">Edge Runtime Constraints</h3>
      <p>
        Middleware runs on the Edge Runtime. This is <strong>not Node.js</strong>. These APIs
        are unavailable:
      </p>
      <ul>
        <li>
          <code>fs</code>, <code>path</code>, <code>crypto</code> (Node.js built-ins) — use
          Web Crypto API instead (<code>crypto.subtle</code>)
        </li>
        <li>Any ORM that requires a TCP connection (Prisma, pg, MySQL2) — use HTTP-based DBs like PlanetScale HTTP or Supabase REST API</li>
        <li>Most Node.js-specific npm packages that use native bindings</li>
        <li>Dynamic requires (<code>require()</code>) — must use static ES imports</li>
      </ul>
      <p>
        Edge-compatible libraries: <code>jose</code> (JWT), <code>bcryptjs</code> (but slow at
        edge), fetch API, Web Crypto, URL, TextEncoder/Decoder.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <p>
        When asked about Route Handlers vs Server Actions, the answer is about the use case:
      </p>
      <ul>
        <li>
          <strong>Route Handlers</strong> are for external API consumers, webhooks, non-form data
          mutations, streaming responses, and when you need to control HTTP semantics precisely
          (status codes, headers, content-type).
        </li>
        <li>
          <strong>Server Actions</strong> are for form submissions and mutations triggered from
          React components — they integrate directly with React's form and transition APIs,
          support progressive enhancement, and handle revalidation automatically.
        </li>
      </ul>
      <p>
        For middleware, the key interviewer test is whether you understand it runs at the edge
        (not Node.js) and therefore cannot access databases directly. The correct pattern is
        validating a JWT in middleware (stateless) and making the database call in the Route
        Handler or Server Component downstream.
      </p>
    </div>
  );
}
