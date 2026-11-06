import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const registryFlow = String.raw`flowchart TD
  A["CMS node: _type = plan_card"] --> B["Zod model<br/>plan-card-model.ts"]
  B --> C["Builder<br/>build-plan-card.ts"]
  C --> D["StitchElement _type = PlanCard"]
  D --> E["StitchPlanCard<br/>useRegisteredComponent planCard"]
  E --> F["Registry lookup by key"]
  F --> G["Default binding<br/>growth-components PlanCard"]
  F -.->|"ESPN adds no override"| H["ESPN overrides only:<br/>entitledContent, slider, image"]
  G --> I["Rendered card in the DOM"]`;

const tokenDecision = String.raw`flowchart TD
  A["GSSP reaches offer-token step"] --> B{"Is the global CMS<br/>instance configured?"}
  B -->|"no"| C["Skip replacement<br/>page renders raw placeholder text"]
  B -->|"yes"| D["Fetch token catalogue<br/>from CMS global space"]
  D --> E{"Fetch OK and every<br/>referenced token resolves?"}
  E -->|"no"| F["throw, Next renders /500"]
  E -->|"yes"| G["Format currency, substitute<br/>price and retailPrice"]
  G --> H["Span tag tokens_replaced = N"]`;

const handoffSequence = String.raw`sequenceDiagram
  autonumber
  participant Author as CMS author
  participant CMS as Cannonball or Spaceball
  participant GSSP as ESPN marketing GSSP
  participant Tok as plans-pricing-api
  participant Page as Browser on plus.espn.com
  participant Chk as secure.web.plus.espn.com
  Author->>CMS: publish plan_card with token text and a hand-typed href
  Page->>GSSP: GET /changeplans
  GSSP->>CMS: fetch page content for route and locale
  CMS-->>GSSP: snapshot JSON with unresolved token text
  GSSP->>Tok: replaceOfferTokensInSnapshot
  Tok->>CMS: fetch offer_token_config from global space
  CMS-->>Tok: offer_tokens with package_id and fallback values
  Tok-->>GSSP: snapshot with formatted prices substituted
  GSSP-->>Page: StitchDocument props, href untouched
  Page->>Page: user clicks the plan CTA, RUM action GET_ESPN
  Page->>Chk: navigate to /commerce/billing with pref=package_id
  Note over Page,Chk: nothing is shared but the URL`;

const ownershipTriage = String.raw`flowchart TD
  S["Symptom: user lands on the wrong plan in checkout"] --> Q1{"Is the pref value in<br/>the address bar correct?"}
  Q1 -->|"no, wrong pref"| CMSBUG["CMS CONTENT BUG<br/>fix the href in the CMS<br/>no repo test can catch it"]
  Q1 -->|"yes, pref is right"| Q2{"Does checkout resolve that<br/>pref to the right offer?"}
  Q2 -->|"no"| FLEX["FLEX / COMMERCE BUG<br/>growth-life-client-api<br/>plus apps/commerce/espn"]
  Q2 -->|"yes"| Q3{"Was the price on<br/>the card also wrong?"}
  Q3 -->|"yes"| TOK["CONTENT BUG in offer tokens<br/>global space fallback values"]
  Q3 -->|"no"| PROD["Not a bug: card price and pref<br/>are independent CMS fields"]
  CMSBUG -.-> NOTE["buildLink passes href through verbatim"]`;

const prefLifecycle = String.raw`flowchart LR
  A["Plan card CTA on plus.espn.com<br/>href authored in CMS"] --> B["secure.web.plus.espn.com<br/>/commerce/billing?pref=espn_unlimited"]
  B --> C{"Signed in?"}
  C -->|"no"| D["/identity/login or sign-up<br/>search string preserved"]
  D --> B
  C -->|"yes"| E["Flex BFF request<br/>pref sent to server-driven-UI API"]
  E --> F["Flex action payload<br/>content.action.data.query.pref"]
  F --> G["Billing screen from<br/>the resolved offer"]
  E -.->|"student flow"| H["pref re-attached to SheerID<br/>program and referer URLs"]`;

