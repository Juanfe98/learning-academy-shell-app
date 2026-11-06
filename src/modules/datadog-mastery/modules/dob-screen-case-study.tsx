import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dobFlowDiagram = String.raw`flowchart TD
  P["/identity/sign-up/create-password<br/>US 15.0k views/2d"] -->|"MAINLINE<br/>22 of 30 sampled referrers"| D["/identity/sign-up/missing-info<br/>THE DOB PAGE · US 6.4k · 98.9% US"]
  D -->|"click Save Changes<br/>5.4k/2d (EN+ES)"| PL["/commerce/plans<br/>US 77.6k"]
  B["/commerce/billing"] -.->|"guard redirect:<br/>account missing DOB"| D
  C["/commerce/cadence"] -.->|"guard redirect"| D
  L["/identity/login/missing-info<br/>6.2k/2d · LOGIN branch"] ~~~ D
  PL --> B2["cadence / billing → success"]
  style D fill:#1a7f4b,color:#fff
  style P fill:#632ca6,color:#fff
  style L fill:#8a6d1a,color:#fff`;

const stampTrapDiagram = String.raw`flowchart TD
  subgraph identity["Identity experiment (assigns EARLY, at identity surfaces)"]
    I1["enter-email<br/>ASSIGNED ✓"] --> I2["create-password<br/>stamped ✓"] --> I3["DOB page<br/>stamped ✓ (84% views, 95% saves)"]
  end
  subgraph commerce["Commerce experiment (assigns LATE, at commerce surfaces)"]
    C1["enter-email<br/>not assigned"] --> C2["DOB page<br/>NOT STAMPED ✗"] --> C3["/commerce/plans<br/>ASSIGNED here"]
  end
  identity --> OK["DOB widgets on identity key:<br/>full population, honest ratios"]
  commerce --> BAD["DOB widgets on commerce key:<br/>only the 12% guard-entry subset<br/>views→saves reads 23% vs real 81%"]
  style OK fill:#1a7f4b,color:#fff
  style BAD fill:#8a6d1a,color:#fff`;

