import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const passwordFlowDiagram = String.raw`flowchart TD
  A["/identity/sign-up/enter-email<br/>136k views/2d"] -->|"NEW email"| B["/identity/sign-up/create-password<br/>95k views/2d · THIS TICKET"]
  A -->|"EXISTING email"| C["/identity/login/enter-password 572k<br/>or /identity/login/passwordless 1.1M"]
  B -->|"registration call<br/>succeeds"| D["/commerce/plans<br/>839k views/2d"]
  B -->|"missing fields?"| E["/identity/sign-up/missing-info<br/>6.9k views/2d (conditional)"]
  D --> F["billing → success"]
  style A fill:#632ca6,color:#fff
  style B fill:#1a7f4b,color:#fff
  style C fill:#8a6d1a,color:#fff
  style D fill:#632ca6,color:#fff`;

const anchorDecisionDiagram = String.raw`flowchart TD
  S["Which market + experiment<br/>anchors the section?"] --> U["US? Top market (15.7%)"]
  S --> CA["Canada? 1.7% of traffic"]
  U --> UE["Experiments live in US:<br/>passwordless-login → ~100% one variant<br/>football bundle → facet not indexed"]
  UE --> UX["Control column would be<br/>permanently empty"]
  CA --> CE["wpnx-l4l-suf-canada-mvp:<br/>control 497 · T1 571 · T2 503"]
  CE --> WIN["Real 3-arm A/B —<br/>every column shows live data ✓"]
  UX -.->|"rejected"| WIN
  style WIN fill:#1a7f4b,color:#fff
  style UX fill:#8a6d1a,color:#fff`;

const signalChoiceDiagram = String.raw`flowchart LR
  P["User submits password form"] --> CK["Auto-captured click<br/>'click on Agree & Continue'<br/>named from RENDERED COPY"]
  P --> CA["Custom action<br/>'registration call successful<br/>in create-password'<br/>named IN CODE"]
  CK --> K1["EN 1,182 · FR 238<br/>one language per query"]
  CK --> K2["breaks silently when<br/>marketing rewords button"]
  CK --> K3["counts ATTEMPTS<br/>(failed validation included)"]
  CA --> A1["language-independent"]
  CA --> A2["survives copy changes"]
  CA --> A3["counts server-confirmed<br/>OUTCOMES"]
  style CA fill:#1a7f4b,color:#fff
  style CK fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Ticket & Where the Page Sits", level: 2 },
  { id: "the-flow", title: "The Flow: Two Password Pages, One Ticket", level: 2 },
  { id: "the-us-trap", title: "The False Zero: A Bucket-Truncation Trap", level: 2 },
  { id: "anchor-decision", title: "Why Canada Anchors Everything", level: 2 },
  { id: "widget-views", title: "Widget 1 — Views by Variant (Three Columns)", level: 2 },
  { id: "widget-registrations", title: "Widget 2 — Registrations: Custom Action Beats the Click", level: 2 },
  { id: "widget-funnel", title: "Widget 3 — Create Password → Plan Select Funnel", level: 2 },
  { id: "widget-errors", title: "Widget 4 — Noise-Filtered Error Table", level: 2 },
  { id: "widget-p75", title: "Widget 5 — p75 Load Time", level: 2 },
  { id: "widget-header", title: "Piece 7 — The Header Is a Contract", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PasswordScreenCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1133: adding the Password Screen section to the
        &ldquo;XD Experimentation | Monitoring Templates | D+ Signup&rdquo; dashboard. It is the
        third page section on that template, and it earned three lessons the first two did not
        teach: a query trap that produced a confidently wrong &ldquo;this page has zero US
        traffic&rdquo; claim, a constraint that binds the anchor market to the example experiment,
        and a progression signal that is strictly better than counting button clicks. Every number
        here was validated against live production RUM on build day (a 2-day window).
      </p>

      <h2 id="intro">The Ticket &amp; Where the Page Sits</h2>
      <p>
        The epic builds one monitoring template per product flow; each ticket adds one page of
        that flow. GREAT-1131 built the Email screen (section ①), GREAT-1132 built Subscriber
        Agreement Consent and restructured the dashboard into flow-level sections. GREAT-1133
        inserts the Password screen <em>between</em> them — in the user&rsquo;s journey the
        password page comes right after email — so the build began with a renumber: SA Consent
        became ③, Funnels ④, Errors ⑤, Performance ⑥. Section dividers are labels; moving them
        costs nothing, and journey order is what makes the dashboard readable.
      </p>
      <p>
        Seven pieces shipped: a section divider, two page widgets (views, registrations), one
        widget into each flow section (funnel, errors, p75), and a header update. Same
        apply-and-eyeball cadence as before: backup the dashboard, apply one piece at a time via
        the API, verify each in the UI before the next.
      </p>

      <h2 id="the-flow">The Flow: Two Password Pages, One Ticket</h2>
      <p>
        The first route candidate a search surfaces is{" "}
        <code>/identity/login/enter-password</code> at 572k views per 2 days — six times the
        traffic of the right answer. It is the <em>login</em> branch: existing users typing an
        existing password. The signup page where a <em>new</em> user creates one is{" "}
        <code>/identity/sign-up/create-password</code> (95k/2d). Same word, different flow,
        different ticket family. The email screen upstream is the fork: new emails continue into
        signup, existing emails divert to login (password or passwordless OTP).
      </p>
      <MermaidDiagram
        chart={passwordFlowDiagram}
        title="Where create-password Sits in the Signup Branch"
        caption="Only the green page belongs to this ticket. The login branch (amber) dwarfs it in traffic — a reminder that volume alone never identifies a route. Successful registration lands on /commerce/plans."
        minHeight={420}
      />
      <p>
        One more flow surprise: there is no <code>/identity/sign-up/dob</code> route, even though
        a Date of Birth ticket exists in the epic. The likely surface is{" "}
        <code>/identity/sign-up/missing-info</code> (6.9k/2d — conditional, shown only when
        fields are missing). That is the next ticket&rsquo;s research problem, but it was flow
        knowledge worth recording the moment it appeared.
      </p>

      <h2 id="the-us-trap">The False Zero: A Bucket-Truncation Trap</h2>
      <p>
        The first country-mix query for the page came back with Brazil on top and the United
        States <em>entirely absent</em> — which fit a tidy story, because the previous
        ticket&rsquo;s page genuinely has near-zero US traffic. The claim &ldquo;US never reaches
        create-password&rdquo; survived until a direct filtered count destroyed it:
      </p>
      <CodeBlock
        code={`# Aggregation with --limit 100, grouped by @geo.country:
