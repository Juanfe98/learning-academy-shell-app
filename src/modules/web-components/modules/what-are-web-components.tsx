import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const platformDiagram = String.raw`flowchart TD
  HTML["HTML Parser\n(DOM tree)"]
  CSS["CSS Engine\n(style cascade)"]
  JS["JavaScript Engine\n(V8 / SpiderMonkey)"]
  WC["Web Components\n(Custom Elements + Shadow DOM\n+ HTML Templates + ES Modules)"]
  BROWSER["Browser Platform"]
  REACT["React / Vue / Angular\n(framework layer)"]

  BROWSER --> HTML
  BROWSER --> CSS
  BROWSER --> JS
  JS --> WC
  JS --> REACT
  WC -->|"built on"| HTML
  WC -->|"built on"| CSS
  WC -->|"built on"| JS
  REACT -->|"uses"| WC`;

const fourSpecsDiagram = String.raw`flowchart LR
  CE["Custom Elements\ndefine new HTML tags\ncustomElements.define()"]
  SD["Shadow DOM\nscoped DOM subtree\nattachShadow()"]
  HT["HTML Templates\ninert reusable markup\n<template> + <slot>"]
  ESM["ES Modules\nstandard import/export\n<script type=module>"]

  CE -->|"renders into"| SD
  CE -->|"clones"| HT
  ESM -->|"delivers"| CE
  ESM -->|"delivers"| SD
  ESM -->|"delivers"| HT`;

