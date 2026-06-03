import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const domTreeDiagram = String.raw`flowchart TD
  DOC["document"]
  BODY["&lt;body&gt;"]
  HOST["&lt;user-card&gt; (shadow host)"]
  SHADOW["# shadow-root (shadow tree)"]
  STYLE["&lt;style&gt; (scoped CSS)"]
  WRAP["&lt;div class='card'&gt;"]
  NAME["&lt;span class='name'&gt;"]
  BTN["&lt;button&gt;"]
  LIGHT1["&lt;p&gt; (light DOM sibling)"]

  DOC --> BODY
  BODY --> HOST
  BODY --> LIGHT1
  HOST -->|"shadow boundary"| SHADOW
  SHADOW --> STYLE
  SHADOW --> WRAP
  WRAP --> NAME
  WRAP --> BTN

  style SHADOW fill:#1e293b,stroke:#f97316,color:#f1f5f9
  style HOST fill:#0f172a,stroke:#f97316,color:#f1f5f9`;

const styleScopingDiagram = String.raw`flowchart LR
  subgraph Outside ["Light DOM (page styles)"]
    PAGE_CSS[".card { color: red }"]
    PAGE_EL["&lt;div class='card'&gt;\nPage element"]
  end

  subgraph Shadow ["Shadow Tree"]
    SHADOW_CSS[".card { color: blue }"]
    SHADOW_EL["&lt;div class='card'&gt;\nShadow element"]
  end

  subgraph Crossing ["What crosses the boundary?"]
    VARS["CSS custom properties\n--primary-color: #f97316"]
    PART["::part(button) selector"]
    INHERIT["Inherited properties\n(font-family, color via :host)"]
  end

  PAGE_CSS -->|"❌ blocked"| SHADOW_EL
  SHADOW_CSS -->|"❌ blocked"| PAGE_EL
  PAGE_CSS -->|"✅ applies"| PAGE_EL
  SHADOW_CSS -->|"✅ applies"| SHADOW_EL
  Crossing -->|"✅ crosses"| SHADOW_EL`;

