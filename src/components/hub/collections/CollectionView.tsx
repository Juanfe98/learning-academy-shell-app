"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Clock,
  ExternalLink,
  GraduationCap,
  Link2,
  Map,
  type LucideIcon,
} from "lucide-react";
import PathCard from "@/components/hub/PathCard";
import { Skeleton } from "@/components/ui";
import type { Collection } from "@/lib/collections";
import type { HubAcademy } from "@/lib/hub-academies";
import { STATUS_COLORS, STATUS_LABELS, type JobTarget } from "@/lib/job-targets";
import { useProgressStore } from "@/lib/store";

export type CollectionJobTarget = Pick<
  JobTarget,
  "slug" | "company" | "role" | "status" | "accentColor"
>;

interface CollectionViewProps {
  collection: Collection;
  academies: HubAcademy[];
  relatedAcademies: HubAcademy[];
  jobTargets: CollectionJobTarget[];
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-muted" aria-hidden />
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}

function AcademyGrid({
  academies,
  mounted,
  getProgress,
}: {
  academies: HubAcademy[];
  mounted: boolean;
  getProgress: (slug: string, moduleCount: number) => number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {academies.map((academy, i) =>
        mounted ? (
          <PathCard
            key={academy.slug}
            academy={academy}
            progress={getProgress(academy.slug, academy.moduleCount)}
            index={i}
          />
        ) : (
          <Skeleton key={academy.slug} height={220} rounded="xl" />
        ),
      )}
    </div>
  );
}

export default function CollectionView({
  collection,
  academies,
  relatedAcademies,
  jobTargets,
}: CollectionViewProps) {
  const [mounted, setMounted] = useState(false);
  const progressByAcademy = useProgressStore((s) => s.academies);

  useEffect(() => setMounted(true), []);

  function getProgress(slug: string, moduleCount: number): number {
    if (!mounted || moduleCount === 0) return 0;
    const mods = Object.values(progressByAcademy[slug]?.modules ?? {});
    return Math.round((mods.filter((m) => m.completed).length / moduleCount) * 100);
  }

  const totalModules = academies.reduce((sum, a) => sum + a.moduleCount, 0);
  const totalHours = Math.round(academies.reduce((sum, a) => sum + a.totalHours, 0));
  const linkGroups = collection.linkGroups.filter((group) => group.links.length > 0);
  const accent = collection.accentColor;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-10"
      >
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: `linear-gradient(135deg, ${accent}14 0%, var(--bg-surface) 65%)`,
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent}24 0%, transparent 70%)` }}
          />
          <div className="relative space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 select-none"
                  style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
                >
                  {collection.icon}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  {collection.title}
                </h1>
              </div>
              <p className="text-sm ml-[52px] text-secondary max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 ml-[52px]">
              <div className="flex items-center gap-1.5">
                <Map size={13} style={{ color: accent }} aria-hidden />
                <span className="text-xs font-semibold tabular-nums" style={{ color: accent }}>
                  {academies.length}
                </span>
                <span className="text-xs text-muted">academies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen size={13} className="text-secondary" aria-hidden />
                <span className="text-xs font-semibold tabular-nums text-secondary">
                  {totalModules}
                </span>
                <span className="text-xs text-muted">modules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-muted" aria-hidden />
                <span className="text-xs font-semibold tabular-nums text-secondary">
                  ~{totalHours}h
                </span>
                <span className="text-xs text-muted">total</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Academies */}
      <section className="mb-12">
        <SectionHeading
          icon={GraduationCap}
          title="Academies"
          subtitle="Built from the real codebases, in the order worth reading them."
        />
        <AcademyGrid academies={academies} mounted={mounted} getProgress={getProgress} />
      </section>

      {/* Job targets */}
      {jobTargets.length > 0 && (
        <section className="mb-12">
          <SectionHeading
            icon={Briefcase}
            title={jobTargets.length === 1 ? "Job target" : "Job targets"}
          />
          <div className="flex flex-col gap-3">
            {jobTargets.map((job) => {
              const statusColor = STATUS_COLORS[job.status];
              return (
                <Link
                  key={job.slug}
                  href={`/jobs/${job.slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] transition-colors duration-150"
                >
                  <div className="flex items-center gap-4 min-w-0">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">{job.company}</span>
                        <span className="text-muted text-xs">·</span>
                        <span className="text-sm text-secondary truncate">{job.role}</span>
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${statusColor}18`,
                          color: statusColor,
                          border: `1px solid ${statusColor}35`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-muted transition-all duration-200 group-hover:text-secondary group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Related paths */}
      {relatedAcademies.length > 0 && (
        <section className="mb-12 pt-10 border-t border-border-subtle">
          <SectionHeading
            icon={Map}
            title="Related paths"
            subtitle="General skills you study because of this work."
          />
          <AcademyGrid academies={relatedAcademies} mounted={mounted} getProgress={getProgress} />
        </section>
      )}

      {/* Links */}
      {linkGroups.length > 0 && (
        <section className="pt-10 border-t border-border-subtle">
          <SectionHeading
            icon={Link2}
            title="Links"
            subtitle="Work systems, one click away. Each opens in a new tab."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {linkGroups.map((group) => (
              <div key={group.id}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] transition-colors duration-150"
                      >
                        <div className="min-w-0">
                          <span className="block text-sm text-primary truncate">{link.title}</span>
                          {link.description && (
                            <span className="block text-xs text-muted truncate">
                              {link.description}
                            </span>
                          )}
                        </div>
                        <ExternalLink
                          size={14}
                          className="shrink-0 text-muted group-hover:text-secondary transition-colors duration-150"
                          aria-hidden
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
