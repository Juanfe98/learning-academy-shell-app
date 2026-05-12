"use client";

import { CheckCircle, XCircle, FlaskConical } from "lucide-react";
import type { TestResult } from "@/lib/challenges/types";

interface Props {
  results: TestResult[] | null;
  running: boolean;
  onRun: () => void;
}

export default function PlaygroundTestPanel({ results, running, onRun }: Props) {
  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = results?.length ?? 0;
  const allPassed = results !== null && total > 0 && passed === total;

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        maxHeight: 280,
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{
          background: "var(--bg-surface)",
          borderBottom: results !== null ? "1px solid var(--border-subtle)" : undefined,
        }}
      >
        <div className="flex items-center gap-1.5">
          <FlaskConical size={11} style={{ color: "var(--text-muted)" }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Tests
            {results !== null && (
              <span
                className="ml-2 normal-case tracking-normal font-mono"
                style={{ color: allPassed ? "var(--success)" : "var(--error)" }}
              >
                {passed}/{total}
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "var(--accent-secondary)",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running…" : "Run Tests"}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
          {allPassed && (
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-1"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <CheckCircle size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>
                All tests passed!
              </span>
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              className="px-2 py-1.5 rounded text-[11px]"
              style={{
                background: r.pass ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.05)",
                borderLeft: `2px solid ${r.pass ? "var(--success)" : "var(--error)"}`,
              }}
            >
              <div className="flex items-center gap-1.5">
                {r.pass ? (
                  <CheckCircle size={11} style={{ color: "var(--success)", flexShrink: 0 }} />
                ) : (
                  <XCircle size={11} style={{ color: "var(--error)", flexShrink: 0 }} />
                )}
                <span style={{ color: r.pass ? "var(--text-secondary)" : "var(--error)" }}>
                  {r.description}
                </span>
              </div>
              {r.error && (
                <p
                  className="mt-1 pl-5 font-mono text-[10px] leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {r.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
