import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart LR
  FIG["Figma / source SVGs"] --> OPT["SVGO optimize<br/>strip cruft, normalize"]
  OPT --> GEN["SVGR / codegen"]
  GEN --> COMP["React components<br/>or sprite + manifest"]
  COMP --> TREE["Tree-shakeable<br/>per-icon imports"]
  COMP --> TYPES["Typed icon names"]
  TREE --> APP["App imports only what it uses"]`;

const approachDiagram = String.raw`flowchart TD
  Q{"How are icons used?"} -->|"Many, dynamic by name,<br/>perf-critical"| SPRITE["SVG sprite<br/><use href='#id'>"]
  Q -->|"Imported statically,<br/>tree-shaking matters"| REACT["SVG -> React components<br/>(SVGR)"]
  Q -->|"Simple, few icons"| INLINE["Inline SVG components<br/>hand-authored"]`;

export const toc: TocItem[] = [
  { id: "why-system", title: "Why Icons Need a System", level: 2 },
  { id: "svg-not-fonts", title: "SVG, Not Icon Fonts", level: 2 },
  { id: "the-pipeline", title: "The Icon Pipeline", level: 2 },
  { id: "svgr", title: "SVG → Components with SVGR", level: 2 },
  { id: "sprite", title: "The Sprite Approach", level: 2 },
  { id: "currentcolor", title: "Sizing, Color & currentColor", level: 2 },
  { id: "a11y", title: "Accessible Icons", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function IconSystems() {
  return (
    <div className="article-content">
      <p>
        Icons feel trivial until you have 400 of them across 12 apps. Then the questions multiply:
        how do designers hand them off, how do they get optimized, how does an app import one without
        shipping all 400, how do they inherit color and size from context, and how are they made
        accessible? An <strong>icon system</strong> answers these with an automated pipeline from
        source SVGs to typed, tree-shakeable, token-aware components. This module builds that pipeline
        with runnable config.
      </p>

      <h2 id="why-system">Why Icons Need a System</h2>
      <p>
        Without a system, icons rot fast: designers paste SVGs into PRs, each with different
        <code>viewBox</code>es, hardcoded fills, and stray metadata; sizes are inconsistent; the same
        icon exists three times; and apps bundle the entire set to use five. The system turns icons
        into <strong>first-class, versioned assets</strong> with a single source, automated
        optimization, and a consistent component API.
      </p>

      <h2 id="svg-not-fonts">SVG, Not Icon Fonts</h2>
      <p>
        First principle: <strong>use SVG, not icon fonts.</strong> Icon fonts (FontAwesome-style
        glyph fonts) were a 2010s hack with real problems — they&rsquo;re announced as gibberish by
        screen readers, fail to render as boxes/blank when the font fails to load, can&rsquo;t do
        multicolor, and align poorly. Inline SVG is accessible, crisp, multicolor-capable,
        independently cacheable, and style-able with CSS. Every modern system uses SVG.
      </p>

      <h2 id="the-pipeline">The Icon Pipeline</h2>
      <MermaidDiagram
        chart={pipelineDiagram}
        title="Source SVG to shippable icons"
        caption="Optimize with SVGO, generate components or a sprite, expose typed names, and ship tree-shakeable per-icon imports."
        minHeight={300}
      />
      <p>
        Two delivery formats dominate, chosen by usage pattern:
      </p>
      <MermaidDiagram
        chart={approachDiagram}
        title="Choosing a delivery format"
        caption="Per-icon React components win for tree-shaking; an SVG sprite wins when icons are referenced dynamically by name at scale."
        minHeight={300}
      />

      <h2 id="svgr">SVG → Components with SVGR</h2>
      <p>
        The most common approach: <strong>SVGR</strong> transforms optimized SVGs into React
        components at build time, one per icon, enabling per-icon imports and tree-shaking. Pair it
        with SVGO for optimization. Here&rsquo;s a complete build setup:
      </p>

      <CodeBlock
        code={`// svgo.config.js — normalize and strip cruft, but KEEP viewBox and currentColor
module.exports = {
  plugins: [
    { name: "preset-default", params: { overrides: { removeViewBox: false } } },
    { name: "removeDimensions" },                 // drop width/height -> sizing via CSS
    { name: "convertColors", params: { currentColor: true } },  // fills -> currentColor
  ],
};

