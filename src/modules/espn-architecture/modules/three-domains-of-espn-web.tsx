import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  CodeBlock,
  InterviewChallenge,
  InterviewPlaybook,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const journeyDiagram = String.raw`flowchart LR
  subgraph A["www.espn.com — the sports site"]
    A1["Scores · news · articles · video"] --> A2["Contextualization takeover<br/>'READY. SET. STREAM.'"]
  end
  subgraph B["plus.espn.com — the sales site"]
    B1["Marketing landing pages<br/>/soccer · /mlbtv · /nflbundle"] --> B2["Plan card page<br/>(pick your plan)"]
  end
  subgraph C["secure.web.plus.espn.com — the checkout"]
    C1["Login (MyDisney)"] --> C2["Add-ons (optional)"] --> C3["Billing (ledger)"] --> C4["Success"]
  end
  A2 -->|"Browse Plans"| B2
  B2 --> C1`;

const ownershipDiagram = String.raw`flowchart TD
  U["One brand: ESPN"] --> D1["www.espn.com<br/><b>ESPN engineering org</b><br/>content site"]
  U --> D2["plus.espn.com<br/><b>Nexus platform</b><br/>marketing & acquisition"]
  U --> D3["secure.web.plus.espn.com<br/><b>CUP / cgi-web</b><br/>unified commerce (D+ · Hulu · ESPN)"]
  D1 -.->|different repos, teams,<br/>deploy pipelines| D2
  D2 -.-> D3`;

const trafficCopDiagram = String.raw`flowchart TD
  C["Contextualization takeover on www.espn.com<br/>ESPN org owns this screen"] --> Q{"Which exit does the user take?"}
  Q -->|"Browse Plans"| P["Plan card page on plus.espn.com<br/>Nexus platform · CMS-authored"]
  Q -->|"Log in with MyDisney"| L["Authentication<br/>then the same purchase path"]
  Q -->|"Sign in with TV provider"| T{"Two different processes"}
  T -->|"partner activation"| T1["Link an existing cable subscription<br/>to a MyDisney account"]
  T -->|"TVE"| T2["Authenticate through the provider<br/>to stream entitled content"]
  P --> K["Checkout on secure.web.plus.espn.com<br/>CUP · cgi-web"]
  L --> K
  T1 -.->|"not a purchase flow"| X["No checkout hop"]
  T2 -.->|"not a purchase flow"| X`;

