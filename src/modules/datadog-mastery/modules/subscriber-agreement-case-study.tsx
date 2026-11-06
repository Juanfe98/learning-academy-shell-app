import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const guardLoopDiagram = String.raw`flowchart TD
  AUTH["User finishes auth<br/>(sign-up or login)"] --> BILL["/commerce/billing<br/>(shows loader, NOT content)"]
  BILL --> G1{"1. DOB on profile?"}
  G1 -->|"no"| DOB["/identity/sign-up/missing-info"]
  G1 -->|"yes"| G2{"2. Marketing opt-in pending?"}
  G2 -->|"yes"| RAA["/identity/review-and-accept"]
  G2 -->|"no"| G3{"3. SA review required?<br/>region config OR flagged doc"}
  G3 -->|"yes"| SA["/identity/subscriber-agreement<br/>(referrer stashed = billing)"]
  G3 -->|"no"| SHOP["billing content renders —<br/>user finally sees plans"]
  DOB --> BILL
  RAA --> BILL
  SA -->|"Concordar e Continuar click<br/>isSAReviewComplete = true"| BILL`;

const restructureDiagram = String.raw`flowchart LR
  subgraph BEFORE["BEFORE — every page repeats 5 widgets"]
    A1["① Email<br/>views · funnel · errors<br/>modal · p75"]
    A2["② Consent<br/>views · funnel · errors<br/>accepts · p75"]
    A3["…× 8 pages<br/>= 40-widget wall"]
  end
  subgraph AFTER["AFTER — group by TYPE (Natalya's shape)"]
    B1["① Email — views · accepts"]
    B2["② Consent — views · accepts"]
    B3["③ Funnels — one per path"]
    B4["④ Errors — one table per page"]
    B5["⑤ Performance — one p75 per page"]
  end
  BEFORE ==>|"'as the scope expands…'"| AFTER`;

const templateCloneDiagram = String.raw`flowchart TD
  T["TEMPLATE dashboard (what we build)<br/>example experiment as crash-test dummy<br/>funnels route-level, all traffic"]
  T -->|"experiment owner clones"| C1["CLONE for experiment X<br/>find/replace: key · variants · region<br/>(+ button copy on identity pages)"]
  C1 --> S["split the touched funnel:<br/>one copy per variant leg"]
  S --> RUN["monitor while experiment runs"]
  RUN --> ARCH["archive clone when done"]
  T -->|"template never changes"| T2["stays pristine for the next clone"]`;

const funnelReadingDiagram = String.raw`flowchart LR
  subgraph EMAIL["Email funnel — LOW % is normal"]
    E1["enter-email<br/>100%"] -->|"15.8%"| E2["create-password"]
    E1 -.->|"existing emails divert<br/>to LOGIN (not failures!)"| E3["login flow"]
  end
  subgraph CONSENT["Consent funnel — HIGH % is normal"]
    C1["subscriber-agreement<br/>100%"] -->|"~91%"| C2["billing"]
    C1 -.->|"drop = real abandonment<br/>or errors"| C3["gone"]
  end`;

