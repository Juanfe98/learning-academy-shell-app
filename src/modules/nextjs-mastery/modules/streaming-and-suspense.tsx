import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const ssrVsStreamingDiagram = String.raw`sequenceDiagram
  participant B as Browser
  participant S as Server

  rect rgb(40, 30, 50)
    Note over B,S: Traditional SSR — everything waits for everything
    B->>S: GET /dashboard
    Note over S: fetch user (200ms)
    Note over S: fetch metrics (800ms)
    Note over S: fetch chart data (1200ms)
    Note over S: render full HTML (50ms)
    S-->>B: 200 OK — full HTML (TTFB: ~2250ms)
    Note over B: FCP: ~2300ms — user sees nothing until this point
  end

  rect rgb(30, 40, 50)
    Note over B,S: Streaming — shell first, then chunks
    B->>S: GET /dashboard
    Note over S: render static shell (20ms)
    S-->>B: chunk 1 — page shell HTML (TTFB: ~20ms)
    Note over B: FCP: ~70ms — user sees layout immediately
    Note over S: fetch metrics resolves (800ms)
    S-->>B: chunk 2 — metrics section HTML
    Note over S: fetch chart resolves (1200ms)
    S-->>B: chunk 3 — chart section HTML
    Note over B: Page fully interactive at ~1250ms
  end`;

const routeTreeDiagram = String.raw`flowchart TD
  LAYOUT["layout.tsx\n(renders immediately — not suspended)"]
  LOADING["loading.tsx\n(becomes Suspense fallback for page)"]
  PAGE["page.tsx\n(suspended until async work resolves)"]
  SHELL["Static shell content\n(renders immediately)"]
  SLOW["SlowComponent\n(manually suspended — resolves independently)"]
  FAST["FastComponent\n(no await — renders in shell)"]

  LAYOUT --> LOADING
  LOADING --> PAGE
  PAGE --> SHELL
  PAGE --> FAST
  PAGE --> SLOW

  style LAYOUT fill:#1e3a5f,color:#90cdf4
  style LOADING fill:#2d4a1e,color:#9ae6b4
  style SHELL fill:#2d4a1e,color:#9ae6b4
  style FAST fill:#2d4a1e,color:#9ae6b4
  style PAGE fill:#4a2d1e,color:#fbd38d
  style SLOW fill:#4a2d1e,color:#fbd38d`;

const parallelStreamingDiagram = String.raw`flowchart LR
  PAGE["DashboardPage\n(Server Component)"]
  B1["Suspense boundary 1\nfallback: MetricsSkeleton"]
  B2["Suspense boundary 2\nfallback: ChartSkeleton"]
  B3["Suspense boundary 3\nfallback: FeedSkeleton"]
  M["SlowMetrics\nawait db.metrics() ~800ms"]
  C["RevenueChart\nawait db.chart() ~1200ms"]
  F["NewsFeed\nawait externalApi() ~2000ms"]

  PAGE --> B1 --> M
  PAGE --> B2 --> C
  PAGE --> B3 --> F

  M -->|"resolves first"| R1["streams chunk at 800ms"]
  C -->|"resolves second"| R2["streams chunk at 1200ms"]
  F -->|"resolves last"| R3["streams chunk at 2000ms"]

  style B1 fill:#1e3a5f,color:#90cdf4
  style B2 fill:#1e3a5f,color:#90cdf4
  style B3 fill:#1e3a5f,color:#90cdf4`;