export const toc: TocItem[] = [
  { id: "the-problem", title: "The Problem Web Components Solve", level: 2 },
  { id: "browser-native", title: "Browser-Native: No Framework Required", level: 3 },
  { id: "the-four-specs", title: "The Four Specs", level: 2 },
  { id: "custom-elements-overview", title: "Custom Elements", level: 3 },
  { id: "shadow-dom-overview", title: "Shadow DOM", level: 3 },
  { id: "html-templates-overview", title: "HTML Templates", level: 3 },
  { id: "es-modules-overview", title: "ES Modules", level: 3 },
  { id: "how-specs-compose", title: "How the Specs Compose", level: 2 },
  { id: "wc-vs-react", title: "Web Components vs React Components", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatAreWebComponents() {
  return (
    <div className="article-content">
      <p>
        Every major frontend framework ships its own component model: React has function
        components and hooks, Vue has single-file components, Angular has decorators. They all
        solve the same problem — encapsulating a piece of UI so it can be reused. But they
        solve it inside the framework, not inside the browser.
      </p>
      <p>
        <strong>Web Components</strong> are the browser&apos;s own answer to that same problem.
        They are a suite of W3C standards that let you define custom HTML elements — with scoped
        styles and encapsulated DOM — that work in any browser, without any framework. A{" "}
        <code>&lt;user-card&gt;</code> you build with Web Components works in a plain HTML file,
        a React app, a Vue app, or an email template with an embedded browser. That portability
        is their defining property.
      </p>

      <h2 id="the-problem">The Problem Web Components Solve</h2>
      <p>
        Before Web Components, the only way to ship reusable UI was to ship a framework. A
        design system team building a button had to pick: React package, Vue package, Angular
        package, or copy-paste HTML. Every target framework meant a separate build, separate
        maintenance, separate bundle.
      </p>
      <p>
        Web Components collapse that matrix. One implementation, every consumer. The trade-off
        is DX: Web Components are verbose, have no built-in reactivity, and the ecosystem is
        smaller than React&apos;s. But for design systems, embeddable widgets, and third-party
        components that need to survive framework churn, they are uniquely positioned.
      </p>

      <h3 id="browser-native">Browser-Native: No Framework Required</h3>
      <p>
        When you call <code>customElements.define(&apos;my-button&apos;, MyButton)</code>, the
        browser registers <code>MyButton</code> as the class responsible for every{" "}
        <code>&lt;my-button&gt;</code> in the document. The browser&apos;s HTML parser,
        DOM APIs, and CSS engine all become aware of this element. There is no virtual DOM
        diffing. There is no framework reconciler. It is a first-class citizen of the platform.
      </p>

      <MermaidDiagram
        chart={platformDiagram}
        title="Web Components in the Browser Platform"
        caption="Web Components sit at the same layer as the browser's built-in HTML/CSS/JS primitives. Frameworks like React are built on top of those same primitives — they use Web Components, they don't replace them."
        minHeight={440}
      />

      <h2 id="the-four-specs">The Four Specs</h2>
      <p>
        &quot;Web Components&quot; is an umbrella term for four independent but composable
        specifications. Each solves a distinct piece of the component problem. You can use them
        separately, but they are designed to work together.
      </p>

      <h3 id="custom-elements-overview">Custom Elements</h3>
      <p>
        The <strong>Custom Elements</strong> spec lets you register a new HTML tag name backed
        by a JavaScript class. The class extends <code>HTMLElement</code> (or another built-in
        element) and defines lifecycle callbacks that the browser calls at predictable moments —
        when the element is connected to the DOM, when an attribute changes, when it is moved
        to a new document. This is the heart of Web Components: it is what makes{" "}
        <code>&lt;my-button&gt;</code> a real DOM element with behavior, not just a styled{" "}
        <code>&lt;div&gt;</code>.
      </p>

      <h3 id="shadow-dom-overview">Shadow DOM</h3>
      <p>
        The <strong>Shadow DOM</strong> spec attaches a private DOM subtree to any element.
        CSS rules defined outside cannot reach inside the shadow tree, and styles inside cannot
        leak out (with carefully controlled exceptions). This is genuine encapsulation at the
        DOM level — not naming conventions like BEM, but an actual boundary enforced by the
        browser&apos;s rendering engine.
      </p>

      <h3 id="html-templates-overview">HTML Templates</h3>
      <p>
        The <code>&lt;template&gt;</code> tag contains inert HTML: it is parsed but not
        rendered. Scripts inside it do not run. Images do not load. It exists purely to be
        cloned and stamped into the DOM on demand. The <code>&lt;slot&gt;</code> element,
        used inside a shadow root, defines projection points where light DOM children appear
        — analogous to React&apos;s <code>children</code> prop.
      </p>

      <h3 id="es-modules-overview">ES Modules</h3>
      <p>
        <strong>ES Modules</strong> are not specific to Web Components, but they complete the
        picture. <code>&lt;script type=&quot;module&quot;&gt;</code> gives you native JavaScript
        modules in the browser — deferred execution, static imports, strict mode by default.
        Custom element definitions live in module files and are imported where needed, with no
        global script concatenation required.
      </p>

      <h2 id="how-specs-compose">How the Specs Compose</h2>
      <p>
        The specs are orthogonal. Shadow DOM does not require Custom Elements. Templates do
        not require Shadow DOM. In practice, you use all four together: the ES module delivers
        the class, the class defines a Custom Element, the element&apos;s constructor attaches
        a Shadow DOM, and the shadow root clones a Template to build its initial structure.
      </p>

      <MermaidDiagram
        chart={fourSpecsDiagram}
        title="The Four Specs — Composition Map"
        caption="Each spec solves one problem. Custom Elements own the tag and lifecycle. Shadow DOM owns encapsulation. HTML Templates own reusable structure. ES Modules own delivery. Together they form a complete component model."
        minHeight={300}
      />

      <CodeBlock
        code={`// A minimal Web Component using all four specs
// delivered via ES module, Custom Element + Shadow DOM + Template

class UserCard extends HTMLElement {
  // Shadow DOM: attach an encapsulated subtree
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // HTML Template: clone the inert markup
    const template = document.getElementById('user-card-template');
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // Fill in data from attributes
    const name = this.getAttribute('name') ?? 'Anonymous';
    this.shadowRoot.querySelector('.name').textContent = name;
  }
}

// Custom Elements: register the tag
customElements.define('user-card', UserCard);

// Usage in HTML:
// <user-card name="Ada Lovelace"></user-card>`}
        lang="javascript"
        filename="user-card.js"
      />

      <h2 id="wc-vs-react">Web Components vs React Components</h2>
      <p>
        React developers often ask: &quot;Which one should I use?&quot; That is the wrong
        framing. They operate at different layers. A React component is an abstraction in your
        application code. A Web Component is a first-class browser primitive. They can
        coexist — React can render Web Components, and Web Components can host React trees.
      </p>

      <ArticleTable
        caption="Web Components and React components solve the same problem at different layers. Understanding what each owns helps you decide when to use which."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Web Component</th>
              <th>React Component</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Runtime requirement</td>
              <td>None — the browser is the runtime</td>
              <td>React library must be present</td>
            </tr>
            <tr>
              <td>State management</td>
              <td>Manual — class properties, AttributeChangedCallback</td>
              <td>Built-in — useState, useReducer, Context</td>
            </tr>
            <tr>
              <td>Style encapsulation</td>
              <td>Native Shadow DOM boundary</td>
              <td>CSS Modules, styled-components, or Tailwind conventions</td>
            </tr>
            <tr>
              <td>Composition</td>
              <td><code>&lt;slot&gt;</code> projection</td>
              <td><code>children</code> prop, render props, compound patterns</td>
            </tr>
            <tr>
              <td>Framework portability</td>
              <td>Works anywhere — React, Vue, Angular, vanilla HTML</td>
              <td>React ecosystem only</td>
            </tr>
            <tr>
              <td>Reactivity model</td>
              <td>Pull-based: you call <code>render()</code> manually</td>
              <td>Push-based: React drives re-renders</td>
            </tr>
            <tr>
              <td>Ecosystem maturity</td>
              <td>Smaller — Lit is the dominant library</td>
              <td>Massive — hooks, routing, state libraries</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Design systems, embeddable widgets, framework-agnostic primitives</td>
              <td>Application-layer UI with complex state and interactions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain Web Components in an interview"
        intro="Interviewers ask this to probe whether you understand the browser platform vs framework abstractions. A weak answer lists the four specs. A strong answer explains the portability story and the layer distinction."
        steps={[
          "Lead with the problem: any framework's component model is framework-locked. A React button cannot be dropped into a Vue app. Web Components solve this by making the browser the runtime.",
          "Name the four specs concisely: Custom Elements (register a new HTML tag), Shadow DOM (scoped styles and DOM), HTML Templates (inert reusable markup with slots), ES Modules (standard delivery).",
          "Explain the layer model: Web Components sit at the platform layer, alongside native DOM elements. React is built on top of that layer, not in competition with it.",
          "Name the tradeoff: Web Components are verbose and have no built-in reactivity. Lit (the dominant library) adds a reactive property system with ~5KB overhead. For application-layer UI, React is still better DX.",
          "Close with a use case: design systems are the canonical win. Build primitives as Web Components, consume them in any framework. Adobe Spectrum, Shoelace, and FAST all follow this model.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Platform Layer vs Framework Layer"
        scenario={
          <>
            Your team is building a shared design system that will be consumed by three product
            teams: one using React 18, one using Vue 3, and one using a legacy jQuery codebase.
            The design system needs a <code>&lt;ds-button&gt;</code> component with theming
            support and an accessible click handler.
          </>
        }
        tasks={[
          "Explain why Web Components are a better fit than a React component library for this cross-framework design system.",
          "Identify which of the four specs you would use for this button and why each one is needed.",
          "Describe how theming would work across the Shadow DOM boundary — specifically what CSS mechanism lets the consuming app control the button's colors.",
          "What is the one significant DX cost compared to building this in React, and how would you mitigate it?",
        ]}
        pitfalls={[
          "Saying Web Components replace React — they don't. They operate at different layers.",
          "Forgetting that CSS custom properties pierce the Shadow DOM boundary — this is the theming mechanism.",
          "Recommending Web Components for application-layer UI where React's reactivity model would be better DX.",
        ]}
        signal="A strong answer names Shadow DOM + CSS custom properties for theming, acknowledges the verbose reactivity cost, and mentions Lit as the mitigation. They clearly separate 'design system primitives' from 'application UI' as the deciding factor."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Web Components are a W3C standard suite, not a framework — the browser is the runtime</li>
        <li>Four specs compose together: Custom Elements (tags), Shadow DOM (encapsulation), HTML Templates (structure), ES Modules (delivery)</li>
        <li>The defining property is portability: one implementation works in React, Vue, Angular, and vanilla HTML</li>
        <li>Web Components and React are not competitors — they operate at different layers of the stack</li>
        <li>The canonical use case is design systems and embeddable widgets that must survive framework churn</li>
        <li>The main DX cost vs React is manual reactivity — libraries like Lit add a thin reactive layer to close this gap</li>
      </ul>
    </div>
  );
}
