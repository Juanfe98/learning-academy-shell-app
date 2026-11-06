import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const authBootstrapDiagram = String.raw`flowchart TD
  A["Page load — hulu-layout.tsx"] --> B["EnsureHuluAuthToken"]
  B --> C{"_hulu_at OR _hulu_session<br/>cookie present?"}
  C -->|yes| G["hasHuluAuthToken = true"]
  C -->|no| D["POST huluBaseUrl/api/v1/identity/generate_anonymous_token<br/>credentials: 'include'"]
  D --> E["Hulu Edge sets _hulu_at cookie"]
  E --> F["datadogRum.addAction('ANONYMOUS_HULU_AUTH_TOKEN_SET')"]
  F --> G
  G --> H["{hasHuluAuthToken && children}<br/>pages render, every Flex fetch<br/>rides the cookies automatically"]`;

const identityWorldsDiagram = String.raw`flowchart LR
  subgraph DPLUS["Disney+"]
    D1["Identity v5 SDK<br/>@disney-identity/sdk-web"]
    D2["BAM session tokens"]
  end
  subgraph ESPN["ESPN"]
    E1["OneID v4 script<br/>identitySDK: null"]
  end
  subgraph HULU["Hulu"]
    H1["IDM ('Edna') — Hulu's identity service<br/>github.prod.hulu.com/SiteSecurity/login-modal"]
    H2["_hulu_at / _hulu_session cookies"]
    H3["@solo/identity-hulu ('web-login-ui')<br/>UnifiedCreateAccount · WebLogin"]
  end
  H1 --- H2
  H1 --- H3`;

