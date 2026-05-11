"use client";

import { RotateCcw } from "lucide-react";
import type { Challenge, ConsoleEntry } from "@/lib/challenges/types";
import type { FileMap } from "@/lib/challenges/file-tree";
import FileExplorer from "./FileExplorer";
import ChallengeDescription from "./ChallengeDescription";
import PlaygroundPreviewFrame from "./PlaygroundPreviewFrame";
import PlaygroundConsolePanel from "./PlaygroundConsolePanel";

interface Props {
  challenge: Challenge;
  fileMap: FileMap;
  folders: string[];
  activeFile: string;
  consoleEntries: ConsoleEntry[];
  srcdoc: string | null;
  onFileSelect: (path: string) => void;
  onCodeChange: (path: string, content: string) => void;
  onCreateFile: (parentPath: string, fullPath: string) => void;
  onCreateFolder: (parentPath: string, fullPath: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onConsoleMessage: (entry: ConsoleEntry) => void;
  onClearConsole: () => void;
  onReset: () => void;
  CodeEditor: React.ComponentType<{
    filename: string;
    value: string;
    onChange: (value: string) => void;
  }>;
}

export default function PlaygroundShell({
  challenge,
  fileMap,
  folders,
  activeFile,
  consoleEntries,
  srcdoc,
  onFileSelect,
  onCodeChange,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onConsoleMessage,
  onClearConsole,
  onReset,
  CodeEditor,
}: Props) {
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
          />
        </div>

        {/* Center: editor */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <CodeEditor
            filename={activeFile.replace(/^\.\//, "")}
            value={fileMap[activeFile]?.content ?? ""}
            onChange={(value) => onCodeChange(activeFile, value)}
          />
        </div>

        {/* Right: preview + console (preview hidden for node-ts) */}
        <div className="w-[380px] shrink-0 flex flex-col min-h-0" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
          {challenge.environment !== "node-ts" && (
            <PlaygroundPreviewFrame srcdoc={srcdoc} onConsoleMessage={onConsoleMessage} />
          )}
          <div className={challenge.environment === "node-ts" ? "flex-1 flex flex-col min-h-0" : "h-[220px] shrink-0 flex flex-col"}>
            <PlaygroundConsolePanel entries={consoleEntries} onClear={onClearConsole} />
          </div>
        </div>
      </div>
    </div>
  );
}
