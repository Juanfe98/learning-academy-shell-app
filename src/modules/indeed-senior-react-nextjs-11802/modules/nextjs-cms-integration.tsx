import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const isrWebhookDiagram = String.raw`sequenceDiagram
    participant ED as Editor (Contentstack)
    participant WH as Contentstack Webhook
    participant RH as Next.js Route Handler
    participant FC as Next.js Full-Route Cache
    participant CDN as CDN / Edge
    participant US as End User

    ED->>WH: Publishes article entry
    WH->>RH: POST /api/revalidate { slug, content_type }
    RH->>FC: revalidatePath('/help/article-slug')
    FC->>FC: Marks route as stale
    US->>CDN: GET /help/article-slug
    CDN->>FC: Cache miss (stale)
    FC->>FC: Fetches fresh from Contentstack, re-renders
    FC-->>CDN: New HTML (re-cached)
    CDN-->>US: Fresh article page`;

const draftModeDiagram = String.raw`sequenceDiagram
    participant ED as Editor
    participant CS as Contentstack Preview
    participant NX as Next.js (Draft Mode)
    participant BR as Browser

    ED->>NX: Clicks "Preview" button in Contentstack
    NX->>NX: GET /api/preview?secret=XXX&slug=article-slug
    NX->>BR: Sets __prerender_bypass cookie (draft mode enabled)
    BR->>NX: GET /help/article-slug (with draft cookie)
    NX->>CS: Fetches from Preview API (includes drafts)
    CS-->>NX: Returns draft entry content
    NX-->>BR: Renders draft article (not cached)`;