export const toc: TocItem[] = [
  { id: "intro", title: "Where This Picks Up", level: 2 },
  { id: "the-page", title: "What the Subscriber Agreement Page Actually Is", level: 2 },
  { id: "two-triggers", title: "The Two Triggers (and Re-Acceptance Waves)", level: 3 },
  { id: "where-config-lives", title: "Where the Country List Lives", level: 3 },
  { id: "anchor-market", title: "The Anchor-Market Decision", level: 2 },
  { id: "data-beats-guesses", title: "Data Beats Guesses — Twice", level: 3 },
  { id: "crash-dummy", title: "“We're Not Even Adding the Experiment?”", level: 2 },
  { id: "restructure", title: "Decoding Natalya's Review Comment", level: 2 },
  { id: "widget-anatomy", title: "Widget Anatomy: Views & Accepts", level: 2 },
  { id: "localized-clicks", title: "The Localized Click-Name Trap", level: 3 },
  { id: "funnels", title: "Funnels, Properly Understood", level: 2 },
  { id: "variant-split", title: "“Add a .variantId Filter” — the Clone Ritual", level: 3 },
  { id: "errors", title: "The Errors Section & the Noise Filter", level: 2 },
  { id: "reading-errors", title: "Reading an Error Table Like a Human", level: 3 },
  { id: "p75", title: "p75: the Silent-Regression Detector", level: 2 },
  { id: "answering-questions", title: "Answering Questions About This Work", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SubscriberAgreementCaseStudy() {
  return (
    <div className="article-content">
      <p>
        This is the second case study in the D+ Signup dashboard series (GREAT-1132), and it&apos;s
        written the way the work actually happened: as a conversation. The first case study built
        section ① for the Email Screen. This ticket added section ② for the Subscriber Agreement
        Consent page — and, mid-flight, a review comment from the dashboard&apos;s owner changed the
        target structure of the whole dashboard. Both stories are here, plus every &quot;wait,
        what does that mean?&quot; question that came up along the way, because those questions are
        exactly what someone will ask you.
      </p>

      <h2 id="intro">Where This Picks Up</h2>
      <p>
        Quick recap of the model: we build <strong>template</strong> dashboards — one per product
        flow — pre-wired with monitoring widgets. When a team runs a real experiment, they{" "}
        <strong>clone</strong> the template and find/replace a handful of example values. Section ①
        proved the pattern on the email screen. GREAT-1132 repeats it for the consent page, which
        turned out to be a much more interesting page than it looks.
      </p>

      <h2 id="the-page">What the Subscriber Agreement Page Actually Is</h2>
      <p>
        <code>/identity/subscriber-agreement</code> is a full-page legal wall: the subscriber
        agreement text, a stepper, and one button. It sits at the seam between identity and
        commerce — the user has already created their account (email, password, DOB) and is on
        their way to pay. It is <em>not</em> rendered as a normal step in a page sequence; it&apos;s
        a <strong>guard</strong>. The billing page, before showing any plans, runs three checks in
        strict order and bounces the user out to fix whatever is missing:
      </p>
      <MermaidDiagram
        chart={guardLoopDiagram}
        title="The Billing Guard Loop"
        caption="The user 'visits billing twice' without ever noticing: guards run behind a loader, the consent page stashes billing as its return anchor, and the accept click flips an atom so the re-check passes."
        minHeight={520}
      />
      <p>
        From the user&apos;s seat in Brazil: password created → brief spinner → agreement page →
        one click on <em>Concordar e Continuar</em> → billing with plans. The consent page is the
        <strong> last gate before checkout</strong> — nothing stands between an accepted agreement
        and the plan picker.
      </p>

      <h3 id="two-triggers">The Two Triggers (and Re-Acceptance Waves)</h3>
      <p>
        &quot;So this page never shows in the US?&quot; — <em>almost</em> never, and the precision
        matters. The deciding selector has two independent triggers, OR-ed together:
      </p>
      <CodeBlock
        code={`// cgi-web · packages/identity-auth/src/common/selectors/forced-subscriber-review-selector.ts
const isSubscriberAgreementRequired = ({
  isInForcedSubscriberAgreementRegion,  // trigger 1: per-country remote config
  isSubscriberReviewComplete,           // atom — flipped by the accept click
  meQueryResponse,                      // legal documents from the identity backend
}) => {
  const isReviewRequired = !!meQueryResponse?.me.documents?.legal.find(
    (item) => !!item.requiresActiveReview  // trigger 2: a doc flagged for re-review
  );
  return (
    !isSubscriberReviewComplete &&
    (isInForcedSubscriberAgreementRegion || isReviewRequired)
  );
};`}
        lang="typescript"
        filename="forced-subscriber-review-selector.ts"
      />
      <ul>
        <li>
          <strong>Trigger 1 — region config.</strong> A per-country boolean. ON in Brazil, Mexico,
          Germany and friends; OFF in the US. This is the everyday trigger: new subscribers in
          forced-SA markets see the page mid-signup. US users only ever meet the agreement as
          inline legalese in the fine print.
        </li>
        <li>
          <strong>Trigger 2 — a flagged legal doc.</strong> Market-independent. When legal updates
          the agreement and flags it <code>requiresActiveReview</code>, <em>existing</em>{" "}
          subscribers get bounced through the page on their next trip to billing. Consequence for
          monitoring: <strong>traffic spikes on section ② are expected behavior</strong> during
          re-acceptance waves — not incidents. That caveat is written into the dashboard header.
        </li>
      </ul>

      <h3 id="where-config-lives">Where the Country List Lives</h3>
      <p>
        Not in code, and not in a normal feature flag. <code>requiresForcedSubscriberAgreement</code>{" "}
        is a per-country entry in the <strong>Sparrow</strong> remote config (the commerce
        workspace), shaped like{" "}
        <code>countries.BR.commerce.featureFlags.requiresForcedSubscriberAgreement: true</code>,
        with territory inheritance (Puerto Rico inherits US values unless overridden). Flipping a
        market = a config edit, no deploy, no PR. Three flag systems coexist in cgi-web — keep them
        straight when someone asks:
      </p>
      <ArticleTable caption="The three flag systems in cgi-web." minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th>Shape</th>
              <th>Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sparrow commerce config</td>
              <td>per-country values, territory inheritance</td>
              <td>product behavior by market (this page&apos;s trigger)</td>
            </tr>
            <tr>
              <td>Mystique flags (<code>wpnx-*</code>)</td>
              <td>boolean gates</td>
              <td>rollouts and kill-switches (e.g. the Identity V5 SDK gate)</td>
            </tr>
            <tr>
              <td>WeaponX experiments</td>
              <td>variants (<code>control</code> / treatments)</td>
              <td>A/B tests — what these dashboards monitor</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="anchor-market">The Anchor-Market Decision</h2>
      <p>
        Section ①&apos;s widgets are US-anchored. Copying that for section ② would have produced a
        wall of empty widgets, because production RUM says the consent page&apos;s traffic is:
      </p>
      <ArticleTable
        caption="Page views by country, 2-day window. The US number is VPNs and travelers, not a real flow."
        minWidth={520}
      >
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Share of views</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Brazil</td><td>18.3%</td></tr>
            <tr><td>Mexico</td><td>12.4%</td></tr>
            <tr><td>Germany</td><td>9.4%</td></tr>
            <tr><td>France</td><td>7.6%</td></tr>
            <tr><td>Poland</td><td>7.4%</td></tr>
            <tr><td><strong>United States</strong></td><td><strong>0.36%</strong></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        So section ② anchors on <strong>Brazil</strong> — top market, and (not a coincidence) the
        market of the example experiment we chose. &quot;Region scope&quot; stays a replace-field
        for cloners exactly like the donor sections; only the example value differs.
      </p>

      <h3 id="data-beats-guesses">Data Beats Guesses — Twice</h3>
      <p>
        Two moments in this ticket where querying beat assuming, both worth retelling in a review:
      </p>
      <ul>
        <li>
          <strong>The button is &quot;CONCORDAR&quot;, not &quot;ACEITAR&quot;.</strong> A
          translation guess said the Brazilian accept button would read <em>Aceitar e
          Continuar</em>. The RUM data said the real copy is{" "}
          <code>click on CONCORDAR E CONTINUAR</code> (20k clicks in 2 days). Widgets built on the
          guess would have counted zero, forever, silently.
        </li>
        <li>
          <strong>Aggregation buckets are not server-sorted.</strong> A global action query with{" "}
          <code>--limit 50</code> returned an <em>arbitrary</em> 50 buckets — and hid the 20k-row
          Brazilian accept action entirely. The fix: filter to the anchor market (or crank the
          limit and sort client-side) before concluding anything is &quot;missing&quot;.
        </li>
      </ul>

      <h2 id="crash-dummy">&quot;We&apos;re Not Even Adding the Experiment?&quot;</h2>
      <p>
        The best question of the build. The widgets say &quot;Control vs Treatment&quot; — but
        no experiment of ours runs on this page. Missing something? No: <strong>the example
        experiment is a crash-test dummy.</strong> A template&apos;s widgets can&apos;t be empty
        (the acceptance criteria literally require proving that facets return data) and can&apos;t
        be fake. So we plug in a <em>real, live</em> experiment whose users flow through the page —
        here <code>wpnx-Brazil-CEP-Collection-on-SUF-Ledger</code>, a Brazilian signup-flow test —
        purely to demonstrate that the queries work and to show what healthy looks like.
      </p>
      <p>
        Two details make this one a <em>better</em> dummy than section ①&apos;s:
      </p>
      <ul>
        <li>
          It&apos;s a true ~50/50 A/B (6,854 control vs 6,967 treatment views in the validation
          window), so <strong>both</strong> columns show live numbers. Section ①&apos;s example is
          a 100%-ON rollout, so its Control column reads &quot;–&quot; — correct, but it needs a
          header caveat to explain itself.
        </li>
        <li>
          It doesn&apos;t even target this page (it tests a zip-code form on the payment ledger).
          Irrelevant — a dummy only has to be real and pass through. That deviation is documented
          openly in the design notes rather than hidden.
        </li>
      </ul>
      <MermaidDiagram
        chart={templateCloneDiagram}
        title="Template vs Clone Lifecycle"
        caption="The template never accumulates experiment-specific clutter. All growth happens in disposable clones."
        minHeight={420}
      />

      <h2 id="restructure">Decoding Natalya&apos;s Review Comment</h2>
      <p>
        Mid-ticket, the dashboard owner approved section ① and added direction. Decoded, her
        comment is three grouping instructions, all the same idea — <em>stop repeating per page,
        group by type</em>:
      </p>
      <ol>
        <li><strong>Funnels</strong> → one section, funnels span pages by nature.</li>
        <li><strong>Errors</strong> → one section, one table per page: a single debugging wall.</li>
        <li><strong>Performance</strong> → one section, all p75s side by side.</li>
      </ol>
      <MermaidDiagram
        chart={restructureDiagram}
        title="The Restructure"
        caption="With 8 page-sections × 5 widgets, comparing anything across pages means scrolling a 40-widget wall. Grouped by type, each question has one place to look."
        minHeight={420}
      />
      <p>
        Her reference dashboards (D+ Retention, D+ Welcome Back/Reconnects) already converged on
        this shape — we fetched both as JSON and verified the conventions from widget internals
        before rebuilding, rather than eyeballing screenshots. Page sections stay, but slim: views
        + interactions only (&quot;is this page alive and doing its job?&quot;). And a practical
        detail: section numbers (③④⑤…) get renumbered as page sections are inserted by later
        tickets — trivial, since every ticket rewrites the dashboard JSON anyway.
      </p>

      <h2 id="widget-anatomy">Widget Anatomy: Views & Accepts</h2>
      <p>
        The two page-section widgets are the same species: a <code>query_table</code> with two
        hand-written queries, one per column. Here is the accepts widget&apos;s control column,
        annotated:
      </p>
      <CodeBlock
        code={`@type:action                                      ← click events (views widget says @type:view)
@action.name:"click on CONCORDAR E CONTINUAR"     ← this exact button (see the trap below)
@view.name:"/identity/subscriber-agreement"       ← only our page
service:web-solo-commerce-disneyplus              ← only the D+ web app
@geo.country:"Brazil"                             ← anchor market
env:prod                                          ← real users
@context.experiments.wpnx-Brazil-CEP-Collection-on-SUF-Ledger.variantId:control
                                                  ← only this experiment leg`}
        lang="bash"
        filename="W4 'Agreement Accepts by Variant' — c0 (Control) query"
      />
      <p>
        Why two hand-written queries instead of &quot;group by variantId&quot;? Auto-grouping
        yields raw machine labels, count-based ordering, and a giant N/A row for users in neither
        leg. Fixed columns give clean aliases in a fixed order. Team convention, everywhere.
      </p>
      <p>
        Reading the pair: views ≈ 6.9k, accepts ≈ 6.5k per variant per 2 days →{" "}
        <strong>~95% accept rate</strong>, which is exactly what a legal wall should do. The health
        signal is never the absolute number — it&apos;s <em>divergence between the columns</em>.
      </p>

      <h3 id="localized-clicks">The Localized Click-Name Trap</h3>
      <p>
        Commerce pages emit stable machine labels for clicks (<code>@context.actionKey:
        selectPlanSignup</code>) — same label in every language. <strong>Identity pages
        don&apos;t have that layer.</strong> The only handle on a click is{" "}
        <code>@action.name</code>, which Datadog auto-fills with the button&apos;s{" "}
        <em>visible text</em> — localized. Two consequences, both worth a ⚠️ in the dashboard
        header:
      </p>
      <ul>
        <li>
          A cloner monitoring a Mexico experiment must swap the string to{" "}
          <code>ACEPTAR Y CONTINUAR</code> — country filter alone is not enough. It&apos;s a
          fourth replace-field, unique to identity pages.
        </li>
        <li>
          If UX rewords the button, the widget silently flatlines while users click happily.
          Diagnostic: <strong>accepts flat at zero + views healthy = check the button copy first,
          not the servers.</strong>
        </li>
      </ul>

      <h2 id="funnels">Funnels, Properly Understood</h2>
      <p>
        A funnel counts how many users move from step A to step B, in order, following the{" "}
        <em>same user</em> across pages via their session — the one widget type that measures a
        journey instead of a page. Steps are <code>@view.name</code> values; pages visited in
        between don&apos;t break the chain; the gap between bars is everyone who left, for any
        reason. A funnel is a smoke detector — the errors section is where you look for the fire.
      </p>
      <MermaidDiagram
        chart={funnelReadingDiagram}
        title="Every Funnel Has Its Own 'Normal'"
        caption="The email funnel reads ~16% because existing emails divert to login (successes counted as drop-off). The consent funnel reads ~91% because returning to billing is nearly automatic. Low is not bad, high is not good — knowing each funnel's baseline is the skill."
        minHeight={380}
      />
      <p>
        Section ③&apos;s conventions, verified from the reference dashboards&apos; JSON:
        funnels ship <strong>route-level</strong> — no variant filter, all traffic — and there is{" "}
        <strong>one funnel per path/branch</strong>, never one giant strict funnel (a regional step
        like consent would zero-out every market that skips it). Our consent funnel also carries no
        geo filter (&quot;regional page, all geo&quot;): the page already self-selects its markets,
        and an unfiltered funnel catches a Germany-only breakage that a Brazil-filtered one would
        miss. Its neighbors in section ② <em>are</em> Brazil-filtered — because they&apos;re split
        by a Brazil-only experiment, and unfiltered variant columns would be diluted by traffic
        that can&apos;t be enrolled. Scope difference, honestly labeled in the title.
      </p>

      <h3 id="variant-split">&quot;Add a .variantId Filter&quot; — the Clone Ritual</h3>
      <p>
        The section note tells cloners: <em>route-level (all traffic) — add a `.variantId` filter
        to a funnel query to compare variants.</em> Concretely:
      </p>
      <CodeBlock
        code={`# Template ships (everyone blended — control + treatment + not-enrolled):
env:prod service:web-solo-commerce-disneyplus
steps: /identity/subscriber-agreement → /commerce/billing

# Clone: duplicate the widget once per leg, append the variant to each copy:
env:prod service:web-solo-commerce-disneyplus @context.experiments.wpnx-MY-EXP.variantId:control
env:prod service:web-solo-commerce-disneyplus @context.experiments.wpnx-MY-EXP.variantId:treatment

# Read side by side:
# CONTROL:    consent 10,000 → billing 9,200  (92%)
# TREATMENT:  consent 10,100 → billing 7,300  (72%)  ← the experiment broke the return leg`}
        lang="bash"
        filename="the 30-second funnel split"
      />
      <p>
        One duplicated widget per variant leg (2-leg experiment → 2 funnels, 3 legs → 3), and only
        for the path the experiment touches. The template itself never grows: clones are
        disposable, archived when the experiment ends.
      </p>

      <h2 id="errors">The Errors Section & the Noise Filter</h2>
      <p>
        Each page gets one table: top-10 error <em>messages</em>, with a count per variant. The
        query carries <code>@error.source:(custom OR report OR console)</code> — the noise filter.
        Every RUM error is labeled with where it came from:
      </p>
      <ArticleTable caption="@error.source values — what the filter keeps and drops." minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Meaning</th>
              <th>Kept?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>custom</code></td>
              <td>the app deliberately reported it (<code>datadogRum.addError(...)</code>)</td>
              <td>✅ highest-quality signal</td>
            </tr>
            <tr>
              <td><code>console</code></td>
              <td>the app printed <code>console.error(...)</code></td>
              <td>✅ developer-authored</td>
            </tr>
            <tr>
              <td><code>report</code></td>
              <td>browser-generated structured reports (crashed frames, policy violations)</td>
              <td>✅</td>
            </tr>
            <tr>
              <td><code>network</code></td>
              <td>every failed HTTP request — mostly ad-blockers killing trackers, flaky mobile</td>
              <td>❌ mountains, ~none actionable</td>
            </tr>
            <tr>
              <td><code>source</code></td>
              <td>raw uncaught JS from <em>any</em> script — including users&apos; browser extensions</td>
              <td>❌ not our code</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Plain-language version for the header: <em>only errors the app itself chose to tell us
        about — not the internet&apos;s background static.</em> Identity pages log millions of junk
        errors a day; without the filter, a real bug drowns on row 47 under{" "}
        <code>Failed to fetch doubleclick.net</code>.
      </p>

      <h3 id="reading-errors">Reading an Error Table Like a Human</h3>
      <ul>
        <li>
          <strong>Rows = distinct messages, cells = counts.</strong> A one-row table isn&apos;t
          broken — it means one error type fired in the selected time window. Shorten the
          dashboard&apos;s time picker and rows shrink; that&apos;s the window, not the widget.
        </li>
        <li>
          <strong>A nearly-empty table is success.</strong> It means the noise filter is working
          and the page is healthy. Errors existing ≠ problem — the consent page&apos;s baseline is
          ~900 app-reported errors/day per variant. Web is noisy.
        </li>
        <li>
          <strong>The signal is asymmetry.</strong> Live example from day one: {" "}
          <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> (the page asked for a translation key that
          doesn&apos;t exist in pt-BR) showed Control 3 vs Treatment 16. At those volumes: random
          noise, cosmetic. At 300 vs 1,600: file a ticket against the experiment. Same pattern,
          different magnitude — the table&apos;s whole job is making that pattern visible.
        </li>
      </ul>

      <h2 id="p75">p75: the Silent-Regression Detector</h2>
      <p>
        Line up all page loads fastest → slowest and take the value at the 75% mark: &quot;p75 =
        1.5s&quot; means <strong>3 out of 4 users got the page faster than 1.5s</strong>. Not an
        average, on purpose — one user on hotel wifi taking 90 seconds wrecks an average but
        can&apos;t touch a percentile. Why it&apos;s on an <em>experiment</em> dashboard:
        experiments add code (a banner, an extra API call). If the treatment&apos;s p75 creeps
        above control&apos;s with zero errors anywhere, the experiment is still hurting users —
        and only this widget notices. Consent-page baseline at build time: ~1.53s control vs
        ~1.56s treatment. Datadog stores nanoseconds; the widget formats seconds.
      </p>

      <h2 id="answering-questions">Answering Questions About This Work</h2>
      <p>
        The compressed Q&amp;A — the questions you&apos;re most likely to get, with the one-breath
        answers:
      </p>
      <ArticleTable caption="Field guide." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Answer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Why is the example experiment about a different page?</td>
              <td>
                It&apos;s a crash-test dummy: any real experiment flowing through the page proves
                the queries work. Cloners replace it.
              </td>
            </tr>
            <tr>
              <td>Why Brazil and not US?</td>
              <td>
                US never forces the standalone review (0.36% of views = VPN noise). Brazil is the
                top market and matches the example experiment.
              </td>
            </tr>
            <tr>
              <td>Why is the funnel not split by variant?</td>
              <td>
                Funnels ship route-level for flow health; splitting is a 30-second clone-time edit
                (duplicate + <code>.variantId</code> per leg).
              </td>
            </tr>
            <tr>
              <td>Why does the email funnel read only ~16%?</td>
              <td>
                Existing emails divert to login and count as drop-off. New-accounts-only funnel;
                low is its normal.
              </td>
            </tr>
            <tr>
              <td>Section ② traffic just spiked — incident?</td>
              <td>
                Check for a legal-doc update first: <code>requiresActiveReview</code> waves push
                existing subscribers through. Expected.
              </td>
            </tr>
            <tr>
              <td>Accepts flatlined but views are healthy?</td>
              <td>
                The button copy probably changed — the click widget matches localized button text
                literally. Check copy before servers.
              </td>
            </tr>
            <tr>
              <td>Who decides which countries see the page?</td>
              <td>
                Sparrow remote config, per-country boolean with territory inheritance. Config edit,
                no deploy.
              </td>
            </tr>
            <tr>
              <td>What&apos;s a &quot;donor&quot;?</td>
              <td>
                Working slang: the existing approved widget whose JSON we copy and value-swap, so
                style never drifts and mistakes can only hide in the swapped values.
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The consent page is a <strong>billing guard</strong>, not a flow step: DOB → marketing
          opt-in → subscriber agreement, then checkout. Two triggers — per-country Sparrow config,
          or a legal doc flagged for active review (which also produces expected re-acceptance
          traffic waves).
        </li>
        <li>
          <strong>Anchor regional pages on a market that actually renders them.</strong> US-anchored
          queries against this page return noise. Brazil is the anchor; the RUM country table is
          the source of truth for where a config is really ON.
        </li>
        <li>
          The example experiment is a <strong>crash-test dummy</strong> — real, live, flowing
          through the page — so every widget provably returns data. A true A/B beats a 100%
          rollout as the example, because both columns show numbers.
        </li>
        <li>
          Dashboard structure groups by <strong>type</strong>, not page: slim page sections, then
          flow-level Funnels (route-level, one per path), Errors (one table per page,
          noise-filtered), Performance (one p75 per page).
        </li>
        <li>
          Identity pages have no <code>actionKey</code>: click widgets match <strong>localized
          button text</strong>, which adds a per-market replace-field and a known flatline failure
          mode.
        </li>
        <li>
          Query before assuming: the accept button says CONCORDAR (not the guessed ACEITAR), and
          unsorted aggregation buckets can hide a 20k-row action at low limits.
        </li>
        <li>
          Every funnel has its own normal (~16% email, ~91% consent). The monitoring skill is
          knowing baselines and watching for <strong>asymmetry between variants</strong>, not
          absolute numbers.
        </li>
      </ul>
    </div>
  );
}
