import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestSequence = String.raw`sequenceDiagram
  autonumber
  participant U as Browser
  participant M as middleware.page.ts
  participant G as getServerSideProps
  participant S as Sparrow
  participant C as Cannonball or Spaceball
  participant P as plans-pricing-api
  U->>M: GET /soccer
  M->>G: rewrite plus headers language, region, pathname
  G->>S: getConfigs for scope ESPN_NEXUS
  S-->>G: paths, featureConfig, countries
  G->>G: read enableSpaceball flag
  G->>C: getPageData page and getPageData redirects in parallel
  C-->>G: pathResult carrying pageData
  G->>G: cannonballDataProcessor normalises the type field
  G->>P: replaceOfferTokensInSnapshot
  P-->>G: snapshot with formatted prices
  G-->>U: buildStitchDocument then server rendered HTML`;

const backendSelection = String.raw`flowchart TD
  A["getPageData - one entry point per lookup"] --> G{"config present for chosen backend"}
  G -->|"no"| E["return path_check_failed and log"]
  G -->|"yes"| B{"enableSpaceball"}
  B -->|"false"| C["checkPathInCannonball<br/>fetchPageData true"]
  B -->|"true"| D["checkPathInSpaceball<br/>queryKey pageQuery"]
  C --> R["pathResult.pageData"]
  D --> R
  R --> P["cannonballDataProcessor<br/>_contentType becomes _type"]
  P --> O["PathValidationSuccess<br/>identical shape from both branches"]
  O --> Z["getCMSContent, offer tokens, buildStitchDocument<br/>none of them know which backend ran"]`;

const twoBackends = String.raw`flowchart LR
  subgraph CN["Cannonball - two hops of CDN JSON"]
    C1["GET manifest for org, space, environment"] --> C2["look up route key in manifest.routes"]
    C2 --> C3["read per-locale resource URL"] --> C4["GET that snapshot JSON"]
  end
  subgraph SB["Spaceball - one GraphQL POST"]
    S1["POST /graphql operation Page"] --> S2["locales, page full true, wildcard<br/>in one response body"]
  end
  C4 --> N["pageData"]
  S2 --> N
  N --> Z["one shape, one downstream pipeline"]`;

const failureModes = String.raw`flowchart TD
  subgraph HARD["Fail hard - throw so Next serves /500"]
    F1["missing Sparrow env var"] --> H["throw new Error"]
    F2["CMS path check failed"] --> H
    F3["offer token replacement errored"] --> H
  end
  subgraph SOFT["Fail soft - log and keep rendering"]
    F5["zod pageModel.parse rejects a node"] --> S1["log eventName stitchWarn, continue"]
    F6["snapshot fetch threw in checkPathInCannonball"] --> S2["pageData null, getCMSContent returns notFound"]
    F7["global offer-token instance unconfigured"] --> S3["placeholders render literally"]
  end
  H --> R1["Page Not Available - zero content"]
  S1 --> R2["page renders with one component silently missing"]`;