export const toc: TocItem[] = [
  { id: "sdk-setup", title: "Contentstack SDK Setup", level: 2 },
  { id: "fetch-strategies", title: "Fetch Strategies: SDK vs REST vs GraphQL", level: 2 },
  { id: "ssg-pattern", title: "SSG with generateStaticParams", level: 2 },
  { id: "isr-help-center", title: "ISR for the Help Center", level: 2 },
  { id: "on-demand-revalidation", title: "On-Demand Revalidation via Webhooks", level: 3 },
  { id: "draft-mode", title: "Draft Mode for Editorial Previews", level: 2 },
  { id: "env-config", title: "Environment-Specific Configuration", level: 3 },
  { id: "error-handling", title: "Error Handling: 404s and API Errors", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function NextjsCmsIntegration() {
  return (
    <div className="article-content">
      <p>
        Integrating Next.js with Contentstack is not just about fetching data — it is about choosing
        the right fetch strategy per page type, managing ISR revalidation for fresh content without
        rebuilds, and wiring up Draft Mode so editors can preview unpublished articles. This module
        covers the full integration end-to-end.
      </p>

      <h2 id="sdk-setup">Contentstack SDK Setup</h2>
      <p>
        Contentstack provides an official JavaScript Delivery SDK. Install it alongside the types:
      </p>

      <pre>
        <code>{`npm install @contentstack/delivery-sdk
# or
pnpm add @contentstack/delivery-sdk`}</code>
      </pre>

      <pre>
        <code>{`// src/lib/contentstack.ts — singleton client, imported by server-side code only
import contentstack from "@contentstack/delivery-sdk";

// This file is server-only — never import it from client components
// API keys are read from environment variables, never hardcoded

const stack = contentstack.stack({
  apiKey: process.env.CONTENTSTACK_API_KEY!,
  deliveryToken: process.env.CONTENTSTACK_DELIVERY_TOKEN!,
  environment: process.env.CONTENTSTACK_ENVIRONMENT!, // "development" | "staging" | "production"
});

const previewStack = contentstack.stack({
  apiKey: process.env.CONTENTSTACK_API_KEY!,
  deliveryToken: process.env.CONTENTSTACK_PREVIEW_TOKEN!,
  environment: process.env.CONTENTSTACK_ENVIRONMENT!,
  preview: {
    enable: true,
    host: "rest-preview.contentstack.com",
  },
});

// Fetch a single article by slug
export async function getArticle(slug: string) {
  const result = await stack
    .contentType("article")
    .entry()
    .query({ "url": slug })
    .find();

  return result.entries?.[0] ?? null;
}

// Fetch all article slugs for generateStaticParams
export async function getAllArticleSlugs(): Promise<string[]> {
  const result = await stack
    .contentType("article")
    .entry()
    .select(["url"]) // only fetch the slug field — reduces response size
    .find();

  return result.entries?.map((e) => e.url).filter(Boolean) ?? [];
}

// Fetch draft content for preview mode
export async function getArticlePreview(slug: string) {
  const result = await previewStack
    .contentType("article")
    .entry()
    .query({ "url": slug })
    .find();

  return result.entries?.[0] ?? null;
}`}</code>
      </pre>

      <h2 id="fetch-strategies">Fetch Strategies: SDK vs REST vs GraphQL</h2>

      <ArticleTable caption="Three ways to fetch from Contentstack — each with different bundle impact, flexibility, and caching characteristics." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Bundle Impact</th>
              <th>Flexibility</th>
              <th>Caching Behavior</th>
              <th>Type Safety</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Contentstack SDK</strong></td>
              <td>~60KB (server only)</td>
              <td>High — fluent query builder, handles pagination</td>
              <td>Inherits Next.js fetch cache when using SDK's internal fetch</td>
              <td>Types generated from SDK; manual TS interfaces needed</td>
              <td>Teams new to Contentstack; complex query logic</td>
            </tr>
            <tr>
              <td><strong>Raw REST fetch</strong></td>
              <td>Zero (native fetch)</td>
              <td>Medium — must build URLs manually</td>
              <td>Full Next.js cache control via fetch options</td>
              <td>Manual; use Zod to parse and validate responses</td>
              <td>Simple queries; teams that want maximum control</td>
            </tr>
            <tr>
              <td><strong>GraphQL API</strong></td>
              <td>Apollo Client ~45KB (client) or zero (server fetch)</td>
              <td>Highest — query exactly the fields you need, fragments</td>
              <td>Apollo InMemoryCache (client) or Next.js fetch cache (server)</td>
              <td>Excellent — generate types from schema with graphql-codegen</td>
              <td>Complex nested queries; component-level data colocation</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Raw fetch approach — maximum cache control, zero added bundle
// Use this in Server Components for simple queries

async function getArticleRaw(slug: string) {
  const url = new URL("https://cdn.contentstack.io/v3/content_types/article/entries");
  url.searchParams.set("query", JSON.stringify({ url: slug }));
  url.searchParams.set("environment", process.env.CONTENTSTACK_ENVIRONMENT!);

  const response = await fetch(url.toString(), {
    headers: {
      api_key: process.env.CONTENTSTACK_API_KEY!,
      access_token: process.env.CONTENTSTACK_DELIVERY_TOKEN!,
    },
    // Next.js fetch cache: revalidate every hour
    next: { revalidate: 3600, tags: ["articles", \`article:\${slug}\`] },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(\`Contentstack fetch failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.entries?.[0] ?? null;
}`}</code>
      </pre>

      <h2 id="ssg-pattern">SSG with generateStaticParams</h2>
      <p>
        For a Help Center with thousands of articles, SSG at build time pre-renders every article
        page to static HTML. This is the best performance and SEO outcome. The pattern:
      </p>

      <pre>
        <code>{`// src/app/help/[category]/[slug]/page.tsx

import { notFound } from "next/navigation";
import { getAllArticleSlugs, getArticle } from "@/lib/contentstack";

// Tell Next.js which paths to pre-render at build time
export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({
    // slug might be "/help/billing/invoice-download" — split into segments
    category: slug.split("/")[2],
    slug: slug.split("/")[3],
  }));
}

// For paths not pre-rendered (e.g. new articles published after build):
// dynamicParams = true (default) means they are generated on first request (ISR)
// dynamicParams = false would 404 any path not in generateStaticParams output
export const dynamicParams = true;

// ISR: revalidate every hour; stale-while-revalidate means serving stale is fine
export const revalidate = 3600;

interface ArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`);

  if (!article) {
    notFound(); // renders the nearest not-found.tsx
  }

  return <ArticleContent article={article} />;
}

// Generate SEO metadata per article
export async function generateMetadata({ params }: ArticlePageProps) {
  const { category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`);

  if (!article) return {};

  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.summary,
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.summary,
      images: article.featured_image?.url ? [article.featured_image.url] : [],
    },
  };
}`}</code>
      </pre>

      <h2 id="isr-help-center">ISR for the Help Center</h2>
      <p>
        ISR (Incremental Static Regeneration) is the default strategy for Help Center pages. The
        revalidation interval should be tuned per page type based on how frequently content changes
        and how stale is acceptable:
      </p>

      <pre>
        <code>{`// Article page: revalidate every hour — articles rarely change after publish
// On-demand revalidation via webhook handles urgent updates
export const revalidate = 3600; // 1 hour

// Category listing page: revalidate every 5 minutes — new articles appear here first
// Shorter TTL is worth it because this page aggregates many articles
export const revalidate = 300; // 5 minutes

// Homepage / hero section: revalidate every 30 minutes — changed by marketing, not editors
export const revalidate = 1800; // 30 minutes

// Search results: no caching — user-specific queries, never pre-rendered
export const dynamic = "force-dynamic"; // opts out of caching entirely`}</code>
      </pre>

      <h3 id="on-demand-revalidation">On-Demand Revalidation via Webhooks</h3>
      <MermaidDiagram
        chart={isrWebhookDiagram}
        title="ISR + Webhook On-Demand Revalidation"
        caption="On-demand revalidation fires immediately on publish — users see fresh content on the very next request after the editor clicks Save."
        minHeight={460}
      />

      <pre>
        <code>{`// src/app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import crypto from "node:crypto";

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-contentstack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature, process.env.CONTENTSTACK_WEBHOOK_SECRET!)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { event, content_type_uid, data } = payload;

  // Only handle publish and unpublish events
  if (!["publish", "unpublish"].includes(event)) {
    return Response.json({ skipped: true });
  }

  if (content_type_uid === "article") {
    const articleUrl = data.entries?.[0]?.url;
    if (articleUrl) {
      revalidatePath(articleUrl); // e.g. /help/billing/invoice-download
      revalidateTag(\`article:\${articleUrl}\`);
    }
    revalidatePath("/help"); // category listing includes article cards
  }

  return Response.json({ revalidated: true, url: data.entries?.[0]?.url });
}`}</code>
      </pre>

      <h2 id="draft-mode">Draft Mode for Editorial Previews</h2>
      <MermaidDiagram
        chart={draftModeDiagram}
        title="Next.js Draft Mode Preview Flow"
        caption="The editor never sees stale cached content — Draft Mode bypasses all caching and fetches directly from the Preview API every time."
        minHeight={400}
      />

      <pre>
        <code>{`// The complete Draft Mode implementation

// 1. Enable endpoint — Contentstack calls this URL when editor clicks Preview
// src/app/api/preview/route.ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug"); // e.g. /help/billing/invoice-download

  if (secret !== process.env.CONTENTSTACK_PREVIEW_SECRET) {
    return new Response("Invalid token", { status: 401 });
  }

  // Validate the slug looks like a valid article URL before redirecting
  if (!slug || !slug.startsWith("/help/")) {
    return new Response("Invalid slug", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(slug);
}

// 2. In the article page — detect draft mode and switch data source
import { draftMode } from "next/headers";

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = await params;
  const { isEnabled: isDraft } = await draftMode();

  const article = isDraft
    ? await getArticlePreview(\`/help/\${category}/\${slug}\`)
    : await getArticle(\`/help/\${category}/\${slug}\`);

  if (!article) notFound();

  return (
    <div>
      {isDraft && (
        <div style={{ background: "orange", padding: "8px", textAlign: "center" }}>
          Preview Mode — <a href="/api/preview/disable">Exit Preview</a>
        </div>
      )}
      <ArticleContent article={article} />
    </div>
  );
}`}</code>
      </pre>

      <h3 id="env-config">Environment-Specific Configuration</h3>

      <pre>
        <code>{`// .env.local (development)
CONTENTSTACK_API_KEY=blt_dev_xxxxxxxxxxxx
CONTENTSTACK_DELIVERY_TOKEN=cs_delivery_dev_xxxx
CONTENTSTACK_PREVIEW_TOKEN=cs_preview_dev_xxxx
CONTENTSTACK_ENVIRONMENT=development
CONTENTSTACK_PREVIEW_SECRET=your-random-secret-for-preview-auth
CONTENTSTACK_WEBHOOK_SECRET=your-random-secret-for-webhook-auth

// .env.production (injected by deployment platform — never committed)
CONTENTSTACK_API_KEY=blt_prod_xxxxxxxxxxxx
CONTENTSTACK_DELIVERY_TOKEN=cs_delivery_prod_xxxx
CONTENTSTACK_PREVIEW_TOKEN=cs_preview_prod_xxxx
CONTENTSTACK_ENVIRONMENT=production
CONTENTSTACK_PREVIEW_SECRET=different-secret-per-env
CONTENTSTACK_WEBHOOK_SECRET=different-secret-per-env

// NEXT_PUBLIC_ prefix makes a variable available in the client bundle
// NEVER prefix Contentstack API keys with NEXT_PUBLIC_ — they must stay server-only`}</code>
      </pre>

      <h2 id="error-handling">Error Handling: 404s and API Errors</h2>

      <pre>
        <code>{`// Three error scenarios to handle in every CMS-fetching page:

// 1. Entry not found (unpublished, deleted, or wrong slug)
if (!article) {
  notFound(); // renders nearest not-found.tsx, returns 404 HTTP status
}

// 2. API error (network failure, rate limit, bad credentials)
// Let it propagate to the nearest error.tsx
// Or catch and transform for a better UX:
try {
  const article = await getArticle(slug);
  if (!article) notFound();
  return <ArticleContent article={article} />;
} catch (error) {
  // Log to observability (Sentry, Datadog)
  console.error("Contentstack fetch error:", error);
  // Re-throw — Next.js will render error.tsx
  throw error;
}

// src/app/help/[category]/[slug]/error.tsx — client component
"use client";

export default function ArticleError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong loading this article</h2>
      <p>Our content system may be temporarily unavailable.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}`}</code>
      </pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you handle content updates without a full redeploy?'"
        intro="This question is really about ISR + webhook invalidation. Interviewers want to hear that you understand why ISR exists, what its tradeoffs are, and how to close the gap between CMS publish and user-visible update."
        steps={[
          "Start with the problem: a full rebuild of 10,000 articles takes 15–30 minutes. Editors can't wait that long to see their changes live. SSR would solve freshness but sacrifices all caching — every user hits the origin.",
          "Explain ISR: pages are statically generated at build time and cached. A revalidate interval (e.g. 3600 seconds) tells Next.js to regenerate the page in the background after the TTL expires. The user always gets a cached response — never waits for a database query.",
          "Close the gap with on-demand revalidation: Contentstack fires a webhook when an editor publishes. A Next.js Route Handler receives that webhook, validates the HMAC signature, and calls revalidatePath('/help/article-slug'). The next user request gets the fresh page — no 1-hour wait.",
          "Mention the tradeoff: stale content can serve for up to the revalidation interval if the webhook fails. Mitigate by monitoring webhook delivery failures (Contentstack shows webhook logs) and setting a reasonable TTL as a fallback.",
          "For preview: Draft Mode bypasses ISR entirely — it sets a cookie that tells Next.js to fetch from the Preview API on every request. Editors see their draft content immediately, non-editors always get the cached published version.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Data Fetching Architecture for a Help Center Article Page"
        scenario={
          <span>
            You are architecting the article page for the Indeed Help Center at{" "}
            <code>/help/[category]/[slug]</code>. The requirements are: (1) articles must be
            statically generated for SEO and performance, (2) content updates must be visible within
            minutes of an editor publishing, (3) editors must be able to preview unpublished drafts
            before they go live, (4) if an article URL doesn't exist or isn't published, the user
            must get a proper 404, and (5) new articles published after the last build must be
            accessible without a rebuild.
          </span>
        }
        tasks={[
          "Choose the rendering strategy (SSG/ISR/SSR/CSR) for the article page and justify it — specifically address the 'minutes of an editor publishing' requirement",
          "Describe the generateStaticParams implementation: what does it fetch from Contentstack, and what does it return?",
          "Design the on-demand revalidation webhook handler: what does it validate, what does it revalidate, and how does it handle partial content types (article vs category)?",
          "Implement the Draft Mode enable endpoint and explain how the article page detects whether it should fetch from Delivery API or Preview API",
          "Describe the error boundaries: what happens when getArticle returns null vs when the Contentstack API throws a network error?",
        ]}
        pitfalls={[
          "Using SSR instead of ISR+webhook — SSR eliminates caching and forces every user to wait for a Contentstack API call",
          "Not validating the webhook HMAC signature — any caller can trigger revalidation and cause cache stampedes",
          "Hardcoding revalidation intervals the same for all page types — listing pages need shorter TTLs than article pages",
          "Fetching from the Preview API in production without the Draft Mode cookie — could expose draft content to end users",
        ]}
        signal="A strong answer chooses ISR with on-demand revalidation (not SSR), describes the webhook signature verification, correctly uses draftMode() to switch between Delivery and Preview APIs, and handles notFound() vs error boundary as separate concerns."
      />
    </div>
  );
}
