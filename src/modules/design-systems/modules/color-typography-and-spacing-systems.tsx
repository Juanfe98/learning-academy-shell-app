import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const colorRampDiagram = String.raw`flowchart LR
  H["Base hue<br/>brand blue"] --> R["Generate ramp<br/>50 -> 950"]
  R --> L1["50/100<br/>backgrounds, tints"]
  R --> L2["400/500/600<br/>actions, primary"]
  R --> L3["700/800/900<br/>text, borders"]
  L1 --> SEM["Map to semantic tokens"]
  L2 --> SEM
  L3 --> SEM`;

const spacingScaleDiagram = String.raw`flowchart TD
  B["Base unit = 4px"] --> S1["space-1 = 4px"]
  B --> S2["space-2 = 8px"]
  B --> S3["space-3 = 12px"]
  B --> S4["space-4 = 16px"]
  B --> S6["space-6 = 24px"]
  B --> S8["space-8 = 32px"]
  S4 --> U["Used for padding, gap,<br/>margins, layout rhythm"]`;

export const toc: TocItem[] = [
  { id: "scales-not-values", title: "The Core Idea: Scales, Not Values", level: 2 },
  { id: "color", title: "Color Systems", level: 2 },
  { id: "color-ramps", title: "Building Color Ramps", level: 3 },
  { id: "oklch", title: "Why OKLCH Beats HSL", level: 3 },
  { id: "contrast", title: "Contrast & WCAG", level: 3 },
  { id: "typography", title: "Typography Systems", level: 2 },
  { id: "type-scale", title: "The Modular Type Scale", level: 3 },
  { id: "fluid-type", title: "Fluid Typography", level: 3 },
  { id: "spacing", title: "Spacing & Layout Systems", level: 2 },
  { id: "elevation", title: "Elevation & Radius", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ColorTypographyAndSpacingSystems() {
  return (
    <div className="article-content">
      <p>
        Visual coherence is not an accident — it is the product of constrained, systematic choice.
        The reason a polished UI <em>feels</em> right is that its colors, type sizes, and spacing
        all come from small, deliberate <strong>scales</strong> rather than from whatever value a
        developer typed in the moment. This module is about designing those scales so that the
        tokens from the previous module have principled values, and so that two engineers
        independently building screens produce work that looks like one product.
      </p>

      <h2 id="scales-not-values">The Core Idea: Scales, Not Values</h2>
      <p>
        The single most important principle: <strong>constrain the option space</strong>. When a
        developer can pick any padding, they pick <code>13px</code> here and <code>15px</code>{" "}
        there and the UI develops a subtle, unnameable sloppiness. When the only legal choices are{" "}
        <code>space-2</code>, <code>space-4</code>, <code>space-6</code>, the rhythm becomes
        consistent automatically. A design system trades infinite freedom for guaranteed harmony.
      </p>

      <h2 id="color">Color Systems</h2>
      <p>
        A color system is not a list of brand colors — it is a set of <strong>ramps</strong>{" "}
        (graduated shades of each hue) plus the semantic mapping that gives them roles. Every
        serious system ships ramps of 9–11 steps per hue, typically numbered{" "}
        <code>50, 100, …, 900, 950</code>.
      </p>

      <MermaidDiagram
        chart={colorRampDiagram}
        title="From hue to semantic role"
        caption="A base hue generates a full ramp; ramp steps get assigned to backgrounds, actions, and text via semantic tokens."
        minHeight={320}
      />

      <h3 id="color-ramps">Building Color Ramps</h3>
      <p>
        The numbered steps map to consistent <em>usage</em> across hues: <code>50–100</code> for
        subtle backgrounds and tints, <code>400–600</code> for interactive/primary colors,{" "}
        <code>700–900</code> for text and high-contrast borders. Because the meaning of{" "}
        &ldquo;500&rdquo; is consistent across blue, green, and red, you can swap a hue and the
        whole UI rebalances correctly.
      </p>

      <h3 id="oklch">Why OKLCH Beats HSL</h3>
      <p>
        Here is a senior-level detail interviewers love: <strong>HSL is perceptually
        non-uniform</strong>. Two HSL colors with the same lightness value can look wildly
        different in brightness (yellow at 50% lightness looks far brighter than blue at 50%). This
        makes hand-built ramps inconsistent. <strong>OKLCH</strong> (and OKLab) is a perceptually
        uniform color space: equal lightness numbers <em>look</em> equally light across hues, so
        algorithmically generated ramps stay balanced. Modern systems generate ramps in OKLCH.
      </p>

      <CodeBlock
        code={`/* OKLCH: oklch(Lightness Chroma Hue) — perceptually uniform */
:root {
  /* A blue ramp where lightness steps are evenly spaced AND look even */
  --blue-100: oklch(0.95 0.03 250);
  --blue-500: oklch(0.62 0.19 250);  /* same hue (250), varying L & C */
  --blue-900: oklch(0.30 0.10 250);
}

/* HSL pitfall: same L=50% looks brighter for yellow than blue */
.bad-yellow { background: hsl(55 100% 50%); } /* perceptually ~bright */
.bad-blue   { background: hsl(240 100% 50%); } /* perceptually ~dark  */
/* -> ramps built by stepping HSL lightness are visually uneven */`}
        lang="css"
        filename="color-spaces.css"
      />

      <h3 id="contrast">Contrast & WCAG</h3>
      <p>
        Color choices are an accessibility decision, not just aesthetics. <strong>WCAG</strong>{" "}
        contrast ratios are non-negotiable for a system used at scale: get them right once in the
        token layer and every consumer inherits compliant pairings.
      </p>

      <ArticleTable
        caption="WCAG 2.x contrast requirements your token pairings must satisfy."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Pairing</th>
              <th>AA minimum</th>
              <th>AAA minimum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Normal text (&lt; 18.66px / not bold)</td>
              <td><code>4.5 : 1</code></td>
              <td><code>7 : 1</code></td>
            </tr>
            <tr>
              <td>Large text (≥ 24px, or ≥ 18.66px bold)</td>
              <td><code>3 : 1</code></td>
              <td><code>4.5 : 1</code></td>
            </tr>
            <tr>
              <td>UI components &amp; graphical objects (borders, icons)</td>
              <td><code>3 : 1</code></td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        The practical rule: pre-validate every semantic foreground/background pairing (
        <code>color-text-default</code> on <code>color-bg-surface</code>) against these ratios as a
        CI check. WCAG 3&rsquo;s emerging <strong>APCA</strong> algorithm is more perceptually
        accurate, but AA ratios remain the legal/standard bar today.
      </p>

      <h2 id="typography">Typography Systems</h2>
      <p>
        A type system defines a finite set of text styles — each a bundle of font-size, line-height,
        weight, and letter-spacing — that compose into a hierarchy. Like color, the goal is a{" "}
        <strong>limited set of named roles</strong> (<code>display</code>, <code>heading-1</code>,{" "}
        <code>body</code>, <code>caption</code>) rather than ad-hoc sizes.
      </p>

      <h3 id="type-scale">The Modular Type Scale</h3>
      <p>
        Type sizes come from a <strong>modular scale</strong>: a base size multiplied by a constant
        ratio. A ratio of <code>1.25</code> (major third) starting at <code>16px</code> gives{" "}
        16 → 20 → 25 → 31 → 39… This geometric progression is why well-designed type hierarchies
        feel musical — the jumps are proportional, not arbitrary.
      </p>

      <CodeBlock
        code={`// Generate a modular scale programmatically
const BASE = 16;       // body size in px
const RATIO = 1.25;    // major third

const scale = (step) => BASE * Math.pow(RATIO, step);

// step 0 = 16 (body), 1 = 20, 2 = 25, 3 = 31.25, 4 = 39
const typeScale = {
  caption:   scale(-1), // 12.8
  body:      scale(0),  // 16
  heading4:  scale(1),  // 20
  heading3:  scale(2),  // 25
  heading2:  scale(3),  // 31.25
  heading1:  scale(4),  // 39
};

// Pair each size with a line-height that TIGHTENS as size grows:
// large headings ~1.1, body ~1.5 — never one global line-height.`}
        lang="javascript"
        filename="type-scale.ts"
      />

      <h3 id="fluid-type">Fluid Typography</h3>
      <p>
        Rather than swapping sizes at breakpoints, modern systems use <strong>fluid type</strong>{" "}
        with CSS <code>clamp()</code> — the size scales smoothly with the viewport between a min and
        max. This eliminates jarring jumps and reduces the number of media queries.
      </p>

      <CodeBlock
        code={`:root {
  /* clamp(MIN, PREFERRED, MAX) — scales with viewport, bounded */
  --font-size-h1: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  --font-size-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
}

h1 { font-size: var(--font-size-h1); line-height: 1.1; }
p  { font-size: var(--font-size-body); line-height: 1.6; }`}
        lang="css"
        filename="fluid-type.css"
      />

      <h2 id="spacing">Spacing & Layout Systems</h2>
      <p>
        Spacing is built on a <strong>base unit</strong> — almost always <code>4px</code> (the
        4-point grid) or <code>8px</code>. Every margin, padding, and gap is a multiple of it.
        Because the human eye reads rhythm, a consistent spacing base is what separates a
        &ldquo;designed&rdquo; layout from a &ldquo;developer&rdquo; one.
      </p>

      <MermaidDiagram
        chart={spacingScaleDiagram}
        title="The 4-point spacing scale"
        caption="Every spacing token is a multiple of a 4px base unit, applied uniformly to padding, gaps, and margins."
        minHeight={400}
      />

      <p>
        The 4-point grid is preferred over 8-point because it offers finer control for small
        components (icons, dense tables) while still being divisible. Crucially, spacing tokens get
        <em>semantic</em> aliases too: <code>space-inset-md</code> (padding inside a component),{" "}
        <code>space-stack-lg</code> (vertical gap between stacked elements),{" "}
        <code>space-inline-sm</code> (horizontal gap). Naming spacing by <em>function</em> makes
        component code self-documenting.
      </p>

      <ArticleTable
        caption="Common base-unit choices and their tradeoffs."
        minWidth={720}
      >
        <table>
          <thead>
            <tr>
              <th>Base unit</th>
              <th>Pros</th>
              <th>Cons</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>4px</code> (4-pt grid)</td>
              <td>Fine control, divisible, good for dense UI</td>
              <td>More steps to manage</td>
            </tr>
            <tr>
              <td><code>8px</code> (8-pt grid)</td>
              <td>Fewer choices, very consistent rhythm</td>
              <td>Can feel coarse for small components</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="elevation">Elevation & Radius</h2>
      <p>
        Two more systematized scales round out the visual foundation. <strong>Elevation</strong> is
        a shadow scale that communicates depth/layering (<code>shadow-elevation-1</code> for cards,{" "}
        higher levels for popovers and modals) — and in dark themes, elevation is often expressed as
        lighter surface tints rather than shadows, since shadows barely read on dark backgrounds.{" "}
        <strong>Border radius</strong> is its own small scale (<code>radius-sm/md/lg/pill</code>)
        kept consistent so corners feel intentional across components.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you design the color and spacing foundations of a design system?'"
        intro="Interviewers test whether you think in systematic scales and whether you connect aesthetics to accessibility. Lead with constraint."
        steps={[
          "State the principle: constrain the option space — scales, not arbitrary values — to guarantee visual rhythm.",
          "Color: full ramps (50–950) per hue, generated in OKLCH for perceptual uniformity, mapped to semantic roles.",
          "Tie color to accessibility: every foreground/background pairing must pass WCAG AA (4.5:1 text, 3:1 large/UI), validated in CI.",
          "Type: a modular scale (base × ratio) with tightening line-heights, optionally fluid via clamp().",
          "Spacing: a 4- or 8-point base unit, with function-named aliases (inset/stack/inline). Mention elevation and radius as their own scales.",
        ]}
      />

      <InterviewChallenge
        title="Audit a sloppy stylesheet"
        scenario={
          <>
            You inherit a codebase with these values scattered across components:{" "}
            <code>padding: 13px</code>, <code>padding: 15px</code>, <code>font-size: 17px</code>,{" "}
            <code>font-size: 23px</code>, <code>color: #4a7fd6</code>, <code>color: #4b80d8</code>,
            and <code>box-shadow: 0 2px 6px rgba(0,0,0,.12)</code> repeated 40 times with slight
            variations.
          </>
        }
        tasks={[
          "Identify what's structurally wrong and the systems you'd introduce to fix it.",
          "Propose the spacing and type scales you'd snap these values to.",
          "Explain how you'd prevent the drift from recurring after the cleanup.",
        ]}
      />
      <SolutionReveal difficulty="easy">
          <p>
            The problem is <strong>unconstrained, near-duplicate values</strong> — two blues that
            differ by one hex digit, off-grid paddings, arbitrary type sizes. Introduce three
            scales: a <strong>spacing scale</strong> on a 4px base (snap 13→12, 15→16), a{" "}
            <strong>modular type scale</strong> (snap 17→16 body, 23→25 heading), and a single{" "}
            <strong>blue ramp</strong> (collapse both blues to <code>blue-500</code>). Replace the
            repeated shadow with a <code>shadow-elevation-*</code> token.
          </p>
          <p>
            Prevent recurrence with <strong>tooling, not discipline</strong>: a Stylelint rule
            banning raw hex/px in component styles (require <code>var(--token)</code>), plus a
            contrast CI check on token pairings. If the only legal values are tokens, drift can&rsquo;t
            re-enter.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The foundation principle is <strong>scales, not values</strong> — constrain choice to
          guarantee visual rhythm.
        </li>
        <li>
          Color = <strong>ramps</strong> (50–950) per hue mapped to semantic roles; generate them
          in <strong>OKLCH</strong> for perceptual uniformity.
        </li>
        <li>
          Color pairings must meet <strong>WCAG AA</strong> (4.5:1 text, 3:1 large/UI) — enforce
          it as a CI check, not a guideline.
        </li>
        <li>
          Type uses a <strong>modular scale</strong> (base × ratio) with tightening line-heights;{" "}
          <code>clamp()</code> gives smooth fluid sizing.
        </li>
        <li>
          Spacing is built on a <strong>4- or 8-point base unit</strong> with function-named
          aliases (inset/stack/inline).
        </li>
        <li>
          <strong>Elevation</strong> and <strong>radius</strong> are their own scales; on dark
          themes, elevation reads as surface tint, not shadow.
        </li>
      </ul>
    </div>
  );
}
