import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const boundaryDiagram = String.raw`flowchart LR
  subgraph backend["backends/ledger/ — what the backend sends"]
    RAW["RawAccount, RawTransaction<br/>snake_case<br/>amounts as STRINGS<br/>epoch millis"]
  end

  subgraph cross["domain/common/ledger/ — the ONLY crossing"]
    CONV["toDomainAccount()<br/>toDomainTransaction()<br/>pure functions"]
  end

  subgraph domain["domain/models/ — what the app reasons about"]
    DOM["DomainAccount, DomainTransaction<br/>camelCase<br/>Money { amountMinor, currency }<br/>ISO timestamps"]
  end

  subgraph wire["elements/v1/ — what the client receives"]
    EL["TextElement, RowElement, ListElement"]
  end

  RAW --> CONV --> DOM --> EL

  LINT["ESLint no-restricted-imports<br/>blocks Raw* anywhere else"]
  LINT -.enforces.-> CONV

  style CONV fill:#b45309,color:#fff
  style LINT fill:#7f1d1d,color:#fff`;

const threeShapesDiagram = String.raw`flowchart TD
  A["Raw* — the backend's shape<br/>you do not control it"]
  B["Domain* — what the app reasons about<br/>stable, yours"]
  C["Element* — what travels on the wire<br/>presentation vocabulary"]

  A -->|"conversion wrappers"| B
  B -->|"element builders"| C

  N["Collapsing B and C is the common mistake.<br/>Domain types are for reasoning.<br/>Element types are for rendering.<br/>They change for different reasons."]
  B -.-> N

  style A fill:#7c2d12,color:#fff
  style B fill:#0f766e,color:#fff
  style C fill:#7c3aed,color:#fff`;

const rawCode = `// RAW — messy, backend-shaped data. This is what arrives from outside the app domain
// and must never appear past domain/common/.

export type RawAccount = {
  account_id: string;
  display_name: string;
  balance_minor_units: string;
  currency_code: string;
  updated_at_epoch_ms: number;
};

export type RawTransaction = {
  txn_id: string;
  merchant_name: string;
  amount_minor_units: string;
  currency_code: string;
  posted_at_epoch_ms: number;
  category_code: string;
};`;

const domainCode = `/**
 * An amount of money, held as an integer in the currency's *minor units*.
 *
 * Minor units means centavos, cents, pence — never a decimal. { amountMinor: 423150000,
 * currency: 'COP' } is $42,315.00 COP, not 4.2 million. Floats are not an option here:
 * 0.1 + 0.2 !== 0.3, and in a ledger that is a real defect rather than a curiosity.
 *
 * The field is named amountMinor rather than amount so the unit is impossible to
 * misread at the call site.
 */
export type Money = {
  amountMinor: number;
  currency: string;
};

/** An ISO 8601 timestamp, e.g. 2026-09-02T14:31:00.000Z. */
export type IsoDateTime = string;

export type DomainAccount = {
  id: string;
  name: string;
  /** Collapsed from the backend's separate balance_minor_units and currency_code. */
  balance: Money;
  updatedAt: IsoDateTime;
};`;

const parsingCode = `/** Optionally-signed run of digits, and nothing else. */
const INTEGER_STRING = /^-?\\d+$/;

export function parseMinorUnits(value: string, field: string): number {
  if (!INTEGER_STRING.test(value)) {
    throw new LedgerConversionError(field, value, 'expected an integer string');
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new LedgerConversionError(field, value, 'outside the safe integer range');
  }

  return parsed;
}`;

const converterCode = `export function toDomainAccount(raw: RawAccount): DomainAccount {
  return {
    id: raw.account_id,
    name: raw.display_name,
    balance: {
      amountMinor: parseMinorUnits(raw.balance_minor_units, 'balance_minor_units'),
      currency: raw.currency_code,
    },
    updatedAt: toIsoDateTime(raw.updated_at_epoch_ms, 'updated_at_epoch_ms'),
  };
}`;

