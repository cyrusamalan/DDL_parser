import type { Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
  estimateTableNodeHeight,
} from "./node-metrics";
import type { TableFlowNode } from "../types/diagram";
import type { DiagramColumnView } from "../types/diagram";
import { visibleRowIndexForColumn } from "./visible-columns";

export { TABLE_WIDTH, TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT, columnHandleOffsetY, estimateTableNodeHeight } from "./node-metrics";

export type HandleSide = "left" | "right" | "top" | "bottom";

const POSITION_BY_SIDE: Record<HandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function columnCenterY(
  node: TableFlowNode,
  columnName: string,
  columnView: DiagramColumnView,
): number {
  const rowIndex = visibleRowIndexForColumn(node.data.columns, columnName, columnView);
  return node.position.y + TABLE_HEADER_HEIGHT + rowIndex * TABLE_ROW_HEIGHT + TABLE_ROW_HEIGHT / 2;
}

function estimateNodeHeight(node: TableFlowNode, columnView: DiagramColumnView): number {
  return estimateTableNodeHeight(node, columnView);
}

function columnCenterX(node: TableFlowNode): number {
  return node.position.x + TABLE_WIDTH / 2;
}

export function columnIndexForColumn(node: TableFlowNode, columnName: string): number {
  const index = node.data.columns.findIndex((column) => column.name === columnName);
  return index >= 0 ? index : 0;
}

export function pickHandleSides(
  sourceNode: TableFlowNode,
  targetNode: TableFlowNode,
  sourceColumnName?: string,
  targetColumnName?: string,
  columnView: DiagramColumnView = "full",
): { sourceSide: HandleSide; targetSide: HandleSide } {
  const sourceX = columnCenterX(sourceNode);
  const targetX = columnCenterX(targetNode);
  const sourceY =
    sourceColumnName !== undefined
      ? columnCenterY(sourceNode, sourceColumnName, columnView)
      : nodeCenterY(sourceNode, columnView);
  const targetY =
    targetColumnName !== undefined
      ? columnCenterY(targetNode, targetColumnName, columnView)
      : nodeCenterY(targetNode, columnView);

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

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

function nodeCenterY(node: TableFlowNode, columnView: DiagramColumnView): number {
  return node.position.y + estimateNodeHeight(node, columnView) / 2;
}

export function handleId(column: string, role: "source" | "target", side: HandleSide): string {
  return `${column}-${role}-${side}`;
}

export function optimizeEdgeHandles(
  nodes: TableFlowNode[],
  edges: Edge[],
  columnView: DiagramColumnView = "full",
): Edge[] {
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

    const { sourceSide, targetSide } = pickHandleSides(
      sourceNode,
      targetNode,
      sourceColumn,
      targetColumn,
      columnView,
    );

    return {
      ...edge,
      type: "smoothstep",
      pathOptions: { borderRadius: 8 },
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
