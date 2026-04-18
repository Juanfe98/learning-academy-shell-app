"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  hover?: boolean;
  accent?: string;
  children?: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, accent, className = "", style, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={
          hover
            ? {
                y: -3,
                boxShadow:
                  "0 0 0 1px var(--accent-glow), 0 12px 40px rgba(0,0,0,0.4)",
              }
            : undefined
        }
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={[
          "glass rounded-2xl p-6 relative overflow-hidden",
          hover && "cursor-pointer",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...(accent && {
            borderLeft: `2px solid ${accent}`,
          }),
          ...style,
        }}
        {...props}
      >
        {accent && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 0% 50%, ${accent}, transparent)`,
            }}
          />
        )}
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export default Card;
