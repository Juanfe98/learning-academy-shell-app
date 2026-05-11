import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cachingLayersDiagram = String.raw`flowchart LR
    USER["User Browser\nBrowser Cache\n(disk/memory)"]
    CDN["CDN / Edge\nCloudflare / Vercel Edge\ns-maxage=3600"]
    NX["Next.js Full-Route Cache\nstale-while-revalidate\nISR cache on the server"]
    CS_CDN["Contentstack CDN\nDelivery API cache\n(auto-managed by CS)"]

    USER -->|"cache miss"| CDN
    CDN -->|"cache miss or stale"| NX
    NX -->|"ISR miss"| CS_CDN`;

const isrTimingDiagram = String.raw`sequenceDiagram
    participant U1 as User 1 (request at T+0)
    participant U2 as User 2 (request at T+3600+5)
    participant NX as Next.js Cache
    participant CS as Contentstack

    U1->>NX: GET /help/article (T=0)
    NX->>CS: Fetch + render (cache miss)
    CS-->>NX: Article HTML cached
    NX-->>U1: Fresh HTML (200)

    Note over NX: 3600 seconds pass — ISR TTL expires

    U2->>NX: GET /help/article (T=3605)
    NX-->>U2: Stale HTML served (200, fast)
    NX->>CS: Background revalidation starts
    CS-->>NX: Fresh HTML replaces stale cache`;

