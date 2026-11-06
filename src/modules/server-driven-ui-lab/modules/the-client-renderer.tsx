import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const philosophyDiagram = String.raw`flowchart TB
  subgraph naive["The naive client (REJECTED)"]
    N1["CreditDetailPage.tsx<br/>hardcoded layout"]
    N2["AccountDetailPage.tsx<br/>hardcoded layout"]
    N3["Every new screen =<br/>new component = SHIP THE CLIENT"]
    N1 --> N3
    N2 --> N3
  end

  subgraph sdui["The vocabulary client (CHOSEN)"]
    S1["One shell: fetch JSON,<br/>walk content, render by type"]
    S2["Vocabulary: text, row, list"]
    S3["New screen = server-side<br/>template + slots. CLIENT UNCHANGED."]
    S1 --> S2
    S2 --> S3
  end

  style N3 fill:#7f1d1d,color:#fff
  style S3 fill:#0f766e,color:#fff`;

const roundTripDiagram = String.raw`sequenceDiagram
  participant B as Browser (App.tsx)
  participant V as Vite dev server :5173
  participant K as Koa :3999
  participant S as Service + templates

  B->>V: GET /screens/v1/credit/detail?creditId=cred-001<br/>x-client-surface: web
  V->>K: proxy (vite.config: '/screens' → :3999)
  K->>S: middleware → route → context → service
  S-->>K: Screen JSON (content keyed by slot)
  K-->>V: 200 application/json
  V-->>B: Screen JSON
  B->>B: Object.entries(content).map(el ⇒ RenderElement)
  Note over B: The shell never asks WHICH screen this is`;

const journeyDiagram = String.raw`flowchart TD
  A["JSON element<br/>{ type: 'text', style: 'Display/Large',<br/>copy: { text: '{amount}', variables: { amount: '$ 14.200.000' } } }"]
  A --> B["App.tsx loop hands it to RenderElement"]
  B --> C{"registry: is 'text'<br/>a word I know?"}
  C -->|yes| D["TextElementView"]
  D --> E["styleClass('Display/Large')<br/>→ 'style-display-large' (40px bold)"]
  D --> F["renderCopy(copy)<br/>→ '$ 14.200.000'"]
  E --> G["&lt;p class='style-display-large'&gt;$ 14.200.000&lt;/p&gt;"]
  F --> G

  style A fill:#1e3a5f,color:#fff
  style G fill:#0f766e,color:#fff`;

const appLoopCode = `// packages/sdui-web/src/App.tsx — the whole rendering "strategy"
{state.status === 'ready' &&
  Object.entries(state.screen.content).map(([slotKey, element]) => (
    <RenderElement key={slotKey} element={element} />
  ))}`;

const fetchCode = `// App.tsx — the client half of the surface contract
fetch(SCREENS[screenName], { headers: { 'x-client-surface': 'web' } })`;

const renderCopyCode = `// packages/sdui-web/src/lib/renderCopy.ts
export function renderCopy(copy: WireCopy): string {
  return copy.text.replace(/\\{(\\w+)\\}/g, (placeholder, name: string) => {
    return copy.variables?.[name] ?? placeholder;
  });
}`;

const styleClassCode = `// packages/sdui-web/src/lib/styleClass.ts — this renderer's half of 001a
const STYLE_CLASSES: Record<string, string> = {
  'Display/Large': 'style-display-large',
  'Headline/H1': 'style-headline-h1',
  'Headline/H4': 'style-headline-h4',
  'Body/Default': 'style-body-default',
  'Body/Small': 'style-body-small',
  'Label/Caption': 'style-label-caption',
};

export function styleClass(token: string): string {
  const cls = STYLE_CLASSES[token];

  if (cls === undefined) {
    console.warn(\`[sdui-web] unknown style token "\${token}", using Body/Default\`);
    return 'style-body-default';
  }

  return cls;
}`;

