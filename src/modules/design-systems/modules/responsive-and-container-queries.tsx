import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const viewportVsContainerDiagram = String.raw`flowchart TD
  subgraph Media["@media (viewport)"]
    V["Card asks: how wide is the SCREEN?"] --> VP["Same screen width = same layout<br/>even in a narrow sidebar"]
    VP --> BUG["Card breaks in narrow column"]
  end
  subgraph Container["@container (parent size)"]
    C["Card asks: how wide is MY CONTAINER?"] --> CP["Adapts to its own space"]
    CP --> WIN["Card works anywhere it's placed"]
  end`;

const breakpointDiagram = String.raw`flowchart LR
  T["Breakpoint tokens<br/>sm 640 / md 768 / lg 1024 / xl 1280"] --> MQ["@media rules"]
  T --> JS["JS useBreakpoint hook"]
  T --> CQ["@container thresholds"]
  MQ --> COMP["Consistent responsive behavior"]
  JS --> COMP
  CQ --> COMP`;

export const toc: TocItem[] = [
  { id: "responsive-system", title: "Responsiveness Needs a System Too", level: 2 },
  { id: "breakpoint-tokens", title: "Breakpoint Tokens", level: 2 },
  { id: "the-container-problem", title: "The Problem with Viewport Breakpoints", level: 2 },
  { id: "container-queries", title: "Container Queries: The Fix", level: 2 },
  { id: "building-responsive", title: "Building Container-Responsive Components", level: 2 },
  { id: "fluid", title: "Fluid Sizing Beats Breakpoints", level: 2 },
  { id: "js-breakpoints", title: "When You Need Breakpoints in JS", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ResponsiveAndContainerQueries() {
  return (
    <div className="article-content">
      <p>
        A design-system component will be dropped into a full-width hero, a 280px sidebar, a
        three-column grid, and a modal — often all in the same app. If its responsiveness is based on
        the <em>viewport</em>, it breaks in every context except the one it was designed for.{" "}
        <strong>Container queries</strong> changed this: components can now adapt to <em>their own</em>{" "}
        available space, which is exactly what a context-agnostic design-system component needs. This
        module covers the responsive system — breakpoint tokens, why viewport queries fail for
        components, container queries, and fluid sizing — with runnable code.
      </p>

      <h2 id="responsive-system">Responsiveness Needs a System Too</h2>
      <p>
        Like color and motion, responsiveness drifts without shared definitions. If every developer
        invents breakpoints (<code>@media (max-width: 743px)</code> here, <code>768px</code> there),
        layouts shift at inconsistent widths. The system defines <strong>breakpoint tokens</strong>{" "}
        once and exposes them to CSS and JS, so &ldquo;medium screen&rdquo; means the same thing
        everywhere.
      </p>

      <h2 id="breakpoint-tokens">Breakpoint Tokens</h2>
      <MermaidDiagram
        chart={breakpointDiagram}
        title="One breakpoint scale, three consumers"
        caption="Breakpoint tokens feed media queries, a JS hook, and container-query thresholds so 'medium' is consistent across the system."
        minHeight={260}
      />

      <CodeBlock
        code={`:root {
  --breakpoint-sm: 40rem;   /* 640px */
  --breakpoint-md: 48rem;   /* 768px */
  --breakpoint-lg: 64rem;   /* 1024px */
  --breakpoint-xl: 80rem;   /* 1280px */
}

// Mirror in TS for JS consumers (single source — generate from tokens.json):
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
export type Breakpoint = keyof typeof breakpoints;`}
        lang="css"
        filename="breakpoints.css"
      />

      <h2 id="the-container-problem">The Problem with Viewport Breakpoints</h2>
      <p>
        Here&rsquo;s the core insight that separates a senior answer: <strong>media queries ask about
        the viewport, but a component cares about its own container.</strong> A <code>ProductCard</code>{" "}
        styled to go two-column at <code>768px</code> viewport will wrongly go two-column even when
        placed in a 300px sidebar on a wide screen — because the screen is wide, even though the
        card&rsquo;s box is narrow. For reusable components, viewport queries are the wrong tool.
      </p>

      <MermaidDiagram
        chart={viewportVsContainerDiagram}
        title="Viewport vs container queries"
        caption="A media query asks how wide the screen is; a container query asks how wide the component's own box is — the right question for a reusable component."
        minHeight={340}
      />

      <h2 id="container-queries">Container Queries: The Fix</h2>
      <p>
        <strong>Container queries</strong> (<code>@container</code>, now baseline-supported in all
        modern browsers) let a component respond to the size of its nearest <em>containment
        context</em> instead of the viewport. You mark an element as a query container, then write
        rules based on its width. This makes components <strong>truly context-independent</strong> —
        the holy grail for a design system.
      </p>

      <CodeBlock
        code={`/* 1. Establish a containment context on the wrapper */
.card-wrapper {
  container-type: inline-size;     /* query this element's inline (width) size */
  container-name: card;            /* optional name for targeting */
}

/* 2. Style the card based on ITS OWN width, not the viewport */
.card { display: grid; gap: var(--space-3); }

@container card (min-width: 28rem) {
  .card {
    grid-template-columns: 8rem 1fr;   /* side-by-side image + text when the CARD is wide */
  }
}
/* Now the same card is stacked in a sidebar and side-by-side in a wide column — automatically. */`}
        lang="css"
        filename="container-query.css"
      />

      <h2 id="building-responsive">Building Container-Responsive Components</h2>
      <p>
        In practice, the design-system component establishes its own container and adapts internally.
        Consumers place it anywhere and it just works — no responsive props, no knowledge of where
        it lives. <strong>Container query units</strong> (<code>cqw</code>, <code>cqi</code>) even let
        you size things relative to the container.
      </p>

      <CodeBlock
        code={`export function MediaCard({ image, title, body }: MediaCardProps) {
  return (
    <div className="media-card-container">     {/* container-type: inline-size */}
      <article className="media-card">
        <img className="media-card__img" src={image} alt="" />
        <div className="media-card__content">
          <h3 className="media-card__title">{title}</h3>
          <p>{body}</p>
        </div>
      </article>
    </div>
  );
}

/* media-card.css */
.media-card-container { container-type: inline-size; }
.media-card { display: flex; flex-direction: column; gap: var(--space-2); }
.media-card__title { font-size: clamp(1rem, 4cqi, 1.5rem); }  /* sizes to CONTAINER width */

@container (min-width: 24rem) {
  .media-card { flex-direction: row; }    /* becomes horizontal when its box is wide enough */
}`}
        lang="tsx"
        filename="MediaCard.tsx"
      />

      <h2 id="fluid">Fluid Sizing Beats Breakpoints</h2>
      <p>
        The complementary technique: instead of discrete jumps at breakpoints, <strong>scale
        continuously</strong> with <code>clamp()</code>, container units, and intrinsic layout (the{" "}
        <code>auto-fit + minmax</code> grid from the layout-primitives module). Fluid approaches need
        fewer breakpoints, avoid awkward in-between states, and often eliminate media queries
        entirely. Prefer fluid first; reach for breakpoints only for genuine layout <em>reflows</em>.
      </p>

      <ArticleTable
        caption="Responsive techniques and when to use each."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Technique</th><th>Responds to</th><th>Best for</th></tr>
          </thead>
          <tbody>
            <tr><td><code>@media</code></td><td>Viewport</td><td>Page-level layout, global nav</td></tr>
            <tr><td><code>@container</code></td><td>Component&rsquo;s own box</td><td>Reusable components (the default for a DS)</td></tr>
            <tr><td><code>clamp()</code> / fluid</td><td>Continuous viewport/container</td><td>Type, spacing — avoid discrete jumps</td></tr>
            <tr><td><code>auto-fit + minmax</code></td><td>Available space</td><td>Card grids without breakpoints</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="js-breakpoints">When You Need Breakpoints in JS</h2>
      <p>
        Sometimes layout decisions can&rsquo;t be CSS-only — rendering a drawer vs an inline panel,
        or a mobile vs desktop nav with different markup. Provide a <code>useBreakpoint</code> hook
        driven by the same tokens, and guard against SSR hydration mismatch (the server doesn&rsquo;t
        know the viewport).
      </p>

      <CodeBlock
        code={`import { breakpoints, type Breakpoint } from "./breakpoints";

export function useBreakpoint(bp: Breakpoint) {
  const query = \`(min-width: \${breakpoints[bp]}px)\`;
  const [matches, setMatches] = React.useState(false);   // SSR-safe default
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);                                // sync after mount (avoids hydration mismatch)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
// const isDesktop = useBreakpoint("lg");
// return isDesktop ? <SidebarNav /> : <DrawerNav />;   // different markup needs JS`}
        lang="tsx"
        filename="useBreakpoint.tsx"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do design-system components handle responsiveness?'"
        intro="The container-query insight is the senior differentiator. Most candidates only know media queries."
        steps={[
          "Define breakpoint tokens once and expose to CSS + JS so 'medium' is consistent everywhere.",
          "Make the key point: media queries ask about the VIEWPORT, but a reusable component cares about its OWN container — viewport queries break it in sidebars/grids/modals.",
          "Use @container queries so components adapt to their own box and become truly context-independent — the right default for a design system.",
          "Prefer fluid sizing (clamp, container units, auto-fit+minmax) to reduce breakpoints and avoid awkward in-between states.",
          "Provide a useBreakpoint hook (SSR-safe) only when layout decisions need different markup, not just different styles.",
        ]}
      />

      <InterviewChallenge
        title="A card that breaks in the sidebar"
        scenario={
          <>
            A <code>ProductCard</code> uses <code>@media (min-width: 768px)</code> to switch from
            stacked to side-by-side. It looks great in the main grid, but when placed in a 300px
            sidebar on a desktop, it goes side-by-side and overflows — because the <em>viewport</em>{" "}
            is wide even though the card&rsquo;s column is narrow. Fix it so the card works in any
            container.
          </>
        }
        tasks={[
          "Explain precisely why the media query causes the bug.",
          "Rewrite it so the card adapts to its own width.",
          "Note how you'd make the title size fluid relative to the card.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Why:</strong> <code>@media</code> queries the viewport. In a desktop sidebar the
          viewport is &gt;768px, so the rule fires and the card goes side-by-side — even though its
          own box is only 300px. The card is asking the wrong question (&ldquo;how wide is the
          screen?&rdquo; instead of &ldquo;how wide am I?&rdquo;).
        </p>
        <CodeBlock
          code={`.product-card-container { container-type: inline-size; }

.product-card { display: flex; flex-direction: column; gap: var(--space-3); }

@container (min-width: 28rem) {        /* asks about the CARD's box, not the screen */
  .product-card { flex-direction: row; }
}

.product-card__title { font-size: clamp(1rem, 5cqi, 1.4rem); }  /* fluid, relative to container width */`}
          lang="css"
        />
        <p>
          Now the card stays stacked in the 300px sidebar and goes side-by-side only when its <em>own</em>{" "}
          container exceeds 28rem — correct in every context. Using <code>cqi</code> units, the title
          scales to the card&rsquo;s width, not the viewport.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Define <strong>breakpoint tokens</strong> once, exposed to CSS and JS, so responsive
          behavior is consistent.
        </li>
        <li>
          <strong>Media queries ask about the viewport</strong>; a reusable component cares about its
          own container — viewport queries break components in sidebars, grids, and modals.
        </li>
        <li>
          Use <strong><code>@container</code> queries</strong> so components adapt to their own box —
          the right default for context-independent design-system components.
        </li>
        <li>
          Prefer <strong>fluid sizing</strong> (<code>clamp</code>, container units,{" "}
          <code>auto-fit + minmax</code>) to reduce breakpoints and awkward in-between states.
        </li>
        <li>
          Provide an <strong>SSR-safe <code>useBreakpoint</code> hook</strong> only when different
          markup (not just styles) is required.
        </li>
      </ul>
    </div>
  );
}
