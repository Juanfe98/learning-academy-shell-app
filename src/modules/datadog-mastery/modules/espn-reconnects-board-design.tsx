import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const flowDiagram = String.raw`flowchart TD
  A["/commerce/account<br/>325 clicks/30d · 52%"] --> C
  SUB["/commerce/subscription<br/>189 clicks/30d · 30%<br/>(ESPN-only entry — Hulu has no equivalent)"] --> C
  CS["/commerce/cancel/success<br/>116 clicks/30d · 18%"] --> C
  C["/commerce/restart-subscription/confirm<br/>684 views/30d · p75 1.26s<br/>Mystique gate: wpnx-restart-pending-cancel (ON)"]
  C -->|"click Agree & Subscribe (328 EN + 10 ES)<br/>POST /execution/v2/subscription/restart · 217"| S["/commerce/restart-subscription/success<br/>381 views/30d · p75 0.97s"]
  C -->|"click Go Back (144)"| OUT["(back to account)"]
  WB["/commerce/welcome-back<br/>0 views/30d — flag off everywhere,<br/>espn dictionary missing all WB copy keys"] ~~~ C
  style C fill:#632ca6,color:#fff
  style S fill:#1a7f4b,color:#fff
  style WB fill:#8a1a1a,color:#fff
  style OUT fill:#8a6d1a,color:#fff`;

