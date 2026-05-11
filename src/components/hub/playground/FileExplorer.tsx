"use client";

import { FileCode, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChallengeFile } from "@/lib/challenges/types";

interface Props {
  files: ChallengeFile[];
  activeFile: string;
  onFileSelect: (filename: string) => void;
}

const EXT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  jsx: FileCode,
  js: FileCode,
  css: FileType,
};

export default function FileExplorer({ files, activeFile, onFileSelect }: Props) {
  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        Files
      </div>
      <div className="flex flex-col">
        {files.map((file) => {
          const Icon = EXT_ICON[file.language] ?? FileCode;
          const active = file.filename === activeFile;
          return (
            <button
              key={file.filename}
              onClick={() => onFileSelect(file.filename)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                active
                  ? "text-primary"
                  : "text-secondary hover:text-primary hover:bg-white/[0.04]"
              )}
              style={
                active
                  ? {
                      background: "rgba(99,102,241,0.1)",
                      borderLeft: "2px solid var(--accent-primary)",
                    }
                  : { borderLeft: "2px solid transparent" }
              }
            >
              <Icon size={12} />
              <span className="font-mono">{file.filename}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
