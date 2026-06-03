import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const treeBoundaryDiagram = String.raw`flowchart TD
  subgraph ReactTree ["React Tree (virtual DOM)"]
    APP["&lt;App&gt;"]
    PAGE["&lt;ProfilePage&gt;"]
    RC["&lt;React.div className='wrapper'&gt;"]
    APP --> PAGE
    PAGE --> RC
  end

  subgraph WCBoundary ["Web Component Boundary"]
    HOST["&lt;user-card name='Ada'&gt;\n(shadow host — real DOM element)"]
    RC -->|"React renders WC as DOM element"| HOST
  end

  subgraph ShadowTree ["Shadow DOM Tree (WC-owned)"]
    SR["shadow-root"]
    IMG["&lt;img class='avatar'&gt;"]
    NAME["&lt;span class='name'&gt;"]
    SR --> IMG
    SR --> NAME
    HOST -->|"shadow boundary"| SR
  end

  style WCBoundary fill:#1e293b,stroke:#f97316,color:#f1f5f9
  style ShadowTree fill:#0f172a,stroke:#f97316,color:#f1f5f9`;

const attrVsPropDiagram = String.raw`flowchart LR
  subgraph React18 ["React 18 — attribute-only"]
    R18["React 18\nJSX prop → setAttribute()"]
    R18STR["✅ string values work\nname='Ada'"]
    R18OBJ["❌ objects/arrays become\n'[object Object]'"]
    R18 --> R18STR
    R18 --> R18OBJ
  end

  subgraph React19 ["React 19 — property + attribute"]
    R19["React 19\nJSX prop → element property\n(falls back to attribute)"]
    R19STR["✅ strings work"]
    R19OBJ["✅ objects work\ndata={config}"]
    R19EV["✅ custom events work\nonmycustomevent={handler}"]
    R19 --> R19STR
    R19 --> R19OBJ
    R19 --> R19EV
  end`;

