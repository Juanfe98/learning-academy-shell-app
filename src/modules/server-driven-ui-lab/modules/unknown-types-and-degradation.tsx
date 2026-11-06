import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const skewDiagram = String.raw`timeline
  title Version skew is the steady state, not an incident
  January : Mobile client v1 ships : registry knows text, row, button
  March : sparkline built : server sends it : web deploys, everyone current within a minute
  April : mobile v2 clears review : rollout begins
  April onward : some users update in a week : some in six months : some never
  Forever : server sends sparkline to clients that do not know it`;

const decisionDiagram = String.raw`flowchart TD
  A["Client receives { id, type: 'sparkline', ... }"]
  A --> B{"Is 'sparkline' in my registry?"}
  B -->|yes| C["render it"]
  B -->|no| D["The client is BLIND.<br/>It has an unrecognised string.<br/>It cannot know if this was<br/>decorative or a financial warning."]

  D --> E{"Who could know?"}
  E --> F["The server — it built the element"]

  F --> G1["Option A: inline fallback<br/>rich element carries a simpler self"]
  F --> G2["Option B: criticality flag<br/>'may this be dropped?'"]
  F --> G3["Option C (CHOSEN): neither.<br/>Drop + log, matching Flex"]

  style D fill:#7f1d1d,color:#fff
  style G3 fill:#0f766e,color:#fff`;

const sharedPackageDiagram = String.raw`flowchart TB
  subgraph shared["Shared package (REJECTED)"]
    SP["@sdui/contract<br/>Element union"]
    SS["server compiles against it"]
    SC["client compiles against it"]
    SP --> SS
    SP --> SC
    SX["Add 'sparkline' → every client's<br/>exhaustive switch FAILS TO BUILD<br/>until it implements it"]
  end

  subgraph dup["Duplicated per side (CHOSEN)"]
    DS["server: elements/v1/"]
    DW["web: own models"]
    DT["tui: own models — deliberately smaller"]
    WIRE["THE CONTRACT IS THE JSON"]
    DS --- WIRE
    WIRE --- DW
    WIRE --- DT
  end

  style SX fill:#7f1d1d,color:#fff
  style WIRE fill:#0f766e,color:#fff`;

const wireElementCode = `/**
 * An element as it actually arrives over the wire.
 *
 * \`type\` is a \`string\`, not \`ElementType\`, and this is the single most important
 * line in the contract. A client compiled today will receive element types
 * invented later; typing the client's input as \`Element\` asserts that cannot
 * happen, and TypeScript will then correctly conclude that the \`default:\` branch
 * of a registry is unreachable and let you delete the safety net 001b depends on.
 */
export type WireElement = {
  id: string;
  type: string;
  [key: string]: unknown;
};`;

const proofCode = `// 1. Open (wire) typing — default branch is REACHABLE and typed.
export function openDispatch(el: WireElement): string {
  if (isTextElement(el)) return \`text:\${el.copy.text}\`;
  if (isRowElement(el)) return \`row:\${el.label.text}\`;
  const unknownType: string = el.type;   // reachable, usable for the report
  return \`UNSUPPORTED:\${unknownType}\`;
}

// 2. Closed (union) typing — default branch is \`never\`, i.e. dead code.
export function closedDispatch(el: Element): string {
  switch (el.type) {
    case 'text': return 'text';
    case 'row':  return 'row';
    case 'list': return 'list';
    default: {
      const proof: never = el;  // compiles ONLY because TS believes
      return String(proof);      // this branch is unreachable
    }
  }
}`;

const flexRendererCode = `switch (element.type) {
  case 'text':            return <FlexText model={element} />;
  case 'richText':        return <FlexRichText model={element} />;
  case 'image':           return <FlexImage model={element} width={120} height={24} />;
  case 'interactionList': return <CancelCTAContainer model={element} onAction={onAction} />;
  default:                return null;      // ← unknown type. No telemetry.
}`;

