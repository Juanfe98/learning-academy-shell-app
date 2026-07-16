import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const systemContextDiagram = String.raw`flowchart LR
  subgraph clients["Frontend clients"]
    WEB["Web (Disney+ / Hulu / ESPN+)"]
    TV["Living-room / TV apps"]
    MOB["Mobile apps"]
  end

  subgraph glca["growth-life-client-api (this repo)"]
    RT["Routes<br/>(Joi validation)"]
    SVC["Screen &amp; Execution services"]
    TPL["Template engine<br/>(EJS + fillTemplate)"]
  end

  subgraph backends["Backends"]
    GLO["Growth Life<br/>Orchestrator (GLO)"]
    IPSE["IPSE"]
    OFFERS["Offers Service"]
    CYPHER["Cypher<br/>(localization)"]
    MORE["Plasma, Identity,<br/>OneTrust, WeaponX…"]
  end

  S3["growth-life-client-templates<br/>(separate repo → S3)"]

  WEB & TV & MOB -->|"HTTP + Disney headers"| RT
  RT --> SVC
  SVC --> GLO & IPSE & OFFERS & CYPHER & MORE
  SVC --> TPL
  S3 -.->|"JSON templates"| TPL
  TPL -->|"processed UI + analytics JSON"| WEB`;

const screenVsExecutionDiagram = String.raw`flowchart TD
  REQ["Incoming request"]
  REQ --> Q{"What is the client asking for?"}
  Q -->|"Render me a UI"| SCREEN["SCREEN request<br/>GET /screens/v1/...<br/>→ returns UI + analytics JSON"]
  Q -->|"Perform an action"| EXEC["EXECUTION request<br/>POST /execution/...<br/>→ mutates state, returns result"]

  SCREEN --> SREAD["Read-only:<br/>fetch data, build sections,<br/>fill template"]
  EXEC --> EWRITE["Side effects:<br/>cancel, switch plan,<br/>change payment, consent"]`;

