"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import TrackCard from "./TrackCard";
import { ALL_TRACKS } from "@/modules/react-interview/data";
import { useProgressStore } from "@/lib/store";

export default function TrackBrowser() {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);

  useEffect(() => setMounted(true), []);

  function getTrackCompleted(trackId: string): number {
    if (!mounted) return 0;
    const modules = academies["react-interview"]?.modules ?? {};
    const track = ALL_TRACKS.find((t) => t.id === trackId);
    if (!track) return 0;
    const challengeIds = new Set(track.topics.flatMap((t) => t.challenges.map((c) => c.id)));
    return Object.entries(modules).filter(
      ([key, mod]) => mod.completed && challengeIds.has(key.replace("challenge/", ""))
    ).length;
  }

  const totalChallenges = ALL_TRACKS.reduce(
    (s, t) => s + t.topics.reduce((ts, tp) => ts + tp.challenges.length, 0),
    0
  );
  const totalCompleted = mounted
    ? Object.values(academies["react-interview"]?.modules ?? {}).filter((m) => m.completed).length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8"
      >
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-surface) 65%)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
          />
          <div className="relative space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  <BrainCircuit size={18} style={{ color: "var(--accent-primary)" }} aria-hidden />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">Interview Prep</h1>
              </div>
              <p className="text-sm ml-[52px] text-secondary">
                Pick a topic area and work through real interview challenges with live test execution.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 ml-[52px]">
              <div className="flex items-center gap-1.5">
                <BrainCircuit size={13} style={{ color: "var(--accent-primary)" }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent-primary)" }}>
                  {ALL_TRACKS.filter((t) => !t.comingSoon).length}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>live tracks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent-secondary)" }}>{totalChallenges}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>challenges</span>
              </div>
              {mounted && totalCompleted > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--success)" }}>{totalCompleted}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Track grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {ALL_TRACKS.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            completedCount={getTrackCompleted(track.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
