import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const devChainDiagram = String.raw`flowchart TD
  ROOT["pnpm dev:commerce:hulu"]
  ROOT --> TURBO["turbo dev --filter=@solo/commerce-hulu"]
  TURBO --> DEV["app dev: check-commerce-secrets → prebuild → dev:start"]
  DEV --> LS["local-setup: detect docker containers<br/>(WITH_TRAFFIC_DIRECTOR / WITH_EDGE_SERVER)"]
  LS --> CONC["concurrently PROXY + SERVER"]
  CONC --> SERVER["PORT=5030 PRODUCT=hulu next dev"]
  CONC --> PROXY["wait-on healthcheck →<br/>wcs ssl-proxy 5003 → 5030"]`;

const proxyDiagram = String.raw`flowchart LR
  BROWSER["browser<br/>https://local.huluqa.com:5003"]
  BROWSER --> PROXY["wcs ssl-proxy (5003)<br/>certs from apps/.certs"]
  PROXY --> NEXT["next dev (5030)<br/>http, plain"]
  NEXT --> PROXY
  PROXY --> BROWSER`;

const mockingModesDiagram = String.raw`flowchart TD
  START["How do I want data?"]
  START --> A{"real backends?"}
  A -->|"yes (staging)"| DEV["pnpm dev:commerce:hulu"]
  A -->|"no, mock everything"| INT["pnpm dev:commerce:integration:hulu<br/>NEXT_PUBLIC_API_MOCKING=enabled"]
  A -->|"real, but LOCAL Flex"| FLEX["Traffic Director + Edge<br/>→ local Flex on 3200"]`;

