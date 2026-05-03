"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Clock, Map } from "lucide-react";
import PathCard from "@/components/hub/PathCard";
import { HUB_ACADEMIES } from "@/lib/hub-academies";
import { useProgressStore } from "@/lib/store";

type Filter = "all" | "available" | "soon";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "soon", label: "Coming Soon" },
];

const TOTAL_MODULES = HUB_ACADEMIES.reduce((s, a) => s + a.moduleCount, 0);
const TOTAL_HOURS = HUB_ACADEMIES.reduce((s, a) => s + a.totalHours, 0);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function PathsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);

  useEffect(() => setMounted(true), []);

  const counts: Record<Filter, number> = {
    all: HUB_ACADEMIES.length,
    available: HUB_ACADEMIES.filter((a) => !a.comingSoon).length,
    soon: HUB_ACADEMIES.filter((a) => a.comingSoon).length,
  };

  const filtered = HUB_ACADEMIES.filter((a) => {
    if (filter === "available") return !a.comingSoon;
    if (filter === "soon") return a.comingSoon;
    return true;
  });

  function getProgress(slug: string, moduleCount: number): number {
    if (!mounted || moduleCount === 0) return 0;
    const mods = Object.values(academies[slug]?.modules ?? {});
    return Math.round((mods.filter((m) => m.completed).length / moduleCount) * 100);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <Map size={16} style={{ color: "var(--accent-primary)" }} aria-hidden />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Learning Paths</h1>
        </div>
        <p className="text-secondary text-sm mb-4">
          Structured courses to take you from zero to production-ready.
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Map size={12} aria-hidden />
            {HUB_ACADEMIES.length} paths
          </span>
          <span className="w-px h-3 bg-border-subtle" aria-hidden />
          <span className="flex items-center gap-1.5">
            <BookOpen size={12} aria-hidden />
            {TOTAL_MODULES} modules
          </span>
          <span className="w-px h-3 bg-border-subtle" aria-hidden />
          <span className="flex items-center gap-1.5">
            <Clock size={12} aria-hidden />
            ~{TOTAL_HOURS}h total
          </span>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center gap-2 mb-7"
        role="tablist"
        aria-label="Filter learning paths"
      >
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-150"
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
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums"
                style={
                  active
                    ? { background: "rgba(99,102,241,0.25)", color: "var(--accent-secondary)" }
                    : { background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }
                }
              >
                {counts[id]}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Cards grid */}
      <motion.div
        key={filter}
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {filtered.map((academy, i) => (
          <PathCard
            key={academy.slug}
            academy={academy}
            progress={getProgress(academy.slug, academy.moduleCount)}
            index={i}
          />
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Map size={28} className="text-muted" aria-hidden />
          <p className="text-sm text-secondary">No paths in this category yet.</p>
        </div>
      )}
    </div>
  );
}
