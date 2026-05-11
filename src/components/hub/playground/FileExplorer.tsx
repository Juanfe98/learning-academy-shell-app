"use client";

import { useState, useMemo } from "react";
import { FilePlus, FolderPlus } from "lucide-react";
import { buildTree, getDepth, type FileMap, type TreeNode } from "@/lib/challenges/file-tree";
import FileTreeNode from "./FileTreeNode";
import FileNameInput from "./FileNameInput";
import ContextMenu from "./ContextMenu";

const MAX_USER_FILES = 20;

interface Props {
  fileMap: FileMap;
  folders: string[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, filename: string) => void;
  onCreateFolder: (parentPath: string, foldername: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (folderPath: string) => void;
}

interface CreatingState {
  path: string;        // parent folder path, "." for root
  type: "file" | "folder";
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
}

export default function FileExplorer({
  fileMap,
  folders,
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const tree = useMemo(() => buildTree(fileMap, folders), [fileMap, folders]);

  const userFileCount = useMemo(
    () => Object.values(fileMap).filter((e) => !e.seed).length,
    [fileMap]
  );
  const atFileLimit = userFileCount >= MAX_USER_FILES;

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function startCreate(parentPath: string, type: "file" | "folder") {
    if (parentPath !== "." && !expandedFolders.has(parentPath)) {
      setExpandedFolders((prev) => new Set([...prev, parentPath]));
    }
    setCreating({ path: parentPath, type });
  }

  function existingNamesAt(parentPath: string): string[] {
    const prefix = parentPath === "." ? "./" : parentPath + "/";
    const names: string[] = [];
    for (const path of Object.keys(fileMap)) {
      if (parentPath === ".") {
        const rel = path.replace(/^\.\//, "");
        if (!rel.includes("/")) names.push(rel);
      } else {
        if (path.startsWith(prefix)) {
          const rest = path.slice(prefix.length);
          if (!rest.includes("/")) names.push(rest);
        }
      }
    }
    for (const f of folders) {
      if (parentPath === ".") {
        const rel = f.replace(/^\.\//, "");
        if (!rel.includes("/")) names.push(rel);
      } else if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        if (!rest.includes("/")) names.push(rest);
      }
    }
    return names;
  }

  function handleCreateConfirm(name: string) {
    if (!creating) return;
    const parent = creating.path;
    if (creating.type === "file") {
      const base = parent === "." ? "./" : parent + "/";
      onCreateFile(parent, base + name);
    } else {
      const base = parent === "." ? "./" : parent + "/";
      onCreateFolder(parent, base + name);
    }
    setCreating(null);
  }

  function handleDelete(node: TreeNode) {
    if (node.kind === "file") {
      if (!window.confirm(`Delete "${node.name}"? This cannot be undone.`)) return;
      onDeleteFile(node.path);
    } else {
      if (!window.confirm(`Delete folder "${node.name}" and all its contents? This cannot be undone.`)) return;
      onDeleteFolder(node.path);
    }
  }

  function handleContextMenu(e: React.MouseEvent, node: TreeNode) {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }

  return (
    <div
      className="flex flex-col shrink-0 select-none"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Header + toolbar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => !atFileLimit && startCreate(".", "file")}
            title={atFileLimit ? "File limit reached (20 max)" : "New File"}
            disabled={atFileLimit}
            className="p-1 rounded transition-colors disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => !atFileLimit && ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            <FilePlus size={13} />
          </button>
          <button
            onClick={() => startCreate(".", "folder")}
            title="New Folder"
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex flex-col py-1 overflow-y-auto" style={{ maxHeight: 240 }}>
        {creating?.path === "." && (
          <FileNameInput
            type={creating.type}
            depth={0}
            existingNames={existingNamesAt(".")}
            onConfirm={handleCreateConfirm}
            onCancel={() => setCreating(null)}
          />
        )}
        {tree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onFileSelect={onFileSelect}
            onContextMenu={handleContextMenu}
            creating={creating}
            existingNamesAt={existingNamesAt}
            onCreateConfirm={handleCreateConfirm}
            onCreateCancel={() => setCreating(null)}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          isSeed={contextMenu.node.kind === "file" && !!fileMap[contextMenu.node.path]?.seed}
          onNewFile={() => {
            if (!atFileLimit) startCreate(contextMenu.node.path, "file");
          }}
          onNewFolder={() => {
            const depth = getDepth(contextMenu.node.path);
            if (depth < 3) startCreate(contextMenu.node.path, "folder");
          }}
          onDelete={() => handleDelete(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
