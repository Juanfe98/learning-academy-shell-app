import type { LearningModule } from "./types";

export const responsiveDesign: LearningModule = {
  id: "responsive-design",
  title: "Responsive Design",
  description:
    "Mobile-first design, media queries, fluid layouts, and modern CSS functions like clamp and min/max. Build UIs that look intentional at every viewport size.",
  icon: "📱",
  order: 6,
  estimatedHours: 2.1,
  lessons: [
    {
      id: "media-queries",
      moduleId: "responsive-design",
      title: "Media Queries",
      summary:
        "Media queries are conditional CSS. The mobile-first approach — start with mobile styles, add complexity up — results in cleaner code and better performance.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Write mobile-first media queries using min-width",
        "Know common breakpoints and how to choose them",
        "Use media queries for more than just width (prefers-color-scheme, prefers-reduced-motion, hover)",
        "Understand the difference between min-width and max-width approaches",
      ],
      codeExamples: [
        {
          title: "Mobile-first breakpoint system",
          css: `/* Base styles: mobile (320px+)
   Write these FIRST — no query needed */
.card {
  padding: 16px;
  font-size: 0.9rem;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Small tablet (640px+) */
@media (min-width: 40rem) { /* 640px */
  .grid {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

/* Tablet / small desktop (768px+) */
@media (min-width: 48rem) { /* 768px */
  .card { padding: 24px; }
}

/* Desktop (1024px+) */
@media (min-width: 64rem) { /* 1024px */
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Wide desktop (1280px+) */
@media (min-width: 80rem) { /* 1280px */
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}`,
        },
        {
          title: "Feature-based and preference media queries",
          css: `/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
    --text: #f1f5f9;
  }
}

/* Reduced motion: respect user preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Hover: touch devices don't support true hover */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
}

/* Print styles */
@media print {
  .sidebar, .nav, .ads { display: none; }
  body { font-size: 12pt; }
}`,
        },
      ],
      commonMistakes: [
        "Using max-width queries for mobile (desktop-first) — leads to overriding base styles repeatedly; mobile-first is cleaner",
        "Hardcoding breakpoints to specific device widths (768px for iPad, 375px for iPhone) — device sizes change; build to your content, not devices",
        "Not testing on real mobile devices — browser DevTools device simulation misses touch events and real mobile rendering",
        "Forgetting prefers-reduced-motion — animations can cause motion sickness; always respect this preference",
      ],
      interviewTips: [
        "Mobile-first means writing base styles for the smallest screen, then adding complexity in min-width queries. It results in less override CSS because you're adding, not overriding.",
        "Use rem-based breakpoints (48rem vs 768px) — they respect the user's browser font size settings, unlike px breakpoints.",
        "prefers-reduced-motion is a WCAG requirement for animations that run for more than 5 seconds or repeat. Failing to implement it can be a legal issue.",
      ],
      practiceTasks: [
        {
          description:
            "Convert a desktop-first stylesheet to mobile-first. Identify which styles are 'additions' vs 'overrides' — you should end up with fewer lines.",
          hint: "Start by defining the mobile layout in base styles. Move the desktop layout into min-width: 64rem.",
        },
        {
          description:
            "Add prefers-reduced-motion support to a page with CSS animations. Disable or slow the animations when the preference is set.",
          hint: "Use a single @media (prefers-reduced-motion: reduce) block at the end of your stylesheet to override all animations.",
        },
      ],
    },
    {
      id: "responsive-units",
      moduleId: "responsive-design",
      title: "Responsive Units & clamp()",
      summary:
        "px, %, rem, em, vw, vh — and the modern clamp(), min(), max() functions that replace complex media query stacks with fluid scaling.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Know when to use rem (UI spacing) vs em (component-relative sizing) vs px (fixed values)",
        "Understand vw, vh, svh, dvh and when each is appropriate",
        "Use clamp() to create fluid typography and spacing that scales between two values",
        "Use min() and max() to create adaptive constraints",
      ],
      codeExamples: [
        {
          title: "Unit comparison and use cases",
          css: `/* px: fixed, predictable. Good for borders, shadows, fine-tuned gaps */
border: 1px solid;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);

/* rem: relative to root font size (usually 16px).
   Good for font sizes, spacing — respects user font size preferences */
font-size: 1rem;    /* 16px */
font-size: 1.125rem; /* 18px */
margin: 2rem;       /* 32px */

/* em: relative to the element's own font size.
   Good for padding/margin that should scale with text */
button {
  font-size: 1rem;
  padding: 0.5em 1em; /* always proportional to the button's font size */
}

/* vw/vh: viewport units */
.hero { min-height: 100vh; }
.full-width-banner { width: 100vw; }

/* svh (small viewport height) and dvh (dynamic viewport height)
   Mobile browsers: svh = smallest possible viewport (toolbar visible),
   dvh = current actual viewport height (adjusts as toolbar hides/shows) */
.hero-mobile { min-height: 100svh; } /* safe choice for mobile */`,
        },
        {
          title: "clamp() for fluid typography and spacing",
          css: `/* clamp(minimum, preferred, maximum)
   Scales fluidly between min and max */

/* Fluid heading: 24px at 320px viewport, scales to 48px at 1280px */
h1 {
  font-size: clamp(1.5rem, 4vw + 0.5rem, 3rem);
}

/* Fluid body text: always comfortable */
body {
  font-size: clamp(1rem, 1.5vw + 0.5rem, 1.125rem);
}

/* Fluid section padding */
section {
  padding: clamp(2rem, 5vw, 6rem);
}

/* Fluid container max-width with breathing room */
.container {
  width: min(90%, 1200px); /* 90% OR 1200px, whichever is smaller */
  margin-inline: auto;
}

/* max() to enforce a minimum */
.card {
  width: max(300px, 30%); /* at least 300px wide */
}`,
        },
      ],
      commonMistakes: [
        "Using px for font sizes — it overrides user browser font size preferences, an accessibility issue",
        "Using 100vh for mobile full-height sections — it doesn't account for the address bar; use 100svh instead",
        "Using vw for font sizes without a clamp floor — text becomes unreadably small on narrow viewports",
        "Not knowing that em is relative to the element itself, not the root — nesting em inside em compounds",
      ],
      interviewTips: [
        "rem is preferred for font sizes and spacing because it respects user preferences and scales consistently. The only time em is better is when you want component-relative sizing (e.g., button padding that scales with the button's font-size).",
        "clamp() is the modern replacement for using media queries just to change font size or spacing. Show you know it — most devs don't use it yet.",
        "svh and dvh are the correct units for full-height mobile sections. 100vh on mobile often means the content is hidden under the address bar.",
      ],
      practiceTasks: [
        {
          description:
            "Convert a design with hardcoded pixel font sizes to use rem and clamp(). The typography should scale fluidly between 320px and 1280px viewports.",
          hint: "Start with body text at clamp(1rem, 1.5vw + 0.5rem, 1.125rem). Headings get larger clamp ranges.",
        },
        {
          description:
            "Build a hero section that fills the viewport height on mobile without being hidden behind the address bar.",
          hint: "min-height: 100svh is the modern, correct approach. Test it on an actual mobile device or Chrome DevTools with a mobile simulation.",
        },
      ],
    },
    {
      id: "responsive-media",
      moduleId: "responsive-design",
      title: "Responsive Images, Video & Media Frames",
      summary:
        "Responsive media is about choosing the right file, preserving the right crop, and reserving the right space before assets load. This is where performance, layout stability, and content strategy meet.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Use srcset and sizes so the browser can choose the right image file for the current viewport",
        "Know when to use picture for art direction instead of just density switching",
        "Use aspect-ratio and object-fit to reserve space and control cropping without layout shift",
        "Build stable media containers for images and videos before content loads",
        "Explain the difference between responsive source selection and CSS resizing",
      ],
      codeExamples: [
        {
          title: "srcset, sizes, and picture",
          html: `<!-- Same image subject, different file sizes -->
<img
  src="team-1200.jpg"
  srcset="team-480.jpg 480w, team-800.jpg 800w, team-1200.jpg 1200w"
  sizes="(max-width: 48rem) 100vw, (max-width: 80rem) 50vw, 33vw"
  alt="Product team planning the next release"
  width="1200"
  height="800"
/>

<!-- picture: different crop or format by context -->
<picture>
  <source media="(max-width: 40rem)" srcset="hero-mobile.webp" type="image/webp" />
  <source srcset="hero-desktop.webp" type="image/webp" />
  <img
    src="hero-desktop.jpg"
    alt="Analytics dashboard overview"
    width="1440"
    height="900"
  />
</picture>`,
        },
        {
          title: "Stable media frames with aspect-ratio and object-fit",
          css: `.media-frame {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255,255,255,0.04);
}

.media-frame > img,
.media-frame > video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar {
  width: 64px;
  aspect-ratio: 1;
  border-radius: 9999px;
  object-fit: cover;
}`,
        },
      ],
      commonMistakes: [
        "Serving one oversized desktop image and shrinking it with CSS instead of letting the browser choose an appropriate source",
        "Using picture when srcset alone would do — picture is for art direction or format switching",
        "Forgetting intrinsic dimensions or aspect-ratio so the page jumps as media loads",
        "Using object-fit: cover without checking whether important content is being cropped away",
        "Treating responsive media as purely visual when it is also a performance concern",
      ],
      interviewTips: [
        "srcset answers 'which file should load?' while CSS answers 'how should the chosen file display?'. Those are separate decisions.",
        "Use picture when the image itself changes by breakpoint, such as a tighter mobile crop.",
        "aspect-ratio is one of the cleanest modern CSS additions because it replaces old padding hacks and helps prevent layout shift.",
      ],
      practiceTasks: [
        {
          description:
            "Build a hero image that serves a tighter mobile crop and a wider desktop crop while preserving layout stability before the image loads.",
          hint: "That is a picture use case, not just srcset.",
        },
        {
          description:
            "Create a responsive card grid where every card image keeps a consistent ratio and crop regardless of the source image dimensions.",
          hint: "Use aspect-ratio on the frame and object-fit: cover on the image.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "mobile-first-hero",
      moduleId: "responsive-design",
      title: "Mobile-First Hero Section",
      difficulty: "medium",
      description:
        "Build a hero section that looks intentional at 375px (mobile) and 1280px (desktop). No framework, no JavaScript — pure HTML and CSS.",
      targetImage: {
        src: "/wf-challenges/mobile-first-hero.svg",
        alt: "Marketing hero mock with large heading, supporting copy, two call-to-action buttons, and a product image beside the content at desktop size.",
        caption:
          "Treat this as the same component across two breakpoints, not two different pages. Your structure should survive the shift from stacked mobile to side-by-side desktop.",
      },
      requirements: [
        "Mobile layout: content stacked vertically, centered",
        "Desktop layout (min-width: 1024px): content side-by-side with image",
        "Heading uses clamp() for fluid typography (no font-size media queries)",
        "Section fills the viewport height without the address-bar overlap issue",
        "Two CTA buttons side-by-side at desktop, stacked on mobile",
        "Accessible contrast on all text",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hero</title>
</head>
<body>
  <section class="hero">
    <div class="hero__content">
      <h1>Build faster, ship smarter</h1>
      <p>The platform developers actually enjoy using.</p>
      <div class="hero__ctas">
        <a href="#" class="btn btn--primary">Get started free</a>
        <a href="#" class="btn btn--secondary">View demo</a>
      </div>
    </div>
    <div class="hero__image">
      <img src="https://picsum.photos/600/400" alt="Product screenshot" width="600" height="400" />
    </div>
  </section>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
img { max-width: 100%; display: block; }`,
      expectedResult:
        "A polished hero section with fluid typography and responsive layout. On mobile: stacked, centered. On desktop: two-column. The heading scales smoothly between breakpoints using clamp().",
      hints: [
        "Start with mobile styles (stacked, flexbox column). Add @media (min-width: 64rem) for the side-by-side layout.",
        "For the heading: font-size: clamp(2rem, 5vw + 1rem, 4rem)",
        "min-height: 100svh for the section height.",
      ],
      bonusTasks: [
        "Add a subtle background gradient that uses CSS custom properties",
        "Make the image use object-fit: cover inside a fixed-aspect-ratio container",
        "Add a CSS-only dark mode using prefers-color-scheme",
      ],
      conceptsCovered: [
        "media-queries",
        "responsive-units",
        "flexbox",
        "css-variables",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "media-queries": () => (
    <>
      <p>
        Media queries are conditional CSS — styles that only apply when certain
        conditions are met. The most common condition is viewport width, but
        media queries can also target user preferences (
        <code>prefers-color-scheme</code>, <code>prefers-reduced-motion</code>),
        device capabilities (<code>hover</code>, <code>pointer</code>), and
        output media (<code>print</code>). They&apos;re the mechanism that makes
        a single HTML document look appropriate at any size.
      </p>
      <p>
        <strong>Mobile-first</strong> means writing base styles for the
        narrowest viewport first, then adding complexity in{" "}
        <code>min-width</code> queries as the viewport gets wider. This approach
        is superior to desktop-first because: the simpler, more constrained
        mobile layout is the natural starting point; you&apos;re adding styles
        rather than overriding them; and mobile devices only download the base
        styles for layout (though all CSS is downloaded, the cascade ensures
        efficient application). Rule of thumb: if you find yourself writing{" "}
        <code>display: none</code> to hide mobile elements at desktop, you might
        be working desktop-first accidentally.
      </p>
      <p>
        Choose breakpoints based on your <em>content</em>, not device sizes. The
        right question isn&apos;t &quot;what&apos;s the iPad width?&quot; but
        &quot;at what width does this layout start to look cramped?&quot;.
        Common content-based breakpoints are roughly 640px, 768px, 1024px, and
        1280px — but you should add breakpoints wherever your content needs
        them, not on a fixed schedule. Using <code>rem</code> units in
        breakpoints (<code>48rem</code> instead of <code>768px</code>) respects
        user font size settings.
      </p>
      <p>
        Responsive design is really a strategy for handling constraints, not
        just screen widths. The constraints might be a narrow viewport, a coarse
        pointer, reduced motion, large text settings, or a component embedded in
        a tighter container than it had during development. The more your mental
        model includes those realities, the more robust your UI becomes.
      </p>
      <p>
        In interviews, it helps to talk about responsiveness as a progression:
        start with a layout that works in the smallest reasonable context, then
        add room, density, and enhancement as space increases. That framing
        makes you sound like someone designing systems, not just sprinkling
        breakpoints into a stylesheet.
      </p>
    </>
  ),

  "responsive-units": () => (
    <>
      <p>
        CSS has many units, and choosing the right one matters for both
        accessibility and behaviour. <code>px</code> is fixed — predictable, but
        it doesn&apos;t adapt to user preferences or viewport changes.{" "}
        <code>rem</code> is relative to the root font size (typically 16px),
        making it ideal for font sizes and spacing: if a user sets their browser
        base font to 20px, rem-based layouts scale up proportionally.
        <code>em</code> is relative to the element&apos;s own font size, useful
        for component-internal spacing that should scale with the
        component&apos;s text.
      </p>
      <p>
        Viewport units — <code>vw</code> and <code>vh</code> — are relative to
        the viewport width and height respectively. They&apos;re useful for
        full-viewport sections and large fluid values, but mobile browsers
        complicate <code>vh</code>: the address bar&apos;s visibility changes
        the viewport height, causing sections set to <code>100vh</code> to jump
        in size. The solution is <code>svh</code> (small viewport height —
        always the smallest possible viewport, address bar visible) and{" "}
        <code>dvh</code> (dynamic — tracks the current actual height as the
        address bar appears/disappears). Use <code>100svh</code> for hero
        sections on mobile.
      </p>
      <p>
        <code>clamp(min, preferred, max)</code> is the modern approach to fluid
        scaling. It returns the preferred value (usually a viewport-relative
        expression like <code>4vw + 1rem</code>) clamped between the minimum and
        maximum. <code>font-size: clamp(1.5rem, 4vw + 0.5rem, 3rem)</code>{" "}
        scales from 24px at narrow viewports to 48px at wide viewports — no
        media queries needed. The companion functions <code>min()</code> and{" "}
        <code>max()</code> are useful for constraints:{" "}
        <code>width: min(90%, 1200px)</code> creates a container that&apos;s 90%
        wide on small screens but never exceeds 1200px.
      </p>
      <p>
        The key to unit choice is asking what should remain fixed, what should
        scale with typography, and what should react to the viewport. Font sizes
        and spacing often want
        <code>rem</code>. Component-internal offsets may want <code>em</code>.
        Full-screen regions may want viewport units. Containers often want{" "}
        <code>min()</code> or <code>clamp()</code> so they can be fluid without
        becoming absurd.
      </p>
      <p>
        A mature responsive system usually mixes units on purpose. Using only
        pixels is too rigid. Using only viewport units makes typography
        unstable. Using only rem can make large-scale layouts feel disconnected
        from screen size. Strong CSS authors choose the unit based on what
        should drive the relationship.
      </p>
    </>
  ),

  "responsive-media": () => (
    <>
      <p>
        Responsive media has two jobs: choosing the right asset and displaying
        it in the right box. HTML handles source selection with{" "}
        <code>srcset</code>, <code>sizes</code>, and <code>picture</code>. CSS
        handles presentation with width, height, <code>aspect-ratio</code>, and{" "}
        <code>object-fit</code>. Many teams blur those concerns together and end
        up either shipping files that are too heavy or cropping media in
        unpredictable ways.
      </p>
      <p>
        <code>srcset</code> and <code>sizes</code> are for the same subject at
        different resolutions. <code>picture</code> is for art direction or
        format switching, such as a wider desktop crop and a tighter mobile
        crop, or WebP with JPEG fallback. That distinction matters because it
        keeps your markup intentional instead of cargo-culted.
      </p>
      <p>
        <code>aspect-ratio</code> is one of the nicest modern layout primitives
        because it lets the browser reserve space before the asset arrives. Then{" "}
        <code>object-fit</code> controls how that asset behaves inside the
        frame. <code>cover</code> prioritizes a clean filled box, while{" "}
        <code>contain</code> prioritizes preserving the full image. Good
        responsive media work is often about choosing which compromise matches
        the product.
      </p>
      <p>
        In interviews, this topic is a chance to sound production-minded: you
        are not just making the image smaller with CSS, you are helping the
        browser pick the right file, preventing layout shift, and preserving the
        intended crop across devices.
      </p>
    </>
  ),
};
