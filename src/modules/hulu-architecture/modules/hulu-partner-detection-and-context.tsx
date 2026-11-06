import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const headerFlowDiagram = String.raw`sequenceDiagram
  participant B as Browser (apps/commerce/hulu)
  participant E as Hulu / BAMTech Edge
  participant F as Flex (growth-life-client-api)
  participant G as GLO
  B->>E: GET /screens/v1/hulu/account-home<br/>cookies: _hulu_at, _hulu_session
  Note over E: Edge resolves the session and STAMPS<br/>x-bamtech-partner: hulu<br/>(the client never sets it)
  E->>F: request + x-bamtech-partner: hulu<br/>+ x-hulu-device-capabilities<br/>+ x-disney-identity-hulu-legacy-device-id
  Note over F: flexContextRouteHandler parses headers<br/>into flexContext.standardHeaders
  F->>G: forward with brand: HULU (uppercased)
  G-->>F: offers / agreements
  F-->>B: screen JSON (Hulu-branched)`;

const partnerTypeDiagram = String.raw`flowchart TD
  A["FlexAgreementSourcePartner<br/>(domain/models/flexAgreementDetails)"] -->|"Exclude 'launchpad'"| B["Partner =<br/>'disney' | 'hulu' | 'espn' | 'star' | 'unknown'"]
  B -->|"Exclude 'unknown'"| C["KnownPartners"]
  B --> D["PARTNERS lookup map<br/>types.ts:150-156"]
  B --> E["isPartnerHulu / isPartnerDisney / isPartnerESPN<br/>domain/common/util.ts:201-223"]
  E --> F["~140 isPartnerHulu call sites<br/>screens · executions · metrics · platform assemblies"]`;

