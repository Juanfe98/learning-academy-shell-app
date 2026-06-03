import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const lifecycleStateMachine = String.raw`stateDiagram-v2
  [*] --> Parsed : HTML parser encounters tag
  Parsed --> Upgraded : customElements.define() called
  Upgraded --> Connected : inserted into document
  Connected --> Disconnected : removed from document
  Disconnected --> Connected : re-inserted into document
  Connected --> AttributeChanged : setAttribute() called
  AttributeChanged --> Connected : callback returns
  Connected --> Adopted : moved to new document
  Adopted --> Connected : inserted into new document`;

const upgradeTimingDiagram = String.raw`sequenceDiagram
  participant HTML as HTML Parser
  participant DOM as DOM Tree
  participant CE as customElements registry
  participant Class as UserCard class

  HTML->>DOM: Parse <user-card> tag
  Note over DOM: Element exists as HTMLElement\n(no custom behavior yet)
  DOM-->>CE: Check registry... not found
  Note over DOM: Element is "undefined" / not upgraded

  Note over CE: Later: script loads
  CE->>CE: customElements.define('user-card', UserCard)
  CE->>DOM: Find all existing <user-card> elements
  DOM->>Class: Upgrade: call constructor()
  Class->>DOM: Element is now a UserCard instance
  DOM->>Class: Call connectedCallback()
  Note over DOM: Element fully upgraded and connected`;

