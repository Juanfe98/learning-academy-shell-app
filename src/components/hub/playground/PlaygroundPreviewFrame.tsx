"use client";

import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";
import type { ConsoleEntry } from "@/lib/challenges/types";

interface Props {
  srcdoc: string | null;
  onConsoleMessage: (entry: ConsoleEntry) => void;
}

export default function PlaygroundPreviewFrame({ srcdoc, onConsoleMessage }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "PLAYGROUND_CONSOLE") {
        onConsoleMessage({
          id: crypto.randomUUID(),
          method: e.data.method,
          args: e.data.args,
          timestamp: e.data.timestamp ?? Date.now(),
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onConsoleMessage]);

  useEffect(() => {
    if (!iframeRef.current) return;
    iframeRef.current.srcdoc = srcdoc ?? "";
  }, [srcdoc]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div
        className="px-3 py-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5"
        style={{
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Monitor size={11} />
        Preview
      </div>

      {!srcdoc ? (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Monitor size={20} />
          <p className="text-xs">Preview will appear here</p>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          title="playground-preview"
          style={{ flex: 1, border: "none", background: "#fff" }}
        />
      )}
    </div>
  );
}
