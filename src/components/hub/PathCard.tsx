"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Clock, BookOpen, ArrowRight } from "lucide-react";
import { ProgressBar, Badge } from "@/components/ui";
import type { HubAcademy } from "@/lib/hub-academies";

interface PathCardProps {
  academy: HubAcademy;
  progress: number;
  index?: number;
}

export default function PathCard({
  academy,
  progress,
  index = 0,
}: PathCardProps) {
  const { slug, title, description, accentColor, icon, moduleCount, totalHours, comingSoon } =
    academy;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={comingSoon ? undefined : { y: -4 }}
      className="group relative rounded-2xl p-6 overflow-hidden h-full flex flex-col gap-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${comingSoon ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)"}`,
        borderLeft: `2px solid ${comingSoon ? "rgba(255,255,255,0.12)" : accentColor}`,
        boxShadow: comingSoon
          ? "none"
          : "0 0 0 0px transparent",
      }}
    >
      {/* Accent ambient glow — only for available academies */}
      {!comingSoon && (
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.08]"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 0% 50%, ${accentColor}, transparent)`,
          }}
        />
      )}

      {/* Hover border glow */}
      {!comingSoon && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `0 0 0 1px ${accentColor}40, 0 12px 40px rgba(0,0,0,0.4)`,
          }}
        />
      )}

      {/* Header row */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 select-none"
            style={{
              background: comingSoon
                ? "rgba(255,255,255,0.05)"
                : `${accentColor}20`,
              border: `1px solid ${comingSoon ? "rgba(255,255,255,0.08)" : `${accentColor}40`}`,
              color: comingSoon ? "var(--text-muted)" : accentColor,
            }}
          >
            {icon}
          </div>

          <div>
            <h3
              className="font-semibold text-[15px] leading-tight"
              style={{ color: comingSoon ? "var(--text-secondary)" : "var(--text-primary)" }}
            >
              {title}
            </h3>
            {comingSoon ? (
              <Badge variant="default" className="mt-1">
                <Lock size={10} />
                Coming soon
              </Badge>
            ) : progress > 0 ? (
              <span className="text-xs text-muted mt-0.5 block">{progress}% complete</span>
            ) : (
              <span className="text-xs text-muted mt-0.5 block">Not started</span>
            )}
          </div>
        </div>

        {!comingSoon && (
          <ArrowRight
            size={16}
            className="shrink-0 text-muted mt-0.5 transition-all duration-200 group-hover:text-secondary group-hover:translate-x-0.5"
          />
        )}
      </div>

      {/* Description */}
      <p
        className="relative text-sm leading-relaxed flex-1"
        style={{ color: comingSoon ? "var(--text-muted)" : "var(--text-secondary)" }}
      >
        {description}
      </p>

      {/* Progress bar — only for available */}
      {!comingSoon && (
        <div className="relative space-y-1.5">
          <ProgressBar
            value={progress}
            color={accentColor}
            size="sm"
            layoutId={`progress-${slug}`}
          />
        </div>
      )}

      {/* Meta row */}
      <div className="relative flex items-center gap-4 pt-1 border-t border-border-subtle">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <BookOpen size={12} />
          {moduleCount} modules
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Clock size={12} />
          ~{totalHours}h
        </span>
      </div>
    </motion.div>
  );

  if (comingSoon) {
    return <div className="h-full opacity-60 cursor-default">{inner}</div>;
  }

  return (
    <Link href={`/paths/${slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
