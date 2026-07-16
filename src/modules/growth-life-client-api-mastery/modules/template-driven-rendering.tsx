import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fillFlowDiagram = String.raw`flowchart TD
  CFG["Template configuration<br/>(screenType, templateId, dataSetId, deviceName)"]
  FETCH["Fetch raw template JSON<br/>(local fixtures for local/ci/integration; S3 in deployed envs)"]
  VALIDATE["validateTemplate()<br/>raw template matches generic Template shape"]
  DATA["Service builds templateData<br/>{ data: { sections, metricsData } }"]
  EJS["fillTemplate() → fillEjsData()<br/>EJS injects values into holes"]
  OUT["Processed template<br/>{ data, metadata } → ctx.body"]

  CFG --> FETCH
  FETCH --> VALIDATE
  VALIDATE -->|valid raw template| EJS
  VALIDATE -->|malformed| ERR["MalformedTemplateError"]
  DATA --> EJS
  EJS --> OUT
  FETCH -->|site-config/S3 error| FALLBACK["loadFallbackForScreen()<br/>(if available for that screen)"]
  FALLBACK --> EJS`;

const contractDiagram = String.raw`flowchart LR
  subgraph tpl["Template repo (S3)"]
    T["flex-cancel-flow.json<br/>declares slots"]
  end
  subgraph api["This repo"]
    TYPE["CancelFlowData<br/>(TS contract type)"]
    SVC["cancelService builds<br/>a CancelFlowData"]
  end
  T -. must match .-> TYPE
  TYPE --> SVC
  SVC --> FILL["fillTemplate()"]
  T --> FILL
  FILL --> RESP["UI + analytics JSON"]`;

