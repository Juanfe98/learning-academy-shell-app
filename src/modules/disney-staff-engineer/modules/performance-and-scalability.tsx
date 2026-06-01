import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cacheHierarchyDiagram = String.raw`flowchart TD
  USER["User Browser\nCache-Control headers\nService Worker cache"]
  USER -->|"cache miss"| CDN["CDN Edge Node\nCloudFront / Fastly\nGeographically distributed"]
  CDN -->|"cache miss"| ORIGIN["Origin Server\nNext.js / Node.js\nResponse cache (Redis)"]
  ORIGIN -->|"cache miss"| DB["Database / API\nContent service\nPostgres / DynamoDB"]
  CDN -."cache hit: ~5ms".-> USER
  ORIGIN -."cache hit: ~20ms".-> USER
  DB -."cold: ~200-500ms".-> USER
  EVICT["CMS publish webhook\nCache invalidation signal"]
  EVICT -."revalidatePath + CDN purge".-> ORIGIN
  EVICT -."surrogate key purge".-> CDN`;

const webVitalsDiagram = String.raw`flowchart LR
  LCP["LCP — Largest Contentful Paint\nTarget: < 2.5s\nHero image / above-fold text"]
  CLS["CLS — Cumulative Layout Shift\nTarget: < 0.1\nLayout stability score"]
  INP["INP — Interaction to Next Paint\nTarget: < 200ms\nResponsiveness to user input"]
  LCP --> L1["Preload hero image\nnext/image priority prop\nSSR above fold"]
  CLS --> C1["Reserve space for images\nFixed-size skeleton loaders\nAvoid injecting DOM above content"]
  INP --> I1["Defer non-critical JS\nuseTransition for heavy updates\nDebounce expensive handlers"]`;

