import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const strapiArchitectureDiagram = String.raw`flowchart TD
    subgraph ADMIN ["Admin Panel (localhost:1337/admin)"]
      CTB["Content Type Builder\n(visual schema editor)"]
      EM["Entry Manager\n(CRUD for content)"]
      WH["Webhook Manager\n(configure outbound webhooks)"]
      MED["Media Library\n(uploads)"]
    end

    subgraph SERVER ["Strapi Node.js Server"]
      CTB -->|"generates"| CT["Content Types\n(stored as JSON schema files)"]
      CT -->|"auto-generates"| REST["REST API\n(/api/:contentType)"]
      CT -->|"auto-generates"| GQL["GraphQL API\n(/graphql)\n@strapi/plugin-graphql"]
      DS["Document Service API\n(v5 — replaces Entity Service)"]
      REST --> DS
      GQL --> DS
    end

    subgraph DATA ["Data Layer"]
      DS --> PG["PostgreSQL\n(or MySQL)"]
      DS --> S3["File Storage\nAWS S3 / Cloudinary\n(upload provider plugin)"]
    end

    subgraph FRONTEND ["Next.js Frontend"]
      SC["Server Components\nfetch('/api/articles')"]
      WEB["Browser Client"]
    end

    REST -->|"Bearer token auth"| SC
    GQL -->|"Bearer token auth"| SC
    WH -->|"POST on publish/update"| NX["Next.js Route Handler\n/api/revalidate/strapi"]
    NX -->|"revalidatePath"| SC`;

const requestFlowDiagram = String.raw`sequenceDiagram
    participant BUILD as Build Time
    participant GSP as generateStaticParams
    participant PAGE as Article Page
    participant STRAPI as Strapi REST API
    participant ISR as ISR Cache
    participant WH as Strapi Webhook
    participant RH as Next.js Route Handler
    participant RP as revalidatePath

    BUILD->>GSP: Next.js calls generateStaticParams
    GSP->>STRAPI: GET /api/articles?fields[0]=slug&pagination[pageSize]=100
    STRAPI-->>GSP: [{ slug: 'getting-started' }, ...]
    GSP-->>BUILD: [{ slug: 'getting-started' }, ...]

    BUILD->>PAGE: Build /help/getting-started
    PAGE->>STRAPI: GET /api/articles?filters[slug][$eq]=getting-started&populate[author][populate][0]=avatar&populate[categories]=true
    STRAPI-->>PAGE: { data: [{ documentId, title, body, author: { name, avatar: { url } }, categories: [...] }] }
    PAGE-->>ISR: HTML cached

    Note over WH,RP: On-demand revalidation (after build)
    WH->>RH: POST { model: 'article', entry: { slug: 'getting-started' } }
    RH->>RP: revalidatePath('/help/getting-started')
    RP-->>ISR: Cache invalidated — next request regenerates`;