// package.json script: optimize, then generate typed React components
// "icons:build": "svgo -f svg-src -o svg-out && svgr --typescript --out-dir src/icons svg-out"

// SVGR output (per icon) — note currentColor + spread props for a11y/size:
export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none"
       stroke="currentColor" strokeWidth={2} {...props}>
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);`}
        lang="tsx"
        filename="icon-build.tsx"
      />

      <p>
        Wrap the generated icons in a thin <code>Icon</code> component (or barrel with a typed name
        union) so consumers get a consistent API and TypeScript autocomplete of valid icon names:
      </p>

      <CodeBlock
        code={`import * as icons from "./icons";          // generated set

export type IconName = keyof typeof icons;   // typed union of all icon names

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: "sm" | "md" | "lg";                 // token-based sizes
  title?: string;                            // accessible name (optional)
}
const SIZE = { sm: "1rem", md: "1.25rem", lg: "1.5rem" };

export function Icon({ name, size = "md", title, ...props }: IconProps) {
  const Svg = icons[name];
  return (
    <Svg
      width={SIZE[size]} height={SIZE[size]}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}   // decorative by default
      focusable={false}
      {...props}
    />
  );
}
// <Icon name="search" />            -> decorative, hidden from AT
// <Icon name="trash" title="Delete" /> -> announced "Delete"`}
        lang="tsx"
        filename="Icon.tsx"
      />

      <h2 id="sprite">The Sprite Approach</h2>
      <p>
        For very large sets used dynamically by name, an <strong>SVG sprite</strong> can win:
        all icons live in one cached file as <code>&lt;symbol&gt;</code>s, and you reference them
        with <code>&lt;use href=&quot;#icon-search&quot;/&gt;</code>. The whole set is one HTTP
        request (cached), and rendering an icon costs almost nothing — but you ship every icon
        regardless of use (no tree-shaking), so it suits apps that use most of the set.
      </p>

      <CodeBlock
        code={`// sprite.svg (generated from the icon set)
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>...</symbol>
  <symbol id="icon-trash" viewBox="0 0 24 24">...</symbol>
</svg>

// Icon component referencing the sprite (one cached request for all icons):
export function Icon({ name, size = "md", title }: IconProps) {
  return (
    <svg width={SIZE[size]} height={SIZE[size]} aria-hidden={!title} aria-label={title}
         role={title ? "img" : undefined} fill="currentColor">
      <use href={\`/sprite.svg#icon-\${name}\`} />
    </svg>
  );
}`}
        lang="tsx"
        filename="sprite-icon.tsx"
      />

      <ArticleTable
        caption="Per-icon components vs sprite — pick by usage pattern."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Tree-shakeable</th>
              <th>Requests</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Per-icon components (SVGR)</td>
              <td>✅ ship only used icons</td>
              <td>Inlined in JS</td>
              <td>Apps using a subset; tree-shaking matters</td>
            </tr>
            <tr>
              <td>SVG sprite + <code>&lt;use&gt;</code></td>
              <td>❌ ships whole set</td>
              <td>1 cached file</td>
              <td>Large sets used broadly; dynamic by name</td>
            </tr>
            <tr>
              <td>Icon fonts</td>
              <td>❌</td>
              <td>Font file</td>
              <td>Avoid — a11y &amp; rendering problems</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="currentcolor">Sizing, Color & currentColor</h2>
      <p>
        Two tricks make icons feel native. <strong><code>currentColor</code></strong>: set fills/strokes
        to <code>currentColor</code> so an icon inherits its parent&rsquo;s text color automatically —
        a red button&rsquo;s icon is red, no prop needed. <strong>Sizing in <code>em</code></strong>{" "}
        (or token sizes): an icon sized <code>1em</code> scales with the surrounding font-size, so it
        visually matches adjacent text. These two defaults eliminate 90% of icon styling props.
      </p>

      <h2 id="a11y">Accessible Icons</h2>
      <p>
        The rule: <strong>decorative icons must be hidden from assistive tech; meaningful icons need
        an accessible name.</strong> A decorative icon next to a text label gets{" "}
        <code>aria-hidden=&quot;true&quot;</code> (the label already conveys meaning). An icon-only
        button needs an accessible name — either <code>aria-label</code> on the button or{" "}
        <code>title</code> on the icon. Default icons to decorative (hidden) so the dangerous case —
        an unlabeled meaningful icon — requires an explicit opt-in, and always set{" "}
        <code>focusable=&quot;false&quot;</code> (IE/legacy SVG focus quirk).
      </p>

      <CodeBlock
        code={`// Decorative — label conveys meaning, icon hidden:
<button><Icon name="plus" /> Add item</button>

// Icon-only — the BUTTON carries the accessible name:
<button aria-label="Add item"><Icon name="plus" /></button>

// Standalone meaningful icon (e.g. a status): give it a title
<Icon name="error" title="Error" />`}
        lang="tsx"
        filename="icon-a11y.tsx"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you build an icon system?'"
        intro="Shows whether you've shipped a real system. Cover SVG-over-fonts, the build pipeline, tree-shaking, and the a11y default."
        steps={[
          "SVG, never icon fonts: fonts break a11y (announced as gibberish), fail as blank boxes, can't do multicolor.",
          "Build a pipeline: SVGO optimize (keep viewBox, convert fills to currentColor) → SVGR generate per-icon React components → typed icon-name union.",
          "Choose delivery by usage: per-icon components for tree-shaking; SVG sprite + <use> for large sets used broadly.",
          "Make icons inherit context: currentColor for color, em/token sizes for scale — eliminates most styling props.",
          "A11y default: icons decorative (aria-hidden) by default; meaningful ones need an accessible name; icon-only buttons carry aria-label.",
        ]}
      />

      <InterviewChallenge
        title="Audit a broken icon setup"
        scenario={
          <>
            A team ships icons as an icon font. Screen readers read random characters where icons
            are, icons sometimes render as empty boxes on slow connections, the bundle includes all
            600 glyphs to use 20, designers hand-paste SVGs with hardcoded <code>fill=&quot;#333&quot;</code>{" "}
            into PRs, and icon-only buttons have no labels. Fix it.
          </>
        }
        tasks={[
          "Identify each problem's root cause.",
          "Design the replacement pipeline and delivery format.",
          "Specify the color, sizing, and accessibility defaults you'd enforce.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Root causes:</strong> icon <em>font</em> → gibberish in screen readers + blank
          boxes on font-load failure; whole-font load → no tree-shaking (600 glyphs for 20);
          hardcoded <code>fill=&quot;#333&quot;</code> → icons can&rsquo;t inherit context color;
          no labels on icon-only buttons → unusable with AT.
        </p>
        <p>
          <strong>Replacement:</strong> move to <em>SVG</em>. Pipeline: SVGO (keep viewBox, convert
          fills to <code>currentColor</code>, strip dimensions) → SVGR → per-icon React components
          with a typed <code>IconName</code> union, so apps import only what they use (tree-shaking
          fixes the 600-for-20 problem). If most icons are used app-wide and referenced dynamically,
          consider a sprite instead.
        </p>
        <p>
          <strong>Enforced defaults:</strong> all icons use <code>currentColor</code> (inherit text
          color) and <code>em</code>/token sizes (scale with font-size); icons are{" "}
          <code>aria-hidden</code> by default; meaningful icons require a <code>title</code>; a lint
          rule flags icon-only buttons without an accessible name. Designers hand off through the
          source-SVG folder, not pasted into components — the pipeline owns optimization.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use <strong>SVG, never icon fonts</strong> — fonts break accessibility, fail as blank
          boxes, and can&rsquo;t do multicolor.
        </li>
        <li>
          Build a <strong>pipeline</strong>: SVGO optimize → SVGR generate per-icon components →
          typed icon-name union.
        </li>
        <li>
          Choose delivery by usage: <strong>per-icon components</strong> for tree-shaking,{" "}
          <strong>sprite</strong> for large broadly-used sets.
        </li>
        <li>
          Use <strong><code>currentColor</code></strong> and <strong><code>em</code>/token sizes</strong>{" "}
          so icons inherit context color and scale — eliminating most styling props.
        </li>
        <li>
          A11y default: <strong>decorative (aria-hidden) by default</strong>; meaningful icons need
          an accessible name; icon-only buttons carry <code>aria-label</code>.
        </li>
      </ul>
    </div>
  );
}
