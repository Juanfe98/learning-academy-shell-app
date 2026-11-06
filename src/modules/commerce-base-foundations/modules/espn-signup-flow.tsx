import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const flowDiagram = String.raw`flowchart TD
  A["Contextualization takeover<br/>on www.espn.com — 'READY. SET. STREAM.'<br/>(ESPN org · outside our RUM)"] -->|"Browse Plans"| B["Plan card page<br/>plus.espn.com — service:espn-nexus<br/>(generic RUM only, no experiment tags)"]
  A -->|"Log in with MyDisney"| C
  B --> C["/identity/login → /identity/loading<br/>MyDisney auth (conditional — skipped if logged in)"]
  C --> D["/commerce/add-ons<br/>optional step — IN SCOPE"]
  C --> E["/commerce/billing ('ledger')"]
  D --> E
  E --> F["/commerce/success"]
  G["/commerce/redeem<br/>gift / promo codes — scope TBD"] -.side path.-> E
  H["/commerce/activate/*<br/>partner activations — IN SCOPE,<br/>separate flow from contextualization"] -.-> F`;

const authHandoff = String.raw`sequenceDiagram
  participant U as Browser
  participant E as www.espn.com (ESPN org)
  participant N as plus.espn.com (Nexus)
  participant C as CUP (web-solo-commerce-espn)
  U->>E: shows purchase intent → contextualization takeover
  E->>N: "Browse Plans" → plan card page
  N->>C: plan picked → /identity/login (MyDisney)
  C->>C: /identity/loading → [add-ons] → billing → SIGNUP_SUCCESS
  C-->>U: /commerce/success`;

