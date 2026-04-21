"use client";

import { useState, useCallback, useEffect } from "react";
import TestRunner from "./TestRunner";
import ConsolePanel, { type LogEntry } from "./ConsolePanel";
import PreviewPanel from "./PreviewPanel";

interface Props {
  srcdoc: string | null;
  execSrcdoc: string | null;
  previewSrcdoc: string | null;
  showConsole: boolean;
  showPreview: boolean;
}

type Tab = "tests" | "console" | "preview";

export default function OutputPanel({ srcdoc, execSrcdoc, previewSrcdoc, showConsole, showPreview }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("tests");
  const [testSummary, setTestSummary] = useState<{ passed: number; total: number } | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<LogEntry[]>([]);
  const [consoleRunning, setConsoleRunning] = useState(false);

  // Auto-switch to Tests when a new test run starts
  useEffect(() => {
    if (srcdoc) setActiveTab("tests");
  }, [srcdoc]);

  // Auto-switch to Console when Execute is triggered
  useEffect(() => {
    if (execSrcdoc) setActiveTab("console");
  }, [execSrcdoc]);

  const handleTestsComplete = useCallback((passed: number, total: number) => {
    setTestSummary({ passed, total });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center shrink-0 px-2"
        style={{
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <TabButton
          active={activeTab === "tests"}
          onClick={() => setActiveTab("tests")}
          label="Tests"
          badge={
            testSummary
              ? { text: `${testSummary.passed}/${testSummary.total}`, ok: testSummary.passed === testSummary.total }
              : undefined
          }
        />
        {showConsole && (
          <TabButton
            active={activeTab === "console"}
            onClick={() => setActiveTab("console")}
            label="Console"
            badge={
              consoleEntries.length > 0
                ? { text: String(consoleEntries.length), ok: !consoleEntries.some(e => e.level === "error") }
                : undefined
            }
          />
        )}
        {showPreview && (
          <TabButton
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            label="Preview"
          />
        )}
      </div>

      {/* Panels — all mounted, visibility toggled via display so iframes persist */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0" style={{ display: activeTab === "tests" ? "flex" : "none", flexDirection: "column" }}>
          <TestRunner srcdoc={srcdoc} onComplete={handleTestsComplete} />
        </div>

        {showConsole && (
          <div className="absolute inset-0" style={{ display: activeTab === "console" ? "flex" : "none", flexDirection: "column" }}>
            <ConsolePanel
              srcdoc={execSrcdoc}
              entries={consoleEntries}
              onEntries={setConsoleEntries}
              running={consoleRunning}
              onRunning={setConsoleRunning}
            />
          </div>
        )}

        {showPreview && (
          <div className="absolute inset-0" style={{ display: activeTab === "preview" ? "flex" : "none", flexDirection: "column" }}>
            <PreviewPanel srcdoc={previewSrcdoc} />
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: { text: string; ok: boolean };
}

function TabButton({ active, onClick, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: active ? "2px solid var(--accent-primary)" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      {label}
      {badge && (
        <span
          className="px-1 rounded text-[10px] font-semibold tabular-nums"
          style={{
            background: badge.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: badge.ok ? "var(--success)" : "var(--error)",
          }}
        >
          {badge.text}
        </span>
      )}
    </button>
  );
}
