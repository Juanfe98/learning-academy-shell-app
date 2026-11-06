import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const successEntriesDiagram = String.raw`flowchart TD
  B["billing (US path)"] --> S
  R["review-subscription<br/>(DE·FR·AR·TR path)"] --> S
  W["Welcome Back /<br/>reacquisition purchases"] --> S
  X["cancel-save & switch flows"] --> S
  RV["revisits / reloads"] -.-> S
  S["/commerce/success<br/>US 14.9k views/2d<br/>purchaseSuccess 12.2k = fresh arrivals only"]
  S -->|"click on START STREAMING<br/>→ streaming app (different RUM service)"| OUT["(exits this template's world)"]
  S -->|"TV setup ON this page:<br/>ACTIVATE_LICENSE_PLATE_SUCCESS 5.5k"| TV["TV activated"]
  style S fill:#1a7f4b,color:#fff
  style OUT fill:#8a6d1a,color:#fff
  style RV fill:#8a6d1a,color:#fff`;

const templateCompleteDiagram = String.raw`flowchart TD
  H["Header — find/replace contract<br/>8 example rows · flow order · caveats"] --> P
  subgraph P["Page sections (journey order)"]
    p1["① Email · US"] --> p2["② Password · Canada"] --> p3["③ DOB · US"] --> p4["④ Plan Select · US"]
    p4 --> p5["⑤ Subscriber Agreement · Brazil"] --> p6["⑥ Billing · US"] --> p7["⑦ Purchase Confirmation · Germany"] --> p8["⑧ Success · US"]
  end
  P --> F["⑨ Funnels — 8 route-level edges"]
  F --> E["⑩ Errors — 8 noise-filtered top-10 tables"]
  E --> PF["⑪ Performance — 8 p75 widgets"]
  G["( ⑤-slot gap: Cadence —<br/>teammate's ticket, inserts later )"] ~~~ P
  style P fill:#632ca6,color:#fff
  style G fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Last Page", level: 2 },
  { id: "disambiguation", title: "One Page, Every Flow — the purchaseSuccess Answer", level: 2 },
  { id: "no-funnel", title: "The Deviation: No Funnel at the End of the World", level: 2 },
  { id: "surprises", title: "Surprises: a TV Activation Desk on the Success Page", level: 2 },
  { id: "experiment", title: "Third Section, Same Key", level: 2 },
  { id: "hardening", title: "Build Hardening: Occupancy Asserts", level: 2 },
  { id: "template-complete", title: "The Finished Template", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SuccessScreenCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1138: the Success section — the last page of the journey
        and the final build of the D+ Signup template epic. Its research question was
        disambiguation (everything lands here — what counts as <em>signup</em> success?), its
        design decision was a deliberately missing widget, and its ending is a complete,
        eight-section monitoring template.
      </p>

      <h2 id="intro">The Last Page</h2>
      <p>
        <code>/commerce/success</code> (US 14.9k views/2d, top market at 16.7% — US anchor,
        global-page disclosure in the divider) is where every purchase flow terminates: fresh
        signups from billing, German signups from review-subscription, Welcome Back
        reacquisitions, cancel-save switches — plus plain revisits and reloads. A views widget
        alone would blend all of it.
      </p>
      <MermaidDiagram
        chart={successEntriesDiagram}
        title="Everything Lands Here"
        caption="Five kinds of arrival, one page. The exit (START STREAMING) leaves this RUM service entirely — and a TV-activation surface quietly operates on the same page."
        minHeight={460}
      />

      <h2 id="disambiguation">One Page, Every Flow — the purchaseSuccess Answer</h2>
      <p>
        The page answers its own disambiguation question with a custom action:{" "}
        <code>purchaseSuccess</code> (12,182 US/2d) fires on <strong>fresh purchase
        arrivals</strong> — separating real conversions from revisits. Precision matters about
        what it does <em>not</em> separate: it fires for arrivals of <em>any</em> flow (signup,
        WB, switch), and the widget title deliberately does not claim &ldquo;signup&rdquo;.
        Flow-specificity is the funnels&rsquo; job — the arrival edges (Billing → Success,
        Review-Subscription → Success) already encode which road the session took. Section
        widgets monitor the page; funnels monitor the paths.
      </p>
      <CodeBlock
        code={`@type:action @action.name:purchaseSuccess
  @view.name:"/commerce/success" service:web-solo-commerce-disneyplus
  @geo.country:"United States" env:prod
  @context.experiments.wpnx-payment-event-details.variantId:control

