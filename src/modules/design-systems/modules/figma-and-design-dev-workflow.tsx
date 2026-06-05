import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const syncDiagram = String.raw`flowchart LR
  FIG["Figma Variables<br/>(designers edit)"] --> EXPORT["Tokens Studio /<br/>Figma REST API export"]
  EXPORT --> JSON["tokens.json<br/>(DTCG, in git)"]
  JSON --> SD["Style Dictionary build"]
  SD --> CODE["CSS vars + TS tokens"]
  CODE --> COMP["Coded components"]
  JSON -.-> |"PR + review"| JSON`;

const parityDiagram = String.raw`flowchart TD
  subgraph Drift["Without parity"]
    DF["Figma Button"] -.-> |"differs"| DC["Coded Button"]
    DC --> BUG["Designers design things<br/>devs can't build"]
  end
  subgraph Parity["With parity"]
    PF["Figma component<br/>variants = props"] === PC["Coded component<br/>variants = props"]
    PC --> TRUST["Handoff is mechanical;<br/>design = implementation"]
  end`;

export const toc: TocItem[] = [
  { id: "the-two-sources", title: "The Two-Sources Problem", level: 2 },
  { id: "figma-variables", title: "Figma Variables = Tokens", level: 2 },
  { id: "token-sync", title: "Syncing Tokens Figma ↔ Code", level: 2 },
  { id: "tokens-studio", title: "Tokens Studio & the Figma API", level: 3 },
  { id: "component-parity", title: "Component Parity", level: 2 },
  { id: "figma-components", title: "Figma Components, Variants & Props", level: 3 },
  { id: "handoff", title: "Handoff & Dev Mode", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function FigmaAndDesignDevWorkflow() {
  return (
    <div className="article-content">
      <p>
        A design system has two halves that must stay in lockstep: the <strong>design source</strong>{" "}
        (usually Figma) and the <strong>code source</strong> (your packages). When they drift,
        designers design things engineers can&rsquo;t build and engineers build things designers
        didn&rsquo;t intend — the exact incoherence the system was meant to eliminate. This module
        is about the pipeline that keeps the two halves in sync: tokens flowing from Figma into
        code, and components having true design-code parity. Even as a frontend engineer, owning
        this workflow is what makes you a design-system <em>lead</em> rather than just an
        implementer.</p>

      <h2 id="the-two-sources">The Two-Sources Problem</h2>
      <p>
        The fundamental risk: two sources of truth that edit independently <em>will</em> diverge.
        The goal is not to merge them into one tool — designers need Figma, engineers need code —
        but to establish a <strong>directional flow</strong> so one generates the other and drift
        becomes detectable. For tokens, the flow is usually Figma → code (designers own the values,
        code consumes them). For components, the contract is parity: the same variants and states
        exist in both, by name.
      </p>

      <MermaidDiagram
        chart={parityDiagram}
        title="Drift vs parity"
        caption="Independent sources drift into incoherence; parity makes the Figma component and coded component the same contract under two representations."
        minHeight={360}
      />

      <h2 id="figma-variables">Figma Variables = Tokens</h2>
      <p>
        Figma <strong>Variables</strong> are the design-tool expression of design tokens: named,
        typed values (color, number, string, boolean) organized into <em>collections</em> with{" "}
        <em>modes</em> (e.g. light/dark, or per-brand). This is a direct, intentional mirror of the
        token architecture from earlier — modes in Figma map to themes in code, and variable
        aliasing in Figma maps to the semantic→primitive tiering. When designers build with
        Variables, the design file is already structured like your token system.
      </p>

      <ArticleTable
        caption="How Figma concepts map to the design-token model you already know."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Figma concept</th>
              <th>Token-system equivalent</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Variable</td>
              <td>Design token</td>
              <td>Named, typed value</td>
            </tr>
            <tr>
              <td>Variable collection</td>
              <td>Token group / tier</td>
              <td>e.g. primitives vs semantic</td>
            </tr>
            <tr>
              <td>Mode (within a collection)</td>
              <td>Theme (light/dark/brand)</td>
              <td>Maps to <code>data-theme</code> remap</td>
            </tr>
            <tr>
              <td>Variable alias</td>
              <td>Semantic → primitive reference</td>
              <td>The tiering link</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="token-sync">Syncing Tokens Figma ↔ Code</h2>
      <p>
        The pipeline turns Figma Variables into the <code>tokens.json</code> that Style Dictionary
        consumes (the build module). The critical design decision: <strong>which side is the source
        of truth?</strong> Most teams make <em>Figma</em> authoritative for token <em>values</em>{" "}
        (designers decide the blue), export to a git-tracked <code>tokens.json</code> via PR, and
        let code be authoritative for <em>how those tokens are consumed</em>. The PR step is
        essential — it makes every token change reviewable and version-controlled, not a silent
        edit.
      </p>

      <MermaidDiagram
        chart={syncDiagram}
        title="The token sync pipeline"
        caption="Designers edit Figma Variables; an export produces a git-tracked tokens.json reviewed via PR, which the build turns into CSS and TS tokens."
        minHeight={300}
      />

      <h3 id="tokens-studio">Tokens Studio & the Figma API</h3>
      <p>
        Two common mechanisms. <strong>Tokens Studio</strong> (a Figma plugin) manages tokens in
        DTCG format inside Figma and pushes/pulls them to a git repo — the most popular bridge.
        Alternatively, the <strong>Figma REST API</strong> (the Variables endpoints) lets you script
        an export in CI. Either way the output is the same DTCG <code>tokens.json</code>, keeping
        the entire downstream build identical regardless of how tokens left Figma.
      </p>

      <CodeBlock
        code={`// Scripted export via the Figma Variables REST API (runs in CI)
const res = await fetch(
  \`https://api.figma.com/v1/files/\${FILE_KEY}/variables/local\`,
  { headers: { "X-Figma-Token": process.env.FIGMA_TOKEN } },
);
const { meta } = await res.json();

// Transform Figma variables -> DTCG tokens.json, then commit via PR.
// The PR is the review gate: designers approve the values, engineers see the diff,
// nothing changes silently.  ->  Style Dictionary builds it from there.`}
        lang="typescript"
        filename="export-figma-tokens.ts"
      />

      <h2 id="component-parity">Component Parity</h2>
      <p>
        Tokens are the easy half. The harder discipline is <strong>component parity</strong>: every
        component in code has a Figma counterpart with the <em>same variants, sizes, and states</em>,
        named identically. When parity holds, handoff becomes mechanical — a designer picks{" "}
        <code>Button / primary / lg</code> in Figma and the engineer uses{" "}
        <code>&lt;Button variant=&quot;primary&quot; size=&quot;lg&quot; /&gt;</code> with no
        translation. When it breaks, you get designs that can&rsquo;t be built and the system loses
        credibility on both sides.
      </p>

      <h3 id="figma-components">Figma Components, Variants & Props</h3>
      <p>
        Modern Figma mirrors code concepts closely: <strong>Components</strong> (reusable instances),{" "}
        <strong>Variants</strong> (a property matrix — <code>variant</code> × <code>size</code> ×{" "}
        <code>state</code>, exactly like coded variants), <strong>Component Properties</strong>{" "}
        (boolean/text/instance props that map to React props), and <strong>Auto Layout</strong>{" "}
        (flexbox-like layout, so spacing uses your token scale). The closer the designer builds to
        these, the more 1:1 the parity. The shared vocabulary — variant, prop, state — is
        deliberate: it lets designers and engineers describe the same component the same way.
      </p>

      <h2 id="handoff">Handoff & Dev Mode</h2>
      <p>
        Figma <strong>Dev Mode</strong> closes the loop at handoff: engineers inspect a component
        and see token-referenced values (the spacing reads as <code>space-inset-md</code>, not{" "}
        &ldquo;16px&rdquo;), CSS hints, and — when configured — a <strong>code connect</strong> link
        mapping the Figma component to its actual coded component and import. The aspiration is that
        handoff stops being &ldquo;redlining&rdquo; (measuring pixels off a mockup) and becomes
        &ldquo;use this component with these props,&rdquo; because design and code already agree.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you keep design and code in sync in a design system?'"
        intro="This shows whether you think beyond code into the full system. Lead with the two-sources problem and directional flow."
        steps={[
          "Name the two-sources problem: independent design and code sources drift; the fix is a directional flow, not merging tools.",
          "Tokens: Figma Variables are tokens (collections=tiers, modes=themes, aliases=semantic refs); make Figma authoritative for values.",
          "Sync via Tokens Studio or the Figma API to a git-tracked DTCG tokens.json — through a PR so every token change is reviewable.",
          "Component parity: same variants/sizes/states named identically in Figma and code, so handoff is mechanical not translational.",
          "Mention Dev Mode + code connect: handoff becomes 'use this component with these props' instead of measuring pixels.",
        ]}
      />

      <InterviewChallenge
        title="Designers and engineers keep diverging"
        scenario={
          <>
            At your company, designers maintain a Figma library and engineers maintain a coded
            library, edited independently. Designers regularly ship mockups with a spacing value or
            a button style that doesn&rsquo;t exist in code; engineers add component props designers
            don&rsquo;t know about. Both sides blame each other. You&rsquo;re asked to fix the
            workflow.
          </>
        }
        tasks={[
          "Diagnose the structural cause and why blame is misplaced.",
          "Design the token and component sync pipeline you'd put in place.",
          "Explain how you'd make drift visible/detectable rather than relying on people being careful.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Structural cause:</strong> two independent sources of truth with no directional
            flow. It&rsquo;s not a people problem — divergence is the inevitable result of the setup,
            so &ldquo;be more careful&rdquo; can&rsquo;t fix it.
          </p>
          <p>
            <strong>Pipeline:</strong> Make Figma Variables authoritative for token values; export
            them to a git-tracked <code>tokens.json</code> (Tokens Studio or Figma API) via PR, and
            have the coded system consume <em>only</em> generated tokens — so designers literally
            cannot use a spacing value that doesn&rsquo;t become a token. For components, establish
            parity: each coded component&rsquo;s variants/props are the contract, mirrored in Figma
            with matching names, and changing either requires updating both in the same change.
          </p>
          <p>
            <strong>Make drift detectable:</strong> a CI check that fails if a design mockup uses a
            raw value with no matching token; a periodic diff of the Figma component property matrix
            against the coded component&rsquo;s props; and a single shared changelog so a new
            prop/variant is announced to both sides. The principle: don&rsquo;t rely on discipline —
            make the wrong thing impossible or loud.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The core risk is <strong>two independent sources of truth</strong> drifting; the fix is a
          directional flow (Figma → code for token values), not merging tools.
        </li>
        <li>
          <strong>Figma Variables are tokens</strong>: collections = tiers, modes = themes, aliases
          = semantic references.
        </li>
        <li>
          Sync tokens via <strong>Tokens Studio or the Figma API</strong> to a git-tracked DTCG{" "}
          <code>tokens.json</code> — through a <strong>PR</strong> so changes are reviewable.
        </li>
        <li>
          Maintain <strong>component parity</strong>: identical variants/sizes/states, named the
          same in Figma and code, so handoff is mechanical.
        </li>
        <li>
          <strong>Dev Mode + code connect</strong> turns handoff into &ldquo;use this component with
          these props&rdquo; instead of measuring pixels.
        </li>
        <li>
          Make drift <strong>detectable by tooling</strong>, not dependent on people being careful.
        </li>
      </ul>
    </div>
  );
}