export const toc: TocItem[] = [
  { id: "the-one-header", title: "The One Header That Decides Everything", level: 2 },
  { id: "partner-type", title: "The Partner Type & Its Helpers", level: 2 },
  { id: "hulu-only-headers", title: "Hulu-Only Headers", level: 2 },
  { id: "downstream-forwarding", title: "Forwarding Partner Downstream", level: 2 },
  { id: "fallback-traps", title: "Fallback Traps: unknown → disney", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Wrong-Brand Screen", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluPartnerDetectionAndContext() {
  return (
    <div className="article-content">
      <p>
        Every piece of Hulu-specific behavior in Flex — every branch, every
        analytics gate, every legal-copy variant — hangs off a single header:{" "}
        <code>x-bamtech-partner</code>. This module traces that header from the
        Edge that stamps it, through <code>FlexContext</code>, into the helper
        functions the whole codebase uses, and out the other side to GLO. If
        you understand this module, you can predict where Hulu logic lives
        before you grep for it.
      </p>

      <h2 id="the-one-header">The One Header That Decides Everything</h2>
      <MermaidDiagram
        chart={headerFlowDiagram}
        title="Partner Header Lifecycle"
        caption="The client never sets x-bamtech-partner. Edge stamps it from the session; Flex trusts it; GLO receives it re-labelled as brand: HULU."
        minHeight={460}
      />
      <p>
        Three facts anchor everything:
      </p>
      <ul>
        <li>
          The header key lives in the <code>StandardHeaderKeys</code> enum:{" "}
          <code>partner = &apos;x-bamtech-partner&apos;</code>{" "}
          (<code>src/middlewares/models/StandardHeaders.ts:81</code>), parsed
          into <code>standardHeaders.partner?: Partner</code>{" "}
          (<code>StandardHeaders.ts:33</code>).
        </li>
        <li>
          There is <strong>no brand-detection middleware</strong> — no
          host-name mapping, no client-id lookup. Flex trusts the Edge-supplied
          header directly; <code>flexContextRouteHandler</code> simply parses
          request headers into <code>FlexContext.standardHeaders</code>.
        </li>
        <li>
          The same header string is separately defined as{" "}
          <code>DEVICE_PARTNER_HEADER_KEY</code> in{" "}
          <code>src/lib/constants.ts:41</code> for <em>outbound</em> use — when
          Flex re-sends partner identity to GLO and Identity backends.
        </li>
      </ul>

      <h2 id="partner-type">The Partner Type &amp; Its Helpers</h2>
      <MermaidDiagram
        chart={partnerTypeDiagram}
        title="From Source Enum to 140 Call Sites"
        caption="Partner is a derived union type, not a TS enum — derived from the agreement-source partner enum with 'launchpad' stripped out."
        minHeight={420}
      />
      <CodeBlock
        code={`// src/domain/screen/common/types.ts:46-50
export type Partner =
  | Exclude<FlexAgreementSourcePartner, 'launchpad'>
  | 'unknown';

export type KnownPartners = Exclude<Partner, 'unknown'>;

// src/domain/screen/common/types.ts:150-156
export const PARTNERS: Readonly<Record<Partner, Partner>> = {
  disney: 'disney',
  hulu: 'hulu',
  espn: 'espn',
  star: 'star',
  unknown: 'unknown',
};`}
        lang="typescript"
        filename="src/domain/screen/common/types.ts"
      />
      <p>
        The canonical detection API — memorize the import, you will type it
        weekly:
      </p>
      <CodeBlock
        code={`import { isPartnerHulu, isPartnerDisney } from '!domain/common/util';

// src/domain/common/util.ts:205
export function isPartnerHulu(flexContext: FlexContext): boolean {
  return flexContext.standardHeaders.partner === 'hulu';
}`}
        lang="typescript"
        filename="src/domain/common/util.ts"
      />
      <p>
        <code>isPartnerHulu</code> alone has <strong>~140 call sites</strong>{" "}
        across <code>domain/screen/**</code>, <code>domain/execution/**</code>,{" "}
        <code>domain/metricsData/**</code>, and — crucially — the entire{" "}
        <code>src/platform/presentation/screen/assemblies/**</code> migration
        layer. There is also a raw-header variant for code paths where{" "}
        <code>FlexContext</code> is not yet built:{" "}
        <code>isPartnerHuluStandardHeaders(standardHeaders)</code>{" "}
        (<code>src/domain/common/offers/offerConversion.ts:144</code>), used
        deep inside the offers conversion pipeline.
      </p>

      <h2 id="hulu-only-headers">Hulu-Only Headers</h2>
      <p>
        Beyond the partner header, Hulu traffic carries two headers no other
        brand sends:
      </p>
      <ArticleTable caption="Hulu-specific headers. Both are legacy-bridge artifacts: one for device capabilities, one for pre-unification device identity.">
        <table>
          <thead>
            <tr>
              <th>Header</th>
              <th>Defined at</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>x-hulu-device-capabilities</code></td>
              <td>
                <code>StandardHeaders.ts:141-164</code> (enum{" "}
                <code>HuluHeaderKeys</code>), OpenAPI{" "}
                <code>src/openapi/components/parameters/hulu-headers.yaml</code>
              </td>
              <td>
                Device-capabilities string sent by the Hulu tenant only
              </td>
            </tr>
            <tr>
              <td><code>x-disney-identity-hulu-legacy-device-id</code></td>
              <td>
                <code>StandardHeaders.ts:58</code>, constant{" "}
                <code>GLO_LEGACY_DEVICE_ID_HEADER_KEY</code> in{" "}
                <code>src/lib/constants.ts</code>
              </td>
              <td>
                Legacy Hulu device id for subscriber migration — the constants
                file itself says &quot;To be deprecated when there is shared
                device context between brands&quot;
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The legacy device id is not decorative — IPSE swaps its device-id
        header entirely when the partner is Hulu:
      </p>
      <CodeBlock
        code={`// src/backends/ipse/IPSEClient.ts:442-450
const deviceIdHeaderKey =
  flexContext.standardHeaders.partner === 'hulu'
    ? GLO_LEGACY_DEVICE_ID_HEADER_KEY
    : GLO_DEVICE_ID_HEADER_KEY;
const deviceId =
  flexContext.standardHeaders.partner === 'hulu'
    ? flexContext.standardHeaders.disneyIdentityHuluLegacyDeviceId
    : flexContext.standardHeaders.deviceId;`}
        lang="typescript"
        filename="src/backends/ipse/IPSEClient.ts"
      />

      <h2 id="downstream-forwarding">Forwarding Partner Downstream</h2>
      <p>
        Flex re-labels the partner for each backend&apos;s dialect. GLO wants a{" "}
        <code>brand</code> header, uppercased:
      </p>
      <CodeBlock
        code={`// src/backends/growthLifeOrchestrator/GrowthLifeOrchestratorClient.ts:2848-2861
const headers = {
  ...standardHeaders.edgeHeadersRaw,
  [GLO_BRAND_HEADER_KEY]: standardHeaders.partner!.toUpperCase(),   // 'HULU'
  [GLO_DEVICE_APP_RUNTIME_HEADER_KEY]: standardHeaders.deviceAppRuntime!,
  // ...
  [GLO_LEGACY_DEVICE_ID_HEADER_KEY]: standardHeaders.disneyIdentityHuluLegacyDeviceId!,
};`}
        lang="typescript"
        filename="GrowthLifeOrchestratorClient.ts (retrieveOffersV2)"
      />
      <p>
        This <code>partner!.toUpperCase()</code> pattern repeats ~35 times
        across the GLO client (agreementDetails, switch, cancel, invoices,
        payment methods, gift cards...). A lowercase variant exists on ~8 call
        sites with the comment{" "}
        <em>&quot;Braavos specifically requires this lowercase&quot;</em>{" "}
        (<code>GrowthLifeOrchestratorClient.ts:4621,4666,4710</code>) — a
        perfect example of per-backend dialect. There is also{" "}
        <code>GLO_TENANTS_HEADER_KEY = &apos;x-tenants&apos;</code>{" "}
        (comma-separated uppercase tenants, e.g.{" "}
        <code>&apos;HULU,ESPN&apos;</code>) for cross-tenant queries, and
        Hulu-only request shaping like the BBD Live-TV zipcode passthrough
        (<code>:1698-1701</code>: only when{" "}
        <code>standardHeaders.partner === &apos;hulu&apos;</code> does{" "}
        <code>defaultZipcodeFromIpAddress</code> get forwarded).
      </p>

      <h2 id="fallback-traps">Fallback Traps: unknown → disney</h2>
      <p>
        The most dangerous line in this whole topic is a quiet default:
      </p>
      <CodeBlock
        code={`// src/domain/screen/account/accountDetails/accountDetailsService.ts:4071-4073
export const setValidPartner = (partner?: Partner): KnownPartners => {
  return partner && partner !== 'unknown' ? partner : 'disney';
};`}
        lang="typescript"
        filename="accountDetailsService.ts"
      />
      <p>
        Missing or <code>unknown</code> partner silently becomes{" "}
        <strong>disney</strong>. The same philosophy exists in the
        partner-keyed template merge (<code>getScreenDataWithPartner</code>{" "}
        falls back to the <code>unknown</code> key of the config, and configs
        typically make <code>default</code> Disney-shaped). The failure mode:
        a test or a curl without the partner header produces a{" "}
        <em>plausible Disney screen</em>, not an error — and a Hulu bug
        &quot;disappears&quot; because you were never on the Hulu branch.
        Whenever a Hulu behavior does not reproduce, your first check is the
        request&apos;s <code>x-bamtech-partner</code> header, not the code.
      </p>
      <p>
        Note the region layer has <strong>no partner dimension at all</strong>:{" "}
        <code>RegionConfiguration</code> is a pure country lookup from{" "}
        <code>x-bamtech-location-country-code</code>, and no code combines{" "}
        <code>isPartnerHulu()</code> with a country gate to reject requests.{" "}
        <em>[ASSUMPTION: Hulu&apos;s US-only footprint is enforced upstream
        (Edge / GLO offer availability), not in this repo — verified only as an
        absence in Flex.]</em>
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How does the backend know a request is Hulu?"`}
        intro={
          <>
            The weak answer says &quot;a header.&quot; The strong answer covers
            trust boundaries, the type system, and the failure default.
          </>
        }
        steps={[
          "Start at the trust boundary: the client never declares its brand — Edge stamps x-bamtech-partner from the session before Flex sees the request, and Flex trusts it with no detection middleware.",
          "Name the type: Partner is a derived union ('disney'|'hulu'|'espn'|'star'|'unknown'), consumed via isPartnerHulu(flexContext) — one helper, ~140 call sites.",
          "Follow it downstream: Flex re-labels per backend dialect — brand: HULU uppercased for GLO, lowercase for Braavos, x-tenants for cross-tenant queries.",
          "Name the Hulu-only extras: x-hulu-device-capabilities, and the legacy device-id header that IPSE swaps in for Hulu.",
          "Close with the trap: missing/unknown partner silently defaults to Disney (setValidPartner), so a header-less repro gives you a convincing wrong-brand screen instead of an error.",
        ]}
      />

      <h2 id="challenge">Challenge: The Wrong-Brand Screen</h2>
      <InterviewChallenge
        title="The Hulu bug that will not reproduce"
        scenario={
          <>
            QA reports that Hulu&apos;s Account Details screen shows a
            Disney-style &quot;Manage MyDisney&quot; CTA. You curl the local
            Flex server: <code>curl
            http://localhost:3200/screens/v1/account/details -H
            &quot;x-bamtech-account-id: abc&quot;</code> — and you get a
            perfectly normal Disney screen with the same CTA. You conclude the
            bug is real and start editing the CTA builder.
          </>
        }
        tasks={[
          "Explain why your local repro proves nothing about the reported bug.",
          "Write the corrected curl (headers included) that actually exercises the Hulu branch.",
          "Name two places in code where a missing partner header degrades to Disney behavior, and describe the user-visible consequence of each.",
          "Propose a habit or tooling change that prevents this class of false repro for your whole team.",
        ]}
        pitfalls={[
          "Editing the shared CTA builder before confirming which partner branch produced the screen.",
          "Forgetting that Edge stamps the header in production, so local curls must stamp it manually.",
          "Assuming an error would occur for a missing partner — the system is fail-soft to Disney by design.",
          "Fixing the Hulu branch but never re-testing the Disney branch you may have altered.",
        ]}
        signal="A strong answer identifies the silent-Disney-fallback immediately and treats header completeness as step zero of any Flex repro."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Why the repro is invalid:</strong> without{" "}
          <code>x-bamtech-partner: hulu</code>,{" "}
          <code>standardHeaders.partner</code> is undefined;{" "}
          <code>isPartnerHulu()</code> is false and{" "}
          <code>setValidPartner()</code> resolves to <code>&apos;disney&apos;</code>.
          You reproduced the Disney screen, which legitimately shows the
          MyDisney CTA. The reported Hulu behavior was never exercised.
        </p>
        <CodeBlock
          code={`curl 'http://localhost:3200/screens/v1/account/details' \\
  -H 'x-bamtech-partner: hulu' \\
  -H 'x-bamtech-account-id: abc' \\
  -H 'x-bamtech-location-country-code: US' \\
  -H 'x-request-id: local-test-1'`}
          lang="bash"
          filename="corrected repro"
        />
        <p>
          <strong>Two degradation points:</strong> (1){" "}
          <code>setValidPartner</code> in{" "}
          <code>accountDetailsService.ts:4071</code> — MyServices/CTA copy
          resolves against the Disney partner key; (2) the partner-keyed data
          merge in <code>getScreenDataWithPartner</code>{" "}
          (<code>configuration.ts:235-262</code>) — the screen merges{" "}
          <code>screenConfig[&apos;unknown&apos;]</code> (usually empty) over{" "}
          <code>default</code>, so all Hulu config overlays silently vanish.
        </p>
        <p>
          <strong>Prevention:</strong> keep a shared curl/Bruno collection
          where every request template already includes the partner, country,
          and account headers; in tests, always build context via{" "}
          <code>createMockFlexContext</code>/<code>DEFAULT_MOCK_FLEX_CONTEXT</code>{" "}
          with the partner set explicitly per case.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>x-bamtech-partner</code> is Edge-stamped, client-untouchable,
          and the single source of Hulu-ness in Flex — parsed into{" "}
          <code>flexContext.standardHeaders.partner</code> with no detection
          middleware.
        </li>
        <li>
          <code>Partner</code> = derived union{" "}
          <code>&apos;disney&apos;|&apos;hulu&apos;|&apos;espn&apos;|&apos;star&apos;|&apos;unknown&apos;</code>;
          detection goes through <code>isPartnerHulu()</code> (~140 call
          sites) or <code>isPartnerHuluStandardHeaders()</code> pre-context.
        </li>
        <li>
          Hulu-only headers: <code>x-hulu-device-capabilities</code> and the
          legacy device id that IPSE substitutes for Hulu traffic.
        </li>
        <li>
          Downstream, partner is re-labelled per dialect: <code>brand:
          HULU</code> (uppercase) for GLO, lowercase for Braavos,{" "}
          <code>x-tenants</code> for cross-tenant.
        </li>
        <li>
          Missing/unknown partner fails <em>soft</em> to Disney
          (<code>setValidPartner</code>, config merges) — header completeness
          is step zero of every Hulu repro.
        </li>
        <li>
          No partner dimension exists in region config; Hulu&apos;s US-only
          nature is enforced upstream (ASSUMPTION — verified as an absence in
          Flex).
        </li>
      </ul>
    </div>
  );
}
