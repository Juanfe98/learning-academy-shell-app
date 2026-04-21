"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button, ProgressBar } from "@/components/ui";
import { useProgressStore } from "@/lib/store";
import type { MockAcademy } from "@/lib/mock-data";

interface PathCTAProps {
  academy: MockAcademy;
}

export default function PathCTA({ academy }: PathCTAProps) {
  const [mounted, setMounted] = useState(false);
  const academies = useProgressStore((s) => s.academies);
  useEffect(() => setMounted(true), []);

  const routeProgress = mounted ? (academies[academy.slug]?.modules ?? {}) : {};
  const completedCount = mounted
    ? Object.values(routeProgress).filter((r) => r.completed).length
    : 0;
  const percent =
    academy.moduleCount > 0
      ? Math.round((completedCount / academy.moduleCount) * 100)
      : 0;

  const isCompleted = (slug: string) =>
    mounted ? routeProgress[slug]?.completed === true : false;

  const firstIncompleteSlug =
    academy.learningPath.find((slug) => !isCompleted(slug)) ??
    academy.learningPath[0];

  const hasStarted = mounted && completedCount > 0;
  const isFinished = mounted && completedCount >= academy.moduleCount && academy.moduleCount > 0;

  if (academy.externalUrl) {
    return (
      <a href={academy.externalUrl} target="_blank" rel="noopener noreferrer">
        <Button
          size="lg"
          variant="primary"
          className="w-full sm:w-auto"
          style={{
            "--tw-ring-color": academy.accentColor,
            background: academy.accentColor,
            borderColor: academy.accentColor,
          } as React.CSSProperties}
        >
          Open Academy
          <ExternalLink size={16} />
        </Button>
      </a>
    );
  }

  const ctaLabel = isFinished ? "Review Path" : hasStarted ? "Continue Learning" : "Start Learning";
  const ctaHref = firstIncompleteSlug
    ? `/learn/${academy.slug}/${firstIncompleteSlug}`
    : `/learn/${academy.slug}/${academy.learningPath[0]}`;

  return (
    <div className="space-y-4">
      <Link href={ctaHref}>
        <Button
          size="lg"
          variant="primary"
          className="w-full sm:w-auto"
          style={
            {
              "--tw-ring-color": academy.accentColor,
              background: academy.accentColor,
              borderColor: academy.accentColor,
            } as React.CSSProperties
          }
        >
          {ctaLabel}
          <ArrowRight size={16} />
        </Button>
      </Link>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Overall progress</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <ProgressBar
          value={percent}
          color={academy.accentColor}
          size="md"
          layoutId={`header-progress-${academy.slug}`}
        />
      </div>
    </div>
  );
}
