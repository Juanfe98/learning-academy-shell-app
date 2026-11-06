import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fillDiagram = String.raw`flowchart LR
  subgraph t["Template on disk — a SHAPE with holes"]
    T1["content.balance = { $slot: 'balance' }"]
    T2["content.accountName = { $slot: 'accountName' }"]
  end

  subgraph s["Slot map from the service — FLAT, no structure"]
    S1["balance → TextElement"]
    S2["accountName → TextElement"]
    S3["compactSummary → TextElement"]
    S4["balanceCaption → TextElement"]
  end

  F["fillTemplate<br/>walk template.content<br/>swap markers for content"]

  T1 --> F
  T2 --> F
  S1 --> F
  S2 --> F
  S3 -.->|"not referenced<br/>silently dropped"| F
  S4 -.->|"not referenced<br/>silently dropped"| F

  F --> OUT["content: { balance, accountName }"]

  style F fill:#7c3aed,color:#fff`;

const branchingDiagram = String.raw`flowchart TD
  Q["Server must produce different output per surface.<br/>WHERE does the branching live?"]

  Q --> A["A — inside services<br/>if (surface === 'tui')"]
  Q --> B["B — separate routes per surface"]
  Q --> C["C — template resolution<br/>(CHOSEN)"]
  Q --> D["D — no branching<br/>one payload, clients drop"]

  A --> A1["Smears surface knowledge<br/>through business logic.<br/>Flex: ~70 isPartnerESPN in shared services"]
  B --> B1["What Flex does for OTT:<br/>routes/screens/v1/espn/*<br/>Total freedom, screens drift apart"]
  C --> C1["Services stay surface-agnostic.<br/>Templates deploy independently.<br/>Layout holes disappear."]
  D --> D1["Makes drop-and-log the NORMAL path<br/>for the weaker client, every request"]

  style C fill:#0f766e,color:#fff
  style A1 fill:#7f1d1d,color:#fff`;

const templateCode = `{
  "screen": "account-detail",
  "templateId": "account-detail:tui:default",
  "content": {
    "balance": { "$slot": "balance" },
    "accountName": { "$slot": "accountName" },
    "compactSummary": { "$slot": "compactSummary" },
    "transactions": { "$slot": "transactions" }
  }
}`;

const fillCode = `export function fillTemplate(template: Template, slots: BuiltSlots): Record<string, SlotContent> {
  const filled: Record<string, SlotContent> = {};

  for (const [key, node] of Object.entries(template.content)) {
    if (!isSlotMarker(node)) {
      // A literal authored directly into the template rather than a placeholder.
      filled[key] = node as SlotContent;
      continue;
    }

    const content = slots[node.$slot];

    if (content === undefined) {
      // TODO(008): route through the real telemetry sink once one exists.
      console.warn(
        \`[fillTemplate] template "\${template.templateId}" references slot "\${node.$slot}", \` +
          \`which the service did not build. Omitting.\`
      );
      continue;
    }

    filled[key] = content;
  }

  return filled;
}`;

const loadCode = `export async function loadTemplate(screen: string, surface: Surface): Promise<Template> {
  let path: string;

  try {
    // Resolved through the templates package's export map, so the location of the package on
    // disk is not hardcoded here.
    path = fileURLToPath(import.meta.resolve(\`@sdui/templates/\${screen}/\${surface}.json\`));
  } catch {
    throw new TemplateNotFoundError(screen, surface);
  }

  let contents: string;

  try {
    contents = await readFile(path, 'utf8');
  } catch {
    throw new TemplateNotFoundError(screen, surface);
  }

  return JSON.parse(contents) as Template;
}`;

const flexTemplateCode = `{
  "data": {
    "content": {
      "modal":          "<%- JSON.stringify(data.modal ?? null) %>",
      "header":         "<%- JSON.stringify(data.header ?? null) %>",
      "accountDetails": "<%- JSON.stringify(data.accountDetails ?? null) %>",
      "myServices":     "<%- JSON.stringify(data.myServices ?? null) %>",
      "metricsData": {
        "eventUrn": "urn:dss:event:glimpse:impression:pageView:v2",
        "payload": { "pageId": "account_management", "pageKey": "account_management" }
      }
    },
    "screenType": "account-details",
    "templateId": "account-details"
  },
  "metadata": {
    "configurationId": "account-details:account-details:default::1700589390784"
  }
}`;

