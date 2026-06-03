import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const slotProjectionDiagram = String.raw`flowchart TD
  subgraph LightDOM ["Light DOM (author's markup)"]
    HOST["&lt;card-layout&gt;"]
    H["&lt;h2 slot='header'&gt;Title&lt;/h2&gt;"]
    P["&lt;p&gt;Body text&lt;/p&gt; (default slot)"]
    F["&lt;span slot='footer'&gt;Actions&lt;/span&gt;"]
    HOST --> H
    HOST --> P
    HOST --> F
  end

  subgraph ShadowDOM ["Shadow DOM (component's template)"]
    SR["shadow-root"]
    WRAP["&lt;div class='card'&gt;"]
    SH["&lt;slot name='header'&gt;"]
    SB["&lt;slot&gt; (default)"]
    SF["&lt;slot name='footer'&gt;"]
    SR --> WRAP
    WRAP --> SH
    WRAP --> SB
    WRAP --> SF
  end

  H -->|"projected into"| SH
  P -->|"projected into"| SB
  F -->|"projected into"| SF`;

const templateCloneDiagram = String.raw`sequenceDiagram
  participant HTML as HTML Parser
  participant TPL as &lt;template&gt; element
  participant CE as Custom Element
  participant SR as Shadow Root
  participant DOM as Live DOM

  HTML->>TPL: Parse template content (inert — no render, no fetch, no scripts)
  Note over TPL: .content is a DocumentFragment\nScripts don't run here

  CE->>TPL: template.content.cloneNode(true)
  TPL-->>CE: Returns deep clone of DocumentFragment
  CE->>SR: shadowRoot.appendChild(clone)
  SR->>DOM: Clone is now live — scripts run, images load
  Note over DOM: Multiple elements can clone the same template\nOriginal template stays inert`;

