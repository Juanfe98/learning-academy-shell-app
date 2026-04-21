"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Filter } from "lucide-react";
import { Badge } from "@/components/ui";
import TopicCard from "./TopicCard";
import { useProgressStore } from "@/lib/store";
import type { Difficulty, InterviewTrack } from "@/modules/react-interview/data/types";

const DIFFICULTY_VARIANT: Record<Difficulty, "success" | "warning" | "default"> = {
  easy: "success",
  medium: "warning",
  hard: "default",
};

type DifficultyFilter = "all" | Difficulty;

const DIFF_FILTERS: { id: DifficultyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

interface Props {
  track: InterviewTrack;
}

export default function ChallengeBrowser({ track }: Props) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>("all");
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);

  useEffect(() => setMounted(true), []);

  function getCompleted(topicId: string): number {
    if (!mounted) return 0;
    const modules = academies["react-interview"]?.modules ?? {};
    return track.topics.find((t) => t.id === topicId)?.challenges.filter(
      (c) => modules[`challenge/${c.id}`]?.completed
    ).length ?? 0;
  }

  const visibleTopics = activeTopic
    ? track.topics.filter((t) => t.id === activeTopic)
    : track.topics;

  const visibleChallenges = visibleTopics
    .flatMap((t) => t.challenges)
    .filter((c) => diffFilter === "all" || c.difficulty === diffFilter);

  const totalChallenges = track.topics.reduce((s, t) => s + t.challenges.length, 0);
  const totalCompleted = mounted
    ? Object.values(academies["react-interview"]?.modules ?? {}).filter((m) => m.completed).length
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Breadcrumb + Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8"
      >
        <Link
          href="/interview"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          All Tracks
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl leading-none">{track.icon}</span>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{track.title}</h1>
        </div>
        <p className="text-secondary text-sm mb-3">{track.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span>{track.topics.length} topics</span>
          <span className="w-px h-3 bg-border-subtle" />
          <span>{totalChallenges} challenges</span>
          {mounted && totalCompleted > 0 && (
            <>
              <span className="w-px h-3 bg-border-subtle" />
              <span style={{ color: "var(--success)" }}>{totalCompleted} completed</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Topic grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {track.topics.map((topic, i) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            completedCount={getCompleted(topic.id)}
            index={i}
            onClick={() => setActiveTopic((prev) => (prev === topic.id ? null : topic.id))}
            active={activeTopic === topic.id}
          />
        ))}
      </div>

      {/* Challenge list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-secondary">
            {activeTopic
              ? `${track.topics.find((t) => t.id === activeTopic)?.title} challenges`
              : "All challenges"}
          </h2>
          <div className="flex items-center gap-1.5">
            <Filter size={11} className="text-muted" />
            {DIFF_FILTERS.map(({ id, label }) => {
              const active = diffFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setDiffFilter(id)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                  style={
                    active
                      ? {
                          background: "rgba(99,102,241,0.15)",
                          border: "1px solid rgba(99,102,241,0.35)",
                          color: "var(--accent-secondary)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-muted)",
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          {visibleChallenges.map((challenge, i) => {
            const topic = track.topics.find((t) => t.id === challenge.topicId);
            const isCompleted =
              mounted &&
              !!academies["react-interview"]?.modules?.[`challenge/${challenge.id}`]?.completed;

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
              >
                <Link
                  href={`/interview/${track.id}/${challenge.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span className="text-base leading-none">{topic?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary group-hover:text-accent transition-colors truncate">
                        {challenge.title}
                      </span>
                      {isCompleted && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            background: "rgba(34,197,94,0.1)",
                            color: "var(--success)",
                            border: "1px solid rgba(34,197,94,0.2)",
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">{topic?.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={DIFFICULTY_VARIANT[challenge.difficulty]}>
                      {challenge.difficulty}
                    </Badge>
                    <span className="text-xs text-muted">{challenge.estimatedMinutes}m</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {visibleChallenges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <span className="text-2xl">{track.icon}</span>
            <p className="text-sm">No challenges match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
