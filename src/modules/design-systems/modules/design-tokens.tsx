import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const tokenTiersDiagram = String.raw`flowchart LR
  subgraph T1["Tier 1: Primitive / Global"]
    P1["blue-500 = #3b82f6"]
    P2["space-4 = 16px"]
    P3["font-size-3 = 1rem"]
  end
  subgraph T2["Tier 2: Semantic / Alias"]
    S1["color-action-primary<br/>-> blue-500"]
    S2["space-inset-md<br/>-> space-4"]
    S3["text-body<br/>-> font-size-3"]
  end
  subgraph T3["Tier 3: Component"]
    C1["button-bg<br/>-> color-action-primary"]
    C2["button-padding-x<br/>-> space-inset-md"]
  end
  P1 --> S1 --> C1
  P2 --> S2 --> C2
  P3 --> S3`;

const buildPipelineDiagram = String.raw`flowchart TD
  SRC["tokens.json<br/>(DTCG / single source)"] --> SD["Style Dictionary<br/>transform + format"]
  SD --> CSS["tokens.css<br/>:root custom properties"]
  SD --> TS["tokens.ts<br/>typed JS object"]
  SD --> IOS["tokens.swift<br/>iOS"]
  SD --> AND["colors.xml<br/>Android"]
  CSS --> WEB["Web app"]
  TS --> WEB
  IOS --> NATIVE["Native apps"]
  AND --> NATIVE`;

