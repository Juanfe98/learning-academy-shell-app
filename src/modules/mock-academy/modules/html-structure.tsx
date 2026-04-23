import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-html", title: "What is HTML?", level: 2 },
  { id: "document-structure", title: "Document Structure", level: 2 },
  { id: "semantic-elements", title: "Semantic Elements", level: 2 },
  { id: "block-vs-inline", title: "Block vs. Inline", level: 3 },
  { id: "forms-and-inputs", title: "Forms and Inputs", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HtmlStructure() {
  return (
    <div className="article-content">
      <p>
        HTML (HyperText Markup Language) is the skeleton of every webpage. It doesn&apos;t
        control appearance — CSS does that — but it defines meaning: what things are, how
        they relate, and what order they appear in. Writing good HTML means writing HTML
        that accurately describes your content.
      </p>

      <h2 id="what-is-html">What is HTML?</h2>

      <p>
        HTML is a markup language. You annotate content with <strong>elements</strong>,
        each consisting of an opening tag, optional content, and a closing tag:
      </p>

      <pre>
        <code>{`<p>This is a paragraph.</p>
<a href="https://example.com">A link</a>
<img src="photo.jpg" alt="A description" />`}</code>
      </pre>

      <p>
        Some elements are <strong>void elements</strong> — they have no children and no
        closing tag. <code>&lt;img&gt;</code>, <code>&lt;input&gt;</code>, and{" "}
        <code>&lt;br&gt;</code> are common examples.
      </p>

      <p>
        Elements can carry <strong>attributes</strong> — key-value pairs that modify
        behavior or provide metadata. <code>href</code> on an anchor tells the browser
        where to navigate; <code>alt</code> on an image provides a text fallback for
        screen readers.
      </p>

      <h2 id="document-structure">Document Structure</h2>

      <p>
        Every valid HTML document follows a standard shell:
      </p>

      <pre>
        <code>{`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello, world!</h1>
    <script src="app.js" defer></script>
  </body>
</html>`}</code>
      </pre>

      <ul>
        <li>
          <code>&lt;!DOCTYPE html&gt;</code> — tells the browser to use modern HTML5
          parsing rules, not legacy quirks mode
        </li>
        <li>
          <code>lang="en"</code> — declares the document language for assistive technology
          and search engines
        </li>
        <li>
          <code>&lt;head&gt;</code> — metadata not shown to the user: charset, viewport,
          title, stylesheet links, and script tags
        </li>
        <li>
          <code>&lt;body&gt;</code> — everything the user sees
        </li>
        <li>
          <code>defer</code> on script — tells the browser to fetch the JS in parallel with
          parsing HTML and execute it only after the document is ready. Always prefer this
          over placing scripts at the bottom of <code>&lt;body&gt;</code>.
        </li>
      </ul>

      <h2 id="semantic-elements">Semantic Elements</h2>

      <p>
        HTML5 introduced <strong>semantic elements</strong> — tags that describe the role
        of their content, not just its appearance. Compare:
      </p>

      <pre>
        <code>{`<!-- Non-semantic: tells you nothing -->
<div class="nav">...</div>

<!-- Semantic: immediately communicates purpose -->
<nav aria-label="Primary navigation">...</nav>`}</code>
      </pre>

      <p>
        Key semantic landmarks you should know:
      </p>

      <ul>
        <li><code>&lt;header&gt;</code> — introductory content, usually contains logo + nav</li>
        <li><code>&lt;nav&gt;</code> — a block of navigation links</li>
        <li><code>&lt;main&gt;</code> — the primary content of the page (one per page)</li>
        <li><code>&lt;article&gt;</code> — self-contained content that makes sense in isolation (a blog post, a news item)</li>
        <li><code>&lt;section&gt;</code> — a thematic grouping with a heading</li>
        <li><code>&lt;aside&gt;</code> — content tangentially related to the main content (sidebars, callouts)</li>
        <li><code>&lt;footer&gt;</code> — closing content: copyright, links, contact info</li>
      </ul>

      <p>
        Semantic HTML benefits SEO (search engines understand your content hierarchy),
        accessibility (screen readers navigate by landmarks), and maintainability (other
        developers can understand the page structure without reading CSS class names).
      </p>

      <h3 id="block-vs-inline">Block vs. Inline</h3>

      <p>
        Every element has a default display mode. <strong>Block</strong> elements
        (like <code>&lt;div&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;h1&gt;</code>)
        start on a new line and stretch to fill their container.{" "}
        <strong>Inline</strong> elements (like <code>&lt;span&gt;</code>,{" "}
        <code>&lt;a&gt;</code>, <code>&lt;strong&gt;</code>) flow within a line of text.
      </p>

      <p>
        This distinction matters because it controls layout behavior before CSS is applied.
        CSS can override it with <code>display: block</code>, <code>display: inline</code>,
        or the more powerful <code>display: flex</code> and <code>display: grid</code>.
      </p>

      <h2 id="forms-and-inputs">Forms and Inputs</h2>

      <p>
        Forms are how users send data to a server. The key attributes on{" "}
        <code>&lt;form&gt;</code> are <code>action</code> (where to send data) and{" "}
        <code>method</code> (<code>GET</code> or <code>POST</code>):
      </p>

      <pre>
        <code>{`<form action="/login" method="POST">
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    name="email"
    required
    autocomplete="email"
  />

  <label for="password">Password</label>
  <input
    id="password"
    type="password"
    name="password"
    required
  />

  <button type="submit">Log in</button>
</form>`}</code>
      </pre>

      <p>
        Always pair <code>&lt;label&gt;</code> with its <code>&lt;input&gt;</code> via the{" "}
        <code>for</code>/<code>id</code> relationship. This makes the label clickable
        (expands the tap target on mobile) and tells screen readers which label describes
        which input.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>HTML describes the <em>meaning</em> of content — CSS controls appearance</li>
        <li>Every valid HTML document has <code>&lt;!DOCTYPE html&gt;</code>, <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, and <code>&lt;body&gt;</code></li>
        <li>Use semantic elements (<code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;article&gt;</code>) over generic <code>&lt;div&gt;</code> containers</li>
        <li>Block elements start on a new line; inline elements flow within text</li>
        <li>Always link <code>&lt;label&gt;</code> to <code>&lt;input&gt;</code> for accessibility and better UX</li>
        <li>Load scripts with <code>defer</code> to avoid blocking HTML parsing</li>
      </ul>
    </div>
  );
}
