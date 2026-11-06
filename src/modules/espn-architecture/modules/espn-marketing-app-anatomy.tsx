import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const routeCollapseDiagram = String.raw`flowchart LR
  subgraph URLS["Public URLs — every one authored in the CMS"]
    U1["/"]
    U2["/soccer"]
    U3["/mlbtv"]
    U4["/changeplans"]
    U5["/business-jhp"]
  end
  U1 --> P
  U2 --> P
  U3 --> P
  U4 --> P
  U5 --> P
  P["The optional catch-all page<br/>7 lines — re-exports only"] --> V["views/landing-page.tsx<br/>the single page component"]
  V --> D["StitchDocument built from<br/>whatever CMS JSON came back"]
  D --> O["Different pixels per URL<br/>identical React code path"]`;

const middlewareDiagram = String.raw`flowchart TD
  R["Incoming request"] --> M{"Matcher — skip api, healthcheck,<br/>_next/static, mockServiceWorker"}
  M -->|"skipped"| PASS["Straight through to Next"]
  M -->|"matched"| L1{"Uppercase in pathname?"}
  L1 -->|"yes"| X1["308 → lowercased URL"]
  L1 -->|"no"| L2{"Two-char language in URL?"}
  L2 -->|"en or es"| X2["307 → en-us / es-us form"]
  L2 -->|"anything else"| X3["307 → strip the language"]
  L2 -->|"none"| L3{"URL carries en-us?"}
  L3 -->|"yes"| X4["308 → URL without the locale"]
  L3 -->|"no"| L4{"Path is /homepage?"}
  L4 -->|"yes"| X5["308 → /"]
  L4 -->|"no"| L5{"Path under /restricted?"}
  L5 -->|"prod, no bypass cookie"| X6["Rewrite to /404, status 404"]
  L5 -->|"allowed, or not restricted"| L6{"Non-default locale present?"}
  L6 -->|"yes"| RW["Rewrite to locale-less pathname"]
  L6 -->|"no"| H["Append 6 headers to the response"]
  RW --> H
  H --> G["getServerSideProps reads them back"]`;

const gsspStateDiagram = String.raw`stateDiagram-v2
  [*] --> ReadHeaders
  ReadHeaders: Read edge headers via getCommonHeaders
  ReadHeaders --> GetConfigs
  GetConfigs: Sparrow — paths, featureConfig, countries
  GetConfigs --> Error500 : isErr, throw
  GetConfigs --> Localization
  Localization: Geo and language rules from config.countries
  Localization --> Redirect : locale redirect
  Localization --> ResolveRoute
  ResolveRoute: Map / to homepage, build 4 CMS instance configs
  ResolveRoute --> FetchData
  FetchData: Promise.all — page content plus redirects lookup
  FetchData --> Error500 : CMS failure, throw
  FetchData --> Vanity
  Vanity --> Redirect : CMS redirect record found
  Vanity --> CmsContent
  CmsContent: Normalise pathResult into a CMSPayload
  CmsContent --> NotFound : path not valid
  CmsContent --> PreviewCheck
  PreviewCheck: In prod the preview id must equal the content id
  PreviewCheck --> Redirect : strip preview param, 302
  PreviewCheck --> Context
  Context: Dictionary strings plus AppContext for ESPN
  Context --> OfferTokens
  OfferTokens: Replace price placeholders with formatted prices
  OfferTokens --> Error500 : replacement error, throw
  OfferTokens --> PageProps
  PageProps: StitchDocument, footer props, debug block
  PageProps --> Error500 : throw
  PageProps --> ReturnProps
  ReturnProps: setCacheHeaders then tagPropsSize
  ReturnProps --> [*]
  Redirect --> [*]
  NotFound --> [*]
  Error500 --> [*]`;

const renderStackDiagram = String.raw`flowchart TD
  CMS["CMS JSON nodes — _type from Cannonball,<br/>_contentType from Spaceball"] --> NORM["cannonballDataProcessor<br/>normalises everything to _type"]
  NORM --> BSD["stitch/build-stitch-document.ts<br/>zod validate, then run builders"]
  BSD --> SD["StitchDocument<br/>preContent · mainContent · postContent<br/>modals · metadata · styleOverrides"]
  SD --> LP["views/landing-page.tsx<br/>renders each slot in order"]
  LP --> SC["StitchComponent per node"]
  SC --> REG["Stitch component registry"]
  REG --> DEF["Default bindings — planCard maps to<br/>PlanCard from growth-components"]
  REG --> OVR["ESPN overrides — entitledContent ·<br/>slider adapter · image srcset"]
  BSD -.->|"ZodError logs stitchWarn and continues"| SD`;

const themeChainDiagram = String.raw`flowchart LR
  TW["tailwind.config.cjs<br/>19 lines — content, presets, plugins"] --> PRE["cgi-design-components/src/presets/espn.ts"]
  PRE --> THM["cgi-design-components/src/themes/espn.ts"]
  THM --> TOK["@solo/cgi-design-tokens<br/>colours · spacing · type scale"]
  TW --> PLG["growth-components/tailwind/plugins/espn.ts"]
  PLG --> FNT["font-benton for body and labels<br/>font-ignite for headlines"]
  APP["application-layout.tsx at module scope"] --> BP["configureBreakpoints espn<br/>runtime JS registry, not Tailwind"]`;

