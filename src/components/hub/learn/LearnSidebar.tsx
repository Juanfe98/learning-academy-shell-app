"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useProgressStore } from "@/lib/store";

interface SidebarAcademy {
  slug: string;
  title: string;
  icon: string;
  accentColor: string;
  routes: Array<{ slug: string; title: string }>;
  learningPath: string[];
}

interface LearnSidebarProps {
  academy: SidebarAcademy;
  currentSlug: string;
}

export default function LearnSidebar({ academy, currentSlug }: LearnSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const routeProgress = mounted ? (academies[academy.slug]?.modules ?? {}) : {};
  const isCompleted = (slug: string) => routeProgress[slug]?.completed === true;

  return (
    <div className="flex flex-col h-full">
      {/* Academy header */}
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

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Module navigation">
        {academy.learningPath.map((routeSlug, index) => {
          const route = academy.routes.find((r) => r.slug === routeSlug);
          if (!route) return null;

          const isActive = routeSlug === currentSlug;
          const completed = isCompleted(routeSlug);

          return (
            <Link
              key={routeSlug}
              href={`/learn/${academy.slug}/${routeSlug}`}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg my-0.5 transition-colors duration-100 group relative"
              style={{
                background: isActive ? `${academy.accentColor}14` : "transparent",
                borderLeft: isActive ? `2px solid ${academy.accentColor}` : "2px solid transparent",
              }}
            >
              {/* Step number / check */}
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={
                  completed
                    ? { background: "rgba(34,197,94,0.15)" }
                    : isActive
                    ? { background: `${academy.accentColor}25` }
                    : { background: "rgba(255,255,255,0.05)" }
                }
              >
                {completed ? (
                  <CheckCircle2 size={12} className="text-success" />
                ) : (
                  <span
                    style={{
                      color: isActive ? academy.accentColor : "var(--text-muted)",
                    }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Title */}
              <span
                className="text-xs leading-snug truncate"
                style={{
                  color: isActive
                    ? "var(--text-primary)"
                    : completed
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {route.title}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
