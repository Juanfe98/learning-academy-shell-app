"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Challenge, ConsoleEntry, TestResult } from "@/lib/challenges/types";
import { buildSeedFileMap, type FileMap, type FileEntry } from "@/lib/challenges/file-tree";
import { buildBundle } from "@/lib/challenges/bundler";
import { buildPlaygroundSrcdoc, buildNodeTestSrcdoc } from "@/lib/interview/build-srcdoc";
import PlaygroundShell from "@/components/hub/playground/PlaygroundShell";

const CodeEditor = dynamic(
  () => import("@/components/hub/playground/MonacoPlaygroundEditor"),
  { ssr: false }
);

interface Props {
  challenge: Challenge;
}

export default function PlaygroundPage({ challenge }: Props) {
  const seedFileMap = useMemo(
    () => buildSeedFileMap(challenge.files as Parameters<typeof buildSeedFileMap>[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.slug]
  );
  const normalizedEntry = useMemo(() => "./" + challenge.entryFile, [challenge.entryFile]);

  const [activeFile, setActiveFile] = useState(normalizedEntry);
  const [fileMap, setFileMap] = useState<FileMap>(seedFileMap);
  const [folders, setFolders] = useState<string[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testSrcdoc, setTestSrcdoc] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testIframeRef = useRef<HTMLIFrameElement>(null);

  const rebuildPreview = useCallback(
    async (map: FileMap) => {
      setConsoleEntries([]);
      const { bundle, css, error } = await buildBundle(map, normalizedEntry, challenge.environment);
      if (error) {
        setConsoleEntries([{ id: crypto.randomUUID(), method: "error", args: [error], timestamp: Date.now() }]);
        setSrcdoc(buildPlaygroundSrcdoc("", ""));
        return;
      }
      setSrcdoc(buildPlaygroundSrcdoc(bundle, css));
    },
    [normalizedEntry, challenge.environment]
  );

  // Build initial preview on mount only
  useEffect(() => {
    rebuildPreview(seedFileMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load test srcdoc into hidden iframe when available
  useEffect(() => {
    if (testIframeRef.current) {
      testIframeRef.current.srcdoc = testSrcdoc ?? "";
    }
  }, [testSrcdoc]);

  // Listen for TEST_RESULTS from the hidden test iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "TEST_RESULTS") {
        setTestResults(e.data.results as TestResult[]);
        setTestRunning(false);
        setTestSrcdoc(null);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
        return next;
      });
    },
    [scheduleRebuild]
  );

  const handleCreateFile = useCallback(
    (_parentPath: string, fullPath: string) => {
      const ext = fullPath.split(".").pop() ?? "jsx";
      const lang: FileEntry["language"] =
        ext === "css" ? "css" :
        ext === "ts"  ? "ts"  :
        ext === "tsx" ? "tsx" :
        ext === "js"  ? "js"  : "jsx";
      const entry: FileEntry = { content: "", language: lang, seed: false };
      setFileMap((prev) => ({ ...prev, [fullPath]: entry }));
      setActiveFile(fullPath);
    },
    []
  );

  const handleCreateFolder = useCallback(
    (_parentPath: string, fullPath: string) => {
      setFolders((prev) => [...new Set([...prev, fullPath])]);
    },
    []
  );

  const handleDeleteFile = useCallback(
    (path: string) => {
      setFileMap((prev) => {
        const next = { ...prev };
        delete next[path];
        scheduleRebuild(next);
        return next;
      });
      if (activeFile === path) setActiveFile(normalizedEntry);
    },
    [activeFile, normalizedEntry, scheduleRebuild]
  );

  const handleDeleteFolder = useCallback(
    (folderPath: string) => {
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
    [activeFile, normalizedEntry, scheduleRebuild]
  );

  const handleReset = useCallback(() => {
    setFileMap({ ...seedFileMap });
    setFolders([]);
    setActiveFile(normalizedEntry);
    setConsoleEntries([]);
    setTestResults(null);
    rebuildPreview(seedFileMap);
  }, [seedFileMap, normalizedEntry, rebuildPreview]);

  const handleConsoleMessage = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((prev) => [...prev.slice(-199), entry]);
  }, []);

  const handleRunTests = useCallback(async () => {
    if (!challenge.tests) return;
    setTestRunning(true);
    setTestResults(null);

    const testFileMap: FileMap = {
      ...fileMap,
      "./__tests__.ts": { content: challenge.tests, language: "ts", seed: false },
    };

    const { bundle, error } = await buildBundle(testFileMap, "./__tests__.ts", "node-ts");
    if (error) {
      setTestResults([{ description: "Build error", pass: false, error }]);
      setTestRunning(false);
      return;
    }
    setTestSrcdoc(buildNodeTestSrcdoc(bundle));
  }, [challenge.tests, fileMap]);

  return (
    <>
      {/* Hidden iframe for test execution */}
      <iframe
        ref={testIframeRef}
        sandbox="allow-scripts"
        title="test-runner"
        style={{ display: "none" }}
      />
      <PlaygroundShell
        challenge={challenge}
        fileMap={fileMap}
        folders={folders}
        activeFile={activeFile}
        consoleEntries={consoleEntries}
        srcdoc={srcdoc}
        testResults={testResults}
        testRunning={testRunning}
        onFileSelect={setActiveFile}
        onCodeChange={handleCodeChange}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
        onConsoleMessage={handleConsoleMessage}
        onClearConsole={() => setConsoleEntries([])}
        onReset={handleReset}
        onFileNavigate={setActiveFile}
        onRunTests={handleRunTests}
        CodeEditor={CodeEditor}
      />
    </>
  );
}
