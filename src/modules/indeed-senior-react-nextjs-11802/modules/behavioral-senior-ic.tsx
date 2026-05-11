import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const starDiagram = String.raw`flowchart LR
    S["SITUATION\n10% of answer\n\nBrief context:\ncompany, team, project\nDo NOT over-explain"]
    T["TASK\n10% of answer\n\nYour specific responsibility\n'I was responsible for...'"]
    A["ACTION\n60% of answer\n\nExactly what YOU did\nUse 'I', not 'we'\nDecisions + tradeoffs"]
    R["RESULT\n20% of answer\n\nQuantified outcome:\nLCP: 4.2s → 1.8s\nBundle: 2.1MB → 680KB\nTicket volume -30%"]

    S --> T --> A --> R

    style S fill:#1a1a2a,stroke:#6366f1
    style T fill:#1a1a2a,stroke:#f59e0b
    style A fill:#1a1a2a,stroke:#22c55e
    style R fill:#1a1a2a,stroke:#38bdf8`;

const storyMatrixDiagram = String.raw`flowchart TD
    P1["Story 1: Performance Win\nLCP 4.2s → 1.8s via ISR + Redis cache\nBundle 2.1MB → 680KB (code splitting)"]
    P2["Story 2: Technical Decision\nChose ISR over SSR for article pages\nLed architecture decision without full consensus"]
    P3["Story 3: Process Improvement\nIntroduced Playwright E2E in CI pipeline\nReduced regressions, improved deploy confidence"]
    P4["Story 4: Conflict Resolution\nDesign disagreement with PM on rendering strategy\nNavigated with data, aligned stakeholders"]
    P5["Story 5: Fast Learning\nLearned Contentstack in 2 weeks\nWent from zero to first article page in production"]

    Q1["Impact / Results"]
    Q2["Technical Decision / Ambiguity"]
    Q3["Initiative / Leadership"]
    Q4["Conflict / Disagreement"]
    Q5["Growth / Learning"]
    Q6["Failure / What You'd Do Differently"]

    P1 -->|"primary"| Q1
    P2 -->|"primary"| Q2
    P3 -->|"primary"| Q3
    P4 -->|"primary"| Q4
    P5 -->|"primary"| Q5

    P2 -->|"also covers"| Q3
    P3 -->|"also covers"| Q1
    P4 -->|"also covers"| Q2
    P1 -->|"what I'd do differently"| Q6
    P2 -->|"what I'd do differently"| Q6

    style P1 fill:#1a2a1a,stroke:#22c55e
    style P2 fill:#1a1a2a,stroke:#6366f1
    style P3 fill:#2a1a2a,stroke:#a855f7
    style P4 fill:#2a1a1a,stroke:#ef4444
    style P5 fill:#1a2a2a,stroke:#38bdf8`;

export const toc: TocItem[] = [
  { id: "star-framework", title: "The STAR Framework with Time Budget", level: 2 },
  { id: "five-core-stories", title: "The Five Core Stories", level: 2 },
  { id: "indeed-specific-questions", title: "Indeed-Specific Questions to Prepare", level: 2 },
  { id: "story-matrix", title: "Story Matrix: One Story, Multiple Questions", level: 2 },
  { id: "questions-to-ask-indeed", title: "Questions to Ask Indeed", level: 2 },
  { id: "opening-pitch", title: "The Opening Pitch: Tell Me About Yourself", level: 2 },
  { id: "interview-framing", title: "Interview Playbook", level: 2 },
  { id: "key-takeaways", title: "Interview Challenge", level: 2 },
];

