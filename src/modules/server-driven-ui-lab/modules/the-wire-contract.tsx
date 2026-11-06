import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const vocabularyDiagram = String.raw`flowchart TD
  Q["Server needs to describe a piece of text.<br/>What does it say about it?"]

  Q --> SEM["Semantic role<br/>'this is the account name'"]
  Q --> TOK["Presentational token<br/>'this is Headline/H1'"]
  Q --> RAW["Raw styling<br/>'font-size: 32px'"]

  SEM --> S1["Client decides appearance per surface"]
  SEM --> S2["Vocabulary is UNBOUNDED —<br/>every product concept is a new role"]

  TOK --> T1["Design system decides appearance globally"]
  TOK --> T2["Vocabulary is BOUNDED —<br/>type ramps converge (~20-30) and stop"]

  RAW --> R1["Meaningless on a surface<br/>with no font sizes"]

  style TOK fill:#0f766e,color:#fff
  style RAW fill:#7f1d1d,color:#fff`;

const copyDiagram = String.raw`flowchart LR
  A["Domain value<br/>Money { amountMinor: 423150000, currency: 'COP' }"]
  B["formatMoney(money, locale)<br/>SERVER SIDE"]
  C["'$ 4.231.500'"]
  D["Copy<br/>{ text: '{amount}',<br/>variables: { amount: '$ 4.231.500' } }"]
  E["Client substitutes.<br/>Never formats. Never concatenates."]

  A --> B --> C --> D --> E
  style B fill:#0f766e,color:#fff
  style E fill:#7c3aed,color:#fff`;

const elementsCode = `export type Copy = {
  type: 'copyText';
  /** May contain \`{name}\`-style placeholders resolved from \`variables\`. */
  text: string;
  variables: Record<string, string>;
};

export const STYLE_TOKENS = [
  'Display/Large',
  'Headline/H1',
  'Headline/H4',
  'Body/Default',
  'Body/Small',
  'Label/Caption',
] as const;

export type StyleToken = (typeof STYLE_TOKENS)[number];

/** Fields carried by every element regardless of type. */
type ElementBase = {
  id: string;
};

export type TextElement = ElementBase & {
  type: 'text';
  style: StyleToken;
  copy: Copy;
};

export type RowElement = ElementBase & {
  type: 'row';
  label: Copy;
  labelStyle: StyleToken;
  value: Copy;
  valueStyle: StyleToken;
};

export type ListElement = ElementBase & {
  type: 'list';
  rows: RowElement[];
};

export type Element = TextElement | RowElement | ListElement;`;

const screenCode = `export type SlotContent = Element | Element[];

export type Screen = {
  screen: string;
  /** \`{screen}:{surface}:{variant}\` — identifies which template produced this. */
  templateId: string;
  content: Record<string, SlotContent>;
  analytics: ScreenAnalytics;
};`;

const wireExample = `{
  "screen": "account-detail",
  "templateId": "account-detail:tui:default",
  "content": {
    "balance": {
      "id": "balance",
      "type": "text",
      "style": "Display/Large",
      "copy": {
        "type": "copyText",
        "text": "{amount}",
        "variables": { "amount": "$ 4.231.500" }
      }
    },
    "compactSummary": {
      "id": "compact-summary",
      "type": "text",
      "style": "Label/Caption",
      "copy": {
        "type": "copyText",
        "text": "{count} transactions · last 30 days",
        "variables": { "count": "5" }
      }
    }
  },
  "analytics": { "screenName": "account-detail", "surface": "tui" }
}`;

const flexCopyCode = `export type CopyType = 'copyText' | 'cypher';

export type Copy = {
  type: CopyType;
  dictionary?: string;
  text: string;
  describedBy?: string;
  variables: Record<string, CopyVariable>;
  metadata?: CopyMetadata;
};

// ...and inside replaceVariables():
const regex = new RegExp(\`(?<!{){\${searchValue}}(?!})\`, 'g');
// Ignore tokens with two curly braces (client-side replacement case)`;

