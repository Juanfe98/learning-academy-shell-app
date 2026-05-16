"use client";

import { RotateCcw } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { Challenge, ConsoleEntry, TestResult } from "@/lib/challenges/types";
import type { FileMap } from "@/lib/challenges/file-tree";
import FileExplorer from "./FileExplorer";
import ChallengeDescription from "./ChallengeDescription";
import PlaygroundPreviewFrame from "./PlaygroundPreviewFrame";
import PlaygroundConsolePanel from "./PlaygroundConsolePanel";
import PlaygroundTestPanel from "./PlaygroundTestPanel";

// T002: Panel size defaults (percentage of container)
const PANEL_DEFAULTS = {
  left:   { default: 20, min: 12 },
  editor: { default: 55, min: 25 },
  right:  { default: 25, min: 18 },
} as const;

const RIGHT_PANEL_DEFAULTS = {
  preview: { default: 60, min: 20 },
  console: { default: 40, min: 20 },
} as const;

// T003: Vertical divider between columns
function ColHandle() {
  return (
    <Separator style={{ width: 4 }} className="group flex items-stretch">
      <div
        style={{
          width: 1,
          margin: "0 auto",
          background: "var(--border-subtle)",
          transition: "background 150ms",
        }}
        className="group-hover:bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active=pointer]:bg-[rgba(99,102,241,0.5)]"
      />
    </Separator>
  );
}

// T004: Horizontal divider between preview and console
function RowHandle() {
  return (
    <Separator style={{ height: 4 }} className="group flex flex-col justify-center">
      <div
        style={{
          height: 1,
          width: "100%",
          background: "var(--border-subtle)",
          transition: "background 150ms",
        }}
        className="group-hover:bg-[rgba(99,102,241,0.4)] group-data-[resize-handle-active=pointer]:bg-[rgba(99,102,241,0.5)]"
      />
    </Separator>
  );
}

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
  openTabs: string[];
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  CodeEditor: React.ComponentType<{
    filename: string;
    value: string;
    onChange: (value: string) => void;
    fileMap?: FileMap;
    onFileNavigate?: (path: string) => void;
    openTabs: string[];
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
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
  openTabs,
  onTabSelect,
  onTabClose,
  CodeEditor,
}: Props) {
  const hasTests = !!challenge.tests;
  const isReact = challenge.environment !== "node-ts";

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

      {/* T005: Body — resizable 3-column layout */}
      <Group orientation="horizontal" style={{ flex: 1, minHeight: 0 }}>

        {/* Left: explorer + description */}
        <Panel
          defaultSize={PANEL_DEFAULTS.left.default}
          minSize={PANEL_DEFAULTS.left.min}
          style={{ overflow: "hidden" }}
        >
          <div className="flex flex-col h-full">
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
        </Panel>

        {/* T008: Left ↔ Editor divider */}
        <ColHandle />

        {/* Center: editor */}
        <Panel
          defaultSize={PANEL_DEFAULTS.editor.default}
          minSize={PANEL_DEFAULTS.editor.min}
          style={{ overflow: "hidden" }}
        >
          <div className="flex flex-col h-full min-w-0">
            <CodeEditor
              filename={activeFile.replace(/^\.\//, "")}
              value={fileMap[activeFile]?.content ?? ""}
              onChange={(value) => onCodeChange(activeFile, value)}
              fileMap={fileMap}
              onFileNavigate={onFileNavigate}
              openTabs={openTabs}
              onTabSelect={onTabSelect}
              onTabClose={onTabClose}
            />
          </div>
        </Panel>

        {/* T006: Editor ↔ Right divider */}
        <ColHandle />

        {/* Right: preview + console + tests */}
        <Panel
          defaultSize={PANEL_DEFAULTS.right.default}
          minSize={PANEL_DEFAULTS.right.min}
          style={{ overflow: "hidden" }}
        >
          {isReact ? (
            // T010: React environments — vertical split with resizable preview/console
            <Group orientation="vertical" style={{ height: "100%" }}>
              <Panel
                defaultSize={RIGHT_PANEL_DEFAULTS.preview.default}
                minSize={RIGHT_PANEL_DEFAULTS.preview.min}
                style={{ overflow: "hidden" }}
              >
                <PlaygroundPreviewFrame srcdoc={srcdoc} onConsoleMessage={onConsoleMessage} />
              </Panel>

              <RowHandle />

              <Panel
                defaultSize={RIGHT_PANEL_DEFAULTS.console.default}
                minSize={RIGHT_PANEL_DEFAULTS.console.min}
                style={{ overflow: "hidden" }}
              >
                <div className="flex flex-col h-full">
                  <PlaygroundConsolePanel entries={consoleEntries} onClear={onClearConsole} />
                  {hasTests && (
                    <PlaygroundTestPanel
                      results={testResults}
                      running={testRunning}
                      onRun={onRunTests}
                    />
                  )}
                </div>
              </Panel>
            </Group>
          ) : (
            // T011: node-ts — no vertical split; preview stays in DOM (hidden) so iframe executes
            <div className="flex flex-col h-full">
              <div style={{ display: "none" }}>
                <PlaygroundPreviewFrame srcdoc={srcdoc} onConsoleMessage={onConsoleMessage} />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <PlaygroundConsolePanel entries={consoleEntries} onClear={onClearConsole} />
              </div>
              {hasTests && (
                <PlaygroundTestPanel
                  results={testResults}
                  running={testRunning}
                  onRun={onRunTests}
                />
              )}
            </div>
          )}
        </Panel>

      </Group>
    </div>
  );
}
