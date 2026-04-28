import type { LearningModule } from "./types";

export const interviewChallenges: LearningModule = {
  id: "interview-challenges",
  title: "Interview Layout Challenges",
  description:
    "A bank of realistic HTML and CSS interview exercises focused on layout, semantics, debugging, and reconstructing UIs from visual targets.",
  icon: "🎯",
  order: 9,
  estimatedHours: 5,
  lessons: [
    {
      id: "layout-debugging-workflow",
      moduleId: "interview-challenges",
      title: "Layout Debugging Workflow",
      summary:
        "Interview layout problems are usually solved faster by a disciplined debugging method than by memorizing more snippets. Learn the order of questions that turns visual chaos into signal.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Debug layout issues by checking display, sizing, overflow, and positioning in a consistent order",
        "Use DevTools overlays for flexbox, grid, box model, and computed styles",
        "Distinguish between flow problems, alignment problems, clipping problems, and stacking problems",
        "Trace a visual bug back to the nearest responsible ancestor instead of patching symptoms",
        "Explain your debugging process clearly under interview pressure",
      ],
      codeExamples: [
        {
          title: "A practical debugging checklist",
          css: `/* 1. Is the element in the layout mode you think it is? */
.container { display: flex; }

/* 2. Is sizing controlled by content, fixed values, min/max, or flex/grid rules? */
.item { min-width: 0; flex: 1; }

/* 3. Is overflow clipping descendants? */
.panel { overflow: hidden; }

/* 4. Is positioning relative to the ancestor you expect? */
.panel { position: relative; }
.tooltip { position: absolute; top: 100%; right: 0; }

/* 5. Is stacking local because of a new stacking context? */
.card { transform: translateZ(0); }`,
        },
      ],
      commonMistakes: [
        "Changing several properties at once and losing the original cause of the bug",
        "Debugging only the visibly broken child instead of inspecting the parent and grandparent layout rules",
        "Ignoring computed styles and relying only on authored CSS",
        "Treating every bug as spacing when the real issue is sizing, overflow, or layout mode",
        "Patching symptoms with magic numbers instead of identifying the responsible ancestor",
      ],
      interviewTips: [
        "A calm, repeatable debugging process is often more impressive than instantly guessing the right property.",
        "Say what you are checking and why: display mode, available space, overflow, positioned ancestor, stacking context.",
        "If you narrate your reasoning clearly, interviewers can see that you would be effective on unfamiliar production bugs too.",
      ],
      practiceTasks: [
        {
          description:
            "Take a broken layout challenge and write out your debugging steps before you edit any CSS. Then compare that plan to the actual fix.",
          hint: "Start at the parent container, not the most visibly broken child.",
        },
        {
          description:
            "Open DevTools on a flex or grid layout and turn on the overlays while resizing the page. Explain out loud what is controlling the final dimensions of each area.",
          hint: "Computed size plus layout overlay is usually more trustworthy than your first intuition.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "center-a-div",
      moduleId: "interview-challenges",
      title: "Center a Div",
      difficulty: "easy",
      description:
        "The classic interview question. Center an element both horizontally and vertically inside its parent. Implement three different methods.",
      requirements: [
        "Method 1: Flexbox (display: flex on parent)",
        "Method 2: CSS Grid (display: grid on parent)",
        "Method 3: Absolute positioning + transform",
        "Each method works regardless of the child element's dimensions",
        "No hardcoded pixel offsets (margin: auto patterns are OK)",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Center a Div</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; }

    .demo {
      width: 400px;
      height: 300px;
      background: #f3f4f6;
      border: 2px solid #d1d5db;
      margin: 2rem;
      /* YOUR CSS HERE */
    }
    .box {
      width: 100px;
      height: 80px;
      background: #6366f1;
      color: white;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="demo">
    <div class="box">Centered</div>
  </div>
</body>
</html>`,
      expectedResult:
        "The purple box is perfectly centered — both horizontally and vertically — inside the grey container. The solution works if you change the box's dimensions.",
      hints: [
        "Flexbox: display: flex; justify-content: center; align-items: center; on .demo",
        "Grid: display: grid; place-items: center; on .demo",
        "Absolute: position: relative on .demo, then position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) on .box",
      ],
      bonusTasks: [
        "Implement a fourth method using margin: auto (works in flex and grid containers)",
        "Center the box without any class on the parent — using :has() or the lobotomized owl selector",
      ],
      conceptsCovered: ["flexbox", "css-grid", "positioning", "transform"],
    },
    {
      id: "two-column-sidebar",
      moduleId: "interview-challenges",
      title: "Two-Column Sidebar Layout",
      difficulty: "easy",
      description:
        "Build a fixed-width sidebar + flexible main content layout. A staple of dashboards and documentation sites.",
      targetImage: {
        src: "/wf-challenges/two-column-sidebar.svg",
        alt: "Application layout mock with a fixed-width dark sidebar on the left and a flexible light main content area on the right.",
        caption:
          "Read this as a page-shell problem first: one fixed navigation column, one flexible content column, and independent scrolling behavior in the sidebar.",
      },
      requirements: [
        "Sidebar: 260px fixed width",
        "Main: fills remaining space",
        "Both columns full viewport height",
        "Sidebar scrolls independently if content overflows",
        "Works at all viewport widths above 768px",
        "Implement using both Flexbox and Grid (two separate examples)",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sidebar Layout</title>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <nav>
        <a href="#">Dashboard</a>
        <a href="#">Projects</a>
        <a href="#">Settings</a>
      </nav>
    </aside>
    <main class="main">
      <h1>Main Content</h1>
      <p>Content area fills the remaining space.</p>
    </main>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
a { display: block; padding: 0.5rem 1rem; text-decoration: none; }`,
      expectedResult:
        "A two-column layout where the sidebar is exactly 260px wide and the main content fills the rest. Both panels are full height. The sidebar scrolls independently.",
      hints: [
        "Flexbox: .layout { display: flex; min-height: 100vh; } .sidebar { flex: 0 0 260px; overflow-y: auto; } .main { flex: 1; }",
        "Grid: .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }",
      ],
      bonusTasks: [
        "Add a toggle button that collapses the sidebar to 0px with a CSS transition",
        "Make the sidebar collapse to a 60px icon-only bar (not fully hidden) at medium viewports",
      ],
      conceptsCovered: [
        "flexbox",
        "css-grid",
        "display-positioning",
        "overflow",
      ],
    },
    {
      id: "holy-grail-layout",
      moduleId: "interview-challenges",
      title: "Holy Grail Layout",
      difficulty: "hard",
      description:
        "The famous 'Holy Grail' layout: header, three equal-height columns (left sidebar, main content, right sidebar), and footer. The main column grows; sidebars are fixed.",
      targetImage: {
        src: "/wf-challenges/holy-grail-layout.svg",
        alt: "Holy Grail layout mock with full-width header and footer, fixed left and right sidebars, and flexible main content in the center.",
        caption:
          "Treat this as a structural layout exercise first: identify the outer page shell, then the three-column middle band, then the responsive collapse strategy.",
      },
      requirements: [
        "Header spans full width at the top",
        "Footer spans full width at the bottom",
        "Three middle columns: left sidebar (200px), main (flexible), right sidebar (200px)",
        "All three middle columns are equal height (height of the tallest)",
        "Sidebars have fixed widths; main fills remaining space",
        "Footer stays at the bottom even if content is short (sticky footer)",
        "Implement with CSS Grid (not floats)",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Holy Grail</title>
</head>
<body>
  <div class="holy-grail">
    <header>Header</header>
    <nav class="left-sidebar">Left</nav>
    <main>Main Content</main>
    <aside class="right-sidebar">Right</aside>
    <footer>Footer</footer>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }`,
      expectedResult:
        "A complete Holy Grail layout. Header and footer span the full width. Three columns in the middle share the space with fixed sidebars. The footer sticks to the bottom even with minimal content.",
      hints: [
        'grid-template-areas is the most readable solution: "header header header" / "left main right" / "footer footer footer"',
        "grid-template-rows: auto 1fr auto on the container, with min-height: 100vh",
        "The sidebars and main area are in the same row — Grid automatically makes them equal height.",
      ],
      bonusTasks: [
        "Make the sidebars collapse at < 768px (grid-template-areas reassignment in a media query)",
        "Make the sidebars sticky so they don't scroll with the main content",
      ],
      conceptsCovered: ["css-grid", "grid-template-areas", "responsive-design"],
    },
    {
      id: "responsive-card-grid",
      moduleId: "interview-challenges",
      title: "Responsive Card Grid",
      difficulty: "medium",
      description:
        "Build a card grid that automatically adjusts the number of columns based on available space — without a single media query.",
      targetImage: {
        src: "/wf-challenges/responsive-card-grid.svg",
        alt: "Responsive card grid mock with cards of equal row height, image areas, titles, text, and CTA rows arranged in an auto-fitting grid.",
        caption:
          "Focus on the repeatable card geometry and how the columns reflow as space changes. This is a no-media-query grid challenge, so the target is about structure more than exact pixels.",
      },
      requirements: [
        "Cards are at least 280px wide",
        "Number of columns adjusts automatically to available width",
        "Cards in the same row are equal height",
        "Consistent gap between all cards",
        "Works correctly from 320px to 1920px viewport width",
        "Zero media queries in your solution",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Card Grid</title>
</head>
<body>
  <div class="grid">
    <div class="card"><h2>Card 1</h2><p>Short content.</p></div>
    <div class="card"><h2>Card 2</h2><p>This card has more content and will be taller.</p></div>
    <div class="card"><h2>Card 3</h2><p>Another card.</p></div>
    <div class="card"><h2>Card 4</h2><p>Content here.</p></div>
    <div class="card"><h2>Card 5</h2><p>More content that makes this card taller.</p></div>
    <div class="card"><h2>Card 6</h2><p>Short.</p></div>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; }`,
      expectedResult:
        "Cards automatically arrange into as many columns as fit. At 320px: 1 column. At 640px: 2 columns. At 1000px: 3 columns. Cards in the same row have equal height.",
      hints: [
        "grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))",
        "auto-fit collapses empty tracks and stretches items. auto-fill keeps empty tracks.",
        "align-items: stretch (the default) gives equal-height cards.",
      ],
      bonusTasks: [
        "Add a hover state that lifts the card (transform: translateY)",
        "Make each card a link to a detail page and ensure it's keyboard-accessible",
        "Add a loading skeleton that mirrors the card structure",
      ],
      conceptsCovered: ["css-grid", "grid-advanced", "responsive-design"],
    },
    {
      id: "pricing-section",
      moduleId: "interview-challenges",
      title: "Pricing Section",
      difficulty: "medium",
      description:
        "Build a three-tier pricing section. The middle (recommended) plan is visually elevated and stands out from the others.",
      targetImage: {
        src: "/wf-challenges/pricing-section.svg",
        alt: "Three-column pricing section mock with a visually elevated middle plan, popular badge, stacked features, and bottom-aligned call-to-action buttons.",
        caption:
          "Focus on the shared card structure first, then on how the recommended middle card breaks the pattern slightly without feeling like a different component.",
      },
      requirements: [
        "Three pricing cards in a row on desktop",
        "Middle card is visually elevated: different background, border, and shadow",
        "Popular badge on the middle card",
        "Cards are equal width and equal height (except middle which is taller by 32px)",
        "Feature list in each card using a <ul> with checkmarks (CSS only, no images)",
        "CTA button in each card at the bottom, full width",
        "Stacks to single column on mobile (< 768px)",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pricing</title>
</head>
<body>
  <section class="pricing">
    <div class="plan plan--basic">
      <h2>Basic</h2>
      <div class="price">$9<span>/mo</span></div>
      <ul>
        <li>5 projects</li>
        <li>10GB storage</li>
        <li>Email support</li>
      </ul>
      <a href="#" class="btn">Get started</a>
    </div>
    <div class="plan plan--pro">
      <span class="badge">Most Popular</span>
      <h2>Pro</h2>
      <div class="price">$29<span>/mo</span></div>
      <ul>
        <li>Unlimited projects</li>
        <li>100GB storage</li>
        <li>Priority support</li>
        <li>Custom domains</li>
      </ul>
      <a href="#" class="btn btn--primary">Get started</a>
    </div>
    <div class="plan plan--enterprise">
      <h2>Enterprise</h2>
      <div class="price">$99<span>/mo</span></div>
      <ul>
        <li>Everything in Pro</li>
        <li>1TB storage</li>
        <li>SLA guarantee</li>
        <li>Dedicated support</li>
        <li>SSO</li>
      </ul>
      <a href="#" class="btn">Contact sales</a>
    </div>
  </section>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 3rem; background: #f9fafb; }
ul { list-style: none; }`,
      expectedResult:
        "Three pricing cards side-by-side on desktop. The Pro card is visually dominant (elevated, accented border, larger). Feature lists have CSS checkmark icons. CTA buttons sit at the bottom of each card regardless of feature count.",
      hints: [
        "Use flexbox on .pricing. align-items: flex-start so cards don't stretch equally, then add extra padding to the middle card.",
        "For checkmarks on <li>: li::before { content: '✓'; color: green; margin-right: 8px; }",
        "To push the button to the bottom: make .plan a flex column with flex-grow: 1 on the <ul>.",
      ],
      bonusTasks: [
        "Add a 'Annual / Monthly' toggle that updates the prices using CSS custom properties + JavaScript",
        "Make the popular badge position absolutely above the card boundary",
        "Add a subtle animated gradient background to the Pro card",
      ],
      conceptsCovered: [
        "flexbox",
        "pseudo-elements",
        "css-variables",
        "responsive-design",
      ],
    },
    {
      id: "build-a-modal",
      moduleId: "interview-challenges",
      title: "Build a Modal",
      difficulty: "medium",
      description:
        "Build a fully functional, accessible modal from scratch — no JavaScript libraries. Focus on positioning, z-index, and keyboard behaviour.",
      requirements: [
        "Backdrop covers the full viewport",
        "Modal panel is centered both horizontally and vertically",
        "Clicking the backdrop closes the modal",
        "Pressing Escape closes the modal",
        "Focus is moved to the modal on open",
        "Focus returns to the trigger button on close",
        "Modal uses correct ARIA attributes (role, aria-modal, aria-labelledby)",
        "Scrollable modal content if it exceeds the viewport height",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Modal</title>
</head>
<body>
  <button id="open-btn">Open Modal</button>

  <div id="backdrop" class="backdrop" hidden>
    <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="modal" tabindex="-1">
      <h2 id="dialog-title">Modal Title</h2>
      <p>Modal body content goes here. Add enough text to test scrolling behaviour.</p>
      <button id="close-btn">Close</button>
    </div>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; }`,
      expectedResult:
        "A working modal that opens and closes correctly. The backdrop dims the page. The modal is centered. Keyboard navigation is correct. Escape key closes it.",
      hints: [
        ".backdrop: position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center;",
        ".modal: position: relative; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;",
        "Use event.target === backdrop to detect backdrop clicks (not modal clicks).",
      ],
      bonusTasks: [
        "Add entrance/exit animations (fade + slide up)",
        "Implement a focus trap (Tab cycles through modal's focusable elements only)",
        "Support multiple modals on the same page",
      ],
      conceptsCovered: [
        "positioning",
        "z-index",
        "accessibility-fundamentals",
        "flexbox",
      ],
    },
    {
      id: "build-a-tooltip",
      moduleId: "interview-challenges",
      title: "CSS-Only Tooltip",
      difficulty: "medium",
      description:
        "Build a tooltip that appears on hover and focus using only CSS — no JavaScript. The tooltip must be accessible.",
      requirements: [
        "Tooltip appears above the trigger by default",
        "Arrow/caret pointing down at the trigger",
        "Tooltip uses position: absolute relative to the trigger",
        "Works on keyboard focus (not just hover)",
        "Content is provided via a data attribute on the trigger",
        "Smooth fade-in on appearance",
        "Tooltip text is accessible (not hidden from screen readers)",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tooltip</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 4rem; }

    /* Build your tooltip here */
    [data-tooltip] {
      position: relative;
    }
    [data-tooltip]::before {
      content: attr(data-tooltip); /* reads from data attribute */
      /* YOUR STYLES */
    }
  </style>
</head>
<body>
  <button data-tooltip="Save your changes">Save</button>
  <button data-tooltip="Permanently delete this item">Delete</button>
</body>
</html>`,
      expectedResult:
        "Tooltips appear above their trigger on hover and keyboard focus. They have a downward-pointing arrow. They fade in smoothly. They work on both mouse and keyboard.",
      hints: [
        "Use ::before for the tooltip text content and ::after for the arrow.",
        "Default state: opacity: 0; pointer-events: none; — visible state: opacity: 1;",
        "Trigger on :hover and :focus-visible: [data-tooltip]:hover::before, [data-tooltip]:focus-visible::before",
      ],
      bonusTasks: [
        "Support four placement directions (top, bottom, left, right) using data-placement attribute",
        "Add a delay before the tooltip appears (transition-delay)",
        "Make the tooltip dismissible on Escape key using a JavaScript toggle approach instead of pure CSS",
      ],
      conceptsCovered: [
        "positioning",
        "pseudo-elements",
        "transitions-transforms",
        "accessibility-fundamentals",
      ],
    },
    {
      id: "sticky-footer",
      moduleId: "interview-challenges",
      title: "Sticky Footer",
      difficulty: "easy",
      description:
        "Make the footer stick to the bottom of the viewport when the page content is shorter than the viewport height, but scroll naturally when content is longer.",
      requirements: [
        "Footer is at the bottom of the viewport when content is short",
        "Footer scrolls naturally when content is taller than the viewport",
        "No JavaScript",
        "Works with any amount of content",
        "Implement using both Flexbox and Grid approaches",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sticky Footer</title>
</head>
<body>
  <header>Header</header>
  <main>
    <!-- Short content — footer should still be at the bottom -->
    <p>Not much content here.</p>
  </main>
  <footer>Footer</footer>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
header, footer { background: #e5e7eb; padding: 1rem; }
main { padding: 2rem; }`,
      expectedResult:
        "The footer is at the bottom of the viewport when content is short. When you add enough content to overflow, the footer scrolls naturally below.",
      hints: [
        "Flexbox: body { display: flex; flex-direction: column; min-height: 100vh; } main { flex: 1; }",
        "Grid: body { display: grid; grid-template-rows: auto 1fr auto; min-height: 100vh; }",
      ],
      bonusTasks: [
        "Implement the same effect on a component level (sticky footer inside a card)",
        "Make the footer position: sticky at the bottom during scroll (different from this challenge — this is display: sticky vs layout sticky)",
      ],
      conceptsCovered: ["flexbox", "css-grid", "display-types"],
    },
    {
      id: "build-a-navbar",
      moduleId: "interview-challenges",
      title: "Responsive Navigation",
      difficulty: "medium",
      description:
        "Build a navigation bar that shows a full horizontal menu on desktop and a hamburger menu on mobile. The mobile menu opens/closes with JavaScript.",
      requirements: [
        "Desktop (> 768px): all nav links visible horizontally",
        "Mobile (< 768px): links hidden, hamburger button visible",
        "Hamburger button toggles a dropdown menu",
        "Hamburger is animated (3 lines → X) using CSS transforms",
        "Menu is accessible: aria-expanded on button, aria-hidden on menu",
        "Keyboard-accessible: Escape closes the menu",
        "Active link is visually indicated",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Responsive Nav</title>
</head>
<body>
  <nav class="nav">
    <a href="/" class="nav__brand">MyApp</a>

    <button class="nav__toggle" aria-expanded="false" aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <ul class="nav__links" aria-hidden="true">
      <li><a href="/features" class="nav__link active">Features</a></li>
      <li><a href="/pricing" class="nav__link">Pricing</a></li>
      <li><a href="/docs" class="nav__link">Docs</a></li>
      <li><a href="/signup" class="nav__link nav__link--cta">Sign Up</a></li>
    </ul>
  </nav>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
ul { list-style: none; }
a { text-decoration: none; color: inherit; }`,
      expectedResult:
        "A polished responsive nav. Desktop shows all links. Mobile shows a hamburger that toggles the menu with a smooth animation. The hamburger icon animates to X when open.",
      hints: [
        "Default (mobile): hide .nav__links with max-height: 0; overflow: hidden; transition: max-height",
        "Open state: .nav--open .nav__links { max-height: 300px; }",
        "Hamburger to X: rotate the first span 45deg, hide the second, rotate the last -45deg when .nav--open",
      ],
      bonusTasks: [
        "Close the menu when a link is clicked",
        "Add a focus trap when the mobile menu is open",
        "Make the nav transparent at the top of the page and add a solid background on scroll",
      ],
      conceptsCovered: [
        "flexbox",
        "transitions-transforms",
        "accessibility-fundamentals",
        "media-queries",
      ],
    },
    {
      id: "full-bleed-section",
      moduleId: "interview-challenges",
      title: "Full-Bleed Section",
      difficulty: "medium",
      description:
        "Build a section where the background extends to the viewport edges while the content stays constrained to a max-width. A common pattern in marketing pages.",
      targetImage: {
        src: "/wf-challenges/full-bleed-section.svg",
        alt: "Marketing page mock with alternating full-bleed sections whose backgrounds span the viewport while the inner content remains constrained to a centered max-width column.",
        caption:
          "Look at the relationship between the edge-to-edge background bands and the centered inner content. The challenge is to separate page background geometry from content width constraints.",
      },
      requirements: [
        "Content area has a max-width of 1200px and is centered",
        "Section background extends full viewport width",
        "Works inside a layout that has a max-width container",
        "No negative margins or overflow: hidden hacks",
        "Implement the modern approach using 100vw or padding tricks",
        "Two sections with different background colors demonstrate the pattern",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Full Bleed</title>
</head>
<body>
  <div class="page-wrapper">
    <header>Header</header>
    <section class="section section--dark">
      <div class="section__content">
        <h2>Full-bleed dark section</h2>
        <p>This section's background extends to the viewport edges.</p>
      </div>
    </section>
    <section class="section section--light">
      <div class="section__content">
        <h2>Full-bleed light section</h2>
        <p>Content is constrained but background is full-width.</p>
      </div>
    </section>
    <footer>Footer</footer>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
.page-wrapper { max-width: 1200px; margin: 0 auto; padding: 0 24px; }`,
      expectedResult:
        "Sections with full-viewport-width backgrounds but content constrained to 1200px center. The background bleeds to both edges even inside a max-width wrapper.",
      hints: [
        "Approach: move background to the section element and use padding instead of width to control content.",
        "Or: use margin-inline: calc(50% - 50vw) to break out of the container, then padding to bring content back.",
        "The simplest approach: don't nest sections inside .page-wrapper — make them siblings.",
      ],
      bonusTasks: [
        "Implement the full-bleed using the calc(50% - 50vw) trick on a section that IS inside a max-width container",
        "Add a full-bleed image with the text overlaid on top",
      ],
      conceptsCovered: ["positioning", "css-variables", "responsive-design"],
    },
    {
      id: "rebuild-from-mock",
      moduleId: "interview-challenges",
      title: "Rebuild a Layout From a Mock",
      difficulty: "hard",
      description:
        "This is the closest exercise to the classic interview pain point: you are shown a visual target and asked to recreate it. The skill being tested is not only CSS syntax, but layout breakdown, constraint analysis, and choosing the right HTML structure before styling.",
      targetImage: {
        src: "/wf-challenges/rebuild-from-mock.svg",
        alt: "Dashboard mock with sidebar, header, hero card, stat cards, and lower content grid.",
        caption:
          "Treat this as the interview target: first identify the major regions, then decide which parts are Grid, which are Flexbox, and which content should stay semantic.",
      },
      requirements: [
        "Create a dashboard-like layout with a left sidebar, top header, hero card, stats row, and content grid",
        "You are only allowed one pass on the HTML structure before styling — plan the regions first",
        "Use semantic landmarks where appropriate: header, nav, main, aside, section",
        "Use a combination of Grid and Flexbox intentionally rather than forcing one tool everywhere",
        "Maintain consistent spacing, alignment, and vertical rhythm across all sections",
        "At tablet/mobile widths, the layout must collapse cleanly without overlapping or clipping content",
        "Write a short notes block above your CSS explaining your layout breakdown in plain language",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rebuild From Mock</title>
</head>
<body>
  <!-- Imagine the interviewer gave you a screenshot of a dashboard.
       Recreate it with semantic HTML first, then style it. -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }`,
      expectedResult:
        "A polished dashboard-style layout that feels intentionally structured rather than guessed. The final result should show strong region planning, consistent spacing, and clean responsive collapse.",
      hints: [
        "Before writing CSS, identify the major regions: app shell, sidebar, top bar, main content, sub-sections, repeated cards.",
        "Use Grid for the page shell and larger content regions; use Flexbox inside components for alignment.",
        "If the layout feels hard, you probably skipped the breakdown step and started styling too early.",
      ],
      bonusTasks: [
        "Add a notes comment explaining why each region is Grid or Flexbox",
        "Create an icon-only collapsed sidebar state at medium widths",
        "Add a loading skeleton version of the layout that preserves the same geometry",
      ],
      conceptsCovered: [
        "css-grid",
        "flexbox",
        "responsive-design",
        "layout-debugging-workflow",
        "semantic-html",
      ],
    },
    {
      id: "comparison-table-rebuild",
      moduleId: "interview-challenges",
      title: "Responsive Comparison Table",
      difficulty: "hard",
      description:
        "Build a dense feature-comparison table that remains semantic, readable, and responsive. This challenge targets the exact kind of HTML/CSS problem that exposes whether someone understands structured content or only visual boxes.",
      targetImage: {
        src: "/wf-challenges/comparison-table-rebuild.svg",
        alt: "Feature comparison table mock with plan columns, sticky-looking header row, and highlighted recommended column.",
        caption:
          "The target is a semantic comparison interface, not a fake div grid. Focus on headers, scanning rhythm, and responsive containment.",
      },
      requirements: [
        "Use a real semantic table with caption, thead, tbody, column headers, and row headers",
        "Include at least four plans across the top and eight feature rows",
        "Recommended plan is visually highlighted without breaking table semantics",
        "Table must remain readable on narrow screens by wrapping in a horizontal scroll region rather than destroying the table structure",
        "Sticky first column or sticky header is a bonus, but the base version must still be clean and usable",
        "Status indicators like yes/no must have a text alternative, not color alone",
        "Spacing and alignment must make row/column comparison easy at a glance",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comparison Table</title>
</head>
<body>
  <section class="comparison">
    <!-- Build a semantic feature comparison table here -->
  </section>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A professional comparison table that preserves semantic table markup, supports scanning across rows and columns, and remains usable on smaller viewports.",
      hints: [
        "This is a table problem, not a div grid problem.",
        "Wrap the table in an overflow-x container on small screens instead of replacing it with cards immediately.",
        "Use row headers for feature names so screen readers announce comparisons correctly.",
      ],
      bonusTasks: [
        "Make the header row sticky during vertical scroll",
        "Make the first column sticky during horizontal scroll",
        "Add visually-hidden helper text for icon-only status cells",
      ],
      conceptsCovered: [
        "lists-and-tables",
        "responsive-design",
        "accessibility-fundamentals",
        "visual-ui",
      ],
    },
    {
      id: "editorial-article-layout",
      moduleId: "interview-challenges",
      title: "Editorial Article Layout",
      difficulty: "hard",
      description:
        "Build a long-form article page with strong semantics, typography, media handling, and supporting content. This challenge forces you to think about reading rhythm, hierarchy, and structural HTML — not just boxes on a screen.",
      targetImage: {
        src: "/wf-challenges/editorial-article-layout.svg",
        alt: "Editorial article mock with full-width hero image, narrow reading column, sticky aside, and supporting quote and figure blocks.",
        caption:
          "Notice the narrow reading measure, the supporting aside, and the change in rhythm between hero media, body copy, and side content.",
      },
      requirements: [
        "Use semantic article markup with header, article, sections, figure, figcaption, aside, and footer where appropriate",
        "Include a reading-width content column, a sticky table of contents or aside on desktop, and a full-width hero media block",
        "Images must preserve aspect ratio and avoid layout shift",
        "Heading hierarchy must be clean and navigable",
        "Lists, quotes, and metadata should use the right semantic elements rather than generic divs",
        "Layout must adapt cleanly to mobile without making line lengths unreadable",
        "Typography and spacing should feel editorial, not like default browser styles",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Editorial Article</title>
</head>
<body>
  <!-- Build a rich editorial layout here -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; color: #111827; background: #fff; }`,
      expectedResult:
        "A reading-focused article experience with strong semantic structure, thoughtful typography, and a desktop/mobile layout that still feels intentional.",
      hints: [
        "Think in content regions first: article header, main reading column, supporting aside, figures, pull quotes, footer.",
        "Use a constrained measure for body copy. Wide text columns make good content feel bad.",
        "A visually strong article layout is mostly spacing, type scale, and media treatment.",
      ],
      bonusTasks: [
        "Add a sticky progress indicator or table of contents on desktop",
        "Use picture or responsive media for the hero image",
        "Add footnotes or source links using ordered lists and proper anchors",
      ],
      conceptsCovered: [
        "semantic-html",
        "lists-and-tables",
        "responsive-media",
        "typography-spacing",
        "interactive-semantics",
      ],
    },
    {
      id: "complex-form-wizard",
      moduleId: "interview-challenges",
      title: "Multi-Step Form Wizard",
      difficulty: "hard",
      description:
        "Build a multi-step form that tests layout, grouping, validation, and accessible interaction all at once. This is a common interview shape because it reveals whether someone can combine semantics with UI state cleanly.",
      targetImage: {
        src: "/wf-challenges/complex-form-wizard.svg",
        alt: "Multi-step form wizard mock with progress tracker, grouped fields, side summary panel, and sticky action footer.",
        caption:
          "Read this as both a semantics challenge and a layout challenge: there is grouped form content, progress state, and a structured summary area.",
      },
      requirements: [
        "Three steps minimum: personal info, preferences, confirmation",
        "Each step uses correct labels, grouping, help text, and error associations",
        "Progress indicator is visible and understandable",
        "Buttons and links must use the correct semantics throughout the flow",
        "Form layout must adapt between single-column mobile and denser desktop arrangement",
        "Validation errors should be connected to inputs and clearly visible",
        "Final confirmation screen summarizes the entered information in a structured way",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Form Wizard</title>
</head>
<body>
  <!-- Build a multi-step form flow here -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A clear, accessible wizard flow that feels like a real product form rather than a pile of inputs. Layout, grouping, and messaging should make each step easy to understand.",
      hints: [
        "Use fieldset and legend for grouped choices, not just visual headings.",
        "The review step is a great place to use lists or description lists for structured summary content.",
        "This challenge is about both semantics and layout rhythm, not only validation logic.",
      ],
      bonusTasks: [
        "Persist progress between refreshes with localStorage",
        "Add a mobile stepper that collapses to a simpler progress indicator",
        "Add inline validation with aria-live announcements",
      ],
      conceptsCovered: [
        "form-basics",
        "interactive-semantics",
        "accessibility-fundamentals",
        "responsive-design",
        "lists-and-tables",
      ],
    },
    {
      id: "inbox-split-view",
      moduleId: "interview-challenges",
      title: "Inbox Split-View Workspace",
      difficulty: "hard",
      description:
        "Build a three-pane inbox UI with folders, a message list, and a detail view. This is a realistic interview-style application screen that tests shells, lists, truncation, and content hierarchy all at once.",
      targetImage: {
        src: "/wf-challenges/inbox-split-view.svg",
        alt: "Inbox application mock with left folder navigation, center message list, and right message detail pane.",
        caption:
          "Treat this as a compound screen: navigation region, repeated list items, and a content detail pane with its own internal layout.",
      },
      requirements: [
        "Create a left navigation rail for mailbox categories or filters",
        "Create a center message list using a semantic list structure",
        "Create a right detail pane showing the selected message content",
        "Message rows must support truncation without breaking the layout",
        "The shell should adapt cleanly to narrower widths, with a clear collapse strategy",
        "Use semantic landmarks and headings where appropriate",
        "Keep visual hierarchy strong enough that users can instantly see navigation vs list vs content",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inbox Split View</title>
</head>
<body>
  <!-- Build a realistic inbox workspace here -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A convincing product-style inbox layout where the three regions feel coherent, the message list reads like a real list, and the detail pane has clear reading hierarchy.",
      hints: [
        "Think in shell regions first: left rail, list pane, detail pane.",
        "The message list is usually a list of repeated interactive items, not a generic pile of divs.",
        "This challenge is a great place to practice `min-width: 0` and text truncation in flex rows.",
      ],
      bonusTasks: [
        "Add an unread state and a selected row state",
        "Make the left rail sticky while the message pane scrolls",
        "Create a responsive mobile mode where the panes become progressive views",
      ],
      conceptsCovered: [
        "flexbox",
        "css-grid",
        "interactive-semantics",
        "overflow",
        "responsive-design",
      ],
    },
    {
      id: "team-directory-workspace",
      moduleId: "interview-challenges",
      title: "Team Directory Workspace",
      difficulty: "hard",
      description:
        "Build a people directory UI with a filter sidebar, searchable results area, and supporting detail card. This kind of screen shows up in admin, HR, and operations products and is great layout-breakdown practice.",
      targetImage: {
        src: "/wf-challenges/team-directory-workspace.svg",
        alt: "Team directory mock with filter sidebar, central member card grid or list, and a right-side profile summary panel.",
        caption:
          "This is a mixed-content workspace: a filter form, a repeated collection of people results, and a supporting profile or stats panel.",
      },
      requirements: [
        "Create a filter sidebar with grouped controls and section headings",
        "Create a central results region with repeated member items",
        "Create a supporting profile or stats panel on the right",
        "Use semantic structure for the filter form, repeated results, and supporting metadata",
        "The results layout should remain readable across wide and narrow widths",
        "Preserve hierarchy between primary browsing content and secondary supporting content",
        "Use layout choices intentionally rather than forcing a single tool across the entire screen",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Team Directory Workspace</title>
</head>
<body>
  <!-- Build a team directory workspace here -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A realistic admin-style directory screen with clear separation between filtering, browsing, and supporting member context.",
      hints: [
        "The filter area is usually a form, not just a visually grouped sidebar.",
        "Repeated people results often belong in a list or grid of peer items.",
        "The right panel should feel secondary in hierarchy even if it is visually strong.",
      ],
      bonusTasks: [
        "Add a view toggle between grid and compact list",
        "Make the filter sidebar collapsible on smaller widths",
        "Use a description list for the summary metadata in the supporting panel",
      ],
      conceptsCovered: [
        "layout-breakdown",
        "form-basics",
        "lists-and-tables",
        "css-grid",
        "responsive-design",
      ],
    },
    {
      id: "layout-breakdown-notes",
      moduleId: "interview-challenges",
      title: "Layout Breakdown From an Image",
      difficulty: "hard",
      description:
        "This challenge is specifically for the interview scenario where someone shows you an image and says: 'we need to get to this.' Your job is to analyze the visual, name the regions, choose the layout tools, and then implement the shell with confidence.",
      targetImage: {
        src: "/wf-challenges/layout-breakdown-notes.svg",
        alt: "Complex application mock with left rail, filters, board-like content columns, floating summary card, and layered visual sections.",
        caption:
          "Do not code immediately. Use the image to practice layout decomposition: large rectangles first, internal alignment second, polish last.",
      },
      requirements: [
        "Start by writing a plain-language breakdown of the image before coding: regions, axes, repeated patterns, alignment rules, and spacing rhythm",
        "Identify which parts are page-level Grid problems and which are component-level Flexbox problems",
        "Build the layout shell first in grayscale blocks before adding detail styling",
        "Use semantic HTML where the content suggests landmarks, lists, cards, or tables",
        "Avoid jumping straight to pixel-perfect polish before the geometry is correct",
        "The finished solution must preserve the major proportions and alignments of the target",
        "Include a short postmortem: what visual clues helped you choose the final layout strategy",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Layout Breakdown</title>
</head>
<body>
  <!-- 1. Write your region breakdown here.
       2. Build a grayscale shell version of the layout.
       3. Refine the final UI after the geometry is correct. -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f172a; color: #e5e7eb; }`,
      expectedResult:
        "A disciplined reconstruction process that proves you can read a visual target, break it into layout primitives, and implement a stable shell before getting lost in details.",
      hints: [
        "Ask: what are the big rectangles? Which ones repeat? Which ones align to a column system? Which areas are just internal component alignment?",
        "Build ugly blocks first. Pretty comes later.",
        "If you cannot explain the layout in words, you do not understand it well enough to code it yet.",
      ],
      bonusTasks: [
        "Time-box yourself to 10 minutes for the shell before any polish",
        "Repeat the challenge with two different mockups and compare your breakdown notes",
        "Add a checklist you can reuse in future real interviews",
      ],
      conceptsCovered: [
        "layout-debugging-workflow",
        "css-grid",
        "flexbox",
        "semantic-html",
        "responsive-design",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "layout-debugging-workflow": () => (
    <>
      <p>
        CSS bugs feel mysterious when you treat them as random styling failures.
        They become much more manageable when you classify them. Is this a
        normal-flow problem, a flex or grid sizing problem, an overflow clipping
        problem, a positioning problem, or a stacking problem? That first
        classification step usually cuts the search space down dramatically.
      </p>
      <p>
        A reliable workflow starts with the nearest container, not the visibly
        broken child. Ask: what layout mode is this parent using? What space is
        available? Is the child allowed to shrink? Is overflow clipping it? Is
        the element positioned relative to the ancestor you think it is? Those
        questions mirror how the browser actually computes layout, which is why
        they work better than trial-and-error edits.
      </p>
      <p>
        Browser DevTools are part of the skill, not a crutch. Flex and grid
        overlays show track boundaries and distribution. The box model shows
        whether spacing comes from margin, padding, or size. Computed styles
        reveal the final winning values after the cascade. Professional
        debugging is mostly about narrowing uncertainty quickly, and DevTools
        does exactly that.
      </p>
      <p>
        This matters in interviews because the interviewer is not only grading
        the final CSS. They are also watching how you think when the UI is not
        behaving. If your process is methodical, you look like someone who can
        debug production layouts without panic.
      </p>
    </>
  ),
};
