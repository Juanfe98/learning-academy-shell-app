import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const modelsDiagram = String.raw`flowchart TD
  subgraph Cen["Centralized (Solitary)"]
    C1["Dedicated DS team owns everything"]
    C1 --> C2["High consistency, slow throughput,<br/>becomes a bottleneck"]
  end
  subgraph Fed["Federated (Distributed)"]
    F1["Contributors across teams"]
    F1 --> F2["High throughput, risk of<br/>inconsistency without strong governance"]
  end
  subgraph Hyb["Hybrid (Cyclical) — most common"]
    H1["Small core team curates + reviews"]
    H1 --> H2["Product teams contribute via RFC"]
    H2 --> H1
  end`;

const rfcDiagram = String.raw`flowchart LR
  NEED["Team needs a component<br/>not in the system"] --> RFC["Open an RFC<br/>(problem, API, alternatives)"]
  RFC --> REVIEW["Core team + community review"]
  REVIEW -->|"accepted"| BUILD["Contributor builds it<br/>to system standards"]
  REVIEW -->|"exists / different"| GUIDE["Point to existing solution"]
  BUILD --> MERGE["Merged + documented + released"]`;

export const toc: TocItem[] = [
  { id: "system-is-sociotechnical", title: "A System Is Sociotechnical", level: 2 },
  { id: "governance-models", title: "Governance Models", level: 2 },
  { id: "contribution", title: "The Contribution Model", level: 2 },
  { id: "rfc", title: "The RFC Process", level: 3 },
  { id: "tiers", title: "Component Tiers & the Intake Funnel", level: 3 },
  { id: "adoption", title: "Driving Adoption", level: 2 },
  { id: "metrics", title: "Measuring Adoption & Health", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function GovernanceContributionAndAdoption() {
  return (
    <div className="article-content">
      <p>
        Most design systems don&rsquo;t fail technically — they fail <strong>organizationally</strong>.
        The components are fine; what kills them is no clear ownership, no way for teams to
        contribute, requests piling up faster than a small team can serve, and ultimately teams
        routing around the system. A design system is a <strong>sociotechnical product</strong>:
        half code, half human process. This module covers the governance, contribution, and
        adoption mechanics that determine whether a system thrives or quietly dies — the difference
        between Level 2 and Level 3 maturity from the first module.
      </p>

      <h2 id="system-is-sociotechnical">A System Is Sociotechnical</h2>
      <p>
        The hardest problems in a mature design system are not &ldquo;how do I build a date
        picker&rdquo; but &ldquo;who decides what goes in,&rdquo; &ldquo;how does a product team get
        a component they need next sprint,&rdquo; and &ldquo;why should they use ours instead of
        their own.&rdquo; These are organizational design questions, and answering them well is what
        separates a design-system <em>engineer</em> from a design-system <em>leader</em>.
      </p>

      <h2 id="governance-models">Governance Models</h2>
      <p>
        Nathan Curtis&rsquo;s well-known framing gives three governance shapes, each with a real
        tradeoff between consistency and throughput:
      </p>

      <MermaidDiagram
        chart={modelsDiagram}
        title="Three governance models"
        caption="Centralized maximizes consistency but bottlenecks; federated maximizes throughput but risks fragmentation; hybrid balances both and is most common at scale."
        minHeight={420}
      />

      <ArticleTable
        caption="Governance models and when each fits."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Who builds</th>
              <th>Strength</th>
              <th>Weakness</th>
              <th>Fits</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Centralized</strong></td>
              <td>Dedicated DS team only</td>
              <td>Maximum consistency &amp; quality</td>
              <td>Bottleneck; slow; team can&rsquo;t keep up</td>
              <td>Early systems, small orgs</td>
            </tr>
            <tr>
              <td><strong>Federated</strong></td>
              <td>Many product teams</td>
              <td>High throughput, broad buy-in</td>
              <td>Inconsistency without strong rules</td>
              <td>Large orgs, mature culture</td>
            </tr>
            <tr>
              <td><strong>Hybrid</strong></td>
              <td>Core team curates; teams contribute</td>
              <td>Balances both; scales</td>
              <td>Needs clear process to work</td>
              <td>Most orgs at scale</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <p>
        The pragmatic recommendation for most companies is <strong>hybrid</strong>: a small core
        team owns the foundations (tokens, primitives, standards, review) and curates quality, while
        product teams contribute components they need through a defined process. The core team
        shifts from &ldquo;build everything&rdquo; to &ldquo;enable and gatekeep,&rdquo; which is the
        only way to scale past the team&rsquo;s own capacity.
      </p>

      <h2 id="contribution">The Contribution Model</h2>
      <p>
        For a hybrid model to work, contributing must be <strong>well-paved and well-documented</strong>.
        If contributing is mysterious or painful, teams won&rsquo;t — they&rsquo;ll fork instead, and
        the system stagnates. A good contribution model defines: how to propose, what the quality
        bar is (tokens, a11y, tests, docs — everything in this academy), how review works, and how
        it gets released.
      </p>

      <h3 id="rfc">The RFC Process</h3>
      <p>
        Significant additions go through an <strong>RFC</strong> (Request for Comments): a
        lightweight written proposal stating the problem, the proposed API, alternatives considered,
        and open questions. The RFC does three things: it prevents wasted work (the component might
        already exist, or the API needs rethinking <em>before</em> code), it creates a record of
        <em>why</em> decisions were made, and it gives the community a voice so the system feels
        shared rather than imposed.
      </p>

      <MermaidDiagram
        chart={rfcDiagram}
        title="The RFC contribution flow"
        caption="A need becomes an RFC, reviewed by the core team and community; accepted proposals are built to system standards, then documented and released."
        minHeight={300}
      />

      <CodeBlock
        code={`# RFC: Add a <Combobox> component

## Problem
3 teams have built ad-hoc autocomplete inputs. None are accessible.

## Proposed API
<Combobox value onValueChange>
  <Combobox.Input />
  <Combobox.List>{items.map(i => <Combobox.Option key={i.id} value={i.id}/>)}</Combobox.List>
</Combobox>

## Alternatives considered
- Extend existing <Select> (rejected: filtering/async needs differ)
- Wrap Downshift vs build on React Aria (recommend React Aria for a11y parity)

## Open questions
- Async option loading in v1, or follow-up?  | Multi-select now or later?`}
        lang="markdown"
        filename="rfc-combobox.md"
      />

      <h3 id="tiers">Component Tiers & the Intake Funnel</h3>
      <p>
        Not everything belongs in the core system. A useful pattern is <strong>component tiers</strong>:
        a curated, fully-supported <em>core</em>; a <em>community/lab</em> tier for experimental or
        niche components contributed by teams (lighter support); and explicitly{" "}
        <em>out-of-scope</em> things that stay in product code. This intake funnel keeps the core
        small and high-quality while still giving teams a sanctioned home for shared-but-niche
        components, so they don&rsquo;t fork.
      </p>

      <h2 id="adoption">Driving Adoption</h2>
      <p>
        Building a great system guarantees nothing — adoption is its own discipline. The most
        effective levers:
      </p>
      <ul>
        <li>
          <strong>Make it the path of least resistance:</strong> excellent docs, starter templates,
          and a great DX so using the system is <em>easier</em> than rolling your own.
        </li>
        <li>
          <strong>Reduce migration cost:</strong> codemods, side-by-side adoption, and not forcing
          big-bang rewrites (the versioning module&rsquo;s craft).
        </li>
        <li>
          <strong>Support actively:</strong> office hours, a responsive Slack channel, pairing on
          tricky migrations — the team is a service, not a gate.
        </li>
        <li>
          <strong>Build trust through reliability:</strong> predictable releases, no surprise
          breakage, fast bug fixes. Trust is the real currency.
        </li>
        <li>
          <strong>Executive sponsorship:</strong> for org-wide adoption, leadership backing (and
          sometimes adoption as a goal/OKR) is often decisive.
        </li>
      </ul>

      <h3 id="metrics">Measuring Adoption & Health</h3>
      <p>
        You manage what you measure, so a real system tracks adoption rather than guessing.
        Meaningful metrics: <strong>coverage</strong> (% of UI / components built from the system,
        often via import-graph or lint analysis), <strong>version distribution</strong> (how many
        teams are on the latest vs pinned to old versions), <strong>detachment rate</strong> (how
        often teams override or fork), and <strong>satisfaction</strong> (a periodic pulse survey).
        These tell you where the system is winning and where teams are routing around it — the early
        warning that something needs fixing.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you make a design system succeed organizationally?'"
        intro="This reveals whether you've actually run a system or just built components. Lead with the sociotechnical framing — most systems die for organizational reasons."
        steps={[
          "State that most systems fail organizationally, not technically — it's a sociotechnical product, half code half process.",
          "Pick a governance model (usually hybrid: small core curates + reviews, product teams contribute) and explain the consistency/throughput tradeoff.",
          "Define a paved contribution path with an RFC process so significant additions are designed before built and decisions are recorded.",
          "Use component tiers (core / community / out-of-scope) to keep the core small and high quality while giving niche components a sanctioned home.",
          "Drive adoption deliberately: best DX, low migration cost, active support, reliability/trust, exec sponsorship — and MEASURE it (coverage, version spread, detachment).",
        ]}
      />

      <InterviewChallenge
        title="The system everyone ignores"
        scenario={
          <>
            A company spent a year building a polished, accessible, well-tested design system with a
            5-person central team. A year later, only 2 of 12 product teams use it. The other teams
            say it&rsquo;s &ldquo;missing components we need,&rdquo; &ldquo;requests take months,&rdquo;
            and &ldquo;it&rsquo;s easier to just build our own.&rdquo; Leadership is questioning the
            investment.
          </>
        }
        tasks={[
          "Diagnose the failure — it's not the component quality.",
          "Propose governance and process changes to turn it around.",
          "Define the metrics you'd use to prove the turnaround is working.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Diagnosis: a centralized model hit its capacity ceiling.</strong> Five people
            can&rsquo;t serve twelve teams&rsquo; component needs, so requests queue for months,
            teams build their own out of necessity, and the system is perpetually &ldquo;missing&rdquo;
            things. The quality is irrelevant if the system can&rsquo;t deliver what teams need when
            they need it. This is the classic bottleneck failure.
          </p>
          <p>
            <strong>Turnaround → shift to hybrid governance.</strong> The core team stops trying to
            build everything and instead: (1) opens a <strong>contribution model</strong> with an
            RFC process and a clear quality bar, so the twelve teams become contributors; (2) the
            core team&rsquo;s job becomes enabling + reviewing + owning foundations, not being the
            sole builder; (3) introduce <strong>component tiers</strong> so niche needs have a
            community home instead of forking; (4) invest in DX, docs, codemods, and office hours so
            using/contributing is easier than forking.
          </p>
          <p>
            <strong>Prove it:</strong> track <em>coverage</em> (% of UI from the system) climbing,
            <em>contribution rate</em> from non-core teams rising, request <em>lead time</em>{" "}
            dropping, <em>version distribution</em> consolidating on latest, and a satisfaction
            pulse improving. Report these to leadership as the ROI story. The goal state: using the
            system is the path of least resistance and teams <em>want</em> to contribute to it.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Design systems mostly fail <strong>organizationally, not technically</strong> — treat the
          system as a sociotechnical product.
        </li>
        <li>
          Choose a <strong>governance model</strong> (usually hybrid: small core curates, product
          teams contribute) to balance consistency vs throughput.
        </li>
        <li>
          A centralized team is a <strong>bottleneck</strong> at scale; the path past its capacity
          is enabling federated contribution.
        </li>
        <li>
          Define a paved <strong>contribution model with RFCs</strong> and <strong>component
          tiers</strong> to keep the core small and high quality.
        </li>
        <li>
          <strong>Adoption is a discipline</strong>: best DX, low migration cost, active support,
          reliability/trust, and exec sponsorship.
        </li>
        <li>
          <strong>Measure</strong> coverage, version distribution, detachment, and satisfaction —
          you manage what you measure.
        </li>
      </ul>
    </div>
  );
}