#   → 100 buckets, sum = 68,716 ... but the route total is 95,176.
#   → 26k views missing. US and UK were both in the dropped mass.

# The direct question gives the truth:
@type:view @view.name:"/identity/sign-up/create-password"
  service:web-solo-commerce-disneyplus env:prod @geo.country:"United States"
# → 14,993 views/2d. Not zero. The TOP market (15.7%).`}
        lang="bash"
        filename="the-false-zero.txt"
      />
      <p>
        The mechanism: RUM aggregation buckets are <strong>not server-sorted</strong>. A low{" "}
        <code>--limit</code> returns an arbitrary subset, not the top N — so a missing bucket
        proves nothing. The tell was arithmetic, not intuition: the bucket sum did not match the
        route total. Re-run with <code>--limit 300</code> and the sum reconciled (95,200 ≈
        95,176), with US first and the UK — also silently dropped — third. Two rules fall out:
        always compare bucket-sum to total, and never conclude &ldquo;zero&rdquo; from a group-by
        — ask the direct filtered question.
      </p>

      <h2 id="anchor-decision">Why Canada Anchors Everything</h2>
      <p>
        Each page section anchors on one market so every widget describes the same population.
        With US confirmed as the top market, US was the natural anchor — until the example
        experiment search ran. The template needs a <em>live</em> experiment key so its variant
        columns show real data, and the candidates on this page told a short brutal story: the
        only experiment running in the US at meaningful scale was ~100% one variant (an empty
        Control column forever), and the one genuine two-treatment US candidate had no indexed
        facet — its variants appear in raw event samples but every aggregation returns nothing.
        Meanwhile Canada had <code>wpnx-l4l-suf-canada-mvp</code>: a real three-arm A/B with a
        live control.
      </p>
      <MermaidDiagram
        chart={anchorDecisionDiagram}
        title="The Anchor + Example-Experiment Decision"
        caption="A teaching template needs every column alive. Canada's 1.7% traffic share buys the one thing the US could not offer: a real control column."
        minHeight={420}
      />
      <p>
        Why not split the difference — US anchor for page metrics, Canada key for variant
        columns? Because the convention welds them together: every variant widget carries{" "}
        <em>both</em> filters in one query string,{" "}
        <code>@geo.country:&lt;anchor&gt;</code> <em>and</em>{" "}
        <code>@context.experiments.&lt;key&gt;.variantId</code>. A US filter on a Canada-only
        experiment intersects to zero rows. <strong>The anchor market and the experiment&rsquo;s
        market cannot differ.</strong> So Canada anchors the whole section — low volume
        (1,624 views/2d, ~800/day) accepted as the price of a real control column. Cloners swap
        in their own experiment&rsquo;s market anyway; the template&rsquo;s job is to demonstrate
        living queries.
      </p>

      <h2 id="widget-views">Widget 1 — Views by Variant (Three Columns)</h2>
      <p>
        Same baseline-traffic table as the previous sections, with one structural difference:
        this experiment has three arms, so the table has three hand-written query columns —
        Control and two treatments. Columns are manual by design; fixed columns with human
        aliases read like a report, where a group-by would produce machine labels and a giant
        N/A row.
      </p>
      <CodeBlock
        code={`@type:view @view.name:"/identity/sign-up/create-password"
  service:web-solo-commerce-disneyplus @geo.country:"Canada" env:prod
  @context.experiments.wpnx-l4l-suf-canada-mvp.variantId:control

# Three columns, validated on build day (2d window):
#   control                                   497
#   l4l-on-only-standalone-standard-premium   571   (alias: L4L Only Std+Premium (T1))
#   l4l-on-all-standalone-tiers               503   (alias: L4L All Tiers (T2))`}
        lang="bash"
        filename="views-by-variant.query"
      />
      <p>
        A near-even three-way split is itself a health signal: if one arm&rsquo;s share drifts,
        assignment is broken before any product metric matters. One operational caveat surfaced
        during eyeballing: at ~800 views/day, short dashboard windows (past 15 minutes, past
        hour) legitimately render dashes and single digits. The section reads best at a 2-day
        window — low-volume anchors make the time selector part of the reading instructions.
      </p>

      <h2 id="widget-registrations">Widget 2 — Registrations: Custom Action Beats the Click</h2>
      <p>
        The previous section&rsquo;s &ldquo;did users progress?&rdquo; widget counts a button
        click — and because Datadog&rsquo;s browser SDK names auto-captured clicks after the{" "}
        <em>rendered button text</em>, that widget is welded to one language&rsquo;s copy. The
        password page offered something better: the signup code emits a custom RUM action, by
        name, from code, at the exact moment the registration API call returns success.
      </p>
      <MermaidDiagram
        chart={signalChoiceDiagram}
        title="Two Ways to Measure the Same Submit"
        caption="The auto-captured click is named from whatever copy the button renders; the custom action is named in code. On a page that has both, the custom action wins on every axis."
        minHeight={400}
      />
      <CodeBlock
        code={`@type:action @action.name:"registration call successful in create-password"
  @view.name:"/identity/sign-up/create-password"
  service:web-solo-commerce-disneyplus @geo.country:"Canada" env:prod
  @context.experiments.wpnx-l4l-suf-canada-mvp.variantId:control

# Validated: control 222 · T1 250 · T2 220  (2d)
# The click alternative splits by language: "Agree & Continue" 1,182 (EN)
# + "Accepter et continuer" 238 (FR) — and counts attempts, not outcomes.`}
        lang="bash"
        filename="registrations-by-variant.query"
      />
      <p>
        The widget is titled &ldquo;Registrations by Variant (server-confirmed account
        creation)&rdquo; — the parenthetical is deliberate. Template titles carry the mechanism
        so a cloner knows what the number <em>is</em> without opening the query editor, and here
        it also marks the intentional deviation from the sibling section&rsquo;s click-based
        widget. The rule of thumb this page established: prefer a custom code-emitted action
        when the page has one; fall back to localized click capture only when it doesn&rsquo;t.
      </p>

      <h2 id="widget-funnel">Widget 3 — Create Password → Plan Select Funnel</h2>
      <p>
        The Funnels section is flow-level: route-only funnels, no variant filter, one per journey
        edge. Section ① already owns Enter Email → Create Password, so this ticket adds the next
        edge: sessions that viewed create-password and later reached{" "}
        <code>/commerce/plans</code>. It stays US-filtered for continuity with the funnel above
        it — funnels have no experiment key, so the anchor-welding constraint does not apply.
      </p>
      <CodeBlock
        code={`{
  "request_type": "funnel",
  "query": {
    "data_source": "rum",
    "query_string": "env:prod service:web-solo-commerce-disneyplus @geo.country:\\"United States\\"",
    "steps": [
      { "facet": "@view.name", "value": "/identity/sign-up/create-password" },
      { "facet": "@view.name", "value": "/commerce/plans" }
    ]
  }
}
// Leg volumes validated: 14,993 → 77,639 views/2d (US).
// The target is bigger than the source: /commerce/plans serves many flows,
// not just fresh signups — the funnel only counts sessions that did A then B.`}
        lang="json"
        filename="password-to-plans.funnel.json"
      />
      <p>
        The funnel is the silent-breakage detector: a broken submit handler usually throws no
        error and leaves views looking normal. Only this widget craters.
      </p>

      <h2 id="widget-errors">Widget 4 — Noise-Filtered Error Table</h2>
      <p>
        Straight clone of the sibling sections&rsquo; shape: top-10{" "}
        <code>@error.message</code> values, one count column per variant, with the identity-page
        noise filter <code>@error.source:(custom OR report OR console)</code>. One magnitude
        caveat worth recording: this page runs hot — roughly 3.2–3.8k errors per arm per 2 days
        against ~500 views per arm. Console noise on identity pages inflates totals; the
        widget&rsquo;s job is the <em>ranking</em> (which message dominates, does one variant
        own it), not the absolute count. A treatment-only error message at the top of its column
        is the actionable signal.
      </p>

      <h2 id="widget-p75">Widget 5 — p75 Load Time</h2>
      <p>
        The performance guard: <code>pc75</code> aggregation over{" "}
        <code>@view.loading_time</code>, one column per arm. Validated at 1.09s (control), 0.99s
        (T1), 1.16s (T2) — remember RUM stores loading time in <strong>nanoseconds</strong>, so
        raw query results read as ~10⁹ before the widget formats them. p75 rather than average
        because a slow treatment hurts the tail first; a regression here that tracks one variant
        is the treatment paying a performance tax.
      </p>

      <h2 id="widget-header">Piece 7 — The Header Is a Contract</h2>
      <p>
        The header note is the template&rsquo;s API: a find/replace table of example experiment
        keys, variants, and region scopes. Adding a section means extending that contract — the
        table gained a Password column (three real variant IDs, Canada scope), every renumbered
        section reference got fixed (a header pointing at &ldquo;② Subscriber Agreement&rdquo;
        after the insert would lie), and the localized-click caveat gained one clause noting that
        this section&rsquo;s registrations use a code-emitted action and carry no localization
        concern. What deliberately stayed out: the click-vs-custom-action rule of thumb itself —
        standard instrumentation practice does not belong in a dashboard header. Headers stay
        lean; the case study is where the reasoning lives.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Aggregation buckets are not server-sorted: a missing bucket proves nothing. Check
          bucket-sum against the total, and settle any &ldquo;zero traffic&rdquo; hypothesis with
          a direct filtered count — the false &ldquo;US never sees this page&rdquo; claim died in
          one query.
        </li>
        <li>
          The anchor market and the example experiment&rsquo;s market cannot differ — variant
          widgets carry both filters in one query, and the intersection of a US filter with a
          Canada-only experiment is zero rows.
        </li>
        <li>
          A real control column is worth more than traffic volume in a teaching template: Canada
          at ~800 views/day beat the US at 15.7% share because all three columns show live data.
        </li>
        <li>
          Prefer a custom code-emitted action over auto-captured clicks when the page has one:
          language-independent, copy-change-proof, and it counts server-confirmed outcomes, not
          attempts.
        </li>
        <li>
          Verify the route in code and data before building — the obvious password page
          (<code>/identity/login/enter-password</code>, 6× the traffic) belongs to a different
          flow entirely.
        </li>
        <li>
          Low-volume anchors make the time selector part of the widget&rsquo;s reading
          instructions: dashes at a 15-minute window are arithmetic, not breakage.
        </li>
      </ul>
    </div>
  );
}