export const toc: TocItem[] = [
  { id: "streaming-mental-model", title: "The Streaming Mental Model", level: 2 },
  { id: "how-streaming-works", title: "How Streaming Works Technically", level: 2 },
  { id: "loading-tsx", title: "loading.tsx — Automatic Suspense", level: 2 },
  { id: "manual-suspense", title: "Manual Suspense — Granular Control", level: 2 },
  { id: "nested-suspense-strategy", title: "Nested Suspense Strategy", level: 2 },
  { id: "avoiding-waterfalls", title: "Avoiding the Request Waterfall", level: 2 },
  { id: "use-hook", title: "The use() Hook", level: 2 },
  { id: "streaming-mistakes", title: "Common Streaming Mistakes", level: 2 },
  { id: "suspense-comparison-table", title: "Streaming API Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StreamingAndSuspense() {
  return (
    <div className="article-content">
      <p>
        Streaming is the biggest perceptual performance win available to Next.js apps — and the
        most commonly underused. Traditional SSR forces users to wait for the slowest database
        query before seeing anything. Streaming breaks that constraint: ship the shell
        immediately, stream each section as it resolves. This module builds the correct mental
        model, covers every API from <code>loading.tsx</code> through the <code>use()</code>{" "}
        hook, and maps the common mistakes that cause senior engineers to ship subtle regressions.
      </p>

      <h2 id="streaming-mental-model">The Streaming Mental Model</h2>
      <p>
        Traditional SSR is a pipeline: fetch all data → render full HTML → send response. Every
        step is serial. A dashboard with three data sources — one fast, one medium, one slow —
        blocks on the slow one. The user sees a blank page (or spinner) for the full duration of
        the slowest query, even though most of the page was ready long ago.
      </p>
      <p>
        Streaming breaks the waterfall. The server flushes an HTML shell (layout, nav,
        placeholders) the moment it is ready — typically in tens of milliseconds. Then, as each
        async piece resolves, React sends another chunk of HTML over the same connection. The
        browser renders each chunk on arrival without waiting for the rest. Time to First Byte
        (TTFB) and First Contentful Paint (FCP) drop dramatically. Users perceive the page as
        fast even when some data is slow.
      </p>
      <p>
        The key shift: instead of <em>one big response</em>, you have <em>one connection with
        multiple progressive chunks</em>. HTTP chunked transfer encoding has supported this
        since HTTP/1.1. React 18 added the server-side streaming renderer that drives it.
        Next.js App Router makes it the default.
      </p>

      <h2 id="how-streaming-works">How Streaming Works Technically</h2>
      <p>
        Two mechanisms work together under the hood: HTTP chunked transfer encoding and React's
        selective hydration.
      </p>
      <p>
        <strong>HTTP chunked transfer encoding</strong> lets the server send a response body in
        pieces without knowing the total size upfront. The browser renders each chunk as it
        arrives — it does not wait for <code>Content-Length</code> to be known. Next.js uses
        Node's <code>ReadableStream</code> to pipe React's streaming output directly to the HTTP
        response.
      </p>
      <p>
        <strong>React's selective hydration</strong> means each streamed chunk hydrates
        independently. Earlier chunks become interactive (click handlers attached, state working)
        before later chunks have even arrived. Users can interact with the header and sidebar
        while the slow chart is still loading. The browser does not stall hydration waiting for
        all content.
      </p>

      <MermaidDiagram
        chart={ssrVsStreamingDiagram}
        title="Traditional SSR vs Streaming — Request Timeline"
        caption="Streaming cuts TTFB from ~2250ms to ~20ms on a dashboard with three data sources. The user sees and interacts with real content at 70ms instead of 2300ms."
        minHeight={540}
      />

      <p>
        The most common misconception: streaming does not make individual data fetches faster.
        A query that takes 1200ms still takes 1200ms. What changes is <em>when the user sees
        something</em>. The static shell renders at ~20ms regardless of how slow the data is.
        This is the difference between a page that feels fast and one that feels slow even with
        the same backend latency.
      </p>

      <h2 id="loading-tsx">loading.tsx — Automatic Suspense</h2>
      <p>
        The simplest way to enable streaming in Next.js is a <code>loading.tsx</code> file.
        Next.js automatically wraps the co-located <code>page.tsx</code> in a{" "}
        <code>{"<Suspense>"}</code> boundary with your <code>loading.tsx</code> as the fallback.
        No explicit <code>{"<Suspense>"}</code> needed in your page code.
      </p>

      <pre>
        <code>{`// src/app/dashboard/loading.tsx
// Next.js wraps page.tsx in: <Suspense fallback={<Loading />}>{page}</Suspense>

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      {/* Skeleton that mirrors the real layout — reduces layout shift */}
      <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-white/10" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-white/10" />
    </div>
  );
}`}</code>
      </pre>

      <p>
        <strong>Critical behavior:</strong> the layout <em>above</em> the page (in{" "}
        <code>layout.tsx</code>) renders and flushes immediately. Only <code>page.tsx</code>{" "}
        is suspended. This is why the navigation bar and sidebar appear instantly during
        navigation — they live in the layout, outside the Suspense boundary.
      </p>
      <p>
        <code>loading.tsx</code> activates during <em>both</em> server-side initial render and
        client-side navigation. On navigation, Next.js shows the fallback immediately while the
        new page's Server Components execute, then swaps to the real content.
      </p>

      <MermaidDiagram
        chart={routeTreeDiagram}
        title="Route Tree — What Renders Immediately vs What Streams"
        caption="The layout is never suspended. loading.tsx becomes the Suspense fallback for the entire page. Manual Suspense boundaries inside the page let individual sections stream independently."
        minHeight={420}
      />

      <p>
        The trade-off: <code>loading.tsx</code> is coarse-grained. The entire page is in one
        Suspense boundary. If you have three data sources and one takes 3 seconds, the user sees
        the skeleton for 3 seconds before any real content appears — even if the other two
        resolved in 300ms. For better perceived performance, use manual Suspense boundaries.
      </p>

      <h2 id="manual-suspense">Manual Suspense — Granular Control</h2>
      <p>
        Manual <code>{"<Suspense>"}</code> boundaries let you stream each section independently.
        Wrap individual slow Server Components rather than the entire page. Each boundary
        resolves and streams in parallel — they do not wait for each other.
      </p>
      <p>
        The key insight: every <code>await</code> inside a Server Component blocks everything
        below it in <em>that component</em>. If a component awaits three things sequentially,
        they run as a waterfall. The fix is to either use <code>Promise.all</code> (covered
        below) or split the component into separate Server Components, each with its own data
        fetch and its own Suspense boundary.
      </p>

      <pre>
        <code>{`// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { MetricsSkeleton, ChartSkeleton, FeedSkeleton } from "@/components/skeletons";

export default async function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Static — no async work, renders in the initial shell */}
      <DashboardHeader />

      {/* Three independent Suspense boundaries — each streams separately */}
      <div className="grid grid-cols-3 gap-4">
        <Suspense fallback={<MetricsSkeleton />}>
          <SlowMetrics />   {/* DB query ~800ms */}
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />    {/* Aggregation query ~1200ms */}
      </Suspense>

      <Suspense fallback={<FeedSkeleton />}>
        <NewsFeed />        {/* External API ~2000ms */}
      </Suspense>
    </div>
  );
}

// Each of these is a separate Server Component with its own data fetch
async function SlowMetrics() {
  const metrics = await db.metrics.findMany({ where: { date: today() } });
  return <MetricsGrid metrics={metrics} />;
}

async function RevenueChart() {
  const data = await db.revenue.aggregate({ /* ... */ });
  return <Chart data={data} />;
}

async function NewsFeed() {
  const items = await fetch("https://api.news.example.com/feed").then(r => r.json());
  return <FeedList items={items} />;
}`}</code>
      </pre>

      <p>
        With this setup, metrics stream at 800ms, the chart at 1200ms, and the news feed at
        2000ms — all independently. The user sees the first real content at 800ms instead of
        waiting 2000ms for all three to resolve.
      </p>

      <MermaidDiagram
        chart={parallelStreamingDiagram}
        title="Independent Suspense Boundaries — Parallel Streaming"
        caption="Three Suspense boundaries stream completely independently. The user sees real metrics at 800ms, the chart at 1200ms, and the news feed at 2000ms — not a 2000ms wait for everything."
        minHeight={400}
      />

      <h2 id="nested-suspense-strategy">Nested Suspense Strategy</h2>
      <p>
        How granular should your Suspense boundaries be? There is a real tension here.
        Fine-grained boundaries give users earlier feedback and better perceived performance.
        But too fine-grained causes jarring layout shifts as content pops in at slightly
        different times across a card grid.
      </p>
      <p>
        The rule of thumb that works in practice: <strong>one boundary per visual
        section</strong>, not per data point. A card that shows user name, avatar, and last
        login — all from the same query — should be one Suspense boundary. Three independent
        cards that make independent queries should be three boundaries.
      </p>

      <pre>
        <code>{`// ❌ Too granular — user sees jarring layout shift as each field pops in
<UserCard>
  <Suspense fallback={<NameSkeleton />}><UserName userId={id} /></Suspense>
  <Suspense fallback={<AvatarSkeleton />}><UserAvatar userId={id} /></Suspense>
  <Suspense fallback={<StatusSkeleton />}><UserStatus userId={id} /></Suspense>
</UserCard>

// ✅ Right granularity — entire card is one boundary
<Suspense fallback={<UserCardSkeleton />}>
  <UserCard userId={id} />  {/* single component, single query, single boundary */}
</Suspense>

// ✅ Independent sections — each section has its own boundary
<div className="grid grid-cols-3 gap-4">
  {users.map((user) => (
    <Suspense key={user.id} fallback={<UserCardSkeleton />}>
      <UserCard userId={user.id} />
    </Suspense>
  ))}
</div>

// Note the key prop on Suspense — required when mapping boundaries.
// Missing key = React reuses the same boundary instance, may show stale fallback`}</code>
      </pre>

      <h2 id="avoiding-waterfalls">Avoiding the Request Waterfall</h2>
      <p>
        The most expensive streaming anti-pattern is the request waterfall — sequential awaits
        for data that could be fetched in parallel. Even with Suspense, a waterfall inside a
        single Server Component blocks the entire component until all awaits complete.
      </p>

      <pre>
        <code>{`// ❌ Waterfall — user waits for user fetch (200ms) THEN post fetch (400ms) = 600ms
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId);       // waits 200ms
  const posts = await getLatestPosts(userId); // then waits another 400ms
  return <Profile user={user} posts={posts} />;
}

// ✅ Parallel with Promise.all — both fire simultaneously = 400ms total
async function UserProfile({ userId }: { userId: string }) {
  const [user, posts] = await Promise.all([
    getUser(userId),         // fires at t=0
    getLatestPosts(userId),  // fires at t=0
  ]);
  return <Profile user={user} posts={posts} />;
}

// ✅ Parallel via separate Suspense — best when sections can render independently
async function UserPage({ userId }: { userId: string }) {
  return (
    <div>
      <Suspense fallback={<UserHeaderSkeleton />}>
        <UserHeader userId={userId} />   {/* fetches user — 200ms */}
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />    {/* fetches posts — 400ms, runs in parallel */}
      </Suspense>
    </div>
  );
}`}</code>
      </pre>

      <p>
        When to use <code>Promise.all</code> versus separate Suspense boundaries: use{" "}
        <code>Promise.all</code> when the data sources are strongly coupled and the component
        cannot render until all pieces arrive. Use separate Suspense when each section can
        render independently — you get better perceived performance because the fast section
        appears immediately without waiting for the slow one.
      </p>
      <p>
        The most common waterfall mistake senior engineers make: fetching data at the page level
        and passing it as props to child components. This re-introduces a page-level await that
        blocks the entire route. The fix is to push the data fetch down into the component that
        needs it, wrapped in its own Suspense boundary.
      </p>

      <pre>
        <code>{`// ❌ Data fetched at page level — entire page waits for slowest fetch
async function DashboardPage() {
  const metrics = await getMetrics();   // 800ms
  const chart = await getChartData();   // 1200ms — page blocked for 2000ms total
  return (
    <div>
      <MetricsGrid metrics={metrics} />
      <Chart data={chart} />
    </div>
  );
}

// ✅ Data fetched inside each component — push async work to the leaves
async function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsGrid />   {/* fetches its own data internally */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart />         {/* fetches its own data internally */}
      </Suspense>
    </div>
  );
}

async function MetricsGrid() {
  const metrics = await getMetrics();   // 800ms — only this component waits
  return <div>{/* render metrics */}</div>;
}

async function Chart() {
  const data = await getChartData();    // 1200ms — only this component waits
  return <div>{/* render chart */}</div>;
}`}</code>
      </pre>

      <h2 id="use-hook">The use() Hook</h2>
      <p>
        React 19 introduced the <code>use()</code> hook — a way to pass a{" "}
        <code>Promise</code> from a Server Component down to a Client Component, which suspends
        until the promise resolves. This is useful when you need client-side interactivity
        (event handlers, state) but want the data to start fetching on the server.
      </p>
      <p>
        Unlike <code>useEffect</code> + <code>useState</code> for data fetching,{" "}
        <code>use()</code> has no client-side waterfall: the server initiates the fetch, passes
        the in-flight promise to the client, and the client suspends until it resolves. No
        spinner triggered by an empty initial state, no second render cycle after mount.
      </p>

      <pre>
        <code>{`// Server Component — initiates the fetch, passes the Promise to the client
// src/app/dashboard/page.tsx
import { UserActivity } from "@/components/UserActivity";

export default async function DashboardPage() {
  // Start the fetch on the server — do NOT await it here
  const activityPromise = getUserActivity(); // returns Promise<Activity[]>

  return (
    <Suspense fallback={<ActivitySkeleton />}>
      {/* Pass the in-flight promise as a prop */}
      <UserActivity activityPromise={activityPromise} />
    </Suspense>
  );
}

// Client Component — reads the promise with use(), suspends until resolved
// src/components/UserActivity.tsx
"use client";

import { use } from "react";
import type { Activity } from "@/lib/types";

interface Props {
  activityPromise: Promise<Activity[]>;
}

export function UserActivity({ activityPromise }: Props) {
  // use() suspends this component until the promise resolves
  // The Suspense boundary above shows the fallback during suspension
  const activities = use(activityPromise);

  return (
    <ul>
      {activities.map((a) => (
        <li key={a.id} onClick={() => handleClick(a)}>{a.title}</li>
      ))}
    </ul>
  );
}

// ❌ Old pattern — client-side waterfall, flash of empty state
"use client";
function ActivityBad() {
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => {
    getUserActivity().then(setActivities); // fetches AFTER component mounts
  }, []);
  if (!activities.length) return <ActivitySkeleton />;
  return <ul>{/* ... */}</ul>;
}`}</code>
      </pre>

      <p>
        The practical rule: if the component needs event handlers, local state, or browser APIs,
        make it a Client Component and pass a <code>Promise</code> via <code>use()</code>. If it
        is pure display with no interactivity, keep it a Server Component and let it{" "}
        <code>await</code> directly. Never reach for <code>useEffect</code> for data that can
        be initiated on the server.
      </p>

      <h2 id="streaming-mistakes">Common Streaming Mistakes</h2>
      <ul>
        <li>
          <strong>Awaiting at the page level when only one section needs slow data.</strong>{" "}
          This blocks the entire page. Move the <code>await</code> inside the component that
          actually consumes the data and wrap it in a Suspense boundary.
        </li>
        <li>
          <strong>Wrapping layouts in Suspense.</strong> Layouts cannot be streamed — they are
          always rendered synchronously as part of the shell. Placing a slow <code>await</code>{" "}
          inside <code>layout.tsx</code> blocks the entire subtree with no streaming benefit.
          Keep layouts fast; push async work into pages and leaf components.
        </li>
        <li>
          <strong>Missing <code>key</code> prop on mapped Suspense boundaries.</strong> When you
          map an array to a list of <code>{"<Suspense>"}</code> wrappers without a{" "}
          <code>key</code>, React reuses the same boundary instance when the list changes.
          The result: the stale fallback appears instead of the new content. Always add{" "}
          <code>key</code>.
        </li>
        <li>
          <strong>Using <code>loading.tsx</code> for everything.</strong> It is convenient but
          coarse. A page-level Suspense boundary means the user sees a skeleton for as long as
          the slowest fetch takes. For dashboards and content-heavy pages, use granular manual
          boundaries.
        </li>
        <li>
          <strong>Blocking the shell with slow data.</strong> Any <code>await</code> in the page
          component itself (not inside a Suspense-wrapped sub-component) delays the shell.
          The shell should have zero async work. It should only render markup and spawn Suspense
          boundaries.
        </li>
        <li>
          <strong>Forgetting that <code>use()</code> requires a Suspense ancestor.</strong>{" "}
          Calling <code>use(promise)</code> in a Client Component with no <code>Suspense</code>{" "}
          boundary above it will throw a React error at runtime. Always co-locate the Suspense
          boundary in the Server Component that passes the promise down.
        </li>
      </ul>

      <h2 id="suspense-comparison-table">Streaming API Comparison</h2>
      <ArticleTable
        caption="Three ways to enable streaming in Next.js — granularity and use case determine the right choice."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>API</th>
              <th>Granularity</th>
              <th>Best use case</th>
              <th>Nested Suspense</th>
              <th>Reusable</th>
              <th>Complexity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>loading.tsx</code>
              </td>
              <td>Entire page</td>
              <td>
                Simple pages where all content is roughly equivalent speed; navigation feedback
              </td>
              <td>No — wraps the whole page</td>
              <td>No — co-located with route</td>
              <td>Lowest — zero JSX changes</td>
            </tr>
            <tr>
              <td>Manual <code>{"<Suspense>"}</code></td>
              <td>Per component or section</td>
              <td>
                Dashboards, pages with independent slow sections, anywhere you want progressive
                content reveal
              </td>
              <td>Yes — arbitrarily deep nesting</td>
              <td>Yes — any Server Component</td>
              <td>Medium — requires splitting components</td>
            </tr>
            <tr>
              <td>
                <code>use(promise)</code>
              </td>
              <td>Per client component</td>
              <td>
                Interactive components that need client-side event handlers but want server-initiated
                data fetching
              </td>
              <td>Yes — Suspense provided by parent Server Component</td>
              <td>Yes — composable</td>
              <td>Medium — requires promise threading from server to client</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How would you optimize a slow dashboard page using streaming?"
        intro="A strong answer names the problem precisely (waterfall vs parallel), proposes a concrete component split, and calls out the metric it improves — not just 'it is faster'."
        steps={[
          "Identify the bottleneck: the most common cause of a slow dashboard is sequential awaits at the page level — one fetch completes before the next starts, and the user sees nothing until all fetches finish.",
          "Apply the shell-first principle: refactor the page component to have zero async work. All it does is render a static shell and spawn Suspense-wrapped sub-components. TTFB drops to the time it takes to render markup.",
          "Push fetches to the leaves: each slow Server Component fetches its own data internally. They fire simultaneously because React renders the page tree and kicks off all async work in parallel.",
          "Scope Suspense boundaries to visual sections: one boundary per card or panel, not per field. This gives progressive reveal without jarring layout shift.",
          "Close with the metric: TTFB drops from 'slowest query duration' to near zero. FCP drops proportionally. The user sees and interacts with real content much earlier even if total data load time is unchanged.",
        ]}
      />

      <InterviewPlaybook
        title="What's the difference between loading.tsx and manually placing Suspense boundaries?"
        intro="A weak answer says 'loading.tsx is easier.' A strong answer explains the granularity tradeoff and when each is appropriate."
        steps={[
          "loading.tsx is syntactic sugar: Next.js automatically wraps the co-located page in a single Suspense boundary with the loading component as fallback. It requires zero changes to page JSX.",
          "The trade-off with loading.tsx: coarse granularity. One Suspense = one boundary = all or nothing. The skeleton shows until the slowest data source resolves, even if most of the page was ready earlier.",
          "Manual Suspense gives independent boundaries: wrap each slow Server Component separately. Faster sections stream in first; slower ones follow. Users get progressive content reveal instead of a binary skeleton-to-content flip.",
          "Concrete recommendation: use loading.tsx for simple pages with uniform data speed or to handle navigation between routes. Use manual Suspense for dashboards, analytics pages, or any page with heterogeneous data latency.",
          "They compose: you can have both. loading.tsx handles navigation fallback while manual Suspense handles per-section streaming within the page.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design a Streaming Dashboard"
        scenario={
          <>
            You are building a dashboard page at <code>/app/dashboard/page.tsx</code>. The
            page has four sections with very different data characteristics:
            <ul style={{ marginTop: "0.75rem" }}>
              <li>
                <strong>Header</strong> — purely static: user name and avatar (already
                available from session, no DB call needed).
              </li>
              <li>
                <strong>Sidebar</strong> — medium latency: user settings and preferences
                fetched from DB (~300ms).
              </li>
              <li>
                <strong>Main chart</strong> — slow: revenue aggregation query across
                multiple tables (~1200ms).
              </li>
              <li>
                <strong>News feed</strong> — very slow: third-party external API that
                occasionally times out (~2000ms, p95: 4000ms).
              </li>
            </ul>
            The current implementation awaits all four in the page component, resulting in a
            2–4 second blank page. Your task is to redesign it.
          </>
        }
        tasks={[
          "Design the Suspense boundary structure — which sections get boundaries, what fallbacks look like, and why the header does not need one.",
          "Write a skeleton of the refactored page.tsx showing the component tree and Suspense placement. No need to implement the data-fetching components — focus on the page-level structure.",
          "Identify the waterfall risk in the sidebar and chart if they shared a component, and explain how to avoid it.",
          "The news feed sometimes takes 4 seconds. Explain how you would handle the timeout case — should the page still render if the news feed fails? What pattern handles that?",
        ]}
      />
      <SolutionReveal>
        <p>
          <strong>Suspense boundary design:</strong>
        </p>
        <ul>
          <li>
            <strong>Header</strong> — no boundary needed. Pure synchronous render from session
            data. Belongs in the shell.
          </li>
          <li>
            <strong>Sidebar</strong> — one boundary. 300ms is fast enough that a brief skeleton
            is acceptable. No need to make it blocking.
          </li>
          <li>
            <strong>Main chart</strong> — one boundary. 1200ms is too long to block the page.
          </li>
          <li>
            <strong>News feed</strong> — one boundary, plus an <code>ErrorBoundary</code> wrapper
            to handle the timeout case gracefully.
          </li>
        </ul>

        <pre>
          <code>{`// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default async function DashboardPage() {
  // session is fast — read synchronously from server context
  const session = await getServerSession();

  return (
    <div className="dashboard-layout">
      {/* Header: no Suspense — static, renders in the shell */}
      <DashboardHeader user={session.user} />

      <div className="dashboard-body">
        {/* Sidebar: 300ms — short skeleton acceptable */}
        <Suspense fallback={<SidebarSkeleton />}>
          <UserSidebar userId={session.user.id} />
        </Suspense>

        <main>
          {/* Chart: 1200ms — independent boundary */}
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart userId={session.user.id} />
          </Suspense>

          {/* News feed: slow + unreliable — ErrorBoundary + Suspense */}
          <ErrorBoundary fallback={<NewsFeedError />}>
            <Suspense fallback={<FeedSkeleton />}>
              <NewsFeed />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// Each sub-component fetches its own data
async function UserSidebar({ userId }: { userId: string }) {
  const settings = await getUserSettings(userId);
  return <SidebarContent settings={settings} />;
}

async function RevenueChart({ userId }: { userId: string }) {
  const data = await db.revenue.aggregate({ where: { userId } });
  return <Chart data={data} />;
}

async function NewsFeed() {
  // Add a timeout to avoid blocking indefinitely
  const items = await Promise.race([
    fetchNewsFeed(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("News feed timeout")), 3000)
    ),
  ]);
  return <FeedList items={items} />;
}`}</code>
        </pre>

        <p>
          <strong>Waterfall avoidance:</strong> if sidebar and chart data were fetched in a
          single shared component, the sequential awaits would create a waterfall:
        </p>
        <pre>
          <code>{`// ❌ Waterfall: chart waits for sidebar (300ms + 1200ms = 1500ms total)
async function DashboardBody({ userId }: { userId: string }) {
  const settings = await getUserSettings(userId);  // 300ms
  const chart = await db.revenue.aggregate({ /* ... */ }); // then 1200ms
  return (/* ... */);
}

// ✅ Fix: Promise.all if they must render together
const [settings, chart] = await Promise.all([
  getUserSettings(userId),  // fires at t=0
  db.revenue.aggregate({ where: { userId } }), // fires at t=0 — total = 1200ms
]);

// ✅ Better fix: separate components with separate Suspense (as shown above)
// Sidebar renders at 300ms, chart at 1200ms — progressive reveal`}</code>
        </pre>

        <p>
          <strong>News feed timeout:</strong> wrapping the fetch in <code>Promise.race</code>{" "}
          with a timeout promise causes the Server Component to throw after 3 seconds. The{" "}
          <code>ErrorBoundary</code> catches the throw and renders{" "}
          <code>{"<NewsFeedError />"}</code> — a "Feed unavailable, try again" message — instead
          of a blank section or an unhandled server error. The rest of the dashboard is
          unaffected because the error is contained within that single boundary.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Streaming improves perceived performance, not raw data speed.</strong> The
          shell renders in milliseconds regardless of query latency. Users see real content
          dramatically earlier; queries still take the same time.
        </li>
        <li>
          <strong>The shell must have zero async work.</strong> Any <code>await</code> in the
          page component itself delays the shell. All async work belongs inside Suspense-wrapped
          leaf components.
        </li>
        <li>
          <strong><code>loading.tsx</code> is coarse; manual Suspense is precise.</strong> Use{" "}
          <code>loading.tsx</code> for navigation feedback and simple pages. Use manual Suspense
          for dashboards and pages with heterogeneous data latency to unlock progressive reveal.
        </li>
        <li>
          <strong>Avoid sequential awaits — they create waterfalls inside Suspense.</strong> Use{" "}
          <code>Promise.all</code> when data is tightly coupled, or push fetches into separate
          components each with their own boundary for maximum parallelism.
        </li>
        <li>
          <strong><code>use(promise)</code> bridges server data into Client Components.</strong>{" "}
          Start the fetch on the server, pass the in-flight <code>Promise</code> as a prop, and
          read it with <code>use()</code>. Eliminates the client-side waterfall that{" "}
          <code>useEffect</code> data fetching creates.
        </li>
        <li>
          <strong>Wrap unreliable boundaries in an <code>ErrorBoundary</code>.</strong> Slow
          external APIs that timeout will throw from Server Components. An{" "}
          <code>ErrorBoundary</code> containing the Suspense keeps the error isolated — the rest
          of the page continues to render and stream normally.
        </li>
      </ul>
    </div>
  );
}
