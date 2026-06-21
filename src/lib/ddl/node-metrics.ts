import type { TableFlowNode } from "../types/diagram";

export const TABLE_WIDTH = 260;
export const TABLE_HEADER_HEIGHT = 41;
export const TABLE_ROW_HEIGHT = 32;

export function estimateTableNodeHeight(node: TableFlowNode): number {
  const rowCount = Math.max(node.data.columns.length, 1);
  return TABLE_HEADER_HEIGHT + rowCount * TABLE_ROW_HEIGHT;
}
