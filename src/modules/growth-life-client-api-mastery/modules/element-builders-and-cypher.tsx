import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const elementTreeDiagram = String.raw`flowchart TD
  ELEM["InteractionElement"]
  ELEM --> KEY["key: string"]
  ELEM --> STYLE["style: primaryButton | ..."]
  ELEM --> COPY["copy: Copy<br/>(Cypher key + dictionary + variables)"]
  ELEM --> ACTION["action: ScreenAction"]
  ELEM --> METRICS["metricsData: MetricsData"]
  COPY --> VARS["variables:<br/>currency, date, link,<br/>cypher, string…"]`;

const copyResolutionDiagram = String.raw`flowchart LR
  SVC["Service builds<br/>toCopy({ text: 'key', dictionary })"]
  SVC --> RESP["Response carries<br/>key + dictionary + variables"]
  RESP --> CLIENT["Client / Cypher<br/>resolves for locale"]
  CLIENT --> TEXT["Localized text<br/>'¿Seguro que quieres cancelar?'"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why Builders Exist", level: 2 },
  { id: "interaction", title: "The InteractionElement", level: 2 },
  { id: "the-builders", title: "The Builder Toolbox", level: 2 },
  { id: "copy", title: "toCopy: The Localization Primitive", level: 2 },
  { id: "variables", title: "Copy Variables", level: 3 },
  { id: "cypher", title: "Cypher Keys & Dictionaries", level: 2 },
  { id: "pattern1", title: "Pattern 1 for New Screens", level: 3 },
  { id: "resolution", title: "How Copy Becomes Localized Text", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Build a Localized CTA", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ElementBuildersAndCypher() {
  return (
    <div className="article-content">
      <p>
        The UI sections a service produces are not free-form JSON — they are typed{" "}
        <strong>elements</strong> built through a small set of builder functions. These builders
        guarantee the shape the frontend expects, attach analytics, and — crucially — force copy to
        go through the Cypher localization system rather than being hardcoded. This module covers the
        element builders in <code>src/elements/v1/types/</code> and the Cypher key discipline that
        makes every screen work in every locale.
      </p>

      <h2 id="why">Why Builders Exist</h2>
      <p>
        A screen element has a lot of required structure: a key, a style, localized copy, an action,
        and an analytics payload. If services hand-built these objects, they&apos;d drift — a missing{" "}
        <code>metricsData</code> here, an inconsistent <code>style</code> there. The builders
        (<code>toInteractionElement</code>, <code>toCopy</code>, <code>toImageElement</code>, …) are
        typed factories: pass the meaningful parts, get a correctly-shaped element. TypeScript then
        enforces you supplied everything the contract needs.
      </p>

      <h2 id="interaction">The InteractionElement</h2>
      <p>
        The workhorse is the <code>InteractionElement</code> — any tappable/clickable thing (a button,
        a link-styled action). Here is the real type from{" "}
        <code>src/elements/v1/types/interaction/interactionElement.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/elements/v1/types/interaction/interactionElement.ts"
        code={`export type InteractionElement<T extends ScreenAction> = {
  metricsData: MetricsData;       // analytics are NOT optional
  adobeData?: AdobeData;
  type: 'interaction';
  key: string;                    // stable identifier
  style: InteractionElementStyle; // primaryButton | secondaryButton | ...
  copy: Copy;                     // Cypher-keyed, localized
  action: T;                      // what happens on tap
  metadata?: InteractionElementMetadata<T>;
  image?: ImageElement;
  imagePosition?: 'left' | 'right';
  interactionDetails?: RichTextElement;
};`}
      />
      <MermaidDiagram
        chart={elementTreeDiagram}
        title="The anatomy of an InteractionElement"
        caption="Copy is never a raw string — it's a Cypher key + dictionary + variables. Metrics are required, not an afterthought."
        minHeight={400}
      />
      <p>
        The generic <code>&lt;T extends ScreenAction&gt;</code> ties the element to a specific action
        type — a cancel button carries a cancel action, so the two can&apos;t be mismatched. Valid
        styles are a fixed union (<code>primaryButton</code>, <code>secondaryButton</code>,{" "}
        <code>textButton</code>, <code>destructiveButton</code>, plus payment-specific and MyDisney
        variants) — you can&apos;t invent a style string.
      </p>

      <h2 id="the-builders">The Builder Toolbox</h2>
      <ArticleTable
        caption="The element and copy builders you'll reach for, and where they come from."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Builder</th>
              <th>Produces</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>toInteractionElement()</code></td><td>Button / tappable action</td><td><code>!elements/v1/types</code></td></tr>
            <tr><td><code>toLocalizedTextElement()</code></td><td>Localized text block</td><td><code>!elements/v1/types</code></td></tr>
            <tr><td><code>toRichTextElement()</code></td><td>Rich text (links, emphasis)</td><td><code>!elements/v1/types</code></td></tr>
            <tr><td><code>toImageElement()</code></td><td>Image element</td><td><code>!elements/v1/types/imageElement/imageElement</code></td></tr>
            <tr><td><code>toCopy()</code></td><td>Localized copy (Cypher key + dictionary)</td><td><code>!elements/v1/types</code></td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="copy">toCopy: The Localization Primitive</h2>
      <p>
        Every piece of text on a screen is a <code>Copy</code> object, produced by{" "}
        <code>toCopy()</code>. The real type shows the two modes: a <code>cypher</code> copy (has a
        dictionary, resolves via Cypher) and a <code>copyText</code> copy (a literal). New screens
        should use the Cypher mode.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/elements/v1/types/copy.ts"
        code={`export type Copy = {
  type: CopyType;                       // 'copyText' | 'cypher'
  dictionary?: string;                  // which Cypher dictionary
  text: string;                         // the Cypher KEY (not the words)
  describedBy?: string;
  variables: Record<string, CopyVariable>;
  metadata?: CopyMetadata;              // e.g. promo overlay variant
};

