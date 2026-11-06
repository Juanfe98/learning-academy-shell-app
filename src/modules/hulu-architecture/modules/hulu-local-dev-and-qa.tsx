import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const localTopologyDiagram = String.raw`flowchart LR
  subgraph FE["cgi-web local"]
    P["https://local.huluqa.com:5003<br/>(wcs ssl-proxy)"] --> N["next dev :5030<br/>PRODUCT=hulu"]
  end
  subgraph BE["growth-life-client-api local"]
    F["npm run local → :3200<br/>HULU_ENV=local<br/>templates from local fixtures"]
    F2["npm run dev<br/>staging backends,<br/>templates from S3"]
  end
  C["curl / Bruno"] -->|"x-bamtech-partner: hulu<br/>+ experiment headers"| F
  P -.->|"edge base URL config"| F`;

const qaLaddersDiagram = String.raw`flowchart TD
  A["What do you need to verify?"] --> B{"Pure Flex screen logic?"}
  B -->|yes| C["curl local Flex :3200<br/>hand-stamped headers<br/>(fastest, no UI)"]
  B -->|no| D{"Client rendering / hooks?"}
  D -->|yes| E["pnpm dev:commerce:hulu<br/>local.huluqa.com:5003<br/>(+ local or staging Flex)"]
  D -->|no| F{"Real staging data / accounts?"}
  F -->|yes| G["staging QA edge<br/>Bearer token; region follows<br/>the ACCOUNT's country"]
  A --> H["Experiment variants?"]
  H --> I["Force via base64 headers<br/>(weaponx/spearmint) — works locally,<br/>no dashboard assignment needed"]`;

