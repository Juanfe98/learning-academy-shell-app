import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const runModesDiagram = String.raw`flowchart LR
  subgraph M1["Mode 1 - fully mocked, also called integration mode"]
    A1["pnpm dev:commerce:integration:espn"] --> A2["NEXT_PUBLIC_API_MOCKING=enabled"]
    A2 --> A3["MSW service worker in the browser<br/>plus MSW node handlers on the server"]
    A3 --> A4["Checked-in JSON fixtures<br/>plus __screen scenario switches"]
  end
  subgraph M2["Mode 2 - real QA backends"]
    B1["pnpm dev:commerce:espn"] --> B2["check-commerce-secrets reads .env.local<br/>Vault-sourced keys required"]
    B2 --> B3["qa-espn.api.edge.bamgrid.com"]
    B3 --> B4["Deployed QA Flex BFF<br/>plus Orchestration plus Sparrow"]
  end
  subgraph M3["Mode 3 - local Flex on your laptop"]
    C1["pnpm start:traffic-director-local-edge"] --> C2["traffic-director plus edge docker containers"]
    C2 --> C3["nginx upstream rewritten to<br/>host.docker.internal port 3200"]
    C3 --> C4["growth-life-client-api running locally"]
  end
  X["dev:local-flex"] -.->|"DEAD KNOB - behaves exactly like Mode 1"| A2`;

const localFlexDiagram = String.raw`flowchart LR
  B["Browser on https local.plus.espn.com port 5004"] --> P["wcs ssl-proxy<br/>certs from apps/.certs"]
  P --> N["Next dev server on port 5040"]
  N --> LS["local-setup probed docker ps<br/>WITH_EDGE_SERVER=true"]
  LS --> RC["next.config.js publicRuntimeConfig<br/>isUsingLocalEdgeServer=true"]
  RC --> SDK["sdk-atoms sets configHostOverride to<br/>local.client-sdk-configs.bamgrid.com/bam-sdk"]
  SDK --> H["SDK resolves the Flex base URL to<br/>local.qa-espn.api.edge.bamgrid.com"]
  H --> ED["edge docker container<br/>nginx with a local TLS listener"]
  ED --> RW["setup-edge.sh rewrote the upstream<br/>growth-life-client-api-qa to host.docker.internal<br/>and port 80 to port 3200"]
  RW --> FX["Local Flex listening on port 3200"]`;

const pipelineDiagram = String.raw`flowchart TD
  PR["Open a pull request"] --> GHA["GitHub Actions - owns lint, types, unit, e2e, sonar"]
  PR --> FZB["Fuzzbucket Jenkins - owns install, build, prune, docker, deploy"]
  GHA --> A["apps workflow<br/>lint plus lint:type-check plus coverage:jest<br/>gate name check-all-apps-status"]
  GHA --> E["Commerce PR Checks - ESPN Sharded<br/>2 shards, 10 percent happy-path threshold<br/>gate name run-pr-checks-espn status-check"]
  GHA --> M["Growth PR Checks - ESPN<br/>marketing playwright, single job"]
  GHA --> S["CI workflow sonarqube<br/>gate name sonarqube-summary"]
  GHA --> K["pkgs plus pkgs commerce-base<br/>gate names check-all-packages-status<br/>and commerce-base-status-check"]
  FZB --> J["gate name Fuzzbucket CGI Web Monorepo Job"]
  A --> Q{"Mergify ci_gates"}
  E --> Q
  S --> Q
  K --> Q
  J --> Q
  M -.->|"job id is run-pr-checks - NOT in ci_gates"| Q
  Q -->|"all required checks green"| MG["Squash merge into main"]
  MG --> D1["fzb-espnplus-commerce main<br/>auto deploy to us-east-1 and us-west-2"]
  MG --> D2["fzb-espnplus-nexus main"]
  D1 --> T["trunk branch uses env-prod.yaml<br/>AUTO_DEPLOY is false"]
  T --> PRD["Production - a human presses the button"]`;

const ladderDiagram = String.raw`flowchart TD
  S["You changed something under ESPN"] --> Q1{"Which surface did you touch?"}
  Q1 -->|"apps/commerce/espn or commerce-base"| C1["1. pnpm lint:type-check:commerce:espn"]
  Q1 -->|"apps/marketing-unified/espn"| N1["1. pnpm -F @solo/marketing-unified-espn lint:type-check"]
  Q1 -->|"packages/cgi/data-interface-espn"| I1["1. pnpm lint:type-check:data-interface-espn"]
  C1 --> C2["2. Targeted jest WITH PRODUCT=espn set"]
  C2 --> Q2{"Did you edit next.config.js?"}
  Q2 -->|"yes"| C3["Update next.config.test.js<br/>it is inside collectCoverageFrom"]
  Q2 -->|"no"| C4["3. pnpm test:commerce:jest:espn<br/>enforces the 100 percent gate"]
  C3 --> C4
  C4 --> C5["4. pnpm lint:commerce:espn"]
  C5 --> Q3{"Did you touch a rendered route, layout,<br/>Flex screen or checkout step?"}
  Q3 -->|"no"| DONE["Check branch name, then push"]
  Q3 -->|"yes"| C6["5. pnpm build:commerce:espn"]
  C6 --> C7["6. pnpm test:commerce:playwright:headless:espn<br/>or one shard to mirror CI"]
  C7 --> C8["7. scraap scan apps/commerce/espn"]
  C8 --> DONE
  N1 --> N2["2. pnpm -F @solo/marketing-unified-espn coverage:jest"]
  N2 --> N3["3. pnpm -F @solo/marketing-unified-espn lint"]
  N3 --> N4["4. pnpm test:marketing-unified:playwright:espn"]
  N4 --> DONE
  I1 --> I2["2. pnpm test:data-interface-espn:coverage"]
  I2 --> I3["3. pnpm lint:data-interface-espn"]
  I3 --> DONE`;

