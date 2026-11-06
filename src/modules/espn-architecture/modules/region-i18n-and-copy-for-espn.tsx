import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const territoryHierarchyDiagram = String.raw`flowchart TD
  T["Tenant: ESPN<br/>dictionaryTenant = espn"] --> BR["Business region: NA<br/>the ONLY key in commerceAppConfig.countries"]
  BR --> MKT["Market: US<br/>adsTierEnabled, sellsBundle, licensePlateFlowNavigation"]
  MKT --> GRP["group = North America<br/>legacy remote-config vocabulary"]
  MKT --> TERR["7 territories, every one parentCountry = US"]
  TERR --> N1["AS American Samoa"]
  TERR --> N2["GU Guam"]
  TERR --> N3["MH Marshall Islands"]
  TERR --> N4["MP Northern Mariana Islands"]
  TERR --> N5["PR Puerto Rico"]
  TERR --> N6["UM US Minor Outlying Islands"]
  TERR --> N7["VI US Virgin Islands"]
  T --> LNG["Languages: supportedLangsMap<br/>an axis independent of market"]
  LNG --> L1["en points to dict en, hreflang en"]
  LNG --> L2["es-419 points to dict es-419, hreflang es"]
  BR -.->|"absent for ESPN, though a valid NACountryCodes member"| CA["CA Canada"]`;

const copyKeyJourneyDiagram = String.raw`sequenceDiagram
  participant Page as ESPN page component
  participant Dict as useDictionary
  participant Ovr as useExperimentalCopyOverrides
  participant Cypher as Cypher Dictionary API
  participant RUM as Datadog RUM
  Note over Cypher: dictionaries fetched at bootstrap with tenant espn
  Page->>Dict: t billing_ppv_bundle_annual_title_copy
  Dict->>Ovr: is there an experimental key for this key
  Ovr-->>Dict: experimental key, or the same key back
  Dict->>Cypher: GET dictionary v1 dictionaries, variables carry tenant espn
  Cypher-->>Dict: normalized dictionary per namespace
  Dict->>Dict: lookup dictionaries unified-commerce copyKey
  alt experimental key resolves
    Dict-->>Page: ESPN plus Annual with PPV 321
  else experimental key misses
    Dict->>Dict: retry the ORIGINAL key in the same namespace
    Dict-->>Page: control copy
  end
  alt still empty
    Dict->>RUM: addError MISSING_CYPHER_KEY_IN_DICTIONARY with key and dictionary
    Dict-->>Page: empty string, never a throw
  end`;

const pricePathDiagram = String.raw`flowchart LR
  GLO["GLO Growth Life Orchestrator<br/>offers, eligibility, promo, currency"] --> FLEX["Flex BFF growth-life-client-api<br/>GLO models mapped to Flex models"]
  FLEX --> MODEL["FlexFeatureOfferModel<br/>price: FlexRichTextModel<br/>priceDetails: FlexRichTextModel"]
  MODEL --> RT["cgi-web renders the rich text<br/>text-with-variables.tsx"]
  MODEL --> VAR["Currency variables in the rich text<br/>toCurrencyVariable amount and currency"]
  VAR --> FMT["useCurrencyFormat currencyCode and amount"]
  FMT --> SYM["useCurrencySymbol<br/>codesToSymbol then regionToSymbol then literal dollar"]
  FMT --> ROUND["applyLegalRounding<br/>rounds UP when the format omits cents"]
  SYM --> OUT["Price string on screen"]
  ROUND --> OUT
  RT --> OUT`;

const wrongCopyTriageDiagram = String.raw`flowchart TD
  S["Wrong copy on an ESPN screen"] --> RAW{"Capture the raw Flex JSON first"}
  RAW -->|"field absent from JSON"| FSVC["Flex left the slot null<br/>or the template has no slot"]
  RAW -->|"present and wrong in JSON"| KEYQ{"Does the emitted cypher key look right"}
  KEYQ -->|"key looks wrong"| FKEY["Flex emitted the wrong key<br/>espnScreenCyphers.ts in growth-life-client-api"]
  KEYQ -->|"key looks right"| CONT["Cypher content wrong for tenant espn<br/>a copy ticket, not a code ticket"]
  RAW -->|"correct in JSON, wrong on screen"| CGI{"Any wpnx-great-copy flag active"}
  CGI -->|"yes"| REWRITE["RENDER-TIME KEY REWRITE<br/>useCopyOverrideExperiment swapped the key<br/>check copy_override_experiments in RUM"]
  CGI -->|"no"| SPEAR{"A key__exp__name__variant twin in the dictionary"}
  SPEAR -->|"yes"| SPK["useSpearmintCopyOverrides<br/>convention-based override, Hulu-style"]
  SPEAR -->|"no"| EMPTY{"Is the text empty rather than wrong"}
  EMPTY -->|"yes"| MISS["MISSING_CYPHER_KEY_IN_DICTIONARY in RUM<br/>fail-soft empty string"]
  EMPTY -->|"no"| LIST["An item vanished from a details modal<br/>filterModalListItems deleted it"]`;

