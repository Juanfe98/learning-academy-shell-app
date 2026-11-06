import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const domainModelDiagram = String.raw`erDiagram
  PRODUCT      ||--o{ PACKAGE      : "is packaged as"
  PACKAGE      ||--o{ OFFER        : "is priced as"
  CAMPAIGN     ||--o{ OFFER        : "scopes"
  CADENCE      ||--o{ OFFER        : "sets billing period of"
  OFFER        ||--o{ ADD_ON_OFFER : "can be combined with"
  OFFER        ||--|| SUBSCRIPTION : "purchase creates"
  SUBSCRIPTION ||--o{ ENTITLEMENT  : "grants"
  ENTITLEMENT  }o--|| PRODUCT      : "unlocks"
  PRODUCT {
    string display_name "ESPN Select, ESPN Unlimited, MLB.tv, a UFC event"
  }
  PACKAGE {
    string package_id "espn_unlimited, espn_select, espn_nfl_bundle"
    string dictionary_suffix "flagship, espn_standalone, raptor_standalone"
  }
  OFFER {
    string offerId "the purchasable unit"
    string campaignId "the other half of offer identity"
    string offerType "ESPN_STANDALONE, ADD_ON_STANDALONE, PPV_STANDALONE"
  }
  CADENCE {
    string productType "MONTHLY, ANNUAL, SEASONAL, MULTI_ANNUAL, ONE_TIME"
  }
  ADD_ON_OFFER {
    string requiresAnyOf "eligibility rule against the base plan"
  }
  ENTITLEMENT {
    string entitlementId "espn:flagship, concurrent_streams"
  }`;

const pricePathsDiagram = String.raw`flowchart TD
  subgraph COMMERCE["Commerce - secure.web.plus.espn.com"]
    C1["Flex getScreen or execute"] --> C2["price and priceDetails arrive as FlexRichTextModel"]
    C2 --> C3["cgi-web renders already-rendered rich text"] --> C4["No math, no currency formatting, no eligibility in the client"]
  end
  subgraph MARKETING["Marketing - plus.espn.com"]
    M1["CMS offer_token_global_parent document"] --> M2["offer_token: token_name, package_id, fallback_price, fallback_currency"]
    M2 --> M3["buildOfferToken prefers offer.price, defaults to fallback_price"] --> M4["offer is passed as an empty object today - TODO WEB-33524"]
    M4 --> M5["formatCurrency by region and app language"] --> M6["replaceTokensInSnapshot swaps the placeholder in authored copy"]
  end
  C4 --> Q["A wrong commerce price is almost always a Flex or GLO bug"]
  M6 --> R["A wrong marketing price is almost always a CMS fallback field"]`;

const cohortDiagram = String.raw`flowchart TD
  A["PUT /execution/v1/subscription/subscriber-cohorts"] --> B{"successData.cohorts is an array?"}
  B -->|"no, or the call failed"| D["DEFAULT_WHOLESALE_CONTEXT_DATA"]
  B -->|"yes"| C["scan every cohort.type"]
  C --> C1["some type equals wholesale_user"] --> E1["isWholesaleUser = Yes"]
  C --> C2["some type equals wholesale_mvpd_user"] --> E2["isMVPDWholesaleUser = Yes"]
  C --> C3["collect cohort.provider from both sets"] --> E3["wholesaleUserProvider = de-duplicated joined names"]
  D --> F["setESPNCommonData contextData"]
  E1 --> F
  E2 --> F
  E3 --> F
  F --> G["Consumed by Adobe Analytics common data only"] --> H["No cgi-web branch reads these values to change a flow"]
  H --> I["Commercial consequences live in Flex offer eligibility"]`;

const vocabularyDiagram = String.raw`flowchart LR
  T1["ledger"] --> K1["handle-ledger-submission.ts, ledgerSubmitParams, plan-switch-ledger"] --> S1["Real code concept - safe to say in a PR"]
  T2["flagship"] --> K2["use-is-flagship-enabled, uo_namelong_package_flagship = ESPN Unlimited"] --> S1
  T3["Raptor"] --> K3["FlexOfferType RAPTOR_STANDALONE, uo_namelong_package_raptor_standalone = Venu Sports"] --> S1
  T4["paywall"] --> K4["Adobe pageName ESPN Plus D2C - Paywall, plus a CDN folder named paywalls"] --> S2["Naming residue - real string, no abstraction"]
  T5["partner activation"] --> K5["magic-link destination value PartnerActivation, carried with an entitlementId"] --> S2
  T6["contextualization"] --> K6["dictionary strings only: contextualization_body_ keys in the ESPN prebuild file"] --> S3["Copy only - product term with no code model"]
  T7["TVE"] --> K7["only a playback URL segment /v7/playback/tve/ in SDK session fixtures"] --> S3`;

