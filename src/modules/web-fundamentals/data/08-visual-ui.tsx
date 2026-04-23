import type { LearningModule } from "./types";

export const visualUI: LearningModule = {
  id: "visual-ui",
  title: "Visual UI Fundamentals",
  description:
    "Typography, color, spacing, shadows, and visual hierarchy. The principles that separate professional-looking UIs from amateurish ones.",
  icon: "✨",
  order: 7,
  estimatedHours: 2,
  lessons: [
    {
      id: "typography-spacing",
      moduleId: "visual-ui",
      title: "Typography & Visual Hierarchy",
      summary:
        "Typography is 95% of web design. Line height, letter spacing, font weight, and a consistent spacing scale create the visual rhythm that makes interfaces feel professional.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Set line-height using unitless values (preferred over px or em)",
        "Build a type scale using a ratio (1.25 or 1.333 between steps)",
        "Use font-weight correctly — know that 400 is regular, 700 is bold",
        "Create a consistent spacing scale using CSS custom properties",
        "Use letter-spacing appropriately for headings and all-caps labels",
      ],
      codeExamples: [
        {
          title: "Type scale with custom properties",
          css: `:root {
  /* Type scale (ratio ~1.25) */
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */

  /* Line heights */
  --leading-tight:  1.25;  /* headings */
  --leading-snug:   1.375;
  --leading-normal: 1.5;   /* body text */
  --leading-relaxed: 1.625;

  /* Spacing scale (4px base) */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}

/* Apply to base elements */
body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  font-family: system-ui, -apple-system, sans-serif;
}

h1 { font-size: var(--text-4xl); line-height: var(--leading-tight); }
h2 { font-size: var(--text-3xl); line-height: var(--leading-tight); }
h3 { font-size: var(--text-2xl); line-height: var(--leading-snug); }`,
        },
        {
          title: "Shadows and elevation system",
          css: `:root {
  /* Elevation: sm, md, lg, xl */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --shadow-xl:  0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
}

.card          { box-shadow: var(--shadow-md); }
.card:hover    { box-shadow: var(--shadow-lg); }
.modal         { box-shadow: var(--shadow-xl); }
.input:focus   { box-shadow: 0 0 0 3px rgba(99,102,241,0.3); } /* focus ring */`,
        },
      ],
      commonMistakes: [
        "Using a unitless number for line-height is preferred over px — e.g. line-height: 1.5, not line-height: 24px. Unitless values scale with font size automatically.",
        "Too-tight line height on body text (line-height < 1.4) — reduces readability, especially for dyslexic users",
        "Inconsistent spacing — mixing 10px, 12px, 15px, 22px. Use a 4px or 8px base grid consistently",
        "Using font weights that aren't loaded — requesting font-weight: 600 when only 400 and 700 are loaded causes the browser to fake it",
      ],
      interviewTips: [
        "line-height is unitless (1.5, not 150% or 24px) because unitless values multiply the element's font-size. Children inherit the multiplier, not the computed value — preventing font-size/line-height mismatches.",
        "Visual hierarchy is about contrast: size contrast, weight contrast, color contrast. A common mistake is varying only color for hierarchy without varying weight or size.",
        "The 4px/8px spacing grid (4, 8, 12, 16, 24, 32, 48, 64) feels consistent because it divides evenly at every common screen width. Design systems like Tailwind and Material use this.",
      ],
      practiceTasks: [
        {
          description:
            "Define a 7-step type scale in CSS custom properties using a 1.25 ratio. Apply it to h1–h3 and body text. Verify the visual hierarchy looks intentional.",
          hint: "Start from 1rem (16px) and multiply by 1.25 each step up. Round to 3 decimal places.",
        },
        {
          description:
            "Build a card component using only your spacing scale values for all margin, padding, and gap. No arbitrary numbers like 10px or 22px.",
          hint: "Define --space-2 through --space-12 in :root. Then build the card using only those values.",
        },
      ],
    },
    {
      id: "css-architecture",
      moduleId: "visual-ui",
      title: "CSS Architecture & Design Tokens",
      summary:
        "Frontend systems get messy when CSS has no ownership model. Good CSS architecture keeps styles predictable, reusable, and easy to change without fear.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Understand the role of design tokens in a scalable styling system",
        "Compare utility-first styling, component-scoped CSS, and naming conventions like BEM",
        "Separate global primitives from component-specific styles",
        "Reduce override wars by keeping selectors low-specificity and intention-revealing",
        "Organize CSS so teams can change themes, spacing, and states without cascading breakage",
      ],
      codeExamples: [
        {
          title: "Token layer + component layer",
          css: `:root {
  --color-bg: #0b1020;
  --color-surface: #121933;
  --color-text: #eef2ff;
  --color-accent: #60a5fa;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius-md: 0.75rem;
}

.card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.card__title {
  margin-bottom: var(--space-2);
}

.card--highlighted {
  outline: 2px solid var(--color-accent);
}`,
        },
        {
          title: "Three common architecture styles",
          css: `/* Utility-first */
.mt-4 { margin-top: 1rem; }
.text-sm { font-size: 0.875rem; }
.rounded-lg { border-radius: 0.75rem; }

/* BEM */
.pricing-card { }
.pricing-card__title { }
.pricing-card--featured { }

/* Component-scoped / CSS module-like thinking */
.button { }
.buttonPrimary { }
.buttonDanger { }`,
        },
      ],
      commonMistakes: [
        "Mixing raw values and tokens randomly so the design system is only half real",
        "Using deep descendant selectors that tightly couple CSS to markup structure",
        "Building components that can only be themed by editing the component itself",
        "Choosing a naming convention but not applying it consistently",
        "Letting every component redefine spacing, color, and radius instead of consuming shared primitives",
      ],
      interviewTips: [
        "CSS architecture is about controlling change, not just making styles pass today.",
        "You do not need religious loyalty to one methodology. Teams often combine tokens, component scope, and a small utility layer.",
        "Low specificity is a maintainability feature, not just a personal preference.",
      ],
      practiceTasks: [
        {
          description:
            "Take a component with hardcoded values and refactor it to consume shared tokens for color, spacing, radius, and shadow.",
          hint: "If design changed tomorrow, how many files would you need to edit?",
        },
        {
          description:
            "Pick one styling strategy for a tiny UI kit and write down the rules for what lives globally versus inside a component.",
          hint: "The point is not the perfect methodology; it is a consistent ownership model.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "button-system",
      moduleId: "visual-ui",
      title: "Button System",
      difficulty: "easy",
      description:
        "Build a complete button system with three variants (primary, secondary, danger) and three sizes (sm, md, lg). All buttons must meet WCAG AA contrast requirements.",
      requirements: [
        "Three variants: primary (filled accent), secondary (outlined), danger (destructive)",
        "Three sizes using your spacing and type scale tokens",
        "Hover state with visual feedback",
        "Focus-visible state that is clearly visible",
        "Disabled state that looks distinct and removes pointer events",
        "All text meets 4.5:1 contrast ratio against button background",
        "Buttons use CSS custom properties for easy theming",
      ],
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }`,
      expectedResult:
        "Nine button variants (3 styles × 3 sizes) that look polished and work correctly. Hover states are smooth. Focus rings are clearly visible. Disabled buttons are visually distinct.",
      hints: [
        "Define button tokens (--btn-primary-bg, --btn-primary-text) in :root, then use them in the .btn-primary class.",
        "Use :focus-visible (not :focus) for focus rings — this shows rings for keyboard users but not mouse clicks.",
        "Disabled state: opacity: 0.5; cursor: not-allowed; pointer-events: none;",
      ],
      bonusTasks: [
        "Add a loading state with a CSS spinner (border + animation)",
        "Add icon support (icon-only button with aria-label, icon-left, icon-right variants)",
        "Make the button family work as <a> elements too (for link buttons)",
      ],
      conceptsCovered: ["typography-spacing", "css-variables", "accessibility-fundamentals"],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "typography-spacing": () => (
    <>
      <p>
        Typography is the foundation of visual communication on the web. The choices you
        make about font size, line height, weight, and letter spacing determine whether
        your UI feels considered or chaotic. A <strong>type scale</strong> is a set of
        font sizes with a consistent ratio between each step — commonly 1.25 (Major Third)
        or 1.333 (Perfect Fourth). This mathematical relationship creates visual harmony:
        each heading level is proportionally larger than the previous, giving the page a
        clear hierarchy without arbitrary decisions.
      </p>
      <p>
        <code>line-height</code> is one of the most impactful properties for readability.
        Always set it as a unitless number (e.g., <code>1.5</code>) rather than a px or
        em value. Unitless line-heights are inherited as <em>multipliers</em>, meaning
        child elements with different font sizes get proportionally appropriate line heights
        automatically. A value of 1.4–1.6 is comfortable for body text; 1.1–1.25 is
        appropriate for headings where tight leading looks intentional. Letter spacing (
        <code>letter-spacing</code>) should be used sparingly: slightly negative on large
        headings (<code>-0.02em</code>) and slightly positive on all-caps labels (
        <code>0.05em</code>) to aid legibility.
      </p>
      <p>
        A <strong>spacing scale</strong> built on a 4px base unit creates consistency
        across a UI. Every padding, margin, and gap value should be a multiple of 4px (4,
        8, 12, 16, 24, 32, 48, 64px). This feels rhythmic because it divides evenly into
        common container widths. Define these as CSS custom properties — then every spacing
        decision in your components references a token, not an arbitrary number. When you
        need to adjust the scale, you change one definition rather than hunting through
        every component.
      </p>
      <p>
        Good visual UI is mostly about relationships. A heading should feel connected to the
        paragraph beneath it and clearly separated from the section above it. Buttons of the
        same importance should share spacing, radius, and weight. Empty states should still
        sit on the same rhythm as dense screens. Users rarely notice a spacing scale
        explicitly, but they immediately feel when one is missing.
      </p>
      <p>
        This is also one of the fastest ways to improve frontend interview exercises. Many
        candidates can make something functionally correct. Fewer can make it feel balanced.
        If you can explain why you chose a type scale, why your spacing system is tokenized,
        and how hierarchy is expressed consistently, you sound like someone who can build
        production UI rather than just code demos.
      </p>
    </>
  ),

  "css-architecture": () => (
    <>
      <p>
        CSS architecture is about deciding where styling decisions live and how they change
        safely over time. Without an architecture, styles accrete randomly: one component
        hardcodes colors, another overrides them with a longer selector, and a third
        duplicates the same spacing values with slightly different numbers. The visual output
        may still work, but the system becomes expensive to evolve.
      </p>
      <p>
        Design tokens are the foundation because they separate design decisions from
        component implementation. Colors, spacing, radii, shadows, and type steps should be
        defined once and consumed everywhere. That turns styling into a shared language
        instead of a set of private component decisions.
      </p>
      <p>
        From there, teams typically combine a few complementary strategies: component scope,
        utilities, and naming conventions. Utility classes optimize for speed and
        consistency. BEM-style naming keeps plain CSS explicit. CSS Modules and similar
        patterns keep style ownership local. The real skill is not picking the one true
        methodology; it is applying a small set of rules consistently enough that change
        stays boring.
      </p>
      <p>
        Great CSS architecture also keeps specificity low on purpose. Styles should compose,
        not fight. In interviews, explaining CSS architecture as a maintainability and team
        coordination concern, not just a syntax preference, is a strong differentiator.
      </p>
    </>
  ),
};
