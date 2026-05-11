import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const envFilePrecedenceDiagram = String.raw`flowchart TD
    START["Next.js starts up"]
    START --> BASE[".env<br/>Base defaults — safe to commit<br/>(no secrets)"]
    BASE --> LOCAL[".env.local<br/>Local overrides — GITIGNORED<br/>Wins over .env always"]
    LOCAL --> NODE_ENV{"NODE_ENV?"}
    NODE_ENV -->|"development"| DEV[".env.development<br/>Dev-specific values"]
    NODE_ENV -->|"production"| PROD[".env.production<br/>Prod-specific values"]
    NODE_ENV -->|"test"| TEST[".env.test<br/>Test-specific values<br/>(.env.local NOT loaded in test)"]
    DEV --> DEV_LOCAL[".env.development.local<br/>Local dev overrides — GITIGNORED"]
    PROD --> PROD_LOCAL[".env.production.local<br/>Local prod overrides — GITIGNORED"]
    DEV_LOCAL --> FINAL["Final resolved value<br/>(last match wins)"]
    PROD_LOCAL --> FINAL
    TEST --> FINAL`;

const buildVsRuntimeDiagram = String.raw`flowchart LR
    SOURCE["Source code<br/>process.env.NEXT_PUBLIC_APP_URL<br/>process.env.DATABASE_URL"]
    SOURCE --> BUILD["Next.js Build (next build)"]
    BUILD --> INLINE["NEXT_PUBLIC_ vars<br/>INLINED into JS bundle<br/>Value baked as string literal"]
    BUILD --> KEEP["Server-only vars<br/>Left as process.env references<br/>Resolved at RUNTIME by Node.js"]
    INLINE --> BUNDLE["client bundle.js<br/>...const url = 'https://myapp.com'..."]
    KEEP --> SERVER["Server process<br/>process.env.DATABASE_URL<br/>→ read from platform env at runtime"]
    BUNDLE --> BROWSER["Browser downloads bundle<br/>Value visible in DevTools Sources"]
    SERVER --> DB["DB connection established<br/>Secret never leaves server"]`;

