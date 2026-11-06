import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const planForkDiagram = String.raw`flowchart TD
  A["/commerce/plans<br/>839k views/2d global · US 77.7k<br/>Mexico 16.6% · Brazil 15.2% · US 9.3%"] -->|"selectPlanSelectCadence<br/>15,866 (L4L offer)"| C["/commerce/cadence<br/>US 26.7k · pick 6-mo vs monthly"]
  A -->|"selectPlanSignup<br/>3,213 (direct)"| B["/commerce/billing<br/>US 50.4k"]
  C --> B
  W["Welcome Back / reacquisition<br/>sessions also pass through"] -.-> A
  B --> S["review → success"]
  style A fill:#1a7f4b,color:#fff
  style C fill:#632ca6,color:#fff
  style B fill:#632ca6,color:#fff
  style W fill:#8a6d1a,color:#fff`;

const funnelSemanticsDiagram = String.raw`flowchart TD
  subgraph L4L["L4L-path session"]
    l1["plans"] --> l2["cadence"] --> l3["billing"]
  end
  subgraph direct["Direct-path session"]
    d1["plans"] --> d2["billing"]
  end
  L4L --> F3["3-step funnel<br/>plans → cadence → billing<br/>matches L4L ONLY ✓"]
  L4L --> F2["2-step funnel<br/>plans → billing<br/>matches BOTH — L4L reaches billing too"]
  direct --> F2
  direct -.->|"fails step 2 (no cadence)"| F3
  F2 --> X["label '(direct path)' would LIE<br/>→ relabeled '(all paths)'"]
  style F3 fill:#1a7f4b,color:#fff
  style X fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Ticket & the Overlap Question", level: 2 },
  { id: "commerce-instrumentation", title: "First Commerce Page: actionKey Arrives", level: 2 },
  { id: "anchor", title: "A LATAM Page with a US Anchor", level: 2 },
  { id: "experiment", title: "The Example Experiment & the Coverage Check", level: 2 },
  { id: "widget-cta", title: "Widget 2 — The CTA-Path Fork", level: 2 },
  { id: "funnel-lesson", title: "The Funnel Label That Lied", level: 2 },
  { id: "widgets-errors-p75", title: "Errors & a Perfectly Boring p75", level: 2 },
  { id: "header-transpose", title: "Transposing the Header Contract", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PlanSelectCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1135: the Plan Select section of the D+ Signup monitoring
        template — the first <em>commerce</em> page of the epic, which changed the
        instrumentation rules in our favor, forced an explicit decision about overlapping with a
        sibling template, and taught one precise lesson about what a Datadog funnel actually
        counts. Every number is from live production RUM on build day (2-day window).
      </p>

      <h2 id="intro">The Ticket &amp; the Overlap Question</h2>
      <p>
        Before this ticket started, a teammate flagged that the remaining Signup tickets might
        overlap her Welcome Back template — and she was right: <code>/commerce/plans</code>,
        billing, review-subscription, success and cadence are all fully instrumented there,
        WB-flavored. The decision (made explicitly, documented in the design doc): build the full
        signup-flavored section anyway — <strong>duplication-by-design</strong>. That is what
        template-per-flow means: the same room appears in every house that contains it, furnished
        for that house&rsquo;s journey. Her WB template itself duplicates pages across flows, the
        ticket ACs literally require page widgets, and the reversal cost is deleting widgets —
        minutes. The review gate catches any preference for slimming.
      </p>

      <h2 id="commerce-instrumentation">First Commerce Page: actionKey Arrives</h2>
      <p>
        Identity pages made us fight for progression signals: auto-captured clicks named after
        localized button copy, or a lucky custom action. Commerce pages emit{" "}
        <code>@context.actionKey</code> — a semantic, code-owned identifier on every meaningful
        CTA. The whole localized-click problem evaporates:
      </p>
      <CodeBlock
        code={`# The page's fork, measured semantically (US, 2d):