export const toc: TocItem[] = [
  { id: "core-web-vitals", title: "Core Web Vitals for a Help Center", level: 2 },
  { id: "lcp-fix", title: "LCP: Article Hero Images with next/image", level: 3 },
  { id: "cls-fix", title: "CLS: CMS Images Without Dimensions", level: 3 },
  { id: "inp-fix", title: "INP: Search Input Responsiveness", level: 3 },
  { id: "next-image-cms", title: "next/image for CMS Content", level: 2 },
  { id: "fonts", title: "Font Optimization with next/font", level: 2 },
  { id: "bundle-analysis", title: "Bundle Analysis and Code Splitting", level: 2 },
  { id: "dynamic-imports", title: "Dynamic Imports for Heavy Components", level: 3 },
  { id: "cdn-caching", title: "CDN Caching and Cache Control", level: 2 },
  { id: "cache-layers", title: "Cache Layers for Help Center", level: 3 },
  { id: "isr-timing", title: "ISR Stale-While-Revalidate Timing", level: 3 },
  { id: "measuring", title: "Measuring Performance in CI", level: 2 },
  { id: "cwv-table", title: "Core Web Vitals Reference", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function PerformanceCmsSites() {
  return (
    <div className="article-content">
      <p>
        A Help Center lives and dies by performance. Users arrive with a problem — they need a fast
        answer. Google ranks on Core Web Vitals. The combination of Next.js ISR, CDN caching,
        optimized images, and smart code splitting can take a poorly performing CMS site from a
        Lighthouse score of 50 to 95+. This module covers the full performance stack, focused on
        the specific failure modes of content-driven applications.
      </p>

      <h2 id="core-web-vitals">Core Web Vitals for a Help Center</h2>
      <p>
        Google's Core Web Vitals measure user-experienced performance. For a Help Center, the
        relevant metrics and their most common causes:
      </p>

      <h3 id="lcp-fix">LCP: Article Hero Images with next/image</h3>
      <p>
        Largest Contentful Paint measures how long it takes for the largest visible element to
        render. For a Help Center, that is usually the article hero image or the h1 heading. LCP
        above 2.5s is poor; below 1.8s is good.
      </p>
      <p>
        The hero image is almost always the LCP element. If it's served from Contentstack's CDN
        without proper optimization, it will fail LCP on mobile. The fix is <code>next/image</code>{" "}
        with <code>priority</code>:
      </p>

      <pre>
        <code>{`// The priority prop preloads the image — critical for LCP
// Without priority, the image is lazily loaded, which delays LCP
<Image
  src={article.featured_image.url}
  alt={article.featured_image.alt ?? article.title}
  width={article.featured_image.dimension.width}
  height={article.featured_image.dimension.height}
  priority  // ← adds <link rel="preload"> to the <head>
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  placeholder="blur"
  blurDataURL={article.featured_image.blur_data_url} // optional, for nice UX
/>

// next.config.ts — allow Contentstack image domains
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.contentstack.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "eu-images.contentstack.com", // EU data center if applicable
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;`}</code>
      </pre>

      <h3 id="cls-fix">CLS: CMS Images Without Dimensions</h3>
      <p>
        Cumulative Layout Shift measures visual instability — elements jumping around as the page
        loads. For CMS sites, the most common CLS cause is images without explicit width and height.
        The browser doesn't know how much space to reserve for the image before it loads, so it
        collapses the space to zero, then expands it when the image arrives — causing content
        to shift.
      </p>
      <p>
        Contentstack assets include dimension metadata. Always require the <code>dimension</code>{" "}
        field in your content type and extract <code>width</code> and <code>height</code> to pass
        to <code>next/image</code>. CLS target: below 0.1.
      </p>

      <pre>
        <code>{`// In your Contentstack GraphQL query, always fetch dimensions with assets
const ARTICLE_QUERY = gql\`
  query GetArticle($url: String!) {
    all_article(where: { url: { eq: $url } }) {
      items {
        featured_image {
          url
          dimension {
            width   # always fetch — required for CLS prevention
            height  # always fetch — required for CLS prevention
          }
        }
      }
    }
  }
\`;

// If dimension is missing (older entries), fall back to a reasonable default
// Better: enforce dimension as required in the content type validation
function ArticleImage({ image }: { image: CsImage }) {
  const width = image.dimension?.width ?? 1200;
  const height = image.dimension?.height ?? 630;
  return <Image src={image.url} width={width} height={height} alt={image.alt ?? ""} />;
}`}</code>
      </pre>

      <h3 id="inp-fix">INP: Search Input Responsiveness</h3>
      <p>
        Interaction to Next Paint measures responsiveness to user input. The most common INP issue
        in Help Centers is a search box that triggers expensive re-renders on every keystroke. The
        fix is debouncing the search query and ensuring the actual search logic runs asynchronously:
      </p>

      <pre>
        <code>{`// Bad: triggers API call and re-render on every keystroke
function Search() {
  const [query, setQuery] = useState("");
  const { data } = useQuery(SEARCH, { variables: { query } }); // fires on every keystroke

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

// Good: debounce the query — only search after user stops typing for 300ms
import { useDeferredValue } from "react"; // React 18+ — doesn't block input

function Search() {
  const [inputValue, setInputValue] = useState("");
  const deferredQuery = useDeferredValue(inputValue); // defer the expensive search

  const { data } = useQuery(SEARCH, {
    variables: { query: deferredQuery },
    skip: deferredQuery.length < 3,
  });

  return (
    <input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      aria-label="Search help articles"
    />
  );
}
// useDeferredValue keeps the input responsive even if the results re-render is slow
// The input always shows the latest value; results lag behind but don't block typing`}</code>
      </pre>

      <h2 id="next-image-cms">next/image for CMS Content</h2>

      <ArticleTable caption="next/image props that matter for CMS-served images — each one prevents a specific performance or CLS issue." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Prop</th>
              <th>Purpose</th>
              <th>When Required</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>width</code> + <code>height</code></td>
              <td>Reserves space before image loads — prevents CLS</td>
              <td>Always for non-fill layout</td>
              <td>None — omitting causes console error</td>
            </tr>
            <tr>
              <td><code>priority</code></td>
              <td>Adds preload link — prevents LCP delay for above-the-fold images</td>
              <td>Hero image, first article card image in list</td>
              <td>false (lazy loaded)</td>
            </tr>
            <tr>
              <td><code>sizes</code></td>
              <td>Tells browser which image size to download at each viewport width</td>
              <td>When image is not full-width on all viewports</td>
              <td>100vw (downloads largest image even on mobile)</td>
            </tr>
            <tr>
              <td><code>quality</code></td>
              <td>JPEG compression quality 1–100</td>
              <td>Optional tuning for CMS images already highly compressed</td>
              <td>75</td>
            </tr>
            <tr>
              <td><code>placeholder="blur"</code></td>
              <td>Shows blurred preview while loading — perceived performance</td>
              <td>Optional; requires blurDataURL for remote images</td>
              <td>"empty" (shows nothing while loading)</td>
            </tr>
            <tr>
              <td><code>fill</code></td>
              <td>Stretches to parent container — use for aspect-ratio boxes</td>
              <td>When you don't know the dimensions (avoid if possible)</td>
              <td>false</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="fonts">Font Optimization with next/font</h2>

      <pre>
        <code>{`// next/font eliminates render-blocking font requests
// Without it: browser makes a separate fetch for each font file, blocks rendering
// With it: fonts are downloaded during build and served from your domain

import { Inter, Source_Serif_4 } from "next/font/google";

// Load the body font — used for article text
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",         // show system font until custom font loads
  variable: "--font-serif", // CSS variable for use in Tailwind or CSS
  preload: true,
  weight: ["400", "600"],
});

// Load the UI font — used for navigation and headings
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Apply in root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={\`\${inter.variable} \${sourceSerif.variable}\`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}`}</code>
      </pre>

      <h2 id="bundle-analysis">Bundle Analysis and Code Splitting</h2>

      <pre>
        <code>{`// Install bundle analyzer
// pnpm add -D @next/bundle-analyzer

// next.config.ts
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  // your Next.js config
});

// Run: ANALYZE=true pnpm build
// Opens a visual treemap of every module in your bundle
// Look for: large date libraries, full lodash, moment.js, icon libraries`}</code>
      </pre>

      <h3 id="dynamic-imports">Dynamic Imports for Heavy Components</h3>

      <pre>
        <code>{`import dynamic from "next/dynamic";

// Rich text editor — only needed in Draft Mode preview
// Without dynamic import, this 200KB+ library ships to ALL users
const RichTextEditor = dynamic(
  () => import("@contentstack/json-rte-serializer"),
  {
    loading: () => <div>Loading editor...</div>,
    ssr: false, // editor requires window — disable SSR
  }
);

// Only render in draft mode:
import { draftMode } from "next/headers";

export default async function ArticlePage() {
  const { isEnabled: isDraft } = await draftMode();

  return (
    <div>
      <ArticleContent />
      {isDraft && <RichTextEditor />} {/* 200KB only loads in draft mode */}
    </div>
  );
}

// Maps, video players, analytics dashboards — all candidates for dynamic import
// Pattern: is this component needed immediately? No? Lazy-load it.`}</code>
      </pre>

      <h2 id="cdn-caching">CDN Caching and Cache Control</h2>

      <h3 id="cache-layers">Cache Layers for Help Center</h3>
      <MermaidDiagram
        chart={cachingLayersDiagram}
        title="Cache Layers from User to Contentstack"
        caption="Each layer reduces load on the next. A CDN cache hit means the Next.js server never receives the request. An ISR cache hit means Contentstack is never called."
        minHeight={280}
      />

      <pre>
        <code>{`// Next.js automatically sets Cache-Control headers for ISR pages:
// Cache-Control: s-maxage=3600, stale-while-revalidate=59

// s-maxage=3600: CDN caches for 3600 seconds (1 hour)
// stale-while-revalidate=59: After TTL, CDN serves stale for 59s while fetching fresh

// For fully static assets — add aggressive caching:
// In next.config.ts:
export default {
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // immutable: browser/CDN never re-validates — files are content-hashed
        ],
      },
    ];
  },
};`}</code>
      </pre>

      <h3 id="isr-timing">ISR Stale-While-Revalidate Timing</h3>
      <MermaidDiagram
        chart={isrTimingDiagram}
        title="ISR Stale-While-Revalidate — What Users Experience"
        caption="The user who triggers revalidation still gets the stale response instantly. The next user gets the fresh version. No user ever waits for a database call."
        minHeight={420}
      />

      <h2 id="measuring">Measuring Performance in CI</h2>

      <pre>
        <code>{`# .gitlab-ci.yml — Lighthouse CI stage
lighthouse:
  stage: test
  image: cypress/browsers:node-20.6.1-chrome-116.0.5845.96-1-ff-116.0.3-edge-116.0.1938.54-1
  needs: [build-preview]
  script:
    - npm install -g @lhci/cli
    # Run Lighthouse against the deployed preview URL
    - lhci autorun --config=lighthouserc.json
  artifacts:
    reports:
      # Upload report to GitLab — visible in MR pipeline tab
      paths: [.lighthouseci/]

# lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["$PREVIEW_URL/help", "$PREVIEW_URL/help/billing/update-billing"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}`}</code>
      </pre>

      <h2 id="cwv-table">Core Web Vitals Reference</h2>

      <ArticleTable caption="Core Web Vitals for a Help Center — metric, what it measures, common causes, and the fix." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>What It Measures</th>
              <th>Good / Poor Threshold</th>
              <th>Help Center Cause</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>LCP</strong></td>
              <td>How long until the largest element is visible</td>
              <td>Good: &lt;1.8s / Poor: &gt;2.5s</td>
              <td>Hero image loaded lazily, no preload hint</td>
              <td><code>priority</code> prop on hero Image, preload link in head</td>
            </tr>
            <tr>
              <td><strong>CLS</strong></td>
              <td>How much layout shifts unexpectedly</td>
              <td>Good: &lt;0.1 / Poor: &gt;0.25</td>
              <td>CMS images without explicit width/height</td>
              <td>Always fetch dimension from CMS, pass to next/image</td>
            </tr>
            <tr>
              <td><strong>INP</strong></td>
              <td>Time from interaction to next visible frame</td>
              <td>Good: &lt;200ms / Poor: &gt;500ms</td>
              <td>Search fires expensive query on every keystroke</td>
              <td>useDeferredValue or debounce search input</td>
            </tr>
            <tr>
              <td><strong>FCP</strong></td>
              <td>Time until first content (text or image) is visible</td>
              <td>Good: &lt;1.8s / Poor: &gt;3s</td>
              <td>Render-blocking fonts, large initial JS</td>
              <td>next/font for fonts, code splitting for JS</td>
            </tr>
            <tr>
              <td><strong>TTFB</strong></td>
              <td>Time from request to first byte from server</td>
              <td>Good: &lt;800ms / Poor: &gt;1.8s</td>
              <td>No CDN, SSR on every request, slow Contentstack</td>
              <td>ISR + CDN layer, Redis cache for CMS calls</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you optimize the performance of a content-heavy Next.js site?'"
        intro="Performance questions expect you to diagnose before prescribing. Lead with measurement, then name specific optimizations with their expected impact."
        steps={[
          "Start with measurement: I run Lighthouse on the production URL to get baseline Core Web Vitals. LCP, CLS, and INP tell me where to focus. I also check the network waterfall — what's the critical path? Is the hero image blocking paint?",
          "Address LCP first (most impactful): for a Help Center, LCP is almost always the hero image. The fix is next/image with priority — this adds a preload link that tells the browser to fetch the image immediately, not after the JS parses. Expected LCP improvement: 0.5–1.5s.",
          "Address CLS next: CMS images without explicit width/height cause layout shift when they load. I enforce fetching dimension data from Contentstack and passing it to next/image. CLS drops to near zero immediately.",
          "Address bundle size: I run ANALYZE=true pnpm build to get the treemap. Common culprits: a date formatting library (replace with date-fns or Intl), full lodash (use individual imports), or a rich text editor bundled for all users (dynamic import it, only load in preview mode).",
          "Address caching: ISR with a 1-hour revalidation for article pages means the CDN serves cached HTML. The first user after TTL expires triggers a background revalidation — they still get the stale response instantly. Add a Contentstack webhook to trigger on-demand revalidation on publish, closing the gap to near-zero time between publish and user-visible update.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Diagnose and Fix a Poorly Performing Help Center"
        scenario={
          <span>
            You inherit the Indeed Help Center. Lighthouse reports: LCP 4.2s, CLS 0.18, Performance
            score 52, Accessibility score 71. The JS bundle is 340KB. Article pages use SSR (no
            caching). The hero image is loaded with a standard HTML{" "}
            <code>&lt;img&gt;</code> tag pointing to Contentstack CDN. Category listing pages fetch
            100 articles via GraphQL with all fields including body text. Fonts are loaded via a
            Google Fonts <code>&lt;link&gt;</code> tag in the document head.
          </span>
        }
        tasks={[
          "Identify the root cause of the 4.2s LCP — what specifically is causing it and what is the fix with expected impact?",
          "Identify the root cause of the 0.18 CLS — what is missing from the current implementation and how do you fix it?",
          "The article listing page fetches the full body text for 100 articles. What is wrong with this, and how do you fix both the query and the rendering strategy?",
          "The 340KB bundle includes moment.js (69KB gzipped) and a rich text editor (180KB gzipped) used only in Draft Mode. What is the fix and how much bundle reduction do you expect?",
          "SSR on article pages means every user triggers a Contentstack API call. What rendering strategy do you switch to, what revalidation interval do you set, and how do you handle same-day article updates?",
        ]}
        pitfalls={[
          "Switching from SSR to CSR — CSR pages are not crawlable by search engines, which destroys SEO for a Help Center",
          "Setting ISR revalidate=0 — this is equivalent to SSR and eliminates all caching benefits",
          "Loading moment.js even after identifying it — the fix is replacing it with date-fns (tree-shakeable) or the native Intl API",
          "Not setting a revalidation strategy for the listing page — if articles update frequently, the listing page needs a shorter ISR interval than article detail pages",
        ]}
        signal="A strong answer diagnoses LCP as the non-prioritized hero image, CLS as missing width/height from Contentstack dimensions, fixes the listing query to select only card fields (not body), dynamic-imports the rich text editor with ssr:false, and switches article pages to ISR revalidate:3600 with webhook on-demand invalidation."
      />
    </div>
  );
}