const flexEjsCode = `/**
 * Strips quotes around strings that are really intended to be objects.
 *
 * SiteConfig has a limitation that everything must be proper json, which means
 * we have to save our objects as strings for it pass SiteConfig's validation.
 */
const stripQuotesFromObjects = (templateString: string): string =>
  templateString.replace(
    /"<%- JSON\\.stringify\\(.*?\\) %>"/g,
    (symbol) => symbol.replace('"<%-', '<%-').replace('%>"', '%>')
  );

export const fillEjsData = <T,>({ jsonObject, data }: { jsonObject: T; data: EjsData }): T => {
  const templateString = stripQuotesFromObjects(JSON.stringify(jsonObject));
  const ejsTemplate = ejs.compile(templateString);

  return JSON.parse(ejsTemplate(data), (key, value) => {
    if (key.endsWith('__comment')) return undefined;
    if (value === null) return nullObjectKeys.includes(key) ? null : undefined;
    return value;
  });
};`;

const liveEdit = `# edit tui.json: rename compactSummary → compactSummry, save. No restart.
$ curl -s -H 'x-client-surface: tui' \\
    'http://localhost:3999/screens/v1/account/detail?accountId=acc-001' | jq -c '.content|keys'
["accountName","balance","transactions"]

# and in the server terminal:
[fillTemplate] template "account-detail:tui:default" references slot "compactSummry",
which the service did not build. Omitting.`;

