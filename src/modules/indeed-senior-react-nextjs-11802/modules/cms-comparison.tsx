import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const decisionFlowDiagram = String.raw`flowchart TD
    START(["Which CMS should we use?"])
    START --> B1{"Budget under\n$10k/year?"}

    B1 -->|Yes| B2{"Need custom\nbusiness logic\nin CMS layer?"}
    B1 -->|No| B3{"Enterprise editorial\nworkflows needed?\n(approvals, branching,\nmulti-brand)"}

    B2 -->|Yes| REC_STRAPI["Strapi\nSelf-hosted, free,\nfull Node.js control"]
    B2 -->|No — just a CMS| B4{"DevOps team\navailable?"}

    B4 -->|Yes| REC_STRAPI
    B4 -->|No — 2-person team| REC_CF["Contentful\nBest DX, free tier,\nmanaged SaaS"]

    B3 -->|Yes| B5{"Team size\n> 20 editors?"}
    B3 -->|No| REC_CF

    B5 -->|Yes| REC_CS["Contentstack\nEnterprise workflows,\nrole-based publishing,\nmulti-stack"]
    B5 -->|No| REC_CF2["Contentful\nor Strapi Cloud\n(managed Strapi)"]`;

const architectureComparisonDiagram = String.raw`flowchart LR
    subgraph CF ["Contentful (SaaS)"]
      direction TB
      CF_ADMIN["Web App\napp.contentful.com"]
      CF_CDN["Global CDN\n(Fastly — all API calls cached)"]
      CF_REST["REST API\ncdn.contentful.com"]
      CF_GQL["GraphQL API\ngraphql.contentful.com"]
      CF_SDK["contentful SDK\n(typed JS/TS client)"]
      CF_ADMIN --> CF_CDN
      CF_CDN --> CF_REST
      CF_CDN --> CF_GQL
      CF_REST --> CF_SDK
      CF_GQL --> CF_SDK
    end

    subgraph CS ["Contentstack (SaaS)"]
      direction TB
      CS_ADMIN["Web App\napp.contentstack.com"]
      CS_CDN["Global CDN\n(AWS CloudFront)"]
      CS_REST["REST API\ncdn.contentstack.io"]
      CS_GQL["GraphQL API\ngraphql.contentstack.com"]
      CS_SDK["contentstack SDK\n(JS/TS client)"]
      CS_ADMIN --> CS_CDN
      CS_CDN --> CS_REST
      CS_CDN --> CS_GQL
      CS_REST --> CS_SDK
      CS_GQL --> CS_SDK
    end

    subgraph ST ["Strapi (Self-Hosted)"]
      direction TB
      ST_ADMIN["Admin Panel\nyour-cms.example.com/admin"]
      ST_NODE["Node.js Server\n(your infra — VPS / K8s / Strapi Cloud)"]
      ST_REST["REST API\n/api/:contentType"]
      ST_GQL["GraphQL API\n/graphql\n(@strapi/plugin-graphql)"]
      ST_FETCH["fetch() / no official SDK\n(use typed fetch helpers)"]
      ST_ADMIN --> ST_NODE
      ST_NODE --> ST_REST
      ST_NODE --> ST_GQL
      ST_REST --> ST_FETCH
      ST_GQL --> ST_FETCH
    end

    NX["Next.js App Router\nServer Components"]
    CF_SDK --> NX
    CS_SDK --> NX
    ST_FETCH --> NX`;

