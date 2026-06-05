import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const motionTokenDiagram = String.raw`flowchart LR
  subgraph Tokens["Motion tokens"]
    DUR["duration<br/>fast/normal/slow"]
    EASE["easing<br/>standard/decelerate/accelerate"]
  end
  DUR --> COMP["Component transitions"]
  EASE --> COMP
  COMP --> RM{"prefers-reduced-motion?"}
  RM -->|"yes"| OFF["near-instant / no transform"]
  RM -->|"no"| ON["full motion"]`;

const enterExitDiagram = String.raw`stateDiagram-v2
  [*] --> Mounted
  Mounted --> Entering : open
  Entering --> Open : animation ends
  Open --> Exiting : close
  Exiting --> Unmounted : animation ends (THEN remove from DOM)
  Unmounted --> [*]`;

export const toc: TocItem[] = [
  { id: "motion-is-systematic", title: "Motion Is a System, Not Decoration", level: 2 },
  { id: "motion-tokens", title: "Motion Tokens", level: 2 },
  { id: "purposeful", title: "Purposeful Motion: The Categories", level: 2 },
  { id: "css-first", title: "CSS-First, JS When Needed", level: 2 },
  { id: "enter-exit", title: "The Hard Part: Exit Animations", level: 2 },
  { id: "reduced-motion", title: "prefers-reduced-motion Is Non-Negotiable", level: 2 },
  { id: "performance", title: "Performance: Animate the Cheap Properties", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function MotionAndAnimation() {
  return (
    <div className="article-content">
      <p>
        Motion is the part of a design system teams add last and least systematically — which is why
        most apps feel either static or chaotically over-animated. Done right, motion is{" "}
        <strong>tokenized and purposeful</strong>: a small set of duration/easing tokens, applied
        consistently, that communicate state changes and spatial relationships rather than
        decorate. This module covers motion tokens, the categories of useful motion, the genuinely
        hard problem (exit animations), the non-negotiable accessibility requirement, and the
        performance rules — all runnable.
      </p>

      <h2 id="motion-is-systematic">Motion Is a System, Not Decoration</h2>
      <p>
        Like color and spacing, motion needs constraint. If every developer picks their own duration
        and easing, the app feels incoherent — one dropdown snaps, another drifts. The system defines
        a small motion vocabulary so transitions feel like they belong to one product. And motion
        must have <em>purpose</em>: it should help users understand what changed (a panel slid in
        from the right, so closing slides it back) — not exist for flair.
      </p>

      <h2 id="motion-tokens">Motion Tokens</h2>
      <p>
        Motion tokens are the same idea as color tokens: named durations and easing curves consumed
        via CSS variables. Durations follow a small scale; easings are named by <em>intent</em>.
      </p>

      <MermaidDiagram
        chart={motionTokenDiagram}
        title="Motion tokens feed transitions, gated by reduced-motion"
        caption="Duration and easing tokens drive all component transitions, with prefers-reduced-motion overriding them globally."
        minHeight={300}
      />

      <CodeBlock
        code={`:root {
  /* Duration scale — shorter for small/frequent, longer for large/rare */
  --motion-duration-fast: 120ms;     /* hovers, small toggles */
  --motion-duration-normal: 200ms;   /* dropdowns, tabs */
  --motion-duration-slow: 320ms;     /* modals, page-level */

  /* Easing by intent (Material-style) */
  --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);     /* most transitions */
  --motion-ease-decelerate: cubic-bezier(0, 0, 0, 1);     /* entering (eases in) */
  --motion-ease-accelerate: cubic-bezier(0.3, 0, 1, 1);   /* exiting (speeds out) */
}

/* Components reference tokens, never raw values: */
.ds-dropdown {
  transition: opacity var(--motion-duration-normal) var(--motion-ease-standard),
              transform var(--motion-duration-normal) var(--motion-ease-decelerate);
}`}
        lang="css"
        filename="motion-tokens.css"
      />

      <h2 id="purposeful">Purposeful Motion: The Categories</h2>
      <p>
        Useful motion falls into a few categories — naming them helps you decide whether an animation
        earns its place:
      </p>

      <ArticleTable
        caption="Categories of purposeful motion and their typical tokens."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Purpose</th>
              <th>Example</th>
              <th>Typical duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>State feedback</td>
              <td>Confirm an interaction</td>
              <td>Button hover/press, toggle</td>
              <td>fast (120ms)</td>
            </tr>
            <tr>
              <td>Reveal / dismiss</td>
              <td>Show spatial origin</td>
              <td>Dropdown, tooltip, accordion</td>
              <td>normal (200ms)</td>
            </tr>
            <tr>
              <td>Transition / focus</td>
              <td>Direct attention</td>
              <td>Modal open, route change</td>
              <td>slow (320ms)</td>
            </tr>
            <tr>
              <td>Status / progress</td>
              <td>Communicate ongoing work</td>
              <td>Spinner, skeleton shimmer</td>
              <td>looped</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="css-first">CSS-First, JS When Needed</h2>
      <p>
        Default to <strong>CSS transitions/animations</strong> — they run off the main thread, need
        no JS, and are RSC-safe. Reach for a JS library (<strong>Framer Motion</strong>,{" "}
        Motion One) only when you need orchestration CSS can&rsquo;t do: layout/shared-element
        transitions (<code>FLIP</code>), gesture-driven animation, spring physics, or coordinating
        many elements. For a design system, most component motion is pure CSS; expose JS-animated
        components sparingly because they pull in a client runtime.
      </p>

      <h2 id="enter-exit">The Hard Part: Exit Animations</h2>
      <p>
        Enter animations are easy (animate on mount). <strong>Exit animations are the hard
        problem</strong>: to animate something <em>out</em>, it must stay in the DOM until the
        animation finishes, then unmount — but React removes it immediately when state flips. This is
        the single most common motion bug in design systems.
      </p>

      <MermaidDiagram
        chart={enterExitDiagram}
        title="The exit-animation lifecycle"
        caption="On close, the element must animate during an 'exiting' phase and only be removed from the DOM after the animation completes."
        minHeight={320}
      />

      <p>
        The platform-native solution is now <strong>CSS <code>@starting-style</code> +{" "}
        <code>transition-behavior: allow-discrete</code></strong>, which lets you transition elements
        in and out (including <code>display</code>) without JS. The library solution is Framer
        Motion&rsquo;s <code>AnimatePresence</code>. Both keep the element alive through its exit.
      </p>

      <CodeBlock
        code={`/* Modern CSS: animate in AND out, no JS, even with display:none */
.ds-popover {
  opacity: 1;
  transition: opacity var(--motion-duration-normal) var(--motion-ease-standard),
              display var(--motion-duration-normal) allow-discrete;  /* discrete prop */
}
/* Entry start state */
@starting-style {
  .ds-popover { opacity: 0; }
}
/* Exit state (when hidden) */
.ds-popover[hidden] {
  opacity: 0;
  display: none;   /* allow-discrete transitions this after the fade */
}`}
        lang="css"
        filename="exit-animation.css"
      />

      <CodeBlock
        code={`// Library route: Framer Motion keeps the element mounted through exit
import { AnimatePresence, motion } from "framer-motion";

function Toast({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}          // animates BEFORE unmount
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}`}
        lang="tsx"
        filename="exit-with-framer.tsx"
      />

      <h2 id="reduced-motion">prefers-reduced-motion Is Non-Negotiable</h2>
      <p>
        Some users get motion sickness, vestibular disorders, or migraines from animation. Respecting{" "}
        <strong><code>prefers-reduced-motion</code></strong> is an accessibility requirement, not a
        nicety. The system should handle it <em>centrally</em> so every component inherits it — the
        cleanest approach is a global rule that neutralizes motion, plus letting essential feedback
        (like a brief opacity change) remain.
      </p>

      <CodeBlock
        code={`/* Global: respect reduced-motion for every animation/transition at once */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Better: gate motion tokens so opacity can stay but transforms drop */
:root { --motion-duration-normal: 200ms; }
@media (prefers-reduced-motion: reduce) {
  :root { --motion-duration-normal: 0.01ms; }   /* transitions collapse, no jarring movement */
}`}
        lang="css"
        filename="reduced-motion.css"
      />

      <CodeBlock
        code={`// In JS-animated components, read the preference and disable motion:
function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
// const reduced = usePrefersReducedMotion();
// <motion.div animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }} />`}
        lang="tsx"
        filename="use-prefers-reduced-motion.tsx"
      />

      <h2 id="performance">Performance: Animate the Cheap Properties</h2>
      <p>
        Smooth 60fps animation requires animating only properties the browser can handle on the
        compositor: <strong><code>transform</code> and <code>opacity</code></strong>. Animating{" "}
        <code>width</code>, <code>height</code>, <code>top</code>, <code>margin</code>, or any
        layout property forces reflow/repaint on every frame → jank. The rule baked into a design
        system: <em>transitions use transform/opacity</em>; resizes use <code>transform: scale()</code>{" "}
        not width/height where possible. Use <code>will-change</code> sparingly (it has memory cost).
      </p>

      <CodeBlock
        code={`/* ❌ Janky — animates layout properties (reflow every frame) */
.bad { transition: width 200ms, height 200ms, top 200ms; }

/* ✅ Smooth — compositor-only properties */
.good { transition: transform 200ms var(--motion-ease-standard), opacity 200ms; }
.good[data-open="true"]  { transform: translateY(0) scale(1); opacity: 1; }
.good[data-open="false"] { transform: translateY(-8px) scale(0.98); opacity: 0; }`}
        lang="css"
        filename="performant-motion.css"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does your design system handle motion?'"
        intro="Most candidates have no systematic answer. Mentioning motion tokens, reduced-motion, exit animations, and compositor properties signals depth."
        steps={[
          "Treat motion as a system: tokenize duration (fast/normal/slow) and easing (by intent), consumed via CSS variables — like color tokens.",
          "Motion must be purposeful (feedback, reveal, transition, status), not decorative.",
          "Default to CSS transitions (off-thread, RSC-safe); reach for Framer Motion only for orchestration/FLIP/gestures/springs.",
          "Name the hard problem — exit animations need the element to stay mounted until the animation ends (AnimatePresence or @starting-style + allow-discrete).",
          "prefers-reduced-motion is an a11y requirement handled centrally; animate only transform/opacity for 60fps (never layout properties).",
        ]}
      />

      <InterviewChallenge
        title="Animate a dropdown correctly"
        scenario={
          <>
            A dropdown menu pops in with no animation and disappears instantly. A previous attempt to
            animate it &ldquo;worked&rdquo; opening but the close animation never showed (it vanished
            immediately), it animated <code>height</code> and felt janky, and a user with motion
            sensitivity complained it made them dizzy.
          </>
        }
        tasks={[
          "Explain why the close animation didn't show and how to fix it.",
          "Fix the jank — which properties should it animate instead?",
          "Make it respect motion sensitivity.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Close didn&rsquo;t show:</strong> React unmounted the element the instant{" "}
          <code>open</code> became false, so there was nothing in the DOM to animate out. Fix: keep
          it mounted through the exit — use Framer Motion&rsquo;s <code>AnimatePresence</code> with an{" "}
          <code>exit</code> variant, or modern CSS <code>@starting-style</code> +{" "}
          <code>transition-behavior: allow-discrete</code> so <code>display</code> transitions after
          the fade.
        </p>
        <p>
          <strong>Jank:</strong> it animated <code>height</code> (a layout property → reflow every
          frame). Animate <code>transform</code> (<code>translateY</code> + <code>scale</code>) and{" "}
          <code>opacity</code> instead — compositor-only, 60fps. Use motion tokens (
          <code>--motion-duration-normal</code>, <code>--motion-ease-standard</code>).
        </p>
        <p>
          <strong>Motion sensitivity:</strong> respect <code>prefers-reduced-motion</code> — collapse
          the duration token to ~0 (so it appears/disappears without movement) while optionally
          keeping a subtle opacity fade. Handle it globally so every component, not just this one,
          inherits the behavior.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Motion is a <strong>system</strong>: tokenize duration and easing (by intent) and consume
          via CSS variables, like color tokens.
        </li>
        <li>
          Motion must be <strong>purposeful</strong> — feedback, reveal, transition, status — not
          decoration.
        </li>
        <li>
          Default to <strong>CSS transitions</strong>; use Framer Motion only for orchestration,
          FLIP, gestures, or springs.
        </li>
        <li>
          <strong>Exit animations</strong> are the hard part — keep the element mounted through exit
          (<code>AnimatePresence</code> or <code>@starting-style</code> + <code>allow-discrete</code>).
        </li>
        <li>
          <strong><code>prefers-reduced-motion</code></strong> is an accessibility requirement handled
          centrally; animate only <strong><code>transform</code>/<code>opacity</code></strong> for
          60fps.
        </li>
      </ul>
    </div>
  );
}
