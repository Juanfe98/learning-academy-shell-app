"use client";

import { useEffect, useRef } from "react";
import { FilePlus, FolderPlus, Trash2 } from "lucide-react";
import type { TreeNode } from "@/lib/challenges/file-tree";

interface Props {
  x: number;
  y: number;
  node: TreeNode;
  isSeed: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, node, isSeed, onNewFile, onNewFolder, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isFolder = node.kind === "folder";

  return (
    <div
      ref={ref}
      className="fixed z-50 py-1 rounded-lg text-xs shadow-xl"
      style={{
        left: x,
        top: y,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        minWidth: 160,
      }}
    >
      {isFolder && (
        <>
          <MenuItem icon={<FilePlus size={11} />} label="New File Here" onClick={() => { onClose(); onNewFile(); }} />
          <MenuItem icon={<FolderPlus size={11} />} label="New Folder Here" onClick={() => { onClose(); onNewFolder(); }} />
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 0" }} />
        </>
      )}
      <MenuItem
        icon={<Trash2 size={11} />}
        label="Delete"
        danger
        disabled={isSeed}
        title={isSeed ? "Seed file — cannot be deleted" : undefined}
        onClick={() => { onClose(); onDelete(); }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  disabled,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors"
      style={{
        color: disabled ? "var(--text-muted)" : danger ? "var(--error)" : "var(--text-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}
