import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const flowBoundariesDiagram = String.raw`flowchart LR
  subgraph ESPN["www.espn.com - ESPN-owned"]
    CTX["Contextualization takeover<br/>READY. SET. STREAM."]
  end
  subgraph NEXUS["plus.espn.com - service:espn-nexus"]
    PP["Plan Picker<br/>view.name = /<br/>NO experiment tags"]
  end
  subgraph CUP["secure.web.plus.espn.com - service:web-solo-commerce-espn"]
    L["/identity/login<br/>OneID iframe:<br/>sign-in AND account creation"]
    LO["/identity/loading<br/>auth return"]
    AO["/commerce/add-ons<br/>optional"]
    B["/commerce/billing<br/>the Ledger - purchase completes HERE"]
    S["/commerce/success"]
    ACT["/commerce/activate/*<br/>partner activation - separate flow"]
  end
  CTX -->|"no data reaches<br/>our Datadog org"| PP
  PP -->|"variant effect starts<br/>being measurable"| L
  L --> LO
  LO -->|"optional"| AO
  LO --> B
  AO --> B
  B --> S
  CTX -.->|"TV-provider path<br/>(TVE users never reach commerce at all)"| ACT`;

const billingPipelineDiagram = String.raw`flowchart TD
  V["Billing Views by Variant<br/>@type:view on /commerce/billing"] --> T["Payment Tokenizations<br/>TOKENIZE_PAYMENT_SUCCESS<br/>card data accepted by the vault"]
  T --> A["Signup Attempts<br/>@context.actionKey:<br/>signupExecutionV2 OR signupExecutionPaypalV2<br/>user pressed the buy button"]
  A --> SS["Signup Successes<br/>SIGNUP_SUCCESS action<br/>fires ON the billing page"]
  SS --> C["Checkout Conversion %<br/>SIGNUP_SUCCESS / Billing Views x 100"]
  V -.->|"denominator"| C
  style C fill:#1a3a1a,stroke:#4a4
  note["Why billing views as denominator and not login views:<br/>login is CONDITIONAL - already-authenticated users skip it,<br/>so a login denominator silently mixes two populations"] -.- C`;

const columnDecisionDiagram = String.raw`flowchart TD
  Q{"What question<br/>are you answering?"} -->|"How much traffic<br/>does this page get?"| CENSUS["Read the ALL TRAFFIC column<br/>or a route-level widget.<br/>Never sum arm columns:<br/>only ~34% of views carry<br/>an experiment assignment"]
  Q -->|"Does arm X behave<br/>differently from control?"| ARMS["Compare arm columns<br/>AGAINST EACH OTHER.<br/>Ratios and deltas are valid -<br/>absolute volumes are not"]
  Q -->|"Is the split healthy?"| BAL["Arm columns should be<br/>roughly even (3-arm A/B).<br/>A skewed split means assignment<br/>or tagging is broken - stop reading<br/>results until it is explained"]
  Q -->|"What is the N/A row<br/>in a p75 table?"| NA["Views with NO assignment -<br/>the unassigned ~66%.<br/>It is a census baseline,<br/>not a broken variant"]`;

