import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-app-router", title: "Why the App Router Exists", level: 2 },
  { id: "file-conventions", title: "File-Based Routing Conventions", level: 2 },
  { id: "page-layout", title: "page.tsx and layout.tsx", level: 3 },
  { id: "loading-error", title: "loading.tsx, error.tsx, not-found.tsx", level: 3 },
  { id: "template", title: "template.tsx vs layout.tsx", level: 3 },
  { id: "route-groups", title: "Route Groups", level: 2 },
  { id: "nested-layouts", title: "Nested Layouts", level: 2 },
  { id: "colocation", title: "Colocation — What Goes Where", level: 2 },
  { id: "parallel-intercepting-preview", title: "Parallel & Intercepting Routes (Preview)", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function AppRouterFundamentals() {
  return (
    <div className="article-content">
      <p>
        The App Router is the default routing system since Next.js 13 and the only system receiving
        new features. If you are interviewing for a senior Next.js role in 2025, every question about
        routing, layouts, data fetching, and Server Components assumes the App Router. This module
        builds the complete mental model from the filesystem up.
      </p>

      <h2 id="why-app-router">Why the App Router Exists</h2>
      <p>
        The Pages Router (pre-13) had one serious limitation: shared UI between routes (like a
        sidebar) had to re-mount on every navigation because the entire page component unmounted.
        Persistent layouts were awkward workarounds using <code>_app.tsx</code> and external state.
      </p>
      <p>
        The App Router introduces <strong>layouts that persist across navigations</strong>. The root
        layout never unmounts. Nested layouts only remount when their segment changes. This makes
        real shell UIs (sidebars, headers, tabs) trivial to implement correctly — and it unlocks
        React Server Components, streaming, Suspense boundaries, and per-segment caching.
      </p>

      <h2 id="file-conventions">File-Based Routing Conventions</h2>
      <p>
        Every file in <code>src/app/</code> that matches a special name has a specific role.
        Understanding the full set is critical because interviewers will probe you on edge cases.
      </p>

      <ArticleTable caption="App Router special file conventions — every file name is reserved." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Purpose</th>
              <th>Rendered when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>page.tsx</code></td>
              <td>The unique UI for this route segment. Makes the segment publicly accessible.</td>
              <td>URL matches the segment exactly</td>
            </tr>
            <tr>
              <td><code>layout.tsx</code></td>
              <td>Shared UI that wraps children. Persists across navigations within its subtree.</td>
              <td>Any child route is active</td>
            </tr>
            <tr>
              <td><code>template.tsx</code></td>
              <td>Like layout but re-mounts on every navigation. Useful for animations or resetting state.</td>
              <td>Any child route is active (new instance each nav)</td>
            </tr>
            <tr>
              <td><code>loading.tsx</code></td>
              <td>Suspense boundary fallback shown while the page or its data is streaming in.</td>
              <td>Navigating to this segment before it finishes loading</td>
            </tr>
            <tr>
              <td><code>error.tsx</code></td>
              <td>Error boundary that catches runtime errors in the subtree. Must be a Client Component.</td>
              <td>An error is thrown in the segment or its children</td>
            </tr>
            <tr>
              <td><code>not-found.tsx</code></td>
              <td>UI for <code>notFound()</code> calls or unmatched URLs within the subtree.</td>
              <td><code>notFound()</code> is called or no route matches</td>
            </tr>
            <tr>
              <td><code>route.ts</code></td>
              <td>API route handler (replaces Pages Router <code>pages/api/</code>). No UI.</td>
              <td>HTTP request matches this path</td>
            </tr>
            <tr>
              <td><code>middleware.ts</code></td>
              <td>Edge function that runs before every matched request. Lives at the project root.</td>
              <td>Request matches the <code>matcher</code> config</td>
            </tr>
            <tr>
              <td><code>default.tsx</code></td>
              <td>Fallback UI for parallel route slots that have no active match.</td>
              <td>A parallel slot has no matching sub-page</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="page-layout">page.tsx and layout.tsx</h3>
      <p>
        The most important rule: <strong>a folder is only a route if it contains a
        <code>page.tsx</code></strong>. You can have deeply nested folders with layouts and no{" "}
        <code>page.tsx</code> — those folders just organize files, they do not create accessible URLs.
      </p>

      <pre><code>{`// src/app/layout.tsx — ROOT layout (required, wraps every page)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// src/app/dashboard/layout.tsx — NESTED layout
// Wraps all pages under /dashboard without remounting between /dashboard/*, /dashboard/settings, etc.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

// src/app/dashboard/page.tsx — the page at /dashboard
export default function DashboardPage() {
  return <h1>Dashboard</h1>;
}

// src/app/dashboard/settings/page.tsx — the page at /dashboard/settings
// The DashboardLayout above stays mounted when navigating between these two routes
export default function SettingsPage() {
  return <h1>Settings</h1>;
}`}</code></pre>

      <h3 id="loading-error">loading.tsx, error.tsx, not-found.tsx</h3>
      <p>
        These three files create automatic React boundaries. Understanding what they wrap and when
        they trigger is an interview staple.
      </p>

      <pre><code>{`// src/app/dashboard/loading.tsx
// Next.js wraps page.tsx in a <Suspense> using this as the fallback.
// Shown instantly on navigation, replaced when the page's data finishes streaming.
export default function Loading() {
  return <Skeleton />;
}

// src/app/dashboard/error.tsx
// MUST be a Client Component — React error boundaries require component state.
"use client";
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// src/app/dashboard/not-found.tsx
// Triggered by calling notFound() from any Server Component in this subtree
import { notFound } from "next/navigation";

async function getUserOrNotFound(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound(); // renders not-found.tsx instead
  return user;
}`}</code></pre>

      <p>
        <strong>Critical:</strong> <code>error.tsx</code> does NOT catch errors in the layout at
        the same level — only in the page and its children. To catch layout errors, put the
        <code>error.tsx</code> one level up. This is a common interview question.
      </p>

      <h3 id="template">template.tsx vs layout.tsx</h3>
      <p>
        <code>layout.tsx</code> persists across navigations — React keeps the same component
        instance, so state and effects survive. <code>template.tsx</code> creates a{" "}
        <strong>new instance on every navigation</strong> — state resets, effects re-run.
      </p>

      <pre><code>{`// Use template.tsx when:
// 1. You need enter/exit animations that reset on each navigation
// 2. You need useEffect to re-run on every page visit within this segment
// 3. You want to reset form state between pages

// src/app/(marketing)/template.tsx
"use client";
import { motion } from "framer-motion";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}
// This animation plays fresh on every navigation within (marketing)
// A layout.tsx would keep the same instance, making the animation only fire once`}</code></pre>

      <h2 id="route-groups">Route Groups</h2>
      <p>
        Folders wrapped in parentheses — <code>(group)</code> — are <strong>route groups</strong>.
        They group routes and layouts without affecting the URL. The folder name is invisible in the
        URL path.
      </p>

      <pre><code>{`// Directory structure:
// src/app/
//   (hub)/
//     layout.tsx    ← applies to dashboard and settings, NOT to /
//     dashboard/page.tsx   → URL: /dashboard
//     settings/page.tsx    → URL: /settings
//   (marketing)/
//     layout.tsx    ← different shell for marketing pages
//     page.tsx             → URL: /
//     about/page.tsx       → URL: /about

// This lets you have:
// - Dashboard pages with the hub shell (sidebar, topbar)
// - Marketing pages with a minimal layout
// - Both at the same URL depth without layout conflicts`}</code></pre>

      <p>
        Route groups also let you have <strong>multiple root layouts</strong>. Each group can have
        its own root <code>layout.tsx</code> with its own <code>&lt;html&gt;</code> tag — useful
        when your marketing site and app have completely different HTML shells.
      </p>

      <h2 id="nested-layouts">Nested Layouts</h2>
      <p>
        Layouts compose like Russian dolls. Each layout wraps all layouts and pages below it. The
        key mental model: navigation within a segment only remounts components below the segment
        boundary — layouts above stay mounted.
      </p>

      <pre><code>{`// src/app/
//   layout.tsx                  ← Level 1: always mounted (html, body)
//   (hub)/
//     layout.tsx                ← Level 2: mounted for all hub pages
//     dashboard/
//       layout.tsx              ← Level 3: mounted only for dashboard sub-pages
//       page.tsx                → /dashboard
//       analytics/page.tsx      → /dashboard/analytics (layouts 1+2+3 stay, only page swaps)
//       settings/page.tsx       → /dashboard/settings  (layouts 1+2+3 stay, only page swaps)
//     profile/page.tsx          → /profile (layouts 1+2 stay, level 3 unmounts)

// When navigating from /dashboard to /dashboard/analytics:
// - RootLayout stays mounted
// - HubLayout stays mounted
// - DashboardLayout stays mounted
// - Only the page component (DashboardPage → AnalyticsPage) swaps

// When navigating from /dashboard/analytics to /profile:
// - RootLayout stays mounted
// - HubLayout stays mounted
// - DashboardLayout UNMOUNTS (different segment boundary)
// - ProfilePage mounts`}</code></pre>

      <h2 id="colocation">Colocation — What Goes Where</h2>
      <p>
        Non-special files inside <code>app/</code> are ignored by the router. This means you can
        colocate components, utilities, and tests right next to the pages that use them.
      </p>

      <pre><code>{`// These files inside app/ are NOT routes (no page.tsx at their level)
src/app/
  dashboard/
    page.tsx              ← this IS a route
    _components/          ← underscore prefix: never a route
      StatsCard.tsx       ← colocated, only used by dashboard
    _hooks/
      useMetrics.ts
    _utils/
      formatData.ts

// Alternatively, use a src/components/ directory for shared components
// and keep app/ clean for only routing files`}</code></pre>

      <h2 id="parallel-intercepting-preview">Parallel & Intercepting Routes (Preview)</h2>
      <p>
        These are advanced routing features covered in depth in the next module. Here is the shape
        so you recognize the syntax:
      </p>

      <pre><code>{`// Parallel routes: render multiple pages simultaneously in the same layout
// Uses @slot convention:
// src/app/
//   layout.tsx           ← receives { children, team, analytics } props
//   @team/page.tsx       → props.team
//   @analytics/page.tsx  → props.analytics
//   page.tsx             → props.children

// Intercepting routes: show a different UI for a URL when navigating from
// within the app vs loading the URL directly (modal patterns)
// Uses (.), (..), (...) prefix: matches same level, parent level, root`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Forgetting <code>page.tsx</code> makes a route accessible.</strong> A folder with
          only a <code>layout.tsx</code> is not a route — navigating to it returns 404.
        </li>
        <li>
          <strong>Using <code>"use client"</code> in <code>layout.tsx</code> unnecessarily.</strong>
          {" "}Layouts are Server Components by default. Only add <code>"use client"</code> if you
          need browser APIs or interactivity at the layout level.
        </li>
        <li>
          <strong>Putting <code>error.tsx</code> at the wrong level.</strong> The error boundary
          does not catch errors in the layout at the same directory level. Move it up one level.
        </li>
        <li>
          <strong>Assuming <code>loading.tsx</code> shows for client-side navigations
          with cached data.</strong> If data is already in the router cache, loading.tsx may not
          appear. It is guaranteed to show on fresh navigations.
        </li>
        <li>
          <strong>Forgetting <code>await params</code> in Next.js 15+.</strong> The{" "}
          <code>params</code> prop is now a Promise. Accessing <code>params.slug</code> directly
          will give you a Promise object, not the slug string.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <p>
        When asked "walk me through how Next.js App Router routing works," lead with the
        filesystem-to-URL mapping, then explain layouts and their persistence model, then cover
        the special files. End with a concrete example that shows you understand the composition model.
      </p>

      <pre><code>{`// A complete answer example you can walk through:
// "The App Router maps the filesystem to URLs.
// src/app/blog/[slug]/page.tsx → /blog/:slug
// Layouts wrap the page and persist across navigations within their subtree.
// loading.tsx automatically wraps the page in a Suspense boundary.
// error.tsx catches runtime errors in the subtree below its level.
// Route groups (parentheses folders) let you share a layout across routes
// without adding to the URL."

// The code you should be able to draw from memory:
// src/app/(hub)/layout.tsx
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hub-shell">
      <Sidebar />
      <div className="hub-content">{children}</div>
    </div>
  );
}

// src/app/(hub)/dashboard/page.tsx
export default async function DashboardPage() {
  return <Dashboard />;
}

// In Next.js 15, params is a Promise:
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // must await in Next.js 15+
  const post = await getPost(slug);
  return <article>{post.content}</article>;
}`}</code></pre>
    </div>
  );
}
