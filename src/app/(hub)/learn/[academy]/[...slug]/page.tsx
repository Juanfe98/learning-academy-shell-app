import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LearnSidebar from "@/components/hub/learn/LearnSidebar";
import LearnShell from "@/components/hub/learn/LearnShell";
import MockModuleContent, { MOCK_TOC } from "@/components/hub/learn/MockModuleContent";
import { findAcademy } from "@/lib/registry";
import { MOCK_ACADEMIES } from "@/lib/mock-data";

/* ─── Not found ──────────────────────────────────────────────────────────── */

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

/* ─── Shell layout wrapper ───────────────────────────────────────────────── */

function ShellLayout({
  academy,
  routeSlug,
  children,
}: {
  academy: {
    slug: string;
    title: string;
    icon: string;
    accentColor: string;
    routes: Array<{ slug: string; title: string }>;
    learningPath: string[];
  };
  routeSlug: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 sticky top-0 self-start h-screen overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <LearnSidebar academy={academy} currentSlug={routeSlug} />
      </aside>
      {children}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default async function ContentViewerPage({
  params,
}: {
  params: Promise<{ academy: string; slug: string[] }>;
}) {
  const { academy: academySlug, slug } = await params;
  const routeSlug = slug[0];

  /* ── Registry path: real content ────────────────────────────────────── */
  const registryAcademy = findAcademy(academySlug);

  if (registryAcademy) {
    const route = registryAcademy.routes.find((r) => r.slug === routeSlug);
    if (!route) {
      return (
        <NotFound
          message={`Module "${routeSlug}" doesn't exist in ${registryAcademy.title}.`}
        />
      );
    }

    const pathIndex = registryAcademy.learningPath.indexOf(routeSlug);
    const prevSlug = pathIndex > 0 ? registryAcademy.learningPath[pathIndex - 1] : null;
    const nextSlug =
      pathIndex < registryAcademy.learningPath.length - 1
        ? registryAcademy.learningPath[pathIndex + 1]
        : null;

    // Dynamic import — runs on the server, result is serializable JSX
    const mod = await route.component();
    const Content = mod.default;
    const toc = mod.toc ?? [];

    const { component: _fn, ...routeProps } = route;

    const serializableAcademy = {
      ...registryAcademy,
      routes: registryAcademy.routes.map(({ component: _c, ...r }) => r),
    };

    return (
      <ShellLayout academy={serializableAcademy} routeSlug={routeSlug}>
        <LearnShell
          academy={serializableAcademy}
          route={routeProps}
          prevSlug={prevSlug}
          nextSlug={nextSlug}
          toc={toc}
        >
          <Content />
        </LearnShell>
      </ShellLayout>
    );
  }

  /* ── Mock-data fallback: shell with placeholder content ─────────────── */
  const mockAcademy = MOCK_ACADEMIES.find((a) => a.slug === academySlug);
  if (!mockAcademy) {
    return (
      <NotFound message="We couldn't find an academy at this path. It may have moved or not been added yet." />
    );
  }

  const route = mockAcademy.routes.find((r) => r.slug === routeSlug);
  if (!route) {
    return (
      <NotFound
        message={`Module "${routeSlug}" doesn't exist in ${mockAcademy.title}. Check the learning path for valid modules.`}
      />
    );
  }

  const pathIndex = mockAcademy.learningPath.indexOf(routeSlug);
  const prevSlug = pathIndex > 0 ? mockAcademy.learningPath[pathIndex - 1] : null;
  const nextSlug =
    pathIndex < mockAcademy.learningPath.length - 1
      ? mockAcademy.learningPath[pathIndex + 1]
      : null;

  return (
    <ShellLayout academy={mockAcademy} routeSlug={routeSlug}>
      <LearnShell
        academy={mockAcademy}
        route={route}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
        toc={MOCK_TOC}
      >
        <MockModuleContent />
      </LearnShell>
    </ShellLayout>
  );
}
