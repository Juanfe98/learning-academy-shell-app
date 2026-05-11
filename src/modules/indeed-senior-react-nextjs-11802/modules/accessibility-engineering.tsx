import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const semanticStructureDiagram = String.raw`flowchart TD
    SKIP["Skip Navigation Link\n(first focusable element)"]
    HEADER["<header>\n site logo, search, nav"]
    NAV["<nav aria-label='Main navigation'>\n category links"]
    MAIN["<main id='main'>\n the article content"]
    ARTICLE["<article>\n <h1> Article Title\n <p> Author, Date\n article body sections"]
    ASIDE["<aside aria-label='Related articles'>\n related article cards"]
    FOOTER["<footer>\n site-wide links"]

    SKIP --> HEADER
    HEADER --> NAV
    NAV --> MAIN
    MAIN --> ARTICLE
    MAIN --> ASIDE
    MAIN --> FOOTER`;

const focusModalDiagram = String.raw`sequenceDiagram
    participant U as User
    participant T as Trigger Button
    participant M as Modal Dialog
    participant FC as First Focusable in Modal

    U->>T: Click "Search" button
    T->>M: Modal opens (aria-modal=true)
    M->>FC: Focus moves to first element\n(close button or search input)
    U->>M: Tabs through modal content
    Note over M: Focus trapped within modal
    U->>M: Presses Escape or clicks Close
    M->>T: Modal closes
    T->>T: Focus returns to trigger button`;

