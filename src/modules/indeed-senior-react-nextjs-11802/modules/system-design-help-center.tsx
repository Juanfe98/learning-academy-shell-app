import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const systemArchitectureDiagram = String.raw`flowchart TD
    USERS["Users (2M MAU)\nBrowser + Mobile"]
    CF["Cloudflare CDN\nGeographic edge\nHTML + static asset cache\nDDoS protection"]
    VERCEL["Vercel / Kubernetes\nNext.js App Router\nEdge Middleware (flags, i18n)\nISR + SSG + SSR"]
    CS["Contentstack\nHeadless CMS\nDelivery API\nWebhooks on publish"]
    REDIS["Redis / Upstash\nCMS API response cache\nSession data\nTTL per content type"]
    ALGOLIA["Algolia\nFull-text search index\nInstant search\nTypo-tolerance"]
    NODE["Node.js Backend\n(internal API)\nUser data\nSaved articles\nFeedback submissions"]
    DB["PostgreSQL\nUser accounts\nSaved articles\nFeedback data"]
    SENTRY["Sentry\nJS error tracking\nPerformance traces"]
    DD["Datadog RUM\nCore Web Vitals\nReal user monitoring"]

    USERS -->|"HTTPS"| CF
    CF -->|"Cache MISS → origin\nCache HIT → edge HTML"| VERCEL
    VERCEL -->|"CMS API calls\n(through Redis cache)"| REDIS
    REDIS -->|"Cache MISS"| CS
    VERCEL -->|"Search queries"| ALGOLIA
    VERCEL -->|"User data API"| NODE
    NODE --> DB
    VERCEL -.->|"Error events"| SENTRY
    VERCEL -.->|"RUM beacons"| DD

    style CF fill:#f78c1f22,stroke:#f78c1f
    style REDIS fill:#dc143c22,stroke:#dc143c
    style ALGOLIA fill:#2557d622,stroke:#2557d6`;

const cacheInvalidationDiagram = String.raw`sequenceDiagram
    participant ED as CMS Editor
    participant CS as Contentstack
    participant WH as Invalidation Service\n(Next.js Route Handler)
    participant RD as Redis
    participant NX as Next.js ISR Cache
    participant CF as Cloudflare

    ED->>CS: Publish article (uid: blt123, slug: /help/billing/update)
    CS->>WH: POST /api/revalidate\n{ uid, slug, contentType, locales }
    Note over WH: Verify HMAC signature first

    WH->>RD: DEL contentstack:article:blt123:en-us
    WH->>RD: DEL contentstack:article:blt123:es-mx
    WH->>RD: DEL contentstack:category-listing:/help/billing:en-us
    WH->>NX: revalidatePath('/help/billing/update')
    WH->>NX: revalidateTag('article:blt123')
    WH->>CF: POST /zones/{id}/purge_cache\n{ files: ['/help/billing/update'] }

    WH-->>CS: 200 OK { invalidated: true, keys: 3 }
    Note over RD,CF: Next user request gets fresh content\nfrom Contentstack in <100ms`;

export const toc: TocItem[] = [
  { id: "requirements-clarification", title: "Requirements Clarification", level: 2 },
  { id: "content-model", title: "Content Model Design", level: 2 },
  { id: "url-routing-strategy", title: "URL Routing Strategy", level: 2 },
  { id: "rendering-strategy", title: "Rendering Strategy", level: 2 },
  { id: "search-architecture", title: "Search Architecture", level: 2 },
  { id: "cache-architecture", title: "Cache Architecture", level: 2 },
  { id: "cache-invalidation", title: "Cache Invalidation Chain", level: 3 },
  { id: "multi-language", title: "Multi-Language at Scale", level: 2 },
  { id: "observability", title: "Observability Stack", level: 2 },
  { id: "scalability-bottlenecks", title: "Scalability Bottlenecks", level: 2 },
  { id: "interview-framing", title: "Interview Playbook", level: 2 },
  { id: "key-takeaways", title: "Interview Challenge", level: 2 },
];

