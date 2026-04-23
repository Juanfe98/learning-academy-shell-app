"use client";

import { Menu, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useUIStore } from "@/lib/store";

export default function TopBar() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUIStore();
  const toggle = () => setMobileDrawerOpen(!mobileDrawerOpen);

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white/[0.06] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </motion.button>

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-violet-400 flex items-center justify-center">
          <Zap size={12} className="text-white" fill="white" />
        </div>
        <span className="font-semibold text-primary text-sm tracking-tight">
          SE Hub
        </span>
      </div>
    </header>
  );
}
