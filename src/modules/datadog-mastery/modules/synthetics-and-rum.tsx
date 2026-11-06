import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const syntheticDecisionDiagram = String.raw`flowchart TD
  Q["What do I actually need to verify?"]
  Q -->|"Is one endpoint reachable, at all, right now?"| API["API Test\n(HTTP, SSL, DNS, TCP, ICMP, gRPC, WebSocket)"]
  Q -->|"Do I need to chain calls and pass data between them\n(auth token, order ID, session cookie)?"| MULTI["Multistep API Test\nExtract a value from step 1, inject it into step 2"]
  Q -->|"Do I need to validate a real UI journey a user takes\n(login, search, add to cart, checkout)?"| BROWSER["Browser Test\nRecorder-based steps + assertions"]
  Q -->|"Is the target only reachable INSIDE my network\n(internal service, pre-prod, VPN-only)?"| PRIV["Run it from a Private Location\ninstead of a public/managed location"]
  API --> LOC{"Public or private target?"}
  MULTI --> LOC
  BROWSER --> LOC
  LOC -->|"public-facing"| PUB["Managed / public locations\nDatadog-hosted, global regions"]
  LOC -->|"internal-facing"| PRIV`;

const rumDataModelDiagram = String.raw`flowchart TD
  SESSION["Session\n(up to 4h, or ends after 15min of inactivity)"]
  SESSION --> VIEW1["View: /product/42\n(initial page load)"]
  SESSION --> VIEW2["View: /checkout\n(SPA route change, no full reload)"]
  VIEW1 --> ACTION1["Actions\nclicks, custom actions"]
  VIEW1 --> RESOURCE1["Resources\nXHR, fetch, JS, CSS, images, fonts"]
  VIEW1 --> ERROR1["Errors\nJS exceptions, failed network calls"]
  VIEW1 --> LONGTASK1["Long Tasks\nmain thread blocked > 50ms"]
  VIEW2 --> ACTION2["Actions"]
  VIEW2 --> RESOURCE2["Resources"]
  VIEW2 --> ERROR2["Errors"]`;

const rumToApmSequence = String.raw`sequenceDiagram
  participant Browser as Browser (RUM SDK)
  participant API as checkout-web API (dd-trace)
  participant Pay as payments-service
  participant DD as Datadog Backend

  Browser->>Browser: User clicks "Place Order"\n(RUM captures an Action event)
  Browser->>API: fetch('/api/orders')\nSDK injects trace headers because the URL\nmatches allowedTracingUrls
  API->>API: dd-trace reads the propagated headers,\ncontinues the SAME trace_id
  API->>Pay: Downstream call (payments-service span)
  Pay-->>API: 200 OK
  API-->>Browser: 201 Created
  Browser->>DD: RUM Action + Resource event\n(tagged with trace_id)
  API->>DD: APM spans for checkout-web + payments-service\n(tagged with session_id, view_id)
  Note over DD: One trace_id links the frontend click\nto every backend span it triggered`;

const multistepBrowserJourney = String.raw`flowchart LR
  S1["Step 1\nLoad /login"] --> S2["Step 2\nType credentials, click Sign In"]
  S2 --> S3["Step 3\nAssert redirected to /dashboard"]
  S3 --> S4["Step 4\nClick 'Add to Cart'"]
  S4 --> S5["Step 5\nNavigate to /checkout"]
  S5 --> S6["Step 6\nAssert 'Order Confirmed' text is present"]
  S6 --> RESULT["Test PASSES only if every step's\nassertions pass, in a real browser,\nfrom the chosen locations/devices"]`;