# Validated (2d): control 6,032 · Synchronous 6,056
# vs views 6,971 / 7,015 — the gap between views and arrivals ≈ revisits.`}
        lang="bash"
        filename="purchase-arrivals.query"
      />

      <h2 id="no-funnel">The Deviation: No Funnel at the End of the World</h2>
      <p>
        Every previous section contributed a funnel. This one doesn&rsquo;t — documented as a
        deviation with its rejected alternatives, not as an omission. Downstream of success
        there is nothing this template can see: the real exit (<code>click on START
        STREAMING</code>, 1,022/2d) crosses into the streaming app, a different RUM service.
        Profile-setup routes were tested as targets (~1k views/2d — too small, partly a
        different surface). And the page&rsquo;s <em>arrival</em> edges already exist as the two
        purchase-ending funnels. A missing widget with a written reason beats a decorative
        funnel that measures nothing.
      </p>

      <h2 id="surprises">Surprises: a TV Activation Desk on the Success Page</h2>
      <p>
        The action scan surfaced a whole workflow nobody associates with a &ldquo;success
        screen&rdquo;: TV license-plate activation. <code>ACTIVATE_LICENSE_PLATE_SUCCESS</code>{" "}
        (5,553/2d) and <code>REDEEM_OFF_DEVICE_GRANT_SUCCESS</code> (5,551) run right here —
        users completing a purchase on web and immediately activating their TV with the code the
        TV displays. Plus <code>click on Download</code> (989) and{" "}
        <code>click on Manage Account</code> (693). None of it needed a widget for this ticket,
        all of it went into the design doc — the next person instrumenting TV activation starts
        with volumes instead of guesses.
      </p>

      <h2 id="experiment">Third Section, Same Key</h2>
      <p>
        <code>wpnx-payment-event-details</code> anchors its third section (④ Plan Select, ⑥
        Billing, ⑧ Success): views 6,971/7,015 (94% coverage), purchaseSuccess{" "}
        <strong>99.3% stamped</strong> — the billing signature repeating downstream, because
        completers carry their stamps to the success page. The reuse is a feature: one
        find/replace tailors the entire commerce chain of the template. And for the second time,
        p75 came back identical across arms (2.684s both) — a payment-event delivery experiment
        <em> should</em> be invisible to page load, and twice now the widget has proven it is.
      </p>

      <h2 id="hardening">Build Hardening: Occupancy Asserts</h2>
      <p>
        Small process evolution worth keeping: after three tickets of slot-filling (and one
        accidental drag incident earlier in the epic), this build&rsquo;s script{" "}
        <em>asserted</em> every target slot was empty before placing — a rectangle-intersection
        check over all existing widget layouts, failing loudly instead of stacking silently.
        Layout mutations got safer exactly when the dashboard got crowded (52 widgets).
      </p>

      <h2 id="template-complete">The Finished Template</h2>
      <MermaidDiagram
        chart={templateCompleteDiagram}
        title="D+ Signup Monitoring Template — Final Structure"
        caption="Eight page sections in journey order, three flow-level sections with eight widgets each, one header contract on top. The cadence gap belongs to a teammate's ticket and inserts later."
        minHeight={520}
      />
      <p>
        Eight tickets, eight sections, five distinct anchor markets, seven example experiments
        (one reused thrice), every query validated against production before shipping. A team
        cloning this template gets launch-health monitoring for any signup experiment in the
        time it takes to find/replace one table.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Terminal pages need an arrival signal, not just views — <code>purchaseSuccess</code>{" "}
          separates conversions from revisits; funnels, not page widgets, carry flow identity.
        </li>
        <li>
          A deliberately missing widget with documented rejected-alternatives is a design
          decision; a silently missing one is a gap. Write the deviation down.
        </li>
        <li>
          Scan a page&rsquo;s full action list even when you know what you need — the TV
          activation desk on the success page is tomorrow&rsquo;s ticket answered today.
        </li>
        <li>
          Experiment-key reuse across sibling sections compounds: three sections, one
          find/replace, and coverage signatures that corroborate each other.
        </li>
        <li>
          Assert slot occupancy before placing widgets programmatically — cheap insurance that
          scales with dashboard crowding.
        </li>
        <li>
          A template is done when the journey reads top-to-bottom with no unexplained gaps —
          including the explained one (cadence) that belongs to someone else.
        </li>
      </ul>
    </div>
  );
}
