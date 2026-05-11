import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const navigationLifecycleDiagram = String.raw`flowchart TD
  CLICK["User clicks <Link href='/dashboard'>"]
  CLICK --> INTERCEPT["Next.js router intercepts<br/>(no full page reload)"]
  INTERCEPT --> PREFETCH{"Was route prefetched?<br/>(Link in viewport triggers prefetch)"}
  PREFETCH -->|"Yes — use cached RSC payload"| RECONCILE["React reconciles new RSC payload<br/>into current page tree"]
  PREFETCH -->|"No — fetch RSC payload now"| FETCH["Fetch RSC payload from server<br/>(lightweight JSON-like format, not HTML)"]
  FETCH --> RECONCILE
  RECONCILE --> SCROLL["Scroll to top (or anchor)<br/>Browser history entry added"]
  SCROLL --> INTERACTIVE["Page is interactive<br/>Client components re-mount if needed"]`;

const hookDecisionDiagram = String.raw`flowchart TD
  NEED["What do you need?"]
  NEED --> A{"Current pathname<br/>(e.g. /dashboard)"}
  NEED --> B{"URL search params<br/>(e.g. ?page=2)"}
  NEED --> C{"Dynamic route params<br/>(e.g. /blog/[slug])"}
  NEED --> D{"Navigate programmatically<br/>(push, replace, back)"}
  NEED --> E{"Active nav segment<br/>for layout highlighting"}

  A --> usePathname["usePathname()"]
  B --> useSearchParams["useSearchParams()<br/>⚠️ Requires Suspense boundary"]
  C --> useParams["useParams()"]
  D --> useRouter["useRouter()"]
  E --> useSelectedLayoutSegment["useSelectedLayoutSegment()"]`;