export const toc: TocItem[] = [
  { id: "template-element", title: "The Template Element", level: 2 },
  { id: "clonenode-pattern", title: "The cloneNode Pattern", level: 3 },
  { id: "why-template-over-innerhtml", title: "Why Template Over innerHTML?", level: 3 },
  { id: "slots", title: "Slots: Composing Light DOM Into Shadow DOM", level: 2 },
  { id: "slot-projection-diagram", title: "Slot Projection Diagram", level: 3 },
  { id: "named-slots", title: "Named Slots vs Default Slot", level: 3 },
  { id: "slotted-selector", title: "::slotted() Styling", level: 3 },
  { id: "slotchange-event", title: "The slotchange Event", level: 3 },
  { id: "card-layout-example", title: "Real Example: card-layout with Slots", level: 2 },
  { id: "slot-types-table", title: "Slot Types and Use Cases", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HtmlTemplatesAndSlots() {
  return (
    <div className="article-content">
      <p>
        React developers think about composition through <code>children</code> props and
        render props. Web Components solve the same problem with two platform primitives:{" "}
        <code>&lt;template&gt;</code> for reusable inert markup, and <code>&lt;slot&gt;</code>
        for projecting light DOM content into a shadow tree. Together, they make Web
        Components composable without any framework-level prop system.
      </p>

      <h2 id="template-element">The Template Element</h2>
      <p>
        The <code>&lt;template&gt;</code> element contains HTML that is <em>parsed but not
        rendered</em>. Scripts inside it do not execute. Images inside it do not fetch.
        Links do not load. The browser builds a <code>DocumentFragment</code> of the content
        and holds it inert until you clone it.
      </p>
      <p>
        The template&apos;s <code>.content</code> property is that DocumentFragment. You clone
        it with <code>cloneNode(true)</code> — <code>true</code> for a deep clone — and append
        the clone to your shadow root or anywhere in the DOM. The original template stays
        inert and can be cloned again for the next instance.
      </p>

      <h3 id="clonenode-pattern">The cloneNode Pattern</h3>
      <CodeBlock
        code={`<!-- Template defined once in HTML -->
<template id="user-card-tpl">
  <style>
    :host { display: block; border: 1px solid #333; border-radius: 8px; padding: 1rem; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; }
    .name { font-weight: 700; margin: 0.5rem 0 0.25rem; }
    .title { color: #888; font-size: 0.875rem; }
  </style>
  <img class="avatar" src="" alt="">
  <p class="name"></p>
  <p class="title"></p>
  <slot></slot>
</template>

<script type="module">
class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Find and clone the template
    const tpl = document.getElementById('user-card-tpl');
    // cloneNode(true) = deep clone — copies all descendants
    const clone = tpl.content.cloneNode(true);

    // Fill in the cloned elements
    clone.querySelector('.avatar').src = this.getAttribute('avatar') ?? '';
    clone.querySelector('.avatar').alt = this.getAttribute('name') ?? 'User';
    clone.querySelector('.name').textContent = this.getAttribute('name') ?? '';
    clone.querySelector('.title').textContent = this.getAttribute('title') ?? '';

    // Append to shadow root — now it is live
    this.shadowRoot.appendChild(clone);
  }
}

customElements.define('user-card', UserCard);
</script>`}
        lang="html"
        filename="index.html"
      />

      <h3 id="why-template-over-innerhtml">Why Template Over innerHTML?</h3>
      <p>
        Many examples (including earlier in this course) use <code>innerHTML</code> to build
        shadow content. That works, but <code>&lt;template&gt;</code> has concrete advantages
        at scale:
      </p>
      <ul>
        <li><strong>Performance:</strong> <code>innerHTML</code> parses a string on every render. Template parsing happens once at page load; cloning a DocumentFragment is faster.</li>
        <li><strong>Safety:</strong> Template content is not affected by adjacent HTML injection — the inert fragment is not in the live DOM, so injection vectors don&apos;t apply.</li>
        <li><strong>Maintainability:</strong> HTML in a <code>&lt;template&gt;</code> tag can be edited by designers who don&apos;t know JavaScript. HTML in a template string is invisible to tooling.</li>
        <li><strong>Reuse:</strong> One template element feeds all instances of a custom element via cloning — the definition lives in one place.</li>
      </ul>

      <MermaidDiagram
        chart={templateCloneDiagram}
        title="Template Clone Lifecycle"
        caption="The template's content is parsed once into an inert DocumentFragment. Each custom element instance clones that fragment. Only after the clone is appended to the shadow root does it become live — scripts run, images load, the browser renders it."
        minHeight={360}
      />

      <h2 id="slots">Slots: Composing Light DOM Into Shadow DOM</h2>
      <p>
        Slots are how Web Components accept children. In React, you pass <code>children</code>
        as a prop and render them wherever you want in JSX. In Web Components, you declare{" "}
        <code>&lt;slot&gt;</code> elements inside your shadow root at the points where light
        DOM children should appear. The browser <em>projects</em> the light DOM content into
        those slots at render time — the light DOM elements stay in the light DOM tree, they
        just visually appear where the slots are.
      </p>
      <p>
        This is called <strong>slot projection</strong> or <strong>content distribution</strong>.
        It is not a move — the light DOM elements retain their original position in the DOM
        for purposes of selector matching, event bubbling, and JavaScript access. They are
        only visually rendered in the slot position.
      </p>

      <h3 id="slot-projection-diagram">Slot Projection Diagram</h3>
      <MermaidDiagram
        chart={slotProjectionDiagram}
        title="Slot Projection — Light DOM Into Shadow DOM"
        caption="Light DOM children with slot='header' are projected into <slot name='header'>. Children without a slot attribute project into the default <slot>. The light DOM elements don't move — they stay in the light DOM tree but render in the shadow DOM slot positions."
        minHeight={460}
      />

      <h3 id="named-slots">Named Slots vs Default Slot</h3>
      <p>
        A <code>&lt;slot&gt;</code> with no <code>name</code> attribute is the <strong>default
        slot</strong>. All light DOM children that do not specify a <code>slot</code> attribute
        project into it. A named slot, <code>&lt;slot name=&quot;header&quot;&gt;</code>,
        only receives children with <code>slot=&quot;header&quot;</code>. A component can
        have one default slot and any number of named slots.
      </p>

      <CodeBlock
        code={`<!-- Inside the shadow root template -->
<div class="card">
  <header class="card-header">
    <!-- Named slot: receives elements with slot="header" -->
    <slot name="header">
      <!-- Fallback content — shown when nothing is slotted here -->
      <span>Untitled</span>
    </slot>
  </header>

  <main class="card-body">
    <!-- Default slot: receives everything without a slot attribute -->
    <slot>
      <p>No content provided.</p>
    </slot>
  </main>

  <footer class="card-footer">
    <slot name="footer"></slot>
  </footer>
</div>

<!-- Consumer usage -->
<card-layout>
  <h2 slot="header">My Card Title</h2>
  <p>This goes into the default slot — no slot attribute needed.</p>
  <p>Multiple children can project into the same default slot.</p>
  <div slot="footer">
    <button>Cancel</button>
    <button>Save</button>
  </div>
</card-layout>`}
        lang="html"
      />

      <h3 id="slotted-selector">::slotted() Styling</h3>
      <p>
        From inside the shadow root&apos;s stylesheet, <code>::slotted(selector)</code> lets
        you apply styles to projected content. It only targets the top-level slotted
        elements — you cannot target descendants inside slotted elements.
      </p>

      <CodeBlock
        code={`<style>
  /* Style all directly slotted elements */
  ::slotted(*) {
    box-sizing: border-box;
  }

  /* Style specific slotted element types */
  ::slotted(p) {
    margin: 0 0 1rem;
    line-height: 1.6;
  }

  /* Style slotted elements based on their attributes */
  ::slotted([role="alert"]) {
    color: #ef4444;
    border-left: 3px solid #ef4444;
    padding-left: 0.75rem;
  }

  /* ❌ This does NOT work — can't reach inside slotted content */
  ::slotted(div) span {
    color: blue;  /* Ignored by the browser */
  }
</style>`}
        lang="css"
      />

      <h3 id="slotchange-event">The slotchange Event</h3>
      <p>
        The <code>slotchange</code> event fires on a <code>&lt;slot&gt;</code> element when
        its assigned nodes change — when children are added, removed, or rearranged in the
        light DOM. This lets you react to content changes programmatically.
      </p>

      <CodeBlock
        code={`connectedCallback() {
  const defaultSlot = this.shadowRoot.querySelector('slot:not([name])');

  defaultSlot.addEventListener('slotchange', () => {
    const assigned = defaultSlot.assignedElements({ flatten: true });
    console.log('Slot now has', assigned.length, 'direct element children');

    // Count words in all slotted text content
    const text = assigned.map(el => el.textContent).join(' ');
    const wordCount = text.trim().split(/\s+/).length;
    this.shadowRoot.querySelector('.word-count').textContent = wordCount + ' words';
  });
}

// assignedNodes() — returns all nodes including Text nodes
// assignedElements() — returns only Element nodes (usually what you want)
// { flatten: true } — resolves re-slotted slots (slots inside slots)`}
        lang="javascript"
      />

      <h2 id="card-layout-example">Real Example: card-layout with Slots</h2>
      <CodeBlock
        code={`class CardLayout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = \`
      <style>
        :host {
          display: block;
          border: 1px solid var(--card-border-color, rgba(255,255,255,0.1));
          border-radius: var(--card-radius, 12px);
          overflow: hidden;
          background: var(--card-bg, rgba(255,255,255,0.04));
        }
        .card-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--card-border-color, rgba(255,255,255,0.1));
          font-weight: 700;
        }
        .card-body {
          padding: 1.25rem;
        }
        .card-footer {
          padding: 0.75rem 1.25rem;
          border-top: 1px solid var(--card-border-color, rgba(255,255,255,0.1));
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        /* Hide footer section entirely if nothing is slotted */
        .card-footer:not(:has(slot[name=footer] > *)) {
          display: none;  /* Note: :has() support is modern browsers only */
        }
        ::slotted(*) { margin: 0; }
        ::slotted(p) { line-height: 1.65; color: var(--text-secondary, #a0a0b8); }
      </style>

      <div class="card-header">
        <slot name="header">Card</slot>
      </div>
      <div class="card-body">
        <slot></slot>
      </div>
      <div class="card-footer">
        <slot name="footer"></slot>
      </div>
    \`;
  }
}

customElements.define('card-layout', CardLayout);

// Usage:
// <card-layout>
//   <h3 slot="header">User Profile</h3>
//   <p>This is the card body content.</p>
//   <button slot="footer">Save</button>
//   <button slot="footer">Cancel</button>
// </card-layout>`}
        lang="javascript"
        filename="card-layout.js"
      />

      <h2 id="slot-types-table">Slot Types and Use Cases</h2>
      <ArticleTable
        caption="Slots come in two variants with distinct behaviors. Understanding fallback content and the flatten option separates competent WC developers from beginners."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Slot type</th>
              <th>Declaration</th>
              <th>Receives</th>
              <th>Fallback content</th>
              <th>Common use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Default slot</td>
              <td><code>&lt;slot&gt;</code></td>
              <td>All children without a <code>slot</code> attribute</td>
              <td>Content inside <code>&lt;slot&gt;</code> tag — shown when nothing is projected</td>
              <td>Primary content area of a card, dialog, or layout component</td>
            </tr>
            <tr>
              <td>Named slot</td>
              <td><code>&lt;slot name="header"&gt;</code></td>
              <td>Children with <code>slot="header"</code></td>
              <td>Content inside <code>&lt;slot name="header"&gt;</code> tag</td>
              <td>Header, footer, actions, icons — structural regions of a layout</td>
            </tr>
            <tr>
              <td>Re-slotting</td>
              <td><code>&lt;slot name="x"&gt;&lt;slot name="x"&gt;</code> in nested WC</td>
              <td>Forwarded from outer component&apos;s slot</td>
              <td>Complex — use <code>flatten: true</code> with <code>assignedElements()</code></td>
              <td>Wrapper components that forward slots to inner Web Components</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain Web Component composition with slots"
        intro="Slot projection is conceptually similar to React children but with an important difference: light DOM content stays in the light DOM tree — it is not moved. Interviewers want to know you understand this distinction."
        steps={[
          "Start with the analogy: slots are like React's children prop, but declarative. Named slots are like named children slots in frameworks — header, body, footer regions.",
          "Clarify the key difference from React: projection is visual, not structural. Light DOM children keep their position in the light DOM tree for JavaScript access and event bubbling. They only render at the slot position.",
          "Explain fallback content: content between <slot> tags renders when nothing is projected. This is the Web Component equivalent of default prop values.",
          "Name slotchange: this event fires when slotted children change — it's the observable API for reacting to consumer content updates.",
          "Close with ::slotted() limitation: you can style top-level slotted elements from inside the shadow root, but cannot reach their descendants — a common gotcha for developers expecting full CSS access.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Build a Disclosure Component with Slots"
        scenario={
          <>
            Build a <code>&lt;wc-disclosure&gt;</code> component — an accessible show/hide
            panel. It has a summary (always visible, click to toggle) and content (shown or
            hidden). Both are provided as slotted content so consumers can put any markup
            inside. When expanded, the component emits a <code>toggle</code> event.
          </>
        }
        tasks={[
          "Design the slot structure: which slot is named, which is the default, and what fallback content makes sense for each.",
          "Implement the toggle behavior — clicking the summary should show/hide the slotted content area.",
          "Ensure proper accessibility: the summary area should have role='button' and aria-expanded reflecting the open state.",
          "Use slotchange to log the assigned elements when the content slot changes — demonstrate you know the API.",
        ]}
        pitfalls={[
          "Putting too much logic in the template string — keep structure in the template, behavior in the class methods.",
          "Forgetting that the summary slot receives ANY element the consumer passes — don't assume it's always text.",
          "Not updating aria-expanded when the state changes.",
        ]}
        signal="Strong answer has named summary slot + default content slot, updates aria-expanded in toggle, uses assignedElements() in a slotchange listener, and emits a composed: true CustomEvent."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          code={`class WcDisclosure extends HTMLElement {
  #open = false;
  #abortController = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    const sig = { signal: this.#abortController.signal };

    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: block; }
        .summary {
          cursor: pointer; user-select: none;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .summary:hover { background: rgba(255,255,255,0.04); }
        .content { display: none; padding: 0.75rem 1rem; }
        :host([open]) .content { display: block; }
        .chevron { transition: transform 200ms ease; }
        :host([open]) .chevron { transform: rotate(180deg); }
      </style>
      <div class="summary" role="button" tabindex="0"
           aria-expanded="\${this.#open}"
           aria-controls="content-panel">
        <slot name="summary">Details</slot>
        <span class="chevron" aria-hidden="true">▼</span>
      </div>
      <div class="content" id="content-panel">
        <slot></slot>
      </div>
    \`;

    this.shadowRoot.querySelector('.summary')
      ?.addEventListener('click', () => this.#toggle(), sig);

    // slotchange example
    this.shadowRoot.querySelector('slot:not([name])')
      ?.addEventListener('slotchange', (e) => {
        const els = e.target.assignedElements({ flatten: true });
        console.log('Content slot has', els.length, 'elements');
      }, sig);
  }

  disconnectedCallback() { this.#abortController?.abort(); }

  #toggle() {
    this.#open = !this.#open;
    this.toggleAttribute('open', this.#open);
    this.shadowRoot.querySelector('.summary')
      ?.setAttribute('aria-expanded', String(this.#open));
    this.dispatchEvent(new CustomEvent('toggle', {
      bubbles: true, composed: true, detail: { open: this.#open }
    }));
  }
}
customElements.define('wc-disclosure', WcDisclosure);`}
          lang="javascript"
          filename="wc-disclosure.js"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>The <code>&lt;template&gt;</code> element holds inert HTML — parsed once, cloned many times, zero runtime parsing overhead per instance</li>
        <li>Slot projection is visual, not structural — light DOM children stay in the light DOM tree and only render at slot positions</li>
        <li>Named slots (<code>&lt;slot name="x"&gt;</code>) receive children with <code>slot="x"</code>; the default slot receives everything else</li>
        <li>Fallback content between <code>&lt;slot&gt;</code> tags renders when nothing is projected — the Web Component equivalent of default prop values</li>
        <li><code>::slotted(selector)</code> styles top-level projected elements from inside the shadow root — cannot reach nested descendants</li>
        <li>The <code>slotchange</code> event and <code>assignedElements()</code> are how you observe and react to consumer content changes programmatically</li>
      </ul>
    </div>
  );
}
