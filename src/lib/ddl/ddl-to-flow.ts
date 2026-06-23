import type { Edge } from "@xyflow/react";
import type { ParsedForeignKey, ParsedSchema } from "@/lib/ddl/ast-walker";
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STYLE,
} from "@/lib/ddl/edge-styles";
import { mergeDiagramSettings } from "@/lib/diagram-settings";
import { layoutTableNodes } from "@/lib/ddl/layout-graph";
import { handleId, optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import type { DiagramSettings, FkEdgeData, TableFlowNode, TableNodeData } from "@/lib/types/diagram";

export type FlowGraph = {
  nodes: TableFlowNode[];
  edges: Edge[];
};

function tableNodeId(tableName: string): string {
  return tableName;
}

function buildNodeData(table: ParsedSchema["tables"][number]): TableNodeData {
  return {
    tableName: table.name,
    columns: table.columns.map((column) => ({ ...column })),
  };
}

/** Ensure React Flow handles exist on FK source/target columns (e.g. Trino has no declared PKs). */
function stampForeignKeyColumnFlags(schema: ParsedSchema): ParsedSchema {
  const tables = schema.tables.map((table) => ({
    ...table,
    columns: table.columns.map((column) => ({ ...column })),
  }));
  const tableByName = new Map(tables.map((table) => [table.name, table]));

  for (const fk of schema.foreignKeys) {
    const fromCol = tableByName
      .get(fk.fromTable)
      ?.columns.find((column) => column.name === fk.fromColumn);
    const toCol = tableByName
      .get(fk.toTable)
      ?.columns.find((column) => column.name === fk.toColumn);
    if (fromCol) fromCol.isForeignKey = true;
    if (toCol && !toCol.isForeignKey) toCol.isPrimaryKey = true;
  }

  return { tables, foreignKeys: schema.foreignKeys };
}

function fkColumnsFromEdge(edge: Edge): { fromColumn?: string; toColumn?: string } {
  const data = edge.data as FkEdgeData | undefined;
  if (data?.fromColumn && data?.toColumn) {
    return { fromColumn: data.fromColumn, toColumn: data.toColumn };
  }

  const sourceHandle = edge.sourceHandle ?? "";
  const targetHandle = edge.targetHandle ?? "";
  return {
    fromColumn: sourceHandle.replace(/-source(?:-(?:left|right|top|bottom))?$/, "") || undefined,
    toColumn: targetHandle.replace(/-target(?:-(?:left|right|top|bottom))?$/, "") || undefined,
  };
}

/** Patch saved node column flags so FK handles render (needed when reloading Trino diagrams). */
export function stampNodeKeyColumnsFromEdges(
  nodes: TableFlowNode[],
  edges: Edge[],
): TableFlowNode[] {
  const nextNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      columns: node.data.columns.map((column) => ({ ...column })),
    },
  }));
  const nodeById = new Map(nextNodes.map((node) => [node.id, node]));

  for (const edge of edges) {
    const { fromColumn, toColumn } = fkColumnsFromEdge(edge);
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (sourceNode && fromColumn) {
      const column = sourceNode.data.columns.find((col) => col.name === fromColumn);
      if (column) column.isForeignKey = true;
    }
    if (targetNode && toColumn) {
      const column = targetNode.data.columns.find((col) => col.name === toColumn);
      if (column && !column.isForeignKey) column.isPrimaryKey = true;
    }
  }

  return nextNodes;
}

function buildEdges(foreignKeys: ParsedForeignKey[]): Edge[] {
  return foreignKeys.map((fk) => {
    const data: FkEdgeData = {
      fromTable: fk.fromTable,
      fromColumn: fk.fromColumn,
      toTable: fk.toTable,
      toColumn: fk.toColumn,
      label: `${fk.fromTable}.${fk.fromColumn} → ${fk.toTable}.${fk.toColumn}`,
    };

    return {
      id: fk.id,
      source: tableNodeId(fk.fromTable),
      target: tableNodeId(fk.toTable),
      sourceHandle: handleId(fk.fromColumn, "source", "right"),
      targetHandle: handleId(fk.toColumn, "target", "left"),
      type: "fkEdge",
      animated: false,
      data,
      style: { ...DEFAULT_EDGE_STYLE },
      pathOptions: { borderRadius: 8 },
      markerEnd: { type: "arrowclosed" as const, color: DEFAULT_EDGE_COLOR },
    };
  });
}

export async function ddlSchemaToFlow(
  schema: ParsedSchema,
  existingNodes: TableFlowNode[] = [],
  settings?: DiagramSettings,
): Promise<FlowGraph> {
  const stamped = stampForeignKeyColumnFlags(schema);

  const preservedPositions = new Map<string, { x: number; y: number }>();
  for (const node of existingNodes) {
    preservedPositions.set(node.id, node.position);
  }

  const draftNodes: TableFlowNode[] = stamped.tables.map((table) => {
    const id = tableNodeId(table.name);
    return {
      id,
      type: "tableNode",
      position: preservedPositions.get(id) ?? { x: 0, y: 0 },
      data: buildNodeData(table),
    };
  });

  const edges = buildEdges(stamped.foreignKeys);
  const resolvedSettings = mergeDiagramSettings(settings);
  const nodes = await layoutTableNodes(draftNodes, edges, preservedPositions, resolvedSettings);

  return {
    nodes,
    edges: optimizeEdgeHandles(nodes, edges, resolvedSettings.columnView),
  };
}
