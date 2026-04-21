"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2, Play } from "lucide-react";

interface TestResult {
  description: string;
  pass: boolean;
  error?: string;
}

interface TestRunnerProps {
  srcdoc: string | null;
  onComplete?: (passed: number, total: number) => void;
}

export default function TestRunner({ srcdoc, onComplete }: TestRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [transpileError, setTranspileError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "TEST_RESULTS") {
        const r: TestResult[] = event.data.results;
        setResults(r);
        setRunning(false);
        setHasRun(true);
        setTranspileError(null);
        const passed = r.filter((x) => x.pass).length;
        onComplete?.(passed, r.length);
      } else if (event.data?.type === "TRANSPILE_ERROR") {
        setTranspileError(event.data.message);
        setRunning(false);
        setHasRun(true);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete]);

  useEffect(() => {
    if (!srcdoc || !iframeRef.current) return;
    setRunning(true);
    setResults([]);
    setTranspileError(null);
    iframeRef.current.srcdoc = srcdoc;
  }, [srcdoc]);

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      {/* Hidden sandbox iframe */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ display: "none" }}
        title="test-runner-sandbox"
      />

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {!hasRun && !running && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
            <Play size={20} />
            <p className="text-xs">Click Run Tests to execute</p>
          </div>
        )}

        {running && (
          <div className="flex items-center justify-center h-full gap-2 text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Running tests…</span>
          </div>
        )}

        {transpileError && (
          <div
            className="rounded-lg p-3 text-xs font-mono whitespace-pre-wrap"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--error)",
            }}
          >
            <p className="font-semibold mb-1">Syntax error</p>
            {transpileError}
          </div>
        )}

        {!running && !transpileError && results.length > 0 && (
          <>
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold mb-2"
              style={{
                background:
                  passed === total
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(239,68,68,0.08)",
                border:
                  passed === total
                    ? "1px solid rgba(34,197,94,0.25)"
                    : "1px solid rgba(239,68,68,0.25)",
                color: passed === total ? "var(--success)" : "var(--error)",
              }}
            >
              <span>
                {passed === total ? "All tests passed" : `${passed} / ${total} passed`}
              </span>
              <span>
                {passed}/{total}
              </span>
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                className="flex gap-2 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: r.pass
                    ? "rgba(34,197,94,0.04)"
                    : "rgba(239,68,68,0.06)",
                  border: r.pass
                    ? "1px solid rgba(34,197,94,0.12)"
                    : "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {r.pass ? (
                  <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                ) : (
                  <XCircle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className="leading-tight"
                    style={{ color: r.pass ? "var(--text-secondary)" : "var(--text-primary)" }}
                  >
                    {r.description}
                  </span>
                  {r.error && (
                    <span
                      className="font-mono text-[10px] leading-tight break-all"
                      style={{ color: "var(--error)" }}
                    >
                      {r.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
