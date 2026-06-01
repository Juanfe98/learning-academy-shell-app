"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Clock, Map, Search, X, ArrowRight } from "lucide-react";
import Link from "next/link";
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

// Flat index: one entry per route across all academies
const SEARCH_INDEX = HUB_ACADEMIES.flatMap((academy) =>
  academy.routes.map((route) => ({
    route,
    academySlug: academy.slug,
    academyTitle: academy.title,
    accentColor: academy.accentColor,
    searchable: [
      route.title,
      ...(route.tags ?? []),
      ...(route.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase(),
  }))
);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function PathsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
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

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return SEARCH_INDEX.filter((entry) => entry.searchable.includes(q));
  }, [query]);

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
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-surface) 65%)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
          />
          <div className="relative space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  <Map size={18} style={{ color: "var(--accent-primary)" }} aria-hidden />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">Learning Paths</h1>
              </div>
              <p className="text-sm ml-[52px] text-secondary">
                Structured courses to take you from zero to production-ready.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 ml-[52px]">
              <div className="flex items-center gap-1.5">
                <Map size={13} style={{ color: "var(--accent-primary)" }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent-primary)" }}>{HUB_ACADEMIES.length}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>paths</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen size={13} style={{ color: "var(--accent-secondary)" }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent-secondary)" }}>{TOTAL_MODULES}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>modules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} style={{ color: "var(--text-muted)" }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums text-secondary">~{TOTAL_HOURS}h</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>total</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative mb-5"
      >
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules by topic, tag, or keyword…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-primary placeholder:text-muted outline-none transition-colors duration-150"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </motion.div>

      {/* Filter tabs — hidden while searching */}
      <AnimatePresence>
        {!searchResults && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
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
        )}
      </AnimatePresence>

      {/* Search results */}
      <AnimatePresence mode="wait">
        {searchResults ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className="text-xs text-muted mb-4">
              {searchResults.length === 0
                ? "No modules found."
                : `${searchResults.length} module${searchResults.length === 1 ? "" : "s"} found`}
            </p>
            <div className="flex flex-col gap-2">
              {searchResults.map(({ route, academySlug, academyTitle, accentColor }) => (
                <Link
                  key={`${academySlug}-${route.slug}`}
                  href={`/learn/${academySlug}/${route.slug}`}
                  className="group flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-colors duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}40`;
                    (e.currentTarget as HTMLElement).style.background = `${accentColor}08`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${accentColor}18`,
                        color: accentColor,
                        border: `1px solid ${accentColor}30`,
                      }}
                    >
                      {academyTitle}
                    </span>
                    <span className="text-sm text-primary truncate">{route.title}</span>
                    {route.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="hidden sm:inline text-[10px] text-muted px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-muted group-hover:text-primary transition-colors duration-150"
                  />
                </Link>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={filter}
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
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
        )}
      </AnimatePresence>

      {!searchResults && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Map size={28} className="text-muted" aria-hidden />
          <p className="text-sm text-secondary">No paths in this category yet.</p>
        </div>
      )}
    </div>
  );
}
