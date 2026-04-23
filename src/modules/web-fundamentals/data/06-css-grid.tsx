import type { LearningModule } from "./types";

export const cssGrid: LearningModule = {
  id: "css-grid",
  title: "CSS Grid",
  description:
    "The first CSS layout system designed explicitly for two dimensions. Grid handles rows and columns simultaneously — the tool for dashboards, galleries, and page-level layouts.",
  icon: "▦",
  order: 5,
  estimatedHours: 2,
  lessons: [
    {
      id: "grid-basics",
      moduleId: "css-grid",
      title: "CSS Grid Basics",
      summary:
        "Grid establishes a two-dimensional layout system with explicit columns and rows. The fr unit and grid-template-* are the foundation.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Define a grid with grid-template-columns and grid-template-rows",
        "Use the fr unit for flexible column sizing",
        "Use repeat() to avoid repetition",
        "Place items with grid-column and grid-row",
        "Name grid areas with grid-template-areas for readable layout",
      ],
      codeExamples: [
        {
          title: "Grid fundamentals",
          css: `.grid {
  display: grid;

  /* Three equal columns using fr (fractional) unit */
  grid-template-columns: 1fr 1fr 1fr;
  /* shorthand with repeat */
  grid-template-columns: repeat(3, 1fr);

  /* Mixed: fixed sidebar + flexible main */
  grid-template-columns: 280px 1fr;

  /* Rows */
  grid-template-rows: auto 1fr auto; /* header, main, footer */

  gap: 24px; /* or row-gap / column-gap separately */
}

/* Place a specific item */
.hero {
  grid-column: 1 / 3; /* span from line 1 to line 3 */
  /* or: grid-column: 1 / span 2 */
}

.sidebar {
  grid-row: 2 / 4; /* rows 2 through 4 */
}`,
        },
        {
          title: "Named grid areas (most readable pattern)",
          css: `.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 64px 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "sidebar footer";
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }`,
        },
      ],
      commonMistakes: [
        "Confusing fr with % — fr distributes the remaining free space after fixed sizes are subtracted; % is relative to the container including gap",
        "Using px for all rows when content varies — use auto or min-content/max-content so rows size to their content",
        "Forgetting that grid-template-areas requires every row to have the same number of cells",
        "Confusing grid line numbers (1-based, with negative values from the end) with item indices",
      ],
      interviewTips: [
        "fr is the unit for 'fraction of available space'. 1fr 2fr 1fr gives columns 25%, 50%, 25% of the free space. It's calculated after gaps and fixed sizes are removed.",
        "Named grid areas are the most readable pattern for page-level layouts — grid-template-areas reads like ASCII art of the layout. Reach for this on any 2+ region layout.",
        "Grid lines are numbered starting at 1 from the left (and top). Negative line numbers count from the right (-1 = last line). grid-column: 1 / -1 spans the full width.",
      ],
      practiceTasks: [
        {
          description:
            "Build a classic page layout (header, sidebar, main content, footer) using grid-template-areas. The sidebar should be 260px; everything else flexible.",
          hint: "Use grid-template-areas with four named areas. Use min-height: 100vh on the grid container.",
        },
        {
          description:
            "Create a three-column photo grid where the first item spans all three columns. Use grid-column.",
          hint: "grid-column: 1 / -1 spans from the first line to the last, regardless of how many columns there are.",
        },
      ],
    },
    {
      id: "grid-advanced",
      moduleId: "css-grid",
      title: "Auto-Placement & Responsive Grids",
      summary:
        "auto-fit and auto-fill with minmax() create fully responsive grids with no media queries. Understanding implicit vs explicit grid unlocks powerful patterns.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Know the difference between auto-fit and auto-fill",
        "Use minmax() for flexible minimum/maximum track sizing",
        "Understand implicit grid tracks created by overflow items",
        "Build a responsive card grid with zero media queries",
        "Use grid-auto-flow: dense for compact auto-placement",
      ],
      codeExamples: [
        {
          title: "Responsive card grid (no media queries needed)",
          css: `.card-grid {
  display: grid;
  /* auto-fill: creates as many columns as fit, preserves empty tracks */
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /* auto-fit: same but collapses empty tracks, stretching items */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

/* Result: fills the row with as many 280px+ columns as fit
   On a 1200px container: ~3-4 columns
   On a 600px container: ~2 columns
   On a 300px container: 1 column
   No media queries needed! */`,
        },
        {
          title: "Implicit grid and grid-auto-rows",
          css: `.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* Explicit rows: only the first two */
  grid-template-rows: 200px 200px;

  /* Additional items create implicit rows — set their height */
  grid-auto-rows: 200px;

  gap: 16px;
}

/* Dense packing: fill gaps when items span multiple cells */
.masonry-like {
  grid-auto-flow: dense;
}

.wide-item {
  grid-column: span 2; /* takes 2 of 3 columns */
}
/* With dense: the next single-cell item backfills the gap */`,
        },
      ],
      commonMistakes: [
        "Using auto-fill when you want items to stretch (use auto-fit) — auto-fill keeps empty tracks at the end, auto-fit collapses them",
        "Setting minmax(0, 1fr) instead of minmax(min-content, 1fr) — can cause items to become too narrow",
        "Not setting grid-auto-rows when using auto-fill — implicit rows default to auto height and can be unexpectedly small",
        "Forgetting that grid-template-areas works with implicit tracks — items without an explicit area go into the implicit grid",
      ],
      interviewTips: [
        "The repeat(auto-fit, minmax(280px, 1fr)) pattern is a frequently asked 'how do you do responsive grids' answer. Know it cold.",
        "auto-fit vs auto-fill: with 3 items in a 1200px container that fits 5: auto-fill shows 3 items + 2 empty tracks; auto-fit shows 3 stretched items.",
        "Grid items can be flex containers too — grid handles the 2D layout, flex handles the 1D content within each cell. This is a very common production pattern.",
      ],
      practiceTasks: [
        {
          description:
            "Build a responsive image gallery that automatically adjusts the number of columns based on viewport width with no media queries.",
          hint: "repeat(auto-fit, minmax(200px, 1fr)) — the minimum is the smallest comfortable image width.",
        },
        {
          description:
            "Build a dashboard grid with 4 stat cards, one wide chart card spanning 2 columns, and a full-width table. Use named grid areas.",
          hint: "Define your grid-template-areas first, then assign each component its area.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "dashboard-layout",
      moduleId: "css-grid",
      title: "Dashboard Grid Layout",
      difficulty: "hard",
      description:
        "Build a responsive dashboard layout using CSS Grid. The layout must work on both desktop (3-column grid) and mobile (single column) using a single grid definition and media queries.",
      requirements: [
        "Full-page grid: sidebar (240px), main content area, right panel (300px)",
        "Header spans all columns",
        "Sidebar spans the full height of the content area",
        "Main content area has a responsive card grid (auto-fit/minmax)",
        "Right panel contains a stacked list of items",
        "At < 768px: sidebar collapses, layout becomes single-column",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard</title>
</head>
<body>
  <div class="app">
    <header class="header">Dashboard</header>
    <nav class="sidebar">Sidebar</nav>
    <main class="main">
      <div class="card-grid">
        <div class="card">Card 1</div>
        <div class="card">Card 2</div>
        <div class="card">Card 3</div>
        <div class="card">Card 4</div>
      </div>
    </main>
    <aside class="panel">Right Panel</aside>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; min-height: 100vh; }`,
      expectedResult:
        "A complete dashboard layout where the header spans full width, sidebar sits on the left, main content fills the center, and a panel on the right. At mobile widths, the layout stacks vertically. The card grid inside main auto-adjusts columns.",
      hints: [
        "Use grid-template-areas for the outer layout — it makes the responsive changes much cleaner.",
        "For the responsive card grid inside main: repeat(auto-fit, minmax(200px, 1fr)).",
        "At mobile, redefine grid-template-areas with a single-column layout and hide the sidebar.",
      ],
      bonusTasks: [
        "Add sticky positioning to the sidebar so it stays in view while scrolling the main content",
        "Animate the sidebar slide in/out on mobile using transform and transition",
        "Add a CSS Grid-based footer that spans full width below all columns",
      ],
      conceptsCovered: ["grid-basics", "grid-advanced", "grid-template-areas", "responsive-design"],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "grid-basics": () => (
    <>
      <p>
        CSS Grid is the first layout system in CSS built explicitly for two-dimensional
        layouts. Unlike flexbox (which works along a single axis at a time), Grid lets you
        define both rows and columns simultaneously and place items into specific cells or
        regions. When you add <code>display: grid</code> to an element, it becomes a grid
        container and its direct children become grid items that are placed into the grid
        automatically or explicitly.
      </p>
      <p>
        The <strong>fr unit</strong> (fractional unit) is unique to Grid and distributes
        the remaining free space after fixed sizes and gaps are subtracted.{" "}
        <code>grid-template-columns: 1fr 2fr 1fr</code> creates three columns where the
        middle is twice as wide as the others. <code>repeat(3, 1fr)</code> is the shorthand
        for <code>1fr 1fr 1fr</code>. For mixed layouts, you can combine fixed and flexible
        values: <code>280px 1fr</code> creates a 280px sidebar and a flexible main area that
        takes the rest.
      </p>
      <p>
        Named grid areas (<code>grid-template-areas</code>) are the most readable way to
        define page-level layouts. You write the layout as an ASCII-art map in the CSS, then
        assign each element to its area with <code>grid-area</code>. A period{" "}
        (<code>.</code>) represents an empty cell. Every row must have the same number of
        cells, and named areas must be rectangular — you can&apos;t create L-shaped areas.
      </p>
      <p>
        Grid shines when the layout itself is the problem you are solving. If you know there
        are explicit regions — sidebar, header, content, filters, footer — Grid gives you a
        direct way to express that structure. Flexbox can fake some of these layouts, but it
        often becomes awkward because it is fundamentally solving a one-dimensional problem.
      </p>
      <p>
        A good interview answer usually contrasts Grid and Flexbox clearly: Grid for page and
        dashboard layouts where rows and columns both matter, Flexbox for rows, columns,
        navbars, and small component-level alignment. Saying &quot;Grid is two-dimensional,
        Flexbox is one-dimensional&quot; is the right starting point, but adding concrete UI
        examples makes the answer much stronger.
      </p>
    </>
  ),

  "grid-advanced": () => (
    <>
      <p>
        The most powerful responsive layout primitive in CSS is the combination of{" "}
        <code>repeat(auto-fit, minmax(280px, 1fr))</code>. This single declaration creates
        a grid that automatically determines how many columns to create based on the
        available width. Each column is at least 280px wide (the minimum) and grows to
        share available space equally (the maximum of 1fr). No media queries required —
        the layout adapts continuously as the viewport changes.
      </p>
      <p>
        The difference between <code>auto-fill</code> and <code>auto-fit</code> matters
        when there are fewer items than columns fit. <code>auto-fill</code> creates tracks
        for all the columns that would fit, even if they&apos;re empty — items don&apos;t
        stretch to fill. <code>auto-fit</code> collapses empty tracks after the last item,
        letting the remaining items stretch. For most card grids, <code>auto-fit</code> is
        what you want.
      </p>
      <p>
        Grid distinguishes between <em>explicit</em> tracks (defined in{" "}
        <code>grid-template-columns/rows</code>) and <em>implicit</em> tracks (created
        automatically when items overflow the explicit grid). You control the size of
        implicit tracks with <code>grid-auto-rows</code> and{" "}
        <code>grid-auto-columns</code>. The <code>grid-auto-flow: dense</code> property
        enables backfilling — if a large item leaves a gap, the algorithm tries to fill
        it with smaller items, creating a denser, Pinterest-style layout.
      </p>
      <p>
        This is one of the few places in CSS where you can write a highly responsive layout
        with almost no media queries. Instead of asking &quot;at which breakpoint do I want
        three columns?&quot; you can ask &quot;what is the minimum useful width of a card?&quot;
        and let Grid derive the column count from the available space.
      </p>
      <p>
        The downside is that Grid is so expressive that teams sometimes overuse it for simple
        alignment tasks. If you only need to line up a few controls in a single row, Grid is
        usually unnecessary. The best CSS developers choose Grid because the layout calls for
        it, not because it feels more advanced.
      </p>
    </>
  ),
};
