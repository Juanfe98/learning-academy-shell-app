import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dualPathDiagram = String.raw`flowchart TD
  A["Request for a 'migrating' screen"] --> B{"Feature flag:<br/>legacy or platform engine?"}
  B -->|legacy| C["src/domain/screen/.../XService.ts<br/>isPartnerHulu() branches"]
  B -->|platform| D["src/platform/presentation/screen/<br/>assemblies/XAssembly.ts<br/>the SAME isPartnerHulu() branches,<br/>re-implemented"]
  C --> E["Response must match"]
  D --> E
  E --> F["Parity fixtures guard it:<br/>planSelectorAssembly-parity.json<br/>(257 hulu mentions)"]`;

const branchMapDiagram = String.raw`flowchart LR
  H["isPartnerHulu(flexContext)"] --> S1["Success screen<br/>'mlp-welcome' target ·<br/>HITS contentType branches"]
  H --> S2["Cancel flow<br/>landing options · promo eligibility ·<br/>success CTA style"]
  H --> S3["Plan-switch ledger<br/>legal cyphers · Tealium gate"]
  H --> S4["Preview (SUF ledger)<br/>10 call sites · Tealium gate"]
  H --> S5["Account Details<br/>MyServices · partner CTA copy<br/>(107 hulu mentions)"]
  H --> S6["IPS (device upsell)<br/>Huludays artwork"]
  H --> S7["Device Out-of-Household<br/>HITS emitted ONLY for hulu"]
  H --> S8["Redeem<br/>back-button visibility"]`;

