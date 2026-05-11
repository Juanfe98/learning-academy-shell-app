import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "next-image", title: "next/image", level: 2 },
  { id: "next-font", title: "next/font", level: 2 },
  { id: "next-script", title: "next/script", level: 2 },
  { id: "streaming-suspense", title: "Streaming with Suspense", level: 2 },
  { id: "partial-prerendering", title: "Partial Prerendering (PPR)", level: 2 },
  { id: "dynamic-imports", title: "Dynamic Imports and Code Splitting", level: 2 },
  { id: "bundle-analysis", title: "Bundle Analysis", level: 2 },
  { id: "prefetching", title: "Prefetching and Link Optimization", level: 2 },
  { id: "performance-checklist", title: "Performance Checklist", level: 2 },
];

export default function NextjsPerformanceAndOptimization() {
  return (
    <div className="article-content">
      <p>
        Next.js ships several built-in optimization primitives that, when used correctly, handle
        most common performance concerns automatically. The trick is knowing what each one does,
        what it does not do, and when the defaults need overriding.
      </p>

      <h2 id="next-image">next/image</h2>
      <p>
        The <code>Image</code> component from <code>next/image</code> replaces raw{" "}
        <code>&lt;img&gt;</code> tags. It automatically serves the right format (WebP/AVIF),
        the right size for the device, lazy loads by default, and prevents layout shift by
        reserving space.
      </p>

      <pre><code>{`import Image from "next/image";

// Static import — width/height inferred at build time, best for LCP images
import heroImage from "@/public/hero.jpg";

export function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Hero image description"
      priority  // ← load eagerly — use for above-the-fold images (LCP)
    />
  );
}

// Remote image — must declare the domain in next.config.ts
export function Avatar({ url }: { url: string }) {
  return (
    <Image
      src={url}
      alt="User avatar"
      width={48}
      height={48}
      className="rounded-full"
    />
  );
}

// Fill mode — image fills its container (use for responsive backgrounds)
export function CoverImage({ url }: { url: string }) {
  return (
    <div className="relative h-64 w-full">
      <Image
        src={url}
        alt="Cover"
        fill
        className="object-cover"
        sizes="100vw"  // ← hint to browser about rendered size — critical for performance
      />
    </div>
  );
}

// next.config.ts — allow remote image domains
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
        pathname: "/uploads/**",
      },
    ],
  },
};`}</code></pre>

      <p>
        <strong>The <code>sizes</code> prop is critically important</strong> for remote and fill
        images. It tells the browser the rendered size of the image across breakpoints so it
        downloads the correct resolution. Missing <code>sizes</code> means the browser downloads
        a much larger image than needed.
      </p>

      <pre><code>{`// sizes tells the browser: at different viewport widths, how wide is this image rendered?
<Image
  src={product.image}
  alt={product.name}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  // Read as:
  // - below 768px screen: image is 100% of viewport width
  // - 768–1200px: image is 50% of viewport width
  // - above 1200px: image is 33% of viewport width
  // Browser picks the closest srcset entry to avoid downloading too-large images
/>`}</code></pre>

      <h2 id="next-font">next/font</h2>
      <p>
        <code>next/font</code> downloads fonts at build time, hosts them on your domain, and
        automatically applies <code>font-display: swap</code> and the correct preload hints.
        Zero external network requests for fonts — better privacy and performance.
      </p>

      <pre><code>{`// src/app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // CSS variable — use in globals.css
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

// Local font (no Google Fonts network request at all)
const customFont = localFont({
  src: "./fonts/MyFont.woff2",
  variable: "--font-custom",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Apply the CSS variables to the html element
    <html lang="en" className={\`\${inter.variable} \${jetbrainsMono.variable}\`}>
      <body>{children}</body>
    </html>
  );
}

// In globals.css (Tailwind v4 pattern):
// @theme inline {
//   --font-sans: var(--font-inter), system-ui, sans-serif;
//   --font-mono: var(--font-jetbrains-mono), monospace;
// }`}</code></pre>

      <h2 id="next-script">next/script</h2>
      <p>
        <code>next/script</code> controls when third-party scripts load relative to the page's
        lifecycle. Never use raw <code>&lt;script&gt;</code> tags in App Router — use this instead.
      </p>

      <ArticleTable caption="Script loading strategies — choose based on the script's impact on UX." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>When it loads</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>beforeInteractive</code></td>
              <td>Before the page becomes interactive (blocks hydration)</td>
              <td>Critical scripts that must run before React (consent managers)</td>
            </tr>
            <tr>
              <td><code>afterInteractive</code> (default)</td>
              <td>After the page becomes interactive</td>
              <td>Tag managers, analytics (Google Analytics, Segment)</td>
            </tr>
            <tr>
              <td><code>lazyOnload</code></td>
              <td>During browser idle time</td>
              <td>Non-critical scripts (chat widgets, social share buttons)</td>
            </tr>
            <tr>
              <td><code>worker</code></td>
              <td>In a Web Worker (experimental)</td>
              <td>Offloading heavy third-party scripts from the main thread</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`import Script from "next/script";

// In layout.tsx or page.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://analytics.example.com/tracker.js"
        strategy="afterInteractive"
      />
      <Script
        id="analytics-init" // id required for inline scripts
        strategy="afterInteractive"
      >
        {\`
          window.analytics = window.analytics || {};
          window.analytics.page();
        \`}
      </Script>
      {children}
    </>
  );
}`}</code></pre>

      <h2 id="streaming-suspense">Streaming with Suspense</h2>
      <p>
        Streaming sends HTML to the browser progressively as Server Components resolve.
        Suspense boundaries mark "here, show a fallback while I load, then replace it."
        This means users see meaningful content faster — the page shell arrives first,
        then slower data streams in.
      </p>

      <pre><code>{`// Streaming pattern: fast shell + slow data sections
// src/app/dashboard/page.tsx

import { Suspense } from "react";

export default async function DashboardPage() {
  return (
    <div>
      {/* This renders immediately — no async work */}
      <DashboardHeader />

      {/* Each Suspense boundary independently streams */}
      <Suspense fallback={<MetricsSkeleton />}>
        <SlowMetrics />  {/* Takes 2s to fetch */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Takes 1s to fetch */}
      </Suspense>

      {/* Without Suspense, the entire page would wait for the slowest component */}
    </div>
  );
}

// SlowMetrics fetches its own data — it's what causes the Suspense fallback
async function SlowMetrics() {
  const metrics = await fetch("/api/metrics", { cache: "no-store" })
    .then(r => r.json());
  // ... this resolves after ~2s, then streams the HTML to the client
  return <MetricsGrid metrics={metrics} />;
}

// loading.tsx is syntactic sugar for wrapping the entire page in a Suspense boundary:
// src/app/dashboard/loading.tsx
export default function Loading() {
  return <PageSkeleton />;
}
// Equivalent to: <Suspense fallback={<PageSkeleton />}>{page}</Suspense>`}</code></pre>

      <h2 id="partial-prerendering">Partial Prerendering (PPR)</h2>
      <p>
        PPR (experimental in Next.js 14, stable in Next.js 15) combines static and dynamic
        rendering in a single route. The static shell (everything outside Suspense boundaries)
        is generated at build time. The dynamic holes (inside Suspense boundaries) are
        streamed at request time.
      </p>

      <pre><code>{`// Enable PPR in next.config.ts (Next.js 15):
const nextConfig = {
  experimental: {
    ppr: true, // "incremental" for per-route opt-in, true for all routes
  },
};

// With PPR enabled, this page has a static outer shell and dynamic inner content:
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* STATIC: rendered at build time, served from CDN instantly */}
      <ProductShell />
      <StaticProductDetails />

      {/* DYNAMIC: streamed at request time (reads cookies, user-specific) */}
      <Suspense fallback={<PricingSkeleton />}>
        <PersonalizedPricing productId={params.id} />
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <UserSpecificReviews productId={params.id} />
      </Suspense>
    </div>
  );
}

// PPR gives you the best of both worlds:
// - Time To First Byte (TTFB) of a static page (CDN, no server wait)
// - Personalized dynamic content streamed in progressively`}</code></pre>

      <h2 id="dynamic-imports">Dynamic Imports and Code Splitting</h2>
      <p>
        Next.js code-splits at the route level automatically. Use <code>next/dynamic</code>
        (or React's <code>lazy</code>) for component-level splitting — useful for heavy
        components that are not always rendered.
      </p>

      <pre><code>{`import dynamic from "next/dynamic";

// Load a heavy component only when needed
const HeavyEditor = dynamic(() => import("@/components/HeavyEditor"), {
  loading: () => <p>Loading editor...</p>,
  ssr: false, // don't render on server (for components that require window)
});

// With React.lazy (preferred in App Router since you can use Suspense directly):
import { lazy, Suspense } from "react";

const Chart = lazy(() => import("@/components/Chart"));

export function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart data={data} />
    </Suspense>
  );
}

// Important: dynamic() with ssr: false is still the way to prevent SSR
// for browser-only components (React.lazy always SSRs)
const BrowserOnlyMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
});`}</code></pre>

      <h2 id="bundle-analysis">Bundle Analysis</h2>
      <p>
        Analyze your bundle to find large dependencies and reduce JavaScript sent to the client.
      </p>

      <pre><code>{`// Install the bundle analyzer
// pnpm add @next/bundle-analyzer

// next.config.ts
import type { NextConfig } from "next";
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // your config
};

export default withBundleAnalyzer(nextConfig);

// Run analysis:
// ANALYZE=true pnpm build

// Things to look for in the bundle:
// 1. Large node_modules in client chunks (lodash, moment, faker) — replace with smaller libs
// 2. Server-only modules accidentally bundled in client (db, fs) — add "server-only" package
// 3. Duplicated code across chunks — Next.js handles this, but watch for version mismatches

// Mark a module as server-only to prevent it from being imported in Client Components:
// src/lib/db.ts
import "server-only"; // throws a build-time error if imported in a Client Component
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient();`}</code></pre>

      <h2 id="prefetching">Prefetching and Link Optimization</h2>
      <p>
        Next.js <code>Link</code> prefetches routes as they appear in the viewport, so navigation
        feels instant. Understanding the defaults and when to override them avoids unnecessary
        data transfer.
      </p>

      <pre><code>{`import Link from "next/link";

// Default: prefetch is true for static routes, false for dynamic routes
<Link href="/about">About</Link>

// Disable prefetching for pages behind auth or rarely visited
<Link href="/expensive-report" prefetch={false}>
  Download Report
</Link>

// Force prefetch even for dynamic routes
<Link href="/dashboard" prefetch={true}>
  Dashboard
</Link>

// Programmatic navigation — does NOT prefetch by default
"use client";
import { useRouter } from "next/navigation";

export function LoginButton() {
  const router = useRouter();

  // Programmatically prefetch a route
  const handleHover = () => router.prefetch("/dashboard");

  return (
    <button onMouseEnter={handleHover} onClick={() => router.push("/dashboard")}>
      Go to Dashboard
    </button>
  );
}`}</code></pre>

      <h2 id="performance-checklist">Performance Checklist</h2>
      <ul>
        <li>
          <strong>Images:</strong> Use <code>next/image</code> with correct <code>sizes</code>
          prop. Add <code>priority</code> to LCP images. Use <code>fill</code> with a positioned
          parent for responsive images.
        </li>
        <li>
          <strong>Fonts:</strong> Use <code>next/font</code> — eliminates font-related layout
          shift and external network requests.
        </li>
        <li>
          <strong>Scripts:</strong> Use <code>next/script</code> with{" "}
          <code>strategy="afterInteractive"</code> or <code>"lazyOnload"</code> for analytics
          and marketing scripts.
        </li>
        <li>
          <strong>Streaming:</strong> Wrap slow Server Components in Suspense. The page shell
          renders immediately; data streams in progressively.
        </li>
        <li>
          <strong>Bundle size:</strong> Audit with <code>@next/bundle-analyzer</code>. Keep
          server-only code out of client bundles with the <code>server-only</code> package.
        </li>
        <li>
          <strong>Dynamic imports:</strong> Use <code>dynamic()</code> with <code>ssr: false</code>
          for browser-only heavy components. Use <code>React.lazy</code> + Suspense for
          conditional heavy components.
        </li>
        <li>
          <strong>Prefetch:</strong> Disable prefetch for rare/auth-required routes.
          Keep it enabled (default) for main navigation links.
        </li>
      </ul>
    </div>
  );
}
