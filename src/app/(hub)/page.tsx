"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";
import PathCard from "@/components/hub/PathCard";
import { HUB_ACADEMIES } from "@/lib/hub-academies";
import { useProgressStore } from "@/lib/store";

/* ─── Helpers ────────────────────────────────────────────��───────────────── */

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
  };
}

function inView(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
  };
}

function getAcademyProgress(
  academySlug: string,
  routes: Record<string, { completed: boolean }>,
  totalModules: number
): number {
  if (totalModules === 0) return 0;
  const completed = Object.values(routes).filter((r) => r.completed).length;
  return Math.round((completed / totalModules) * 100);
}

/* ─── Section: Hero ──────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
      {/* Animated gradient mesh blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="animate-blob-a absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="animate-blob-b absolute top-10 right-1/4 w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="animate-blob-c absolute -bottom-10 left-1/3 w-[350px] h-[350px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div {...fadeUp(0)}>
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "var(--accent-secondary)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Personal learning hub
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.08)}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-primary mb-5"
        >
          Your Engineering{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
            }}
          >
            Learning Hub
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.16)}
          className="text-lg text-secondary max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Everything you need to master modern software engineering. One place,
          zero distractions.
        </motion.p>

        <motion.div
          {...fadeUp(0.24)}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/paths">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              Browse Learning Paths
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              View Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Section: Learning Paths Grid ──────────────────────────────────────── */

function PathsSection({
  academyProgress,
}: {
  academyProgress: Record<string, number>;
}) {
  return (
    <section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <motion.div {...inView(0)} className="mb-8">
          <h2 className="text-2xl font-bold text-primary">Learning Paths</h2>
          <p className="text-sm text-secondary mt-1">
            Pick up where you left off, or start something new.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HUB_ACADEMIES.map((academy, i) => (
            <PathCard
              key={academy.slug}
              academy={academy}
              progress={academyProgress[academy.slug] ?? 0}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: Quick Stats Bar ───────────────────────────────────────────── */

function StatBlock({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string | number;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      {...inView(delay)}
      className="flex-1 flex flex-col items-center gap-2 py-6 px-4 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Icon size={18} className="text-muted" />
      <span className="text-3xl font-bold text-primary tabular-nums">{value}</span>
      <span className="text-xs text-muted text-center">{label}</span>
    </motion.div>
  );
}

function StatsSection({
  modulesCompleted,
  hoursStudied,
  dayStreak,
}: {
  modulesCompleted: number;
  hoursStudied: number;
  dayStreak: number;
}) {
  return (
    <section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <motion.h2 {...inView(0)} className="text-2xl font-bold text-primary mb-8">
          Your Progress
        </motion.h2>

        <div className="flex gap-4 flex-col sm:flex-row">
          <StatBlock
            icon={CheckCircle}
            value={modulesCompleted}
            label="Modules Completed"
            delay={0}
          />
          <StatBlock
            icon={Clock}
            value={`${hoursStudied}h`}
            label="Hours Studied"
            delay={0.08}
          />
          <StatBlock
            icon={Flame}
            value={dayStreak}
            label="Day Streak"
            delay={0.16}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Section: Resume CTA ────────────────────────────────────────────────── */

function ResumeCTA({
  lastVisited,
}: {
  lastVisited: { academy: string; moduleSlug: string; moduleTitle: string } | null;
}) {
  if (!lastVisited) return null;

  const academy = HUB_ACADEMIES.find((a) => a.slug === lastVisited.academy);
  const route = academy?.routes.find((r) => r.slug === lastVisited.moduleSlug);
  if (!academy || !route) return null;

  return (
    <section className="px-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <motion.div {...inView(0)}>
          <Link
            href={`/learn/${lastVisited.academy}/${lastVisited.moduleSlug}`}
            className="group block"
          >
            <div
              className="flex items-center justify-between gap-4 p-5 rounded-2xl transition-colors duration-200"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <div>
                <p className="text-xs text-muted mb-1">Continue where you left off</p>
                <p className="font-semibold text-primary">{route.title}</p>
                <p className="text-sm text-secondary mt-0.5">{academy.title}</p>
              </div>
              <ArrowRight
                size={20}
                className="text-accent shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { academies, lastVisited, streak, totalMinutesStudied } = useProgressStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const academyProgress = mounted
    ? Object.fromEntries(
        HUB_ACADEMIES.map((a) => [
          a.slug,
          getAcademyProgress(
            a.slug,
            academies[a.slug]?.modules ?? {},
            a.moduleCount
          ),
        ])
      )
    : {};

  const modulesCompleted = mounted
    ? Object.values(academies)
        .flatMap((a) => Object.values(a.modules))
        .filter((r) => r.completed).length
    : 0;

  return (
    <>
      <HeroSection />
      <PathsSection academyProgress={academyProgress} />
      <StatsSection
        modulesCompleted={modulesCompleted}
        hoursStudied={mounted ? Math.floor(totalMinutesStudied / 60) : 0}
        dayStreak={mounted ? streak.current : 0}
      />
      {mounted && <ResumeCTA lastVisited={lastVisited} />}
    </>
  );
}