export const toc: TocItem[] = [
  { id: "question", title: "The Question Every SDUI System Must Answer", level: 2 },
  { id: "vocabulary", title: "Three Vocabularies, One Choice", level: 2 },
  { id: "bounded", title: "The Argument That Decided It", level: 3 },
  { id: "elements", title: "The Element Types", level: 2 },
  { id: "row-flat", title: "Why RowElement Is Flat", level: 3 },
  { id: "copy", title: "Copy Is Never a String", level: 2 },
  { id: "money", title: "Where Money Gets Formatted", level: 3 },
  { id: "slots", title: "Named Slots, Not an Ordered Array", level: 2 },
  { id: "wire", title: "The Whole Thing on the Wire", level: 2 },
  { id: "flex", title: "What Flex Actually Does", level: 2 },
  { id: "ids", title: "Element IDs and Why They Must Be Stable", level: 2 },
  { id: "challenge", title: "Challenge: Extend the Vocabulary", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheWireContract() {
  return (
    <div className="article-content">
      <p>
        The contract is the heart of a server-driven UI system and the part most projects get wrong.
        It is also the most expensive thing to change: every template, every service, and both client
        registries encode it. Getting it wrong is not a refactor — it is rewriting all four at once.
      </p>

      <h2 id="question">The Question Every SDUI System Must Answer</h2>
      <p>
        The server has a piece of text — an account name. It has to describe that to a client which
        has never seen this screen. What, exactly, does it say about it?
      </p>
      <p>
        That single question determines the shape of everything downstream, and there are three
        genuinely different answers.
      </p>

      <h2 id="vocabulary">Three Vocabularies, One Choice</h2>
      <MermaidDiagram
        chart={vocabularyDiagram}
        title="What the server says about a piece of text"
        caption="Raw styling is meaningless on a surface with no font sizes. The real choice is between semantic roles and presentational tokens."
      />
      <ArticleTable caption="The three options and their costs">
        <table>
          <thead>
            <tr>
              <th>Vocabulary</th>
              <th>Example</th>
              <th>Who decides appearance</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Raw styling</td>
              <td>
                <code>font-size: 32px</code>
              </td>
              <td>The server, absolutely</td>
              <td>Meaningless on any non-CSS surface. Not viable.</td>
            </tr>
            <tr>
              <td>Semantic role</td>
              <td>
                <code>accountName</code>
              </td>
              <td>Each client, per surface</td>
              <td>Vocabulary grows without limit → unbounded client releases</td>
            </tr>
            <tr>
              <td>
                <strong>Presentational token</strong>
              </td>
              <td>
                <code>Headline/H1</code>
              </td>
              <td>The design system, globally</td>
              <td>Every client maintains a token map, forever</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        A useful anchor: this is the same argument the web had for twenty years. <code>&lt;h1&gt;</code>{" "}
        is semantic; <code>class=&quot;text-2xl&quot;</code> is a presentational token. Tailwind works
        across projects not because it is semantic but because its vocabulary is <em>shared and
        abstract</em>.
      </p>

      <h3 id="bounded">The Argument That Decided It</h3>
      <p>
        Decision 001a chose <strong>presentational tokens</strong>, and the reasoning is worth
        holding onto because it is not the obvious one:
      </p>
      <blockquote>
        A token vocabulary is <strong>bounded</strong>. A semantic vocabulary is{" "}
        <strong>unbounded</strong>.
      </blockquote>
      <p>
        Type styles converge at roughly twenty to thirty entries and then stop growing. Domain roles
        never stop: <code>accountName</code>, <code>projectedBalance</code>, <code>payoffDate</code>,{" "}
        <code>categoryTotal</code>, <code>overdraftWarning</code>, <code>interestAccrued</code> —
        every new product concept is a new role.
      </p>
      <p>
        And because clients must understand the vocabulary, <strong>an unbounded vocabulary means
        unbounded client deploys</strong>. Pure semantics quietly reintroduces the exact coupling SDUI
        exists to remove.
      </p>
      <p>
        The cost accepted in exchange: a token map per client, kept in sync forever, and a terminal
        renderer where <code>Body/Small</code> versus <code>Body/XSmall</code> is close to arbitrary.
        Which is why the token set starts at six and grows only when a screen genuinely cannot be
        expressed without a new one.
      </p>

      <h2 id="elements">The Element Types</h2>
      <CodeBlock
        code={elementsCode}
        lang="typescript"
        filename="packages/sdui-server/src/elements/v1/types/index.ts"
      />
      <p>
        Three element types, deliberately few. <code>text</code> for a run of styled copy,{" "}
        <code>row</code> for a label/value pair, <code>list</code> for an ordered group of rows. That
        is enough to build the entire account-detail screen.
      </p>

      <h3 id="row-flat">Why RowElement Is Flat</h3>
      <p>
        A tempting alternative was to nest: a row holding two <code>TextElement</code>s. It reads
        better. It was rejected because it makes the tree three levels deep —{" "}
        <code>list → row → text</code> — and a terminal renderer has to walk that recursively while
        laying out inside eighty columns.
      </p>
      <p>
        Instead the row carries copy and styles directly, and the tree stops at two levels. The
        verbosity is the price of a renderer that can be written without recursion. If the constraint
        were only a browser, nesting would be the better call — which is a decent illustration of how
        the second client shapes the contract.
      </p>

      <h2 id="copy">Copy Is Never a String</h2>
      <p>
        The single most-copied idea from Flex, and the one that looks like over-engineering until you
        need it:
      </p>
      <CodeBlock
        code={`copy: { type: 'copyText', text: '{amount}', variables: { amount: '$ 4.231.500' } }`}
        lang="typescript"
      />
      <p>Three reasons it is an object rather than a bare string:</p>
      <ol>
        <li>
          <strong>Translatability.</strong> If the client built <code>&apos;Welcome back, &apos; +
          name</code>, that sentence would break in every language whose word order differs, and it
          would no longer be a single dictionary entry. Passing{" "}
          <code>&quot;Welcome back, {"{name}"}&quot;</code> with the value named separately keeps the
          sentence whole.
        </li>
        <li>
          <strong>It is a growth path.</strong> Today <code>type</code> is always{" "}
          <code>&apos;copyText&apos;</code>. Flex has a second mode, <code>&apos;cypher&apos;</code>,
          for dictionary-backed copy the client resolves. Having the discriminant from day one means
          adding that later is additive rather than breaking.
        </li>
        <li>
          <strong>It separates the sentence from its values.</strong> Which matters most for money.
        </li>
      </ol>

      <h3 id="money">Where Money Gets Formatted</h3>
      <MermaidDiagram
        chart={copyDiagram}
        title="Formatting happens once, on the server"
        caption="The client receives a finished string in a named variable and never touches locale."
      />
      <p>
        This is decision 001a applied to a concrete case. Server-side formatting means both renderers
        agree by construction — a terminal and a browser cannot disagree about what the same number
        looks like, because neither one computed it.
      </p>
      <p>
        The cost is real: the terminal cannot shorten the string to fit a narrow column, and the web
        client cannot animate a count-up, because neither has the number. That trade was taken
        deliberately.
      </p>
      <p>
        A detail worth noticing in the output: <code>Intl.NumberFormat</code> renders{" "}
        <code>423150000</code> minor units as <code>&quot;$ 4.231.500&quot;</code> for{" "}
        <code>es-CO</code> — decimals dropped, because centavos are not used in practice in Colombia.
        The same code with USD would show cents. Locale knowledge lives in exactly one function.
      </p>

      <h2 id="slots">Named Slots, Not an Ordered Array</h2>
      <CodeBlock
        code={screenCode}
        lang="typescript"
        filename="packages/sdui-server/src/elements/v1/screen.ts"
      />
      <p>
        <code>content</code> is a <code>Record&lt;string, SlotContent&gt;</code>, not{" "}
        <code>Element[]</code>. There is no <code>order</code> field anywhere in the response.
      </p>
      <p>
        The first draft of this contract <em>was</em> an ordered array, and it was changed after
        reading real Flex templates, which expose{" "}
        <code>data.content.{"{header, accountDetails, subscriptionDetails, myServices}"}</code> —
        named slots. Two coherent designs:
      </p>
      <ArticleTable caption="Ordered array vs named slots">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Ordered array</th>
              <th>Named slots</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Who decides position</td>
              <td>Server, absolutely</td>
              <td>Client knows where a named slot belongs</td>
            </tr>
            <tr>
              <td>Client complexity</td>
              <td>Dumb — render in order</td>
              <td>Knows the screen&rsquo;s anatomy</td>
            </tr>
            <tr>
              <td>Adding a slot</td>
              <td>Free</td>
              <td>Needs client work</td>
            </tr>
            <tr>
              <td>Visual result</td>
              <td>A stacked list</td>
              <td>A properly laid out screen</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Named slots won for consistency: having already bet that clients know a rich token
        vocabulary, betting that they also know slot names is coherent. Mixing the two — dumb about
        layout, smart about styling — would have been the incoherent option.
      </p>

      <h2 id="wire">The Whole Thing on the Wire</h2>
      <CodeBlock code={wireExample} lang="json" filename="GET /screens/v1/account/detail (surface: tui)" />
      <p>
        Every decision so far is visible in that payload: tokens rather than roles, copy as an object
        with named variables, money already formatted, named slots, and a server-authored analytics
        block the client reports back rather than invents.
      </p>

      <h2 id="flex">What Flex Actually Does</h2>
      <p>
        Flex&rsquo;s <code>TextElement</code> lives at{" "}
        <code>src/elements/v1/types/textElement.ts</code> and its style type is not one union but a
        union of unions — <code>WebTypeRamp</code>, <code>MobileTypeRamp</code>,{" "}
        <code>LivingRoomTypeRamp</code>, <code>MyDisneyTypeRamp</code>, <code>UnifiedTypeRamp</code>,
        and <code>ESPNTypeRamp</code> (which is the single value <code>&apos;UNKNOWN&apos;</code>).
        Web has around thirty-three tokens; living room around thirty-five; they are not the same set.
      </p>
      <p>
        So Flex models surface capability <em>in the type system</em>. Six tokens here is a starting
        point, not a disagreement.
      </p>
      <p>Its <code>Copy</code> is richer, and two details are worth studying:</p>
      <CodeBlock
        code={flexCopyCode}
        lang="typescript"
        filename="growth-life-client-api/src/elements/v1/types/copy.ts"
      />
      <ul>
        <li>
          <code>describedBy</code> carries accessibility text — something this project has not yet
          modelled at all, and a genuine gap.
        </li>
        <li>
          <strong>Two interpolation passes.</strong> That regex deliberately skips{" "}
          <code>{"{{double}}"}</code> braces. Single braces are substituted by the server; double
          braces are left for the client. A more nuanced answer to &ldquo;who formats what&rdquo; than
          the one taken here.
        </li>
      </ul>
      <p>
        Flex also attaches <code>metricsData</code> to <em>individual elements</em>, not just the
        screen — which is what &ldquo;user tapped this specific button&rdquo; attribution actually
        requires.
      </p>

      <h2 id="ids">Element IDs and Why They Must Be Stable</h2>
      <p>
        Every element carries an <code>id</code>. Singletons use literals; rows derive from data:
      </p>
      <CodeBlock
        code={`id: \`transaction-row-\${transaction.id}\`,
// Derived from the transaction, never the array index — ids must survive
// reordering, or analytics attribution and test selectors end up pointing
// at the wrong row.`}
        lang="typescript"
      />
      <p>
        The rule is <strong>stability</strong>: the same element gets the same id across renders.
        Never an array index, never a counter. An index-based id silently re-points at a different
        transaction the moment sorting changes, and the resulting analytics are wrong in a way that
        looks perfectly plausible.
      </p>
      <p>
        There is a second reason, specific to server-driven UI: the id is the <em>only</em> thing a
        client can report about an element type it does not understand. That matters in the next
        module.
      </p>

      <InterviewChallenge
        title="Extend the vocabulary"
        scenario={
          <>
            Product wants an overdraft warning on the account screen: a short sentence, visually
            prominent, shown only when the projected balance goes negative before the next payday.
            You have to decide how it travels on the wire.
          </>
        }
        tasks={[
          "Decide whether this is a new element type or an existing one, and justify it against the bounded-vocabulary argument.",
          "Write the payload the server would emit, including copy and variables.",
          "Say what the terminal renderer does with it, given decision 001b drops unknown types.",
          "Explain how the choice in task 1 changes the answer to task 3.",
        ]}
        pitfalls={[
          "Reaching for a new element type reflexively. Every new type is a client release and a permanently wider vocabulary.",
          "Baking the date into the text string instead of passing it as a variable.",
          "Assuming visual prominence requires a new type — that is what style tokens are for.",
        ]}
        signal="The strong answer notices that expressing it as an existing type is not just simpler but strictly safer, and can explain exactly why."
      />

      <SolutionReveal difficulty="hard">
        <p>
          <strong>Use <code>text</code>, not a new type.</strong> A warning is a styled sentence. It
          needs prominence, which <code>Headline/H4</code> already provides, and colour — which is a
          token concern, not a type concern.
        </p>
        <CodeBlock
          code={`{
  "id": "overdraft-warning",
  "type": "text",
  "style": "Headline/H4",
  "copy": {
    "type": "copyText",
    "text": "Projected to overdraw by {amount} before {date}",
    "variables": { "amount": "$ 120.000", "date": "15 Sep" }
  }
}`}
          lang="json"
        />
        <p>
          <strong>Why this is safer, not just simpler:</strong> 001b drops unknown element types. A
          new <code>overdraftWarning</code> type would be silently discarded by every client
          compiled before it existed — and the user would never learn they are about to overdraw.
          Expressed as <code>text</code>, it cannot go missing, because every client has understood{" "}
          <code>text</code> since day one.
        </p>
        <p>
          That generalises into a standing rule recorded in decision 001b:{" "}
          <strong>content with real consequences is expressed using element types that existed in
          v1.</strong> New types are reserved for content whose absence is survivable. It recovers
          most of the benefit of a criticality flag without adding one.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Presentational tokens beat semantic roles here because a token vocabulary is bounded and a
          semantic one is not — and clients must know the vocabulary.
        </li>
        <li>
          Copy is an object with named variables so sentences stay whole and translatable, and so
          money can be formatted once, server-side.
        </li>
        <li>
          Content is named slots, not an ordered array. Slot names carry position.
        </li>
        <li>
          Rows are flat rather than nesting text elements, because a terminal renderer should not need
          recursion.
        </li>
        <li>
          Element ids must be derived from data, never from array position — and they are the only
          thing a client can report about a type it does not understand.
        </li>
      </ul>
    </div>
  );
}
