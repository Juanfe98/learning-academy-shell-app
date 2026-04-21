"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { InterviewTrack } from "@/modules/react-interview/data/types";

interface Props {
  track: InterviewTrack;
  completedCount: number;
  index: number;
}

export default function TrackCard({ track, completedCount, index }: Props) {
  const totalChallenges = track.topics.reduce((s, t) => s + t.challenges.length, 0);
  const topicCount = track.topics.length;

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={track.comingSoon ? undefined : { y: -3 }}
      className="rounded-xl p-5 h-full"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid var(--border-subtle)`,
        borderLeft: `3px solid ${track.comingSoon ? "var(--border-subtle)" : track.accentColor}`,
        boxShadow: track.comingSoon ? "none" : `0 0 24px ${track.accentColor}12`,
        opacity: track.comingSoon ? 0.5 : 1,
        cursor: track.comingSoon ? "not-allowed" : "pointer",
        transition: "box-shadow 0.2s",
      }}
    >
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl leading-none">{track.icon}</span>
          {track.comingSoon ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
            >
              Coming Soon
            </span>
          ) : completedCount > 0 ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "var(--success)",
              }}
            >
              {completedCount} done
            </span>
          ) : null}
        </div>

        <div className="flex-1">
          <h3 className="text-base font-bold text-primary mb-1">{track.title}</h3>
          <p className="text-xs text-secondary leading-relaxed">{track.description}</p>
        </div>

        {!track.comingSoon && (
          <div className="flex items-center gap-2 text-xs text-muted mt-auto pt-2"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <span>{topicCount} topics</span>
            <span>·</span>
            <span>{totalChallenges} challenges</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (track.comingSoon) return card;

  return (
    <Link href={`/interview/${track.id}`} className="block h-full">
      {card}
    </Link>
  );
}
