"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Clock, Play, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { Badge } from "@/components/ui";
import OutputPanel from "./OutputPanel";
import { buildSrcdoc, buildExecSrcdoc, buildPreviewSrcdoc } from "@/lib/interview/build-srcdoc";
import { useProgressStore } from "@/lib/store";
import type { ReactChallenge } from "@/modules/react-interview/data/types";

const CodeMirrorEditor = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "default"> = {
  easy: "success",
  medium: "warning",
  hard: "default",
};

interface Props {
  challenge: ReactChallenge;
  trackId: string;
}

function elapsed(start: number) {
  const secs = Math.floor((Date.now() - start) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function transpileWithBabel(code: string): Promise<string> {
  const Babel = await import("@babel/standalone");
  const result = Babel.transform(code, {
    presets: [
      "react",
      "typescript",
      ["env", { targets: { browsers: "last 2 versions" }, modules: "umd" }],
    ],
    filename: "challenge.tsx",
  });
  if (!result.code) throw new Error("Babel produced no output");
  return result.code;
}

export default function ChallengeEditor({ challenge, trackId }: Props) {
  const [code, setCode] = useState(challenge.starterCode);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [execSrcdoc, setExecSrcdoc] = useState<string | null>(null);
  const [previewSrcdoc, setPreviewSrcdoc] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const showConsole = trackId === "typescript";
  const showPreview = trackId === "react";
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [hintsOpen, setHintsOpen] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [timerDisplay, setTimerDisplay] = useState("0:00");
  const [completed, setCompleted] = useState(false);
  const extensions = useMemo(() => {
    const seHubTheme = EditorView.theme({
      "&": { background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "13px", height: "100%" },
      ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, monospace" },
      ".cm-gutters": { background: "var(--bg-surface)", border: "none", borderRight: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" },
      ".cm-activeLineGutter": { background: "rgba(255,255,255,0.04)" },
      ".cm-activeLine": { background: "rgba(255,255,255,0.03)" },
      ".cm-cursor": { borderLeftColor: "#0ea5e9" },
      ".cm-selectionBackground": { background: "rgba(14,165,233,0.2) !important" },
      ".cm-focused .cm-selectionBackground": { background: "rgba(14,165,233,0.25) !important" },
    });
    return [javascript({ jsx: true }), seHubTheme];
  }, []);

  const markVisited = useProgressStore((s) => s.markModuleVisited);
  const markComplete = useProgressStore((s) => s.markModuleComplete);
  const getStatus = useProgressStore((s) => s.getModuleStatus);

  useEffect(() => {
    const status = getStatus("react-interview", `challenge/${challenge.id}`);
    if (status === "completed") setCompleted(true);
    markVisited("react-interview", `challenge/${challenge.id}`, challenge.title, challenge.estimatedMinutes);
  }, [challenge.id, challenge.title, challenge.estimatedMinutes, markVisited, getStatus]);

  useEffect(() => {
    const id = setInterval(() => setTimerDisplay(elapsed(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const runTests = useCallback(async () => {
    setRunning(true);
    try {
      const allTests = challenge.tests.map((t) => t.code).join("\n");
      const fullCode = `${code}\n// --- tests ---\n${allTests}`;
      const transpiled = await transpileWithBabel(fullCode);
      setSrcdoc(buildSrcdoc(transpiled));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSrcdoc(
        buildSrcdoc(
          `window.parent.postMessage({ type: "TRANSPILE_ERROR", message: ${JSON.stringify(msg)} }, "*");`
        )
      );
    }
    setRunning(false);
  }, [code, challenge.tests]);

  // Debounced preview — rebuilds 800ms after user stops typing
  useEffect(() => {
    if (!showPreview) return;
    const MOUNT = `;(function(){
      try {
        var _r=document.getElementById("root");
        var _c=typeof App!=="undefined"?App:typeof Demo!=="undefined"?Demo:null;
        if(_c){ReactDOM.render(React.createElement(_c),_r);}
        else{_r.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#888;font-size:13px">Define an <code style="margin:0 4px;background:#f0f0f0;padding:2px 5px;border-radius:3px">App</code> component to see the preview</div>';}
      }catch(e){document.getElementById("root").innerHTML='<div style="padding:12px;font-family:monospace;color:#ef4444;font-size:12px">'+(e&&e.message?e.message:String(e))+"</div>";}
    })();`;
    const id = setTimeout(async () => {
      try {
        const transpiled = await transpileWithBabel(code + "\n" + MOUNT);
        setPreviewSrcdoc(buildPreviewSrcdoc(transpiled));
      } catch {
        // silent — syntax errors while typing are expected
      }
    }, 800);
    return () => clearTimeout(id);
  }, [code, showPreview]);

  const execute = useCallback(async () => {
    setExecuting(true);
    try {
      const transpiled = await transpileWithBabel(code);
      setExecSrcdoc(buildExecSrcdoc(transpiled));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecSrcdoc(buildExecSrcdoc(
        `console.error(${JSON.stringify(msg)});`
      ));
    }
    setExecuting(false);
  }, [code]);

  function handleComplete() {
    markComplete("react-interview", `challenge/${challenge.id}`);
    setCompleted(true);
  }

  function revealNextHint() {
    const next = revealedHints.size;
    if (next < challenge.hints.length) {
      setRevealedHints((prev) => new Set([...prev, next]));
    }
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0 z-10"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link
          href={`/interview/${trackId}`}
          className="flex items-center gap-1.5 text-muted hover:text-secondary transition-colors text-xs"
        >
          <ArrowLeft size={13} />
          Back
        </Link>
        <span className="w-px h-4 bg-border-subtle" />
        <h1 className="text-sm font-semibold text-primary truncate flex-1">{challenge.title}</h1>
        <Badge variant={DIFFICULTY_VARIANT[challenge.difficulty]}>
          {challenge.difficulty}
        </Badge>
        <div className="flex items-center gap-1 text-muted text-xs tabular-nums ml-1">
          <Clock size={11} />
          {timerDisplay}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — description */}
        <div
          className="w-[360px] shrink-0 flex flex-col overflow-y-auto"
          style={{
            background: "var(--bg-surface)",
            borderRight: "1px solid var(--border-subtle)",
          }}
        >
          <div className="p-5 space-y-5">
            {/* Description */}
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                Problem
              </h2>
              <p className="text-sm text-secondary leading-relaxed">{challenge.description}</p>
            </section>

            {/* Concepts */}
            {challenge.concepts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                  Concepts
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {challenge.concepts.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        color: "var(--accent-secondary)",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Hints */}
            {challenge.hints.length > 0 && (
              <section>
                <button
                  onClick={() => setHintsOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-widest hover:text-secondary transition-colors"
                >
                  Hints ({revealedHints.size}/{challenge.hints.length})
                  <ChevronDown
                    size={12}
                    className="transition-transform"
                    style={{ transform: hintsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                <AnimatePresence>
                  {hintsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="mt-2 space-y-2">
                        {challenge.hints.slice(0, revealedHints.size).map((hint, i) => (
                          <div
                            key={i}
                            className="text-xs text-secondary p-2.5 rounded-lg leading-relaxed"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <span className="font-semibold text-muted mr-1">#{i + 1}</span>
                            {hint}
                          </div>
                        ))}
                        {revealedHints.size < challenge.hints.length && (
                          <button
                            onClick={revealNextHint}
                            className="text-xs text-accent hover:text-accent-secondary transition-colors px-2 py-1 rounded"
                            style={{
                              background: "rgba(99,102,241,0.08)",
                              border: "1px solid rgba(99,102,241,0.2)",
                            }}
                          >
                            Reveal hint #{revealedHints.size + 1}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
          </div>
        </div>

        {/* Right panel — editor + test runner */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Code editor */}
          <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: "60%" }}>
            <CodeMirrorEditor
              value={code}
              onChange={setCode}
              height="100%"
              extensions={extensions as import("@codemirror/state").Extension[]}
              theme="dark"
              style={{ height: "100%", fontSize: 13 }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
              }}
            />
          </div>

          {/* Divider + controls */}
          <div
            className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{
              background: "var(--bg-elevated)",
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span className="text-xs text-muted font-semibold uppercase tracking-widest">
              Test Results
            </span>
            <div className="flex items-center gap-2">
              {completed && (
                <span
                  className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    color: "var(--success)",
                  }}
                >
                  <CheckCircle2 size={11} />
                  Completed
                </span>
              )}
              {!completed && (
                <button
                  onClick={handleComplete}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    color: "var(--success)",
                  }}
                >
                  Mark Complete
                </button>
              )}
              {showConsole && (
                <button
                  onClick={execute}
                  disabled={executing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#10b981",
                  }}
                >
                  <Play size={11} />
                  {executing ? "Running…" : "Execute"}
                </button>
              )}
              <button
                onClick={runTests}
                disabled={running}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.35)",
                  color: "var(--accent-secondary)",
                }}
              >
                <Play size={11} />
                {running ? "Running…" : "Run Tests"}
              </button>
            </div>
          </div>

          {/* Output panel (Tests / Console / Preview tabs) */}
          <div className="shrink-0" style={{ height: "35%" }}>
            <OutputPanel
              srcdoc={srcdoc}
              execSrcdoc={execSrcdoc}
              previewSrcdoc={previewSrcdoc}
              showConsole={showConsole}
              showPreview={showPreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
