import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dataHierarchyDiagram = String.raw`flowchart TD
    subgraph CF ["Contentful"]
      CF_S["Space\n(billing unit, top-level boundary)"]
      CF_E["Environment\n(master / staging / sandbox)"]
      CF_CT["Content Type\n(schema definition)"]
      CF_EN["Entry\n(content instance)"]
      CF_F["Field\n(Short Text, Rich Text, Reference, Media...)"]
      CF_S --> CF_E --> CF_CT --> CF_EN --> CF_F
    end
    subgraph CS ["Contentstack equivalent"]
      CS_O["Organization"]
      CS_ST["Stack\n(= Contentful Space)"]
      CS_ENV["Environment\n(= Contentful Environment)"]
      CS_CTT["Content Type\n(same concept)"]
      CS_ENT["Entry\n(= Contentful Entry)"]
      CS_O --> CS_ST --> CS_ENV --> CS_CTT --> CS_ENT
    end
    CF_S -. "analogous to" .-> CS_ST
    CF_E -. "analogous to" .-> CS_ENV
    CF_EN -. "analogous to" .-> CS_ENT`;

const richTextPipelineDiagram = String.raw`flowchart LR
    CMS["Contentful Rich Text\n(JSON AST stored in CMS)"]
    PKG["@contentful/rich-text-react-renderer\ndocumentToReactComponents(doc, options)"]
    NODES["Custom node renderers\nBLOCKS.EMBEDDED_ASSET\nBLOCKS.EMBEDDED_ENTRY\nINLINES.HYPERLINK"]
    REACT["React element tree\n(rendered HTML)"]

    CMS -->|"JSON AST passed as prop"| PKG
    PKG -->|"default renderers for p, h1-h6, ul, ol..."| REACT
    PKG -->|"custom renderNode map"| NODES
    NODES -->|"returns JSX for embedded content"| REACT`;

