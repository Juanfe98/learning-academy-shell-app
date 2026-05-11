import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestPipelineDiagram = String.raw`flowchart TD
  REQ["Incoming Request"]
  REQ --> REDIR["redirects()\nPermanent 308 / Temporary 307"]
  REDIR -->|"match"| BROWSER_REDIRECT["Browser follows new URL\n(URL changes in browser)"]
  REDIR -->|"no match"| BEFORE["beforeFiles rewrites\nURL stays, different content served"]
  BEFORE -->|"match"| SERVE_BEFORE["Serve matched route\nor proxy to external URL"]
  BEFORE -->|"no match"| STATIC["Static files\n(public/ directory, _next/static)"]
  STATIC -->|"match"| SERVE_STATIC["Serve static file from disk"]
  STATIC -->|"no match"| AFTER["afterFiles rewrites\nRuns after file check"]
  AFTER -->|"match"| SERVE_AFTER["Serve matched Next.js route\nor proxy"]
  AFTER -->|"no match"| PAGES["Next.js pages & App Router\nDynamic rendering"]
  PAGES -->|"match"| RENDER["Render page / Route Handler"]
  PAGES -->|"no match"| FALLBACK["fallback rewrites\nLast resort — proxy to catch-all"]
  FALLBACK -->|"no match"| FOUR04["404 response"]`;

const fullPipelineDiagram = String.raw`flowchart LR
  HDR["headers()\nApplied to outgoing\nresponse headers"]
  REDIR2["redirects()\nBefore app code —\nshort-circuits the request"]
  REWRITE["rewrites()\nbeforeFiles / afterFiles\n/ fallback phases"]
  MW["Middleware\n(matcher-based)"]
  APP["App Router\nPage / Layout\n/ Route Handler"]
  IMG["next/image\nimages config\nremotePatterns + formats"]
  WP["webpack()\nCustom loaders\nresolve aliases\nbundle plugins"]

  HDR -->|"wraps response"| REDIR2
  REDIR2 --> REWRITE
  REWRITE --> MW
  MW --> APP
  APP --> IMG
  APP --> WP`;

