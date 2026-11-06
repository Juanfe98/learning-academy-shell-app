import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const pipelineDiagram = String.raw`flowchart TD
  A["Page component (commerce-base)<br/>e.g. plans-page.tsx"] --> B["useQuery(['flexApi.getScreen.planSelector'])"]
  B --> C["dataInterface.getFlexScreen({ key:'landingPlans', version:'v1', queryParams, headers })"]
  C --> D["data-interface-hulu flex client<br/>flexScreenKeysToUrls[key] → 'landing/plans'"]
  D --> E["fetch edgeBaseUrl/screens/v1/landing/plans?...<br/>credentials:'include' + x-bamsdk-platform"]
  E --> F["Hulu Edge → Flex<br/>(partner header stamped)"]
  F --> G["{ data: screen JSON }"]
  G --> H{"isFlexRedirect(data)?"}
  H -->|yes| I["client-side navigate / redirect"]
  H -->|no| J["render content tree<br/>PlansContent model={data.content}"]
  J --> K["Flex element components:<br/>FlexText · FlexInteraction ·<br/>TextWithVariables (cypher resolution)"]`;

const hydrationDiagram = String.raw`flowchart LR
  A["apps/commerce/hulu<br/>src/layout/hydrate-data-interface.tsx"] -->|"buildHuluDataInterface()"| B["dataInterfaceAtom (jotai)"]
  B --> C["commerce-base pages read the atom<br/>useAtomValue(dataInterfaceAtom)"]
  C --> D["Same page code serves 3 brands —<br/>only the hydrated interface differs"]
  A2["apps/commerce/disneyPlus<br/>hydrate-data-interface.tsx"] -->|"buildDisneyDataInterface()<br/>+ SDK session wiring"| B`;