export const toc: TocItem[] = [
  { id: "no-plan-page-file", title: "There Is No ESPN Plan Page File", level: 2 },
  { id: "registry-pattern", title: "The Registry Pattern, End to End", level: 2 },
  { id: "offer-tokens", title: "How Prices Get Onto a Card: Offer Tokens", level: 2 },
  { id: "fallback-reality", title: "The Fallback Is the Price (Today)", level: 2 },
  { id: "pricing-failure-modes", title: "What Users See When Pricing Breaks", level: 2 },
  { id: "handoff-contract", title: "The Hand-Off Contract", level: 2 },
  { id: "who-owns-the-url", title: "Who Owns the URL", level: 2 },
  { id: "after-the-hop", title: "What Happens to pref After the Hop", level: 2 },
  { id: "no-attribution-forwarding", title: "The Attribution Gap", level: 2 },
  { id: "trace-it-yourself", title: "Trace It Yourself", level: 2 },
  { id: "gotchas", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The Card That Lies", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function PlanCardsAndTheHandoff() {
  return (
    <div className="article-content">
      <p>
        The plan card is where ESPN&apos;s sales layer stops selling and starts handing over. Everything before it is content; everything after it is money. The seam between the two is one query parameter in one URL — and that URL is <strong>not built by any code in this repository</strong>. Internalising that single fact is the difference between fixing a wrong plan link in twenty minutes and spending two days grepping the wrong codebase. This module is the contract in detail: where cards come from, how prices land on them, what the hand-off URL actually is, who owns it, and what survives the hop.
      </p>

      <h2 id="no-plan-page-file">There Is No ESPN Plan Page File</h2>
      <p>
        First thing that breaks a newcomer&apos;s mental model: there is no <code>plan-page.tsx</code> anywhere in <code>apps/marketing-unified/espn</code>, and no ESPN plan card component either. The app has exactly <strong>one content route</strong> — <code>apps/marketing-unified/espn/src/pages/[[...path]].page.tsx</code>, seven lines long — and all ~29 CMS routes (<code>/</code>, <code>/changeplans</code>, <code>/bundle</code>, <code>/nflbundle</code>, <code>/soccer</code>, …) are the same React page fed different CMS content.
      </p>
      <p>
        A plan card is therefore neither a page nor a route. It is a <strong>CMS content node</strong> of type <code>plan_card</code> that an author dropped onto a landing page, rendered by a generic component ESPN neither owns nor overrides. That design is exactly what makes 29 pages maintainable by a team shipping zero bespoke React per sport: pages are content, not code.
      </p>

      <h2 id="registry-pattern">The Registry Pattern, End to End</h2>
      <p>
        Stitch (<code>@solo/stitch</code>) turns CMS JSON into React through a four-stage pipeline — <strong>Model → Builder → Component → Registry</strong>. The registry is the swap point where a brand substitutes its own implementation without touching content or builders.
      </p>
      <ArticleTable caption="The four Stitch layers for a plan card and the file that owns each." minWidth={900}>
        <table>
          <thead><tr><th>Layer</th><th>File</th><th>Job</th></tr></thead>
          <tbody>
            <tr>
              <td>Model (zod)</td>
              <td><code>stitch/src/models/plan-card-model.ts</code></td>
              <td><code>_type</code> must literally be <code>plan_card</code>; <code>header</code> needs at least one child.</td>
            </tr>
            <tr>
              <td>Builder</td>
              <td><code>stitch/src/builders/build-plan-card.ts</code></td>
              <td>CMS fields to <code>StitchElement</code> with <code>_type: PlanCard</code>. Returns <code>null</code> if the built header is empty.</td>
            </tr>
            <tr>
              <td>Stitch component</td>
              <td><code>stitch/src/components/stitch-plan-card.tsx</code></td>
              <td>Calls <code>useRegisteredComponent(&apos;planCard&apos;)</code> and recurses into children.</td>
            </tr>
            <tr>
              <td>Registry</td>
              <td><code>stitch/src/components/stitch-component-registry-provider.tsx</code></td>
              <td>Line 343 binds <code>planCard</code> to <code>growth-components/src/plan-card/plan-card.tsx</code>.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={registryFlow}
        title="CMS Content Type to Rendered Plan Card"
        caption="Note the dotted branch: ESPN overrides three registry keys, and planCard is not one of them."
        minHeight={550}
      />
      <CodeBlock
        code={`// apps/marketing-unified/espn/src/shared/layout/application-layout/
//   stitch-component-registry-overrides.tsx
// Only three keys are overridden. planCard is absent, so the default binding wins.
export const registryOverrides = {
  entitledContent: { component: EntitledContent },
  slider: { getItemsApiAdapter: getWatchApiItemsAdapter },
  image: { srcsetGenerator: ripcutSrcsetGenerator },
};`}
        lang="typescript"
        filename="stitch-component-registry-overrides.ts"
      />
      <p>
        Two consequences. First, a &quot;plan card change&quot; is usually a content change, and a real code change to <code>PlanCard</code> lands on Disney+ and Hulu simultaneously — the component is shared. Second, the card is a <strong>pure layout container</strong>: its <code>header</code>, <code>body</code> and <code>footer</code> are arbitrary child elements built by <code>buildEntity</code>. It knows nothing about plans, prices, packages, or checkout. Every piece of meaning on the card is authored content.
      </p>

      <h2 id="offer-tokens">How Prices Get Onto a Card: Offer Tokens</h2>
      <p>
        Since the card is a dumb container, the price has to arrive as text. The mechanism is <strong>offer tokens</strong>: an author types a placeholder such as <code>&#123;&#123;espn_unlimited_monthly.price&#125;&#125;</code> into a text node, and a server-side step in <code>getServerSideProps</code> replaces it with a formatted price before props are built. The catalogue is itself CMS content, published to a separate space (<code>espnplus</code> / <code>global</code>) under route <code>offer_token_config</code>:
      </p>
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
    },
    {
      "token_name": "espn_unlimited_annual",
      "package_id": "espn_unlimited",
      "fallback_frequency": "ANNUAL",
      "fallback_price": "299.99",
      "fallback_currency": "USD"
    }
  ],
  "custom_tokens": []
}`}
        lang="json"
        filename="cnbl-offer-token-global-snapshot.json"
      />
      <CodeBlock
        code={`// packages/marketing/plans-pricing-api/src/tokens.ts