export const toc: TocItem[] = [
  { id: "strapi-mental-model", title: "Strapi Mental Model: Self-Hosted vs SaaS", level: 2 },
  { id: "content-type-builder", title: "Content Type Builder", level: 2 },
  { id: "collection-vs-single-types", title: "Collection Types, Single Types, and Components", level: 3 },
  { id: "field-types", title: "Field Types Reference", level: 3 },
  { id: "rest-api", title: "The Auto-Generated REST API", level: 2 },
  { id: "populate-syntax", title: "Populate Syntax: The Hard Part", level: 3 },
  { id: "filtering-and-pagination", title: "Filtering and Pagination", level: 3 },
  { id: "graphql-api", title: "GraphQL API", level: 2 },
  { id: "nextjs-strapi-integration", title: "Next.js Integration Patterns", level: 2 },
  { id: "isr-and-webhooks", title: "ISR and Webhook-Based Revalidation", level: 3 },
  { id: "draft-preview", title: "Draft & Publish and Preview Mode", level: 3 },
  { id: "strapi-customization", title: "Strapi Customization: The Key Differentiator", level: 2 },
  { id: "strapi-deployment", title: "Self-Hosting and Deployment", level: 2 },
  { id: "strapi-v5-changes", title: "Strapi v5 Breaking Changes from v4", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StrapiDeepDive() {
  return (
    <div className="article-content">
      <p>
        Strapi is the most-deployed open-source headless CMS. Where Contentful and Contentstack are
        SaaS products you subscribe to, Strapi is software you run yourself — on your own servers,
        in your own cloud account, with your own database. That single architectural difference
        explains every tradeoff: full control and zero vendor lock-in on one side, full operational
        responsibility on the other. This module covers the API shape, Next.js integration patterns,
        and the v5 breaking changes you need to know.
      </p>

      <h2 id="strapi-mental-model">Strapi Mental Model: Self-Hosted vs SaaS</h2>
      <p>
        When you use Contentful or Contentstack, the CMS is a managed service — Contentful Inc. or
        Contentstack Inc. runs the infrastructure, handles scaling, backups, and uptime. You pay a
        monthly subscription and get an API. When you use Strapi, you download a Node.js application
        and deploy it. You are responsible for the database, file storage, backups, and keeping the
        server running.
      </p>
      <p>
        The operational model has three practical consequences for frontend engineers:
      </p>
      <ul>
        <li>
          <strong>Local development includes the CMS.</strong> You run Strapi locally with{" "}
          <code>npm run develop</code>. The admin panel is at <code>localhost:1337/admin</code>. The
          API is at <code>localhost:1337/api</code>. There is no cloud-only dependency — the entire
          system runs on your laptop with SQLite. This is a significant developer experience
          advantage for local iteration.
        </li>
        <li>
          <strong>You own the schema files.</strong> Content Type definitions are stored as JSON
          files in <code>src/api/&lt;content-type&gt;/content-types/</code>. They live in your git
          repository and deploy with your code. Schema changes are code changes — reviewable,
          version-controlled, and rollback-able.
        </li>
        <li>
          <strong>Custom business logic lives in the same codebase.</strong> You can write Node.js
          controllers, services, and middlewares that run inside the Strapi server. No webhooks-to-
          Lambda workarounds needed for complex data transformations before they hit the API.
        </li>
      </ul>

      <MermaidDiagram
        chart={strapiArchitectureDiagram}
        title="Strapi Architecture"
        caption="Strapi is a Node.js server with an admin panel, a REST API, and an optional GraphQL API — all auto-generated from your content type definitions. The Document Service API (v5) is the internal data access layer. The frontend fetches from Strapi using API token authentication."
        minHeight={560}
      />

      <h2 id="content-type-builder">Content Type Builder</h2>
      <p>
        The Content Type Builder is a visual interface in the Strapi admin panel that lets you define
        your data schemas without writing code. Behind the scenes, it writes JSON schema files to
        your project directory. You can edit these files directly in code, but the visual builder
        is the primary workflow.
      </p>

      <h3 id="collection-vs-single-types">Collection Types, Single Types, and Components</h3>
      <p>
        Strapi has three fundamental content structures:
      </p>
      <ul>
        <li>
          <strong>Collection Type</strong> — a schema with many entries. Like a database table.
          Use for Articles, Authors, Categories — anything you create multiple instances of. The
          API endpoint is <code>/api/&lt;pluralized-name&gt;</code> (e.g.{" "}
          <code>/api/articles</code>).
        </li>
        <li>
          <strong>Single Type</strong> — a schema with exactly one entry. Use for the Homepage
          configuration, global navigation, SEO defaults — content that exists once. The endpoint
          is <code>/api/&lt;name&gt;</code> (e.g. <code>/api/homepage</code>).
        </li>
        <li>
          <strong>Component</strong> — a reusable group of fields that can be embedded in any
          Collection or Single Type. Components have no standalone endpoint. Examples: an SEO
          metadata component (title, description, ogImage), a CTA component (text, href, variant).
        </li>
        <li>
          <strong>Dynamic Zone</strong> — a field that holds an ordered list of components, where
          each item can be a different component type. This is Strapi's equivalent of Contentstack's
          Modular Blocks. Use it for flexible page builders or article bodies that mix text, images,
          callouts, and embeds.
        </li>
      </ul>

      <h3 id="field-types">Field Types Reference</h3>

      <ArticleTable
        caption="Strapi field types with their Contentful/Contentstack equivalents, API output shape, and whether relations need populate to be included."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Strapi Field</th>
              <th>Contentful Equivalent</th>
              <th>Contentstack Equivalent</th>
              <th>API Output Shape</th>
              <th>Needs populate?</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Short Text</td>
              <td>Short Text</td>
              <td>Single Line Textbox</td>
              <td><code>string</code></td>
              <td>No</td>
              <td>Max 255 chars. Use for titles, slugs, labels.</td>
            </tr>
            <tr>
              <td>Long Text</td>
              <td>Long Text</td>
              <td>Multi Line Textbox</td>
              <td><code>string</code></td>
              <td>No</td>
              <td>Plain text only. No formatting.</td>
            </tr>
            <tr>
              <td>Rich Text (Blocks)</td>
              <td>Rich Text (JSON AST)</td>
              <td>Rich Text Editor (JSON)</td>
              <td><code>BlocksContent[]</code> (array of block nodes)</td>
              <td>No</td>
              <td>v5 uses Blocks editor — JSON array similar to Slate. Requires custom renderer.</td>
            </tr>
            <tr>
              <td>Number (Integer/Float)</td>
              <td>Number</td>
              <td>Number</td>
              <td><code>number</code></td>
              <td>No</td>
              <td>Integer or decimal. Use for counts, prices, order indices.</td>
            </tr>
            <tr>
              <td>Boolean</td>
              <td>Boolean</td>
              <td>Boolean</td>
              <td><code>boolean</code></td>
              <td>No</td>
              <td>Featured flag, active toggle, hide from search.</td>
            </tr>
            <tr>
              <td>Date / DateTime</td>
              <td>Date &amp; Time</td>
              <td>Date</td>
              <td><code>string</code> (ISO 8601)</td>
              <td>No</td>
              <td>Use DateTime for published timestamps.</td>
            </tr>
            <tr>
              <td>Media</td>
              <td>Media (Asset)</td>
              <td>File</td>
              <td><code>{"{ data: { id, attributes: { url, width, height, mime } } }"}</code></td>
              <td>Yes (<code>populate=coverImage</code>)</td>
              <td>URL is relative to Strapi origin unless using S3 provider.</td>
            </tr>
            <tr>
              <td>Relation</td>
              <td>Reference (Entry)</td>
              <td>Reference</td>
              <td>Nested entry object (when populated)</td>
              <td>Yes</td>
              <td>One-to-one, one-to-many, many-to-many. Deep populate for nested relations.</td>
            </tr>
            <tr>
              <td>Component</td>
              <td>No direct equivalent</td>
              <td>Group (Global Field)</td>
              <td>Inline nested object</td>
              <td>Yes (<code>populate=componentName</code>)</td>
              <td>Reusable field group. No standalone endpoint.</td>
            </tr>
            <tr>
              <td>Dynamic Zone</td>
              <td>No direct equivalent</td>
              <td>Modular Blocks</td>
              <td><code>Array&lt;{"{ __component: string, ...fields }"}&gt;</code></td>
              <td>Yes (<code>populate[zone][populate]=*</code>)</td>
              <td>Ordered list of mixed component types. Use <code>__component</code> to discriminate.</td>
            </tr>
            <tr>
              <td>JSON</td>
              <td>JSON Object</td>
              <td>JSON (custom field)</td>
              <td><code>Record&lt;string, unknown&gt;</code></td>
              <td>No</td>
              <td>Arbitrary JSON. Use sparingly — no schema validation.</td>
            </tr>
            <tr>
              <td>UID</td>
              <td>No direct equivalent</td>
              <td>No direct equivalent</td>
              <td><code>string</code></td>
              <td>No</td>
              <td>Auto-generated unique identifier. Can be set to generate from another field (e.g. slug from title).</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="rest-api">The Auto-Generated REST API</h2>
      <p>
        Every Collection Type you define automatically gets a REST API. For a Collection Type named
        "Article", Strapi generates:
      </p>
      <ul>
        <li><code>GET /api/articles</code> — list all published entries (paginated)</li>
        <li><code>GET /api/articles/:documentId</code> — single entry by its document ID (v5)</li>
        <li><code>POST /api/articles</code> — create (requires write-capable API token)</li>
        <li><code>PUT /api/articles/:documentId</code> — update</li>
        <li><code>DELETE /api/articles/:documentId</code> — delete</li>
      </ul>
      <p>
        Authentication uses API tokens generated in the admin panel under Settings &gt; API Tokens.
        Read-only tokens are appropriate for the Next.js frontend. Pass the token as a Bearer token
        in the Authorization header.
      </p>

      <pre>
        <code>{`// lib/strapi.ts
const STRAPI_URL = process.env.STRAPI_URL!        // e.g. https://cms.example.com
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN! // read-only API token

export async function fetchStrapi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(\`\${STRAPI_URL}/api\${path}\`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: \`Bearer \${STRAPI_TOKEN}\` },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(\`Strapi \${res.status} on \${path}\`)
  }

  return res.json() as Promise<T>
}
`}</code>
      </pre>

      <h3 id="populate-syntax">Populate Syntax: The Hard Part</h3>
      <p>
        By default, Strapi returns only scalar fields — strings, numbers, booleans, dates. Relations,
        media, components, and dynamic zones are omitted unless you explicitly request them with the{" "}
        <code>populate</code> parameter. This is the most confusing part of the Strapi API for
        developers coming from Contentful (where <code>include: 2</code> resolves nested references)
        or Contentstack (where you use <code>include[]</code>).
      </p>
      <p>
        There are several populate syntaxes, and choosing the right one matters for performance and
        correctness:
      </p>

      <ArticleTable
        caption="Strapi populate syntax examples — what you want to include, the exact query parameter, and what the response shape looks like. These are the patterns you will use in almost every real Strapi integration."
        minWidth={940}
      >
        <table>
          <thead>
            <tr>
              <th>Goal</th>
              <th>populate parameter</th>
              <th>Response shape (simplified)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Include all direct relations (shallow)</td>
              <td><code>populate=*</code></td>
              <td>All top-level relations populated (no deep nesting)</td>
              <td>Convenient for prototyping. Not recommended for production — over-fetches.</td>
            </tr>
            <tr>
              <td>Include a single relation</td>
              <td><code>populate=author</code></td>
              <td><code>{"{ data: { author: { id, documentId, name } } }"}</code></td>
              <td>Only the <code>author</code> relation. Other relations still omitted.</td>
            </tr>
            <tr>
              <td>Include multiple specific relations</td>
              <td><code>populate[0]=author&populate[1]=categories</code></td>
              <td>Both <code>author</code> and <code>categories</code> included</td>
              <td>Array-style for multiple top-level populate targets.</td>
            </tr>
            <tr>
              <td>Deep populate: relation's sub-relation</td>
              <td><code>populate[author][populate][0]=avatar</code></td>
              <td><code>{"{ author: { name, avatar: { url, width, height } } }"}</code></td>
              <td>Nest populate params to go deeper. Each level adds a bracket layer.</td>
            </tr>
            <tr>
              <td>Populate a media field</td>
              <td><code>populate=coverImage</code></td>
              <td><code>{"{ coverImage: { url, width, height, mime, alternativeText } }"}</code></td>
              <td>Media fields behave like relations — omitted by default.</td>
            </tr>
            <tr>
              <td>Populate a component</td>
              <td><code>populate=seo</code></td>
              <td><code>{"{ seo: { metaTitle, metaDescription, ogImage } }"}</code></td>
              <td>Components are also omitted by default.</td>
            </tr>
            <tr>
              <td>Populate a dynamic zone</td>
              <td><code>populate[sections][populate]=*</code></td>
              <td><code>{"{ sections: [{ __component: 'sections.hero', title, ... }] }"}</code></td>
              <td>Use <code>__component</code> to discriminate between component types in the array.</td>
            </tr>
            <tr>
              <td>Deep populate everything (development only)</td>
              <td><code>populate=deep</code> (with <code>strapi-plugin-populate-deep</code>)</td>
              <td>Recursively populates all levels</td>
              <td>Third-party plugin. Never use in production — N+1 queries, huge payloads.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Fetch article by slug with author (+ avatar) and categories populated
interface StrapiData<T> {
  data: T[]
  meta: { pagination: { page: number; pageSize: number; total: number } }
}

interface Article {
  documentId: string      // v5 — the stable identifier for API operations
  title: string
  slug: string
  body: BlocksContent[]   // v5 Rich Text Blocks format
  publishedAt: string | null
  author: {
    documentId: string
    name: string
    avatar: { url: string; width: number; height: number } | null
  } | null
  categories: Array<{ documentId: string; name: string; slug: string }>
  coverImage: { url: string; width: number; height: number } | null
}

async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data } = await fetchStrapi<StrapiData<Article>>('/articles', {
    'filters[slug][$eq]': slug,
    'populate[author][populate][0]': 'avatar',
    'populate[categories]': 'true',
    'populate[coverImage]': 'true',
    'pagination[pageSize]': '1',
  })
  return data[0] ?? null
}
`}</code>
      </pre>

      <h3 id="filtering-and-pagination">Filtering and Pagination</h3>
      <p>
        Strapi uses a bracket-notation query string for filters, similar to qs library syntax. The
        filter operators are always wrapped in <code>$</code>-prefixed brackets. Pagination uses
        page-based or offset-based parameters.
      </p>

      <pre>
        <code>{`// Strapi filter operators (most common)
// Exact match:          filters[slug][$eq]=getting-started
// Not equal:            filters[status][$ne]=draft
// Contains:             filters[title][$contains]=react
// In list:              filters[category][$in][0]=engineering&filters[category][$in][1]=design
// Greater than:         filters[views][$gt]=100
// Null check:           filters[deletedAt][$null]=true

// Page-based pagination (preferred)
// GET /api/articles?pagination[page]=1&pagination[pageSize]=10

// Offset-based pagination
// GET /api/articles?pagination[start]=0&pagination[limit]=10

// Sort (multiple fields)
// GET /api/articles?sort[0]=publishedAt:desc&sort[1]=title:asc

// Select specific fields (reduce payload)
// GET /api/articles?fields[0]=slug&fields[1]=title&fields[2]=publishedAt

// generateStaticParams — fetch all slugs at build time
export async function generateStaticParams() {
  const { data } = await fetchStrapi<StrapiData<{ slug: string }>>('/articles', {
    'fields[0]': 'slug',
    'pagination[pageSize]': '100',
    'pagination[page]': '1',
  })

  return data.map((entry) => ({ slug: entry.slug }))
}
`}</code>
      </pre>

      <h2 id="graphql-api">GraphQL API</h2>
      <p>
        Strapi's GraphQL API is an optional plugin: <code>@strapi/plugin-graphql</code>. Once
        installed, the playground is available at <code>/graphql</code>. The same API token used
        for REST works for GraphQL — pass it as a Bearer token in the Authorization header. The
        GraphQL schema mirrors your content types, but relations are always available without
        explicit populate parameters (querying them in GraphQL automatically fetches them).
      </p>

      <pre>
        <code>{`# Strapi GraphQL — fetch article by slug
query GetArticle($slug: String!) {
  articles(
    filters: { slug: { eq: $slug } }
    pagination: { limit: 1 }
  ) {
    documentId
    title
    slug
    body             # returns JSON (BlocksContent array)
    publishedAt
    author {
      documentId
      name
      avatar {
        url
        width
        height
      }
    }
    categories {
      documentId
      name
      slug
    }
    coverImage {
      url
      width
      height
      alternativeText
    }
  }
}
`}</code>
      </pre>

      <pre>
        <code>{`// lib/strapi-graphql.ts — generic GraphQL client
export async function strapiQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(\`\${process.env.STRAPI_URL}/graphql\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${process.env.STRAPI_API_TOKEN}\`,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(\`Strapi GraphQL error: \${res.status}\`)

  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)

  return json.data as T
}
`}</code>
      </pre>

      <p>
        GraphQL is often preferable to REST for complex nested content because you avoid the
        verbose populate parameter syntax — you simply include the fields you need in the query.
        However, it requires the plugin installation and adds a dependency on the plugin's release
        cycle relative to Strapi core.
      </p>

      <h2 id="nextjs-strapi-integration">Next.js Integration Patterns</h2>
      <p>
        The integration pattern for Strapi with Next.js App Router mirrors Contentful and
        Contentstack: Server Components fetch from the Strapi REST or GraphQL API using an API
        token, <code>generateStaticParams</code> pre-builds article pages at build time, and ISR
        with on-demand revalidation keeps content fresh after editors publish changes.
      </p>

      <pre>
        <code>{`// app/help/[slug]/page.tsx — full SSG + ISR + Strapi pattern
import { fetchStrapi } from '@/lib/strapi'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export async function generateStaticParams() {
  const { data } = await fetchStrapi<StrapiData<{ slug: string }>>('/articles', {
    'fields[0]': 'slug',
    'pagination[pageSize]': '100',
  })
  return data.map((entry) => ({ slug: entry.slug }))
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  return (
    <article>
      <h1>{article.title}</h1>
      {/* Render Strapi Blocks rich text */}
      <StrapiBlocksRenderer content={article.body} />
    </article>
  )
}
`}</code>
      </pre>

      <h3 id="isr-and-webhooks">ISR and Webhook-Based Revalidation</h3>
      <p>
        Strapi has a built-in webhook system in the admin panel under Settings &gt; Webhooks. You
        configure the URL, the events to trigger on (entry.publish, entry.update, entry.unpublish),
        and custom headers for authentication. On publish, Strapi sends a POST request to your
        Next.js Route Handler, which calls <code>revalidatePath</code> for the affected page.
      </p>

      <MermaidDiagram
        chart={requestFlowDiagram}
        title="Strapi + Next.js Request Flow"
        caption="At build time, generateStaticParams fetches all slugs using minimal field selection. Each page fetches its full content with precise populate parameters. After deployment, Strapi webhooks trigger on-demand ISR revalidation so editors see their changes live within seconds."
        minHeight={500}
      />

      <pre>
        <code>{`// app/api/revalidate/strapi/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Verify the webhook secret from the custom header configured in Strapi admin
  const secret = request.headers.get('strapi-webhook-secret')
  if (secret !== process.env.STRAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { model, entry } = body

  // Strapi sends the full entry in the webhook payload
  if (model === 'article' && entry?.slug) {
    await revalidatePath(\`/help/\${entry.slug}\`)
    await revalidatePath('/help')  // revalidate the listing page too
  }

  return NextResponse.json({ revalidated: true, slug: entry?.slug })
}
`}</code>
      </pre>

      <h3 id="draft-preview">Draft & Publish and Preview Mode</h3>
      <p>
        Strapi v5 introduces per-document draft and publish status. An article can exist in a draft
        state (not yet published) and a published state simultaneously. By default, the Delivery
        API only returns published entries. To fetch drafts, you need an API token with draft
        permissions and the <code>?status=draft</code> query parameter.
      </p>

      <pre>
        <code>{`// Fetch draft entry for content preview (using a draft-enabled API token)
async function getDraftArticle(slug: string): Promise<Article | null> {
  const url = new URL(\`\${process.env.STRAPI_URL}/api/articles\`)
  url.searchParams.set('filters[slug][$eq]', slug)
  url.searchParams.set('populate[author][populate][0]', 'avatar')
  url.searchParams.set('populate[categories]', 'true')
  url.searchParams.set('status', 'draft')  // v5: request draft version

  const res = await fetch(url.toString(), {
    headers: {
      // Use a separate API token with draft read permissions
      Authorization: \`Bearer \${process.env.STRAPI_DRAFT_TOKEN}\`,
    },
    cache: 'no-store',  // never cache draft content
  })

  const { data } = await res.json()
  return data[0] ?? null
}

// app/help/[slug]/page.tsx — integrate draft mode with Next.js draftMode()
import { draftMode } from 'next/headers'

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { isEnabled: isDraft } = await draftMode()

  const article = isDraft
    ? await getDraftArticle(slug)
    : await getArticleBySlug(slug)

  if (!article) notFound()

  return <ArticleView article={article} isDraft={isDraft} />
}
`}</code>
      </pre>

      <h2 id="strapi-customization">Strapi Customization: The Key Differentiator</h2>
      <p>
        The ability to write custom server-side code inside the CMS layer is Strapi's defining
        advantage over SaaS alternatives. In Contentful or Contentstack, any custom logic (data
        transformation, field validation beyond the UI, computed fields) requires a middleware
        service between the CMS and your frontend. In Strapi, you write it directly.
      </p>

      <pre>
        <code>{`// src/api/article/controllers/article.ts
// Custom controller to extend the default CRUD behavior
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  // Override findOne to add custom logic
  async findOne(ctx) {
    // Increment a view count before returning the entry
    const { id } = ctx.params
    await strapi.entityService.update('api::article.article', id, {
      data: { viewCount: (await strapi.entityService.findOne('api::article.article', id)).viewCount + 1 },
    })
    // Delegate to the default findOne implementation
    return await super.findOne(ctx)
  },
}))

// src/api/article/services/article.ts
// Custom service — business logic separate from the controller
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  async getRelatedArticles(articleId: number, limit = 3) {
    const article = await strapi.entityService.findOne('api::article.article', articleId, {
      populate: { categories: true },
    })
    // Find articles in the same categories
    return strapi.entityService.findMany('api::article.article', {
      filters: {
        categories: { id: { $in: article.categories.map((c) => c.id) } },
        id: { $ne: articleId },
      },
      limit,
      sort: { publishedAt: 'desc' },
    })
  },
}))

// Lifecycle hooks — src/api/article/content-types/article/lifecycles.ts
export default {
  async beforeCreate(event) {
    // Auto-generate reading time before saving
    const { data } = event.params
    if (data.body) {
      const wordCount = JSON.stringify(data.body).split(' ').length
      data.readingTimeMinutes = Math.ceil(wordCount / 200)
    }
  },
}
`}</code>
      </pre>

      <h2 id="strapi-deployment">Self-Hosting and Deployment</h2>
      <p>
        Strapi requires three infrastructure components to be production-ready:
      </p>
      <ul>
        <li>
          <strong>Database:</strong> PostgreSQL is the recommended production database. MySQL is
          supported. SQLite is default in development only — do not use SQLite in production because
          it does not support concurrent writes.
        </li>
        <li>
          <strong>File storage:</strong> By default, Strapi stores uploaded files on the local
          disk at <code>./public/uploads/</code>. This does not survive container restarts or
          horizontal scaling. Replace it with the{" "}
          <code>@strapi/provider-upload-aws-s3</code> or{" "}
          <code>@strapi/provider-upload-cloudinary</code> plugin in production. Media URLs then
          point to S3 or Cloudinary rather than the Strapi server.
        </li>
        <li>
          <strong>Admin panel build:</strong> Running <code>npm run build</code> compiles both the
          Strapi server and the admin panel React app. The build output lives in{" "}
          <code>./build/</code>. Your deployment pipeline must run this build step.
        </li>
      </ul>
      <p>
        <strong>Strapi Cloud</strong> is Contentstack's managed hosting offering for Strapi — it
        handles the infrastructure, database, and file storage for you. It starts at $29/month and
        is appropriate when you want Strapi's open-source flexibility without the DevOps overhead.
        The trade-off is that you are now on a managed platform again, though you can always
        migrate to self-hosting.
      </p>

      <pre>
        <code>{`# docker-compose.yml — local Strapi with PostgreSQL
version: '3.8'
services:
  strapi:
    image: node:20-alpine
    working_dir: /app
    command: npm run develop
    volumes:
      - .:/app
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: db
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi
    ports:
      - "1337:1337"
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: strapi
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: strapi
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
`}</code>
      </pre>

      <h2 id="strapi-v5-changes">Strapi v5 Breaking Changes from v4</h2>
      <p>
        Strapi v5 (released 2024) introduced significant breaking changes from v4. If you encounter
        a Strapi codebase, determining the version immediately is critical — the API shape, internal
        APIs, and documentation differ substantially.
      </p>

      <ArticleTable
        caption="Key differences between Strapi v4 and v5 — what changed, the practical impact, and how to identify which version you are working with."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Strapi v4</th>
              <th>Strapi v5</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Entry identifier in API</td>
              <td>Numeric <code>id</code> (auto-increment)</td>
              <td><code>documentId</code> (UUID string) — <code>id</code> still exists but is internal</td>
              <td>All v4 code using <code>entry.id</code> for API calls must switch to <code>entry.documentId</code></td>
            </tr>
            <tr>
              <td>Internal data access layer</td>
              <td>Entity Service API (<code>strapi.entityService.*</code>)</td>
              <td>Document Service API (<code>strapi.documents.*</code>)</td>
              <td>All custom controllers and services using Entity Service must be rewritten</td>
            </tr>
            <tr>
              <td>Draft &amp; Publish</td>
              <td>Single entry toggles between draft and published states</td>
              <td>Per-document: draft and published versions coexist; fetch with <code>?status=draft</code></td>
              <td>Preview integrations need to use the <code>status</code> query param instead of a separate endpoint</td>
            </tr>
            <tr>
              <td>Rich Text editor</td>
              <td>Quill-based rich text (lexical JSON format)</td>
              <td>Blocks editor (Slate-like JSON array of block nodes)</td>
              <td>Rich text output format changed — v4 and v5 outputs are not compatible</td>
            </tr>
            <tr>
              <td>Locale handling</td>
              <td>Locale as a query param: <code>?locale=fr</code></td>
              <td>Locale still a query param but document-level localization is different</td>
              <td>Minor API changes; test locale queries when migrating</td>
            </tr>
            <tr>
              <td>API response shape</td>
              <td>Wrapped in <code>{"{ data: { id, attributes: { ... } } }"}</code></td>
              <td>Flattened: <code>{"{ data: { documentId, title, ... } }"}</code> — <code>attributes</code> removed</td>
              <td>All v4 code accessing <code>entry.attributes.title</code> must become <code>entry.title</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// v4 API response shape (attributes wrapper):
{
  "data": {
    "id": 42,
    "attributes": {
      "title": "Getting Started",
      "slug": "getting-started",
      "author": {
        "data": {
          "id": 3,
          "attributes": { "name": "Jane Doe" }
        }
      }
    }
  }
}

// v5 API response shape (flattened — no attributes wrapper):
{
  "data": {
    "id": 42,
    "documentId": "a1b2c3d4e5f6g7h8i9j0",  // use this for API operations
    "title": "Getting Started",
    "slug": "getting-started",
    "author": {
      "id": 3,
      "documentId": "k1l2m3n4o5p6q7r8s9t0",
      "name": "Jane Doe"
    }
  }
}
`}</code>
      </pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="What is your experience with Strapi? How does it compare to Contentstack?"
        intro="This question tests whether you understand the fundamental architectural distinction — self-hosted vs SaaS — and can articulate the real tradeoffs rather than just listing features. Lead with the operational model difference, then cover API ergonomics, and close with when you would recommend each."
        steps={[
          "Open with the fundamental difference: Strapi is open-source software you deploy and operate; Contentstack is a managed SaaS. This single distinction drives every other tradeoff. With Strapi you own your data, have zero vendor lock-in, and can run it locally with SQLite during development — but you are responsible for PostgreSQL configuration, file storage providers, security patches, and scaling.",
          "Explain the content modeling parallels: both have Collection Types (many entries) and Single Types (one entry). Strapi's Dynamic Zones map directly to Contentstack's Modular Blocks — an ordered array of mixed component types, each discriminated by a type field. Contentstack calls it a Block type; Strapi calls it a Dynamic Zone with Components.",
          "Cover the API ergonomics difference. The biggest friction point in Strapi is the populate syntax — relations and media are omitted by default and require explicit bracket-notation query parameters. populate[author][populate][0]=avatar versus Contentstack's simpler include[] syntax. Make clear you have worked through this and know the exact syntax for common patterns.",
          "Address v4 vs v5 if the team is using Strapi: v5 flattened the response shape (removed the attributes wrapper), replaced numeric id with documentId as the primary identifier, and changed the internal Entity Service to Document Service. These are breaking changes that require careful migration.",
          "Close with when to recommend Strapi: ideal for teams with DevOps maturity who want custom business logic in the CMS layer, need to avoid vendor lock-in, or have budget constraints. Not ideal for small teams that want zero infrastructure overhead, or enterprises that need SLA guarantees and dedicated support.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Build a Strapi-Backed Help Center Page with ISR and Preview Mode"
        scenario={
          <span>
            You are building a Help Center with Next.js App Router backed by Strapi v5. The Strapi
            instance has an <code>article</code> Collection Type with fields: <code>title</code>{" "}
            (Short Text), <code>slug</code> (UID), <code>body</code> (Rich Text Blocks), a{" "}
            <code>author</code> relation to an <code>author</code> Collection Type (with an{" "}
            <code>avatar</code> Media field), and a <code>categories</code> many-to-many relation.
            The site must be statically generated at build time, revalidate on-demand when editors
            publish articles, and support a preview mode for draft articles.
          </span>
        }
        tasks={[
          "Write a typed fetchStrapi helper that accepts a path and URLSearchParams-compatible params object, attaches the Bearer token from STRAPI_API_TOKEN, and uses next: { revalidate: 3600 } by default. Handle non-2xx responses by throwing.",
          "Write generateStaticParams using fetchStrapi to fetch all article slugs. Use fields[0]=slug and pagination[pageSize]=100 to minimize payload. Return the params array.",
          "Write the HelpArticlePage Server Component. Use draftMode() to determine whether to fetch published or draft content. For published: use the fetchStrapi helper with the standard read-only token. For draft: use cache: 'no-store' and a STRAPI_DRAFT_TOKEN env var with ?status=draft. Populate author (with avatar) and categories. Call notFound() if the entry is missing.",
          "Write the Strapi webhook Route Handler at /api/revalidate/strapi. Verify a strapi-webhook-secret header. Read the model and entry.slug from the Strapi webhook payload. Call revalidatePath for the article page and the help center listing page.",
          "Explain the v5 response shape: the article object has documentId and title directly (no attributes wrapper). Show how to type the response interface for both the collection response (StrapiData<Article>) and the individual article.",
        ]}
        pitfalls={[
          "Using entry.id instead of entry.documentId for Strapi v5 API operations — id is now an internal integer; documentId is the stable public identifier used in all API paths and webhook payloads.",
          "Forgetting that relations, media, and components are not included in the default response — every field that is not a scalar requires an explicit populate parameter or it will be null/undefined in the response.",
          "Using populate=* in production — this over-fetches all top-level relations but does not deep-populate nested relations (like author's avatar), and it fetches fields you may not need. Always be explicit.",
          "Accessing entry.attributes.title (v4 shape) on a v5 Strapi instance — the v5 response is flat, so it is entry.title. Check the Strapi version before writing fetch code.",
          "Not setting cache: 'no-store' on the draft fetch — if Next.js caches the draft response, editors will not see their latest changes in preview mode.",
        ]}
        signal="A strong answer uses precise populate parameter syntax for the author/avatar deep relation, correctly types the v5 flat response shape (no attributes wrapper), separates published and draft fetch paths using draftMode() and different API tokens, and implements the webhook handler with secret verification and revalidatePath for both the article and listing pages."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Strapi is a self-hosted Node.js CMS — you run the infrastructure. The contrast with
          Contentful and Contentstack (SaaS) is the most important thing to understand before any
          technical detail.
        </li>
        <li>
          Collection Types are many-entry schemas (Articles), Single Types are one-entry schemas
          (Homepage config), and Dynamic Zones are Strapi's equivalent of Contentstack's Modular
          Blocks — ordered arrays of mixed component types discriminated by <code>__component</code>.
        </li>
        <li>
          The populate parameter is the most friction-heavy part of the Strapi REST API. Relations,
          media, and components are all omitted by default. Deep populate uses bracket notation:{" "}
          <code>populate[author][populate][0]=avatar</code>.
        </li>
        <li>
          Strapi v5 flattened the REST response shape — the <code>attributes</code> wrapper is
          gone, and <code>documentId</code> (a UUID string) replaces numeric <code>id</code> as
          the primary identifier for API operations. Always identify the version before writing
          fetch code.
        </li>
        <li>
          Strapi's key advantage over SaaS CMS is the ability to write custom Node.js controllers,
          services, and lifecycle hooks inside the CMS itself — no extra microservice needed for
          business logic in the content layer.
        </li>
        <li>
          For production Strapi: use PostgreSQL (not SQLite), configure an S3 or Cloudinary upload
          provider (not local disk), and run <code>npm run build</code> to compile the admin panel
          as a separate deployment step.
        </li>
      </ul>
    </div>
  );
}
