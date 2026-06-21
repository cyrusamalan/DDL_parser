"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { useReactFlow, useStore } from "@xyflow/react";

export function ErdZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { minZoomReached, maxZoomReached } = useStore((store) => ({
    minZoomReached: store.transform[2] <= store.minZoom,
    maxZoomReached: store.transform[2] >= store.maxZoom,
  }));

  return (
    <div className="erd-controls flex flex-col">
      <button
        type="button"
        className="erd-controls-btn"
        onClick={() => zoomIn()}
        disabled={maxZoomReached}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus className="erd-controls-icon" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        className="erd-controls-btn"
        onClick={() => zoomOut()}
        disabled={minZoomReached}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus className="erd-controls-icon" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        className="erd-controls-btn"
        onClick={() => fitView({ padding: 0.12, duration: 300 })}
        aria-label="Fit view"
        title="Fit view"
      >
        <Maximize2 className="erd-controls-icon" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