export const toc: TocItem[] = [
  { id: "defining-custom-elements", title: "Defining Custom Elements", level: 2 },
  { id: "lifecycle-callbacks", title: "Lifecycle Callbacks", level: 2 },
  { id: "observed-attributes", title: "observedAttributes and attributeChangedCallback", level: 3 },
  { id: "lifecycle-diagram", title: "Lifecycle State Machine", level: 3 },
  { id: "autonomous-vs-customized", title: "Autonomous vs Customized Built-ins", level: 2 },
  { id: "upgrade-mechanism", title: "The Upgrade Mechanism", level: 2 },
  { id: "user-card-example", title: "Real Example: user-card Element", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CustomElements() {
  return (
    <div className="article-content">
      <p>
        Custom Elements are the core of Web Components. Everything else — Shadow DOM, templates,
        slots — serves to make custom elements useful. A custom element is a class that extends{" "}
        <code>HTMLElement</code> and gets registered with the browser under a hyphenated tag
        name. From that moment on, every time the browser parses that tag — or you create one
        via <code>document.createElement()</code> — it instantiates your class. The element
        is a real DOM node. It participates in the DOM tree, responds to events, and has a
        full suite of lifecycle callbacks you control.
      </p>

      <h2 id="defining-custom-elements">Defining Custom Elements</h2>
      <p>
        Registration is a one-liner: <code>customElements.define(name, constructor, options)</code>.
        The name must contain a hyphen — this is how the browser distinguishes custom elements
        from native ones (which are all single-word). Once registered, a name cannot be
        re-registered. This is a deliberate design: the registry is global and permanent, which
        prevents version conflicts at the cost of requiring unique names.
      </p>

      <CodeBlock
        code={`// Minimum viable custom element
class MyGreeting extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Hello from a custom element!';
  }
}

customElements.define('my-greeting', MyGreeting);

// Now this renders "Hello from a custom element!":
// <my-greeting></my-greeting>

// Check if already defined before registering (important for module re-evaluation):
if (!customElements.get('my-greeting')) {
  customElements.define('my-greeting', MyGreeting);
}

// Async: wait for an element to be defined
await customElements.whenDefined('my-greeting');
console.log('my-greeting is now registered');`}
        lang="javascript"
        filename="my-greeting.js"
      />

      <p>
        <strong>The constructor rule:</strong> you must call <code>super()</code> first and
        cannot use <code>document.write()</code> or inspect attributes in the constructor.
        The constructor runs before the element is in the document. Keep it minimal — attach
        shadow DOM, set up internal state. Do real work in <code>connectedCallback</code>.
      </p>

      <h2 id="lifecycle-callbacks">Lifecycle Callbacks</h2>
      <p>
        The browser calls specific methods on your class at precise moments in the element&apos;s
        life. These are not event listeners — they are method overrides, called synchronously
        by the browser&apos;s upgrade and connection machinery.
      </p>

      <ArticleTable
        caption="Every lifecycle callback fires at a well-defined moment. Misuse is the most common source of bugs in custom elements — especially putting DOM inspection in the constructor."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Callback</th>
              <th>When it fires</th>
              <th>Primary use</th>
              <th>Common mistake</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>constructor()</code></td>
              <td>Element instantiated (upgraded or <code>createElement</code>)</td>
              <td>Attach Shadow DOM, initialize private state</td>
              <td>Reading attributes or children — they don&apos;t exist yet</td>
            </tr>
            <tr>
              <td><code>connectedCallback()</code></td>
              <td>Element inserted into a document</td>
              <td>Fetch data, add event listeners, render initial UI</td>
              <td>Forgetting it can fire multiple times (move in DOM = re-connect)</td>
            </tr>
            <tr>
              <td><code>disconnectedCallback()</code></td>
              <td>Element removed from a document</td>
              <td>Remove event listeners, cancel timers, abort fetches</td>
              <td>Not cleaning up — leads to memory leaks and ghost listeners</td>
            </tr>
            <tr>
              <td><code>attributeChangedCallback(name, old, next)</code></td>
              <td>Observed attribute added, changed, or removed</td>
              <td>Sync attribute changes to internal state / re-render</td>
              <td>Forgetting to declare <code>static observedAttributes</code></td>
            </tr>
            <tr>
              <td><code>adoptedCallback()</code></td>
              <td>Element moved to a different document (e.g. <code>iframe</code>)</td>
              <td>Reinitialize resources tied to the old document</td>
              <td>Rarely needed — most elements ignore this</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="observed-attributes">observedAttributes and attributeChangedCallback</h3>
      <p>
        <code>attributeChangedCallback</code> only fires for attributes you explicitly opt into
        via the static <code>observedAttributes</code> getter. This is a performance decision:
        if every attribute change triggered a callback, setting any attribute on any element
        would have overhead. You declare exactly what you care about.
      </p>

      <CodeBlock
        code={`class UserCard extends HTMLElement {
  // Must declare which attributes trigger attributeChangedCallback
  static observedAttributes = ['name', 'role', 'avatar-url'];

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;  // No-op guard

    switch (name) {
      case 'name':
        this.#renderName(newValue);
        break;
      case 'role':
        this.#renderRole(newValue);
        break;
      case 'avatar-url':
        this.#renderAvatar(newValue);
        break;
    }
  }

  // Attribute reflection pattern: property mirrors attribute
  get name() {
    return this.getAttribute('name') ?? '';
  }
  set name(value) {
    this.setAttribute('name', value);  // triggers attributeChangedCallback
  }
}

// Consumer can use either:
card.setAttribute('name', 'Ada Lovelace');   // attribute API
card.name = 'Ada Lovelace';                   // property API (reflected)`}
        lang="javascript"
      />

      <h3 id="lifecycle-diagram">Lifecycle State Machine</h3>
      <MermaidDiagram
        chart={lifecycleStateMachine}
        title="Custom Element Lifecycle State Machine"
        caption="An element begins as a plain HTMLElement when parsed. It is 'upgraded' when its class is registered. After that it cycles between connected and disconnected as it moves through the DOM. attributeChangedCallback can fire at any point while connected."
        minHeight={480}
      />

      <h2 id="autonomous-vs-customized">Autonomous vs Customized Built-ins</h2>
      <p>
        There are two forms of custom elements. <strong>Autonomous custom elements</strong>
        extend <code>HTMLElement</code> directly and create entirely new tags:{" "}
        <code>&lt;user-card&gt;</code>, <code>&lt;theme-toggle&gt;</code>. This is the
        mainstream approach and works in all modern browsers.
      </p>
      <p>
        <strong>Customized built-ins</strong> extend an existing HTML element — for example{" "}
        <code>class FancyButton extends HTMLButtonElement</code> — and are used with the{" "}
        <code>is</code> attribute: <code>&lt;button is=&quot;fancy-button&quot;&gt;</code>.
        They inherit all native behavior (keyboard, form submission, accessibility semantics).
        The catch: Safari does not support customized built-ins natively. A polyfill exists
        but adds complexity. For most teams, autonomous custom elements are the practical choice.
      </p>

      <CodeBlock
        code={`// Autonomous — works everywhere
class MyButton extends HTMLElement { /* ... */ }
customElements.define('my-button', MyButton);
// <my-button>Click me</my-button>

// Customized built-in — inherits <button> behavior including native semantics
// WARNING: requires polyfill in Safari
class FancyButton extends HTMLButtonElement {
  connectedCallback() {
    this.classList.add('fancy');
  }
}
customElements.define('fancy-button', FancyButton, { extends: 'button' });
// <button is="fancy-button">Click me</button>`}
        lang="javascript"
      />

      <h2 id="upgrade-mechanism">The Upgrade Mechanism</h2>
      <p>
        This is one of the most important aspects of Custom Elements — and the one most
        developers miss. When the HTML parser encounters <code>&lt;user-card&gt;</code> and
        no class is registered yet, it creates a plain <code>HTMLElement</code> instance with
        the right tag name but no custom behavior. The element is in an &quot;undefined&quot;
        state. When <code>customElements.define()</code> is eventually called — perhaps after
        a dynamic import resolves — the browser finds all existing instances and
        <strong> upgrades</strong> them: it runs the constructor and then{" "}
        <code>connectedCallback</code>.
      </p>
      <p>
        This means your element must be resilient to being in the DOM before its class loads.
        Design for progressive enhancement: the element should not crash, and ideally should
        render some fallback content (light DOM children, slotted content) before upgrade.
      </p>

      <MermaidDiagram
        chart={upgradeTimingDiagram}
        title="Element Upgrade Timing"
        caption="HTML is parsed before scripts run. An element can exist in the DOM as a plain HTMLElement for the entire script-loading period. When define() is called, the browser synchronously upgrades all matching elements."
        minHeight={420}
      />

      <CodeBlock
        code={`// Upgrade timing example — defensive patterns

// 1. Use :defined CSS pseudo-class to hide pre-upgrade state
// This prevents a flash of unstyled content (FOUC)
user-card:not(:defined) {
  opacity: 0;
  visibility: hidden;
}
user-card:defined {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.2s ease;
}

// 2. Wait for upgrade before interacting programmatically
await customElements.whenDefined('user-card');
const card = document.querySelector('user-card');
card.name = 'Ada Lovelace';  // Safe: element is now upgraded

// 3. Upgrade a specific element immediately (if already defined)
customElements.upgrade(card);  // No-op if already upgraded or not yet defined`}
        lang="javascript"
      />

      <h2 id="user-card-example">Real Example: user-card Element</h2>
      <p>
        Here is a complete <code>&lt;user-card&gt;</code> element with Shadow DOM, observed
        attributes, and proper lifecycle management. This is the pattern you would use in
        production: clean constructor, all rendering logic in <code>connectedCallback</code>,
        proper cleanup in <code>disconnectedCallback</code>.
      </p>

      <CodeBlock
        code={`class UserCard extends HTMLElement {
  static observedAttributes = ['name', 'title', 'online'];

  #abortController = null;

  constructor() {
    super();
    // attachShadow is safe in constructor
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#render();

    // Event listeners use AbortController for clean removal
    this.shadowRoot.querySelector('.follow-btn')
      ?.addEventListener('click', this.#onFollow, {
        signal: this.#abortController.signal,
      });
  }

  disconnectedCallback() {
    // Single cleanup call removes ALL listeners registered with this signal
    this.#abortController?.abort();
    this.#abortController = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.#render();  // Re-render on any observed attribute change
  }

  #onFollow = () => {
    this.dispatchEvent(new CustomEvent('follow', {
      bubbles: true,
      composed: true,   // crosses Shadow DOM boundary
      detail: { name: this.getAttribute('name') },
    }));
  };

  #render() {
    const name = this.getAttribute('name') ?? 'Unknown';
    const title = this.getAttribute('title') ?? '';
    const online = this.hasAttribute('online');

    this.shadowRoot.innerHTML = \`
      <style>
        :host { display: block; padding: 1rem; border: 1px solid #333; border-radius: 8px; }
        .status { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .online { background: #22c55e; }
        .offline { background: #6b7280; }
      </style>
      <div class="status \${online ? 'online' : 'offline'}"></div>
      <strong>\${name}</strong>
      \${title ? \`<p>\${title}</p>\` : ''}
      <button class="follow-btn">Follow</button>
    \`;
  }
}

customElements.define('user-card', UserCard);

// Usage:
// <user-card name="Ada Lovelace" title="Mathematician" online></user-card>
// card.addEventListener('follow', e => console.log(e.detail.name));`}
        lang="javascript"
        filename="user-card.js"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain Custom Element lifecycle callbacks"
        intro="Interviewers expect you to know all five callbacks and, more importantly, the constraints around each one. The constructor restriction is the most commonly misunderstood part."
        steps={[
          "Start with the constraint that matters most: the constructor cannot inspect attributes or children because they don't exist yet. It is only safe to call super() and attachShadow().",
          "connectedCallback is the real initializer. It fires when the element enters a document. Emphasize: it can fire multiple times if the element is moved in the DOM — design idempotently.",
          "disconnectedCallback is where cleanup lives. The most common production mistake is attaching event listeners in connectedCallback and never removing them, causing memory leaks. AbortController solves this cleanly.",
          "attributeChangedCallback only fires for attributes listed in static observedAttributes. Forgetting that declaration is the most common bug for developers new to Web Components.",
          "Close with the upgrade timing insight: elements can exist in the DOM before their class is registered. Design for graceful degradation during that window.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Implement a Reactive Counter Element"
        scenario={
          <>
            Build a <code>&lt;click-counter&gt;</code> custom element that tracks click counts.
            It accepts a <code>count</code> attribute (initial value), displays the current
            count, and emits a <code>countchange</code> custom event when the button is clicked.
            The element must clean up properly when removed from the DOM.
          </>
        }
        tasks={[
          "Implement the full custom element class with constructor, connectedCallback, disconnectedCallback, and attributeChangedCallback.",
          "Use the attribute reflection pattern so both `element.count = 5` and `element.setAttribute('count', '5')` work correctly.",
          "Ensure the emitted CustomEvent is composed: true so it crosses Shadow DOM boundaries.",
          "Demonstrate how you would avoid a memory leak if this element is repeatedly added and removed from the DOM.",
        ]}
        pitfalls={[
          "Setting innerHTML on every attribute change — only update what changed.",
          "Forgetting composed: true on the CustomEvent — it won't bubble out of the shadow root without it.",
          "Not guarding attributeChangedCallback against calls with identical old/new values.",
        ]}
        signal="Strong answer uses AbortController for listener cleanup, implements property getters/setters that call setAttribute, and demonstrates understanding of why composed: true is needed."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          code={`class ClickCounter extends HTMLElement {
  static observedAttributes = ['count'];
  #abortController = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Property reflection: setting .count calls setAttribute
  get count() { return parseInt(this.getAttribute('count') ?? '0', 10); }
  set count(v) { this.setAttribute('count', String(v)); }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#render();
    this.shadowRoot.querySelector('button')
      ?.addEventListener('click', () => {
        this.count++;
        this.dispatchEvent(new CustomEvent('countchange', {
          bubbles: true, composed: true, detail: { count: this.count }
        }));
      }, { signal: this.#abortController.signal });
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  attributeChangedCallback(name, old, next) {
    if (old === next) return;
    this.#updateDisplay();
  }

  #render() {
    this.shadowRoot.innerHTML = \`
      <style>:host { display: inline-flex; align-items: center; gap: 0.5rem; }</style>
      <button>Click me</button>
      <span class="count">\${this.count}</span>
    \`;
  }

  #updateDisplay() {
    const span = this.shadowRoot?.querySelector('.count');
    if (span) span.textContent = String(this.count);
  }
}

customElements.define('click-counter', ClickCounter);`}
          lang="javascript"
          filename="click-counter.js"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Custom elements are registered with <code>customElements.define(hyphenated-name, Class)</code> — names must contain a hyphen</li>
        <li>The constructor must call <code>super()</code> first and cannot inspect attributes or children — use <code>connectedCallback</code> for initialization</li>
        <li><code>connectedCallback</code> fires every time the element enters the document — design it to be idempotent and clean up in <code>disconnectedCallback</code></li>
        <li><code>attributeChangedCallback</code> only fires for attributes listed in <code>static observedAttributes</code> — a commonly missed requirement</li>
        <li>Elements exist in the DOM before their class registers — the browser upgrades them retroactively when <code>define()</code> is called</li>
        <li>Use <code>AbortController</code> in <code>connectedCallback</code> and <code>abort()</code> in <code>disconnectedCallback</code> for leak-free event listener management</li>
      </ul>
    </div>
  );
}
