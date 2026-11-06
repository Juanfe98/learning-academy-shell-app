import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const siblingAppsDiagram = String.raw`flowchart TD
  subgraph apps["apps/commerce — three sibling Next.js apps"]
    D["disneyPlus/<br/>@solo/commerce-disney<br/>106 page files"]
    H["hulu/<br/>@solo/commerce-hulu<br/>63 page files"]
    E["espn/<br/>@solo/commerce-espn<br/>79 page files"]
  end
  D --> CB["@solo/commerce-base<br/>page components · hooks · SSP builder · layouts · themes"]
  H --> CB
  E --> CB
  E --> DI["@solo/data-interface-espn"]
  CB --> SP["Sparrow remote config<br/>workspace commerce-espn"]
  apps -.-> OWN["Each app owns privately:<br/>next.config.js · pages/ · _app · _document<br/>middleware · Dockerfile · jest + playwright config<br/>.env · turbo.json · Jenkins job"]`;

const sspPipelineDiagram = String.raw`flowchart TD
  R["Request GET /commerce/welcome-back"] --> MW["middleware.page.tsx<br/>geoNext strips the /es-419 prefix<br/>appends language + locale RESPONSE headers"]
  MW --> W["ESPN wrapper buildGetServerSideProps<br/>passes SSRNormalizedCommerceEspnDictionary into the base builder"]
  W --> B1["Steps 1-4 · read user-agent, read middleware headers off context.res<br/>resolve urlLanguage"]
  B1 --> B2["Step 5 · productName = process.env.PRODUCT<br/>lookup productConfigMap and metadataByProduct"]
  B2 --> B3["Steps 6-7 · resolve backendService from dss_backend_services<br/>decide whether the config is cacheable"]
  B3 --> B4["Step 8 · await loadSparrowConfig<br/>workspace commerce-espn yields commerceAppConfig"]
  B4 --> B5["Steps 9-13 · sdk-config cookie override, supportedLangsMap<br/>publicRuntimeConfig, debug indicators"]
  B5 --> B6["Step 14 · run every composition function left to right<br/>shallow-merge each result"]
  B6 --> B7["Steps 15-17 · dictionary key narrowing<br/>await getDictionaryServerProps"]
  B7 --> B8["Steps 18-19 · region props<br/>getInitialGlimpseConfig THROWS on unknown PRODUCT"]
  B8 --> B9["Steps 20-22 · productUrl, assemble finalPageProps<br/>composed props are spread LAST"]
  B9 --> B10["Step 23 · return notFound or redirect or props"]
  B10 --> FP["ESPN post-step · previewFooter=true calls getFooterLayout<br/>a bare catch swallows every failure"]`;

const layoutStackDiagram = String.raw`flowchart TD
  A["_app.page.tsx module scope<br/>initDatadog · polyfillIntl · polyfillReplaceAll · enableMapSet"] --> J["JotaiProvider"]
  J --> Q["QueryProvider"]
  Q --> DIS["getLayout — three-way dispatch"]
  DIS -->|"Component.getPageLayout"| V2["ESPNLayout — CUP V2"]
  DIS -->|"Component.getLegacyLayout"| V1["page-supplied legacy layout — CUP V1"]
  DIS -->|"neither"| DEF["getDefaultPageLayout → PageLayout"]
  DEF --> GS["GlobalStyles then SearchEngineOptimizationMetaData"]
  GS --> LAL["LegacyApplicationLayout"]
  LAL --> EB["ApplicationErrorBoundary + HydrateBaseAtoms"]
  EB --> BM["BrowserMocks — the MSW gate"]
  BM --> DEV["HydrateESPNDeviceAttributeProvider — ESPN ONLY"]
  DEV --> HDI["HydrateDataInterface — @solo/data-interface-espn — ESPN ONLY"]
  HDI --> LA["LoadAnalytics — Adobe via useFetchESPNAdobeCommonData — ESPN ONLY"]
  HDI --> LR["LanguageRedirect → VisualLayout → page"]
  LR --> FT["GlobalFooter with tenant espn — ESPN ONLY"]`;

const routeGatingDiagram = String.raw`flowchart TD
  S["GET /commerce/plans on the ESPN app"] --> F["Does the page file exist under apps/commerce/espn/pages?"]
  F -->|"no"| N1["404 — build-time gap, 30 D+ routes are missing from ESPN"]
  F -->|"yes"| SP["SSP step 8 fetches Sparrow workspace commerce-espn<br/>variant = backendService, default qa"]
  SP --> IR["isRouteEnabled reads feature-flags.general.enableCommerceUnifiedPlans"]
  IR -->|"truthy"| OK["page renders"]
  IR -->|"falsy or absent"| N2["composition function returns notFound true"]
  N2 --> N3["Next renders 404 — Sparrow and dictionary were already fetched"]
  N3 --> DG["Diagnosis: it is a flag, not a bug"]`;

