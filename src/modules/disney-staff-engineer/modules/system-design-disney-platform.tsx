import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const highLevelArchDiagram = String.raw`flowchart TD
  USER["100M+ Users\nWeb, Mobile Web, Native Apps"]
  CDN["Global CDN\nCloudFront / Fastly\n100+ edge locations"]
  USER -->|"static assets, cached HTML"| CDN
  CDN -->|"cache miss"| SHELL["Shell App\nNext.js on Vercel / AWS\nSSR, routing, auth"]
  SHELL --> MFE1["Disney+ MFE"]
  SHELL --> MFE2["ESPN MFE"]
  SHELL --> MFE3["Parks MFE"]
  SHELL -->|"API calls"| BFF["BFF Layer\nAggregates downstream services"]
  BFF --> CONTENT["Content Service\n(catalog, metadata)"]
  BFF --> USER_SVC["User Service\n(profile, watchlist)"]
  BFF --> RECS["Recommendations\n(ML service)"]
  BFF --> AUTH["Auth Service\nDisney Account SSO"]`;

const authFlowDiagram = String.raw`sequenceDiagram
  participant U as User Browser
  participant SHELL as Shell App
  participant AUTH as Disney Account SSO
  participant TOKEN as Token Service
  participant API as Content BFF

  U->>SHELL: Navigate to disney.com
  SHELL->>AUTH: Check session cookie
  AUTH-->>SHELL: Session valid (or redirect to login)
  SHELL->>TOKEN: Exchange session for access token (JWT)
  TOKEN-->>SHELL: access_token (15min TTL) + refresh_token (30d TTL)
  SHELL->>API: GET /homepage + Authorization: Bearer {access_token}
  API-->>SHELL: HomePage data
  SHELL-->>U: Render homepage

  Note over U,SHELL: Token expiry flow
  U->>SHELL: Navigate to content page (token expired)
  SHELL->>TOKEN: POST /token/refresh (refresh_token in httpOnly cookie)
  TOKEN-->>SHELL: new access_token
  SHELL->>API: GET /content/{id} + new token
  API-->>SHELL: Content data`;

const observabilityDiagram = String.raw`flowchart LR
  APP["Frontend App\nReact / Next.js"]
  APP -->|"errors"| SENTRY["Sentry\nError tracking\n+ stack traces"]
  APP -->|"custom events"| ANALYTICS["Disney Analytics\nUser behavior\nbusiness metrics"]
  APP -->|"vitals"| RUM["Real User Monitoring\nLCP, CLS, INP\nper route, per region"]
  APP -->|"logs"| CLOUDWATCH["CloudWatch\nServer logs\n(SSR + API routes)"]
  SENTRY --> ALERT["PagerDuty\nOn-call alerts"]
  RUM --> DASHBOARDS["Grafana\nPerformance dashboards"]
  CLOUDWATCH --> DASHBOARDS`;

