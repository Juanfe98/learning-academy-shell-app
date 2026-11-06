import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const systemDiagram = String.raw`flowchart LR
  subgraph data["Data (owned outside the app)"]
    LEDGER["Ledger store<br/>SQLite / append-only JSON<br/>stable schema"]
  end

  subgraph server["sdui-server — Koa BFF"]
    SVC["Decides layout, copy, actions<br/>Raw → Domain → elements<br/>fills a template"]
  end

  subgraph tmpl["sdui-templates"]
    T["Plain JSON layouts<br/>deployed independently<br/>not importable by server code"]
  end

  subgraph clients["Two real renderers"]
    WEB["sdui-web<br/>full capability"]
    TUI["sdui-tui<br/>~80 columns, no fonts"]
  end

  LEDGER --> SVC
  T --> SVC
  SVC -->|filled JSON| WEB
  SVC -->|filled JSON| TUI

  style SVC fill:#0f766e,color:#fff
  style T fill:#7c3aed,color:#fff`;

const skeletonDiagram = String.raw`flowchart TD
  A["Layer structure<br/>(deliberately copied from Flex)"] --> A1["middleware stack"]
  A --> A2["route with validation only"]
  A --> A3["context handler injecting<br/>a request-scoped object"]
  A --> A4["service doing parallel fetches"]
  A --> A5["Raw* → Domain* boundary"]
  A --> A6["element + analytics construction"]
  A --> A7["template resolution, then fill"]

  B["Decisions inside each layer<br/>(made from first principles, logged)"] --> B1["what an element carries"]
  B --> B2["how degradation works"]
  B --> B3["what a converter actually does"]
  B --> B4["how a template variant is chosen"]

  style A fill:#113ccf,color:#fff
  style B fill:#0f766e,color:#fff`;

const decisionLogExample = `Decision:        Unknown element types are dropped and logged.
Because:         <the constraint that forced it>
Rejected:        Inline fallbacks; a criticality flag. Both are permanently
                 unavailable after v1 ships.
Flex does:       default: return null, sometimes with a Datadog RUM error.
                 No fallbacks, no criticality flags anywhere in the payload.
Would change if: <what evidence would flip this>`;

const curlOutput = `$ curl -s -H 'x-client-surface: web' \\
    'http://localhost:3999/screens/v1/account/detail?accountId=acc-001' | jq -c '.content|keys'
["accountName","balance","balanceCaption","transactions","transactionsHeading"]

$ curl -s -H 'x-client-surface: tui' \\
    'http://localhost:3999/screens/v1/account/detail?accountId=acc-001' | jq -c '.content|keys'
["accountName","balance","compactSummary","transactions"]`;

