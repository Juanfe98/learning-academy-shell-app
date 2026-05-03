"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { HubAcademy } from "@/lib/hub-academies";

interface PathProgressPanelProps {
  academy: HubAcademy;
}

export default function PathProgressPanel({ academy }: PathProgressPanelProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const routeProgress = mounted ? (academies[academy.slug]?.modules ?? {}) : {};
  const completedCount = mounted
    ? Object.values(routeProgress).filter((r) => r.completed).length
    : 0;
  const total = academy.moduleCount;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const minutesCompleted = mounted
    ? academy.routes
        .filter((r) => routeProgress[r.slug]?.completed)
        .reduce((sum, r) => sum + (r.estimatedMinutes ?? 0), 0)
    : 0;
  const totalMinutes = academy.routes.reduce((sum, r) => sum + (r.estimatedMinutes ?? 0), 0);
  const minutesRemaining = totalMinutes - minutesCompleted;
  const hoursRemaining = Math.ceil(minutesRemaining / 60);

  const isCompleted = (slug: string) =>
    mounted ? routeProgress[slug]?.completed === true : false;

  const firstIncomplete =
    academy.learningPath.find((slug) => !isCompleted(slug)) ??
    academy.learningPath[academy.learningPath.length - 1];

  const currentIndex = firstIncomplete
    ? academy.learningPath.indexOf(firstIncomplete)
    : -1;

  return (
    <div className="space-y-4 sticky top-8">
      {/* Progress card */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Your Progress</h3>
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: academy.accentColor }}
          >
            {percent}%
          </span>
        </div>

        <ProgressBar
          value={percent}
          color={academy.accentColor}
          size="md"
          layoutId={`panel-progress-${academy.slug}`}
        />

        <div className="grid grid-cols-2 gap-3 text-center">
          <div
            className="rounded-lg py-2.5 px-2"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-lg font-bold text-primary tabular-nums">{completedCount}</p>
            <p className="text-[10px] text-muted mt-0.5">
              of {total} modules
            </p>
          </div>
          <div
            className="rounded-lg py-2.5 px-2"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-lg font-bold text-primary tabular-nums">
              ~{hoursRemaining}h
            </p>
            <p className="text-[10px] text-muted mt-0.5">remaining</p>
          </div>
        </div>
      </div>

      {/* Mini-map */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className="text-sm font-semibold text-primary mb-4">Learning Path</h3>

        <div className="flex flex-wrap gap-2" aria-label="Module progress map">
          {academy.learningPath.map((slug, i) => {
            const done = isCompleted(slug);
            const isCurrent = i === currentIndex;

            return (
              <div
                key={slug}
                title={academy.routes.find((r) => r.slug === slug)?.title ?? slug}
                className="relative"
              >
                <div
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={
                    done
                      ? { background: academy.accentColor }
                      : isCurrent
                      ? {
                          background: academy.accentColor,
                          opacity: 0.5,
                        }
                      : {
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }
                  }
                />
                {isCurrent && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: academy.accentColor, opacity: 0.35 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted mt-3">
          {completedCount} / {total} modules complete
        </p>
      </div>
    </div>
  );
}
