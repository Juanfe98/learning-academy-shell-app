import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const i18nRequestFlowDiagram = String.raw`flowchart TD
    REQ["Incoming Request\n/help/update-billing"]
    MW["Next.js Middleware\n(locale detection)"]
    ACCEPT["Accept-Language header\nen-US, es-MX;q=0.9"]
    COOKIE["Locale Cookie\n(user preference)"]
    REWRITE["Rewrite to /en-us/help/update-billing"]
    PAGE["[lang]/help/[slug]/page.tsx"]
    CS["Contentstack\nfetch with locale: 'en-us'"]

    REQ --> MW
    MW --> ACCEPT
    MW --> COOKIE
    COOKIE -->|"priority"| REWRITE
    ACCEPT -->|"fallback"| REWRITE
    REWRITE --> PAGE
    PAGE --> CS`;

const localeFallbackDiagram = String.raw`flowchart LR
    REQUESTED["Requested: es-MX"]
    ES["es locale\n(fallback 1)"]
    EN["en locale\n(fallback 2)"]
    MASTER["master/default\n(final fallback)"]
    FOUND["Entry found in es-MX"]
    NOT_FOUND["Entry not in es-MX"]

    REQUESTED -->|"entry exists?"| FOUND
    REQUESTED -->|"not found"| ES
    ES -->|"not found"| EN
    EN -->|"not found"| MASTER`;

