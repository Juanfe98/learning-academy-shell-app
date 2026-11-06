import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const purchaseCompletionDiagram = String.raw`flowchart TD
  B["/commerce/billing"] -->|"US (+ most markets):<br/>SIGNUP_SUCCESS fires ON billing"| S["/commerce/success"]
  B -->|"DE · FR · AR · TR (+ AT, FR territories):<br/>regulatory confirmation required"| R["/commerce/review-subscription<br/>18,750 views/2d<br/>DE 37.5% · FR 30.7% · AR 16.6% · TR 8.8%"]
  R -->|"SIGNUP_SUCCESS fires HERE<br/>4,634 DE/2d · 66% of DE views"| S
  US["US traffic on this page:<br/>20 views in 2 days = page absent"] ~~~ R
  style R fill:#1a7f4b,color:#fff
  style B fill:#632ca6,color:#fff
  style US fill:#8a6d1a,color:#fff`;

const namingTrapDiagram = String.raw`flowchart LR
  subgraph identity["/identity/review-and-accept"]
    i1["Legal-docs guard page<br/>mostly US · 9.1k US/2d"]
    i2["Part of billing-entry guard chain:<br/>DOB → review-and-accept → SA"]
    i3["Accept updated TERMS"]
  end
  subgraph commerce["/commerce/review-subscription"]
    c1["Purchase confirmation<br/>DE·FR·AR·TR only"]
    c2["Between billing and success"]
    c3["Confirm the ORDER —<br/>purchase completes here"]
  end
  identity ~~~ commerce
  style identity fill:#8a6d1a,color:#fff
  style commerce fill:#1a7f4b,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Ticket & a Wrong Assumption", level: 2 },
  { id: "regional", title: "Not EMEA/LATAM — Four Specific Markets", level: 2 },
  { id: "naming-trap", title: "The Naming Trap: Two 'Review' Pages", level: 2 },
  { id: "experiment", title: "Germany's Example Experiment", level: 2 },
  { id: "widgets", title: "The Widgets — and Zero Layout Shifts", level: 2 },
  { id: "precision", title: "Precision Propagates: Fixing ⑥'s Caveat", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PurchaseConfirmationCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1137: the Purchase Confirmation section of the D+ Signup
        monitoring template — the page US engineers have usually never seen, because US traffic
        never renders it. It corrected a lazy regional label we had shipped one ticket earlier,
        untangled two nearly-identical route names, and became the template&rsquo;s first
        Germany-anchored section.
      </p>

      <h2 id="intro">The Ticket &amp; a Wrong Assumption</h2>
      <p>
        During the Billing ticket we discovered <code>/commerce/review-subscription</code> had 20
        US views in two days and wrote it off as &ldquo;the EMEA/LATAM purchase page&rdquo;. This
        ticket began by testing that label against the data — and the label lost. The country mix
        (which summed <em>exactly</em> to the route total, a first for the epic) is not a broad
        region at all.
      </p>

      <h2 id="regional">Not EMEA/LATAM — Four Specific Markets</h2>
      <CodeBlock
        code={`/commerce/review-subscription — 18,750 views/2d, bucket sum = route total exactly:
Germany     7,030   37.5%     ← anchor
France      5,756   30.7%
Argentina   3,106   16.6%
Turkey      1,655    8.8%
Austria       819    4.4%
+ French territories (Réunion, Martinique, Guadeloupe...)

