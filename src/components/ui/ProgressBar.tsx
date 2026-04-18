"use client";

import { motion } from "framer-motion";

type ProgressBarSize = "sm" | "md";

interface ProgressBarProps {
  value: number;
  color?: string;
  size?: ProgressBarSize;
  className?: string;
  layoutId?: string;
}

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: "h-1",
  md: "h-2",
};

export default function ProgressBar({
  value,
  color = "var(--accent-primary)",
  size = "md",
  className = "",
  layoutId,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={[
        "w-full rounded-full overflow-hidden",
        "bg-white/[0.06] border border-border-subtle",
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      <motion.div
        layoutId={layoutId}
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}80, 0 0 16px ${color}30`,
        }}
      />
    </div>
  );
}
