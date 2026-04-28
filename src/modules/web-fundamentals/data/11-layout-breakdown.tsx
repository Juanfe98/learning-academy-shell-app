import type { LearningModule } from "./types";

export const layoutBreakdown: LearningModule = {
  id: "layout-breakdown",
  title: "Layout Breakdown & Content Modeling",
  description:
    "Learn how to read a mockup, identify the underlying content model, choose semantic HTML, and decide when layout should be flow, list, table, flexbox, or grid.",
  icon: "🧭",
  order: 10,
  estimatedHours: 4,
  lessons: [
    {
      id: "layout-breakdown-mental-model",
      moduleId: "layout-breakdown",
      title: "Layout Breakdown Mental Model",
      summary:
        "Before flexbox or grid, there is analysis. This lesson teaches the sequence for turning a screenshot into regions, relationships, and implementation decisions.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Break any UI into major regions before thinking about details",
        "Separate page-shell problems from component-internal alignment problems",
        "Identify repeated patterns, scanning axes, and spacing systems",
        "Distinguish content structure from visual decoration",
        "Create an implementation plan before touching CSS",
      ],
      codeExamples: [
        {
          title: "A plain-language breakdown before code",
          description: "Good layout work usually starts as notes, not CSS.",
          html: `Mock: analytics dashboard

1. Big regions
- top header
- left navigation rail
- main content area
- optional right summary column

2. Inside main
- hero summary card
- repeated stat cards
- lower two-column content region

3. Likely layout tools
- outer shell: CSS Grid
- repeated stat row: Grid or Flex depending on wrapping requirement
- content inside each card: Flexbox / normal flow

4. Semantic landmarks
- header, nav, main, aside, section

5. Responsive changes
- sidebar may collapse
- card row may auto-fit
- right summary panel may stack below main`,
        },
        {
          title: "From rectangles to HTML skeleton",
          html: `<div class="app-shell">
  <header>...</header>
  <nav>...</nav>
  <main>
    <section class="hero-summary">...</section>
    <section class="stats-grid">...</section>
    <section class="content-grid">
      <section>...</section>
      <aside>...</aside>
    </section>
  </main>
</div>`,
          css: `/* Only after the structure is clear should layout rules appear. */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "nav header"
    "nav main";
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}`,
        },
      ],
      commonMistakes: [
        "Starting with typography, shadows, or colors before the geometry is stable",
        "Treating every arrangement as a flexbox problem even when two-dimensional placement is the real issue",
        "Ignoring repeated patterns and reinventing markup for visually similar items",
        "Making semantic decisions based on appearance instead of content meaning",
        "Trying to solve page shell and component layout with a single CSS rule",
      ],
      interviewTips: [
        "Say the big rectangles out loud first. Interviewers want to hear your decomposition process.",
        "A useful sentence starter is: 'I see one page-shell problem and two component-level layout problems.'",
        "If you can describe the responsive collapse before coding, you usually understand the structure well enough.",
      ],
      practiceTasks: [
        {
          description:
            "Take three screenshots from products you use and write only the region breakdown, no code. Name the landmarks, repeated groups, and likely layout tools.",
          hint: "Start from the largest rectangles and only then move inward.",
        },
        {
          description:
            "For a dashboard mock, write two plans: one rushed plan and one disciplined breakdown plan. Compare the quality of the resulting HTML.",
          hint: "The better plan usually names content types, not just CSS properties.",
        },
      ],
    },
    {
      id: "choosing-semantic-patterns",
      moduleId: "layout-breakdown",
      title: "Choosing Semantic Patterns",
      summary:
        "Many layout mistakes begin as HTML mistakes. Learn how to identify when content is really a list, a table, an article, a form, a nav, a description list, or just a layout wrapper.",
      estimatedMinutes: 40,
      learningObjectives: [
        "Choose tables only for true row/column comparison data",
        "Choose lists for repeated sibling items, menus, feeds, and grouped options",
        "Choose description lists for label/value summaries and metadata",
        "Recognize when landmarks like nav, main, aside, and section should appear",
        "Avoid div-soup when the HTML already has a better element",
      ],
      codeExamples: [
        {
          title: "Table vs list vs description list",
          html: `<!-- TABLE: use for relational row/column data -->
<table>
  <caption>Plan comparison</caption>
  <thead>
    <tr>
      <th scope="col">Plan</th>
      <th scope="col">Seats</th>
      <th scope="col">Support</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Starter</th>
      <td>5</td>
      <td>Email</td>
    </tr>
  </tbody>
</table>

<!-- LIST: repeated siblings with the same structure -->
<ul class="feature-cards">
  <li>...</li>
  <li>...</li>
  <li>...</li>
</ul>

<!-- DESCRIPTION LIST: label/value metadata -->
<dl>
  <dt>Status</dt>
  <dd>In review</dd>
  <dt>Owner</dt>
  <dd>Maya Chen</dd>
</dl>`,
        },
        {
          title: "A quick content-classification checklist",
          html: `Question 1: Is the user comparing values across rows and columns?
-> Use a table.

Question 2: Is this a repeated collection of peer items?
-> Usually a list.

Question 3: Is this metadata in label/value pairs?
-> Often a description list.

Question 4: Is this a self-contained piece of content?
-> Maybe article.

Question 5: Is this just a grouping wrapper for layout?
-> A div is fine if no semantic element fits better.`,
        },
      ],
      commonMistakes: [
        "Replacing semantic tables with div grids because tables feel old-fashioned",
        "Using a table for card layouts that are not truly tabular data",
        "Using paragraphs or divs for metadata pairs that would read better as a description list",
        "Forgetting that nav is not 'a thing that looks horizontal' but a region of navigation links",
        "Using ul for everything without asking whether the content is actually relational data",
      ],
      interviewTips: [
        "A strong answer includes both semantics and UX: 'I’d keep this as a table because the user is scanning by row and column.'",
        "When in doubt, ask what the screen reader should announce and how a keyboard user would navigate the structure.",
        "Explain the content model first and the CSS second. That signals maturity.",
      ],
      practiceTasks: [
        {
          description:
            "Collect five UIs and label each repeated region as table, list, description list, article, nav, or generic wrapper.",
          hint: "If you use 'div' as your first answer for everything, you’re probably skipping the content question.",
        },
        {
          description:
            "Take one fake comparison page and build it twice: once as a semantic table, once as card divs. Compare which version preserves the real data relationships better.",
          hint: "Look especially at how headers and row names are represented.",
        },
      ],
    },
    {
      id: "choosing-layout-tools",
      moduleId: "layout-breakdown",
      title: "Choosing Between Flow, Flexbox, Grid, and Table Layout",
      summary:
        "This lesson is about choosing the right layout primitive for the job. Not every row is flex, not every screen is grid, and not every structured block should stop being a table just because you can style divs.",
      estimatedMinutes: 40,
      learningObjectives: [
        "Use normal flow when the content should naturally stack",
        "Use Flexbox for one-dimensional alignment and distribution",
        "Use Grid for two-dimensional placement and repeated tracks",
        "Preserve semantic tables when the content is tabular",
        "Spot when nested layout tools are the cleanest solution",
      ],
      codeExamples: [
        {
          title: "Decision heuristics",
          css: `/* Normal flow: default stacking of prose, forms, and document sections */
article > section + section {
  margin-top: 2rem;
}

/* Flexbox: align items along one axis */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Grid: place regions in rows and columns */
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 1.5rem;
}

/* Table stays a table when row/column relationships matter */
.comparison-wrapper {
  overflow-x: auto;
}`,
        },
        {
          title: "One screen, multiple layout tools",
          html: `<main class="page-grid">
  <section class="article-column">
    <article>Long-form content...</article>
  </section>

  <aside class="sidebar">
    <ul class="related-links">...</ul>
  </aside>
</main>`,
          css: `.page-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 2rem;
}

.related-links {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}`,
        },
      ],
      commonMistakes: [
        "Forcing Grid where normal flow and spacing would be simpler",
        "Using Flexbox for asymmetric dashboard shells that are easier to reason about in Grid",
        "Using Grid inside every component even when all you need is a row with center alignment",
        "Destroying semantic table markup on mobile instead of adding a scroll container",
        "Thinking in terms of favorite properties instead of structural constraints",
      ],
      interviewTips: [
        "A good answer sounds like: 'Grid for the shell, flex inside the cards, flow for the article body.'",
        "When you choose a tool, mention the shape of the problem: one-dimensional vs two-dimensional vs relational data.",
        "Nested layout systems are normal. Cleanly scoped layout is a strength, not a smell.",
      ],
      practiceTasks: [
        {
          description:
            "Take one real product page and label each region as normal flow, flexbox, grid, or preserved table.",
          hint: "Do not allow yourself to label everything 'flexbox'.",
        },
        {
          description:
            "Build the same dashboard shell once with Grid and once with nested Flexbox. Compare readability and changeability.",
          hint: "Notice which version better expresses the rows/columns of the page.",
        },
      ],
    },
    {
      id: "mock-to-build-plan",
      moduleId: "layout-breakdown",
      title: "From Mock to Build Plan",
      summary:
        "Turn a screenshot into a written implementation plan. This is the missing bridge between knowing CSS features and using them confidently under pressure.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Write a build order that starts with shell geometry and lands on detail polish",
        "Annotate a mock with regions, repeated units, and semantic choices",
        "Plan responsive collapse before implementation",
        "Identify risky areas like overflow, truncation, and dense data early",
        "Explain tradeoffs in a way that interviewers can follow",
      ],
      codeExamples: [
        {
          title: "A build order template",
          html: `1. Identify landmarks and content types.
2. Write the HTML skeleton without utility classes.
3. Build the page shell with Grid or Flexbox.
4. Add component-level internal layout.
5. Add responsive rules.
6. Handle overflow, truncation, and scroll regions.
7. Add visual polish last.`,
        },
        {
          title: "Annotating a risky layout",
          html: `Mock: data-dense comparison page

Risk notes:
- likely needs a real table
- narrow screens should scroll horizontally
- sticky header/first column is optional, not step one
- status icons need text alternatives
- the highlighted plan column is visual emphasis, not a structural change`,
        },
      ],
      commonMistakes: [
        "Treating responsiveness as an afterthought instead of part of the structure decision",
        "Ignoring overflow and truncation until the end",
        "Adding polish before confirming whether the semantic model is correct",
        "Writing code without a stated build order and getting lost in local fixes",
        "Collapsing complex screens into vague labels like 'a bunch of cards'",
      ],
      interviewTips: [
        "Writing your plan in comments is not wasted time. It often prevents bad markup.",
        "If the mock is complex, narrate your assumptions instead of pretending everything is obvious.",
        "A calm build order makes you look much stronger than fast random styling.",
      ],
      practiceTasks: [
        {
          description:
            "Take a mock and write a seven-step build plan before you code. Then compare it to the final implementation and refine the plan template.",
          hint: "Your plan should mention semantics, shell layout, component layout, and responsive adjustments.",
        },
        {
          description:
            "Practice saying your breakdown out loud in under 90 seconds as if you were in an interview.",
          hint: "Aim for: landmarks, content model, layout tools, responsive collapse, known risks.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "table-vs-list-decision",
      moduleId: "layout-breakdown",
      title: "Table vs List vs Description List",
      difficulty: "medium",
      description:
        "You are given one mock and need to choose the right semantic pattern for each region before styling. This challenge is about the HTML decision itself, not about visual polish.",
      targetImage: {
        src: "/wf-challenges/table-vs-list-decision.svg",
        alt: "Interface mock with a plan comparison region, metadata summary block, and repeated related-item cards.",
        caption:
          "The point is not to style all three regions the same. Each one implies a different content model and should lead to a different HTML structure.",
      },
      requirements: [
        "Build the comparison region as a real table if the content is relational row/column data",
        "Build the metadata summary as a description list if it represents label/value pairs",
        "Build the repeated related resources as a list of peer items",
        "Add a short comment above each region explaining why that semantic pattern was chosen",
        "Do not replace everything with generic divs",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Table vs List Decision</title>
</head>
<body>
  <!-- Build three regions here:
       1. comparison data
       2. metadata summary
       3. related resources -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A semantically differentiated page where each region reflects the underlying content model instead of sharing one generic wrapper pattern.",
      hints: [
        "Ask how a screen reader should announce the structure of each region.",
        "Repeated cards are not automatically tables. Tables are for relationships across both rows and columns.",
        "Description lists are often the best answer for compact summaries like status, owner, date, and environment.",
      ],
      bonusTasks: [
        "Add styling that makes each structure visually clear without changing its semantics",
        "Wrap the table in a horizontal scroll region for narrow screens",
        "Add a caption to the table and a heading for each region",
      ],
      conceptsCovered: [
        "semantic-patterns",
        "lists-and-tables",
        "interactive-semantics",
        "layout-breakdown",
      ],
    },
    {
      id: "annotate-dashboard-regions",
      moduleId: "layout-breakdown",
      title: "Annotate a Dashboard Before Coding",
      difficulty: "easy",
      description:
        "Practice the discipline of writing a region-by-region breakdown before implementation. The goal is to stop guessing and start naming the actual layout problems.",
      targetImage: {
        src: "/wf-challenges/annotate-dashboard-regions.svg",
        alt: "Dashboard mock with header, left navigation, KPI cards, chart area, and right summary panel.",
        caption:
          "Treat the image like an interview prompt. Your first deliverable is not CSS; it is a clear analysis of the page shell, repeated units, and internal alignment problems.",
      },
      requirements: [
        "Write a plain-language breakdown of the major regions before adding any CSS",
        "Name which parts are page shell vs component internals",
        "Choose where Grid, Flexbox, and normal flow will be used",
        "Use semantic landmarks like header, nav, main, aside, and section where appropriate",
        "Build a grayscale shell version before adding visual styling",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Annotate Dashboard Regions</title>
</head>
<body>
  <!-- 1. Write your region notes here.
       2. Build the structural shell.
       3. Add light styling only after the geometry is correct. -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A structured shell with a written breakdown that demonstrates deliberate planning instead of trial-and-error styling.",
      hints: [
        "Start with the biggest rectangles.",
        "Repeated KPI cards often belong to a nested grid inside a larger page grid.",
        "If you can’t explain the layout in words, pause before coding.",
      ],
      bonusTasks: [
        "Add comments explaining your responsive collapse strategy",
        "Create a second HTML outline using worse semantics and explain why it is worse",
        "Time-box yourself to 10 minutes for the shell only",
      ],
      conceptsCovered: [
        "layout-breakdown",
        "css-grid",
        "flexbox",
        "semantic-html",
      ],
    },
    {
      id: "div-soup-to-semantics",
      moduleId: "layout-breakdown",
      title: "Refactor Div Soup Into Semantic Structure",
      difficulty: "medium",
      description:
        "You start with intentionally vague HTML. Refactor it into meaningful structure before styling so the CSS has something stable to attach to.",
      requirements: [
        "Replace generic wrappers with meaningful elements where appropriate",
        "Introduce a clear heading hierarchy",
        "Use a list, nav, or sectioning elements where the content demands them",
        "Keep only the divs that are truly layout-only wrappers",
        "Add comments explaining two of the most important semantic upgrades",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Div Soup Refactor</title>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="title">Project Workspace</div>
      <div class="links">
        <div>Overview</div>
        <div>Files</div>
        <div>People</div>
      </div>
    </div>

    <div class="content">
      <div class="left">
        <div class="box">
          <div class="heading">Recent Updates</div>
          <div class="row">Update 1</div>
          <div class="row">Update 2</div>
          <div class="row">Update 3</div>
        </div>
      </div>

      <div class="right">
        <div class="small">Owner</div>
        <div class="small">Maya Chen</div>
        <div class="small">Status</div>
        <div class="small">In review</div>
      </div>
    </div>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A semantically upgraded document whose structure is easier to navigate, understand, and style than the original div-only version.",
      hints: [
        "A set of major navigation links should usually become a nav region containing a list.",
        "Label/value metadata often fits a description list better than a pile of divs.",
        "Do not remove every div. Keep the ones that exist only to help layout.",
      ],
      bonusTasks: [
        "Add ARIA only where native HTML does not already solve the problem",
        "Add a main landmark and an aside if the content split supports it",
        "Style the result as a two-column workspace layout",
      ],
      conceptsCovered: [
        "semantic-html",
        "interactive-semantics",
        "lists-and-tables",
        "content-modeling",
      ],
    },
    {
      id: "settings-page-breakdown",
      moduleId: "layout-breakdown",
      title: "Settings Page Information Architecture",
      difficulty: "medium",
      description:
        "Build a settings screen where the hard part is grouping and structure. This challenge tests whether you can organize dense UI into sections, forms, lists, and supporting side content.",
      targetImage: {
        src: "/wf-challenges/settings-page-breakdown.svg",
        alt: "Settings page mock with left section navigation, central grouped forms, and a right help or status panel.",
        caption:
          "Think beyond columns. This screen contains navigation structure, grouped form sections, helper content, and distinct save areas.",
      },
      requirements: [
        "Use a navigation structure for the settings section list",
        "Use forms, fieldsets, and legends where grouped controls belong together",
        "Separate the main editable content from supporting helper or status content",
        "Choose whether the save summary belongs in the main flow or an aside and justify the choice in a comment",
        "Use headings and sections to make the screen scannable",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Settings Page Breakdown</title>
</head>
<body>
  <!-- Build the information architecture and layout shell for a settings screen -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A settings page with clear information architecture: section nav, grouped form content, and supporting context placed intentionally.",
      hints: [
        "This is likely a shell grid plus normal-flow form sections inside the main column.",
        "Section navigation often wants a list inside a nav, even when it looks like pills.",
        "Not every right-hand panel is just decorative. Ask whether it is supporting content, status, or actions.",
      ],
      bonusTasks: [
        "Make the section nav sticky on desktop",
        "Add a mobile layout where the nav moves above the form content",
        "Use a description list for a compact account summary panel",
      ],
      conceptsCovered: [
        "layout-breakdown",
        "form-basics",
        "interactive-semantics",
        "semantic-html",
      ],
    },
    {
      id: "comparison-page-content-model",
      moduleId: "layout-breakdown",
      title: "Comparison Page Content Model",
      difficulty: "hard",
      description:
        "You need to build a comparison page without flattening everything into generic cards. Decide what is truly tabular, what is supporting prose, and what should remain a list of features or FAQs.",
      targetImage: {
        src: "/wf-challenges/comparison-page-content-model.svg",
        alt: "Comparison page mock with plan matrix, feature explanation cards, FAQ list, and call-to-action footer.",
        caption:
          "This screen mixes multiple content models. A good breakdown preserves those differences instead of forcing a single layout pattern everywhere.",
      },
      requirements: [
        "Use a real table for the plan matrix",
        "Use lists or sections for repeated feature explanation cards",
        "Use an FAQ structure that preserves heading and disclosure semantics",
        "Build the overall page shell so these content types feel like one page without becoming one giant grid",
        "Write comments explaining the semantic boundary between the table region and the marketing-style content regions",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comparison Page Content Model</title>
</head>
<body>
  <!-- Build a mixed-content comparison page here -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #fff; color: #0f172a; }`,
      expectedResult:
        "A mixed-content page where the table remains a table, the supporting regions stay semantically appropriate, and the layout expresses their different jobs clearly.",
      hints: [
        "One page can contain both a table and multiple list/section regions. That is often the right answer.",
        "Do not destroy table structure just to make the whole page feel visually uniform.",
        "Content modeling comes before design consistency tricks.",
      ],
      bonusTasks: [
        "Add a sticky table header",
        "Wrap the FAQ in details/summary for native disclosure behavior",
        "Add a mobile scroll region around the table with an accessible label",
      ],
      conceptsCovered: [
        "lists-and-tables",
        "layout-breakdown",
        "semantic-html",
        "responsive-design",
      ],
    },
    {
      id: "kanban-board-breakdown",
      moduleId: "layout-breakdown",
      title: "Kanban Board Breakdown",
      difficulty: "hard",
      description:
        "This challenge is about repeated columns, repeated cards, and nested alignment. Practice deciding what the page shell is, what the repeated units are, and which content should stay as lists.",
      targetImage: {
        src: "/wf-challenges/kanban-board-breakdown.svg",
        alt: "Kanban-style board mock with top toolbar, horizontally arranged columns, stacked cards inside each column, and small metadata chips.",
        caption:
          "A board like this often tempts people to overcomplicate the HTML. Keep the content model clear: the board has columns, and each column usually contains a list of cards.",
      },
      requirements: [
        "Represent each board column as a clear region with a heading",
        "Use a list structure for stacked cards within a column",
        "Choose an outer layout approach for the board itself and justify it in a comment",
        "Preserve the repeated pattern across columns instead of hand-building each one differently",
        "Plan how the board should behave on narrower screens",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kanban Board Breakdown</title>
</head>
<body>
  <!-- Build a board layout with repeated columns and repeated cards -->
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }`,
      expectedResult:
        "A board structure that reads clearly in HTML, uses repeated column/card patterns consistently, and has an intentional plan for narrower widths.",
      hints: [
        "The board itself may be grid or horizontal flex depending on how you want columns to size and scroll.",
        "The cards inside each column are usually a list.",
        "Break the problem into toolbar, board, columns, and cards before writing CSS.",
      ],
      bonusTasks: [
        "Add horizontal scrolling for the board at smaller widths",
        "Add a sticky board header row",
        "Add visually hidden counts for each column heading",
      ],
      conceptsCovered: [
        "layout-breakdown",
        "lists-and-tables",
        "css-grid",
        "flexbox",
        "content-modeling",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "layout-breakdown-mental-model": () => (
    <>
      <p>
        Layout breakdown is the skill of turning a picture into a structure. A
        lot of frontend frustration comes from skipping this step and jumping
        straight into CSS. When that happens, you are styling guesses instead of
        implementing a plan. The browser then punishes you with weird spacing,
        awkward responsiveness, and markup that feels hard to change.
      </p>
      <p>
        A reliable breakdown starts with the biggest rectangles, not the
        smallest details. Ask what the outer shell is. Is there a page header, a
        sidebar, a main column, an aside, or a footer? Then go one level down:
        which of those regions contain repeated cards, stacked sections, or
        dense data? That sequence matters because page-shell problems are
        usually different from component-internal alignment problems.
      </p>
      <p>
        Another critical move is separating content structure from visual style.
        A thing may look like a card, but semantically it might be an article, a
        list item, or a table row. Rounded corners and shadows do not define the
        HTML. The content relationship does. When you learn to see that, mocks
        become much less intimidating.
      </p>
      <p>
        Under interview pressure, the goal is not to impress with fast CSS. The
        goal is to show that you can reduce ambiguity, choose a stable
        structure, and build in an order that avoids rework. That is exactly
        what a good layout breakdown does.
      </p>
    </>
  ),
  "choosing-semantic-patterns": () => (
    <>
      <p>
        Many layout decisions are secretly content decisions. If you misread the
        content model, you often end up with awkward CSS because the HTML is
        fighting the shape of the information. That is why the question is not
        just “how should this look?” but “what kind of thing is this?”.
      </p>
      <p>
        Tables are for relational data that users compare across rows and
        columns. Lists are for repeated peer items like nav links, activity
        entries, product cards, or checklist items. Description lists are for
        label/value summaries like owner, status, environment, or plan name.
        These are not interchangeable just because they can be styled to look
        similar.
      </p>
      <p>
        Strong semantics improve accessibility, maintainability, and even your
        own confidence while styling. Once you know something is a list of peer
        items, spacing and repeated card structure become clearer. Once you know
        something is a table, you stop trying to fake column relationships with
        random divs. Good HTML narrows the CSS problem.
      </p>
    </>
  ),
  "choosing-layout-tools": () => (
    <>
      <p>
        Layout tools are not competing religions. They solve different shapes of
        problems. Normal flow is excellent for document structure and stacked
        content. Flexbox shines when you are aligning and distributing things on
        one axis. Grid becomes valuable when rows and columns both matter at the
        same time. Tables remain correct when the data itself is tabular.
      </p>
      <p>
        A mature UI usually uses several of these together. A page shell may be
        Grid, a toolbar inside it may be Flexbox, the article body may stay in
        normal flow, and a comparison section may remain a semantic table. That
        mixture is not overengineering; it is accurate modeling.
      </p>
      <p>
        The fastest way to choose the right tool is to describe the problem in
        words. If you say “I need three regions in rows and columns,” that
        points toward Grid. If you say “I need these items aligned in a row with
        one pushed to the end,” that sounds like Flexbox. If you say “users are
        scanning values by row and column,” that should keep you in table land.
      </p>
    </>
  ),
  "mock-to-build-plan": () => (
    <>
      <p>
        Knowing the right HTML and CSS features is not enough if you cannot
        sequence the work. A build plan turns a mock into steps: identify
        landmarks, write the HTML skeleton, establish the page shell, solve
        component internals, handle responsiveness, then add polish. Without
        that order, complex screens quickly turn into local fixes and accidental
        markup.
      </p>
      <p>
        A good plan also calls out risks early. Dense comparison data probably
        needs a scroll region. Compact rows may need truncation and `min-width:
        0`. A sidebar might need a sticky strategy. If you notice those
        constraints during planning, implementation gets calmer and much more
        predictable.
      </p>
      <p>
        This is one of the most interview-transferable skills in frontend work.
        Even if you do not finish every pixel, a clear plan shows that you know
        how to approach unfamiliar layout problems professionally.
      </p>
    </>
  ),
};
