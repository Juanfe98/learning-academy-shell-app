import { vscodeDarkInit } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import type { Extension } from "@codemirror/state";

export function createSeHubTheme(fontSize = "13px"): Extension {
  const base = vscodeDarkInit({
    settings: {
      background: "var(--bg-elevated)",
      caret: "#0ea5e9",
      selection: "rgba(14,165,233,0.2)",
      selectionMatch: "rgba(14,165,233,0.1)",
      lineHighlight: "rgba(255,255,255,0.03)",
      gutterBackground: "var(--bg-surface)",
      gutterForeground: "var(--text-muted)",
      gutterActiveForeground: "var(--text-secondary)",
      fontFamily: "ui-monospace, monospace",
    },
  });

  const overrides = EditorView.theme({
    "&": { fontSize },
    ".cm-gutters": {
      border: "none",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    ".cm-activeLineGutter": { background: "rgba(255,255,255,0.04)" },
    ".cm-matchingBracket": {
      background: "rgba(14,165,233,0.15)",
      outline: "none",
    },
  });

  return [base, overrides];
}

export function getLanguageExtension(filename: string): Extension {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "css") return css();
  if (ext === "html" || ext === "htm") return html();
  return javascript({ jsx: true, typescript: ext === "ts" || ext === "tsx" });
}
