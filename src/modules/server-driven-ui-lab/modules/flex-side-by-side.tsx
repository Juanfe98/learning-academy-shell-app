import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const parallelDiagram = String.raw`flowchart TB
  subgraph flex["growth-life-client-api (Flex)"]
    F1["middlewares/models/StandardHeaders.ts<br/>x-bamtech-partner"]
    F2["routes/screens/v1/&lt;domain&gt;/&lt;screen&gt;.ts<br/>Joi + .unknown()"]
    F3["flexContextRouteHandler<br/>→ FlexContext"]
    F4["screen service<br/>Promise.all fan-out"]
    F5["backends/growthLifeOrchestrator<br/>GLO* types"]
    F6["domain/common/offers<br/>GLO* → Flex*"]
    F7["elements/v1/types + typeGuards"]
    F8["templateService + fillEjsData<br/>EJS over JSON from S3"]
    F1 --> F2 --> F3 --> F4 --> F5 --> F6 --> F7 --> F8
  end

  subgraph mine["server-driven-ui"]
    M1["middlewares/models/StandardHeaders.ts<br/>x-client-surface"]
    M2["routes/screens/v1/account/detail.ts<br/>Joi + .unknown(true)"]
    M3["ledgerContextRouteHandler<br/>→ LedgerContext"]
    M4["accountDetailsService<br/>Promise.all fan-out"]
    M5["backends/ledger<br/>Raw* types"]
    M6["domain/common/ledger<br/>Raw* → Domain*"]
    M7["elements/v1/types + builders"]
    M8["templateService + fillTemplate<br/>plain JSON slot markers"]
    M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7 --> M8
  end

  style F8 fill:#7c2d12,color:#fff
  style M8 fill:#0f766e,color:#fff`;

const divergenceDiagram = String.raw`flowchart TD
  Q["A difference from Flex"]
  Q --> A{"Does Flex's constraint apply here?"}
  A -->|"yes"| B["Copying is correct.<br/>Mirror it."]
  A -->|"no"| C{"Is the difference logged<br/>as a decision?"}
  C -->|"yes"| D["Deliberate divergence.<br/>Defensible."]
  C -->|"no"| E["Accidental divergence.<br/>This is the dangerous case."]

  style B fill:#0f766e,color:#fff
  style D fill:#0f766e,color:#fff
  style E fill:#7f1d1d,color:#fff`;

const espnTrapCode = `# The instinct — and it finds the WRONG files
$ grep -r "espn" growth-life-client-api/src/routes/
src/routes/screens/v1/espn/paywall.ts
src/routes/screens/v1/espn/deviceAccountManagement.ts
src/routes/screens/v1/espn/deviceLedger.ts

# Those are the ROKU / tvOS screens. cgi-web's ESPN commerce app
# consumes the SHARED, partner-agnostic screens:
#   /screens/v*/subscription/preview
#   /screens/v*/account/account-details
#   /screens/v1/landing/plans
#
# ESPN-specific behaviour there comes only from the request carrying
# x-bamtech-partner: espn — expressed as ~70 isPartnerESPN comparisons
# inside those shared services.`;