export const toc: TocItem[] = [
  { id: "requirements", title: "Requirements Gathering", level: 2 },
  { id: "high-level-arch", title: "High-Level Architecture", level: 2 },
  { id: "frontend-arch", title: "Frontend Architecture", level: 2 },
  { id: "component-system", title: "Component System Design", level: 3 },
  { id: "state-at-scale", title: "State Management at Scale", level: 3 },
  { id: "auth-flow", title: "Authentication Architecture", level: 2 },
  { id: "sso-design", title: "Disney Account SSO Flow", level: 3 },
  { id: "token-strategy", title: "Token Storage & Refresh Strategy", level: 3 },
  { id: "content-delivery", title: "Content Delivery Architecture", level: 2 },
  { id: "cdn-edge", title: "CDN and Edge Strategy", level: 3 },
  { id: "real-time", title: "Real-Time Features", level: 2 },
  { id: "cross-platform", title: "Cross-Platform Strategy", level: 2 },
  { id: "observability", title: "Observability & Monitoring", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "System Design Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SystemDesignDisneyPlatform() {
  return (
    <div className="article-content">
      <p>
        The Disney staff engineer role will almost certainly include a system design interview
        where you are asked to design a major frontend platform — Disney+, the ESPN live
        experience, or the Parks digital layer. This module walks through the complete
        architecture of a Disney-scale web platform: requirements, component system, auth,
        content delivery, real-time features, cross-platform, and observability.
      </p>

      <h2 id="requirements">Requirements Gathering</h2>
      <p>
        The first five minutes of a system design interview are the most important. Before
        drawing a single box, ask clarifying questions. For a Disney-scale platform:
      </p>
      <pre><code>{`// Clarifying questions to ask before designing:

// Scale:
"How many concurrent users are we designing for? 100M DAU? Peak during Marvel releases?"
"What are the geographic regions — US only, or global?"

// User types:
"Do we handle guest (unauthenticated) users, or must all users be logged in?"
"What subscription tiers exist and how do they affect content access?"

// Platform scope:
"Are we designing for web only, or also mobile web, native apps, and TV clients?"
"If cross-platform, can I scope to web first and note mobile considerations?"

// Features:
"Is live streaming (ESPN live games) in scope?"
"Does offline viewing (downloaded content) need to be considered?"

// Reliability:
"What's the availability target? 99.9% = ~9 hours downtime/year. 99.99% = ~1 hour/year."
"What are the read/write ratio expectations? Content platforms are typically 99:1 read-heavy."

// Non-functional:
"What's the acceptable LCP target? < 2.5s globally?"
"Is there a performance budget per page?"

// After gathering requirements, restate them explicitly:
// "So I understand we're designing the Disney+ web client for 100M DAU globally,
// targeting 99.99% availability, <2.5s LCP, supporting authenticated users on
// web and mobile web — and I'll note TV/native as out-of-scope but mention
// where my design extends naturally. Does that sound right?"`}</code></pre>

      <h2 id="high-level-arch">High-Level Architecture</h2>

      <MermaidDiagram
        chart={highLevelArchDiagram}
        title="Disney Web Platform — High-Level Architecture"
        caption="The CDN serves 95%+ of requests at edge. The Shell app handles routing, auth, and micro-frontend orchestration. The BFF layer aggregates downstream services to minimize client round trips."
        minHeight={440}
      />

      <h2 id="frontend-arch">Frontend Architecture</h2>

      <h3 id="component-system">Component System Design</h3>
      <p>
        At Disney scale, the component system is owned by a dedicated Platform team.
        It serves five to ten product teams simultaneously. Design decisions in the component
        system have multiplier effects — a 5% performance improvement in the base
        <code>ContentCard</code> benefits every page on every product.
      </p>
      <pre><code>{`// Component hierarchy:
// Layer 1: Design System primitives (@disney/ui)
//   Button, Input, Modal, Icon, Avatar, Badge
//   These are dumb, unstyled or minimally styled, maximally accessible

// Layer 2: Platform components (@disney/platform-components)
//   ContentCard, ContentRow, HeroCarousel, NavigationBar
//   These consume @disney/ui primitives and add Disney-specific semantics

// Layer 3: Feature components (owned by product teams)
//   WatchlistButton, ParentalControls, EpisodeSelector
//   These compose Layer 2 components and connect to product-specific APIs

// Component contract example — ContentCard
interface ContentCardProps {
  // Required data
  id: ContentId;
  title: string;
  thumbnailUrl: string;

  // Optional enhancements
  badge?: "NEW" | "EXCLUSIVE" | "LIVE";
  progress?: number;          // 0-100 for continue watching
  episodeCount?: number;      // for series

  // Callbacks — stable refs expected (use useCallback at call site)
  onPlay?: (id: ContentId) => void;
  onAddToWatchlist?: (id: ContentId) => void;

  // A11y
  "aria-label"?: string;      // override for custom screen reader text
}

// The content card is used on EVERY page — it must be:
// 1. Virtualization-compatible (must work inside react-virtual scroll window)
// 2. Skeleton-compatible (same dimensions as the placeholder)
// 3. Accessibility-complete (keyboard navigation, focus management)
// 4. Server-render-compatible (no client-only APIs in the component itself)`}</code></pre>

      <h3 id="state-at-scale">State Management at Scale</h3>
      <p>
        At Disney scale, state management is split by concern. Each concern has a different
        ownership model and update frequency.
      </p>

      <ArticleTable caption="State management strategy by concern for Disney web platform." minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>State Concern</th>
              <th>Solution</th>
              <th>Owner</th>
              <th>Update Frequency</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auth / session</td>
              <td>React Context + httpOnly cookie</td>
              <td>Shell App (Platform team)</td>
              <td>On login/logout/token refresh</td>
            </tr>
            <tr>
              <td>UI state (sidebar, modal, theme)</td>
              <td>Zustand store in Shell</td>
              <td>Platform team</td>
              <td>Per user interaction</td>
            </tr>
            <tr>
              <td>Content catalog / search results</td>
              <td>React Query / SWR with CDN-backed APIs</td>
              <td>Each MFE independently</td>
              <td>On page navigation, ISR background</td>
            </tr>
            <tr>
              <td>Playback state (position, quality)</td>
              <td>Local Zustand store + persisted to server</td>
              <td>Disney+ MFE team</td>
              <td>Continuous (every 30s sync)</td>
            </tr>
            <tr>
              <td>Live scores / real-time updates</td>
              <td>WebSocket / SSE + local state</td>
              <td>ESPN MFE team</td>
              <td>Every few seconds during live events</td>
            </tr>
            <tr>
              <td>User preferences / watchlist</td>
              <td>React Query with optimistic updates</td>
              <td>Platform team (shared API)</td>
              <td>On user action, synced to server</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="auth-flow">Authentication Architecture</h2>
      <p>
        Disney has one of the most complex auth requirements in consumer web: a single Disney
        Account must seamlessly authorize access to Disney+, ESPN+, Hulu, ABC, and the Parks
        digital experience — each with potentially different entitlements. Cross-domain SSO
        without re-authentication is the core challenge.
      </p>

      <MermaidDiagram
        chart={authFlowDiagram}
        title="Disney Account SSO Authentication Flow"
        caption="The Shell app exchanges the session cookie for short-lived JWTs. The refresh token lives in an httpOnly cookie — inaccessible to JavaScript — preventing XSS token theft."
        minHeight={420}
      />

      <h3 id="sso-design">Disney Account SSO Flow</h3>
      <pre><code>{`// Cross-domain SSO — how disney.com auth works on espn.com:

// 1. User logs in at disney.com
//    → Session cookie set on .disney.com (shared across subdomains)
//    → Access token (JWT) + Refresh token issued

// 2. User navigates to espn.com
//    → espn.com shell reads the disney.com session cookie
//    → Calls Token Service: "exchange this session for ESPN-scoped access token"
//    → Gets ESPN access token with ESPN-specific claims (entitlements)

// 3. No re-login required — single Disney Account controls everything

// Token architecture:
// access_token: JWT, 15-minute TTL, stateless, contains user claims
// refresh_token: opaque, 30-day TTL, stored server-side (can be revoked)

// Why short access token TTL?
// If a JWT is stolen via XSS, it is useless after 15 minutes.
// Revoking a JWT requires server-side blocklist (expensive).
// Revoking a refresh token is cheap — just delete the server record.

// Refresh flow:
async function refreshTokenSilently(): Promise<string> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",   // sends httpOnly refresh_token cookie
  });
  if (!res.ok) {
    // Refresh token expired or revoked — redirect to login
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  const { access_token } = await res.json();
  return access_token;
}`}</code></pre>

      <h3 id="token-strategy">Token Storage & Refresh Strategy</h3>
      <pre><code>{`// NEVER store tokens in localStorage — XSS reads localStorage trivially
// ✗ localStorage.setItem("access_token", token);

// Access token storage options:
// Option A: In-memory (JavaScript variable) — most secure, lost on refresh
// Option B: httpOnly cookie — secure, works across tabs, survives refresh

// For Disney's use case: in-memory access token + httpOnly refresh token cookie
// Access token is re-fetched from httpOnly cookie on page load / tab focus

// Automatic token refresh using Axios/Fetch interceptor:
let cachedToken: string | null = null;

async function getValidToken(): Promise<string> {
  if (cachedToken && !isTokenExpired(cachedToken)) {
    return cachedToken;
  }
  cachedToken = await refreshTokenSilently();
  return cachedToken;
}

// Every API call goes through this function — token management is centralized
async function apiCall<T>(url: string): Promise<T> {
  const token = await getValidToken();
  const res = await fetch(url, {
    headers: { Authorization: \`Bearer \${token}\` },
  });
  return res.json() as Promise<T>;
}`}</code></pre>

      <h2 id="content-delivery">Content Delivery Architecture</h2>

      <h3 id="cdn-edge">CDN and Edge Strategy</h3>
      <p>
        At 100M+ users, the CDN cache hit rate directly determines infrastructure cost and
        latency. Targeting 95%+ cache hit rate means 95% of users never reach the origin
        server. The key is designing cache-friendly URLs and using CDN features like
        stale-while-revalidate and surrogate key invalidation.
      </p>
      <pre><code>{`// Cache-Control strategy per resource type:

// JS/CSS bundles — content-hashed filenames, cache forever
// /_next/static/chunks/main-abc123.js
Cache-Control: public, max-age=31536000, immutable

// Page HTML (ISR) — cache at CDN, revalidate in background
// Surrogate-Key header enables precise invalidation by content ID
Cache-Control: public, s-maxage=300, stale-while-revalidate=86400
Surrogate-Key: content-mov-123 content-type-movie

// API responses (content catalog) — cache at edge
Cache-Control: public, s-maxage=60, stale-while-revalidate=3600

// User-specific data — never cache at CDN
Cache-Control: private, no-cache

// Content publish invalidation:
// CMS publishes mov-123 → webhook fires → invalidate all pages with that key
async function invalidateContentCache(contentId: string) {
  // 1. Next.js ISR revalidation
  await fetch(\`\${env.SITE_URL}/api/revalidate?tag=content-\${contentId}\`, {
    headers: { Authorization: \`Bearer \${env.REVALIDATE_SECRET}\` },
  });

  // 2. CDN surrogate key purge (CloudFront/Fastly)
  await fastly.purge({ surrogate_key: \`content-\${contentId}\` });
}`}</code></pre>

      <h2 id="real-time">Real-Time Features</h2>
      <p>
        Disney&apos;s ESPN property requires real-time score updates during live games.
        The architecture choice between WebSockets, Server-Sent Events (SSE), and polling
        depends on the communication pattern and scale.
      </p>

      <ArticleTable caption="Real-time technology options for Disney/ESPN live features." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Technology</th>
              <th>Communication</th>
              <th>Pros</th>
              <th>Cons</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>HTTP Polling</td>
              <td>Client pulls every N seconds</td>
              <td>Simple, works everywhere, no special infrastructure</td>
              <td>Latency = poll interval, wasted requests when no change</td>
              <td>Updates tolerate 30s delay, small user count</td>
            </tr>
            <tr>
              <td>Server-Sent Events (SSE)</td>
              <td>Server pushes, one direction</td>
              <td>Simple HTTP, auto-reconnect, works through proxies</td>
              <td>One-directional only, limited connections per browser</td>
              <td>Live scores, notifications, news feeds</td>
            </tr>
            <tr>
              <td>WebSockets</td>
              <td>Bidirectional, full-duplex</td>
              <td>Lowest latency, bidirectional, efficient for chat/multiplayer</td>
              <td>Complex infrastructure, proxy issues, no auto-reconnect</td>
              <td>Live chat, multiplayer games, collaborative editing</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// ESPN Live Scoreboard — SSE implementation
// Server (Next.js Route Handler):
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Push score update every time a score changes
      const unsubscribe = scoreEventBus.subscribe((gameId, score) => {
        const event = \`data: \${JSON.stringify({ gameId, score })}\n\n\`;
        controller.enqueue(new TextEncoder().encode(event));
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Client (React):
function useLiveScores() {
  const [scores, setScores] = useState<Record<string, Score>>({});

  useEffect(() => {
    const es = new EventSource("/api/scores/live");

    es.onmessage = (e) => {
      const { gameId, score } = JSON.parse(e.data) as ScoreUpdate;
      setScores(prev => ({ ...prev, [gameId]: score }));
    };

    es.onerror = () => es.close(); // reconnect handled by browser

    return () => es.close();
  }, []);

  return scores;
}`}</code></pre>

      <h2 id="cross-platform">Cross-Platform Strategy</h2>
      <p>
        Disney serves users across web, mobile web, iOS, Android, Apple TV, Fire TV, and Roku.
        The staff engineer must define the code-sharing strategy without over-engineering.
      </p>
      <pre><code>{`// Code sharing layers:
// Layer 1: Business logic (maximum sharing)
//   - TypeScript domain models: ContentItem, User, Subscription
//   - Validation schemas: Zod schemas shared between web and API
//   - Utilities: date formatting, duration formatting, content type checks
//   → Shared as npm packages: @disney/domain, @disney/utils

// Layer 2: API clients (high sharing)
//   - BFF client, content service client
//   → Shared as @disney/api-client (isomorphic — works in React + React Native)

// Layer 3: UI (minimal sharing — intentionally platform-specific)
//   - Web: React with Tailwind or Emotion
//   - Mobile: React Native with StyleSheet
//   - TV: React Native TV with D-pad navigation
//   → Platform-specific packages; sharing here creates lowest-common-denominator UI

// Design tokens DO share across platforms:
// @disney/tokens — colors, spacing, typography scale
// Consumed by web CSS, React Native StyleSheet, and native design specs`}</code></pre>

      <h2 id="observability">Observability & Monitoring</h2>

      <MermaidDiagram
        chart={observabilityDiagram}
        title="Disney Web Platform — Observability Stack"
        caption="Four signal types: errors (Sentry), user behavior (Analytics), performance vitals (RUM), and infrastructure logs (CloudWatch). All feed into dashboards for on-call engineers."
        minHeight={280}
      />

      <pre><code>{`// Observability setup for a Disney frontend:

// 1. Error tracking — Sentry
Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 0.1,        // sample 10% of transactions for performance
  environment: env.NEXT_PUBLIC_ENV,
  release: env.NEXT_PUBLIC_VERSION,
  beforeSend(event) {
    // Strip PII before sending to Sentry
    if (event.user?.email) delete event.user.email;
    return event;
  },
});

// 2. Real User Monitoring — Core Web Vitals
import { onLCP, onCLS, onINP } from "web-vitals";

function sendToRUM(metric: Metric) {
  analytics.track("web_vital", {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,  // "good" | "needs-improvement" | "poor"
    route: window.location.pathname,
    deviceType: getDeviceType(),
    region: getUserRegion(),
  });
}

onLCP(sendToRUM);
onCLS(sendToRUM);
onINP(sendToRUM);

// 3. Custom business metrics
analytics.track("content.play.started", {
  contentId,
  contentType,
  subscriptionTier,
  deviceType,
  network: navigator.connection?.effectiveType, // "4g" | "3g" | "slow-2g"
});`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Design the Disney+ frontend architecture for 100M concurrent users.'"
        intro="This is a 45-minute system design question. You will not cover everything — the interviewer knows this. Prioritize depth over breadth on the two or three most interesting problems."
        steps={[
          "Spend 5 minutes on requirements: user scale, geographic distribution, platform scope, availability target. Restate them back before designing.",
          "Draw the high-level diagram first: CDN → Shell App → MFEs → BFF → Downstream services. Label each box with the technology and who owns it.",
          "Go deep on one hard problem: auth (cross-domain SSO), real-time (live scores), or performance (CDN strategy). Pick the one you know best and explain it in detail.",
          "Proactively address failure modes: 'What happens when the recommendations service is down? The BFF falls back to popular content. The user never sees an error — they see a different content row.'",
          "End with observability: 'No architecture is complete without monitoring. I would instrument LCP, CLS, and INP per route, alert on Sentry error rate spikes, and track business metrics like play-started events per minute during live events.'",
        ]}
      />

      <InterviewChallenge
        title="System Design: Disney Parks Digital Experience"
        scenario={
          <>
            Disney wants a new web experience for theme park guests. The experience must:
            show real-time wait times for every ride (updated every 60 seconds), allow guests
            to purchase Lightning Lane passes, display the park map with current crowd density,
            and work on mobile devices with poor cellular connectivity inside the park.
          </>
        }
        tasks={[
          "What are the unique technical challenges of this use case vs Disney+ streaming? Name at least three.",
          "How do you architect the real-time wait time updates? Compare SSE vs polling for this use case.",
          "The park map with crowd density is a heavy asset. How do you ensure it loads quickly on 3G inside the park?",
          "Lightning Lane purchases must be idempotent — if the user's network drops mid-purchase, they cannot be charged twice. How do you design for this?",
          "How do you handle offline or poor connectivity? What features degrade gracefully and what requires connectivity?",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Requirements first, always</strong> — spend the first 5 minutes asking clarifying questions. Design for the stated requirements, not imagined ones.</li>
        <li><strong>CDN cache hit rate is the primary scale lever</strong> — targeting 95%+ means 95% of users never touch the origin server.</li>
        <li><strong>Auth architecture</strong> at Disney scale means cross-domain SSO with short-lived JWTs and httpOnly refresh tokens — never store tokens in localStorage.</li>
        <li><strong>SSE is the right choice for ESPN live scores</strong> — one-directional, HTTP-native, auto-reconnects, works through proxies.</li>
        <li><strong>Design for partial failure</strong> — every external dependency needs a fallback. The user should never see a crash because one downstream service degraded.</li>
        <li>Observability is not optional at this scale — <strong>four signal types</strong>: errors, user behavior, performance vitals, and infrastructure logs. Alert on all four.</li>
      </ul>
    </div>
  );
}
