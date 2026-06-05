import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const logicalPropsDiagram = String.raw`flowchart TD
  PHYS["Physical properties<br/>margin-left, padding-right, left:0"] --> LTR["Correct in LTR"]
  PHYS --> RTLBUG["WRONG in RTL (mirrored layout breaks)"]
  LOG["Logical properties<br/>margin-inline-start, padding-inline-end, inset-inline-start"] --> BOTH["Correct in LTR AND RTL automatically"]`;

const dirFlowDiagram = String.raw`flowchart LR
  LOCALE["Locale (ar, he, fa)"] --> DIR["dir='rtl' on <html>"]
  DIR --> LOGICAL["Logical properties flip"]
  DIR --> ICONS["Directional icons mirror"]
  DIR --> ALIGN["Text alignment flips"]
  LOGICAL --> UI["Correctly mirrored UI"]
  ICONS --> UI
  ALIGN --> UI`;

export const toc: TocItem[] = [
  { id: "why-now", title: "Why Bake This In Early", level: 2 },
  { id: "logical-properties", title: "Logical Properties: The Foundation", level: 2 },
  { id: "rtl", title: "RTL & Bidirectionality", level: 2 },
  { id: "icons-mirroring", title: "Mirroring Icons & Directional Elements", level: 2 },
  { id: "text-expansion", title: "Text Expansion & No Hardcoded Strings", level: 2 },
  { id: "formatting", title: "Locale-Aware Formatting", level: 2 },
  { id: "translation-flow", title: "Where Components Meet Translations", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function I18nRtlAndBidi() {
  return (
    <div className="article-content">
      <p>
        Internationalization is the requirement teams discover too late — usually when the company
        expands to a market that reads right-to-left (Arabic, Hebrew, Farsi) and the entire UI needs
        to mirror. Retrofitting i18n into a design system is brutal; baking it in is nearly free if
        you adopt a few habits from day one. This module covers the practices that make
        components <strong>localization-ready by construction</strong>: logical CSS properties, RTL
        support, icon mirroring, text expansion, and locale-aware formatting — all runnable.
      </p>

      <h2 id="why-now">Why Bake This In Early</h2>
      <p>
        The asymmetry is stark: writing <code>margin-inline-start</code> instead of{" "}
        <code>margin-left</code> costs nothing up front but makes RTL automatic; converting thousands
        of <code>margin-left</code>s across a component library <em>after</em> the fact is a
        multi-quarter migration. Because a design system is consumed by every app, getting i18n right
        at the system level means every product is localization-ready for free. This is one of the
        strongest arguments for the system owning these decisions.
      </p>

      <h2 id="logical-properties">Logical Properties: The Foundation</h2>
      <p>
        The single highest-leverage habit: <strong>use CSS logical properties everywhere instead of
        physical ones.</strong> Physical properties (<code>left</code>, <code>right</code>,{" "}
        <code>margin-left</code>) are tied to screen directions; logical properties (
        <code>inline-start</code>, <code>inline-end</code>, <code>block-start</code>) are tied to the{" "}
        <em>writing direction</em> and automatically flip in RTL. Adopt them as a lint-enforced rule
        and most RTL support comes for free.
      </p>

      <MermaidDiagram
        chart={logicalPropsDiagram}
        title="Physical vs logical properties"
        caption="Physical properties break when layout mirrors; logical properties follow the writing direction and work in both LTR and RTL automatically."
        minHeight={280}
      />

      <ArticleTable
        caption="Physical → logical property mapping. Use the right column everywhere."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Physical (avoid)</th><th>Logical (use)</th><th>Flips in RTL?</th></tr>
          </thead>
          <tbody>
            <tr><td><code>margin-left</code></td><td><code>margin-inline-start</code></td><td>✅ automatic</td></tr>
            <tr><td><code>padding-right</code></td><td><code>padding-inline-end</code></td><td>✅</td></tr>
            <tr><td><code>left: 0</code></td><td><code>inset-inline-start: 0</code></td><td>✅</td></tr>
            <tr><td><code>text-align: left</code></td><td><code>text-align: start</code></td><td>✅</td></tr>
            <tr><td><code>border-left</code></td><td><code>border-inline-start</code></td><td>✅</td></tr>
            <tr><td><code>width</code> / <code>height</code></td><td><code>inline-size</code> / <code>block-size</code></td><td>n/a (clarity)</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <CodeBlock
        code={`/* ❌ Physical — breaks in RTL (icon ends up on the wrong side) */
.button-with-icon { padding-left: 0.5rem; margin-right: 0.75rem; text-align: left; }

/* ✅ Logical — correct in both LTR and RTL with zero extra work */
.button-with-icon {
  padding-inline-start: var(--space-2);
  margin-inline-end: var(--space-3);
  text-align: start;
}`}
        lang="css"
        filename="logical-properties.css"
      />

      <h2 id="rtl">RTL & Bidirectionality</h2>
      <p>
        RTL is enabled by setting <code>dir=&quot;rtl&quot;</code> on the <code>&lt;html&gt;</code>{" "}
        (or a subtree). With logical properties in place, layout mirrors automatically. <strong>Don&rsquo;t
        use a separate RTL stylesheet</strong> (the old approach) — that&rsquo;s a maintenance trap.
        <strong>Bidirectional (bidi) text</strong> — mixing LTR content (a URL, a number) inside RTL
        text — is handled by the browser&rsquo;s bidi algorithm, but isolate user-generated mixed
        content with <code>dir=&quot;auto&quot;</code> or the <code>&lt;bdi&gt;</code> element to
        prevent it from scrambling surrounding text.
      </p>

      <MermaidDiagram
        chart={dirFlowDiagram}
        title="How locale drives mirroring"
        caption="Setting dir=rtl flips logical properties, mirrors directional icons, and flips alignment — producing a correctly mirrored UI."
        minHeight={260}
      />

      <CodeBlock
        code={`// Set direction from the active locale (RTL locale list is small and known)
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);
function dirFor(locale: string) {
  return RTL_LOCALES.has(locale.split("-")[0]) ? "rtl" : "ltr";
}
// <html lang={locale} dir={dirFor(locale)}>

// Isolate user content of unknown direction so it can't scramble layout:
// <span>Posted by <bdi>{userName}</bdi></span>   // bdi isolates mixed-direction names`}
        lang="tsx"
        filename="direction.tsx"
      />

      <h2 id="icons-mirroring">Mirroring Icons & Directional Elements</h2>
      <p>
        Most icons stay the same in RTL, but <strong>directional icons must mirror</strong>: a
        back-arrow, next/prev chevrons, send icon, and progress indicators point the other way in
        RTL. Logical properties don&rsquo;t flip SVG content, so mark directional icons explicitly.
        Non-directional icons (search, settings, trash) must <em>not</em> flip.
      </p>

      <CodeBlock
        code={`/* Mirror only icons marked directional, only in RTL */
[dir="rtl"] .icon--directional { transform: scaleX(-1); }

// Icon component exposes the intent:
<Icon name="arrow-left" directional />   // flips in RTL (becomes a correct "back")
<Icon name="search" />                   // never flips`}
        lang="tsx"
        filename="icon-mirroring.tsx"
      />

      <h2 id="text-expansion">Text Expansion & No Hardcoded Strings</h2>
      <p>
        Two component-design habits matter for translation. First, <strong>never hardcode user-facing
        strings</strong> inside design-system components — labels like a Pagination&rsquo;s
        &ldquo;Next&rdquo; must be props/slots so the consuming app can translate them. Second,{" "}
        <strong>design for text expansion</strong>: German and Finnish translations can be 30–40%
        longer than English, so components must not break or truncate when text grows. Avoid
        fixed-width buttons and single-line assumptions.
      </p>

      <CodeBlock
        code={`// ❌ Hardcoded English — the consuming app can't translate it
function Pagination() {
  return <nav><button>Previous</button><button>Next</button></nav>;
}

// ✅ Labels are props (with sensible defaults) so apps pass translations
interface PaginationProps {
  labels?: { previous: string; next: string; page: (n: number) => string };
}
function Pagination({ labels = defaultLabels }: PaginationProps) {
  return (
    <nav aria-label={labels.navLabel}>
      <button>{labels.previous}</button>
      <button>{labels.next}</button>
    </nav>
  );
}
/* CSS: never fix the width of a text container */
.button { min-width: 0; white-space: normal; }  /* allows expansion without clipping */`}
        lang="tsx"
        filename="text-expansion.tsx"
      />

      <h2 id="formatting">Locale-Aware Formatting</h2>
      <p>
        Numbers, currencies, dates, and pluralization differ by locale and must <em>never</em> be
        hand-formatted. Use the platform <strong><code>Intl</code></strong> APIs (and{" "}
        <code>Intl.PluralRules</code> for plurals) so components display values correctly in every
        locale. A design-system <code>Stat</code> or <code>DateLabel</code> component should format
        via <code>Intl</code> given the active locale.
      </p>

      <CodeBlock
        code={`// Locale-aware formatting — never string-concatenate dates/currency by hand
new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1234.5);
// -> "1.234,50 €"   (note comma decimal + trailing symbol)

new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(new Date());
// -> "2026年6月2日"

// Pluralization differs per language (Arabic has 6 plural forms!) -> Intl.PluralRules
const pr = new Intl.PluralRules("ar");
pr.select(0); // "zero"  -> pick the right translated message key`}
        lang="typescript"
        filename="intl-formatting.ts"
      />

      <h2 id="translation-flow">Where Components Meet Translations</h2>
      <p>
        The boundary: the <strong>design system owns layout, direction, formatting primitives, and
        translatable props</strong>; the <strong>consuming app owns the translation strings</strong>{" "}
        (via next-intl, react-i18next, FormatJS, etc.). The system should not bundle a translation
        library or strings — it should be translation-library-agnostic, accepting labels as
        props/slots and reading the active locale/direction from context.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you make a design system internationalization-ready?'"
        intro="Few candidates think about this proactively. Leading with logical properties + the retrofit-cost argument signals senior foresight."
        steps={[
          "Argue for baking it in early: logical properties cost nothing up front but retrofitting margin-left → margin-inline-start across a library is a multi-quarter migration.",
          "Foundation: use CSS logical properties everywhere (inline-start/end, text-align: start) so RTL mirrors automatically — enforce with lint, no separate RTL stylesheet.",
          "RTL via dir=rtl on <html>; isolate mixed-direction user content with <bdi>; mirror only directional icons (arrows/chevrons), never search/settings.",
          "Don't hardcode strings — make labels props/slots; design for 30–40% text expansion (no fixed-width buttons, allow wrapping).",
          "Format with Intl (NumberFormat/DateTimeFormat/PluralRules); the system owns layout/direction/formatting, the app owns translation strings (library-agnostic).",
        ]}
      />

      <InterviewChallenge
        title="Prepare the system for an Arabic launch"
        scenario={
          <>
            The company is launching in Saudi Arabia (Arabic, RTL). The design system uses{" "}
            <code>margin-left</code>/<code>padding-right</code> throughout, has &ldquo;Next&rdquo; and
            &ldquo;Back&rdquo; hardcoded in the Pagination and Wizard components, back-arrows that
            won&rsquo;t mirror, fixed-width buttons, and dates formatted by hand as{" "}
            <code>{"`${m}/${d}/${y}`"}</code>. What&rsquo;s your plan?
          </>
        }
        tasks={[
          "List the changes needed and which is the highest-leverage.",
          "Explain how RTL mirroring should work without a separate stylesheet.",
          "Handle the icons, hardcoded strings, fixed widths, and date formatting.",
        ]}
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Highest-leverage:</strong> migrate all physical properties to{" "}
          <strong>logical properties</strong> (<code>margin-inline-start</code>,{" "}
          <code>padding-inline-end</code>, <code>text-align: start</code>). This single change makes
          most of the UI mirror automatically when <code>dir=&quot;rtl&quot;</code> is set — no
          separate RTL stylesheet (that approach doubles maintenance forever). Enforce it going
          forward with a Stylelint rule banning physical properties.
        </p>
        <p>
          <strong>RTL:</strong> set <code>dir=&quot;rtl&quot;</code> on <code>&lt;html&gt;</code>{" "}
          driven by the locale; with logical properties the layout flips. Isolate user-generated
          mixed-direction content with <code>&lt;bdi&gt;</code>.
        </p>
        <p>
          <strong>Icons:</strong> mark back-arrows/chevrons as <code>directional</code> so they{" "}
          <code>scaleX(-1)</code> only in RTL; leave non-directional icons alone.{" "}
          <strong>Strings:</strong> remove hardcoded &ldquo;Next&rdquo;/&ldquo;Back&rdquo; — accept
          them as props so the app passes Arabic translations.{" "}
          <strong>Fixed widths:</strong> remove them; allow wrapping (<code>white-space: normal</code>,
          no fixed <code>width</code>) since Arabic text length differs.{" "}
          <strong>Dates:</strong> replace the manual template with{" "}
          <code>Intl.DateTimeFormat(locale)</code>, which also supports the Hijri calendar where
          needed. The system owns these primitives; the app owns the translated strings.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Bake i18n in <strong>early</strong> — logical properties cost nothing up front but
          retrofitting RTL later is a multi-quarter migration.
        </li>
        <li>
          Use <strong>CSS logical properties</strong> (<code>inline-start/end</code>,{" "}
          <code>text-align: start</code>) everywhere so RTL mirrors automatically — no separate RTL
          stylesheet.
        </li>
        <li>
          Enable RTL with <code>dir=&quot;rtl&quot;</code>; isolate mixed content with{" "}
          <code>&lt;bdi&gt;</code>; mirror <strong>only directional icons</strong>.
        </li>
        <li>
          <strong>Never hardcode strings</strong> (labels are props/slots) and design for{" "}
          <strong>30–40% text expansion</strong>.
        </li>
        <li>
          Format with <strong><code>Intl</code></strong> (numbers/dates/plurals); the system owns
          layout/direction/formatting, the app owns translation strings.
        </li>
      </ul>
    </div>
  );
}
