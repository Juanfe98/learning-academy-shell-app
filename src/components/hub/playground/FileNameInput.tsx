"use client";

import { useEffect, useRef, useState } from "react";
import { validateFileName } from "@/lib/challenges/file-tree";

interface Props {
  type: "file" | "folder";
  depth: number;
  existingNames: string[];
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function FileNameInput({ type, depth, existingNames, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const err = validateFileName(value, existingNames);
      if (err) { setError(err); return; }
      onConfirm(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  function handleBlur() {
    // Small delay so click on another element doesn't race
    setTimeout(() => onCancel(), 120);
  }

  return (
    <div
      className="flex flex-col"
      style={{ paddingLeft: depth * 12 + 8 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={type === "file" ? "filename.jsx" : "folder-name"}
        className="w-full text-xs px-1.5 py-0.5 rounded font-mono outline-none"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent-primary)",
          color: "var(--text-primary)",
        }}
      />
      {error && (
        <span className="text-[10px] px-1 mt-0.5" style={{ color: "var(--error)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
