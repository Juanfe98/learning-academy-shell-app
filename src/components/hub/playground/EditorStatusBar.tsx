"use client";

import { memo } from "react";

export function getLanguageLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "tsx" || ext === "ts") return "TypeScript";
  if (ext === "jsx" || ext === "js") return "JavaScript";
  if (ext === "css") return "CSS";
  return "Plain Text";
}

interface EditorStatusBarProps {
  line: number;
  col: number;
  language: string;
  errors: number;
  warnings: number;
}

function EditorStatusBar({ line, col, language, errors, warnings }: EditorStatusBarProps) {
  return (
    <div
      className="flex items-center justify-between shrink-0 px-3"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        height: 22,
        fontSize: 11,
        fontFamily: "ui-monospace, monospace",
        color: "var(--text-muted)",
      }}
    >
      <span>Ln {line}, Col {col}</span>

      <div className="flex items-center gap-3">
        {errors > 0 && (
          <span style={{ color: "var(--error)" }}>⨯ {errors}</span>
        )}
        {warnings > 0 && (
          <span style={{ color: "var(--warning)" }}>⚠ {warnings}</span>
        )}
        <span style={{ color: "var(--text-secondary)" }}>{language}</span>
      </div>
    </div>
  );
}

export default memo(EditorStatusBar);