export const toc: TocItem[] = [
  { id: "one-line", title: "The One-Line Definition", level: 2 },
  { id: "bff", title: "Why a Backend-for-Frontend Exists Here", level: 2 },
  { id: "template-driven", title: "What 'Template-Driven' Actually Means", level: 3 },
  { id: "system-context", title: "The System in Context", level: 2 },
  { id: "screens-vs-executions", title: "Screens vs Executions", level: 2 },
  { id: "two-repos", title: "Two Repos: Code Here, Templates There", level: 2 },
  { id: "request-shape", title: "The Shape of a Request and Response", level: 3 },
  { id: "layers", title: "The Layers You Will Live In", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Explain the Architecture", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatIsGrowthLifeClientApi() {
  return (
    <div className="article-content">
      <p>
        Before you can change a single line in <code>growth-life-client-api</code> safely, you need
        the correct mental model of what it is and — just as importantly — what it is{" "}
        <em>not</em>. This service is small in surface area but dense in convention. Almost every
        confusion a new engineer has traces back to one of three misconceptions: thinking the UI is
        built in React here (it is not), thinking the JSON shapes come straight from the database
        (they do not), or thinking the templates live in this repo (they do not). This module
        installs the right model so the rest of the academy clicks into place.
      </p>

      <h2 id="one-line">The One-Line Definition</h2>
      <p>
        <strong>
          growth-life-client-api is a template-driven Koa API that serves UI screens and action
          executions for Disney+, Hulu, and ESPN+ subscription/commerce flows.
        </strong>{" "}
        It fetches business data from backend services, injects that data into JSON UI templates via
        EJS, and returns a processed template — <code>{"{ data, metadata }"}</code> — whose
        <code>data.content</code> describes UI sections plus analytics payloads. It is a{" "}
        <strong>Backend-for-Frontend (BFF)</strong> for the &quot;growth &amp; life&quot; surface —
        the screens a subscriber sees when signing up, cancelling, switching plans, changing
        payment, redeeming gift cards, consenting, managing wallet/payment flows, and so on.
      </p>
      <p>
        The critical implication: <strong>this repo does not render pixels.</strong> It renders{" "}
        <em>data that describes</em> a screen. The frontend client is a generic renderer that turns
        that JSON into native UI. That is the whole reason the architecture exists.
      </p>

      <h2 id="bff">Why a Backend-for-Frontend Exists Here</h2>
      <p>
        Disney streaming has many frontends: web, living-room TV apps, mobile, on many partners
        (Disney+, Hulu, ESPN+) across many regions. If every one of those clients had to know how to
        call GLO, the Offers Service, IPSE, Cypher, and a dozen other backends — and had to
        replicate the business rules about which offer is eligible, how prices are formatted, which
        experiment a user is in — you would have that logic duplicated and drifting across a dozen
        codebases.
      </p>
      <p>
        The BFF collapses all of that into one place. Clients make one request (&quot;give me the
        cancel screen for this account&quot;) and get back a fully-resolved, localized, experiment-
        aware description of the screen. In the real app, global Koa middleware first normalizes
        standard Disney headers, loads region configuration, evaluates experimentation, attaches
        session/device context, and finally builds <code>ctx.state.flexContext</code>. Route handlers
        then pass that <code>FlexContext</code> to services. The client stays dumb; the BFF stays smart.
      </p>

      <h3 id="template-driven">What &quot;Template-Driven&quot; Actually Means</h3>
      <p>
        &quot;Template-driven&quot; is the word that trips people up. It does not mean HTML
        templates. It means this: the <em>structure</em> of each screen lives as a JSON template
        (authored and versioned in a separate repo), and this service&apos;s job is to{" "}
        <strong>fill the holes</strong> in that template with real, resolved values — prices, copy
        keys, CTAs, analytics payloads — using EJS as the injection engine.
      </p>
      <CodeBlock
        lang="json"
        filename="conceptual template (simplified)"
        code={`{
  "screenType": "flex-cancel-flow",
  "sections": {
    "header": { "text": "<%= data.headerCopy %>" },
    "cta": "<%- JSON.stringify(data.cta) %>"
  },
  "metricsData": "<%- JSON.stringify(data.metricsData) %>"
}`}
      />
      <p>
        The template says &quot;a header and a CTA go here.&quot; The service computes what the
        header copy and CTA actually are for <em>this</em> account, in <em>this</em> region, under{" "}
        <em>this</em> experiment, then EJS injects them. In code, templates use the contract in{" "}
        <code>src/domain/models/Template.ts</code>: raw templates contain <code>data</code>,{" "}
        <code>metadata</code>, and sometimes internal <code>flexData</code>; processed templates
        returned by <code>fillTemplate()</code> intentionally expose only <code>data</code> and{" "}
        <code>metadata</code>. Change the layout? Edit the template repo. Change the business logic
        that fills it? Edit this repo. That separation is the core design contract.
      </p>

      <h2 id="system-context">The System in Context</h2>
      <p>
        Here is the whole picture at a glance — where this service sits between clients, backends,
        and the template store.
      </p>
      <MermaidDiagram
        chart={systemContextDiagram}
        title="growth-life-client-api in its ecosystem"
        caption="Notice that templates flow in from S3 (a different repo) while data flows in from backend services. This service is the join point."
        minHeight={420}
      />

      <h2 id="screens-vs-executions">Screens vs Executions</h2>
      <p>
        The single most useful distinction in this codebase is <strong>screens vs executions</strong>.
        They are two different kinds of endpoints with two different mental models, and almost every
        file you touch belongs to one camp or the other.
      </p>
      <MermaidDiagram
        chart={screenVsExecutionDiagram}
        title="The two request families"
        caption="Screens are read-only UI descriptions. Executions perform state-changing actions. Confusing the two is the most common architectural mistake here."
        minHeight={360}
      />
      <ArticleTable
        caption="Screens vs Executions — how to tell which one you are working on."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Screen</th>
              <th>Execution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Purpose</td>
              <td>Describe a UI to render</td>
              <td>Perform a state-changing action</td>
            </tr>
            <tr>
              <td>HTTP verb (typical)</td>
              <td><code>GET</code> for most v1 screens / <code>POST</code> for selected v2 screens</td>
              <td><code>POST</code> across execution versions</td>
            </tr>
            <tr>
              <td>Side effects</td>
              <td>None — read-only</td>
              <td>Yes — cancels, switches, charges, consents</td>
            </tr>
            <tr>
              <td>Returns</td>
              <td>UI sections + analytics JSON via a template</td>
              <td>Action result / confirmation payload</td>
            </tr>
            <tr>
              <td>Lives in</td>
              <td><code>src/domain/screen/*</code> and <code>src/platform/*</code></td>
              <td><code>src/domain/execution/*</code></td>
            </tr>
            <tr>
              <td>Example</td>
              <td><code>GET /screens/v1/account/cancel?flow=...</code></td>
              <td><code>POST /execution/v1/subscription/cancel</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="two-repos">Two Repos: Code Here, Templates There</h2>
      <p>
        You will constantly hit this: a screen looks wrong and the fix is <em>not</em> in this repo.
        The UI templates live in a separate repository,{" "}
        <code>growth-life-client-templates</code>, which is deployed to S3. At runtime this service
        fetches the relevant template, then fills it. The actual client selection lives in{" "}
        <code>src/backends/templateConfiguration/index.ts</code>: <code>local</code>,{" "}
        <code>ci</code>, and <code>integration</code> use local fixture-backed template config; deployed
        environments such as development/staging/production use the S3-backed
        <code>TemplateConfigClient</code>.
      </p>
      <ArticleTable
        caption="What lives where — the boundary that decides which repo you edit."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Repo</th>
              <th>Example change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Screen layout / which sections exist / static copy keys</td>
              <td><code>growth-life-client-templates</code> (S3)</td>
              <td>Add a new banner slot to the cancel screen</td>
            </tr>
            <tr>
              <td>Which offer is eligible, price formatting, experiment logic</td>
              <td><code>growth-life-client-api</code> (this repo)</td>
              <td>Change which price is shown for AU/NZ users in an experiment</td>
            </tr>
            <tr>
              <td>Localized copy strings themselves</td>
              <td>Cypher (backend) via dictionaries</td>
              <td>Reword a button label in French</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The <code>CLAUDE.md</code> at the repo root spells this out operationally: <code>npm run dev</code>
        uses staging backends and S3 template configuration, while <code>npm run local</code> sets{" "}
        <code>HULU_ENV=local</code> so template config is read from{" "}
        <code>src/__fixtures__/templates/configuration</code>. Unit tests also pin{" "}
        <code>HULU_ENV=ci</code>, so test behavior is driven by local fixtures rather than live S3.
      </p>

      <h3 id="request-shape">The Shape of a Request and Response</h3>
      <p>
        A screen request carries <strong>Disney unified headers</strong> (account id, identity id,
        partner, device/runtime, region, request id, SDK platform, experiment assignments) plus
        query params for v1 screens or a JSON body for selected v2 screens. The response is not HTML
        — it is a processed template object with <code>data.templateId</code>,{" "}
        <code>data.screenType</code>, <code>data.content</code>, and <code>metadata.configurationId</code>.
        The UI sections and <code>metricsData</code> live inside <code>data.content</code>.
      </p>
      <CodeBlock
        lang="bash"
        filename="a screen request (conceptual)"
        code={`GET /screens/v1/account/cancel?flow=cancelSwitch&subscriptionId=abc
x-bamtech-account-id: 8f0c...          # who
x-bamtech-identity-id: 1592...         # identity context
x-bamtech-partner: disney              # which brand/partner
x-bamtech-location-country-code: US    # where
x-bamsdk-platform: javascript/windows  # renderer/runtime family
x-request-id: 59c26...                 # tracing
x-bamtech-weaponx-assignments: <b64>   # which experiments`}
      />
      <CodeBlock
        lang="json"
        filename="the response (conceptual)"
        code={`{
  "data": {
    "templateId": "default",
    "screenType": "cancel-flow",
    "content": {
      "sections": {
        "header": { "text": "Are you sure you want to cancel?" },
        "cta": { "primary": { "label": "Keep my plan", "action": "dismiss" } }
      },
      "metricsData": { "pageView": { "pageName": "cancel_landing" } }
    },
    "initialFocus": "primary-cta"
  },
  "metadata": { "configurationId": "..." }
}`}
      />

      <h2 id="layers">The Layers You Will Live In</h2>
      <p>
        The repo is organized into a small number of layers. You do not need to memorize every
        folder yet — later modules go deep on each — but you should recognize the names and what
        they own.
      </p>
      <ArticleTable
        caption="The layers of growth-life-client-api and what each is responsible for."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Path</th>
              <th>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Routes</td>
              <td><code>src/routes/</code></td>
              <td>
                Joi validation + FlexContext injection via <code>flexRouteMiddleware</code> or{" "}
                <code>flexContextRouteHandler</code>. No business logic.
              </td>
            </tr>
            <tr>
              <td>Backends</td>
              <td><code>src/backends/</code></td>
              <td>
                Clients for GLO, IPSE, Offers Service, Cypher/localization, Plasma, Identity,
                OneTrust, WeaponX, template configuration, site config, and related integrations.
              </td>
            </tr>
            <tr>
              <td>Domain (common)</td>
              <td><code>src/domain/common/</code></td>
              <td>GLO→Flex conversion wrappers and shared business logic.</td>
            </tr>
            <tr>
              <td>Screen services</td>
              <td><code>src/domain/screen/</code> (legacy) &amp; <code>src/platform/</code></td>
              <td>Orchestrate fetches, build UI sections, fill templates.</td>
            </tr>
            <tr>
              <td>Executions</td>
              <td><code>src/domain/execution/</code></td>
              <td>State-changing actions (cancel, switch, payments, wallet).</td>
            </tr>
            <tr>
              <td>Elements</td>
              <td><code>src/elements/v1/types/</code></td>
              <td>
                UI element and copy builders (<code>toInteractionElement</code>, <code>toCopy</code>,
                currency/date/string/link variables, image/rich-text/localized text helpers).
              </td>
            </tr>
            <tr>
              <td>Metrics</td>
              <td><code>src/domain/metricsData/</code></td>
              <td>Analytics payload builders (page/container/interaction views).</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        One nuance to file away now, because it shapes everything: some screens are{" "}
        <strong>mid-migration</strong> from the legacy <code>src/domain/screen/</code> location to a
        new <code>src/platform/</code> pipeline, and <em>both implementations run live behind a
        feature flag</em>. A behavioral change to a migrating screen must be made on both sides.
        We&apos;ll dedicate a full module to that later — for now, just know the dual world exists.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <p>
        &quot;Walk me through what this service does&quot; is the opening question in every design
        review and onboarding conversation. A strong answer is short, layered, and leads with the
        BFF purpose.
      </p>
      <InterviewPlaybook
        title="How to answer: 'What does growth-life-client-api do?'"
        intro="A weak answer lists folders. A strong answer explains the purpose, then the flow, then the key boundary."
        steps={[
          "Lead with the purpose: it's a template-driven BFF that serves subscription/commerce UI screens and action executions for Disney+, Hulu, and ESPN+.",
          "Give the flow in one breath: request with Disney headers → global middleware builds FlexContext → route validates → service fetches backend data → converts to domain types → builds UI sections → fills a JSON template → returns a processed { data, metadata } template with UI + analytics in data.content.",
          "Name the key boundary: templates live in a separate repo (S3), this repo fills them; it renders data-that-describes-UI, not pixels.",
          "Distinguish screens (read-only UI) from executions (state-changing actions) so the interviewer knows you understand the two request families.",
          "Close with a production implication: because clients are thin renderers, business, region, experiment, and localization-key composition logic is centralized here — which is why correctness and testing standards in this repo matter so much.",
        ]}
      />

      <h2 id="challenge">Challenge: Explain the Architecture</h2>
      <InterviewChallenge
        title="Onboard a new teammate in five minutes"
        scenario={
          <>
            A new engineer joins the Flex team and asks you: &quot;A designer says the cancel screen
            is showing the wrong price for Australian users during a promo. Where do I even start
            looking, and how do I know it&apos;s not a template problem?&quot; Explain how you&apos;d
            reason about it using the mental model from this module.
          </>
        }
        tasks={[
          "State which repo owns 'the wrong price' vs 'a missing section' and how you decide.",
          "Describe the request→response path the cancel screen takes, naming the layers involved.",
          "Explain why 'Australian users during a promo' points at business/experiment logic in THIS repo rather than the template repo.",
          "Identify which request family (screen vs execution) this is, and what that tells you about side effects.",
        ]}
        pitfalls={[
          "Assuming the fix is in the template repo because the symptom is visual.",
          "Forgetting that experiment/region logic is centralized in the BFF.",
          "Treating a screen request as if it mutates state.",
        ]}
        signal="A strong answer routes the price bug to this repo's domain/experiment logic, keeps the template repo as the layout owner, and confidently traces the read-only screen flow."
      />
      <SolutionReveal difficulty="easy">
        <p>
          &quot;Wrong price&quot; is a <em>value</em> being injected, not a <em>section</em> that is
          missing — so it&apos;s almost certainly this repo, not the template repo. The template
          only declares that a price goes in a slot; the BFF computes which price. Because the
          symptom is scoped to a region (AU) during a promo, it&apos;s driven by region config and
          possibly an experiment treatment — both centralized in <code>growth-life-client-api</code>.
        </p>
        <p>
          The path: client <code>GET</code> for the cancel screen with Disney headers → global
          middleware builds <code>FlexContext</code> → the route in <code>src/routes/</code> validates
          and passes that context to the cancel
          screen service (in <code>src/domain/screen/</code>, possibly mirrored in{" "}
          <code>src/platform/</code>) fetches offers from GLO, converts them to Flex types, picks the
          eligible offer/price for the region + experiment, builds the CTA and copy, and fills the{" "}
          <code>flex-cancel-flow</code> template. It&apos;s a <strong>screen</strong> request:
          read-only, no state change — so nothing was &quot;charged&quot; wrong, only displayed
          wrong. Start in the screen service&apos;s offer-selection and region/experiment logic.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>It&apos;s a template-driven BFF.</strong> It fetches data, injects it into JSON UI
          templates via EJS, and returns UI + analytics JSON — it does not render pixels.
        </li>
        <li>
          <strong>Two request families.</strong> Screens are read-only UI descriptions; executions
          perform state-changing actions. Know which one you&apos;re in.
        </li>
        <li>
          <strong>Two repos.</strong> Layout and static structure live in{" "}
          <code>growth-life-client-templates</code> (S3); business, region, and experiment logic
          live here.
        </li>
        <li>
          <strong>Clients are thin.</strong> Centralizing logic in the BFF is the whole point — and
          the reason correctness/testing standards here are strict.
        </li>
        <li>
          <strong>A few layers own everything:</strong> global Koa middleware/FlexContext → routes →
          backends → domain conversion → screen/execution services → element &amp; metrics builders →
          template fill.
        </li>
        <li>
          <strong>Some screens are dual-implemented</strong> (legacy <code>domain/screen</code> +
          new <code>platform</code>) behind a flag — a detail that will matter when you start
          changing code.
        </li>
      </ul>
    </div>
  );
}
