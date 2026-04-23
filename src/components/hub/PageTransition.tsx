"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLearnPage = pathname === "/learn" || pathname.startsWith("/learn/");

  const initial = isLearnPage ? { opacity: 0 } : { opacity: 0, y: 10 };
  const animate = isLearnPage ? { opacity: 1 } : { opacity: 1, y: 0 };
  const exit = isLearnPage ? { opacity: 0 } : { opacity: 0, y: -6 };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
