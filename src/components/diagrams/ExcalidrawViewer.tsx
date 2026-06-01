"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const ExcalidrawComp = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

interface ExcalidrawData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

interface ExcalidrawViewerProps {
  data: ExcalidrawData;
  title?: string;
  caption?: string;
  height?: number;
}

export default function ExcalidrawViewer({
  data,
  title,
  caption,
  height = 520,
}: ExcalidrawViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }

  return (
    <figure
      style={{
        margin: "1.75rem 0",
        borderRadius: "18px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {(title || caption) && (
        <div
          style={{
            padding: "1rem 1rem 0.85rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 34%)",
          }}
        >
          {title && (
            <div
              style={{
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontWeight: 700,
                marginBottom: caption ? "0.35rem" : 0,
              }}
            >
              {title}
            </div>
          )}
          {caption && (
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              {caption}
            </div>
          )}
        </div>
      )}

      {/* toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "0.45rem 0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(15,23,42,0.9)",
            color: "var(--text-primary)",
            borderRadius: "999px",
            padding: "0.35rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
          aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ height: isFullscreen ? "100vh" : height, background: "#0c0c14" }}
      >
        <ExcalidrawComp
          initialData={{
            elements: data.elements,
            appState: {
              viewBackgroundColor: "#0c0c14",
              theme: "dark",
              ...(data.appState ?? {}),
            },
            scrollToContent: true,
          }}
          viewModeEnabled
          zenModeEnabled
          gridModeEnabled={false}
        />
      </div>
    </figure>
  );
}
