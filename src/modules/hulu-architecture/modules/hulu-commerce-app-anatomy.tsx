import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const monorepoDiagram = String.raw`flowchart TD
  subgraph APPS["cgi-web / apps"]
    H["commerce/hulu<br/>@solo/commerce-hulu · CUP V2"]
    D["commerce/disneyPlus"]
    E["commerce/espn"]
    MH["marketing-unified/hulu<br/>NEXUS · CMS-driven · Next 13"]
  end
  subgraph PKG["cgi-web / packages"]
    CB["cgi/commerce-base<br/>shared pages, hooks, flex components"]
    DIH["cgi/data-interface-hulu<br/>Hulu Flex client + spearmint parsing"]
    IH["identity-hulu<br/>web-login-ui (IDM/Edna)"]
    DT["cgi/cgi-design-tokens<br/>hulu.css · hulu-dark.css"]
    INS["instrumentation<br/>HITS · Tealium · Adobe · Glimpse"]
  end
  H -->|"pages import shared page components"| CB
  H -->|"hydrates dataInterfaceAtom with"| DIH
  H -->|"sign-up renders"| IH
  H --> DT
  H --> INS
  D -.->|"same commerce-base,<br/>different data-interface"| CB
  E -.-> CB`;

const layoutDiagram = String.raw`flowchart TD
  A["_app.page.tsx"] --> B["hulu-layout.tsx<br/>apps/commerce/hulu/src/layout"]
  B --> C["EnsureHuluAuthToken<br/>anonymous _hulu_at bootstrap<br/>blocks render until complete"]
  B --> D["Analytics trackers wired:<br/>useHitsAnalyticsTracker('hulu-acp')<br/>useTealiumTracker('hulu-acp')<br/>adobeAnalyticsTracker"]
  B --> E["OneTrust consent gate<br/>hasOneTrustConsent"]
  B --> F["hydrate-data-interface.tsx<br/>buildHuluDataInterface → dataInterfaceAtom"]
  C --> G["{hasHuluAuthToken && children}<br/>page renders"]`;

