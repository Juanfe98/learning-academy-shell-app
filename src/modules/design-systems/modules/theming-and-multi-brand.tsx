import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const themingDiagram = String.raw`flowchart TD
  C["Component CSS<br/>uses semantic tokens only"] --> SEM["Semantic layer<br/>--color-text-default"]
  SEM --> L["Light theme<br/>maps to gray-900"]
  SEM --> D["Dark theme<br/>maps to gray-50"]
  SEM --> B1["Brand A<br/>maps to brandA primitives"]
  SEM --> B2["Brand B<br/>maps to brandB primitives"]
  L --> OUT["Same component,<br/>different output"]
  D --> OUT
  B1 --> OUT
  B2 --> OUT`;

const foucDiagram = String.raw`sequenceDiagram
  participant U as User
  participant S as Server (HTML)
  participant B as Browser
  participant R as React hydrate
  U->>S: Request page (prefers dark)
  S->>B: HTML with default light theme
  Note over B: Flash of light theme (FOUC)
  B->>R: Hydrate, read localStorage
  R->>B: Switch to dark
  Note over B: Fix: inline blocking script sets<br/>data-theme BEFORE first paint`;

export const toc: TocItem[] = [
  { id: "theming-is-remapping", title: "Theming Is Just Remapping", level: 2 },
  { id: "css-vars-engine", title: "CSS Variables: The Theming Engine", level: 2 },
  { id: "dark-mode", title: "Dark Mode Done Right", level: 2 },
  { id: "fouc", title: "Avoiding the Theme Flash (FOUC)", level: 3 },
  { id: "multi-brand", title: "Multi-Brand & White-Label", level: 2 },
  { id: "theme-contract", title: "The Theme Contract", level: 3 },
  { id: "scoping", title: "Scoped & Nested Themes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ThemingAndMultiBrand() {
  return (
    <div className="article-content">
      <p>
        Theming is where the token architecture from earlier modules pays its biggest dividend. If
        you built three-tier tokens correctly, theming — dark mode, multiple brands, white-labeling,
        high contrast — is almost free, because <strong>a theme is nothing more than a different
        mapping of semantic tokens to primitive values</strong>. If you built tokens wrong (
        components touching primitives directly), theming is a rewrite. This module shows the
        runtime-theming engine, the gotchas (especially the dreaded flash of wrong theme), and how
        to scale to many brands.
      </p>

      <h2 id="theming-is-remapping">Theming Is Just Remapping</h2>
      <p>
        Internalize this picture: components reference only <strong>semantic</strong> tokens. Each
        theme provides a different set of values for those same semantic tokens. The component code
        never changes — it doesn&rsquo;t even know which theme is active.
      </p>

      <MermaidDiagram
        chart={themingDiagram}
        title="One component, many themes"
        caption="Themes are interchangeable mappings of the semantic layer; components consume semantic tokens and are theme-agnostic by construction."
        minHeight={440}
      />

      <h2 id="css-vars-engine">CSS Variables: The Theming Engine</h2>
      <p>
        On the web, <strong>CSS custom properties are the theming engine</strong> — and they win
        over JS-based theming for a decisive reason: they <em>cascade and update at runtime with
        zero re-render</em>. Change <code>data-theme</code> on the <code>&lt;html&gt;</code> element
        and every <code>var()</code> in the subtree recomputes instantly, no React involved. This
        is why CSS-variable theming is the default for modern systems, and why JS theme objects
        (passed via context) are a worse default — they force re-renders and don&rsquo;t reach CSS
        files.
      </p>

      <CodeBlock
        code={`/* Define semantic tokens per theme, scoped by a data attribute on :root */
:root,
[data-theme="light"] {
  --color-bg-canvas: var(--gray-50);
  --color-bg-surface: #ffffff;
  --color-text-default: var(--gray-900);
  --color-action-primary: var(--blue-600);
}

[data-theme="dark"] {
  --color-bg-canvas: var(--gray-950);
  --color-bg-surface: var(--gray-900);
  --color-text-default: var(--gray-50);
  --color-action-primary: var(--blue-400);  /* lighter for dark-bg contrast */
}

/* Components never change — they only read semantic tokens: */
.card {
  background: var(--color-bg-surface);
  color: var(--color-text-default);
}`}
        lang="css"
        filename="themes.css"
      />

      <p>
        Switching themes is then a one-line DOM mutation: <code>document.documentElement.dataset.theme = &quot;dark&quot;</code>.
        No component re-renders, no prop threading. That&rsquo;s the whole engine.
      </p>

      <h2 id="dark-mode">Dark Mode Done Right</h2>
      <p>
        Dark mode is the canonical theme, and there are senior details that separate a good
        implementation from a naive one:
      </p>
      <ul>
        <li>
          <strong>Don&rsquo;t just invert.</strong> Pure black (<code>#000</code>) on pure white is
          harsh; dark themes use near-black surfaces (<code>gray-950</code>) and slightly
          desaturated, lighter accent colors so they don&rsquo;t vibrate.
        </li>
        <li>
          <strong>Re-check contrast.</strong> A pairing that passes WCAG in light mode can fail in
          dark mode. Validate both themes.
        </li>
        <li>
          <strong>Elevation flips.</strong> In light mode, elevation = shadow. In dark mode,
          shadows barely show — express elevation as <em>lighter surface tints</em> instead.
        </li>
        <li>
          <strong>Respect the system preference</strong> via <code>prefers-color-scheme</code>, but
          let users override it and persist the choice.
        </li>
      </ul>

      <CodeBlock
        code={`// Theme resolution priority: explicit user choice > system preference > default
function resolveTheme(stored: string | null): "light" | "dark" {
  if (stored === "light" || stored === "dark") return stored;        // user override
  return window.matchMedia("(prefers-color-scheme: dark)").matches    // system
    ? "dark"
    : "light";
}

// Also use color-scheme so native UI (scrollbars, form controls) matches:
// :root { color-scheme: light dark; }`}
        lang="typescript"
        filename="resolve-theme.ts"
      />

      <h3 id="fouc">Avoiding the Theme Flash (FOUC)</h3>
      <p>
        The most common theming bug in SSR apps: the server renders the default (light) theme, the
        page paints light, then React hydrates, reads <code>localStorage</code>, and switches to
        dark — producing a jarring <strong>flash of the wrong theme</strong>. React can&rsquo;t fix
        this from within because it runs after first paint.
      </p>

      <MermaidDiagram
        chart={foucDiagram}
        title="The theme-flash race condition"
        caption="The fix is a tiny blocking inline script that sets the theme attribute before the browser's first paint, ahead of React."
        minHeight={400}
      />

      <CodeBlock
        code={`// Inject a TINY blocking script in <head>, before any content renders.
// It runs synchronously before first paint — no flash. (next-themes does this.)
<script
  dangerouslySetInnerHTML={{
    __html: \`(function() {
      try {
        var t = localStorage.getItem('theme');
        var dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      } catch (e) {}
    })();\`,
  }}
/>`}
        lang="tsx"
        filename="no-flash-script.tsx"
      />

      <h2 id="multi-brand">Multi-Brand & White-Label</h2>
      <p>
        The same machinery scales to <strong>multiple brands</strong> (think a company with several
        product lines, or a white-label platform serving different customers&rsquo; branding). Each
        brand is just another value-set for the semantic tokens — possibly with its own primitive
        ramps, fonts, and radii. The components are written once and rendered under any brand.
      </p>

      <CodeBlock
        code={`/* Each brand supplies its own primitives + maps the semantic layer */
[data-brand="acme"] {
  --brand-primary: oklch(0.62 0.19 250);   /* Acme blue */
  --font-brand: "Inter", sans-serif;
  --radius-base: 8px;
}
[data-brand="globex"] {
  --brand-primary: oklch(0.55 0.20 20);    /* Globex red */
  --font-brand: "Poppins", sans-serif;
  --radius-base: 2px;                       /* sharper corners */
}
/* Semantic layer reads brand primitives; works under any [data-brand]: */
:root { --color-action-primary: var(--brand-primary); }

/* Brand AND color-scheme compose: [data-brand="acme"][data-theme="dark"] */`}
        lang="css"
        filename="multi-brand.css"
      />

      <h3 id="theme-contract">The Theme Contract</h3>
      <p>
        For multi-brand to be safe, every theme must implement the <strong>same set of semantic
        tokens</strong> — the <em>theme contract</em>. If Brand B forgets to define{" "}
        <code>--color-feedback-warning-bg</code>, components break only on that brand, often
        unnoticed until production. Zero-runtime tools enforce this at the type level:
        vanilla-extract&rsquo;s <code>createThemeContract</code> makes a missing token a{" "}
        <em>compile error</em>. That type-enforced contract is a major argument for zero-runtime
        theming in multi-brand systems.
      </p>

      <CodeBlock
        code={`// vanilla-extract: the contract is a TYPE every theme must satisfy
import { createThemeContract, createTheme } from "@vanilla-extract/css";

export const vars = createThemeContract({
  color: { actionPrimary: null, textDefault: null, feedbackWarningBg: null },
});

// Each brand MUST provide every key — omit one and it's a compile error:
export const acme = createTheme(vars, {
  color: { actionPrimary: "#3b82f6", textDefault: "#111", feedbackWarningBg: "#fef3c7" },
});`}
        lang="typescript"
        filename="theme-contract.css.ts"
      />

      <h2 id="scoping">Scoped & Nested Themes</h2>
      <p>
        Because CSS variables cascade, themes can be <strong>scoped to a subtree</strong>, not just
        the document root. A marketing banner can force a dark theme inside an otherwise-light page
        by setting <code>data-theme=&quot;dark&quot;</code> on its container — components inside
        pick up the nearest ancestor&rsquo;s values automatically. This is the &ldquo;theme
        inversion&rdquo; pattern (a dark CTA section on a light page) and it requires zero special
        component support — it falls out of the cascade for free.
      </p>

      <ArticleTable
        caption="Theming implementation choices and their tradeoffs."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>Re-render on switch?</th>
              <th>Reaches CSS files?</th>
              <th>Scoped/nested?</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CSS custom properties</td>
              <td>No</td>
              <td>Yes</td>
              <td>Yes (cascade)</td>
              <td>The default. Fast, simple.</td>
            </tr>
            <tr>
              <td>JS theme object via Context</td>
              <td>Yes (whole tree)</td>
              <td>No</td>
              <td>Yes (Provider)</td>
              <td>Needed for canvas/RN; worse for web CSS</td>
            </tr>
            <tr>
              <td>Build-time class swap</td>
              <td>No</td>
              <td>Yes</td>
              <td>Yes</td>
              <td>vanilla-extract theme classes; type-safe contract</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you implement theming and multi-brand support?'"
        intro="The interviewer wants to hear that theming falls out of token architecture, plus the SSR flash gotcha that trips up most people."
        steps={[
          "State the core insight: a theme is a remapping of semantic tokens to primitives; components consuming semantic tokens are theme-agnostic.",
          "Use CSS custom properties as the engine — they cascade and switch at runtime with zero re-render, and reach CSS files.",
          "Cover dark mode nuances: don't just invert, recheck contrast, elevation becomes surface tint, respect prefers-color-scheme with user override.",
          "Name the FOUC fix: a tiny blocking inline script sets the theme attribute before first paint, ahead of React.",
          "Scale to multi-brand via a theme contract every brand must satisfy — enforce it at compile time (e.g. vanilla-extract createThemeContract).",
        ]}
      />

      <InterviewChallenge
        title="Theme system for a white-label SaaS"
        scenario={
          <>
            You&rsquo;re building a white-label SaaS where each customer configures their own brand
            colors, logo, font, and corner radius — set at runtime from a database, not at build
            time. It&rsquo;s SSR&rsquo;d with Next.js. Customers also each need light and dark
            modes.
          </>
        }
        tasks={[
          "Design how brand values (from the DB) reach the CSS at runtime without a rebuild per customer.",
          "Explain how brand and light/dark compose without a combinatorial explosion of CSS.",
          "Address the SSR flash for both brand and theme.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Inject brand primitives as inline CSS variables on the server.</strong> Fetch
            the customer&rsquo;s brand config during SSR and render a{" "}
            <code>&lt;style&gt;:root{`{ --brand-primary: #...; --font-brand: ...; --radius-base: ...}`}&lt;/style&gt;</code>{" "}
            (or a style attribute on <code>&lt;html&gt;</code>). No per-customer build — the
            semantic layer reads these brand primitives, and the static component CSS is shared
            across all customers.
          </p>
          <p>
            <strong>Brand × theme composes for free</strong> because both are just CSS-variable
            remappings on different attributes. Light/dark is a fixed pair of semantic mappings
            shipped once; brand only supplies <em>primitives</em>. So you have N brand configs
            (data, not CSS) × 2 static theme maps — additive, not multiplicative. No CSS explosion.
          </p>
          <p>
            <strong>Flash:</strong> since brand vars are injected during SSR into the initial HTML,
            there&rsquo;s no brand flash. For light/dark, add the blocking inline script that sets{" "}
            <code>data-theme</code> from the customer&rsquo;s stored preference / system setting
            before first paint. Both resolved before paint = no FOUC.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A theme is a <strong>remapping of semantic tokens</strong> — components reading semantic
          tokens are theme-agnostic by construction.
        </li>
        <li>
          <strong>CSS custom properties</strong> are the theming engine: they cascade and switch at
          runtime with zero re-render and reach CSS files.
        </li>
        <li>
          Dark mode is more than inversion — recheck contrast, flip elevation to surface tint, and
          respect <code>prefers-color-scheme</code> with a persisted user override.
        </li>
        <li>
          Kill the SSR <strong>theme flash</strong> with a tiny blocking inline script that sets the
          theme attribute before first paint.
        </li>
        <li>
          Multi-brand scales via a <strong>theme contract</strong> every brand must satisfy;
          enforce it at compile time. Brand × theme composes additively, not multiplicatively.
        </li>
        <li>
          The cascade gives <strong>scoped/nested themes</strong> (dark section on a light page) for
          free.
        </li>
      </ul>
    </div>
  );
}
