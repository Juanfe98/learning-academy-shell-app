import type { LearningModule } from "./types";

export const htmlFoundations: LearningModule = {
  id: "html-foundations",
  title: "HTML Foundations",
  description:
    "Master the structure and syntax of HTML — from DOCTYPE to semantic elements. The bedrock every frontend interview assumes you know cold.",
  icon: "📄",
  order: 0,
  estimatedHours: 2,
  lessons: [
    {
      id: "document-structure",
      moduleId: "html-foundations",
      title: "HTML Document Structure",
      summary:
        "Every valid HTML page shares the same skeleton. Understanding what each piece does — and why — is the starting point for everything else.",
      estimatedMinutes: 20,
      learningObjectives: [
        "Know the purpose of the DOCTYPE declaration",
        "Distinguish what belongs in <head> vs <body>",
        "Write a valid HTML5 boilerplate from memory",
        "Understand why charset and viewport meta tags are required",
      ],
      codeExamples: [
        {
          title: "Valid HTML5 boilerplate",
          description: "Every element here is intentional — nothing is optional.",
          html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>`,
        },
        {
          title: "Common <head> meta tags",
          html: `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="A short description for search engines (150–160 chars)." />
  <meta property="og:title" content="Open Graph title for social sharing" />
  <meta property="og:image" content="https://example.com/preview.png" />
  <title>Page Title · Site Name</title>
  <link rel="stylesheet" href="styles.css" />
  <link rel="icon" href="/favicon.ico" />
</head>`,
        },
      ],
      commonMistakes: [
        "Omitting lang=\"en\" on <html> — screen readers use it to select the correct voice profile",
        "Placing <meta charset> after <title> — charset must appear within the first 1024 bytes",
        "Forgetting the viewport meta tag — without it, mobile browsers render at ~980px and then scale down",
        "Using an XHTML-style DOCTYPE (<!DOCTYPE html PUBLIC ...>) in new projects",
      ],
      interviewTips: [
        "DOCTYPE is not an HTML tag or element — it's a processing instruction telling the browser to use standards mode vs quirks mode.",
        "The lang attribute is both an accessibility win (screen readers) and an SEO signal. Interviewers notice when you mention it unprompted.",
        "Explain <head> as machine-readable metadata and <body> as human-visible content. Clean mental model that lands well.",
      ],
      practiceTasks: [
        {
          description: "Write a valid HTML5 boilerplate from memory without looking it up. Include charset, viewport, title, and one OG meta tag.",
          hint: "Start with <!DOCTYPE html>, then <html lang=\"en\">, then <head> with at least 3 meta tags.",
        },
        {
          description: "Open any website in DevTools, find the <head>, and identify which meta tags are present. Note any you didn't recognize.",
          hint: "Try a major site like github.com or vercel.com — they have well-structured heads.",
        },
      ],
    },
    {
      id: "semantic-html",
      moduleId: "html-foundations",
      title: "Semantic HTML",
      summary:
        "Semantic elements communicate meaning — to browsers, search engines, and assistive technology. Replacing div-soup with semantics is one of the highest-leverage frontend habits.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Know the purpose of main, nav, header, footer, article, section, and aside",
        "Understand heading hierarchy and why skipping levels is an accessibility violation",
        "Explain the difference between article and section",
        "Know that semantic elements carry implicit ARIA landmark roles",
        "Know when div is still the right choice for layout-only wrappers",
      ],
      codeExamples: [
        {
          title: "Semantic page structure",
          html: `<body>
  <header>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main>
    <article>
      <h1>Blog Post Title</h1>
      <p>Published <time datetime="2024-01-15">January 15, 2024</time></p>
      <section>
        <h2>Introduction</h2>
        <p>Content...</p>
      </section>
    </article>

    <aside aria-label="Related posts">
      <h2>Related</h2>
    </aside>
  </main>

  <footer>
    <p>&copy; 2024 My Site</p>
  </footer>
</body>`,
        },
        {
          title: "article vs section vs div",
          html: `<!-- article: self-contained, makes sense syndicated on its own -->
<article>
  <h2>React 19 Released</h2>
  <p>Summary of the release...</p>
</article>

<!-- section: thematic group, not self-contained -->
<section aria-labelledby="pricing-heading">
  <h2 id="pricing-heading">Pricing</h2>
  <p>Plans...</p>
</section>

<!-- div: no semantic meaning, pure styling/scripting hook -->
<div class="card-grid">
  <!-- layout wrapper only -->
</div>`,
        },
        {
          title: "Heading hierarchy and labeled landmarks",
          html: `<main>
  <article aria-labelledby="post-title">
    <h1 id="post-title">How to Build Accessible Forms</h1>

    <section aria-labelledby="errors-heading">
      <h2 id="errors-heading">Common Validation Errors</h2>
      <p>...</p>
    </section>

    <section aria-labelledby="keyboard-heading">
      <h2 id="keyboard-heading">Keyboard Navigation</h2>
      <p>...</p>
    </section>
  </article>

  <aside aria-labelledby="related-heading">
    <h2 id="related-heading">Related Articles</h2>
    <ul>
      <li><a href="/a11y-checklist">Accessibility checklist</a></li>
      <li><a href="/form-labels">Form labels explained</a></li>
    </ul>
  </aside>
</main>`,
        },
      ],
      commonMistakes: [
        "Using <section> as a generic wrapper — it implies a thematic boundary and should have a heading",
        "Skipping heading levels (h1 → h3) — screen readers navigate by headings; gaps are confusing",
        "Multiple <h1> elements on a page — only one per page (the main title)",
        "Nesting <a> inside <a> or <button> inside <button> — invalid HTML that breaks keyboard nav",
        "Wrapping everything in <article> — reserve it for truly self-contained content",
        "Adding redundant ARIA like role=\"navigation\" to <nav> or role=\"main\" to <main> — native semantics already provide that meaning",
      ],
      interviewTips: [
        "Semantic elements have implicit ARIA landmark roles: <nav> = navigation, <main> = main, <header> = banner, <footer> = contentinfo. Adding role=\"navigation\" to a <nav> is redundant.",
        "article is for syndication-ready content (blog posts, tweets, product cards). section is for page chapters. div is for layout/styling with no meaning.",
        "The heading hierarchy (h1–h6) creates a document outline. Tools like accessibility auditors and Google's crawler use this outline.",
        "A strong interview answer usually mentions three beneficiaries of semantics: assistive technology, search engines, and future developers reading the markup.",
      ],
      practiceTasks: [
        {
          description:
            "Take a div-only page layout and rewrite it using semantic HTML. Target: zero divs as structural containers.",
          hint: "Start with the outermost regions: header, main, footer. Then work inward: nav, article, section, aside.",
        },
        {
          description:
            "Install the axe DevTools browser extension on any page you've built and fix all heading hierarchy violations it finds.",
          hint: "Focus on 'heading order' and 'landmark' violations first.",
        },
        {
          description:
            "Open a page you built and list its major landmarks in order: banner/header, navigation, main content, complementary/aside, and footer. If any region is unclear, rewrite the markup to make it explicit.",
          hint: "Ask yourself: if a screen reader user jumped by landmark, would each region have a clear purpose?",
        },
      ],
    },
    {
      id: "links-and-images",
      moduleId: "html-foundations",
      title: "Links and Images",
      summary:
        "Anchor and image elements have subtle but critical accessibility and performance requirements. Most developers underestimate how much there is to get right.",
      estimatedMinutes: 20,
      learningObjectives: [
        "Write descriptive link text (never \"click here\")",
        "Know when alt should be empty string vs descriptive",
        "Use loading=\"lazy\" correctly for performance",
        "Add width and height to images to prevent layout shift",
        "Understand rel=\"noopener noreferrer\" for external links",
      ],
      codeExamples: [
        {
          title: "Accessible links",
          html: `<!-- ❌ Bad: no context for screen reader users -->
<a href="/pricing">Click here</a>

<!-- ✅ Good: descriptive -->
<a href="/pricing">View pricing plans</a>

<!-- ✅ External link with security and UX attributes -->
<a
  href="https://github.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="GitHub (opens in new tab)"
>
  GitHub
</a>

<!-- ✅ Icon-only link: aria-label provides the text alternative -->
<a href="/settings" aria-label="Settings">
  <svg aria-hidden="true">...</svg>
</a>`,
        },
        {
          title: "Images: alt text, lazy loading, layout shift prevention",
          html: `<!-- ✅ Informational image: descriptive alt -->
<img
  src="hero.jpg"
  alt="Developer writing code on a laptop at a standing desk"
  width="800"
  height="450"
  loading="eager"
/>

<!-- ✅ Decorative image: empty alt, no screen reader announcement -->
<img src="divider.svg" alt="" role="presentation" />

<!-- ✅ Below-fold images: lazy-load to improve LCP -->
<img
  src="team-photo.jpg"
  alt="The team at our 2024 offsite"
  width="600"
  height="400"
  loading="lazy"
/>

<!-- ✅ Responsive image with srcset -->
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Mountain landscape at sunset"
  width="800"
  height="533"
/>`,
        },
      ],
      commonMistakes: [
        "Generic link text like \"click here\", \"read more\", \"here\" — screen reader users often navigate by links in isolation",
        "Missing alt on informational images — they become invisible to assistive technology",
        "Using alt=\"\" on informational images (treating them as decorative when they're not)",
        "Not specifying width and height on images — causes Cumulative Layout Shift (CLS), a Core Web Vital metric",
        "Omitting rel=\"noopener\" on target=\"_blank\" links — allows the opened page to access window.opener (security risk in older browsers)",
      ],
      interviewTips: [
        "alt=\"\" (empty string) is correct for purely decorative images — it signals to screen readers to skip the element entirely. Omitting alt entirely is wrong because some readers announce the file name.",
        "loading=\"lazy\" should not be used on above-the-fold images (hero, logo). It delays the most important images. Only use it on below-fold content.",
        "CLS (Cumulative Layout Shift) is a Core Web Vital. Setting width and height on images allows the browser to reserve space before the image loads, eliminating layout shift.",
      ],
      practiceTasks: [
        {
          description:
            "Audit a page you've built: check every <a> tag for descriptive text, every external link for rel, every image for alt and dimensions.",
          hint: "Open Chrome DevTools → Lighthouse → run an accessibility audit. It catches most of these automatically.",
        },
        {
          description:
            "Implement a responsive image with at least three srcset sizes. Open DevTools Network tab and confirm the correct size loads at different viewport widths.",
          hint: "Use Chrome DevTools device toolbar to simulate narrow viewports.",
        },
      ],
    },
    {
      id: "lists-and-tables",
      moduleId: "html-foundations",
      title: "Lists, Tables & Structured Content",
      summary:
        "Lists and tables are semantic structure tools, not visual styling options. Knowing when content is a set, a sequence, a term/value pair, or true tabular data is foundational HTML knowledge.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Choose correctly between ul, ol, and dl based on the relationship between items",
        "Know when information should be marked up as a table instead of cards, divs, or paragraphs",
        "Use caption, thead, tbody, th, and scope to make tables understandable to assistive technology",
        "Understand why tables should not be used for layout in modern frontend work",
        "Write structured HTML that still makes sense with CSS turned off",
      ],
      codeExamples: [
        {
          title: "Semantic list patterns",
          html: `<!-- Unordered list: same-level items -->
<ul>
  <li>Semantic HTML</li>
  <li>Accessibility</li>
  <li>Performance</li>
</ul>

<!-- Ordered list: sequence matters -->
<ol>
  <li>Write the HTML structure</li>
  <li>Add CSS layout</li>
  <li>Test the final UI</li>
</ol>

<!-- Description list: term/value pairs -->
<dl>
  <dt>ARIA</dt>
  <dd>Metadata used when native HTML cannot express enough meaning.</dd>

  <dt>CLS</dt>
  <dd>Cumulative Layout Shift, a Core Web Vital about visual stability.</dd>
</dl>`,
        },
        {
          title: "Accessible data table",
          html: `<table>
  <caption>Quarterly revenue by region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
      <th scope="col">Q3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$1.2M</td>
      <td>$1.4M</td>
      <td>$1.5M</td>
    </tr>
    <tr>
      <th scope="row">Europe</th>
      <td>$900K</td>
      <td>$980K</td>
      <td>$1.1M</td>
    </tr>
  </tbody>
</table>`,
        },
      ],
      commonMistakes: [
        "Using divs and line breaks to fake a list — assistive tech loses item counts and relationships",
        "Using tables for page layout instead of actual data",
        "Rendering data comparisons as generic cards when users need headers and cross-row comparison",
        "Leaving off caption or header cells so a table has values but no structure",
        "Using visually bold td cells where the markup should really be a th with scope",
      ],
      interviewTips: [
        "If users compare values across rows and columns, it is table data.",
        "Use unordered lists for peer items, ordered lists for steps or rankings, and description lists for metadata or glossary-style pairs.",
        "A table should still be understandable when read cell by cell with its row and column headers announced.",
      ],
      practiceTasks: [
        {
          description:
            "Refactor a nav menu, feature checklist, or repeated metadata block you built with divs into the correct list element.",
          hint: "Ask whether order matters and whether the content is peer items or term/value pairs.",
        },
        {
          description:
            "Mark up a feature-comparison or analytics table with caption, column headers, and row headers. Then inspect it with the browser accessibility tree.",
          hint: "Use <th scope=\"col\"> and <th scope=\"row\"> intentionally.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "semantic-blog-post",
      moduleId: "html-foundations",
      title: "Semantic Blog Post",
      difficulty: "easy",
      description:
        "Mark up a blog post page using correct semantic HTML. No styling required — focus entirely on structure and meaning.",
      requirements: [
        "Use a single <h1> for the post title",
        "Use <article> as the primary content wrapper",
        "Include a <header> inside the article with the title, author, and published date (use <time datetime>)",
        "Use at least two <section> elements with <h2> headings",
        "Include a <nav> with breadcrumb links back to the blog index",
        "Add a <footer> with copyright information",
        "Every image must have a descriptive alt attribute",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog Post</title>
  </head>
  <body>
    <!-- Build your semantic blog post structure here -->
  </body>
</html>`,
      expectedResult:
        "A structurally valid HTML document where every element communicates meaning. Running it through an HTML validator (validator.w3.org) should produce zero errors. An accessibility audit should find zero landmark or heading violations.",
      hints: [
        "Start with the outermost containers: a <header> for the site nav, <main> for the post, <footer> for the site footer.",
        "The article's own header (author, date) is different from the page header (site logo, nav). Both can use <header> — the element is context-dependent.",
        "The <time> element takes a machine-readable datetime attribute: <time datetime=\"2024-01-15\">January 15, 2024</time>.",
      ],
      bonusTasks: [
        "Add a <figure> and <figcaption> for a post image",
        "Add an <aside> with a \"Related Articles\" sidebar",
        "Include a <blockquote> with a <cite> attribute",
      ],
      conceptsCovered: ["semantic-html", "document-structure", "accessibility", "heading-hierarchy"],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "document-structure": () => (
    <>
      <p>
        An HTML document is just a text file — but a text file the browser interprets
        according to a set of rules. The <code>{"<!DOCTYPE html>"}</code> declaration at
        the very first line is a short instruction telling the browser which rules to
        apply. Without it, browsers fall into <strong>quirks mode</strong>, a
        compatibility layer that emulates ancient, inconsistent behaviour from the 1990s.
        With it, you get <strong>standards mode</strong> — predictable rendering across
        browsers.
      </p>
      <p>
        The document is split into two regions with fundamentally different purposes.{" "}
        <code>{"<head>"}</code> contains <em>machine-readable metadata</em> — information
        that browsers and crawlers consume but users never directly see. This includes
        character encoding, viewport instructions, the page title (shown in the browser
        tab and by search engines), stylesheets, and social-sharing meta tags.{" "}
        <code>{"<body>"}</code> contains <em>human-readable content</em> — everything
        rendered on screen.
      </p>
      <p>
        Two meta tags are non-negotiable in every document.{" "}
        <code>{"<meta charset=\"UTF-8\">"}</code> must appear within the first 1024 bytes
        of the document — browsers begin parsing before the full file is received, and
        they need to know the encoding early to decode the rest correctly. The{" "}
        <code>{"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"}</code>{" "}
        tells mobile browsers to use the device&apos;s actual pixel width rather than
        rendering at ~980px and scaling down. Without it, your responsive CSS is ignored.
      </p>
    </>
  ),

  "semantic-html": () => (
    <>
      <p>
        When every element on a page is a <code>{"<div>"}</code>, the browser (and anyone
        reading the HTML) can&apos;t tell a navigation bar from an article from a sidebar.
        This is called <em>div-soup</em>. Semantic HTML replaces meaningless containers
        with elements whose names describe their purpose.
      </p>
      <p>
        The biggest benefit is not visual — it&apos;s structural. Screen readers let users
        jump between landmarks like navigation, main content, and complementary content.
        Search engines use these signals to understand which content is primary. And other
        developers can scan the HTML and understand the page without reverse-engineering
        your CSS classes.
      </p>
      <p>
        The core landmark elements divide a page into navigable regions.{" "}
        <code>{"<header>"}</code> contains introductory content for its parent.{" "}
        <code>{"<nav>"}</code> wraps a major set of navigation links.{" "}
        <code>{"<main>"}</code> holds the page&apos;s primary content and should appear
        only once per page. <code>{"<aside>"}</code> is for content related to, but not
        central to, the main flow — think related articles, ads, side notes, or filters.{" "}
        <code>{"<footer>"}</code> contains closing or meta information about its parent.
      </p>
      <p>
        For content structure, the most commonly confused pair is{" "}
        <code>{"<article>"}</code> vs <code>{"<section>"}</code>. Use{" "}
        <code>{"<article>"}</code> for a self-contained unit that would still make sense
        if copied somewhere else: a blog post, news card, comment, review, or forum thread.
        Use <code>{"<section>"}</code> for a thematic chapter within a larger page or
        article. If the content is merely a styling wrapper with no independent meaning,
        it probably should stay a <code>{"<div>"}</code>.
      </p>
      <p>
        A good rule of thumb is: semantics describe <em>purpose</em>, not appearance. A
        hero banner is not automatically a <code>{"<section>"}</code> just because it is a
        big visual block. A card is not automatically an <code>{"<article>"}</code> just
        because it looks like one. Ask what the content <em>is</em>. If it is a
        self-contained story, item, or post, <code>{"<article>"}</code> fits. If it is a
        chapter inside a bigger document, <code>{"<section>"}</code> fits. If it is just
        a flexbox wrapper, use <code>{"<div>"}</code>.
      </p>
      <p>
        Heading hierarchy is part of semantic HTML too. Headings are not just bigger text;
        they define the content outline. The page gets one primary{" "}
        <code>{"<h1>"}</code>, then subsections use <code>{"<h2>"}</code>, and nested
        subsections use <code>{"<h3>"}</code>, and so on. Skipping levels (for example,
        <code>h1</code> straight to <code>h3</code>) creates a confusing structure for
        assistive technology. The browser will still render it, but the document meaning
        becomes weaker.
      </p>
      <p>
        One subtle but important point: many semantic elements already expose implicit ARIA
        roles. <code>{"<nav>"}</code> is already a navigation landmark.{" "}
        <code>{"<main>"}</code> is already the main landmark. <code>{"<header>"}</code>{" "}
        and <code>{"<footer>"}</code> can map to landmark roles depending on context. That
        means adding <code>role="navigation"</code> to <code>{"<nav>"}</code> is usually
        redundant. Native semantics should be your first choice; ARIA should only fill gaps
        when HTML has no element that expresses the meaning you need.
      </p>
    </>
  ),

  "links-and-images": () => (
    <>
      <p>
        The <code>{"<a>"}</code> element&apos;s <code>href</code> attribute can hold any
        URL — including relative paths (<code>href="/about"</code>), anchor links (
        <code>href="#section-id"</code>), mailto links (<code>href="mailto:..."</code>),
        and tel links. When opening in a new tab with{" "}
        <code>{"target=\"_blank\""}</code>, always add{" "}
        <code>{"rel=\"noopener noreferrer\""}</code>: <code>noopener</code> prevents the
        opened page from accessing <code>window.opener</code>, and <code>noreferrer</code>{" "}
        also prevents the referrer header from being sent.
      </p>
      <p>
        The <code>alt</code> attribute on <code>{"<img>"}</code> is one of the most
        misunderstood attributes in HTML. It serves two purposes: it&apos;s the text
        spoken by screen readers when the image is encountered, and it&apos;s the text
        shown when the image fails to load. For <em>informational</em> images, it should
        describe what the image shows (not &quot;image of...&quot; or &quot;photo
        of...&quot;). For <em>decorative</em> images — backgrounds, dividers, purely
        visual flourishes — it should be an empty string (<code>alt=""</code>) to tell
        screen readers to skip it entirely. Omitting <code>alt</code> is always wrong.
      </p>
      <p>
        Performance matters too. Always specify <code>width</code> and <code>height</code>{" "}
        on images so the browser can reserve space before the image downloads, preventing
        <em>Cumulative Layout Shift</em> (CLS). Use <code>{"loading=\"lazy\""}</code> on
        images below the fold, and <code>{"loading=\"eager\""}</code> (or omit it) for
        above-the-fold images like hero shots. For high-resolution displays and responsive
        layouts, <code>srcset</code> and <code>sizes</code> let the browser download the
        appropriately-sized image rather than always fetching the largest one.
      </p>
    </>
  ),

  "lists-and-tables": () => (
    <>
      <p>
        Lists and tables are some of the clearest examples of HTML carrying meaning beyond
        appearance. A list tells the browser that several items belong to the same set. A
        table tells it something even richer: values are related across rows and columns.
        If you collapse either into generic containers, the visual layout might survive, but
        the information architecture does not.
      </p>
      <p>
        Use <code>{"<ul>"}</code> when order does not matter, <code>{"<ol>"}</code> when
        sequence matters, and <code>{"<dl>"}</code> when a term is paired with a value or
        explanation. These are not just styling defaults for bullets and numbers. Screen
        readers announce list boundaries and item counts, which makes long content much easier
        to understand.
      </p>
      <p>
        Tables should be reserved for genuine tabular data: schedules, analytics, financial
        values, comparisons, and any content where headers change the meaning of each cell.
        Good table markup starts with a <code>{"<caption>"}</code> and then uses real header
        cells so a screen reader can announce both the value and the row or column context
        around it. That is why <code>{"<th scope=\"col\">"}</code> and{" "}
        <code>{"<th scope=\"row\">"}</code> matter.
      </p>
      <p>
        Modern CSS removed the old excuse for layout tables. Flexbox and grid are for
        composition; tables are for data. Being able to explain that distinction clearly is a
        very strong interview signal because it shows you care about meaning, not just visual
        output.
      </p>
    </>
  ),
};
