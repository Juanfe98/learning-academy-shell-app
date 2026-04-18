import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
}));