export default function BehavioralSeniorIc() {
  return (
    <div className="article-content">
      <p>
        Behavioral interviews at a senior IC level are not a formality — at Indeed, they carry
        significant weight in the hiring decision. Senior engineers are expected to influence
        technical direction, navigate ambiguity, and drive measurable outcomes. This module gives
        you the structure, the specific stories, and the exact questions you will face.
      </p>

      <h2 id="star-framework">The STAR Framework with Time Budget</h2>
      <MermaidDiagram
        chart={starDiagram}
        title="STAR Format with Time Budget"
        caption="The most common STAR failure mode is spending 40% of the answer on Situation and running out of time before explaining what YOU actually did. The action — specifically your individual decisions and tradeoffs — is what interviewers evaluate."
        minHeight={260}
      />

      <p>
        For a 4-minute behavioral answer, the time budget looks like this:
      </p>
      <ul>
        <li>
          <strong>Situation (25 seconds):</strong> One sentence. &quot;At my previous company, we
          built a CMS-backed Help Center for 2M monthly users.&quot; Do not describe the entire
          company history.
        </li>
        <li>
          <strong>Task (25 seconds):</strong> One sentence about your specific role. &quot;I was
          responsible for the rendering architecture and caching strategy.&quot; Use &quot;I&quot;
          not &quot;we&quot; — the interviewer cannot evaluate the team.
        </li>
        <li>
          <strong>Action (2.5 minutes):</strong> Walk through exactly what you did, step by step.
          Include: the decision you made, the alternatives you considered, the tradeoffs you
          evaluated, and how you got buy-in. This is where seniority shows.
        </li>
        <li>
          <strong>Result (45 seconds):</strong> Quantified outcomes. LCP dropped from 4.2s to
          1.8s. Bundle size reduced from 2.1MB to 680KB. Support ticket volume down 30% following
          the article redesign. Numbers matter — they anchor your story in reality.
        </li>
      </ul>

      <h2 id="five-core-stories">The Five Core Stories</h2>
      <p>
        You need five adaptable stories. Each story should be answerable to multiple question types —
        this is more efficient than preparing a separate story for every possible question. Build
        the stories around real projects, then practice adapting them to different question framings.
      </p>

      <pre>
        <code>{`// Story 1: Performance Win
// Core: improved LCP from 4.2s to 1.8s on a CMS-backed article page
// Technologies: Next.js ISR, Redis, code splitting, image optimization
// My role: identified the bottleneck (sequential CMS fetches), designed the fix,
//          implemented Redis cache layer, ran the performance measurements

// Adaptable to questions about:
// - "Tell me about a time you improved performance" (primary framing)
// - "Describe a time you had significant technical impact" (result focus)
// - "Tell me about a time you made a data-driven decision" (process focus)
// - "What's something you'd do differently?" (used Promise.all earlier)

// Story 2: Technical Decision Under Ambiguity
// Core: chose ISR over SSR for the Help Center article pages
//       despite pushback from a PM who wanted "always fresh" content
// My role: analyzed the tradeoffs (SSR = 200ms added latency per request,
//          ISR = possible 1-hour stale window), proposed webhook-based on-demand
//          revalidation as the solution to the freshness concern, got alignment

// Adaptable to questions about:
// - "Tell me about a time you led a technical decision without full consensus"
// - "Describe a time you disagreed with a stakeholder and what happened"
// - "How do you handle unclear requirements?"
// - "Tell me about a technical tradeoff you navigated"

// Story 3: Process / DX Improvement
// Core: introduced Playwright E2E tests in the CI pipeline for the Help Center
//       — previously there were zero browser tests, only unit tests
// My role: identified the gap (unit tests passed but regressions shipped),
//          proposed and implemented the Playwright suite,
//          documented the pattern so other engineers could add tests

// Adaptable to questions about:
// - "Tell me about a time you improved a process or team velocity"
// - "Describe something you did that wasn't asked of you (initiative)"
// - "How do you approach quality at a team level?"

// Story 4: Conflict Resolution
// Core: disagreed with the design team's proposal to use client-side rendering
//       for article pages (they wanted a SPA feel), advocated for SSG+ISR
// My role: brought performance data (CSR article pages score 35 on PageSpeed,
//          SSG pages score 94), facilitated a meeting, proposed a hybrid approach
//          (static article shell + client-side personalization widgets)

// Adaptable to questions about:
// - "Tell me about a time you disagreed with a colleague"
// - "How do you handle conflict within a team?"
// - "Describe a time you had to influence without authority"

// Story 5: Fast Learning (Contentstack)
// Core: joined a team where all article content lived in Contentstack —
//       had never used it before, was productive in 2 weeks
// My role: read the official docs, built a prototype in week 1,
//          paired with the CMS editors to understand their workflow,
//          shipped the first article page integration by end of week 2

// Adaptable to questions about:
// - "Tell me about a time you had to learn a new technology quickly"
// - "How do you onboard to a new codebase or technology?"
// - "Describe a time you were outside your comfort zone"`}</code>
      </pre>

      <h2 id="indeed-specific-questions">Indeed-Specific Questions to Prepare</h2>
      <p>
        Based on the role description for this specific position, these are the questions most
        likely to come up. Map each to one of your five core stories before the interview.
      </p>
      <ul>
        <li>
          <strong>&quot;Tell me about a time you improved developer experience on your team.&quot;</strong>{" "}
          → Story 3 (Playwright E2E). Focus on: what the DX pain was, how you identified it, what
          you built, and what measurable improvement resulted (e.g., &quot;CI catch rate for UI
          regressions went from 0% to 85%&quot;).
        </li>
        <li>
          <strong>&quot;How do you handle unclear or changing requirements?&quot;</strong>{" "}
          → Story 2 (ISR vs SSR decision). Focus on: you asked clarifying questions about freshness
          SLA, identified that &quot;always fresh&quot; actually meant &quot;within 5 minutes&quot;
          (not real-time), and designed a webhook-based solution that met the real requirement.
        </li>
        <li>
          <strong>&quot;Describe a time you had to learn a new technology quickly.&quot;</strong>{" "}
          → Story 5 (Contentstack). This is a perfect fit for this role — use it verbatim.
          Emphasize: your learning process, how quickly you became productive, and what you built.
        </li>
        <li>
          <strong>&quot;Tell me about a significant performance win.&quot;</strong>{" "}
          → Story 1 (LCP 4.2s → 1.8s). Mention specific numbers, the diagnostic process
          (Chrome DevTools, Lighthouse, Datadog RUM), and the specific changes made.
        </li>
        <li>
          <strong>&quot;How do you balance technical debt vs new features?&quot;</strong>{" "}
          → Prepare a specific answer about the Playwright introduction (Story 3): you proposed the
          investment by framing it as &quot;3 days of test writing now vs. 1-2 days of regression
          debugging per sprint&quot; — made the case with data, got time allocated.
        </li>
      </ul>

      <h2 id="story-matrix">Story Matrix: One Story, Multiple Questions</h2>
      <MermaidDiagram
        chart={storyMatrixDiagram}
        title="Story Matrix: 5 Stories Mapped to Question Types"
        caption="Each story covers multiple question types. Story 2 (ISR architecture decision) answers questions about technical decisions, conflict, and initiative — and can end with 'what I'd do differently' for failure/learning questions."
        minHeight={480}
      />

      <h2 id="questions-to-ask-indeed">Questions to Ask Indeed</h2>
      <ArticleTable
        caption="Good questions signal curiosity, senior judgment, and genuine interest in the role. Bad questions signal that you didn't research the company. These questions work for an Indeed Help Center engineering role."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>What It Signals About You</th>
              <th>What a Good Answer Tells You About the Team</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>&quot;How often does the team deploy to production? What does your CI/CD pipeline look like?&quot;</td>
              <td>You care about engineering velocity and deploy safety</td>
              <td>Daily deploys with feature flags = mature team; monthly deploy = legacy process</td>
            </tr>
            <tr>
              <td>&quot;How does the content model evolve over time? Who makes decisions about schema changes in Contentstack?&quot;</td>
              <td>You understand CMS governance is a real engineering concern, not just a product concern</td>
              <td>Clear schema ownership = healthier CMS; &quot;anyone can change it&quot; = future technical debt</td>
            </tr>
            <tr>
              <td>&quot;Is this team primarily frontend-only, or do frontend engineers own backend services too?&quot;</td>
              <td>You want to understand scope and ownership boundaries</td>
              <td>Full-stack ownership = more context and impact; siloed = clearer focus</td>
            </tr>
            <tr>
              <td>&quot;How is performance measured and owned? Is there an SLA for Core Web Vitals?&quot;</td>
              <td>You prioritize measurable quality over just shipping features</td>
              <td>Explicit SLAs with alerting = mature quality culture; &quot;we look at Lighthouse sometimes&quot; = room for impact</td>
            </tr>
            <tr>
              <td>&quot;What does success look like for this role in the first 90 days?&quot;</td>
              <td>You are already thinking about how to contribute quickly</td>
              <td>Clear 30/60/90 plan = organized team; vague answer = unclear expectations (investigate further)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="opening-pitch">The Opening Pitch: Tell Me About Yourself</h2>
      <p>
        &quot;Tell me about yourself&quot; is always the first question. You have 90 seconds.
        This is not a life history — it is a professional pitch anchored to this specific role
        at Indeed. Here is the structure:
      </p>
      <ol>
        <li>
          <strong>Current position + tenure (10 seconds):</strong> &quot;I have been a senior
          frontend engineer at [Company] for the past [N] years, primarily working on...&quot;
        </li>
        <li>
          <strong>Relevant technical depth (20 seconds):</strong> Anchor on the three technical
          areas most relevant to this role: React/Next.js depth, CMS integration experience,
          performance work. &quot;My core focus has been building CMS-backed content platforms
          with Next.js — specifically ISR, performance optimization, and making headless CMS
          architectures scalable.&quot;
        </li>
        <li>
          <strong>One concrete win (30 seconds):</strong> Pick your strongest result. &quot;Most
          recently, I led the rendering architecture for a Help Center with 10,000 articles and
          2M monthly users — reduced LCP from 4.2s to 1.8s by moving from SSR to ISR with a
          Redis cache layer, which also eliminated Contentstack rate limit errors during traffic
          spikes.&quot;
        </li>
        <li>
          <strong>Why Indeed, why this role (20 seconds):</strong> Be specific — not &quot;I love
          your mission.&quot; Something like: &quot;I am particularly interested in the scale of
          the Indeed Help Center — 50+ languages, millions of users — and the Contentstack
          integration work. This matches exactly the type of technical problems I find most
          engaging.&quot;
        </li>
        <li>
          <strong>Hand it back (10 seconds):</strong> &quot;I am excited to learn more about how
          the team operates. What aspects of the role should I focus on first?&quot; This
          redirects the conversation and shows confidence.
        </li>
      </ol>

      <ArticleTable
        caption="Senior IC behavioral questions mapped to core stories, with emphasis for each question type."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Common Question</th>
              <th>Best Story</th>
              <th>Key Emphasis for This Question</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tell me about a significant performance improvement</td>
              <td>Story 1 (LCP win)</td>
              <td>Diagnostic process + specific numbers + your individual contribution</td>
            </tr>
            <tr>
              <td>Describe a technical decision under ambiguity</td>
              <td>Story 2 (ISR vs SSR)</td>
              <td>Alternatives considered + data used to decide + how you got alignment</td>
            </tr>
            <tr>
              <td>Tell me about a time you improved developer experience</td>
              <td>Story 3 (Playwright in CI)</td>
              <td>Pain point identified + your proposal + measurable DX improvement</td>
            </tr>
            <tr>
              <td>How do you handle conflict with a colleague?</td>
              <td>Story 4 (CSR vs SSG disagreement)</td>
              <td>How you used data to reframe the conversation, not win an argument</td>
            </tr>
            <tr>
              <td>Tell me about learning a new technology quickly</td>
              <td>Story 5 (Contentstack)</td>
              <td>Learning process + how quickly productive + what you shipped</td>
            </tr>
            <tr>
              <td>Describe a time you influenced without authority</td>
              <td>Story 2 or Story 4</td>
              <td>How you built the case + who you aligned + what changed</td>
            </tr>
            <tr>
              <td>What's something you'd do differently?</td>
              <td>Story 1 (add: earlier Redis)</td>
              <td>Genuine reflection + specific change + what you learned</td>
            </tr>
            <tr>
              <td>Tell me about an initiative you took</td>
              <td>Story 3 (Playwright)</td>
              <td>It was not asked of you + you saw the gap + you drove the solution</td>
            </tr>
            <tr>
              <td>How do you handle unclear requirements?</td>
              <td>Story 2 (freshness SLA)</td>
              <td>The question you asked that unlocked the real requirement</td>
            </tr>
            <tr>
              <td>Describe a time you balanced tech debt vs features</td>
              <td>Story 3 (Playwright ROI)</td>
              <td>How you framed it as an ROI argument, not a &quot;quality matters&quot; speech</td>
            </tr>
            <tr>
              <td>Tell me about a failure</td>
              <td>Story 1 or 2 (what I&apos;d do differently)</td>
              <td>Honest about the mistake, clear on what you learned, no blame</td>
            </tr>
            <tr>
              <td>How do you prioritize when everything is urgent?</td>
              <td>New story or combine 2+3</td>
              <td>Framework you use + example of the tradeoff you made</td>
            </tr>
            <tr>
              <td>Describe your ideal team culture</td>
              <td>Not a STAR story — opinion question</td>
              <td>Psychological safety, async communication, blameless postmortems</td>
            </tr>
            <tr>
              <td>Where do you want to be in 5 years?</td>
              <td>Not a STAR story — direction question</td>
              <td>Senior IC track, deeper technical leadership, CMS/content platform expertise</td>
            </tr>
            <tr>
              <td>Tell me about yourself</td>
              <td>Use the 90-second pitch above</td>
              <td>Technical depth → concrete win → why Indeed specifically</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Playbook</h2>
      <InterviewPlaybook
        title="Tell me about yourself — scripted 90-second opening pitch for the Indeed Help Center role"
        intro="Deliver this pitch naturally, not recited. Practice it until it sounds like you are thinking aloud, not reading a script. The goal is to establish technical credibility in the first 90 seconds so the rest of the conversation starts from a position of strength."
        steps={[
          "Current role (10 sec): 'I am a senior frontend engineer with [N] years of experience, most recently at [Company] where I focused on building scalable content platforms with Next.js.'",
          "Technical depth for this role (25 sec): 'My core work has been at the intersection of CMS-backed content delivery and frontend performance — specifically ISR, rendering strategy decisions, and building Redis cache layers between Next.js and headless CMS APIs. I have worked extensively with Contentstack in the last [N] years.'",
          "Concrete win with numbers (30 sec): 'A recent highlight: I led the rendering architecture for a Help Center with 10,000 articles and 2 million monthly users. By migrating from SSR to ISR with on-demand revalidation and adding a Redis cache layer, we reduced article page LCP from 4.2 seconds to 1.8 seconds and eliminated CMS rate limit errors during traffic spikes.'",
          "Why Indeed (15 sec): 'The scope of the Indeed Help Center is what drew me to this role — 50+ languages, millions of users, and the technical challenges that come with CMS-driven content at that scale. That is the type of problem I find most interesting.'",
          "Hand it back (10 sec): 'I am looking forward to learning more about the team's architecture and where the biggest opportunities are. What aspect of the role should I focus on first?'",
        ]}
      />

      <h2 id="key-takeaways">Interview Challenge</h2>
      <InterviewChallenge
        title="Write Your Full STAR Answer for the Performance Question"
        scenario={
          <span>
            The interviewer asks: &quot;<strong>Tell me about a time you significantly improved
            the performance of a frontend application. Walk me through the problem, what you did,
            and the result.</strong>&quot; This is the highest-frequency question you will face
            for this role. You have 4 minutes to answer.
          </span>
        }
        tasks={[
          "Write the full STAR answer using your Story 1 (performance win) — complete sentences, timed at 4 minutes when read aloud. Include the specific LCP numbers (before and after), the diagnostic steps (what tools you used to find the bottleneck), the technical changes you made, and the result.",
          "The interviewer follows up: 'What would you do differently if you were starting that project today?' — write a 60-second answer that shows genuine reflection without undermining your original decision.",
          "The interviewer follows up: 'How did you convince the team to invest time in this instead of shipping new features?' — write a 90-second answer about how you framed the performance work as a business impact argument, not just a quality argument.",
          "Identify three signals in your answer that distinguish a senior IC response from a mid-level response — what specific language, depth, or judgment calls mark the answer as coming from someone with senior experience?",
          "Practice the answer out loud (set a timer) and note: did you spend more than 30% of your time on Situation and Task? If yes, rewrite to front-load the Action section.",
        ]}
        pitfalls={[
          "Using 'we' throughout the Action section — the interviewer is evaluating your individual contribution, not the team's. Use 'I' for your decisions and actions, 'we' only for team-wide outcomes",
          "Missing quantified results — 'LCP improved significantly' is not a result. 'LCP dropped from 4.2s to 1.8s, measured in Datadog RUM across the 30-day post-deploy period' is a result",
          "Spending more than 30% of the answer on Situation — context-setting feels safe but it is not what is being evaluated. Jump to Action faster than feels comfortable",
          "Not mentioning the diagnostic process — how you identified the bottleneck is as important as what you fixed. 'I used Chrome DevTools Performance tab + Datadog RUM to identify that sequential CMS fetches accounted for 2.3s of the LCP' is senior-level specificity",
          "Avoiding the 'what would you do differently?' follow-up — this is almost always asked and many candidates dodge it. Prepare a genuine answer: 'I would have added the Redis cache layer in the initial design instead of week 3, which would have avoided two weeks of rate limit debugging in staging'",
        ]}
        signal="A strong answer names specific tooling (Datadog RUM for production, Chrome DevTools Performance tab for local diagnosis), gives exact numbers (LCP 4.2s → 1.8s, not just 'much faster'), uses 'I' for decisions, explains a tradeoff (Redis vs Next.js fetch cache — chose Redis because it's shared across server instances and survives deploys), quantifies the result, and prepares a genuine 'what I'd do differently' that shows learning without undermining the original decision."
      />
    </div>
  );
}
