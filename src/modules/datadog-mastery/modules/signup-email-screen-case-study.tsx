import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const signupFlowDiagram = String.raw`flowchart TD
  A["/identity/sign-up/enter-email<br/>~71k views/day"] -->|"NEW email"| B["/identity/sign-up/create-password<br/>~50k views/day"]
  A -->|"EXISTING email<br/>(account found)"| C["/identity/login/enter-passcode<br/>passwordless OTP · ~111k sessions/day"]
  A -->|"abandon"| D["(exit)"]
  B --> E["/identity/subscriber-agreement<br/>(regional)"]
  E --> F["/commerce/plans → billing → success"]
  style A fill:#632ca6,color:#fff
  style B fill:#1a7f4b,color:#fff
  style C fill:#8a6d1a,color:#fff`;

const triangulationDiagram = String.raw`flowchart LR
  V["Views by Variant<br/>'arrived'"] --> M["Modal Accepts<br/>'actively tried'"]
  M --> F["Progression Funnel<br/>'succeeded'"]
  V -.->|"drops alone →<br/>upstream traffic problem"| DX["Diagnosis"]
  M -.->|"drops while views normal →<br/>UI broken before confirm"| DX
  F -.->|"drops while accepts normal →<br/>backend broken after confirm"| DX
  style DX fill:#632ca6,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Ticket & The Template Model", level: 2 },
  { id: "the-flow", title: "The Signup Flow (and Its Hidden Branch)", level: 2 },
  { id: "widget-views", title: "Widget 1 — Views by Variant", level: 2 },
  { id: "widget-funnel", title: "Widget 2 — Signup Progression Funnel", level: 2 },
  { id: "widget-errors", title: "Widget 3 — Noise-Filtered Error Table", level: 2 },
  { id: "widget-modal", title: "Widget 4 — Modal Accepts (Triangulation)", level: 2 },
  { id: "widget-p75", title: "Widget 5 — p75 Load Time", level: 2 },
  { id: "design-decisions", title: "The Three Design Decisions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SignupEmailScreenCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1131: building the Email Screen section of the
        &ldquo;XD Experimentation | Monitoring Templates | D+ Signup&rdquo; dashboard, widget by
        widget, with every query validated against live production RUM data before it shipped.
        Everything here was measured on real traffic — the numbers are from the day the section
        was built.
      </p>

      <h2 id="intro">The Ticket &amp; The Template Model</h2>
      <p>
        The epic (GREAT-1129) builds one reusable monitoring <strong>template per product flow</strong> —
        Signup, Retention, Welcome Back, Account Management. A template is a master copy: it is
        never used directly to monitor an experiment. When a team launches one, they{" "}
        <strong>clone</strong> the flow&rsquo;s template, replace three fields declared in its header
        note (experiment key, variants, region scope), and find/replace the experiment key in every
        widget query. Ten minutes later they have a launch-health dashboard covering every page of
        the flow, split by variant.
      </p>
      <p>
        The variant split works because every RUM event carries the user&rsquo;s experiment
        assignments as an attribute. One facet powers the whole template:
      </p>
      <CodeBlock
        code={`@context.experiments.<EXPERIMENT-KEY>.variantId:<variant>

# Example — the live experiment used as the template's working example:
@context.experiments.wpnx-web-identity-email-error-reduction.variantId:ON`}
        lang="bash"
        filename="the-variant-facet.txt"
      />
      <p>
        The template intentionally uses a <em>real, live</em> experiment as its example rather than
        a <code>YOUR-KEY-HERE</code> placeholder: a template whose example is dead shows zeros
        everywhere, and nobody can tell &ldquo;working&rdquo; from &ldquo;broken&rdquo;. The chosen
        example is a rollout at 100% ON, so the Control column legitimately reads empty — the header
        carries the standard caveat for exactly this situation.
      </p>

      <h2 id="the-flow">The Signup Flow (and Its Hidden Branch)</h2>
      <p>
        The section&rsquo;s page is <code>/identity/sign-up/enter-email</code> (~71k views/day US).
        Finding that route was itself a lesson: the obvious candidate{" "}
        <code>/identity/begin</code> carries 901k views/day — but the code proved it renders{" "}
        <code>LicensePlateBeginPage</code>, the TV-activation code entry. Wrong page, plausible
        traffic. Verify routes in code <em>and</em> data before building widgets on them.
      </p>
      <MermaidDiagram
        chart={signupFlowDiagram}
        title="Email Screen Branching"
        caption="Enter-email has three exits. Only the new-account branch counts as signup progression — existing emails divert to the login flow (where a passwordless experiment serves an OTP passcode page)."
        minHeight={420}
      />
      <p>
        The branch matters for reading every number downstream: a large share of emails typed into
        the signup page belong to <em>existing</em> accounts (D+ is a mature product — the login
        flow is roughly 7× the size of new signups). Those sessions divert to login and correctly
        do <strong>not</strong> count as signup progression.
      </p>

      <h2 id="widget-views">Widget 1 — Views by Variant</h2>
      <p>
        The baseline traffic widget: a two-column table, one hand-written query per variant, aliased
        to human names. It counts <strong>page views</strong>, not unique users — a reload counts
        twice. Its monitoring job: a traffic drop in one variant that the other doesn&rsquo;t show
        means the treatment is breaking page delivery.
      </p>
      <CodeBlock
        code={`@type:view @view.name:"/identity/sign-up/enter-email"
  service:web-solo-commerce-disneyplus
  @geo.country:"United States" env:prod
  @context.experiments.wpnx-web-identity-email-error-reduction.variantId:ON

