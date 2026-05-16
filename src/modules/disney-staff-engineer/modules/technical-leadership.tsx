import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const staffVsSeniorDiagram = String.raw`flowchart TD
  SR["Senior Engineer\nDelivers features\nOwns specific area\nSolves defined problems"]
  STAFF["Staff Engineer\nDefines what to build\nOwns cross-team surface\nSolves ambiguous problems"]
  SR -->|"scope expansion"| STAFF
  STAFF --> A["Technical strategy\nacross multiple teams"]
  STAFF --> B["Architectural decisions\nwith long-term impact"]
  STAFF --> C["Unblocking other engineers\nby resolving ambiguity"]
  STAFF --> D["Raising the floor\ncode quality across org"]`;

const rfcProcessDiagram = String.raw`sequenceDiagram
  participant SE as Staff Engineer
  participant TEAM as Engineering Team
  participant EM as Engineering Manager
  participant STAKE as Stakeholders

  SE->>SE: Identify problem + research options
  SE->>TEAM: Draft RFC document (problem, options, recommendation)
  TEAM->>SE: Async comments + questions (48-72h)
  SE->>SE: Incorporate feedback, update RFC
  SE->>TEAM: RFC review meeting (30-60 min)
  TEAM->>SE: Raise blocking concerns
  SE->>EM: Escalate unresolved disagreements
  EM->>SE: Final decision (rare — aim for consensus)
  SE->>STAKE: Communicate decision + rationale
  SE->>TEAM: ADR created — decision recorded permanently`;

