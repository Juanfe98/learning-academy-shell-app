import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const designSystemLayerDiagram = String.raw`flowchart TD
  subgraph Tokens ["Layer 1: Design Tokens"]
    T["CSS custom properties\n--color-primary: #f97316\n--spacing-md: 1rem\n--radius-lg: 12px\n--font-body: 'Inter', sans-serif"]
  end

  subgraph WCPrimitives ["Layer 2: Web Component Primitives"]
    BTN["&lt;ds-button&gt;"]
    INP["&lt;ds-input&gt;"]
    CARD["&lt;ds-card&gt;"]
    BADGE["&lt;ds-badge&gt;"]
  end

  subgraph FrameworkWrappers ["Layer 3: Framework Wrappers (optional)"]
    RW["React: import { DsButton } from '@ds/react'"]
    VW["Vue: import DsButton from '@ds/vue'"]
    AW["Angular: DsButtonModule"]
  end

  subgraph Apps ["Layer 4: Application UI"]
    APP1["React App\n(DsButton via wrapper)"]
    APP2["Vue App\n(DsButton via wrapper)"]
    APP3["Vanilla JS page\n(&lt;ds-button&gt; directly)"]
  end

  Tokens -->|"consumed by"| WCPrimitives
  WCPrimitives -->|"wrapped by"| FrameworkWrappers
  WCPrimitives -->|"used directly"| APP3
  FrameworkWrappers --> APP1
  FrameworkWrappers --> APP2`;

const frameworkDecisionDiagram = String.raw`flowchart TD
  START(["Building a Web Component?"]) --> Q1{"Need to output\nReact/Vue/Angular\nwrappers automatically?"}
  Q1 -->|Yes| STENCIL["Stencil\nCompiler-based, zero runtime,\ngenerates framework packages"]
  Q1 -->|No| Q2{"Building an enterprise\ndesign system with\nstrong a11y requirements?"}
  Q2 -->|Yes| FAST["FAST (Microsoft)\nFluent UI foundation,\nElementInternals built-in"]
  Q2 -->|No| Q3{"Love React hooks\nand want that DX\nin Web Components?"}
  Q3 -->|Yes| HAUNTED["Haunted\nhooks model (useState, useEffect)\n~2KB"]
  Q3 -->|No| Q4{"Need maximum\nperformance and\nminimal overhead?"}
  Q4 -->|No| LIT["Lit (default choice)\nReactive properties, html template,\n~5KB, battle-tested"]
  Q4 -->|Yes| VANILLA["Vanilla Web Components\nZero overhead,\nmaximum control"]`;

const stencilDiagram = String.raw`flowchart LR
  subgraph StencilBuild ["Stencil Compiler"]
    SRC["TSX Source\n@Component decorator\n@Prop, @State, @Event"]
    COMPILER["stencil build"]
  end

  subgraph Outputs ["Compiled Outputs"]
    WC["Native Web Component\n(Custom Element)"]
    REACT["React package\n@your-ds/react"]
    VUE["Vue package\n@your-ds/vue"]
    ANGULAR["Angular package\n@your-ds/angular"]
  end

  SRC --> COMPILER
  COMPILER --> WC
  COMPILER --> REACT
  COMPILER --> VUE
  COMPILER --> ANGULAR`;

const litVsVanillaDiagram = String.raw`flowchart LR
  subgraph Vanilla ["Vanilla Web Components"]
    V_DEF["manual customElements.define()"]
    V_REACT["manual re-render in callbacks"]
    V_TMPL["innerHTML or template.cloneNode()"]
    V_DEF --> V_REACT --> V_TMPL
  end

  subgraph Lit ["Lit (google/lit)"]
    L_DEC["@customElement('my-el') decorator"]
    L_PROP["@property() — reactive properties"]
    L_HTML["html\`...\` tagged template\n(efficient diffing)"]
    L_CSS["css\`...\` for scoped styles"]
    L_DEC --> L_PROP --> L_HTML
    L_DEC --> L_CSS
  end

  Vanilla -->|"adds"| Lit
  note1["~5KB gzip\nno build step required"]`;

