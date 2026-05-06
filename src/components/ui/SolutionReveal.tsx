"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface SolutionRevealProps {
  children: ReactNode;
  difficulty?: "easy" | "medium" | "hard";
}

const DIFFICULTY_COLORS: Record<NonNullable<SolutionRevealProps["difficulty"]>, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
};

export default function SolutionReveal({ children, difficulty }: SolutionRevealProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{ margin: "0.85rem 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: revealed ? "0.85rem" : 0 }}>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.45rem 1rem",
            borderRadius: "999px",
            border: "1px solid rgba(99,102,241,0.4)",
            background: revealed
              ? "rgba(99,102,241,0.18)"
              : "rgba(99,102,241,0.08)",
            color: "var(--accent-secondary)",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
        >
          <span style={{ fontSize: "0.95rem" }}>{revealed ? "▲" : "▼"}</span>
          {revealed ? "Hide Solution" : "Show Solution"}
        </button>

        {difficulty && (
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: DIFFICULTY_COLORS[difficulty],
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              border: `1px solid ${DIFFICULTY_COLORS[difficulty]}44`,
              background: `${DIFFICULTY_COLORS[difficulty]}14`,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {difficulty}
          </span>
        )}
      </div>

      {revealed && (
        <div
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(99,102,241,0.22)",
            background:
              "radial-gradient(circle at top left, rgba(99,102,241,0.09), transparent 40%), rgba(2,6,23,0.5)",
            padding: "1rem 1.15rem",
            marginTop: "0.1rem",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
