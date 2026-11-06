import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const classificationDiagram = String.raw`flowchart TD
  CLICK["User clicks an element\n(trackUserInteractions: true)"] --> RAGE{"Same element clicked\n3+ times in a rolling\n~1 second window?"}
  RAGE -->|"yes"| R["RAGE CLICK\nuser is hammering something\nthat isn't responding fast enough"]
  RAGE -->|"no"| DEAD{"Did the click produce\nany visible page activity?\n(DOM mutation, navigation, scroll)"}
  DEAD -->|"no activity"| D["DEAD CLICK\nuser expected something\nto happen - nothing did"]
  DEAD -->|"activity happened"| ERR{"Did a JS error fire\nright after the click?"}
  ERR -->|"yes"| E["ERROR CLICK\nthe click 'worked' but\nthrew an exception"]
  ERR -->|"no"| OK["Normal action\nno frustration signal"]
  R --> TAG["Action tagged with\n@action.frustration.type\nrolls up to @view.frustration.count\nand @session.frustration.count"]
  D --> TAG
  E --> TAG`;

const triageDiagram = String.raw`flowchart TD
  A["Frustration spike detected\n(dashboard widget or RUM monitor)"] --> B["Aggregate: group signals by\n@view.name then @action.name\nWHERE is it and WHAT element?"]
  B --> C["Split by @action.frustration.type\nthe type is the diagnosis hint"]
  C -->|"rage clicks"| C1["Latency or responsiveness suspect\ncheck INP / long tasks on that view"]
  C -->|"dead clicks"| C2["Affordance or wiring suspect\nnon-interactive element that LOOKS\nclickable, or a broken handler"]
  C -->|"error clicks"| C3["Straight to Error Tracking\ncorrelate with the JS error group"]
  C1 --> D2["Watch 2-3 Session Replays\nat the signal timestamp -\nsignals tell you WHERE,\nreplay tells you WHY"]
  C2 --> D2
  C3 --> D2
  D2 --> E2{"Classify the cause"}
  E2 -->|"real bug"| F1["File with replay link +\nerror group + affected volume"]
  E2 -->|"slow response"| F2["Performance work:\nfix INP / long task,\nfrustration is the symptom"]
  E2 -->|"design affordance"| F3["UX fix: users expect\nthis element to be interactive"]
  E2 -->|"false positive"| F4["Document it: steppers,\ncarousels, rapid legit clicking -\nexclude from dashboards if noisy"]`;