export const toc: TocItem[] = [
  { id: "server-driven-ui-recap", title: "Server-Driven UI in One Paragraph", level: 2 },
  { id: "the-data-interface", title: "The Data-Interface Seam", level: 2 },
  { id: "the-flex-client", title: "The Hulu Flex Client", level: 2 },
  { id: "screen-key-map", title: "The Screen-Key Map", level: 2 },
  { id: "render-pipeline", title: "Fetch → Redirect Check → Render", level: 2 },
  { id: "element-components", title: "Flex Element Components", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Screen", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function HuluFlexIntegration() {
  return (
    <div className="article-content">
      <p>
        Hulu&apos;s commerce pages do not own their content — they{" "}
        <strong>fetch whole screens as JSON</strong> from Flex
        (growth-life-client-api) and render them through generic element
        components. The bridge between the shared React code and Hulu&apos;s
        specific backend wiring is the <strong>data interface</strong>: a
        duck-typed object built per brand and hydrated into a jotai atom. This
        module walks the full pipeline — atom hydration, the Flex client, the
        screen-key map, the redirect check, and the element renderers — because
        every Hulu screen bug eventually routes through one of these stages.
      </p>

      <h2 id="server-driven-ui-recap">Server-Driven UI in One Paragraph</h2>
      <p>
        Flex returns <code>{`{ data: { content, metricsData, ... } }`}</code>{" "}
        where <code>content</code> is a tree of typed UI elements
        (interactions, text, banners, offers) with copy expressed as{" "}
        <strong>Cypher keys + dictionary</strong> references, and{" "}
        <code>metricsData</code> is ready-to-fire analytics payloads. The
        frontend&apos;s job: fetch, type-check, resolve copy, wire buttons,
        fire metrics. Business logic (which offers, which legal copy, which
        sections) lives server-side — which is why so many &quot;frontend&quot;
        Hulu tickets end in the Flex repo.
      </p>

      <h2 id="the-data-interface">The Data-Interface Seam</h2>
      <MermaidDiagram
        chart={hydrationDiagram}
        title="Per-Brand Hydration of One Shared Atom"
        caption="commerce-base pages are brand-blind: they read dataInterfaceAtom. Each brand app hydrates that atom with its own implementation — Hulu's from data-interface-hulu."
        minHeight={360}
      />
      <p>
        <code>apps/commerce/hulu/src/layout/hydrate-data-interface.tsx:39-51</code>{" "}
        calls <code>buildHuluDataInterface()</code> and stores the result in{" "}
        <code>dataInterfaceAtom</code> (from{" "}
        <code>commerce-base/src/common/data-interface</code>). Every shared
        page then calls <code>dataInterface.getFlexScreen(...)</code>,{" "}
        <code>dataInterface.getExperimentAssignments()</code>, etc., without
        knowing the brand. This is the exact seam where Hulu&apos;s cookie
        auth, Hulu&apos;s Spearmint parsing, and Hulu&apos;s endpoint map get
        injected under a brand-neutral contract.
      </p>

      <h2 id="the-flex-client">The Hulu Flex Client</h2>
      <CodeBlock
        code={`// packages/cgi/data-interface-hulu/src/flex/flex-data-interface.ts:168-214
getFlexScreen: async <T>(flexScreenOptions: FlexScreenOptions) => {
  const { key, version, queryParams, headers, requestBody, method = 'GET' } = flexScreenOptions;
  if (!isFlexScreenKeyMapped(key)) {
    throw new Error(
      \`The Flex screen key, \${key}, must first be mapped to a path in the data interface.\`
    );
  }
  const searchParameters = queryString.stringify(queryParams as Record<string, unknown>);
  const endpoint = getEndpoint({
    edgeBaseUrl, version, flexKeysToUrls: flexScreenKeysToUrls, key,
    type: 'screens', flexOptions: flexScreenOptions,
  });
  const response = await fetch(\`\${endpoint}\${searchParameters ? \`?\${searchParameters}\` : ''}\`, {
    body: JSON.stringify(requestBody),
    headers: {
      'x-bamsdk-platform': getCachedPlatformHeader(userAgent),
      ...headers,
      ...(method === 'POST' && { 'content-type': 'application/json' }),
    },
    method,
    credentials: 'include',
  });
  // ... envelope: { data } → returns data as T; errors via handleFlexError/isFlexError
}`}
        lang="typescript"
        filename="flex-data-interface.ts"
      />
      <p>
        Four things to notice: (1) unmapped screen keys{" "}
        <strong>throw immediately</strong> — adding a screen starts in this
        file; (2) auth is invisible — <code>credentials:
        &apos;include&apos;</code> rides Hulu cookies; (3){" "}
        <code>x-bamsdk-platform</code> is always sent (device/platform
        identification), and callers can add more via <code>headers</code>{" "}
        (e.g. <code>generateFlexHeaders({`{ salesPlatform }`})</code> adds{" "}
        <code>X-Bamtech-Sales-Platform</code>); (4) the URL shape is{" "}
        <code>{`\${edgeBaseUrl}/screens/\${version}/\${path}`}</code>{" "}
        (<code>:126</code>) — matching Flex&apos;s{" "}
        <code>/screens/v1/...</code> routes exactly. Executions (mutations)
        have a parallel map and method (<code>:48-72</code>): e.g.{" "}
        <code>subscriptionSignup: &apos;subscription/signup&apos;</code>,{" "}
        <code>subscriptionCancel: &apos;subscription/cancel&apos;</code>.
      </p>

      <h2 id="screen-key-map">The Screen-Key Map</h2>
      <ArticleTable caption="Selected entries of flexScreenKeysToUrls (flex-data-interface.ts:8-38). The accountDetails entry is the one that surprises people.">
        <table>
          <thead>
            <tr>
              <th>Screen key (frontend)</th>
              <th>Flex path</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>landingPlans</code></td>
              <td><code>landing/plans</code></td>
              <td>SUF plan selector</td>
            </tr>
            <tr>
              <td><code>accountDetails</code></td>
              <td><code>hulu/account-home</code></td>
              <td>
                <strong>Hulu maps its account screen to the Hulu-only Flex
                route</strong> — same frontend key other brands map to their
                own account endpoints
              </td>
            </tr>
            <tr>
              <td><code>cancelFlow</code></td>
              <td><code>account/cancel</code></td>
              <td>Shared cancel screens, Hulu-branched server-side</td>
            </tr>
            <tr>
              <td><code>changePayment</code></td>
              <td><code>account/change-payment</code></td>
              <td>
                Where the Spearmint <code>switch-billing</code> legal footer
                shows up
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The <code>accountDetails → hulu/account-home</code> mapping is the
        cleanest demonstration of the whole architecture: the shared page is
        brand-blind, the <em>map</em> is the brand decision. Cross-repo
        debugging rule: find the screen key in the page → look it up in this
        map → open the corresponding Flex route/service.
      </p>

      <h2 id="render-pipeline">Fetch → Redirect Check → Render</h2>
      <MermaidDiagram
        chart={pipelineDiagram}
        title="The Full Screen Pipeline"
        caption="React Query wraps the data-interface call; the isFlexRedirect gate runs before any rendering — Flex can answer 'navigate elsewhere' instead of a screen."
        minHeight={620}
      />
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/signup/pages/plans-page.tsx:233-248
const { data, isLoading } = useQuery({
  queryKey: ['flexApi.getScreen.planSelector'],
  queryFn: () =>
    dataInterface.getFlexScreen<FlexPlansPageContentModel>({
      key: 'landingPlans',
      version: 'v1',
      queryParams,
      headers: generateFlexHeaders({ salesPlatform }),
    }),
  meta: { errorMessage: ERROR_MESSAGES.PLANS.QUERY_FAILED, errorOwner: Owners.MMA },
  select,
  useErrorBoundary: true,
});`}
        lang="tsx"
        filename="plans-page.tsx"
      />
      <p>
        After the fetch, <code>isFlexRedirect(data)</code>{" "}
        (<code>commerce-base/src/common/lib/flex/is-flex-redirect.ts</code>,
        used at <code>plans-page.tsx:264,377</code>) checks whether Flex
        answered with a redirect instruction instead of content — Flex screens
        can decide server-side that this user belongs elsewhere (ineligible,
        already subscribed, region unsupported). Only then does the page render{" "}
        <code>&lt;PlansContent model={`{data.content}`} /&gt;</code>{" "}
        (<code>:441-453</code>). Error propagation is typed too:{" "}
        <code>useErrorBoundary: true</code> with{" "}
        <code>meta.errorOwner</code> feeding observability with a team owner
        tag.
      </p>

      <h2 id="element-components">Flex Element Components</h2>
      <p>
        The generic renderers live in{" "}
        <code>packages/cgi/commerce-base/src/common/components/flex/</code>.
        The two workhorses:
      </p>
      <CodeBlock
        code={`// interaction-element/interaction-element.tsx:139-176 (excerpt)
return (
  <ButtonComponent
    ref={ref}
    data-key={key}
    fullWidth={style !== 'textButton' && fullWidth}
    kind={getKind(style)}
  >
    <div className={interactionWrapperStyles}>
      {type === 'cypher' ? (
        <TextWithVariables dict={{ dictionary, text }} variables={variables} />
      ) : (
        <TextWithVariables text={text} variables={variables} />
      )}
    </div>
  </ButtonComponent>
);`}
        lang="tsx"
        filename="interaction-element.tsx"
      />
      <ul>
        <li>
          <code>FlexInteraction</code> / <code>ControlledFlexInteraction</code>{" "}
          / <code>FlexInteractionField</code> — render Flex Interaction nodes
          as buttons; <code>type === &apos;cypher&apos;</code> routes copy
          through dictionary resolution with variables.
        </li>
        <li>
          <code>FlexText</code> (<code>text/text.tsx:45-81</code>) — the base
          text element; <code>convertCopyToTextProps(copy)</code> resolves
          cypher/dictionary copy objects.
        </li>
        <li>
          Element model types for everything else:{" "}
          <code>common/services/flex/models/</code> — banner, badge, offer,
          roadblock, modal, interaction-list, image-element, total-due,
          charges-section.
        </li>
      </ul>
      <p>
        Naming note for cross-repo work: Flex&apos;s server-side builders speak
        of <code>InteractionElement</code>/<code>LocalizedTextElement</code>;
        the client components are <code>FlexInteraction*</code>/<code>FlexText</code>.
        Same wire contract, different names — there is no literal{" "}
        <code>LocalizedTextElement</code> component in cgi-web.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"How does a Hulu page get its content?"`}
        intro={
          <>
            The strong answer walks the pipeline in order and names the seam
            where brands diverge.
          </>
        }
        steps={[
          "Start at the seam: commerce-base pages are brand-blind and read a jotai dataInterfaceAtom; each brand app hydrates it — Hulu with buildHuluDataInterface from data-interface-hulu.",
          "Describe the client: getFlexScreen maps a screen key through flexScreenKeysToUrls to a /screens/v1/... path, fetches with credentials:'include' (Hulu cookies) and x-bamsdk-platform, and unwraps the { data } envelope.",
          "Give the killer example: the same accountDetails key maps to hulu/account-home for Hulu — the map is where brand routing lives.",
          "Cover control flow: React Query wraps the call; isFlexRedirect runs before rendering because Flex can answer with navigation instead of content; errors carry an owner tag into observability.",
          "Finish at render: generic element components (FlexInteraction, FlexText) resolve cypher copy via TextWithVariables — copy bugs on these screens are dictionary/Flex bugs, not React string bugs.",
        ]}
      />

      <h2 id="challenge">Challenge: Add a Screen</h2>
      <InterviewChallenge
        title="Wire a new Hulu screen end to end"
        scenario={
          <>
            Flex has shipped a new screen at{" "}
            <code>GET /screens/v1/subscription/loyalty-offer</code> and product
            wants it live on Hulu at <code>/commerce/loyalty</code>. The screen
            returns a headline (cypher copy), one interaction (CTA), and{" "}
            <code>metricsData</code>. Disney+ will adopt it next quarter; ESPN
            never will.
          </>
        }
        tasks={[
          "List every file you would touch in cgi-web, in dependency order, to ship this for Hulu only.",
          "Decide where the page component lives (app vs commerce-base) given the Disney+ plan, and defend the choice.",
          "Explain how the CTA's copy gets rendered without you writing any English strings.",
          "Describe how you would smoke-test it locally against a local Flex instance, including what breaks if you skip the SSL proxy.",
        ]}
        pitfalls={[
          "Skipping the flexScreenKeysToUrls entry — getFlexScreen throws on unmapped keys by design.",
          "Building the page in the hulu app when a brand-shared commerce-base page + per-brand route file is the established pattern.",
          "Hardcoding CTA copy instead of rendering the cypher payload through FlexInteraction/TextWithVariables.",
          "Testing on bare localhost:5030 where cookie auth cannot bootstrap.",
        ]}
        signal="A strong answer starts at the data-interface map, places shared code in commerce-base with a thin Hulu route, and treats copy as server-owned."
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Files, in order:</strong> (1){" "}
          <code>packages/cgi/data-interface-hulu/src/flex/flex-data-interface.ts</code>{" "}
          — add <code>loyaltyOffer: &apos;subscription/loyalty-offer&apos;</code>{" "}
          to <code>flexScreenKeysToUrls</code>; (2) a typed content model in{" "}
          <code>commerce-base/src/common/services/flex/models/</code>; (3) a{" "}
          <code>LoyaltyOfferPage</code> in{" "}
          <code>commerce-base/src/...</code> (shared home — Disney+ adopts next
          quarter; ESPN simply never adds a route) using{" "}
          <code>useQuery</code> + <code>dataInterface.getFlexScreen</code> +{" "}
          <code>isFlexRedirect</code> + element components; (4) the thin route
          shell <code>apps/commerce/hulu/pages/commerce/loyalty/index.page.tsx</code>{" "}
          importing it; (5) analytics wiring reading{" "}
          <code>metricsData</code> from the payload. Disney+ later ships only
          its own route file + its data-interface map entry.
        </p>
        <p>
          <strong>Copy:</strong> Flex sends{" "}
          <code>{`copy: { text: '<cypher_key>', dictionary: 'unified-commerce' }`}</code>;{" "}
          <code>FlexInteraction</code> with <code>type: &apos;cypher&apos;</code>{" "}
          resolves it via <code>TextWithVariables</code> against the
          dictionary. You never write UI strings — you review cypher keys.
        </p>
        <p>
          <strong>Local smoke:</strong> run Flex locally (<code>npm run
          local</code>, port 3200), point the app&apos;s edge base URL at it
          (env config), start <code>pnpm dev:commerce:hulu</code>, open{" "}
          <code>https://local.huluqa.com:5003/commerce/loyalty</code>. Skipping
          the proxy → cookie bootstrap fails on bare localhost → the layout
          auth gate blocks rendering and you stare at a blank page.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Brand divergence lives at the data-interface seam:{" "}
          <code>buildHuluDataInterface</code> hydrates{" "}
          <code>dataInterfaceAtom</code>; shared pages stay brand-blind.
        </li>
        <li>
          <code>getFlexScreen</code>: key → <code>flexScreenKeysToUrls</code> →{" "}
          <code>/screens/v1/...</code>; unmapped keys throw; auth = cookies via{" "}
          <code>credentials: &apos;include&apos;</code>.
        </li>
        <li>
          <code>accountDetails → hulu/account-home</code> — the map, not the
          page, decides brand routing.
        </li>
        <li>
          Always check <code>isFlexRedirect</code> before rendering — Flex can
          answer with navigation instead of content.
        </li>
        <li>
          Element rendering: <code>FlexInteraction*</code> +{" "}
          <code>FlexText</code> + <code>TextWithVariables</code>; copy is
          cypher-resolved, never hardcoded.
        </li>
        <li>
          Cross-repo debugging recipe: screen key → map → Flex route → Flex
          service.
        </li>
      </ul>
    </div>
  );
}
