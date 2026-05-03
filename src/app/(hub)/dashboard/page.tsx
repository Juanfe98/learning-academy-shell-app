"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, animate } from "framer-motion";
import {
  Flame,
  CheckCircle2,
  Clock,
  Trophy,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Badge, ProgressBar } from "@/components/ui";
import { HUB_ACADEMIES } from "@/lib/hub-academies";
import { useProgressStore } from "@/lib/store";
import type { AcademyProgress } from "@/lib/store";

/* ─── Count-up hook ──────────────────────────────────────────────────────── */

function useCountUp(target: number, decimals = 0, duration = 1.2): string {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (target === 0) {
      setDisplay("0");
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return controls.stop;
  }, [target, decimals, duration]);

  return display;
}

/* ─── Time ago ───────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Heatmap data (mock, deterministic) ────────────────────────────────── */

interface HeatmapDay {
  date: string;
  count: number;
}

function generateHeatmapData(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const today = new Date();
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    // Sinusoidal clustering for a natural look
    const bias = Math.sin(i / 18) * 0.15;
    const hasActivity = rand() + bias > 0.42;
    const count = hasActivity ? Math.ceil(rand() * 5) : 0;
    days.push({ date: dateStr, count });
  }
  return days;
}

// Generated once at module load — stable across re-renders
const HEATMAP_DATA = generateHeatmapData();

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function cellColor(count: number): string {
  if (count === 0) return "var(--bg-elevated)";
  if (count === 1) return "rgba(99,102,241,0.2)";
  if (count === 2) return "rgba(99,102,241,0.4)";
  if (count === 3) return "rgba(99,102,241,0.6)";
  if (count === 4) return "rgba(99,102,241,0.8)";
  return "var(--accent-primary)";
}

/* ─── Section: Stats ─────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  rawValue,
  decimals = 0,
  suffix = "",
  label,
  subtitle,
  accent,
  delay = 0,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  rawValue: number;
  decimals?: number;
  suffix?: string;
  label: string;
  subtitle: string;
  accent: string;
  delay?: number;
}) {
  const display = useCountUp(rawValue, decimals);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}
        >
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <span className="text-4xl font-bold text-primary tabular-nums">
          {display}
          {suffix && (
            <span className="text-2xl font-bold text-secondary ml-0.5">{suffix}</span>
          )}
        </span>
        <p className="text-xs text-muted mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function StatsSection({
  streak,
  modulesCompleted,
  totalMinutesStudied,
}: {
  streak: { current: number; longest: number };
  modulesCompleted: number;
  totalMinutesStudied: number;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-primary mb-4">Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Flame}
          rawValue={streak.current}
          label="Day Streak"
          subtitle="Keep it up!"
          accent="#f59e0b"
          delay={0}
        />
        <StatCard
          icon={CheckCircle2}
          rawValue={modulesCompleted}
          label="Modules Completed"
          subtitle="Across all paths"
          accent="#22c55e"
          delay={0.07}
        />
        <StatCard
          icon={Clock}
          rawValue={totalMinutesStudied / 60}
          decimals={1}
          suffix="h"
          label="Hours Studied"
          subtitle="Total learning time"
          accent="#3b82f6"
          delay={0.14}
        />
        <StatCard
          icon={Trophy}
          rawValue={streak.longest}
          label="Longest Streak"
          subtitle="Personal best"
          accent="#6366f1"
          delay={0.21}
        />
      </div>
    </section>
  );
}

/* ─── Section: Per-academy progress ──────────────────────────────────────── */

