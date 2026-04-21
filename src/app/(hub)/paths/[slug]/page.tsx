import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Construction } from "lucide-react";
import { Badge } from "@/components/ui";
import ModuleList from "@/components/hub/ModuleList";
import PathProgressPanel from "@/components/hub/PathProgressPanel";
import PathCTA from "@/components/hub/PathCTA";
import { MOCK_ACADEMIES } from "@/lib/mock-data";

/* ─── Not found ────────────────────────────────────────────────────────────── */

function AcademyNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        🔍
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">Academy not found</h1>
      <p className="text-secondary text-sm mb-8 max-w-xs">
        We couldn&apos;t find an academy matching that path. It may have moved or
        not been added yet.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: "var(--accent-secondary)" }}
      >
        <ArrowLeft size={16} />
        Back to hub home
      </Link>
    </div>
  );
}

/* ─── Coming soon banner ────────────────────────────────────────────────────── */

function ComingSoonBanner({ accentColor }: { accentColor: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl text-center"
      style={{
        background: `${accentColor}08`,
        border: `1px dashed ${accentColor}40`,
      }}
    >
      <Construction
        size={32}
        className="mb-4"
        style={{ color: accentColor, opacity: 0.7 }}
      />
      <h2 className="text-xl font-bold text-primary mb-2">Coming Soon</h2>
      <p className="text-sm text-secondary max-w-sm">
        This learning path is under construction. Check back soon — content will
        be available here when it&apos;s ready.
      </p>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function PathOverviewPage({
  params,
}: PageProps<"/paths/[slug]">) {
  const { slug } = await params;
  const academy = MOCK_ACADEMIES.find((a) => a.slug === slug);

  if (!academy) {
    return <AcademyNotFound />;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Back breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-8"
      >
        <ArrowLeft size={13} />
        All learning paths
      </Link>

      <div className="flex gap-10 items-start">
        {/* ── Left: header + module list ────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-10">
          {/* Header */}
          <div className="space-y-6">
            {/* Accent gradient band */}
            <div
              className="absolute left-0 right-0 h-64 top-0 pointer-events-none -z-10 opacity-30"
              style={{
                background: `radial-gradient(ellipse 70% 100% at 20% 0%, ${academy.accentColor}50, transparent)`,
              }}
            />

            {/* Icon + title row */}
            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 select-none"
                style={{
                  background: `${academy.accentColor}18`,
                  border: `1px solid ${academy.accentColor}40`,
                  boxShadow: `0 0 24px ${academy.accentColor}20`,
                }}
              >
                {academy.icon}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-primary tracking-tight">
                    {academy.title}
                  </h1>
                  {academy.comingSoon && (
                    <Badge variant="warning">Coming soon</Badge>
                  )}
                </div>
                <p className="text-secondary text-sm leading-relaxed max-w-2xl">
                  {academy.description}
                </p>
              </div>
            </div>

            {/* Inline stats */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-secondary">
                <BookOpen size={15} className="text-muted" />
                <strong className="text-primary">{academy.moduleCount}</strong> modules
              </span>
              <span className="text-border-subtle">·</span>
              <span className="flex items-center gap-2 text-sm text-secondary">
                <Clock size={15} className="text-muted" />
                ~<strong className="text-primary">{academy.totalHours}h</strong> total
              </span>
              <span className="text-border-subtle">·</span>
              <span className="text-xs text-muted">v{academy.version}</span>
            </div>

            {/* CTA + progress bar (client — needs Zustand) */}
            {!academy.comingSoon && <PathCTA academy={academy} />}
          </div>

          {/* Module list or coming-soon */}
          <section>
            <h2 className="text-lg font-semibold text-primary mb-5">Modules</h2>
            {academy.comingSoon ? (
              <ComingSoonBanner accentColor={academy.accentColor} />
            ) : (
              <ModuleList academy={academy} />
            )}
          </section>
        </div>

        {/* ── Right: progress sidebar (desktop only, non-coming-soon) ──── */}
        {!academy.comingSoon && !academy.externalUrl && (
          <aside className="hidden xl:block w-64 shrink-0">
            <PathProgressPanel academy={academy} />
          </aside>
        )}
      </div>
    </div>
  );
}
