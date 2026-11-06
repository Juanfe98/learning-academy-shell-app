import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const serviceDiagram = String.raw`flowchart TD
  IN["buildAccountDetailsScreen({ accountId, ledgerContext })"]

  IN --> P["Promise.all — 3 independent I/O"]
  P --> R1["getAccount → RawAccount"]
  P --> R2["getTransactions → RawTransaction[]"]
  P --> R3["loadTemplate(screen, surface) → Template"]

  R1 --> C["toDomainAccount"]
  R2 --> C2["transactions.map(toDomainTransaction)"]

  C --> BS["buildSlots(account, transactions, regionConfig)<br/>NO surface argument"]
  C2 --> BS

  BS --> SIX["6 slots, always:<br/>accountName · balance · balanceCaption<br/>transactionsHeading · transactions · compactSummary"]

  SIX --> F["fillTemplate(template, slots)"]
  R3 --> F
  F --> OUT["Screen"]

  style BS fill:#0f766e,color:#fff
  style SIX fill:#0f766e,color:#fff`;

const leakDiagram = String.raw`flowchart LR
  subgraph good["Surface knowledge lives in ONE layer"]
    S1["service builds all slots"] --> T1["template picks"] --> O1["output differs"]
  end

  subgraph bad["Surface knowledge smeared through logic"]
    S2["if (surface === 'tui') ..."] --> S3["if (surface === 'tui') ..."] --> S4["...70 more"]
    S4 --> O2["Flex: ~70 isPartnerESPN comparisons<br/>in SHARED services.<br/>Grepping the brand name finds<br/>the wrong files."]
  end

  style good fill:#064e3b,color:#fff
  style bad fill:#7f1d1d,color:#fff`;

const buildSlotsCode = `/**
 * Builds every slot this screen can offer, for every surface.
 *
 * Takes no surface argument, and that is load-bearing rather than incidental: under 002 the
 * service is surface-agnostic and the template layer decides what each surface receives. A
 * \`surface\` parameter reaching this function would mean the branching had leaked back into
 * business logic — the pattern that leaves Flex with ~70 \`isPartnerESPN\` comparisons spread
 * through its shared services.
 */
function buildSlots(
  domainAccount: DomainAccount,
  domainTransactions: DomainTransaction[],
  regionConfig: RegionConfig
): BuiltSlots {
  return {
    accountName: toTextElement({
      id: 'account-name',
      style: 'Headline/H1',
      text: '{name}',
      variables: { name: domainAccount.name },
    }),

    balance: toTextElement({
      id: 'balance',
      style: 'Display/Large',
      text: '{amount}',
      variables: { amount: formatMoney(domainAccount.balance, regionConfig.locale) },
    }),

    balanceCaption: toTextElement({
      id: 'balance-caption',
      style: 'Body/Small',
      text: 'Available balance',
    }),

    transactionsHeading: toTextElement({
      id: 'transactions-heading',
      style: 'Headline/H4',
      text: 'Recent activity',
    }),

    transactions: toListElement({
      id: 'transactions',
      rows: domainTransactions.map((transaction) =>
        toRowElement({
          // Derived from the transaction, never the array index — ids must survive reordering,
          // or analytics attribution and test selectors end up pointing at the wrong row.
          id: \`transaction-row-\${transaction.id}\`,
          label: '{merchant}',
          labelStyle: 'Body/Default',
          labelVariables: { merchant: transaction.merchant },
          value: '{amount}',
          valueStyle: 'Body/Default',
          valueVariables: { amount: formatMoney(transaction.amount, regionConfig.locale) },
        })
      ),
    }),

    compactSummary: toTextElement({
      id: 'compact-summary',
      style: 'Label/Caption',
      text: '{count} transactions · last 30 days',
      variables: { count: String(domainTransactions.length) },
    }),
  };
}`;

const buildersCode = `export function toCopy(args: {
  text: string;
  variables?: Record<string, string> | undefined;
}): Copy {
  return {
    type: 'copyText',
    text: args.text,
    variables: args.variables ?? {},
  };
}

export function toTextElement(args: {
  id: string;
  style: StyleToken;
  text: string;
  variables?: Record<string, string> | undefined;
}): TextElement {
  return {
    id: args.id,
    type: 'text',
    style: args.style,
    copy: toCopy({ text: args.text, variables: args.variables }),
  };
}`;

const formatMoneyCode = `/**
 * Minor units per major unit.
 *
 * Hardcoded to 100 for milestone 1, which is correct for COP, USD, EUR and most currencies —
 * but not universal. JPY has zero decimal places, KWD and BHD have three. When a second
 * currency shows up, this becomes a lookup rather than a constant.
 */
const MINOR_UNIT_FACTOR = 100;

export function formatMoney(money: Money, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountMinor / MINOR_UNIT_FACTOR);
}`;