export const toc: TocItem[] = [
  { id: "one-page-many-pages", title: "One Page, 29 Pages of Content", level: 2 },
  { id: "request-to-render", title: "Request to Render: The Whole Path", level: 2 },
  { id: "cannonball", title: "Cannonball: Manifest, Then Snapshot", level: 2 },
  { id: "why-a-manifest", title: "Why a Manifest Exists at All", level: 3 },
  { id: "spaceball", title: "Spaceball: One GraphQL Round Trip", level: 2 },
  { id: "migration-seam", title: "The Migration Seam: One Ternary", level: 2 },
  { id: "shape-preservation-price", title: "The Price of Shape Preservation", level: 3 },
  { id: "feature-flags", title: "Two Flags, Two Blast Radii", level: 2 },
  { id: "offer-tokens", title: "Offer Tokens: Where Prices Come From", level: 2 },
  { id: "fail-soft-fail-hard", title: "Fail-Soft vs Fail-Hard", level: 2 },
  { id: "local-testing", title: "Mocking This Layer Locally", level: 2 },
  { id: "gotchas", title: "Gotchas and Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function NexusDataFetchingCannonballSpaceball() {
  return (
    <div className="article-content">
      <p>The ESPN marketing app has <strong>one content route</strong> — <code>src/pages/[[...path]].page.tsx</code>, seven lines long — and it serves every sport, bundle, legal and B2B page on <code>plus.espn.com</code>. Nothing about <code>/soccer</code> or <code>/nflbundle</code> exists in the repository. All of it is CMS content, resolved per path, per region, per language, at request time. This module covers that resolution layer, and how the team is swapping the content backend underneath it without rewriting the app.</p>

      <h2 id="one-page-many-pages">One Page, 29 Pages of Content</h2>
      <p>The manifest fixture <code>apps/marketing-unified/espn/src/mocks/apis/cnbl-lps-manifest.json</code> is a snapshot of production route keys and lists <strong>29 routes</strong> — <code>homepage</code>, <code>soccer</code>, <code>mlbtv</code>, <code>changeplans</code>, <code>bundle</code>, <code>foxone</code>, three <code>restricted/*</code> test pages, and more. Each publishes its own locale set: <code>homepage</code> has <code>en-US</code> and <code>es-US</code>, <code>soccer</code> has four, most sport pages have only <code>en-US</code>.</p>
      <p>So the request-time question is never just &quot;what page is this?&quot; It is <em>four</em> questions at once: does this path exist, is it published in this locale, should it redirect instead, and what is the content body. Every design decision in this layer falls out of answering those four cheaply. Memorise one mapping now: the CMS slug for the homepage is <code>homepage</code>, not <code>/</code>. The forward mapping is in <code>get-server-side-props.ts</code>; the reverse — blocking public access to <code>/homepage</code> — is a 308 in <code>src/middleware.page.ts</code>.</p>

      <h2 id="request-to-render">Request to Render: The Whole Path</h2>
      <p>Before drilling into either backend, hold the whole request in your head. Middleware resolves locale and geo into <em>headers</em>; Sparrow (remote config) supplies CMS hostnames and feature flags; only then does anything talk to a CMS.</p>
      <MermaidDiagram
        chart={requestSequence}
        title="ESPN Nexus Request Lifecycle: Edge to HTML"
        caption="The CMS call happens in the middle, not the beginning — config and locale resolve first, and the page and redirect lookups fire in parallel."
        minHeight={550}
      />
      <p>The parallel pair matters: <code>getServerSideProps</code> fires <code>getPageData</code> <strong>twice</strong> inside one <code>Promise.all</code> — once against the <code>landingPages</code> CMS instance for content, once against the <code>redirects</code> instance for a possible vanity redirect. A vanity redirect wins and short-circuits everything after it.</p>

      <h2 id="cannonball">Cannonball: Manifest, Then Snapshot</h2>
      <p><strong>Cannonball</strong> is the legacy delivery mechanism, and it is not an API — it is <strong>static JSON on a CDN</strong> (<code>cnbl-cdn.bamgrid.com</code>). That single fact explains its shape. With no query language, content ships as pre-published blobs called <strong>snapshots</strong>, one per route per locale, and a <strong>manifest</strong> is the index telling you which blob to fetch.</p>
      <CodeBlock
        code={`{
  "data": {
    "_type": "manifest",
    "_version": 2,
    "routes": {
      "homepage": {
        "type": "Snapshot",
        "resources": {
          "en-US": "//cnbl-cdn.bamgrid.com/snapshots/<contentHash>.json",
          "es-US": "//cnbl-cdn.bamgrid.com/snapshots/<contentHash>.json"
        }
      },
      "soccer": { "type": "Snapshot", "resources": { "en-US": "//cnbl-cdn…json" } }
    }
  }
}`}
        lang="json"
        filename="cnbl-lps-manifest.json"
      />
      <p>Read it as a two-level lookup: <code>routes[routeKey].resources[locale]</code> yields a content-addressed snapshot URL. Two hops, both cacheable, no server-side query engine anywhere.</p>
      <MermaidDiagram
        chart={twoBackends}
        title="Two Hops vs One POST"
        caption="Both funnels converge on the same pageData object — that convergence is what makes the migration survivable."
        minHeight={400}
      />

      <h3 id="why-a-manifest">Why a Manifest Exists at All</h3>
      <p>The docblock on <code>fetchManifest</code> in <code>packages/marketing/growth-cms-api/src/cannonball/cannonball-utils.ts</code> answers this directly: <em>&quot;There are instances where we need to know what paths/locale actually exists before we actually attempt to load that path/locale.&quot;</em> On a CDN of content-addressed blobs you cannot ask whether <code>/soccer</code> exists in <code>es-US</code> — a miss is just a 404 on an unguessable URL. The manifest is the <strong>existence and locale index</strong> that makes three things possible without fetching any content:</p>
      <ul>
        <li><strong>Path validation</strong> — <code>isPathValid = preferredPath !== null</code>, so an unknown route becomes a clean Next.js <code>notFound</code> instead of a fetch failure.</li>
        <li><strong>Locale availability</strong> — <code>getAvailablePublishedLocales</code> reads the <code>resources</code> keys, which is how a request for an unpublished locale becomes a redirect rather than a blank page.</li>
        <li><strong>Redirect detection</strong> — the <code>redirects</code> CMS space has its own manifest, so &quot;is this a vanity redirect?&quot; is the same index lookup, run in parallel with content.</li>
      </ul>
      <p><code>checkPathInCannonball</code> also accepts an already-fetched <code>manifest</code> so a caller doing several lookups pays for the index once (ESPN does not use that today). The call ESPN <em>does</em> make sets <code>fetchPageData: true</code>, collapsing &quot;check the path&quot; and &quot;fetch the snapshot&quot; into one function call. That flag is not a convenience — it is the change that made the migration seam possible, because it lets the Cannonball branch return <code>pageData</code> directly, exactly like Spaceball.</p>

      <h2 id="spaceball">Spaceball: One GraphQL Round Trip</h2>
      <p><strong>Spaceball</strong> (<code>spaceball.global.twdcgrid.net/graphql</code>) replaces both hops with one POST. Because GraphQL can answer several questions in one document, the shared <code>pageQuery</code> does the manifest&apos;s job and the snapshot&apos;s job simultaneously:</p>
      <CodeBlock
        code={`query Page($route: String!, $locale: String!, $homepageRoute: String,
           $skipInMarketCheck: Boolean!, $includeWildcard: Boolean!, $wildcardRoute: String) {
  inMarketLocales: page(where: { route: $homepageRoute })
    @skip(if: $skipInMarketCheck) { _localeCode }

  locales: page(where: { route: $route }) { _id _localeCode }

  page(where: { route: $route }, locale: $locale, full: true) { _id _contentType }

  wildcard: page(where: { route: $wildcardRoute }, locale: $locale, full: true)
    @include(if: $includeWildcard) { _id _contentType }

  wildcardLocales: page(where: { route: $wildcardRoute })
    @include(if: $includeWildcard) { _id _localeCode }
}`}
        lang="graphql"
        filename="pageQuery.graphql"
      />
      <p>It lives as a <code>gql</code> tagged template in <code>packages/marketing/growth-cms-api/src/shared/graphql/queries/shared/page.ts</code>. Four jobs, one round trip: <code>locales</code> is the existence index (so <code>isPathValid = response.locales.length &gt; 0</code>), <code>page(... full: true)</code> is the content body, <code>inMarketLocales</code> answers the in-market question, and <code>wildcard</code> is a conditional fallback route. Two details worth carrying: Spaceball returns <strong>arrays</strong> and the loader takes <code>response.page[0]</code>; and query sets resolve <strong>per tenant and space</strong> — <code>getQuery</code> looks up ESPN&apos;s three registered modules (<code>EspnplusLandingpages</code>, <code>EspnplusRedirects</code>, <code>EspnplusGlobal</code>) in <code>shared/graphql/queries.ts</code>. Queries and fragments are checked-in code, not strings typed at a call site.</p>
      <ArticleTable caption="Cannonball vs Spaceball — the differences that change how you debug." minWidth={900}>
        <table>
          <thead>
            <tr><th>Dimension</th><th>Cannonball</th><th>Spaceball</th></tr>
          </thead>
          <tbody>
            <tr><td>Transport</td><td>2 × HTTP GET of static JSON on a CDN</td><td>1 × GraphQL POST</td></tr>
            <tr><td>Path validation</td><td>route key present in <code>manifest.routes</code></td><td><code>locales</code> array non-empty</td></tr>
            <tr><td>Content type field</td><td><code>_type</code></td><td><code>_contentType</code></td></tr>
            <tr><td>Result type</td><td><code>CannonballPathCheckResult</code> (has <code>manifest</code>)</td><td>same fields <em>minus</em> <code>manifest</code></td></tr>
            <tr><td>Missing content</td><td>fetch error swallowed → <code>pageData = null</code></td><td>empty <code>page</code> array → wildcard, else <code>null</code></td></tr>
            <tr><td>MSW mock style</td><td><code>mockGet(fixture)</code> per JSON file</td><td><code>graphql.link(...).query(&apos;Page&apos;, ...)</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="migration-seam">The Migration Seam: One Ternary</h2>
      <p>Here is the architectural centre of this module. Two completely different content backends — different protocol, response shape and failure modes — are isolated behind <strong>one ternary in one function</strong>: <code>src/views/landing-page/get-server-side-props/get-page-data.ts</code>.</p>
      <CodeBlock
        code={`const pathCheckResult = enableSpaceball
  ? await checkPathInSpaceball({
      route: pathname, locale, homepageRoute,
      config: spaceballConfig!, queryKey,
    })
  : await checkPathInCannonball({
      route: pathname, locale, homepageRoute,
      config: cannonballConfig!, previewId,
      fetchPageData: true,
    });

if (pathCheckResult.isErr()) {
  if (enableSpaceball) span?.setTag('spaceball_path_check', 'error');
  return { success: false, error: 'path_check_failed' };
}`}
        lang="typescript"
        filename="get-page-data.ts"
      />
      <MermaidDiagram
        chart={backendSelection}
        title="Backend Selection and Shape Convergence"
        caption="The only backend-aware code sits inside this one function; everything after cannonballDataProcessor is backend-agnostic."
        minHeight={550}
      />
      <p>The seam works because the two result types were <strong>designed to be interchangeable</strong> — deliberate symmetry, not luck:</p>
      <CodeBlock
        code={`export interface CannonballPathCheckResult {
  source: 'cannonball';
  isPathValid: boolean;
  availableLocales: string[];
  pageData: CannonballPageData | null;
  manifest: CannonballManifest;   // <- the ONLY extra field
  marketLocales: string[];
  isWildcard: boolean;
}

// SpaceballPathCheckResult is the same interface minus \`manifest\`, with
// source: 'spaceball' and pageData: SpaceballPageData | null. getPageData
// narrows both into one union that nothing downstream ever widens again:
export interface PathValidationSuccess {
  success: true;
  pathResult: SpaceballPathCheckResult | CannonballPathCheckResult;
  isPathValid: boolean;
}`}
        lang="typescript"
        filename="path-check-results.ts"
      />
      <p>The next consumer flattens even that union away. <code>getCMSContent</code> (<code>get-cms-content.ts</code>) takes either result and returns one <code>CMSPayload</code> — or a Next.js <code>notFound</code> when <code>isPathValid</code> is false or <code>pageData</code> is null, or a locale <code>redirect</code> when the requested locale is unpublished. Its docblock states the intent out loud: <em>&quot;In both cases this function maps the result to the same CMSPayload shape so the rest of the GSSP pipeline is unchanged.&quot;</em></p>
      <p>The transferable lesson: <strong>when you migrate a backend, spend your design budget on the boundary, not the implementations.</strong> One function owns the choice, both branches return the same shape, and the ~450 lines of orchestration after it never learn a migration is in progress. You get instant rollback (flip a flag), per-request A/B (a query param), and a diff that touches one file instead of thirty.</p>

      <h3 id="shape-preservation-price">The Price of Shape Preservation</h3>
      <p>Shape preservation is never free. Cannonball emits <code>_type</code> on every content node; Spaceball emits <code>_contentType</code>. Every Stitch model, builder and registry lookup keys on <code>_type</code>. Rather than teach Stitch two field names, <code>getPageData</code> runs a <strong>normalisation shim over the entire payload, in both modes</strong>:</p>
      <CodeBlock
        code={`// get-page-data.ts
// Running the cannonball data processor even without processessors. This is done
// to ensure that _type exists on all component objects.
if (pathResult.pageData) {
  pathResult.pageData = await cannonballDataProcessor({
    cannonballContentData: pathResult.pageData,
    locale,
    processors: {},           // <- intentionally empty
    injectableData: { spaceballConfig: spaceballConfig ?? null },
  });
}

// cannonball-data-processor.ts, inside traverse()
// Spaceball doesn't use _type but _contentType.
// To avoid mass changes we initialize _type should it not exist.
if (!node?._type && node?._contentType) {
  node._type = node._contentType;
}`}
        lang="typescript"
        filename="cannonball-data-processor.ts"
      />
      <p>Read what that costs. <code>processors: {"{}"}</code> means the processor has no work to do — it is invoked purely for a side effect inside its recursive <code>traverse</code>. Every SSR request therefore performs a <strong>full depth-first walk and in-place mutation of the whole CMS payload</strong>, including on the Cannonball path where the field is already correct. The typo in the source comment (<code>processessors</code>) is a fair tell that this is a pragmatic shim, not a designed pipeline stage. That is the honest trade: a per-request tree walk in exchange for zero changes across dozens of Stitch models. Right call while the migration is live, and the first thing to delete once Cannonball is gone — so name it in review as a <em>temporary adapter with a deletion trigger</em>, not as architecture.</p>

      <h2 id="feature-flags">Two Flags, Two Blast Radii</h2>
      <p>There are <strong>two independent Spaceball flags</strong>, they gate different things, and confusing them is one of the most common ways to misread a bug report. Both come from Sparrow and are read through <code>getFeatureFlagWithQueryOverride</code>.</p>
      <CodeBlock
        code={`// get-server-side-props.ts — page content + redirects
const enableSpaceball = getFeatureFlagWithQueryOverride(
  config.featureConfig, 'enableSpaceball', query,
);

// get-server-side-props.ts — offer tokens ONLY
const enableSpaceballMlp = getFeatureFlagWithQueryOverride(
  config.featureConfig, 'enableSpaceballMlp', query,
);

const offerTokenCmsConfig = getCannonballInstanceConfig({
  config: config.paths[enableSpaceballMlp ? 'spaceball' : 'cannonball'],
  instance: 'global',
  previewQSP: 'preview-offer-tokens',
});`}
        lang="typescript"
        filename="get-server-side-props.ts"
      />
      <ArticleTable caption="Flag matrix — fixture values come from src/mocks/apis/sparrow-espn-nexus-config.ts, not production." minWidth={880}>
        <table>
          <thead>
            <tr><th>Flag</th><th>What it gates</th><th>Fixture</th><th>Query override</th></tr>
          </thead>
          <tbody>
            <tr><td><code>enableSpaceball</code></td><td>page content lookup <em>and</em> the vanity-redirect lookup (both <code>getPageData</code> calls)</td><td><code>false</code></td><td><code>?enable-spaceball=true</code></td></tr>
            <tr><td><code>enableSpaceballMlp</code></td><td>offer-token source only — which backend the <code>global</code> instance reads prices from</td><td><code>false</code></td><td><code>?enable-spaceball-mlp=true</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>Read the override mechanism rather than assuming it. Camel-case flag names convert to kebab-case query params automatically (<code>enableSpaceball</code> → <code>enable-spaceball</code>), only the exact strings <code>&apos;true&apos;</code> and <code>&apos;false&apos;</code> count, and — critically — <strong>the override is ignored in production</strong> unless <code>isDebugToolingEnabled()</code> or <code>isPlaywright()</code> returns true. So <code>?enable-spaceball=true</code> is a real testing tool locally, on stage and in Playwright, and a no-op on prod. The <code>-sp</code> specs (<code>playwright/tests/pages/olp-sp.spec.ts</code>, <code>mlp-sp.spec.ts</code>) exist precisely to run the same assertions against the Spaceball branch.</p>
      <p><strong>Open question, stated honestly:</strong> the repo only proves the <em>fixture</em> values (<code>false</code> / <code>false</code>). Live values live in Sparrow (scope <code>ESPN_NEXUS</code>, config <code>legacy-config</code>, <code>prod</code> variant) and must be read there. There is also no per-route allowlist anywhere in the code, so the migration looks all-or-nothing per request — whether Sparrow variants stage it by traffic slice is not answerable from this repository.</p>

      <h2 id="offer-tokens">Offer Tokens: Where Prices Come From</h2>
      <p>Marketing pages show prices, and the marketing app <strong>never calls a plans or commerce API at render time</strong>. CMS authors write placeholder tokens such as <code>{"{{espn_unlimited_monthly.price}}"}</code>; <code>@solo/plans-pricing-api</code> substitutes formatted prices server-side before props are built. That keeps pricing out of the CMS publish cycle and out of the client bundle.</p>
      <CodeBlock
        code={`{
  "_type": "offer_token_global_parent",
  "_id": "espnOfferTokenGlobalParent1",
  "offer_tokens": [
    {
      "_type": "offer_token",
      "token_name": "espn_unlimited_monthly",
      "package_id": "espn_unlimited",
      "fallback_frequency": "MONTHLY",
      "fallback_retail_price": "29.99",
      "fallback_price": "29.99",
      "fallback_currency": "USD"
    }
  ],
  "custom_tokens": []
}`}
        lang="json"
        filename="cnbl-offer-token-global-snapshot.json"
      />
      <p>Three fields carry the contract. <code>token_name</code> is what an author types into copy. <code>package_id</code> is the join key to commerce — the same value that ends up in the checkout hand-off URL as <code>?pref=espn_unlimited</code>. The <code>fallback_*</code> fields are the safety net when a live price cannot be resolved, which is why a stale fallback surfaces as a <em>wrong</em> price rather than a missing one. When the <code>global</code> instance is not configured for the selected backend, replacement is <strong>skipped rather than failed</strong> and the page ships raw placeholders; when resolution errors, the code throws and Next renders <code>/500</code>.</p>
      <p>Now the limitation worth naming out loud: ESPN&apos;s currency formatting is <strong>hard-coded in the app</strong>, not remote.</p>
      <CodeBlock
        code={`export const currencyFormattingData: CurrencyFormatGlobalization = {
  data: { globalization: {
    formats: [
      { language: 'default', format: { currency: [{ origin: 'default', format: {
        delimiters: { decimal: '.', thousand: ',' }, format: '\${N}\${S}\${P}\${p}' } }] } },
      { language: 'en', format: { currency: [{ origin: 'default', format: {
        delimiters: { decimal: '.', thousand: ',' }, format: '\${N}\${S}\${P}\${p}' } }] } },
    ],
    currency: {
      codesToSymbol: [{ currencyCode: 'USD', symbol: '$' }],
      regionToSymbol: [{ region: 'US', symbol: '$' }],
    },
  } },
};

// ...and the call site pins tenant and language map:
await replaceOfferTokensInSnapshot(cmsPayload, {
  region, language, tenant: 'espn', appLangMap: { en: 'en-US' },
  currencyFormattingData, enableSpaceball, cmsConfig,
});`}
        lang="typescript"
        filename="get-cms-content-with-tokens-replaced.ts"
      />
      <p>One currency (<code>USD</code>), one symbol (<code>$</code>), one region (<code>US</code>), one language map (<code>en → en-US</code>). ESPN+ is a US product today, so this is defensible — but it is a <strong>hard blocker on any non-US launch</strong>, and it is a code change in an app file, not a config change. The observability is crude and genuinely useful: after substitution the code serialises the payload, regex-counts <code>$dd.dd</code> matches, and sets the span tag <code>tokens_replaced</code>. A page rendering with <code>tokens_replaced: 0</code> is your signal that pricing silently failed.</p>

      <h2 id="fail-soft-fail-hard">Fail-Soft vs Fail-Hard</h2>
      <p>This layer runs two deliberately opposite error strategies, and knowing which one you are inside changes your whole debugging approach.</p>
      <MermaidDiagram
        chart={failureModes}
        title="Failure Taxonomy: Throw to /500 vs Log and Continue"
        caption="Fail-hard failures are loud and total; fail-soft failures produce a page that looks almost right — those are the expensive ones."
        minHeight={550}
      />
      <p><strong>Fail-hard</strong> lives in <code>getServerSideProps</code>. Config load, CMS path-check, offer-token and props-build failures all end in <code>throw new Error(...)</code> with the same comment beside them: <em>&quot;we need to throw here to render the 500 page in production&quot;</em>. The throw <strong>is</strong> the error strategy — do not helpfully catch it. <strong>Fail-soft</strong> lives in content validation: <code>buildStitchDocument</code> runs the zod <code>pageModel</code> over the CMS entity and, on <code>ZodError</code>, logs and keeps going.</p>
      <CodeBlock
        code={`const validateCannonballEntity = (cannonballEntity: ContentPage) => {
  try {
    pageModel.parse(cannonballEntity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        { eventName: 'stitchWarn', err: error.issues, errorCount: error.errors.length },
        'Cannonball Data Error: Layout contains invalid data but proceeding to process it',
      );
    }
  }
};

// Run schema validation, but proceed if it fails and log a warning
validateCannonballEntity(cannonballEntity);`}
        lang="typescript"
        filename="build-stitch-document.ts"
      />
      <p>Why the asymmetry is <em>correct</em>: the inputs have different owners and different reversibility. A config or CMS outage is an <strong>engineering</strong> failure — total and unrecoverable, better surfaced as a loud 500 than a half-page. A malformed CMS field is a <strong>content author</strong> failure — one component out of forty, and blanking the page over one bad promo banner turns a typo into an outage. Fail hard on infrastructure you control; fail soft on content you do not.</p>
      <p>The cost is real: a fail-soft error yields a <strong>missing component, not a visible error</strong>. There is no red box on the page. When someone reports &quot;the hero disappeared on /nfl&quot;, search logs for <code>eventName: &apos;stitchWarn&apos;</code> first. Only <code>BUILD_ERROR</code> and <code>MAIN_CONTENT_REQUIRED_ERROR</code> are hard failures inside the Stitch build.</p>

      <h2 id="local-testing">Mocking This Layer Locally</h2>
      <p>Local development never touches a real CMS. MSW intercepts both backends, server-side and in the browser, from <code>apps/marketing-unified/espn/src/mocks/</code>. Cannonball is mocked as plain GETs of fixture JSON (<code>handlers/cannonball/landing-pages.ts</code>); Spaceball is mocked by GraphQL operation name.</p>
      <CodeBlock
        code={`const spaceballGraphQL = graphql.link(
  'https://spaceball.global.twdcgrid.net/graphql/:org/:space/:env',
);

const landingPageQueryHandler = spaceballGraphQL.query('Page', ({ variables }) => {
  const route = variables?.route as string | undefined;

  if (route?.includes('soccer')) {
    return HttpResponse.json({ data: spaceballLandingSoccerSnapshot });
  }

  // NOTE: every other route silently falls through to the HOME snapshot
  return HttpResponse.json({ data: spaceballLandingHomeSnapshot });
});`}
        lang="typescript"
        filename="spaceball.ts"
      />
      <p>That fallback is the biggest local-dev trap here. Only <strong>two routes have real fixtures</strong> — home and soccer (<code>cnbl-landing-page-home-snapshot.json</code>, <code>spaceball-landing-soccer-snapshot.json</code>, and siblings). Under Spaceball, <code>/mlbtv</code> renders the homepage and looks plausible; under Cannonball it 404s because the route key is absent from the mocked manifest. If you are &quot;fixing&quot; <code>/nflbundle</code> locally, you are probably looking at the wrong page. Redirects and offer tokens have their own fixtures (<code>cnbl-redirect-manifest.json</code>, <code>spaceball-redirects-empty.json</code>, <code>cnbl-offer-token-global-snapshot.json</code>, <code>spaceball-offer-tokens-response.json</code>).</p>
      <CodeBlock
        code={`# from the repo root: Next on 4040, SSL proxy on 5040
pnpm dev:marketing-unified:espn

open https://local.plus.espn.com:5040/soccer                               # Cannonball (default)
open "https://local.plus.espn.com:5040/soccer?enable-spaceball=true"       # Spaceball content
open "https://local.plus.espn.com:5040/soccer?enable-spaceball-mlp=true"   # Spaceball tokens

pnpm test:marketing-unified:playwright:espn   # the -sp specs assert the Spaceball branch`}
        lang="bash"
        filename="run-espn-nexus.sh"
      />
      <p>One local failure mode that wastes hours: a blank page is almost always a <strong>missing Sparrow env var</strong>, not a CMS problem. <code>getConfigs</code> hard-fails if any of <code>SPARROW_CONFIG_NAME</code>, <code>SPARROW_CONFIG_URL</code>, <code>SPARROW_WORKSPACE</code>, <code>SPARROW_SCOPE_NAME</code>, <code>SPARROW_CONFIG_VERSION</code>, <code>SPARROW_S3_ACCESS_KEY</code> or <code>AWS_REGION</code> is absent, and GSSP rethrows that as a 500 before any CMS call happens.</p>

      <h2 id="gotchas">Gotchas and Traps</h2>
      <ul>
        <li><strong><code>?enable-spaceball=true</code> does nothing in production.</strong> Overrides need debug tooling or the Playwright env — do not use it to &quot;verify prod&quot;.</li>
        <li><strong>The two flags are not one flag.</strong> <code>enableSpaceball</code> moves content and redirects; <code>enableSpaceballMlp</code> moves prices. A page can legitimately be Cannonball content with Spaceball pricing.</li>
        <li><strong>Redirect lookups use language-only locale.</strong> GSSP passes <code>locale.split(&apos;-&apos;)[0]</code> to the redirects <code>getPageData</code> call, so region-specific vanity redirects are impossible today.</li>
        <li><strong><code>getVanityRedirect</code> is typed to <code>CannonballPathCheckResult</code></strong> and <code>get-redirect-result.ts</code> casts to it <em>even in Spaceball mode</em>. It works because it reads only <code>url</code>, <code>statusCode</code> and <code>includeQueryParams</code> — but whether the Spaceball redirect shape is genuinely identical is an <strong>open question</strong> the cast hides from the type checker.</li>
        <li><strong>A valid path with a dead snapshot becomes a 404, not a 500.</strong> <code>checkPathInCannonball</code> deliberately swallows snapshot fetch errors and returns <code>pageData: null</code>; <code>getCMSContent</code> converts that to <code>notFound</code>.</li>
        <li><strong>Offer-token replacement is skipped, not failed, when the <code>global</code> instance is unconfigured.</strong> Pages then ship raw placeholder text to users — alert on <code>tokens_replaced</code>, not on error rate.</li>
        <li><strong>The <code>cannonballDataProcessor</code> call is load-bearing despite having no processors.</strong> Delete it as &quot;dead code&quot; and every Spaceball node loses <code>_type</code>, so the Stitch registry resolves nothing and the page renders empty.</li>
        <li><strong>Migration observability lives in span tags:</strong> <code>spaceball_enabled</code>, <code>spaceball_path_check</code>, <code>tokens_replaced</code>, plus <code>spaceball_cache_status</code> / <code>cannonball_cache_status</code> from the CMS package. That is how you answer &quot;what share of traffic is on the new backend?&quot;</li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how would you migrate a CMS backend without a rewrite?"
        intro="Weak answers describe the new backend. Strong answers describe the boundary, the invariant it preserves, and how you roll back in one request."
        steps={[
          "Open with the invariant, not the technology: pick one function that owns the choice and make both branches return an identical result shape. Here that is getPageData returning PathValidationSuccess whichever loader ran.",
          "Explain how you made the shapes match. The legacy loader gained a fetchPageData option so it could return page data in one call, exactly like the GraphQL loader, replacing the old check-then-fetch pair.",
          "Name the payoff concretely: rollback is a config flag, per-request comparison is a query param, and the same Playwright specs run twice — once per backend.",
          "Be honest about the adapter you had to add. _contentType to _type normalisation runs on every request in both modes; call it a temporary shim with a deletion trigger and state its cost, a full recursive walk of the payload per request.",
          "Close with how you observe the migration: span tags for backend selection, path-check success, cache status, and a proxy metric for whether pricing actually rendered.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: when should content validation fail soft vs fail hard?"
        intro="The decision is about who owns the input and whether the failure is partial — not about how serious it feels."
        steps={[
          "Split inputs by owner: infrastructure you control (config, CMS availability, pricing service) versus content authored by other humans (one CMS field).",
          "Fail hard on the first group. A missing config variable or a CMS outage is total and unrecoverable — throwing so the framework serves /500 is more honest than rendering a shell.",
          "Fail soft on the second group. One malformed banner should cost one component, not the whole page; blanking a landing page over an author typo converts a content bug into an outage.",
          "State the price you accept: fail-soft failures are invisible on the page, so they must be loud in logs. Here that is eventName stitchWarn — and it needs an alert, or it is not a strategy.",
          "Mention the exceptions you keep hard inside the soft path: BUILD_ERROR and MAIN_CONTENT_REQUIRED_ERROR still fail, because a page with no main content is not a degraded page.",
        ]}
      />
      <InterviewChallenge
        title="Challenge: /mlbtv shows $0.00 on Spaceball but correct prices on Cannonball"
        scenario={
          <>
            On stage, <code>/mlbtv</code> renders plan cards whose prices read <code>$0.00</code> — but only when <code>?enable-spaceball=true</code> is appended. Without the param the page is correct. Datadog shows <code>spaceball_path_check: success</code> and <code>spaceball_enabled: true</code> for the failing requests, and <code>tokens_replaced</code> is present but low. No 500s and no <code>stitchWarn</code> entries. You have never seen this codebase before today.
          </>
        }
        tasks={[
          "State which flag the query param actually flipped, and prove from the flag matrix that offer-token pricing may still be reading the other backend.",
          "Trace the price path end to end: which CMS instance supplies offer tokens, which flag selects its backend, and what happens when that instance is not configured for the selected backend.",
          "Explain why the absence of stitchWarn and the absence of 500s together narrow the fault to token replacement rather than content or schema validation.",
          "Say what you would check first on stage, and which single span tag would have told you instantly whether pricing rendered at all.",
          "Propose the smallest durable fix, and separately the alert you would add so the next occurrence is caught before a stakeholder sees it.",
        ]}
        pitfalls={[
          "Assuming one Spaceball flag controls everything — content and pricing move independently.",
          "Trusting the page because there were no errors: an unconfigured global instance skips token replacement silently rather than failing.",
          "Concluding the CMS content is wrong because the rendered value is wrong — the placeholder is authored in the CMS, but the value is substituted server-side.",
          "Trying to reproduce on production with the query param, which is ignored there unless debug tooling or Playwright is active.",
          "Deleting or bypassing the cannonballDataProcessor call while poking around, which breaks _type on every Spaceball node and empties the page.",
        ]}
        signal="A strong candidate separates the two flags immediately, follows token_name and package_id through get-cms-content-with-tokens-replaced.ts, recognises skip-rather-than-fail as the actual failure mode, and reaches for the tokens_replaced span tag instead of adding logs."
      />
      <SolutionReveal difficulty="medium">
        <p><code>?enable-spaceball=true</code> flips only <code>enableSpaceball</code>, which moves <strong>page content and redirects</strong> to Spaceball. Pricing is gated by <code>enableSpaceballMlp</code>, still <code>false</code>. The request is therefore a legitimate mixed mode: Spaceball content, Cannonball offer tokens.</p>
        <p>The price path: <code>get-server-side-props.ts</code> builds <code>offerTokenCmsConfig</code> from <code>config.paths[enableSpaceballMlp ? &apos;spaceball&apos; : &apos;cannonball&apos;]</code> for the <code>global</code> instance, then <code>getCmsContentWithTokensReplaced</code> calls <code>replaceOfferTokensInSnapshot</code>. When that instance resolves to nothing the code <strong>skips replacement instead of failing</strong> — so tokens the Spaceball content authored under different names are never substituted, and any card whose token is unresolved falls back to a zero or placeholder value. No throw, so no 500; no zod failure, so no <code>stitchWarn</code>. The silence is the diagnosis.</p>
        <p>First checks on stage: confirm both flag values <em>as resolved for the request</em> rather than as written in the fixture; confirm a <code>global</code> instance exists in the <code>spaceball</code> paths block of the Sparrow config for the variant in use; then compare <code>tokens_replaced</code> across the two URLs. That tag is the instant answer — a near-zero count on the Spaceball URL against a healthy count on the Cannonball URL localises the fault to token replacement in one query.</p>
        <p>Smallest durable fix: either make the two flags move together for pricing-bearing pages, or configure the <code>global</code> instance in the Spaceball paths block so mixed mode resolves correctly. Then add the alert that should already exist — warn when <code>tokens_replaced</code> is <code>0</code> on a route known to show prices — and file a follow-up to turn the silent skip into a warn-level log so the failure has a searchable event name, the way <code>stitchWarn</code> does.</p>
        <p>The <code>/mlbtv</code> detail is a second, independent trap: only home and soccer have fixtures, so under MSW <code>/mlbtv</code> renders the <em>home</em> snapshot on the Spaceball branch and 404s on the Cannonball branch — a local reproduction would have been comparing two different pages.</p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>One React page serves 29 CMS routes; this layer&apos;s real job is answering four questions per request — does the path exist, is this locale published, is it a redirect, and what is the content body.</li>
        <li>Cannonball is CDN JSON in two hops (manifest then snapshot), and the manifest exists so path validation, locale availability and redirect detection happen <em>before</em> content is fetched. Spaceball collapses all of it into one GraphQL <code>Page</code> operation.</li>
        <li>The whole migration is isolated behind one ternary in <code>get-page-data.ts</code>, and both branches return the same shape — so hundreds of lines of orchestration downstream never learn which backend ran. Isolate a migration behind one shape-preserving boundary.</li>
        <li>Shape preservation has a price: <code>cannonballDataProcessor</code> walks and mutates the entire payload on every request in <strong>both</strong> modes just to keep <code>_type</code> stable. Treat it as a temporary adapter with a deletion trigger, not as architecture.</li>
        <li><code>enableSpaceball</code> (content and redirects) and <code>enableSpaceballMlp</code> (offer tokens only) are independent, both <code>false</code> in the fixture, and both overridable via kebab-case query params everywhere <em>except</em> production.</li>
        <li>Fail hard on infrastructure you own (config and CMS failures throw to <code>/500</code>); fail soft on content authored by others (zod failures log <code>stitchWarn</code> and keep rendering) — and accept that fail-soft bugs look like a missing component, not an error.</li>
      </ul>
    </div>
  );
}
