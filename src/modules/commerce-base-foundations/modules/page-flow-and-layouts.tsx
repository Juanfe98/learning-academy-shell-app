import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const requestFlowDiagram = String.raw`sequenceDiagram
  participant Route as pages/.../index.page.tsx
  participant GSSP as buildGetServerSideProps (server)
  participant App as _app CustomApp
  participant Layout as getPageLayout
  participant Hyd as HydrateBaseAtoms
  participant Page as base page content

  Route->>GSSP: getServerSideProps(context)
  GSSP->>GSSP: load Sparrow config + dictionary + composition fns
  GSSP-->>App: CommercePageProps (serializable)
  App->>App: wrap in JotaiProvider > QueryProvider
  App->>Layout: getPageLayout({ page, pageProps, router })
  Layout->>Hyd: ApplicationLayout mounts HydrateBaseAtoms
  Hyd->>Hyd: seed Jotai atoms from props
  Layout->>Page: render {page} inside shell`;

const layoutCompositionDiagram = String.raw`flowchart TD
  GPL["getPageLayout"]
  GPL --> SEO["SEO metadata"]
  GPL --> AL["ApplicationLayout<br/>(GlobalStyles, ErrorBoundary, HydrateBaseAtoms)"]
  AL --> BL["DisneyLayout (brand)<br/>analytics, consent, data-interface, redirects"]
  BL --> PC["PageContainer"]
  PC --> SH["SiteHeaderBase"]
  PC --> MAIN["Main > PageErrorBoundary > {page}"]
  PC --> FOOT["FooterWrapper (brand)"]`;

