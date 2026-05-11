"use client";

import { motion, type Variants } from "framer-motion";
import { Briefcase, Clock, Layers } from "lucide-react";
import Link from "next/link";
import { JOB_TARGETS, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-targets";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function JobsPage() {
  const totalModules = JOB_TARGETS.reduce((s, j) => s + j.modules.length, 0);
  const totalMinutes = JOB_TARGETS.reduce(
    (s, j) => s + j.modules.reduce((ms, m) => ms + m.estimatedMinutes, 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
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
            <Briefcase size={16} style={{ color: "var(--accent-primary)" }} aria-hidden />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Job Targets</h1>
        </div>
        <p className="text-secondary text-sm mb-4">
          Tailored learning paths built from real job descriptions.
        </p>

        {JOB_TARGETS.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Briefcase size={12} aria-hidden />
              {JOB_TARGETS.length} job{JOB_TARGETS.length !== 1 ? "s" : ""}
            </span>
            <span className="w-px h-3 bg-border-subtle" aria-hidden />
            <span className="flex items-center gap-1.5">
              <Layers size={12} aria-hidden />
              {totalModules} prep modules
            </span>
            <span className="w-px h-3 bg-border-subtle" aria-hidden />
            <span className="flex items-center gap-1.5">
              <Clock size={12} aria-hidden />
              ~{Math.round(totalMinutes / 60)}h total
            </span>
          </div>
        )}
      </motion.div>

      {/* Empty state */}
      {JOB_TARGETS.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center justify-center py-24 text-center gap-4"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Briefcase size={28} style={{ color: "var(--text-muted)" }} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-primary">No job targets yet</h2>
          <p className="text-sm text-secondary max-w-xs leading-relaxed">
            Send a job description and a tailored prep plan will be generated here — covering the
            exact concepts, challenges, and system design topics the role demands.
          </p>
          <div
            className="mt-2 px-4 py-2.5 rounded-xl text-sm text-muted"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="font-mono text-accent text-xs">Paste a JD → get your prep plan</span>
          </div>
        </motion.div>
      )}

      {/* Job list */}
      {JOB_TARGETS.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {JOB_TARGETS.map((job) => {
            const totalMins = job.modules.reduce((s, m) => s + m.estimatedMinutes, 0);
            const highCount = job.modules.filter((m) => m.priority === "high").length;
            const statusColor = STATUS_COLORS[job.status];

            return (
              <motion.div key={job.slug} variants={item}>
                <Link
                  href={`/jobs/${job.slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 rounded-2xl transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid rgba(255,255,255,0.07)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${job.accentColor}40`;
                    (e.currentTarget as HTMLElement).style.background = `${job.accentColor}08`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Company initial */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                      style={{
                        background: `${job.accentColor}18`,
                        border: `1px solid ${job.accentColor}35`,
                        color: job.accentColor,
                      }}
                    >
                      {job.company[0]}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-primary">{job.company}</span>
                        <span className="text-muted text-xs">·</span>
                        <span className="text-sm text-secondary truncate">{job.role}</span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: `${statusColor}18`,
                            color: statusColor,
                            border: `1px solid ${statusColor}30`,
                          }}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span>{job.modules.length} modules</span>
                        {highCount > 0 && (
                          <>
                            <span>·</span>
                            <span style={{ color: "#ef4444" }}>{highCount} high priority</span>
                          </>
                        )}
                        <span>·</span>
                        <span>~{Math.round(totalMins / 60)}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Tech stack chips */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {job.techStack.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] px-2 py-0.5 rounded-md text-muted"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        {tech}
                      </span>
                    ))}
                    {job.techStack.length > 3 && (
                      <span className="text-[10px] text-muted">+{job.techStack.length - 3}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
