import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const sufDiagram = String.raw`flowchart TD
  X["Entry links (hulu.com, campaigns)<br/>?hitsFlowName=suf_web_one_hulu&offerId=..."] --> P["/commerce/plans<br/>PlansPage → Flex 'landingPlans'"]
  P --> S["/identity/sign-up<br/>UnifiedCreateAccount (Edna)<br/>[position in live order: ASSUMPTION]"]
  P --> B["/commerce/billing<br/>BillingPage → payment entry"]
  S -.-> B
  B --> U["/commerce/purchase<br/>PurchasePage → order submission<br/>(Flex execution: subscription/signup)"]
  U --> C["/commerce/success<br/>CreateSubscriptionSuccessPage<br/>Flex success screen: hulu → 'mlp-welcome'"]
  P -.->|"unsupported location"| L["redirectToLegacy('/welcome/unavailable')"]`;

const hitsFlowDiagram = String.raw`flowchart LR
  A["Inbound URL<br/>?hitsFlowName=suf_web_one_hulu"] --> B["useCommerceQueryParams()<br/>hitsFlowName param"]
  B --> C["getFlowName(hitsFlowName)<br/>?? 'suf_web_default'"]
  C --> D["use-plans-hits-payloads /<br/>use-billing-hits-payloads"]
  D --> E["analytics.track(...)<br/>page_impression · subscription_start ·<br/>subscription_plan_select · subscription_step_start"]
  E --> F["HITS → vortex.hulu.com<br/>segmented by flow_name in dashboards"]`;