export const toc: TocItem[] = [
  { id: "when-to-use", title: "When to Use Web Components vs React", level: 2 },
  { id: "design-system-use-case", title: "Design System Use Case", level: 2 },
  { id: "design-system-diagram", title: "Design System Layer Cake", level: 3 },
  { id: "lit-introduction", title: "Lit: The Dominant Web Component Library", level: 2 },
  { id: "lit-vs-vanilla", title: "Lit vs Vanilla Web Components", level: 3 },
  { id: "lit-diagram", title: "Lit vs Vanilla Comparison Diagram", level: 3 },
  { id: "lit-example", title: "A Lit Component in Practice", level: 3 },
  { id: "wc-frameworks", title: "Frameworks & Libraries Landscape", level: 2 },
  { id: "framework-decision", title: "Which Framework to Pick", level: 3 },
  { id: "stencil", title: "Stencil: Compiler-Based Output", level: 3 },
  { id: "fast", title: "FAST: Microsoft's Enterprise Library", level: 3 },
  { id: "haunted", title: "Haunted: React Hooks for Web Components", level: 3 },
  { id: "performance", title: "Performance Characteristics", level: 2 },
  { id: "accessibility", title: "Accessibility in Web Components", level: 2 },
  { id: "element-internals", title: "ElementInternals and Form Participation", level: 3 },
  { id: "comparison-table", title: "Full Framework Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function WebComponentsInPractice() {
  return (
    <div className="article-content">
      <p>
        Web Components are not a replacement for React. They are a different tool in the
        frontend toolkit, optimized for different problems. After learning the four specs
        and the React interop story, the most valuable thing you can develop is honest
        judgment about when to reach for each one. This module covers that judgment, plus
        the real-world patterns that make Web Components production-worthy: the Lit library,
        design system architecture, performance characteristics, and accessibility.
      </p>

      <h2 id="when-to-use">When to Use Web Components vs React</h2>
      <p>
        The honest answer: use Web Components when <em>portability across frameworks</em>
        or <em>permanence across framework generations</em> matters more than developer
        experience. Use React when rich interactivity, complex state management, and
        developer velocity within the React ecosystem are the priority.
      </p>
      <p>
        The strongest argument for Web Components is not technical — it is organizational.
        A design system team serving multiple product teams across React, Vue, and Angular
        cannot maintain three component library ports. One Web Component implementation,
        consumed by all. Adobe&apos;s Spectrum design system, GitHub&apos;s Primer, Red
        Hat&apos;s PatternFly, and Microsoft&apos;s FAST all use this model in production.
      </p>
      <p>
        The strongest argument against Web Components for application UI: they have no
        built-in reactivity. Every state update is manual. You handle re-rendering, batching,
        diffing — everything React does for free. Lit reduces this friction significantly,
        but even Lit&apos;s reactivity is simpler than React&apos;s hooks model.
      </p>

      <h2 id="design-system-use-case">Design System Use Case</h2>
      <p>
        The canonical Web Component use case is a multi-framework design system. The
        architecture has four layers, each building on the previous one. CSS custom properties
        live at the token layer and pierce shadow boundaries to theme everything above them.
        Web Component primitives implement the component behaviors once. Optional framework
        wrappers provide idiomatic DX for each framework (React hooks, Vue composables).
        Application teams consume from their own layer without knowing what&apos;s underneath.
      </p>

      <h3 id="design-system-diagram">Design System Layer Cake</h3>
      <MermaidDiagram
        chart={designSystemLayerDiagram}
        title="Design System Architecture: Tokens → Web Components → Framework Wrappers → Apps"
        caption="Design tokens at the bottom propagate through CSS custom properties. Web Component primitives consume them via :host styles. Framework wrappers add idiomatic DX on top. Application teams pick their layer — vanilla HTML teams use WC directly, React/Vue teams use the wrapper layer."
        minHeight={500}
      />

      <CodeBlock
        code={`// Layer 1: Design tokens as CSS custom properties
/* tokens.css */
:root {
  --ds-color-primary: #6366f1;
  --ds-color-primary-hover: #4f46e5;
  --ds-spacing-sm: 0.5rem;
  --ds-spacing-md: 1rem;
  --ds-radius-md: 8px;
  --ds-font-sans: 'Inter', system-ui, sans-serif;
}

// Layer 2: Web Component consuming tokens
class DsButton extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: inline-block; }
        button {
          background: var(--ds-color-primary);
          padding: var(--ds-spacing-sm) var(--ds-spacing-md);
          border-radius: var(--ds-radius-md);
          font-family: var(--ds-font-sans);
          cursor: pointer; border: none; color: white;
          transition: background 150ms ease;
        }
        button:hover { background: var(--ds-color-primary-hover); }
      </style>
      <button part="button"><slot></slot></button>
    \`;
  }
}
customElements.define('ds-button', DsButton);

// Layer 3: React wrapper (React 18-compatible)
export function DsButton({ children, onClick, disabled }) {
  return (
    <ds-button
      onClick={onClick}
      aria-disabled={disabled}
    >
      {children}
    </ds-button>
  );
}`}
        lang="javascript"
        filename="ds-button.js"
      />

      <h2 id="lit-introduction">Lit: The Dominant Web Component Library</h2>
      <p>
        <strong>Lit</strong> (maintained by Google, formerly LitElement/lit-html) is the
        industry-standard library for building Web Components. It adds three things on top of
        vanilla Web Components: a reactive property system, an efficient template diffing
        engine (the <code>html</code> tagged template), and scoped CSS via the{" "}
        <code>css</code> tagged template. The total overhead is approximately 5KB gzipped.
      </p>
      <p>
        If you are building Web Components for production, you will likely use Lit. The
        verbosity of vanilla Web Components does not scale well: every reactive property needs
        a getter, setter, and <code>attributeChangedCallback</code> handler. Lit handles all
        of that with a decorator.
      </p>

      <h3 id="lit-vs-vanilla">Lit vs Vanilla Web Components</h3>
      <p>
        The same component in vanilla Web Components and Lit illustrates the DX gap. The Lit
        version is shorter, handles reactive updates automatically, and does partial DOM updates
        instead of full <code>innerHTML</code> re-renders.
      </p>

      <h3 id="lit-diagram">Lit vs Vanilla Comparison Diagram</h3>
      <MermaidDiagram
        chart={litVsVanillaDiagram}
        title="Vanilla Web Components vs Lit — What Lit Adds"
        caption="Lit adds three layers on top of vanilla Web Components: decorators for class registration and property declaration, a reactive system that automatically schedules updates, and an html tagged template that does efficient partial DOM updates instead of full innerHTML replacement."
        minHeight={320}
      />

      <h3 id="lit-example">A Lit Component in Practice</h3>
      <CodeBlock
        code={`// Vanilla — verbose, manual re-rendering
class VanillaCounter extends HTMLElement {
  static observedAttributes = ['count'];
  #count = 0;

  constructor() { super(); this.attachShadow({ mode: 'open' }); }

  get count() { return this.#count; }
  set count(v) { this.#count = v; this.setAttribute('count', v); }

  attributeChangedCallback(name, old, next) {
    if (old !== next) this.#render();
  }
  connectedCallback() { this.#render(); }

  #render() {
    // Full innerHTML re-render every time anything changes
    this.shadowRoot.innerHTML = \`
      <style>button { padding: 0.5rem 1rem; }</style>
      <button>Count: \${this.#count}</button>
    \`;
    this.shadowRoot.querySelector('button')
      ?.addEventListener('click', () => { this.#count++; this.#render(); });
  }
}
customElements.define('vanilla-counter', VanillaCounter);

// ——————————————————————————————————————

// Lit — concise, reactive updates, efficient diffing
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lit-counter')
class LitCounter extends LitElement {
  // @property() handles observedAttributes, getter/setter, and reactive updates
  @property({ type: Number }) count = 0;

  // Static CSS — parsed once, scoped to shadow root
  static styles = css\`
    button { padding: 0.5rem 1rem; }
  \`;

  // render() is called automatically when @property values change
  // html\`...\` does efficient partial DOM updates (no full innerHTML replacement)
  render() {
    return html\`
      <button @click=\${() => this.count++}>
        Count: \${this.count}
      </button>
    \`;
  }
}

// Usage — identical in HTML, much better DX in the source
// <lit-counter count="5"></lit-counter>`}
        lang="javascript"
        filename="counter-comparison.js"
      />

      <h2 id="wc-frameworks">Frameworks &amp; Libraries Landscape</h2>
      <p>
        Lit is the default choice, but it is not the only one. The Web Component ecosystem has
        several specialized libraries, each solving a different problem. Knowing when to reach
        for each one is what separates a developer who &quot;knows Web Components&quot; from one
        who can architect a real cross-framework design system.
      </p>

      <h3 id="framework-decision">Which Framework to Pick</h3>
      <p>
        Use this decision tree before starting any Web Component project. The wrong choice at
        the start means rewriting later — Stencil&apos;s compiler output is fundamentally
        different from Lit&apos;s runtime model.
      </p>
      <MermaidDiagram
        chart={frameworkDecisionDiagram}
        title="Web Component Framework Decision Tree"
        caption="Start from the top: if you need automatic framework-specific packages (React, Vue, Angular), Stencil is the answer. If you need enterprise a11y primitives, FAST. If you want hooks DX, Haunted. Otherwise, Lit is the safe default."
        minHeight={480}
      />

      <h3 id="stencil">Stencil: Compiler-Based Output</h3>
      <p>
        <strong>Stencil</strong> (by Ionic) takes a fundamentally different approach from Lit.
        It is a <em>compiler</em>, not a runtime library. You write components in TSX with
        decorators, and Stencil compiles them into: a native Web Component, a React package,
        a Vue package, and an Angular package — all from the same source. The compiled output
        has <strong>zero Stencil runtime overhead</strong> in production.
      </p>
      <p>
        This makes Stencil the right choice for design systems that must ship official
        framework-specific packages. The Ionic Framework itself, Capacitor UI, and several
        enterprise design systems use Stencil for exactly this reason.
      </p>
      <MermaidDiagram
        chart={stencilDiagram}
        title="Stencil Compiler: One Source, Four Outputs"
        caption="Write once in TSX. Stencil's build step emits a native Web Component plus framework-specific packages. React/Vue/Angular consumers install the wrapper package and get idiomatic DX — no raw Custom Element API surface exposed."
        minHeight={320}
      />
      <CodeBlock
        code={`import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

@Component({
  tag: 'ds-button',          // Custom element tag name
  styleUrl: 'ds-button.css', // Scoped CSS file
  shadow: true,              // Enable Shadow DOM
})
export class DsButton {
  // @Prop() = observable attribute + property
  @Prop() variant: 'primary' | 'secondary' = 'primary';
  @Prop() disabled: boolean = false;

  // @Event() = typed CustomEvent emitter
  @Event() dsClick: EventEmitter<MouseEvent>;

  render() {
    return (
      <button
        class={\`btn btn--\${this.variant}\`}
        disabled={this.disabled}
        onClick={(e) => this.dsClick.emit(e)}
      >
        <slot />
      </button>
    );
  }
}

// After stencil build, consumers get:
//
// Vanilla HTML:
//   <script type="module" src="/ds-components/ds-components.esm.js"></script>
//   <ds-button variant="primary">Click me</ds-button>
//
// React (from @your-ds/react package):
//   import { DsButton } from '@your-ds/react';
//   <DsButton variant="primary" onDsClick={handleClick}>Click me</DsButton>
//
// Vue (from @your-ds/vue package):
//   import { DsButton } from '@your-ds/vue';
//   <DsButton variant="primary" @ds-click="handleClick">Click me</DsButton>`}
        lang="typescript"
        filename="ds-button.tsx"
      />

      <h3 id="fast">FAST: Microsoft&apos;s Enterprise Library</h3>
      <p>
        <strong>FAST</strong> (by Microsoft) powers the Fluent UI design system. It is the
        most complete Web Component framework for enterprise accessibility requirements.
        FAST has first-class support for <code>ElementInternals</code>, ARIA pattern
        implementations (ARIA APG), and a design token system built into the component model.
      </p>
      <p>
        The trade-off: FAST is significantly more verbose than Lit. The API surface is large
        and the learning curve is steeper. Unless you are building a component library at the
        scale of Microsoft&apos;s Fluent or Red Hat&apos;s PatternFly, Lit covers 95% of what
        FAST does with far less ceremony.
      </p>
      <CodeBlock
        code={`import { FASTElement, customElement, attr, html, css } from '@microsoft/fast-element';

const template = html<DsButton>\`
  <button
    class="control"
    ?disabled="\${x => x.disabled}"
    @click="\${(x, c) => x.handleClick(c.event as MouseEvent)}"
  >
    <slot></slot>
  </button>
\`;

const styles = css\`
  :host { display: inline-block; }
  .control { padding: 0.5rem 1rem; cursor: pointer; }
  :host([disabled]) .control { opacity: 0.5; cursor: not-allowed; }
\`;

@customElement({ name: 'ds-button', template, styles })
export class DsButton extends FASTElement {
  @attr({ mode: 'boolean' }) disabled: boolean = false;

  handleClick(event: MouseEvent) {
    if (this.disabled) { event.stopPropagation(); return; }
    this.$emit('ds-click', event);
  }
}`}
        lang="typescript"
        filename="ds-button.fast.ts"
      />

      <h3 id="haunted">Haunted: React Hooks for Web Components</h3>
      <p>
        <strong>Haunted</strong> brings the React hooks mental model to vanilla Web Components.
        If you think in <code>useState</code>, <code>useEffect</code>, and <code>useMemo</code>,
        Haunted lets you write Web Components with that exact API. It weighs ~2KB and has no
        build step requirement.
      </p>
      <p>
        The honest trade-off: Haunted is a niche choice. Its hooks are not React hooks — they
        are reimplementations, and subtle differences in scheduling and batching behavior can
        trip you up. For small projects or solo work where you love the hooks model, it is
        delightful. For team projects, Lit is easier to onboard new developers onto.
      </p>
      <CodeBlock
        code={`import { component, useState, useEffect } from 'haunted';
import { html } from 'lit';

// Looks almost identical to a React functional component
function Counter({ start = 0 }) {
  const [count, setCount] = useState(start);

  // useEffect cleanup works the same as React
  useEffect(() => {
    document.title = \`Count: \${count}\`;
    return () => { document.title = 'App'; };
  }, [count]);

  return html\`
    <button @click=\${() => setCount(count + 1)}>
      Count: \${count}
    </button>
  \`;
}

// Register as a Custom Element
customElements.define('haunted-counter', component(Counter));

// Usage in HTML:
// <haunted-counter start="5"></haunted-counter>

// The key difference from React: no reconciler, no fiber.
// Re-renders are triggered by state changes but happen synchronously,
// not in a scheduled batch. Fine for simple components; can bite you
// in complex update cascades.`}
        lang="javascript"
        filename="counter.haunted.js"
      />

      <h2 id="performance">Performance Characteristics</h2>
      <p>
        Web Components have a different performance profile than React. There is no virtual
        DOM — when you update the DOM, you update the real DOM directly. For simple elements
        this is faster: no diffing overhead, no reconciler. For complex trees with many
        conditional updates, the absence of a smart diffing layer can be slower because
        you are responsible for fine-grained updates.
      </p>
      <p>
        Lit&apos;s <code>html</code> tagged template adds a lightweight diffing layer that
        only updates changed parts of the template. This is not as sophisticated as React&apos;s
        fiber reconciler — Lit does not batch or prioritize updates — but it is sufficient for
        most design system primitives.
      </p>
      <p>
        The bundle size story is favorable for Web Components at the primitive level: a
        small Web Component ships <em>zero framework overhead</em> to the consumer. Lit adds
        ~5KB. React adds ~45KB (production). For a shared design system used across many
        pages, the difference compounds with page count.
      </p>

      <h2 id="accessibility">Accessibility in Web Components</h2>
      <p>
        Accessibility is the area where Web Components have historically struggled. Shadow DOM
        creates a boundary that AT (assistive technology) must navigate. Modern browsers
        handle most of this correctly — screen readers expose the shadow tree&apos;s semantics
        — but several patterns require explicit work:
      </p>

      <CodeBlock
        code={`// 1. Focus delegation — allow focus to enter the shadow root
// Pass delegatesFocus: true to attachShadow when the component has interactive elements
this.attachShadow({ mode: 'open', delegatesFocus: true });
// Now: focusing the host element delegates focus to the first focusable element inside

// 2. ARIA attributes on the host
// The host element is in the light DOM, so its aria-* attributes are read by AT
connectedCallback() {
  // ARIA on the shadow host is reflected to AT correctly
  this.setAttribute('role', 'button');
  this.setAttribute('aria-label', this.getAttribute('label') ?? 'Action');
  this.setAttribute('tabindex', '0');
}

// 3. Keyboard interaction — handle keyboard events manually
connectedCallback() {
  this.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#activate();
    }
  });
}

// 4. Updating aria-expanded / aria-selected on state changes
#toggle() {
  this.#open = !this.#open;
  this.setAttribute('aria-expanded', String(this.#open));
}`}
        lang="javascript"
      />

      <h3 id="element-internals">ElementInternals and Form Participation</h3>
      <p>
        By default, custom elements do not participate in HTML forms. <code>ElementInternals</code>
        (available in all modern browsers since 2022) solves this. It lets a custom element
        become a form-associated element — setting its value in the form, receiving validity
        state, and participating in form submission and reset.
      </p>

      <CodeBlock
        code={`class DsInput extends HTMLElement {
  static formAssociated = true;  // Required declaration
  #internals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // attachInternals() connects to the form system
    this.#internals = this.attachInternals();
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = \`
      <style>:host { display: block; }</style>
      <input type="text" />
    \`;
    const input = this.shadowRoot.querySelector('input');
    input.addEventListener('input', () => {
      // Set the form value — this is what gets submitted
      this.#internals.setFormValue(input.value);

      // Validate and report validity
      if (input.value.length < 3) {
        this.#internals.setValidity(
          { tooShort: true },
          'Must be at least 3 characters',
          input
        );
      } else {
        this.#internals.setValidity({});  // clear validity
      }
    });
  }

  // ElementInternals provides access to the form
  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
}

customElements.define('ds-input', DsInput);

// Now works inside a <form> like a native <input>:
// <form onsubmit="...">
//   <ds-input name="username"></ds-input>
//   <button type="submit">Submit</button>
// </form>`}
        lang="javascript"
        filename="ds-input.js"
      />

      <h2 id="comparison-table">Full Framework Comparison</h2>
      <ArticleTable
        caption="Five options side by side. Pick based on your constraints — multi-framework output, a11y requirements, DX preference, or bundle budget."
        minWidth={1100}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Vanilla</th>
              <th>Lit</th>
              <th>Stencil</th>
              <th>FAST</th>
              <th>Haunted</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Runtime size</td>
              <td>0KB</td>
              <td>~5KB</td>
              <td>~0KB (compiled away)</td>
              <td>~10KB</td>
              <td>~2KB</td>
            </tr>
            <tr>
              <td>Reactivity</td>
              <td>Manual</td>
              <td><code>@property()</code> decorator</td>
              <td><code>@Prop()</code> + compiler</td>
              <td><code>@attr()</code> + observable</td>
              <td><code>useState</code> hook</td>
            </tr>
            <tr>
              <td>Template</td>
              <td>innerHTML / cloneNode</td>
              <td><code>html</code> tagged template</td>
              <td>TSX / JSX</td>
              <td><code>html</code> tagged template</td>
              <td><code>html</code> (from Lit)</td>
            </tr>
            <tr>
              <td>Framework wrappers</td>
              <td>Manual</td>
              <td>Manual (or @lit-labs/react)</td>
              <td>Auto-generated ✓</td>
              <td>Manual</td>
              <td>Manual</td>
            </tr>
            <tr>
              <td>Build step required</td>
              <td>No</td>
              <td>No (optional bundler)</td>
              <td>Yes (compiler)</td>
              <td>No</td>
              <td>No</td>
            </tr>
            <tr>
              <td>A11y primitives</td>
              <td>DIY</td>
              <td>DIY</td>
              <td>DIY</td>
              <td>Built-in (ARIA APG) ✓</td>
              <td>DIY</td>
            </tr>
            <tr>
              <td>Mental model</td>
              <td>Platform APIs</td>
              <td>Class + decorators</td>
              <td>Class + TSX</td>
              <td>Class + FASTElement</td>
              <td>React hooks</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Learning, single widgets</td>
              <td>General-purpose design systems</td>
              <td>Multi-framework package output</td>
              <td>Enterprise a11y-heavy systems</td>
              <td>Hooks lovers, small projects</td>
            </tr>
            <tr>
              <td>Used by</td>
              <td>—</td>
              <td>Google, Adobe Spectrum, GitHub Primer</td>
              <td>Ionic Framework, Capacitor</td>
              <td>Microsoft Fluent UI, Red Hat PatternFly</td>
              <td>Small community</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: when would you use Web Components over React?"
        intro="This question has no universal right answer — it depends on the use case. Strong candidates demonstrate nuanced judgment rather than picking a side. The design system scenario is the canonical correct answer for 'use Web Components'."
        steps={[
          "Lead with the decision criteria: use Web Components when framework-agnostic portability matters more than reactivity DX. The canonical use case is a shared design system serving multiple framework teams.",
          "Name real production examples: Adobe Spectrum, GitHub Primer, Shoelace, Microsoft FAST. These are all Web Component design systems in production at scale.",
          "Explain the Lit trade-off: vanilla Web Components are verbose for anything reactive. Lit at ~5KB adds a reactive property system and efficient templating. For production design systems, Lit is the standard choice.",
          "Be honest about React's strengths: complex application state, ecosystem size, hooks composability, TypeScript DX — React is better for application-layer UI. Web Components shine at the primitive layer.",
          "Close with the accessibility note: Web Components require more deliberate accessibility work — delegatesFocus, ARIA on the host element, ElementInternals for form participation. It's solvable but not automatic.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Design a theme-toggle Web Component"
        scenario={
          <>
            Design a <code>&lt;theme-toggle&gt;</code> Web Component that works in both a
            React app and a plain HTML page. It toggles between light and dark mode by adding
            a <code>data-theme=&quot;dark&quot;</code> attribute on <code>document.documentElement</code>.
            The toggle state must persist across page loads. The component must be accessible.
          </>
        }
        tasks={[
          "Implement the full Web Component class: constructor, connectedCallback, disconnectedCallback, and a toggle action.",
          "Use localStorage to persist the preferred theme across page loads, and apply the saved theme on connectedCallback.",
          "Make it accessible: it should be operable via keyboard (Enter/Space), have an aria-label, and aria-pressed reflecting the current state.",
          "Explain how this same component would be used in React 18 vs React 19 — specifically how a React consumer would listen for the 'themechange' custom event in each version.",
        ]}
        pitfalls={[
          "Not applying the saved theme on connectedCallback — the page will flash unstyled on load.",
          "Forgetting keyboard interaction — click events alone don't make a custom element accessible.",
          "Not emitting a composed: true event — the event won't bubble out of the shadow root.",
        ]}
        signal="Strong answer applies saved theme immediately in connectedCallback, handles both click and keydown for accessibility, sets aria-pressed on state change, and correctly describes React 18 (addEventListener in useEffect) vs React 19 (onthemechange JSX prop) usage."
      />
      <SolutionReveal difficulty="hard">
        <CodeBlock
          code={`class ThemeToggle extends HTMLElement {
  #abortController = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    const sig = { signal: this.#abortController.signal };

    // Apply saved preference immediately (avoids flash)
    const saved = localStorage.getItem('theme') ?? 'light';
    this.#applyTheme(saved, false);  // false = don't emit event on init

    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: inline-block; }
        button {
          background: none; border: 1px solid currentColor;
          border-radius: 999px; padding: 0.4rem 0.85rem;
          cursor: pointer; font-size: 0.875rem; color: inherit;
        }
        button:focus-visible { outline: 2px solid var(--ds-color-primary, #6366f1); }
      </style>
      <button
        aria-label="Toggle dark mode"
        aria-pressed="\${saved === 'dark'}"
        part="button">
        \${saved === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    \`;

    this.shadowRoot.querySelector('button')
      ?.addEventListener('click', () => this.#toggle(), sig);

    this.shadowRoot.querySelector('button')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.#toggle();
        }
      }, sig);
  }

  disconnectedCallback() { this.#abortController?.abort(); }

  #toggle() {
    const current = document.documentElement.getAttribute('data-theme') ?? 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.#applyTheme(next, true);
  }

  #applyTheme(theme, emit) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const btn = this.shadowRoot?.querySelector('button');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }

    if (emit) {
      this.dispatchEvent(new CustomEvent('themechange', {
        bubbles: true, composed: true, detail: { theme }
      }));
    }
  }
}
customElements.define('theme-toggle', ThemeToggle);

/* React 18 usage — addEventListener in useEffect:
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const handler = (e) => setTheme(e.detail.theme);
    el?.addEventListener('themechange', handler);
    return () => el?.removeEventListener('themechange', handler);
  }, []);
  return <theme-toggle ref={ref} />;

React 19 usage — JSX event prop:
  <theme-toggle onthemechange={(e) => setTheme(e.detail.theme)} />
*/`}
          lang="javascript"
          filename="theme-toggle.js"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Use Web Components when framework-agnostic portability matters most — design systems serving multiple framework teams are the canonical use case</li>
        <li><strong>Lit</strong> (~5KB) is the safe default — reactive properties, efficient html templates, battle-tested at Google and Adobe scale</li>
        <li><strong>Stencil</strong> is the right choice when you need to publish official React/Vue/Angular wrapper packages from a single source — it compiles away to zero runtime overhead</li>
        <li><strong>FAST</strong> (Microsoft) owns the enterprise a11y space — built-in ARIA APG patterns and ElementInternals support; more verbose but the most complete accessibility story</li>
        <li><strong>Haunted</strong> brings React&apos;s hooks model to Web Components — great DX for hooks thinkers, but niche and not recommended for team projects</li>
        <li>Accessibility requires deliberate work regardless of library: <code>delegatesFocus: true</code>, ARIA on the host, keyboard interaction, and <code>ElementInternals</code> for form participation</li>
        <li>The right mental model: Web Components own the primitive layer; React owns the application layer — they coexist, not compete</li>
      </ul>
    </div>
  );
}
