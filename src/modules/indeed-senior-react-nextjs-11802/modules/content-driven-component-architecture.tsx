import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const registryFlowDiagram = String.raw`flowchart TD
    CMS["CMS returns Modular Blocks array\n[{ _content_type_uid: 'hero_section', ... },\n { _content_type_uid: 'cta_banner', ... }]"]
    RB["renderBlocks(blocks)"]
    REG["Component Registry\n{ hero_section: HeroSection,\n  cta_banner: CtaBanner,\n  faq_section: FaqSection }"]
    LOOKUP["Registry lookup by _content_type_uid"]
    COMP["Render matched component\nwith block data as props"]
    FALL["Fallback component\n(console.warn in dev, null in prod)"]

    CMS --> RB
    RB --> LOOKUP
    LOOKUP --> REG
    REG -->|"found"| COMP
    REG -->|"not found"| FALL`;

const richTextDiagram = String.raw`flowchart TD
    RTE["JSON Rich Text from CMS\n{ type: 'doc', children: [...] }"]
    RENDERER["RichTextRenderer (recursive)"]
    PARAGRAPH["paragraph → <p>"]
    HEADING["heading → <h2>/<h3>"]
    MARKS["text + marks → <strong>, <em>, <code>"]
    EMBED_ENTRY["embedded-entry → resolve Entry by uid → render component"]
    EMBED_ASSET["embedded-asset → <img> or <a> with Asset URL"]

    RTE --> RENDERER
    RENDERER --> PARAGRAPH
    RENDERER --> HEADING
    RENDERER --> MARKS
    RENDERER --> EMBED_ENTRY
    RENDERER --> EMBED_ASSET`;