export const toc: TocItem[] = [
  { id: "where-the-app-lives", title: "Where the App Lives", level: 2 },
  { id: "directory-anatomy", title: "Directory Anatomy", level: 2 },
  { id: "one-route", title: "One Route to Rule Them All", level: 2 },
  { id: "route-inventory", title: "The Real Route Inventory", level: 2 },
  { id: "file-routes", title: "File-Level Routes", level: 3 },
  { id: "cms-routes", title: "CMS-Level Routes", level: 3 },
  { id: "edge-layer", title: "The Edge Layer: Middleware", level: 2 },
  { id: "gssp-pipeline", title: "The getServerSideProps Pipeline", level: 2 },
  { id: "failure-strategy", title: "The Throw-On-Failure Strategy", level: 3 },
  { id: "rendering-stack", title: "The Rendering Stack", level: 2 },
  { id: "brand-tokens", title: "Where ESPN's Brand Actually Lives", level: 2 },
  { id: "local-dev", title: "Running It Locally (and the README Trap)", level: 2 },
  { id: "gotchas", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Hands-On Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnMarketingAppAnatomy() {
  return (
    <div className="article-content">
      <p>
        This is a walking tour of <code>plus.espn.com</code>, the sales layer
        between ESPN&apos;s content site and Disney&apos;s checkout. If you expect
        the codebase to mirror the sitemap, brace yourself:{" "}
        <strong>29 public marketing URLs are served by one seven-line page file.</strong>{" "}
        Which sport, which plans, which price, which locale — all data. Internalise
        that and the app stops feeling mysterious and starts feeling small.
      </p>

      <h2 id="where-the-app-lives">Where the App Lives</h2>
      <p>
        The app is <code>apps/marketing-unified/espn</code> in the{" "}
        <code>cgi-web</code> monorepo, published as{" "}
        <code>@solo/marketing-unified-espn</code>. It is a Next.js{" "}
        <strong>Pages Router</strong> app — not App Router — sitting beside two
        siblings with the same architecture, <code>disneyplus</code> and{" "}
        <code>hulu</code>. That shared architecture is <strong>NEXUS</strong>,
        described in <code>apps/marketing-unified/README.md</code> as &quot;the
        unified marketing website platform serving Disney+, Hulu, and ESPN landing
        and content pages.&quot; NEXUS is not a framework you import: it is the
        same Next.js shape, CMS integration and component system, plus shared
        packages under <code>packages/marketing/*</code>. Brand differences are
        configuration and registry overrides, never forks.
      </p>
      <p>
        One boundary up front, because it saves hours of searching:{" "}
        <strong>this app never calls a commerce API.</strong> It does not price
        plans, build checkout URLs, or know what a cart is. The hand-off to
        commerce is a plain <code>href</code> typed into the CMS by a content
        author, pointing at{" "}
        <code>secure.web.plus.espn.com/commerce/billing?pref=&lt;package_id&gt;</code>
        . Prices are placeholder tokens substituted server-side. If you are hunting
        for pricing logic here, there is none to find.
      </p>

      <h2 id="directory-anatomy">Directory Anatomy</h2>
      <p>
        Read the tree as a claim about where complexity lives: nearly all of it is
        in one view directory.
      </p>
      <CodeBlock
        code={`apps/marketing-unified/espn/
├── AGENTS.md              # 16 lines — a pointer to README.md
├── README.md              # the real context file (and partly stale — see below)
├── next.config.js         # 136 lines, and it has its own unit test file
├── tailwind.config.cjs    # 19 lines: content globs + preset + plugin. No colours.
├── jest.config.js         # 100% branch/line/function/statement thresholds
├── public/                # ONLY favicon.ico + mockServiceWorker.js
├── playwright/tests/pages/{olp,olp-sp,mlp,mlp-sp}.spec.ts
└── src/
    ├── middleware.page.ts          # the edge layer
    ├── pages/                      # 11 files, only ONE of which serves content
    ├── views/
    │   ├── landing-page.tsx        # 132 lines — the page component
    │   ├── landing-page/            # the orchestrator + all its steps
    │   └── {error-page,denied-page}.tsx
    ├── shared/                     # layouts, error-handler, types, constants
    ├── libs/                       # datadog-rum.ts, logger-with-datadog.ts
    └── mocks/                      # MSW handlers + CMS JSON fixtures`}
        lang="text"
        filename="espn-app-tree.txt"
      />
      <p>
        Two load-bearing signals. <code>public/</code> holds two files and no
        imagery — every asset is remote (<code>a.espncdn.com</code>,{" "}
        <code>static-assets.bamgrid.com</code>, Ripcut). And{" "}
        <code>src/views/landing-page/get-server-side-props.ts</code> is 447 lines,
        the densest file in the app and the right starting point for any &quot;why
        is this page doing that&quot; investigation.
      </p>

      <h2 id="one-route">One Route to Rule Them All</h2>
      <p>
        Here is the thing that trips people up. Asked to &quot;fix the NFL bundle
        page,&quot; a newcomer opens <code>src/pages/</code>, looks for{" "}
        <code>nflbundle.page.tsx</code>, does not find it, and assumes they are in
        the wrong repo. There is no per-sport file. There never was. The entire
        content surface is one optional catch-all:
      </p>
      <CodeBlock
        code={`import { getPageLayout } from '../shared/layout';
import { LandingPage } from '../views/landing-page';

LandingPage.getLayout = getPageLayout;

export { getServerSideProps } from '../views/landing-page/get-server-side-props';
export { LandingPage as default } from '../views/landing-page';`}
        lang="tsx"
        filename="src/pages/[[...path]].page.tsx"
      />
      <p>
        Seven lines, three of them re-exports. The <em>optional</em> catch-all
        (double brackets) is what lets it own <code>/</code> as well as{" "}
        <code>/soccer</code> and <code>/partner-program/welcome</code>. It attaches
        a layout, delegates server work to the orchestrator, and delegates
        rendering to one view.
      </p>
      <MermaidDiagram
        chart={routeCollapseDiagram}
        title="29 URLs Collapse Into One Code Path"
        caption="Notice the branching happens in data, not in files — every URL walks the same React tree."
        minHeight={400}
      />
      <p>
        <strong>Why build it this way?</strong> The people who ship marketing pages
        are content authors, not engineers. A file-per-route design makes a new{" "}
        <code>/wnba</code> page cost a PR, a review, a deploy and an
        engineer&apos;s afternoon; a single-route design makes it a publish action.
        The engineering cost is real and you should be able to name it:{" "}
        <strong>you lose compile-time knowledge of your own sitemap.</strong> No
        test in this repo can assert that <code>/nflbundle</code> exists, that its
        CTA points at a valid package id, or that its layout is intact. The route
        inventory lives in the CMS, and the CMS is not typechecked.
      </p>

      <h2 id="route-inventory">The Real Route Inventory</h2>
      <p>
        &quot;What pages does this app serve?&quot; therefore has two answers, and
        you need both.
      </p>

      <h3 id="file-routes">File-Level Routes</h3>
      <p>
        Only <code>*.page.tsx</code>, <code>*.page.ts</code> and{" "}
        <code>*.api.ts</code> are routed — that is <code>pageExtensions</code> in{" "}
        <code>next.config.js</code>. A plain <code>.tsx</code> in{" "}
        <code>src/pages/</code> is invisible to the router, which is also why the
        middleware keeps its suffix as <code>src/middleware.page.ts</code>.
      </p>
      <ArticleTable
        caption="Every routed file in the app. Exactly one of them serves content."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Route</th><th>File</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><code>{"/*"}</code> — everything</td><td><code>src/pages/[[...path]].page.tsx</code></td><td>The optional catch-all, server-rendered per request via GSSP.</td></tr>
            <tr><td><code>/404</code></td><td><code>src/pages/404.page.tsx</code></td><td>Static, renders <code>ErrorPage</code> under <code>getErrorLayout</code>.</td></tr>
            <tr><td><code>/500</code></td><td><code>src/pages/500.page.tsx</code></td><td>Static &quot;Page Not Available&quot; — target of every deliberate GSSP throw.</td></tr>
            <tr><td><code>/denied</code></td><td><code>src/pages/denied.page.tsx</code></td><td>Geo-blocked market page.</td></tr>
            <tr><td><code>/healthcheck</code></td><td>rewrite → <code>src/pages/api/healthcheck.api.ts</code></td><td>Load-balancer probe; the dev SSL proxy waits on it before starting.</td></tr>
            <tr><td><code>/akamai-healthcheck</code></td><td>rewrite → <code>src/pages/api/akamai-healthcheck.api.ts</code></td><td>Akamai origin probe.</td></tr>
            <tr><td><code>/api/footer-preview</code></td><td><code>src/pages/api/footer-preview.api.ts</code></td><td>Two lines — delegates to <code>createFooterPreviewHandler()</code> from <code>@solo/footer/api</code>.</td></tr>
            <tr><td>—</td><td><code>_app.page.tsx</code> / <code>_document.page.tsx</code></td><td>RUM init, MSW bootstrap, layout dispatch; <code>&lt;Html lang&gt;</code> from the middleware headers.</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="cms-routes">CMS-Level Routes</h3>
      <p>
        The interesting inventory is the CMS one. The best evidence in the repo is
        the Cannonball manifest fixture at{" "}
        <code>src/mocks/apis/cnbl-lps-manifest.json</code> — a snapshot of real
        production route keys, captured so MSW can serve them. It holds{" "}
        <strong>29 routes</strong>, and every URL is the route key with a leading
        slash, with exactly one exception: the homepage. Its CMS slug is{" "}
        <code>homepage</code>, its public URL is <code>/</code>, and the
        translation happens in both directions. Forward, in the orchestrator:
      </p>
      <CodeBlock
        code={`const isHomePage = pathname === '/';
const cannonballPath = isHomePage
  ? 'homepage'
  : pathname.replace(/^\\//, ''); // Remove leading slash`}
        lang="typescript"
        filename="src/views/landing-page/get-server-side-props.ts"
      />
      <p>
        Backward, in the middleware: a request for <code>/homepage</code> gets a
        308 to <code>/</code>, so the CMS slug is never publicly addressable and
        you cannot end up with two URLs serving one page.
      </p>
      <ArticleTable
        caption="All 29 CMS routes grouped by purpose. Locales are en-US unless noted."
        minWidth={900}
      >
        <table>
          <thead>
            <tr><th>Purpose</th><th>CMS route keys</th><th>Locales beyond en-US</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Home / OLP</strong> (1)</td><td><code>homepage</code> — served at <code>/</code></td><td>es-US</td></tr>
            <tr><td><strong>Sport &amp; league MLPs</strong> (12)</td><td><code>soccer</code>, <code>nfl</code>, <code>nhl</code>, <code>mlbtv</code>, <code>golf</code>, <code>cfb</code>, <code>cbb</code>, <code>tennis</code>, <code>ufc</code>, <code>wwe</code>, <code>pfl</code>, <code>originals</code></td><td><code>soccer</code>: es-US, en, es · <code>mlbtv</code>: en, es, es-US · <code>ufc</code>/<code>wwe</code>: es-US · <code>originals</code>: en</td></tr>
            <tr><td><strong>Bundle &amp; plan comparison</strong> (3)</td><td><code>bundle</code>, <code>nflbundle</code>, <code>changeplans</code></td><td>—</td></tr>
            <tr><td><strong>Partner &amp; B2B</strong> (5)</td><td><code>foxone</code>, <code>business-everpass</code>, <code>business-jhp</code>, <code>partner-program</code>, <code>partner-program/welcome</code></td><td>—</td></tr>
            <tr><td><strong>Legal</strong> (3)</td><td><code>additionaltermsapply</code>, <code>bundletermsapply</code>, <code>foxoneadditionalterms</code></td><td>—</td></tr>
            <tr><td><strong>Restricted / gated</strong> (3)</td><td><code>restricted/ryans-test</code>, <code>restricted/test-dtc</code>, <code>restricted/test-sarah</code></td><td>—</td></tr>
            <tr><td><strong>Utility / QA</strong> (2)</td><td><code>app</code>, <code>images/test</code></td><td><code>images/test</code>: en only</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note what is <em>not</em> there: no plan page. Plan cards are a CMS
        component type dropped onto whichever landing pages need them — most
        obviously <code>/</code>, <code>/changeplans</code>, <code>/bundle</code>{" "}
        and <code>/nflbundle</code>. Which pages contain them is authored, not
        coded, so the repo cannot answer that definitively.
      </p>

      <h2 id="edge-layer">The Edge Layer: Middleware</h2>
      <p>
        Before any React runs, <code>src/middleware.page.ts</code> (179 lines)
        normalises the URL and enriches the request. Its matcher excludes API
        routes, the healthcheck, <code>_next/static</code> and{" "}
        <code>mockServiceWorker</code> — the last one deliberately, because MSW
        needs its filename&apos;s casing preserved.
      </p>
      <MermaidDiagram
        chart={middlewareDiagram}
        title="Middleware Decision Chain"
        caption="Notice the mix of 308s, 307s and one silent rewrite — only the rewrite leaves the user's URL alone."
        minHeight={550}
      />
      <p>
        The redirect-versus-rewrite distinction near the end is the subtle part.
        Locale normalisation <em>redirects</em> (the browser URL changes), but a
        legitimate non-default locale such as <code>/es-us/soccer</code> is{" "}
        <em>rewritten</em> to the locale-less path so the catch-all can handle it:
        the user keeps their localised URL while the app only ever sees one route
        shape. Middleware&apos;s final act is header injection — the only channel
        through which geo and locale reach <code>getServerSideProps</code>.
      </p>
      <CodeBlock
        code={`// Add locale data to headers for later app use
response.headers.append('disable-redirect', disableRedirect);
response.headers.append('physical-location', physicalLocation.toUpperCase());
response.headers.append('language', lang);
response.headers.append('region', locale);
response.headers.append('pathname', globalizedPathname ?? nextUrl.pathname);
response.headers.append('url', nextUrl.pathname);`}
        lang="typescript"
        filename="src/middleware.page.ts"
      />
      <ArticleTable
        caption="The six headers middleware writes, and what each one drives downstream."
        minWidth={880}
      >
        <table>
          <thead>
            <tr><th>Header</th><th>Value</th><th>What reads it</th></tr>
          </thead>
          <tbody>
            <tr><td><code>physical-location</code></td><td>Uppercased country code. Precedence: <code>dss-physical-country</code> header → <code>x-aka-user-geo</code> (Akamai) → default <code>US</code>; overridable by <code>?dss-physical-country=</code>.</td><td>Localisation rules and the geo gate that can send a user to <code>/denied</code>.</td></tr>
            <tr><td><code>language</code> / <code>region</code></td><td>Parsed by <code>geoNext()</code> from <code>@solo/lang-locale-next</code>; GSSP recombines them into a language-region locale string.</td><td>CMS locale selection, dictionary lookup, analytics edition.</td></tr>
            <tr><td><code>pathname</code></td><td>The path with the locale stripped.</td><td>The CMS route lookup — this becomes the Cannonball / Spaceball route key.</td></tr>
            <tr><td><code>url</code></td><td>The full path including the locale, if present.</td><td>Canonical URL construction and page metadata.</td></tr>
            <tr><td><code>disable-redirect</code></td><td><code>true</code> / <code>false</code>, settable by header or query param.</td><td>Escape hatch that suppresses localisation redirects — useful when debugging a geo loop.</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Server-side the read-back is one call, imported from{" "}
        <code>@solo/growth-utils/get-common-headers</code>:
      </p>
      <CodeBlock
        code={`const {
  isRedirectDisabled,
  pathname,
  language,
  region,
  physicalLocation,
  url: pathnameWithLocale,
} = getCommonHeaders(res);`}
        lang="typescript"
        filename="src/views/landing-page/get-server-side-props.ts"
      />
      <p>
        Because the contract is headers-on-a-response rather than typed arguments,
        a middleware change that renames or drops a header fails at runtime, not at
        build time. If a page suddenly thinks every visitor is in the US, suspect
        the header chain before the geo service.
      </p>

      <h2 id="gssp-pipeline">The getServerSideProps Pipeline</h2>
      <p>
        <code>src/views/landing-page/get-server-side-props.ts</code> is the
        orchestrator: 447 lines wrapped in a single Datadog span named{" "}
        <code>getServerSideProps</code>, tagged{" "}
        <code>contentType: &apos;landing&apos;</code>. Each step delegates to a
        small file under{" "}
        <code>src/views/landing-page/get-server-side-props/</code>, which is why
        that directory holds thirty-odd files. Order matters: several steps return
        early, and the cheap checks come first on purpose.
      </p>
      <MermaidDiagram
        chart={gsspStateDiagram}
        title="GSSP Steps and Every Way Out"
        caption="Notice there are four terminal states, not one — props, redirect, notFound, and a thrown 500."
        minHeight={550}
      />
      <ArticleTable
        caption="The four steps that carry the most behaviour, and how each one fails."
        minWidth={900}
      >
        <table>
          <thead>
            <tr><th>Step</th><th>What it does</th><th>Failure mode</th></tr>
          </thead>
          <tbody>
            <tr><td><code>get-configs.ts</code></td><td>Pulls Sparrow remote config (scope <code>ESPN_NEXUS</code>, workspace <code>Growth</code>): CMS <code>paths</code>, <code>featureConfig</code> flags, and the <code>countries</code> table that drives localisation.</td><td>Throws → <code>/500</code>. Nothing downstream works without it.</td></tr>
            <tr><td><code>get-page-data.ts</code></td><td>The migration seam. One ternary on <code>enableSpaceball</code> picks <code>checkPathInSpaceball</code> (one GraphQL POST) or <code>checkPathInCannonball</code> (CDN manifest + snapshot); both return the same <code>pageData</code> shape. Page content and the redirects lookup run in parallel via <code>Promise.all</code>.</td><td>Throws → <code>/500</code>. An invalid path instead returns <code>notFound</code>.</td></tr>
            <tr><td><code>get-cms-content-with-tokens-replaced.ts</code></td><td>Substitutes CMS price placeholders such as <code>{"{{espn_unlimited_monthly.price}}"}</code> via <code>@solo/plans-pricing-api</code>, and emits the substitution count as span tag <code>tokens_replaced</code>.</td><td>Errors throw → <code>/500</code>; but an unconfigured <code>global</code> instance is <em>skipped</em>, leaving raw tokens on screen.</td></tr>
            <tr><td><code>get-page-props.ts</code></td><td>Builds the <code>StitchDocument</code>, fetches footer content, and attaches a <code>debug</code> block with a deep-link back into the CMS for the publishing author.</td><td>Throws → <code>/500</code>.</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="failure-strategy">The Throw-On-Failure Strategy</h3>
      <p>
        This is the most counter-intuitive decision in the file, and the one most
        likely to get &quot;helpfully fixed.&quot; Config, CMS, token-replacement
        and props failures all do the same thing: <strong>throw</strong>.
      </p>
      <CodeBlock
        code={`if (configResult.isErr()) {
  logger.error({ err: configResult.error }, 'Failed to fetch configs');

  // we need to throw here to render the 500 page in production
  throw new Error(\`Failed to fetch configs: \${configResult.error}\`);
}`}
        lang="typescript"
        filename="src/views/landing-page/get-server-side-props.ts"
      />
      <p>
        The comment is the whole rationale. In Pages Router, a thrown error inside{" "}
        <code>getServerSideProps</code> is what makes Next render{" "}
        <code>/500</code>. The throw <em>is</em> the error strategy; swallowing it
        and returning partial props does not make the app robust, it makes it
        silently serve a page with no plans, no prices and no alert. Schema
        validation is deliberately the opposite:{" "}
        <code>validateCannonballEntity</code> in{" "}
        <code>src/views/landing-page/stitch/build-stitch-document.ts</code> catches
        a <code>ZodError</code>, logs{" "}
        <code>eventName: &apos;stitchWarn&apos;</code> and continues, because one
        bad CMS field should cost one component, not the page. Hence the
        operational rule: <strong>a 500 or blank page is an infrastructure
        failure</strong> (config, CMS, pricing), while{" "}
        <strong>a missing component is bad CMS data</strong> — go grep for{" "}
        <code>stitchWarn</code>.
      </p>

      <h2 id="rendering-stack">The Rendering Stack</h2>
      <p>
        Rendering is a registry lookup, not a switch statement.{" "}
        <code>src/views/landing-page.tsx</code> is only 132 lines because it knows
        nothing about heroes, banners or plan cards. It renders the slots of a{" "}
        <code>StitchDocument</code> in order — <code>metadata</code>,{" "}
        <code>styleOverrides</code>, <code>preContent</code>,{" "}
        <code>mainContent</code>, <code>postContent</code>, <code>modals</code>,
        then the footer — and each node resolves itself through the{" "}
        <strong>Stitch</strong> engine in <code>packages/marketing/stitch</code>.
      </p>
      <MermaidDiagram
        chart={renderStackDiagram}
        title="CMS JSON to Pixels"
        caption="Notice the registry is the only place a CMS type name meets a React component — that is the brand seam."
        minHeight={450}
      />
      <p>
        Stitch is four parts per content type: <strong>Model</strong> (a zod
        schema, <code>stitch/src/models/plan-card-model.ts</code>) →{" "}
        <strong>Builder</strong> (a pure CMS-fields-to-StitchElement function,{" "}
        <code>stitch/src/builders/build-plan-card.ts</code>) →{" "}
        <strong>Component</strong> (a thin renderer calling{" "}
        <code>useRegisteredComponent(&apos;planCard&apos;)</code>) →{" "}
        <strong>Registry</strong> (the default map in{" "}
        <code>stitch/src/components/stitch-component-registry-provider.tsx</code>).
      </p>
      <p>
        ESPN customises that registry in exactly one file,{" "}
        <code>
          src/shared/layout/application-layout/stitch-component-registry-overrides.tsx
        </code>
        , and overrides only three keys: <code>entitledContent</code> (the one
        genuinely ESPN-specific React component), the <code>slider</code> items
        adapter (pointed at ESPN&apos;s Watch API), and the <code>image</code>{" "}
        srcset generator (pointed at ESPN&apos;s Ripcut variant). Everything else,
        plan cards included, is the shared implementation — that is the payoff of
        config-over-fork, and why ESPN has close to zero bespoke UI code.
      </p>
      <p>
        One normalisation detail looks like dead code but is not:{" "}
        <code>cannonballDataProcessor</code> runs even in Spaceball mode with an
        empty processors map. Cannonball emits <code>_type</code> per node,
        Spaceball emits <code>_contentType</code>, and Stitch models key on{" "}
        <code>_type</code>. Delete that call and Spaceball pages render nothing.
      </p>

      <h2 id="brand-tokens">Where ESPN&apos;s Brand Actually Lives</h2>
      <p>
        Asked to change an ESPN colour, breakpoint or font, the instinct is to open{" "}
        <code>tailwind.config.cjs</code>. That file is nineteen lines and contains
        none of those things:
      </p>
      <CodeBlock
        code={`import espnPreset from '@solo/cgi-design-components/src/presets/espn';
import { animation, espnPlugin } from '@solo/growth-components/tailwind';

module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    '../../../packages/cgi/cgi-design-components/src/**/*.{ts,tsx}',
    '../../../packages/marketing/growth-components/src/**/*.{ts,tsx}',
    '../../../packages/marketing/stitch/src/**/*.{ts,tsx}',
    '../../../packages/cgi/footer/src/**/*.{ts,tsx}',
  ],
  plugins: [espnPlugin],
  presets: [espnPreset],
  theme: { extend: animation },
};`}
        lang="javascript"
        filename="apps/marketing-unified/espn/tailwind.config.cjs"
      />
      <p>
        No <code>screens</code>, no <code>colors</code> — content globs, one
        preset, one plugin. Follow the chain instead.
      </p>
      <MermaidDiagram
        chart={themeChainDiagram}
        title="The ESPN Theming Chain"
        caption="Notice the breakpoint branch never touches Tailwind — it is a separate runtime registry."
        minHeight={400}
      />
      <ArticleTable
        caption="Where each category of ESPN brand value actually lives."
        minWidth={880}
      >
        <table>
          <thead>
            <tr><th>Brand value</th><th>Real source</th><th>Consequence</th></tr>
          </thead>
          <tbody>
            <tr><td>Colours, spacing, type scale</td><td><code>packages/cgi/cgi-design-components/src/presets/espn.ts</code> → <code>themes/espn.ts</code> → <code>@solo/cgi-design-tokens</code></td><td>Change a brand colour in the tokens package, not in the app.</td></tr>
            <tr><td>Fonts</td><td><code>packages/marketing/growth-components/tailwind/plugins/espn.ts</code> generates <code>@font-face</code> from <code>EspnFonts</code></td><td>Two named faces: <code>font-benton</code> for body and labels, <code>font-ignite</code> for headlines. The same list is passed server-side as <code>appContext.fontsToLoad</code> so Stitch emits preloads.</td></tr>
            <tr><td>Breakpoints</td><td><code>configureBreakpoints(&apos;espn&apos;)</code> at module scope in <code>src/shared/layout/application-layout.tsx</code></td><td>A runtime JS registry components query in JS — a separate system from Tailwind&apos;s screens. Keeping the two aligned is manual discipline.</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="local-dev">Running It Locally (and the README Trap)</h2>
      <CodeBlock
        code={`# one-time setup
./scripts/setup                       # mkcert, MSW, Playwright browsers
pnpm install
./scripts/setup configure secrets     # populates .env.local from Vault

# run it (from the repo root)
pnpm dev:marketing-unified:espn

# what that actually starts:
#   next dev -p 4040          <- the app
#   wcs ssl-proxy -p 5040     <- waits on :4040/healthcheck first

# then open:
#   https://local.plus.espn.com:5040`}
        lang="bash"
        filename="run-espn-marketing.sh"
      />
      <p>
        Now the lesson. <code>apps/marketing-unified/espn/README.md</code> tells you
        to open <code>https://local.espn.com:5030</code> with Next on 4030 and the
        proxy on 5030. The hostname and all three numbers are wrong. The{" "}
        <code>package.json</code> scripts — <code>next dev -p 4040</code>, and a
        proxy that waits on{" "}
        <code>http://local.plus.espn.com:4040/healthcheck</code> before binding
        5040 — are the truth. The parent{" "}
        <code>apps/marketing-unified/README.md</code> repeats the same stale
        4030/5030 claim, and yet five lines below its own bad snippet the ESPN
        README gets it right: &quot;<code>pnpm dev</code> starts the server at
        https://local.plus.espn.com:5040&quot;. The same drift hits Disney+
        marketing, where the README says 4010 and the code says{" "}
        <code>PORT=4060</code>.
      </p>
      <p>
        <strong>Trust the code, not the docs.</strong> Scripts, configs and matchers
        are executable and therefore self-correcting; prose is not. The same reflex
        applies to this README&apos;s claim that ESPN uses Tealium and HITS —
        neither string appears anywhere in <code>src/</code>, the real stack being
        Datadog RUM plus Adobe Analytics and Adobe Launch — and to its claim that
        breakpoints live in the Tailwind config.
      </p>
      <p>
        Two more facts that save an afternoon. <code>getConfigs</code> hard-fails if
        any of the seven Sparrow environment variables is missing and GSSP rethrows
        that as a 500, so <strong>a blank page locally is almost always a missing
        Sparrow env var</strong>, not broken code. And only two routes have MSW
        fixtures: home and <code>/soccer</code>. Working on <code>/mlbtv</code> or{" "}
        <code>/nflbundle</code> locally means adding a fixture under{" "}
        <code>src/mocks/apis/</code> or pointing at a real CMS environment.
      </p>

      <h2 id="gotchas">Gotchas &amp; Traps</h2>
      <ArticleTable
        caption="Traps this app sets for newcomers, and why each one bites."
        minWidth={900}
      >
        <table>
          <thead>
            <tr><th>Trap</th><th>Why it bites</th></tr>
          </thead>
          <tbody>
            <tr><td><code>@solo/logger</code> is aliased on the server</td><td><code>next.config.js</code> rewrites it to <code>src/libs/logger-with-datadog.ts</code>. The real package is reachable as <code>real-@solo/logger</code>.</td></tr>
            <tr><td>Two Spaceball flags, easy to confuse</td><td><code>enableSpaceball</code> switches page content and redirect lookups; <code>enableSpaceballMlp</code> switches only the offer-token source. Both accept a per-request query override — which is how the <code>*-sp.spec.ts</code> Playwright specs exercise the new backend.</td></tr>
            <tr><td>Offer-token replacement is skipped, not failed</td><td>When the <code>global</code> CMS instance is unconfigured for the selected backend, the step is bypassed and pages render raw <code>{"{{token}}"}</code> placeholders to real users. Watch <code>tokens_replaced</code>.</td></tr>
            <tr><td>A plan card with an empty header renders nothing</td><td><code>build-plan-card.ts</code> returns <code>null</code> when the built header is empty, so a mis-authored card silently disappears instead of erroring.</td></tr>
            <tr><td>The commerce hand-off is CMS-authored and untestable here</td><td><code>packages/marketing/stitch/src/builders/build-link.ts</code> passes <code>href</code> through verbatim: no query merge, no <code>pref</code> computation, and no campaign or attribution params forwarded. A typo&apos;d <code>pref</code> cannot be caught by any test in this repo.</td></tr>
            <tr><td>Region is quietly dropped in two places</td><td>Redirect lookups pass <code>locale.split(&apos;-&apos;)[0]</code>, so region-specific vanity redirects are impossible; <code>getFooterProps</code> hard-codes <code>region: &apos;us&apos;</code> and the production CMS environment, so the footer ignores the request&apos;s region even on stage.</td></tr>
            <tr><td>Currency support is US-only and hard-coded</td><td><code>get-cms-content-with-tokens-replaced.ts</code> ships USD, the dollar sign and region <code>US</code>. Any non-US ESPN market needs those literals changed.</td></tr>
            <tr><td><code>preContent</code> is a flattened <code>[topBanner, navigation]</code></td><td>A CMS banner and the site nav share one slot, so ordering bugs there present to stakeholders as &quot;the nav moved.&quot;</td></tr>
            <tr><td>The <code>/restricted/*</code> bypass cookie value is committed in source</td><td>Treat those pages as effectively public; never stage anything confidential there.</td></tr>
            <tr><td>100% Jest coverage, enforced with fail-on-console</td><td>New non-excluded files need full branch coverage, and a stray <code>console.warn</code> fails the suite. Local Playwright also runs a full production <code>next build</code> before the first test.</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: walk me through a request to plus.espn.com/soccer"
        intro="A weak answer describes Next.js generically. A strong answer names the layers in order and says what can fail at each one."
        steps={[
          "Edge first: middleware matches the request, normalises casing and locale, and appends six headers — physical-location, language, region, pathname, url, disable-redirect. Nothing downstream learns geo any other way.",
          "Route: there is only one content route, an optional catch-all of seven lines. /soccer is not a file; it is a CMS route key.",
          "Config: GSSP reads those headers back with getCommonHeaders, then fetches Sparrow remote config for CMS paths, feature flags and the countries table. A failure here throws and renders /500.",
          "Data: one flag decides Cannonball (CDN manifest plus snapshot) or Spaceball (a single GraphQL POST). Page content and the redirects lookup run in parallel via Promise.all, and both backends return the same pageData shape.",
          "Pricing: CMS price placeholders are substituted server-side by the plans-pricing package — this app makes no runtime plans API call.",
          "Build and render: zod models plus builders produce a StitchDocument, and the landing-page view resolves each node through the Stitch registry, where ESPN overrides exactly three keys.",
          "Close on failure modes: infrastructure errors throw to /500 on purpose, while schema errors log stitchWarn and drop one component — different signals, different debugging paths.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: why one route file instead of a page per sport?"
        intro="The interviewer wants both sides. Naming only the upside reads as repeating documentation."
        steps={[
          "State the driver: the people who ship marketing pages are content authors, not engineers. Publishing must not require a PR and a deploy.",
          "Name the mechanism: an optional catch-all plus a CMS route key makes adding /wnba a content operation with zero code change and zero release risk.",
          "Name the cost honestly: you lose compile-time knowledge of your own sitemap. No test can assert a route exists, that its CTA carries a valid package id, or that its layout is intact.",
          "Name the second cost: debugging shifts from 'read the page component' to 'inspect the CMS payload', which needs different tooling — hence the debug block with a CMS deep-link and the in-page Toodles widget.",
          "Show the mitigation you would add: contract tests over the CMS route manifest, plus validation that every authored commerce href carries a known pref value.",
        ]}
      />

      <h2 id="challenge">Hands-On Challenge</h2>
      <InterviewChallenge
        title="/nflbundle renders, but the prices show as raw tokens"
        scenario={
          <>
            You are on call. A stakeholder reports that{" "}
            <code>plus.espn.com/nflbundle</code> loads, the layout looks right and
            the CTA works — but where prices belong, users see the literal text{" "}
            <code>{"{{espn_nfl_bundle_monthly.price}}"}</code>. The <code>/</code>{" "}
            homepage on the same deploy shows prices correctly. No deploy went out
            in 24 hours. You have Datadog APM, the repo and the Sparrow config.
          </>
        }
        tasks={[
          "Name the single span tag you would check first, and the value that would confirm the diagnosis.",
          "Explain why this failure produces a rendered page rather than a 500, and point at the specific design decision in the orchestrator that causes that.",
          "List the two independent feature flags involved and say which one is relevant here.",
          "Explain how the homepage can be correct while /nflbundle is broken, given both routes run identical code.",
          "State the one thing you cannot reproduce locally with the checked-in MSW fixtures, and what you would add to close that gap.",
        ]}
        pitfalls={[
          "Reaching for the plans or offers API — this app never calls one at render time; prices arrive as CMS token substitutions.",
          "Assuming a code deploy caused it. Both CMS content and Sparrow config change without a deploy.",
          "Confusing enableSpaceball with enableSpaceballMlp and flipping the wrong one.",
          "Proposing a try/catch around the token step so the page 'fails gracefully' — it already degrades, and that is precisely the bug.",
        ]}
        signal="A strong candidate separates 'infrastructure failed, throw to /500' from 'content was wrong, degrade and log', and can point at the exact place where offer-token replacement is skipped rather than failed."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. The tag is <code>tokens_replaced</code></strong>, set in{" "}
          <code>
            src/views/landing-page/get-server-side-props/get-cms-content-with-tokens-replaced.ts
          </code>{" "}
          by regex-counting formatted prices in the serialised payload.{" "}
          <code>0</code> on <code>/nflbundle</code> while the homepage reports
          non-zero confirms substitution never ran for this route.
        </p>
        <p>
          <strong>2. It renders because the step is conditional, not
          wrapped.</strong> The orchestrator builds an offer-token CMS instance
          config first and only calls{" "}
          <code>getCmsContentWithTokensReplaced</code> if that config exists —
          otherwise the raw <code>cmsPayload</code> passes straight through. The
          source comment says it outright: when the <code>global</code> instance is
          not configured for the selected CMS backend, skip token replacement
          rather than failing the whole page. Note the contrast — if replacement{" "}
          <em>runs</em> and errors, the app <em>does</em> throw and you get{" "}
          <code>/500</code>. Skipped and failed are different paths.
        </p>
        <p>
          <strong>3. The flags are <code>enableSpaceball</code></strong> (page
          content plus redirects) <strong>and <code>enableSpaceballMlp</code></strong>{" "}
          (offer tokens only); only the second is relevant. The classic production
          version of this incident is <code>enableSpaceballMlp</code> flipped on in
          Sparrow while the <code>global</code> offer-token space is absent from the
          Spaceball <code>paths</code> block, so the instance config comes back
          empty and every price silently degrades.
        </p>
        <p>
          <strong>4. Same code, different data.</strong> The token catalogue is CMS
          content keyed by route. If the tokens <code>/nflbundle</code> references
          were never published in the offer-token space for the selected backend or
          environment, its placeholders resolve to nothing while the
          homepage&apos;s resolve fine. Identical code paths do not imply identical
          content.
        </p>
        <p>
          <strong>5. You cannot reproduce it locally</strong> because only home and{" "}
          <code>/soccer</code> have snapshot fixtures — under MSW,{" "}
          <code>/nflbundle</code> falls through to the home snapshot in Spaceball
          mode or 404s in Cannonball mode. Closing the gap means adding an{" "}
          <code>nflbundle</code> snapshot fixture plus a matching offer-token
          response and wiring both into <code>src/mocks/handlers/</code>. The
          durable fix is a monitor on <code>tokens_replaced</code> equal to zero
          broken down by route, because no test in this repo can catch an
          unpublished token.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>apps/marketing-unified/espn</code> serves 29 CMS routes from one
          seven-line optional catch-all,{" "}
          <code>src/pages/[[...path]].page.tsx</code>. Every sport, bundle, legal
          and B2B page is the same React tree with different CMS content;{" "}
          <code>homepage</code> is the only slug whose URL differs from its key.
        </li>
        <li>
          Geo and locale reach the server only through six middleware-injected
          headers, read back by <code>getCommonHeaders(res)</code>. Physical
          location resolves <code>dss-physical-country</code> → Akamai{" "}
          <code>x-aka-user-geo</code> → <code>US</code>.
        </li>
        <li>
          <code>get-server-side-props.ts</code> is a 447-line ordered pipeline with
          four exits — props, redirect, <code>notFound</code>, or a deliberate{" "}
          <code>throw</code> that renders <code>/500</code>. The throw is the error
          strategy; do not swallow it.
        </li>
        <li>
          Rendering is registry-driven: CMS <code>_type</code> → zod model →
          builder → <code>StitchDocument</code> → Stitch registry → React. ESPN
          overrides only <code>entitledContent</code>, the <code>slider</code>{" "}
          adapter and the <code>image</code> srcset generator.
        </li>
        <li>
          Brand tokens are <em>not</em> in <code>tailwind.config.cjs</code>:
          colours come from <code>@solo/cgi-design-tokens</code> via the ESPN preset
          and theme, fonts from <code>espnPlugin</code> (<code>font-benton</code>{" "}
          body, <code>font-ignite</code> headlines), and breakpoints from a runtime{" "}
          <code>configureBreakpoints(&apos;espn&apos;)</code> registry.
        </li>
        <li>
          Run it with <code>pnpm dev:marketing-unified:espn</code> and open{" "}
          <code>https://local.plus.espn.com:5040</code> — 4040 for Next, 5040 for
          the proxy. The README&apos;s 4030/5030 and <code>local.espn.com</code> are
          stale: in this monorepo, trust the scripts over the prose.
        </li>
      </ul>
    </div>
  );
}
