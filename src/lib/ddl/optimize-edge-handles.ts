import type { Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import {
  TABLE_WIDTH,
  estimateTableNodeHeight,
} from "./node-metrics";
import type { TableFlowNode } from "../types/diagram";

export { TABLE_WIDTH, TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT, estimateTableNodeHeight } from "./node-metrics";

export type HandleSide = "left" | "right" | "top" | "bottom";

const POSITION_BY_SIDE: Record<HandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function estimateNodeCenter(node: TableFlowNode): { x: number; y: number } {
  const height = estimateTableNodeHeight(node);
  return {
    x: node.position.x + TABLE_WIDTH / 2,
    y: node.position.y + height / 2,
  };
}

export function pickHandleSides(
  sourceNode: TableFlowNode,
  targetNode: TableFlowNode,
): { sourceSide: HandleSide; targetSide: HandleSide } {
  const sourceCenter = estimateNodeCenter(sourceNode);
  const targetCenter = estimateNodeCenter(targetNode);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourceSide: "right", targetSide: "left" };
    }
    return { sourceSide: "left", targetSide: "right" };
  }

  if (dy >= 0) {
    return { sourceSide: "bottom", targetSide: "top" };
  }
  return { sourceSide: "top", targetSide: "bottom" };
}

export function handleId(column: string, role: "source" | "target", side: HandleSide): string {
  return `${column}-${role}-${side}`;
}

export function optimizeEdgeHandles(nodes: TableFlowNode[], edges: Edge[]): Edge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return edge;

    const sourceHandleId = edge.sourceHandle ?? "";
    const targetHandleId = edge.targetHandle ?? "";
    const sourceColumn = sourceHandleId.replace(/-source(?:-(?:left|right|top|bottom))?$/, "");
    const targetColumn = targetHandleId.replace(/-target(?:-(?:left|right|top|bottom))?$/, "");

    if (!sourceColumn || !targetColumn) return edge;

    const { sourceSide, targetSide } = pickHandleSides(sourceNode, targetNode);

    return {
      ...edge,
      type: "smoothstep",
      pathOptions: { borderRadius: 12 },
      sourceHandle: handleId(sourceColumn, "source", sourceSide),
      targetHandle: handleId(targetColumn, "target", targetSide),
      sourcePosition: POSITION_BY_SIDE[sourceSide],
      targetPosition: POSITION_BY_SIDE[targetSide],
    };
  });
}

export function sideFromHandleId(handleId: string): HandleSide | null {
  const match = handleId.match(/-(?:source|target)-(left|right|top|bottom)$/);
  return match ? (match[1] as HandleSide) : null;
}

export function positionFromHandleId(handleId: string): Position {
  const side = sideFromHandleId(handleId);
  return side ? POSITION_BY_SIDE[side] : Position.Right;
}
