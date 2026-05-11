import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const decisionFlowchart = String.raw`flowchart TD
    START["What page type is this?"]
    Q1{"Does this page need\nper-request data?\n(auth, search params, headers)"}
    Q2{"How often does\nthe data change?"}
    Q3{"Is SEO critical?"}
    SSG["SSG\n(static, no revalidate)\nBuild once, serve forever"]
    ISR["ISR\n(revalidate: N seconds)\nStatic + auto-refresh"]
    SSR_AUTH["SSR\n(dynamic = force-dynamic)\nPer-request server render"]
    CSR["CSR\n(Client-side only)\n useEffect fetch or SWR"]

    START --> Q1
    Q1 -->|"Yes (auth/search)"| Q3
    Q1 -->|"No"| Q2
    Q2 -->|"Rarely (<1/day)"| SSG
    Q2 -->|"Sometimes (1/day to 1/min)"| ISR
    Q3 -->|"Yes (public pages)"| SSR_AUTH
    Q3 -->|"No (user dashboard)"| CSR`;

const helpcenterSitemapDiagram = String.raw`flowchart LR
    HOME["Homepage\nSSG + ISR\nrevalidate: 1800"]
    SEARCH["Search Results\nSSR (dynamic)\nor CSR"]
    CATEGORY["Category Listing\nSSG + ISR\nrevalidate: 300"]
    ARTICLE["Article Page\nSSG + ISR\nrevalidate: 3600"]
    ACCOUNT["User Account\nCSR + auth check"]
    SAVED["Saved Articles\nSSR (authenticated)"]

    HOME --> CATEGORY
    HOME --> SEARCH
    CATEGORY --> ARTICLE
    HOME --> ACCOUNT
    ACCOUNT --> SAVED`;

