import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface ModuleProgress {
  visitedAt: string;
  lastVisitedAt: string;
  completed: boolean;
}

export interface AcademyProgress {
  modules: Record<string, ModuleProgress>;
  startedAt: string;
  lastVisitedAt: string;
}

export type ModuleStatus = "not-started" | "visited" | "completed";

export interface AcademyProgressSummary {
  percent: number;
  completedCount: number;
  visitedCount: number;
}

interface StreakState {
  current: number;
  longest: number;
  lastStudiedDate: string; // YYYY-MM-DD
}

interface ProgressState {
  /* ── Persisted state ─────────────────────────────────────── */
  academies: Record<string, AcademyProgress>;
  streak: StreakState;
  totalMinutesStudied: number;
  lastVisited: {
    academy: string;
    moduleSlug: string;
    moduleTitle: string;
  } | null;

  /* ── Actions ─────────────────────────────────────────────── */
  markModuleVisited: (
    academySlug: string,
    moduleSlug: string,
    moduleTitle: string,
    estimatedMinutes: number
  ) => void;
  markModuleComplete: (academySlug: string, moduleSlug: string) => void;
  getAcademyProgress: (
    academySlug: string,
    totalModules?: number
  ) => AcademyProgressSummary;
  getModuleStatus: (academySlug: string, moduleSlug: string) => ModuleStatus;
  resetProgress: () => void;
  resetAcademyProgress: (academySlug: string) => void;
}

/* ─── Streak helper (exported for unit tests) ────────────────────────────── */

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function computeStreak(streak: StreakState): StreakState {
  const today = toDateStr(new Date());
  const { current, longest, lastStudiedDate } = streak;

  if (lastStudiedDate === today) {
    return streak; // already studied today — no change
  }

  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

  if (lastStudiedDate === yesterday) {
    const next = current + 1;
    return { current: next, longest: Math.max(longest, next), lastStudiedDate: today };
  }

  // Gap ≥ 2 days, or first ever study
  return { current: 1, longest: Math.max(longest, 1), lastStudiedDate: today };
}

/* ─── Initial state ──────────────────────────────────────────────────────── */

const INITIAL_STATE: Pick<
  ProgressState,
  "academies" | "streak" | "totalMinutesStudied" | "lastVisited"
> = {
  academies: {},
  streak: { current: 0, longest: 0, lastStudiedDate: "" },
  totalMinutesStudied: 0,
  lastVisited: null,
};

/* ─── Store ──────────────────────────────────────────────────────────────── */

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      markModuleVisited: (academySlug, moduleSlug, moduleTitle, estimatedMinutes) => {
        set((state) => {
          const now = new Date().toISOString();
          const existing = state.academies[academySlug];
          const existingModule = existing?.modules?.[moduleSlug];

          const updatedModule: ModuleProgress = existingModule
            ? { ...existingModule, lastVisitedAt: now }
            : { visitedAt: now, lastVisitedAt: now, completed: false };

          const addMinutes = existingModule ? 0 : estimatedMinutes;

          return {
            streak: computeStreak(state.streak),
            totalMinutesStudied: state.totalMinutesStudied + addMinutes,
            lastVisited: { academy: academySlug, moduleSlug, moduleTitle },
            academies: {
              ...state.academies,
              [academySlug]: {
                startedAt: existing?.startedAt ?? now,
                lastVisitedAt: now,
                modules: {
                  ...(existing?.modules ?? {}),
                  [moduleSlug]: updatedModule,
                },
              },
            },
          };
        });
      },

      markModuleComplete: (academySlug, moduleSlug) => {
        set((state) => {
          const existing = state.academies[academySlug];
          const existingModule = existing?.modules?.[moduleSlug];
          const now = new Date().toISOString();

          return {
            academies: {
              ...state.academies,
              [academySlug]: {
                startedAt: existing?.startedAt ?? now,
                lastVisitedAt: existing?.lastVisitedAt ?? now,
                modules: {
                  ...(existing?.modules ?? {}),
                  [moduleSlug]: {
                    visitedAt: existingModule?.visitedAt ?? now,
                    lastVisitedAt: existingModule?.lastVisitedAt ?? now,
                    completed: true,
                  },
                },
              },
            },
          };
        });
      },

      getAcademyProgress: (academySlug, totalModules) => {
        const academy = get().academies[academySlug];
        if (!academy) return { percent: 0, completedCount: 0, visitedCount: 0 };

        const modules = Object.values(academy.modules ?? {});
        const completedCount = modules.filter((m) => m.completed).length;
        const visitedCount = modules.length;
        const denominator = totalModules ?? visitedCount;
        const percent =
          denominator > 0 ? Math.round((completedCount / denominator) * 100) : 0;

        return { percent, completedCount, visitedCount };
      },

      getModuleStatus: (academySlug, moduleSlug) => {
        const mod = get().academies[academySlug]?.modules?.[moduleSlug];
        if (!mod) return "not-started";
        if (mod.completed) return "completed";
        return "visited";
      },

      resetProgress: () => set({ ...INITIAL_STATE }),

      resetAcademyProgress: (academySlug) => {
        set((state) => {
          const { [academySlug]: _removed, ...rest } = state.academies;
          return { academies: rest };
        });
      },
    }),
    {
      name: "se-hub-progress",
      skipHydration: true,
      partialize: (state) => ({
        academies: state.academies,
        streak: state.streak,
        totalMinutesStudied: state.totalMinutesStudied,
        lastVisited: state.lastVisited,
      }),
    }
  )
);
