import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const hierarchyDiagram = String.raw`flowchart LR
  A["Atoms<br/>Button, Input, Label, Icon"] --> M["Molecules<br/>SearchField = Label + Input + Button"]
  M --> O["Organisms<br/>Header = Logo + Nav + SearchField"]
  O --> T["Templates<br/>page skeleton, no real data"]
  T --> P["Pages<br/>template + real content"]
  P -.-> |"validates the<br/>lower levels"| A`;

const mappingDiagram = String.raw`flowchart TD
  subgraph Frost["Atomic Design (Brad Frost)"]
    F1["Atoms"]
    F2["Molecules"]
    F3["Organisms"]
    F4["Templates"]
    F5["Pages"]
  end
  subgraph Real["Typical real codebase"]
    R1["tokens + primitives<br/>@acme/react"]
    R2["composed components"]
    R3["feature / section components"]
    R4["layouts (in product app)"]
    R5["routes (in product app)"]
  end
  F1 --> R1
  F2 --> R2
  F3 --> R3
  F4 --> R4
  F5 --> R5`;

export const toc: TocItem[] = [
  { id: "the-mental-model", title: "The Mental Model", level: 2 },
  { id: "five-levels", title: "The Five Levels", level: 2 },
  { id: "atoms", title: "Atoms", level: 3 },
  { id: "molecules", title: "Molecules", level: 3 },
  { id: "organisms", title: "Organisms", level: 3 },
  { id: "templates-pages", title: "Templates & Pages", level: 3 },
  { id: "why-it-matters", title: "Why the Hierarchy Matters", level: 2 },
  { id: "where-it-lives", title: "Where Each Level Lives in Code", level: 2 },
  { id: "criticisms", title: "Criticisms & Pragmatic Adaptations", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function AtomicDesignMethodology() {
  return (
    <div className="article-content">
      <p>
        <strong>Atomic Design</strong>, introduced by Brad Frost in 2013, is the most influential
        mental model for <em>structuring</em> a design system&rsquo;s components. It borrows a
        chemistry metaphor — atoms combine into molecules, molecules into organisms — to answer the
        question that breaks most component libraries: <strong>at what level of granularity does a
        component belong, and how do components compose into bigger ones?</strong> Tokens (last
        module) give you values; Atomic Design gives you a vocabulary for the components those
        values flow into. Even teams that don&rsquo;t follow it literally absorb its vocabulary, so
        you must know it cold.
      </p>

      <h2 id="the-mental-model">The Mental Model</h2>
      <p>
        The core insight is <strong>composition over a granularity ladder</strong>: complex UI is
        built by assembling smaller, simpler, reusable pieces — not by writing one-off big
        components per screen. Each level is made <em>entirely</em> of the level(s) below it, which
        forces reuse and prevents the &ldquo;every page reinvents its own header&rdquo; sprawl. The
        metaphor is non-linear in practice (you design atoms and pages in parallel), but the
        <em>dependency</em> always flows upward from small to large.
      </p>

      <MermaidDiagram
        chart={hierarchyDiagram}
        title="The Atomic Design hierarchy"
        caption="Atoms compose into molecules, molecules into organisms, organisms into templates, and templates become pages once filled with real content."
        minHeight={300}
      />

      <h2 id="five-levels">The Five Levels</h2>

      <h3 id="atoms">Atoms</h3>
      <p>
        The smallest functional UI units that can&rsquo;t be broken down without losing meaning: a{" "}
        <code>Button</code>, <code>Input</code>, <code>Label</code>, <code>Icon</code>,{" "}
        <code>Badge</code>. Atoms are where your <em>tokens</em> are consumed directly — an atom is
        essentially &ldquo;tokens given a shape.&rdquo; They have no awareness of context or business
        logic; they just render and emit events.
      </p>

      <CodeBlock
        code={`// Atom — pure, token-driven, context-free
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ds-input" {...props} />;   // ds-input uses var(--color-*)/var(--space-*)
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label className="ds-label" htmlFor={htmlFor}>{children}</label>;
}`}
        lang="tsx"
        filename="atoms.tsx"
      />

      <h3 id="molecules">Molecules</h3>
      <p>
        A small group of atoms bonded together to do one thing — the simplest <em>useful</em> unit.
        A <code>SearchField</code> is a <code>Label</code> + <code>Input</code> + <code>Button</code>{" "}
        that together form a search. The molecule encapsulates the relationship between its atoms
        (the button submits the input) but still carries no page-specific logic.
      </p>

      <CodeBlock
        code={`// Molecule — composes atoms into one reusable unit of behavior
export function SearchField({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = React.useState("");
  return (
    <form className="ds-search" onSubmit={(e) => { e.preventDefault(); onSearch(q); }}>
      <Label htmlFor="q">Search</Label>
      <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
      <Button type="submit">Go</Button>
    </form>
  );
}`}
        lang="tsx"
        filename="molecule-search-field.tsx"
      />

      <h3 id="organisms">Organisms</h3>
      <p>
        Relatively complex sections built from molecules and/or atoms — a site <code>Header</code>{" "}
        (logo + nav + SearchField), a <code>ProductCard</code>, a <code>CommentList</code>. Organisms
        are recognizable, standalone chunks of an interface. This is usually the <strong>top of what
        belongs in the shared design-system package</strong>; anything more specific tends to live in
        product code.
      </p>

      <h3 id="templates-pages">Templates & Pages</h3>
      <p>
        A <strong>template</strong> arranges organisms into a page-level layout using{" "}
        <em>placeholder</em> content — it&rsquo;s the skeleton that defines structure without real
        data. A <strong>page</strong> is a template instance filled with <em>real</em> content. The
        distinction matters: templates let you validate layout and responsive behavior in the
        abstract, while pages are where you test with actual (and edge-case) data — long names, empty
        states, missing images.
      </p>

      <ArticleTable
        caption="The five levels at a glance."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Made of</th>
              <th>Example</th>
              <th>Has business logic?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Atom</strong></td>
              <td>Tokens + markup</td>
              <td><code>Button</code>, <code>Input</code>, <code>Icon</code></td>
              <td>No</td>
            </tr>
            <tr>
              <td><strong>Molecule</strong></td>
              <td>A few atoms</td>
              <td><code>SearchField</code>, <code>FormRow</code></td>
              <td>Minimal (local)</td>
            </tr>
            <tr>
              <td><strong>Organism</strong></td>
              <td>Molecules + atoms</td>
              <td><code>Header</code>, <code>ProductCard</code></td>
              <td>Some (section-level)</td>
            </tr>
            <tr>
              <td><strong>Template</strong></td>
              <td>Organisms + layout</td>
              <td>Dashboard skeleton</td>
              <td>No (placeholder data)</td>
            </tr>
            <tr>
              <td><strong>Page</strong></td>
              <td>Template + real data</td>
              <td>A user&rsquo;s dashboard</td>
              <td>Yes (real content)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="why-it-matters">Why the Hierarchy Matters</h2>
      <p>
        The methodology isn&rsquo;t about the chemistry words — it&rsquo;s about the discipline they
        enforce:
      </p>
      <ul>
        <li>
          <strong>Reuse by construction:</strong> if every header is the same organism, you fix it
          once. The hierarchy makes duplication structurally visible.
        </li>
        <li>
          <strong>A shared vocabulary</strong> for designers and engineers — &ldquo;is this an atom
          or a molecule?&rdquo; is a productive scoping conversation.
        </li>
        <li>
          <strong>Clear dependency direction</strong> (small → large) prevents cycles and keeps
          atoms dumb and reusable.
        </li>
        <li>
          <strong>A natural boundary</strong> for what belongs in the system (atoms→organisms) vs
          product code (most templates/pages).
        </li>
      </ul>

      <h2 id="where-it-lives">Where Each Level Lives in Code</h2>
      <p>
        A common mistake is treating the five levels as five folders in your component library. In
        reality the boundary is more useful: <strong>the design-system package ships atoms,
        molecules, and shared organisms</strong>; <strong>templates and pages live in the product
        app</strong>, because they&rsquo;re tied to specific data and routes. Atomic Design maps
        cleanly onto the layered package topology from the foundations module.
      </p>

      <MermaidDiagram
        chart={mappingDiagram}
        title="Atomic levels mapped to a real codebase"
        caption="Atoms/molecules/organisms live in the shared system package; templates and pages live in product apps tied to real data and routes."
        minHeight={420}
      />

      <h2 id="criticisms">Criticisms & Pragmatic Adaptations</h2>
      <p>
        Senior engineers know where the metaphor breaks — and saying so is a strong interview
        signal. The honest critiques:
      </p>
      <ul>
        <li>
          <strong>The atom/molecule boundary is fuzzy.</strong> Is a labeled input an atom or a
          molecule? People argue endlessly. Most teams stop literal classification at organisms and
          don&rsquo;t fight over the bottom two.
        </li>
        <li>
          <strong>Folder-by-level hurts discoverability.</strong> Organizing by{" "}
          <code>atoms/ molecules/ organisms/</code> means hunting across folders; many teams prefer
          one folder per component and use the levels only as a <em>conceptual</em> guide.
        </li>
        <li>
          <strong>It&rsquo;s about UI structure, not behavior or state.</strong> Atomic Design says
          nothing about data flow, accessibility, or API design — it&rsquo;s one lens, not a full
          methodology. Pair it with the architecture and a11y modules.
        </li>
        <li>
          <strong>Modern alternatives/refinements:</strong> some teams use a simpler
          primitives→components→patterns split, or layout primitives (Stack, Cluster, Grid) as a
          distinct tier. The vocabulary is what endured; rigid five-folder application largely
          didn&rsquo;t.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Explain Atomic Design and whether you'd use it.'"
        intro="Interviewers want the model AND your judgment about its limits. Reciting the five levels is table stakes; the senior signal is knowing where the metaphor breaks."
        steps={[
          "Define it: a composition hierarchy — atoms → molecules → organisms → templates → pages — where each level is built from the ones below.",
          "Give a concrete chain: Button/Input (atoms) → SearchField (molecule) → Header (organism) → page skeleton (template) → real dashboard (page).",
          "State the value: reuse by construction, shared designer/engineer vocabulary, clear small→large dependency direction.",
          "Map it to code: ship atoms/molecules/organisms in the system package; templates/pages live in product apps.",
          "Show judgment: the atom/molecule line is fuzzy, folder-by-level hurts discoverability, and it covers structure NOT behavior/a11y — use the vocabulary as a guide, not dogma.",
        ]}
      />

      <InterviewChallenge
        title="Classify and compose a checkout summary"
        scenario={
          <>
            You&rsquo;re building a checkout-summary section: it shows a list of line items (each
            with product image, name, quantity stepper, and price), a promo-code input with an
            apply button, and an order total. Designers ask you to model it with Atomic Design and
            decide what goes in the shared design system vs the product app.
          </>
        }
        tasks={[
          "Classify the pieces into atoms, molecules, and organisms.",
          "Decide which pieces belong in the shared system package and which stay in the product app, and why.",
          "Name one place the atom/molecule distinction is genuinely ambiguous and how you'd resolve it pragmatically.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Atoms:</strong> <code>Image</code>, <code>Text</code>, <code>Button</code>,{" "}
            <code>Input</code>, <code>IconButton</code> (the +/− in the stepper).{" "}
            <strong>Molecules:</strong> <code>QuantityStepper</code> (two IconButtons + a value),{" "}
            <code>PromoCodeField</code> (Input + Button), <code>LineItem</code> (Image + Text +
            QuantityStepper + price Text). <strong>Organism:</strong> <code>CheckoutSummary</code>{" "}
            (a list of LineItems + PromoCodeField + total).
          </p>
          <p>
            <strong>System vs product:</strong> the atoms and the generic molecules
            (QuantityStepper, PromoCodeField) belong in the shared system — they&rsquo;re reusable
            across features. <code>LineItem</code> and <code>CheckoutSummary</code> are{" "}
            <em>commerce-domain</em> organisms tied to the checkout&rsquo;s data shape, so they
            usually live in the product app (or a commerce feature package), composing system atoms.
            The rule: generic + reusable → system; domain-specific + data-bound → product.
          </p>
          <p>
            <strong>Ambiguity:</strong> is <code>LineItem</code> a molecule or an organism? It&rsquo;s
            built of molecules (QuantityStepper) which by the strict definition makes it an organism,
            yet it feels small. Resolve it pragmatically: don&rsquo;t litigate the label — what
            matters is the <em>composition</em> (it reuses lower-level pieces) and the{" "}
            <em>boundary</em> (it&rsquo;s domain-specific, so it lives in product code). The level
            name is a guide, not a gate.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Atomic Design</strong> (Brad Frost) structures components as a composition
          hierarchy: <strong>atoms → molecules → organisms → templates → pages</strong>.
        </li>
        <li>
          Each level is built <strong>entirely from the levels below</strong>; dependency flows
          small → large, forcing reuse and preventing per-page reinvention.
        </li>
        <li>
          <strong>Atoms consume tokens directly</strong> — an atom is &ldquo;tokens given a
          shape.&rdquo;
        </li>
        <li>
          Ship <strong>atoms/molecules/organisms in the system package</strong>; templates and pages
          live in product apps tied to real data.
        </li>
        <li>
          Know the limits: the <strong>atom/molecule line is fuzzy</strong>, folder-by-level hurts
          discoverability, and it covers <strong>structure, not behavior or accessibility</strong>.
        </li>
        <li>
          Use the <strong>vocabulary as a shared guide</strong>, not as rigid dogma — that judgment
          is the senior signal.
        </li>
      </ul>
    </div>
  );
}
