import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestSequence = String.raw`sequenceDiagram
  participant F as flex :3200
  participant P as qa-proxy :4300
  participant G as staging GLO
  F->>P: PUT /v3/switch/preview<br/>(headers incl. x-qa-profile)
  P->>P: readBody + resolveProfileName
  alt profile route matches
    P->>P: route.handle({ req, body, passthrough })
    opt handler wants live data
      P->>G: passthrough()
      G-->>P: real response
      P->>P: patch the JSON
    end
    P-->>F: overridden response [name:override]
  else no profile / no route match
    P->>G: passthrough (verbatim)
    G-->>P: real response
    opt RECORD=1
      P->>P: save body under recordings/
    end
    P-->>F: real response [passthrough]
  end`;

const resolutionDiagram = String.raw`flowchart TD
  REQ["incoming request"] --> H{"x-qa-profile<br/>header present?"}
  H -->|yes| USE1["use that profile"]
  H -->|no| ACC{"x-bamtech-account-id<br/>starts with qa-profile- ?"}
  ACC -->|yes| USE2["use the suffix<br/>as profile name"]
  ACC -->|no| ENV{"QA_PROFILE env<br/>default set?"}
  ENV -->|yes| USE3["use the default"]
  ENV -->|no| PASS["plain passthrough"]
  USE1 --> MATCH{"does the profile have a<br/>route matching pathname+method?"}
  USE2 --> MATCH
  USE3 --> MATCH
  MATCH -->|yes| OVR["override"]
  MATCH -->|no| PASS
  style OVR fill:#7c2d12,color:#fff
  style PASS fill:#113ccf,color:#fff`;

