import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const middlewareFlowDiagram = String.raw`flowchart TD
    REQ["Incoming Request\n/help/[slug]"]
    COOKIE{"Cookie: ab_bucket\nexists?"}
    READ["Read bucket from cookie\n'control' | 'variant'"]
    ASSIGN["assignBucket(request)\nhash(visitor_id) % 2"]
    EVAL["Evaluate flag:\nbucket === 'variant'?"]
    REWRITE_V["Rewrite to\n/help/v2/[slug]\n(variant route)"]
    REWRITE_C["Serve original\n/help/[slug]\n(control route)"]
    SET_COOKIE["Set ab_bucket cookie\nmaxAge: 30 days"]
    RENDER["Render page\n(Next.js handles normally)"]

    REQ --> COOKIE
    COOKIE -->|"Yes"| READ
    COOKIE -->|"No"| ASSIGN
    ASSIGN --> SET_COOKIE
    SET_COOKIE --> EVAL
    READ --> EVAL
    EVAL -->|"Yes"| REWRITE_V
    EVAL -->|"No"| REWRITE_C
    REWRITE_V --> RENDER
    REWRITE_C --> RENDER`;

const testLifecycleDiagram = String.raw`flowchart LR
    H["Design Hypothesis\n'Sidebar TOC improves\nscroll depth'"]
    I["Implement Variants\ncontrol + variant routes\n+ middleware flag"]
    S["Ship to % of Traffic\nstart at 10%, ramp to 50%"]
    C["Collect Metrics\nscroll depth, time on page,\nfeedback thumbs, support tickets"]
    SIG{"Statistical\nSignificance\n95% confidence?"}
    WAIT["Wait Longer\nneed more samples"]
    DECIDE{"Variant\nwins?"}
    SHIP["Ship Variant\nremove control route\ndelete flag + middleware"]
    ROLLBACK["Roll Back\nremove variant route\ndelete flag + middleware"]

    H --> I --> S --> C --> SIG
    SIG -->|"No"| WAIT
    WAIT --> C
    SIG -->|"Yes"| DECIDE
    DECIDE -->|"Yes"| SHIP
    DECIDE -->|"No"| ROLLBACK`;

export const toc: TocItem[] = [
  { id: "why-feature-flags", title: "Feature Flags: Decouple Deploy from Release", level: 2 },
  { id: "flags-in-middleware", title: "Flag Evaluation in Next.js Middleware", level: 2 },
  { id: "bucket-assignment", title: "Deterministic Bucket Assignment", level: 3 },
  { id: "persisting-bucket", title: "Persisting the Bucket Across Sessions", level: 3 },
  { id: "flag-tools", title: "Feature Flag Tools", level: 2 },
  { id: "cms-ab-testing", title: "A/B Testing CMS Content Variants", level: 2 },
  { id: "cleanup-lifecycle", title: "Test Lifecycle and Technical Debt", level: 2 },
  { id: "interview-framing", title: "Interview Playbook", level: 2 },
  { id: "key-takeaways", title: "Interview Challenge", level: 2 },
];

