"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { createSeHubTheme, getLanguageExtension } from "@/lib/editor/theme";

interface Props {
  filename: string;
  value: string;
  onChange: (value: string) => void;
}

const editorTheme = createSeHubTheme("16px");

export default function PlaygroundCodeEditor({ filename, value, onChange }: Props) {
  const langExtension = useMemo(() => getLanguageExtension(filename), [filename]);

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
        theme={editorTheme}
        extensions={[langExtension]}
        style={{ flex: 1, overflow: "hidden" }}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
      />
    </div>
  );
}
