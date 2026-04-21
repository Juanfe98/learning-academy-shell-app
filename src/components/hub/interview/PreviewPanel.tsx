"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor } from "lucide-react";

interface Props {
  srcdoc: string | null;
}

export default function PreviewPanel({ srcdoc }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!srcdoc || !iframeRef.current) return;
    setLoading(true);
    iframeRef.current.srcdoc = srcdoc;
  }, [srcdoc]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-elevated)" }}>
      {!srcdoc && (
        <div
          className="flex flex-col items-center justify-center h-full gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Monitor size={20} />
          <p className="text-xs">Preview will appear here</p>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && srcdoc && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "rgba(13,13,18,0.4)" }}
        />
      )}

      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        title="preview-sandbox"
        onLoad={() => setLoading(false)}
        style={{
          flex: 1,
          border: "none",
          display: srcdoc ? "block" : "none",
          background: "#fff",
        }}
      />
    </div>
  );
}
