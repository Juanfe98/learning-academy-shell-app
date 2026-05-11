"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Challenge, ConsoleEntry } from "@/lib/challenges/types";
import { transpileJSX, stripHostImports } from "@/lib/challenges/transpile";
import { buildPlaygroundSrcdoc, PLAYGROUND_MOUNT_SRC } from "@/lib/interview/build-srcdoc";
import { useChallengeStore } from "@/lib/store/challenge.store";
import PlaygroundShell from "@/components/hub/playground/PlaygroundShell";

const CodeEditor = dynamic(
  () => import("@/components/hub/playground/PlaygroundCodeEditor"),
  { ssr: false }
);

interface Props {
  challenge: Challenge;
}

function buildFileMap(challenge: Challenge): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of challenge.files) map[f.filename] = f.content;
  return map;
}

export default function PlaygroundPage({ challenge }: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeFile, setActiveFile] = useState(challenge.entryFile);
  const [fileEdits, setFileEdits] = useState<Record<string, string>>(
    buildFileMap(challenge)
  );
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { getFileContent, setFileContent, resetChallenge } = useChallengeStore();

  useEffect(() => {
    useChallengeStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // After hydration, load saved content for all files
  useEffect(() => {
    if (!mounted) return;
    const saved: Record<string, string> = {};
    for (const f of challenge.files) {
      saved[f.filename] = getFileContent(challenge.slug, f.filename, f.content);
    }
    setFileEdits(saved);
  }, [mounted, challenge, getFileContent]);

  const cssContent = useMemo(() => {
    const cssFile = challenge.files.find((f) => f.language === "css");
    return cssFile ? fileEdits[cssFile.filename] ?? cssFile.content : undefined;
  }, [challenge.files, fileEdits]);

  const rebuildPreview = useCallback(
    async (edits: Record<string, string>) => {
      const entryContent = edits[challenge.entryFile] ?? "";
      if (!entryContent.trim()) {
        setSrcdoc(buildPlaygroundSrcdoc("", cssContent));
        return;
      }
      const { code, error } = await transpileJSX(entryContent + PLAYGROUND_MOUNT_SRC);
      if (error) {
        setConsoleEntries((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            method: "error",
            args: [error],
            timestamp: Date.now(),
          },
        ]);
        setSrcdoc(buildPlaygroundSrcdoc("", cssContent));
        return;
      }
      setSrcdoc(buildPlaygroundSrcdoc(stripHostImports(code), cssContent));
    },
    [challenge.entryFile, cssContent]
  );

  // Trigger initial preview once mounted
  useEffect(() => {
    if (!mounted) return;
    rebuildPreview(fileEdits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleCodeChange = useCallback(
    (filename: string, content: string) => {
      setFileEdits((prev) => {
        const next = { ...prev, [filename]: content };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setConsoleEntries([]);
          rebuildPreview(next);
        }, 500);
        return next;
      });
      setFileContent(challenge.slug, filename, content);
    },
    [challenge.slug, setFileContent, rebuildPreview]
  );

  const handleReset = useCallback(() => {
    const original = buildFileMap(challenge);
    resetChallenge(challenge.slug, challenge.files);
    setFileEdits(original);
    setConsoleEntries([]);
    setActiveFile(challenge.entryFile);
    rebuildPreview(original);
  }, [challenge, resetChallenge, rebuildPreview]);

  const handleConsoleMessage = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((prev) => [...prev.slice(-199), entry]);
  }, []);

  if (!mounted) return null;

  return (
    <PlaygroundShell
      challenge={challenge}
      activeFile={activeFile}
      files={fileEdits}
      consoleEntries={consoleEntries}
      srcdoc={srcdoc}
      onFileSelect={setActiveFile}
      onCodeChange={handleCodeChange}
      onConsoleMessage={handleConsoleMessage}
      onClearConsole={() => setConsoleEntries([])}
      onReset={handleReset}
      CodeEditor={CodeEditor}
    />
  );
}
