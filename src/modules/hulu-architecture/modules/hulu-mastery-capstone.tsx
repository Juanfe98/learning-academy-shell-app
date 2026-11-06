import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fullStackDiagram = String.raw`flowchart TD
  U["User"] --> MK["hulu.com marketing surfaces<br/>apps/marketing-unified/hulu (Next 13, Cannonball CMS)<br/>Tealium + HITS"]
  MK -->|"?hitsFlowName=suf_web_one_hulu&offer..."| APP["apps/commerce/hulu (Next 15, CUP V2)<br/>hulu-layout: EnsureHuluAuthToken · 3 trackers · OneTrust"]
  APP --> DI["data-interface-hulu<br/>getFlexScreen (credentials:'include')<br/>getExperimentAssignments (_hulu_assignments cookie)"]
  DI --> EDGE["Hulu Edge<br/>validates _hulu_at/_hulu_session<br/>stamps x-bamtech-partner: hulu<br/>[+ spearmint header — ASSUMPTION]"]
  EDGE --> FLEX["Flex (growth-life-client-api)<br/>experimentation middleware normalizes Spearmint→WeaponX<br/>isPartnerHulu() branches · partner-keyed config merge<br/>legacy + platform engines (change-both)"]
  FLEX --> GLO["GLO (glo.prod.hulu.com)<br/>brand: HULU"]
  FLEX --> CY["Cypher unified-commerce<br/>ledger_hulu_* keys"]
  FLEX --> IPSE["IPSE (hulu legacy device id)"]
  FLEX --> LEG["Legato (x-linked-hulu-profile-id)"]
  SPMT["Spearmint platform"] -.->|"_hulu_assignments cookie"| APP
  LD["LaunchDarkly (flex flags)"] -.-> FLEX
  SPW["Sparrow commerce-hulu workspace"] -.-> APP`;

const triageDiagram = String.raw`flowchart TD
  S["Symptom"] --> Q1{"Wrong copy on a<br/>Flex-driven screen?"}
  Q1 -->|yes| A1["Cypher dictionary content or key selection<br/>in Flex builders — not React strings"]
  S --> Q2{"Behavior differs between<br/>'identical' Hulu users?"}
  Q2 -->|yes| A2["Experiment arm (Spearmint) or<br/>legacy-vs-platform engine split or<br/>legacy-vs-ACP subscription split"]
  S --> Q3{"Hulu shows Disney behavior?"}
  Q3 -->|yes| A3["Partner header missing/lost —<br/>silent Disney fallback"]
  S --> Q4{"Events missing in a dashboard?"}
  Q4 -->|yes| A4["Which side emits it? client union vs flex enum ·<br/>partner-gated builders · consent · flow-name param"]
  S --> Q5{"Whole app blank?"}
  Q5 -->|yes| A5["Auth bootstrap (generate_anonymous_token)<br/>or wrong local domain"]`;