export const toc: TocItem[] = [
  { id: "premise", title: "The Premise", level: 2 },
  { id: "why-sdui", title: "When Server-Driven UI Actually Earns Its Cost", level: 2 },
  { id: "two-clients", title: "The Two-Client Constraint", level: 3 },
  { id: "shape", title: "The Shape of the System", level: 2 },
  { id: "skeleton", title: "Mirror the Skeleton, Own the Muscles", level: 2 },
  { id: "decisions", title: "The Decision Log", level: 2 },
  { id: "decided", title: "What Has Been Decided So Far", level: 3 },
  { id: "proof", title: "The Payoff, In One Command", level: 2 },
  { id: "constraints", title: "Deliberate Constraints", level: 2 },
  { id: "challenge", title: "Challenge: Justify the Architecture", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatWeAreBuilding() {
  return (
    <div className="article-content">
      <p>
        This academy studies a working server-driven UI backend built from nothing, in a repo called{" "}
        <code>server-driven-ui</code>. It is a personal-finance app — expenses, investments, savings,
        credits — and it is deliberately architected to mirror Disney&rsquo;s Flex
        (<code>growth-life-client-api</code>) and <code>cgi-web</code> pair.
      </p>
      <p>
        The reason to study it alongside the real thing is scale. Flex has hundreds of screens, five
        client platforms, two experimentation systems and a decade of accumulated context. This
        system has <strong>one screen and one service</strong>. Every file is short enough to read in
        full. Every architectural decision was made explicitly and written down. Nothing is
        inherited, so nothing is unexplained.
      </p>

      <h2 id="premise">The Premise</h2>
      <p>
        Server-driven UI means the server decides what a screen contains — its layout, its copy, the
        actions available on it — and ships that as data. The client receives a description and
        renders it. It owns pixels and nothing else.
      </p>
      <p>
        The promise is that you can change a screen without shipping a client. The cost is a contract
        between the two sides that has to survive independent deployment, capability differences, and
        clients older than the server. Most of this academy is about that cost, because that is where
        the engineering actually lives.
      </p>

      <h2 id="why-sdui">When Server-Driven UI Actually Earns Its Cost</h2>
      <p>
        SDUI only pays for itself when two things are true at once: <strong>the server has something
        real to decide</strong>, and <strong>more than one client has to obey</strong>. Both are
        deliberately true here.
      </p>
      <p>
        The server has genuine decisions to make — budgets, credit limits, affordability, amortization,
        net-worth rollups. It is not a data pipe with JSON on top. And the app is built with two real
        renderers rather than one.
      </p>

      <h3 id="two-clients">The Two-Client Constraint</h3>
      <p>
        A web renderer and a terminal renderer consume the same JSON. This is not decoration. With a
        single client you can cheat indefinitely and never notice: the server emits a visual
        instruction, the one client honours it, and the contract&rsquo;s flaws stay invisible because
        nothing ever contradicts them.
      </p>
      <p>
        A second renderer that is <em>genuinely less capable</em> — no fonts, no font sizes, no
        images, roughly eighty columns — contradicts you constantly and early. Every assumption the
        contract makes about presentation fails loudly the first time the terminal cannot comply.
      </p>
      <p>
        There is a second, separate pressure that a terminal does <em>not</em> simulate, and the
        distinction matters throughout this academy:
      </p>
      <ArticleTable caption="Two independent pressures a second client applies">
        <table>
          <thead>
            <tr>
              <th>Pressure</th>
              <th>What it means</th>
              <th>Who has it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Capability divergence</strong>
              </td>
              <td>Client B genuinely cannot render something client A can</td>
              <td>A terminal, exaggerated on purpose</td>
            </tr>
            <tr>
              <td>
                <strong>Version skew</strong>
              </td>
              <td>
                Client B is running an older build than the server assumes — nothing to do with
                capability
              </td>
              <td>
                Any client you cannot force-update: mobile, Roku, tvOS. <em>Not</em> web, where a
                deploy reaches everyone on next load
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Flex lives with the second one at scale. Its brand-named routes —{" "}
        <code>src/routes/screens/v1/espn/*</code> serving <code>/paywall</code> and{" "}
        <code>/device-ledger</code> — exist because Roku and tvOS builds from years ago are still in
        the field making requests today.
      </p>

      <h2 id="shape">The Shape of the System</h2>
      <MermaidDiagram
        chart={systemDiagram}
        title="System overview"
        caption="The server is the only place that knows what a screen contains. Clients map element types to components and nothing more."
      />
      <p>
        Four packages, each with one job:
      </p>
      <ArticleTable caption="Package responsibilities">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Owns</th>
              <th>Must never</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>sdui-server</code>
              </td>
              <td>Business rules, element construction, template resolution and fill</td>
              <td>Import a template as a module</td>
            </tr>
            <tr>
              <td>
                <code>sdui-templates</code>
              </td>
              <td>Layout: which slots exist per screen, per surface</td>
              <td>Contain business rules or expressions</td>
            </tr>
            <tr>
              <td>
                <code>sdui-web</code>
              </td>
              <td>Mapping element type → React component</td>
              <td>Decide copy, ordering, or which actions exist</td>
            </tr>
            <tr>
              <td>
                <code>sdui-tui</code>
              </td>
              <td>The same mapping, for a terminal</td>
              <td>Share types with the server (see the versioning module)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="skeleton">Mirror the Skeleton, Own the Muscles</h2>
      <p>
        The governing rule of the project, and the reason it is worth studying next to Flex:
      </p>
      <p>
        <strong>The layer structure is copied on purpose.</strong> Middleware stack, route with
        validation only, a context handler injecting a request-scoped object, a service doing parallel
        fetches, a <code>Raw*</code>→<code>Domain*</code> conversion boundary, element and analytics
        construction, template resolution, then fill. Those layers and their names are mirrored even
        where something simpler would do for a personal app, so that every box built here is
        recognisable on sight in <code>growth-life-client-api</code>.
      </p>
      <p>
        <strong>The decisions inside each layer are not copied.</strong> What an element carries on
        the wire, how versioning and degradation work, what a conversion function actually does, how
        a template variant is chosen — each of those was decided from first principles, then compared
        against Flex afterwards.
      </p>
      <MermaidDiagram
        chart={skeletonDiagram}
        title="What is copied and what is decided"
        caption="Copying the shape makes Flex readable. Deciding the contents makes it understood."
      />
      <p>
        That ordering matters more than it looks. Seeing Disney&rsquo;s answer first produces copying,
        and copying produces a system you can operate but not defend. Deciding first and comparing
        afterwards teaches twice — once from the decision, once from the delta.
      </p>

      <h2 id="decisions">The Decision Log</h2>
      <p>
        Every load-bearing decision lives in <code>decisions/NNN-short-name.md</code> in a fixed
        five-line shape:
      </p>
      <CodeBlock code={decisionLogExample} lang="text" filename="decisions/001b-unknown-element-types.md" />
      <p>
        The last line is the one that earns its keep. &ldquo;Would change if&rdquo; converts an
        opinion into a falsifiable position, and it is what you reach for when someone asks why the
        system is built this way six months later.
      </p>

      <h3 id="decided">What Has Been Decided So Far</h3>
      <ArticleTable caption="Logged decisions, each covered in a later module">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Decision</th>
              <th>Module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>001a</td>
              <td>Elements carry presentational design tokens, not semantic roles</td>
              <td>The Wire Contract</td>
            </tr>
            <tr>
              <td>001b</td>
              <td>Unknown element types are dropped and logged; no fallbacks, no criticality flag</td>
              <td>Unknown Element Types</td>
            </tr>
            <tr>
              <td>002</td>
              <td>Per-surface templates; the branching lives in template resolution</td>
              <td>Templates &amp; Fill</td>
            </tr>
            <tr>
              <td>005</td>
              <td>Plain-JSON templates with slot markers; no template engine</td>
              <td>Templates &amp; Fill</td>
            </tr>
            <tr>
              <td>009</td>
              <td>Types duplicated per side; no shared package</td>
              <td>Unknown Element Types</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Still open at the time of writing: versioning (003), actions (004), charts and rich elements
        (006), what the second renderer really is (007), and the telemetry sink (008).
      </p>

      <h2 id="proof">The Payoff, In One Command</h2>
      <p>
        The whole architecture reduces to this observation. Two requests, same endpoint, same account,
        same service code, different <code>x-client-surface</code> header:
      </p>
      <CodeBlock code={curlOutput} lang="bash" filename="terminal" />
      <p>
        Different screens came out. The service built the same six slots both times and branched
        nowhere — the only thing that differed was which template file loaded. That is the entire
        thesis of the architecture in two commands, and everything else in this academy is the
        machinery that makes it true.
      </p>

      <h2 id="constraints">Deliberate Constraints</h2>
      <p>
        Four rules exist to keep the architecture honest rather than decorative:
      </p>
      <ul>
        <li>
          <strong>Two real clients.</strong> The actual justification for SDUI, and the only way to
          feel the contract&rsquo;s cost.
        </li>
        <li>
          <strong>Tenant resolved from a header</strong> — <code>personal</code> /{" "}
          <code>household</code> / <code>business</code>, mirroring Flex&rsquo;s{" "}
          <code>x-bamtech-partner</code>. Same screens, different rules, no forked code.
        </li>
        <li>
          <strong>Templates are a separate package</strong>, not importable by server code, so the
          &ldquo;who owns layout&rdquo; boundary is enforced rather than assumed.
        </li>
        <li>
          <strong>Ledger data lives outside the app</strong> — stable schema, plain SQLite or
          append-only JSON. The app stays disposable so the architecture can be rewritten without
          risking real financial history.
        </li>
      </ul>
      <p>
        That last one resolves a genuine tension: a project that is both a learning exercise and a
        tool you depend on will push you to cut architectural corners when you need it working, and
        to risk your data when you want to experiment. Keeping the ledger outside the app removes the
        conflict.
      </p>

      <InterviewChallenge
        title="Justify the architecture to a skeptical reviewer"
        scenario={
          <>
            A colleague reviews the repo and says: &ldquo;This is a personal finance app with one
            user. You have built a BFF, a template package, a conversion boundary and two renderers
            to display a bank balance. This is over-engineering.&rdquo; They are not being unfair —
            for a normal one-client app they would be right.
          </>
        }
        tasks={[
          "Name the two conditions under which server-driven UI pays for itself, and show that both hold here.",
          "Explain why one renderer would make the contract's flaws invisible rather than absent.",
          "Distinguish capability divergence from version skew, and say which one a terminal renderer does NOT reproduce.",
          "Identify which parts of this architecture you would drop if the app truly had one web client forever.",
        ]}
        pitfalls={[
          "Arguing from 'flexibility' or 'future-proofing' in the abstract — name the concrete change SDUI makes cheap.",
          "Claiming a second client is only about theming; the real pressure is that it cannot comply with instructions it does not understand.",
          "Forgetting that web has almost no version skew, which is exactly why building only for web hides the hardest problem.",
        ]}
        signal="A strong answer concedes the reviewer is right for the general case, then names the specific constraint that changes the calculus — and can say which pieces are genuinely unnecessary without that constraint."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>The two conditions:</strong> the server must have real decisions to make, and more
          than one client must have to obey. Here the server computes affordability, budgets and
          rollups — real decisions — and a web and terminal renderer consume identical JSON.
        </p>
        <p>
          <strong>Why one client hides the flaws:</strong> with a single renderer, the server can emit{" "}
          <code>Headline/H1</code> and the client honours it. The contract is making a presentation
          assumption, but nothing ever contradicts it, so the assumption looks like a design. Add a
          renderer with no font sizes and the assumption fails immediately and visibly.
        </p>
        <p>
          <strong>Capability vs skew:</strong> capability divergence is &ldquo;this client cannot
          render that.&rdquo; Version skew is &ldquo;this client is running last quarter&rsquo;s
          build.&rdquo; A terminal exaggerates the first and does nothing for the second — two
          identical clients have skew if one is out of date. It must be manufactured deliberately,
          which is what the deliberate-breakage milestone exists for.
        </p>
        <p>
          <strong>What you would drop:</strong> per-surface templates and most of the degradation
          machinery. You would keep the conversion boundary — that one is justified by having a
          backend you do not control, not by having multiple clients.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          SDUI earns its cost only when the server has real decisions <em>and</em> more than one
          client must obey. Both are deliberately true here.
        </li>
        <li>
          A second renderer that is genuinely less capable is what makes the contract&rsquo;s flaws
          visible. One client lets you cheat forever.
        </li>
        <li>
          Capability divergence and version skew are different problems. A terminal reproduces the
          first, not the second.
        </li>
        <li>
          The layer structure is copied from Flex on purpose; the decisions inside each layer are
          made independently and logged, then compared afterwards.
        </li>
        <li>
          The whole thesis is observable in two curl commands: same service, same slots built,
          different templates, different screens.
        </li>
      </ul>
    </div>
  );
}