# Validated before shipping: 16,145 views/day (US). Control leg: 0 (rollout at 100% ON).`}
        lang="bash"
        filename="views-by-variant.query"
      />
      <p>
        Columns are <em>not</em> automatic: a third variant means the cloner adds a third query +
        alias by hand. The alternative — group-by on the variantId facet — is zero-maintenance but
        produces raw machine labels, count-based ordering that reshuffles daily, and a giant
        &ldquo;N/A&rdquo; row for every user not in the experiment. Fixed columns read like a
        report; that is why the donor templates chose them.
      </p>

      <h2 id="widget-funnel">Widget 2 — Signup Progression Funnel</h2>
      <p>
        The crown jewel: sessions that viewed enter-email and <em>later, in the same session</em>,
        viewed <code>create-password</code>. It measures whether the page did its <strong>job</strong> —
        and it catches <em>silent breakage</em>: a dead Continue button often throws no error and
        leaves views looking normal. Only the funnel craters.
      </p>
      <p>
        The live end-to-end conversion reads ~12.3%, and understanding why it is &ldquo;low&rdquo;
        is the real lesson. Three progressively stricter metrics tell three different stories:
      </p>
      <CodeBlock
        code={`View ratio        (raw page loads)                ~50%
Session ratio     (unique sessions per page)      ~42%   // 15,197 → 6,338
Funnel e2e        (ordered, same-session)         12.3%

// The gap = existing-account diverts to login (the branch!)
//         + same-session strictness (cross-device signups don't count)
//         + genuine abandonment (typos, second thoughts)`}
        lang="bash"
        filename="conversion-ladder.txt"
      />
      <p>
        The absolute baseline is <em>not</em> the metric to judge — the <strong>delta between
        variant legs</strong> is. Control 12.3% vs Treatment 8% = rollback; vs 14% = winner. Nobody
        should &ldquo;fix&rdquo; a funnel to look higher: that just moves the baseline and obscures
        deltas. The widget title says &ldquo;(new accounts)&rdquo; precisely so nobody misreads the
        branch-related loss as failure.
      </p>

      <h2 id="widget-errors">Widget 3 — Noise-Filtered Error Table</h2>
      <p>
        Top-10 error messages grouped by <code>@error.message</code>, per variant column. The load-bearing
        part is the source filter — and it was audited with data rather than copied blind:
      </p>
      <CodeBlock
        code={`@type:error @view.name:"/identity/sign-up/enter-email" ...
  @error.source:(custom OR report OR console)

# The audit (1 day, US):
#   EXCLUDED bucket 'source':   9,290/day — ~86% third-party junk
#     5,181  Can't find variable: gtag        (ad-blockers killing analytics)
#     2,799  gtag is not defined
#       585  Failed to load static props      <- the one REAL signal lost
#   INCLUDED buckets:           2,980/day — real app errors
#       867  upstream 400 responses
#       168  EmptyEmailException              <- literally email validation`}
        lang="bash"
        filename="error-filter-audit.txt"
      />
      <p>
        Including the <code>source</code> bucket would put gtag noise in the top rows and bury the
        439-count real errors below the top-10 cut. The filter is not hiding importance — it is
        removing camouflage. The known blind spot (&ldquo;Failed to load static props&rdquo;) is
        documented, and its failure mode is covered by the funnel: widgets back each other up, so no
        single widget carries the whole alarm burden.
      </p>

      <h2 id="widget-modal">Widget 4 — Modal Accepts (Triangulation)</h2>
      <p>
        After typing an email, D+ shows a confirmation modal (&ldquo;Is this correct?&rdquo;).
        Every Confirm click emits{" "}
        <code>@action.name:&quot;Click confirm in confirmation modal&quot;</code> (~1.4k/day US).
        This widget was an addition beyond the donor pattern, and it exists for one reason:
        it completes a three-point diagnostic line.
      </p>
      <MermaidDiagram
        chart={triangulationDiagram}
        title="Views → Intent → Outcome Triangulation"
        caption="Where the three numbers diverge tells you WHAT broke, before opening a single log. The funnel alone only says 'fewer people got through'."
        minHeight={360}
      />
      <p>
        Honest caveats, stated on the dashboard and in review: the widget string-matches an
        uncontracted code constant (a rename silently zeroes it), and a treatment that legitimately
        removes the modal zeroes the column by design. It is labeled &ldquo;secondary&rdquo; for
        those reasons.
      </p>

      <h2 id="widget-p75">Widget 5 — p75 Load Time</h2>
      <p>
        The 75th-percentile of <code>@view.loading_time</code> per variant — the load time 75% of
        users beat (validated: ~2.0s). Its experiment job: catch a treatment that ships a heavier
        bundle or an extra blocking call. A p75 regression in one leg only is a performance
        regression the experiment introduced.
      </p>
      <CodeBlock
        code={`// Widget definition uses the RUM scalar aggregation:
{ "compute": { "aggregation": "pc75", "metric": "@view.loading_time" } }

// The equivalent validation query from the CLI (pup):
// pup rum aggregate --query "..." --compute "percentile(@view.loading_time, 75)" --from 1d`}
        lang="json"
        filename="p75-widget.json"
      />

      <h2 id="design-decisions">The Three Design Decisions</h2>
      <p>
        <strong>1. Funnel instead of the CTA-actionKey table.</strong> The donor templates
        (Retention, Welcome Back) tabulate clicks by <code>@context.actionKey</code> — a clean,
        governed label commerce pages emit. Identity pages do not emit it (verified: 7 events/day
        against 71k views), and the auto-captured click names are localized
        (&ldquo;click on Adresse e-mail&rdquo;) — any string-matched click widget breaks outside
        English. The view-funnel needs zero click instrumentation: outcome measured by where the
        user ended up. This gap applies to every identity page in the flow, so it is documented in
        the dashboard&rsquo;s header note for the tickets that follow.
      </p>
      <p>
        <strong>2. Retention&rsquo;s error filter over Welcome Back&rsquo;s.</strong> The two donors
        disagree (<code>custom OR report OR console</code> vs <code>source OR custom</code>). The
        audit above settled it with this page&rsquo;s own data instead of authority.
      </p>
      <p>
        <strong>3. US anchor with regional annotations.</strong> Region scope belongs to the{" "}
        <em>experiment</em>, not the page — it is one of the three clone-time replace-fields.
        Page <em>presence</em> varies by market (per the Disney+ Regional Variations sheet: US has
        a DOB step but no standalone consent page; the Netherlands is the reverse), so the header&rsquo;s
        flow-order line marks those steps &ldquo;( — regional )&rdquo;. Unfiltered geo would dilute
        variant columns with traffic that cannot be in the experiment at all.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Templates are master copies — a real live experiment as the example makes the template
          self-proving; clones swap three fields and find/replace the key.
        </li>
        <li>
          Verify the route in code <em>and</em> data before widget-building: the highest-traffic
          plausible candidate (<code>/identity/begin</code>) was the wrong page.
        </li>
        <li>
          Funnels measure whether a page did its job and catch silent breakage; absolute conversion
          is a baseline, the variant <em>delta</em> is the alarm.
        </li>
        <li>
          Audit noise filters with the page&rsquo;s own data — and document the blind spot you
          accept; overlapping widgets cover each other&rsquo;s gaps.
        </li>
        <li>
          Views → intent → outcome triangulation localizes failures (upstream / UI / backend)
          without opening a log.
        </li>
        <li>
          Every widget query gets validated with a live count <em>before</em> it ships — a widget
          nobody validated is a widget nobody can trust.
        </li>
      </ul>
    </div>
  );
}
