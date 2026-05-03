"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { getAcademyGroups } from "@/lib/academy-groups";
import { useProgressStore } from "@/lib/store";
import type { AcademyGroup } from "@/lib/types/academy";
import { REACT_DEEP_DIVE_INTERVIEW_MODULE } from "@/modules/react-deep-dive/interview-challenges-data";

interface SidebarAcademy {
  slug: string;
  title: string;
  icon: string;
  accentColor: string;
  routes: Array<{ slug: string; title: string }>;
  learningPath: string[];
  groups?: AcademyGroup[];
}

export default function ReactInterviewSidebar({
  academy,
  currentSlug,
  currentChallengeId,
}: {
  academy: SidebarAcademy;
  currentSlug: string;
  currentChallengeId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const routeProgress = mounted ? (academies[academy.slug]?.modules ?? {}) : {};
  const groups = getAcademyGroups(academy);
  const isCompleted = (slug: string) => routeProgress[slug]?.completed === true;
  const challengesExpanded =
    currentSlug === "interview-challenges" || currentSlug === "challenge";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="px-4 py-4 flex items-center gap-3 border-b shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 select-none"
          style={{
            background: `${academy.accentColor}18`,
            border: `1px solid ${academy.accentColor}40`,
          }}
        >
          {academy.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary truncate">{academy.title}</p>
          <p className="text-[10px] text-muted">{academy.learningPath.length} modules</p>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-2" aria-label="Module navigation">
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {group.title}
            </div>

            {group.routeSlugs.map((routeSlug) => {
              const index = academy.learningPath.indexOf(routeSlug);
              const route = academy.routes.find((r) => r.slug === routeSlug);
              if (!route || index === -1) return null;

              const isActiveModule =
                routeSlug === currentSlug ||
                (routeSlug === "interview-challenges" && currentSlug === "challenge");
              const completed = isCompleted(routeSlug);
              const isChallengeModule = routeSlug === "interview-challenges";

              return (
                <div key={routeSlug} className="mb-1">
                  <Link
                    href={`/learn/${academy.slug}/${routeSlug}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg my-0.5 transition-colors duration-100 group relative"
                    style={{
                      background: isActiveModule ? `${academy.accentColor}14` : "transparent",
                      borderLeft: isActiveModule
                        ? `2px solid ${academy.accentColor}`
                        : "2px solid transparent",
                    }}
                  >
                    <div
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={
                        completed
                          ? { background: "rgba(34,197,94,0.15)" }
                          : isActiveModule
                            ? { background: `${academy.accentColor}25` }
                            : { background: "rgba(255,255,255,0.05)" }
                      }
                    >
                      {completed ? (
                        <CheckCircle2 size={12} className="text-success" />
                      ) : (
                        <span
                          style={{
                            color: isActiveModule ? academy.accentColor : "var(--text-muted)",
                          }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-xs leading-snug truncate flex-1 min-w-0"
                      style={{
                        color: isActiveModule
                          ? "var(--text-primary)"
                          : completed
                            ? "var(--text-muted)"
                            : "var(--text-secondary)",
                        fontWeight: isActiveModule ? 600 : 400,
                      }}
                    >
                      {route.title}
                    </span>

                    {isChallengeModule && (
                      <ChevronDown
                        size={12}
                        className="shrink-0 transition-transform"
                        style={{
                          color: "var(--text-muted)",
                          transform: challengesExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      />
                    )}
                  </Link>

                  {isChallengeModule && challengesExpanded && (
                    <div className="ml-5 mt-0.5 space-y-0.5">
                      {REACT_DEEP_DIVE_INTERVIEW_MODULE.challenges.map((challenge) => {
                        const slug = `challenge/${challenge.id}`;
                        const done = isCompleted(slug);
                        const isActive = currentChallengeId === challenge.id;

                        return (
                          <Link
                            key={challenge.id}
                            href={`/learn/${academy.slug}/challenge/${challenge.id}`}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
                            style={{
                              background: isActive ? `${academy.accentColor}12` : "transparent",
                              color: isActive
                                ? "var(--text-primary)"
                                : done
                                  ? "var(--text-muted)"
                                  : "var(--text-secondary)",
                              fontWeight: isActive ? 500 : 400,
                            }}
                          >
                            {done ? (
                              <CheckCircle2 size={11} className="shrink-0 text-success" />
                            ) : (
                              <Sparkles size={11} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                            )}
                            <span className="text-[11px] leading-snug truncate">
                              {challenge.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
