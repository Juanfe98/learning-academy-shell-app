import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "the-mental-model", title: "The RSC Mental Model", level: 2 },
  { id: "what-rsc-gains-you", title: "What RSC Actually Gains You", level: 3 },
  { id: "use-client", title: "The use client Directive", level: 2 },
  { id: "what-can-do", title: "Capability Map: What Each Can Do", level: 2 },
  { id: "composition-patterns", title: "Composition Patterns", level: 2 },
  { id: "server-to-client-props", title: "Passing Props Server to Client", level: 3 },
  { id: "client-inside-server", title: "Client Components Inside Server Components", level: 3 },
  { id: "server-inside-client", title: "Server Components as Children of Client Components", level: 3 },
  { id: "context-and-rsc", title: "Context and RSC", level: 2 },
  { id: "common-pitfalls", title: "Common Pitfalls", level: 2 },
  { id: "hydration-errors", title: "Hydration Errors", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function ServerComponentsVsClientComponents() {
  return (
    <div className="article-content">
      <p>
        React Server Components (RSC) is the biggest architectural shift in React since Hooks. It
        changes where components render, what they can do, and how data flows through an application.
        Senior Next.js interviews almost always probe this topic — expect questions about the mental
        model, the composition rules, and why hydration errors happen.
      </p>

      <h2 id="the-mental-model">The RSC Mental Model</h2>
      <p>
        Before RSC, every React component ran in two places: first on the server (SSR), then again
        in the browser (hydration), and then potentially again on every re-render. RSC introduces a
        clean split:
      </p>
      <ul>
        <li>
          <strong>Server Components</strong> run only on the server. They never ship to the browser.
          Their output is serialized React elements that the browser uses to render HTML without
          re-executing the component logic.
        </li>
        <li>
          <strong>Client Components</strong> run on the server once during SSR, then hydrate and
          re-render in the browser as normal React components.
        </li>
      </ul>
      <p>
        The critical insight: <strong>in Next.js App Router, every component is a Server Component
        by default</strong>. You opt into client-side behavior with <code>"use client"</code>.
        This is the opposite of the mental model most React developers carry from pre-RSC React.
      </p>

      <h3 id="what-rsc-gains-you">What RSC Actually Gains You</h3>
      <ArticleTable caption="RSC is not just SSR renamed. The gains are architectural." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Benefit</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Zero bundle cost</td>
              <td>Server Component code never ships to the browser. A 2MB markdown parser stays on the server.</td>
            </tr>
            <tr>
              <td>Direct backend access</td>
              <td>Fetch from databases, read files, use secrets — all inside a component with no API layer needed.</td>
            </tr>
            <tr>
              <td>Automatic data co-location</td>
              <td>Each component fetches exactly its own data. Next.js deduplicates identical fetch calls within a request.</td>
            </tr>
            <tr>
              <td>Streaming by default</td>
              <td>Server Components can stream HTML progressively. Suspense boundaries let fast parts arrive first.</td>
            </tr>
            <tr>
              <td>No waterfall for composition</td>
              <td>Server Component data fetches run in parallel on the server, not sequentially as client fetches would.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// Server Component — runs ONLY on the server
// No "use client". No hooks. No browser APIs. But: direct db access, no bundle cost.
import { db } from "@/lib/db";

async function UserProfile({ userId }: { userId: string }) {
  // This query runs on the server. The db import NEVER ships to the browser.
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) return <p>Not found</p>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {/* This Server Component can render Client Components as children */}
      <FollowButton userId={userId} />
    </div>
  );
}

// Client Component — runs on server once (SSR), then hydrates in browser
"use client";
import { useState } from "react";

function FollowButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(false);

  return (
    <button onClick={() => setFollowing(!following)}>
      {following ? "Following" : "Follow"}
    </button>
  );
}`}</code></pre>

      <h2 id="use-client">The use client Directive</h2>
      <p>
        <code>"use client"</code> marks a module as a <strong>client boundary</strong>. Everything
        imported by a Client Component that is not explicitly a Server Component also becomes a
        client module. Think of it as a fence: once you cross into client territory, you stay there
        for that import chain.
      </p>

      <pre><code>{`// ❌ Wrong mental model: "use client" means this runs ONLY in the browser
