import type { LearningModule } from "./types";

export const cssFoundations: LearningModule = {
  id: "css-foundations",
  title: "CSS Foundations",
  description:
    "Selectors, the cascade, specificity, the box model, and custom properties — the four pillars that explain virtually every CSS 'bug' you'll ever encounter.",
  icon: "🎨",
  order: 2,
  estimatedHours: 2.5,
  lessons: [
    {
      id: "selectors-cascade",
      moduleId: "css-foundations",
      title: "Selectors, Cascade & Specificity",
      summary:
        "Most CSS bugs aren't bugs — they're specificity conflicts. Understanding how the cascade picks a winner is the single most valuable CSS concept to internalize.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Calculate specificity for any selector (inline > ID > class > element)",
        "Know the cascade order: origin, specificity, source order",
        "Use combinators (descendant, child, adjacent, general sibling) correctly",
        "Understand inherited vs non-inherited properties",
        "Know when (and when not) to use !important",
      ],
      codeExamples: [
        {
          title: "Specificity calculation",
          css: `/* Specificity: (0, 0, 0, 1) — one element */
p { color: black; }

/* Specificity: (0, 0, 1, 0) — one class */
.text { color: blue; }

/* Specificity: (0, 1, 0, 0) — one ID */
#headline { color: red; }

/* Specificity: (1, 0, 0, 0) — inline style wins over everything */
/* <p style="color: green"> */

/* Specificity: (0, 0, 1, 1) — class + element */
.article p { color: purple; }

/* Specificity: (0, 1, 1, 0) — ID + class */
#main .title { color: orange; }

/* !important overrides all specificity — last resort only */
.text { color: green !important; }`,
        },
        {
          title: "Combinators",
          css: `/* Descendant: any p inside .card, at any depth */
.card p { }

/* Child: only direct p children of .card */
.card > p { }

/* Adjacent sibling: the p immediately after an h2 */
h2 + p { }

/* General sibling: all p elements after an h2, same parent */
h2 ~ p { }

/* Pseudo-class: target first/last/nth child */
li:first-child { }
li:last-child { }
li:nth-child(odd) { }
li:not(.disabled) { }

/* Pseudo-element: create virtual elements */
p::first-line { }
.list-item::before { content: "→ "; }`,
        },
      ],
      commonMistakes: [
        "Reaching for !important to 'fix' a specificity conflict — it creates a specificity war that becomes unmaintainable",
        "Over-qualifying selectors: #nav .links a when .nav-link is sufficient",
        "Assuming the cascade is just 'last rule wins' — origin and specificity are evaluated first",
        "Not knowing which properties inherit (color, font-size, line-height) vs which don't (margin, padding, border, background)",
        "Using the universal selector (*) for performance-critical resets without understanding its cascade implications",
      ],
      interviewTips: [
        "Specificity is a 4-component tuple: (inline, ID, class/attribute/pseudo-class, element/pseudo-element). State this clearly in interviews — it's a differentiator.",
        "The cascade has three tiers, evaluated in order: 1) origin (browser default < author < author !important), 2) specificity, 3) source order. Most devs only know tier 3.",
        "Inheritance is separate from the cascade. Inherited properties flow down the DOM tree automatically. You can explicitly inherit with the inherit keyword or set all: unset to reset everything.",
      ],
      practiceTasks: [
        {
          description:
            "Write 5 selectors of increasing specificity targeting the same element. Observe which one wins. Verify your prediction by adding all 5 to a stylesheet.",
          hint: "Start with an element selector, then add a class, then an ID, then an inline style.",
        },
        {
          description:
            "Take a page with a specificity conflict (a style that should apply but doesn't). Fix it without using !important.",
          hint: "The fix is always to increase the specificity of the selector you want to win, or decrease the one you want to lose.",
        },
      ],
    },
    {
      id: "box-model",
      moduleId: "css-foundations",
      title: "The Box Model",
      summary:
        "Every HTML element is a rectangular box composed of content, padding, border, and margin. Mastering the box model is mastering layout.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Name the four areas of the CSS box model in order",
        "Explain the difference between content-box and border-box sizing",
        "Understand how vertical margin collapse works (and when it doesn't)",
        "Debug box model issues using browser DevTools",
        "Know that padding is inside the border; margin is outside",
      ],
      codeExamples: [
        {
          title: "content-box vs border-box",
          css: `/* Default: width = content only. Total = 200 + 40 + 4 = 244px */
.default {
  width: 200px;
  padding: 20px;   /* 20px left + 20px right = 40px */
  border: 2px solid; /* 2px left + 2px right = 4px */
  /* actual rendered width: 244px */
}

/* border-box: width includes padding and border */
.border-box {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 2px solid;
  /* actual rendered width: 200px — padding/border are inset */
}

/* Global reset (use in every project) */
*, *::before, *::after {
  box-sizing: border-box;
}`,
        },
        {
          title: "Margin collapse",
          css: `/* Vertical margin collapse: adjacent block margins merge */
.heading {
  margin-bottom: 20px;
}
.paragraph {
  margin-top: 30px;
}
/* Gap between them: 30px (larger value), NOT 50px */

/* Collapse does NOT happen when:
   - elements are flex/grid children
   - there is padding or border between them
   - one element is absolutely positioned
   - elements are inline-block
*/

/* Horizontal margins never collapse */
.item {
  margin-right: 10px;
  margin-left: 10px;
  /* gap: 20px, as expected */
}`,
        },
      ],
      commonMistakes: [
        "Not setting box-sizing: border-box globally — leads to width: 100% + padding causing horizontal overflow",
        "Expecting adjacent vertical margins to add up — they collapse to the larger of the two values",
        "Confusing padding (background-colored, inside the border) with margin (always transparent, outside the border)",
        "Using margin: auto on block elements vertically — auto margins only work horizontally for block layout",
        "Not understanding that margin collapse only applies to block-level elements in normal flow",
      ],
      interviewTips: [
        "Lead with: 'The box model has four areas from inside out: content, padding, border, margin.' Interviewers love hearing this stated precisely.",
        "Immediately follow with: 'I always set box-sizing: border-box globally because it makes width calculations predictable.' Shows experience.",
        "Margin collapse is a common interview question. Key points: only vertical, only block elements in normal flow, disappears in flex/grid containers.",
      ],
      practiceTasks: [
        {
          description:
            "Create two stacked <div> elements with different bottom and top margins. Use DevTools to verify which margin wins due to collapse.",
          hint: "DevTools box model diagram shows the actual rendered margins. The collapsed margin will be the larger value.",
        },
        {
          description:
            "Build a fixed-width container (400px) with padding: 24px and a border: 2px. Measure its total rendered width with and without box-sizing: border-box.",
          hint: "Without border-box: 400 + 48 + 4 = 452px. With border-box: 400px.",
        },
      ],
    },
    {
      id: "css-variables",
      moduleId: "css-foundations",
      title: "CSS Custom Properties",
      summary:
        "CSS custom properties (variables) are the modern way to build design tokens, themes, and dynamic values. They work in the cascade — unlike preprocessor variables.",
      estimatedMinutes: 25,
      learningObjectives: [
        "Define and use custom properties on :root and scoped elements",
        "Use fallback values: var(--color, #000)",
        "Understand that custom properties participate in the cascade and can be overridden",
        "Build a light/dark theme toggle using a single data-theme attribute",
        "Update custom properties at runtime with JavaScript",
      ],
      codeExamples: [
        {
          title: "Design token system",
          css: `:root {
  /* Color tokens */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-muted: #6b7280;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-8: 32px;

  /* Typography */
  --font-base: 1rem;
  --font-lg: 1.125rem;
  --font-xl: 1.25rem;
  --line-height-body: 1.6;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-full: 9999px;
}

.button {
  background: var(--color-primary);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-base);
}`,
        },
        {
          title: "Dark mode with data-theme",
          css: `:root {
  --bg: #ffffff;
  --text: #111827;
  --border: #e5e7eb;
}

[data-theme="dark"] {
  --bg: #0f172a;
  --text: #f1f5f9;
  --border: #1e293b;
}

body {
  background: var(--bg);
  color: var(--text);
}`,
          js: `// Toggle theme
const btn = document.getElementById('theme-toggle');
btn.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = current === 'dark' ? 'light' : 'dark';
});`,
        },
      ],
      commonMistakes: [
        "Defining custom properties on specific selectors thinking they're globally available — they inherit down the DOM tree, but siblings and ancestors can't see them",
        "Using custom properties for values that should be compile-time constants (build tool env vars) — custom properties are runtime, not build time",
        "Forgetting fallbacks in properties used on elements that might not inherit the variable: var(--color-accent, blue)",
        "Confusing CSS custom properties with Sass/Less variables — CSS custom properties are live, dynamic, and cascade-aware; preprocessor variables are compiled away",
      ],
      interviewTips: [
        "CSS custom properties participate in the cascade — they can be overridden by more specific selectors or media queries. Sass variables cannot. This is a meaningful distinction to call out.",
        "You can use custom properties in calc(): width: calc(100% - var(--sidebar-width)). This is a powerful pattern for adaptive layouts.",
        "JavaScript can read and set custom properties: getComputedStyle(el).getPropertyValue('--color') and el.style.setProperty('--color', '#fff'). Useful for animations and theme systems.",
      ],
      practiceTasks: [
        {
          description:
            "Convert a stylesheet with hardcoded colors and spacing values into one using custom properties on :root. Then implement a dark mode toggle in 10 lines of JavaScript.",
          hint: "Set the data-theme attribute on <html> (document.documentElement). Then override your :root vars in [data-theme='dark'].",
        },
        {
          description:
            "Build a component (card or button) that can be themed by setting custom properties on the component's own element, overriding the global :root values.",
          hint: "Set --color-primary on the component's class selector. Child elements that use var(--color-primary) will inherit the override.",
        },
      ],
    },
    {
      id: "pseudo-classes-elements",
      moduleId: "css-foundations",
      title: "Pseudo-Classes & Pseudo-Elements",
      summary:
        "Pseudo-classes target state and structure. Pseudo-elements generate visual fragments. Together they power many of the cleanest interaction and decoration patterns in modern CSS.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Explain the difference between a pseudo-class and a pseudo-element",
        "Use :hover, :focus-visible, :not(), :nth-child(), and :has() intentionally",
        "Use ::before and ::after to add decorative UI without extra markup",
        "Know when generated content is acceptable and when real HTML is required instead",
        "Write selectors that remain expressive without becoming unreadable",
      ],
      codeExamples: [
        {
          title: "State and structural pseudo-classes",
          css: `.btn:hover { transform: translateY(-2px); }
.btn:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
.list-item:not(.is-disabled) { cursor: pointer; }
.faq-item:nth-child(odd) { background: rgba(255,255,255,0.03); }

.field:has(input:invalid) {
  border-color: #ef4444;
}`,
        },
        {
          title: "Pseudo-elements for UI details",
          css: `.link {
  position: relative;
  text-decoration: none;
}

.link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 2px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}

.link:hover::after,
.link:focus-visible::after {
  transform: scaleX(1);
}

.callout::before {
  content: "Note";
  display: inline-block;
  margin-right: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}`,
        },
      ],
      commonMistakes: [
        "Using :hover as the only interaction feedback and leaving out keyboard-visible states",
        "Putting meaningful text into ::before or ::after instead of the actual DOM",
        "Writing clever nth-child selectors that nobody can maintain later",
        "Using :focus instead of :focus-visible for keyboard-specific focus treatment",
        "Relying on newer selectors like :has() without making a conscious support decision",
      ],
      interviewTips: [
        "Pseudo-classes target existing elements in a certain state. Pseudo-elements create virtual render-tree fragments. Say that distinction clearly.",
        "Generated content is best for decoration, not critical meaning.",
        "Strong CSS authors use pseudo-selectors to reduce markup, not to make selectors impossible to reason about.",
      ],
      practiceTasks: [
        {
          description:
            "Build a nav-link underline animation and a keyboard focus ring using only pseudo-elements and state selectors.",
          hint: "Use ::after for the underline and :focus-visible for the keyboard state.",
        },
        {
          description:
            "Create a striped list or table with :nth-child(), then refactor the selector until it still feels readable a few months from now.",
          hint: "If the selector feels clever but opaque, it probably needs simplifying.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "specificity-debugger",
      moduleId: "css-foundations",
      title: "Specificity Debugger",
      difficulty: "easy",
      description:
        "You've been given a broken stylesheet with specificity conflicts. Fix every style that isn't applying correctly — without adding !important or changing the HTML.",
      requirements: [
        "All button text must be white, not the browser default",
        "The .active class must override the base link color",
        "The card title inside #featured must be larger than other card titles",
        "Fix all conflicts using only selector changes (no !important, no inline styles)",
        "Document why each fix works in a comment",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Specificity Debug</title>
  <style>
    /* Fix the specificity issues below */
    a { color: blue; }
    .nav a.active { color: white; }  /* not working */
    #nav a { color: gray; }          /* this wins incorrectly */

    .card h2 { font-size: 1.25rem; }
    #featured h2 { font-size: 1.5rem; } /* not applying */
    .card #featured h2 { font-size: 2rem; } /* broken selector */

    button { color: black; }
    .btn-primary { background: blue; }
    /* button text should be white but isn't */
  </style>
</head>
<body>
  <nav id="nav">
    <a href="/">Home</a>
    <a href="/about" class="active">About</a>
  </nav>

  <div class="card" id="featured">
    <h2>Featured Article</h2>
  </div>
  <div class="card">
    <h2>Regular Article</h2>
  </div>

  <button class="btn-primary">Click me</button>
</body>
</html>`,
      expectedResult:
        "All styles apply correctly. The active link is styled, the featured card title is larger, and the button text is white. No !important used anywhere.",
      hints: [
        "Calculate the specificity of each conflicting selector. The one with higher specificity wins.",
        "To make .nav a.active beat #nav a: the ID gives (0,1,0,0). You need your selector to beat that.",
        "For the button, the issue is that color: black on 'button' element (0,0,0,1) isn't overridden by .btn-primary (0,0,1,0) — but wait, it should be. Look more carefully at what color is missing.",
      ],
      bonusTasks: [
        "Rewrite the stylesheet using a flat class-based naming convention (BEM or similar) that avoids IDs and keeps specificity at (0,0,1,0) everywhere",
        "Add a :hover state to the active link that still passes specificity",
      ],
      conceptsCovered: ["selectors-cascade", "specificity", "combinators"],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "selectors-cascade": () => (
    <>
      <p>
        The <em>cascade</em> is the algorithm that determines which CSS rule wins when
        multiple rules target the same element and property. It evaluates three tiers in
        order. First: <strong>origin</strong> — rules from the browser&apos;s default
        stylesheet lose to author stylesheets, which lose to <code>!important</code>{" "}
        declarations. Second: <strong>specificity</strong> — a score computed from the
        selector. Third: <strong>source order</strong> — when specificity ties, the later
        rule wins. Most developers only think about source order, which is why
        CSS feels unpredictable to them.
      </p>
      <p>
        Specificity is calculated as a 4-component tuple: (inline styles, ID selectors,
        class/attribute/pseudo-class selectors, element/pseudo-element selectors). A
        selector like <code>#main .title span</code> scores (0, 1, 1, 1). An inline style{" "}
        (<code>style="..."</code>) scores (1, 0, 0, 0) and beats any selector. The
        numbers in each component never &quot;carry over&quot; — ten classes (0,0,10,0)
        still lose to one ID (0,1,0,0).
      </p>
      <p>
        <strong>Inheritance</strong> is separate from the cascade. Certain
        properties — <code>color</code>, <code>font-size</code>,{" "}
        <code>line-height</code>, <code>font-family</code> — are inherited: a child
        element gets its parent&apos;s value if no explicit rule targets it. Others —{" "}
        <code>margin</code>, <code>padding</code>, <code>border</code>,{" "}
        <code>background</code>, <code>width</code> — are not inherited by default. You
        can force inheritance with the <code>inherit</code> keyword, or opt-out a property
        with <code>initial</code>.
      </p>
      <p>
        The practical lesson is that good CSS architecture tries to keep specificity low.
        Tag selectors, single classes, and predictable composition are easier to override than
        deeply nested selectors or IDs. If you constantly need <code>!important</code>, you
        usually don&apos;t have a browser problem — you have a cascade design problem. Teams
        that understand this early write CSS that stays maintainable as the codebase grows.
      </p>
      <p>
        In interviews, be ready to explain why two rules can both match but only one wins.
        The clean answer is: origin, then specificity, then source order. Mentioning that
        inheritance is a separate concept is a strong signal, because many developers mix the
        two together.
      </p>
    </>
  ),

  "box-model": () => (
    <>
      <p>
        Every HTML element renders as a rectangular box. The CSS box model describes this
        box as four concentric areas, from inside out:{" "}
        <strong>content</strong> (the actual text or replaced element),{" "}
        <strong>padding</strong> (transparent space inside the border, sharing the
        element&apos;s background color), <strong>border</strong> (the painted edge), and{" "}
        <strong>margin</strong> (transparent space outside the border that separates the
        element from its neighbours). Padding and margin look similar but behave very
        differently: padding is inside the box, margin is outside it.
      </p>
      <p>
        By default, the CSS <code>width</code> property sets only the <em>content</em>{" "}
        area. Padding and border are added <em>on top of</em> that. So a{" "}
        <code>{"div { width: 200px; padding: 20px; border: 2px solid }"}</code> actually
        renders at 244px. This is <code>box-sizing: content-box</code>, the default and
        the source of countless layout bugs. Setting{" "}
        <code>box-sizing: border-box</code> changes the model so that{" "}
        <code>width</code> includes padding and border — the element renders at exactly
        the declared width. Every production codebase applies this globally with{" "}
        <code>*, *::before, *::after {"{"} box-sizing: border-box {"}"}</code>.
      </p>
      <p>
        <strong>Margin collapse</strong> is a frequently misunderstood behaviour: when two
        adjacent block-level elements have vertical margins that touch, they collapse into a
        single margin equal to the <em>larger</em> of the two (not their sum). This only
        happens vertically (block direction), never horizontally, and it disappears inside
        flex or grid containers. It also disappears when there&apos;s padding or border
        between the elements.
      </p>
      <p>
        This is why spacing decisions need intention. If you want an element to feel bigger
        internally, use padding. If you want it to be separated from siblings, use margin.
        Mixing the two arbitrarily leads to layouts that look correct only by accident.
        Production UI systems usually standardize this with spacing tokens and clear
        component boundaries so teams are not reinventing the box model on every page.
      </p>
      <p>
        Interviewers love box-model questions because they reveal whether someone really
        understands layout or has only memorized property names. If someone gives you a width
        and padding and asks for the rendered size, your first response should be:
        &quot;under content-box or border-box?&quot;
      </p>
    </>
  ),

  "css-variables": () => (
    <>
      <p>
        CSS custom properties (often called CSS variables) are properties whose names start
        with <code>--</code>, defined on any element and inherited by its descendants.
        Unlike preprocessor variables (Sass, Less), they are <em>live</em>: they exist at
        runtime, participate in the cascade, and can be read and written by JavaScript.
        This makes them the right tool for design tokens — the named values (colors,
        spacing, radii) that unify a design system.
      </p>
      <p>
        Defining tokens on <code>:root</code> makes them globally available (since{" "}
        <code>:root</code> is the <code>{"<html>"}</code> element, the top of the DOM
        tree). Any descendant that references <code>{"var(--color-primary)"}</code> gets
        the value. The cascade applies: a more specific selector can override the same
        custom property for its subtree, enabling scoped overrides. This is the pattern
        behind dark mode: define the same token names with different values inside{" "}
        <code>[data-theme="dark"]</code>, and the entire component tree updates because
        every component references the tokens, not hardcoded values.
      </p>
      <p>
        Always provide fallback values for custom properties that might not be defined:{" "}
        <code>{"var(--color-accent, #6366f1)"}</code>. This is especially important when
        components are used across different contexts where the variable might not be
        inherited. Custom properties can also be used inside <code>calc()</code>:{" "}
        <code>{"width: calc(100% - var(--sidebar-width))"}</code> — a powerful pattern
        for adaptive layouts where the sidebar width might change.
      </p>
      <p>
        Custom properties are strongest when they represent decisions, not just values. A
        token like <code>--space-md</code> communicates more than <code>--space-16</code>,
        and <code>--color-text-muted</code> communicates more than <code>--gray-500</code>.
        That naming discipline is what lets you theme, refactor, and scale a UI without
        rewriting every selector.
      </p>
      <p>
        They also pair naturally with component boundaries. A parent can expose theme values
        and a child can consume them without hard dependencies. That makes CSS variables one
        of the few styling tools that are equally useful for design systems, runtime theming,
        and plain app-level CSS.
      </p>
    </>
  ),

  "pseudo-classes-elements": () => (
    <>
      <p>
        Pseudo-classes and pseudo-elements are related in syntax but different in purpose. A
        pseudo-class selects a real element in a specific state or relationship: hovered,
        focused, invalid, first child, not disabled. A pseudo-element creates a virtual piece
        of an element in the render tree, such as <code>::before</code> or{" "}
        <code>::after</code>. Keeping that distinction straight makes a lot of CSS feel much
        less magical.
      </p>
      <p>
        Pseudo-classes are especially powerful for stateful UI and structural patterns.{" "}
        <code>:focus-visible</code> is one of the most valuable because it lets keyboard users
        keep focus treatment without flashing focus styles after every mouse click.{" "}
        <code>:not()</code>, <code>:nth-child()</code>, and <code>:has()</code> let you write
        expressive selectors without adding extra helper classes for every minor condition.
      </p>
      <p>
        Pseudo-elements are ideal for decorative affordances: underlines, badges, separators,
        overlays, and simple icon containers. But they should not become your content model.
        If text matters semantically or needs to be reliably announced, it belongs in HTML,
        not inside generated content.
      </p>
      <p>
        In interviews, this topic is a good place to show restraint. The best answer is not
        &quot;I know lots of tricky selectors.&quot; It is &quot;I know how to use selectors to
        express state and decoration cleanly without making CSS harder to maintain.&quot;
      </p>
    </>
  ),
};