export const toc: TocItem[] = [
  { id: "run-both-repos", title: "Running Both Repos Locally", level: 2 },
  { id: "flex-curl-recipes", title: "Flex Curl Recipes for Hulu", level: 2 },
  { id: "forcing-experiments", title: "Forcing Experiment Variants", level: 2 },
  { id: "testing-traps", title: "The Testing Traps", level: 2 },
  { id: "staging-notes", title: "Staging & QA Edge Notes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Build the QA Plan", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluLocalDevAndQa() {
  return (
    <div className="article-content">
      <p>
        Everything in the previous modules becomes practical here: how to run
        the Hulu stack locally, how to curl Flex as if you were a Hulu client,
        how to force any experiment arm without touching a dashboard, and the
        environment traps that produce convincing-but-wrong results. This is
        the module to keep open while working tickets.
      </p>

      <h2 id="run-both-repos">Running Both Repos Locally</h2>
      <MermaidDiagram
        chart={localTopologyDiagram}
        title="Local Topology"
        caption="Two independent local stacks. For most Flex-side tickets the curl path is all you need; the frontend stack matters for rendering and hook work."
        minHeight={380}
      />
      <ArticleTable caption="Commands and their gotchas. HULU_ENV is the flex environment selector for ALL brands, not a Hulu switch.">
        <table>
          <thead>
            <tr>
              <th>Stack</th>
              <th>Command</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Flex, local fixtures</td>
              <td><code>npm run local</code></td>
              <td>
                <code>HULU_ENV=local</code>, port 3200, template configs from
                local fixtures — the default for ticket work
              </td>
            </tr>
            <tr>
              <td>Flex, staging backends</td>
              <td><code>npm run dev</code></td>
              <td>Fetches templates from S3, talks to staging GLO</td>
            </tr>
            <tr>
              <td>Hulu commerce app</td>
              <td><code>pnpm dev:commerce:hulu</code> (repo root)</td>
              <td>
                Proxy at <code>https://local.huluqa.com:5003</code> → next dev
                :5030; must use the proxy domain for cookie auth
              </td>
            </tr>
            <tr>
              <td>Hulu marketing app</td>
              <td>marketing-unified dev scripts</td>
              <td>Different Next major (13); CMS-driven pages</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Two flex-repo habits that save CI round-trips: never run bare{" "}
        <code>npx jest</code> (without <code>HULU_ENV=ci</code> it fetches
        template configs from <em>real staging S3</em>, so new local config
        entries are silently ignored), and avoid the full{" "}
        <code>npm run test</code> locally — targeted jest + tsc + eslint
        locally, full suite in CI.
      </p>

      <h2 id="flex-curl-recipes">Flex Curl Recipes for Hulu</h2>
      <p>
        The golden rule from the partner module: <strong>no partner header, no
        Hulu</strong> — you get a plausible Disney screen instead. Base
        recipe:
      </p>
      <CodeBlock
        code={`# Hulu Account Home (the Hulu-only screen)
curl 'http://localhost:3200/screens/v1/hulu/account-home' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-account-id: <account-id>' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: local-qa-1'

# Shared screen on the Hulu branch (e.g. SUF preview/plans)
curl 'http://localhost:3200/screens/v1/landing/plans?<params>' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: local-qa-2'`}
        lang="bash"
        filename="hulu curl base recipes"
      />
      <p>
        Add per-screen requirements from the route&apos;s Joi validation
        (account-home requires <code>accountId</code>, <code>partner</code>,{" "}
        <code>locationCountryCode</code>, <code>requestId</code>). For
        Hulu-legacy scenarios add{" "}
        <code>x-disney-identity-hulu-legacy-device-id</code>; for
        device-capability branches add{" "}
        <code>x-hulu-device-capabilities</code>.
      </p>

      <h2 id="forcing-experiments">Forcing Experiment Variants</h2>
      <p>
        Because assignments are just headers, you never need a dashboard
        assignment to QA an arm. Spearmint wire format:{" "}
        <code>{`{v1:[{e,t,n:'featureId--variantId'}]}`}</code>; WeaponX:{" "}
        <code>{`{experiments:{featureId:{variant_id,version}}}`}</code>:
      </p>
      <CodeBlock
        code={`# Force a Spearmint arm (Hulu-style transport)
SPRMNT='{"v1":[{"e":1,"t":2,"n":"sprmnt-GREAT-cancel-save-header--loyalty"}]}'
curl 'http://localhost:3200/screens/v1/account/cancel' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: qa-sprmnt' \\
  -H "x-bamtech-spearmint-assignments: $(printf '%s' "$SPRMNT" | base64)"

# Force the same experiment WeaponX-style (also works — WeaponX header is preferred)
WPNX='{"experiments":{"sprmnt-GREAT-cancel-save-header":{"variant_id":"loyalty","version":1}}}'
curl ... -H "x-bamtech-weaponx-assignments: $(printf '%s' "$WPNX" | base64)"`}
        lang="bash"
        filename="forcing experiment arms"
      />
      <p>
        Both work against local Flex because the middleware decodes whichever
        header arrives (WeaponX preferred). Remember the precedence: if you
        send <em>both</em> headers, Spearmint is ignored — do not mix them in
        one request when testing the Spearmint decode path specifically.
        Client-side Spearmint hooks can be exercised by setting the{" "}
        <code>_hulu_assignments</code> cookie on{" "}
        <code>local.huluqa.com</code> with the same base64 payload.
      </p>

      <h2 id="testing-traps">The Testing Traps</h2>
      <ArticleTable caption="Environment traps that produce wrong-but-convincing results. Each has burned someone.">
        <table>
          <thead>
            <tr>
              <th>Trap</th>
              <th>Mechanism</th>
              <th>Antidote</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Missing partner header</td>
              <td>
                Silent Disney fallback (<code>setValidPartner</code>, config
                merge <code>unknown</code> key)
              </td>
              <td>
                Header templates in your curl/Bruno collection; partner set
                explicitly in every mock context
              </td>
            </tr>
            <tr>
              <td>Bare <code>npx jest</code></td>
              <td>
                Fetches template configs from real staging S3; local config
                edits invisible
              </td>
              <td><code>HULU_ENV=ci</code> for local jest runs</td>
            </tr>
            <tr>
              <td>Bare <code>localhost:5030</code></td>
              <td>
                Cookie domain scoping breaks the auth bootstrap → blank app
              </td>
              <td>Always use <code>https://local.huluqa.com:5003</code></td>
            </tr>
            <tr>
              <td>Wrong <code>PRODUCT</code> fixtures</td>
              <td>
                cgi-web jest runs brand-parameterized; app-local test scripts
                can load another brand&apos;s fixtures
              </td>
              <td>
                Use the brand-scoped scripts (e.g.{" "}
                <code>pnpm test:commerce:jest:hulu</code>)
              </td>
            </tr>
            <tr>
              <td>Both experiment headers sent</td>
              <td>WeaponX preferred; Spearmint silently ignored</td>
              <td>One transport per request when testing decode paths</td>
            </tr>
            <tr>
              <td>Mocking conversion wrappers</td>
              <td>
                Mocking <code>getOffers()</code>/<code>getAgreementDetails()</code>{" "}
                skips real conversion code
              </td>
              <td>
                Mock the GLO client
                (<code>GrowthLifeOrchestratorClient.retrieveOffersV2</code> /{" "}
                <code>.agreementDetails</code>) with factories
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="staging-notes">Staging &amp; QA Edge Notes</h2>
      <MermaidDiagram
        chart={qaLaddersDiagram}
        title="Choosing Your QA Surface"
        caption="Match the surface to the question: curl local Flex for screen logic, the proxied app for rendering, staging edge for real accounts, forced headers for experiment arms."
        minHeight={480}
      />
      <ul>
        <li>
          <strong>Staging edge behavior:</strong> on the QA edge, location
          headers are ignored — the effective region follows the{" "}
          <em>account&apos;s</em> country (create a test account in the target
          country to test regions). Local Flex is the opposite: headers win.{" "}
          <em>[Team operational knowledge, verified in prior work; not a code
          citation.]</em>
        </li>
        <li>
          <strong>Traffic Director locally:</strong>{" "}
          <code>packages/traffic-director-dev</code> runs stage-web Traffic
          Director in Docker (<code>pnpm dev:traffic-director</code>) when you
          need real routing semantics.
        </li>
        <li>
          <strong>Spearmint staging:</strong> experiments have staging
          dashboards (<code>spearmint.staging.hulu.com</code> links in
          registry JSDoc) — but forced headers are faster than staging
          assignments for arm-by-arm QA.
        </li>
        <li>
          <strong>Evidence discipline:</strong> for PR evidence, capture
          before/after curls per scenario (the team&apos;s house pattern:
          scenario matrix + curl outputs; Bruno collection for
          reproducibility).
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How would you QA a Hulu change before opening a PR?"`}
        intro={
          <>
            Strong answers pick the cheapest sufficient surface and stamp the
            right headers — they never say &quot;deploy to staging and
            click.&quot;
          </>
        }
        steps={[
          "State the ladder: curl local Flex for screen logic → proxied local app for rendering → staging edge only when real accounts/data matter.",
          "Show header fluency: x-bamtech-partner: hulu on every request, plus the per-route Joi requirements; name the silent-Disney-fallback as the reason this is non-negotiable.",
          "Demonstrate experiment QA: base64 the wire payload and force arms via x-bamtech-spearmint-assignments (or the WeaponX header) — no dashboard assignment needed; one transport per request.",
          "Name the environment traps you actively avoid: HULU_ENV=ci for local jest, proxy domain for cookie auth, brand-scoped test scripts for fixtures.",
          "Close with test-layer discipline: mock the GLO client (not conversion wrappers), build contexts with explicit partner, and assert behaviorally per arm.",
        ]}
      />

      <h2 id="challenge">Challenge: Build the QA Plan</h2>
      <InterviewChallenge
        title="QA the duo-upsell experiment fix"
        scenario={
          <>
            You just fixed a bug where the Hulu{" "}
            <code>sprmnt-GREAT-duo-upsell-billing</code> card showed the wrong
            copy for the <code>content-focused</code> arm on the billing
            ledger. Write the QA plan you would attach to the PR.
          </>
        }
        tasks={[
          "List the scenario matrix (arms × relevant user states) you would verify.",
          "Write the exact curl skeleton for one arm, headers included.",
          "State which surfaces you would NOT use and why (keep the plan minimal).",
          "Describe the service-test additions that lock the fix in, following the repo's experiment-testing rules.",
        ]}
        pitfalls={[
          "QA-ing only the fixed arm — control and brand-focused need regression checks.",
          "Waiting for a staging Spearmint assignment instead of forcing headers.",
          "Hardcoding the feature id/variant strings in tests instead of importing from registry/variants.",
          "Skipping the platform-assembly check if the ledger screen is migrating.",
        ]}
        signal="A strong plan is a small matrix with forced-header curls per arm, plus tests that use destructured variant constants."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Matrix:</strong> arms <code>control</code> /{" "}
          <code>brand-focused</code> / <code>content-focused</code> /{" "}
          <em>unassigned (no header)</em> × Hulu-standalone subscriber (the
          card&apos;s target population); plus one Disney+ request to prove no
          bleed (card absent). Unassigned must behave as control — the
          undefined-treatment rule.
        </p>
        <CodeBlock
          code={`ARM='content-focused'
PAYLOAD="{\\"v1\\":[{\\"e\\":1,\\"t\\":3,\\"n\\":\\"sprmnt-GREAT-duo-upsell-billing--$ARM\\"}]}"
curl 'http://localhost:3200/screens/v2/subscription/preview' \\
  -X POST -H 'content-type: application/json' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: qa-duo-upsell' \\
  -H "x-bamtech-spearmint-assignments: $(printf '%s' "$PAYLOAD" | base64)" \\
  -d '<preview body>'`}
          lang="bash"
          filename="one arm of the matrix"
        />
        <p>
          <strong>Surfaces skipped:</strong> full frontend run (the fix is in
          Flex payload copy — the client renders whatever cypher keys arrive);
          staging (no real-account dependency). Note in the plan that the
          ledger family is migrating — verify the fix exists in both engines
          or state why one is exempt.
        </p>
        <p>
          <strong>Tests:</strong> service-level cases per arm using{" "}
          <code>createMockFlexContext({`{experimentation: {experiments:
          {[DuoUpsellStandaloneBilling]: {variant_id: CONTENT_FOCUSED,
          version: 1}}}}`})</code> with{" "}
          <code>const [, BRAND_FOCUSED, CONTENT_FOCUSED] =
          DuoUpsellStandaloneBillingTreatments</code>; GLO client mocked via
          factories; behavioral assertions on the card&apos;s copy key per
          arm, plus an unassigned-→-control case.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Ladder: curl local Flex (:3200) → proxied app
          (local.huluqa.com:5003) → staging edge; pick the cheapest surface
          that answers the question.
        </li>
        <li>
          Every Hulu request: <code>x-bamtech-partner: hulu</code> + the
          route&apos;s Joi-required headers; missing partner = convincing
          Disney screen.
        </li>
        <li>
          Force any experiment arm with base64 wire payloads —{" "}
          <code>{`{v1:[{e,t,n}]}`}</code> for Spearmint,{" "}
          <code>{`{experiments:{...}}`}</code> for WeaponX; WeaponX header
          wins if both sent.
        </li>
        <li>
          Traps: bare <code>npx jest</code> (use <code>HULU_ENV=ci</code>),
          bare localhost:5030 (cookie scoping), wrong-brand fixtures, mocked
          conversion wrappers.
        </li>
        <li>
          Staging edge derives region from the account, not headers; local
          Flex honors headers.
        </li>
        <li>
          QA plans = scenario matrix × forced arms × both engines (when
          migrating) + an unassigned-as-control case.
        </li>
      </ul>
    </div>
  );
}
