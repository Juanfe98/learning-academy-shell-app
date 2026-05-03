import type { ReactNode } from "react";

interface InterviewChallengeProps {
  title: string;
  scenario: ReactNode;
  tasks: string[];
  pitfalls?: string[];
  signal?: string;
}

export default function InterviewChallenge({
  title,
  scenario,
  tasks,
  pitfalls,
  signal,
}: InterviewChallengeProps) {
  return (
    <section
      style={{
        margin: "1.9rem 0",
        padding: "1.15rem",
        borderRadius: "20px",
        border: "1px solid rgba(56,189,248,0.24)",
        background:
          "radial-gradient(circle at top right, rgba(56,189,248,0.14), transparent 34%), rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: "1rem",
          fontWeight: 800,
          marginBottom: "0.7rem",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.94rem",
          lineHeight: 1.7,
          marginBottom: "0.9rem",
        }}
      >
        {scenario}
      </div>

      <div
        style={{
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginBottom: "0.45rem",
        }}
      >
        Interview tasks
      </div>

      <ol
        style={{
          margin: 0,
          paddingLeft: "1.3rem",
          color: "var(--text-secondary)",
        }}
      >
        {tasks.map((task) => (
          <li key={task} style={{ marginBottom: "0.45rem", lineHeight: 1.6 }}>
            {task}
          </li>
        ))}
      </ol>

      {pitfalls && pitfalls.length > 0 && (
        <>
          <div
            style={{
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              fontWeight: 700,
              marginTop: "0.95rem",
              marginBottom: "0.4rem",
            }}
          >
            Common traps
          </div>

          <ul
            style={{
              margin: 0,
              paddingLeft: "1.15rem",
              color: "var(--text-secondary)",
            }}
          >
            {pitfalls.map((pitfall) => (
              <li key={pitfall} style={{ marginBottom: "0.35rem", lineHeight: 1.55 }}>
                {pitfall}
              </li>
            ))}
          </ul>
        </>
      )}

      {signal && (
        <p
          style={{
            margin: "0.95rem 0 0",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>What great looks like:</strong>{" "}
          {signal}
        </p>
      )}
    </section>
  );
}
