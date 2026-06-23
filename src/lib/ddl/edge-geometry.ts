import { Position } from "@xyflow/react";
import { TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT, TABLE_WIDTH } from "./node-metrics";
import type { DiagramColumnView, TableFlowNode } from "../types/diagram";
import { visibleRowIndexForColumn } from "./visible-columns";

export type HandleSide = "left" | "right" | "top" | "bottom";

export const NODE_HANDLE_SIDES: HandleSide[] = ["left", "right", "top", "bottom"];

export const POSITION_BY_SIDE: Record<HandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

/** Stable per-node handles used only for React Flow edge resolution (FkEdge draws column anchors). */
export function nodeHandleId(role: "source" | "target", side: HandleSide): string {
  return `node-${role}-${side}`;
}

export function columnAnchorPoint(
  node: Pick<TableFlowNode, "position" | "data">,
  columnName: string,
  side: HandleSide,
  columnView: DiagramColumnView,
): { x: number; y: number } {
  const rowIndex = visibleRowIndexForColumn(node.data.columns, columnName, columnView);
  const rowTop = node.position.y + TABLE_HEADER_HEIGHT + rowIndex * TABLE_ROW_HEIGHT;
  const rowCenterY = rowTop + TABLE_ROW_HEIGHT / 2;
  const left = node.position.x;
  const right = node.position.x + TABLE_WIDTH;
  const centerX = node.position.x + TABLE_WIDTH / 2;

  switch (side) {
    case "left":
      return { x: left, y: rowCenterY };
    case "right":
      return { x: right, y: rowCenterY };
    case "top":
      return { x: centerX, y: rowTop };
    case "bottom":
      return { x: centerX, y: rowTop + TABLE_ROW_HEIGHT };
  }
}