export const toc: TocItem[] = [
  { id: "flow-at-a-glance", title: "The Flow at a Glance", level: 2 },
  { id: "scope-decisions", title: "Scope Decisions (PM-Confirmed)", level: 2 },
  { id: "espn-vs-dplus", title: "Where ESPN Differs from D+", level: 2 },
  { id: "observability-boundaries", title: "Observability Boundaries", level: 2 },
  { id: "facet-cheat-sheet", title: "RUM Facet Cheat Sheet", level: 2 },
  { id: "example-experiment", title: "The Example Experiment", level: 2 },
  { id: "geo-story", title: "The Geo Story", level: 2 },
  { id: "open-questions", title: "Open Questions", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnSignupFlow() {
  return (
    <div className="article-content">
      <p>
        This module captures the investigation behind the ESPN Signup
        experiment-monitoring template (GREAT-1155, dashboard{" "}
        <code>spg-pqf-s6u</code>) — the first ESPN board of the XD
        Experimentation template family. It combines live production RUM
        verification (2026-08-25) with PM scoping answers from Marissa
        Paragano. For the broader ESPN domain/platform picture, see the{" "}
        <strong>ESPN Architecture</strong> academy&apos;s &quot;Three Domains
        of ESPN Web&quot; module.
      </p>

      <h2 id="flow-at-a-glance">The Flow at a Glance</h2>
      <p>
        The PM-confirmed flow starts one screen earlier than commerce: at the{" "}
        <strong>contextualization takeover</strong> on www.espn.com (the
        &quot;traffic cop&quot; — product teams consider it the start of{" "}
        <em>all</em> their flows). From there: plan cards on plus.espn.com,
        then MyDisney login (conditional — skipped when already
        authenticated), then the commerce tail on CUP. Mobile web = desktop
        web.
      </p>
      <MermaidDiagram
        chart={flowDiagram}
        title="ESPN Web Signup Flow (PM-confirmed, RUM-annotated)"
        caption="Each box notes which platform serves it and how visible it is to our RUM. 'Ledger' is product vocabulary for the billing page."
        minHeight={480}
      />

      <h2 id="scope-decisions">Scope Decisions (PM-Confirmed)</h2>
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Answer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Add-ons step in scope?</td>
            <td>
              <strong>Yes</strong> — part of the flow
            </td>
          </tr>
          <tr>
            <td>Partner activations in scope?</td>
            <td>
              <strong>Yes</strong> — but a <em>different flow</em> that also
              starts at contextualization (TV-provider path splits into
              partner activation vs TVE)
            </td>
          </tr>
          <tr>
            <td>Where does the flow start?</td>
            <td>
              <strong>Contextualization</strong> — &quot;typically the screen
              where we start all of our flows&quot;
            </td>
          </tr>
          <tr>
            <td>
              <code>/commerce/redeem</code> in scope?
            </td>
            <td>Still unanswered — open item</td>
          </tr>
        </tbody>
      </table>
      <p>
        Behavior parity confirmed with D+: signing in with an email that
        isn&apos;t in the system silently routes the user into sign-up.
      </p>

      <h2 id="espn-vs-dplus">Where ESPN Differs from D+</h2>
      <p>
        On D+, identity steps (enter-email, create-password, DOB) are CUP
        pages with their own RUM views, and plan selection is a CUP page
        (<code>/commerce/plans</code>). On ESPN, identity is delegated to{" "}
        <strong>MyDisney</strong> auth entered via espn.com, and plan selection
        happens on the <strong>Nexus-served plan card page</strong> before
        commerce loads. The CUP footprint is therefore much smaller: login →
        loading → add-ons → billing → success.
      </p>
      <MermaidDiagram
        chart={authHandoff}
        title="Domain Handoffs into CUP"
        caption="CUP first sees the user at /identity/login. Everything earlier lives on other platforms with other owners."
        minHeight={380}
      />

      <h2 id="observability-boundaries">Observability Boundaries</h2>
      <p>
        The three flow layers have three different levels of visibility in our
        Datadog org — this shapes what any dashboard can show:
      </p>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Where it lives</th>
            <th>What our org can see</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Contextualization takeover</td>
            <td>www.espn.com (ESPN org)</td>
            <td>
              <strong>Nothing.</strong> No RUM events reach our org (verified
              by host-level sweep — only a DisneyID auth iframe reports). If
              ESPN tracks it, it&apos;s in their own tooling — and Datadog
              cannot query across orgs anyway. Boards reference it in a note
              only. ⚠️ The <code>espn.com/purchase</code> URL seen in design
              mockups is not a real route — the screen is a JS takeover with
              no dedicated URL.
            </td>
          </tr>
          <tr>
            <td>Plan card page</td>
            <td>
              plus.espn.com (Nexus) — <code>service:espn-nexus</code>
            </td>
            <td>
              <strong>Generic metrics only:</strong> views (~36K/7d on{" "}
              <code>&quot;/&quot;</code>), per-plan price clicks, errors,
              performance. Events carry <em>no experiments context</em> — the
              Nexus platform never wires WeaponX assignments into RUM, so
              variant splits are impossible here.
            </td>
          </tr>
          <tr>
            <td>Login → success</td>
            <td>
              CUP (cgi-web) — <code>service:web-solo-commerce-espn</code>
            </td>
            <td>
              <strong>Everything</strong> — generic metrics plus full WeaponX
              variant breakdowns (cgi-web&apos;s Datadog context provider sets
              the <code>experiments</code> map on every event).
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Why the difference is structural, not fixable from our side: RUM data
        exists only where a page&apos;s own code initializes the SDK with our
        org&apos;s client token, and experiment tags exist only where that code
        also sets the experiments context (cgi-web does both in{" "}
        <code>packages/observe/src/observe.ts</code> and{" "}
        <code>
          packages/cgi/commerce-base/src/common/context/datadog/datadog.tsx
        </code>
        ). Changing what espn.com or Nexus emit requires changes in{" "}
        <em>their</em> codebases.
      </p>

      <h2 id="facet-cheat-sheet">RUM Facet Cheat Sheet</h2>
      <CodeBlock
        code={`# CUP commerce tail (login → success):
service:web-solo-commerce-espn env:prod
# Plan card page (generic only, no experiment facets):
service:espn-nexus env:prod @view.name:"/"
# CUP app id (shared with D+ and Hulu — do NOT use as brand selector):
@application.id:1ac57431-a76e-4a27-a79e-cb2bcccd4ba4   # "Web Commerce Client"

# Key outcome actions (7d volumes at time of investigation):
@action.name:SIGNUP_SUCCESS                  # 7.0K — completed signups
@action.name:SUBSCRIPTION_SUCCESS_PAGE_VIEW  # 8.4K — success page render
@action.name:TOKENIZE_PAYMENT_SUCCESS        # 11K  — payment tokenized
@action.name:SUCCESSFUL_ACTIVATION           # 4.3K — partner activations (separate journey)

# Experiment facet — WeaponX style (with .variantId, like D+; NOT Hulu's flat map):
@context.experiments.<KEY>.variantId:<variant>

# Locale note: /es-419/* Spanish routes exist in raw URLs, but @view.name is
# normalized (locale stripped) — one view name per page, no twin-route handling.`}
        lang="bash"
        filename="espn-rum-facets.txt"
      />

      <h2 id="example-experiment">The Example Experiment</h2>
      <p>
        <code>wpnx-ESPN-Generic-Entry-Plan-Order</code> is the template&apos;s
        example key: a real 3-arm A/B (<code>control</code> ·{" "}
        <code>ascending-price-order</code> · <code>descending-price-order</code>)
        testing plan-card ordering. Verified per-page assignment over 7 days
        shows even splits on every CUP page:
      </p>
      <CodeBlock
        code={`/identity/login       control 1,990 · asc 2,042 · desc 2,153
/identity/loading     control 1,661 · asc 1,656 · desc 1,726
/commerce/add-ons     control   965 · asc 1,025 · desc   935
/commerce/billing     control 3,747 · asc 3,632 · desc 3,838
/commerce/success     control 1,719 · asc 1,671 · desc 1,684
/commerce/account     control 7,741 · asc 8,004 · desc 7,816`}
        lang="bash"
        filename="plan-order-coverage-7d.txt"
      />
      <p>
        Full coverage on every CUP page — better than the D+ template&apos;s
        example key, which is blank on two of nine pages. Note the irony:
        the experiment <em>changes plan-card order</em>, but the plan card
        page itself (Nexus) carries no variant tags — its effect is only
        measurable from login onward. Lesson from the D+ review still applies:
        document the example key&apos;s lifecycle on the board, because
        experiments end and their tagged events age out of RUM retention
        (~30 days).
      </p>

      <h2 id="geo-story">The Geo Story</h2>
      <p>
        ESPN commerce is effectively US-only: 99.4% of billing views are United
        States, with Puerto Rico the only real second market (~0.3%). Like the
        Hulu Retention template, this board gets no US/LATAM/EMEA/APAC regional
        section — instead a route-coverage block with a geo/device split and
        the US-only rationale documented in the header note.
      </p>

      <h2 id="open-questions">Open Questions</h2>
      <ul>
        <li>
          <code>/commerce/redeem</code> in scope? — never got answered in the
          PM meeting; follow up async.
        </li>
        <li>
          Template boundary (Natalya&apos;s call): plan card page as the
          Signup board&apos;s entry section (generic metrics only), or left to
          the future ESPN MLPs template with Signup starting at login?
        </li>
        <li>
          Where do contextualization-screen analytics live (ESPN&apos;s own
          Datadog org? Adobe?) — decides whether the gap note can link out.
        </li>
        <li>
          TVE vs partner activation — understand both processes before
          modeling the activation branch.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          PM-confirmed flow: contextualization (espn.com takeover) → plan
          cards (plus.espn.com) → MyDisney login (conditional) → add-ons →
          billing (&quot;ledger&quot;) → success.
        </li>
        <li>
          Three flow layers = three observability levels: contextualization
          (nothing), plan cards (generic only — no experiment tags on Nexus),
          CUP (everything).
        </li>
        <li>
          CUP is one shared RUM application across D+/Hulu/ESPN — always
          select brand by <code>service</code>, never by app id.
        </li>
        <li>
          Add-ons and partner activations are in scope; activations are a
          separate flow branching at contextualization (partner activation vs
          TVE).
        </li>
        <li>
          <code>wpnx-ESPN-Generic-Entry-Plan-Order</code>: 3-arm, evenly
          split, full CUP coverage — but its variant effect is only measurable
          from login onward.
        </li>
        <li>
          US-only product → no regional section; geo/device coverage block
          with documented rationale instead.
        </li>
        <li>
          Design mockups lie about URLs — <code>espn.com/purchase</code> 404s;
          verify routes against live traffic before citing them.
        </li>
      </ul>
    </div>
  );
}
