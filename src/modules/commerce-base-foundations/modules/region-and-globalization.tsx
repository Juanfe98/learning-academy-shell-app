import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const regionPriorityDiagram = String.raw`flowchart TD
  START["regionAtom is read"]
  START --> HOME{"SDK Home<br/>Location?"}
  HOME -->|"yes"| USE1["use home region"]
  HOME -->|"no"| PHYS["physicalRegionAtom"]
  PHYS --> H2{"dss-physical-country<br/>header?"}
  H2 -->|"yes"| USE2["use header region"]
  H2 -->|"no"| SDK{"SDK physical<br/>location?"}
  SDK -->|"yes"| USE3["use SDK region"]
  SDK -->|"no"| CDN{"Akamai CDN<br/>region?"}
  CDN -->|"yes"| USE4["use CDN region"]
  CDN -->|"no"| DEF["defaultRegion = 'US'"]`;

const twoSourcesDiagram = String.raw`flowchart LR
  subgraph app["App-wide geo (Jotai)"]
    RA["regionAtom / physicalRegionAtom"]
  end
  subgraph flex["Per-field (Flex model)"]
    MR["model.metadata?.region"]
  end

  RA --> CURR["useCurrencySymbol()"]
  RA --> FLAGS["useCommerceRegionFeatureFlags()"]
  RA --> CANCEL["region === 'DE' cancel guard"]
  MR --> ZIP["zip code validation"]
  MR --> PHONE["phone number format"]
  MR --> TAX["tax-id mask + validation"]`;

const currencyFallbackDiagram = String.raw`flowchart TD
  IN["getCurrencySymbol(currencyCode, data, region)"]
  IN --> C1{"code in<br/>codesToSymbol?"}
  C1 -->|"yes"| R1["return that symbol"]
  C1 -->|"no"| C2{"region in<br/>regionToSymbol?"}
  C2 -->|"yes"| R2["return region symbol"]
  C2 -->|"no"| R3["return '$'"]`;

