import type { LearningModule } from "./types";

export const interviewChallenges: LearningModule = {
  id: "interview-challenges",
  title: "Interview Layout Challenges",
  description:
    "The 10 most common CSS layout problems asked in frontend interviews. Work through these and you'll be ready for any layout question.",
  icon: "🎯",
  order: 9,
  estimatedHours: 3.5,
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
      conceptsCovered: ["flexbox", "css-grid", "display-positioning", "overflow"],
    },
    {
      id: "holy-grail-layout",
      moduleId: "interview-challenges",
      title: "Holy Grail Layout",
      difficulty: "hard",
      description:
        "The famous 'Holy Grail' layout: header, three equal-height columns (left sidebar, main content, right sidebar), and footer. The main column grows; sidebars are fixed.",
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
        "grid-template-areas is the most readable solution: \"header header header\" / \"left main right\" / \"footer footer footer\"",
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
      conceptsCovered: ["flexbox", "pseudo-elements", "css-variables", "responsive-design"],
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
      conceptsCovered: ["positioning", "z-index", "accessibility-fundamentals", "flexbox"],
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
      conceptsCovered: ["positioning", "pseudo-elements", "transitions-transforms", "accessibility-fundamentals"],
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
      conceptsCovered: ["flexbox", "transitions-transforms", "accessibility-fundamentals", "media-queries"],
    },
    {
      id: "full-bleed-section",
      moduleId: "interview-challenges",
      title: "Full-Bleed Section",
      difficulty: "medium",
      description:
        "Build a section where the background extends to the viewport edges while the content stays constrained to a max-width. A common pattern in marketing pages.",
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
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "layout-debugging-workflow": () => (
    <>
      <p>
        CSS bugs feel mysterious when you treat them as random styling failures. They become
        much more manageable when you classify them. Is this a normal-flow problem, a flex or
        grid sizing problem, an overflow clipping problem, a positioning problem, or a
        stacking problem? That first classification step usually cuts the search space down
        dramatically.
      </p>
      <p>
        A reliable workflow starts with the nearest container, not the visibly broken child.
        Ask: what layout mode is this parent using? What space is available? Is the child
        allowed to shrink? Is overflow clipping it? Is the element positioned relative to the
        ancestor you think it is? Those questions mirror how the browser actually computes
        layout, which is why they work better than trial-and-error edits.
      </p>
      <p>
        Browser DevTools are part of the skill, not a crutch. Flex and grid overlays show
        track boundaries and distribution. The box model shows whether spacing comes from
        margin, padding, or size. Computed styles reveal the final winning values after the
        cascade. Professional debugging is mostly about narrowing uncertainty quickly, and
        DevTools does exactly that.
      </p>
      <p>
        This matters in interviews because the interviewer is not only grading the final CSS.
        They are also watching how you think when the UI is not behaving. If your process is
        methodical, you look like someone who can debug production layouts without panic.
      </p>
    </>
  ),
};