export const toc: TocItem[] = [
  { id: "layers", title: "Layer for Layer", level: 2 },
  { id: "names", title: "The Names, Side by Side", level: 2 },
  { id: "divergences", title: "Every Deliberate Divergence", level: 2 },
  { id: "test", title: "The Test for a Legitimate Divergence", level: 3 },
  { id: "not-copied", title: "Three Things Deliberately Not Copied", level: 2 },
  { id: "trap", title: "The Debugging Trap This Explains", level: 2 },
  { id: "gaps", title: "What Flex Has That This Does Not", level: 2 },
  { id: "reading", title: "How to Read Flex Now", level: 2 },
  { id: "challenge", title: "Challenge: Port a Flex Pattern", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function FlexSideBySide() {
  return (
    <div className="article-content">
      <p>
        Everything so far has been building. This module is the payoff: every box placed next to its
        counterpart in <code>growth-life-client-api</code>, every divergence named, and the constraint
        that justified each one.
      </p>
      <p>
        The goal is not that the two systems are the same. It is that after building the small one,
        the large one reads as a variant of something you already understand rather than as something
        foreign.
      </p>

      <h2 id="layers">Layer for Layer</h2>
      <MermaidDiagram
        chart={parallelDiagram}
        title="The two pipelines"
        caption="The shape is identical by design. Only the final stage differs materially — and that difference is logged."
      />

      <h2 id="names">The Names, Side by Side</h2>
      <ArticleTable caption="Concept correspondence, and what each teaches" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Flex / cgi-web</th>
              <th>server-driven-ui</th>
              <th>What building it teaches</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>x-bamtech-partner</code>
              </td>
              <td>
                <code>x-client-surface</code>
              </td>
              <td>Identity resolved from a trusted upstream header; no host mapping, no detection</td>
            </tr>
            <tr>
              <td>
                <code>FlexContext</code>
              </td>
              <td>
                <code>LedgerContext</code>
              </td>
              <td>Request-scoped state assembled once, read everywhere</td>
            </tr>
            <tr>
              <td>
                <code>flexContextRouteHandler</code>
              </td>
              <td>
                <code>ledgerContextRouteHandler</code>
              </td>
              <td>Where cross-cutting state gets built, and why services never see HTTP</td>
            </tr>
            <tr>
              <td>GLO, Offers, IPSE, Cypher</td>
              <td>
                <code>ledgerClient</code>
              </td>
              <td>A backend you do not control and cannot reshape</td>
            </tr>
            <tr>
              <td>
                <code>GLO*</code> → <code>Flex*</code>
              </td>
              <td>
                <code>Raw*</code> → <code>Domain*</code>
              </td>
              <td>Why two type systems exist and what a leak costs</td>
            </tr>
            <tr>
              <td>
                <code>domain/common/offers/</code>
              </td>
              <td>
                <code>domain/common/ledger/</code>
              </td>
              <td>Conversion grouped by data source, not by concept</td>
            </tr>
            <tr>
              <td>
                <code>elements/v1/types</code> + <code>typeGuards</code>
              </td>
              <td>
                <code>elements/v1/types</code> + <code>builders</code>
              </td>
              <td>A wire vocabulary versioned separately from the app</td>
            </tr>
            <tr>
              <td>
                <code>toLocalizedTextElement</code>, <code>toCopy</code>
              </td>
              <td>
                <code>toTextElement</code>, <code>toCopy</code>
              </td>
              <td>Factories beside the types they build</td>
            </tr>
            <tr>
              <td>
                <code>metricsData</code> / <code>adobeData</code>
              </td>
              <td>
                <code>analytics</code>
              </td>
              <td>Analytics as server-owned data, not client instrumentation</td>
            </tr>
            <tr>
              <td>Cypher dictionary</td>
              <td>
                <code>copy.variables</code>
              </td>
              <td>Copy as data, keyed and interpolated rather than concatenated</td>
            </tr>
            <tr>
              <td>
                <code>regionConfig</code>
              </td>
              <td>
                <code>regionConfig</code>
              </td>
              <td>Formatting decided server-side so clients cannot disagree</td>
            </tr>
            <tr>
              <td>
                <code>fillEjsData</code> (EJS over JSON)
              </td>
              <td>
                <code>fillTemplate</code> (slot markers)
              </td>
              <td>Layout as a deployable artifact, separate from code</td>
            </tr>
            <tr>
              <td>
                <code>templatesV2[variant][version]</code>
              </td>
              <td>
                <code>templateId</code> = <code>{"{screen}:{surface}:{variant}"}</code>
              </td>
              <td>Template identity, and where experiments plug in</td>
            </tr>
            <tr>
              <td>WeaponX / Spearmint latch</td>
              <td>not yet built</td>
              <td>Why &ldquo;the user saw the wrong screen&rdquo; is hard to debug</td>
            </tr>
            <tr>
              <td>cgi-web element rendering</td>
              <td>web + tui registries</td>
              <td>The real cost and payoff of server-driven UI</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="divergences">Every Deliberate Divergence</h2>
      <ArticleTable caption="Where the two differ, and why" minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Flex</th>
              <th>Here</th>
              <th>The constraint that differs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Template format</td>
              <td>EJS rendered over JSON, with a regex stripping quotes off <code>&quot;&lt;%- … %&gt;&quot;</code></td>
              <td>Plain JSON with <code>{`{ "$slot": "x" }`}</code> markers</td>
              <td>
                <strong>SiteConfig validates stored templates as proper JSON</strong>, forcing objects
                to be saved as strings. No SiteConfig here
              </td>
            </tr>
            <tr>
              <td>Surface branching</td>
              <td>Partner branching inside shared services; separate routes for OTT</td>
              <td>Template resolution only</td>
              <td>
                Two surfaces, not five brands × many devices. Route-level split would let screens drift
              </td>
            </tr>
            <tr>
              <td>Unknown-type telemetry</td>
              <td>
                Inconsistent — <code>billing-description</code> reports to RUM; the generic{" "}
                <code>flex-content-renderer</code> does not
              </td>
              <td>One shared helper every registry calls</td>
              <td>
                None — this is drift in cgi-web rather than design. An improvement, not a divergence
              </td>
            </tr>
            <tr>
              <td>Analytics authoring</td>
              <td>
                <code>pageId</code> / <code>pageKey</code> hardcoded in the template
              </td>
              <td>Supplied by the service</td>
              <td>
                No non-engineering template authors here, so keeping analytics with the code is cheaper
              </td>
            </tr>
            <tr>
              <td>Missing template</td>
              <td>
                Experiment latch falls through to control silently
              </td>
              <td>
                <code>TemplateNotFoundError</code>, hard failure
              </td>
              <td>
                None — this is learning from a defect the research register documents as correction #10
              </td>
            </tr>
            <tr>
              <td>Style token count</td>
              <td>~33 web, ~35 living room, per-surface type ramps in the type system</td>
              <td>6, shared</td>
              <td>One screen versus hundreds. A starting point, not a disagreement</td>
            </tr>
            <tr>
              <td>Copy modes</td>
              <td>
                <code>copyText</code> and <code>cypher</code>, plus <code>describedBy</code> for a11y
                and two interpolation passes
              </td>
              <td>
                <code>copyText</code> only
              </td>
              <td>
                No dictionary service yet. The <code>describedBy</code> omission is a genuine gap, not
                a decision
              </td>
            </tr>
            <tr>
              <td>Type ownership</td>
              <td>
                Duplicated — <code>elements/v1</code> inside the server, cgi-web hand-maintains its own
              </td>
              <td>Same, deliberately</td>
              <td>
                None — but here the temptation is stronger because it is one monorepo
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="test">The Test for a Legitimate Divergence</h3>
      <MermaidDiagram
        chart={divergenceDiagram}
        title="Deliberate versus accidental"
        caption="The dangerous category is not 'different from Flex' — it is 'different from Flex and nobody noticed'."
      />
      <p>
        Every row in the table above passes that test. The value of the decision log is that it makes
        the bottom-right box impossible to reach quietly.
      </p>

      <h2 id="not-copied">Three Things Deliberately Not Copied</h2>
      <p>
        <strong>1. The EJS quote-stripping.</strong> The clearest example in the project of
        reproducing a <em>constraint</em> rather than a <em>mechanism</em>. Flex&rsquo;s{" "}
        <code>stripQuotesFromObjects</code> exists because SiteConfig demands valid JSON; the
        machinery is a workaround, not a design. Reading it delivered the understanding that building
        it would have.
      </p>
      <p>
        <strong>2. Inconsistent unknown-type handling.</strong> Copying the design without copying the
        drift. All <code>default:</code> branches route through one helper.
      </p>
      <p>
        <strong>3. Silent fallthrough on a missing template.</strong> Documented in the research
        register as a suspected defect, so it was designed out rather than in.
      </p>
      <p>
        And one thing copied <em>despite</em> being uncomfortable: coercing an unrecognised surface to
        a default. Flex does the equivalent with <code>displayMode</code> → <code>&apos;dark&apos;</code>,
        which the register also flags as suspect. It was kept, with a warning log, and recorded as an
        open question — which is the honest way to carry over something you are not sure about.
      </p>

      <h2 id="trap">The Debugging Trap This Explains</h2>
      <p>
        Here is the single most practically valuable thing this comparison unlocks. An ESPN bug lands
        in cgi-web. The instinct is to grep the brand name in Flex:
      </p>
      <CodeBlock code={espnTrapCode} lang="bash" filename="the wrong first move" />
      <p>
        The brand-named route folders are the <strong>device/OTT screens</strong> — consumed by Roku,
        tvOS and mobile apps. The web commerce app calls the shared, partner-agnostic screens and gets
        ESPN-specific output purely because the request carries{" "}
        <code>x-bamtech-partner: espn</code>.
      </p>
      <p>
        Having built the small version, the reason is obvious rather than surprising: this project put
        surface branching in template resolution precisely so that this smearing could not happen.
        Flex put brand branching inside shared services, and ~70 comparisons is the result.
      </p>
      <p>
        The right first move there is: <em>find the shared screen service and grep{" "}
        <code>isPartnerESPN</code> inside it.</em>
      </p>

      <h2 id="gaps">What Flex Has That This Does Not</h2>
      <p>Honest accounting of the gap, so the small system is not mistaken for a complete one:</p>
      <ArticleTable caption="Not yet built">
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Flex</th>
              <th>Status here</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Action executions</td>
              <td>A whole parallel pipeline beside screens</td>
              <td>Open decision 004 — not built</td>
            </tr>
            <tr>
              <td>Experimentation</td>
              <td>WeaponX + Spearmint, with the template-variant latch</td>
              <td>Milestone 5</td>
            </tr>
            <tr>
              <td>Feature flags</td>
              <td>
                <code>getFeatureFlagValue()</code> off <code>FlexContext</code>
              </td>
              <td>
                <code>featureSet</code> exists but is empty
              </td>
            </tr>
            <tr>
              <td>Element versioning</td>
              <td>
                <code>elements/v1</code>, route <code>v1</code>/<code>v2</code>,{" "}
                <code>templatesV2[variant][version]</code>
              </td>
              <td>Open decision 003</td>
            </tr>
            <tr>
              <td>Accessibility in copy</td>
              <td>
                <code>describedBy</code>
              </td>
              <td>Missing — a genuine gap</td>
            </tr>
            <tr>
              <td>Per-element analytics</td>
              <td>
                <code>metricsData</code> on individual elements
              </td>
              <td>Screen-level only</td>
            </tr>
            <tr>
              <td>Generated type guards</td>
              <td>
                <code>npm run build:typeguards</code>
              </td>
              <td>Hand-written guards</td>
            </tr>
            <tr>
              <td>Telemetry</td>
              <td>Datadog RUM, 73 error codes</td>
              <td>
                Open decision 008 — every <code>TODO(008)</code> is a <code>console.warn</code>
              </td>
            </tr>
            <tr>
              <td>Tests</td>
              <td>Unit + integration, factories, behavioural assertions</td>
              <td>
                <strong>None yet.</strong> The largest gap
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="reading">How to Read Flex Now</h2>
      <p>Concretely, what changes when you open the real repo:</p>
      <ol>
        <li>
          <strong>Start at the route, not the service.</strong> The route tells you the validation
          contract and nothing else — which is a feature, because it is one small file.
        </li>
        <li>
          <strong>
            Assume <code>FlexContext</code> is already assembled.
          </strong>{" "}
          You do not need to trace where <code>regionConfig</code> came from to understand a service.
        </li>
        <li>
          <strong>
            Treat <code>domain/common/</code> as the airlock.
          </strong>{" "}
          Anything above it thinks in <code>Flex*</code>. If you are debugging a wrong <em>value</em>,
          it is probably in there. If you are debugging a wrong <em>layout</em>, it is not.
        </li>
        <li>
          <strong>For a layout question, go to the templates repo first.</strong> Not the service. The
          service decides content; the template decides what is delivered.
        </li>
        <li>
          <strong>For &ldquo;why did this user see that?&rdquo;, go to the latch.</strong> Template
          configuration resolution, and remember that a variant only wins if it also maps to a real
          template entry.
        </li>
        <li>
          <strong>For a brand-specific bug, do not grep the brand.</strong> Find the shared service.
        </li>
      </ol>

      <InterviewChallenge
        title="Port a Flex pattern"
        scenario={
          <>
            You want to bring Flex&rsquo;s Cypher dictionary idea into this project — copy stored as
            keyed dictionary entries the client resolves, rather than literal text the server has
            already interpolated. Flex expresses this as a second copy mode:{" "}
            <code>type: &apos;cypher&apos;</code> with a <code>dictionary</code> field.
          </>
        }
        tasks={[
          "Decide whether this is additive to the existing contract or a breaking change, and prove it against decision 001b.",
          "Explain what the terminal renderer does with a cypher copy object it has never seen.",
          "Say which of Flex's constraints justify dictionary-resolved copy, and whether they apply here.",
          "Name what you would have to build besides the type change.",
        ]}
        pitfalls={[
          "Assuming a new copy `type` is safe because the element type is unchanged — clients switch on copy.type too.",
          "Forgetting that server-side interpolation is what currently guarantees both renderers agree.",
          "Porting the mechanism without asking whether the constraint (many locales, non-engineering copy owners) exists here.",
        ]}
        signal="The strong answer notices this is the same open-vs-closed union problem as element types, one level down — and that the decision log already contains the reasoning."
      />

      <SolutionReveal difficulty="hard">
        <p>
          <strong>Additive or breaking?</strong> Breaking for existing clients, and for exactly the
          reason 001b describes. <code>Copy.type</code> is a discriminated union, and a client that
          switches on it hits its <code>default:</code> branch for <code>&apos;cypher&apos;</code>.
          Under drop-and-log, the copy renders as nothing. This is the element-type problem one level
          down — and the same rule applies: consequential content must not travel in a shape old
          clients cannot read.
        </p>
        <p>
          <strong>Terminal behaviour:</strong> depends entirely on where the guard sits. If it
          switches on <code>copy.type</code>, unknown copy is dropped and the element renders empty —
          arguably worse than dropping the whole element, since the layout keeps a hole where content
          should be.
        </p>
        <p>
          <strong>Flex&rsquo;s constraints:</strong> many locales, copy owned by non-engineers, and
          copy changes shipping without a code deploy. None currently hold here — one locale, one
          person, and copy already ships without a deploy via templates. So the mechanism would be
          imported without the constraint that justifies it, which is the definition of cargo cult.
        </p>
        <p>
          <strong>What else you would build:</strong> a dictionary service, per-client dictionary
          caching and invalidation, a fallback for a missing key, and a resolution step in both
          renderers. Substantial machinery. The honest decision-log entry would say: <em>rejected for
          now; would change if a second locale ships or copy ownership moves outside engineering.</em>
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The layer structure is identical by design, so Flex reads as a variant of something already
          understood rather than as unfamiliar code.
        </li>
        <li>
          Every divergence is logged with the constraint that justified it. Undocumented divergence is
          the only dangerous kind.
        </li>
        <li>
          The EJS quote-stripping is the clearest case of a mechanism that exists only to satisfy an
          external constraint — reproduce constraints, not workarounds.
        </li>
        <li>
          Flex&rsquo;s brand-named route folders are OTT device screens. Brand behaviour for web lives
          in shared services, which is why grepping the brand finds the wrong files.
        </li>
        <li>
          The gap list is long and worth keeping honest: no actions, no experiments, no versioning, no
          telemetry sink, and no tests.
        </li>
      </ul>
    </div>
  );
}