const flexBillingCode = `default: {
  datadogRum.addError(new Error('BILLING DESCRIPTION – UNSUPPORTED_TYPE_FROM_FLEX'), {
    owner: Owners.TAP,
    errorCode: ERROR_CODES.UNSUPPORTED_TYPE_FROM_FLEX,
    screenType: 'sign-up-flow',
    templateId: 'subscription-preview',
    message: ERROR_MESSAGES.BILLING.UNSUPPORTED_TYPE_FROM_FLEX,
  });

  return null;
}`;

export const toc: TocItem[] = [
  { id: "problem", title: "The Problem, Stated Precisely", level: 2 },
  { id: "skew", title: "Version Skew Is Permanent, Not an Incident", level: 2 },
  { id: "blind", title: "Why the Client Cannot Decide Alone", level: 2 },
  { id: "options", title: "The Three Answers", level: 2 },
  { id: "decision", title: "What Was Chosen and What It Locks In", level: 3 },
  { id: "asymmetry", title: "Content Degrades, Interaction Escalates", level: 2 },
  { id: "types", title: "The Type-System Trap", level: 2 },
  { id: "proof", title: "Proving It Compiles Both Ways", level: 3 },
  { id: "ownership", title: "Why the Types Are Not Shared", level: 2 },
  { id: "flex", title: "What cgi-web Actually Does", level: 2 },
  { id: "challenge", title: "Challenge: Ship a New Element Type", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function UnknownTypesAndDegradation() {
  return (
    <div className="article-content">
      <p>
        This is the module most server-driven UI tutorials skip, and it is where the pattern either
        earns its keep or quietly becomes a coordinated-deploy system with extra JSON.
      </p>

      <h2 id="problem">The Problem, Stated Precisely</h2>
      <p>
        A client receives <code>{`{ "id": "spark-1", "type": "sparkline", "points": [...] }`}</code>.
        Its registry has no entry for <code>sparkline</code>. What should happen?
      </p>
      <p>
        The instinctive answer — &ldquo;that should not happen, we would add the type to the clients
        too&rdquo; — is correct for exactly one deployment model and wrong for every other.
      </p>

      <h2 id="skew">Version Skew Is Permanent, Not an Incident</h2>
      <MermaidDiagram
        chart={skewDiagram}
        title="The lifecycle of one new element type"
        caption="Nobody was careless. Every client you control was updated the same day. The old builds simply still exist."
      />
      <p>
        Walk it through concretely. You build a sparkline in March and update every client on the same
        day. Web deploys instantly — everyone is current on next page load. Mobile v2 clears app store
        review in April and rolls out over weeks. Some users update quickly, some in six months, some
        never.
      </p>
      <p>
        <strong>From March onward, permanently, the server is sending an element type to clients that
        do not know it.</strong> This is not a bug to be prevented. It is the steady state of any
        system with a client you cannot force-update.
      </p>
      <p>
        Flex lives with this at scale — Roku boxes running builds from years ago still hit its{" "}
        <code>/device-*</code> screens today. Web is the one surface where the window is measured in
        minutes, which is exactly why building only for web hides the hardest problem in the
        architecture.
      </p>

      <h2 id="blind">Why the Client Cannot Decide Alone</h2>
      <p>Two elements arrive at a terminal renderer that knows neither type:</p>
      <CodeBlock
        code={`{ "id": "spark-1", "type": "sparkline", "points": [ ... ] }
{ "id": "warn-1",  "type": "overdraftWarning", "copy": { ... } }`}
        lang="json"
      />
      <p>
        Dropping the first costs a decorative chart. Dropping the second means the user never learns
        they are about to overdraw — a real financial consequence.
      </p>
      <p>
        The client cannot tell them apart. Both are unrecognised strings. It is not missing
        cleverness; <strong>it is missing information that only exists on the other side</strong>.
        The server knows perfectly well which is decorative and which is a warning.
      </p>
      <MermaidDiagram
        chart={decisionDiagram}
        title="Who owns the outcome"
        caption="Whatever mechanism you choose must work for a client compiled before the element type existed — so it cannot require the client to recognise the type."
      />

      <h2 id="options">The Three Answers</h2>
      <ArticleTable caption="Mechanisms, and what each costs">
        <table>
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>How it works</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Inline fallback</strong>
              </td>
              <td>
                Rich element carries a simpler version of itself in v1 vocabulary. The client renders{" "}
                <code>fallback</code> when it does not know the type.
              </td>
              <td>Bigger payloads; the server must author every fallback</td>
            </tr>
            <tr>
              <td>
                <strong>Criticality flag</strong>
              </td>
              <td>
                Every element declares <code>critical: true | false</code>. The client reads a
                boolean without understanding the type.
              </td>
              <td>A field on every element, forever</td>
            </tr>
            <tr>
              <td>
                <strong>Drop and log</strong> (chosen)
              </td>
              <td>
                Unknown type → report to telemetry, render nothing. The rest of the screen survives.
              </td>
              <td>A stale client silently loses content until it updates</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The first two are worth understanding even though they were rejected, because HTML solved
        exactly this problem with both. A 2005 browser meeting <code>&lt;video&gt;</code> does not
        crash — unknown tags render their children, which is a criticality flag hardcoded to{" "}
        <em>safe to drop</em>, and <code>&lt;video&gt;</code> was designed to hold fallback content
        inside it.
      </p>

      <h3 id="decision">What Was Chosen and What It Locks In</h3>
      <p>
        Decision 001b chose <strong>drop and log</strong>, matching Flex. The contract carries{" "}
        <strong>no <code>fallback</code> field and no <code>critical</code> field</strong>.
      </p>
      <p>
        The irreversible part deserves emphasis: <strong>those fields cannot be added later.</strong>{" "}
        A client compiled in January will ignore a <code>fallback</code> field it was never taught to
        look for. Ship v1 without them and every client in the field is permanently unable to degrade
        gracefully. That is why this ran a full decision loop rather than being picked casually.
      </p>
      <p>
        And the mitigation that costs nothing — a policy rather than a mechanism:
      </p>
      <blockquote>
        Content with real consequences is expressed using element types that existed in v1.
      </blockquote>
      <p>
        An overdraft warning shipped as <code>text</code> cannot go missing, because every client has
        known <code>text</code> since the beginning. New element types are reserved for content whose
        absence is survivable.
      </p>

      <h2 id="asymmetry">Content Degrades, Interaction Escalates</h2>
      <p>
        Flex does encode a criticality distinction — just not per element. It encodes it in{" "}
        <em>what kind of thing failed</em>:
      </p>
      <ArticleTable caption="Two failure modes in cgi-web, verified in source">
        <table>
          <thead>
            <tr>
              <th>What is unrecognised</th>
              <th>What happens</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>An element type</td>
              <td>
                <code>return null</code> — dropped, screen survives
              </td>
              <td>Some content is missing; the page still works</td>
            </tr>
            <tr>
              <td>An action key or navigate location</td>
              <td>
                <code>UNRECOGNIZED_FLEX_ACTION_KEY</code> → RUM error <strong>plus an error
                boundary</strong>
              </td>
              <td>
                A button wired to nothing is worse than no button — the user clicks and nothing
                happens
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        That asymmetry is cruder than a per-element flag and needs no extra wire fields at all. It was
        adopted here deliberately.
      </p>

      <h2 id="types">The Type-System Trap</h2>
      <p>
        Here is where a well-intentioned TypeScript developer deletes the safety net without noticing.
      </p>
      <CodeBlock
        code={wireElementCode}
        lang="typescript"
        filename="the client's own models (not shared with the server)"
      />
      <p>
        If you type the client&rsquo;s input as the server&rsquo;s closed <code>Element</code> union,
        TypeScript concludes that a <code>default:</code> branch is unreachable. It will type the
        variable as <code>never</code> and, entirely reasonably, suggest the code is dead.
      </p>
      <p>
        <strong>It is not dead. The union is closed at compile time and open at runtime.</strong> The
        client must accept something wider and narrow into the union with guards.
      </p>

      <h3 id="proof">Proving It Compiles Both Ways</h3>
      <p>
        This was verified rather than assumed — both of these compile, and the second is the problem:
      </p>
      <CodeBlock code={proofCode} lang="typescript" filename="scratch/proof.ts (deleted after verification)" />
      <p>
        The <code>const proof: never = el</code> assignment succeeding is the compiler stating
        plainly that it believes the branch cannot be reached. Under <code>WireElement</code>,{" "}
        <code>el.type</code> is a live string you can put in a telemetry report.
      </p>
      <p>
        This is precisely what Flex&rsquo;s <code>npm run build:typeguards</code> exists for —
        generated runtime guards for <code>elements/</code> and <code>domain/models/</code>, mandatory
        after any type change.
      </p>

      <h2 id="ownership">Why the Types Are Not Shared</h2>
      <p>
        A monorepo makes a shared <code>@sdui/contract</code> package trivially easy. It was
        scaffolded, then deliberately removed — decision 009.
      </p>
      <MermaidDiagram
        chart={sharedPackageDiagram}
        title="Shared types assert something false"
        caption="A shared package claims both sides agree at the same moment in time. They deploy on different schedules, so they do not."
      />
      <p>
        The fair case for sharing is real: the compiler makes drift impossible. For a system deployed
        as one unit, share the types.
      </p>
      <p>
        Here it breaks, because the compiler does not merely prevent drift — <strong>it forces every
        client to be simultaneously current.</strong> Add <code>sparkline</code> to the union and every
        client&rsquo;s exhaustive switch fails to build until it handles the case. That leaves two
        exits: coordinated deploys (the coupling SDUI exists to remove), or suppressing the errors (at
        which point the shared package enforces nothing).
      </p>
      <p>
        It also makes the deliberate-breakage milestone impossible. pnpm links workspace packages by
        symlink, so both sides compile against the same file on disk. &ldquo;Server on v2, client on
        v1&rdquo; cannot be expressed without publishing real versions.
      </p>
      <p>
        The framing that resolves it: <strong>the wire format is the contract; the TypeScript is
        not.</strong> Each side&rsquo;s types are that party&rsquo;s local model of the JSON. You
        would not share a class between a service and a consumer across a network boundary, and this
        is the same boundary — the fact that both happen to live in one repo does not change the
        deployment topology. It is the same instinct as the <code>Raw*</code> →{" "}
        <code>Domain*</code> boundary, one level up.
      </p>
      <p>
        Cost accepted: real drift risk, with no compiler to catch it. The mitigation is contract tests
        — golden JSON fixtures both sides assert against — which catch drift without coupling builds.
      </p>

      <h2 id="flex">What cgi-web Actually Does</h2>
      <p>
        The generic dispatcher, at{" "}
        <code>packages/cgi/commerce-base/src/retention/cancel/components/flex/options-section/flex-content-renderer.tsx</code>:
      </p>
      <CodeBlock code={flexRendererCode} lang="tsx" filename="cgi-web — flex-content-renderer.tsx" />
      <p>
        <code>default: return null</code>. No fallback in the payload, no criticality flag, and in
        this particular renderer, no telemetry either.
      </p>
      <p>
        Elsewhere the same pattern gets a safety net —{" "}
        <code>signup/billing/billing-description.tsx</code>:
      </p>
      <CodeBlock code={flexBillingCode} lang="tsx" filename="cgi-web — billing-description.tsx" />
      <p>
        So the real policy is <strong>drop and log, applied inconsistently</strong>. Some renderers
        report to Datadog RUM; the generic one does not.{" "}
        <code>UNSUPPORTED_TYPE_FROM_FLEX</code> is one of 73 members of <code>ERROR_CODES</code>.
      </p>
      <p>
        <strong>The one thing not to copy.</strong> This project routes every <code>default:</code>{" "}
        branch through a single shared helper so it cannot diverge. That is drift in cgi-web, not
        design — and the generic renderer is the one you would most want instrumented.
      </p>
      <p>
        One honest caveat: the code above is the <em>web</em> client, where version skew is roughly
        zero. Drop-and-log costs almost nothing when the window is minutes. The Roku, tvOS and mobile
        clients — where skew genuinely bites — were not available to inspect, so treat &ldquo;Disney
        drops unknown elements&rdquo; as confirmed for web and unknown for OTT.
      </p>

      <InterviewChallenge
        title="Ship a new element type safely"
        scenario={
          <>
            You are adding a <code>sparkline</code> to the account screen. Web can render it. The
            terminal cannot. Mobile could, but only from v7 onward, and roughly 30% of installs are
            older. The contract has no fallback field and no criticality flag, and cannot gain them.
          </>
        }
        tasks={[
          "Describe what each of the three clients does the day you ship, with no further changes.",
          "Design a rollout that does not leave 30% of mobile users with a hole in the screen.",
          "Say what you would put in the decision log if you decided to add a fallback field after all.",
          "Explain why a shared types package would make this harder rather than easier.",
        ]}
        pitfalls={[
          "Assuming you can just add the fallback field now — old clients ignore fields they were never taught to read.",
          "Treating the stale-mobile population as an edge case rather than the normal steady state.",
          "Forgetting the templates: a surface whose template never references the slot never receives it at all.",
        ]}
        signal="The strongest answers reach for the template layer rather than the contract — realising the problem can be solved without touching the wire format at all."
      />

      <SolutionReveal difficulty="hard">
        <p>
          <strong>Day one.</strong> Web renders it. Terminal drops and logs. Mobile splits: v7+
          renders, older builds drop and log. All three screens still work — that is drop-and-log
          doing its job.
        </p>
        <p>
          <strong>The rollout, and the key insight:</strong> do not change the contract — change the
          templates. Per decision 002 each surface has its own template, and a slot a template does
          not reference is never sent. So <code>account-detail/web.json</code> gains a{" "}
          <code>balanceChart</code> slot; <code>tui.json</code> does not. The terminal never receives
          an element it cannot use, and there is nothing to drop.
        </p>
        <p>
          Mobile is the harder case because one template serves all its versions. Options: keep the
          slot out until adoption is high enough, or serve a version-keyed template variant —
          which is really open decision 003, versioning, arriving for real.
        </p>
        <p>
          <strong>If you added a fallback field anyway:</strong> the log entry has to state that it
          only helps clients built <em>after</em> the field ships, so the benefit begins one release
          cycle later and never reaches anything currently in the field. <em>Would change if</em>: a
          non-updatable client population grows large enough that permanent content loss outweighs a
          fatter payload.
        </p>
        <p>
          <strong>Shared package:</strong> adding <code>sparkline</code> to a shared union breaks
          every client&rsquo;s exhaustive switch until all three implement it — turning a gradual
          rollout into a coordinated release. Worse, it makes &ldquo;30% of mobile is on v6&rdquo;
          inexpressible in the type system, when that is precisely the situation being designed for.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Version skew is the permanent steady state for any client you cannot force-update. Only web
          escapes it.
        </li>
        <li>
          The client is blind by construction — it cannot distinguish a decorative unknown from a
          consequential one, because that information only exists server-side.
        </li>
        <li>
          Drop-and-log was chosen; no fallback and no criticality field, and those can never be added
          for clients already in the field.
        </li>
        <li>
          The compensating policy: consequential content uses element types that existed in v1.
        </li>
        <li>
          Content degrades, interaction escalates. An unknown action fails the screen; an unknown
          element does not.
        </li>
        <li>
          Type the client&rsquo;s input as an open shape. A closed union makes the compiler declare
          your safety net unreachable.
        </li>
        <li>
          Types are duplicated per side on purpose. The wire format is the contract; the TypeScript is
          each party&rsquo;s local model of it.
        </li>
      </ul>
    </div>
  );
}