Absent: Brazil, Mexico, and the entire US (20 views = rounding noise).`}
        lang="bash"
        filename="country-mix.txt"
      />
      <p>
        This is a <em>regulatory</em> confirmation page — Germany&rsquo;s explicit-order-button
        law (the &ldquo;Zahlungspflichtig bestellen&rdquo; family) and similar rules in France,
        Argentina and Turkey require an unambiguous review-and-confirm step before charging. In
        these markets the purchase does not complete on billing: <code>SIGNUP_SUCCESS</code>{" "}
        fires <em>here</em> (4,634 DE/2d — 66% of German views), after Braintree/PayPal
        machinery and payment methods like <code>Lastschrift</code> (German direct debit) do
        their work on-page.
      </p>
      <MermaidDiagram
        chart={purchaseCompletionDiagram}
        title="Where a Purchase Actually Completes, by Market"
        caption="Same journey, two endings: most markets finish on billing; four markets insert a legally-required confirmation page and finish there. An anchor is a claim about which ending your queries assume."
        minHeight={420}
      />

      <h2 id="naming-trap">The Naming Trap: Two &ldquo;Review&rdquo; Pages</h2>
      <p>
        Mid-build, a fair question arrived: &ldquo;didn&rsquo;t we call this page
        review-and-accept earlier?&rdquo; No — and the confusion is worth immortalizing, because
        the two routes are one word apart and belong to entirely different worlds:
      </p>
      <MermaidDiagram
        chart={namingTrapDiagram}
        title="review-and-accept ≠ review-subscription"
        caption="The identity page reviews TERMS (a guard, mostly US); the commerce page reviews the ORDER (a checkout step, four markets). Similar names, disjoint traffic."
        minHeight={380}
      />

      <h2 id="experiment">Germany&rsquo;s Example Experiment</h2>
      <p>
        Candidate scan on German traffic produced three real A/Bs; the winner was{" "}
        <code>wpnx-POP-em-interstitial-lilo-stitch</code> — control 1,779 /
        <code>lilo_and_stitch_background</code> 1,682, with the coverage-shape check
        (standard since the DOB ticket) coming back proportional: 49% of views and 50% of
        successes stamped. Validated columns, Germany, 2d: views 1,779/1,682 · purchase
        completions 1,196/1,135 · errors 955/961 · p75 1.09s/0.99s. Funnel Review Subscription →
        Success: 7,030 → 5,044.
      </p>

      <h2 id="widgets">The Widgets — and Zero Layout Shifts</h2>
      <p>
        Standard section shape: views + purchase completions in the page section, then one
        widget each into Funnels, Errors, Performance. The build-mechanics note: all three
        flow-section widgets landed in the <em>free right-half slots</em> beside their Billing
        siblings — the dashboard grid is 12 wide, flow widgets are half-width, and Billing had
        opened three rows with empty right halves. Filling a free slot touches one widget;
        opening a row shifts twenty. Bonus: the pairs read side by side — &ldquo;Billing →
        Success (US)&rdquo; next to &ldquo;Review Subscription → Success (Germany)&rdquo; is the
        two purchase endings on one row.
      </p>

      <h2 id="precision">Precision Propagates: Fixing ⑥&rsquo;s Caveat</h2>
      <p>
        The Billing section&rsquo;s header caveat had shipped saying &ldquo;EMEA/LATAM purchases
        complete on review-subscription&rdquo;. This ticket&rsquo;s data proved that wording
        wrong in both directions — Brazil and Mexico (EMEA/LATAM by any definition) complete on
        billing; Turkey (neither) completes here. The caveat was rewritten to the actual market
        list in the same header update that added ⑦&rsquo;s row. Templates teach: an imprecise
        caveat is a small bug with a large blast radius, and fixing it the moment better data
        exists is part of the section&rsquo;s job.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Regional labels are hypotheses — test them. &ldquo;EMEA/LATAM page&rdquo; dissolved
          into four specific regulatory markets the moment the country mix ran.
        </li>
        <li>
          A complete bucket sum (mix total = route total) is the strongest form of the
          truncation check — this page was the epic&rsquo;s first perfect reconciliation.
        </li>
        <li>
          One-word route differences can span worlds: review-and-<em>accept</em> (identity,
          terms, guard) vs review-<em>subscription</em> (commerce, order, checkout). Write the
          distinction down the first time anyone confuses them.
        </li>
        <li>
          Purchase completion is market-dependent — anchor choices encode it, and caveats about
          it must name markets, not regions.
        </li>
        <li>
          Fill free half-row slots before opening new rows: one layout touch instead of a
          twenty-widget cascade, and the pairs often read meaningfully side by side.
        </li>
        <li>
          When new data falsifies an earlier section&rsquo;s caveat, fix it in the same header
          pass — precision propagates forward ticket by ticket.
        </li>
      </ul>
    </div>
  );
}