export const toc: TocItem[] = [
  { id: "wcag-overview", title: "WCAG 2.1 AA Overview", level: 2 },
  { id: "semantic-html", title: "Semantic HTML for a Help Center", level: 2 },
  { id: "keyboard-navigation", title: "Keyboard Navigation and Focus Management", level: 2 },
  { id: "skip-links", title: "Skip Links and Focus Rings", level: 3 },
  { id: "focus-modal", title: "Modal Focus Trapping", level: 3 },
  { id: "aria-essentials", title: "ARIA When Semantic HTML Is Not Enough", level: 2 },
  { id: "cms-content-a11y", title: "CMS Content Accessibility", level: 2 },
  { id: "image-alt-enforcement", title: "Enforcing Alt Text at the Content Type Level", level: 3 },
  { id: "form-accessibility", title: "Form Accessibility", level: 2 },
  { id: "testing-a11y", title: "Testing Accessibility", level: 2 },
  { id: "violations-table", title: "Common Violations in CMS Sites", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function AccessibilityEngineering() {
  return (
    <div className="article-content">
      <p>
        The Indeed JD lists accessibility as an explicit responsibility. This is not checkbox
        compliance — it is engineering for the 15–20% of users who rely on assistive technology,
        keyboard navigation, or have visual impairments. A Help Center with poor accessibility
        actively excludes users who need help most. This module covers WCAG 2.1 AA compliance,
        the specific patterns for CMS-driven content, and automated testing that makes regressions
        visible before they reach production.
      </p>

      <h2 id="wcag-overview">WCAG 2.1 AA Overview</h2>
      <p>
        Web Content Accessibility Guidelines 2.1 AA is the industry standard. The four principles:
      </p>
      <ul>
        <li>
          <strong>Perceivable</strong> — content must be presented in ways users can perceive. Images
          need alt text. Videos need captions. Color alone cannot convey information.
        </li>
        <li>
          <strong>Operable</strong> — all functionality must be accessible via keyboard. No keyboard
          traps. Enough time to interact. No content that causes seizures.
        </li>
        <li>
          <strong>Understandable</strong> — content must be readable and predictable. Error messages
          must explain what went wrong and how to fix it. Navigation must be consistent.
        </li>
        <li>
          <strong>Robust</strong> — content must work with current and future assistive technologies.
          Semantic HTML provides this automatically. ARIA when necessary.
        </li>
      </ul>

      <h2 id="semantic-html">Semantic HTML for a Help Center</h2>
      <MermaidDiagram
        chart={semanticStructureDiagram}
        title="Semantic HTML Structure for a Help Center Article Page"
        caption="Every landmark element tells screen reader users what region they're in. Heading hierarchy (h1 → h2 → h3) enables navigation by heading — a critical screen reader affordance."
        minHeight={460}
      />

      <pre>
        <code>{`// Correct semantic HTML for a Help Center article layout
export default function ArticleLayout() {
  return (
    <>
      {/* Skip link — first focusable element on every page */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header>
        <a href="/" aria-label="Indeed Help Center - Home">
          <Logo />
        </a>
        {/* The search form here is a supplementary search */}
        <form role="search" aria-label="Site search">
          <label htmlFor="header-search">Search</label>
          <input id="header-search" type="search" />
          <button type="submit">Search</button>
        </form>
      </header>

      {/* Distinguishable navigation landmark — label required when multiple navs exist */}
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/help/billing">Billing</a></li>
          <li><a href="/help/account">Account</a></li>
        </ul>
      </nav>

      <main id="main-content" tabIndex={-1}> {/* tabIndex=-1 allows programmatic focus */}
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/help">Help Center</a></li>
            <li><a href="/help/billing">Billing</a></li>
            <li aria-current="page">Update billing information</li>
          </ol>
        </nav>

        <article>
          {/* One h1 per page — the article title */}
          <h1>How to update your billing information</h1>

          <p>Published by <a href="/help/authors/jane">Jane Smith</a></p>

          {/* Article sections use h2 headings — never skip heading levels */}
          <section>
            <h2>Step 1: Sign in to your account</h2>
            <p>...</p>
          </section>
          <section>
            <h2>Step 2: Navigate to billing settings</h2>
            <h3>On desktop</h3>
            <p>...</p>
            <h3>On mobile</h3>
            <p>...</p>
          </section>
        </article>

        <aside aria-label="Related articles">
          <h2>Related articles</h2>
          {/* h2 is correct here — aside is a sibling of article, not a child */}
          <ul>...</ul>
        </aside>
      </main>

      <footer>
        <nav aria-label="Footer navigation">
          <ul>...</ul>
        </nav>
      </footer>
    </>
  );
}`}</code>
      </pre>

      <h2 id="keyboard-navigation">Keyboard Navigation and Focus Management</h2>

      <h3 id="skip-links">Skip Links and Focus Rings</h3>

      <pre>
        <code>{`/* Skip link — visible on focus only (off-screen by default) */
/* Must be the FIRST focusable element on the page */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 9999;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  text-decoration: none;
}

.skip-link:focus {
  left: 0; /* moves into view when keyboard users tab to it */
}

/* NEVER remove focus rings — the most common a11y regression */
/* This is wrong: */
* { outline: none; } /* ← hides keyboard focus indicator — WCAG 2.4.11 failure */
button:focus { outline: none; }

/* This is right: replace default outline with a better-styled one */
:focus-visible {
  outline: 3px solid #2557d6; /* high contrast, 3px minimum for WCAG 2.4.11 */
  outline-offset: 2px;
  border-radius: 2px;
}`}</code>
      </pre>

      <h3 id="focus-modal">Modal Focus Trapping</h3>
      <MermaidDiagram
        chart={focusModalDiagram}
        title="Focus Management for Modal Dialogs"
        caption="When a modal opens, focus must move into it. Tab must cycle within it. Escape closes it. When closed, focus returns to the trigger that opened it."
        minHeight={420}
      />

      <pre>
        <code>{`// Focus trap for the Help Center search overlay
import { useEffect, useRef } from "react";

function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Move focus into the modal when it opens
    const firstFocusable = modalRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Trap focus within the modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        // Return focus to trigger
        triggerRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = modalRef.current!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // role="dialog" + aria-modal="true" tells screen readers this is a modal
    // aria-labelledby links to the modal's visible heading
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <h2 id="search-modal-title">Search Help Center</h2>
      <button onClick={onClose} aria-label="Close search">X</button>
      <input type="search" aria-label="Search" autoFocus />
    </div>
  );
}`}</code>
      </pre>

      <h2 id="aria-essentials">ARIA When Semantic HTML Is Not Enough</h2>

      <pre>
        <code>{`// ARIA is for when semantic HTML doesn't convey the right meaning.
// Never use ARIA when a native HTML element would work.

// ❌ Wrong: semantic div with ARIA role
<div role="button" onClick={handleClick} tabIndex={0}>Submit</div>

// ✅ Right: use the button element — keyboard accessible, correct role, right
<button type="button" onClick={handleClick}>Submit</button>

// ARIA live regions — announce dynamic content changes to screen readers
// aria-live="polite": waits for user inactivity before announcing
// aria-live="assertive": announces immediately (interrupts) — for errors only

// Search results loading:
<div aria-live="polite" aria-atomic="true">
  {loading && <span>Loading results...</span>}
  {results && <span>{results.length} articles found</span>}
</div>

// Form error — use assertive because user needs to act immediately:
<div role="alert" aria-live="assertive">
  {error && <span>{error}</span>}
</div>

// Collapsible FAQ section — accordion pattern
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = \`faq-panel-\${question.replace(/\\s+/g, "-").toLowerCase()}\`;

  return (
    <div>
      <button
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={/* button id */ undefined}
        hidden={!isOpen}
      >
        {answer}
      </div>
    </div>
  );
}

// Icon buttons — always add aria-label when there is no visible text
<button aria-label="Share this article">
  <ShareIcon aria-hidden="true" /> {/* hide decorative icon from screen readers */}
</button>`}</code>
      </pre>

      <h2 id="cms-content-a11y">CMS Content Accessibility</h2>
      <p>
        The hardest part of accessibility in a CMS-driven site: you don't control the content.
        Editors can paste HTML with incorrect heading hierarchies, images without alt text, and
        color choices that fail contrast requirements. The engineering approach is to enforce
        constraints at the content model level, not try to fix bad HTML at render time.
      </p>

      <h3 id="image-alt-enforcement">Enforcing Alt Text at the Content Type Level</h3>

      <pre>
        <code>{`// In the Contentstack content type for Article:
// featured_image field should require an associated alt_text field

// Content Type field configuration (Contentstack UI):
// - Field: featured_image (File) — required
// - Field: featured_image_alt (Single Line Text) — required
//   Description: "Describe the image for screen reader users (leave blank only for decorative images)"

// In the component — use the CMS alt text, not a generated alt:
<Image
  src={article.featured_image.url}
  alt={article.featured_image_alt ?? ""} // empty string = decorative image (intentional)
  width={article.featured_image.dimension.width}
  height={article.featured_image.dimension.height}
/>

// For RTE images embedded in article body — you cannot control editor input
// Sanitize on render: if alt attribute is missing, use empty string (not the filename)
function renderRteImage(node: RteImageNode) {
  return (
    <img
      src={node.attrs.url}
      alt={node.attrs.alt ?? ""} // never use filename as alt text — it's meaningless to SR users
      width={node.attrs.width}
      height={node.attrs.height}
    />
  );
}

// Validate on publish via Contentstack webhook — reject publish if alt text is missing
// This is the most effective prevention: never let bad content reach production
async function validateBeforePublish(entry: ArticleEntry): Promise<void> {
  if (!entry.featured_image_alt && entry.featured_image) {
    throw new Error("Article cannot be published without alt text for the featured image.");
  }
}`}</code>
      </pre>

      <h2 id="form-accessibility">Form Accessibility</h2>

      <pre>
        <code>{`// Complete accessible form pattern
function AccessibleContactForm() {
  const { register, formState: { errors }, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Contact support form" noValidate>
      {/* Every input needs a label associated via htmlFor/id — NOT placeholder */}
      <div>
        <label htmlFor="email">
          Email address
          <span aria-label="required" style={{ marginLeft: "4px" }}>*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={[
            errors.email ? "email-error" : "",
            "email-hint",
          ].filter(Boolean).join(" ")}
          {...register("email")}
        />
        <span id="email-hint" style={{ fontSize: "14px", color: "#666" }}>
          We'll use this to send a confirmation
        </span>
        {errors.email && (
          <span id="email-error" role="alert" aria-live="polite" style={{ color: "#ef4444" }}>
            {errors.email.message}
          </span>
        )}
      </div>

      {/* Submit button — indicate loading state accessibly */}
      <button
        type="submit"
        aria-busy={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}`}</code>
      </pre>

      <h2 id="testing-a11y">Testing Accessibility</h2>

      <pre>
        <code>{`// 1. jest-axe: run in component unit tests
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("ArticlePage passes axe accessibility audit", async () => {
  const { container } = render(<ArticlePage article={mockArticle} />);
  const results = await axe(container, {
    rules: {
      // Customize: suppress rules that don't apply to your tech stack
      "color-contrast": { enabled: true }, // always check contrast
      "region": { enabled: false }, // may not apply if you're testing a fragment
    },
  });
  expect(results).toHaveNoViolations();
});

// 2. Playwright + @axe-core/playwright: run on full pages in CI
// pnpm add -D @axe-core/playwright
import AxeBuilder from "@axe-core/playwright";

test("article page has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/help/billing/update-billing");

  const accessibilityReport = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(accessibilityReport.violations).toEqual([]);
});

// 3. Manual testing checklist — automated tools catch ~30% of issues
// - Tab through the page: can you reach every interactive element?
// - Shift+Tab: does focus order make sense in reverse?
// - VoiceOver (Mac): Command+F5 — does the page read correctly?
// - NVDA (Windows, free): does form error announcement work?
// - Zoom to 200%: does the layout break or text overlap?`}</code>
      </pre>

      <h2 id="violations-table">Common Violations in CMS Sites</h2>

      <ArticleTable caption="The most common WCAG violations in CMS-driven sites — each one is preventable with the right engineering and content model constraints." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Violation</th>
              <th>WCAG Criterion</th>
              <th>Engineering Fix</th>
              <th>Automated Detection</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Images missing alt text</td>
              <td>1.1.1 Non-text Content (A)</td>
              <td>Require alt_text field in CMS content type; validate on publish webhook</td>
              <td>axe: "image-alt" rule</td>
            </tr>
            <tr>
              <td>Heading hierarchy skips (h1 → h3)</td>
              <td>1.3.1 Info and Relationships (A)</td>
              <td>RTE renderer enforces heading order; editorial guidelines for authors</td>
              <td>axe: "heading-order" rule</td>
            </tr>
            <tr>
              <td>Color contrast below 4.5:1</td>
              <td>1.4.3 Contrast Minimum (AA)</td>
              <td>Design system tokens enforce contrast; never let editors choose arbitrary colors</td>
              <td>axe: "color-contrast" rule</td>
            </tr>
            <tr>
              <td>Icon buttons without visible label</td>
              <td>4.1.2 Name, Role, Value (A)</td>
              <td>Add aria-label to all icon-only buttons; enforce in PR review</td>
              <td>axe: "button-name" rule</td>
            </tr>
            <tr>
              <td>Form inputs without labels</td>
              <td>1.3.1 + 4.1.2</td>
              <td>Always use label + htmlFor; placeholder alone is not a label</td>
              <td>axe: "label" rule</td>
            </tr>
            <tr>
              <td>No skip navigation link</td>
              <td>2.4.1 Bypass Blocks (A)</td>
              <td>Add skip link as first focusable element in layout</td>
              <td>axe: "bypass" rule (partial)</td>
            </tr>
            <tr>
              <td>Focus not visible (outline: none)</td>
              <td>2.4.11 Focus Appearance (AA, WCAG 2.2)</td>
              <td>Replace outline: none with custom styled outline in global CSS</td>
              <td>axe: "focus-trap" (partial), manual testing required</td>
            </tr>
            <tr>
              <td>Dynamic content not announced</td>
              <td>4.1.3 Status Messages (AA)</td>
              <td>Add aria-live="polite" to search results container, form feedback areas</td>
              <td>Manual testing only</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you ensure accessibility in a CMS-driven application where editors control the content?'"
        intro="This question has two dimensions: the engineering side (code-level patterns) and the process side (preventing bad content). Lead with the distinction — accessibility is both a technical and an editorial problem."
        steps={[
          "Start with the CMS layer: the most effective place to enforce accessibility is at the content model level, before bad content ever reaches production. I add required fields for alt text on images, enforce heading hierarchy in the rich text editor configuration, and set up publish webhooks that validate accessibility constraints before allowing the entry to go live.",
          "Describe the rendering layer: even with CMS constraints, defensive rendering matters. My rich text renderer applies alt='' (empty string, not the filename) if alt text is missing, enforces semantic heading elements, and never uses dangerouslySetInnerHTML which could inject arbitrary HTML that breaks the heading hierarchy.",
          "Explain the code-level patterns: semantic HTML first (article, nav, main, aside, header, footer), ARIA only when semantic HTML can't express the right meaning. Every form input has a label via htmlFor/id. Every icon button has an aria-label. Focus is managed on modal open/close. Skip navigation link is first on every page.",
          "Describe the testing strategy: jest-axe runs on every component in unit tests — any WCAG violation fails the test. @axe-core/playwright runs full-page scans in CI against deployed preview URLs. These catch around 30% of issues automatically. Manual keyboard testing and VoiceOver spot checks cover the rest.",
          "Close with the editorial process: accessibility is a team problem, not just an engineering problem. I work with content designers to create editorial guidelines, build Storybook stories that show accessible vs inaccessible variants, and pair with QA on screen reader testing during feature development.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Review a Help Center Article Component for Accessibility Violations"
        scenario={
          <span>
            You are reviewing a pull request for a Help Center article page component. The PR
            contains the following issues:
            <br />
            (1) The hero image is rendered as{" "}
            <code>{"<img src={article.heroImage.url} />"}</code> with no alt attribute.
            <br />
            (2) The article heading is{" "}
            <code>{"<div className='article-title'>{article.title}</div>"}</code>.
            <br />
            (3) The "Share" button is{" "}
            <code>{"<button><ShareIcon /></button>"}</code> with no text or label.
            <br />
            (4) The search box has{" "}
            <code>{"<input type='search' placeholder='Search articles...' />"}</code> and no{" "}
            <code>{"<label>"}</code> element.
            <br />
            (5) The CSS includes{" "}
            <code>{"button:focus { outline: none; }"}</code>.
          </span>
        }
        tasks={[
          "For each of the 5 issues: identify the WCAG criterion violated, the impact on users who rely on assistive technology, and write the corrected code",
          "Explain why replacing the div with h1 for the article title matters beyond screen readers — what other assistive use case does it enable?",
          "The review also includes a 'Table of Contents' navigation section that scrolls users to article sections. What ARIA attributes are needed on this landmark and its links?",
          "Describe a jest-axe test that would have caught at least 3 of these 5 issues before the PR was submitted",
          "The team uses Emotion CSS-in-JS. Rewrite the focus style as an Emotion global style that removes the browser default but replaces it with a high-contrast custom focus ring",
        ]}
        pitfalls={[
          "Using the image filename as alt text — 'hero-image-2024.jpg' is meaningless to a screen reader user",
          "Adding role='heading' to the div instead of replacing it with an h1 — ARIA roles require additional keyboard behavior that semantic elements provide automatically",
          "Using tabIndex=0 and onClick on the div to 'make it accessible' — it still lacks the keyboard behavior of a real button (Enter/Space activation, button role)",
          "Replacing outline: none with opacity: 0 — focus is still invisible to keyboard users",
        ]}
        signal="A strong answer correctly maps each violation to its WCAG criterion (image-alt → 1.1.1, heading → 1.3.1, button-name → 4.1.2, label → 1.3.1, focus visible → 2.4.11), writes the correct HTML for each fix, and demonstrates jest-axe test code that catches the violations programmatically."
      />
    </div>
  );
}
