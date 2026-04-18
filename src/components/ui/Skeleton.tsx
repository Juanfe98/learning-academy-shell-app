"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const roundedClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export default function Skeleton({
  width,
  height,
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <motion.div
      className={[
        "relative overflow-hidden",
        "bg-white/[0.05] border border-border-subtle",
        roundedClasses[rounded],
        className,
      ].join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 1.6,
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
      />
    </motion.div>
  );
}
