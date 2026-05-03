"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Skeleton } from "@/components/ui";
import { MERMAID_CONFIG } from "@/lib/mermaid";

type MermaidModule = typeof import("mermaid");

const MIN_SCALE = 0.65;
const MAX_SCALE = 2.4;
const ZOOM_STEP = 0.18;

let mermaidLoader: Promise<MermaidModule["default"]> | null = null;

async function loadMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((mod) => {
      mod.default.initialize(MERMAID_CONFIG);
      return mod.default;
    });
  }

  return mermaidLoader;
}

interface MermaidDiagramProps {
  chart: string;
  title?: string;
  caption?: string;
  minHeight?: number;
}

export default function MermaidDiagram({
  chart,
  title,
  caption,
  minHeight = 420,
}: MermaidDiagramProps) {
  const id = useId().replace(/[:]/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  function clampScale(nextScale: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  }

  function applyTransform(nextScale: number, nextOffset: { x: number; y: number }) {
    const svg = containerRef.current?.querySelector("svg");

    if (!svg) return;

    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.maxWidth = "none";
    svg.style.height = "auto";
    svg.style.transformOrigin = "top left";
    svg.style.transform = `translate(${nextOffset.x}px, ${nextOffset.y}px) scale(${nextScale})`;
    svg.style.transition = dragStateRef.current ? "none" : "transform 160ms ease";
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoomBy(delta: number) {
    setScale((current) => clampScale(current + delta));
  }

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === viewport);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setIsReady(false);
      setScale(1);
      setOffset({ x: 0, y: 0 });

      try {
        const mermaid = await loadMermaid();
        const { svg, bindFunctions } = await mermaid.render(`mermaid-${id}`, chart);

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
        applyTransform(1, { x: 0, y: 0 });
        setIsReady(true);
      } catch (renderError) {
        if (cancelled) return;

        const message =
          renderError instanceof Error
            ? renderError.message
            : "Unable to render Mermaid diagram.";

        setError(message);
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  useEffect(() => {
    if (!isReady) return;
    applyTransform(scale, offset);
  }, [isReady, offset, scale]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isReady || event.button !== 0) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setOffset({
      x: dragState.originX + (event.clientX - dragState.startX),
      y: dragState.originY + (event.clientY - dragState.startY),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!isReady) return;

    event.preventDefault();

    const direction = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const nextScale = clampScale(scale + direction);

    if (nextScale === scale) return;

    const viewport = viewportRef.current;

    if (!viewport) {
      setScale(nextScale);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const scaleRatio = nextScale / scale;

    setOffset({
      x: cursorX - (cursorX - offset.x) * scaleRatio,
      y: cursorY - (cursorY - offset.y) * scaleRatio,
    });
    setScale(nextScale);
  }

  async function toggleFullscreen() {
    const viewport = viewportRef.current;

    if (!viewport) return;

    if (document.fullscreenElement === viewport) {
      await document.exitFullscreen();
      return;
    }

    await viewport.requestFullscreen();
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

      <div style={{ padding: "1rem" }}>
        {!isReady && !error && (
          <div style={{ minHeight }}>
            <Skeleton width="100%" height={minHeight} rounded="xl" />
          </div>
        )}

        {isReady && !error && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.85rem",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                lineHeight: 1.4,
              }}
            >
              Drag to pan. Use the buttons or mouse wheel to zoom.
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "−", onClick: () => zoomBy(-ZOOM_STEP), ariaLabel: "Zoom out" },
                { label: "+", onClick: () => zoomBy(ZOOM_STEP), ariaLabel: "Zoom in" },
                { label: "Reset", onClick: resetView, ariaLabel: "Reset zoom and position" },
                {
                  label: isFullscreen ? "Exit Fullscreen" : "Fullscreen",
                  onClick: toggleFullscreen,
                  ariaLabel: isFullscreen ? "Exit fullscreen" : "Open fullscreen",
                },
              ].map((control) => (
                <button
                  key={control.ariaLabel}
                  type="button"
                  onClick={control.onClick}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.9)",
                    color: "var(--text-primary)",
                    borderRadius: "999px",
                    minWidth:
                      control.label === "Reset" || control.label.includes("Fullscreen")
                        ? "auto"
                        : "2.25rem",
                    padding:
                      control.label === "Reset" || control.label.includes("Fullscreen")
                        ? "0.45rem 0.9rem"
                        : "0.45rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  aria-label={control.ariaLabel}
                >
                  {control.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          style={{
            display: isReady ? "block" : "none",
            overflow: "hidden",
            minHeight: isFullscreen ? "100vh" : minHeight,
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top, rgba(99,102,241,0.08), transparent 38%), rgba(2,6,23,0.45)",
            cursor: dragStateRef.current ? "grabbing" : "grab",
            touchAction: "none",
            padding: isFullscreen ? "1rem" : 0,
            boxSizing: "border-box",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            ref={containerRef}
            style={{
              display: isReady ? "block" : "none",
              minHeight,
            }}
          />
        </div>

        {error && (
          <pre
            style={{
              minHeight,
              margin: 0,
              padding: "1rem",
              borderRadius: "12px",
              background: "#1e1e1e",
              color: "#fca5a5",
              overflowX: "auto",
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            {error}
          </pre>
        )}
      </div>
    </figure>
  );
}
