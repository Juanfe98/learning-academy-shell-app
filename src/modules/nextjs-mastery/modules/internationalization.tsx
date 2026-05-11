import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const i18nRequestFlowDiagram = String.raw`flowchart TD
  REQUEST["Incoming request: GET /about"]
  REQUEST --> MW["middleware.ts runs<br/>(matches all routes)"]
  MW --> DETECT{"Detect locale from:<br/>1. Cookie (user preference)<br/>2. Accept-Language header<br/>3. Default locale fallback"}
  DETECT --> LOCALE["Locale determined: 'en'"]
  LOCALE --> REWRITE["NextResponse.rewrite() or redirect()<br/>to /en/about"]
  REWRITE --> SEGMENT["[lang] segment resolves<br/>app/[lang]/about/page.tsx"]
  SEGMENT --> DICT["Load dictionary for locale<br/>server-side at render time"]
  DICT --> RENDER["Render page with translations<br/>lang set on <html> element"]`;

const strategyComparisonDiagram = String.raw`flowchart LR
  SUBPATH["Sub-path routing<br/>example.com/en/about<br/>example.com/fr/about<br/>Recommended: SEO-friendly,<br/>single domain"]
  DOMAIN["Domain routing<br/>en.example.com/about<br/>fr.example.com/about<br/>Requires DNS per locale,<br/>multiple Vercel projects or rewrites"]
  COOKIE["Cookie / header-based<br/>example.com/about<br/>(locale from Accept-Language or cookie)<br/>Not SEO-friendly — same URL for all locales"]

  SUBPATH --> NOTE1["hreflang links work correctly<br/>Each locale page has unique URL"]
  DOMAIN --> NOTE2["Highest complexity<br/>Separate deployment or<br/>reverse proxy needed"]
  COOKIE --> NOTE3["Avoid for public content<br/>Crawlers get random locale"]`;

