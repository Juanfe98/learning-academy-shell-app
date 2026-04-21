"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

type Language = "html" | "css";

interface CodeEditorProps {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const langExtension: Record<Language, Extension> = {
  html: html(),
  css: css(),
};

const seHubTheme = EditorView.theme({
  "&": {
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: "13px",
    height: "100%",
  },
  ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, monospace" },
  ".cm-gutters": {
    background: "var(--bg-surface)",
    border: "none",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    color: "var(--text-muted)",
  },
  ".cm-activeLineGutter": { background: "rgba(255,255,255,0.04)" },
  ".cm-activeLine": { background: "rgba(255,255,255,0.03)" },
  ".cm-cursor": { borderLeftColor: "#0ea5e9" },
  ".cm-selectionBackground": { background: "rgba(14,165,233,0.2) !important" },
  ".cm-focused .cm-selectionBackground": { background: "rgba(14,165,233,0.25) !important" },
  ".cm-matchingBracket": { background: "rgba(14,165,233,0.15)", outline: "none" },
});

export default function CodeEditor({ language, value, onChange, className = "" }: CodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[langExtension[language], seHubTheme]}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        autocompletion: true,
      }}
      className={className}
      style={{ height: "100%" }}
    />
  );
}
