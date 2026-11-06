import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const wiringDiagram = String.raw`flowchart LR
  BRUNO["Bruno / curl<br/>(you)"] --> FLEX["flex local server<br/>:3200<br/>(YOUR worktree code)"]
  FLEX -->|"GLO_BASE_URL=<br/>http://localhost:4300"| PROXY["qa-proxy<br/>:4300"]
  PROXY -->|"profile route matched"| OVERRIDE["override<br/>(canned or mutated body)"]
  PROXY -->|"everything else"| STAGING["real staging GLO<br/>glo.staging.hulu.com"]
  OVERRIDE -.->|"can still call"| STAGING
  FLEX -->|"HULU_ENV=local"| TPL["templates from<br/>local fixtures"]
  style FLEX fill:#113ccf,color:#fff
  style PROXY fill:#7c2d12,color:#fff
  style OVERRIDE fill:#7c2d12,color:#fff`;

const whereDiagram = String.raw`flowchart TD
  Q["I need the service to see a<br/>backend state for a test"]
  Q --> UNIT{"Is a unit/integration<br/>test enough?"}
  UNIT -->|yes| JEST["jest + factories<br/>mock the GLO CLIENT method<br/>(buildRetrieveOffersResponse...)"]
  UNIT -->|"no — I need curl evidence<br/>from the real server"| REAL{"Can real staging<br/>produce the state?"}
  REAL -->|yes| ACCOUNT["set up a real staging account<br/>(checkout, overrider, genie+)"]
  REAL -->|"no — the data does not<br/>exist upstream yet"| PROXY["qa-proxy PROFILE<br/>override ONE endpoint,<br/>pass everything else through"]
  style JEST fill:#113ccf,color:#fff
  style PROXY fill:#7c2d12,color:#fff`;

