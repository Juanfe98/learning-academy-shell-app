import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileMap, FileEntry } from "@/lib/challenges/file-tree";

interface ChallengeStoreState {
  fileMaps: Record<string, FileMap>;
  folders: Record<string, string[]>;

  getFileMap: (slug: string, seedFileMap: FileMap) => FileMap;
  setFileContent: (slug: string, path: string, content: string) => void;
  addFile: (slug: string, path: string, entry: FileEntry) => void;
  deleteFile: (slug: string, path: string) => void;
  addFolder: (slug: string, folderPath: string) => void;
  deleteFolder: (slug: string, folderPath: string) => void;
  resetChallenge: (slug: string, seedFileMap: FileMap) => void;
}

export const useChallengeStore = create<ChallengeStoreState>()(
  persist(
    (set, get) => ({
      fileMaps: {},
      folders: {},

      getFileMap: (slug, seedFileMap) =>
        get().fileMaps[slug] ?? seedFileMap,

      setFileContent: (slug, path, content) =>
        set((s) => ({
          fileMaps: {
            ...s.fileMaps,
            [slug]: {
              ...(s.fileMaps[slug] ?? {}),
              [path]: { ...(s.fileMaps[slug]?.[path] ?? { language: "jsx", seed: false }), content },
            },
          },
        })),

      addFile: (slug, path, entry) =>
        set((s) => ({
          fileMaps: {
            ...s.fileMaps,
            [slug]: { ...(s.fileMaps[slug] ?? {}), [path]: entry },
          },
        })),

      deleteFile: (slug, path) =>
        set((s) => {
          const next = { ...(s.fileMaps[slug] ?? {}) };
          delete next[path];
          return { fileMaps: { ...s.fileMaps, [slug]: next } };
        }),

      addFolder: (slug, folderPath) =>
        set((s) => ({
          folders: {
            ...s.folders,
            [slug]: [...new Set([...(s.folders[slug] ?? []), folderPath])],
          },
        })),

      deleteFolder: (slug, folderPath) =>
        set((s) => {
          // Remove folder + all files inside it
          const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
          const nextFiles = { ...(s.fileMaps[slug] ?? {}) };
          for (const path of Object.keys(nextFiles)) {
            if (path === folderPath || path.startsWith(prefix)) delete nextFiles[path];
          }
          const nextFolders = (s.folders[slug] ?? []).filter(
            (f) => f !== folderPath && !f.startsWith(prefix)
          );
          return {
            fileMaps: { ...s.fileMaps, [slug]: nextFiles },
            folders: { ...s.folders, [slug]: nextFolders },
          };
        }),

      resetChallenge: (slug, seedFileMap) =>
        set((s) => ({
          fileMaps: { ...s.fileMaps, [slug]: { ...seedFileMap } },
          folders: { ...s.folders, [slug]: [] },
        })),
    }),
    {
      name: "se-hub-challenges",
      skipHydration: true,
      partialize: (s) => ({ fileMaps: s.fileMaps, folders: s.folders }),
      onRehydrateStorage: () => (state) => {
        // Migrate old sessions format from Feature 001
        if (!state) return;
        const raw = state as unknown as Record<string, unknown>;
        if (raw.sessions && !raw.fileMaps) {
          const sessions = raw.sessions as Record<string, Record<string, string>>;
          const fileMaps: Record<string, FileMap> = {};
          for (const [slug, files] of Object.entries(sessions)) {
            fileMaps[slug] = {};
            for (const [filename, content] of Object.entries(files)) {
              const lang = filename.endsWith(".css") ? "css" : "jsx";
              fileMaps[slug]["./" + filename] = { content, language: lang, seed: true };
            }
          }
          state.fileMaps = fileMaps;
          state.folders = {};
        }
      },
    }
  )
);