export const toc: TocItem[] = [
  { id: "env-mental-model", title: "The Two-Axis Mental Model", level: 2 },
  { id: "env-file-hierarchy", title: ".env File Hierarchy and Precedence", level: 2 },
  { id: "nextpublic-prefix", title: "NEXT_PUBLIC_ Prefix Deep Dive", level: 2 },
  { id: "build-vs-runtime", title: "Build-Time vs Runtime Env Vars", level: 2 },
  { id: "type-safe-env", title: "Type-Safe Env with Zod", level: 2 },
  { id: "server-only-package", title: "The server-only Package", level: 2 },
  { id: "common-patterns", title: "Common Classification Patterns", level: 2 },
  { id: "env-comparison-table", title: "Environment Variable Reference Table", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EnvironmentVariablesAndConfig() {
  return (
    <div className="article-content">
      <p>
        Environment variables in Next.js have two independent axes: <strong>when</strong> they are
        resolved (build time vs runtime) and <strong>where</strong> they are accessible (server only
        vs client bundle). Most configuration bugs — ranging from undefined errors to accidental
        secret leaks — come from confusing these two axes. This module builds the correct mental
        model, then shows the production patterns that prevent both classes of mistake.
      </p>

      <h2 id="env-mental-model">The Two-Axis Mental Model</h2>
      <p>
        Before memorizing prefix rules, internalize the two axes. Every env var you define in
        Next.js sits at exactly one point on this grid:
      </p>

      <ul>
        <li>
          <strong>Server only, resolved at runtime</strong> — the default. Plain{" "}
          <code>process.env.FOO</code> with no <code>NEXT_PUBLIC_</code> prefix. The value never
          leaves the server process. Node.js resolves it when the server starts, not when you run{" "}
          <code>next build</code>.
        </li>
        <li>
          <strong>Client bundle, resolved at build time</strong> — any var prefixed with{" "}
          <code>NEXT_PUBLIC_</code>. webpack replaces the <code>process.env</code> reference with
          the string value during compilation. The value is literally written into your JavaScript
          files and ships to every browser.
        </li>
      </ul>

      <p>
        There is no middle ground. A var is either in the bundle or it is not. This is the most
        important sentence in this module: <strong>if it is in the bundle, it is public — treat it
        that way</strong>. CDNs cache bundles. Source maps reference them. Anyone with DevTools can
        read them.
      </p>

      <h2 id="env-file-hierarchy">.env File Hierarchy and Precedence</h2>
      <p>
        Next.js loads multiple <code>.env</code> files and merges them in a specific order.
        Higher-priority files win on conflicts. Understanding this order prevents the classic
        &quot;my change is not being picked up&quot; confusion.
      </p>

      <MermaidDiagram
        chart={envFilePrecedenceDiagram}
        title=".env File Load Order and Precedence"
        caption="Files loaded later override files loaded earlier on the same key. .env.local always beats .env. In test mode, .env.local is intentionally skipped so tests are reproducible."
        minHeight={520}
      />

      <p>
        The rules that matter in practice:
      </p>
      <ul>
        <li>
          <strong><code>.env</code></strong> — safe to commit. Base defaults with no secret values.
          Documents what vars the app needs. Use placeholder values like{" "}
          <code>DATABASE_URL=postgresql://localhost/myapp_dev</code>.
        </li>
        <li>
          <strong><code>.env.local</code></strong> — always gitignored. This is where real secrets
          live on your machine. Overrides <code>.env</code> for every environment. Not loaded during{" "}
          <code>next test</code>.
        </li>
        <li>
          <strong><code>.env.development</code> / <code>.env.production</code></strong> — safe to
          commit if they contain no secrets. Good for non-secret environment-specific config like
          feature flag defaults or log levels.
        </li>
        <li>
          <strong>Platform-injected vars</strong> (Vercel, Railway, Fly.io) — injected at runtime
          directly into the process environment. They win over every file because they are not
          files at all.
        </li>
      </ul>

      <pre>
        <code>{`# .env — committed, no secrets, documents the schema
DATABASE_URL=postgresql://localhost/myapp_dev
NEXTAUTH_SECRET=changeme-local-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ANALYTICS_ID=

# .env.local — gitignored, your real local values
DATABASE_URL=postgresql://user:password@prod-replica.example.com/myapp
NEXTAUTH_SECRET=super-long-random-string-from-openssl-rand-base64-32

# .env.production — committed, production non-secrets
NEXT_PUBLIC_APP_URL=https://myapp.com
NEXT_PUBLIC_ANALYTICS_ID=UA-12345678`}</code>
      </pre>

      <h2 id="nextpublic-prefix">NEXT_PUBLIC_ Prefix Deep Dive</h2>
      <p>
        The <code>NEXT_PUBLIC_</code> prefix is a build-time transformation trigger. When Next.js
        sees <code>process.env.NEXT_PUBLIC_APP_URL</code> in any file included in the client bundle,
        webpack replaces that expression with the literal string value from your environment at the
        moment <code>next build</code> runs. The result is that the string is baked into your
        JavaScript files.
      </p>

      <pre>
        <code>{`// What you write:
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const dbUrl  = process.env.DATABASE_URL;

// What the client bundle contains after next build:
const appUrl = "https://myapp.com";   // ← string literal, visible to anyone
const dbUrl  = undefined;             // ← server-only vars become undefined in client bundle

// What the server bundle contains:
const appUrl = "https://myapp.com";   // ← also inlined (same build)
const dbUrl  = process.env.DATABASE_URL; // ← still a process.env reference, resolved at runtime`}</code>
      </pre>

      <p>
        The build-time gotcha that catches every team at least once:{" "}
        <strong>changing a <code>NEXT_PUBLIC_</code> var requires a new build and deploy</strong>,
        not just a server restart. If you update <code>NEXT_PUBLIC_APP_URL</code> in your Vercel
        dashboard and redeploy without rebuilding, the old value is still baked into the JS files
        from the previous build. You must trigger a fresh <code>next build</code>.
      </p>

      <pre>
        <code>{`// ✅ Server Component — can read any env var
// app/api/users/route.ts
export async function GET() {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); // ✓ server only
  const apiKey = process.env.STRIPE_SECRET_KEY;                          // ✓ never in bundle
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;                     // ✓ also fine on server
  // ...
}

// ✅ Client Component — only NEXT_PUBLIC_ is available
// components/ExternalLink.tsx
"use client";
export function ExternalLink({ path }: { path: string }) {
  const base = process.env.NEXT_PUBLIC_APP_URL; // ✓ inlined at build time
  // process.env.DATABASE_URL would be undefined here — the key does not exist in the bundle
  return <a href={base + path}>link</a>;
}`}</code>
      </pre>

      <h2 id="build-vs-runtime">Build-Time vs Runtime Env Vars</h2>
      <p>
        The build/runtime distinction is what confuses even experienced engineers moving from
        traditional Node apps to Next.js. In a plain Express server, all{" "}
        <code>process.env</code> reads happen at runtime. In Next.js, that rule only holds for
        server-side code — the client side is frozen at build time.
      </p>

      <MermaidDiagram
        chart={buildVsRuntimeDiagram}
        title="Build-Time Inlining vs Runtime Resolution"
        caption="NEXT_PUBLIC_ vars are replaced by string literals during next build. Server-only vars remain as process.env references and are resolved by Node.js when the server process starts."
        minHeight={400}
      />

      <p>
        The Vercel deployment model makes this concrete. When you push a commit, Vercel runs{" "}
        <code>next build</code> with your build-time environment variables (set in the Vercel
        dashboard under &quot;Build Environment Variables&quot;). The output is a set of static JS
        files and a server bundle. The JS files contain the baked-in <code>NEXT_PUBLIC_</code>{" "}
        values. The server function receives runtime environment variables from the platform, which
        is where your <code>DATABASE_URL</code> and <code>NEXTAUTH_SECRET</code> live.
      </p>

      <pre>
        <code>{`// next.config.ts — serverRuntimeConfig vs publicRuntimeConfig (the older pattern)
// Note: this pattern is largely superseded by NEXT_PUBLIC_ for client vars and
// process.env for server vars. Prefer the env var approach.

// The modern pattern: use env vars directly, no config gymnastics needed.

// Accessing env vars correctly in different module types:

// Route Handler (always server)
// app/api/webhook/route.ts
export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET; // runtime, server only ✓
  // ...
}

// Server Component (always server)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID; // build-time, but fine on server
  const dbUrl = process.env.DATABASE_URL; // runtime, server only ✓
  // ...
}

// Client Component — only NEXT_PUBLIC_ survives
// components/Analytics.tsx
"use client";
export function Analytics() {
  // ✓ this was inlined at build time
  const id = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  // ✗ this is undefined — DATABASE_URL is not in the client bundle
  const db = process.env.DATABASE_URL;
}`}</code>
      </pre>

      <h2 id="type-safe-env">Type-Safe Env with Zod</h2>
      <p>
        Raw <code>process.env</code> access has two problems: values are always{" "}
        <code>string | undefined</code> (TypeScript cannot know which vars exist), and missing vars
        cause runtime errors deep in request handlers rather than at startup. The Zod validation
        pattern solves both by making your process crash early and loudly if the environment is
        misconfigured.
      </p>

      <pre>
        <code>{`// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Server-only vars — never NEXT_PUBLIC_
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  REDIS_URL: z.string().url().optional(),

  // Public vars — safe to expose to client
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});

// This runs at startup (server) or at build time (when referenced in SSG pages).
// If any var is missing or invalid, you get a descriptive error immediately:
//   ZodError: DATABASE_URL: Invalid url
// instead of a cryptic "Cannot read properties of undefined" at 3am.
export const env = envSchema.parse(process.env);

// Usage across the codebase — fully typed, no string literals:
// import { env } from "@/env";
// const client = new Client({ connectionString: env.DATABASE_URL });  ← string, not string | undefined`}</code>
      </pre>

      <p>
        The most common mistake with this pattern is importing <code>env.ts</code> from a Client
        Component. The Zod parse runs fine, but the server-only vars come through as{" "}
        <code>undefined</code> in the client bundle (webpack strips them), causing the schema to
        throw at runtime in the browser. The fix: split your schema into a client schema and a
        server schema, and use the <code>server-only</code> package on the server schema.
      </p>

      <pre>
        <code>{`// src/env.server.ts — server-only validated env
import "server-only";
import { z } from "zod";

export const serverEnv = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
}).parse(process.env);

// src/env.client.ts — public vars, safe to import anywhere
import { z } from "zod";

export const clientEnv = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string(),
}).parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
});`}</code>
      </pre>

      <h2 id="server-only-package">The server-only Package</h2>
      <p>
        <code>server-only</code> is a zero-implementation package — its sole purpose is to make the
        Next.js build fail if a Client Component imports a file containing it. It is the compile-time
        equivalent of a &quot;do not enter&quot; sign for files that hold secrets or database access.
      </p>

      <pre>
        <code>{`// Install once:
// pnpm add server-only

// src/lib/db.ts — database client, must never reach the browser
import "server-only";
import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// src/lib/dal.ts — Data Access Layer pattern
import "server-only";
import { pool } from "./db";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session) return null;

  const { rows } = await pool.query(
    "SELECT id, email, name FROM users WHERE id = $1",
    [session.userId]
  );
  return rows[0] ?? null;
}

// If any Client Component tries to import from these files,
// the build will fail with:
//   "You're importing a component that needs 'server-only'..."
// This is the intended behavior — fail loudly at build time, not silently at runtime.`}</code>
      </pre>

      <p>
        Use <code>server-only</code> on any file that: reads from <code>process.env</code> for
        secrets, instantiates a DB client, calls a signing or encryption function with a private
        key, or contains access control logic. The DAL pattern (Data Access Layer) places all of
        these concerns in <code>src/lib/dal.ts</code> behind a single <code>server-only</code>{" "}
        guard.
      </p>

      <h2 id="common-patterns">Common Classification Patterns</h2>
      <p>
        When reviewing environment variables in a real project, classify each one along the
        server/client and runtime/build axes:
      </p>
      <ul>
        <li>
          <code>DATABASE_URL</code> — <strong>server, runtime</strong>. Never prefix with{" "}
          <code>NEXT_PUBLIC_</code>. Connection strings contain credentials.
        </li>
        <li>
          <code>NEXTAUTH_SECRET</code> — <strong>server, runtime</strong>. Used to sign JWTs.
          Exposing it lets anyone forge sessions.
        </li>
        <li>
          <code>STRIPE_SECRET_KEY</code> (starts with <code>sk_</code>) — <strong>server, runtime</strong>.
          Allows charging cards and issuing refunds. Never in a browser.
        </li>
        <li>
          <code>JWT_SECRET</code> / <code>ENCRYPTION_KEY</code> — <strong>server, runtime</strong>.
          Any cryptographic key is server-only by definition.
        </li>
        <li>
          <code>NEXT_PUBLIC_ANALYTICS_ID</code> (Google Analytics, PostHog) —{" "}
          <strong>client, build-time</strong>. Safe to expose — it identifies your site to the
          analytics service, it is not a secret.
        </li>
        <li>
          <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> (starts with <code>pk_</code>) —{" "}
          <strong>client, build-time</strong>. Stripe&apos;s publishable key is designed to be
          public — it only creates payment intents, it cannot charge.
        </li>
        <li>
          <code>NEXT_PUBLIC_APP_URL</code> — <strong>client, build-time</strong>. Your own domain.
          Safe and often needed for canonical URLs or OAuth redirect URIs in client code.
        </li>
        <li>
          <code>SENDGRID_API_KEY</code> / <code>RESEND_API_KEY</code> — <strong>server, runtime</strong>.
          Email provider keys allow sending email on your behalf. Server only.
        </li>
      </ul>

      <h2 id="env-comparison-table">Environment Variable Reference Table</h2>
      <ArticleTable
        caption="Every env var you define belongs in one of these four categories. The security risk column assumes the var has been leaked — assess accordingly."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Variable type</th>
              <th>Prefix needed</th>
              <th>Accessible in</th>
              <th>Resolved when</th>
              <th>Security risk if leaked</th>
              <th>Real example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Server secret</strong></td>
              <td>None</td>
              <td>Server only (API routes, Server Components, middleware)</td>
              <td>Runtime (when Node process starts)</td>
              <td><strong>Critical</strong> — credentials, keys, tokens</td>
              <td><code>DATABASE_URL</code>, <code>STRIPE_SECRET_KEY</code>, <code>NEXTAUTH_SECRET</code></td>
            </tr>
            <tr>
              <td><strong>Server non-secret</strong></td>
              <td>None</td>
              <td>Server only</td>
              <td>Runtime</td>
              <td>Low — config values, feature flags</td>
              <td><code>LOG_LEVEL</code>, <code>FEATURE_FLAG_NEW_UI</code></td>
            </tr>
            <tr>
              <td><strong>Public config</strong></td>
              <td><code>NEXT_PUBLIC_</code></td>
              <td>Everywhere (client bundle + server)</td>
              <td><strong>Build time</strong> (baked into JS)</td>
              <td>None — intentionally public</td>
              <td><code>NEXT_PUBLIC_APP_URL</code>, <code>NEXT_PUBLIC_ANALYTICS_ID</code></td>
            </tr>
            <tr>
              <td><strong>Public API key</strong></td>
              <td><code>NEXT_PUBLIC_</code></td>
              <td>Everywhere (client bundle + server)</td>
              <td><strong>Build time</strong></td>
              <td>Low — designed to be public by the provider</td>
              <td><code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>, <code>NEXT_PUBLIC_POSTHOG_KEY</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: What's the difference between NEXT_PUBLIC_ and regular env vars?"
        intro="Weak answers say 'NEXT_PUBLIC_ makes it available in the browser.' Strong answers explain the build-time inlining mechanism, name the security implication, and call out the rebuild-required gotcha."
        steps={[
          "Lead with the mechanism: regular vars stay as process.env references in the server bundle, resolved at runtime by Node.js. NEXT_PUBLIC_ vars are replaced by webpack with their string values at build time — the string is literally written into the JavaScript files shipped to every browser.",
          "Name the security rule: anything prefixed NEXT_PUBLIC_ is in the client bundle and is public. It appears in DevTools, in cached CDN responses, in source maps. Never put a secret, API key with write access, or credential in a NEXT_PUBLIC_ var.",
          "Call out the rebuild gotcha: because the value is baked at build time, changing a NEXT_PUBLIC_ var on your hosting platform does not take effect until you trigger a new build. A server restart is not enough.",
          "Close with the production pattern: type-safe validation with Zod at startup catches missing or malformed vars immediately. Split into a server schema (with server-only guard) and a client schema to prevent accidents.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: A dev accidentally exposed a DB connection string in the browser — how did that happen?"
        intro="This is a diagnosis question. The interviewer wants to see that you understand the NEXT_PUBLIC_ inlining mechanism deeply enough to explain how the mistake occurs."
        steps={[
          "Identify the root cause: the developer prefixed the variable with NEXT_PUBLIC_ (e.g., NEXT_PUBLIC_DATABASE_URL) or read it in a Client Component where it became undefined but a fallback was used. The NEXT_PUBLIC_ case is the dangerous one — it puts the connection string in the bundle.",
          "Explain why it is serious: a PostgreSQL connection string contains the host, port, database name, username, and password. Anyone who downloads your app's JavaScript can read your production database credentials and connect directly.",
          "Name the less obvious path: even without the prefix, if a developer passes the URL as a prop from a Server Component to a Client Component, the value travels across the server/client boundary and ends up in the page's serialized props (visible in __NEXT_DATA__ script tag in the HTML).",
          "Give the prevention stack: use the server-only package on any file touching secrets, validate with Zod at startup (throws if vars are missing), and never pass raw secret values as component props. Code review should flag any process.env access in a 'use client' file.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Classify the Environment Variables"
        scenario={
          <>
            <p>
              You are reviewing a pull request that adds a new feature to a Next.js e-commerce app.
              The PR description lists the following 8 environment variables that need to be added.
              Your job is to classify each one and flag any that are misconfigured.
            </p>
            <pre>
              <code>{`# Variables from the PR — classify each one:

NEXT_PUBLIC_DATABASE_URL=postgresql://user:pass@db.example.com/shop
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_abc123
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xyz789
NEXTAUTH_SECRET=my-auth-secret
NEXT_PUBLIC_APP_URL=https://myshop.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
NEXT_PUBLIC_SUPPORT_EMAIL=support@myshop.com
JWT_SECRET=jwt-signing-key`}</code>
            </pre>
          </>
        }
        tasks={[
          "Classify each variable: should it have the NEXT_PUBLIC_ prefix or not? Explain why.",
          "Identify which vars are resolved at build time vs runtime, and what that means for deployments.",
          "Flag any variables that are dangerously misconfigured and explain the security consequence.",
          "Propose the correct .env file to commit (safe defaults only) and what goes in .env.local.",
        ]}
      />

      <SolutionReveal difficulty="medium">
        <div>
          <p><strong>Variable-by-variable analysis:</strong></p>
          <ul>
            <li>
              <code>NEXT_PUBLIC_DATABASE_URL</code> — <strong>Critical security bug.</strong>{" "}
              Remove <code>NEXT_PUBLIC_</code>. A PostgreSQL connection string contains your
              database host, username, and password. Prefixing it bakes those credentials into
              the client bundle, downloadable by anyone. Rename to <code>DATABASE_URL</code>.
            </li>
            <li>
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> — Correct. Stripe&apos;s
              publishable key (<code>pk_</code>) is designed to be public. It can only create
              payment intents, never charge cards. Safe in the client bundle.
            </li>
            <li>
              <code>NEXT_PUBLIC_STRIPE_SECRET_KEY</code> — <strong>Critical security bug.</strong>{" "}
              A Stripe secret key (<code>sk_</code>) allows issuing refunds, creating customers,
              and reading all transaction data. Remove <code>NEXT_PUBLIC_</code>. Rename to{" "}
              <code>STRIPE_SECRET_KEY</code> and access only in Route Handlers or Server Actions.
            </li>
            <li>
              <code>NEXTAUTH_SECRET</code> — Correct. No prefix, server-only. Signs and verifies
              JWTs. Leaking it lets anyone forge session tokens.
            </li>
            <li>
              <code>NEXT_PUBLIC_APP_URL</code> — Correct. Your own domain is not a secret. Needed
              in client code for canonical URLs and OAuth redirects.
            </li>
            <li>
              <code>SENDGRID_API_KEY</code> — Correct. No prefix. Allows sending email. Server
              only.
            </li>
            <li>
              <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> — Acceptable. A public support email
              address is not a secret. The <code>NEXT_PUBLIC_</code> prefix is fine if you need
              it in client code. Alternatively, hardcode it as a constant if it never changes.
            </li>
            <li>
              <code>JWT_SECRET</code> — Correct, no prefix. However, consider using{" "}
              <code>NEXTAUTH_SECRET</code> for this purpose instead of maintaining two separate
              signing keys.
            </li>
          </ul>
          <p><strong>Committed .env (safe defaults, no secrets):</strong></p>
          <pre>
            <code>{`NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
NEXT_PUBLIC_SUPPORT_EMAIL=support@myshop.com
DATABASE_URL=postgresql://localhost/shop_dev
NEXTAUTH_SECRET=changeme-minimum-32-chars-replace-in-production
STRIPE_SECRET_KEY=sk_test_placeholder
SENDGRID_API_KEY=
JWT_SECRET=`}</code>
          </pre>
          <p><strong>In .env.local (gitignored, real secrets):</strong></p>
          <pre>
            <code>{`DATABASE_URL=postgresql://user:realpass@db.example.com/shop
NEXTAUTH_SECRET=<output of: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_xyz789
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
JWT_SECRET=<another long random string>`}</code>
          </pre>
        </div>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two axes, not one:</strong> env vars are characterized by WHEN they resolve
          (build vs runtime) AND WHERE they are accessible (server vs client bundle). Confusing
          these axes is the root cause of both security leaks and &quot;undefined&quot; bugs.
        </li>
        <li>
          <strong><code>NEXT_PUBLIC_</code> = in the bundle = public forever:</strong> webpack
          replaces these with string literals at build time. They appear in your JS files, in
          DevTools, in CDN caches. Treat them as public documentation, not configuration.
        </li>
        <li>
          <strong>Changing <code>NEXT_PUBLIC_</code> vars requires a new build:</strong> the value
          is baked in at compile time. Updating it in your hosting platform&apos;s dashboard and
          restarting the server does nothing — you must trigger a fresh <code>next build</code>.
        </li>
        <li>
          <strong>Validate with Zod at startup:</strong> a <code>z.object({}).parse(process.env)</code>{" "}
          call in <code>src/env.ts</code> turns missing or malformed vars into a startup crash with
          a clear error message instead of a 3am mystery <code>undefined</code> in production.
        </li>
        <li>
          <strong>Use <code>server-only</code> on any file touching secrets:</strong> importing it
          makes the build fail if a Client Component tries to reach that file. Combined with a DAL
          pattern, this creates a hard boundary that prevents accidental secret leakage through the
          component tree.
        </li>
      </ul>
    </div>
  );
}
