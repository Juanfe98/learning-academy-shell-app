import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const purchaseFlowDiagram = String.raw`flowchart TD
  ID["identity handoff<br/>(see: D+ Sign-Up & Auth Flow)"] --> PL["/commerce/plans<br/>839k views/2d · pick a plan"]
  PL -->|"selectPlanSelectCadence 15.9k<br/>chose an L4L offer"| CAD["/commerce/cadence<br/>monthly vs 6-mo prepaid"]
  PL -->|"selectPlanSignup 3.2k<br/>regular plan"| BIL
  CAD --> BIL["/commerce/billing<br/>THE CHECKOUT · US 50.5k/2d"]
  SA["/identity/subscriber-agreement<br/>( regional, e.g. Brazil )"] --> BIL
  BIL -.->|"BILLING_REDIRECT 5.1k — guards:<br/>missing DOB / pending legal docs"| G["missing-info ·<br/>review-and-accept · SA"]
  G -.-> BIL
  BIL -->|"US + most markets:<br/>SIGNUP_SUCCESS on billing"| SUC["/commerce/success<br/>journey end"]
  BIL -->|"DE·FR·AR·TR:<br/>regulatory confirmation"| REV["/commerce/review-subscription<br/>SIGNUP_SUCCESS fires here"]
  REV --> SUC
  SUC -->|"START STREAMING"| APP["streaming app"]
  style PL fill:#0063e5,color:#fff
  style BIL fill:#1a7f4b,color:#fff
  style REV fill:#8a6d1a,color:#fff
  style SUC fill:#0063e5,color:#fff`;

const completionByMarketDiagram = String.raw`flowchart LR
  subgraph us["US · Brazil · Mexico · most markets"]
    u1["billing"] -->|"submit signupExecutionV2<br/>→ SIGNUP_SUCCESS fires ON billing"| u2["success"]
  end
  subgraph reg["Germany · France · Argentina · Turkey (+AT, FR territories)"]
    r1["billing"] --> r2["review-subscription<br/>explicit order confirmation<br/>(German Bestellbutton law family)"]
    r2 -->|"SIGNUP_SUCCESS fires HERE"| r3["success"]
  end
  style u1 fill:#1a7f4b,color:#fff
  style r2 fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "Where This Flow Begins", level: 2 },
  { id: "plans", title: "Plans — the Fork", level: 2 },
  { id: "cadence", title: "Cadence — How Often You Pay", level: 2 },
  { id: "consent", title: "Subscriber Agreement — the Regional Detour", level: 2 },
  { id: "billing", title: "Billing — the Checkout and Its Guards", level: 2 },
  { id: "confirmation", title: "Purchase Confirmation — Four Markets Finish Differently", level: 2 },
  { id: "naming-trap", title: "The Naming Trap", level: 2 },
  { id: "success", title: "Success — Journey End (with a Surprise)", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DplusPurchaseFlow() {
  return (
    <div className="article-content">
      <p>
        This module walks the D+ <em>commerce</em> journey — everything that happens after
        identity hands the user off with a fresh (or recovered) account, up to the moment they
        start streaming. It is the continuation of{" "}
        <strong>D+ Sign-Up &amp; Auth Flow</strong> (same academy), and every number in it comes
        from live production RUM measured during the GREAT-1129 dashboard epic — two-day
        windows, real traffic, no guesses.
      </p>

      <h2 id="intro">Where This Flow Begins</h2>
      <MermaidDiagram
        chart={purchaseFlowDiagram}
        title="The D+ Purchase & Checkout Flow"
        caption="One journey, two forks: the L4L cadence detour after plans, and the regulatory confirmation detour after billing. Dotted lines are guard redirects — bounce-outs that return."
        minHeight={560}
      />

      <h2 id="plans">Plans — the Fork</h2>
      <p>
        <code>/commerce/plans</code> (839k views/2d globally — a LATAM-heavy page: Mexico 16.6%,
        Brazil 15.2%, US 9.3%) is where the user picks what to buy. Commerce pages emit{" "}
        <code>@context.actionKey</code> — semantic, code-owned CTA identifiers — and the
        page&rsquo;s two keys <em>are</em> the fork:
      </p>
      <CodeBlock
        code={`selectPlanSelectCadence   15,866/2d (US)   # picked a Lower-for-Longer offer → cadence page