export const toc: TocItem[] = [
  { id: "three-sibling-apps", title: "Three Sibling Apps, One Shared Library", level: 2 },
  { id: "thin-shell", title: "The Thin-Shell Pattern", level: 2 },
  { id: "stale-docs", title: "When the Docs Lie: the Stale src/ Tree", level: 3 },
  { id: "tenant-switch", title: "The Tenant Switch and the Four Brand Namespaces", level: 2 },
  { id: "product-default-trap", title: "The PRODUCT Default Trap", level: 3 },
  { id: "ssp-pipeline", title: "The getServerSideProps Pipeline", level: 2 },
  { id: "espn-wrapper", title: "What ESPN's Wrapper Adds", level: 3 },
  { id: "layout-stack", title: "The Layout and Provider Stack", level: 2 },
  { id: "two-loadanalytics", title: "The Two LoadAnalytics Trap", level: 3 },
  { id: "route-gating", title: "Route Gating and the 404 You Will Hit First", level: 2 },
  { id: "local-dev", title: "Local Development", level: 2 },
  { id: "build-deploy", title: "Build, Deploy, and CI Shape", level: 2 },
  { id: "gotchas", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Ship a Flag-Gated ESPN Page", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnCommerceAppAnatomy() {
  return (
    <div className="article-content">
      <p>
        This module opens the checkout layer from the three-domain map: <code>secure.web.plus.espn.com</code>, known internally as <strong>CUP</strong> (Commerce Unified Platform), living in the <code>cgi-web</code> monorepo at <code>apps/commerce/espn</code>. If you must ship a change there tomorrow, internalise this first: <strong>almost nothing lives in the app</strong>. The ESPN app is a routing and configuration manifest; the behaviour is in a shared library. Second: ESPN is the brand where every naming convention accidentally agrees — which makes it the worst possible brand to validate a brand check against.
      </p>

      <h2 id="three-sibling-apps">Three Sibling Apps, One Shared Library</h2>
      <p>
        Commerce is <em>not</em> one tenant-parameterized Next.js app. It is <strong>three sibling Next.js apps</strong> — <code>apps/commerce/disneyPlus</code>, <code>apps/commerce/hulu</code>, <code>apps/commerce/espn</code> — each with its own <code>next.config.js</code>, <code>pages/</code>, <code>_app</code>, <code>_document</code>, <code>middleware.page.tsx</code>, <code>public/</code>, <code>Dockerfile</code>, <code>.env</code>, <code>jest.config.js</code>, <code>playwright.config.ts</code>, <code>turbo.json</code>, and Jenkins job. Shared behaviour lives in one package: <code>@solo/commerce-base</code>.
      </p>
      <MermaidDiagram
        chart={siblingAppsDiagram}
        title="Three-Sibling-Apps Topology"
        caption="Notice how little is shared at the app layer and how much is shared one level down — every arrow into commerce-base is a page component the app merely re-exports."
        minHeight={550}
      />
      <p>
        <strong>Why a company picks this.</strong> A single parameterized app means one deploy artifact, one bundle, one blast radius. Three brands with three release cadences, three on-call rotations, and three risk appetites cannot share a deploy button. Splitting at the app boundary buys independent Jenkins pipelines (ESPN can sit on a canary branch while Hulu ships), per-brand bundle budgets, per-brand feature-flag surfaces, and the ability to delete a brand&apos;s route without touching another brand&apos;s build. An ESPN-only incident can be rolled back ESPN-only.
      </p>
      <p>
        <strong>What it costs: page drift.</strong> Because route <em>presence</em> is a file-system fact per app, the brands have quietly diverged. ESPN has 79 page files against Disney+&apos;s 106 and Hulu&apos;s 63; 121 distinct routes exist across the three and only 46 exist in all three. Some gaps are deliberate — Hulu runs a separate identity stack in <code>packages/identity-hulu</code>, which is why Hulu has no <code>identity/*</code> pages. Some are spelling artifacts: Disney+ uses the optional catch-all <code>profiles/extra-member/accept/transfer/[[...slug]].page.tsx</code> where ESPN spells <code>index</code> and <code>[slug]</code> separately, which makes that route look ESPN-exclusive when it is not. And three routes — <code>identity/delete/[slug]</code>, <code>identity/manage-devices</code>, <code>profiles/adhoc-transfer/max-profiles</code> — exist on both siblings but not ESPN, with no ticket explaining why. That is drift, not design.
      </p>
      <ArticleTable
        caption="Route inventory per brand — the concrete cost of the three-app split."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Disney+</th>
              <th>Hulu</th>
              <th>ESPN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>pages/**/*.page.tsx</code> files</td>
              <td>106</td>
              <td>63</td>
              <td>79</td>
            </tr>
            <tr>
              <td>Distinct routes across all three</td>
              <td colSpan={3}>121</td>
            </tr>
            <tr>
              <td>Routes present in all three</td>
              <td colSpan={3}>46</td>
            </tr>
            <tr>
              <td>Missing from ESPN, this brand only</td>
              <td>30</td>
              <td>9</td>
              <td>&mdash;</td>
            </tr>
            <tr>
              <td>Missing from ESPN, on both siblings</td>
              <td colSpan={3}>
                3: <code>identity/delete/[slug]</code>, <code>identity/manage-devices</code>, <code>profiles/adhoc-transfer/max-profiles</code>
              </td>
            </tr>
            <tr>
              <td>Flag-gated at runtime</td>
              <td>&mdash;</td>
              <td>&mdash;</td>
              <td><strong>42 of 79</strong></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="thin-shell">The Thin-Shell Pattern</h2>
      <p>
        Here is a complete, unabridged ESPN page. Not an excerpt — the whole file. This is the canonical shape of all 79:
      </p>
      <CodeBlock
        code={`import { type PartialLayoutConfig } from '@solo/commerce-base/src/common/layouts';
import { isRouteEnabled } from '@solo/commerce-base/src/common/lib/is-route-enabled';

import { buildGetServerSideProps } from '../../../src/common/build-get-server-side-props';

export { WelcomeBackPage as default } from '@solo/commerce-base/src/signup/pages';

const getLayoutConfigProp = (): {
  props: { layoutConfig: PartialLayoutConfig };
} => ({
  props: {
    layoutConfig: {
      visualLayout: {
        header: {
          type: 'siteHeader',
          showBorder: false,
          showGradientOnMobile: false,
        },
        footer: {
          show: true,
          type: 'global',
        },
      },
    },
  },
});

export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedWelcomeBack' }),
  getLayoutConfigProp,
]);`}
        lang="tsx"
        filename="apps/commerce/espn/pages/commerce/welcome-back/index.page.tsx"
      />
      <p>
        Read what that file actually declares: four things, and no behaviour at all. <strong>Which shared component renders here</strong> (a re-export from <code>@solo/commerce-base</code>). <strong>Which feature flag gates the route.</strong> <strong>What chrome the layout should draw</strong> (header type, footer type). <strong>That server props come from the ESPN builder.</strong> No data fetching, no state, no markup.
      </p>
      <p>
        <strong>The mental model:</strong> <em>the app is a routing plus configuration manifest; the behaviour lives in the shared library.</em> The practical consequence catches every newcomer: if a button is wrong on <code>secure.web.plus.espn.com/commerce/welcome-back</code>, the fix is almost never in <code>apps/commerce/espn</code>. It is in <code>packages/cgi/commerce-base/src/signup/pages</code>, and it will ship to Disney+ and Hulu at the same time. Your first triage question on any ESPN commerce ticket is &quot;is this a shell change or a commerce-base change?&quot; — the two have completely different review scope and blast radius.
      </p>
      <p>
        Note the import path too: <code>buildGetServerSideProps</code> comes from <code>../../../src/common/build-get-server-side-props</code>, never from <code>commerce-base</code> directly. That is enforced by an ESLint <code>no-restricted-imports</code> rule with a single documented escape hatch (see the wrapper section). There are no <code>@/</code> path aliases in this app — <code>tsconfig.json</code> has exactly two <code>paths</code> entries and neither aliases <code>src</code> — so relative imports with three levels of <code>../</code> are correct and expected.
      </p>

      <h3 id="stale-docs">When the Docs Lie: the Stale src/ Tree</h3>
      <p>
        <code>apps/commerce/AGENTS.md</code> documents a per-brand <code>src/</code> layout that ESPN does not have. This matters: an agent — or a new engineer — reading that doc will go looking for <code>apps/commerce/espn/src/payments/</code> and conclude the repo is broken.
      </p>
      <CodeBlock
        code={`WHAT apps/commerce/AGENTS.md ADVERTISES        WHAT apps/commerce/espn/src ACTUALLY IS
-------------------------------------------   --------------------------------------------
{brand}/                                      espn/
  src/                                          src/
    account/     <-- does not exist                common/    build-get-server-side-props/
    identity/    <-- does not exist                           layouts/  footer/  icons/
    payments/    <-- does not exist                hooks/     espn Adobe common data
    profiles/    <-- does not exist                layout/    espn-layout, hydrate-data-interface
    common/                                        queries/   use-flex-subscriber-cohorts
    layout/                                        test/      10 jest setup files, browser mocks
    hooks/                                         types/
    test/                                          commerce-espn-dict-keys.generated.ts

Same file, same staleness class, two more wrong claims:
  AGENTS.md package name   -> "@solo/commerce-disneyplus"   (real: @solo/commerce-disney)
  AGENTS.md ESPN dev URL   -> "https://local.espn.com"      (real: https://local.plus.espn.com:5004)`}
        lang="text"
        filename="agents-md-vs-reality.txt"
      />
      <p>
        The lesson is not &quot;the docs are bad.&quot; It is that in a multi-team monorepo, <strong>docs are owned by a team and drift when that team is not the one changing the code</strong>. Three separate claims in one file are wrong the same way. Treat <code>AGENTS.md</code> as a map of intent and the file system as the source of truth: <code>ls</code> beats prose, and <code>package.json</code> beats a package name written in Markdown.
      </p>

      <h2 id="tenant-switch">The Tenant Switch and the Four Brand Namespaces</h2>
      <p>
        The primary switch is a server-only environment variable, declared once in the app&apos;s committed <code>.env</code>:
      </p>
      <CodeBlock
        code={`# apps/commerce/espn/.env  (committed, 20 lines — excerpt)
PRODUCT=espn
REMOTE_CONFIG_DEFAULT=qa
REMOTE_CONFIGS_TO_LOAD=prod,beta,preview,qa,qa-local,beta-local,preview-local,prod-local
REMOTE_DICTIONARIES_TO_LOAD=accessibility,identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding
NEXT_PUBLIC_API_MOCKING=disabled
DD_SERVICE=espnplus-commerce
YELLOW_PAGES_ID=6616b21135f3fecb74145117
SPARROW_VERSION=latest`}
        lang="ini"
        filename=".env"
      />
      <p>
        <code>PRODUCT</code> is typed as <code>ProductName = &apos;disneyPlus&apos; | &apos;hulu&apos; | &apos;espn&apos;</code> in <code>packages/developer-experience/types/src/index.d.ts</code>. It selects the Sparrow remote-config workspace, the Glimpse identity, and the SEO metadata block. It is also listed in the Turbo build task&apos;s <code>env</code> array in <code>apps/commerce/espn/turbo.json</code>, so the remote build cache is keyed on it and an ESPN build can never collide with a Hulu build.
      </p>
      <p>
        But <code>PRODUCT</code> is only one of <strong>several partly-overlapping brand namespaces</strong>. This is the highest-value table in the module — read the <em>Disney+</em> column, not the ESPN one:
      </p>
      <ArticleTable
        caption="The brand namespaces. ESPN's literals all coincide; Disney+'s do not — that asymmetry is where brand bugs hide."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Namespace</th>
              <th>Disney+</th>
              <th>Hulu</th>
              <th>ESPN</th>
              <th>Defined at</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ProductName</code> / <code>PRODUCT</code> env</td>
              <td><code>disneyPlus</code></td>
              <td><code>hulu</code></td>
              <td><code>espn</code></td>
              <td><code>developer-experience/types/src/index.d.ts</code></td>
            </tr>
            <tr>
              <td>Glimpse <code>partner</code> / session <code>partnerName</code></td>
              <td><code>disney</code></td>
              <td><code>hulu</code></td>
              <td><code>espn</code></td>
              <td><code>productConfigMap</code> in <code>build-get-server-side-props.ts</code></td>
            </tr>
            <tr>
              <td><code>tenant</code> (footer, Flex)</td>
              <td><code>disney</code></td>
              <td><code>hulu</code></td>
              <td><code>espn</code></td>
              <td><code>commerce-base/src/common/services/flex/models/actions.types.ts</code></td>
            </tr>
            <tr>
              <td><code>ThemeName</code></td>
              <td><code>disneyPlus</code></td>
              <td><code>hulu</code></td>
              <td><code>espn</code></td>
              <td><code>commerce-base/src/common/styles/stitches.config.ts</code></td>
            </tr>
            <tr>
              <td><code>MetadataAppName</code> key</td>
              <td><code>disney</code></td>
              <td><code>hulu</code></td>
              <td><code>espn</code></td>
              <td><code>build-get-server-side-props.ts</code></td>
            </tr>
            <tr>
              <td>Sparrow workspace</td>
              <td><code>commerce-disneyplus</code></td>
              <td><code>commerce-hulu</code></td>
              <td><code>commerce-espn</code></td>
              <td><code>commerce-base/src/common/lib/sparrow/load-sparrow-config.ts</code></td>
            </tr>
            <tr>
              <td>npm package</td>
              <td><code>@solo/commerce-disney</code></td>
              <td><code>@solo/commerce-hulu</code></td>
              <td><code>@solo/commerce-espn</code></td>
              <td>per-app <code>package.json</code></td>
            </tr>
            <tr>
              <td>Jenkins / Fuzzbucket app</td>
              <td><code>disneyplus-commerce</code></td>
              <td><code>hulu-commerce</code></td>
              <td><code>espnplus-commerce</code></td>
              <td><code>ci/espnplus/commerce</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>The central warning: ESPN&apos;s namespaces all coincide on the string <code>espn</code>. Disney+&apos;s do not — it is <code>disneyPlus</code> as a product and theme, but <code>disney</code> as partner, tenant, and metadata key.</strong> The consequence is brutal and non-obvious: a brand-check bug can pass every ESPN unit test, every ESPN Playwright spec, and manual ESPN QA — and still break Disney+ in production. Write <code>if (partnerName === productName)</code>, or reuse a <code>ProductName</code> value where a <code>tenant</code> is expected, and ESPN will happily agree with you. Never validate a brand check against ESPN alone; always exercise the Disney+ path, because Disney+ is the brand that disagrees with itself.
      </p>
      <p>
        A second, related trap: <code>partnerName</code> is <strong>session-derived</strong>, from <code>useSessionInfo().data?.partnerName</code>, not from env. An ESPN-app request can legitimately observe <code>partnerName === &apos;disney&apos;</code> — for example a Disney+ subscriber managing an ESPN-linked account. That is exactly why <code>commerce-base/src/payments/payment-forms/components/payments-container/payments-container.tsx</code> branches on <code>partnerName === &apos;disney&apos; || partnerName === &apos;espn&apos;</code> rather than on <code>PRODUCT</code>. Do not use <code>partnerName</code> to answer &quot;which app am I?&quot;.
      </p>

      <h3 id="product-default-trap">The PRODUCT Default Trap</h3>
      <p>
        <code>PRODUCT</code> is not validated at boot. Two independent call sites silently fall back to <code>disneyPlus</code>; exactly one refuses to guess:
      </p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/next.config.js
const productName = process.env.PRODUCT ?? 'disneyPlus';

// packages/cgi/commerce-base/src/common/lib/get-product-name-for-mocks.ts
export const getProductNameForMocks = () => {
  return (process.env.PRODUCT ||
    getConfig()?.publicRuntimeConfig?.productNameForMocks ||
    'disneyPlus') as ProductName;
};

// packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts
// ...the ONLY call site that throws:
export function getInitialGlimpseConfig(context, appLanguage) {
  const product = process.env.PRODUCT;
  if (!product || !isKnownProduct(product)) {
    throw new Error(
      \`Cannot create an initial glimpse configuration because the product, \${product}, is not supported.\`
    );
  }
  // ...
}`}
        lang="typescript"
        filename="product-default-trap.ts"
      />
      <p>
        <strong>The failure mode a newcomer sees.</strong> You write a script, a one-off Jest invocation, or a container command that bypasses dotenv loading. Nothing errors. The app boots. Then Disney+ MSW mocks get served into an ESPN page, or you get a Disney+ asset prefix, and you spend an hour debugging &quot;why is the mock data wrong&quot; before noticing the brand. The only loud signal is a boot log from <code>commerce-base/src/common/constants/env-log.ts</code> — <code>WARNING: PRODUCT not set, mocks will misbehave!</code> — plus the <code>getInitialGlimpseConfig</code> throw, which only fires once a request actually reaches server-side props.
      </p>
      <p>
        Worth knowing: ESPN and Disney+ both rely on <code>.env</code> for <code>PRODUCT</code>, while Hulu sets it inline in its dev script (<code>PORT=5030 PRODUCT=hulu next dev</code>). ESPN&apos;s <code>dev:start</code> is just <code>PORT=5040 next dev</code>. So the Hulu app is accidentally immune to this trap and ESPN is not.
      </p>

      <h2 id="ssp-pipeline">The getServerSideProps Pipeline</h2>
      <p>
        Every ESPN page is server-rendered per request, and that whole lifecycle is one shared function — <code>packages/cgi/commerce-base/src/common/lib/build-get-server-side-props.ts</code> — wrapped by one ESPN file. Roughly 24 ordered steps run before your page component sees a single prop:
      </p>
      <MermaidDiagram
        chart={sspPipelineDiagram}
        title="ESPN getServerSideProps Pipeline, Request to Props"
        caption="Notice that Sparrow (step 8) and the dictionary (step 17) are fetched before the notFound decision is returned at step 23 — a route gate short-circuits nothing."
        minHeight={550}
      />
      <p>
        <strong>The key architectural point: there are zero <code>if (product === &apos;espn&apos;)</code> branches in that pipeline.</strong> Not one. Every brand divergence is expressed as a table or config lookup, which is why <code>commerce-base</code> can honestly describe itself as &quot;a tenant-agnostic platform&quot;:
      </p>
      <ArticleTable
        caption="Brand divergence as data, not control flow — each row is a lookup, not a branch."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Pipeline step</th>
              <th>Lookup mechanism</th>
              <th>ESPN value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>5 &mdash; product origin</td>
              <td><code>productConfigMap[productName].url</code></td>
              <td><code>https://plus.espn.com</code></td>
            </tr>
            <tr>
              <td>5 &mdash; SEO / OG metadata</td>
              <td><code>metadataByProduct[productName]</code></td>
              <td>1296&times;729 <code>image/x-png</code>, <code>@ESPN</code> — both siblings are 1200&times;630 JPEG</td>
            </tr>
            <tr>
              <td>8 &mdash; remote config</td>
              <td><code>workspace = commerce-$&#123;productName.toLowerCase()&#125;</code></td>
              <td><code>commerce-espn</code></td>
            </tr>
            <tr>
              <td>17 &mdash; dictionary</td>
              <td><code>feature-configuration.dictionary.dictionaryTenant</code></td>
              <td><code>espn</code></td>
            </tr>
            <tr>
              <td>19 &mdash; Glimpse identity</td>
              <td><code>productConfigMap[productName].partner</code> / <code>.appName</code></td>
              <td><code>espn</code> / <code>ESPN</code></td>
            </tr>
            <tr>
              <td>Wrapper &mdash; SSR dictionary keys</td>
              <td><code>ssrDictionaryKeys</code> argument</td>
              <td><code>SSRNormalizedCommerceEspnDictionary</code></td>
            </tr>
            <tr>
              <td>Wrapper &mdash; footer preview</td>
              <td>post-processing of the base result</td>
              <td>the <strong>only</strong> genuinely ESPN-only code path</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Two details from that pipeline that will bite you. First, <strong>composition-function props are spread last</strong> into <code>finalPageProps</code>, so a composition function can silently overwrite <code>commerceAppConfig</code> or <code>dictionary</code> — usually unintentionally. Second, the terminal <code>catch</code> logs <code>console.log(&apos;ERRROR&apos;)</code> with three R&apos;s. That is intentional and commented as such (&quot;for WCS testing&quot;). Do not &quot;fix&quot; the typo.
      </p>

      <h3 id="espn-wrapper">What ESPN&apos;s Wrapper Adds</h3>
      <p>
        The ESPN app never imports the base builder directly. It imports its own wrapper, which adds exactly two behaviours:
      </p>
      <CodeBlock
        code={`// This is the only file we should be importing buildGetServerSideProps from commerce-base.
// buildGetServerSideProps is modified to provide ESPN specific functionality.
// eslint-disable-next-line no-restricted-imports
import { buildGetServerSideProps as baseBuildGetServerSideProps } from '@solo/commerce-base/src/common/lib/build-get-server-side-props';
import { SSRNormalizedCommerceEspnDictionary } from '../../commerce-espn-dict-keys.generated';

export function buildGetServerSideProps<TPageProps = Record<string, unknown>>(
  propCompositionFunctions: (PagePropFunction<TPageProps> | CompositionFunction)[] = []
) {
  const baseGetServerSideProps = baseBuildGetServerSideProps(
    propCompositionFunctions,
    SSRNormalizedCommerceEspnDictionary // (1) ESPN's generated SSR dictionary-key allowlist
  );

  return async (context: GetServerSidePropsContext) => {
    const result = await baseGetServerSideProps(context);
    if ('redirect' in result || 'notFound' in result) return result;

    const useFooterPreview =
      context.query['previewFooter'] === 'true' ||
      context.query['footerPreview'] === 'true';
    if (!useFooterPreview) return result;

    try {
      // (2) dynamic import keeps @solo/footer/server out of the default bundle
      const { getFooterLayout } = await import('@solo/footer/server');
      const footerPreviewData = await getFooterLayout({
        tenant: 'espn',
        type: 'account-management',
        cannonballEnvironment: 'production',
        region: 'us',
        language: 'en',
        usePreview: true,
      });
      return { ...result, props: { ...result.props, footerPreviewData } };
    } catch {
      return result; // silently degrades to the normal footer
    }
  };
}`}
        lang="typescript"
        filename="apps/commerce/espn/src/common/build-get-server-side-props/build-get-server-side-props.ts"
      />
      <p>
        <strong>(1) The SSR dictionary-key allowlist.</strong> <code>SSRNormalizedCommerceEspnDictionary</code> comes from <code>src/commerce-espn-dict-keys.generated.ts</code>, produced by the <code>prebuild</code> script (<code>pnpm --filter @solo/dictionary extract-ssr-keys &quot;$PWD&quot; commerce-espn</code>). When the <code>enableDictionaryOptimization</code> flag is on, the server ships only those keys instead of whole dictionaries. It is a <em>generated</em> file — if an SSR-rendered copy key goes missing, re-run <code>prebuild</code>; never hand-edit it. The pipeline also logs a warning above 500 tracked keys.
      </p>
      <p>
        <strong>(2) Footer preview, and its silent <code>catch</code>.</strong> <code>?previewFooter=true</code> makes the server fetch an unpublished Cannonball footer layout and inject it as <code>footerPreviewData</code>. The bare <code>catch &#123;&#125;</code> is a deliberate availability decision — a Cannonball outage degrades to the normal footer rather than 500-ing checkout. It is also a real debugging trap: a broken preview is indistinguishable from &quot;preview not requested&quot;, because there is no log, no header, and no error surface. If <code>?previewFooter=true</code> appears to do nothing, that <code>catch</code> is the first place to look.
      </p>

      <h2 id="layout-stack">The Layout and Provider Stack</h2>
      <p>
        <code>_app.page.tsx</code> runs four module-scope side effects <em>before</em> React exists — <code>initDatadog()</code>, <code>polyfillIntl()</code>, <code>polyfillReplaceAll()</code>, <code>enableMapSet()</code> for immer — then performs a three-way layout dispatch. <code>_document.page.tsx</code> computes <code>createTheme(espnTheme.theme).className</code> at module scope, also deliberately: doing it inside a component would cause a flash of unstyled content.
      </p>
      <MermaidDiagram
        chart={layoutStackDiagram}
        title="Provider Stack for One ESPN Page Render"
        caption="Four nodes are marked ESPN ONLY — those are the brand seams; everything else is shared, so a change there ships to all three brands."
        minHeight={550}
      />
      <p>The brand seams, precisely:</p>
      <ul>
        <li>
          <strong><code>HydrateESPNDeviceAttributeProvider</code></strong> — wraps <code>new ESPNDeviceAttributeProvider()</code> from <code>@solo/sdk-session/src/espn-device-attribute-provider</code>, guarded by <code>isBrowser()</code>.
        </li>
        <li>
          <strong><code>HydrateDataInterface</code></strong> — <code>apps/commerce/espn/src/layout/hydrate-data-interface.tsx</code> builds the data interface from <code>@solo/data-interface-espn/src/data-interface</code>. It has two variants: the original gates only on SDK readiness; the <em>optimized</em> one <em>also</em> returns <code>null</code> until <code>useDictionaryQuery()</code> succeeds, to avoid <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> errors caused by server-side dictionary narrowing. The selector is the <code>enableDictionaryClientGating</code> flag.
        </li>
        <li>
          <strong><code>LoadAnalytics</code></strong> — ESPN sends analytics to <strong>Adobe</strong>, via <code>useFetchESPNAdobeCommonData()</code> and ESPN-specific hooks in <code>apps/commerce/espn/src/hooks/</code>. The Sparrow config sets <code>crossDomains: [&apos;espn.com&apos;]</code> and an Adobe server of <code>sw88.espn.com</code>.
        </li>
        <li>
          <strong><code>GlobalFooter</code></strong> — <code>apps/commerce/espn/src/common/footer/footer.tsx</code> wraps <code>@solo/footer</code> with <code>tenant=&quot;espn&quot;</code> and an ESPN fallback. It <strong>hardcodes</strong> <code>region=&quot;us&quot;</code> and <code>cannonballEnvironment=&quot;production&quot;</code>, and collapses language to <code>es</code> for <code>es-419</code> and <code>en</code> for everything else. Non-US ESPN would be a code change, not a config change.
        </li>
      </ul>
      <p>
        One shared-but-critical node: <strong><code>BrowserMocks</code></strong>. It is the MSW gate. Anything performing network I/O <em>must</em> render inside it — the codebase warns about this in three separate places (<code>espn-layout.tsx</code>, <code>legacy-application-layout.tsx</code>, <code>_error.page.tsx</code>). Outside it, integration and E2E runs hit real services.
      </p>
      <p>
        Two other ESPN-flavoured but shared components: <code>HydrateAvatarFallbackStyle</code> is passed <code>avatarFallbackStyle=&quot;letter&quot;</code> (ESPN uses letter avatars), and <code>OneId</code> is configured with <code>clientId: &apos;ESPN-ONESITE.WEB&apos;</code>. Also worth knowing: <code>PageLayout</code> defaults <code>isLoginRequired</code> to <strong>true</strong> — auth is opt-out, not opt-in — and it renders <code>SearchEngineOptimizationMetaData</code> as a <em>peer</em> of the app layout so SEO tags survive a throw inside the app tree.
      </p>

      <h3 id="two-loadanalytics">The Two LoadAnalytics Trap</h3>
      <p>
        This is the highest-value trap in the layout layer. <code>apps/commerce/espn/src/layout/espn-layout.tsx</code> (the CUP V2 path) and <code>apps/commerce/espn/src/common/layouts/legacy-application-layout.tsx</code> each define their <strong>own private <code>LoadAnalytics</code></strong> component, with <strong>different consent logic</strong>:
      </p>
      <ul>
        <li>
          <code>espn-layout.tsx</code> is flag-aware — it reads <code>useMystiqueFeatureFlags()[&apos;wpnx-use-privacy-consent-package&apos;]</code> and chooses between <code>useHasPrivacyConsent()</code> (the new <code>@solo/privacy-consent</code> package) and <code>useHasOneTrustConsent()</code>.
        </li>
        <li>
          <code>legacy-application-layout.tsx</code> is OneTrust-only, plus <code>useToggleAdobeAnalytics(hasOneTrustConsent)</code>.
        </li>
      </ul>
      <p>
        A privacy-consent bug fixed in one leaves the other broken, and which one runs depends on whether the page exports <code>getPageLayout</code> (V2) or falls through to the default (V1 legacy). The duplication is acknowledged in-code with a <code>TODO: WEB-27451</code>. If you touch consent or analytics gating in this app, <strong>grep for both and change both</strong>.
      </p>

      <h2 id="route-gating">Route Gating and the 404 You Will Hit First</h2>
      <p>
        Runtime gating is a composition function. <code>packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts</code> reads a boolean out of the Sparrow config and returns <code>&#123; notFound: true &#125;</code>, which Next renders as a 404:
      </p>
      <CodeBlock
        code={`export function isRouteEnabled({
  featureFlagName,
}: {
  featureFlagName: RouteEnablingFeatureFlags;
}): CompositionFunction {
  return function _isRouteEnabled(commerceAppConfig) {
    const {
      'feature-flags': { general: featureConfig },
    } = commerceAppConfig;

    const isFlaggedRouteEnabled =
      featureConfig[
        featureFlagName as keyof FeatureFlagsScope['feature-flags']['general']
      ];

    if (isFlaggedRouteEnabled) {
      return {};
    }

    return { notFound: true };
  };
}`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/common/lib/is-route-enabled.ts"
      />
      <MermaidDiagram
        chart={routeGatingDiagram}
        title="Why an ESPN Route 404s"
        caption="There are two independent 404 sources — a missing file and a falsy flag — and only the second is silent and reversible without a deploy."
        minHeight={400}
      />
      <p>
        <strong>42 of 79 ESPN pages are flag-gated</strong>, and several important flags are <em>false</em> in the ESPN baseline. In the ESPN Sparrow fixture: <code>enableCommerceUnifiedPlans: false</code>, <code>enableCommerceUnifiedWelcomeBack: false</code>, and <code>enableCommerceMembershipPause: false</code> (which kills <code>/commerce/pause</code>, <code>/commerce/pause/success</code>, and <code>/commerce/cancel/pause</code>). So a newcomer who boots the app, navigates to <code>/commerce/plans</code>, sees a 404, and concludes &quot;my local setup is broken&quot; is looking at correct behaviour.
      </p>
      <p>
        <strong>Diagnosis recipe</strong> for any ESPN 404 — three checks, in order:
      </p>
      <CodeBlock
        code={`# 1. Does the page file even exist for ESPN? (a missing file is a build-time 404)
ls apps/commerce/espn/pages/commerce/plans/

# 2. Which flag gates it? Read the page stub — the gate is always in the
#    buildGetServerSideProps([...]) array, right there in the ~28-line file.
grep -n "isRouteEnabled" apps/commerce/espn/pages/commerce/plans/index.page.tsx

# 3. What is that flag's value for THIS environment?
#    The fixture is only the mock/test baseline; real values come from Sparrow S3
#    at request time, keyed by the dss_backend_services backend (default: qa).
grep -n "enableCommerceUnifiedPlans" \\
  packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts

# Then confirm against the live config for another backend by switching it:
#   https://local.plus.espn.com:5004/commerce/plans?dss_backend_services=prod`}
        lang="bash"
        filename="diagnose-espn-404.sh"
      />
      <p>
        Two facts make that recipe necessary rather than optional. The fixture values are <strong>not authoritative</strong> — production and QA flag values live in S3, are fetched per request, and are LRU-cached (40 entries, 5 minutes) keyed by backend service. And <code>isRouteEnabled</code> <strong>does not short-circuit</strong>: all composition functions still run, and Sparrow (step 8) plus the dictionary (step 17) are already fetched before the <code>notFound</code> is returned at step 23. Your 404 costs a full config and dictionary fetch.
      </p>
      <p>
        A related landmine: the ESPN Playwright config probes <code>/commerce/billing-history</code> for readiness, not <code>/healthcheck</code>. If <code>enableCommerceUnifiedBillingHistory</code> ever flips false, the entire E2E suite fails to <em>start</em> rather than failing one test.
      </p>

      <h2 id="local-dev">Local Development</h2>
      <p>
        ESPN&apos;s dev script starts two processes with <code>concurrently</code>: Next on port <strong>5040</strong>, and a <code>wcs ssl-proxy</code> TLS terminator on port <strong>5004</strong>. You open the proxy, never Next directly:
      </p>
      <CodeBlock
        code={`# from the repo root
pnpm dev:commerce:espn                 # turbo dev --filter=@solo/commerce-espn
pnpm dev:commerce:integration:espn     # same, with NEXT_PUBLIC_API_MOCKING=enabled (MSW)

# ✅ the URL you actually open
open https://local.plus.espn.com:5004

# ❌ apps/commerce/AGENTS.md documents "https://local.espn.com" — that host does not exist.
#    It is absent from CERTIFICATE_DOMAINS in scripts/var/settings.sh, so it cannot work.

# Local Flex (the server-driven-UI BFF) has NO root script for ESPN — run it directly:
pnpm --filter @solo/commerce-espn dev:local-flex

# First-time setup (mkcert certs + /etc/hosts + MSW):
./scripts/setup
pnpm run setup configure msw`}
        lang="bash"
        filename="dev-espn.sh"
      />
      <ArticleTable
        caption="Local dev coordinates for all three commerce apps — ESPN is the only hostname carrying an extra subdomain segment."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>App</th>
              <th>Next port</th>
              <th>ssl-proxy port</th>
              <th>URL you open</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Disney+</td>
              <td>5010</td>
              <td>5001</td>
              <td><code>https://local.disneyplus.com:5001</code></td>
            </tr>
            <tr>
              <td>Hulu</td>
              <td>5030</td>
              <td>5003</td>
              <td><code>https://local.huluqa.com:5003</code></td>
            </tr>
            <tr>
              <td><strong>ESPN</strong></td>
              <td><strong>5040</strong></td>
              <td><strong>5004</strong></td>
              <td><code>https://local.plus.espn.com:5004</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>The failure mode that looks like a slow build.</strong> <code>dev:proxy</code> runs <code>wait-on -l http://local.plus.espn.com:5040/healthcheck</code> before binding the proxy. If <code>/etc/hosts</code> lacks the <code>127.0.0.1 local.plus.espn.com</code> mapping, <code>dev</code> <em>hangs</em> at &quot;waiting&quot; instead of failing. Run <code>./scripts/setup</code> first. Also note <code>pnpm -w check-commerce-secrets</code> gates <code>dev</code>: the app needs exactly two secrets in <code>.env.local</code> — <code>DAPI_SENSITIVE_SECRETS_API_KEY</code> and <code>REMOTE_CONFIG_S3_ACCESS_KEY</code> — sourced from Vault service <code>espnplus-commerce</code>.
      </p>
      <p>
        Two Docker-detected local modes are probed by the <code>local-setup</code> script: a running container named <code>traffic-director</code> flips <code>assetPrefix</code> to <code>/commerce/</code>, and one named <code>edge</code> sets <code>publicRuntimeConfig.isUsingLocalEdgeServer</code>. Both are hard-gated on <code>!isProd</code>, so neither can leak into a production build.
      </p>

      <h2 id="build-deploy">Build, Deploy, and CI Shape</h2>
      <ArticleTable
        caption="The ESPN identifiers you need to find logs, dashboards, and deploys — note the espnplus- prefix, the one place ESPN is not spelled 'espn'."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Thing</th>
              <th>ESPN value</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Jenkins / Fuzzbucket app</td>
              <td><code>espnplus-commerce</code> (job <code>fzb-espnplus-commerce</code>)</td>
              <td><code>ci/espnplus/commerce</code>, <code>ci/monorepough</code></td>
            </tr>
            <tr>
              <td>Datadog service (RUM)</td>
              <td><code>web-solo-commerce-espn</code></td>
              <td><code>next.config.js</code> <code>publicRuntimeConfig</code></td>
            </tr>
            <tr>
              <td>Datadog service (tracing / agent)</td>
              <td><code>espnplus-commerce</code></td>
              <td><code>.env</code> <code>DD_SERVICE</code></td>
            </tr>
            <tr>
              <td>Datadog CI test service</td>
              <td><code>cup_commerce/apps/espn</code></td>
              <td><code>.github/workflows/apps-lint-and-test.yml</code></td>
            </tr>
            <tr>
              <td>Static asset host</td>
              <td><code>espnplus-static.bamgrid.com</code></td>
              <td><code>ci/espnplus/commerce</code> <code>STATIC_ENDPOINT</code></td>
            </tr>
            <tr>
              <td>SonarQube project</td>
              <td><code>cgi-client:commerce-espn</code></td>
              <td><code>sonar-project.properties</code></td>
            </tr>
            <tr>
              <td>Deploy mechanism</td>
              <td><code>DEPLOY_WITH_MARINER: true</code>, <code>DEPLOY_WITH_JANUS: false</code>, <code>us-east-1</code> (+ <code>us-west-2</code> on prod branches)</td>
              <td><code>ci/espnplus/commerce</code></td>
            </tr>
            <tr>
              <td>Build output dir</td>
              <td><code>.next</code> (dev) / <code>build</code> (prod) / <code>build-test</code> (prod + Playwright mocking)</td>
              <td><code>next.config.js</code> <code>getDistDir()</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>The split that surprises everyone: GitHub Actions does the real checks, Jenkins stubs them out.</strong> In <code>ci/espnplus/commerce</code>, <code>CMD_LINT</code> is literally <code>echo lint and type-check run in GHA</code>, <code>CMD_TEST</code> is <code>echo unit tests run in GHA</code>, and <code>CMD_SONAR</code> is <code>echo skipping sonar</code>. Jenkins only installs, builds (<code>turbo build --filter=@solo/commerce-espn</code>), prunes (<code>pnpm --filter commerce-espn --prod deploy ./target</code> — note the <em>unscoped</em> filter, an inconsistency that happens to resolve), dockerizes that pruned <code>./target</code>, and deploys. So a red Jenkins build is an infra or build problem; a lint or test failure never appears there.
      </p>
      <p>
        The ESPN PR check is <strong>sharded</strong>: <code>.github/workflows/commerce-pr-checks-espn-sharded.yml</code> calls the shared sharded Playwright workflow with <code>tenant: espn</code>, <code>shard_count: 2</code>, and <code>coverage_threshold: 10</code>. Playwright itself runs <strong>HTTP-only</strong> against <code>http://localhost:5040</code> — the HTTPS variant is commented out with <code>TODO WEB-30985</code>. Anything requiring a secure browser context (parts of 3DS/SCA) therefore behaves differently under E2E than under the ssl-proxy dev setup.
      </p>
      <p>
        <strong>The 100%-coverage rule includes <code>next.config.js</code>.</strong> <code>apps/commerce/espn/jest.config.js</code> sets <code>coverageThreshold.global</code> to 100 on branches, functions, lines, and statements, and <code>collectCoverageFrom</code> lists <code>src/**</code>, <code>pages/api/footer-preview.api.ts</code>, <strong>and <code>next.config.js</code></strong>. That is why <code>next.config.test.js</code> exists. Editing the Next config without touching its test <strong>fails CI</strong> — a genuinely counter-intuitive rule the first time it happens to you.
      </p>
      <p>
        Finally, an ESPN-specific deploy fact worth knowing before you debug an environment: after every <code>main</code> deploy, a post-deploy hook clones <code>main</code> into the long-lived <code>partner-activation</code> branch. Changes reach that environment without a separate PR.
      </p>

      <h2 id="gotchas">Gotchas &amp; Traps</h2>
      <ul>
        <li>
          <strong>Grep pollution from build output.</strong> <code>apps/commerce/espn/.next/server/pages/**</code> (and <code>build/</code>, <code>build-test/</code>) contain <em>minified inlined copies of commerce-base source</em>, with every brand literal baked in. A repo-wide grep for <code>partnerName === &apos;espn&apos;</code> returns dozens of phantom hits in generated bundles and sends you editing nothing. Always exclude <code>.next</code>, <code>build</code>, <code>build-test</code>, and <code>node_modules</code> when hunting brand strings.
        </li>
        <li>
          <strong><code>pageExtensions: [&apos;page.tsx&apos;, &apos;api.ts&apos;]</code> is load-bearing.</strong> A new <code>foo.tsx</code> or <code>instrumentation.ts</code> in <code>pages/</code> is <em>silently ignored</em> — no error, just no route. It is also why co-located <code>*.test.tsx</code> files can live inside <code>pages/</code> without becoming routes.
        </li>
        <li>
          <strong><code>lint</code> depends on <code>^build</code>.</strong> The first <code>pnpm lint:commerce:espn</code> builds every upstream <code>@solo/*</code> package — minutes, not seconds. It is not hung.
        </li>
        <li>
          <strong>ESPN supports only <code>en</code> and <code>es-419</code>.</strong> Unknown URL languages silently fall back to <code>en</code>. Much of the i18n machinery in <code>commerce-base</code> is effectively inert for ESPN, so an i18n bug can hide here and surface on Disney+.
        </li>
        <li>
          <strong>ESPN&apos;s own config points at Disney and shared hosts.</strong> In the ESPN Sparrow config, <code>ripcut</code>, <code>ripcutRaw</code>, and <code>orchestrationUrl</code> all target <code>qa-disney.*</code> hosts, and <code>paths.commerce</code> carries Disney+ URLs (<code>disney_plan_selector</code>, <code>disney_plan_switch</code>, …) for cross-brand bundle hand-offs. Do not assume an <code>espn</code> host for every ESPN request.
        </li>
        <li>
          <strong>Two rewrites, zero redirects, one dynamic rewrite.</strong> <code>next.config.js</code> declares only the two healthcheck rewrites; the third is dynamic, in <code>middleware.page.tsx</code>, which strips the locale prefix and passes <code>language</code>/<code>locale</code> down as <strong>response</strong> headers that <code>getServerSideProps</code> reads back off <code>context.res</code>. That is why <code>/es-419/commerce/billing-history</code> works with no <code>[lang]</code> segment anywhere in <code>pages/</code>.
        </li>
        <li>
          <strong>Open question, stated honestly.</strong> The ESPN app declares a dependency on <em>both</em> <code>@solo/data-interface-espn</code> and <code>@solo/data-interface-disney</code>, but <code>src/layout/hydrate-data-interface.tsx</code> only builds the ESPN one. Whether the Disney interface is consumed at runtime by a cross-brand component or is dead weight is <strong>untraced</strong>. Do not remove it on the strength of a grep.
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: why three sibling apps instead of one tenant-parameterized app?"
        intro="A weak answer says 'separation of concerns'. A strong answer names the deploy-boundary reason first, then volunteers the cost — because the cost is what shows you have actually worked in the repo."
        steps={[
          "Open with the deploy boundary: three brands with different release cadences, on-call rotations, and risk appetites cannot share one deploy artifact. Splitting at the Next.js app boundary gives per-brand Jenkins pipelines, per-brand rollback, and per-brand bundle budgets.",
          "Name what is NOT duplicated: all page components, hooks, layouts, themes, and the getServerSideProps builder live in @solo/commerce-base. Each app is a routing plus configuration manifest of ~20-30-line stubs.",
          "State the cost concretely and with numbers: page drift. 121 distinct routes across three apps, only 46 present in all three; ESPN 79, Disney+ 106, Hulu 63. Some gaps are intentional (Hulu's separate identity stack), some are spelling artifacts, and three routes are missing from ESPN with no ticket explaining why.",
          "Explain how divergence is expressed instead of branched: there are zero if (product === 'espn') branches in the shared pipeline. Brand differences are table and config lookups — productConfigMap, metadataByProduct, the Sparrow workspace name, dictionaryTenant.",
          "Close with the production implication: because behaviour is shared, a one-line fix for an ESPN bug ships to Disney+ and Hulu simultaneously. Your first triage question on any ticket is 'shell change or commerce-base change?', because the two have completely different blast radius.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: how does a multi-tenant frontend know which brand it is?"
        intro="Interviewers want to hear that it is not one enum. The tell of real experience is bringing up the namespace mismatch unprompted, and knowing which brand is the dangerous one to test against."
        steps={[
          "Start with the primary switch: a server-only process.env.PRODUCT, typed as ProductName = 'disneyPlus' | 'hulu' | 'espn', declared in the app's committed .env and included in the Turbo build cache key so brand builds cannot collide.",
          "Then say the important part: there is no single brand enum. PRODUCT coexists with the Glimpse/session partner name, the footer/Flex tenant string, ThemeName, the MetadataAppName key, and the Sparrow workspace name — each with its own literal set.",
          "Deliver the trap: ESPN's literals all coincide on 'espn', while Disney+ is 'disneyPlus' as product and theme but 'disney' as partner, tenant, and metadata key. A brand-check bug can therefore pass every ESPN test and still break Disney+ — so never validate a brand check against ESPN alone.",
          "Distinguish app identity from session identity: partnerName comes from the BAMTech session, not from env, so an ESPN-app request can legitimately observe partnerName === 'disney' (a Disney+ subscriber managing an ESPN-linked account). partnerName never answers 'which app am I'.",
          "Finish with the silent-default failure mode: commerce-base's next.config.js uses process.env.PRODUCT ?? 'disneyPlus' and getProductNameForMocks falls back the same way. Only getInitialGlimpseConfig throws. A missing PRODUCT yields Disney+ mocks and config instead of an error.",
        ]}
      />

      <h2 id="challenge">Challenge: Ship a Flag-Gated ESPN Page</h2>
      <InterviewChallenge
        title="Add /commerce/loyalty to the ESPN commerce app"
        scenario={
          <>
            Product wants a new ESPN page at <code>/commerce/loyalty</code>, dark-launched behind a flag and rolled out per environment. The page component already exists in <code>@solo/commerce-base/src/signup/pages</code> as <code>LoyaltyPage</code>. It needs the site header without a border, the global footer, and authentication. A teammate has already opened a PR adding <code>apps/commerce/espn/pages/commerce/loyalty.tsx</code> with 180 lines of JSX, a <code>fetch</code> inside a <code>useEffect</code>, and an <code>if (process.env.PRODUCT === &apos;espn&apos;)</code> guard around the header. You are the reviewer.
          </>
        }
        tasks={[
          "Write the correct file: give its exact path and the full ~28-line stub, including the re-export, the layout-config composition function, and the flag gate. Say which of those declarations the app owns and which it delegates.",
          "Name three defects in the existing PR beyond 'it is too long', and say what each one actually breaks at runtime.",
          "The author says 'it works locally but 404s on QA'. Give the three-step diagnosis you would ask them to run, and explain why the local fixture value is not evidence about QA.",
          "The page must call an API. Say where in the provider tree that network call has to happen for MSW-backed integration and E2E runs to work, and what happens if it happens outside that boundary.",
          "The author also wants a tenant check so the page can be reused by Disney+ later. Explain why validating that check on ESPN alone is worthless, and which namespace literals you would assert on instead.",
        ]}
        pitfalls={[
          "Naming the file loyalty.tsx instead of loyalty.page.tsx — pageExtensions is ['page.tsx','api.ts'], so the route silently does not exist, with no error to debug.",
          "Importing buildGetServerSideProps from @solo/commerce-base directly. An ESLint no-restricted-imports rule blocks it, and you lose both ESPN behaviours: the SSR dictionary-key allowlist and footer-preview injection.",
          "Assuming isRouteEnabled short-circuits the pipeline. It does not — Sparrow and the dictionary are still fetched before the notFound is returned.",
          "Reading a flag value out of the __fixtures__ Sparrow file and treating it as the QA or prod value. The fixture is the mock/test baseline only; real values come from S3 per request, keyed by the dss_backend_services backend.",
          "Putting page logic in the app instead of commerce-base — it makes the page un-shareable and puts brand-agnostic behaviour behind a brand-specific deploy.",
          "Writing the tenant check with a ProductName literal where a tenant or partner literal is required. It passes on ESPN because every ESPN literal is 'espn', and breaks on Disney+ where it is disneyPlus vs disney.",
        ]}
        signal="The candidate treats the app as a manifest and instinctively pushes behaviour down into commerce-base; knows pageExtensions is load-bearing; knows the wrapper is mandatory and can say what it adds; separates the two 404 sources (missing file vs falsy flag) and knows the fixture is not the environment; puts network I/O inside BrowserMocks; and refuses to accept ESPN-only validation for a brand check."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. The correct file</strong> — <code>apps/commerce/espn/pages/commerce/loyalty/index.page.tsx</code> (the directory form matches the existing convention). The app owns only routing and configuration; markup and data fetching are delegated to <code>commerce-base</code>:
        </p>
        <CodeBlock
          code={`import { type PartialLayoutConfig } from '@solo/commerce-base/src/common/layouts';
import { isRouteEnabled } from '@solo/commerce-base/src/common/lib/is-route-enabled';

import { buildGetServerSideProps } from '../../../src/common/build-get-server-side-props';

export { LoyaltyPage as default } from '@solo/commerce-base/src/signup/pages';

const getLayoutConfigProp = (): {
  props: { layoutConfig: PartialLayoutConfig };
} => ({
  props: {
    layoutConfig: {
      visualLayout: {
        header: { type: 'siteHeader', showBorder: false, showGradientOnMobile: false },
        footer: { show: true, type: 'global' },
      },
    },
  },
});

export const getServerSideProps = buildGetServerSideProps([
  isRouteEnabled({ featureFlagName: 'enableCommerceUnifiedLoyalty' }),
  getLayoutConfigProp,
]);`}
          lang="tsx"
          filename="apps/commerce/espn/pages/commerce/loyalty/index.page.tsx"
        />
        <p>
          Authentication needs no code: <code>PageLayout</code> defaults <code>isLoginRequired</code> to <code>true</code>. The new flag name must also be added to <code>RouteEnablingFeatureFlagsList</code> in <code>is-route-enabled.ts</code> or the type rejects it — that is a <code>commerce-base</code> change, and it is shared.
        </p>
        <p>
          <strong>2. Three defects.</strong> <code>loyalty.tsx</code> does not match <code>pageExtensions</code>, so the route silently does not exist — the author gets a 404 and no error message. The 180 lines of JSX belong in <code>commerce-base</code>; in the app they cannot be reused by Disney+ or Hulu and they sit behind an ESPN-only deploy. And the <code>if (process.env.PRODUCT === &apos;espn&apos;)</code> guard is server-only — <code>process.env.PRODUCT</code> does not exist in the browser, so on the client that condition is falsy and the header renders differently after hydration. Brand values reach the client via <code>publicRuntimeConfig</code>, and even there <code>productNameForMocks</code> is deliberately <code>undefined</code> in production. Bonus defect: the <code>fetch</code> in <code>useEffect</code> bypasses React Query, the app&apos;s server-state layer.
        </p>
        <p>
          <strong>3. The 404 diagnosis.</strong> (a) Confirm the file exists and is named <code>*.page.tsx</code>. (b) Read the gate out of the stub — <code>grep -n isRouteEnabled</code> on the page file. (c) Resolve the flag&apos;s value <em>for that environment</em>. The fixture at <code>packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts</code> is only the mock and unit-test baseline; the real value is fetched from Sparrow S3 at request time from workspace <code>commerce-espn</code>, variant = the resolved backend service (default <code>qa</code>), LRU-cached for five minutes. So &quot;it works locally&quot; means the local fixture or local backend said true; QA can disagree, and the fix is then a Sparrow config change, not a code change.
        </p>
        <p>
          <strong>4. Where the API call must live.</strong> Inside <code>&lt;BrowserMocks&gt;</code>. That component is the MSW gate; in integration mode (<code>NEXT_PUBLIC_API_MOCKING=enabled</code>) and under Playwright (<code>=playwright</code>) it installs the service worker. Anything rendering outside it performs unmocked network I/O against real services, which makes E2E flaky and can hit real payment or identity backends. In practice the call happens inside the page component — nested under <code>BrowserMocks</code> via <code>ESPNLayout</code> or <code>LegacyApplicationLayout</code> — through React Query, never in a module-scope side effect and never above the layout.
        </p>
        <p>
          <strong>5. Why ESPN-only validation is worthless.</strong> Every ESPN brand literal is the same string, <code>espn</code> — product, partner, tenant, theme, metadata key. A check that confuses two namespaces still passes on ESPN. Disney+ is the brand that disagrees with itself: <code>disneyPlus</code> as <code>ProductName</code> and <code>ThemeName</code>, but <code>disney</code> as <code>partner</code>, <code>tenant</code>, and <code>MetadataAppName</code> key — and <code>commerce-disneyplus</code> as the Sparrow workspace. Assert on the Disney+ pair explicitly (<code>disneyPlus</code> → <code>disney</code>) and, separately, remember that <code>partnerName</code> is session-derived, so it can legitimately be <code>disney</code> on an ESPN request.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Commerce is three sibling Next.js apps — <code>apps/commerce/&#123;disneyPlus,hulu,espn&#125;</code> — each with its own config, pages, middleware, Dockerfile, and Jenkins job, all sharing <code>@solo/commerce-base</code>. You buy independent deploys and rollback; you pay in page drift (121 distinct routes, only 46 shared).
        </li>
        <li>
          ESPN pages are ~20&ndash;30-line stubs that re-export a <code>commerce-base</code> page and call <code>buildGetServerSideProps([...])</code>. The app is a routing plus configuration manifest; the behaviour is in the shared library — so most ESPN bug fixes ship to all three brands.
        </li>
        <li>
          There is no single brand enum. <code>PRODUCT</code>/<code>ProductName</code>, Glimpse <code>partner</code>/<code>partnerName</code>, footer/Flex <code>tenant</code>, and <code>ThemeName</code> are separate namespaces. ESPN&apos;s all coincide on <code>espn</code>; Disney+&apos;s do not (<code>disneyPlus</code> vs <code>disney</code>) — so a brand-check bug can pass every ESPN test and still break Disney+.
        </li>
        <li>
          The shared <code>getServerSideProps</code> pipeline has <strong>zero</strong> <code>if (product === &apos;espn&apos;)</code> branches — divergence is table and config lookups. ESPN&apos;s wrapper adds exactly two things: the generated SSR dictionary-key allowlist, and footer-preview injection with a silent <code>catch</code>.
        </li>
        <li>
          42 of 79 ESPN pages are flag-gated via <code>isRouteEnabled</code> → <code>&#123; notFound: true &#125;</code>, and several key flags are off in the baseline. Your first 404 is probably correct behaviour: check the file exists, read the gate from the stub, then resolve the flag for that environment — fixture values are not environment values.
        </li>
        <li>
          Operationally: open <code>https://local.plus.espn.com:5004</code> (not the <code>local.espn.com</code> the docs claim); GitHub Actions runs lint, type-check, and tests while Jenkins stubs them with <code>echo</code>; Jest enforces 100% coverage including <code>next.config.js</code>; and never grep for brand strings without excluding <code>.next</code>/<code>build</code>, which hold minified inlined copies of <code>commerce-base</code>.
        </li>
      </ul>
    </div>
  );
}