export const toc: TocItem[] = [
  { id: "mental-model", title: "The Mental Model: Holes and Fillers", level: 2 },
  { id: "why-ejs", title: "Why EJS, Why JSON", level: 2 },
  { id: "fill-flow", title: "The Fill Flow End-to-End", level: 2 },
  { id: "filltemplate", title: "fillTemplate and templateData", level: 2 },
  { id: "contract", title: "The Template Contract Type", level: 2 },
  { id: "config", title: "Template Configuration & Versioning", level: 3 },
  { id: "cypher", title: "Cypher Keys: Localization Without Hardcoding", level: 2 },
  { id: "cypher-pattern", title: "The Key + Dictionary Pattern", level: 3 },
  { id: "fallbacks", title: "Malformed Templates & Fallbacks", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Add a Field to a Screen", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TemplateDrivenRendering() {
  return (
    <div className="article-content">
      <p>
        We&apos;ve established that this service fills templates rather than rendering pixels. Now we
        go inside the fill. This module answers the questions every engineer eventually asks: what
        exactly is a template, how does data get injected, what guarantees that the data a service
        builds actually matches the template, and how does copy get localized without hardcoding
        strings? Master this and you can add or modify any screen with confidence.
      </p>

      <h2 id="mental-model">The Mental Model: Holes and Fillers</h2>
      <p>
        A template is a <strong>JSON document with holes</strong>. The holes are EJS expressions.
        The service&apos;s job is to compute a <code>templateData</code> object whose fields plug
        into those holes. Rendering is: take the template, take the data, run EJS, get a fully
        resolved JSON response. The template owns <em>structure</em>; the service owns{" "}
        <em>values</em>.
      </p>
      <p>
        This is the same separation you saw in module 1, now made concrete. The layout of the cancel
        screen — that there&apos;s a header, a primary CTA, a secondary link — is fixed in the
        template repo. Which copy, which price, which action those resolve to for <em>this</em>{" "}
        request is computed here and injected.
      </p>

      <h2 id="why-ejs">Why EJS, Why JSON</h2>
      <p>
        EJS (Embedded JavaScript templating) lets the template embed <code>&lt;%= value %&gt;</code>{" "}
        (escaped) and <code>&lt;%- JSON.stringify(obj) %&gt;</code> (raw) expressions. Because the
        output is JSON, whole sub-objects can be injected as serialized values. Two reasons this beats
        &quot;just build the JSON in code&quot;:
      </p>
      <ArticleTable
        caption="Why templates + EJS, instead of assembling the whole response in TypeScript."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Without templates</th>
              <th>With templates</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Change a layout</td>
              <td>Ship a code deploy</td>
              <td>Edit template repo → S3, no API deploy</td>
            </tr>
            <tr>
              <td>Who can change UI structure</td>
              <td>Only backend engineers</td>
              <td>Template owners, independently</td>
            </tr>
            <tr>
              <td>Versioning UI</td>
              <td>Coupled to API version</td>
              <td>Template configuration picks a version</td>
            </tr>
            <tr>
              <td>Service&apos;s job</td>
              <td>Build entire response tree</td>
              <td>Compute values for known slots</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="fill-flow">The Fill Flow End-to-End</h2>
      <MermaidDiagram
        chart={fillFlowDiagram}
        title="From template configuration to ctx.body"
        caption="The raw template is fetched and validated before rendering; then fillTemplate injects service data and returns the processed { data, metadata } response."
        minHeight={460}
      />
      <p>
        A subtlety from the real code worth flagging early: the template-config client selects its
        source from <code>HULU_ENV</code>. <code>local</code>, <code>ci</code>, and{" "}
        <code>integration</code> use <code>LocalCachedTemplateConfigClient</code> backed by{" "}
        <code>src/__fixtures__/templates/configuration</code>; deployed environments use the
        S3-backed <code>TemplateConfigClient</code>. Operationally, <code>npm run local</code> sets{" "}
        <code>HULU_ENV=local</code>, while <code>npm run dev</code> reaches staging-style backends and
        S3 template configuration. Unit tests pin <code>HULU_ENV=ci</code> so they do not depend on
        live S3.
      </p>

      <h2 id="filltemplate">fillTemplate and templateData</h2>
      <p>
        The rendering entrypoint lives in{" "}
        <code>src/domain/template/templateService.ts</code>. A service&apos;s final act is to call{" "}
        <code>fillTemplate</code> with the fetched <code>template</code> and a{" "}
        <code>templateData</code> payload. <code>fillTemplate</code> calls <code>fillEjsData</code> and
        returns only <code>data</code> and <code>metadata</code>; internal raw-template fields such as
        <code>flexData</code> are not returned. The payload conventionally nests the real content
        under a <code>data</code> key alongside analytics data such as <code>metricsData</code>.
      </p>
      <CodeBlock
        lang="typescript"
        filename="the tail of a screen service (shape)"
        code={`// 1. Fetch data + template in parallel.
const [offers, template, flag] = await Promise.all([
  getOffers(flexContext),
  getTemplate({ templateConfiguration }),
  getEnableX(flexContext),
]);

// 2. Build UI sections with element builders.
const cta = toInteractionElement({
  key: 'x',
  copy: toCopy({ text: 'cypher_key', dictionary: 'unified-commerce' }),
  // ...
});

// 3. Fill the template and return.
return fillTemplate({
  template,
  templateData: { data: { cta, metricsData } },
});`}
      />
      <p>
        Note the parallel fetch: template retrieval, data retrieval, and flag resolution all happen
        in one <code>Promise.all</code>. The template engine module also exposes a platform variant
        (<code>fillEjsData as fillEjsDataPlatform</code>) — a hook we&apos;ll revisit in the platform
        migration module, since migrating screens render through the platform pipeline.
      </p>

      <h2 id="contract">The Template Contract Type</h2>
      <p>
        Here is the main compile-time guarantee that keeps template and service in sync: screen
        responses are modeled with <strong>TypeScript contract types</strong> under{" "}
        <code>src/domain/models/screens/v1/</code> and <code>src/domain/models/screens/v2/</code>.
        Those types describe the processed template content a service intends to return. When a
        template gains a slot, you should update the corresponding contract type and service data so
        TypeScript can force the service to fill the new field instead of relying on an untyped blob.
      </p>
      <MermaidDiagram
        chart={contractDiagram}
        title="Template ↔ contract type ↔ service"
        caption="The contract type is the compile-time bridge: the template declares slots, the type mirrors them, the service is type-checked against it."
        minHeight={360}
      />
      <p>
        This is also why <code>CLAUDE.md</code> insists you run{" "}
        <code>npm run build:typeguards</code> after changing any interface in{" "}
        <code>elements/</code> or <code>domain/models/</code>. The generated guards and schemas are
        part of the repo&apos;s runtime/CI safety net; stale generated files break CI. Important nuance:
        <code>validateTemplate()</code> in <code>templateService.ts</code> validates the raw fetched
        object against the generic <code>Template</code> shape (<code>data</code> +{" "}
        <code>metadata</code>), while screen-specific TypeScript contracts keep service code honest
        at compile time.
      </p>

      <h3 id="config">Template Configuration &amp; Versioning</h3>
      <p>
        Which template (and which version) a screen uses is decided by a{" "}
        <strong>template configuration</strong>. A screen&apos;s <code>constants.ts</code> defines a{" "}
        <code>DEFAULT_TEMPLATE_CONFIGURATION</code> and a <code>CONFIGURATION_REQ</code>. This
        indirection is what lets the template repo ship a new layout version and have the API pick it
        up via configuration rather than a code change.
      </p>

      <h2 id="cypher">Cypher Keys: Localization Without Hardcoding</h2>
      <p>
        Copy is never a hardcoded English string in a response. Instead, the service emits a{" "}
        <strong>Cypher key</strong> plus the dictionary it belongs to; the actual localized text is
        resolved from Cypher (the localization backend). This is how one code path serves every
        language and region.
      </p>

      <h3 id="cypher-pattern">The Key + Dictionary Pattern</h3>
      <p>
        Copy is built with <code>toCopy()</code>, which takes a <code>text</code> (the Cypher key), a{" "}
        <code>dictionary</code>, and optional interpolation <code>variables</code>.
      </p>
      <CodeBlock
        lang="typescript"
        filename="building localized copy"
        code={`const copy = toCopy({
  text: 'cancel_landing_header',       // Cypher key, NOT the English words
  dictionary: 'unified-commerce',      // which dictionary owns the key
  variables: {                         // optional interpolation
    price: toCurrencyVariable(amount, currency),
    date: toDateVariable(isoDate, 'long'),
  },
});`}
      />
      <p>
        The response carries the key + dictionary + resolved variables; the client (or Cypher)
        resolves the human text for the request&apos;s locale. <code>CLAUDE.md</code> is explicit:
        for new screens use <strong>Pattern 1</strong> (a key plus a dictionary object), not flat
        key strings. Getting this wrong means a screen that only works in English — a bug that
        won&apos;t show up in your local testing but breaks every non-US region.
      </p>
      <ArticleTable
        caption="Copy variables you can inject into a Cypher-keyed string."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Helper</th>
              <th>Produces</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>toCurrencyVariable(amount, currency)</code></td><td>Localized currency</td></tr>
            <tr><td><code>toDateVariable(isoDate, format)</code></td><td>Localized date</td></tr>
            <tr><td><code>toCypherVariable(key, dictionary)</code></td><td>A nested Cypher-resolved string</td></tr>
            <tr><td><code>toStringVariable(&#123; text &#125;)</code></td><td>A literal string variable</td></tr>
            <tr><td><code>toLinkToVariable(&#123; copy, href &#125;)</code></td><td>An inline link</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="fallbacks">Malformed Templates &amp; Fallbacks</h2>
      <p>
        Templates come from outside the service, so they can be missing, empty, malformed, or
        temporarily unavailable. The real template service separates these cases. While fetching, it
        validates candidate raw templates with <code>validateTemplate(template, isTemplate)</code>;
        if a non-empty template has the wrong generic shape, it throws{" "}
        <code>MalformedTemplateError</code>. If site-config/S3 fetching itself errors, the service
        logs a warning and attempts <code>loadFallbackForScreen()</code>. If no requested template
        and no configured fallback can be found, <code>getTemplate()</code> throws a template-not-found
        internal error with the template configuration attached for debugging. This is defensive by
        design — external template problems should be diagnosable and, where a hardcoded fallback
        exists, degrade gracefully.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/domain/template/templateService.ts (excerpt)"
        code={`export const loadFallbackForScreen = async (
  screenType: FallbackScreens
): Promise<Template | undefined> => {
  const fallbackLocation = \`!domain/template/fallbacks/\${screenType}.json\`;
  try {
    const { default: fallback } = await import(fallbackLocation);
    return fallback;
  } catch (error) {
    throw new InternalServerError(ApplicationErrorCode.FallbackTemplateNotFound)
      .addLogObject({ fallbackLocation });
  }
};`}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does a template get turned into a response?'"
        intro="Show that you understand the structure/value split, the contract type, and localization — not just 'we use EJS'."
        steps={[
          "Frame it as holes + fillers: the template is JSON with EJS holes; the service computes a templateData object that plugs into them.",
          "Walk the flow: fetch and validate the raw template, build data in parallel where independent, then call fillTemplate to run EJS injection and return { data, metadata }.",
          "Explain the contract types in domain/models/screens that mirror processed screen content so TypeScript can force services to fill every slot you model.",
          "Cover localization: copy is a Cypher key + dictionary via toCopy(), never a hardcoded string, so one path serves all locales.",
          "Mention failure modes accurately: malformed raw templates raise MalformedTemplateError; fetch failures can use loadFallbackForScreen; missing templates become TemplateNotFound errors."
        ]}
      />

      <h2 id="challenge">Challenge: Add a Field to a Screen</h2>
      <InterviewChallenge
        title="Add a promo banner subtitle to the cancel screen"
        scenario={
          <>
            Product wants a new localized subtitle under the promo banner on the cancel screen,
            showing the promo price. The template team has already added a{" "}
            <code>promoSubtitle</code> slot to <code>flex-cancel-flow.json</code>. Walk through
            everything you must do in <em>this</em> repo to fill it correctly, and what would break
            if you skipped a step.
          </>
        }
        tasks={[
          "Explain how the contract type must change and why TypeScript will otherwise complain (or silently drop the field).",
          "Show how you'd build the subtitle copy so it's localized (Cypher key + dictionary + a currency variable), not hardcoded.",
          "Describe where in the service the value is assembled and how it reaches fillTemplate via templateData.",
          "Name the build step you must run after changing the contract type, and why CI fails without it.",
        ]}
        pitfalls={[
          "Hardcoding the English subtitle string instead of using a Cypher key + dictionary.",
          "Forgetting to add the field to the contract type, so the slot renders empty.",
          "Skipping npm run build:typeguards after the type change, breaking CI.",
          "Injecting a raw number for the price instead of toCurrencyVariable, losing localization/formatting.",
        ]}
        signal="A strong answer updates the contract type, builds localized copy with toCopy + toCurrencyVariable, wires it into templateData, and runs build:typeguards."
      />
      <SolutionReveal difficulty="medium">
        <p>
          First, add <code>promoSubtitle</code> to the screen&apos;s contract type under{" "}
          <code>src/domain/models/screens/v1/cancel/</code> so it mirrors the new template slot —
          otherwise the value you build is dropped and the slot renders empty. Build the copy with a
          Cypher key, not English:
        </p>
        <CodeBlock
          lang="typescript"
          code={`const promoSubtitle = toCopy({
  text: 'cancel_promo_subtitle',
  dictionary: 'unified-commerce',
  variables: { price: toCurrencyVariable(promoAmount, currency) },
});`}
        />
        <p>
          Assemble it in the cancel service alongside the other sections and pass it through{" "}
          <code>templateData: &#123; data: &#123; ..., promoSubtitle, metricsData &#125; &#125;</code>{" "}
          into <code>fillTemplate</code>. Then run <code>npm run build:typeguards</code> because the
          contract type changed — the generated guards validate the filled template at runtime and
          CI&apos;s <code>typeguards-check</code> fails if they&apos;re stale. Because this screen may
          be mid-migration, also check <code>migrationConfig.ts</code>: if it&apos;s{" "}
          <code>migrating</code>, the same change is needed on the platform side too.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Templates are JSON with EJS holes.</strong> The template owns structure; the
          service computes <code>templateData</code> to fill the holes.
        </li>
        <li>
          <strong><code>fillTemplate</code></strong> (in{" "}
          <code>domain/template/templateService.ts</code>) runs the EJS injection and returns only{" "}
          <code>{"{ data, metadata }"}</code>; independent data/template/flag fetches should happen
          in parallel in the service.
        </li>
        <li>
          <strong>A contract type mirrors each template</strong> so TypeScript forces the service to
          fill every slot; run <code>build:typeguards</code> after changing it.
        </li>
        <li>
          <strong>Template configuration picks the template + version</strong>, decoupling UI
          revisions from API deploys.
        </li>
        <li>
          <strong>Copy is Cypher keys, never hardcoded.</strong> Use{" "}
          <code>toCopy(&#123; text, dictionary, variables &#125;)</code> — Pattern 1 for new
          screens.
        </li>
        <li>
          <strong>Template failures have distinct paths:</strong> malformed raw templates raise{" "}
          <code>MalformedTemplateError</code>, fetch failures may use <code>loadFallbackForScreen()</code>,
          and missing templates surface as template-not-found internal errors.
        </li>
      </ul>
    </div>
  );
}
