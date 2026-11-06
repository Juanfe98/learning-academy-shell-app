import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const stackDiagram = String.raw`flowchart TD
  U["User on hulu.com"] --> M["Marketing / content surfaces<br/>hulu.com — Hulu org + NEXUS<br/>(apps/marketing-unified/hulu)"]
  M -->|"links with ?hitsFlowName=suf_web_one_hulu"| C["Commerce app (CUP V2)<br/>secure.hulu.com<br/>apps/commerce/hulu in cgi-web"]
  C -->|"fetch /screens/v1/* with<br/>_hulu_at cookie, credentials:'include'"| E["Hulu / BAMTech Edge<br/>stamps x-bamtech-partner: hulu"]
  E --> F["Flex BFF<br/>growth-life-client-api<br/>isPartnerHulu() branches"]
  F --> G["GLO<br/>glo.prod.hulu.com<br/>offers · agreements · switch · cancel"]
  F --> Y["Cypher<br/>unified-commerce dictionary"]
  F --> I["IPSE · Legato · payments..."]`;

const worldsDiagram = String.raw`flowchart LR
  subgraph L["Legacy Hulu world (pre-unification)"]
    L1["hulu.com classic pages"] --> L2["Hulu-native systems:<br/>IDM/Edna identity · Spearmint experiments<br/>HITS analytics · Hulu billing"]
  end
  subgraph D["Disney unified world"]
    D1["CUP commerce (cgi-web)"] --> D2["Disney systems:<br/>MyDisney/Identity SDKs · WeaponX<br/>Glimpse/Adobe · GLO/Flex"]
  end
  L2 -->|"kept for Hulu, adapted:<br/>Spearmint→WeaponX shape at Flex middleware<br/>_hulu_at cookies on Flex fetches"| D2`;

