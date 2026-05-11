import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const componentTreeDiagram = String.raw`flowchart TD
    ARTICLE_PAGE["ArticlePage (Server)\nFetches CMS data\nNo client bundle cost"]
    ARTICLE_HEADER["ArticleHeader (Server)\nTitle, author, date\nStatic — no interactivity"]
    RICH_TEXT["RichTextRenderer (Server)\nStatic HTML from CMS JSON\nNo client bundle"]
    FEEDBACK["FeedbackWidget (Client)\nuseState, useMutation\n'use client'"]
    TOC["TableOfContents (Client)\nuseActiveSection, scroll listener\n'use client'"]
    SEARCH["SearchOverlay (Client)\nuseQuery, keyboard handler\n'use client'"]

    ARTICLE_PAGE -->|"fetches, passes data"| ARTICLE_HEADER
    ARTICLE_PAGE -->|"fetches, passes body"| RICH_TEXT
    ARTICLE_PAGE -->|"renders uid as prop"| FEEDBACK
    ARTICLE_PAGE -->|"renders toc data"| TOC
    ARTICLE_PAGE -->|"renders (no data)"| SEARCH`;

const hydrationDebugDiagram = String.raw`flowchart TD
    HE["Hydration Error:\n'Text content does not match server-rendered HTML'"]
    Q1{"Is the component\nusing Math.random()\nor Date.now()?"}
    Q2{"Is the component\nrendering user-agent\ndependent content?"}
    Q3{"Is there a\ntimestamp or date\nrendered dynamically?"}
    FIX_RANDOM["Fix: use useEffect + useState\nto generate random value client-side only"]
    FIX_UA["Fix: move to 'use client', use useEffect\nor suppressHydrationWarning on specific element"]
    FIX_DATE["Fix: pass formatted date from server\nas a prop, don't re-format client-side"]

    HE --> Q1
    HE --> Q2
    HE --> Q3
    Q1 -->|"Yes"| FIX_RANDOM
    Q2 -->|"Yes"| FIX_UA
    Q3 -->|"Yes"| FIX_DATE`;