// Correct mental model: "use client" means this component:
// 1. Runs on the server during SSR (to generate HTML)
// 2. Ships its JavaScript to the browser for hydration
// 3. Re-renders in the browser when state/props change

// The key difference vs Server Components: Client Components ship JS to the browser.
// Server Components do not ship their implementation code at all.

"use client";
// This file and everything it imports (that isn't explicitly server-only)
// will be included in the browser bundle.

import { useState, useEffect } from "react"; // ✓ fine — client hooks
// import { db } from "@/lib/db"; // ✗ would throw — db is server-only
// import { headers } from "next/headers"; // ✗ would throw — server-only API`}</code></pre>

      <h2 id="what-can-do">Capability Map: What Each Can Do</h2>
      <ArticleTable caption="Use this map to decide which component type to reach for." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Server Component</th>
              <th>Client Component</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>async/await (fetch, db queries)</td>
              <td>Yes — naturally async</td>
              <td>No — must use hooks or libs (SWR, React Query)</td>
            </tr>
            <tr>
              <td>useState, useReducer</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>useEffect, useLayoutEffect</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Event handlers (onClick, onChange)</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Browser APIs (window, document)</td>
              <td>No</td>
              <td>Yes (after mount)</td>
            </tr>
            <tr>
              <td>Access server-only modules (db, fs)</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Access secrets / environment variables</td>
              <td>Yes (server-only env vars)</td>
              <td>Only NEXT_PUBLIC_* vars</td>
            </tr>
            <tr>
              <td>Import server-only packages</td>
              <td>Yes</td>
              <td>No (will error or bloat bundle)</td>
            </tr>
            <tr>
              <td>Context (useContext)</td>
              <td>No — cannot read context</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Ref (useRef, forwardRef)</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Render other Server Components</td>
              <td>Yes</td>
              <td>Only as children props (not direct imports)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="composition-patterns">Composition Patterns</h2>
      <p>
        The most important skill is knowing how to compose Server and Client Components together.
        There are three key patterns, each with specific rules.
      </p>

      <h3 id="server-to-client-props">Passing Props Server to Client</h3>
      <p>
        Props passed from Server Components to Client Components must be <strong>serializable</strong>.
        You cannot pass functions, class instances, Promises (in most cases), or any object that
        cannot survive JSON serialization.
      </p>

      <pre><code>{`// ✓ Serializable props — safe to pass across the server/client boundary
<ClientComponent
  user={{ id: "123", name: "Juan", role: "admin" }}  // plain object
  count={42}                                          // number
  label="Hello"                                       // string
  isEnabled={true}                                    // boolean
  tags={["react", "nextjs"]}                          // array of primitives
/>

// ✗ NOT serializable — will throw at runtime
<ClientComponent
  onClick={() => console.log("click")}   // function — not serializable
  ref={myRef}                            // ref — not serializable
  db={prismaClient}                      // class instance — not serializable
/>`}</code></pre>

      <h3 id="client-inside-server">Client Components Inside Server Components</h3>
      <p>
        A Server Component can import and render a Client Component. This is the most common
        pattern — Server Components do the data fetching, Client Components handle the interactivity.
      </p>

      <pre><code>{`// src/app/dashboard/page.tsx — Server Component
import { db } from "@/lib/db";
import { InteractiveChart } from "./_components/InteractiveChart"; // Client Component

export default async function DashboardPage() {
  // Data fetching happens on the server
  const metrics = await db.metrics.findMany({ orderBy: { date: "desc" }, take: 30 });

  // InteractiveChart receives serializable data and handles mouse events in the browser
  return (
    <div>
      <h1>Dashboard</h1>
      <InteractiveChart data={metrics} />
    </div>
  );
}

// src/app/dashboard/_components/InteractiveChart.tsx — Client Component
"use client";
import { useState } from "react";

export function InteractiveChart({ data }: { data: Metric[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div onMouseMove={/* ... */}>
      {/* Interactive chart rendering */}
    </div>
  );
}`}</code></pre>

      <h3 id="server-inside-client">Server Components as Children of Client Components</h3>
      <p>
        A Client Component <strong>cannot import a Server Component</strong>. However, a Client
        Component CAN accept Server Components as <code>children</code> props — because the Server
        Component was already rendered on the server and its output (React elements) is just data
        being passed through.
      </p>

      <pre><code>{`// ✗ WRONG: Client Component importing Server Component
"use client";
import { ServerSideData } from "./ServerSideData"; // This BREAKS the server component

export function ClientWrapper() {
  return <ServerSideData />; // ServerSideData loses its server-only nature
}

// ✓ CORRECT: Pass Server Component as children
// In the Server Component parent:
import { ClientWrapper } from "./ClientWrapper";
import { ServerSideData } from "./ServerSideData";

export default function Page() {
  // ServerSideData runs on the server, its output is passed as children to ClientWrapper
  return (
    <ClientWrapper>
      <ServerSideData />
    </ClientWrapper>
  );
}

// ClientWrapper receives pre-rendered children (already server-rendered)
"use client";
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>Toggle</button>
      {open && children} {/* Server Component output displayed client-side */}
    </div>
  );
}`}</code></pre>

      <h2 id="context-and-rsc">Context and RSC</h2>
      <p>
        React Context does not work in Server Components — there is no "provider tree" on the
        server in the RSC sense. However, you can still provide context from a Client Component
        that wraps the server-rendered subtree.
      </p>

      <pre><code>{`// The pattern for providing context to a subtree that contains Server Components:

// 1. Create the provider as a Client Component
"use client";
import { createContext, useContext, useState } from "react";

const ThemeContext = createContext<"light" | "dark">("dark");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// 2. Use in the root layout (Server Component)
// src/app/layout.tsx
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider> {/* Client Component */}
          {children}  {/* Can contain Server Components */}
        </ThemeProvider>
      </body>
    </html>
  );
}

// 3. Any Client Component in the tree can consume context
"use client";
import { useTheme } from "@/components/ThemeProvider";

export function Header() {
  const theme = useTheme(); // Works — Header is a Client Component
  return <header className={theme}>...</header>;
}`}</code></pre>

      <h2 id="common-pitfalls">Common Pitfalls</h2>

      <h3 id="hydration-errors">Hydration Errors</h3>
      <p>
        A hydration error happens when the HTML the server renders does not match what React
        renders during hydration in the browser. This is the most common production issue
        when working with RSC.
      </p>

      <pre><code>{`// ❌ Cause 1: Rendering something that differs between server and browser
"use client";
export function Timestamp() {
  // Server renders one timestamp, browser renders a slightly different one
  return <span>{new Date().toLocaleString()}</span>;
}

// ✓ Fix: Use suppressHydrationWarning for values that intentionally differ,
// or defer rendering to client only
"use client";
import { useState, useEffect } from "react";

export function Timestamp() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setTime(new Date().toLocaleString());
  }, []);

  return <span>{time || "Loading..."}</span>;
}

// ❌ Cause 2: Accessing window/document during SSR
"use client";
export function WindowSize() {
  // window is not defined on the server — crashes
  return <div>{window.innerWidth}</div>;
}

// ✓ Fix: Guard with mounted state
"use client";
import { useState, useEffect } from "react";

export function WindowSize() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);

  return <div>{width}</div>;
}

// ❌ Cause 3: Different rendering based on Math.random() or user-specific data in SSR
export function RandomElement() {
  // Returns different values on server vs client — hydration mismatch
  return <div style={{ left: Math.random() * 100 }}>tooltip</div>;
}`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain RSC in a senior-level interview"
        intro="Senior interviewers want to see that you understand the boundaries, the tradeoffs, and the composition rules — not just that RSC 'reduces bundle size'."
        steps={[
          "State the mental model clearly: In App Router, components are Server Components by default. 'use client' opts into the browser bundle. Server Components run once on the server and never ship their code to the client.",
          "Explain the key capability difference: Server Components can be async, access databases and secrets, and use any server-only module. Client Components can use hooks, event handlers, and browser APIs.",
          "Cover the composition rule: A Server Component can import a Client Component directly. A Client Component CANNOT import a Server Component — but it CAN accept one as children. This is the most common gotcha.",
          "Address serialization: Props crossing the server/client boundary must be serializable — plain objects, strings, numbers, arrays. No functions, class instances, or unresolved Promises.",
          "Name a real failure mode: Hydration errors happen when server-rendered HTML differs from what the browser renders during hydration — usually caused by accessing browser-only APIs (window, Math.random) during SSR, or timestamps.",
        ]}
      />
    </div>
  );
}
