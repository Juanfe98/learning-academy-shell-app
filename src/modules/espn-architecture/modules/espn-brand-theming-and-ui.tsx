import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const tokenPipelineDiagram = String.raw`flowchart LR
  F["Figma variables<br/>ESPN_COLOR + ESPN_TYPE"] --> G["Manual GitHub Action<br/>sync-figma-to-tokens.yml"]
  G --> J["figma-export.json<br/>variable IDs, no hex"] --> SD["Style Dictionary<br/>scripts/build.ts"]
  SD --> T2["dist/espn.json<br/>espnTokens"] --> P["espnPreset<br/>theme.extend spread"]
  P --> B["Per-app Tailwind build"] --> C["Compiled CSS<br/>literal hsl baked in"]
  SD --> T1["dist/espn.css"] -.->|"Storybook only"| SB["Needs a .espn ancestor<br/>absent in both apps"]`;

const parallelPluginsDiagram = String.raw`flowchart TD
  C1["Brand-neutral component<br/>renders className primary-button"] --> V["Semantic vocabulary<br/>one name, three value sets"]
  V --> D["plugins/disney.ts<br/>background brandBright cyan"] --> DB["Disney+ build"]
  V --> E["plugins/espn.ts<br/>background secondary near-white"] --> EB["ESPN build"]
  V --> H["plugins/hulu.ts<br/>inverseSurface plus weight 500"] --> HB["Hulu build"]
  EB --> N["No brand prop, no provider<br/>the brand lives entirely in CSS"]`;

const fontWeightDefectDiagram = String.raw`flowchart TD
  F["Figma weight name<br/>Cond Heavy"] --> M["fontWeightMap in transforms.ts<br/>thin to heavy, no condheavy key"]
  M -->|"lookup misses, fallback returns raw value"| T["dist/espn.css<br/>fontWeightDisplay = Cond Heavy"]
  T --> A["Commerce reads the token"] --> A2["Ships font-weight Cond Heavy<br/>invalid, browser discards it"]
  A2 --> A3["Display type falls back to inherited weight"]
  T --> B["Marketing ignores it<br/>hard-codes font-black"] --> B2["Ships 900<br/>right answer, wrong reason"] --> B3["Defect masked on the reviewed surface"]`;

const breakpointSingletonDiagram = String.raw`flowchart TD
  M["Any import of shared/breakpoints/config.ts"] --> S["Module scope runs<br/>currentConfig = createBreakpointConfig disney"]
  S --> Q{"Has configureBreakpoints espn run yet?"}
  Q -->|"Yes: application-layout module scope"| OK["ESPN screens<br/>lg 1025px, Tailwind defaults elsewhere"]
  Q -->|"No: unit test, story, GSSP helper"| BAD["Disney+ screens<br/>sm 441 md 769 xl 1291"]
  BAD --> W["Corrupted imageWidthBaseSizes<br/>wrong Ripcut widths"] --> Z["Silent: no error, wrong pixels"]
  R["resetBreakpoints reverts to disney<br/>not to the current tenant"] --> S`;