export const toc: TocItem[] = [
  { id: "why-frustration-signals", title: "Why Frustration Signals Exist", level: 2 },
  { id: "the-three-signals", title: "The Three Signals & How They Are Detected", level: 2 },
  { id: "data-model", title: "Where Signals Live in the RUM Data Model", level: 2 },
  { id: "querying", title: "Querying Frustration", level: 2 },
  { id: "measuring-honestly", title: "Measuring Frustration Honestly — Frustrated %", level: 2 },
  { id: "session-replay", title: "Pairing Signals with Session Replay", level: 2 },
  { id: "false-positives", title: "False Positives & Honest Caveats", level: 2 },
  { id: "triage-workflow", title: "The Triage Workflow", level: 2 },
  { id: "experiments-and-alerts", title: "Frustration in Experiments & Alerts", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RumFrustrationSignalsAndUserExperience() {
  return (
    <div className="article-content">
      <p>
        Core Web Vitals tell you whether the page was <em>fast</em>.
        Frustration signals tell you whether the user was <em>suffering</em> —
        and those are not the same thing. A page can post a clean LCP while a
        user hammers a button that silently does nothing. This module covers
        Datadog&rsquo;s three frustration signals end to end: how each is
        detected, where they live in the RUM data model, how to query and
        chart them without lying to yourself, how to pair them with Session
        Replay for root cause, and where they produce false positives you
        must discount.
      </p>

      <h2 id="why-frustration-signals">Why Frustration Signals Exist</h2>
      <p>
        Most RUM telemetry is <em>outcome</em>-shaped: load times, error
        counts, resource timings. Frustration signals are{" "}
        <em>behavior</em>-shaped — they are derived from patterns in how real
        users physically interact with the page. That makes them the closest
        thing observability has to a user emotion metric, and it gives them a
        unique property: they catch problems that produce{" "}
        <strong>no error and no slow metric</strong>. A button whose click
        handler was never wired up throws nothing and loads instantly — only
        a dead click reveals it.
      </p>
      <p>
        They come almost for free: the browser SDK derives them automatically
        once <code>trackUserInteractions: true</code> is set — the same
        option that enables click actions. No custom instrumentation, no
        events to author.
      </p>
      <CodeBlock
        code={`import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: '<APP_ID>',
  clientToken: '<CLIENT_TOKEN>',
  service: 'checkout-web',
  env: 'prod',
  version: '1.42.0',
  trackUserInteractions: true, // actions + frustration signals derive from this
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20, // replay is how you'll DIAGNOSE the signals
});`}
        lang="typescript"
        filename="rum-init.ts — the one option frustration signals need"
      />

      <h2 id="the-three-signals">The Three Signals &amp; How They Are Detected</h2>
      <MermaidDiagram
        chart={classificationDiagram}
        title="How the SDK classifies a click into a frustration signal"
        caption="Detection is heuristic and client-side. Notice rage is about repetition rate, dead is about absence of page activity, and error is about an exception co-occurring with the click — three different failure theories."
        minHeight={480}
      />
      <ArticleTable caption="The three signals — detection rule, what it usually means, and the classic false positive">
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              <th>Detection heuristic</th>
              <th>Usual root cause</th>
              <th>Classic false positive</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Rage click</strong>
              </td>
              <td>Same element clicked 3+ times in a rolling ~1s window</td>
              <td>
                Slow or missing response to the first click — an INP/long-task
                problem wearing a behavioral costume
              </td>
              <td>
                Legitimately rapid clicking: quantity steppers, carousel
                arrows, map zoom, games
              </td>
            </tr>
            <tr>
              <td>
                <strong>Dead click</strong>
              </td>
              <td>
                Click produces no observable page activity (no DOM mutation,
                navigation, or scroll shortly after)
              </td>
              <td>
                Unwired handler, disabled-looking-enabled element, or a
                non-interactive element users <em>expect</em> to be clickable
              </td>
              <td>
                Clicks to dismiss focus, select text, or click whitespace out
                of habit
              </td>
            </tr>
            <tr>
              <td>
                <strong>Error click</strong>
              </td>
              <td>A JS error fires immediately after the click</td>
              <td>
                Broken handler — the strongest of the three signals, since an
                exception is attached
              </td>
              <td>
                Unrelated background error coinciding with the click (rare but
                real on error-noisy pages)
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        A reading that pays off in triage: <strong>the signal type is a
        diagnosis hint.</strong> Rage clicks point at responsiveness (check
        INP and long tasks on that view before blaming the feature). Dead
        clicks point at wiring or affordance. Error clicks hand you the stack
        trace directly. Treating all three as one &ldquo;frustration&rdquo;
        number throws away the most useful bit.
      </p>

      <h2 id="data-model">Where Signals Live in the RUM Data Model</h2>
      <p>
        Frustration signals attach at three levels of the RUM hierarchy, and
        each level answers a different question:
      </p>
      <ul>
        <li>
          <strong>Action level</strong> — the signal itself:{" "}
          <code>@action.frustration.type</code> with values{" "}
          <code>rage_click</code>, <code>dead_click</code>,{" "}
          <code>error_click</code>. One action can carry multiple types (a
          rage click on a broken handler is also an error click). Use this
          level to find <em>which element</em>.
        </li>
        <li>
          <strong>View level</strong> — <code>@view.frustration.count</code>:
          how many signals occurred during one page view. Use this to find{" "}
          <em>which screen</em>, and as the basis for per-page ratios.
        </li>
        <li>
          <strong>Session level</strong> —{" "}
          <code>@session.frustration.count</code>: total signals across a
          user&rsquo;s whole visit. Use this to find <em>how widespread</em>{" "}
          suffering is, and to pick the most painful sessions to replay.
        </li>
      </ul>
      <p>
        The roll-up direction matters for a subtle reason: counts aggregate
        upward, so a single stuck button clicked eight times produces one
        frustrated view with a count of 8 — but still just <em>one</em>{" "}
        frustrated view. Whether you count <em>signals</em> or count{" "}
        <em>frustrated views</em> changes the story, which is the subject of
        the &ldquo;measuring honestly&rdquo; section below.
      </p>

      <h2 id="querying">Querying Frustration</h2>
      <CodeBlock
        code={`# Which elements are users raging on, product-wide? (RUM Explorer / API)
@type:action @action.frustration.type:rage_click env:prod service:checkout-web
  -> group by @action.name (or @action.target.name), sort count desc

# Which views generate the most dead clicks?
@type:action @action.frustration.type:dead_click env:prod service:checkout-web
  -> group by @view.name

# The most painful sessions right now (candidates for replay):
@type:session @session.frustration.count:>3 env:prod service:checkout-web

# Frustrated views on one screen (numerator for a ratio):
@type:view @view.name:"/checkout" @view.frustration.count:>0
  env:prod service:checkout-web`}
        lang="bash"
        filename="the four workhorse queries"
      />
      <p>
        Facet-hygiene notes that separate a clean board from a misleading
        one:
      </p>
      <ul>
        <li>
          <strong>Group by structural facets, never enumerated copy.</strong>{" "}
          <code>group by @action.name</code> surfaces every raging element as
          a row — including ones you didn&rsquo;t predict and locales you
          forgot. A filter pinned to one button&rsquo;s literal text silently
          undercounts every other language and breaks on the next copy
          change.
        </li>
        <li>
          <strong>Scope every query</strong> with <code>env</code> and{" "}
          <code>service</code> inline. Frustration counts blended across
          environments or brands are noise.
        </li>
        <li>
          <strong>Watch aggregation limits.</strong> Aggregation endpoints
          commonly return buckets alphabetically and truncate <em>before</em>{" "}
          sorting by count — a low limit plus a sum is a silent undercount.
          Raise the limit well past your expected cardinality when sweeping a
          facet.
        </li>
      </ul>

      <h2 id="measuring-honestly">Measuring Frustration Honestly — Frustrated %</h2>
      <p>
        Here is the trap nearly every first frustration widget falls into.
        The obvious &ldquo;summary&rdquo; column — a p75 of{" "}
        <code>@view.frustration.count</code> — reads <strong>0</strong> on
        almost every healthy page, and stays 0 through moderately bad
        regressions. The math: frustration count is 0 for most views, so
        unless <em>more than 25% of views</em> have at least one signal, the
        75th percentile of the distribution is exactly 0. The metric only
        wakes up in disaster scenarios — which makes it a smoke alarm, not a
        gauge.
      </p>
      <p>
        The column that actually moves is a <strong>ratio of views</strong>,
        not a percentile of counts:
      </p>
      <CodeBlock
        code={`# Frustrated % — the honest, sensitive frustration metric
f0: count of views WHERE @view.frustration.count:>0   (frustrated views)
f1: count of ALL views                                (same scope)
formula: (f0 / f1) * 100

# Why not avg or p75 of the count?
#  - p75 is mathematically 0 until >25% of views are frustrated
#  - avg is dominated by a few pathological sessions (one user, 40 rage clicks)
# The share-of-views ratio moves smoothly from 2% -> 4% and
# survives single-user outliers.`}
        lang="bash"
        filename="the Frustrated % pattern"
      />
      <p>
        Keep both on a dashboard if you like — the p75 column as the
        catastrophe alarm, Frustrated % as the operating signal — but label
        them so a reader doesn&rsquo;t interpret the permanent 0 as
        &ldquo;no frustration.&rdquo; A note like &ldquo;p75 frustration
        reads 0 below ~25% frustrated share&rdquo; costs one line and
        prevents the most common misreading this metric family has.
      </p>

      <h2 id="session-replay">Pairing Signals with Session Replay</h2>
      <p>
        Signals are quantitative — they tell you <em>where</em> and{" "}
        <em>how much</em>, never <em>why</em>. Replay is the why. The
        workflow: filter sessions by frustration (the{" "}
        <code>@session.frustration.count:&gt;3</code> query above), open the
        replay, and jump to the signal timestamp on the player timeline. Two
        or three replays are usually enough to classify a signal cluster —
        you will physically watch the user click, wait, click again, scroll
        away.
      </p>
      <p>
        Practical constraints to plan around:
      </p>
      <ul>
        <li>
          <strong>Sampling:</strong> <code>sessionReplaySampleRate</code> is
          usually well below 100%, so a specific frustrated session may have
          no replay. You need the <em>class</em> of session replayed, not the
          individual — which is why the count-threshold query matters: it
          finds you the most-instrumented examples of the pattern.
        </li>
        <li>
          <strong>Privacy masking:</strong> replay defaults mask input text.
          On payment or identity forms this is exactly right — but it means
          replay shows you <em>that</em> the user typed and re-typed, not
          what. Diagnose form frustration from the interaction pattern, not
          the content.
        </li>
        <li>
          <strong>Retention:</strong> RUM events age out on the order of ~30
          days. A frustration investigation postponed a month has no data
          left. Export or screenshot findings that need to outlive the
          window.
        </li>
      </ul>

      <h2 id="false-positives">False Positives &amp; Honest Caveats</h2>
      <p>
        Frustration detection is heuristic, and pretending otherwise ruins
        your credibility the first time someone checks. The known
        distortions:
      </p>
      <ul>
        <li>
          <strong>Rapid-legit-clicking UIs</strong> — quantity steppers,
          carousel arrows, map zoom controls, anything game-like — generate
          structural rage clicks forever. Either exclude those elements from
          rage dashboards (by <code>@action.name</code>) or annotate the
          widget; an unexplained permanent baseline teaches readers to
          ignore the metric.
        </li>
        <li>
          <strong>Dead clicks are partly a design instrument.</strong> Users
          dead-click on things that <em>look</em> interactive: underlined
          text, card headers, disabled-styled-as-enabled buttons. That is
          not a bug in the handler — it is evidence about affordance, and it
          is one of the few quantitative UX-design signals observability
          produces. Route those findings to design, not to a bug queue.
        </li>
        <li>
          <strong>A frustration signal is not an error.</strong> Keep the
          two families separate on dashboards. Error widgets answer
          &ldquo;did the code break?&rdquo;; frustration widgets answer
          &ldquo;did the user struggle?&rdquo; — and the most interesting
          incidents are the ones where the second is true and the first is
          not.
        </li>
        <li>
          <strong>Cross-population comparisons need denominators.</strong> A
          page with 10x the traffic will have 10x the raw signals. Always
          compare Frustrated % or signals-per-view, never absolute counts,
          across pages or cohorts.
        </li>
      </ul>

      <h2 id="triage-workflow">The Triage Workflow</h2>
      <MermaidDiagram
        chart={triageDiagram}
        title="From frustration spike to classified cause"
        caption="The signal type routes the investigation: rage → performance first, dead → wiring/affordance, error → Error Tracking. Replay confirms; classification decides who owns the fix. Note that 'false positive' is a legitimate terminal state — document it so the next responder doesn't re-investigate."
        minHeight={520}
      />
      <p>
        The workflow&rsquo;s one non-obvious rule: <strong>aggregate before
        you replay.</strong> Watching replays first anchors you on one
        user&rsquo;s idiosyncrasy; grouping by view and element first tells
        you which pattern is worth the replay time, and how much volume the
        fix is worth.
      </p>

      <h2 id="experiments-and-alerts">Frustration in Experiments &amp; Alerts</h2>
      <p>
        <strong>Experiments.</strong> Frustration is a first-class guardrail
        metric for UI experiments: split Frustrated % by experiment arm
        (filter each column by the variant facet, e.g.{" "}
        <code>@context.experiments.&lt;key&gt;.variantId:&lt;arm&gt;</code>)
        and read <em>divergence between arms</em>. Same-across-arms means a
        pre-existing problem — file it, but it is not your experiment&rsquo;s
        doing. One-arm-only means your treatment introduced friction, and
        this often fires before conversion metrics move, because users
        struggle for a while before they give up.
      </p>
      <p>
        <strong>Alerts.</strong> A RUM monitor can alert on frustration
        directly:
      </p>
      <CodeBlock
        code={`# RUM monitor query — alert when a view's rage clicks jump
rum("@type:action @action.frustration.type:rage_click
     service:checkout-web env:prod @view.name:\\"/checkout\\"")
  .rollup("count").last("15m") > 50

# Guidance:
#  - alert on a SPECIFIC high-value view, not product-wide totals
#    (product-wide baselines drown real spikes in noise)
#  - pair with an INP/long-task monitor on the same view: rage-click
#    spike + INP spike = responsiveness regression, pre-diagnosed`}
        lang="bash"
        filename="alerting on frustration without alert fatigue"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you know users are struggling if nothing is erroring?'"
        intro="This question is testing whether your observability model includes behavior, or stops at errors and latency."
        steps={[
          "Name the gap explicitly: errors and latency are code-outcome metrics; a wired-up-wrong button throws nothing and loads fast. Behavior is the only place that failure is visible.",
          "Introduce the three signals with their detection logic in one line each: rage = 3+ clicks on one element in ~1s; dead = click with no page activity; error = click followed by a JS exception — all derived automatically from trackUserInteractions.",
          "Show you know the signal types are diagnoses, not just counts: rage points at responsiveness (check INP), dead points at wiring or affordance, error hands you the stack trace.",
          "Name the measurement trap unprompted: p75 of frustration count reads 0 until over a quarter of views are frustrated — the honest metric is Frustrated %, the share of views with at least one signal.",
          "Close with the replay pairing: signals quantify and localize, Session Replay explains — aggregate first, then watch two or three replays of the dominant pattern.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: 'Your PM says rage clicks doubled after the release. What do you do?'"
        intro="A debugging-under-pressure question — the interviewer wants a defensible order of operations, not a tool list."
        steps={[
          "Scope it first: group the rage-click actions by @view.name and @action.name — is it one element on one screen, or diffuse? One element = feature regression; diffuse = platform-level slowness.",
          "Check the responsiveness hypothesis before the feature hypothesis: rage clicks are usually INP/long-task problems in disguise. Compare INP on the affected view pre/post release.",
          "Confirm with two or three Session Replays at the signal timestamps — watching the user click-wait-click settles what the numbers only suggest.",
          "Check the false-positive angle honestly: did the release add a stepper, carousel, or other rapid-click UI? A legit new interaction pattern doubles rage clicks with zero user pain.",
          "Only then talk rollback/fix, and state the verification loop: the same Frustrated % widget that caught it, watched back to baseline after the fix ships.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Design Frustration Monitoring for a High-Stakes Checkout"
        scenario={
          <>
            You own frontend observability for <code>checkout-web</code>. Last
            quarter, a payment button shipped with a broken click handler on
            one browser family: no error was thrown, page metrics were clean,
            and the bug lived for nine days until support tickets exposed it.
            Leadership wants a monitoring design that would have caught it in
            hours, plus an honest account of this approach&rsquo;s blind
            spots.
          </>
        }
        tasks={[
          "Specify the SDK configuration required for frustration signals to exist at all, and which sample-rate decisions matter for the diagnosis workflow (not just collection).",
          "Design the dashboard: which frustration metrics per view, which formula for the headline number, and why a p75-of-count column would have stayed at 0 through the entire nine-day incident.",
          "Design the alert that catches the broken-button class of bug specifically, and explain how you keep it from firing on the site's quantity-stepper UI every day.",
          "Walk the first hour of triage when the alert fires: the exact query sequence, when you open Session Replay, and how you distinguish broken-handler from slow-handler from design-affordance causes.",
        ]}
        pitfalls={[
          "Proposing error-rate or latency monitors — the scenario explicitly states the bug threw nothing and loaded fast; that is the entire point of the question.",
          "Using average or p75 frustration count as the headline metric — both are insensitive at realistic frustration rates; the share-of-frustrated-views ratio is the metric that moves.",
          "Alerting on product-wide rage-click totals — baseline noise from legitimate rapid-click UIs drowns the one-button signal; the alert must be scoped per high-value view, with known noisy elements excluded.",
          "Skipping the replay-sampling caveat — with sessionReplaySampleRate well under 100%, the specific complaining user usually has no replay; the workflow must find replayed examples of the pattern instead.",
        ]}
        signal="A strong candidate reasons from the failure mode backward — no error, no slow metric, only behavior reveals it — picks the ratio metric over the percentile for sensitivity reasons they can articulate mathematically, scopes the alert to survive false-positive-heavy UIs, and treats Session Replay as the confirmation step of an aggregate-first workflow rather than the starting point."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. SDK configuration.</strong>{" "}
          <code>trackUserInteractions: true</code> is the prerequisite — it
          enables click actions and the derived frustration signals (rage,
          dead, error clicks). Alongside it: consistent{" "}
          <code>service</code>/<code>env</code>/<code>version</code> tags so
          the release that introduced a regression is identifiable, and a
          deliberate <code>sessionReplaySampleRate</code> (say 20%, with 100%
          session sampling). The replay rate is a <em>diagnosis</em>{" "}
          decision, not a collection one: when a frustration cluster appears,
          you need replayed examples of the pattern to exist. On a
          revenue-critical flow, some teams justify a higher replay rate for
          exactly this reason.
        </p>
        <p>
          <strong>2. Dashboard.</strong> Per high-value view: a Frustrated %
          widget — <code>(views with @view.frustration.count:&gt;0 ÷ all
          views) × 100</code> — as the headline, plus a breakdown of{" "}
          <code>@action.frustration.type</code> grouped by{" "}
          <code>@action.name</code> so the offending element is a row, not a
          filter you had to predict. The p75-of-count column stays 0 through
          the incident because the broken button frustrated well under 25% of
          checkout views (one browser family), and the 75th percentile of a
          mostly-zero distribution is zero — mathematically incapable of
          seeing a minority-population bug. The dead-click share for the
          affected view, by contrast, jumps the day the release ships,
          because every affected user&rsquo;s payment click produced no page
          activity.
        </p>
        <p>
          <strong>3. Alert.</strong> A RUM monitor on{" "}
          <code>@action.frustration.type:dead_click</code> scoped to the
          checkout view (and optionally to the payment button&rsquo;s{" "}
          <code>@action.name</code>), with a threshold set from a week of
          baseline — dead clicks, not rage clicks, because the broken-handler
          failure mode produces clicks with no activity. The stepper problem
          is handled by scoping: the monitor filters to the specific view and
          excludes known rapid-click elements by action name, rather than
          monitoring product-wide totals. Pairing it with an INP monitor on
          the same view pre-diagnoses the alternative: if both fire, it is
          slowness; if only dead clicks fire, it is wiring.
        </p>
        <p>
          <strong>4. First hour.</strong> (1) Group the firing signal by{" "}
          <code>@action.name</code> — one element or many? (2) Split by
          browser/device facets — the scenario&rsquo;s bug was one browser
          family, and this split finds it in minutes. (3) Check INP and long
          tasks on the view to separate slow-handler from broken-handler:
          slow shows degraded INP, broken shows clean INP with dead clicks.
          (4) Query sessions with{" "}
          <code>@session.frustration.count:&gt;3</code> on the view, open two
          or three replays, jump to the signal timestamps, and watch: click →
          nothing → click → abandon confirms broken; click → long freeze →
          rage confirms slow; clicks on a non-interactive element that merely
          looks like a button reclassifies the whole incident as an
          affordance finding for design. Each terminal state has a different
          owner, which is why the classification step is the point of the
          hour.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Frustration signals are <strong>behavior-derived</strong> — they
          catch the failure class that throws no error and posts clean
          performance numbers. <code>trackUserInteractions: true</code> is
          all they need.
        </li>
        <li>
          <strong>The type is the diagnosis hint</strong>: rage → check INP
          and long tasks; dead → wiring or affordance; error → straight to
          Error Tracking.
        </li>
        <li>
          Signals live at three levels — action ({" "}
          <code>@action.frustration.type</code>), view ({" "}
          <code>@view.frustration.count</code>), session — answering{" "}
          <em>which element</em>, <em>which screen</em>,{" "}
          <em>how widespread</em>.
        </li>
        <li>
          <strong>Frustrated % (share of views with ≥1 signal) is the honest
          headline metric.</strong> p75 of the count is mathematically 0
          until over 25% of views are frustrated — a smoke alarm, not a
          gauge.
        </li>
        <li>
          <strong>Aggregate first, replay second.</strong> Signals localize
          and quantify; two or three Session Replays of the dominant pattern
          explain it. Mind replay sampling, masking, and ~30-day retention.
        </li>
        <li>
          Respect the false positives — steppers and carousels rage forever,
          dead clicks double as a UX-affordance instrument — and compare
          populations only with denominators, never raw counts.
        </li>
      </ul>
    </div>
  );
}