// Built via:
toCopy({ dictionary, text, describedBy, variables });`}
      />

      <h3 id="variables">Copy Variables</h3>
      <p>
        Copy often needs interpolated values — a price, a date, a link. These are not string-concatted
        (that would break localization and formatting); they&apos;re typed <code>CopyVariable</code>s
        built by dedicated helpers, so the client formats them per locale.
      </p>
      <ArticleTable
        caption="Copy variable builders — inject typed values, not concatenated strings."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Helper</th><th>Produces</th></tr>
          </thead>
          <tbody>
            <tr><td><code>toCurrencyVariable(amount, currency)</code></td><td>Locale-formatted currency</td></tr>
            <tr><td><code>toDateVariable(isoDate, format)</code></td><td>Locale-formatted date</td></tr>
            <tr><td><code>toTimeVariable(isoDate, format)</code></td><td>Locale-formatted time</td></tr>
            <tr><td><code>toCypherVariable(key, dictionary)</code></td><td>A nested Cypher-resolved string</td></tr>
            <tr><td><code>toStringVariable(&#123; text &#125;)</code></td><td>A literal string variable</td></tr>
            <tr><td><code>toNumberVariable(&#123; number &#125;)</code></td><td>A numeric variable</td></tr>
            <tr><td><code>toLinkToVariable(&#123; copy, href &#125;)</code></td><td>An inline link</td></tr>
            <tr><td><code>toTriggerModalVariable(&#123; copy, body, header &#125;)</code></td><td>A modal-triggering link</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="cypher">Cypher Keys &amp; Dictionaries</h2>
      <p>
        Cypher is the localization backend. A <strong>Cypher key</strong> names a piece of copy; a{" "}
        <strong>dictionary</strong> groups related keys (e.g. <code>unified-commerce</code>,{" "}
        <code>FLEX_CYPHER_ONBOARDING_DICTIONARY</code>, <code>OFFERS_CYPHER_DICTIONARY</code>). The
        service emits the key + dictionary; the actual localized string is resolved downstream. This
        is why a single code path serves every language — the words never live in the service.
      </p>
      <p>
        Many keys are centralized and typed. The repo declares key unions and maps in{" "}
        <code>src/domain/models/cypher/cypherKeys.ts</code> (e.g. <code>GlobalKeys</code> listing{" "}
        <code>offerCadenceMonth</code>, <code>disclaimerTerms</code>, and many more). Important
        nuance: <code>toCopy()</code> itself accepts <code>text: string</code>, so a bare inline
        string is not automatically type-checked. You get typo safety by using the typed key maps and
        helper functions instead of scattering literal keys through services.
      </p>

      <h3 id="pattern1">Pattern 1 for New Screens</h3>
      <p>
        <code>CLAUDE.md</code> mandates <strong>Pattern 1</strong> for new screens: model copy as a
        key plus its dictionary, not as flat, global, or English-like strings. Concretely, pass both{" "}
        <code>text</code> (the Cypher key value) and <code>dictionary</code> to <code>toCopy()</code>,
        and prefer typed key/dictionary constants or helper functions. This keeps keys discoverable,
        reviewable, and dictionary-scoped.
      </p>

      <h2 id="resolution">How Copy Becomes Localized Text</h2>
      <MermaidDiagram
        chart={copyResolutionDiagram}
        title="Copy resolution: key → localized text"
        caption="The service commits only to a key + dictionary + variables. Locale resolution happens downstream — so English is never baked in."
        minHeight={320}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How is UI copy handled so it works in every locale?'"
        intro="Show that copy is a Cypher key + dictionary through toCopy, never a hardcoded string, with typed keys."
        steps={[
          "Explain that services build typed elements via builders (toInteractionElement, toCopy…), not raw JSON.",
          "Describe Copy as a Cypher key + dictionary + variables — the words are resolved downstream, not in the service.",
          "Cover variables: prices/dates/links are typed CopyVariables (toCurrencyVariable, toDateVariable…) so the client formats per locale.",
          "Note that cypherKeys.ts provides typed key maps/helpers for many shared keys; use those plus Pattern 1 (key + dictionary) for new screens instead of untyped literal strings.",
          "Close with the payoff: one code path serves all locales because localization is data, not branching.",
        ]}
      />

      <h2 id="challenge">Challenge: Build a Localized CTA</h2>
      <InterviewChallenge
        title="A 'renew for $X/mo' primary button"
        scenario={
          <>
            You need a primary button whose label reads &quot;Renew for $9.99/mo&quot; in the US and
            the correct localized/formatted equivalent elsewhere. Build the element correctly and
            explain why each choice preserves localization. Then explain what breaks if a teammate
            interpolates the price straight into the text string (a hardcoded{" "}
            <code>{"`Renew for $${price}/mo`"}</code>) instead.
          </>
        }
        tasks={[
          "Build the InteractionElement with the right style, a Cypher-keyed copy, and a currency variable.",
          "Explain why the price must be a toCurrencyVariable and not string-interpolated.",
          "State which dictionary/key strategy you'd use and why (Pattern 1).",
          "Describe what the hardcoded-template-literal version breaks across locales.",
        ]}
        pitfalls={[
          "Interpolating the price into the text string, freezing currency format and killing translation.",
          "Passing a bare key string with no dictionary.",
          "Forgetting metricsData on the element (it's required).",
        ]}
        signal="A strong answer uses toInteractionElement + toCopy with a Cypher key + dictionary and a toCurrencyVariable, and explains the interpolation anti-pattern."
      />
      <SolutionReveal difficulty="medium">
        <CodeBlock
          lang="typescript"
          code={`const renewCta = toInteractionElement({
  key: 'renew-cta',
  style: 'primaryButton',
  copy: toCopy({
    text: 'renewForPriceCta',        // Cypher KEY, not the words
    dictionary: 'unified-commerce',  // Pattern 1: key + dictionary
    variables: {
      price: toCurrencyVariable(9.99, 'USD'),  // typed, locale-formatted
    },
  }),
  action: /* toRenewAction(...) */,
  metricsData: buildRenewInteractionMetrics(),  // required
});`}
        />
        <p>
          The template string for <code>renewForPriceCta</code> lives in Cypher as{" "}
          <code>&quot;Renew for &#123;price&#125;/mo&quot;</code> (and its translations). The price is
          a <code>toCurrencyVariable</code> so the client renders <code>$9.99</code>,{" "}
          <code>9,99&nbsp;€</code>, etc. per locale. If you instead write{" "}
          <code>text: \`Renew for $&#36;&#123;price&#125;/mo\`</code>, you&apos;ve baked in English,
          the dollar sign, and US number formatting — the string is no longer a key, so Cypher
          can&apos;t translate it, and every non-US locale shows the wrong thing. That&apos;s exactly
          the class of bug the key + variable discipline prevents.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Elements are built by typed factories</strong> (<code>toInteractionElement</code>,{" "}
          <code>toCopy</code>, …), not hand-rolled JSON.
        </li>
        <li>
          <strong><code>InteractionElement</code></strong> requires key, style (fixed union), copy,
          action, and <code>metricsData</code> — analytics aren&apos;t optional.
        </li>
        <li>
          <strong>Copy is a Cypher key + dictionary + variables</strong>, never hardcoded words —
          resolved to localized text downstream.
        </li>
        <li>
          <strong>Interpolated values are typed <code>CopyVariable</code>s</strong>{" "}
          (<code>toCurrencyVariable</code>, <code>toDateVariable</code>…), never string concatenation.
        </li>
        <li>
          <strong>Prefer typed key maps/helpers</strong> from <code>cypherKeys.ts</code>; use{" "}
          <strong>Pattern 1</strong> (key + dictionary) for new screens.
        </li>
      </ul>
    </div>
  );
}
