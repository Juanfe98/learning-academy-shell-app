import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const setupFlowDiagram = String.raw`flowchart TD
  CLONE["git clone cgi-web"]
  CLONE --> SETUP["./scripts/setup<br/>(install + configure)"]
  SETUP --> INSTALL["install: brew, node 22.14.0,<br/>pnpm 10.16.0, turbo, docker, mkcert, devx"]
  SETUP --> CONFIG["configure: certs, hostfile,<br/>msw, playwright (NOT secrets)"]
  CONFIG --> DEPS["pnpm install<br/>(+ git hooks)"]
  DEPS --> MSW["pnpm run setup configure msw"]
  DEPS --> SEC["pnpm -w run setup configure secrets"]
  DEPS --> PW["pnpm run setup configure playwright"]
  MSW & SEC & PW --> RUN["pnpm dev:commerce:disney"]`;

const setupTreeDiagram = String.raw`flowchart TD
  S["./scripts/setup"]
  S --> I["install"]
  S --> C["configure"]
  I --> I1["formulae / homebrew"]
  I --> I2["node (pnpm env use 22.14.0)"]
  I --> I3["pnpm / turbo / devx"]
  C --> C1["certs (mkcert)"]
  C --> C2["hostfile (/etc/hosts)"]
  C --> C3["msw / playwright"]
  C --> C4["secrets (opt-in, NOT default)"]`;

const certDiagram = String.raw`flowchart LR
  MK{"mkcert installed?"}
  MK -->|"no"| SKIP["prints 'mkcert not installed, skipping'<br/>→ dev env silently broken"]
  MK -->|"yes"| CA["mkcert --install (create CA)"]
  CA --> GEN["mkcert -cert-file cert.pem -key-file key.pem<br/>&lt;domains&gt; → apps/.certs/"]
  GEN --> HOST["append 127.0.0.1 &lt;domain&gt; to /etc/hosts"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "prereqs", title: "Prerequisites and Pinned Versions", level: 2 },
  { id: "setup-script", title: "What ./scripts/setup Does", level: 2 },
  { id: "subcommands", title: "install vs configure", level: 3 },
  { id: "certs", title: "Certificates and the mkcert Trap", level: 2 },
  { id: "sequence", title: "The Clean-Clone Sequence", level: 2 },
  { id: "secrets", title: "Secrets: Vault → .env.local", level: 2 },
  { id: "guardrail", title: "The check-commerce-secrets Guardrail", level: 3 },
  { id: "msw-init", title: "MSW Worker Initialization", level: 2 },
  { id: "troubleshooting", title: "Onboarding Troubleshooting", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: A Broken First-Run", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function LocalSetupAndOnboarding() {
  return (
    <div className="article-content">
      <p>
        This is the day-one runbook: from a fresh <code>git clone</code> to a commerce app running in
        your browser. cgi-web has a real provisioning script and a specific ordering that, if you get
        it wrong, produces confusing silent failures (a skipped cert step, missing secrets, an
        uninitialized MSW worker). Every command here was verified against the repo&apos;s actual
        scripts — follow the sequence exactly and you&apos;ll be productive in one sitting.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        The most common onboarding failures aren&apos;t code problems — they&apos;re setup-order
        problems. mkcert not installed before <code>./scripts/setup</code>? HTTPS silently broken.
        Ran a commerce dev server before pulling secrets? It refuses to start. Skipped{" "}
        <code>configure msw</code>? The app throws about a service worker. Knowing the pipeline and
        its ordering is what turns a lost afternoon into ten minutes.
      </p>

      <h2 id="prereqs">Prerequisites and Pinned Versions</h2>
      <p>
        cgi-web pins its toolchain hard. From the root <code>package.json</code>:
      </p>
      <ArticleTable
        caption="The enforced toolchain (root package.json)."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Version</th>
              <th>Enforced by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Node</td>
              <td><code>22.14.0</code></td>
              <td><code>engines</code> + <code>volta.node</code> (no <code>.nvmrc</code>)</td>
            </tr>
            <tr>
              <td>pnpm</td>
              <td><code>10.16.0</code></td>
              <td><code>engines.pnpm</code> + <code>packageManager</code></td>
            </tr>
            <tr>
              <td>Package manager lock</td>
              <td>pnpm only</td>
              <td><code>preinstall: npx only-allow pnpm</code> (npm/yarn rejected)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Node is pinned via <strong>Volta</strong>, not nvm — there is no <code>.nvmrc</code> in
        cgi-web (that belongs to the separate Flex repo). If brew doesn&apos;t have the pinned pnpm,
        install it directly:
      </p>
      <CodeBlock
        lang="bash"
        filename="pnpm bootstrap (from README)"
        code={`curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=10.16.0 sh -`}
      />

      <h2 id="setup-script">What ./scripts/setup Does</h2>
      <p>
        <code>./scripts/setup</code> is the machine-provisioning entrypoint. With no arguments it runs
        both <code>install</code> and <code>configure</code>:
      </p>
      <MermaidDiagram
        chart={setupFlowDiagram}
        title="The full onboarding pipeline"
        caption="./scripts/setup provisions the machine (install + configure). Then pnpm install, and three configure sub-steps (msw, secrets, playwright) prepare the app to run. Note: configure with no arg does NOT run secrets."
        minHeight={480}
      />
      <p>
        The <code>install</code> stage installs Homebrew formulae, Node 22.14.0 (via{" "}
        <code>pnpm env use --global 22.14.0</code>), pnpm 10, Turborepo, Docker Desktop, mkcert, and
        the DevX CLI. The <code>configure</code> stage sets up certs, the hostfile, MSW, and
        Playwright.
      </p>

      <h3 id="subcommands">install vs configure</h3>
      <MermaidDiagram
        chart={setupTreeDiagram}
        title="setup subcommand tree"
        caption="Each stage has granular subcommands you can run individually (e.g. ./scripts/setup install devx, or ./scripts/setup configure certs). Crucially, plain 'configure' runs certs + hostfile + msw + playwright but NOT secrets."
        minHeight={360}
      />
      <p>
        You can run any subcommand alone — useful when only one piece is broken:
      </p>
      <CodeBlock
        lang="bash"
        filename="targeted setup subcommands"
        code={`./scripts/setup install devx        # just install the DevX CLI
