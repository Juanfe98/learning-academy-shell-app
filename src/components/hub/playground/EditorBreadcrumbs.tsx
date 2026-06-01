"use client";

import { memo, useMemo } from "react";

interface BreadcrumbSegment {
  label: string;
  isLast: boolean;
}

interface EditorBreadcrumbsProps {
  filename: string;
}

function toBreadcrumbs(filename: string): BreadcrumbSegment[] {
  const parts = ["challenge", ...filename.replace(/^\.\//, "").split("/")];
  return parts.map((label, i) => ({ label, isLast: i === parts.length - 1 }));
}

function EditorBreadcrumbs({ filename }: EditorBreadcrumbsProps) {
  const segments = useMemo(() => toBreadcrumbs(filename), [filename]);

  return (
    <div
      className="flex items-center shrink-0 px-3"
      style={{
        background: "var(--bg-elevated)",
        borderBottom: "1px solid var(--border-subtle)",
        height: 24,
        fontSize: 11,
        fontFamily: "ui-monospace, monospace",
        gap: 4,
      }}
    >
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center" style={{ gap: 4 }}>
          {i > 0 && (
            <span style={{ color: "var(--text-muted)", fontSize: 10, userSelect: "none" }}>
              ›
            </span>
          )}
          <span
            style={{
              color: seg.isLast ? "var(--text-secondary)" : "var(--text-muted)",
            }}
          >
            {seg.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export default memo(EditorBreadcrumbs);
