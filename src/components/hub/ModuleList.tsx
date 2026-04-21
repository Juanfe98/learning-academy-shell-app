"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ExternalLink, Lock } from "lucide-react";
import { Badge } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { MockAcademy } from "@/lib/mock-data";

interface ModuleListProps {
  academy: MockAcademy;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const row = {
  hidden: { opacity: 0, x: -14 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export default function ModuleList({ academy }: ModuleListProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const routeProgress = mounted ? (academies[academy.slug]?.modules ?? {}) : {};

  const isCompleted = (slug: string) => routeProgress[slug]?.completed === true;
  const isVisited = (slug: string) => !!routeProgress[slug]?.visitedAt;

  return (
    <motion.ol
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-2"
      aria-label="Module list"
    >
      {academy.learningPath.map((routeSlug, index) => {
        const route = academy.routes.find((r) => r.slug === routeSlug);
        if (!route) return null;

        const completed = isCompleted(routeSlug);
        const prevVisited = index === 0 || isVisited(academy.learningPath[index - 1]);
        const softLocked = !academy.externalUrl && !prevVisited && !completed;

        const sharedProps = {
          className: "group flex items-start gap-4 p-4 rounded-xl transition-colors duration-150 hover:bg-white/[0.04]",
          style: { border: "1px solid transparent" } as React.CSSProperties,
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"),
          onMouseLeave: (e: React.MouseEvent<HTMLElement>) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "transparent"),
        };

        const rowContent = (
          <>
            {/* Step indicator */}
            <div
              className="relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={
                completed
                  ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${softLocked ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)"}`,
                    }
              }
            >
              {completed ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <span style={{ color: softLocked ? "var(--text-muted)" : "var(--text-secondary)" }}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <span
                  className="text-sm font-medium leading-snug transition-colors"
                  style={{
                    color: completed
                      ? "var(--text-secondary)"
                      : softLocked
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  }}
                >
                  {completed && (
                    <span className="line-through opacity-60 mr-1">{route.title}</span>
                  )}
                  {!completed && route.title}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {academy.externalUrl ? (
                    <ExternalLink size={12} className="text-muted" />
                  ) : (
                    softLocked && !completed && <Lock size={12} className="text-muted" />
                  )}
                  {route.estimatedMinutes && (
                    <Badge variant="default" className="text-[10px]">
                      <Clock size={9} />
                      {route.estimatedMinutes}m
                    </Badge>
                  )}
                </div>
              </div>

              {route.tags && route.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {route.tags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        );

        return (
          <motion.li key={routeSlug} variants={row}>
            {academy.externalUrl ? (
              <a href={academy.externalUrl} target="_blank" rel="noopener noreferrer" {...sharedProps}>
                {rowContent}
              </a>
            ) : (
              <Link href={`/learn/${academy.slug}/${routeSlug}`} {...sharedProps}>
                {rowContent}
              </Link>
            )}
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