export const toc: TocItem[] = [
  { id: "the-flow-at-a-glance", title: "The Flow at a Glance", level: 2 },
  { id: "step-by-step", title: "Step by Step, File by File", level: 2 },
  { id: "hitsflowname", title: "hitsFlowName & suf_web_one_hulu", level: 2 },
  { id: "no-welcome-back", title: "The Missing Welcome-Back Page", level: 2 },
  { id: "server-side-suf", title: "What Flex Contributes Per Step", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Funnel Drop", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluSignupFlowEndToEnd() {
  return (
    <div className="article-content">
      <p>
        The Hulu signup flow (&quot;SUF&quot;) is the highest-stakes surface
        you will touch: it is where money enters. It is also where all the
        previous modules converge — routes from the app anatomy, cookies from
        auth, screens from Flex, and the analytics flow label that ties a
        purchase back to its entry point. This module walks the flow in
        execution order and pins each step to files in both repos.
      </p>

      <h2 id="the-flow-at-a-glance">The Flow at a Glance</h2>
      <MermaidDiagram
        chart={sufDiagram}
        title="Hulu SUF: Pages and Their Backends"
        caption="Solid arrows are code-verified page sequence; the identity step's exact position in the live ordering is an explicitly tagged assumption."
        minHeight={560}
      />
      <ArticleTable caption="The SUF steps and their owners across both repos.">
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>cgi-web page → component</th>
              <th>Flex counterpart</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Plan select</td>
              <td>
                <code>pages/commerce/plans</code> → <code>PlansPage</code>{" "}
                (commerce-base)
              </td>
              <td>
                <code>landing/plans</code> (plan selector service +
                Spearmint <code>plan-select-card-order</code>)
              </td>
            </tr>
            <tr>
              <td>Account creation</td>
              <td>
                <code>pages/identity/sign-up</code> →{" "}
                <code>UnifiedCreateAccount</code> (identity-hulu / Edna)
              </td>
              <td>— (Hulu IDM, not Flex)</td>
            </tr>
            <tr>
              <td>Billing</td>
              <td>
                <code>pages/commerce/billing</code> → <code>BillingPage</code>
              </td>
              <td>
                preview/ledger screens (<code>previewService.ts</code>, 21
                hulu-mention density; Spearmint{" "}
                <code>duo-upsell-billing</code> card)
              </td>
            </tr>
            <tr>
              <td>Purchase</td>
              <td>
                <code>pages/commerce/purchase</code> → <code>PurchasePage</code>
              </td>
              <td>
                execution <code>subscription/signup</code>
              </td>
            </tr>
            <tr>
              <td>Success</td>
              <td>
                <code>pages/commerce/success</code> →{" "}
                <code>CreateSubscriptionSuccessPage</code>
              </td>
              <td>
                <code>successService.ts</code> (59 hulu mentions;{" "}
                <code>&apos;mlp-welcome&apos;</code> redirect target;{" "}
                <code>enable-bundle-hulu-login-on-success</code>)
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="step-by-step">Step by Step, File by File</h2>
      <p>
        The page shells are one-liners; the real components live in
        commerce-base:
      </p>
      <CodeBlock
        code={`// apps/commerce/hulu/pages/commerce/billing/index.page.tsx:17
import { BillingPage as BillingPageBase } from '@solo/commerce-base/src/signup/pages';

// apps/commerce/hulu/pages/commerce/purchase/index.page.tsx:17
import { PurchasePage as BasePurchasePage } from '@solo/commerce-base/src/signup/purchase';

// apps/commerce/hulu/pages/commerce/success/index.page.tsx:2
import { CreateSubscriptionSuccessPage } from '@solo/commerce-base/src/account/success/pages';`}
        lang="typescript"
        filename="Hulu SUF page shells"
      />
      <p>
        The plans page is the fully-traced example (previous module): Flex key{" "}
        <code>landingPlans</code>, redirect gate, then{" "}
        <code>&lt;PlansContent /&gt;</code>. Unsupported locations bounce
        through <code>redirectToLegacy({`{ path: '/welcome/unavailable' }`})</code>{" "}
        (<code>plans-page.tsx:223-230</code>) — a reminder that legacy
        hulu.com URLs are still the fallback surface, and{" "}
        <code>ALLOWED_REDIRECT_DOMAINS</code> explicitly whitelists{" "}
        <code>hulu.com</code>/<code>huluqa.com</code>{" "}
        (<code>commerce-utils/src/url-helpers.ts:56-61</code>).
      </p>
      <p>
        Account creation is the one step that never touches Flex: it renders{" "}
        <code>UnifiedCreateAccount</code> against Hulu&apos;s IDM with{" "}
        <code>{`client: { partner: 'hulu', subpartner: 'web' }`}</code>.{" "}
        <em>[ASSUMPTION: whether users always pass through /identity/sign-up
        before billing, or only some paths do, is not verifiable from route
        wiring — its success callback routes to /commerce/account, so it also
        serves standalone entry.]</em>
      </p>

      <h2 id="hitsflowname">hitsFlowName &amp; suf_web_one_hulu</h2>
      <MermaidDiagram
        chart={hitsFlowDiagram}
        title="How the Flow Label Travels"
        caption="The flow label is a URL parameter, not server state. Lose it at any hop and the funnel lands under suf_web_default."
        minHeight={340}
      />
      <CodeBlock
        code={`// packages/instrumentation/src/hits/types/account.ts:229-240
export type HitsSubscriptionFlowName =
  | 'suf_web_sash_only'
  | 'suf_web_noah_only'
  | 'suf_web_curiosity'
  | 'suf_web_hisuf'
  | 'suf_web_default'
  | 'suf_web_plan_builder'
  | 'suf_web_one_hulu'
  | 'suf_web_live_only'
  | 'suf_web_redeem'
  | 'suf_web_svod'
  | 'hi_switch';

// packages/cgi/commerce-base/src/signup/lib/use-billing-hits-payloads.ts:15,41-43
const DEFAULT_FLOW_NAME: HitsSubscriptionFlowName = 'suf_web_default';
export function getFlowName(flowName?: string) {
  return (flowName as HitsSubscriptionFlowName) ?? DEFAULT_FLOW_NAME;
}`}
        lang="typescript"
        filename="HITS flow names (cgi-web)"
      />
      <p>
        Key facts: (1) <code>hitsFlowName</code> is read from the URL by{" "}
        <code>useCommerceQueryParams()</code>{" "}
        (<code>use-commerce-query-params.ts:72</code>); (2) missing → defaults
        to <code>suf_web_default</code>; (3) the literal value{" "}
        <code>suf_web_one_hulu</code> appears <em>only</em> in the type union —
        no code in either repo constructs it.{" "}
        <em>[ASSUMPTION: it is injected by out-of-repo entry links — hulu.com
        surfaces and campaigns. Observed live in Datadog RUM at roughly
        hundreds of events per week.]</em> (4) Flex has its own HITS{" "}
        <code>FLOW_NAMES</code> enum with a <em>different</em> value set
        (<code>suf_web_hisuf</code>, <code>hi_switch</code>...) for
        server-built metrics — the two lists are cousins, not copies. When a
        dashboard segments by <code>flow_name</code>, always ask which side
        emitted the event.
      </p>

      <h2 id="no-welcome-back">The Missing Welcome-Back Page</h2>
      <p>
        Disney+ and ESPN route returning subscribers through{" "}
        <code>/commerce/welcome-back</code> (a Flex{" "}
        <code>subscriptionReacquisition</code> screen). Hulu{" "}
        <strong>has no such route</strong> — verified by directory listing of
        all three apps&apos; <code>pages/</code>. Hulu winback traffic
        re-enters the standard SUF at the plans page instead, historically
        labelled by entry links with the <code>suf_web_one_hulu</code> flow
        name. On the Flex side the divergence is mirrored in the success
        screen&apos;s post-purchase link target:
      </p>
      <CodeBlock
        code={`// growth-life-client-api — src/domain/screen/subscription/success/successService.ts:1856
location: isPartnerHulu(flexContext) ? 'mlp-welcome' : 'welcome-back',
// mirrored in src/platform/presentation/screen/assemblies/successAssembly.ts:391,1369`}
        lang="typescript"
        filename="successService.ts"
      />
      <p>
        <em>[The &quot;Hulu welcome-back redirects to SUF&quot; behavior is
        product knowledge; the code-verifiable facts are the route absence in
        cgi-web and the mlp-welcome branch in Flex.]</em>
      </p>

      <h2 id="server-side-suf">What Flex Contributes Per Step</h2>
      <p>
        For every SUF screen, remember what is decided server-side — this is
        where most &quot;why does Hulu show X&quot; answers live:
      </p>
      <ul>
        <li>
          <strong>Plans:</strong> which cards, in which order — including the
          Spearmint <code>sprmnt-GREAT-plan-select-card-order</code> experiment
          (variants <code>duo-first</code>, <code>duo-first-hulu-last</code>,{" "}
          <code>no-hulu</code>) and the WeaponX{" "}
          <code>wpnx-great-preselect-plan-carousel-usa</code> preselect.
        </li>
        <li>
          <strong>Billing/preview:</strong> ledger lines, legal copy
          (Hulu-specific cypher keys like <code>ledger_hulu_consent</code>),
          Hulu-gated Tealium payloads, the Spearmint{" "}
          <code>duo-upsell-billing</code> card.
        </li>
        <li>
          <strong>Success:</strong> redirect targets (<code>mlp-welcome</code>),
          the Hulu-login-vs-activate link (flag{" "}
          <code>enable-bundle-hulu-login-on-success</code>), HITS content-type
          branching (<code>successMetricsDataBuilder.ts:498,519</code>).
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"Trace a Hulu signup from click to confirmation."`}
        intro={
          <>
            Strong answers alternate layers — page, Flex screen, analytics —
            instead of listing pages only.
          </>
        }
        steps={[
          "Entry: an inbound link (hulu.com or campaign) lands on /commerce/plans carrying offer params and hitsFlowName=suf_web_one_hulu; the layout's auth bootstrap guarantees an anonymous _hulu_at cookie before anything renders.",
          "Plans: PlansPage fetches Flex 'landingPlans'; card set/order can be Spearmint-experimented server-side; isFlexRedirect can bounce ineligible users before render.",
          "Identity: account creation runs on Hulu's own IDM/Edna via UnifiedCreateAccount — the one SUF step that never touches Flex.",
          "Billing → purchase: BillingPage renders the Flex preview/ledger (Hulu legal cyphers, Hulu-gated Tealium); PurchasePage submits the subscription/signup execution.",
          "Success: Flex's success screen branches hulu → 'mlp-welcome' and can point the Hulu link at login instead of activation (ACP flag); HITS events fire throughout under the flow label from step 1.",
          "Close with the observability punchline: the funnel's segmentation key is a URL param — losing hitsFlowName mid-flow silently reclassifies the purchase under suf_web_default.",
        ]}
      />

      <h2 id="challenge">Challenge: The Funnel Drop</h2>
      <InterviewChallenge
        title="One Hulu conversions 'collapsed' overnight"
        scenario={
          <>
            An analyst pings you: the HITS dashboard segment{" "}
            <code>flow_name = suf_web_one_hulu</code> dropped ~90% overnight.
            Total Hulu signups (all flows summed) are flat. No deploy of
            cgi-web or Flex happened in the window. Marketing did ship
            &quot;a small link cleanup&quot; on hulu.com yesterday.
          </>
        }
        tasks={[
          "Form the primary hypothesis and defend it with the mechanism from this module.",
          "Explain why total signups being flat is the decisive clue.",
          "Describe how you would confirm the hypothesis in under 30 minutes without any repo access.",
          "Recommend a durable fix, and state which team owns it.",
        ]}
        pitfalls={[
          "Grepping cgi-web/Flex for suf_web_one_hulu and concluding the tracking is broken because you can't find it — it was never in these repos.",
          "Treating the drop as a conversion incident when purchases are flat — it is a labelling incident.",
          "Blaming the HITS tracker, which fires regardless of flow label.",
          "Proposing a frontend hardcode of the flow name, which would mislabel every other entry path.",
        ]}
        signal="A strong answer says 'the label is a URL param owned by the entry links' within the first minute and treats the repos as innocent."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Hypothesis:</strong> the hulu.com &quot;link cleanup&quot;
          dropped the <code>?hitsFlowName=suf_web_one_hulu</code> parameter
          from entry links. <code>getFlowName()</code> then defaults every
          affected session to <code>suf_web_default</code> — traffic and
          purchases continue, only the segment label moves.
        </p>
        <p>
          <strong>Why flat totals decide it:</strong> a real funnel breakage
          drops purchases; a label breakage only reshuffles segments. Flat
          total + collapsed segment = reclassification, almost by definition.
          Confirm by checking whether <code>suf_web_default</code> rose by
          roughly the same amount.
        </p>
        <p>
          <strong>30-minute confirmation:</strong> open a current hulu.com
          entry link and inspect its query string; compare a cached/archived
          version from before the change; and split the HITS dashboard by both
          flow names to see the mirror-image shift.
        </p>
        <p>
          <strong>Durable fix:</strong> restore the param in the entry links
          (owner: the hulu.com/marketing surface team, not cgi-web), and add a
          dashboard guardrail alerting on sudden <code>flow_name</code> mix
          shifts so the next cleanup is caught in hours, not days.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu SUF = <code>/commerce/plans → billing → purchase → success</code>{" "}
          with identity on Hulu&apos;s own IDM; page shells in the app, real
          components in commerce-base.
        </li>
        <li>
          <code>hitsFlowName</code> is a URL param;{" "}
          <code>suf_web_one_hulu</code> exists only in the client type union
          and arrives from out-of-repo entry links; missing → defaults to{" "}
          <code>suf_web_default</code>.
        </li>
        <li>
          Hulu has no welcome-back route — winback re-enters standard SUF;
          Flex mirrors the divergence with the{" "}
          <code>mlp-welcome</code> branch.
        </li>
        <li>
          Server-side per step: plan cards (Spearmint order experiment), ledger
          legal cyphers + Tealium gating, success redirects + ACP login flag.
        </li>
        <li>
          Flex&apos;s HITS <code>FLOW_NAMES</code> enum ≠ the client&apos;s{" "}
          <code>HitsSubscriptionFlowName</code> union — always ask which side
          emitted an event before debugging a dashboard.
        </li>
      </ul>
    </div>
  );
}