export const toc: TocItem[] = [
  { id: "what-this-board-is", title: "What This Board Is", level: 2 },
  { id: "flow-and-boundaries", title: "The Flow & Its Observability Boundaries", level: 2 },
  { id: "reading-variant-tables", title: "Core Skill — Reading a Variant Table", level: 2 },
  { id: "header-note", title: "⓪ The Header Note", level: 2 },
  { id: "plan-picker", title: "① Plan Picker", level: 2 },
  { id: "login-auth", title: "② MyDisney Login & Auth Return", level: 2 },
  { id: "add-ons", title: "③ Add-ons", level: 2 },
  { id: "billing", title: "④ Billing — the Ledger", level: 2 },
  { id: "success", title: "⑤ Success", level: 2 },
  { id: "partner-activation", title: "⑥ Partner Activation", level: 2 },
  { id: "funnels", title: "⑦ Funnel Volume & Progression", level: 2 },
  { id: "errors", title: "⑧ Edge Cases & Errors", level: 2 },
  { id: "coverage", title: "⑨ Coverage & Arm Balance", level: 2 },
  { id: "performance", title: "⑩ Performance (p75)", level: 2 },
  { id: "tailoring", title: "Tailoring the Template for Your Experiment", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ReadingTheEspnSignupDashboard() {
  return (
    <div className="article-content">
      <p>
        The ESPN Signup monitoring board (<code>spg-pqf-s6u</code>, &ldquo;XD
        Experimentation | Monitoring Templates | ESPN Signup&rdquo;) is a
        47-widget Datadog dashboard that watches the entire ESPN signup flow —
        from the plan picker on plus.espn.com through checkout on the CUP
        commerce app — sliced by experiment variant. This module teaches you to
        read every section and every widget on it: not just what each graph
        shows, but <em>why it is built the way it is</em>, which columns you
        are allowed to trust for which question, and the caveats that turn a
        plausible reading into a wrong one.
      </p>

      <h2 id="what-this-board-is">What This Board Is</h2>
      <p>
        Three framing facts change how you read everything on the board:
      </p>
      <p>
        <strong>1. It is a template, not a report.</strong> The board is wired
        to one real example experiment —{" "}
        <code>wpnx-ESPN-Generic-Entry-Plan-Order</code>, a genuine US 3-arm
        A/B (control / ascending-price-order / descending-price-order) — but
        that experiment is <em>not the subject</em>. It exists so every widget
        renders live data. When your team launches an experiment on this flow,
        you clone the board and find/replace the key. Because it is a
        template, the notes stay evergreen: they describe the flow and the
        reading rules, never transient state like a currently-live bug — a bug
        reference would be stale the week after it is fixed and confusing on
        every clone thereafter.
      </p>
      <p>
        <strong>2. One example key, board-wide.</strong> Every
        variant-split widget on the board uses the <em>same</em> experiment
        key, and the arm columns appear in the same order everywhere
        (Control · T1 · T2). This is a deliberate convention: it makes a
        find/replace tailoring pass safe, and it means a skewed column in one
        widget can be compared against the same column elsewhere without
        wondering whether the widgets disagree about what &ldquo;T1&rdquo;
        means.
      </p>
      <p>
        <strong>3. Scoping lives in queries, not template variables.</strong>{" "}
        The board has zero Datadog template variables. Every query carries its
        own <code>env:prod</code> and <code>service:</code> scope inline. This
        is less DRY but far safer for a template: a clone can never
        accidentally inherit a variable default that silently rescopes 47
        widgets.
      </p>

      <h2 id="flow-and-boundaries">The Flow &amp; Its Observability Boundaries</h2>
      <p>
        The board mirrors the real signup journey, and its section numbering
        (① → ⑩) follows the user&rsquo;s path. But the journey crosses three
        ownership domains, and only some of them are visible to our Datadog
        org. Reading the board correctly starts with knowing where the
        instrumentation can and cannot see.
      </p>
      <MermaidDiagram
        chart={flowBoundariesDiagram}
        title="The ESPN signup flow and what each Datadog service can see"
        caption="Notice the two blind spots: contextualization sends nothing to our org, and the plan picker (espn-nexus) has views but no experiment tags. Variant columns only become meaningful from /identity/login onward."
        minHeight={420}
      />
      <p>
        Three boundary facts to internalize:
      </p>
      <ul>
        <li>
          <strong>Contextualization is dark.</strong> The &ldquo;READY. SET.
          STREAM.&rdquo; takeover on www.espn.com is an ESPN-owned page that
          sends no RUM data to our Datadog org. The board can only mention it
          in a note. If a funnel seems to &ldquo;start too late,&rdquo; this
          is why.
        </li>
        <li>
          <strong>The plan picker has views but no experiments.</strong>{" "}
          plus.espn.com reports as <code>service:espn-nexus</code>, and Nexus
          events carry no WeaponX experiment context. The example experiment
          actually <em>changes the plan picker</em> (it reorders plan cards),
          yet its effect is only <em>measurable</em> from ② Login onward —
          the first CUP page. Sit with that: the treatment is applied on a
          page where we cannot split by variant.
        </li>
        <li>
          <strong>Partner activation is a separate flow, not a step.</strong>{" "}
          TV-provider users arrive from contextualization into{" "}
          <code>/commerce/activate/*</code> and never touch billing. TVE users
          never reach commerce at all. Section ⑥ exists so activation traffic
          doesn&rsquo;t get misread as signup traffic.
        </li>
      </ul>
      <p>
        One more anchor worth memorizing: the CUP application id
        (<code>1ac57431…</code>) is <em>shared</em> with Disney+ and Hulu
        commerce. Brand selection is always{" "}
        <code>service:web-solo-commerce-espn</code>, never the app id. A query
        scoped only by app id silently includes two other brands.
      </p>

      <h2 id="reading-variant-tables">Core Skill — Reading a Variant Table</h2>
      <p>
        Most widgets on the board are query tables with three columns —
        Control, Ascending Order (T1), Descending Order (T2). Under the hood
        each column is its own query, filtered by the WeaponX variant facet:
      </p>
      <CodeBlock
        code={`# One column = one query. The c0 query (Control column):
@type:view @view.name:"/identity/login"
  service:web-solo-commerce-espn env:prod
  @context.experiments.wpnx-ESPN-Generic-Entry-Plan-Order.variantId:control

# c1 = ...variantId:ascending-price-order   -> alias "Ascending Order (T1)"
# c2 = ...variantId:descending-price-order  -> alias "Descending Order (T2)"`}
        lang="bash"
        filename="anatomy of a variant table (Login Views by Variant)"
      />
      <p>
        The critical, non-obvious caveat: <strong>only about a third of
        route views carry an experiment assignment at all</strong> (~34% on
        this flow). Assignment requires the WeaponX context to be present and
        stamped on the event; pre-auth traffic, bots, and sessions that never
        initialized the experiment SDK all show up in route-level counts but
        in <em>no</em> arm column. The consequence is a hard reading rule:
      </p>
      <blockquote>
        <p>
          Arm columns are for <em>comparing arms against each other</em>.
          They are never a volume measurement. If you want volume, read an
          all-traffic widget or the census column in ⑨.
        </p>
      </blockquote>
      <MermaidDiagram
        chart={columnDecisionDiagram}
        title="Which column answers which question"
        caption="Four questions, four different columns. The most common misreading is summing arm columns to estimate page volume — you would undercount by roughly 3x."
        minHeight={380}
      />
      <p>
        The healthy state of any variant table on this board: three columns of
        roughly equal size (it is an evenly-split 3-arm test). An uneven split
        is itself a finding — assignment or tagging is broken — and every
        number downstream of it is suspect until explained.
      </p>

      <h2 id="header-note">⓪ The Header Note</h2>
      <p>
        The white note at the top is the board&rsquo;s operating manual, and
        it front-loads the four things a new reader needs: the tailoring
        procedure (find/replace the key), the example experiment and its arms,
        the query anchors (services, the variant facet syntax, the shared
        app-id trap), and the flow map with its observability boundaries. Two
        warnings in it deserve special attention:
      </p>
      <ul>
        <li>
          <strong>Key aging.</strong> When the example experiment ends, its
          tagged events age out of RUM retention (~30 days) and every variant
          column on the board gradually reads empty. That is not a broken
          board — it is a stale example key. The fix is to swap in a live key
          or widen the time range while history lasts.
        </li>
        <li>
          <strong>Mobile-first judgment.</strong> Roughly 74% of signup-flow
          traffic is mobile. Any layout-affecting experiment should be judged
          mobile-first; a desktop-only mental model of these pages reads a
          quarter of reality.
        </li>
      </ul>

      <h2 id="plan-picker">① Plan Picker</h2>
      <p>
        Three widgets, <em>no variant columns anywhere</em> — this is the
        Nexus boundary from the flow diagram made concrete.
      </p>
      <ul>
        <li>
          <strong>Plan Picker Views</strong> — raw views of{" "}
          <code>@view.name:&quot;/&quot;</code> on{" "}
          <code>service:espn-nexus</code>. The root path <em>is</em> the plan
          picker page.
        </li>
        <li>
          <strong>Plan Clicks by Price (grouped by button copy)</strong> —
          clicks grouped by <code>@action.name</code>. Note what this is{" "}
          <em>not</em>: it is not a set of hard-coded filters like{" "}
          <code>@action.name:&quot;click $11.99/mo&quot;</code>. Grouping by
          the facet means new prices, new plans, and new copy variants appear
          automatically as rows. Enumerated copy literals are the classic
          silent-undercount bug — a filter pinned to one locale&rsquo;s
          button text once hid 155K accepts in another language on a sibling
          board. Structural facets over enumerated literals, always.
        </li>
        <li>
          <strong>Entry Landing Pages — Views by Page</strong> —
          every non-root view on espn-nexus (<code>-@view.name:&quot;/&quot;</code>,
          grouped by page). This is your peripheral vision: campaign landing
          pages and deep links that feed the flow without passing the root
          plan picker.
        </li>
      </ul>
      <p>
        <strong>Why keep a section with no experiment data on an
        experimentation board?</strong> Because the plan picker is where the
        example experiment actually manipulates the UI, and because a
        treatment that changes plan-picker behavior shows up here first as a
        shape change (clicks by price shifting) even though you cannot
        attribute it per-arm. It is context, honestly labeled as such.
      </p>

      <h2 id="login-auth">② MyDisney Login &amp; Auth Return</h2>
      <p>
        Two widgets: <strong>Login Views by Variant</strong> and{" "}
        <strong>Auth Return (Loading) Views by Variant</strong>. These are the
        first variant columns on the board — the earliest point where the
        experiment is measurable.
      </p>
      <p>
        Two things about <code>/identity/login</code> that are easy to get
        wrong:
      </p>
      <ul>
        <li>
          <strong>It is conditional.</strong> Already-authenticated users skip
          it entirely. Login views are therefore a <em>subset</em> of flow
          entrants, and any ratio using login as a denominator quietly mixes
          the authenticated and unauthenticated populations. This is exactly
          why ④&rsquo;s conversion widget divides by billing views instead.
        </li>
        <li>
          <strong>Sign-in and account creation both live here.</strong> The
          page hosts the MyDisney OneID iframe, and account <em>creation</em>{" "}
          happens inside that same iframe — there are no separate sign-up
          routes in production. Do not go hunting for a{" "}
          <code>/identity/signup</code> page; it does not exist.
        </li>
      </ul>
      <p>
        <code>/identity/loading</code> is the auth-return trampoline — a
        useful integrity check: loading views should track login views
        closely. A gap between them means users are failing inside the OneID
        iframe, which is otherwise a blind spot.
      </p>

      <h2 id="add-ons">③ Add-ons</h2>
      <p>
        <code>/commerce/add-ons</code> is an <em>optional</em> step — most
        users go straight from auth to billing. The section exists mostly as
        an attach surface for future add-on experiments.
      </p>
      <p>
        The interactions widget is worth reading closely:
      </p>
      <CodeBlock
        code={`@type:action (@action.name:click* OR @action.name:FLEX_INTERACTION*)
  @view.name:"/commerce/add-ons"
  service:web-solo-commerce-espn env:prod
  @context.experiments.<KEY>.variantId:<arm>`}
        lang="bash"
        filename="Add-ons Interactions by Variant — the query"
      />
      <p>
        The <code>OR</code> matters: add-ons UI is partially server-driven by
        Flex, and Flex-rendered elements emit{" "}
        <code>FLEX_INTERACTION*</code> actions rather than plain{" "}
        <code>click*</code> ones. A clicks-only query would undercount
        interaction on exactly the elements an experiment is most likely to
        touch.
      </p>

      <h2 id="billing">④ Billing — the Ledger</h2>
      <p>
        The deepest section on the board, because{" "}
        <code>/commerce/billing</code> (internally &ldquo;the Ledger&rdquo;)
        is where ESPN purchases <em>complete</em> — there is no separate
        confirmation page in the money path. Five widgets form a pipeline:
      </p>
      <MermaidDiagram
        chart={billingPipelineDiagram}
        title="The billing pipeline — five widgets, one story"
        caption="Each stage should be a plausible fraction of the one above it. A break between two specific stages localizes the failure: views→tokenize = payment entry problems; tokenize→attempts = user hesitation or CTA issues; attempts→success = backend signup failures."
        minHeight={480}
      />
      <ul>
        <li>
          <strong>Billing Views by Variant</strong> — the population
          baseline for this page and the conversion denominator.
        </li>
        <li>
          <strong>Payment Tokenizations (TOKENIZE_PAYMENT_SUCCESS)</strong> —
          the vault accepted card data. This fires <em>before</em> the buy
          button; it measures payment-entry completion, not intent to buy.
        </li>
        <li>
          <strong>Signup Attempts (signupExecutionV2 + PayPal)</strong> —
          filtered by <code>@context.actionKey</code>, the commerce CTA facet.
          Two action keys are OR&rsquo;d because PayPal has its own execution
          path (<code>signupExecutionPaypalV2</code>); an attempts widget
          reading only the card path would miss roughly one in nine attempts.
        </li>
        <li>
          <strong>Signup Successes (SIGNUP_SUCCESS)</strong> — the outcome
          event, and note it is anchored to{" "}
          <code>@view.name:&quot;/commerce/billing&quot;</code>: the event
          fires on the billing page itself at purchase completion, not on the
          success page. Anchoring outcome events to the wrong page is a
          classic undercount.
        </li>
        <li>
          <strong>Checkout Conversion % — SIGNUP_SUCCESS ÷ Billing
          Views</strong> — per-arm formula{" "}
          <code>(successes / billing views) × 100</code>. The denominator
          choice is the deliberate part: billing views, <em>not</em> login
          views, because login is conditional (② above). Both numerator and
          denominator carry the same variant filter, so each arm&rsquo;s
          percentage is internally consistent — comparing the three
          percentages against each other is the intended reading.
        </li>
      </ul>

      <h2 id="success">⑤ Success</h2>
      <p>
        Two widgets that look redundant and are not:
      </p>
      <ul>
        <li>
          <strong>Success Page Views by Variant</strong> — raw{" "}
          <code>@type:view</code> counts of <code>/commerce/success</code>.
        </li>
        <li>
          <strong>Success Renders (SUBSCRIPTION_SUCCESS_PAGE_VIEW)</strong> —
          a render <em>action</em> the page emits when it actually renders the
          success experience.
        </li>
      </ul>
      <p>
        Why both? Raw views count every navigation to the URL — including
        refreshes, back-button revisits, and bookmark returns hours later.
        The render event is emitted by the fully-rendered success state and is
        the stabler signal across revisits. When the two disagree, the gap is
        revisit noise, not lost purchases. And do not be surprised that
        success-page numbers exceed ④&rsquo;s SIGNUP_SUCCESS counts — the
        page is reachable by more paths than fresh signup completion.
      </p>

      <h2 id="partner-activation">⑥ Partner Activation</h2>
      <p>
        A separate flow deliberately placed <em>after</em> the main journey
        sections: TV-provider users activating ESPN entitlements via{" "}
        <code>/commerce/activate/*</code>. The outcome event{" "}
        <code>SUCCESSFUL_ACTIVATION</code> fires on{" "}
        <code>/commerce/activate/callback</code> — verified against live
        data, where callback carries ~99.7% of the events.
      </p>
      <p>
        This section carries the board&rsquo;s most aggressive caveat:{" "}
        <strong>read volume off the All-traffic column only.</strong>{" "}
        <code>/commerce/activate</code> is a <em>pre-auth</em> page, and only
        about 7% of its traffic carries an experiment assignment — half the
        already-low board average. The activation tables include a fourth
        &ldquo;All traffic&rdquo; column for exactly this reason: the three
        arm columns on these widgets are close to decorative, present for
        template consistency and for the rare experiment that targets
        activation itself.
      </p>

      <h2 id="funnels">⑦ Funnel Volume &amp; Progression</h2>
      <p>
        Three Datadog funnel widgets, all route-level and variant-free by
        design:
      </p>
      <ul>
        <li>
          <strong>Main Spine</strong> — Login → Loading → Billing → Success.
        </li>
        <li>
          <strong>Attach Branch</strong> — Login → Add-ons → Billing (the
          optional-step detour).
        </li>
        <li>
          <strong>Partner Activation</strong> — Activate → Callback →
          Activation Success.
        </li>
      </ul>
      <p>
        Why variant-free? Datadog funnels count <em>sessions</em> progressing
        through view steps. Splitting a funnel by variant means duplicating
        the whole widget per arm — so the template ships the all-traffic
        version and the header note documents the tailoring move: duplicate a
        funnel and add the <code>.variantId</code> filter per leg when your
        experiment needs per-arm progression.
      </p>
      <p>
        Two structural caveats:
      </p>
      <ul>
        <li>
          <strong>Funnels cannot start at the plan picker.</strong> Nexus is a
          different RUM <em>application</em>, and Datadog funnels cannot cross
          apps. The funnel&rsquo;s &ldquo;step 1&rdquo; is therefore login,
          not the true flow entry — absolute drop-off from the plan picker is
          invisible here.
        </li>
        <li>
          <strong>Funnel counts ≠ table counts.</strong> Funnels count
          sessions in strict step order; the query tables count events. A
          user who lands on billing via a deep link is in ④&rsquo;s tables
          but not in the Main Spine funnel. Comparing the two surfaces is a
          category error, not a data bug.
        </li>
      </ul>

      <h2 id="errors">⑧ Edge Cases &amp; Errors</h2>
      <p>
        The section layout is guardrails-first, and the ordering is a design
        decision worth understanding. The top row holds two flow-wide
        tripwires; per-page error tables come below.
      </p>
      <p>
        <strong>Row 1 — Copy-Key Guardrail
        (MISSING_CYPHER_KEY_IN_DICTIONARY by Page &amp; Variant).</strong>{" "}
        Cypher is the copy/translation dictionary system; this error fires
        every time a page requests a copy key the published dictionary does
        not contain. It gets a <em>dedicated</em> widget because of a
        quarantine pattern:
      </p>
      <CodeBlock
        code={`# The per-page error tables EXCLUDE the cypher error...
@type:error @error.source:(custom OR source)
  -@error.message:MISSING_CYPHER_KEY_IN_DICTIONARY
  @view.name:"/commerce/billing" service:web-solo-commerce-espn env:prod ...

# ...because the guardrail widget tracks it alone, per page, per arm:
@type:error @error.message:MISSING_CYPHER_KEY_IN_DICTIONARY
  @view.name:("/identity/login" OR ... OR "/commerce/activate/success")
  service:web-solo-commerce-espn env:prod ...`}
        lang="bash"
        filename="the quarantine pattern — exclude from tables, track in a dedicated guardrail"
      />
      <p>
        Why quarantine? This error class can be enormously chatty — at review
        time it was firing at hundreds of thousands of events per week on
        billing, on the order of 20 per page render. Left inside the top-10
        per-page tables it would occupy every row and blind you to every
        other error. Quarantined, you get both: a clean per-page signal{" "}
        <em>and</em> a per-arm cypher tripwire. The per-arm split is the
        experiment-relevant part — if your treatment introduces a new screen
        or new copy, a missing key shows up as one arm&rsquo;s guardrail count
        diverging from control.
      </p>
      <p>
        <strong>Row 1 — Error-Page Renders by Page &amp; Variant.</strong>{" "}
        Filtered to{" "}
        <code>@context.sourceComponent:(ApplicationErrorBoundary OR
        PageErrorBoundary)</code> — these are React error-boundary renders,
        i.e. the user <em>saw a broken page</em>, not merely a logged
        exception. This is the highest-severity user-facing signal on the
        board.
      </p>
      <p>
        <strong>Per-page tables.</strong> Top error messages for login,
        billing, add-ons, success, and activation, split by arm, each with the
        noise filter <code>@error.source:(custom OR source)</code> — the ESPN
        convention (sibling boards on other brands use slightly different
        source sets; the point of the filter is dropping third-party console
        noise that no experiment can cause). The plan-picker error widget is
        the exception twice over: it runs on espn-nexus (so no variant
        columns), and it <em>adds</em> <code>console</code> to the source
        filter because console is the dominant meaningful source on that
        service.
      </p>
      <p>
        How to read the tables: you are not looking for zero errors — every
        page has a baseline. You are looking for <em>divergence between
        arms</em> on the same message, or a new message appearing in one arm
        only. Same-across-arms means pre-existing defect (file a bug, it is
        not your experiment); one-arm-only means your treatment did it.
      </p>

      <h2 id="coverage">⑨ Coverage &amp; Arm Balance</h2>
      <p>
        Four census tables — route coverage, country, device type, locale —
        each with an <strong>All traffic</strong> first column and the three
        arm columns after it. The section has a dual mandate baked into its
        title: <em>coverage</em> (where is the traffic?) reads off the
        all-traffic column; <em>arm balance</em> (is assignment healthy and
        unbiased?) reads across the arm columns.
      </p>
      <ul>
        <li>
          <strong>Route coverage</strong> — views per route across the whole
          flow, including <code>/commerce/redeem</code>, which appears here
          and nowhere else on the board (its scope in the signup story is
          still an open product question; the census keeps it visible without
          committing sections to it).
        </li>
        <li>
          <strong>Country</strong> — ESPN commerce is US-only in practice (US
          ~99.7%, Puerto Rico the only real second market). This is why the
          board has <em>no Regional section</em>, a deliberate divergence
          from the D+ template family where a Regional block
          (US/LATAM/EMEA/APAC) is standard. A regional breakdown of a
          single-market product would be twelve empty cells.
        </li>
        <li>
          <strong>Device type</strong> — the ≈74% mobile fact from the
          header, kept live so it stays true rather than folklore.
        </li>
        <li>
          <strong>Locale</strong> — grouped on{" "}
          <code>@context.urlLocale</code>, and deliberately{" "}
          <em>keeps</em> the blank row (missing values are not excluded):
          the blank row is the default English route, i.e. most traffic. Es-419
          is the only visible minority locale. Excluding missing values here
          would hide the majority of the population.
        </li>
      </ul>
      <p>
        The arm-balance reading: within any row, the three arm columns should
        be roughly even. A device row where T1 skews mobile relative to
        control, or a locale row present in one arm only, is an assignment
        bias — and assignment bias invalidates downstream comparisons far
        more thoroughly than any single widget bug.
      </p>

      <h2 id="performance">⑩ Performance (p75)</h2>
      <p>
        Five Core-Web-Vitals tables (login, billing, add-ons, success, plus an
        all-traffic plan-picker one on espn-nexus). Columns: Time Spent,
        Loading, LCP, INP, CLS, Frustr., Frustrated %. Rows: the variants —
        plus an <strong>N/A row</strong>.
      </p>
      <p>
        Reading rules, in order of how often they save you:
      </p>
      <ul>
        <li>
          <strong>p75 means &ldquo;3 of 4 users experienced this or
          better.&rdquo;</strong> It is a tail-sensitive summary chosen over
          averages because performance regressions live in the tail. A p75
          shift between arms is a real experience shift for a quarter of
          users.
        </li>
        <li>
          <strong>The N/A row is the unassigned ~66%,</strong> not a broken
          variant. The variant group-by intentionally keeps missing values,
          so the row acts as a census performance baseline sitting right next
          to the arms. Expect it to be the <em>largest</em> row.
        </li>
        <li>
          <strong>The Frustr. column reads 0 by design below ~25%.</strong>{" "}
          It is the p75 of <code>@view.frustration.count</code> — a count
          that is 0 for most views. If fewer than 25% of views have any
          frustration signal, the 75th percentile of the count is exactly 0.
          The column only wakes up in genuinely bad states.
        </li>
        <li>
          <strong>Frustrated % is the column that actually moves</strong> —
          it is computed as a ratio of two count queries: views with at least
          one frustration signal over all views. Watch this one for
          experiment effects; treat Frustr. as a smoke alarm.
        </li>
      </ul>
      <CodeBlock
        code={`# The Frustrated % formula behind the last column:
f0: count of views where @view.frustration.count:>0   (per arm)
f1: count of all views                                (per arm)
formula: (f0 / f1) * 100

# vs the Frustr. column: pc75(@view.frustration.count)
# -> 0 whenever less than 25% of views have any frustration signal`}
        lang="bash"
        filename="why Frustrated % moves and Frustr. mostly does not"
      />

      <h2 id="tailoring">Tailoring the Template for Your Experiment</h2>
      <p>
        The procedure the header note encodes, expanded:
      </p>
      <ul>
        <li>
          <strong>Clone the board</strong>, then find/replace the example
          experiment key and each of its variant IDs in every widget query.
          Because the board uses one key everywhere and no template
          variables, this is a mechanical, safe pass. Update the column
          aliases to your arm names.
        </li>
        <li>
          <strong>Pick your sections.</strong> An experiment touching only
          billing does not need ⑥ Partner Activation re-keyed — but keep the
          sections on the clone anyway; their all-traffic and census widgets
          remain valid context for free.
        </li>
        <li>
          <strong>Per-arm funnels on demand:</strong> duplicate a ⑦ funnel
          per arm and add the <code>.variantId</code> filter to every leg.
        </li>
        <li>
          <strong>Respect the retention clock:</strong> your experiment&rsquo;s
          tagged events age out of RUM ~30 days after each event lands. A
          concluded experiment&rsquo;s board decays; export or screenshot
          final reads before the window closes.
        </li>
        <li>
          <strong>Keep the template evergreen:</strong> if you find a live
          bug while operating your clone (the guardrail exists to surface
          exactly that), escalate it in a ticket — do not annotate the
          template with transient state.
        </li>
      </ul>
      <ArticleTable caption="The board at a glance — what each section is for and its sharpest caveat">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Question it answers</th>
              <th>Sharpest caveat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>① Plan Picker</td>
              <td>Is the top of funnel healthy?</td>
              <td>No experiment tags — treatment applied here, measured from ②</td>
            </tr>
            <tr>
              <td>② Login &amp; Auth Return</td>
              <td>First per-arm read of the flow</td>
              <td>Login is conditional; signup happens inside the same iframe</td>
            </tr>
            <tr>
              <td>③ Add-ons</td>
              <td>Optional-step engagement</td>
              <td>Interactions need click* OR FLEX_INTERACTION*</td>
            </tr>
            <tr>
              <td>④ Billing</td>
              <td>Does the arm convert?</td>
              <td>Denominator is billing views, never login views</td>
            </tr>
            <tr>
              <td>⑤ Success</td>
              <td>Did the purchase experience render?</td>
              <td>Renders &gt; SIGNUP_SUCCESS is normal (revisits, other paths)</td>
            </tr>
            <tr>
              <td>⑥ Partner Activation</td>
              <td>Is the TV-provider path healthy?</td>
              <td>Pre-auth: ~7% tagged — volume from All-traffic column only</td>
            </tr>
            <tr>
              <td>⑦ Funnels</td>
              <td>Where do sessions drop?</td>
              <td>Cannot start at plan picker (cross-app); sessions ≠ events</td>
            </tr>
            <tr>
              <td>⑧ Errors</td>
              <td>Did my arm break something?</td>
              <td>Divergence between arms is the signal, not error presence</td>
            </tr>
            <tr>
              <td>⑨ Coverage</td>
              <td>Volume census + assignment health</td>
              <td>~34% assigned — never read volume off arm columns</td>
            </tr>
            <tr>
              <td>⑩ Performance</td>
              <td>Did my arm slow the page?</td>
              <td>N/A row = unassigned baseline; watch Frustrated %, not Frustr.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The board is a <strong>template</strong>: one example key wired
          everywhere so widgets render, find/replace to tailor, notes kept
          evergreen — never annotated with transient live-bug state.
        </li>
        <li>
          <strong>Arm columns compare arms; they never measure volume.</strong>{" "}
          Only ~34% of views carry an assignment (7% on pre-auth activation).
          Volume lives in all-traffic widgets and ⑨&rsquo;s census column.
        </li>
        <li>
          Know the <strong>observability boundaries</strong>:
          contextualization is dark, the plan picker has no experiment tags,
          funnels cannot cross the Nexus/CUP application boundary, and brand
          scoping is by <code>service:</code>, never the shared app id.
        </li>
        <li>
          ④&rsquo;s conversion denominator is <strong>billing views</strong>{" "}
          because login is conditional; ⑤&rsquo;s render event beats raw views
          because revisits inflate views; ⑧&rsquo;s cypher quarantine keeps a
          six-figure error class from blinding the per-page tables.
        </li>
        <li>
          In error tables, <strong>divergence between arms</strong> is your
          experiment; same-across-arms is a pre-existing bug to file, not a
          result to report.
        </li>
        <li>
          In ⑩, the <strong>N/A row is the unassigned majority</strong>{" "}
          (baseline, not breakage), and <strong>Frustrated %</strong> is the
          moving signal — Frustr. p75 is mathematically 0 until ~25% of views
          are frustrated.
        </li>
      </ul>
    </div>
  );
}
