"use client";

import { motion } from "framer-motion";
import type { ChallengeTopic } from "@/modules/react-interview/data/types";

interface Props {
  topic: ChallengeTopic;
  completedCount: number;
  index: number;
  onClick: () => void;
  active: boolean;
}

export default function TopicCard({ topic, completedCount, index, onClick, active }: Props) {
  const easy = topic.challenges.filter((c) => c.difficulty === "easy").length;
  const medium = topic.challenges.filter((c) => c.difficulty === "medium").length;
  const hard = topic.challenges.filter((c) => c.difficulty === "hard").length;
  const total = topic.challenges.length;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all duration-200 w-full"
      style={{
        background: active ? "rgba(99,102,241,0.08)" : "var(--bg-surface)",
        border: active
          ? `1px solid ${topic.accentColor}40`
          : "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${active ? topic.accentColor : "transparent"}`,
        boxShadow: active
          ? `0 0 20px ${topic.accentColor}15`
          : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{topic.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary truncate">{topic.title}</h3>
            {completedCount > 0 && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  color: "var(--success)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                {completedCount}/{total}
              </span>
            )}
          </div>
          <p className="text-xs text-muted leading-snug mb-2">{topic.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted">
            {easy > 0 && <span style={{ color: "var(--success)" }}>{easy} easy</span>}
            {medium > 0 && (
              <>
                {easy > 0 && <span>·</span>}
                <span style={{ color: "var(--warning)" }}>{medium} medium</span>
              </>
            )}
            {hard > 0 && (
              <>
                {(easy > 0 || medium > 0) && <span>·</span>}
                <span className="text-muted">{hard} hard</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