export const toc: TocItem[] = [
  { id: "intro", title: "The Ticket & the Missing Route", level: 2 },
  { id: "proving-the-page", title: "Proving the Page Is the DOB Page", level: 2 },
  { id: "the-flow", title: "How Users Actually Land Here", level: 2 },
  { id: "stamp-trap", title: "The Stamp-Coverage Trap", level: 2 },
  { id: "widget-views-saves", title: "Widgets 1–2 — Views & Saves (EN+ES)", level: 2 },
  { id: "widget-funnel", title: "Widget 3 — DOB → Plan Select Funnel", level: 2 },
  { id: "widget-errors-p75", title: "Widgets 4–5 — Errors & p75", level: 2 },
  { id: "widget-header", title: "Piece 7 — Header: Four Examples and a Corrected Flow", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DobScreenCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the case study of GREAT-1134: the Date of Birth section of the D+ Signup
        monitoring template. It is the section where nothing was what it first looked like — the
        page has no DOB route, the &ldquo;obvious&rdquo; flow position was wrong, and every real
        A/B experiment on the page turned out to be unusable for reasons that only showed up in a
        final quality-review pass. That last discovery — the stamp-coverage trap — is the most
        transferable lesson the whole epic has produced so far.
      </p>

      <h2 id="intro">The Ticket &amp; the Missing Route</h2>
      <p>
        The ticket says &ldquo;build widgets for the Date of Birth page.&rdquo; The route
        enumeration says there is no such page: no <code>/identity/sign-up/dob</code>, no{" "}
        <code>birthdate</code> route with meaningful traffic. The only candidate was{" "}
        <code>/identity/sign-up/missing-info</code> at 6,955 views/2d — a generically-named page
        that could have been anything. Before building a section on it, we had to prove what it
        was.
      </p>

      <h2 id="proving-the-page">Proving the Page Is the DOB Page</h2>
      <p>
        The page proved its own identity through its RUM action names — no code spelunking
        required:
      </p>
      <CodeBlock
        code={`# Top actions on /identity/sign-up/missing-info (2d):
5,284  click on Save Changes
4,902  click on Birthdate                    ← the input field's label
  573  click on Guardar cambios              ← same button, Spanish locale
  545  click on Fecha de nacimiento
  350  click on "We just need a little more information
        To subscribe to Disney+, you need to provide your birthdate..."`}
        lang="bash"
        filename="page-identity-evidence.txt"
      />
      <p>
        Auto-captured click names are usually a liability (they weld widgets to UI copy) — but as
        <em> forensic evidence</em> they are excellent: the page literally tells you what it
        collects. Two more facts completed the picture. The country mix is{" "}
        <strong>98.9% United States</strong> — matching the Regional Variations sheet&rsquo;s
        &ldquo;DOB: US yes&rdquo; row, so the anchor-market decision made itself. And a sibling
        route <code>/identity/login/missing-info</code> (6.2k/2d) serves the same page to the{" "}
        <em>login</em> branch — existing users without a birthdate on file — which belongs to a
        different ticket family and got one scope note, zero widgets.
      </p>

      <h2 id="the-flow">How Users Actually Land Here</h2>
      <p>
        The prior assumption — inherited from reading the billing-guard code during the
        Subscriber Agreement ticket — was that DOB is a billing-entry interstitial. Referrer
        sampling on live views said otherwise: 22 of 30 arrivals come <em>straight from
        create-password</em>. The DOB page is a mainline signup step for US users, with the guard
        redirect as a minor secondary entry.
      </p>
      <MermaidDiagram
        chart={dobFlowDiagram}
        title="DOB Page Entry Points (Referrer-Verified)"
        caption="Solid arrow = mainline (dominant). Dotted = guard redirects for accounts that somehow reached commerce without a DOB. The amber login sibling is the same page in a different flow — out of scope."
        minHeight={440}
      />
      <p>
        This finding changed the build twice: the section slots directly after Password (not
        after Subscriber Agreement, where the template header&rsquo;s flow line had it — that
        line got corrected), and the funnel target became <code>/commerce/plans</code>, the
        actual next step. One honest unknown stayed documented: DOB views are only ~42% of US
        create-password views. Views are not users (reloads inflate the upstream page) and some
        flows may collect DOB elsewhere — the widgets are correct either way.
      </p>

      <h2 id="stamp-trap">The Stamp-Coverage Trap</h2>
      <p>
        The page had four real A/B experiments with live control arms — a luxury after the
        Password ticket had exactly one. The plan recommended one of them. Then a final
        quality-review pass compared two numbers that should have agreed and didn&rsquo;t:
      </p>
      <CodeBlock
        code={`# Coverage check: how much of the page does the experiment key actually stamp?
                                   stamped views    stamped saves
wpnx-payment-event-details            785 (12%)       180 (3.5%)   ← real A/B
wpnx-l4l-welcome-back                 784 (12%)       180 (3.5%)   ← real A/B
wpnx-IPS-Upsell-AA-Test-2             784 (12%)       180 (3.5%)   ← A/A test
wpnx-web-identity-use-passwordless    5,337 (84%)     4,882 (95%)  ← identity experiment

# Page truth: 6,354 views · 5,136 saves. The three commerce keys stamp IDENTICAL
# tiny subsets — the same users. Inside those columns, views→saves reads 23%.
# The page's real save rate is 81%.`}
        lang="bash"
        filename="stamp-coverage-check.txt"
      />
      <p>
        The mechanism: experiment assignments are stamped onto RUM events only <em>after</em> the
        experiment assigns the user, and commerce experiments assign at commerce surfaces —
        which mainline signup users have not reached yet when they hit the DOB page. The only
        sessions carrying commerce stamps on this page are the guard-redirect entrants who
        visited billing first. Three &ldquo;different&rdquo; experiments showing identical
        stamped counts was the tell: they are all stamping the same 12% sub-population.
      </p>
      <MermaidDiagram
        chart={stampTrapDiagram}
        title="Why Commerce Keys Under-Stamp an Early-Journey Page"
        caption="Assignment timing decides stamp coverage. An identity experiment assigns before the DOB page and stamps nearly everything; a commerce experiment assigns after it and stamps almost nothing."
        minHeight={460}
      />
      <p>
        So the recommendation flipped: the section uses{" "}
        <code>wpnx-web-identity-use-passwordless-login</code> — an identity experiment with
        proper coverage — accepting its one flaw: US is ~100% one variant, so the Control column
        reads &ldquo;–&rdquo; (the Email section&rsquo;s precedent, with the standard header
        caveat). Honest full-population data with an empty control beats a real-looking A/B on a
        misleading slice. And the realistic future user of this section — a team experimenting{" "}
        <em>on</em> the DOB page — would run an identity experiment anyway.
      </p>

      <h2 id="widget-views-saves">Widgets 1–2 — Views &amp; Saves (EN+ES)</h2>
      <p>
        The page-section pair follows the template shape: views by variant on the left, the
        progression signal on the right. No custom action exists on this page (unlike
        Password&rsquo;s registration event), so saves fall back to the click — with one
        improvement over a single-language query. The US anchor includes Spanish-locale users,
        and the OR covers both copies:
      </p>
      <CodeBlock
        code={`@type:action @action.name:("click on Save Changes" OR "click on Guardar cambios")
  @view.name:"/identity/sign-up/missing-info"
  service:web-solo-commerce-disneyplus @geo.country:"United States" env:prod
  @context.experiments.wpnx-web-identity-use-passwordless-login.variantId:WithOptOutButton

# Validated: views 5,327 · saves 5,380 (2d, treatment arm).
# EN-only would cover ~90%; the OR lifts it to ~99%. Still counts attempts —
# no server-confirmed action exists here.`}
        lang="bash"
        filename="dob-saves-by-variant.query"
      />
      <p>
        Saves slightly exceeding views (5,380 vs 5,327) is not an error: a user can click Save
        more than once per view (validation failures, retries). That is exactly the
        attempts-vs-outcomes distinction the Password section&rsquo;s custom action solved — and
        this page cannot.
      </p>

      <h2 id="widget-funnel">Widget 3 — DOB → Plan Select Funnel</h2>
      <p>
        Route-level, variant-free, US-filtered: sessions that viewed missing-info and later
        viewed <code>/commerce/plans</code> (legs validated 6,354 → 77,639). One subtlety
        surfaced while trying to confirm the edge with referrers: <code>/commerce/plans</code>{" "}
        arrivals show <code>/identity/start</code> as their referrer, not the DOB page — an
        internal redirect masks the true origin. That would sink a referrer-based metric, but
        Datadog funnels count <em>view sequence within a session</em>, so the edge is unaffected.
        The same fact retroactively reassures the Password section&rsquo;s funnel: intermediate
        pages and redirect hops never break an A-then-eventually-B funnel.
      </p>

      <h2 id="widget-errors-p75">Widgets 4–5 — Errors &amp; p75</h2>
      <p>
        Both are straight donor clones re-anchored to the page: top-10{" "}
        <code>@error.message</code> with the identity noise filter{" "}
        <code>@error.source:(custom OR report OR console)</code> (711 errors on the treatment
        arm — this page runs far cooler than Password&rsquo;s ~3.5k per arm), and{" "}
        <code>pc75</code> over <code>@view.loading_time</code> at a healthy 0.58s. A simple form
        page should be fast and quiet; these two widgets exist to notice when it stops being
        either.
      </p>

      <h2 id="widget-header">Piece 7 — Header: Four Examples and a Corrected Flow</h2>
      <p>
        The header&rsquo;s find/replace table gained its fourth example column (key, variants,
        region for DOB), every renumbered section reference got fixed (Subscriber Agreement is
        now ④, the flow sections ⑤–⑦), and the localized-click caveat gained the EN+ES OR
        pattern. The most substantive header change was not cosmetic: the flow-order line had
        DOB positioned after Subscriber Agreement, and the referrer data proved it belongs
        immediately after create-password. Templates teach — a wrong flow line teaches wrong.
        One flagged debt: at four example columns the table is near its width limit; before the
        epic reaches eight sections it should transpose (sections as rows).
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Check <strong>stamp coverage</strong> before choosing an example experiment: compare
          stamped views AND stamped actions against page totals. Commerce experiments assign late
          and under-stamp early-journey pages; identical stamped counts across
          &ldquo;different&rdquo; keys means they all cover the same sub-population.
        </li>
        <li>
          A real A/B with misleading coverage is worse than a 100%-rollout with honest coverage —
          an empty Control column with a caveat beats ratios that teach cloners something false.
        </li>
        <li>
          Pages can prove their own identity through RUM action names — the DOB page confessed
          via <code>click on Birthdate</code> and its own onboarding copy, no source dive needed.
        </li>
        <li>
          Verify flow position with referrer sampling, not assumptions inherited from adjacent
          code reading — DOB turned out to be a mainline step, not a billing interstitial, which
          moved the section, the funnel target, and the header&rsquo;s flow line.
        </li>
        <li>
          Internal redirects mask referrers but never break funnels — Datadog funnels count
          session view sequence, so A-then-eventually-B survives any number of hops between.
        </li>
        <li>
          When a page only has click capture, OR the localized copies your anchor market actually
          uses (EN+ES lifted coverage from ~90% to ~99%) — and remember clicks count attempts,
          so saves exceeding views is retry math, not a bug.
        </li>
      </ul>
    </div>
  );
}