export const toc: TocItem[] = [
  { id: "the-real-hulu-surface", title: "The Real Hulu Surface Is Shared", level: 2 },
  { id: "branch-density-map", title: "The Branch-Density Map", level: 2 },
  { id: "canonical-branches", title: "Canonical Branch Examples", level: 2 },
  { id: "platform-migration-duty", title: "The Change-Both Duty", level: 2 },
  { id: "executions", title: "Hulu in Executions", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Half-Shipped Branch", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluInSharedScreens() {
  return (
    <div className="article-content">
      <p>
        The previous module covered Flex&apos;s small dedicated Hulu surface.
        This one covers where Hulu <em>actually lives</em>: roughly{" "}
        <strong>140 <code>isPartnerHulu()</code> call sites</strong> spread
        through shared screen services, metrics builders, executions — and
        then <em>again</em> through the platform-migration assemblies that
        re-implement the same screens. Working on any shared screen without
        knowing this map is how Hulu regressions ship.
      </p>

      <h2 id="the-real-hulu-surface">The Real Hulu Surface Is Shared</h2>
      <MermaidDiagram
        chart={branchMapDiagram}
        title="Where isPartnerHulu() Branches Cluster"
        caption="One helper, many screens. The density is the map: the more mentions a file has, the more likely your shared-screen change needs a Hulu-side review."
        minHeight={460}
      />

      <h2 id="branch-density-map">The Branch-Density Map</h2>
      <ArticleTable caption="Hulu-mention density per file (case-insensitive counts in non-test source). Use this as a review checklist: touching any of these files = think about Hulu.">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Hulu hits</th>
              <th>What branches</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>account/accountDetails/accountDetailsService.ts</code></td>
              <td>107</td>
              <td>MyServices tiles, partner CTA copy, subscription sort</td>
            </tr>
            <tr>
              <td><code>subscription/success/successService.ts</code></td>
              <td>59</td>
              <td>Redirect targets, HITS content types, ACP login link</td>
            </tr>
            <tr>
              <td><code>hulu/accountHomeService.ts</code></td>
              <td>48</td>
              <td>(the Hulu-only screen, for scale comparison)</td>
            </tr>
            <tr>
              <td><code>account/planSwitch/ledgerService.ts</code></td>
              <td>42</td>
              <td>Billing/legal branches, Tealium gating</td>
            </tr>
            <tr>
              <td><code>subscription/ips/ipsService.ts</code></td>
              <td>28</td>
              <td>Upsell header artwork (incl. Huludays experiment)</td>
            </tr>
            <tr>
              <td><code>account/planSwitch/planSwitchServiceV2.ts</code></td>
              <td>23</td>
              <td>Switch-plan behavior, Hulu sort/modal helpers</td>
            </tr>
            <tr>
              <td><code>account/cancel/cancelLandingService.ts</code></td>
              <td>23</td>
              <td>Cancel landing copy, promo eligibility</td>
            </tr>
            <tr>
              <td><code>subscription/preview/previewService.ts</code></td>
              <td>21</td>
              <td>SUF preview/ledger, Tealium gate (10 call sites)</td>
            </tr>
            <tr>
              <td><code>landing/planSelector/planSelectorService.ts</code></td>
              <td>14</td>
              <td>Plan card set/order</td>
            </tr>
            <tr>
              <td>
                <code>landing/deviceOutOfHousehold/...InterstitialService.ts</code>
              </td>
              <td>16</td>
              <td>OOH interstitial; HITS Hulu-only</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        And the platform mirror is just as saturated:{" "}
        <code>successAssembly.ts</code> (65), <code>success/utils.ts</code>{" "}
        (70), <code>planSelectorAssembly.ts</code> (48),{" "}
        <code>account-details/utils.ts</code> (41),{" "}
        <code>planSwitchLedgerAssembly.ts</code> (38),{" "}
        <code>accountDetailsAssembly.ts</code> (15).
      </p>

      <h2 id="canonical-branches">Canonical Branch Examples</h2>
      <p>Three branches that teach the three branch <em>kinds</em>:</p>
      <CodeBlock
        code={`// 1) Navigation branch — successService.ts:1856
location: isPartnerHulu(flexContext) ? 'mlp-welcome' : 'welcome-back',

// 2) Analytics gate — tealiumData.ts:40 (Tealium exists ONLY for hulu)
return isPartnerHulu(flexContext) ? tealiumData : undefined;

// 3) UX nuance — redeemPromoCodeService.ts:47
showBackButtonOnPromoCodeRedemption: isPartnerHulu(flexContext),`}
        lang="typescript"
        filename="three branch kinds"
      />
      <p>
        Kind 1 changes where users go; kind 2 changes what telemetry exists;
        kind 3 changes small UX affordances. When reviewing a Hulu ticket, ask
        which kind you are creating — analytics gates (kind 2) are the ones
        people forget to test, because nothing visible changes.
      </p>

      <h2 id="platform-migration-duty">The Change-Both Duty</h2>
      <MermaidDiagram
        chart={dualPathDiagram}
        title="Two Live Engines, One Contract"
        caption="Migrating screens are served by BOTH the legacy service and the platform assembly, flag-selected. Any Hulu branch you change must change in both — parity fixtures will catch you if you forget, but only where they exist."
        minHeight={440}
      />
      <p>
        The Flex repo&apos;s standing rule: for screens listed as{" "}
        <code>migrating</code> in <code>src/platform/migrationConfig.ts</code>{" "}
        (currently everything in the registry except the deprecated{" "}
        <code>membershipPause</code>), behavioral changes must land in{" "}
        <strong>both</strong> the legacy service and the platform assembly.
        Hulu branches are the classic victim: the <code>mlp-welcome</code>{" "}
        branch exists three times (<code>successService.ts:1856</code>,{" "}
        <code>successAssembly.ts:391</code> and <code>:1369</code>). Notable
        registry details: <code>planSwitchV2</code>&apos;s legacy file list
        explicitly includes the two Hulu helpers
        (<code>planSwitchSortService.ts</code>,{" "}
        <code>planSwitchOfferCardTermsModalBuilder.ts</code>), and the
        heaviest Hulu artifact in the repo is a parity fixture:{" "}
        <code>src/platform/migration-tracking/planSelectorAssembly-parity.json</code>{" "}
        with 257 hulu mentions — legacy-vs-platform outputs compared across
        Hulu scenarios.
      </p>

      <h2 id="executions">Hulu in Executions</h2>
      <p>
        The write side branches too (though experiments never run here — only
        presentation code carries experiments):
      </p>
      <ul>
        <li>
          <code>POST /execution/v3/subscription/switch</code> →{" "}
          <code>switchSubmissionService.ts:80,136</code>; plus the GLO client
          forwards <code>defaultZipcodeFromIpAddress</code> only for Hulu
          (Live-TV zipcode, <code>GrowthLifeOrchestratorClient.ts:1698-1701</code>).
        </li>
        <li>
          <code>POST /execution/v1/payments/changePayment</code> →{" "}
          <code>changePaymentService.ts</code> (the screen side carries the
          Spearmint <code>switch-billing</code> legal footer).
        </li>
        <li>
          <code>POST /execution/v1/account/deviceOutOfHousehold/update</code> →{" "}
          <code>updateService.ts:171</code>.
        </li>
        <li>
          Commerce redirect actions set Hulu-flavored HITS flow names:{" "}
          <code>redirectService.ts:116,142</code>{" "}
          (<code>HI_SWITCH</code>, <code>SUF_WEB_HI_SUF</code>).
        </li>
        <li>
          Cancel-all requests send{" "}
          <code>{`cancelBody = { partner: standardHeaders.partner! }`}</code>{" "}
          when no agreement id is supplied
          (<code>GrowthLifeOrchestratorClient.ts:1954-1955</code>).
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How would you safely change a shared screen that Hulu also uses?"`}
        intro={
          <>
            This is the working-engineer question. Strong answers show a
            checklist mentality anchored in the branch map and the change-both
            duty.
          </>
        }
        steps={[
          "First, locate the blast radius: check the file's Hulu-mention density and grep for isPartnerHulu in the service you are touching — the shared screens carry ~140 call sites repo-wide.",
          "Classify the branch kind you are near: navigation, analytics gate, or UX nuance — analytics gates fail silently and need explicit test cases.",
          "Check migrationConfig.ts: if the screen is 'migrating', plan the same change in the platform assembly — cite the triple-implemented mlp-welcome branch as why.",
          "Test both partners explicitly: a Hulu case AND a Disney case per behavior, because the silent-Disney-fallback means missing headers masquerade as passing tests.",
          "Verify against parity fixtures where they exist (planSelectorAssembly-parity.json) and remember executions branch too, but never carry experiments.",
        ]}
      />

      <h2 id="challenge">Challenge: The Half-Shipped Branch</h2>
      <InterviewChallenge
        title="Works on legacy, breaks on platform"
        scenario={
          <>
            A teammate ships a change: Hulu users on the success screen should
            now see a &quot;Manage plan&quot; CTA instead of &quot;Go to
            Hulu&quot;. QA passes. Two weeks later, an experiment ramps the
            platform engine for the success screen to 50% — and support
            tickets arrive from Hulu users still seeing &quot;Go to
            Hulu&quot;, but only <em>some</em> of them, seemingly at random.
          </>
        }
        tasks={[
          "Explain the root cause precisely, naming the mechanism that makes the bug intermittent.",
          "List the files that should have changed, and the one that did.",
          "Describe how the repo's guardrails could have caught this before ship, and why they might not have.",
          "Write the incident-prevention rule you would add to the team's review checklist.",
        ]}
        pitfalls={[
          "Blaming caching or CDN for the randomness — the 50% engine ramp is the randomizer.",
          "Fixing the platform assembly without checking utils files (success/utils.ts holds 70 hulu mentions).",
          "Assuming parity fixtures cover every screen — they exist only where written.",
          "Writing the fix once more in only one engine, recreating the same bug inverted.",
        ]}
        signal="A strong answer names the dual-engine flag split as the randomizer immediately and knows the fix is a paired change plus a parity check."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Root cause:</strong> the CTA change landed only in the legacy{" "}
          <code>successService.ts</code>. The success screen is{" "}
          <code>migrating</code>, so requests are split between engines by the
          migration flag — at 50% ramp, half of Hulu traffic renders from{" "}
          <code>successAssembly.ts</code> (and its <code>success/utils.ts</code>),
          which still holds the old branch. The &quot;randomness&quot; is the
          engine assignment.
        </p>
        <p>
          <strong>Files:</strong> should have been at minimum{" "}
          <code>domain/screen/subscription/success/successService.ts</code>{" "}
          <em>and</em>{" "}
          <code>platform/presentation/screen/assemblies/successAssembly.ts</code>{" "}
          (+ <code>success/utils.ts</code> if the CTA builder lives there);
          only the first changed.
        </p>
        <p>
          <strong>Guardrails:</strong> the migration registry documents the
          dual paths, and parity fixtures compare outputs — but parity
          coverage is per-screen/per-scenario; if no Hulu-CTA scenario exists
          in the fixture, the gap sails through. Review-time enforcement
          (&quot;is this screen in migrationConfig? show me both diffs&quot;)
          is the reliable layer.
        </p>
        <p>
          <strong>Checklist rule:</strong> <em>&quot;Any behavioral change to a
          screen listed in migrationConfig.ts must link both the legacy and
          assembly diffs in the PR description, or state explicitly why one
          side is exempt.&quot;</em>
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu&apos;s real Flex footprint is ~140 <code>isPartnerHulu()</code>{" "}
          call sites in shared code — the density table is your review
          checklist.
        </li>
        <li>
          Three branch kinds: navigation, analytics gates (fail silently!),
          UX nuances.
        </li>
        <li>
          Migrating screens are served by two engines; Hulu branches must
          change in both (the <code>mlp-welcome</code> branch exists three
          times).
        </li>
        <li>
          Parity fixtures (257 hulu mentions in the plan-selector one) guard
          some screens — but only where scenarios were written.
        </li>
        <li>
          Executions branch on Hulu too (switch zipcode, changePayment, OOH
          update, cancel body) — but experiments never live in executions.
        </li>
      </ul>
    </div>
  );
}