export const toc: TocItem[] = [
  { id: "staff-mindset", title: "The Staff Engineer Mindset", level: 2 },
  { id: "scope-vs-senior", title: "Staff vs Senior: The Difference", level: 3 },
  { id: "adrs", title: "Architecture Decision Records (ADRs)", level: 2 },
  { id: "adr-format", title: "ADR Format", level: 3 },
  { id: "when-to-write", title: "When to Write an ADR", level: 3 },
  { id: "rfc-process", title: "Technical RFC Process", level: 2 },
  { id: "rfc-template", title: "RFC Template", level: 3 },
  { id: "building-consensus", title: "Building Consensus", level: 3 },
  { id: "code-review-leadership", title: "Code Review as Leadership", level: 2 },
  { id: "review-philosophy", title: "Review Philosophy", level: 3 },
  { id: "technical-debt", title: "Managing Technical Debt", level: 2 },
  { id: "debt-taxonomy", title: "Debt Taxonomy", level: 3 },
  { id: "debt-payoff", title: "Debt Payoff Strategy", level: 3 },
  { id: "mentoring-seniors", title: "Mentoring Senior Engineers", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Leadership Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TechnicalLeadership() {
  return (
    <div className="article-content">
      <p>
        Disney&apos;s JD describes exactly the staff engineer scope: &quot;lead projects by working
        closely with engineering and product teams,&quot; &quot;serve as a go-to person for
        sophisticated technical challenges,&quot; and &quot;support and mentor senior developers.&quot;
        This module builds the mental model and concrete tools for operating at that level.
      </p>

      <h2 id="staff-mindset">The Staff Engineer Mindset</h2>
      <p>
        The most common mistake of engineers newly promoted to staff is continuing to operate
        as a very productive senior engineer. The job description changes fundamentally at the
        staff level: you are no longer primarily measured on your individual output. You are
        measured on your <strong>organizational leverage</strong> — how much better the engineers
        around you perform because of your presence.
      </p>

      <MermaidDiagram
        chart={staffVsSeniorDiagram}
        title="Staff vs Senior Engineer Scope"
        caption="A senior engineer delivers features. A staff engineer defines what to build and removes the obstacles that prevent others from delivering. Both write code — the difference is scope."
        minHeight={340}
      />

      <h3 id="scope-vs-senior">Staff vs Senior: The Difference</h3>

      <ArticleTable caption="How staff and senior engineers differ on key dimensions." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Senior Engineer</th>
              <th>Staff Engineer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Primary output</td>
              <td>Features and code</td>
              <td>Decisions, specs, and unblocking others</td>
            </tr>
            <tr>
              <td>Problem type</td>
              <td>Defined — requirements are clear</td>
              <td>Ambiguous — requirements need to be clarified or created</td>
            </tr>
            <tr>
              <td>Scope</td>
              <td>One team / one system</td>
              <td>Multiple teams, cross-cutting concerns</td>
            </tr>
            <tr>
              <td>Technical decisions</td>
              <td>Makes decisions within their area</td>
              <td>Defines the decision-making process for the org</td>
            </tr>
            <tr>
              <td>Success metric</td>
              <td>My features shipped, my tests pass</td>
              <td>My team ships faster and with fewer incidents than without me</td>
            </tr>
            <tr>
              <td>Knowledge sharing</td>
              <td>Answers questions when asked</td>
              <td>Proactively identifies knowledge gaps and fills them</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="adrs">Architecture Decision Records (ADRs)</h2>
      <p>
        ADRs are short documents that record significant architectural decisions — what was
        decided, why it was decided, and what alternatives were considered. They solve a critical
        organizational problem: six months from now, why did we choose to use Module Federation
        instead of a monorepo? Without an ADR, that knowledge lives only in the heads of the
        engineers who were in the meeting.
      </p>

      <h3 id="adr-format">ADR Format</h3>
      <p>
        The Michael Nygard format is the most widely adopted. Keep ADRs short — 1 to 2 pages
        maximum. The goal is decision capture, not architecture documentation.
      </p>
      <pre><code>{`# ADR-0012: Use Module Federation for Disney+ / ESPN Micro-Frontend Integration

## Status
Accepted — 2026-03-15

## Context
Disney+ and ESPN share user authentication and the Disney design system, but are
owned by independent product teams with separate deployment cadences. The teams
need to integrate at runtime (shared header, cross-product navigation) without
requiring synchronized deployments.

## Decision
We will use Webpack 5 Module Federation. The Shell app (owned by Platform team)
will host the shared design system and auth context. Each product team owns their
own remote MFE and deploys independently.

## Alternatives Considered
1. Monorepo with shared packages — rejected. Teams cannot deploy independently;
   a breaking change in one package blocks all teams.

2. iframes — rejected. Auth sharing is complex, URL routing is awkward, and
   performance degrades significantly on TV clients.

3. Single shared Next.js app — rejected. Merge contention across teams would
   slow everyone down. Shared CI pipeline creates a bottleneck.

## Consequences
Positive:
- Independent deployment per product team
- No merge contention between teams

Negative:
- All teams must use the same React version (singleton constraint)
- Platform team becomes a dependency for design system updates
- Increased build complexity

## Decision Owner
Juan Montana (Staff Engineer, Frontend Platform)`}</code></pre>

      <h3 id="when-to-write">When to Write an ADR</h3>
      <p>
        Not every decision needs an ADR. Write one when the decision is:
        <strong> hard to reverse</strong>, <strong>cross-team in impact</strong>, or
        <strong> likely to be questioned later</strong>. Simple decisions — which npm package to
        use for date formatting — do not need ADRs. Choosing the state management strategy for
        the entire frontend platform does.
      </p>

      <h2 id="rfc-process">Technical RFC Process</h2>
      <p>
        An RFC (Request for Comment) is a document that proposes a significant technical
        change and solicits feedback before commitment. It is the mechanism by which staff
        engineers build consensus rather than imposing decisions. The RFC process respects
        that the people doing the implementation often know more about the problems than the
        architect does.
      </p>

      <MermaidDiagram
        chart={rfcProcessDiagram}
        title="RFC Lifecycle — from Problem to ADR"
        caption="The RFC process builds consensus through async feedback before any synchronous meeting. Most disagreements surface in async comments — the review meeting handles only unresolved blocking concerns."
        minHeight={400}
      />

      <h3 id="rfc-template">RFC Template</h3>
      <pre><code>{`# RFC: [Title]

## Problem Statement
What specific problem are we solving? Why does it matter now?

## Scope
What is in scope? What is explicitly out of scope?

## Proposed Solution
Describe the recommended approach in enough detail for engineers to evaluate it.

## Alternatives Considered
What other approaches were evaluated? Why were they rejected?

## Migration Plan (if applicable)
How do existing systems migrate to the new approach? What is the rollout plan?

## Risks and Mitigations
What could go wrong? How do we detect it? How do we recover?

## Success Metrics
How do we know this worked? What do we measure?

## Open Questions
What is still unresolved? What needs input?

## Timeline
What is the proposed implementation timeline and who is responsible for each phase?

---
Author: [Name]
Date: [YYYY-MM-DD]
Status: Draft | In Review | Accepted | Rejected | Superseded`}</code></pre>

      <h3 id="building-consensus">Building Consensus</h3>
      <p>
        The most common failure mode for staff engineers writing RFCs: presenting a solution
        without adequately framing the problem. If engineers do not agree that the problem is
        real and significant, they will not buy into any solution. Always make the problem
        statement the strongest part of the RFC.
      </p>
      <pre><code>{`// Bad RFC problem statement:
"We should migrate from Redux to Zustand."

// Why it fails: this is a solution, not a problem statement.
// Engineers who like Redux will immediately go on the defensive.

// Good RFC problem statement:
"Our Redux setup requires ~120 lines of boilerplate per feature slice
(actions, reducers, selectors, tests). New engineers spend 2-3 hours
understanding the pattern before they can contribute. Our last audit showed
6 out of 10 new engineers made mistakes in selector memoization that caused
production re-render issues. We need to evaluate whether the boilerplate
cost is worth the benefit we're getting."

// Why it works: the problem is specific, measurable, and developer-experience
// focused. Even Redux advocates will agree the described pain is real.`}</code></pre>

      <h2 id="code-review-leadership">Code Review as Leadership</h2>

      <h3 id="review-philosophy">Review Philosophy</h3>
      <p>
        At the staff level, code reviews serve three purposes simultaneously: ensuring
        correctness, transferring knowledge, and raising the quality bar across the team.
        The most impactful reviewers do not just catch bugs — they leave comments that
        teach the author to think differently.
      </p>
      <pre><code>{`// Ineffective review comment — describes what, not why
// "This should use useMemo here."

// Effective review comment — explains the principle
// "This sort runs on every render, and it receives a new array reference
// each time from the parent (see line 34 where a new array literal is created).
// useMemo with [items] as the dependency would memoize it. That said, profile
// first — if the items array is small (<100), the sort is probably faster
// than the memoization overhead. See [link to our performance doc] for the
// threshold we've established for this codebase."

// Review comment categories by intent:
// [blocking] — must fix before merge: correctness, security, perf regression
// [suggestion] — worth considering, author's call
// [question] — I want to understand, not necessarily change
// [praise] — call out excellent patterns explicitly

// Example praise comment (often forgotten):
// "I love this pattern for the error boundary — making the retry callback
// configurable makes it much easier to test. I'm going to suggest this
// approach to the other teams working on async boundaries."`}</code></pre>

      <h2 id="technical-debt">Managing Technical Debt</h2>

      <h3 id="debt-taxonomy">Debt Taxonomy</h3>
      <p>
        Not all technical debt is equal. The Ward Cunningham definition — taking a deliberate
        shortcut to deliver faster, with the intention to pay it back — describes only one
        type. Most production debt is unintentional or reckless. Classifying debt determines
        how urgently it must be paid.
      </p>

      <ArticleTable caption="Technical debt taxonomy — type, cause, and priority strategy." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Cause</th>
              <th>Example</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deliberate, prudent</td>
              <td>Intentional shortcut under time pressure</td>
              <td>&quot;Ship the MVP without caching; add Redis in Q3&quot;</td>
              <td>Schedule for known date</td>
            </tr>
            <tr>
              <td>Inadvertent, prudent</td>
              <td>Learned a better way after the fact</td>
              <td>Legacy Redux code before Toolkit existed</td>
              <td>Migrate opportunistically with each feature touch</td>
            </tr>
            <tr>
              <td>Deliberate, reckless</td>
              <td>Knowingly skipped best practice with no plan to fix</td>
              <td>Hard-coded API keys in frontend code</td>
              <td>Block release — fix now</td>
            </tr>
            <tr>
              <td>Inadvertent, reckless</td>
              <td>Wrote bad code without knowing it was bad</td>
              <td>N+1 queries, memory leaks, no error handling</td>
              <td>Fix when discovered in production metrics</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="debt-payoff">Debt Payoff Strategy</h3>
      <p>
        The boy scout rule — &quot;leave the code better than you found it&quot; — works for
        small improvements but fails for large refactors. Trying to refactor a system while
        adding features leads to incomplete refactors that create more debt than they eliminate.
        The staff-level approach: classify debt, size it, and negotiate dedicated time in the
        roadmap for the large items.
      </p>
      <pre><code>{`// Debt inventory — quarterly exercise
const debtInventory = [
  {
    id: "D-001",
    description: "Redux → Zustand migration for UI state",
    type: "inadvertent-prudent",
    impactScore: 7,       // 1-10: developer velocity impact
    effortDays: 5,
    roi: 1.4,             // impactScore / effortDays
    status: "backlog",
  },
  {
    id: "D-002",
    description: "Remove all uses of 'as any' in the payments module",
    type: "inadvertent-reckless",
    impactScore: 9,       // type safety hole near payments
    effortDays: 2,
    roi: 4.5,             // high ROI — do first
    status: "scheduled",
  },
];

// Staff engineer debt conversation with PM:
// "This debt is costing us ~2 hours per engineer per week in investigation time
// and about 1 production incident per quarter. I estimate 5 engineer-days to fix
// it permanently. The ROI pays off in 6 weeks. I'd like to schedule it in Q3."

// This is the language that converts technical debt into business investment.`}</code></pre>

      <h2 id="mentoring-seniors">Mentoring Senior Engineers</h2>
      <p>
        Mentoring senior engineers is different from mentoring junior or mid-level engineers.
        Senior engineers have strong technical opinions. The most effective approach is
        <strong> Socratic</strong> — ask questions that help them see the gap, rather than
        telling them the answer.
      </p>
      <pre><code>{`// Scenario: A senior engineer proposes storing derived state in Redux
// (e.g., a "filteredContent" field that is computed from "content" + "activeFilters")

// Ineffective feedback:
"You shouldn't store derived state in Redux. Use a selector instead."
// Why it fails: directive, no explanation, will be resented

// Effective mentoring approach:
"I see filteredContent gets updated whenever activeFilters changes.
What happens to filteredContent if content updates but we forget to
also filter it? Have you considered using a memoized selector like
createSelector from reselect? I'd be curious to hear your thoughts
on why you chose state vs selector here — there might be a reason I'm
missing."

// Why it works:
// 1. Points at the failure mode without prescribing the fix
// 2. Names an alternative for them to evaluate
// 3. Acknowledges their agency — "there might be a reason I'm missing"
// 4. Asks them to articulate their reasoning — helps them find the gap themselves`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Tell me about a time you drove a major architectural change.'"
        intro="This is the canonical staff engineer behavioral question. Disney wants to see process, stakeholder management, and organizational impact — not just technical correctness."
        steps={[
          "Set the context clearly: name the system, the size of the team, and why the change was necessary — frame it as a business problem, not a tech preference.",
          "Describe how you built the case: 'I ran a two-week analysis to quantify the cost of the current approach — X incident per quarter, Y hours of developer time per week. That gave me the business ROI for the proposed change.'",
          "Name the consensus-building steps: RFC document, async review period, review meeting, addressing blocking concerns, who the final decision-makers were.",
          "Be explicit about what you delegated: 'I didn't implement it alone — I wrote the spec and the first reference implementation, then coached three senior engineers through the migration of their systems.'",
          "Quantify the outcome: improved deploy frequency, reduced incident rate, reduced onboarding time. If you don't have numbers, be honest: 'I didn't measure it formally, but anecdotally...'",
        ]}
      />

      <InterviewChallenge
        title="Leadership Challenge: The Great State Management Debate"
        scenario={
          <>
            Two senior engineers on your team are in a heated disagreement. Engineer A wants
            to migrate from Redux Toolkit to Zustand, citing boilerplate reduction. Engineer B
            insists Redux is correct because of time-travel debugging and DevTools. The debate
            has been going on for two sprints. Teammates are getting frustrated. The team
            lead escalates it to you as the staff engineer to resolve.
          </>
        }
        tasks={[
          "What is your first step? Do you immediately make a decision, or do you do something else first?",
          "How do you structure the conversation with both engineers individually before bringing them together?",
          "What criteria would you use to evaluate the two options objectively?",
          "How do you handle the situation if, after your analysis, you agree with Engineer B but Engineer A has strong senior IC influence on the team?",
          "What artifact do you produce at the end of this process? Write the first paragraph of that document.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Organizational leverage</strong> is the primary metric for staff engineers — how much better does the team perform because of your presence?</li>
        <li><strong>ADRs</strong> capture the &quot;why&quot; behind architectural decisions so future engineers don&apos;t repeat the same debates six months later.</li>
        <li><strong>The RFC process</strong> builds consensus by soliciting async feedback before any synchronous meeting — most blocking concerns surface in writing, not in meetings.</li>
        <li><strong>Code reviews</strong> at the staff level teach principles, not just fix bugs — the best comments explain WHY, reference the failure mode, and name alternatives.</li>
        <li><strong>Technical debt classification</strong> converts vague technical concerns into business investment conversations with measurable ROI.</li>
        <li><strong>Mentoring seniors</strong> requires Socratic questioning, not directives — help them see the gap themselves, then they own the insight.</li>
      </ul>
    </div>
  );
}
