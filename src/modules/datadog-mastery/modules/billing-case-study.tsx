import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const billingBranchDiagram = String.raw`flowchart TD
  P["plans (direct CTA)"] --> B
  C["cadence (L4L path)"] --> B
  SA["SA consent accept<br/>(regional)"] --> B
  WB["Welcome Back<br/>direct-to-billing"] --> B
  B["/commerce/billing<br/>US 50.5k views/2d · THE CHECKOUT"]
  B -->|"purchase OK<br/>SIGNUP_SUCCESS 12.7k"| S["/commerce/success<br/>US 14.7k"]
  B -.->|"BILLING_REDIRECT 5,055<br/>guard: missing DOB / legal"| G["missing-info ·<br/>review-and-accept · SA"]
  B -->|"changeTemplate 5,276<br/>switch payment method"| B
  B -.->|"EMEA/LATAM only"| R["review-subscription<br/>(US: 20 views = not this flow)"]
  style B fill:#1a7f4b,color:#fff
  style S fill:#632ca6,color:#fff
  style G fill:#8a6d1a,color:#fff
  style R fill:#8a6d1a,color:#fff`;

const coverageShapesDiagram = String.raw`flowchart TD
  Q["Stamp-coverage check:<br/>stamped views % vs stamped actions %"] --> A["PROPORTIONAL<br/>Plan Select: 30% / 37%"]
  Q --> Bx["SKEWED LOW<br/>DOB: 12% / 3.5%"]
  Q --> Cx["INVERTED HIGH<br/>Billing: 70% / 99.3%"]
  A --> A1["columns honest —<br/>proceed, note mild bias"]
  Bx --> B1["TRAP — columns cover a<br/>weird subset, ratios lie.<br/>Pick a different experiment"]
  Cx --> C1["completers all stamped —<br/>columns comparable to each other,<br/>in-column rate inflated vs page.<br/>Proceed, document"]
  style A1 fill:#1a7f4b,color:#fff
  style B1 fill:#8a6d1a,color:#fff
  style C1 fill:#1a7f4b,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Checkout — Where the Epic Cashes Out", level: 2 },
  { id: "journey-slot", title: "The Gate Catch: Where Does Billing Go?", level: 2 },
  { id: "branches", title: "The Branch Map", level: 2 },
  { id: "signup-success", title: "SIGNUP_SUCCESS — Outcomes at Their Purest", level: 2 },
  { id: "experiment", title: "An Experiment on Its Home Page", level: 2 },
  { id: "errors", title: "741k Errors and Why the Widget Still Works", level: 2 },
  { id: "funnel-p75", title: "Funnel & a Heavy p75", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function BillingCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1136: the Billing section of the D+ Signup monitoring
        template. Billing is the checkout — the page every other section exists to feed, where a
        signup either becomes revenue or doesn&rsquo;t. It produced the epic&rsquo;s cleanest
        progression signal, its most extreme error volumes, a third variety of stamp-coverage
        shape, and one placement mistake that the quality gate caught before it shipped.
      </p>

      <h2 id="intro">The Checkout — Where the Epic Cashes Out</h2>
      <p>
        On <code>/commerce/billing</code> (US 50.5k views/2d — the US is this page&rsquo;s top
        market at 14.1%, for once making the anchor decision trivial) the user picks a payment
        method (card, PayPal, Apple Pay — switching fires the <code>changeTemplate</code>{" "}
        actionKey), reviews the price ledger, and submits (<code>signupExecutionV2</code>). The
        server confirms, <code>SIGNUP_SUCCESS</code> fires, and the success page loads. Every
        experiment upstream — email copy, password UX, plan merchandising — ultimately gets
        judged by whether this page&rsquo;s numbers move.
      </p>

      <h2 id="journey-slot">The Gate Catch: Where Does Billing Go?</h2>
      <p>
        The build plan initially slotted Billing right after Plan Select, pushing Subscriber
        Agreement down. The quality gate killed that: dashboard sections follow the{" "}
        <em>user&rsquo;s journey</em>, and in the journey the regional consent page comes{" "}
        <em>before</em> billing — the SA section&rsquo;s own funnel (&ldquo;Subscriber Agreement
        → Billing&rdquo;) had proven the order months of tickets earlier. Billing therefore
        inserted <em>after</em> SA as section ⑥, and SA kept its number — a smaller renumber,
        and a template that still reads as one continuous journey. The transferable rule:
        re-derive the insertion slot from the flow every time; &ldquo;next ticket&rdquo; does not
        mean &ldquo;next slot&rdquo;.
      </p>

      <h2 id="branches">The Branch Map</h2>
      <MermaidDiagram
        chart={billingBranchDiagram}
        title="Billing Entries and Exits (All Volumes US, 2d)"
        caption="Four ways in, one happy path out, and three kinds of detour: guard redirects (dotted amber), on-page payment-method switching, and the EMEA-only review-subscription continuation that US traffic never takes."
        minHeight={480}
      />
      <p>
        Two branches deserve their own sentence. The <code>BILLING_REDIRECT</code> action (5,055/2d)
        is the guard chain firing — users who reached checkout without a DOB or with pending
        legal docs get bounced out and return; it is the same mechanism that gives the DOB page
        its secondary entries. And <code>/commerce/review-subscription</code> — a whole
        confirmation page between billing and success — simply does not exist for US traffic
        (20 views in two days). It is EMEA/LATAM&rsquo;s purchase-completion page, which is the
        next ticket&rsquo;s entire problem.
      </p>

      <h2 id="signup-success">SIGNUP_SUCCESS — Outcomes at Their Purest</h2>
      <p>
        The progression widget uses the <code>SIGNUP_SUCCESS</code> custom action — fired by
        code when the purchase is server-confirmed. The attempt/outcome gap is visible right in
        the numbers:
      </p>
      <CodeBlock
        code={`# US, 2d — the same purchase, measured three ways:
