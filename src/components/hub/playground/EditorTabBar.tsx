"use client";

import { memo, useMemo } from "react";

type TabLanguage = "tsx" | "ts" | "jsx" | "js" | "css" | "other";

interface Tab {
  path: string;
  label: string;
  isActive: boolean;
  language: TabLanguage;
}

interface EditorTabBarProps {
  openTabs: string[];
  activeFile: string;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}

const LANG_COLORS: Record<TabLanguage, string> = {
  tsx: "#61DAFB",
  ts:  "#3178C6",
  jsx: "#F7DF1E",
  js:  "#F7DF1E",
  css: "#A259FF",
  other: "#6B7280",
};

function getFileLanguage(path: string): TabLanguage {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "tsx") return "tsx";
  if (ext === "ts")  return "ts";
  if (ext === "jsx") return "jsx";
  if (ext === "js")  return "js";
  if (ext === "css") return "css";
  return "other";
}

function getTabLabel(path: string): string {
  const name = path.replace(/^\.\//, "").split("/").pop() ?? path;
  return name.length > 18 ? name.slice(0, 17) + "…" : name;
}

function toTab(path: string, activeFile: string): Tab {
  return {
    path,
    label: getTabLabel(path),
    isActive: path === activeFile,
    language: getFileLanguage(path),
  };
}

function EditorTabBar({ openTabs, activeFile, onTabSelect, onTabClose }: EditorTabBarProps) {
  const tabs = useMemo(
    () => openTabs.map((p) => toTab(p, activeFile)),
    [openTabs, activeFile]
  );

  const showClose = openTabs.length > 1;

  return (
    <div
      className="flex items-stretch shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        height: 34,
        overflowX: "auto",
        scrollbarWidth: "none",
        flexWrap: "nowrap",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => onTabSelect(tab.path)}
          title={tab.path.replace(/^\.\//, "")}
          className="flex items-center gap-1.5 shrink-0 px-3 transition-colors"
          style={{
            color: tab.isActive ? "var(--text-primary)" : "var(--text-muted)",
            borderBottom: tab.isActive
              ? "2px solid var(--accent-primary)"
              : "2px solid transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            background: tab.isActive ? "rgba(255,255,255,0.04)" : "transparent",
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: LANG_COLORS[tab.language],
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span>{tab.label}</span>
          {showClose && (
            <span
              role="button"
              aria-label={`Close ${tab.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              className="flex items-center justify-center rounded"
              style={{
                width: 14,
                height: 14,
                fontSize: 12,
                lineHeight: 1,
                color: "var(--text-muted)",
                marginLeft: 2,
                flexShrink: 0,
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
              }
            >
              ×
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default memo(EditorTabBar);