export const toc: TocItem[] = [
  { id: "espn-is-us-only", title: "ESPN Is US-Only, and Here Is the Proof", level: 2 },
  { id: "territories-regions-languages-markets", title: "Territories vs Regions vs Languages vs Markets", level: 2 },
  { id: "the-group-field", title: "The group Field and an Honest Contradiction", level: 3 },
  { id: "not-in-cgi-web", title: "Concepts That Do Not Exist in cgi-web", level: 3 },
  { id: "espn-locales", title: "ESPN's Locales and What Limited Language Support Means", level: 2 },
  { id: "the-cypher-dictionary", title: "The Dictionary: Cypher, Tenant Isolation, Fail-Soft", level: 2 },
  { id: "key-naming-convention", title: "Decoding the Key Naming Convention", level: 3 },
  { id: "prices-are-server-driven", title: "Prices Are Server-Driven", level: 2 },
  { id: "the-two-exceptions", title: "The Two Exceptions Where cgi-web Touches Presentation", level: 3 },
  { id: "copy-overrides-at-render-time", title: "Copy Overrides at Render Time", level: 2 },
  { id: "marketing-side-pricing", title: "The Marketing-Side Counterpart: Offer Tokens", level: 2 },
  { id: "tracing-a-copy-or-price-bug", title: "Tracing a Copy or Price Bug End to End", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Wrong Price in Puerto Rico", level: 2 },
  { id: "gotchas-and-traps", title: "Gotchas & Traps", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function RegionI18nAndCopyForEspn() {
  return (
    <div className="article-content">
      <p>Region and localization are where engineers most often write code that is technically correct and factually wrong. The vocabulary is overloaded — <em>region</em>, <em>territory</em>, <em>market</em>, <em>locale</em>, <em>language</em> are used interchangeably in tickets and are five distinct things in the code. ESPN sits at an unusual point in that space: a single market, two languages, and a checkout page where every word and every price comes from somewhere else. This module gives you the concept map, the ownership boundaries, and a trace recipe you can run against a ticket that says <em>&quot;the ESPN ledger shows the wrong price in Puerto Rico.&quot;</em></p>

      <h2 id="espn-is-us-only">ESPN Is US-Only, and Here Is the Proof</h2>
      <p>ESPN commerce in <code>cgi-web</code> serves the United States and seven US territories. Nothing else. That is not folklore — it is readable in two independent configuration sources that agree. <strong>Proof 1 — the Sparrow commerce workspace</strong>, authoritative for CUP. In <code>packages/cgi/commerce-base/src/common/lib/sparrow/__fixtures__/espn/sparrow-commerce-espn-workspace.ts</code> the <code>countries</code> scope has exactly one business-region key:</p>
      <CodeBlock
        code={`// countries scope — line 227 onward
countries: {
  NA: {                                    // <- the ONLY business region present
    AS: { /* ... */ parentCountry: 'US' }, // American Samoa
    GU: { /* ... */ parentCountry: 'US' }, // Guam
    MH: { /* ... */ parentCountry: 'US' }, // Marshall Islands
    MP: { /* ... */ parentCountry: 'US' }, // Northern Mariana Islands
    PR: { /* ... */ parentCountry: 'US' }, // Puerto Rico
    UM: { /* ... */ parentCountry: 'US' }, // US Minor Outlying Islands
    US: { adsTierEnabled: true, sellsBundle: true, licensePlateFlowNavigation: { /* US only */ } },
    VI: { /* ... */ parentCountry: 'US' }, // US Virgin Islands
  },   // no EMEA, no APAC, no LATAM — and no CA
}`}
        lang="typescript"
        filename="sparrow-commerce-espn-workspace.ts"
      />
      <p><strong>Proof 2 — the legacy remote-app-config archive.</strong> <code>packages/remote-config/src/testing-utils/espn/qa.json</code> lists the same eight country keys, the same <code>parentCountry: &quot;US&quot;</code> on all seven non-US entries, <code>countries.US.group === &quot;North America&quot;</code>, <code>isEU: false</code>, and <code>remoteAppConfig.dictionaryTenant === &quot;espn&quot;</code>. Two systems built years apart, describing the same eight rows. The scale contrast is the fastest way to internalize this: the same fixture for Disney+ has <strong>244</strong> country keys across five <code>group</code> values, while Hulu has the <strong>same eight</strong> as ESPN. So &quot;US-only&quot; is not an ESPN quirk; it is the shape shared by both non-Disney+ tenants in this monorepo.</p>
      <MermaidDiagram
        chart={territoryHierarchyDiagram}
        title="ESPN: Tenant, Business Region, Market, Territories, Languages"
        caption="Language hangs off the tenant, not the market — es-419 is a second language for the same single US market."
        minHeight={550}
      />
      <p><strong>What US-only practically means for you.</strong> Two things that pull in opposite directions. First, <strong>whole code paths are dead for ESPN</strong>. Consider <code>getBusinessRegionFromPhysicalRegion</code> in <code>packages/cgi/commerce-utils/src/app-config/utils/get-business-region.ts</code>: it loops the <code>BusinessRegion</code> values and looks each one up in the <em>config&apos;s actual contents</em>. For ESPN only <code>NA</code> exists, so any non-NA physical region returns <code>undefined</code>, and every region-defaulted feature (the <code>GLOBAL_FOOTER_REGIONS</code> pattern in <code>is-global-footer-enabled.ts</code> is the exemplar) falls through to <code>false</code>. EU portability, RTL, currency conversion, multi-currency ledgers: dead weight for ESPN.</p>
      <p>Second — and this is the senior move — <strong>you still must not hardcode US assumptions in shared code</strong>. Almost none of the code that renders an ESPN screen is ESPN code. <code>packages/cgi/commerce-base</code> is shared with Disney+ across 244 countries, so a convenient <code>if (region === &apos;US&apos;)</code> in commerce-base is not an ESPN optimization, it is a Disney+ incident waiting for a deploy. The repo&apos;s own convention is the resolution ladder <em>explicit per-country value → business-region default → false</em>, never a literal country comparison.</p>

      <h2 id="territories-regions-languages-markets">Territories vs Regions vs Languages vs Markets</h2>
      <p>A <strong>market</strong> is the commercial concept: a country entry with real merchandising configuration. For ESPN, <code>US</code> is the only entry with <code>adsTierEnabled: true</code>, <code>sellsBundle: true</code> and a full <code>licensePlateFlowNavigation</code> map. <code>PR</code> is a <strong>territory</strong> — it exists as a row, it inherits from <code>US</code>, and it is not an independent market. Territory flags are a deep clone of the parent&apos;s flags with territory keys layered on top; inheritance is <strong>exactly one level deep</strong>, and an explicit <code>false</code> beats the parent&apos;s <code>true</code>.</p>
      <p>A <strong>business region</strong> is the Sparrow <code>countries</code> scope key: <code>BusinessRegion = &#123; NA, EMEA, APAC, LATAM &#125;</code> in <code>packages/cgi/commerce-utils/src/app-config/models/countries-scope.ts</code>, whose header comment reads <em>&quot;The currently supported countries in Sparrow&quot;</em>. Membership is a compile-time union per region, and <code>NACountryCodes</code> is <code>AS | CA | GU | MH | MP | PR | UM | US | VI</code> — note <code>CA</code>, which ESPN does not ship. <strong>The type is wider than the launch list.</strong> A <strong>region subtag</strong> is something else again: <code>RegionSubtag</code> in <code>geo/models/regions.ts</code> is the full IANA registry, roughly 280 codes including numeric macro-regions like <code>&apos;419&apos;</code> (Latin America) and <code>&apos;150&apos;</code> (Europe). It is a validation type, not a markets list; the default is <code>defaultRegion = &apos;US&apos;</code> in <code>geo/constants.ts</code>. A <strong>language</strong> is orthogonal to all of it — ESPN&apos;s <code>es-419</code> is a language, not a market, and does not imply Latin America is launched.</p>
      <p>The atom layer adds one more distinction people get wrong. <code>packages/cgi/commerce-base/src/common/i18n/geo/atoms/geo.ts</code> exposes both <code>regionAtom</code> (home location first, then physical) and <code>physicalRegionAtom</code> (physical only: header override → SDK location → CDN → default). They are <em>not</em> interchangeable. Consent code reads <strong>physical</strong>; commerce feature flags read <strong><code>regionAtom</code></strong>. For a traveller those two values genuinely differ, so swapping them changes who sees what.</p>

      <ArticleTable caption="The ESPN region and localization facts you can quote in a review, with the file that proves each one." minWidth={920}>
        <table>
          <thead>
            <tr><th>Fact</th><th>Value for ESPN</th><th>Where it lives</th><th>Why it matters</th></tr>
          </thead>
          <tbody>
            <tr><td>Business regions present</td><td><code>NA</code> only</td><td><code>sparrow-commerce-espn-workspace.ts</code> line 227</td><td>Every EMEA / APAC / LATAM branch is dead code for ESPN</td></tr>
            <tr><td>Countries + territories</td><td><code>AS GU MH MP PR UM US VI</code> — 8</td><td>Sparrow fixture + <code>remote-config/.../espn/qa.json</code></td><td>Two independent sources agree; this is the launched list</td></tr>
            <tr><td>Parent-country pointer</td><td><code>parentCountry: &apos;US&apos;</code> on all 7 non-US</td><td>Sparrow fixture, lines 250–449</td><td>Flag inheritance is one level; an explicit <code>false</code> opts out</td></tr>
            <tr><td><code>CA</code> Canada</td><td>Absent</td><td>Valid <code>NACountryCodes</code> member, no config entry</td><td>The type is wider than the launch list — never read the type as truth</td></tr>
            <tr><td>Country <code>group</code></td><td><code>&quot;North America&quot;</code></td><td>Legacy remote config <code>countries.US.group</code></td><td>A second, parallel region vocabulary alongside <code>BusinessRegion</code></td></tr>
            <tr><td>Default region</td><td><code>US</code></td><td><code>i18n/geo/constants.ts</code></td><td>Last resort in <code>physicalRegionAtom</code>; masks geo failures for ESPN</td></tr>
            <tr><td>Supported languages</td><td><code>en</code>, <code>es-419</code></td><td><code>supportedLangsMap</code>, ESPN fixture lines 160–169</td><td>Only tenant besides Disney+ with a second language</td></tr>
            <tr><td>Legacy <code>lang</code></td><td><code>en-GB</code></td><td><code>qa.json</code> → <code>countries.US.lang</code></td><td>Contradicts Sparrow&apos;s <code>en</code> — unresolved; treat as suspect</td></tr>
            <tr><td>Dictionary tenant</td><td><code>espn</code></td><td>Sparrow <code>dictionary</code> scope; also <code>qa.json</code></td><td>The single field that isolates ESPN copy, server-side</td></tr>
            <tr><td>Namespaces loaded</td><td>6 of 9</td><td><code>apps/commerce/espn/.env</code> line 6</td><td><code>unified-commerce</code> is the implicit default</td></tr>
            <tr><td>Currency / direction</td><td>USD at runtime; <code>ltr</code> only</td><td><code>use-currency-symbol.tsx</code>; <code>languageDirectionAtom</code></td><td>Symbol is a 3-step fallback ending in a literal <code>$</code>; RTL never fires</td></tr>
            <tr><td>Scale contrast</td><td>D+ 244 · Hulu 8 · ESPN 8</td><td>Per-tenant <code>qa.json</code> fixtures</td><td>Shared code must serve 244; ESPN code must not assume 1</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="the-group-field">The group Field and an Honest Contradiction</h3>
      <p>Alongside <code>BusinessRegion</code> there is a second, older vocabulary: a <code>group</code> string on each legacy country entry. Its observed value space across tenants is <code>&quot;North America&quot;</code>, <code>&quot;EMEA&quot;</code>, <code>&quot;APAC&quot;</code>, <code>&quot;LATAM&quot;</code> and <code>&quot;Marvel&quot;</code>. ESPN&apos;s only value is <code>&quot;North America&quot;</code>, and the same vocabulary reappears as <code>featureConfig.adobeLaunchRegion</code>. So the enum key is <code>NA</code> and the string is <code>&quot;North America&quot;</code> — one idea, two spellings — and <code>&quot;Marvel&quot;</code> is a value nobody has been able to explain.</p>
      <p>Now the contradiction worth carrying with you. In this repo, <code>countries-scope.ts</code> classifies <code>AU</code> and <code>NZ</code> as <strong>APAC</strong>. Prior research on the <strong>Flex side</strong> (<code>growth-life-client-api</code>) concluded AU/NZ are handled as <strong>EMEA</strong>. Both statements are true of their own system. This is a genuine cross-system inconsistency, not a documentation error, and it means <em>&quot;which region is Australia in?&quot;</em> has no answer until you say which system is deciding. Do not port the assumption across repos. It does not affect ESPN, which has neither country — but it will bite you the first time you touch a shared region helper.</p>

      <h3 id="not-in-cgi-web">Concepts That Do Not Exist in cgi-web</h3>
      <p>Two names come up constantly in region and experiment conversations and have <strong>zero hits</strong> in <code>cgi-web</code>, verified by repo-wide grep. If you are grepping for them here, you are in the wrong repository:</p>
      <CodeBlock
        code={`regionExperience        0 hits in cgi-web  ->  the country "group" string,
                                                plus the BusinessRegion enum
getExperimentTreatment  0 hits in cgi-web  ->  per-experiment hooks reading
                                                useMystiqueFeatureFlags().data?.[FEATURE_ID]

Both names belong to Flex (growth-life-client-api), the server-driven-UI BFF
that cgi-web consumes. Research them there, not here.`}
        lang="text"
        filename="absent-symbols.txt"
      />
      <p>A sibling module in this academy owns feature flags and experiments in depth. Here we need only the seam: experiments can <em>rewrite copy keys</em>, covered below.</p>

      <h2 id="espn-locales">ESPN&apos;s Locales and What Limited Language Support Means</h2>
      <CodeBlock
        code={`// ESPN Sparrow fixture, lines 160-169
supportedLangsMap: {
  en:       { dict: 'en',     hreflang: 'en' },
  'es-419': { dict: 'es-419', hreflang: 'es' },   // dict !== hreflang. Not interchangeable.
} as SupportedLangsMap,

// use-intl-locale.tsx composes the runtime locale as \`\${language}-\${locale}\`, where
// \`locale\` is regionAtom — a REGION sitting in the locale slot. A bad pairing throws
// inside Intl.getCanonicalLocales and is silently swallowed into
// \`\${defaultLang}-\${defaultRegion}\`, i.e. en-US for ESPN.`}
        lang="typescript"
        filename="sparrow-commerce-espn-workspace.ts"
      />
      <p>The type&apos;s own doc-comment corroborates it: <em>&quot;Currently, only Hulu and ESPN are on Sparrow, and only supports the <code>en</code> language for both, and <code>es-419</code> for ESPN.&quot;</em> <strong>What limited language support means for testing and copy work:</strong> a copy change ships in at most two variants, so the ESPN matrix is small — <code>en-US</code> and <code>es-419</code> against a US region — but it should deliberately include the <em>fallback</em> case, because a language/region mismatch is exactly how a real misconfiguration surfaces, and it surfaces silently. RTL needs no coverage at all: both languages are LTR, <code>languageDirectionAtom</code> defaults to <code>ltr</code>, and the styling convention is logical CSS properties (<code>ms-*</code>, <code>pe-*</code>, <code>start-*</code>) rather than runtime direction checks.</p>

      <h2 id="the-cypher-dictionary">The Dictionary: Cypher, Tenant Isolation, Fail-Soft</h2>
      <p>Every user-facing string on an ESPN commerce page is a <strong>Cypher key</strong> resolved against a dictionary downloaded at bootstrap. There are nine namespaces in the type; ESPN loads six.</p>
      <CodeBlock
        code={`# apps/commerce/espn/.env line 6
REMOTE_DICTIONARIES_TO_LOAD=accessibility,identity,pcon,unified-commerce,unified-offers,unified-commerce-onboarding

# Full namespace type (packages/dictionary/src/models/dictionary.ts):
#   identity | pcon | unified-commerce | unified-offers | unified-commerce-onboarding
#   application | accessibility | ratings | seo
# DictionaryTenant = 'disney' | 'espn' | 'hulu'

# The query built by packages/dictionary/src/lib/utils.ts carries, among others:
#   platform: 'web'   preferredLanguage   homeLocation / location / portabilityLocation
#   tenant: 'espn'    <- THIS is the whole isolation mechanism
#   pinnedPlatformName: 'web-cup'   pinnedPlatformVersion: '1.0'`}
        lang="text"
        filename="espn-dictionary-config.txt"
      />
      <p><strong>Tenant isolation happens server-side.</strong> There is no client-side per-brand key merging: the tenant is one field in the query variables and the Dictionary API returns only that tenant&apos;s copy. The consequence is elegant — the same key name means different things per brand. <code>logo_alttext</code> exists in all three tenants&apos; fallback bundles with different values; for ESPN it is <code>&apos;ESPN Logo&apos;</code>. Brand copy override <em>is</em> the tenant field. Nothing in component code branches on brand to choose a string. <strong>The missing-key behaviour is fail-soft, deliberately</strong> — from <code>packages/cgi/commerce-base/src/common/dictionary/context/use-dictionary.ts</code>:</p>
      <CodeBlock
        code={`export function useDictionary() {
  const getDictionaryCallback = useDictionaryInternal(useGetDefaultDictionaryConfig());
  const featureCopy = useExperimentalCopyOverrides();

  return (key: string, { dictionary = 'unified-commerce' }: { dictionary?: DictionaryNames } = {}) => {
    const copyKey = featureCopy[key] || key;            // (1) an experiment may swap the key
    let dictionaryValue = getDictionaryCallback(copyKey, { dictionary });

    // The experimental key may live in a different namespace than this caller uses.
    // Fall back to the original key so we show control copy instead of blank text.
    if (!dictionaryValue && copyKey !== key) {          // (2) never blank out on an experiment
      dictionaryValue = getDictionaryCallback(key, { dictionary });
    }

    if (!dictionaryValue) {                            // (3) observe, do not throw
      datadogRum.addError(new Error('MISSING_CYPHER_KEY_IN_DICTIONARY'), {
        owner: Owners.CORE,
        errorCode: ERROR_CODES.MISSING_CYPHER_KEY_IN_DICTIONARY,
        message: ERROR_MESSAGES.CYPHER_KEY_NOT_FOUND_IN_DICTIONARY,
        source: '/common/dictionary/context/use-dictionary',
        key: copyKey, dictionary: dictionary,
      });
    }
    return dictionaryValue;                            // (4) '' when missing
  };
}`}
        lang="typescript"
        filename="use-dictionary.ts"
      />
      <p><strong>Why fail-soft is right for a checkout page.</strong> The alternative is a throw, and a throw on a billing page is a lost transaction. A missing subtitle is a cosmetic defect; a blank screen at the moment of payment is revenue and trust. So the code degrades: render what you have, emit a structured error carrying <code>key</code> and <code>dictionary</code> so the gap is <em>observable</em>, and let the purchase complete. That trade only works if someone watches the signal, which is why <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> deserves an alert rather than a dashboard.</p>
      <MermaidDiagram
        chart={copyKeyJourneyDiagram}
        title="A Copy Key's Journey, Including the Missing-Key Branch"
        caption="Two fallbacks before giving up: the original key when the experimental key misses, then an empty string plus a RUM error. Never a throw."
        minHeight={550}
      />
      <p>Underneath, the lookup in <code>packages/dictionary/src/lib/callback.ts</code> has three modes: resolve normally, return <em>the key itself</em> when <code>isDictionaryDebugEnabled</code> (the Toodles debug panel), or wrap unresolved keys as <code>⚠️key⚠️</code> when <code>shouldShowDictionaryKey</code> is on — a staging-only affordance, so warning glyphs in staging copy are a feature. One sharp exception to fail-soft: ESPN&apos;s Sparrow config sets <code>cypherVariableErrorPathsToCrash: [&apos;/commerce/billing&apos;, &apos;/commerce/change-subscription/confirm&apos;]</code>. A missing cypher <em>variable</em> (not key) on those two paths is a <strong>hard crash by design</strong>, because a ledger rendering <code>{"{price}"}</code> literally is worse than an error page.</p>

      <h3 id="key-naming-convention">Decoding the Key Naming Convention</h3>
      <CodeBlock
        code={`# Real ESPN keys from packages/dictionary/src/data/espn/fallback-manual.ts — the manual
# fallback bundle; values are overwritten by Cypher once the key exists remotely.

# namespace: unified-offers  — the "uo_" prefix IS the namespace convention
uo_namelong_package_flagship          -> 'ESPN Unlimited'      # flagship = ESPN Unlimited
uo_namelong_package_espn              -> 'ESPN+'
uo_espn_ppv                           -> 'ESPN+ & PPV ###'
uo_espn_3p / uo_espn_3p_premium       -> 'ESPN+ Bundle' / 'ESPN+ Premium Bundle'

# namespace: unified-commerce — no prefix; the leading token is the surface
logo_alttext / logo_navigation_home_alt_text  -> 'ESPN Logo' / 'Navigate to ESPN+ Homepage'
success_espn_mlb_title                -> 'WELCOME TO ESPN+ WITH MLB.TV'
success_espn_nfl_bundle_title         -> "You're all set!"
billing_ppv_bundle_annual_title_copy  -> 'ESPN+ Annual with PPV 321'
billing_mlb_bundle_annual_title_copy  -> 'ESPN+ Annual & MLB.tv Season Pass'
account_addons_mlb_title              -> 'MLB.tv Season Pass'

# Decoding rule of thumb:
#   <surface>_<product-or-context>_<element>[_copy|_title|_alttext|_accessibility]
#   surface  = billing | success | account | logo | standalone | change_subscription
#   ###, 321 = deliberate placeholder digits in FALLBACK values, replaced by Cypher`}
        lang="text"
        filename="espn-cypher-keys.txt"
      />
      <p>Two codenames you will hit immediately. <strong>flagship</strong> is the code-level name for <em>ESPN Unlimited</em>; <code>package_espn</code> is <em>ESPN+</em>. There is no <code>ESPN Select</code> code identifier anywhere — the phrase appears only inside Disney+ dictionary copy. <strong>Raptor</strong> appears in ESPN copy (<code>&apos;Welcome to Raptor&apos;</code>) and maps to Venu via <code>activate.raptor_us</code> pointing at <code>stage.venu.com</code> — strongly implied, not definitively documented.</p>

      <h2 id="prices-are-server-driven">Prices Are Server-Driven</h2>
      <p><strong>cgi-web never computes a plan price. Not once, not anywhere.</strong> Prices arrive as rich-text models on Flex offer models, already resolved for eligibility, promotion, tax messaging and currency by GLO (Growth Life Orchestrator) and shaped by Flex.</p>
      <CodeBlock
        code={`// packages/cgi/commerce-base/src/common/services/flex/models/offer.types.ts
export type FlexFeatureOfferModel = {
  type: 'featureOffer';
  offerId: string;
  offerType?: FlexOfferType;
  title: FlexTextModel;
  price?: FlexRichTextModel;          // <- rendered rich text, NOT a number
  priceDetails?: FlexRichTextModel;   // <- also rich text
  startingAt?: FlexTextModel;
  legal?: FlexRichTextModel;
  interactions: FlexInteractionListModel<...>;
};
// Sibling variants, same story: FlexFeatureStackOfferModel (ledger/confirm),
// FlexCompactOffer (welcome-back/carousel).

// ESPN-relevant FlexOfferType members, of 17 total:
//   ESPN_STANDALONE   ESPN+ / ESPN Unlimited on its own
//   PPV_STANDALONE    pay-per-view (UFC), ONE_TIME
//   MLB_STANDALONE    MLB.tv Season Pass
//   ADD_ON_STANDALONE the generic add-on shape (PPV, MLB.tv)
//   RAPTOR_STANDALONE / RAPTOR_BUNDLE  the Venu-linked line
//   DISNEY_3P_BUNDLE  the Disney+ / Hulu / ESPN trio
//   EXTRA_MEMBER      extra-member add-on flow
// Cadence, owned by Flex and mirrored here: GLOOfferProductType =
//   MONTHLY | ANNUAL | SEASONAL | MULTI_ANNUAL | ONE_TIME`}
        lang="typescript"
        filename="offer.types.ts"
      />
      <p>The corollary: <strong>a price bug is a Flex bug unless it is a rendering or localization bug</strong>. There are exactly two places where cgi-web touches presentation, and both are deliberate.</p>

      <h3 id="the-two-exceptions">The Two Exceptions Where cgi-web Touches Presentation</h3>
      <CodeBlock
        code={`/**
 * Rounds up the whole-number portion when the format omits cents and the amount
 * is positive with non-zero decimals.
 */
export function applyLegalRounding(
  wholeNumbers: string, fractions: string, format: string, amount: number
): string {
  if (amount < 0) return wholeNumbers;
  const shouldRoundUp = !format.includes('\${p}') && parseInt(fractions, 10) > 0;
  return shouldRoundUp ? String(parseInt(wholeNumbers, 10) + 1) : wholeNumbers;
}
// Called from use-currency-format.ts, which builds the display string from the
// Globalization Service format rules '\${N}\${S}\${P}\${p}':
//   \${N} sign   \${S} symbol   \${C} code   \${P} whole part   \${p} decimal part`}
        lang="typescript"
        filename="apply-legal-rounding.ts"
      />
      <p><strong>Why exception 1 exists.</strong> Some locales format currency without a decimal component. Truncating <code>10.01</code> to <code>$10</code> advertises a price lower than the one you will charge, which in several jurisdictions is not a rounding choice but a legal exposure. Rounding <em>up</em> guarantees the displayed price is never below the charged price. The engineering consequence: a displayed price can legitimately differ from the Flex amount, and it always differs upward. &quot;The screen says $30 and the receipt says $29.99&quot; is expected behaviour here.</p>
      <CodeBlock
        code={`// From the file's own doc-comment:
//   removes list items that: contain exactly one \`textList\` entry, where the entry
//   is of type "cypher", and the dictionary callback returns a falsy value for it.
//   Items with multiple textList entries or non-"cypher" copy types are preserved.
//   The function mutates the original listItems arrays IN-PLACE.

const filteredItems = list.listItems.filter((listItem) => {
  if (listItem.text.textList.length > 1) return true;
  const [textListItem] = listItem.text.textList;
  if (textListItem.copy.type !== 'cypher') return true;

  const resolved = dictionaryCallback(textListItem.copy.text, {
    dictionary: textListItem.copy.dictionary,
  });
  return Boolean(resolved);          // <- falsy copy => the bullet disappears
});`}
        lang="typescript"
        filename="filter-modal-list-items.ts"
      />
      <p><strong>Why exception 2 exists.</strong> It is the fail-soft copy policy applied one level up. A missing key returns <code>&apos;&apos;</code>, and an empty bullet in a feature-comparison modal reads as a broken product — worse than an absent bullet. So the client deletes rows it cannot render. The debugging consequence is severe: <strong>a feature bullet present in the Flex JSON can be absent from the screen, with no error at the point of removal</strong>. When a stakeholder says &quot;we shipped that bullet and it is not there,&quot; check whether the cypher key resolves before checking whether Flex sent it.</p>
      <MermaidDiagram
        chart={pricePathDiagram}
        title="The Price Path: GLO to Flex to Rich Text to Legal Rounding to Screen"
        caption="cgi-web owns only the right-hand side — symbol resolution, delimiters, and the upward rounding. The number itself is upstream."
        minHeight={400}
      />

      <h2 id="copy-overrides-at-render-time">Copy Overrides at Render Time</h2>
      <p>This is the best trap in the whole area. <strong>cgi-web rewrites incoming Cypher keys at render time when a copy-override experiment flag is on</strong> — <code>packages/cgi/commerce-base/src/common/hooks/experiments/use-copy-override-experiment.tsx</code>:</p>
      <CodeBlock
        code={`export const FEATURE_FLAG_ID_PREFIX = 'wpnx-great-copy';

/**
 * All feature flags with the id prefix 'wpnx-great-copy' will return an object as the
 * flag value. These objects will contain a boolean 'hasOverrides'. If 'hasOverrides' is
 * false, this is the control treatment. If 'hasOverrides', then it will also contain
 * key/value pairs where the key is an original cypher key, and the value is the
 * experimental cypher key replacement.
 */
for (const featureId of Object.keys(data || {})) {
  const featureFlagValue = data?.[featureId];
  if (featureId.startsWith(FEATURE_FLAG_ID_PREFIX) && featureFlagValue.hasOverrides) {
    if (hasCommonItem) {            // two flags overriding the SAME cypher key
      datadogRum.addError(new Error('EXP COPY OVERRIDE – DUPLICATE EXPERIMENTAL KEY'), {
        owner: Owners.XD,
        message: ERROR_MESSAGES.EXPERIMENTATION.COPY_OVERRIDE_DUPLICATE +
                 \` The flag \${featureId} was ignored.\`,
      });
    } else {
      overrides = { ...overrides, ...featureFlagValue, hasOverrides: undefined };
    }
  }
}
datadogRum.setGlobalContextProperty('copy_override_experiments', datadogCopyOverrideContext);`}
        lang="tsx"
        filename="use-copy-override-experiment.tsx"
      />
      <p>Three mechanics matter. It matches by <strong>prefix, not exact id</strong>, so every flag starting with <code>wpnx-great-copy</code> merges into one override map and concurrent copy experiments compose. <strong>Collisions drop the later flag silently to the user</strong>: the second flag is ignored and a Datadog error fires with <code>owner: Owners.XD</code>, while the user sees the <em>first</em> flag&apos;s copy with no indication. And there is a <strong>second, independent override system</strong>: <code>useSpearmintCopyOverrides</code> discovers overrides by <em>dictionary key convention</em> — <code>{"{originalKey}__exp__{experimentName}__{variantId}"}</code> — scanning the loaded dictionary rather than reading a flag payload. Spearmint is Hulu&apos;s platform and ESPN uses WeaponX, but both paths feed the same <code>useExperimentalCopyOverrides</code> consumed inside <code>useDictionary</code>.</p>
      <p><strong>The debugging consequence: the copy on screen may not correspond to the key the backend sent.</strong> Flex emits <code>uo_namelong_package_flagship</code>; the flag rewrites it to an experimental twin; the dictionary resolves that twin; you read the Flex JSON, see the original key, look it up in Cypher, see the right value — and the screen still shows something else. You will conclude the dictionary is broken. It is not. <strong>Nothing in the Flex payload, and nothing in the Cypher entry for the emitted key, reveals that a swap happened.</strong> The only tells are the <code>copy_override_experiments</code> global context property in Datadog RUM and the raw WeaponX flag map in the SDK bootstrap. There is one mercy: if the experimental key misses, step (2) of <code>useDictionary</code> retries the original key, so a copy experiment can never blank out copy — which is also why a broken experiment can look like &quot;working fine&quot; while silently serving control.</p>
      <MermaidDiagram
        chart={wrongCopyTriageDiagram}
        title="Triage Tree: Wrong Copy on an ESPN Screen"
        caption="The render-time key-rewrite branch is the one people skip; it is also the one that makes the dictionary look guilty when it is innocent."
        minHeight={550}
      />

      <h2 id="marketing-side-pricing">The Marketing-Side Counterpart: Offer Tokens</h2>
      <p>Everything above describes <code>secure.web.plus.espn.com</code>. On the marketing side — <code>plus.espn.com</code>, <code>apps/marketing-unified/espn</code> — pricing works completely differently, and knowing both prevents a whole class of wrong-repo investigations. Marketing prices are <strong>not</strong> fetched from a plans API at render time. CMS authors write <strong>offer tokens</strong> such as <code>{"{{espn_unlimited_monthly.price}}"}</code>, and <code>getServerSideProps</code> substitutes formatted prices before building page props. Each token carries its own fallback values:</p>
      <CodeBlock
        code={`{
  "_type": "offer_token_global_parent",
  "_id": "espnOfferTokenGlobalParent1",
  "offer_tokens": [
    { "_type": "offer_token", "token_name": "espn_unlimited_monthly",
      "package_id": "espn_unlimited", "fallback_frequency": "MONTHLY",
      "fallback_retail_price": "29.99", "fallback_price": "29.99",
      "fallback_currency": "USD" },
    { "token_name": "espn_unlimited_annual", "package_id": "espn_unlimited",
      "fallback_frequency": "ANNUAL", "fallback_retail_price": "299.99" }
  ],
  "custom_tokens": []
}`}
        lang="json"
        filename="cnbl-offer-token-global-snapshot.json"
      />
      <p>And ESPN&apos;s currency formatting on the marketing side is <strong>hard-coded in the app</strong>, not remote: <code>get-cms-content-with-tokens-replaced.ts</code> supports only <code>USD</code> / <code>$</code>, region <code>US</code>, languages <code>en</code> and <code>default</code>, and the format string <code>&apos;$&#123;N&#125;$&#123;S&#125;$&#123;P&#125;$&#123;p&#125;&apos;</code>, passing <code>tenant: &apos;espn&apos;</code> and <code>appLangMap: &#123; en: &apos;en-US&apos; &#125;</code>. That is defensible precisely <em>because</em> ESPN is US-only — and it is the first thing that breaks if ESPN ever launches a second market.</p>
      <p>Two failure modes are unique to this path. Token replacement is observed crudely, by regex-matching <code>$dd.dd</code> in the serialised payload and setting the span tag <code>tokens_replaced</code> — a useful &quot;did pricing actually render&quot; signal. And if <code>replaceOfferTokensInSnapshot</code> errors, the app <strong>throws</strong>, so production renders the 500 page. <strong>Marketing fails hard on pricing; commerce fails soft on copy.</strong> Both choices fit their surface: a landing page with a blank price is worthless, while a checkout with a missing subtitle still converts. The hand-off between them is just a URL — <code>https://secure.web.plus.espn.com/commerce/billing?pref=espn_unlimited</code>, where <code>pref</code> is the <code>offer_token.package_id</code> that commerce resolves to a real offer through Flex. Nothing is shared client-side, so the landing-page price and the ledger price come from <strong>two entirely different pipelines</strong> and can legitimately disagree when a CMS fallback is stale.</p>

      <h2 id="tracing-a-copy-or-price-bug">Tracing a Copy or Price Bug End to End</h2>
      <p>Run these in order. Step 1 alone decides ownership for roughly four out of five of these tickets, and skipping it is the most common way to burn a day in the wrong repository.</p>
      <CodeBlock
        code={`1. CAPTURE THE RAW FLEX JSON. DevTools > Network > the /screens/... request, or curl
   with the same headers. Grab data.metadata.configurationId — your receipt for WHICH
   template served the response.

2. CLASSIFY THE VALUE.
   absent from JSON            -> Flex left the slot null, or no template slot exists
   present and WRONG in JSON   -> Flex / GLO / Cypher content / WeaponX allocation
   present and CORRECT in JSON -> cgi-web rendering. Continue to step 3.

3. KEY OR STRING? Flex returns { key, dictionary } via toCopy(), never literal English.
   wrong-looking key -> the Flex service emitted it (espnScreenCyphers.ts)
   right-looking key -> keep going; the client may have swapped it

4. CHECK FOR A RENDER-TIME KEY REWRITE. RUM global context copy_override_experiments;
   any wpnx-great-copy* flag in the SDK flag map; a {key}__exp__{name}__{variant} twin
   in the loaded dictionary (Spearmint). Any hit => the key on screen is NOT the key
   in the payload.

5. EMPTY RATHER THAN WRONG? Search RUM for MISSING_CYPHER_KEY_IN_DICTIONARY; its
   { key, dictionary } pair IS the diagnosis. ESPN also runs
   enableDictionaryOptimization: true (server-side key pruning), guarded in
   apps/commerce/espn/src/layout/hydrate-data-interface.tsx.

6. DISAPPEARED RATHER THAN BLANK? filter-modal-list-items.ts deleted it because its
   cypher key resolved falsy. No error at the removal site. Check the key.

7. FOR PRICES, SPLIT ROUNDING FROM AMOUNT.
   off by cents / one whole unit -> applyLegalRounding (cgi-web, rounds UP)
   wrong symbol                  -> useCurrencySymbol fallback chain
   wrong AMOUNT                  -> Flex conversion, then GLO. Not cgi-web.

8. CONFIRM THE SURFACE. plus.espn.com -> CMS offer tokens + hard-coded USD
   (marketing-unified). secure.web.plus.espn.com -> Flex offer models (commerce).`}
        lang="text"
        filename="trace-recipe.txt"
      />
      <ArticleTable caption="Symptom to owning system. Use it after step 2 of the recipe, never before." minWidth={940}>
        <table>
          <thead>
            <tr><th>Symptom</th><th>Owning system</th><th>First place to look</th></tr>
          </thead>
          <tbody>
            <tr><td>Copy renders as an empty string</td><td>Cypher dictionary content</td><td>RUM <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> → its <code>key</code> + <code>dictionary</code></td></tr>
            <tr><td>Copy is wrong but the emitted key looks right</td><td><strong>cgi-web experiment override</strong></td><td><code>use-copy-override-experiment.tsx</code>; RUM <code>copy_override_experiments</code></td></tr>
            <tr><td>Copy shows a literal <code>{"{placeholder}"}</code></td><td>Flex — variables not supplied</td><td><code>common/lib/flex/get-flex-copy.tsx</code> (logs unresolved)</td></tr>
            <tr><td>A feature bullet vanished from a details modal</td><td><strong>cgi-web</strong>, near-certainly</td><td><code>filter-modal-list-items.ts</code> — deletes falsy-cypher items in place</td></tr>
            <tr><td>Price off by cents or one whole unit</td><td><strong>cgi-web</strong></td><td><code>apply-legal-rounding.ts</code> via <code>use-currency-format.ts</code></td></tr>
            <tr><td>Price wrong by amount</td><td>Flex conversion, then GLO</td><td>Flex <code>flexMoney.ts</code>; GLO <code>retrieveOffersV2</code> (outside both repos)</td></tr>
            <tr><td>Wrong or missing currency symbol</td><td>Globalization Service</td><td><code>use-currency-symbol.tsx</code> — code → region → literal <code>$</code></td></tr>
            <tr><td>A whole section is missing from the screen</td><td>Flex service (slot filled with <code>null</code>)</td><td>The <code>templateData.data</code> object for that screen</td></tr>
            <tr><td>Landing page shows a stale or wrong-currency price</td><td>Marketing app — CMS token fallback / hard-coded USD</td><td><code>fallback_price</code> in the token snapshot; <code>get-cms-content-with-tokens-replaced.ts</code></td></tr>
            <tr><td>Billing page hard-crashes on missing copy</td><td>Sparrow config, by design</td><td><code>cypherVariableErrorPathsToCrash</code> in the ESPN workspace</td></tr>
            <tr><td>Copy fine in prod, missing locally</td><td>Dictionary optimization / hydration order</td><td><code>apps/commerce/espn/src/layout/hydrate-data-interface.tsx</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: how does localization work for a product that only ships in one country?"
        intro="A weak answer says there is nothing to localize. A strong answer separates market from language from copy delivery, and names the shared-code hazard."
        steps={[
          "Open with the separation: market, language and copy delivery are three independent axes. ESPN has one market (US plus 7 territories, all parentCountry US), two languages (en and es-419), and a full remote copy system.",
          "Name the proof, not the belief: the Sparrow countries scope has NA as its only business-region key, and the legacy remote config independently lists the same eight territories. Two sources agreeing is what makes it a fact.",
          "Say what US-only buys you: EMEA/APAC/LATAM branches, EU portability and RTL are dead paths — they cost review time and never earn test coverage.",
          "Then the counterweight, which is the senior move: nearly all the rendering code is shared with Disney+ across 244 countries, so an `if (region === 'US')` shortcut in commerce-base is a Disney+ incident. The convention is explicit per-country value, then business-region default, then false.",
          "Close on the vocabulary trap: es-419 is a language, not a market. A supported dictionary language does not imply a launched region.",
        ]}
      />
      <InterviewPlaybook
        title="How to answer: a customer says the price on screen is wrong. Who owns it?"
        intro="Interviewers want to hear you refuse to guess. The signal is a deterministic first step that assigns ownership before any code reading."
        steps={[
          "Start with the invariant: cgi-web never computes a price. Prices arrive as FlexRichTextModel on the offer model, already resolved for eligibility, promo, tax messaging and currency by GLO.",
          "State the deciding step: capture the raw Flex JSON. Wrong value present in the JSON means Flex or GLO. JSON correct but screen wrong means cgi-web.",
          "Name the two legitimate client-side deviations instead of pretending there are none: applyLegalRounding rounds the whole part UP when the locale format omits cents, and filterModalListItems deletes rows whose cypher key resolves falsy.",
          "Explain why each exists: rounding up guarantees the displayed price is never below the charged price, a legal constraint rather than a formatting preference. Dropping empty rows is the fail-soft copy policy applied one level up.",
          "Close with the surface question: plus.espn.com prices come from CMS offer tokens with hard-coded USD formatting; secure.web.plus.espn.com prices come from Flex. Two pipelines, and they can disagree.",
        ]}
      />

      <h2 id="challenge">Challenge: Wrong Price in Puerto Rico</h2>
      <InterviewChallenge
        title="The ESPN ledger shows the wrong price in Puerto Rico"
        scenario={
          <>
            A support escalation lands on you. A subscriber in <strong>Puerto Rico</strong> reports that the ESPN billing page (the &quot;ledger&quot;) shows <code>$30</code> for ESPN Unlimited Monthly, but their card was charged <code>$29.99</code>. A second PR user reports that the plan card on <code>plus.espn.com</code> showed <code>$29.99</code> — so the marketing page and the ledger disagree. A product manager has already filed it as &quot;Flex is returning the wrong price for PR&quot; and asked you to open a ticket against the BFF team.
          </>
        }
        tasks={[
          "Decide whether PR being a territory rather than a market can plausibly cause a price difference, and justify it from the config shape.",
          "Explain the $30 vs $29.99 discrepancy on the ledger, naming the exact file and the condition that triggers it.",
          "Explain why plus.espn.com can legitimately show a different string than the ledger for the same package, without either being a bug.",
          "State the one diagnostic step that would have prevented the PM's misfiled ticket, and what each possible outcome implies about ownership.",
          "Identify what you would rule out before accepting that any remaining discrepancy is a Flex bug, including the render-time mechanism that makes a correct payload render incorrectly.",
        ]}
        pitfalls={[
          "Assuming a territory has independent pricing config — PR carries parentCountry 'US' and inherits, one level deep.",
          "Filing against Flex before capturing the raw Flex JSON. Step 1 of the recipe exists to stop exactly this.",
          "Treating the marketing price and the ledger price as one pipeline. They are CMS offer tokens versus Flex offer models.",
          "Forgetting that legal rounding only rounds UP, and only when the locale format omits cents — so $30 for $29.99 is expected.",
          "Concluding 'the dictionary is wrong' when a wpnx-great-copy flag has rewritten the key at render time.",
        ]}
        signal="A strong candidate reassigns ownership with evidence rather than escalating on narrative, distinguishes the two pricing pipelines by surface, and names applyLegalRounding as an intentional legal constraint rather than a formatting bug."
      />
      <SolutionReveal difficulty="medium">
        <p><strong>1. PR is a territory, not a market.</strong> In the ESPN Sparrow workspace <code>PR</code> sits inside <code>countries.NA</code> with <code>parentCountry: &apos;US&apos;</code>. Territory configuration is a deep clone of the parent&apos;s flags with territory keys layered on top, one level deep, and <code>US</code> is the only entry carrying <code>adsTierEnabled</code>, <code>sellsBundle</code> and a full <code>licensePlateFlowNavigation</code> map. So &quot;PR pricing&quot; is not a concept in this system; PR-specific behaviour would have to be an explicit per-territory flag — where an explicit <code>false</code> beats the parent&apos;s <code>true</code>.</p>
        <p><strong>2. The $30 vs $29.99 discrepancy is expected client behaviour.</strong> <code>packages/cgi/commerce-base/src/common/lib/apply-legal-rounding.ts</code> rounds the whole-number portion <em>up</em> when <code>!format.includes(&apos;$&#123;p&#125;&apos;)</code> and <code>parseInt(fractions, 10) &gt; 0</code>, for non-negative amounts. The <code>format</code> string comes from the Globalization Service currency rules, consumed in <code>use-currency-format.ts</code>. If the resolved format omits the <code>$&#123;p&#125;</code> decimal token, <code>29.99</code> displays as <code>$30</code> — deliberately, so the shown price is never below the charged price. The real defect, if any, is that the format rules omit cents for this locale: a Globalization Service question, not a Flex price question.</p>
        <p><strong>3. The two surfaces are different pipelines.</strong> <code>plus.espn.com</code> renders prices from CMS <strong>offer tokens</strong> substituted in <code>getServerSideProps</code>, with per-token <code>fallback_price</code> / <code>fallback_currency</code> and hard-coded USD formatting. <code>secure.web.plus.espn.com</code> renders <code>price: FlexRichTextModel</code> from a Flex offer model. Different sources, different formatters, and only the marketing side has a stale-fallback failure mode. Divergence is a content-freshness question, not a contradiction.</p>
        <p><strong>4. The one diagnostic step: capture the raw Flex JSON</strong> for the ledger request, plus <code>data.metadata.configurationId</code>. A wrong <em>amount</em> in the JSON means Flex conversion and then GLO. <code>29.99</code> in the JSON with <code>$30</code> on screen means cgi-web rendering, and the answer is legal rounding. An absent field means Flex left the slot <code>null</code> or the template has no slot. One network capture partitions the entire problem space — which is why the PM&apos;s ticket was premature.</p>
        <p><strong>5. Before accepting a Flex bug</strong>, rule out the client-side rewrites: check RUM for <code>copy_override_experiments</code> and for any active <code>wpnx-great-copy*</code> flag, since those rewrite Cypher keys <em>at render time</em> and neither the payload nor the Cypher entry for the emitted key shows the swap. Check <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> for empty resolutions, and remember <code>filter-modal-list-items.ts</code> if a price <em>detail row</em> is missing rather than wrong. Only once all three come back clean is &quot;Flex returned the wrong amount&quot; defensible.</p>
      </SolutionReveal>

      <h2 id="gotchas-and-traps">Gotchas &amp; Traps</h2>
      <ul>
        <li><strong>The type is wider than the launch list.</strong> <code>NACountryCodes</code> includes <code>CA</code>; <code>RegionSubtag</code> has ~280 IANA codes including <code>&apos;419&apos;</code> and <code>&apos;150&apos;</code>. Only the <em>config contents</em> tell you what shipped, which is why <code>getBusinessRegionFromPhysicalRegion</code> iterates the config and not the type.</li>
        <li><strong><code>regionAtom</code> and <code>physicalRegionAtom</code> are not interchangeable.</strong> Consent reads physical; commerce flags read <code>regionAtom</code>. Worse, <code>regionAtom</code> is <em>cast</em> to <code>CommerceAppConfigRegion</code> at the flag boundary — an unchecked cast, so an unlaunched region silently yields <code>{"{}"}</code> flags instead of an error.</li>
        <li><strong>The <code>en-GB</code> contradiction is real.</strong> The legacy ESPN remote config sets <code>countries.US.lang: &quot;en-GB&quot;</code> and <code>regionLanguages: [&quot;en-GB&quot;]</code> while Sparrow&apos;s <code>supportedLangsMap</code> has <code>en</code>. Which wins at runtime is an open question; do not build logic on either without checking live config.</li>
        <li><strong>The copy on screen may not match the key in the payload.</strong> Any <code>wpnx-great-copy*</code> flag rewrites keys at render time, matched by <em>prefix</em> so concurrent experiments merge — and a duplicate-key collision silently drops the later flag while logging <code>EXP COPY OVERRIDE – DUPLICATE EXPERIMENTAL KEY</code>.</li>
        <li><strong>Missing copy makes rows disappear, not go blank.</strong> <code>filter-modal-list-items.ts</code> mutates Flex list arrays <em>in place</em>, deleting single-entry cypher items that resolve falsy, with no error at the removal site.</li>
        <li><strong>Displayed prices round up.</strong> <code>applyLegalRounding</code> means a screen price can legitimately exceed the Flex amount. It never rounds down and never touches negative amounts.</li>
        <li><strong>ESPN has no <code>fallback-prebuild.json</code>.</strong> Disney+ generates one; ESPN has only the hand-maintained <code>fallback-manual.ts</code>. Placeholder digits inside those values (<code>PPV ###</code>, <code>PPV 321</code>) are fallback artifacts — and they <em>will</em> render if Cypher misses.</li>
        <li><strong>ESPN&apos;s plan selector is off-app.</strong> <code>espn_plan_selector</code> points at <code>https://sandbox.espn.com/watch/offers</code> and <code>enableCommerceUnifiedPlans</code> is <code>false</code> in the checked-in fixture, so &quot;the ESPN paywall shows the wrong price&quot; may not be a cgi-web page at all.</li>
        <li><strong>Marketing fails hard where commerce fails soft.</strong> A token-replacement error on <code>plus.espn.com</code> throws and renders the 500 page; a missing key on the ledger returns <code>&apos;&apos;</code>. Do not carry a mental model from one surface to the other.</li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>ESPN commerce is <strong>US-only</strong>: one business region (<code>NA</code>) and eight country entries (<code>AS GU MH MP PR UM US VI</code>), with <code>parentCountry: &apos;US&apos;</code> on all seven non-US ones — confirmed independently by the Sparrow workspace and the legacy remote config. Disney+ has 244; Hulu has the identical eight.</li>
        <li><strong>Market, region, territory and language are four axes.</strong> <code>US</code> is the market, <code>PR</code> a territory inheriting one level, <code>NA</code> the business region, <code>es-419</code> a language implying nothing about launched markets. The <code>group</code> string is a parallel vocabulary, and the AU/NZ APAC-versus-EMEA split between this repo and Flex is a genuine cross-system inconsistency, not a typo.</li>
        <li><strong>Copy is Cypher, isolated server-side by one field</strong> — <code>tenant: &apos;espn&apos;</code> in the dictionary query — and it fails soft: a missing key emits <code>MISSING_CYPHER_KEY_IN_DICTIONARY</code> to Datadog RUM with key and namespace, returns the empty string, and never throws, because a throw on a billing page costs a transaction.</li>
        <li><strong>cgi-web never computes a price.</strong> Prices arrive as <code>FlexRichTextModel</code> on Flex offer models. The only two client-side deviations are <code>applyLegalRounding</code> (rounds up so the shown price is never below the charged price) and <code>filterModalListItems</code> (deletes rows whose cypher key resolves falsy).</li>
        <li><strong>The copy on screen may not correspond to the key the backend sent.</strong> Any <code>wpnx-great-copy*</code> flag rewrites Cypher keys at render time, and neither the Flex payload nor the Cypher entry reveals it. The only tells are <code>copy_override_experiments</code> in RUM and the raw flag map.</li>
        <li><strong>Two pricing pipelines, one brand.</strong> <code>plus.espn.com</code> uses CMS offer tokens with fallbacks and hard-coded USD and <em>throws</em> on failure; <code>secure.web.plus.espn.com</code> renders Flex offer models and degrades gracefully. Establish the surface, then capture the raw Flex JSON before assigning ownership.</li>
      </ul>
    </div>
  );
}