export const toc: TocItem[] = [
  { id: "contentstack-i18n", title: "Contentstack Built-in i18n", level: 2 },
  { id: "locale-fallback", title: "Locale Fallback Chain", level: 3 },
  { id: "nextjs-i18n-routing", title: "Next.js App Router i18n Routing", level: 2 },
  { id: "middleware-detection", title: "Middleware Locale Detection", level: 3 },
  { id: "static-params", title: "generateStaticParams Across Locales", level: 3 },
  { id: "fetching-localized", title: "Fetching Localized Content", level: 2 },
  { id: "next-intl", title: "next-intl for UI Strings", level: 2 },
  { id: "seo-hreflang", title: "SEO: hreflang and Canonical URLs", level: 2 },
  { id: "locale-code-gotcha", title: "The Locale Code Format Gotcha", level: 2 },
  { id: "content-vs-ui", title: "CMS Content vs UI String Translations", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function I18nCms() {
  return (
    <div className="article-content">
      <p>
        Adding Spanish or French support to a Help Center is not just a translation task — it
        requires coordinated changes across the CMS content model, Next.js routing, middleware,
        and SEO metadata. Contentstack has built-in locale support. Next.js App Router handles
        locale routing via a dynamic [lang] segment. This module covers the complete architecture.
      </p>

      <h2 id="contentstack-i18n">Contentstack Built-in i18n</h2>
      <p>
        Contentstack handles i18n at the entry level. Each content entry can have locale-specific
        versions. When you publish an article in English (en-us) and Spanish (es-mx), they are
        the same entry with locale variants. Editors work in the Contentstack UI, switching
        locale context to translate content.
      </p>

      <pre>
        <code>{`// In the Contentstack Stack settings:
// 1. Enable localization
// 2. Set master locale (e.g., "en-us" — the source locale)
// 3. Add additional locales: es-mx, fr-fr
// 4. Each content type field can be marked "localize" — translateable
//    or not (e.g., slug field stays the same across locales — DO NOT localize it)

// Contentstack locale codes (important: uses hyphens and lowercase)
// en-us (not en-US) — English (United States)
// es-mx (not es-MX) — Spanish (Mexico)
// fr-fr (not fr-FR) — French (France)

// Fetching a localized entry via the Delivery SDK:
const result = await stack
  .contentType("article")
  .entry()
  .query({ "url": "/help/billing/update-billing" })
  .language("es-mx") // locale parameter
  .find();

// GraphQL approach — locale parameter in the query:
const LOCALIZED_ARTICLE = gql\`
  query GetArticle($url: String!, $locale: String!) {
    all_article(where: { url: { eq: $url } }, locale: $locale) {
      items {
        title    # returns the es-mx translated title
        body     # returns the es-mx translated body
        url      # NOT translated — same across locales (don't localize slug)
        author { name }
        category { title } # returns translated category title if localized
      }
    }
  }
\`;`}</code>
      </pre>

      <h3 id="locale-fallback">Locale Fallback Chain</h3>
      <MermaidDiagram
        chart={localeFallbackDiagram}
        title="Contentstack Locale Fallback Chain"
        caption="If a translation doesn't exist for the requested locale, Contentstack falls back to the parent locale, then to the master locale. Configure fallback chains in Stack settings."
        minHeight={280}
      />

      <pre>
        <code>{`// Contentstack locale fallback configuration (set in Stack → Localization settings):
// es-mx → es → en-us (master)
// fr-fr → fr → en-us (master)

// This means: if an article hasn't been translated to es-mx yet,
// Contentstack returns the en-us version automatically.
// You can detect fallback by checking entry.locale in the response:

const article = await getArticle(slug, "es-mx");
const isFallback = article.locale !== "es-mx"; // true if serving en-us fallback

// Show a "this article is not yet available in your language" notice to users
if (isFallback && locale !== "en-us") {
  // Optional: notify the user they're seeing a fallback translation
}`}</code>
      </pre>

      <h2 id="nextjs-i18n-routing">Next.js App Router i18n Routing</h2>
      <p>
        App Router does not have built-in i18n routing like Pages Router's{" "}
        <code>next.config.js i18n</code> config. Instead, you use a dynamic{" "}
        <code>[lang]</code> segment as the first path segment:
      </p>

      <pre>
        <code>{`// File structure for i18n routing:
// src/app/
//   [lang]/
//     layout.tsx            ← applies locale to all nested routes
//     help/
//       page.tsx            ← /en-us/help, /es-mx/help, /fr-fr/help
//       [category]/
//         page.tsx          ← /en-us/help/billing, /es-mx/help/billing
//         [slug]/
//           page.tsx        ← /en-us/help/billing/update-billing

// src/app/[lang]/layout.tsx
const SUPPORTED_LOCALES = ["en-us", "es-mx", "fr-fr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;

  // Validate locale — redirect to default if unsupported
  if (!SUPPORTED_LOCALES.includes(lang)) {
    redirect("/en-us/help");
  }

  return (
    // Set lang attribute for correct screen reader pronunciation
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}

// src/app/[lang]/help/[category]/[slug]/page.tsx
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ lang: Locale; category: string; slug: string }>;
}) {
  const { lang, category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`, lang);
  if (!article) notFound();
  return <ArticleContent article={article} locale={lang} />;
}`}</code>
      </pre>

      <h3 id="middleware-detection">Middleware Locale Detection</h3>
      <MermaidDiagram
        chart={i18nRequestFlowDiagram}
        title="i18n Request Flow — Locale Detection via Middleware"
        caption="Middleware runs before every request. It checks the locale cookie first (user preference), then falls back to Accept-Language header negotiation."
        minHeight={440}
      />

      <pre>
        <code>{`// src/middleware.ts — locale detection and redirect
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["en-us", "es-mx", "fr-fr"];
const DEFAULT_LOCALE = "en-us";

// Normalize HTTP locale codes to Contentstack format
// HTTP: en-US, es-MX → Contentstack: en-us, es-mx
function normalizeLocale(locale: string): string {
  return locale.toLowerCase().replace(/_/g, "-");
}

function detectLocale(request: NextRequest): string {
  // 1. Check for explicit locale cookie (user preference)
  const cookieLocale = request.cookies.get("preferred-locale")?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(normalizeLocale(cookieLocale))) {
    return normalizeLocale(cookieLocale);
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    // "en-US,en;q=0.9,es-MX;q=0.8" → ["en-US", "en", "es-MX"]
    const preferredLocales = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim())
      .map(normalizeLocale);

    const matched = preferredLocales.find((lang) =>
      SUPPORTED_LOCALES.some((supported) => lang.startsWith(supported.split("-")[0]))
    );

    if (matched) {
      // Map "en" to "en-us", "es" to "es-mx"
      const langCode = matched.split("-")[0];
      return SUPPORTED_LOCALES.find((l) => l.startsWith(langCode)) ?? DEFAULT_LOCALE;
    }
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip if pathname already starts with a supported locale
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(\`/\${locale}/\`) || pathname === \`/\${locale}\`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Redirect /help/... to /en-us/help/...
  const locale = detectLocale(request);
  const newUrl = new URL(\`/\${locale}\${pathname}\`, request.url);
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: [
    // Only run middleware on help center pages, not on API routes, static files, etc.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};`}</code>
      </pre>

      <h3 id="static-params">generateStaticParams Across Locales</h3>

      <pre>
        <code>{`// Pre-render all locale × article combinations at build time
// For 10,000 articles × 3 locales = 30,000 static pages

export async function generateStaticParams() {
  const SUPPORTED_LOCALES = ["en-us", "es-mx", "fr-fr"];

  // Fetch all article slugs from the master locale
  const slugs = await getAllArticleSlugs(); // returns [{ category, slug }]

  // Generate all locale combinations
  const params = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const { category, slug } of slugs) {
      params.push({ lang: locale, category, slug });
    }
  }

  return params;
}

// For a 10k × 3 setup, this generates 30k static pages at build time.
// Too slow for a 10k article set? Use dynamicParams: true and generate on first request.
// The 1,000 most popular articles in all locales = 3,000 pre-rendered.
// The rest generate on first request via ISR.

export async function generateStaticParams() {
  const slugs = await getTopArticleSlugs({ limit: 1000 });

  return SUPPORTED_LOCALES.flatMap((lang) =>
    slugs.map(({ category, slug }) => ({ lang, category, slug }))
  );
}

export const dynamicParams = true; // generate remaining on first request`}</code>
      </pre>

      <h2 id="fetching-localized">Fetching Localized Content</h2>

      <pre>
        <code>{`// Locale-aware data fetching — pass locale to every CMS call
async function getArticle(slug: string, locale: string) {
  // Important: Contentstack uses lowercase hyphenated locale codes
  // Normalize in case a different format was passed
  const csLocale = locale.toLowerCase();

  const result = await stack
    .contentType("article")
    .entry()
    .query({ url: slug })
    .language(csLocale)
    .includeReference(["author", "category"]) // include nested references
    .find();

  return result.entries?.[0] ?? null;
}

// Or via GraphQL with locale parameter:
async function getArticleGraphQL(slug: string, locale: string) {
  const data = await fetchGraphQL<ArticleQueryResult>(
    \`query GetArticle($url: String!, $locale: String!) {
      all_article(where: { url: { eq: $url } }, locale: $locale) {
        items { title body author { name } category { title } }
      }
    }\`,
    { url: slug, locale: locale.toLowerCase() }
  );
  return data.all_article?.items?.[0] ?? null;
}`}</code>
      </pre>

      <h2 id="next-intl">next-intl for UI Strings</h2>

      <pre>
        <code>{`// next-intl handles UI strings (buttons, labels, error messages)
// CMS handles article content (titles, body, metadata)
// Never mix them — CMS content is for editors, UI strings are for developers

// pnpm add next-intl

// src/i18n/messages/en-us.json
{
  "article": {
    "published_by": "Published by {author}",
    "reading_time": "{minutes} min read",
    "feedback_helpful": "Was this article helpful?",
    "feedback_yes": "Yes, this helped",
    "feedback_no": "No, I need more help",
    "feedback_thanks": "Thank you for your feedback"
  },
  "navigation": {
    "search_placeholder": "Search help articles...",
    "back_to_category": "Back to {category}"
  }
}

// src/i18n/messages/es-mx.json
{
  "article": {
    "published_by": "Publicado por {author}",
    "reading_time": "{minutes} min de lectura",
    "feedback_helpful": "¿Te fue útil este artículo?",
    "feedback_yes": "Sí, me ayudó",
    "feedback_no": "No, necesito más ayuda",
    "feedback_thanks": "Gracias por tu opinión"
  }
}

// src/i18n/request.ts — configure next-intl for App Router
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(\`../i18n/messages/\${locale}.json\`)).default,
}));

// Usage in a Client Component:
import { useTranslations } from "next-intl";

function ArticleFeedback({ articleUid }: { articleUid: string }) {
  const t = useTranslations("article");
  return (
    <div>
      <p>{t("feedback_helpful")}</p>
      <button>{t("feedback_yes")}</button>
      <button>{t("feedback_no")}</button>
    </div>
  );
}

// Usage in a Server Component:
import { getTranslations } from "next-intl/server";

export default async function ArticlePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "article" });
  // t("reading_time", { minutes: 5 }) → "5 min read" or "5 min de lectura"
}`}</code>
      </pre>

      <h2 id="seo-hreflang">SEO: hreflang and Canonical URLs</h2>

      <pre>
        <code>{`// generateMetadata must include hreflang alternate links for multilingual SEO
// Search engines use these to understand which page is for which language/region

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; category: string; slug: string }>;
}) {
  const { lang, category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`, lang);

  if (!article) return {};

  const SUPPORTED_LOCALES = ["en-us", "es-mx", "fr-fr"];
  const baseUrl = "https://help.indeed.com";
  const path = \`/help/\${category}/\${slug}\`;

  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.summary,
    // Canonical URL — the authoritative version of this page
    alternates: {
      canonical: \`\${baseUrl}/\${lang}\${path}\`,
      // hreflang links — tell search engines about other language versions
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((locale) => [
          locale, // "en-us", "es-mx", "fr-fr"
          \`\${baseUrl}/\${locale}\${path}\`,
        ])
      ),
    },
  };
}

// Generates <link rel="alternate" hreflang="en-us" href="https://help.indeed.com/en-us/help/..." />
// in the <head> for each supported locale`}</code>
      </pre>

      <h2 id="locale-code-gotcha">The Locale Code Format Gotcha</h2>
      <p>
        This is the most common bug in Contentstack + Next.js i18n setups. HTTP and BCP 47 use
        capitalized region codes (<code>en-US</code>), but Contentstack locale codes are all
        lowercase (<code>en-us</code>). Always normalize:
      </p>

      <pre>
        <code>{`// HTTP Accept-Language header: "en-US,es-MX;q=0.9"
// Contentstack locale param: "en-us", "es-mx"
// Next.js [lang] segment: whatever you put in generateStaticParams — use lowercase

// Normalize in ONE place — at the API boundary:
function toContentstackLocale(locale: string): string {
  return locale.toLowerCase(); // "en-US" → "en-us", "es-MX" → "es-mx"
}

// Then use this function everywhere you pass locale to Contentstack:
const article = await getArticle(slug, toContentstackLocale(lang));

// Common bug: passing "en-US" directly to the Contentstack SDK
// Result: SDK makes a request with locale="en-US", Contentstack returns 404
// because the locale is stored as "en-us" in the stack settings`}</code>
      </pre>

      <h2 id="content-vs-ui">CMS Content vs UI String Translations</h2>

      <ArticleTable caption="Clear separation between what editors translate in Contentstack and what developers translate in code." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Examples</th>
              <th>Where It Lives</th>
              <th>Who Manages It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CMS Content</strong></td>
              <td>Article title, body, author bio, category name, FAQ answers</td>
              <td>Contentstack locale-specific entries</td>
              <td>Editors / Translation team via Contentstack UI or export/import</td>
            </tr>
            <tr>
              <td><strong>UI Strings</strong></td>
              <td>"Was this helpful?", "Search articles", "Published by", "Back to category"</td>
              <td>JSON message files (en-us.json, es-mx.json) in the codebase</td>
              <td>Developers — managed in code, reviewed in PRs</td>
            </tr>
            <tr>
              <td><strong>SEO Metadata</strong></td>
              <td>Page title format, meta description template</td>
              <td>Mix: CMS provides article-specific values; templates are in code</td>
              <td>Both — CMS for content, code for format</td>
            </tr>
            <tr>
              <td><strong>Error Messages</strong></td>
              <td>"Article not found", "Search failed", "Something went wrong"</td>
              <td>JSON message files in the codebase</td>
              <td>Developers</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you add Spanish support to an existing Next.js Help Center?'"
        intro="This is an architecture question, not a translation question. Walk through the full system: CMS changes, routing changes, middleware, generateStaticParams, SEO, and the one gotcha everyone misses."
        steps={[
          "Start with Contentstack: add es-mx as a locale in Stack settings, configure the fallback chain (es-mx → es → en-us), mark the article body and title fields as localizable. The slug/URL field should NOT be localized — the URL stays the same in all languages.",
          "Describe the routing change: add a [lang] segment at the root of the help center route tree. All help center URLs become /en-us/help/... and /es-mx/help/.... Update generateStaticParams to generate combinations of all locales × all article slugs.",
          "Explain middleware: middleware detects the user's preferred locale from the Accept-Language header or a locale cookie, then redirects /help/... to /en-us/help/... or /es-mx/help/... accordingly.",
          "Address the data fetching: every Contentstack fetch gets a locale parameter. Use the normalized lowercase Contentstack locale code — this is the most common bug. HTTP says en-US but Contentstack expects en-us.",
          "Close with SEO: generateMetadata must include hreflang alternate links for every locale version of the page. This tells search engines which URL serves which language and prevents duplicate content penalties.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Full i18n Architecture for a Trilingual Help Center"
        scenario={
          <span>
            The Indeed Help Center currently serves only English (en-US). You need to add support for
            Spanish (es-MX) and French (fr-FR). The Help Center has 10,000 articles. Only 2,000
            articles have Spanish translations; none have French yet (fallback to English acceptable).
            The search feature uses Contentstack&apos;s built-in search. The app uses
            Next.js App Router with ISR.
          </span>
        }
        tasks={[
          "What changes are needed in the Contentstack content model to support i18n — specifically which fields should be localized and which should not, and why?",
          "Design the URL structure and file system layout for the [lang] segment — include the middleware for locale detection and the redirect logic for /help/... → /en-us/help/...",
          "Design the generateStaticParams strategy: given 10,000 articles × 3 locales = 30,000 potential pages, what do you pre-render at build time and what do you leave for ISR on-demand generation?",
          "How do you handle the 8,000 articles that don't have Spanish translations? Describe both the Contentstack fallback behavior and what you show to Spanish-speaking users who land on a fallback-served article",
          "What SEO changes are required? List the specific metadata fields and how you generate them using generateMetadata",
        ]}
        pitfalls={[
          "Localizing the slug/URL field — article URLs must be the same across locales, or all your internal links and sitemap break",
          "Passing en-US (uppercase) to Contentstack — the locale code must be en-us (lowercase) or the API returns 404",
          "Pre-rendering all 30,000 combinations at build time — with 10k articles × 3 locales, build time becomes unacceptable; use dynamicParams: true and pre-render only the top visited pages",
          "Missing hreflang in generateMetadata — search engines will index duplicate content across locales instead of understanding them as language variants",
        ]}
        signal="A strong answer does not localize the slug field, normalizes locale codes to lowercase at the API boundary, uses dynamicParams: true with a subset pre-rendered, shows a 'viewing English version' notice for fallback-served content, and generates hreflang alternate links in generateMetadata for all supported locales."
      />
    </div>
  );
}