const boardStructureDiagram = String.raw`flowchart TD
  H["Header note — find/replace contract<br/>example key · WeaponX nested facet doc<br/>scope (why restart, not WB) · 30d volume warning"] --> S1
  S1["① Entry — 1 table<br/>Restart clicks by source page & variant"] --> S2
  S2["② Confirm — 4 tables<br/>views · CTA choice · commit rate · client errors"] --> S3
  S3["③ Success — 2 tables<br/>views · completion rate (success ÷ confirm)"] --> S4
  S4["④ Funnels — 3 funnels (RESOLVED)<br/>Account → Confirm → Success<br/>Subscription branch · Cancel-Success branch"] --> S5
  S5["⑤ Errors & DQ — 4 tables<br/>error-page renders · by owner ·<br/>top errors (excl. missing-cypher) · missing copy keys"] --> S6
  S6["⑥ Coverage — 2 tables<br/>by country (US-only note) · by device"] --> S7
  S7["⑦ Performance — 2 tables<br/>confirm p75 · success p75"]
  style H fill:#0b5394,color:#fff
  style S4 fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "A Board for a Page That Doesn't Exist", level: 2 },
  { id: "flow", title: "The Flow We Monitor Instead", level: 2 },
  { id: "recon", title: "Recon Numbers the Widgets Stand On", level: 2 },
  { id: "structure", title: "The Seven-Section Plan (Review This)", level: 2 },
  { id: "conventions", title: "Family Conventions Applied", level: 2 },
  { id: "deviations", title: "Where ESPN Deviates from the Hulu Board", level: 2 },
  { id: "review-notes", title: "Review Clarifications — Reading the Board Correctly", level: 2 },
  { id: "open-items", title: "Open Items & Build Status", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnReconnectsBoardDesign() {
  return (
    <div className="article-content">
      <p>
        This is the design record of GREAT-1156: the ESPN Welcome Back/Reconnects monitoring
        template (<code>3jx-75k-inx</code>) — the third reconnect board in the family after D+
        Welcome Back (<code>59t-fc7-s3c</code>) and Hulu Restart (<code>vdn-8fd-4p5</code>).
        Like the Hulu ticket before it, this one began with a discovery: the page in the board
        title does not exist in production.
      </p>

      <h2 id="intro">A Board for a Page That Doesn&rsquo;t Exist</h2>
      <p>
        ESPN has a <code>/commerce/welcome-back</code> page — the <em>same</em> shared
        component D+ serves 1.65M views/30d on — deployed to every ESPN prod server. But its
        route gate (<code>enableCommerceUnifiedWelcomeBack</code>, remote config) is off in
        every environment: browser-verified 404 on stage <em>and</em> prod, zero RUM views in
        30 days across all envs. And it could not simply be switched on: the espn tenant&rsquo;s
        <code>unified-commerce-onboarding</code> dictionary is missing all four core WB copy
        keys, and Flex&rsquo;s <code>reacquisition</code> screen has no ESPN handling or tests.
        A welcome-back launch would arrive as a real project — with its own board moment.
        Monitoring the dark page today would mean a template no query can validate.
      </p>
      <p>
        The precedent is exact: Hulu&rsquo;s board pivoted to the <strong>restart-subscription
        flow</strong> (the pending-cancel undo) for the same reason, with the reporter&rsquo;s
        sign-off. This board assumes the same pivot — pending scope confirmation.
      </p>

      <h2 id="flow">The Flow We Monitor Instead</h2>
      <p>
        Restart-subscription is ESPN&rsquo;s only living reconnect surface: a two-page flow
        (confirm → success) for still-entitled users who cancelled and changed their minds.
        Unlike welcome-back it has <em>no route flag</em> — only a login gate and a
        component-level Mystique flag (<code>wpnx-restart-pending-cancel</code>, live in prod).
        Flex serves it via <code>restartLedger</code>, which has first-class ESPN support
        (ESPN Adobe analytics, <code>isPartnerESPN</code> branches) but sits in{" "}
        <code>migrating</code> platform status — future screen changes touch legacy and
        platform both.
      </p>
      <MermaidDiagram
        chart={flowDiagram}
        title="ESPN Restart Flow — Entries, Gate, Commit, and the Dark Neighbor"
        caption="Three entry pages feed confirm; the commit truth is the execution POST, not the button copy. Welcome-back sits dark beside the flow it was named after."
        minHeight={520}
      />

      <h2 id="recon">Recon Numbers the Widgets Stand On</h2>
      <p>
        All numbers <code>env:prod</code>, 30d (queried 2026-09-09) — non-prod is 57% of
        restart-page traffic, so every widget query carries the env filter. Confirm{" "}
        <strong>684</strong> views · success <strong>381</strong> · commit POSTs{" "}
        <strong>217</strong> · &ldquo;Agree &amp; Subscribe&rdquo; clicks 328 EN + 10 ES ·
        &ldquo;Go Back&rdquo; 144. Experiment stamping is the board&rsquo;s best asset:{" "}
        <strong>93.6% of confirm views</strong> carry the experiments map (vs 38.6% on ESPN
        signup), and the wired example key — <code>wpnx-ESPN-Generic-Entry-Plan-Order</code>,
        the same key the ESPN Signup and Retention templates use — splits commit clicks
        105/102/101 across its three arms. Volume is the board&rsquo;s main constraint: ~23
        confirm views/day is 25% of Hulu&rsquo;s flow, so the header mandates 30-day windows
        and calls rates directional.
      </p>

      <h2 id="structure">The Seven-Section Plan (Review This)</h2>
      <p>
        The structure mirrors the Hulu board&rsquo;s seven sections — 8 notes, ~15 query
        tables, 2–3 funnels, one group. Per section: <strong>①&nbsp;Entry</strong> — restart
        clicks by source page &amp; variant (explicit CTA only; banner-copy clicks excluded).
        <strong> ②&nbsp;Confirm</strong> — views by variant · CTA choice by variant · commit
        rate (<em>restart executions ÷ ledger fetches</em>, structural) · noise-filtered client
        errors by variant. <strong>③&nbsp;Success</strong> — views by variant · completion
        rate (success ÷ confirm views, labeled directional). <strong>④&nbsp;Funnels</strong> —
        three: Account → Confirm → Success, the Subscription branch (<em>reviewer decision:</em>{" "}
        <code>/commerce/subscription</code> carries 30% of entries, an ESPN-only source that
        earns its own funnel), and the Cancel-Success branch. <strong>⑤&nbsp;Errors &amp; DQ</strong> — error-page renders · errors
        by owner · top client errors <em>excluding</em> missing-cypher · a dedicated
        missing-copy-keys tracker (quarantine pattern). <strong>⑥&nbsp;Coverage</strong> —
        views by country (ESPN is US-only; the note says so instead of pretending regions) ·
        views by device. <strong>⑦&nbsp;Performance</strong> — p75 vitals per page by variant.
      </p>
      <MermaidDiagram
        chart={boardStructureDiagram}
        title="Board Anatomy — Seven Sections in One Group"
        caption="Same skeleton as Hulu vdn-8fd-4p5. The amber section carried the one open design question — resolved in review: three funnels."
        minHeight={560}
      />

      <h2 id="conventions">Family Conventions Applied</h2>
      <p>
        ESPN family styling: <code>vivid_blue</code> group, <strong>white</strong> header note
        (vs D+ blue, Hulu green). The header carries the find/replace tailoring contract — the
        example key is wired in <em>only so widgets render</em>, and the header says so.
        Variant columns are per-variant queries with formula aliases, never a{" "}
        <code>group_by</code> on the experiment facet. ESPN is WeaponX-only — all 19 experiment keys observed on restart events are{" "}
        <code>wpnx-*</code> with the nested <code>.variantId</code> facet, so the header
        documents that one form and (reviewer catch) drops the Hulu template&rsquo;s
        Spearmint-flat alternative, which has no ESPN use.
        Widget queries follow the family checklist: <code>env:prod</code> everywhere, noise
        filters for custom actions, alphabetical-bucket limits at 300 for name group-bys.
      </p>
      <p>
        <strong>⑦ Performance came from the ESPN Retention board, not Hulu&rsquo;s</strong> —
        a pre-build comparison caught three differences in Natalya&rsquo;s ESPN p75 pattern,
        all adopted: <strong>INP</strong> (interaction-to-next-paint) instead of Hulu&rsquo;s
        deprecated FID column, <strong>frustration at pc75</strong> instead of avg, and{" "}
        <strong>no application-id filter</strong> (service + view name suffice). Her widgets
        even group by the same example key with the N/A row kept — checking the closest
        brand sibling before cloning paid for itself.
      </p>
      <CodeBlock
        code={`# Entry table, control column (validated live before push):
