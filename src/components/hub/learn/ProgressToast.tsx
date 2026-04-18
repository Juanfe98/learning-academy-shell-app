"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface ProgressToastProps {
  show: boolean;
  onHide: () => void;
  durationMs?: number;
}

export default function ProgressToast({
  show,
  onHide,
  durationMs = 2500,
}: ProgressToastProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onHide, durationMs);
    return () => clearTimeout(t);
  }, [show, onHide, durationMs]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "var(--success)",
          }}
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={16} />
          Progress saved
        </motion.div>
      )}
    </AnimatePresence>
  );
}
