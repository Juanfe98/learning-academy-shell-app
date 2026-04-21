"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, BookOpen, Zap } from "lucide-react";
import { useProgressStore } from "@/lib/store";
import { WF_MODULES } from "@/modules/web-fundamentals/data";

interface WFLearnSidebarProps {
  moduleId: string;
  itemId: string;
  itemType: "overview" | "lesson" | "challenge";
}

const ACCENT = "#0ea5e9";

export default function WFLearnSidebar({ moduleId, itemId, itemType }: WFLearnSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const progress = mounted ? (academies["web-fundamentals"]?.modules ?? {}) : {};
  const isCompleted = (slug: string) => progress[slug]?.completed === true;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center gap-3 border-b shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 select-none"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}40` }}
        >
          🌐
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary truncate">Web Fundamentals</p>
          <p className="text-[10px] text-muted">{WF_MODULES.length} modules</p>
        </div>
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Course navigation">
        {WF_MODULES.map((mod) => {
          const isActiveModule = mod.id === moduleId;
          const totalLessons = mod.lessons.length;
          const completedLessons = mod.lessons.filter((l) => isCompleted(`lesson/${l.id}`)).length;
          const allDone = totalLessons > 0 && completedLessons === totalLessons;

          return (
            <div key={mod.id} className="mb-1">
              {/* Module row */}
              <Link
                href={`/learn/web-fundamentals/module/${mod.id}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors duration-100 group"
                style={{
                  background: isActiveModule ? `${ACCENT}14` : "transparent",
                  borderLeft: isActiveModule ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
              >
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={
                    allDone
                      ? { background: "rgba(34,197,94,0.15)" }
                      : isActiveModule
                      ? { background: `${ACCENT}25` }
                      : { background: "rgba(255,255,255,0.05)" }
                  }
                >
                  {allDone ? (
                    <CheckCircle2 size={12} className="text-success" />
                  ) : (
                    <span style={{ color: isActiveModule ? ACCENT : "var(--text-muted)" }}>
                      {mod.order + 1}
                    </span>
                  )}
                </div>

                <span
                  className="text-xs leading-snug truncate flex-1 min-w-0"
                  style={{
                    color: isActiveModule ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActiveModule ? 600 : 400,
                  }}
                >
                  {mod.title}
                </span>

                {totalLessons > 0 && (
                  <ChevronDown
                    size={12}
                    className="shrink-0 transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: isActiveModule ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                )}
              </Link>

              {/* Sub-items: lessons + challenges (only for active module) */}
              {isActiveModule && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {mod.lessons.map((lesson) => {
                    const isActive = itemType === "lesson" && itemId === lesson.id;
                    const done = isCompleted(`lesson/${lesson.id}`);
                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/web-fundamentals/lesson/${lesson.id}`}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
                        style={{
                          background: isActive ? `${ACCENT}12` : "transparent",
                          color: isActive ? "var(--text-primary)" : done ? "var(--text-muted)" : "var(--text-secondary)",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {done ? (
                          <CheckCircle2 size={11} className="shrink-0 text-success" />
                        ) : (
                          <BookOpen size={11} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                        )}
                        <span className="text-[11px] leading-snug truncate">{lesson.title}</span>
                      </Link>
                    );
                  })}

                  {mod.challenges.map((challenge) => {
                    const isActive = itemType === "challenge" && itemId === challenge.id;
                    const done = isCompleted(`challenge/${challenge.id}`);
                    return (
                      <div
                        key={challenge.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                        style={{
                          background: isActive ? `${ACCENT}12` : "transparent",
                          color: "var(--text-muted)",
                          cursor: "default",
                          opacity: 0.7,
                        }}
                        title="Challenges coming in next update"
                      >
                        {done ? (
                          <CheckCircle2 size={11} className="shrink-0 text-success" />
                        ) : (
                          <Zap size={11} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                        )}
                        <span className="text-[11px] leading-snug truncate">{challenge.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
