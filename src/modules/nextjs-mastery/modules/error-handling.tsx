import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-errors-need-architecture", title: "Why Error Handling Needs Architecture", level: 2 },
  { id: "app-router-error-files", title: "App Router: error.tsx and global-error.tsx", level: 2 },
  { id: "error-boundary-propagation", title: "Error Boundary Propagation", level: 3 },
  { id: "not-found", title: "not-found.tsx and the notFound() Function", level: 2 },
  { id: "server-component-errors", title: "Async Errors in Server Components", level: 2 },
  { id: "server-action-errors", title: "Error Handling in Server Actions", level: 2 },
  { id: "route-handler-errors", title: "Error Handling in Route Handlers", level: 2 },
  { id: "pages-router-errors", title: "Pages Router: _error.tsx, 404.tsx, 500.tsx", level: 2 },
  { id: "pages-vs-app-comparison", title: "Pages Router vs App Router Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Error Recovery System", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

const errorPropagationDiagram = String.raw`flowchart TD
  A["Request hits /dashboard/settings"]
  A --> B["Root layout.tsx"]
  B --> C["dashboard/layout.tsx"]
  C --> D["dashboard/settings/page.tsx"]
  D -->|"throws Error"| E{{"Nearest error.tsx?"}}
  E -->|"dashboard/settings/error.tsx exists"| F["Renders dashboard/settings/error.tsx\nLayout above stays intact"]
  E -->|"no error.tsx in settings"| G{{"dashboard/error.tsx exists?"}}
  G -->|"yes"| H["Renders dashboard/error.tsx\nReplaces settings segment only"]
  G -->|"no"| I{{"Root app/error.tsx?"}}
  I -->|"yes"| J["Root error.tsx renders\nReplaces everything under root layout"]
  I -->|"no"| K["global-error.tsx\nReplaces the ENTIRE page including root layout"]
  J --> L["User sees error UI\nCan call reset() to retry"]
  H --> L
  F --> L
  K --> M["Minimal fallback with html+body\nNo nav, no shell"]`;

const serverActionFlowDiagram = String.raw`sequenceDiagram
  participant Client as Client Component
  participant SA as Server Action
  participant DB as Database / Service
  participant Cache as Next.js Cache

  Client->>SA: call createPost(formData)
  SA->>SA: validate input (zod/manual)
  alt Validation fails
    SA-->>Client: return { error: "Title is required" }
    Client->>Client: display inline error — NO throw
  end
  SA->>DB: db.post.create(...)
  alt DB throws
    DB-->>SA: throws PrismaClientError
    SA->>SA: catch -> return { error: "Failed to save post" }
    SA-->>Client: return { error: "..." }
  end
  SA->>Cache: revalidatePath("/posts")
  SA-->>Client: return { success: true, post }`;

export default function ErrorHandling() {
  return (
    <div className="article-content">
      <p>
        Error handling in Next.js is not a single API — it is a layered system where the right
        choice depends on where the error originates (Server Component, Client Component, Server
        Action, Route Handler), how recoverable it is, and how much surrounding UI should survive.
        Getting this wrong means either swallowing errors silently or unnecessarily destroying your
        entire shell layout when only a single data fetch fails. Senior engineers know exactly which
        boundary to place where and why.
      </p>

      <h2 id="why-errors-need-architecture">Why Error Handling Needs Architecture</h2>
      <p>
        A naive implementation places a single <code>try/catch</code> around everything or relies on
        the default Next.js error page. Both approaches fail at scale. A single catch-all destroys
        context — you cannot tell if the user&apos;s profile fetch failed or if the entire payment system
        is down. The default error page tears down your navigation, sidebar, and app shell, forcing
        users to use the browser back button to recover.
      </p>
      <p>
        The correct mental model: <strong>errors should propagate upward through a hierarchy of
        boundaries, each one catching what it can handle and letting others bubble</strong>. An
        error inside a settings panel should not destroy the dashboard sidebar. An error in a
        non-critical widget should not prevent the rest of the page from rendering.
      </p>
      <p>
        The App Router makes this hierarchy explicit with co-located <code>error.tsx</code> files.
        The Pages Router achieves a coarser version with <code>_error.tsx</code>, <code>404.tsx</code>,
        and <code>500.tsx</code>. Both systems plus Server Actions and Route Handlers each have
        distinct patterns — and conflating them is one of the most common mistakes in senior
        interviews.
      </p>

      <h2 id="app-router-error-files">App Router: error.tsx and global-error.tsx</h2>
      <p>
        In the App Router, you place an <code>error.tsx</code> file inside any route segment
        directory. Next.js automatically wraps that segment&apos;s <code>page.tsx</code> (and all
        its children) in a React error boundary. The key constraint:{" "}
        <strong><code>error.tsx</code> must be a Client Component</strong> because React error
        boundaries are class-based under the hood and require client-side lifecycle methods.
      </p>

      <pre><code>{`// app/dashboard/error.tsx — catches errors in /dashboard/** routes
"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to your error reporting service (Sentry, Datadog, etc.)
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong in the dashboard</h2>
      <p className="text-sm text-muted-foreground">
        {error.digest ? \`Error ID: \${error.digest}\` : error.message}
      </p>
      <button
        onClick={reset}  // Attempts to re-render the segment — re-runs the Server Component
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
`}</code></pre>

      <p>
        The <code>reset</code> prop is a function provided by Next.js that attempts to re-render
        the error boundary&apos;s children. It is essentially a retry — it will re-run the Server
        Component data fetch. <strong>The most common mistake is calling <code>reset()</code>
        without clearing any client-side state that caused the error</strong>, resulting in an
        infinite retry loop.
      </p>
      <p>
        The <code>error.digest</code> property is a deterministic hash Next.js generates for
        server-side errors. In production, actual error messages are redacted from the client for
        security — only the digest is surfaced. You match the digest against your server logs to
        find the real stack trace. Always log <code>error.digest</code> to your error monitoring
        service.
      </p>

      <h3 id="error-boundary-propagation">Error Boundary Propagation</h3>
      <p>
        Understanding propagation is critical. When a Server Component throws, Next.js walks up the
        segment tree looking for the nearest <code>error.tsx</code>. Everything above that boundary
        stays mounted — the root layout, navigation, and any parent layouts remain intact. Only the
        failing segment and its subtree are replaced by the error UI.
      </p>

      <MermaidDiagram
        chart={errorPropagationDiagram}
        title="Error Boundary Propagation Through Segment Tree"
        caption="Errors bubble upward through error.tsx files. The nearest ancestor boundary catches the error, leaving layouts above it intact."
        minHeight={480}
      />

      <p>
        <code>global-error.tsx</code> is the last resort. It lives in the root <code>app/</code>
        directory and catches errors that escape all other boundaries — including errors in the root
        layout itself. Because it replaces the entire document, it{" "}
        <strong>must render its own <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code> tags</strong>.
        This is the one place where you lose all navigation and shell UI.
      </p>

      <pre><code>{`// app/global-error.tsx — the absolute last resort
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    // MUST include html and body — this replaces the root layout
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1>Critical error</h1>
          <p>The application encountered an unrecoverable error.</p>
          <button onClick={reset}>Reload</button>
        </div>
      </body>
    </html>
  );
}
`}</code></pre>

      <h2 id="not-found">not-found.tsx and the notFound() Function</h2>
      <p>
        <strong>404s are not errors</strong> — they are expected conditions that should be handled
        separately from runtime exceptions. The App Router handles them with{" "}
        <code>not-found.tsx</code> and the <code>notFound()</code> function imported from{" "}
        <code>next/navigation</code>.
      </p>

      <pre><code>{`// app/blog/[slug]/page.tsx — Server Component
import { notFound } from "next/navigation";
import { getPost } from "@/lib/db";

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;  // params is a Promise in Next.js App Router
  const post = await getPost(slug);

  if (!post) {
    notFound(); // Throws a special NEXT_NOT_FOUND — stops execution immediately
    // Never reached — notFound() throws, no return needed
  }

  return <article>{post.title}</article>;
}
`}</code></pre>

      <pre><code>{`// app/blog/[slug]/not-found.tsx — rendered when notFound() is called in this segment
export default function PostNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2>Post not found</h2>
      <p>The article you are looking for does not exist or has been removed.</p>
      <a href="/blog">Back to blog</a>
    </div>
  );
}
// No "use client" needed — this is a Server Component
`}</code></pre>

      <p>
        If no segment-level <code>not-found.tsx</code> exists, Next.js falls back to the nearest
        ancestor&apos;s <code>not-found.tsx</code>, and finally to <code>app/not-found.tsx</code> which
        serves as the global 404. The <strong>critical distinction from <code>error.tsx</code></strong>:{" "}
        <code>not-found.tsx</code> does NOT need to be a Client Component and does NOT receive an
        error prop — it is just a Server Component that renders a friendly &quot;nothing here&quot; message.
      </p>

      <h2 id="server-component-errors">Async Errors in Server Components</h2>
      <p>
        Server Components are async by default, which means data fetching errors are unhandled
        promise rejections unless you explicitly catch them. The two patterns are: let errors
        propagate to the nearest <code>error.tsx</code>, or handle them locally and render graceful
        fallbacks.
      </p>

      <pre><code>{`// Pattern 1: Let it bubble to error.tsx
// Good for: critical data that the page cannot render without
export default async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  // If db throws, error.tsx catches it — page renders nothing
  return <div>{user.name}</div>;
}

// Pattern 2: Graceful local fallback
// Good for: non-critical data (widgets, recommendations, analytics)
export default async function RecommendedPosts() {
  let posts: Post[] = [];
  try {
    posts = await fetchRecommendations();
  } catch (err) {
    // Log it, but don't destroy the page over a recommendation widget
    console.error("Recommendations failed:", err);
    return null; // or a "Could not load recommendations" UI
  }
  return <PostList posts={posts} />;
}

// Pattern 3: Parallel fetches with individual error isolation
export default async function Dashboard() {
  // allSettled resolves ALL promises even if some reject
  const [userResult, statsResult] = await Promise.allSettled([
    fetchUser(),
    fetchStats(),
  ]);

  const user = userResult.status === "fulfilled" ? userResult.value : null;
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;

  return (
    <>
      {user ? <UserCard user={user} /> : <ErrorCard message="Could not load profile" />}
      {stats ? <StatsPanel stats={stats} /> : <ErrorCard message="Stats unavailable" />}
    </>
  );
}
`}</code></pre>

      <p>
        The most common production mistake: using <code>Promise.all</code> instead of{" "}
        <code>Promise.allSettled</code> for parallel data fetches. A single rejected promise in{" "}
        <code>Promise.all</code> rejects the entire call, destroying all data and triggering the
        error boundary. <code>Promise.allSettled</code> lets you inspect each result individually
        and render partial UI.
      </p>

      <h2 id="server-action-errors">Error Handling in Server Actions</h2>
      <p>
        Server Actions have a nuanced error model. <strong>Never throw an error from a Server Action
        to communicate validation failures or expected business logic errors</strong> — thrown errors
        in Server Actions are caught by the nearest error boundary (if called from a Client
        Component) or crash the request. Instead, return error objects explicitly.
      </p>

      <MermaidDiagram
        chart={serverActionFlowDiagram}
        title="Server Action Error Flow"
        caption="Server Actions return error objects for expected failures. Unexpected throws bubble to the error boundary. The client inspects the return value, not a catch block."
        minHeight={420}
      />

      <pre><code>{`// lib/actions/post.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(10, "Body must be at least 10 characters"),
});

type ActionResult =
  | { success: true; postId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createPost(formData: FormData): Promise<ActionResult> {
  // 1. Validate — return errors, don't throw
  const parsed = CreatePostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. Business logic — catch unexpected throws, return structured errors
  try {
    const post = await db.post.create({ data: parsed.data });
    revalidatePath("/blog");
    return { success: true, postId: post.id };
  } catch (err) {
    // Log the real error server-side, return a safe message to the client
    console.error("Failed to create post:", err);
    return { success: false, error: "Failed to save post. Please try again." };
  }
}
`}</code></pre>

      <pre><code>{`// components/CreatePostForm.tsx
"use client";

import { useActionState } from "react";
import { createPost } from "@/lib/actions/post";

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" />
      {state?.fieldErrors?.title && (
        <p className="text-red-400 text-sm">{state.fieldErrors.title[0]}</p>
      )}

      <textarea name="body" placeholder="Body" />
      {state?.fieldErrors?.body && (
        <p className="text-red-400 text-sm">{state.fieldErrors.body[0]}</p>
      )}

      {state && !state.success && !state.fieldErrors && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Post"}
      </button>
    </form>
  );
}
`}</code></pre>

      <h2 id="route-handler-errors">Error Handling in Route Handlers</h2>
      <p>
        Route Handlers (<code>app/api/**/route.ts</code>) have no error boundary concept — they are
        HTTP endpoints, so errors must translate to appropriate HTTP responses. An uncaught throw
        results in a <code>500 Internal Server Error</code> with no body. The production pattern is
        explicit error responses with correct status codes.
      </p>

      <pre><code>{`// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  let post;
  try {
    post = await db.post.findUnique({ where: { id } });
  } catch (err) {
    console.error("DB error fetching post:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // 404, not 500 — the resource is simply absent
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function POST(req: NextRequest) {
  // Auth check — 401/403 before doing any work
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ... rest of handler
}
`}</code></pre>

      <p>
        The most common Route Handler mistake: returning a 200 with an error body (
        <code>{"{ error: \"something went wrong\" }"}</code> with status 200). Clients that check
        only the status code will treat this as success. Always use semantically correct HTTP status
        codes — <code>400</code> for bad input, <code>401</code> for unauthenticated,{" "}
        <code>403</code> for unauthorized, <code>404</code> for missing resources,{" "}
        <code>422</code> for validation errors, <code>500</code> for server faults.
      </p>

      <h2 id="pages-router-errors">Pages Router: _error.tsx, 404.tsx, 500.tsx</h2>
      <p>
        The Pages Router predates React error boundaries and uses a different model. Errors in{" "}
        <code>getServerSideProps</code> or <code>getStaticProps</code> do not propagate through a
        component tree — they are caught by Next.js at the page level and forwarded to a dedicated
        error page.
      </p>

      <pre><code>{`// pages/404.tsx — shown for any 404; cannot use getServerSideProps
export default function Custom404() {
  return (
    <div>
      <h1>404 — Page Not Found</h1>
      <a href="/">Go home</a>
    </div>
  );
}
// Static-only — can use getStaticProps if you need build-time data
// getServerSideProps is NOT allowed here
`}</code></pre>

      <pre><code>{`// pages/500.tsx — shown for server-side errors in production
export default function Custom500() {
  return (
    <div>
      <h1>500 — Server Error</h1>
      <p>We encountered an internal error. Please try again later.</p>
    </div>
  );
}
// Also static — neither getServerSideProps nor getStaticProps allowed
`}</code></pre>

      <pre><code>{`// pages/_error.tsx — handles ALL errors: 400s, 500s, and client-side throws
// This is what Next.js uses internally if 404.tsx / 500.tsx are absent
import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div>
      {statusCode
        ? \`An error \${statusCode} occurred on the server\`
        : "An error occurred on the client"}
    </div>
  );
}

// The only Pages Router error component that receives a status code at runtime
Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? 500 : 404;
  return { statusCode };
};

export default Error;
`}</code></pre>

      <p>
        The Pages Router limitation: <code>_error.tsx</code> completely replaces the page — your{" "}
        <code>_app.tsx</code> layout still wraps it, but any segment-level layouts are gone. There
        is no equivalent of &quot;catch the error in this section but keep the rest of the page.&quot; This
        is the primary motivation for the App Router&apos;s granular error boundary model.
      </p>

      <h2 id="pages-vs-app-comparison">Pages Router vs App Router Comparison</h2>

      <ArticleTable
        caption="Comparing error handling capabilities between the Pages Router and App Router."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Pages Router</th>
              <th>App Router</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Granular error boundaries</td>
              <td>No — page-level only</td>
              <td>Yes — per-segment <code>error.tsx</code></td>
              <td>App Router keeps layouts intact on error</td>
            </tr>
            <tr>
              <td>Custom 404</td>
              <td><code>pages/404.tsx</code> (static)</td>
              <td><code>app/not-found.tsx</code> + <code>notFound()</code></td>
              <td>App Router allows Server Component 404s with fetched data</td>
            </tr>
            <tr>
              <td>Custom 500</td>
              <td><code>pages/500.tsx</code> (static)</td>
              <td><code>app/global-error.tsx</code> (client)</td>
              <td><code>global-error.tsx</code> must render its own <code>&lt;html&gt;</code></td>
            </tr>
            <tr>
              <td>Status code access in error UI</td>
              <td><code>_error.tsx</code> via <code>getInitialProps</code></td>
              <td><code>error.digest</code> in <code>error.tsx</code></td>
              <td>App Router redacts messages in prod; only digest exposed</td>
            </tr>
            <tr>
              <td>Retry / recovery</td>
              <td>Manual navigation required</td>
              <td><code>reset()</code> prop on <code>error.tsx</code></td>
              <td><code>reset()</code> re-runs the failed Server Component</td>
            </tr>
            <tr>
              <td>Error in layout</td>
              <td>Crashes to <code>_error.tsx</code></td>
              <td>Bubbles to parent <code>error.tsx</code> or <code>global-error.tsx</code></td>
              <td>App Router layouts have their own error hierarchy</td>
            </tr>
            <tr>
              <td>Client-side component errors</td>
              <td>Reaches <code>_error.tsx</code> via Next.js catch-all</td>
              <td>Caught by nearest <code>error.tsx</code> boundary</td>
              <td>Both require a client component as the boundary</td>
            </tr>
            <tr>
              <td>Server Action errors</td>
              <td>N/A (no Server Actions)</td>
              <td>Return error objects; thrown errors hit <code>error.tsx</code></td>
              <td>Never throw for expected errors in Server Actions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: Where do you put error handling in the App Router?"
        intro="Weak answers name a single file. Strong answers describe the hierarchy and explain WHY each layer exists — the key insight is that different errors have different scopes of impact."
        steps={[
          "Open by separating three concerns: runtime errors (error.tsx), expected 404s (not-found.tsx + notFound()), and catastrophic root failures (global-error.tsx). Never conflate them.",
          "Explain the propagation model: error.tsx is co-located with the segment it protects; Next.js walks upward until it finds the nearest one. The critical production implication: layouts above the boundary stay mounted — users keep their navigation.",
          "Cover the production gotcha: in production, error.message is redacted for security — only error.digest is surfaced to the client. Connect this to your error monitoring workflow: log the digest to Sentry or Datadog and correlate against server logs that contain the real stack trace.",
          "Mention the reset() retry mechanism and its failure mode: calling reset() without clearing the state that caused the error creates an infinite retry loop.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: How do you handle errors in Server Actions?"
        intro="This question separates engineers who have built real forms from those who have only read the docs. The distinction between thrown errors and returned error objects is the core of a strong answer."
        steps={[
          "Lead with the rule: throw only for unexpected, unrecoverable errors (like a database being unreachable). Return structured error objects for expected failures — validation errors, business rule violations, not-found conditions.",
          "Explain why this matters: thrown errors from Server Actions bubble to the nearest error.tsx boundary, destroying the form UI and all surrounding context. A returned { success: false, error: string } lets the form display inline validation messages without losing state.",
          "Show the pattern: useActionState (formerly useFormState) receives the action and previous state, giving you the error object on the client without additional fetching or global state management.",
          "Cover the security implication: in production, messages thrown from Server Actions are sanitized before reaching the client. Only return safe, user-facing messages; log the real error server-side with full context.",
        ]}
      />

      <h2 id="challenge">Challenge: Error Recovery System</h2>

      <InterviewChallenge
        title="Build a Resilient Dashboard with Partial Error Recovery"
        scenario={
          <>
            You are building a dashboard at <code>/dashboard</code> that renders three independent
            panels: a <strong>UserStats</strong> panel (fetches from your own DB), an{" "}
            <strong>ExternalMetrics</strong> panel (fetches from a third-party API known to be
            flaky — fails roughly 20% of requests), and a <strong>RecentActivity</strong> panel
            (fetches from your DB). The sidebar navigation must never disappear, even if all three
            panels fail. Users must be able to retry individual failing panels without reloading the
            full page.
          </>
        }
        tasks={[
          "Design the file structure: where do error.tsx files go and how many do you need? What is the minimum set that satisfies the requirement that the sidebar never disappears?",
          "The ExternalMetrics panel is known to fail 20% of the time. Should you use an error.tsx boundary for it or handle the error locally in the Server Component? Justify your choice with a concrete tradeoff.",
          "Implement a Server Action createActivityEntry(formData) that validates input, handles database errors, and returns structured responses. Show the Client Component form that uses useActionState to display inline errors without triggering an error boundary.",
          "In production, a user reports seeing only an error digest in the dashboard error UI with no human-readable description. Explain what is happening, how you would find the real error, and what change you would make to error.tsx to give users better context without exposing internals.",
        ]}
        pitfalls={[
          "Placing a single error.tsx at the dashboard root level — this catches everything but destroys all three panels when only one fails, and may also destroy the sidebar.",
          "Using Promise.all for parallel panel fetches — one rejection kills all three panels. Promise.allSettled is the correct tool here.",
          "Throwing from the Server Action on validation failure — this triggers the error boundary and destroys the form instead of showing inline validation messages.",
          "Assuming error.tsx catches notFound() calls — notFound() throws a special NEXT_NOT_FOUND that bypasses error.tsx and targets not-found.tsx instead.",
        ]}
        signal="The candidate explains that the sidebar is protected by placing error.tsx files at the individual panel segment level — or by using local try/catch for components that are not in their own route segment. They choose local error handling for ExternalMetrics because flakiness is expected behavior, not exceptional, so an error boundary's reset() mechanism adds complexity without value. They implement the Server Action with a typed return union and demonstrate useActionState correctly."
      />

      <SolutionReveal difficulty="hard">
        <p>
          <strong>File structure for partial recovery:</strong>
        </p>
        <pre><code>{`app/
  dashboard/
    layout.tsx        <- sidebar lives here; error.tsx at THIS level would remove it
    page.tsx          <- composes the three panels with Promise.allSettled
    error.tsx         <- catches errors in page.tsx itself (e.g. auth checks)
    // For components on a single page.tsx, use local try/catch
    // error.tsx only protects route segments, not arbitrary components within them
`}</code></pre>
        <p>
          <strong>Key insight:</strong> <code>error.tsx</code> protects route{" "}
          <em>segments</em> (i.e., <code>page.tsx</code> and <code>layout.tsx</code>), not
          arbitrary components rendered inside them. If your three panels are components within a
          single <code>page.tsx</code>, use local error handling with <code>Promise.allSettled</code>,
          not separate error boundaries.
        </p>
        <pre><code>{`// app/dashboard/page.tsx — partial failure with Promise.allSettled
export default async function DashboardPage() {
  const [statsResult, metricsResult, activityResult] = await Promise.allSettled([
    fetchUserStats(),
    fetchExternalMetrics(), // known-flaky: local handling, not error boundary
    fetchRecentActivity(),
  ]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {statsResult.status === "fulfilled" ? (
        <UserStats data={statsResult.value} />
      ) : (
        <PanelError message="Could not load stats" />
      )}
      {metricsResult.status === "fulfilled" ? (
        <ExternalMetrics data={metricsResult.value} />
      ) : (
        <PanelError message="External metrics unavailable" />
      )}
      {activityResult.status === "fulfilled" ? (
        <RecentActivity data={activityResult.value} />
      ) : (
        <PanelError message="Could not load activity" />
      )}
    </div>
  );
}
`}</code></pre>
        <pre><code>{`// lib/actions/activity.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({ note: z.string().min(1).max(500) });

type Result = { success: true } | { success: false; error: string };

export async function createActivityEntry(
  _prev: unknown,
  formData: FormData
): Promise<Result> {
  const parsed = schema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  try {
    await db.activity.create({ data: parsed.data });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("createActivityEntry failed:", err);
    return { success: false, error: "Failed to save. Please try again." };
  }
}
`}</code></pre>
        <p>
          <strong>For the production digest question:</strong> Next.js redacts error messages
          in production and replaces them with a deterministic <code>digest</code> for security.
          The fix is a two-part change: (1) update your <code>error.tsx</code> to show a
          user-friendly message plus the digest as a &quot;reference code&quot; users can quote to support
          staff, and (2) configure your error monitoring service (Sentry, Datadog) to capture the
          digest alongside the server-side stack trace, so you can correlate the two. Never expose
          the real error message or stack trace to the client in production.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>error.tsx catches runtime errors in route segments</strong> and must be a Client
          Component. It preserves all layouts above it in the tree — only the failing segment is
          replaced. Use <code>error.digest</code> for production error correlation, never expose raw
          error messages.
        </li>
        <li>
          <strong>not-found.tsx and notFound() handle 404s separately from errors.</strong>{" "}
          <code>notFound()</code> does not trigger <code>error.tsx</code> — it targets the nearest{" "}
          <code>not-found.tsx</code> instead. Treat missing resources as expected conditions, not
          exceptions.
        </li>
        <li>
          <strong>Server Actions must return error objects for expected failures, never throw.</strong>{" "}
          Thrown errors hit the error boundary and destroy the surrounding UI. Use{" "}
          <code>useActionState</code> to surface returned errors as inline form validation without
          losing page context.
        </li>
        <li>
          <strong>Use Promise.allSettled over Promise.all for parallel data fetches</strong> when
          partial rendering is acceptable. A single rejection in <code>Promise.all</code> discards
          all results; <code>Promise.allSettled</code> lets each result succeed or fail independently.
        </li>
        <li>
          <strong>global-error.tsx is the last resort</strong> and must render its own{" "}
          <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code> tags because it replaces the entire
          document, including the root layout. Reserve it for root layout failures only.
        </li>
        <li>
          <strong>Route Handlers must return semantically correct HTTP status codes.</strong>{" "}
          Returning <code>{"{ error: \"...\" }"}</code> with status 200 is a subtle but serious bug.
          Unhandled throws produce a 500 with no body — always wrap business logic in try/catch and
          return typed <code>NextResponse.json</code> with the appropriate status.
        </li>
      </ul>
    </div>
  );
}