const dispatcherDiagram = String.raw`flowchart TD
  APP["_app CustomApp"]
  APP --> CHK{"Component.getPageLayout?"}
  CHK -->|"yes (CUP V2)"| V2["getPageLayout(layoutProps)"]
  CHK -->|"no"| CHK2{"getLegacyLayout?"}
  CHK2 -->|"yes (CUP V1)"| V1["getLegacyLayout(...)"]
  CHK2 -->|"no"| DEF["getDefaultPageLayout(...)"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "overview", title: "The Full Request Lifecycle", level: 2 },
  { id: "gssp", title: "buildGetServerSideProps: The GSSP Factory", level: 2 },
  { id: "props", title: "CommercePageProps: The Server → Client Contract", level: 3 },
  { id: "composition", title: "Composition Functions", level: 3 },
  { id: "dispatcher", title: "_app: The Layout Dispatcher", level: 2 },
  { id: "getpagelayout", title: "getPageLayout: Composing the Shell", level: 2 },
  { id: "application-layout", title: "ApplicationLayout and Hydration", level: 3 },
  { id: "boundary", title: "The Server → Client Boundary", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add Server Data to a Page", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function PageFlowAndLayouts() {
  return (
    <div className="article-content">
      <p>
        A commerce page is not one file — it&apos;s a pipeline. A request arrives at a Next.js route,
        server-side props are composed, the app dispatches to a layout function, the layout mounts the
        provider/hydration stack, and finally the brand-agnostic page content renders. Understanding
        this lifecycle end-to-end is what lets you answer &quot;where do I add this?&quot; and
        &quot;why is this prop undefined?&quot; without guessing. This module traces the whole path
        using the real Disney+ plans route.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Every page you build or debug follows this exact flow. Data missing on the client? It&apos;s a
        composition-function or serialization issue in GSSP. Layout wrong? It&apos;s the{" "}
        <code>getPageLayout</code> composition. Atom empty? Hydration didn&apos;t run. The pipeline is
        your map for locating any of these.
      </p>

      <h2 id="overview">The Full Request Lifecycle</h2>
      <MermaidDiagram
        chart={requestFlowDiagram}
        title="From request to rendered page"
        caption="Server composes props → _app wraps providers and dispatches to getPageLayout → ApplicationLayout hydrates atoms → the base page content renders inside the shell. Five stages, each with a clear owner."
        minHeight={460}
      />

      <h2 id="gssp">buildGetServerSideProps: The GSSP Factory</h2>
      <p>
        commerce-base ships a higher-order <code>getServerSideProps</code> factory (
        <code>common/lib/build-get-server-side-props.ts</code>). You give it an array of composition
        functions; it returns a Next.js <code>getServerSideProps</code>. On every request it loads
        remote config, resolves language/locale, fetches the dictionary, runs your composition
        functions, and merges everything into <code>CommercePageProps</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/lib/build-get-server-side-props.ts"
        code={`export function buildGetServerSideProps<TPageProps = Record<string, unknown>>(
  propCompositionFunctions: (PagePropFunction<TPageProps> | CompositionFunction)[] = [],
  ssrDictionaryKeys?: Record<string, string[]>,
) {
  return async function getComposedServerSideProps(context) {
    const commerceAppConfig = await loadSparrowConfig({ /* ... */ });
    const composedServerSideProps = propCompositionFunctions.reduce(
      (prev, fn) => ({ ...prev, ...fn(commerceAppConfig, context) }),
      {},
    );
    const dictionary = await getDictionaryServerProps({ /* ... */ });
    const finalPageProps = {
      dictionary, initialGlimpseConfiguration, language, locale,
      productMetaData, productUrl, commerceAppConfig, statusCode, userAgent,
      yellowPagesId, ...regionProps, ...composedServerSideProps.props,
    };
    return { ...composedServerSideProps, props: finalPageProps };
  };
}`}
      />
      <p>
        Each brand wraps this base factory to inject its own SSR dictionary keys and any brand
        post-steps (Disney adds a footer-preview step). So the call chain is: brand{" "}
        <code>buildGetServerSideProps</code> → base <code>buildGetServerSideProps</code> → your
        composition functions.
      </p>

      <h3 id="props">CommercePageProps: The Server → Client Contract</h3>
      <p>
        The merged result is <code>CommercePageProps</code> — the fully JSON-serializable contract
        that crosses from server to client:
      </p>
      <CodeBlock
        lang="typescript"
        filename="CommercePageProps (shape)"
        code={`export type CommercePageProps = {
  commerceAppConfig: CommerceAppConfig;
  dictionary: NormalizedDictionary;
  initialGlimpseConfiguration: GlimpseV2StartupClientPayloadEnrichmentsModel;
  language: string;
  locale: string;
  layoutConfig?: LayoutConfig;
  productUrl: ProductUrl;
  productMetaData: ProductMetaData;
  regionFromCDN?: RegionSubtag;
  statusCode: number;
  yellowPagesId: string;
  pinnedPlatformOptions: PinnedPlatformOptions;
  // ...
};`}
      />
      <p>
        Everything here must be serializable — no functions, no class instances. This is the payload
        that later gets hydrated into Jotai atoms so client code reads it synchronously.
      </p>

      <h3 id="composition">Composition Functions</h3>
      <p>
        Page-specific server props come from composition functions like{" "}
        <code>getBillingPageProps</code> (<code>signup/pages/billing-page-props.ts</code>), which
        contributes the <code>layoutConfig</code> and server-only feature props:
      </p>
      <CodeBlock
        lang="typescript"
        filename="signup/pages/billing-page-props.ts"
        code={`export function getBillingPageProps({ commerceAppConfig, shouldIdleRedirect }) {
  return {
    props: {
      layoutConfig: { visualLayout: { header: { type: 'siteHeader' } } },
      sca: buildSCAFeatureProps(commerceAppConfig),
      shouldIdleRedirect,
    },
  };
}`}
      />
      <p>
        You compose these in the route: <code>getServerSideProps = buildGetServerSideProps([getBillingPageProps, ...])</code>.
        Each function receives the loaded config + context and returns a slice of props that gets
        merged in.
      </p>

      <h2 id="dispatcher">_app: The Layout Dispatcher</h2>
      <p>
        Next passes the props into <code>_app.page.tsx</code>. <code>CustomApp</code> builds{" "}
        <code>layoutProps = {"{ page: <Component {...pageProps} />, pageProps, router }"}</code> and
        dispatches to the page&apos;s layout function — supporting CUP V2, CUP V1, and a default:
      </p>
      <CodeBlock
        lang="tsx"
        filename="apps/commerce/disneyPlus/pages/_app.page.tsx"
        code={`const getLayout = () => {
  if (Component.getPageLayout) return Component.getPageLayout(layoutProps);        // CUP V2
  else if (Component.getLegacyLayout) return Component.getLegacyLayout(legacyLayoutProps); // CUP V1
  return getDefaultPageLayout(legacyLayoutProps);                                   // fallback
};

