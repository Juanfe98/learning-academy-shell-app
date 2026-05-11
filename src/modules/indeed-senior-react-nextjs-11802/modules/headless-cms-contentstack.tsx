import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const architectureDiagram = String.raw`flowchart TD
    ORG["Organization\n(your company account)"]
    STACK["Stack\n(project workspace — e.g. 'Help Center')"]
    ENV_DEV["Environment: development"]
    ENV_STG["Environment: staging"]
    ENV_PRD["Environment: production"]
    CT["Content Type\n(Article, Category, Author, FAQ)"]
    ENTRY["Entry\n(individual piece of content)"]
    ASSET["Asset\n(images, PDFs, videos)"]

    ORG --> STACK
    STACK --> ENV_DEV
    STACK --> ENV_STG
    STACK --> ENV_PRD
    STACK --> CT
    CT --> ENTRY
    STACK --> ASSET`;

const deliveryFlowDiagram = String.raw`sequenceDiagram
    participant E as Editor
    participant CS as Contentstack CMS
    participant CDN as Contentstack CDN
    participant NX as Next.js (ISR)
    participant BR as Browser

    E->>CS: Publishes entry
    CS->>CDN: Pushes published content
    CS->>NX: Fires webhook (cache invalidation)
    NX->>NX: revalidatePath('/help/[slug]')
    BR->>NX: User requests article page
    NX->>CDN: Fetches fresh entry via Delivery API
    CDN-->>NX: Returns entry JSON
    NX-->>BR: Renders HTML (cached for next request)`;

