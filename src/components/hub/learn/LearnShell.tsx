"use client";

import { useEffect, useState, useRef, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Clock,
  Keyboard,
  X,
} from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { TocItem } from "@/lib/types/academy";
import ErrorBoundary from "./ErrorBoundary";
import ProgressToast from "./ProgressToast";

interface ShellAcademy {
  slug: string;
  title: string;
  accentColor: string;
  routes: Array<{ slug: string; title: string }>;
  learningPath: string[];
}

interface ShellRoute {
  slug: string;
  title: string;
  estimatedMinutes?: number;
  tags?: string[];
}

interface LearnShellProps {
  academy: ShellAcademy;
  route: ShellRoute;
  prevSlug: string | null;
  nextSlug: string | null;
  toc: TocItem[];
  children: ReactNode;
}

/* ── Content skeleton ──────────────────────────────────────────────────── */

function ContentSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton width="75%" height={28} rounded="lg" />
      <Skeleton width="100%" height={16} rounded="md" />
      <Skeleton width="92%" height={16} rounded="md" />
      <Skeleton width="88%" height={16} rounded="md" />
      <div className="py-2" />
      <Skeleton width="55%" height={24} rounded="lg" />
      <Skeleton width="100%" height={16} rounded="md" />
      <Skeleton width="96%" height={16} rounded="md" />
      <Skeleton width="100%" height={96} rounded="xl" />
      <Skeleton width="100%" height={16} rounded="md" />
      <Skeleton width="82%" height={16} rounded="md" />
    </div>
  );
}

/* ── Table of contents ─────────────────────────────────────────────────── */

function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        On this page
      </p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="block text-xs leading-relaxed transition-colors duration-100 py-0.5 truncate"
          style={{
            paddingLeft: item.level === 3 ? "0.875rem" : "0",
            color: activeId === item.id ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: activeId === item.id ? 500 : 400,
          }}
        >
          {activeId === item.id && (
            <span
              className="inline-block w-1 h-1 rounded-full mr-1.5 mb-0.5"
              style={{ background: "var(--accent-primary)" }}
            />
          )}
          {item.title}
        </a>
      ))}
    </div>
  );
}

/* ── Keyboard hint ─────────────────────────────────────────────────────── */

function KeyboardHint({
  show,
  hasPrev,
  hasNext,
  onDismiss,
}: {
  show: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 text-xs text-muted"
        >
          <Keyboard size={13} />
          <span>
            Use{" "}
            {hasPrev && (
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                ←
              </kbd>
            )}
            {hasNext && (
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                →
              </kbd>
            )}
            {" "}to navigate modules
          </span>
          <button
            onClick={onDismiss}
            className="ml-auto text-muted hover:text-secondary transition-colors"
            aria-label="Dismiss keyboard hint"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main shell ────────────────────────────────────────────────────────── */

export default function LearnShell({
  academy,
  route,
  prevSlug,
  nextSlug,
  toc,
  children,
}: LearnShellProps) {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const markedRef = useRef(false);

  /* Mark visited + first-visit toast */
  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;

    const state = useProgressStore.getState();
    const isFirstVisit = state.getModuleStatus(academy.slug, route.slug) === "not-started";
    state.markModuleVisited(academy.slug, route.slug, route.title, route.estimatedMinutes ?? 0);

    if (isFirstVisit) setShowToast(true);
  }, [academy.slug, route.slug]);

  /* Keyboard hint (localStorage gate) */
  useEffect(() => {
    if (!localStorage.getItem("se-hub-kb-hint")) {
      setShowKeyHint(true);
    }
  }, []);

  const dismissKeyHint = () => {
    localStorage.setItem("se-hub-kb-hint", "1");
    setShowKeyHint(false);
  };

  /* Keyboard navigation */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      if (e.key === "ArrowLeft" && prevSlug)
        router.push(`/learn/${academy.slug}/${prevSlug}`);
      if (e.key === "ArrowRight" && nextSlug)
        router.push(`/learn/${academy.slug}/${nextSlug}`);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router, academy.slug, prevSlug, nextSlug]);

  /* IntersectionObserver for ToC active state */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveHeadingId(visible.target.id);
      },
      { rootMargin: "-10% 0% -65% 0%", threshold: 0 }
    );
    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  return (
    <>
      <div className="flex flex-1 min-w-0">
        {/* ── Center: article ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Breadcrumb */}
          <div className="px-8 pt-8 pb-0 flex items-center gap-1.5 text-xs text-muted flex-wrap">
            <Link href="/" className="hover:text-secondary transition-colors">
              SE Hub
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <Link
              href={`/paths/${academy.slug}`}
              className="hover:text-secondary transition-colors"
            >
              {academy.title}
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <span className="text-secondary truncate">{route.title}</span>
          </div>

          {/* Module header */}
          <div className="px-8 pt-6 pb-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {route.estimatedMinutes && (
                <Badge variant="default">
                  <Clock size={11} />
                  {route.estimatedMinutes} min read
                </Badge>
              )}
              {route.tags?.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-primary tracking-tight leading-tight mb-6">
              {route.title}
            </h1>
            <hr style={{ borderColor: "var(--border-subtle)" }} />
          </div>

          {/* Article content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="px-8 py-8 max-w-3xl flex-1"
          >
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                {children}
              </Suspense>
            </ErrorBoundary>
          </motion.div>

          {/* Bottom navigation */}
          <div
            className="px-8 py-6 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="max-w-3xl flex items-center justify-between gap-4 flex-wrap">
              {prevSlug ? (
                <Link
                  href={`/learn/${academy.slug}/${prevSlug}`}
                  className="group flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors flex-1 min-w-0"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    maxWidth: "48%",
                  }}
                >
                  <ArrowLeft
                    size={16}
                    className="text-muted shrink-0 transition-transform group-hover:-translate-x-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted">Previous</p>
                    <p className="text-primary font-medium truncate">
                      {academy.routes.find((r) => r.slug === prevSlug)?.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextSlug ? (
                <Link
                  href={`/learn/${academy.slug}/${nextSlug}`}
                  className="group flex items-center justify-end gap-2 px-4 py-3 rounded-xl text-sm transition-colors flex-1 min-w-0 ml-auto"
                  style={{
                    background: `${academy.accentColor}12`,
                    border: `1px solid ${academy.accentColor}35`,
                    maxWidth: "48%",
                  }}
                >
                  <div className="min-w-0 text-right">
                    <p className="text-[10px]" style={{ color: `${academy.accentColor}aa` }}>
                      Next
                    </p>
                    <p className="font-medium truncate" style={{ color: academy.accentColor }}>
                      {academy.routes.find((r) => r.slug === nextSlug)?.title}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: academy.accentColor }}
                  />
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* Keyboard hint */}
            <div className="max-w-3xl mt-4">
              <KeyboardHint
                show={showKeyHint}
                hasPrev={!!prevSlug}
                hasNext={!!nextSlug}
                onDismiss={dismissKeyHint}
              />
            </div>
          </div>
        </div>

        {/* ── Right: Table of contents (desktop xl+) ───────────────────── */}
        <aside className="hidden xl:block w-52 shrink-0 pt-16 pr-6 pb-8">
          <div className="sticky top-8">
            <TableOfContents items={toc} activeId={activeHeadingId} />
          </div>
        </aside>
      </div>

      {/* Toast */}
      <ProgressToast
        show={showToast}
        onHide={() => setShowToast(false)}
      />
    </>
  );
}