export const toc: TocItem[] = [
  { id: "the-one-page-map", title: "The One-Page Map", level: 2 },
  { id: "end-to-end-trace", title: "The End-to-End Trace, Narrated", level: 2 },
  { id: "symptom-table", title: "Symptom → Owning Layer", level: 2 },
  { id: "pr-checklist", title: "The Hulu PR Checklist", level: 2 },
  { id: "assumption-register", title: "The Assumption Register", level: 2 },
  { id: "self-assessment", title: "Self-Assessment", level: 2 },
  { id: "final-challenge", title: "Final Challenge: The Full-Stack Incident", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluMasteryCapstone() {
  return (
    <div className="article-content">
      <p>
        This capstone consolidates the academy into working instruments: one
        map, one narrated trace, one triage table, one PR checklist, and an
        honest register of what remains assumption rather than verified fact.
        If you can reproduce the map from memory and route the final challenge
        cold, you are operating at Hulu-expert level.
      </p>

      <h2 id="the-one-page-map">The One-Page Map</h2>
      <MermaidDiagram
        chart={fullStackDiagram}
        title="Hulu Web Commerce: The Whole Stack"
        caption="Every module of this academy is one box or edge of this diagram. The dotted edges are the config/experiment planes; the solid spine is the request path."
        minHeight={640}
      />

      <h2 id="end-to-end-trace">The End-to-End Trace, Narrated</h2>
      <p>A returning visitor buys Hulu. Narrate it layer by layer:</p>
      <CodeBlock
        code={`1. ENTRY     hulu.com link → /commerce/plans?hitsFlowName=suf_web_one_hulu&...
2. AUTH      EnsureHuluAuthToken: no _hulu_at/_hulu_session → mint anonymous token
             (render blocked until cookie exists)
3. ASSIGN    Spearmint has set _hulu_assignments; client parses it (RUM tagging);
             the same payload reaches Flex as x-bamtech-spearmint-assignments
4. SCREEN    PlansPage → getFlexScreen('landingPlans') → Edge stamps partner:hulu
             → Flex middleware normalizes spearmint → getExperimentTreatment
             (sprmnt-GREAT-plan-select-card-order → e.g. 'duo-first')
             → plan cards built, hulu overlays merged, cypher keys attached
5. RENDER    isFlexRedirect? no → PlansContent renders FlexText/FlexInteraction;
             HITS page_impression + subscription_start fire under flow
             suf_web_one_hulu (app id hulu-acp)
6. IDENTITY  /identity/sign-up → UnifiedCreateAccount (IDM/Edna,
             partner:'hulu' subpartner:'web')  [position: assumption]
7. BILLING   preview/ledger from Flex: ledger_hulu_consent legal copy,
             hulu-gated Tealium payload, duo-upsell-billing card if assigned
8. PURCHASE  execution subscription/signup → GLO (brand: HULU)
9. SUCCESS   successService (or successAssembly — engine split!):
             hulu → 'mlp-welcome'; ACP flag may point Hulu link at login;
             HITS success events fire
10. ACCOUNT  later visits: accountDetails key → /screens/v1/hulu/account-home;
             legacy subs visible only if enable-legacy-hulu-subscription-details`}
        lang="bash"
        filename="the narrated trace"
      />

      <h2 id="symptom-table">Symptom → Owning Layer</h2>
      <MermaidDiagram
        chart={triageDiagram}
        title="Triage Decision Tree"
        caption="Five symptom families cover most Hulu tickets. Route first, read code second."
        minHeight={520}
      />
      <ArticleTable
        caption="The master triage table. Column three is where you open your editor."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>Likely cause</th>
              <th>First place to look</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hulu screen shows Disney-ish content</td>
              <td>Partner header missing → silent fallback</td>
              <td>
                Request headers; <code>setValidPartner</code>;{" "}
                <code>getScreenDataWithPartner</code> merge
              </td>
            </tr>
            <tr>
              <td>Behavior differs between similar Hulu users</td>
              <td>
                Spearmint arm / engine split (legacy vs platform) / legacy vs
                ACP subscription
              </td>
              <td>
                <code>_hulu_assignments</code>; <code>migrationConfig.ts</code>;{" "}
                <code>agreement.source</code>
              </td>
            </tr>
            <tr>
              <td>Wrong copy on a Flex screen</td>
              <td>Cypher key selection or dictionary content</td>
              <td>
                Flex builder&apos;s key choice →{" "}
                <code>unified-commerce</code> dictionary; copy-override
                experiments (<code>__exp__</code> keys)
              </td>
            </tr>
            <tr>
              <td>Dashboard events missing/moved</td>
              <td>
                Flow-name param lost · partner-gated builder · consent ·
                wrong side&apos;s vocabulary
              </td>
              <td>
                Entry-link params; <code>isPartnerHulu</code> gates in metrics
                builders; OneTrust
              </td>
            </tr>
            <tr>
              <td>Whole Hulu app blank</td>
              <td>Auth bootstrap failing / wrong local domain</td>
              <td>
                <code>generate_anonymous_token</code>;{" "}
                <code>local.huluqa.com:5003</code> vs localhost
              </td>
            </tr>
            <tr>
              <td>Change works for some Hulu traffic only</td>
              <td>Shipped to one engine of a migrating screen</td>
              <td>
                Legacy service <em>and</em> platform assembly diffs; parity
                fixtures
              </td>
            </tr>
            <tr>
              <td>&quot;Flip the flag&quot; does nothing</td>
              <td>
                Wrong system (LD vs Sparrow vs Mystique-decoy) or flag not
                consumed on this engine
              </td>
              <td>The which-system decision table (Flags module)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="pr-checklist">The Hulu PR Checklist</h2>
      <ul>
        <li>
          <strong>Partner coverage:</strong> does every changed behavior have
          a Hulu test case <em>and</em> a Disney case? (Silent fallback makes
          missing-header tests pass wrongly.)
        </li>
        <li>
          <strong>Engine coverage:</strong> is the screen in{" "}
          <code>migrationConfig.ts</code>? Then both legacy + assembly diffs,
          or an explicit exemption note.
        </li>
        <li>
          <strong>Experiment hygiene:</strong> feature ids/variants imported
          from registry/variants (never hardcoded); undefined treatment =
          control; TODO cleanup-ticket comments at every touchpoint.
        </li>
        <li>
          <strong>Analytics:</strong> did you touch a partner-gated builder?
          Assert payload presence/absence per partner — these fail silently.
        </li>
        <li>
          <strong>Codegen:</strong> FeatureSet/type changes →{" "}
          <code>npm run build:typeguards</code>; route/OpenAPI changes →{" "}
          <code>npm run build:swagger</code>.
        </li>
        <li>
          <strong>Copy:</strong> new text = cypher keys + dictionary entries
          (templates repo), never hardcoded strings; check key naming follows
          the <code>*_hulu_*</code> family conventions.
        </li>
        <li>
          <strong>Evidence:</strong> before/after curls per scenario with full
          headers (partner + forced arms where relevant).
        </li>
      </ul>

      <h2 id="assumption-register">The Assumption Register</h2>
      <p>
        Expertise includes knowing the edges of the map. These remain{" "}
        <strong>assumptions</strong>, not verified facts — treat accordingly
        and verify before betting a design on them:
      </p>
      <ArticleTable caption="What this academy could NOT verify in code. Source: .claude/research/hulu/00-INDEX-AND-CORRECTIONS.md">
        <table>
          <thead>
            <tr>
              <th>Assumption</th>
              <th>Evidence status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Hulu Edge translates the <code>_hulu_assignments</code> cookie
                into <code>x-bamtech-spearmint-assignments</code>
              </td>
              <td>
                Strong circumstantial (identical wire format + brace-trim
                workaround on both sides); no Edge code in either repo
              </td>
            </tr>
            <tr>
              <td>
                <code>suf_web_one_hulu</code> is injected by hulu.com/campaign
                entry links
              </td>
              <td>
                Value exists only in the client type union; observed live in
                RUM; injector out of repo
              </td>
            </tr>
            <tr>
              <td>
                Hulu welcome-back &quot;redirects to standard SUF&quot;
              </td>
              <td>
                Route absence verified; redirect rule not found; behavior is
                product knowledge
              </td>
            </tr>
            <tr>
              <td>
                Hulu&apos;s US-only footprint is enforced upstream (Edge/GLO)
              </td>
              <td>Verified only as an absence of gating in Flex</td>
            </tr>
            <tr>
              <td>
                <code>/identity/sign-up</code>&apos;s position in the live SUF
                ordering
              </td>
              <td>
                Success callback routes to /commerce/account; live ordering
                unverified
              </td>
            </tr>
            <tr>
              <td>
                <code>sdkSession</code> truly inert for Hulu at runtime
              </td>
              <td>
                Code comment + absent hydration wiring; no explicit brand
                conditional
              </td>
            </tr>
            <tr>
              <td>
                &quot;IDM&quot;/&quot;Edna&quot; as identity-service names;{" "}
                <code>local.hulu.com</code> vs <code>local.huluqa.com</code>{" "}
                doc discrepancy
              </td>
              <td>In-repo references only / unresolved</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="self-assessment">Self-Assessment</h2>
      <p>You have mastered this academy when you can, without notes:</p>
      <ul>
        <li>
          Draw the one-page map and place all four Hulu-native systems (IDM,
          Spearmint, HITS, legacy billing) with their boundary adapters.
        </li>
        <li>
          Write a valid Hulu curl for a Flex screen, including a forced
          Spearmint arm, from memory.
        </li>
        <li>
          Recite the five <code>sprmnt-GREAT-*</code> experiments and each
          one&apos;s surface.
        </li>
        <li>
          Explain why a Hulu web percentage-split cannot run on WeaponX, in
          two causal steps.
        </li>
        <li>
          Given any of the seven symptom rows, name the first file you would
          open.
        </li>
        <li>
          List what makes a Hulu PR complete: partner cases, engine pairs,
          variant constants, gated-analytics assertions, codegen, cypher
          copy, curl evidence.
        </li>
      </ul>

      <h2 id="final-challenge">Final Challenge: The Full-Stack Incident</h2>
      <InterviewChallenge
        title="The Monday-morning triple"
        scenario={
          <>
            Monday 9am, three simultaneous reports about Hulu: (1) a subset of
            Hulu users see the <em>old</em> cancel-save header copy while
            others see the new <code>loyalty</code> variant that supposedly
            &quot;shipped to 100% last week&quot;; (2) the RUM dashboard shows
            the <code>sprmnt-GREAT-cancel-save-header</code> context property
            on only ~60% of cancel-page sessions; (3) a PM asks why the
            &quot;One Hulu winback&quot; funnel dashboard has been slowly
            shrinking for a month while total signups hold steady.
          </>
        }
        tasks={[
          "For (1): list the three distinct mechanisms that can split 'identical' Hulu users, and design one check to discriminate among them.",
          "For (2): explain what populates that RUM property and give two benign explanations for 60% coverage before assuming breakage.",
          "For (3): connect this to a mechanism from the SUF module and propose the confirmation query.",
          "State the order you would tackle the three, with a one-line justification.",
        ]}
        pitfalls={[
          "Assuming 'shipped to 100%' means the Spearmint dial is at 100% — verify on the dashboard, not the ticket.",
          "Forgetting the RUM property is set client-side only when the cookie assignment resolves — SSR sessions and unassigned users legitimately lack it.",
          "Treating (3) as a conversion drop when flat totals point at label decay.",
          "Starting with (3) because a PM asked — (1) is user-facing behavior divergence and outranks it.",
        ]}
        signal="A strong answer wields all three splitters (arm, engine, population), reads RUM coverage as census-not-error, and recognizes label decay."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>(1)</strong> The three splitters: (a) Spearmint arm —
          &quot;100%&quot; may be aspiration, check the Spearmint dashboard
          dial; (b) engine split — the cancel screens are migrating; if the
          copy change landed in one engine only, the migration flag is the
          randomizer; (c) population split — legacy-vs-ACP or
          unassigned-users-get-control (if the &quot;ship&quot; was just
          ramping the experiment, unassigned users still see control).
          Discriminating check: for one affected user session, capture the
          request&apos;s spearmint header/cookie and the response&apos;s
          engine markers — arm present + old copy ⇒ engine or code gap; arm
          absent ⇒ assignment/ramp issue.
        </p>
        <p>
          <strong>(2)</strong> The property is set by{" "}
          <code>useSpearmintExperiment</code> /{" "}
          <code>datadogRum.setGlobalContextProperty</code>{" "}
          <em>only when</em> the cookie exists and the feature id resolves.
          Benign gaps: users not in the experiment&apos;s audience
          (unassigned), and sessions where the cancel surface rendered without
          the hook mounting (or before assignments resolved). 60% ≈ the
          assignment coverage, not a bug — compare against Spearmint&apos;s
          own assignment counts before touching code.
        </p>
        <p>
          <strong>(3)</strong> <code>suf_web_one_hulu</code> is a URL-param
          label owned by entry links. Slow shrink + flat totals = links
          progressively losing the param (link refactors, new campaign
          templates) → sessions reclassified into{" "}
          <code>suf_web_default</code>. Confirmation: plot both flow labels
          together — mirror-image growth in default confirms label decay;
          then audit current entry links.
        </p>
        <p>
          <strong>Order:</strong> (1) first — live user-facing inconsistency
          on a retention surface; (2) second — it likely{" "}
          <em>explains part of (1)</em> (assignment coverage) and is
          read-only analysis; (3) last — a month-old measurement artifact
          with no user impact.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The map: marketing → commerce app (auth bootstrap + trackers) →
          data-interface → Edge (partner stamp) → Flex (normalize, branch,
          two engines) → GLO/Cypher/IPSE — with Spearmint, LD, and Sparrow as
          the control planes.
        </li>
        <li>
          Three splitters explain most &quot;inconsistent Hulu behavior&quot;:
          experiment arm, engine split, population split (legacy vs ACP).
        </li>
        <li>
          Route symptoms before reading code: the seven-row triage table
          covers the recurring incident shapes.
        </li>
        <li>
          A complete Hulu PR = partner cases + engine pairs + variant
          constants + gated-analytics assertions + codegen + cypher copy +
          curl evidence.
        </li>
        <li>
          Know your assumptions: Edge cookie→header translation, flow-label
          injection, welcome-back redirect behavior, US-only enforcement —
          verified absences and strong hints, not proven mechanisms.
        </li>
      </ul>
    </div>
  );
}
