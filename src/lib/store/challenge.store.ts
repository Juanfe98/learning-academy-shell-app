import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChallengeFile } from "@/lib/challenges/types";

interface ChallengeStoreState {
  sessions: Record<string, Record<string, string>>;
  setFileContent: (slug: string, filename: string, content: string) => void;
  getFileContent: (slug: string, filename: string, original: string) => string;
  resetChallenge: (slug: string, files: ChallengeFile[]) => void;
}

export const useChallengeStore = create<ChallengeStoreState>()(
  persist(
    (set, get) => ({
      sessions: {},

      setFileContent: (slug, filename, content) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [slug]: { ...(state.sessions[slug] ?? {}), [filename]: content },
          },
        })),

      getFileContent: (slug, filename, original) =>
        get().sessions[slug]?.[filename] ?? original,

      resetChallenge: (slug, files) =>
        set((state) => {
          const reset: Record<string, string> = {};
          for (const f of files) reset[f.filename] = f.content;
          return { sessions: { ...state.sessions, [slug]: reset } };
        }),
    }),
    {
      name: "se-hub-challenges",
      skipHydration: true,
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);
