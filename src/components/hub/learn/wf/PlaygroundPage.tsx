"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ListChecks, RefreshCw } from "lucide-react";
import { useProgressStore } from "@/lib/store";
import { WF_MODULES } from "@/modules/web-fundamentals/data";
import type { Challenge } from "@/modules/web-fundamentals/data";

const CodeEditor = dynamic(() => import("./CodeEditor"), { ssr: false });

const DEFAULT_HTML = `<div class="card">
  <h1>Hello, Playground!</h1>
  <p>Edit the HTML and CSS panels to see a live preview.</p>
  <button>Click me</button>
</div>`;

const DEFAULT_CSS = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f3f4f6;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

h1 { margin-bottom: 0.5rem; font-size: 1.5rem; }
p  { color: #6b7280; margin-bottom: 1.5rem; }

button {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
button:hover { background: #4f46e5; }`;

const ACCENT = "#0ea5e9";

// All challenges across all modules (flat list for the picker)
const ALL_CHALLENGES: Challenge[] = WF_MODULES.flatMap((m) => m.challenges);

const CSS_PLACEHOLDER = `/* Your solution CSS goes here */`;

function buildPreview(html: string, css: string) {
  // Full HTML document — inject CSS into existing <head> rather than double-wrapping
  if (/^\s*<!doctype/i.test(html) || /^\s*<html/i.test(html)) {
    const injection = css.trim() && css.trim() !== CSS_PLACEHOLDER
      ? `<style>\n${css}\n</style>`
      : "";
    return html.includes("</head>")
      ? html.replace("</head>", `${injection}</head>`)
      : html;
  }
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${css}</style>
</head>
<body>${html}</body>
</html>`;
}

interface PlaygroundPageProps {
  challengeId?: string;
}

export default function PlaygroundPage({ challengeId }: PlaygroundPageProps) {
  const initialChallenge = useMemo(
    () => (challengeId ? ALL_CHALLENGES.find((c) => c.id === challengeId) ?? null : null),
    [challengeId]
  );

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(initialChallenge);
  const [html, setHtml] = useState(initialChallenge?.starterHtml ?? DEFAULT_HTML);
  const [css, setCss] = useState(initialChallenge ? (initialChallenge.starterCss ?? CSS_PLACEHOLDER) : DEFAULT_CSS);
  const [preview, setPreview] = useState(() => {
    const initHtml = initialChallenge?.starterHtml ?? DEFAULT_HTML;
    const initCss = initialChallenge ? (initialChallenge.starterCss ?? CSS_PLACEHOLDER) : DEFAULT_CSS;
    return buildPreview(initHtml, initCss);
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(!!initialChallenge);
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markModuleVisited = useProgressStore((s) => s.markModuleVisited);
  const markModuleComplete = useProgressStore((s) => s.markModuleComplete);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !activeChallenge) return;
    const slug = `challenge/${activeChallenge.id}`;
    const snap = useProgressStore.getState().academies;
    setCompleted(snap["web-fundamentals"]?.modules?.[slug]?.completed === true);
    markModuleVisited("web-fundamentals", slug, activeChallenge.title, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, activeChallenge?.id]);

  const schedulePreviewUpdate = useCallback((newHtml: string, newCss: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreview(buildPreview(newHtml, newCss));
    }, 300);
  }, []);

  function handleHtmlChange(val: string) {
    setHtml(val);
    schedulePreviewUpdate(val, css);
  }

  function handleCssChange(val: string) {
    setCss(val);
    schedulePreviewUpdate(html, val);
  }

  function handleReset() {
    const newHtml = activeChallenge?.starterHtml ?? DEFAULT_HTML;
    const newCss = activeChallenge ? (activeChallenge.starterCss ?? CSS_PLACEHOLDER) : DEFAULT_CSS;
    setHtml(newHtml);
    setCss(newCss);
    setPreview(buildPreview(newHtml, newCss));
  }

  function handleSelectChallenge(challenge: Challenge | null) {
    setActiveChallenge(challenge);
    setCompleted(false);
    setDescOpen(!!challenge);
    const newHtml = challenge?.starterHtml ?? DEFAULT_HTML;
    const newCss = challenge ? (challenge.starterCss ?? CSS_PLACEHOLDER) : DEFAULT_CSS;
    setHtml(newHtml);
    setCss(newCss);
    setPreview(buildPreview(newHtml, newCss));
    setPickerOpen(false);
  }

  function handleMarkComplete() {
    if (!activeChallenge) return;
    markModuleComplete("web-fundamentals", `challenge/${activeChallenge.id}`);
    setCompleted(true);
  }

  const pickerLabel = activeChallenge ? activeChallenge.title : "Free Play";

  return (
    <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 h-12 shrink-0 z-10"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Challenge picker */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-secondary hover:text-primary transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <span className="max-w-[180px] truncate">{pickerLabel}</span>
            <ChevronDown size={13} className={`transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
          </button>

          {pickerOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-72 rounded-xl overflow-hidden shadow-xl z-50"
              style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="py-1 max-h-80 overflow-y-auto">
                <button
                  onClick={() => handleSelectChallenge(null)}
                  className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:bg-white/[0.04] transition-colors"
                >
                  Free Play
                </button>
                {WF_MODULES.filter((m) => m.challenges.length > 0).map((mod) => (
                  <div key={mod.id}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {mod.title}
                    </div>
                    {mod.challenges.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectChallenge(c)}
                        className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
                      >
                        <span className="text-sm text-secondary truncate">{c.title}</span>
                        <span
                          className="text-[10px] font-medium shrink-0 ml-2"
                          style={{ color: c.difficulty === "easy" ? "#22c55e" : c.difficulty === "medium" ? "#f59e0b" : "#ef4444" }}
                        >
                          {c.difficulty}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brief toggle — only when a challenge is active */}
        {activeChallenge && (
          <button
            onClick={() => setDescOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: descOpen ? `${ACCENT}15` : "rgba(255,255,255,0.05)",
              border: `1px solid ${descOpen ? `${ACCENT}40` : "rgba(255,255,255,0.09)"}`,
              color: descOpen ? ACCENT : "var(--text-secondary)",
            }}
          >
            <ListChecks size={13} />
            Brief
            <ChevronDown size={11} className={`transition-transform duration-200 ${descOpen ? "rotate-180" : ""}`} />
          </button>
        )}

        <div className="flex-1" />

        {/* Mark complete (only when a challenge is loaded and not yet done) */}
        {mounted && activeChallenge && !completed && (
          <button
            onClick={handleMarkComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--success)" }}
          >
            <CheckCircle2 size={12} />
            Mark Complete
          </button>
        )}

        {mounted && activeChallenge && completed && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--success)" }}
          >
            <CheckCircle2 size={12} />
            Completed
          </div>
        )}

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-secondary transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <RefreshCw size={12} />
          Reset
        </button>
      </div>

      {/* Challenge description panel */}
      <AnimatePresence initial={false}>
        {descOpen && activeChallenge && (
          <motion.div
            key="desc-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden", background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="px-5 py-3 flex flex-col gap-2">
              {/* Title + difficulty */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">{activeChallenge.title}</span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    color: activeChallenge.difficulty === "easy" ? "#22c55e" : activeChallenge.difficulty === "medium" ? "#f59e0b" : "#ef4444",
                    background: activeChallenge.difficulty === "easy" ? "rgba(34,197,94,0.1)" : activeChallenge.difficulty === "medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                  }}
                >
                  {activeChallenge.difficulty}
                </span>
              </div>
              {/* Description */}
              <p className="text-xs text-secondary leading-relaxed">{activeChallenge.description}</p>
              {activeChallenge.targetImage && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <img
                    src={activeChallenge.targetImage.src}
                    alt={activeChallenge.targetImage.alt}
                    className="block w-full h-auto"
                  />
                </div>
              )}
              {/* Requirements */}
              {activeChallenge.requirements.length > 0 && (
                <ul className="flex flex-wrap gap-x-5 gap-y-1">
                  {activeChallenge.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted leading-snug">
                      <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-muted opacity-60" />
                      {req}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor + preview panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* HTML panel */}
        <div className="flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest shrink-0"
            style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)", color: ACCENT }}
          >
            HTML
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor language="html" value={html} onChange={handleHtmlChange} />
          </div>
        </div>

        {/* CSS panel */}
        <div className="flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest shrink-0"
            style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#a78bfa" }}
          >
            CSS
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor language="css" value={css} onChange={handleCssChange} />
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex flex-col overflow-hidden">
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest shrink-0"
            style={{ background: "var(--bg-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#22c55e" }}
          >
            Preview
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <iframe
              srcDoc={preview}
              sandbox="allow-scripts"
              title="Live preview"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
