"use client";

import { Terminal, Trash2 } from "lucide-react";
import type { ConsoleEntry } from "@/lib/challenges/types";

const LEVEL_COLOR: Record<string, string> = {
  log: "var(--text-secondary)",
  info: "#38bdf8",
  warn: "var(--warning)",
  error: "var(--error)",
};

const LEVEL_BG: Record<string, string> = {
  log: "transparent",
  info: "rgba(56,189,248,0.04)",
  warn: "rgba(245,158,11,0.06)",
  error: "rgba(239,68,68,0.08)",
};

interface Props {
  entries: ConsoleEntry[];
  onClear: () => void;
}

export default function PlaygroundConsolePanel({ entries, onClear }: Props) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          <Terminal size={11} />
          Console
          {entries.length > 0 && (
            <span
              className="px-1 rounded text-[10px] tabular-nums"
              style={{
                background: entries.some((e) => e.method === "error")
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(255,255,255,0.08)",
                color: entries.some((e) => e.method === "error")
                  ? "var(--error)"
                  : "var(--text-muted)",
              }}
            >
              {entries.length}
            </span>
          )}
        </span>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            title="Clear console"
            className="p-1 rounded transition-colors hover:bg-white/[0.06]"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            <Terminal size={16} />
            <p>Console output will appear here</p>
          </div>
        ) : (
          entries.slice(-200).map((entry) => (
            <div
              key={entry.id}
              className="flex gap-2 px-2 py-0.5 rounded"
              style={{ background: LEVEL_BG[entry.method] ?? "transparent" }}
            >
              <span
                className="shrink-0 select-none w-4 text-right"
                style={{ color: "var(--text-muted)" }}
              >
                {entry.method === "error" ? "✕" : entry.method === "warn" ? "⚠" : "›"}
              </span>
              <span
                style={{
                  color: LEVEL_COLOR[entry.method] ?? "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {entry.args.join(" ")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
