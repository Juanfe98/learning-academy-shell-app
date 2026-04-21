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
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <BrainCircuit size={16} style={{ color: "var(--accent-primary)" }} aria-hidden />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Interview Prep</h1>
        </div>
        <p className="text-secondary text-sm mb-3">
          Pick a topic area and work through real interview challenges with live test execution.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span>{ALL_TRACKS.filter((t) => !t.comingSoon).length} live tracks</span>
          <span className="w-px h-3 bg-border-subtle" />
          <span>{totalChallenges} total challenges</span>
          {mounted && totalCompleted > 0 && (
            <>
              <span className="w-px h-3 bg-border-subtle" />
              <span style={{ color: "var(--success)" }}>{totalCompleted} completed</span>
            </>
          )}
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