export default function AbTestingFeatureFlags() {
  return (
    <div className="article-content">
      <p>
        Feature flags and A/B testing are how product teams at Indeed ship experiments safely. The
        naive approach — ship the new UI and hope it works — forfeits the ability to roll back and
        makes measuring impact impossible. This module covers implementing A/B tests at the Edge
        with Next.js Middleware, deterministic bucket assignment, and the full test lifecycle from
        hypothesis to cleanup.
      </p>

      <h2 id="why-feature-flags">Feature Flags: Decouple Deploy from Release</h2>
      <p>
        A feature flag separates the act of <em>deploying</em> code from the act of{" "}
        <em>releasing</em> it to users. The code ships to production but runs only for the
        percentage of users you target. This gives you three superpowers:
      </p>
      <ol>
        <li>
          <strong>Instant rollback.</strong> Toggle the flag off — no deploy needed. A broken
          variant is live for minutes, not hours.
        </li>
        <li>
          <strong>Controlled rollout.</strong> Expose 1% of users first. If metrics look good,
          ramp to 10%, then 50%, then 100%.
        </li>
        <li>
          <strong>Measurable impact.</strong> Control and variant groups are defined before the
          experiment, so you can attribute metric changes to the specific change being tested.
        </li>
      </ol>
      <p>
        For a Help Center, this matters because article layout changes affect SEO signals, bounce
        rates, and support ticket volume — high-stakes metrics where you cannot afford to find out
        after a full rollout that the change was harmful.
      </p>

      <h2 id="flags-in-middleware">Flag Evaluation in Next.js Middleware</h2>
      <MermaidDiagram
        chart={middlewareFlowDiagram}
        title="Feature Flag Evaluation in Next.js Edge Middleware"
        caption="Middleware runs at the Edge before the page renders. It reads the bucket from a cookie (or assigns a new one), then rewrites the request URL to the control or variant route — zero latency added to the user-visible response."
        minHeight={560}
      />

      <p>
        Next.js Middleware runs at the Edge — before the request hits any server. It is the right
        place to evaluate feature flags because it can rewrite URLs, set cookies, and redirect
        without adding backend latency. The critical constraint: Middleware must use only the{" "}
        <strong>Edge Runtime</strong> (no Node.js-specific APIs like <code>fs</code> or{" "}
        <code>crypto.createHash</code> — use the Web Crypto API instead).
      </p>

      <pre>
        <code>{`// src/middleware.ts — feature flag evaluation at the Edge
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/help/:path*"], // only run on Help Center routes
};

export function middleware(request: NextRequest) {
  // 1. Check for existing bucket assignment (returning visitor)
  const existingBucket = request.cookies.get("ab_bucket")?.value as
    | "control"
    | "variant"
    | undefined;

  const bucket = existingBucket ?? assignBucket(request);

  // 2. Rewrite the URL based on the bucket assignment
  const url = request.nextUrl.clone();

  if (bucket === "variant") {
    // Replace /help/... with /help/v2/... — the variant layout
    url.pathname = url.pathname.replace("/help/", "/help/v2/");
  }
  // "control" gets the original URL unchanged

  const response = NextResponse.rewrite(url);

  // 3. Persist the bucket in a cookie for consistent UX across sessions
  if (!existingBucket) {
    response.cookies.set("ab_bucket", bucket, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,             // not accessible to JS — prevents tampering
      sameSite: "lax",
    });
  }

  // 4. Pass the bucket to the page as a header for analytics
  response.headers.set("x-ab-bucket", bucket);

  return response;
}

function assignBucket(req: NextRequest): "control" | "variant" {
  // Use a stable visitor ID if available (e.g., from auth or a prior cookie)
  const visitorId =
    req.cookies.get("visitor_id")?.value ??
    req.headers.get("x-forwarded-for") ??
    "anonymous";

  return hashToVariant(visitorId);
}

async function hashToVariant(input: string): Promise<"control" | "variant"> {
  // Edge-compatible: Web Crypto API (no Node.js crypto module)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  // Use the last byte as the bucket selector: 0–127 = control, 128–255 = variant
  return hashArray[hashArray.length - 1] < 128 ? "control" : "variant";
}

// Simpler synchronous approach (good enough for most uses):
function hashToVariantSync(input: string): "control" | "variant" {
  // Simple string hash — deterministic without async Web Crypto
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // convert to 32-bit integer
  }
  return Math.abs(hash) % 2 === 0 ? "control" : "variant";
}`}</code>
      </pre>

      <h3 id="bucket-assignment">Deterministic Bucket Assignment</h3>
      <p>
        The key property of good bucket assignment is <strong>determinism</strong>: the same user
        always gets the same bucket, request after request, without consulting a database. This is
        why hashing the visitor ID works — a hash of the same input always produces the same output.
      </p>
      <p>
        What makes a good bucket key:
      </p>
      <ul>
        <li>
          <strong>Authenticated user ID</strong> — ideal. Perfectly stable across devices and
          sessions. Use this when you have it.
        </li>
        <li>
          <strong>Anonymous visitor cookie</strong> — good. Stable within a browser, lost on
          cookie clear. Set on first visit and reuse across sessions.
        </li>
        <li>
          <strong>IP address</strong> — poor. Changes frequently (mobile, VPN, office network).
          Use only as a last resort.
        </li>
      </ul>

      <pre>
        <code>{`// For traffic split percentages other than 50/50:
// Scale the bucket key space to your desired ratio

function assignBucketWeighted(
  input: string,
  variantPercent: number // e.g. 10 for 10% variant traffic
): "control" | "variant" {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  // Map hash to 0–99, compare against the variant percent threshold
  return Math.abs(hash) % 100 < variantPercent ? "variant" : "control";
}

// 10% variant traffic:
assignBucketWeighted(userId, 10); // 10% get "variant", 90% get "control"

// 50% variant traffic:
assignBucketWeighted(userId, 50); // even split`}</code>
      </pre>

      <h3 id="persisting-bucket">Persisting the Bucket Across Sessions</h3>
      <p>
        Without persistence, a user would switch between control and variant on every page load —
        an inconsistent experience that also corrupts your metrics (the same user appears in both
        groups). Store the bucket in an <code>httpOnly</code> cookie so the assignment is stable
        across the entire experiment duration.
      </p>

      <pre>
        <code>{`// Send the bucket as an analytics property on every page view
// This happens client-side after the page renders

// src/components/analytics/AbBucketReporter.tsx — Client Component
"use client";

import { useEffect } from "react";

interface Props {
  bucket: "control" | "variant";
  experimentId: string;
}

export function AbBucketReporter({ bucket, experimentId }: Props) {
  useEffect(() => {
    // Fire on first render — bucket is already determined server-side
    window.analytics?.track("experiment_viewed", {
      experimentId,
      bucket,
      timestamp: new Date().toISOString(),
    });
  }, [bucket, experimentId]);

  return null; // no UI — pure analytics side effect
}

// In the article page layout (Server Component):
import { headers } from "next/headers";

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const bucket = (headersList.get("x-ab-bucket") ?? "control") as "control" | "variant";

  return (
    <>
      {children}
      <AbBucketReporter bucket={bucket} experimentId="help-toc-layout-v1" />
    </>
  );
}`}</code>
      </pre>

      <h2 id="flag-tools">Feature Flag Tools</h2>
      <ArticleTable
        caption="Feature flag tools vary significantly in cost, Edge compatibility, and CMS integration support. Choose based on your scale and whether you need real-time flag updates."
        minWidth={940}
      >
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Cost</th>
              <th>Edge Runtime</th>
              <th>Real-time Updates</th>
              <th>CMS Integration</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>LaunchDarkly</strong></td>
              <td>$$$$ (enterprise pricing)</td>
              <td>Yes — Edge SDK available</td>
              <td>Yes — streaming flag evaluation</td>
              <td>Custom webhooks</td>
              <td>Enterprise, complex targeting, full audit trail</td>
            </tr>
            <tr>
              <td><strong>Unleash</strong></td>
              <td>Free (self-hosted) / $ (cloud)</td>
              <td>Partial — needs HTTP proxy for Edge</td>
              <td>Yes — polling or SSE</td>
              <td>Custom integration</td>
              <td>Self-hosted, cost-sensitive, open source</td>
            </tr>
            <tr>
              <td><strong>Optimizely</strong></td>
              <td>$$$ (enterprise)</td>
              <td>Yes — Edge Agent</td>
              <td>Yes</td>
              <td>Native CMS integrations</td>
              <td>Marketing-focused, full experimentation platform</td>
            </tr>
            <tr>
              <td><strong>Homegrown (Middleware + DB/KV)</strong></td>
              <td>Free (infra cost only)</td>
              <td>Yes — you control the code</td>
              <td>On restart or cache TTL</td>
              <td>Native — you build it</td>
              <td>Simple 50/50 splits, no vendor lock-in, small team</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        For a Help Center at Indeed scale, the pragmatic choice is a managed service like
        LaunchDarkly or Optimizely: they handle the flag evaluation SDK, targeting rules,
        analytics integrations, and flag cleanup reminders. The homegrown approach is appropriate
        when you have a small number of simple 50/50 experiments and want to avoid vendor cost.
      </p>

      <h2 id="cms-ab-testing">A/B Testing CMS Content Variants</h2>
      <p>
        The most powerful application of feature flags for a CMS-backed Help Center is testing
        content variants without changing code. Both variants live in Contentstack as separate
        entries; the middleware selects which entry to fetch based on the user's bucket.
      </p>

      <pre>
        <code>{`// Strategy: two Contentstack entries for the same article, tagged by variant
// contentstack entry: article-billing-update-v1 (control layout)
// contentstack entry: article-billing-update-v2 (variant layout — sidebar TOC)

// src/app/help/[category]/[slug]/page.tsx
import { headers } from "next/headers";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const headersList = await headers();
  const bucket = headersList.get("x-ab-bucket") ?? "control";

  // Fetch the CMS entry for the appropriate variant
  // The variant slug convention: /help/billing/update-billing-v2 for variant
  const articleSlug =
    bucket === "variant"
      ? \`/help/\${category}/\${slug}-v2\`  // variant entry
      : \`/help/\${category}/\${slug}\`;     // control entry

  const article = await getArticle(articleSlug);

  // Fallback to control if variant entry doesn't exist yet
  const finalArticle = article ?? await getArticle(\`/help/\${category}/\${slug}\`);
  if (!finalArticle) notFound();

  return (
    <ArticleContent
      article={finalArticle}
      experimentBucket={bucket as "control" | "variant"}
    />
  );
}

// Advantages of the CMS variant approach:
// 1. Content editors can manage variant copy without code changes
// 2. Each variant can have completely different layout, images, or copy
// 3. Variant goes through the same CMS review/approval workflow as regular content
// 4. Cleanup is simple: unpublish the losing variant entry + remove middleware rule`}</code>
      </pre>

      <h2 id="cleanup-lifecycle">Test Lifecycle and Technical Debt</h2>
      <MermaidDiagram
        chart={testLifecycleDiagram}
        title="A/B Test Lifecycle Flowchart"
        caption="Every experiment must have a defined cleanup path. Forgotten flags accumulate as technical debt — middleware complexity, dead code branches, and cognitive overhead for future developers."
        minHeight={480}
      />

      <p>
        The most common A/B testing mistake in production codebases is skipping the cleanup step.
        Flags that ran for months and were never removed create a graveyard of zombie middleware
        conditions and dead route handlers. Establish a rule: every flag has an expiry date set
        at creation. After the experiment concludes, cleanup is a mandatory ticket in the same
        sprint.
      </p>

      <pre>
        <code>{`// Cleanup checklist after an experiment concludes:

// 1. Remove the middleware rule for this experiment
// BEFORE:
if (pathname.startsWith("/help/")) {
  const bucket = getBucket(request, "help-toc-layout-v1");
  if (bucket === "variant") {
    url.pathname = url.pathname.replace("/help/", "/help/v2/");
  }
}
// AFTER: delete those lines

// 2. Delete the losing variant route
// rm -rf src/app/help/v2/

// 3. Unpublish the losing CMS variant entries in Contentstack

// 4. Remove the experiment's analytics event from tracking
// Delete: window.analytics.track("experiment_viewed", { experimentId: "help-toc-layout-v1" })

// 5. Remove the ab_bucket cookie reference (if experiment-specific)
// If using a universal bucket cookie, you may keep it for the next experiment

// 6. Archive experiment results in your analytics platform or a decision log
// Document: hypothesis, result, decision, who approved, when cleaned up

// What NOT to leave behind:
// ❌ Dead "variant" route at /help/v2/ with no middleware routing to it
// ❌ Middleware condition for an experiment that no longer exists
// ❌ AbBucketReporter sending events for a concluded experiment
// ❌ Feature flag in LaunchDarkly with status "legacy" — delete it`}</code>
      </pre>

      <h2 id="interview-framing">Interview Playbook</h2>
      <InterviewPlaybook
        title="How would you implement an A/B test on a Next.js Help Center article page?"
        intro="This question tests your ability to implement experiments at the infrastructure level, not just in product code. The correct answer uses Middleware for Edge-level routing without page-level complexity."
        steps={[
          "Start with the architecture: Next.js Middleware runs at the Edge before any page renders. It reads a bucket assignment cookie, or assigns one on first visit using a hash of the visitor ID. It then rewrites the request URL to either the control route (/help/[slug]) or the variant route (/help/v2/[slug]).",
          "Explain bucket assignment: hash the visitor ID (or anonymous ID from a cookie) to a number, then mod by 100 to get a percentage. Compare against the desired traffic split. The hash must be deterministic — the same visitor always gets the same bucket.",
          "Explain cookie persistence: store the bucket in an httpOnly cookie with a 30-day maxAge. Without this, the same user would randomly switch between control and variant on every request — corrupting your metrics.",
          "Explain metrics collection: pass the bucket as a request header (x-ab-bucket) from Middleware. The layout component reads it and fires an analytics event on first render. Track: scroll depth, time on page, feedback submissions, and downstream support ticket volume.",
          "Close with cleanup: every experiment must have a defined end date and a cleanup ticket. Lingering middleware conditions and dead routes are technical debt. After the experiment concludes, remove the middleware rule, delete the losing variant, and archive the result.",
        ]}
      />

      <h2 id="key-takeaways">Interview Challenge</h2>
      <InterviewChallenge
        title="Design an A/B Test for a Help Center Article Layout"
        scenario={
          <span>
            The product team hypothesizes that a <strong>sidebar table of contents</strong> (fixed
            to the right side of the article) will improve reading comprehension vs. the current{" "}
            <strong>inline TOC</strong> (rendered at the top of the article body). You have been
            asked to design and implement this A/B test for the Indeed Help Center. The test should
            run for 2 weeks with 50% of users in each group.
          </span>
        }
        tasks={[
          "Design the middleware implementation: which routes does it match, how do you assign users to control vs variant, and how do you ensure a user always sees the same layout?",
          "Describe the variant route architecture: does the variant share the same page component with conditional rendering, or is it a separate route at /help/v2/[category]/[slug]? What are the tradeoffs of each approach?",
          "Define the success metrics: what are your primary metric (the one that determines the winner), your guardrail metrics (things that must not get worse), and your sample size requirement for 95% confidence?",
          "Design the cleanup plan: the sidebar TOC wins. List every change you make to the codebase and Contentstack to remove the control variant and the experiment infrastructure.",
          "An engineer notices that 3% of users are switching between control and variant on consecutive page loads despite the cookie being set. Debug this: what is the most likely cause, and how do you fix it?",
        ]}
        pitfalls={[
          "Using searchParams or URL parameters to assign the bucket — this leaks experiment state into the URL, is shareable (breaks assignment), and is indexable by search engines",
          "Running the experiment without setting a minimum sample size — declaring a winner after 50 visits is statistical noise, not signal",
          "Using the same cookie for all experiments without a namespace — if two experiments run simultaneously, they share the cookie and conflict",
          "Forgetting to send the bucket as an analytics property on every page view — you cannot analyze results if you don't know which group each event came from",
          "Never deleting the variant route after the experiment — in 6 months, a new engineer will not know if /help/v2/[slug] is active, deprecated, or a bug",
        ]}
        signal="A strong answer routes via Middleware (not page-level conditionals), uses a hashed visitor ID for deterministic assignment, persists the bucket in an httpOnly cookie, names scroll depth as the primary metric with support ticket volume as a guardrail, and describes a complete cleanup checklist covering middleware, routes, CMS entries, and analytics."
      />
    </div>
  );
}
