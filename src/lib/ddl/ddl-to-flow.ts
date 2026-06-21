import type { Edge } from "@xyflow/react";
import type { ParsedForeignKey, ParsedSchema } from "@/lib/ddl/ast-walker";
import { layoutTableNodes } from "@/lib/ddl/layout-graph";
import { handleId, optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import type { DiagramSettings, TableFlowNode, TableNodeData } from "@/lib/types/diagram";

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
  return foreignKeys.map((fk) => ({
    id: fk.id,
    source: tableNodeId(fk.fromTable),
    target: tableNodeId(fk.toTable),
    sourceHandle: handleId(fk.fromColumn, "source", "right"),
    targetHandle: handleId(fk.toColumn, "target", "left"),
    type: "smoothstep",
    animated: false,
    style: { stroke: "#71717a", strokeWidth: 1.5 },
    pathOptions: { borderRadius: 12 },
    markerEnd: { type: "arrowclosed" as const, color: "#71717a" },
  }));
}

export function ddlSchemaToFlow(
  schema: ParsedSchema,
  existingNodes: TableFlowNode[] = [],
  settings?: DiagramSettings,
): FlowGraph {
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
  const nodes = layoutTableNodes(draftNodes, edges, preservedPositions, settings);

  return {
    nodes,
    edges: optimizeEdgeHandles(nodes, edges),
  };
}
