import type { Edge } from "@xyflow/react";
import type { TableFlowNode } from "@/lib/types/diagram";

export type SchemaStats = {
  tableCount: number;
  columnCount: number;
  primaryKeyCount: number;
  foreignKeyCount: number;
  isolatedTableCount: number;
  avgColumnsPerTable: number;
};

export type TableStats = {
  tableName: string;
  columnCount: number;
  primaryKeyCount: number;
  foreignKeyCount: number;
  incomingFkCount: number;
  outgoingFkCount: number;
};

export function computeSchemaStats(nodes: TableFlowNode[], edges: Edge[]): SchemaStats {
  if (nodes.length === 0) {
    return {
      tableCount: 0,
      columnCount: 0,
      primaryKeyCount: 0,
      foreignKeyCount: 0,
      isolatedTableCount: 0,
      avgColumnsPerTable: 0,
    };
  }

  let columnCount = 0;
  let primaryKeyCount = 0;
  let foreignKeyCount = 0;

  for (const node of nodes) {
    columnCount += node.data.columns.length;
    for (const column of node.data.columns) {
      if (column.isPrimaryKey) primaryKeyCount++;
      if (column.isForeignKey) foreignKeyCount++;
    }
  }

  const connectedTableIds = new Set<string>();
  for (const edge of edges) {
    connectedTableIds.add(edge.source);
    connectedTableIds.add(edge.target);
  }

  const isolatedTableCount = nodes.filter((node) => !connectedTableIds.has(node.id)).length;

  return {
    tableCount: nodes.length,
    columnCount,
    primaryKeyCount,
    foreignKeyCount,
    isolatedTableCount,
    avgColumnsPerTable: Math.round((columnCount / nodes.length) * 10) / 10,
  };
}

export function computeTableStats(
  node: TableFlowNode,
  edges: Edge[],
): TableStats {
  let primaryKeyCount = 0;
  let foreignKeyCount = 0;

  for (const column of node.data.columns) {
    if (column.isPrimaryKey) primaryKeyCount++;
    if (column.isForeignKey) foreignKeyCount++;
  }

  let incomingFkCount = 0;
  let outgoingFkCount = 0;

  for (const edge of edges) {
    if (edge.target === node.id) incomingFkCount++;
    if (edge.source === node.id) outgoingFkCount++;
  }

  return {
    tableName: node.data.tableName,
    columnCount: node.data.columns.length,
    primaryKeyCount,
    foreignKeyCount,
    incomingFkCount,
    outgoingFkCount,
  };
}