@context.actionKey:selectPlanSelectCadence     15,866   # chose an L4L offer → cadence page
@context.actionKey:selectPlanSignup             3,213   # chose a regular plan → billing

# No language filter. No copy dependency. The same two keys Natalya's
# WB template uses — donor pattern, different flow context.`}
        lang="bash"
        filename="actionkey-fork.txt"
      />
      <p>
        The stamp-coverage trap from the DOB ticket also inverts here: commerce experiments
        assign at commerce surfaces, so they stamp this page <em>properly</em>. Real A/Bs are
        usable again.
      </p>
      <MermaidDiagram
        chart={planForkDiagram}
        title="The Plan Select Fork"
        caption="Two CTAs, two paths, one destination. Welcome Back sessions also pass through this route — route-level widgets count all traffic by template convention."
        minHeight={440}
      />

      <h2 id="anchor">A LATAM Page with a US Anchor</h2>
      <p>
        The country mix (complete — bucket sum reconciled against the route total, the check the
        Password ticket made mandatory) puts Mexico first at 16.6% and Brazil at 15.2%; the US is
        third at 9.3%. The section still anchors US: 77.7k views/2d is ample, and the signup
        template&rsquo;s sections read best as one continuous US journey (Canada on Password was
        forced by experiment reality, not preference). The honesty lives in the section divider —
        &ldquo;( global — LATAM-heavy mix · US-anchored )&rdquo; — so a team running a LATAM plans
        experiment knows to re-anchor before trusting the numbers.
      </p>

      <h2 id="experiment">The Example Experiment &amp; the Coverage Check</h2>
      <p>
        <code>wpnx-payment-event-details</code> @ US: 11,524 control / 11,477 Synchronous views —
        a near-perfect 50/50, live control at last. The stamp-coverage check (standard procedure
        since the DOB ticket) passed with a nuance worth reading:
      </p>
      <CodeBlock
        code={`stamped views:   23,001 of 77,701  → 30%
stamped CTAs:     5,889 of 15,866  → 37%

# PROPORTIONAL (unlike DOB's 12% views vs 3.5% actions) → in-column ratios honest.
# Residual bias: in-column CTA rate 25.6% vs page-wide 20.4% — the stamped subset
# skews toward returning users. Documented, not disqualifying.`}
        lang="bash"
        filename="stamp-coverage-check.txt"
      />
      <p>
        The lesson compounds: coverage is not pass/fail, it is a <em>shape</em>. Identical
        percentages across event types → honest columns. Wildly different percentages → the DOB
        trap. Mildly different → document the bias and proceed.
      </p>

      <h2 id="widget-cta">Widget 2 — The CTA-Path Fork</h2>
      <p>
        The section&rsquo;s progression widget is the template&rsquo;s first actionKey table:
        rows are the two actionKeys (grouped, so raw machine names render — matching the WB
        template&rsquo;s precedent), columns are the variants, and the title carries the
        translation: &ldquo;Plan CTA Path by Variant (cadence=L4L vs signup=direct · US)&rdquo;.
      </p>
      <CodeBlock
        code={`@type:action @context.actionKey:(selectPlanSelectCadence OR selectPlanSignup)
  @view.name:"/commerce/plans" service:web-solo-commerce-disneyplus
  @geo.country:"United States" env:prod
  @context.experiments.wpnx-payment-event-details.variantId:control
  → group by @context.actionKey

# Validated (2d):            control    Synchronous
# selectPlanSelectCadence     2,949       2,939
# selectPlanSignup            1,048       1,083`}
        lang="bash"
        filename="cta-path-by-variant.query"
      />
      <p>
        This widget watches the thing a plans experiment most often changes: not <em>whether</em>{" "}
        users pick a plan, but <em>which path</em> they take. A treatment that shifts the
        cadence/direct ratio shows up here before it shows up in revenue.
      </p>

      <h2 id="funnel-lesson">The Funnel Label That Lied</h2>
      <p>
        The plan proposed two funnels: &ldquo;Plans → Cadence → Billing (L4L path)&rdquo; and
        &ldquo;Plans → Billing (direct path)&rdquo;. The quality-gate pass killed the second
        label: Datadog funnels count sessions that did A <em>then eventually</em> B — and L4L
        sessions reach billing too (via cadence), so they match the two-step funnel just as well
        as direct sessions do. A funnel cannot isolate &ldquo;billing <em>without</em> cadence in
        between&rdquo; at route level.
      </p>
      <MermaidDiagram
        chart={funnelSemanticsDiagram}
        title="What a Session-Sequence Funnel Actually Matches"
        caption="Both session types match plans → billing; only L4L sessions match the 3-step version. The 2-step funnel had to be relabeled '(all paths)' — direct-only volume is readable by subtraction."
        minHeight={460}
      />
      <p>
        The pair as shipped: the 3-step funnel isolates the L4L branch (direct sessions fail the
        cadence step and drop out — correctly), and the 2-step &ldquo;(all paths)&rdquo; funnel
        gives the total; direct-only is the difference. Same mechanism, used twice, labeled
        honestly. Leg volumes validated: 77,701 → 26,669 → 50,418.
      </p>

      <h2 id="widgets-errors-p75">Errors &amp; a Perfectly Boring p75</h2>
      <p>
        Errors: straight donor clone — top-10 messages, noise filter, 3,156 / 2,932 per arm.
        Performance: <code>pc75</code> came back <strong>1.444s for both variants — identical to
        the millisecond</strong>. That is not a bug; at 11.5k samples per arm, two populations
        drawn from the same latency distribution land in the same percentile bucket. It is the
        healthiest possible reading for this particular experiment (an event-delivery change that
        <em> should</em> be perf-neutral), and a nice calibration for cloners: a p75 widget
        proving nothing changed is doing its job.
      </p>

      <h2 id="header-transpose">Transposing the Header Contract</h2>
      <p>
        The header&rsquo;s find/replace table had grown a column per section — at four it was
        near the width limit, and this ticket would make five. So the table transposed:
        sections as rows, fields as columns. A row per page scales to the remaining tickets
        without ever widening again, and each row reads as a complete sentence about its section:
        key, variants, region. The debt was flagged one ticket early and paid exactly when it
        came due — the cheapest kind of refactor. The caveat block also gained the
        commerce-side counterpart of the identity warning: commerce pages <em>do</em> emit
        actionKey, and ④&rsquo;s CTA widget is the demonstration.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Overlap between flow templates is duplication-by-design — the same page furnished for
          different journeys. Decide explicitly, document the sibling template as donor
          precedent, and let the review gate veto.
        </li>
        <li>
          Commerce pages emit <code>@context.actionKey</code> — semantic, language-independent
          CTA measurement. The localized-click workarounds from identity pages simply stop being
          needed.
        </li>
        <li>
          A funnel counts &ldquo;A then eventually B&rdquo; per session — it can never isolate
          &ldquo;B without C in between&rdquo;. Label funnels for what they match: branch-specific
          needs the branch&rsquo;s distinctive step; everything else is &ldquo;(all paths)&rdquo;.
        </li>
        <li>
          Stamp coverage is a shape, not a pass/fail: proportional across event types → honest
          columns; skewed → the DOB trap; mildly biased → document and proceed.
        </li>
        <li>
          Anchor for the template&rsquo;s narrative, disclose for reality: a LATAM-heavy page can
          carry a US anchor if the divider says so — cloners targeting other markets re-anchor
          knowingly.
        </li>
        <li>
          Two identical p75 values is a result, not a failure — a perf-neutral experiment{" "}
          <em>should</em> produce a boring performance widget.
        </li>
      </ul>
    </div>
  );
}