export const toc: TocItem[] = [
  { id: "the-framework", title: "The Decision Framework", level: 2 },
  { id: "page-by-page", title: "Help Center Page-by-Page Analysis", level: 2 },
  { id: "article-pages", title: "Article Pages", level: 3 },
  { id: "category-listing", title: "Category Listing Pages", level: 3 },
  { id: "search-results", title: "Search Results", level: 3 },
  { id: "user-pages", title: "User Account Pages", level: 3 },
  { id: "route-segment-config", title: "Route Segment Config Options", level: 2 },
  { id: "dynamic-functions", title: "How Dynamic Functions Force SSR", level: 3 },
  { id: "combining-approaches", title: "Combining Static Shell and Dynamic Content", level: 2 },
  { id: "comparison-table", title: "Rendering Modes Comparison", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function SsrSsgIsrDecision() {
  return (
    <div className="article-content">
      <p>
        Choosing the wrong rendering mode for a page is one of the most costly architectural
        mistakes in Next.js. An SSR page that should be ISR forces a Contentstack API call on
        every user request. An SSG page that should be ISR shows stale content for hours. This
        module builds the decision framework and applies it systematically to every page type in a
        Help Center.
      </p>

      <h2 id="the-framework">The Decision Framework</h2>
      <MermaidDiagram
        chart={decisionFlowchart}
        title="Rendering Mode Decision Flowchart"
        caption="Start with: does this page need per-request data? If yes, does it need SEO? Those two questions narrow the choice to one or two options."
        minHeight={500}
      />

      <p>
        The key distinction to internalize: <strong>per-request data is the only reason to use
        SSR</strong> for a content site. If the page content is the same for all users, SSG or ISR
        is always better — faster, cheaper, and infinitely more scalable.
      </p>

      <h2 id="page-by-page">Help Center Page-by-Page Analysis</h2>
      <MermaidDiagram
        chart={helpcenterSitemapDiagram}
        title="Help Center Sitemap with Rendering Mode Annotations"
        caption="Each page type gets the rendering mode that matches its data freshness requirements, SEO importance, and personalization needs."
        minHeight={300}
      />

      <h3 id="article-pages">Article Pages</h3>
      <p>
        <strong>Decision: SSG + ISR with revalidate: 3600, dynamicParams: true</strong>
      </p>
      <p>
        Article content is the same for all users. SEO is critical — these pages must be
        crawlable. Content changes are infrequent (a few times per week per article). The help
        center may have 10,000+ articles — building all of them at deploy time is feasible but slow.
        ISR with on-demand revalidation handles both the scale and freshness requirements.
      </p>

      <pre>
        <code>{`// src/app/help/[category]/[slug]/page.tsx
export const dynamic = "auto"; // default — allows ISR to work
export const revalidate = 3600; // 1 hour fallback if webhook doesn't fire
export const dynamicParams = true; // allow paths not in generateStaticParams (new articles)

export async function generateStaticParams() {
  // Pre-build the 1,000 most-visited articles at deploy time
  // The remaining 9,000 are generated on first request (ISR on-demand)
  const slugs = await getTopArticleSlugs({ limit: 1000 });
  return slugs.map(({ category, slug }) => ({ category, slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`);
  if (!article) notFound();
  return <ArticleContent article={article} />;
}`}</code>
      </pre>

      <h3 id="category-listing">Category Listing Pages</h3>
      <p>
        <strong>Decision: SSG + ISR with revalidate: 300</strong>
      </p>
      <p>
        Category listings show article cards. New articles appear here first. The listing must
        reflect recent publishes faster than individual article pages — hence a 5-minute TTL.
        All content is still the same for all users, so SSR is not justified.
      </p>

      <pre>
        <code>{`// src/app/help/[category]/page.tsx
export const revalidate = 300; // 5 minutes — new articles should appear quickly

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({ category: cat.slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [categoryData, articles] = await Promise.all([
    getCategory(category),
    getArticlesByCategory(category, { limit: 20 }),
  ]);

  if (!categoryData) notFound();

  return <CategoryContent category={categoryData} articles={articles} />;
}`}</code>
      </pre>

      <h3 id="search-results">Search Results</h3>
      <p>
        <strong>Decision: Client-side (CSR) or SSR, never SSG</strong>
      </p>
      <p>
        Search results depend on the user's query. You cannot pre-render all possible search
        queries. The choice between CSR and SSR depends on SEO requirements. If search results
        pages need to be crawlable (unlikely for a Help Center, but possible), use SSR.
        For typical Help Center search (user-interactive, not intended for indexing), CSR is simpler.
      </p>

      <pre>
        <code>{`// Option 1: Client-side search (simpler, no SEO)
// src/app/help/search/page.tsx
"use client"; // must be a client component to use searchParams reactively

import { useSearchParams } from "next/navigation";
import { useLazyQuery } from "@apollo/client";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [search, { data, loading }] = useLazyQuery(SEARCH_ARTICLES, {
    variables: { query },
  });

  useEffect(() => {
    if (query.length > 2) search();
  }, [query]);

  return <SearchResults results={data?.search?.items} loading={loading} query={query} />;
}

// Option 2: SSR search (crawlable, better for open search)
// src/app/help/search/page.tsx — Server Component (no "use client")
export const dynamic = "force-dynamic"; // required — searchParams makes it dynamic

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchArticles(q) : [];
  return <SearchResults results={results} query={q ?? ""} />;
}`}</code>
      </pre>

      <h3 id="user-pages">User Account Pages</h3>
      <p>
        <strong>Decision: SSR (authenticated pages) or CSR (dashboard widgets)</strong>
      </p>
      <p>
        Authenticated pages must not be cached by a CDN — each user's data is different and private.
        The page must check the session on every request. SSR with no-store cache control is
        appropriate. Alternatively, render the page shell as static and fetch user data
        client-side after authentication — this approach uses CSR for the dynamic parts.
      </p>

      <pre>
        <code>{`// Authenticated SSR — reads session from cookie on every request
// src/app/account/page.tsx
import { cookies } from "next/headers"; // reading cookies forces dynamic rendering

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) redirect("/login");

  const user = await getUserFromSession(sessionToken);
  return <AccountDashboard user={user} />;
}
// Note: using cookies() automatically opts this route into dynamic rendering
// No need to set export const dynamic = "force-dynamic" explicitly`}</code>
      </pre>

      <h2 id="route-segment-config">Route Segment Config Options</h2>

      <pre>
        <code>{`// Route Segment Config — exported constants that control caching behavior

// Opt out of all caching — equivalent to SSR
export const dynamic = "force-dynamic";

// Force static generation — fail at build if the page uses dynamic functions
export const dynamic = "force-static";

// Default — Next.js decides based on what the page uses
export const dynamic = "auto"; // this is the default, no need to set it

// Set ISR revalidation interval (seconds)
export const revalidate = 3600; // 1 hour

// false = never revalidate (truly static forever)
export const revalidate = false;

// 0 = revalidate on every request (equivalent to SSR)
export const revalidate = 0;

// Control whether paths not returned by generateStaticParams get rendered
export const dynamicParams = true;  // default — generate on first request (ISR)
export const dynamicParams = false; // 404 for any path not in generateStaticParams

// Prefer one of the runtime environments
export const runtime = "edge"; // Edge Runtime — limited Node.js APIs, fast cold start
export const runtime = "nodejs"; // Node.js Runtime — full APIs, slightly slower cold start`}</code>
      </pre>

      <h3 id="dynamic-functions">How Dynamic Functions Force SSR</h3>
      <p>
        Using certain Next.js APIs in a Server Component automatically opts the entire route out of
        static generation, even if you don't set <code>dynamic = "force-dynamic"</code>:
      </p>

      <pre>
        <code>{`// These dynamic functions force dynamic rendering:
import { cookies } from "next/headers";   // reads request cookies
import { headers } from "next/headers";   // reads request headers
import { draftMode } from "next/headers"; // reads draft mode cookie

// And in page props:
// searchParams — accessing searchParams in a page opts it into dynamic rendering
export default async function Page({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  const { q } = await searchParams; // this makes the route dynamic
}

// Common mistake: adding cookies() or headers() to a page that was working as ISR
// Before: page was SSG + ISR, great performance
// After adding cookies() for a banner experiment: entire page is now SSR, no caching

// Solution: move the dynamic part to a separate Client Component
// Page stays static; the Client Component fetches its own dynamic data client-side`}</code>
      </pre>

      <h2 id="combining-approaches">Combining Static Shell and Dynamic Content</h2>
      <p>
        The most powerful pattern for complex pages: render the static article content as SSG/ISR,
        and hydrate dynamic sections (user-specific recommendations, personalized banners) as
        Client Components that fetch their own data after the static shell is served. The user sees
        the article content immediately (fast LCP), then dynamic sections load in.
      </p>

      <pre>
        <code>{`// Static shell + dynamic islands pattern
// Server Component — renders statically with ISR
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug); // fetched at build time / ISR
  if (!article) notFound();

  return (
    <article>
      {/* Static — rendered at build time, cached at CDN */}
      <ArticleHeader title={article.title} author={article.author} />
      <RichTextRenderer body={article.body} />

      {/* Dynamic island — Client Component fetches its own data */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <PersonalizedRecommendations articleUid={article.uid} />
      </Suspense>

      {/* Dynamic island — feedback widget, purely client-side */}
      <FeedbackWidget articleUid={article.uid} />
    </article>
  );
}

// PersonalizedRecommendations — Client Component
"use client";

function PersonalizedRecommendations({ articleUid }: { articleUid: string }) {
  const { data } = useQuery(GET_RECOMMENDATIONS, {
    variables: { articleUid, userId: useCurrentUserId() },
  });
  // This runs client-side — no SSR cost, article is already showing
  return <RecommendationList recommendations={data?.recommendations} />;
}`}</code>
      </pre>

      <h2 id="comparison-table">Rendering Modes Comparison</h2>

      <ArticleTable caption="The four rendering modes and when each is appropriate for a Help Center." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>When to Use</th>
              <th>SEO</th>
              <th>Caching</th>
              <th>Freshness</th>
              <th>Auth Support</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>SSG</strong></td>
              <td>Content that never changes: legal pages, about pages</td>
              <td>Excellent</td>
              <td>Infinite — CDN serves forever</td>
              <td>Only on redeploy</td>
              <td>No — same for all users</td>
            </tr>
            <tr>
              <td><strong>ISR</strong></td>
              <td>Content that changes occasionally: articles, category listings</td>
              <td>Excellent</td>
              <td>CDN cache with TTL</td>
              <td>Within revalidation interval (or on-demand)</td>
              <td>No — same for all users</td>
            </tr>
            <tr>
              <td><strong>SSR</strong></td>
              <td>Authenticated pages, search with SEO, personalized content with SEO</td>
              <td>Good</td>
              <td>None (must use no-store or private)</td>
              <td>Always fresh</td>
              <td>Yes — reads session per request</td>
            </tr>
            <tr>
              <td><strong>CSR</strong></td>
              <td>Search results (no SEO), user dashboards, real-time widgets</td>
              <td>Poor — not crawlable</td>
              <td>Browser cache only</td>
              <td>Always fresh (fetches on mount)</td>
              <td>Yes — client reads session cookie</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through which rendering mode you'd use for each page in a Help Center'"
        intro="This question has a specific correct answer for each page type. The interviewer wants systematic reasoning, not generic 'it depends' answers."
        steps={[
          "Article pages: SSG at build time for the top N articles (fastest TTFB), dynamicParams: true so new articles generate on first request (ISR), revalidate: 3600 as the fallback TTL. On-demand revalidation via Contentstack webhook closes the gap on urgent updates. Never SSR — article content is identical for all users.",
          "Category listing pages: ISR with revalidate: 300 — shorter than article pages because new articles appear in listings first. Editors expect new articles to show within minutes, not an hour.",
          "Search results: depends on SEO requirements. For a Help Center where search is for users to find answers (not for Google to index search result pages): CSR. The user types a query, an Apollo useQuery fires, results appear. Simple. If search result pages need to be crawlable: SSR with force-dynamic (searchParams make it dynamic automatically).",
          "User account / saved articles pages: SSR because the content is user-specific and private. Reading the session cookie from headers() automatically forces dynamic rendering. Set Cache-Control: private, no-store for these routes — never let a CDN cache authenticated content.",
          "Homepage: SSG + ISR with revalidate: 1800. The homepage has marketing content that changes maybe once a week. ISR ensures fresh content without deploys.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Rendering Strategy for a 10,000-Article Help Center"
        scenario={
          <span>
            The Indeed Help Center has: 10,000 articles across 50 categories, 5 supported languages,
            approximately 200 CMS updates per day, 2 million monthly active users, and articles that
            are SEO-critical. The build pipeline currently takes 45 minutes because it pre-renders
            all 50,000 pages (10k articles x 5 languages). Editors complain that published articles
            take up to 45 minutes to go live.
          </span>
        }
        tasks={[
          "The 45-minute build is unacceptable. Design a generateStaticParams strategy that reduces build time while keeping the most-visited pages fast — what do you pre-render and what do you leave for ISR on-demand?",
          "Editors need updates live within 2 minutes of publishing. With ISR revalidate: 3600, how do you achieve this? Describe the webhook-triggered on-demand revalidation chain.",
          "The category listing page currently uses SSR (force-dynamic was set by a previous developer who added searchParams for sorting). Sorting is now handled client-side. How do you migrate it back to ISR without breaking current users?",
          "Authenticated users can save articles to a reading list, shown at /account/saved. This page shows the user's saved articles pulled from a database, plus the CMS content for those articles. What rendering mode and data fetching strategy do you use?",
          "A new 'featured article' widget on the homepage must show the current featured article from CMS, updated within 5 minutes of an editor marking it as featured. How do you implement this without making the entire homepage SSR?",
        ]}
        pitfalls={[
          "Pre-rendering all 50,000 pages in generateStaticParams — this defeats the purpose of dynamicParams: true which allows ISR on-demand generation",
          "Setting revalidate: 0 on article pages — this is SSR with caching disabled, not ISR",
          "Using cookies() or headers() in the article page layout — this opts the entire article route into dynamic rendering, breaking ISR for all articles",
          "Making the homepage SSR to serve fresh featured article data — the better answer is static shell + client-fetched widget",
        ]}
        signal="A strong answer pre-renders only the top N articles (not all 50,000), uses webhook on-demand revalidation for the 2-minute SLA, removes the force-dynamic flag from the category page and re-enables ISR, uses SSR for the /account/saved page with private cache headers, and uses the static shell + CSR island pattern for the featured article widget."
      />
    </div>
  );
}