export const toc: TocItem[] = [
  { id: "colour-correction", title: "ESPN Is Not Red in Code", level: 2 },
  { id: "where-it-lives", title: "Where the Design System Lives", level: 2 },
  { id: "token-pipeline", title: "The Token Pipeline", level: 2 },
  { id: "theme-is-tiny", title: "The Theme Is Eight Lines", level: 2 },
  { id: "one-exception", title: "The One Exception: Stitches", level: 2 },
  { id: "no-light-theme", title: "ESPN Has No Light Theme", level: 2 },
  { id: "shared-vs-brand", title: "Shared-vs-Brand Strategy", level: 2 },
  { id: "type-divergence", title: "The Type Ramp Divergence", level: 2 },
  { id: "fonts-and-assets", title: "Fonts and Assets", level: 2 },
  { id: "stitch-not-stitches", title: "Stitch Is Not Stitches", level: 2 },
  { id: "defects", title: "Confirmed Defects", level: 2 },
  { id: "defect-weight", title: "Case 1: Font Weight", level: 3 },
  { id: "defect-breakpoints", title: "Case 2: Breakpoints", level: 3 },
  { id: "defect-latent", title: "Cases 3 and 4: Latent and Leaky", level: 3 },
  { id: "storybook-vrt", title: "Storybook and Visual Regression", level: 2 },
  { id: "a11y-responsive", title: "Accessibility and Responsive", level: 2 },
  { id: "gotchas", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Restyle an ESPN Surface", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnBrandThemingAndUi() {
  return (
    <div className="article-content">
      <p>
        Three wrong instincts for an ESPN restyle: a ThemeProvider that does not
        exist, a brand colour assumed red, breakpoints read before layout init.
      </p>

      <h2 id="colour-correction">ESPN Is Not Red in Code</h2>
      <CodeBlock
        code={`.espn {
  --colorsBrand: hsl(219, 90%, 66%);        /* #5A91F6 */
  --colorsBrandBright: hsl(219, 90%, 66%);  /* the same blue again */
  --colorsAction: hsl(219, 90%, 66%);       /* and again */
  --colorsError: hsl(0, 100%, 62%);         /* semantic red, not brand */
  --colorsSurface: hsl(220, 9%, 7%);        /* near-black by default */
  --colorsSecondary: hsl(240, 20%, 98%);    /* near-white */
}`}
        lang="css"
        filename="packages/cgi/cgi-design-tokens/dist/espn.css"
      />
      <p>
        No <code>#D50A0A</code> or <code>#CC0000</code> exists in the pipeline,
        yet the belief has a basis. Three places a brand colour hides:
      </p>
      <ul>
        <li>
          <strong>The brand token</strong> is the blue above, from Figma — what{" "}
          <code>bg-brand</code> compiles to.
        </li>
        <li>
          <strong>The logo</strong> is a remote{" "}
          <code>logo-red.&lt;hash&gt;.svg</code>, a background image at lines
          36, 1090 and 1149 of the ESPN commerce Tailwind config. The red lives
          inside the asset; no token carries it.
        </li>
        <li>
          <strong>A stale README</strong> claims <code>#CC0000</code> at{" "}
          <code>apps/marketing-unified/espn/README.md:52</code> — its only
          occurrence, in a file that also misplaces breakpoints.
        </li>
      </ul>
      <CodeBlock
        code={`// ESPN — a white pill on a dark surface, no brand colour involved
'.primary-button': {
  backgroundColor: baseColors.secondary,   // near-white
  color: baseColors.onSecondary,           // near-black
},`}
        lang="typescript"
        filename="packages/marketing/growth-components/tailwind/plugins/espn.ts"
      />
      <p>
        So the <strong>primary button is not brand-coloured at all</strong>.
        Whether brand, brandBright and action sharing one blue is intent is{" "}
        <strong>unverified</strong> — that answer is in Figma.
      </p>

      <h2 id="where-it-lives">Where the Design System Lives</h2>
      <ArticleTable
        caption="It lives in the CGI package tree, not the marketing one: packages/marketing/styles advertises tri-brand styling but has no ESPN tenant directory and one dependent."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>ESPN?</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>cgi/cgi-design-tokens, cgi/cgi-design-components</td>
              <td>Yes</td>
              <td>Token source of truth plus 23 brand-neutral components</td>
            </tr>
            <tr>
              <td>marketing/growth-components, cgi/commerce-base</td>
              <td>Yes</td>
              <td>ESPN plugin, fonts, breakpoints; Stitches ESPN theme</td>
            </tr>
            <tr>
              <td>marketing/styles, marketing/ui</td>
              <td>No</td>
              <td>Vanilla Extract and Disney+-only libraries</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="token-pipeline">The Token Pipeline</h2>
      <MermaidDiagram
        chart={tokenPipelineDiagram}
        title="Figma to Compiled CSS"
        caption="The token package stores no hex codes, only Figma variable IDs. The JSON path bakes literals into each app; the CSS-variable path is Storybook-only."
        minHeight={400}
      />

      <h2 id="theme-is-tiny">The Theme Is Eight Lines</h2>
      <CodeBlock
        code={`// packages/cgi/cgi-design-components/src/themes/espn.ts
export const espnTheme: ThemeConfig = { extend: { ...espnTokens } };
// src/presets/espn.ts
export default { theme: espnTheme };
// apps/marketing-unified/espn/tailwind.config.cjs — the whole brand selection
module.exports = { plugins: [espnPlugin], presets: [espnPreset] };`}
        lang="typescript"
        filename="packages/cgi/cgi-design-components/src/themes/espn.ts"
      />
      <p>
        The preset carries <strong>resolved values</strong>, so compiled CSS
        holds literal <code>hsl(...)</code> and there is{" "}
        <strong>no espn class on the DOM</strong>. Each app is a single-tenant
        build with colours baked in — legitimate, but it forecloses a
        user-toggled theme, a palette A/B test without a rebuild, and two brands
        on one page.
      </p>

      <h2 id="one-exception">The One Exception: Stitches</h2>
      <CodeBlock
        code={`// initialize default theme outside of React rendering lifecycle which can cause
// this value to be resolved AFTER the first render leaving the page
// inappropriately styled. See WEB-2277
const defaultClassName = createTheme(espnTheme.theme).className;
<body className={defaultClassName}>`}
        lang="tsx"
        filename="apps/commerce/espn/pages/_document.page.tsx"
      />
      <p>
        Commerce is themed twice: beside Tailwind sits a legacy CSS-in-JS layer
        with a <strong>PRODUCT-keyed theme map</strong> resolved at module
        scope, because theming after hydration produced a ticketed flash of
        unthemed content. Moving that line into the component regresses
        WEB-2277, and <code>preflight: false</code> stops Tailwind clobbering
        Stitches.
      </p>

      <h2 id="no-light-theme">ESPN Has No Light Theme</h2>
      <CodeBlock
        code={`const tokenSets: Array<ThemeConfiguration> = [
  { themeName: 'disney',       dataTheme: 'dark',  sourceFiles: [/* ... */] },
  { themeName: 'disney-light', dataTheme: 'light', sourceFiles: [/* ... */] },
  { themeName: 'espn',                             sourceFiles: [/* ... */] },
];
selector: dataTheme ? \`.\${themeName}, [data-theme="\${dataTheme}"]\` : \`.\${themeName}\`,`}
        lang="typescript"
        filename="packages/cgi/cgi-design-tokens/scripts/build.ts"
      />
      <p>
        ESPN alone has no <code>dataTheme</code>, so it emits a bare{" "}
        <code>.espn</code> where Disney+ emits{" "}
        <code>.disney, [data-theme=&quot;dark&quot;]</code>. Theming by{" "}
        <code>[data-theme]</code> gets <strong>zero</strong> ESPN variables, and
        the Storybook toolbar offers a light option whose stylesheet was never
        generated — ESPN plus light 404s onto an unstyled canvas.
      </p>

      <h2 id="shared-vs-brand">Shared-vs-Brand Strategy</h2>
      <MermaidDiagram
        chart={parallelPluginsDiagram}
        title="Three Parallel Plugins, One Class Vocabulary"
        caption="The component never learns which brand it renders — the class name is the contract and the plugin supplies the values."
        minHeight={550}
      />
      <p>
        Three plugins publish an{" "}
        <strong>identical vocabulary of semantic class names</strong> with
        different values, and commerce-base hard-codes names like{" "}
        <code>.common-text-display-large</code> that every tenant config must
        define — a{" "}
        <strong>very large implicit contract nothing type-checks</strong>, where
        a new class renders silently unstyled on any tenant that omits it.
      </p>

      <h2 id="type-divergence">The Type Ramp Divergence</h2>
      <CodeBlock
        code={`// ESPN — plugins/espn.ts
h1: { '@apply text-onSurface display-small': {} },
h2: { '@apply text-onSurface headline-xxlarge': {} },

// Disney+ — plugins/disney.ts
h1: { '@apply text-onSurface headline-xxlarge': {} },

// ESPN alone switches family AND weight mid-ramp:
'.headline-large': '@apply font-ignite          font-bold  ...'
'.display-small':  '@apply font-igniteCondensed font-black ...'`}
        lang="typescript"
        filename="packages/marketing/growth-components/tailwind/plugins/espn.ts"
      />
      <p>
        Identical Stitch markup renders{" "}
        <strong>one ramp step larger and in a different family</strong> on ESPN,
        so shared components reasoning about heading size are brand-sensitive.
        ESPN and Hulu are token-driven; Disney+ hard-codes pixels.
      </p>
      <ArticleTable
        caption="Brand tokens and typography read from the built JSON outputs, not from documentation."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>ESPN</th>
              <th>Disney+</th>
              <th>Hulu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>colors.brand</td>
              <td>hsl 219 90 66 — blue</td>
              <td>hsl 191 93 27 — teal</td>
              <td>hsl 151 82 40 — green</td>
            </tr>
            <tr>
              <td>Ramp families</td>
              <td>Three Ignite faces over BentonSans</td>
              <td>One: Inspire</td>
              <td>One: Graphik</td>
            </tr>
            <tr>
              <td>fontWeight.displayLarge</td>
              <td>Cond Heavy — invalid</td>
              <td>600</td>
              <td>500</td>
            </tr>
            <tr>
              <td>Sizing / light theme</td>
              <td>Tokens / none</td>
              <td>Pixels / yes</td>
              <td>Tokens / yes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="fonts-and-assets">Fonts and Assets</h2>
      <p>
        ESPN loads fonts through <strong>two separate pipelines</strong>:
        marketing takes three families from <code>a.espncdn.com</code>, commerce
        five from <code>static-assets.bamgrid.com</code>. The{" "}
        <strong>family names deliberately do not match</strong> — marketing
        exposes font-ignite and font-benton while the tokens name the same faces
        ESPN Ignite Display and BentonSans, so use aliases in marketing and
        tokens in commerce. Also, <code>getFontFace</code> drops preload and
        fontDisplay, and commerce carries an <strong>orphaned family</strong>,
        Tungsten-Bold — <strong>unverified</strong> whether live.
      </p>

      <h2 id="stitch-not-stitches">Stitch Is Not Stitches</h2>
      <p>
        <strong>Stitches</strong> is the legacy CSS-in-JS library styling
        commerce-base. <strong>Stitch</strong> is the{" "}
        <strong>CMS rendering engine</strong> for marketing, turning Cannonball
        data into React components. Similar names, zero overlap.
      </p>
      <p>
        ESPN uses Stitch fully, yet its entire customisation is three registry
        keys: <code>entitledContent</code>, a slider adapter and an image srcset
        generator. Crucially, <strong>smart adapter</strong> tooling and every
        generator skill around it exist <strong>only for Disney+</strong>, so{" "}
        <strong>adapter migration is out of scope for ESPN</strong>.
      </p>

      <h2 id="defects">Confirmed Defects</h2>
      <ArticleTable
        caption="Confirmed in code, with severity and impacted app. The missing espn-light stylesheet is a fifth. Only three claims in this module are unverified: the blue's design intent, Tungsten-Bold, and the font-weight fix's blast radius."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Defect</th>
              <th>Root cause</th>
              <th>Severity / impacted app</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>font-weight: Cond Heavy</td>
              <td>No condheavy key; fallback ships the raw string</td>
              <td>High — commerce/espn ships it broken</td>
            </tr>
            <tr>
              <td>Breakpoints default to Disney+</td>
              <td>Mutable module state; reset reverts to disney</td>
              <td>High — marketing-unified/espn and its tests</td>
            </tr>
            <tr>
              <td>Class groups built from Disney tokens</td>
              <td>generateClassGroups(disneyTokens) for all brands</td>
              <td>Low but latent — design-system consumers</td>
            </tr>
            <tr>
              <td>Disney+ asset paths; dotless fill-info-hover</td>
              <td>Copy-paste from Disney+; a typo</td>
              <td>Medium, low — commerce/espn</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="defect-weight">Case 1: Font Weight</h3>
      <CodeBlock
        code={`const fontWeightMap: Record<string, string> = {
  thin: '100', extralight: '200', light: '300', normal: '400', regular: '400',
  medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900',
  heavy: '900', // Figma sometimes exports heavy font weight as "heavy"
};
// Figma sometimes returns semibold as "Semi Bold" so we need to trim whitespace
return fontWeightMap[value.toLowerCase().replaceAll(' ', '')] || value;`}
        lang="typescript"
        filename="packages/cgi/cgi-design-tokens/src/config/transforms.ts"
      />
      <MermaidDiagram
        chart={fontWeightDefectDiagram}
        title="One Missing Key, Two Divergent Downstream Reactions"
        caption="The marketing workaround is why nobody noticed — the surface designers review most looks correct."
        minHeight={550}
      />
      <p>
        <code>&quot;Cond Heavy&quot;</code> normalises to <code>condheavy</code>
        , not a key, so <code>|| value</code> emits the raw string. A permissive
        fallback turned a missing mapping into valid-looking output, and a
        workaround hid it on the loudest surface. Fixing it applies a weight
        currently ignored, so the blast radius is <strong>unverified</strong>.
      </p>

      <h3 id="defect-breakpoints">Case 2: Breakpoints</h3>
      <CodeBlock
        code={`// Default to Disney+ for backward compatibility (matches old Context default)
let currentConfig: BreakpointConfig = createBreakpointConfig('disney');

/** Returns Disney+ breakpoints if configureBreakpoints() hasn't been called. */
export const getBreakpoints = (): BreakpointConfig => currentConfig;

/** Reset breakpoints to Disney+ defaults. Intended for test teardown. */
export const resetBreakpoints = (): void =>
  { currentConfig = createBreakpointConfig('disney'); };  // not the tenant`}
        lang="typescript"
        filename="packages/marketing/growth-components/src/shared/breakpoints/config.ts"
      />
      <MermaidDiagram
        chart={breakpointSingletonDiagram}
        title="Reading Breakpoints Before Initialisation"
        caption="Every failure path here is silent — you get Disney+ pixel values with no error to tell you."
        minHeight={550}
      />
      <p>
        ESPN activates it at module scope in the application layout, but its
        override set is one entry (<code>lg: 1025px</code>) where Disney+
        overrides five screens. Read <code>getBreakpoints()</code> earlier and
        you get sm 441 / md 769 / xl 1291 plus a corrupted{" "}
        <code>imageWidthBaseSizes</code>, so the app requests{" "}
        <strong>wrong Ripcut widths</strong>. Configure the tenant in test
        setup; reset returns the module to Disney+.
      </p>

      <h3 id="defect-latent">Cases 3 and 4: Latent and Leaky</h3>
      <CodeBlock
        code={`// tokens are consistently defined across tenants, so utilizing Disney here does not matter
export const designComponentsTwMerge = extendTailwindMerge({
  extend: { classGroups: generateClassGroups(disneyTokens) },
});
// apps/commerce/espn/tailwind.config.cjs — an ESPN utility on a Disney+ asset
'.bg-pause-icon': { backgroundImage: 'url(".../product/disneyplus/...svg")' },
// and 400 lines earlier, missing its leading dot, so it matches nothing:
'fill-info-hover': { fill: 'hsl(0, 0%, 98%)' },`}
        lang="typescript"
        filename="packages/cgi/cgi-design-components/src/styles/utils.ts"
      />
      <p>
        The merge assumption holds <strong>today</strong> — all three brands
        expose the same 17 groups and key set — so it is harmless, yet{" "}
        <strong>load-bearing and untested</strong>: if ESPN gains a token Disney
        lacks, conflicting classes both survive and styling turns source-order
        dependent. The asset rule is a real leak, the dotless rule is dead, and
        nothing asserts ESPN utilities use ESPN assets.
      </p>

      <h2 id="storybook-vrt">Storybook and Visual Regression</h2>
      <CodeBlock
        code={`{ "test:storybook": "... SAUCE_VISUAL_BRANCH='main'; npx test-storybook"; exit 0;" }`}
        lang="json"
        filename="packages/cgi/commerce-base/package.json"
      />
      <p>
        Be honest: <strong>visual coverage for ESPN is thin</strong>. Sauce
        Visual is wired into one package, the branch is hard-coded, and the
        command ends in <code>exit 0</code>, so{" "}
        <strong>failures never fail the job</strong>.
      </p>
      <ul>
        <li>
          <strong>growth-components</strong> — ESPN is the default tenant, with
          per-tenant CSS pre-generated then hot-swapped by replacing a link
          element. <strong>stitch</strong> and <strong>cgi-footer</strong>{" "}
          render ESPN too; marketing has no Sauce wiring at all.
        </li>
        <li>
          <strong>commerce-base</strong> — yes, but its ESPN config assigns a
          fresh theme object, <strong>discarding theme.extend</strong>, losing
          animations and the logo. <strong>cgi-design-components</strong> cannot
          render ESPN at all (themePresets holds only disney and hulu,
          WEB-23464), and no ESPN commerce Storybook exists.
        </li>
      </ul>

      <h2 id="a11y-responsive">Accessibility and Responsive</h2>
      <CodeBlock
        code={`focus-visible:outline-[2px] focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-focusIndicator`}
        lang="text"
        filename="focus-ring-classes.txt"
      />
      <p>
        Every interactive primitive repeats the string above rather than using{" "}
        <code>:focus</code>; FlipCard is the exception, using border and text
        colour. <code>useFocusRestoration</code> has a branch for ESPN and Hulu,
        which unmount the modal on close, guarded so a hydration remount is not
        mistaken for a real open. Axe runs in every ESPN Storybook, and
        convention is <strong>mobile-first</strong>: md-gated scaling, logical
        properties.
      </p>

      <h2 id="gotchas">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>Two incompatible token-delivery modes coexist.</strong> The
          app config gets literals needing no DOM class; the package config
          generates <code>var(--colorsX)</code>, resolving only inside a{" "}
          <code>.espn</code> ancestor. Copy a class list from a story into the
          app and colours work by accident or not at all.
        </li>
        <li>
          <strong>The espn class is never on the DOM in production</strong>, so
          adding it to the html element reveals nothing unless{" "}
          <code>dist/espn.css</code> is loaded — it is not. Commerce puts a
          Stitches hash on body; marketing puts nothing.
        </li>
        <li>
          <strong>Commerce ships all four themes&apos; font faces</strong> — the
          fontReferences reduce has no tenant filter, so a font-family typo can
          silently resolve to a Disney+ or Hulu face rather than failing.
        </li>
        <li>
          <strong>Stitch registry gaps fail silently</strong>; ESPN buttons are
          pill-shaped by token; <code>espnChampionshipGold</code> sits in the{" "}
          <em>base</em> Stitches theme; and specificity escalation exists only
          in Storybook, so use <code>designComponentsTwMerge</code> in
          commerce-base or lose the custom class groups.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how does multi-brand theming work in this monorepo?"
        intro="A weak answer describes a ThemeProvider and CSS variables because that is the familiar pattern. A strong answer names the actual mechanism, then explains what the choice costs."
        steps={[
          "Open with the layers: Figma variables become a token package via Style Dictionary, the token package becomes a Tailwind preset, and each app names one preset in its build config. Three of the four layers are brand-agnostic.",
          "State the consequence: because the preset carries resolved values, colours are baked in as literals at compile time. No ThemeProvider, no CSS-variable indirection, no brand class on the DOM in production.",
          "Justify it — the tenant is fixed per deployment, so runtime indirection buys nothing — then name what it forecloses: no user-toggled theme, no palette A/B test without a rebuild, no two brands on one page.",
          "Name the one exception and why: the legacy CSS-in-JS PRODUCT-keyed theme map in commerce, resolved at module scope in the document because resolving during render caused a ticketed flash of unthemed content.",
          "Close on the contract: brand-neutral components reference semantic class names and three parallel plugins supply different values for the same names — elegant decoupling, but a large implicit contract nothing type-checks. If pressed for a defect, give the font-weight chain: a permissive fallback in the weight map ships invalid CSS in commerce while a marketing workaround hides it.",
        ]}
      />

      <h2 id="challenge">Challenge: Restyle an ESPN Surface</h2>
      <InterviewChallenge
        title="Ship a new ESPN promo card without breaking the other two brands"
        scenario={
          <>
            You must add a promo card to the ESPN marketing landing page and the
            ESPN commerce billing page. Design supplies a brand-accent border, a
            display-tier headline, a primary button and an icon; the mock is
            captioned &quot;ESPN red.&quot; A teammate suggests wrapping the
            card in a ThemeProvider, and your unit test for the card&apos;s
            responsive image widths passes locally but produces the wrong srcset
            in the app.
          </>
        }
        tasks={[
          "Resolve the colour brief: what the brand token actually is, where the red comes from, and what you will render for the primary button.",
          "Explain why the ThemeProvider suggestion cannot work, and name the mechanism you will use on each surface instead.",
          "Name the two files you must edit and why each surface needs a separate edit.",
          "Diagnose the failing image test: why it passes in isolation but produces wrong widths, and the two calls that fix it.",
          "Decide which font-family reference belongs on each surface, state the trap in crossing them, and say what visual coverage you will actually get.",
        ]}
        pitfalls={[
          "Reaching for a runtime theme switch — none exists in production, and adding one is an architecture change, not a styling change.",
          "Using bg-brand expecting red. It compiles to a blue literal.",
          "Adding a semantic class to the shared component without defining it in the ESPN commerce Tailwind config — it renders silently unstyled.",
          "Copying a class list out of a Storybook story: Storybook CSS is CSS-variable based, app CSS is literal-value based. And the design-system Storybook cannot render the ESPN theme at all.",
        ]}
        signal="A strong candidate corrects the colour premise from the token output rather than documentation, names the preset-plus-plugin mechanism instead of a provider, remembers commerce and marketing are two separate contracts, and diagnoses the breakpoints singleton unprompted."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Colour and mechanism.</strong> The brand token is hsl 219 90
          66 — blue; the red is the logo asset, and the button follows{" "}
          <code>.primary-button</code> (near-white on near-black). Brand is
          chosen at build time by the preset, so there is no provider to wrap:
          add semantic classes to the ESPN plugin in growth-components, and
          separately to <code>apps/commerce/espn/tailwind.config.cjs</code> —
          two independent implementations of one vocabulary, so omitting the
          class in commerce yields an unstyled card with no build error.
        </p>
        <p>
          <strong>Test, fonts, coverage.</strong> Breakpoints are a mutable
          singleton initialised to Disney+; an isolated test never imports the
          application layout, so <code>getBreakpoints()</code> returns Disney+
          screens and wrong Ripcut widths — configure in setup, reset in
          teardown. Marketing aliases point at <code>a.espncdn.com</code> and
          commerce tokens at <code>static-assets.bamgrid.com</code>, so crossing
          them silently resolves to a Disney+ or Hulu face. Expect no visual
          gate.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          ESPN&apos;s brand token is a blue, hsl 219 90 66. The only red is the
          logo SVG asset, <code>#CC0000</code> survives in one stale README
          line, and the primary button renders near-white on near-black.
        </li>
        <li>
          The design system lives in the CGI package tree, generated from Figma
          by Style Dictionary; the marketing Vanilla Extract package has no ESPN
          tenant despite two READMEs claiming otherwise.
        </li>
        <li>
          The theme is an eight-line Tailwind preset of resolved values: no
          ThemeProvider, no runtime switch, each app a single-tenant build. The
          one exception is a legacy CSS-in-JS theme map applied at module scope
          to avoid a ticketed first-render flash.
        </li>
        <li>
          Brand lives in CSS: three parallel plugins publish identical semantic
          class names with different values. The cost is a very large implicit
          contract — a 1,567-line commerce config — that nothing type-checks.
        </li>
        <li>
          The defects are the lesson: a permissive fallback ships invalid CSS
          that a marketing workaround hides; a breakpoints singleton defaults to
          and resets to Disney+; class-merge groups from Disney tokens are right
          only by coincidence; and visual regression never fails the job.
        </li>
        <li>
          Stitch is the CMS renderer, unrelated to the Stitches CSS-in-JS
          library. ESPN uses it fully with three registry overrides, and
          smart-adapter tooling is Disney+-only, so adapter migration is out of
          scope.
        </li>
      </ul>
    </div>
  );
}