./scripts/setup configure certs     # just regenerate SSL certs
./scripts/setup configure msw       # just re-init MSW workers
./scripts/setup configure secrets   # pull Vault secrets (opt-in)`}
      />

      <h2 id="certs">Certificates and the mkcert Trap</h2>
      <p>
        Commerce runs over HTTPS on local hostnames (<code>local.disneyplus.com</code>, etc.), which
        needs locally-trusted certs. The cert step creates a CA and issues a cert into{" "}
        <code>apps/.certs/</code>, then adds the hostnames to <code>/etc/hosts</code>:
      </p>
      <MermaidDiagram
        chart={certDiagram}
        title="The certificate + hostfile step"
        caption="If mkcert isn't installed, the cert step prints 'skipping' and RETURNS — a silent skip that breaks HTTPS dev. This is the single most common onboarding trap; install mkcert first."
        minHeight={320}
      />
      <p>
        <strong>The trap:</strong> if <code>mkcert</code> is not installed when you run{" "}
        <code>./scripts/setup</code>, the cert step prints{" "}
        <code>&quot;mkcert not installed, skipping&quot;</code> and returns — leaving you without
        certs and a silently broken dev environment. The README calls this out explicitly. The fix:
      </p>
      <CodeBlock
        lang="bash"
        filename="fixing the mkcert skip"
        code={`brew install mkcert
mkcert -install          # run in the repo root; installs the local CA
./scripts/setup          # re-run so the cert step actually generates certs`}
      />

      <h2 id="sequence">The Clean-Clone Sequence</h2>
      <p>
        The exact, verified order from a fresh clone to a running app:
      </p>
      <CodeBlock
        lang="bash"
        filename="clean clone → running app"
        code={`# 1. Provision the machine (brew, node, pnpm, turbo, docker, mkcert, certs, /etc/hosts)
./scripts/setup

# 2. Install all monorepo dependencies (also installs git hooks + gitconfig)
pnpm install

# 3. Initialize MSW service workers
pnpm run setup configure msw

# 4. Commerce/marketing: pull Vault secrets into .env.local (opt-in, not in default configure)
pnpm -w run setup configure secrets

# 5. Install Playwright browsers
pnpm run setup configure playwright

# 6. Run a brand
pnpm dev:commerce:disney`}
      />
      <p>
        Order matters: MSW and Playwright configure steps <strong>skip packages that
        haven&apos;t installed their deps</strong>, so they must run <em>after</em>{" "}
        <code>pnpm install</code>. And secrets is deliberately not part of the default{" "}
        <code>configure</code> — you run it explicitly.
      </p>

      <h2 id="secrets">Secrets: Vault → .env.local</h2>
      <p>
        Commerce apps need real secrets, sourced from <strong>Vault</strong> via the DevX CLI (
        <code>devx locksmith</code>) and written into each app&apos;s <code>.env.local</code>. The{" "}
        <code>configure secrets</code> step logs you in via browser SSO, exports the secrets, and
        writes them per app:
      </p>
      <CodeBlock
        lang="bash"
        filename="pull secrets"
        code={`pnpm -w run setup configure secrets
# → devx locksmith login  -s <service> -n <namespace> -e staging   (opens browser SSO)
# → devx locksmith export  ... -p secret -f json
# → writes/updates keys in apps/commerce/<brand>/.env.local`}
      />
      <p>
        Each app maps to a Vault service/namespace (e.g. <code>hulu-commerce</code>,{" "}
        <code>dominguez-commerce</code>, <code>espnplus-commerce</code>). Never commit these — the
        committed <code>.env.local.example</code> lists only the <em>key names</em> (blank values)
        plus header comments naming the Vault service. If DevX isn&apos;t installed,{" "}
        <code>./scripts/setup install devx</code> adds it.
      </p>

      <h3 id="guardrail">The check-commerce-secrets Guardrail</h3>
      <p>
        You can&apos;t forget secrets and not notice: every commerce <code>dev</code> script runs{" "}
        <code>check-commerce-secrets</code> first, which fails fast if required keys are missing from{" "}
        <code>.env.local</code>:
      </p>
      <CodeBlock
        lang="bash"
        filename="scripts/lib/check-commerce-secrets.sh"
        code={`REQUIRED_KEYS=("REMOTE_CONFIG_S3_ACCESS_KEY" "DAPI_SENSITIVE_SECRETS_API_KEY")
# If missing from <app>/.env.local → error + prompt to run:
#   pnpm -w run setup configure secrets`}
      />
      <p>
        So &quot;my commerce app won&apos;t start and complains about secrets&quot; has one fix: run
        the secrets step. This guard is wired into the dev chain (
        <code>dev = pnpm -w check-commerce-secrets &amp;&amp; pnpm prebuild &amp;&amp; npm run dev:start</code>).
      </p>

      <h2 id="msw-init">MSW Worker Initialization</h2>
      <p>
        <code>pnpm run setup configure msw</code> runs <code>pnpm exec msw init</code> in each
        configured package, generating <code>public/mockServiceWorker.js</code> (and, for some
        packages, into <code>.storybook/public</code>). It <strong>skips packages missing{" "}
        <code>node_modules/msw</code></strong> — another reason it must run after{" "}
        <code>pnpm install</code>. If you later see &quot;MSW service worker started but is not
        controlling the page,&quot; the worker file is missing or stale — just re-run this step.
      </p>

      <h2 id="troubleshooting">Onboarding Troubleshooting</h2>
      <ArticleTable
        caption="The documented onboarding failures and their fixes."
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
              <td>HTTPS/dev broken, no certs</td>
              <td>mkcert not installed when setup ran (silent skip)</td>
              <td><code>brew install mkcert</code>, <code>mkcert -install</code>, re-run <code>./scripts/setup</code></td>
            </tr>
            <tr>
              <td>Commerce app won&apos;t start, complains about secrets</td>
              <td>Required keys missing from <code>.env.local</code></td>
              <td><code>pnpm -w run setup configure secrets</code></td>
            </tr>
            <tr>
              <td>&quot;MSW service worker started but is not controlling the page&quot;</td>
              <td>Missing/stale <code>public/mockServiceWorker.js</code></td>
              <td><code>pnpm run setup configure msw</code></td>
            </tr>
            <tr>
              <td><code>npm install</code> / yarn rejected</td>
              <td><code>only-allow pnpm</code> preinstall hook</td>
              <td>Use pnpm 10.16.0</td>
            </tr>
            <tr>
              <td>Wrong Node version errors</td>
              <td>Not on 22.14.0</td>
              <td>Let Volta manage it (pinned in <code>package.json</code>)</td>
            </tr>
            <tr>
              <td>pnpm-lock conflicts on a branch</td>
              <td>Merge/rebase lockfile drift</td>
              <td>Follow the Solo &quot;Recommended Practices&quot; (Confluence)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Branch-name gotcha for when you start committing: branches must be <strong>≤27 characters
        with no slashes</strong> (a Jenkins/Fuzzbucket limit). Broader install errors are documented
        in the Solo troubleshooting docs.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you set up cgi-web from scratch?'"
        intro="Give the ordered pipeline and call out the ordering constraints and the mkcert trap."
        steps={[
          "Prereqs: Node 22.14.0 (Volta), pnpm 10.16.0 (enforced by only-allow pnpm) — no npm/yarn.",
          "Run ./scripts/setup: install stage (brew, node, pnpm, turbo, docker, mkcert, devx) + configure stage (certs, hostfile, msw, playwright — NOT secrets).",
          "Then pnpm install (also installs git hooks), then configure msw, then configure secrets (Vault → .env.local, opt-in), then configure playwright — MSW/Playwright must run after install.",
          "Watch the mkcert trap: if mkcert isn't installed, the cert step silently skips and dev breaks — install mkcert, mkcert -install, re-run setup.",
          "Commerce dev is guarded by check-commerce-secrets (needs REMOTE_CONFIG_S3_ACCESS_KEY + DAPI_SENSITIVE_SECRETS_API_KEY), so pull secrets before running a brand.",
        ]}
      />

      <h2 id="challenge">Challenge: A Broken First-Run</h2>
      <InterviewChallenge
        title="A new teammate can't get Disney+ commerce to start"
        scenario={
          <>
            A teammate cloned cgi-web, ran <code>./scripts/setup</code> and <code>pnpm install</code>,
            and now <code>pnpm dev:commerce:disney</code> errors out before the server starts, saying
            something about secrets. They also mention the browser later showed a certificate warning
            on <code>https://local.disneyplus.com</code>. Diagnose both and give the exact fix
            commands in order.
          </>
        }
        tasks={[
          "Explain why the dev command fails before the server starts and which script produces that error.",
          "Give the exact command to resolve the secrets failure.",
          "Explain the certificate warning's likely root cause given they ran setup.",
          "Provide the ordered fix commands for both issues.",
        ]}
        pitfalls={[
          "Assuming the secrets error is a code bug rather than the check-commerce-secrets guardrail.",
          "Re-running pnpm install to fix certs (won't help — it's the mkcert skip).",
          "Forgetting that configure secrets is NOT part of the default setup run.",
        ]}
        signal="A strong answer identifies check-commerce-secrets as the pre-dev guardrail (missing REMOTE_CONFIG_S3_ACCESS_KEY / DAPI_SENSITIVE_SECRETS_API_KEY), fixes it with pnpm -w run setup configure secrets, attributes the cert warning to the mkcert silent-skip, and fixes it with brew install mkcert + mkcert -install + re-run ./scripts/setup — in that order."
      />
      <SolutionReveal difficulty="easy">
        <p>
          <strong>Secrets failure:</strong> the commerce <code>dev</code> chain runs{" "}
          <code>check-commerce-secrets</code> before the server. It fails because{" "}
          <code>configure secrets</code> is <em>not</em> part of the default setup — the teammate
          never pulled them. Fix:
        </p>
        <CodeBlock lang="bash" filename="fix secrets" code={`pnpm -w run setup configure secrets`} />
        <p>
          <strong>Cert warning:</strong> almost certainly the <strong>mkcert silent-skip</strong> —
          mkcert wasn&apos;t installed when <code>./scripts/setup</code> ran, so no trusted cert was
          generated into <code>apps/.certs/</code>. Fix, in order:
        </p>
        <CodeBlock
          lang="bash"
          filename="fix certs"
          code={`brew install mkcert
mkcert -install
./scripts/setup            # regenerates certs into apps/.certs/`}
        />
        <p>
          Then <code>pnpm dev:commerce:disney</code> should start and serve trusted HTTPS on{" "}
          <code>local.disneyplus.com</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Pinned toolchain.</strong> Node 22.14.0 (Volta), pnpm 10.16.0 (enforced) — no
          npm/yarn.
        </li>
        <li>
          <strong>Ordered pipeline.</strong> <code>./scripts/setup</code> → <code>pnpm install</code>{" "}
          → configure <code>msw</code> / <code>secrets</code> / <code>playwright</code> →{" "}
          <code>dev:commerce:*</code>.
        </li>
        <li>
          <strong>The mkcert trap.</strong> Install mkcert <em>before</em> setup, or the cert step
          silently skips and breaks HTTPS.
        </li>
        <li>
          <strong>Secrets are opt-in and guarded.</strong> Not in default configure;{" "}
          <code>check-commerce-secrets</code> blocks dev until they&apos;re present.
        </li>
        <li>
          <strong>MSW/Playwright run after install.</strong> They skip packages whose deps
          aren&apos;t installed yet.
        </li>
      </ul>
    </div>
  );
}
