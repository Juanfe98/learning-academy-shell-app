"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { createSeHubTheme } from "@/lib/editor/theme";
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

const seHubTheme = createSeHubTheme("13px");

export default function CodeEditor({ language, value, onChange, className = "" }: CodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={seHubTheme}
      extensions={[langExtension[language]]}
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