export default function SystemDesignHelpCenter() {
  return (
    <div className="article-content">
      <p>
        The system design interview for a senior frontend role at Indeed will likely include a
        variation of &quot;design a Help Center application.&quot; This module walks through a
        complete 45-minute answer: from clarifying requirements to content model, URL design,
        rendering strategy, search, caching, multi-language, and observability. Every section
        is structured to show systematic thinking, not just correct answers.
      </p>

      <h2 id="requirements-clarification">Requirements Clarification</h2>
      <p>
        <strong>Always clarify before designing.</strong> The first 5 minutes of a 45-minute
        system design interview should be questions, not architecture. This signals senior thinking:
        you know that design decisions depend on constraints, and constraints differ dramatically
        between a 100-article internal wiki and a 10,000-article production Help Center.
      </p>
      <p>The questions that most change the design:</p>
      <ul>
        <li>
          <strong>Scale:</strong> How many articles? How many monthly active users? How many
          languages? — Answer assumed: 10,000 articles, 2M MAU, 5 languages.
        </li>
        <li>
          <strong>SEO:</strong> Are articles indexed by Google? Is organic search a meaningful
          traffic source? — Answer assumed: yes, SEO is critical. This forces server-side rendering.
        </li>
        <li>
          <strong>Update frequency:</strong> How often do editors publish? How quickly must updates
          go live? — Answer assumed: ~200 updates/day, editors expect articles live within 5 minutes.
        </li>
        <li>
          <strong>Team constraints:</strong> How many engineers? CMS editors vs developers? —
          Answer assumed: small engineering team, non-technical editors manage content in Contentstack.
        </li>
        <li>
          <strong>Authentication:</strong> Do users log in? Is there personalized content? —
          Answer assumed: optional login to save articles; most content is public.
        </li>
        <li>
          <strong>SLAs:</strong> What are the performance targets? — Answer assumed: LCP under 2s,
          availability 99.9%.
        </li>
      </ul>

      <h2 id="content-model">Content Model Design</h2>
      <p>
        The content model is the schema of your CMS. Getting this wrong forces expensive
        migrations later. Design it around the queries you will make, not around what content
        editors find intuitive.
      </p>

      <pre>
        <code>{`// Contentstack content types for a Help Center:

// 1. Article — the core content type
Article {
  title: ShortText             // SEO title
  slug: ShortText              // URL slug (/help/billing/update-billing)
  body: RichText               // main content with inline embedded entries
  metaDescription: ShortText  // SEO meta description
  author: Reference<Author>   // author bio + avatar
  category: Reference<Category> // parent category for breadcrumbs + listing
  tags: [ShortText]           // for related article queries
  relatedArticles: [Reference<Article>] // manually curated "see also" links
  feedbackEnabled: Boolean    // show thumbs up/down widget
  // locale variants created via Contentstack i18n — not a separate field
}

// 2. Category — navigation and grouping
Category {
  name: ShortText             // "Billing & Payments"
  slug: ShortText             // /help/billing
  description: ShortText      // category header description
  icon: File                  // category icon
  parent: Reference<Category> // for nested subcategories
  order: Number               // display order in navigation
}

// 3. Author — content attribution
Author {
  name: ShortText
  title: ShortText            // "Technical Writer"
  bio: ShortText
  avatar: File
}

// 4. FAQ — structured Q&A, often used in rich search results (Schema.org FAQPage)
FAQ {
  question: ShortText
  answer: RichText
  category: Reference<Category>
  relatedArticles: [Reference<Article>]
}

// Key design decisions:
// - Slug is stored in CMS (not derived from title) — allows slug changes via 301 redirect
//   without breaking existing bookmarks or SEO rankings
// - relatedArticles is manual, not algorithmic — allows editorial curation
//   (algorithm can supplement, but editors make the final call at a Help Center)
// - body is RichText with embedded entries — allows inline reference to other articles
//   without duplicating content (modular content pattern)`}</code>
      </pre>

      <h2 id="url-routing-strategy">URL Routing Strategy</h2>
      <p>
        URL design matters more for a public Help Center than for any internal tool. URLs are
        permanent (from an SEO perspective) — once a URL is indexed, changing it costs link equity
        unless you 301-redirect correctly.
      </p>

      <pre>
        <code>{`// URL structure: /[locale]/help/[category]/[slug]
// Examples:
// /en-us/help/billing/update-billing     (US English)
// /es-mx/help/facturacion/actualizar     (Mexican Spanish)
// /fr-fr/help/facturation/mise-a-jour    (French)

// Next.js route file structure:
// src/app/[locale]/help/[category]/[slug]/page.tsx
// src/app/[locale]/help/[category]/page.tsx
// src/app/[locale]/help/page.tsx  (help center homepage)

// SEO rules to enforce:
// 1. Canonical URLs: <link rel="canonical" href="/en-us/help/billing/update-billing" />
//    Always point to the primary locale version
// 2. hreflang: link all locale variants to each other
//    <link rel="alternate" hreflang="es-mx" href="/es-mx/help/facturacion/actualizar" />
// 3. 301 redirects for slug changes:
//    When an article slug changes in Contentstack, the publish webhook triggers
//    a redirect rule update — old URL 301s to new URL permanently
// 4. Trailing slash policy: enforce consistently (with or without)
//    next.config.ts: trailingSlash: false

// Middleware for locale detection and redirect:
// /help/billing/update-billing → detect browser locale → redirect to /en-us/...
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Already has a locale prefix — don't redirect
  if (pathname.match(/^\/(en-us|es-mx|fr-fr|de-de|pt-br)\//)) {
    return NextResponse.next();
  }

  // Help Center root without locale — redirect to detected locale
  if (pathname.startsWith("/help/")) {
    const locale = detectLocale(request); // from Accept-Language header
    return NextResponse.redirect(
      new URL(pathname.replace("/help/", \`/\${locale}/help/\`), request.url),
      301
    );
  }
}`}</code>
      </pre>

      <h2 id="rendering-strategy">Rendering Strategy</h2>
      <p>
        Each page type in the Help Center has a different rendering requirement. The wrong choice
        for even one page type creates performance or freshness problems at scale.
      </p>

      <pre>
        <code>{`// Article pages: SSG + ISR (not SSR — content is public, same for all users)
// revalidate: 3600 (1 hour fallback) + on-demand revalidation via webhook
export const revalidate = 3600;
export const dynamicParams = true; // allow new articles via on-demand ISR

export async function generateStaticParams() {
  // Pre-build top 500 articles per locale (= 2,500 pages) to warm the cache
  // dynamicParams: true handles the remaining 47,500 pages on first request
  const articles = await getTopArticles({ limit: 500 });
  const locales = ["en-us", "es-mx", "fr-fr", "de-de", "pt-br"];
  return locales.flatMap((locale) =>
    articles.map(({ category, slug }) => ({ locale, category, slug }))
  );
}

// Category listing pages: ISR, revalidate: 300 (5 min — new articles appear here fast)
export const revalidate = 300;

// Search results: SSR (force-dynamic — depends on user query)
// OR Client-side if SEO for search result pages is not required
export const dynamic = "force-dynamic";

// User account pages (saved articles): SSR — reads session per request
// cookies() and headers() automatically make the route dynamic

// Help Center homepage: ISR, revalidate: 1800 (30 min — featured content changes occasionally)`}</code>
      </pre>

      <h2 id="search-architecture">Search Architecture</h2>
      <ArticleTable
        caption="Search is the most critical user-facing feature of a Help Center. The right choice depends on scale, budget, and whether you need typo-tolerance and analytics."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Solution</th>
              <th>Cost</th>
              <th>Setup Time</th>
              <th>Typo Tolerance</th>
              <th>Search Analytics</th>
              <th>Edge / CDN Compatible</th>
              <th>At 10k Articles</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Algolia</strong></td>
              <td>$$ (by ops/month)</td>
              <td>1–2 days</td>
              <td>Excellent — core feature</td>
              <td>Built-in — query analytics, CTR</td>
              <td>Yes — CDN-edge network</td>
              <td>Recommended: instant, accurate, analytics-rich</td>
            </tr>
            <tr>
              <td><strong>Contentstack built-in</strong></td>
              <td>Included</td>
              <td>30 minutes</td>
              <td>Basic (exact match)</td>
              <td>None</td>
              <td>Yes</td>
              <td>Acceptable for &lt;1k articles; too limited at 10k</td>
            </tr>
            <tr>
              <td><strong>Elasticsearch</strong></td>
              <td>$ (self-hosted) or $$$ (cloud)</td>
              <td>1–2 weeks</td>
              <td>Excellent (configurable)</td>
              <td>Custom implementation</td>
              <td>No — behind your Node.js layer</td>
              <td>Powerful but high operational overhead</td>
            </tr>
            <tr>
              <td><strong>Typesense</strong></td>
              <td>Free (self-hosted) or $ (cloud)</td>
              <td>2–3 days</td>
              <td>Excellent</td>
              <td>Basic</td>
              <td>Partial</td>
              <td>Good open-source alternative to Algolia</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Algolia integration: keep the index in sync with Contentstack
// Strategy: index on Contentstack publish webhook (same webhook as cache invalidation)

// src/lib/algolia.ts
import algoliasearch from "algoliasearch";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY! // admin key — server-side only, never in NEXT_PUBLIC_
);

const index = client.initIndex("help_articles");

// Called from the revalidate webhook handler on article publish:
export async function indexArticle(article: Article) {
  await index.saveObject({
    objectID: article.uid, // Algolia requires objectID for upsert
    title: article.title,
    body: extractPlainText(article.body), // strip RichText markup for indexing
    slug: article.slug,
    category: article.category.name,
    locale: article.locale,
    updatedAt: article.updatedAt,
  });
}

// Client-side search with InstantSearch.js (CSR — search results don't need SEO):
// The NEXT_PUBLIC_ALGOLIA_APP_ID and NEXT_PUBLIC_ALGOLIA_SEARCH_KEY are safe
// to expose — search-only API keys have read-only permissions, no write access`}</code>
      </pre>

      <h2 id="cache-architecture">Cache Architecture</h2>
      <MermaidDiagram
        chart={systemArchitectureDiagram}
        title="Indeed Help Center — Full System Architecture"
        caption="Four caching layers between the user and Contentstack: Cloudflare CDN, Next.js ISR cache, Redis, and Contentstack's own CDN. Each layer serves a specific scope and failure mode."
        minHeight={580}
      />

      <p>
        At 2M MAU with 200 CMS updates per day, the caching architecture is not optional — it is
        what makes the system viable. The Contentstack Delivery API has rate limits. Without
        caching, a traffic spike during a product launch would exhaust those limits within seconds.
      </p>

      <h3 id="cache-invalidation">Cache Invalidation Chain</h3>
      <MermaidDiagram
        chart={cacheInvalidationDiagram}
        title="Cache Invalidation Sequence: Contentstack Publish → All Cache Layers"
        caption="A single Contentstack publish event triggers atomic invalidation across Redis, Next.js ISR, and Cloudflare CDN. An editor publishing at 2pm sees their article live by 2:01pm."
        minHeight={520}
      />

      <h2 id="multi-language">Multi-Language at Scale</h2>
      <ArticleTable
        caption="The naive approach — generateStaticParams for all locales × all articles — creates a build time problem at scale. The correct approach uses dynamic ISR for the long tail."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Pages to Pre-Build</th>
              <th>Estimated Build Time</th>
              <th>Strategy</th>
              <th>Tradeoff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>All 10k articles × 5 locales</td>
              <td>50,000 pages</td>
              <td>~90 minutes</td>
              <td>Full pre-build (naive)</td>
              <td>Slow deploys; stale content for 90min after changes</td>
            </tr>
            <tr>
              <td>Top 500 articles × 5 locales</td>
              <td>2,500 pages</td>
              <td>~5 minutes</td>
              <td>Partial pre-build + ISR on-demand</td>
              <td>First request for tail articles is slightly slower</td>
            </tr>
            <tr>
              <td>No pre-build</td>
              <td>0 pages</td>
              <td>~1 minute</td>
              <td>Full on-demand ISR</td>
              <td>First user to hit any article waits for ISR generation</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Multi-language with Contentstack locale API
// Each locale is a separate Contentstack delivery API call

// src/lib/contentstack.ts
export async function getArticle(slug: string, locale: string): Promise<Article | null> {
  const response = await fetch(
    \`https://cdn.contentstack.io/v3/content_types/article/entries\`,
    {
      headers: {
        api_key: process.env.CONTENTSTACK_API_KEY!,
        access_token: process.env.CONTENTSTACK_DELIVERY_TOKEN!,
      },
      // Use the locale parameter for Contentstack's i18n API
      // This fetches the localized version of the entry
    }
  );
  // ... query by slug and locale
}

// generateStaticParams for multi-language:
export async function generateStaticParams() {
  const locales = ["en-us", "es-mx", "fr-fr", "de-de", "pt-br"];
  const topArticles = await getTopArticles({ limit: 500 });

  // Generate paths for each locale × each top article
  // dynamicParams: true handles the remaining 9,500 articles via on-demand ISR
  return locales.flatMap((locale) =>
    topArticles.map(({ category, slug }) => ({
      locale,
      category,
      slug,
    }))
  );
  // 500 articles × 5 locales = 2,500 pre-built pages
  // Next.js builds these in parallel — takes ~5 minutes vs 90 minutes for all 50,000
}

// On-demand ISR for uncached locales:
// First user to visit /fr-fr/help/billing/update-billing (not pre-built) triggers ISR
// Next.js generates the page, caches it at the CDN, serves it — subsequent users get cached version
// The "first request is slow" window is typically 200–800ms — acceptable for the long tail`}</code>
      </pre>

      <h2 id="observability">Observability Stack</h2>
      <p>
        A production Help Center needs observability across three dimensions: errors, performance,
        and content freshness. Without it, you find out about outages from Twitter, not dashboards.
      </p>

      <pre>
        <code>{`// Three observability layers for a Help Center:

// 1. Error tracking: Sentry
// - Captures unhandled exceptions in Server Components, Client Components, and Route Handlers
// - Performance traces for server-side renders (slow CMS fetches show up here)
// - Source map upload in CI so stack traces point to TypeScript, not minified JS
// npm install @sentry/nextjs
// Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })

// 2. Real User Monitoring: Datadog RUM
// - Core Web Vitals per page (LCP, CLS, FID/INP)
// - Long task detection — catches client-side render blocking
// - Session replay for debugging UI bugs reported by editors
// Alert: LCP > 2.5s for article pages → PagerDuty

// 3. Synthetic monitoring: Playwright + Checkly (or Datadog Synthetics)
// Run in CI and every 5 minutes in production:
test("Help Center article loads correctly", async ({ page }) => {
  await page.goto("https://help.indeed.com/en-us/help/billing/update-billing");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".article-body")).toBeVisible();
  // Check that the article content is not empty (catches ISR/CMS failures)
  const bodyText = await page.locator(".article-body").textContent();
  expect(bodyText!.length).toBeGreaterThan(100);
});

// 4. Webhook delivery monitoring
// Contentstack webhooks can fail silently — track delivery failures
// Log to a persistent queue (Redis LPUSH): { event, timestamp, status, retries }
// Alert: > 3 consecutive webhook failures → notify on-call`}</code>
      </pre>

      <h2 id="scalability-bottlenecks">Scalability Bottlenecks</h2>
      <p>
        At 2M MAU and 50,000 pages, these are the constraints that will bite you in production:
      </p>
      <ul>
        <li>
          <strong>Build time for 50,000 pages.</strong> Solution: pre-build only the top N and
          use <code>dynamicParams: true</code> for on-demand ISR generation of the long tail.
        </li>
        <li>
          <strong>Cache warming after deploy.</strong> When Next.js deploys a new version, the ISR
          cache is cold. The first 2,500 users hit the origin simultaneously — use a post-deploy
          cache warming script that pre-fetches top articles.
        </li>
        <li>
          <strong>Contentstack rate limits.</strong> The Delivery API has rate limits
          (e.g., 1,000 requests/minute). During traffic spikes with cache misses, you can exhaust
          this limit in seconds. Redis cache layer is the primary mitigation. Secondary mitigation:
          implement a request queue with exponential backoff on rate limit errors.
        </li>
        <li>
          <strong>Redis memory sizing.</strong> 10,000 articles × 5 locales × ~20KB average
          article JSON = ~1GB of Redis memory. Size your Redis instance accordingly and set
          <code>maxmemory-policy: allkeys-lru</code> to evict least-recently-used keys when
          memory is full.
        </li>
        <li>
          <strong>i18n build complexity.</strong> 5 locales × 10,000 articles = 50,000 pages.
          Use the partial pre-build strategy and accept that tail locale pages have a first-request
          ISR latency of ~500ms. This is better than 90-minute deploys.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to structure a 45-minute system design answer: 'Design a Help Center for 10,000 articles and 2M monthly users'"
        intro="This question has a specific correct structure. The interviewer is evaluating: do you clarify before designing, can you make explicit tradeoff decisions, and can you cover the full stack from content model to observability in 45 minutes?"
        steps={[
          "Minutes 0–5: Clarify requirements. Ask about scale (articles, MAU, languages), SLAs (LCP target, freshness SLA), team constraints (editors vs engineers), and auth requirements. State your assumptions out loud: 'I'll assume 10,000 articles, 5 locales, 2M MAU, articles must be live within 5 minutes of publish.'",
          "Minutes 5–15: Content model and URL design. Define the Contentstack content types (Article, Category, Author, FAQ), explain the slug-as-CMS-field pattern for clean 301 redirects, and describe the URL structure (/[locale]/help/[category]/[slug]) with hreflang for SEO.",
          "Minutes 15–25: Rendering strategy and caching. Draw the four-layer cache (Cloudflare → Next.js ISR → Redis → Contentstack CDN). Assign each page type its rendering mode (article = ISR 3600, category = ISR 300, search = CSR, account = SSR). Describe the webhook invalidation chain.",
          "Minutes 25–35: Search and multi-language. Recommend Algolia for search at this scale (typo-tolerance, analytics, instant results). Explain the partial pre-build strategy (top 500 articles × 5 locales = 2,500 pre-built pages, dynamicParams: true for the remaining 47,500).",
          "Minutes 35–45: Observability and bottlenecks. Name the three monitoring layers (Sentry for errors, Datadog RUM for Core Web Vitals, Playwright synthetics for uptime). Call out the three scalability constraints you have anticipated: build time, cache warming after deploy, and Contentstack rate limits during spikes.",
        ]}
      />

      <h2 id="key-takeaways">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Indeed Help Center from Scratch"
        scenario={
          <span>
            You have 45 minutes to design a production-ready Help Center for Indeed. The system
            must support: <strong>10,000 articles</strong>, <strong>5 languages</strong>,{" "}
            <strong>2 million monthly active users</strong>, SEO-critical pages (articles must be
            indexed by Google), content freshness within 5 minutes of CMS publish, a full-text
            search experience, and optional user authentication for saved articles.
          </span>
        }
        tasks={[
          "List the 6 clarifying questions you would ask before drawing a single component — explain why each question changes the design",
          "Design the Contentstack content model: list the content types, their key fields, and explain three design decisions that are non-obvious (e.g., why slug is stored as a CMS field rather than derived from title)",
          "Describe the rendering strategy for each of the five page types: article, category listing, search results, help center homepage, and user saved articles",
          "Design the four-layer cache architecture: name each layer, what it caches, its TTL, and its invalidation trigger. Then describe the complete webhook invalidation sequence when an editor publishes article uid 'blt123'",
          "The build pipeline currently takes 90 minutes because it pre-renders all 50,000 pages (10k × 5 locales). Reduce build time to under 10 minutes without sacrificing first-load performance for the top 500 articles",
        ]}
        pitfalls={[
          "Jumping into architecture before clarifying requirements — especially skipping the SEO question (this changes article pages from possible CSR to required SSG/ISR)",
          "Using SSR for article pages because 'the content needs to be fresh' — article content is the same for all users, so SSR adds latency on every request for zero benefit over ISR",
          "Proposing to pre-build all 50,000 pages in generateStaticParams — this is the anti-pattern the question is testing for",
          "Using Contentstack's built-in search for 10,000 articles — at this scale, it lacks typo-tolerance, analytics, and the query performance needed for instant search",
          "Forgetting cache invalidation entirely — designing a caching system without describing how caches are invalidated on publish means editors cannot trust their own CMS",
          "Not mentioning Redis rate limit protection — during a traffic spike, ISR alone does not protect Contentstack from rate limit exhaustion if many pages miss simultaneously",
        ]}
        signal="A strong answer clarifies before designing, defines the Contentstack content model with slug as a CMS field (for SEO-safe slug changes), assigns ISR to article pages (not SSR), describes all four caching layers with specific TTLs and invalidation triggers, recommends Algolia for search with justification, proposes partial pre-build (top 500) + dynamicParams: true to fix the build time problem, and names Sentry + Datadog RUM as the observability layer."
      />
    </div>
  );
}
