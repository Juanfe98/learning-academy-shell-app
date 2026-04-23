import { create } from "zustand";

function isLearnPath(pathname: string): boolean {
  return pathname === "/learn" || pathname.startsWith("/learn/");
}

interface UIState {
  mobileDrawerOpen: boolean;
  desktopSidebarCollapsed: boolean;
  learnSectionSidebarCollapsed: boolean | null;
  setMobileDrawerOpen: (val: boolean) => void;
  setDesktopSidebarCollapsed: (val: boolean) => void;
  toggleDesktopSidebar: (pathname: string) => void;
  syncDesktopSidebarForPath: (pathname: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileDrawerOpen: false,
  desktopSidebarCollapsed: false,
  learnSectionSidebarCollapsed: null,

  setMobileDrawerOpen: (val) => set({ mobileDrawerOpen: val }),

  setDesktopSidebarCollapsed: (val) => set({ desktopSidebarCollapsed: val }),

  toggleDesktopSidebar: (pathname) =>
    set((state) => {
      const next = !state.desktopSidebarCollapsed;

      if (isLearnPath(pathname)) {
        return {
          desktopSidebarCollapsed: next,
          learnSectionSidebarCollapsed: next,
        };
      }

      return { desktopSidebarCollapsed: next };
    }),

  syncDesktopSidebarForPath: (pathname) =>
    set((state) => {
      if (isLearnPath(pathname)) {
        return {
          desktopSidebarCollapsed: state.learnSectionSidebarCollapsed ?? true,
        };
      }

      return { desktopSidebarCollapsed: false };
    }),
}));