const evidenceLadder = String.raw`flowchart LR
  A["unit tests<br/>logic is correct<br/>(mocked boundary)"] --> B["local server curls<br/>the WHOLE chain renders<br/>(middleware, conversion,<br/>template, real backends)"]
  B --> C["staging QA<br/>real offers, real accounts,<br/>real edge"]
  C --> D["production<br/>experiment ramp"]
  style B fill:#7c2d12,color:#fff`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Exists: The Ledger Problem", level: 2 },
  { id: "gap", title: "The Evidence Gap Unit Tests Leave", level: 2 },
  { id: "cant-fake-staging", title: "What Staging Cannot Produce", level: 2 },
  { id: "the-idea", title: "The Idea: A Selective Proxy", level: 2 },
  { id: "wiring", title: "The Wiring, End to End", level: 2 },
  { id: "harness", title: "The flex-qa-harness Project", level: 2 },
  { id: "not", title: "What the Proxy Is NOT", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function LocalTestingAndTheGloProxy() {
  return (
    <div className="article-content">
      <p>
        This module opens Path 6 with a tool you will reach for on almost every feature ticket:
        the <strong>selective GLO proxy</strong> inside <code>flex-qa-harness</code>. It exists to
        answer one recurring question: <em>how do I make my local flex server render a state that
        the real backends cannot give me yet?</em> We start from the concrete problem that makes
        the proxy necessary, then build the mental model of how it sits in the request path. The
        next two modules go deep on its internals and on a real ticket that used it end to end.
      </p>

      <h2 id="why">Why This Exists: The Ledger Problem</h2>
      <p>
        Picture a real ticket (GCIEX-18128, the LATAM Lower-for-Longer Switch Ledger): the feature
        adds new copy to the plan-switch ledger&apos;s plan card, but <em>only</em> when the offer
        the user is switching into is an L4L offer. The code is done, 20 unit tests are green — and
        now you need PR evidence: an actual curl against your local server showing the card gaining
        its new <code>priceDetails</code> and <code>legal</code> fields.
      </p>
      <p>
        Here is the trap: the trigger for your feature is <strong>data</strong> — a GLO
        switch-preview response whose potential offer carries the <code>l4l</code> label, a{" "}
        <code>termPrice</code>, and a 6-month <code>billingFrequency</code>. And those LATAM L4L{" "}
        <em>switch</em> offers do not exist upstream yet: the BizOps ticket that configures them
        (COMOPS-6369) has not been executed. No account on Earth can make staging GLO return that
        response. Your feature is unreachable by honest means.
      </p>
      <p>
        You have exactly one option left: intercept what GLO returns to your local server and hand
        it the offer yourself. That interception, done surgically and transparently, is the proxy.
      </p>

      <h2 id="gap">The Evidence Gap Unit Tests Leave</h2>
      <p>
        &ldquo;But the unit tests already prove the logic!&rdquo; — true, and not enough. The two
        layers prove different things, and the repo&apos;s PR culture (curl + response, or a
        before/after diff, in the testing section) expects the second one:
      </p>
      <ArticleTable
        caption="Unit tests and server-level curls answer different questions."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>What it proves</th>
              <th>What it silently skips</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unit / integration tests (jest)</td>
              <td>The builder logic is correct for mocked inputs at the GLO-client boundary</td>
              <td>Middleware, header parsing, real conversion of real payload shapes, template fill, flag values, which pipeline serves the screen</td>
            </tr>
            <tr>
              <td>Local server curl</td>
              <td>The whole chain renders: route → middleware → backends → conversion → service/pipeline → template → JSON</td>
              <td>Nothing about upstream data that does not exist — unless you intercept</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={evidenceLadder}
        title="The Evidence Ladder"
        caption="The proxy exists to unlock the second rung when upstream data is missing — the highlighted step is where PR evidence comes from."
        minHeight={220}
      />

      <h2 id="cant-fake-staging">What Staging Cannot Produce</h2>
      <p>
        The proxy&apos;s reason to exist is the set of backend states that no amount of staging
        account setup can produce on demand. Real examples the harness has already covered:
      </p>
      <ul>
        <li>
          <strong>Offers that are not configured yet</strong> — LATAM L4L switch offers
          (GCIEX-18128) simply do not exist in staging GLO until BizOps runs their setup.
        </li>
        <li>
          <strong>Churned/expired account shapes</strong> — the <code>churned</code> profile forces
          an EXPIRED agreement with a CHURNED subscription to hit the reacquisition restart cell,
          a state that is slow and messy to manufacture with real accounts.
        </li>
        <li>
          <strong>Promo overlap and no-offer fallbacks</strong> — timing-dependent states that
          staging config either cannot hold still or cannot combine.
        </li>
      </ul>
      <p>
        Note what is <em>not</em> on this list: states a real account <em>can</em> reach. On
        GCIEX-18128 the baseline case (a normal Standard-to-Premium switch) was deliberately tested
        with <strong>zero mocks</strong> against a real checkout-purchased account, precisely so the
        proxy only had to fake the one thing reality could not provide. Mock the minimum; keep
        everything else honest.
      </p>
      <MermaidDiagram
        chart={whereDiagram}
        title="Where Should the Fake Live?"
        caption="The proxy is the LAST resort in the decision tree — after jest mocks and real staging account setup are ruled out."
        minHeight={400}
      />

      <h2 id="the-idea">The Idea: A Selective Proxy</h2>
      <p>
        The design is deliberately boring: a ~140-line Node HTTP server (no framework, no
        dependencies) that sits between your local flex and real staging GLO. Its contract:
      </p>
      <ul>
        <li>
          <strong>Default behavior is passthrough.</strong> Every request is forwarded verbatim to{" "}
          <code>glo.staging.hulu.com</code> and the response returned untouched. With no profile
          active, flex cannot tell the proxy is there.
        </li>
        <li>
          <strong>Overrides are opt-in per request.</strong> A &ldquo;profile&rdquo; (a small{" "}
          <code>.mjs</code> module) declares which route it overrides and what to return. It only
          activates when the request carries a magic header — so the same running proxy serves
          mocked and unmocked requests side by side.
        </li>
        <li>
          <strong>Overrides are surgical.</strong> A profile typically touches ONE endpoint. On
          GCIEX-18128 the profile mutated only <code>PUT /v3/switch/preview</code>; agreements,
          offers, invoices, experiences — all stayed live staging data.
        </li>
      </ul>

      <h2 id="wiring">The Wiring, End to End</h2>
      <p>
        Flex already reads its GLO base URL from the environment, which makes insertion a one-line
        affair — no flex code changes at all:
      </p>
      <CodeBlock
        code={`# terminal 1 — the proxy (in ~/Documents/disney/tooling/flex-qa-harness)
npm run proxy           # port 4300, plain passthrough
npm run proxy:record    # same + saves every upstream response under recordings/

# terminal 2 — flex, pointed at the proxy (in your WORKTREE, not main!)
GLO_BASE_URL=http://localhost:4300 npm run local`}
        lang="bash"
        filename="two terminals"
      />
      <MermaidDiagram
        chart={wiringDiagram}
        title="The Request Path With the Proxy Inserted"
        caption="Flex thinks the proxy IS GLO. The proxy forwards everything to real staging unless a profile route matches — and even an override can still consult the live upstream."
        minHeight={320}
      />
      <p>
        Every request prints one log line telling you exactly what happened — this line is your
        first debugging tool, because it distinguishes a mocked response from a real one at a
        glance:
      </p>
      <CodeBlock
        code={`[flex-qa-proxy] GET /v1/agreements → 200 [passthrough] 312ms
[flex-qa-proxy] PUT /v3/switch/preview → 200 [gciex18128-l4l:override] 655ms`}
        lang="bash"
        filename="proxy terminal output"
      />

      <h2 id="harness">The flex-qa-harness Project</h2>
      <p>
        The proxy is &ldquo;slice 1&rdquo; of a small personal QA harness that lives outside the
        flex repo (<code>~/Documents/disney/tooling/flex-qa-harness</code>) — deliberately, so
        nothing test-only ever leaks into the service&apos;s codebase. The three slices:
      </p>
      <ArticleTable caption="The harness in three slices — this path focuses on slice 1." minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Slice</th>
              <th>What it is</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1 — Selective GLO proxy</td>
              <td>Forces backend states staging cannot produce; everything else passes through live</td>
              <td><code>src/proxy/</code> + <code>profiles/</code></td>
            </tr>
            <tr>
              <td>2 — Scenario runner</td>
              <td>A YAML file per ticket; runs the request matrix, asserts on dot-paths, writes evidence artifacts (<code>results.md</code> + raw responses)</td>
              <td><code>scenarios/*.yaml</code>, <code>src/cli</code></td>
            </tr>
            <tr>
              <td>3 — Browser scenarios</td>
              <td>Playwright-driven cgi-web checks with screenshots as artifacts</td>
              <td><code>type: browser</code> specs</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="not">What the Proxy Is NOT</h2>
      <ul>
        <li>
          <strong>Not a stub server.</strong> It does not replace GLO; it impersonates it
          transparently and lies about as little as possible. Prices, proration, and dates in an
          overridden flow can stay live because profiles may fetch the real response and patch it.
        </li>
        <li>
          <strong>Not part of the flex repo.</strong> No fixtures, no test endpoints, no{" "}
          <code>if (isTest)</code> branches ship in the service. The interception happens one
          process away, invisible to the code under test.
        </li>
        <li>
          <strong>Not a staging bypass.</strong> Auth, region resolution, template fill, feature
          flags — all still real. Only the specific GLO responses you choose to override change.
        </li>
      </ul>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The proxy exists for one class of problem: your local server needs a backend state that{" "}
          <strong>staging cannot produce</strong> (most often: offers/data not configured upstream
          yet).
        </li>
        <li>
          Unit tests prove logic; <strong>local curls prove the whole chain</strong> — and the
          repo&apos;s PR evidence culture expects the curl.
        </li>
        <li>
          Insertion is one env var: <code>GLO_BASE_URL=http://localhost:4300</code>. Flex is
          unmodified and unaware.
        </li>
        <li>
          <strong>Default = passthrough.</strong> Overrides are per-request (magic header),
          per-endpoint (route match), and as small as possible.
        </li>
        <li>
          Mock the minimum: real account for everything reality can provide, a profile only for
          the one response it cannot.
        </li>
        <li>
          Watch the proxy log line — <code>[passthrough]</code> vs <code>[name:override]</code>{" "}
          tells you instantly whether your mock actually fired.
        </li>
      </ul>
    </div>
  );
}
