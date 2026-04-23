import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-css", title: "What is CSS?", level: 2 },
  { id: "selectors-and-specificity", title: "Selectors & Specificity", level: 2 },
  { id: "the-box-model", title: "The Box Model", level: 2 },
  { id: "layout-flexbox", title: "Layout: Flexbox", level: 2 },
  { id: "cascade-and-inheritance", title: "Cascade and Inheritance", level: 3 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CssFundamentals() {
  return (
    <div className="article-content">
      <p>
        CSS (Cascading Style Sheets) controls how HTML elements look and how they are
        positioned on screen. It separates presentation from structure, which means you
        can completely redesign a page&apos;s visual appearance without touching a single
        line of HTML.
      </p>

      <h2 id="what-is-css">What is CSS?</h2>

      <p>
        A CSS <strong>rule</strong> consists of a <strong>selector</strong> and a{" "}
        <strong>declaration block</strong>:
      </p>

      <pre>
        <code>{`/* selector         declaration block */
h1               { color: #f0f0f5; font-size: 2rem; }

/* property : value */
p                { line-height: 1.7; max-width: 65ch; }`}</code>
      </pre>

      <p>
        CSS is applied to HTML in three ways — in order of increasing specificity override:
      </p>

      <ol>
        <li>
          <strong>External stylesheet</strong> — a <code>.css</code> file linked via{" "}
          <code>&lt;link&gt;</code> in <code>&lt;head&gt;</code>. Preferred: cacheable,
          reusable, separates concerns.
        </li>
        <li>
          <strong>Internal stylesheet</strong> — a <code>&lt;style&gt;</code> block inside
          <code>&lt;head&gt;</code>. Useful for one-off pages.
        </li>
        <li>
          <strong>Inline styles</strong> — <code>style="color: red"</code> directly on
          an element. Avoid: hard to override, mixes concerns.
        </li>
      </ol>

      <h2 id="selectors-and-specificity">Selectors & Specificity</h2>

      <p>
        Selectors target which elements a rule applies to. Common selector types:
      </p>

      <pre>
        <code>{`/* Element selector — low specificity */
p { color: gray; }

/* Class selector — medium specificity */
.highlight { background: yellow; }

/* ID selector — high specificity */
#hero { font-size: 3rem; }

/* Pseudo-class — same specificity as class */
a:hover { text-decoration: underline; }

/* Descendant combinator */
nav a { color: white; }

/* Direct child combinator */
ul > li { list-style: none; }`}</code>
      </pre>

      <p>
        When multiple rules target the same element, <strong>specificity</strong> determines
        which wins. The simplified scoring is:
      </p>

      <ul>
        <li>Inline styles: <code>1,0,0,0</code> — always wins</li>
        <li>ID selectors: <code>0,1,0,0</code></li>
        <li>Class / attribute / pseudo-class: <code>0,0,1,0</code></li>
        <li>Element / pseudo-element: <code>0,0,0,1</code></li>
      </ul>

      <p>
        If two rules have equal specificity, the one that appears <strong>later in the
        stylesheet</strong> wins. This is the "cascade" part of CSS.
      </p>

      <h2 id="the-box-model">The Box Model</h2>

      <p>
        Every HTML element is rendered as a rectangular box. The box model describes
        what that box is made of, from inside out:
      </p>

      <ul>
        <li><strong>Content</strong> — the actual text or image</li>
        <li><strong>Padding</strong> — transparent space inside the border</li>
        <li><strong>Border</strong> — a line around the padding</li>
        <li><strong>Margin</strong> — transparent space outside the border (collapses between siblings)</li>
      </ul>

      <p>
        By default, <code>width</code> and <code>height</code> apply to the content box
        only. Padding and border are <em>added on top</em>. This catches every developer
        off guard at least once. The fix:
      </p>

      <pre>
        <code>{`/* Apply globally — include in every project */
*, *::before, *::after {
  box-sizing: border-box;
}
/* Now width: 300px means the total rendered width is 300px,
   padding and border included. */`}</code>
      </pre>

      <h2 id="layout-flexbox">Layout: Flexbox</h2>

      <p>
        Flexbox is a one-dimensional layout system — it arranges items in a row or column.
        You enable it on a <strong>container</strong> and it affects its direct{" "}
        <strong>children</strong> (flex items):
      </p>

      <pre>
        <code>{`.nav {
  display: flex;
  align-items: center;   /* cross axis: vertically center */
  justify-content: space-between; /* main axis: spread items */
  gap: 1rem;
}

/* Flex item: grow to fill remaining space */
.nav__title {
  flex: 1;
}`}</code>
      </pre>

      <p>
        Key flex container properties:
      </p>

      <ul>
        <li><code>flex-direction: row | column</code> — sets the main axis</li>
        <li><code>justify-content</code> — aligns items along the main axis</li>
        <li><code>align-items</code> — aligns items along the cross axis</li>
        <li><code>flex-wrap: wrap</code> — allows items to wrap to the next line</li>
        <li><code>gap</code> — spacing between items (no margin collapsing headaches)</li>
      </ul>

      <h3 id="cascade-and-inheritance">Cascade and Inheritance</h3>

      <p>
        Not all CSS properties are inherited. Typography properties like{" "}
        <code>color</code>, <code>font-size</code>, and <code>line-height</code> are
        inherited — set them on <code>&lt;body&gt;</code> and all descendants get them
        for free. Layout properties like <code>margin</code>, <code>padding</code>, and{" "}
        <code>border</code> are <em>not</em> inherited.
      </p>

      <p>
        You can force inheritance with <code>inherit</code>, reset a property to the
        browser default with <code>initial</code>, or use <code>unset</code> which does
        both depending on whether the property is naturally inherited.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>CSS separates visual presentation from HTML structure</li>
        <li>Specificity determines which rule wins: inline &gt; ID &gt; class &gt; element</li>
        <li>Always set <code>box-sizing: border-box</code> globally — it makes layout math predictable</li>
        <li>Flexbox solves most 1D layout problems; use <code>gap</code> instead of margins between flex items</li>
        <li>Typography properties are inherited; layout properties are not</li>
        <li>When two rules have equal specificity, the later one in the file wins (the cascade)</li>
      </ul>
    </div>
  );
}