export const toc: TocItem[] = [
  { id: "next-router-vs-next-navigation", title: "next/router vs next/navigation", level: 2 },
  { id: "use-router", title: "useRouter (App Router)", level: 2 },
  { id: "use-pathname", title: "usePathname", level: 2 },
  { id: "use-search-params", title: "useSearchParams", level: 2 },
  { id: "use-params", title: "useParams", level: 2 },
  { id: "use-selected-layout-segment", title: "useSelectedLayoutSegment", level: 2 },
  { id: "programmatic-navigation", title: "Programmatic Navigation Patterns", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function NavigationHooks() {
  return (
    <div className="article-content">
      <p>
        One of the most common sources of bugs when migrating from Pages Router to App Router is
        the navigation hooks. The APIs changed significantly — <code>next/router</code> and{" "}
        <code>next/navigation</code> are not compatible, and several properties that existed in the
        Pages Router <code>useRouter</code> hook were split into separate hooks in the App Router.
        This module clarifies the differences and covers every navigation hook available in the
        App Router.
      </p>

      <h2 id="next-router-vs-next-navigation">next/router vs next/navigation</h2>
      <p>
        <strong>Do not mix these up.</strong> They are completely separate packages with different
        APIs. Using <code>next/router</code> in an App Router component will throw an error at
        runtime because the Pages Router context does not exist.
      </p>

      <MermaidDiagram
        chart={navigationLifecycleDiagram}
        title="App Router Navigation Lifecycle"
        caption="App Router navigation is client-side: the router fetches a lightweight RSC payload (not full HTML), reconciles it into the existing React tree, and updates the URL. No full page reload occurs."
        minHeight={520}
      />

      <ArticleTable caption="next/router (Pages Router) vs next/navigation (App Router) — the APIs are NOT interchangeable." minWidth={920}>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>next/router (Pages Router)</th>
              <th>next/navigation (App Router)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Import</td>
              <td><code>import {'{'} useRouter {'}'} from &apos;next/router&apos;</code></td>
              <td><code>import {'{'} useRouter {'}'} from &apos;next/navigation&apos;</code></td>
            </tr>
            <tr>
              <td>pathname</td>
              <td><code>router.pathname</code> — template path like <code>/blog/[slug]</code></td>
              <td>Not on useRouter. Use <code>usePathname()</code> instead.</td>
            </tr>
            <tr>
              <td>query / params</td>
              <td><code>router.query</code> — includes both params and search params</td>
              <td>Not on useRouter. Use <code>useParams()</code> and <code>useSearchParams()</code> separately.</td>
            </tr>
            <tr>
              <td>push()</td>
              <td><code>router.push(url, as?, options?)</code></td>
              <td><code>router.push(href, options?)</code> — no <code>as</code> parameter</td>
            </tr>
            <tr>
              <td>replace()</td>
              <td><code>router.replace(url, as?, options?)</code></td>
              <td><code>router.replace(href, options?)</code></td>
            </tr>
            <tr>
              <td>refresh()</td>
              <td>Not available</td>
              <td><code>router.refresh()</code> — re-fetches Server Components without navigation</td>
            </tr>
            <tr>
              <td>prefetch()</td>
              <td><code>router.prefetch(url)</code></td>
              <td><code>router.prefetch(href)</code> — manual prefetch</td>
            </tr>
            <tr>
              <td>events</td>
              <td><code>router.events.on(&apos;routeChangeStart&apos;, ...)</code></td>
              <td>Not available. Use <code>usePathname</code> + <code>useEffect</code> to watch route changes.</td>
            </tr>
            <tr>
              <td>isReady</td>
              <td><code>router.isReady</code> — needed before accessing query on SSR</td>
              <td>Not needed — hooks are always ready in client components.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="use-router">useRouter (App Router)</h2>
      <p>
        The App Router <code>useRouter</code> is a Client Component hook from{" "}
        <code>next/navigation</code>. It provides navigation methods — but notably does NOT expose{" "}
        <code>pathname</code> or <code>query</code>. Those are separate hooks.
      </p>
      <pre>
        <code>{`"use client";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>Go back</button>
  );
}

// Available methods on the App Router useRouter:
// router.push(href)      — navigate to a URL, adds to history
// router.replace(href)   — navigate, replaces current history entry
// router.back()          — go back in history
// router.forward()       — go forward in history
// router.refresh()       — re-fetch server components for current route without navigation
// router.prefetch(href)  — prefetch a route into the client cache

// What is NOT on useRouter (unlike Pages Router):
// router.pathname    ← use usePathname()
// router.query       ← use useParams() + useSearchParams()
// router.isReady     ← not needed
// router.events      ← use usePathname + useEffect`}</code>
      </pre>

      <p>
        <code>router.refresh()</code> is particularly useful after mutations. When a Server Action
        completes and updates the database, calling <code>router.refresh()</code> re-fetches the
        Server Components for the current route without a full navigation. The URL does not change
        and client state (input values, scroll position) is preserved.
      </p>

      <h2 id="use-pathname">usePathname</h2>
      <p>
        <code>usePathname()</code> returns the current URL pathname as a string. It updates
        reactively on navigation. This is a Client Component hook.
      </p>
      <pre>
        <code>{`"use client";
import { usePathname } from "next/navigation";

// Common use case: active link highlighting
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(\`\${href}/\`);

  return (
    <a
      href={href}
      className={isActive ? "text-blue-500 font-bold" : "text-gray-600"}
    >
      {children}
    </a>
  );
}

// usePathname returns the actual path, not the template path:
// For /blog/hello-world  → returns "/blog/hello-world"
// NOT "/blog/[slug]" like Pages Router router.pathname`}</code>
      </pre>

      <h2 id="use-search-params">useSearchParams</h2>
      <p>
        <code>useSearchParams()</code> returns a read-only <code>URLSearchParams</code> object
        representing the current URL search parameters. It is a Client Component hook and has an
        important constraint: it must be used inside a <code>{"<Suspense>"}</code> boundary, or it
        will opt the entire page out of static rendering.
      </p>
      <pre>
        <code>{`"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function SearchFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentPage = searchParams.get("page") ?? "1";
  const currentSort = searchParams.get("sort") ?? "desc";

  // Pattern: update search params without losing others
  const setPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(\`\${pathname}?\${params.toString()}\`);
  }, [searchParams, pathname, router]);

  return (
    <div>
      <button onClick={() => setPage(parseInt(currentPage) + 1)}>Next page</button>
    </div>
  );
}

// REQUIRED: wrap any component using useSearchParams in Suspense
// app/products/page.tsx
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading filters...</div>}>
      <SearchFilter />
    </Suspense>
  );
}`}</code>
      </pre>

      <p>
        <strong>Why Suspense is required:</strong> <code>useSearchParams()</code> reads from the
        URL at render time. During static generation, Next.js cannot know the URL, so it needs a
        Suspense boundary to stream in the component after the request is received. Without
        Suspense, Next.js will opt the entire page into dynamic rendering — which is often
        unintentional.
      </p>

      <h2 id="use-params">useParams</h2>
      <p>
        <code>useParams()</code> returns an object of the dynamic route parameters for the current
        route segment. It is a Client Component hook and does not require Suspense.
      </p>
      <pre>
        <code>{`"use client";
import { useParams } from "next/navigation";

// For route: app/blog/[slug]/page.tsx
// At URL: /blog/hello-world
export function BlogActions() {
  const params = useParams();
  // params = { slug: "hello-world" }

  const handleShare = () => {
    navigator.clipboard.writeText(\`https://example.com/blog/\${params.slug}\`);
  };

  return <button onClick={handleShare}>Share</button>;
}

// For catch-all routes: app/docs/[...path]/page.tsx
// At URL: /docs/react/hooks
// params = { path: ["react", "hooks"] }

// For optional catch-all: app/docs/[[...path]]/page.tsx
// At URL: /docs
// params = { path: undefined }
// At URL: /docs/react
// params = { path: ["react"] }`}</code>
      </pre>

      <h2 id="use-selected-layout-segment">useSelectedLayoutSegment</h2>
      <p>
        <code>useSelectedLayoutSegment()</code> is the correct pattern for active navigation state
        in layouts with nested routes. Unlike <code>usePathname()</code> which returns the full
        path, this hook returns only the active child segment relative to the layout it is called
        from. This is the preferred approach for sidebar navigation in nested layouts.
      </p>
      <pre>
        <code>{`"use client";
import { useSelectedLayoutSegment } from "next/navigation";

// In app/dashboard/layout.tsx:
// - /dashboard/overview  → segment = "overview"
// - /dashboard/settings  → segment = "settings"
// - /dashboard           → segment = null
export function DashboardNav() {
  const segment = useSelectedLayoutSegment();

  const navItems = [
    { href: "/dashboard/overview", segment: "overview", label: "Overview" },
    { href: "/dashboard/settings", segment: "settings", label: "Settings" },
  ];

  return (
    <nav>
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          style={{ fontWeight: segment === item.segment ? "bold" : "normal" }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

// useSelectedLayoutSegments() (plural) — returns ALL active segments as an array
// Useful for breadcrumbs in deeply nested layouts
import { useSelectedLayoutSegments } from "next/navigation";

export function Breadcrumbs() {
  const segments = useSelectedLayoutSegments();
  // At /dashboard/settings/profile → ["settings", "profile"]
  return (
    <ol>
      {segments.map((segment) => (
        <li key={segment}>{segment}</li>
      ))}
    </ol>
  );
}`}</code>
      </pre>

      <h2 id="programmatic-navigation">Programmatic Navigation Patterns</h2>
      <p>
        Programmatic navigation comes up frequently: redirect after form submission, conditional
        navigation based on auth state, and deep linking.
      </p>
      <pre>
        <code>{`"use client";
import { useRouter } from "next/navigation";
import { redirect } from "next/navigation"; // Server-side redirect

// 1. Redirect after form submit (client component)
export function LoginForm() {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login(formData);
    if (result.success) {
      router.push("/dashboard");
    }
  }
  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}

// 2. Server-side redirect (Server Component or Server Action)
// next/navigation redirect() throws internally — do NOT wrap in try/catch
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function ProfilePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) {
    redirect("/login"); // throws internally, do not catch
  }
  return <div>Profile</div>;
}

// 3. Preserve scroll position on navigation
// router.push() scrolls to top by default
// To prevent scroll reset:
router.push("/tab2", { scroll: false });

// 4. Watch route changes in a client component (replaces router.events)
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    // Fires on every route change
    trackPageView(pathname);
  }, [pathname]);
  return null;
}`}</code>
      </pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Importing from <code>next/router</code> in App Router:</strong> throws at
          runtime. Always use <code>next/navigation</code> in App Router components.
        </li>
        <li>
          <strong>Reading <code>router.pathname</code> or <code>router.query</code> in App
          Router:</strong> these properties do not exist on the App Router&apos;s{" "}
          <code>useRouter</code>. Use <code>usePathname()</code> and{" "}
          <code>useParams()</code>/<code>useSearchParams()</code> instead.
        </li>
        <li>
          <strong>Using <code>useSearchParams()</code> without Suspense:</strong> opts the entire
          page into dynamic rendering. The fix is to extract the component using{" "}
          <code>useSearchParams()</code> and wrap it in <code>{"<Suspense>"}</code>.
        </li>
        <li>
          <strong>Catching <code>redirect()</code>:</strong> <code>redirect()</code> from{" "}
          <code>next/navigation</code> throws a special error internally to trigger the redirect.
          Wrapping it in <code>try/catch</code> will catch that throw and prevent the redirect from
          working.
        </li>
        <li>
          <strong>Using <code>usePathname()</code> for active layout nav instead of{" "}
          <code>useSelectedLayoutSegment()</code>:</strong> pathname comparison breaks in nested
          layouts where you only care about the child segment. Use the purpose-built hook.
        </li>
        <li>
          <strong>Calling navigation hooks in Server Components:</strong> all navigation hooks
          from <code>next/navigation</code> are Client-only. Server Components should use{" "}
          <code>redirect()</code> (server-side) or read params via the <code>params</code> prop.
        </li>
      </ul>

      <ArticleTable caption="All navigation hooks at a glance — hook, what it returns, Client Component required, Suspense required." minWidth={920}>
        <table>
          <thead>
            <tr>
              <th>Hook</th>
              <th>Returns</th>
              <th>Client Component?</th>
              <th>Suspense required?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useRouter()</code></td>
              <td>Router object with push, replace, back, forward, refresh, prefetch</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>usePathname()</code></td>
              <td>Current pathname string (e.g. <code>&apos;/blog/hello&apos;</code>)</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>useSearchParams()</code></td>
              <td>Read-only URLSearchParams object</td>
              <td>Yes</td>
              <td>Yes — or opts page into dynamic rendering</td>
            </tr>
            <tr>
              <td><code>useParams()</code></td>
              <td>Dynamic route params object (e.g. <code>{'{ slug: "hello" }'}</code>)</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>useSelectedLayoutSegment()</code></td>
              <td>Active child segment string relative to the layout, or null</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>useSelectedLayoutSegments()</code></td>
              <td>Array of all active child segments</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="What changed about routing hooks between Pages Router and App Router?"
        intro="Interviewers ask this to verify you have actually worked with both routers, not just read the docs. Name the concrete API differences and explain why the split was made."
        steps={[
          "The package changed: Pages Router uses next/router, App Router uses next/navigation. Importing from the wrong package throws at runtime.",
          "The Pages Router useRouter had everything in one object: pathname, query, push, replace, events. App Router split this into purpose-built hooks for each concern.",
          "usePathname() replaces router.pathname. But note: it returns the actual URL path, not the template path like /blog/[slug].",
          "useParams() and useSearchParams() replace router.query. The key difference is that useSearchParams() requires a Suspense boundary — otherwise it prevents static generation for the entire page.",
          "router.events is gone. Use usePathname() in a useEffect to watch for route changes.",
          "The new addition is router.refresh() — this re-fetches server components for the current route after a mutation, without navigating. Very useful with Server Actions.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: Migrate a Pages Router Nav Component"
        scenario={
          <span>
            You are migrating a Next.js application from Pages Router to App Router. The existing
            navigation component (Pages Router) looks like this:
            <br />
            <br />
            <code>
              {`import { useRouter } from 'next/router';

export function Nav() {
  const router = useRouter();
  const isActive = (path) => router.pathname === path;
  const currentSection = router.query.section;
  const goToDashboard = () => router.push('/dashboard?tab=overview');

  return (
    <nav>
      <a className={isActive('/home') ? 'active' : ''}>Home</a>
      <a className={isActive('/dashboard') ? 'active' : ''}>Dashboard</a>
      <span>Current section: {currentSection}</span>
      <button onClick={goToDashboard}>Go to Dashboard</button>
    </nav>
  );
}`}
            </code>
          </span>
        }
        tasks={[
          "Identify every API call that needs to change and which App Router hook replaces it.",
          "Write the corrected App Router version of this component.",
          "The currentSection variable reads from router.query.section. In the App Router, is section a dynamic route param or a search param? How does the answer change which hook you use?",
          "What directive must be added to this component and why?",
        ]}
        pitfalls={[
          "Using next/router instead of next/navigation — the import must change.",
          "Checking router.pathname directly — usePathname() returns the real path, not the template. Exact string comparison works for static paths like '/home' and '/dashboard'.",
          "Forgetting to add 'use client' — all navigation hooks are client-only.",
          "Not wrapping useSearchParams in Suspense if currentSection comes from the URL query string.",
        ]}
        signal="A strong answer correctly identifies that 'section' from router.query is a URL search param (not a dynamic segment), uses useSearchParams() for it with a Suspense boundary, replaces usePathname() for the active link check, and adds 'use client' to the top of the file."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>next/router</code> is Pages Router only. <code>next/navigation</code> is App Router
          only. Never mix them.
        </li>
        <li>
          App Router <code>useRouter</code> has no <code>pathname</code>, <code>query</code>, or{" "}
          <code>events</code>. Use dedicated hooks: <code>usePathname()</code>,{" "}
          <code>useParams()</code>, <code>useSearchParams()</code>.
        </li>
        <li>
          <code>useSearchParams()</code> must be wrapped in <code>{"<Suspense>"}</code> to avoid
          opting the entire page into dynamic rendering.
        </li>
        <li>
          <code>router.refresh()</code> is new in App Router — re-fetches server components after
          mutations without navigating.
        </li>
        <li>
          <code>useSelectedLayoutSegment()</code> is purpose-built for active nav highlighting in
          nested layouts — prefer it over <code>usePathname()</code> string matching in layouts.
        </li>
        <li>
          <code>redirect()</code> from <code>next/navigation</code> throws internally. Do not
          wrap it in try/catch.
        </li>
      </ul>
    </div>
  );
}