export const toc: TocItem[] = [
  { id: "synthetic-vs-rum", title: "Two Ways to Know Your Frontend Is Broken", level: 2 },
  { id: "synthetic-monitoring", title: "Synthetic Monitoring: Proactive, Outside-In Checks", level: 2 },
  { id: "api-tests", title: "API Tests", level: 3 },
  { id: "multistep-api-tests", title: "Multistep API Tests", level: 3 },
  { id: "browser-tests", title: "Browser Tests", level: 3 },
  { id: "locations", title: "Public Locations vs Private Locations", level: 3 },
  { id: "synthetics-alerting-ci", title: "Alerting on Synthetics & Running Them in CI", level: 3 },
  { id: "rum", title: "Real User Monitoring: Passive, Real-Traffic Telemetry", level: 2 },
  { id: "rum-data-model", title: "The RUM Data Model", level: 3 },
  { id: "instrumenting-rum", title: "Instrumenting the Browser SDK", level: 3 },
  { id: "what-rum-measures", title: "What RUM Measures", level: 3 },
  { id: "session-replay", title: "Session Replay", level: 2 },
  { id: "error-tracking", title: "Error Tracking & Source Maps", level: 2 },
  { id: "rum-to-apm", title: "The Killer Feature: RUM → APM Trace Propagation", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function SyntheticsAndRum() {
  return (
    <div className="article-content">
      <p>
        Every other module in this academy assumes your telemetry starts on a server you
        control — the Agent runs there, dd-trace instruments the request, logs come from a
        process you own. Synthetics and RUM break that assumption on purpose. One runs{" "}
        <strong>outside</strong> your infrastructure entirely, poking at it like a hostile
        network would. The other runs <strong>inside someone else&apos;s browser</strong>,
        where you have zero control over the device, connection, or extensions installed. Both
        exist because the backend can be perfectly healthy — every APM span green, every log
        clean — while the actual product is broken for actual users. This module builds the
        mental model for when to reach for which, and how they connect into one thread that
        runs from a user&apos;s click all the way down through your backend spans.
      </p>

      <h2 id="synthetic-vs-rum">Two Ways to Know Your Frontend Is Broken</h2>
      <p>
        <strong>Synthetic Monitoring</strong> is proactive and controlled: you define a script
        (an API call, a chain of calls, or a scripted browser journey) and Datadog runs it on a
        schedule from chosen locations, whether or not a single real user is on your site. It
        answers &quot;is the critical path still working, right now, from Tokyo, on a clean
        connection?&quot; — even at 3am with zero traffic.
      </p>
      <p>
        <strong>RUM (Real User Monitoring)</strong> is passive and uncontrolled: a small SDK
        runs in every real visitor&apos;s browser and reports what actually happened — their
        actual device, actual network, actual click path. It answers &quot;what is the
        experience really like for the 2% of users on a throttled 3G connection in a region my
        synthetic locations don&apos;t cover?&quot;
      </p>
      <p>
        Neither replaces the other. Synthetics catch regressions <em>before</em> a single user
        is affected and work even during low-traffic windows; RUM tells you the truth about
        real-world conditions synthetic scripts can never fully simulate. Mature setups run
        both, deliberately overlapping on the paths that matter most (login, search, checkout).
      </p>

      <h2 id="synthetic-monitoring">Synthetic Monitoring: Proactive, Outside-In Checks</h2>
      <p>
        Synthetic tests are code-free (or code-light) scripts that Datadog executes from its own
        infrastructure on a schedule you define — every minute, every five minutes, whatever the
        criticality demands. There are three test shapes to choose between, and the decision
        tree below is the one to internalize.
      </p>

      <MermaidDiagram
        chart={syntheticDecisionDiagram}
        title="Choosing a Synthetic Test Type"
        caption="Start from what you're actually trying to prove — a single endpoint, a chained transaction, or a full UI journey — then decide where it needs to run from."
        minHeight={480}
      />

      <h3 id="api-tests">API Tests</h3>
      <p>
        An <strong>API test</strong> issues a single request and asserts on the result. Datadog
        supports several subtypes beyond plain HTTP: <strong>SSL</strong> (certificate validity
        and expiration), <strong>DNS</strong> (resolution correctness), <strong>TCP</strong>{" "}
        and <strong>UDP</strong> (raw connectivity), <strong>ICMP</strong> (ping-style
        reachability and packet loss), <strong>gRPC</strong>, and{" "}
        <strong>WebSocket</strong> (handshake and message exchange). Assertions run against the
        response — <code>statusCode</code>, <code>responseTime</code>, <code>header</code>,{" "}
        <code>body</code>, <code>certificate</code>, <code>tlsVersion</code> — and a test must
        define at least one assertion to be valid.
      </p>

      <CodeBlock
        code={`{
  "name": "Checkout API - health check",
  "type": "api",
  "subtype": "http",
  "config": {
    "request": {
      "method": "GET",
      "url": "https://api.example.com/checkout/health"
    },
    "assertions": [
      { "type": "statusCode", "operator": "is", "target": 200 },
      { "type": "responseTime", "operator": "lessThan", "target": 1000 },
      { "type": "body", "operator": "contains", "target": "\\"status\\":\\"ok\\"" }
    ]
  },
  "locations": ["aws:us-east-1", "aws:eu-west-1"],
  "options": {
    "tick_every": 60,
    "retry": { "count": 2, "interval": 300 }
  }
}`}
        lang="json"
        filename="checkout-health-api-test.json"
      />

      <h3 id="multistep-api-tests">Multistep API Tests</h3>
      <p>
        Real transactions are rarely one request. A <strong>multistep API test</strong> chains
        requests together — by default up to 10 steps — and lets a later step reference a value{" "}
        <strong>extracted</strong> from an earlier response (a JSON field via JSONPath, a
        header, a regex match). This is how you test something a single API test structurally
        cannot: authenticate in step 1, capture the returned token, then use that token to
        create an order in step 2 and assert the order was actually created.
      </p>

      <CodeBlock
        code={`{
  "name": "Checkout flow - authenticate then place order",
  "steps": [
    {
      "name": "Authenticate",
      "request": { "method": "POST", "url": "https://api.example.com/auth" },
      "extractedValues": {
        "AUTH_TOKEN": { "field": "token", "parser": { "type": "json_path" } }
      },
      "assertions": [{ "type": "statusCode", "operator": "is", "target": 200 }]
    },
    {
      "name": "Create order",
      "request": {
        "method": "POST",
        "url": "https://api.example.com/orders",
        "headers": { "Authorization": "Bearer {{ AUTH_TOKEN }}" }
      },
      "assertions": [{ "type": "statusCode", "operator": "is", "target": 201 }]
    }
  ]
}`}
        lang="json"
        filename="checkout-flow-multistep-test.json"
      />
      <p>
        Like single API tests, multistep tests can run from either managed or private locations
        — the chaining logic doesn&apos;t care where the requests originate from.
      </p>

      <h3 id="browser-tests">Browser Tests</h3>
      <p>
        A <strong>browser test</strong> drives a real, headless browser through a recorded
        sequence of user steps — click, type, hover, navigate, assert element text/visibility —
        built with Datadog&apos;s no-code recorder (you literally interact with your site once
        and it captures the steps). This is the only synthetic type that exercises actual
        rendered JavaScript, CSS, and third-party scripts, which makes it the right tool for
        multi-step user journeys like login → search → add to cart → checkout.
      </p>

      <MermaidDiagram
        chart={multistepBrowserJourney}
        title="A Browser Test Is a Chain of Steps, Each With Its Own Assertion"
        caption="Every step must pass for the run to pass — a browser test fails at the first broken step, which is exactly what you want: it tells you where the journey broke, not just that it broke."
        minHeight={260}
      />
      <p>
        Browser tests also run against a matrix of <strong>devices and viewports</strong>{" "}
        (desktop, mobile emulation, specific browser engines) and can run from multiple{" "}
        <strong>locations</strong> simultaneously — catching a checkout button that&apos;s
        clipped off-screen on a narrow viewport, or a CDN edge that&apos;s slow from one region
        only.
      </p>

      <h3 id="locations">Public Locations vs Private Locations</h3>
      <p>
        Where a test runs <em>from</em> matters as much as what it checks. Datadog&apos;s{" "}
        <strong>managed (public) locations</strong> are hosted by Datadog across many global
        regions — the default choice for anything public-facing, since it approximates where
        your real customers actually are.
      </p>
      <p>
        <strong>Private locations</strong> solve a different problem entirely: internal
        services, pre-production environments, and anything behind a VPN or firewall that public
        locations structurally cannot reach. A private location is a worker you run inside your
        own network (as a Docker container or via a Kubernetes Helm chart) that polls Datadog
        for tests to run and reports results back — the same one-directional, outbound-only
        traffic pattern the Datadog Agent uses. Nothing ever connects <em>into</em> your network
        from Datadog&apos;s side.
      </p>

      <ArticleTable
        caption="Match the test shape to what you're actually trying to prove — this is the single most common synthetics design mistake to avoid."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Test type</th>
              <th>What it validates</th>
              <th>Use it when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>API test</strong>
              </td>
              <td>A single request: status, latency, body/header content, cert validity</td>
              <td>Health-checking one endpoint, an SSL cert expiring, a DNS record breaking</td>
            </tr>
            <tr>
              <td>
                <strong>Multistep API test</strong>
              </td>
              <td>
                A chained transaction where later requests depend on earlier responses
              </td>
              <td>Auth → action flows, business transactions that span several API calls</td>
            </tr>
            <tr>
              <td>
                <strong>Browser test</strong>
              </td>
              <td>A full UI journey through real rendered JS/CSS in a real browser</td>
              <td>Login, search, checkout — anything where the UI itself can break</td>
            </tr>
            <tr>
              <td>
                <strong>ICMP / TCP test</strong>
              </td>
              <td>Raw network reachability and packet loss, independent of any application</td>
              <td>Confirming a host or port is reachable when a higher-level test is failing</td>
            </tr>
            <tr>
              <td>
                <strong>SSL / DNS test</strong>
              </td>
              <td>Certificate expiration/validity, or DNS resolution correctness</td>
              <td>Catching an expiring cert or a broken DNS record before customers do</td>
            </tr>
            <tr>
              <td>
                <strong>Private location</strong>
              </td>
              <td>Not a test type — a <em>run location</em> inside your own network</td>
              <td>The target is internal, pre-prod, or otherwise unreachable publicly</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="synthetics-alerting-ci">Alerting on Synthetics & Running Them in CI</h3>
      <p>
        A failing synthetic test becomes a Datadog monitor: you configure how many failing
        locations, over how many consecutive checks, should trigger an alert — this matters
        because a single location having a transient network blip is noise, but the same test
        failing from three regions simultaneously is a real incident.
      </p>
      <p>
        The other major use case is running synthetics as a <strong>release gate</strong> inside
        CI/CD, via the <code>datadog-ci</code> CLI. Instead of waiting for a scheduled run to
        catch a regression after deploy, you trigger the relevant tests on demand and block the
        pipeline if they fail — catching a broken checkout flow before it ever reaches
        production traffic.
      </p>

      <CodeBlock
        code={`datadog-ci synthetics run-tests \\
  --config datadog-ci.json \\
  --search "tag:release-gate tag:checkout"`}
        lang="bash"
        filename="run-release-gate.sh"
      />

      <CodeBlock
        code={`# .github/workflows/deploy.yml
jobs:
  release-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Datadog Synthetic release gate
        env:
          DATADOG_API_KEY: \${{ secrets.DATADOG_API_KEY }}
          DATADOG_APP_KEY: \${{ secrets.DATADOG_APP_KEY }}
        run: npx @datadog/datadog-ci synthetics run-tests --search "tag:release-gate"

  deploy:
    needs: release-gate
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh`}
        lang="yaml"
        filename="deploy.yml"
      />

      <h2 id="rum">Real User Monitoring: Passive, Real-Traffic Telemetry</h2>
      <p>
        Where synthetics run a script you wrote, RUM instruments the real thing: a lightweight
        SDK embedded in your production frontend that observes what actual users actually do,
        on their actual devices and networks, and streams that back as structured events.
      </p>

      <h3 id="rum-data-model">The RUM Data Model</h3>
      <p>
        Everything RUM collects is organized under one hierarchy. A <strong>Session</strong>{" "}
        (lasting up to 4 hours, or ending after 15 minutes of inactivity) contains one or more{" "}
        <strong>Views</strong> — a full page load, or a route change in a single-page app that
        never triggers a browser reload. Each View, in turn, is the parent of the four event
        types that make up the actual telemetry.
      </p>

      <MermaidDiagram
        chart={rumDataModelDiagram}
        title="The RUM Event Hierarchy"
        caption="Everything nests under a View, and every View nests under a Session — this is why you can filter the RUM Explorer by session, then drill into exactly which view, action, or error caused the problem."
        minHeight={420}
      />
      <ul>
        <li>
          <strong>Actions</strong> — user interactions: clicks (captured automatically when{" "}
          <code>trackUserInteractions</code> is enabled) or custom actions you fire manually.
        </li>
        <li>
          <strong>Resources</strong> — every network fetch the page makes: XHR, <code>fetch</code>
          , JS/CSS bundles, images, fonts — each with full timing.
        </li>
        <li>
          <strong>Errors</strong> — uncaught JS exceptions and failed network requests.
        </li>
        <li>
          <strong>Long Tasks</strong> — any task that blocks the main thread for more than 50ms,
          the classic cause of a page that feels &quot;janky&quot; even though nothing crashed.
        </li>
      </ul>

      <h3 id="instrumenting-rum">Instrumenting the Browser SDK</h3>
      <p>
        Installation is either an npm package (<code>@datadog/browser-rum</code>) initialized
        explicitly, or an async loader snippet pasted into your page&apos;s <code>&lt;head&gt;</code>{" "}
        that fetches the SDK from Datadog&apos;s CDN before your own bundle loads — important
        because it lets RUM capture errors and load timing from the very first millisecond,
        before your application code has even started executing.
      </p>

      <CodeBlock
        code={`import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: '<DATADOG_APPLICATION_ID>',
  clientToken: '<DATADOG_CLIENT_TOKEN>',
  site: 'datadoghq.com',
  service: 'checkout-web',
  env: 'production',
  version: '1.42.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});`}
        lang="typescript"
        filename="rum-init.ts"
      />
      <p>
        The CDN-based install method wraps the same <code>init()</code> call in an{" "}
        <code>onReady</code> callback so it runs only once the async loader has finished
        fetching the SDK:
      </p>
      <CodeBlock
        code={`<script>
  // Minified loader (copy-pasted from the RUM setup UI) assigns window.DD_RUM
  window.DD_RUM && window.DD_RUM.onReady(function () {
    window.DD_RUM.init({
      applicationId: '<DATADOG_APPLICATION_ID>',
      clientToken: '<DATADOG_CLIENT_TOKEN>',
      site: 'datadoghq.com',
      service: 'checkout-web',
      env: 'production',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'mask-user-input',
    });
  });
</script>`}
        lang="html"
        filename="index.html"
      />
      <p>
        <code>service</code>, <code>env</code>, and <code>version</code> aren&apos;t
        decoration — they&apos;re the same unified-tagging fields every other module in this
        academy relies on, and they are exactly what has to match the tags used when uploading
        source maps (covered below) and what lets you filter RUM alongside logs, traces, and
        infrastructure metrics using one consistent vocabulary.
      </p>

      <h3 id="what-rum-measures">What RUM Measures</h3>
      <p>
        Beyond raw events, RUM computes the metrics product and engineering teams actually care
        about: page load timing, SPA route-change timing, resource waterfall timing, and the
        three <strong>Core Web Vitals</strong> Google uses to score real-world UX —{" "}
        <strong>LCP</strong> (Largest Contentful Paint — how fast the main content appears),{" "}
        <strong>CLS</strong> (Cumulative Layout Shift — how much content jumps around while
        loading), and <strong>INP</strong> (Interaction to Next Paint — how responsive the page
        feels to input). INP officially replaced <strong>FID</strong> (First Input Delay) as
        the third Core Web Vital in March 2024 — FID only measured the delay before the{" "}
        <em>first</em> interaction was processed, while INP scores responsiveness across{" "}
        <em>every</em> interaction in the session, which is a much better proxy for how janky an
        app actually feels to use.
      </p>

      <ArticleTable
        caption="Core Web Vitals thresholds, per Google's field-data guidance that Datadog surfaces directly in the RUM Explorer."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Good</th>
              <th>Needs improvement</th>
              <th>Poor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LCP (loading)</td>
              <td>≤ 2.5s</td>
              <td>≤ 4.0s</td>
              <td>&gt; 4.0s</td>
            </tr>
            <tr>
              <td>CLS (visual stability)</td>
              <td>≤ 0.1</td>
              <td>≤ 0.25</td>
              <td>&gt; 0.25</td>
            </tr>
            <tr>
              <td>INP (responsiveness)</td>
              <td>≤ 200ms</td>
              <td>≤ 500ms</td>
              <td>&gt; 500ms</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        RUM also derives <strong>frustration signals</strong> automatically, no extra
        instrumentation required: a <strong>Rage Click</strong> (the same element clicked more
        than 3 times inside a 1-second window — a user hammering a button that isn&apos;t
        responding), a <strong>Dead Click</strong> (a click on a static element that produces no
        visible reaction), and an <strong>Error Click</strong> (a click immediately followed by
        a JS error). These three signals are often the fastest path to a UX bug — a rage-click
        spike on the &quot;Place Order&quot; button is a much stronger incident signal than a
        slow-but-technically-passing latency metric.
      </p>

      <h2 id="session-replay">Session Replay</h2>
      <p>
        Session Replay reconstructs a real user&apos;s session as a{" "}
        <strong>DOM-based recording</strong> (not a video capture) synced to the RUM timeline —
        you can watch exactly what a specific user saw and clicked leading up to an error, then
        jump straight to the RUM error event that explains it. This closes the loop that pure
        metrics can&apos;t: a Core Web Vitals dashboard tells you INP is bad on the checkout
        page; Session Replay shows you it&apos;s bad because a modal steals focus and blocks the
        submit button for two seconds.
      </p>
      <p>
        Because this is literally recording what real users see, privacy is a first-class,
        default-on concern. Datadog masks sensitive input by default and gives you a{" "}
        <code>defaultPrivacyLevel</code> for the whole session (<code>allow</code>,{" "}
        <code>mask</code>, or <code>mask-user-input</code>) plus a per-element HTML attribute to
        override it anywhere on the page:
      </p>

      <CodeBlock
        code={`<!-- Fully obfuscate this element's text content -->
<div data-dd-privacy="mask">
  <p>Account balance: $12,480.55</p>
</div>

<!-- Only mask what the user TYPES here; the placeholder is safe to show -->
<input type="text" data-dd-privacy="mask-user-input" placeholder="Search products" />

<!-- Explicitly allow — overrides a stricter session-wide default -->
<img src="/promo-banner.png" data-dd-privacy="allow" />`}
        lang="html"
        filename="privacy-attributes.html"
      />
      <p>
        Certain fields — anything with an <code>autocomplete</code> value tied to payment data,
        like credit card numbers, expiration dates, and CVV codes — are always masked regardless
        of your configuration. Masked data is never captured in original form by the SDK in the
        first place, so it never leaves the browser.
      </p>

      <h2 id="error-tracking">Error Tracking & Source Maps</h2>
      <p>
        Raw production JS errors are close to useless on their own: minified variable names,
        bundled file paths, and a stack trace pointing at line 1 of a 400KB bundle. RUM&apos;s{" "}
        <strong>Error Tracking</strong> solves the first half of the problem by{" "}
        <strong>grouping</strong> similar errors (same fingerprint, same stack shape) into a
        single <strong>Issue</strong>, tracked over time — new, regressed, or resolved — instead
        of drowning you in one row per occurrence.
      </p>
      <p>
        It solves the second half — the unreadable stack trace — by de-minifying it against
        source maps you upload as a build step, using <code>datadog-ci</code>. This is a CI/CD
        concern, not something the browser SDK does at runtime: the <code>--service</code> and{" "}
        <code>--release-version</code> flags must exactly match the <code>service</code> and{" "}
        <code>version</code> tags set on the RUM SDK&apos;s <code>init()</code> call, which is
        how Datadog matches an incoming error event back to the correct source map at read time.
      </p>

      <CodeBlock
        code={`datadog-ci sourcemaps upload ./dist \\
  --service checkout-web \\
  --release-version 1.42.0 \\
  --minified-path-prefix https://static.example.com/checkout-web/`}
        lang="bash"
        filename="upload-sourcemaps.sh"
      />
      <p>
        Forgetting this step — or letting <code>version</code> drift between your build pipeline
        and the running SDK — is the single most common Error Tracking failure mode: the errors
        arrive, group correctly, but every stack trace stays minified because the fingerprint
        exists yet no matching source map was ever uploaded for that exact version.
      </p>

      <h2 id="rum-to-apm">The Killer Feature: RUM → APM Trace Propagation</h2>
      <p>
        Everything above is powerful in isolation, but the feature that actually changes how
        incidents get debugged is connecting a frontend Action to the exact backend trace it
        triggered. Without it, a slow checkout button and a slow <code>payments-service</code>{" "}
        span are two disconnected facts an engineer has to manually correlate by squinting at
        timestamps. With it, they&apos;re the same investigation.
      </p>
      <p>
        The mechanism is <code>allowedTracingUrls</code> in the RUM init config: a list of URL
        matchers (string, RegExp, or function) telling the SDK which outgoing{" "}
        <code>fetch</code>/XHR calls should have trace propagation headers injected. The backend
        tracer (<code>dd-trace</code>) must separately be configured to read at least one of the
        propagation formats the SDK sends — Datadog&apos;s own format, or the W3C{" "}
        <code>tracecontext</code> standard, controlled via <code>propagatorTypes</code>.
      </p>

      <CodeBlock
        code={`datadogRum.init({
  applicationId: '<DATADOG_APPLICATION_ID>',
  clientToken: '<DATADOG_CLIENT_TOKEN>',
  site: 'datadoghq.com',
  service: 'checkout-web',
  env: 'production',
  allowedTracingUrls: [
    {
      match: 'https://api.example.com',
      propagatorTypes: ['datadog', 'tracecontext'],
    },
  ],
});`}
        lang="typescript"
        filename="rum-apm-connection.ts"
      />

      <MermaidDiagram
        chart={rumToApmSequence}
        title="One Click, One Trace ID, Through Every Layer"
        caption="allowedTracingUrls is what makes the browser inject trace headers on this specific call — without it, the fetch happens but no trace_id ever links the two sides."
        minHeight={460}
      />

      <p>
        The payoff shows up in both directions of the RUM Explorer: an APM trace is tagged with{" "}
        <code>session_id</code> and <code>view_id</code>, so a slow backend span can be traced
        back to the exact user session and page it happened on; and a RUM Action event carries
        the <code>trace_id</code>, so a slow click can be traced forward into the exact backend
        spans it caused.
      </p>

      <CodeBlock
        code={`RUM Action event         -> trace_id: 6699c1f2a4b8e701  session_id: 9d21...  view_id: a03f...
APM span (checkout-web)  -> trace_id: 6699c1f2a4b8e701  session.id: 9d21...  view.id: a03f...
APM span (payments-svc)  -> trace_id: 6699c1f2a4b8e701  (same trace, next hop downstream)

# One trace_id ties a real user's click to every backend span it triggered.`}
        lang="text"
        filename="correlated-trace-ids.txt"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Synthetic monitoring vs RUM — when do you use each?'"
        intro="A weak answer treats them as interchangeable frontend monitoring tools. A strong answer names the actual axis they differ on: controlled and proactive vs uncontrolled and passive."
        steps={[
          "Open with the core distinction: synthetics run a script YOU wrote, on a schedule, from locations you choose — it's proactive and works with zero real traffic. RUM observes REAL users on their real devices — it's passive and only exists once traffic exists.",
          "Name the failure mode each one catches that the other structurally can't: synthetics catch a regression before any customer is affected (deploy-time gate); RUM catches real-world conditions no synthetic script simulates — a specific carrier's network, an old Android device, a browser extension conflict.",
          "Give the concrete example: a synthetic browser test passes every 5 minutes from 6 clean regions while INP is terrible for the 15% of real users on a mid-range Android phone — synthetics were technically 'green' the whole time.",
          "Close with the practical recommendation: run synthetic API + browser tests on your top 2-3 critical paths as release gates and uptime checks; run RUM everywhere in production for the ground truth synthetics can't see.",
        ]}
      />

      <InterviewPlaybook
        title="How to answer: 'How would you monitor frontend performance and connect it to the backend?'"
        intro="This question is really testing whether you understand distributed tracing conceptually, not just whether you've heard of RUM."
        steps={[
          "Start with instrumentation: install the RUM browser SDK with consistent service/env/version tags — the same unified tagging every other Datadog product depends on.",
          "Name what RUM gives you on its own: Core Web Vitals (LCP, CLS, INP), JS errors grouped via Error Tracking, and frustration signals like rage clicks — real user experience data with zero backend involvement.",
          "Explain the connection mechanism explicitly: allowedTracingUrls tells the SDK which API calls to inject trace headers into; the backend tracer must be configured to read that propagation format (Datadog or W3C tracecontext) — both sides have to agree.",
          "State the payoff in one sentence an interviewer will remember: a single trace_id now links a real user's click to the exact backend spans it caused, so a slow button and a slow database query stop being two separate investigations.",
          "If asked for a gotcha, mention CORS: allowedTracingUrls adds a tracing header to a cross-origin request, so the backend's CORS policy must explicitly allow that header or the request fails outright — a classic first-rollout bug.",
        ]}
      />

      <h2 id="challenge">Challenge</h2>
      <InterviewChallenge
        title="Design Synthetic + RUM Coverage for an E-Commerce Checkout Flow"
        scenario={
          <>
            You own observability for <code>checkout-web</code> (a React SPA) and its backend,{" "}
            <code>checkout-api</code>. Checkout is the single highest-revenue path in the
            product. Leadership wants to know, in writing, exactly how you would use Datadog to
            (1) catch a checkout regression before it reaches customers, (2) know what real
            checkout performance and errors actually look like in production, and (3) be able to
            go from &quot;a customer reported checkout was slow&quot; to a specific backend
            span in under two minutes.
          </>
        }
        tasks={[
          "Design the synthetic coverage: which test type(s) would you build for checkout specifically, and would you run them from public locations, a private location, or both? Justify the choice.",
          "Design the RUM instrumentation: what would you set in datadogRum.init() for checkout-web, and which Core Web Vitals and frustration signals would you specifically watch on the checkout view?",
          "Explain how you'd wire Error Tracking so a production JS error on the payment form shows a readable stack trace instead of minified garbage — name the concrete CI step required.",
          "Describe exactly how you'd connect a slow 'Place Order' click to the specific backend span causing it, including the one config option that makes this possible and the CORS gotcha to watch for.",
        ]}
        pitfalls={[
          "Proposing RUM alone and skipping synthetics — misses the 'catch it before customers do' requirement entirely, since RUM only has data once real users hit the bug.",
          "Forgetting that source map upload is a CI/CD build step, not something the RUM SDK does at runtime — a common wrong answer is 'just enable Error Tracking.'",
          "Setting sessionReplaySampleRate to 100 without discussing privacy/cost tradeoffs, or ignoring that PCI-sensitive fields need explicit mask-user-input coverage on the payment form.",
        ]}
        signal="A strong candidate treats this as layered defense — synthetics as a pre-deploy gate, RUM as production ground truth, Error Tracking + source maps as the debugging bridge, and allowedTracingUrls as the thread that ties a user click to a backend root cause — and can name the exact config option or CLI flag for each layer, not just the product name."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Synthetic coverage — a multistep API test plus a browser test, both from
          public locations.</strong> A multistep API test authenticates, adds an item, and hits{" "}
          <code>POST /orders</code> on <code>checkout-api</code> directly — cheap, fast (runs
          every 1-5 minutes), and catches a broken backend contract immediately. A browser test
          separately drives the full UI journey (login → add to cart → checkout → confirmation)
          from 2-3 public locations covering major customer regions, on both desktop and mobile
          viewports — this is the only way to catch a UI-level regression (a checkout button
          rendered off-screen, a step that silently stops advancing) that the API test
          structurally cannot see. Both should be tagged and wired as a release gate via{" "}
          <code>datadog-ci synthetics run-tests</code> in CI, so a broken checkout blocks the
          deploy instead of reaching production. Private locations aren&apos;t needed here since
          checkout is public-facing — but the same browser test should also run against the
          pre-prod environment from a private location before it&apos;s promoted, if pre-prod
          isn&apos;t publicly reachable.
        </p>
        <p>
          <strong>2. RUM instrumentation on checkout-web.</strong> Initialize with{" "}
          <code>service: &apos;checkout-web&apos;</code>, matching <code>env</code> and{" "}
          <code>version</code>, <code>trackUserInteractions: true</code> (needed for frustration
          signals and click actions), and a deliberate{" "}
          <code>sessionReplaySampleRate</code> lower than <code>sessionSampleRate</code> (for
          example 100/20) since replay storage costs scale with volume and 100% isn&apos;t
          usually justified outside a high-value flow like this one — checkout is actually a
          reasonable case to consider raising it. On the checkout view specifically, watch{" "}
          <code>INP</code> (does the &quot;Place Order&quot; button feel responsive under load)
          and <code>CLS</code> (does a promo banner or payment-method loader shift the submit
          button right as the user is about to click it — a classic revenue-killing bug), plus{" "}
          <strong>rage clicks</strong> on the submit button specifically, which is often the
          single fastest signal that checkout is silently broken for a subset of users.
        </p>
        <p>
          <strong>3. Error Tracking with source maps as a mandatory CI step.</strong> Add a{" "}
          <code>datadog-ci sourcemaps upload</code> step to the deploy pipeline, right after the
          production build and before (or immediately after) the artifact is deployed:
        </p>
        <CodeBlock
          code={`datadog-ci sourcemaps upload ./dist \\
  --service checkout-web \\
  --release-version $CI_COMMIT_SHA \\
  --minified-path-prefix https://static.example.com/checkout-web/`}
          lang="bash"
          filename="ci-sourcemap-step.sh"
        />
        <p>
          The critical detail: <code>--service</code> and <code>--release-version</code> must
          exactly match the <code>service</code> and <code>version</code> passed to{" "}
          <code>datadogRum.init()</code> in that same deployed build — if the version tag drifts
          between the build pipeline and the running SDK (a very common CI misconfiguration),
          errors still arrive and group into Issues, but every stack trace stays minified
          because Datadog can&apos;t match the event to the right source map.
        </p>
        <p>
          <strong>4. Connecting a click to a backend span:</strong> set{" "}
          <code>allowedTracingUrls</code> in the RUM init to match{" "}
          <code>checkout-api</code>&apos;s domain, and confirm <code>dd-trace</code> on{" "}
          <code>checkout-api</code> is configured to accept the same propagator format (Datadog
          headers or W3C <code>tracecontext</code>). Once both sides agree, every &quot;Place
          Order&quot; click carries a <code>trace_id</code> that also tags the resulting APM
          spans on <code>checkout-api</code> and any downstream service it calls (like{" "}
          <code>payments-service</code>) — so &quot;checkout was slow&quot; becomes: open the
          RUM Action event, follow its trace_id straight into APM, and read off which exact span
          is slow. The CORS gotcha: adding a tracing header to a cross-origin request means{" "}
          <code>checkout-api</code>&apos;s CORS policy must explicitly allow that header in{" "}
          <code>Access-Control-Allow-Headers</code>, or the browser blocks the request outright
          the moment <code>allowedTracingUrls</code> is turned on — a very common first-rollout
          incident.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Synthetics are proactive and controlled; RUM is passive and real.</strong>{" "}
          Synthetics catch regressions before customers see them and work with zero live
          traffic; RUM tells you the ground truth about real devices, real networks, and real
          user behavior synthetic scripts can&apos;t fully simulate. Mature setups run both.
        </li>
        <li>
          <strong>Pick the synthetic test shape based on what you're proving</strong> — a single
          API test for one endpoint, a multistep API test for a chained transaction with
          extracted variables, a browser test for anything the UI itself can break — and use{" "}
          <strong>private locations</strong> the moment the target isn&apos;t publicly reachable.
        </li>
        <li>
          <strong>The RUM data model nests strictly: Session → View → Action/Resource/Error/Long
          Task.</strong> This hierarchy is why you can drill from a session down to the exact
          error or slow resource that ruined it.
        </li>
        <li>
          <strong>INP replaced FID as a Core Web Vital in March 2024</strong> because it scores
          responsiveness across every interaction in a session, not just the first one — treat
          FID as legacy in anything you build or discuss going forward.
        </li>
        <li>
          <strong>Source maps are a CI/CD step, not an SDK feature</strong> — run{" "}
          <code>datadog-ci sourcemaps upload</code> with a <code>--service</code>/
          <code>--release-version</code> that exactly matches the RUM SDK&apos;s init tags, or
          Error Tracking issues will group correctly but stay permanently minified.
        </li>
        <li>
          <strong><code>allowedTracingUrls</code> is the single config option that unifies
          frontend and backend observability</strong> — it's what makes a user's click and the
          backend spans it triggered share one <code>trace_id</code>, provided the backend
          tracer is configured to read the same propagation format and CORS allows the injected
          header.
        </li>
      </ul>
    </div>
  );
}