const lintCode = `// The conversion boundary, enforced rather than assumed.
//
// Allowed to import raw models:
//   packages/sdui-server/src/backends/**       — owns them
//   packages/sdui-server/src/domain/common/**  — converts them
// Everything else must go through a conversion wrapper.
{
  files: ['packages/sdui-server/src/**/*.ts'],
  ignores: [
    'packages/sdui-server/src/backends/**',
    'packages/sdui-server/src/domain/common/**',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/backends/**/models/raw*', '**/backends/**/raw*'],
        message:
          'Raw* types must not cross the conversion boundary. Import a Domain* model ' +
          'from domain/models/ instead, and convert in domain/common/.',
      }],
    }],
  },
}`;

const lintProof = `$ cat > packages/sdui-server/src/services/violation.ts <<'EOF'
import type { RawAccount } from '../backends/ledger/models/raw.js';
export function leak(a: RawAccount): string { return a.account_id; }
EOF

$ pnpm lint
  1:1  error  '../backends/ledger/models/raw.js' import is restricted from being used
              by a pattern. Raw* types must not cross the conversion boundary. Import a
              Domain* model from domain/models/ instead, and convert in domain/common/
              no-restricted-imports

✖ 1 problem (1 error, 0 warnings)`;

export const toc: TocItem[] = [
  { id: "why", title: "Why Two Type Systems Exist", level: 2 },
  { id: "three", title: "Three Shapes, Not Two", level: 2 },
  { id: "raw", title: "The Raw Types Are Deliberately Ugly", level: 2 },
  { id: "domain", title: "The Domain Types", level: 2 },
  { id: "money", title: "Money: Integer Minor Units, Named So You Cannot Misread It", level: 3 },
  { id: "parsing", title: "Validating at the Boundary", level: 2 },
  { id: "strictness", title: "Why Number() Is Not Good Enough", level: 3 },
  { id: "converters", title: "The Converters Themselves", level: 2 },
  { id: "enforced", title: "The Boundary Is Enforced, Not Trusted", level: 2 },
  { id: "asymmetry", title: "An Asymmetry Worth Arguing About", level: 2 },
  { id: "testing", title: "The Testing Rule This Explains", level: 2 },
  { id: "flex", title: "The Same Boundary in Flex", level: 2 },
  { id: "challenge", title: "Challenge: Absorb a Backend Change", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TheConversionBoundary() {
  return (
    <div className="article-content">
      <p>
        If you take one structural habit from this entire academy back to your day job, take this one.
        The conversion boundary is the highest-value pattern in the architecture, it is the cheapest
        to adopt, and it is the one Flex leans on hardest.
      </p>

      <h2 id="why">Why Two Type Systems Exist</h2>
      <p>
        Your app depends on a backend owned by someone else, free to evolve its schema on its own
        schedule. If your services consumed those shapes directly, every upstream rename, every new
        optional field, every reshuffle would ripple straight into your UI-building code. The domain
        would be at the mercy of the network.
      </p>
      <p>
        The fix is a classic anti-corruption layer: define your <em>own</em> stable domain types, and
        convert at exactly one place. Upstream churn is absorbed there and nowhere else.
      </p>
      <MermaidDiagram
        chart={boundaryDiagram}
        title="The conversion boundary"
        caption="Two directories may see a Raw* type. An ESLint rule stops everything else — the guarantee is checked, not trusted."
      />

      <h2 id="three">Three Shapes, Not Two</h2>
      <MermaidDiagram
        chart={threeShapesDiagram}
        title="Raw, Domain, Element"
        caption="Domain types are for reasoning; element types are for rendering. They change for different reasons, so they are different types."
      />
      <p>
        The common mistake is collapsing the last two — letting a domain object be the thing you send
        to the client. It works until you need the same domain value rendered two different ways, or a
        wire format that outlives a domain refactor. Keeping them separate costs one mapping function
        and buys the freedom to change either side alone.
      </p>

      <h2 id="raw">The Raw Types Are Deliberately Ugly</h2>
      <CodeBlock
        code={rawCode}
        lang="typescript"
        filename="packages/sdui-server/src/backends/ledger/models/raw.ts"
      />
      <p>
        Every awkward thing here is intentional: <code>snake_case</code> keys, amounts as strings,
        timestamps as epoch millis, a <code>category_code</code> with open-ended values.
      </p>
      <p>
        This matters pedagogically and practically. <strong>If the raw shape were already clean, the
        conversion layer would be a field-rename and would teach nothing.</strong> A boundary that
        does no work is a boundary nobody defends — and the first time a real backend arrives with
        real ugliness, the layer will not exist.
      </p>
      <p>
        Two more details in the fixtures worth noticing. Timestamps are <strong>literal
        constants</strong>, never <code>Date.now()</code> — fixtures that move with the clock make
        tests non-deterministic in ways that are miserable to debug. And one transaction carries{" "}
        <code>category_code: &apos;TELCO_POSTPAID&apos;</code>, deliberately outside any list you
        would naturally enumerate, so the open-vocabulary question has to be answered rather than
        dodged.
      </p>

      <h2 id="domain">The Domain Types</h2>
      <CodeBlock
        code={domainCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/models/"
      />
      <p>
        Look at what conversion actually has to <em>do</em> to get from one to the other: parse{" "}
        <code>&quot;423150000&quot;</code> into a number, pull two separate raw fields
        (<code>balance_minor_units</code> and <code>currency_code</code>) into one <code>Money</code>{" "}
        object, turn epoch millis into an ISO string, and rename everything.
      </p>
      <p>
        The two-fields-into-one collapse is the most instructive. An amount without its currency is
        not a quantity of money — keeping them adjacent-but-separate invites code that formats one
        without the other.
      </p>

      <h3 id="money">Money: Integer Minor Units, Named So You Cannot Misread It</h3>
      <p>
        The field is <code>amountMinor</code>, not <code>amount</code>. That naming is doing real
        work.
      </p>
      <p>
        <code>{`{ amount: 4231500, currency: 'COP' }`}</code> is ambiguous — 4,231,500 pesos, or
        42,315.00? The type cannot tell you, and someone will eventually write{" "}
        <code>amount: 4231.50</code> and it will typecheck perfectly. In a ledger that is a defect,
        not a curiosity, and <code>0.1 + 0.2 !== 0.3</code> is why floats are not an option at all.
      </p>

      <h2 id="parsing">Validating at the Boundary</h2>
      <p>
        A stance had to be taken: does conversion validate, or trust the backend?
      </p>
      <p>
        <strong>It validates.</strong> This is the only place raw data enters the app, so an error
        here can name the field and the offending value. The alternative is a <code>NaN</code>{" "}
        surfacing three layers up as literally &ldquo;NaN&rdquo; on a balance, with nothing pointing
        at where it came from.
      </p>
      <CodeBlock
        code={parsingCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/common/ledger/parsing.ts"
      />

      <h3 id="strictness">Why Number() Is Not Good Enough</h3>
      <ArticleTable caption="What the naive parsers accept">
        <table>
          <thead>
            <tr>
              <th>Input</th>
              <th>
                <code>Number(x)</code>
              </th>
              <th>
                <code>parseInt(x)</code>
              </th>
              <th>Strict regex</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>&quot;4231500&quot;</code>
              </td>
              <td>4231500 ✓</td>
              <td>4231500 ✓</td>
              <td>4231500 ✓</td>
            </tr>
            <tr>
              <td>
                <code>&quot;1e5&quot;</code>
              </td>
              <td>100000 — silently</td>
              <td>1</td>
              <td>throws</td>
            </tr>
            <tr>
              <td>
                <code>&quot; 12 &quot;</code>
              </td>
              <td>12 — silently</td>
              <td>12</td>
              <td>throws</td>
            </tr>
            <tr>
              <td>
                <code>&quot;0x10&quot;</code>
              </td>
              <td>16 — silently</td>
              <td>0</td>
              <td>throws</td>
            </tr>
            <tr>
              <td>
                <code>&quot;&quot;</code>
              </td>
              <td>
                <strong>0</strong> — silently
              </td>
              <td>NaN</td>
              <td>throws</td>
            </tr>
            <tr>
              <td>
                <code>&quot;12abc&quot;</code>
              </td>
              <td>NaN</td>
              <td>
                <strong>12</strong> — discards the rest
              </td>
              <td>throws</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note the two genuinely dangerous rows. An empty string becomes a{" "}
        <strong>balance of zero</strong> under <code>Number()</code>. And{" "}
        <code>parseInt(&quot;12abc&quot;)</code> returns <code>12</code>, throwing away the rest
        without complaint. For money, both are worse than an exception.
      </p>

      <h2 id="converters">The Converters Themselves</h2>
      <CodeBlock
        code={converterCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/common/ledger/accountConverter.ts"
      />
      <p>
        Pure functions. No fetching, no context, no I/O. That purity is what makes them trivially
        testable, and it is also why <code>transactions.map(toDomainTransaction)</code> works cleanly
        — a converter that took an array would give you two shapes to test instead of one.
      </p>

      <h2 id="enforced">The Boundary Is Enforced, Not Trusted</h2>
      <p>
        &ldquo;No <code>Raw*</code> past <code>domain/common/</code>&rdquo; is a convention until
        something checks it. Here a linter does:
      </p>
      <CodeBlock code={lintCode} lang="javascript" filename="eslint.config.mjs" />
      <p>Verified by deliberately breaking it:</p>
      <CodeBlock code={lintProof} lang="bash" filename="terminal" />
      <p>
        This is the difference between an architecture diagram and an architecture. A rule nobody
        checks is a rule that erodes on the first busy afternoon.
      </p>

      <h2 id="asymmetry">An Asymmetry Worth Arguing About</h2>
      <p>
        Notice a tension between two decisions in this codebase:
      </p>
      <ArticleTable caption="Two boundaries, two failure philosophies">
        <table>
          <thead>
            <tr>
              <th>Boundary</th>
              <th>On unexpected input</th>
              <th>Consequence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Client contract (001b)</td>
              <td>Drop and log</td>
              <td>One bad element does not kill the screen</td>
            </tr>
            <tr>
              <td>Backend conversion</td>
              <td>
                <strong>Throw</strong>
              </td>
              <td>One malformed row kills the whole screen, balance included</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Are those consistent? There is a genuine argument they should not be: skip the bad
        transaction, log it, render the other four.
      </p>
      <p>
        And a genuine argument they should differ. The client boundary is crossed by software you
        cannot update, where permanent content loss is the alternative. The backend boundary is
        crossed by data you control, where a malformed row means something is actually broken and
        hiding it is worse than failing.
      </p>
      <p>
        The project chose to throw. This is flagged in the decision log as an open question rather
        than a settled one — which is the honest state.
      </p>

      <h2 id="testing">The Testing Rule This Explains</h2>
      <p>Flex&rsquo;s own repo rules include this line, which is worth translating:</p>
      <blockquote>
        Mock GLO client, not conversion wrappers. <code>getOffers()</code> and{" "}
        <code>getAgreementDetails()</code> should run real code in tests — mock{" "}
        <code>GrowthLifeOrchestratorClient.retrieveOffersV2()</code> instead.
      </blockquote>
      <p>
        Translated here: <strong>mock <code>ledgerClient</code>, let <code>toDomainAccount</code> run
        for real.</strong>
      </p>
      <p>
        The reason is that the converter is precisely where mapping bugs live. Mock it, and you have
        replaced the only code that could be wrong with a hand-written object that is right by
        construction. The test passes and proves nothing. That rule is not a style preference — it is
        protecting this exact layer.
      </p>

      <h2 id="flex">The Same Boundary in Flex</h2>
      <ArticleTable caption="Directory-for-directory">
        <table>
          <thead>
            <tr>
              <th>This project</th>
              <th>Flex</th>
              <th>Grouped by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>backends/ledger/</code>
              </td>
              <td>
                <code>backends/growthLifeOrchestrator/</code>, <code>backends/offersService/</code>,{" "}
                <code>backends/ipse/</code>
              </td>
              <td>The backend service</td>
            </tr>
            <tr>
              <td>
                <code>domain/common/ledger/</code>
              </td>
              <td>
                <code>domain/common/offers/</code>, <code>domain/common/agreements/</code>,{" "}
                <code>domain/common/payment/</code>
              </td>
              <td>The source of the data</td>
            </tr>
            <tr>
              <td>
                <code>domain/models/</code>
              </td>
              <td>
                <code>domain/models/entitlement.ts</code>, <code>featureSet.ts</code>,{" "}
                <code>flexAgreementDetails.ts</code>
              </td>
              <td>The domain concept</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note the pairing: <code>domain/common/offers</code> with <code>backends/offersService</code>,{" "}
        <code>domain/common/plasmaEntity</code> with <code>backends/plasmaClient</code>. Conversion
        directories track <em>where the data came from</em>; model directories track{" "}
        <em>what the thing is</em>. That is why the models here are <code>account.ts</code> and{" "}
        <code>transaction.ts</code> rather than a <code>ledger/</code> folder — &ldquo;ledger&rdquo;
        is the store, not a domain concept.
      </p>

      <InterviewChallenge
        title="Absorb a backend change"
        scenario={
          <>
            The ledger team ships a schema change with two weeks&rsquo; notice.{" "}
            <code>balance_minor_units</code> becomes an integer rather than a string,{" "}
            <code>display_name</code> is renamed to <code>account_label</code>, and a new{" "}
            <code>institution_code</code> field appears. Your app must keep working, and the domain
            must not move.
          </>
        }
        tasks={[
          "List every file that changes, and every file that must not.",
          "Say what happens to parseMinorUnits and why the strictness argument shifts.",
          "Decide what to do with institution_code, given nothing consumes it yet.",
          "Explain what would have happened without the boundary — name the specific files that would have needed edits.",
        ]}
        pitfalls={[
          "Adding institution_code to DomainAccount because it exists. Domain types model what the app reasons about, not what the backend happens to send.",
          "Assuming an integer needs no validation — a number can still be unsafe, fractional, or absurd.",
          "Forgetting that the element builders and templates reference domain field names, so a leaked rename reaches the wire.",
        ]}
        signal="A strong answer names the exact blast radius — two files — and can point at the linter as the thing that guarantees it rather than hoping."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>Changes:</strong> <code>backends/ledger/models/raw.ts</code> (field types and
          names) and <code>domain/common/ledger/accountConverter.ts</code> (read{" "}
          <code>account_label</code>, drop the string parse). That is the entire blast radius.
        </p>
        <p>
          <strong>Must not change:</strong> <code>domain/models/Account.ts</code>, the service,
          element builders, templates, both clients. The domain is stable by construction, and the
          ESLint rule guarantees no fourth file was quietly reading <code>RawAccount</code>.
        </p>
        <p>
          <strong>parseMinorUnits:</strong> the string-format checks go away, but validation does
          not. A number can still be fractional, unsafe, or nonsense — <code>Number.isSafeInteger</code>{" "}
          still earns its place. The lesson: the boundary&rsquo;s job is not &ldquo;parse
          strings&rdquo;, it is &ldquo;refuse to admit values the domain cannot represent.&rdquo;
        </p>
        <p>
          <strong>institution_code:</strong> add it to <code>RawAccount</code>, and stop there. Domain
          types model what the app reasons about. Adding it to <code>DomainAccount</code>{" "}
          &ldquo;because it exists&rdquo; is how a domain slowly becomes a mirror of someone
          else&rsquo;s schema — which is the exact failure the boundary prevents.
        </p>
        <p>
          <strong>Without the boundary:</strong> the rename reaches every service reading{" "}
          <code>display_name</code>, every element builder using it, and — because element builders
          feed slot names — potentially the templates and both client registries. A one-field rename
          upstream becomes a change across four packages.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Two type systems exist so upstream schema churn is absorbed in one place instead of
          rippling through the app.
        </li>
        <li>
          There are three shapes, not two: <code>Raw*</code>, <code>Domain*</code>,{" "}
          <code>Element*</code>. Collapsing the last two is the common mistake.
        </li>
        <li>
          Keep raw fixtures deliberately ugly. A boundary that does no work teaches nothing and gets
          deleted.
        </li>
        <li>
          Validate at the boundary so errors name the field. <code>Number()</code> turns an empty
          string into a balance of zero.
        </li>
        <li>
          Money is integer minor units, and the field name says so.
        </li>
        <li>
          Enforce the boundary with a lint rule. A convention nobody checks erodes.
        </li>
        <li>
          Mock the client, never the converter — mocking the converter replaces the only code that
          could be wrong.
        </li>
      </ul>
    </div>
  );
}
