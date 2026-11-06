import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const lookupDiagram = String.raw`flowchart TD
  A["RenderElement({ element })"]
  A --> B{"ELEMENT_REGISTRY[element.type]"}
  B -->|"found: 'text' → TextElementView"| C["render the view"]
  B -->|"miss: 'sparkline' → undefined"| D["001b: drop it + log it"]
  D --> E["return null — render NOTHING"]
  E --> F["…and the REST of the screen<br/>still renders normally"]
  C --> F

  style D fill:#7f1d1d,color:#fff
  style F fill:#0f766e,color:#fff`;

const nestedDiagram = String.raw`flowchart TD
  A["list element<br/>{ type: 'list', rows: [...] }"]
  A --> B["registry lookup: 'list' → ListElementView"]
  B --> C["ListElementView maps each row…"]
  C --> D["…back through RenderElement"]
  D --> E{"registry lookup per row"}
  E -->|"'row' known"| F["RowElementView renders it"]
  E -->|"unknown nested type"| G["same 001b rule:<br/>that row vanishes,<br/>its siblings survive"]

  style G fill:#7f1d1d,color:#fff
  style F fill:#0f766e,color:#fff`;

const breakageDiagram = String.raw`sequenceDiagram
  participant S as Server (deploys in minutes)
  participant W as Web client (already shipped)

  Note over S: buildSlots adds a 'sparkline'<br/>element to credit-detail
  S->>W: content now includes { type: 'sparkline', … }
  W->>W: registry lookup: miss
  W->>W: console.warn('[sdui-web] unknown element type "sparkline"…')
  W->>W: renders the other seven slots normally
  Note over W: Screen stands. One element absent.<br/>Telemetry knows. No release. No crash.`;

const registryCode = `// packages/sdui-web/src/registry/elementRegistry.tsx
// The registry IS the client's vocabulary — the literal list of words it speaks.
export const ELEMENT_REGISTRY: Record<string, ComponentType<{ element: WireElement }>> = {
  text: TextElementView,
  row: RowElementView,
  list: ListElementView,
};

export function RenderElement({ element }: { element: WireElement }) {
  const View = ELEMENT_REGISTRY[element.type];

  if (View === undefined) {
    // Decision 001b: drop and log. No fallback UI, no crash — the rest of
    // the screen renders, and telemetry hears about the word we did not know.
    console.warn(\`[sdui-web] unknown element type "\${element.type}" (id "\${element.id}"), dropping\`);
    return null;
  }

  return <View element={element} />;
}`;

const nestedCode = `// packages/sdui-web/src/components/ListElementView.tsx
// Rows go BACK through the registry rather than straight to RowElementView:
// rows are elements, so a nested unknown type degrades by the same rule
// as a top-level one.
export function ListElementView({ element }: { element: WireElement }) {
  const list = element as WireListElement;

  return (
    <section className="card" data-element-id={list.id}>
      {list.rows.map((row) => (
        <RenderElement key={row.id} element={row} />
      ))}
    </section>
  );
}`;

const narrowingCode = `// packages/sdui-web/src/components/TextElementView.tsx
// The registry hands every view the same open shape; each view narrows
// internally to its own local belief about its type's fields (009).
export function TextElementView({ element }: { element: WireElement }) {
  const text = element as WireTextElement;

  return (
    <p className={styleClass(text.style)} data-element-id={text.id}>
      {renderCopy(text.copy)}
    </p>
  );
}`;