export const toc: TocItem[] = [
  { id: "what-are-tokens", title: "What Tokens Actually Are", level: 2 },
  { id: "tiers", title: "The Three-Tier Architecture", level: 2 },
  { id: "why-tiers", title: "Why Three Tiers and Not One", level: 3 },
  { id: "naming", title: "Naming Tokens", level: 2 },
  { id: "format", title: "The DTCG Format & Single Source", level: 2 },
  { id: "build", title: "The Build Pipeline: Style Dictionary", level: 2 },
  { id: "consuming", title: "Consuming Tokens in Code", level: 2 },
  { id: "pitfalls", title: "Common Pitfalls", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DesignTokens() {
  return (
    <div className="article-content">
      <p>
        Design tokens are the atoms of a design system — the named, platform-agnostic values that
        encode every visual decision: <code>#3b82f6</code> becomes <code>color-action-primary</code>,{" "}
        <code>16px</code> becomes <code>space-4</code>. The mental model that matters:{" "}
        <strong>a token is a variable with intent</strong>. Hardcoding <code>#3b82f6</code> in a
        component throws away the <em>why</em>; a token preserves it, and that preserved intent is
        what makes theming, rebranding, and cross-platform output possible at all. Tokens are
        where a design system becomes a system instead of a stylesheet.
      </p>

      <h2 id="what-are-tokens">What Tokens Actually Are</h2>
      <p>
        A token is a key-value pair plus metadata: a name, a value, a type, and often a
        description. Critically, tokens are stored in a <strong>platform-neutral format</strong>{" "}
        (usually JSON) and <em>transformed</em> into whatever each platform needs — CSS custom
        properties for the web, Swift for iOS, XML for Android. The source never knows or cares
        what consumes it.
      </p>

      <CodeBlock
        code={`{
  "color": {
    "blue": {
      "500": { "$value": "#3b82f6", "$type": "color" }
    }
  },
  "space": {
    "4": { "$value": "16px", "$type": "dimension" }
  }
}`}
        lang="json"
        filename="primitives.tokens.json"
      />

      <p>
        That same JSON becomes <code>--color-blue-500: #3b82f6;</code> on the web and{" "}
        <code>static let colorBlue500 = UIColor(...)</code> on iOS. <strong>One definition, every
        platform.</strong> This is the headline reason large multi-platform companies (Salesforce,
        Adobe, Shopify) treat tokens as foundational infrastructure.
      </p>

      <h2 id="tiers">The Three-Tier Architecture</h2>
      <p>
        The single most important concept in token architecture is <strong>tiering</strong> — and
        it&rsquo;s the thing junior engineers most often get wrong. Tokens reference other tokens
        in layers:
      </p>

      <MermaidDiagram
        chart={tokenTiersDiagram}
        title="The three token tiers"
        caption="Primitive tokens hold raw values; semantic tokens give them meaning; component tokens bind meaning to a specific component."
        minHeight={420}
      />

      <ul>
        <li>
          <strong>Tier 1 — Primitive / Global tokens:</strong> raw, context-free values.{" "}
          <code>blue-500</code>, <code>space-4</code>, <code>font-size-3</code>. These are the
          palette. They should <em>never</em> be used directly in components.
        </li>
        <li>
          <strong>Tier 2 — Semantic / Alias tokens:</strong> intent-named, pointing at primitives.{" "}
          <code>color-action-primary → blue-500</code>, <code>color-text-default</code>,{" "}
          <code>space-inset-md</code>. This is the layer components consume.
        </li>
        <li>
          <strong>Tier 3 — Component tokens:</strong> scoped to one component.{" "}
          <code>button-bg → color-action-primary</code>. Optional, but invaluable for letting
          teams override one component without touching the global semantic layer.
        </li>
      </ul>

      <h3 id="why-tiers">Why Three Tiers and Not One</h3>
      <p>
        The payoff is <strong>theming and change isolation</strong>. Dark mode is just a different
        mapping of semantic tokens to primitives — <code>color-text-default</code> points at{" "}
        <code>gray-900</code> in light mode and <code>gray-50</code> in dark mode, while every
        component referencing <code>color-text-default</code> changes automatically and{" "}
        <em>knows nothing about the switch</em>. If components referenced <code>gray-900</code>{" "}
        directly, dark mode would be a find-and-replace nightmare across the whole codebase.
      </p>

      <CodeBlock
        code={`/* ❌ WRONG: component references a primitive directly */
.button {
  background: var(--color-blue-500);  /* what is blue? what does it mean? */
  color: var(--color-white);
}

/* ✅ RIGHT: component references a semantic token */
.button {
  background: var(--color-action-primary);  /* intent is explicit */
  color: var(--color-text-on-action);
}

/* Theming becomes a remap at the semantic layer — components untouched: */
:root            { --color-action-primary: var(--color-blue-500); }
[data-theme=dark]{ --color-action-primary: var(--color-blue-400); }`}
        lang="css"
        filename="tiers-in-practice.css"
      />

      <h2 id="naming">Naming Tokens</h2>
      <p>
        Naming is the hardest part of tokens because the name <em>is</em> the API. A good name
        encodes a consistent taxonomy: <code>category-property-variant-state-scale</code>. Pick a
        convention and enforce it religiously — inconsistency here makes the whole system feel
        untrustworthy.
      </p>

      <ArticleTable
        caption="A naming taxonomy applied across token categories."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Category</th>
              <th>Property</th>
              <th>Variant / state</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>color-bg-surface</code></td>
              <td>color</td>
              <td>background</td>
              <td>surface</td>
            </tr>
            <tr>
              <td><code>color-text-action-hover</code></td>
              <td>color</td>
              <td>text</td>
              <td>action / hover</td>
            </tr>
            <tr>
              <td><code>space-inset-md</code></td>
              <td>space</td>
              <td>inset (padding)</td>
              <td>medium</td>
            </tr>
            <tr>
              <td><code>radius-pill</code></td>
              <td>radius</td>
              <td>border radius</td>
              <td>pill</td>
            </tr>
            <tr>
              <td><code>shadow-elevation-3</code></td>
              <td>shadow</td>
              <td>box shadow</td>
              <td>elevation level 3</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        Two rules that save you pain: <strong>names describe role, not appearance</strong> (
        <code>color-action-primary</code>, never <code>color-blue</code> — the blue might become
        green next year), and <strong>scales use abstract steps</strong> (<code>md</code>,{" "}
        <code>100/200/300</code>) not absolute values (<code>16px</code>), so the value can change
        without the name lying.
      </p>

      <h2 id="format">The DTCG Format & Single Source</h2>
      <p>
        The <strong>Design Tokens Community Group (DTCG)</strong> format is the emerging W3C
        standard for token files — the <code>$value</code> / <code>$type</code> keys you saw
        above. Standardizing on it means tooling (Figma plugins, Style Dictionary, Tokens Studio)
        can all read and write the same files. References use curly-brace syntax:
      </p>

      <CodeBlock
        code={`{
  "color": {
    "blue": { "500": { "$value": "#3b82f6", "$type": "color" } },
    "action": {
      "primary": {
        "$value": "{color.blue.500}",
        "$type": "color",
        "$description": "Primary call-to-action background"
      }
    }
  }
}`}
        lang="json"
        filename="semantic.tokens.json"
      />

      <p>
        The <code>{`{color.blue.500}`}</code> reference is the tiering link expressed in data. The
        build tool resolves these references when it transforms the tokens for each platform.
      </p>

      <h2 id="build">The Build Pipeline: Style Dictionary</h2>
      <p>
        <strong>Style Dictionary</strong> (by Amazon) is the de facto standard build tool. It
        reads your token JSON, resolves references, applies <em>transforms</em> (e.g. convert{" "}
        <code>16px</code> → <code>1rem</code>, or hex → UIColor), and runs <em>formats</em> to emit
        platform files. The flow:
      </p>

      <MermaidDiagram
        chart={buildPipelineDiagram}
        title="Token build pipeline"
        caption="One JSON source fans out to CSS, TypeScript, and native platform files through a single transform step."
        minHeight={440}
      />

      <CodeBlock
        code={`// style-dictionary.config.js
export default {
  source: ["tokens/**/*.tokens.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/",
      files: [{
        destination: "tokens.css",
        format: "css/variables",      // emits :root { --color-action-primary: #3b82f6; }
        options: { outputReferences: true }, // keep var() references, not flattened values
      }],
    },
    ts: {
      transformGroup: "js",
      buildPath: "dist/",
      files: [{
        destination: "tokens.ts",
        format: "javascript/es6",     // export const ColorActionPrimary = "#3b82f6";
      }],
    },
  },
};`}
        lang="javascript"
        filename="style-dictionary.config.js"
      />

      <p>
        The <code>outputReferences: true</code> option is subtle but important: it preserves the
        tiering as <code>var()</code> chains in the CSS output (
        <code>--color-action-primary: var(--color-blue-500)</code>), which is exactly what makes
        runtime theming via CSS variables work. Flatten it and you lose runtime theming.
      </p>

      <h2 id="consuming">Consuming Tokens in Code</h2>
      <p>
        On the web, the strongest pattern is <strong>CSS custom properties</strong> — they cascade,
        they can be overridden at runtime per-theme or per-component, and they require no JS. A
        typed TS export is useful for places CSS can&rsquo;t reach (canvas, inline styles computed
        in JS, React Native).
      </p>

      <CodeBlock
        code={`// Web: prefer CSS custom properties (runtime-themeable, zero JS)
.card {
  background: var(--color-bg-surface);
  padding: var(--space-inset-lg);
  border-radius: var(--radius-md);
}

// JS contexts that can't use CSS vars: import the typed token object
import { ColorActionPrimary, SpaceInsetMd } from "@acme/tokens";

const chartConfig = {
  series: { color: ColorActionPrimary },   // canvas can't read CSS vars
  padding: SpaceInsetMd,
};`}
        lang="typescript"
        filename="consuming-tokens.ts"
      />

      <h3 id="pitfalls">Common Pitfalls</h3>
      <ul>
        <li>
          <strong>Skipping the semantic tier</strong> — components reference primitives, theming
          becomes impossible. The number-one token mistake.
        </li>
        <li>
          <strong>Appearance-based names</strong> — <code>color-blue</code> instead of{" "}
          <code>color-action-primary</code>. The name lies the moment the brand color changes.
        </li>
        <li>
          <strong>Over-tiering</strong> — five layers of aliases nobody can trace. Three tiers is
          the sweet spot; component tokens only where override needs are real.
        </li>
        <li>
          <strong>Flattening references at build time</strong> — kills runtime theming. Keep{" "}
          <code>outputReferences</code> on.
        </li>
        <li>
          <strong>Tokens that aren&rsquo;t the source of truth</strong> — if designers edit Figma
          and engineers hand-edit JSON separately, they drift. One must generate the other.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Explain your design token architecture.'"
        intro="Interviewers want to hear the three-tier model and, crucially, WHY it exists. Anyone can say 'we have tokens'; few can explain the indirection."
        steps={[
          "Define a token as a named value with intent, stored platform-neutral and transformed per platform.",
          "Lay out the three tiers: primitive (raw values) → semantic (intent: color-action-primary) → component (button-bg).",
          "Justify the indirection with theming: dark mode is just a remap of semantic→primitive, and components never change.",
          "Mention naming by role not appearance, and the DTCG format + Style Dictionary as the build pipeline.",
          "Name a failure mode: components referencing primitives directly, which makes theming a global find-and-replace.",
        ]}
      />

      <InterviewChallenge
        title="Design a token set for a themeable alert"
        scenario={
          <>
            You need an <code>Alert</code> component with <code>info</code>, <code>success</code>,{" "}
            <code>warning</code>, and <code>error</code> variants. It must support light mode, dark
            mode, and a future high-contrast mode — without rewriting the component for each.
          </>
        }
        tasks={[
          "Sketch the primitive, semantic, and component tokens you'd define.",
          "Show how dark mode and high-contrast mode are added WITHOUT touching the Alert component.",
          "Explain why you would NOT name a token color-alert-yellow.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Primitives:</strong> a full color ramp per hue —{" "}
            <code>yellow-100…900</code>, <code>green-100…900</code>, etc.{" "}
            <strong>Semantic:</strong> intent tokens per status —{" "}
            <code>color-feedback-warning-bg</code>, <code>color-feedback-warning-text</code>,{" "}
            <code>color-feedback-warning-border</code> (repeat for info/success/error).{" "}
            <strong>Component (optional):</strong> <code>alert-bg → color-feedback-warning-bg</code>{" "}
            etc., so an Alert can be retuned without affecting other components using feedback
            colors.
          </p>
          <CodeBlock
            code={`:root {
  --color-feedback-warning-bg: var(--yellow-100);
  --color-feedback-warning-text: var(--yellow-900);
}
[data-theme="dark"] {
  --color-feedback-warning-bg: var(--yellow-900);
  --color-feedback-warning-text: var(--yellow-100);
}
[data-theme="hc"] { /* high contrast: just another remap */
  --color-feedback-warning-bg: #000;
  --color-feedback-warning-text: var(--yellow-300);
}
/* Alert.css references ONLY semantic tokens — never changes: */
.alert--warning {
  background: var(--color-feedback-warning-bg);
  color: var(--color-feedback-warning-text);
}`}
            lang="css"
          />
          <p>
            Naming it <code>color-alert-yellow</code> is wrong because it encodes{" "}
            <em>appearance</em>, not <em>role</em>. In dark mode the &ldquo;yellow&rdquo; bg is
            nearly black — the name would be a lie. <code>color-feedback-warning-bg</code> stays
            true regardless of the actual hue.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A token is a <strong>named value with intent</strong>, stored platform-neutral and
          transformed per platform — one source, every platform.
        </li>
        <li>
          Use <strong>three tiers</strong>: primitive (raw) → semantic (intent) → component.
          Components consume the <strong>semantic</strong> layer, never primitives.
        </li>
        <li>
          Tiering exists for <strong>theming and change isolation</strong> — dark mode is a remap
          of semantic→primitive with zero component changes.
        </li>
        <li>
          Name tokens by <strong>role, not appearance</strong>, with a consistent taxonomy.
        </li>
        <li>
          Standardize on the <strong>DTCG format</strong> and build with{" "}
          <strong>Style Dictionary</strong>; keep <code>outputReferences</code> on to preserve
          runtime theming.
        </li>
        <li>
          One artifact must be the source of truth — Figma and code must not drift independently.
        </li>
      </ul>
    </div>
  );
}