export const toc: TocItem[] = [
  { id: "anatomy", title: "Anatomy: One File, Four Jobs", level: 2 },
  { id: "activation", title: "Profile Activation: Per-Request, Opt-In", level: 2 },
  { id: "contract", title: "The Profile Contract", level: 2 },
  { id: "canned", title: "Pattern 1: Canned Responses", level: 2 },
  { id: "recording", title: "Record Mode: Harvesting Real Shapes", level: 2 },
  { id: "mutation", title: "Pattern 2: Live Mutation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ProxyProfilesAndRecording() {
  return (
    <div className="article-content">
      <p>
        Module one gave you the why and the wiring; this one opens the hood. The entire proxy is a
        single dependency-free file (<code>src/proxy/server.mjs</code>, ~140 lines) plus a folder of
        profiles. By the end you will be able to read the whole thing, write a new profile from
        scratch, and choose correctly between its two response patterns — canned and live-mutated.
      </p>

      <h2 id="anatomy">Anatomy: One File, Four Jobs</h2>
      <p>
        <code>server.mjs</code> does exactly four things: load profiles, resolve which profile a
        request wants, forward to upstream, and optionally record. Here is the heart of it — the
        request handler:
      </p>
      <CodeBlock
        code={`createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];
  const body = await readBody(req);
  const profileName = resolveProfileName(req);
  const profile = profileName ? profiles.get(profileName) : null;

  let action = 'passthrough';
  let result;
  const route = profile?.routes.find((r) => r.match(pathname, req.method));
  if (route) {
    action = \`\${profile.name}:override\`;
    result = await route.handle({ req, body, passthrough: () => passthrough(req, body) });
  } else {
    result = await passthrough(req, body);
    if (RECORD) await record(req, result);
  }

  res.writeHead(result.status, result.headers);
  res.end(result.body);
  console.log(\`[flex-qa-proxy] \${req.method} \${pathname} → \${result.status} [\${action}]\`);
}).listen(PORT);`}
        lang="javascript"
        filename="src/proxy/server.mjs (request handler, abridged)"
      />
      <p>
        Two details are load-bearing. First, the <code>passthrough</code> given to a route handler
        is a <em>closure over the current request</em> — a handler can fetch the real upstream
        response for exactly this request and decide what to do with it. Second, recording only
        happens on the passthrough branch: <strong>overridden routes are never recorded</strong>,
        which is also a handy diagnostic (if your recording of an endpoint stops refreshing, your
        override is firing).
      </p>
      <MermaidDiagram
        chart={requestSequence}
        title="One Request Through the Proxy"
        caption="The override branch may still consult the live upstream via the passthrough closure — that is what enables the mutation pattern."
        minHeight={420}
      />
      <p>
        The passthrough itself is a plain <code>fetch</code> with two hygiene rules: drop{" "}
        <code>host</code>/<code>content-length</code> on the way out (they must describe the new
        hop), and drop <code>content-encoding</code>/<code>transfer-encoding</code> on the way back
        (fetch already decompressed the body; forwarding those headers would corrupt the reply).
      </p>

      <h2 id="activation">Profile Activation: Per-Request, Opt-In</h2>
      <p>
        The proxy is always running, but profiles only act when asked. Resolution is a three-step
        fallback, decided per request:
      </p>
      <CodeBlock
        code={`function resolveProfileName(req) {
  const explicit = req.headers['x-qa-profile'];
  if (explicit) return String(explicit);
  const accountId = req.headers['x-bamtech-account-id'];
  if (accountId && String(accountId).startsWith('qa-profile-')) {
    return String(accountId).slice('qa-profile-'.length);
  }
  return DEFAULT_PROFILE; // QA_PROFILE env, usually null
}`}
        lang="javascript"
        filename="src/proxy/server.mjs (resolveProfileName)"
      />
      <p>
        The reason both header conventions work: flex forwards inbound{" "}
        <code>x-bamtech-*</code> headers (and unknown extras) to its GLO calls, so a header you set
        on your Bruno request travels through flex and arrives at the proxy. The{" "}
        <code>x-qa-profile</code> form is preferred when you are testing a <em>real</em> account —
        you keep the genuine <code>x-bamtech-account-id</code> (auth and agreements stay real) and
        activate the profile with the separate header. The <code>qa-profile-&lt;name&gt;</code>{" "}
        account-id form is for fully synthetic scenarios where no real account is involved.
      </p>
      <MermaidDiagram
        chart={resolutionDiagram}
        title="Profile Resolution Order"
        caption="Both the profile name AND a route match are required — a profile that does not match the pathname/method still passes through."
        minHeight={420}
      />

      <h2 id="contract">The Profile Contract</h2>
      <p>
        A profile is an <code>.mjs</code> module in <code>profiles/</code>, auto-loaded at proxy
        startup (restart the proxy after adding one). The contract is two fields:
      </p>
      <CodeBlock
        code={`export default {
  name: 'my-profile',          // what x-qa-profile must equal
  routes: [
    {
      // pure predicate over pathname + method
      match: (pathname, method) => method === 'GET' && pathname === '/v1/agreements',
      // returns { status, headers, body: Buffer }
      handle: async ({ req, body, passthrough }) => ({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from(JSON.stringify(data)),
      }),
    },
  ],
};`}
        lang="javascript"
        filename="profiles/&lt;name&gt;.mjs (the shape)"
      />
      <ArticleTable caption="The two response patterns and when each is right." minWidth={760}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>How</th>
              <th>Use when</th>
              <th>Trade-off</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Canned</td>
              <td>Return a prepared JSON file</td>
              <td>The WHOLE response must be synthetic (state reality cannot approximate, e.g. churned account)</td>
              <td>Dates/prices freeze; must satisfy the GLO client&apos;s response validator yourself</td>
            </tr>
            <tr>
              <td>Live mutation</td>
              <td><code>await passthrough()</code>, patch fields, re-serialize</td>
              <td>Reality is 95% right and you need to change a few fields (add a label, a price)</td>
              <td>Needs upstream reachable; patch must handle payload variance</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="canned">Pattern 1: Canned Responses</h2>
      <p>
        The founding profile, <code>churned</code>, forces the reacquisition screen&apos;s
        lapsed/restart cell. It overrides exactly one route and returns a JSON file from disk:
      </p>
      <CodeBlock
        code={`const data = JSON.parse(
  await readFile(join(dirname(fileURLToPath(import.meta.url)), 'data', 'churned-agreements.json'), 'utf8')
);

export default {
  name: 'churned',
  routes: [
    {
      match: (pathname, method) => method === 'GET' && pathname === '/v1/agreements',
      handle: async () => ({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from(JSON.stringify(data)),
      }),
    },
  ],
};`}
        lang="javascript"
        filename="profiles/churned.mjs (abridged)"
      />
      <p>
        The crucial craft detail is where <code>churned-agreements.json</code> came from: it was{" "}
        <strong>generated with the flex repo&apos;s own test factories</strong> (
        <code>buildAgreementDetailsResponse</code> + an EXPIRED agreement + a CHURNED subscription)
        — the same shapes the unit tests use. That guarantees the canned body passes the GLO
        client&apos;s response validator; hand-written JSON tends to die there with confusing
        errors.
      </p>

      <h2 id="recording">Record Mode: Harvesting Real Shapes</h2>
      <p>
        Before you can convincingly fake a response you need to know what a real one looks like.
        That is record mode:
      </p>
      <CodeBlock
        code={`npm run proxy:record   # RECORD=1 — every passthrough body saved

# recordings/ after one ledger request:
GET_v1_agreements.json
POST_v2_offers.json
PUT_v3_switch_preview.json      # ← the raw material for a preview profile
POST_v1_commerce_experiences.json`}
        lang="bash"
        filename="record mode"
      />
      <p>
        Files are named <code>METHOD_path_with_underscores.json</code> and overwritten on each
        passthrough — so the newest recording is always the current real shape for your exact
        request. The workflow that falls out of this is the standard profile-authoring loop:
      </p>
      <ol>
        <li>Run the flow once with the proxy in record mode and NO profile → collect real bodies.</li>
        <li>Open the recording, find the node your feature needs changed.</li>
        <li>Write a profile that produces that change (mutation if small, canned if wholesale).</li>
        <li>Restart the proxy (profiles load at startup), re-run with the activation header.</li>
        <li>Confirm the log line flips from <code>[passthrough]</code> to <code>[name:override]</code>.</li>
      </ol>
      <p>
        Recordings double as documentation: on GCIEX-18128 the recorded agreements response is what
        proved (in one glance) that overrider-created subscriptions carry{" "}
        <code>paymentMethod: null</code> while checkout-purchased ones carry a full card object —
        a diagnosis that had resisted three rounds of guessing.
      </p>

      <h2 id="mutation">Pattern 2: Live Mutation</h2>
      <p>
        The stronger pattern — and the one the next module dissects on a real ticket — fetches the
        real upstream response <em>for this very request</em> and patches only what the feature
        needs. Everything time-sensitive (proration, dates, payment data) stays live, so the mock
        never goes stale:
      </p>
      <CodeBlock
        code={`export default {
  name: 'my-mutating-profile',
  routes: [
    {
      match: (pathname, method) => method === 'PUT' && pathname === '/v3/switch/preview',
      handle: async ({ passthrough }) => {
        const upstream = await passthrough();               // 1. real response
        const body = JSON.parse(upstream.body.toString('utf8'));

        patchTheNodesYourFeatureNeeds(body);                 // 2. surgical edit

        return {                                             // 3. re-serialize
          status: upstream.status,
          headers: { ...upstream.headers },
          body: Buffer.from(JSON.stringify(body)),
        };
      },
    },
  ],
};`}
        lang="javascript"
        filename="the live-mutation skeleton"
      />
      <p>
        Note the re-serialize step returns the upstream status and headers unchanged —
        the passthrough already stripped the encoding headers, and Node recomputes{" "}
        <code>content-length</code>, so the patched body of a different size is safe.
      </p>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The whole proxy is one readable file: load profiles → resolve name per request → match a
          route → override or passthrough(+record).
        </li>
        <li>
          Activation is <strong>two keys</strong>: the profile name (via <code>x-qa-profile</code>{" "}
          or the <code>qa-profile-</code> account-id convention) AND a route match. Either missing
          → passthrough.
        </li>
        <li>
          A profile is just <code>name</code> + <code>routes[]</code> of{" "}
          <code>match/handle</code>; <code>handle</code> receives a <code>passthrough</code>{" "}
          closure over the current request.
        </li>
        <li>
          <strong>Canned</strong> bodies must come from the repo&apos;s factories so they pass GLO
          response validation; <strong>live mutation</strong> is preferred when reality is almost
          right.
        </li>
        <li>
          Record mode harvests real shapes (<code>recordings/METHOD_path.json</code>) — the raw
          material for every new profile, and a diagnostic archive for free.
        </li>
        <li>
          Overridden routes are never recorded, and profiles load at startup — restart the proxy
          after adding one.
        </li>
      </ul>
    </div>
  );
}