export const toc: TocItem[] = [
  { id: "core-web-vitals", title: "Core Web Vitals", level: 2 },
  { id: "lcp", title: "LCP — Largest Contentful Paint", level: 3 },
  { id: "cls", title: "CLS — Cumulative Layout Shift", level: 3 },
  { id: "inp", title: "INP — Interaction to Next Paint", level: 3 },
  { id: "bundle-optimization", title: "Bundle Optimization", level: 2 },
  { id: "code-splitting", title: "Code Splitting Strategy", level: 3 },
  { id: "bundle-analysis", title: "Bundle Analysis & Tree Shaking", level: 3 },
  { id: "runtime-performance", title: "Runtime Performance", level: 2 },
  { id: "web-workers", title: "Web Workers for Heavy Computation", level: 3 },
  { id: "memory-management", title: "Memory Management & Leak Detection", level: 3 },
  { id: "high-availability", title: "High Availability Architecture", level: 2 },
  { id: "cdn-strategy", title: "CDN Strategy", level: 3 },
  { id: "circuit-breaker", title: "Circuit Breaker Pattern", level: 3 },
  { id: "graceful-degradation", title: "Graceful Degradation", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Performance Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PerformanceAndScalability() {
  return (
    <div className="article-content">
      <p>
        The Disney JD specifically requires experience building &quot;highly scalable and
        performant web applications.&quot; At 100M+ concurrent users across Disney+, ESPN,
        and Parks, performance is not an optimization concern — it is a product requirement.
        This module covers Core Web Vitals, bundle strategy, runtime performance, and the
        high-availability architecture patterns Disney actually deploys.
      </p>

      <h2 id="core-web-vitals">Core Web Vitals</h2>
      <p>
        Google&apos;s Core Web Vitals are the three field metrics that directly impact
        search ranking and user experience. Disney properties are judged on all three.
        Know them well enough to diagnose regressions in a production profiling session.
      </p>

      <MermaidDiagram
        chart={webVitalsDiagram}
        title="Core Web Vitals — Targets and Primary Fixes"
        caption="Each vital has a distinct cause and fix. LCP is about initial load speed. CLS is about layout stability. INP replaced FID in 2024 and measures responsiveness."
        minHeight={320}
      />

      <h3 id="lcp">LCP — Largest Contentful Paint</h3>
      <p>
        LCP measures when the largest above-fold element becomes visible. For Disney+,
        this is the hero image. The most common LCP killers are unoptimized images,
        render-blocking resources, and slow server response times.
      </p>
      <pre><code>{`// Next.js: priority prop preloads the hero image with <link rel="preload">
// Do NOT use priority on every image — only the above-fold hero
<Image
  src={hero.thumbnailUrl}
  alt={hero.title}
  width={1920}
  height={1080}
  priority              // generates <link rel="preload"> in <head>
  sizes="100vw"
  style={{ objectFit: "cover" }}
/>

// Server-side: send critical CSS inline to avoid render-blocking
// In Next.js App Router, this happens automatically for CSS Modules
// For emotion/styled-components: ServerStyleSheet + streaming SSR

// Critical resource hints
// next/head or Next.js 13+ metadata:
export const metadata = {
  other: {
    "link:preconnect:cdn": '<link rel="preconnect" href="https://cdn.disney.com">',
  },
};

// Measure in code: PerformanceObserver for LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  // Report to RUM (Real User Monitoring) system
  analytics.reportWebVital({ name: "LCP", value: lastEntry.startTime });
}).observe({ type: "largest-contentful-paint", buffered: true });`}</code></pre>

      <h3 id="cls">CLS — Cumulative Layout Shift</h3>
      <p>
        CLS measures the visual stability of the page — how much content unexpectedly moves
        after initial render. The most common causes on content sites are images without
        explicit dimensions, dynamically injected banners, and web fonts causing text reflow.
      </p>
      <pre><code>{`// Root cause 1: images without explicit dimensions
// Bad: browser doesn't know height before image loads → layout shift
<img src={thumbnail} alt="movie poster" />

// Good: explicit aspect ratio reserved via CSS aspect-ratio or width/height
<Image
  src={thumbnail}
  alt="movie poster"
  width={300}
  height={450}    // 2:3 poster ratio — space reserved before image loads
/>

// Root cause 2: injected content above existing content
// Bad: banner injected after page load pushes content down
useEffect(() => {
  if (userIsEligible) setShowBanner(true); // causes layout shift!
}, [userIsEligible]);

// Good: reserve the space even when empty, use opacity/height transition
<div style={{ minHeight: showBanner ? "auto" : "80px" }}>
  {showBanner && <PromoBanner />}
</div>

// Root cause 3: web font FOUT (flash of unstyled text)
// Fix: font-display: optional or use next/font which handles this automatically
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });`}</code></pre>

      <h3 id="inp">INP — Interaction to Next Paint</h3>
      <p>
        INP replaced FID in March 2024 and measures the <strong>worst-case interaction
        latency</strong> throughout the entire page session (not just the first interaction).
        Heavy JavaScript on the main thread is the primary cause of poor INP.
      </p>
      <pre><code>{`// Root cause: heavy synchronous work blocking the main thread
// Bad: parsing and filtering 5000 items on every keystroke
function handleSearch(query: string) {
  const results = allContent.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  setFilteredContent(results);
}

// Fix 1: useTransition — keep input responsive, defer the filtering
const [isPending, startTransition] = useTransition();
function handleSearch(query: string) {
  setQuery(query);               // urgent: update immediately
  startTransition(() => {
    setFilteredContent(allContent.filter(/* ... */)); // non-urgent
  });
}

// Fix 2: move heavy work off the main thread with a Web Worker
// See the Web Workers section below

// Fix 3: debounce to reduce invocation frequency
const handleSearch = useMemo(
  () => debounce((query: string) => {
    setFilteredContent(allContent.filter(/* ... */));
  }, 150),
  [allContent]
);`}</code></pre>

      <h2 id="bundle-optimization">Bundle Optimization</h2>

      <h3 id="code-splitting">Code Splitting Strategy</h3>
      <p>
        Next.js splits by route automatically. Within a route, you control splitting with
        <code>dynamic()</code>. The strategy: <strong>defer anything not needed for the
        initial paint</strong> — modals, video players, rich text editors, analytics SDKs.
      </p>
      <pre><code>{`import dynamic from "next/dynamic";

// Heavy component deferred until user opens the modal
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  loading: () => <PlayerSkeleton />,
  ssr: false,          // player requires browser APIs — skip SSR entirely
});

// Map only loads when the user navigates to Parks tab
const ParksMap = dynamic(() => import("@/components/ParksMap"), {
  loading: () => <MapSkeleton />,
});

// Third-party analytics: defer until after page is interactive
// Use the "afterInteractive" strategy via next/script
import Script from "next/script";
<Script
  src="https://analytics.disney.com/sdk.js"
  strategy="afterInteractive"
  onLoad={() => window.DisneyAnalytics.init({ propertyId: "disney-web" })}
/>`}</code></pre>

      <h3 id="bundle-analysis">Bundle Analysis & Tree Shaking</h3>
      <p>
        Use <code>@next/bundle-analyzer</code> to visualize bundle composition. Common
        bundle bloat patterns to catch: importing an entire utility library when you need
        one function, importing moment.js instead of date-fns, and barrel files
        (<code>index.ts</code>) that prevent tree shaking.
      </p>
      <pre><code>{`// Bad: imports entire lodash (71KB gzipped)
import _ from "lodash";
const sorted = _.sortBy(items, "title");

// Good: import only what you need (tree-shaken)
import sortBy from "lodash/sortBy";

// Bad: barrel file prevents tree shaking
// components/index.ts re-exports everything:
export * from "./VideoPlayer";  // pulls in the player even if unused

// Good: named path imports bypass the barrel
import { Button } from "@/components/ui/Button";

// Analyze your bundle:
// next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
module.exports = withBundleAnalyzer({});

// Run: ANALYZE=true pnpm build`}</code></pre>

      <h2 id="runtime-performance">Runtime Performance</h2>

      <h3 id="web-workers">Web Workers for Heavy Computation</h3>
      <p>
        Web Workers run JavaScript on a separate thread, leaving the main thread free for
        user interactions. Use them for: parsing large JSON responses, image manipulation,
        search indexing, and any operation that takes &gt;50ms.
      </p>
      <pre><code>{`// content-search.worker.ts — runs off main thread
self.onmessage = (e: MessageEvent<{ items: ContentItem[]; query: string }>) => {
  const { items, query } = e.data;
  const results = items.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.tags.some(tag => tag.includes(query))
  );
  self.postMessage(results);
};

// Main thread — non-blocking search
function useWorkerSearch(items: ContentItem[]) {
  const workerRef = useRef<Worker | null>(null);
  const [results, setResults] = useState<ContentItem[]>([]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./content-search.worker.ts", import.meta.url)
    );
    workerRef.current.onmessage = (e: MessageEvent<ContentItem[]>) => {
      setResults(e.data);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const search = useCallback((query: string) => {
    workerRef.current?.postMessage({ items, query });
  }, [items]);

  return { results, search };
}`}</code></pre>

      <h3 id="memory-management">Memory Management & Leak Detection</h3>
      <p>
        The most common React memory leak: setting state on an unmounted component after an
        async operation. React 18 removed the warning but the leak is still real. The fix
        pattern uses an <code>AbortController</code> to cancel in-flight requests on cleanup.
      </p>
      <pre><code>{`function useContentDetails(contentId: string) {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(\`/api/content/\${contentId}\`, {
          signal: controller.signal,  // fetch cancels on abort
        });
        const data = ContentSchema.parse(await res.json());
        setContent(data);            // only runs if component still mounted
      } catch (err) {
        if ((err as Error).name !== "AbortError") throw err; // ignore cancellation
      }
    }

    load();
    return () => controller.abort(); // cleanup: cancel pending fetch on unmount
  }, [contentId]);

  return content;
}

// Detect leaks in development:
// React DevTools Profiler → "why did this render?"
// Chrome DevTools → Memory → Heap Snapshot → compare before/after navigation
// Look for: detached DOM nodes, event listeners not removed, growing closures`}</code></pre>

      <h2 id="high-availability">High Availability Architecture</h2>

      <MermaidDiagram
        chart={cacheHierarchyDiagram}
        title="Disney Web Platform — Cache Hierarchy"
        caption="Every cache tier reduces latency and origin load. The browser cache is the fastest (0ms). CDN edge nodes serve globally distributed users at ~5ms. Only cache misses reach the origin."
        minHeight={420}
      />

      <h3 id="cdn-strategy">CDN Strategy</h3>
      <p>
        Content Delivery Networks serve static assets and cached responses from edge nodes
        geographically close to the user. For Disney, CloudFront or Fastly serves images,
        JS bundles, and cached HTML responses for millions of users simultaneously.
      </p>
      <pre><code>{`// Cache-Control headers for different asset types
// Static assets (hashed filenames — safe to cache forever)
// Next.js does this automatically for /_next/static/*
Cache-Control: public, max-age=31536000, immutable

// HTML pages (ISR or SSR — short cache, must revalidate)
Cache-Control: public, s-maxage=60, stale-while-revalidate=300

// User-specific pages (cannot be cached at CDN)
Cache-Control: private, no-cache

// CDN cache invalidation on content publish
// CMS webhook → your invalidation endpoint
async function handleCmsPublish(contentId: string) {
  // Tell Next.js to revalidate ISR pages
  await fetch(\`/api/revalidate?id=\${contentId}&secret=\${env.REVALIDATE_SECRET}\`);

  // Purge CloudFront cache using surrogate keys
  await cloudfront.createInvalidation({
    DistributionId: env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: { Quantity: 1, Items: [\`/content/\${contentId}*\`] },
    },
  });
}`}</code></pre>

      <h3 id="circuit-breaker">Circuit Breaker Pattern</h3>
      <p>
        When a downstream API (content service, recommendations engine) degrades or fails,
        a circuit breaker prevents the frontend from hammering it with retries that will also
        fail. After a threshold of failures, the circuit &quot;opens&quot; — requests return
        cached data or a fallback immediately, without touching the degraded service.
      </p>
      <pre><code>{`class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private nextAttempt = 0;

  constructor(
    private readonly threshold: number = 5,      // failures before opening
    private readonly resetTimeoutMs: number = 30000  // ms before trying again
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === "open") {
      if (Date.now() < this.nextAttempt) return fallback;
      this.state = "half-open"; // try once after timeout
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch {
      this.onFailure();
      return fallback;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }
}

// Usage: recommendations service with circuit breaker
const recommendationsBreaker = new CircuitBreaker(5, 30_000);

async function getRecommendations(userId: string): Promise<Content[]> {
  return recommendationsBreaker.execute(
    () => fetchRecommendations(userId),
    []  // fallback: empty array → UI shows popular content instead
  );
}`}</code></pre>

      <h3 id="graceful-degradation">Graceful Degradation</h3>
      <p>
        High-availability is not just about uptime — it is about ensuring users still get
        value when parts of the system are degraded. Every external dependency should have
        a fallback strategy.
      </p>

      <ArticleTable caption="Graceful degradation strategies for common Disney service dependencies." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Failure mode</th>
              <th>Fallback strategy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Recommendations API</td>
              <td>Returns 503, times out</td>
              <td>Show &quot;Popular on Disney+&quot; using cached static data</td>
            </tr>
            <tr>
              <td>Authentication service</td>
              <td>Token refresh fails</td>
              <td>Serve cached unauthenticated content, queue auth retry</td>
            </tr>
            <tr>
              <td>Search service</td>
              <td>Query latency &gt;3s</td>
              <td>Return partial results from edge cache with &quot;Results may be incomplete&quot; message</td>
            </tr>
            <tr>
              <td>Content metadata API</td>
              <td>Schema change breaks parsing</td>
              <td>Serve stale cached response via stale-while-revalidate</td>
            </tr>
            <tr>
              <td>Analytics / telemetry</td>
              <td>Network error</td>
              <td>Queue events in localStorage, flush on next successful connection</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How have you optimized a web application for performance at scale?'"
        intro="The weak answer describes applying an optimization. The strong answer describes a systematic approach with measurement at every step."
        steps={[
          "Lead with measurement: 'I never optimize without profiling first. I establish a performance budget before any work begins — LCP under 2.5s, INP under 200ms — and I use field data from RUM, not just lab tools like Lighthouse.'",
          "Name the biggest wins: 'In a typical audit, the largest gains come from: hero image optimization (priority prop, proper sizing), eliminating render-blocking third-party scripts, and fixing layout shifts from images without explicit dimensions.'",
          "Go beyond the browser: 'At Disney scale, the CDN cache hit rate is more impactful than any code optimization. A 90% cache hit rate means 90% of users never touch your origin. Stale-while-revalidate gives you fast responses AND fresh content.'",
          "Close with the circuit breaker mindset: 'High availability is about degrading gracefully, not just being fast. When a dependency fails, the UI should still work — just with fallback content. I design for partial failure from day one.'",
        ]}
      />

      <InterviewChallenge
        title="Performance Challenge: Diagnose the ESPN Live Scoreboard"
        scenario={
          <>
            The ESPN live scoreboard component re-renders every 5 seconds for all 50 active
            games. With 100,000 concurrent users, server-sent events are pushing score updates.
            Users report jank when scores update. Chrome DevTools shows the main thread is
            blocked for 800ms every 5 seconds. You need to identify and fix the performance issue.
          </>
        }
        tasks={[
          "List three possible root causes for the 800ms main thread block during score updates.",
          "How would you use React DevTools Profiler to identify which component is causing the slow render?",
          "The scoreboard renders 50 game cards. Each card receives the full game object as props. How do you prevent re-rendering cards whose scores haven't changed?",
          "The score data is polled every 5 seconds. Describe how you would replace polling with WebSockets or Server-Sent Events and what impact that has on performance.",
          "What is the INP impact of the current behavior and how does your fix address it?",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Profile before optimizing</strong> — establish a performance budget with field data from Real User Monitoring, not just Lighthouse scores.</li>
        <li><strong>LCP</strong> is dominated by image load time — always use <code>priority</code> on the hero image and never render it client-side.</li>
        <li><strong>CLS</strong> is eliminated by reserving space for dynamic content before it loads — never inject content above existing DOM.</li>
        <li><strong>INP</strong> is fixed by moving heavy work off the main thread — <code>useTransition</code> for React state, Web Workers for CPU-intensive tasks.</li>
        <li>The <strong>CDN cache hit rate</strong> has more performance impact at scale than any individual code optimization — design cache strategies deliberately.</li>
        <li><strong>Circuit breakers and fallbacks</strong> are the production-readiness bar for any external service call — graceful degradation is a feature, not an afterthought.</li>
      </ul>
    </div>
  );
}