selectPlanSignup           3,213/2d (US)   # picked a regular plan → straight to billing`}
        lang="bash"
        filename="the-plans-fork.txt"
      />

      <h2 id="cadence">Cadence — How Often You Pay</h2>
      <p>
        Cadence = <strong>billing frequency</strong>, not a delay: monthly price vs a discounted
        longer prepaid period. Only L4L (Lower-for-Longer: lower effective price for longer
        commitment) offers have the choice, which is why only the{" "}
        <code>selectPlanSelectCadence</code> path visits <code>/commerce/cadence</code> (26.7k
        US views/2d). Regular plans have nothing to choose and skip it.
      </p>

      <h2 id="consent">Subscriber Agreement — the Regional Detour</h2>
      <p>
        In markets whose remote config sets <code>requiresForcedSubscriberAgreement</code>{" "}
        (Brazil, notably — the US has no standalone consent page), the user reviews and accepts
        the subscriber agreement before checkout; the accept lands on billing. It also re-runs
        for <em>existing</em> subscribers when an updated agreement is flagged
        (<code>requiresActiveReview</code>) — so traffic waves on this page are re-acceptance
        campaigns, not incidents.
      </p>

      <h2 id="billing">Billing — the Checkout and Its Guards</h2>
      <p>
        <code>/commerce/billing</code> (US is its top market: 50.5k views/2d) is the conversion
        moment: pick a payment method (switching fires <code>changeTemplate</code>, 5.3k/2d),
        review the ledger, submit. The same purchase is measurable three ways, and the
        differences are the point:
      </p>
      <CodeBlock
        code={`signupExecutionV2 (actionKey)    17,792   # submit ATTEMPTS — declines and retries included
SIGNUP_SUCCESS (custom action)   12,706   # server-confirmed PURCHASES
/commerce/success views          14,670   # success-page traffic — includes other flows

# attempts − successes ≈ the decline/retry gap.`}
        lang="bash"
        filename="one-purchase-three-numbers.txt"
      />
      <p>
        Billing is also a <em>guard checkpoint</em>: reaching it without a date of birth or with
        pending legal docs triggers <code>BILLING_REDIRECT</code> (5.1k/2d) out to{" "}
        <code>missing-info</code> (the DOB page), <code>/identity/review-and-accept</code>{" "}
        (legal terms), or the subscriber agreement — and back. Those guards are the same
        mechanism the auth-flow module describes from the identity side
        (<code>useBillingRedirects</code>).
      </p>

      <h2 id="confirmation">Purchase Confirmation — Four Markets Finish Differently</h2>
      <MermaidDiagram
        chart={completionByMarketDiagram}
        title="Where a Purchase Completes, by Market"
        caption="Most markets finish on billing. Germany, France, Argentina and Turkey legally require an explicit order-confirmation page — /commerce/review-subscription — and the purchase completes there instead."
        minHeight={400}
      />
      <p>
        <code>/commerce/review-subscription</code> (18.8k views/2d: Germany 37.5%, France 30.7%,
        Argentina 16.6%, Turkey 8.8% — and 20 US views total, i.e., the page does not exist for
        US traffic) is a regulatory confirmation step, not a generic &ldquo;EMEA page&rdquo;:
        Brazil and Mexico complete on billing like the US. On it, Braintree/PayPal machinery and
        market payment methods (German <code>Lastschrift</code> direct debit) finish the job,
        and <code>SIGNUP_SUCCESS</code> fires there. Any per-market purchase analysis must know
        which ending a market uses — counting billing successes in Germany undercounts
        dramatically.
      </p>

      <h2 id="naming-trap">The Naming Trap</h2>
      <p>
        Two routes, one word apart, different worlds — write it down once and stop confusing
        them forever:
      </p>
      <CodeBlock
        code={`/identity/review-and-accept      # legal-docs GUARD page (terms), mostly US,
                                 # part of the billing-entry guard chain
/commerce/review-subscription    # purchase CONFIRMATION page (the order),
                                 # DE·FR·AR·TR only, purchase completes here`}
        lang="bash"
        filename="naming-trap.txt"
      />

      <h2 id="success">Success — Journey End (with a Surprise)</h2>
      <p>
        <code>/commerce/success</code> receives every purchase flow — fresh signups, Welcome
        Back reacquisitions, switches — plus revisits. The <code>purchaseSuccess</code> custom
        action (12.2k US/2d) marks <em>fresh purchase arrivals</em>, separating conversions from
        reloads. The page&rsquo;s exit (<code>START STREAMING</code>) crosses into the streaming
        app — a different RUM world. And a surprise lives here: <strong>TV license-plate
        activation runs on the success page</strong> (<code>ACTIVATE_LICENSE_PLATE_SUCCESS</code>{" "}
        5.5k/2d) — users finish a web purchase and immediately type the code their TV shows.
      </p>
      <p>
        For the monitoring view of every page in this module — widget recipes, example
        experiments, per-page validation numbers — see the per-page case studies in the{" "}
        <em>Datadog Mastery</em> academy (Plan Select, Billing, Purchase Confirmation, Success).
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The commerce journey is plans → (cadence, L4L only) → (subscriber agreement, regional)
          → billing → (review-subscription, DE·FR·AR·TR only) → success — two forks, two
          regional detours, one checkout.
        </li>
        <li>
          Commerce pages speak in <code>actionKey</code> — the plans fork and the billing submit
          are semantic identifiers, not localized button text.
        </li>
        <li>
          One purchase, three numbers: attempts (signupExecutionV2), confirmations
          (SIGNUP_SUCCESS), success-page views — the gaps between them are the interesting
          metrics.
        </li>
        <li>
          Purchase completion is market-dependent: billing for most, review-subscription for
          DE·FR·AR·TR. Per-market analysis must pick the right ending.
        </li>
        <li>
          Billing doubles as a guard checkpoint — <code>BILLING_REDIRECT</code> bounces users to
          DOB/legal pages and back; those detours are features, not errors.
        </li>
        <li>
          review-and-<em>accept</em> (identity, terms) ≠ review-<em>subscription</em> (commerce,
          order). One word, two worlds.
        </li>
      </ul>
    </div>
  );
}
