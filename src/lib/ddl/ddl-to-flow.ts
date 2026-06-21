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
  const preservedPositions = new Map<string, { x: number; y: number }>();
  for (const node of existingNodes) {
    preservedPositions.set(node.id, node.position);
  }

  const draftNodes: TableFlowNode[] = schema.tables.map((table) => {
    const id = tableNodeId(table.name);
    return {
      id,
      type: "tableNode",
      position: preservedPositions.get(id) ?? { x: 0, y: 0 },
      data: buildNodeData(table),
    };
  });

  const edges = buildEdges(schema.foreignKeys);
  const resolvedSettings = mergeDiagramSettings(settings);
  const nodes = await layoutTableNodes(draftNodes, edges, preservedPositions, resolvedSettings);

  return {
    nodes,
    edges: optimizeEdgeHandles(nodes, edges, resolvedSettings.columnView),
  };
}