signupExecutionV2 (actionKey)      17,792   # submit ATTEMPTS (incl. declines, retries)
SIGNUP_SUCCESS (custom action)     12,706   # server-confirmed PURCHASES
/commerce/success views            14,670   # success-page traffic (incl. other flows)

# The widget counts the middle one. Attempts − successes ≈ the decline/retry gap —
# exactly what a payment experiment might move.`}
        lang="bash"
        filename="attempt-vs-outcome.txt"
      />
      <p>
        One caveat the header now carries: this is a <em>US-flavored</em> truth. In EMEA/LATAM
        the purchase completes on review-subscription, so a cloner re-anchoring the Billing
        section to Brazil would silently undercount successes. Anchors are not just filters —
        they encode which market&rsquo;s <em>flow</em> the queries assume.
      </p>

      <h2 id="experiment">An Experiment on Its Home Page</h2>
      <p>
        <code>wpnx-payment-event-details</code> — a payment-event delivery experiment — anchors
        the section, and billing is its semantic home: the experiment&rsquo;s own machinery runs
        on this page. Coverage: 17,634 / 17,727 views per arm (70% of the page) and{" "}
        <strong>99.3% of all SIGNUP_SUCCESS events stamped</strong> — the best coverage in the
        epic. It is also the same key section ④ uses, deliberately: one find/replace tailors
        both commerce sections at once.
      </p>
      <p>
        The coverage <em>shape</em> completes a trilogy the previous case studies started:
      </p>
      <MermaidDiagram
        chart={coverageShapesDiagram}
        title="The Three Coverage Shapes (One Epic, Three Pages)"
        caption="Same check, three outcomes. Billing's inversion — actions stamped MORE than views — happens because assignment fires when payment machinery engages: completers are all stamped, bouncers less so."
        minHeight={440}
      />
      <p>
        Billing&rsquo;s inverted shape means the in-column success rate (35.7%) reads higher
        than the page truth (25.2%) — but both columns share the bias, so variant comparison
        stays valid. Proportional → proceed; skewed-low → trap; inverted-high → proceed with a
        documented asterisk.
      </p>

      <h2 id="errors">741k Errors and Why the Widget Still Works</h2>
      <p>
        Billing logged 741k error events in the validation window — ~20 per view — and for once
        the console filter is innocent: 738k of them are <code>custom</code>/<code>report</code>{" "}
        sources, the payment machinery&rsquo;s own validation and retry chatter. The top-10
        widget survives because of two mechanics: the group-by excludes events with missing
        messages (which is where most of the mass hides), and ranking — not magnitude — is the
        widget&rsquo;s product. The verified top of the table is genuinely actionable:
        &ldquo;An unexpected error has occurred.&rdquo; (2,568), Apple Pay session errors
        (2,078), <code>SUBSCRIPTION_PREVIEW_LOAD</code> failures (521). A treatment-only spike
        in any of these rows is a payment incident wearing an experiment&rsquo;s name tag.
      </p>

      <h2 id="funnel-p75">Funnel &amp; a Heavy p75</h2>
      <p>
        The funnel — Billing → Success (US), legs 50,492 → 14,670 — is the money conversion
        itself; success views exceed SIGNUP_SUCCESS counts slightly because the success route
        also receives other flows (route-level funnels count all traffic by template
        convention). And p75 landed at 3.55s / 3.48s per arm — the heaviest page in the
        template, honestly earned: payment SDKs, 3DS frames, wallet scripts. The widget&rsquo;s
        job is not to celebrate 3.5s; it is to notice when one variant makes it 4.5s.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Section order comes from the user&rsquo;s journey, re-derived every insertion — an
          existing funnel (&ldquo;SA → Billing&rdquo;) can prove a slot better than any
          assumption. &ldquo;Next ticket&rdquo; ≠ &ldquo;next slot&rdquo;.
        </li>
        <li>
          Measure outcomes, not attempts, when the page offers both: SIGNUP_SUCCESS vs
          signupExecutionV2 differ by exactly the decline/retry gap a payment experiment would
          move.
        </li>
        <li>
          Anchors encode a market&rsquo;s <em>flow</em>, not just a geo filter — US purchases
          complete on billing, EMEA&rsquo;s on review-subscription; re-anchoring without knowing
          that silently undercounts.
        </li>
        <li>
          Stamp coverage has three shapes: proportional (proceed), skewed-low (trap — switch
          experiments), inverted-high (proceed, document the inflated in-column rate).
        </li>
        <li>
          Enormous error volume doesn&rsquo;t break a top-N widget — exclude-missing group-bys
          drop the anonymous mass, and ranking is the product. Verify the top rows are real
          messages before shipping.
        </li>
        <li>
          Reusing one experiment key across sibling sections (④ and ⑥) is a feature: one
          find/replace tailors both, and the header row says so.
        </li>
      </ul>
    </div>
  );
}