export const toc: TocItem[] = [
  { id: "what-is-shadow-dom", title: "What Shadow DOM Actually Is", level: 2 },
  { id: "attaching-shadow", title: "Attaching a Shadow Root", level: 2 },
  { id: "open-vs-closed", title: "open vs closed Mode", level: 3 },
  { id: "dom-tree-diagram", title: "Light DOM vs Shadow DOM Tree", level: 3 },
  { id: "style-encapsulation", title: "Style Encapsulation", level: 2 },
  { id: "style-scoping-diagram", title: "Style Scoping Boundary", level: 3 },
  { id: "css-custom-properties", title: "CSS Custom Properties for Theming", level: 3 },
  { id: "part-pseudo-element", title: "::part() for External Styling", level: 3 },
  { id: "slotted-selector", title: "::slotted() for Projected Content", level: 3 },
  { id: "styling-approaches", title: "Styling Approaches Compared", level: 2 },
  { id: "host-selector", title: ":host and :host-context", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ShadowDom() {
  return (
    <div className="article-content">
      <p>
        Shadow DOM is the browser&apos;s native style encapsulation mechanism. Not a naming
        convention, not a build tool, not a CSS-in-JS runtime — a hard boundary enforced by
        the rendering engine itself. When you attach a shadow root to an element, CSS rules
        from the outside document cannot reach inside, and styles declared inside cannot
        bleed out. This is why a Web Component can safely ship its own stylesheet without
        worrying about class name collisions with the host page.
      </p>
      <p>
        React developers are used to working around the lack of native style encapsulation —
        BEM, CSS Modules, Tailwind&apos;s class prefixes, styled-components&apos; hashed
        class names. All of these are workarounds for a platform gap. Shadow DOM fills that
        gap at the browser level.
      </p>

      <h2 id="what-is-shadow-dom">What Shadow DOM Actually Is</h2>
      <p>
        Every DOM element can have a <strong>shadow root</strong> attached to it. The element
        becomes the <strong>shadow host</strong>. The shadow root is the root of a separate
        DOM tree — the <strong>shadow tree</strong>. The browser renders both trees together,
        but keeps them isolated: the shadow tree has its own style scope, its own node
        identities, and its own event retargeting.
      </p>
      <p>
        The regular DOM — everything outside shadow roots — is called the <strong>light DOM</strong>.
        When a custom element with a shadow root is in the light DOM, it appears as a single
        opaque node to the rest of the document. The shadow tree is invisible to
        <code>document.querySelector()</code> called from outside. It is genuinely private.
      </p>

      <h2 id="attaching-shadow">Attaching a Shadow Root</h2>
      <CodeBlock
        code={`class MyCard extends HTMLElement {
  constructor() {
    super();
    // attachShadow returns the shadow root
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = \`
      <style>
        /* This CSS is scoped to this shadow tree only */
        :host { display: block; padding: 1rem; }
        p { color: cornflowerblue; }  /* Won't affect <p> outside this element */
      </style>
      <p>I am inside the shadow tree</p>
    \`;
  }
}

customElements.define('my-card', MyCard);

// From outside:
document.querySelector('my-card p');  // null — can't pierce the shadow boundary
document.querySelector('my-card').shadowRoot.querySelector('p');  // works (open mode)`}
        lang="javascript"
        filename="my-card.js"
      />

      <h3 id="open-vs-closed">open vs closed Mode</h3>
      <p>
        <code>attachShadow</code> takes a <code>mode</code> option: <code>open</code> or{" "}
        <code>closed</code>. In <code>open</code> mode, <code>element.shadowRoot</code>
        returns the shadow root — JavaScript from outside the component can access it. In{" "}
        <code>closed</code> mode, <code>element.shadowRoot</code> returns <code>null</code>.
      </p>
      <p>
        <strong>The honest answer on closed mode:</strong> it is not a security boundary.
        A determined attacker can intercept <code>attachShadow</code> before your code runs
        and capture the reference. It primarily signals intent — &quot;don&apos;t poke at
        internals&quot;. The vast majority of real-world Web Components use <code>open</code>
        mode. Lit, Shoelace, and FAST all use open mode. Use closed only when you have a
        specific reason to discourage external DOM access, not for security.
      </p>

      <CodeBlock
        code={`// Open mode — shadowRoot accessible externally
const shadow = this.attachShadow({ mode: 'open' });
element.shadowRoot;  // ✅ returns the shadow root

// Closed mode — shadowRoot hidden
const shadow = this.attachShadow({ mode: 'closed' });
element.shadowRoot;  // null
// But: you still need a reference internally
class ClosedComponent extends HTMLElement {
  #shadow;  // Private class field
  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }
}`}
        lang="javascript"
      />

      <h3 id="dom-tree-diagram">Light DOM vs Shadow DOM Tree</h3>
      <MermaidDiagram
        chart={domTreeDiagram}
        title="Light DOM and Shadow DOM Tree Structure"
        caption="The shadow host (user-card) exists in the light DOM like any element. Its shadow root is a separate tree, isolated from the document's style cascade. The orange boundary shows where encapsulation begins."
        minHeight={460}
      />

      <h2 id="style-encapsulation">Style Encapsulation</h2>
      <p>
        The encapsulation rule is simple: styles defined in a shadow tree apply only within
        that shadow tree. Styles from the document do not enter a shadow tree. There are no
        exceptions to this rule for regular CSS selectors — but three mechanisms exist to
        intentionally cross the boundary when you want to enable theming.
      </p>

      <h3 id="style-scoping-diagram">Style Scoping Boundary</h3>
      <MermaidDiagram
        chart={styleScopingDiagram}
        title="What Gets In, What Gets Out"
        caption="Regular CSS selectors are blocked at the shadow boundary in both directions. Three mechanisms pierce it intentionally: CSS custom properties (variables), ::part() pseudo-elements, and inheritable CSS properties flowing into :host."
        minHeight={360}
      />

      <h3 id="css-custom-properties">CSS Custom Properties for Theming</h3>
      <p>
        CSS custom properties (variables) are the primary theming mechanism for Web Components.
        They pierce the shadow boundary in both directions. A component declares which custom
        properties it accepts as its &quot;theming API&quot;, and consumers set those variables
        from outside. This is a deliberate, documented contract.
      </p>

      <CodeBlock
        code={`<!-- Component defines its theming API via custom property consumption -->
<style>
  :host {
    /* Fall back to defaults if consumer doesn't set these */
    --button-bg: var(--wc-button-bg, #6366f1);
    --button-color: var(--wc-button-color, #ffffff);
    --button-radius: var(--wc-button-radius, 6px);
  }
  button {
    background: var(--button-bg);
    color: var(--button-color);
    border-radius: var(--button-radius);
  }
</style>

<!-- Consumer sets custom properties from outside — they pierce the boundary -->
<style>
  my-button {
    --wc-button-bg: #f97316;   /* orange theme */
    --wc-button-radius: 999px;  /* pill shape */
  }
</style>
<my-button>Click</my-button>`}
        lang="html"
      />

      <h3 id="part-pseudo-element">::part() for External Styling</h3>
      <p>
        <code>::part()</code> is the escape hatch for styling that needs full CSS power, not
        just variable overrides. A component author exposes named parts of the shadow tree
        using the <code>part</code> attribute. External stylesheets can then target those
        parts with arbitrary CSS rules.
      </p>

      <CodeBlock
        code={`<!-- Component exposes named parts -->
<template id="card-tpl">
  <style>
    /* Internal base styles */
    .container { display: flex; flex-direction: column; }
    .header { font-weight: 700; }
    .body { padding: 1rem; }
  </style>
  <div class="container">
    <div class="header" part="header">...</div>
    <div class="body" part="body">...</div>
  </div>
</template>

<!-- External stylesheet can style the exposed parts -->
<style>
  my-card::part(header) {
    background: #f97316;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px 8px 0 0;
  }
  my-card::part(body) {
    border: 1px solid #f97316;
  }
  /* Cannot style elements that don't have 'part' attribute — still encapsulated */
</style>`}
        lang="html"
      />

      <h3 id="slotted-selector">::slotted() for Projected Content</h3>
      <p>
        When light DOM children are slotted into a shadow root, their styling gets interesting.
        The element&apos;s own styles (from the document) still apply, but the component can
        additionally style slotted content using <code>::slotted()</code>.{" "}
        <code>::slotted()</code> only targets the top-level slotted elements — it cannot reach
        inside nested elements within the projected content.
      </p>

      <CodeBlock
        code={`<!-- Inside the shadow root's <style> -->
<style>
  /* Style all direct slotted children */
  ::slotted(*) {
    display: block;
    margin: 0.5rem 0;
  }

  /* Style only slotted <p> elements */
  ::slotted(p) {
    color: var(--text-secondary, #a0a0b8);
    line-height: 1.7;
  }

  /* ❌ This does NOT work — can't target nested elements inside slotted content */
  ::slotted(div span) {
    color: red;  /* Ignored */
  }
</style>`}
        lang="html"
      />

      <h2 id="styling-approaches">Styling Approaches Compared</h2>
      <ArticleTable
        caption="Four mechanisms control styling across the shadow boundary. Choose based on whether you need external control, internal defaults, or full CSS power."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>Direction</th>
              <th>Use case</th>
              <th>Limitations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>:host</code> selector</td>
              <td>Inside → host element</td>
              <td>Component styles its own container (display, margin, size defaults)</td>
              <td>Cannot style elements outside the component</td>
            </tr>
            <tr>
              <td>CSS custom properties</td>
              <td>Outside → inside (pierce boundary)</td>
              <td>Theming API — consumer sets brand colors, spacing, border-radius</td>
              <td>Component must explicitly consume the variable; not arbitrary CSS</td>
            </tr>
            <tr>
              <td><code>::part()</code></td>
              <td>Outside → named internal elements</td>
              <td>Full CSS power on exposed parts — gradients, transitions, layout</td>
              <td>Component author must explicitly annotate with <code>part=</code></td>
            </tr>
            <tr>
              <td><code>::slotted()</code></td>
              <td>Inside → slotted light DOM children</td>
              <td>Style projected content from inside the shadow root</td>
              <td>Top-level projected elements only — cannot target nested descendants</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="host-selector">:host and :host-context</h2>
      <p>
        <code>:host</code> inside a shadow stylesheet refers to the host element itself. This
        is how a component styles its own container — setting <code>display: block</code>,
        default margin, or theme-dependent states. <code>:host(selector)</code> applies only
        when the host matches the selector — useful for disabled or variant states.
      </p>

      <CodeBlock
        code={`<style>
  /* Custom elements are display: inline by default — always set this */
  :host {
    display: block;
    font-family: inherit;  /* Inherit document font */
  }

  /* :host(selector) — conditional host styling */
  :host([disabled]) {
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed;
  }

  :host([size="large"]) {
    font-size: 1.25rem;
    padding: 0.75rem 1.5rem;
  }

  /* :host-context(selector) — style when host is inside a matching ancestor */
  :host-context(.dark-theme) {
    background: #1a1a2e;
    color: #e0e0ff;
  }
</style>`}
        lang="css"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain Shadow DOM style encapsulation"
        intro="This question tests whether you understand the actual mechanism vs just knowing it exists. Strong answers explain the three crossing mechanisms and their tradeoffs — not just 'styles don't leak'."
        steps={[
          "Lead with what it is: a hard browser-enforced DOM boundary, not a naming convention. Regular CSS selectors cannot cross it in either direction.",
          "Name the three controlled crossing mechanisms: CSS custom properties (variables) pierce the boundary by design; ::part() exposes named elements for external styling; inheritable CSS properties (font-family, color) flow into :host.",
          "Explain the design philosophy: the component author controls what is customizable. Custom properties and ::part() declarations are the public theming API. Everything else is private.",
          "Name the most common mistake: not setting display: block on :host. Custom elements are display: inline by default, which surprises developers expecting block layout.",
          "Connect to design systems: this is why Web Component design systems can ship styled primitives that teams use without style collisions — the encapsulation is real.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Design a Themeable Alert Component"
        scenario={
          <>
            Build a <code>&lt;ds-alert&gt;</code> design system component with Shadow DOM. It
            should accept a <code>variant</code> attribute (<code>info</code>,{" "}
            <code>success</code>, <code>error</code>) and be themeable from outside. The
            consuming application must be able to override the border-radius and font-size
            without modifying the component&apos;s source.
          </>
        }
        tasks={[
          "Write the CSS inside the shadow root including :host, :host([variant='error']), and the CSS custom property theming API.",
          "Expose a 'close-button' part so consumers can style the dismiss button externally.",
          "Explain why CSS custom properties are the right theming mechanism here rather than ::part() for colors.",
          "What CSS property from the host document would automatically flow into your shadow tree without any special handling?",
        ]}
        pitfalls={[
          "Forgetting display: block on :host — the alert will render inline.",
          "Using ::part() for color theming — that requires the consumer to know internal implementation details. Custom properties define a cleaner contract.",
          "Trying to use ::slotted() to reach nested elements inside projected content — it only targets top-level children.",
        ]}
        signal="Strong answer uses CSS custom properties for colors (--ds-alert-bg, --ds-alert-border-color) with sensible fallbacks, exposes part='close-button', and correctly identifies inherited properties (font-family) as auto-flowing."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          code={`class DsAlert extends HTMLElement {
  static observedAttributes = ['variant'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const variant = this.getAttribute('variant') ?? 'info';
    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: block; }  /* Never forget this */
        .alert {
          display: flex;
          justify-content: space-between;
          padding: var(--ds-alert-padding, 0.75rem 1rem);
          border-radius: var(--ds-alert-radius, 8px);
          border: 1px solid var(--ds-alert-border-color, #6366f1);
          background: var(--ds-alert-bg, rgba(99,102,241,0.1));
          color: var(--ds-alert-color, inherit);
          font-family: inherit;  /* inherits from host document automatically */
          font-size: var(--ds-alert-font-size, 0.9rem);
        }
        :host([variant="error"]) .alert {
          --ds-alert-border-color: #ef4444;
          --ds-alert-bg: rgba(239,68,68,0.1);
        }
        :host([variant="success"]) .alert {
          --ds-alert-border-color: #22c55e;
          --ds-alert-bg: rgba(34,197,94,0.1);
        }
      </style>
      <div class="alert">
        <slot></slot>
        <button part="close-button" aria-label="Dismiss">✕</button>
      </div>
    \`;
  }
}
customElements.define('ds-alert', DsAlert);

/* Consumer can now do: */
/* ds-alert { --ds-alert-radius: 0; --ds-alert-font-size: 1rem; } */
/* ds-alert::part(close-button) { background: red; border-radius: 50%; } */`}
          lang="javascript"
          filename="ds-alert.js"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Shadow DOM is a browser-native style and DOM encapsulation boundary — not a convention, a hard rule enforced by the rendering engine</li>
        <li>CSS selectors cannot cross the shadow boundary in either direction without explicit opt-in</li>
        <li>Three mechanisms cross the boundary intentionally: CSS custom properties (theming), <code>::part()</code> (external styling of named parts), and inheritable CSS properties flowing into <code>:host</code></li>
        <li><code>:host</code> inside a shadow stylesheet styles the component&apos;s own container — always set <code>display: block</code> since custom elements default to <code>inline</code></li>
        <li><code>open</code> mode is the industry standard — <code>closed</code> mode is not a security boundary and introduces internal complexity</li>
        <li>Design a public CSS custom property theming API intentionally — it is the contract between your component and its consumers</li>
      </ul>
    </div>
  );
}
