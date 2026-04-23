import type { LearningModule } from "./types";

export const flexbox: LearningModule = {
  id: "flexbox",
  title: "Flexbox",
  description:
    "The most versatile one-dimensional layout system in CSS. Master flex containers, flex items, alignment, and sizing — and you can build virtually any row or column layout.",
  icon: "↔️",
  order: 4,
  estimatedHours: 2,
  lessons: [
    {
      id: "flex-basics",
      moduleId: "flexbox",
      title: "Flexbox Basics",
      summary:
        "Flexbox is a one-dimensional layout model. Understanding the main axis vs cross axis mental model is the key to predicting how flex properties behave.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Know that display: flex establishes a flex formatting context for direct children",
        "Understand main axis and cross axis — and how flex-direction changes them",
        "Use justify-content to align items along the main axis",
        "Use align-items to align items along the cross axis",
        "Control wrapping with flex-wrap",
      ],
      codeExamples: [
        {
          title: "Flex container properties",
          css: `.container {
  display: flex;
  flex-direction: row; /* default: main axis = horizontal */
  /* flex-direction: column — main axis = vertical */
  /* flex-direction: row-reverse | column-reverse */

  justify-content: flex-start; /* along the main axis */
  /* justify-content: flex-end | center | space-between | space-around | space-evenly */

  align-items: stretch; /* along the cross axis */
  /* align-items: flex-start | flex-end | center | baseline */

  flex-wrap: nowrap; /* default: items don't wrap */
  /* flex-wrap: wrap | wrap-reverse */

  gap: 16px; /* spacing between flex items (no outer margin) */
  /* gap: 16px 8px — row-gap column-gap */
}`,
        },
        {
          title: "Classic flex patterns",
          css: `/* Center anything — the most common interview answer */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Nav: logo left, links right */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Equal-height cards in a row */
.card-row {
  display: flex;
  gap: 24px;
  align-items: stretch; /* default, all cards same height */
}

/* Push last item to end (footer-style) */
.sidebar {
  display: flex;
  flex-direction: column;
}
.sidebar__footer {
  margin-top: auto; /* pushes to the bottom */
}`,
        },
      ],
      commonMistakes: [
        "Applying flex properties to the wrong element — flex container properties (justify-content, align-items) go on the parent; flex item properties (flex, align-self) go on children",
        "Confusing justify-content and align-items — they swap when flex-direction is column",
        "Using margin instead of gap for spacing between items",
        "Not knowing that flex items can themselves be flex containers — nesting is fine and common",
      ],
      interviewTips: [
        "'How do you center a div?' — the modern answer is display: flex; justify-content: center; align-items: center; on the parent. Or display: grid; place-items: center. Know both.",
        "justify-content is for the main axis (direction of flex-direction). align-items is for the cross axis. When direction is column, they swap intuitively.",
        "gap is now universally supported and preferred over margin for flex item spacing — it doesn't add margin on the outer edges.",
      ],
      practiceTasks: [
        {
          description:
            "Build a navigation bar: logo on the left, navigation links in the center, a CTA button on the right. Use only flexbox.",
          hint: "space-between on the container won't work for 3 groups. Use a wrapper for each group, or use margin: auto tricks.",
        },
        {
          description:
            "Build a card grid where all cards in a row are the same height regardless of content length. No fixed heights.",
          hint: "align-items: stretch (the default) makes all flex items stretch to the tallest sibling's height.",
        },
      ],
    },
    {
      id: "flex-alignment",
      moduleId: "flexbox",
      title: "Flexbox Alignment Deep Dive",
      summary:
        "There are 6 possible values for justify-content and 5 for align-items. Mastering them — plus align-self and align-content — covers virtually every alignment scenario.",
      estimatedMinutes: 25,
      learningObjectives: [
        "Know all justify-content values: flex-start, flex-end, center, space-between, space-around, space-evenly",
        "Know all align-items values: stretch, flex-start, flex-end, center, baseline",
        "Use align-self to override align-items on individual items",
        "Use align-content for multi-line flex containers",
        "Use gap for clean item spacing without outer-edge side effects",
      ],
      codeExamples: [
        {
          title: "justify-content values visualized",
          css: `/* |item item item             | flex-start (default) */
.start { justify-content: flex-start; }

/* |             item item item| flex-end */
.end { justify-content: flex-end; }

/* |      item item item       | center */
.center { justify-content: center; }

/* |item       item       item | space-between */
.between { justify-content: space-between; }

/* | item     item     item  | space-around (equal space on each side) */
.around { justify-content: space-around; }

/* |  item    item    item   | space-evenly (equal gaps, including outer) */
.evenly { justify-content: space-evenly; }`,
        },
        {
          title: "align-self and baseline alignment",
          css: `.container {
  display: flex;
  align-items: flex-start; /* default for this example */
  height: 200px;
}

/* Override the container's align-items for one specific item */
.special-item {
  align-self: flex-end; /* this item aligns to the bottom */
}

.stretch-item {
  align-self: stretch; /* this item fills the full height */
}

/* baseline: align to the text baseline — great for mixed font sizes */
.mixed-text {
  display: flex;
  align-items: baseline;
}`,
        },
      ],
      commonMistakes: [
        "Using align-content thinking it works on single-line containers — align-content only applies when flex-wrap: wrap and there are multiple lines",
        "Using space-between on a container with a single item — the item sits at the start, which looks like a bug",
        "Not knowing that align-self overrides align-items for individual items",
      ],
      interviewTips: [
        "align-content vs align-items: align-items aligns items within each flex line; align-content controls how the lines themselves are distributed (only relevant with flex-wrap: wrap).",
        "The gap property in flexbox adds space between items only — not on the outer edges. This is often preferable to margin which adds spacing everywhere.",
        "margin: auto in a flex container is a powerful technique: a flex item with margin-left: auto will push itself (and everything after it) to the end of the main axis.",
      ],
      practiceTasks: [
        {
          description:
            "Create a flex container with 5 items. Apply every justify-content value one at a time and screenshot each result. Build muscle memory for the visual differences.",
          hint: "Make the container visually apparent (background, border) so the spacing is obvious.",
        },
        {
          description:
            "Build a header with: logo, nav links using margin: auto to push to the right, and a button. All using a single flex container.",
          hint: "Put margin-left: auto on the nav element — it absorbs all available space, pushing the button to the right edge.",
        },
      ],
    },
    {
      id: "flex-sizing",
      moduleId: "flexbox",
      title: "Flex Item Sizing",
      summary:
        "flex-grow, flex-shrink, and flex-basis are the three levers controlling how items distribute available space. The flex shorthand wraps all three in a non-obvious way.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Understand what flex-grow, flex-shrink, and flex-basis each control",
        "Know the flex shorthand: flex: 1 = grow:1, shrink:1, basis:0",
        "Distinguish flex: 1 from flex: auto (basis: 0 vs basis: auto)",
        "Know when to use min-width: 0 to fix flex item overflow",
      ],
      codeExamples: [
        {
          title: "flex shorthand and common values",
          css: `/* flex: grow shrink basis */
.item { flex: 1; }
/* equivalent to: flex: 1 1 0 */
/* grow=1: takes available space equally with other flex:1 items */
/* shrink=1: shrinks to fit if needed */
/* basis=0: starts from 0 width, distributes all space proportionally */

/* flex: auto = 1 1 auto */
/* basis: auto means start from the content's natural size */
.auto-item { flex: auto; }

/* flex: none = 0 0 auto — don't grow OR shrink */
.fixed-item { flex: none; }

/* Three equal columns */
.col { flex: 1; }

/* Sidebar (fixed) + main (grows) */
.sidebar { flex: 0 0 280px; } /* don't grow or shrink, 280px wide */
.main { flex: 1; } /* take all remaining space */`,
        },
        {
          title: "Fixing flex item overflow with min-width: 0",
          css: `/* Common bug: long text overflows flex item */
.container { display: flex; }
.text-item {
  /* Text doesn't wrap because flex items have min-width: auto */
  overflow: hidden; /* won't work alone */
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Fix: override min-width */
.text-item {
  min-width: 0; /* allows the item to shrink below content size */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`,
        },
      ],
      commonMistakes: [
        "Expecting flex: 1 items to be equal width when they have different content — flex: 1 uses basis: 0, which is equal. flex: auto uses the content size as starting point, which isn't equal.",
        "Using width on flex items instead of flex-basis — width is less specific to flex layout",
        "Not knowing the min-width: 0 trick for overflow in flex items",
        "Using flex-grow: 0 thinking it prevents the item from taking any space — it just prevents growth beyond its flex-basis",
      ],
      interviewTips: [
        "The flex shorthand with one value (flex: 1) sets flex-basis to 0, not auto. This is a key difference from flex: auto. For equal-width columns, flex: 1 is usually what you want.",
        "flex items have an implicit minimum size of their content (min-width: auto). This prevents them from shrinking below their content, which can cause overflow. Override with min-width: 0 when needed.",
        "flex-grow proportions distribute the remaining space, not the total space. If container is 600px, items have basis 100px each, and remaining space is 300px — flex-grow: 1 items each get 150px added.",
      ],
      practiceTasks: [
        {
          description:
            "Build a two-column layout: a fixed 260px sidebar and a main content area that fills the remaining space at any viewport width.",
          hint: "sidebar: flex: 0 0 260px; main: flex: 1;",
        },
        {
          description:
            "Create a flex row with a truncated text item. Make the text truncate with ellipsis instead of overflowing the container.",
          hint: "Add min-width: 0 to the flex item, then white-space: nowrap; overflow: hidden; text-overflow: ellipsis.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "navbar-layout",
      moduleId: "flexbox",
      title: "Responsive Navbar",
      difficulty: "easy",
      description:
        "Build a navigation bar that demonstrates mastery of flexbox alignment. No grid, no floats — flexbox only.",
      requirements: [
        "Logo/brand on the far left",
        "Navigation links in the center",
        "User avatar and a CTA button on the far right",
        "All items vertically centered in the bar",
        "Gap between nav links (not margin on individual links)",
        "Minimum height of 64px",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Navbar</title>
</head>
<body>
  <nav>
    <a href="/" class="brand">MyApp</a>
    <ul>
      <li><a href="/features">Features</a></li>
      <li><a href="/pricing">Pricing</a></li>
      <li><a href="/docs">Docs</a></li>
    </ul>
    <div class="actions">
      <img src="https://i.pravatar.cc/32" alt="User avatar" width="32" height="32" />
      <a href="/signup" class="btn">Get Started</a>
    </div>
  </nav>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
ul { list-style: none; }
a { text-decoration: none; color: inherit; }`,
      expectedResult:
        "A clean navbar with the three sections correctly distributed. The nav links are centered on the bar. The user avatar and CTA button are aligned to the right. All content is vertically centered.",
      hints: [
        "Use space-between on the main nav to push the three sections apart.",
        "The middle nav links need their own flex container (the <ul>) to layout horizontally with gap.",
        "Use align-items: center on the nav to vertically center everything.",
      ],
      bonusTasks: [
        "Add a hover state to the nav links with a color transition",
        "Make the navbar responsive: at < 768px, hide the nav links and show a hamburger menu button",
        "Add a background blur (backdrop-filter: blur) and semi-transparent background to create a glassmorphism effect",
      ],
      conceptsCovered: ["flex-basics", "flex-alignment", "gap", "justify-content", "align-items"],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "flex-basics": () => (
    <>
      <p>
        Flexbox is a <em>one-dimensional</em> layout model — it lays items out along a
        single axis at a time, either a row or a column. When you add{" "}
        <code>display: flex</code> to an element, that element becomes the{" "}
        <em>flex container</em> and its direct children become <em>flex items</em>. The
        container controls the overall layout; the items control their individual sizing
        and positioning within that layout.
      </p>
      <p>
        The key mental model is the <strong>main axis</strong> and{" "}
        <strong>cross axis</strong>. <code>flex-direction</code> sets the main axis:{" "}
        <code>row</code> (default, horizontal) or <code>column</code> (vertical). The cross
        axis is always perpendicular to the main axis.{" "}
        <code>justify-content</code> aligns items along the main axis.{" "}
        <code>align-items</code> aligns items along the cross axis. When you change{" "}
        <code>flex-direction: column</code>, these two swap their visual direction — a
        frequent source of confusion until the main/cross axis model clicks.
      </p>
      <p>
        Flexbox replaced a messy era of float layouts and inline-block tricks for most
        UI patterns. Centering both horizontally and vertically — notoriously awkward in
        CSS for years — is now two lines:{" "}
        <code>justify-content: center; align-items: center</code>. Navigation bars,
        card rows, media objects, and toolbars are all natural fits for flexbox. For
        two-dimensional layouts (rows <em>and</em> columns simultaneously), CSS Grid is
        the right tool instead.
      </p>
      <p>
        The most common Flexbox mistake is forgetting that only direct children become flex
        items. If the child you want to align is wrapped in another div, the container is
        aligning the wrapper, not the content inside it. That single fact explains a huge
        percentage of &quot;why isn&apos;t flexbox working?&quot; debugging sessions.
      </p>
      <p>
        As an interview topic, Flexbox is less about memorizing property names and more about
        whether your mental model is stable under change. If I switch from row to column, do
        you still know what the main axis is? If yes, you understand Flexbox. If not, you
        only memorized the happy path.
      </p>
    </>
  ),

  "flex-alignment": () => (
    <>
      <p>
        Flexbox provides a rich set of alignment primitives that cover nearly every
        one-dimensional alignment scenario. On the main axis, <code>justify-content</code>{" "}
        has six useful values. <code>flex-start</code> and <code>flex-end</code> pack
        items to either end. <code>center</code> groups them in the middle.{" "}
        <code>space-between</code> puts the first and last items at the edges and
        distributes equal gaps between them (no outer spacing). <code>space-around</code>{" "}
        gives each item equal margin on both sides (so outer gaps are half the inner
        gaps). <code>space-evenly</code> makes all gaps — including outer — equal.
      </p>
      <p>
        On the cross axis, <code>align-items: stretch</code> (the default) makes all
        items as tall as the tallest item — this is the mechanism behind equal-height
        flex card rows. <code>align-items: center</code> vertically centers items.{" "}
        <code>align-items: baseline</code> aligns items to their text baseline — useful
        when items have different font sizes. An individual item can override the
        container&apos;s <code>align-items</code> with its own{" "}
        <code>align-self</code> property.
      </p>
      <p>
        A useful trick: <code>margin: auto</code> in a flex container absorbs all
        remaining free space in the direction it&apos;s applied. A flex item with{" "}
        <code>margin-left: auto</code> will push itself — and everything after it — to
        the far right of the container. This is how you build a navbar with a logo on
        the left and actions on the right using a single flat flex container.
      </p>
      <p>
        It also helps to separate <code>gap</code> from distributed spacing values like
        <code>space-between</code>. <code>gap</code> creates fixed spacing between items
        without changing alignment strategy. <code>space-between</code> uses all available
        free space as distribution. Many layouts become more predictable when you choose one
        job for each: <code>justify-content</code> for alignment, <code>gap</code> for
        spacing.
      </p>
      <p>
        When people say Flexbox feels magical, this is usually the part they mean. But it
        stops feeling magical when you remember that free space is a real quantity the layout
        engine is distributing. Flexbox alignment becomes much easier when you keep asking:
        &quot;along which axis is the free space being handed out?&quot;
      </p>
    </>
  ),

  "flex-sizing": () => (
    <>
      <p>
        Flex item sizing is controlled by three properties: <code>flex-grow</code>{" "}
        (how much of available free space the item claims), <code>flex-shrink</code>{" "}
        (how much it gives up when there&apos;s not enough space), and{" "}
        <code>flex-basis</code> (the item&apos;s starting size before growth or
        shrinkage is applied). The <code>flex</code> shorthand sets all three:{" "}
        <code>flex: 1</code> means grow:1, shrink:1, basis:0.
      </p>
      <p>
        The distinction between <code>flex: 1</code> (<code>basis: 0</code>) and{" "}
        <code>flex: auto</code> (<code>basis: auto</code>) is subtle but important.
        With <code>basis: 0</code>, items start from zero width and all available space
        is distributed proportionally — so <code>flex: 1</code> items are truly equal
        width regardless of content. With <code>basis: auto</code>, items start from
        their natural content width and then grow proportionally — so items with more
        content end up wider. For equal-width columns, use <code>flex: 1</code>.
      </p>
      <p>
        Flex items have an implicit minimum size of <code>auto</code>, which means they
        won&apos;t shrink below their content size. This prevents overflow in most
        cases, but can cause issues when you want text to truncate: the item refuses to
        shrink below the text&apos;s natural width. The fix is{" "}
        <code>min-width: 0</code> on the flex item — this overrides the implicit
        minimum and allows it to shrink as needed, letting <code>overflow: hidden</code>{" "}
        and <code>text-overflow: ellipsis</code> work correctly.
      </p>
      <p>
        This sizing model is why Flexbox is so effective for application UI. Toolbars,
        search rows, cards, split panes, and settings forms all need a negotiation between
        natural content size and available free space. Flex sizing lets you describe that
        negotiation directly instead of hardcoding widths for every breakpoint.
      </p>
      <p>
        One of the most interview-relevant details is knowing that overflow bugs in flex
        layouts often come from minimum sizing, not from <code>overflow</code> itself. If a
        flex child refuses to truncate, <code>min-width: 0</code> is frequently the real
        fix. That&rsquo;s the kind of practical knowledge that separates memorization from
        real debugging skill.
      </p>
    </>
  ),
};
