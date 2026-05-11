"use client";

import { ChevronRight, FileCode, FileType, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/lib/challenges/file-tree";
import FileNameInput from "./FileNameInput";

const FILE_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  jsx: FileCode,
  js: FileCode,
  css: FileType,
};

interface Props {
  node: TreeNode;
  depth: number;
  activeFile: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  creating: { path: string; type: "file" | "folder" } | null;
  existingNamesAt: (folderPath: string) => string[];
  onCreateConfirm: (name: string) => void;
  onCreateCancel: () => void;
}

export default function FileTreeNode({
  node,
  depth,
  activeFile,
  expandedFolders,
  onToggleFolder,
  onFileSelect,
  onContextMenu,
  creating,
  existingNamesAt,
  onCreateConfirm,
  onCreateCancel,
}: Props) {
  const indent = depth * 12;

  if (node.kind === "file") {
    const Icon = FILE_ICON[node.language] ?? FileCode;
    const active = node.path === activeFile;
    return (
      <button
        onClick={() => onFileSelect(node.path)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left text-xs py-[3px] pr-2 transition-colors",
          active ? "text-primary" : "text-secondary hover:text-primary hover:bg-white/[0.04]"
        )}
        style={{
          paddingLeft: indent + 8,
          borderLeft: active ? "2px solid var(--accent-primary)" : "2px solid transparent",
          background: active ? "rgba(99,102,241,0.1)" : undefined,
        }}
      >
        <span style={{ display:"flex", flexShrink:0, color: active ? "var(--accent-primary)" : "var(--text-muted)" }}>
          <Icon size={12} />
        </span>
        <span className="font-mono truncate">{node.name}</span>
      </button>
    );
  }

  // Folder
  const expanded = expandedFolders.has(node.path);
  const isCreatingHere = creating?.path === node.path;

  return (
    <>
      <button
        onClick={() => onToggleFolder(node.path)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
        className="flex items-center gap-1.5 w-full text-left text-xs py-[3px] pr-2 transition-colors text-secondary hover:text-primary hover:bg-white/[0.04]"
        style={{ paddingLeft: indent + 8, borderLeft: "2px solid transparent" }}
      >
        <span style={{ display:"flex", flexShrink:0, transition:"transform 150ms", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", color:"var(--text-muted)" }}>
          <ChevronRight size={11} />
        </span>
        <span style={{ display:"flex", flexShrink:0, color:"#f59e0b" }}>
          {expanded ? <FolderOpen size={12} /> : <Folder size={12} />}
        </span>
        <span className="font-mono truncate">{node.name}</span>
      </button>

      {expanded && (
        <>
          {isCreatingHere && creating && (
            <FileNameInput
              type={creating.type}
              depth={depth + 1}
              existingNames={existingNamesAt(node.path)}
              onConfirm={onCreateConfirm}
              onCancel={onCreateCancel}
            />
          )}
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
              creating={creating}
              existingNamesAt={existingNamesAt}
              onCreateConfirm={onCreateConfirm}
              onCreateCancel={onCreateCancel}
            />
          ))}
        </>
      )}
    </>
  );
}
