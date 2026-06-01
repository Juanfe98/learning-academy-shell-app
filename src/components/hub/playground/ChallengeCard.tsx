import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ChallengeListItem } from "./ChallengeFilterGrid";
import { Badge } from "@/components/ui";

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "default"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "default",
};

const DIFFICULTY_BORDER: Record<string, string> = {
  beginner: "var(--success)",
  intermediate: "var(--warning)",
  advanced: "var(--accent-primary)",
};

const DIFFICULTY_GLOW: Record<string, string> = {
  beginner: "rgba(34,197,94,0.07)",
  intermediate: "rgba(245,158,11,0.07)",
  advanced: "rgba(99,102,241,0.08)",
};

const ENV_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "react-ts": {
    label: "TS",
    color: "var(--accent-primary)",
    bg: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.3)",
  },
  "react-js": {
    label: "JS",
    color: "#f0a500",
    bg: "rgba(240,165,0,0.12)",
    border: "rgba(240,165,0,0.3)",
  },
  "node-ts": {
    label: "Node",
    color: "var(--success)",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
  },
};

interface ChallengeCardProps {
  challenge: ChallengeListItem;
}

function ChallengeCard({ challenge }: ChallengeCardProps) {
  const env = ENV_BADGE[challenge.environment] ?? ENV_BADGE["react-ts"];
  const borderColor = DIFFICULTY_BORDER[challenge.difficulty];
  const glowColor = DIFFICULTY_GLOW[challenge.difficulty];
  const visibleTags = challenge.tags.slice(0, 3);
  const hiddenCount = challenge.tags.length - 3;

  return (
    <Link
      href={`/playground/${challenge.slug}`}
      className="group relative block h-full rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Hover glow overlay — difficulty-tinted */}
      <span
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ background: glowColor }}
      />

      <div className="relative flex flex-col h-full p-4 gap-3">
        {/* Title + badges row */}
        <div className="flex items-start justify-between gap-3">
          <p
            className="font-semibold text-[15px] leading-snug flex-1"
            style={{ color: "var(--text-primary)" }}
          >
            {challenge.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: env.bg,
                border: `1px solid ${env.border}`,
                color: env.color,
              }}
            >
              {env.label}
            </span>
            <Badge variant={DIFFICULTY_VARIANT[challenge.difficulty]}>
              {challenge.difficulty}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-relaxed line-clamp-2 flex-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {challenge.description}
        </p>

        {/* Footer: tags + reveal arrow */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {visibleTags.map((tag) => (
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
            {hiddenCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                +{hiddenCount}
              </span>
            )}
          </div>
          <ArrowRight
            size={14}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
            style={{ color: "var(--accent-secondary)" }}
          />
        </div>
      </div>
    </Link>
  );
}

export default ChallengeCard;