export const toc: TocItem[] = [
  { id: "why-hulu-is-different", title: "Why Hulu Is the Odd One Out", level: 2 },
  { id: "the-two-repos", title: "The Two Repos That Matter", level: 2 },
  { id: "four-partners", title: "Four First-Class Partners", level: 2 },
  { id: "one-hulu-and-acp", title: "One Hulu, ACP & the Legacy Split", level: 2 },
  { id: "hulu-dna", title: "Hulu DNA in the Platform", level: 2 },
  { id: "hulus-own-systems", title: "Hulu's Own Parallel Systems", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Place the Feature", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatIsHuluInTheDisneyStack() {
  return (
    <div className="article-content">
      <p>
        Hulu is the brand that joined Disney&apos;s streaming platform with the
        most <strong>pre-existing infrastructure of its own</strong> — its own
        identity system, its own experimentation platform, its own analytics
        pipeline, its own billing history, and tens of millions of legacy
        subscribers. Understanding Hulu inside the Disney stack is therefore
        not about learning a new app; it is about learning{" "}
        <em>how two worlds were stitched together</em>, and which seams are
        still visible in the code today. This module builds that mental model;
        every later module zooms into one seam.
      </p>

      <h2 id="why-hulu-is-different">Why Hulu Is the Odd One Out</h2>
      <p>
        Disney+, ESPN, and Hulu all sell subscriptions through the same two
        codebases — the <code>cgi-web</code> frontend monorepo and the{" "}
        <code>growth-life-client-api</code> backend-for-frontend
        (&quot;Flex&quot;). But Hulu is unique on four axes, each of which gets
        its own module later:
      </p>
      <ArticleTable caption="The four axes where Hulu diverges from Disney+ and ESPN. Each row is a whole module later in this academy.">
        <table>
          <thead>
            <tr>
              <th>Axis</th>
              <th>Disney+ / ESPN</th>
              <th>Hulu</th>
              <th>Deep dive</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identity / auth</td>
              <td>MyDisney (Identity v5 SDK / OneID v4)</td>
              <td>
                Hulu-native IDM (&quot;Edna&quot;) — <code>_hulu_at</code> /{" "}
                <code>_hulu_session</code> cookies, <code>@solo/identity-hulu</code>
              </td>
              <td>Module: Identity &amp; Auth</td>
            </tr>
            <tr>
              <td>Experimentation</td>
              <td>WeaponX via BAM SDK (Mystique)</td>
              <td>
                <strong>Spearmint</strong> (<code>sprmnt-*</code>) via the{" "}
                <code>_hulu_assignments</code> cookie; BAM SDK never boots
              </td>
              <td>Module: Spearmint</td>
            </tr>
            <tr>
              <td>Analytics</td>
              <td>Glimpse / Adobe</td>
              <td>
                <strong>HITS</strong> (Hulu-native, Minerva schemas, posts to
                vortex.hulu.com) + Tealium + Adobe — all three at once
              </td>
              <td>Module: Analytics</td>
            </tr>
            <tr>
              <td>Subscriber base</td>
              <td>Born on Disney billing</td>
              <td>
                Split between <em>legacy Hulu-billed</em> subs and{" "}
                <em>unified D2C (&quot;ACP&quot;)</em> subs — code must serve
                both
              </td>
              <td>Module: Products &amp; SKUs</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="the-two-repos">The Two Repos That Matter</h2>
      <MermaidDiagram
        chart={stackDiagram}
        title="The Hulu Request Stack, Top to Bottom"
        caption="Everything you will ever debug for Hulu web commerce lives on this vertical: the commerce app in cgi-web, the Edge that stamps the partner header, and the Flex BFF that branches on it."
        minHeight={520}
      />
      <p>
        Two repositories cover nearly the entire Hulu web-commerce surface:
      </p>
      <ul>
        <li>
          <strong><code>cgi-web</code></strong> — pnpm/turbo monorepo. Hulu
          gets its own Next.js Pages-Router app at{" "}
          <code>apps/commerce/hulu</code> (package{" "}
          <code>@solo/commerce-hulu</code>, &quot;Hulu commerce application
          using CUP V2&quot;) plus a marketing app at{" "}
          <code>apps/marketing-unified/hulu</code>. Most UI logic is shared
          across brands via <code>packages/cgi/commerce-base</code>; the
          Hulu-specific data layer is{" "}
          <code>packages/cgi/data-interface-hulu</code>.
        </li>
        <li>
          <strong><code>growth-life-client-api</code></strong> (&quot;Flex&quot;)
          — a template-driven Koa BFF that returns whole screens as JSON. Hulu
          has one dedicated screen domain (<code>src/domain/screen/hulu/</code>
          — Account Home) and two dedicated routes, but its much larger
          footprint is <strong>~140 <code>isPartnerHulu()</code> call
          sites</strong> branching inside shared screens.
        </li>
      </ul>
      <p>
        The seam between them: the commerce app fetches{" "}
        <code>/screens/v1/...</code> from Flex through Hulu&apos;s Edge with{" "}
        <code>credentials: &apos;include&apos;</code>, and Edge stamps{" "}
        <code>x-bamtech-partner: hulu</code> before Flex ever sees the request.
      </p>

      <h2 id="four-partners">Four First-Class Partners</h2>
      <p>
        Inside Flex, Hulu is not a special case bolted on — it is one of four
        first-class values of the <code>Partner</code> type that the entire
        domain layer branches on:
      </p>
      <CodeBlock
        code={`// growth-life-client-api — src/domain/screen/common/types.ts:150-156
export const PARTNERS: Readonly<Record<Partner, Partner>> = {
  disney: 'disney',
  hulu: 'hulu',
  espn: 'espn',
  star: 'star',
  unknown: 'unknown',
};

// src/domain/common/util.ts:205 — the single most important Hulu function
export function isPartnerHulu(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === 'hulu';
}`}
        lang="typescript"
        filename="growth-life-client-api (excerpts)"
      />
      <p>
        In <code>cgi-web</code>, the equivalent statement is structural rather
        than conditional: each brand is a <em>separate Next.js app</em>, and{" "}
        <code>apps/commerce/hulu/next.config.js:18</code> hardcodes{" "}
        <code>const productName = &apos;hulu&apos;</code>. Brand switching
        happens at build/deploy time on the frontend, and at request time (via
        the header) on the backend. Keep that asymmetry in your head — it
        explains why frontend Hulu work means &quot;which app am I in&quot; and
        backend Hulu work means &quot;which branch am I in&quot;.
      </p>

      <h2 id="one-hulu-and-acp">One Hulu, ACP &amp; the Legacy Split</h2>
      <p>
        You will hear three product terms constantly. Two of them are{" "}
        <strong>not code identifiers</strong>, so it is worth pinning down what
        the code actually says:
      </p>
      <ul>
        <li>
          <strong>&quot;One Hulu&quot;</strong> — the product/marketing name
          for the unified Hulu experience after Disney integration.{" "}
          <em>[ASSUMPTION — verified absent from code: repo-wide greps for{" "}
          <code>oneHulu</code>/<code>one-hulu</code> find no application
          constant. The term surfaces in analytics as the{" "}
          <code>hitsFlowName=suf_web_one_hulu</code> flow label injected by
          entry links.]</em>
        </li>
        <li>
          <strong>&quot;ACP&quot;</strong> — Account Consolidation Program: the
          migration of Hulu subscribers onto unified Disney account/billing
          infrastructure. This one <em>is</em> visible in code comments —
          e.g.{" "}
          <code>src/domain/screen/hulu/constants.ts:27</code>:{" "}
          <em>&quot;Allow legacy Hulu subscriptions on ACP Account Home due to
          ACP subs migration&quot;</em>, and the flag JSDoc for{" "}
          <code>enable-bundle-hulu-login-on-success</code>:{" "}
          <em>&quot;With the subs migration, Hulu is auto-activated and no
          longer requires /commerce/activate/hulu.&quot;</em>
        </li>
        <li>
          <strong>&quot;Legacy Hulu&quot;</strong> — a subscription whose
          agreement source is Hulu-native billing, detected precisely in code:
        </li>
      </ul>
      <CodeBlock
        code={`// growth-life-client-api — src/domain/common/util.ts:245-267
export function isLegacyHuluSubscription(agreement): boolean {
  const { type, partner } = agreement.source;
  return type === 'HULU' && partner.toLowerCase() === 'hulu';
}

// 3P = billed through a third-party provider (e.g. a carrier), still legacy
export function isLegacyHulu3PSubscription(agreement): boolean {
  const { provider } = agreement.source;
  return isLegacyHuluSubscription(agreement) && provider.toLowerCase() !== 'hulu';
}`}
        lang="typescript"
        filename="src/domain/common/util.ts"
      />
      <p>
        The practical upshot: any Hulu account-management screen must be ready
        to render <em>both</em> populations. Flex&apos;s Hulu Account Home
        widens its allowed agreement sources to{" "}
        <code>[&apos;DIRECT&apos;, &apos;OPS&apos;, &apos;CST&apos;,
        &apos;HULU&apos;]</code> for exactly this reason — but only behind the{" "}
        <code>enable-legacy-hulu-subscription-details</code> LaunchDarkly flag.
      </p>

      <h2 id="hulu-dna">Hulu DNA in the Platform</h2>
      <p>
        A fun and genuinely useful onboarding fact: the shared platform is
        historically <em>built on Hulu&apos;s infrastructure</em>, and the
        fossils are everywhere. Recognizing them saves you real confusion:
      </p>
      <ArticleTable caption="Hulu fossils in the shared stack — none of these mean 'Hulu-only'; they are historical artifacts that now serve all brands.">
        <table>
          <thead>
            <tr>
              <th>Fossil</th>
              <th>Where</th>
              <th>What it actually is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>HULU_ENV</code></td>
              <td>
                <code>src/lib/environment.ts:2</code> (flex)
              </td>
              <td>
                The environment variable that selects local/staging/prod for{" "}
                <strong>all four brands</strong> — not a Hulu toggle
              </td>
            </tr>
            <tr>
              <td><code>glo.staging.hulu.com</code></td>
              <td>
                <code>src/config/defaults.ts:94</code> (flex)
              </td>
              <td>
                GLO — the offers/agreements orchestrator behind every brand —
                runs on Hulu-domain infrastructure
              </td>
            </tr>
            <tr>
              <td><code>plasma.ava.prod.hulu.com</code></td>
              <td>
                <code>src/config/production.ts:155</code> (flex)
              </td>
              <td>Payment backend, same story</td>
            </tr>
            <tr>
              <td><code>github.prod.hulu.com/PEPC/...</code></td>
              <td>
                <code>src/domain/models/offerType.ts:73,109</code>
              </td>
              <td>
                Offer-type comments cite Hulu&apos;s own Eligibility-Service
                repos as the source of truth for package cohorts
              </td>
            </tr>
            <tr>
              <td><code>vortex.hulu.com</code>, Minerva</td>
              <td>
                <code>packages/instrumentation/src/hits/README.md</code>{" "}
                (cgi-web)
              </td>
              <td>HITS analytics ingestion and schema registry</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="hulus-own-systems">Hulu&apos;s Own Parallel Systems</h2>
      <MermaidDiagram
        chart={worldsDiagram}
        title="Two Worlds, Stitched"
        caption="The unification strategy in one picture: Hulu-native systems were kept, and adapters were built at the boundaries — the Spearmint→WeaponX normalization in Flex middleware is the archetype."
        minHeight={420}
      />
      <p>
        The integration pattern repeats across every axis:{" "}
        <strong>keep the Hulu-native system, adapt at the boundary</strong>.
        Spearmint assignments are converted into WeaponX&apos;s shape inside
        Flex middleware so downstream code never knows the difference. Hulu
        auth cookies ride on standard <code>fetch</code> credentials instead of
        bearer tokens, so the Flex client code is brand-agnostic. HITS trackers
        sit side by side with Adobe and Tealium behind one{" "}
        <code>useCoreAnalytics([...])</code> array. When you meet a weird Hulu
        special case, ask first: <em>is this a boundary adapter for a
        Hulu-native system?</em> The answer is usually yes, and it tells you
        where the real logic lives.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How does Hulu fit into Disney's streaming platform?"`}
        intro={
          <>
            The weak answer says &quot;it&apos;s one of the brands.&quot; The
            strong answer explains the <em>stitching strategy</em> and can name
            the seams.
          </>
        }
        steps={[
          "Open with the frame: Hulu joined with mature infrastructure of its own — identity, experimentation, analytics, billing — so the platform kept those systems and built adapters at the boundaries instead of replacing them.",
          "Name the two codebases: apps/commerce/hulu in cgi-web (a separate Next.js app per brand) and growth-life-client-api where Hulu is one of four first-class partner values branched on via isPartnerHulu().",
          "Give the archetype adapter: Spearmint experiment assignments arrive in a Hulu cookie, and Flex middleware normalizes them into WeaponX's shape so all downstream experiment code is platform-agnostic.",
          "Show you know the subscriber reality: the base splits into legacy Hulu-billed and unified ACP subscriptions, and account screens must render both — that is why isLegacyHuluSubscription() and the HULU agreement-source type exist.",
          "Close with the fossils: HULU_ENV and glo.*.hulu.com are historical artifacts of the platform's Hulu origins that now serve every brand — knowing this prevents a whole class of misreadings.",
        ]}
      />

      <h2 id="challenge">Challenge: Place the Feature</h2>
      <InterviewChallenge
        title="Four tickets, four layers"
        scenario={
          <>
            Your team lead hands you four Hulu tickets on your first day:
            <br />
            <strong>(a)</strong> &quot;Hulu cancel page should show a new
            retention offer headline for 50% of users&quot;;
            <br />
            <strong>(b)</strong> &quot;Legacy Hulu subscribers see an empty
            Account Home&quot;;
            <br />
            <strong>(c)</strong> &quot;The Hulu billing page renders a Disney+
            logo in the footer&quot;;
            <br />
            <strong>(d)</strong> &quot;Signup conversions from hulu.com links
            are not showing up in the HITS dashboard.&quot;
          </>
        }
        tasks={[
          "For each ticket, name the repo (cgi-web vs growth-life-client-api) and the specific subsystem you would open first.",
          "For (a), decide which experimentation platform the 50% split would run on, and why.",
          "For (b), name the function and the feature flag most likely involved.",
          "For (d), explain where the flow label that HITS dashboards segment on actually comes from.",
        ]}
        pitfalls={[
          "Assuming all experimentation is WeaponX — Hulu's splits run on Spearmint.",
          "Looking for a Hulu theme bug in growth-life-client-api — theming is per-app in cgi-web.",
          "Forgetting that 'legacy Hulu' is a precise agreement-source condition, not a vibe.",
          "Searching Flex for suf_web_one_hulu — the flow name never reaches the backend.",
        ]}
        signal="A strong answer routes each ticket to a layer before proposing any fix, and can say which system is Hulu-native vs shared."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a)</strong> Experiment on a Flex-rendered screen →{" "}
          <code>growth-life-client-api</code>. The 50% split is a{" "}
          <strong>Spearmint</strong> experiment (Hulu does not use
          WeaponX/Mystique): a <code>sprmnt-GREAT-*</code> feature ID in{" "}
          <code>src/lib/experiments/registry.ts</code>, consumed via{" "}
          <code>getExperimentTreatment</code> in the cancel screen service —
          exactly the shape of the real{" "}
          <code>sprmnt-GREAT-cancel-save-header</code> experiment.
        </p>
        <p>
          <strong>(b)</strong> Flex — <code>isLegacyHuluSubscription()</code>{" "}
          (<code>src/domain/common/util.ts:245</code>) plus the{" "}
          <code>enable-legacy-hulu-subscription-details</code> flag, which
          widens Account Home&apos;s allowed agreement-source types to include{" "}
          <code>&apos;HULU&apos;</code>. Flag off → legacy subs filtered out →
          empty screen.
        </p>
        <p>
          <strong>(c)</strong> <code>cgi-web</code> — brand assets/theming are
          per-app and per-token-set (<code>cgi-design-tokens</code>{" "}
          <code>hulu.css</code>/<code>hulu-dark.css</code>, plus the shared
          footer package). Flex sends copy and structure, not brand logos.
        </p>
        <p>
          <strong>(d)</strong> The HITS flow label is the{" "}
          <code>hitsFlowName</code> <em>URL query parameter</em> read by{" "}
          <code>useCommerceQueryParams()</code> in <code>commerce-base</code>{" "}
          and defaulted to <code>suf_web_default</code> when absent. If
          hulu.com entry links stopped appending{" "}
          <code>hitsFlowName=suf_web_one_hulu</code>, conversions still fire —
          they just land under the default flow label. Check the inbound links
          first, not the tracker.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu = the brand with its own pre-existing systems; the platform kept
          them and built boundary adapters (Spearmint→WeaponX shape, cookie
          auth, parallel HITS trackers).
        </li>
        <li>
          Two repos cover the surface: <code>apps/commerce/hulu</code> in
          cgi-web (separate app per brand, brand fixed at build time) and Flex,
          where Hulu is a first-class <code>Partner</code> branched on at
          request time via <code>isPartnerHulu()</code>.
        </li>
        <li>
          &quot;One Hulu&quot; is product language (visible only as the{" "}
          <code>suf_web_one_hulu</code> analytics flow label); &quot;ACP&quot;
          is the account/billing unification visible in code comments and
          flags; &quot;legacy Hulu&quot; is a precise agreement-source check.
        </li>
        <li>
          <code>HULU_ENV</code>, <code>glo.*.hulu.com</code>,{" "}
          <code>vortex.hulu.com</code> — Hulu fossils that now serve all
          brands. Never read them as Hulu-only switches.
        </li>
        <li>
          The subscriber base is split legacy vs ACP, and account surfaces must
          serve both — behind flags, with precise detection helpers.
        </li>
      </ul>
    </div>
  );
}
