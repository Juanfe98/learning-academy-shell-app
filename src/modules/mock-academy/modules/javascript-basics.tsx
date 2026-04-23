import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-javascript", title: "What is JavaScript?", level: 2 },
  { id: "variables-and-types", title: "Variables and Types", level: 2 },
  { id: "functions", title: "Functions", level: 2 },
  { id: "arrow-functions", title: "Arrow Functions", level: 3 },
  { id: "dom-manipulation", title: "DOM Manipulation", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function JavaScriptBasics() {
  return (
    <div className="article-content">
      <p>
        JavaScript is the only programming language that runs natively in browsers. It
        started as a simple scripting language for making pages interactive, but has
        evolved into a full-featured language that powers everything from UI animations
        to backend servers (via Node.js) to machine learning in the browser.
      </p>

      <h2 id="what-is-javascript">What is JavaScript?</h2>

      <p>
        JavaScript is a <strong>dynamically typed, interpreted, multi-paradigm</strong>{" "}
        language. "Dynamically typed" means variables don&apos;t have fixed types — a
        variable can hold a number, then a string, then an object. "Interpreted" means
        there is no separate compile step; the browser (or Node.js) reads and executes
        the code directly (modern engines JIT-compile it for performance).
      </p>

      <p>
        JavaScript is <em>not</em> Java. The naming was a marketing decision in 1995.
        Despite the name, the two languages share almost nothing.
      </p>

      <h2 id="variables-and-types">Variables and Types</h2>

      <p>
        Use <code>const</code> by default. Use <code>let</code> only when you need to
        reassign. Never use <code>var</code> — it has function scope (not block scope)
        and hoisting behavior that causes subtle bugs.
      </p>

      <pre>
        <code>{`const name = "Alice";       // string
const age = 30;            // number
const active = true;       // boolean
const score = null;        // null (intentional absence of value)
let counter = 0;           // let: reassignable

// Primitive types in JavaScript:
// string, number, bigint, boolean, undefined, null, symbol`}</code>
      </pre>

      <p>
        JavaScript has one number type (IEEE 754 double-precision float) for both integers
        and decimals. This means <code>0.1 + 0.2 !== 0.3</code> — a famous quirk. For
        precise decimal arithmetic (finance, measurements), use a library like{" "}
        <code>decimal.js</code> or work in integer cents.
      </p>

      <p>
        <strong>Objects</strong> and <strong>arrays</strong> are the primary data structures:
      </p>

      <pre>
        <code>{`const user = {
  id: 1,
  name: "Alice",
  roles: ["admin", "editor"],
};

// Access properties
console.log(user.name);        // "Alice"
console.log(user["roles"][0]); // "admin"

// Destructuring — extract into named variables
const { name, roles } = user;
const [firstRole] = roles;`}</code>
      </pre>

      <h2 id="functions">Functions</h2>

      <p>
        Functions are first-class values in JavaScript — you can pass them as arguments,
        return them from other functions, and store them in variables.
      </p>

      <pre>
        <code>{`// Function declaration — hoisted (can call before definition)
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Function expression — NOT hoisted
const greet = function(name) {
  return \`Hello, \${name}!\`;
};

console.log(greet("Bob")); // "Hello, Bob!"`}</code>
      </pre>

      <h3 id="arrow-functions">Arrow Functions</h3>

      <p>
        Arrow functions, introduced in ES6, are a more concise syntax and have a key
        behavioral difference: they don&apos;t have their own <code>this</code> binding
        (they inherit it from the surrounding scope):
      </p>

      <pre>
        <code>{`// Full arrow function
const double = (n) => {
  return n * 2;
};

// Concise body — implicit return when no braces
const double = (n) => n * 2;

// Single param — parentheses optional
const square = n => n * n;

// No params
const getTimestamp = () => Date.now();`}</code>
      </pre>

      <p>
        Arrow functions are the idiomatic choice for callbacks and functional array methods:
      </p>

      <pre>
        <code>{`const numbers = [1, 2, 3, 4, 5];

const doubled  = numbers.map(n => n * 2);     // [2, 4, 6, 8, 10]
const evens    = numbers.filter(n => n % 2 === 0); // [2, 4]
const sum      = numbers.reduce((acc, n) => acc + n, 0); // 15`}</code>
      </pre>

      <h2 id="dom-manipulation">DOM Manipulation</h2>

      <p>
        The <strong>DOM</strong> (Document Object Model) is the browser&apos;s
        in-memory representation of an HTML page as a tree of objects. JavaScript can
        read and modify this tree:
      </p>

      <pre>
        <code>{`// Select elements
const heading = document.querySelector("h1");
const buttons = document.querySelectorAll("button");

// Read and write content
heading.textContent = "New heading text";
heading.innerHTML = "<em>Italic</em> heading"; // caution: XSS risk

// Modify styles and classes
heading.style.color = "red";
heading.classList.add("highlighted");
heading.classList.toggle("active");

// React to events
const btn = document.querySelector("#submit");
btn.addEventListener("click", (event) => {
  event.preventDefault(); // stop default browser action
  console.log("Button clicked!");
});`}</code>
      </pre>

      <p>
        In modern development you rarely manipulate the DOM directly — frameworks like
        React, Vue, or Svelte manage it for you. But understanding the DOM is essential
        for debugging, writing vanilla JS utilities, and understanding what those
        frameworks are doing under the hood.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>Use <code>const</code> by default; <code>let</code> when you need to reassign; never <code>var</code></li>
        <li>JavaScript has one number type — beware floating-point precision issues</li>
        <li>Functions are first-class values: pass them, return them, store them</li>
        <li>Arrow functions are concise and don&apos;t rebind <code>this</code></li>
        <li><code>map</code>, <code>filter</code>, and <code>reduce</code> are the workhorses of array transformation</li>
        <li>The DOM is a tree of objects representing the page — JavaScript can query and modify any node</li>
      </ul>
    </div>
  );
}
