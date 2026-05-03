import type { ReactNode } from "react";

interface InterviewPlaybookProps {
  title: string;
  intro?: ReactNode;
  steps: string[];
}

export default function InterviewPlaybook({ title, intro, steps }: InterviewPlaybookProps) {
  return (
    <section
      style={{
        margin: "1.75rem 0",
        padding: "1.1rem 1.15rem",
        borderRadius: "18px",
        border: "1px solid rgba(99,102,241,0.22)",
        background:
          "radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 36%), rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: "1rem",
          fontWeight: 700,
          marginBottom: intro ? "0.45rem" : "0.75rem",
        }}
      >
        {title}
      </div>

      {intro && (
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            marginBottom: "0.8rem",
          }}
        >
          {intro}
        </div>
      )}

      <ol
        style={{
          margin: 0,
          paddingLeft: "1.25rem",
          color: "var(--text-secondary)",
        }}
      >
        {steps.map((step) => (
          <li key={step} style={{ marginBottom: "0.45rem", lineHeight: 1.6 }}>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
