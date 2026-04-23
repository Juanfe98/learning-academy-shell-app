"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  House,
  Map,
  LayoutDashboard,
  Settings,
  Zap,
  BrainCircuit,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/paths", label: "Learning Paths", icon: Map },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interview", label: "Interview Prep", icon: BrainCircuit },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <motion.div
        whileHover={collapsed ? { scale: 1.03 } : { x: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "relative flex items-center rounded-lg text-sm",
          "transition-colors duration-150 group",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
          active
            ? "text-primary bg-accent/10"
            : "text-secondary hover:text-primary hover:bg-white/[0.05]"
        )}
      >
        {active && (
          <motion.div
            layoutId="nav-active-pill"
            className="absolute left-0 inset-y-1 w-0.5 rounded-full bg-accent"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon
          size={16}
          aria-hidden={true}
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-accent" : "text-muted group-hover:text-secondary"
          )}
        />
        {!collapsed && <span className="font-medium">{label}</span>}
      </motion.div>
    </Link>
  );
}

function SidebarContent({
  collapsed = false,
  showHeader = true,
  onNav,
}: {
  collapsed?: boolean;
  showHeader?: boolean;
  onNav?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      {showHeader && (
        <div
          className={cn(
            "py-5 flex items-center border-b border-border-subtle",
            collapsed ? "justify-center px-2" : "px-4 gap-2.5"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-violet-400 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" fill="white" aria-hidden={true} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-primary tracking-tight text-[15px]">
              SE Hub
            </span>
          )}
        </div>
      )}

      {/* Nav */}
      <nav
        aria-label="Main navigation"
        className={cn("flex-1 py-4 space-y-0.5", collapsed ? "px-2" : "px-3")}
      >
        {navItems.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname === href}
            collapsed={collapsed}
            onClick={onNav}
          />
        ))}
      </nav>

      {/* Settings footer */}
      <div className={cn("py-4 border-t border-border-subtle", collapsed ? "px-2" : "px-3")}>
        <NavItem
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname === "/settings"}
          collapsed={collapsed}
          onClick={onNav}
        />
      </div>
    </div>
  );
}

/* ── Desktop sidebar (always visible ≥ lg) ─────────────────────────────── */

export function DesktopSidebar() {
  const pathname = usePathname();
  const {
    desktopSidebarCollapsed,
    learnSectionSidebarCollapsed,
    toggleDesktopSidebar,
    syncDesktopSidebarForPath,
  } = useUIStore();

  useEffect(() => {
    syncDesktopSidebarForPath(pathname);
  }, [pathname, syncDesktopSidebarForPath]);

  const collapsed =
    pathname === "/learn" || pathname.startsWith("/learn/")
      ? learnSectionSidebarCollapsed ?? true
      : desktopSidebarCollapsed;

  return (
    <motion.aside
      className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className={cn(
          "flex items-center border-b border-border-subtle",
          collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-violet-400 flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" fill="white" aria-hidden={true} />
            </div>
            <span className="font-semibold text-primary tracking-tight text-[15px]">
              SE Hub
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => toggleDesktopSidebar(pathname)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white/[0.06] transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <SidebarContent collapsed={collapsed} showHeader={false} />
    </motion.aside>
  );
}

/* ── Mobile drawer (slide-in) ───────────────────────────────────────────── */

export function MobileDrawer() {
  const { mobileDrawerOpen: isOpen, setMobileDrawerOpen } = useUIStore();
  const close = () => setMobileDrawerOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={close}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[240px] lg:hidden"
            style={{
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            <SidebarContent onNav={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
