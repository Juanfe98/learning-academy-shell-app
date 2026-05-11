"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Challenge, ConsoleEntry } from "@/lib/challenges/types";
import { buildSeedFileMap, type FileMap, type FileEntry } from "@/lib/challenges/file-tree";
import { buildBundle } from "@/lib/challenges/bundler";
import { buildPlaygroundSrcdoc } from "@/lib/interview/build-srcdoc";
import { useChallengeStore } from "@/lib/store/challenge.store";
import PlaygroundShell from "@/components/hub/playground/PlaygroundShell";

const CodeEditor = dynamic(
  () => import("@/components/hub/playground/PlaygroundCodeEditor"),
  { ssr: false }
);

interface Props {
  challenge: Challenge;
}

export default function PlaygroundPage({ challenge }: Props) {
  const seedFileMap = buildSeedFileMap(challenge.files as Parameters<typeof buildSeedFileMap>[0]);
  const normalizedEntry = "./" + challenge.entryFile;

  const [mounted, setMounted] = useState(false);
  const [activeFile, setActiveFile] = useState(normalizedEntry);
  const [fileMap, setFileMap] = useState<FileMap>(seedFileMap);
  const [folders, setFolders] = useState<string[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useChallengeStore;

  useEffect(() => {
    store.persist.rehydrate();
    setMounted(true);
  }, [store]);

  useEffect(() => {
    if (!mounted) return;
    const saved = store.getState().getFileMap(challenge.slug, seedFileMap);
    const savedFolders = store.getState().folders[challenge.slug] ?? [];
    setFileMap(saved);
    setFolders(savedFolders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, challenge.slug]);

  const rebuildPreview = useCallback(
    async (map: FileMap) => {
      setConsoleEntries([]);
      const { bundle, css, error } = await buildBundle(map, normalizedEntry);
      if (error) {
        setConsoleEntries([{ id: crypto.randomUUID(), method: "error", args: [error], timestamp: Date.now() }]);
        setSrcdoc(buildPlaygroundSrcdoc("", ""));
        return;
      }
      setSrcdoc(buildPlaygroundSrcdoc(bundle, css));
    },
    [normalizedEntry]
  );

  useEffect(() => {
    if (!mounted) return;
    rebuildPreview(fileMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const scheduleRebuild = useCallback(
    (map: FileMap) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => rebuildPreview(map), 500);
    },
    [rebuildPreview]
  );

  const handleCodeChange = useCallback(
    (path: string, content: string) => {
      setFileMap((prev) => {
        const next = { ...prev, [path]: { ...prev[path], content } };
        scheduleRebuild(next);
        store.getState().setFileContent(challenge.slug, path, content);
        return next;
      });
    },
    [challenge.slug, scheduleRebuild, store]
  );

  const handleCreateFile = useCallback(
    (_parentPath: string, fullPath: string) => {
      const ext = fullPath.split(".").pop() ?? "jsx";
      const lang: FileEntry["language"] = ext === "css" ? "css" : ext === "js" ? "js" : "jsx";
      const entry: FileEntry = { content: "", language: lang, seed: false };
      store.getState().addFile(challenge.slug, fullPath, entry);
      setFileMap((prev) => {
        const next = { ...prev, [fullPath]: entry };
        return next;
      });
      setActiveFile(fullPath);
    },
    [challenge.slug, store]
  );

  const handleCreateFolder = useCallback(
    (_parentPath: string, fullPath: string) => {
      store.getState().addFolder(challenge.slug, fullPath);
      setFolders((prev) => [...new Set([...prev, fullPath])]);
    },
    [challenge.slug, store]
  );

  const handleDeleteFile = useCallback(
    (path: string) => {
      store.getState().deleteFile(challenge.slug, path);
      setFileMap((prev) => {
        const next = { ...prev };
        delete next[path];
        scheduleRebuild(next);
        return next;
      });
      if (activeFile === path) setActiveFile(normalizedEntry);
    },
    [challenge.slug, activeFile, normalizedEntry, scheduleRebuild, store]
  );

  const handleDeleteFolder = useCallback(
    (folderPath: string) => {
      store.getState().deleteFolder(challenge.slug, folderPath);
      const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
      setFileMap((prev) => {
        const next = { ...prev };
        for (const p of Object.keys(next)) {
          if (p === folderPath || p.startsWith(prefix)) delete next[p];
        }
        scheduleRebuild(next);
        return next;
      });
      setFolders((prev) => prev.filter((f) => f !== folderPath && !f.startsWith(prefix)));
      if (activeFile.startsWith(prefix)) setActiveFile(normalizedEntry);
    },
    [challenge.slug, activeFile, normalizedEntry, scheduleRebuild, store]
  );

  const handleReset = useCallback(() => {
    store.getState().resetChallenge(challenge.slug, seedFileMap);
    setFileMap({ ...seedFileMap });
    setFolders([]);
    setActiveFile(normalizedEntry);
    setConsoleEntries([]);
    rebuildPreview(seedFileMap);
  }, [challenge.slug, seedFileMap, normalizedEntry, rebuildPreview, store]);

  const handleConsoleMessage = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((prev) => [...prev.slice(-199), entry]);
  }, []);

  if (!mounted) return null;

  return (
    <PlaygroundShell
      challenge={challenge}
      fileMap={fileMap}
      folders={folders}
      activeFile={activeFile}
      consoleEntries={consoleEntries}
      srcdoc={srcdoc}
      onFileSelect={setActiveFile}
      onCodeChange={handleCodeChange}
      onCreateFile={handleCreateFile}
      onCreateFolder={handleCreateFolder}
      onDeleteFile={handleDeleteFile}
      onDeleteFolder={handleDeleteFolder}
      onConsoleMessage={handleConsoleMessage}
      onClearConsole={() => setConsoleEntries([])}
      onReset={handleReset}
      CodeEditor={CodeEditor}
    />
  );
}
