import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LearnSidebar from "@/components/hub/learn/LearnSidebar";
import LearnShell from "@/components/hub/learn/LearnShell";
import { MOCK_ACADEMIES } from "@/lib/mock-data";

/* ─── Not found ─────────────────────────────────────────────────────────────── */

function NotFound({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        🔍
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">Not found</h1>
      <p className="text-secondary text-sm mb-8 max-w-xs">{message}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: "var(--accent-secondary)" }}
      >
        <ArrowLeft size={16} />
        Back to hub
      </Link>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default async function ContentViewerPage({
  params,
}: {
  params: Promise<{ academy: string; slug: string[] }>;
}) {
  const { academy: academySlug, slug } = await params;
  const routeSlug = slug[0]; // catch-all; sub-paths not used yet

  const academy = MOCK_ACADEMIES.find((a) => a.slug === academySlug);
  if (!academy) {
    return (
      <NotFound message="We couldn't find an academy at this path. It may have moved or not been added yet." />
    );
  }

  const route = academy.routes.find((r) => r.slug === routeSlug);
  if (!route) {
    return (
      <NotFound
        message={`Module "${routeSlug}" doesn't exist in ${academy.title}. Check the learning path for valid modules.`}
      />
    );
  }

  const pathIndex = academy.learningPath.indexOf(routeSlug);
  const prevSlug = pathIndex > 0 ? academy.learningPath[pathIndex - 1] : null;
  const nextSlug =
    pathIndex < academy.learningPath.length - 1
      ? academy.learningPath[pathIndex + 1]
      : null;

  return (
    <div className="flex min-h-full">
      {/* Left: module navigation sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 sticky top-0 self-start h-screen overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <LearnSidebar academy={academy} currentSlug={routeSlug} />
      </aside>

      {/* Center + right: article and ToC */}
      <LearnShell
        academy={academy}
        route={route}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
      />
    </div>
  );
}