export const toc: TocItem[] = [
  { id: "what-is-headless", title: "What Headless CMS Is and Why It Exists", level: 2 },
  { id: "contentstack-architecture", title: "Contentstack Architecture", level: 2 },
  { id: "content-types", title: "Content Type Design", level: 2 },
  { id: "field-types", title: "Field Types and When to Use Each", level: 3 },
  { id: "references-vs-blocks", title: "References vs Modular Blocks vs Global Fields", level: 3 },
  { id: "delivery-vs-management", title: "Delivery API vs Management API vs GraphQL", level: 2 },
  { id: "editorial-workflow", title: "Editorial Workflows and Publishing", level: 2 },
  { id: "preview-and-draft", title: "Preview Environments and Draft Mode", level: 3 },
  { id: "environments-branching", title: "Environments and Content Branching", level: 3 },
  { id: "webhooks", title: "Webhooks for Cache Invalidation", level: 2 },
  { id: "schema-migration", title: "Content Model Migration Strategies", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function HeadlessCmsContentstack() {
  return (
    <div className="article-content">
      <p>
        Contentstack is the headless CMS at the center of the Indeed Help Center role. Every architectural
        decision — which rendering mode to use, how to cache content, how to handle previews — flows
        from understanding how Contentstack structures and delivers content. This module builds the
        complete mental model.
      </p>

      <h2 id="what-is-headless">What Headless CMS Is and Why It Exists</h2>
      <p>
        Traditional CMS platforms like WordPress couple content storage with a rendering engine. The
        same system that editors use to write articles also generates HTML pages. This coupling creates
        three compounding problems at scale: the frontend is locked to the CMS's templating language,
        content cannot be reused across channels (web, mobile, voice), and the CMS becomes a
        performance bottleneck because every page view hits the database.
      </p>
      <p>
        A headless CMS removes the rendering layer entirely. It is purely a content repository with an
        API. Editors use a structured authoring interface (like Contentstack's web app) to create and
        manage content. Developers consume that content through REST or GraphQL APIs and render it using
        whatever frontend technology they choose — in our case, Next.js. The "head" (the frontend) is
        decoupled from the "body" (the content store).
      </p>
      <p>
        The concrete benefits for a Help Center: articles authored in Contentstack are served as JSON
        to Next.js, which pre-renders them at build time (SSG) or on first request (ISR) and caches
        the HTML at the CDN edge. Article pages load in milliseconds. Editors never touch production
        servers.
      </p>

      <h2 id="contentstack-architecture">Contentstack Architecture</h2>
      <MermaidDiagram
        chart={architectureDiagram}
        title="Contentstack Hierarchy"
        caption="Every piece of content lives inside a Stack. Environments control which published content your Next.js app fetches. Content Types define schema; Entries are instances of that schema."
        minHeight={480}
      />

      <p>
        The key hierarchy to internalize:
      </p>
      <ul>
        <li>
          <strong>Organization</strong> — your company's root account. Billing, user management, and
          stack creation happen here.
        </li>
        <li>
          <strong>Stack</strong> — a self-contained workspace for a project. The Help Center is one
          Stack. It has its own content types, entries, assets, environments, and API keys.
        </li>
        <li>
          <strong>Content Types</strong> — the schemas that define the shape of content. Think of them
          as database tables. "Article", "Category", "Author" are all Content Types in a Help Center.
        </li>
        <li>
          <strong>Entries</strong> — individual pieces of content that conform to a Content Type.
          An Entry is a single article, one category, one author.
        </li>
        <li>
          <strong>Assets</strong> — binary files (images, PDFs, videos) managed separately from
          Entries but referenceable from them. Stored on Contentstack's CDN.
        </li>
        <li>
          <strong>Environments</strong> — named deployment targets (development, staging, production).
          An Entry must be published to a specific environment before it appears in that environment's
          API responses.
        </li>
      </ul>

      <h2 id="content-types">Content Type Design</h2>
      <p>
        Content Type design is the most consequential architectural decision in a headless CMS project.
        A poor schema forces engineers to work around it for years. The goal is a schema that maps
        cleanly to your UI components while remaining flexible enough for editors to express their
        intent without developer involvement.
      </p>
      <p>
        For a Help Center, start with these foundational Content Types:
      </p>

      <pre>
        <code>{`// Article Content Type fields (representative)
{
  "title": "Single Line Text",      // required, unique — becomes the URL slug source
  "slug": "URL",                    // required, unique — /help/[category]/[slug]
  "body": "JSON Rich Text Editor",  // required — full article body with embedded entries
  "summary": "Multi Line Text",     // optional — for SEO meta description + listing cards
  "featured_image": "File",         // optional — article hero image (Asset reference)
  "author": "Reference → Author",   // required — single Author entry reference
  "category": "Reference → Category", // required — single Category entry reference
  "tags": "Tags",                   // optional — free-form tags for filtering
  "related_articles": "Reference → Article", // optional — array of up to 5 Articles
  "seo_title": "Single Line Text",  // optional — overrides <title> when set
  "seo_description": "Multi Line Text", // optional — overrides meta description
  "published_date": "Date",         // required — for display and sitemap priority
  "reading_time": "Number",         // optional — calculated at publish time
  "layout_blocks": "Modular Blocks" // optional — flexible page sections below the body
}`}</code>
      </pre>

      <h3 id="field-types">Field Types and When to Use Each</h3>

      <ArticleTable caption="Contentstack field types — field type, use case, GraphQL output type, and common gotchas." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Field Type</th>
              <th>Use Case</th>
              <th>GraphQL Output</th>
              <th>Gotcha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Single Line Text</strong></td>
              <td>Titles, slugs, short labels</td>
              <td><code>String</code></td>
              <td>Max 255 chars; uniqueness must be set manually</td>
            </tr>
            <tr>
              <td><strong>Multi Line Text</strong></td>
              <td>Summaries, meta descriptions</td>
              <td><code>String</code></td>
              <td>No formatting; use RTE for rich content</td>
            </tr>
            <tr>
              <td><strong>JSON Rich Text</strong></td>
              <td>Article body with formatting, embedded entries, tables</td>
              <td><code>JSON</code> (nested object)</td>
              <td>Not plain HTML; requires a custom renderer in Next.js</td>
            </tr>
            <tr>
              <td><strong>Number</strong></td>
              <td>Reading time, sort order, price</td>
              <td><code>Float</code></td>
              <td>No integer type; validate range manually</td>
            </tr>
            <tr>
              <td><strong>Boolean</strong></td>
              <td>Feature flags, pinned status, is_featured</td>
              <td><code>Boolean</code></td>
              <td>Defaults to false if not required — watch for unset fields</td>
            </tr>
            <tr>
              <td><strong>Date</strong></td>
              <td>Published date, last updated</td>
              <td><code>String</code> (ISO 8601)</td>
              <td>Timezone stored as UTC; display conversion is your responsibility</td>
            </tr>
            <tr>
              <td><strong>File</strong></td>
              <td>Hero images, attachments, videos</td>
              <td><code>SysAssetConnection</code></td>
              <td>References an Asset entry — always set width/height for CLS prevention</td>
            </tr>
            <tr>
              <td><strong>Reference</strong></td>
              <td>Author, category, related articles</td>
              <td>Object with nested fields</td>
              <td>Fetching nested references adds depth to queries; use sparingly</td>
            </tr>
            <tr>
              <td><strong>Modular Blocks</strong></td>
              <td>Flexible page sections (hero, CTA, FAQ list)</td>
              <td>Array of union types</td>
              <td>Each block type needs its own component in the registry</td>
            </tr>
            <tr>
              <td><strong>Global Field</strong></td>
              <td>Reusable schema groups (SEO fields, social links)</td>
              <td>Inlined as nested object</td>
              <td>Changes to global field affect ALL content types using it</td>
            </tr>
            <tr>
              <td><strong>URL</strong></td>
              <td>Slugs, external links</td>
              <td><code>String</code></td>
              <td>Contentstack validates URL format; use for slugs with auto-generation</td>
            </tr>
            <tr>
              <td><strong>Tags</strong></td>
              <td>Free-form categorization</td>
              <td><code>[String]</code></td>
              <td>No taxonomy enforcement — editors can create typos; consider a Select field instead</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="references-vs-blocks">References vs Modular Blocks vs Global Fields</h3>
      <p>
        These three abstraction mechanisms serve different purposes, and using the wrong one creates
        maintenance pain.
      </p>

      <pre>
        <code>{`// Reference: when content has its own lifecycle and is reused across entries
// - Author is referenced by many Articles
// - Category is referenced by many Articles
// - If the author's name changes, it updates everywhere automatically
// Use Reference when: the content entity stands alone and is reused

// Modular Blocks: when page sections vary by article (flexible layouts)
// - An article might have: hero_section, article_body, cta_banner, related_articles
// - Another article has:   hero_section, article_body, faq_section
// - Each block type is independent with its own field schema
// Use Modular Blocks when: page composition varies, editors choose section order

// Global Field: when a schema pattern repeats across Content Types
// - SEO fields (seo_title, seo_description, og_image) appear on Article AND Category AND Page
// - Define them once as a Global Field, include in multiple Content Types
// - WARNING: editing the global field schema affects every Content Type that includes it
// Use Global Field when: identical schema group must stay in sync across types`}</code>
      </pre>

      <h2 id="delivery-vs-management">Delivery API vs Management API vs GraphQL</h2>

      <ArticleTable caption="Three APIs serve three distinct purposes. Choosing the wrong one for a use case is a common architectural mistake." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>API</th>
              <th>Purpose</th>
              <th>Authentication</th>
              <th>Rate Limits</th>
              <th>Use Cases</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Delivery API</strong></td>
              <td>Read published content for production frontends. CDN-backed, highly cacheable.</td>
              <td>Delivery API Key (public, safe to expose)</td>
              <td>High (CDN cached — essentially unlimited for reads)</td>
              <td>Fetch article content in Next.js SSG/ISR pages, listing pages, search</td>
            </tr>
            <tr>
              <td><strong>Preview API</strong></td>
              <td>Read draft + published content for editorial previews. Same shape as Delivery.</td>
              <td>Preview API Key (keep server-side only)</td>
              <td>Moderate (no CDN caching — hits database)</td>
              <td>Next.js Draft Mode — editors preview unpublished content</td>
            </tr>
            <tr>
              <td><strong>GraphQL API</strong></td>
              <td>Typed, auto-generated GraphQL schema over your content types. Supports Delivery and Preview.</td>
              <td>Delivery or Preview API Key in headers</td>
              <td>Same as Delivery/Preview — depends on environment</td>
              <td>Complex nested queries, fragment colocation, Apollo Client integration</td>
            </tr>
            <tr>
              <td><strong>Management API</strong></td>
              <td>Create, update, publish, unpublish entries. Full CRUD. Never for frontend reads.</td>
              <td>Management Token or OAuth (never in client bundles)</td>
              <td>Low — strict per-minute caps, not CDN backed</td>
              <td>CI/CD scripts, content migrations, programmatic entry creation, webhook setup</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="editorial-workflow">Editorial Workflows and Publishing</h2>
      <p>
        Contentstack's default entry lifecycle: <strong>Draft</strong> (created, being edited) →{" "}
        <strong>Review</strong> (optional; Workflows feature) → <strong>Published</strong> (visible
        in the specified environment). Entries can be published to multiple environments independently
        — an article can be published to staging but not production.
      </p>
      <p>
        Scheduled publishing allows editors to set a future publish date. The Contentstack scheduler
        publishes the entry at the scheduled time, which fires a webhook that your Next.js app uses
        to invalidate the ISR cache. Without webhooks, the article would not appear until the next
        natural ISR revalidation interval.
      </p>

      <h3 id="preview-and-draft">Preview Environments and Draft Mode</h3>
      <p>
        The editor preview workflow with Next.js Draft Mode:
      </p>

      <pre>
        <code>{`// src/app/api/preview/route.ts — enable draft mode
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  // Validate the secret token matches your Contentstack preview webhook secret
  if (secret !== process.env.CONTENTSTACK_PREVIEW_SECRET) {
    return new Response("Invalid token", { status: 401 });
  }

  // Enable draft mode — sets a cookie on the response
  (await draftMode()).enable();

  // Redirect to the article being previewed
  redirect(\`/help/\${slug}\`);
}

// src/app/api/preview/disable/route.ts — disable draft mode
import { draftMode } from "next/headers";

export async function GET() {
  (await draftMode()).disable();
  redirect("/");
}

// In your article page — use Preview API key when draft mode is active
import { draftMode } from "next/headers";
import { getArticle, getArticlePreview } from "@/lib/contentstack";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled } = await draftMode();

  // Switch data source based on draft mode
  const article = isEnabled
    ? await getArticlePreview(slug)   // hits Preview API, returns drafts
    : await getArticle(slug);          // hits Delivery API CDN, published only

  if (!article) notFound();

  return <ArticleContent article={article} isDraft={isEnabled} />;
}`}</code>
      </pre>

      <h3 id="environments-branching">Environments and Content Branching</h3>
      <p>
        Each Contentstack environment has its own Delivery API key. Your Next.js deployment
        configuration should map deployment environments to Contentstack environments:
      </p>
      <ul>
        <li><strong>Local dev</strong> → Contentstack "development" environment API key</li>
        <li><strong>Preview / staging deployment</strong> → Contentstack "staging" environment API key</li>
        <li><strong>Production deployment</strong> → Contentstack "production" environment API key</li>
      </ul>
      <p>
        Contentstack also supports <strong>branches</strong> (an advanced feature) — similar to Git
        branches for content models. You can fork a branch, modify content types, and merge back.
        This is valuable when evolving content schemas: develop and test schema changes on a branch
        before merging to main. Most teams with fewer than 50 content types can manage without
        branches.
      </p>

      <h2 id="webhooks">Webhooks for Cache Invalidation</h2>
      <MermaidDiagram
        chart={deliveryFlowDiagram}
        title="Content Delivery and Cache Invalidation Flow"
        caption="When an editor publishes, Contentstack fires a webhook that triggers Next.js on-demand revalidation. Without this, article updates are invisible until the ISR TTL expires."
        minHeight={420}
      />

      <pre>
        <code>{`// src/app/api/revalidate/route.ts — Contentstack webhook handler
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Validate the webhook signature from Contentstack
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.CONTENTSTACK_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content_type_uid, data } = body;

  if (content_type_uid === "article") {
    const slug = data?.entries?.[0]?.url;
    if (slug) {
      // Revalidate the specific article page
      revalidatePath(\`/help/\${slug}\`);
    }
    // Also revalidate listing pages that show article cards
    revalidatePath("/help");
    revalidateTag("articles"); // if you're using fetch cache tags
  }

  if (content_type_uid === "category") {
    revalidatePath("/help");
    revalidatePath(\`/help/\${data?.entries?.[0]?.url}\`);
  }

  return Response.json({ revalidated: true, timestamp: new Date().toISOString() });
}`}</code>
      </pre>

      <h2 id="schema-migration">Content Model Migration Strategies</h2>
      <p>
        Content model schemas evolve, and production entries must not break during migrations.
        The principles:
      </p>
      <ol>
        <li>
          <strong>Never remove a required field without a migration period.</strong> First make the
          field optional, deploy the new Next.js code that handles the absence, wait for all entries
          to be updated, then remove the field.
        </li>
        <li>
          <strong>Adding fields is safe.</strong> New optional fields return null/undefined for old
          entries — write defensive code that handles both.
        </li>
        <li>
          <strong>Renaming fields is a two-step process.</strong> Add the new field, write a Management
          API script to copy all values from old field to new field across all entries, update the
          Next.js code to read the new field name, then remove the old field.
        </li>
        <li>
          <strong>Use branches for major schema refactors.</strong> Develop the new schema on a branch,
          test with a staging Next.js deployment, merge when validated.
        </li>
      </ol>

      <pre>
        <code>{`// Management API script to migrate all entries during a field rename
// Run this in CI or as a one-time script — never in production Next.js code
import contentstack from "@contentstack/management";

const client = contentstack.client({ authtoken: process.env.CS_MANAGEMENT_TOKEN });
const stack = client.stack({ api_key: process.env.CS_API_KEY });

async function migrateFieldName() {
  let skip = 0;
  const limit = 100;

  while (true) {
    const { items } = await stack
      .contentType("article")
      .entry()
      .query({ skip, limit })
      .find();

    if (items.length === 0) break;

    for (const entry of items) {
      if (entry.old_summary_field) {
        // Copy value from old field to new field
        entry.article_summary = entry.old_summary_field;
        await entry.update();
      }
    }

    skip += limit;
    console.log(\`Migrated \${skip} entries...\`);
  }

  console.log("Migration complete.");
}

migrateFieldName().catch(console.error);`}</code>
      </pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through how you'd design the content model for a Help Center'"
        intro="This question tests whether you think in CMS concepts, not just database schemas. Lead with structure, explain tradeoffs on each decision, and show you understand how the model maps to the frontend."
        steps={[
          "Start with the core entities: Article, Category, Author, FAQ. Explain that these are your Content Types — the schemas that all content conforms to.",
          "Walk through the Article content type field by field: slug (URL field, required, unique), body (JSON Rich Text, not a text area — because you need embedded entries and formatting), author (Reference to Author, not a text field — because the author's bio and avatar are reused), category (Reference to Category, not a tag).",
          "Explain the Modular Blocks decision: the article body covers standard content, but some articles need special layouts (hero sections, CTA banners, FAQs). Modular Blocks let editors compose these sections without developer involvement. Each block type maps 1:1 to a React component.",
          "Address SEO fields: use a Global Field for seo_title, seo_description, og_image — this schema group is reused on Article, Category, and static Page content types. If the SEO requirements change, updating the Global Field propagates everywhere.",
          "Close with the workflow question: how does an article go from draft to live? Editors draft → optional review step → publish to staging environment → QA → publish to production → webhook fires → Next.js revalidates the article page's ISR cache.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Design the Contentstack Content Model for an Indeed Help Center"
        scenario={
          <span>
            You are joining a team that is migrating the Indeed Help Center from a legacy WordPress
            monolith to a headless stack with Contentstack and Next.js. The Help Center has: articles
            in multiple categories, each article has an author, articles can reference other related
            articles, some articles have special flexible layouts (hero image + body + CTA + FAQ
            section), and all content needs SEO metadata. The migration must not break existing article
            URLs.
          </span>
        }
        tasks={[
          "Design the full set of Content Types (name each type and list its fields with field types)",
          "For the Article content type: decide which fields use Reference vs Modular Blocks vs plain text, and justify each decision",
          "Design the Modular Blocks schema for the flexible article layout — list the block types and the fields each block needs",
          "Explain how you would handle SEO metadata fields across Article, Category, and static Page content types without duplicating the schema",
          "Describe the webhook strategy: when a category name changes, which Next.js pages need to be revalidated and why",
        ]}
        pitfalls={[
          "Using plain text fields for author name instead of a Reference — the author's profile will get out of sync across articles",
          "Putting everything in Modular Blocks — it removes structure that editors need for required fields like title and published date",
          "Forgetting that field renames require a migration script — planning to 'just rename it' will break production entries",
          "Not setting uniqueness constraints on the slug field — duplicate slugs cause 404s in production",
        ]}
        signal="A strong answer names specific Contentstack field types (not generic concepts), explains why References beat text fields for relational data, knows the difference between Modular Blocks and Global Fields, and closes with the webhook invalidation chain — showing they understand the full content lifecycle from CMS to CDN."
      />
    </div>
  );
}