return (
  <JotaiProvider>
    <QueryProvider>{getLayout()}</QueryProvider>
  </JotaiProvider>
);`}
      />
      <MermaidDiagram
        chart={dispatcherDiagram}
        title="Layout dispatch in _app"
        caption="CUP V2 pages attach getPageLayout; CUP V1 pages use getLegacyLayout; anything else gets the default. The two providers (Jotai, Query) wrap the chosen layout."
        minHeight={320}
      />
      <p>
        The two real React providers live here and nowhere else: <code>JotaiProvider</code> outermost,{" "}
        <code>QueryProvider</code> inside it. Everything else (config, dictionary, geo, SDK) is not a
        context provider — it&apos;s hydrated into atoms, as we&apos;ll see.
      </p>

      <h2 id="getpagelayout">getPageLayout: Composing the Shell</h2>
      <p>
        commerce-base exports pages as <strong>content only</strong> — the base{" "}
        <code>PlansPage</code> is <code>export const PlansPage: CommercePageComponent&lt;...&gt;</code>{" "}
        with no layout. The <strong>brand route</strong> attaches <code>getPageLayout</code> to wrap
        the shared shell + brand layout around that content:
      </p>
      <CodeBlock
        lang="tsx"
        filename="apps/commerce/disneyPlus/pages/commerce/plans/index.page.tsx"
        code={`const PlansPage = BasePlansPage;

PlansPage.getPageLayout = ({ page, pageProps }) => (
  <>
    <SearchEngineOptimizationMetaData title={...} description={...} {...pageProps} />
    <ApplicationLayout {...pageProps} onboardingLanguageRequired>
      <DisneyLayout {...pageProps}>
        <PageContainer headerType="siteHeader">
          <SiteHeaderBase />
          <Main id="content" headerType="siteHeader">
            <PageErrorBoundary owner={Owners.MMA} FallbackComponent={<PageDefaultErrorFallback />}>
              {page}
            </PageErrorBoundary>
          </Main>
          <FooterWrapper adobePageName="Plans" />
        </PageContainer>
      </DisneyLayout>
    </ApplicationLayout>
  </>
);

