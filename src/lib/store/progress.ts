import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RouteProgress {
  visitedAt: number;
  completed: boolean;
}

interface AcademyProgress {
  routes: Record<string, RouteProgress>;
}

interface ProgressState {
  academies: Record<string, AcademyProgress>;
  lastVisited: { academy: string; slug: string } | null;
  markVisited: (academy: string, routeSlug: string) => void;
  markCompleted: (academy: string, routeSlug: string) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      academies: {},
      lastVisited: null,

      markVisited: (academy, routeSlug) =>
        set((state) => ({
          lastVisited: { academy, slug: routeSlug },
          academies: {
            ...state.academies,
            [academy]: {
              routes: {
                ...state.academies[academy]?.routes,
                [routeSlug]: {
                  visitedAt: Date.now(),
                  completed:
                    state.academies[academy]?.routes[routeSlug]?.completed ??
                    false,
                },
              },
            },
          },
        })),

      markCompleted: (academy, routeSlug) =>
        set((state) => ({
          academies: {
            ...state.academies,
            [academy]: {
              routes: {
                ...state.academies[academy]?.routes,
                [routeSlug]: {
                  visitedAt:
                    state.academies[academy]?.routes[routeSlug]?.visitedAt ??
                    Date.now(),
                  completed: true,
                },
              },
            },
          },
        })),

      resetProgress: () => set({ academies: {}, lastVisited: null }),
    }),
    { name: "se-hub-progress" }
  )
);
