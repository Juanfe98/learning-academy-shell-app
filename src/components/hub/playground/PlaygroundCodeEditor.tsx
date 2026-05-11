"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";

interface Props {
  filename: string;
  value: string;
  onChange: (value: string) => void;
}

export default function PlaygroundCodeEditor({ filename, value, onChange }: Props) {
  const extensions = useMemo(() => {
    const theme = EditorView.theme({
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
    });
    return [javascript({ jsx: true }), theme];
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="px-3 py-1.5 shrink-0 text-[10px] font-semibold font-mono"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        {filename}
      </div>
      <CodeMirror
        value={value}
        onChange={onChange}
        height="100%"
        extensions={extensions as import("@codemirror/state").Extension[]}
        theme="dark"
        style={{ flex: 1, overflow: "hidden" }}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
      />
    </div>
  );
}