// Only these two token properties are substitutable in a snapshot.
export const TOKEN_PROPERTIES = ['price', 'retailPrice'] as const;

export const tokenModel = z.object({
  _type: z.literal('offer_token'),
  token_name: z.string(),
  // package identifier found in Genie+ (Offer Management Platform) — and OPTIONAL
  package_id: z.string().optional(),
  fallback_frequency: z.enum(['MONTHLY', 'ANNUAL', 'ONE_TIME']),
  fallback_retail_price: z.string().optional(),
  fallback_price: z.string().optional(),
  fallback_currency: z.string().optional(),
});`}
        lang="typescript"
        filename="tokens.ts"
      />
      <p>
        So <code>.price</code> and <code>.retailPrice</code> work, and <code>&#123;&#123;espn_unlimited_monthly.frequency&#125;&#125;</code> <strong>does not</strong> — it survives replacement as an unknown token, throws, and takes the whole page to <code>/500</code>. Note also where the authoritative <code>package_id</code> vocabulary lives, per the code comment: <strong>Genie+, the Offer Management Platform</strong> — not this repo.
      </p>

      <h2 id="fallback-reality">The Fallback Is the Price (Today)</h2>
      <p>
        It is natural to read <code>fallback_price</code> as &quot;the safety net if the pricing API is slow.&quot; In this repository, as checked out, it is stronger: <strong>the fallback is always the value</strong>. The token builder is called with an empty offer object and an explicit TODO:
      </p>
      <CodeBlock
        code={`// packages/marketing/plans-pricing-api/src/tokens.ts
const offerTokens = cmsTokens.value.offer_tokens
  .map((cmsToken) =>
    buildOfferToken({
      contentField: cmsToken,
      // TODO WEB-33524: Fetch offers for all tokens and replace them accordingly
      offer: {}, // Empty offer should use fallback values,
      language, region, appLangMap, formatRules, currencySymbolData,
    }),
  )
  .filter((t): t is OfferToken => t !== null);

