import type { Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { mergeDiagramSettings, spacingMultiplier } from "@/lib/diagram-settings";
import { buildNodePartitions } from "@/lib/ddl/table-grouping";
import { TABLE_WIDTH, estimateTableNodeHeight } from "./node-metrics";
import type { DiagramGrouping, DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

const elk = new ELK();

const BASE_NODE_SPACING = 56;
const BASE_LAYER_SPACING = 120;

function elkDirection(settings: DiagramSettings): string {
  return settings.layoutDirection === "landscape" ? "RIGHT" : "DOWN";
}

function elkSpacing(settings: DiagramSettings): { nodeNode: number; layer: number } {
  const scale = spacingMultiplier(settings.spacing);
  return {
    nodeNode: Math.round(BASE_NODE_SPACING * scale),
    layer: Math.round(BASE_LAYER_SPACING * scale),
  };
}

function buildElkGraph(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings: DiagramSettings,
  partitions: Map<string, number> | null,
) {
  const spacing = elkSpacing(settings);

  const layoutOptions: Record<string, string> = {
    "elk.algorithm": "layered",
    "elk.direction": elkDirection(settings),
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.nodeNode": String(spacing.nodeNode),
    "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing.layer),
    "elk.layered.spacing.edgeNodeBetweenLayers": String(spacing.layer),
    "elk.layered.spacing.componentComponent": String(spacing.nodeNode * 2),
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  };

  if (partitions) {
    layoutOptions["elk.partitioning.activate"] = "true";
  }

  return {
    id: "root",
    layoutOptions,
    children: nodes.map((node) => {
      const partition = partitions?.get(node.id);
      const child: {
        id: string;
        width: number;
        height: number;
        layoutOptions?: Record<string, string>;
      } = {
        id: node.id,
        width: TABLE_WIDTH,
        height: estimateTableNodeHeight(node, settings.columnView),
      };

      if (partition !== undefined) {
        child.layoutOptions = {
          "elk.partitioning.partition": String(partition),
        };
      }

      return child;
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
}

export async function elkLayoutTableNodes(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings?: DiagramSettings,
  grouping?: DiagramGrouping,
): Promise<Map<string, { x: number; y: number }>> {
  if (nodes.length === 0) return new Map();

  const resolvedSettings = mergeDiagramSettings(settings);
  const partitions = buildNodePartitions(grouping, nodes.map((node) => node.id));
  const graph = buildElkGraph(nodes, edges, resolvedSettings, partitions);
  const layouted = await elk.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    if (child.id && typeof child.x === "number" && typeof child.y === "number") {
      positions.set(child.id, { x: child.x, y: child.y });
    }
  }

  return positions;
}
