"use client";

import { Badge } from "@/components/ui";

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "default"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "default",
};

interface Props {
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
}

export default function ChallengeDescription({ title, description, difficulty, tags }: Props) {
  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant={DIFFICULTY_VARIANT[difficulty]}>{difficulty}</Badge>
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "var(--accent-secondary)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Problem
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}