const formatOutput = `423150000  COP  es-CO  →   $ 4.231.500
-18540000  COP  es-CO  →  -$ 185.400
  -295000  COP  es-CO  →  -$ 2.950
320000000  COP  es-CO  →   $ 3.200.000`;

const slotMapOutput = `{
  accountName:         TextElement  Headline/H1    "Bancolombia Ahorros"
  balance:             TextElement  Display/Large  "$ 4.231.500"
  balanceCaption:      TextElement  Body/Small     "Available balance"
  transactionsHeading: TextElement  Headline/H4    "Recent activity"
  transactions:        ListElement  5 rows
  compactSummary:      TextElement  Label/Caption  "5 transactions · last 30 days"
}

web template takes  → accountName, balance, balanceCaption, transactionsHeading, transactions
tui template takes  → balance, accountName, compactSummary, transactions`;

export const toc: TocItem[] = [
  { id: "job", title: "What the Service Is For", level: 2 },
  { id: "shape", title: "The Shape of the Function", level: 2 },
  { id: "buildslots", title: "buildSlots and the Rule It Enforces", level: 2 },
  { id: "why-no-surface", title: "Why No Surface Argument", level: 3 },
  { id: "regionconfig", title: "Why regionConfig Is Allowed Through", level: 3 },
  { id: "builders", title: "Element Builders", level: 2 },
  { id: "money", title: "Formatting Money", level: 2 },
  { id: "over-under", title: "Over- and Under-Building", level: 2 },
  { id: "summary-logic", title: "Where Business Logic Actually Lives", level: 2 },
  { id: "flex", title: "The Same Layer in Flex", level: 2 },
  { id: "challenge", title: "Challenge: Keep the Service Honest", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheServiceLayer() {
  return (
    <div className="article-content">
      <p>
        The service is where everything converges: fetching, converting, applying business rules, and
        turning domain objects into the elements a client will render. It is also where the
        architecture is most likely to quietly break, because it is the layer with the most reasons to
        take a shortcut.
      </p>

      <h2 id="job">What the Service Is For</h2>
      <p>
        Orchestration and business rules, and nothing else. It does not touch raw HTTP — the context
        handler already gave it an object. It does not know template file paths — the template layer
        handles that. It does not know which client is asking.
      </p>
      <MermaidDiagram
        chart={serviceDiagram}
        title="Inside the service"
        caption="Six slots are built on every request regardless of caller. The template decides which of them the client actually receives."
      />

      <h2 id="shape">The Shape of the Function</h2>
      <p>
        The public entry point takes an args object containing the account id and the{" "}
        <code>LedgerContext</code> — mirroring Flex, whose services are called as{" "}
        <code>buildMyScreen({"{ flexContext, params }"})</code>.
      </p>
      <p>
        Passing the whole context rather than individual values is deliberate. When a service later
        needs the feature set, or experiment assignments, or the tenant, it is already there — no new
        parameter threading through three call sites.
      </p>
      <p>
        Inside, <code>surface</code> is destructured once and used exactly once, in{" "}
        <code>loadTemplate</code>. That single usage is the whole surface-awareness of the service.
      </p>

      <h2 id="buildslots">buildSlots and the Rule It Enforces</h2>
      <CodeBlock
        code={buildSlotsCode}
        lang="typescript"
        filename="packages/sdui-server/src/services/accountDetailsService.ts"
      />
      <p>What it produces, on every request:</p>
      <CodeBlock code={slotMapOutput} lang="text" filename="the slot map, then what each template takes" />

      <h3 id="why-no-surface">Why No Surface Argument</h3>
      <p>
        This is the constraint most likely to erode, and the one worth defending hardest in review.
        The temptation is obvious: the terminal does not use <code>balanceCaption</code>, so why build
        it? Two lines of <code>if (surface === &apos;tui&apos;)</code> would &ldquo;optimise&rdquo; it
        away.
      </p>
      <MermaidDiagram
        chart={leakDiagram}
        title="What happens when surface knowledge leaks"
        caption="Flex's ~70 isPartnerESPN comparisons live in shared services — which is why grepping the brand name finds the wrong files."
      />
      <p>
        Three concrete consequences of allowing the leak:
      </p>
      <ol>
        <li>
          <strong>Adding a surface stops being free.</strong> Right now a fifth client needs one new
          template file and zero service changes. With branching, every conditional has to be revisited.
        </li>
        <li>
          <strong>Surface knowledge ends up in two places</strong> — the service and the template —
          which can disagree. A service that skips a slot the template references produces a silently
          incomplete screen.
        </li>
        <li>
          <strong>Debugging inverts.</strong> This is the lesson Flex teaches most expensively: with
          ~70 <code>isPartnerESPN</code>-style comparisons spread through <em>shared</em> services,
          &ldquo;grep the brand name&rdquo; is the wrong first move for a brand-specific bug, because
          the brand-named files are the OTT device screens, not the ones the web app uses.
        </li>
      </ol>
      <p>
        The cost of the rule is a few unused element objects per request. That is nothing. The cost of
        breaking it compounds forever.
      </p>

      <h3 id="regionconfig">Why regionConfig Is Allowed Through</h3>
      <p>
        <code>buildSlots</code> does take a third parameter — <code>regionConfig</code>. That is not
        an inconsistency, and the distinction is worth being precise about.
      </p>
      <ArticleTable caption="Surface vs region">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Surface</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Answers</td>
              <td>Who is asking?</td>
              <td>Where is the user, and in what currency?</td>
            </tr>
            <tr>
              <td>Changes</td>
              <td>
                Which slots are <em>delivered</em>
              </td>
              <td>
                What the <em>content</em> says
              </td>
            </tr>
            <tr>
              <td>Belongs in</td>
              <td>Template resolution</td>
              <td>Content construction</td>
            </tr>
            <tr>
              <td>Branching on it means</td>
              <td>The architecture leaked</td>
              <td>Correct behaviour</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        A Colombian user and a US user get the same slots in a different currency. A web user and a
        terminal user get different slots with the same content. Different axes entirely.
      </p>

      <h2 id="builders">Element Builders</h2>
      <p>
        Constructing elements by hand is noisy — six literal objects with repeated{" "}
        <code>type</code> and <code>copy</code> scaffolding. Flex solves this with factories living
        beside the types (<code>toLocalizedTextElement</code> in{" "}
        <code>elements/v1/types/textElement.ts</code>), and the same pattern applies here:
      </p>
      <CodeBlock
        code={buildersCode}
        lang="typescript"
        filename="packages/sdui-server/src/elements/v1/types/builders.ts"
      />
      <p>
        One TypeScript detail worth knowing, because it will catch you: the parameter is{" "}
        <code>variables?: Record&lt;string, string&gt; | undefined</code>, not just{" "}
        <code>variables?:</code>. The project has <code>exactOptionalPropertyTypes: true</code>, which
        distinguishes &ldquo;may be absent&rdquo; from &ldquo;may be explicitly undefined.&rdquo;
        Passing a possibly-undefined value into a plain optional property fails to compile. Stricter
        than most projects, and it catches real bugs.
      </p>

      <h2 id="money">Formatting Money</h2>
      <CodeBlock
        code={formatMoneyCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/common/localization/formatMoney.ts"
      />
      <p>Actual output against the real fixtures:</p>
      <CodeBlock code={formatOutput} lang="text" filename="verified" />
      <p>
        Two things to notice. <code>Intl</code> drops the decimals for COP in <code>es-CO</code>,
        because centavos are not used in practice in Colombia — the same code with USD would show
        cents. And the minor-unit factor is hardcoded to 100 with a comment naming the exceptions
        (JPY has zero decimals, KWD three), which is the honest way to ship a simplification: state
        its boundary rather than pretend it is universal.
      </p>

      <h2 id="over-under">Over- and Under-Building</h2>
      <p>
        Building all six slots means some are always discarded — <code>compactSummary</code> on web,{" "}
        <code>balanceCaption</code> and <code>transactionsHeading</code> on the terminal. That is
        intended, and <code>fillTemplate</code> drops them silently.
      </p>
      <p>
        The asymmetry is deliberate:
      </p>
      <ArticleTable caption="Two mismatches, treated differently">
        <table>
          <thead>
            <tr>
              <th>Situation</th>
              <th>Treatment</th>
              <th>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Built but not referenced</td>
              <td>Silently dropped</td>
              <td>The design working — each surface takes what it wants</td>
            </tr>
            <tr>
              <td>Referenced but not built</td>
              <td>Omitted, <strong>with a warning</strong></td>
              <td>
                Supports genuinely optional content, but a typo&rsquo;d slot name would otherwise fail
                silently
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        That second row is a deliberate guard against the defect class recorded in the ESPN research
        register — silent fallthrough leaving a user on the wrong screen with nothing in the logs.
      </p>

      <h2 id="summary-logic">Where Business Logic Actually Lives</h2>
      <p>
        <code>compactSummary</code> is the only slot in this screen with real computation —{" "}
        <code>&quot;5 transactions · last 30 days&quot;</code> requires counting. It belongs in the
        service and nowhere else.
      </p>
      <p>
        It could not live in the template: templates are inert JSON with no expressions, by decision
        005. It must not live in the client: that would make a client release necessary to change what
        a screen <em>says</em>, which is the boundary leak that invalidates the whole architecture.
      </p>
      <p>
        As the screens get richer — affordability checks, payoff projections, budget thresholds — all
        of it lands here. That is the layer that justifies the server being server-driven at all.
      </p>

      <h2 id="flex">The Same Layer in Flex</h2>
      <ArticleTable caption="Service-layer correspondence">
        <table>
          <thead>
            <tr>
              <th>This project</th>
              <th>Flex</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>buildAccountDetailsScreen({"{ accountId, ledgerContext }"})</code>
              </td>
              <td>
                <code>buildMyScreen({"{ flexContext, params }"})</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>toTextElement</code>, <code>toRowElement</code>
              </td>
              <td>
                <code>toLocalizedTextElement</code>, <code>toCopy</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>formatMoney(money, locale)</code>
              </td>
              <td>
                <code>domain/common/localization/</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>Promise.all</code> over 3 operations
              </td>
              <td>
                Same rule, stated in the repo: never sequential awaits for independent data
              </td>
            </tr>
            <tr>
              <td>Slot map keyed by name</td>
              <td>
                <code>data.content.{"{header, accountDetails, myServices, ...}"}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <InterviewChallenge
        title="Keep the service honest"
        scenario={
          <>
            Four pull requests touch <code>accountDetailsService.ts</code>. Approve, reject, or
            redirect each — and name the rule at stake.
          </>
        }
        tasks={[
          "PR 1 adds `if (surface !== 'web') return;` around balanceCaption to avoid building an element the terminal discards.",
          "PR 2 moves formatMoney into the web client so it can animate a count-up on the balance.",
          "PR 3 adds an `overdraftWarning` slot, built only when the projected balance goes negative.",
          "PR 4 replaces Promise.all with sequential awaits 'because the fake backend is synchronous anyway'.",
        ]}
        pitfalls={[
          "Approving PR 1 on performance grounds. The cost is a handful of small objects; the cost of the precedent is unbounded.",
          "Rejecting PR 3 for returning undefined — optional slots are explicitly supported by BuiltSlots.",
          "Treating PR 4 as harmless. It is correct today and a latency bug the day the backend becomes real.",
        ]}
        signal="Strong answers name the specific rule each PR touches, and notice that only one of the four is actually fine."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>PR 1 — reject.</strong> This is the 002 leak. It saves constructing one small object
          and costs the guarantee that adding a surface is free. It also puts surface knowledge in two
          places that can disagree. If element construction ever became genuinely expensive, the fix is
          laziness inside the builder, not a surface check.
        </p>
        <p>
          <strong>PR 2 — reject, but the motivation is legitimate.</strong> Moving formatting
          client-side lets the two renderers disagree about what the same number looks like, and puts
          locale in two codebases. The animation goal is real though: the honest solution is for the
          element to carry both the formatted string and the raw <code>Money</code>, which is a
          contract change worth logging rather than a quiet service edit.
        </p>
        <p>
          <strong>PR 3 — approve.</strong> Exactly right. Business rule in the service, conditional
          slot returning <code>undefined</code>, <code>fillTemplate</code> omits the key.{" "}
          <code>BuiltSlots</code> is typed{" "}
          <code>Record&lt;string, SlotContent | undefined&gt;</code> specifically for this. One
          caveat worth raising in review: per 001b it should be a <code>text</code> element rather
          than a new type, so no client can silently drop a financial warning.
        </p>
        <p>
          <strong>PR 4 — reject.</strong> Correct today, wrong the moment any of the three becomes a
          real network call — and by then the sequential version reads as normal and nobody notices.
          This is a habit rule, carried directly from Flex, and habit rules only work if they are kept
          when they do not yet matter.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The service orchestrates and applies business rules. It never touches HTTP and never learns
          which client is asking.
        </li>
        <li>
          <code>buildSlots</code> takes no surface. Building all slots always is what makes adding a
          client free.
        </li>
        <li>
          Region config <em>is</em> allowed through: surface changes which slots are delivered, region
          changes what the content says.
        </li>
        <li>
          Builders keep element construction readable, matching Flex&rsquo;s factories beside the
          types.
        </li>
        <li>
          Money is formatted here so both renderers agree by construction.
        </li>
        <li>
          Built-but-unused is silent; referenced-but-unbuilt is logged. Different mistakes deserve
          different noise.
        </li>
      </ul>
    </div>
  );
}