export const toc: TocItem[] = [
  { id: "why-this-module-exists", title: "Why This Module Exists", level: 2 },
  { id: "what-espn-sells", title: "What ESPN Sells, According to the Code", level: 2 },
  { id: "the-conceptual-model", title: "The Conceptual Model", level: 2 },
  { id: "offer-identity", title: "Offer Identity Is Two Fields, Never One", level: 3 },
  { id: "add-ons", title: "Add-ons", level: 2 },
  { id: "add-on-parameters", title: "How Add-on Selections Travel", level: 3 },
  { id: "bundles", title: "Bundles and the Ownership Problem", level: 2 },
  { id: "subscriber-cohorts", title: "Subscriber Cohorts", level: 2 },
  { id: "where-prices-come-from", title: "Where Prices Come From", level: 2 },
  { id: "meeting-speak-vs-code-speak", title: "Meeting-Speak vs Code-Speak", level: 2 },
  { id: "entitlement-vs-purchase", title: "Entitlement vs Purchase", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Audit a Product Claim", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function EspnProductsPlansAndEntitlements() {
  return (
    <div className="article-content">
      <h2 id="why-this-module-exists">Why This Module Exists</h2>
      <p>
        Every ESPN commerce file you will ever open assumes you already know what a <strong>package</strong> is, how it differs from an <strong>offer</strong>, and why the thing the user bought is not the thing the user can watch. Until that vocabulary is in place, <code>apps/commerce/espn</code> reads as an undifferentiated wall of ids. This module is pure <strong>domain modelling</strong> — no screens, no components, no request lifecycles. Its only job is to make the nouns precise so that the checkout, plan-card and flags modules become readable.
      </p>
      <p>
        One promise up front, because it shapes everything below. ESPN&apos;s commercial catalogue is <em>not defined anywhere in cgi-web</em>. The repository contains identifier strings, dictionary display names, fixtures and type unions — not a product specification. So this module distinguishes rigorously between what the code <em>attests</em> and what a reasonable engineer <em>infers</em>. Where the honest answer is &quot;the repo contains this string and never says what it means,&quot; that is what you will read. A confident wrong definition is the one outcome worse than saying &quot;I would have to check Genie+.&quot;
      </p>

      <h2 id="what-espn-sells">What ESPN Sells, According to the Code</h2>
      <p>Three independent sources in the monorepo name ESPN products, and they do <strong>not</strong> use the same strings:</p>
      <ul>
        <li><strong>CMS package ids</strong> — the <code>pref</code> query param authored into marketing comparison-chart CTAs, mirrored by <code>offer_token.package_id</code>. Found in <code>apps/marketing-unified/espn/src/mocks/apis/spaceball-landing-home-snapshot.json</code> and its Cannonball twin <code>cnbl-landing-page-home-snapshot.json</code>.</li>
        <li><strong>Dictionary display names</strong> — <code>unified-offers</code> keys shaped <code>uo_namelong_package_&lt;suffix&gt;</code> in <code>packages/dictionary/src/data/espn/fallback-prebuild.json</code> and the hand-maintained <code>packages/dictionary/src/data/espn/fallback-manual.ts</code>.</li>
        <li><strong>Flex offer types</strong> — the <code>FlexOfferType</code> union in <code>packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts</code>, which is a taxonomy of shapes, not a catalogue of products.</li>
      </ul>
      <p>
        The easily-missed fact: <strong>the package-id space and the dictionary-suffix space are different string sets, and nothing in cgi-web joins them.</strong> The CMS says <code>espn_unlimited</code>; the dictionary says <code>flagship</code>. The CMS says <code>espn_select</code>; the dictionary says <code>espn_standalone</code>. That mapping lives outside this repo, in the offer platform.
      </p>
      <ArticleTable caption="Every name below was read out of a real file. The confidence column is the point of this table — read it before quoting any row in a meeting." minWidth={1120}>
        <table>
          <thead>
            <tr><th>Product name</th><th>Identifier(s) in code</th><th>Where found</th><th>Confidence</th></tr>
          </thead>
          <tbody>
            <tr><td>ESPN Select</td><td><code>espn_select</code> (pref); <code>uo_namelong_package_espn_standalone</code></td><td>comp-chart CTA in <code>spaceball-landing-home-snapshot.json</code>; ESPN <code>fallback-prebuild.json</code></td><td><strong>Confirmed.</strong> Disney+ legal copy in the same dictionary family: &quot;includes ESPN+ only&quot;</td></tr>
            <tr><td>ESPN Unlimited</td><td><code>espn_unlimited</code> (pref); <code>uo_namelong_package_flagship</code>; entitlement <code>espn:flagship</code></td><td>comp-chart CTA; ESPN dictionary; <code>packages/cgi/commerce-base/src/identity/loading/lib/dynamic-url-map.ts</code></td><td><strong>Confirmed.</strong> Legal copy: &quot;all ESPN networks and services, including ESPN+&quot;</td></tr>
            <tr><td>ESPN+</td><td><code>uo_namelong_package_espn</code></td><td><code>fallback-manual.ts</code> only — absent from the ESPN prebuild dictionary</td><td><strong>Partly confirmed.</strong> The historic brand name; still saturates copy keys, but the tier it named is now ESPN Select</td></tr>
            <tr><td>Disney+, Hulu, ESPN Unlimited Bundle</td><td><code>espn_unlimited_bundle</code> (pref); <code>uo_namelong_package_flagship_ads_bundle</code>; premium variant <code>flagship_no_ads_bundle</code></td><td>comp-chart CTA; ESPN dictionary</td><td><strong>Both strings confirmed; the mapping between them is inferred</strong> from the display name alone</td></tr>
            <tr><td>Disney+, Hulu, ESPN Select Bundle</td><td><code>uo_namelong_package_disney_trio_basic</code>, <code>charter_us_trio_basic</code>; legacy <code>uo_namelong_package_trio</code> = &quot;Disney+, Hulu, ESPN+ Bundle&quot;</td><td>ESPN dictionary; comp-chart column whose CTA goes to <code>www.espn.com/watch/offers</code></td><td><strong>Inferred.</strong> The column exists but has <em>no <code>pref</code> id</em> — its CTA leaves for the ESPN content site</td></tr>
            <tr><td>ESPN Unlimited, NFL+ Premium Bundle</td><td><code>espn_nfl_bundle</code> (pref); <code>uo_namelong_package_espn_nfl_bundle</code></td><td>comp-chart CTA; ESPN dictionary</td><td><strong>Confirmed as a name.</strong> Contents inferred from the display string only</td></tr>
            <tr><td>Disney+, Hulu, ESPN Unlimited Bundle &amp; NFL+ Premium</td><td><code>disney_hulu_espn_nfl_bundle</code> (pref); <code>uo_namelong_package_nfl_quad_bundle</code></td><td>comp-chart CTA; ESPN dictionary</td><td><strong>Inferred.</strong> The pref id and the dictionary suffix are unrelated strings; only the human names line up</td></tr>
            <tr><td>ESPN, FOX One Bundle</td><td><code>uo_namelong_package_flagship_fox_one_bundle</code>; marketing route <code>/foxone</code>; sparrow path <code>activate.foxone_us</code></td><td>comp-chart column + <code>/foxone</code> href; <code>packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts</code></td><td><strong>Existence confirmed; contents unknown.</strong> Has a dedicated billing roadblock fixture that sends the user to fox.com</td></tr>
            <tr><td>Venu Sports (codename &quot;Raptor&quot;)</td><td><code>RAPTOR_STANDALONE</code>, <code>RAPTOR_BUNDLE</code>; <code>uo_namelong_package_raptor_standalone</code>; <code>activate.raptor_us</code></td><td><code>offer.types.ts</code>; ESPN dictionary; ESPN sparrow fixture</td><td><strong>Codename mapping confirmed</strong> — the dictionary value is literally &quot;Venu Sports&quot; and the URL is venu.com. Currently sellable? Unknown</td></tr>
            <tr><td>MLB.tv Season Pass</td><td><code>MLB_STANDALONE</code>; <code>uo_namelong_package_mlb_tv</code>, <code>mlb_2025</code>; <code>account_addons_mlb_title</code>; <code>activate.mlb_us</code></td><td><code>offer.types.ts</code>; ESPN dictionary; billing fixtures <code>billing-page-espn-with-mlb.json</code></td><td><strong>Confirmed.</strong> The only ESPN add-on with a dedicated consent field in the purchase request</td></tr>
            <tr><td>NFL+ Premium</td><td>fixture offer id <code>386dc959-54cf-4236-955d-9cc52240fa3c</code>; <code>activate.nfl_us</code></td><td><code>packages/cgi/commerce-base/src/signup/__fixtures__/espn/add-ons-page.ts</code>; <code>apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts</code></td><td><strong>Fixture-only identity.</strong> That UUID is a test constant — never a production offer id</td></tr>
            <tr><td>PPV events (UFC, boxing, PFL)</td><td><code>PPV_STANDALONE</code>; roughly one hundred <code>uo_namelong_package_ufc_ppv_&lt;n&gt;</code> keys; screen ids <code>espnppv</code>, <code>espnbkwrmppv</code></td><td><code>offer.types.ts</code>; ESPN <code>fallback-prebuild.json</code>; <code>account/success/__browser-mocks__/screen.ts</code></td><td><strong>Confirmed as a product class.</strong> Individual events are one-time purchases whose keys accrete forever — most are historic</td></tr>
            <tr><td>Unlimited Screens</td><td><code>uo_namelong_package_unlimited_screens</code>; entitlement <code>concurrent_streams</code></td><td>ESPN dictionary; <code>dynamic-url-map.ts</code> slug <code>screens</code></td><td><strong>Confirmed as a distinct thing</strong> — and it is <em>not</em> a tier of ESPN Unlimited despite sharing the word</td></tr>
            <tr><td>ESPN Executive Account (complimentary)</td><td><code>uo_namelong_package_espnexec</code>; <code>rewardsProducts</code> in legacy remote config</td><td>ESPN dictionary; <code>packages/remote-config/src/testing-utils/espn/qa.json</code></td><td><strong>Unknown.</strong> Internal comp accounts; no web purchase flow exists for it in the repo</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The Flex offer-type union is worth reading whole, because it is the one place in cgi-web where the shape of the catalogue is written down. Note that it describes <em>categories of offer</em>, not tiers — nothing in it distinguishes ESPN Select from ESPN Unlimited.
      </p>
      <CodeBlock
        code={`type FlexOfferType =
  | 'DISNEY_3P_BUNDLE' | 'DISNEY_STANDALONE' | 'HYBRID_BUNDLE' | 'DISNEY_2P_BUNDLE'
  | 'COMBO_BUNDLE' | 'MEGA_BUNDLE' | 'STAR_STANDALONE' | 'HULU_STANDALONE'
  | 'ESPN_STANDALONE' | 'RAPTOR_STANDALONE' | 'RAPTOR_BUNDLE' | 'MAX_BUNDLE'
  | 'ADD_ON_STANDALONE' | 'PPV_STANDALONE' | 'MLB_STANDALONE' | 'UNKNOWN'
  | 'EXTRA_MEMBER';

// Corresponds with Flex Team Enum. GLO = Growth Life Orchestrator, which owns
// this taxonomy; cgi-web only mirrors it.
type GLOOfferProductType =
  'MONTHLY' | 'ANNUAL' | 'SEASONAL' | 'MULTI_ANNUAL' | 'ONE_TIME';`}
        lang="typescript"
        filename="offer.types.ts"
      />
      <p>
        Two things to internalise. <code>offerType</code> is <em>optional</em> on every offer model — a plan card can arrive with no taxonomy at all, and <code>UNKNOWN</code> is a legal value. And the cadence enum carries an explicit comment pointing at the Flex team&apos;s own enum as the source of truth: if the two drift, cgi-web is the copy that is wrong.
      </p>

      <h2 id="the-conceptual-model">The Conceptual Model</h2>
      <p>Eight nouns, one sentence each. Read the definitions, then the diagram — the relationships are where intuition forms.</p>
      <ArticleTable caption="If you remember one row, remember that a package is a catalogue entry and an offer is a price on it." minWidth={1000}>
        <table>
          <thead>
            <tr><th>Concept</th><th>One-sentence definition</th><th>Where it appears in code</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>product</strong></td><td>The thing a human thinks they are buying — &quot;ESPN Unlimited&quot;, &quot;MLB.tv&quot; — which exists in the repo only as a display string.</td><td><code>uo_namelong_package_*</code> dictionary values</td></tr>
            <tr><td><strong>package</strong></td><td>A named catalogue entry in the offer platform, referenced by a stable id, carrying no price of its own.</td><td><code>package?: string</code> on Flex action payloads; <code>package_id</code> on CMS offer tokens; the <code>pref</code> query param</td></tr>
            <tr><td><strong>plan</strong></td><td>Informal product-speak for &quot;a package a user could be on right now&quot;; there is no <code>Plan</code> type in cgi-web.</td><td>route and component names only — <code>plan-select</code>, <code>PlansPage</code>, <code>basePlan</code></td></tr>
            <tr><td><strong>offer</strong></td><td>The actual purchasable unit: a package plus a price plus eligibility, resolved server-side and identified by <code>offerId</code>.</td><td><code>FlexFeatureOfferModel</code>, <code>FlexCompactOffer</code>, <code>FlexFeatureStackOfferModel</code></td></tr>
            <tr><td><strong>campaign</strong></td><td>The promotional context that made an offer available to this user right now; the second half of offer identity.</td><td><code>campaignId</code> in every purchase action payload and query string</td></tr>
            <tr><td><strong>cadence</strong></td><td>The billing rhythm — monthly, annual, seasonal, one-time — and also the name of the ESPN screen where the user picks it.</td><td><code>GLOOfferProductType</code>; <code>apps/commerce/espn/pages/commerce/cadence/index.page.tsx</code></td></tr>
            <tr><td><strong>subscription</strong></td><td>The billing relationship created by a successful purchase; what pause, switch, restart and cancel operate on.</td><td><code>subscriptionId</code> in <code>FlexSwitchParamsModel</code>; the Flex <code>subscription*</code> execution keys</td></tr>
            <tr><td><strong>entitlement</strong></td><td>The access right a subscription grants, addressed by a namespaced id, and the unit playback and upsell code reason about.</td><td><code>espn:flagship</code>, <code>disney_plus_sub:espn_premium</code>, <code>concurrent_streams</code> in <code>dynamic-url-map.ts</code>; <code>entitlementId</code> in the add-on request</td></tr>
            <tr><td><strong>add-on</strong></td><td>An offer bought alongside a base offer rather than instead of it, which may require a specific base plan.</td><td><code>ADD_ON_STANDALONE</code>; <code>content.addOns</code> from the <code>addonSelector</code> screen; <code>requiresAnyOf</code> rules</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={domainModelDiagram}
        title="ESPN Commerce Domain Model"
        caption="Two independent chains: package to offer to subscription is the money path; subscription to entitlement to product is the access path. Bugs cluster where they meet."
        minHeight={550}
      />

      <h3 id="offer-identity">Offer Identity Is Two Fields, Never One</h3>
      <p>
        The most common mistake in this codebase is treating <code>offerId</code> as sufficient. It is not. Every purchase action in <code>offer.types.ts</code> carries both <code>offerId</code> and <code>campaignId</code>, and the multi-offer query format encodes them as a colon-joined pair precisely because neither is meaningful alone:
      </p>
      <CodeBlock
        code={`Legacy multi-offer format (repeated params, order-significant)
  ?offerId=<base>&offerId=<addon>&campaignId=<c1>&campaignId=<c2>

Unified format, built by buildOffersParam()
  ?offers=<offerId>:<campaignId>,<offerId>:<campaignId>

Precedence in resolveOfferQueryParams()
  1. offers=                    new format wins
  2. offerId[] + campaignId[]   legacy multi; lengths must match
  3. offerId + campaignId       single offer

At execution time the Flex action payload wins over all of the above;
the URL is only the fallback.`}
        lang="text"
        filename="offer-params.txt"
      />
      <p>
        The precedence chain lives in <code>packages/cgi/commerce-base/src/common/lib/offers-param.ts</code>. Read it before debugging any &quot;wrong plan on the billing page&quot; report, because four sources can disagree: the URL you were handed, the URL you built, the Flex screen response, and the Flex action payload.
      </p>

      <h2 id="add-ons">Add-ons</h2>
      <p>
        For ESPN an add-on is a second offer bought in the same transaction as a base offer. The <code>/commerce/add-ons</code> step is real and enabled — <code>enableSignUpFlowAddOnsRoute</code> is <code>true</code> in the ESPN sparrow workspace fixture — and it is populated by a single Flex screen call:
      </p>
      <CodeBlock
        code={`const addonsRequestBody = {
  pref,                                    // the package the user came in for
  offerContext:                            // the concrete offer already selected
    offerId && campaignId ? [{ offerId, campaignId }] : undefined,
  entitlementId,                           // what the user already has access to
};

const { data } = useQuery({
  // NOTE: constant queryKey, no offer inputs. Changing entry offers
  // in-session can serve a stale add-ons screen.
  queryKey: ['flexApi.getScreen.addons'],
  queryFn: () =>
    dataInterface.getFlexScreen<AddOnSelectorTemplateContent>({
      key: 'addonSelector',
      version: 'v1',
      requestBody: addonsRequestBody,
    }),
  meta: { errorMessage: 'Failed to retrieve Add-ons Page.', owner: Owners.MMA },
});`}
        lang="typescript"
        filename="add-ons-page.tsx"
      />
      <p>
        Those three body fields tell you how the model works: eligibility is <strong>a server decision informed by current entitlement</strong>, not a client rule. The add-ons visible in ESPN fixtures are <strong>NFL+ Premium</strong>, <strong>MLB.tv</strong> and <strong>PPV events</strong>. They carry eligibility rules against the base plan — the ESPN Playwright suite documents an NFL+ Premium add-on that <code>requiresAnyOf</code> an ESPN Unlimited base plan, which is why &quot;upgrade tier and add the add-on&quot; is one two-offer selection rather than two purchases. Add-ons can also conflict with <em>each other</em>, independently of the base plan, which is what <code>updateAddonStateForEligibility</code> exists to lock.
      </p>
      <p><strong>MLB is the add-on with extra requirements.</strong> It is the only ESPN add-on that adds a consent field and an identity field to the purchase request:</p>
      <CodeBlock
        code={`// The mlb field here refers to the MLB user consent checkbox on the payment form
const { zipCode, taxid, mlb } = paymentData;

const swid = isOneIdEnabledApp && oneId ? oneIdSwid : undefined;

// Include MLB consent preference and SWID (from OneId) when MLB checkbox is present
if (mlb !== undefined) {
  requestBody.userConsents = { mlb };
  requestBody.swid = swid;
}`}
        lang="typescript"
        filename="use-flex-billing-execution.tsx"
      />
      <p>
        Read the semantics carefully: the field is sent whenever the checkbox <em>exists</em> (<code>mlb !== undefined</code>), not only when it is ticked — <code>false</code> is a meaningful, transmitted value. The SWID rides along because MLB.tv is a partner account link, not just a line item: the ESPN dictionary copy reads &quot;Share my email with MLB to receive exclusive offers&quot;, and <code>activate.mlb_us</code> hands the user to <code>mlb.com/commerce/link-account/espn/provider</code>. A consent checkbox on a payment form is a strong signal that a third party will receive identity data.
      </p>

      <h3 id="add-on-parameters">How Add-on Selections Travel</h3>
      <p>
        Selections leave the page as <em>offer parameters</em> in one of the two formats shown above, switched by the <code>enableOffersParamConversion</code> sparrow flag (ESPN: <code>true</code>). Both are asserted in <code>apps/commerce/espn/playwright/tests/flows/addon-multi-offer.spec.ts</code>, the best single file to read for certainty about the wire shape. On the way back from a successful purchase the ids return as <code>addOnOfferIds</code> and <code>addOnOfferIdsRemoved</code> — note the second name: the model supports <em>removal</em> in the same hop, which is why the signup add-ons page shares Jotai atoms with the change-subscription flow at all. The screen walk belongs to the checkout module; stay at model level here.
      </p>

      <h2 id="bundles">Bundles and the Ownership Problem</h2>
      <p>A bundle is a single offer that grants entitlements across sibling brands. The identifiers actually present in the ESPN monorepo:</p>
      <CodeBlock
        code={`pref values authored into ESPN comp-chart CTAs
  espn_unlimited_bundle          Disney+, Hulu, ESPN Unlimited Bundle
  espn_nfl_bundle                ESPN Unlimited, NFL+ Premium Bundle
  disney_hulu_espn_nfl_bundle    Disney+, Hulu, ESPN Unlimited Bundle & NFL+ Premium

dictionary package suffixes for bundles (unified-offers namespace)
  flagship_ads_bundle            Disney+, Hulu, ESPN Unlimited Bundle
  flagship_no_ads_bundle         Disney+, Hulu, ESPN Unlimited Bundle Premium
  flagship_fox_one_bundle        ESPN Unlimited, FOX One Bundle
  nfl_quad_bundle                Disney+, Hulu, ESPN Unlimited Bundle & NFL+ Premium
  disney_trio_basic              Disney+, Hulu, ESPN Select Bundle
  raptor_bundle_ads              Disney+, Hulu Bundle Basic with Venu
  trio                           Disney+, Hulu, ESPN+ Bundle   (legacy naming)

Flex offer types that denote a bundle
  DISNEY_3P_BUNDLE  DISNEY_2P_BUNDLE  HYBRID_BUNDLE
  COMBO_BUNDLE  MEGA_BUNDLE  MAX_BUNDLE  RAPTOR_BUNDLE`}
        lang="text"
        filename="espn-bundle-identifiers.txt"
      />
      <p>Now the ownership problem, visible directly in the fixtures. Of the five comparison-chart columns on the ESPN home landing page, <strong>only three hand off to ESPN commerce</strong>:</p>
      <ul>
        <li><code>ESPN Select</code>, <code>ESPN Unlimited</code> and <code>Disney+, Hulu, and ESPN Unlimited Bundle</code> → <code>secure.web.plus.espn.com/commerce/billing?pref=…</code></li>
        <li><code>Disney+, Hulu, and ESPN Select Bundle</code> → <code>https://www.espn.com/watch/offers</code> — a different domain, a different engineering org, no <code>pref</code> at all</li>
        <li><code>ESPN, FOX One Bundle</code> → <code>/foxone</code>, a marketing route, not a commerce entry</li>
      </ul>
      <p>
        And the hand-off can point outward even after purchase. ESPN has a dedicated billing roadblock fixture, <code>packages/cgi/commerce-base/src/signup/__fixtures__/espn/billing-roadblock-redirect-to-foxone.json</code>, whose CTA resolves the dictionary key <code>espn_fox_one_bundle_roadblock_fox_link</code> — value <code>https://subs.fox.com/manage</code>. A user who came to buy an ESPN bundle can end their session on fox.com. The practical consequence: <strong>&quot;the bundle flow is broken&quot; is never a single-team bug report.</strong> Establish which brand owns the surface the user was on when it broke before you accept the ticket.
      </p>

      <h2 id="subscriber-cohorts">Subscriber Cohorts</h2>
      <p>
        A <strong>cohort</strong> is a server-side classification of how a subscriber was acquired. ESPN is the only tenant with cohort fields on its analytics context type — compare <code>ESPNContextData</code> with <code>HuluContextData</code>, which has none:
      </p>
      <CodeBlock
        code={`type Cohort = {
  type: string;          // 'wholesale_user' | 'wholesale_mvpd_user' | ...
  provider?: string;     // partner name, joined into analytics
  affiliateId?: string;  // present in the type, never read by the mapping
};

export const DEFAULT_WHOLESALE_CONTEXT_DATA = {
  isWholesaleUser: 'No',
  isMVPDWholesaleUser: 'No',
  wholesaleUserProvider: 'no provider',
};

result.isWholesaleUser =
  cohorts.some((c) => c.type === 'wholesale_user') ? 'Yes' : 'No';
result.isMVPDWholesaleUser =
  cohorts.some((c) => c.type === 'wholesale_mvpd_user') ? 'Yes' : 'No';`}
        lang="typescript"
        filename="use-flex-subscriber-cohorts.ts"
      />
      <p>
        Commercially: <strong>wholesale</strong> means the subscriber was acquired through a bulk or partner deal rather than direct-to-consumer, so the money arrives from a partner and the retail price on a plan card may be irrelevant to them. <strong>MVPD wholesale</strong> narrows that to a Multichannel Video Programming Distributor — a cable, satellite or virtual pay-TV operator — the population that reaches ESPN through provider sign-in rather than checkout. Both are <code>&apos;Yes&apos;</code> / <code>&apos;No&apos;</code> strings, not booleans, because they are shaped for Adobe.
      </p>
      <MermaidDiagram
        chart={cohortDiagram}
        title="Cohort Classification and What It Actually Changes"
        caption="Follow the arrows to the end: in cgi-web, cohort feeds analytics only. The pricing and eligibility consequences are decided upstream in Flex."
        minHeight={550}
      />
      <p>
        This is where honesty beats a tidy story. The obvious claim — &quot;cohort changes the checkout code path&quot; — is not what the repository shows. The only ESPN consumers of <code>useFlexAdobeAnalyticsSubscriberCohorts</code> are the two Adobe common-data hooks: <code>apps/commerce/espn/src/hooks/use-fetch-espn-adobe-common-data.tsx</code> and its marketing twin under <code>apps/marketing-unified/espn/src/views/landing-page/</code>. No branch reads <code>isWholesaleUser</code> to render differently.
      </p>
      <p>
        So why does cohort matter to someone reading a checkout code path? Because it explains <em>why the offers you were given differ from the offers you expected</em>. A wholesale user hitting <code>/commerce/billing?pref=espn_unlimited</code> may get a roadblock or a replacement <code>offerContext</code> from Flex, and the cohort call is the observability breadcrumb telling you which population you were in. In this repo, cohort is a diagnosis tool, not a control flow.
      </p>

      <h2 id="where-prices-come-from">Where Prices Come From</h2>
      <p>
        Two sibling modules own the detail — the commerce app anatomy module and the marketing app anatomy module — so keep this short and remember only the asymmetry. On the <strong>commerce</strong> side prices are entirely server-driven: <code>price</code> and <code>priceDetails</code> on every Flex offer model are typed as <code>FlexRichTextModel</code>, so Flex and GLO resolve eligibility, promo, tax messaging and currency and hand back rendered rich text. cgi-web never computes or formats a plan price.
      </p>
      <p>
        On the <strong>marketing</strong> side prices are CMS tokens. Copywriters author a placeholder into a snapshot; the token document supplies both a <code>package_id</code> and mandatory <code>fallback_*</code> fields:
      </p>
      <CodeBlock
        code={`{
  "_type": "offer_token",
  "_id": "espnToken1",
  "token_name": "espn_unlimited_monthly",
  "package_id": "espn_unlimited",
  "fallback_frequency": "MONTHLY",
  "fallback_retail_price": "29.99",
  "fallback_price": "29.99",
  "fallback_currency": "USD"
}`}
        lang="json"
        filename="cnbl-offer-token-global-snapshot.json"
      />
      <p>
        The comment on <code>package_id</code> in <code>packages/marketing/plans-pricing-api/src/tokens.ts</code> is the most useful sentence in the whole pricing stack: it names the package id as the <em>&quot;package identifier found in Genie+ (Offer Management Platform)&quot;</em>. That is where the catalogue actually lives. And here is the finding most people get wrong — the resolver <em>looks</em> like it prefers a live price, but no live offer is ever fetched:
      </p>
      <CodeBlock
        code={`// buildOfferToken prefers a live price, falls back to the CMS value
price: formatPrice(offer.price ?? contentField.fallback_price),
retailPrice: formatPrice(offer.retailPrice ?? contentField.fallback_retail_price),

// ...but the only caller passes an empty offer:
buildOfferToken({
  contentField: cmsToken,
  // TODO WEB-33524: Fetch offers for all tokens and replace them accordingly
  offer: {}, // Empty offer should use fallback values
  language,
  region,
  formatRules,
  currencySymbolData,
});`}
        lang="typescript"
        filename="tokens.ts"
      />
      <p>
        So marketing prices on plus.espn.com are, in effect, <strong>always the CMS fallback values</strong>, currency-formatted for the region. Two corollaries for triage: a stale marketing price is a CMS content fix, not an engineering deploy; and the marketing page and the billing page can legitimately disagree, because one is authored and the other is resolved.
      </p>
      <MermaidDiagram
        chart={pricePathsDiagram}
        title="Two Price Paths, Two Different Bug Owners"
        caption="Both paths end in a number on a screen, but they share no source of truth — which is exactly why marketing and billing prices drift."
        minHeight={550}
      />

      <h2 id="meeting-speak-vs-code-speak">Meeting-Speak vs Code-Speak</h2>
      <p>
        Some ESPN product vocabulary is deeply embedded in the codebase. Some of it does not appear at all. Knowing which is which is the difference between sounding fluent and confidently misleading a room. Every claim below was checked by searching monorepo source, excluding build output.
      </p>
      <ArticleTable caption="Read the code-attested column first. Rows marked Naming residue or Copy only are terms to translate before writing a ticket." minWidth={1080}>
        <table>
          <thead>
            <tr><th>Term you hear</th><th>What it maps to in code</th><th>Code-attested?</th><th>How to translate it</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>ledger</strong></td><td><code>handle-ledger-submission.ts</code>, <code>ledgerSubmitParams</code>, <code>plan-switch-ledger</code>, <code>wallet-ledger-error-atom</code>, <code>FlexZipCodeConfirmationLedgerSectionModel</code></td><td><strong>Yes — first-class.</strong> Hundreds of source files</td><td>No translation needed. &quot;Ledger&quot; <em>is</em> the code word for the billing/review page. Use it in PRs</td></tr>
            <tr><td><strong>flagship</strong></td><td><code>use-is-flagship-enabled</code>, flag <code>wpnx-web-tab-flagship</code>, <code>uo_namelong_package_flagship</code>, entitlement <code>espn:flagship</code></td><td><strong>Yes</strong></td><td>Read it as <strong>ESPN Unlimited</strong> every time; the dictionary makes the equivalence explicit</td></tr>
            <tr><td><strong>Raptor</strong></td><td><code>RAPTOR_STANDALONE</code>, <code>RAPTOR_BUNDLE</code>, <code>uo_namelong_package_raptor_standalone</code>, <code>activate.raptor_us</code></td><td><strong>Yes</strong></td><td>Read it as <strong>Venu Sports</strong>; the dictionary value is literally that and the activation URL is venu.com</td></tr>
            <tr><td><strong>paywall</strong></td><td>Adobe <code>pageName</code> values like <code>ESPN Plus D2C - Paywall</code>, and a CDN image folder named <code>paywalls</code> used for page backgrounds</td><td><strong>Naming residue.</strong> Real strings, no abstraction</td><td>Ask which <em>screen</em> they mean. There is no paywall component, route or model — usually plan-select or billing</td></tr>
            <tr><td><strong>partner activation</strong></td><td>magic-link <code>destination</code> value <code>PartnerActivation</code> carried with an <code>entitlementId</code>; plus <code>/commerce/activate/*</code> routes</td><td><strong>Yes, but narrowly</strong> — a destination value, not a subsystem</td><td>Pin down the leg: linking a provider subscription to MyDisney, or the outward hand-off to a partner brand</td></tr>
            <tr><td><strong>contextualization</strong></td><td><code>contextualization_body_auth_directv</code>, <code>contextualization_body_flagship_unauth</code>, <code>contextualization_body_mlb</code> and siblings</td><td><strong>Copy only.</strong> Confined to one file: <code>packages/dictionary/src/data/espn/fallback-prebuild.json</code></td><td>Say &quot;the takeover on espn.com&quot;. cgi-web supplies its copy and nothing else — the screen belongs to ESPN&apos;s own org</td></tr>
            <tr><td><strong>TVE</strong></td><td>only the URL path segment <code>/v7/playback/tve/</code> inside SDK session fixtures</td><td><strong>Essentially no.</strong> Zero occurrences in commerce or marketing source</td><td>Say &quot;TV-provider authenticated streaming&quot; and expect it to be someone else&apos;s system — a playback concern, not a commerce one</td></tr>
            <tr><td><strong>plan</strong></td><td>route and component names only: <code>/commerce/plans</code>, <code>plan-select</code>, <code>basePlan</code>. Note <code>enableCommerceUnifiedPlans</code> is <code>false</code> for ESPN, so the route exists and 404s</td><td><strong>Partly — as naming, not as a type</strong></td><td>When precision matters say <em>package</em> (catalogue entry) or <em>offer</em> (priced, eligible unit)</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={vocabularyDiagram}
        title="Translating Meeting-Speak into Code-Speak"
        caption="The three sinks on the right are what to memorise: real code concept, naming residue, or copy only. Choose your words by which sink a term lands in."
        minHeight={550}
      />

      <h2 id="entitlement-vs-purchase">Entitlement vs Purchase</h2>
      <p>
        Here is the idea that separates people who have shipped ESPN commerce from people who have only read about it. <strong>A successful purchase does not mean the user can watch.</strong> What the success hop carries is offer identity and add-on identity — <code>addOnOfferIds</code>, <code>addOnOfferIdsRemoved</code> — not an access grant. The grant is an entitlement, addressed by a namespaced id such as <code>espn:flagship</code> or <code>disney_plus_sub:espn_premium</code>, and for anything involving a partner brand the entitlement is only usable after a <strong>separate activation</strong> at that partner:
      </p>
      <CodeBlock
        code={`activate: {
  hulu:      'https://signup.huluqa.com/bundles/activate?token=',
  raptor_us: 'https://stage.venu.com/bundle/activate?partner=disney&token=',
  foxone_us: 'https://stage-subs.fox.com/bundle/activate?partner=disney&token=',
  mlb_us:    'https://qa-gcp.mlb.com/commerce/link-account/espn/provider?token=',
  nfl_us:    'https://staging-id.nfl.com/account/sign-in?partnership=disney&token=',
},`}
        lang="typescript"
        filename="sparrow-commerce-espn-workspace.ts"
      />
      <p>
        Five partner brands, five token-bearing hand-offs. The success page renders an activation widget whose navigate action uses the location <code>outgoing-activation</code> (<code>packages/cgi/commerce-base/src/account/success/components/subscription-success-content/add-on-activation-element.tsx</code>), and the ESPN dictionary carries copy for every step — <code>activation_success_page_description</code> reads &quot;You have successfully activated ESPN Unlimited&quot;, and the Venu copy warns the user they &quot;will need to activate your Raptor Account before you can start streaming&quot;. So the post-purchase state machine has at least four states, and only the first is &quot;user paid&quot;:
      </p>
      <ul>
        <li><strong>Charged</strong> — the payment succeeded and a subscription exists.</li>
        <li><strong>Entitled</strong> — an entitlement id is attached to the account.</li>
        <li><strong>Activated</strong> — every partner-brand leg has been completed, per partner, each with its own token.</li>
        <li><strong>Playable</strong> — playback rights resolve for the specific content, subject to blackouts and location, which ESPN legal copy calls out explicitly.</li>
      </ul>
      <p>
        A user can be charged and not entitled, entitled and not activated, or activated and still blacked out. When a ticket says &quot;I paid and I cannot watch,&quot; your first question is which of those four states failed — not whether the payment went through.
      </p>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li><strong>&quot;ESPN+&quot; and &quot;ESPN Select&quot; are not interchangeable.</strong> Legal copy states ESPN Select <em>includes ESPN+ only</em>, while ESPN Unlimited includes all ESPN networks and services. &quot;ESPN+&quot; is the historic brand and is still baked into live copy keys — <code>uo_espn_3p</code> is &quot;ESPN+ Bundle&quot;, <code>uo_namelong_package_trio</code> is &quot;Disney+, Hulu, ESPN+ Bundle&quot;. Copy lagging a rename is not a bug to fix unilaterally.</li>
        <li><strong>&quot;Unlimited&quot; is overloaded, and one meaning has nothing to do with ESPN tiers.</strong> <code>uo_namelong_package_unlimited_screens</code> is &quot;Unlimited Screens&quot;, and the <code>screens</code> slug in <code>dynamic-url-map.ts</code> carries <code>entitlementId: &apos;concurrent_streams&apos;</code>. Grepping for <code>unlimited</code> mixes a concurrency add-on into your ESPN Unlimited results.</li>
        <li><strong>Package ids are assumed, not documented.</strong> Nothing in cgi-web states what <code>espn_unlimited_bundle</code> <em>contains</em>. The only linkage is a comment naming Genie+ as the Offer Management Platform. If a ticket depends on bundle contents, the answer is in Genie+ or with the offer team.</li>
        <li><strong>The pref id and the dictionary suffix for the same product are different strings.</strong> <code>espn_select</code> versus <code>espn_standalone</code>; <code>disney_hulu_espn_nfl_bundle</code> versus <code>nfl_quad_bundle</code>. Do not build a mapping by string munging; both spaces are externally owned.</li>
        <li><strong><code>FlexOfferType</code> does not distinguish tiers.</strong> <code>ESPN_STANDALONE</code> covers ESPN Select and ESPN Unlimited alike, the field is optional on every model, and <code>UNKNOWN</code> is legal. Never branch on it as though it identified a plan.</li>
        <li><strong>Fixture-only values have no production consumer.</strong> The NFL+ Premium offer id <code>386dc959-54cf-4236-955d-9cc52240fa3c</code> is a Playwright constant. Dictionary fallbacks such as <code>uo_ppv: &apos;PPV UFC 287&apos;</code> and &quot;ESPN+ Annual ($109.99 recurring)&quot; are documented as overwritten by Cypher. <code>rewardsProducts.FT.oneYear.price: 69.99</code> lives in a legacy QA remote-config file. None of these are prices ESPN charges. Several package keys are bare UUIDs (<code>uo_namelong_package_package_1d155af1-…</code>) whose meaning the repo never states.</li>
        <li><strong>Routes can exist and be dead.</strong> <code>apps/commerce/espn/pages/commerce/plans/index.page.tsx</code> is real, wired, and gated by <code>isRouteEnabled</code> on <code>enableCommerceUnifiedPlans</code> — which is <code>false</code> for ESPN. Likewise the <code>/commerce/extra-member/*</code> routes exist in the ESPN app because the route set is shared, which is not evidence ESPN sells extra members. File existence is not evidence a flow is live.</li>
        <li><strong><code>affiliateId</code> is in the cohort type and never read.</strong> A field being modelled is not a field being used.</li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: what is the difference between a package, a plan, and an offer?"
        intro="A weak answer treats the three as synonyms or invents a hierarchy. A strong answer names which of them the codebase actually models — and admits which one it does not."
        steps={[
          "Open with the distinction that carries weight: a package is a named catalogue entry with no price; an offer is a package plus a price plus eligibility, identified by offerId together with campaignId.",
          "Point out that 'plan' is product-speak with no type behind it — it survives only in route and component names like /commerce/plans and basePlan. Saying so signals fluency, not ignorance.",
          "Ground it in a trace: a marketing CTA carries pref=espn_unlimited, a package id sourced from Genie+ (the Offer Management Platform); commerce then asks Flex for the concrete offers available for that package and this user.",
          "Name the ownership boundary: catalogue and eligibility live outside cgi-web, so cgi-web renders offers rather than computing them — which is why prices arrive as pre-rendered rich text.",
          "Close on the production implication: offer identity is two fields and four sources can supply them (URL you were given, URL you built, Flex screen, Flex action payload), so the precedence rules in offers-param.ts are where wrong-plan bugs get diagnosed.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: what does a successful ESPN purchase actually grant?"
        intro="The naive answer is 'a subscription'. The answer that shows you have shipped this is that purchase, entitlement, activation and playability are four separate states."
        steps={[
          "State the separation first: a charge creates a subscription; a subscription grants entitlements; entitlements addressed as espn:flagship or disney_plus_sub:espn_premium are what downstream systems reason about.",
          "Add the partner leg with evidence: the ESPN sparrow config carries token-bearing activation URLs for Hulu, Venu, FOX One, MLB and NFL, and the success page fires a navigate action whose location is outgoing-activation.",
          "Note that the success hop carries addOnOfferIds and addOnOfferIdsRemoved — offer identity, not access rights. Nothing in that payload proves the user can stream.",
          "Give the honest limit of your knowledge: playability also depends on playback rights, blackouts and location, which are not cgi-web concerns at all.",
          "Land the operational payoff: 'I paid and cannot watch' is triaged by asking which of charged, entitled, activated or playable failed — and each has a different owning team.",
        ]}
      />

      <h2 id="challenge">Challenge: Audit a Product Claim</h2>
      <InterviewChallenge
        title="The roadmap doc says ESPN sells six plans. Verify it."
        scenario={
          <>
            You join an ESPN planning meeting. A roadmap doc lists six purchasable plans: ESPN Select, ESPN Unlimited, the Disney+/Hulu/ESPN bundle, the NFL bundle, MLB.tv, and &quot;ESPN+&quot;. A PM asks you to confirm engineering is aligned, and separately asks whether wholesale users will see the new NFL bundle price. You have read-only access to <code>cgi-web</code> and nothing else.
          </>
        }
        tasks={[
          "For each of the six names, decide whether it is a package id, a dictionary display name, an offer type, or none of these — and cite the file you found it in.",
          "Explain why 'ESPN+' and 'ESPN Select' must not be listed as two separate purchasable plans, using the dictionary evidence.",
          "Explain what cgi-web can and cannot tell you about what the NFL bundle contains, and name the system that can.",
          "Answer the wholesale-price question honestly: state where cohort is computed, what cgi-web does with it, and who actually decides the price a wholesale user sees.",
          "Produce the one sentence you would say out loud in the meeting that is both useful and defensible.",
        ]}
        pitfalls={[
          "Treating the presence of a route file (/commerce/plans) or an offer-type member (EXTRA_MEMBER) as proof that ESPN sells it.",
          "Reading a dictionary fallback price such as $109.99, or a Playwright offer UUID, as production data.",
          "Inferring bundle contents from the display name and stating it as fact.",
          "Claiming cohort changes the checkout code path because a cohort endpoint is called during checkout.",
          "Mapping espn_select to espn_standalone by string similarity and presenting the mapping as verified.",
        ]}
        signal="A strong candidate separates attested strings from inferred meaning without being asked, names Genie+ as the catalogue owner, and is willing to say out loud that a term in the roadmap doc does not exist in the code."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Classifying the six names.</strong> ESPN Select and ESPN Unlimited are both: package ids (<code>espn_select</code>, <code>espn_unlimited</code>) in the comp-chart CTAs of <code>spaceball-landing-home-snapshot.json</code>, <em>and</em> dictionary display names (<code>uo_namelong_package_espn_standalone</code>, <code>uo_namelong_package_flagship</code>) in <code>packages/dictionary/src/data/espn/fallback-prebuild.json</code>. The Disney+/Hulu/ESPN bundle is ambiguous and must be split: the Unlimited variant has a package id <code>espn_unlimited_bundle</code>, while the Select variant appears only as a comp-chart column whose CTA leaves for <code>www.espn.com/watch/offers</code> with no <code>pref</code> at all. The NFL bundle is two products — <code>espn_nfl_bundle</code> and <code>disney_hulu_espn_nfl_bundle</code>. MLB.tv is a dictionary name plus the offer type <code>MLB_STANDALONE</code> plus an <code>activate.mlb_us</code> partner URL. &quot;ESPN+&quot; is only a display name, and only in the hand-maintained <code>fallback-manual.ts</code>.
        </p>
        <p>
          <strong>Why ESPN+ is not a seventh plan.</strong> Legal copy shipped in the same dictionary family states: &quot;ESPN Select includes ESPN+ only; ESPN Unlimited includes all ESPN networks and services, including ESPN+.&quot; ESPN+ is therefore a component of a tier — and historically the tier&apos;s own name. Listing it alongside ESPN Select double-counts one product.
        </p>
        <p>
          <strong>Bundle contents.</strong> cgi-web can prove the identifier exists, that a CTA points at it, and what display name the dictionary gives it. It cannot say what entitlements it grants. The comment on <code>package_id</code> in <code>packages/marketing/plans-pricing-api/src/tokens.ts</code> names <strong>Genie+, the Offer Management Platform</strong>, as the source of package identifiers — that is the system to ask.
        </p>
        <p>
          <strong>The wholesale question.</strong> Cohorts are computed by Flex and returned by the <code>subscriberCohort</code> execution. cgi-web maps them to three Adobe fields — <code>isWholesaleUser</code>, <code>isMVPDWholesaleUser</code>, <code>wholesaleUserProvider</code> — in <code>apps/commerce/espn/src/queries/use-flex-subscriber-cohorts.ts</code>, and the only consumers are the two Adobe common-data hooks. So the correct answer is: cgi-web will <em>report</em> that a user is wholesale but will not change what they see. What a wholesale user sees is decided by Flex offer eligibility, and prices arrive as pre-rendered rich text.
        </p>
        <p>
          <strong>The one sentence.</strong> &quot;Engineering can confirm five package identifiers in our own fixtures, not six plans — and it cannot confirm what any bundle includes, because the catalogue lives in Genie+; let us get the offer team to confirm contents before this goes in the doc.&quot;
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>A <strong>package</strong> is a named catalogue entry with no price; an <strong>offer</strong> is that package plus a price plus eligibility, identified by <code>offerId</code> <em>and</em> <code>campaignId</code>; a <strong>plan</strong> is product-speak with no type behind it.</li>
        <li>ESPN&apos;s catalogue is not defined in cgi-web. The repo holds package ids (<code>espn_unlimited</code>, <code>espn_select</code>, <code>espn_nfl_bundle</code>), dictionary display names (<code>flagship</code> = ESPN Unlimited, <code>raptor_standalone</code> = Venu Sports) and a <code>FlexOfferType</code> taxonomy — the definitions live in Genie+.</li>
        <li>Prices are asymmetric: commerce prices are server-rendered rich text from Flex; marketing prices are CMS tokens that today <em>always</em> resolve to their <code>fallback_*</code> fields, because no live offer is fetched yet (TODO WEB-33524).</li>
        <li>Add-ons are offers with base-plan eligibility rules; MLB uniquely adds <code>userConsents.mlb</code> plus a <code>swid</code> to the purchase request, and selections travel as either <code>offers=id:campaign,…</code> or repeated legacy params, switched by <code>enableOffersParamConversion</code>.</li>
        <li>Cohorts (<code>wholesale_user</code>, <code>wholesale_mvpd_user</code>) are ESPN-only and, in cgi-web, feed Adobe analytics only — a diagnosis breadcrumb, not a control flow; the commercial consequences are decided in Flex.</li>
        <li>Purchase is not entitlement: charged, entitled, activated and playable are four distinct states, and five partner brands each have their own token-bearing activation hand-off.</li>
      </ul>
    </div>
  );
}