export const toc: TocItem[] = [
  { id: "contentful-vs-contentstack", title: "Contentful vs Contentstack Mental Model", level: 2 },
  { id: "contentful-sdk-setup", title: "SDK Setup & Client Configuration", level: 2 },
  { id: "fetching-entries", title: "Fetching Entries", level: 2 },
  { id: "linked-entries", title: "Linked Entry Resolution", level: 3 },
  { id: "contentful-graphql", title: "Contentful GraphQL API", level: 2 },
  { id: "rich-text-rendering", title: "Rich Text Rendering", level: 2 },
  { id: "custom-renderers", title: "Custom Node Renderers", level: 3 },
  { id: "nextjs-contentful-integration", title: "Next.js Integration Patterns", level: 2 },
  { id: "draft-mode", title: "Draft Mode with Preview API", level: 3 },
  { id: "content-model-design", title: "Content Model Design", level: 2 },
  { id: "contentful-vs-contentstack-comparison", title: "Contentful vs Contentstack Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ContentfulDeepDive() {
  return (
    <div className="article-content">
      <p>
        Contentful is the most widely deployed headless CMS in enterprise React applications. If
        you have worked with Contentstack at Indeed, you already understand the headless CMS
        mental model — Contentful uses the same fundamental concepts but with different
        terminology, different SDK ergonomics, and a notably different rich text format. This
        module covers what actually changes and what stays the same, so you can talk about both
        with authority in an interview.
      </p>

      <h2 id="contentful-vs-contentstack">Contentful vs Contentstack Mental Model</h2>
      <p>
        Both are headless CMSes that expose content via REST and GraphQL APIs. The top-level
        concepts map directly, but the names differ. Understanding this mapping is the fastest way
        to onboard to a Contentful project when your background is Contentstack (or vice versa).
      </p>

      <MermaidDiagram
        chart={dataHierarchyDiagram}
        title="Data Hierarchy: Contentful vs Contentstack"
        caption="Contentful's Space is the top-level billing and access boundary — equivalent to Contentstack's Stack. Environments exist in both. The Entry concept is identical. The biggest architectural divergence is in rich text storage and localization (covered below)."
        minHeight={420}
      />

      <p>
        The key behavioral differences beyond naming:
      </p>
      <ul>
        <li>
          <strong>Localization model:</strong> Contentful localizes at the field level — each field
          on an entry can have a value per locale. Contentstack localizes at the entry level — you
          have a separate localized entry per locale. This fundamentally changes how you query
          content and how editors manage translations.
        </li>
        <li>
          <strong>Rich text format:</strong> Contentful stores rich text as a JSON AST (Abstract
          Syntax Tree) using a custom Slate-like schema. Contentstack stores rich text in a similar
          but incompatible JSON structure. Neither is HTML — both require a renderer library to
          convert to React.
        </li>
        <li>
          <strong>GraphQL API:</strong> Contentful auto-generates a GraphQL schema from your
          content types. Contentstack has a manually documented GraphQL API. Both support GraphQL,
          but the schema structure differs significantly.
        </li>
      </ul>

      <h2 id="contentful-sdk-setup">SDK Setup & Client Configuration</h2>
      <p>
        Contentful has two separate API surfaces — the Delivery API (published content, CDN-backed)
        and the Preview API (draft content, for editors). You need two clients. Keep both on the
        server side only — never expose your access tokens to the browser.
      </p>

      <pre>
        <code>{`// lib/contentful.ts
import contentful from 'contentful'

// Delivery client — published content, served via Contentful's CDN
export const deliveryClient = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
  environment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
})

// Preview client — draft content for editors
// Uses a different token and a different host
export const previewClient = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_PREVIEW_TOKEN!,
  environment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
  host: 'preview.contentful.com', // critical — different base URL
})

// Helper: choose client based on draft mode
export function getClient(preview: boolean) {
  return preview ? previewClient : deliveryClient
}
`}</code>
      </pre>

      <p>
        The environment variables you need:
      </p>

      <pre>
        <code>{`# .env.local
CONTENTFUL_SPACE_ID=abc123xyz
CONTENTFUL_ACCESS_TOKEN=your_delivery_token_here       # safe to use in server code
CONTENTFUL_PREVIEW_TOKEN=your_preview_token_here       # only for editor draft mode
CONTENTFUL_ENVIRONMENT=master                          # or staging, sandbox, etc.

# NEVER expose these to the browser (no NEXT_PUBLIC_ prefix)
`}</code>
      </pre>

      <h2 id="fetching-entries">Fetching Entries</h2>
      <p>
        The Contentful SDK's <code>getEntries()</code> accepts a rich query object. The most
        important parameters for a Help Center use case are <code>content_type</code> (required),{" "}
        <code>fields.*</code> filters (for field-level search), <code>include</code> (for linked
        entry resolution), and pagination via <code>limit</code> and <code>skip</code>.
      </p>

      <pre>
        <code>{`// app/help/[slug]/page.tsx (Server Component)
import { deliveryClient } from '@/lib/contentful'
import { notFound } from 'next/navigation'

// Type the response — the SDK uses generic typing
interface HelpArticleFields {
  title: string
  slug: string
  body: Document // contentful rich text type
  category: contentful.Entry<{ name: string; slug: string }>
  author: contentful.Entry<{ name: string; avatar: contentful.Asset }>
  publishedAt: string
  tags: string[]
}

type HelpArticle = contentful.Entry<HelpArticleFields>

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Field-level filter syntax: 'fields.<fieldName>'
  const entries = await deliveryClient.getEntries<HelpArticleFields>({
    content_type: 'helpArticle',
    'fields.slug': slug,
    include: 2,     // resolve reference fields up to 2 levels deep
    limit: 1,
  })

  if (!entries.items[0]) notFound()

  const article = entries.items[0]
  return <ArticleView article={article} />
}
`}</code>
      </pre>

      <h3 id="linked-entries">Linked Entry Resolution</h3>
      <p>
        The <code>include</code> parameter (0–10) controls how many levels of linked entries
        Contentful automatically resolves in the response. Without it, reference fields come back
        as unresolved link objects <code>{"{ sys: { type: 'Link', ... } }"}</code> rather than the
        actual entry data. Setting <code>include: 2</code> is typically enough for most use cases —
        deeper nesting significantly increases response payload size.
      </p>

      <pre>
        <code>{`// include: 0 — reference fields are unresolved links:
// article.fields.author = { sys: { type: 'Link', linkType: 'Entry', id: '...' } }

// include: 1 — direct references are resolved:
// article.fields.author = { sys: {...}, fields: { name: 'Jane Doe', ... } }

// include: 2 — references of references resolved:
// article.fields.author.fields.avatar = { sys: {...}, fields: { file: {...} } }

// Fetching entries with pagination (for generateStaticParams):
export async function generateStaticParams() {
  const entries = await deliveryClient.getEntries<HelpArticleFields>({
    content_type: 'helpArticle',
    select: ['fields.slug'],   // only fetch the slug field — reduces payload
    limit: 1000,               // Contentful max per request is 1000
  })

  return entries.items.map((entry) => ({
    slug: entry.fields.slug,
  }))
}
`}</code>
      </pre>

      <ArticleTable
        caption="Contentful field types, their TypeScript SDK types, GraphQL types, and common use cases."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Field Type</th>
              <th>TypeScript (SDK)</th>
              <th>GraphQL Type</th>
              <th>Validation Options</th>
              <th>Common Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Short Text</td>
              <td><code>string</code></td>
              <td><code>String</code></td>
              <td>Min/max length, pattern, unique, in list</td>
              <td>Title, slug, SEO meta title</td>
            </tr>
            <tr>
              <td>Long Text</td>
              <td><code>string</code></td>
              <td><code>String</code></td>
              <td>Min/max length</td>
              <td>Summary, excerpt, plain text body</td>
            </tr>
            <tr>
              <td>Rich Text</td>
              <td><code>Document</code> (from <code>@contentful/rich-text-types</code>)</td>
              <td><code>ArticleBodyRichText</code> (custom per CT)</td>
              <td>Allowed node types, allowed entry link types</td>
              <td>Article body, FAQs, landing page sections</td>
            </tr>
            <tr>
              <td>Number (Integer)</td>
              <td><code>number</code></td>
              <td><code>Int</code></td>
              <td>Min/max, integer only</td>
              <td>Order index, version, year</td>
            </tr>
            <tr>
              <td>Date & Time</td>
              <td><code>string</code> (ISO 8601)</td>
              <td><code>DateTime</code></td>
              <td>Required, date-only vs datetime</td>
              <td>Published at, expiry date</td>
            </tr>
            <tr>
              <td>Boolean</td>
              <td><code>boolean</code></td>
              <td><code>Boolean</code></td>
              <td>Required</td>
              <td>Featured flag, hide from search</td>
            </tr>
            <tr>
              <td>Media (Asset)</td>
              <td><code>contentful.Asset</code></td>
              <td><code>Asset</code></td>
              <td>Allowed MIME types, min/max dimensions</td>
              <td>Hero image, downloadable PDF</td>
            </tr>
            <tr>
              <td>Reference (Entry)</td>
              <td><code>contentful.Entry&lt;T&gt;</code></td>
              <td><code>ContentType</code> (per CT)</td>
              <td>Allowed content types, number of refs</td>
              <td>Category, author, related articles</td>
            </tr>
            <tr>
              <td>Array</td>
              <td><code>string[]</code> or <code>Entry[]</code></td>
              <td><code>[String]</code> or <code>[ContentType]</code></td>
              <td>Min/max items, unique</td>
              <td>Tags, multiple categories, related links</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="contentful-graphql">Contentful GraphQL API</h2>
      <p>
        Contentful auto-generates a GraphQL schema from your content types. The endpoint is always{" "}
        <code>
          {`https://graphql.contentful.com/content/v1/spaces/${"{SPACE_ID}"}`}
        </code>
        . Authentication is via bearer token in the Authorization header — the same delivery or
        preview access token you use with the REST SDK.
      </p>

      <pre>
        <code>{`// lib/contentful-graphql.ts
const CONTENTFUL_GRAPHQL_ENDPOINT =
  \`https://graphql.contentful.com/content/v1/spaces/\${process.env.CONTENTFUL_SPACE_ID}\`

export async function contentfulQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  preview = false
): Promise<T> {
  const token = preview
    ? process.env.CONTENTFUL_PREVIEW_TOKEN
    : process.env.CONTENTFUL_ACCESS_TOKEN

  const res = await fetch(CONTENTFUL_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${token}\`,
    },
    body: JSON.stringify({ query, variables }),
    // Next.js fetch cache — revalidate every hour
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(\`Contentful GraphQL error: \${res.status}\`)

  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)

  return json.data as T
}
`}</code>
      </pre>

      <pre>
        <code>{`// Contentful GraphQL query for a help article
// The collection naming convention: <ContentTypeName>Collection
const ARTICLE_QUERY = \`
  query GetArticle($slug: String!, $preview: Boolean = false) {
    helpArticleCollection(
      where: { slug: $slug }
      limit: 1
      preview: $preview
    ) {
      items {
        title
        slug
        publishedAt
        body { json }             # rich text returns { json } object
        author {
          name
          avatar { url width height }
        }
        category {
          name
          slug
        }
        tagsCollection(limit: 10) {
          items { name }
        }
      }
    }
  }
\`

interface ArticleQueryResult {
  helpArticleCollection: {
    items: Array<{
      title: string
      slug: string
      publishedAt: string
      body: { json: Document }
      author: { name: string; avatar: { url: string; width: number; height: number } }
      category: { name: string; slug: string }
      tagsCollection: { items: Array<{ name: string }> }
    }>
  }
}

async function getArticle(slug: string) {
  const data = await contentfulQuery<ArticleQueryResult>(ARTICLE_QUERY, { slug })
  return data.helpArticleCollection.items[0] ?? null
}
`}</code>
      </pre>

      <h2 id="rich-text-rendering">Rich Text Rendering</h2>
      <p>
        Contentful's rich text is the single biggest integration difference from other CMSes.
        Unlike Contentstack's JSON RTE (which has a different schema) or a simple Markdown string,
        Contentful stores rich text as a typed JSON AST using its own node format. You cannot
        render it as HTML directly — you must use the official renderer or write your own.
      </p>

      <MermaidDiagram
        chart={richTextPipelineDiagram}
        title="Rich Text Rendering Pipeline"
        caption="The JSON AST comes from Contentful. documentToReactComponents walks the tree and calls your custom renderNode handlers for embedded entries and assets. Standard nodes (paragraphs, headings, lists) are handled by the library's defaults."
        minHeight={260}
      />

      <pre>
        <code>{`// The raw JSON AST that Contentful stores:
{
  "nodeType": "document",
  "content": [
    {
      "nodeType": "paragraph",
      "content": [{ "nodeType": "text", "value": "Hello world", "marks": [] }]
    },
    {
      "nodeType": "embedded-asset-block",
      "data": { "target": { "sys": { "id": "abc123", "type": "Link" } } },
      "content": []
    }
  ]
}
// Note: embedded assets and entries are included by reference (sys.id)
// The SDK resolves these when you use include: 1+ on getEntries()
`}</code>
      </pre>

      <h3 id="custom-renderers">Custom Node Renderers</h3>
      <p>
        The most common customization is handling <code>BLOCKS.EMBEDDED_ASSET</code> (inline
        images in the article body) and <code>BLOCKS.EMBEDDED_ENTRY</code> (callout boxes, code
        snippets, or other rich content blocks embedded in the text flow).
      </p>

      <pre>
        <code>{`// components/RichText.tsx
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, INLINES, Document } from '@contentful/rich-text-types'
import Image from 'next/image'

interface CalloutFields {
  calloutText: string
  type: 'info' | 'warning' | 'tip'
}

function Callout({ type, children }: { type: string; children: React.ReactNode }) {
  const colors = { info: '#3b82f6', warning: '#f59e0b', tip: '#22c55e' }
  return (
    <aside
      style={{
        borderLeft: \`4px solid \${colors[type as keyof typeof colors] ?? '#6366f1'}\`,
        padding: '0.75rem 1rem',
        margin: '1.25rem 0',
        borderRadius: '0 8px 8px 0',
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </aside>
  )
}

const renderOptions = {
  renderNode: {
    // Embedded image from Contentful Media Library
    [BLOCKS.EMBEDDED_ASSET]: (node: Block) => {
      const { file, title, description } = node.data.target.fields
      if (!file?.url) return null
      return (
        <Image
          src={\`https:\${file.url}\`}  // Contentful URLs are protocol-relative
          alt={description ?? title ?? ''}
          width={file.details?.image?.width ?? 800}
          height={file.details?.image?.height ?? 450}
          style={{ borderRadius: '8px', margin: '1rem 0' }}
        />
      )
    },

    // Embedded entry — e.g. a Callout content type
    [BLOCKS.EMBEDDED_ENTRY]: (node: Block) => {
      const entry = node.data.target
      const contentType = entry.sys.contentType.sys.id

      if (contentType === 'callout') {
        const { calloutText, type } = entry.fields as CalloutFields
        return <Callout type={type}>{calloutText}</Callout>
      }

      // Fallback — unknown embedded entry
      return null
    },

    // Inline hyperlinks (override default to add tracking or noopener)
    [INLINES.HYPERLINK]: (node: Inline, children: ReactNode) => (
      <a href={node.data.uri} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  },
}

// Usage in a Server Component
export function RichText({ document }: { document: Document }) {
  return (
    <div className="prose">
      {documentToReactComponents(document, renderOptions)}
    </div>
  )
}
`}</code>
      </pre>

      <h2 id="nextjs-contentful-integration">Next.js Integration Patterns</h2>
      <p>
        The three key patterns for a content site using Next.js App Router with Contentful:
        static generation with ISR for published content, on-demand revalidation via webhook when
        editors publish changes, and Draft Mode for content preview before publishing.
      </p>

      <pre>
        <code>{`// app/help/[slug]/page.tsx — full SSG + ISR + Draft Mode pattern
import { deliveryClient, previewClient } from '@/lib/contentful'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'

export const revalidate = 3600 // ISR: revalidate every hour by default

export async function generateStaticParams() {
  const entries = await deliveryClient.getEntries<HelpArticleFields>({
    content_type: 'helpArticle',
    select: ['fields.slug'],
    limit: 1000,
  })
  return entries.items.map((e) => ({ slug: e.fields.slug }))
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { isEnabled: isDraft } = await draftMode()

  const client = isDraft ? previewClient : deliveryClient

  const result = await client.getEntries<HelpArticleFields>({
    content_type: 'helpArticle',
    'fields.slug': slug,
    include: 2,
    limit: 1,
  })

  const article = result.items[0]
  if (!article) notFound()

  return (
    <article>
      <h1>{article.fields.title}</h1>
      <RichText document={article.fields.body} />
    </article>
  )
}
`}</code>
      </pre>

      <h3 id="draft-mode">Draft Mode with Preview API</h3>
      <p>
        Next.js Draft Mode enables server-side rendering of unpublished content. The workflow:
        Contentful editor clicks "Preview" → your preview URL includes a secret token → your Route
        Handler enables Draft Mode → the article page renders using the Preview API instead of
        Delivery API.
      </p>

      <pre>
        <code>{`// app/api/preview/route.ts — enable Draft Mode
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  if (secret !== process.env.CONTENTFUL_PREVIEW_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  const dm = await draftMode()
  dm.enable()

  redirect(\`/help/\${slug}\`)
}

// app/api/exit-preview/route.ts — disable Draft Mode
export async function GET() {
  const dm = await draftMode()
  dm.disable()
  redirect('/')
}

// Contentful webhook for on-demand ISR revalidation:
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const webhookSecret = request.headers.get('x-contentful-webhook-secret')
  if (webhookSecret !== process.env.CONTENTFUL_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const slug = body.fields?.slug?.['en-US']  // Contentful locale key

  if (slug) {
    revalidatePath(\`/help/\${slug}\`)
  }
  // Also revalidate the help center index
  revalidatePath('/help')

  return Response.json({ revalidated: true })
}
`}</code>
      </pre>

      <h2 id="content-model-design">Content Model Design</h2>
      <p>
        Contentful content type field design decisions have downstream consequences on API payload
        size, GraphQL query complexity, and editor UX. Key decisions for a Help Center content
        model:
      </p>
      <ul>
        <li>
          <strong>Slug field:</strong> Always Short Text, marked as unique, with a URL pattern
          validation (<code>/^[a-z0-9-]+$/</code>). This ensures stable, predictable URLs for
          ISR cache keys and revalidation.
        </li>
        <li>
          <strong>Rich text field restrictions:</strong> In the Contentful web app, you can limit
          which node types are allowed in a rich text field (e.g. disallow heading levels 1-2 in
          body content so the article title is always the only h1). You can also restrict which
          content types can be embedded as entries.
        </li>
        <li>
          <strong>Localization per field:</strong> Unlike Contentstack (entry-level), Contentful
          allows enabling localization on individual fields. A best practice: only localize fields
          that actually differ by locale. Localizing everything multiplies API response size and
          editor burden.
        </li>
        <li>
          <strong>Required vs optional:</strong> Mark slug, title, and publishedAt as required.
          Non-critical fields (tags, related articles) optional. Contentful will block publish if
          required fields are empty.
        </li>
      </ul>

      <h2 id="contentful-vs-contentstack-comparison">Contentful vs Contentstack Comparison</h2>

      <ArticleTable
        caption="Direct comparison of Contentful vs Contentstack across the dimensions that matter most for a senior engineer interview."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Contentful</th>
              <th>Contentstack</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Top-level boundary</td>
              <td>Space (one billing unit, multiple environments)</td>
              <td>Stack (equivalent, one per project)</td>
            </tr>
            <tr>
              <td>Rich text format</td>
              <td>JSON AST (custom Slate-like schema, <code>@contentful/rich-text-types</code>)</td>
              <td>JSON (Supercharged RTE, different AST schema)</td>
            </tr>
            <tr>
              <td>Rich text renderer</td>
              <td><code>@contentful/rich-text-react-renderer</code></td>
              <td><code>@contentstack/utils</code> + custom</td>
            </tr>
            <tr>
              <td>Localization model</td>
              <td>Field-level: each field holds a value per locale in one entry</td>
              <td>Entry-level: separate localized entry per locale (branching)</td>
            </tr>
            <tr>
              <td>GraphQL API</td>
              <td>Auto-generated from content types; strong-typed per CT</td>
              <td>Fixed, manually documented schema; less type safety</td>
            </tr>
            <tr>
              <td>GraphQL endpoint</td>
              <td><code>graphql.contentful.com/content/v1/spaces/{"{SPACE_ID}"}</code></td>
              <td><code>graphql.contentstack.com/stacks/{"{API_KEY}"}</code></td>
            </tr>
            <tr>
              <td>SDK DX</td>
              <td>Official SDK with generics; good TypeScript types</td>
              <td>Official SDK; TypeScript types less comprehensive</td>
            </tr>
            <tr>
              <td>Preview workflow</td>
              <td>Preview API (different host) + Next.js Draft Mode</td>
              <td>Preview token on same host + Next.js Draft Mode</td>
            </tr>
            <tr>
              <td>Webhook system</td>
              <td>Webhooks on publish/unpublish events; custom headers for secret</td>
              <td>Webhooks on publish/unpublish; built-in secret field</td>
            </tr>
            <tr>
              <td>Pricing model</td>
              <td>Based on users, records, and API calls; free Community tier</td>
              <td>Based on users and API calls; no free tier for teams</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="You have Contentful experience — how does it compare to Contentstack?"
        intro="This is a nuanced comparison question that tests whether you understand the fundamental CMS design decisions, not just the API surface. Structure your answer around the real differences — localization model, rich text format, and GraphQL API generation — rather than superficial naming differences."
        steps={[
          "Start by acknowledging both are headless CMSes with the same core concept: content type schemas, entry instances, delivery APIs. The mental model transfers. What changes is the implementation.",
          "Lead with the biggest difference: localization. Contentful is field-level (one entry, multiple locale values per field). Contentstack is entry-level (separate localized entries per locale). This matters because Contentstack queries require a locale parameter that filters to a specific localized variant, while Contentful returns all locales in one response and you select the field value for your locale.",
          "Explain rich text. Both use JSON ASTs, not HTML. The schemas differ — they're not compatible. On Contentful you use documentToReactComponents from @contentful/rich-text-react-renderer with a renderNode map for embedded entries and assets. The key implementation detail: protocol-relative image URLs (https: prefix needed), and the include depth on getEntries() must be set to resolve embedded entries in rich text.",
          "Address GraphQL. Contentful auto-generates a strongly-typed GraphQL schema from your content types — so the type for a helpArticle's body field in GraphQL is HelpArticleBodyRichText, not a generic JSON type. Contentstack's GraphQL schema is more generic and manually documented.",
          "Close with the practical SDK note: the Contentful deliveryClient vs previewClient pattern (different hosts, different tokens) is the key pattern for Draft Mode in Next.js. The same Next.js Draft Mode mechanism works for both CMSes, but the client selection logic differs slightly.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Build a HelpArticlePage with Contentful, ISR, and Custom Rich Text Renderers"
        scenario={
          <span>
            You are building a Help Center using Next.js App Router and Contentful. Each article
            has a <code>slug</code> (Short Text, unique), a <code>title</code> (Short Text), a{" "}
            <code>body</code> (Rich Text that can embed Callout entries and image assets), and a{" "}
            <code>category</code> (Reference to a Category content type). The site should be
            statically generated at build time and revalidate every 30 minutes.
          </span>
        }
        tasks={[
          "Write generateStaticParams that fetches all article slugs from Contentful and returns the params array. Include only the slug field in the API response to minimize payload size.",
          "Write the HelpArticlePage Server Component that fetches the entry by slug using include: 2, handles the case where the entry does not exist by calling notFound(), and renders the article title and rich text body.",
          "Write the RichText component that uses documentToReactComponents with custom renderers for: (1) BLOCKS.EMBEDDED_ASSET — render a next/image using the asset's URL (remember the protocol-relative URL fix), (2) BLOCKS.EMBEDDED_ENTRY — check the content type ID and render a Callout component if it's a 'callout' entry.",
          "Add on-demand revalidation: write a Route Handler at /api/revalidate that verifies a secret header, reads the slug from the Contentful webhook payload, and calls revalidatePath for that article's URL.",
        ]}
        pitfalls={[
          "Forgetting the https: prefix on Contentful asset URLs — they are protocol-relative (//images.ctfassets.net/...) and next/image requires an absolute URL.",
          "Not setting include: 2 on getEntries — embedded entries and assets in rich text come back as unresolved links without it, causing node.data.target.fields to be undefined at render time.",
          "Using the REST SDK for the GraphQL use case or vice versa — the rich text field returns { json } in GraphQL but the raw Document object in the REST SDK. The renderOptions work on the Document, so ensure you are passing the right shape.",
          "Not checking the content type ID before accessing specific fields on embedded entries — an unknown entry type will cause a runtime error if you access fields that don't exist.",
          "Setting revalidate: 3600 on the generateStaticParams response instead of the page segment — generateStaticParams does not cache with revalidate, it runs once at build time. Use export const revalidate = 1800 in the page file.",
        ]}
        signal="A strong answer has a working generateStaticParams with select: ['fields.slug'] for efficiency, correctly wraps the Contentful client call in the page component with the include parameter, implements both EMBEDDED_ASSET and EMBEDDED_ENTRY renderers with defensive content-type checks, and uses revalidatePath (not revalidateTag) in the webhook handler because the tag-based approach requires setting tags on the fetch call."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Contentful's data hierarchy (Space, Environment, Content Type, Entry, Field) maps
          directly to Contentstack's (Organization, Stack, Environment, Content Type, Entry). The
          concepts transfer — the names and some API ergonomics do not.
        </li>
        <li>
          Rich text is a JSON AST in Contentful, not HTML. Always use{" "}
          <code>@contentful/rich-text-react-renderer</code>. Always set <code>include: 2</code>{" "}
          on REST API calls when entries embed assets or other entries in their rich text body.
        </li>
        <li>
          Contentful's GraphQL schema is auto-generated from your content types and is strongly
          typed per content type. This is a significant DX advantage over the generic REST
          response shape.
        </li>
        <li>
          Protocol-relative asset URLs from Contentful require an explicit <code>https:</code>{" "}
          prefix before passing to <code>next/image</code> or any URL parser.
        </li>
        <li>
          The localization model is fundamentally different: Contentful is field-level (one entry
          per content piece, locale values per field), Contentstack is entry-level (one entry per
          locale). This impacts how you query and how editors work.
        </li>
        <li>
          Draft Mode in Next.js works with Contentful by switching from the delivery client to the
          preview client (different host: <code>preview.contentful.com</code>, different token).
        </li>
      </ul>
    </div>
  );
}
