import type { LearningModule } from "./types";

export const displayPositioning: LearningModule = {
  id: "display-positioning",
  title: "Display & Positioning",
  description:
    "How elements flow, stack, and escape normal flow. Mastering display types and positioning unlocks sticky headers, tooltips, modals, and most real-world UI patterns.",
  icon: "📐",
  order: 3,
  estimatedHours: 2,
  lessons: [
    {
      id: "display-types",
      moduleId: "display-positioning",
      title: "Display Types",
      summary:
        "The display property is the first thing the browser checks when laying out an element. Block, inline, inline-block, and none each have distinct layout rules.",
      estimatedMinutes: 25,
      learningObjectives: [
        "Know the layout rules for block vs inline elements",
        "Understand when inline-block is the right choice",
        "Know the difference between display: none, visibility: hidden, and opacity: 0",
        "Understand that display also creates formatting contexts (block, inline, flex, grid)",
      ],
      codeExamples: [
        {
          title: "Block vs inline vs inline-block comparison",
          html: `<!-- Block: full width, stacks vertically, respects width/height -->
<div style="background: lightblue; width: 200px; height: 50px;">Block</div>
<div style="background: lightcoral;">Also block (full width)</div>

<!-- Inline: only as wide as content, no width/height, flows in text -->
<span style="background: lightgreen; width: 200px;">Inline (width ignored)</span>
<span style="background: lightyellow;">Also inline</span>

<!-- Inline-block: flows like inline, but respects width/height -->
<span style="display: inline-block; background: lavender; width: 120px; height: 40px;">
  Inline-block
</span>`,
          css: `/* Common use case for inline-block: nav items */
.nav-item {
  display: inline-block;
  padding: 8px 16px;
  vertical-align: middle;
}`,
        },
        {
          title: "Visibility: none vs hidden vs opacity 0",
          css: `/* Removed from layout — no space, no interaction */
.gone { display: none; }

/* Invisible but keeps its space, no interaction */
.invisible { visibility: hidden; }

/* Transparent but keeps its space, STILL interactive (events fire) */
.transparent { opacity: 0; }

/* Transitions: display can't be animated, opacity can */
.fade-out {
  opacity: 0;
  pointer-events: none; /* disable interaction when invisible */
  transition: opacity 0.3s;
}`,
        },
      ],
      commonMistakes: [
        "Setting width/height on inline elements and wondering why they don't apply — inline elements ignore those properties",
        'Using display: none on decorative elements vs screen-reader-hidden elements — adds aria-hidden="true" when you want to hide from AT too',
        "Assuming opacity: 0 elements are non-interactive — they still receive mouse/touch/keyboard events",
        "Overusing inline-block when flexbox or grid is more appropriate",
      ],
      interviewTips: [
        'display: none removes the element from the accessibility tree. visibility: hidden keeps it in the tree (it\'s still announced if focused). aria-hidden="true" removes it from the AT tree but keeps it visible.',
        "The display property doesn't just affect the element itself — it creates a new formatting context. display: flex/grid establishes a new formatting context for children.",
        "Replaced elements (img, input, textarea, select, video) are inline by default but behave like inline-block — they respect width and height.",
      ],
      practiceTasks: [
        {
          description:
            "Build a horizontal navigation bar using only display: inline-block. Then rebuild it using flexbox. Compare the code — note which is simpler.",
          hint: "With inline-block, you'll hit the whitespace gap issue (small gaps between inline elements). Flex eliminates this.",
        },
        {
          description:
            "Create a toggle button that switches an element between display: none and visible. Add a CSS transition. Observe that you can't transition display — implement a workaround.",
          hint: "Use opacity + pointer-events, or use the 'visibility: hidden' + 'opacity: 0' combination which can be transitioned.",
        },
      ],
    },
    {
      id: "positioning",
      moduleId: "display-positioning",
      title: "CSS Positioning",
      summary:
        "Positioning takes elements out of normal flow — or keeps them in it but shifts them. It's the mechanism behind tooltips, dropdowns, sticky headers, modals, and fixed CTAs.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Know the five position values: static, relative, absolute, fixed, sticky",
        "Understand the containing block concept for absolute positioning",
        "Use z-index correctly — and understand why it sometimes doesn't work",
        "Identify what creates a new stacking context",
        "Build a sticky header with position: sticky",
      ],
      codeExamples: [
        {
          title: "Position values compared",
          css: `/* static (default): in normal flow, top/right/bottom/left ignored */
.static { position: static; }

/* relative: in normal flow, offset relative to its own normal position */
.relative { position: relative; top: 10px; left: 20px; }

/* absolute: removed from flow, positioned relative to nearest positioned ancestor */
.parent { position: relative; } /* establishes containing block */
.tooltip {
  position: absolute;
  top: 100%;  /* below the parent */
  left: 0;
}

/* fixed: removed from flow, positioned relative to the viewport */
.sticky-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

/* sticky: in flow until it hits scroll threshold, then sticks */
.section-header {
  position: sticky;
  top: 64px; /* sticks 64px from viewport top */
}`,
        },
        {
          title: "Stacking context and z-index",
          css: `/* z-index only works on positioned elements (not static) */
.popover {
  position: absolute; /* required */
  z-index: 50;
}

/* What creates a new stacking context:
   - position: relative/absolute/fixed/sticky + z-index (other than auto)
   - opacity < 1
   - transform, filter, perspective (any value)
   - will-change: transform
   - isolation: isolate (explicit stacking context)
*/

/* Isolate a component's stacking context to prevent z-index conflicts */
.modal-container {
  isolation: isolate; /* children's z-index stays within this context */
}`,
        },
      ],
      commonMistakes: [
        "Forgetting to add position: relative to a parent before using position: absolute on a child — the child escapes to the nearest positioned ancestor (or viewport)",
        "Using z-index on statically positioned elements — it has no effect",
        "Fighting z-index wars (z-index: 9999) instead of understanding stacking context",
        "Using position: fixed for sticky nav without accounting for it covering page content — add padding-top to <body>",
        "Not knowing that opacity: 0.99 creates a stacking context — can cause unexpected z-index behaviour",
      ],
      interviewTips: [
        "The containing block for position: absolute is the nearest ancestor with position other than static. 'Nearest positioned ancestor' is the key phrase.",
        "Stacking contexts are the real z-index system. A z-index: 9999 inside a stacking context with z-index: 1 will still render below a z-index: 2 in the parent context.",
        "position: sticky requires a defined top/bottom/left/right to work. It also requires a scrollable ancestor — it won't stick if the parent is overflow: hidden.",
      ],
      practiceTasks: [
        {
          description:
            "Build a card with a positioned badge in the top-right corner. The badge should be absolutely positioned relative to the card, not the page.",
          hint: "Set position: relative on the card. The badge gets position: absolute; top: -8px; right: -8px.",
        },
        {
          description:
            "Implement a sticky navigation bar. Verify it works correctly even when the page content is taller than the viewport.",
          hint: "Add top: 0 to position: sticky. Verify with position: sticky — not fixed — so it only sticks while in its parent's scroll area.",
        },
      ],
    },
    {
      id: "stacking-context-debugging",
      moduleId: "display-positioning",
      title: "Stacking Context & z-index Debugging",
      summary:
        "Most z-index bugs are not really about larger numbers. They are about the wrong stacking context, the wrong containing block, or the wrong clipping ancestor.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Explain why z-index only competes inside the same stacking context",
        "Recognize common stacking-context creators like transform, opacity, filter, and isolation",
        "Debug overflow clipping separately from stacking order issues",
        "Use DevTools to inspect computed positioning, overflow, and layering",
        "Follow a repeatable debugging checklist instead of guessing magic numbers",
      ],
      codeExamples: [
        {
          title: "A classic stacking-context trap",
          css: `.page-header {
  position: relative;
  z-index: 10;
}

.card {
  position: relative;
  transform: translateZ(0); /* creates a new stacking context */
}

.popover {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 9999;
}

/* The popover can still render under .page-header because it is trapped
   inside .card's stacking context. */`,
        },
        {
          title: "Overflow clipping is a different problem",
          css: `.panel {
  position: relative;
  overflow: hidden;
}

.tooltip {
  position: absolute;
  top: -8px;
  right: 0;
  z-index: 50;
}

/* If the tooltip is clipped, z-index is not the fix.
   The clipping ancestor is the fix. */`,
        },
      ],
      commonMistakes: [
        "Raising z-index repeatedly without checking whether the element is trapped in a lower stacking context",
        "Forgetting that transform and opacity can create stacking contexts even without explicit z-index values",
        "Trying to solve overflow clipping by increasing z-index",
        "Using position: fixed inside transformed ancestors and expecting viewport-like behavior",
        "Debugging layered UI purely by intuition instead of inspecting ancestors in DevTools",
      ],
      interviewTips: [
        "A strong debugging answer is: find the positioned ancestor, then the stacking context, then any clipping ancestor.",
        "z-index is local, not global. Saying that clearly usually impresses interviewers.",
        "When a tooltip or popover is trapped, the best fix is often architectural: remove the accidental context or render the layer higher in the DOM.",
      ],
      practiceTasks: [
        {
          description:
            "Build a dropdown that renders underneath a sticky header by mistake, then debug it until the layering is correct without absurd z-index values.",
          hint: "Inspect each ancestor for transform, opacity, isolation, and explicit z-index.",
        },
        {
          description:
            "Create a tooltip that gets clipped by overflow: hidden and fix the actual root cause.",
          hint: "A larger z-index does not beat clipping.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "sticky-header",
      moduleId: "display-positioning",
      title: "Sticky Header & Tooltip",
      difficulty: "medium",
      description:
        "Build a page with a sticky navigation header and a tooltip component. Both require correct use of positioning and z-index.",
      targetImage: {
        src: "/wf-challenges/sticky-header-tooltip.svg",
        alt: "Page mock with a sticky top navigation bar, hovered tooltip over one nav item, and long scrolling content cards below.",
        caption:
          "Read the mock as two positioning problems layered together: a sticky shell at the top and an absolutely positioned tooltip inside it.",
      },
      requirements: [
        "Navigation header uses position: sticky (not fixed)",
        "Header remains visible while scrolling through long content",
        "At least one nav item has a tooltip that appears on hover",
        "Tooltip uses position: absolute relative to its parent nav item",
        "Z-index is set correctly so the tooltip renders above all content",
        "Page has enough content to demonstrate sticky scrolling behaviour",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sticky Header</title>
</head>
<body>
  <nav>
    <!-- Navigation items + tooltip trigger here -->
  </nav>
  <main>
    <!-- Enough content to make the page scrollable -->
  </main>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }`,
      expectedResult:
        "The navigation header sticks to the top of the viewport as the user scrolls. The tooltip appears above the nav item content on hover without affecting layout. Z-index is managed correctly.",
      hints: [
        "position: sticky requires top: 0 to know when to start sticking.",
        "The tooltip's parent needs position: relative to be the containing block.",
        "Show/hide the tooltip with visibility: hidden and opacity: 0 in default state, switching to visible/opacity: 1 on parent:hover.",
      ],
      bonusTasks: [
        "Add a CSS transition to the tooltip appearance",
        "Make the header shrink (smaller padding, smaller logo) after the user scrolls down 50px using a JavaScript scroll listener + CSS class toggle",
        "Add a 'back to top' button that's fixed in the bottom-right corner",
      ],
      conceptsCovered: [
        "positioning",
        "z-index",
        "stacking-context",
        "display-types",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "display-types": () => (
    <>
      <p>
        The <code>display</code> property controls two things: how an element
        participates in the <em>outer</em> layout (how it interacts with
        siblings and parent), and how it creates an <em>inner</em> formatting
        context for its children. Block elements always start on a new line and
        stretch to fill their container&apos;s width. Inline elements flow
        within text — they can&apos;t have explicit widths or heights, and
        vertical margin/padding is ignored for layout purposes (it doesn&apos;t
        push other elements away).
      </p>
      <p>
        <code>inline-block</code> is a hybrid: it flows like an inline element
        (sits in a line with siblings) but respects <code>width</code>,{" "}
        <code>height</code>, and vertical margin/padding like a block element.
        It was commonly used for horizontal navigation items before flexbox
        existed. Today, flexbox and grid handle most cases more cleanly, but{" "}
        <code>inline-block</code> still has uses — particularly when elements
        need to flow with text.
      </p>
      <p>
        The three &quot;hiding&quot; approaches have meaningfully different
        behaviour. <code>display: none</code> removes the element from the
        layout entirely — it takes no space and is removed from the
        accessibility tree. <code>visibility: hidden</code> makes the element
        invisible but preserves its space — the element is still in the DOM and
        accessibility tree (it can be focused by keyboard).{" "}
        <code>opacity: 0</code> makes the element fully transparent while
        preserving both space and interactivity — pointer events still fire. Use{" "}
        <code>pointer-events: none</code> alongside it if you don&apos;t want
        that.
      </p>
      <p>
        A useful mental model is that <code>display</code> controls layout
        participation before you worry about visual styling. If an element
        should behave like a paragraph, a row, a grid, or not exist in layout at
        all, <code>display</code> is the first lever. Many layout bugs come from
        trying to solve a display problem with margin, width, or positioning
        instead.
      </p>
      <p>
        Interviews often use display questions to test whether you understand
        historical CSS tradeoffs. Being able to explain why{" "}
        <code>inline-block</code> used to matter, and why flexbox largely
        replaced it for UI layout, is a strong sign that you understand both
        modern CSS and where its abstractions came from.
      </p>
    </>
  ),

  positioning: () => (
    <>
      <p>
        Normal flow is the default — block elements stack vertically, inline
        elements flow horizontally within their line. Positioning allows
        elements to step outside this flow. <code>position: relative</code>{" "}
        keeps the element in normal flow but lets you shift it visually using{" "}
        <code>top</code>/<code>right</code>/<code>bottom</code>/
        <code>left</code> offsets — the space the element would have occupied is
        still reserved. More importantly, it establishes a{" "}
        <em>containing block</em> for any absolutely positioned descendants.
      </p>
      <p>
        <code>position: absolute</code> removes the element from normal flow
        entirely — it no longer occupies space, and sibling elements behave as
        if it doesn&apos;t exist. The element is positioned relative to its
        nearest ancestor with a position value other than <code>static</code>.
        If none exists, it positions relative to the initial containing block
        (the viewport). <code>position: fixed</code> behaves similarly but is
        always relative to the viewport and stays in place during scroll.
        <code>position: sticky</code> is a hybrid: the element stays in normal
        flow until it reaches a defined scroll threshold, then
        &quot;sticks&quot; — it effectively becomes fixed within its scrolling
        container.
      </p>
      <p>
        <code>z-index</code> controls stacking order, but only on{" "}
        <em>positioned</em> elements (anything other than <code>static</code>).
        Understanding stacking contexts is essential: certain CSS properties
        (transform, opacity less than 1, filter, will-change, isolation:
        isolate) create a new stacking context, and <code>z-index</code> values
        only compete within the same stacking context. A
        <code>z-index: 9999</code> inside a low-priority stacking context will
        still render behind a <code>z-index: 1</code> element outside it.
      </p>
      <p>
        Sticky positioning deserves special respect because it depends on both
        the scroll container and the element&apos;s containing block. It only
        works when you provide an offset like <code>top: 0</code>, and it often
        appears &quot;broken&quot; when an ancestor has overflow clipping or
        when the sticky element has no room to move inside its parent.
        That&apos;s why sticky bugs are usually layout-chain bugs, not just
        missing classes.
      </p>
      <p>
        In interviews, a very strong explanation distinguishes three things
        clearly: relative creates a containing block, absolute exits normal flow
        and positions against that containing block, and sticky behaves like
        normal flow until the scroll threshold is reached. If you can explain
        that without hand-waving, you usually understand positioning well enough
        to debug real UIs.
      </p>
    </>
  ),

  "stacking-context-debugging": () => (
    <>
      <p>
        A stacking context is a self-contained layering universe. Children can
        compete with one another inside it using <code>z-index</code>, but they
        cannot leap out and compete directly with elements in other contexts.
        That is why <code>z-index: 9999</code> sometimes appears broken: the
        number is large, but it is still trapped in the wrong context.
      </p>
      <p>
        The trap is that stacking contexts are created by more than positioned
        elements with z-index. <code>transform</code>,{" "}
        <code>opacity &lt; 1</code>, <code>filter</code>,{" "}
        <code>will-change</code>, and <code>isolation: isolate</code> can all
        create them. Teams often add one of those properties for performance or
        visual polish and accidentally change layering behavior at the same
        time.
      </p>
      <p>
        Layering bugs usually become obvious when you ask three questions in
        order: what is the containing block, what stacking context is this
        element in, and is any ancestor clipping it with overflow? Those
        questions map to different categories of bugs, which is why they are
        more reliable than trial-and-error z-index changes.
      </p>
      <p>
        In interviews, narrating that process is often more impressive than
        jumping straight to a fix. It shows that you can debug unfamiliar UI
        methodically instead of relying on luck or memorized snippets.
      </p>
    </>
  ),
};
