import type { LearningModule } from "./types";

export const transitionsAnimations: LearningModule = {
  id: "transitions-animations",
  title: "Transitions & Animations",
  description:
    "CSS transitions and transforms power the micro-interactions that make UIs feel responsive and polished. Know which properties to animate, how to write them correctly, and how to respect motion preferences.",
  icon: "🎬",
  order: 8,
  estimatedHours: 1.5,
  lessons: [
    {
      id: "transitions-transforms",
      moduleId: "transitions-animations",
      title: "Transitions & Transforms",
      summary:
        "transition and transform are the two most-used CSS animation tools. Together they handle hover effects, button feedback, and entrance animations — all GPU-accelerated and smooth.",
      estimatedMinutes: 35,
      learningObjectives: [
        "Write the transition shorthand correctly: property duration easing delay",
        "Know which properties are safe to animate (opacity, transform) vs expensive (width, height, margin)",
        "Use transform for movement, scaling, and rotation without triggering layout",
        "Apply prefers-reduced-motion to all animations and transitions",
        "Understand keyframe animations for looping or complex multi-step animations",
      ],
      codeExamples: [
        {
          title: "Transition patterns",
          css: `/* transition: property duration timing-function delay */
.btn {
  background: #6366f1;
  transition: background 0.2s ease, transform 0.1s ease;
}
.btn:hover {
  background: #4f46e5;
  transform: translateY(-2px); /* subtle lift */
}
.btn:active {
  transform: translateY(0) scale(0.97); /* press feedback */
}

/* Transition multiple properties */
.card {
  transition:
    transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px rgba(0,0,0,0.15);
}

/* Fade in/out */
.tooltip {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s;
}
.tooltip.visible {
  opacity: 1;
  visibility: visible;
}`,
        },
        {
          title: "Keyframe animations",
          css: `@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Usage */
.card-enter {
  animation: fadeInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.spinner {
  animation: spin 1s linear infinite;
}

.skeleton {
  animation: pulse 2s ease-in-out infinite;
}

/* Stagger: delay each item */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`,
        },
      ],
      commonMistakes: [
        "Animating layout-triggering properties (width, height, margin, padding, top, left) — these cause expensive reflows on every frame; use transform instead",
        "Forgetting transition on the base state (only on :hover) — the transition won't apply on mouse-out",
        "Using transition: all — it catches unexpected properties and hurts performance; always specify the property",
        "Not implementing prefers-reduced-motion — some users experience motion sickness from animations",
      ],
      interviewTips: [
        "GPU-accelerated properties: opacity and transform run on the GPU compositor thread — they never trigger layout or paint. Everything else does. That's why transform: translateX() is better than left: 100px.",
        "will-change: transform; is a hint to the browser to promote an element to its own compositing layer before animation begins. Use it sparingly — on elements that will definitely animate, right before the animation starts.",
        "The animation fill mode matters: animation-fill-mode: both means the animation applies before it starts (forwards) AND retains end state after it finishes. Essential for entrance animations.",
      ],
      practiceTasks: [
        {
          description:
            "Build 5 hover effects using only transform and opacity (no layout properties). Each should feel smooth and intentional.",
          hint: "Ideas: card lift, button press, image scale, icon spin, underline expand (use scaleX on a pseudo-element).",
        },
        {
          description:
            "Implement a loading skeleton animation using @keyframes. The skeleton should pulse between 60% and 100% opacity.",
          hint: "Use animation: pulse 2s ease-in-out infinite; and define the keyframes with opacity changes.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "smooth-modal",
      moduleId: "transitions-animations",
      title: "Animated Modal",
      difficulty: "medium",
      description:
        "Build a modal dialog that fades in and slides up on open, reverses on close. The animation must respect prefers-reduced-motion.",
      targetImage: {
        src: "/wf-challenges/animated-modal.svg",
        alt: "Modal mock with dimmed backdrop, centered dialog card, supporting text, and confirm and cancel actions.",
        caption:
          "The key thing to preserve is the layering and motion relationship: backdrop first, panel second, and a clear action row inside the dialog.",
      },
      requirements: [
        "Modal backdrop fades in (opacity: 0 → 1) on open",
        "Modal panel slides up (translateY(24px) → translateY(0)) and fades in",
        "Closing reverses both animations",
        "Focus is moved to the modal on open and returned to the trigger on close",
        "Pressing Escape closes the modal",
        "prefers-reduced-motion: animations are disabled (instant show/hide)",
        'The modal uses role="dialog" and aria-modal="true"',
      ],
      starterHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Animated Modal</title>
</head>
<body>
  <button id="open-modal">Open Modal</button>

  <div id="modal-backdrop" hidden>
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" id="modal">
      <h2 id="modal-title">Confirm action</h2>
      <p>Are you sure you want to proceed?</p>
      <div>
        <button id="confirm">Confirm</button>
        <button id="close-modal">Cancel</button>
      </div>
    </div>
  </div>
</body>
</html>`,
      starterCss: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; }`,
      expectedResult:
        "A fully animated, accessible modal. The entrance and exit animations are smooth. Keyboard focus is managed correctly. The animation is disabled for users with motion preferences.",
      hints: [
        "Use @keyframes for the entrance animation. For exit, add a .closing class that plays the reverse animation.",
        "Remove hidden after the animation class is applied; add hidden after the exit animation ends (animationend event).",
        "For prefers-reduced-motion: skip adding animation classes entirely — just toggle hidden directly.",
      ],
      bonusTasks: [
        "Add a focus trap so Tab key cycles through only the modal's interactive elements",
        "Add a stagger: backdrop fades in first, then the modal panel",
        "Implement a slide-out animation on the modal for closing (using animation-direction: reverse or a separate @keyframes)",
      ],
      conceptsCovered: [
        "transitions-transforms",
        "accessibility-fundamentals",
        "positioning",
      ],
    },
  ],
};

export const explanations: Record<string, () => React.ReactNode> = {
  "transitions-transforms": () => (
    <>
      <p>
        The <code>transition</code> property enables smooth value changes when a
        CSS property changes. Its shorthand syntax is{" "}
        <code>transition: property duration timing-function delay</code>. The
        property must be specified explicitly (avoid{" "}
        <code>transition: all</code> — it catches unexpected properties and
        creates performance issues). The timing function controls the speed
        curve: <code>ease</code> is a gentle ease-in-out, <code>linear</code>{" "}
        maintains constant speed, and cubic bezier values like{" "}
        <code>cubic-bezier(0.25, 0.46, 0.45, 0.94)</code> allow custom curves.
      </p>
      <p>
        The <code>transform</code> property is the correct tool for movement and
        scale in animations. <code>transform: translateX()</code> moves an
        element horizontally; <code>translateY()</code> moves vertically;{" "}
        <code>scale()</code> resizes; <code>rotate()</code> spins. The critical
        advantage of transform over geometric properties like <code>left</code>,{" "}
        <code>top</code>, or <code>width</code> is that it runs entirely on the
        GPU compositor thread — it doesn&apos;t trigger layout (reflow) or
        paint, only composite. This means smooth 60fps animations even on
        complex pages. <code>opacity</code> shares this GPU-accelerated
        property.
      </p>
      <p>
        Always implement <code>prefers-reduced-motion: reduce</code> support.
        Around 35% of people have some form of vestibular disorder that makes
        fast motion on screen cause physical discomfort or nausea. The standard
        approach is a global override:{" "}
        <code>
          @media (prefers-reduced-motion: reduce) {"{"} *, *::before, *::after{" "}
          {"{"} animation-duration: 0.01ms; transition-duration: 0.01ms; {"}"}{" "}
          {"}"}
        </code>
        . This reduces all animations to imperceptibly fast — effectively
        instant — without fully disabling them, which preserves state changes
        while eliminating the motion itself.
      </p>
      <p>
        The best UI motion has a job. It can communicate cause and effect,
        reinforce spatial relationships, or make state changes feel easier to
        follow. The worst motion is pure decoration that delays the interface,
        distracts from content, or makes the UI feel unstable. That&apos;s why
        subtle hover transitions, accordion expansion, and focus feedback
        usually add value, while large gratuitous motion often does not.
      </p>
      <p>
        Interviewers often care less about whether you know{" "}
        <code>@keyframes</code> syntax from memory and more about whether you
        choose performant properties intentionally. If you say &quot;I animate
        transform and opacity first because they avoid layout and paint
        work&quot;, that sounds like someone who has actually debugged animation
        performance in real products.
      </p>
    </>
  ),
};