export const toc: TocItem[] = [
  { id: "three-brands-three-identities", title: "Three Brands, Three Identity Stacks", level: 2 },
  { id: "cookie-model", title: "The Cookie Model: _hulu_at & _hulu_session", level: 2 },
  { id: "anonymous-bootstrap", title: "The Anonymous-Token Bootstrap", level: 2 },
  { id: "identity-hulu-package", title: "The identity-hulu Package (IDM / Edna)", level: 2 },
  { id: "what-hulu-does-not-use", title: "What Hulu Does NOT Use", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The 401 That Isn't", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluIdentityAndAuth() {
  return (
    <div className="article-content">
      <p>
        Hulu&apos;s auth is the clearest example of the &quot;keep the
        Hulu-native system, adapt at the boundary&quot; strategy:{" "}
        <strong>no MyDisney, no OneID, no BAM SDK tokens</strong>. Instead,
        Hulu web commerce authenticates with Hulu&apos;s own cookies, issued by
        Hulu&apos;s own identity service (internally &quot;IDM&quot;, UI
        codename &quot;Edna&quot;), and every Flex call simply{" "}
        <em>rides the cookies</em> via <code>credentials:
        &apos;include&apos;</code>. Once you internalize that, a whole class of
        &quot;where is the token attached?&quot; confusion disappears — there
        is no token attachment code to find.
      </p>

      <h2 id="three-brands-three-identities">Three Brands, Three Identity Stacks</h2>
      <MermaidDiagram
        chart={identityWorldsDiagram}
        title="Identity Per Brand"
        caption="Each brand keeps its own identity client. Hulu's is entirely Hulu-native: IDM/Edna service, Hulu cookies, and the @solo/identity-hulu component library."
        minHeight={380}
      />
      <ArticleTable caption="Brand identity comparison — memorize the Hulu column.">
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Disney+</th>
              <th>ESPN</th>
              <th>Hulu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identity service</td>
              <td>MyDisney (Identity v5 SDK)</td>
              <td>OneID v4 script</td>
              <td>
                IDM (&quot;Edna&quot;) — Hulu&apos;s internal service{" "}
                <em>[ASSUMPTION: names from in-repo READMEs/comments only]</em>
              </td>
            </tr>
            <tr>
              <td>Session artifact</td>
              <td>BAM session tokens</td>
              <td>BAM session tokens</td>
              <td>
                <code>_hulu_at</code> / <code>_hulu_session</code> cookies
              </td>
            </tr>
            <tr>
              <td>Login/signup UI</td>
              <td><code>packages/identity-auth</code></td>
              <td>OneID-hosted</td>
              <td>
                <code>packages/identity-hulu</code> (&quot;web-login-ui&quot;)
              </td>
            </tr>
            <tr>
              <td>How Flex calls authenticate</td>
              <td>SDK/session wiring</td>
              <td>SDK/session wiring</td>
              <td>
                Browser cookies via <code>credentials: &apos;include&apos;</code>{" "}
                — zero token code in the client
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="cookie-model">The Cookie Model: _hulu_at &amp; _hulu_session</h2>
      <CodeBlock
        code={`// apps/commerce/hulu/src/identity/auth/use-ensure-hulu-auth-token.ts:8-46
export const HULU_AT_COOKIE = '_hulu_at';
export const HULU_SESSION_COOKIE = '_hulu_session';

export function useEnsureHuluAuthToken(huluBaseUrl: string) {
  const [isComplete, setIsComplete] = useState(false);
  useEffect(() => {
    const generateAnonymousTokenIfRequired = async () => {
      try {
        if (!getCookie(HULU_AT_COOKIE) && !getCookie(HULU_SESSION_COOKIE)) {
          await generateAnonymousToken(huluBaseUrl);
          datadogRum.addAction('ANONYMOUS_HULU_AUTH_TOKEN_SET', {
            owner: Owners.IDENTITY,
            huluAuthorizationToken: getCookie(HULU_AT_COOKIE),
          });
        }
      } catch (error) { /* ... */ } finally { setIsComplete(true); }
    };
    generateAnonymousTokenIfRequired();
  }, [huluBaseUrl]);
  return { isComplete };
}`}
        lang="typescript"
        filename="use-ensure-hulu-auth-token.ts"
      />
      <p>
        Two cookies, two roles: <code>_hulu_at</code> is the authorization
        token (including for anonymous users), <code>_hulu_session</code> is
        the logged-in session. The client checks for <em>either</em>; if
        neither exists it mints an anonymous token. Related trivia that becomes
        relevant in the Spearmint module: a third Hulu cookie,{" "}
        <code>_hulu_assignments</code>, carries experiment assignments — the
        cookie jar is Hulu&apos;s transport layer for more than auth.
      </p>

      <h2 id="anonymous-bootstrap">The Anonymous-Token Bootstrap</h2>
      <MermaidDiagram
        chart={authBootstrapDiagram}
        title="EnsureHuluAuthToken: Blocking Bootstrap"
        caption="No page content renders until a Hulu auth cookie exists. This guarantees every subsequent Flex fetch is authenticated — anonymously at minimum."
        minHeight={520}
      />
      <p>
        The doc comment on <code>generate-anonymous-token.ts</code> explains
        the &quot;why&quot;: <em>&quot;Generates an anonymous token required by
        Hulu Edge for upstream calls... acts as a fallback when a regular
        session token is not available.&quot;</em> Hulu Edge{" "}
        <strong>requires</strong> a token to proxy upstream — even for a
        logged-out user browsing plans. That is why{" "}
        <code>hulu-layout.tsx:140-150,220-222</code> hard-gates rendering:{" "}
        <code>{`{hasHuluAuthToken && children}`}</code>. If the bootstrap
        endpoint is down, the Hulu app renders nothing — a failure mode worth
        knowing on call.
      </p>
      <p>
        Downstream, the elegance: the Flex client
        (<code>data-interface-hulu/src/flex/flex-data-interface.ts:212,285</code>)
        just sets <code>credentials: &apos;include&apos;</code> on{" "}
        <code>fetch</code>. The browser attaches Hulu cookies to every screen
        and execution call automatically; Hulu Edge validates them and stamps
        identity/partner headers for Flex. The frontend never touches a bearer
        token.
      </p>

      <h2 id="identity-hulu-package">The identity-hulu Package (IDM / Edna)</h2>
      <p>
        Login and account-creation UI comes from{" "}
        <code>packages/identity-hulu</code> — self-described
        &quot;web-login-ui&quot;. Its README says the <code>WebLogin</code>{" "}
        component <em>&quot;mirrors IDM&apos;s contract for the Version Two
        LoginModal component&quot;</em> and links Hulu&apos;s internal repo{" "}
        <code>github.prod.hulu.com/SiteSecurity/login-modal</code>. The signup
        page wires it like this:
      </p>
      <CodeBlock
        code={`// apps/commerce/hulu/src/identity/sign-up/pages/sign-up-page.tsx:58-81
const createAccountConfig: UnifiedCreateAccountProps['config'] = {
  baseRoute: '/identity/sign-up',
  client: {
    partner: 'hulu',
    subpartner: 'web',
  },
  env: 'dev',
  onCreateAccountSuccess,          // routes to /commerce/account
  router: identityRouter,
  selectedPlan: { identifier: '', subscription: { promotion: { programId: 0 } } },
  updateUserEmail: () => {},
};
return <UnifiedCreateAccount config={createAccountConfig} />;`}
        lang="tsx"
        filename="sign-up-page.tsx"
      />
      <p>
        The file&apos;s own comment is explicit about scope:{" "}
        <em>&quot;This page will not be multi-tenant and is used specifically
        in the unified Hulu application. The page will be mostly powered by the
        Edna Create Account feature component from the{" "}
        <code>@solo/identity-hulu</code> package.&quot;</em> Note the
        identity-layer partner pair <code>{`{ partner: 'hulu', subpartner:
        'web' }`}</code> — a <em>different</em> partner vocabulary from the{" "}
        <code>x-bamtech-partner</code> header (this one goes to Hulu&apos;s IDM
        backend).{" "}
        <em>[ASSUMPTION: the exact position of /identity/sign-up inside the
        live SUF ordering is unverified — its success callback routes to
        /commerce/account, suggesting it also serves as a standalone entry.]</em>
      </p>

      <h2 id="what-hulu-does-not-use">What Hulu Does NOT Use</h2>
      <p>
        Negative knowledge is half this topic. Verified absences:
      </p>
      <ul>
        <li>
          <strong>No BAM SDK session.</strong> The Hulu app imports only the
          low-level <code>getCookie</code> util from{" "}
          <code>@solo/sdk-session</code>{" "}
          (<code>get-temporary-csrf-value.ts:4</code>,{" "}
          <code>p-edit-required.tsx:1</code>) — never the session object, never{" "}
          <code>getAccessToken()</code>, and <code>hulu-layout</code> never
          wires <code>isSDKEnabled</code>.
        </li>
        <li>
          <strong>No OneID, no MyDisney login</strong> for the Hulu commerce
          app&apos;s own flows.
        </li>
        <li>
          <strong>No manual auth header</strong> on Flex calls — cookies only.
        </li>
      </ul>
      <p>
        The knock-on effect matters beyond auth: because the BAM SDK never
        boots, everything that piggybacks on it — WeaponX/Mystique feature
        flags, SDK-driven experiment assignment — is inert for Hulu. Auth
        architecture and experimentation architecture are causally linked here;
        the Spearmint module picks up that thread.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How does authentication work on Hulu's commerce pages?"`}
        intro={
          <>
            The strong answer is a chain: cookie model → blocking bootstrap →
            credentials-include → Edge validation — plus what is deliberately
            absent.
          </>
        }
        steps={[
          "Lead with the model: Hulu-native cookies (_hulu_at authorization, _hulu_session logged-in), issued by Hulu's IDM ('Edna') service — no MyDisney, no OneID, no BAM tokens.",
          "Describe the bootstrap: EnsureHuluAuthToken in the layout checks for either cookie and mints an anonymous token via /api/v1/identity/generate_anonymous_token if missing — and blocks all rendering until done, because Hulu Edge requires a token even for anonymous upstream calls.",
          "Explain transport: every Flex fetch sets credentials:'include'; the browser attaches the cookies; Edge validates and stamps identity + x-bamtech-partner headers. Zero token-handling code in the client.",
          "Name the UI layer: @solo/identity-hulu ('web-login-ui') mirrors IDM's LoginModal v2 contract; sign-up renders UnifiedCreateAccount with client {partner:'hulu', subpartner:'web'}.",
          "Close with the architectural knock-on: no BAM SDK session means no Mystique/WeaponX for Hulu — auth choice silently determined the experimentation stack.",
        ]}
      />

      <h2 id="challenge">Challenge: The 401 That Isn&apos;t</h2>
      <InterviewChallenge
        title="Blank page at local.huluqa.com"
        scenario={
          <>
            A teammate runs the Hulu app locally, opens{" "}
            <code>http://localhost:5030/commerce/plans</code> directly (skipping
            the proxy &quot;because it&apos;s faster&quot;), and gets a blank
            page — no error banner, nothing. Meanwhile in staging, a monitoring
            alert shows a spike of{" "}
            <code>ANONYMOUS_HULU_AUTH_TOKEN_SET</code> RUM actions.
          </>
        }
        tasks={[
          "Explain the most likely cause of the local blank page, referencing the layout's gating logic.",
          "Explain why visiting through https://local.huluqa.com:5003 fixes it.",
          "Interpret the staging RUM spike: is it an incident? What user population does it represent?",
          "Describe what would happen to the entire Hulu app if the generate_anonymous_token endpoint went down, and where you would see it first.",
        ]}
        pitfalls={[
          "Hunting for a JS error — the page is intentionally not rendering behind the auth gate.",
          "Forgetting cookies are domain-scoped: localhost is not a *.huluqa.com domain, so Hulu cookies neither exist nor get set correctly.",
          "Reading ANONYMOUS_HULU_AUTH_TOKEN_SET as an error — it is a normal action for first-visit anonymous users.",
          "Missing that the blast radius of a bootstrap outage is 100% of pages, not just login.",
        ]}
        signal="A strong answer connects the blank page to {hasHuluAuthToken && children} and reasons about cookie domain scoping without prompting."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Blank page:</strong> <code>hulu-layout.tsx</code> renders{" "}
          <code>{`{hasHuluAuthToken && children}`}</code>. On bare{" "}
          <code>localhost:5030</code>, the app is not on a huluqa.com domain:
          the anonymous-token call to Hulu Edge either fails CORS/cookie-wise
          or sets a cookie the page cannot read. <code>hasHuluAuthToken</code>{" "}
          stays false → children never mount → blank page by design.
        </p>
        <p>
          <strong>Why the proxy fixes it:</strong>{" "}
          <code>https://local.huluqa.com:5003</code> puts the app on a
          huluqa.com subdomain over TLS, so Hulu Edge&apos;s cookies are
          settable/readable and <code>credentials: &apos;include&apos;</code>{" "}
          works — that is the entire reason the SSL proxy exists in the dev
          script.
        </p>
        <p>
          <strong>RUM spike:</strong> not inherently an incident —{" "}
          <code>ANONYMOUS_HULU_AUTH_TOKEN_SET</code> fires for first-visit /
          cookie-less users. A spike means more fresh anonymous traffic
          (campaign launch?) or cookies being dropped (which <em>would</em> be
          an incident — correlate with login rates and errors).
        </p>
        <p>
          <strong>Bootstrap outage:</strong> every page of the Hulu commerce
          app blanks for new/anonymous visitors (existing cookie holders
          survive). First signal: Datadog RUM errors from the bootstrap catch
          block plus a cliff in page renders — before any backend alert fires,
          because Flex is never even called.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Hulu auth = Hulu-native cookies (<code>_hulu_at</code>,{" "}
          <code>_hulu_session</code>) from IDM (&quot;Edna&quot;); no MyDisney/
          OneID/BAM tokens anywhere in the Hulu commerce app.
        </li>
        <li>
          <code>EnsureHuluAuthToken</code> blocks all rendering until a cookie
          exists, minting an anonymous token if needed — Hulu Edge requires a
          token even for anonymous calls.
        </li>
        <li>
          Flex calls authenticate by <code>credentials:
          &apos;include&apos;</code> — the browser does the work; there is no
          token-attachment code to debug.
        </li>
        <li>
          Login/signup UI = <code>@solo/identity-hulu</code>{" "}
          (&quot;web-login-ui&quot;), mirroring IDM&apos;s LoginModal v2
          contract; identity partner pair is{" "}
          <code>{`{partner:'hulu', subpartner:'web'}`}</code>.
        </li>
        <li>
          The BAM SDK never boots for Hulu — which is precisely why
          WeaponX/Mystique is inert and Spearmint carries Hulu
          experimentation.
        </li>
        <li>
          Local dev must go through <code>local.huluqa.com:5003</code> for
          cookie domain scoping to work.
        </li>
      </ul>
    </div>
  );
}