export const toc: TocItem[] = [
  { id: "registry-pattern", title: "The Dynamic Component Registry Pattern", level: 2 },
  { id: "typescript-unions", title: "TypeScript Discriminated Unions for Block Data", level: 3 },
  { id: "unknown-types", title: "Handling Unknown Content Types Gracefully", level: 3 },
  { id: "slot-layouts", title: "Slot-Based Layouts", level: 2 },
  { id: "rich-text-renderer", title: "Rich Text Renderer", level: 2 },
  { id: "rte-embedded", title: "Embedded Entries and Assets", level: 3 },
  { id: "design-system-mapping", title: "Design System Integration", level: 2 },
  { id: "prop-drilling", title: "Avoiding Prop Drilling in Deep Content Trees", level: 2 },
  { id: "storybook-cms", title: "Storybook for CMS Components", level: 2 },
  { id: "patterns-table", title: "Content Composition Patterns Compared", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function ContentDrivenComponentArchitecture() {
  return (
    <div className="article-content">
      <p>
        When a CMS controls page composition — deciding which sections appear, in what order, with
        what content — your React component architecture must match that flexibility. The dynamic
        component registry is the core pattern: a lookup table maps CMS content type identifiers to
        React components, so editors can compose pages without touching code. This module builds
        that system from first principles.
      </p>

      <h2 id="registry-pattern">The Dynamic Component Registry Pattern</h2>
      <MermaidDiagram
        chart={registryFlowDiagram}
        title="Dynamic Component Registry Flow"
        caption="The CMS returns an array of blocks, each tagged with a content type identifier. The registry maps identifiers to components. Unknown types fail gracefully."
        minHeight={460}
      />

      <pre>
        <code>{`// The complete registry pattern

// 1. Define your component registry — one entry per CMS block type
import type { ComponentType } from "react";
import HeroSection from "./blocks/HeroSection";
import CtaBanner from "./blocks/CtaBanner";
import FaqSection from "./blocks/FaqSection";
import ArticleBody from "./blocks/ArticleBody";
import RelatedArticles from "./blocks/RelatedArticles";

// Record<string, ComponentType<any>> — keyed by Contentstack content_type_uid
const BLOCK_REGISTRY: Record<string, ComponentType<{ data: unknown }>> = {
  hero_section: HeroSection,
  cta_banner: CtaBanner,
  faq_section: FaqSection,
  article_body: ArticleBody,
  related_articles: RelatedArticles,
};

// 2. Render function — iterates blocks, looks up component, renders
interface CmsBlock {
  _content_type_uid: string;
  [key: string]: unknown;
}

function renderBlocks(blocks: CmsBlock[]) {
  return blocks.map((block, index) => {
    const Component = BLOCK_REGISTRY[block._content_type_uid];

    if (!Component) {
      // Never crash — graceful degradation is critical in a CMS context
      if (process.env.NODE_ENV === "development") {
        console.warn(
          \`Unknown block type: "\${block._content_type_uid}". Add it to BLOCK_REGISTRY.\`
        );
        return (
          <div key={index} style={{ border: "2px dashed red", padding: "16px" }}>
            Unknown block: {block._content_type_uid}
          </div>
        );
      }
      return null; // In production, silently skip unknown blocks
    }

    return <Component key={index} data={block} />;
  });
}

// 3. Usage in a page component
async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  return (
    <article>
      <h1>{article.title}</h1>
      <RichTextRenderer body={article.body} />
      {article.layout_blocks && renderBlocks(article.layout_blocks)}
    </article>
  );
}`}</code>
      </pre>

      <h3 id="typescript-unions">TypeScript Discriminated Unions for Block Data</h3>
      <p>
        Each block type has a different data shape. TypeScript discriminated unions give you type
        safety in the registry without casting to <code>any</code>:
      </p>

      <pre>
        <code>{`// Define the union type for all possible block shapes
interface HeroBlock {
  _content_type_uid: "hero_section";
  hero_section: {
    headline: string;
    subheadline?: string;
    background_image?: { url: string; dimension: { width: number; height: number } };
  };
}

interface CtaBannerBlock {
  _content_type_uid: "cta_banner";
  cta_banner: {
    text: string;
    button_label: string;
    button_url: string;
  };
}

interface FaqBlock {
  _content_type_uid: "faq_section";
  faq_section: {
    questions: Array<{ question: string; answer: string }>;
  };
}

// Discriminated union — TypeScript narrows the type based on _content_type_uid
type ArticleBlock = HeroBlock | CtaBannerBlock | FaqBlock;

// Type-safe registry — each component gets exactly its block's type
const TYPED_REGISTRY = {
  hero_section: (block: HeroBlock) => <HeroSection data={block.hero_section} />,
  cta_banner: (block: CtaBannerBlock) => <CtaBanner data={block.cta_banner} />,
  faq_section: (block: FaqBlock) => <FaqSection data={block.faq_section} />,
} satisfies { [K in ArticleBlock["_content_type_uid"]]: (block: Extract<ArticleBlock, { _content_type_uid: K }>) => JSX.Element };

function renderTypedBlocks(blocks: ArticleBlock[]) {
  return blocks.map((block, index) => {
    const renderer = TYPED_REGISTRY[block._content_type_uid];
    if (!renderer) return null;
    // TypeScript knows the exact type here due to discriminated union narrowing
    return <div key={index}>{renderer(block as never)}</div>;
  });
}`}</code>
      </pre>

      <h3 id="unknown-types">Handling Unknown Content Types Gracefully</h3>

      <pre>
        <code>{`// Production-safe fallback component
function UnknownBlock({ uid }: { uid: string }) {
  // Only render in development — gives developers immediate feedback
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      style={{
        border: "2px dashed #ef4444",
        borderRadius: "8px",
        padding: "16px",
        margin: "16px 0",
        background: "rgba(239, 68, 68, 0.05)",
      }}
    >
      <strong style={{ color: "#ef4444" }}>Unknown block type: {uid}</strong>
      <p style={{ color: "#6b7280", fontSize: "14px" }}>
        Add this block type to BLOCK_REGISTRY in src/lib/block-registry.ts
      </p>
    </div>
  );
}`}</code>
      </pre>

      <h2 id="slot-layouts">Slot-Based Layouts</h2>
      <p>
        Slot-based layouts take the registry pattern one step further: the CMS controls not just
        which blocks appear, but which region of the page layout they appear in. This is useful when
        a page has a fixed layout (main content area + sidebar) and the CMS decides what goes in
        each slot.
      </p>

      <pre>
        <code>{`// CMS entry might have:
// { main: [article_body, related_articles], sidebar: [author_bio, newsletter_cta] }

interface SlottedPage {
  main: CmsBlock[];
  sidebar: CmsBlock[];
}

function SlottedPageLayout({ page }: { page: SlottedPage }) {
  return (
    <div className="page-grid">
      <main className="page-main">
        {renderBlocks(page.main)}
      </main>
      <aside className="page-sidebar">
        {renderBlocks(page.sidebar)}
      </aside>
    </div>
  );
}`}</code>
      </pre>

      <h2 id="rich-text-renderer">Rich Text Renderer</h2>
      <MermaidDiagram
        chart={richTextDiagram}
        title="Rich Text Renderer Architecture"
        caption="The JSON RTE format is a tree of nodes. The renderer walks the tree recursively, converting each node type to the appropriate React element."
        minHeight={400}
      />

      <pre>
        <code>{`// Contentstack JSON RTE format looks like:
// {
//   "type": "doc",
//   "children": [
//     { "type": "paragraph", "children": [{ "text": "Hello world" }] },
//     { "type": "heading-2", "children": [{ "text": "Section Title" }] },
//     { "type": "text", "text": "Bold text", "bold": true },
//     {
//       "type": "reference",
//       "attrs": { "type": "entry", "entry-uid": "blt123", "content-type-uid": "call_to_action" }
//     }
//   ]
// }

// Custom recursive renderer
interface RteNode {
  type?: string;
  text?: string;
  children?: RteNode[];
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  attrs?: Record<string, string>;
}

interface RichTextRendererProps {
  body: RteNode;
  // Pass resolved embedded entries so renderer can render them
  embeddedEntries?: Record<string, React.ReactNode>;
}

function RenderNode({ node, embeddedEntries }: { node: RteNode; embeddedEntries?: Record<string, React.ReactNode> }) {
  // Leaf text node
  if (node.text !== undefined) {
    let content: React.ReactNode = node.text;
    if (node.bold) content = <strong>{content}</strong>;
    if (node.italic) content = <em>{content}</em>;
    if (node.code) content = <code>{content}</code>;
    if (node.underline) content = <u>{content}</u>;
    return <>{content}</>;
  }

  const children = node.children?.map((child, i) => (
    <RenderNode key={i} node={child} embeddedEntries={embeddedEntries} />
  ));

  switch (node.type) {
    case "doc": return <>{children}</>;
    case "paragraph": return <p>{children}</p>;
    case "heading-1": return <h1>{children}</h1>;
    case "heading-2": return <h2>{children}</h2>;
    case "heading-3": return <h3>{children}</h3>;
    case "ordered-list": return <ol>{children}</ol>;
    case "unordered-list": return <ul>{children}</ul>;
    case "list-item": return <li>{children}</li>;
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "code": return <pre><code>{children}</code></pre>;
    case "reference":
      if (node.attrs?.type === "entry") {
        const uid = node.attrs["entry-uid"];
        return <>{embeddedEntries?.[uid] ?? null}</>;
      }
      if (node.attrs?.type === "asset") {
        return (
          <img
            src={node.attrs.url}
            alt={node.attrs["asset-alt"] ?? ""}
            width={node.attrs.width ? parseInt(node.attrs.width) : undefined}
            height={node.attrs.height ? parseInt(node.attrs.height) : undefined}
          />
        );
      }
      return null;
    default:
      return <>{children}</>;
  }
}

export function RichTextRenderer({ body, embeddedEntries }: RichTextRendererProps) {
  return (
    <div className="rich-text-body">
      <RenderNode node={body} embeddedEntries={embeddedEntries} />
    </div>
  );
}`}</code>
      </pre>

      <h3 id="rte-embedded">Embedded Entries and Assets</h3>
      <p>
        Rich text can contain embedded Contentstack entries (like a call-to-action component or a
        product card) and embedded assets (images). These require resolving the referenced entry or
        asset before rendering. The pattern is to fetch embedded references server-side and pass
        them to the renderer as a uid-keyed map:
      </p>

      <pre>
        <code>{`// Server-side: pre-fetch embedded entries from the RTE
function extractEmbeddedEntryUids(node: RteNode): string[] {
  const uids: string[] = [];
  if (node.type === "reference" && node.attrs?.type === "entry") {
    uids.push(node.attrs["entry-uid"]);
  }
  node.children?.forEach((child) => uids.push(...extractEmbeddedEntryUids(child)));
  return uids;
}

async function resolveEmbeddedEntries(body: RteNode): Promise<Record<string, React.ReactNode>> {
  const uids = extractEmbeddedEntryUids(body);
  if (uids.length === 0) return {};

  // Fetch all embedded entries in one API call using the "in" operator
  const entries = await fetchEntriesByUids(uids);

  // Map uid → rendered React element
  return Object.fromEntries(
    entries.map((entry) => [
      entry.uid,
      // Render based on content type — use a mini-registry here too
      <EmbeddedEntryRenderer key={entry.uid} entry={entry} />,
    ])
  );
}

// Usage in the page:
const embeddedEntries = await resolveEmbeddedEntries(article.body);
return <RichTextRenderer body={article.body} embeddedEntries={embeddedEntries} />;`}</code>
      </pre>

      <h2 id="design-system-mapping">Design System Integration</h2>
      <p>
        At Indeed, the design system (XDS — Indeed Experience Design System) provides the primitive
        components. CMS-driven components consume CMS data and map it to design system primitives.
        The separation prevents CMS components from reinventing UI that the design system already
        provides:
      </p>

      <pre>
        <code>{`// CMS component → Design System primitive mapping pattern

// BAD: CMS component reimplements button styles
function CtaBanner({ data }: { data: CtaBannerData }) {
  return (
    <div>
      <p>{data.text}</p>
      <button style={{ background: "#2557d6", color: "white", padding: "12px 24px" }}>
        {data.button_label}
      </button>
    </div>
  );
}

// GOOD: CMS component uses design system primitives
import { Button, Card } from "@indeed/xds"; // hypothetical design system import

function CtaBanner({ data }: { data: CtaBannerData }) {
  return (
    <Card variant="filled">
      <p>{data.text}</p>
      <Button href={data.button_url} variant="primary">
        {data.button_label}
      </Button>
    </Card>
  );
}`}</code>
      </pre>

      <h2 id="prop-drilling">Avoiding Prop Drilling in Deep Content Trees</h2>

      <pre>
        <code>{`// Deep content trees often need shared context:
// - The current locale (for link generation)
// - Draft mode status (for preview banners)
// - Embedded entries map (pre-fetched server-side)
// - Analytics context (for block-level tracking)

// Solution: React Context at the page level

interface ContentContextValue {
  locale: string;
  isDraft: boolean;
  embeddedEntries: Record<string, React.ReactNode>;
}

const ContentContext = React.createContext<ContentContextValue>({
  locale: "en-us",
  isDraft: false,
  embeddedEntries: {},
});

// Provider wraps the entire article content tree
function ArticlePageContent({
  article,
  locale,
  isDraft,
  embeddedEntries,
}: {
  article: Article;
  locale: string;
  isDraft: boolean;
  embeddedEntries: Record<string, React.ReactNode>;
}) {
  return (
    <ContentContext.Provider value={{ locale, isDraft, embeddedEntries }}>
      <article>
        <ArticleHeader article={article} />
        <RichTextRenderer body={article.body} />
        {article.layout_blocks && renderBlocks(article.layout_blocks)}
      </article>
    </ContentContext.Provider>
  );
}

// Deep child components can access context without prop drilling
function EmbeddedEntryRenderer({ uid }: { uid: string }) {
  const { embeddedEntries } = React.useContext(ContentContext);
  return <>{embeddedEntries[uid] ?? null}</>;
}`}</code>
      </pre>

      <h2 id="storybook-cms">Storybook for CMS Components</h2>

      <pre>
        <code>{`// Storybook story for a CMS-fed component
// The key: args simulate different CMS data shapes

// src/components/blocks/HeroSection.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import HeroSection from "./HeroSection";

const meta: Meta<typeof HeroSection> = {
  title: "CMS Blocks/HeroSection",
  component: HeroSection,
  // argTypes let Storybook controls simulate editor choices
  argTypes: {
    "data.hero_section.headline": {
      control: "text",
      description: "Main headline text from CMS",
    },
  },
};

export default meta;

export const WithImage: StoryObj<typeof HeroSection> = {
  args: {
    data: {
      _content_type_uid: "hero_section",
      hero_section: {
        headline: "Get help with your Indeed account",
        subheadline: "Find answers to your most common questions",
        background_image: {
          url: "https://images.contentstack.io/hero-bg.jpg",
          dimension: { width: 1440, height: 600 },
        },
      },
    },
  },
};

export const WithoutImage: StoryObj<typeof HeroSection> = {
  args: {
    data: {
      _content_type_uid: "hero_section",
      hero_section: {
        headline: "Help Center",
        subheadline: undefined,
        background_image: undefined,
      },
    },
  },
};

export const LongHeadline: StoryObj<typeof HeroSection> = {
  args: {
    data: {
      _content_type_uid: "hero_section",
      hero_section: {
        headline:
          "This is a very long headline that an editor might type to test how the component handles overflow",
        subheadline: "Normal subheadline",
        background_image: undefined,
      },
    },
  },
};`}</code>
      </pre>

      <h2 id="patterns-table">Content Composition Patterns Compared</h2>

      <ArticleTable caption="Four approaches to CMS-driven composition — each with different tradeoffs in flexibility, complexity, and editor control." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>How It Works</th>
              <th>Complexity</th>
              <th>Flexibility</th>
              <th>Editor Control</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Direct Mapping</strong></td>
              <td>One content type → one page template; fields map 1:1 to component props</td>
              <td>Low</td>
              <td>Low — template is fixed</td>
              <td>Field values only</td>
              <td>Homogeneous content (all articles look the same)</td>
            </tr>
            <tr>
              <td><strong>Modular Blocks Registry</strong></td>
              <td>CMS returns array of typed blocks; frontend maps block type → component</td>
              <td>Medium</td>
              <td>High — editors compose pages from sections</td>
              <td>Full page composition</td>
              <td>Landing pages, feature pages, flexible article layouts</td>
            </tr>
            <tr>
              <td><strong>Slots</strong></td>
              <td>Fixed layout regions (main, sidebar); CMS assigns blocks to regions</td>
              <td>Medium</td>
              <td>Medium — layout is fixed, content per region is flexible</td>
              <td>Region content</td>
              <td>Pages with consistent structure (article + sidebar)</td>
            </tr>
            <tr>
              <td><strong>Compound Components</strong></td>
              <td>Parent component exposes named sub-components; CMS decides which sub-components to render</td>
              <td>High</td>
              <td>High — fine-grained composition</td>
              <td>Component-level control</td>
              <td>Complex interactive components (data tables, accordions) with CMS-controlled variants</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you build a component system for a CMS-driven page?'"
        intro="This is the core engineering question for this role. The interviewer wants to see that you have solved this specific problem before — not that you can reason about it hypothetically."
        steps={[
          "Start with the registry: I build a lookup table — a plain JavaScript object — that maps Contentstack's content_type_uid values to React components. This is the core pattern because it decouples the CMS's content model from the component library. Adding a new block type means adding one entry to the registry, not modifying the page renderer.",
          "Explain the block rendering loop: the CMS returns an array of block objects, each tagged with _content_type_uid. I iterate the array, look up the component in the registry, and render it with the block data as props. If the content type isn't in the registry, I show a dev-mode warning and return null in production — never crash.",
          "Describe the TypeScript typing: I use discriminated unions keyed on _content_type_uid. This gives each block component exact type safety for its data without casting to any. The union type also serves as documentation for every supported block type.",
          "Address rich text specifically: Contentstack's JSON RTE format is a tree, not HTML. I write a recursive renderer that walks the tree and converts each node type to a React element. Embedded entries — like a CTA component inside an article body — are pre-fetched server-side and passed as a uid-keyed map to the renderer.",
          "Close with Storybook: every CMS block component has Storybook stories where args simulate different CMS data shapes. This lets the team validate how components handle edge cases — empty fields, maximum content length, missing optional fields — without needing a CMS account.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Implement the Dynamic Registry Pattern with TypeScript and Graceful Fallback"
        scenario={
          <span>
            A Contentstack article entry has a <code>layout_blocks</code> field that returns an
            array of modular blocks. A sample response looks like:
            <br />
            <code>{`[`}</code>
            <br />
            <code>{`  { _content_type_uid: "hero_section", hero_section: { headline: "Help Center" } },`}</code>
            <br />
            <code>{`  { _content_type_uid: "article_body", article_body: { content: {...} } },`}</code>
            <br />
            <code>{`  { _content_type_uid: "cta_banner", cta_banner: { text: "...", button_label: "...", button_url: "..." } },`}</code>
            <br />
            <code>{`  { _content_type_uid: "unknown_future_type", ... }`}</code>
            <br />
            <code>{`]`}</code>
          </span>
        }
        tasks={[
          "Define TypeScript discriminated union types for HeroBlock, ArticleBodyBlock, and CtaBannerBlock based on the data shapes above",
          "Build the BLOCK_REGISTRY typed as Record<string, ComponentType> with entries for the three known block types",
          "Write the renderBlocks function that handles both known types (render component) and unknown types (dev warning, prod null)",
          "Show how you would extend the registry for a new 'faq_section' block type without modifying the renderBlocks function",
          "Explain how you would test this registry — what unit test would you write to verify the fallback behavior?",
        ]}
        pitfalls={[
          "Using a switch statement instead of a registry object — switch requires modifying the renderer to add new block types, violating open/closed principle",
          "Casting all block data to any — loses type safety on the component props and allows runtime errors to slip past TypeScript",
          "Crashing when _content_type_uid is unknown — in production, a CMS can have block types that the current frontend hasn't deployed support for yet",
          "Not using Storybook stories — the only way to test CMS components without a real CMS is to simulate data shapes in stories",
        ]}
        signal="A strong answer uses a plain object registry (not switch), defines discriminated union types, renders null in production for unknown types, and mentions that new block types are additive — no modification to existing code required."
      />
    </div>
  );
}