export const toc: TocItem[] = [
  { id: "one-brand-three-websites", title: "One Brand, Three Websites", level: 2 },
  { id: "the-three-domains", title: "The Three Domains", level: 2 },
  { id: "the-user-journey", title: "The User Journey Across Domains", level: 2 },
  { id: "contextualization", title: "The Contextualization Screen", level: 2 },
  { id: "why-split-domains", title: "Why Companies Split Domains", level: 2 },
  { id: "ownership-map", title: "Ownership Map & the Unified Platform", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Route the Bug", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ThreeDomainsOfEspnWeb() {
  return (
    <div className="article-content">
      <p>
        When you first look at ESPN&apos;s web presence inside Disney, the most
        confusing discovery is that &quot;the ESPN site&quot; is not one
        website. A user who goes from reading scores to paying for a
        subscription silently crosses <strong>three different websites</strong>,
        built by three different teams, in three different codebases. This
        module is the foundation for everything else in this academy: once the
        three-domain map is in your head, every architecture, ownership, and
        debugging question about ESPN gets easier.
      </p>

      <h2 id="one-brand-three-websites">One Brand, Three Websites</h2>
      <p>
        ESPN is a special case inside Disney streaming. Disney+ and Hulu are
        streaming-first products whose web surfaces are mostly built by Disney
        streaming teams. ESPN brings something extra: a massive, decades-old
        <strong> content business</strong> (espn.com — one of the
        highest-traffic sports sites in the world) run by ESPN&apos;s own
        engineering organization, sitting <em>in front of</em> the
        subscription business that Disney streaming platforms power. The result
        is a brand whose user journey is stitched across organizational
        boundaries.
      </p>

      <h2 id="the-three-domains">The Three Domains</h2>
      <ArticleTable caption="Three domains, three jobs, three owning organisations — memorise this table and most ESPN architecture questions become routing questions.">
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Job</th>
            <th>Built by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>www.espn.com</code>
            </td>
            <td>
              The sports site — scores, news, articles, video. Free content
              that attracts the audience.
            </td>
            <td>ESPN&apos;s own engineering org</td>
          </tr>
          <tr>
            <td>
              <code>plus.espn.com</code>
            </td>
            <td>
              The sales site — marketing landing pages per sport/league
              (<code>/soccer</code>, <code>/mlbtv</code>,{" "}
              <code>/nflbundle</code>) and the plan card page where users pick
              a plan.
            </td>
            <td>Nexus (Disney streaming&apos;s marketing-page platform)</td>
          </tr>
          <tr>
            <td>
              <code>secure.web.plus.espn.com</code>
            </td>
            <td>
              The checkout — login, add-ons, billing (&quot;ledger&quot;),
              success. Where money changes hands.
            </td>
            <td>
              CUP — the unified commerce platform (cgi-web), shared with
              Disney+ and Hulu
            </td>
          </tr>
        </tbody>
      </table>
      </ArticleTable>

      <h2 id="the-user-journey">The User Journey Across Domains</h2>
      <p>
        A subscription journey starts on the content site, converts on the
        sales site, and transacts on the checkout. Each arrow crossing a
        subgraph boundary below is a <strong>domain hop</strong> — a switch of
        website, codebase, and owning team that the user never notices:
      </p>
      <MermaidDiagram
        chart={journeyDiagram}
        title="ESPN Web Signup Journey Across Three Domains"
        caption="Each subgraph is a separate website with its own codebase and team. The user experiences it as one brand."
        minHeight={420}
      />
      <p>
        Two details worth knowing early: <strong>login is conditional</strong>{" "}
        (already-authenticated users skip it), and mobile web follows the same
        flow as desktop web.
      </p>

      <h2 id="contextualization">The Contextualization Screen</h2>
      <p>
        The journey&apos;s true starting point is the{" "}
        <strong>contextualization screen</strong> — the full-screen
        &quot;READY. SET. STREAM.&quot; takeover that appears on espn.com when
        a user shows purchase intent (for example, tapping a Subscribe button
        next to a game). Product teams call it the <strong>traffic cop</strong>:
        it is the screen with the most choices, and the user&apos;s choice
        decides everything that follows.
      </p>
      <ul>
        <li>
          <strong>Browse Plans</strong> → the signup/purchase flow (plan cards
          on plus.espn.com)
        </li>
        <li>
          <strong>Log in with MyDisney</strong> → effectively the same path,
          entering through authentication
        </li>
        <li>
          <strong>Sign in with TV provider</strong> → one of two different
          processes: <em>partner activation</em> (link a cable subscription to
          a MyDisney account) or <em>TVE</em> (authenticate through the
          provider to stream)
        </li>
      </ul>
      <MermaidDiagram
        chart={trafficCopDiagram}
        title="The Traffic Cop and Its Three Exits"
        caption="Only two exits lead to a checkout hop. The TV-provider exit forks into two different processes, neither of which is a purchase flow — that distinction is where most confusion starts."
        minHeight={520}
      />
      <p>
        Note it is a <em>takeover</em>, not a page: it overlays whatever
        espn.com page the user was on, without a dedicated URL you can visit
        directly. Product flows are considered to start here — even flows that
        end up on completely different domains.
      </p>

      <h2 id="why-split-domains">Why Companies Split Domains</h2>
      <p>Three practical forces produce this architecture:</p>
      <ul>
        <li>
          <strong>Independent teams, independent deploys.</strong> The
          newsroom-scale content site cannot ship in lockstep with a payment
          form. Separate domains = separate codebases, pipelines, and release
          schedules.
        </li>
        <li>
          <strong>Security isolation.</strong> The <code>secure.*</code>{" "}
          checkout domain keeps payment sessions and cookies walled off from a
          content site full of ads and third-party scripts.
        </li>
        <li>
          <strong>Different jobs need different platforms.</strong> Content
          keeps you reading; marketing pages are optimized to convert;
          checkout is optimized to transact reliably. Each layer gets a
          platform built for its job.
        </li>
      </ul>
      <p>
        The same pattern exists on the sibling brands —{" "}
        <code>hulu.com</code> vs <code>secure.hulu.com</code>, and Disney+&apos;s
        marketing pages vs its commerce paths. ESPN just makes the seams more
        visible because the content site is so large and belongs to a different
        engineering org.
      </p>

      <h2 id="ownership-map">Ownership Map &amp; the Unified Platform</h2>
      <MermaidDiagram
        chart={ownershipDiagram}
        title="Who Builds What"
        caption="Three domains, three platforms, three owners — under one brand."
        minHeight={380}
      />
      <p>
        A subtlety that trips people up: product managers describe the{" "}
        <em>entire flow</em> — including ESPN-owned screens — as part of
        &quot;the unified platform.&quot; That phrase describes the{" "}
        <strong>product experience</strong>, not a single codebase. Within that
        unified experience, ownership still splits per screen:
      </p>
      <CodeBlock
        code={`Screen                      Owner
─────────────────────────   ─────────────────────────────
Contextualization takeover  ESPN (updates + owns)
Plan card page              ESPN (content) on Nexus (platform)
Login / add-ons             Disney — CUP (cgi-web)
Billing ("ledger")          Disney — CUP (cgi-web)
Success                     Disney — CUP (cgi-web)`}
        lang="bash"
        filename="ownership-map.txt"
      />
      <p>
        &quot;Ledger&quot; is worth memorizing: it is product vocabulary for
        the billing page, and it shows up in conversations, tickets, and event
        names.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title={`"Walk me through ESPN's web architecture."`}
        intro={
          <>
            The weak answer lists technologies. The strong answer starts from
            the <em>organisational</em> boundaries, because those are what
            actually explain the system&apos;s shape.
          </>
        }
        steps={[
          "Open with the punchline: ESPN's web presence is three separate websites under one brand, not one site — content, sales, and checkout.",
          "Name each domain with its job and its owner: www.espn.com (content, ESPN's own engineering org), plus.espn.com (sales/marketing, the Nexus platform), secure.web.plus.espn.com (checkout, the CUP unified commerce platform in cgi-web).",
          "Trace one user journey across all three and point out that every boundary crossing is a domain hop the user never notices.",
          "Explain the forces that produce this split: independent deploy cadences, payment-security isolation on the secure.* domain, and job-specific platforms.",
          "Add the nuance that earns senior credit: 'unified platform' describes the product experience, not a single codebase — ownership still splits per screen.",
          "Close with the practical payoff: this map is a bug-routing tool. Knowing which domain a screen lives on tells you which repo, team, and deploy pipeline to go to first.",
        ]}
      />

      <h2 id="challenge">Challenge: Route the Bug</h2>
      <InterviewChallenge
        title="Three reports, three domains"
        scenario={
          <>
            You are on call. Three reports land within an hour, all described
            by the reporter as &quot;the ESPN signup page is broken&quot;:
            <br />
            <strong>(a)</strong> the &quot;READY. SET. STREAM.&quot; takeover
            shows a stale promotional headline;
            <br />
            <strong>(b)</strong> a plan card on the plan-selection page shows
            the wrong monthly price;
            <br />
            <strong>(c)</strong> users reach the billing page but the page
            renders with no payment form.
          </>
        }
        tasks={[
          "For each report, name the domain it occurs on and the owning organisation.",
          "For each, state which repository or system you would open first — and which you would explicitly NOT open.",
          "Identify which of the three is least likely to be fixable by a code change in cgi-web, and explain why.",
          "Explain what single follow-up question you would ask the reporter to disambiguate each report faster next time.",
        ]}
        pitfalls={[
          "Assuming 'signup page' means one page — all three reports describe different websites.",
          "Starting in the checkout repo because the word 'signup' appears; two of the three never touch it.",
          "Treating a wrong price as a frontend bug by default.",
          "Forgetting that a takeover has no dedicated URL, so 'send me the link' is not a useful question for report (a).",
        ]}
        signal="A strong answer routes by domain before reasoning about code, and is comfortable saying 'that one is not ours' with a specific owner named."
      />
      <SolutionReveal difficulty="easy">
        <p>
          <strong>(a) Stale takeover headline</strong> — this is on{" "}
          <code>www.espn.com</code>, the contextualization takeover, owned and
          updated by ESPN&apos;s own engineering org. It is the report least
          likely to be fixed in <code>cgi-web</code>: nothing in the commerce
          or marketing repos renders that screen. Route it to ESPN. Useful
          follow-up question: &quot;which page were you on when it
          appeared?&quot; — because a takeover overlays an existing page and
          has no URL of its own to share.
        </p>
        <p>
          <strong>(b) Wrong plan price</strong> — this is on{" "}
          <code>plus.espn.com</code>, the Nexus marketing layer. Prices on
          marketing pages come from CMS-authored content, so the first stop is
          the content/CMS entry, not React code. Follow-up question: &quot;what
          exact price did you see, and on which route?&quot; A price bug is
          almost never a rendering bug — later modules in this academy show
          that the commerce side is server-driven too, so &quot;wrong
          price&quot; is a content-or-backend question on both domains.
        </p>
        <p>
          <strong>(c) Billing page with no payment form</strong> — this is on{" "}
          <code>secure.web.plus.espn.com</code>, the CUP checkout in{" "}
          <code>cgi-web</code>. This is genuinely ours. Even here, though, the
          billing page is largely described by a backend-for-frontend, so
          &quot;missing element&quot; means checking what the backend returned
          before assuming the React app dropped it. Follow-up question:
          &quot;can you share the full URL, including query parameters?&quot; —
          the entry parameters determine what the checkout asks for.
        </p>
        <p>
          The meta-lesson: the reporter&apos;s words came from the{" "}
          <em>product</em> vocabulary (&quot;the signup page&quot;), which
          flattens three domains into one phrase. Your first act is always to
          translate that phrase into a domain.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          ESPN&apos;s web presence = three websites under one brand: content
          (www.espn.com), sales (plus.espn.com), checkout
          (secure.web.plus.espn.com).
        </li>
        <li>
          Each domain = different codebase, team, and deploy pipeline: ESPN
          org, Nexus, and CUP (cgi-web) respectively.
        </li>
        <li>
          The contextualization takeover on espn.com is the true start of
          every flow — the &quot;traffic cop&quot; with three exits: browse
          plans, MyDisney login, TV provider.
        </li>
        <li>
          &quot;Unified platform&quot; describes the product experience, not
          one codebase — ownership still splits per screen.
        </li>
        <li>
          Domain splits exist for real reasons: independent deploys, payment
          security isolation, and job-specific platforms.
        </li>
        <li>
          Same layering exists on Hulu and Disney+ — ESPN just makes it
          visible because its content site belongs to a different org.
        </li>
      </ul>
    </div>
  );
}
