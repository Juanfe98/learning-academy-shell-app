"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Code2,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { Lesson } from "@/modules/web-fundamentals/data";

interface LessonPageProps {
  lesson: Lesson;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  children: ReactNode;
}

export default function LessonPage({ lesson, prevLesson, nextLesson, children }: LessonPageProps) {
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const markModuleVisited = useProgressStore((s) => s.markModuleVisited);
  const markModuleComplete = useProgressStore((s) => s.markModuleComplete);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read initial completion status once on mount / lesson change — no academies dep
  // to avoid re-triggering after markModuleVisited updates the store.
  useEffect(() => {
    if (!mounted) return;
    const slug = `lesson/${lesson.id}`;
    const snap = useProgressStore.getState().academies;
    setCompleted(snap["web-fundamentals"]?.modules?.[slug]?.completed === true);
    markModuleVisited("web-fundamentals", slug, lesson.title, lesson.estimatedMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lesson.id]);

  function handleMarkComplete() {
    markModuleComplete("web-fundamentals", `lesson/${lesson.id}`);
    setCompleted(true);
  }

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Lesson header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="default" className="text-[10px]">
              <Clock size={9} />
              {lesson.estimatedMinutes} min
            </Badge>
            {mounted && completed && (
              <Badge variant="success" className="text-[10px]">
                <CheckCircle2 size={9} />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight mb-3">{lesson.title}</h1>
          <p className="text-secondary text-sm leading-relaxed">{lesson.summary}</p>
        </motion.div>

        {/* Learning objectives */}
        {lesson.learningObjectives.length > 0 && (
          <section className="mb-8 p-4 rounded-xl" style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#0ea5e9" }}>
              <Target size={13} />
              Learning Objectives
            </h2>
            <ul className="space-y-1.5">
              {lesson.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                  <span className="mt-0.5 shrink-0 text-[10px] font-bold" style={{ color: "#0ea5e9" }}>
                    {i + 1}.
                  </span>
                  {obj}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Explanation */}
        <section className="mb-8 article-content">{children}</section>

        {/* Code examples */}
        {lesson.codeExamples.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Code2 size={15} style={{ color: "#0ea5e9" }} />
              Code Examples
            </h2>
            <div className="space-y-4">
              {lesson.codeExamples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-xs font-medium text-secondary">{ex.title}</span>
                    {ex.description && (
                      <span className="text-[11px] text-muted hidden sm:block">{ex.description}</span>
                    )}
                  </div>
                  {ex.html && (
                    <div style={{ background: "var(--bg-elevated)" }}>
                      <div className="px-3 py-1 text-[10px] text-muted" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>HTML</div>
                      <pre className="p-4 text-xs overflow-x-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        <code>{ex.html}</code>
                      </pre>
                    </div>
                  )}
                  {ex.css && (
                    <div style={{ background: "var(--bg-elevated)", borderTop: ex.html ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                      <div className="px-3 py-1 text-[10px] text-muted" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>CSS</div>
                      <pre className="p-4 text-xs overflow-x-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        <code>{ex.css}</code>
                      </pre>
                    </div>
                  )}
                  {ex.js && (
                    <div style={{ background: "var(--bg-elevated)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="px-3 py-1 text-[10px] text-muted" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>JS</div>
                      <pre className="p-4 text-xs overflow-x-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        <code>{ex.js}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Common mistakes */}
        {lesson.commonMistakes.length > 0 && (
          <section className="mb-8 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 text-error">
              <AlertTriangle size={13} />
              Common Mistakes
            </h2>
            <ul className="space-y-2">
              {lesson.commonMistakes.map((mistake, i) => (
                <li key={i} className="text-sm text-secondary leading-relaxed flex items-start gap-2">
                  <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-error opacity-60" />
                  {mistake}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Interview tips */}
        {lesson.interviewTips.length > 0 && (
          <section className="mb-8 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 text-warning">
              <Lightbulb size={13} />
              Interview Tips
            </h2>
            <ul className="space-y-3">
              {lesson.interviewTips.map((tip, i) => (
                <li key={i} className="text-sm text-secondary leading-relaxed">
                  <span className="font-semibold text-warning mr-1">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Practice tasks */}
        {lesson.practiceTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-primary mb-4">Practice Tasks</h2>
            <div className="space-y-3">
              {lesson.practiceTasks.map((task, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-sm text-secondary leading-relaxed mb-2">
                    <span className="font-semibold text-primary mr-1.5">Task {i + 1}.</span>
                    {task.description}
                  </p>
                  {task.hint && (
                    <p className="text-xs text-muted leading-relaxed">
                      <span className="font-medium">Hint: </span>{task.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mark complete */}
        {mounted && !completed && (
          <button
            onClick={handleMarkComplete}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-150 mb-8"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--success)",
            }}
          >
            Mark lesson as complete ✓
          </button>
        )}

        {mounted && completed && (
          <div
            className="w-full py-3 rounded-xl text-sm font-semibold text-center mb-8"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={14} className="inline mr-2" />
            Lesson completed
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-4 pt-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {prevLesson ? (
            <Link
              href={`/learn/web-fundamentals/lesson/${prevLesson.id}`}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="truncate max-w-[180px]">{prevLesson.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              href={`/learn/web-fundamentals/lesson/${nextLesson.id}`}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors group ml-auto"
            >
              <span className="truncate max-w-[180px] text-right">{nextLesson.title}</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