export const getServerSideProps = buildGetServerSideProps([/* composition fns */]);
export default PlansPage;`}
      />
      <MermaidDiagram
        chart={layoutCompositionDiagram}
        title="The layout composition tree"
        caption="getPageLayout nests: SEO + ApplicationLayout (shared shell + hydration) + DisneyLayout (brand: analytics, consent, data interface) + PageContainer (header/main/footer), with {page} guarded by a PageErrorBoundary."
        minHeight={420}
      />
      <p>
        ESPN does the same but leaner — it may only supply <code>layoutConfig</code> via GSSP and
        re-export the default. The pattern is constant: <strong>the route decorates a base page with
        a layout and a GSSP builder.</strong>
      </p>

      <h3 id="application-layout">ApplicationLayout and Hydration</h3>
      <p>
        <code>ApplicationLayout</code> (<code>common/layouts/application-layout.tsx</code>) is the
        brand-agnostic shell. It renders global styles, wraps an error boundary, and — critically —
        mounts <code>HydrateBaseAtoms</code>, which pushes all the server props into Jotai atoms:
      </p>
      <CodeBlock
        lang="tsx"
        filename="common/layouts/application-layout.tsx"
        code={`export function ApplicationLayout({ children, dictionary, commerceAppConfig, ...props }) {
  return (
    <>
      <GlobalStyles />
      <ApplicationErrorBoundary commerceAppConfig={commerceAppConfig} dictionary={dictionary}>
        <HydrateBaseAtoms commerceAppConfig={commerceAppConfig} dictionary={dictionary} {...props} />
        <DevelopmentLayout />
        {children}
      </ApplicationErrorBoundary>
    </>
  );
}`}
      />
      <p>
        The ordering matters: <code>HydrateBaseAtoms</code> runs before <code>{"{children}"}</code>,
        so by the time the page content renders, <code>commerceAppConfigAtom</code>,{" "}
        <code>regionAtom</code>, the dictionary atoms, and the rest are already seeded. The brand{" "}
        <code>DisneyLayout</code> then layers analytics, privacy consent, the data-interface
        hydration (<code>HydrateDataInterface</code>), and language/kids-mode redirects.
      </p>

      <h2 id="boundary">The Server → Client Boundary</h2>
      <p>
        The base page, once rendered, is fully brand-agnostic: it reads{" "}
        <code>dataInterfaceAtom</code>, <code>useSessionInfo()</code>, and{" "}
        <code>useDictionary()</code>, and fetches Flex data via React Query — never knowing which
        brand it&apos;s in. The whole design converges on this: <strong>server composes serializable
        props → providers + hydration make them client-readable → shared content renders against
        injected abstractions.</strong>
      </p>
      <ArticleTable
        caption="Which stage owns which concern."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Stage / file</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Load config + dictionary, compose props</td>
              <td><code>buildGetServerSideProps</code> (server)</td>
            </tr>
            <tr>
              <td>Page-specific server props</td>
              <td>composition functions (e.g. <code>getBillingPageProps</code>)</td>
            </tr>
            <tr>
              <td>Provider wrapping + layout dispatch</td>
              <td><code>_app.page.tsx</code></td>
            </tr>
            <tr>
              <td>Shell + brand layout composition</td>
              <td><code>getPageLayout</code> in the route</td>
            </tr>
            <tr>
              <td>Seed atoms from props</td>
              <td><code>ApplicationLayout</code> → <code>HydrateBaseAtoms</code></td>
            </tr>
            <tr>
              <td>Data interface + analytics + redirects</td>
              <td>brand <code>DisneyLayout</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through how a commerce page loads.'"
        intro="Give the five-stage pipeline in order, naming the file that owns each stage."
        steps={[
          "The route file re-exports a base page, attaches getPageLayout, and exports getServerSideProps = buildGetServerSideProps([...]).",
          "Server: brand buildGetServerSideProps → base factory loads Sparrow config + dictionary, runs composition functions, returns serializable CommercePageProps.",
          "_app wraps the tree in JotaiProvider > QueryProvider and dispatches to Component.getPageLayout({ page, pageProps, router }) — with CUP V1/default fallbacks.",
          "getPageLayout composes ApplicationLayout (shared shell) + brand DisneyLayout + PageContainer (header/main/footer); ApplicationLayout mounts HydrateBaseAtoms which seeds Jotai from props before children render.",
          "The base page content renders brand-agnostically: reads dataInterfaceAtom, useSessionInfo, useDictionary, fetches Flex via React Query.",
        ]}
      />

      <h2 id="challenge">Challenge: Add Server Data to a Page</h2>
      <InterviewChallenge
        title="A new page needs a server-fetched config value on first paint"
        scenario={
          <>
            You&apos;re adding a page that must display a value derived from the Sparrow config on the
            very first server render (no client loading flash). Describe exactly how you&apos;d thread
            that value from the server to the component, and where each piece lives in the pipeline.
          </>
        }
        tasks={[
          "Explain where you'd compute the value on the server and how it enters CommercePageProps.",
          "State the serialization constraint and what would break if you violated it.",
          "Describe how the value reaches the component synchronously on first render.",
          "Decide whether it should go through an atom (hydrated) or be read straight from pageProps, and why.",
        ]}
        pitfalls={[
          "Trying to fetch it client-side (defeats 'no flash on first paint').",
          "Returning a non-serializable value (function/class) from GSSP.",
          "Assuming the component can read it before hydration if you route it through an atom without a hydrate hook.",
        ]}
        signal="A strong answer adds a composition function that returns the value in props (serializable), lets buildGetServerSideProps merge it into CommercePageProps, and either reads it directly from pageProps in getPageLayout/the page or — if many components need it — hydrates it into an atom via a useHydrate* hook in HydrateBaseAtoms so it's readable synchronously."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Compute it in a <strong>composition function</strong> that receives the loaded{" "}
          <code>commerceAppConfig</code> and returns it under <code>props</code>. Register that
          function in the route&apos;s <code>buildGetServerSideProps([...])</code>; the base factory
          merges it into <code>CommercePageProps</code>. The one hard rule:{" "}
          <strong>it must be JSON-serializable</strong> — return a plain value, never a function or
          class instance, or Next will error on serialization.
        </p>
        <p>
          For &quot;no flash on first paint,&quot; it must be present at render time, which it is —
          it&apos;s in <code>pageProps</code> before the client hydrates. If only this page needs it,
          read it straight from <code>pageProps</code> in <code>getPageLayout</code> or pass it into
          the page. If <em>many</em> unrelated components need it, hydrate it into a Jotai atom via a{" "}
          <code>useHydrate*</code> hook added to <code>HydrateBaseAtoms</code> — then any component
          reads it synchronously with <code>useAtomValue</code>, exactly like <code>regionAtom</code>.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>A page is a five-stage pipeline.</strong> route → GSSP → <code>_app</code> dispatch
          → <code>getPageLayout</code> → hydrated content.
        </li>
        <li>
          <strong><code>buildGetServerSideProps</code> is a factory.</strong> It loads config +
          dictionary and merges composition-function output into serializable{" "}
          <code>CommercePageProps</code>.
        </li>
        <li>
          <strong><code>_app</code> owns the providers.</strong> <code>JotaiProvider</code> →{" "}
          <code>QueryProvider</code>, then dispatches to the layout function.
        </li>
        <li>
          <strong>Routes decorate base pages.</strong> <code>getPageLayout</code> composes shared
          shell + brand layout; base pages are content-only.
        </li>
        <li>
          <strong>Hydration happens in <code>ApplicationLayout</code>.</strong>{" "}
          <code>HydrateBaseAtoms</code> seeds Jotai before children render — no flash.
        </li>
      </ul>
    </div>
  );
}
