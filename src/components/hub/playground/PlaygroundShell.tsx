"use client";

import { RotateCcw } from "lucide-react";
import type { Challenge, ConsoleEntry, TestResult } from "@/lib/challenges/types";
import type { FileMap } from "@/lib/challenges/file-tree";
import FileExplorer from "./FileExplorer";
import ChallengeDescription from "./ChallengeDescription";
import PlaygroundPreviewFrame from "./PlaygroundPreviewFrame";
import PlaygroundConsolePanel from "./PlaygroundConsolePanel";
import PlaygroundTestPanel from "./PlaygroundTestPanel";

interface Props {
  challenge: Challenge;
  fileMap: FileMap;
  folders: string[];
  activeFile: string;
  consoleEntries: ConsoleEntry[];
  srcdoc: string | null;
  testResults: TestResult[] | null;
  testRunning: boolean;
  onFileSelect: (path: string) => void;
  onCodeChange: (path: string, content: string) => void;
  onCreateFile: (parentPath: string, fullPath: string) => void;
  onCreateFolder: (parentPath: string, fullPath: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onConsoleMessage: (entry: ConsoleEntry) => void;
  onClearConsole: () => void;
  onReset: () => void;
  onFileNavigate: (path: string) => void;
  onRunTests: () => void;
  CodeEditor: React.ComponentType<{
    filename: string;
    value: string;
    onChange: (value: string) => void;
    fileMap?: FileMap;
    onFileNavigate?: (path: string) => void;
  }>;
}

export default function PlaygroundShell({
  challenge,
  fileMap,
  folders,
  activeFile,
  consoleEntries,
  srcdoc,
  testResults,
  testRunning,
  onFileSelect,
  onCodeChange,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onConsoleMessage,
  onClearConsole,
  onReset,
  onFileNavigate,
  onRunTests,
  CodeEditor,
}: Props) {
  const hasTests = !!challenge.tests;

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0 z-10"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {challenge.title}
        </h1>
        <button
          onClick={onReset}
          title="Reset to original code"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--error)" }}
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Body: 3-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: explorer + description */}
        <div className="w-[280px] shrink-0 flex flex-col min-h-0" style={{ borderRight: "1px solid var(--border-subtle)" }}>
          <FileExplorer
            fileMap={fileMap}
            folders={folders}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteFile={onDeleteFile}
            onDeleteFolder={onDeleteFolder}
          />
          <ChallengeDescription
            title={challenge.title}
            description={challenge.description}
            difficulty={challenge.difficulty}
            tags={challenge.tags}
            problemStatement={challenge.problemStatement}
          />
        </div>

        {/* Center: editor */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <CodeEditor
            filename={activeFile.replace(/^\.\//, "")}
            value={fileMap[activeFile]?.content ?? ""}
            onChange={(value) => onCodeChange(activeFile, value)}
            fileMap={fileMap}
            onFileNavigate={onFileNavigate}
          />
        </div>

        {/* Right: preview + console + tests */}
        <div className="w-[380px] shrink-0 flex flex-col min-h-0" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
          {/* Always mounted so the iframe executes srcdoc; hidden visually for node-ts */}
          <div
            style={{
              display: challenge.environment === "node-ts" ? "none" : "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <PlaygroundPreviewFrame srcdoc={srcdoc} onConsoleMessage={onConsoleMessage} />
          </div>

          {/* Console — fixed height when test panel is visible, flex-1 otherwise */}
          <div
            className="flex flex-col min-h-0"
            style={hasTests
              ? { height: 180, flexShrink: 0 }
              : { flex: 1 }
            }
          >
            <PlaygroundConsolePanel entries={consoleEntries} onClear={onClearConsole} />
          </div>

          {/* Test panel — only for challenges with tests */}
          {hasTests && (
            <PlaygroundTestPanel
              results={testResults}
              running={testRunning}
              onRun={onRunTests}
            />
          )}
        </div>
      </div>
    </div>
  );
}