export const toc: TocItem[] = [
  { id: "one-brand-one-app", title: "One Brand = One Next.js App", level: 2 },
  { id: "monorepo-position", title: "Where Hulu Sits in the Monorepo", level: 2 },
  { id: "dev-servers-and-domains", title: "Dev Servers, Ports & Domains", level: 2 },
  { id: "route-inventory", title: "The Route Inventory", level: 2 },
  { id: "hulu-layout", title: "hulu-layout.tsx: The App Spine", level: 2 },
  { id: "marketing-app", title: "The Marketing App Next Door", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Find the File", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluCommerceAppAnatomy() {
  return (
    <div className="article-content">
      <p>
        The Hulu web-commerce experience is a dedicated Next.js{" "}
        <strong>Pages Router</strong> application —{" "}
        <code>apps/commerce/hulu</code>, package name{" "}
        <code>@solo/commerce-hulu</code>, described in its own{" "}
        <code>package.json</code> as the &quot;Hulu commerce application using
        CUP V2&quot;. Almost none of its UI lives inside it: pages are thin
        shells importing shared page components from{" "}
        <code>packages/cgi/commerce-base</code>, with Hulu-ness injected
        through the data interface, the layout, and the theme. This module maps
        the app so that &quot;where is the code for X&quot; becomes a reflex.
      </p>

      <h2 id="one-brand-one-app">One Brand = One Next.js App</h2>
      <p>
        cgi-web ships one commerce app per brand (<code>hulu</code>,{" "}
        <code>disneyPlus</code>, <code>espn</code>) rather than one
        multi-tenant app. Brand identity is fixed at build time:{" "}
        <code>apps/commerce/hulu/next.config.js:18</code> hardcodes{" "}
        <code>const productName = &apos;hulu&apos;</code>, and the dev script
        sets <code>PRODUCT=hulu</code> <em>inline</em>:
      </p>
      <CodeBlock
        code={`// apps/commerce/hulu/package.json:33-34
"dev:proxy": "wait-on -l http://local.huluqa.com:5030/healthcheck && PORT=5003 TARGET_PORT=5030 TARGET_HOST=127.0.0.1 pnpm exec wcs ssl-proxy -c ../../.certs -p 5003 --ignore-ws-errors true",
"dev:start": "pnpm run local-setup concurrently --names \\"PROXY,SERVER\\" \\"npm run dev:proxy\\" \\"PORT=5030 PRODUCT=hulu next dev\\"",`}
        lang="json"
        filename="apps/commerce/hulu/package.json"
      />
      <p>
        That inline <code>PRODUCT=hulu</code> is a small detail with a real
        consequence: Disney+ and ESPN rely on dotenv loading for{" "}
        <code>PRODUCT</code>, so tooling that bypasses dotenv silently falls
        back to Disney+ — but Hulu&apos;s dev path is immune because the
        variable is baked into the script. (The flip side: any <em>other</em>{" "}
        way of launching the Hulu app must remember to set it.)
      </p>

      <h2 id="monorepo-position">Where Hulu Sits in the Monorepo</h2>
      <MermaidDiagram
        chart={monorepoDiagram}
        title="Hulu's Dependency Neighborhood in cgi-web"
        caption="The app is a shell; commerce-base carries the shared pages, data-interface-hulu carries the Hulu-specific data layer, identity-hulu carries login/create-account UI."
        minHeight={520}
      />
      <ArticleTable caption="The packages that matter for Hulu work, and what changes where.">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Role for Hulu</th>
              <th>Change here when...</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>packages/cgi/commerce-base</code></td>
              <td>
                Shared CUP V2 pages/hooks/Flex components used by all three
                brand apps
              </td>
              <td>
                Behavior should change for all brands (or fork via props/flags)
              </td>
            </tr>
            <tr>
              <td><code>packages/cgi/data-interface-hulu</code></td>
              <td>
                Hulu&apos;s API abstraction: Flex client, Spearmint cookie
                parsing, Hulu endpoints
              </td>
              <td>
                Hulu talks to a backend differently (new screen key, headers,
                auth)
              </td>
            </tr>
            <tr>
              <td><code>packages/identity-hulu</code></td>
              <td>
                &quot;web-login-ui&quot; — Hulu&apos;s IDM/Edna-backed login
                and create-account components
              </td>
              <td>Login/sign-up UI or identity contract changes</td>
            </tr>
            <tr>
              <td><code>packages/cgi/cgi-design-tokens</code></td>
              <td>
                <code>hulu.ts</code>/<code>huluDark.ts</code> sources →{" "}
                <code>dist/hulu.css</code>, <code>hulu-dark.css</code>
              </td>
              <td>Brand colors/tokens change</td>
            </tr>
            <tr>
              <td><code>packages/instrumentation</code></td>
              <td>HITS + Tealium + Adobe + Glimpse trackers and types</td>
              <td>Analytics schemas/events change</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        App-local code is small and purposeful:{" "}
        <code>src/layout/</code> (the spine, below), <code>src/identity/</code>{" "}
        (auth bootstrap + sign-up page), <code>src/account/</code>,{" "}
        <code>src/common/</code>, and <code>playwright/</code> E2E specs.
      </p>

      <h2 id="dev-servers-and-domains">Dev Servers, Ports &amp; Domains</h2>
      <ArticleTable caption="Local dev topology. The SSL proxy is what gives you the real-ish domain with cookies working.">
        <table>
          <thead>
            <tr>
              <th>Thing</th>
              <th>Value</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Next dev server</td>
              <td><code>127.0.0.1:5030</code>, <code>PRODUCT=hulu</code></td>
              <td><code>package.json:34</code></td>
            </tr>
            <tr>
              <td>SSL proxy (what you open)</td>
              <td>
                <code>https://local.huluqa.com:5003</code>
              </td>
              <td><code>package.json:33</code></td>
            </tr>
            <tr>
              <td>Typical smoke URL</td>
              <td>
                <code>https://local.huluqa.com:5003/commerce/plans</code>{" "}
                <em>[ASSUMPTION — inferred from proxy config; root README only
                documents the Disney+ analog]</em>
              </td>
              <td>—</td>
            </tr>
            <tr>
              <td>Doc discrepancy</td>
              <td>
                HITS README cites <code>local.hulu.com:5003</code> — likely
                stale vs <code>local.huluqa.com</code>{" "}
                <em>[ASSUMPTION — unresolved]</em>
              </td>
              <td><code>instrumentation/src/hits/README.md:182</code></td>
            </tr>
            <tr>
              <td>Secrets</td>
              <td>
                Vault service <code>hulu-commerce</code>, staging namespace;{" "}
                <code>pnpm -w run setup configure secrets</code>
              </td>
              <td><code>apps/commerce/hulu/.env.local.example</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="route-inventory">The Route Inventory</h2>
      <p>
        All routes use the <code>.page.tsx</code> suffix convention under{" "}
        <code>apps/commerce/hulu/pages/</code>. Grouped by job:
      </p>
      <CodeBlock
        code={`# SUF / signup
/commerce/plans            # plan select (Flex: landingPlans)
/commerce/billing          # payment entry
/commerce/purchase         # order submission
/commerce/success          # signup success
/commerce/cadence          # billing-cadence selection
/identity/sign-up          # Edna create-account (identity-hulu)
/identity/start /verify /magic

# Account management
/commerce/account          # account home (Flex: hulu/account-home)
/commerce/billing-history  /commerce/charges
/commerce/change-payment
/commerce/change-subscription/{index,confirm,setup,success}
/identity/manage-devices   /identity/delete/[slug]
/commerce/account/{manage-email-notifications,set-change-home,update-personal-info}

# Cancel / retention
/commerce/cancel/[slug]    /commerce/cancel/success
/commerce/pause            /commerce/pause/success
/commerce/restart-subscription/{confirm,success}

# Offers / misc
/commerce/redeem  /commerce/gift/*  /commerce/student/{index,loading}
/commerce/unlock  /commerce/extra-member/*
/commerce/activate/[provider]  /commerce/activate/spotify/{index,connect,partner-confirm}

# Profiles
/profiles/transfer/*  /profiles/consume-transfer
/profiles/adhoc-transfer/max-profiles
/profiles/extra-member/accept/transfer/[slug]`}
        lang="bash"
        filename="apps/commerce/hulu/pages — route inventory"
      />
      <p>
        The most telling <em>absence</em>:{" "}
        <strong>there is no <code>/commerce/welcome-back</code> route for
        Hulu</strong>, while both Disney+ and ESPN have one (verified by
        directory listing). The shared <code>WelcomeBackPage</code> component
        still exists brand-agnostically in commerce-base — Hulu simply never
        routes to it. Hulu&apos;s returning-subscriber (&quot;winback&quot;)
        traffic re-enters through the standard SUF instead.{" "}
        <em>[The redirect behavior itself is product knowledge; only the route
        absence is code-verified.]</em>
      </p>

      <h2 id="hulu-layout">hulu-layout.tsx: The App Spine</h2>
      <MermaidDiagram
        chart={layoutDiagram}
        title="What hulu-layout.tsx Wires Up"
        caption="Auth bootstrap, three analytics trackers, consent gating, and data-interface hydration — every page renders inside this."
        minHeight={480}
      />
      <p>
        <code>apps/commerce/hulu/src/layout/hulu-layout.tsx</code> is where
        Hulu-ness is injected around the shared pages: it builds the three
        analytics trackers with <code>appComponentName/app:
        &apos;hulu-acp&apos;</code> (the identifier you will grep for in
        Datadog/analytics), gates Adobe and Tealium script loading on OneTrust
        consent, and — most importantly — wraps children in{" "}
        <code>EnsureHuluAuthToken</code>, which <em>blocks rendering</em> until
        a Hulu auth cookie exists (details in the Identity module). Notably
        absent: any BAM SDK session bootstrap — Hulu never wires{" "}
        <code>isSDKEnabled</code>, which is exactly why WeaponX/Mystique flags
        fall back to static values here (Experimentation module).
      </p>

      <h2 id="marketing-app">The Marketing App Next Door</h2>
      <p>
        <code>apps/marketing-unified/hulu</code> is a separate app on a{" "}
        <em>different Next.js major</em> (the <code>catalog:growth</code>{" "}
        pnpm catalog pins <code>next: &apos;^13.5.9&apos;</code> vs commerce&apos;s{" "}
        <code>15.5.19</code>). It renders CMS-driven landing pages via an
        optional catch-all route (<code>src/pages/[[...path]].page.tsx</code>)
        with Cannonball CMS data fetching in{" "}
        <code>views/landing-page/get-server-side-props.ts</code>, and wires{" "}
        <strong>Tealium + HITS only</strong> (no Adobe) for analytics. When a
        ticket says &quot;the hulu.com landing page&quot;, this app — not the
        commerce app — is usually the owner.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"Walk me through the Hulu web app's architecture."`}
        intro={
          <>
            Strong answers lead with the shell-vs-shared split and can say
            precisely where Hulu-ness is injected.
          </>
        }
        steps={[
          "Frame it: one Next.js Pages-Router app per brand; apps/commerce/hulu is a thin shell whose pages import shared page components from packages/cgi/commerce-base.",
          "Name the injection points for Hulu-ness: build-time PRODUCT=hulu / productName, the hydrated data-interface (data-interface-hulu), hulu-layout.tsx (auth bootstrap + 3 analytics trackers + consent), and the hulu design-token themes.",
          "Show route fluency: SUF lives at /commerce/plans → billing → purchase → success; account at /commerce/account; cancel at /commerce/cancel/[slug]; and Hulu pointedly has no /commerce/welcome-back route.",
          "Mention the sibling: marketing-unified/hulu is a separate CMS-driven app on Next 13 — landing-page tickets belong there.",
          "Close with the dev topology: SSL proxy at local.huluqa.com:5003 fronting next dev on 5030 — the proxy is what makes cookie-based Hulu auth work locally.",
        ]}
      />

      <h2 id="challenge">Challenge: Find the File</h2>
      <InterviewChallenge
        title="Five changes, five homes"
        scenario={
          <>
            Product hands you five small Hulu changes: (a) change the green
            accent color on all Hulu commerce pages; (b) add a query param to
            the request the plans page makes to Flex; (c) change the text of
            the Hulu login button; (d) fire an extra HITS event when the cancel
            page loads; (e) change the headline of the hulu.com{" "}
            <code>/welcome</code> landing page.
          </>
        }
        tasks={[
          "Name the exact package (or app dir) where each change belongs.",
          "For each, state whether the change can affect Disney+ or ESPN, and why.",
          "Identify which change is most likely NOT frontend work at all, and where it would live instead.",
        ]}
        pitfalls={[
          "Editing commerce-base for a Hulu-only visual change instead of the token/theme layer.",
          "Forgetting the marketing app is a different codebase on a different Next version.",
          "Missing that page copy on Flex-driven screens comes from Cypher via Flex, not from React strings.",
          "Assuming a data-interface change is app-local — it lives in data-interface-hulu.",
        ]}
        signal="A strong answer sorts changes into shell / shared / data-interface / tokens / marketing correctly and flags the copy change as probably server-driven."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(a)</strong> <code>packages/cgi/cgi-design-tokens</code>{" "}
          (<code>src/tokens/brands/hulu.ts</code>, colors) → compiled{" "}
          <code>hulu.css</code>/<code>hulu-dark.css</code>; possibly the
          commerce-base theme mapping (<code>styles/themes/hulu.ts</code>).
          Cannot affect other brands — separate token sets.
        </p>
        <p>
          <strong>(b)</strong>{" "}
          <code>packages/cgi/data-interface-hulu/src/flex/flex-data-interface.ts</code>{" "}
          (or the calling hook in commerce-base if the param is cross-brand).
          If added in commerce-base&apos;s shared page, D+/ESPN are affected —
          that is the decision point.
        </p>
        <p>
          <strong>(c)</strong> <code>packages/identity-hulu</code> — login UI
          is Hulu&apos;s own web-login-ui component library; but if the button
          is on a Flex-driven screen, the copy is a Cypher key and the change
          is a dictionary/template change, not React.
        </p>
        <p>
          <strong>(d)</strong> commerce-base cancel page + the{" "}
          <code>packages/instrumentation</code> HITS types (new event schema
          must exist in Minerva). Affects other brands only if not gated —
          HITS tracking is wired for all, so gate on partner/app as needed.
        </p>
        <p>
          <strong>(e)</strong> <code>apps/marketing-unified/hulu</code> — and
          since pages are CMS-driven (Cannonball), the headline is likely a{" "}
          <em>CMS content change</em>, not code. This is the &quot;not
          frontend work&quot; candidate.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>apps/commerce/hulu</code> = thin shell over{" "}
          <code>commerce-base</code>; Hulu-ness injected via build-time
          product, data-interface hydration, layout, and tokens.
        </li>
        <li>
          Dev topology: <code>local.huluqa.com:5003</code> SSL proxy →{" "}
          <code>next dev</code> on 5030 with inline <code>PRODUCT=hulu</code>.
        </li>
        <li>
          Route inventory covers SUF, account, cancel/pause/restart, redeem/
          gift/student, activation (incl. Spotify), profiles —{" "}
          <strong>and no welcome-back route</strong>, unlike D+/ESPN.
        </li>
        <li>
          <code>hulu-layout.tsx</code> is the spine: blocking auth bootstrap,
          three analytics trackers under <code>hulu-acp</code>, OneTrust
          gating, data-interface hydration — and no BAM SDK.
        </li>
        <li>
          Landing pages live in <code>apps/marketing-unified/hulu</code> (Next
          13, Cannonball CMS, Tealium+HITS only).
        </li>
      </ul>
    </div>
  );
}