export const toc: TocItem[] = [
  { id: "where-we-are", title: "Where We Are", level: 2 },
  { id: "two-philosophies", title: "Two Philosophies of Client", level: 2 },
  { id: "the-browser-analogy", title: "The Browser Analogy", level: 2 },
  { id: "the-shell", title: "The Shell: App.tsx", level: 2 },
  { id: "the-journey", title: "One Element, JSON to Pixels", level: 2 },
  { id: "copy-and-tokens", title: "Copy Interpolation & Style Tokens", level: 2 },
  { id: "file-map", title: "The File Map", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheClientRenderer() {
  return (
    <div className="article-content">
      <p>
        Every module so far ended at the same place: a JSON document leaving the server. This one
        starts there. The question it answers is deceptively simple —{" "}
        <em>how does that JSON become pixels without the client knowing what screen it is?</em> —
        and the answer is the entire client half of the server-driven UI bargain.
      </p>

      <h2 id="where-we-are">Where We Are</h2>
      <p>
        The backend serves two screens (<code>account-detail</code>, <code>credit-detail</code>)
        over one pipeline, verified over curl. The repo now has a real web client at{" "}
        <code>packages/sdui-web</code>: React + Vite, with the dev server proxying{" "}
        <code>/screens</code> to the Koa server on <code>:3999</code> so the browser and the API
        look same-origin. What arrives at that client is a <code>Screen</code>: a{" "}
        <code>content</code> object keyed by slot name, where every value is an element with an{" "}
        <code>id</code>, a <code>type</code>, and type-specific fields. Nothing in it says how to
        lay anything out — that was the template&apos;s job, and it already happened server-side.
      </p>

      <h2 id="two-philosophies">Two Philosophies of Client</h2>
      <p>
        There are exactly two ways to build the thing that renders this JSON, and the choice
        between them decides whether the whole architecture was worth building.
      </p>
      <p>
        The naive way: write <code>CreditDetailPage.tsx</code> with the layout hardcoded — name
        here, balance under it, details card below. It works, it ships, and it quietly deletes the
        reason the server exists: the client now <em>knows the screen</em>, so changing the screen
        means editing client code and shipping the client. For the web that is an annoyance. For
        the mobile-style clients SDUI was invented for — app-store review, users who update never
        — it is the whole disease.
      </p>
      <p>
        The SDUI way: the client knows <strong>no screens at all</strong>. It knows a small
        vocabulary — <code>text</code>, <code>row</code>, <code>list</code> — and it walks
        whatever document arrives, rendering each element by its <code>type</code>, in the order
        the server composed. Add a screen, reorder a screen, redesign a screen: the client is
        untouched, because the client never knew the screen existed in the first place.
      </p>
      <MermaidDiagram
        chart={philosophyDiagram}
        title="Hardcoded pages vs. a vocabulary renderer"
        caption="The naive client couples every screen change to a client release. The vocabulary client makes screens a server-side concern — which is the entire point of the server you already built."
        minHeight={420}
      />

      <h2 id="the-browser-analogy">The Browser Analogy</h2>
      <p>
        The mental model that makes everything on the client side fall into place:{" "}
        <strong>the client is a browser, and your server is writing HTML.</strong> A browser has
        never heard of any particular website. It knows tags — <code>&lt;h1&gt;</code>,{" "}
        <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code> — and it renders any document composed
        from them, written by an author it has never met.
      </p>
      <ArticleTable caption="The analogy, term by term">
        <table>
          <thead>
            <tr>
              <th>Web platform</th>
              <th>This system</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>HTML document</td>
              <td>
                the <code>content</code> JSON
              </td>
            </tr>
            <tr>
              <td>
                tags: <code>h1</code>, <code>p</code>, <code>ul</code>
              </td>
              <td>
                element types: <code>text</code>, <code>row</code>, <code>list</code>
              </td>
            </tr>
            <tr>
              <td>the browser</td>
              <td>
                <code>sdui-web</code>
              </td>
            </tr>
            <tr>
              <td>the site author</td>
              <td>
                the server&apos;s <code>buildSlots</code> + template
              </td>
            </tr>
            <tr>
              <td>browser skips an unknown tag</td>
              <td>001b: drop and log (next module)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The last row is why the analogy is load-bearing rather than decorative. When a 2005
        browser meets <code>&lt;video&gt;</code>, it does not crash the page — it skips the tag
        and renders the rest. That behaviour is <em>why the web could evolve</em> without every
        browser updating in lockstep, and it is exactly the rule this client applies to element
        types it has never seen. Same trick, same reason, sixty years of prior art.
      </p>

      <h2 id="the-shell">The Shell: App.tsx</h2>
      <p>
        <code>App.tsx</code> does three things: fetch the screen, hold the usual
        loading/error/ready state, and — the part worth staring at — render the answer with a loop
        that contains no screen knowledge whatsoever:
      </p>
      <CodeBlock code={appLoopCode} lang="tsx" filename="packages/sdui-web/src/App.tsx" />
      <p>
        Read it as a sentence: <em>&quot;for each thing in content, whatever you are, render
        yourself.&quot;</em> No <code>creditName</code>, no <code>outstandingBalance</code>, no
        per-screen branches. The same eight lines render both existing screens and every screen
        the server will ever invent from known vocabulary. When you flip the in-app switcher
        between <code>credit-detail</code> and <code>account-detail</code>, nothing in the render
        path changes — only the document does.
      </p>
      <p>
        The fetch carries the client&apos;s half of the surface contract — the same header you
        curled by hand in the template module:
      </p>
      <CodeBlock code={fetchCode} lang="tsx" filename="packages/sdui-web/src/App.tsx" />
      <MermaidDiagram
        chart={roundTripDiagram}
        title="The full round trip, browser to pixels"
        caption="Vite's proxy makes :3999 look same-origin; the server pipeline is the one you already know from the backend modules; the client's contribution is one loop."
        minHeight={430}
      />

      <h2 id="the-journey">One Element, JSON to Pixels</h2>
      <p>
        Trace a single element — the credit screen&apos;s outstanding balance — through every file
        it touches. Each file plays exactly one role, and none of them knows the others&apos;
        business:
      </p>
      <MermaidDiagram
        chart={journeyDiagram}
        title="The journey of outstandingBalance"
        caption="One lookup, one view, two pure helpers. Every element on every screen takes this same path — only the middle box (which view) varies."
        minHeight={480}
      />
      <p>
        The one hop this module does not open up is the lookup itself —{" "}
        <code>RenderElement</code> and the registry behind it. That is deliberate: the registry is
        the single most load-bearing piece of client code in the repo, it is where decision 001b
        stops being theory, and it gets the whole next module to itself.
      </p>

      <h2 id="copy-and-tokens">Copy Interpolation &amp; Style Tokens</h2>
      <p>
        Two small pure functions do all the &quot;rendering&quot; that is not React. The first
        resolves copy. Remember from the wire-contract module that copy is never a bare string —
        it is a template plus named, already-formatted variables. The client&apos;s job is only
        substitution:
      </p>
      <CodeBlock
        code={renderCopyCode}
        lang="typescript"
        filename="packages/sdui-web/src/lib/renderCopy.ts"
      />
      <p>
        Note the fallback: a placeholder with no matching variable stays <em>visible</em> —{" "}
        <code>{"{merchant}"}</code> on screen — rather than being blanked. A visible artifact gets
        screenshotted and reported; an empty gap gets squinted at for a sprint. It is the same
        fail-loudly instinct the server applies at its boundaries, expressed at pixel scale.
      </p>
      <p>
        The second function is this renderer&apos;s half of decision 001a. The server sends the{" "}
        <em>role</em> text plays (<code>Display/Large</code> = &quot;the hero number&quot;); each
        renderer decides what that role looks like on its medium:
      </p>
      <CodeBlock
        code={styleClassCode}
        lang="typescript"
        filename="packages/sdui-web/src/lib/styleClass.ts"
      />
      <p>
        For the web that is a CSS class mapping to 40px bold tabular numerals; the TUI will make
        entirely different choices (bright bold text in a terminal) from the same token — which is
        precisely what &quot;presentational token, per-renderer presentation&quot; meant back when
        001a was decided. And notice the miss behaviour: an unknown token degrades to the
        Body/Default look <em>with a warning</em>. Unreadable is worse than plain, and the log
        keeps the degradation from being silent — the same shape as the server&apos;s
        unknown-status fallback, on the other side of the wire.
      </p>

      <h2 id="file-map">The File Map</h2>
      <ArticleTable caption="packages/sdui-web/src — every file, one role each">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Role</th>
              <th>Knows about screens?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>main.tsx</code>
              </td>
              <td>Boot: mount App into the page</td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                <code>App.tsx</code>
              </td>
              <td>Fetch + walk content in server order</td>
              <td>
                <strong>No — and that is the whole design</strong>
              </td>
            </tr>
            <tr>
              <td>
                <code>models/wire.ts</code>
              </td>
              <td>
                This client&apos;s local belief about the JSON (009): <code>type</code> and{" "}
                <code>style</code> stay open <code>string</code>s
              </td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                <code>registry/elementRegistry.tsx</code>
              </td>
              <td>type → view lookup; unknown → drop + log (next module)</td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                <code>components/*View.tsx</code>
              </td>
              <td>One view per vocabulary word</td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                <code>lib/renderCopy.ts</code>, <code>lib/styleClass.ts</code>
              </td>
              <td>Copy substitution; token → CSS class</td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                <code>styles.css</code>
              </td>
              <td>The six token classes — mirrors the design system&apos;s type ramp</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Read the third column top to bottom. That unanimous &quot;No&quot; is the client half of
        the SDUI thesis, and it is checkable in review: the day a slot name or a screen-specific
        branch appears anywhere in this package, the layer has failed the same way a fetch inside
        a route would fail the server.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A hardcoded per-screen client silently deletes the value of the entire server you built
          — if the client knows the screen, every screen change ships a client.
        </li>
        <li>
          The SDUI client is a browser: it knows a vocabulary of element types, not screens, and
          renders whatever document arrives in the order the server composed it.
        </li>
        <li>
          The whole rendering strategy is one loop — <code>Object.entries(content)</code> →{" "}
          <code>RenderElement</code> — with zero screen-specific knowledge anywhere in the
          package.
        </li>
        <li>
          <code>renderCopy</code> only substitutes: variables arrive pre-formatted from the
          server (001a), and a missing variable stays visible because seen bugs get fixed.
        </li>
        <li>
          <code>styleClass</code> is this renderer&apos;s half of 001a — role in, look out — and
          it degrades unknown tokens to Body/Default with a warning rather than breaking.
        </li>
        <li>
          Every file in the package answers &quot;knows about screens?&quot; with No. That column
          is the review checklist for all future client work.
        </li>
      </ul>
    </div>
  );
}
