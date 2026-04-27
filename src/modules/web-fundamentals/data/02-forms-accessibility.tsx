import type { LearningModule } from "./types";

export const formsAccessibility: LearningModule = {
  id: "forms-accessibility",
  title: "Forms & Accessibility",
  description:
    "Forms are the web's primary interaction mechanism. Building them accessibly isn't optional — it's the difference between a product that works for everyone and one that excludes millions of users.",
  icon: "✍️",
  order: 1,
  estimatedHours: 2,
  lessons: [
    {
      id: "form-basics",
      moduleId: "forms-accessibility",
      title: "Building HTML Forms",
      summary:
        "Deep dive into form elements — their correct markup, validation attributes, and the label patterns that make forms usable by everyone.",
      estimatedMinutes: 30,
      learningObjectives: [
        "Associate every input with a <label> using for/id",
        "Know all common input types and when to use them",
        "Use fieldset and legend for grouped controls (radio, checkbox)",
        "Understand button type attribute (submit, button, reset)",
        "Add native HTML validation with required, min, max, pattern",
      ],
      codeExamples: [
        {
          title: "Accessible login form",
          html: `<form action="/login" method="post" novalidate>
  <div class="field">
    <label for="email">Email address</label>
    <input
      type="email"
      id="email"
      name="email"
      autocomplete="username"
      required
      aria-describedby="email-hint"
    />
    <span id="email-hint" class="hint">We'll never share your email.</span>
  </div>

  <div class="field">
    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      autocomplete="current-password"
      required
      minlength="8"
    />
  </div>

  <button type="submit">Sign in</button>
</form>`,
        },
        {
          title: "Radio group with fieldset/legend",
          html: `<fieldset>
  <legend>Preferred contact method</legend>

  <label>
    <input type="radio" name="contact" value="email" />
    Email
  </label>

  <label>
    <input type="radio" name="contact" value="phone" />
    Phone
  </label>

  <label>
    <input type="radio" name="contact" value="sms" />
    SMS
  </label>
</fieldset>`,
        },
        {
          title: "Select, textarea, and common input types",
          html: `<!-- Select with option groups -->
<label for="country">Country</label>
<select id="country" name="country">
  <option value="">Select a country</option>
  <optgroup label="North America">
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </optgroup>
</select>

<!-- Textarea with row hint -->
<label for="bio">Bio</label>
<textarea
  id="bio"
  name="bio"
  rows="4"
  maxlength="500"
  placeholder="Tell us about yourself..."
></textarea>

<!-- Date, number, tel, url, color, range -->
<input type="date" id="dob" name="dob" />
<input type="number" id="age" name="age" min="1" max="120" step="1" />
<input type="tel" id="phone" name="phone" autocomplete="tel" />
<input type="url" id="website" name="website" />`,
        },
      ],
      commonMistakes: [
        "Using placeholder as a label replacement — placeholder disappears on typing and has very low color contrast",
        "Missing for/id association — screen readers can't programmatically link the label to its control",
        'Omitting type on buttons inside forms — the default is type="submit", which can unexpectedly submit the form',
        "Using <div> or <span> styled as buttons instead of real <button> elements — loses keyboard focus, Enter/Space, and ARIA semantics",
        "Not grouping radio/checkbox sets in <fieldset>/<legend> — makes the group's purpose invisible to assistive technology",
      ],
      interviewTips: [
        "The implicit label association (wrapping input inside label) is valid HTML and doesn't require for/id. But explicit association (for/id) is more robust for complex layouts.",
        "novalidate on the form disables browser-native validation UI without breaking the HTML5 constraint validation API — useful when you want custom error UI but still want to call form.checkValidity() in JS.",
        "autocomplete attributes are critical for password managers and autofill: username, current-password, new-password, given-name, postal-code, etc.",
      ],
      practiceTasks: [
        {
          description:
            "Build a registration form with: name, email, password, confirm password, date of birth, country (select), and a terms agreement checkbox. Every field must be correctly labelled.",
          hint: "Group the password fields in a fieldset. Use autocomplete attributes throughout.",
        },
        {
          description:
            "Open your form in a browser, tab through it using only the keyboard. Every field should be reachable and usable without a mouse.",
          hint: "You should hear each label announced as you focus each field. Missing labels = silence.",
        },
      ],
    },
    {
      id: "accessibility-fundamentals",
      moduleId: "forms-accessibility",
      title: "Accessibility Fundamentals",
      summary:
        "Accessibility (a11y) is not a separate feature — it's a quality bar. WCAG AA is the legal minimum in many jurisdictions and the baseline for professional frontend work.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Understand the four WCAG principles: Perceivable, Operable, Understandable, Robust",
        "Know the difference between ARIA roles, states, and properties",
        "Implement keyboard navigation correctly (focus order, focus trap in modals)",
        "Meet WCAG AA color contrast requirements (4.5:1 for text, 3:1 for UI components)",
        "Use aria-label, aria-labelledby, aria-describedby correctly",
      ],
      codeExamples: [
        {
          title: "ARIA labelling patterns",
          html: `<!-- aria-label: direct text label (when no visible label exists) -->
<button aria-label="Close dialog">
  <svg aria-hidden="true"><use href="#icon-x" /></svg>
</button>

<!-- aria-labelledby: points to a visible element as the label -->
<section aria-labelledby="pricing-title">
  <h2 id="pricing-title">Pricing</h2>
  <!-- aria-labelledby makes "Pricing" the section's accessible name -->
</section>

<!-- aria-describedby: supplementary description (not the name) -->
<input
  type="password"
  id="new-pw"
  aria-describedby="pw-requirements"
/>
<p id="pw-requirements">
  Must be 8+ characters with at least one number and one symbol.
</p>

<!-- aria-live: announces dynamic content updates to screen readers -->
<div aria-live="polite" aria-atomic="true" id="status">
  <!-- Injected via JS: "Form submitted successfully" -->
</div>`,
        },
        {
          title: "Focus management for modals",
          html: `<!-- A11y-correct modal pattern -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
  id="confirm-modal"
>
  <h2 id="modal-title">Confirm deletion</h2>
  <p>This action cannot be undone.</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>`,
          js: `// When modal opens:
// 1. Move focus to the modal container (or first focusable element)
// 2. Trap focus inside the modal while it's open
// 3. When modal closes, return focus to the trigger element

const modal = document.getElementById('confirm-modal');
const trigger = document.getElementById('delete-btn');

function openModal() {
  modal.removeAttribute('hidden');
  modal.focus(); // step 1
  // step 2: trap logic — listen for Tab, loop at boundary
}

function closeModal() {
  modal.setAttribute('hidden', '');
  trigger.focus(); // step 3: return focus to trigger
}`,
        },
      ],
      commonMistakes: [
        'Adding ARIA roles to semantic elements that already have them: <nav role="navigation"> is redundant',
        "Using aria-label on elements that already have visible text — the visible text and accessible name become inconsistent",
        "Removing focus outlines with outline: 0 without providing an alternative focus indicator",
        "Using tabindex values > 0 — they create a separate tab order that overrides the natural DOM order and confuse users",
        "Using color as the only way to convey information (e.g. red = error) without a secondary cue like an icon or text",
      ],
      interviewTips: [
        "WCAG 2.1 AA is the legal baseline in the US (ADA, Section 508), EU, and UK. Know the four principles: Perceivable, Operable, Understandable, Robust (POUR).",
        "The first rule of ARIA: don't use ARIA. Native semantic HTML handles most accessibility automatically. ARIA only adds what HTML can't express.",
        'tabindex="0" adds an element to the natural tab order. tabindex="-1" makes it programmatically focusable (useful for modals, drawers) but removes it from the tab order.',
      ],
      practiceTasks: [
        {
          description:
            "Run an accessibility audit on a page you've built using axe DevTools or Lighthouse. Fix every violation in the 'serious' and 'critical' categories.",
          hint: "Critical violations are typically contrast failures and missing labels. Start there.",
        },
        {
          description:
            "Build a toggle button (like a dark mode switch) that correctly announces its state. Screen readers should say 'Dark mode on' or 'Dark mode off'.",
          hint: 'Use aria-pressed="true"|"false" on the button element and update it via JS on click.',
        },
      ],
    },
    {
      id: "interactive-semantics",
      moduleId: "forms-accessibility",
      title: "Buttons, Links & Accessible Names",
      summary:
        "Interactive semantics are where many accessible UIs quietly fail. The right native element gives you correct behavior, keyboard support, and a trustworthy accessibility tree with far less code.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Choose correctly between a button and a link based on whether the user is acting or navigating",
        "Understand the difference between an accessible name and an accessible description",
        "Use visible text, label, aria-labelledby, aria-label, and aria-describedby appropriately",
        "Apply button states like disabled and aria-pressed intentionally",
        "Avoid clickable div anti-patterns that throw away native semantics and keyboard behavior",
      ],
      codeExamples: [
        {
          title: "Button vs link semantics",
          html: `<!-- Navigation: use a link -->
<a href="/settings/billing">Manage billing</a>

<!-- In-place action: use a button -->
<button type="button" aria-pressed="false">
  Save to favorites
</button>

<!-- Native disabled state -->
<button type="submit" disabled>Submitting...</button>

<!-- Avoid this anti-pattern -->
<div class="btn" onclick="openModal()">Open modal</div>`,
        },
        {
          title: "Accessible name and description patterns",
          html: `<!-- Visible text becomes the accessible name -->
<button>Download report</button>

<!-- aria-labelledby reuses existing visible text -->
<button aria-labelledby="menu-label">
  <svg aria-hidden="true"><use href="#icon-menu" /></svg>
</button>
<span id="menu-label" hidden>Open navigation menu</span>

<!-- aria-describedby adds extra context, not the name -->
<button aria-describedby="delete-warning">
  Delete account
</button>
<p id="delete-warning">This action is permanent and cannot be undone.</p>

<!-- Icon-only button: aria-label is appropriate -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true"><use href="#icon-close" /></svg>
</button>`,
        },
      ],
      commonMistakes: [
        "Using a link for an in-place action like opening a modal or toggling UI state",
        "Using a button for navigation and reimplementing links in JavaScript",
        "Applying aria-label to a control that already has clear visible text and creating an inconsistent announced name",
        "Using aria-disabled without actually disabling behavior",
        "Making a div clickable and then trying to patch in keyboard support manually",
      ],
      interviewTips: [
        "Buttons do things; links go places. That sentence answers a surprising number of interview questions correctly.",
        "Accessible name is what gets announced first. Accessible description is extra context layered on top.",
        "Prefer aria-labelledby over aria-label when visible text already exists somewhere in the UI, because it keeps spoken and visual labels aligned.",
      ],
      practiceTasks: [
        {
          description:
            "Audit a page with cards, menus, and CTA controls. Rewrite every interactive element that uses the wrong native element.",
          hint: "Ask whether the control navigates or changes state in place.",
        },
        {
          description:
            "Build a toolbar with an icon-only close button, a toggle button, and a settings link. Verify each has the correct announced role and name.",
          hint: "Use the browser accessibility tree or a screen reader to confirm what gets announced.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "accessible-login-form",
      moduleId: "forms-accessibility",
      title: "Accessible Login Form",
      difficulty: "medium",
      description:
        "Build a complete login form that meets WCAG AA accessibility requirements and passes an automated accessibility audit with zero violations.",
      targetImage: {
        src: "/wf-challenges/accessible-login-form.svg",
        alt: "Centered login card mock with heading, helper text, labeled email and password fields, checkbox, password toggle, and primary action button.",
        caption:
          "Notice the structure as much as the visuals: grouped label-input-help-error patterns, a clear primary action, and supporting secondary controls.",
      },
      requirements: [
        "Every input has an explicitly associated <label>",
        "Error messages are connected to their inputs via aria-describedby",
        "The form is fully operable by keyboard alone",
        "All text meets a minimum 4.5:1 color contrast ratio",
        "Focus indicators are visible on all interactive elements",
        "Required fields are indicated both visually and programmatically (aria-required or required attribute)",
        "Include a 'show/hide password' toggle using a <button>",
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login</title>
</head>
<body>
  <!-- Build your accessible login form here -->
</body>
</html>`,
      starterCss: `/* Base reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; min-height: 100vh; display: grid; place-items: center; background: #f5f5f5; }`,
      expectedResult:
        "A login form that passes axe/Lighthouse accessibility audit with zero violations. Every field is reachable by Tab, errors are announced by screen readers, and focus is always visible.",
      hints: [
        'Use aria-invalid="true" and aria-describedby to connect error messages to their inputs.',
        "The show/hide password button should update its aria-label or aria-pressed as the state changes.",
        "Test with VoiceOver (Mac) or NVDA (Windows) — tab through the form and listen to what gets announced.",
      ],
      bonusTasks: [
        "Add a skip-to-content link that appears on focus",
        "Implement inline validation that announces errors as you leave each field (aria-live region)",
        "Add a loading state to the submit button that's accessible (aria-busy, aria-label update)",
      ],
      conceptsCovered: [
        "form-basics",
        "accessibility-fundamentals",
        "aria",
        "keyboard-navigation",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "form-basics": () => (
    <>
      <p>
        Forms are the primary interaction mechanism on the web — they power
        login, checkout, search, settings, and every other user-driven action.
        Getting form markup right has outsized impact: the browser provides
        enormous amounts of built-in behaviour ( autocomplete, validation,
        submission) if you give it the right structure.
      </p>
      <p>
        The most important rule: every form control must have an accessible
        name. The standard way is a <code>{"<label>"}</code> element associated
        via matching <code>for</code> and <code>id</code> attributes. When a
        user focuses the input, the label text is announced by screen readers.
        It also gives you a larger click target — clicking the label focuses its
        input. Never use <code>placeholder</code> as a substitute for a label:
        placeholders disappear on typing, have low contrast, and are not
        consistently read by screen readers.
      </p>
      <p>
        The <code>type</code> attribute on <code>{"<input>"}</code> does more
        than change appearance. <code>type="email"</code> shows an email
        keyboard on mobile and provides basic format validation.{" "}
        <code>type="tel"</code> shows a numeric pad. <code>type="date"</code>{" "}
        provides a native date picker. <code>type="number"</code> accepts only
        numbers and adds increment/decrement controls. Always choose the most
        specific type — the browser (and mobile operating system) uses it to
        deliver the right keyboard and UX. For grouped controls like radio
        buttons, wrap the group in <code>{"<fieldset>"}</code> with a{" "}
        <code>{"<legend>"}</code> — this gives screen readers the group label
        they need to understand the options in context.
      </p>
      <p>
        Native validation also matters. Attributes like <code>required</code>,{" "}
        <code>minlength</code>, <code>maxlength</code>, <code>min</code>,{" "}
        <code>max</code>, and <code>pattern</code> are not just convenience
        helpers — they create a shared contract between the browser, assistive
        technology, and the user. Even if a product eventually replaces native
        validation with custom error UI, starting from the native constraints
        usually produces better keyboard behaviour, clearer semantics, and less
        brittle code.
      </p>
      <p>
        A strong form also communicates state, not just structure. Required
        fields should be identified consistently. Error messages should be tied
        to controls with <code>aria-describedby</code> or native mechanisms when
        possible. Submit buttons should remain real{" "}
        <code>{'<button type="submit">'} </code> elements, not clickable
        <code>{"<div>"}</code>s. Interviews often use forms to test whether you
        trust the platform or try to rebuild it from scratch. The best answers
        lean on native HTML first, then layer custom behaviour only where the
        browser cannot do the job.
      </p>
    </>
  ),

  "accessibility-fundamentals": () => (
    <>
      <p>
        Accessibility means building products that work for people with a range
        of abilities — including those using screen readers, keyboard-only
        navigation, voice control, or high-contrast displays. It&apos;s not a
        feature you add at the end; it&apos;s a quality bar you maintain
        throughout. In many jurisdictions (the US under ADA/Section 508, the EU
        under the EAA, the UK under the Equality Act), inaccessible web products
        are a legal liability.
      </p>
      <p>
        ARIA (Accessible Rich Internet Applications) is a set of HTML attributes
        that fill gaps where native semantics fall short. ARIA <em>roles</em>{" "}
        define what something is (<code>role="dialog"</code>,{" "}
        <code>role="alert"</code>). ARIA <em>states</em> reflect current
        conditions (<code>aria-expanded="true"</code>,{" "}
        <code>aria-checked="false"</code>). ARIA <em>properties</em> provide
        additional context (<code>aria-label</code>,{" "}
        <code>aria-describedby</code>, <code>aria-required</code>). The most
        important ARIA rule: if a native HTML element or attribute can express
        the same meaning, use that instead. <code>{"<button>"}</code> is better
        than <code>{'<div role="button" tabindex="0">'}</code> in every way.
      </p>
      <p>
        Keyboard navigation is non-negotiable. Every interactive element must be
        reachable and operable by keyboard: focusable, triggerable with
        Enter/Space, and clearly indicated when focused. Never remove focus
        outlines without replacement — use <code>:focus-visible</code> to style
        them without showing them on mouse click. For modal dialogs, focus must
        be trapped inside while open and returned to the trigger element when
        closed. These patterns keep keyboard and screen reader users from
        getting lost.
      </p>
      <p>
        The most practical accessibility workflow is to think in three layers.
        First: semantics. Are you using the correct HTML elements? Second:
        operability. Can someone reach and use the interface with only a
        keyboard? Third: announcements. If state changes, will assistive
        technology understand what changed? Most accessibility bugs come from
        skipping the first layer and trying to patch semantics later with ARIA.
      </p>
      <p>
        In interviews, accessibility knowledge stands out when it sounds
        concrete instead of moralistic. Good signals include mentioning focus
        order, visible focus styles, landmark regions, form labels, heading
        hierarchy, and reduced motion support. A weak answer says &quot;I care
        about accessibility.&quot; A strong answer says &quot;I start with
        semantic elements, verify keyboard usage, then test the experience with
        a screen reader or axe.&quot;
      </p>
    </>
  ),

  "interactive-semantics": () => (
    <>
      <p>
        Native interactive elements encode meaning and behavior at the same
        time. A link says navigation. A button says action on the current page.
        When you choose the right element, the browser gives you focus handling,
        keyboard support, semantics, and default accessibility behavior for
        free. When you choose the wrong one, you spend the implementation
        rebuilding what the platform already knew.
      </p>
      <p>
        The accessible name is the short label assistive technology announces
        first. For many native controls, visible text is enough. If the label
        exists elsewhere in the DOM,
        <code>aria-labelledby</code> can point to it. If there is no visible
        label at all,
        <code>aria-label</code> can provide one. Description is separate:{" "}
        <code>aria-describedby</code> adds guidance, warnings, or validation
        text. Keeping those ideas separate helps avoid controls that sound
        verbose or contradictory.
      </p>
      <p>
        Button vs link is one of the highest-value semantic distinctions in
        frontend work. If something opens a menu, toggles a state, submits a
        form, dismisses a toast, or launches a dialog, it should almost
        certainly be a button. If it changes the URL or takes the user somewhere
        else, it should be a link. The right answer is grounded in intent, not
        visual styling.
      </p>
      <p>
        This is also where fake controls hurt teams. Clickable cards, custom
        menu triggers, and icon-only actions are common sources of accessibility
        debt. In interviews, being able to explain how you preserve native
        semantics first and add ARIA only when HTML runs out of vocabulary is a
        very strong signal.
      </p>
    </>
  ),
};