export const toc: TocItem[] = [
  { id: "react-wc-interop", title: "React and Web Components: The Interop Story", level: 2 },
  { id: "react-tree-boundary", title: "React Tree to Shadow DOM Boundary", level: 3 },
  { id: "attr-vs-prop", title: "The Attribute vs Property Problem", level: 2 },
  { id: "react18-gotcha", title: "React 18: Strings Work, Objects Don't", level: 3 },
  { id: "react19-improvement", title: "React 19: Full Property Support", level: 3 },
  { id: "attr-prop-diagram", title: "React 18 vs React 19 WC Support", level: 3 },
  { id: "wrapper-pattern", title: "The Wrapper Pattern (React 18 Mitigation)", level: 2 },
  { id: "react-inside-wc", title: "React Inside a Web Component", level: 2 },
  { id: "custom-events", title: "Custom Events and React Event Handlers", level: 2 },
  { id: "version-comparison", title: "React 18 vs React 19 Comparison", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function WebComponentsAndReact() {
  return (
    <div className="article-content">
      <p>
        Web Components are DOM elements. React renders DOM elements. At a basic level, you
        can drop a Web Component into JSX just like a <code>&lt;div&gt;</code> — React has
        no special knowledge that <code>&lt;user-card&gt;</code> is a custom element, and
        it does not need any. But the boundary between React&apos;s property system and the
        DOM&apos;s attribute/property distinction creates friction that every React developer
        using Web Components eventually hits.
      </p>
      <p>
        React 19 substantially improved Web Component interop. If you are on React 18, the
        wrapper pattern is the reliable solution. Understanding <em>why</em> the problem
        exists makes the fix obvious.
      </p>

      <h2 id="react-wc-interop">React and Web Components: The Interop Story</h2>
      <p>
        React treats any lowercase hyphenated tag as a custom element and passes it through to
        the DOM. The React element <code>&lt;user-card name=&quot;Ada&quot; /&gt;</code> produces
        a real <code>&lt;user-card&gt;</code> DOM node with the <code>name</code> attribute set.
        React&apos;s reconciler updates attributes when props change. The lifecycle of the
        custom element runs normally — <code>connectedCallback</code> fires when the node
        enters the DOM, <code>disconnectedCallback</code> fires when React unmounts it.
      </p>

      <CodeBlock
        code={`// Basic Web Component usage in React — this just works for string props
function ProfilePage() {
  return (
    <div>
      {/* React renders this as a real <user-card> DOM element */}
      <user-card
        name="Ada Lovelace"
        title="Mathematician"
        avatar-url="/avatars/ada.jpg"
      />
    </div>
  );
}

// React TypeScript: custom elements need type declarations
// to avoid "Property does not exist on JSX.IntrinsicElements" errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'user-card': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          name?: string;
          title?: string;
          'avatar-url'?: string;
        },
        HTMLElement
      >;
    }
  }
}`}
        lang="typescript"
        filename="ProfilePage.tsx"
      />

      <h3 id="react-tree-boundary">React Tree to Shadow DOM Boundary</h3>
      <MermaidDiagram
        chart={treeBoundaryDiagram}
        title="React Virtual DOM Tree → Web Component → Shadow DOM"
        caption="React manages its virtual DOM tree and renders the Web Component as a real DOM node. The shadow root and everything inside it is owned by the Web Component, invisible to React's reconciler. The orange boundary is where React's control ends."
        minHeight={440}
      />

      <h2 id="attr-vs-prop">The Attribute vs Property Problem</h2>
      <p>
        This is the root of most React + Web Component friction. HTML elements have two ways
        to receive data: <strong>attributes</strong> (strings in the HTML/DOM, set via{" "}
        <code>setAttribute</code>) and <strong>properties</strong> (JavaScript values on the
        object, set directly like <code>{"element.data = { ... }"}</code>).
      </p>
      <p>
        Built-in HTML elements map many attributes to properties automatically — the browser
        handles reflection. Custom elements only reflect what you explicitly implement (via
        getter/setter pairs). When React sets a prop on a custom element, the question is:
        does it call <code>setAttribute()</code> (produces a string) or set the property
        directly (preserves the JavaScript value)?
      </p>

      <h3 id="react18-gotcha">React 18: Strings Work, Objects Don't</h3>
      <p>
        React 18 uses a heuristic: if the property name exists on a known HTML element, set
        it as a property. For unknown custom elements, React 18 falls back to
        <code>setAttribute()</code>. This means <em>string</em> props work fine (attributes
        are strings anyway), but passing objects, arrays, or booleans produces{" "}
        <code>&quot;[object Object]&quot;</code>, <code>&quot;true/false&quot;</code>, or
        stringified arrays — not what you intended.
      </p>

      <CodeBlock
        code={`// React 18 behavior with custom elements

// ✅ Works — strings survive setAttribute()
<user-card name="Ada" title="Mathematician" />

// ❌ Broken — React 18 calls setAttribute('config', '[object Object]')
<user-card config={{ theme: 'dark', size: 'large' }} />

// ❌ Broken — becomes the string "true", not boolean
<user-card disabled={true} />

// ❌ Broken — becomes "[object Array]"
<user-card items={['a', 'b', 'c']} />

// The workaround in React 18: use a ref to set properties directly
function UserCardWrapper({ config }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.config = config;  // Set property, not attribute
    }
  }, [config]);
  return <user-card ref={ref} />;
}`}
        lang="typescript"
      />

      <h3 id="react19-improvement">React 19: Full Property Support</h3>
      <p>
        React 19 addressed this directly. Custom elements now receive props as DOM properties
        rather than attributes wherever possible. If the property exists on the element&apos;s
        prototype, React sets it directly. Only unknown string-valued props fall back to
        <code>setAttribute()</code>. This means objects, arrays, functions, and booleans all
        work correctly without a ref wrapper.
      </p>

      <CodeBlock
        code={`// React 19 behavior — all of these work correctly
<user-card
  name="Ada"                           // string → property
  config={{ theme: 'dark' }}           // object → property (not "[object Object]")
  items={['a', 'b', 'c']}             // array → property
  disabled={true}                      // boolean → property
  onfollow={(e) => console.log(e)}    // custom event handler — React 19 supports lowercase
/>

// React 19 also properly handles custom events with lowercase names
// Previously you needed addEventListener in a useEffect
<user-card onfollow={handleFollow} />
// equivalent to: element.addEventListener('follow', handleFollow)`}
        lang="typescript"
      />

      <h3 id="attr-prop-diagram">React 18 vs React 19 WC Support</h3>
      <MermaidDiagram
        chart={attrVsPropDiagram}
        title="React 18 vs React 19: How Props Reach Web Components"
        caption="React 18 routes most custom element props through setAttribute(), turning non-string values into strings. React 19 sets properties directly on the DOM element, preserving JavaScript types. This is the single most impactful interop improvement."
        minHeight={320}
      />

      <h2 id="wrapper-pattern">The Wrapper Pattern (React 18 Mitigation)</h2>
      <p>
        When you are on React 18 (or need to support it), wrap the Web Component in a React
        component that uses a ref to imperatively set complex properties. This is the
        official recommended approach for React 18 + Web Components.
      </p>

      <CodeBlock
        code={`import { useRef, useEffect } from 'react';

interface UserCardProps {
  name: string;
  config: { theme: string; size: string };
  items: string[];
  onFollow?: (event: CustomEvent) => void;
}

// React wrapper around a Web Component
function UserCard({ name, config, items, onFollow }: UserCardProps) {
  const ref = useRef<HTMLElement>(null);

  // Set complex properties imperatively via ref
  useEffect(() => {
    if (!ref.current) return;
    ref.current.config = config;  // object property
    ref.current.items = items;    // array property
  }, [config, items]);

  // Wire up custom events via addEventListener in useEffect
  useEffect(() => {
    if (!ref.current || !onFollow) return;
    const el = ref.current;
    const handler = (e: Event) => onFollow(e as CustomEvent);
    el.addEventListener('follow', handler);
    return () => el.removeEventListener('follow', handler);
  }, [onFollow]);

  // String props can be passed directly as attributes
  return <user-card ref={ref} name={name} />;
}

// Usage — now fully type-safe and React-idiomatic
function App() {
  return (
    <UserCard
      name="Ada Lovelace"
      config={{ theme: 'dark', size: 'large' }}
      items={['profile', 'posts', 'about']}
      onFollow={(e) => console.log('Following:', e.detail)}
    />
  );
}`}
        lang="typescript"
        filename="UserCard.tsx"
      />

      <h2 id="react-inside-wc">React Inside a Web Component</h2>
      <p>
        The reverse direction also works: you can mount a React tree inside a Web
        Component&apos;s shadow root using <code>ReactDOM.createRoot()</code>. This lets
        React components live inside Web Components — useful for gradual migration from Web
        Components to React, or for building React-powered widgets that run in any host page.
      </p>

      <CodeBlock
        code={`import ReactDOM from 'react-dom/client';
import { createElement } from 'react';
import App from './App';  // A regular React component

class ReactWidget extends HTMLElement {
  #root = null;

  connectedCallback() {
    // createRoot works on any DOM element — including a shadow root
    this.attachShadow({ mode: 'open' });
    this.#root = ReactDOM.createRoot(this.shadowRoot);

    // Pass Web Component attributes as props to the React tree
    const config = JSON.parse(this.getAttribute('config') ?? '{}');
    this.#root.render(createElement(App, { config }));
  }

  disconnectedCallback() {
    // Clean up the React root when the element is removed
    this.#root?.unmount();
    this.#root = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    // Re-render React tree with updated props
    if (name === 'config') {
      this.#root?.render(
        createElement(App, { config: JSON.parse(newVal ?? '{}') })
      );
    }
  }

  static observedAttributes = ['config'];
}

customElements.define('react-widget', ReactWidget);`}
        lang="javascript"
        filename="react-widget.js"
      />

      <h2 id="custom-events">Custom Events and React Event Handlers</h2>
      <p>
        React&apos;s synthetic event system only handles native browser events it knows about.
        Custom events dispatched from Web Components (like <code>follow</code>,{" "}
        <code>countchange</code>) are not in React&apos;s event list. React 18 requires
        attaching these with native <code>addEventListener</code> in a <code>useEffect</code>.
        React 19 handles lowercase event names as <code>on[eventname]</code> props on custom
        elements.
      </p>

      <CodeBlock
        code={`// React 18: custom events require addEventListener
function Parent() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const handler = (e) => console.log('follow event', e.detail);
    el?.addEventListener('follow', handler);
    return () => el?.removeEventListener('follow', handler);
  }, []);
  return <user-card ref={ref} name="Ada" />;
}

// React 19: lowercase custom event names work as JSX props
function Parent() {
  return (
    <user-card
      name="Ada"
      onfollow={(e) => console.log('follow event', e.detail)}
    />
  );
}`}
        lang="typescript"
      />

      <h2 id="version-comparison">React 18 vs React 19 Comparison</h2>
      <ArticleTable
        caption="React 19 resolves the major friction points in React + Web Component interop. Knowing the differences is critical for codebases that span both React versions."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>React 18</th>
              <th>React 19</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>String props</td>
              <td>setAttribute() — works correctly</td>
              <td>Property assignment — works correctly</td>
            </tr>
            <tr>
              <td>Object/array props</td>
              <td>setAttribute() → becomes <code>&quot;[object Object]&quot;</code></td>
              <td>Property assignment — object preserved correctly</td>
            </tr>
            <tr>
              <td>Boolean props</td>
              <td>setAttribute() → becomes string <code>&quot;true&quot;</code></td>
              <td>Property assignment — boolean preserved</td>
            </tr>
            <tr>
              <td>Custom event handlers</td>
              <td>Must use <code>addEventListener</code> in <code>useEffect</code></td>
              <td>
                <code>onmycustomevent</code> JSX prop works for lowercase event names
              </td>
            </tr>
            <tr>
              <td>TypeScript types</td>
              <td>Must manually extend <code>JSX.IntrinsicElements</code></td>
              <td>Must manually extend <code>JSX.IntrinsicElements</code> (same)</td>
            </tr>
            <tr>
              <td>ref behavior</td>
              <td>ref points to DOM element — needed for property workaround</td>
              <td>ref still works; property workaround usually not needed</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to explain React + Web Component interop"
        intro="Interviewers use this question to probe whether you understand the attribute/property distinction in the DOM and know the version-specific React behavior. A weak answer says 'they work together'. A strong answer explains the friction and the fix."
        steps={[
          "Establish the baseline: Web Components are DOM elements. React renders them like any DOM element — the custom element lifecycle runs normally.",
          "Explain the core friction: the attribute/property split. Attributes are strings. DOM properties are JavaScript values. React 18 routes most custom element props through setAttribute, which destroys non-string values.",
          "Name the React 18 fix: the wrapper pattern — a React component wraps the WC and uses a ref + useEffect to set properties and addEventListener for custom events.",
          "Explain React 19's improvement: props are now set as DOM properties on custom elements, preserving objects, arrays, and booleans. Lowercase custom event names work as JSX props.",
          "Close with the reverse direction: React can also run inside a shadow root via ReactDOM.createRoot(shadowRoot) — useful for React-powered widgets deployed as Web Components.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Wrap a Web Component for React 18"
        scenario={
          <>
            Your team uses a design system built with Web Components. The{" "}
            <code>&lt;ds-select&gt;</code> component accepts a <code>options</code> property
            (an array of <code>&#123; value: string, label: string &#125;</code> objects) and
            emits a custom <code>selectionchange</code> event with{" "}
            <code>detail.value</code>. Your app is on React 18. Write a React wrapper.
          </>
        }
        tasks={[
          "Write the React wrapper component DsSelect that correctly passes the options array as a DOM property (not attribute) to the underlying ds-select element.",
          "Wire up the selectionchange custom event handler via addEventListener in a useEffect with proper cleanup.",
          "Add TypeScript types for both the wrapper's props and the custom element's IntrinsicElements declaration.",
          "Explain what would change in this wrapper if the app upgraded to React 19.",
        ]}
        pitfalls={[
          "Passing options as a JSX prop directly in React 18 — it will become '[object Array]' on the element.",
          "Forgetting to clean up the event listener in the useEffect return function.",
          "Not handling the case where ref.current is null in the useEffect.",
        ]}
        signal="Strong answer uses useRef + useEffect for property assignment, separate useEffect for event listener with cleanup, correct TypeScript typing, and correctly states that React 19 would eliminate the property useEffect and allow onselectionchange as a JSX prop."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          code={`import { useRef, useEffect } from 'react';

// TypeScript: declare the custom element for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ds-select': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface SelectOption { value: string; label: string; }

interface DsSelectProps {
  options: SelectOption[];
  value?: string;
  onSelectionChange?: (value: string) => void;
  placeholder?: string;
}

export function DsSelect({ options, value, onSelectionChange, placeholder }: DsSelectProps) {
  const ref = useRef<HTMLElement>(null);

  // React 18: set array property imperatively via ref
  useEffect(() => {
    if (ref.current) {
      (ref.current as any).options = options;
    }
  }, [options]);

  // React 18: custom events need addEventListener
  useEffect(() => {
    const el = ref.current;
    if (!el || !onSelectionChange) return;
    const handler = (e: Event) => {
      onSelectionChange((e as CustomEvent).detail.value);
    };
    el.addEventListener('selectionchange', handler);
    return () => el.removeEventListener('selectionchange', handler);
  }, [onSelectionChange]);

  return (
    <ds-select
      ref={ref}
      value={value}
      placeholder={placeholder}
    />
  );
}

// React 19 version — no useEffect needed for options or events:
// <ds-select options={options} onselectionchange={(e) => handleChange(e.detail.value)} />`}
          lang="typescript"
          filename="DsSelect.tsx"
        />
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Web Components work in React JSX because they are DOM elements — React does not need special knowledge of them</li>
        <li>React 18&apos;s root friction: it routes custom element props through <code>setAttribute()</code>, turning objects and arrays into <code>&quot;[object Object]&quot;</code></li>
        <li>The React 18 fix is the wrapper pattern: a React component uses <code>useRef</code> + <code>useEffect</code> to set properties directly and <code>addEventListener</code> for custom events</li>
        <li>React 19 resolves this: props are now set as DOM properties on custom elements, preserving JavaScript types without a wrapper</li>
        <li>Custom events require <code>addEventListener</code> in React 18; React 19 supports lowercase <code>onmycustomevent</code> JSX props</li>
        <li>React can run inside a Web Component&apos;s shadow root via <code>ReactDOM.createRoot(this.shadowRoot)</code> — enabling React-powered widgets deployed as standard DOM elements</li>
      </ul>
    </div>
  );
}
