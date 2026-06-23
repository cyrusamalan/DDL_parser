"use client";

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useDiagramFocus } from "@/components/workspace/diagram-focus-context";
import { useExportCapture } from "@/components/workspace/export-capture-context";
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STYLE,
  DIMMED_EDGE_STYLE,
  EXPORT_EDGE_COLOR,
  EXPORT_EDGE_STYLE,
  FOCUS_EDGE_COLOR,
  FOCUS_EDGE_STYLE,
  HOVER_EDGE_STYLE,
} from "@/lib/ddl/edge-styles";

function FkEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  interactionWidth,
}: EdgeProps) {
  const { getEdgeVisualState } = useDiagramFocus();
  const { isCapturing } = useExportCapture();
  const visualState = getEdgeVisualState({ id, source, target });

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  let edgeStyle = { ...DEFAULT_EDGE_STYLE };

  if (isCapturing) {
    edgeStyle = { ...edgeStyle, ...EXPORT_EDGE_STYLE };
  } else if (visualState === "focused") {
    edgeStyle = { ...edgeStyle, ...FOCUS_EDGE_STYLE };
  } else if (visualState === "dimmed") {
    edgeStyle = { ...edgeStyle, ...DIMMED_EDGE_STYLE };
  } else if (visualState === "hovered") {
    edgeStyle = { ...edgeStyle, ...HOVER_EDGE_STYLE };
  }

  const markerColor = isCapturing
    ? EXPORT_EDGE_COLOR
    : visualState === "focused"
      ? FOCUS_EDGE_COLOR
      : DEFAULT_EDGE_COLOR;

  const resolvedMarkerEnd =
    typeof markerEnd === "string"
      ? markerEnd
      : markerEnd
        ? { ...markerEnd, color: markerColor }
        : { type: "arrowclosed" as const, color: markerColor };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={resolvedMarkerEnd}
      style={edgeStyle}
      stroke={edgeStyle.stroke}
      strokeWidth={edgeStyle.strokeWidth}
      opacity={edgeStyle.opacity}
      interactionWidth={interactionWidth ?? 20}
    />
  );
}

export const FkEdge = memo(FkEdgeComponent);
