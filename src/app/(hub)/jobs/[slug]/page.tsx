import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Layers, ExternalLink } from "lucide-react";
import {
  JOB_TARGETS,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  MODULE_TYPE_LABELS,
  type ModulePriority,
} from "@/lib/job-targets";
import { Badge } from "@/components/ui";

interface Props {
  params: Promise<{ slug: string }>;
}

const PRIORITY_ORDER: ModulePriority[] = ["high", "medium", "low"];

export async function generateStaticParams() {
  return JOB_TARGETS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const job = JOB_TARGETS.find((j) => j.slug === slug);
  if (!job) return {};
  return { title: `${job.company} — ${job.role} | SE Hub` };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = JOB_TARGETS.find((j) => j.slug === slug);
  if (!job) notFound();

  const totalMinutes = job.modules.reduce((s, m) => s + m.estimatedMinutes, 0);
  const statusColor = STATUS_COLORS[job.status];

  const grouped = PRIORITY_ORDER.map((priority) => ({
    priority,
    modules: job.modules.filter((m) => m.priority === priority),
  })).filter((g) => g.modules.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors cursor-pointer mb-8"
      >
        <ArrowLeft size={14} />
        Job Targets
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
              background: `${job.accentColor}18`,
              border: `1px solid ${job.accentColor}35`,
              color: job.accentColor,
            }}
          >
            {job.company[0]}
          </div>
          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-primary">{job.company}</h1>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                }}
              >
                {STATUS_LABELS[job.status]}
              </span>
            </div>
            <p className="text-secondary text-sm">
              {job.role} · {job.level}
            </p>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-secondary transition-colors mt-1"
              >
                View posting <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted mb-5">
          <span className="flex items-center gap-1.5">
            <Layers size={12} aria-hidden />
            {job.modules.length} prep modules
          </span>
          <span className="w-px h-3 bg-border-subtle" aria-hidden />
          <span className="flex items-center gap-1.5">
            <Clock size={12} aria-hidden />
            ~{Math.round(totalMinutes / 60)}h estimated
          </span>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {job.techStack.map((tech) => (
            <span
              key={tech}
              className="text-xs px-2.5 py-1 rounded-lg text-secondary"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* JD Summary */}
        <div
          className="px-4 py-3.5 rounded-xl text-sm text-secondary leading-relaxed"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {job.jdSummary}
        </div>
      </div>

      {/* Modules by priority */}
      <div className="space-y-8">
        {grouped.map(({ priority, modules }) => (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PRIORITY_COLORS[priority] }}
              />
              <h2 className="text-sm font-semibold text-primary capitalize">{priority} Priority</h2>
              <span className="text-xs text-muted">({modules.length})</span>
            </div>

            <div className="flex flex-col gap-2">
              {modules.map((mod) => {
                const learnHref = job.academySlug
                  ? `/learn/${job.academySlug}/${mod.id}`
                  : mod.academySlug && mod.moduleSlug
                    ? `/learn/${mod.academySlug}/${mod.moduleSlug}`
                    : null;

                const card = (
                  <div
                    className="px-4 py-3.5 rounded-xl transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-primary">{mod.title}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {MODULE_TYPE_LABELS[mod.type]}
                          </span>
                        </div>
                        <p className="text-xs text-secondary leading-relaxed">{mod.description}</p>
                        {!job.academySlug && mod.academySlug && mod.moduleSlug && (
                          <span
                            className="inline-flex items-center gap-1 text-xs mt-2"
                            style={{ color: job.accentColor }}
                          >
                            Related reading <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs text-muted pt-0.5">~{mod.estimatedMinutes}m</span>
                        {learnHref && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                              background: `${job.accentColor}18`,
                              color: job.accentColor,
                              border: `1px solid ${job.accentColor}30`,
                            }}
                          >
                            Study →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );

                return learnHref ? (
                  <Link
                    key={mod.id}
                    href={learnHref}
                    className="block group"
                    style={{ textDecoration: "none" }}
                  >
                    {card}
                  </Link>
                ) : (
                  <div key={mod.id}>{card}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