@type:action env:prod service:web-solo-commerce-espn
  @action.target.name:"Restart Subscription"
  @context.experiments.wpnx-ESPN-Generic-Entry-Plan-Order.variantId:control
  → group_by @view.url_path
# account 95 · subscription 71 · cancel/success 52

# Commit truth (copy-matched CTA misses Spanish clicks — ~3%):
@type:resource env:prod service:web-solo-commerce-espn
  @resource.url_path:/execution/v2/subscription/restart   # 217/30d, all from confirm`}
        lang="bash"
        filename="espn-restart-queries.excerpt"
      />

      <h2 id="deviations">Where ESPN Deviates from the Hulu Board</h2>
      <p>
        Five deliberate differences, each evidence-backed. (1) A third entry source:{" "}
        <code>/commerce/subscription</code> — Hulu&rsquo;s board has two. (2) <em>No pause
        anywhere</em>: ESPN pause pages have zero prod views, so Hulu&rsquo;s account-button
        unpause-mixing caveat does not apply and no pause annotation is needed. (3) No
        churn-date guardrail — that data-quality widget was Hulu-specific and lives on the
        Retention board. (4) The commit CTA has localized copies (&ldquo;Aceptar y
        suscribirse&rdquo;) — the board leans on the structural POST as commit truth, harder
        than Hulu did. (5) Success views (381) exceed commit POSTs (217) — reload/back-nav
        inflation, so completion widgets are labeled directional and the funnel treats views
        as steps, POSTs as conversions.
      </p>

      <h2 id="review-notes">Review Clarifications — Reading the Board Correctly</h2>
      <p>
        Questions raised (and decisions made) during the section-by-section build review,
        recorded per board step so the reasoning survives past the chat that produced it.
      </p>

      <h3>Header — why the low-volume warning earns its exact numbers</h3>
      <p>Every widget splits by 3 experiment arms, so window size decides how much a cell can be trusted:</p>
      <table>
        <thead>
          <tr><th>Window</th><th>Events per arm (confirm)</th><th>What chance alone can do</th></tr>
        </thead>
        <tbody>
          <tr><td>1 week</td><td>~53 views · ~30 successes</td><td>±16% swings with <em>zero</em> real change; rates carry ±13 percentage points</td></tr>
          <tr><td>30 days</td><td>~230 views</td><td>still directional — ②&rsquo;s commit rate reads 49.1 / 57.5 / 41.1 on an almost-certainly-neutral experiment</td></tr>
        </tbody>
      </table>
      <ul>
        <li><strong>Why the note exists:</strong> tables render identically whether cells hold 40 events or 40,000, and the reader owns the time picker — the note is the only guard against a day-3 panic-rollback over a meaningless 20-point gap.</li>
        <li><strong>Decision — kept as-is:</strong> the GREAT-1155 stale-absolutes lesson applies to decorative stats; these numbers are load-bearing — they justify the reading rule.</li>
      </ul>

      <h3>② Commit rate — copy-matched vs structural counting</h3>
      <table>
        <thead>
          <tr><th>Counting method</th><th>How it works</th><th>Failure mode</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Copy-matched</strong> (clicks)</td>
            <td>RUM names actions from rendered text: <code>click on Agree &amp; Subscribe</code></td>
            <td>Spanish users click <em>&ldquo;Aceptar y suscribirse&rdquo;</em> → different action name → ~3% of commits silently dropped; a copy test renaming the button would fake a treatment-arm collapse</td>
          </tr>
          <tr>
            <td><strong>Structural</strong> (resource)</td>
            <td><code>POST /execution/v2/subscription/restart</code> fires exactly once per real restart</td>
            <td>immune to language, copy variants, and experiment arms</td>
          </tr>
        </tbody>
      </table>
      <p>
        Division of labor: the CTA Choice table counts clicks by text <em>on purpose</em> —
        its job is showing what users clicked (Spanish rows are signal). The Commit Rate
        widget counts <em>conversions</em>, where copy-dependence is a bug.
      </p>
      <CodeBlock
        code={`                 restart executions (POST /execution/v2/subscription/restart)   = 217/30d
Commit Rate = ------------------------------------------------------------------ ≈ 49%
                 ledger fetches (GET /screens/v1/…/restart-subscription-ledger)   = 447/30d`}
        lang="bash"
        filename="commit-rate.anatomy"
      />
      <ul>
        <li>
          <strong>&ldquo;Sampling applies equally to numerator &amp; denominator&rdquo;:</strong>{" "}
          RUM may not capture 100% of resource events, so the absolutes (217, 447) can
          undercount reality — but both sides shrink by the same factor and it cancels in
          the division. Count every 10th shopper at the door and every 10th at the
          register: both counts are 10× low, the conversion rate is exactly right.
        </li>
        <li>
          <strong>Corollary — never cross-compare event families:</strong> 217 commit POSTs
          vs 328 Agree-clicks vs 381 success views &ldquo;disagree&rdquo; because resources,
          actions, and views are collected differently — not because the board is broken.
          Every ratio widget keeps numerator and denominator in one family.
        </li>
      </ul>

      <h3>② Errors table — MISSING_CYPHER stays (reviewer decision)</h3>
      <ul>
        <li><strong>What:</strong> the cypher row (145/166/235) dominates the table — but these are real user-facing defects (silent copy fallbacks, missing a11y labels), not synthetic noise.</li>
        <li><strong>Decision — keep it:</strong> an errors table that hides the page&rsquo;s most frequent error misrepresents page health; grouping keeps it to one row.</li>
        <li><strong>Pattern — show everything, organize instead of hiding:</strong> ⑤ quarantines it only from the cross-page top-errors table (where it would drown other signal) and gives it a dedicated tracker.</li>
      </ul>

      <h3>② CTA table — the blank row (kept unfiltered)</h3>
      <ul>
        <li><strong>What it is:</strong> real clicks on elements with no accessible text (icons, SVGs, images, overlays) — RUM records bare <code>click</code> with <code>target.name: ""</code>. Verified by sampling: 34 stamped of 35 raw, one carrying a <code>dead_click</code> frustration signal.</li>
        <li><strong>Why the widget can&rsquo;t drop it:</strong> exclude-missing skips <em>missing</em> facets; this one is present-but-empty.</li>
        <li><strong>Why it stays:</strong> the row doubles as an accessibility smell (elements without accessible names), and growth after a release means someone shipped a new unlabeled interactive element. A visible row costs nothing; a silently filtered one can&rsquo;t warn you.</li>
      </ul>

      <h3>③ Completion rate — &ldquo;directional,&rdquo; and why ② is the truth</h3>
      <p>
        Completion divides success <em>views</em> by confirm <em>views</em> — and a view
        fires on <em>every render</em>, not once per conversion: commit → view #1, refresh
        → #2, back-button → #3. One restart, three success views. That is how the page
        collects 381 views for 217 actual commits (<strong>~+75%</strong>; Hulu&rsquo;s
        equivalent inflation is only ~12%, so ESPN&rsquo;s note states the starker number).
      </p>
      <ul>
        <li><strong>Use it for:</strong> rough arm comparison and breakage detection — cratering success views mean something real.</li>
        <li><strong>Don&rsquo;t use it for:</strong> quoting a true conversion figure — that is ②&rsquo;s commit rate; a user can refresh the success page all day and never produce a second POST.</li>
        <li><strong>Why it stays on the board:</strong> funnels speak view-sequences and views are the most universally collected telemetry — a permanently-on directional gauge is valuable <em>as long as it is labeled</em>.</li>
      </ul>

      <h3>④ Funnels — what the three branches actually are</h3>
      <p>Three <em>doors</em> into the same two-page flow, each behind a different user situation:</p>
      <table>
        <thead>
          <tr><th>Door</th><th>Page</th><th>User situation</th><th>Entry share</th><th>→ Confirm</th><th>→ Success</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Account</strong><br />&ldquo;wandered back&rdquo;</td>
            <td><code>/commerce/account</code></td>
            <td>returns days/weeks after cancelling; the Restart button is an ambient offer among account chores</td>
            <td>52%</td>
            <td>0.3% (of 164K sessions — almost none eligible)</td>
            <td>66%</td>
          </tr>
          <tr>
            <td><strong>Subscription</strong><br />&ldquo;came to look at my plan&rdquo;</td>
            <td><code>/commerce/subscription</code></td>
            <td>deliberately examining the plan — pre-existing intent; ESPN-only entry, no Hulu equivalent</td>
            <td>30%</td>
            <td>0.9% (3× the account rate)</td>
            <td>58%</td>
          </tr>
          <tr>
            <td><strong>Cancel-Success</strong><br />&ldquo;instant regret&rdquo;</td>
            <td><code>/commerce/cancel/success</code></td>
            <td>&ldquo;Changed your mind?&rdquo; banner seconds after cancelling — a same-session save attempt, not a return visit</td>
            <td>18%</td>
            <td>0.8%</td>
            <td>53%</td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li><strong>Why separate funnels:</strong> experiments and regressions hit doors asymmetrically — a banner copy test moves only the cancel branch; a silently removed subscription-page button would dent the combined number ~30% with no visible cause. The split points at the quiet door.</li>
        <li><strong>Session-scoped, not adjacent-navigation:</strong> a session touching account and <em>later</em> confirm counts, and one session can appear in multiple funnels — which is why the confirm-step counts sum past the page&rsquo;s view total.</li>
        <li><strong>Tiny first steps are expected:</strong> entry pages serve all traffic; only the pending-cancel sliver is eligible to restart.</li>
        <li><strong>Bonus observation:</strong> post-confirm completion differs by door (66 · 58 · 53%) — instant-regret users complete slightly less often once they see the price.</li>
      </ul>

      <h2 id="open-items">Open Items &amp; Build Status</h2>
      <p>
        <strong>Build complete (2026-09-10):</strong> all seven sections live on{" "}
        <code>3jx-75k-inx</code> — 26 widgets (8 notes · 15 query tables · 3 funnels), every
        section approved individually in review, every query validated against live data
        before push. ⑤ ships the missing-copy tracker grouped by <em>key</em> (an ESPN
        adaptation — the table doubles as the escalation package and shows the even-across-arms
        signature of a pre-existing defect). <strong>Self-review pass (datadog-review
        skill) done:</strong> verdict ship-after-one-Should — the ① entry filter was
        undercounting Spanish restart CTAs (<em>Reactivar/Reiniciar suscripción</em>, 25
        clicks/30d invisible behind the English literal; the same trap ② was explicitly
        designed around). Fixed by extending the literal set; the ⑥ country title also
        dropped a Hulu-inherited Puerto Rico mention (PR&rsquo;s 9 views are 100%
        unassigned, so the row never renders). Open items carried to the review thread:
        scope confirmation with the reporter (on vacation — the WB-is-dark evidence chain is
        ready for her return); a live cypher bug found during recon (1,773
        missing-copy-key errors/30d on restart pages, top keys an accessibility label and a
        link target — escalation candidate alongside the ESPN billing cypher bug). The ④
        funnel-count question is resolved: three funnels, subscription branch included.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Verify the page before the board: ESPN welcome-back is deployed code behind an off
          flag with missing copy and no backend support — a board for it would be
          unvalidatable. Recon killed the assumption in a day.
        </li>
        <li>
          Precedent transfers: the Hulu pivot (WB → restart) reapplied cleanly, and the
          seven-section skeleton carried over with only evidence-backed deviations.
        </li>
        <li>
          The example key is a family asset: <code>wpnx-ESPN-Generic-Entry-Plan-Order</code>{" "}
          now wires three ESPN templates — one find/replace teaches all of them.
        </li>
        <li>
          Copy-matched CTAs undercount in localized products — structural resources (the
          execution POST) are the commit truth.
        </li>
        <li>
          Low volume is a design input, not a footnote: 30-day windows and
          &ldquo;directional&rdquo; labels are written into the header, not left for the
          reader to discover.
        </li>
        <li>
          Recon keeps paying beyond the board: it surfaced a live accessibility-impacting
          cypher bug nobody was looking for.
        </li>
      </ul>
    </div>
  );
}
