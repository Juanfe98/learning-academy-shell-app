import { Suspense } from "react";
import { Code2, Layers, Zap, Trophy } from "lucide-react";
import { CHALLENGE_REGISTRY } from "@/lib/challenges/registry";
import ChallengeFilterGrid, { type ChallengeListItem } from "@/components/hub/playground/ChallengeFilterGrid";

const challenges: ChallengeListItem[] = CHALLENGE_REGISTRY.map(
  ({ slug, title, description, difficulty, environment, tags }) => ({
    slug,
    title,
    description,
    difficulty,
    environment,
    tags,
  })
);

const beginnerCount = challenges.filter((c) => c.difficulty === "beginner").length;
const advancedCount = challenges.filter((c) => c.difficulty === "advanced").length;

export default function PlaygroundListPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-surface) 65%)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)",
          }}
        />

        <div className="relative space-y-4">
          {/* Title row */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg shrink-0"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                <Code2 size={18} style={{ color: "var(--accent-primary)" }} />
              </div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Coding Playground
              </h1>
            </div>
            <p
              className="text-sm ml-[52px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Hands-on React challenges with live preview and console.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 ml-[52px]">
            <div className="flex items-center gap-1.5">
              <Layers size={13} style={{ color: "var(--accent-primary)" }} />
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--accent-primary)" }}
              >
                {challenges.length}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                total
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={13} style={{ color: "var(--success)" }} />
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--success)" }}
              >
                {beginnerCount}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                beginner
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy size={13} style={{ color: "var(--warning)" }} />
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--warning)" }}
              >
                {advancedCount}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                advanced
              </span>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ChallengeFilterGrid challenges={challenges} />
      </Suspense>
    </div>
  );
}