export const toc: TocItem[] = [
  { id: "what", title: "What a Template Is", level: 2 },
  { id: "where", title: "Where the Branching Lives", level: 2 },
  { id: "rejected", title: "The Three Rejected Locations", level: 3 },
  { id: "holes", title: "Layout Holes, and Why Per-Surface Templates Remove Them", level: 3 },
  { id: "fill", title: "fillTemplate, Line by Line", level: 2 },
  { id: "three-outcomes", title: "Three Outcomes, All Different on Purpose", level: 3 },
  { id: "load", title: "Loading a Template Is I/O", level: 2 },
  { id: "hard-fail", title: "A Missing Template Is a Hard Failure", level: 3 },
  { id: "flex", title: "What a Real Flex Template Looks Like", level: 2 },
  { id: "quotes", title: "The Quoting Puzzle and Its Answer", level: 3 },
  { id: "not-inherited", title: "The Workaround Not Inherited", level: 3 },
  { id: "live", title: "Seeing It Work", level: 2 },
  { id: "challenge", title: "Challenge: Ship a Layout Change", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function TemplatesAndFill() {
  return (
    <div className="article-content">
      <p>
        This is the layer that makes the architecture pay off. Everything before it produced content;
        this decides what a given client actually receives — and it does so in a file that deploys
        independently of server code.
      </p>

      <h2 id="what">What a Template Is</h2>
      <CodeBlock
        code={templateCode}
        lang="json"
        filename="packages/sdui-templates/templates/account-detail/tui.json"
      />
      <p>
        A shape with holes in it. <code>{`{ "$slot": "balance" }`}</code> is a hole named{" "}
        <code>balance</code>. Plain JSON, no expressions, no logic.
      </p>
      <p>
        Three properties are enforced rather than assumed:
      </p>
      <ul>
        <li>
          <strong>Data, not code.</strong> Server code cannot import a template as a module. They live
          in a separate package and are read at runtime.
        </li>
        <li>
          <strong>Layout only.</strong> No business rules. Anything conditional becomes a different
          template rather than logic inside one.
        </li>
        <li>
          <strong>One file per surface</strong>, per decision 002.
        </li>
      </ul>
      <p>
        <code>templateId</code> is <code>{"{screen}:{surface}:{variant}"}</code>. The{" "}
        <code>:default</code> is the variant slot, which is where experiment-driven selection plugs in
        later.
      </p>

      <h2 id="where">Where the Branching Lives</h2>
      <p>
        The server must produce different output per surface. <em>Where</em> that branching lives is
        the whole of decision 002, and there were four candidate locations.
      </p>
      <MermaidDiagram
        chart={branchingDiagram}
        title="Four places the surface branch could live"
        caption="Flex uses A for brand and B for OTT. This project uses C — a location Flex does not use for this purpose."
      />

      <h3 id="rejected">The Three Rejected Locations</h3>
      <ArticleTable caption="Why each alternative was rejected">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>What it looks like</th>
              <th>Why rejected</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Inside services</td>
              <td>
                <code>if (surface === &apos;tui&apos;)</code> scattered through business logic
              </td>
              <td>
                Smears surface knowledge everywhere. Flex demonstrates the end state: ~70{" "}
                <code>isPartnerESPN</code>-style comparisons in <em>shared</em> services
              </td>
            </tr>
            <tr>
              <td>Separate routes</td>
              <td>
                <code>/screens/v1/tui/account/detail</code>
              </td>
              <td>
                What Flex does for OTT devices. Total freedom per surface, at the cost of screens
                drifting apart and no single place describing &ldquo;the account screen&rdquo;
              </td>
            </tr>
            <tr>
              <td>No branching at all</td>
              <td>One payload, clients drop what they cannot use</td>
              <td>
                Makes 001b&rsquo;s drop-and-log the <em>normal</em> path for the weaker client on
                every request — a mechanism for rare failures used as the everyday strategy
              </td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="holes">Layout Holes, and Why Per-Surface Templates Remove Them</h3>
      <p>
        This is the argument that settles it, and it is easy to miss.
      </p>
      <p>
        Under &ldquo;one payload, clients drop what they cannot use,&rdquo; the terminal receives a
        five-slot template and renders three of them. The result is a screen with <em>gaps where the
        layout expected content</em> — it looks damaged.
      </p>
      <p>
        Under per-surface templates, the terminal gets <code>tui.json</code>: a template{" "}
        <em>designed</em> for four slots. Nothing is missing, because nothing was promised. The screen
        reads as intended rather than as broken.
      </p>

      <h2 id="fill">fillTemplate, Line by Line</h2>
      <CodeBlock
        code={fillCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/template/fillTemplate.ts"
      />
      <MermaidDiagram
        chart={fillDiagram}
        title="Marrying a flat slot map to a shaped template"
        caption="The service produces a flat map with no structure. The template supplies the structure. Neither knows about the other."
      />
      <p>
        Worth stressing: the service builds a <strong>flat map</strong> — no nesting, no ordering, no
        structure. The template supplies all of that. The service never sees the template&rsquo;s
        shape, which is exactly what keeps it surface-agnostic.
      </p>

      <h3 id="three-outcomes">Three Outcomes, All Different on Purpose</h3>
      <ArticleTable caption="What happens to each slot">
        <table>
          <thead>
            <tr>
              <th>Situation</th>
              <th>Result</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Referenced and built</td>
              <td>Marker replaced with content</td>
              <td>The normal path</td>
            </tr>
            <tr>
              <td>Referenced, not built</td>
              <td>
                Key <strong>omitted entirely</strong>, warning logged
              </td>
              <td>
                Omission supports optional content; the log stops a typo&rsquo;d slot name from
                failing silently
              </td>
            </tr>
            <tr>
              <td>Built, not referenced</td>
              <td>Silently dropped</td>
              <td>The design working — each surface takes what it wants</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note &ldquo;omitted entirely,&rdquo; not <code>null</code>. Clients distinguish &ldquo;not on
        this screen&rdquo; from &ldquo;present but empty&rdquo; by key presence alone. Flex reaches the
        same outcome differently — <code>?? null</code> in the template plus a <code>JSON.parse</code>{" "}
        reviver that converts nulls to <code>undefined</code>, removing the key.
      </p>

      <h2 id="load">Loading a Template Is I/O</h2>
      <CodeBlock
        code={loadCode}
        lang="typescript"
        filename="packages/sdui-server/src/domain/template/templateService.ts"
      />
      <p>
        Read from disk at request time, resolved through the templates package&rsquo;s export map so
        no path is hardcoded. That is the point: templates are <strong>data fetched at runtime</strong>,
        not modules linked at build time. Flex goes further and fetches from S3 via SiteConfig;
        reading the filesystem is the local equivalent of the same idea.
      </p>
      <p>
        No cache, deliberately, for milestone 1 — which means editing a template and refreshing shows
        the change without a restart. A cache keyed by screen and surface belongs here eventually.
      </p>

      <h3 id="hard-fail">A Missing Template Is a Hard Failure</h3>
      <p>
        <code>TemplateNotFoundError</code>, not a fallback to another surface. That choice is
        deliberate and traceable to a specific finding:
      </p>
      <blockquote>
        Flex&rsquo;s experiment latch is <code>if (!experimentTemplateConfigurationForScreen)</code> —
        the winner is the first featureId whose variant maps to an entry in <code>templates</code>,
        not merely the first with an assignment. A second silent path to control exists via{" "}
        <code>templatesV2[variant][version]</code>.
      </blockquote>
      <p>
        That is correction #10 in the ESPN research register, and it describes exactly the hazard:
        silent fallthrough leaving a user on a screen nobody intended, with nothing in the logs.
        Failing loudly is the lesson learned from someone else&rsquo;s expensive debugging session.
      </p>

      <h2 id="flex">What a Real Flex Template Looks Like</h2>
      <p>
        <code>growth-life-client-templates</code> contains 407 JSON files and not a single{" "}
        <code>.ejs</code> file. Here is a real one:
      </p>
      <CodeBlock
        code={flexTemplateCode}
        lang="json"
        filename="growth-life-client-templates/templates/flex-account-details/account-details/default.json"
      />
      <p>Four things to take from it:</p>
      <ol>
        <li>
          <strong>Named slots</strong>, confirming the shape adopted here.
        </li>
        <li>
          <strong>Per-surface slot sets differ substantially.</strong> This web template exposes ten
          slots (<code>header</code>, <code>accountDetails</code>, <code>subscriptionDetails</code>,{" "}
          <code>myServices</code>, …). The OTT sibling <code>device-account-details</code> exposes
          five (<code>subheader</code>, <code>badge</code>, <code>banners</code>,{" "}
          <code>currentSubscription</code>, <code>footer</code>) with barely any overlap. Not a subset
          — a different screen.
        </li>
        <li>
          <strong>Analytics authored in the template.</strong> <code>pageId</code>,{" "}
          <code>pageKey</code>, <code>pageName</code> are literals here, not supplied by the service.
          This project deliberately did not adopt that.
        </li>
        <li>
          <strong>
            <code>configurationId</code>
          </strong>{" "}
          is <code>screenType:templateId:variant::timestamp</code> — their template identity and
          versioning scheme.
        </li>
      </ol>

      <h3 id="quotes">The Quoting Puzzle and Its Answer</h3>
      <p>
        Look at the quoting: the value is a <em>string</em> containing an EJS tag. Rendered directly,
        you would get <code>&quot;header&quot;: &quot;{"{"}&quot;type&quot;:&quot;text&quot;{"}"}&quot;</code> —
        broken JSON, quotes in the wrong places. So how does it work?
      </p>
      <CodeBlock code={flexEjsCode} lang="typescript" filename="growth-life-client-api/src/lib/ejs.ts" />
      <p>
        <strong>They regex the quotes off before rendering.</strong> And the comment in the source
        states why: SiteConfig validates that stored templates are proper JSON, so objects have to be
        saved as strings to pass validation.
      </p>
      <p>The full pipeline is: strip wrapper quotes → compile and render with EJS → parse back with a reviver that drops <code>__comment</code> keys (JSON has no comments, so they invented a convention) and converts nulls to <code>undefined</code> unless the key is in a hardcoded <code>nullObjectKeys</code> allowlist.</p>

      <h3 id="not-inherited">The Workaround Not Inherited</h3>
      <p>
        This is the clearest example in the whole project of the difference between reproducing a{" "}
        <em>constraint</em> and reproducing a <em>mechanism</em>.
      </p>
      <p>
        The quote-stripping exists because of an external config service&rsquo;s validation rule. It is
        not a design choice; it is a workaround. This project has no SiteConfig, so it does not
        inherit the workaround — templates are plain JSON with slot markers, and the fill is a walk
        rather than a render.
      </p>
      <p>
        What <em>was</em> inherited is everything architecturally meaningful: named slots, optional
        slots by omission, per-surface slot sets, templates as independently deployable data. Reading
        the EJS mechanism delivered the understanding that building it would have.
      </p>

      <h2 id="live">Seeing It Work</h2>
      <CodeBlock code={liveEdit} lang="bash" filename="terminal" />
      <p>
        A template-only change altering the response, with no server code touched and no restart. That
        is the architecture&rsquo;s central promise made concrete — and it is simultaneously the
        failure mode that would be completely silent without that warning line.
      </p>

      <InterviewChallenge
        title="Ship a layout change"
        scenario={
          <>
            Product wants the account screen reordered on web — balance first, then the account name,
            with the caption removed entirely. They also want a new &ldquo;last updated&rdquo; line at
            the bottom. It is Friday afternoon and the mobile app is mid-release-freeze.
          </>
        }
        tasks={[
          "Identify which of these can ship without a server deploy, and which cannot.",
          "Name the file(s) that change for the reorder and the caption removal.",
          "Explain what happens to the terminal and mobile clients while web changes.",
          "Say what breaks if you add the 'last updated' slot to the template but forget the service.",
        ]}
        pitfalls={[
          "Assuming a reorder requires a code change — slot ordering lives in the template.",
          "Thinking removing a slot from one template affects the others.",
          "Missing that the new slot needs service work, and that the failure is quiet by design.",
        ]}
        signal="Strong answers separate the layout-only changes from the content changes, and notice the release freeze is irrelevant to three of the four."
      />

      <SolutionReveal difficulty="medium">
        <p>
          <strong>Ships without a server deploy:</strong> the reorder and the caption removal. Both are
          edits to <code>account-detail/web.json</code> — reorder the keys, delete the{" "}
          <code>balanceCaption</code> entry. Templates deploy independently, so this is a template
          release only.
        </p>
        <p>
          <strong>Needs a server deploy:</strong> &ldquo;last updated&rdquo;. That is new content, so{" "}
          <code>buildSlots</code> must produce a <code>lastUpdated</code> slot from{" "}
          <code>domainAccount.updatedAt</code>. Server first, then the template.
        </p>
        <p>
          <strong>Other clients:</strong> completely unaffected. They load their own template files.
          The release freeze is irrelevant to three of the four changes — which is precisely the
          benefit SDUI is bought for.
        </p>
        <p>
          <strong>Template ahead of service:</strong> the screen renders <em>minus</em> that slot, and{" "}
          <code>fillTemplate</code> logs{" "}
          <code>references slot &quot;lastUpdated&quot;, which the service did not build</code>. Quiet
          by design so optional content works — which is exactly why the log line is not optional. Ship
          the template first and the only evidence is one warning nobody is watching, until decision
          008 gives it somewhere real to go.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          A template is a shape with named holes. Plain JSON, no expressions — anything conditional
          becomes a different template.
        </li>
        <li>
          The surface branch lives in template resolution, which keeps services surface-agnostic and
          makes adding a client a template-only change.
        </li>
        <li>
          Per-surface templates remove layout holes: the weaker client gets a screen designed for it,
          not a damaged version of another one.
        </li>
        <li>
          Built-but-unreferenced is silent; referenced-but-unbuilt is logged. A missing template fails
          hard rather than falling back.
        </li>
        <li>
          Flex&rsquo;s EJS-over-JSON machinery exists to satisfy SiteConfig&rsquo;s JSON validation —
          a workaround for a constraint this project does not have, and therefore not copied.
        </li>
      </ul>
    </div>
  );
}