// buildOfferToken resolves every field the same way:
//   price:     formatPrice(offer.price ?? contentField.fallback_price)
//   frequency: offer.frequency ?? contentField.fallback_frequency
//   currency:  offer.currency  ?? contentField.fallback_currency`}
        lang="typescript"
        filename="tokens.ts"
      />
      <p>
        A live-offers client does exist in the same package — <code>packages/marketing/plans-pricing-api/src/glo/get-offers.ts</code> POSTs to GLO (<code>glo.prod.hulu.com/v2/offers</code>) with a <code>packageId</code> and <code>packageFrequency</code> — but the token path never calls it. So the honest answer to &quot;what does the user see when the pricing API is slow or down?&quot; is: <strong>nothing changes</strong>. These pages have no runtime dependency on a pricing service; they depend on the <em>CMS</em> token catalogue. A further hint that the live path was never wired for this tenant: <code>GetOffersArgs.brand</code> is typed <code>&apos;DISNEY&apos; | &apos;HULU&apos;</code>, with no ESPN value.
      </p>
      <p>
        Why this is a product decision, not a code detail: baking the price into published content buys a sales page that cannot be taken down by a pricing outage, renders from CDN-cached content, and lets marketing change a price with a content publish instead of a deploy. The cost is that the page can display a <em>stale but confident</em> price indefinitely if CMS content and Genie+ drift. Pricing truth is deliberately deferred to checkout, where Flex computes the real charge — which is why &quot;the card said 29.99 and billing said something else&quot; is a content-versus-offer-management reconciliation problem, not a rendering bug.
      </p>

      <h2 id="pricing-failure-modes">What Users See When Pricing Breaks</h2>
      <MermaidDiagram
        chart={tokenDecision}
        title="Offer-Token Replacement: Skip, Throw, or Substitute"
        caption="The skip branch is the dangerous one — it degrades silently into visible placeholder text rather than an error."
        minHeight={550}
      />
      <ArticleTable caption="The offer-token outcomes, what the user sees, and where to look." minWidth={940}>
        <table>
          <thead><tr><th>Condition</th><th>What the user sees</th><th>Where to look</th></tr></thead>
          <tbody>
            <tr>
              <td><code>global</code> instance unconfigured for the selected backend</td>
              <td>Page renders fine, with literal placeholder text where prices belong</td>
              <td>Sparrow <code>paths</code> config; <code>tokens_replaced</code> span tag drops to 0</td>
            </tr>
            <tr>
              <td>Token fetch fails, or a referenced token name is unknown</td>
              <td>Hard <code>/500</code> for the whole page — no partial render</td>
              <td>Logs for <code>Unknown token found in the snapshot</code></td>
            </tr>
            <tr>
              <td>Referenced property missing (e.g. no <code>fallback_price</code>)</td>
              <td>Hard <code>/500</code></td>
              <td><code>replace-tokens-in-snapshot.ts</code> throws before rendering</td>
            </tr>
            <tr>
              <td>Everything resolves</td>
              <td>Formatted price, US-only currency rules</td>
              <td><code>tokens_replaced</code> counts substitutions in APM</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The throw is intentional, not a bug to &quot;fix.&quot; The comment in <code>.../landing-page/get-server-side-props/get-cms-content-with-tokens-replaced.ts</code> says so: <em>we need to throw here to render the 500 page in production</em>. A sales page with a broken price is considered worse than no page.
      </p>

      <h2 id="handoff-contract">The Hand-Off Contract</h2>
      <p>
        Here is the entire contract between the sales domain and the checkout domain — real authored hrefs from the ESPN CMS fixtures in <code>apps/marketing-unified/espn/src/mocks/apis/</code>:
      </p>
      <CodeBlock
        code={`https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited
https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=espn_select
https://secure.web.plus.espn.com/commerce/billing?pref=espn_nfl_bundle
https://secure.web.plus.espn.com/commerce/billing?pref=disney_hulu_espn_nfl_bundle

# login variant, used when the CTA is "Log In" rather than "Get ESPN"
https://secure.web.plus.espn.com/identity/login?redirectURL=https://plus.espn.com/`}
        lang="text"
        filename="handoff-urls.txt"
      />
      <p>
        Three components, and that is all: the <strong>host</strong> (<code>secure.web.plus.espn.com</code>, served by <code>apps/commerce/espn</code>), the <strong>path</strong> (<code>/commerce/billing</code> for signup; <code>/commerce/account</code> and <code>/commerce/change-subscription</code> appear in commerce fixtures), and <strong>one query parameter</strong>, <code>pref</code> — the <em>preferred package id</em>. No session, no cart id, no signed payload, no shared client state. Two Next apps coupled by a string.
      </p>
      <MermaidDiagram
        chart={handoffSequence}
        title="From CMS Publish to Checkout Navigation"
        caption="Compare step 1 with the last step: the href the author typed is the href the browser navigates to."
        minHeight={550}
      />
      <ArticleTable
        caption="Every pref value observable in ESPN marketing fixtures. Product meanings are read from the identifiers, not confirmed by repo code."
        minWidth={920}
      >
        <table>
          <thead><tr><th><code>pref</code></th><th>Reads as</th><th>Notes</th></tr></thead>
          <tbody>
            <tr>
              <td><code>espn_unlimited</code></td>
              <td>Flagship all-in ESPN plan, standalone</td>
              <td>Matches <code>offer_token.package_id</code> in the catalogue</td>
            </tr>
            <tr>
              <td><code>espn_unlimited_bundle</code></td>
              <td>ESPN Unlimited inside a Disney bundle</td>
              <td>Most frequent in fixtures; the value the commerce identity tests assert</td>
            </tr>
            <tr>
              <td><code>espn_select</code></td>
              <td>Lower ESPN tier</td>
              <td>One fixture occurrence carries a trailing space inside the href</td>
            </tr>
            <tr>
              <td><code>espn_nfl_bundle</code></td>
              <td>ESPN plus an NFL package</td>
              <td>Used on <code>/nflbundle</code>-style offer pages</td>
            </tr>
            <tr>
              <td><code>disney_hulu_espn_nfl_bundle</code></td>
              <td>Trio bundle plus NFL</td>
              <td>Cross-brand package</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>This is the observable subset, not the vocabulary.</strong> Only two ESPN routes have local snapshots (home and soccer), so other pages certainly reference values absent here. And <code>pref</code> is not ESPN-specific: the commerce mocks in <code>packages/cgi/commerce-base/src/signup/__browser-mocks__/handlers.ts</code> branch on <code>disney_premium</code>, <code>disney_basic</code>, <code>disney_bundle_trio_basic</code>, <code>disney_bundle_trio_premium</code>, <code>disney_bundle_duo_basic</code>, <code>megabundle</code> and <code>combo_plus</code>. One shared package namespace across all three brands, owned by Offer Management.
      </p>

      <h2 id="who-owns-the-url">Who Owns the URL</h2>
      <p>
        This is the section that saves two days. The marketing app <strong>does not construct hand-off URLs</strong>. The link builder passes <code>href</code> through verbatim; the only transformation is optional locale prefixing when the CMS explicitly sets <code>autoLocalizeUrl</code>:
      </p>
      <CodeBlock
        code={`// packages/marketing/stitch/src/builders/build-link.ts
// The ONLY thing done to href. No query-param merge, no pref computation,
// no campaign forwarding, no validation, no allowlist.
let localizedHref = href;

if (href && autoLocalizeUrl) {
  const { locale } = appContext;
  localizedHref = autoLocalizeUri(href, locale);
}

return {
  _type: 'Link',
  _id,
  actionKey,
  href: localizedHref, // <- straight from CMS content
  // ...styling, analytics ids, children
};`}
        lang="typescript"
        filename="build-link.ts"
      />
      <p>
        Therefore <strong>a wrong <code>pref</code> is a content bug</strong>. It was typed by hand into a CMS field. No unit test, no Playwright spec, and no type in this monorepo can catch it, because the value never passes through code that has an opinion about it — no enum, no zod refinement on the link href. The repo is structurally incapable of validating the most business-critical value in the flow.
      </p>
      <MermaidDiagram
        chart={ownershipTriage}
        title="Triage: Wrong Plan in Checkout"
        caption="The first question is never 'which component built this link' — it is 'what is in the address bar'."
        minHeight={550}
      />
      <ArticleTable caption="Symptom to owning system. Use this before opening an editor." minWidth={960}>
        <table>
          <thead><tr><th>Symptom</th><th>Owning system</th><th>First move</th></tr></thead>
          <tbody>
            <tr>
              <td>CTA sends users to the wrong plan</td>
              <td>CMS content (<code>espnplus</code> / <code>landingpages</code>), Growth content authors</td>
              <td>Read <code>pref</code> from the address bar, fix the href in the CMS. No PR needed.</td>
            </tr>
            <tr>
              <td><code>pref</code> correct but checkout shows a different offer</td>
              <td>Flex / <code>growth-life-client-api</code> plus <code>apps/commerce/espn</code></td>
              <td>Inspect the Flex billing response; marketing is not involved</td>
            </tr>
            <tr>
              <td>Placeholder token text visible on the page</td>
              <td>Sparrow config for the <code>global</code> CMS instance</td>
              <td>Check <code>tokens_replaced</code> and the Sparrow <code>paths</code> block</td>
            </tr>
            <tr>
              <td>Landing page 500s right after a content publish</td>
              <td>Token catalogue, or an author typo in a token name</td>
              <td>Search logs for <code>Unknown token found in the snapshot</code></td>
            </tr>
            <tr>
              <td>Price on the card is stale</td>
              <td><code>fallback_*</code> values in the CMS <code>global</code> space vs Genie+</td>
              <td>Update the offer token content — there is no live price to refresh</td>
            </tr>
            <tr>
              <td>A whole plan card is missing from the page</td>
              <td>CMS content — <code>build-plan-card.ts</code> returns <code>null</code> on an empty header</td>
              <td>Search logs for <code>eventName: &apos;stitchWarn&apos;</code></td>
            </tr>
            <tr>
              <td>Campaign attribution lost across the hop</td>
              <td>Nobody — nothing forwards it</td>
              <td>Treat as a product gap, not a defect in either app</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="after-the-hop">What Happens to pref After the Hop</h2>
      <MermaidDiagram
        chart={prefLifecycle}
        title="The Life of pref After the Domain Hop"
        caption="pref is sticky: it survives an authentication detour and is re-emitted inside the Flex server-driven-UI action payload."
        minHeight={400}
      />
      <ul>
        <li>
          <strong>It survives authentication.</strong> <code>packages/cgi/commerce-base/src/identity/login/pages/login-wrapper-page.test.tsx</code> and its sign-up sibling both drive <code>?pref=espn_unlimited_bundle</code> through the identity flow and assert the search string comes back intact. A user forced to log in mid-flow does not lose their plan choice.
        </li>
        <li>
          <strong>It becomes part of the server-driven-UI contract.</strong> Flex (the BFF) reads <code>pref</code> from both the query string and the request body, and re-emits it inside action payloads at <code>content.action.data.query.pref</code>. It is state the BFF carries forward, not a fire-and-forget deep-link param.
        </li>
        <li>
          <strong>It propagates into third-party detours.</strong> <code>commerce-base/src/signup/student/student-sheerid-iframe.tsx</code> re-attaches <code>pref</code> to both the SheerID program URL and the referer URL, so a student who verifies by email days later returns to the right package.
        </li>
      </ul>
      <p>
        <strong>Open question, honestly stated:</strong> what commerce does with an <em>unknown</em> <code>pref</code> is not answerable from the marketing side. The commerce mocks document that a request with no <code>offerId</code>, <code>campaignId</code>, or <code>pref</code> returns a redirect response, commented <em>this matches Flex&apos;s api behavior today</em> — but that covers <em>missing</em>, not <em>invalid</em>. Verify against real Flex before promising anyone that a typo degrades gracefully.
      </p>

      <h2 id="no-attribution-forwarding">The Attribution Gap</h2>
      <p>
        State this plainly, because people assume otherwise: <strong>no campaign or attribution query parameters are forwarded from the marketing URL into the commerce URL</strong>. <code>buildLink</code> does not merge the incoming request&apos;s query string into outgoing hrefs. A user arriving at <code>plus.espn.com/nflbundle?utm_source=…</code> and clicking a plan CTA loses that parameter at the domain boundary.
      </p>
      <p>
        The one nuance: authors <em>can</em> hard-code campaign params into a specific href, and they do — one ESPN fixture contains an href with <code>ex_cid=ESPN-espnplus-mlp-…</code> baked in. That is a static content value chosen per link, not dynamic forwarding of the visitor&apos;s actual campaign. Any conversation about attributing checkout conversions back to a marketing campaign starts with closing this gap.
      </p>

      <h2 id="trace-it-yourself">Trace It Yourself</h2>
      <CodeBlock
        code={`# 1. Read the contract straight off the page. DevTools > inspect the CTA anchor.
#    The href IS the answer; nothing computed it at runtime.
#    -> https://secure.web.plus.espn.com/commerce/billing?pref=espn_select

# 2. Confirm the app did not touch it: buildLink only locale-prefixes.
grep -n "autoLocalizeUrl" packages/marketing/stitch/src/builders/build-link.ts

# 3. Find where the value was authored. Enable the debug widget and follow the
#    CMS deep-link that getPageProps puts in the props debug block.
cd apps/marketing-unified/espn
echo "ENABLE_DEBUG_TOOLING=true" >> .env.development.local
pnpm dev            # Next on 4040, SSL proxy on 5040
open https://local.plus.espn.com:5040/changeplans

# 4. Cross-check the PRICE on that same card against the token catalogue.
#    package_id on the token is what the pref SHOULD be for that price.
grep -n "package_id" src/mocks/apis/cnbl-offer-token-global-snapshot.json

# 5. Verify against published content, not your local fixture. Only home and
#    soccer have local snapshots; anything else needs preview or real CMS.
open "https://local.plus.espn.com:5040/changeplans?preview-offer-tokens"`}
        lang="bash"
        filename="trace-a-plan-card.sh"
      />
      <p>
        Step 4 is the one people skip and the one that catches real bugs. The price shown on a card and the <code>pref</code> on its button are <strong>two independent CMS fields with no code-level link</strong>. A card can render the annual price from <code>espn_unlimited_annual</code> while its CTA carries <code>pref=espn_select</code>, and every layer in this repo will render that happily.
      </p>

      <h2 id="gotchas">Gotchas &amp; Traps</h2>
      <ul>
        <li><strong>Card price and card CTA are unrelated.</strong> Nothing derives the href from <code>package_id</code>. Reviewing a content change means eyeballing both fields together.</li>
        <li><strong>A headerless plan card silently disappears.</strong> <code>build-plan-card.ts</code> returns <code>null</code> when the built header is empty; the page renders without it and only logs <code>stitchWarn</code>.</li>
        <li><strong>Zod validation is non-fatal.</strong> A malformed <code>plan_card</code> field logs a warning and proceeds, so schema drift shows up as a missing element, never an error page.</li>
        <li><strong>Only <code>price</code> and <code>retailPrice</code> are substitutable.</strong> Any other <code>token.property</code> an author invents is an unknown token and 500s the page.</li>
        <li><strong>Currency handling is US-only and hard-coded</strong> in <code>get-cms-content-with-tokens-replaced.ts</code> (USD, region <code>US</code>, <code>appLangMap</code> of <code>en</code> to <code>en-US</code>). A non-US ESPN market needs that literal changed.</li>
        <li><strong>Two Spaceball flags, easy to confuse.</strong> <code>enableSpaceball</code> switches page content and redirects; <code>enableSpaceballMlp</code> switches <em>only</em> the offer-token source.</li>
        <li><strong>Editing <code>PlanCard</code> is a three-brand change</strong> — it lives in <code>packages/marketing/growth-components</code> and Disney+ and Hulu share the registry key.</li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how does the marketing site hand a user off to checkout?"
        intro="A weak answer describes a redirect. A strong answer names the exact contract, then names who owns each half of it."
        steps={[
          "Open with the contract, concretely: one URL on a different host, secure.web.plus.espn.com/commerce/billing, carrying a single query param pref that is the preferred package id.",
          "State what is NOT shared: no session, no cart, no signed payload, no client-side state. The two Next apps are coupled only by that string.",
          "Name the ownership boundary: the marketing app never builds the URL — buildLink passes the CMS href through verbatim, with optional locale prefixing as the only transformation.",
          "Draw the debugging consequence: a wrong pref is a CMS content bug, untestable and uncatchable in the marketing repo, so triage starts in the address bar and moves to the CMS, not to a component.",
          "Close on the trade-off: string coupling keeps the marketing side deploy-independent and cacheable, at the cost of losing compile-time and test-time validation of the most business-critical value in the flow.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: where do the prices on a plan card come from?"
        intro="Interviewers are probing whether you know the difference between a render-time API call and a content-time substitution — and whether you can articulate the availability trade-off."
        steps={[
          "Lead with the mechanism: authors write placeholder tokens; a server-side step in getServerSideProps substitutes formatted prices before props are built. The card component is a dumb layout container.",
          "Name the source of truth precisely: the token catalogue is separate CMS content in the espnplus/global space, keyed by token_name, carrying package_id and fallback_* values.",
          "Be honest about current state: the GLO live-offers client exists in the package but the token path passes an empty offer, so fallbacks are always used (TODO WEB-33524). A pricing-service outage does not affect these pages.",
          "Explain the trade: content-baked pricing buys outage-proof, CDN-cacheable sales pages and price changes without a deploy; it risks a confidently wrong price if CMS and Genie+ drift.",
          "Finish with observability: replacements are counted into the tokens_replaced span tag, and failures deliberately throw to /500 rather than shipping a broken price.",
        ]}
      />

      <h2 id="challenge">Challenge: The Card That Lies</h2>
      <InterviewChallenge
        title="Wrong plan in checkout, two days before a campaign launch"
        scenario={
          <>
            Marketing reports that the annual ESPN Unlimited card on <code>/changeplans</code> shows <code>$299.99/yr</code>, but users who click it land in checkout on a monthly plan at <code>$29.99/mo</code>. A staff engineer has already burned a day in <code>packages/marketing/growth-components/src/plan-card/</code> and <code>packages/marketing/stitch/src/builders/</code> and found nothing. You inherit the ticket, with Datadog access, CMS preview access, and the repo.
          </>
        }
        tasks={[
          "State, before touching code, which system almost certainly owns this bug and what single piece of evidence would confirm it in under a minute.",
          "Explain why no test in cgi-web could have caught this, referencing the specific code path that handles href.",
          "Describe how the price on the card and the destination of its button can disagree at all — name the two independent CMS fields involved.",
          "Propose the smallest durable guardrail, and say honestly which repo or system it would have to live in.",
          "Say what you would NOT do, and why the obvious code fix would be wrong.",
        ]}
        pitfalls={[
          "Adding validation to buildLink that rewrites or rejects hrefs — this quietly makes marketing responsible for a vocabulary it does not own, and breaks every non-commerce link.",
          "Deriving the href from offer_token.package_id in the builder — package_id is optional on the token model and a card's price may reference several tokens.",
          "Assuming a pricing API returned bad data; the token path never calls a pricing API in this repo.",
          "Writing a Playwright assertion on the pref value — it pins today's CMS content into a test content authors cannot see or update.",
        ]}
        signal="Strong candidates reach for the address bar before the editor, name the CMS as the owner in the first sentence, and can explain why the tempting code fix transfers ownership of a business vocabulary into the wrong layer."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>1. Owner and evidence.</strong> This is a CMS content bug. The one-minute confirmation is to inspect the anchor on the live card and read <code>pref</code> out of the href. If it says <code>pref=espn_unlimited</code> while the card advertises the annual price, the marketing app did its job perfectly — it rendered exactly what was published.
        </p>
        <p>
          <strong>2. Why no test catches it.</strong> <code>packages/marketing/stitch/src/builders/build-link.ts</code> assigns <code>href: localizedHref</code>, where <code>localizedHref</code> is the CMS value, optionally locale-prefixed when <code>autoLocalizeUrl</code> is set. There is no parsing, no allowlist, no zod refinement on the URL, and no enum of package ids anywhere in the repo. The value is opaque data passing through, so there is nothing to assert beyond &quot;pass-through works&quot; — which it does.
        </p>
        <p>
          <strong>3. How they disagree.</strong> The price is text produced by offer-token substitution: an author wrote <code>&#123;&#123;espn_unlimited_annual.price&#125;&#125;</code> in a text node and <code>plans-pricing-api</code> replaced it from <code>fallback_price</code>. The destination is a completely separate field — the <code>href</code> on a link node inside the card&apos;s header. Nothing in the model, builder, or component ties the token used for the price to the <code>pref</code> in the CTA. Two fields, two authors&apos; keystrokes, zero cross-validation.
        </p>
        <p>
          <strong>4. Smallest durable guardrail.</strong> Not in this repo. The right place is either the CMS itself — make the plan-card CTA a constrained reference to a package rather than a free-text URL, so authors pick from the Genie+ vocabulary — or a commerce-side monitor that alerts when Flex receives a <code>pref</code> it cannot resolve. A cheap interim step is a content-review checklist that reads the price token and <code>pref</code> together, plus a Datadog monitor on the redirect/no-offer response Flex returns.
        </p>
        <p>
          <strong>5. What not to do.</strong> Do not &quot;fix&quot; it in <code>buildLink</code> or <code>PlanCard</code>. Both are shared by Disney+ and Hulu, so validation there has a three-brand blast radius, and hard-coding package knowledge into the marketing render path imports a vocabulary owned by Offer Management into a repo with no way to stay in sync with it. The correct engineering output for this ticket is a CMS content correction plus a written ownership note — not a diff.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>There is no ESPN plan page or plan card file. <code>planCard</code> is a registry key bound to a shared <code>growth-components</code> component ESPN does not override — generic components plus CMS content is what makes ~29 routes viable with one page file.</li>
        <li>Prices reach cards as offer-token text substituted server-side. Only <code>price</code> and <code>retailPrice</code> are substitutable, and today the <code>fallback_*</code> values in CMS content are always the values used — the GLO live path exists but is not wired in.</li>
        <li>The whole sales-to-checkout contract is one URL: <code>secure.web.plus.espn.com/commerce/billing?pref=&lt;package_id&gt;</code>, plus an <code>/identity/login?redirectURL=…</code> variant. No session, no cart, no shared state.</li>
        <li>Marketing does not build that URL. <code>build-link.ts</code> passes <code>href</code> through verbatim, so a wrong <code>pref</code> is a CMS content bug this repo cannot validate, cannot test, and should not try to fix in code.</li>
        <li><code>pref</code> is sticky after the hop: preserved across login/sign-up, carried in the Flex action payload at <code>content.action.data.query.pref</code>, and re-attached to SheerID URLs in the student flow.</li>
        <li>No campaign or attribution parameters are forwarded across the hop — a known product gap. And the <code>pref</code> values visible in fixtures are a subset; the authoritative list lives in Genie+ / Offer Management.</li>
      </ul>
    </div>
  );
}