export const toc: TocItem[] = [
  { id: "the-three-archetypes", title: "The Three Archetypes", level: 2 },
  { id: "hosting-and-ops", title: "Hosting and Operational Model", level: 2 },
  { id: "content-modeling-comparison", title: "Content Modeling Comparison", level: 2 },
  { id: "api-comparison", title: "API and SDK Comparison", level: 2 },
  { id: "rich-text-comparison", title: "Rich Text: Where They Diverge Most", level: 2 },
  { id: "dx-and-tooling", title: "Developer Experience and Tooling", level: 2 },
  { id: "pricing-and-scale", title: "Pricing and Scale", level: 2 },
  { id: "when-to-recommend-each", title: "When to Recommend Each", level: 2 },
  { id: "api-syntax-comparison", title: "API Query Syntax Side by Side", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CmsComparison() {
  return (
    <div className="article-content">
      <p>
        You have studied Contentful, Contentstack, and Strapi individually. This module is the
        synthesis: a head-to-head reference covering every dimension that matters when choosing or
        discussing a CMS at the senior engineer level. The goal is to walk into any interview
        question about CMS selection with a structured mental model, concrete tradeoff knowledge,
        and a defensible recommendation process — not just a list of features.
      </p>

      <h2 id="the-three-archetypes">The Three Archetypes</h2>
      <p>
        Each CMS embodies a different philosophy about who owns the infrastructure and who benefits
        from the product:
      </p>
      <ul>
        <li>
          <strong>Contentful</strong> — developer-first SaaS. Built to give engineering teams the
          best API ergonomics and TypeScript integration in a managed service. The free tier is
          genuinely usable. The SDK is the most polished of the three. It wins on developer
          experience and time-to-productivity.
        </li>
        <li>
          <strong>Contentstack</strong> — enterprise editorial SaaS. Built for large organizations
          with complex content operations: multiple brands managed from one CMS, granular
          role-based access control, approval workflows before publishing, content branching for
          experiments. It wins on organizational-scale editorial features. No free tier — it is
          priced for enterprise buyers.
        </li>
        <li>
          <strong>Strapi</strong> — open-source self-hosted. Built for teams that want maximum
          control, zero vendor lock-in, and the ability to write Node.js business logic inside the
          CMS layer itself. Free to use (you pay for infrastructure). It wins on customization
          depth and budget.
        </li>
      </ul>

      <MermaidDiagram
        chart={decisionFlowDiagram}
        title="CMS Selection Decision Flowchart"
        caption="The primary decision axes are budget, editorial team size and workflow complexity, and whether custom server-side logic is needed in the CMS layer. Most engineering teams fit cleanly into one branch of this tree."
        minHeight={460}
      />

      <h2 id="hosting-and-ops">Hosting and Operational Model</h2>
      <p>
        The hosting model is the most consequential architectural decision — it determines ongoing
        operational burden, data sovereignty, and pricing structure for the life of the project.
      </p>
      <ul>
        <li>
          <strong>Contentful:</strong> Fully managed SaaS. Contentful operates the database,
          CDN, and API infrastructure. You have zero ops responsibility. Content API calls are
          served via a global Fastly CDN — response times are fast globally without any
          configuration. The downside: your content is stored in Contentful's systems. Data
          portability and export tooling are limited to what they provide.
        </li>
        <li>
          <strong>Contentstack:</strong> Fully managed SaaS with enterprise SLAs. Same zero-ops
          model as Contentful, with dedicated support contracts, guaranteed uptime SLAs, and
          single-tenancy options for enterprise customers who need data isolation. Content is stored
          in Contentstack's systems.
        </li>
        <li>
          <strong>Strapi:</strong> Default mode is fully self-hosted — you provision and operate
          a server, a PostgreSQL database, and a file storage provider (S3 or Cloudinary). You own
          all the data. Strapi Cloud (their managed hosting starting at $29/month) provides a
          middle path: Strapi software managed by Strapi Inc., similar to how Contentful works,
          but migrating away is straightforward since the software is open-source.
        </li>
      </ul>

      <MermaidDiagram
        chart={architectureComparisonDiagram}
        title="Architecture Stack Comparison"
        caption="Contentful and Contentstack both place a CDN in front of their API, so content delivery is fast globally by default. Strapi's performance depends on where you host it and whether you add a CDN in front. All three integrate with Next.js Server Components via fetch, but Contentful and Contentstack have official SDKs while Strapi relies on typed fetch helpers."
        minHeight={500}
      />

      <h2 id="content-modeling-comparison">Content Modeling Comparison</h2>
      <p>
        The core primitives — a schema definition (Content Type) and an instance of that schema
        (Entry) — are identical across all three. The differences are in the modular content
        approach, localization model, and how media is handled.
      </p>

      <ArticleTable
        caption="Feature comparison matrix across Contentful, Contentstack, and Strapi — covering every dimension relevant to a senior engineer making or defending a CMS choice."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Contentful</th>
              <th>Contentstack</th>
              <th>Strapi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Hosting model</strong></td>
              <td>Fully managed SaaS</td>
              <td>Fully managed SaaS (enterprise SLAs)</td>
              <td>Self-hosted or Strapi Cloud (managed)</td>
            </tr>
            <tr>
              <td><strong>Free tier</strong></td>
              <td>Yes — 25,000 records, 2 users, 2 environments</td>
              <td>No</td>
              <td>Free and open-source (self-host costs only)</td>
            </tr>
            <tr>
              <td><strong>GraphQL built-in</strong></td>
              <td>Yes — auto-generated, strongly typed per CT</td>
              <td>Yes — fixed schema, manually documented</td>
              <td>Via plugin only (<code>@strapi/plugin-graphql</code>)</td>
            </tr>
            <tr>
              <td><strong>TypeScript SDK</strong></td>
              <td>Yes — <code>contentful</code> package, generic typed</td>
              <td>Yes — <code>@contentstack/delivery-sdk</code></td>
              <td>No official SDK — use typed fetch helpers</td>
            </tr>
            <tr>
              <td><strong>Type generation</strong></td>
              <td><code>cf-content-types-generator</code> CLI</td>
              <td>Manual or CLI codegen</td>
              <td>v5 generates TypeScript types automatically from schema</td>
            </tr>
            <tr>
              <td><strong>Localization model</strong></td>
              <td>Field-level: one entry, multiple locale values per field</td>
              <td>Entry-level: separate localized entry per locale</td>
              <td>Document-level (v5): locale variant per document</td>
            </tr>
            <tr>
              <td><strong>Modular content</strong></td>
              <td>References to other entries (no native block builder)</td>
              <td>Modular Blocks — ordered array of typed block entries</td>
              <td>Dynamic Zones — ordered array of typed components</td>
            </tr>
            <tr>
              <td><strong>Local development</strong></td>
              <td>Cloud only — no local CMS instance</td>
              <td>Cloud only — no local CMS instance</td>
              <td>Full local setup with SQLite — no cloud dependency</td>
            </tr>
            <tr>
              <td><strong>Webhook system</strong></td>
              <td>On publish/unpublish; custom headers for secret</td>
              <td>On publish/unpublish/update; built-in secret field</td>
              <td>Built-in webhook manager in admin; configurable events and headers</td>
            </tr>
            <tr>
              <td><strong>Content preview</strong></td>
              <td>Preview API (different host + token) + Next.js Draft Mode</td>
              <td>Preview token (same host) + Next.js Draft Mode</td>
              <td>Draft API token + <code>?status=draft</code> + Next.js Draft Mode</td>
            </tr>
            <tr>
              <td><strong>Media CDN</strong></td>
              <td>Built-in — images.ctfassets.net with image transformations</td>
              <td>Built-in — images.contentstack.io</td>
              <td>None by default — must add S3/Cloudinary provider for CDN delivery</td>
            </tr>
            <tr>
              <td><strong>Migration tooling</strong></td>
              <td><code>contentful-migration</code> CLI — JS/TS migration scripts</td>
              <td>CLI + migration scripts</td>
              <td>Database migrations via Strapi migration API (v5) or raw SQL</td>
            </tr>
            <tr>
              <td><strong>Custom server-side logic</strong></td>
              <td>Not possible — SaaS, no code access</td>
              <td>Not possible — SaaS, no code access</td>
              <td>Full Node.js: controllers, services, lifecycles, plugins</td>
            </tr>
            <tr>
              <td><strong>Community &amp; ecosystem</strong></td>
              <td>Very large — most-deployed headless CMS</td>
              <td>Medium — enterprise-focused</td>
              <td>Large — most-starred CMS on GitHub</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="api-comparison">API and SDK Comparison</h2>
      <p>
        All three CMSes expose REST and GraphQL APIs. The differences are in authentication
        mechanics, SDK quality, and how you handle relations and nested content. These details
        determine how much boilerplate your data-fetching layer requires.
      </p>
      <ul>
        <li>
          <strong>Authentication:</strong> All three use API key/token authentication. Contentful
          uses a bearer token in the Authorization header and has separate delivery and preview
          tokens (different API hostnames). Contentstack uses an API key plus delivery token as
          query parameters or headers. Strapi uses a bearer token generated in the admin panel.
        </li>
        <li>
          <strong>Relation inclusion:</strong> Contentful REST uses an <code>include</code> depth
          integer (1–10). Contentstack uses <code>include[]</code> array params with dot notation
          for nested fields. Strapi uses verbose bracket notation per-field (<code>populate[author][populate][0]=avatar</code>).
          Contentful and Contentstack have the more ergonomic syntax.
        </li>
        <li>
          <strong>GraphQL ergonomics:</strong> Contentful's schema is auto-generated and strongly
          typed per content type — each CT has its own GraphQL type and Collection type. Contentstack's
          schema is manually maintained and more generic. Strapi's GraphQL requires a plugin but mirrors
          content types once installed. In GraphQL, Strapi is the most ergonomic because queried
          fields are automatically fetched without populate parameters.
        </li>
        <li>
          <strong>Webhooks:</strong> All three support webhooks for cache invalidation. The payload
          shape differs — Contentful sends <code>fields.slug["en-US"]</code> (locale-keyed),
          Contentstack sends the entry with <code>data.url</code>, Strapi sends{" "}
          <code>entry.slug</code> directly. Always check the payload shape in the platform's
          webhook documentation before writing your Route Handler.
        </li>
      </ul>

      <h2 id="rich-text-comparison">Rich Text: Where They Diverge Most</h2>
      <p>
        None of the three CMSes stores rich text as HTML. All three use JSON-based formats. But
        the formats are incompatible with each other, each requires a different renderer, and the
        approach to embedded content differs significantly. Rich text handling is the #1 source of
        integration complexity in CMS projects.
      </p>

      <ArticleTable
        caption="Rich text format comparison across Contentful, Contentstack, and Strapi — format description, renderer library, embedded entry approach, custom marks support, and practical migration complexity."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Contentful</th>
              <th>Contentstack</th>
              <th>Strapi v5</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Format name</strong></td>
              <td>Rich Text (Contentful Document AST)</td>
              <td>JSON Rich Text Editor (Supercharged RTE)</td>
              <td>Blocks (Slate-inspired block nodes)</td>
            </tr>
            <tr>
              <td><strong>Storage shape</strong></td>
              <td>
                <code>{"{ nodeType: 'document', content: [...] }"}</code> — recursive tree of typed nodes
              </td>
              <td>
                JSON with <code>{"{ type, attrs, children }"}</code> structure (ProseMirror-inspired)
              </td>
              <td>
                <code>{"BlocksContent[]"}</code> — flat array of typed block objects with <code>type</code> and <code>children</code>
              </td>
            </tr>
            <tr>
              <td><strong>Renderer library</strong></td>
              <td><code>@contentful/rich-text-react-renderer</code> — <code>documentToReactComponents(doc, options)</code></td>
              <td><code>@contentstack/utils</code> — <code>Utils.jsonToHTML()</code> or custom React renderer</td>
              <td><code>@strapi/blocks-react-renderer</code> — <code>{"<BlocksRenderer content={body} />"}</code></td>
            </tr>
            <tr>
              <td><strong>Custom node extension</strong></td>
              <td><code>renderNode</code> map — override any BLOCKS.* or INLINES.* type</td>
              <td>Custom HTML or React renderer via <code>customHtmlTag</code> callbacks</td>
              <td><code>blocks</code> prop on <code>BlocksRenderer</code> — override by block type</td>
            </tr>
            <tr>
              <td><strong>Embedded entries in body</strong></td>
              <td>
                <code>BLOCKS.EMBEDDED_ENTRY</code> node — resolve via <code>include: 2</code>, render in <code>renderNode[BLOCKS.EMBEDDED_ENTRY]</code>
              </td>
              <td>
                Embedded entry references — requires <code>@contentstack/utils</code> to resolve GQL entry references in the AST
              </td>
              <td>
                Not natively supported in Blocks — use Dynamic Zones for mixed content types in the article body
              </td>
            </tr>
            <tr>
              <td><strong>Embedded assets</strong></td>
              <td>
                <code>BLOCKS.EMBEDDED_ASSET</code> — renders images, PDFs, etc. Asset URL is protocol-relative (needs <code>https:</code> prefix)
              </td>
              <td>
                Image blocks via <code>asset</code> reference — URL is absolute from Contentstack CDN
              </td>
              <td>
                Image blocks in Blocks format include the URL directly — relative to Strapi origin unless S3 provider configured
              </td>
            </tr>
            <tr>
              <td><strong>Custom marks (bold, italic, code)</strong></td>
              <td>Marks on text nodes — configurable in <code>renderMark</code></td>
              <td>Mark-equivalent spans in children array</td>
              <td>Bold, italic, strikethrough, underline, code inline — customizable via <code>modifiers</code> prop</td>
            </tr>
            <tr>
              <td><strong>Migrate from v3/v4</strong></td>
              <td>Stable format since v1 — no breaking changes to AST</td>
              <td>Stable format</td>
              <td>v5 Blocks format is incompatible with v4 Quill format — migration required</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// Contentful rich text renderer
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS } from '@contentful/rich-text-types'

const contentfulOptions = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: (node) => {
      const { file, title } = node.data.target.fields
      return <img src={\`https:\${file.url}\`} alt={title} />
      //                 ^^^^^^^^ protocol-relative URL fix
    },
  },
}

// Usage
documentToReactComponents(entry.fields.body, contentfulOptions)

// ---

// Contentstack — JSON RTE renderer (simplified custom approach)
// @contentstack/utils converts the JSON RTE to HTML
import { Utils } from '@contentstack/utils'

const renderOption = {
  ['p']: (node, next) => \`<p class="article-p">\${next(node.children)}</p>\`,
  ['img']: (node) => \`<img src="\${node.attrs.src}" alt="\${node.attrs['redactor-attributes']?.alt}" />\`,
}

Utils.jsonToHTML({ entry, paths: ['body'], renderOption })

// ---

// Strapi v5 Blocks renderer
import { BlocksRenderer } from '@strapi/blocks-react-renderer'

// BlocksRenderer accepts the BlocksContent[] array from the article's body field
// Customize per block type with the blocks and modifiers props
<BlocksRenderer
  content={article.body}
  blocks={{
    image: ({ image }) => (
      <img
        src={\`\${process.env.STRAPI_URL}\${image.url}\`}
        alt={image.alternativeText ?? ''}
        width={image.width}
        height={image.height}
      />
    ),
    code: ({ plainText }) => (
      <pre><code>{plainText}</code></pre>
    ),
  }}
/>
`}</code>
      </pre>

      <h2 id="dx-and-tooling">Developer Experience and Tooling</h2>
      <p>
        Developer experience differences compound over the length of a project. They are worth
        understanding before you are six months into an integration.
      </p>
      <ul>
        <li>
          <strong>Local development:</strong> Strapi is the clear winner — you run the entire CMS
          on your laptop. Contentful and Contentstack are cloud-only; local development requires an
          internet connection and access to a shared cloud space. Teams on Contentful/Contentstack
          typically set up a dedicated "development" environment and share it across developers,
          which creates coordination overhead and can cause conflicts when multiple developers
          modify schemas.
        </li>
        <li>
          <strong>TypeScript type generation:</strong> Contentful has the most mature tooling —{" "}
          <code>cf-content-types-generator</code> CLI downloads your content types from the
          Contentful API and generates TypeScript interfaces. Strapi v5 generates types
          automatically as a side effect of the build. Contentstack requires manual typing or
          community tools.
        </li>
        <li>
          <strong>Content migration:</strong> Contentful has a first-party migration CLI and format
          (JS scripts using a migration DSL). Contentstack has CLI tooling. Strapi in v5 has a
          migration API but schema changes via the Content Type Builder in local dev and git commits
          is the most common pattern — schema JSON files are in version control.
        </li>
        <li>
          <strong>Content preview:</strong> All three integrate with Next.js Draft Mode, but the
          setup differs. Contentful requires a second client pointed at a different host. Contentstack
          uses the same host with a preview token. Strapi uses the same API endpoint with a
          different token and <code>?status=draft</code>.
        </li>
      </ul>

      <h2 id="pricing-and-scale">Pricing and Scale</h2>
      <p>
        Pricing is often the deciding factor in CMS selection, especially when the decision-maker
        is a product manager or engineering manager rather than a developer.
      </p>
      <ul>
        <li>
          <strong>Contentful:</strong> Free Community tier supports up to 25,000 records, 2 roles,
          2 environments, and 2 users. The Growth plan (from ~$300/month) adds more users, content
          types, and environments. Enterprise plans with custom pricing support millions of records
          and SLAs. Cost scales with content volume and team size.
        </li>
        <li>
          <strong>Contentstack:</strong> No free tier. Pricing starts around $1,500/month for the
          Growth plan and scales to tens of thousands per month for large enterprise deployments.
          It is not designed for small teams or projects. The pricing is justified by the editorial
          workflow features, dedicated support, and enterprise SLAs that large organizations
          require.
        </li>
        <li>
          <strong>Strapi:</strong> Open-source core is free. Self-hosting costs are infrastructure
          only — typically $20–100/month for a VPS or small Kubernetes deployment with PostgreSQL.
          Strapi Cloud starts at $29/month for managed hosting. The Enterprise plan (self-hosted
          or Cloud) adds SSO, audit logs, and dedicated support.
        </li>
      </ul>
      <p>
        The practical summary: Strapi wins on budget below $10k/year. Contentful is the best
        value for small-to-medium developer-led projects. Contentstack is only justifiable for
        enterprises with complex editorial operations that need the workflow and governance features.
      </p>

      <h2 id="when-to-recommend-each">When to Recommend Each</h2>
      <p>
        A structured recommendation process — ask clarifying questions before naming a CMS — signals
        architectural maturity in an interview. The key axes:
      </p>
      <ul>
        <li>
          <strong>Recommend Contentful when:</strong> Developer-led project, good TypeScript
          integration matters, a free tier is needed to start, team is small (under 10 editors),
          global CDN performance is important without ops overhead, and you want the largest
          ecosystem of tutorials and community resources.
        </li>
        <li>
          <strong>Recommend Contentstack when:</strong> Enterprise buyer with complex editorial
          workflows (approval chains, role-based publishing), multiple brand management from one
          CMS, large editorial team (20+ editors), guaranteed SLA is a procurement requirement,
          and budget is not the primary constraint.
        </li>
        <li>
          <strong>Recommend Strapi when:</strong> Custom Node.js business logic is needed in the
          CMS layer (computed fields, complex validation, side effects on publish), team has
          DevOps capability, budget is tight, avoiding vendor lock-in is a priority, or local
          development workflow for the CMS layer is important.
        </li>
        <li>
          <strong>Recommend Strapi Cloud when:</strong> Team wants Strapi's flexibility and open-
          source nature but does not want to manage infrastructure — a middle path between
          full self-hosting and pure SaaS.
        </li>
      </ul>

      <h2 id="api-syntax-comparison">API Query Syntax Side by Side</h2>
      <p>
        The most useful reference for switching between CMSes is seeing the exact syntax for the
        same operation across all three. The operation: fetch an article by slug, including the
        author (with their avatar image) and the categories relation.
      </p>

      <ArticleTable
        caption="The exact query syntax to fetch an article by slug with author (including avatar) and categories populated — across all five API surfaces. This is the query you will write most often in a CMS-backed Help Center."
        minWidth={1000}
      >
        <table>
          <thead>
            <tr>
              <th>CMS + API</th>
              <th>Exact query / URL</th>
              <th>Key note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Contentful REST</strong></td>
              <td>
                <code>
                  GET /spaces/:space/entries?content_type=helpArticle&fields.slug=my-slug&include=2&limit=1
                </code>
              </td>
              <td><code>include=2</code> resolves linked entries and assets up to 2 levels deep. No explicit field selection needed — all fields returned.</td>
            </tr>
            <tr>
              <td><strong>Contentful GraphQL</strong></td>
              <td>
                <code>
                  {"helpArticleCollection(where: { slug: $slug }, limit: 1) { items { title slug body { json } author { name avatar { url } } category { name } } }"}
                </code>
              </td>
              <td>Relations are queried inline — no populate parameter. Rich text body returns <code>{"{ json }"}</code> in GraphQL.</td>
            </tr>
            <tr>
              <td><strong>Contentstack REST</strong></td>
              <td>
                <code>
                  {"GET /stacks/:api_key/content_types/help_article/entries?query={\"url\":\"/help/my-slug\"}&include[]=author&include[]=categories&environment=production"}
                </code>
              </td>
              <td><code>include[]</code> takes relation field names. Author's avatar requires a second <code>include[]</code> with dot notation if nested.</td>
            </tr>
            <tr>
              <td><strong>Contentstack GraphQL</strong></td>
              <td>
                <code>
                  {"helpArticleCollection(where: { url: \"/help/my-slug\" }) { items { title body author { name avatarConnection { edges { node { url } } } } categoriesConnection { edges { node { name } } } } }"}
                </code>
              </td>
              <td>Contentstack GraphQL uses Connection pattern for relations (<code>*Connection.edges.node</code>). Less ergonomic than Contentful.</td>
            </tr>
            <tr>
              <td><strong>Strapi REST</strong></td>
              <td>
                <code>
                  {"GET /api/articles?filters[slug][$eq]=my-slug&populate[author][populate][0]=avatar&populate[categories]=true&pagination[pageSize]=1"}
                </code>
              </td>
              <td>The most verbose syntax. Each nested relation requires its own bracketed populate parameter. Media fields also need populate.</td>
            </tr>
            <tr>
              <td><strong>Strapi GraphQL</strong></td>
              <td>
                <code>
                  {"articles(filters: { slug: { eq: $slug } }, pagination: { limit: 1 }) { documentId title body author { name avatar { url } } categories { name } }"}
                </code>
              </td>
              <td>GraphQL is the most ergonomic Strapi API — relations are queried inline without populate params. Note: <code>documentId</code> not <code>id</code>.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="We are choosing a headless CMS for our Help Center — what would you recommend and why?"
        intro="This is one of the most common system design questions for senior frontend/fullstack roles at companies running content-heavy products. The strongest answers ask clarifying questions before committing to a recommendation, then use those answers to drive a structured decision. Showing the decision framework is more impressive than naming a winner immediately."
        steps={[
          "Open by asking clarifying questions: team size and composition (developers vs editors), expected content volume (hundreds vs thousands of articles), number of languages/locales, whether custom business logic is needed in the CMS layer, annual tech budget, and whether the team has DevOps capacity. Explain that the right CMS depends heavily on these factors.",
          "Frame the decision around the three archetypes: Contentful for developer-led projects with good DX needs and moderate editorial team size; Contentstack for enterprise with complex editorial workflows and large content teams; Strapi for teams that need custom logic, full data control, or have budget constraints.",
          "Address the operational model explicitly: Contentful and Contentstack are zero-ops SaaS — you pay for the service and they manage the infrastructure. Strapi is software you deploy — you manage the database, backups, and scaling, unless you use Strapi Cloud. For a small engineering team, the Strapi ops burden often outweighs its benefits unless the team already has DevOps maturity.",
          "Discuss rich text handling as a practical consideration: all three use JSON-based formats that require custom renderers. Contentful's documentToReactComponents is the most mature. Strapi's BlocksRenderer is newer but clean. Neither is HTML — embedded entries in rich text are the most complex integration point regardless of which CMS you choose.",
          "Close with a concrete recommendation for the Help Center scenario: if the team is developer-led with moderate editorial needs and wants best-in-class DX, Contentful is the default choice. If the company has 50+ editors, complex approval workflows, or is an enterprise buyer, Contentstack. If budget is tight or custom logic in the CMS layer is needed, Strapi self-hosted or Strapi Cloud.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="CMS Selection for Two Contrasting Help Center Scenarios"
        scenario={
          <span>
            You are advising on CMS selection for two different clients who both want to build a
            Help Center. <strong>Client A</strong> is a Fortune 500 company: 50 editors across
            regional content teams, 10,000 articles, 8 languages with regional variations,
            multi-level approval workflows (author writes, regional editor reviews, legal approves,
            VP publishes), a $50k/year tech budget, and a dedicated DevOps team. The Help Center
            is a critical customer-facing product with a 99.9% uptime SLA requirement.{" "}
            <strong>Client B</strong> is a seed-stage startup: 2 engineers, 200 articles planned,
            English only, no approval workflow needed (engineers publish directly), $5k/year total
            tech budget, and no dedicated infrastructure team.
          </span>
        }
        tasks={[
          "Choose a CMS for Client A and justify every dimension of the decision: hosting model (why managed SaaS), editorial workflow features (approval chains, role-based access), localization approach (8 languages with regional variations), uptime SLA requirements, and total cost of ownership at this scale.",
          "Choose a CMS for Client B and justify every dimension: why a free tier or open-source is appropriate, what the ops burden looks like for a 2-person team, how the content model stays simple at 200 articles, and what the growth path looks like if they scale to 2,000 articles next year.",
          "For Client A's CMS choice: describe the Next.js integration architecture. How does the frontend fetch content? What rendering strategy (SSG, ISR, SSR) and why? How does on-demand revalidation work when a content manager in Tokyo publishes an article? How does Draft Mode work for the legal review step?",
          "For Client B's CMS choice: describe the same Next.js integration. What is the deployment topology — where does the CMS live relative to the Next.js app? What does local development look like for the two engineers? How do they handle the database backups?",
          "Both clients ask: what if we need to migrate to a different CMS in two years? For each CMS you chose, describe the migration path and what the biggest migration risks are (data portability, schema compatibility, rich text format conversion).",
        ]}
        pitfalls={[
          "Recommending Strapi for Client A without accounting for the 99.9% SLA requirement — Strapi self-hosted places the SLA responsibility on your team. Strapi Cloud offers SLAs but at a cost that may approach Contentful pricing. Enterprise clients with SLA requirements typically need a managed SaaS with contractual uptime guarantees.",
          "Recommending Contentstack for Client B — Contentstack has no free tier and enterprise pricing that starts at roughly $1,500/month. This is 3.6x the entire annual tech budget. Even if it had the best features, it is not a viable option at this scale.",
          "Not addressing the localization model difference for Client A. 8 languages with regional variations is a content modeling decision: Contentful's field-level localization means one entry per article, values per locale. Contentstack's entry-level localization means separate entries per locale. For 10,000 articles across 8 locales, this multiplies editorial management complexity.",
          "Ignoring the rich text migration risk — if Client A chooses Contentful and wants to migrate to Contentstack later, the Contentful Document AST format must be converted to Contentstack's JSON RTE format. This is not a one-click migration. Every article's body field requires a conversion script. This is a real migration risk worth surfacing.",
          "Treating all three CMSes as interchangeable — the point of this challenge is to demonstrate that CMS selection is a consequential architectural decision with real tradeoffs, not a commodity choice where any option works equally well.",
        ]}
        signal="A strong answer recommends Contentstack for Client A (enterprise workflows, SLA, 50 editors, localization at scale) and Contentful free tier or Strapi for Client B (budget, small team, simple editorial needs). It addresses each dimension of the decision explicitly, correctly identifies the localization model difference as critical for Client A, and honestly describes the migration risks for both choices — including that rich text format conversion is non-trivial."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The three CMSes represent three distinct archetypes: Contentful (developer-first SaaS),
          Contentstack (enterprise editorial SaaS), and Strapi (open-source self-hosted). The
          hosting model is the most consequential architectural difference — it determines ops
          burden, data sovereignty, and pricing for the life of the project.
        </li>
        <li>
          All three have REST and GraphQL APIs, webhook systems, and Next.js Draft Mode
          integration. The integration pattern is similar — the differences are in authentication
          mechanics, relation inclusion syntax, and SDK availability.
        </li>
        <li>
          Rich text is the most complex integration point regardless of CMS choice. None output
          HTML — all use JSON ASTs requiring custom renderers. Contentful's{" "}
          <code>documentToReactComponents</code>, Contentstack's <code>Utils.jsonToHTML</code>, and
          Strapi's <code>BlocksRenderer</code> all handle this, but embedded entry handling is
          custom in all three.
        </li>
        <li>
          Strapi's populate syntax (bracket notation per-field) is the most verbose of the three
          for REST API calls. Strapi GraphQL is the most ergonomic because relations are queried
          inline without populate parameters.
        </li>
        <li>
          Contentstack's entry-level localization (separate entry per locale) and Contentful's
          field-level localization (one entry, locale values per field) are fundamentally different
          content models. At scale (10,000 articles, 8 languages), this difference has significant
          implications for editorial workflow and API query design.
        </li>
        <li>
          When asked to recommend a CMS, always ask about team size, editorial workflow complexity,
          budget, localization requirements, and DevOps capacity before naming a winner. The right
          CMS depends entirely on these constraints.
        </li>
      </ul>
    </div>
  );
}
