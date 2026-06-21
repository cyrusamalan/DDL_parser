import type { DiagramColumnView, TableFlowNode } from "../types/diagram";
import { getVisibleColumns } from "./visible-columns";

export const TABLE_WIDTH = 260;
export const TABLE_HEADER_HEIGHT = 41;
export const TABLE_ROW_HEIGHT = 44;
export const TABLE_FOOTER_ROW_HEIGHT = 28;

export function estimateTableNodeHeight(
  node: TableFlowNode,
  columnView: DiagramColumnView = "full",
): number {
  const { visible, hiddenCount } = getVisibleColumns(node.data.columns, columnView);
  const rowsHeight = visible.length * TABLE_ROW_HEIGHT;
  const footerHeight = hiddenCount > 0 ? TABLE_FOOTER_ROW_HEIGHT : 0;
  return TABLE_HEADER_HEIGHT + Math.max(rowsHeight + footerHeight, TABLE_ROW_HEIGHT);
}

export function columnHandleOffsetY(columnIndex: number): number {
  return TABLE_HEADER_HEIGHT + columnIndex * TABLE_ROW_HEIGHT + TABLE_ROW_HEIGHT / 2;
}