export const toc: TocItem[] = [
  { id: "i18n-strategies", title: "i18n Routing Strategies", level: 2 },
  { id: "pages-router-i18n", title: "Pages Router Built-in i18n", level: 2 },
  { id: "app-router-i18n", title: "App Router: No Built-in i18n", level: 2 },
  { id: "middleware-locale-detection", title: "Middleware Locale Detection", level: 2 },
  { id: "lang-segment-pattern", title: "The [lang] Segment Pattern", level: 2 },
  { id: "translation-libraries", title: "Translation Libraries for App Router", level: 2 },
  { id: "generateStaticParams-i18n", title: "Pre-rendering All Locales", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Internationalization() {
  return (
    <div className="article-content">
      <p>
        Internationalization (i18n) is one of the features where Pages Router and App Router
        differ most significantly. The Pages Router had built-in i18n support via{" "}
        <code>next.config</code>. The App Router deliberately removed this built-in support and
        requires you to implement i18n manually — typically through middleware and a dynamic{" "}
        <code>[lang]</code> route segment. This module explains both approaches and the migration
        path between them.
      </p>

      <h2 id="i18n-strategies">i18n Routing Strategies</h2>
      <p>
        There are three main approaches to i18n routing, each with different SEO and complexity
        tradeoffs.
      </p>

      <MermaidDiagram
        chart={strategyComparisonDiagram}
        title="i18n Routing Strategies Compared"
        caption="Sub-path routing is the recommended approach for most applications. It is SEO-friendly, requires a single domain, and is straightforward to implement with middleware."
        minHeight={440}
      />

      <p>
        <strong>Sub-path routing</strong> is the standard choice for most production applications.
        Every locale gets its own URL (<code>/en/about</code>, <code>/fr/about</code>), which is
        required for correct <code>hreflang</code> SEO signals and allows search engines to index
        each locale independently.
      </p>

      <h2 id="pages-router-i18n">Pages Router Built-in i18n</h2>
      <p>
        The Pages Router had first-class i18n support via the <code>i18n</code> key in{" "}
        <code>next.config</code>. Next.js handled locale detection, routing, and redirects
        automatically.
      </p>
      <pre>
        <code>{`// next.config.js (Pages Router only)
/** @type {import('next').NextConfig} */
module.exports = {
  i18n: {
    locales: ["en", "fr", "de", "es"],
    defaultLocale: "en",
    // Optional: domain routing
    domains: [
      { domain: "example.com", defaultLocale: "en" },
      { domain: "example.fr", defaultLocale: "fr" },
    ],
  },
};

// With the above config, Next.js automatically:
// - Redirects / to /en (the default locale) or /fr based on Accept-Language
// - Makes router.locale available in every page component
// - Pre-generates /en/about, /fr/about, etc. for static pages

// pages/about.tsx (Pages Router)
import { useRouter } from "next/router";

export default function AboutPage() {
  const { locale, locales, defaultLocale } = useRouter();
  return <div>Current locale: {locale}</div>;
}

// IMPORTANT: This i18n config key is NOT supported in App Router
// Do not add it when using app/ directory`}</code>
      </pre>

      <h2 id="app-router-i18n">App Router: No Built-in i18n</h2>
      <p>
        The App Router removed the built-in <code>i18n</code> next.config support. This was an
        intentional design decision — the team found the built-in approach too opinionated and
        limiting for complex localization needs. Instead, you implement i18n yourself using:
      </p>
      <ol>
        <li>Middleware for locale detection and routing</li>
        <li>A dynamic <code>[lang]</code> route segment as the root of all routes</li>
        <li>A translation library for the actual text substitution</li>
      </ol>
      <pre>
        <code>{`// Common misconception: adding i18n to next.config.ts for App Router
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❌ WRONG: i18n key is Pages Router only — silently ignored in App Router
  i18n: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
};

// ✅ CORRECT: For App Router, implement via middleware + [lang] segment
// No i18n key in config — handle it yourself`}</code>
      </pre>

      <h2 id="middleware-locale-detection">Middleware Locale Detection</h2>
      <p>
        The middleware is the entry point for locale routing. It intercepts every request, detects
        the appropriate locale, and rewrites or redirects to the locale-prefixed path.
      </p>

      <MermaidDiagram
        chart={i18nRequestFlowDiagram}
        title="App Router i18n Request Flow"
        caption="Every request passes through middleware which detects the locale and rewrites the URL to include the [lang] segment. The [lang] segment then determines which translations to load."
        minHeight={560}
      />

      <pre>
        <code>{`// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["en", "fr", "de", "es"];
const DEFAULT_LOCALE = "en";

function detectLocale(request: NextRequest): string {
  // 1. Check for locale cookie (user manually changed language)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const preferred = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().substring(0, 2))
    .find((lang) => SUPPORTED_LOCALES.includes(lang));
  if (preferred) return preferred;

  // 3. Default
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(\`/\${locale}/\`) || pathname === \`/\${locale}\`
  );
  if (pathnameHasLocale) return; // already has locale prefix, do nothing

  // Redirect to locale-prefixed path
  const locale = detectLocale(request);
  request.nextUrl.pathname = \`/\${locale}\${pathname}\`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // CRITICAL: exclude static files and Next.js internals from middleware
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};`}</code>
      </pre>

      <h2 id="lang-segment-pattern">The [lang] Segment Pattern</h2>
      <p>
        All your application routes live under a <code>[lang]</code> dynamic segment. This gives
        every page access to the current locale via its params.
      </p>
      <pre>
        <code>{`// Directory structure:
// app/
//   [lang]/
//     layout.tsx     ← receives lang param, sets <html lang>
//     page.tsx       ← homepage
//     about/
//       page.tsx     ← /en/about, /fr/about, etc.
//     blog/
//       [slug]/
//         page.tsx   ← /en/blog/hello, /fr/blog/hello

// app/[lang]/layout.tsx
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LangLayout({ children, params }: LayoutProps) {
  const { lang } = await params; // Next.js 15: params is a Promise

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}

// app/[lang]/page.tsx
interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return (
    <main>
      <h1>{dict.home.title}</h1>
      <p>{dict.home.description}</p>
    </main>
  );
}

// lib/i18n.ts — dictionary loader
import type { Locale } from "./types";

const dictionaries = {
  en: () => import("../dictionaries/en.json").then((m) => m.default),
  fr: () => import("../dictionaries/fr.json").then((m) => m.default),
  de: () => import("../dictionaries/de.json").then((m) => m.default),
};

export async function getDictionary(locale: string) {
  const loader = dictionaries[locale as Locale] ?? dictionaries.en;
  return loader();
}`}</code>
      </pre>

      <h2 id="translation-libraries">Translation Libraries for App Router</h2>

      <ArticleTable caption="Popular i18n libraries and their App Router support." minWidth={920}>
        <table>
          <thead>
            <tr>
              <th>Library</th>
              <th>App Router support</th>
              <th>Server Components</th>
              <th>Bundle size</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>next-intl</code></td>
              <td>Excellent — built for App Router</td>
              <td>Yes — first-class</td>
              <td>Small (~5kb)</td>
              <td>Recommended. Server Component translations are zero-bundle-cost. Has middleware integration.</td>
            </tr>
            <tr>
              <td><code>react-i18next</code></td>
              <td>Good — requires additional setup</td>
              <td>Partial (server-side loading)</td>
              <td>Medium (~20kb)</td>
              <td>Widely used. Client-heavy by default. Use <code>i18next</code> directly on the server side.</td>
            </tr>
            <tr>
              <td><code>next-translate</code></td>
              <td>Limited — primarily Pages Router</td>
              <td>No</td>
              <td>Small</td>
              <td>Built for Pages Router i18n config. App Router support is experimental.</td>
            </tr>
            <tr>
              <td>Custom (JSON dictionaries)</td>
              <td>Full control</td>
              <td>Yes</td>
              <td>Zero overhead</td>
              <td>Simple apps can load JSON dictionaries server-side without a library. Shown in the pattern above.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Using next-intl (recommended library for App Router i18n)
// Installation: pnpm add next-intl

// middleware.ts — next-intl provides createMiddleware helper
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "fr", "de"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};

// app/[locale]/page.tsx — using next-intl in Server Components
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  // Server-side: no client bundle cost
  const t = await getTranslations("HomePage");
  return <h1>{t("title")}</h1>;
}

// Client Component translation
"use client";
import { useTranslations } from "next-intl";

export function NavMenu() {
  // Client-side: translations shipped to the client bundle
  const t = useTranslations("Navigation");
  return <nav>{t("menu.home")}</nav>;
}`}</code>
      </pre>

      <h2 id="generateStaticParams-i18n">Pre-rendering All Locales</h2>
      <p>
        For static generation of all locale variants, export <code>generateStaticParams</code>{" "}
        from your <code>[lang]</code> layout or page. This tells Next.js to pre-render every locale
        at build time.
      </p>
      <pre>
        <code>{`// app/[lang]/layout.tsx
export function generateStaticParams() {
  // Return all locale variants — Next.js pre-renders each one
  return [{ lang: "en" }, { lang: "fr" }, { lang: "de" }, { lang: "es" }];
}

// For nested dynamic routes, combine params:
// app/[lang]/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetch("https://api.example.com/posts").then((r) => r.json());

  // Cross-product of all locales × all slugs
  const locales = ["en", "fr", "de", "es"];
  return locales.flatMap((lang) =>
    posts.map((post: { slug: string }) => ({ lang, slug: post.slug }))
  );
}

// hreflang for SEO — add to generateMetadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const supportedLocales = ["en", "fr", "de", "es"];

  return {
    alternates: {
      canonical: \`https://example.com/\${lang}/blog/\${slug}\`,
      languages: Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          \`https://example.com/\${locale}/blog/\${slug}\`,
        ])
      ),
    },
  };
}`}</code>
      </pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How would you add multi-language support to a Next.js App Router application?"
        intro="Walk through the full architecture. Interviewers expect you to know that App Router does not have built-in i18n and can describe the middleware + [lang] segment pattern."
        steps={[
          "Clarify: App Router does NOT support the i18n key in next.config. That was Pages Router only. App Router requires a manual implementation.",
          "Describe the three components: middleware for locale detection (Accept-Language header + cookie), a [lang] dynamic segment as the root of all routes, and a translation loading mechanism.",
          "Walk through the middleware: it intercepts every request, checks for an existing locale prefix, detects the preferred locale from cookie or Accept-Language header, and redirects to the locale-prefixed path.",
          "Describe the [lang] layout: receives the lang param, sets the html lang attribute, loads the translation dictionary server-side so translations are zero-cost in the client bundle.",
          "For the translation library: recommend next-intl for App Router projects. It supports Server Components natively, meaning translations do not add to the client bundle for server-rendered pages.",
          "For SEO: use generateStaticParams to pre-render all locale variants, and generateMetadata with alternates.languages to output hreflang link tags.",
        ]}
      />

      <InterviewChallenge
        title="Challenge: Design i18n for a Marketing Site"
        scenario={
          <span>
            You are building a marketing website for a SaaS product. Requirements:
            <br />
            <br />
            - 5 locales: English (default), French, German, Spanish, Portuguese
            <br />
            - All pages must be statically generated (SSG) — no server-side rendering
            <br />
            - SEO is critical — each locale page must be indexable by search engines with correct
            hreflang tags
            <br />
            - Users should be able to switch languages via a dropdown in the header
            <br />
            - The preference should persist across page reloads
          </span>
        }
        tasks={[
          "Which routing strategy do you choose (sub-path, domain, or cookie-based) and why?",
          "Describe the full implementation: what files do you create, what does the middleware do, how do you structure the [lang] segment?",
          "How do you implement the language switcher that persists the user's preference?",
          "How do you handle hreflang tags for SEO? Where does that code live?",
          "Which i18n library do you choose and why?",
        ]}
        pitfalls={[
          "Choosing cookie-based routing — search engines will get a random locale, breaking SEO. Sub-path is required.",
          "Forgetting to exclude _next/static and other static assets from the middleware matcher — causes 404s on CSS and JS files.",
          "Using a client-heavy i18n library that ships all translations to the browser — for a marketing site where server rendering is preferred, use next-intl with server-side translation loading.",
          "Not implementing generateStaticParams — without it, the [lang] routes are server-rendered on demand, not statically generated.",
        ]}
        signal="A strong answer chooses sub-path routing for SEO, uses next-intl with generateStaticParams for full SSG, stores language preference in a NEXT_LOCALE cookie (the convention next-intl uses), implements hreflang via generateMetadata alternates.languages, and explains why server-side translation loading avoids adding translations to the client bundle."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          App Router does NOT support the <code>i18n</code> key in <code>next.config</code>. That
          config option is Pages Router only and is silently ignored in App Router.
        </li>
        <li>
          The standard App Router i18n pattern: middleware detects locale → redirects/rewrites to{" "}
          <code>/[lang]/path</code> → <code>[lang]</code> segment receives locale via params.
        </li>
        <li>
          Middleware must exclude <code>_next/static</code>, <code>_next/image</code>, and static
          files from the matcher — otherwise every asset request goes through locale detection.
        </li>
        <li>
          <code>next-intl</code> is the most App Router-native i18n library. Server Component
          translations have zero client bundle cost.
        </li>
        <li>
          Use <code>generateStaticParams</code> in the <code>[lang]</code> layout to pre-render all
          locale variants at build time for SSG.
        </li>
        <li>
          <code>hreflang</code> alternate links go in <code>generateMetadata</code> under{" "}
          <code>alternates.languages</code>.
        </li>
        <li>
          Sub-path routing (<code>/en/about</code>, <code>/fr/about</code>) is the recommended
          strategy — it gives each locale a unique URL, which is required for search engine
          indexability.
        </li>
      </ul>
    </div>
  );
}
