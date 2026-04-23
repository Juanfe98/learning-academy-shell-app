"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Clock, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { LearningModule } from "@/modules/web-fundamentals/data";

interface ModuleOverviewPageProps {
  module: LearningModule;
}

const ACCENT = "#0ea5e9";

const difficultyColor: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function ModuleOverviewPage({ module }: ModuleOverviewPageProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const progress = mounted ? (academies["web-fundamentals"]?.modules ?? {}) : {};
  const isLessonCompleted = (id: string) => progress[`lesson/${id}`]?.completed === true;
  const completedCount = module.lessons.filter((l) => isLessonCompleted(l.id)).length;

  return (
    <div className="flex-1 min-w-0">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
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
              {module.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">
                {module.title}
              </h1>
              <p className="text-secondary text-sm leading-relaxed">{module.description}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-secondary">
              <BookOpen size={14} className="text-muted" />
              <strong className="text-primary">{module.lessons.length}</strong> lessons
            </span>
            <span className="text-border-subtle">·</span>
            <span className="flex items-center gap-1.5 text-secondary">
              <Clock size={14} className="text-muted" />
              ~<strong className="text-primary">{module.estimatedHours}h</strong>
            </span>
            {module.lessons.length > 0 && mounted && (
              <>
                <span className="text-border-subtle">·</span>
                <span className="text-secondary">
                  <strong className="text-primary">{completedCount}/{module.lessons.length}</strong> completed
                </span>
              </>
            )}
          </div>
        </motion.div>

        {/* Lessons */}
        {module.lessons.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-primary mb-4">Lessons</h2>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {module.lessons.map((lesson, idx) => {
                const done = isLessonCompleted(lesson.id);
                return (
                  <motion.div key={lesson.id} variants={item}>
                    <Link
                      href={`/learn/web-fundamentals/lesson/${lesson.id}`}
                      className="group flex items-start gap-4 p-4 rounded-xl transition-colors duration-150 hover:bg-white/[0.04]"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "transparent")}
                    >
                      <div
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                        style={
                          done
                            ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }
                            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }
                        }
                      >
                        {done ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span
                            className="text-sm font-medium leading-snug"
                            style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}
                          >
                            {done ? <span className="line-through opacity-60">{lesson.title}</span> : lesson.title}
                          </span>
                          <Badge variant="default" className="text-[10px] shrink-0">
                            <Clock size={9} />
                            {lesson.estimatedMinutes}m
                          </Badge>
                        </div>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{lesson.summary}</p>
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
            </motion.div>
          </section>
        )}

        {/* Challenges */}
        {module.challenges.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
              <Zap size={15} style={{ color: ACCENT }} />
              Practice Challenges
            </h2>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {module.challenges.map((challenge) => {
                const done = mounted && progress[`challenge/${challenge.id}`]?.completed === true;
                return (
                  <motion.div key={challenge.id} variants={item}>
                    <Link
                      href={`/learn/web-fundamentals/challenge/${challenge.id}`}
                      className="group flex items-start gap-4 p-4 rounded-xl transition-colors duration-150 hover:bg-white/[0.04]"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "transparent")}
                    >
                      <div
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                        style={
                          done
                            ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }
                            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }
                        }
                      >
                        {done ? (
                          <CheckCircle2 size={14} className="text-success" />
                        ) : (
                          <Zap size={14} style={{ color: difficultyColor[challenge.difficulty] }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}>
                            {challenge.title}
                          </span>
                          <Badge
                            variant={challenge.difficulty === "easy" ? "success" : challenge.difficulty === "medium" ? "warning" : "default"}
                            className="text-[10px]"
                          >
                            {challenge.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted leading-relaxed line-clamp-1">{challenge.description}</p>
                        {challenge.conceptsCovered.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {challenge.conceptsCovered.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] text-muted px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
            </motion.div>
          </section>
        )}

        {module.lessons.length === 0 && module.challenges.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">
            Content coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
