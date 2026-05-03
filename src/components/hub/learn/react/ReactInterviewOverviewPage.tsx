"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Sparkles, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { ReactDeepDiveChallengeModule } from "@/modules/react-deep-dive/interview-challenges-data";

const ACCENT = "#06b6d4";

const difficultyVariant = {
  easy: "success",
  medium: "warning",
  hard: "default",
} as const;

export default function ReactInterviewOverviewPage({
  module,
}: {
  module: ReactDeepDiveChallengeModule;
}) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const progress = mounted ? (academies["react-deep-dive"]?.modules ?? {}) : {};
  const completedCount = module.challenges.filter(
    (challenge) => progress[`challenge/${challenge.id}`]?.completed === true,
  ).length;

  return (
    <div className="flex-1 min-w-0">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-start gap-5 mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 select-none"
              style={{
                background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}40`,
                boxShadow: `0 0 24px ${ACCENT}20`,
              }}
            >
              🎯
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">
                {module.title}
              </h1>
              <p className="text-secondary text-sm leading-relaxed">{module.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-secondary">
              <Sparkles size={14} className="text-muted" />
              <strong className="text-primary">{module.challenges.length}</strong> challenges
            </span>
            <span className="text-border-subtle">·</span>
            <span className="flex items-center gap-1.5 text-secondary">
              <Clock size={14} className="text-muted" />
              ~<strong className="text-primary">{Math.round(module.estimatedMinutes / 60)}h</strong>
            </span>
            {mounted && (
              <>
                <span className="text-border-subtle">·</span>
                <span className="text-secondary">
                  <strong className="text-primary">{completedCount}/{module.challenges.length}</strong> completed
                </span>
              </>
            )}
          </div>
        </motion.div>

        <section>
          <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Sparkles size={15} style={{ color: ACCENT }} />
            Challenge Bank
          </h2>

          <div className="space-y-2">
            {module.challenges.map((challenge, index) => {
              const done = progress[`challenge/${challenge.id}`]?.completed === true;

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                >
                  <Link
                    href={`/learn/react-deep-dive/challenge/${challenge.id}`}
                    className="group flex items-start gap-4 p-4 rounded-xl transition-colors duration-150 hover:bg-white/[0.04]"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) =>
                      (((e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.07)"))
                    }
                    onMouseLeave={(e) =>
                      (((e.currentTarget as HTMLElement).style.borderColor = "transparent"))
                    }
                  >
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={
                        done
                          ? {
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.4)",
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }
                      }
                    >
                      {done ? (
                        <CheckCircle2 size={16} className="text-success" />
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span
                          className="text-sm font-medium leading-snug"
                          style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}
                        >
                          {done ? <span className="line-through opacity-60">{challenge.title}</span> : challenge.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={difficultyVariant[challenge.difficulty]} className="text-[10px]">
                            {challenge.difficulty}
                          </Badge>
                          <Badge variant="default" className="text-[10px]">
                            <Clock size={9} />
                            {challenge.estimatedMinutes}m
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {challenge.summary}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {challenge.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="default" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: ACCENT }}
                    />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
