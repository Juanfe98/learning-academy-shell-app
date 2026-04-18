import type { ReactNode } from "react";

type BadgeVariant = "default" | "accent" | "success" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-white/[0.06] text-secondary border border-border-subtle",
  accent:
    "bg-accent/15 text-accent-soft border border-accent/30",
  success:
    "bg-success/15 text-success border border-success/30",
  warning:
    "bg-warning/15 text-warning border border-warning/30",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5",
        "text-xs font-medium rounded-full whitespace-nowrap",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