export const toc: TocItem[] = [
  { id: "config-mental-model", title: "Mental Model: next.config.ts as Infrastructure Layer", level: 2 },
  { id: "redirects", title: "redirects() — Permanent and Temporary", level: 2 },
  { id: "rewrites", title: "rewrites() — Invisible Routing and API Proxying", level: 2 },
  { id: "headers", title: "headers() — Security Headers and CORS", level: 2 },
  { id: "images-config", title: "Image Optimization Config", level: 2 },
  { id: "webpack-customization", title: "webpack() — Custom Build Pipeline", level: 2 },
  { id: "experimental-flags", title: "Experimental Flags Worth Knowing", level: 2 },
  { id: "request-pipeline", title: "Full Request Pipeline", level: 2 },
  { id: "config-comparison-table", title: "Config Features at a Glance", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Challenge: Legacy Site Migration", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function NextjsConfigDeepDive() {
  return (
    <div className="article-content">
      <p>
        Most engineers treat <code>next.config.ts</code> as a checkbox file — drop in an image
        domain, move on. That is a missed opportunity. The config file is the{" "}
        <strong>infrastructure layer of your Next.js app</strong>: it runs before your application
        code, at the server level, and controls everything from request routing to security posture
        to the Webpack build pipeline. Understanding it deeply is what separates engineers who
        configure Next.js from engineers who architect it.
      </p>
      <p>
        The file is evaluated twice: once at <strong>build time</strong> (for static analysis and
        asset optimization) and once on <strong>server startup</strong> (for runtime routing and
        header injection). Nothing in <code>next.config.ts</code> runs on a per-request basis —
        that is what Middleware is for. This distinction matters when you reach for the wrong tool.
      </p>

      <h2 id="config-mental-model">Mental Model: next.config.ts as Infrastructure Layer</h2>
      <p>
        Think of <code>next.config.ts</code> in three buckets:
      </p>
      <ul>
        <li>
          <strong>Request routing</strong> — <code>redirects()</code> and <code>rewrites()</code>{" "}
          intercept requests before your app code sees them. They are evaluated in a fixed order you
          must understand to avoid surprises.
        </li>
        <li>
          <strong>Response shaping</strong> — <code>headers()</code> adds HTTP headers to every
          matched response. The right place for CSP, HSTS, CORS, and cache directives that apply
          globally.
        </li>
        <li>
          <strong>Build pipeline</strong> — <code>webpack()</code>, <code>transpilePackages</code>,
          and <code>experimental</code> flags control how code is compiled, bundled, and optimized.
          Mistakes here cause subtle runtime errors that only appear after deployment.
        </li>
      </ul>

      <pre>
        <code>{`// next.config.ts — evaluated at build time and server startup, NOT per-request
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Each of these async functions runs when the server starts up.
  // Return values are compiled into route manifests — zero per-request overhead.
  async redirects() { return [...]; },
  async rewrites()  { return [...]; },
  async headers()   { return [...]; },

  // Static config — read at build time
  images: { remotePatterns: [...] },
  experimental: { ppr: true },

  // webpack receives the compiled config — can inspect/mutate it
  webpack(config, { isServer }) { return config; },
};

export default nextConfig;`}</code>
      </pre>

      <h2 id="redirects">redirects() — Permanent and Temporary</h2>
      <p>
        Redirects tell the browser to navigate to a different URL. The original URL is{" "}
        <strong>replaced</strong> in the browser — the user sees the new address. They run{" "}
        <em>before Middleware, before your app code, before static files</em>. A redirect match
        short-circuits the entire request pipeline.
      </p>

      <pre>
        <code>{`// next.config.ts
async redirects() {
  return [
    // 308 Permanent: tells browsers and search engines to update their records.
    // Google transfers link equity. Use when you are sure the old URL is gone forever.
    {
      source: "/blog/:slug",
      destination: "/posts/:slug",
      permanent: true,        // → 308 Permanent Redirect
    },

    // 307 Temporary: browsers don't cache it, search engines keep both URLs.
    // Use during A/B tests, feature flags, or maintenance windows.
    {
      source: "/checkout",
      destination: "/maintenance",
      permanent: false,       // → 307 Temporary Redirect
    },

    // Wildcard: :path* matches zero or more path segments
    // Old /docs/v1/anything → /docs/latest/anything
    {
      source: "/docs/v1/:path*",
      destination: "/docs/latest/:path*",
      permanent: true,
    },

    // Regex matching: only redirect /products with a numeric ID
    {
      source: "/products/:id(\\\\d+)",
      destination: "/shop/item/:id",
      permanent: true,
    },
  ];
},`}</code>
      </pre>

      <p>
        The most common mistake: using <code>permanent: true</code> while you are still iterating
        on URLs. Permanent redirects are <strong>cached aggressively by browsers and CDNs</strong>.
        If you later need to change the destination, users with a cached 308 will not see the update
        until they manually clear cache or the cache expires. Use <code>permanent: false</code>{" "}
        until you are 100% certain the destination URL is final.
      </p>

      <h2 id="rewrites">rewrites() — Invisible Routing and API Proxying</h2>
      <p>
        Rewrites are the feature most engineers underuse. The browser URL stays the same, but the
        server routes the request somewhere else — another Next.js route, or an entirely external
        service. The user never knows. This is the correct way to{" "}
        <strong>proxy external APIs without exposing credentials to the client</strong>.
      </p>

      <pre>
        <code>{`// next.config.ts
async rewrites() {
  return {
    // beforeFiles: checked before Next.js looks for static files or pages.
    // Use when you want to "override" a static file or intercept a route
    // before the filesystem check happens.
    beforeFiles: [
      {
        source: "/health",
        destination: "/api/health", // route to a Route Handler
      },
    ],

    // afterFiles: checked after static files but before dynamic pages.
    // Most common — proxying external APIs, SPA fallbacks, etc.
    afterFiles: [
      // Proxy /api/weather/:city to an external service.
      // The API key stays on the server — the client only calls /api/weather/london.
      {
        source: "/api/weather/:city",
        destination: "https://api.openweathermap.org/data/2.5/weather?q=:city&appid=" + process.env.WEATHER_API_KEY,
      },

      // Proxy a legacy REST API during incremental migration.
      // New endpoints serve from Next.js; old ones still hit the legacy service.
      {
        source: "/api/legacy/:path*",
        destination: "https://legacy-api.internal.company.com/:path*",
      },
    ],

    // fallback: last resort — only checked if nothing else matches.
    // Useful as a catch-all to a microservice or an old app during migration.
    fallback: [
      {
        source: "/:path*",
        destination: "https://old-site.company.com/:path*",
      },
    ],
  };
},`}</code>
      </pre>

      <MermaidDiagram
        chart={requestPipelineDiagram}
        title="Request Routing Pipeline — redirects, rewrites, static files, pages"
        caption="Redirects fire first and change the browser URL. Rewrites are invisible — the URL stays the same but the server routes differently. Static files are checked between beforeFiles and afterFiles rewrites."
        minHeight={580}
      />

      <p>
        The most important insight from this diagram: <code>beforeFiles</code> rewrites can shadow
        static files. If you add a <code>beforeFiles</code> rewrite for <code>/logo.png</code>, it
        will intercept requests before Next.js serves the file from <code>public/logo.png</code>.
        That is almost never what you want — use <code>afterFiles</code> unless you explicitly need
        to override a static file.
      </p>

      <h2 id="headers">headers() — Security Headers and CORS</h2>
      <p>
        The <code>headers()</code> function adds HTTP response headers to matched paths. It does not
        change routing — it wraps whatever the normal response would have been. This is the right
        place for the security headers that every production Next.js app should have.
      </p>

      <pre>
        <code>{`// next.config.ts — production-ready security headers
async headers() {
  return [
    {
      // Apply to all routes
      source: "/(.*)",
      headers: [
        // Prevent the page from being loaded in an iframe (clickjacking protection)
        { key: "X-Frame-Options", value: "DENY" },

        // Prevent MIME-type sniffing — browsers must respect Content-Type
        { key: "X-Content-Type-Options", value: "nosniff" },

        // Force HTTPS for 2 years, include subdomains
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },

        // Restrict what resources the page can load (adjust for your app)
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // adjust based on your scripts
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://images.example.com",
            "font-src 'self'",
            "connect-src 'self' https://api.example.com",
            "frame-ancestors 'none'",
          ].join("; "),
        },

        // Prevent referrer leakage to external sites
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

        // Restrict browser feature access
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },

    // CORS headers for API routes — allow calls from a known frontend domain
    {
      source: "/api/(.*)",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "https://app.example.com" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
      ],
    },

    // Override cache for specific marketing pages — force CDN to hold for 1 hour
    {
      source: "/landing/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
      ],
    },
  ];
},`}</code>
      </pre>

      <p>
        One gotcha: <code>headers()</code> does not override headers set by Route Handlers or
        Server Components using the <code>headers()</code> Next.js function. If both set the same
        header, the one closer to the response wins. Use <code>next.config.ts</code> headers for
        cross-cutting security concerns; use in-code headers for route-specific behavior.
      </p>

      <h2 id="images-config">Image Optimization Config</h2>
      <p>
        The <code>images</code> config controls how <code>next/image</code> optimizes and serves
        images. The most critical piece is the <strong>security whitelist</strong> for external
        image sources — without it, someone could trigger image optimization for any URL on the
        internet through your server.
      </p>

      <pre>
        <code>{`// next.config.ts
images: {
  // remotePatterns replaces the deprecated "domains" array.
  // More granular: you can restrict by hostname, path prefix, and port.
  remotePatterns: [
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      // pathname: "/photo/**", // optional — restrict to a path prefix
    },
    {
      protocol: "https",
      hostname: "**.cloudinary.com", // ** matches any subdomain
    },
    {
      protocol: "https",
      hostname: "cdn.shopify.com",
      pathname: "/s/files/**",
    },
  ],

  // Prefer AVIF (best compression), fall back to WebP.
  // Next.js sends the best format the browser supports via Accept header.
  formats: ["image/avif", "image/webp"],

  // Responsive size steps — Next.js picks the smallest size >= the rendered width
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

  // Custom loader for non-Vercel deployments
  // loader: "custom",
  // loaderFile: "./src/lib/cloudflare-image-loader.ts",
  //
  // The loader file receives { src, width, quality } and returns a URL string:
  // export default function cloudflareLoader({ src, width, quality }) {
  //   return \`https://imagedelivery.net/YOUR_ACCOUNT_ID/\${src}/w=\${width},q=\${quality ?? 75}\`;
  // }
},`}</code>
      </pre>

      <p>
        If you forget to add a hostname to <code>remotePatterns</code>, Next.js returns a 400 error
        at runtime when it tries to serve the image — not a build error. You will catch it in
        development but it is easy to miss during staging if that image path is not exercised.
        Always add new image domains before deploying.
      </p>

      <h2 id="webpack-customization">webpack() — Custom Build Pipeline</h2>
      <p>
        Next.js gives you an escape hatch into the Webpack configuration. The need arises most
        often for three things: SVG imports as React components, resolving native binary files,
        and adding path aliases beyond what <code>tsconfig.json</code> provides. The{" "}
        <code>isServer</code> flag lets you apply config selectively.
      </p>

      <pre>
        <code>{`// next.config.ts
webpack(config, { isServer }) {
  // 1. Import SVGs as React components via @svgr/webpack
  //    <import Logo from "./logo.svg"> → renders as <svg>...</svg>
  config.module.rules.push({
    test: /\\.svg$/,
    use: [
      {
        loader: "@svgr/webpack",
        options: {
          svgo: true,                     // optimize SVG nodes
          titleProp: true,                // adds title prop for accessibility
          svgoConfig: {
            plugins: [{ name: "removeViewBox", active: false }],
          },
        },
      },
    ],
  });

  // 2. Suppress webpack warnings for optional native modules (e.g. bcrypt, sharp)
  //    that try to require native .node binaries
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,          // fs module not available in browser
      net: false,
      tls: false,
    };
  }

  // 3. Add a path alias that maps @icons/* to a specific directory
  //    (supplement tsconfig paths — Webpack needs its own alias config)
  config.resolve.alias = {
    ...config.resolve.alias,
    "@icons": path.resolve(__dirname, "src/assets/icons"),
  };

  // CRITICAL: always return the mutated config
  return config;
},`}</code>
      </pre>

      <p>
        The most common mistake is forgetting to <code>return config</code>. Without the return,{" "}
        <code>webpack()</code> returns <code>undefined</code> and the entire build configuration is
        silently discarded — you get a broken build with a confusing error trace. Always return.
      </p>
      <p>
        Prefer <code>transpilePackages</code> over <code>webpack()</code> for ESM-only packages that
        need to be compiled for the browser bundle. <code>transpilePackages</code> is the right
        abstraction; manual Webpack rules are for things it cannot handle.
      </p>

      <h2 id="experimental-flags">Experimental Flags Worth Knowing</h2>
      <p>
        The <code>experimental</code> object is Next.js's staging area for features that are close
        to stable. Some of these will become defaults in future major versions. Know the ones that
        matter for production performance.
      </p>

      <pre>
        <code>{`// next.config.ts
experimental: {
  // Partial Prerendering — renders static shell at build time,
  // streams dynamic content at request time (best of SSG + SSR).
  // "incremental" lets you opt pages in individually via the "experimental_ppr" export.
  ppr: "incremental",

  // Type-safe routing — Link href, router.push(), redirect() are all
  // checked at build time against your actual route files. Catches typos immediately.
  typedRoutes: true,

  // Prevent Server Component code from being accidentally imported by Client Components.
  // Works with the "server-only" package — throws a build error on violation.
  // This is opt-in but should be enabled for any app with sensitive server logic.
  // (available in Next.js 14+)

  // React Compiler — automatically memoizes components and hooks.
  // Eliminates manual useMemo/useCallback in most cases. Next.js 15+ only.
  reactCompiler: true,

  // Mark packages that should NOT be bundled into the server bundle.
  // Necessary for packages with native bindings (Prisma, better-sqlite3, sharp).
  // In Next.js 13/14 this was serverComponentsExternalPackages.
  // Renamed to serverExternalPackages in Next.js 15.
  serverExternalPackages: ["prisma", "@prisma/client", "sharp"],
},`}</code>
      </pre>

      <p>
        Treat <code>experimental</code> flags as a semantic contract: the API may change in a minor
        version. Pin your Next.js version in <code>package.json</code> when adopting experimental
        flags, and read the release notes before upgrading. The rename from{" "}
        <code>serverComponentsExternalPackages</code> to <code>serverExternalPackages</code> in
        Next.js 15 is a real example — it silently stopped working in many apps after a minor
        upgrade.
      </p>

      <h2 id="request-pipeline">Full Request Pipeline</h2>
      <p>
        This is where all the config pieces connect. Understanding the order of evaluation tells you
        exactly which feature to reach for when debugging a routing or header problem.
      </p>

      <MermaidDiagram
        chart={fullPipelineDiagram}
        title="Full next.config.ts Intercept Points in the Request Pipeline"
        caption="headers() wraps the response at the outermost layer. redirects() fires before rewrites(). Middleware runs after rewrites, before the App Router. Images and Webpack are build-time concerns, not request-time."
        minHeight={320}
      />

      <p>
        The key architectural rule: if you need to intercept a request <em>based on runtime
        data</em> (cookies, geolocation, A/B test buckets), that belongs in <strong>Middleware</strong>,
        not in <code>next.config.ts</code>. Config-level routing is static — it cannot read
        cookies or call databases. Middleware is dynamic — it runs on every request and has full
        access to the request object.
      </p>

      <h2 id="config-comparison-table">Config Features at a Glance</h2>
      <ArticleTable
        caption="Pick the right next.config.ts feature for your use case. Getting this wrong adds unnecessary complexity."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>What it does</th>
              <th>Runs at</th>
              <th>Common use case</th>
              <th>Common mistake</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>redirects()</code></td>
              <td>Sends browser to a new URL (308/307)</td>
              <td>Server startup, per request</td>
              <td>Old URL → new URL after restructure</td>
              <td>Using <code>permanent: true</code> before URLs are finalized</td>
            </tr>
            <tr>
              <td><code>rewrites()</code></td>
              <td>Serves different content without changing browser URL</td>
              <td>Server startup, per request</td>
              <td>Proxy external API to hide credentials</td>
              <td>Using <code>beforeFiles</code> and accidentally shadowing static files</td>
            </tr>
            <tr>
              <td><code>headers()</code></td>
              <td>Adds HTTP headers to outgoing responses</td>
              <td>Server startup, per request</td>
              <td>CSP, HSTS, CORS, Cache-Control</td>
              <td>Forgetting headers don't override Route Handler headers</td>
            </tr>
            <tr>
              <td><code>images</code></td>
              <td>Config for <code>next/image</code> optimization</td>
              <td>Build time + per-request optimization</td>
              <td>Whitelisting external image hosts</td>
              <td>Forgetting to add a domain — causes silent 400 at runtime</td>
            </tr>
            <tr>
              <td><code>webpack()</code></td>
              <td>Mutate the Webpack config directly</td>
              <td>Build time only</td>
              <td>SVG-as-React-component via SVGR</td>
              <td>Forgetting to <code>return config</code> — silently breaks build</td>
            </tr>
            <tr>
              <td><code>experimental</code></td>
              <td>Opt into unstable features</td>
              <td>Build time + runtime depending on flag</td>
              <td>PPR, typedRoutes, React Compiler</td>
              <td>Not pinning Next.js version — API changes on minor bumps</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How would you proxy an external API through Next.js without exposing credentials to the browser?"
        intro="A strong answer names the exact mechanism, explains why it works at a security level, and calls out the alternative (Route Handler) with its tradeoffs."
        steps={[
          "Start with the threat model: API keys in client-side code appear in browser DevTools, are scraped from bundles, and exposed in git history. A rewrite puts the key on the server where it belongs.",
          "Explain rewrites(): add a rewrite in next.config.ts that maps /api/weather/:city to the external URL with the key embedded as process.env.WEATHER_API_KEY. The browser only ever calls /api/weather/london — it never sees the key.",
          "Name the alternative: a Route Handler at /api/weather/[city]/route.ts does the same thing with more control (request validation, error handling, response transformation) but adds cold-start latency. For simple pass-through, a rewrite is zero-overhead.",
          "Mention the rewrite limit: rewrites can't read cookies or session data, so they can't do per-user auth. If the external API needs a per-user token, a Route Handler is the right tool.",
          "Close with the production gotcha: the rewrite destination includes the env var at startup time. If the key rotates, a full restart (or redeployment) is required — rewrites are not re-evaluated per-request.",
        ]}
      />

      <InterviewPlaybook
        title="What's the difference between next.config.ts redirects and Middleware redirects?"
        intro="This question probes whether you understand the static vs dynamic boundary. Many engineers default to Middleware for everything — a strong answer explains when each layer is correct."
        steps={[
          "Config redirects are static: the source/destination mapping is fixed at server startup. They cannot read cookies, query params at runtime, or call any external service. They are compiled into a route manifest and matched with zero per-request logic.",
          "Middleware redirects are dynamic: Middleware runs on every request and has full access to the request object — cookies, headers, geolocation, A/B test buckets. You can redirect /dashboard to /login if the auth cookie is missing, or send users to a region-specific URL.",
          "Performance tradeoff: config redirects have essentially zero cost — matched in a manifest lookup before your code runs. Middleware adds latency on every request, even ones that don't redirect. Overusing Middleware for simple static redirects is a common performance regression.",
          "The practical rule: use config redirects for structural URL changes (old site migrations, slug renames, removing route prefixes). Use Middleware redirects for access control, personalization, and anything that requires reading request state.",
          "Close with the gotcha: Middleware runs after config-level rewrites. So a rewrite can transform the URL before Middleware sees it. A config redirect fires before Middleware entirely. Mixing both without understanding this ordering causes hard-to-debug routing bugs.",
        ]}
      />

      <h2 id="interview-challenge">Challenge: Legacy Site Migration</h2>
      <InterviewChallenge
        title="Legacy Site Migration Config"
        scenario={
          <>
            Your company is migrating a legacy marketing site to Next.js. The old site used these
            URL patterns, which must not return 404 for SEO and bookmarks:
            <br /><br />
            <ul>
              <li><code>/about-us</code> → <code>/about</code> (permanent)</li>
              <li><code>/blog/[year]/[month]/[slug]</code> → <code>/posts/[slug]</code> (permanent)</li>
              <li><code>/products/widget-:id</code> → <code>/shop/[id]</code> (permanent)</li>
            </ul>
            Additionally, the new site must proxy weather data from{" "}
            <code>https://api.openweathermap.org</code> via <code>/api/weather/:city</code>{" "}
            without exposing the API key, and all responses must include production security headers
            (X-Frame-Options, Strict-Transport-Security, Content-Security-Policy).
          </>
        }
        tasks={[
          "Write the complete next.config.ts with all three redirects using correct source/destination syntax.",
          "Add the weather API rewrite using the afterFiles phase, consuming the key from process.env.",
          "Add the three non-negotiable security headers to all routes.",
          "Explain: why use permanent: true for these redirects, and what risk does that introduce?",
        ]}
      />
      <SolutionReveal>
        <pre>
          <code>{`// next.config.ts — complete solution
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Simple page rename — 308 tells Google to transfer link equity
      {
        source: "/about-us",
        destination: "/about",
        permanent: true,
      },

      // Dated blog URL → flat slug URL
      // :year, :month, :slug are named capture groups — all three are required to match
      {
        source: "/blog/:year/:month/:slug",
        destination: "/posts/:slug",
        permanent: true,
      },

      // Regex capture: widget-:id where :id must be one or more word chars
      // The \\\\w+ syntax: \\ escapes the backslash in the template literal,
      // then \\w is the regex word-character class
      {
        source: "/products/widget-:id(\\\\w+)",
        destination: "/shop/:id",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return {
      afterFiles: [
        // Proxy to OpenWeatherMap. API key stays on the server.
        // The client calls /api/weather/london — never sees the key.
        {
          source: "/api/weather/:city",
          destination:
            "https://api.openweathermap.org/data/2.5/weather?q=:city&units=metric&appid=" +
            process.env.WEATHER_API_KEY,
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Why permanent: true?
// These are structural renames — the old URLs are gone permanently.
// permanent: true (308) tells Google to pass link equity to the new URL
// and update its index. Browsers cache the redirect, reducing future latency.

// The risk:
// Once a browser caches a 308, it won't re-check — even if you later change
// the destination. If you need to point /about to /company in 3 months,
// users with a cached 308 from /about-us will land on /about, not /company.
// Mitigation: the redirect chain is now two hops. Plan your URL structure
// before going permanent, and never use permanent: true for anything you
// might need to redirect again.`}</code>
        </pre>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>next.config.ts is infrastructure, not app code.</strong> It runs at build time and
          server startup, not per-request. Reach for Middleware when you need runtime request data.
        </li>
        <li>
          <strong>The pipeline order is non-negotiable:</strong> redirects → beforeFiles rewrites →
          static files → afterFiles rewrites → Next.js pages → fallback rewrites. Misunderstanding
          this order is the source of 80% of routing surprises.
        </li>
        <li>
          <strong>Rewrites are your zero-cost API proxy.</strong> Proxying external APIs through
          rewrites keeps credentials server-side and adds no cold-start overhead. Route Handlers
          are the right choice when you need request transformation or per-user auth.
        </li>
        <li>
          <strong>Security headers belong in next.config.ts</strong>, not in individual Route
          Handlers. Applying them globally ensures every response — including static files — gets
          the correct posture. At minimum: X-Frame-Options, X-Content-Type-Options, HSTS, and CSP.
        </li>
        <li>
          <strong>Always return config from webpack().</strong> Forgetting to return the mutated
          config object discards the entire Webpack configuration silently — you get a broken build
          with a misleading error. This is the single most common <code>webpack()</code> bug.
        </li>
      </ul>
    </div>
  );
}
