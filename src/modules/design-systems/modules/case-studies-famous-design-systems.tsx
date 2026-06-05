import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const spectrumDiagram = String.raw`flowchart TD
  SPEC["Spectrum design language<br/>(Adobe)"] --> RSPEC["React Spectrum<br/>(styled components)"]
  SPEC --> RA["React Aria<br/>(headless hooks)"]
  SPEC --> RSC["React Stately<br/>(state hooks)"]
  RA --> RSPEC
  RSC --> RSPEC
  RA --> OTHERS["Anyone's design system<br/>(behavior, no styles)"]`;

const buildVsAdoptDiagram = String.raw`flowchart TD
  Q1{"Need brand differentiation?"} -->|"No, speed matters"| ADOPT["Adopt: MUI / Ant / Mantine<br/>theme it"]
  Q1 -->|"Yes"| Q2{"Have a11y/eng capacity?"}
  Q2 -->|"Limited"| HEADLESS["Build on headless:<br/>Radix / React Aria"]
  Q2 -->|"Strong, unique needs"| SCRATCH["Build from scratch<br/>(rare, expensive)"]`;

export const toc: TocItem[] = [
  { id: "why-study", title: "Why Study Existing Systems", level: 2 },
  { id: "the-landscape", title: "The Landscape", level: 2 },
  { id: "material", title: "Material Design (Google)", level: 2 },
  { id: "polaris", title: "Shopify Polaris", level: 2 },
  { id: "carbon-lightning", title: "Carbon (IBM) & Lightning (Salesforce)", level: 2 },
  { id: "primer-fluent", title: "Primer (GitHub) & Fluent (Microsoft)", level: 2 },
  { id: "spectrum", title: "Adobe Spectrum & the Headless Trend", level: 2 },
  { id: "lessons", title: "Cross-Cutting Lessons", level: 2 },
  { id: "build-vs-adopt", title: "Build vs Adopt", level: 3 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function CaseStudiesFamousDesignSystems() {
  return (
    <div className="article-content">
      <p>
        Every concept in this academy — tokens, theming, accessibility, governance — has been
        battle-tested by the public design systems of major companies, and their published
        decisions are a free education. Studying them shows you which approaches survived contact
        with massive scale, and (just as usefully) why different companies made <em>opposite</em>{" "}
        choices for good reasons. This module surveys the landmark systems, extracts the
        cross-cutting lessons, and frames the perennial &ldquo;build vs adopt&rdquo; decision you
        will face and be asked about.
      </p>

      <h2 id="why-study">Why Study Existing Systems</h2>
      <p>
        Two reasons. First, <strong>prior art</strong>: these teams already solved problems you&rsquo;ll
        hit, in public — their docs, RFCs, and source are reference architecture. Second,{" "}
        <strong>interview signal</strong>: being able to compare Material, Polaris, and Spectrum and
        explain <em>why</em> they differ demonstrates that you think in tradeoffs, not dogma. The
        goal isn&rsquo;t to copy one but to understand the design space they map out.
      </p>

      <h2 id="the-landscape">The Landscape</h2>
      <ArticleTable
        caption="Landmark design systems and what each is best known for."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th>Company</th>
              <th>Known for</th>
              <th>Notable trait</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Material Design</strong></td>
              <td>Google</td>
              <td>Most influential visual language</td>
              <td>Opinionated; theming via Material You</td>
            </tr>
            <tr>
              <td><strong>Polaris</strong></td>
              <td>Shopify</td>
              <td>Guidelines &amp; content/UX writing</td>
              <td>Domain-specific (merchant admin)</td>
            </tr>
            <tr>
              <td><strong>Carbon</strong></td>
              <td>IBM</td>
              <td>Enterprise, multi-framework</td>
              <td>Open-source, data-dense UIs</td>
            </tr>
            <tr>
              <td><strong>Lightning</strong></td>
              <td>Salesforce</td>
              <td>Token pioneer (Theo)</td>
              <td>Multi-platform token tooling</td>
            </tr>
            <tr>
              <td><strong>Primer</strong></td>
              <td>GitHub</td>
              <td>Pragmatic, CSS + React</td>
              <td>Evolved from CSS utilities to React</td>
            </tr>
            <tr>
              <td><strong>Fluent</strong></td>
              <td>Microsoft</td>
              <td>Cross-platform at huge scale</td>
              <td>Fluent UI v9 = token-driven, perf rebuild</td>
            </tr>
            <tr>
              <td><strong>Spectrum</strong></td>
              <td>Adobe</td>
              <td>Accessibility &amp; headless (React Aria)</td>
              <td>Behavior/style separation taken furthest</td>
            </tr>
            <tr>
              <td><strong>Ant / MUI / Mantine</strong></td>
              <td>Community/OSS</td>
              <td>Ready-to-adopt React libraries</td>
              <td>The &ldquo;adopt&rdquo; option</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="material">Material Design (Google)</h2>
      <p>
        The most influential design <em>language</em> ever published — it defined the vocabulary
        (elevation, the baseline grid, motion principles) that later systems borrowed.{" "}
        <strong>Lesson:</strong> a strong, opinionated design language drives consistency, but
        opinionation is a double-edged sword — Material is so recognizable that products using it
        unmodified all &ldquo;look like Google,&rdquo; which is why Material 3 / Material You leaned
        hard into <em>dynamic theming</em> (color extracted from user wallpaper) to let it flex.
        The takeaway: even the most opinionated systems eventually invest in theming to escape
        sameness.
      </p>

      <h2 id="polaris">Shopify Polaris</h2>
      <p>
        Polaris is the case study in <strong>guidelines and content design</strong>. Beyond
        components, it documents UX writing, tone, and domain-specific patterns for Shopify&rsquo;s
        merchant admin. <strong>Lesson:</strong> a design system is not just visual — for a focused
        domain, the <em>guidelines</em> (when to use what, how to write microcopy) deliver as much
        value as the components. It also shows that the best systems are tailored to their
        product&rsquo;s domain rather than aiming to be universal.
      </p>

      <h2 id="carbon-lightning">Carbon (IBM) & Lightning (Salesforce)</h2>
      <p>
        <strong>Carbon</strong> is open-source, enterprise-grade, and ships across multiple
        frameworks (React, Web Components, Angular, Vue) — a lesson in <strong>multi-framework
        distribution</strong> and serving data-dense enterprise UIs. <strong>Lightning</strong> was
        a <strong>token pioneer</strong>: Salesforce built <em>Theo</em> (a precursor to Style
        Dictionary) years before tokens were mainstream, because they had to ship the same design to
        web, iOS, and Android. <strong>Lesson:</strong> multi-platform requirements <em>force</em>{" "}
        a rigorous token layer — exactly why tokens are foundational, validated at enormous scale.
      </p>

      <h2 id="primer-fluent">Primer (GitHub) & Fluent (Microsoft)</h2>
      <p>
        <strong>Primer</strong> shows <strong>pragmatic evolution</strong>: it began as CSS utility
        classes and grew into a React component system as GitHub&rsquo;s needs matured — a reminder
        that systems evolve incrementally with the org, not in one big bang. <strong>Fluent</strong>{" "}
        is the scale story: Fluent UI <strong>v9</strong> was a near-complete rebuild that moved to
        a <em>token-driven, zero-runtime styling</em> architecture (Griffel) explicitly for{" "}
        <strong>performance</strong> at Microsoft&rsquo;s scale. <strong>Lesson:</strong> the
        runtime-vs-zero-runtime styling decision (styling module) is so consequential that Microsoft
        rebuilt their entire system around it — and chose zero-runtime.
      </p>

      <h2 id="spectrum">Adobe Spectrum & the Headless Trend</h2>
      <p>
        Spectrum took the <strong>behavior/style separation</strong> (architecture module) the
        furthest, splitting into three layers and open-sourcing the bottom two as{" "}
        <strong>React Aria</strong> (accessible behavior hooks) and <strong>React Stately</strong>{" "}
        (state hooks). This is the headless trend embodied: Adobe&rsquo;s years of accessibility
        expertise became infrastructure <em>anyone</em> can build their design system on.
      </p>

      <MermaidDiagram
        chart={spectrumDiagram}
        title="Spectrum's layered architecture"
        caption="Adobe separated the design language, headless behavior (React Aria), and state (React Stately) — and open-sourced the behavior layer for any design system to build on."
        minHeight={360}
      />
      <p>
        <strong>Lesson:</strong> the industry is converging on a <em>headless behavior layer +
        your tokens/styles</em> model — Radix and React Aria let new systems inherit
        accessibility-correct behavior instead of re-solving it. This is arguably the most
        important structural trend in modern design systems.
      </p>

      <h2 id="lessons">Cross-Cutting Lessons</h2>
      <ul>
        <li>
          <strong>Tokens are universal and foundational</strong> — every multi-platform system
          (Lightning, Fluent, Spectrum) is built on a rigorous token layer.
        </li>
        <li>
          <strong>Accessibility is a first-class differentiator</strong> — the systems with the best
          reputations (Spectrum, Carbon) treat it as core, not an add-on.
        </li>
        <li>
          <strong>Styling architecture matters at scale</strong> — Fluent v9 rebuilt around
          zero-runtime; the industry moved the same way.
        </li>
        <li>
          <strong>Headless is the convergent architecture</strong> — separate behavior from
          presentation; reuse battle-tested behavior.
        </li>
        <li>
          <strong>Guidelines &amp; governance, not just components</strong> — Polaris and Material
          win on the surrounding practice as much as the code.
        </li>
        <li>
          <strong>Systems evolve</strong> — Primer&rsquo;s CSS→React path shows incremental growth
          beats big-bang perfection.
        </li>
      </ul>

      <h3 id="build-vs-adopt">Build vs Adopt</h3>
      <p>
        The practical decision these systems frame: build your own, build on a headless base, or
        adopt a ready-made library (MUI, Ant, Mantine) and theme it. There&rsquo;s no universal
        answer — it&rsquo;s driven by brand-differentiation needs and engineering capacity.
      </p>

      <MermaidDiagram
        chart={buildVsAdoptDiagram}
        title="Build vs adopt decision"
        caption="Brand differentiation and accessibility/engineering capacity drive the choice between adopting a library, building on headless, or building from scratch."
        minHeight={360}
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'Which design systems do you admire and what would you learn from them?'"
        intro="This checks breadth and whether you think in tradeoffs. Don't just name-drop — extract a transferable lesson from each and tie it to a real decision."
        steps={[
          "Show range: name a few (Material, Polaris, Spectrum, Fluent) and what each is BEST known for, not just that they exist.",
          "Extract lessons: tokens are foundational (Lightning/Fluent), accessibility differentiates (Spectrum), styling architecture matters at scale (Fluent v9 zero-runtime).",
          "Name the convergent trend: headless behavior layer (React Aria, Radix) + your tokens — reuse a11y instead of re-solving it.",
          "Note that opinionated systems (Material) eventually invest in theming to escape sameness — design language vs flexibility tension.",
          "Close with build-vs-adopt as a tradeoff driven by brand needs and engineering capacity, not dogma.",
        ]}
      />

      <InterviewChallenge
        title="Recommend an approach for a new company"
        scenario={
          <>
            A 40-engineer B2B SaaS startup wants a design system. They have a distinctive brand they
            care about, a small frontend team with limited accessibility expertise, and need to move
            fast. They ask: should we adopt MUI, build on Radix, or build from scratch — and what
            would we borrow from the famous systems?
          </>
        }
        tasks={[
          "Make a recommendation and justify it against their specific constraints.",
          "Cite at least two lessons from famous systems that should shape their approach.",
          "Explain what you would explicitly NOT do, and why.",
        ]}
      />
      <SolutionReveal difficulty="medium">
          <p>
            <strong>Recommendation: build on a headless base (Radix / React Aria) + their own
            tokens and styles.</strong> It fits all three constraints: <em>distinctive brand</em>{" "}
            (full visual control via tokens, unlike adopting MUI which fights you on aesthetics);{" "}
            <em>limited a11y expertise</em> (Radix/React Aria provide the hard accessibility behavior
            for free — Spectrum&rsquo;s lesson); <em>move fast</em> (no re-solving keyboard/focus/ARIA).
          </p>
          <p>
            <strong>Borrowed lessons:</strong> (1) From Lightning/Fluent — start with a real{" "}
            <em>token layer</em> even when small, so theming and a future rebrand are cheap. (2) From
            Spectrum — lean on a headless behavior layer rather than building accessible widgets
            themselves. (3) From Primer — <em>evolve incrementally</em>; ship tokens + a handful of
            core components first, not a 60-component big bang.
          </p>
          <p>
            <strong>What NOT to do:</strong> don&rsquo;t adopt MUI/Ant unstyled-and-then-fight-it —
            a distinctive brand makes heavy theming of an opinionated library more painful than
            building on headless. And don&rsquo;t build accessible primitives from scratch with a
            small team lacking a11y depth — that&rsquo;s the months-long trap every case study
            warns against.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The major public systems are <strong>free reference architecture</strong> — study their
          decisions and, crucially, why they differ.
        </li>
        <li>
          <strong>Tokens are validated as foundational</strong> by every multi-platform system
          (Lightning, Fluent, Spectrum).
        </li>
        <li>
          <strong>Accessibility differentiates</strong> the best systems; <strong>Spectrum</strong>{" "}
          turned its a11y work into headless React Aria for everyone.
        </li>
        <li>
          <strong>Styling architecture matters at scale</strong> — Fluent v9 rebuilt around
          zero-runtime styling for performance.
        </li>
        <li>
          The convergent modern architecture is a <strong>headless behavior layer + your
          tokens/styles</strong>.
        </li>
        <li>
          <strong>Build vs adopt</strong> is a tradeoff driven by brand differentiation and
          engineering capacity — for most, building on headless is the sweet spot.
        </li>
      </ul>
    </div>
  );
}
