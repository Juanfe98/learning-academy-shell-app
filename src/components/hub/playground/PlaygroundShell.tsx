"use client";

import { RotateCcw } from "lucide-react";
import type { Challenge, ChallengeFile, ConsoleEntry } from "@/lib/challenges/types";
import FileExplorer from "./FileExplorer";
import ChallengeDescription from "./ChallengeDescription";
import PlaygroundPreviewFrame from "./PlaygroundPreviewFrame";
import PlaygroundConsolePanel from "./PlaygroundConsolePanel";

interface Props {
  challenge: Challenge;
  activeFile: string;
  files: Record<string, string>;
  consoleEntries: ConsoleEntry[];
  srcdoc: string | null;
  onFileSelect: (filename: string) => void;
  onCodeChange: (filename: string, content: string) => void;
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
  activeFile,
  files,
  consoleEntries,
  srcdoc,
  onFileSelect,
  onCodeChange,
  onConsoleMessage,
  onClearConsole,
  onReset,
  CodeEditor,
}: Props) {
  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0 z-10"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {challenge.title}
        </h1>
        <button
          onClick={onReset}
          title="Reset to original code"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--error)",
          }}
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Body: 3-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left column: file explorer + description */}
        <div
          className="w-[280px] shrink-0 flex flex-col min-h-0"
          style={{ borderRight: "1px solid var(--border-subtle)" }}
        >
          <FileExplorer
            files={challenge.files}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
          <ChallengeDescription
            title={challenge.title}
            description={challenge.description}
            difficulty={challenge.difficulty}
            tags={challenge.tags}
          />
        </div>

        {/* Center: code editor */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <CodeEditor
            filename={activeFile}
            value={files[activeFile] ?? ""}
            onChange={(value) => onCodeChange(activeFile, value)}
          />
        </div>

        {/* Right column: preview (top) + console (bottom) */}
        <div
          className="w-[380px] shrink-0 flex flex-col min-h-0"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          <PlaygroundPreviewFrame
            srcdoc={srcdoc}
            onConsoleMessage={onConsoleMessage}
          />
          <div className="h-[220px] shrink-0 flex flex-col">
            <PlaygroundConsolePanel
              entries={consoleEntries}
              onClear={onClearConsole}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