const rtlDiagram = String.raw`sequenceDiagram
  participant URL as URL language (es-419 / ar-sa)
  participant LR as LanguageRedirect
  participant GS as globalization service (v>=2)
  participant Doc as document.documentElement

  URL->>LR: currentURLLanguage
  LR->>GS: query ui { language, direction }
  GS-->>LR: direction ('rtl' | 'ltr')
  LR->>Doc: document.documentElement.dir = direction
  Note over Doc: CSS logical properties<br/>(ms-*, pe-*) resolve off dir`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "region-source", title: "Where 'Region' Comes From", level: 2 },
  { id: "priority", title: "The Priority Chain", level: 3 },
  { id: "two-sources", title: "Two Region Sources: Geo Atom vs Flex Model", level: 2 },
  { id: "reading-region", title: "Reading Region in a Component", level: 2 },
  { id: "germany", title: "The Germany Branch: Regulated Cancellation", level: 2 },
  { id: "payment-fields", title: "Country-Specific Payment Fields", level: 2 },
  { id: "region-flags", title: "Region-Scoped Feature Flags", level: 2 },
  { id: "globalization", title: "The Globalization Service", level: 2 },
  { id: "currency", title: "Currency Symbols", level: 3 },
  { id: "rtl", title: "RTL and Language Direction", level: 2 },
  { id: "config-over-code", title: "Config Over Code", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: The AU/NZ Price Bug", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function RegionAndGlobalization() {
  return (
    <div className="article-content">
      <p>
        The same commerce screen renders differently in São Paulo, Riyadh, Berlin, and Sydney:
        different currency, different date format, different payment fields, sometimes an entirely
        different legal flow, and — for Arabic and Hebrew — the whole layout mirrors right-to-left.
        None of that is hardcoded per screen. It is driven by a small set of primitives:{" "}
        <strong>the geo atoms</strong>, <strong>the globalization service</strong>, and{" "}
        <strong>per-country config</strong>. This module maps all three so you can reason about any
        &quot;wrong in region X&quot; bug — the exact class of ticket you&apos;ll work most often.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Region bugs are subtle because &quot;region&quot; has more than one source in this codebase,
        and picking the wrong one is the root cause of a whole family of defects. Get the sources
        straight and you can immediately answer: <em>is this the app-wide region, or the region of a
        specific payment field? Is it a config value, or a hardcoded branch?</em>
      </p>

      <h2 id="region-source">Where &apos;Region&apos; Comes From</h2>
      <p>
        The app-wide region is a <strong>derived Jotai atom</strong>, not a header or query param. It
        composes several base atoms with a documented priority order.{" "}
        <code>common/i18n/geo/atoms/geo.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/i18n/geo/atoms/geo.ts"
        code={`export const physicalRegionAtom = atom((get) => {
  const headerPhysicalRegion = get(headerOverridePhysicalRegionAtom); // dss-physical-country header
  const sdkPhysicalRegion = get(sdkPhysicalLocationAtom);             // location-service via SDK
  const cdnPhysicalRegion = get(cdnPhysicalRegionAtom);              // Akamai CDN
  return headerPhysicalRegion || sdkPhysicalRegion || cdnPhysicalRegion || defaultRegion; // 'US'
});

export const regionAtom = atom((get) => {
  const homeRegion = get(sdkHomeLocationAtom);      // SDK home location wins over physical
  const physicalRegion = get(physicalRegionAtom);
  return homeRegion || physicalRegion;
});`}
      />
      <p>
        Two atoms matter: <code>regionAtom</code> is the app-wide value (home location wins), and{" "}
        <code>physicalRegionAtom</code> is the physical-location-only subset. There is also a{" "}
        <code>sdkPortabilityLocationAtom</code> for EU portability (a subscriber travelling between EU
        countries). <code>defaultRegion = &apos;US&apos;</code> lives in{" "}
        <code>common/i18n/geo/constants.ts</code>; <code>RegionSubtag</code> is the IANA-subtag union
        in <code>common/i18n/geo/models/regions.ts</code>.
      </p>

      <h3 id="priority">The Priority Chain</h3>
      <MermaidDiagram
        chart={regionPriorityDiagram}
        title="How regionAtom resolves"
        caption="Home location beats physical; within physical, header override beats SDK beats CDN beats the US default. When the SDK is disabled, useLocationInfo hardcodes 'US'."
        minHeight={460}
      />
      <p>
        The values are written by <code>useLocationInfo()</code> (
        <code>common/i18n/geo/context/use-location-info.ts</code>), a react-query call to{" "}
        <code>sdkSession.getSessionInfo()</code> that populates the SDK location atoms from{" "}
        <code>countryCode</code> fields. When the SDK is disabled it is hardcoded to{" "}
        <code>&apos;US&apos;</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/i18n/geo/context/use-location-info.ts"
        code={`const sdkSessionInfo = await sdkSession.getSessionInfo();
setSDKPhysicalLocation(sdkSessionInfo.location.countryCode as SDKRegionSubtag);
setSDKHomeLocation(sdkSessionInfo.homeLocation?.countryCode as SDKRegionSubtag);
setSDKPortabilityLocation(sdkSessionInfo.portabilityLocation?.countryCode as SDKRegionSubtag);

// SDK disabled path:
setSDKPhysicalLocation('US');
return { homeLocation: undefined, location: 'US', portabilityLocation: undefined };`}
      />

      <h2 id="two-sources">Two Region Sources: Geo Atom vs Flex Model</h2>
      <p>
        Here is the distinction that trips up almost everyone. There are{" "}
        <strong>two independent notions of region</strong> in commerce-base:
      </p>
      <MermaidDiagram
        chart={twoSourcesDiagram}
        title="Two region sources"
        caption="App-wide behavior (currency, flags, cancel flow) reads the geo atom. Payment FIELD validation (zip, phone, tax-id) reads model.metadata?.region from the Flex data — a different value with a different lifecycle."
        minHeight={360}
      />
      <ArticleTable
        caption="Which region source to use, and where."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Region source</th>
              <th>Symbol / file</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Currency symbol / format</td>
              <td>Geo atom</td>
              <td><code>useCurrencySymbol()</code> reads <code>regionAtom</code></td>
            </tr>
            <tr>
              <td>Region-scoped feature flags</td>
              <td>Geo atom</td>
              <td><code>useCommerceRegionFeatureFlags()</code></td>
            </tr>
            <tr>
              <td>Regulated cancel (Germany)</td>
              <td>Geo atom</td>
              <td><code>physicalRegionAtom</code> → <code>region === &apos;DE&apos;</code></td>
            </tr>
            <tr>
              <td>Zip code validation</td>
              <td>Flex model</td>
              <td><code>getZipCodeRegion(model)</code> ← <code>model.metadata?.region</code></td>
            </tr>
            <tr>
              <td>Phone number format</td>
              <td>Flex model</td>
              <td><code>model.metadata?.region || &apos;US&apos;</code></td>
            </tr>
            <tr>
              <td>Tax-ID mask (LATAM)</td>
              <td>Flex model</td>
              <td><code>model.metadata?.region || &apos;DEFAULT&apos;</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="reading-region">Reading Region in a Component</h2>
      <p>
        For app-wide behavior, you read the atom and compare against a literal:
      </p>
      <CodeBlock
        lang="typescript"
        filename="pattern"
        code={`const region = useAtomValue(regionAtom);          // or physicalRegionAtom
if (region === 'DE') {
  // Germany-specific behavior
}`}
      />
      <p>
        This exact <code>region === &apos;DE&apos;</code> comparison appears in the footer (
        <code>common/footer/components/footer.tsx</code>, gated as{" "}
        <code>region === &apos;DE&apos; &amp;&amp; !isLoggedIn</code>) and across the regulated-cancel
        hooks. Hardcoded region branches like this are the exception in the codebase — most
        region behavior flows through config (see <a href="#config-over-code">Config Over Code</a>).
      </p>

      <h2 id="germany">The Germany Branch: Regulated Cancellation</h2>
      <p>
        Germany has legally-regulated subscription cancellation, so it gets a dedicated flow gated by
        both region and a feature flag. From{" "}
        <code>retention/cancel/hooks/use-cancel-contract-locale-redirect.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-cancel-contract-locale-redirect.ts"
        code={`const region = useAtomValue(physicalRegionAtom);
const isRegulatedCancelEnabled = Boolean(flags?.['wpnx-web-commerce-regulated-cancel']);
const isInGermany = region === 'DE';
const willRedirect = flagsLoaded && (!isInGermany || !isRegulatedCancelEnabled);

useEffect(() => {
  if (willRedirect) router.push(route({ internal: '/identity/login' }));
}, [router, willRedirect]);`}
      />
      <p>
        Read the logic carefully: the regulated-cancel page is shown only when{" "}
        <strong>both</strong> the user is in Germany <strong>and</strong> the{" "}
        <code>wpnx-web-commerce-regulated-cancel</code> flag is on. Otherwise the user is bounced to
        login. A sibling hook (<code>use-cancel-contract-auth-redirect.ts</code>) uses the same{" "}
        <code>isInGermany</code> guard plus subscription state to route to success vs account, and
        the footer handler distinguishes Germany (regulated cancel-contract page) from France (legacy
        subscription page).
      </p>

      <h2 id="payment-fields">Country-Specific Payment Fields</h2>
      <p>
        Payment form fields validate and format differently per country — and, critically, they read
        the country from the <strong>Flex model</strong> (<code>model.metadata?.region</code>), not
        the geo atom. Three examples:
      </p>
      <CodeBlock
        lang="typescript"
        filename="payments/payment-forms/components/controlled-zip-code/utils/utils.ts"
        code={`const zipCodeRegex = /^\\d{5}$/;                                   // US
const canadianZipCodeRegex = /^(?!.*[DFIOQU])[A-VXY]\\d[A-Z] ?\\d[A-Z]\\d$/; // CA A1A 1A1
export const brazilianZipCodeRegex = /^\\d{5}-\\d{3}$/;             // BR CEP`}
      />
      <CodeBlock
        lang="typescript"
        filename="payments/payment-forms/components/form-fields/phone-number/utils/utils.ts"
        code={`// Saudi Arabia has a special leading-0 grouping
if (countryCode === 'SA' && value.startsWith('0') && value.length > 3) {
  return \`\${value.slice(0, 2)} \${value.slice(2, 6)} \${value.slice(6)}\`.trim();
}
// Only the US keeps parentheses
if (countryCode === 'US') return formatted;
return formatted.replace(/[()]/g, '').replace(/-/g, ' ');`}
      />
      <p>
        Tax-ID (LATAM) reads <code>const region = model.metadata?.region || &apos;DEFAULT&apos;</code>{" "}
        and indexes a <code>taxIdVariations[region]</code> table (<code>AR</code>, <code>BR</code>,{" "}
        <code>CL</code>, <code>CO</code>, <code>DEFAULT</code>), each with its own input mask and
        validator. A missing region logs a Datadog error tagged <code>owner: Owners.TAP</code> —
        note the ownership tag differs from the geo layer&apos;s <code>Owners.CORE</code>.
      </p>

      <h2 id="region-flags">Region-Scoped Feature Flags</h2>
      <p>
        Some flags are keyed by region in the app config, and <strong>territories inherit their
        parent country&apos;s flags with overrides</strong>. From{" "}
        <code>common/components/localized/feature-flag/hooks/use-commerce-region-feature-flags.tsx</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-commerce-region-feature-flags.tsx"
        code={`const parentCountry = commerceAppConfigCountries[region]?.parentCountry;
const isTerritory = parentCountry !== undefined;
if (!isTerritory || !shouldInheritFromParent) {
  return commerceAppConfigCountries[region]?.featureFlags ?? {};
}
// Deep-clone parent flags, then overlay territory-specific overrides
const territoryFlagsCopy = JSON.parse(
  JSON.stringify(commerceAppConfigCountries[parentCountry]?.featureFlags ?? {}),
);
// ... apply overrides ...`}
      />
      <p>
        The <code>&lt;LocalizedFeatureFlag&gt;</code> component wraps this: it renders children only
        when a region-scoped config flag is truthy (or passes a custom <code>filter</code>). The flag
        lookup defaults to the current <code>regionAtom</code> unless a <code>region</code> is passed
        explicitly.
      </p>

      <h2 id="globalization">The Globalization Service</h2>
      <p>
        Currency symbols and locale-aware number/date/time <em>format rules</em> come from the
        orchestration API&apos;s <code>globalization</code> GraphQL field, fetched by{" "}
        <code>useGlobalizationFormatting()</code> (
        <code>common/services/globalization/queries/use-globalization-formatting.ts</code>). The
        version comes from config (<code>globalizationServiceVersion</code>), the result is normalized
        and cached forever (<code>staleTime</code>/<code>cacheTime = Infinity</code>), and an
        SDK-disabled fallback uses a v1.8 en-US fixture.
      </p>

      <h3 id="currency">Currency Symbols</h3>
      <p>
        <code>getCurrencySymbol</code> tries the currency-code map first, then a region map, then
        falls back to <code>&apos;$&apos;</code>. The hook supplies the region from{" "}
        <code>regionAtom</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="common/services/globalization/hooks/use-currency-symbol.tsx"
        code={`export function getCurrencySymbol(currencyCode, globalizationData, region) {
  const symbolFromCurrencyCode = globalizationData.codesToSymbol
    .find((i) => i.currencyCode === currencyCode)?.symbol;
  if (symbolFromCurrencyCode) return symbolFromCurrencyCode;

  const symbolFromRegion = globalizationData.regionToSymbol
    .find((i) => i.region === region)?.symbol;
  if (symbolFromRegion) return symbolFromRegion;

  return '$';
}

export function useCurrencySymbol(currencyCode: string) {
  const region = useAtomValue(regionAtom);
  const { data: globalizationData } = useGlobalizationFormatting();
  if (globalizationData) return getCurrencySymbol(currencyCode, globalizationData, region);
  return; // undefined while loading
}`}
      />
      <MermaidDiagram
        chart={currencyFallbackDiagram}
        title="Currency symbol resolution"
        caption="Currency code wins; region is the fallback; '$' is the last resort. Format rules (delimiters, placement) are chosen separately by language:region with a 4-step fallback."
        minHeight={300}
      />
      <p>
        The final rendered value combines <code>useFormatRules(&apos;currency&apos;)</code> +{" "}
        <code>useCurrencySymbol</code> in <code>useCurrencyFormat()</code>, applying a template with
        placeholders (<code>${"{S}"}</code> symbol, <code>${"{C}"}</code> code, <code>${"{P}"}</code>{" "}
        whole part, <code>${"{p}"}</code> fraction, <code>${"{N}"}</code> negative). It renders via{" "}
        <code>&lt;LocalizedCurrency amount currency /&gt;</code>.
      </p>

      <h2 id="rtl">RTL and Language Direction</h2>
      <p>
        Right-to-left support is handled at the <strong>document level</strong>, not per-component
        JavaScript. <code>useLanguageDirectionQuery()</code> asks the globalization service for the
        direction of the current URL language (only on major version ≥ 2; older versions
        short-circuit to <code>&apos;ltr&apos;</code>), and <code>LanguageRedirect</code> sets{" "}
        <code>document.documentElement.dir</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="common/i18n/language-redirect/components/language-redirect.tsx"
        code={`document.documentElement.dir =
  enableRtlLayoutOverride === '1' ? 'rtl' : globalizationServiceLanguageDirection;`}
      />
      <MermaidDiagram
        chart={rtlDiagram}
        title="How RTL flows to the layout"
        caption="Direction is resolved from the URL language via the globalization service and applied to document.dir. CSS logical properties (ms-*, pe-*) then resolve correctly — which is why the codebase mandates logical properties over left/right."
        minHeight={320}
      />
      <p>
        This is the reason the repo mandates <strong>logical CSS properties</strong> (
        <code>margin-inline-start</code>, Tailwind <code>ms-*</code>/<code>pe-*</code>/
        <code>start-*</code>) instead of directional ones (<code>ml-*</code>, <code>left-*</code>).
        With <code>dir</code> set correctly, logical properties mirror automatically; directional
        properties do not. The language actually rendered is derived from the URL (
        <code>.../es-419/commerce/billing</code>) as the source of truth.
      </p>

      <h2 id="config-over-code">Config Over Code</h2>
      <p>
        The most important takeaway for writing region-aware code:{" "}
        <strong>region behavior is driven by config data far more than by{" "}
        <code>if (region === &apos;XX&apos;)</code> branches.</strong> The central{" "}
        <code>commerceAppConfigAtom</code> carries the per-country feature-flag map, supported
        languages, dictionary config, and globalization version. Prefer adding a config-driven flag
        over a hardcoded branch — the German cancellation flow is the notable hardcoded exception,
        and it exists because the requirement is legal, not merchandising.
      </p>
      <p>
        One more trap worth internalizing: <strong>SDK-disabled fallbacks are hardcoded to US /
        en-US</strong> in <code>useLocationInfo</code>, <code>useGlobalizationFormatting</code>, and{" "}
        <code>useActiveProfileLanguageQuery</code>. If you develop with the SDK off, everything looks
        like the US — region bugs hide until you test with the SDK enabled.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does region work in commerce-base?'"
        intro="Lead with the derived atom and its priority chain, then the crucial two-sources distinction, then config-over-code."
        steps={[
          "regionAtom is a derived Jotai atom: home location wins, else physical (header → SDK → CDN → US default).",
          "There are two region notions: the geo atom (app-wide: currency, flags, cancel flow) and model.metadata?.region (per payment field: zip, phone, tax-id). Using the wrong one is a common bug.",
          "Currency and format come from the globalization service (versioned GraphQL), with code→region→'$' fallback for symbols.",
          "RTL is set at document.dir from the globalization service by language, which is why logical CSS properties are mandatory.",
          "Region behavior is config-driven (commerceAppConfig per-country flag map with territory→parent inheritance); hardcoded region === 'DE' branches are the legal-requirement exception.",
        ]}
      />

      <h2 id="challenge">Challenge: The AU/NZ Price Bug</h2>
      <InterviewChallenge
        title="Wrong price shown to Australian users during a promo"
        scenario={
          <>
            A Welcome Back screen shows an incorrect price for Australian and New Zealand users during
            a promotion. The values look plausible (correct currency symbol, right format) but the
            amount is wrong. You need to decide where region is being read and whether this is a
            commerce-base issue at all.
          </>
        }
        tasks={[
          "Identify which region source could be involved (geo atom vs Flex model) and why the currency symbol being correct is a clue.",
          "Explain why 'correct format, wrong amount' points away from the globalization/currency layer.",
          "Describe how you'd check whether an experiment or region-scoped flag is selecting a different offer.",
          "State whether the eligible-offer/price selection logic more likely lives in commerce-base or upstream in the Flex BFF.",
        ]}
        pitfalls={[
          "Assuming a wrong amount is a currency-formatting bug — formatting is correct, so it's offer selection.",
          "Reading regionAtom when the field actually uses model.metadata?.region (or vice versa).",
          "Forgetting AU/NZ region-scoped flags may inherit from a parent country with an override.",
        ]}
        signal="A strong answer separates format (globalization, correct here) from amount (offer selection), suspects a region-scoped flag/experiment picking the wrong offer, and recognizes that eligible-offer/price selection is largely decided upstream in the Flex BFF — commerce-base mostly renders what Flex returns."
      />
      <SolutionReveal difficulty="hard">
        <p>
          The correct currency symbol and format tell you the globalization layer is fine — this is
          not a <code>useCurrencySymbol</code>/<code>useCurrencyFormat</code> bug. A <em>wrong
          amount</em> is an <strong>offer-selection</strong> problem: the screen is displaying a
          price from a different offer than intended for AU/NZ under the promo.
        </p>
        <p>
          Check two things. First, region-scoped flags: AU/NZ may be a territory inheriting a parent
          country&apos;s flags via <code>useCommerceRegionFeatureFlags</code>, so an override could
          be selecting a different offer set. Second, experiment treatment: a Welcome Back price test
          could assign a variant that changes the offer. But the decisive insight is architectural —
          <strong>which offer is eligible and what price it carries is decided largely upstream in
          the Flex BFF</strong> (the server-driven-UI service), and commerce-base mostly renders what
          Flex returns. So the fix very likely lives in the Flex service&apos;s region/experiment
          offer logic, with commerce-base only responsible if it&apos;s re-deriving or overriding the
          price locally.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Region is a derived atom.</strong> <code>regionAtom</code> = home ?? physical;
          physical = header ?? SDK ?? CDN ?? <code>&apos;US&apos;</code>.
        </li>
        <li>
          <strong>Two region sources.</strong> Geo atom for app-wide behavior; Flex{" "}
          <code>model.metadata?.region</code> for payment-field validation. Don&apos;t mix them.
        </li>
        <li>
          <strong>Globalization service owns format + currency.</strong> Symbols fall back
          code → region → <code>&apos;$&apos;</code>; format rules by language:region.
        </li>
        <li>
          <strong>RTL is a document-level concern.</strong> <code>document.dir</code> is set from the
          service — use logical CSS properties, never left/right.
        </li>
        <li>
          <strong>Config over code.</strong> Prefer per-country config flags to hardcoded region
          branches; <code>DE</code> regulated cancel is the legal exception.
        </li>
        <li>
          <strong>SDK-off = US/en-US.</strong> Region bugs hide when the SDK is disabled locally.
        </li>
      </ul>
    </div>
  );
}
