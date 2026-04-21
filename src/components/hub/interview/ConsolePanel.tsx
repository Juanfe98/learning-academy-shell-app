"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export interface LogEntry {
  level: "log" | "warn" | "error" | "info";
  args: string[];
}

interface Props {
  srcdoc: string | null;
  onOutput?: (entries: LogEntry[]) => void;
  entries: LogEntry[];
  onEntries: (entries: LogEntry[]) => void;
  running: boolean;
  onRunning: (v: boolean) => void;
}

const LEVEL_COLOR: Record<string, string> = {
  log:   "var(--text-secondary)",
  info:  "#38bdf8",
  warn:  "var(--warning)",
  error: "var(--error)",
};

const LEVEL_BG: Record<string, string> = {
  log:   "transparent",
  info:  "rgba(56,189,248,0.04)",
  warn:  "rgba(245,158,11,0.06)",
  error: "rgba(239,68,68,0.08)",
};

export default function ConsolePanel({ srcdoc, entries, onEntries, running, onRunning }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const entriesRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "CONSOLE_OUTPUT") {
        const entry: LogEntry = { level: event.data.level, args: event.data.args };
        entriesRef.current = [...entriesRef.current, entry];
        onEntries([...entriesRef.current]);
      } else if (event.data?.type === "EXEC_DONE") {
        onRunning(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEntries, onRunning]);

  useEffect(() => {
    if (!srcdoc || !iframeRef.current) return;
    entriesRef.current = [];
    onEntries([]);
    onRunning(true);
    iframeRef.current.srcdoc = srcdoc;
  }, [srcdoc, onEntries, onRunning]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ display: "none" }}
        title="exec-sandbox"
      />

      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {entries.length === 0 && !running && (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--text-muted)" }}>
            <Terminal size={20} />
            <p>Click Execute to run your code</p>
          </div>
        )}

        {running && entries.length === 0 && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: "var(--text-muted)" }}>
            <span className="text-xs">Running…</span>
          </div>
        )}

        {entries.map((entry, i) => (
          <div
            key={i}
            className="flex gap-2 px-2 py-1 rounded"
            style={{ background: LEVEL_BG[entry.level] ?? "transparent" }}
          >
            <span className="shrink-0 select-none" style={{ color: "var(--text-muted)" }}>
              {i + 1 < 10 ? ` ${i + 1}` : i + 1}
            </span>
            <span style={{ color: LEVEL_COLOR[entry.level] ?? "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {entry.args.join(" ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