const localFlexDiagram = String.raw`sequenceDiagram
  participant B as browser (local.disneyplus.com:443)
  participant TD as Traffic Director (nginx)
  participant EDGE as edge container (patched)
  participant FLEX as local Flex (:3200)
  participant APP as commerce (:5001 proxy)
  B->>TD: request
  TD->>APP: UI assets / pages
  TD->>EDGE: Flex API calls
  EDGE->>FLEX: rewritten host → host.docker.internal:3200
  FLEX-->>EDGE: screen/execution response
  EDGE-->>TD: response
  TD-->>B: rendered`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "dev-chain", title: "What Happens When You Run a Brand", level: 2 },
  { id: "ports", title: "Ports and Local Hostnames", level: 2 },
  { id: "ssl-proxy", title: "The SSL Proxy", level: 2 },
  { id: "modes", title: "Three Ways to Get Data", level: 2 },
  { id: "integration", title: "Integration Mode (MSW Mocking)", level: 3 },
  { id: "local-flex", title: "Running Against Local Flex", level: 2 },
  { id: "flex-steps", title: "The Local-Flex Run Order", level: 3 },
  { id: "flex-gotchas", title: "Local-Flex Gotchas", level: 3 },
  { id: "debugging", title: "Debugging Techniques", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Assets 404 Under /commerce", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RunningAndDebuggingLocally() {
  return (
    <div className="article-content">
      <p>
        With setup done, this module is the day-to-day loop: starting a brand, understanding the SSL
        proxy and ports, choosing how you want data (real staging, fully mocked, or a local Flex
        BFF), and debugging when something doesn&apos;t connect. The local-Flex path in particular is
        the one that trips people up — it involves Docker containers, a Traffic Director, and an edge
        proxy patched to point at port 3200. All commands here are verified against the real scripts.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        &quot;It won&apos;t load,&quot; &quot;assets 404,&quot; &quot;it&apos;s hitting staging not my
        local Flex&quot; — these are the recurring local-dev complaints, and every one maps to a
        specific piece of the run chain (the proxy, the container detection, the edge patch).
        Understanding the chain lets you fix them in seconds instead of flailing.
      </p>

      <h2 id="dev-chain">What Happens When You Run a Brand</h2>
      <p>
        <code>pnpm dev:commerce:hulu</code> is the tip of a chain. Turbo filters to the Hulu app,
        whose <code>dev</code> checks secrets, prebuilds, then runs <code>dev:start</code> — which
        detects Docker containers and runs the Next server + SSL proxy concurrently:
      </p>
      <MermaidDiagram
        chart={devChainDiagram}
        title="The dev command chain"
        caption="Root script → turbo filter → app dev (secrets guard → prebuild → dev:start) → local-setup detects containers → concurrently runs the Next server and the SSL proxy in front of it."
        minHeight={480}
      />
      <p>
        The <code>local-setup</code> step is subtle but important: it checks whether{" "}
        <code>traffic-director</code> and <code>edge</code> Docker containers are running and exports{" "}
        <code>WITH_TRAFFIC_DIRECTOR</code> / <code>WITH_EDGE_SERVER</code> accordingly. When Traffic
        Director is running, commerce serves its assets under a <code>/commerce/</code> prefix — which
        is exactly why assets 404 if the containers weren&apos;t up when you started.
      </p>

      <h2 id="ports">Ports and Local Hostnames</h2>
      <p>
        Each brand has a fixed Next dev port and (for commerce) an HTTPS proxy port on a local
        hostname:
      </p>
      <ArticleTable
        caption="Verified ports and hostnames per app."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>App</th>
              <th>Next port</th>
              <th>HTTPS proxy port</th>
              <th>Local hostname</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Disney+ commerce</td>
              <td><code>5010</code></td>
              <td><code>5001</code></td>
              <td><code>local.disneyplus.com</code></td>
            </tr>
            <tr>
              <td>Hulu commerce</td>
              <td><code>5030</code></td>
              <td><code>5003</code></td>
              <td><code>local.huluqa.com</code></td>
            </tr>
            <tr>
              <td>ESPN commerce</td>
              <td><code>5040</code></td>
              <td><code>5004</code></td>
              <td><code>local.plus.espn.com</code></td>
            </tr>
            <tr>
              <td>Disney+ marketing</td>
              <td><code>4060</code></td>
              <td>— (plain <code>next dev</code>, no proxy)</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Hulu marketing</td>
              <td><code>4050</code></td>
              <td><code>5050</code></td>
              <td><code>local.huluqa.com</code></td>
            </tr>
            <tr>
              <td>ESPN marketing</td>
              <td><code>4040</code></td>
              <td><code>5040</code></td>
              <td><code>local.plus.espn.com</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Watch the collision:</strong> ESPN commerce&apos;s Next port (<code>5040</code>) is
        the same as ESPN marketing&apos;s proxy port — don&apos;t run both simultaneously. The local
        hostnames come from the <code>/etc/hosts</code> entries the setup script added.
      </p>

      <h2 id="ssl-proxy">The SSL Proxy</h2>
      <p>
        Commerce runs plain HTTP internally (Next on e.g. 5030) with a WCS SSL proxy in front
        terminating HTTPS on the proxy port (5003) using the certs in <code>apps/.certs</code>:
      </p>
      <MermaidDiagram
        chart={proxyDiagram}
        title="How the SSL proxy sits in front of Next"
        caption="You browse the HTTPS proxy port; it forwards to the plain-HTTP Next dev server. The proxy waits on a /healthcheck before starting, so a proxy that never comes up usually means the app didn't."
        minHeight={280}
      />
      <CodeBlock
        lang="bash"
        filename="apps/commerce/hulu/package.json (dev:proxy)"
        code={`# wait for the app, then run the SSL proxy 5003 -> 5030
wait-on -l http://local.huluqa.com:5030/healthcheck \\
  && PORT=5003 TARGET_PORT=5030 TARGET_HOST=127.0.0.1 \\
     pnpm exec wcs ssl-proxy -c ../../.certs -p 5003 --ignore-ws-errors true`}
      />
      <p>
        Because the proxy <code>wait-on</code>s the app&apos;s healthcheck, &quot;the proxy never
        starts&quot; almost always means the Next server failed to come up (check the SERVER pane).
      </p>

      <h2 id="modes">Three Ways to Get Data</h2>
      <MermaidDiagram
        chart={mockingModesDiagram}
        title="Choosing your data source"
        caption="Plain dev = real staging backends. Integration mode = MSW mocks everything. Local-Flex = real flow but the Flex BFF runs on your machine (port 3200) via Traffic Director + edge."
        minHeight={320}
      />
      <ArticleTable
        caption="The three local data modes."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>Command</th>
              <th>Data source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Standard dev</td>
              <td><code>pnpm dev:commerce:hulu</code></td>
              <td>Real staging backends</td>
            </tr>
            <tr>
              <td>Integration (mocked)</td>
              <td><code>pnpm dev:commerce:integration:hulu</code></td>
              <td>MSW mocks (<code>NEXT_PUBLIC_API_MOCKING=enabled</code>)</td>
            </tr>
            <tr>
              <td>Local Flex</td>
              <td><code>pnpm start:traffic-director-local-edge</code> + <code>pnpm dev:commerce:disney</code></td>
              <td>Real flow, Flex BFF on your machine (3200)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="integration">Integration Mode (MSW Mocking)</h3>
      <p>
        Integration mode sets <code>NEXT_PUBLIC_API_MOCKING=enabled</code> so the MSW browser worker
        serves all API calls from handlers — no network, deterministic data. It&apos;s the same mode
        Playwright E2E uses. This is your default when you want a stable UI without depending on
        staging.
      </p>

      <h2 id="local-flex">Running Against Local Flex</h2>
      <p>
        The most powerful (and most involved) mode: run the real server-driven-UI flow, but with the
        Flex BFF (<code>growth-life-client-api</code>) running on <em>your</em> machine on port 3200.
        This is essential when your change spans both repos (frontend + Flex). It works via a{" "}
        <strong>Traffic Director</strong> (nginx) and an <strong>edge</strong> container whose config
        is patched to rewrite the Flex host to your local port.
      </p>
      <MermaidDiagram
        chart={localFlexDiagram}
        title="Local Flex request path"
        caption="Traffic Director fronts everything on 443; UI goes to the commerce proxy, Flex API calls go through the edge container, which is patched to rewrite the QA Flex host to host.docker.internal:3200 (your local Flex)."
        minHeight={420}
      />

      <h3 id="flex-steps">The Local-Flex Run Order</h3>
      <p>
        The verified sequence (Flex lives in a separate repo, <code>growth-life-client-api</code>, on
        Node 20.9.0):
      </p>
      <CodeBlock
        lang="bash"
        filename="local Flex, three terminals"
        code={`# Terminal 1 — Flex repo (separate repo), starts Flex on port 3200
cd ~/Documents/disney/repositories/growth-life-client-api
nvm use && npm install
npm run local            # HULU_ENV=local → serverPort 3200

# Terminal 2 — cgi-web: start Traffic Director + edge, patched to local Flex
pnpm start:traffic-director-local-edge

# Terminal 3 — cgi-web: start commerce WITHOUT mocking so calls reach real (local) Flex
pnpm dev:commerce:disney

# open https://local.disneyplus.com  (Traffic Director serves on 443)

# when done:
pnpm stop:traffic-director-local-edge`}
      />
      <p>
        The <code>start:traffic-director-local-edge</code> root script initializes Traffic Director
        and brings up the edge container, then runs a setup script that patches the edge nginx config
        to rewrite the QA Flex host (<code>growth-life-client-api-qa...</code>) to{" "}
        <code>host.docker.internal</code> on port <strong>3200</strong>. Do <em>not</em> run
        integration/MSW mode here — mocking would intercept the calls before they ever reach your
        local Flex.
      </p>

      <h3 id="flex-gotchas">Local-Flex Gotchas</h3>
      <ArticleTable
        caption="Local-Flex failures and fixes."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>Cause</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Bad Credentials</code> pulling the TD/edge image</td>
              <td>Docker logged into the private registry</td>
              <td><code>docker logout fed.docker.artifactory.global.bamgrid.net</code> (anonymous pull)</td>
            </tr>
            <tr>
              <td>Cert error on <code>local.disneyplus.com</code></td>
              <td><code>apps/.certs</code> missing or containers started before certs</td>
              <td><code>./scripts/setup configure certs</code>, recreate containers</td>
            </tr>
            <tr>
              <td>Assets 404 under <code>/commerce/_next/...</code></td>
              <td>Containers weren&apos;t running when commerce started (<code>WITH_TRAFFIC_DIRECTOR</code> false)</td>
              <td>Start TD/edge first, then start commerce</td>
            </tr>
            <tr>
              <td>502 / falls back to <code>stage-web.disneyplus.com</code></td>
              <td>Target app (:5001) or Flex (:3200) not up</td>
              <td>Confirm both are running</td>
            </tr>
            <tr>
              <td>Flex calls hit QA instead of local</td>
              <td>Edge not patched (setup-edge didn&apos;t run in order)</td>
              <td>Re-run <code>pnpm start:traffic-director-local-edge</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Two important corrections if you find older docs: the dead <code>dev:local-flex</code> script
        (an MSW-based SDK-config mock) no longer works — its supporting code was removed; use the
        Traffic Director path instead. And the real TD/edge tooling lives in{" "}
        <code>packages/traffic-director-dev/</code>, not the near-empty{" "}
        <code>traffic-director-local/</code> directory some guides reference.
      </p>

      <h2 id="debugging">Debugging Techniques</h2>
      <ArticleTable
        caption="Practical local-debugging levers (from earlier modules)."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Lever</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Which cypher key is this UI using?</td>
              <td>Enable the dictionary debug tooling (<code>shouldShowDictionaryKey</code>) to render raw keys</td>
            </tr>
            <tr>
              <td>Is a query even firing?</td>
              <td>Network tab — a stuck query with no request = an <code>enabled</code> gate never true</td>
            </tr>
            <tr>
              <td>What region/flags am I actually in?</td>
              <td>Inspect the geo atoms / Mystique flags; remember SDK-off defaults to US</td>
            </tr>
            <tr>
              <td>Is an error being swallowed?</td>
              <td>Check Datadog RUM — the QueryClient routes errors by <code>meta.owner</code></td>
            </tr>
            <tr>
              <td>Deterministic repro of a data scenario</td>
              <td>Integration mode + a custom MSW handler (<code>server.use</code>-style)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you run commerce locally and against local Flex?'"
        intro="Give the dev chain, the three data modes, and the local-Flex mechanism."
        steps={[
          "pnpm dev:commerce:<brand> → turbo filter → app dev (check-commerce-secrets → prebuild → dev:start) → concurrently runs next dev + a WCS SSL proxy in front of it on a local hostname.",
          "Each brand has fixed ports (Disney 5010/5001, Hulu 5030/5003, ESPN 5040/5004) on local.* hostnames from /etc/hosts; you browse the HTTPS proxy port.",
          "Three data modes: standard dev (real staging), integration (NEXT_PUBLIC_API_MOCKING=enabled, MSW mocks — same as Playwright), and local Flex.",
          "Local Flex: run Flex on 3200 in its repo, start Traffic Director + edge (pnpm start:traffic-director-local-edge) which patches the edge nginx to rewrite the QA Flex host to host.docker.internal:3200, then run commerce WITHOUT mocking.",
          "Gotchas: assets 404 under /commerce when containers weren't up first (WITH_TRAFFIC_DIRECTOR); Bad Credentials → docker logout the private registry; the old dev:local-flex script is dead — use Traffic Director.",
        ]}
      />

      <h2 id="challenge">Challenge: Assets 404 Under /commerce</h2>
      <InterviewChallenge
        title="After switching to local-Flex mode, the page loads but all assets 404"
        scenario={
          <>
            You want to test a change that spans commerce and Flex. You started your local Flex on
            3200, then ran <code>pnpm dev:commerce:disney</code>, then started Traffic Director + edge.
            Now <code>https://local.disneyplus.com</code> loads HTML but every{" "}
            <code>/commerce/_next/...</code> asset returns 404. Diagnose and fix.
          </>
        }
        tasks={[
          "Explain what WITH_TRAFFIC_DIRECTOR controls and how commerce decides its asset prefix.",
          "Identify the ordering mistake in the steps described.",
          "Give the corrected startup order.",
          "Explain how local-setup detects the containers and why order matters.",
        ]}
        pitfalls={[
          "Blaming Next config when it's a container-detection ordering problem.",
          "Starting commerce before Traffic Director/edge are running.",
          "Assuming a rebuild fixes it rather than restarting in the right order.",
        ]}
        signal="A strong answer identifies that commerce serves assets under /commerce/ only when WITH_TRAFFIC_DIRECTOR is true, that local-setup detects the containers at startup, and that starting commerce BEFORE the containers left the flag false — so the fix is to start Traffic Director + edge first, then restart commerce."
      />
      <SolutionReveal difficulty="medium">
        <p>
          The asset prefix is conditional: commerce serves assets under <code>/commerce/</code>{" "}
          <strong>only when <code>WITH_TRAFFIC_DIRECTOR</code> is true</strong>. That flag is set by{" "}
          the <code>local-setup</code> step, which detects whether the <code>traffic-director</code>{" "}
          and <code>edge</code> containers are running <em>at the moment commerce starts</em>.
        </p>
        <p>
          The ordering was wrong: commerce was started <em>before</em> Traffic Director + edge, so{" "}
          <code>WITH_TRAFFIC_DIRECTOR</code> was <code>false</code> and Next used the plain asset
          prefix — but the browser is going through Traffic Director, which expects{" "}
          <code>/commerce/</code>-prefixed assets. Hence the 404s. Corrected order:
        </p>
        <CodeBlock
          lang="bash"
          filename="fix: containers first, then commerce"
          code={`# 1. local Flex already on 3200 (Terminal 1)
# 2. containers FIRST
pnpm start:traffic-director-local-edge
# 3. THEN commerce (now local-setup sees the containers → /commerce/ prefix)
pnpm dev:commerce:disney`}
        />
        <p>
          Restarting commerce after the containers are up flips <code>WITH_TRAFFIC_DIRECTOR</code> to{" "}
          <code>true</code>, the asset prefix becomes <code>/commerce/</code>, and the assets resolve.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>The dev chain.</strong> Root script → turbo → secrets guard → prebuild →{" "}
          concurrently(next dev + SSL proxy).
        </li>
        <li>
          <strong>Fixed ports on local hostnames.</strong> Disney 5010/5001, Hulu 5030/5003, ESPN
          5040/5004 — browse the HTTPS proxy port.
        </li>
        <li>
          <strong>Three data modes.</strong> Standard (staging), integration (MSW mocks), local Flex
          (real flow, Flex on 3200).
        </li>
        <li>
          <strong>Local Flex = Traffic Director + edge.</strong>{" "}
          <code>pnpm start:traffic-director-local-edge</code> patches the edge to 3200; run commerce
          without mocking; start containers first.
        </li>
        <li>
          <strong>Assets 404 = container-order bug.</strong> <code>WITH_TRAFFIC_DIRECTOR</code> is
          detected at commerce startup, so start containers before commerce.
        </li>
      </ul>
    </div>
  );
}