export const toc: TocItem[] = [
  { id: "first-run-setup", title: "First-Run Setup", level: 2 },
  { id: "secrets-from-vault", title: "Secrets: What Vault Actually Gives You", level: 3 },
  { id: "running-espn-locally", title: "Running ESPN Locally", level: 2 },
  { id: "docs-that-are-wrong", title: "The Documented Hostnames Are Wrong", level: 3 },
  { id: "three-run-modes", title: "The Three Run Modes", level: 2 },
  { id: "local-flex-path", title: "Mode 3 in Detail: The Local Flex Request Path", level: 3 },
  { id: "mock-layer", title: "What the ESPN Mock Layer Covers", level: 2 },
  { id: "testing-jest", title: "Testing: Jest", level: 2 },
  { id: "product-env-defect", title: "The Defect: A Filtered Command That Lies", level: 3 },
  { id: "coverage", title: "Coverage: 100% Including the Next Config", level: 2 },
  { id: "testing-playwright", title: "Testing: Playwright", level: 2 },
  { id: "test-ownership-tagging", title: "Test-Ownership Tagging", level: 2 },
  { id: "ci-cd", title: "CI/CD: What Runs Where", level: 2 },
  { id: "deploy-path", title: "The Deploy Path", level: 3 },
  { id: "branch-name-rule", title: "The 27-Character Branch Rule", level: 2 },
  { id: "turbo-caching", title: "Turbo Caching", level: 2 },
  { id: "security-scanning", title: "Security Scanning", level: 2 },
  { id: "validation-ladder", title: "The Validation Ladder", level: 2 },
  { id: "command-reference", title: "Command Reference", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Green PR That Tested Nothing", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas &amp; Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnLocalDevTestingAndCi() {
  return (
    <div className="article-content">
      <p>
        This is the runbook module. Every other module in this academy explains how ESPN is <em>built</em>; this one gets
        it <em>running</em> on your machine and a green pull request onto <code>main</code>. It is optimised for scanning
        and copy-pasting, not for narrative — come back to it, do not read it once.
      </p>
      <p>
        Two things make ESPN harder than Disney+ or Hulu here. First, ESPN is the smallest of the three tenants, so its
        tooling has more unmaintained edges: two advertised commands are dead or broken, and the repo docs give the wrong
        local hostname in four places. Second, ESPN shares <code>packages/cgi/commerce-base</code> with the other two
        brands, which means a test only &quot;is ESPN&quot; if you explicitly say so — and one very plausible-looking
        command forgets to. Where the docs are wrong, this module says so and gives you the working alternative.
      </p>

      <h2 id="first-run-setup">First-Run Setup</h2>
      <p>
        <strong>pnpm is enforced, not preferred.</strong> The root <code>package.json</code> has{" "}
        <code>&quot;preinstall&quot;: &quot;npx only-allow pnpm&quot;</code>, and{" "}
        <code>apps/commerce/espn/package.json</code> repeats it. Running <code>npm install</code> or <code>yarn</code>{" "}
        aborts. Versions are pinned three ways so they cannot drift: <code>engines</code> requires Node{" "}
        <code>22.14.0</code> and pnpm <code>10.16.0</code>, <code>packageManager</code> pins <code>pnpm@10.16.0</code>{" "}
        with an integrity hash, and <code>volta</code> pins Node <code>22.14.0</code> for anyone using Volta.
      </p>
      <CodeBlock
        code={`# 0) Prerequisites: Homebrew, Docker Desktop, GlobalProtect VPN connected
#    (pnpm install pulls from Disney's internal Artifactory registry)
brew install mkcert && mkcert -install

# 1) Provision the machine. Default chain = certs -> hostfile -> msw -> playwright
#    (scripts/lib/configure.sh)
./scripts/setup

# 2) Install workspace deps
pnpm install

# 3) Secrets are NOT in the default chain. Run this separately.
#    Opens a browser for SSO, then writes each app's .env.local
pnpm -w run setup configure secrets

# 4) Install the git hooks that enforce the branch-name rule
pnpm git-hooks-install

# Individual steps, if you need to re-run one:
pnpm run setup configure certs
pnpm run setup configure hostfile
pnpm run setup configure msw
pnpm run setup configure playwright`}
        lang="bash"
        filename="first-run-setup.sh"
      />
      <p>
        <strong>Certificates and hosts.</strong> ESPN needs three of the domains in <code>CERTIFICATE_DOMAINS</code> (
        <code>scripts/var/settings.sh</code>): <code>local.plus.espn.com</code>, <code>localhost.espn.com</code>, and{" "}
        <code>local.qa-espn.api.edge.bamgrid.com</code>. The local-Flex path also needs{" "}
        <code>local.client-sdk-configs.bamgrid.com</code>. Certs are written to <code>apps/.certs</code>, which is
        exactly the <code>-c ../../.certs</code> both ESPN proxy scripts pass to <code>wcs ssl-proxy</code>.{" "}
        <code>configure hostfile</code> appends <code>127.0.0.1 &lt;domain&gt;</code> lines via <code>sudo</code>.
      </p>
      <p>
        Note what is <em>not</em> in that list: <code>local.espn.com</code>. If a doc tells you to open{" "}
        <code>local.espn.com</code>, there is no hosts entry and no certificate for it — you will get a DNS or TLS
        failure, not a helpful error. The cert-freshness check in <code>scripts/lib/configure/certificates.sh</code> is
        also a broken pipe that greps for the Disney domain and pipes into a grep for the ESPN domain, so a stale ESPN
        cert can go undetected. If HTTPS suddenly breaks locally, re-run <code>pnpm run setup configure certs</code>{" "}
        before debugging anything else.
      </p>

      <h3 id="secrets-from-vault">Secrets: What Vault Actually Gives You</h3>
      <p>
        Secrets used to live in committed <code>.env</code> files; they now come from Vault and land in a gitignored{" "}
        <code>.env.local</code> per app. <code>scripts/lib/configure/secrets.sh</code> maps each ESPN app to a Vault
        service inside namespace <code>60c7e031310ce5f580d4db16</code>, environment <code>staging</code>, and fetches
        with the DevX <code>locksmith</code> CLI over browser SSO.
      </p>
      <CodeBlock
        code={`# apps/commerce/espn/.env.local  — Vault service: espnplus-commerce
DAPI_SENSITIVE_SECRETS_API_KEY=
REMOTE_CONFIG_S3_ACCESS_KEY=

# apps/marketing-unified/espn/.env.local — Vault service: espnplus-nexus
DAPI_SENSITIVE_SECRETS_API_KEY=
REMOTE_CONFIG_S3_ACCESS_KEY=
SPARROW_S3_ACCESS_KEY=`}
        lang="ini"
        filename=".env.local"
      />
      <p>
        ESPN commerce guards itself: <code>dev</code> begins with <code>pnpm -w check-commerce-secrets</code>, and{" "}
        <code>scripts/lib/check-commerce-secrets.sh</code> requires both <code>REMOTE_CONFIG_S3_ACCESS_KEY</code> and{" "}
        <code>DAPI_SENSITIVE_SECRETS_API_KEY</code> to be present in <code>.env.local</code>. If either is missing it
        prints the missing keys and interactively offers to fetch them from Vault. ESPN marketing has no such guard —
        instead <code>getConfigs</code> hard-fails when any of <code>SPARROW_CONFIG_NAME</code>, <code>AWS_REGION</code>,{" "}
        <code>SPARROW_CONFIG_URL</code>, <code>SPARROW_WORKSPACE</code>, <code>SPARROW_CONFIG_VERSION</code>,{" "}
        <code>SPARROW_S3_ACCESS_KEY</code> or <code>SPARROW_SCOPE_NAME</code> is absent, and the page renders as a 500.{" "}
        <strong>A blank ESPN marketing page locally is almost always a missing Sparrow env var</strong>, not a code bug.
        Marketing also wants <code>.env.example</code> copied to <code>.env.development.local</code> for the non-secret
        values.
      </p>

      <h2 id="running-espn-locally">Running ESPN Locally</h2>
      <p>
        Both ESPN apps run Next on a plain HTTP port and put a <code>wcs ssl-proxy</code> in front of it, because the
        BamTech SDK, OneTrust and cookie domains all need a real <code>*.espn.com</code> host over TLS.{" "}
        <strong>You browse the proxy port, never the Next port.</strong> The proxy uses <code>wait-on</code> against the
        Next server&apos;s <code>/healthcheck</code> before it starts, so the first ten seconds of the log look like
        nothing is happening.
      </p>
      <CodeBlock
        code={`# ---------- ESPN commerce (checkout, account, billing) ----------
pnpm dev:commerce:espn
#   -> turbo dev --filter=@solo/commerce-espn
#   -> check-commerce-secrets, then prebuild (dictionary SSR key extraction),
#      then concurrently( dev:proxy , PORT=5040 next dev )
#   -> Next on 5040, ssl-proxy on 5004
#   OPEN: https://local.plus.espn.com:5004/commerce/billing-history

# ---------- ESPN marketing / NEXUS (landing + offer pages) ----------
pnpm dev:marketing-unified:espn
#   -> turbo dev --filter=@solo/marketing-unified-espn
#   -> turbo dev:server proxy  =>  next dev -p 4040  +  ssl-proxy -p 5040
#   OPEN: https://local.plus.espn.com:5040

# ---------- Optional: local Datadog agent so dd-trace has a sink ----------
pnpm -F @solo/commerce-espn datadog-agent:start
pnpm -F @solo/commerce-espn datadog-agent:stop`}
        lang="bash"
        filename="run-espn-locally.sh"
      />
      <ArticleTable
        caption="The complete ESPN port map. Note the collision on 5040 — you cannot run both ESPN apps at once without changing a port."
        minWidth={880}
      >
        <table>
          <thead>
            <tr><th>Surface</th><th>Next port</th><th>Proxy port</th><th>URL you actually open</th><th>Source</th></tr>
          </thead>
          <tbody>
            <tr><td>ESPN commerce dev</td><td><code>5040</code></td><td><code>5004</code></td><td><code>https://local.plus.espn.com:5004</code></td><td><code>apps/commerce/espn/package.json</code> <code>dev:proxy</code>, <code>dev:start</code></td></tr>
            <tr><td>ESPN marketing dev</td><td><code>4040</code></td><td><code>5040</code></td><td><code>https://local.plus.espn.com:5040</code></td><td><code>apps/marketing-unified/espn/package.json</code> <code>dev:server</code>, <code>proxy</code></td></tr>
            <tr><td>ESPN commerce Playwright</td><td><code>5040</code></td><td>none — HTTPS disabled</td><td><code>http://localhost:5040</code></td><td><code>apps/commerce/espn/playwright.config.ts</code></td></tr>
            <tr><td>ESPN marketing Playwright</td><td><code>3000</code></td><td>none</td><td><code>http://localhost:3000</code></td><td><code>apps/marketing-unified/espn/playwright.config.ts</code></td></tr>
            <tr><td>Local Flex BFF</td><td><code>3200</code></td><td>via edge docker</td><td><code>host.docker.internal:3200</code></td><td><code>packages/traffic-director-dev/setup-edge.sh</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Playwright deliberately does not use the proxy. Both ESPN configs set <code>ignoreHTTPSErrors: true</code> and
        the HTTPS <code>baseURL</code> is commented out with{" "}
        <code>TODO - WEB-30985 - Re-Enable HTTPS when SSL resolution in CI is resolved</code>. The consequence is real:
        an HTTPS-only bug — a <code>Secure</code> cookie, a mixed-content block — will not reproduce in CI.
      </p>

      <h3 id="docs-that-are-wrong">The Documented Hostnames Are Wrong</h3>
      <p>
        A runbook&apos;s job is to be right where the docs are wrong. Four checked-in docs give hostnames and ports that
        do not match the scripts they describe. Trust <code>package.json</code>, not prose.
      </p>
      <CodeBlock
        code={`apps/commerce/AGENTS.md:86
  WRONG   pnpm dev:commerce:espn       # https://local.espn.com (port varies)
  RIGHT   pnpm dev:commerce:espn       -> https://local.plus.espn.com:5004

apps/marketing-unified/espn/README.md:22-25
  WRONG   # Starts at https://local.espn.com:5030
          # Next.js on port 4030, SSL proxy on port 5030
  RIGHT   Next.js on port 4040, SSL proxy on port 5040
          -> https://local.plus.espn.com:5040

apps/marketing-unified/README.md:13 and :114
  WRONG   espn/ -- @solo/marketing-unified-espn (port 4030, SSL 5030)
  WRONG   pnpm dev:marketing-unified:espn      # https://local.espn.com:5030
  RIGHT   4040 / 5040 on local.plus.espn.com

apps/marketing-unified/espn/README.md:136
  WRONG   "Different domain -- local.espn.com for local development"
  RIGHT   local.plus.espn.com  (the "plus" matters: this is ESPN+)

The same file gets it right at :29 -- "pnpm dev starts the server at
https://local.plus.espn.com:5040" -- so the file contradicts itself.`}
        lang="text"
        filename="doc-corrections.txt"
      />
      <p>
        The tell that settles it: <code>local.espn.com</code> does not appear in <code>CERTIFICATE_DOMAINS</code>, so it
        has never had a certificate or a hosts entry in this repo. The stale ports are ESPN&apos;s pre-migration values.
      </p>

      <h2 id="three-run-modes">The Three Run Modes</h2>
      <p>
        Pick a mode by asking what you are changing. UI and rendering work wants Mode 1 — deterministic, no VPN
        dependency, no auth dance. Anything that depends on real offer, subscription or entitlement data wants Mode 2.
        Only work that spans cgi-web <em>and</em> the Flex BFF needs Mode 3.
      </p>
      <MermaidDiagram
        chart={runModesDiagram}
        title="The Three Local Run Modes and What Each Talks To"
        caption="Notice the dashed edge: dev:local-flex looks like a third mode but collapses into Mode 1, because nothing in the repo reads the variable it sets."
        minHeight={550}
      />
      <p>
        <strong>Mode 1 — fully mocked.</strong> <code>pnpm dev:commerce:integration:espn</code> sets{" "}
        <code>NEXT_PUBLIC_API_MOCKING=enabled</code>. The predicates live in{" "}
        <code>packages/cgi/commerce-utils/src/environment.ts</code>; the legal values are <code>enabled</code>{" "}
        (integration dev), <code>playwright</code> (E2E) and <code>cypress</code> (legacy). The committed default in{" "}
        <code>apps/commerce/espn/.env</code> is <code>disabled</code>. Mocked calls need no Vault secrets.
      </p>
      <p>
        <strong>Mode 2 — real QA backends.</strong> Plain <code>pnpm dev:commerce:espn</code>. The SDK resolves Flex and
        Orchestration through the Edge gateway at <code>qa-espn.api.edge.bamgrid.com</code>. You need VPN plus a
        populated <code>.env.local</code>.
      </p>
      <p>
        <strong>The dead knob.</strong> <code>pnpm -F @solo/commerce-espn dev:local-flex</code> sets{" "}
        <code>NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled</code>. The variable is still
        declared as a build input in <code>apps/commerce/espn/turbo.json</code>, but{" "}
        <strong>nothing in the repository reads it</strong> — the consumer (
        <code>generate-sdk-config-with-local-flex.ts</code> and friends) was deleted in June 2025 in commit{" "}
        <code>7a74df8904</code>. Today <code>dev:local-flex</code> is byte-for-byte equivalent to{" "}
        <code>dev:integration</code>: pure MSW, no Flex redirection. A sibling dead knob is{" "}
        <code>LOCAL_EDGE_SERVER=disabled</code> in <code>apps/commerce/espn/.env</code>, also unread.
      </p>
      <p>
        <strong>The command that actually works</strong> is the root-level traffic-director script. Detection is by
        Docker inspection, not by env var: the app&apos;s <code>local-setup</code> script runs{" "}
        <code>docker ps -f name=traffic-director</code> and <code>docker ps -f name=edge</code> and sets{" "}
        <code>WITH_TRAFFIC_DIRECTOR</code> / <code>WITH_EDGE_SERVER</code> from whether those containers are running.
        That means the containers must be up <em>before</em> you start <code>next dev</code>.
      </p>
      <CodeBlock
        code={`# 1) Start Flex (growth-life-client-api) locally on port 3200, in its own repo.

# 2) Bring up traffic-director + edge, and rewrite edge's nginx upstream.
#    init      -> traffic-director-dev with the mkcert cert/key from apps/.certs
#    init:edge -> docker compose up the edge image, then ./setup-edge.sh
pnpm start:traffic-director-local-edge

# 3) NOW start ESPN commerce. local-setup probes docker and flips the flags.
pnpm dev:commerce:espn

# Tear down when finished
pnpm stop:traffic-director-local-edge`}
        lang="bash"
        filename="local-flex.sh"
      />

      <h3 id="local-flex-path">Mode 3 in Detail: The Local Flex Request Path</h3>
      <p>
        Nothing about this path is configured by an ESPN env var. It is a chain of six indirections, and knowing the
        chain is the difference between fixing it in a minute and losing an afternoon.
      </p>
      <MermaidDiagram
        chart={localFlexDiagram}
        title="Local Request Path When Running Against a Local Flex"
        caption="The pivot is setup-edge.sh: it sed-rewrites the edge container's nginx confs so the QA Flex upstream becomes host.docker.internal:3200."
        minHeight={550}
      />
      <p>
        What <code>packages/traffic-director-dev/setup-edge.sh</code> does, in order, across all four regions&apos; nginx
        configs inside the running container: rewrite <code>qa-espn.api.edge.bamgrid.com</code> to{" "}
        <code>local.qa-espn.api.edge.bamgrid.com</code>; rewrite the upstream{" "}
        <code>growth-life-client-api-qa.us-east-1.bamgrid.net</code> to <code>host.docker.internal</code>; rewrite that
        upstream&apos;s port from <code>80</code> to <code>3200</code>; inject a local TLS listener; then{" "}
        <code>docker restart edge</code>. The port <code>3200</code> is not arbitrary — it is Flex&apos;s own default{" "}
        <code>serverPort</code>.
      </p>
      <p>
        Debug order when cgi-web is not hitting your local Flex: is the <code>edge</code> container actually{" "}
        <em>running</em> (not just created)? Did <code>setup-edge.sh</code> complete? Is Flex listening on{" "}
        <code>3200</code>? Did you start <code>next dev</code> before the containers? Almost every failure is one of
        those four, and none of them is a code change.
      </p>

      <h2 id="mock-layer">What the ESPN Mock Layer Covers</h2>
      <p>
        MSW worker scripts are checked in at <code>apps/commerce/espn/public/mockServiceWorker.js</code> and{" "}
        <code>apps/marketing-unified/espn/public/mockServiceWorker.js</code>, declared via each app&apos;s{" "}
        <code>msw.workerDirectory</code> field. <code>pnpm run setup configure msw</code> regenerates them.
      </p>
      <p>
        <strong>Covered on ESPN commerce:</strong> Flex screen and execution endpoints, Orchestration GraphQL, the
        identity <code>me</code> endpoint, billing history, account details, payments, cancel and change-subscription
        flows — the handler bundles are composed in{" "}
        <code>apps/commerce/espn/src/test/components/espn-browser-mocks.tsx</code> and{" "}
        <code>apps/commerce/espn/browser-mocks/browser-handlers.ts</code>, with ESPN fixtures under{" "}
        <code>packages/cgi/commerce-base/src/**/__fixtures__/espn</code>. There are runtime control routes too:{" "}
        <code>pages/api/msw/{"{"}start,stop,reset,use{"}"}.api.ts</code>.
      </p>
      <p>
        <strong>Not covered, and this is where people lose time:</strong>
      </p>
      <ul>
        <li>
          <strong>
            ESPN marketing MSW only activates on <code>playwright</code>, never <code>enabled</code>
          </strong>
          . The gate in <code>apps/marketing-unified/espn/src/pages/_app.page.tsx</code> is a literal equality check
          against <code>&apos;playwright&apos;</code>, and marketing ESPN defines <em>no</em>{" "}
          <code>dev:integration</code> script. There is no mocked marketing dev mode.
        </li>
        <li>
          <strong>Only two marketing pages have snapshot fixtures</strong> — home and soccer. Working on{" "}
          <code>/mlbtv</code> or <code>/nflbundle</code> means adding a fixture or hitting the real CMS.
        </li>
        <li>
          <strong>ESPN commerce loads every tenant&apos;s handlers</strong>:{" "}
          <code>[...espnBrowserHandlers, ...browserHandlers]</code>, marked <code>TODO WEB-31113</code>. Cross-tenant
          handler collisions are possible, and a Disney+-shaped response can quietly satisfy an ESPN query.
        </li>
      </ul>
      <p>
        That last risk has exactly one tripwire, and it is worth knowing by name:{" "}
        <code>
          packages/cgi/commerce-base/src/test/components/browser-mocks/espn-orchestration-error-handler.tsx
        </code>{" "}
        is a hand-maintained regex denylist that returns a 500 when a Disney+-only Orchestration query renders on ESPN.
        It currently contains <strong>two</strong> query names. Anything not listed will happily 200 in a mocked run and
        fail in production.
      </p>
      <p>
        <strong>
          The <code>__screen</code> trick.
        </strong>{" "}
        Server-driven screens have more than one interesting shape, and the mock layer selects between them with a query
        parameter read from <code>useCommerceQueryParams()</code> and forwarded to Flex. Handlers switch on it directly:
      </p>
      <CodeBlock
        code={`// apps/commerce/espn/src/queries/browser_mocks/handlers.ts
export const espnAdobeSubscriberCohortsHandler = http.put(
  \`\${flexBaseURL}/execution/v1/subscription/subscriber-cohorts\`,
  ({ request }) => {
    switch (new URL(request.url).searchParams.get('__screen')) {
      case 'empty':                return HttpResponse.json(mockAdobeSubscriberCohortsEmpty);
      case 'mvpd-wholesaler':      return HttpResponse.json(mockAdobeSubscriberCohortsMVPDWholesaler);
      case 'multiple-wholesalers': return HttpResponse.json(mockAdobeSubscriberCohortsMultipleWholesalers);
      default:                     return HttpResponse.json(mockAdobeSubscriberCohorts);
    }
  }
);`}
        lang="typescript"
        filename="handlers.ts"
      />
      <CodeBlock
        code={`# Exercise a specific server-driven screen variant, no code change needed:
https://local.plus.espn.com:5004/commerce/account?__screen=mvpd-wholesaler
https://local.plus.espn.com:5004/commerce/account?__screen=empty

# The available values are also surfaced in the Toodles debug panel, backed by
# packages/cgi/commerce-base/src/__browser-mocks__/__screens/__screens-store.ts`}
        lang="text"
        filename="screen-param.txt"
      />

      <h2 id="testing-jest">Testing: Jest</h2>
      <p>
        There is no root jest config and no <code>projects</code> key. Every app and package owns a standalone config.
        The four that matter for ESPN: <code>apps/commerce/espn/jest.config.js</code>,{" "}
        <code>apps/marketing-unified/espn/jest.config.js</code>,{" "}
        <code>packages/cgi/data-interface-espn/jest.config.js</code>, and{" "}
        <code>packages/cgi/commerce-base/jest.config.js</code> (which ESPN depends on but does not own).
      </p>
      <CodeBlock
        code={`# ESPN commerce — the command that works
pnpm test:commerce:jest:espn
#   -> turbo coverage:jest --filter=@solo/commerce-espn
#   -> PRODUCT=espn jest --coverage

# ESPN marketing
pnpm -F @solo/marketing-unified-espn coverage:jest   # what CI runs: jest --coverage
pnpm -F @solo/marketing-unified-espn test:watch

# ESPN data interface
pnpm test:data-interface-espn:coverage

# Open the HTML coverage report for ESPN commerce
pnpm test:commerce:jest:report:espn`}
        lang="bash"
        filename="jest-commands.sh"
      />
      <p>
        <strong>How a test declares its brand.</strong> There is no <code>PRODUCT</code> enum — the product is the
        string-literal union{" "}
        <code>ProductName = &apos;disneyPlus&apos; | &apos;espn&apos; | &apos;hulu&apos;</code>. A test becomes ESPN by
        rendering inside an explicit provider wrapper built from an ESPN Sparrow config fixture.{" "}
        <strong>The trap is that the default wrapper is Disney+</strong>: <code>renderWithProviders</code> falls back to{" "}
        <code>getMergedConfigFixtureForProduct(&apos;disneyPlus&apos;)</code> when no <code>sparrowConfig</code> is
        passed, which is why no ESPN commerce test calls it. ESPN uses raw <code>render</code> plus an explicit wrapper:
      </p>
      <CodeBlock
        code={`import {
  generateProviderWrapper,
  getSparrowConfigFixture,
} from '@solo/commerce-base/src/test/testing-library';
import { render, screen } from '@testing-library/react';

// apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.test.tsx
render(<ExampleComponent />, {
  wrapper: generateProviderWrapper({
    sparrowConfig: getSparrowConfigFixture('espn'),
    isSDKEnabled: true,
  }),
});

// Need a flag flipped? Use the immer-style second argument.
// Never reach for immer directly in test code.
const config = getSparrowConfigFixture('espn', (draft) => {
  draft['feature-flags'].general.enableGiftCard = true;
});`}
        lang="tsx"
        filename="use-flex-subscriber-cohorts.test.tsx"
      />
      <p>
        That wrapper controls the <em>config</em> the component sees. A second, process-wide mechanism controls which{" "}
        <em>fixtures</em> the mock layer serves, and it reads an environment variable:
      </p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/lib/get-product-name-for-mocks.ts
export const getProductNameForMocks = () => {
  return (process.env.PRODUCT ||
    getConfig()?.publicRuntimeConfig?.productNameForMocks ||
    'disneyPlus') as ProductName;
};`}
        lang="typescript"
        filename="get-product-name-for-mocks.ts"
      />
      <p>
        Three tiers, and the last one is a silent default. If <code>process.env.PRODUCT</code> is unset and there is no
        Next runtime config (which is the case in a bare jest process), every fixture lookup resolves to{" "}
        <strong>Disney+</strong>.
      </p>

      <h3 id="product-env-defect">The Defect: A Filtered Command That Lies</h3>
      <p>
        This is the single most valuable artifact in the module. ESPN commerce defines <code>test:jest</code> as a bare{" "}
        <code>jest</code> and <code>test:watch</code> as a bare <code>jest --watch</code>. <code>PRODUCT=espn</code>{" "}
        appears only on <code>coverage:jest</code> and on the two Playwright scripts. So the most natural-looking way to
        run ESPN unit tests — filter the workspace to the ESPN package — runs them against Disney+ fixtures, passes, and
        tells you nothing.
      </p>
      <CodeBlock
        code={`{
  "coverage:jest":  "echo \\"check unit coverage...\\" && PRODUCT=espn jest --coverage",
  "test:jest":      "jest",
  "test:watch":     "jest --watch",
  "test:playwright":          "pnpm clean:coverage:playwright && PRODUCT=espn playwright test --ui",
  "test:playwright:headless": "pnpm clean:coverage:playwright && PRODUCT=espn playwright test"
}`}
        lang="json"
        filename="package.json"
      />
      <CodeBlock
        code={`# ---------------------------- WRONG ----------------------------
# Looks perfectly reasonable. Filters to the ESPN package. Green.
# But PRODUCT is unset, so getProductNameForMocks() returns 'disneyPlus'
# and every fixture lookup serves Disney+ data. Silent, no warning.
pnpm -F @solo/commerce-espn test:jest
pnpm -F @solo/commerce-espn test:watch

# ---------------------------- RIGHT ----------------------------
# Option A - the root script. PRODUCT=espn is baked into coverage:jest.
pnpm test:commerce:jest:espn

# Option B - keep the filtered form, but set PRODUCT yourself.
PRODUCT=espn pnpm -F @solo/commerce-espn test:jest
PRODUCT=espn pnpm -F @solo/commerce-espn test:watch

# Option C - one file, fast loop. Args after -- reach jest.
PRODUCT=espn pnpm -F @solo/commerce-espn test:jest -- \\
  src/queries/use-flex-subscriber-cohorts.test.tsx`}
        lang="bash"
        filename="jest-wrong-vs-right.sh"
      />
      <p>
        Two things make this dangerous rather than merely annoying. First, it fails <em>open</em>: Disney+ fixtures are
        structurally similar enough that most assertions still pass. Second, CI does not reproduce it — CI runs{" "}
        <code>coverage:jest</code>, which does set <code>PRODUCT=espn</code>. So the local run is the one that lies, and
        it lies in the direction of a false green. If you take one habit from this module, make it:{" "}
        <strong>
          never invoke ESPN jest without <code>PRODUCT=espn</code> somewhere on the line.
        </strong>
      </p>

      <h2 id="coverage">Coverage: 100% Including the Next Config</h2>
      <p>
        All four ESPN-relevant jest configs enforce <code>coverageThreshold.global</code> of 100 on branches, functions,
        lines and statements. The policy is stated in <code>docs/testing/jest/README.md</code>: 100% coverage on{" "}
        <code>src</code> directories, with <code>istanbul ignore</code> as an escape hatch you must clear with the owning
        engineer first.
      </p>
      <p>
        The surprising part is what &quot;<code>src</code>&quot; includes. <code>collectCoverageFrom</code> in{" "}
        <code>apps/commerce/espn/jest.config.js</code> is <code>src/**</code> plus{" "}
        <code>pages/api/footer-preview.api.ts</code> plus{" "}
        <strong>
          <code>next.config.js</code>
        </strong>
        . That is why <code>apps/commerce/espn/next.config.test.js</code> exists at all — a unit test for a build config
        file.
      </p>
      <p>
        <strong>What that means for you:</strong> add a branch to <code>next.config.js</code> — a new env-var check, a
        new rewrite, a conditional <code>assetPrefix</code> — and you must add a case to <code>next.config.test.js</code>{" "}
        in the same commit, or <code>check-all-apps-status</code> goes red on a file most engineers never think of as
        testable. ESPN marketing has the same arrangement, with a 12.7 KB <code>next.config.test.js</code>.
      </p>
      <p>
        There is also a ratchet on the escape hatch: <code>pnpm check-istanbul-ignore-counts</code> (backed by{" "}
        <code>scripts/utils/check-istanbul-ignore-counts.js</code>) tracks the number of <code>istanbul ignore</code>{" "}
        comments per package, and both <code>apps/commerce/espn</code> and{" "}
        <code>packages/cgi/data-interface-espn</code> are enrolled. Adding one without updating the expected count fails.
      </p>

      <h2 id="testing-playwright">Testing: Playwright</h2>
      <p>
        ESPN commerce has <strong>19 spec files</strong> under <code>apps/commerce/espn/playwright/tests/</code>, grouped
        as <code>account/</code>, <code>common/</code>, <code>flows/</code>, <code>payments/</code>,{" "}
        <code>signup/</code>. ESPN marketing has <strong>four</strong>, all under <code>playwright/tests/pages/</code> (
        <code>mlp</code>, <code>mlp-sp</code>, <code>olp</code>, <code>olp-sp</code> — the <code>-sp</code> pair runs the
        Spaceball-enabled variant).
      </p>
      <CodeBlock
        code={`# ESPN commerce — headed UI mode (note: test:playwright is the --ui one here)
pnpm test:commerce:playwright:espn

# ESPN commerce — headless, what you want before pushing
pnpm test:commerce:playwright:headless:espn

# First time only
pnpm -F @solo/commerce-espn test:playwright:install

# Reproduce exactly what one CI shard does
cd apps/commerce/espn && pnpm exec playwright test --shard=1/2

# The gate metric CI computes from the happy-path catalogue
pnpm -F @solo/commerce-espn coverage:playwright:happy-paths

# ESPN marketing — headless
pnpm test:marketing-unified:playwright:espn
# ESPN marketing — headed
pnpm -F @solo/marketing-unified-espn test:playwright:ui

# BROKEN: this root script resolves to a turbo task the marketing ESPN app
# does not define (it has test:playwright and test:playwright:ui, no
# test:playwright:headless), so it silently does nothing.
#   pnpm test:marketing-unified:playwright:headless:espn`}
        lang="bash"
        filename="playwright-commands.sh"
      />
      <p>
        Watch the naming inversion between the two surfaces, because it burns people: on <strong>commerce</strong>,{" "}
        <code>test:playwright</code> is the headed <code>--ui</code> run and <code>test:playwright:headless</code> is
        headless. On <strong>marketing</strong>, <code>test:playwright</code> is headless and{" "}
        <code>test:playwright:ui</code> is headed. The same script name means opposite things in the two apps.
      </p>
      <p>
        <strong>The happy-paths catalogue is the team-owned description of every ESPN flow.</strong>{" "}
        <code>apps/commerce/espn/playwright/support/happy-paths.ts</code> holds <strong>66</strong> entries, each an{" "}
        <code>{"{ id, description, team }"}</code> record where <code>team</code> is one of the commerce owner values.
        Specs reference an entry through a Playwright annotation, and <code>coverage:playwright:happy-paths</code>{" "}
        cross-references the catalogue against the spec tree to produce the percentage CI gates on. Read this file first
        when you need to know what ESPN checkout is supposed to do — it is prose written by the owning teams, not code.
      </p>
      <CodeBlock
        code={`// apps/commerce/espn/playwright/support/happy-paths.ts
export const HAPPY_PATHS = {
  coreBillingHistory1: {
    id: 'coreBillingHistory1',
    description:
      'Users should be able to view their billing history through navigation from the Account page.',
    team: Owners.CORE,
  },
  // ... 65 more
};

// apps/commerce/espn/playwright/tests/account/billing-history.spec.ts
test.describe(
  '@mma @espn The Billing History Flow',
  {
    annotation: [
      { type: 'flow', description: HAPPY_PATHS.coreBillingHistory1.id },
    ],
  },
  () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthorization({ page });
      await setupOneTrustConsentGranted({ page });
    });
  }
);`}
        lang="typescript"
        filename="happy-paths.ts"
      />
      <p>
        <strong>How identity is faked.</strong> There is no login flow in a commerce E2E test.{" "}
        <code>apps/commerce/espn/playwright/support/utils/local-storage.ts</code> exports{" "}
        <code>setupAuthorization({"{ page }"})</code>, which uses <code>page.addInitScript</code> to write two long-lived
        BamTech SDK fixtures into <code>localStorage</code> before any page script runs:{" "}
        <code>__bam_sdk_device_grant--espn-a9b93989_qa</code> and <code>__bam_sdk_access--espn-a9b93989_qa</code>. The
        key prefix <code>espn-a9b93989</code> is ESPN&apos;s SDK client id, so these keys are brand-namespaced and will
        not satisfy a Disney+ test. A logged-out test simply does not call the helper. Hulu takes a different route
        entirely (<code>setupAuthCookies</code>), so do not copy Hulu specs wholesale.
      </p>
      <p>
        <strong>Sharding and the flake budget.</strong> The ESPN PR check runs <code>shard_count: 2</code> with{" "}
        <code>coverage_threshold: 10</code> — the lowest of the three tenants (Hulu 18, Disney+ 35). Inside the config,
        CI sets <code>retries: 2</code>, <code>maxFailures: 5</code> and <code>workers: 1</code>.{" "}
        <strong>
          Do not raise <code>workers</code>
        </strong>
        : each runner boots one <code>next start</code> holding a single MSW singleton, which is precisely why the team
        shards across runners instead of parallelising within one. The <code>blob</code> reporter is what makes shards
        mergeable — ESPN commerce has it, ESPN marketing does not, which is why marketing can never be sharded. CI also
        calls Playwright directly rather than through Turbo, because a cache hit would replay logs without regenerating
        the blob and break the merge step. A separate <code>Flake Check</code> workflow re-runs the same sharded workflow
        hourly on weekdays with <code>coverage_threshold: 0</code> purely to keep flake metrics fresh.
      </p>

      <h2 id="test-ownership-tagging">Test-Ownership Tagging</h2>
      <p>
        Test titles carry <code>@tags</code> that <code>@solo/test-utils</code> parses into Datadog CI Visibility
        dimensions. The mapping is small and worth memorising: <code>owner</code> becomes <code>test.owner</code>,{" "}
        <code>product</code> becomes <code>test.product</code>, <code>env</code> becomes <code>test.env</code>.{" "}
        <code>@espn</code> resolves to <code>test.product=espn</code>; <code>@mma</code>, <code>@tap</code>,{" "}
        <code>@art</code>, <code>@identity</code>, <code>@profiles</code>, <code>@xd</code>, <code>@growth</code> and
        friends resolve to owners. Tags flow through two independent routes: a <code>dd-trace</code> span tag, and a
        JUnit XML property named <code>dd_tags[...]</code>. Lowest scope wins, so a test-level tag beats its parent
        describe.
      </p>
      <p>
        <strong>The concrete, fixable gap:</strong> ESPN <em>Playwright</em> specs are tagged well —{" "}
        <code>&apos;@mma @espn The Billing History Flow&apos;</code> is typical. But{" "}
        <strong>
          zero ESPN jest files carry <code>@espn</code>
        </strong>
        . Every ESPN unit-test result therefore lands in Datadog with no <code>test.product=espn</code>, which means ESPN
        unit results are simply not sliceable by product in CI visibility. And unlike ESPN marketing — whose jest config
        opts into the CODEOWNERS owner fallback via{" "}
        <code>globals.datadogTagReporterConfig.codeownersFallback: true</code> — ESPN commerce does not, so its unit
        tests carry no <code>test.owner</code> either. There is no signal at all.
      </p>
      <p>
        <strong>The convention to follow going forward:</strong> put one product tag and one team tag in the{" "}
        <em>top-level</em> <code>describe</code> title of every new ESPN jest file. Tag the outer block, not each test,
        so the tag is inherited and stays in one place.
      </p>
      <CodeBlock
        code={`// Today — no product, no owner, invisible in CI Visibility
describe('useFlexAdobeAnalyticsSubscriberCohorts', () => {
  it('calls setESPNCommonData on success', async () => { /* ... */ });
});

// The convention to adopt — tag the outer describe once
describe('@espn @mma useFlexAdobeAnalyticsSubscriberCohorts', () => {
  it('calls setESPNCommonData on success', async () => { /* ... */ });
});

// Watch the syntax. This is a real bug in the repo, at
// apps/commerce/espn/playwright/tests/signup/billing.spec.ts:25 --
// 'espn' has no @, so the product matcher never fires:
test.skip('@tap espn should render the page without an error banner', ...);`}
        lang="typescript"
        filename="tagging-convention.test.ts"
      />

      <h2 id="ci-cd">CI/CD: What Runs Where</h2>
      <p>
        The division of labour is clean and worth stating up front:{" "}
        <strong>
          GitHub Actions owns lint, type-check, unit tests, Playwright and SonarQube. Jenkins/Fuzzbucket owns install,
          build, prune, dockerize and deploy.
        </strong>{" "}
        Jenkins does not run tests at all — in <code>ci/espnplus/commerce</code>, <code>CMD_LINT</code>,{" "}
        <code>CMD_TEST</code>, <code>CMD_TEST_INTEGRATION</code> and <code>CMD_SONAR</code> are all literally{" "}
        <code>echo</code> statements saying the work happens in GHA.
      </p>
      <MermaidDiagram
        chart={pipelineDiagram}
        title="ESPN Pull Request to Production, and Which Stage Gates What"
        caption="Only the solid arrows into Mergify are required checks. Growth PR Checks - ESPN runs on every PR but cannot block a merge."
        minHeight={550}
      />
      <ArticleTable
        caption="Every ESPN-relevant CI check, where it runs, and whether it can block your merge. The gating column is the authoritative ci_gates list in .github/mergify.yml."
        minWidth={940}
      >
        <table>
          <thead>
            <tr><th>Check</th><th>Workflow / pipeline file</th><th>Where it runs</th><th>Gating?</th></tr>
          </thead>
          <tbody>
            <tr><td><code>run-pr-checks-espn / status-check</code></td><td><code>.github/workflows/commerce-pr-checks-espn-sharded.yml</code></td><td>GitHub Actions</td><td><strong>Yes</strong> — ESPN commerce Playwright is a hard merge gate</td></tr>
            <tr><td><code>check-all-apps-status</code></td><td><code>.github/workflows/apps-lint-and-test.yml</code></td><td>GitHub Actions</td><td><strong>Yes</strong> — ESPN commerce and ESPN nexus lint, types, jest coverage</td></tr>
            <tr><td><code>sonarqube-summary</code></td><td><code>.github/workflows/ci.yml</code> + <code>sonarqube-summary.yml</code></td><td>GitHub Actions</td><td><strong>Yes</strong> — projects <code>cgi-client:commerce-espn</code>, <code>cgi-client:nexus-espn</code></td></tr>
            <tr><td><code>check-all-packages-status</code></td><td><code>.github/workflows/packages-lint-and-test.yml</code></td><td>GitHub Actions</td><td><strong>Yes</strong> — includes <code>data-interface-espn</code></td></tr>
            <tr><td><code>commerce-base-status-check</code></td><td><code>.github/workflows/commerce-base-lint-and-test.yml</code></td><td>GitHub Actions</td><td><strong>Yes</strong> — ESPN inherits nearly all its UI from here</td></tr>
            <tr><td><code>Fuzzbucket CGI Web Monorepo Job</code></td><td><code>ci/monorepough</code></td><td>Jenkins / Fuzzbucket</td><td><strong>Yes</strong> — build and deploy only, no tests</td></tr>
            <tr><td><code>Growth PR Checks - ESPN</code></td><td><code>.github/workflows/growth-pr-checks-espn.yml</code></td><td>GitHub Actions</td><td>No — its job id is <code>run-pr-checks</code>, absent from <code>ci_gates</code></td></tr>
            <tr><td><code>Flake Check</code></td><td><code>.github/workflows/flake-check.yml</code></td><td>GitHub Actions, hourly cron</td><td>No — metrics only, <code>coverage_threshold: 0</code></td></tr>
            <tr><td>Bundle analysis, code coverage, stress tests</td><td><code>commerce-bundle-analysis.yml</code>, <code>commerce-code-coverage.yml</code>, <code>*-stress-test.yml</code></td><td>GitHub Actions, label-triggered</td><td>No — opt-in via PR label</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The ESPN commerce PR check is a nineteen-line wrapper around a shared engine, which is the cleanest place to read
        the ESPN-specific numbers:
      </p>
      <CodeBlock
        code={`name: 'Commerce PR Checks - ESPN (Sharded)'

on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: \${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  run-pr-checks-espn:
    uses: ./.github/workflows/commerce-playwright-tests-sharded.yml
    with:
      tenant: espn
      folder: espn
      shard_count: 2
      coverage_threshold: 10
    secrets: inherit`}
        lang="yaml"
        filename="commerce-pr-checks-espn-sharded.yml"
      />
      <p>
        Two structural facts about PR latency. Only three workflows in the repo use <code>on.pull_request.paths</code>,
        so <strong>every ESPN check runs on every PR regardless of what you touched</strong> — a docs-only change still
        pays for two Playwright shards. And the reusable engine sets no <code>timeout-minutes</code> on any job, so a
        hung shard falls back to the 360-minute org default.
      </p>
      <p>
        <strong>The metrics workflow silently emits nothing for ESPN commerce.</strong>{" "}
        <code>.github/workflows/metrics.yml</code> triggers on <code>workflow_run</code> filtered by an exact list of
        workflow <code>name:</code> values. That list contains <code>&apos;Commerce PR Checks - ESPN&apos;</code>. The
        workflow&apos;s actual name is <code>&apos;Commerce PR Checks - ESPN (Sharded)&apos;</code>. The list went stale
        when the workflow was renamed for the sharding migration, and because <code>workflow_run</code> matching is exact
        and a non-match is not an error, ESPN commerce Playwright has quietly produced zero GHA metrics ever since.{" "}
        <code>&apos;Growth PR Checks - ESPN&apos;</code> was never renamed and still matches, so ESPN <em>marketing</em>{" "}
        metrics are fine — which is exactly why nobody noticed.
      </p>

      <h3 id="deploy-path">The Deploy Path</h3>
      <p>Deployment is not automatic on merge in the way you might expect, and production specifically is not.</p>
      <ul>
        <li>
          <strong>Trigger.</strong> Adding the <code>Auto-Deploy</code> label fires{" "}
          <code>.github/workflows/label-reactor.yml</code>, which POSTs to{" "}
          <code>fzb-cgi-web-monorepo/job/&lt;branch&gt;/buildWithParameters</code> on the internal Jenkins. The branch
          ref is passed through the <code>sanitize-input</code> composite action first.
        </li>
        <li>
          <strong>Parent pipeline.</strong> <code>ci/monorepough</code> fans out to per-app child jobs. ESPN&apos;s two
          are <code>fzb-espnplus-commerce/&lt;branch&gt;</code> and <code>fzb-espnplus-nexus/&lt;branch&gt;</code>, both
          in <code>publicProjects</code>, so both run on every branch. Slashes in branch names have to be double-encoded
          to <code>%252F</code> for Jenkins job paths — remember that when we get to the branch rule.
        </li>
        <li>
          <strong>App pipeline.</strong> <code>ci/espnplus/commerce</code> sets{" "}
          <code>APPLICATION_NAME: espnplus-commerce</code>, builds with{" "}
          <code>turbo build --filter=@solo/commerce-espn</code>, prunes with{" "}
          <code>pnpm --filter commerce-espn --prod deploy ./target</code>, and deploys via Mariner.
        </li>
        <li>
          <strong>Branch to environment.</strong> Anything else goes to <strong>stage</strong>. <code>main</code>{" "}
          auto-deploys to <code>us-east-1</code> and <code>us-west-2</code>. <code>canary-a|b|c</code> targets the prod
          cluster but does <em>not</em> auto-deploy. <code>release-*</code> and <code>hotfix-*</code> use the
          release-candidate env.{" "}
          <strong>
            <code>trunk</code> maps to <code>env-prod.yaml</code> with <code>AUTO_DEPLOY=false</code>
          </strong>{" "}
          — production is always a human pressing a button in Jenkins.
        </li>
        <li>
          <strong>Secrets at container boot.</strong> <code>apps/commerce/espn/entrypoint.sh</code> reads{" "}
          <code>/shared/config/application-vault.properties</code>, exports each line, then starts the app. If the file
          is absent it logs <code>&quot;Vault secrets not detected.&quot;</code> and continues — worth knowing when a
          deployed ESPN pod boots but behaves as if it has no config.
        </li>
      </ul>

      <h2 id="branch-name-rule">The 27-Character Branch Rule</h2>
      <p>
        This is the cleanest example in the repo of an infrastructure constraint leaking all the way into daily developer
        workflow. ESPN branch names must be <strong>27 characters or fewer</strong> and must contain{" "}
        <strong>no slashes</strong>. It is enforced by a <code>post-checkout</code> git hook that exits non-zero, and the
        reason is stated in the hook itself.
      </p>
      <CodeBlock
        code={`# git-hooks/post-checkout
if [[ $checkout_type = "branch" ]]; then
    branch_name=$(git rev-parse --abbrev-ref HEAD \${new_head})
    branch_name_length=\${#branch_name}
    if [[ $branch_name_length -gt 27 ]]; then
        warn "Warning: Branch name (\${branch_name}) contains more than 27 characters, Jenkins will be unable to deploy it." && exit 1
    elif [ "\${branch_name#*/*}" != "$branch_name" ]; then
        warn "Warning: Branch name (\${branch_name}) contains a '/' character, Jenkins will be unable to deploy it." && exit 1
    fi
fi`}
        lang="bash"
        filename="git-hooks/post-checkout.sh"
      />
      <p>
        <strong>Where it is actually enforced:</strong> client-side only. The hook lives in <code>./git-hooks</code>,
        which is wired up by <code>pnpm git-hooks-install</code> setting <code>core.hooksPath</code>. There is{" "}
        <em>no</em> server-side check, no GitHub Actions validation and no commitlint. A fresh clone that never ran{" "}
        <code>git-hooks-install</code>, or a branch created through the GitHub web UI, bypasses the rule entirely and
        fails much later — at deploy time, in Jenkins, with an error that does not mention branch names.
      </p>
      <p>
        <strong>The in-code reason</strong> is the Fuzzbucket/Jenkins job-path limit: ESPN&apos;s child jobs are literally{" "}
        <code>fzb-espnplus-commerce/&lt;branch&gt;</code>, and <code>ci/monorepough</code> has to double-encode slashes
        to <code>%252F</code> to survive the URL round-trip. Long or slashed names break the job path. Practical shape:{" "}
        <code>GCIEX-13782-espn-billing</code> is 24 characters and safe;{" "}
        <code>feature/GCIEX-13782-espn-billing-fix</code> violates both rules. Mergify&apos;s own queue branches (
        <code>mergify-draft-*</code>) and the flaky-test healer&apos;s branches can exceed 27 characters, but they are
        never deployed, so they are exempt in practice.
      </p>

      <h2 id="turbo-caching">Turbo Caching</h2>
      <p>
        Caching is <strong>purely remote</strong> — <code>.turbo</code> is gitignored and no workflow uses{" "}
        <code>actions/cache</code> for it. The endpoint is committed in plain text in <code>turbo.json</code> as{" "}
        <code>https://turborepo-cache-legacy.us-east-1.bamgrid.net</code>, with{" "}
        <code>envMode: &quot;loose&quot;</code> and <code>globalEnv: [&quot;NODE_ENV&quot;]</code>.
      </p>
      <p>
        <strong>The placeholder-token oddity, stated factually:</strong> every call site passes the literal string{" "}
        <code>--token=&quot;1&quot;</code> together with a <code>--team</code> of <code>commerce</code>,{" "}
        <code>growth</code>, <code>identity</code> or <code>profiles-rules</code>. No <code>TURBO_TOKEN</code> or{" "}
        <code>TURBO_API</code> secret exists anywhere in the repository. The cache is therefore not
        token-authenticated in any meaningful sense; the working assumption is that it is network- and ACL-gated
        instead. Do not &quot;fix&quot; the token — it is load-bearing exactly as written, and changing it changes cache
        keys.
      </p>
      <p>
        What is and is not cached, for ESPN specifically: <code>apps/commerce/espn/turbo.json</code> declares{" "}
        <code>PRODUCT</code> and <code>NEXT_PUBLIC_FLEX_LOCAL_SERVICE</code> as <code>build</code> env inputs with
        outputs <code>build/**</code> and <code>build-test/**</code> (the second is the <code>distDir</code> used when
        building for Playwright). <code>dev</code>, <code>dev:integration</code>, <code>start</code>,{" "}
        <code>test:watch</code> and <code>test:playwright</code> are all <code>cache: false</code>. Note the asymmetry:{" "}
        <code>test:playwright:headless</code> has <strong>no</strong> <code>cache: false</code>, so it is cacheable —
        which is the same hazard CI works around by calling Playwright directly instead of through Turbo. One composite
        action, <code>build-turbo-cache-args</code>, deliberately emits empty cache args on <code>main</code>; the
        inline call sites do not, so caching behaviour differs by workflow.
      </p>

      <h2 id="security-scanning">Security Scanning</h2>
      <p>
        SCRAAP is Disney&apos;s security scanner for this monorepo, covering four finding families: dependency CVEs,
        Semgrep source findings, secret detection, and infrastructure hardening for GitHub Actions and Docker. It is a
        read-only static analysis you can run yourself.
      </p>
      <CodeBlock
        code={`scraap view                        # existing findings for this repo/branch
scraap view --branch               # scoped to your current git branch
scraap scan apps/commerce/espn     # scan one ESPN app
scraap scan apps/marketing-unified/espn
scraap scan --sarif                # SARIF output for tooling

# DO NOT do this. A full-monorepo scan is slow and prone to timeouts.
#   scraap scan .`}
        lang="bash"
        filename="scraap.sh"
      />
      <p>
        The four rules that most often gate ESPN work: (1) secrets always come from Vault — use a commented key or the
        literal <code>test-placeholder</code> in committed fixtures, which is exactly what ESPN marketing&apos;s
        Playwright config does for <code>SPARROW_S3_ACCESS_KEY</code>. (2) Dependency CVEs get the lightest possible
        fix: bump a direct dependency in its own <code>package.json</code> or the pnpm catalog; for transitive CVEs add a{" "}
        <em>scoped</em> <code>pnpm.overrides</code> entry with a semver selector; remove the dependency outright if it is
        unused. (3) Never interpolate <code>{"${{ ... }}"}</code> inside a workflow <code>run:</code> block — move it to
        a step-level <code>env:</code> and reference <code>&quot;$VAR&quot;</code>, or route <code>with:</code>-bound
        values through the <code>sanitize-input</code> composite action. (4) Dockerfiles need a non-root{" "}
        <code>USER</code> after <code>COPY</code> and before <code>CMD</code>; both ESPN Dockerfiles already comply with{" "}
        <code>USER node</code>. A line-scoped <code>nosemgrep</code> with a pinned rule id and a why-it-is-safe comment
        is the last resort, never the first move.
      </p>

      <h2 id="validation-ladder">The Validation Ladder</h2>
      <p>
        Run the smallest thing that could fail first. Type errors surface in seconds; a full Playwright run costs minutes
        and a CI shard costs more. The ordering below is the one that catches the most defects per second spent.
      </p>
      <MermaidDiagram
        chart={ladderDiagram}
        title="Validation Ladder: Smallest Check First"
        caption="The branch on next.config.js is the one people miss — it is inside collectCoverageFrom, so editing it without touching its test fails a required check."
        minHeight={550}
      />
      <ArticleTable
        caption="Copy-pasteable, in order. Stop early only when the change genuinely cannot reach the next rung."
        minWidth={960}
      >
        <table>
          <thead>
            <tr><th>#</th><th>Exact command</th><th>What it catches</th><th>Skip when</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td><code>pnpm lint:type-check:commerce:espn</code></td><td>Type errors across ESPN commerce and its imports from <code>commerce-base</code></td><td>Never skip. Fastest signal you have.</td></tr>
            <tr><td>2</td><td><code>PRODUCT=espn pnpm -F @solo/commerce-espn test:jest -- &lt;file&gt;</code></td><td>The behaviour you just changed, with ESPN fixtures</td><td>No test file exists yet — write one</td></tr>
            <tr><td>3</td><td><code>pnpm test:commerce:jest:espn</code></td><td>Regressions elsewhere <em>and</em> the 100% coverage gate</td><td>Never skip before pushing</td></tr>
            <tr><td>4</td><td><code>pnpm lint:commerce:espn</code></td><td>ESLint at the <code>--max-warnings=111</code> ratchet, plus stylelint</td><td>Comment-only change</td></tr>
            <tr><td>5</td><td><code>pnpm build:commerce:espn</code></td><td>Next build failures, dictionary prebuild, config wiring</td><td>Pure unit-level change with no config or route impact</td></tr>
            <tr><td>6</td><td><code>pnpm test:commerce:playwright:headless:espn</code></td><td>Rendered-route and flow regressions — the hard merge gate</td><td>No rendered surface touched. Otherwise run at least one shard.</td></tr>
            <tr><td>6b</td><td><code>cd apps/commerce/espn &amp;&amp; pnpm exec playwright test --shard=1/2</code></td><td>Exactly what one CI shard does, when reproducing a shard failure</td><td>Full local run already passed</td></tr>
            <tr><td>7</td><td><code>scraap scan apps/commerce/espn</code></td><td>New CVEs, Semgrep findings, secret-shaped identifiers</td><td>No new deps, no new env or credential handling</td></tr>
            <tr><td>M1</td><td><code>pnpm -F @solo/marketing-unified-espn lint:type-check</code></td><td>Marketing types — start here for NEXUS changes</td><td>Not a marketing change</td></tr>
            <tr><td>M2</td><td><code>pnpm -F @solo/marketing-unified-espn coverage:jest</code></td><td>Marketing unit tests plus its 100% gate — this is what CI runs</td><td>Never skip for marketing changes</td></tr>
            <tr><td>M3</td><td><code>pnpm test:marketing-unified:playwright:espn</code></td><td>The four marketing specs. Not a merge gate, but the only E2E signal.</td><td>Non-rendering change</td></tr>
            <tr><td>D1</td><td><code>pnpm test:data-interface-espn:coverage</code></td><td>ESPN data-interface adapters at 100%</td><td>Did not touch <code>packages/cgi/data-interface-espn</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="command-reference">Command Reference</h2>
      <ArticleTable
        caption="Every ESPN command verified against the real package.json scripts. The gotcha column is the part you will forget."
        minWidth={1000}
      >
        <table>
          <thead>
            <tr><th>Task</th><th>Exact command</th><th>What it does</th><th>Gotcha</th></tr>
          </thead>
          <tbody>
            <tr><td>Provision machine</td><td><code>./scripts/setup</code></td><td>certs, <code>/etc/hosts</code>, MSW, Playwright</td><td>Does <strong>not</strong> fetch secrets</td></tr>
            <tr><td>Fetch secrets</td><td><code>pnpm -w run setup configure secrets</code></td><td>Vault via browser SSO into each <code>.env.local</code></td><td>Separate step; ESPN commerce prompts for it on <code>dev</code></td></tr>
            <tr><td>Run commerce</td><td><code>pnpm dev:commerce:espn</code></td><td>Next 5040 + proxy 5004, real QA backends</td><td>Open <code>https://local.plus.espn.com:5004</code>, not <code>local.espn.com</code></td></tr>
            <tr><td>Run commerce mocked</td><td><code>pnpm dev:commerce:integration:espn</code></td><td><code>NEXT_PUBLIC_API_MOCKING=enabled</code></td><td>No Vault needed for mocked calls</td></tr>
            <tr><td>Run marketing</td><td><code>pnpm dev:marketing-unified:espn</code></td><td>Next 4040 + proxy 5040</td><td>Proxy 5040 collides with commerce&apos;s Next port</td></tr>
            <tr><td>Point at local Flex</td><td><code>pnpm start:traffic-director-local-edge</code></td><td>traffic-director + edge docker, nginx upstream rewrite to <code>3200</code></td><td>Start containers <em>before</em> <code>next dev</code>; detection is by <code>docker ps</code></td></tr>
            <tr><td>Point at local Flex (dead)</td><td><code>pnpm -F @solo/commerce-espn dev:local-flex</code></td><td>Sets <code>NEXT_PUBLIC_FLEX_LOCAL_SERVICE=enabled</code></td><td><strong>Dead knob</strong> — no consumer since <code>7a74df8904</code>; equals <code>dev:integration</code></td></tr>
            <tr><td>Unit tests, commerce</td><td><code>pnpm test:commerce:jest:espn</code></td><td><code>PRODUCT=espn jest --coverage</code></td><td>The only root script that sets <code>PRODUCT</code></td></tr>
            <tr><td>Unit tests, filtered</td><td><code>PRODUCT=espn pnpm -F @solo/commerce-espn test:jest</code></td><td>Same jest run, no coverage gate</td><td>Without the env prefix it silently uses Disney+ fixtures</td></tr>
            <tr><td>Watch mode</td><td><code>PRODUCT=espn pnpm -F @solo/commerce-espn test:watch</code></td><td><code>jest --watch</code></td><td>Same missing-<code>PRODUCT</code> defect</td></tr>
            <tr><td>Coverage report</td><td><code>pnpm test:commerce:jest:report:espn</code></td><td>Opens <code>coverage/jest/lcov-report/index.html</code></td><td>Depends on a prior <code>coverage:jest</code> run</td></tr>
            <tr><td>E2E headed</td><td><code>pnpm test:commerce:playwright:espn</code></td><td><code>PRODUCT=espn playwright test --ui</code></td><td>On commerce, <code>test:playwright</code> is the <em>headed</em> one</td></tr>
            <tr><td>E2E headless</td><td><code>pnpm test:commerce:playwright:headless:espn</code></td><td><code>PRODUCT=espn playwright test</code></td><td>Locally it runs <code>next build</code> first — expect a slow start</td></tr>
            <tr><td>E2E marketing</td><td><code>pnpm test:marketing-unified:playwright:espn</code></td><td>Headless <code>playwright test</code></td><td><code>...:headless:espn</code> is <strong>broken</strong> — the script does not exist</td></tr>
            <tr><td>Happy-path metric</td><td><code>pnpm -F @solo/commerce-espn coverage:playwright:happy-paths</code></td><td>Computes the number CI gates on at 10%</td><td>Reads <code>playwright/support/happy-paths.ts</code>, not the specs alone</td></tr>
            <tr><td>Lint</td><td><code>pnpm lint:commerce:espn</code></td><td>ESLint <code>--max-warnings=111</code> + stylelint</td><td>The 111 is a debt ratchet; do not raise it</td></tr>
            <tr><td>Type-check</td><td><code>pnpm lint:type-check:commerce:espn</code></td><td><code>tsc -p tsconfig.json --noEmit</code></td><td>Fastest useful check — run it first</td></tr>
            <tr><td>Build</td><td><code>pnpm build:commerce:espn</code></td><td><code>prebuild</code> dictionary extract, then <code>next build</code></td><td>Output dir varies: <code>.next</code>, <code>build</code>, or <code>build-test</code></td></tr>
            <tr><td>Local Datadog agent</td><td><code>pnpm -F @solo/commerce-espn datadog-agent:start</code></td><td>Docker agent so <code>dd-trace</code> has a sink</td><td>Needs both <code>.env</code> and <code>.env.local</code> present</td></tr>
            <tr><td>Istanbul ratchet</td><td><code>pnpm check-istanbul-ignore-counts</code></td><td>Fails if you added an <code>istanbul ignore</code></td><td>Both ESPN commerce and <code>data-interface-espn</code> are enrolled</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: walk me through getting an unfamiliar multi-tenant monorepo running locally"
        intro="A weak answer recites README steps. A strong answer shows you verify the docs against the scripts, and can name what breaks when they disagree."
        steps={[
          "Open with the enforcement layer, not the happy path: pnpm is mandated by an only-allow preinstall hook, and Node and pnpm are triple-pinned via engines, packageManager and volta. Say why that matters — a monorepo with 40-plus workspaces cannot survive two lockfile formats.",
          "Separate provisioning from secrets. ./scripts/setup does certs, hosts, MSW and Playwright; secrets are a deliberately separate SSO-gated step because they come from Vault, not the repo. Name the guard: ESPN commerce refuses to boot dev without two specific keys in .env.local.",
          "Explain the proxy topology rather than reciting a URL. Next serves plain HTTP on one port; an ssl-proxy fronts it on another with mkcert certs, because the auth SDK and cookie domains require a real brand hostname over TLS. Then give the real numbers: 5040 behind 5004 for commerce, 4040 behind 5040 for marketing.",
          "Say that you verified the documented hostname against package.json and found four docs wrong — local.espn.com is not even in the certificate domain list, so it cannot have worked. This is the moment that separates a senior answer from a junior one.",
          "Close on run modes as a decision, not a list: mocked for UI work, deployed QA for data-shape work, local BFF only when the change spans two repos. Mention that one advertised local-BFF command is a dead knob whose consumer was deleted, and name the command that actually works.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: how do you make CI trustworthy in a shared multi-brand codebase?"
        intro="The interviewer is probing whether you can distinguish a test that passes from a test that verifies something. Lead with the failure mode."
        steps={[
          "Start with the sharpest example you have: in this repo the filtered ESPN unit-test command runs ESPN tests against Disney+ fixtures because it does not set PRODUCT, and the default in the resolution cascade is Disney+. It fails open, so it stays green.",
          "Generalise the principle: any shared codebase needs the tenant declared explicitly at two levels — the config the component reads (an ESPN Sparrow fixture in the provider wrapper) and the fixture set the mock layer serves (the PRODUCT env var). Getting one right and not the other is the trap.",
          "Then talk gating, because green is only meaningful if the right things block. Name what actually gates: commerce Playwright, the apps lint/type/jest matrix, SonarQube, packages, commerce-base, and the Jenkins build. Name what does not: marketing Playwright, whose job id was never added to the required-checks list.",
          "Bring up observability of CI itself. A workflow rename desynchronised the metrics workflow's exact-match name filter, so the ESPN commerce E2E job has emitted no metrics since — a non-match is not an error. Argue for name-independent triggers or a test that asserts the two lists agree.",
          "Finish with the tagging gap as the fixable version of the same class of problem: zero ESPN jest files carry @espn, so ESPN unit results are not sliceable by product. Propose the concrete convention — one product tag and one team tag on the outermost describe — and note it is a one-line change per file.",
        ]}
      />

      <h2 id="challenge">Challenge: The Green PR That Tested Nothing</h2>
      <InterviewChallenge
        title="Diagnose a false-green ESPN pull request"
        scenario={
          <>
            A teammate changes how the ESPN billing page renders its offer ledger. The change lives in{" "}
            <code>packages/cgi/commerce-base</code> but is gated on a brand check, and they also add a conditional to{" "}
            <code>apps/commerce/espn/next.config.js</code> to expose a new public runtime value. Locally they ran{" "}
            <code>pnpm -F @solo/commerce-espn test:jest</code> — all green — and pushed to a branch named{" "}
            <code>feature/GCIEX-13782-espn-offer-ledger-refactor</code> created through the GitHub web UI. On the PR,{" "}
            <code>check-all-apps-status</code> fails, <code>run-pr-checks-espn / status-check</code> fails, and the
            Fuzzbucket job never produces a deploy. They ask you why their green local run disagrees with CI.
          </>
        }
        tasks={[
          "Explain precisely why the local jest run was green and the CI jest run was not. Name the resolution cascade and the value it defaulted to.",
          "Give the exact corrected local command, and explain why the root script works when the filtered one does not.",
          "Explain the coverage failure on next.config.js and name the file that must change alongside it.",
          "Explain why the branch will never deploy even after the checks go green, and where that constraint is enforced.",
          "Order the checks you would run locally, smallest first, to reproduce all three failures before pushing again.",
        ]}
        pitfalls={[
          "Blaming flakiness. Nothing here is flaky — all three failures are deterministic.",
          "Assuming the brand gate is wrong. The gate may be fine; the fixtures the test saw were Disney+.",
          "Adding an istanbul ignore to next.config.js to clear the coverage failure. That trips the check-istanbul-ignore-counts ratchet and hides the real gap.",
          "Renaming the branch and assuming a local git hook will catch the next one. The hook only runs if core.hooksPath was installed, and it never runs for a branch created in the web UI.",
          "Reaching for the full Playwright suite first. It is the most expensive rung and would not have caught the jest or coverage failures at all.",
        ]}
        signal="A strong candidate separates the three independent failures cleanly, names PRODUCT and getProductNameForMocks as the cause of the false green, knows next.config.js is inside collectCoverageFrom, and identifies the branch rule as client-side-only enforcement of a Jenkins job-path limit."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. The false green.</strong> <code>apps/commerce/espn/package.json</code> defines{" "}
          <code>test:jest</code> as a bare <code>jest</code> with no <code>PRODUCT</code>. Fixture selection goes
          through <code>getProductNameForMocks()</code>, whose cascade is <code>process.env.PRODUCT</code> then{" "}
          <code>publicRuntimeConfig.productNameForMocks</code> then the literal <code>&apos;disneyPlus&apos;</code>. In a
          bare jest process the first two are absent, so every fixture lookup served <strong>Disney+</strong> data. The
          brand-gated ledger branch was never executed. CI runs <code>coverage:jest</code>, which <em>does</em> set{" "}
          <code>PRODUCT=espn</code>, so CI hit the ESPN path and the ESPN assertions — and the coverage threshold —
          failed.
        </p>
        <p>
          <strong>2. The fix.</strong> <code>pnpm test:commerce:jest:espn</code> (root) routes through Turbo to{" "}
          <code>coverage:jest</code>, which is the only ESPN jest script with <code>PRODUCT=espn</code> baked in. To keep
          the filtered form, prefix it: <code>PRODUCT=espn pnpm -F @solo/commerce-espn test:jest</code>. For a single
          file: <code>PRODUCT=espn pnpm -F @solo/commerce-espn test:jest -- &lt;path&gt;</code>.
        </p>
        <p>
          <strong>3. The config coverage failure.</strong> <code>collectCoverageFrom</code> in{" "}
          <code>apps/commerce/espn/jest.config.js</code> includes <code>next.config.js</code> alongside{" "}
          <code>src/**</code>, and the global threshold is 100 on branches. A new conditional adds an uncovered branch,
          so the threshold fails. The file that must change in the same commit is{" "}
          <code>apps/commerce/espn/next.config.test.js</code> — add a case that exercises both sides of the new
          conditional. This is also why <code>run-pr-checks-espn</code> can fail independently: the new public runtime
          value changes what the app renders, and the Playwright shards run against a real build.
        </p>
        <p>
          <strong>4. Why it will never deploy.</strong>{" "}
          <code>feature/GCIEX-13782-espn-offer-ledger-refactor</code> is 45 characters and contains a slash. Both violate{" "}
          <code>git-hooks/post-checkout</code>, which exits 1 on names longer than 27 characters or containing{" "}
          <code>/</code>. The reason is in the hook text: &quot;Jenkins will be unable to deploy it&quot; — ESPN&apos;s
          Fuzzbucket child job is <code>fzb-espnplus-commerce/&lt;branch&gt;</code>, and <code>ci/monorepough</code> must
          double-encode slashes to <code>%252F</code>. Enforcement is client-side only, via{" "}
          <code>core.hooksPath ./git-hooks</code>, so a branch created in the GitHub UI bypasses the hook entirely and
          fails at deploy time instead. Fix: recreate as something like <code>GCIEX-13782-espn-ledger</code> (23
          characters, no slash).
        </p>
        <p>
          <strong>5. The reproduction order.</strong> <code>pnpm lint:type-check:commerce:espn</code> →{" "}
          <code>PRODUCT=espn pnpm -F @solo/commerce-espn test:jest -- &lt;the spec&gt;</code> (reproduces failure 1 in
          seconds) → <code>pnpm test:commerce:jest:espn</code> (reproduces failure 2, the coverage gate) →{" "}
          <code>pnpm lint:commerce:espn</code> → <code>pnpm build:commerce:espn</code> →{" "}
          <code>pnpm test:commerce:playwright:headless:espn</code>, or one shard via{" "}
          <code>cd apps/commerce/espn &amp;&amp; pnpm exec playwright test --shard=1/2</code> → check the branch name
          before pushing.
        </p>
      </SolutionReveal>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>
            <code>pnpm -F @solo/commerce-espn test:jest</code> uses Disney+ fixtures.
          </strong>{" "}
          Always set <code>PRODUCT=espn</code> or use <code>pnpm test:commerce:jest:espn</code>. Same for{" "}
          <code>test:watch</code>.
        </li>
        <li>
          <strong>
            <code>test:marketing-unified:playwright:headless:espn</code> is broken.
          </strong>{" "}
          It targets a turbo task the marketing ESPN app never defines. Use{" "}
          <code>pnpm test:marketing-unified:playwright:espn</code> (headless) or{" "}
          <code>pnpm -F @solo/marketing-unified-espn test:playwright:ui</code> (headed).
        </li>
        <li>
          <strong>
            <code>dev:local-flex</code> does not point at local Flex.
          </strong>{" "}
          The variable has no consumer. Use <code>pnpm start:traffic-director-local-edge</code>, with the containers up
          before <code>next dev</code>.
        </li>
        <li>
          <strong>Four docs give the wrong local hostname or port.</strong> <code>local.espn.com</code> has no
          certificate and no hosts entry. Use <code>local.plus.espn.com</code>: 5004 for commerce, 5040 for marketing.
        </li>
        <li>
          <strong>
            <code>next.config.js</code> is inside jest coverage.
          </strong>{" "}
          Editing it without updating <code>next.config.test.js</code> fails a required check on a file most engineers do
          not think of as testable.
        </li>
        <li>
          <strong>
            ESPN marketing MSW ignores <code>enabled</code>.
          </strong>{" "}
          Only <code>playwright</code> activates it, and there is no <code>dev:integration</code> script. Only home and
          soccer have snapshot fixtures.
        </li>
        <li>
          <strong>The script names invert between surfaces.</strong> Commerce <code>test:playwright</code> is headed;
          marketing <code>test:playwright</code> is headless.
        </li>
        <li>
          <strong>
            Do not raise Playwright <code>workers</code>.
          </strong>{" "}
          One <code>next start</code> per runner holds a single MSW singleton — that is the entire reason the team shards
          instead.
        </li>
        <li>
          <strong>
            Zero ESPN jest files carry <code>@espn</code>.
          </strong>{" "}
          ESPN unit results are not sliceable by product in CI visibility, and ESPN commerce also skips the CODEOWNERS
          owner fallback that marketing enables.
        </li>
        <li>
          <strong>
            <code>metrics.yml</code> emits nothing for ESPN commerce Playwright.
          </strong>{" "}
          Its exact-match workflow-name list predates the <code>(Sharded)</code> rename.
        </li>
        <li>
          <strong>The 27-character branch rule is client-side only.</strong> A branch created in the GitHub UI, or a
          clone that never ran <code>pnpm git-hooks-install</code>, bypasses it and fails at deploy.
        </li>
        <li>
          <strong>The 5040 collision.</strong> Marketing&apos;s proxy port equals commerce&apos;s Next port. You cannot
          run both ESPN apps simultaneously without changing one.
        </li>
        <li>
          <strong>HTTPS is disabled in both Playwright configs</strong> pending <code>WEB-30985</code>, with{" "}
          <code>ignoreHTTPSErrors: true</code>. HTTPS-only bugs will not reproduce in CI.
        </li>
        <li>
          <strong>
            The Turbo token is a literal <code>1</code>.
          </strong>{" "}
          That is intentional and load-bearing. Do not &quot;fix&quot; it.
        </li>
        <li>
          <strong>
            The <code>install-dependencies</code> composite omits <code>--frozen-lockfile</code>.
          </strong>{" "}
          CI can silently drift from <code>pnpm-lock.yaml</code>.
        </li>
        <li>
          <strong>ESPN commerce loads every tenant&apos;s MSW handlers</strong> (<code>TODO WEB-31113</code>), and the
          only guard against a Disney+-only Orchestration query rendering on ESPN is a hand-maintained two-entry regex
          denylist.
        </li>
        <li>
          <strong>Analytics, RUM and logging are a different module.</strong> Datadog services, sampling and the Adobe
          stack for ESPN are covered by the sibling observability module — this one deliberately stops at &quot;the local
          agent exists and here is how to start it&quot;.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>
            Trust <code>package.json</code>, not prose.
          </strong>{" "}
          ESPN commerce is <code>https://local.plus.espn.com:5004</code> over Next on 5040; marketing is{" "}
          <code>https://local.plus.espn.com:5040</code> over Next on 4040. Four checked-in docs say otherwise, and{" "}
          <code>local.espn.com</code> has never had a certificate in this repo.
        </li>
        <li>
          <strong>The tenant must be declared twice.</strong> The provider wrapper needs{" "}
          <code>getSparrowConfigFixture(&apos;espn&apos;)</code> because <code>renderWithProviders</code> defaults to
          Disney+, and the process needs <code>PRODUCT=espn</code> because <code>getProductNameForMocks()</code> also
          defaults to Disney+. Miss the second and <code>pnpm -F @solo/commerce-espn test:jest</code> passes while
          testing the wrong brand.
        </li>
        <li>
          <strong>Three run modes, one dead knob.</strong> Mocked via <code>dev:commerce:integration:espn</code>,
          deployed QA via <code>dev:commerce:espn</code>, local Flex via{" "}
          <code>start:traffic-director-local-edge</code> with the edge container rewriting the upstream to{" "}
          <code>host.docker.internal:3200</code>. <code>dev:local-flex</code> is not a third mode — its consumer was
          deleted.
        </li>
        <li>
          <strong>Know exactly what gates your merge.</strong> ESPN commerce Playwright is a hard gate at two shards and
          a 10% happy-path threshold; ESPN marketing Playwright runs on every PR and gates nothing. GitHub Actions owns
          all testing; Jenkins only builds and deploys, and production is a manual promotion from <code>trunk</code>.
        </li>
        <li>
          <strong>Two silent gaps are worth fixing.</strong> No ESPN jest file carries <code>@espn</code>, so ESPN unit
          results have no <code>test.product</code>; and <code>metrics.yml</code> matches workflow names exactly, so the{" "}
          <code>(Sharded)</code> rename left ESPN commerce E2E metrics permanently empty. Both are small, concrete
          changes.
        </li>
        <li>
          <strong>Climb the ladder smallest-first.</strong> Type-check, then targeted jest with{" "}
          <code>PRODUCT=espn</code>, then the full ESPN jest coverage gate, then lint, then build, then Playwright, then{" "}
          <code>scraap scan apps/commerce/espn</code> — and check your branch is 27 characters with no slash before you
          push.
        </li>
      </ul>
    </div>
  );
}