export const toc: TocItem[] = [
  { id: "why-this-file-matters", title: "Why Fifteen Lines Get a Module", level: 2 },
  { id: "the-vocabulary", title: "The Registry Is the Vocabulary", level: 2 },
  { id: "lookup-or-skip", title: "Lookup or Skip: 001b Becomes Code", level: 2 },
  { id: "nested-elements", title: "Nested Elements Go Back Through", level: 2 },
  { id: "degradation-in-layers", title: "Degradation as a System Philosophy", level: 2 },
  { id: "deliberate-breakage", title: "The Deliberate-Breakage Exercise", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheElementRegistry() {
  return (
    <div className="article-content">
      <p>
        The previous module traced JSON to pixels and skipped one hop on purpose: the lookup. This
        module is that hop. It is about fifteen lines of code, and it is the client&apos;s
        constitution — the place where the version-skew theory from the unknown-types module stops
        being an argument and becomes a running <code>if</code> statement.
      </p>

      <h2 id="why-this-file-matters">Why Fifteen Lines Get a Module</h2>
      <p>
        Back in the unknown-types module, the question was abstract: <em>what should a client do
        with an element type it has never seen?</em> The decision (001b) was drop-and-log —
        rejected inline fallbacks, rejected criticality flags, matched Flex. But a decision only
        exists where code enforces it, and on the client there is exactly one place every element
        must pass through on its way to the screen. That chokepoint is{" "}
        <code>registry/elementRegistry.tsx</code>. Whoever writes it decides what kind of citizen
        this client is: one that crashes on the future, or one that survives it politely.
      </p>

      <h2 id="the-vocabulary">The Registry Is the Vocabulary</h2>
      <p>
        Strip away the ceremony and the registry is a dictionary from wire <code>type</code>{" "}
        strings to React components:
      </p>
      <CodeBlock
        code={registryCode}
        lang="tsx"
        filename="packages/sdui-web/src/registry/elementRegistry.tsx"
      />
      <p>
        Three entries, because this client speaks three words. That object is not{" "}
        <em>a list of</em> the client&apos;s vocabulary — it <em>is</em> the vocabulary, in the
        same way a browser&apos;s supported-tags table is what HTML means to that browser.
        Teaching the client a new word is one entry plus one view component; no shell changes, no
        per-screen changes. And because <code>models/wire.ts</code> keeps <code>type</code> an
        open <code>string</code> (009), TypeScript never pretends this dictionary is complete —
        the miss branch stays reachable, typed, and honest.
      </p>
      <p>
        One more pattern worth noticing before the miss branch: the registry hands every view the
        same open <code>WireElement</code>, and each view narrows <em>internally</em> to its own
        type&apos;s fields:
      </p>
      <CodeBlock
        code={narrowingCode}
        lang="tsx"
        filename="packages/sdui-web/src/components/TextElementView.tsx"
      />
      <p>
        That keeps the registry&apos;s type simple and puts each type&apos;s &quot;local
        belief&quot; (the 009 phrase) in exactly one file — the view that owns it.
      </p>

      <h2 id="lookup-or-skip">Lookup or Skip: 001b Becomes Code</h2>
      <MermaidDiagram
        chart={lookupDiagram}
        title="RenderElement: the whole decision"
        caption="Two branches. The bottom one is decision 001b as running code: no fallback UI, no crash, one warning, and the rest of the screen is untouched."
        minHeight={420}
      />
      <p>
        Walk the miss branch slowly, because each clause was a decision. <strong>Return{" "}
        <code>null</code></strong>: React renders nothing for this element — no error boundary
        tripped, no placeholder box apologising for itself. <strong>Log first</strong>: the
        warning names the type and the element id, which is the difference between graceful
        degradation and silently losing content — the same tripwire logic as the server&apos;s
        unknown-status warning, because a fallback nobody can observe is indistinguishable from a
        bug. <strong>And nothing else</strong>: no throw means the <code>.map()</code> in the
        shell keeps going, so one unknown element costs exactly one element, never the screen.
      </p>
      <p>
        Compare the blast radius arithmetic with the server side: there, an unparseable backend
        row throws <code>LedgerConversionError</code> and takes the whole screen to a 502 — bad
        data is corrupt, and rendering half a lie is worse than failing. Here, an unknown type
        drops one element and keeps the screen — the data is fine, the client is merely old.
        Different failure meanings, deliberately different blast radii.
      </p>

      <h2 id="nested-elements">Nested Elements Go Back Through</h2>
      <p>
        Lists contain rows, and rows are elements. <code>ListElementView</code> could import{" "}
        <code>RowElementView</code> and call it directly — it would even be one line shorter.
        Instead, rows route back through <code>RenderElement</code>:
      </p>
      <CodeBlock
        code={nestedCode}
        lang="tsx"
        filename="packages/sdui-web/src/components/ListElementView.tsx"
      />
      <MermaidDiagram
        chart={nestedDiagram}
        title="Recursion through the registry"
        caption="Because rows re-enter through the front door, a nested element of an unknown type degrades by exactly the same rule as a top-level one — one policy, enforced at one chokepoint."
        minHeight={430}
      />
      <p>
        The payoff is uniformity: there is exactly one place in the client where &quot;do I know
        this word?&quot; is asked, so 001b cannot be accidentally bypassed at depth. (The module
        cycle this creates — list view imports registry imports list view — is safe because the
        reference is only used at render time, not at module-evaluation time. It is the standard
        shape for this pattern.)
      </p>

      <h2 id="degradation-in-layers">Degradation as a System Philosophy</h2>
      <p>
        Step back and the registry turns out to be one instance of a rule the whole system now
        applies four times, each layer owning the misses in <em>its own</em> vocabulary:
      </p>
      <ArticleTable caption="Every vocabulary in the system, and who owns its unknowns">
        <table>
          <thead>
            <tr>
              <th>Vocabulary</th>
              <th>Where the miss is handled</th>
              <th>Behaviour on unknown</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Element types</td>
              <td>
                client registry (<code>RenderElement</code>)
              </td>
              <td>Drop the element + warn (001b)</td>
            </tr>
            <tr>
              <td>Style tokens</td>
              <td>
                client <code>styleClass</code>
              </td>
              <td>Degrade to Body/Default + warn</td>
            </tr>
            <tr>
              <td>Copy variables</td>
              <td>
                client <code>renderCopy</code>
              </td>
              <td>
                Leave <code>{"{placeholder}"}</code> visible
              </td>
            </tr>
            <tr>
              <td>Backend status codes</td>
              <td>
                server converter (<code>toDomainCreditStatus</code>)
              </td>
              <td>
                Map to <code>&apos;unknown&apos;</code> + warn; UI shows nothing
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Same shape every time: <em>degrade the smallest possible unit, keep going, and log so the
        degradation is observable</em>. That consistency is not an accident of copy-paste — it is
        what a decision log produces. 001b was argued once, and every later vocabulary inherited
        the reasoning.
      </p>

      <h2 id="deliberate-breakage">The Deliberate-Breakage Exercise</h2>
      <p>
        The project plan schedules breakage on purpose, and the registry is where it pays off.
        The exercise: add an element type the web client has never heard of to a server screen —
        a <code>sparkline</code> in <code>buildSlots</code>, referenced by a template — deploy
        nothing, and watch:
      </p>
      <MermaidDiagram
        chart={breakageDiagram}
        title="Version skew, rehearsed on purpose"
        caption="The server evolves; the shipped client survives, minus one element, with telemetry as the witness. This is the module most SDUI projects skip — and the exact scenario 001b was decided for."
        minHeight={400}
      />
      <p>
        This is the client-side rehearsal of the situation the unknown-types module called the
        steady state: server deploys in minutes, clients update whenever they update. When the
        exercise runs and the screen stands, 001b stops being a belief and becomes something you
        have watched work. The follow-up questions it opens — should the server ever be told which
        elements were dropped? does a critical element change the answer? — are the versioning
        milestone&apos;s territory (003), and they are much better questions once you have seen
        the polite failure with your own eyes.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The registry <em>is</em> the client&apos;s vocabulary: a dictionary from wire{" "}
          <code>type</code> strings to views. Teaching the client a word is one entry plus one
          component.
        </li>
        <li>
          <code>RenderElement</code> is 001b as running code: unknown type → log with type and id,
          render <code>null</code>, never throw — one unknown element costs one element, not the
          screen.
        </li>
        <li>
          Blast radii differ by meaning: corrupt backend data kills the whole screen server-side
          (502); an old client dropping a new element keeps the screen. Both are deliberate.
        </li>
        <li>
          Nested elements re-enter through the registry, so the &quot;do I know this word?&quot;
          question has exactly one home and cannot be bypassed at depth.
        </li>
        <li>
          Element types, style tokens, copy variables, and status codes all degrade the same way:
          smallest unit, keep going, log it. One decision, four vocabularies.
        </li>
        <li>
          The deliberate-breakage exercise — new server element, untouched client — is the whole
          architecture&apos;s final exam, and the registry is what passes it.
        </li>
      </ul>
    </div>
  );
}