export const toc: TocItem[] = [
  { id: "cms-data-server-only", title: "CMS Data Fetching Belongs in Server Components", level: 2 },
  { id: "interactive-islands", title: "Interactive Islands as Client Components", level: 2 },
  { id: "component-tree", title: "Component Tree for a Help Center Article Page", level: 2 },
  { id: "composition-pattern", title: "Composition Pattern: Server Fetches, Client Consumes", level: 2 },
  { id: "rich-text-boundary", title: "Rich Text Renderer: Server vs Client Decision", level: 3 },
  { id: "hydration-errors", title: "Hydration Errors from CMS Content", level: 2 },
  { id: "common-mistakes", title: "'use client' Boundary Mistakes", level: 2 },
  { id: "sc-vs-cc-table", title: "Server vs Client Component Decision Table", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function ServerComponentsCms() {
  return (
    <div className="article-content">
      <p>
        React Server Components change how you think about data fetching in Next.js. For
        CMS-driven applications, the rule is clear: fetch CMS data in Server Components. This
        eliminates API key exposure, removes CMS SDK code from the client bundle, and enables
        server-side caching with Next.js fetch. This module covers where to draw the
        Server/Client boundary in a Help Center, and how to debug the hydration errors that
        CMS content can cause.
      </p>

      <h2 id="cms-data-server-only">CMS Data Fetching Belongs in Server Components</h2>
      <p>
        The historical React pattern was: fetch data in <code>useEffect</code> on mount, store
        in state, render when available. This pattern has three problems for a CMS-driven app:
      </p>
      <ol>
        <li>
          <strong>API keys exposure risk</strong> — fetching from a Client Component means your
          Contentstack API key is in the client bundle or visible in network requests. Even
          read-only Delivery tokens should not be exposed unnecessarily.
        </li>
        <li>
          <strong>Bundle size</strong> — the Contentstack SDK (~60KB) is in the client bundle
          even though it's only used for fetching, not for rendering.
        </li>
        <li>
          <strong>No server-side caching</strong> — <code>useEffect</code> fetches bypass
          Next.js's ISR cache and fetch cache entirely. Every user makes a new request to
          Contentstack on mount.
        </li>
      </ol>

      <pre>
        <code>{`// ❌ Old pattern — CMS fetch in useEffect (avoid)
"use client";

function ArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Problems:
    // 1. Contentstack API key is exposed in the network request from the browser
    // 2. Contentstack SDK is bundled into the client JavaScript
    // 3. Every page load makes a fresh API call — no ISR caching
    // 4. User sees loading spinner — slow LCP
    fetch(\`/api/contentstack?slug=\${slug}\`) // or directly calling CS
      .then((r) => r.json())
      .then(setArticle)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (!article) return <NotFound />;
  return <ArticleContent article={article} />;
}

// ✅ Server Component pattern — correct approach
// No "use client" directive — this is a Server Component

import { getArticle } from "@/lib/contentstack"; // server-only import

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  // Runs on the server — API key stays on server, response is cached by Next.js ISR
  const article = await getArticle(\`/help/\${category}/\${slug}\`);

  if (!article) notFound();

  // Passes SERIALIZABLE data to client components as props
  // The JSX tree for static content is rendered server-side
  return (
    <article>
      <ArticleHeader article={article} />   {/* Server Component */}
      <RichTextRenderer body={article.body} />  {/* Server Component */}
      <FeedbackWidget articleUid={article.uid} />  {/* Client Component */}
    </article>
  );
}`}</code>
      </pre>

      <h2 id="interactive-islands">Interactive Islands as Client Components</h2>
      <p>
        Not every component needs to be a Client Component. Only mark a component as
        <code> "use client"</code> when it genuinely needs client-side capabilities:
      </p>
      <ul>
        <li>React state (<code>useState</code>, <code>useReducer</code>)</li>
        <li>Effects (<code>useEffect</code>, <code>useLayoutEffect</code>)</li>
        <li>Browser APIs (scroll position, window dimensions, localStorage)</li>
        <li>Event handlers that require stateful behavior</li>
        <li>Third-party libraries that use browser APIs (Apollo Client, Framer Motion)</li>
      </ul>

      <pre>
        <code>{`// Interactive islands in the Help Center:

// 1. FeedbackWidget — "Was this article helpful?" with useMutation
"use client";
import { useMutation } from "@apollo/client";

export function FeedbackWidget({ articleUid }: { articleUid: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitFeedback] = useMutation(SUBMIT_FEEDBACK);

  if (submitted) return <p>Thank you for your feedback!</p>;

  return (
    <div>
      <p>Was this article helpful?</p>
      <button onClick={() => { submitFeedback({ variables: { articleUid, rating: 1 } }); setSubmitted(true); }}>
        Yes
      </button>
      <button onClick={() => { submitFeedback({ variables: { articleUid, rating: 0 } }); setSubmitted(true); }}>
        No
      </button>
    </div>
  );
}

// 2. TableOfContents — tracks scroll position to highlight active section
"use client";
import { useEffect, useState } from "react";

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0% -80% 0%" }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Table of contents">
      {items.map(({ id, title, level }) => (
        <a
          key={id}
          href={\`#\${id}\`}
          aria-current={activeId === id ? "true" : undefined}
          style={{ fontWeight: activeId === id ? "bold" : "normal" }}
        >
          {title}
        </a>
      ))}
    </nav>
  );
}

// 3. SearchOverlay — opens on click, fetches results from Apollo
"use client";

export function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { data } = useQuery(SEARCH, { variables: { query: deferredQuery }, skip: !deferredQuery });

  return (
    <>
      <button onClick={() => setIsOpen(true)} aria-label="Search articles">
        <SearchIcon />
      </button>
      {isOpen && (
        <dialog open aria-label="Search">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />
          <SearchResults results={data?.search?.items} />
          <button onClick={() => setIsOpen(false)}>Close</button>
        </dialog>
      )}
    </>
  );
}`}</code>
      </pre>

      <h2 id="component-tree">Component Tree for a Help Center Article Page</h2>
      <MermaidDiagram
        chart={componentTreeDiagram}
        title="Server vs Client Component Boundaries in a Help Center Article Page"
        caption="Server Components fetch and render. Client Components handle interactivity. The boundary is drawn at the leaf nodes — the smallest components that need browser APIs."
        minHeight={460}
      />

      <h2 id="composition-pattern">Composition Pattern: Server Fetches, Client Consumes</h2>
      <p>
        The most important constraint: <strong>you cannot import a Server Component inside a
        Client Component</strong>. But you CAN pass a rendered Server Component as{" "}
        <code>children</code> to a Client Component. This is how interactive wrappers work:
      </p>

      <pre>
        <code>{`// Client Component that wraps a static layout — receives Server Component as children
// src/components/ArticleLayout.tsx
"use client";

import { useState } from "react";

// This client component provides a collapsible sidebar
// The children (a Server Component) are passed from the parent
export function ArticleLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;  // Server-rendered article content
  sidebar: React.ReactNode;   // Server-rendered table of contents
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={\`article-layout \${sidebarOpen ? "sidebar-open" : ""}\`}>
      <main>{children}</main>
      <aside hidden={!sidebarOpen}>
        {sidebar}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "Collapse" : "Expand"} contents
        </button>
      </aside>
    </div>
  );
}

// Server Component — the page — passes server-rendered content as children
// src/app/help/[category]/[slug]/page.tsx
export default async function ArticlePage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const article = await getArticle(\`/help/\${category}/\${slug}\`);
  if (!article) notFound();

  return (
    <ArticleLayout
      sidebar={
        // This is a Server Component passed as a prop — rendered server-side
        <ArticleSidebar article={article} />
      }
    >
      {/* Server Component as children */}
      <ArticleContent article={article} />
    </ArticleLayout>
  );
}`}</code>
      </pre>

      <h3 id="rich-text-boundary">Rich Text Renderer: Server vs Client Decision</h3>

      <pre>
        <code>{`// Rich text renderer is almost always a Server Component:
// - Renders static HTML from the CMS JSON tree
// - No interactivity required
// - Benefits from server-side rendering: no JS in the bundle for the renderer

// Server Component version — no "use client"
export function RichTextRenderer({ body }: { body: RteNode }) {
  return (
    <div className="article-body">
      <RenderNode node={body} />
    </div>
  );
}

// When would RichTextRenderer need to be a Client Component?
// Only when the embedded entries in the rich text are interactive:
// - An embedded poll or quiz component
// - An embedded video player with play/pause controls
// - An embedded product card with "Add to cart"

// Solution for mixed static/interactive embedded content:
// Keep RichTextRenderer as a Server Component
// Pass interactive embedded entries as pre-rendered React nodes

const embeddedEntries: Record<string, React.ReactNode> = {
  "blt-cta-uid": <CtaButton label="Contact support" />,  // Client Component
  "blt-poll-uid": <ArticlePoll questions={pollData} />,   // Client Component
};

// The Server Component renderer uses these pre-rendered Client Component nodes
<RichTextRenderer body={article.body} embeddedEntries={embeddedEntries} />`}</code>
      </pre>

      <h2 id="hydration-errors">Hydration Errors from CMS Content</h2>
      <MermaidDiagram
        chart={hydrationDebugDiagram}
        title="Hydration Error Debugging Flowchart"
        caption="Hydration errors occur when the server-rendered HTML doesn't match what React generates on the client. CMS content causes these in predictable patterns."
        minHeight={380}
      />

      <pre>
        <code>{`// Common hydration error sources in CMS apps:

// 1. Random IDs generated in render
// ❌ Causes hydration mismatch — Math.random() gives different values server vs client
function ArticleAnchor({ title }: { title: string }) {
  const id = Math.random().toString(36); // Different every render!
  return <h2 id={id}>{title}</h2>;
}

// ✅ Fix: deterministic ID from the content
function ArticleAnchor({ title }: { title: string }) {
  const id = title.toLowerCase().replace(/\\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return <h2 id={id}>{title}</h2>;
}

// 2. Date formatting that differs by timezone
// ❌ Server runs in UTC, browser runs in user's timezone — dates can differ
function ArticleDate({ isoDate }: { isoDate: string }) {
  return <time>{new Date(isoDate).toLocaleDateString()}</time>; // Mismatch!
}

// ✅ Fix: format consistently, or use suppressHydrationWarning for non-critical dates
function ArticleDate({ isoDate }: { isoDate: string }) {
  return (
    <time suppressHydrationWarning dateTime={isoDate}>
      {new Date(isoDate).toLocaleDateString()} {/* OK to suppress — date is cosmetic */}
    </time>
  );
}

// 3. CMS rich text with malformed HTML (unclosed tags, nested p tags, etc.)
// Browser auto-corrects HTML during parsing; server renders as-is
// Result: different DOM structures after hydration

// ✅ Fix: sanitize CMS HTML before rendering
import DOMPurify from "isomorphic-dompurify";

function SafeRichText({ html }: { html: string }) {
  const cleanHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
// Better: use the JSON RTE renderer instead of dangerouslySetInnerHTML entirely`}</code>
      </pre>

      <h2 id="common-mistakes">'use client' Boundary Mistakes</h2>

      <pre>
        <code>{`// Mistake 1: Adding "use client" to a layout because one child needs it
// This makes the ENTIRE subtree a Client Component bundle
// ❌ Wrong — entire layout becomes client-side
"use client";

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  // Only added "use client" because of a useState for the mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div>
      <header>
        <button onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
      </header>
      {children} {/* children is now a client bundle too! */}
    </div>
  );
}

// ✅ Right — extract only the interactive part to a Client Component
// Layout stays a Server Component

// src/components/MobileMenuButton.tsx
"use client";
export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>;
}

// Layout is a Server Component
export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header>
        <MobileMenuButton /> {/* Only this component is a client bundle */}
      </header>
      {children} {/* Stays server-rendered */}
    </div>
  );
}

// Mistake 2: Importing a server-only module in a Client Component
"use client";
import { getArticle } from "@/lib/contentstack"; // ❌ server-only module
// This compiles but fails at runtime — contentstack SDK uses Node.js APIs

// ✅ Right: Server Components fetch, pass data down as props
// Client Components never import server-only modules`}</code>
      </pre>

      <h2 id="sc-vs-cc-table">Server vs Client Component Decision Table</h2>

      <ArticleTable caption="Which Help Center components are Server vs Client, and the rationale for each decision." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Server or Client</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ArticlePage (route component)</td>
              <td>Server</td>
              <td>Fetches CMS data; no interactivity; ISR cached</td>
            </tr>
            <tr>
              <td>ArticleHeader (title, author, date)</td>
              <td>Server</td>
              <td>Static display; no state; no browser APIs</td>
            </tr>
            <tr>
              <td>RichTextRenderer</td>
              <td>Server</td>
              <td>Converts JSON to HTML; no interactivity; no browser APIs</td>
            </tr>
            <tr>
              <td>TableOfContents</td>
              <td>Client</td>
              <td>Uses IntersectionObserver to highlight active section (browser API)</td>
            </tr>
            <tr>
              <td>FeedbackWidget</td>
              <td>Client</td>
              <td>useState for submitted state; useMutation for Apollo</td>
            </tr>
            <tr>
              <td>SearchOverlay</td>
              <td>Client</td>
              <td>useState for open/query; useLazyQuery; keyboard event handlers</td>
            </tr>
            <tr>
              <td>CategoryListing</td>
              <td>Server</td>
              <td>Fetches article list from CMS; no interactivity</td>
            </tr>
            <tr>
              <td>ArticleCard</td>
              <td>Server (usually)</td>
              <td>Static display card; hover effects via CSS, not state</td>
            </tr>
            <tr>
              <td>ArticleCard (with save button)</td>
              <td>Client</td>
              <td>Save button needs useState for saved status; requires mutation</td>
            </tr>
            <tr>
              <td>MobileNavigation</td>
              <td>Client</td>
              <td>useState for open/closed; touch event handlers</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'Where would you draw the Server/Client Component boundary in a CMS-driven page?'"
        intro="The interviewer wants to know if you understand the actual cost of 'use client' — it's not just a flag, it's a decision about bundle size, server caching, and API key exposure."
        steps={[
          "Start with the principle: the boundary is drawn as close to the leaves as possible. Server Components should be the default. Client Components are the exception — only when a component genuinely needs browser APIs, state, or effects.",
          "For a CMS-driven page, apply the rule: the article page, article header, rich text renderer — all Server Components. They fetch data, render static HTML, and benefit from server-side caching. No useEffect, no useState, no browser APIs needed.",
          "Name the Client Component islands: the feedback widget (needs useState for submitted state, useMutation for Apollo), the table of contents (needs IntersectionObserver for active section highlighting, a browser API), the search overlay (needs useState for open/query state, keyboard event handlers). These are the interactive leaves.",
          "Explain the composition pattern for the tricky case: when a Client Component needs to wrap Server-rendered content, you pass Server Component output as children. The Server Component renders, its output becomes a React element, and that element is passed as the children prop to the Client Component. The Client Component can't reach into the Server Component tree — it just renders children as-is.",
          "Close with the common mistake: adding 'use client' to a layout component because one child needs state. This pulls the entire subtree into the client bundle. The fix is to extract only the interactive bit into its own Client Component and keep the layout as a Server Component.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Draw the Component Tree for a Help Center Article Page"
        scenario={
          <span>
            Design the component tree for a Help Center article page that needs: (1) server-fetched
            Contentstack article content (title, rich text body, author, category), (2) a
            client-side &quot;Was this helpful?&quot; feedback widget with thumbs up/down that
            submits via Apollo useMutation, (3) a collapsible table of contents that highlights the
            active section using IntersectionObserver, and (4) a search overlay that opens on
            button click and shows results from Apollo useLazyQuery. The page must have good LCP
            (no loading spinners for the article content) and the article content must be
            server-side cached.
          </span>
        }
        tasks={[
          "Draw the component tree annotating each component as Server or Client, and explain the rationale for each decision",
          "Show the code structure: how does the Server Component (ArticlePage) pass article data to the Client Components? What types are passed as props vs what is rendered as children?",
          "The TableOfContents receives its items from the server (from the article's headings structure). Show how you pass this data from a Server Component to a Client Component without making the parent a Client Component",
          "Explain why the FeedbackWidget should NOT import from @/lib/contentstack, and how you prevent this mistake in a TypeScript codebase",
          "A junior developer added 'use client' to the ArticlePage to use a useAnalytics hook. Explain the performance impact and the correct alternative",
        ]}
        pitfalls={[
          "Making ArticlePage a Client Component to avoid thinking about the boundary — this means CMS data is fetched on every mount without ISR caching, and the Contentstack SDK is in the client bundle",
          "Passing the entire article object to FeedbackWidget — it only needs the uid; passing the full 50KB article object wastes memory and network",
          "Importing 'server-only' modules in Client Components — TypeScript won't catch this at type-check time without the 'server-only' package",
          "Using children composition but forgetting that you cannot call server-only functions inside a Client Component — the component tree boundary only controls bundling, not runtime",
        ]}
        signal="A strong answer draws the boundary at the leaf interactive components (FeedbackWidget, TableOfContents, SearchOverlay as Client; everything else as Server), passes only serializable primitive data from Server to Client (not React components or functions), and explains that adding 'use client' to ArticlePage would move ~60KB of CMS SDK code into the client bundle while eliminating ISR caching."
      />
    </div>
  );
}
