import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "vercel-model", title: "The Vercel Deployment Model", level: 2 },
  { id: "runtimes", title: "Edge Runtime vs Node.js Runtime", level: 2 },
  { id: "runtime-comparison", title: "Runtime Comparison", level: 3 },
  { id: "env-vars", title: "Environment Variables", level: 2 },
  { id: "env-security", title: "Server-Only vs Public Variables", level: 3 },
  { id: "next-config", title: "next.config.ts Key Options", level: 2 },
  { id: "isr", title: "ISR — Incremental Static Regeneration", level: 2 },
  { id: "output-modes", title: "Output Modes", level: 2 },
  { id: "standalone", title: "standalone Output", level: 3 },
  { id: "export", title: "static export", level: 3 },
  { id: "deployment-checklist", title: "Deployment Checklist", level: 2 },
];

export default function DeploymentAndEdge() {
  return (
    <div className="article-content">
      <p>
        Deployment in Next.js is more nuanced than most frameworks because different parts of
        your application run in different runtimes (Edge vs Node.js) and at different times
        (build time vs request time). Understanding the deployment model is essential for
        production-grade work and senior interviews.
      </p>

      <h2 id="vercel-model">The Vercel Deployment Model</h2>
      <p>
        Vercel (Next.js's creator) deploys Next.js apps across three infrastructure types, each
        with different characteristics:
      </p>

      <ArticleTable caption="How different Next.js outputs are served on Vercel." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Infrastructure</th>
              <th>What runs here</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CDN (Edge Network)</strong></td>
              <td>Static assets, statically rendered HTML (Full Route Cache)</td>
              <td>200+ global edge locations — closest to user</td>
            </tr>
            <tr>
              <td><strong>Edge Functions</strong></td>
              <td>Middleware, Route Handlers/pages with Edge Runtime</td>
              <td>Edge locations — fast cold start, limited APIs</td>
            </tr>
            <tr>
              <td><strong>Serverless Functions</strong></td>
              <td>Dynamic pages, Route Handlers, Server Actions (Node.js runtime)</td>
              <td>Regional (usually one region) — full Node.js, slower cold start</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// The build output determines what goes where:
//
// Static HTML files → CDN (fastest, free)
// Dynamic routes   → Serverless Functions (per-request execution)
// Middleware       → Edge Functions (every request, ultra-low latency)
//
// Key insight: Static routes are essentially free and globally fast.
// Every dynamic route has cost (compute, latency) — minimize dynamic routes
// and use ISR/PPR to push as much work to build time as possible.`}</code></pre>

      <h2 id="runtimes">Edge Runtime vs Node.js Runtime</h2>
      <p>
        Each route, Route Handler, or Server Action can declare which runtime it runs in.
        Middleware always runs on the Edge Runtime.
      </p>

      <pre><code>{`// Default: Node.js runtime (full Node.js API surface)
// Override with the runtime export:

// Force Edge Runtime for this route
export const runtime = "edge";

// Force Node.js runtime (override if middleware or parent set edge)
export const runtime = "nodejs";

// In a Route Handler:
export const runtime = "edge";

export async function GET() {
  // All edge-compatible code here
  return new Response("Fast edge response");
}`}</code></pre>

      <h3 id="runtime-comparison">Runtime Comparison</h3>
      <ArticleTable caption="Choose the runtime based on your requirements." minWidth={960}>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Node.js Runtime</th>
              <th>Edge Runtime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cold start time</td>
              <td>~200ms–1s</td>
              <td>~0ms (always warm)</td>
            </tr>
            <tr>
              <td>Node.js built-ins</td>
              <td>Full (fs, crypto, path, child_process)</td>
              <td>None (only Web APIs)</td>
            </tr>
            <tr>
              <td>TCP connections (Prisma, pg)</td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Global distribution</td>
              <td>Regional (one or few regions)</td>
              <td>200+ global locations</td>
            </tr>
            <tr>
              <td>Memory limit</td>
              <td>Higher (Vercel: 1024MB)</td>
              <td>Lower (Vercel: 128MB)</td>
            </tr>
            <tr>
              <td>Execution duration limit</td>
              <td>Up to 30s (Vercel default)</td>
              <td>30s wall clock, 15 CPU seconds</td>
            </tr>
            <tr>
              <td>Available APIs</td>
              <td>All Web APIs + full Node.js</td>
              <td>Fetch, URL, TextEncoder, Web Crypto, Cache API</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="env-vars">Environment Variables</h2>
      <p>
        Next.js has a layered environment variable system. Getting this wrong is a common
        source of production bugs and security issues.
      </p>

      <pre><code>{`// .env.local — local overrides (not committed to git)
// .env — committed defaults for all environments
// .env.production — production-only values (committed)
// .env.development — development-only values (committed)
//
// Load order: .env.local > .env.[environment] > .env

# .env.local (never commit this)
DATABASE_URL=postgresql://localhost/mydb
JWT_SECRET=dev-only-secret-change-in-production

# .env (committed — safe defaults)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SITE_NAME=My App`}</code></pre>

      <h3 id="env-security">Server-Only vs Public Variables</h3>
      <p>
        <strong>The critical rule:</strong> Variables prefixed with <code>NEXT_PUBLIC_</code>{" "}
        are included in the browser bundle. All other variables are server-only and never
        sent to the client.
      </p>

      <pre><code>{`// ✓ Server-only — stays on the server
process.env.DATABASE_URL        // database connection string
process.env.JWT_SECRET          // signing secret
process.env.STRIPE_SECRET_KEY   // payment API secret
process.env.OPENAI_API_KEY      // AI API key

// ✓ Public — included in browser bundle (prefixed with NEXT_PUBLIC_)
process.env.NEXT_PUBLIC_API_URL        // safe to expose — public API URL
process.env.NEXT_PUBLIC_STRIPE_KEY     // Stripe publishable key (designed to be public)
process.env.NEXT_PUBLIC_ANALYTICS_ID  // tracking ID

// ❌ Dangerous — accidentally exposed if used in a Client Component
// If you access process.env.DATABASE_URL in a Client Component, Next.js will
// attempt to include it at build time. It may be empty string rather than the value,
// but the intent is wrong. Use the server-only package to enforce this:

// src/lib/db.ts
import "server-only"; // throws build-time error if imported in client code
export const db = new PrismaClient();

// Validate required env vars at startup (fail fast)
// src/lib/env.ts
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing required environment variable: \${name}\`);
  return value;
}

export const env = {
  databaseUrl: getEnvVar("DATABASE_URL"),
  jwtSecret: getEnvVar("JWT_SECRET"),
  // Public vars (available everywhere):
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "https://api.example.com",
};`}</code></pre>

      <h2 id="next-config">next.config.ts Key Options</h2>

      <pre><code>{`// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve images from external domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.example.com" },
    ],
    // Custom image optimization (e.g. Cloudflare Images)
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },

  // Redirect old URLs
  async redirects() {
    return [
      { source: "/old-path", destination: "/new-path", permanent: true },
      { source: "/blog/:slug", destination: "/posts/:slug", permanent: true },
    ];
  },

  // Rewrite paths without changing the URL shown to users
  async rewrites() {
    return [
      {
        source: "/api/external/:path*",
        destination: "https://external-api.example.com/:path*",
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'",
          },
        ],
      },
    ];
  },

  // Bundle external packages into the server bundle (avoid serverExternalPackages issues)
  transpilePackages: ["some-esm-only-package"],

  // Experimental features
  experimental: {
    ppr: true, // Partial Prerendering
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
  },

  // Output mode (see below)
  output: "standalone",
};

export default nextConfig;`}</code></pre>

      <h2 id="isr">ISR — Incremental Static Regeneration</h2>
      <p>
        ISR is the pattern of serving a cached static page while regenerating it in the
        background. It is not a specific API — it is the combination of fetch with{" "}
        <code>next.revalidate</code>, the Full Route Cache, and background regeneration.
      </p>

      <pre><code>{`// ISR with time-based revalidation
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await fetch(\`https://cms.example.com/posts/\${slug}\`, {
    next: { revalidate: 3600 }, // revalidate at most every 1 hour
  }).then(r => r.json());

  return <article>{post.content}</article>;
}

// What happens at runtime:
// 1. First request: Server renders the page, caches the HTML and RSC payload.
// 2. Requests within 3600s: Serve from Full Route Cache (zero compute).
// 3. After 3600s: Serve the stale page immediately (no user waits).
//    Trigger a background regeneration simultaneously.
// 4. Next request: Serve the freshly regenerated page.

// ISR with on-demand revalidation (event-driven, preferred for CMS)
// Route Handler that can be triggered by a CMS webhook:
export async function POST(request: Request) {
  const { secret, slug } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  revalidatePath(\`/blog/\${slug}\`); // immediately purge this page's cache
  return Response.json({ revalidated: true, slug });
}`}</code></pre>

      <h2 id="output-modes">Output Modes</h2>

      <h3 id="standalone">standalone Output</h3>
      <p>
        <code>output: "standalone"</code> creates a self-contained Node.js server that can be
        containerized with Docker. It includes only the necessary files and dependencies — no
        <code>node_modules</code> needed at runtime.
      </p>

      <pre><code>{`// next.config.ts
const nextConfig = {
  output: "standalone",
};

// Dockerfile for a standalone Next.js app:
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# Production image — only the standalone output
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]`}</code></pre>

      <h3 id="export">static export</h3>
      <p>
        <code>output: "export"</code> generates a fully static site with no server runtime.
        All pages must be statically renderable. Dynamic routes require{" "}
        <code>generateStaticParams</code>. Server Actions and dynamic Route Handlers are
        not supported.
      </p>

      <pre><code>{`// next.config.ts
const nextConfig = {
  output: "export",
  // Required when deploying to a non-root path:
  basePath: "/my-app",
};

// Constraints with output: "export":
// - No Server Actions
// - No middleware
// - No Route Handlers that require dynamic rendering
// - No cookies() or headers() in Server Components
// - No ISR — revalidate is ignored, everything is static

// Use cases for static export:
// - Documentation sites
// - Marketing sites with no personalization
// - GitHub Pages deployments
// - S3/CloudFront static hosting`}</code></pre>

      <h2 id="deployment-checklist">Deployment Checklist</h2>
      <ul>
        <li>
          <strong>Environment variables:</strong> All required server-side env vars are set
          in the deployment platform. <code>NEXT_PUBLIC_</code> vars are set for the build.
        </li>
        <li>
          <strong>Build passes locally:</strong> Run <code>pnpm build</code> — TypeScript errors
          and import issues only surface at build time.
        </li>
        <li>
          <strong>Database connection:</strong> Verify the runtime (Node.js) has connectivity
          to the database. Edge Functions cannot connect to TCP databases.
        </li>
        <li>
          <strong>Image domains:</strong> All external image hostnames are in{" "}
          <code>next.config.ts</code> <code>images.remotePatterns</code>.
        </li>
        <li>
          <strong>Revalidation secrets:</strong> Any webhook-based revalidation endpoints have
          secret validation. Never expose an open revalidation endpoint.
        </li>
        <li>
          <strong>Cache behavior in production:</strong> Test with <code>pnpm build && pnpm start</code>
          locally before deploying — caches are disabled in dev mode.
        </li>
        <li>
          <strong>Output mode:</strong> Choose <code>standalone</code> for Docker/self-hosted,
          leave unset for Vercel/platform deployments, <code>export</code> only for pure static sites.
        </li>
      </ul>
    </div>
  );
}
