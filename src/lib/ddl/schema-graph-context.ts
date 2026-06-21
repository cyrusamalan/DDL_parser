import type { Edge } from "@xyflow/react";
import {
  buildDirectedAdjacency,
  buildReverseAdjacency,
  buildUndirectedAdjacency,
  computeInOutDegrees,
  type AdjacencyMap,
} from "@/lib/ddl/schema-graph";
import { EMPTY_SCHEMA_STATS, computeSchemaStatsFromCounts } from "@/lib/ddl/schema-stats";
import type { SchemaStats } from "@/lib/ddl/schema-stats";
import type { TableFlowNode } from "@/lib/types/diagram";

export type SchemaGraphContext = {
  nodes: TableFlowNode[];
  edges: Edge[];
  nodeIds: string[];
  nodeById: Map<string, TableFlowNode>;
  directedAdj: AdjacencyMap;
  reverseAdj: AdjacencyMap;
  undirectedAdj: AdjacencyMap;
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
  connectedTableIds: Set<string>;
  stats: SchemaStats;
};

export function buildSchemaGraphContext(
  nodes: TableFlowNode[],
  edges: Edge[],
): SchemaGraphContext {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      nodeIds: [],
      nodeById: new Map(),
      directedAdj: new Map(),
      reverseAdj: new Map(),
      undirectedAdj: new Map(),
      inDegree: new Map(),
      outDegree: new Map(),
      connectedTableIds: new Set(),
      stats: EMPTY_SCHEMA_STATS,
    };
  }

  const nodeIds = nodes.map((node) => node.id);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const directedAdj = buildDirectedAdjacency(nodeIds, edges);
  const reverseAdj = buildReverseAdjacency(nodeIds, edges);
  const undirectedAdj = buildUndirectedAdjacency(nodeIds, edges);
  const { inDegree, outDegree } = computeInOutDegrees(nodeIds, edges);

  const connectedTableIds = new Set<string>();
  for (const edge of edges) {
    connectedTableIds.add(edge.source);
    connectedTableIds.add(edge.target);
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

  const isolatedTableCount = nodes.filter((node) => !connectedTableIds.has(node.id)).length;
  const stats = computeSchemaStatsFromCounts({
    tableCount: nodes.length,
    columnCount,
    primaryKeyCount,
    foreignKeyCount,
    isolatedTableCount,
  });

  return {
    nodes,
    edges,
    nodeIds,
    nodeById,
    directedAdj,
    reverseAdj,
    undirectedAdj,
    inDegree,
    outDegree,
    connectedTableIds,
    stats,
  };
}