function AcademyProgressSection({
  academies,
}: {
  academies: Record<string, AcademyProgress>;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-primary mb-4">Learning Paths</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {HUB_ACADEMIES.map((academy, i) => {
          const modules = Object.values(academies[academy.slug]?.modules ?? {});
          const completedCount = modules.filter((m) => m.completed).length;
          const percent =
            academy.moduleCount > 0
              ? Math.round((completedCount / academy.moduleCount) * 100)
              : 0;

          return (
            <motion.div
              key={academy.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.1 + i * 0.07,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <Link
                href={`/paths/${academy.slug}`}
                className="group block glass rounded-2xl p-4 transition-colors duration-150 hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 select-none"
                      style={{
                        background: `${academy.accentColor}18`,
                        border: `1px solid ${academy.accentColor}40`,
                      }}
                    >
                      {academy.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        {academy.title}
                      </p>
                      <p className="text-xs text-muted">
                        {academy.comingSoon
                          ? `${academy.moduleCount} modules planned`
                          : `${completedCount} / ${academy.moduleCount} modules`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {academy.comingSoon ? (
                      <Badge variant="warning">Soon</Badge>
                    ) : (
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: academy.accentColor }}
                      >
                        {percent}%
                      </span>
                    )}
                    <ChevronRight
                      size={14}
                      className="text-muted group-hover:text-secondary group-hover:translate-x-0.5 transition-all duration-150"
                    />
                  </div>
                </div>

                {!academy.comingSoon && (
                  <ProgressBar value={percent} color={academy.accentColor} size="sm" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Section: Activity heatmap ──────────────────────────────────────────── */

interface TooltipState {
  x: number;
  y: number;
  date: string;
  count: number;
}

function HeatmapSection() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Group flat days array into 7-day week columns
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < HEATMAP_DATA.length; i += 7) {
    weeks.push(HEATMAP_DATA.slice(i, i + 7));
  }

  // Detect which column starts a new month
  const monthMarkers = new Map<number, string>();
  weeks.forEach((week, col) => {
    const d = new Date(week[0].date + "T12:00:00");
    if (d.getDate() <= 7) {
      monthMarkers.set(col, MONTH_LABELS[d.getMonth()]);
    }
  });

  return (
    <section>
      <h2 className="text-lg font-semibold text-primary mb-4">Activity</h2>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass rounded-2xl p-5"
      >
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex gap-2" style={{ minWidth: "max-content" }}>
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-[3px] pt-[18px] pr-1.5">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="h-[10px] w-6 flex items-center justify-end text-[9px] text-muted leading-none"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div>
              {/* Month labels */}
              <div className="flex gap-[3px] mb-[5px] h-[13px]">
                {weeks.map((_, col) => (
                  <div
                    key={col}
                    className="w-[10px] text-[9px] text-muted leading-none overflow-visible whitespace-nowrap"
                  >
                    {monthMarkers.get(col) ?? ""}
                  </div>
                ))}
              </div>

              {/* Cell grid */}
              <div className="flex gap-[3px]">
                {weeks.map((week, col) => (
                  <div key={col} className="flex flex-col gap-[3px]">
                    {week.map((day) => (
                      <div
                        key={day.date}
                        className="w-[10px] h-[10px] rounded-[2px] cursor-default transition-opacity duration-75 hover:opacity-80"
                        style={{ background: cellColor(day.count) }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top, date: day.date, count: day.count });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-muted">Less</span>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ background: cellColor(n) }}
            />
          ))}
          <span className="text-[10px] text-muted">More</span>
        </div>
      </motion.div>

      {/* Fixed tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg text-xs pointer-events-none"
          style={{
            top: tooltip.y - 38,
            left: tooltip.x,
            transform: "translateX(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <span className="font-medium text-primary">
            {tooltip.count === 0
              ? "No activity"
              : `${tooltip.count} module${tooltip.count > 1 ? "s" : ""}`}
          </span>
          <span className="text-muted ml-1.5">
            {new Date(tooltip.date + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}
    </section>
  );
}

/* ─── Section: Recent activity feed ──────────────────────────────────────── */

interface ActivityEntry {
  academySlug: string;
  academyTitle: string;
  moduleSlug: string;
  moduleTitle: string;
  lastVisitedAt: string;
  completed: boolean;
  accentColor: string;
}

function RecentActivitySection({
  academies,
}: {
  academies: Record<string, AcademyProgress>;
}) {
  const entries: ActivityEntry[] = [];

  for (const academy of HUB_ACADEMIES) {
    const academyProgress = academies[academy.slug];
    if (!academyProgress?.modules) continue;

    for (const [moduleSlug, mod] of Object.entries(academyProgress.modules)) {
      const route = academy.routes.find((r) => r.slug === moduleSlug);
      entries.push({
        academySlug: academy.slug,
        academyTitle: academy.title,
        moduleSlug,
        moduleTitle: route?.title ?? moduleSlug,
        lastVisitedAt: mod.lastVisitedAt,
        completed: mod.completed,
        accentColor: academy.accentColor,
      });
    }
  }

  entries.sort(
    (a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime()
  );
  const recent = entries.slice(0, 10);

  return (
    <section>
      <h2 className="text-lg font-semibold text-primary mb-4">Recent Activity</h2>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass rounded-2xl overflow-hidden"
      >
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <BookOpen size={28} className="text-muted" />
            <p className="text-sm text-secondary">No activity yet. Start learning!</p>
            <Link
              href="/paths"
              className="text-xs transition-colors mt-1"
              style={{ color: "var(--accent-secondary)" }}
            >
              Browse learning paths →
            </Link>
          </div>
        ) : (
          <ul>
            {recent.map((entry, i) => (
              <motion.li
                key={`${entry.academySlug}-${entry.moduleSlug}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.04 }}
              >
                <Link
                  href={`/learn/${entry.academySlug}/${entry.moduleSlug}`}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-border-subtle last:border-b-0"
                >
                  {/* Status dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: entry.completed
                        ? "var(--success)"
                        : entry.accentColor,
                    }}
                  />

                  {/* Module info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate group-hover:text-accent-soft transition-colors">
                      {entry.moduleTitle}
                    </p>
                    <p className="text-xs text-muted">{entry.academyTitle}</p>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.completed && (
                      <CheckCircle2 size={12} className="text-success" />
                    )}
                    <span className="text-xs text-muted tabular-nums">
                      {timeAgo(entry.lastVisitedAt)}
                    </span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { academies, streak, totalMinutesStudied } = useProgressStore();

  useEffect(() => setMounted(true), []);

  const modulesCompleted = mounted
    ? Object.values(academies)
        .flatMap((a) => Object.values(a.modules ?? {}))
        .filter((m) => m.completed).length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-secondary mt-1">
          Your learning progress at a glance.
        </p>
      </motion.div>

      {mounted && (
        <StatsSection
          streak={{ current: streak.current, longest: streak.longest }}
          modulesCompleted={modulesCompleted}
          totalMinutesStudied={totalMinutesStudied}
        />
      )}

      {mounted && <AcademyProgressSection academies={academies} />}

      <HeatmapSection />

      {mounted && <RecentActivitySection academies={academies} />}
    </div>
  );
}
